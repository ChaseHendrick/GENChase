// Real engine observations plus deliberately failing fixtures. No result enters the repository.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {harvest}=require('../apps/validate/harvest');
const root=path.resolve(__dirname,'..');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-harvest-browser-'));
 try {
  const {plate}=require('../apps/validate/contribute');
  for (const n of [2,3,4,5]) {
    const results=await plate(n,'candidate-regression');
    assert.deepEqual(results.map(r=>r.witness.valid),[true,false]);
    assert(results.every(r=>r.parameters.n===n));
  }
  console.log('PASS seeded candidate plates at orders 2 through 5, default elision and Broken controls');
  const baseline=await harvest({root,selected:['reuleaux','three-vortex-bound'],dwellMs:100,machineSlug:'fixture-machine',outputRoot:path.join(temp,'baseline'),jobDir:path.join(temp,'baseline-job')});
  assert.equal(baseline.exitCode,0,JSON.stringify(baseline.corpus.entries));
  assert.equal(baseline.report.counts.observed,2);assert.equal(baseline.corpus.hardware.machineSlug,'fixture-machine');
  for(const entry of baseline.corpus.entries){assert.equal(entry.recipe.id,entry.id);assert(entry.recipeHash.startsWith('#'+entry.id+'/'));assert.notEqual(entry.status,'runtime failure');for(const n of entry.numbers)assert.equal(entry.statusText.slice(n.offset,n.offset+n.token.length),n.token);}
  assert(baseline.report.browserVersions.chromium);assert.match(baseline.corpus.hardware.command,/--machine fixture-machine --dwell 100/);
  console.log('PASS actual Reuleaux and three-vortex modules preserve recipe IDs and numerical text');
  const gpu=await harvest({root,selected:['life','cahn','maxwell'],dwellMs:100,machineSlug:'fixture-machine',outputRoot:path.join(temp,'gpu'),jobDir:path.join(temp,'gpu-job')});
  assert.equal(gpu.corpus.graphics.webgl2,true,'real WebGL2 context is required');
  assert.equal(gpu.corpus.graphics.float32,true,'float32 targets are available');
  assert(gpu.corpus.hardware.webglRenderer,'actual renderer is recorded');
  assert.equal(gpu.exitCode,0,JSON.stringify(gpu.corpus.entries));
  console.log('PASS real GPU-dependent Life, Cahn-Hilliard and Maxwell observations with explicit renderer provenance');
  const fixture=path.join(temp,'fixture');fs.mkdirSync(path.join(fixture,'dist'),{recursive:true});
  fs.copyFileSync(path.join(root,'techniques.json'),path.join(fixture,'techniques.json'));
  const diagnosticError=fixture+'/private-result.json volunteer@example.com 192.168.1.8';
  const injection=`<script>Studio.ready=Promise.resolve(Studio.ready).then(()=>{const id=Studio.getRecipe().id;if(id==='reuleaux'){Studio.getWitness=()=>({valid:false,measured:2.25,expected:1,tol:0.01,missWhen:'controlled witness mismatch'});document.querySelector('#status').textContent='measured 2.25; expected 1; tolerance 0.01';}else{setTimeout(()=>{throw Error(${JSON.stringify(diagnosticError)})},0);}});</script>`;
  fs.writeFileSync(path.join(fixture,'dist/studio.html'),fs.readFileSync(path.join(root,'dist/studio.html'),'utf8')+injection);
  cp.execFileSync('git',['init','-q'],{cwd:fixture});cp.execFileSync('git',['add','.'],{cwd:fixture});cp.execFileSync('git',['-c','user.name=Chaos','-c','user.email=326338179+SharpMeow@users.noreply.github.com','commit','-qm','Create controlled harvest fixture.'],{cwd:fixture});
  const output=path.join(temp,'failures'),job=path.join(temp,'failure-job');
  const failed=await harvest({root:fixture,selected:['reuleaux','three-vortex-bound'],dwellMs:100,machineSlug:'fixture-machine',outputRoot:output,jobDir:job});
  assert.equal(failed.exitCode,1);assert.equal(failed.report.counts.misses,2);
  assert.equal(failed.corpus.entries[0].status,'witness miss');assert.equal(failed.corpus.entries[1].status,'runtime failure');
  const measured=JSON.parse(fs.readFileSync(path.join(job,'miss-reuleaux.json'),'utf8'));
  assert.deepEqual(Object.keys(measured).sort(),['schemaVersion','commit','kind','id','recipeHash','expected','got','tolerance','witness','command','hardwareCard','status','reason','scope'].sort());
  assert.equal(measured.expected,1);assert.equal(measured.got,2.25);assert.equal(measured.tolerance,.01);assert.equal(measured.hardwareCard.machineSlug,'fixture-machine');
  for(const file of ['witnesses.json','harvest-report.json','miss-three-vortex-bound.json']) {const content=fs.readFileSync(path.join(job,file),'utf8');assert(!content.includes(fixture));assert(!content.includes('volunteer@example.com'));assert(!content.includes('192.168.1.8'));}
  for(const miss of failed.report.misses)assert(fs.existsSync(path.join(output,miss.file)));
  console.log('PASS controlled witness and runtime misses, precise values, privacy and first-class artifacts');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
