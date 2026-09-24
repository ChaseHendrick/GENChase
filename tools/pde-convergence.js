// Temporal refinement of the actual Cahn-Hilliard shaders at fixed grid and elapsed time.
// Independent float64 RK4 reference; this does not test spatial/continuum convergence.
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'src/modules/pde.js'), 'utf8');
  const expose = source.slice(0, source.indexOf('  Studio.register({')) + '\nwindow.scienceShaders = { MU_CH, STEP_CH };\n})();';
  const browser = await chromium.launch({args:glArgs()});
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/convergence');
    await page.evaluate(expose);
    const result = await page.evaluate(() => {
      const G = Studio.gl, shaders = window.scienceShaders;
      const gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Temporal benchmark requires WebGL2 float32 render targets');
      const N = 32, size = N*N, finalTime = .08, timesteps = [.02, .01, .005];
      const rows = [], data = new Float32Array(size*4);
      for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
        data[4*(y*N+x)] = .3 + .12*Math.cos(Math.PI*x/2)*Math.cos(Math.PI*y/2);
        data[4*(y*N+x)+3] = 1;
      }
      const initial = Float64Array.from({length:size}, (_,k)=>data[4*k]);
      const maxDifference = (a,b) => a.reduce((m,v,k)=>Math.max(m,Math.abs(v-b[k])),0);
      for (const boundary of ['periodic','noflux']) for (const deg of [0,1]) {
        // The reference integrates the same spatial ODE with a separate RK4 implementation.
        // Every neighbor pair is constructed on the CPU, independently of texture sampling.
        const pos = v => boundary==='periodic' ? (v+N)%N : Math.max(0,Math.min(N-1,v));
        const neighbors = Array.from({length:size},(_,k)=>{
          const x=k%N,y=Math.floor(k/N);
          return [y*N+pos(x-1),y*N+pos(x+1),pos(y-1)*N+x,pos(y+1)*N+x];
        });
        const mu = new Float64Array(size);
        function rate(c,out) {
          for (let i=0;i<size;i++) {
            let lap=-4*c[i]; for (const j of neighbors[i]) lap+=c[j];
            mu[i]=c[i]*c[i]*c[i]-c[i]-lap;
          }
          for (let i=0;i<size;i++) {
            let flux=0;
            for (const j of neighbors[i]) {
              const mobility=deg ? .5*(Math.max(1-c[i]*c[i],0)+Math.max(1-c[j]*c[j],0)) : 1;
              flux+=mobility*(mu[j]-mu[i]);
            }
            out[i]=flux;
          }
        }
        function reference(steps) {
          const c=initial.slice(), work=new Float64Array(size);
          const k=Array.from({length:4},()=>new Float64Array(size)), dt=finalTime/steps;
          for (let n=0;n<steps;n++) {
            rate(c,k[0]);
            for(let i=0;i<size;i++)work[i]=c[i]+dt*k[0][i]/2;
            rate(work,k[1]);
            for(let i=0;i<size;i++)work[i]=c[i]+dt*k[1][i]/2;
            rate(work,k[2]);
            for(let i=0;i<size;i++)work[i]=c[i]+dt*k[2][i];
            rate(work,k[3]);
            for(let i=0;i<size;i++)c[i]+=dt*(k[0][i]+2*k[1][i]+2*k[2][i]+k[3][i])/6;
          }
          return c;
        }
        const referenceCoarse=reference(160), referenceFine=reference(320);
        const referenceDifference=maxDifference(referenceCoarse,referenceFine);
        const opts={type:'rgba32f',filter:'nearest',wrap:boundary==='periodic'?'repeat':'clamp'};
        const pMu=new G.Pass(gl,shaders.MU_CH), pStep=new G.Pass(gl,shaders.STEP_CH);
        function gpu(dt,clockScale=1) {
          const steps=Math.round(finalTime/dt);
          let a=new G.Target(gl,N,N,{...opts,data}), b=new G.Target(gl,N,N,opts);
          const chemical=new G.Target(gl,N,N,opts), pixels=new Float32Array(size*4);
          let maxAmplitude=initial.reduce((m,c)=>Math.max(m,Math.abs(c)),0);
          for(let n=0;n<steps;n++) {
            pMu.draw(chemical,{u_c:a,u_res:[N,N],u_eps2:1});
            pStep.draw(b,{u_c:a,u_mu:chemical,u_res:[N,N],u_dt:dt*clockScale,u_M:1,u_deg:deg,u_noise:0,u_step:n,u_nOff:0});
            [a,b]=[b,a];
            // Check every stored step: a later small field would not rule out earlier clipping.
            gl.bindFramebuffer(gl.FRAMEBUFFER,a.fbo);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,pixels);
            if(gl.getError()!==gl.NO_ERROR)throw Error('GPU readback failed');
            for(let k=0;k<size;k++)maxAmplitude=Math.max(maxAmplitude,Math.abs(pixels[4*k]));
          }
          const field=Float64Array.from({length:size},(_,k)=>pixels[4*k]);
          for(const target of [a,b,chemical])target.dispose();
          return {dt,steps,maxError:maxDifference(field,referenceFine),maxAmplitude};
        }
        const refinements=timesteps.map(dt=>gpu(dt));
        const observedOrders=refinements.slice(1).map((r,i)=>Math.log2(refinements[i].maxError/r.maxError));
        // Integrating twice the claimed elapsed time must be detected, even with a small timestep.
        const wrongClock=gpu(timesteps.at(-1),2);
        rows.push({boundary,degenerate:!!deg,referenceDifference,refinements,observedOrders,wrongClockError:wrongClock.maxError});
        gl.deleteProgram(pMu.prog);gl.deleteProgram(pStep.prog);
      }
      return {scope:'Fixed 32x32 grid, unit cell spacing, M=1, epsilon=1, zero forcing, float32 GPU; temporal convergence only',finalTime,timesteps,referenceSteps:[160,320],rows};
    });
    for(const r of result.rows) {
      assert(Number.isFinite(r.referenceDifference)&&r.referenceDifference<1e-9,'RK4 reference did not settle under step halving');
      for(const f of r.refinements) {
        assert(Number.isFinite(f.maxError)&&f.maxError>1e-6,'Fixture must resolve truncation error above float32 roundoff');
        assert(f.maxAmplitude<1,'Fixture left its unclipped amplitude range');
      }
      assert(r.observedOrders.every(p=>p>.8&&p<1.3),'Expected first-order time convergence');
      assert(r.refinements.at(-1).maxError<.003,'Fine-step field error exceeds acceptance limit');
      assert(r.wrongClockError>5*r.refinements.at(-1).maxError,'Wrong elapsed-time control was not detected');
    }
    console.log(JSON.stringify(result,null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
