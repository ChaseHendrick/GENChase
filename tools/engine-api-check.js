'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage();await page.goto('file://'+path.resolve(__dirname,'../dist/studio.html')+'#three-vortex-bound/api-baseline');
 await page.waitForFunction(()=>Studio.ready);await page.evaluate(()=>Studio.ready);
 const result=await page.evaluate(async()=>{
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  check(Studio.apiVersion===1&&Studio.recipeVersion===2,'versions');
  check(Object.getOwnPropertyDescriptor(Studio,'apiVersion').writable===false,'immutable version');
  check(Studio.getWitness()===null,'legacy is unknown');
  for(const id of ['missing','__proto__','constructor','toString'])check(Studio.getRecipe(id)===null&&Studio.getWitness(id)===null,'unknown module lookup '+id);
  const recipe=Studio.getRecipe();check(recipe.v===2&&recipe.seed==='api-baseline','versioned recipe');recipe.seed='mutated';check(Studio.getRecipe().seed==='api-baseline','recipe clone');
  const rng=Studio.util.makeRng('engine-api-v1'),random=Array.from({length:6},()=>rng());
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
  return {random,rejects};
 });
 assert.deepEqual(result.random,[0.10264166654087603,0.16780790057964623,0.01322162221185863,0.9560382873751223,0.4078847263008356,0.011301704216748476]);
 assert.equal(result.rejects,6);console.log('ENGINE API OK: '+JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
