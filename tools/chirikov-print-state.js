// Real paused preview/reload/PNG checks. Runtime work is observed, never normalized away.
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{glArgs}=require('./lib/gl-args');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/modules/swarm.js'),'utf8');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-chirikov-')),browser=await chromium.launch({args:glArgs()});
 try{
  const studio=process.env.STUDIO?path.resolve(process.env.STUDIO):path.join(root,'dist/studio.html'),code=fs.readFileSync(studio,'utf8');
  assert.ok(code.includes(source),'Browser fixture must contain current maintained Chirikov source');
  const marker='      function tone(s, rgba, W, H) {';assert.equal(code.split(marker).length,2);
  const hook="      window.chirikovState = () => ({dens: new Float32Array(dens), lyap:new Float32Array(lyap), orbitC:new Float32Array(orbitC), count,hits,BW,BH,walkers:walkers.map(w=>({...w}))});\n";
  const file=path.join(dir,'studio.html');fs.writeFileSync(file,code.replace(marker,hook+marker));
  const page=await browser.newPage({viewport:{width:1000,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture={orbits:400,iters:80,burn:12,K:1.2,grain:0,running:false};
  async function load(seed,p={}){
   await page.goto('file://'+file+'#chirikov/'+seed+'/'+Buffer.from(JSON.stringify({...fixture,...p})).toString('base64url'));
   await page.evaluate(()=>Studio.ready);
   return page.evaluate(async()=>{
    const s=chirikovState(),canvas=document.querySelector('#stage canvas:not([hidden])'),px=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('');
    return {density:await digest(s.dens),lyap:await digest(s.lyap),orbit:await digest(s.orbitC),pixels:await digest(px),count:s.count,hits:s.hits,recipe:Studio.getRecipe(),status:document.querySelector('#status').textContent};
   });
  }
  const first=await load('fixed-work'),reloaded=await load('fixed-work');assert.deepEqual(reloaded,first,'Paused same-hash load must replay exact state and pixels');
  const other=await load('other-seed');assert.notEqual(other.pixels,first.pixels);assert.notEqual(other.density,first.density);
  const more=await load('fixed-work',{iters:81});assert.notEqual(more.pixels,first.pixels);assert.equal(more.count,400*81);assert.equal(more.hits,400*(81-12));
  await load('fixed-work');
  const before=await page.evaluate(()=>{window.chirikovBefore=chirikovState();document.querySelector('#btn-export').click();return {count:chirikovBefore.count,hits:chirikovBefore.hits};});
  await page.waitForFunction(()=>!Studio.exportJob&&!document.querySelector('#export-download').hidden);
  const printed=await page.evaluate(async()=>{
   const s=chirikovState(),before=chirikovBefore,blob=await(await fetch(document.querySelector('#export-download').href)).blob(),bmp=await createImageBitmap(blob);
   const out={width:bmp.width,height:bmp.height,bytes:blob.size,count:s.count,hits:s.hits,statePreserved:['dens','lyap','orbitC'].every(k=>s[k].every((v,i)=>Number.isFinite(v)&&v===before[k][i])),walkersPreserved:JSON.stringify(s.walkers)===JSON.stringify(before.walkers)};bmp.close();return out;
  });
  assert.ok(printed.bytes>1000&&printed.width>0&&printed.height>0&&printed.statePreserved&&printed.walkersPreserved);assert.equal(printed.count,before.count);assert.equal(printed.hits,before.hits);
  await page.keyboard.press('Escape');
  // The real iters control rebuilds on change and restores the exact fixed initial state.
  await page.evaluate(()=>{const el=document.querySelector('#p-chirikov-iters');el.value=120;el.dispatchEvent(new Event('change',{bubbles:true}));el.value=80;el.dispatchEvent(new Event('change',{bubbles:true}));});
  const regenerated=await page.evaluate(()=>({count:chirikovState().count,hits:chirikovState().hits,same:chirikovState().dens.every((v,i)=>v===chirikovBefore.dens[i])}));assert.ok(regenerated.same);assert.equal(regenerated.count,first.count);assert.equal(regenerated.hits,first.hits);
  await page.emulateMedia({reducedMotion:'reduce'});const reduced=await load('fixed-work');assert.equal(reduced.pixels,first.pixels);assert.equal(reduced.density,first.density);assert.equal(reduced.count,first.count);
  const zero=await load('zero-kick',{K:0});assert.equal(zero.recipe.K,0);assert.equal(zero.count,32000);
  assert.deepEqual(errors,[]);
  const result={passed:true,source:'src/modules/swarm.js',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),command:'node tools/chirikov-print-state.js --write',scope:'Actual paused UI loads, iters control regeneration and shell PNG. Not an asymptotic chaos or convergence validation.',first,printed,controls:{changedSeed:true,changedWork:true,reducedMotionSame:true,zeroKick:true},limitations:'One Chromium renderer; live accumulation remains elapsed-time dependent and a running recipe is not a trajectory checkpoint.'};
  if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/chirikov-print-state.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
