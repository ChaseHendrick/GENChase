'use strict';
// Warm-up presentation and batching regression, not a numerical validation claim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const source=fs.readFileSync(path.join(root,'src/modules/bec.js'),'utf8');
 const marker='        fieldCells() {';
 assert.equal(source.split(marker).length,2);
 const exposed=source.replace(marker,`        _snapshot(){const a=new Float32Array(gw*gh*4);gl.bindFramebuffer(gl.FRAMEBUFFER,P.read.fbo);gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,a);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {a,step:stepCount};},\n`+marker);
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage();await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound');
  const result=await page.evaluate(async source=>{
   const saved=Studio.register;let def;Studio.register=m=>{def=m;};
   async function run(code){
    try{(0,eval)(code);}finally{Studio.register=saved;}
    const s={...def.defaults,grid:192,warmup:512,running:false,view:'both',seed:'bec-batch-check',palette:['#132840','#ffd166'],bg:'#080c12'};
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    let status='';const instance=def.create({canvas,getState:()=>s,setStatus:x=>{status=x;},isActive:()=>true,reducedMotion:()=>false,fault:m=>{throw Error(m);}});
    instance.regenerate();
    const pic=document.createElement('canvas');pic.width=256;pic.height=256;const ctx=pic.getContext('2d');ctx.drawImage(canvas,0,0);
    const data=ctx.getImageData(0,0,256,256).data;let low=255,high=0;for(let i=0;i<data.length;i+=4){const v=(data[i]+data[i+1]+data[i+2])/3;low=Math.min(low,v);high=Math.max(high,v);}
    const start=performance.now();while(!status.includes('paused')){if(performance.now()-start>60000)throw Error('Warmup timeout: '+status);await new Promise(r=>setTimeout(r,20));}
    instance.pause();return {snapshot:instance._snapshot(),range:high-low};
   }
   const small=await run(source);Studio.register=m=>{def=m;};const large=await run(source.replace('Math.min(8, batchLeft)','Math.min(400, batchLeft)'));
   let maxDifference=0;for(let i=0;i<small.snapshot.a.length;i++){if(!Number.isFinite(small.snapshot.a[i])||!Number.isFinite(large.snapshot.a[i]))throw Error('Nonfinite field');maxDifference=Math.max(maxDifference,Math.abs(small.snapshot.a[i]-large.snapshot.a[i]));}
   return {steps:[small.snapshot.step,large.snapshot.step],initialPreviewRange:small.range,maxDifference};
  },exposed);
  assert.deepEqual(result.steps,[512,512]);assert.equal(result.maxDifference,0);assert(result.initialPreviewRange>20);
  console.log('BEC PREVIEW OK: '+JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
