// Maintained convection GPU operators versus analytic modes and independent references.
// These bounded component checks do not establish nonlinear onset or turbulent accuracy.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  let source = fs.readFileSync(path.join(root, 'src/modules/wavesflow.js'), 'utf8');
  const hookAt = source.lastIndexOf('    return {\n      aspect(s)');
  assert(hookAt > source.indexOf('function convectionCreate'), 'Convection diagnostic hook is missing');
  source = source.slice(0, hookAt) + source.slice(hookAt).replace('    return {',
    '    return { auditMeasurement(bytes) { applyMeasure(bytes, "benchmark"); return nusselt; },');
  const expose = source.slice(0, source.lastIndexOf('})();')) +
    'window.convScience={CONV_ADV_FS,CONV_DIFF_FS,CONV_SOR_FS,CONV_VEL_FS,CONV_REDUCE_FS,convDtMax};})();';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let results;
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/convection-science');
    await page.evaluate(expose);
    results = await page.evaluate(() => {
      const G = Studio.gl, sh = window.convScience, gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Convection benchmark requires float32');
      const opts = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
      const target = (W, H, data) => new G.Target(gl, W, H, data ? { ...opts, data } : opts);
      const read = t => { const values = new Float32Array(t.w * t.h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.FLOAT, values); if (gl.getError() !== gl.NO_ERROR) throw Error('GPU readback failed'); return values; };
      const free = (targets, passes) => { for (const t of targets) t.dispose(); for (const p of passes) gl.deleteProgram(p.prog); };
      const results = { diffusionCeiling: [], conduction: [], diffusionRefinement: [], wallVelocity: [], transport: [] };
      for (const N of [128, 512]) {
        const dx = 1 / (N - 1), state = { ...Studio.modules.convection.defaults, grid: N, aspect: '1:1', logRa: 3, Pr: 10, dt: .03 };
        Studio.modules.convection.sanitize(state);
        const cap = sh.convDtMax(state), data = new Float32Array(N * N * 4);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = 4 * (y * N + x); data[k] = 1 - y * dx; data[k + 1] = .001 * ((x + y) % 2 ? 1 : -1); data[k + 3] = 1; }
        const input = target(N, N, data), output = target(N, N), pass = new G.Pass(gl, sh.CONV_DIFF_FS), measurements = [];
        for (const [mode, dt] of [['corrected', state.dt], ['old-floor-control', Math.max(.00005, cap)]]) {
          pass.draw(output, { u_f: input, u_res: [N, N], u_dt: dt, u_dx: dx, u_kappa: .01, u_nu: .1 });
          const px = read(output), k = 4 * ((N / 2) * N + N / 2);
          measurements.push({ mode, dt, expectedFactor: 1 - 8 * .1 * dt / dx ** 2, measuredFactor: px[k + 1] / data[k + 1] });
        }
        results.diffusionCeiling.push({ grid: N, cap, measurements }); free([input, output], [pass]);
      }
      for (const N of [64, 128]) for (const wall of [0, 1]) {
        const dx = 1 / (N - 1), dt = .2 * dx * dx / .1, data = new Float32Array(N * N * 4);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = 4 * (y * N + x); data[k] = 1 - y * dx; data[k + 3] = 1; }
        let a = target(N, N, data), b = target(N, N); const zero = target(N, N); zero.clear(0, 0, 0, 1);
        const adv = new G.Pass(gl, sh.CONV_ADV_FS), diff = new G.Pass(gl, sh.CONV_DIFF_FS);
        for (let i = 0; i < 16; i++) {
          adv.draw(b, { u_f: a, u_vel: zero, u_res: [N, N], u_dt: dt, u_dx: dx, u_wall: { int: wall } }); [a, b] = [b, a];
          diff.draw(b, { u_f: a, u_res: [N, N], u_dt: dt, u_dx: dx, u_kappa: .01, u_nu: .1 }); [a, b] = [b, a];
        }
        const values = read(a); let maxTemperatureError = 0, maxVorticity = 0;
        for (let k = 0; k < values.length; k += 4) { maxTemperatureError = Math.max(maxTemperatureError, Math.abs(values[k] - data[k])); maxVorticity = Math.max(maxVorticity, Math.abs(values[k + 1])); }
        results.conduction.push({ grid: N, boundary: wall ? 'free-slip' : 'no-slip', steps: 16, dt, maxTemperatureError, maxVorticity }); free([a, b, zero], [adv, diff]);
      }
      // Fixed physical box [0,2) x [0,1], mode cos(pi*x) sin(pi*y), nu=.1.
      // The diffusion substep is isolated: this is not a full coupled Boussinesq solution.
      for (const cellsPerHeight of [32, 64, 128]) {
        const h = 1 / cellsPerHeight, W = 2 * cellsPerHeight, H = cellsPerHeight + 1, nu = .1, finalTime = .02;
        const steps = Math.ceil(finalTime / (.2 * h * h / nu)), dt = finalTime / steps;
        const data = new Float32Array(W * H * 4), amplitude = .1;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = 4 * (y * W + x); data[k] = 1 - y * h; data[k + 1] = y === 0 || y === H - 1 ? 0 : amplitude * Math.cos(Math.PI * x * h) * Math.sin(Math.PI * y * h); data[k + 3] = 1; }
        let a = target(W, H, data), b = target(W, H); const pass = new G.Pass(gl, sh.CONV_DIFF_FS);
        for (let i = 0; i < steps; i++) { pass.draw(b, { u_f: a, u_res: [W, H], u_dt: dt, u_dx: h, u_kappa: .01, u_nu: nu }); [a, b] = [b, a]; }
        const discreteRate = nu * 8 * Math.sin(Math.PI * h / 2) ** 2 / h ** 2;
        const discreteDecay = (1 - dt * discreteRate) ** steps, exactDecay = Math.exp(-nu * 2 * Math.PI ** 2 * finalTime), values = read(a);
        let discreteError = 0, continuumError = 0;
        for (let k = 0; k < values.length; k += 4) { discreteError = Math.max(discreteError, Math.abs(values[k + 1] - data[k + 1] * discreteDecay)); continuumError = Math.max(continuumError, Math.abs(values[k + 1] - data[k + 1] * exactDecay)); }
        results.diffusionRefinement.push({ cellsPerHeight, width: W, height: H, dt, steps, finalTime, discreteError, continuumError }); free([a, b], [pass]);
      }
      for (const N of [64, 128, 256]) {
        const dx = 1 / (N - 1), data = new Float32Array(N * N * 4);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = 4 * (y * N + x); data[k] = y === N - 1 ? 0 : Math.sin(Math.PI * y * dx); data[k + 3] = 1; }
        const input = target(N, N, data), output = target(N, N), pass = new G.Pass(gl, sh.CONV_VEL_FS);
        pass.draw(output, { u_psi: input, u_res: [N, N], u_dx: dx, u_wall: { int: 1 } }); const values = read(output);
        const bottom = values[1], top = values[4 * (N - 1) * N + 1];
        results.wallVelocity.push({ grid: N, bottom, top, maxError: Math.max(Math.abs(bottom - Math.PI), Math.abs(top + Math.PI)), historicalHalfDerivativeError: Math.abs(bottom / 2 - Math.PI) });
        free([input, output], [pass]);
      }
      // Poisson inversion and buoyancy signs against manufactured analytic functions.
      {
        const W = 64, H = 33, h = 1 / 32, amplitude = .05, eigenvalue = 8 * Math.sin(Math.PI * h / 2) ** 2 / h ** 2;
        const data = new Float32Array(W * H * 4), expected = new Float32Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x, wave = y === 0 || y === H - 1 ? 0 : Math.cos(Math.PI * x * h) * Math.sin(Math.PI * y * h);
          expected[i] = amplitude * wave; data[4 * i] = 1 - y * h; data[4 * i + 1] = eigenvalue * amplitude * wave; data[4 * i + 3] = 1;
        }
        const field = target(W, H, data); let a = target(W, H), b = target(W, H); a.clear(0, 0, 0, 1); b.clear(0, 0, 0, 1);
        const sor = new G.Pass(gl, sh.CONV_SOR_FS);
        for (let i = 0; i < 300; i++) for (const parity of [0, 1]) { sor.draw(b, { u_psi: a, u_f: field, u_res: [W, H], u_dx: h, u_omega: 1.6, u_parity: { int: parity } }); [a, b] = [b, a]; }
        const values = read(a); let maxError = 0; for (let i = 0; i < expected.length; i++) maxError = Math.max(maxError, Math.abs(values[4 * i] - expected[i]));
        results.poisson = { width: W, height: H, sweeps: 300, maxError, note: 'Converged manufactured solve; not a certificate for the default four sweeps.' }; free([field, a, b], [sor]);
        for (let i = 0; i < expected.length; i++) { data[4 * i] += expected[i]; data[4 * i + 1] = 0; }
        const input = target(W, H, data), output = target(W, H), diff = new G.Pass(gl, sh.CONV_DIFF_FS), wrong = new G.Pass(gl, sh.CONV_DIFF_FS.replace('u_nu * lap.y + Tx', 'u_nu * lap.y - Tx'));
        const errors = [];
        for (const pass of [diff, wrong]) {
          pass.draw(output, { u_f: input, u_res: [W, H], u_dt: .001, u_dx: h, u_kappa: .01, u_nu: .1 }); const values = read(output); let maxError = 0;
          for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) { const expectedOmega = -.001 * amplitude * Math.sin(Math.PI * x * h) * Math.sin(Math.PI * y * h) * Math.sin(Math.PI * h) / h; maxError = Math.max(maxError, Math.abs(values[4 * (y * W + x) + 1] - expectedOmega)); }
          errors.push(maxError);
        }
        results.buoyancy = { maxError: errors[0], reversedSignError: errors[1] }; free([input, output], [diff, wrong]);
      }
      // Independently sum the full manufactured field; N=256 means every cell is sampled once.
      for (const sign of [0, 1, -1]) {
        const N = 256, dx = 1 / (N - 1), field = new Float32Array(N * N * 4), velocity = new Float32Array(field.length);
        let expectedFlux = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const k = 4 * (y * N + x), wave = Math.cos(2 * Math.PI * x / N) * Math.sin(Math.PI * y / (N - 1));
          field[k] = 1 - y * dx + .1 * wave; field[k + 3] = 1; velocity[k + 2] = sign * .2 * wave; velocity[k + 3] = 1;
          expectedFlux += field[k] * velocity[k + 2];
        }
        expectedFlux /= N * N;
        const f = target(N, N, field), v = target(N, N, velocity), reduced = new G.Target(gl, 32, 32, { type: 'rgba8', filter: 'nearest' }), pass = new G.Pass(gl, sh.CONV_REDUCE_FS);
        pass.draw(reduced, { u_f: f, u_vel: v, u_res: [N, N], u_block: [N / 32, N / 32], u_dx: dx });
        const bytes = new Uint8Array(32 * 32 * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, reduced.fbo); gl.readPixels(0, 0, 32, 32, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        let measuredFlux = 0; for (let i = 0; i < 32 * 32; i++) measuredFlux += (bytes[4 * i] * 256 + bytes[4 * i + 1] - 32768) / 65534; measuredFlux /= 32 * 32;
        results.transport.push({ sign, expectedFlux, measuredFlux, error: Math.abs(measuredFlux - expectedFlux), instantaneousNuAtRa10000Pr1: 1 + 100 * measuredFlux, conductionNuAtMaxRaPr: 1 + 1e4 * measuredFlux }); free([f, v, reduced], [pass]);
      }
      // Exercise the actual diagnostic decoder/status path, including negative and saturated input.
      {
        const mod = Studio.modules.convection, palette = Studio.PALETTES[mod.defaultPalette];
        const state = { ...mod.defaults, grid: 96, aspect: '1:1', warmup: 0, running: false, logRa: 4, Pr: 1, palette: palette.colors, bg: palette.bg };
        mod.sanitize(state); let status = '';
        const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
        const instance = mod.create({ canvas, getState: () => state, setStatus(value) { status = value; },
          isActive: () => false, reducedMotion: () => true, requestRepaint() {}, fault(message) { throw Error(message); } });
        instance.regenerate(); instance.pause();
        const diagnosticStatus = [];
        for (const code of [32768, Math.round(-.005 * 65534) + 32768, 65535]) {
          const bytes = new Uint8Array(32 * 32 * 4);
          for (let i = 0; i < 32 * 32; i++) { bytes[4 * i] = Math.floor(code / 256); bytes[4 * i + 1] = code % 256; }
          const value = instance.auditMeasurement(bytes);
          diagnosticStatus.push({ code, value: Number.isFinite(value) ? value : null, status });
        }
        instance.pause(); results.diagnosticStatus = diagnosticStatus;
      }
      return results;
    });
  } finally { await browser.close(); }
  for (const row of results.diffusionCeiling) {
    const corrected = row.measurements[0]; assert(corrected.dt <= row.cap, 'Diffusion ceiling was overridden');
    assert(Math.abs(corrected.measuredFactor) < .61, 'Corrected grid-scale mode grew');
    assert(Math.abs(corrected.measuredFactor - corrected.expectedFactor) < 3e-6, 'Diffusion mode disagrees with analytic stencil');
    if (row.grid === 512) assert(Math.abs(row.measurements[1].measuredFactor) > 9, 'Old timestep floor was not detected');
  }
  for (const row of results.conduction) { assert(row.maxTemperatureError < 3e-7); assert.equal(row.maxVorticity, 0); }
  for (const row of results.diffusionRefinement) assert(row.discreteError < 5e-7, 'Analytic discrete diffusion disagreement');
  for (let i = 1; i < results.diffusionRefinement.length; i++) assert(results.diffusionRefinement[i].continuumError < results.diffusionRefinement[i - 1].continuumError * .45, 'Fixed-domain diffusion refinement failed');
  for (const row of results.wallVelocity) { assert(row.maxError < .0014); assert(row.historicalHalfDerivativeError > 1.5); }
  assert(results.wallVelocity[2].maxError < results.wallVelocity[0].maxError / 10, 'Wall derivative did not converge');
  assert(results.poisson.maxError < 2e-6, 'Poisson manufactured solution mismatch');
  assert(results.buoyancy.maxError < 2e-8); assert(results.buoyancy.reversedSignError > 1e-4);
  for (const row of results.transport) assert(row.error <= .5 / 65534 + 1e-7, 'Transport encoding exceeds its quantization bound');
  assert.equal(results.transport[0].measuredFlux, 0, 'Zero transport must encode exactly');
  assert(results.transport[2].instantaneousNuAtRa10000Pr1 < 1, 'Signed transient transport was hidden');
  assert.equal(results.diagnosticStatus[0].value, 1);
  assert(results.diagnosticStatus[1].value < 1 && results.diagnosticStatus[1].status.includes('0.5</b>'), 'Diagnostic display forced a transient value up to one');
  assert(results.diagnosticStatus[2].value === null && results.diagnosticStatus[2].status.includes('out of range'), 'Saturated diagnostic must be marked unavailable');
  console.log(JSON.stringify({ scope: 'Float32 GPU operator benchmarks and signed diagnostic encoding. Fixed-domain scalar diffusion refinement; not full nonlinear Boussinesq convergence, onset, turbulence or print validation.', results }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
