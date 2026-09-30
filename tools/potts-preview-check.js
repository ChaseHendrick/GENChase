'use strict';
// Actual-browser comparison against a supplied pre-change Potts source. All instrumentation
// and the deliberately corrupting negative control live only in temporary HTML copies.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const {glArgs}=require('./lib/gl-args');
const root=path.resolve(__dirname,'..'),before=process.argv[2];
if(!before)throw Error('usage: node tools/potts-preview-check.js <pre-change-potts.js> [--baseline-has-preview]');
const baselineHasPreview=process.argv.includes('--baseline-has-preview');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const baseline=fs.readFileSync(before,'utf8'),fixed=fs.readFileSync(path.join(root,'src/modules/potts.js'),'utf8');
const studio=fs.readFileSync(process.env.STUDIO||path.join(root,'dist/studio.html'),'utf8');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-potts-preview-'));
function instrument(source){
 const at='      function stop() { clearTimeout(timer); }';assert(source.includes(at));
 return source.replace(at,`      window.__pottsProgress = () => ({ building, sweepNo });
      window.__pottsSnapshot = () => ({ labels: Array.from(lab), areas: Array.from(area), sides: Array.from(sides),
        markedAreas: Array.from(areaAt), target, nLab, sweepNo, aliveCount, meanSides, mullins });
`+at);
}
function html(name,source){
 const begin=studio.indexOf('<script>\n/* modules/potts.js */'),end=studio.indexOf('</script>',begin);assert(begin>=0&&end>begin);
 const file=path.join(directory,name+'.html');fs.writeFileSync(file,studio.slice(0,begin)+'<script>\n'+instrument(source)+'\n'+studio.slice(end));return file;
}
(async()=>{
 const browser=await chromium.launch({args:glArgs()});const rows=[];
 try{
  const corrupt=fixed.replace('function render() { paint(ctx, canvas.width, canvas.height); }','function render() { if (lab) lab[0] = (lab[0] + 1) % nLab; paint(ctx, canvas.width, canvas.height); }');assert.notEqual(corrupt,fixed);
  for(const [name,source] of [['before',baseline],['fixed',fixed],['corrupt-control',corrupt]]){
   const page=await browser.newPage({viewport:{width:1400,height:900},reducedMotion:'no-preference'});
   try{
    await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('genchase.v1.timeline','0');});
    await page.goto('file://'+html(name,source)+'#potts/check-potts',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>document.getElementById('seed')?.value==='check-potts'&&window.__pottsProgress,null,{timeout:60000});
    await page.selectOption('#preset','foam');
    await page.waitForFunction(()=>__pottsProgress().building&&__pottsProgress().sweepNo>0,null,{timeout:12000});
    // A real viewport resize clears the canvas. The old module refuses to repaint until
    // completion; the corrected module draws the available partial state.
    await page.setViewportSize({width:1460,height:1000});await page.waitForTimeout(350);
    const partial=await page.evaluate(()=>{
     const canvas=[...document.querySelectorAll('canvas.art')].find(c=>c.offsetParent!==null);const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
     let min=255,max=0;for(let i=0;i<data.length;i+=4){const value=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];min=Math.min(min,value);max=Math.max(max,value);}
     return {...__pottsProgress(),range:max-min,status:document.getElementById('status').textContent};
    });
    assert(partial.building&&partial.sweepNo<900,'The partial capture must precede finite completion');assert.match(partial.status,/coarsening/);
    if(name==='before'&&!baselineHasPreview)assert(partial.range<1,'Old-source blank partial-plate control did not reproduce');
    else assert(partial.range>40,'New-source partial plate is blank');
    await page.waitForFunction(()=>!__pottsProgress().building&&__pottsProgress().sweepNo===900,null,{timeout:150000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const final=await page.evaluate(()=>({state:__pottsSnapshot(),canvas:[...document.querySelectorAll('canvas.art')].filter(c=>c.offsetParent!==null).map(c=>[c.width,c.height]),png:[...document.querySelectorAll('canvas.art')].find(c=>c.offsetParent!==null).toDataURL('image/png'),status:document.getElementById('status').textContent}));
    const row={name,partial,canvas:final.canvas,stateSha256:sha(JSON.stringify(final.state)),pixelPngSha256:sha(Buffer.from(final.png.split(',')[1],'base64')),status:final.status};rows.push(row);console.log(JSON.stringify({capture:row}));
   }finally{await page.close();}
  }
  assert.equal(rows[0].stateSha256,rows[1].stateSha256,'Painting changed the finished scientific arrays or fit');
  assert.equal(rows[0].pixelPngSha256,rows[1].pixelPngSha256,'Finished preview pixels changed');
  assert.notEqual(rows[0].stateSha256,rows[2].stateSha256,'Corrupting render control escaped the scientific-state comparison');
  console.log(JSON.stringify({passed:true,previewCadenceMs:150,baselineHasPreview,baselineSourceSha256:sha(baseline),sourceSha256:sha(fixed),rows},null,2));
 }finally{await browser.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
