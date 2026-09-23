'use strict';
// Independent Float64 discrete GPE twin of src/modules/bec.js operators.
// node tools/bec-science.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/bec.js'), 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const started = performance.now();

// Confirm the maintained shaders still encode the operators this twin reproduces.
assert(source.includes('vec2 lap = (e + w + n + s - 4.0 * p) / (u_dx * u_dx);'));
assert(source.includes('float V = u_trap * 0.5 * dot(r, r);'));
assert(source.includes('vec2 Hp = -0.5 * lap + (V + u_g * dens) * p;'));
assert(source.includes('if (u_part == 0) np.x = p.x + u_dt * Hp.y;'));
assert(source.includes('else np.y = p.y - u_dt * Hp.x;'));
assert(source.includes('vec2 rhs = 0.5 * lap - (V + u_g * dens) * p + u_omega * vec2(Lz.y, -Lz.x);'));
assert(source.includes('const mu = Math.sqrt(Math.max(s.g, 1) * s.trap / Math.PI);'));
assert(source.includes('const NORM_EVERY = 32;'));
assert(source.includes('rePass.draw(P.write, Object.assign({ u_psi: P.read, u_omega: 0'));

function makeGrid(N, half) {
  const dx = 2 * half / N;
  const x = new Float64Array(N * N), y = new Float64Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    x[k] = (i + 0.5 - N / 2) * dx;
    y[k] = (j + 0.5 - N / 2) * dx;
  }
  return { N, half, dx, x, y };
}

function idx(N, i, j) {
  i = i < 0 ? 0 : i >= N ? N - 1 : i;
  j = j < 0 ? 0 : j >= N ? N - 1 : j;
  return j * N + i;
}

function lapAt(re, im, N, dx, i, j, out) {
  const c = idx(N, i, j), e = idx(N, i + 1, j), w = idx(N, i - 1, j), n = idx(N, i, j + 1), s = idx(N, i, j - 1);
  const inv = 1 / (dx * dx);
  out[0] = (re[e] + re[w] + re[n] + re[s] - 4 * re[c]) * inv;
  out[1] = (im[e] + im[w] + im[n] + im[s] - 4 * im[c]) * inv;
}

function norm2(re, im, dx) {
  let s = 0;
  for (let k = 0; k < re.length; k++) s += re[k] * re[k] + im[k] * im[k];
  return s * dx * dx;
}

function renormalize(re, im, dx) {
  const n2 = norm2(re, im, dx);
  assert(n2 > 1e-30, 'vanished field');
  const k = 1 / Math.sqrt(n2);
  for (let i = 0; i < re.length; i++) { re[i] *= k; im[i] *= k; }
  return n2;
}

function peakDensity(re, im) {
  let peak = 0;
  for (let k = 0; k < re.length; k++) peak = Math.max(peak, re[k] * re[k] + im[k] * im[k]);
  return peak;
}

function muTFOf(g, trap) { return Math.sqrt(Math.max(g, 1) * trap / Math.PI); }
function energyTFOf(g, trap) { return (2 / 3) * muTFOf(g, trap); }
function radiusTFOf(g, trap) { return Math.sqrt(2 * muTFOf(g, trap) / trap); }

function seedTF(grid, { g, trap }) {
  const { N, dx, x, y } = grid;
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  const mu = muTFOf(g, trap);
  for (let k = 0; k < N * N; k++) {
    const V = trap * 0.5 * (x[k] * x[k] + y[k] * y[k]);
    re[k] = Math.sqrt(Math.max(0, (mu - V) / Math.max(g, 1)));
  }
  renormalize(re, im, dx);
  return { re, im, mu };
}

function seedGauss(grid, sigma) {
  const { N, dx, x, y } = grid;
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  for (let k = 0; k < N * N; k++) re[k] = Math.exp(-(x[k] * x[k] + y[k] * y[k]) / (2 * sigma * sigma));
  renormalize(re, im, dx);
  return { re, im };
}

function seedVortex(grid, { g, trap }) {
  const { N, dx, x, y } = grid;
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  const mu = muTFOf(g, trap);
  const xi = Math.sqrt(1 / Math.max(mu, 1e-6));
  for (let k = 0; k < N * N; k++) {
    const r2 = x[k] * x[k] + y[k] * y[k];
    const V = trap * 0.5 * r2;
    const dens = Math.max(0, (mu - V) / Math.max(g, 1));
    const amp = Math.sqrt(dens) * (r2 === 0 ? 0 : Math.sqrt(r2 / (r2 + xi * xi)));
    const ph = Math.atan2(y[k], x[k]);
    re[k] = amp * Math.cos(ph);
    im[k] = amp * Math.sin(ph);
  }
  renormalize(re, im, dx);
  return { re, im };
}

function energies(re, im, grid, { g, trap }, kinSign = 1, gSign = 1) {
  const { N, dx, x, y } = grid;
  const lap = [0, 0];
  let Ekin = 0, Etrap = 0, Eint = 0, muNum = 0, mass = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    const R = re[k], I = im[k], dens = R * R + I * I;
    lapAt(re, im, N, dx, i, j, lap);
    const kinDens = -0.5 * kinSign * (R * lap[0] + I * lap[1]);
    const V = trap * 0.5 * (x[k] * x[k] + y[k] * y[k]);
    Ekin += kinDens;
    Etrap += V * dens;
    Eint += 0.5 * gSign * g * dens * dens;
    muNum += kinDens + V * dens + gSign * g * dens * dens;
    mass += dens;
  }
  const cell = dx * dx;
  return {
    kinetic: Ekin * cell,
    trap: Etrap * cell,
    interaction: Eint * cell,
    energy: (Ekin + Etrap + Eint) * cell,
    chemicalPotential: (muNum * cell) / (mass * cell),
    norm: mass * cell,
  };
}

function massRadius(re, im, grid, fraction = 0.95) {
  const rows = [];
  for (let k = 0; k < re.length; k++) rows.push({ r2: grid.x[k] * grid.x[k] + grid.y[k] * grid.y[k], d: re[k] * re[k] + im[k] * im[k] });
  rows.sort((a, b) => a.r2 - b.r2);
  let acc = 0;
  for (const row of rows) {
    acc += row.d * grid.dx * grid.dx;
    if (acc >= fraction) return Math.sqrt(row.r2);
  }
  return Math.sqrt(rows.at(-1).r2);
}

function dtBound(grid, { g, trap, maxDens }) {
  const kin = 4 / (grid.dx * grid.dx);
  const pot = trap * 0.5 * 2 * grid.half * grid.half;
  const inter = Math.abs(g) * Math.max(maxDens, 1e-6);
  return 2 / Math.max(1e-6, kin + pot + inter);
}

function stepImag(re, im, grid, opts, { kinSign = 1, gSign = 1, omega = 0, skipRenorm = false } = {}) {
  const { N, dx, x, y } = grid;
  const { g, trap, dt, steps } = opts;
  const lap = [0, 0], Lz = [0, 0];
  const nre = new Float64Array(N * N), nim = new Float64Array(N * N);
  for (let s = 0; s < steps; s++) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const R = re[k], I = im[k], dens = R * R + I * I;
      lapAt(re, im, N, dx, i, j, lap);
      const V = trap * 0.5 * (x[k] * x[k] + y[k] * y[k]);
      let rhsR = 0.5 * kinSign * lap[0] - (V + gSign * g * dens) * R;
      let rhsI = 0.5 * kinSign * lap[1] - (V + gSign * g * dens) * I;
      if (omega !== 0) {
        const e = idx(N, i + 1, j), w = idx(N, i - 1, j), n = idx(N, i, j + 1), sIdx = idx(N, i, j - 1);
        const inv = 1 / (2 * dx);
        const drx = (re[e] - re[w]) * inv, dix = (im[e] - im[w]) * inv;
        const dry = (re[n] - re[sIdx]) * inv, diy = (im[n] - im[sIdx]) * inv;
        Lz[0] = x[k] * dry - y[k] * drx;
        Lz[1] = x[k] * diy - y[k] * dix;
        rhsR += omega * Lz[1];
        rhsI += omega * (-Lz[0]);
      }
      nre[k] = R + dt * rhsR;
      nim[k] = I + dt * rhsI;
    }
    re.set(nre); im.set(nim);
    if (!skipRenorm && ((s + 1) % 32) === 0) renormalize(re, im, dx);
  }
  if (!skipRenorm) renormalize(re, im, dx);
}

function stepReal(re, im, grid, opts, { kinSign = 1, gSign = 1 } = {}) {
  const { N, dx, x, y } = grid;
  const { g, trap, dt, steps } = opts;
  const lap = [0, 0];
  for (let s = 0; s < steps; s++) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const R = re[k], I = im[k], dens = R * R + I * I;
      lapAt(re, im, N, dx, i, j, lap);
      const V = trap * 0.5 * (x[k] * x[k] + y[k] * y[k]);
      const HI = -0.5 * kinSign * lap[1] + (V + gSign * g * dens) * I;
      re[k] = R + dt * HI;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const R = re[k], I = im[k], dens = R * R + I * I;
      lapAt(re, im, N, dx, i, j, lap);
      const V = trap * 0.5 * (x[k] * x[k] + y[k] * y[k]);
      const HR = -0.5 * kinSign * lap[0] + (V + gSign * g * dens) * R;
      im[k] = I - dt * HR;
    }
  }
}

function plaquetteWinding(re, im, grid) {
  const { N } = grid;
  const phase = k => Math.atan2(im[k], re[k]);
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const i0 = Math.floor(N / 2) - 1, j0 = Math.floor(N / 2) - 1;
  const a = j0 * N + i0, b = j0 * N + i0 + 1, c = (j0 + 1) * N + i0 + 1, d = (j0 + 1) * N + i0;
  const s = wrap(phase(b) - phase(a)) + wrap(phase(c) - phase(b)) + wrap(phase(d) - phase(c)) + wrap(phase(a) - phase(d));
  return Math.round(s / (2 * Math.PI));
}

// ---------- 1. Norm conservation (real-time unitary, g=0, Ω=0) ----------
{
  const grid = makeGrid(64, 8);
  const trap = 1, g = 0, T = 2, sigma = 1.2;
  const { re, im } = seedGauss(grid, sigma);
  const reN = re.slice(), imN = im.slice();
  const dt = 0.2 * dtBound(grid, { g, trap, maxDens: peakDensity(reN, imN) });
  const steps = Math.round(T / dt);
  const n0 = norm2(reN, imN, grid.dx);
  stepReal(reN, imN, grid, { g, trap, dt, steps });
  const n1 = norm2(reN, imN, grid.dx);
  const absNormError = Math.abs(n1 - 1);
  assert(Math.abs(n0 - 1) < 1e-14);
  assert(Number.isFinite(n1) && absNormError < 2e-3, 'norm drift too large: ' + absNormError);
  var normConservation = {
    grid: 64, half: 8, g, trap, omega: 0, sigma, dt, physicalTime: T, steps,
    initialNorm: n0, finalNorm: n1, absNormError, tolerance: 2e-3,
    note: 'Linear (g=0) harmonic case of the Visscher stagger; nonlinear GPE with dens from mixed half-levels is not claimed to conserve naive L2 exactly.',
  };
}

// ---------- 2. Thomas–Fermi analytic seed + imag-time ground state ----------
const thomasFermi = [];
for (const [g, trap, half, N, imagSteps] of [
  [400, 1, 8, 96, 3000],
  [800, 1, 9, 96, 4000],
]) {
  const grid = makeGrid(N, half);
  const muTF = muTFOf(g, trap), energyTF = energyTFOf(g, trap), radiusTF = radiusTFOf(g, trap);

  // 2a. Discrete TF seed versus independent continuum TF formulas
  const seed = seedTF(grid, { g, trap });
  const seedE = energies(seed.re, seed.im, grid, { g, trap });
  const seedMuRel = Math.abs(seedE.chemicalPotential - muTF) / muTF;
  const seedEnergyRel = Math.abs(seedE.energy - energyTF) / energyTF;
  assert(seedMuRel < 0.04, 'TF-seed μ error ' + seedMuRel);
  assert(seedEnergyRel < 0.05, 'TF-seed energy error ' + seedEnergyRel);

  // 2b. Imag-time from a Gaussian toward the repulsive ground state
  const gauss = seedGauss(grid, 2.0);
  const re = gauss.re.slice(), im = gauss.im.slice();
  const maxDens = Math.max(peakDensity(re, im), muTF / Math.max(g, 1));
  const dt = 0.15 * dtBound(grid, { g, trap, maxDens });
  const before = energies(re, im, grid, { g, trap });
  stepImag(re, im, grid, { g, trap, dt, steps: imagSteps }, { omega: 0 });
  const after = energies(re, im, grid, { g, trap });
  const muRel = Math.abs(after.chemicalPotential - muTF) / muTF;
  const energyRel = Math.abs(after.energy - energyTF) / energyTF;
  const kineticFraction = Math.abs(after.kinetic) / Math.max(Math.abs(after.energy), 1e-12);
  const r95 = massRadius(re, im, grid, 0.95);
  assert(Math.abs(after.norm - 1) < 1e-10);
  assert(after.energy < before.energy, 'imag-time should lower energy from a broad Gaussian');
  assert(muRel < 0.12, 'ground-state μ vs TF ' + muRel);
  assert(energyRel < 0.06, 'ground-state energy vs TF ' + energyRel);
  assert(kineticFraction < 0.05, 'kinetic fraction ' + kineticFraction);
  assert(r95 < 1.05 * radiusTF && r95 > 0.55 * radiusTF, 'cloud radius off TF scale');

  thomasFermi.push({
    grid: N, half, g, trap, dt, imagSteps,
    muTF, energyTF, radiusTF,
    seed: { chemicalPotential: seedE.chemicalPotential, energy: seedE.energy, muRelativeError: seedMuRel, energyRelativeError: seedEnergyRel },
    groundState: {
      chemicalPotential: after.chemicalPotential, energy: after.energy, kinetic: after.kinetic,
      trapEnergy: after.trap, interaction: after.interaction, norm: after.norm,
      muRelativeError: muRel, energyRelativeError: energyRel, kineticFraction,
      massRadius95: r95, energyBefore: before.energy,
    },
    tolerances: { seedMu: 0.04, seedEnergy: 0.05, groundMu: 0.12, groundEnergy: 0.06, kineticFraction: 0.05 },
  });
}

// ---------- 3. Circulation / phase winding on a prepared vortex ----------
const vortGrid = makeGrid(96, 8);
const vortex = seedVortex(vortGrid, { g: 400, trap: 1 });
const winding = plaquetteWinding(vortex.re, vortex.im, vortGrid);
assert.equal(winding, 1);
const vortexWinding = {
  grid: 96, half: 8, g: 400, trap: 1, preparedWinding: winding, expected: 1,
  note: 'Prepared singly quantized vortex (phase e^{iθ} with TF amplitude and healing core); plaquette winding only — not Abrikosov lattice counting.',
};

// ---------- 4. Failure controls ----------
// 4a. Wrong kinetic Laplacian sign in imag-time (anti-diffusion) misses repulsive TF energy band
{
  const g = 400, trap = 1;
  const grid = makeGrid(48, 6);
  const energyTF = energyTFOf(g, trap);
  const { re, im } = seedGauss(grid, 2.0);
  const reB = re.slice(), imB = im.slice();
  const dt = 0.1 * dtBound(grid, { g, trap, maxDens: Math.max(peakDensity(reB, imB), muTFOf(g, trap) / g) });
  let blew = false, E = null, energyRelBad = null;
  try {
    stepImag(reB, imB, grid, { g, trap, dt, steps: 500 }, { kinSign: -1, omega: 0 });
    E = energies(reB, imB, grid, { g, trap });
    energyRelBad = Number.isFinite(E.energy) ? Math.abs(E.energy - energyTF) / energyTF : Infinity;
    blew = !Number.isFinite(E.energy) || energyRelBad > 1;
  } catch (err) {
    blew = /vanished field/.test(String(err.message || err));
  }
  assert(blew, 'wrong Laplacian sign should miss TF energy badly');
  var wrongLaplacian = { energy: E && E.energy, energyTF, energyRelativeError: energyRelBad, norm: E && E.norm, detected: true };
}
// 4b. Attractive g (wrong sign) imag-time disagrees with repulsive TF energy band or collapses
{
  const g = 400, trap = 1, half = 8, N = 64;
  const grid = makeGrid(N, half);
  const muTF = muTFOf(g, trap), energyTF = energyTFOf(g, trap);
  const { re, im } = seedGauss(grid, 2.0);
  const reB = re.slice(), imB = im.slice();
  const dt = 0.08 * dtBound(grid, { g, trap, maxDens: Math.max(peakDensity(reB, imB), muTF / g) });
  let collapsed = false, E = null, energyRelBad = null;
  try {
    stepImag(reB, imB, grid, { g, trap, dt, steps: 1200 }, { gSign: -1, omega: 0 });
    E = energies(reB, imB, grid, { g, trap }, 1, -1);
    energyRelBad = Math.abs(E.energy - energyTF) / energyTF;
    collapsed = !(E.norm > 0.5 && Number.isFinite(E.energy));
  } catch (err) {
    collapsed = /vanished field/.test(String(err.message || err));
  }
  assert(collapsed || energyRelBad > 0.2, 'wrong g sign should miss repulsive TF energy or collapse');
  var wrongGSign = {
    collapsed, energy: E && E.energy, energyTF, energyRelativeError: energyRelBad,
    chemicalPotential: E && E.chemicalPotential, muTF, detected: true,
  };
}
// 4c. Broken imag-time renormalization → norm collapses
{
  const grid = makeGrid(48, 6);
  const g = 300, trap = 1;
  const { re, im } = seedTF(grid, { g, trap });
  const reB = re.slice(), imB = im.slice();
  const dt = 0.2 * dtBound(grid, { g, trap, maxDens: Math.max(peakDensity(reB, imB), muTFOf(g, trap) / g) });
  stepImag(reB, imB, grid, { g, trap, dt, steps: 800 }, { skipRenorm: true, omega: 0 });
  const collapsed = norm2(reB, imB, grid.dx);
  assert(collapsed < 0.1, 'skipping renormalization should collapse imag-time norm');
  var brokenRenorm = { finalNorm: collapsed, detected: true };
}

const result = {
  sourceSha256: hash(source),
  harnessSha256: hash(fs.readFileSync(__filename)),
  command: 'node tools/bec-science.js --write',
  scope: 'Independent Float64 twin of the discrete 2D GPE operators in bec.js (5-point Laplacian with clamp neighbors, harmonic trap, contact interaction, Visscher real-time stagger, imag-time Euler with NORM_EVERY=32 L2 renormalization). Shader source markers are checked. No GPU float32 path, no Abrikosov lattice count, no experimental Na BEC claim.',
  criteria: {
    realTimeNormAbsError: 2e-3,
    tfSeedMuRelativeError: 0.04,
    tfSeedEnergyRelativeError: 0.05,
    groundStateMuRelativeError: 0.12,
    groundStateEnergyRelativeError: 0.06,
    groundStateKineticFraction: 0.05,
    vortexWindingExact: 1,
  },
  normConservation,
  thomasFermi,
  vortexWinding,
  failureControls: {
    wrongKineticLaplacianSign: wrongLaplacian,
    wrongInteractionSign: wrongGSign,
    brokenImagTimeRenormalization: brokenRenorm,
  },
  seconds: (performance.now() - started) / 1000,
  limitations: [
    'Float64 CPU twin of the discrete operators, not a bit-exact GPU float32/float16 replay of the studio shaders.',
    'Real-time norm check uses g=0 (linear Schrödinger limit of the GPE); nonlinear dens at mixed Visscher half-levels is not claimed to conserve naive L2 exactly.',
    'Thomas–Fermi comparison is asymptotic (large repulsive g); rotating-frame Ω L_z, Abrikosov lattice counting and turbulence diagnostics are not certified.',
    'Prepared single-vortex winding is not a physical vortex count from noisy real-time encoded fields.',
    'No print-state audit, no experimental sodium BEC claim, no full quantum-turbulence certification.',
  ],
};

assert(wrongLaplacian.detected && wrongGSign.detected && brokenRenorm.detected);
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/bec-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
