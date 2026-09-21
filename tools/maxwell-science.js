// Actual TMz GPU shaders versus independent float64 updates and analytic periodic modes.
// Setup: Playwright and Chromium per BUILDING.md. Run: node tools/maxwell-science.js
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/modules/maxwell.js'),'utf8');
  const marker='  Studio.register({';assert.equal(source.split(marker).length,2);
  const exposed=source.replace(marker,'  window.maxwellAudit={H_FS,E_FS,timeStep,sizeOf,sanitize};\n'+marker);
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage();await page.goto('file://'+path.join(root,'studio.html')+'#three-vortex-bound/maxwell-audit');await page.evaluate(exposed);
    const result=await page.evaluate(()=>{
      const G=Studio.gl,A=window.maxwellAudit,canvas=document.createElement('canvas'),gl=G.createGL(canvas);
      if(!gl||!gl.floatExt)throw Error('Maxwell benchmark requires WebGL2 float32');
      const hPass=new G.Pass(gl,A.H_FS),ePass=new G.Pass(gl,A.E_FS);
      const badSource=A.E_FS.replace('q.r += u_dt * curlH','q.r -= u_dt * curlH');
      if(badSource===A.E_FS)throw Error('Failure-control mutation did not apply');
      const badPass=new G.Pass(gl,badSource);
      const twoPi=2*Math.PI;
      const index=(x,y,W,H)=>4*(((y+H)%H)*W+(x+W)%W);
      function cpuH(data,W,H,dt,dx,mu){
        const out=Float64Array.from(data);
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){
          const i=index(x,y,W,H),up=index(x,y+1,W,H),right=index(x+1,y,W,H);
          out[i+1]-=dt*(data[up]-data[i])/(mu*dx);out[i+2]+=dt*(data[right]-data[i])/(mu*dx);
        }
        return out;
      }
      function cpuStep(data,W,H,dt,dx,mu){
        const h=cpuH(data,W,H,dt,dx,mu),out=Float64Array.from(h);
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){
          const i=index(x,y,W,H),left=index(x-1,y,W,H),down=index(x,y-1,W,H);
          out[i]+=dt*((h[i+2]-h[left+2])-(h[i+1]-h[down+1]))/(h[i+3]*dx);
        }
        return out;
      }
      function fixture(W,H,initial,dt,mu,steps,mutated=false){
        const opts={type:'rgba32f',filter:'nearest',wrap:'repeat'},state=new G.PingPong(gl,W,H,opts),dx=1/W;
        state.read.upload(initial);
        const advanceH=amount=>{hPass.draw(state.write,{u_state:state.read,u_size:{ivec:[W,H]},u_dt:amount,u_dx:dx,u_mu:mu});state.swap();};
        const read=()=>{const values=new Float32Array(W*H*4);gl.bindFramebuffer(gl.FRAMEBUFFER,state.read.fbo);gl.readPixels(0,0,W,H,gl.RGBA,gl.FLOAT,values);gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(gl.getError()!==gl.NO_ERROR)throw Error('GPU readback failed');return values;};
        advanceH(-0.5*dt);const start=read();
        for(let n=0;n<steps;n++){advanceH(dt);(mutated?badPass:ePass).draw(state.write,{u_state:state.read,u_size:{ivec:[W,H]},u_dt:dt,u_dx:dx});state.swap();}
        const end=read();state.dispose();return{start,end};
      }
      function difference(actual,expected){let max=0,sum=0,count=0;for(let i=0;i<actual.length;i++){if(!Number.isFinite(actual[i]))throw Error('Nonfinite field');if(i%4===3){if(actual[i]!==expected[i])throw Error('Material coefficient changed');continue;}const d=actual[i]-expected[i];max=Math.max(max,Math.abs(d));sum+=d*d;count++;}return{max,rms:Math.sqrt(sum/count)};}
      function energy(data,W,H,dt,mu){const hp=cpuH(data,W,H,dt,1/W,mu);let value=0;for(let i=0;i<data.length;i+=4)value+=data[i+3]*data[i]*data[i]+mu*(data[i+1]*hp[i+1]+data[i+2]*hp[i+2]);return value/(W*H);}
      function divergence(data,W,H){let worst=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=index(x,y,W,H),r=index(x+1,y,W,H),u=index(x,y+1,W,H);worst=Math.max(worst,Math.abs((data[r+1]-data[i+1]+data[u+2]-data[i+2])*W));}return worst;}
      function mode(W,H,epsilon,m,n){
        const initial=new Float32Array(W*H*4),kx=twoPi*m,ky=twoPi*n/(H/W);
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=index(x,y,W,H);initial[i]=Math.cos(kx*x/W+ky*y/W+0.31);initial[i+3]=epsilon;}
        return {initial,kx,ky};
      }
      function discreteReference(W,H,epsilon,mu,dt,steps,kx,ky){
        const dx=1/W,Kx=2*Math.sin(kx*dx/2)/dx,Ky=2*Math.sin(ky*dx/2)/dx;
        const omegaD=Math.hypot(Kx,Ky)/Math.sqrt(epsilon*mu),omega=2*Math.asin(dt*omegaD/2)/dt;
        const expected=new Float64Array(W*H*4);
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){
          const i=index(x,y,W,H),phase=kx*x/W+ky*y/W+0.31;
          expected[i]=Math.cos(phase)*Math.cos(steps*dt*omega);
          expected[i+1]=Ky/(mu*omegaD)*Math.sin(phase+ky*dx/2)*Math.sin((steps-0.5)*dt*omega);
          expected[i+2]=-Kx/(mu*omegaD)*Math.sin(phase+kx*dx/2)*Math.sin((steps-0.5)*dt*omega);
          expected[i+3]=epsilon;
        }
        return expected;
      }
      const modes=[];
      for(const [W,H,epsilon,mu,m,n] of [[32,32,1,1,3,2],[64,48,0.25,0.5,2,3],[128,128,4,2,5,1],[32,32,2.25,4,9,7]]){
        const dt=0.7*Math.sqrt(epsilon*mu)/(Math.SQRT2*W),steps=80,{initial,kx,ky}=mode(W,H,epsilon,m,n);
        const {start,end}=fixture(W,H,initial,dt,mu,steps),expected=discreteReference(W,H,epsilon,mu,dt,steps,kx,ky);
        const error=difference(end,expected),initialEnergy=energy(start,W,H,dt,mu),energyDrift=Math.abs(energy(end,W,H,dt,mu)/initialEnergy-1),div=divergence(end,W,H);
        if(error.max>2e-5||energyDrift>5e-6||div>5e-4)throw Error('Discrete mode failed '+JSON.stringify({W,H,error,energyDrift,div}));
        modes.push({cells:[W,H],epsilon,mu,mode:[m,n],steps,dt,error,modifiedEnergyRelativeDrift:energyDrift,magneticDivergenceMax:div});
      }
      const W=64,H=48,mu=1.7,dt=0.5*Math.sqrt(0.75*mu)/(Math.SQRT2*W),steps=100,initial=new Float32Array(W*H*4);
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        const i=index(x,y,W,H);initial[i]=Math.sin(twoPi*(3*x/W+2*y/H))+0.2*Math.cos(twoPi*(x/W-4*y/H));
        initial[i+3]=(x>20&&x<43)?3:0.75;
      }
      const gpu=fixture(W,H,initial,dt,mu,steps);let cpu=cpuH(initial,W,H,-0.5*dt,1/W,mu);
      for(let n=0;n<steps;n++)cpu=cpuStep(cpu,W,H,dt,1/W,mu);
      const heterogeneousError=difference(gpu.end,cpu),energy0=energy(gpu.start,W,H,dt,mu),heterogeneousDrift=Math.abs(energy(gpu.end,W,H,dt,mu)/energy0-1);
      if(heterogeneousError.max>2e-5||heterogeneousDrift>5e-6)throw Error('Dielectric float64 comparison failed');
      const heterogeneous={cells:[W,H],epsilon:[0.75,3],mu,dt,steps,error:heterogeneousError,modifiedEnergyRelativeDrift:heterogeneousDrift};

      // Compare at the same physical length and time, refining both dx and dt.
      const convergence=[],T=0.17;
      for(const N of [32,64,128]){
        const {initial,kx,ky}=mode(N,N,1,2,1),steps=Math.ceil(T/(0.6/(Math.SQRT2*N))),dt=T/steps;
        const {end}=fixture(N,N,initial,dt,1,steps),omega=Math.hypot(kx,ky);let squared=0;
        for(let y=0;y<N;y++)for(let x=0;x<N;x++){const expected=Math.cos(kx*x/N+ky*y/N+0.31)*Math.cos(omega*T);squared+=(end[index(x,y,N,N)]-expected)**2;}
        const rms=Math.sqrt(squared/(N*N));convergence.push({cells:[N,N],physicalDomain:[1,1],time:T,dt,steps,electricRmsError:rms});
      }
      for(let i=1;i<convergence.length;i++){const ratio=convergence[i-1].electricRmsError/convergence[i].electricRmsError;convergence[i].refinementRatio=ratio;if(ratio<3.5||ratio>4.5)throw Error('Spatial/temporal refinement lost second-order trend: '+ratio);}

      const controlMode=mode(32,32,1,3,2),controlDt=0.5/(Math.SQRT2*32),bad=fixture(32,32,controlMode.initial,controlDt,1,8,true);
      const correct=discreteReference(32,32,1,1,controlDt,8,controlMode.kx,controlMode.ky),wrongCurlError=difference(bad.end,correct).max;
      if(wrongCurlError<0.1)throw Error('Wrong electric curl sign escaped detection');
      const nyquist=new Float32Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){nyquist[index(x,y,32,32)]=(x+y)%2?-1:1;nyquist[index(x,y,32,32)+3]=1;}
      const maxE=data=>{let max=0;for(let i=0;i<data.length;i+=4)max=Math.max(max,Math.abs(data[i]));return max;};
      const stable=maxE(fixture(32,32,nyquist,0.95/(Math.SQRT2*32),1,32).end),unstable=maxE(fixture(32,32,nyquist,1.05/(Math.SQRT2*32),1,32).end);
      if(stable>1.0001||!(unstable>1e6))throw Error('CFL control did not distinguish stable/unstable Nyquist mode');

      const heavy=[];
      for(const N of [512,1024,2048]){
        const {initial,kx,ky}=mode(N,N,1,3,2),dt=0.8/(Math.SQRT2*N),start=performance.now();
        const {end}=fixture(N,N,initial,dt,1,4),error=difference(end,discreteReference(N,N,1,1,dt,4,kx,ky));
        if(error.max>2e-5)throw Error('Heavy-grid mode failed at '+N);
        heavy.push({cells:[N,N],steps:4,dt,error,elapsedMs:Math.round(performance.now()-start)});
      }
      let cflCases=0;
      for(const grid of [128,256,512,1024,2048])for(const epsilon of [0.25,1,9])for(const permeability of [0.25,1,4])for(const ratio of [1,9]){
        const s={...Studio.modules.maxwell.defaults,grid,epsilon,mu:permeability,ratio,courant:99};A.sanitize(s);
        if(s.grid!==grid||!(A.timeStep(s)*Math.sqrt(2)*grid/Math.sqrt(epsilon*permeability)<=0.95000001))throw Error('Sanitizer violates CFL or advertised grid');cflCases++;
      }
      return {scope:'Periodic TMz Yee float32 shaders, lossless positive epsilon and uniform mu. Analytic discrete modes; one independent float64 slab fixture; fixed-domain/time second-order continuum refinement; deliberate curl/CFL failures; four-step high-grid checks.',modes,heterogeneous,convergence,controls:{wrongCurlMaxError:wrongCurlError,stableNyquistMax:stable,aboveCflNyquistMax:unstable},heavy,sanitizerCflCases:cflCases,limitations:'No experimental, interface-scattering coefficient, discontinuous-material convergence, arbitrary parameter/long-time/device, or print-accuracy certification. Heavy-grid checks are only four steps.'};
    });
    console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
