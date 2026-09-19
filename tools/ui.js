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
  const click=async()=>{await p.evaluate(()=>document.querySelector('#live-badge').click());await p.waitForTimeout(260);};
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

  console.log('pageerrors:', errs.length? errs.slice(0,3): 'none');
  await b.close();
  console.log(fail? 'WITNESS TOGGLE FAILED: '+fail : 'WITNESS TOGGLE OK');
  process.exit(fail?1:0);
})();
