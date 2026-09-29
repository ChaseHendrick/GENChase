'use strict';
// Independent Hatano-Nelson check for the open clean chain.
// The reference is an implicit-shift QL eigensolve of the similar Hermitian
// tight-binding chain, mapped back onto the nonsymmetric matrix.
// It does not call exactModes and it does not insert the sine formula.
// node tools/skin-science.js [--write]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { load, replaceOnce, root } = require('./science-harness');

// Rightward hop e^{+g}, leftward hop e^{-g}, zero diagonal, open ends.
// (H v)_i = e^{g} v_{i-1} + e^{-g} v_{i+1}, sites i = 0..N-1 (labels j = i+1).
// That is the matrix with right eigenvectors proportional to e^{g j} sin(pi n j / (N+1)).
function applyOpen(v, g) {
  const N = v.length;
  const out = new Float64Array(N);
  const tR = Math.exp(g);      // coefficient of the left neighbor: rightward hop
  const tL = Math.exp(-g);     // coefficient of the right neighbor: leftward hop
  for (let i = 0; i < N; i++) {
    const L = i > 0 ? v[i - 1] : 0;
    const R = i + 1 < N ? v[i + 1] : 0;
    out[i] = tR * L + tL * R;
  }
  return out;
}

// Implicit-shift QL for a real symmetric tridiagonal matrix (Wilkinson shift).
// diag is length N, sub is the N-1 subdiagonal entries. Columns of V are eigenvectors.
// The sine closed form is not used. This is the eigensolver.
function symTridiagQL(diag, sub) {
  const n = diag.length;
  const d = Float64Array.from(diag);
  const e = new Float64Array(n);
  for (let i = 0; i < n - 1; i++) e[i] = sub[i];
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;
  const hypot = (a, b) => Math.hypot(a, b);
  const eps = Number.EPSILON;
  let f = 0;
  let tst1 = 0;
  let sweeps = 0;
  for (let l = 0; l < n; l++) {
    tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
    let m = l;
    while (m < n) {
      if (Math.abs(e[m]) <= eps * tst1) break;
      m++;
    }
    if (m > l) {
      let iter = 0;
      do {
        if (++iter > 60) throw new Error('symmetric tridiagonal QL did not converge');
        sweeps++;
        let g = d[l];
        let p = (d[l + 1] - g) / (2 * e[l]);
        let r = hypot(p, 1);
        if (p < 0) r = -r;
        d[l] = e[l] / (p + r);
        d[l + 1] = e[l] * (p + r);
        const dl1 = d[l + 1];
        const hShift = g - d[l];
        for (let i = l + 2; i < n; i++) d[i] -= hShift;
        f += hShift;
        p = d[m];
        let c = 1;
        let c2 = c;
        let c3 = c;
        let s = 0;
        let s2 = 0;
        const el1 = e[l + 1];
        for (let i = m - 1; i >= l; i--) {
          c3 = c2;
          c2 = c;
          s2 = s;
          g = c * e[i];
          let h = c * p;
          r = hypot(p, e[i]);
          e[i + 1] = s * r;
          s = e[i] / r;
          c = p / r;
          p = c * d[i] - s * g;
          d[i + 1] = h + s * (c * g + s * d[i]);
          for (let k = 0; k < n; k++) {
            h = V[k * n + i + 1];
            V[k * n + i + 1] = s * V[k * n + i] + c * h;
            V[k * n + i] = c * V[k * n + i] - s * h;
          }
        }
        p = -s * s2 * c3 * el1 * e[l] / dl1;
        e[l] = s * p;
        d[l] = c * p;
      } while (Math.abs(e[l]) > eps * tst1);
    }
    d[l] += f;
    e[l] = 0;
  }
  for (let i = 0; i < n - 1; i++) {
    let k = i;
    let p = d[i];
    for (let j = i + 1; j < n; j++) if (d[j] < p) { k = j; p = d[j]; }
    if (k !== i) {
      d[k] = d[i];
      d[i] = p;
      for (let j = 0; j < n; j++) {
        const t = V[j * n + i];
        V[j * n + i] = V[j * n + k];
        V[j * n + k] = t;
      }
    }
  }
  return { values: d, vectors: V, sweeps };
}

// Balanced exact diagonalization of the open Hatano-Nelson chain.
// S = diag(e^{g j}) maps H to the Hermitian hopping of unit off-diagonals.
// Eigenvectors of that Hermitian matrix come from QL, then psi = S phi.
// Residuals are checked by applying the nonsymmetric H, not the sine formula.
function edOpen(N, g) {
  const diag = new Float64Array(N);
  const sub = new Float64Array(N - 1);
  for (let i = 0; i < N - 1; i++) sub[i] = 1;
  const { values, vectors, sweeps } = symTridiagQL(diag, sub);
  const order = [...Array(N).keys()].sort((a, b) => values[b] - values[a] || a - b);
  const evals = order.map(k => values[k]);
  const evecs = [];
  let maxResidual = 0;
  for (let m = 0; m < N; m++) {
    const col = order[m];
    const psi = new Float64Array(N);
    let nrm = 0;
    for (let i = 0; i < N; i++) {
      const j = i + 1;
      const phi = vectors[i * N + col];
      const v = Math.exp(g * j) * phi;
      psi[i] = v;
      nrm += v * v;
    }
    nrm = Math.sqrt(nrm) || 1;
    for (let i = 0; i < N; i++) psi[i] /= nrm;
    const Hv = applyOpen(psi, g);
    let res = 0;
    const E = evals[m];
    for (let i = 0; i < N; i++) res = Math.max(res, Math.abs(Hv[i] - E * psi[i]));
    maxResidual = Math.max(maxResidual, res);
    evecs.push(psi);
  }
  return { evals, evecs, sweeps, maxResidual };
}

function analyticEigenvalue(N, n) {
  return 2 * Math.cos(Math.PI * n / (N + 1));
}

function analyticRight(N, n, g) {
  const psi = new Float64Array(N);
  let nrm = 0;
  for (let i = 0; i < N; i++) {
    const j = i + 1;
    const v = Math.exp(g * j) * Math.sin(Math.PI * n * j / (N + 1));
    psi[i] = v;
    nrm += v * v;
  }
  nrm = Math.sqrt(nrm) || 1;
  for (let i = 0; i < N; i++) psi[i] /= nrm;
  return psi;
}

function maxAbs(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

function alignSign(ed, analytic) {
  let dot = 0;
  for (let i = 0; i < ed.length; i++) dot += ed[i] * analytic[i];
  if (dot < 0) {
    for (let i = 0; i < ed.length; i++) ed[i] = -ed[i];
  }
  return dot;
}

function probability(psi) {
  const p = new Float64Array(psi.length);
  for (let i = 0; i < psi.length; i++) p[i] = psi[i] * psi[i];
  return p;
}

// Right tenth is the module's cut: sites j >= floor(0.9 N), 0-based.
// Left tenth uses the same count of sites at the other end.
function tenthWeights(rows, N, H) {
  const cut = Math.max(2, Math.floor(N * 0.9));
  const leftN = N - cut;
  let right = 0;
  let left = 0;
  for (let n = 0; n < H; n++) {
    let r = 0;
    let l = 0;
    for (let j = 0; j < N; j++) {
      const a = rows[n * N + j];
      if (j >= cut) r += a;
      if (j < leftN) l += a;
    }
    right += r;
    left += l;
  }
  return { right: right / H, left: left / H, cut, leftN };
}

// A mode piles on the right when the mean right-tenth probability exceeds 0.45
// and exceeds the left tenth. g = 0 and g < 0 must fail this predicate.
function pilesOnRight(w) {
  return w.right > 0.45 && w.right > w.left;
}

// Probability localization length from sine-conjugate sites.
// sin(pi n j / (N+1)) has the same magnitude at j and j* = N+1-j (1-based),
// so ln(p_{j*}/p_j) / (2 (j* - j)) equals g for a true right eigenvector.
// The distance scale reported here is the probability length 1/(2|g|), not the
// amplitude length 1/|g|.
function probabilityLength(psi, N, n, gSign) {
  const estimates = [];
  for (let j = 1; j <= N; j++) {
    const js = N + 1 - j;
    if (js <= j) break;
    const pj = psi[j - 1] * psi[j - 1];
    const ps = psi[js - 1] * psi[js - 1];
    if (pj < 1e-18 || ps < 1e-18) continue;
    const delta = js - j;
    if (delta < 4) continue;
    const gHat = Math.log(ps / pj) / (2 * delta);
    estimates.push(gHat);
  }
  if (!estimates.length) return null;
  estimates.sort((a, b) => a - b);
  const gHat = estimates[estimates.length >> 1];
  const xi = 1 / (2 * Math.abs(gHat));
  return { n, gHat, xi, target: 1 / (2 * Math.abs(gSign)), pairs: estimates.length };
}

// Mean distance of the probability from the rightmost site, in sites.
// delta = N - j with j 1-based, so the rightmost site contributes 0.
function meanRightDistance(psi) {
  const N = psi.length;
  let mean = 0;
  for (let i = 0; i < N; i++) {
    const j = i + 1;
    mean += (N - j) * psi[i] * psi[i];
  }
  return mean;
}

function packProb(evecs) {
  const N = evecs[0].length;
  const H = evecs.length;
  const out = new Float64Array(N * H);
  for (let n = 0; n < H; n++) {
    const p = probability(evecs[n]);
    for (let j = 0; j < N; j++) out[n * N + j] = p[j];
  }
  return out;
}

function compareAmp(amp, probs, N, H) {
  let m = 0;
  for (let i = 0; i < N * H; i++) m = Math.max(m, Math.abs(amp[i] - probs[i]));
  return m;
}

const skin = load('skin', { capture: 'amp,skinW,ipr,W,H' });
const flipped = load('skin', {
  capture: 'amp,skinW,ipr,W,H',
  mutate: s => replaceOnce(s, 'Math.exp(gg * j)', 'Math.exp(-gg * j)'),
});

const spectrumCases = [];
let maxEvalError = 0;
let maxEvecError = 0;
let maxResidual = 0;
for (const N of [12, 24, 32, 48]) {
  for (const g of [0, 0.02, 0.05, 0.08, 0.12, 0.15]) {
    const ed = edOpen(N, g);
    let evalError = 0;
    let evecError = 0;
    for (let m = 0; m < N; m++) {
      const n = m + 1;
      const eRef = analyticEigenvalue(N, n);
      evalError = Math.max(evalError, Math.abs(ed.evals[m] - eRef));
      const closed = analyticRight(N, n, g);
      alignSign(ed.evecs[m], closed);
      evecError = Math.max(evecError, maxAbs(ed.evecs[m], closed));
    }
    assert(evalError < 1e-8, 'eigenvalue error ' + evalError + ' at N=' + N + ' g=' + g);
    assert(evecError < 1e-6, 'eigenvector error ' + evecError + ' at N=' + N + ' g=' + g);
    assert(ed.maxResidual < 1e-8, 'residual ' + ed.maxResidual + ' at N=' + N + ' g=' + g);
    maxEvalError = Math.max(maxEvalError, evalError);
    maxEvecError = Math.max(maxEvecError, evecError);
    maxResidual = Math.max(maxResidual, ed.maxResidual);
    spectrumCases.push({
      N, g, sweeps: ed.sweeps,
      evalError, evecError, residual: ed.maxResidual,
    });
  }
}

const lengths = [];
for (const N of [48, 64]) {
  for (const g of [0.03, 0.08, 0.12]) {
    const ed = edOpen(N, g);
    const rows = [];
    for (const n of [1, 2, 3, Math.round(N / 8)]) {
      const psi = ed.evecs[n - 1];
      const closed = analyticRight(N, n, g);
      alignSign(psi, closed);
      const fit = probabilityLength(psi, N, n, g);
      assert(fit, 'no localization pairs at N=' + N + ' g=' + g + ' n=' + n);
      const rel = Math.abs(fit.xi - fit.target) / fit.target;
      assert(rel < 0.01, 'probability length rel ' + rel + ' at ' + JSON.stringify({ N, g, n, fit }));
      assert(fit.gHat > 0, 'positive g must pile toward increasing j');
      rows.push({
        n,
        gHat: fit.gHat,
        xiProbability: fit.xi,
        target: fit.target,
        relativeError: rel,
        meanRightDistance: meanRightDistance(psi),
        pairs: fit.pairs,
      });
    }
    // Wrong-sign envelope of the same sine must not match 1/(2g) with a positive slope.
    const bogus = analyticRight(N, 1, -g);
    const badFit = probabilityLength(bogus, N, 1, g);
    assert(badFit && !(badFit.gHat > 0 && Math.abs(badFit.xi - badFit.target) / badFit.target < 0.01),
      'sign-flipped envelope must fail the probability-length predicate');
    lengths.push({ N, g, target: 1 / (2 * g), modes: rows, wrongSignRejected: true });
  }
}

// Tab versus ED. Aspect 1:1 draws one row per eigenmode, all of them physical.
// The harness stays on disorder 0 and open ends; makeRng is never called.
const moduleCases = [];
let maxAmpError = 0;
for (const grid of [48, 64, 96]) {
  for (const g of [0, 0.02, 0.08, 0.12, 0.15]) {
    const tab = skin.compute({ grid, aspect: '1:1', g, disorder: 0, bc: 'open' });
    assert.equal(tab.W, grid);
    assert.equal(tab.H, grid);
    const ed = edOpen(grid, g);
    for (let m = 0; m < grid; m++) alignSign(ed.evecs[m], analyticRight(grid, m + 1, g));
    const probs = packProb(ed.evecs);
    const ampError = compareAmp(tab.amp, probs, grid, grid);
    assert(ampError < 1e-6, 'tab versus ED amp error ' + ampError + ' at grid=' + grid + ' g=' + g);
    maxAmpError = Math.max(maxAmpError, ampError);
    const w = tenthWeights(tab.amp, grid, grid);
    moduleCases.push({
      grid, g, ampError, skinW: tab.skinW, ipr: tab.ipr,
      rightTenth: w.right, leftTenth: w.left, pilesOnRight: pilesOnRight(w),
    });
  }
}

// Failure controls on the real module. The predicate is pilesOnRight.
const plus = skin.compute({ grid: 96, aspect: '1:1', g: 0.08, disorder: 0, bc: 'open' });
const minus = skin.compute({ grid: 96, aspect: '1:1', g: -0.08, disorder: 0, bc: 'open' });
const zero = skin.compute({ grid: 96, aspect: '1:1', g: 0, disorder: 0, bc: 'open' });
const wPlus = tenthWeights(plus.amp, plus.W, plus.H);
const wMinus = tenthWeights(minus.amp, minus.W, minus.H);
const wZero = tenthWeights(zero.amp, zero.W, zero.H);
assert(pilesOnRight(wPlus), 'g = +0.08 must pile on the right: ' + JSON.stringify(wPlus));
assert(!pilesOnRight(wMinus), 'g -> -g must fail the right-pile predicate: ' + JSON.stringify(wMinus));
assert(!pilesOnRight(wZero), 'g = 0 must fail the right-pile predicate: ' + JSON.stringify(wZero));
assert(wMinus.right < wPlus.right && wMinus.left > wPlus.left, 'sign flip must move weight to the left tenth');
assert(wZero.right < 0.15 && wZero.right > 0.08, 'Hermitian right-tenth weight must sit near 0.1, not above 0.45');
assert(!(wZero.right > 0.45));

// Mutated exactModes with exp(-g j) at g > 0 must miss the ED right eigenvectors.
const wrong = flipped.compute({ grid: 64, aspect: '1:1', g: 0.08, disorder: 0, bc: 'open' });
const ed64 = edOpen(64, 0.08);
for (let m = 0; m < 64; m++) alignSign(ed64.evecs[m], analyticRight(64, m + 1, 0.08));
const wrongError = compareAmp(wrong.amp, packProb(ed64.evecs), 64, 64);
const matchED = err => err < 1e-6;
assert(matchED(moduleCases.find(c => c.grid === 64 && c.g === 0.08).ampError));
assert(!matchED(wrongError), 'exp(-g j) mutation must fail the ED comparison');
assert(wrongError > 0.05, 'mutation error should be gross, got ' + wrongError);

const example = lengths.find(r => r.N === 64 && r.g === 0.08);
const result = {
  pass: true,
  source: 'src/modules/skin.js',
  sourceSha256: skin.sourceSha256,
  harness: 'tools/science-harness.js',
  command: 'node tools/skin-science.js --write',
  solver: 'Implicit-shift QL (Wilkinson) on the unit off-diagonal Hermitian chain similar to open Hatano-Nelson, then psi = exp(g j) phi. Residuals are measured by applying the nonsymmetric open chain, not the sine formula.',
  definition: {
    matrix: '(H v)_i = exp(g) v_{i-1} + exp(-g) v_{i+1}, zero diagonal, open ends. Site label j = i+1.',
    spectrum: 'E_n = 2 cos(pi n / (N+1)), n = 1..N, independent of g.',
    rightEigenvector: 'psi_j proportional to exp(g j) sin(pi n j / (N+1)), j = 1..N.',
    probabilityLength: '1/(2|g|) from the median log ratio of |psi|^2 on sine-conjugate sites j and N+1-j. This is the probability scale, not the amplitude scale 1/|g|.',
    meanRightDistance: 'sum_j (N-j) |psi_j|^2 with j starting at 1. Reported, not used as the 1/(2|g|) test, because the sine boundary node shifts it by about half a site.',
    rightTenth: 'Mean over modes of the probability on sites j >= floor(0.9 N). Left tenth uses the same site count at j = 0.',
    pilesOnRight: 'right tenth > 0.45 and right tenth > left tenth.',
  },
  tolerances: {
    eigenvalueMaxAbs: 1e-8,
    eigenvectorMaxAbs: 1e-6,
    residualMaxAbs: 1e-8,
    ampMaxAbs: 1e-6,
    probabilityLengthRelative: 0.01,
  },
  maxEvalError,
  maxEvecError,
  maxResidual,
  maxAmpError,
  spectrumCases,
  lengths,
  moduleCases,
  pileUp: {
    g: 0.08,
    N: 96,
    plus: wPlus,
    minus: wMinus,
    zero: wZero,
    plusPilesOnRight: pilesOnRight(wPlus),
    minusPilesOnRight: pilesOnRight(wMinus),
    zeroPilesOnRight: pilesOnRight(wZero),
    exampleN64g008: example,
  },
  failureControls: {
    negativeGFailsRightPile: !pilesOnRight(wMinus),
    zeroGFailsRightPile: !pilesOnRight(wZero),
    positiveGPassesRightPile: pilesOnRight(wPlus),
    flippedEnvelopeAmpError: wrongError,
    flippedEnvelopeMatchesED: matchED(wrongError),
    wrongSignLengthRejected: true,
  },
  limitations: [
    'Clean open chain with disorder exactly 0 only. The current nonzero-disorder open-chain QL and periodic Francis QR/inverse-iteration paths are outside this comparison; the legacy pre-v8 Gram-Schmidt path is also excluded.',
    'Finite N. Eigenvalue and eigenvector tolerances above are for N <= 48; the tab comparison also covers grids 64 and 96 at the listed g.',
    'No laboratory measurement. The similarity that skins the chain is not unitary, so the right eigenvectors are not an orthonormal energy basis.',
    'The current rows modes path caps the drawn rows at N. Legacy rows sheet recipes can draw the sine formula past n = N; those extra rows are not eigenvectors and are outside this comparison (aspect 1:1 keeps one row per mode).',
  ],
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/skin-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({
  pass: true,
  sourceSha256: skin.sourceSha256,
  maxEvalError,
  maxEvecError,
  maxResidual,
  maxAmpError,
  pileUp: result.pileUp,
  failureControls: result.failureControls,
  lengths: lengths.map(r => ({
    N: r.N, g: r.g, target: r.target,
    modes: r.modes.map(m => ({ n: m.n, xi: m.xiProbability, rel: m.relativeError, meanRight: m.meanRightDistance, gHat: m.gHat })),
  })),
}, null, 2));
