'use strict';
const { glArgs } = require('./lib/gl-args');
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({args:glArgs()});
 try{
 const page=await browser.newPage();await page.goto('file://'+path.resolve(__dirname,'../dist/studio.html')+'#three-vortex-bound/api-baseline');
 await page.waitForFunction(()=>Studio.ready);await page.evaluate(()=>Studio.ready);
 const result=await page.evaluate(async()=>{
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  check(Studio.apiVersion===1&&Studio.recipeVersion===5,'versions');
  check(Object.getOwnPropertyDescriptor(Studio,'apiVersion').writable===false,'immutable version');
  check(Studio.getWitness()===null,'legacy is unknown');
  for(const id of ['missing','__proto__','constructor','toString'])check(Studio.getRecipe(id)===null&&Studio.getWitness(id)===null,'unknown module lookup '+id);
  const recipe=Studio.getRecipe();check(recipe.v===5&&recipe.seed==='api-baseline','versioned recipe');recipe.seed='mutated';check(Studio.getRecipe().seed==='api-baseline','recipe clone');
  const rng=Studio.util.makeRng('engine-api-v1'),random=Array.from({length:6},()=>rng());
  check(Studio.util.svgEsc('a<b & "c"')==='a&lt;b &amp; &quot;c&quot;','svg escape');
  const inches=document.getElementById('export-inches'),dpi=document.getElementById('export-dpi');inches.value='12';inches.dispatchEvent(new Event('change'));dpi.value='300';dpi.dispatchEvent(new Event('change'));
  document.getElementById('btn-colophon').click();
  for(const [kind,expected] of [['minimum',true],['broken',false]]){
   const seed='real-witness-'+kind;
   location.hash='double-triangle-bound/'+seed+'/'+btoa(JSON.stringify({v:2,kind,running:false}));
   for(let i=0;i<300&&Studio.getRecipe()?.seed!==seed;i++)await new Promise(r=>setTimeout(r,20));
   const report=Studio.getWitness();check(report?.valid===expected&&report.tol===1e-9&&Number.isFinite(report.measured),'real module '+kind);
  }
  Studio.register({id:'engine-api-fixture',name:'API fixture',tab:'API fixture',defaults:{count:30},legacy:{1:{count:10},2:{count:20}},schema:[{group:'Fixture',key:'count',label:'Count',type:'range',kind:'live',min:1,max:100,step:1}],palette:false,
   create(host){window.apiFixtureHost=host;return {regenerate(){host.setStatus('fixture status');host.canvas.getContext('2d').fillRect(0,0,10,10);},pause(){},resume(){}};}});
  location.hash='engine-api-fixture/api-fixture';
  for(let i=0;i<100&&!window.apiFixtureHost;i++)await new Promise(r=>setTimeout(r,20));
  const host=window.apiFixtureHost;check(!!host,'fixture loaded');
  for(const mode of ['light','maximum','balanced']){const control=document.getElementById('compute-mode');control.value=mode;control.dispatchEvent(new Event('change'));check(host.computeBudget().mode===mode,'host workload propagation');}
  const detachedBudget=host.computeBudget();detachedBudget.cpuSliceMs=999;check(host.computeBudget().cpuSliceMs===8,'detached workload budget');
  check(inches.value==='12'&&dpi.value==='300'&&document.getElementById('btn-colophon').getAttribute('aria-checked')==='true','shared print and colophon settings survive tab changes');
  check(!('dpi' in Studio.getRecipe())&&!('colophon' in Studio.getRecipe()),'print preferences stay outside model recipe');
  host.setWitness({label:'<img src=x onerror=alert(1)>',measured:1.02,expected:1,tol:.05,missWhen:'outside stated domain'});
  let w=Studio.getWitness();check(w.valid===true&&w.recipe.seed==='api-fixture'&&w.schemaVersion===1,'passing record');
  check(!document.querySelector('#status .science-witness img'),'escaped labels');
  w.measured=999;w.recipe.seed='mutated';check(Studio.getWitness().measured===1.02&&Studio.getWitness().recipe.seed==='api-fixture','witness clone');
  host.setWitness({measured:2,expected:1,tol:.05,valid:true});check(Studio.getWitness().valid===false,'caller cannot override failed tolerance');
  host.setWitness({measured:1,expected:1,tol:0,valid:false});check(Studio.getWitness().valid===false,'failed precondition');
  host.setWitness({measured:1,expected:1,tol:0,valid:null});check(Studio.getWitness().valid===null,'explicit unknown');
  host.setWitness({measured:null,expected:1,tol:.1});check(Studio.getWitness().valid===null,'missing measurement');
  let rejects=0;for(const value of [{measured:NaN},{tol:-1},{measured:Infinity},{valid:'yes'},{label:{}},[]]){try{host.setWitness(value);}catch(_){rejects++;}check(Studio.getWitness()===null,'invalid input clears prior result');}check(rejects===6,'invalid input rejected');
  host.setWitness({measured:1,expected:1,tol:0,basis:'deterministic'});check(Studio.getWitness().basis==='deterministic'&&Studio.getWitness().uncertainty===null,'witness keeps its basis');
  host.setWitness({measured:1.1,expected:1,tol:.2,basis:'sampled',uncertainty:.04,method:'8 seeds'});check(Studio.getWitness().uncertainty===.04&&Studio.getWitness().method==='8 seeds','witness keeps its error bar');
  let basisRejects=0;for(const value of [{basis:'guess'},{basis:'sampled',uncertainty:-1},{uncertainty:NaN}]){try{host.setWitness(value);}catch(_){basisRejects++;}}check(basisRejects===3,'invalid basis or uncertainty rejected');
  host.setWitness({measured:1,expected:1,tol:0});host.setStatus('new state');check(Studio.getWitness()===null,'legacy status invalidates');
  host.setWitness({measured:1,expected:1,tol:0});host.setWitness(null);check(Studio.getWitness()===null,'explicit clear');
  host.setWitness({measured:1,expected:1,tol:0});
  location.hash='engine-api-fixture/api-next';
  for(let i=0;i<100&&Studio.getRecipe()?.seed!=='api-next';i++)await new Promise(r=>setTimeout(r,20));
  check(Studio.getRecipe().seed==='api-next'&&Studio.getWitness()===null,'regeneration clears witness');
  host.setWitness({measured:1,expected:1,tol:0});
  const input=document.getElementById('p-engine-api-fixture-count');input.value=31;input.dispatchEvent(new Event('change',{bubbles:true}));
  check(Studio.getWitness()===null&&host.getState().count===31,'parameter clears witness');
  for(const [version,expected] of [[0,10],[1,20],[2,30]]){
   const seed='legacy-'+version;location.hash='engine-api-fixture/'+seed+'/'+btoa(JSON.stringify({v:version}));
   for(let i=0;i<100&&host.getState().seed!==seed;i++)await new Promise(r=>setTimeout(r,20));
   check(host.getState().count===expected,'successive legacy defaults v'+version);
  }
  location.hash='engine-api-fixture/legacy-explicit/'+btoa(JSON.stringify({v:0,count:47}));
  for(let i=0;i<100&&host.getState().seed!=='legacy-explicit';i++)await new Promise(r=>setTimeout(r,20));
  check(host.getState().count===47,'explicit old recipe value wins');
  host.setWitness({measured:1,expected:1,tol:0});host.fault('Expected API test fault');
  check(Studio.getWitness()===null,'fault clears witness');
  host.setWitness({measured:1,expected:1,tol:0});host.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
  check(Studio.getWitness()===null,'context loss clears witness');
  // Text controls and the expression language: typed text is validated, committed only when valid,
  // carried in the hash, shown back as text only, and a bad value in a link falls back to the default.
  const until=async(fn,ms=8000)=>{for(let t=0;t<ms/20;t++){try{if(fn())return true;}catch(_){}await new Promise(r=>setTimeout(r,20));}return false;};
  const b64=o=>btoa(JSON.stringify(o)),payload=()=>{const p=location.hash.split('/')[2];return p?JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))):{};};
  const XSS='<img src=x onerror=alert(1)>';let alerted=false;window.alert=()=>{alerted=true;};
  const X=Studio.util.expr;check(X.compile('2*x^2',{vars:['x']})([3])===18&&X.check('alert(1)',{vars:['x']}).pos===0,'expression language on util');
  Studio.register({id:'engine-api-text',name:'Text fixture',tab:'Text fixture',defaults:{f:'x*2'},schema:[{group:'Fixture',key:'f',label:'f(x) =',type:'text',kind:'geom',maxLength:64,validate:v=>X.check(v,{vars:['x']})}],palette:false,
   create(host){window.apiTextHost=host;return {regenerate(){host.setStatus('<span>f <b>'+Studio.util.escapeHtml(host.getState().f)+'</b></span>');host.canvas.getContext('2d').fillRect(0,0,5,5);},pause(){},resume(){}};}});
  location.hash='engine-api-text/text-a';
  check(await until(()=>window.apiTextHost&&window.apiTextHost.getState().seed==='text-a'),'text fixture loaded');
  const th=window.apiTextHost,field=document.getElementById('p-engine-api-text-f'),errBox=document.getElementById('p-engine-api-text-f-error');
  check(th.getState().f==='x*2'&&field.value==='x*2','text default');
  field.value=XSS;field.dispatchEvent(new Event('input'));field.dispatchEvent(new Event('change'));
  check(th.getState().f==='x*2','invalid text keeps the last valid value');
  check(!errBox.hidden&&errBox.textContent.includes('column 1')&&errBox.textContent.includes(XSS),'error shows its column and the typed text as text');
  field.value='sin(x) + 1';field.dispatchEvent(new Event('input'));field.dispatchEvent(new Event('change'));
  check(th.getState().f==='sin(x) + 1'&&errBox.hidden,'valid text commits');
  check(await until(()=>payload().f==='sin(x) + 1'),'text travels in the hash');
  const savedHash=location.hash;location.hash='engine-api-text/text-b';
  check(await until(()=>th.getState().seed==='text-b')&&th.getState().f==='x*2','a bare seed link uses the default');
  location.hash=savedHash;check(await until(()=>th.getState().seed==='text-a')&&th.getState().f==='sin(x) + 1'&&field.value==='sin(x) + 1','text survives a reload from the hash');
  let bad=0;for(const value of [XSS,'constructor','__proto__','x'.repeat(65),42,null,{toString:null},['x']]){
   const seed='text-bad-'+bad++;location.hash='engine-api-text/'+seed+'/'+b64({v:4,f:value});
   check(await until(()=>th.getState().seed===seed)&&th.getState().f==='x*2','a bad value in a link falls back to the default: '+JSON.stringify(value));
  }
  check(!document.querySelector('img[src="x"]')&&!alerted,'typed markup never becomes markup');
  // The real modules: Flow Field's custom field and Attractors' custom ODE.
  const shown=()=>[...document.querySelectorAll('canvas')].find(c=>c.offsetParent!==null&&c.width>0);
  location.hash='flow/formula-check/'+b64({v:4,fieldMode:'custom',fieldU:'-y',fieldV:'x',animate:false});
  check(await until(()=>Studio.getRecipe()?.seed==='formula-check'&&document.getElementById('status').textContent.includes('user-defined, not validated')),'flow custom field status');
  const before=shown().toDataURL(),flowU=document.getElementById('p-flow-fieldU');
  flowU.value=XSS;flowU.dispatchEvent(new Event('input'));flowU.dispatchEvent(new Event('change'));
  check(Studio.getRecipe().fieldU==='-y'&&document.getElementById('p-flow-fieldU-error').textContent.includes(XSS),'flow keeps its last valid field and shows the text');
  flowU.value='sin(3*y)';flowU.dispatchEvent(new Event('input'));flowU.dispatchEvent(new Event('change'));
  check(await until(()=>shown().toDataURL()!==before),'a typed field changes the flow plate');
  check(await until(()=>payload().fieldU==='sin(3*y)'),'flow field travels in the hash');
  location.hash='attractors/ode-diverge/'+b64({v:4,system:'custom',odeX:'x*x + 1',odeY:'0',odeZ:'0',points:500000});
  check(await until(()=>/diverged during burn-in.*stopped/.test(document.getElementById('status').textContent)),'custom ODE divergence guard stops and says so');
  location.hash='attractors/ode-lorenz/'+b64({v:4,system:'custom',a:10,b:28,c:2.667,dt:0.002,points:500000});
  check(await until(()=>Studio.getRecipe()?.seed==='ode-lorenz'&&document.getElementById('status').textContent.includes('user-defined, not validated')),'custom ODE status');
  // Turing's custom reaction: labeled user-defined, its step held under the ceiling measured from the field,
  // an out-of-range constant refused, and a reaction that runs away stopped with the reason on the status line.
  const tst=()=>document.getElementById('status').textContent;
  location.hash='turing/react-check/'+b64({v:5,tmodel:'custom',grid:128,warmup:100,running:false});
  check(await until(()=>tst().includes('seed react-check')&&/step 100\s*paused/.test(tst())&&tst().includes('user-defined, not validated')&&/clamped to 0\.8 × 2\/\(λD \+ ρJ\)/.test(tst()),20000),'custom reaction status and step ceiling');
  { const badge=document.getElementById('btn-science-report'), prov=Studio.getProvenance();
    check(/Unvalidated/.test(badge.textContent)&&prov.technique.validation==='unvalidated'&&prov.technique.tabValidation==='validated within stated limits'&&/Custom reaction/.test(prov.technique.validationNote||''),'custom reaction lowers the stage badge and the provenance to unvalidated'); }
  check(Studio.getRecipe().reactF===undefined&&!/λ ≈/.test(tst()),'default formulas stay out of the hash and no theory is printed');
  const reactF=document.getElementById('p-turing-reactF');
  reactF.value='u*1e39';reactF.dispatchEvent(new Event('input'));reactF.dispatchEvent(new Event('change'));
  check(document.getElementById('p-turing-reactF-error').textContent.includes('out of range')&&Studio.getRecipe().reactF===undefined,'a constant the GPU cannot hold is refused');
  location.hash='turing/react-blowup/'+b64({v:5,tmodel:'custom',reactF:'u^2 + 1',reactG:'0',grid:128,warmup:600,running:false});
  check(await until(()=>tst().includes('seed react-blowup')&&/stopped at step [0-9,]+: the field was found non-finite/.test(tst())&&tst().includes('no uniform state found'),20000),'custom reaction stops on a non-finite field and says so');
  location.hash='turing/react-builtin/'+b64({v:5,tmodel:'schnak',grid:128,warmup:20,running:false});
  check(await until(()=>tst().includes('seed react-builtin')&&/Validated/.test(document.getElementById('btn-science-report').textContent)&&Studio.getProvenance().technique.validation==='validated within stated limits'&&Studio.getProvenance().technique.validationNote===null,20000),'a built-in reaction keeps the tab status on the badge and in the provenance');
  check(!document.querySelector('img[src="x"]')&&!alerted,'no markup from typed text in the real modules');
  return {random,rejects};
 });
 assert.deepEqual(result.random,[0.10264166654087603,0.16780790057964623,0.01322162221185863,0.9560382873751223,0.4078847263008356,0.011301704216748476]);
 assert.equal(result.rejects,6);console.log('ENGINE API OK: '+JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
