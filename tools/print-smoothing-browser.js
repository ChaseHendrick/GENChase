'use strict';
const { glArgs } = require('./lib/gl-args');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
(async()=>{
 const name=process.env.BROWSER||'chromium';
 const browser=await ({chromium,webkit}[name]).launch(name==='chromium'?{args:glArgs()}:{});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.message);});
  const install=async()=>{
   await page.evaluate(()=>{
    Studio.register({id:'smoothing-fixture',name:'Print smoothing fixture',defaults:{seed:'smoothing',bg:'#ffffff'},schema:[],palette:false,
     create(host){
      const draw=c=>{const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#000';for(let i=0;i<16;i++)x.fillRect(Math.round(i*c.width/16),Math.round(i*c.height/16),c.width,Math.ceil(c.height/16));};
      return {aspect:()=>1,regenerate(){draw(host.canvas);host.setWitness({measured:1,expected:1,tol:0,missWhen:'fixture only'});},resize(){draw(host.canvas);},pause(){},fieldCells:()=>[16,16],
       exportPNG:async(w,h)=>{if(window.failPrint)throw Error('Deliberate export failure');const c=document.createElement('canvas');c.width=w;c.height=h;draw(c);return Studio.util.toBlob(c);},
       exportSVG:()=>window.vectorPrint?'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="white"/><path d="M0 0L300 300H0Z" fill="black"/></svg>':null};
     }});
    if(location.hash==='#smoothing-fixture/smoothing')window.dispatchEvent(new HashChangeEvent('hashchange'));
    else location.hash='smoothing-fixture/smoothing';
   });
   await page.waitForFunction(()=>Studio.getRecipe()?.id==='smoothing-fixture'&&Studio.getWitness()?.valid===true);
  };
  await page.goto('file://'+path.resolve(__dirname,'../dist/studio.html')+'#three-vortex-bound/smoothing');await page.evaluate(()=>Studio.ready);await install();
  assert.equal(await page.locator('#print-smoothing').inputValue(),'off');
  const original=await page.evaluate(()=>({recipe:Studio.getRecipe(),witness:Studio.getWitness()}));
  await page.selectOption('#export-inches','custom');await page.fill('#export-width','2');await page.fill('#export-height','2');await page.locator('#export-height').press('Tab');
  await page.click('#btn-colophon-edit');await page.check('#colo-enabled');await page.click('#colo-close');
  const done=async()=>{await page.waitForFunction(()=>!Studio.exportJob&&(!document.getElementById('export-img').hidden||document.getElementById('export-note').classList.contains('err'))).catch(async err=>{console.error(await page.locator('#export-note').textContent(),errors);throw err;});assert.equal(await page.locator('#export-img').isVisible(),true,await page.locator('#export-note').innerText());};
  const snapshot=()=>page.evaluate(async()=>{
   const im=document.getElementById('export-img');await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const cx=c.getContext('2d');cx.drawImage(im,0,0);
   const data=cx.getImageData(0,0,c.width,c.height).data;let intermediate=0;
   for(let y=Math.round(c.height*.2);y<c.height*.5;y++)for(let x=Math.round(c.width*.2);x<c.width*.5;x++){const v=data[(y*c.width+x)*4];if(v>5&&v<250)intermediate++;}
   return {w:c.width,h:c.height,intermediate,caption:[...data.slice(Math.round(c.height*.85)*c.width*4)],url:c.toDataURL(),report:JSON.parse(document.getElementById('export-quality').dataset.report)};
  });
  await page.click('#btn-export');await done();const off=await snapshot();assert.equal(off.w,600);assert.equal(off.h,600);
  await page.selectOption('#export-smoothing','gentle');await done();const gentle=await snapshot();
  assert(gentle.intermediate>off.intermediate,'hard raster steps gain intermediate edge colors');assert.equal(gentle.report.smoothing.applied,true);
  assert(new Set(off.caption).size>5,'caption comparison includes printed text');
  assert.deepEqual(gentle.caption,off.caption,'caption pixels remain identical');
  assert.match(await page.locator('#export-download').getAttribute('download'),/-smooth-gentle/);
  assert.deepEqual(await page.evaluate(()=>({recipe:Studio.getRecipe(),witness:Studio.getWitness()})),original,'solver recipe and witness unchanged');
  const pending=page.waitForEvent('download');await page.click('#export-job-json');const dl=await pending;
  const record=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));assert.equal(record.quality.smoothing.requested,'gentle');assert.equal(record.quality.scientificValidation,false);
  await page.selectOption('#export-smoothing','off');await done();assert.equal((await snapshot()).url,off.url,'turning smoothing off restores exact original pixels');
  await page.selectOption('#export-smoothing','soft');await done();assert((await snapshot()).intermediate>gentle.intermediate,'stronger smoothing widens softened edge');
  await page.click('#export-colo-edit');await page.fill('#printer-preset-name','Smooth proof');await page.click('#printer-preset-save');
  await page.selectOption('#print-smoothing','off');await page.click('#printer-preset-load');assert.equal(await page.locator('#print-smoothing').inputValue(),'soft');
  await page.reload();await page.evaluate(()=>Studio.ready);await install();assert.equal(await page.locator('#print-smoothing').inputValue(),'soft','choice persists');
  await page.evaluate(()=>{
   const key='genchase.v1.printerPresets',saved=JSON.parse(localStorage.getItem(key));delete saved[0].smoothing;localStorage.setItem(key,JSON.stringify(saved));
  });
  await page.reload();await page.evaluate(()=>Studio.ready);await install();await page.click('#btn-colophon-edit');await page.click('#printer-preset-load');
  assert.equal(await page.locator('#print-smoothing').inputValue(),'off','older presets keep their original unsmoothed output');await page.click('#colo-close');
  await page.evaluate(()=>{window.vectorPrint=true;});await page.click('#btn-export');await done();const vector=await snapshot();
  await page.selectOption('#export-smoothing','soft');await done();const vectorSmooth=await snapshot();assert.equal(vectorSmooth.url,vector.url);assert.equal(vectorSmooth.report.smoothing.applied,false);
  assert.equal(await page.locator('#export-svg').isVisible(),true);
  await page.evaluate(()=>{window.vectorPrint=false;window.failPrint=true;});await page.selectOption('#export-smoothing','gentle');
  await page.waitForFunction(()=>!Studio.exportJob&&document.getElementById('export-note').classList.contains('err'));
  assert.equal(await page.locator('#export-smoothing').isDisabled(),false,'controls unlock after failure');assert.equal(await page.locator('#export-download').isVisible(),false,'failed render has no stale download');
  await page.evaluate(()=>{
   window.failPrint=false;const smooth=GenChasePrintSmoothing.smooth;
   GenChasePrintSmoothing.smooth=async(blob,plan,job)=>{const progress=job.progress;job.progress=function(text){progress.call(this,text);document.getElementById('export-cancel').click();};try{return await smooth(blob,plan,job);}finally{GenChasePrintSmoothing.smooth=smooth;}};
  });
  await page.selectOption('#export-smoothing','soft');await page.waitForFunction(()=>!Studio.exportJob&&document.getElementById('export-note').textContent==='Cancelled.');
  assert.equal(await page.locator('#export-smoothing').isDisabled(),false);assert.equal(await page.locator('#export-download').isVisible(),false);
  await page.selectOption('#export-smoothing','off');await done();assert.deepEqual(errors,[]);
  console.log('PASS',name,'raster edge pixels, crisp caption, recipe/witness preservation, vector bypass, exact off restoration, preferences, old presets, report, failure and cancel recovery.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
