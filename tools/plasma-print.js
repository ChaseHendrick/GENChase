// Actual module export/state and cooperative scheduling, with test-only read-only source hooks.
// Setup: Playwright + Chromium per BUILDING.md. node tools/plasma-print.js > validation/results/plasma-print.json
const { glArgs } = require('./lib/gl-args');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'), original=fs.readFileSync(path.join(root,'src/modules/plasma.js'),'utf8');
  let source=original;
  const marker='      aspect() { return 1; }, fieldCells()';assert.equal(source.split(marker).length,2);
  source=source.replace('Object.assign(sim, { solve, measure, reference, advance })','Object.assign(sim, { auditBackup: { oldX, oldV }, solve, measure, reference, advance })');
  source=source.replace(marker,`      auditAdvance(n) { stop(); sim.advance(n); draw(); },
      auditSnapshot() {
        const arrays={};
        for(const [key,value] of Object.entries(sim))if(ArrayBuffer.isView(value))arrays[key]=value.slice();
        arrays.oldX=sim.auditBackup.oldX.slice();arrays.oldV=sim.auditBackup.oldV.slice();
        arrays.density=density.slice();arrays.pixels=pixels.slice();
        const gpu=new Float32Array(sim.grid*binsY*4);gl.bindFramebuffer(gl.FRAMEBUFFER,hist.fbo);
        gl.readPixels(0,0,sim.grid,binsY,gl.RGBA,gl.FLOAT,gpu);if(gl.getError()!==gl.NO_ERROR)throw Error('Histogram readback failed');
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);arrays.gpu=gpu;
        const physical={};for(const [key,value] of Object.entries(sim))if(typeof value==='number'||typeof value==='string')physical[key]=value;
        return {arrays,physical,display:{scale,clipped,remaining,pendingLive,paused,raf,timer},settings:JSON.stringify(host.getState())};
      },
${marker}`);
  const browser=await chromium.launch({args:glArgs()});
  const rows=[];
  try{
    for(const spec of [{n:4096,grid:64,width:2400,height:2400},{n:16384,grid:256,width:2400,height:3000}]){
      const page=await browser.newPage();
      try{
        await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound/plasma-print');await page.evaluate(source);
        rows.push(await page.evaluate(async spec=>{
          const mod=Studio.modules.plasma,pal=Studio.PALETTES[mod.defaultPalette],state={...mod.defaults,...spec,warmup:0,running:false,palette:pal.colors,bg:pal.bg};mod.sanitize(state);
          function instanceFor(settings){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;return mod.create({canvas,getState:()=>settings,setStatus(){},isActive:()=>false,reducedMotion:()=>true,requestRepaint(){},fault(message){throw Error(message);}});}
          const instance=instanceFor(state);instance.regenerate();instance.pause();
          const expected=[spec.grid,256];if(JSON.stringify(instance.fieldCells())!==JSON.stringify(expected))throw Error('Histogram grid differs');
          function compare(a,b,physicalOnly=false){
            let changedBytes=0,nonfinite=0,bytes=0;
            for(const key of Object.keys(a.arrays)){
              if(physicalOnly&&['density','pixels','gpu'].includes(key))continue;
              const x=new Uint8Array(a.arrays[key].buffer),y=new Uint8Array(b.arrays[key].buffer);
              if(x.length!==y.length)throw Error('Array size changed');
              for(let i=0;i<x.length;i++)if(x[i]!==y[i])changedBytes++;
              for(const value of a.arrays[key])if(!Number.isFinite(value))nonfinite++;
              for(const value of b.arrays[key])if(!Number.isFinite(value))nonfinite++;
              bytes+=x.length;
            }
            for(const obj of [a.physical,b.physical])for(const value of Object.values(obj))if(typeof value==='number'&&!Number.isFinite(value))nonfinite++;
            return {changedBytes,nonfinite,bytes,physicalChanged:JSON.stringify(a.physical)!==JSON.stringify(b.physical),displayChanged:!physicalOnly&&JSON.stringify(a.display)!==JSON.stringify(b.display),settingsChanged:!physicalOnly&&a.settings!==b.settings};
          }
          const accept=(r,dimensions=spec)=>r.width===dimensions.width&&r.height===dimensions.height&&r.bytes>1000&&r.state.changedBytes===0&&r.state.nonfinite===0&&!r.state.physicalChanged&&!r.state.displayChanged&&!r.state.settingsChanged;
          const initial=instance.auditSnapshot(),exports=[];
          for(const steps of [0,40]){
            if(steps)instance.auditAdvance(steps);
            for(const view of ['density','velocity']){
              state.view=view;instance.repaint();const before=instance.auditSnapshot(),blob=await instance.exportPNG(spec.width,spec.height),bitmap=await createImageBitmap(blob);
              const result={steps,view,time:before.physical.time,width:bitmap.width,height:bitmap.height,bytes:blob.size,state:compare(before,instance.auditSnapshot())};bitmap.close();
              if(!accept(result))throw Error('Export changed plasma state: '+JSON.stringify(result));exports.push(result);
            }
          }
          if(compare(initial,instance.auditSnapshot()).changedBytes===0)throw Error('Evolved fixture did not change');
          const before=instance.auditSnapshot(),blob=await instance.exportPNG(spec.width,spec.height);instance.auditAdvance(1);
          const bitmap=await createImageBitmap(blob),bad={width:bitmap.width,height:bitmap.height,bytes:blob.size,state:compare(before,instance.auditSnapshot())};bitmap.close();
          if(accept(bad)||bad.state.changedBytes===0)throw Error('Mutating export control escaped');
          const dimensionControl={...exports[0],width:exports[0].width-1};if(accept(dimensionControl))throw Error('Wrong dimensions accepted');
          // Let the actual cooperative warmup run, pause/resume midway, and compare with fixed-step evolution.
          const settings={...state,warmup:1600},cooperative=instanceFor(settings);cooperative.regenerate();
          await new Promise(resolve=>setTimeout(resolve,8));cooperative.pause();const pausedState=cooperative.auditSnapshot();
          if(pausedState.physical.step<=0||pausedState.physical.step>=1600)throw Error('Pause fixture did not interrupt warmup');
          await new Promise(resolve=>setTimeout(resolve,20));if(compare(pausedState,cooperative.auditSnapshot()).changedBytes)throw Error('Paused state evolved');
          cooperative.resume();const deadline=performance.now()+15000;
          while(cooperative.auditSnapshot().display.remaining>0&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
          cooperative.pause();const warmed=cooperative.auditSnapshot();if(warmed.physical.step!==1600||warmed.display.remaining!==0)throw Error('Warmup count wrong');
          instance.regenerate();instance.pause();instance.auditAdvance(1600);const schedule=compare(instance.auditSnapshot(),warmed,true);
          if(schedule.changedBytes||schedule.physicalChanged||schedule.nonfinite)throw Error('Scheduling changed solver result');
          return {particles:spec.n,physicalCells:spec.grid,histogramCells:expected,exports,scheduling:{steps:1600,pausedAtStep:pausedState.physical.step,comparison:schedule},failureControls:{mutatingExportRejected:!accept(bad),changedBytes:bad.state.changedBytes,wrongDimensionsRejected:!accept(dimensionControl)}};
        },spec));
      }finally{await page.close();}
    }
  }finally{await browser.close();}
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  console.log(JSON.stringify({sourceSha256:hash(original),harnessSha256:hash(fs.readFileSync(__filename)),command:'node tools/plasma-print.js > validation/results/plasma-print.json',scope:'Eight actual 2400x2400/2400x3000 PNG exports, initial and evolved paused states, density and velocity views. Exact float64 particle/field/backup arrays, histogram CPU/GPU arrays, counters, diagnostics, settings. Cooperative warmup pause/resume agrees byte-for-byte with fixed-step evolution.',rows,limitations:'Preservation and dimensions only; no calibrated color, physical experiments, arbitrary settings, live export races, or high-particle browser performance certificate.'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
