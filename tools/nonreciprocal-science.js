// node tools/nonreciprocal-science.js [--write]
// Actual GPU kernels versus independent float64 derivatives/RK4 and exact plane waves.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/nonreciprocal.js'), 'utf8');
const TAU = 2 * Math.PI;
const at = (x, y, W, H) => 4 * (((y + H) % H) * W + (x + W) % W);
function rhs(z, p) {
  const { W, H, dx, K, a0, a1 } = p, mu = new Float64Array(z.length), out = new Float64Array(z.length);
  function lap(a, x, y, c) {
    return (a[at(x + 1, y, W, H) + c] + a[at(x - 1, y, W, H) + c] +
      a[at(x, y + 1, W, H) + c] + a[at(x, y - 1, W, H) + c] - 4 * a[at(x, y, W, H) + c]) / dx ** 2;
  }
  // Two-pass chemical-potential/divergence form, independent of the GPU fused biharmonic stencil.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = at(x, y, W, H), r = z[k], i = z[k + 1], amplitude2 = r * r + i * i;
    mu[k] = -r + amplitude2 * r - a0 * i + a1 * amplitude2 * i - K * lap(z, x, y, 0);
    mu[k + 1] = -i + amplitude2 * i + a0 * r - a1 * amplitude2 * r - K * lap(z, x, y, 1);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = at(x, y, W, H); out[k] = lap(mu, x, y, 0); out[k + 1] = lap(mu, x, y, 1);
  }
  return out;
}
const add = (a, b, scale) => Float64Array.from(a, (v, i) => v + scale * b[i]);
function heun(z, p, dt) { const a = rhs(z, p), b = rhs(add(z, a, dt), p); return Float64Array.from(z, (v, i) => v + dt * (a[i] + b[i]) / 2); }
function rk4(z, p, dt, count) {
  z = Float64Array.from(z);
  for (let n = 0; n < count; n++) {
    const a = rhs(z, p), b = rhs(add(z, a, dt / 2), p), c = rhs(add(z, b, dt / 2), p), d = rhs(add(z, c, dt), p);
    z = Float64Array.from(z, (v, i) => v + dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6);
  }
  return z;
}
function difference(a, b) { let max = 0, sum = 0; for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 2; c++) { const d = a[i + c] - b[i + c]; max = Math.max(max, Math.abs(d)); sum += d * d; } return { max, rms: Math.sqrt(sum / (a.length / 2)) }; }
function preparation(p) {
  const z = new Float32Array(p.W * p.H * 4);
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
    const k = at(x, y, p.W, p.H);
    z[k] = .18 + .3 * Math.sin(TAU * (2 * x / p.W + y / p.H)) + .08 * Math.cos(TAU * (3 * x / p.W - 2 * y / p.H));
    z[k + 1] = -.12 + .25 * Math.cos(TAU * (x / p.W - 2 * y / p.H)) + .1 * Math.sin(TAU * (3 * x / p.W + y / p.H));
    z[k + 3] = 1;
  }
  return z;
}
function plane(p, mx, my, continuum = false, time = 0) {
  const q = continuum ? (TAU * mx / (p.W * p.dx)) ** 2 + (TAU * my / (p.H * p.dx)) ** 2 :
    4 * (Math.sin(Math.PI * mx / p.W) ** 2 + Math.sin(Math.PI * my / p.H) ** 2) / p.dx ** 2;
  assert(1 - p.K * q > 0, 'plane wave amplitude exists');
  const amplitude = Math.sqrt(1 - p.K * q), omega = q * (p.a0 - p.a1 * amplitude ** 2), z = new Float64Array(p.W * p.H * 4);
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
    const k = at(x, y, p.W, p.H), phase = TAU * (mx * x / p.W + my * y / p.H) + .31 - omega * time;
    z[k] = amplitude * Math.cos(phase); z[k + 1] = amplitude * Math.sin(phase); z[k + 3] = 1;
  }
  return { values: z, q, amplitude, omega };
}
(async () => {
  const nonlinear = { W: 16, H: 16, dx: 1, K: .5, a0: .7, a1: .4 }, initial = preparation(nonlinear), T = .2;
  const reference = rk4(initial, nonlinear, .00025, 800), finerReference = rk4(initial, nonlinear, .000125, 1600);
  const referenceSensitivity = difference(reference, finerReference); assert(referenceSensitivity.max < 1e-9);
  const fixtures = [];
  const component = { W: 16, H: 12, dx: .75, K: .7, a0: 1.3, a1: -.8 }, componentInitial = preparation(component);
  fixtures.push({ name: 'nonlinear-rhs', kind: 'rhs', p: component, initial: [...componentInitial], expected: [...rhs(componentInitial, component)], dt: .0005, steps: 0, tolerance: 5e-5 });
  fixtures.push({ name: 'nonlinear-heun-step', p: component, initial: [...componentInitial], expected: [...heun(componentInitial, component, .0005)], dt: .0005, steps: 1, tolerance: 2e-7 });
  for (const dt of [.02, .01, .005]) fixtures.push({ name: 'temporal-' + dt, p: nonlinear, initial: [...initial], expected: [...finerReference], dt, steps: Math.round(T / dt), tolerance: .001, time: T });
  const modeCases = [
    [{ W: 32, H: 24, dx: 1, K: 1, a0: 3, a1: 1 }, 2, 1],
    [{ W: 32, H: 32, dx: 1, K: .5, a0: -1, a1: .7 }, 3, 2],
    [{ W: 64, H: 32, dx: .75, K: 1.5, a0: 1, a1: -1 }, 2, 1]
  ];
  for (const [i, [p, mx, my]] of modeCases.entries()) {
    const start = plane(p, mx, my), end = plane(p, mx, my, false, .5);
    fixtures.push({ name: 'discrete-mode-' + i, p, initial: [...Float32Array.from(start.values)], expected: [...end.values], dt: .001, steps: 500, time: .5,
      mode: [mx, my], amplitude: start.amplitude, omega: start.omega, tolerance: 8e-6 });
  }
  for (const N of [16, 32, 64]) {
    const p = { W: N, H: N, dx: 32 / N, K: 1, a0: 2, a1: .5 }, start = plane(p, 2, 1, true), end = plane(p, 2, 1, true, .2);
    fixtures.push({ name: 'spatial-' + N, p, initial: [...Float32Array.from(start.values)], expected: [...end.values], dt: .0002, steps: 1000, time: .2, physicalDomain: [32, 32], tolerance: .01 });
    if (N === 64) fixtures.push({ name: 'spatial-64-half-step', p, initial: [...Float32Array.from(start.values)], expected: [...end.values], dt: .0001, steps: 2000, time: .2, physicalDomain: [32, 32], tolerance: .01 });
  }
  const flat = new Float32Array(16 * 16 * 4); for (let i = 0; i < flat.length; i += 4) { flat[i] = .3; flat[i + 1] = -.2; flat[i + 3] = 1; }
  fixtures.push({ name: 'uniform-stationary', p: nonlinear, initial: [...flat], expected: [...flat], dt: .001, steps: 100, tolerance: 1e-7 });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/nonreciprocal-science');
    await page.evaluate(source.replace('  Studio.register({', '  window.nrchAudit = { RHS_FS, MIX_FS, timeStep, LIMIT };\n  Studio.register({'));
    const measured = await page.evaluate(fixtures => {
      const G = Studio.gl, A = window.nrchAudit, gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Float32 WebGL2 required');
      const rhs = new G.Pass(gl, A.RHS_FS), mix = new G.Pass(gl, A.MIX_FS);
      function mutate(before, after) { if (!A.RHS_FS.includes(before)) throw Error('Mutation did not apply'); return new G.Pass(gl, A.RHS_FS.replace(before, after)); }
      const wrongSign = mutate('vec2(-z.y,z.x)', 'vec2(z.y,-z.x)');
      const missingNonlinear = mutate('float r2=dot(z,z);', 'float r2=0.0;');
      const wrongBiharmonic = mutate('chemical-u_K*biharm', 'chemical+u_K*biharm');
      const leak = new G.Pass(gl, A.MIX_FS.replace('b+u_dt*k', 'b+u_dt*(k+vec2(0.01,-0.02))'));
      function run(f, derivative = rhs, mixing = mix) {
        const p = f.p, opts = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
        const state = new G.PingPong(gl, p.W, p.H, opts), k1 = new G.Target(gl, p.W, p.H, opts), k2 = new G.Target(gl, p.W, p.H, opts), stage = new G.Target(gl, p.W, p.H, opts);
        const initial = Float32Array.from(f.initial); state.read.upload(initial);
        const u = { u_size: { ivec: [p.W, p.H] }, u_dx: p.dx, u_K: p.K, u_a0: p.a0, u_a1: p.a1 };
        let field;
        try {
          if (f.kind === 'rhs') { derivative.draw(k1, { ...u, u_state: state.read }); field = k1; }
          else {
            for (let n = 0; n < f.steps; n++) {
              derivative.draw(k1, { ...u, u_state: state.read });
              mixing.draw(stage, { u_base: state.read, u_k1: k1, u_k2: k1, u_dt: f.dt, u_correct: { int: 0 } });
              derivative.draw(k2, { ...u, u_state: stage });
              mixing.draw(state.write, { u_base: state.read, u_k1: k1, u_k2: k2, u_dt: f.dt, u_correct: { int: 1 } }); state.swap();
            }
            field = state.read;
          }
          const values = new Float32Array(initial.length); gl.bindFramebuffer(gl.FRAMEBUFFER, field.fbo);
          gl.readPixels(0, 0, p.W, p.H, gl.RGBA, gl.FLOAT, values); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Readback failed');
          let max = 0, sum = 0; const drift = [0, 0], mean = [0, 0];
          for (let k = 0; k < values.length; k += 4) for (let c = 0; c < 2; c++) {
            if (!Number.isFinite(values[k + c])) throw Error('Nonfinite field');
            const d = values[k + c] - f.expected[k + c]; max = Math.max(max, Math.abs(d)); sum += d * d;
            mean[c] += values[k + c] / (p.W * p.H);
            drift[c] += (values[k + c] - initial[k + c]) / (p.W * p.H);
          }
          return { name: f.name, grid: [p.W, p.H], parameters: p, dt: f.dt, steps: f.steps, time: f.time,
            physicalDomain: f.physicalDomain, mode: f.mode, amplitude: f.amplitude, omega: f.omega,
            error: { max, rms: Math.sqrt(sum / (p.W * p.H * 2)) }, mean, meanDrift: drift, tolerance: f.tolerance };
        } finally { state.dispose(); k1.dispose(); k2.dispose(); stage.dispose(); }
      }
      const rows = fixtures.map(f => run(f));
      const mode = fixtures.find(f => f.name === 'discrete-mode-0'), component = fixtures[0], flat = fixtures.find(f => f.name === 'uniform-stationary');
      const controls = { wrongCouplingSign: run(mode, wrongSign), missingNonlinearity: run(component, missingNonlinear), wrongBiharmonicSign: run(component, wrongBiharmonic), massLeak: run(flat, rhs, leak) };
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return { rows, controls, backend: { userAgent: navigator.userAgent, renderer: gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) } };
    }, fixtures);
    for (const row of measured.rows) {
      assert(row.error.max < row.tolerance, row.name + ' reference error ' + JSON.stringify(row));
      if (row.name !== 'nonlinear-rhs') assert(Math.max(...row.meanDrift.map(Math.abs)) < 2e-6, row.name + ' conserved means');
      else assert(Math.max(...row.mean.map(Math.abs)) < 2e-6, 'RHS sums to zero');
    }
    const temporal = measured.rows.filter(r => r.name.startsWith('temporal-'));
    const spatial = measured.rows.filter(r => /^spatial-\d+$/.test(r.name));
    for (const rows of [temporal, spatial]) for (let i = 1; i < rows.length; i++) {
      rows[i].observedOrder = Math.log2(rows[i - 1].error.rms / rows[i].error.rms);
      assert(rows[i].observedOrder > 1.7 && rows[i].observedOrder < 2.3, rows[i].name + ' second-order trend ' + rows[i].observedOrder);
    }
    const fine = spatial.at(-1), half = measured.rows.find(r => r.name === 'spatial-64-half-step');
    const halfStepErrorChange = Math.abs(fine.error.rms - half.error.rms);
    assert(halfStepErrorChange < fine.error.rms * .05, 'spatial trend dominated by spatial error');
    assert(measured.controls.wrongCouplingSign.error.max > .05);
    assert(measured.controls.missingNonlinearity.error.max > .01);
    assert(measured.controls.wrongBiharmonicSign.error.max > 1);
    assert(Math.max(...measured.controls.massLeak.meanDrift.map(Math.abs)) > .001);
    const result = { schemaVersion: 1, date: new Date().toISOString().slice(0, 10), passed: true,
      source: 'src/modules/nonreciprocal.js', sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
      equation: 'Saha and Golestanian 2025 Eq5 with mobility1; independent implementation', referenceSensitivity, halfStepErrorChange,
      criteria: { fieldErrors: 'Per-fixture tolerance in rows', conservedMeanAbsolute: 2e-6, observedOrder: [1.7, 2.3], referenceRefinementMax: 1e-9 },
      ...measured, limitations: ['Finite-mode and bounded nonlinear fixtures do not reproduce the paper phase diagram or establish chaos.',
        'The paper uses a spectral method; this is a periodic five-point finite-difference and Heun implementation.',
        'Fixed-domain spatial refinement is one smooth wave at domain32x32 and time0.2, not all-parameter convergence.',
        'The application timestep scale is conditional on the amplitude bound and is not a nonlinear stability proof.',
        'Print and actual-instance rollback tests are separate.'] };
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/nonreciprocal-science.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
