/* The shared uncertainty harness. Every measured number the studio prints against theory gets its
   error bar from here, in the browser and in the Node tools alike, so there is one method per kind of
   number instead of one per tab. AGENTS.md ("A measured number carries an error bar") says which method
   fits which number; tools/lint.js enforces that printed comparisons go through compare().

   Conventions. tau_int = 1/2 + sum_{t>=1} rho(t), so an uncorrelated series has tau_int = 1/2 and the
   effective sample size is n / (2 tau_int). Every resampling draw comes from a seeded generator, so an
   error bar reprints with its plate. */
(function (root) {
  'use strict';

  function mean(x) { let s = 0; for (let i = 0; i < x.length; i++) s += x[i]; return x.length ? s / x.length : NaN; }
  function variance(x) {
    const n = x.length; if (n < 2) return NaN;
    const m = mean(x); let s = 0;
    for (let i = 0; i < n; i++) { const d = x[i] - m; s += d * d; }
    return s / (n - 1);
  }
  const sd = x => Math.sqrt(variance(x));

  // Small seeded generator (mulberry32) for resampling when the caller has no Studio.util.makeRng.
  function seeded(seed) {
    let h = 1779033703 ^ String(seed).length;
    for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rngOf = opts => (opts && typeof opts.rng === 'function') ? opts.rng : seeded((opts && opts.seed) || 'genchase-stats');

  /* ---- a correlated time series ---- */
  // Normalized autocorrelation rho(t) for t = 0..maxLag, by direct sums.
  function autocorr(x, maxLag) {
    const n = x.length, m = mean(x);
    let c0 = 0;
    for (let i = 0; i < n; i++) { const d = x[i] - m; c0 += d * d; }
    const L = Math.min(maxLag, n - 1), rho = new Float64Array(L + 1);
    rho[0] = 1;
    if (!(c0 > 0)) return rho;
    for (let t = 1; t <= L; t++) {
      let s = 0;
      for (let i = 0; i + t < n; i++) s += (x[i] - m) * (x[i + t] - m);
      rho[t] = s / c0;
    }
    return rho;
  }
  // Integrated autocorrelation time with Sokal's automatic window: the smallest W with W >= c tau(W).
  // Lags are computed one at a time and stop at the window, so the cost is O(n W), not O(n^2).
  // reliable is false when the series is shorter than 50 tau, where the estimate itself is poor.
  function tauInt(x, opts) {
    const c = (opts && opts.c) || 5, n = x.length;
    if (n < 4) return { tau: NaN, window: 0, n, reliable: false };
    const m = mean(x), d = new Float64Array(n);
    let c0 = 0;
    for (let i = 0; i < n; i++) { d[i] = x[i] - m; c0 += d[i] * d[i]; }
    let tau = 0.5, W = 0;
    if (c0 > 0) {
      const maxLag = Math.floor(n / 2);
      for (let t = 1; t <= maxLag; t++) {
        let s = 0;
        for (let i = 0; i + t < n; i++) s += d[i] * d[i + t];
        tau += s / c0;
        W = t;
        if (t >= c * tau) break;
      }
    }
    tau = Math.max(0.5, tau);
    return { tau, window: W, n, reliable: n >= 50 * tau };
  }
  // Mean of a correlated series with its standard error from tau_int.
  function seriesMean(x, opts) {
    const n = x.length, m = mean(x), v = variance(x), t = tauInt(x, opts);
    const nEff = n / (2 * t.tau);
    return { mean: m, se: Math.sqrt(v / nEff), tau: t.tau, window: t.window, n, nEff, reliable: t.reliable };
  }
  // Flyvbjerg-Petersen blocking: halve the series repeatedly and recompute the naive error of the block
  // means. The estimate rises while blocks are shorter than the correlation time and then levels off.
  // The reported se is the largest among levels that keep at least 32 blocks: conservative by design.
  function blocking(x) {
    let y = Array.from(x), size = 1;
    const levels = [];
    while (y.length >= 4) {
      const n = y.length, se = Math.sqrt(variance(y) / n);
      levels.push({ blockSize: size, blocks: n, se, seErr: se / Math.sqrt(2 * (n - 1)) });
      const next = [];
      for (let i = 0; i + 1 < n; i += 2) next.push(0.5 * (y[i] + y[i + 1]));
      y = next; size *= 2;
    }
    const usable = levels.filter(l => l.blocks >= 32);
    const se = usable.length ? Math.max(...usable.map(l => l.se)) : NaN;
    return { mean: mean(x), se, levels };
  }
  // Moving-block bootstrap of any statistic of a series. Blocks are drawn circularly, so every point is
  // equally likely to appear. The default block length is the larger of 2 tau_int and n^(1/3).
  function blockBootstrap(x, stat, opts) {
    const n = x.length, rng = rngOf(opts), reps = (opts && opts.reps) || 400;
    const b = Math.max(1, Math.min(n, Math.round((opts && opts.blockSize) || Math.max(2 * tauInt(x).tau, Math.cbrt(n)))));
    const est = stat(Array.from(x)), draws = new Float64Array(reps), buf = new Array(n);
    for (let r = 0; r < reps; r++) {
      let k = 0;
      while (k < n) {
        const start = Math.floor(rng() * n);
        for (let j = 0; j < b && k < n; j++) buf[k++] = x[(start + j) % n];
      }
      draws[r] = stat(buf);
    }
    const sorted = Array.from(draws).filter(Number.isFinite).sort((p, q) => p - q);
    const q = f => sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(f * (sorted.length - 1))))] : NaN;
    return { estimate: est, se: sd(sorted), lo: q(0.025), hi: q(0.975), reps: sorted.length, blockSize: b };
  }

  /* ---- a correlated field ---- */
  // Averaged autocorrelation along rows (dir 'x') or columns ('y') of a W x H field, over up to 64
  // evenly spaced lines, with the field's global mean removed.
  function lineAutocorr(at, W, H, dir, maxLag, m) {
    const lines = dir === 'x' ? H : W, len = dir === 'x' ? W : H, L = Math.min(maxLag, len - 1);
    const pick = Math.min(64, lines), num = new Float64Array(L + 1), cnt = new Float64Array(L + 1);
    const line = new Float64Array(len);
    for (let q = 0; q < pick; q++) {
      const k = Math.floor((q + 0.5) * lines / pick);
      for (let i = 0; i < len; i++) line[i] = (dir === 'x' ? at(k * W + i) : at(i * W + k)) - m;
      for (let t = 0; t <= L; t++) { let s = 0; for (let i = 0; i + t < len; i++) s += line[i] * line[i + t]; num[t] += s; cnt[t] += len - t; }
    }
    const rho = new Float64Array(L + 1), c0 = num[0] / cnt[0];
    for (let t = 0; t <= L; t++) rho[t] = c0 > 0 ? (num[t] / cnt[t]) / c0 : (t ? 0 : 1);
    return rho;
  }
  function windowTau(rho, c) {
    let tau = 0.5, W = 0;
    for (let t = 1; t < rho.length; t++) { tau += rho[t]; W = t; if (t >= c * tau) break; }
    return { tau: Math.max(0.5, tau), window: W };
  }
  // Mean of one W x H field with an honest standard error. Cells in one field are correlated, so the
  // naive sd / sqrt(W H) is too small. The effective number of independent cells is taken as
  // N / (2 tau_x)(2 tau_y), with tau_x and tau_y the integrated autocorrelation lengths along rows and
  // columns (Sokal window). That is exact for separable correlations and a close approximation for
  // smooth isotropic ones. reliable is false when either side spans fewer than 20 correlation lengths.
  // seTiles, from the scatter of 8 x 8 tile means, is a cross-check that needs no model of the correlation.
  function fieldMean(values, W, H, opts) {
    const at = (opts && opts.at) || (i => values[i]), c = (opts && opts.c) || 5, N = W * H;
    let s = 0, s2 = 0;
    for (let i = 0; i < N; i++) { const v = at(i); s += v; s2 += v * v; }
    const m = s / N, v = Math.max(0, (s2 - N * m * m) / (N - 1));
    const lag = Math.max(8, Math.floor(Math.min(W, H) / 4));
    const tx = windowTau(lineAutocorr(at, W, H, 'x', lag, m), c), ty = windowTau(lineAutocorr(at, W, H, 'y', lag, m), c);
    const nEff = N / (4 * tx.tau * ty.tau);
    let seTiles = NaN;
    if (W >= 8 && H >= 8) {
      const means = [];
      for (let qy = 0; qy < 8; qy++) for (let qx = 0; qx < 8; qx++) {
        const x0 = Math.floor(qx * W / 8), x1 = Math.floor((qx + 1) * W / 8), y0 = Math.floor(qy * H / 8), y1 = Math.floor((qy + 1) * H / 8);
        let a = 0, k = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { a += at(y * W + x); k++; }
        means.push(a / k);
      }
      seTiles = Math.sqrt(variance(means) / means.length);
    }
    return { mean: m, se: Math.sqrt(v / nEff), nEff, tauX: tx.tau, tauY: ty.tau, seTiles,
      reliable: W >= 40 * tx.tau && H >= 40 * ty.tau };
  }

  /* ---- independent samples and seed ensembles ---- */
  function sampleMean(x) { return { mean: mean(x), se: Math.sqrt(variance(x) / x.length), n: x.length }; }
  // Summary of one number measured on several independent seeds.
  function ensemble(values) {
    const v = values.filter(Number.isFinite);
    return { mean: mean(v), sd: sd(v), se: Math.sqrt(variance(v) / v.length), n: v.length, min: Math.min(...v), max: Math.max(...v) };
  }
  // Run fn(seed) over seeds (sync or async) and summarize the number it returns. For the Node tools.
  async function runEnsemble(seeds, fn) {
    const values = [];
    for (const seed of seeds) values.push(await fn(seed));
    return Object.assign(ensemble(values), { values, seeds: Array.from(seeds) });
  }

  /* ---- fits ---- */
  function ols(xs, ys) {
    const n = xs.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
    const den = n * sxx - sx * sx;
    if (!(Math.abs(den) > 1e-12)) return { slope: NaN, intercept: NaN, n };
    const slope = (n * sxy - sx * sy) / den;
    return { slope, intercept: (sy - slope * sx) / n, n };
  }
  // Slope along one trajectory with a moving-block bootstrap over (x, y) pairs. The ordinary least
  // squares error assumes independent residuals, which one trajectory does not have; the blocks keep
  // neighboring points together so the resampled scatter includes their correlation.
  function slopeBootstrap(xs, ys, opts) {
    const n = xs.length, idx = Array.from({ length: n }, (_, i) => i);
    const residuals = (() => { const f = ols(xs, ys); return idx.map(i => ys[i] - f.intercept - f.slope * xs[i]); })();
    // Blocks of four residual correlation times: shorter blocks cut the low-frequency noise that
    // dominates a trend's error, and the interval undercovers (tools/stats-check.js measures this).
    const tauR = tauInt(residuals).tau;
    const b = Math.max(2, Math.round((opts && opts.blockSize) || Math.max(4 * tauR, Math.cbrt(n))));
    const boot = blockBootstrap(idx, sample => ols(sample.map(i => xs[i]), sample.map(i => ys[i])).slope,
      Object.assign({}, opts, { blockSize: b }));
    return { slope: ols(xs, ys).slope, se: boot.se, lo: boot.lo, hi: boot.hi, blockSize: b, reps: boot.reps, n, nEff: n / (2 * tauR) };
  }
  // Hill estimator of a power-law tail exponent alpha from the k largest values; se = alpha / sqrt(k).
  function hill(values, k) {
    const v = Array.from(values).filter(x => x > 0).sort((a, b) => b - a);
    if (k < 2 || k >= v.length) return { alpha: NaN, se: NaN, k };
    let s = 0;
    for (let i = 0; i < k; i++) s += Math.log(v[i] / v[k]);
    const alpha = k / s;
    return { alpha, se: alpha / Math.sqrt(k), k, xmin: v[k] };
  }

  /* ---- printing a comparison ---- */
  const BASES = Object.freeze({
    sampled: 'sampled',
    exact: 'exact, no sampling error',
    deterministic: 'deterministic, no sampling error',
    construction: 'true by construction; a regression test, not a prediction',
  });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // A value and its error to matching decimals: the error to two significant figures.
  function formatPair(value, err) {
    if (!Number.isFinite(value)) return ['unavailable', ''];
    if (!(err > 0) || !Number.isFinite(err)) return [String(Number(value.toPrecision(4))), ''];
    const place = Math.floor(Math.log10(err)) - 1;
    const decimals = Math.max(0, -place);
    if (decimals > 8 || Math.abs(value) >= 1e6) return [value.toExponential(2), err.toExponential(1)];
    return [value.toFixed(decimals), err.toFixed(decimals)];
  }
  function formatValue(value, digits) {
    if (!Number.isFinite(value)) return 'unavailable';
    if (value !== 0 && (Math.abs(value) < 1e-3 || Math.abs(value) >= 1e6)) return value.toExponential(2);
    return String(Number(value.toPrecision(digits || 4)));
  }
  function sigmas(measured, expected, err) {
    if (!Number.isFinite(measured) || !Number.isFinite(expected) || !(err > 0)) return null;
    return (measured - expected) / err;
  }
  function sigmaText(z) {
    if (z === null) return '';
    const a = Math.abs(z);
    return a < 0.05 ? 'within 0.1σ' : a.toFixed(1) + 'σ ' + (z < 0 ? 'low' : 'high');
  }
  // compare({ label, measured, expected, reference, basis, uncertainty, method, units, pending, digits, z, note })
  // basis is required: 'sampled' (uncertainty and method required), 'exact', 'deterministic' or
  // 'construction'. reference is how the expected value is named ("Euler", "Onsager", "surmise").
  // A sampled comparison whose uncertainty cannot be computed yet must pass pending with the reason:
  // it prints the value and the reason, never a verdict. z overrides the computed (measured - expected) /
  // uncertainty when the caller has a better calibrated deviation (a Student t turned into a normal
  // deviate, say). note is a short qualifier printed at the end ("one draw", "finite window").
  function compare(o) {
    if (!o || !Object.prototype.hasOwnProperty.call(BASES, o.basis)) throw new TypeError('compare(): basis must be sampled, exact, deterministic or construction');
    const units = o.units ? ' ' + esc(o.units) : '';
    const ref = o.expected === undefined || o.expected === null ? '' :
      ' · ' + (o.reference ? esc(o.reference) + ' ' : 'theory ') + esc(typeof o.expected === 'string' ? o.expected : formatValue(o.expected, o.digits));
    const expectedNum = typeof o.expected === 'number' ? o.expected : Number.isFinite(o.expectedValue) ? o.expectedValue : null;
    let value, tail, title;
    if (o.basis === 'sampled') {
      if (!(o.uncertainty > 0) || !Number.isFinite(o.uncertainty)) {
        if (!o.pending) throw new TypeError('compare(): a sampled comparison needs an uncertainty, or pending with the reason');
        value = formatValue(o.measured, o.digits);
        tail = ' · error bar pending: ' + esc(o.pending);
      } else {
        if (!o.method) throw new TypeError('compare(): a sampled comparison must name its method');
        const [v, e] = formatPair(o.measured, o.uncertainty);
        value = v + ' ± ' + e;
        const z = sigmaText(Number.isFinite(o.z) ? o.z : sigmas(o.measured, expectedNum, o.uncertainty));
        tail = z ? ' · ' + z : '';
        title = o.method;
      }
    } else {
      value = formatValue(o.measured, o.digits);
      tail = ' · ' + BASES[o.basis];
    }
    return '<span class="cmp" data-basis="' + o.basis + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' +
      esc(o.label) + ' <b>' + value + '</b>' + units + ref + tail + (o.note ? ' · ' + esc(o.note) : '') + '</span>';
  }

  const api = Object.freeze({
    mean, variance, sd, seeded, autocorr, tauInt, seriesMean, blocking, blockBootstrap,
    fieldMean, sampleMean, ensemble, runEnsemble, ols, slopeBootstrap, hill,
    BASES, formatPair, formatValue, sigmas, sigmaText, compare,
  });
  root.GenChaseStats = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
