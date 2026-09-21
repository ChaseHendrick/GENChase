// node tools/schrodinger-science.js
// Actual float32 GPU recurrence against independent Fourier-mode calculations.
// Periodic, static real potentials only; no absorber, wall, kick or display validation here.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'src/modules/wavesflow.js'), 'utf8');
  const closing = source.lastIndexOf('})();');
  assert(closing >= 0, 'Wave module closure is missing');
  const expose = source.slice(0, closing) + 'window.schrodingerShaders = { step: SCH_STEP_FS };\n' + source.slice(closing);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let result;
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/schrodinger-science');
    await page.evaluate(expose);
    result = await page.evaluate(() => {
      const G = Studio.gl, gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Schrodinger benchmark requires WebGL2 float32 render targets');
      const shader = window.schrodingerShaders.step;
      const signTerm = '(c.g - u_dt * HR)';
      if (!shader.includes(signTerm)) throw Error('Wrong-sign control marker is missing');
      const correct = new G.Pass(gl, shader), wrongSign = new G.Pass(gl, shader.replace(signTerm, '(c.g + u_dt * HR)'));
      const TAU = 2 * Math.PI;

      function trial({ label, N = 32, potential = 0, dt, steps, modes, continuumTime, physicalLength }, mutant = false) {
        const count = N * N, elapsed = steps * dt;
        const waves = modes.map(m => {
          const kx = TAU * m.x / N, ky = TAU * m.y / N;
          const energy = 2 - Math.cos(kx) - Math.cos(ky) + potential;
          const cos = new Float64Array(count), sin = new Float64Array(count);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const k = y * N + x, phase = kx * x + ky * y + (m.phase || 0);
            cos[k] = m.amplitude * Math.cos(phase); sin[k] = m.amplitude * Math.sin(phase);
          }
          // Each spatial eigenmode evolves through a real 2x2 matrix, independently
          // of texture sampling, the GPU stencil and GLSL channel bookkeeping.
          return { ...m, energy, cos, sin, R: [1, 0], plus: [-0.5 * dt * energy, 1], minus: [0.5 * dt * energy, 1] };
        });
        const data = new Float32Array(count * 4), potData = new Float32Array(count * 4);
        const expectedExposure = new Float64Array(count);
        for (let k = 0; k < count; k++) {
          data[4*k] = waves.reduce((s,w) => s + w.cos[k], 0);
          data[4*k+1] = waves.reduce((s,w) => s + w.sin[k], 0);
          data[4*k+3] = data[4*k+1];
          potData[4*k] = potential;
        }
        const options = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
        let current = new G.Target(gl,N,N,{...options,data}), next = new G.Target(gl,N,N,options);
        const pot = new G.Target(gl,N,N,{...options,data:potData}), pixels = new Float32Array(count*4);
        const pass = mutant ? wrongSign : correct;
        const advance = (phase, step, exposureStep = 0) => {
          pass.draw(next,{u_p:current,u_pot:pot,u_res:[N,N],u_dt:step,u_dtE:exposureStep,u_damp:0,u_phase:{int:phase}});
          [current,next] = [next,current];
        };
        const read = () => {
          gl.bindFramebuffer(gl.FRAMEBUFFER,current.fbo);
          gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,pixels);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Schrodinger readback failed');
          let norm = 0, clippedNorm = 0, minDensity = Infinity;
          for (let k=0;k<count;k++) {
            const r=pixels[4*k], plus=pixels[4*k+1], previous=pixels[4*k+3];
            const density=r*r+plus*previous;
            norm += density; clippedNorm += Math.max(density,0); minDensity = Math.min(minDensity,density);
            if (![r,plus,previous,pixels[4*k+2]].every(Number.isFinite)) throw Error('Schrodinger fixture became nonfinite');
          }
          return { norm, clippedNorm, minDensity };
        };
        // Input holds the same integer-time imaginary value in both channels.
        advance(3,dt/2);
        const initial=read();
        let maxRelativeInvariantDrift=0;
        for (let n=0;n<steps;n++) {
          advance(0,dt); advance(1,dt,dt);
          const measured=read();
          maxRelativeInvariantDrift=Math.max(maxRelativeInvariantDrift,Math.abs(measured.norm-initial.norm)/Math.abs(initial.norm));
          for (const w of waves) {
            const a=dt*w.energy;
            w.R=[w.R[0]+a*w.plus[0],w.R[1]+a*w.plus[1]];
            w.minus=w.plus;
            w.plus=[w.minus[0]-a*w.R[0],w.minus[1]-a*w.R[1]];
          }
          for (let k=0;k<count;k++) {
            let r=0,imaginary=0;
            for (const w of waves) {
              r+=w.R[0]*w.cos[k]+w.R[1]*w.sin[k];
              imaginary+=0.5*((w.minus[0]+w.plus[0])*w.cos[k]+(w.minus[1]+w.plus[1])*w.sin[k]);
            }
            expectedExposure[k]+=dt*(r*r+imaginary*imaginary);
          }
        }
        let recurrenceError=0, detectorError=0, exactDiscreteError=0, continuumError=0;
        for (let k=0;k<count;k++) {
          let r=0,imaginary=0,exactR=0,exactI=0,continuumR=0,continuumI=0;
          for (const w of waves) {
            r+=w.R[0]*w.cos[k]+w.R[1]*w.sin[k];
            imaginary+=0.5*((w.minus[0]+w.plus[0])*w.cos[k]+(w.minus[1]+w.plus[1])*w.sin[k]);
            const angle=w.energy*elapsed;
            exactR+=w.cos[k]*Math.cos(angle)+w.sin[k]*Math.sin(angle);
            exactI+=w.sin[k]*Math.cos(angle)-w.cos[k]*Math.sin(angle);
            if (continuumTime !== undefined) {
              const energy=0.5*((TAU*w.x/physicalLength)**2+(TAU*w.y/physicalLength)**2);
              const theta=energy*continuumTime;
              continuumR+=w.cos[k]*Math.cos(theta)+w.sin[k]*Math.sin(theta);
              continuumI+=w.sin[k]*Math.cos(theta)-w.cos[k]*Math.sin(theta);
            }
          }
          const actualR=pixels[4*k],actualI=0.5*(pixels[4*k+1]+pixels[4*k+3]);
          recurrenceError=Math.max(recurrenceError,Math.abs(actualR-r),Math.abs(actualI-imaginary));
          detectorError=Math.max(detectorError,Math.abs(pixels[4*k+2]-expectedExposure[k]));
          exactDiscreteError=Math.max(exactDiscreteError,Math.abs(actualR-exactR),Math.abs(actualI-exactI));
          if (continuumTime !== undefined) continuumError=Math.max(continuumError,Math.abs(actualR-continuumR),Math.abs(actualI-continuumI));
        }
        for(const target of [current,next,pot]) target.dispose();
        return {label,grid:N,potential,dt,steps,elapsed,modes: waves.map(({x,y,amplitude,energy})=>({x,y,amplitude,discreteEnergy:energy})),
          recurrenceError,detectorError,detectorMeanDensityError:detectorError/elapsed,exactDiscreteError,maxRelativeInvariantDrift,initialInvariant:initial.norm,
          minimumInitialLocalInvariant:initial.minDensity,relativeInitialClippingBias:(initial.clippedNorm-initial.norm)/Math.abs(initial.norm),
          ...(continuumTime===undefined?{}:{physicalLength,physicalTime:continuumTime,spacing:physicalLength/N,physicalDt:dt*(physicalLength/N)**2,continuumError})};
      }
      try {
        const modal=[];
        const modes=[
          {label:'constant-positive-potential',potential:.7,modes:[{x:0,y:0,amplitude:.4,phase:.3}]},
          {label:'traveling-mode',potential:.4,modes:[{x:3,y:2,amplitude:.4}]},
          {label:'negative-energy',potential:-.5,modes:[{x:2,y:4,amplitude:.4}]},
          {label:'nyquist-mode',potential:0,modes:[{x:16,y:16,amplitude:.4}]},
          {label:'interference-negative-local-invariant',potential:0,modes:[{x:0,y:0,amplitude:.3},{x:8,y:0,amplitude:.3}]}
        ];
        for(const mode of modes) modal.push(trial({...mode,dt:.2,steps:64}));
        const temporal=[.2,.1,.05].map(dt=>trial({label:'temporal-refinement',dt,steps:Math.round(1.6/dt),potential:.2,modes:[{x:8,y:4,amplitude:.4}]}));
        const temporalOrders=temporal.slice(1).map((r,i)=>Math.log2(temporal[i].exactDiscreteError/r.exactDiscreteError));
        // The shader has unit cell spacing. For the free equation, H_grid=h^2 H_physical.
        // T/h^2 numerical time therefore reaches the same physical T on [0,2pi)^2.
        // Keep dt_grid fixed so dt_physical=dt_grid*h^2; temporal error becomes O(h^4).
        const physicalLength=TAU,physicalTime=.5,baseSpacing=physicalLength/16;
        const spatialDt=physicalTime/(baseSpacing*baseSpacing*16);
        const spatial=[16,32,64].map(N=>trial({label:'spatial-refinement',N,dt:spatialDt,steps:16*(N/16)**2,potential:0,modes:[{x:1,y:2,amplitude:.4}],continuumTime:physicalTime,physicalLength}));
        const spatialOrders=spatial.slice(1).map((r,i)=>Math.log2(spatial[i].continuumError/r.continuumError));
        const failureControl=trial({label:'wrong-imaginary-update-sign',dt:.1,steps:16,potential:.2,modes:[{x:8,y:4,amplitude:.4}]},true);
        return {scope:'Actual float32 step shader, periodic square grids, static uniform real potentials and declared Fourier modes. Numerical recurrence, centered detector quadrature and fixed-step modified invariant; bounded temporal and free-wave spatial refinement. No absorber, hard-wall, interaction, float16, arbitrary-potential or display/export certification.',modal,temporal,temporalOrders,spatial,spatialOrders,failureControl};
      } finally {gl.deleteProgram(correct.prog);gl.deleteProgram(wrongSign.prog);}
    });
  } finally {await browser.close();}
  for(const row of [...result.modal,...result.temporal,...result.spatial]) {
    assert(row.recurrenceError<5e-6,'GPU disagrees with independent modal recurrence: '+row.label);
    // Exposure grows with numerical elapsed time; compare its error per unit time
    // so rescaled spatial fixtures use the same mean-density acceptance criterion.
    assert(row.detectorMeanDensityError<1e-6,'Centered detector quadrature mismatch: '+row.label);
    assert(row.maxRelativeInvariantDrift<1e-5,'Unclamped modified invariant drift: '+row.label);
  }
  assert(result.temporalOrders.every(p=>p>1.8&&p<2.2),'Expected second-order temporal refinement at fixed grid/time');
  assert(result.temporal.at(-1).exactDiscreteError<.001,'Fine temporal fixture exceeds its error limit');
  assert(result.spatialOrders.every(p=>p>1.8&&p<2.2),'Expected second-order spatial refinement at fixed physical domain/time');
  assert(result.spatial.at(-1).continuumError<.002,'Fine spatial fixture exceeds its error limit');
  for(const row of result.spatial) assert(Math.abs(row.elapsed*row.spacing**2-row.physicalTime)<1e-12,'Spatial fixtures changed physical elapsed time');
  const interference=result.modal.find(r=>r.label==='interference-negative-local-invariant');
  assert(interference.minimumInitialLocalInvariant<-.0005&&interference.relativeInitialClippingBias>1e-4,'Fixture must detect pointwise clipping of the modified invariant');
  assert(result.failureControl.recurrenceError>.05&&result.failureControl.recurrenceError>100*result.temporal[1].recurrenceError,'Wrong-sign update was not detected');
  console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
