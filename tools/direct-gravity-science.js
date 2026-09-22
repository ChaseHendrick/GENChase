'use strict';
// Exercise production kernels against an analytic softened circular orbit and
// independent conservation formulas. Chunk size must not change arithmetic order.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/direct-gravity.js'), 'utf8');
function load(mutate = s => s) {
  const api = {}, Studio = { util: {}, PALETTES: {}, register() {} };
  const marker = '  Studio.register({'; assert.equal(source.split(marker).length, 2);
  new Function('Studio', 'api', mutate(source).replace(marker, '  Object.assign(api, {allocate,forces,verlet,timeStep});\n' + marker))(Studio, api);
  return api;
}
const api = load();
function finish(it) { let count = 0; while (!it.next().done) count++; return count; }
function orbit(h, n, kernel = api, batch = 2048) {
  const eps = 0.12, r = 0.5, omega = Math.sqrt(1 / (1 + eps * eps) ** 1.5);
  const b = kernel.allocate(2);
  b.mass.set([0.5, 0.5]); b.x.set([-r, r]); b.vy.set([-r * omega, r * omega]);
  finish(kernel.forces(b, eps, batch));
  const E0 = energy(b, eps); let maxEnergyError = 0;
  for (let k = 0; k < n; k++) { finish(kernel.verlet(b, eps, h, batch)); maxEnergyError = Math.max(maxEnergyError, Math.abs(energy(b, eps) - E0)); }
  const t = h * n, exact = [r * Math.cos(omega * t), r * Math.sin(omega * t)];
  const error = Math.hypot(b.x[1] - exact[0], b.y[1] - exact[1]);
  return { error, maxEnergyError, E0, final: [b.x[0], b.x[1], b.y[0], b.y[1], ...b.vx, ...b.vy] };
}
function energy(b, eps) {
  let E = 0;
  for (let i = 0; i < b.n; i++) {
    E += b.mass[i] * (b.vx[i] ** 2 + b.vy[i] ** 2) / 2;
    for (let j = i + 1; j < b.n; j++) E -= b.mass[i] * b.mass[j] / Math.hypot(b.x[i] - b.x[j], b.y[i] - b.y[j], eps);
  }
  return E;
}
const rows = [0.02, 0.01, 0.005].map(h => ({ h, ...orbit(h, Math.round(6 / h)) }));
assert(rows.every(r => r.E0 < 0));
assert(rows[2].error < 0.00003);
const convergenceRatio = rows[0].error / rows[2].error;
assert(convergenceRatio > 15 && convergenceRatio < 17);
assert(rows[2].maxEnergyError < 1e-8);
// Unequal masses and non-collinear positions test the actual paired force update.
const many = api.allocate(5); many.mass.set([0.1, 0.2, 0.3, 0.15, 0.25]);
many.x.set([-0.8, -0.2, 0.3, 0.7, 1.1]); many.y.set([0.6, -0.4, 0.1, -0.5, 0.3]);
finish(api.forces(many, 0.14, 3));
let forceX = 0, forceY = 0;
for (let i = 0; i < many.n; i++) { forceX += many.mass[i] * many.ax[i]; forceY += many.mass[i] * many.ay[i]; }
assert(Math.hypot(forceX, forceY) < 1e-14);
const startEnergy = energy(many, 0.14); let maxDrift = 0;
for (let k = 0; k < 1000; k++) { finish(api.verlet(many, 0.14, 0.0005, 3)); maxDrift = Math.max(maxDrift, Math.abs(energy(many, 0.14) - startEnergy)); }
let momentumX = 0, momentumY = 0;
for (let i = 0; i < many.n; i++) { momentumX += many.mass[i] * many.vx[i]; momentumY += many.mass[i] * many.vy[i]; }
assert(Math.hypot(momentumX, momentumY) < 1e-13); assert(maxDrift < 1e-5);
assert.deepEqual(orbit(0.01, 600, api, 1).final, orbit(0.01, 600, api, 4096).final);
const broken = load(s => s.replace('const inv = 1 /', 'const inv = 1.01 /'));
const corruptionError = orbit(0.005, 1200, broken).error;
assert(corruptionError > 0.01);
const nonreciprocal = load(s => s.replace('b.ax[j] -= b.mass[i] * fx', 'b.ax[j] -= 0.99 * b.mass[i] * fx'));
const wrong = nonreciprocal.allocate(2); wrong.x.set([-0.5, 0.5]); wrong.mass.set([0.3, 0.7]); finish(nonreciprocal.forces(wrong, 0.1));
const brokenMomentum = Math.abs(0.3 * wrong.ax[0] + 0.7 * wrong.ax[1]); assert(brokenMomentum > 0.001);
for (const eps of [0.03, 0.12, 0.3]) assert(api.timeStep(eps, 1, 1) <= 0.15 * Math.sqrt(eps ** 3 / 2) * (1 + 1e-15));
const result = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), pass: true, circularOrbit: { eps: 0.12, separation: 1, totalMass: 1, time: 6, rows, convergenceRatio }, unequalMassFixture: { forceResidual: Math.hypot(forceX, forceY), momentumResidual: Math.hypot(momentumX, momentumY), maxEnergyDrift: maxDrift }, corruptionError, brokenMomentum, batchingIdentical: true, limitations: ['Planar Plummer-softened G=1 finite-time fixtures only. No galaxy equilibrium, unsoftened collision, large-N statistical or long-time chaotic accuracy claim.', 'Independent circular solution and energy formula test extracted production generators. Conservation alone does not prove trajectory accuracy.', 'Print and browser scheduling checks are separate from this numerical evidence.'] };
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/direct-gravity-science.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
