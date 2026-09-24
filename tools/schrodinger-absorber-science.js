// node tools/schrodinger-absorber-science.js
// Actual float32 GPU step with absorber and long-time free phase against independent Float64 refs.
// Subtract-before-add: wrong-sign damp must fail; correct path must pass stated criteria.
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');

(async () => {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'src/modules/wavesflow.js'), 'utf8');
  const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
  const closing = source.lastIndexOf('})();');
  assert(closing >= 0, 'Wave module closure is missing');
  const expose = source.slice(0, closing) + 'window.schrodingerShaders = { step: SCH_STEP_FS };\n' + source.slice(closing);
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: glArgs() });
  let result;
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/schrodinger-absorber-science');
    await page.evaluate(expose);
    result = await page.evaluate(() => {
      const G = Studio.gl, gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Schrodinger absorber benchmark requires WebGL2 float32 render targets');
      const shader = window.schrodingerShaders.step;
      const dampTerm = 'exp(-u_dt * u_damp * pot.b)';
      if (!shader.includes(dampTerm)) throw Error('Absorber damp marker is missing');
      const correct = new G.Pass(gl, shader);
      const wrongDamp = new G.Pass(gl, shader.replace(dampTerm, 'exp(+u_dt * u_damp * pot.b)'));
      const TAU = 2 * Math.PI;
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const backend = {
        userAgent: navigator.userAgent,
        renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)
      };

      function edgeAbsorberWeight(x, y, N, absorbFraction) {
        const layer = absorbFraction * N;
        if (layer < 1) return 0;
        const edge = Math.min(Math.min(x, N - 1 - x), Math.min(y, N - 1 - y));
        const a = Math.max(0, Math.min(1, 1 - edge / layer));
        return a * a;
      }

      function float64Evolve({ N, dt, steps, V, dampStrength, bGrid, R0, I0, mutantDamp = false }) {
        const count = N * N;
        const R = new Float64Array(R0), plus = new Float64Array(I0), minus = new Float64Array(I0);
        const at = (field, x, y) => field[((y % N + N) % N) * N + ((x % N + N) % N)];
        const lap = (field, x, y) => at(field, x + 1, y) + at(field, x - 1, y) + at(field, x, y + 1) + at(field, x, y - 1) - 4 * at(field, x, y);
        const dampOf = (k, step) => Math.exp((mutantDamp ? 1 : -1) * step * dampStrength * bGrid[k]);
        const half = (step) => {
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const k = y * N + x;
            const HR = -0.5 * lap(R, x, y) + V[k] * R[k];
            const I = (plus[k] - step * HR) * dampOf(k, step);
            minus[k] = 2 * plus[k] - I;
            plus[k] = I;
          }
        };
        const realStep = (step) => {
          const nextR = new Float64Array(count);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const k = y * N + x;
            const HI = -0.5 * lap(plus, x, y) + V[k] * plus[k];
            nextR[k] = (R[k] + step * HI) * dampOf(k, step);
          }
          R.set(nextR);
        };
        const imagStep = (step) => {
          const nextPlus = new Float64Array(count);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const k = y * N + x;
            const HR = -0.5 * lap(R, x, y) + V[k] * R[k];
            nextPlus[k] = (plus[k] - step * HR) * dampOf(k, step);
          }
          minus.set(plus);
          plus.set(nextPlus);
        };
        half(dt / 2);
        for (let n = 0; n < steps; n++) { realStep(dt); imagStep(dt); }
        return { R, plus, minus };
      }

      function modalDamped({ energy, dt, steps, damp, mutantDamp = false }) {
        let R = [1, 0], I = [0, 1];
        const applyHalf = (step, stateR, stateI) => {
          const a = step * energy;
          const factor = Math.exp((mutantDamp ? 1 : -1) * step * damp);
          const nextI = [(stateI[0] - a * stateR[0]) * factor, (stateI[1] - a * stateR[1]) * factor];
          return { R: stateR, plus: nextI, minus: [2 * stateI[0] - nextI[0], 2 * stateI[1] - nextI[1]] };
        };
        const applyReal = (step, state) => {
          const a = step * energy;
          const factor = Math.exp((mutantDamp ? 1 : -1) * step * damp);
          return { R: [(state.R[0] + a * state.plus[0]) * factor, (state.R[1] + a * state.plus[1]) * factor], plus: state.plus, minus: state.minus };
        };
        const applyImag = (step, state) => {
          const a = step * energy;
          const factor = Math.exp((mutantDamp ? 1 : -1) * step * damp);
          return { R: state.R, plus: [(state.plus[0] - a * state.R[0]) * factor, (state.plus[1] - a * state.R[1]) * factor], minus: state.plus };
        };
        let state = applyHalf(dt / 2, R, I);
        for (let n = 0; n < steps; n++) { state = applyReal(dt, state); state = applyImag(dt, state); }
        return state;
      }

      function gpuTrial({ label, N = 32, potential = 0, dt, steps, modes, dampStrength = 0, absorber = 'none', absorbFraction = 0.1, mutant = false }) {
        const count = N * N;
        const data = new Float32Array(count * 4);
        const potData = new Float32Array(count * 4);
        const V = new Float64Array(count);
        const bGrid = new Float64Array(count);
        const R0 = new Float64Array(count);
        const I0 = new Float64Array(count);
        const wavePrep = modes.map(m => {
          const kx = TAU * m.x / N, ky = TAU * m.y / N;
          const energy = 2 - Math.cos(kx) - Math.cos(ky) + potential;
          const cos = new Float64Array(count), sin = new Float64Array(count);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const k = y * N + x, phase = kx * x + ky * y + (m.phase || 0);
            cos[k] = m.amplitude * Math.cos(phase);
            sin[k] = m.amplitude * Math.sin(phase);
          }
          return { ...m, energy, cos, sin };
        });
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const k = y * N + x;
          let r = 0, im = 0;
          for (const w of wavePrep) { r += w.cos[k]; im += w.sin[k]; }
          data[4 * k] = r; data[4 * k + 1] = im; data[4 * k + 3] = im;
          R0[k] = r; I0[k] = im;
          V[k] = potential;
          potData[4 * k] = potential;
          let b = 0;
          if (absorber === 'uniform') b = 1;
          else if (absorber === 'edge') b = edgeAbsorberWeight(x, y, N, absorbFraction);
          bGrid[k] = b;
          potData[4 * k + 2] = b;
        }
        const options = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
        let current = new G.Target(gl, N, N, { ...options, data }), next = new G.Target(gl, N, N, options);
        const pot = new G.Target(gl, N, N, { ...options, data: potData });
        const pixels = new Float32Array(count * 4);
        const pass = mutant ? wrongDamp : correct;
        const advance = (phase, step, exposureStep = 0) => {
          pass.draw(next, { u_p: current, u_pot: pot, u_res: [N, N], u_dt: step, u_dtE: exposureStep, u_damp: dampStrength, u_phase: { int: phase } });
          [current, next] = [next, current];
        };
        const read = () => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, current.fbo);
          gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, pixels);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Schrodinger absorber readback failed');
        };
        advance(3, dt / 2);
        for (let n = 0; n < steps; n++) { advance(0, dt); advance(1, dt); }
        read();

        const ref = float64Evolve({ N, dt, steps, V, dampStrength, bGrid, R0, I0, mutantDamp: false });
        let recurrenceError = 0, maxAbsPsi = 0, remainingNorm = 0, initialNorm = 0;
        for (let k = 0; k < count; k++) {
          initialNorm += R0[k] * R0[k] + I0[k] * I0[k];
          const actualR = pixels[4 * k], actualI = 0.5 * (pixels[4 * k + 1] + pixels[4 * k + 3]);
          const refI = 0.5 * (ref.plus[k] + ref.minus[k]);
          recurrenceError = Math.max(recurrenceError, Math.abs(actualR - ref.R[k]), Math.abs(actualI - refI));
          maxAbsPsi = Math.max(maxAbsPsi, Math.hypot(actualR, actualI));
          remainingNorm += actualR * actualR + actualI * actualI;
        }

        let modalError = null, exactDiscreteError = null, phaseError = null;
        const uniformAbsorber = absorber === 'uniform' || (absorber === 'none' && dampStrength === 0);
        if (uniformAbsorber && modes.length === 1) {
          const w = wavePrep[0];
          const modal = modalDamped({ energy: w.energy, dt, steps, damp: dampStrength * (absorber === 'uniform' ? 1 : 0) });
          let modalMax = 0, exactMax = 0;
          const elapsed = steps * dt;
          let cR = 0, cI = 0, normMode = 0;
          for (let k = 0; k < count; k++) {
            const r = modal.R[0] * w.cos[k] + modal.R[1] * w.sin[k];
            const imag = 0.5 * ((modal.minus[0] + modal.plus[0]) * w.cos[k] + (modal.minus[1] + modal.plus[1]) * w.sin[k]);
            const actualR = pixels[4 * k], actualI = 0.5 * (pixels[4 * k + 1] + pixels[4 * k + 3]);
            modalMax = Math.max(modalMax, Math.abs(actualR - r), Math.abs(actualI - imag));
            const angle = w.energy * elapsed;
            const exactR = w.cos[k] * Math.cos(angle) + w.sin[k] * Math.sin(angle);
            const exactI = w.sin[k] * Math.cos(angle) - w.cos[k] * Math.sin(angle);
            exactMax = Math.max(exactMax, Math.abs(actualR - exactR), Math.abs(actualI - exactI));
            cR += actualR * w.cos[k] + actualI * w.sin[k];
            cI += actualI * w.cos[k] - actualR * w.sin[k];
            normMode += w.cos[k] * w.cos[k] + w.sin[k] * w.sin[k];
          }
          cR /= normMode; cI /= normMode;
          let dPhase = Math.atan2(cI, cR) + w.energy * elapsed;
          while (dPhase > Math.PI) dPhase -= TAU;
          while (dPhase < -Math.PI) dPhase += TAU;
          modalError = modalMax;
          exactDiscreteError = exactMax;
          phaseError = Math.abs(dPhase);
        }

        for (const target of [current, next, pot]) target.dispose();
        return {
          label, grid: N, potential, dt, steps, elapsed: steps * dt, dampStrength, absorber, absorbFraction: absorber === 'edge' ? absorbFraction : 0,
          modes: wavePrep.map(({ x, y, amplitude, energy }) => ({ x, y, amplitude, discreteEnergy: energy })),
          recurrenceError, modalError, exactDiscreteError, phaseError,
          remainingNorm, initialNorm, remainingNormFraction: remainingNorm / initialNorm, maxAbsPsi
        };
      }

      try {
        const uniform = [
          gpuTrial({ label: 'uniform-absorber-traveling', N: 32, potential: 0.25, dt: 0.1, steps: 40, dampStrength: 0.8, absorber: 'uniform', modes: [{ x: 3, y: 2, amplitude: 0.35 }] }),
          gpuTrial({ label: 'uniform-absorber-negative-V', N: 32, potential: -0.4, dt: 0.1, steps: 40, dampStrength: 1.0, absorber: 'uniform', modes: [{ x: 2, y: 1, amplitude: 0.35 }] }),
          gpuTrial({ label: 'uniform-absorber-constant', N: 32, potential: 0.5, dt: 0.12, steps: 32, dampStrength: 0.6, absorber: 'uniform', modes: [{ x: 0, y: 0, amplitude: 0.4, phase: 0.2 }] })
        ];
        const absorbTime = 2.0;
        const temporal = [0.2, 0.1, 0.05].map(dt => gpuTrial({
          label: 'absorber-temporal-refinement', N: 32, potential: 0.2, dt, steps: Math.round(absorbTime / dt),
          dampStrength: 0.7, absorber: 'uniform', modes: [{ x: 4, y: 2, amplitude: 0.35 }]
        }));
        const edge = [
          gpuTrial({ label: 'edge-absorber-packet-mode', N: 48, potential: 0, dt: 0.1, steps: 60, dampStrength: 0.9, absorber: 'edge', absorbFraction: 0.12, modes: [{ x: 5, y: 0, amplitude: 0.3 }] }),
          gpuTrial({ label: 'edge-absorber-with-V', N: 48, potential: 0.3, dt: 0.08, steps: 50, dampStrength: 1.1, absorber: 'edge', absorbFraction: 0.15, modes: [{ x: 3, y: 3, amplitude: 0.3 }] })
        ];
        const longTime = [
          gpuTrial({ label: 'long-time-phase-traveling', N: 32, potential: 0, dt: 0.05, steps: 2400, dampStrength: 0, absorber: 'none', modes: [{ x: 8, y: 4, amplitude: 0.4 }] }),
          gpuTrial({ label: 'long-time-phase-with-V', N: 32, potential: 0.5, dt: 0.05, steps: 2400, dampStrength: 0, absorber: 'none', modes: [{ x: 6, y: 3, amplitude: 0.4 }] })
        ];
        const failureControl = gpuTrial({
          label: 'wrong-absorber-damp-sign', N: 32, potential: 0.2, dt: 0.1, steps: 24,
          dampStrength: 0.9, absorber: 'uniform', modes: [{ x: 4, y: 2, amplitude: 0.35 }], mutant: true
        });
        return {
          scope: 'Actual float32 SCH_STEP_FS with uniform and production-shaped edge absorbers (pot.b weight, damp=exp(-dt*damp*b)), plus long-time free/uniform-V phase. Independent Float64 stencil twin and modal damped recurrence on SwiftShader RGBA32F. No scattering coefficients, hard walls, float16, arbitrary packets or print certification.',
          sourceSha256: null,
          backend,
          uniform,
          temporal,
          edge,
          longTime,
          failureControl
        };
      } finally {
        gl.deleteProgram(correct.prog);
        gl.deleteProgram(wrongDamp.prog);
      }
    });
  } finally {
    await browser.close();
  }

  result.sourceSha256 = sourceSha256;
  for (const row of result.longTime) row.periods = row.elapsed * row.modes[0].discreteEnergy / (2 * Math.PI);
  result.command = 'node tools/schrodinger-absorber-science.js';
  result.harnessSha256 = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');

  for (const row of [...result.uniform, ...result.temporal, ...result.edge]) {
    assert(row.recurrenceError < 5e-6, 'GPU disagrees with independent Float64 absorber twin: ' + row.label + ' err=' + row.recurrenceError);
  }
  for (const row of result.uniform) {
    assert(row.modalError !== null && row.modalError < 5e-6, 'Uniform absorber disagrees with modal damp recurrence: ' + row.label);
    assert(row.remainingNormFraction < 0.5, 'Uniform absorber did not remove substantial amplitude: ' + row.label);
  }
  assert(result.temporal.every(r => r.recurrenceError < 5e-6), 'Absorber temporal fixtures exceed twin tolerance');
  assert(result.temporal.at(-1).remainingNormFraction < result.temporal[0].remainingNormFraction * 1.05,
    'Finer absorber steps unexpectedly retained more norm than the coarse run');
  for (const row of result.edge) {
    assert(row.remainingNormFraction < 0.95, 'Edge absorber removed almost no amplitude: ' + row.label);
  }
  for (const row of result.longTime) {
    assert(row.recurrenceError < 5e-6, 'Long-time GPU disagrees with Float64 Visscher twin: ' + row.label);
    assert(row.phaseError !== null && row.phaseError < 0.08, 'Long-time phase error exceeds limit: ' + row.label + ' phase=' + row.phaseError);
    assert(row.exactDiscreteError !== null && row.exactDiscreteError < 0.08, 'Long-time exact discrete error exceeds limit: ' + row.label);
  }
  assert(
    result.failureControl.recurrenceError > 0.05 &&
    result.failureControl.recurrenceError > 100 * result.uniform[0].recurrenceError,
    'Wrong-sign absorber damp was not detected'
  );
  assert(result.failureControl.remainingNormFraction > 1.5, 'Wrong-sign damp did not amplify amplitude');

  result.pass = true;
  result.limitations = [
    'Uniform and production-shaped edge absorbers on periodic float32 grids only; wrap still couples opposite edges through the absorber layer.',
    'Independent references are the Float64 stencil twin of this implementation and modal damped recurrence for uniform b. Not continuum PML accuracy or experimental absorption.',
    'Long-time phase covers two free/uniform-V traveling modes over elapsed time 120 (~25 periods); not chaotic, interacting, or arbitrary-potential long runs.',
    'No scattering probabilities, hard-wall stadium, packet injection, float16, aspect-ratio or hardware certification.'
  ];

  const outPath = path.join(root, 'validation/results/schrodinger-absorber-science.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
