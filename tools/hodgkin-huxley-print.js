// Actual membrane PNG preservation and cooperative scheduling, using in-memory test hooks only.
// node tools/hodgkin-huxley-print.js > validation/results/hodgkin-huxley-print.json
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),original=fs.readFileSync(path.join(root,'src/modules/hodgkin-huxley.js'),'utf8'),marker='      aspect() { return 2 / 3; }, fieldCells()';assert.equal(original.split(marker).length,2);
  const source=original.replace(marker,`      auditAdvance(n) { stop();sim.advance(n);draw(); },
      auditSnapshot() {
        const arrays={},physical={};
        for(const [key,value]of Object.entries(sim)){if(ArrayBuffer.isView(value))arrays[key]=value.slice();else if(typeof value==='number'||typeof value==='string')physical[key]=value;}
        const gpu=new Float32Array(sim.columns*sim.n*4);gl.bindFramebuffer(gl.FRAMEBUFFER,texture.fbo);
        gl.readPixels(0,0,sim.columns,sim.n,gl.RGBA,gl.FLOAT,gpu);if(gl.getError()!==gl.NO_ERROR)throw Error('History readback failed');gl.bindFramebuffer(gl.FRAMEBUFFER,null);arrays.gpu=gpu;
        return {arrays,physical,events:JSON.stringify(sim.events),settings:JSON.stringify(host.getState()),display:{paused,timer}};
      },
${marker}`);
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),rows=[];
  try{
    for(const spec of [{n:16,duration:30,start:5,pulse:20,width:2400,height:1600},{n:64,duration:100,start:10,pulse:80,width:2400,height:2400}]){
      const page=await browser.newPage();
      try{
        await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound/hh-print');await page.evaluate(source);
        rows.push(await page.evaluate(async spec=>{
          const mod=Studio.modules['hodgkin-huxley'],pal=Studio.PALETTES[mod.defaultPalette],state={...mod.defaults,...spec,palette:pal.colors,bg:pal.bg};mod.sanitize(state);
          const make=settings=>{const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;return mod.create({canvas,getState:()=>settings,setStatus(){},isActive:()=>false,reducedMotion:()=>true,requestRepaint(){},fault(message){throw Error(message);}});};
          const instance=make(state);instance.regenerate();instance.pause();
          const expected=[Math.round(spec.duration*10)+1,spec.n];if(JSON.stringify(instance.fieldCells())!==JSON.stringify(expected))throw Error('Recording dimensions wrong');
          function compare(a,b,physicalOnly=false){let changedBytes=0,nonfinite=0,bytes=0;
            for(const key of Object.keys(a.arrays)){if(physicalOnly&&key==='gpu')continue;const x=new Uint8Array(a.arrays[key].buffer),y=new Uint8Array(b.arrays[key].buffer);if(x.length!==y.length)throw Error('Array size changed');for(let i=0;i<x.length;i++)if(x[i]!==y[i])changedBytes++;for(const value of a.arrays[key])if(!Number.isFinite(value))nonfinite++;for(const value of b.arrays[key])if(!Number.isFinite(value))nonfinite++;bytes+=x.length;}
            for(const obj of [a.physical,b.physical])for(const value of Object.values(obj))if(typeof value==='number'&&!Number.isFinite(value))nonfinite++;
            return {changedBytes,nonfinite,bytes,physicalChanged:JSON.stringify(a.physical)!==JSON.stringify(b.physical),eventsChanged:a.events!==b.events,settingsChanged:!physicalOnly&&a.settings!==b.settings,displayChanged:!physicalOnly&&JSON.stringify(a.display)!==JSON.stringify(b.display)};
          }
          const accept=r=>r.width===spec.width&&r.height===spec.height&&r.bytes>1000&&r.state.changedBytes===0&&r.state.nonfinite===0&&!r.state.physicalChanged&&!r.state.eventsChanged&&!r.state.settingsChanged&&!r.state.displayChanged;
          const exports=[];
          for(const target of [1500,Math.round(state.duration/state.dt)]){
            instance.auditAdvance(target-instance.auditSnapshot().physical.step);
            for(const view of ['voltage','sodium','potassium']){state.view=view;instance.repaint();const before=instance.auditSnapshot(),blob=await instance.exportPNG(spec.width,spec.height),bitmap=await createImageBitmap(blob);const result={view,step:before.physical.step,timeMs:before.physical.time,spikes:before.physical.totalSpikes,width:bitmap.width,height:bitmap.height,bytes:blob.size,state:compare(before,instance.auditSnapshot())};bitmap.close();if(!accept(result))throw Error('Export changed membrane state: '+JSON.stringify(result));exports.push(result);}
          }
          const wrongDimensions={...exports[0],width:spec.width-1};if(accept(wrongDimensions))throw Error('Wrong dimensions escaped');
          instance.regenerate();instance.pause();const before=instance.auditSnapshot(),blob=await instance.exportPNG(spec.width,spec.height);instance.auditAdvance(1);const bitmap=await createImageBitmap(blob),bad={width:bitmap.width,height:bitmap.height,bytes:blob.size,state:compare(before,instance.auditSnapshot())};bitmap.close();if(accept(bad)||!bad.state.changedBytes)throw Error('Mutating-export control escaped');
          const settings={...state,duration:100,start:10,pulse:80},cooperative=make(settings);cooperative.regenerate();await new Promise(resolve=>setTimeout(resolve,8));cooperative.pause();const paused=cooperative.auditSnapshot();if(paused.physical.step<=0||paused.physical.step>=paused.physical.totalSteps)throw Error('Pause did not interrupt recording');await new Promise(resolve=>setTimeout(resolve,20));const pauseCheck=compare(paused,cooperative.auditSnapshot());if(pauseCheck.changedBytes||pauseCheck.physicalChanged)throw Error('Pause did not stop work');
          cooperative.resume();const deadline=performance.now()+20000;while(cooperative.auditSnapshot().physical.step<paused.physical.totalSteps&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));cooperative.pause();const completed=cooperative.auditSnapshot();if(completed.physical.step!==completed.physical.totalSteps||completed.physical.halted)throw Error('Cooperative recording incomplete');
          const direct=make(settings);direct.regenerate();direct.pause();direct.auditAdvance(completed.physical.totalSteps);const schedule=compare(direct.auditSnapshot(),completed,true);if(schedule.changedBytes||schedule.nonfinite||schedule.physicalChanged||schedule.eventsChanged)throw Error('Scheduling changed recording');
          return {membranes:spec.n,recordingCells:expected,exports,scheduling:{steps:completed.physical.totalSteps,pausedAtStep:paused.physical.step,comparison:schedule},failureControls:{wrongDimensionsRejected:!accept(wrongDimensions),mutatingExportRejected:!accept(bad),changedBytes:bad.state.changedBytes}};
        },spec));
      }finally{await page.close();}
    }
  }finally{await browser.close();}
  const hash=v=>crypto.createHash('sha256').update(v).digest('hex');console.log(JSON.stringify({sourceSha256:hash(original),harnessSha256:hash(fs.readFileSync(__filename)),command:'node tools/hodgkin-huxley-print.js > validation/results/hodgkin-huxley-print.json',scope:'12 actual PNG exports at 2400x1600 and padded 2400x2400, all three views, 15ms intermediate and complete recordings. Exact preservation of Float64 voltages/gates/currents/work arrays, Float32 CPU/GPU histories, counters, spike events and settings. Interrupted cooperative recordings agree exactly with fixed-step evolution.',rows,limitations:'State/dimension and scheduler checks are not calibrated-color, physical-experiment or general parameter validation. Two counts, one renderer and paused exports only; high-count browser performance is not certified.'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
