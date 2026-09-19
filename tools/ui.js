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
const path = require('path');
const { chromium } = require('playwright');

(async()=>{
  const studio=process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
  await p.goto('file://'+studio+'#snowflake/gravner-2008',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  const mode=()=>p.evaluate(()=>{const w=document.querySelector('#witness');
    return {cls:w.className, labelVisible:getComputedStyle(document.querySelector('#live-label')).display!=='none',
            badgeOpacity:getComputedStyle(document.querySelector('#live-badge')).opacity};});
  const click=async()=>{await p.evaluate(()=>document.querySelector('#live-badge').click());await p.waitForTimeout(400);};
  const key=k=>p.keyboard.press(k);
  let fail=0; const t=(name,cond,got)=>{if(!cond)fail++;console.log((cond?'  ok   ':'  FAIL ')+name+'   '+JSON.stringify(got));};

  let m=await mode(); t('starts full', m.cls.indexOf('w-quiet')<0&&m.cls.indexOf('w-off')<0&&m.labelVisible, m);
  await click(); m=await mode(); t('click 1 -> quiet, words gone', m.cls.includes('w-quiet')&&!m.labelVisible, m);
  await click(); m=await mode(); t('click 2 -> off, badge invisible', m.cls.includes('w-off')&&m.badgeOpacity==='0', m);
  await click(); m=await mode(); t('click 3 -> back to full', !m.cls.includes('w-quiet')&&!m.cls.includes('w-off')&&m.labelVisible, m);
  await key('w'); await p.waitForTimeout(260); m=await mode(); t('W key cycles too', m.cls.includes('w-quiet'), m);

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
    return {
      seedW: box.width,
      exportRight: exp.right, exportTop: exp.top,
      genTop: gen.top, innerW: innerWidth, innerH: innerHeight,
      moreShown: more && getComputedStyle(more).display !== 'none',
    };
  });
  t('seedbox wider than 150 at 390', mobile.seedW > 150, mobile);
  t('Export is on screen at 390', mobile.exportRight <= mobile.innerW + 1 && mobile.exportTop >= 0 && mobile.exportTop < mobile.innerH, mobile);
  t('Generate is on screen at 390', mobile.genTop >= 0 && mobile.genTop < mobile.innerH, mobile);
  t('More is available at 390', mobile.moreShown, mobile);

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
  await p.goto('file://' + studio + '#hendrick/alias-check', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const alias = await p.evaluate(() => ({
    id: document.querySelector('.tab[aria-selected="true"]') && document.querySelector('.tab[aria-selected="true"]').dataset.id,
    seed: (document.querySelector('#seed') || {}).value,
  }));
  t('#hendrick opens Hendrick\'s Identity', alias.id === 'hendrick' && alias.seed === 'alias-check', alias);

  console.log('pageerrors:', errs.length? errs.slice(0,3): 'none');
  await b.close();
  console.log(fail? 'UI CHECK FAILED: '+fail : 'UI CHECK OK');
  process.exit(fail?1:0);
})();
