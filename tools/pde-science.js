// Actual Cahn-Hilliard GPU passes versus an independent double-precision stencil.
// This is a bounded discretization check, not continuum or print validation.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'src/modules/pde.js'), 'utf8');
  const expose = source.slice(0, source.indexOf('  Studio.register({')) + '\nwindow.scienceShaders = { MU_CH, STEP_CH };\n})();';
  const browser = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'studio.html') + '#three-vortex-bound/science');
    await page.evaluate(expose);
    const rows = await page.evaluate(() => {
      const G = Studio.gl, shaders = window.scienceShaders;
      const canvas = document.createElement('canvas'), gl = G.createGL(canvas);
      if (!gl || !gl.floatExt) throw Error('This benchmark requires WebGL2 float32 render targets');
      const rows = [];
      for (const boundary of ['periodic','noflux']) for (const deg of [0,1]) for (const N of [64,128,256,512]) {
        const dt=.01, M=1, eps2=1, steps=32, size=N*N;
        let cpu=new Float64Array(size), next=new Float64Array(size);
        const mu=new Float64Array(size), data=new Float32Array(size*4);
        for(let y=0;y<N;y++) for(let x=0;x<N;x++) {
          const k=y*N+x; data[4*k]=.25+.2*Math.cos(2*Math.PI*x/16)*Math.cos(2*Math.PI*y/16);
          cpu[k]=data[4*k]; data[4*k+3]=1;
        }
        const initialMean=cpu.reduce((a,b)=>a+b,0)/size;
        const opts={type:'rgba32f',filter:'nearest',wrap:boundary==='periodic'?'repeat':'clamp'};
        let a=new G.Target(gl,N,N,{...opts,data}), b=new G.Target(gl,N,N,opts), chemical=new G.Target(gl,N,N,opts);
        const pMu=new G.Pass(gl,shaders.MU_CH), pStep=new G.Pass(gl,shaders.STEP_CH);
        const index=(x,y)=>{const pos=v=>boundary==='periodic'?(v+N)%N:Math.max(0,Math.min(N-1,v));return pos(y)*N+pos(x);};
        const neighbors=(x,y)=>[index(x+1,y),index(x-1,y),index(x,y+1),index(x,y-1)];
        const lap=(f,x,y)=>neighbors(x,y).reduce((sum,j)=>sum+f[j],-4*f[y*N+x]);
        const flux=(f,chem,x,y)=>{
          if(!deg) return lap(chem,x,y);
          const k=y*N+x,mob=c=>Math.max(1-c*c,0), center=mob(f[k]);
          let sum=0;
          for(const j of neighbors(x,y)) sum+=.5*(center+mob(f[j]))*(chem[j]-chem[k]);
          return sum;
        };
        for(let t=0;t<steps;t++) {
          for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=y*N+x,c=cpu[k];mu[k]=c*c*c-c-eps2*lap(cpu,x,y);}
          for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=y*N+x;next[k]=cpu[k]+dt*M*flux(cpu,mu,x,y);}
          [cpu,next]=[next,cpu];
          pMu.draw(chemical,{u_c:a,u_res:[N,N],u_eps2:eps2});
          pStep.draw(b,{u_c:a,u_mu:chemical,u_res:[N,N],u_dt:dt,u_M:M,u_deg:deg,u_noise:0,u_step:t,u_nOff:0});
          [a,b]=[b,a];
        }
        const pixels=new Float32Array(size*4);
        gl.bindFramebuffer(gl.FRAMEBUFFER,a.fbo);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,pixels);
        if(gl.getError()!==gl.NO_ERROR)throw Error('GPU readback failed');
        let maxError=0,mean=0;
        for(let k=0;k<size;k++){maxError=Math.max(maxError,Math.abs(pixels[4*k]-cpu[k]));mean+=pixels[4*k];}
        // A deliberately reversed update must disagree with the same independent reference.
        const wrong=new G.Pass(gl,shaders.STEP_CH.replace('c += u_dt','c -= u_dt'));
        const original=new G.Target(gl,N,N,{...opts,data});
        pMu.draw(chemical,{u_c:original,u_res:[N,N],u_eps2:eps2});
        wrong.draw(b,{u_c:original,u_mu:chemical,u_res:[N,N],u_dt:dt,u_M:M,u_deg:deg,u_noise:0,u_step:0,u_nOff:0});
        gl.bindFramebuffer(gl.FRAMEBUFFER,b.fbo);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,pixels);
        const c0=Float64Array.from({length:size},(_,k)=>data[4*k]);
        for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=y*N+x,c=c0[k];mu[k]=c*c*c-c-eps2*lap(c0,x,y);}
        let mutantError=0;
        for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=y*N+x;mutantError=Math.max(mutantError,Math.abs(pixels[4*k]-(c0[k]+dt*M*flux(c0,mu,x,y))));}
        rows.push({boundary,degenerate:!!deg,grid:N,steps,maxError,massDrift:Math.abs(mean/size-initialMean),mutantError});
        for(const t of [a,b,chemical,original])t.dispose();
        for(const p of [pMu,pStep,wrong])gl.deleteProgram(p.prog);
      }
      return rows;
    });

    for(const r of rows) {
      assert(Number.isFinite(r.maxError) && r.maxError<5e-7, 'GPU/CPU disagreement');
      assert(r.massDrift<5e-8, 'Constant-mobility mass drift');
      assert(r.mutantError>1e-6, 'Failure control was not detected');
    }
    console.log(JSON.stringify({scope:'Periodic/no-flux constant/variable-mobility, noise-free float32 Cahn-Hilliard stencil; no clipping in this fixture',rows},null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
