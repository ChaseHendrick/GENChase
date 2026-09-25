// node tools/kitaev-science.js [--write] [--skip-browser]
//
// Exact benchmark of the kitaev tab against its own code. The module's Bogoliubov-de Gennes builder,
// diagonalizer (Householder and implicit QL), pairing rule and status measurements are extracted from
// src/modules/kitaev.js with a hook (as tools/ust-review.js does) and compared with closed forms and an
// independent Jacobi solver (tools/lib/ssh-reference.js) run on a BdG matrix built here in another basis:
//
//   1. periodic and antiperiodic rings: every eigenvalue equals ±sqrt((2t cos k + μ)² + 4Δ² sin² k) on
//      k = 2πm/N and k = 2π(m+½)/N respectively;
//   2. open chains: states inside the exact bulk gap exist if and only if the winding number of
//      (−μ − 2t cos k, 2Δ sin k) is 1 (|μ| < 2|t|, Δ ≠ 0), over a lattice of the tab's parameters;
//   3. the splitting decays as max|x±|^N, times |sin((N+1)θ)| when the roots are complex, where x± are
//      the closed-form roots of (t+Δ)x² + μx + (t−Δ) = 0; at Δ = t it equals the exact SSH edge root;
//   4. the zero pair matches the closed-form Majorana profile and |u| = |v| on every site;
//   5. failure controls (Δ dropped, wrong ring boundary sign, open chain given a closing bond, broken
//      eigenvector update) are injected into copies of the module source and must fail;
//   6. the real studio paints exactly the field the extracted code computes, prints it pixel for pixel,
//      and keeps its state through export.
//
// Everything is deterministic: no random numbers are drawn, so there are no seeds and no sampling error.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { jacobiEigen } = require('./lib/ssh-reference');

const root = path.resolve(__dirname, '..');
const MODULE = 'src/modules/kitaev.js';
const source = fs.readFileSync(path.join(root, MODULE), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const EPS = 2.220446049250313e-16;
const started = Date.now();

/* ---------- the module's own code, extracted ---------- */
const HOOK = '  Object.assign(hooks, { tred2, tql2, solveChain, bdgMatrix, pairModes, siteDensity, analyse, fill, endWeight, majorana });\n  Studio.register({';
function load(src) {
  const hooked = src.replace('  Studio.register({', HOOK);
  assert.notEqual(hooked, src, 'hook point not found');
  const hooks = {};
  new Function('Studio', 'hooks', 'performance', hooked)({ util: {}, PALETTES: {}, register() {} }, hooks, { now: () => 0 });
  return hooks;
}
function inject(from, to) {
  assert.equal(source.split(from).length - 1, 1, 'injection target must occur exactly once: ' + from);
  return load(source.replace(from, to));
}
const drain = it => { let r; do r = it.next(); while (!r.done); return r.value; };
const mod = load(source);

/* ---------- independent references ---------- */
const bandE = (k, mu, t, D) => Math.sqrt((2 * t * Math.cos(k) + mu) ** 2 + 4 * D * D * Math.sin(k) ** 2);
function band(N, mu, t, D, shift) {
  const out = [];
  for (let m = 0; m < N; m++) { const e = bandE(2 * Math.PI * (m + shift) / N, mu, t, D); out.push(e, -e); }
  return out.sort((a, b) => a - b);
}
// Exact bulk gap: E(k)² = 4(t² − Δ²)c² + 4tμc + μ² + 4Δ² with c = cos k in [−1, 1].
function bulkGap(mu, t, D) {
  const A = 4 * (t * t - D * D), B = 4 * t * mu, C = mu * mu + 4 * D * D;
  let m = Math.min((2 * t + mu) ** 2, (2 * t - mu) ** 2);
  if (A > 0) { const c = -B / (2 * A); if (Math.abs(c) <= 1) m = Math.min(m, C - B * B / (4 * A)); }
  return Math.sqrt(Math.max(0, m));
}
// Winding of (−μ − 2t cos k, 2Δ sin k) around the origin.
function winding(mu, t, D, K = 4096) {
  const ang = k => Math.atan2(2 * D * Math.sin(k), -mu - 2 * t * Math.cos(k));
  let tot = 0, prev = ang(0);
  for (let i = 1; i <= K; i++) {
    const a = ang(2 * Math.PI * i / K);
    let d = a - prev; while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI;
    tot += d; prev = a;
  }
  return Math.abs(Math.round(tot / (2 * Math.PI)));
}
// Closed-form roots of (t+Δ)x² + μx + (t−Δ) = 0, written here independently of the module.
function roots(mu, t, D) {
  const a = t + D, disc = mu * mu - 4 * a * (t - D);
  if (disc >= 0) { const s = Math.sqrt(disc), x1 = (-mu + s) / (2 * a), x2 = (-mu - s) / (2 * a); return { complex: false, x1, x2, xmax: Math.max(Math.abs(x1), Math.abs(x2)), theta: 0 }; }
  const re = -mu / (2 * a), im = Math.sqrt(-disc) / (2 * a);
  return { complex: true, xmax: Math.hypot(re, im), theta: Math.atan2(im, re), re, im };
}
function phiProfile(N, mu, t, D) {
  const r = roots(mu, t, D), phi = new Float64Array(N);
  for (let j = 0; j < N; j++) {
    if (r.complex) phi[j] = Math.pow(r.xmax, j + 1) * Math.sin((j + 1) * r.theta);
    else phi[j] = Math.abs(r.x1 - r.x2) > 1e-12 ? (Math.pow(r.x1, j + 1) - Math.pow(r.x2, j + 1)) / (r.x1 - r.x2) : (j + 1) * Math.pow(r.x1, j);
  }
  let nr = 0; for (const p of phi) nr += p * p;
  return phi.map(p => p / Math.sqrt(nr));
}
// SSH edge root (for the Δ = t identity): E = e^(−Nκ)(w − v e^(−κ)), v sinh((N+1)κ) = w sinh(Nκ).
// At the threshold w = v(1 + 1/N) the root merges with κ = 0 and bisection on g is ill-conditioned
// (μ = 1.9, t = 1, N = 19 sits exactly on it), so chains within 1e-9 of the threshold are skipped.
function sshRoot(N, v, w) {
  if (!(w > v * (1 + 1 / N) * (1 + 1e-9))) return null;
  const g = k => v * Math.exp(k) - w + Math.exp(-2 * N * k) * (w - v * Math.exp(-k));
  let lo = 0, hi = Math.log(w / v);
  for (let i = 0; i < 300; i++) { const m = 0.5 * (lo + hi); if (m <= lo || m >= hi) break; if (g(m) > 0) hi = m; else lo = m; }
  const k = 0.5 * (lo + hi);
  return Math.exp(-N * k) * (w - v * Math.exp(-k));
}
// BdG matrix built independently in the interleaved basis (c_0, c†_0, c_1, c†_1, ...), as rows for Jacobi.
function interleaved(N, mu, t, D, bc) {
  const n = 2 * N, H = Array.from({ length: n }, () => new Float64Array(n));
  const add = (i, j, x) => { H[i][j] += x; if (i !== j) H[j][i] += x; };
  for (let j = 0; j < N; j++) { H[2 * j][2 * j] = -mu; H[2 * j + 1][2 * j + 1] = mu; }
  const bond = (j, k, sg) => {
    add(2 * j, 2 * k, -t * sg); add(2 * j + 1, 2 * k + 1, t * sg);        // hopping, particle and hole
    add(2 * j, 2 * k + 1, -D * sg); add(2 * k, 2 * j + 1, D * sg);         // pairing Δ(c_j c_k + h.c.), antisymmetric
  };
  for (let j = 0; j + 1 < N; j++) bond(j, j + 1, 1);
  if (bc === 'periodic') bond(N - 1, 0, 1);
  if (bc === 'antiperiodic') bond(N - 1, 0, -1);
  return H;
}
function quality(A, res, n) {
  let residual = 0, orth = 0;
  const Z = res.vectors;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      let s = 0; for (let k = 0; k < n; k++) s += A[i * n + k] * Z[j * n + k];
      residual = Math.max(residual, Math.abs(s - res.values[j] * Z[j * n + i]));
    }
    for (let q = j; q < n; q++) {
      let s = 0; for (let k = 0; k < n; k++) s += Z[j * n + k] * Z[q * n + k];
      orth = Math.max(orth, Math.abs(s - (q === j ? 1 : 0)));
    }
  }
  return { residual, orth };
}
// The plate's pairing and row rule, re-implemented here and applied to Jacobi eigenvectors (converted
// from the interleaved basis to the module's block basis first, so canonical bases agree).
function referenceField(vals, vecsInterleaved, N, W, H) {
  const n = 2 * N;
  const Z = vecsInterleaved.map(v => { const b = new Float64Array(n); for (let x = 0; x < N; x++) { b[x] = v[2 * x]; b[N + x] = v[2 * x + 1]; } return b; });
  const dens = z => { const o = new Float64Array(N); for (let x = 0; x < N; x++) o[x] = z[x] * z[x] + z[N + x] * z[N + x]; return o; };
  const Emax = Math.abs(vals[n - 1]), tol = 1e-9 * Emax, pairs = [];
  for (let i = 0; i < n;) {
    let j = i + 1; while (j < n && vals[j] - vals[j - 1] <= tol) j++;
    if (vals[i] <= tol && vals[j - 1] >= -tol) {
      const d = new Float64Array(N);
      let e = 0;
      for (let a = i; a < j; a++) { const da = dens(Z[a]); for (let x = 0; x < N; x++) d[x] += da[x] / (j - i); e += Math.abs(vals[a]) / (j - i); }
      pairs.push({ E: e, d });
    } else if (vals[i] > tol && j - i > 1) {
      const basis = [];
      for (let s = 0; s < n && basis.length < j - i; s++) {
        const q = new Float64Array(n);
        for (let a = i; a < j; a++) for (let k = 0; k < n; k++) q[k] += Z[a][s] * Z[a][k];
        for (let pass = 0; pass < 2; pass++) for (const o of basis) { let d = 0; for (let k = 0; k < n; k++) d += o[k] * q[k]; for (let k = 0; k < n; k++) q[k] -= d * o[k]; }
        let nr = 0; for (let k = 0; k < n; k++) nr += q[k] * q[k];
        if (nr > 1e-12) { for (let k = 0; k < n; k++) q[k] /= Math.sqrt(nr); basis.push(q); }
      }
      basis.forEach((q, a) => { Z[i + a] = q; });
      for (let a = i; a < j; a++) pairs.push({ E: vals[a], d: dens(Z[a]) });
    } else if (vals[i] > tol) pairs.push({ E: vals[i], d: dens(Z[i]) });
    i = j;
  }
  const field = new Float64Array(W * H);
  for (let y = 0; y < H; y++) {
    const e = (y + 0.5) / H * Emax;
    let best = 0, bd = Infinity;
    pairs.forEach((p, j) => { const dd = Math.abs(p.E - e); if (dd < bd - tol) { bd = dd; best = j; } });
    field.set(pairs[best].d, y * W);
  }
  return field;
}
const round = (x, d = 4) => Number(x.toPrecision(d));

/* ---------- 1. rings against the exact band ---------- */
const RING_PARAMS = [[0.4, 1, 0.8], [0.3, 1, 0.85], [2.2, 1, 0.6], [0.1, 1, 1.1], [1.85, 1, 0.7], [0.25, 1, 0.9], [0.4, 1, 0.2],
  [-1.3, 0.6, 0.4], [-2.4, 1.6, 1.4], [0, 1, 1], [2, 1, 0.5], [1.2, 0.4, 0.05]];
const RING_GRIDS = [64, 96, 160];
const TOL_E = 1e-12, TOL_VEC = 1e-12;
function ringCheck(m, grids = RING_GRIDS, params = RING_PARAMS, kinds = [['periodic', 0], ['antiperiodic', 0.5]]) {
  const rows = [];
  for (const N of grids) for (const [mu, t, D] of params) for (const [bc, shift] of kinds) {
    const res = drain(m.solveChain(N, mu, t, D, bc)), ref = band(N, mu, t, D, shift), n = 2 * N;
    let err = 0; for (let i = 0; i < n; i++) err = Math.max(err, Math.abs(res.values[i] - ref[i]));
    const q = N <= 96 ? quality(mod.bdgMatrix(N, mu, t, D, bc), res, n) : { residual: 0, orth: 0, skipped: true };
    rows.push({ N, mu, t, delta: D, bc, maxEigenvalueError: err, residual: q.residual, orthonormality: q.orth, pass: err < TOL_E && q.residual < TOL_VEC && q.orth < TOL_VEC });
  }
  return rows;
}
const ring = ringCheck(mod);
assert(ring.every(r => r.pass), 'band: ' + JSON.stringify(ring.filter(r => !r.pass).slice(0, 3)));
console.log('PASS rings: ' + ring.length + ' cases, max eigenvalue error ' + Math.max(...ring.map(r => r.maxEigenvalueError)).toExponential(2) + ', max residual ' + Math.max(...ring.map(r => r.residual)).toExponential(2));

/* ---------- 2. open chains against an independent Jacobi solver ---------- */
const JACOBI_CASES = [[32, 0.4, 1, 0.8, 'open'], [64, 2.2, 1, 0.6, 'open'], [64, 1.85, 1, 0.7, 'open'], [96, 0.4, 1, 0.2, 'open'], [48, -1.3, 0.6, 0.4, 'open'], [48, 0.4, 1, 0.8, 'periodic']];
const jacobi = [];
for (const [N, mu, t, D, bc] of JACOBI_CASES) {
  const n = 2 * N, res = drain(mod.solveChain(N, mu, t, D, bc)), ref = jacobiEigen(interleaved(N, mu, t, D, bc));
  let err = 0; for (let i = 0; i < n; i++) err = Math.max(err, Math.abs(res.values[i] - ref.values[i]));
  const q = quality(mod.bdgMatrix(N, mu, t, D, bc), res, n);
  const info = mod.analyse(res, N, mu, t, D), H = Math.round(N * 1.25), field = new Float32Array(N * H);
  mod.fill(field, N, H, info.pairs, info.Emax);
  const rf = referenceField(ref.values, ref.vectors, N, N, H);
  let ferr = 0; for (let i = 0; i < field.length; i++) ferr = Math.max(ferr, Math.abs(field[i] - rf[i]));
  jacobi.push({ N, mu, t, delta: D, bc, maxEigenvalueDifference: err, residual: q.residual, orthonormality: q.orth, maxFieldDifference: ferr });
  assert(err < 1e-11 && q.residual < TOL_VEC && q.orth < TOL_VEC && ferr < 1e-6, 'jacobi ' + JSON.stringify(jacobi[jacobi.length - 1]));
}
console.log('PASS independent Jacobi: ' + jacobi.length + ' chains, max eigenvalue difference ' + Math.max(...jacobi.map(r => r.maxEigenvalueDifference)).toExponential(2) + ', max plate-field difference ' + Math.max(...jacobi.map(r => r.maxFieldDifference)).toExponential(2));

/* ---------- 3. topological criterion over a parameter lattice ---------- */
// In-gap states are those with |E| below the exact bulk gap. Topological points count only when the
// chain is long enough for the pair to be separated, max|x±|^N ≤ 1e-3; the rest are reported, not tested.
const MU = []; for (let a = -48; a <= 48; a++) MU.push(a / 20);
const TS = [0.4, 1, 1.6], DS = [0.05, 0.2, 0.5, 0.8, 1.1, 1.4];
function criterion(m, N = 64, mus = MU, ts = TS, ds = DS) {
  const out = { tested: 0, topological: 0, trivial: 0, critical: 0, shallow: 0, shallowWithPair: 0, disagreements: [] };
  for (const t of ts) for (const D of ds) for (const mu of mus) {
    if (Math.abs(mu) === 2 * t) { out.critical++; continue; }
    const nu = winding(mu, t, D), r = roots(mu, t, D), res = drain(m.solveChain(N, mu, t, D, 'open'));
    const gap = bulkGap(mu, t, D);
    let inGap = 0; for (const e of res.values) if (Math.abs(e) < gap * (1 - 1e-9)) inGap++;
    if (nu !== (Math.abs(mu) < 2 * t ? 1 : 0)) out.disagreements.push({ mu, t, D, winding: nu, reason: 'winding vs |μ| < 2t' });
    if (nu === 1 && Math.pow(r.xmax, N) > 1e-3) { out.shallow++; if (inGap === 2) out.shallowWithPair++; continue; }
    out.tested++; if (nu) out.topological++; else out.trivial++;
    if (inGap !== 2 * nu) out.disagreements.push({ mu, t, D, winding: nu, inGap });
  }
  return out;
}
const crit = criterion(mod);
assert(crit.disagreements.length === 0, 'criterion ' + JSON.stringify(crit.disagreements.slice(0, 5)));
console.log('PASS topological criterion: ' + crit.tested + ' points (' + crit.topological + ' topological, ' + crit.trivial + ' trivial), 0 disagreements; ' + crit.shallow + ' shallow topological points reported, ' + crit.shallowWithPair + ' of them already with the pair in the gap');

/* ---------- 4. exponential splitting ---------- */
// split(N) ≈ C max|x±|^N for real roots and C |x|^N |sin((N+1)θ)| for complex ones. The ratio R(N) of the
// computed splitting to that form must become constant: its relative spread over the upper half of the
// resolved window is the deterministic error of the rate (points with |sin| < 0.05 are skipped as
// ill-conditioned). At Δ = t the chain is an SSH chain of Majoranas with v = |μ|, w = 2t, so the splitting
// must equal twice the SSH edge root exactly.
const SPLIT_PARAMS = [[1.2, 1, 0.9], [1.8, 1, 0.5], [-1.4, 1, 0.6], [1.5, 1, 0.2], [1.0, 1, 0.3], [0.4, 1, 0.8]];
const splitting = [];
for (const [mu, t, D] of SPLIT_PARAMS) {
  const r = roots(mu, t, D), rows = [];
  for (let N = 4; N <= 240; N++) {
    const res = drain(mod.solveChain(N, mu, t, D, 'open')), split = res.values[N] - res.values[N - 1];
    const floor = 4 * N * EPS * Math.abs(res.values[2 * N - 1]);
    if (split < 1e3 * floor) break;
    const shape = r.complex ? Math.pow(r.xmax, N) * Math.abs(Math.sin((N + 1) * r.theta)) : Math.pow(r.xmax, N);
    rows.push({ N, split, ratio: split / shape, sin: r.complex ? Math.abs(Math.sin((N + 1) * r.theta)) : 1 });
  }
  const good = rows.filter(x => x.sin >= 0.05), upper = good.slice(Math.floor(good.length / 2));
  const mean = upper.reduce((s, x) => s + x.ratio, 0) / upper.length;
  const spread = Math.max(...upper.map(x => Math.abs(x.ratio / mean - 1)));
  // Rate implied by the ratio's drift across the upper window, against ln max|x±|.
  const a = upper[0], b = upper[upper.length - 1], drift = Math.log(b.ratio / a.ratio) / (b.N - a.N);
  splitting.push({ mu, t, delta: D, roots: r.complex ? 'complex' : 'real', xmax: r.xmax, theta: r.theta, xiSites: -1 / Math.log(r.xmax),
    expectedRate: Math.log(r.xmax), measuredRate: Math.log(r.xmax) + drift, rateDeviation: Math.abs(drift),
    NRange: [rows[0].N, rows[rows.length - 1].N], upperWindow: [a.N, b.N], ratioConstant: mean, ratioRelativeSpread: spread,
    samples: rows.filter((x, i) => i % 5 === 0 || i === rows.length - 1).map(x => ({ N: x.N, split: x.split, ratio: x.ratio })) });
  assert(spread < 1e-3 && Math.abs(drift) < 1e-4, 'splitting ' + JSON.stringify(splitting[splitting.length - 1]));
}
const identity = [];
for (const [mu, t] of [[0.4, 0.8], [1, 1], [1.5, 1.2], [-0.6, 0.5], [1.9, 1]]) {
  let worst = 0, count = 0, smallest = Infinity;
  for (let N = 3; N <= 160; N++) {
    const res = drain(mod.solveChain(N, mu, t, t, 'open')), split = res.values[N] - res.values[N - 1];
    const floor = 4 * N * EPS * Math.abs(res.values[2 * N - 1]), exact = sshRoot(N, Math.abs(mu), 2 * t);
    if (exact === null) continue;
    worst = Math.max(worst, Math.abs(split - 2 * exact) / floor); count++;
    if (split >= floor) smallest = Math.min(smallest, split);
  }
  identity.push({ mu, t, delta: t, chains: count, maxErrorOverFloor: worst, smallestResolvedSplit: smallest });
  assert(worst < 1, 'Δ = t identity ' + JSON.stringify(identity[identity.length - 1]));
}
console.log('PASS splitting: ' + splitting.map(s => s.roots + ' μ ' + s.mu + ' Δ ' + s.delta + ' rate ' + round(s.measuredRate, 6) + ' vs ln|x| ' + round(s.expectedRate, 6)).join('; ') + '; Δ = t equals the SSH edge root within the floor on ' + identity.reduce((s, x) => s + x.chains, 0) + ' chains');

/* ---------- 5. Majorana profile ---------- */
function profile(m, cases = [[64, 0.4, 1, 0.8], [96, 0.3, 1, 0.85], [96, 1.2, 1, 0.9], [160, 1.8, 1, 0.5], [128, 1.5, 1, 0.2], [96, -1.1, 0.7, 0.4]]) {
  const rows = [];
  for (const [N, mu, t, D] of cases) {
    const n = 2 * N, res = drain(m.solveChain(N, mu, t, D, 'open')), Z = res.vectors;
    // ψ_L = P e_0 for the projector onto the computed pair, e_0 the particle component on site 0.
    const psi = new Float64Array(n);
    for (const j of [N - 1, N]) for (let k = 0; k < n; k++) psi[k] += Z[j * n] * Z[j * n + k];
    let nr = 0; for (const x of psi) nr += x * x;
    for (let k = 0; k < n; k++) psi[k] /= Math.sqrt(nr);
    const phi = phiProfile(N, mu, t, D), r = roots(mu, t, D), allow = 1e-9 + 4 * Math.pow(r.xmax, N);
    const sgn = Math.sign(psi[0]) * Math.sign(phi[0]);
    let uv = 0, prof = 0;
    for (let j = 0; j < N; j++) {
      uv = Math.max(uv, Math.abs(Math.abs(psi[j]) - Math.abs(psi[N + j])));
      prof = Math.max(prof, Math.abs(sgn * psi[j] * Math.SQRT2 - phi[j]));
    }
    const info = m.analyse(res, N, mu, t, D);
    let pd = 0; for (let j = 0; j < N; j++) pd = Math.max(pd, Math.abs(info.pairs[0].dens[j] - 0.5 * (phi[j] * phi[j] + phi[N - 1 - j] * phi[N - 1 - j])));
    rows.push({ N, mu, t, delta: D, maxUVImbalance: uv, maxProfileError: prof, maxPairDensityError: pd, allowance: allow,
      endWeight: info.endW, closedFormEndWeight: info.zero.endWeight, endWeightDifference: Math.abs(info.endW - info.zero.endWeight), pass: uv < allow && prof < allow && pd < allow });
  }
  return rows;
}
const prof = profile(mod);
assert(prof.every(r => r.pass), 'profile ' + JSON.stringify(prof));
console.log('PASS Majorana profile: max profile error ' + Math.max(...prof.map(r => r.maxProfileError)).toExponential(2) + ', max |u|−|v| ' + Math.max(...prof.map(r => r.maxUVImbalance)).toExponential(2));

/* ---------- 6. failure controls ---------- */
const controls = [];
{
  const bad = inject('    const bond = (j, k, sg) => {\n', '    const bond = (j, k, sg) => { const D = 0;\n');
  const rows = ringCheck(bad, [64], [[0.4, 1, 0.8], [2.2, 1, 0.6], [0.4, 1, 0.2]], [['periodic', 0]]);
  const cr = criterion(bad, 64, MU.filter((_, i) => i % 4 === 0), [1], [0.2, 0.8]);
  controls.push({ name: 'pairing Δ dropped from the BdG matrix', check: 'band structure and topological criterion',
    maxEigenvalueError: Math.max(...rows.map(r => r.maxEigenvalueError)), criterionDisagreements: cr.disagreements.length, criterionPoints: cr.tested,
    failed: rows.every(r => !r.pass) && cr.disagreements.length > 0.3 * cr.tested });
}
{
  const bad = inject("    if (bc === 'periodic') bond(N - 1, 0, 1);", "    if (bc === 'periodic') bond(N - 1, 0, -1);");
  const rows = ringCheck(bad, [64], [[0.4, 1, 0.8], [2.2, 1, 0.6]], [['periodic', 0]]);
  controls.push({ name: 'ring closed with the opposite boundary sign', check: 'periodic band on k = 2πm/N', maxEigenvalueError: Math.max(...rows.map(r => r.maxEigenvalueError)), failed: rows.every(r => !r.pass) });
}
{
  const bad = inject("    else if (bc === 'antiperiodic') bond(N - 1, 0, -1);", "    else bond(N - 1, 0, bc === 'antiperiodic' ? -1 : 1);");
  const cr = criterion(bad, 64, MU.filter((_, i) => i % 4 === 0), [1], [0.2, 0.8]);
  controls.push({ name: 'open chain given a closing bond (boundary hopping not removed)', check: 'topological criterion', criterionDisagreements: cr.disagreements.length, criterionPoints: cr.tested, topologicalPoints: cr.topological,
    failed: cr.disagreements.length >= cr.topological && cr.topological > 0 });
}
{
  const bad = inject('Z[b + k] = s * Z[a + k] + c * h; Z[a + k] = c * Z[a + k] - s * h;', 'Z[b + k] = s * Z[a + k] + c * h;');
  const rows = ringCheck(bad, [32], [[0.4, 1, 0.8]], [['periodic', 0]]);
  const pr = profile(bad, [[64, 0.4, 1, 0.8]]);
  controls.push({ name: 'QL rotation not applied to one eigenvector row', check: 'eigenvector residual and Majorana profile', residual: rows[0].residual, orthonormality: rows[0].orthonormality, profilePass: pr[0].pass, failed: !rows[0].pass && !pr[0].pass });
}
assert(controls.every(c => c.failed), 'failure controls must fail: ' + JSON.stringify(controls));
console.log('PASS failure controls: ' + controls.map(c => c.name).join('; '));

/* ---------- 7. the real studio: plate, status, print ---------- */
const FIXTURES = [
  { name: 'default', p: {} },
  { name: 'majorana-1x1-128', p: { mu: 0.3, tHop: 1, delta: 0.85, grid: 128, aspect: '1:1' } },
  { name: 'trivial-5x4-112', p: { mu: 2.2, tHop: 1, delta: 0.6, grid: 112, aspect: '5:4' } },
  { name: 'deep-1x1-96', p: { mu: 0.1, delta: 1.1, grid: 96, aspect: '1:1' } },
  { name: 'near-critical-4x5-144', p: { mu: 1.85, tHop: 1, delta: 0.7, grid: 144, aspect: '4:5' } },
  { name: 'log-view', p: { view: 'log', mu: 0.25, delta: 0.9, exposure: 1.4 } },
  { name: 'weak-16x9-160', p: { delta: 0.2, mu: 0.4, grid: 160, aspect: '16:9' } },
];
const PRINT_DIMS = { '1:1': [2400, 2400], '4:5': [1920, 2400], '5:4': [2400, 1920], '16:9': [2400, 1350] };
async function browserPart() {
  const { chromium } = require('playwright');
  const auditRead = "        auditRead(){return {busy, W, H, field: field && Array.from(field), info: info && { endW: info.endW, split: info.split, floor: info.floor, E1: info.E1, Emax: info.Emax, zero: info.zero } };},\n        aspect(s)";
  const injected = source.replace('        aspect(s)', auditRead);
  assert.notEqual(injected, source);
  const html = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8');
  assert(html.includes(source), 'dist/studio.html is stale: run node tools/build.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kitaev-science-')), file = path.join(dir, 'studio.html');
  fs.writeFileSync(file, html.replace(source, injected).replace('generatePalette, register, boot,', 'generatePalette, register, auditInstances:()=>instances, boot,'));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const cases = [];
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + file + '#kitaev/science');
    await page.evaluate(() => Studio.ready);
    for (const f of FIXTURES) {
      const seed = 'kitaev-science-' + f.name, t0 = Date.now();
      await page.evaluate(({ seed, p }) => { location.hash = 'kitaev/' + seed + '/' + btoa(JSON.stringify({ ...p, v: 3 })); }, { seed, p: f.p });
      await page.waitForFunction(seed => {
        const e = Studio.auditInstances().kitaev, a = e && e.inst && e.inst.auditRead && e.inst.auditRead();
        return Studio.getRecipe()?.seed === seed && a && !a.busy && a.field && a.W === e.state.grid;
      }, seed, { timeout: 60000 });
      const ms = Date.now() - t0;
      const a = await page.evaluate(() => Studio.auditInstances().kitaev.inst.auditRead());
      const s = await page.evaluate(() => JSON.parse(JSON.stringify(Studio.auditInstances().kitaev.state)));
      const status = await page.evaluate(() => document.querySelector('#status').innerText.replace(/\s+/g, ' '));
      const N = a.W, res = drain(mod.solveChain(N, s.mu, s.tHop, s.delta, 'open'));
      const info = mod.analyse(res, N, s.mu, s.tHop, s.delta), field = new Float32Array(a.W * a.H);
      mod.fill(field, a.W, a.H, info.pairs, info.Emax);
      let same = 0; for (let i = 0; i < field.length; i++) same = Math.max(same, Math.abs(field[i] - a.field[i]));
      assert.equal(same, 0, 'browser field differs from the extracted code');
      assert.equal(a.info.endW, info.endW); assert.equal(a.info.split, info.split);
      const ref = jacobiEigen(interleaved(N, s.mu, s.tHop, s.delta, 'open'));
      const rf = referenceField(ref.values, ref.vectors, N, a.W, a.H);
      let refErr = 0; for (let i = 0; i < field.length; i++) refErr = Math.max(refErr, Math.abs(rf[i] - a.field[i]));
      assert(refErr < 1e-6, 'field vs Jacobi ' + refErr);
      const shown = x => (x !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e6)) ? x.toExponential(2) : String(Number(x.toPrecision(3)));
      assert(status.includes('end weight ' + shown(info.endW)) && status.includes('2|E₀| ' + shown(info.split)), 'status ' + status);
      const [pw, ph] = PRINT_DIMS[s.aspect];
      const before = await page.evaluate(() => JSON.stringify({ r: Studio.getRecipe(), a: Studio.auditInstances().kitaev.inst.auditRead() }));
      const print = await page.evaluate(PRINT, { id: 'kitaev', w: pw, h: ph });
      const after = await page.evaluate(() => JSON.stringify({ r: Studio.getRecipe(), a: Studio.auditInstances().kitaev.inst.auditRead() }));
      assert.equal(before, after, 'export changed the state');
      assert(print.unmatched === 0 && print.maxChannelError <= 1 && print.displacedMismatch > 0.01, 'print ' + JSON.stringify(print));
      cases.push({ fixture: f.name, seed, parameters: { grid: s.grid, aspect: s.aspect, mu: s.mu, tHop: s.tHop, delta: s.delta, view: s.view, exposure: s.exposure },
        field: [a.W, a.H], computeMs: ms, identicalToExtractedCode: true, maxFieldDifferenceVsJacobi: refErr,
        endWeight: info.endW, closedFormEndWeight: info.zero.endWeight, split: info.split, floor: info.floor, xiSites: info.zero.xi,
        status, print, statePreserved: true });
      console.log('PASS studio ' + f.name + ' (' + ms + ' ms): ' + status);
    }
    assert.deepEqual(errors, []);
    return { cases, chromium: browser.version() };
  } finally {
    await browser.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
// Runs in the page; see tools/ssh-science.js for the rule.
const PRINT = async ({ id, w, h }) => {
  const e = Studio.auditInstances()[id], s = e.state, a = e.inst.auditRead();
  const blob = await e.inst.exportPNG(w, h), bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); bmp.close();
  const px = g.getImageData(0, 0, w, h).data;
  const ramp = Studio.util.makeRamp(s.palette, s.bg), W = a.W, H = a.H, f = a.field;
  const rowHi = new Array(H).fill(0); f.forEach((v, i) => { const y = Math.floor(i / W); if (v > rowHi[y]) rowHi[y] = v; });
  const exp = s.exposure;
  const col = f.map((v, i) => { let t = v / (rowHi[Math.floor(i / W)] || 1); if (s.view === 'log') t = Math.log(1.001 + 9 * Math.max(0, t)) / Math.log(10); return ramp(Math.min(1, Math.max(0, t * exp))); });
  let maxErr = 0, boundary = 0, unmatched = 0, displaced = 0;
  const diff = (o, cc) => Math.max(Math.abs(px[o] - cc[0]), Math.abs(px[o + 1] - cc[1]), Math.abs(px[o + 2] - cc[2]));
  for (let Y = 0; Y < h; Y++) {
    const cy = Math.min(H - 1, Math.floor((Y + 0.5) * H / h));
    for (let X = 0; X < w; X++) {
      const cx = Math.min(W - 1, Math.floor((X + 0.5) * W / w)), o = (Y * w + X) * 4;
      const d = diff(o, col[cy * W + cx]);
      if (d <= 1) maxErr = Math.max(maxErr, d);
      else {
        let ok = false;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) { const x2 = cx + dx, y2 = cy + dy; if (x2 >= 0 && x2 < W && y2 >= 0 && y2 < H && diff(o, col[y2 * W + x2]) <= 1) ok = true; }
        if (ok) boundary++; else unmatched++;
      }
      if (diff(o, col[((cy + 1) % H) * W + cx]) > 1 || diff(o, col[cy * W + (cx + 1) % W]) > 1) displaced++;
    }
  }
  return { width: w, height: h, pixels: w * h, maxChannelError: maxErr, boundaryPixels: boundary, unmatched, displacedMismatch: displaced / (w * h) };
};

(async () => {
  const studio = process.argv.includes('--skip-browser') ? null : await browserPart();
  const result = {
    schemaVersion: 1,
    date: new Date().toISOString().slice(0, 10),
    passed: true,
    source: MODULE, sourceSha256: sha(source), engineSha256: sha(engine),
    harness: 'tools/kitaev-science.js', command: 'node tools/kitaev-science.js --write',
    precision: 'IEEE 754 binary64 throughout the solver; the plate field is stored as Float32 and painted to RGBA8.',
    scope: 'The kitaev module\'s own BdG matrix, exact diagonalization (Householder and implicit QL), pairing rule and status measurements, extracted from the source, against the exact band on periodic and antiperiodic rings, the winding criterion with the exact bulk gap, the closed-form Majorana roots and profile, the exact SSH identity at Δ = t, an independent Jacobi solver on a separately built matrix, failure controls, and the real studio plate, status and print.',
    criteria: {
      ringEigenvalueAbsError: TOL_E, eigenvectorResidual: TOL_VEC, orthonormality: TOL_VEC, jacobiEigenvalueDifference: 1e-11, jacobiFieldDifference: 1e-6,
      criterion: 'in-gap count (|E| below the exact bulk gap) equals 2 × winding at every tested lattice point; topological points need max|x±|^N ≤ 1e-3',
      splitting: 'computed splitting / (max|x±|^N, times |sin((N+1)θ)| for complex roots) constant to 1e-3 relative over the upper half of the resolved window, drift rate < 1e-4 per site; at Δ = t, |split − 2 E_SSH| below the 4Nε‖H‖ floor',
      majorana: '|u| = |v| and the left mode equals the closed form, and the pair density equals ½(φ_L² + φ_R²), all within 1e-9 + 4 max|x±|^N',
      print: 'every exported pixel within 1 channel level of its nearest-neighbor cell (a neighboring cell on a cell boundary or corner); state unchanged by export; a displacement by one cell must mismatch > 1% of pixels',
    },
    rings: { cases: ring.length, grids: RING_GRIDS, parameters: RING_PARAMS, maxEigenvalueError: Math.max(...ring.map(r => r.maxEigenvalueError)), maxResidual: Math.max(...ring.map(r => r.residual)), maxOrthonormalityError: Math.max(...ring.map(r => r.orthonormality)), note: 'residual and orthonormality computed for N ≤ 96', rows: ring },
    jacobi,
    criterion: { lattice: 'μ −2.40..2.40 step 0.05, t ∈ {0.4, 1, 1.6}, Δ ∈ {0.05, 0.2, 0.5, 0.8, 1.1, 1.4}, N = 64 sites', ...crit, disagreements: crit.disagreements.length },
    splitting, deltaEqualsT: identity, profile: prof, failureControls: controls,
    studio: studio ? { cases: studio.cases } : 'skipped',
    environment: { node: process.version, chromium: studio ? studio.chromium : null, platform: process.platform + ' ' + os.arch(), cpus: os.cpus().length },
    runSeconds: (Date.now() - started) / 1000,
    domain: {
      parameters: 'Rings: N = 64, 96, 160 with twelve (μ, t, Δ) sets, periodic and antiperiodic. Open: μ −2.4..2.4 (step 0.05) × three t × six Δ at N = 64; splitting from N = 4 to the largest N still above 1000 floors (97 at most) for six sets and the Δ = t identity for N = 3..160; seven studio recipes covering the presets, all four sheets and every grid the tab allows (96 to 160 in steps of 16; the schema minimum is 96).',
      conditions: 'Spinless single-band Kitaev chain in the BdG mean-field form of the tab equation, real t, Δ and μ, no disorder or self-consistency. Open ends in the tab; rings only in the band check. No randomness is drawn.',
      resolution: 'Exact diagonalization of the 2N × 2N BdG matrix; eigenvalues to about 1e-14 absolute. Splittings below 4Nε‖H‖ (about 1e-13 to 4e-13) are not resolved and the tab says so.',
      precision: 'Binary64 solver and references; Float32 field; RGBA8 raster print at 300 ppi sizes.',
    },
    limitations: [
      'Finite chains of up to 160 sites in the studio (splitting study up to 97 sites, Δ = t identity up to 160). Thermodynamic-limit statements are the closed forms.',
      'A splitting below about 4Nε‖H‖ is not resolved by double precision; the tab prints it with that note. Only at Δ = t is an exact finite-N splitting available here.',
      'Topological lattice points with max|x±|^N > 1e-3 are too shallow for a length-64 chain to separate the pair; they are counted but not tested.',
      'Mean-field BdG only: no self-consistent Δ, interactions, disorder, spin or experimental nanowire claim.',
    ],
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/kitaev-science.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('PASS kitaev exact benchmark in ' + result.runSeconds.toFixed(1) + ' s');
})().catch(e => { console.error(e); process.exitCode = 1; });
