// Actual maintained 3D GPU stencil against analytic discrete modes and float64 updates.
// Setup: optional Playwright/Chromium as documented in BUILDING.md.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/modules/volume-wave.js'),'utf8');
  const marker='  Studio.register({';assert.equal(source.split(marker).length,2);
  const instrumented=source.replace('      fieldCells(){',`      _auditRead(){ const a=new Float32Array(shape.w*shape.h*4);gl.bindFramebuffer(gl.FRAMEBUFFER,field.read.fbo);gl.readPixels(0,0,shape.w,shape.h,gl.RGBA,gl.FLOAT,a);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {values:a,count,n}; },\n      fieldCells(){`);
  const exposed=instrumented.replace(marker,'  window.volumeWaveAudit={STEP_FS,SEED_FS,DISPLAY_FS,layout,timeStep,sanitize,create};\n'+marker);
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const page=await browser.newPage();await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound/volume-audit');await page.evaluate(exposed);
    const result=await page.evaluate(async()=>{
      const A=window.volumeWaveAudit,G=Studio.gl,gl=G.createGL(document.createElement('canvas'));
      if(!gl||!gl.floatExt)throw Error('Float32 WebGL2 unavailable');
      const pass=new G.Pass(gl,A.STEP_FS),seed=new G.Pass(gl,A.SEED_FS);new G.Pass(gl,A.DISPLAY_FS);
      const badSource=A.STEP_FS.replace('+u_r2*lap','-u_r2*lap');if(badSource===A.STEP_FS)throw Error('Control mutation failed');const badPass=new G.Pass(gl,badSource);
      const idx=(x,y,z,n)=>((z+n)%n)*n*n+((y+n)%n)*n+(x+n)%n;
      function lap(a,x,y,z,n){return a[idx(x+1,y,z,n)]+a[idx(x-1,y,z,n)]+a[idx(x,y+1,z,n)]+a[idx(x,y-1,z,n)]+a[idx(x,y,z+1,n)]+a[idx(x,y,z-1,n)]-6*a[idx(x,y,z,n)];}
      function wave(n,m,phase=0.31){return Float64Array.from({length:n**3},(_,i)=>Math.cos(2*Math.PI*(m[0]*(i%n)+m[1]*(Math.floor(i/n)%n)+m[2]*Math.floor(i/(n*n)))/n+phase));}
      function fixture(n,courant,steps,initial,bad=false){
        const shape=A.layout(n),p=new G.PingPong(gl,shape.w,shape.h,{type:'rgba32f',filter:'nearest'}),data=new Float32Array(shape.w*shape.h*4),r2=courant*courant/3;
        const at=(x,y,z)=>4*((Math.floor(z/shape.tiles)*n+y)*shape.w+(z%shape.tiles)*n+x);
        for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)data[at(x,y,z)]=initial[idx(x,y,z,n)];
        p.read.upload(data);const run=(first)=>{(bad&&!first?badPass:pass).draw(p.write,{u_state:p.read,u_n:{int:n},u_tiles:{int:shape.tiles},u_r2:r2,u_first:first});p.swap();};
        const read=()=>{const out=new Float32Array(shape.w*shape.h*4),u=new Float64Array(n**3),prev=new Float64Array(n**3);gl.bindFramebuffer(gl.FRAMEBUFFER,p.read.fbo);gl.readPixels(0,0,shape.w,shape.h,gl.RGBA,gl.FLOAT,out);gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(gl.getError()!==gl.NO_ERROR)throw Error('Readback error');for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=idx(x,y,z,n),j=at(x,y,z);u[i]=out[j];prev[i]=out[j+1];}return {u,prev};};
        try{run(true);const start=read();for(let i=0;i<steps;i++)run(false);return {start,end:read()};}finally{p.dispose();}
      }
      function error(a,b){let max=0,sum=0;for(let i=0;i<a.length;i++){if(!Number.isFinite(a[i]))throw Error('Nonfinite value');const d=a[i]-b[i];max=Math.max(max,Math.abs(d));sum+=d*d;}return {max,rms:Math.sqrt(sum/a.length)};}
      const modes=[];
      for(const [n,m,courant,steps] of [[16,[2,3,1],0.8,60],[24,[7,5,9],0.95,60],[32,[0,0,0],0.9,40],[48,[5,-2,3],0.2,80]]){
        const initial=wave(n,m),theta=2*Math.asin(courant/Math.sqrt(3)*Math.sqrt(m.reduce((sum,k)=>sum+Math.sin(Math.PI*k/n)**2,0))),{end}=fixture(n,courant,steps,initial);
        const expected=initial.map(x=>x*Math.cos(theta*steps)),d=error(end.u,expected);if(d.max>5e-5)throw Error('Discrete mode failed '+JSON.stringify({n,m,d}));modes.push({grid:n,mode:m,courant,steps,error:d});
      }
      const n=20,courant=0.7,steps=35,initial=wave(n,[3,2,1]);for(let i=0;i<initial.length;i++)initial[i]+=0.13*Math.sin(i*0.217);
      const {end}=fixture(n,courant,steps,initial),r2=courant*courant/3;let current=Float64Array.from(initial),previous=new Float64Array(initial.length);
      for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=idx(x,y,z,n);previous[i]=current[i]+0.5*r2*lap(current,x,y,z,n);}
      for(let t=0;t<steps;t++){const next=new Float64Array(initial.length);for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=idx(x,y,z,n);next[i]=2*current[i]-previous[i]+r2*lap(current,x,y,z,n);}previous=current;current=next;}
      const cpuError=error(end.u,current);if(cpuError.max>5e-5)throw Error('Independent float64 reference failed');
      const convergence=[],T=0.13,m=[1,2,1];
      for(const N of [16,32,64]){const initial=wave(N,m),steps=Math.ceil(T*Math.sqrt(3)*N/0.6),dt=T/steps,C=dt*Math.sqrt(3)*N,{end}=fixture(N,C,steps,initial),expected=initial.map(v=>v*Math.cos(2*Math.PI*Math.hypot(...m)*T)),d=error(end.u,expected);convergence.push({grid:N,domain:[1,1,1],time:T,steps,dt,error:d});}
      for(let i=1;i<convergence.length;i++){const ratio=convergence[i-1].error.rms/convergence[i].error.rms;convergence[i].refinementRatio=ratio;if(ratio<3.5||ratio>4.5)throw Error('Refinement failed '+ratio);}
      const bad=fixture(16,0.8,10,wave(16,[2,3,1]),true).end.u,good=fixture(16,0.8,10,wave(16,[2,3,1])).end.u,wrongSign=error(bad,good).max;
      if(wrongSign<0.1)throw Error('Wrong sign escaped');
      const nyquist=wave(16,[8,8,8],0),stable=fixture(16,0.95,32,nyquist).end.u,unstable=fixture(16,1.05,32,nyquist).end.u;
      const max=a=>a.reduce((v,x)=>Math.max(v,Math.abs(x)),0),stableMax=max(stable),unstableMax=max(unstable);if(stableMax>1.0001||unstableMax<1e6)throw Error('CFL control failed');
      let cflCases=0;for(const grid of [32,48,64,96,128,192,256])for(const speed of [0.1,1,5])for(const courant of [-20,0.8,99,NaN]){const s={grid,speed,courant};A.sanitize(s);if(A.timeStep(s)*Math.sqrt(3)*s.speed*s.grid>0.95000001)throw Error('Sanitizer CFL failed');cflCases++;}
      // Actual seeded initializer and first-step preparation, including the previous time level.
      const seedN=32,shape=A.layout(seedN),target=new G.Target(gl,shape.w,shape.h,{type:'rgba32f',filter:'nearest'});
      seed.draw(target,{u_n:{int:seedN},u_tiles:{int:shape.tiles},u_center:[0.45,0.55,0.5],u_phase:0.31,u_width:0.12,u_pattern:{int:1}});
      const data=new Float32Array(shape.w*shape.h*4);gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.readPixels(0,0,shape.w,shape.h,gl.RGBA,gl.FLOAT,data);gl.bindFramebuffer(gl.FRAMEBUFFER,null);target.dispose();let seedMaxError=0;
      for(let z=0;z<seedN;z++)for(let y=0;y<seedN;y++)for(let x=0;x<seedN;x++){const j=4*((Math.floor(z/shape.tiles)*seedN+y)*shape.w+(z%shape.tiles)*seedN+x),expected=Math.cos(2*Math.PI*(2*x+3*y+z)/seedN+0.31);seedMaxError=Math.max(seedMaxError,Math.abs(data[j]-expected));}if(seedMaxError>3e-4)throw Error('Seed mode failed '+seedMaxError);
      const def=Studio.modules['volume-wave'];let state={...def.defaults,palette:['#102030','#ffcc77'],bg:'#080a10'},status='';
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
      const instance=A.create({canvas,getState:()=>state,setStatus:s=>{status=s;},fault:s=>{throw Error(s);},isActive:()=>true,reducedMotion:()=>true});
      async function settle(){const start=performance.now();while(!status.includes('step <b>'+state.warmup+'</b>')){if(performance.now()-start>15000)throw Error('Warmup timeout '+status);await new Promise(resolve=>setTimeout(resolve,20));}}
      const plates=[];
      for(const [preset,definition] of Object.entries(def.presets)){state={...def.defaults,...definition.p,palette:['#102030','#ffcc77'],bg:'#080a10'};const pattern=state.pattern;instance.regenerate();await settle();instance.pause();const before=instance._auditRead();
        const blob=await instance.exportPNG(512,384),bitmap=await createImageBitmap(blob),out=document.createElement('canvas');out.width=512;out.height=384;const ctx=out.getContext('2d');ctx.drawImage(bitmap,0,0);const px=ctx.getImageData(0,0,512,384).data,luma=[];for(let i=0;i<px.length;i+=4)luma.push((px[i]+px[i+1]+px[i+2])/3);luma.sort((a,b)=>a-b);const p05=luma[Math.floor(luma.length*0.05)],p95=luma[Math.floor(luma.length*0.95)];if(p95-p05<5)throw Error('Flat plate '+pattern);const after=instance._auditRead();if(error(before.values,after.values).max!==0||before.count!==after.count)throw Error('Export changed field');
        instance.regenerate();await settle();instance.pause();if(error(before.values,instance._auditRead().values).max!==0)throw Error('Seed repeatability failed');plates.push({preset,pattern,axis:state.axis,grid:before.n,steps:before.count,print:[bitmap.width,bitmap.height],luminanceP05:p05,luminanceP95:p95,exportStateMaxChange:0,repeatFieldMaxDifference:0});bitmap.close();
      }
      return {scope:'Actual float32 atlas shader, periodic unit cube, zero initial velocity. Bounded discrete-mode, independent CPU, fixed-time continuum refinement and failure controls.',plates,modes,cpuComparison:{grid:n,steps,courant,error:cpuError},convergence,seedMaxError,controls:{wrongSignMaxDifference:wrongSign,stableNyquistMax:stableMax,aboveCflNyquistMax:unstableMax},sanitizerCflCases:cflCases,limitations:'No long-time, extreme 96..256 grid, cross-device, arbitrary parameter, experimental acoustics or broad print accuracy certification. Five selected preset print states preserve the field at 512x384; this does not establish physical calibration. Scientific GPU fixtures use grids 16..64 and at most 80 steps.'};
    });
    console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
