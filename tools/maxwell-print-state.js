// Read-only test hooks around actual Maxwell instances; this is print preservation, not PDE validation.
// Setup: Playwright + Chromium per BUILDING.md. Run: node tools/maxwell-print-state.js
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..');let source=fs.readFileSync(path.join(root,'src/modules/maxwell.js'),'utf8');
  const marker='      fieldCells()';assert.equal(source.split(marker).length,2);
  source=source.replace(marker,`      auditAdvance(n) { stop();step(n);measure();render(); },
      auditSnapshot() {
        const fields={};
        for(const [name,target] of [['current',field.read],['previous',field.write]]) {
          const values=new Float32Array(gw*gh*4);gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);
          gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,values);if(gl.getError()!==gl.NO_ERROR)throw Error('Readback failed');fields[name]=values;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        return {fields,metadata:{gw,gh,dt,stepCount,simTime,scale,pending,raf,timer},settings:JSON.stringify(host.getState())};
      },
${marker}`);
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const rows=[];
  try {
    for(const spec of [{grid:128,aspect:'1:1',width:2400,height:2400},{grid:256,aspect:'4:5',width:2400,height:3000}]){
      const page=await browser.newPage();
      try {
        await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound/maxwell-print');await page.evaluate(source);
        rows.push(await page.evaluate(async spec=>{
          const mod=Studio.modules.maxwell,pal=Studio.PALETTES[mod.defaultPalette],state={...mod.defaults,...spec,warmup:0,running:false,palette:pal.colors,bg:pal.bg};mod.sanitize(state);
          const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
          const instance=mod.create({canvas,getState:()=>state,setStatus(){},isActive:()=>false,reducedMotion:()=>true,requestRepaint(){},fault(message){throw Error(message);}});
          instance.regenerate();instance.pause();
          const expected=[spec.grid,Math.round(spec.grid*(spec.aspect==='1:1'?1:1.25))];
          if(JSON.stringify(instance.fieldCells())!==JSON.stringify(expected))throw Error('Grid dimensions changed');
          function compare(a,b){
            let changed=0,nonfinite=0,words=0;
            for(const key of ['current','previous']){
              if(a.fields[key].length!==b.fields[key].length)throw Error('Field size changed');
              const x=new Uint32Array(a.fields[key].buffer),y=new Uint32Array(b.fields[key].buffer);
              for(let i=0;i<x.length;i++){if(x[i]!==y[i])changed++;if(!Number.isFinite(a.fields[key][i])||!Number.isFinite(b.fields[key][i]))nonfinite++;}words+=x.length;
            }
            for(const value of [...Object.values(a.metadata),...Object.values(b.metadata)])if(!Number.isFinite(value))nonfinite++;
            return {changedWords:changed,nonfinite,words,metadataChanged:JSON.stringify(a.metadata)!==JSON.stringify(b.metadata),settingsChanged:a.settings!==b.settings};
          }
          const accept=r=>r.width===spec.width&&r.height===spec.height&&r.bytes>1000&&r.state.changedWords===0&&r.state.nonfinite===0&&!r.state.metadataChanged&&!r.state.settingsChanged;
          const initial=instance.auditSnapshot(),exports=[];
          for(const steps of [0,32]){
            if(steps)instance.auditAdvance(steps);
            for(const view of ['electric','intensity','material']){
              state.view=view;const before=instance.auditSnapshot(),blob=await instance.exportPNG(spec.width,spec.height),bitmap=await createImageBitmap(blob);
              const result={steps,view,time:before.metadata.simTime,width:bitmap.width,height:bitmap.height,bytes:blob.size,state:compare(before,instance.auditSnapshot())};bitmap.close();
              if(!accept(result))throw Error('Print changed Maxwell state: '+JSON.stringify(result));exports.push(result);
            }
          }
          if(compare(initial,instance.auditSnapshot()).changedWords===0)throw Error('Evolved fixture did not evolve');
          const before=instance.auditSnapshot(),blob=await instance.exportPNG(spec.width,spec.height);instance.auditAdvance(1);
          const bitmap=await createImageBitmap(blob),bad={width:bitmap.width,height:bitmap.height,bytes:blob.size,state:compare(before,instance.auditSnapshot())};bitmap.close();instance.pause();
          if(accept(bad)||bad.state.changedWords===0)throw Error('Mutating-export control escaped');
          return {cells:expected,precision:'rgba32f',exports,failureControl:{description:'Actual solver advances one step after export',rejected:!accept(bad),changedWords:bad.state.changedWords}};
        },spec));
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({scope:'Actual Maxwell exportPNG at 2400x2400 and 2400x3000, initial and 32-step paused states, all three views; exact float32 preservation of both field buffers including epsilon and all counters/settings.',rows,limitations:'State preservation and dimensions only, not physical accuracy or calibrated color. Two grids and aspects, one seed/material parameter set, one float32 renderer; high-grid rendering and arbitrary running exports are not covered.'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
