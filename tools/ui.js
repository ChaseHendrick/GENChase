// node tools/ui.js
// Behaviour tests for the shell's chrome, as opposed to the plates.
//
// check.js proves a technique computes something; nothing proved that the interface around it works.
// This does. It drives real clicks and real keys against the real page and asserts what a person
// would see. Add cases here rather than writing a new one-off script: a UI regression is exactly the
// kind of thing that survives to a release because it looked fine in whichever state it was left in.
//
// Two traps this file already fell into, worth knowing before adding a case:
//   - A CSS transition means getComputedStyle right after a click returns the value mid-animation.
//     Wait for it to settle or you will assert against a frame nobody sees.
//   - Do not put a word in the seed that you also grep the hash for. The seed IS in the hash.
const { glArgs } = require('./lib/gl-args');
const path = require('path');
const { chromium } = require('playwright');

(async()=>{
  const studio=process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'dist', 'studio.html');
  const b=await chromium.launch({args:glArgs()});
  const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
  await p.goto('file://'+studio+'#snowflake/gravner-2008',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const mode=()=>p.evaluate(()=>{const w=document.querySelector('#witness');
    return {cls:w.className, labelVisible:getComputedStyle(document.querySelector('#live-label')).display!=='none',
            badgeOpacity:getComputedStyle(document.querySelector('#live-badge')).opacity};});
  // A CSS transition starts at the first style recalculation after the class changes. On a busy page (a running
  // plate, a slow runner) no frame may come in a fixed wait, so the read itself would start the transition and
  // see its first value. getAnimations() recalculates style, which starts any transition now, and the helper
  // waits for the badge's own transitions to finish (bounded, so a missing one cannot hang the test).
  const settle=()=>p.evaluate(()=>Promise.race([
    Promise.all(document.querySelector('#live-badge').getAnimations().filter(a=>a instanceof CSSTransition).map(a=>a.finished.catch(()=>{}))),
    new Promise(r=>setTimeout(r,3000))]));
  const click=async()=>{await p.evaluate(()=>document.querySelector('#live-badge').click());await settle();};
  const key=k=>p.keyboard.press(k);
  let fail=0; const t=(name,cond,got)=>{if(!cond)fail++;console.log((cond?'  ok   ':'  FAIL ')+name+'   '+JSON.stringify(got));};

  let m=await mode(); t('starts full', m.cls.indexOf('w-quiet')<0&&m.cls.indexOf('w-off')<0&&m.labelVisible, m);
  await click(); m=await mode(); t('click 1 -> quiet, words gone', m.cls.includes('w-quiet')&&!m.labelVisible, m);
  await click(); m=await mode(); t('click 2 -> off, badge invisible', m.cls.includes('w-off')&&m.badgeOpacity==='0', m);
  await click(); m=await mode(); t('click 3 -> back to full', !m.cls.includes('w-quiet')&&!m.cls.includes('w-off')&&m.labelVisible, m);
  await key('w'); await settle(); m=await mode(); t('W key cycles too', m.cls.includes('w-quiet'), m);

  // persistence across a reload
  await p.goto('file://'+studio+'#snowflake/gravner-2008',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  m=await mode(); t('preference survives a reload', m.cls.includes('w-quiet')&&!m.labelVisible, m);

  // the preference must NOT leak into the recipe hash
  const hash=await p.evaluate(()=>location.hash);
  t('not written into the hash', !/witness|w-quiet|w-off/.test(hash), {hash:hash.slice(0,60)});

  // typing in a text field must not trigger the shortcut
  await p.evaluate(()=>{const s=document.querySelector('#seed'); s.focus();});
  await p.keyboard.type('w');
  m=await mode(); t('W in the seed box does not toggle', m.cls.includes('w-quiet'), m);

  // DESIGN-PLAN standing items: seedbox is a real field, the hash follows the plate, shortcuts
  // do not fire through a dialog, and Export is on screen at the widths a person actually uses.
  const box = await p.evaluate(() => {
    const el = document.querySelector('.seedbox');
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  t('seedbox wider than 150 at 1400', box.w > 150, box);

  const before = await p.evaluate(() => ({ hash: location.hash, seed: document.querySelector('#seed').value, id: document.querySelector('.tab[aria-selected="true"]') && document.querySelector('.tab[aria-selected="true"]').dataset.id }));
  await p.evaluate(() => document.querySelector('#btn-generate').click());
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => ({ hash: location.hash, seed: document.querySelector('#seed').value, id: document.querySelector('.tab[aria-selected="true"]') && document.querySelector('.tab[aria-selected="true"]').dataset.id }));
  t('hash follows a new seed', after.hash.indexOf(encodeURIComponent(after.seed)) >= 0 || after.hash.indexOf(after.seed) >= 0, { hash: after.hash.slice(0, 80), seed: after.seed });
  t('hash still names this technique', after.hash.indexOf(after.id) >= 0, after);

  await p.evaluate(() => document.querySelector('#btn-about').click());
  await p.waitForTimeout(200);
  const seedBefore = await p.evaluate(() => document.querySelector('#seed').value);
  await p.keyboard.press('s');
  await p.waitForTimeout(400);
  const seedAfterS = await p.evaluate(() => document.querySelector('#seed').value);
  const aboutOpen = await p.evaluate(() => { const m = document.querySelector('#modal-about'); return m && !m.hidden; });
  t('S does not surprise while About is open', seedAfterS === seedBefore && aboutOpen, { seedBefore, seedAfterS, aboutOpen });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);

  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  const mobile = await p.evaluate(() => {
    const box = document.querySelector('.seedbox').getBoundingClientRect();
    const exp = document.querySelector('#btn-export').getBoundingClientRect();
    const gen = document.querySelector('#btn-generate').getBoundingClientRect();
    const more = document.querySelector('#btn-more');
    const moreR = more && more.getBoundingClientRect();
    return {
      seedW: box.width,
      exportRight: exp.right, exportTop: exp.top,
      genTop: gen.top, innerW: innerWidth, innerH: innerHeight,
      moreShown: more && getComputedStyle(more).display !== 'none',
      moreRight: moreR ? moreR.right : 0, moreTop: moreR ? moreR.top : 0,
      moreW: moreR ? moreR.width : 0,
    };
  });
  t('seedbox usable at 390', mobile.seedW > 80, mobile);
  t('Export is on screen at 390', mobile.exportRight <= mobile.innerW + 1 && mobile.exportTop >= 0 && mobile.exportTop < mobile.innerH, mobile);
  t('Generate is on screen at 390', mobile.genTop >= 0 && mobile.genTop < mobile.innerH, mobile);
  t('More is available at 390', mobile.moreShown, mobile);
  t('More is on screen at 390', mobile.moreRight <= mobile.innerW + 1 && mobile.moreTop >= 0 && mobile.moreW > 24, mobile);

  // leftover DESIGN-PLAN: gallery overlay, focus Exit, Find, export names the plate.
  await p.setViewportSize({ width: 1400, height: 900 });
  await p.waitForTimeout(300);

  await p.evaluate(() => document.querySelector('#btn-gallery').click());
  await p.waitForTimeout(200);
  const galOpen = await p.evaluate(() => { const m = document.querySelector('#modal-gallery'); return m && !m.hidden; });
  t('gallery opens', galOpen, galOpen);
  await p.evaluate(() => document.querySelector('#modal-gallery').click());
  await p.waitForTimeout(200);
  const galClosed = await p.evaluate(() => { const m = document.querySelector('#modal-gallery'); return m && m.hidden; });
  t('gallery overlay click closes', galClosed, galClosed);

  await p.evaluate(() => document.querySelector('#btn-focus').click());
  await p.waitForTimeout(200);
  const focus = await p.evaluate(() => {
    const app = document.querySelector('.app');
    const exit = document.querySelector('#btn-exit-focus');
    const stage = document.querySelector('#stage');
    const er = exit && exit.getBoundingClientRect();
    return {
      on: app.classList.contains('focus'),
      exitShown: !!(exit && !exit.hidden && getComputedStyle(exit).display !== 'none'),
      exitOnScreen: !!(er && er.width > 0 && er.top >= 0 && er.right <= innerWidth + 1),
      stageActive: document.activeElement === stage,
    };
  });
  t('focus shows Exit on the plate', focus.on && focus.exitShown && focus.exitOnScreen, focus);
  t('focus lands on the stage', focus.stageActive, focus);
  await p.evaluate(() => document.querySelector('#btn-exit-focus').click());
  await p.waitForTimeout(200);
  const unfocus = await p.evaluate(() => ({
    on: document.querySelector('.app').classList.contains('focus'),
    back: document.activeElement && document.activeElement.id === 'btn-focus',
  }));
  t('Exit returns focus to the Focus button', !unfocus.on && unfocus.back, unfocus);

  await p.evaluate(() => document.querySelector('#stage').click());
  await p.waitForTimeout(80);
  await p.keyboard.press('/');
  await p.waitForTimeout(80);
  const slashFind = await p.evaluate(() => document.activeElement && document.activeElement.id === 'find');
  t('slash focuses Find', slashFind, slashFind);
  const found = await p.evaluate(() => {
    const find = document.querySelector('#find');
    find.focus();
    find.value = 'pentaplexity';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    find.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const tab = document.querySelector('.tab[aria-selected="true"]');
    const visible = [...document.querySelectorAll('.tab[data-id]')].filter(b => !b.classList.contains('is-hidden')).map(b => b.dataset.id);
    return { id: tab && tab.dataset.id, visible: visible.slice(0, 6), n: visible.length };
  });
  t('Find Enter jumps to a match', found.id === 'tilings' && found.visible.indexOf('tilings') >= 0, found);

  const seen = await p.evaluate(() => {
    const find = document.querySelector('#find');
    if (find) { find.value = ''; find.dispatchEvent(new Event('input', { bubbles: true })); }
    const sel = document.querySelector('#seen');
    if (!sel) return { missing: true };
    sel.value = 'unseen';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const visible = [...document.querySelectorAll('.tab[data-id]')].filter(b => !b.classList.contains('is-hidden')).map(b => b.dataset.id);
    const hint = document.querySelector('#seen-hint');
    return { n: visible.length, hasRotor: visible.indexOf('rotor') >= 0, hasLife: visible.indexOf('life') >= 0, hint: !!(hint && !hint.hidden), sample: visible.slice(0, 8) };
  });
  t('Seen elsewhere filters to the unseen bucket', !seen.missing && seen.n >= 4 && seen.n <= 20 && seen.hasRotor && !seen.hasLife && seen.hint, seen);
  await p.evaluate(() => {
    const sel = document.querySelector('#seen');
    if (!sel) return;
    sel.value = '';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const find = document.querySelector('#find');
    find.value = '';
    find.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const recHidden = await p.evaluate(() => {
    const b = document.querySelector('#btn-record');
    return !b || b.hidden;
  });
  t('Record stays hidden on a still plate', recHidden, recHidden);

  const exp = await p.evaluate(() => {
    document.querySelector('#btn-export').click();
    const title = document.querySelector('#export-title').textContent;
    return { title, hasDot: title.indexOf('·') >= 0, cancel: !!document.querySelector('#export-cancel') };
  });
  t('export names the technique and seed', exp.hasDot && exp.title.length > 3, exp);
  t('export sheet has a Cancel button', exp.cancel, exp);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);

  await p.goto('about:blank');
  await p.goto('file://' + studio + '#three-vortex-bound/attribution-check', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const namedBound = await p.evaluate(() => ({
    id: document.querySelector('.tab[aria-selected="true"]')?.dataset.id,
    seed: document.querySelector('#seed')?.value,
  }));
  t('descriptive three-vortex route restores its seed', namedBound.id === 'three-vortex-bound' && namedBound.seed === 'attribution-check', namedBound);

  const placement = await p.evaluate(() => {
    const art = document.querySelector('#art-viewport').getBoundingClientRect();
    const status = document.querySelector('#status').getBoundingClientRect();
    return { artBottom: art.bottom, statusTop: status.top };
  });
  t('measurements occupy space outside the plate', placement.statusTop >= placement.artBottom, placement);

  const scrollStart = await p.evaluate(() => {
    const tabs = document.querySelector('#tabs'); tabs.scrollTop = 0;
    const r = tabs.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: document.querySelector('.tab[aria-selected="true"]').dataset.id };
  });
  await p.mouse.move(scrollStart.x, scrollStart.y);
  await p.mouse.wheel(0, 160);
  await p.waitForTimeout(250);
  const scrolled = await p.evaluate(() => {
    const tabs = document.querySelector('#tabs');
    return { top: tabs.scrollTop, overflowX: tabs.scrollWidth > tabs.clientWidth + 1, id: document.querySelector('.tab[aria-selected="true"]').dataset.id };
  });
  t('wrapped tabs scroll vertically without changing module', scrolled.top > 20 && !scrolled.overflowX && scrolled.id === scrollStart.id, scrolled);

  await p.evaluate(() => document.querySelector('.tab[data-id="life"]').click());
  await p.waitForTimeout(400);
  const afterClick = await p.evaluate(() => document.querySelector('.tab[aria-selected="true"]').dataset.id);
  t('click after scrolling still switches', afterClick === 'life', afterClick);

  const viewpad = await p.evaluate(() => {
    const pad = document.querySelector('#viewpad');
    const r = pad && pad.getBoundingClientRect();
    const fit = document.querySelector('#view-fit');
    return {
      shown: !!(pad && r && r.width > 0 && r.height > 0),
      fitDisabled: !!(fit && fit.disabled),
      bottom: r && r.bottom,
      right: r && r.right,
      innerH: innerHeight,
      innerW: innerWidth,
    };
  });
  t('view pad is on the stage', viewpad.shown && viewpad.fitDisabled && viewpad.bottom < viewpad.innerH + 1 && viewpad.right < viewpad.innerW + 1, viewpad);

  await p.keyboard.press('+');
  await p.waitForTimeout(80);
  const zoomed = await p.evaluate(() => {
    const c = document.querySelector('#sheet');
    return { t: c && c.style.transform, fitOn: document.querySelector('#view-fit') && !document.querySelector('#view-fit').disabled };
  });
  t('+ zooms the plate', !!(zoomed.t && /scale/.test(zoomed.t)) && zoomed.fitOn, zoomed);

  await p.evaluate(() => document.querySelector('#view-fit').click());
  await p.waitForTimeout(80);
  const fitted = await p.evaluate(() => {
    const c = document.querySelector('#sheet');
    return { t: (c && c.style.transform) || '', fitOff: document.querySelector('#view-fit') && document.querySelector('#view-fit').disabled };
  });
  t('Fit clears the view', fitted.t === '' && fitted.fitOff, fitted);

  await p.keyboard.press('0');
  const hashStill = await p.evaluate(() => location.hash);
  t('view is not written into the hash', !/view|scale|pan/.test(hashStill), { hash: hashStill.slice(0, 80) });


  // User-entered sheet sizes must neither stretch a simulation nor silently export stale input.
  const size = async (w, h) => p.evaluate(([w, h]) => {
    const choose = document.querySelector('#export-inches');
    choose.value = 'custom'; choose.dispatchEvent(new Event('change'));
    for (const [id, value] of [['export-width', w], ['export-height', h]]) {
      const input = document.querySelector('#' + id); input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const dpi = document.querySelector('#export-dpi'); dpi.value = '300'; dpi.dispatchEvent(new Event('change'));
  }, [w, h]);
  const exportSheet = async (baseline = false) => {
    await p.evaluate(() => document.querySelector('#btn-export').click());
    await p.waitForFunction(() => !Studio.exportJob && (!document.querySelector('#export-img').hidden || document.querySelector('#export-note').classList.contains('err')), null, {timeout: 90000});
    return p.evaluate(async baseline => {
      const im = document.querySelector('#export-img');
      if (im.hidden) return {error: document.querySelector('#export-note').textContent};
      await im.decode();
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const cx = c.getContext('2d'); cx.drawImage(im, 0, 0);
      const x = Math.floor((c.width - 675) / 2), y = Math.floor((c.height - 675) / 2);
      const data = cx.getImageData(x, y, 675, 675).data;
      let changed = 0;
      if (baseline) window.__printBaseline = data;
      else if (window.__printBaseline) for (let i = 0; i < data.length; i++) if (data[i] !== window.__printBaseline[i]) changed++;
      const svg = document.querySelector('#export-svg');
      let vector = null;
      if (!svg.hidden) {
        const xml = new DOMParser().parseFromString(await (await fetch(svg.href)).text(), 'image/svg+xml');
        const root = xml.documentElement;
        vector = {w: +root.getAttribute('width'), h: +root.getAttribute('height'), invalid: !!xml.querySelector('parsererror')};
      }
      document.querySelector('#export-close').click();
      return {w: c.width, h: c.height, changed, vector};
    }, baseline);
  };
  for (const id of ['tilings', 'maxwell']) {
    await p.evaluate(id => {
      const recipe = {v: 2, seed: 'custom-sheet', running: false, warmup: 0, grid: 128, aspect: '1:1'};
      location.hash = id + '/custom-sheet/' + btoa(JSON.stringify(recipe)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }, id);
    await p.waitForTimeout(1200);
    await p.evaluate(() => { const toggle = document.querySelector('#btn-colophon'); if (toggle.getAttribute('aria-checked') === 'true') toggle.click(); });
    await size(2.25, 2.25);
    const base = await exportSheet(true);
    t(id + ' custom square dimensions', base.w === 675 && base.h === 675, base);
    const hashBefore = await p.evaluate(() => location.hash);
    await size(3.5, 2.25);
    const wide = await exportSheet();
    t(id + ' custom width and height', wide.w === 1050 && wide.h === 675, wide);
    t(id + ' custom sheet preserves artwork pixels', wide.changed === 0, wide.changed);
    if (id === 'tilings') t('custom SVG sheet dimensions', wide.vector && wide.vector.w === 1050 && wide.vector.h === 675 && !wide.vector.invalid, wide.vector);
    const hashAfter = await p.evaluate(() => location.hash);
    t(id + ' print dimensions leave recipe alone', hashAfter === hashBefore, hashAfter.slice(0, 60));
    await size(2.25, 3.5);
    const tall = await exportSheet();
    t(id + ' custom portrait preserves artwork', tall.w === 675 && tall.h === 1050 && tall.changed === 0, tall);
  }
  await size('', 2.25);
  t('empty custom width blocks export', await p.$eval('#btn-export', el => el.disabled), 'empty');
  await size(0, 2.25);
  t('zero custom width blocks export', await p.$eval('#btn-export', el => el.disabled), 0);
  await size(1001, 2.25);
  t('out-of-range custom width blocks export', await p.$eval('#btn-export', el => el.disabled), 1001);
  const deviceCap = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    return Math.min(16000, gl.getParameter(gl.MAX_TEXTURE_SIZE));
  });
  await size((deviceCap + 1) / 300, 1);
  const nearCap = await p.$eval('#export-dims', el => el.textContent);
  t('one pixel over device cap is reduced and disclosed', nearCap.includes(deviceCap.toLocaleString('en-US') + ' ×') && /ppi/.test(nearCap), nearCap);
  await size(3.5, 1);
  await p.evaluate(() => document.querySelector('#btn-colophon').click());
  const captioned = await exportSheet();
  t('short custom sheet with caption exports exact dimensions', captioned.w === 1050 && captioned.h === 300, captioned);
  await p.evaluate(() => document.querySelector('#btn-colophon').click());
  await size(100, 100);
  const limitLabel = await p.$eval('#export-dims', el => el.textContent);
  t('oversized custom sheets disclose effective ppi', /ppi/.test(limitLabel), limitLabel);
  await size(3.5, 2.25);
  await p.reload({waitUntil: 'domcontentloaded'});
  await p.waitForTimeout(800);
  const savedSize = await p.evaluate(() => ['export-inches', 'export-width', 'export-height'].map(id => document.querySelector('#' + id).value));
  t('custom dimensions survive reload', savedSize.join(',') === 'custom,3.5,2.25', savedSize);
  await p.setViewportSize({width: 390, height: 844});
  await p.waitForTimeout(250);
  const customMobile = await p.evaluate(() => ['export-width', 'export-height', 'btn-export'].map(id => {
    const r = document.querySelector('#' + id).getBoundingClientRect();
    return {id, shown: r.width > 0 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight};
  }));
  t('custom dimensions and export fit mobile', customMobile.every(c => c.shown), customMobile);
  await p.selectOption('#export-inches', '8');
  t('preset shortcut exits custom mode', await p.$eval('#export-custom', el => el.hidden), true);

  // Undo returns the state from before the change. A preset, a seg click and a Settings JSON apply once
  // snapshotted after mutating, so the first Undo restored the new state and did nothing visible. A slider
  // drag is one step however many input events it fires. On Schrödinger the V0 slider also moves the time
  // step's ceiling, which setParam applies through onParam since it never runs sanitize.
  await p.setViewportSize({width: 1400, height: 900});
  await p.waitForTimeout(250);
  const sch = () => p.evaluate(() => Object.assign({}, Studio.modules.schrodinger.defaults, Studio.getRecipe()));
  const loadWell = async () => {
    await p.evaluate(() => { location.hash = '#schrodinger/undo-check/' + btoa(JSON.stringify({v: 6, kind: 'well', V0: 2, running: false, warmup: 50})).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); });
    await p.waitForFunction(() => { const r = Studio.getRecipe(); return r && r.id === 'schrodinger' && r.kind === 'well' && r.seed === 'undo-check'; }, null, {timeout: 20000}).catch(() => {});
    await p.waitForTimeout(400);
  };
  const undo = async () => { await p.evaluate(() => document.querySelector('#btn-undo').click()); await p.waitForTimeout(500); };
  await loadWell();
  t('undo fixture loads a harmonic well', (await sch()).kind === 'well', (await sch()).kind);
  await p.selectOption('#preset', 'tunnel');
  await p.waitForTimeout(500);
  t('the Tunneling preset sets a barrier', (await sch()).kind === 'barrier', (await sch()).kind);
  await undo();
  let r = await sch();
  t('one Undo after a preset returns the previous recipe', r.kind === 'well' && r.V0 === 2 && r.seed === 'undo-check', {kind: r.kind, V0: r.V0});

  await loadWell();
  await p.evaluate(() => document.querySelector('#p-schrodinger-kind-barrier').click());
  await p.waitForTimeout(500);
  t('a seg click sets the barrier', (await sch()).kind === 'barrier', (await sch()).kind);
  await undo();
  r = await sch();
  t('one Undo after a seg click returns the previous value', r.kind === 'well', r.kind);

  // A grid click first, so the snapshot before the drag can be told apart from the one before it.
  await loadWell();
  await p.evaluate(() => document.querySelector('#p-schrodinger-grid-128').click());
  await p.waitForTimeout(500);
  const bound = await p.evaluate(() => {
    const s = Object.assign({}, Studio.modules.schrodinger.defaults, Studio.getRecipe(), {V0: 6});
    const n = Number(s.grid), ar = {'1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16}[s.aspect] || 1;
    const W = n & ~1, H = Math.max(64, Math.round(n * ar)) & ~1, m = Math.min(W, H);
    return Math.min(0.25, 1.6 / (4 + 6 * (((W - 1) / m) ** 2 + ((H - 1) / m) ** 2)));
  });
  await p.evaluate(() => {
    const el = document.querySelector('#p-schrodinger-V0');
    el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
    for (const v of [3, 4.5, 6]) { el.value = String(v); el.dispatchEvent(new Event('input', {bubbles: true})); }
    el.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await p.waitForTimeout(500);
  r = await sch();
  const dtShown = await p.$eval('#p-schrodinger-dt', el => Number(el.value));
  t('V0 = 6 on the harmonic well holds dt under its bound', r.V0 === 6 && r.dt <= bound + 1e-12 && r.dt < 0.2, {V0: r.V0, dt: r.dt, bound});
  t('the dt slider shows the clamped step', Math.abs(dtShown - r.dt) < 0.0051, {slider: dtShown, dt: r.dt});
  await undo();
  r = await sch();
  t('one Undo after a slider drag returns V0 and dt', r.V0 === 2 && r.dt === 0.2 && r.grid === 128, {V0: r.V0, dt: r.dt, grid: r.grid});
  await undo();
  r = await sch();
  t('the drag made exactly one snapshot: the next Undo reverts the grid click', r.V0 === 2 && r.grid === 192, {V0: r.V0, grid: r.grid});

  // A range returned to its initial value fires input but no change in Chromium. The next
  // headline edit must still get its own snapshot, separate from a seed roll in between.
  await p.setViewportSize({width: 1600, height: 900});
  await p.goto('file://' + studio + '#aztec/drag-back/' + Buffer.from(JSON.stringify({n: 120})).toString('base64url'));
  await p.evaluate(() => Studio.ready);
  await p.waitForFunction(() => Studio.getRecipe()?.id === 'aztec');
  await p.locator('#p-aztec-n').evaluate(el => { el.closest('details').open = true; });
  await p.locator('#p-aztec-n').scrollIntoViewIfNeeded();
  const slider = await p.locator('#p-aztec-n').boundingBox();
  const thumbX = slider.x + 8 + (slider.width - 16) * (120 - 8) / (320 - 8), thumbY = slider.y + slider.height / 2;
  await p.evaluate(() => {
    window.__rangeEvents = [];
    const el = document.querySelector('#p-aztec-n');
    for (const type of ['input', 'change']) el.addEventListener(type, () => window.__rangeEvents.push([type, +el.value]));
  });
  await p.mouse.move(thumbX, thumbY); await p.mouse.down();
  await p.mouse.move(thumbX + 30, thumbY, {steps: 4});
  await p.mouse.move(thumbX, thumbY, {steps: 4}); await p.mouse.up();
  const dragEvents = await p.evaluate(() => window.__rangeEvents);
  t('drag back really moved and returned without change', dragEvents.some(([type, n]) => type === 'input' && n > 120)
    && dragEvents.at(-1)?.[1] === 120 && !dragEvents.some(([type]) => type === 'change'), dragEvents);
  await p.evaluate(() => document.querySelector('#btn-generate').click());
  const rolledSeed = await p.$eval('#seed', el => el.value);
  t('the intervening dice click changes the seed', rolledSeed !== 'drag-back', rolledSeed);
  await p.locator('#headline-input').fill('126');
  await p.keyboard.press('Enter');
  t('the headline edit sets order 126', await p.evaluate(() => Studio.getRecipe().n) === 126);
  await p.locator('#stage').focus();
  await p.keyboard.press('z');
  const afterHeadlineUndo = await p.evaluate(() => ({...Studio.modules.aztec.defaults, ...Studio.getRecipe()}));
  t('one Z undoes only the headline edit after drag back', afterHeadlineUndo.n === 120 && afterHeadlineUndo.seed === rolledSeed,
    {n: afterHeadlineUndo.n, seed: afterHeadlineUndo.seed, rolledSeed});
  await p.keyboard.press('z');
  t('the next Z undoes the seed roll', await p.$eval('#seed', el => el.value) === 'drag-back');

  // Hash navigation deliberately defers resume until regeneration. A custom potential must
  // clear the previous tab pause and advance past warm-up on the already-created instance.
  const customHash = a => '#schrodinger/s1/' + Buffer.from(JSON.stringify({kind: 'custom', pa: a, grid: 128, warmup: 100})).toString('base64url');
  await p.goto('about:blank');
  await p.goto('file://' + studio + customHash(1.5));
  await p.evaluate(() => Studio.ready);
  const advances = (minimum = 100) => p.waitForFunction(minimum => {
    const text = document.querySelector('#status').textContent;
    const step = /step\s+([\d,]+)/.exec(text);
    return step && Number(step[1].replace(/,/g, '')) > minimum && !/warming up/.test(text);
  }, minimum, {timeout: 20000}).then(() => true, () => false);
  t('custom potential advances on first entry', await advances(), await p.$eval('#status', el => el.textContent));
  await p.evaluate(() => document.querySelector('.tab[data-id="flow"]').click());
  await p.waitForFunction(() => Studio.getRecipe()?.id === 'flow');
  await p.evaluate(hash => { location.hash = hash; }, customHash(2.5));
  await p.waitForFunction(() => Studio.getRecipe()?.id === 'schrodinger' && Studio.getRecipe().pa === 2.5);
  const returnedStep = await p.$eval('#status', el => Number(/step\s+([\d,]+)/.exec(el.textContent)?.[1].replace(/,/g, '') || 0));
  t('custom potential advances after hash re-entry with a new coefficient', await advances(Math.max(100, returnedStep)), await p.$eval('#status', el => el.textContent));

  // Recent-frame cards have their own persistent preference, independent of the
  // scientific badge, sidebar and recipe. A reload must not reveal them again.
  await p.goto('file://' + studio + '#tilings/frames-ui');
  await p.evaluate(() => Studio.ready);
  await p.waitForFunction(() => Studio.getRecipe()?.id === 'tilings');
  await p.evaluate(() => { const b = document.querySelector('#btn-witness-frames'); if (b.getAttribute('aria-expanded') !== 'true') b.click(); });
  const frameRecipe = await p.evaluate(() => JSON.stringify(Studio.getRecipe()));
  await p.locator('#btn-witness-frames').click();
  t('frame cards hide separately from the live badge', await p.evaluate(() => document.querySelector('#witness-strip').hidden && getComputedStyle(document.querySelector('#live-badge')).display !== 'none'));
  t('frame preference leaves recipe unchanged', await p.evaluate(() => JSON.stringify(Studio.getRecipe())) === frameRecipe);
  await p.reload(); await p.evaluate(() => Studio.ready);
  t('hidden frames persist on reload with visible recovery button', await p.evaluate(() => document.querySelector('#witness-strip').hidden && document.querySelector('#btn-witness-frames').textContent === 'Show frames'));
  await p.locator('#btn-witness-frames').focus(); await p.keyboard.press('Enter');
  t('keyboard restores recent frames', await p.evaluate(() => !document.querySelector('#witness-strip').hidden && document.querySelector('#btn-witness-frames').getAttribute('aria-expanded') === 'true'));
  await p.setViewportSize({width: 390, height: 844});
  t('frame toggle remains available on mobile', await p.locator('#btn-witness-frames').evaluate(el => { const r = el.getBoundingClientRect(); return r.width > 40 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#btn-witness-frames') === el; }));
  await p.setViewportSize({width: 1400, height: 900});

  // A tiny module exercises the real shell event path without coupling timing to
  // any simulation's workload. A continuous input stream must draw before change.
  await p.evaluate(() => {
    window.__previewCalls = [];
    for (const id of ['ui-preview-fixture', 'ui-preview-other']) Studio.register({
      id, name: id, tab: id, defaults: {size: 1, tint: 1, moving: false}, palette: false,
      schema: [{group:'Preview',key:'size',label:'Size',type:'range',kind:'geom',min:1,max:40,step:1},
        {group:'Preview',key:'tint',label:'Tint',type:'range',kind:'paint',min:1,max:40,step:1},
        {group:'Preview',key:'moving',label:'Moving',type:'toggle',kind:'live'}],
      create(host) {
        const draw = kind => { const s = host.getState(); window.__previewCalls.push({id,kind,size:s.size,tint:s.tint,moving:s.moving}); const g=host.canvas.getContext('2d');g.fillStyle='rgb('+s.size*5+','+s.tint*5+',0)';g.fillRect(0,0,host.canvas.width,host.canvas.height);host.setStatus('Preview '+s.size); };
        return {aspect:()=>1,regenerate(){draw('geom');},repaint(){draw('paint');},live(){draw('live');},pause(){},resume(){}};
      }
    });
    location.hash = 'ui-preview-fixture/drag-preview';
  });
  await p.waitForFunction(() => Studio.getRecipe()?.id === 'ui-preview-fixture');
  const liveDrag = await p.evaluate(async () => {
    const input = document.querySelector('#p-ui-preview-fixture-size');
    window.__previewCalls = [];
    input.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
    for (let v=2;v<=20;v++) { input.value=v;input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,20)); }
    const beforeCommit=window.__previewCalls.filter(x=>x.kind==='geom');
    input.dispatchEvent(new Event('change',{bubbles:true}));
    input.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    return {beforeCommit, final:window.__previewCalls.at(-1)};
  });
  t('continuous geometry drag updates before pointer release', liveDrag.beforeCommit.length >= 2, liveDrag);
  t('release draws exact final slider value', liveDrag.final.size === 20, liveDrag.final);
  await p.locator('#stage').focus(); await p.keyboard.press('z');
  t('one Undo restores the pre-drag recipe', await p.evaluate(() => ({...Studio.modules['ui-preview-fixture'].defaults,...Studio.getRecipe()}).size) === 1);
  const instant = await p.evaluate(() => {
    const input=document.querySelector('#p-ui-preview-fixture-tint');input.value=7;input.dispatchEvent(new Event('input',{bubbles:true}));
    const paint=window.__previewCalls.at(-1);
    document.querySelector('#p-ui-preview-fixture-moving').click();
    return {paint,live:window.__previewCalls.at(-1)};
  });
  t('paint slider and live switch update immediately', instant.paint.kind==='paint' && instant.paint.tint===7 && instant.live.kind==='live' && instant.live.moving, instant);
  await p.evaluate(() => { const input=document.querySelector('#p-ui-preview-fixture-size');input.value=30;input.dispatchEvent(new Event('input',{bubbles:true}));location.hash='ui-preview-other/switch-during-drag'; });
  await p.waitForFunction(() => Studio.getRecipe()?.id === 'ui-preview-other');
  await p.waitForTimeout(160);
  const otherCalls=await p.evaluate(() => window.__previewCalls.filter(x=>x.id==='ui-preview-other'&&x.kind==='geom'));
  t('queued slider work cannot regenerate the next technique', otherCalls.length === 1, otherCalls);

  console.log('pageerrors:', errs.length? errs.slice(0,3): 'none');
  await b.close();
  console.log(fail? 'UI CHECK FAILED: '+fail : 'UI CHECK OK');
  process.exit(fail?1:0);
})();
