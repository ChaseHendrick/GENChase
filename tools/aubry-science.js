// Independent Aubry-André Lyapunov exponent. Pure Node, no browser, no plate relaxation.
// node tools/aubry-science.js [--write]
//
// Hamiltonian, unit hopping, open line for the transfer matrix and an open chain for
// diagonalization:
//   psi_{n+1} + psi_{n-1} + 2 λ cos(2 π β n) psi_n = E psi_n
// β = (sqrt(5) - 1) / 2 unless a failure control says otherwise.
// The self-dual point of this normalization is λ = 1. For λ > 1 the inverse
// localization length of every eigenstate is log(λ). The fixed-step imaginary-time
// relaxation in src/modules/aubry.js is not executed and is not the measured quantity.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/modules/aubry.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const harnessSha256 = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');

// The plate's potential must stay the normalization this benchmark measures.
assert(source.includes('2 * lam * Math.cos(2 * Math.PI * beta * i)'),
  'The potential formula changed; this benchmark is for 2λ cos, critical at λ = 1');
assert(!source.includes('disagreement is open') && !source.includes('Reconciling the convention'),
  'The module still describes the λ = 2 convention as an open disagreement');

const BETA = 0.5 * (Math.sqrt(5) - 1);
const TOL = 0.012;
const LENGTHS = [256, 2048];
const LOCALIZED = [1.5, 2, 3];
const EXTENDED = [0.3, 0.6];

function potential(n, lambda, beta, factor) {
  return factor * lambda * Math.cos(2 * Math.PI * beta * n);
}

// Expanding singular value of the transfer-matrix product. QR (Gram-Schmidt) every
// step, so the entries stay O(1). No boundary condition: this is the infinite line.
function lyapunov(E, lambda, beta, N, factor = 2) {
  let a00 = 1, a10 = 0, a01 = 0, a11 = 1;
  let sum = 0;
  for (let n = 0; n < N; n++) {
    const t00 = E - potential(n, lambda, beta, factor);
    const b00 = t00 * a00 - a10;
    const b10 = a00;
    const b01 = t00 * a01 - a11;
    const b11 = a01;
    const n0 = Math.hypot(b00, b10);
    if (!(n0 > 0) || !Number.isFinite(n0)) throw new Error('transfer matrix overflow or collapse at n=' + n);
    const q00 = b00 / n0, q10 = b10 / n0;
    const r01 = q00 * b01 + q10 * b11;
    const c01 = b01 - r01 * q00, c11 = b11 - r01 * q10;
    const n1 = Math.hypot(c01, c11);
    if (!(n1 > 0) || !Number.isFinite(n1)) throw new Error('second singular value collapsed at n=' + n);
    sum += Math.log(n0);
    a00 = q00; a10 = q10; a01 = c01 / n1; a11 = c11 / n1;
  }
  return sum / N;
}

function hamiltonian(N, lambda, beta, periodic) {
  const H = Array.from({ length: N }, () => new Float64Array(N));
  for (let i = 0; i < N; i++) {
    H[i][i] = potential(i, lambda, beta, 2);
    if (i + 1 < N) { H[i][i + 1] = 1; H[i + 1][i] = 1; }
  }
  if (periodic) { H[0][N - 1] = 1; H[N - 1][0] = 1; }
  return H;
}

// Dense Jacobi. N stays at 64 or 96, so this is a few tens of milliseconds.
function jacobiEigen(H) {
  const n = H.length;
  const A = H.map(row => Float64Array.from(row));
  const V = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(n);
    row[i] = 1;
    return row;
  });
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off < 1e-28) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) < 1e-18) continue;
        const app = A[p][p], aqq = A[q][q];
        const tau = (aqq - app) / (2 * apq);
        const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t), s = t * c;
        for (let i = 0; i < n; i++) {
          if (i === p || i === q) continue;
          const aip = A[i][p], aiq = A[i][q];
          A[i][p] = A[p][i] = c * aip - s * aiq;
          A[i][q] = A[q][i] = s * aip + c * aiq;
        }
        A[p][p] = app - t * apq;
        A[q][q] = aqq + t * apq;
        A[p][q] = A[q][p] = 0;
        for (let i = 0; i < n; i++) {
          const vip = V[i][p], viq = V[i][q];
          V[i][p] = c * vip - s * viq;
          V[i][q] = s * vip + c * viq;
        }
      }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => A[i][i] - A[j][j]);
  const values = order.map(i => A[i][i]);
  const vectors = order.map(j => Float64Array.from({ length: n }, (_, i) => V[i][j]));
  return { values, vectors };
}

function residual(H, values, vectors) {
  const n = values.length;
  let max = 0;
  for (let k = 0; k < n; k += Math.max(1, Math.floor(n / 8))) {
    const psi = vectors[k], E = values[k];
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      let y = H[i][i] * psi[i];
      if (i) y += H[i][i - 1] * psi[i - 1];
      if (i + 1 < n) y += H[i][i + 1] * psi[i + 1];
      if (i === 0) y += H[0][n - 1] * psi[n - 1];
      if (i === n - 1) y += H[n - 1][0] * psi[0];
      const d = y - E * psi[i];
      num += d * d;
      den += psi[i] * psi[i];
    }
    max = Math.max(max, Math.sqrt(num / den));
  }
  return max;
}

function ipr(psi) {
  let q = 0, s = 0;
  for (const x of psi) { const p = x * x; s += p; q += p * p; }
  return q / (s * s);
}

// Slope of log|psi| against distance from the peak, using the max in bins of width 2
// so a single node does not set the envelope. Independent of the transfer matrix.
function envelopeGamma(psi) {
  const n = psi.length;
  let peak = 0;
  for (let i = 1; i < n; i++) if (Math.abs(psi[i]) > Math.abs(psi[peak])) peak = i;
  const amp = Math.abs(psi[peak]);
  const xs = [], ys = [];
  const bin = 2;
  for (const dir of [-1, 1]) {
    for (let b = 1; ; b++) {
      const a = peak + dir * ((b - 1) * bin + 1);
      const c = peak + dir * (b * bin);
      const lo = Math.min(a, c), hi = Math.max(a, c);
      if (hi < 0 || lo >= n) break;
      let m = 0;
      for (let i = Math.max(0, lo); i <= Math.min(n - 1, hi); i++) m = Math.max(m, Math.abs(psi[i]));
      if (m < Math.max(amp * 1e-12, 1e-18)) break;
      xs.push((b - 0.5) * bin);
      ys.push(Math.log(m));
    }
  }
  if (xs.length < 4) return { gamma: null, points: xs.length, peak };
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < xs.length; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
  }
  const m = xs.length;
  const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx);
  return { gamma: -slope, points: m, peak };
}

function passes(gamma, lambda) {
  return Math.abs(gamma - Math.log(lambda)) < TOL;
}

function round(x, digits = 8) {
  if (x === null || x === undefined || !Number.isFinite(x)) return x;
  return Number(x.toFixed(digits));
}

const started = Date.now();

const atZero = [];
for (const lambda of [...EXTENDED, 1, ...LOCALIZED]) {
  const row = { lambda, logLambda: lambda > 0 ? Math.log(lambda) : null, E: 0, beta: BETA, factor: 2 };
  for (const N of LENGTHS) row['gamma' + N] = lyapunov(0, lambda, BETA, N, 2);
  row.absErr256 = Math.abs(row.gamma256 - Math.log(lambda));
  row.absErr2048 = Math.abs(row.gamma2048 - Math.log(lambda));
  atZero.push(row);
}

for (const row of atZero.filter(r => LOCALIZED.includes(r.lambda))) {
  assert(passes(row.gamma2048, row.lambda), 'localized λ=' + row.lambda + ' missed log(λ) at N=2048: ' + row.gamma2048);
  assert(passes(row.gamma256, row.lambda), 'localized λ=' + row.lambda + ' missed log(λ) at N=256: ' + row.gamma256);
  assert(row.absErr2048 < row.absErr256, 'finite-N bias did not shrink for λ=' + row.lambda);
}
for (const row of atZero.filter(r => EXTENDED.includes(r.lambda))) {
  assert(Math.abs(row.gamma256) < 0.01, 'extended λ=' + row.lambda + ' not near 0 at N=256');
  assert(Math.abs(row.gamma2048) < 0.001, 'extended λ=' + row.lambda + ' not near 0 at N=2048');
  assert(Math.abs(row.gamma2048) < Math.abs(row.gamma256), 'extended exponent did not fall with N, λ=' + row.lambda);
  // |log(λ)| below the transition is not a localization exponent. A formula that
  // returns it here fails this bound; returning 0 does not.
  assert(Math.abs(row.gamma2048) < 0.05 * Math.abs(Math.log(row.lambda)),
    'extended exponent is not much smaller than |log(λ)|');
}

const critical = atZero.find(r => r.lambda === 1);
assert(critical.gamma256 > 0 && critical.gamma256 < 0.05, 'critical N=256 exponent out of the reported window');
assert(critical.gamma2048 < critical.gamma256, 'critical exponent did not fall with N');
assert(critical.gamma256 < 0.1 * Math.min(...LOCALIZED.map(l => lyapunov(0, l, BETA, 256))),
  'critical exponent is not well below every λ>1 measurement');
// Do not assert equality with 0 at N=256. The measured value is still visibly above
// the extended phase and only approaches 0 slowly.

// Open chain, N=64. Mid-spectrum means the eigenvalue closest to 0. A spread of
// other eigenvalues checks that the match is not one energy.
const eigenstates = [];
for (const lambda of [...EXTENDED, 1, ...LOCALIZED]) {
  const H = hamiltonian(64, lambda, BETA, false);
  const solved = jacobiEigen(H);
  const res = residual(H, solved.values, solved.vectors);
  assert(res < 1e-10, 'Jacobi residual too large at λ=' + lambda + ': ' + res);
  let mid = 0;
  for (let i = 1; i < 64; i++) if (Math.abs(solved.values[i]) < Math.abs(solved.values[mid])) mid = i;
  const indices = [0, 16, 32, 48, 63];
  if (!indices.includes(mid)) indices.push(mid);
  for (const index of indices) {
    const E = solved.values[index];
    const gamma = lyapunov(E, lambda, BETA, 2048, 2);
    const participation = ipr(solved.vectors[index]);
    const fit = index === mid ? envelopeGamma(solved.vectors[index]) : null;
    const entry = {
      lambda, index, energy: E, gamma, ipr: participation,
      envelope: fit ? fit.gamma : null, envelopePoints: fit ? fit.points : null,
      residual: res, mid: index === mid, boundary: 'open', N: 64,
    };
    eigenstates.push(entry);
    if (LOCALIZED.includes(lambda)) {
      assert(Math.abs(gamma - Math.log(lambda)) < 0.02,
        'eigenvalue LE missed log(λ) at λ=' + lambda + ' index ' + index + ': ' + gamma);
    }
  }
  const midRow = eigenstates.find(e => e.lambda === lambda && e.mid);
  if (LOCALIZED.includes(lambda)) {
    assert(midRow.envelope !== null && midRow.envelopePoints >= 4, 'no envelope at λ=' + lambda);
    assert(Math.abs(midRow.envelope - midRow.gamma) < 0.06,
      'envelope and transfer matrix disagree at λ=' + lambda + ': ' + midRow.envelope + ' vs ' + midRow.gamma);
    assert(midRow.ipr > 0.2, 'localized mid state is not peaked, λ=' + lambda);
  }
  if (EXTENDED.includes(lambda)) {
    assert(Math.abs(midRow.gamma) < 0.02, 'extended eigenenergy is not near 0 LE');
    assert(midRow.envelope !== null && Math.abs(midRow.envelope) < 0.05, 'extended envelope is not flat');
    assert(Math.abs(midRow.envelope - midRow.gamma) < 0.05, 'extended envelope and transfer matrix disagree');
    assert(midRow.ipr * 64 < 4, 'extended IPR is not O(1/N)');
  }
}
const midOf = lambda => eigenstates.find(e => e.lambda === lambda && e.mid);
assert(Math.abs(midOf(1).gamma) < 0.05, 'critical eigenenergy LE is not small');
assert(midOf(1).ipr > midOf(0.3).ipr, 'critical IPR did not rise above the extended phase');
assert(midOf(1).ipr < midOf(1.5).ipr, 'critical IPR already matches the localized phase');

// Rational β = 1/3 destroys the transition. Same tolerance, same transfer length.
// In-band: eigenvalue nearest 0 of a periodic chain whose length is a multiple of 3,
// so the energy lies in a Bloch band and the exponent must go to 0, not log(λ).
// E = 0 is recorded as well; for this commensurate potential it sits in a gap and
// its exponent is positive but still not log(λ).
const rational = [];
for (const lambda of [2, 3]) {
  const H = hamiltonian(96, lambda, 1 / 3, true);
  const solved = jacobiEigen(H);
  assert(residual(H, solved.values, solved.vectors) < 1e-10, 'rational Jacobi residual');
  let mid = 0;
  for (let i = 1; i < 96; i++) if (Math.abs(solved.values[i]) < Math.abs(solved.values[mid])) mid = i;
  const energy = solved.values[mid];
  const gammaBand = lyapunov(energy, lambda, 1 / 3, 2048, 2);
  const gammaZero = lyapunov(0, lambda, 1 / 3, 2048, 2);
  const gammaBand256 = lyapunov(energy, lambda, 1 / 3, 256, 2);
  rational.push({
    lambda, beta: 1 / 3, boundary: 'periodic, N=96, commensurate',
    bandEnergy: energy, gammaBand2048: gammaBand, gammaBand256: gammaBand256,
    gammaZero2048: gammaZero, logLambda: Math.log(lambda),
    bandAbsErr2048: Math.abs(gammaBand - Math.log(lambda)),
    zeroAbsErr2048: Math.abs(gammaZero - Math.log(lambda)),
    passesBand: passes(gammaBand, lambda),
    passesZero: passes(gammaZero, lambda),
    ipr: ipr(solved.vectors[mid]),
  });
  assert(!passes(gammaBand, lambda), 'rational in-band exponent matched log(λ); the failure control cannot fail');
  assert(!passes(gammaZero, lambda), 'rational E=0 exponent matched log(λ); the failure control cannot fail');
  assert(Math.abs(gammaBand) < TOL, 'rational in-band exponent is not consistent with 0');
  assert(ipr(solved.vectors[mid]) * 96 < 4, 'rational mid state is not extended');
}

// The other convention, potential λ cos rather than 2λ cos, is the λ_c = 2 normalization.
// At λ = 2 that potential is critical (almost-Mathieu coupling 1) and must not match log(2).
const halfAmplitude = [2, 3].map(lambda => {
  const gamma = lyapunov(0, lambda, BETA, 2048, 1);
  return {
    lambda, factor: 1, E: 0, N: 2048, gamma, logLambda: Math.log(lambda),
    absErr: Math.abs(gamma - Math.log(lambda)), passes: passes(gamma, lambda),
  };
});
for (const row of halfAmplitude) {
  assert(!row.passes, 'half-amplitude potential matched log(λ); the convention check cannot fail');
}

// A broken normalization that reports the raw log of the product, not per site, fails too.
const unnormalized = lyapunov(0, 2, BETA, 2048, 2) * 2048;
assert(!passes(unnormalized, 2), 'forgetting to divide by N still passed');

const elapsedMs = Date.now() - started;
assert(elapsedMs < 20000, 'science tool exceeded 20s: ' + elapsedMs);

const result = {
  pass: true,
  reviewed: '2026-09-27',
  source: 'src/modules/aubry.js',
  sourceSha256,
  harness: 'tools/aubry-science.js',
  harnessSha256,
  command: 'node tools/aubry-science.js --write',
  elapsedMs,
  model: {
    equation: 'psi(n+1)+psi(n-1)+2*lambda*cos(2*pi*beta*n)*psi(n) = E*psi(n)',
    hopping: 1,
    potential: '2*lambda*cos(2*pi*beta*n)',
    beta: BETA,
    betaExact: '(sqrt(5)-1)/2',
    selfDualLambda: 1,
    inverseLocalizationLength: 'log(lambda) for lambda>1 on the spectrum; 0 for lambda<1',
    transferMatrix: 'Infinite line, phase 0, no boundary condition. One-step matrices, QR every step, Lyapunov exponent (1/N) sum log(expanding singular value).',
    diagonalization: 'Open chain, N=64, no corner hopping. Jacobi in Float64. The rational control uses a periodic chain of N=96.',
    plate: 'Not measured. src/modules/aubry.js relaxes one Gaussian start for a fixed number of steps and draws that picture. Its IPR is not this Lyapunov exponent.',
  },
  tolerance: {
    shared: TOL,
    meaning: 'absolute |gamma - log(lambda)| at transfer length 2048. Irrational E=0 for lambda in {1.5,2,3} must pass. Rational beta=1/3, in-band and at E=0, must fail the same test. The potential lambda*cos (factor 1) must fail it too.',
    eigenstateTransfer: 0.02,
    envelopeVersusTransfer: 0.06,
    extendedAbs2048: 0.001,
    extendedAbs256: 0.01,
  },
  atZero: atZero.map(r => ({
    lambda: r.lambda,
    logLambda: round(r.logLambda),
    gamma256: round(r.gamma256),
    gamma2048: round(r.gamma2048),
    absErr256: round(r.absErr256),
    absErr2048: round(r.absErr2048),
    passes2048: LOCALIZED.includes(r.lambda) ? passes(r.gamma2048, r.lambda) : null,
  })),
  critical: {
    lambda: 1,
    gamma256: round(critical.gamma256),
    gamma2048: round(critical.gamma2048),
    note: 'Critical. The exponent stays near 0 and falls with N, slower than the extended phase and far below log(1.5). It is not asserted to equal 0 at these lengths.',
  },
  eigenstates: eigenstates.map(e => ({
    lambda: e.lambda, index: e.index, mid: e.mid, N: e.N, boundary: e.boundary,
    energy: round(e.energy), gamma: round(e.gamma), ipr: round(e.ipr),
    envelope: e.envelope === null ? null : round(e.envelope),
    envelopePoints: e.envelopePoints,
    absErrVersusLog: LOCALIZED.includes(e.lambda) ? round(Math.abs(e.gamma - Math.log(e.lambda))) : null,
    envelopeMinusGamma: e.envelope === null ? null : round(e.envelope - e.gamma),
  })),
  rationalBeta: rational.map(r => ({
    lambda: r.lambda, beta: r.beta, boundary: r.boundary,
    bandEnergy: round(r.bandEnergy, 6),
    gammaBand256: round(r.gammaBand256),
    gammaBand2048: round(r.gammaBand2048),
    gammaZero2048: round(r.gammaZero2048),
    logLambda: round(r.logLambda),
    bandAbsErr2048: round(r.bandAbsErr2048),
    zeroAbsErr2048: round(r.zeroAbsErr2048),
    passesBand: r.passesBand, passesZero: r.passesZero,
    ipr: round(r.ipr),
  })),
  halfAmplitude: halfAmplitude.map(r => ({
    lambda: r.lambda, factor: r.factor, gamma: round(r.gamma),
    logLambda: round(r.logLambda), absErr: round(r.absErr), passes: r.passes,
  })),
  failureControls: {
    rationalInBandDoesNotMatchLogLambda: rational.every(r => r.passesBand === false),
    rationalZeroDoesNotMatchLogLambda: rational.every(r => r.passesZero === false),
    halfAmplitudeDoesNotMatchLogLambda: halfAmplitude.every(r => r.passes === false),
    unnormalizedProductRejected: !passes(unnormalized, 2),
  },
  limitations: [
    'Finite transfer length, not a proof of the infinite-volume Lyapunov exponent. The N=2048 error is smaller than the N=256 error for each localized λ; the approach is not monotone at every doubling.',
    'One phase (0) and one irrational (the inverse golden ratio). Not every phase or every irrational.',
    'Open-chain eigenstates at N=64. Not the periodic ring the plate draws, and not the plate relaxation.',
    'At λ=1 the exponent is reported, not matched to 0. It is still above the extended-phase floor at these lengths.',
    'The drawn plate is a fixed-step imaginary-time relaxation. Its inverse participation ratio is not this measurement and was not compared with log(λ).',
  ],
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/aubry-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
