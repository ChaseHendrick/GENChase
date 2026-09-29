/* Exact finite-size expectations for the arctic readouts.
   Aztec polar fraction: Johansson, Ann. Probab. 33 (2005), the Krawtchouk ensemble.
   Lozenge free area: Johansson, PTRF 123 (2002), Theorem 4.1, the Hahn ensemble.
   The algebra is the one in research/arctic-finite-size/. This file is the same
   calculation in plain float64 so a plate can be compared with the expectation at
   its own size, not only with the limit. tools/arctic-exact-check.js holds it to
   the values that folder already computed. */
(function (root) {
  'use strict';

  function krawtchouk(N) {
    const diag = new Float64Array(N + 1), off = new Float64Array(N);
    for (let k = 0; k <= N; k++) diag[k] = 0.5 * N;
    for (let k = 1; k <= N; k++) off[k - 1] = 0.5 * Math.sqrt(k * (N - k + 1));
    return { diag, off };
  }

  function hahn(N, alpha, beta) {
    const aK = beta, bK = alpha, s = aK + bK;
    const diag = new Float64Array(N + 1), off = new Float64Array(Math.max(0, N));
    const A = new Float64Array(N + 1), C = new Float64Array(N + 1);
    for (let k = 0; k <= N; k++) {
      const den1 = (2 * k + s + 1) * (2 * k + s + 2);
      A[k] = den1 === 0 ? 0 : (k + s + 1) * (k + aK + 1) * (N - k) / den1;
      const den2 = (2 * k + s) * (2 * k + s + 1);
      C[k] = k === 0 || den2 === 0 ? 0 : k * (k + s + N + 1) * (k + bK) / den2;
      diag[k] = A[k] + C[k];
    }
    for (let k = 0; k < N; k++) off[k] = Math.sqrt(Math.max(0, A[k] * C[k + 1]));
    return { diag, off };
  }

  // Inverse iteration for the eigenvector of a known eigenvalue of a symmetric tridiagonal.
  // The Krawtchouk and Hahn supports are exactly the integers, one apart, so one shifted solve is enough.
  function eigenvector(diag, off, lambda) {
    const n = diag.length;
    const v = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = 1;
    const sigma = lambda + 1e-12 * Math.max(1, n);
    for (let pass = 0; pass < 2; pass++) {
      const cp = new Float64Array(n), dp = new Float64Array(n);
      let den = diag[0] - sigma;
      if (Math.abs(den) < 1e-18) den = den < 0 ? -1e-18 : 1e-18;
      if (n > 1) cp[0] = off[0] / den;
      dp[0] = v[0] / den;
      for (let i = 1; i < n - 1; i++) {
        den = diag[i] - sigma - off[i - 1] * cp[i - 1];
        if (Math.abs(den) < 1e-18) den = den < 0 ? -1e-18 : 1e-18;
        cp[i] = off[i] / den;
        dp[i] = (v[i] - off[i - 1] * dp[i - 1]) / den;
      }
      if (n > 1) {
        den = diag[n - 1] - sigma - off[n - 2] * cp[n - 2];
        if (Math.abs(den) < 1e-18) den = den < 0 ? -1e-18 : 1e-18;
        dp[n - 1] = (v[n - 1] - off[n - 2] * dp[n - 2]) / den;
        v[n - 1] = dp[n - 1];
        for (let i = n - 2; i >= 0; i--) v[i] = dp[i] - cp[i] * v[i + 1];
      } else v[0] = dp[0];
      let nrm = 0;
      for (let i = 0; i < n; i++) nrm += v[i] * v[i];
      nrm = Math.sqrt(nrm);
      if (!(nrm > 0)) return v;
      for (let i = 0; i < n; i++) v[i] /= nrm;
    }
    return v;
  }

  function forward(L, b) {
    const m = b.length, y = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      let s = b[i];
      for (let j = 0; j < i; j++) s -= L[i][j] * y[j];
      y[i] = s / L[i][i];
    }
    return y;
  }

  // E[max] of the M-point ensemble. Sites are 0..N. Only a window near the top is formed.
  function expectedMax(diag, off, M) {
    const N = diag.length - 1;
    if (M <= 0) return 0;
    if (M > N) return N;
    const leadN = M;
    const leadDiag = diag.subarray(0, leadN);
    const leadOff = off.subarray(0, Math.max(0, leadN - 1));
    let zmax = leadDiag[leadN - 1];
    if (leadN > 1) {
      // The largest eigenvalue of the leading block is the largest zero of p_M.
      // A few QR steps on the leading block are not required: the support bound used
      // below only places the window, and the window is raised until its top is empty.
      zmax = leadDiag[0];
      for (let i = 1; i < leadN; i++) if (leadDiag[i] > zmax) zmax = leadDiag[i];
      // Gershgorin on the last row is a safe upper bound.
      zmax = leadDiag[leadN - 1] + Math.abs(leadOff[leadN - 2]);
    }
    const margin = 20 + 20 * Math.pow(N + 1, 1 / 3);
    let hi = Math.min(N, Math.ceil(zmax + margin));
    let lo = 0;
    const PhiCols = new Map();
    function column(x) {
      let v = PhiCols.get(x);
      if (!v) { v = eigenvector(diag, off, x); PhiCols.set(x, v); }
      return v;
    }
    function kdAt(x) {
      const v = column(x);
      let s = 0;
      const m = Math.min(M, v.length);
      for (let k = 0; k < m; k++) s += v[k] * v[k];
      return s;
    }
    const skip = 1e-32;
    while (hi < N && kdAt(hi) > skip) hi = Math.min(N, hi + Math.ceil(margin));
    let W = 64;
    let D;
    while (true) {
      lo = Math.max(0, hi + 1 - W);
      let top = lo;
      for (let x = lo; x <= hi; x++) if (kdAt(x) > skip) top = x;
      D = gap(M, lo, top, column, N);
      if (D[lo] < 1e-30 || lo === 0) break;
      W *= 2;
    }
    let e = 0;
    for (let t = 1; t <= N; t++) e += 1 - (D[t] || 0);
    return e;
  }

  function gap(M, lo, top, column, N) {
    const D = new Float64Array(N + 2);
    for (let t = top + 1; t <= N + 1; t++) D[t] = 1;
    if (M === 0) { for (let t = 0; t <= N + 1; t++) D[t] = 1; return D; }
    let det = 1, cols = [];
    let L = [];
    for (let t = top; t >= lo; t--) {
      const vt = column(t);
      const f = new Float64Array(M);
      for (let k = 0; k < M; k++) f[k] = vt[k];
      let y;
      if (cols.length) {
        const kvec = new Float64Array(cols.length);
        for (let j = 0; j < cols.length; j++) {
          const vs = column(cols[j]);
          let dot = 0;
          for (let k = 0; k < M; k++) dot += vs[k] * f[k];
          kvec[j] = -dot;
        }
        y = forward(L, kvec);
      } else y = new Float64Array(0);
      let ff = 0;
      for (let k = 0; k < M; k++) ff += f[k] * f[k];
      let yy = 0;
      for (let j = 0; j < y.length; j++) yy += y[j] * y[j];
      let piv = (1 - ff) - yy;
      if (piv < 0) piv = 0;
      det *= piv;
      D[t] = det;
      if (det < 1e-30) break;
      const n0 = cols.length;
      const newL = [];
      for (let i = 0; i <= n0; i++) newL[i] = new Float64Array(n0 + 1);
      for (let i = 0; i < n0; i++) for (let j = 0; j <= i; j++) newL[i][j] = L[i][j];
      for (let j = 0; j < n0; j++) newL[n0][j] = y[j];
      newL[n0][n0] = Math.sqrt(piv);
      L = newL;
      cols.push(t);
    }
    return D;
  }

  const polarCache = new Map();
  function polarFraction(n) {
    n = n | 0;
    if (polarCache.has(n)) return polarCache.get(n);
    const J = krawtchouk(n);
    let s = 0;
    for (let r = 1; r <= n; r++) s += n - expectedMax(J.diag, J.off, r);
    const q = (4 / (n * (n + 1))) * s;
    polarCache.set(n, q);
    return q;
  }

  function hahnParams(a, b, c, m) {
    const al = m <= b ? -m : m - 2 * b;
    const be = m <= a ? m + 2 * (c - 1) : 2 * a - m + 2 * (c - 1);
    const g = (be - al) / 2;
    return { g, L: g + 1 - c };
  }

  function F(a, b, c) {
    let s = 0;
    for (let m = 1; m <= a; m++) {
      const p = hahnParams(a, b, c, m);
      if (p.L <= 0) continue;
      const J = hahn(p.g, Math.abs(a - m), Math.abs(b - m));
      s += p.g - expectedMax(J.diag, J.off, p.L);
    }
    return s;
  }

  const freeCache = new Map();
  function freeFraction(a, b, c) {
    a |= 0; b |= 0; c |= 0;
    const key = a + ',' + b + ',' + c;
    if (freeCache.has(key)) return freeCache.get(key);
    const denom = a * b + b * c + c * a;
    const q = 1 - 2 * (F(a, c, b) + F(b, a, c) + F(a, b, c)) / denom;
    freeCache.set(key, q);
    return q;
  }

  const api = { polarFraction, freeFraction };
  root.ArcticExact = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
