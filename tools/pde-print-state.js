// Export real PDE instances at 8 x 8 inches, 300 ppi; verify exact state preservation.
// Test-only instrumentation reads the actual solver textures. It never changes production code.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');
 let source=fs.readFileSync(path.join(root,'src/modules/pde.js'),'utf8');
 const marker='        fieldCells()';
 assert(source.includes(marker));
 source=source.replace(marker,`        auditSnapshot() {
          if (texType !== 'rgba32f') throw Error('Print-state benchmark requires float32');
          const pixels = new Float32Array(gw*gh*4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, C.read.fbo);
          gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,pixels);
          if(gl.getError()!==gl.NO_ERROR) throw Error('Readback failed');
          return pixels;
        },
${marker}`);
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const rows=[];
 try {
  for(const id of ['cahn','ohta','amb','swift','ks','pfc']){
   const page=await browser.newPage();
   try {
    await page.goto('file://'+path.join(root,'studio.html')+'#three-vortex-bound/print-state');
    await page.evaluate(source);
    rows.push(await page.evaluate(async id=>{
      const mod=Studio.modules[id], pal=Studio.PALETTES[mod.defaultPalette];
      const state={...mod.defaults,grid:512,warmup:0,running:false,palette:pal.colors,bg:pal.bg,noise:0};
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
      const instance=mod.create({canvas,getState:()=>state,setStatus(){},isActive:()=>false,reducedMotion:()=>true,requestRepaint(){},fault(msg){throw Error(msg);}});
      instance.regenerate();instance.pause();
      const before=instance.auditSnapshot(), cells=instance.fieldCells();
      const blob=await instance.exportPNG(2400,2400);
      const image=await createImageBitmap(blob);
      const after=instance.auditSnapshot();
      let changes=0,nonfinite=0;
      for(let i=0;i<before.length;i++){if(before[i]!==after[i])changes++;if(!Number.isFinite(before[i])||!Number.isFinite(after[i]))nonfinite++;}
      const result={id,cells,width:image.width,height:image.height,bytes:blob.size,changes,nonfinite};
      image.close();instance.pause();return result;
    },id));
   } finally {await page.close();}
  }
 } finally {await browser.close();}
 for(const r of rows){assert.equal(r.width,2400);assert.equal(r.height,2400);assert.equal(r.changes,0);assert.equal(r.nonfinite,0);assert.deepEqual(r.cells,[512,512]);assert(r.bytes>1000);}
 console.log(JSON.stringify({scope:'Paused initial 512x512 float32 fields exported through each real module exportPNG to 2400x2400. Checks state preservation and dimensions, not full scientific rendering accuracy.',rows},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
