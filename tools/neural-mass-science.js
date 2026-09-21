// Independent analytic and numerical checks of the actual MPR implementation.
// node tools/neural-mass-science.js [--write]
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..'), started = performance.now();
const source = fs.readFileSync(path.join(root, 'src/modules/neural-mass.js'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/studio.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
function load(text = source) {
  const hooks = {}, Studio = { util: { clamp: (x, a, b) => Math.max(a, Math.min(x, b)), makeRng: new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')() }, PALETTES: new Proxy({}, { get: () => ({ bg: '#000000', colors: ['#ffffff'] }) }), register(m) { hooks.mod = m; } };
  assert(text.includes('  Studio.register({'));
  new Function('Studio', 'hooks', text.replace('  Studio.register({', '  Object.assign(hooks,{input,rk4,makeSim});\n  Studio.register({'))(Studio, hooks);
  return hooks;
}
const h = load(), fixture = extra => ({ ...h.mod.defaults, seed: 'neural-science', populations: 1, ...extra });
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
function integrate(p, q, finalTime, dt, kernel = h.rk4) {
  q = q.slice(); const out = new Float64Array(2), count = Math.round(finalTime / dt);
  assert(Math.abs(count * dt - finalTime) < 1e-12);
  for (let i = 0; i < count; i++) { kernel(out, q[0], q[1], i * dt, dt, p); q = [...out]; }
  return q;
}
// For J=0, z=v+i*pi*r obeys z'=z^2+a+i*Delta. This closed-form
// Möbius flow is independent of every production integration stage.
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a, b) => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
function exact(q, t, a, delta) {
  const rho = Math.hypot(a, delta), k = [-Math.sqrt((rho - a) / 2), Math.sqrt((rho + a) / 2)], z = [q[1], Math.PI * q[0]];
  const w0 = div(sub(z, k), add(z, k)), decay = Math.exp(2 * k[0] * t);
  const w = mul(w0, [decay * Math.cos(2 * k[1] * t), decay * Math.sin(2 * k[1] * t)]);
  const final = mul(k, div(add([1, 0], w), sub([1, 0], w)));
  return [final[1] / Math.PI, final[0]];
}
const stationary = [];
for (const eta of [-3, 0, 2]) for (const delta of [.1, .5, 2]) {
  const rho = Math.hypot(eta, delta), q = [Math.sqrt((rho + eta) / 2) / Math.PI, -Math.sqrt((rho - eta) / 2)];
  const actual = integrate(fixture({ J: 0, drive: 'none', eta, delta }), q, 2, .002), error = distance(actual, q);
  assert(error < 1e-12); assert(distance(exact(q, 2, eta, delta), q) < 1e-13);
  stationary.push({ eta, delta, q, error });
}
const analytic = [];
for (const p of [fixture({ J: 0, drive: 'none', eta: 1.5, delta: .3 }), fixture({ J: 0, drive: 'none', eta: -1.3, delta: 1 })]) {
  const q = [.28, .6], reference = exact(q, 2, p.eta, p.delta), rows = [];
  assert(distance(exact(q, 0, p.eta, p.delta), q) < 1e-14);
  for (const dt of [.008, .004, .002]) rows.push({ dt, error: distance(integrate(p, q, 2, dt), reference) });
  const ratios = [rows[0].error / rows[1].error, rows[1].error / rows[2].error];
  assert(rows[2].error < 1e-9); assert(ratios.every(x => x > 13 && x < 20));
  analytic.push({ eta: p.eta, delta: p.delta, initial: q, finalTime: 2, reference, rows, ratios });
}
// A generic, independent Dormand-Prince fifth-order tableau reference. The RHS
// is expressed through voltage and rate and never calls production input/rk4.
function dopri(p, initial, T, dt) {
  const A = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9], [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729], [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656]];
  const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1], B = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84];
  let y = initial.slice(); const count = Math.round(T / dt);
  for (let i = 0; i < count; i++) {
    const K = [];
    for (let j = 0; j < A.length; j++) {
      const q = y.map((v, c) => v + dt * A[j].reduce((s, a, k) => s + a * K[k][c], 0));
      const current = p.amplitude * Math.sin(2 * Math.PI * p.frequency * (i + C[j]) * dt);
      K.push([p.delta / Math.PI + 2 * q[0] * q[1], q[1] ** 2 - (Math.PI * q[0]) ** 2 + p.eta + p.J * q[0] + current]);
    }
    y = y.map((v, c) => v + dt * B.reduce((s, b, k) => s + b * K[k][c], 0));
  }
  return y;
}
const coupledP = fixture({ J: 8, eta: -2, delta: .5, drive: 'sine', amplitude: 2.5, frequency: .4 });
const coupledInitial = [.16, -.2], reference = dopri(coupledP, coupledInitial, 2, .00025), finerReference = dopri(coupledP, coupledInitial, 2, .000125);
const referenceUncertainty = distance(reference, finerReference); assert(referenceUncertainty < 2e-12);
const coupledRows = [.008, .004, .002].map(dt => ({ dt, error: distance(integrate(coupledP, coupledInitial, 2, dt), reference) }));
const coupledRatios = [coupledRows[0].error / coupledRows[1].error, coupledRows[1].error / coupledRows[2].error];
assert(coupledRows[2].error < 1e-7); assert(coupledRatios.every(r => r > 13 && r < 20));
assert(referenceUncertainty < coupledRows[2].error / 100);
function pulseTest(kernel = h.makeSim) {
  const p = fixture({ J: 0, eta: -.4, delta: .5, drive: 'pulse', amplitude: 2, duration: 12, dt: .008 }), sim = kernel(p), q = [.27, -.45];
  sim.r[0] = q[0]; sim.v[0] = q[1]; sim.reference(); sim.advance(100000); assert(sim.complete && !sim.halted);
  const start = .25 * p.duration, end = .6 * p.duration;
  const a = exact(q, start, p.eta, p.delta), b = exact(a, end - start, p.eta + p.amplitude, p.delta);
  let maxError = 0;
  for (let i = 0; i <= sim.samples; i++) {
    const t = sim.times[i], ref = t <= start ? exact(q, t, p.eta, p.delta) : t <= end ? exact(a, t - start, p.eta + p.amplitude, p.delta) : exact(b, t - end, p.eta, p.delta);
    maxError = Math.max(maxError, distance([sim.historyR[i], sim.historyV[i]], ref));
  }
  return { maxError, steps: sim.steps, samples: sim.recorded + 1, finalTime: sim.time, positive: sim.minRate > 0 };
}
const pulse = pulseTest(); assert(pulse.maxError < 2e-8); assert(pulse.positive);
// Deliberately wrong dynamics and endpoint handling must miss the references.
const wrongSignSource = source.replaceAll('- PI * PI *', '+ PI * PI *'); assert.notEqual(wrongSignSource, source);
const wrong = load(wrongSignSource), controlP = fixture({ J: 0, eta: -.4, delta: .5, drive: 'none' }), controlQ = [.2, -.3];
let wrongSignError;
try { wrongSignError = distance(integrate(controlP, controlQ, .2, .002, wrong.rk4), exact(controlQ, .2, controlP.eta, controlP.delta)); } catch (_) { wrongSignError = Infinity; }
assert(wrongSignError > .05);
const wrongEndpointSource = source.replace("const pulse = p.drive === 'pulse' ? input(t + dt / 2, p) : null;", 'const pulse = null;'); assert.notEqual(wrongEndpointSource, source);
const wrongEndpoint = pulseTest(load(wrongEndpointSource).makeSim); assert(wrongEndpoint.maxError > 1e-4);
const guard = h.makeSim(fixture({ duration: 12, dt: .008 })); guard.r[0] = .2; guard.v[0] = 100; guard.reference();
const before = JSON.stringify({ r: [...guard.r], v: [...guard.v], time: guard.time, steps: guard.steps }); guard.advance(1);
const rollback = before === JSON.stringify({ r: [...guard.r], v: [...guard.v], time: guard.time, steps: guard.steps });
assert(rollback); assert(guard.halted.includes('Time step is too large'));
const negative = h.makeSim(fixture({})); negative.r[0] = -1; negative.advance(1); assert(negative.halted.includes('positive')); assert.equal(negative.steps, 0);
const presets = [];
for (const [key, preset] of Object.entries(h.mod.presets)) {
  const p = fixture({ ...preset.p, populations: 32, seed: 'neural-presets' }), sim = h.makeSim(p); sim.advance(1000000);
  assert(sim.complete && !sim.halted); assert(sim.minRate > 0); assert.equal(sim.time, p.duration);
  presets.push({ key, populations: sim.n, steps: sim.steps, minSampledRate: sim.minRate, maxSampledRate: sim.maxRate, finalTime: sim.time });
}
const a = h.makeSim(fixture({ duration: 8, populations: 16 })), b = h.makeSim(fixture({ duration: 8, populations: 16 })), c = h.makeSim(fixture({ duration: 8, populations: 16, seed: 'another-neural-seed' }));
a.advance(100000); b.advance(100000); c.advance(100000);
assert.deepEqual(a.historyR, b.historyR); assert.deepEqual(a.historyV, b.historyV); assert.notDeepEqual(a.historyR, c.historyR);
const result = { scope: 'MPR Eq.12 Float64 RK4: nine uncoupled equilibria, exact uncoupled Riccati trajectories, a coupled sinusoidal trajectory against independent Dormand-Prince 5, actual stored pulse trajectory, six presets, seeded reproducibility and transactional guards. Finite examples, not a proof over all controls or a finite-neuron/clinical validation.', sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'), stationary, analytic, coupled: { initial: coupledInitial, parameters: coupledP, finalTime: 2, reference, finerReference, referenceUncertainty, rows: coupledRows, ratios: coupledRatios }, pulse, failureControls: { wrongQuadraticSignError: Number.isFinite(wrongSignError) ? wrongSignError : 'guarded failure', wrongEndpointMaxError: wrongEndpoint.maxError }, guard: { message: guard.halted, rollback, negativeRateMessage: negative.halted }, presets, reproducibility: { sameSeedExact: true, differentSeedDiffers: true }, elapsedSeconds: (performance.now() - started) / 1000 };
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/neural-mass-science.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
