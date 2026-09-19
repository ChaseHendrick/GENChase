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

  console.log('pageerrors:', errs.length? errs.slice(0,3): 'none');
  await b.close();
  console.log(fail? 'UI CHECK FAILED: '+fail : 'UI CHECK OK');
  process.exit(fail?1:0);
})();
