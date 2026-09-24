// Volunteer search for self-similar point-vortex collapse with the least winding.
// node tools/vortex-collapse-search.js --alpha 0 --n 4 --start 0 --count 20 [--out file.json]
// node tools/vortex-collapse-search.js --controls
// node tools/vortex-collapse-search.js --verify submission.json ... [--write]
//
// Model: dz_j/dt = (i/2pi) sum_k G_k (z_j - z_k) |z_j - z_k|^(-alpha-2), the alpha-model family
// (alpha = 0 Euler, alpha = 1 surface quasi-geostrophic). A self-similar collapse solves
// dz_j/dt = kappa (z_j - z_c) for every j, and its winding is P = |Im kappa| / (2 |Re kappa|),
// the number of turns per e-fold of shrinking, halved. Every result is a numerical candidate:
// a certified strict local minimum in binary64, not a proof of a global minimum.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process'), assert = require('node:assert/strict');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const root = path.resolve(__dirname, '..');
const PROTOCOL = {
  version: 2, frozenDate: '2026-09-24',
  gauge: 'z_1 = 0, z_2 = 1, G_1 = 1; unknowns z_3..z_N, G_2..G_N, kappa. Residual v_j - v_1 - kappa (z_j - z_1), j = 2..N.',
  landingAttempts: 24, newtonIterations: 250,
  limits: { feasibility: 1e-11, reducedGradient: 1e-8, soscRelative: 1e-7, licq: 1e-7, minSeparation: 1e-6, circulationSpread: 1e8,
    odeShrink: 0.5, odeAmplification: 1e4, odeShape: 1e-6, odeWinding: 1e-6, invariant: 1e-8, center: 1e-8, trivialModes: 1e-7 },
};
// Values this repository's Python searches found; numerical, priority unconfirmed. The N = 3 entry is
// the sharp infimum sqrt(3 + alpha)/(2 + alpha), which no configuration attains.
const REFERENCE = {
  '0': { 3: Math.sqrt(3) / 2, 4: 0.7978967838, 5: 0.7448144570, 6: 0.7136801485 },
  '1': { 3: 2 / 3, 4: 0.5499151189007423, 5: 0.4667708118 },
  '2': { 3: Math.sqrt(5) / 4, 4: 0.4116738600453438, 5: 0.3046288623 },
};
const infimum3 = alpha => Math.sqrt(3 + alpha) / (2 + alpha);

// ---------- small dense linear algebra ----------
const zeros = (r, c) => Array.from({ length: r }, () => new Float64Array(c));
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const norm = a => Math.sqrt(dot(a, a));
function solve(A, b) {
  const n = b.length, M = A.map(r => Float64Array.from(r)), x = Float64Array.from(b);
  for (let k = 0; k < n; k++) {
    let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (!(Math.abs(M[p][k]) > 1e-300)) throw Error('singular');
    [M[k], M[p]] = [M[p], M[k]]; [x[k], x[p]] = [x[p], x[k]];
    for (let i = k + 1; i < n; i++) { const f = M[i][k] / M[k][k]; if (!f) continue; for (let j = k; j < n; j++) M[i][j] -= f * M[k][j]; x[i] -= f * x[k]; }
  }
  for (let k = n - 1; k >= 0; k--) { let s = x[k]; for (let j = k + 1; j < n; j++) s -= M[k][j] * x[j]; x[k] = s / M[k][k]; }
  return x;
}
// J J^T + mu I, filling only one triangle's worth of dot products.
const gram = (J, mu = 0) => { const m = J.length, G = zeros(m, m); for (let i = 0; i < m; i++) for (let j = 0; j <= i; j++) { const v = dot(J[i], J[j]) + (i === j ? mu : 0); G[i][j] = v; G[j][i] = v; } return G; };
// Cholesky factor of a symmetric positive definite matrix, reusable across right-hand sides; null if not positive definite.
function cholesky(A) {
  const n = A.length, L = zeros(n, n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j]; const Li = L[i], Lj = L[j]; for (let k = 0; k < j; k++) s -= Li[k] * Lj[k];
    if (i === j) { if (!(s > 0)) return null; Li[i] = Math.sqrt(s); } else Li[j] = s / Lj[j];
  }
  return b => { const y = new Float64Array(n), x = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = b[i]; const Li = L[i]; for (let k = 0; k < i; k++) s -= Li[k] * y[k]; y[i] = s / Li[i]; }
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
    return x; };
}
const spdSolve = (A, b) => { const f = cholesky(A); return f ? f(b) : solve(A, b); };
const mulT = (J, y) => { const out = new Float64Array(J[0].length); J.forEach((row, i) => { for (let k = 0; k < row.length; k++) out[k] += row[k] * y[i]; }); return out; };
const mul = (J, x) => Float64Array.from(J, row => dot(row, x));
function jacobiEigen(S) { // symmetric eigenvalues and vectors (columns of V)
  const n = S.length, A = S.map(r => Float64Array.from(r)), V = zeros(n, n); for (let i = 0; i < n; i++) V[i][i] = 1;
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (off < 1e-30 * (1 + A.reduce((s, r, i) => s + r[i] ** 2, 0))) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  return { values: A.map((r, i) => r[i]), vectors: V };
}
function nullBasis(J) { // Householder QR of J^T; the trailing columns of Q span the null space of J
  const m = J.length, n = J[0].length, A = zeros(n, m), Q = zeros(n, n);
  for (let i = 0; i < n; i++) { Q[i][i] = 1; for (let j = 0; j < m; j++) A[i][j] = J[j][i]; }
  for (let k = 0; k < m; k++) {
    const v = new Float64Array(n); let s = 0; for (let i = k; i < n; i++) { v[i] = A[i][k]; s += v[i] ** 2; }
    const a = -Math.sign(v[k] || 1) * Math.sqrt(s); v[k] -= a; const vv = dot(v, v); if (vv < 1e-300) continue;
    for (let j = 0; j < m; j++) { let t = 0; for (let i = k; i < n; i++) t += v[i] * A[i][j]; t *= 2 / vv; for (let i = k; i < n; i++) A[i][j] -= t * v[i]; }
    for (let r = 0; r < n; r++) { let t = 0; for (let i = k; i < n; i++) t += Q[r][i] * v[i]; t *= 2 / vv; for (let i = k; i < n; i++) Q[r][i] -= t * v[i]; }
  }
  return Array.from({ length: n - m }, (_, c) => Float64Array.from(Q, row => row[m + c]));
}

function eigenvalues(M) { // real nonsymmetric: Hessenberg reduction, then Francis double-shift QR (Numerical Recipes hqr)
  const n = M.length, a = M.map(r => Float64Array.from(r)), wr = new Float64Array(n), wi = new Float64Array(n);
  for (let m = 1; m < n - 1; m++) {
    let x = 0, i = m;
    for (let j = m; j < n; j++) if (Math.abs(a[j][m - 1]) > Math.abs(x)) { x = a[j][m - 1]; i = j; }
    if (i !== m) { for (let j = m - 1; j < n; j++) [a[i][j], a[m][j]] = [a[m][j], a[i][j]]; for (let j = 0; j < n; j++) [a[j][i], a[j][m]] = [a[j][m], a[j][i]]; }
    if (x) for (i = m + 1; i < n; i++) { let y = a[i][m - 1]; if (y) { y /= x; a[i][m - 1] = y; for (let j = m; j < n; j++) a[i][j] -= y * a[m][j]; for (let j = 0; j < n; j++) a[j][m] += y * a[j][i]; } }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < i - 1; j++) a[i][j] = 0;
  let anorm = 0; for (let i = 0; i < n; i++) for (let j = Math.max(i - 1, 0); j < n; j++) anorm += Math.abs(a[i][j]);
  let nn = n - 1, t = 0, p = 0, q = 0, r = 0, x, y, z, w, s, l;
  while (nn >= 0) {
    let its = 0;
    do {
      for (l = nn; l >= 1; l--) { s = Math.abs(a[l - 1][l - 1]) + Math.abs(a[l][l]); if (s === 0) s = anorm; if (Math.abs(a[l][l - 1]) + s === s) { a[l][l - 1] = 0; break; } }
      x = a[nn][nn];
      if (l === nn) { wr[nn] = x + t; wi[nn--] = 0; }
      else {
        y = a[nn - 1][nn - 1]; w = a[nn][nn - 1] * a[nn - 1][nn];
        if (l === nn - 1) {
          p = 0.5 * (y - x); q = p * p + w; z = Math.sqrt(Math.abs(q)); x += t;
          if (q >= 0) { z = p + (p >= 0 ? z : -z); wr[nn - 1] = wr[nn] = x + z; if (z) wr[nn] = x - w / z; wi[nn - 1] = wi[nn] = 0; }
          else { wr[nn - 1] = wr[nn] = x + p; wi[nn - 1] = -(wi[nn] = z); }
          nn -= 2;
        } else {
          if (its === 60) throw Error('eigenvalue iteration did not converge');
          if (its === 10 || its === 20) { t += x; for (let i = 0; i <= nn; i++) a[i][i] -= x; s = Math.abs(a[nn][nn - 1]) + Math.abs(a[nn - 1][nn - 2]); y = x = 0.75 * s; w = -0.4375 * s * s; }
          ++its;
          let m;
          for (m = nn - 2; m >= l; m--) {
            z = a[m][m]; r = x - z; s = y - z;
            p = (r * s - w) / a[m + 1][m] + a[m][m + 1]; q = a[m + 1][m + 1] - z - r - s; r = a[m + 2][m + 1];
            s = Math.abs(p) + Math.abs(q) + Math.abs(r); p /= s; q /= s; r /= s;
            if (m === l) break;
            const u = Math.abs(a[m][m - 1]) * (Math.abs(q) + Math.abs(r)), v = Math.abs(p) * (Math.abs(a[m - 1][m - 1]) + Math.abs(z) + Math.abs(a[m + 1][m + 1]));
            if (u + v === v) break;
          }
          for (let i = m + 2; i <= nn; i++) { a[i][i - 2] = 0; if (i !== m + 2) a[i][i - 3] = 0; }
          for (let k = m; k <= nn - 1; k++) {
            if (k !== m) { p = a[k][k - 1]; q = a[k + 1][k - 1]; r = 0; if (k !== nn - 1) r = a[k + 2][k - 1]; if ((x = Math.abs(p) + Math.abs(q) + Math.abs(r)) !== 0) { p /= x; q /= x; r /= x; } }
            if ((s = (p >= 0 ? 1 : -1) * Math.sqrt(p * p + q * q + r * r)) !== 0) {
              if (k === m) { if (l !== m) a[k][k - 1] = -a[k][k - 1]; } else a[k][k - 1] = -s * x;
              p += s; x = p / s; y = q / s; z = r / s; q /= p; r /= p;
              for (let j = k; j <= nn; j++) { p = a[k][j] + q * a[k + 1][j]; if (k !== nn - 1) { p += r * a[k + 2][j]; a[k + 2][j] -= p * z; } a[k + 1][j] -= p * y; a[k][j] -= p * x; }
              const mmin = nn < k + 3 ? nn : k + 3;
              for (let i = l; i <= mmin; i++) { p = x * a[i][k] + y * a[i][k + 1]; if (k !== nn - 1) { p += z * a[i][k + 2]; a[i][k + 2] -= p * r; } a[i][k + 1] -= p * q; a[i][k] -= p; }
            }
          }
        }
      }
    } while (l < nn - 1);
  }
  return Array.from(wr, (re, i) => [re, wi[i]]);
}

// ---------- the collapse manifold ----------
function model(N, alpha) {
  const n = 3 * N - 3, p = (alpha + 2) / 2, K = 1 / (2 * Math.PI);
  const unpack = x => {
    const z = [[0, 0], [1, 0]]; for (let k = 2; k < N; k++) z.push([x[2 * (k - 2)], x[2 * (k - 2) + 1]]);
    const G = [1]; for (let k = 1; k < N; k++) G.push(x[2 * (N - 2) + k - 1]);
    return { z, G, kappa: [x[n - 2], x[n - 1]] };
  };
  const zCol = k => k >= 2 ? 2 * (k - 2) : -1, gCol = k => k >= 1 ? 2 * (N - 2) + k - 1 : -1;
  // Velocities and, when asked, their derivatives with respect to every z_k and G_k.
  function velocities(z, G, withJacobian) {
    const v = z.map(() => [0, 0]), dz = withJacobian ? z.map(() => zeros(2, 2 * N)) : null, dG = withJacobian ? z.map(() => zeros(2, N)) : null;
    for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
      if (j === k) continue;
      const dx = z[j][0] - z[k][0], dy = z[j][1] - z[k][1], s = dx * dx + dy * dy, sp = Math.pow(s, -p);
      const wx = dx * sp, wy = dy * sp; // w(d) = d |d|^(-alpha-2); i w = (-wy, wx)
      v[j][0] -= K * G[k] * wy; v[j][1] += K * G[k] * wx;
      if (!withJacobian) continue;
      const q = 2 * p * sp / s, Wxx = sp - q * dx * dx, Wxy = -q * dx * dy, Wyy = sp - q * dy * dy;
      const a = K * G[k], m = [[-a * Wxy, -a * Wyy], [a * Wxx, a * Wxy]];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { dz[j][r][2 * j + c] += m[r][c]; dz[j][r][2 * k + c] -= m[r][c]; }
      dG[j][0][k] -= K * wy; dG[j][1][k] += K * wx;
    }
    return { v, dz, dG };
  }
  function residual(x, withJacobian = false) {
    const { z, G, kappa } = unpack(x), [kr, ki] = kappa, { v, dz, dG } = velocities(z, G, withJacobian);
    const c = new Float64Array(2 * (N - 1)), J = withJacobian ? zeros(2 * (N - 1), n) : null;
    let scale = 0;
    for (let j = 1; j < N; j++) {
      const [zr, zi] = z[j], row = 2 * (j - 1);
      c[row] = v[j][0] - v[0][0] - (kr * zr - ki * zi); c[row + 1] = v[j][1] - v[0][1] - (kr * zi + ki * zr);
      scale = Math.max(scale, Math.hypot(v[j][0] - v[0][0], v[j][1] - v[0][1]), Math.hypot(kr, ki) * Math.hypot(zr, zi));
      if (!withJacobian) continue;
      for (let r = 0; r < 2; r++) {
        for (let k = 2; k < N; k++) for (let cc = 0; cc < 2; cc++) J[row + r][zCol(k) + cc] = dz[j][r][2 * k + cc] - dz[0][r][2 * k + cc];
        for (let k = 1; k < N; k++) J[row + r][gCol(k)] = dG[j][r][k] - dG[0][r][k];
      }
      if (j >= 2) { const col = zCol(j); J[row][col] -= kr; J[row][col + 1] += ki; J[row + 1][col] -= ki; J[row + 1][col + 1] -= kr; }
      J[row][n - 2] = -zr; J[row][n - 1] = zi; J[row + 1][n - 2] = -zi; J[row + 1][n - 1] = -zr;
    }
    return { c, J, scale: scale || 1, z, G, kappa, v };
  }
  const objective = x => { const kr = x[n - 2], ki = x[n - 1]; return ki * ki / (4 * kr * kr); }; // P^2
  const gradient = x => { const g = new Float64Array(n), kr = x[n - 2], ki = x[n - 1]; g[n - 2] = -ki * ki / (2 * kr ** 3); g[n - 1] = ki / (2 * kr * kr); return g; };
  return { N, alpha, n, m: 2 * (N - 1), p, unpack, residual, objective, gradient, velocities };
}
const alphaOf = mdl => mdl.alpha;
const feasibility = r => Math.max(...r.c.map(Math.abs)) / r.scale;
function geometry(mdl, x) {
  const { z, G, kappa } = mdl.unpack(x); let dmin = Infinity, dmax = 0;
  for (let i = 0; i < z.length; i++) for (let j = i + 1; j < z.length; j++) { const d = Math.hypot(z[i][0] - z[j][0], z[i][1] - z[j][1]); dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); }
  const g = G.map(Math.abs);
  // Compare |kappa| with the rate a typical pair induces; a tiny ratio means a nearly stationary state.
  const rate = Math.hypot(...kappa) * dmax ** (alphaOf(mdl) + 2) / (Math.max(...g) / (2 * Math.PI));
  return { separation: dmin / dmax, spread: Math.max(...g) / Math.min(...g), size: dmax, rate,
    relativeEquilibrium: Math.abs(kappa[0]) < 1e-12 * Math.hypot(...kappa) || rate < 1e-6 };
}
const degenerate = (mdl, x) => { const g = geometry(mdl, x); return !x.every(Number.isFinite) || g.separation < PROTOCOL.limits.minSeparation || g.spread > PROTOCOL.limits.circulationSpread || g.size > 1e4 || g.relativeEquilibrium; };
// Damped minimum-norm Gauss-Newton onto c = 0. For short retractions near the manifold (chord = true) the
// factorization of J J^T is reused while it keeps making good progress, which needs only the residual, and is
// refreshed with a new Jacobian when progress slows. Landing from a far start uses a fresh Jacobian every step.
function project(mdl, x0, iterations = 60, chord = true) {
  let x = Float64Array.from(x0), r = mdl.residual(x, true), J = r.J, mu = 1e-6 * Math.max(1, ...J.map(row => dot(row, row))), factor = null;
  for (let it = 0; it < iterations; it++) {
    const f = feasibility(r); if (f < 1e-14) break;
    if (!factor) { factor = cholesky(gram(J, mu)); if (!factor) { mu *= 100; continue; } }
    const step = mulT(J, factor(r.c)), trial = Float64Array.from(x, (xi, i) => xi - step[i]);
    const rt = trial.every(Number.isFinite) ? mdl.residual(trial, false) : null, before = norm(r.c), after = rt ? norm(rt.c) : Infinity;
    if (after < before) {
      x = trial; r = rt;
      if (!chord || after > 0.25 * before) { r = mdl.residual(x, true); J = r.J; factor = null; mu = Math.max(mu / 10, 1e-300); }
    } else { r = mdl.residual(x, true); J = r.J; factor = null; mu *= 10; if (mu > 1e20) break; }
  }
  return { x, feasibility: feasibility(r) };
}
function lagrangeGradient(mdl, x, lambda) { const r = mdl.residual(x, true), g = mdl.gradient(x), jl = mulT(r.J, lambda); return g.map((gi, i) => gi + jl[i]); }
function reducedState(mdl, x) {
  const r = mdl.residual(x, true), g = mdl.gradient(x), Z = nullBasis(r.J);
  const lambda = spdSolve(gram(r.J), mul(r.J, g)).map(v => -v);
  const reduced = Float64Array.from(Z, zc => dot(zc, g));
  return { r, g, Z, lambda, reduced };
}
// Z^T H Z from central differences of the Lagrangian gradient along each unit tangent direction: N - 1 directions
// instead of all 3N - 3 coordinates, and no n x n Hessian.
function reducedHessian(mdl, x, Z, lambda) {
  const h = 1e-5 * Math.max(1, Math.sqrt(dot(x, x) / x.length));
  const HZ = Z.map(zc => {
    const ga = lagrangeGradient(mdl, Float64Array.from(x, (v, k) => v + h * zc[k]), lambda), gb = lagrangeGradient(mdl, Float64Array.from(x, (v, k) => v - h * zc[k]), lambda);
    return Float64Array.from(ga, (v, k) => (v - gb[k]) / (2 * h));
  });
  const R = Z.map((zi, i) => Float64Array.from(Z, (_, j) => dot(zi, HZ[j])));
  for (let i = 0; i < R.length; i++) for (let j = 0; j < i; j++) R[i][j] = R[j][i] = (R[i][j] + R[j][i]) / 2;
  return R;
}
// Riemannian Newton on the collapse manifold with a saddle-free eigenvalue modification.
function minimize(mdl, x0) {
  let x = x0, f = mdl.objective(x), iterations = 0, status = 'stalled', state; const history = [], grads = [];
  for (; iterations < PROTOCOL.newtonIterations; iterations++) {
    if (degenerate(mdl, x)) { status = 'degenerate'; break; }
    state = reducedState(mdl, x);
    const gscale = Math.max(1e-300, Math.sqrt(f));
    // Newton reaches a nondegenerate minimum in 10 to 30 steps here. After 30, a run whose P^2 fell by under 1% and
    // whose reduced gradient shrank by under a factor 10 over the last 15 steps is crawling, not converging.
    history.push(f); grads.push(norm(state.reduced) / gscale);
    const k = history.length;
    if (k > 30 && history[k - 16] - f < 1e-2 * f && grads[k - 16] < 10 * grads[k - 1]) break;
    if (norm(state.reduced) / gscale < PROTOCOL.limits.reducedGradient * 1e-2) { status = 'stationary'; break; }
    const R = reducedHessian(mdl, x, state.Z, state.lambda), { values, vectors } = jacobiEigen(R);
    const big = Math.max(...values.map(Math.abs), 1e-300), dir = new Float64Array(mdl.n);
    for (let e = 0; e < values.length; e++) {
      const vec = Float64Array.from(vectors, row => row[e]), coef = -dot(vec, state.reduced) / Math.max(Math.abs(values[e]), 1e-8 * big);
      state.Z.forEach((zc, i) => { for (let k = 0; k < mdl.n; k++) dir[k] += coef * vec[i] * zc[k]; });
    }
    const cap = 0.25 * Math.max(1, norm(x)) / Math.max(norm(dir), 1e-300); if (cap < 1) dir.forEach((_, k) => { dir[k] *= cap; });
    let accepted = false;
    for (let t = 1; t > 1e-8; t /= 2) {
      const pr = project(mdl, Float64Array.from(x, (xi, k) => xi + t * dir[k]));
      if (pr.feasibility > 1e-12) continue;
      const ft = mdl.objective(pr.x);
      if (ft <= f) { accepted = ft < f || t === 1; if (accepted) { x = pr.x; f = ft; } break; }
    }
    if (!accepted) { status = norm(state.reduced) / gscale < PROTOCOL.limits.reducedGradient ? 'stationary' : 'stalled'; break; }
  }
  return { x, f, iterations, status };
}

// ---------- independent checks ----------
// A separately written Biot-Savart right-hand side, integrated with Dormand-Prince 5(4).
function rhs(alpha, G, y) {
  const N = G.length, out = new Float64Array(2 * N);
  for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
    if (j === k) continue;
    const dx = y[2 * j] - y[2 * k], dy = y[2 * j + 1] - y[2 * k + 1], f = G[k] / (2 * Math.PI) * Math.pow(Math.hypot(dx, dy), -alpha - 2);
    out[2 * j] += -f * dy; out[2 * j + 1] += f * dx;
  }
  return out;
}
function integrate(alpha, G, y0, T, rtol = 1e-13) {
  const A = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9], [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729], [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656], [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]];
  const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0], B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];
  let y = Float64Array.from(y0), t = 0, h = T / 1000, steps = 0; const sgn = Math.sign(T);
  while (sgn * (T - t) > 0 && steps < 2e5) {
    if (sgn * (t + h - T) > 0) h = T - t;
    const k = [];
    for (let s = 0; s < 7; s++) { const ys = Float64Array.from(y, (yi, i) => yi + h * A[s].reduce((acc, a, q) => acc + a * k[q][i], 0)); k.push(rhs(alpha, G, ys)); }
    const y5 = Float64Array.from(y, (yi, i) => yi + h * B5.reduce((acc, b, q) => acc + b * k[q][i], 0));
    let err = 0; for (let i = 0; i < y.length; i++) { const e = h * B4.reduce((acc, b, q) => acc + (B5[q] - b) * k[q][i], 0); err = Math.max(err, Math.abs(e) / (rtol * (Math.abs(y5[i]) + 1e-3))); }
    if (err <= 1) { y = y5; t += h; steps++; }
    h *= Math.min(4, Math.max(0.2, 0.9 * Math.pow(err || 1e-10, -0.2)));
  }
  return { y, steps };
}
// Linear stability in similarity variables. With z = rho(t) zeta and d tau = |rho|^(-2 beta) dt, a collapse is a
// fixed point of d zeta / d tau = V(zeta) - kappa zeta. A perturbation growing as e^(mu tau) grows as r^(-k) with
// k = -Re(mu) / Re(kappa) as the cluster shrinks to size r. Four modes are symmetries and must appear exactly:
// rotation (mu = 0), a shift of the collapse time (mu = -2 beta Re kappa) and translation (mu = -kappa, -conj kappa).
// The rescaled flow is Hamiltonian plus the uniform dilation -Re(kappa), so every other eigenvalue has a partner with
// k + k' = 2: the partners of rotation and time shift (k = 2, which breaks the zero angular impulse, and k = -alpha,
// which breaks the energy condition) appear exactly, and the remaining 2N - 6 genuine shape modes pair among themselves.
function stability(mdl, x, perturb = 0) {
  const { z, G, kappa } = mdl.unpack(x), [kr, ki] = kappa, N = mdl.N, beta = 1 + mdl.alpha / 2, { dz } = mdl.velocities(z, G, true);
  const A = zeros(2 * N, 2 * N);
  for (let j = 0; j < N; j++) for (let r = 0; r < 2; r++) for (let c = 0; c < 2 * N; c++) A[2 * j + r][c] = dz[j][r][c];
  for (let j = 0; j < N; j++) { A[2 * j][2 * j] -= kr; A[2 * j][2 * j + 1] += ki; A[2 * j + 1][2 * j] -= ki; A[2 * j + 1][2 * j + 1] -= kr; }
  A[2 * N - 1][2 * N - 1] += perturb * Math.hypot(kr, ki); // controls only: a non-Hamiltonian defect
  const mu = eigenvalues(A), used = new Set(), scale = Math.hypot(kr, ki);
  let trivialError = 0;
  for (const [tr, ti] of [[0, 0], [-2 * beta * kr, 0], [-kr, ki], [-kr, -ki], [-2 * kr, 0], [mdl.alpha * kr, 0]]) {
    let best = -1, d = Infinity; mu.forEach((m, i) => { const e = Math.hypot(m[0] - tr, m[1] - ti); if (!used.has(i) && e < d) { d = e; best = i; } });
    used.add(best); trivialError = Math.max(trivialError, d / scale);
  }
  const k = m => -m[0] / kr, shape = mu.filter((_, i) => !used.has(i)).map(m => ({ exponent: k(m), frequency: Math.abs(m[1] / kr) })).sort((a, b) => b.exponent - a.exponent || a.frequency - b.frequency);
  let pairingError = 0; const big = 1 + Math.max(0, ...shape.map(m => Math.abs(m.exponent)));
  shape.forEach((m, i) => { const o = shape[shape.length - 1 - i]; pairingError = Math.max(pairingError, (Math.abs(m.exponent + o.exponent - 2) + Math.abs(m.frequency - o.frequency)) / big); });
  return { trivialModeError: trivialError, pairingError, shapeModes: shape, maxShapeExponent: shape.length ? shape[0].exponent : null,
    unstableShapeModes: shape.filter(m => m.exponent > 1e-8).length, maxExponent: Math.max(...mu.map(k)),
    note: 'Exponent k: a shape perturbation grows as r^(-k) while the cluster shrinks to size r. Round-off seeds these modes in any direct integration.' };
}
function certify(mdl, x, { wrongExponent = 0, wrongWinding = 1 } = {}) {
  const { z, G, kappa } = mdl.unpack(x), [kr, ki] = kappa, N = mdl.N, alpha = mdl.alpha, beta = 1 + alpha / 2, L = PROTOCOL.limits;
  const res = mdl.residual(x, true), P = Math.abs(ki) / (2 * Math.abs(kr)) * wrongWinding;
  // Collapse centre from vortex 1, then the full similarity residual including vortex 1.
  const k2 = kr * kr + ki * ki, v0 = res.v[0], zc = [z[0][0] - (v0[0] * kr + v0[1] * ki) / k2, z[0][1] - (v0[1] * kr - v0[0] * ki) / k2];
  // Conservation laws force these to vanish on any self-similar collapse; nothing imposes them directly.
  const Gs = G.reduce((a, b) => a + b, 0), cv = Math.abs(Gs) > 1e-9 ? [G.reduce((a, g, i) => a + g * z[i][0], 0) / Gs, G.reduce((a, g, i) => a + g * z[i][1], 0) / Gs] : null;
  let I = 0, Iabs = 0, H = 0, Habs = 0;
  z.forEach((zi, i) => { const r2 = (zi[0] - zc[0]) ** 2 + (zi[1] - zc[1]) ** 2; I += G[i] * r2; Iabs += Math.abs(G[i]) * r2; });
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const d = Math.hypot(z[i][0] - z[j][0], z[i][1] - z[j][1]), t = alpha === 0 ? G[i] * G[j] : G[i] * G[j] * Math.pow(d, -alpha); H += t; Habs += Math.abs(t); }
  const invariants = { angularImpulse: Math.abs(I) / Iabs, energy: Math.abs(H) / Habs, energyForm: alpha === 0 ? 'sum G_i G_j' : 'sum G_i G_j |z_ij|^-alpha',
    centreOfVorticity: cv ? Math.hypot(cv[0] - zc[0], cv[1] - zc[1]) / geometry(mdl, x).size : null };
  // Integrate the full N-body system to the time at which exact self-similarity shrinks it by lambda.
  // Integrate only as far as the fastest mode can amplify round-off by the declared factor.
  const stab = stability(mdl, x), lambda = Math.max(L.odeShrink, Math.pow(L.odeAmplification, -1 / Math.max(stab.maxExponent, 1e-9))), b = beta + wrongExponent, T = (Math.pow(lambda, 2 * b) - 1) / (2 * b * kr);
  const y0 = Float64Array.from(z.flat()), run = integrate(alpha, G, y0, T), theta = ki / kr * Math.log(lambda);
  const c = lambda * Math.cos(theta), s = lambda * Math.sin(theta);
  let shape = 0, radius = 0, turn = 0;
  for (let j = 0; j < N; j++) {
    const dx = z[j][0] - zc[0], dy = z[j][1] - zc[1], px = zc[0] + c * dx - s * dy, py = zc[1] + s * dx + c * dy;
    shape = Math.max(shape, Math.hypot(run.y[2 * j] - px, run.y[2 * j + 1] - py)); radius = Math.max(radius, Math.hypot(dx, dy));
  }
  // Winding measured from the integrated trajectory's own angle and radius, with no use of kappa.
  const far = z.reduce((best, zi, i) => Math.hypot(zi[0] - zc[0], zi[1] - zc[1]) > Math.hypot(z[best][0] - zc[0], z[best][1] - zc[1]) ? i : best, 0);
  const a0 = Math.atan2(z[far][1] - zc[1], z[far][0] - zc[0]), r0 = Math.hypot(z[far][0] - zc[0], z[far][1] - zc[1]);
  const fx = run.y[2 * far] - zc[0], fy = run.y[2 * far + 1] - zc[1], r1 = Math.hypot(fx, fy);
  let dA = Math.atan2(fy, fx) - a0; turn = theta + Math.atan2(Math.sin(dA - theta), Math.cos(dA - theta));
  const measuredP = Math.abs(turn) / (2 * Math.abs(Math.log(r1 / r0)));
  // Relative winding error, absolute below P = 1e-3 so that a zero-winding collapse is checked too.
  const ode = { shrink: lambda, time: T, steps: run.steps, shapeError: shape / (lambda * radius), measuredWinding: measuredP, windingError: Math.abs(measuredP - P) / Math.max(P, 1e-3) };
  const g = geometry(mdl, x), fz = feasibility(res);
  const checks = { feasibility: fz < L.feasibility, ode: ode.shapeError < L.odeShape && ode.windingError < L.odeWinding,
    invariants: invariants.angularImpulse < L.invariant && invariants.energy < L.invariant && (invariants.centreOfVorticity === null || invariants.centreOfVorticity < L.center),
    nondegenerate: g.separation >= L.minSeparation && g.spread <= L.circulationSpread && !g.relativeEquilibrium,
    symmetryModes: stab.trivialModeError < L.trivialModes, hamiltonianPairing: stab.pairingError < L.trivialModes };
  return { P, feasibility: fz, centre: zc, invariants, ode, stability: stab, geometry: g, checks };
}
function secondOrder(mdl, x) {
  const st = reducedState(mdl, x), R = reducedHessian(mdl, x, st.Z, st.lambda), eig = jacobiEigen(R).values.sort((a, b) => a - b);
  const sv = jacobiEigen(gram(st.r.J)).values.map(v => Math.sqrt(Math.max(v, 0))).sort((a, b) => a - b), f = mdl.objective(x);
  const reducedGradient = norm(st.reduced) / Math.max(Math.sqrt(f), 1e-300), soscRatio = eig[0] / Math.max(Math.abs(eig[eig.length - 1]), 1e-300), licq = sv[0] / sv[sv.length - 1];
  const L = PROTOCOL.limits;
  return { reducedGradient, hessianEigenvalues: eig, soscRatio, licq, manifoldDimension: st.Z.length,
    passed: reducedGradient < L.reducedGradient && soscRatio > L.soscRelative && licq > L.licq };
}

// ---------- seeded search ----------
function rng(label) { // xoshiro128** seeded by SHA-256 of a readable label
  const h = crypto.createHash('sha256').update(label).digest(); let s = [0, 4, 8, 12].map(i => h.readUInt32LE(i));
  const rotl = (x, k) => (x << k) | (x >>> (32 - k));
  return () => { const r = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0, t = s[1] << 9; s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t; s[3] = rotl(s[3], 11); return r / 4294967296; };
}
const gauss = u => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
const seedLabel = (alpha, N, seed) => `vortex-collapse/v${PROTOCOL.version}/alpha=${alpha}/N=${N}/seed=${seed}`;
function searchSeed(alpha, N, seed) {
  const mdl = model(N, alpha), u = rng(seedLabel(alpha, N, seed)), started = Date.now();
  let landed = null, attempts = 0;
  for (; attempts < PROTOCOL.landingAttempts && !landed; attempts++) {
    const x = new Float64Array(mdl.n);
    for (let k = 0; k < 2 * (N - 2); k++) x[k] = 1.2 * gauss(u);
    for (let k = 1; k < N; k++) x[2 * (N - 2) + k - 1] = (u() < 0.5 ? -1 : 1) * (0.2 + 1.8 * u());
    x[mdl.n - 2] = gauss(u); x[mdl.n - 1] = gauss(u);
    const pr = project(mdl, x, 200, false);
    if (pr.feasibility < 1e-12 && !degenerate(mdl, pr.x)) landed = pr.x;
  }
  if (!landed) return { seed, status: 'no-landing', attempts, ms: Date.now() - started };
  return classify(mdl, minimize(mdl, landed), { seed, attempts }, started);
}
function classify(mdl, opt, out, started) {
  Object.assign(out, { iterations: opt.iterations, P: Math.sqrt(opt.f), ms: 0 });
  if (opt.status === 'degenerate') Object.assign(out, { status: 'degenerate', geometry: geometry(mdl, opt.x) });
  else if (opt.status === 'stalled') Object.assign(out, { status: 'stalled', geometry: geometry(mdl, opt.x) });
  else {
    const so = secondOrder(mdl, opt.x), cert = certify(mdl, opt.x);
    Object.assign(out, { status: certifiedStatus(so, cert) || 'unverified-stationary', secondOrder: so, certificate: cert });
  }
  out.config = configOf(mdl, opt.x); out.ms = Date.now() - started;
  return out;
}
// P >= 0, so a collapse with no winding at all is a global minimum. Such collapses form a family (Im kappa = 0 cuts
// out a submanifold), so the Hessian is singular along it and the strict second-order test cannot apply; every
// other test still must pass.
const ZERO_WINDING = 1e-12;
function certifiedStatus(so, cert) {
  if (!Object.values(cert.checks).every(Boolean)) return null;
  if (so.passed) return 'certified-local-minimum';
  if (cert.P < ZERO_WINDING && so.licq > PROTOCOL.limits.licq) return 'zero-winding';
  return null;
}
const isCertified = r => r.status === 'certified-local-minimum' || r.status === 'zero-winding';
// Family continuation: add one vortex beyond a certified N-vortex minimum and descend again. New vortices go just
// outside one of the three outermost vortices, turned a little along the spiral, with a weaker circulation of either
// sign. The one-arm and two-arm families of the research notes grow this way.
const growLabel = (alpha, N, seed) => `vortex-collapse/v${PROTOCOL.version}/grow/alpha=${alpha}/N=${N}/seed=${seed}`;
function growSeed(alpha, parent, seed) {
  const N = parent.z.length + 1, mdl = model(N, alpha), small = model(N - 1, alpha), u = rng(growLabel(alpha, N, seed)), started = Date.now();
  const xs = fromConfig(small, parent), { z, G, kappa } = small.unpack(xs), v0 = small.velocities(z, G, false).v[0], k2 = kappa[0] ** 2 + kappa[1] ** 2;
  const zc = [z[0][0] - (v0[0] * kappa[0] + v0[1] * kappa[1]) / k2, z[0][1] - (v0[1] * kappa[0] - v0[0] * kappa[1]) / k2];
  const outer = z.map((p, i) => [Math.hypot(p[0] - zc[0], p[1] - zc[1]), i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(q => q[1]);
  let landed = null, attempts = 0;
  for (; attempts < PROTOCOL.landingAttempts && !landed; attempts++) {
    const k = outer[Math.floor(u() * outer.length)], s = 1.05 + 0.6 * u(), phi = (u() - 0.5) * 1.2, dx = z[k][0] - zc[0], dy = z[k][1] - zc[1];
    const nz = [zc[0] + s * (dx * Math.cos(phi) - dy * Math.sin(phi)), zc[1] + s * (dx * Math.sin(phi) + dy * Math.cos(phi))];
    const g = G[k] * (0.05 + 0.6 * u()) * (u() < 0.75 ? 1 : -1);
    const pr = project(mdl, fromConfig(mdl, { z: [...z, nz], G: [...G, g] }), 200, false);
    if (pr.feasibility < 1e-12 && !degenerate(mdl, pr.x)) landed = pr.x;
  }
  if (!landed) return { seed, status: 'no-landing', attempts, ms: Date.now() - started };
  return classify(mdl, minimize(mdl, landed), { seed, attempts }, started);
}
const configOf = (mdl, x) => { const { z, G, kappa } = mdl.unpack(x); return { z, G, kappa }; };
function fromConfig(mdl, config) {
  assert(config && Array.isArray(config.z) && config.z.length === mdl.N && Array.isArray(config.G) && config.G.length === mdl.N, 'Configuration has the wrong vortex count.');
  // Re-impose the gauge from the submitted numbers alone: translate, rotate and scale so z_1 = 0, z_2 = 1, and scale G so G_1 = 1.
  const z = config.z.map(p => p.map(Number)), G = config.G.map(Number); assert([...z.flat(), ...G].every(Number.isFinite), 'Nonfinite configuration.');
  const [ax, ay] = z[0], bx = z[1][0] - ax, by = z[1][1] - ay, d2 = bx * bx + by * by;
  const w = z.map(([x, y]) => { const px = x - ax, py = y - ay; return [(px * bx + py * by) / d2, (py * bx - px * by) / d2]; }), g = G.map(v => v / G[0]);
  const x = new Float64Array(mdl.n); for (let k = 2; k < mdl.N; k++) { x[2 * (k - 2)] = w[k][0]; x[2 * (k - 2) + 1] = w[k][1]; }
  for (let k = 1; k < mdl.N; k++) x[2 * (mdl.N - 2) + k - 1] = g[k];
  // kappa is recomputed rather than trusted: least squares on the similarity equations.
  const { v } = mdl.velocities(w, g, false); let nr = 0, ni = 0, dd = 0;
  for (let j = 1; j < mdl.N; j++) { const ux = v[j][0] - v[0][0], uy = v[j][1] - v[0][1], [zr, zi] = w[j]; nr += ux * zr + uy * zi; ni += uy * zr - ux * zi; dd += zr * zr + zi * zi; }
  x[mdl.n - 2] = nr / dd; x[mdl.n - 1] = ni / dd;
  return x;
}
function distinct(results) {
  const minima = [];
  for (const r of results.filter(isCertified).sort((a, b) => a.P - b.P)) {
    const hit = minima.find(m => Math.abs(m.P - r.P) < 1e-8 * Math.max(1, r.P));
    if (hit) { hit.basinSeeds++; continue; }
    minima.push({ P: r.P, status: r.status, basinSeeds: 1, firstSeed: r.seed, soscRatio: r.secondOrder.soscRatio, config: r.config });
  }
  return minima;
}
const certifiedOf = rs => rs.filter(isCertified);
const lowest = rs => { const v = rs.map(r => r.P).filter(Number.isFinite); return v.length ? Math.min(...v) : null; };
function git(args) { const r = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; }
function header(alpha, N) {
  return { experiment: 'vortex-collapse-search', protocol: PROTOCOL, alpha, N, sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    commit: process.env.GENCHASE_JOB_COMMIT || git(['rev-parse', 'HEAD']), machine: process.env.GENCHASE_MACHINE_SLUG || null, node: process.version, platform: process.platform, arch: process.arch,
    reference: REFERENCE[String(alpha)]?.[N] ?? null, infimumN3: N === 3 ? infimum3(alpha) : undefined,
    scope: 'Binary64 multistart search. A certified strict local minimum is a numerical candidate with a second-order certificate, not a proof of a global minimum. Priority unconfirmed.' };
}
// ---------- compute and energy accounting ----------
// CPU time is measured by the process itself. Energy is measured only where the operating system exposes a
// package energy counter (Linux RAPL); that counter covers the whole processor package, including other programs.
// Everywhere else the job reports an estimate from CPU time, with its assumption written beside it.
const { WATTS_PER_BUSY_CORE, energyCounter, energyBetween, energy } = require('../apps/validate/compute');
function runtimeCard() { // general hardware only: no hostname, user name, network or serial number
  const cpus = require('node:os').cpus(), os = require('node:os');
  return { cpuModel: (cpus[0]?.model || 'unknown').replace(/\s+/g, ' ').trim(), logicalCores: cpus.length, memoryGiB: +(os.totalmem() / 2 ** 30).toFixed(1),
    os: os.type(), osRelease: os.release(), arch: process.arch, node: process.version, v8: process.versions.v8 };
}
// Fingerprint of every seed's outcome and winding, rounded to 1e-9. Two machines running the same block on the same
// protocol should agree; a mismatch shows platform dependence, which is itself worth reporting.
const digest = results => crypto.createHash('sha256').update(results.map(r => r.seed + ':' + r.status + ':' + (Number.isFinite(r.P) ? r.P.toFixed(9) : '-')).join('\n')).digest('hex');
function margins(results) {
  const c = results.filter(r => r.status === 'certified-local-minimum'), L = PROTOCOL.limits;
  if (!c.length) return null;
  const worst = (f, pick = Math.max) => pick(...c.map(f));
  return { certified: c.length, limits: L,
    worstFeasibility: worst(r => r.certificate.feasibility), worstReducedGradient: worst(r => r.secondOrder.reducedGradient),
    smallestSoscRatio: worst(r => r.secondOrder.soscRatio, Math.min), smallestLicq: worst(r => r.secondOrder.licq, Math.min),
    worstOdeShape: worst(r => r.certificate.ode.shapeError), worstOdeWinding: worst(r => r.certificate.ode.windingError),
    worstInvariant: worst(r => Math.max(r.certificate.invariants.angularImpulse, r.certificate.invariants.energy)),
    worstSymmetryMode: worst(r => r.certificate.stability.trivialModeError), worstPairing: worst(r => r.certificate.stability.pairingError) };
}
function computeSummary(results, wallSeconds, measuredJoules) {
  const cpuSeconds = results.reduce((a, r) => a + (r.cpuMs || 0), 0) / 1000, hours = cpuSeconds / 3600;
  const tally = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {}), certified = (tally['certified-local-minimum'] || 0) + (tally['zero-winding'] || 0);
  return { seeds: results.length, wallSeconds, cpuSeconds, cpuSecondsPerSeed: results.length ? cpuSeconds / results.length : null,
    utilization: wallSeconds > 0 ? Math.min(1, cpuSeconds / wallSeconds) : null, peakMemoryMiB: +(process.resourceUsage().maxRSS / 1024).toFixed(1),
    seedsPerCpuHour: hours > 0 ? results.length / hours : null, certifiedPerCpuHour: hours > 0 ? certified / hours : null,
    yield: Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, v / results.length])),
    energy: energy(cpuSeconds, measuredJoules ?? undefined) };
}
function run(opt) {
  const { alpha, N, start, count } = opt;
  return runBlock({ alpha, N, start, count, file: opt.out || defaultOut(alpha, N, start, count), spec: { kind: 'search', alpha, N }, method: { kind: 'multistart' }, threads: opt.threads });
}
// One seed of either kind, with its own CPU time. Worker threads measure their own thread; the main thread measures itself.
function runSeed(spec, seed) {
  const clock = process.threadCpuUsage ? () => process.threadCpuUsage() : () => process.cpuUsage(), c0 = clock();
  const r = spec.kind === 'grow' ? growSeed(spec.alpha, spec.parent, seed) : searchSeed(spec.alpha, spec.N, seed), c1 = clock();
  r.cpuMs = (c1.user - c0.user + c1.system - c0.system) / 1000;
  return r;
}
// Run seeds on up to `threads` worker threads. Seeds are independent and deterministic, so the results, their order and
// the block's digest do not depend on the thread count. Results are delivered in completion order.
async function mapSeeds(spec, seeds, threads, onResult) {
  if (threads <= 1 || seeds.length <= 1) { for (const s of seeds) onResult(runSeed(spec, s)); return; }
  await new Promise((resolve, reject) => {
    let next = 0, done = 0; const workers = [];
    const finish = err => { for (const w of workers) w.terminate(); err ? reject(err) : resolve(); };
    const feed = w => { if (next < seeds.length) w.postMessage(seeds[next++]); };
    for (let i = 0; i < Math.min(threads, seeds.length); i++) {
      const w = new Worker(__filename, { workerData: { vortexWorker: true, spec } });
      w.on('message', r => { onResult(r); if (++done === seeds.length) finish(); else feed(w); });
      w.on('error', finish);
      workers.push(w); feed(w);
    }
  });
}
async function runBlock({ alpha, N, start, count, file, spec, method, threads = 1, checkpointName = 'vortex-checkpoint.json' }) {
  const jobDir = process.env.GENCHASE_JOB_DIR, checkpointFile = jobDir && path.join(jobDir, checkpointName);
  const signature = crypto.createHash('sha256').update(fs.readFileSync(__filename)).update(JSON.stringify({ alpha, N, start, count, method })).digest('hex');
  let results = [];
  if (checkpointFile && fs.existsSync(checkpointFile)) {
    try { const old = JSON.parse(fs.readFileSync(checkpointFile, 'utf8')); const { checksum, ...body } = old;
      if (checksum === crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex') && body.signature === signature && Array.isArray(body.results)) { results = body.results; console.log('Resumed ' + results.length + '/' + count + ' seeds from checkpoint.'); }
      else console.log('Vortex checkpoint changed or damaged; restarting this seed block.');
    } catch { console.log('Vortex checkpoint could not be read; restarting this seed block.'); }
  }
  const t0 = Date.now(), e0 = energyCounter(), pending = new Map();
  const seeds = Array.from({ length: count - results.length }, (_, i) => start + results.length + i);
  // Buffer out-of-order results and commit them in seed order, so the checkpoint is always a clean prefix.
  await mapSeeds(spec, seeds, threads, r => {
    pending.set(r.seed, r);
    while (pending.has(start + results.length)) {
      const q = pending.get(start + results.length); pending.delete(q.seed); results.push(q);
      console.log(`seed ${q.seed}: ${q.status}${q.P ? ' P=' + q.P.toPrecision(12) : ''} (${q.ms} ms)`);
      console.log('GENCHASE_PROGRESS ' + JSON.stringify({ stage: 'search', message: `alpha ${alpha}, N ${N}: seed ${results.length}/${count}`, done: results.length, total: count, unit: 'seeds' }));
      if (checkpointFile) { const body = { signature, results }; fs.writeFileSync(checkpointFile, JSON.stringify({ ...body, checksum: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex') })); }
    }
  });
  const minima = distinct(results), best = minima[0] || null, ref = REFERENCE[String(alpha)]?.[N];
  const tally = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
  const summary = { seeds: { start, count }, tally, distinctMinima: minima.length, best: best && { P: best.P, basinSeeds: best.basinSeeds, firstSeed: best.firstSeed },
    comparison: best && ref ? { reference: ref, difference: best.P - ref, belowReference: best.P < ref - 1e-8 * ref } : null,
    // Stalled and degenerate runs end on or near the boundary of the collapse manifold: sub-clusters, collisions or
    // runaway circulations. Their values say where the search went, not what the infimum is.
    boundaryApproach: lowest(results.filter(r => ['stalled', 'degenerate'].includes(r.status))),
    belowN3Infimum: N === 3 ? (lowest(results) ?? Infinity) < infimum3(alpha) * (1 - 1e-9) : undefined, elapsedSeconds: (Date.now() - t0) / 1000,
    // CPU time covers every seed, including seeds finished before a resume; wall time and energy cover this run only.
    compute: computeSummary(results, (Date.now() - t0) / 1000, energyBetween(e0, energyCounter())),
    certificateMargins: margins(results), resultsDigest: digest(results), runtime: { ...runtimeCard(), threads } };
  const out = { ...header(alpha, N), method, summary, minima, results };
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  if (jobDir) { const dest = path.join(jobDir, 'outputs/validation/results', path.basename(file)); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(file, dest); }
  console.log(JSON.stringify(summary, null, 2));
  console.log('Result: ' + path.relative(root, file));
  if (summary.comparison?.belowReference) console.log('LOWER THAN THE RECORDED VALUE. Please share this file: every configuration is re-verified independently before it is recorded.');
  if (summary.belowN3Infimum) { console.error('A three-vortex result below the proved infimum means a bug. Please report it.'); process.exitCode = 1; }
  return out;
}
// Grow a family from a certified parent: the best minimum in --from, or the leaderboard's best at the largest N below
// the target. Each step runs its own seed block, and the best certified child becomes the next parent.
async function grow(opt) {
  const { alpha, N: target, start, count } = opt;
  let parent, parentN, source;
  if (opt.from) { const d = JSON.parse(fs.readFileSync(opt.from, 'utf8')); assert(Number(d.alpha) === alpha, '--from has a different alpha.'); const m = (d.minima || [])[0]; assert(m?.config, '--from has no certified minimum.'); parent = m.config; parentN = Number(d.N); source = path.basename(opt.from); }
  else {
    const board = JSON.parse(fs.readFileSync(path.join(root, 'experiments/results/vortex-collapse-leaderboard.json'), 'utf8'));
    // The deepest family below the target, not merely the nearest N: multistart misses deep basins at large N.
    const e = board.entries.filter(q => q.alpha === alpha && q.N < target).sort((a, b) => a.best - b.best || b.N - a.N)[0]; assert(e, 'No leaderboard entry below N = ' + target + ' at alpha ' + alpha + '.');
    parent = e.minima[0].config; parentN = e.N; source = `leaderboard alpha ${alpha}, N ${e.N}, P ${e.best}`;
  }
  assert(parentN < target && target <= 128, 'Growth target must exceed the parent and be at most 128.');
  const outputs = [];
  for (let N = parentN + 1; N <= target; N++) {
    console.log(`Growing alpha ${alpha} from N ${N - 1} to N ${N} (${count} seeds).`);
    const out = await runBlock({ alpha, N, start, count, threads: opt.threads, file: opt.out && target === parentN + 1 ? opt.out : path.join(root, 'run/vortex-collapse', `vortex-grow-a${alpha}-n${N}-s${start}-c${count}.json`),
      spec: { kind: 'grow', alpha, parent }, method: { kind: 'grow', parentN: N - 1, parentP: N - 1 === parentN ? null : outputs.at(-1).minima[0].P, source }, checkpointName: `vortex-grow-${N}-checkpoint.json` });
    outputs.push(out);
    if (!out.minima.length) { console.log('No certified minimum at N ' + N + '; the family stops here for this seed block.'); break; }
    if (out.minima[0].P < ZERO_WINDING) { console.log('Zero winding reached at N ' + N + ': no collapse can wind less.'); break; }
    parent = out.minima[0].config;
  }
  return outputs;
}
// Smaller copies for the repository: per-seed outcomes, winding and CPU time stay; per-seed certificates and
// configurations are dropped. Certified minima keep their full configurations, which is all that review needs.
function compact(data) { return { ...data, results: data.results.map(({ seed, status, P, cpuMs, iterations, attempts }) => ({ seed, status, P, cpuMs, iterations, attempts })) }; }
function sources() {
  const found = [], walk = dir => { if (!fs.existsSync(dir)) return; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (/^vortex-(collapse|grow|threshold)-.*\.json$/.test(e.name)) found.push(f); } };
  walk(path.join(root, 'experiments/results/vortex-collapse')); walk(path.join(root, 'validation/submissions'));
  return found.sort();
}
// Rebuild the leaderboard from every recorded file and put its table into the experiment page.
function refresh() {
  const board = verifyFiles(sources(), true), doc = path.join(root, 'experiments/VORTEX-COLLAPSE.md'), text = fs.readFileSync(doc, 'utf8');
  const a = '<!-- leaderboard:start -->', b = '<!-- leaderboard:end -->', i = text.indexOf(a), j = text.indexOf(b);
  assert(i >= 0 && j > i, 'Leaderboard markers missing from experiments/VORTEX-COLLAPSE.md.');
  let next = text.slice(0, i + a.length) + '\n' + table(board) + '\n' + text.slice(j);
  const ta = '<!-- thresholds:start -->', tb = '<!-- thresholds:end -->', ti = next.indexOf(ta), tj = next.indexOf(tb);
  if (ti >= 0 && tj > ti) next = next.slice(0, ti + ta.length) + '\n' + thresholdTable(board) + '\n' + next.slice(tj);
  fs.writeFileSync(doc, next);
  return board;
}
// ---------- continuation in the kernel exponent ----------
// Follow one certified minimum as alpha changes, re-minimizing P at each step from the previous point, and bracket the
// alpha at which the branch first reaches zero winding. The bracket's low end carries a certified minimum with P > 0
// and its high end a certified zero-winding collapse. Along one branch this is an upper bound on the least alpha at
// which N vortices can collapse without rotating: another branch could reach zero earlier.
const isZero = (so, cert) => certifiedStatus(so, cert) === 'zero-winding';
function atAlpha(N, alpha, x0) {
  const mdl = model(N, alpha), pr = project(mdl, x0, 200, false);
  if (!(pr.feasibility < 1e-12)) return { lost: 'projection' };
  const opt = minimize(mdl, pr.x);
  if (opt.status === 'degenerate') return { lost: 'degenerate', P: Math.sqrt(opt.f) };
  const so = secondOrder(mdl, opt.x), cert = certify(mdl, opt.x), status = certifiedStatus(so, cert);
  return { x: opt.x, P: cert.P, status: status || 'uncertified', cert, so, mdl };
}
async function continueAlpha(opt) {
  let source, N, a0, config;
  if (opt.from) { const d = JSON.parse(fs.readFileSync(opt.from, 'utf8')); N = Number(d.N); a0 = Number(d.alpha); config = (d.minima || [])[0]?.config; source = path.basename(opt.from); }
  else {
    const board = JSON.parse(fs.readFileSync(path.join(root, 'experiments/results/vortex-collapse-leaderboard.json'), 'utf8'));
    const e = board.entries.find(q => q.alpha === opt.alpha && q.N === opt.N); assert(e, `No leaderboard entry at alpha ${opt.alpha}, N ${opt.N}.`);
    N = e.N; a0 = e.alpha; config = e.minima[0].config; source = `leaderboard alpha ${a0}, N ${N}, P ${e.best}`;
  }
  assert(config, 'No certified minimum to continue from.');
  const to = opt.to, step = opt.step || 0.05, tol = opt.tol || 1e-4, dir = Math.sign(to - a0), t0 = Date.now(), c0 = process.cpuUsage();
  assert(Number.isFinite(to) && to > -2 && to <= 3 && dir !== 0, '--to must lie in (-2, 3] and differ from the start.');
  let cur = atAlpha(N, a0, fromConfig(model(N, a0), config)), alpha = a0, h = step; const path_ = [];
  assert(cur.x, 'The starting minimum could not be re-polished.');
  path_.push({ alpha, P: cur.P, status: cur.status });
  let bracket = null, end = null;
  while (dir * (to - alpha) > 1e-12) {
    const next = dir > 0 ? Math.min(alpha + h, to) : Math.max(alpha - h, to), got = atAlpha(N, next, cur.x);
    if (!got.x) { if (h > step / 64) { h /= 2; continue; } end = { alpha: next, lost: got.lost }; break; }
    path_.push({ alpha: next, P: got.P, status: got.status });
    console.log('GENCHASE_PROGRESS ' + JSON.stringify({ stage: 'search', message: `N ${N}: alpha ${next.toFixed(4)}, P ${got.P.toPrecision(6)}` }));
    if ((got.status === 'zero-winding') !== (cur.status === 'zero-winding')) { bracket = { a: alpha, xa: cur, b: next, xb: got }; break; }
    alpha = next; cur = got; h = Math.min(step, h * 2);
  }
  // Bisect the crossing until the bracket is narrower than tol, always restarting from the positive-P side.
  if (bracket) {
    let { a, xa, b, xb } = bracket; const aZero = xa.status === 'zero-winding';
    while (Math.abs(b - a) > tol) {
      const mid = (a + b) / 2, got = atAlpha(N, mid, (aZero ? xb : xa).x);
      if (!got.x) break;
      if ((got.status === 'zero-winding') === aZero) { a = mid; xa = got; } else { b = mid; xb = got; }
    }
    bracket = { a, xa, b, xb };
  }
  const side = r => r && { alpha: null, P: r.P, status: r.status, config: configOf(r.mdl, r.x), soscRatio: r.so.soscRatio, unstableShapeModes: r.cert.stability.unstableShapeModes };
  let threshold = null;
  if (bracket) {
    const lowSide = bracket.xa.status === 'zero-winding' ? { at: bracket.b, r: bracket.xb } : { at: bracket.a, r: bracket.xa };
    const zeroSide = bracket.xa.status === 'zero-winding' ? { at: bracket.a, r: bracket.xa } : { at: bracket.b, r: bracket.xb };
    threshold = { positive: { ...side(lowSide.r), alpha: lowSide.at }, zero: { ...side(zeroSide.r), alpha: zeroSide.at }, width: Math.abs(bracket.b - bracket.a),
      certified: lowSide.r.status === 'certified-local-minimum' && zeroSide.r.status === 'zero-winding' };
  }
  const dc = process.cpuUsage(c0), cpuSeconds = (dc.user + dc.system) / 1e6;
  const out = { experiment: 'vortex-threshold', protocol: PROTOCOL.version, N, fromAlpha: a0, toAlpha: to, source, step, tol,
    sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'), commit: process.env.GENCHASE_JOB_COMMIT || git(['rev-parse', 'HEAD']), machine: process.env.GENCHASE_MACHINE_SLUG || null,
    path: path_, end, threshold, compute: { wallSeconds: (Date.now() - t0) / 1000, cpuSeconds, energy: energy(cpuSeconds) }, runtime: runtimeCard(),
    scope: 'Continuation of one certified branch. The zero-winding threshold is an upper bound on the least alpha at which N vortices can collapse without rotating; other branches may reach zero at smaller alpha. Numerical, not a proof.' };
  const file = opt.out || path.join(root, 'run/vortex-collapse', `vortex-threshold-n${N}-a${a0}-to${to}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  if (process.env.GENCHASE_JOB_DIR) { const dest = path.join(process.env.GENCHASE_JOB_DIR, 'outputs/validation/results', path.basename(file)); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(file, dest); }
  console.log(threshold ? `N ${N}: zero winding between alpha ${threshold.positive.alpha.toFixed(6)} (P = ${threshold.positive.P.toExponential(3)}) and ${threshold.zero.alpha.toFixed(6)}${threshold.certified ? ', both sides certified' : ', NOT both certified'}.` : `N ${N}: no crossing between alpha ${a0} and ${to}${end ? ` (branch lost at ${end.alpha}: ${end.lost})` : ''}.`);
  console.log('Result: ' + path.relative(root, file));
  return out;
}
const defaultOut = (alpha, N, start, count) => path.join(root, 'run/vortex-collapse', `vortex-collapse-a${alpha}-n${N}-s${start}-c${count}.json`);

// ---------- independent re-verification of submitted files ----------
function verifyFiles(files, write) {
  const board = {}, rejected = [], thresholds = [], spent = { files: 0, seeds: 0, cpuSeconds: 0, wallSecondsWithoutCpuRecord: 0, measuredJoules: 0, filesMeasured: 0, machines: new Set() };
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (data.experiment === 'vortex-threshold') {
      // Threshold runs count toward the compute ledger like any other job.
      spent.files++; spent.machines.add(data.machine || 'unlabelled'); if (Number.isFinite(data.compute?.cpuSeconds)) spent.cpuSeconds += data.compute.cpuSeconds;
      verifyThreshold(f, data, thresholds, rejected); continue;
    }
    assert(data.experiment === 'vortex-collapse-search', f + ' is not a vortex-collapse result.');
    // Compute is as reported by the contributor's machine; it cannot be re-verified, only rerun.
    const c = data.summary?.compute; spent.files++; spent.seeds += data.results?.length || c?.seeds || 0; spent.machines.add(data.machine || 'unlabelled');
    if (Number.isFinite(c?.cpuSeconds)) spent.cpuSeconds += c.cpuSeconds; else spent.wallSecondsWithoutCpuRecord += Number(data.summary?.elapsedSeconds) || 0;
    if (Number.isFinite(c?.energy?.joules)) { spent.measuredJoules += c.energy.joules; spent.filesMeasured++; }
    const cell = (spent.byCase ||= {})[data.alpha + '/' + data.N] ||= { alpha: Number(data.alpha), N: Number(data.N), seeds: 0, cpuSeconds: 0, digests: [] };
    cell.seeds += data.results?.length || 0; cell.cpuSeconds += Number.isFinite(c?.cpuSeconds) ? c.cpuSeconds : Number(data.summary?.elapsedSeconds) || 0;
    if (data.summary?.resultsDigest && data.summary.seeds) cell.digests.push({ block: data.summary.seeds, digest: data.summary.resultsDigest, machine: data.machine || 'unlabelled', runtime: data.summary.runtime ? data.summary.runtime.cpuModel + ', ' + data.summary.runtime.node : null });
    const alpha = Number(data.alpha), N = Number(data.N); assert(Number.isFinite(alpha) && Number.isInteger(N) && N >= 3 && N <= 128, f + ': bad alpha or N.');
    const mdl = model(N, alpha), key = alpha + '/' + N;
    for (const m of data.minima || []) {
      // Trust only the submitted positions and circulations. Re-project, re-polish and re-certify here.
      let x; try { x = project(mdl, fromConfig(mdl, m.config)).x; } catch (e) { console.log(`${f}: rejected configuration (${e.message})`); rejected.push({ file: path.basename(f), P: m.P, reason: e.message }); continue; }
      const opt = minimize(mdl, x), so = secondOrder(mdl, opt.x), cert = certify(mdl, opt.x), status = certifiedStatus(so, cert), ok = !!status;
      const drift = Math.abs(cert.P - m.P) / Math.max(m.P, 1e-4);
      console.log(`${path.basename(f)} alpha=${alpha} N=${N}: claimed ${m.P} re-verified ${cert.P} (${ok ? 'certified' : 'NOT certified'}, drift ${drift.toExponential(2)})`);
      if (!ok || drift > 1e-8) { rejected.push({ file: path.basename(f), P: m.P, reason: ok ? 'value moved by ' + drift.toExponential(2) : 'certificate failed' }); continue; }
      const entry = board[key] ||= { alpha, N, best: null, minima: [], submissions: 0, reference: REFERENCE[String(alpha)]?.[N] ?? null };
      entry.submissions++;
      const hit = entry.minima.find(e => Math.abs(e.P - cert.P) < 1e-8 * cert.P);
      // Basin counts are as reported; anyone can reproduce them by rerunning the named seed block.
      const reported = Number.isInteger(m.basinSeeds) && m.basinSeeds > 0 ? m.basinSeeds : 0, block = data.summary?.seeds;
      if (hit) { hit.confirmations++; hit.reportedBasinSeeds += reported; hit.machines = [...new Set([...hit.machines, data.machine || 'unlabelled'])]; }
      else entry.minima.push({ P: cert.P, status, confirmations: 1, reportedBasinSeeds: reported, machines: [data.machine || 'unlabelled'], soscRatio: so.soscRatio,
        stability: { maxShapeExponent: cert.stability.maxShapeExponent, unstableShapeModes: cert.stability.unstableShapeModes, shapeExponents: cert.stability.shapeModes.map(q => q.exponent) },
        config: configOf(mdl, opt.x), commit: data.commit });
      if (block) entry.seedBlocks = [...(entry.seedBlocks || []), block].filter((b, i, all) => all.findIndex(o => o.start === b.start && o.count === b.count) === i);
      entry.minima.sort((a, b) => a.P - b.P); entry.best = entry.minima[0].P;
    }
  }
  const leaderboard = { experiment: 'vortex-collapse-leaderboard', protocol: PROTOCOL.version, generatedFrom: files.map(f => path.basename(f)).sort(),
    scope: 'Each entry was re-projected, re-polished and re-certified from submitted positions and circulations only. Numerical candidates; priority unconfirmed.',
    entries: Object.values(board).sort((a, b) => a.alpha - b.alpha || a.N - b.N), thresholds: thresholds.sort((a, b) => a.fromAlpha - b.fromAlpha || a.N - b.N || a.zeroAlpha - b.zeroAlpha), rejected };
  const busy = spent.cpuSeconds + spent.wallSecondsWithoutCpuRecord;
  // The same seed block run twice must give the same digest on the same protocol; list any block that disagreed.
  const byCase = Object.values(spent.byCase || {}).map(c => { const seen = {}, disagreements = [];
    for (const d of c.digests) { const k = d.block.start + '+' + d.block.count; if (seen[k] && seen[k].digest !== d.digest) disagreements.push({ block: d.block, a: seen[k], b: d }); seen[k] ||= d; }
    return { alpha: c.alpha, N: c.N, seeds: c.seeds, cpuHours: c.cpuSeconds / 3600, independentReruns: c.digests.length - Object.keys(seen).length, disagreements }; }).sort((a, b) => a.alpha - b.alpha || a.N - b.N);
  delete spent.byCase;
  leaderboard.compute = { ...spent, machines: spent.machines.size, cpuHours: busy / 3600, byCase,
    estimatedWattHours: [busy * WATTS_PER_BUSY_CORE[0] / 3600, busy * WATTS_PER_BUSY_CORE[1] / 3600],
    method: `As reported by each submission. CPU time is measured by the job; files without a CPU record count their single-threaded wall time. Energy is an estimate of ${WATTS_PER_BUSY_CORE[0]} to ${WATTS_PER_BUSY_CORE[1]} W per busy core unless a file measured it.` };
  console.log(`Compute: ${spent.seeds} seeds in ${spent.files} files from ${spent.machines.size} machine label(s), ${(busy / 3600).toFixed(3)} CPU hours, about ${leaderboard.compute.estimatedWattHours.map(v => v.toFixed(2)).join(' to ')} Wh estimated.`);
  for (const e of leaderboard.entries) console.log(`alpha ${e.alpha}, N ${e.N}: best ${e.best} over ${e.minima.length} distinct minima${e.reference ? ', reference ' + e.reference : ''}`);
  console.log(table(leaderboard));
  if (write) { const file = path.join(root, 'experiments/results/vortex-collapse-leaderboard.json'); fs.writeFileSync(file, JSON.stringify(leaderboard, null, 1) + '\n'); console.log('Wrote ' + path.relative(root, file)); }
  return leaderboard;
}

function table(board) {
  const fmt = v => v === null || v === undefined ? '' : v.toFixed(10);
  const rows = board.entries.map(e => { const m = e.minima[0], seeds = (e.seedBlocks || []).reduce((a, b) => a + b.count, 0);
    return `| ${e.alpha} | ${e.N} | ${fmt(e.best)} | ${m.reportedBasinSeeds} of ${seeds} | ${e.minima.length} (${e.minima.map(q => fmt(q.P)).join(', ')}) | ${m.stability.maxShapeExponent.toFixed(2)} | ${m.stability.unstableShapeModes} | ${fmt(e.reference)} |`; });
  return ['| α | N | Least certified P | Seeds ending there | Distinct certified minima | Largest shape exponent k | Unstable shape modes | Independent reference |', '|---:|---:|---:|---:|---|---:|---:|---:|', ...rows].join('\n');
}

// A threshold is re-derived from its two configurations alone: the low side must re-certify as a strict local minimum
// with P > 0 at its alpha, and the high side as a zero-winding collapse at its alpha.
function verifyThreshold(f, data, thresholds, rejected) {
  const t = data.threshold, N = Number(data.N), name = path.basename(f);
  if (!t) return;
  const check = (sideData, want) => { const mdl = model(N, Number(sideData.alpha)); let x; try { x = project(mdl, fromConfig(mdl, sideData.config), 200, false).x; } catch (e) { return { ok: false, why: e.message }; }
    const opt = minimize(mdl, x), so = secondOrder(mdl, opt.x), cert = certify(mdl, opt.x), status = certifiedStatus(so, cert);
    return { ok: status === want && (want === 'zero-winding' || cert.P > ZERO_WINDING), P: cert.P, status }; };
  const lo = check(t.positive, 'certified-local-minimum'), hi = check(t.zero, 'zero-winding');
  const ok = lo.ok && hi.ok && Math.abs(t.zero.alpha - t.positive.alpha) <= 2 * (data.tol || 1e-4) + 1e-12;
  console.log(`${name} N=${N}: zero winding between alpha ${t.positive.alpha} and ${t.zero.alpha}: ${ok ? 'certified' : 'NOT certified'} (low ${lo.status}, high ${hi.status})`);
  if (!ok) { rejected.push({ file: name, reason: 'threshold did not re-certify' }); return; }
  thresholds.push({ N, fromAlpha: data.fromAlpha, positiveAlpha: t.positive.alpha, zeroAlpha: t.zero.alpha, machine: data.machine || 'unlabelled', commit: data.commit });
}

function thresholdTable(board) {
  const rows = (board.thresholds || []).map(t => `| ${t.fromAlpha} | ${t.N} | ${t.positiveAlpha.toFixed(6)} | ${t.zeroAlpha.toFixed(6)} |`);
  return ['| Family grown at α | N | Last α with P > 0 (certified) | First α with P = 0 (certified) |', '|---:|---:|---:|---:|', ...rows].join('\n');
}

// ---------- controls: each must be able to fail ----------
function controls() {
  const report = {};
  // 1. Analytic Jacobian against central differences.
  { const mdl = model(5, 0.7), u = rng('controls/jacobian'), x = Float64Array.from({ length: mdl.n }, () => gauss(u)), r = mdl.residual(x, true); let err = 0;
    for (let i = 0; i < mdl.n; i++) { const h = 1e-6, a = Float64Array.from(x), b = Float64Array.from(x); a[i] += h; b[i] -= h; const ca = mdl.residual(a).c, cb = mdl.residual(b).c; for (let k = 0; k < mdl.m; k++) err = Math.max(err, Math.abs((ca[k] - cb[k]) / (2 * h) - r.J[k][i]) / (1 + Math.abs(r.J[k][i]))); }
    assert(err < 1e-6, 'Jacobian mismatch ' + err); report.jacobian = { maxRelativeError: err }; }
  // 1a. Energy counter arithmetic, including one wrap of the RAPL register.
  { const joules = energyBetween([{ uj: 900, max: 1000 }, { uj: 10, max: 5000 }], [{ uj: 100, max: 1000 }, { uj: 4010, max: 5000 }]);
    assert(Math.abs(joules - 0.0042) < 1e-15, 'energy counter arithmetic ' + joules); assert(energyBetween(null, []) === null);
    report.energyCounter = { wrappedJoules: joules }; }
  // 1b. Eigenvalues of a companion matrix with known roots 1, 2, 3 and -1 +/- 2i.
  { const coeffs = [-30, 43, -14, 4, -4], n = 5, C = zeros(n, n); for (let i = 1; i < n; i++) C[i][i - 1] = 1; for (let i = 0; i < n; i++) C[i][n - 1] = -coeffs[i];
    const got = eigenvalues(C), want = [[1, 0], [2, 0], [3, 0], [-1, 2], [-1, -2]], err = Math.max(...want.map(w => Math.min(...got.map(g => Math.hypot(g[0] - w[0], g[1] - w[1])))));
    assert(err < 1e-10, 'eigenvalue solver error ' + err); report.eigenvalues = { maxError: err }; }
  // 2. Three vortices: the winding from kappa must match the closed form P = |S| / (8 A), with the
  //    coth of beta log side ratios, on random collapse configurations, and stay above the infimum.
  report.threeVortex = [];
  for (const alpha of [-0.5, 0, 1, 2]) {
    const mdl = model(3, alpha), beta = 1 + alpha / 2, u = rng('controls/three/' + alpha); let worst = 0, lowest = Infinity, samples = 0;
    for (let t = 0; t < 60 && samples < 12; t++) {
      const x0 = Float64Array.from({ length: mdl.n }, () => gauss(u)), pr = project(mdl, x0, 200, false);
      if (pr.feasibility > 1e-12 || degenerate(mdl, pr.x)) continue;
      const { z } = mdl.unpack(pr.x), side = (i, j) => Math.hypot(z[i][0] - z[j][0], z[i][1] - z[j][1]), r = [side(1, 2), side(2, 0), side(0, 1)];
      const A = Math.abs((z[1][0] - z[0][0]) * (z[2][1] - z[0][1]) - (z[2][0] - z[0][0]) * (z[1][1] - z[0][1])) / 2;
      const S = [0, 1, 2].reduce((s, i) => s + r[i] ** 2 / Math.tanh(beta * Math.log(r[(i + 2) % 3] / r[(i + 1) % 3])), 0);
      const closed = Math.abs(S) / (8 * A), P = Math.sqrt(mdl.objective(pr.x));
      worst = Math.max(worst, Math.abs(closed - P) / P); lowest = Math.min(lowest, P); samples++;
    }
    assert(samples >= 6 && worst < 1e-9, `three-vortex closed form mismatch at alpha ${alpha}: ${worst}`);
    assert(lowest > infimum3(alpha), 'three-vortex sample below the proved infimum');
    report.threeVortex.push({ alpha, samples, maxRelativeError: worst, lowest, infimum: infimum3(alpha) });
  }
  // 3. Four vortices: the recorded minima are found again from seeds, certified to second order and
  //    confirmed by direct integration; a wrong exponent and a wrong winding formula must both fail.
  report.fourVortex = [];
  for (const [alpha, seeds] of [[0, 40], [1, 40], [2, 40]]) {
    const results = []; for (let s = 0; s < seeds; s++) results.push(searchSeed(alpha, 4, s));
    const minima = distinct(results), ref = REFERENCE[String(alpha)][4], hit = minima.find(m => Math.abs(m.P - ref) < 1e-8);
    assert(hit, `alpha ${alpha}: recorded four-vortex minimum ${ref} not recovered; found ${minima.map(m => m.P).join(', ')}`);
    assert(minima[0].P > ref - 1e-8, `alpha ${alpha}: a four-vortex value below the record needs review: ${minima[0].P}`);
    const mdl = model(4, alpha), x = fromConfig(mdl, hit.config), cert = certify(mdl, x), broken = stability(mdl, x, 1e-2);
    assert(Object.values(cert.checks).every(Boolean), `alpha ${alpha}: recovered minimum failed its certificate ` + JSON.stringify(cert.checks));
    assert(Math.max(broken.pairingError, broken.trivialModeError) > 1e-4, 'a non-Hamiltonian defect passed the symmetry and pairing checks');
    const badExponent = certify(mdl, x, { wrongExponent: 0.1 }), badWinding = certify(mdl, x, { wrongWinding: 2 });
    assert(!badExponent.checks.ode && !badWinding.checks.ode, 'ODE control failed to reject a wrong law');
    const shifted = model(4, alpha + 0.05), shiftedFeas = feasibility(shifted.residual(x));
    assert(shiftedFeas > 1e-4, 'a shifted kernel exponent still satisfies the similarity equations');
    report.fourVortex.push({ alpha, seeds, recovered: hit.P, reference: ref, basinSeeds: hit.basinSeeds, distinctMinima: minima.map(m => m.P),
      ode: cert.ode, invariants: cert.invariants, stability: { exponents: cert.stability.shapeModes.map(m => m.exponent), trivialModeError: cert.stability.trivialModeError, pairingError: cert.stability.pairingError },
      rejected: { defectModeError: Math.max(broken.pairingError, broken.trivialModeError),  exponentShapeError: badExponent.ode.shapeError, doubledWindingError: badWinding.ode.windingError, shiftedKernelFeasibility: shiftedFeas } });
  }
  // 4. Submitted files are re-derived from positions alone: a rotated, rescaled, relabelled-circulation copy verifies; a
  //    perturbed one does not certify at the claimed value.
  { const alpha = 1, mdl = model(4, alpha), best = report.fourVortex.find(f => f.alpha === alpha), results = []; for (let s = 0; s < 40; s++) results.push(searchSeed(alpha, 4, s));
    const m = distinct(results).find(q => Math.abs(q.P - best.recovered) < 1e-8), c = Math.cos(0.7) * 3, s = Math.sin(0.7) * 3;
    const moved = { z: m.config.z.map(([x, y]) => [c * x - s * y + 2, s * x + c * y - 1]), G: m.config.G.map(g => -2.5 * g), kappa: [0, 0] };
    const tmp = path.join(require('node:os').tmpdir(), 'vortex-control-' + process.pid + '.json');
    const bad = { z: m.config.z.map(([x, y], i) => i === 3 ? [x + 1e-3, y] : [x, y]), G: m.config.G, kappa: [0, 0] };
    fs.writeFileSync(tmp, JSON.stringify({ experiment: 'vortex-collapse-search', alpha, N: 4, machine: 'control', minima: [{ P: m.P, config: moved }, { P: m.P * 0.9, config: bad }] }));
    const log = console.log; console.log = () => {}; let board; try { board = verifyFiles([tmp], false); } finally { console.log = log; fs.unlinkSync(tmp); }
    const e = board.entries[0]; assert(e && e.minima.length === 1 && Math.abs(e.best - m.P) < 1e-9, 'resubmission check failed');
    report.resubmission = { accepted: e.best, rejectedClaim: m.P * 0.9 }; }
  // 5. The recorded zero-winding collapse (alpha = 2, N = 11) re-verifies from positions alone, with P = 0.
  { const f = path.join(root, 'experiments/results/vortex-collapse/vortex-grow-a2-n11-s0-c12.json');
    if (fs.existsSync(f)) { const log = console.log; console.log = () => {}; let b; try { b = verifyFiles([f], false); } finally { console.log = log; }
      const e = b.entries[0]; assert(e && e.best < ZERO_WINDING && e.minima[0].status === 'zero-winding' && !b.rejected.length, 'zero-winding collapse did not re-verify');
      const mdl = model(11, 2.05), x = fromConfig(mdl, e.minima[0].config); assert(feasibility(mdl.residual(x)) > 1e-4, 'zero-winding point also solves a shifted kernel');
      report.zeroWinding = { P: e.best, status: e.minima[0].status }; } }
  report.passed = true;
  return report;
}
// Controls that need worker threads or take a few seconds; awaited separately by the CLI.
async function asyncControls(report) {
  // 6. Threads change speed, never results: the same seed block on one and on three threads has one digest.
  { const one = [], three = [], seeds = [0, 1, 2, 3, 4, 5], spec = { kind: 'search', alpha: 1, N: 4 };
    await mapSeeds(spec, seeds, 1, r => one.push(r)); await mapSeeds(spec, seeds, 3, r => three.push(r));
    const order = rs => rs.slice().sort((a, b) => a.seed - b.seed), d1 = digest(order(one)), d3 = digest(order(three));
    assert.equal(d1, d3, 'thread count changed the results'); report.threads = { digest: d1 }; }
  // 7. Continuation brackets the zero-winding threshold of a recorded SQG branch, both sides certified.
  { const f = path.join(root, 'experiments/results/vortex-collapse/vortex-grow-a1-n12-s0-c10.json');
    if (fs.existsSync(f)) { const log = console.log; console.log = () => {}; let t;
      try { t = (await continueAlpha({ from: f, to: 2.5, step: 0.1, tol: 1e-3, out: path.join(require('node:os').tmpdir(), 'vortex-threshold-control-' + process.pid + '.json') })).threshold; } finally { console.log = log; }
      assert(t && t.certified && t.width <= 1e-3 + 1e-12 && t.zero.P < ZERO_WINDING && t.positive.P > 0, 'continuation did not bracket a certified threshold');
      report.threshold = { N: 12, positiveAlpha: t.positive.alpha, zeroAlpha: t.zero.alpha }; } }
  return report;
}

function parse(argv) {
  const o = { alpha: 0, N: 4, start: 0, count: 10, threads: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--controls') o.controls = true;
    else if (a === '--write') o.write = true;
    else if (a === '--verify') { o.verify = argv.slice(i + 1).filter(f => !f.startsWith('--')); o.write = argv.includes('--write'); o.strict = argv.includes('--strict'); break; }
    else if (a === '--refresh') o.refresh = true;
    else if (a === '--grow') o.grow = true;
    else if (a === '--continue') o.continue = true;
    else if (a === '--compact') { o.compact = argv.slice(i + 1); break; }
    else if (['--alpha', '--n', '--start', '--count', '--out', '--from', '--threads', '--to', '--step', '--tol'].includes(a) && argv[i + 1] !== undefined) { const v = argv[++i]; if (a === '--out' || a === '--from') o[a.slice(2)] = path.resolve(v); else o[{ '--alpha': 'alpha', '--n': 'N', '--start': 'start', '--count': 'count', '--threads': 'threads', '--to': 'to', '--step': 'step', '--tol': 'tol' }[a]] = Number(v); }
    else throw Error('Unknown option ' + a);
  }
  if (!(Number.isInteger(o.threads) && o.threads >= 1 && o.threads <= 256)) throw Error('--threads must be an integer from 1 to 256.');
  if (o.continue) {
    if (!o.from && !(Number.isFinite(o.alpha) && Number.isInteger(o.N))) throw Error('--continue needs --from file.json, or --alpha and --n of a leaderboard entry.');
    if (!(Number.isFinite(o.to) && o.to > -2 && o.to <= 3)) throw Error('--to must lie in (-2, 3].');
    if (o.step !== undefined && !(o.step > 0 && o.step <= 0.5)) throw Error('--step must lie in (0, 0.5].');
    if (o.tol !== undefined && !(o.tol >= 1e-8 && o.tol <= 0.1)) throw Error('--tol must lie in [1e-8, 0.1].');
    return o;
  }
  if (!o.controls && !o.verify && !o.refresh && !o.compact) {
    if (!(Number.isFinite(o.alpha) && o.alpha > -2 && o.alpha <= 3)) throw Error('--alpha must lie in (-2, 3].');
    if (!(Number.isInteger(o.N) && o.N >= 3 && o.N <= (o.grow ? 128 : 16))) throw Error(o.grow ? '--n must be an integer up to 128.' : '--n must be an integer from 3 to 16.');
    if (!(Number.isInteger(o.start) && o.start >= 0 && o.start < 2 ** 31) || !(Number.isInteger(o.count) && o.count >= 1 && o.count <= 1e6)) throw Error('--start and --count must be non-negative integers.');
  }
  return o;
}
module.exports = { PROTOCOL, REFERENCE, growSeed, runSeed, mapSeeds, continueAlpha, verifyThreshold, compact, sources, model, project, minimize, certify, stability, eigenvalues, secondOrder, searchSeed, fromConfig, distinct, verifyFiles, controls, infimum3 };
if (!isMainThread && workerData?.vortexWorker) parentPort.on('message', seed => parentPort.postMessage(runSeed(workerData.spec, seed)));
else if (require.main === module) {
  const o = parse(process.argv.slice(2));
  if (o.controls) asyncControls(controls()).then(r => console.log(JSON.stringify(r, null, 1))).catch(e => { console.error(e.stack || e.message); process.exitCode = 1; });
  else if (o.verify) { const b = verifyFiles(o.verify, o.write); if (o.strict && b.rejected.length) { console.error('Rejected: ' + JSON.stringify(b.rejected)); process.exitCode = 1; } }
  else if (o.refresh) refresh();
  else if (o.compact) { const [from, to] = o.compact; fs.mkdirSync(path.dirname(path.resolve(to)), { recursive: true }); fs.writeFileSync(to, JSON.stringify(compact(JSON.parse(fs.readFileSync(from, 'utf8'))), null, 1) + '\n'); }
  else if (o.continue) continueAlpha(o).catch(e => { console.error(e.message); process.exitCode = 1; });
  else if (o.grow) grow(o).catch(e => { console.error(e.message); process.exitCode = 1; });
  else run(o).catch(e => { console.error(e.message); process.exitCode = 1; });
}
