// Independent 1D Dirac transmission, plus a headless read of the plate's assigned metric.
// node tools/klein-science.js [--write]
//
// The plate does not evolve a spinor. This file does. Basis: deterministic. One trajectory,
// no random draws, so there is no sampling error and no call to Studio.util.stats.compare.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { load } = require('./science-harness');

const root = path.resolve(__dirname, '..');
const SOURCE = 'src/modules/klein.js';
const source = fs.readFileSync(path.join(root, SOURCE), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');

// |T - 1| at or below this passes. Fixed before the mass run; the mass term has to miss it.
const UNIT_TOL = 1e-4;
// Fine-grid wave packet against the monochromatic mode match, massive case only.
const MATCH_TOL = 0.01;
const acceptsUnitTransmission = T => Number.isFinite(T) && Math.abs(T - 1) <= UNIT_TOL;

// -------------------------------------------------------------------------------------------------
// Radix-2 FFT. Forward has no 1/N; inverse divides by N. Sign is the engineering convention:
// forward multiplies by e^{-2 π i j n / N}.

function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1, wIm = 0;
      const half = len >> 1;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe; im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe; im[i + j + half] = uIm - vIm;
        const nwRe = wRe * wr - wIm * wi;
        wIm = wRe * wi + wIm * wr;
        wRe = nwRe;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// -------------------------------------------------------------------------------------------------
// Stationary scattering. Square barrier of height V and width L, ħ = v_F = 1.
// H = -i σ_x ∂_x + m σ_z + V(x). Both spinor components are matched at the two edges.
// Outside, the transmitted wave is the right-going positive-energy mode at the same |q|.
// With this spinor normalization, T = |t|^2 and R = |r|^2 on a symmetric barrier.

function C(re, im = 0) { return { re, im }; }
function csub(a, b) { return C(a.re - b.re, a.im - b.im); }
function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
function solve4(Ain, bin) {
  const n = 4;
  const A = Ain.map(row => row.map(z => C(z.re, z.im)));
  const b = bin.map(z => C(z.re, z.im));
  for (let col = 0; col < n; col++) {
    let piv = col, best = 0;
    for (let i = col; i < n; i++) {
      const mag = A[i][col].re * A[i][col].re + A[i][col].im * A[i][col].im;
      if (mag > best) { best = mag; piv = i; }
    }
    assert.ok(best > 0, 'singular scattering system');
    [A[col], A[piv]] = [A[piv], A[col]];
    [b[col], b[piv]] = [b[piv], b[col]];
    const pivv = A[col][col];
    for (let j = col; j < n; j++) A[col][j] = cdiv(A[col][j], pivv);
    b[col] = cdiv(b[col], pivv);
    for (let i = 0; i < n; i++) if (i !== col) {
      const f = A[i][col];
      for (let j = col; j < n; j++) A[i][j] = csub(A[i][j], cmul(f, A[col][j]));
      b[i] = csub(b[i], cmul(f, b[col]));
    }
  }
  return b;
}
function modeMatch(E, m, V, width) {
  assert.ok(E > m, 'incident energy must be above the gap');
  const k = Math.sqrt(E * E - m * m);
  const eps = E - V;
  const disc = eps * eps - m * m;
  const prop = disc > 0;
  const kb = Math.sqrt(Math.abs(disc));
  const spin = (e, qRe, qIm) => [C(e + m, 0), C(qRe, qIm)];
  const eix = (qRe, qIm, x) => {
    const mag = Math.exp(-qIm * x);
    return C(mag * Math.cos(qRe * x), mag * Math.sin(qRe * x));
  };
  const sI = spin(E, k, 0), sR = spin(E, -k, 0);
  const sA = prop ? spin(eps, kb, 0) : spin(eps, 0, kb);
  const sB = prop ? spin(eps, -kb, 0) : spin(eps, 0, -kb);
  const eA = prop ? eix(kb, 0, width) : eix(0, kb, width);
  const eB = prop ? eix(-kb, 0, width) : eix(0, -kb, width);
  const eT = eix(k, 0, width);
  const rows = [], rhs = [];
  for (const comp of [0, 1]) {
    rows.push([sR[comp], cmul(sA[comp], C(-1)), cmul(sB[comp], C(-1)), C(0)]);
    rhs.push(cmul(sI[comp], C(-1)));
    rows.push([C(0), cmul(sA[comp], eA), cmul(sB[comp], eB), cmul(cmul(sI[comp], eT), C(-1))]);
    rhs.push(C(0));
  }
  const sol = solve4(rows, rhs);
  const r = sol[0], t = sol[3];
  const R = r.re * r.re + r.im * r.im;
  const T = t.re * t.re + t.im * t.im;
  return { T, R, sum: T + R, propagating: prop, eps };
}

// Positive-energy spinor of H_0 = k σ_x + m σ_z. k = 0 and m = 0 is undefined; the packet
// weight there is zero, and the chirality-(+1) vector keeps the FFT finite.
function spinorAmp(k, m) {
  const E = Math.hypot(k, m);
  if (E < 1e-15) return [1 / Math.SQRT2, 1 / Math.SQRT2];
  return [
    Math.sqrt((E + m) / (2 * E)),
    (k >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, E - m) / (2 * E)),
  ];
}

// Strang split-step on a periodic interval. Kinetic piece is exact in Fourier space
// (e^{-i k dt σ_x}); the potential and mass are exact multiplications by e^{-i (V + m σ_z) dt/2}.
// T is the probability on cells with x > b1, divided by the total probability, after tEnd.
function evolve(p) {
  const { N, Ldom, m, V, b0, b1, k0, x0, sigma, dt, tEnd } = p;
  const dx = Ldom / N;
  const ur = new Float64Array(N), ui = new Float64Array(N);
  const vr = new Float64Array(N), vi = new Float64Array(N);
  const ks = new Float64Array(N);
  for (let j = 0; j < N; j++) ks[j] = (j < N / 2 ? j : j - N) * 2 * Math.PI / Ldom;
  const sigmaK = 1 / (2 * sigma);
  const dk = 2 * Math.PI / Ldom;
  const pref = Math.sqrt(2 * Math.PI) / dx;
  const Ur = new Float64Array(N), Ui = new Float64Array(N);
  const Vr = new Float64Array(N), Vi = new Float64Array(N);
  for (let j = 0; j < N; j++) {
    const k = ks[j];
    const phiMag = Math.pow(2 * Math.PI * sigmaK * sigmaK, -0.25) * Math.exp(-((k - k0) ** 2) / (4 * sigmaK * sigmaK));
    const phiR = phiMag * Math.cos(-k * x0), phiI = phiMag * Math.sin(-k * x0);
    const [uAmp, vAmp] = spinorAmp(k, m);
    Ur[j] = pref * phiR * uAmp; Ui[j] = pref * phiI * uAmp;
    Vr[j] = pref * phiR * vAmp; Vi[j] = pref * phiI * vAmp;
  }
  fft(Ur, Ui, true); fft(Vr, Vi, true);
  ur.set(Ur); ui.set(Ui); vr.set(Vr); vi.set(Vi);
  const density = i => ur[i] * ur[i] + ui[i] * ui[i] + vr[i] * vr[i] + vi[i] * vi[i];
  const prob = () => { let s = 0; for (let i = 0; i < N; i++) s += density(i); return s * dx; };
  const n0 = prob();
  const Vx = new Float64Array(N);
  let cells = 0;
  for (let i = 0; i < N; i++) if (i * dx >= b0 && i * dx <= b1) { Vx[i] = V; cells++; }
  const steps = Math.round(tEnd / dt);
  const half = dt / 2;
  const cM = Math.cos(m * half), sM = Math.sin(m * half);
  for (let step = 0; step < steps; step++) {
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 1) {
        fft(ur, ui, false); fft(vr, vi, false);
        for (let j = 0; j < N; j++) {
          const phi = ks[j] * dt, c = Math.cos(phi), s = Math.sin(phi);
          const urj = ur[j], uij = ui[j], vrj = vr[j], vij = vi[j];
          // e^{-i φ σ_x} (u, v), φ = k dt. σ_x swaps the components.
          ur[j] = c * urj + s * vij;
          ui[j] = c * uij - s * vrj;
          vr[j] = c * vrj + s * uij;
          vi[j] = c * vij - s * urj;
        }
        fft(ur, ui, true); fft(vr, vi, true);
      }
      for (let i = 0; i < N; i++) {
        const ph = -Vx[i] * half, cr = Math.cos(ph), ci = Math.sin(ph);
        const ur2 = cM * ur[i] + sM * ui[i];
        const ui2 = cM * ui[i] - sM * ur[i];
        const vr2 = cM * vr[i] - sM * vi[i];
        const vi2 = cM * vi[i] + sM * vr[i];
        ur[i] = cr * ur2 - ci * ui2; ui[i] = cr * ui2 + ci * ur2;
        vr[i] = cr * vr2 - ci * vi2; vi[i] = cr * vi2 + ci * vr2;
      }
    }
  }
  const n1 = prob();
  let left = 0, barrier = 0, right = 0, cm = 0;
  for (let i = 0; i < N; i++) {
    const x = i * dx, d = density(i) * dx;
    cm += x * d;
    if (x < b0) left += d;
    else if (x > b1) right += d;
    else barrier += d;
  }
  cm /= n1;
  return {
    N, dx, steps, dt, tEnd, m, V, b0, b1, cells, k0, x0, sigma, sigmaK, Ldom,
    norm0: n0, norm1: n1,
    left, barrier, right,
    T: right / n1,
    R: left / n1,
    center: cm,
  };
}

// The plate's paint, copied so a drift in the cartoon fails this file. Not a Dirac solver.
function plateCartoon(s) {
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const W = s.grid | 0;
  const H = Math.max(48, Math.round(W * (ASPECTS[s.aspect] || 1)));
  const V = s.V, Lw = s.width, th = s.theta * Math.PI / 180, k = s.k;
  const ky = k * Math.sin(th);
  const xB = W * 0.45, xE = xB + Lw;
  const q = Math.sqrt(Math.max(1e-8, (k - V) * (k - V) - ky * ky));
  const assigned = th === 0 || Math.abs(Math.sin(th)) < 1e-3;
  const T = assigned
    ? 1
    : 1 / (1 + (V * Math.sin(th) * Math.sin(q * Lw / Math.max(1, W * 0.01))) ** 2 / Math.max(1e-6, (k * k * Math.cos(th) * Math.cos(th))));
  const field = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const t = y / Math.max(1, H - 1);
    for (let x = 0; x < W; x++) {
      const inside = x >= xB && x <= xE;
      let amp = 1;
      if (x < xB) amp = 1;
      else if (inside) amp = 0.55 + 0.45 * Math.cos(q * (x - xB));
      else amp = Math.sqrt(Math.max(0, Math.min(1, T)));
      const env = Math.exp(-Math.pow((x - (20 + t * (W - 40))) / 18, 2));
      field[y * W + x] = (amp * amp) * (0.25 + 0.75 * env) * (inside ? 0.85 : 1);
    }
  }
  return { field, T, assigned, W, H, xB, xE };
}

function fieldRatio(field, W, H, xB, xE) {
  let left = 0, right = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = field[y * W + x];
    if (x < xB) left += v;
    else if (x > xE) right += v;
  }
  return { left, right, ratio: right / left };
}

function maxAbsFloat32(a, b) {
  let m = 0;
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > m) m = d;
  }
  return m;
}

// -------------------------------------------------------------------------------------------------

const E = 1.2;
const BARRIER_V = 2.5;
const BARRIER_W = 12;
const MASS = 0.6;
const kMassless = E; // m = 0, E = |k|
const kMassive = Math.sqrt(E * E - MASS * MASS);
const PACKET = { Ldom: 1600, b0: 900, b1: 900 + BARRIER_W, x0: 700, sigma: 28, dt: 0.05, tEnd: 420 };

function runPacket(N, m, V, k0) {
  return evolve({ ...PACKET, N, m, V, k0 });
}

assert.match(
  source,
  /const T = th === 0 \|\| Math\.abs\(Math\.sin\(th\)\) < 1e-3\s*\?\s*1/,
  'compute() no longer assigns T = 1 at normal incidence'
);

const monoMassless = [];
for (const V of [0.5, 2.5, 4]) for (const width of [2, 12, 20]) {
  const row = modeMatch(E, 0, V, width);
  assert.ok(acceptsUnitTransmission(row.T), 'massless mode match left unit transmission: ' + V + ' ' + width);
  assert.ok(Math.abs(row.sum - 1) < 1e-9, 'mode match not unitary');
  monoMassless.push({ V, width, T: row.T, R: row.R, sum: row.sum, eps: row.eps });
}
const monoMass = modeMatch(E, MASS, BARRIER_V, BARRIER_W);
assert.ok(!acceptsUnitTransmission(monoMass.T), 'mass term must fail the T ≈ 1 predicate on the mode match');
assert.ok(monoMass.T < 1 - UNIT_TOL && monoMass.T > 0.2, 'massive mode-match T out of the expected open interval');
assert.ok(Math.abs(monoMass.sum - 1) < 1e-9, 'massive mode match not unitary');
assert.ok(monoMass.eps < -MASS, 'this barrier is not in the Klein regime');

const masslessCoarse = runPacket(4096, 0, BARRIER_V, kMassless);
const masslessFine = runPacket(8192, 0, BARRIER_V, kMassless);
const massiveCoarse = runPacket(4096, MASS, BARRIER_V, kMassive);
const massiveFine = runPacket(8192, MASS, BARRIER_V, kMassive);
const massiveFree = evolve({ ...PACKET, N: 4096, m: MASS, V: 0, k0: kMassive, tEnd: 520 });
const flight = evolve({
  N: 2048, Ldom: 1600, m: 0, V: 0, b0: 900, b1: 912, k0: kMassless, x0: 700, sigma: 28, dt: 0.05, tEnd: 80,
});

function assertPacket(row, label) {
  assert.ok(Math.abs(row.norm0 - 1) < 1e-6, label + ' initial norm');
  assert.ok(Math.abs(row.norm1 - 1) < 1e-8, label + ' norm drifted');
  assert.ok(row.barrier < 1e-8, label + ' packet still in the barrier');
}
for (const [row, label] of [
  [masslessCoarse, 'massless N=4096'],
  [masslessFine, 'massless N=8192'],
  [massiveCoarse, 'massive N=4096'],
  [massiveFine, 'massive N=8192'],
  [massiveFree, 'massive V=0'],
]) assertPacket(row, label);

assert.ok(acceptsUnitTransmission(masslessCoarse.T), 'coarse massless packet missed T ≈ 1');
assert.ok(acceptsUnitTransmission(masslessFine.T), 'fine massless packet missed T ≈ 1');
assert.ok(!acceptsUnitTransmission(masslessFine.R), 'reflected probability must not pass as transmission');
assert.ok(masslessFine.R < 1e-8, 'massless packet reflected');

assert.ok(!acceptsUnitTransmission(massiveCoarse.T), 'coarse mass packet must fail T ≈ 1');
assert.ok(!acceptsUnitTransmission(massiveFine.T), 'fine mass packet must fail T ≈ 1');
assert.ok(massiveFine.T < 0.5 && massiveFine.T > 0.2, 'massive packet T out of the open interval');
assert.ok(Math.abs(massiveFine.T - monoMass.T) <= MATCH_TOL, 'fine packet disagrees with the mode match');
assert.ok(acceptsUnitTransmission(massiveFree.T), 'a massive packet with no barrier should still transmit');

const flightShift = flight.center - 700;
assert.ok(Math.abs(flightShift - 80) < 0.5, 'free massless packet did not travel at speed 1, shift ' + flightShift);

const plate = load('klein', { names: 'DEFAULTS', capture: 'metric,extra,field,W,H' });
const plateCases = [
  { theta: 0, V: 1.8, width: 16, k: 0.9, grid: 160, aspect: '1:1' },
  { theta: 0, V: 4, width: 40, k: 0.3, grid: 160, aspect: '1:1' },
  { theta: 0, V: 0.4, width: 4, k: 2, grid: 160, aspect: '1:1' },
  { theta: 0.05, V: 3, width: 20, k: 1, grid: 160, aspect: '1:1' },
  { theta: 35, V: 1.8, width: 16, k: 0.9, grid: 128, aspect: '16:9' },
];
const plateRows = [];
for (const s of plateCases) {
  const got = plate.compute(s);
  const ref = plateCartoon({ ...plate.hooks.DEFAULTS, ...s });
  const err = maxAbsFloat32(got.field, ref.field);
  const sums = fieldRatio(got.field, got.W, got.H, ref.xB, ref.xE);
  assert.equal(err, 0, 'plate field is not the cartoon');
  assert.equal(got.metric, ref.T, 'plate metric is not the expression in compute()');
  assert.equal(got.extra, s.theta);
  if (ref.assigned) assert.equal(got.metric, 1);
  plateRows.push({
    theta: s.theta, V: s.V, width: s.width, k: s.k, grid: s.grid, aspect: s.aspect,
    W: got.W, H: got.H, metric: got.metric, assigned: ref.assigned,
    fieldMaxAbs: err, rightOverLeft: sums.ratio,
  });
}
const wide = plateRows.find(r => r.V === 4 && r.width === 40);
assert.equal(wide.metric, 1);
assert.ok(Math.abs(wide.rightOverLeft - 1) > 0.2, 'painted field ratio accidentally equals the assigned 1');
const tall = plateRows.find(r => r.V === 0.4);
assert.equal(tall.metric, 1);
assert.ok(tall.rightOverLeft > 1.05, 'a short barrier should paint more on the right than the left, while T stays 1');

const pack = row => ({
  N: row.N, dx: row.dx, steps: row.steps, norm0: row.norm0, norm1: row.norm1,
  T: row.T, R: row.R, barrier: row.barrier, center: row.center,
  acceptsUnitTransmission: acceptsUnitTransmission(row.T),
});

const result = {
  basis: 'deterministic',
  date: '2026-09-27',
  source: SOURCE,
  sourceSha256,
  command: 'node tools/klein-science.js --write',
  hamiltonian: 'H = -i sigma_x d/dx + m sigma_z + V(x), hbar = v_F = 1',
  measurement: {
    what: 'Probability of a positive-energy Gaussian wave packet on cells with x > b1, divided by the total probability, after the packet has left the barrier.',
    window: 'Periodic interval of length 1600. Square barrier on x in [900, 912], height 2.5. Packet centered at x = 700 with position standard deviation 28. Transmission is the sum of |psi|^2 for x > 912. Reflection is x < 900. The barrier bin must hold under 1e-8 before T is accepted.',
    grid: 'N = 4096 (dx = 0.390625) and N = 8192 (dx = 0.1953125). Strang split-step, dt = 0.05, tEnd = 420. Kinetic evolution is spectral; V and m are local multiplications.',
    energy: 'Incident packet peaked at E = 1.2. Massless k0 = 1.2. Massive k0 = sqrt(E^2 - m^2) with m = 0.6. Inside the barrier epsilon = E - V = -1.3, which is below -m, so both runs are in the Klein regime.',
    tolerance: UNIT_TOL,
    matchTolerance: MATCH_TOL,
  },
  modeMatch: {
    massless: monoMassless,
    massive: { E, m: MASS, V: BARRIER_V, width: BARRIER_W, ...monoMass, acceptsUnitTransmission: acceptsUnitTransmission(monoMass.T) },
  },
  wavePacket: {
    masslessCoarse: pack(masslessCoarse),
    masslessFine: pack(masslessFine),
    massiveCoarse: pack(massiveCoarse),
    massiveFine: pack(massiveFine),
    massiveNoBarrier: pack(massiveFree),
    freeFlight: {
      ...pack(flight), expectedShift: 80, shift: flightShift,
      note: 'At t = 80 the packet is still left of x = 912, so this T is not a transmission. The check is the center, which must move by +80.',
    },
  },
  plate: {
    note: 'metric is the number compute() stores. At |sin theta| < 1e-3 that number is the literal 1, not an integral of the field. rightOverLeft is the painted Float32 sum on x > xE divided by the sum on x < xB.',
    rows: plateRows,
  },
  pass: true,
};

assert.equal(result.wavePacket.masslessFine.acceptsUnitTransmission, true);
assert.equal(result.wavePacket.massiveFine.acceptsUnitTransmission, false);
assert.equal(result.modeMatch.massive.acceptsUnitTransmission, false);

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/klein-science.json'), JSON.stringify(result, null, 2) + '\n');
}
const mf = result.wavePacket.masslessFine;
const xf = result.wavePacket.massiveFine;
console.log('massless T ' + mf.T + ' (tol ' + UNIT_TOL + ', pass)');
console.log('massive T ' + xf.T + ' mode-match ' + monoMass.T + ' (same predicate fails)');
console.log('plate theta=0 metrics ' + plateRows.filter(r => r.assigned).map(r => r.metric).join(', ') + '; V=4 field ratio ' + wide.rightOverLeft);
console.log('basis deterministic; source ' + sourceSha256);
