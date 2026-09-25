'use strict';
// Independent references for tools/rmt-science.js. Nothing here reads src/modules/rmt.js: the
// eigenvalue solvers, the exact moments, the semicircle, the Gaudin-Mehta spacing law and the
// critical values are written from the mathematics, so an error in the module cannot hide here.

const EPS = Number.EPSILON;

/* ---- exact moments of the Dumitriu-Edelman tridiagonal model in the tab's normalization ----
   Diagonal a_i ~ N(0, 2), subdiagonal b_i ~ chi_{k_i} with k_i = beta (n - i), i = 1..n-1.
   Tr H^2 = sum a_i^2 + 2 sum b_i^2, so E = 2n + 2 beta sum_{m=1}^{n-1} m = 2n + beta n (n - 1).
   Tr H^4 of a symmetric tridiagonal, by counting closed walks of length four:
     sum a_i^4 + 4 sum (a_i^2 + a_i a_{i+1} + a_{i+1}^2) b_i^2 + 2 sum b_i^4 + 4 sum b_i^2 b_{i+1}^2.
   With E a^2 = 2, E a^4 = 12, E b^2 = k, E b^4 = k (k + 2) and independence this is
     12 n + 10 beta n (n - 1) + beta^2 n (n - 1) (2n - 3).
   At beta = 1 it is 2n^3 + 5n^2 + 5n, the GOE value for off-diagonal variance 1 and diagonal variance 2. */
const exactTrH2 = (n, beta) => 2 * n + beta * n * (n - 1);
const exactTrH4 = (n, beta) => 12 * n + 10 * beta * n * (n - 1) + beta * beta * n * (n - 1) * (2 * n - 3);
// Exact variance of Tr H^2: Var a^2 = 8, Var b^2 = 2k.
const exactVarTrH2 = (n, beta) => 8 * n + 4 * beta * n * (n - 1);

/* ---- eigenvalues of a symmetric tridiagonal by Sturm-sequence bisection ----
   The number of negative pivots of T - x I in its LDL^T factorization equals the number of
   eigenvalues below x. Bisection to adjacent floating-point numbers inside the Gershgorin interval. */
function gershgorin(d, e, n) {
  let r = 0;
  for (let i = 0; i < n; i++) r = Math.max(r, Math.abs(d[i]) + (i > 0 ? Math.abs(e[i - 1]) : 0) + (i < n - 1 ? Math.abs(e[i]) : 0));
  return r;
}
function sturmCount(d, e, n, x) {
  let c = 0, q = 1;
  for (let i = 0; i < n; i++) {
    q = d[i] - x - (i > 0 ? e[i - 1] * e[i - 1] / q : 0);
    if (q === 0) q = -EPS * (Math.abs(x) + 1e-300);
    if (q < 0) c++;
  }
  return c;
}
function sturmEigenvalues(d, e, n) {
  const r = gershgorin(d, e, n), out = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let lo = -r - 1, hi = r + 1;
    for (let it = 0; it < 2000; it++) {
      const mid = 0.5 * (lo + hi);
      if (mid <= lo || mid >= hi) break;
      if (sturmCount(d, e, n, mid) > k) hi = mid; else lo = mid;
    }
    out[k] = 0.5 * (lo + hi);
  }
  return { values: out, norm: r };
}

/* ---- eigenvalues of a full symmetric matrix by cyclic Jacobi rotations ----
   A different algorithm from Householder plus QL: plane rotations until the off-diagonal mass is
   below a relative 1e-30 of the total. Used for the Dyson slices. */
function jacobiEigenvalues(A0, n) {
  const A = Float64Array.from(A0);
  let total = 0;
  for (let i = 0; i < n * n; i++) total += A[i] * A[i];
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) off += A[i * n + j] * A[i * n + j];
    if (off <= 1e-30 * total) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p * n + q];
      if (apq === 0) continue;
      const theta = (A[q * n + q] - A[p * n + p]) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k * n + p], akq = A[k * n + q];
        A[k * n + p] = c * akp - s * akq; A[k * n + q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p * n + k], aqk = A[q * n + k];
        A[p * n + k] = c * apk - s * aqk; A[q * n + k] = s * apk + c * aqk;
      }
    }
  }
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = A[i * n + i];
  return out.sort();
}

/* ---- semicircle on [-1, 1] ---- */
const semicircleCdf = x => x <= -1 ? 0 : x >= 1 ? 1 : 0.5 + (x * Math.sqrt(1 - x * x) + Math.asin(x)) / Math.PI;
// Kolmogorov distance of a sorted sample from a continuous CDF.
function ksSorted(sorted, cdf) {
  const n = sorted.length;
  let D = 0;
  for (let i = 0; i < n; i++) { const F = cdf(sorted[i]); D = Math.max(D, Math.abs(F - i / n), Math.abs(F - (i + 1) / n)); }
  return D;
}

/* ---- critical values ---- */
// Acklam's inverse normal CDF (relative error below 1.2e-9).
function normalQuantile(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) return -normalQuantile(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
// Two-sided Bonferroni z threshold for a family of `tests` comparisons at family-wise level alpha.
const bonferroniZ = (alpha, tests) => normalQuantile(1 - alpha / (2 * tests));
// Kolmogorov critical value for M independent draws: the asymptotic quantile of sqrt(M) D with
// Stephens' finite-sample correction D (sqrt(M) + 0.12 + 0.11 / sqrt(M)).
function kolmogorovCritical(alpha, M) {
  const tail = x => { let s = 0; for (let k = 1; k < 100; k++) s += 2 * (k % 2 ? 1 : -1) * Math.exp(-2 * k * k * x * x); return s; };
  let lo = 0.3, hi = 4;
  for (let i = 0; i < 200; i++) { const m = 0.5 * (lo + hi); if (tail(m) > alpha) lo = m; else hi = m; }
  const x = 0.5 * (lo + hi), r = Math.sqrt(M);
  return x / (r + 0.12 + 0.11 / r);
}

/* ---- the Gaudin-Mehta nearest-neighbor spacing law ----
   E_beta(0; s), the probability that an interval of length s in the unit-density bulk holds no
   level, is a Fredholm determinant of the sine kernel S(x) = sin(pi x) / (pi x):
     beta = 2: det(I - S(x - y)) on L^2(0, s);
     beta = 1: det(I - [S(x - y) + S(x + y)]) on L^2(0, s/2), the even part (Gaudin 1961; Mehta,
     Random Matrices, 3rd ed., ch. 6-7), evaluated by Gauss-Legendre Nystrom discretization
     (Bornemann, Math. Comp. 79, 871, 2010), which converges exponentially in the node count.
   The spacing density is E'' and its CDF is F(s) = 1 + E'(s); the second moment is 2 int E ds. */
function gaussLegendre(m) {
  const x = new Float64Array(m), w = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (m + 0.5)), pp = 1;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 1; j <= m; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; }
      pp = m * (z * p1 - p2) / (z * z - 1);
      const z1 = z; z = z1 - p1 / pp;
      if (Math.abs(z - z1) < 1e-16) break;
    }
    x[i] = z; w[i] = 2 / ((1 - z * z) * pp * pp);
  }
  return { x, w };
}
function determinant(A0, n) {
  const A = Float64Array.from(A0);
  let det = 1;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i * n + k]) > Math.abs(A[p * n + k])) p = i;
    if (A[p * n + k] === 0) return 0;
    if (p !== k) { for (let j = 0; j < n; j++) { const t = A[k * n + j]; A[k * n + j] = A[p * n + j]; A[p * n + j] = t; } det = -det; }
    det *= A[k * n + k];
    for (let i = k + 1; i < n; i++) { const f = A[i * n + k] / A[k * n + k]; for (let j = k; j < n; j++) A[i * n + j] -= f * A[k * n + j]; }
  }
  return det;
}
const sine = x => Math.abs(x) < 1e-8 ? 1 - (Math.PI * x) ** 2 / 6 : Math.sin(Math.PI * x) / (Math.PI * x);
function gapProbability(beta, s, nodes) {
  if (s <= 0) return 1;
  const m = nodes || 30, g = gaussLegendre(m), b = beta === 2 ? s : s / 2;
  const X = Array.from(g.x, v => b / 2 * (v + 1)), W = Array.from(g.w, v => b / 2 * v), A = new Float64Array(m * m);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
    const k = beta === 2 ? sine(X[i] - X[j]) : sine(X[i] - X[j]) + sine(X[i] + X[j]);
    A[i * m + j] = (i === j ? 1 : 0) - Math.sqrt(W[i]) * k * Math.sqrt(W[j]);
  }
  return determinant(A, m);
}
function gaudinMehta(beta, grid, sMax) {
  const h = 1e-4, ds = sMax / grid, cdf = new Float64Array(grid + 1), E = s => gapProbability(beta, s, 30);
  for (let g = 1; g <= grid; g++) { const s = g * ds; cdf[g] = 1 + (E(s + h) - E(s - h)) / (2 * h); }
  // Simpson on [0, 8] for int E ds; E(8) is below 1e-20 at both beta.
  const K = 1600, L = 8;
  let sum = 0;
  for (let i = 0; i <= K; i++) sum += (i === 0 || i === K ? 1 : i % 2 ? 4 : 2) * E(L * i / K);
  const secondMoment = 2 * sum * L / K / 3;
  // Node-count convergence of the determinant itself, reported with the result.
  const nodeCheck = Math.max(...[0.5, 1, 2, 3, 4].map(s => Math.abs(gapProbability(beta, s, 30) - gapProbability(beta, s, 40))));
  return { cdf, ds, variance: secondMoment - 1, cv: Math.sqrt(secondMoment - 1), cdfAtZero: 1 + (E(h) - 1) / h, nodeCheck };
}
// Wigner surmise CDFs, from the 2 x 2 ensembles.
function erf(x) {
  const t = Math.abs(x);
  let r;
  if (t < 3) { let sum = t, term = t, k = 0; while (Math.abs(term) > 1e-17 * Math.abs(sum)) { k++; term *= -t * t / k; sum += term / (2 * k + 1); } r = 2 / Math.sqrt(Math.PI) * sum; }
  else { let f = 0; for (let k = 80; k >= 1; k--) f = k / 2 / (t + f); r = 1 - Math.exp(-t * t) / Math.sqrt(Math.PI) / (t + f); }
  return x < 0 ? -r : r;
}
const surmiseCdf = {
  1: s => 1 - Math.exp(-Math.PI * s * s / 4),
  2: s => erf(2 * s / Math.sqrt(Math.PI)) - (4 * s / Math.PI) * Math.exp(-4 * s * s / Math.PI),
};
const surmiseCv = { 1: Math.sqrt(4 / Math.PI - 1), 2: Math.sqrt(3 * Math.PI / 8 - 1) };

module.exports = {
  exactTrH2, exactTrH4, exactVarTrH2, gershgorin, sturmEigenvalues, jacobiEigenvalues,
  semicircleCdf, ksSorted, normalQuantile, bonferroniZ, kolmogorovCritical,
  gapProbability, gaudinMehta, surmiseCdf, surmiseCv,
};
