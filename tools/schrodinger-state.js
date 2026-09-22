// Actual-instance regression tests for potential bounds, time levels and hard-wall projection.
// Setup: Playwright + Chromium, as described in BUILDING.md.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');
 let source=fs.readFileSync(path.join(root,'src/modules/wavesflow.js'),'utf8');
 const marker='      exportPNG(w, h) { if (!S)';
 assert.equal(source.split(marker).length,2);
 source=source.replace(marker,`      auditAdvance(n) { rig.stop(); step(n); },
      auditUpload(data) { rig.upload(S.read,data); },
      auditRead() {
        if(rig.texType!=='rgba32f')throw Error('State benchmark requires float32');
        const read=target=>{const data=new Float32Array(gw*gh*4);gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,data);if(gl.getError()!==gl.NO_ERROR)throw Error('Readback failed');return data;};
        return {field:read(S.read),potential:read(potT),gw,gh,simTime,staggerDt,steps:rig.stepCount};
      },
      auditKickArithmetic(p) {
        const marker='outColor = vec4(R, I, c.b, I);';
        if(!SCH_KICK_FS.includes(marker))throw Error('Kick arithmetic probe marker is missing');
        const probe=new G.Pass(gl,SCH_KICK_FS.replace(marker,'outColor = vec4(g, ph, cos(ph), sin(ph));'));
        const target=new G.Target(gl,gw,gh,{type:'rgba32f',filter:'nearest',wrap:'repeat'});
        const s=host.getState(),length=Math.hypot(p.dx,p.dy),kv=length>1e-4?[p.dx/length*s.k,p.dy/length*s.k]:[0,0];
        probe.draw(target,{u_p:S.read,u_pot:potT,u_res:[gw,gh],u_pos:[p.x,p.yGL],u_kv:kv,u_rad:Math.max(3,s.sigma*.6),u_amp:.5});
        const values=new Float32Array(gw*gh*4);
        gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,values);
        if(gl.getError()!==gl.NO_ERROR)throw Error('Kick arithmetic probe readback failed');
        const info=gl.getExtension('WEBGL_debug_renderer_info');
        const backend={userAgent:navigator.userAgent,renderer:gl.getParameter(info?info.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(info?info.UNMASKED_VENDOR_WEBGL:gl.VENDOR),shadingLanguage:gl.getParameter(gl.SHADING_LANGUAGE_VERSION)};
        target.dispose();gl.deleteProgram(probe.prog);
        return {values,backend};
      },
${marker}`);
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const rows=[];
 try{
  for(const fixture of ['well-corrected','well-retired-bound','dt-edit','hard-wall','hard-wall-stationary']){
   const page=await browser.newPage();
   try{
    await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound/schrodinger-state');
    await page.evaluate(source);
    rows.push(await page.evaluate(fixture=>{
     const mod=Studio.modules.schrodinger,pal=Studio.PALETTES[mod.defaultPalette];
     const well=fixture.startsWith('well');
     const state={...mod.defaults,grid:128,aspect:well?'16:9':'1:1',warmup:0,running:false,absorb:0,damp:0,
       kind:well?'well':fixture.startsWith('hard-wall')?'double':'free',V0:well?6:0,px:well?.94:.5,py:well?.94:.15,
       sigma:8,k:.4,ang:20,dt:.2,wallMode:'hard',wallX:.5,thick:8,slitW:5,slitSep:22,
       seed:'wave-state-benchmark',palette:pal.colors,bg:pal.bg};
     mod.sanitize(state);
     const correctedDt=state.dt,oldDt=Math.min(.25,1.6/(4+state.V0));
     if(fixture==='well-retired-bound')state.dt=oldDt;
     const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
     const instance=mod.create({canvas,getState:()=>state,setStatus(){},isActive:()=>false,reducedMotion:()=>true,requestRepaint(){},fault(m){throw Error(m);}});
     instance.regenerate();instance.pause();
     const summary=snapshot=>{
       let max=0,norm=0,potentialMax=0,nonfinite=0,wallMax=0;
       for(let i=0;i<snapshot.field.length;i+=4){
         const [r,g,,a]=snapshot.field.subarray(i,i+4);
         max=Math.max(max,Math.abs(r),Math.abs(g),Math.abs(a));norm+=r*r+g*a;
         potentialMax=Math.max(potentialMax,snapshot.potential[i]);
         nonfinite+=![r,g,a].every(Number.isFinite);
         if(snapshot.potential[i+1]>.5)wallMax=Math.max(wallMax,Math.abs(r),Math.abs(g),Math.abs(a));
       }
       return {max,norm,potentialMax,nonfinite,wallMax,time:snapshot.simTime,steps:snapshot.steps};
     };
     const initial=summary(instance.auditRead());
     if(well){
       const targetTime=oldDt*40,baseDt=state.dt;
       let elapsed=0;
       // An integer number of steps preserves each fixture's fixed staggering and invariant.
       const count=Math.ceil(targetTime/baseDt);state.dt=targetTime/count;instance.live('dt');instance.pause();
       const baseline=summary(instance.auditRead());
       instance.auditAdvance(count);instance.pause();
       const final=summary(instance.auditRead());
       const out={fixture,grid:[128,72],dt:state.dt,correctedDt,oldDt,initial,baseline,final,
         normRelativeDrift:Math.abs(final.norm/baseline.norm-1),growth:final.max/initial.max};
       return out;
     }
     if(fixture==='dt-edit'){
       const snap=instance.auditRead(),data=new Float32Array(snap.field.length),oldStep=state.dt;
       for(let y=0;y<snap.gh;y++)for(let x=0;x<snap.gw;x++){
         const i=4*(y*snap.gw+x),R=(x+y)%2?1:-1;
         data[i]=R;data[i+1]=-2*oldStep*R;data[i+2]=.7;data[i+3]=2*oldStep*R;
       }
       instance.auditUpload(data);state.dt=.05;instance.live('dt');instance.pause();
       const after=instance.auditRead();let error=0,detectorChanges=0;
       for(let i=0;i<data.length;i+=4){
         error=Math.max(error,Math.abs(after.field[i]-data[i]),Math.abs(after.field[i+1]+.1*data[i]),Math.abs(after.field[i+3]-.1*data[i]));
         if(after.field[i+2]!==data[i+2])detectorChanges++;
       }
       // The prior behavior would retain Iplus=-.4R and reconstruct a spurious -.3R center.
       const omittedRestaggerError=Math.abs(-2*oldStep+2*state.dt);
       return {fixture,error,detectorChanges,time:after.simTime,steps:after.steps,staggerDt:after.staggerDt,omittedRestaggerError};
     }
     const stationary=fixture==='hard-wall-stationary';
     const before=instance.auditRead(),position={x:.5,yGL:.15,dx:stationary?0:.02,dy:stationary?0:.01};
     instance.disturb(position);instance.pause();const after=instance.auditRead();
     let kickError=0,rawKickWallAmplitude=0,worst=null;
     const length=Math.hypot(position.dx,position.dy),kx=length?position.dx/length*state.k:0,ky=length?position.dy/length*state.k:0,radius=Math.max(3,state.sigma*.6);
     for(let y=0;y<before.gh;y++)for(let x=0;x<before.gw;x++){
       const i=4*(y*before.gw+x),dx=x+.5-position.x*before.gw,dy=y+.5-position.yGL*before.gh;
       const g=.5*Math.exp(-(dx*dx+dy*dy)/(4*radius*radius)),ph=kx*dx+ky*dy,keep=1-before.potential[i+1];
       const real=before.field[i]+g*Math.cos(ph),imaginary=.5*(before.field[i+1]+before.field[i+3])+g*Math.sin(ph);
       const error=Math.max(Math.abs(after.field[i]-real*keep),Math.abs(.5*(after.field[i+1]+after.field[i+3])-imaginary*keep));
       if(error>kickError){kickError=error;worst={x,y,real:after.field[i],expectedReal:real*keep,imaginary:.5*(after.field[i+1]+after.field[i+3]),expectedImaginary:imaginary*keep,ph};}
       if(!keep)rawKickWallAmplitude=Math.max(rawKickWallAmplitude,Math.abs(real),Math.abs(imaginary));
     }
     let precision;
     if(!stationary){
       const probe=instance.auditKickArithmetic(position);
       const maxError={gaussian:0,phase:0,nativeCos:0,nativeSin:0};
       for(let y=0;y<before.gh;y++)for(let x=0;x<before.gw;x++){
         const i=4*(y*before.gw+x),dx=x+.5-position.x*before.gw,dy=y+.5-position.yGL*before.gh;
         const expectedGaussian=Math.exp(-(dx*dx+dy*dy)/(4*radius*radius)),expectedPhase=kx*dx+ky*dy;
         maxError.gaussian=Math.max(maxError.gaussian,Math.abs(probe.values[i]-expectedGaussian));
         maxError.phase=Math.max(maxError.phase,Math.abs(probe.values[i+1]-expectedPhase));
         maxError.nativeCos=Math.max(maxError.nativeCos,Math.abs(probe.values[i+2]-Math.cos(probe.values[i+1])));
         maxError.nativeSin=Math.max(maxError.nativeSin,Math.abs(probe.values[i+3]-Math.sin(probe.values[i+1])));
       }
       const i=4*(worst.y*before.gw+worst.x),gpuPhase=probe.values[i+1];
       precision={test:'tools/schrodinger-state.js',scope:'Measured native GPU transcendental error for the declared packet; one backend, not a hardware-wide bound.',backend:probe.backend,grid:[before.gw,before.gh],position:[position.x,position.yGL],momentum:[kx,ky],radius,amplitude:.5,maxError,
         worstAllowedCell:{...worst,gpuPhase,gaussian:probe.values[i],gpuCos:probe.values[i+2],cpuCosAtGpuPhase:Math.cos(gpuPhase),gpuSin:probe.values[i+3],cpuSinAtGpuPhase:Math.sin(gpuPhase)},movingPacketTolerance:2e-4,stationaryPacketTolerance:2e-6};
     }
     return {fixture,initial,after:summary(after),kickError,kickTolerance:stationary?2e-6:2e-4,rawKickWallAmplitude,worst,...(precision?{precision}:{})};
    },fixture));
   }finally{await page.close();}
  }
 }finally{await browser.close();}
 const [good,bad,edit]=rows;
 assert.equal(good.final.nonfinite,0,'Corrected harmonic well became nonfinite');
 assert(good.normRelativeDrift<2e-5,'Closed harmonic fixture lost its modified norm');
 assert(good.growth<10,'Corrected harmonic fixture amplified without bound');
 assert(bad.final.nonfinite>0||bad.growth>1e6,'Retired potential bound must exhibit instability');
 assert(good.dt*(4+good.initial.potentialMax)<1.61,'Step exceeds the actual potential envelope');
 assert(edit.error<2e-7&&edit.detectorChanges===0&&edit.time===0&&edit.steps===0&&edit.staggerDt===.05,'Timestep edit did not preserve the centered state and history');
 assert(edit.omittedRestaggerError>.1,'Omitted restagger control was not distinguishable');
 // A separate shader arithmetic probe found SwiftShader native sin/cos error up to
 // 1.9e-4 against double-precision evaluation at the GPU phase. Moving-packet
 // accuracy includes that limitation; the zero-momentum fixture retains 2e-6.
 // See validation/results/schrodinger-kick-precision.json. Timing/state checks above
 // keep their tighter tolerances and do not depend on this transcendental error.
 for(const wall of rows.filter(r=>r.fixture.startsWith('hard-wall'))){
  assert(wall.initial.wallMax===0&&wall.after.wallMax===0,'Hard walls contain wave amplitude');
  assert(wall.kickError<wall.kickTolerance,'Packet injection did not preserve synchronized complex addition: '+JSON.stringify(wall));
  assert(wall.rawKickWallAmplitude>.1,'Unprojected packet control did not cross a wall');
 }
 console.log(JSON.stringify({scope:'Float32 actual Schrödinger instances; static real potentials, no absorption; one harmonic packet, periodic Fourier time-step edit and hard-wall packet injection. Bounded regression, not all controls/hardware.',rows},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
