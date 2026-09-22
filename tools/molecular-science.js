// Independent numerical checks of the actual molecular module, without a browser.
// node tools/molecular-science.js [--write]
const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const source = fs.readFileSync(path.join(root, 'src/modules/molecular.js'), 'utf8');
assert(source.includes('  Studio.register({'));
let mod;
const Studio = {
  util: { clamp: (v, a, b) => Math.max(a, Math.min(v, b)), makeRng: new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')() },
  PALETTES: new Proxy({}, { get: () => ({ bg: '#000000', colors: ['#ffffff'] }) }),
  register(m) { mod = m; },
};
const hooks = {};
new Function('Studio', 'hooks', source.replace('  Studio.register({', '  Object.assign(hooks,{pair,makeSim,RC,FC,UC});\n  Studio.register({'))(Studio, hooks);
const { pair, makeSim, RC, FC } = hooks;
const fixture = (n = 64, extra = {}) => ({ ...mod.defaults, seed: 'molecular-science', n, ...extra });

// Independent scalar energy and its numerical derivative. Neither calls the
// production pair kernel. The cutoff is explicitly force-shifted, not just cut.
const rawEnergy = r => 4 * (1 / r ** 12 - 1 / r ** 6);
const rawDerivative = r => -48 / r ** 13 + 24 / r ** 7;
const referenceEnergy = r => r >= 2.5 ? 0 : rawEnergy(r) - rawEnergy(2.5) - (r - 2.5) * rawDerivative(2.5);
const numericForce = r => -(referenceEnergy(r + 1e-6) - referenceEnergy(r - 1e-6)) / 2e-6;
const forceGradient = [.9, 1, 1.1, 1.4, 2, 2.49].map(r => {
  const actual = pair(r * r).coefficient * r, reference = numericForce(r);
  return { r, actual, reference, error: Math.abs(actual - reference) };
});
for (const row of forceGradient) assert(row.error < 2e-7 * Math.max(1, Math.abs(row.reference)));
assert(pair(1).coefficient > 0); assert(pair(1.5 ** 2).coefficient < 0);
assert.equal(pair(RC ** 2).coefficient, 0); assert.equal(pair(RC ** 2).energy, 0);
assert(Math.abs(pair((RC - 1e-7) ** 2).energy) < 1e-12);
assert(Math.abs(pair((RC - 1e-7) ** 2).coefficient) < 1e-7);
const signControl = Math.abs(-pair(1).coefficient - numericForce(1));
const omittedForceShift = Math.abs(-rawDerivative(1.5) - numericForce(1.5));
assert(signControl > 40); assert(omittedForceShift > .03);

// Independent all-pairs acceleration, minimum-image displacement through floor
// rather than production round, and a differently expressed LJ derivative.
function brute(x, y, L) {
  const ax = new Float64Array(x.length), ay = new Float64Array(x.length); let potential = 0;
  for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) {
    let dx = x[i] - x[j], dy = y[i] - y[j];
    dx -= L * Math.floor(dx / L + .5); dy -= L * Math.floor(dy / L + .5);
    const r = Math.hypot(dx, dy); if (r >= 2.5) continue;
    const f = (-rawDerivative(r) + rawDerivative(2.5)) / r;
    ax[i] += f * dx; ay[i] += f * dy; ax[j] -= f * dx; ay[j] -= f * dy;
    potential += referenceEnergy(r);
  }
  return { ax, ay, potential };
}
const maxDifference = (a, b) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
const linked = [];
for (const [n, density] of [[36, .8], [64, .55], [256, .1]]) {
  const sim = makeSim(fixture(n, { density }));
  // Put lattice rows on both sides of the periodic seam without changing pair distances.
  for (let i = 0; i < n; i++) { sim.x[i] = (sim.x[i] + .97 * sim.L) % sim.L; sim.y[i] = (sim.y[i] + .93 * sim.L) % sim.L; }
  sim.reference(); const b = brute(sim.x, sim.y, sim.L);
  const forceError = Math.max(maxDifference(sim.fx, b.ax), maxDifference(sim.fy, b.ay));
  const energyError = Math.abs(sim.potential - b.potential);
  assert(forceError < 1e-9); assert(energyError < 1e-9);
  linked.push({ n, density, cellsAcross: Math.floor(sim.L / RC), forceError, energyError, candidates: sim.candidates, allPairs: n * (n - 1) / 2 });
}
// A pair that interacts only through a periodic edge, with every other particle far away.
const edge = makeSim(fixture(4, { density: .01 }));
edge.x.set([.2, edge.L - .8, 6, 12]); edge.y.set([.3, .3, 6, 12]); edge.reference();
assert(Math.abs(edge.fx[0] - (24 - FC)) < 1e-11);
const periodicEdge = { forceOnFirst: edge.fx[0], expected: 24 - FC, unwrappedNegativeControl: 0 };
assert(Math.abs(periodicEdge.forceOnFirst - periodicEdge.unwrappedNegativeControl) > 20);

function pack(sim) { return [...sim.x, ...sim.y, ...sim.vx, ...sim.vy]; }
function derivative(q, n, L) {
  const b = brute(q.slice(0, n), q.slice(n, 2 * n), L);
  return [...q.slice(2 * n), ...b.ax, ...b.ay];
}
function rk4(q, n, L, dt, count) {
  q = q.slice();
  for (let step = 0; step < count; step++) {
    const a = derivative(q, n, L), b = derivative(q.map((v, i) => v + dt * a[i] / 2), n, L);
    const c = derivative(q.map((v, i) => v + dt * b[i] / 2), n, L), d = derivative(q.map((v, i) => v + dt * c[i]), n, L);
    q = q.map((v, i) => v + dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6);
  }
  return q;
}
const base = makeSim(fixture(16, { density: .5, temperature: .35 })), finalTime = .5;
const reference = rk4(pack(base), base.n, base.L, .000125, 4000);
const finerReference = rk4(pack(base), base.n, base.L, .0000625, 8000);
const referenceRefinementError = Math.sqrt(reference.reduce((sum, v, i) => sum + (v - finerReference[i]) ** 2, 0) / reference.length);
assert(referenceRefinementError < 1e-8);
const normError = q => {
  let sum = 0;
  for (let i = 0; i < q.length; i++) {
    let e = q[i] - reference[i]; if (i < 2 * base.n) e -= base.L * Math.round(e / base.L);
    sum += e * e;
  }
  return Math.sqrt(sum / q.length);
};
const refinement = [];
for (const dt of [.004, .002, .001]) {
  const sim = makeSim(fixture(16, { density: .5, temperature: .35, dt })); let peak = 0;
  for (let i = 0; i < Math.round(finalTime / dt); i++) { sim.advance(1); peak = Math.max(peak, Math.abs(sim.drift)); }
  assert.equal(sim.halted, '');
  const row = { dt, steps: sim.step, time: sim.step * dt, rmsStateError: normError(pack(sim)), peakRelativeEnergyError: peak, totalMomentum: Math.hypot(sim.px, sim.py) };
  assert(row.totalMomentum < 1e-12); refinement.push(row);
}
for (let i = 1; i < refinement.length; i++) {
  refinement[i].errorRatio = refinement[i - 1].rmsStateError / refinement[i].rmsStateError;
  assert(refinement[i].errorRatio > 3.2 && refinement[i].errorRatio < 5);
}
assert(refinement[2].peakRelativeEnergyError < 1e-4);
let wrong = pack(base);
for (let step = 0; step < 125; step++) {
  const d = derivative(wrong, base.n, base.L);
  for (let i = 0; i < 2 * base.n; i++) { wrong[i + 2 * base.n] += .004 * d[i + 2 * base.n]; wrong[i] += .004 * wrong[i + 2 * base.n]; }
}
const integratorControl = normError(wrong);
assert(integratorControl > 10 * refinement[0].rmsStateError);

const stopped = makeSim(fixture(64, { dt: .2 })), stoppedBefore = pack(stopped);
stopped.advance(5); assert(stopped.halted.includes('Timestep')); assert.equal(stopped.step, 0);
assert.deepEqual(pack(stopped), stoppedBefore);
const collision = makeSim(fixture(4, { density: .01 }));
collision.x.set([1, 2, 6, 12]); collision.y.set([.3, .3, 6, 12]);
collision.vx.set([250, -250, 0, 0]); collision.vy.fill(0); collision.reference();
const collisionBefore = pack(collision); collision.advance(1);
assert(collision.halted.includes('close approach')); assert.equal(collision.step, 0);
assert.deepEqual(pack(collision), collisionBefore);
const presets = [];
for (const [name, p] of [['default', {}], ...Object.entries(mod.presets).map(([k, v]) => [k, v.p])]) {
  const s = { ...fixture(1024), ...p }; mod.sanitize(s);
  const sim = makeSim(s), started = performance.now(); sim.advance(s.warmup);
  assert.equal(sim.halted, '', name); assert.equal(sim.step, s.warmup);
  presets.push({ name, n: sim.n, steps: sim.step, milliseconds: performance.now() - started, temperature: sim.temperature, energyPerParticle: (sim.kinetic + sim.potential) / sim.n, relativeEnergyError: sim.drift, totalMomentum: Math.hypot(sim.px, sim.py) });
}
const heavy = makeSim(fixture(16384)), timings = [];
for (let i = 0; i < 20; i++) { const t = performance.now(); heavy.advance(1); timings.push(performance.now() - t); }
assert.equal(heavy.halted, ''); assert(heavy.candidates < heavy.n * (heavy.n - 1) / 20);
const result = {
  scope: 'Actual double-precision 2D force-shifted LJ module. Independent finite-difference energy gradient, analytic pair signs, all-pairs reference, periodic seams and two-cell neighbor deduplication, fixed-time RK4 reference and timestep refinement. No EOS or all-state stability claim.',
  forceGradient, linked, periodicEdge, refinement, referenceRefinementError,
  negativeControls: { reversedForceError: signControl, missingForceShiftError: omittedForceShift, singleKickIntegratorError: integratorControl, oversizedStepStopped: stopped.halted, closeApproachStopped: collision.halted, rollbackExact: true },
  presets, heavy: { n: heavy.n, candidates: heavy.candidates, allPairs: heavy.n * (heavy.n - 1) / 2, meanStepMs: timings.reduce((a, b) => a + b) / timings.length, maxStepMs: Math.max(...timings) },
};
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/molecular-science.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
