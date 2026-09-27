// node tools/formula-chooser-check.js [dialog-screenshot.png]
// Behaviour check for "Type a formula" (T), in the portable build and in the lazily loading folder build.
//
// The dialog lists exactly the places a formula can be typed that this build has (a tab whose typed mode or
// field is missing is left out, which a schema edit in the page checks as a negative control), opens with
// focus on the first choice, moves with the arrows, keeps Tab inside, and closes on Escape with focus back
// where it was. Choosing Flow Field switches the tab, selects its custom field through the recipe path (the
// link carries it, the timeline records it, undo reverts it) and focuses the u field inside an open group.
// In the folder build the families load only when the chooser opens; choosing Schrödinger opens its custom
// potential with the field focused and the stage badge lowered to unvalidated.
// Interface regressions only, not scientific evidence.
'use strict';
const { glArgs } = require('./lib/gl-args');
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const shot = process.argv[2] ? path.resolve(process.argv[2]) : null;
// [tab, seg key, option, text field]; the same six places the shell's FORMULA_PLACES names.
const PLACES = [['attractors', 'system', 'custom', 'odeX'], ['flow', 'fieldMode', 'custom', 'fieldU'], ['turing', 'tmodel', 'custom', 'reactF'],
  ['schrodinger', 'kind', 'custom', 'potV'], ['holomorphic', 'set', 'custom', 'zmap'], ['phase', null, null, 'fz']];
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const NOISE = [/willReadFrequently/, /ServiceWorker/, /GL Driver Message/];

// The places this build can offer, read from the registered schemas (all loaded in the page being asked).
const offered = places => places.filter(([tab, key, value, field]) => {
  const m = Studio.modules[tab];
  if (!m || typeof m.create !== 'function' || !m.schema.some(f => f.key === field && f.type === 'text')) return false;
  if (!key) return true;
  const seg = m.schema.find(f => f.key === key && f.type === 'seg');
  return !!(seg && seg.options.some(o => o[0] === value));
}).map(p => p[0]);
const listed = () => [...document.querySelectorAll('#formula-list .formula-pick')].map(b => b.dataset.tab);
const open = () => !document.getElementById('modal-formula').hidden;

async function openChooser(page, how) {
  if (how === 'key') await page.keyboard.press('t'); else await page.click('#btn-formula');
  await page.waitForFunction(() => !document.getElementById('modal-formula').hidden && document.activeElement && document.activeElement.classList.contains('formula-pick'), null, { timeout: 30000 });
}
async function focusPick(page, tab) {
  for (let i = 0; i < PLACES.length + 1; i++) {
    if (await page.evaluate(t => document.activeElement.dataset.tab === t, tab)) return;
    await page.keyboard.press('ArrowDown');
  }
  throw new Error('No choice for ' + tab);
}

(async () => {
  const server = http.createServer((req, res) => {
    let file;
    try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
    catch (_) { res.writeHead(400).end(); return; }
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, body) => {
      if (error) { res.writeHead(404).end('Not found'); return; }
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ args: glArgs() });
  let fail = 0;
  const t = (name, ok, got) => { if (!ok) fail++; console.log((ok ? '  ok   ' : '  FAIL ') + name + (got === undefined ? '' : '   ' + JSON.stringify(got))); };
  try {
    /* ---- portable build ---- */
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !NOISE.some(re => re.test(m.text()))) errors.push(m.text()); });
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#reuleaux/formula-chooser', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => Studio.ready);
    await page.waitForFunction(() => Studio.getRecipe()?.id === 'reuleaux');
    const expected = await page.evaluate(offered, PLACES);
    t('this build offers the four known places', ['attractors', 'flow', 'turing', 'schrodinger'].every(id => expected.includes(id)), expected);

    await page.locator('#btn-formula').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('modal-formula').hidden && document.activeElement?.classList.contains('formula-pick'));
    const dialog = await page.evaluate(() => {
      const card = document.querySelector('#modal-formula .card');
      return { role: card.getAttribute('role'), modal: card.getAttribute('aria-modal'), title: document.getElementById(card.getAttribute('aria-labelledby')).textContent,
        first: document.activeElement.dataset.tab, names: [...document.querySelectorAll('#formula-list .formula-name')].map(n => n.textContent),
        examples: [...document.querySelectorAll('#formula-list .formula-example')].map(n => n.textContent.length) };
    });
    t('the button opens a real modal dialog', dialog.role === 'dialog' && dialog.modal === 'true' && dialog.title === 'Type a formula', dialog);
    t('it lists exactly the places this build has, in order', JSON.stringify(await page.evaluate(listed)) === JSON.stringify(expected), await page.evaluate(listed));
    t('each place has a name from the schema and an example', dialog.names.includes('Flow Field · Custom field') && dialog.names.includes('Schrödinger · Custom potential') && dialog.examples.every(n => n > 3), dialog.names);
    t('focus lands on the first choice', dialog.first === expected[0], dialog.first);
    if (shot) { await page.screenshot({ path: shot }); console.log('  dialog screenshot: ' + shot); }
    await page.keyboard.press('ArrowDown');
    t('ArrowDown moves to the next choice', await page.evaluate(() => document.activeElement.dataset.tab) === expected[1]);
    await page.keyboard.press('End');
    t('End jumps to the last choice', await page.evaluate(() => document.activeElement.dataset.tab) === expected[expected.length - 1]);
    for (let i = 0; i < expected.length + 3; i++) await page.keyboard.press('Tab');
    t('Tab stays inside the dialog', await page.evaluate(() => document.getElementById('modal-formula').contains(document.activeElement)));
    const recipeBefore = await page.evaluate(() => JSON.stringify(Studio.getRecipe()));
    await page.keyboard.press('s');
    t('shortcuts do not reach the plate behind the dialog', await page.evaluate(() => JSON.stringify(Studio.getRecipe())) === recipeBefore && await page.evaluate(open));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    t('Escape closes it and returns focus to the button', !await page.evaluate(open) && await page.evaluate(() => document.activeElement.id) === 'btn-formula');

    // Negative control: a tab whose typed mode is missing from the schema is not offered.
    await page.evaluate(() => { const seg = Studio.modules.flow.schema.find(f => f.key === 'fieldMode'); window.__savedOptions = seg.options; seg.options = seg.options.filter(o => o[0] !== 'custom'); });
    await page.locator('#stage').focus();
    await openChooser(page, 'key');
    t('a tab without its typed mode is left out', !(await page.evaluate(listed)).includes('flow'), await page.evaluate(listed));
    await page.keyboard.press('Escape');
    await page.evaluate(() => { Studio.modules.flow.schema.find(f => f.key === 'fieldMode').options = window.__savedOptions; });
    await page.locator('#find').focus();
    await page.keyboard.press('t');
    t('T typed into a text box does not open the chooser', !await page.evaluate(open));
    await page.keyboard.press('Escape');

    // Choose Flow Field from the keyboard.
    await page.locator('#stage').focus();
    await openChooser(page, 'key');
    await focusPick(page, 'flow');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Studio.getRecipe()?.id === 'flow' && Studio.getRecipe().fieldMode === 'custom' && document.activeElement?.id === 'p-flow-fieldU', null, { timeout: 30000 });
    const chosen = await page.evaluate(() => {
      const input = document.activeElement, group = input.closest('details'), r = input.getBoundingClientRect();
      return { tab: document.querySelector('.tab[aria-selected="true"]').dataset.id, mode: Studio.getRecipe().fieldMode, focused: input.id,
        groupOpen: !!(group && group.open), visible: r.height > 0 && r.top >= 0 && r.bottom <= innerHeight, caret: input.selectionStart === input.value.length,
        status: document.getElementById('status').textContent };
    });
    t('Flow Field: the tab, its custom field and the u field focused', chosen.tab === 'flow' && chosen.mode === 'custom' && chosen.focused === 'p-flow-fieldU', chosen);
    t('the field is revealed in an open group with the caret at the end', chosen.groupOpen && chosen.visible && chosen.caret, chosen);
    await page.waitForFunction(() => { const p = location.hash.split('/')[2]; return location.hash.startsWith('#flow/') && p && JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))).fieldMode === 'custom'; }, null, { timeout: 5000 }).catch(() => {});
    t('the share link carries the mode', await page.evaluate(() => { const p = location.hash.split('/')[2]; return !!p && JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))).fieldMode === 'custom'; }), await page.evaluate(() => location.hash.slice(0, 40)));
    await page.waitForFunction(() => { try { const h = JSON.parse(localStorage.getItem('genchase.v1.history') || '[]')[0]; return h && h.id === 'flow' && JSON.parse(atob(h.hash.split('/')[2].replace(/-/g, '+').replace(/_/g, '/'))).fieldMode === 'custom'; } catch (_) { return false; } }, null, { timeout: 5000 }).catch(() => {});
    t('the timeline records the plate', await page.evaluate(() => { try { const h = JSON.parse(localStorage.getItem('genchase.v1.history') || '[]')[0]; return h.id === 'flow' && JSON.parse(atob(h.hash.split('/')[2].replace(/-/g, '+').replace(/_/g, '/'))).fieldMode === 'custom'; } catch (_) { return false; } }));
    await page.evaluate(() => document.querySelector('#btn-undo').click());   // collapsed into More at this width
    await page.waitForFunction(() => Studio.getRecipe()?.fieldMode !== 'custom', null, { timeout: 10000 }).catch(() => {});
    t('undo returns Flow Field to the mode it had', await page.evaluate(() => Studio.getRecipe().id === 'flow' && Studio.getRecipe().fieldMode !== 'custom'), await page.evaluate(() => Studio.getRecipe().fieldMode));
    t('no page errors in the portable build', errors.length === 0, errors.slice(0, 3));
    await page.close();

    /* ---- folder build: families load when the chooser opens ---- */
    const folder = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const folderErrors = [];
    folder.on('pageerror', e => folderErrors.push(e.message));
    await folder.goto(origin + '/index.html#reuleaux/formula-folder/' + b64({ v: 6 }));
    await folder.evaluate(() => Studio.ready);
    await folder.waitForFunction(() => Studio.getRecipe()?.id === 'reuleaux');
    const unloaded = await folder.evaluate(places => places.filter(p => Studio.modules[p[0]]).every(p => typeof Studio.modules[p[0]].create !== 'function'), PLACES);
    t('folder build: the formula tabs start unloaded', unloaded);
    await folder.locator('#stage').focus();
    await openChooser(folder, 'key');
    const folderListed = await folder.evaluate(listed);
    t('folder build: the chooser loads them and lists the same places', JSON.stringify(folderListed) === JSON.stringify(expected), folderListed);
    await focusPick(folder, 'schrodinger');
    await folder.keyboard.press('Enter');
    await folder.waitForFunction(() => Studio.getRecipe()?.id === 'schrodinger' && Studio.getRecipe().kind === 'custom' && document.activeElement?.id === 'p-schrodinger-potV'
      && /custom potential · user-defined, not validated/.test(document.getElementById('status').textContent), null, { timeout: 60000 });
    const sch = await folder.evaluate(() => ({ badge: document.getElementById('btn-science-report').textContent, prov: Studio.getProvenance().technique,
      status: document.getElementById('status').textContent.replace(/\s+/g, ' ') }));
    t('folder build: Schrödinger opens its custom potential with V(x, y) focused', true, sch.status.slice(0, 160));
    t('the stage badge and the provenance say unvalidated in that mode', /Unvalidated/.test(sch.badge) && sch.prov.validation === 'unvalidated' && sch.prov.validationNote === 'a typed potential', { badge: sch.badge, note: sch.prov.validationNote });
    t('no page errors in the folder build', folderErrors.length === 0, folderErrors.slice(0, 3));
    await folder.close();

    /* ---- phone width: the stage is pinned over the page, and the chosen field must not sit under it ---- */
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await phone.goto('file://' + path.join(root, 'dist/studio.html') + '#reuleaux/formula-phone', { waitUntil: 'domcontentloaded' });
    await phone.evaluate(() => Studio.ready);
    await phone.waitForFunction(() => Studio.getRecipe()?.id === 'reuleaux');
    await phone.click('#btn-formula');
    await phone.waitForFunction(() => !document.getElementById('modal-formula').hidden);
    const card = await phone.evaluate(() => { const r = document.querySelector('#modal-formula .card').getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: innerWidth, h: innerHeight }; });
    t('phone: the dialog fits the screen', card.left >= 0 && card.right <= card.w && card.top >= 0 && card.bottom <= card.h, card);
    await phone.click('#formula-list .formula-pick[data-tab="turing"]');
    await phone.waitForFunction(() => document.activeElement?.id === 'p-turing-reactF', null, { timeout: 60000 });
    await phone.waitForTimeout(1500);
    const seen = await phone.evaluate(() => {
      const row = document.activeElement.closest('.row').getBoundingClientRect(), stage = document.getElementById('stage').getBoundingClientRect();
      const dock = document.getElementById('print-cluster').getBoundingClientRect();
      return { rowTop: Math.round(row.top), rowBottom: Math.round(row.bottom), stageBottom: Math.round(stage.bottom), dockTop: Math.round(dock.top) };
    });
    t('phone: the focused field is below the pinned stage and above the print dock', seen.rowTop >= seen.stageBottom && seen.rowBottom <= seen.dockTop, seen);
    await phone.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(fail ? 'FORMULA CHOOSER CHECK FAILED: ' + fail : 'FORMULA CHOOSER CHECK OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
