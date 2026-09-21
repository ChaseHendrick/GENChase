
/* modules/rmt.js */
/* GENChase — beta-ensemble spectra from the Dumitriu-Edelman tridiagonal model, and Dyson Brownian motion of GOE eigenvalues. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  /* ---- eigenvalues of a symmetric tridiagonal: QL with implicit shifts ---- */
  // d is the diagonal, e the subdiagonal in e[0..n-2]. Both are overwritten; d comes back holding the
  // eigenvalues, unsorted. This is the whole reason the beta-ensemble is cheap: the Dumitriu-Edelman model
  // is already tridiagonal, so a spectrum costs O(n^2) rather than the O(n^3) of reducing a full matrix.
  function tqli(d, e, n) {
    e[n - 1] = 0;
    for (let l = 0; l < n; l++) {
      let iter = 0, m;
      do {
        for (m = l; m < n - 1; m++) {
          const dd = Math.abs(d[m]) + Math.abs(d[m + 1]);
          if (Math.abs(e[m]) <= 2.3e-16 * dd) break;
        }
        if (m !== l) {
          if (iter++ === 60) break;
          let g = (d[l + 1] - d[l]) / (2 * e[l]);
          let r = Math.hypot(g, 1);
          g = d[m] - d[l] + e[l] / (g + (g >= 0 ? Math.abs(r) : -Math.abs(r)));
          let s = 1, c = 1, p = 0;
          for (let i = m - 1; i >= l; i--) {
            let f = s * e[i]; const b = c * e[i];
            r = Math.hypot(f, g);
            e[i + 1] = r;
            if (r === 0) { d[i + 1] -= p; e[m] = 0; break; }
            s = f / r; c = g / r;
            g = d[i + 1] - p;
            r = (d[i] - g) * s + 2 * c * b;
            p = s * r;
            d[i + 1] = g + p;
            g = c * r - b;
          }
          if (r === 0 && m - 1 >= l) continue;
          d[l] -= p; e[l] = g; e[m] = 0;
        }
      } while (m !== l);
    }
    return d;
  }

  // Householder reduction of a full symmetric matrix to tridiagonal form. Eigenvalues only, so the
  // transformation is never accumulated; that is the difference between O(4n^3/3) and several times more.
  function tred(A, n) {
    const a = Float64Array.from(A), d = new Float64Array(n), e = new Float64Array(n);
    for (let i = n - 1; i >= 1; i--) {
      const l = i - 1;
      let h = 0, scale = 0;
      if (l > 0) {
        for (let k = 0; k <= l; k++) scale += Math.abs(a[i * n + k]);
        if (scale === 0) e[i] = a[i * n + l];
        else {
          for (let k = 0; k <= l; k++) { a[i * n + k] /= scale; h += a[i * n + k] * a[i * n + k]; }
          let f = a[i * n + l];
          const g = f >= 0 ? -Math.sqrt(h) : Math.sqrt(h);
          e[i] = scale * g;
          h -= f * g;
          a[i * n + l] = f - g;
          f = 0;
          for (let j = 0; j <= l; j++) {
            let gg = 0;
            for (let k = 0; k <= j; k++) gg += a[j * n + k] * a[i * n + k];
            for (let k = j + 1; k <= l; k++) gg += a[k * n + j] * a[i * n + k];
            e[j] = gg / h;
            f += e[j] * a[i * n + j];
          }
          const hh = f / (h + h);
          for (let j = 0; j <= l; j++) {
            const fj = a[i * n + j], gj = e[j] - hh * fj;
            e[j] = gj;
            for (let k = 0; k <= j; k++) a[j * n + k] -= fj * e[k] + gj * a[i * n + k];
          }
        }
      } else e[i] = a[i * n + l];
    }
    for (let i = 0; i < n; i++) d[i] = a[i * n + i];
    const sub = new Float64Array(n);
    for (let i = 1; i < n; i++) sub[i - 1] = e[i];
    sub[n - 1] = 0;
    return { d, e: sub };
  }

  /* ---- samplers ---- */
  // Marsaglia and Tsang, ACM TOMS 26, 363 (2000). The a < 1 case uses the standard boost
  // Gamma(a) = Gamma(a+1) U^{1/a}, which matters here because beta can be small.
  function gammaRand(rng, a) {
    if (a < 1) return gammaRand(rng, a + 1) * Math.pow(Math.max(rng(), 1e-12), 1 / a);
    const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (let guard = 0; guard < 1000; guard++) {
      let x, v;
      do { x = rng.gauss(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = rng();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(Math.max(u, 1e-300)) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
    return d;
  }
  const chi = (rng, k) => Math.sqrt(2 * gammaRand(rng, k / 2));

  // Dumitriu and Edelman, J. Math. Phys. 43, 5830 (2002). The symmetric tridiagonal with N(0,2) on the
  // diagonal and chi_{(n-k)beta} below it has eigenvalue density proportional to
  // prod |lambda_i - lambda_j|^beta exp(-sum lambda^2 / 2), for any beta > 0 rather than only 1, 2 and 4.
  // Checked against a directly built GOE at beta = 1: same spectral edge and same second moment.
  function betaHermite(rng, n, beta, d, e) {
    for (let i = 0; i < n; i++) d[i] = Math.SQRT2 * rng.gauss();
    for (let i = 0; i < n - 1; i++) e[i] = chi(rng, (n - 1 - i) * beta);
    tqli(d, e, n);
    const out = Array.prototype.slice.call(d, 0, n);
    out.sort((a, b) => a - b);
    return out;
  }

  // A real symmetric matrix with N(0,2) on the diagonal and N(0,1) off it: the GOE whose eigenvalues
  // perform beta = 1 Dyson Brownian motion.
  function goeInto(rng, A, n) {
    for (let i = 0; i < n; i++) {
      A[i * n + i] = Math.SQRT2 * rng.gauss();
      for (let j = 0; j < i; j++) { const v = rng.gauss(); A[i * n + j] = v; A[j * n + i] = v; }
    }
  }

  // Unfolded nearest-neighbor spacings. The raw gaps mix level repulsion with the semicircle's varying
  // density, so each gap is divided by the local mean spacing before the statistics are taken. The
  // coefficient of variation is then comparable with the Wigner surmise, which gives sqrt(4/pi - 1) = 0.523
  // at beta = 1 and sqrt(3 pi/8 - 1) = 0.422 at beta = 2, against 1 for an uncorrelated (Poisson) sequence.
  function unfolded(lam, n, out) {
    const K = 12;
    for (let i = Math.floor(n * 0.2); i < Math.floor(n * 0.8); i++) {
      if (i - K < 0 || i + K >= n) continue;
      const local = (lam[i + K] - lam[i - K]) / (2 * K);
      if (local > 1e-12) out.push((lam[i + 1] - lam[i]) / local);
    }
  }
  const SURMISE = { '1.00': 0.523, '2.00': 0.422 };

  /* ---------- Random Matrices ---------- */
  Studio.register({
    id: 'rmt',
    name: 'Random Matrices',
    tab: 'Matrices',
    subtitle: 'beta-ensemble spectra and Dyson Brownian motion · 1962',
    order: 48,
    equation: 'p(λ) ∝ ∏_{i<j} |λ_i − λ_j|^β · e^{−Σλ_i²/2};   dλ_i = √(2/β) dB_i + Σ_{j≠i} dt/(λ_i − λ_j)',
    credit: "Eugene Wigner's semicircle law, Annals of Mathematics 62, 548 (1955), and Freeman Dyson's threefold way and Brownian-motion model, J. Math. Phys. 3, 140 and 1191 (1962). The tridiagonal matrix models that make a general β cheap to sample are Ioana Dumitriu and Alan Edelman, 'Matrix models for beta ensembles', J. Math. Phys. 43, 5830 (2002). The spacing forms quoted in the status line are Wigner's surmise; the exact answers are the Gaudin-Mehta determinantal formulae, Michel Mehta, Random Matrices. The gamma sampler is George Marsaglia and Wai Wan Tsang, ACM TOMS 26, 363 (2000).",
    blurb: 'Eigenvalues of a random matrix are not scattered independently. They push each other apart, and the strength of that push is a single number, β: the exponent on |λᵢ − λⱼ| in their joint density. At β = 0 the levels are independent, and independence looks clumpy, with gaps and coincidences everywhere. At β = 1, 2 and 4 you get the three classical ensembles that describe real symmetric, complex Hermitian and quaternionic systems. Push β higher and the spectrum stops being random-looking and freezes into something close to a crystal. Because the tridiagonal models sample any β at all, that whole road from independence to rigidity is one slider, and the sweep plate draws every point on it at once. Dyson\'s other idea is the third mode: let the matrix itself diffuse, and its eigenvalues become paths that never cross.',
    schema: [
      { group: 'Ensemble', key: 'mode', label: 'Plate', type: 'seg', kind: GEOM, wrap: true,
        options: [['rows', 'Stacked spectra'], ['sweep', 'β sweep'], ['dyson', 'Dyson paths']],
        hint: 'Stacked spectra draws many independent samples at one β. The sweep varies β down the plate, from clumping to rigidity. Dyson paths let one matrix diffuse and traces its eigenvalues.' },
      { group: 'Ensemble', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      RANGE('Ensemble', 'n', 'Matrix size n', GEOM, 24, 400, 4, String, { hint: 'Eigenvalues per sample. The spectrum fills [−2√(βn), 2√(βn)], so larger n is a finer comb, not a wider one, once the plate is normalized.' }),
      RANGE('Ensemble', 'beta', 'Repulsion β', GEOM, 0.05, 20, 0.05, f2, { dimUnless: s => s.mode === 'rows',
        hint: 'β = 0 is independence, 1 real symmetric (GOE), 2 complex Hermitian (GUE), 4 quaternionic (GSE). Above that the levels approach a rigid lattice.' }),
      RANGE('Ensemble', 'rows', 'Samples', GEOM, 24, 400, 4, String, { dimUnless: s => s.mode !== 'dyson' }),
      RANGE('Ensemble', 'betaLo', 'β at the top', GEOM, 0.02, 8, 0.02, f2, { dimUnless: s => s.mode === 'sweep' }),
      RANGE('Ensemble', 'betaHi', 'β at the bottom', GEOM, 0.05, 24, 0.05, f2, { dimUnless: s => s.mode === 'sweep' }),
      { group: 'Ensemble', key: 'logSweep', label: 'Sweep β logarithmically', type: 'toggle', kind: GEOM, dimUnless: s => s.mode === 'sweep' },
      RANGE('Diffusion', 'paths', 'Eigenvalues', GEOM, 12, 100, 2, String, { dimUnless: s => s.mode === 'dyson' }),
      RANGE('Diffusion', 'slices', 'Time samples', GEOM, 120, 1200, 20, String, { dimUnless: s => s.mode === 'dyson',
        hint: 'Each sample is one full diagonalisation, so the cost grows as n³ per slice; the count is capped against the matrix size and the status line says when it was.' }),
      RANGE('Diffusion', 'span', 'Time span', GEOM, 0.5, 24, 0.5, f1, { dimUnless: s => s.mode === 'dyson' }),
      { group: 'Picture', key: 'ink', label: 'Color by', type: 'seg', kind: PAINT, wrap: true,
        options: [['position', 'Position'], ['spacing', 'Local spacing'], ['row', 'Sample'], ['flat', 'One ink']] },
      { group: 'Picture', key: 'norm', label: 'Scale', type: 'seg', kind: PAINT,
        options: [['global', 'One scale'], ['row', 'Per sample']],
        hint: 'One scale keeps the spectra comparable, so a β sweep also shows the spectrum widening. Per sample divides each row by its own edge, which isolates the spacing statistics from the spread.' },
      RANGE('Picture', 'tickH', 'Tick length', PAINT, 0.1, 1.6, 0.05, f2),
      RANGE('Picture', 'tickW', 'Tick weight', PAINT, 0.2, 4, 0.1, f1),
      RANGE('Picture', 'alpha', 'Opacity', PAINT, 0.15, 1, 0.05, f2),
      RANGE('Picture', 'shift', 'Palette offset', PAINT, 0, 15, 1, String),
      RANGE('Picture', 'margin', 'Margin', PAINT, 0, 0.2, 0.01, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      mode: 'sweep', aspect: '1:1', n: 150, beta: 2, rows: 200,
      betaLo: 0.04, betaHi: 12, logSweep: true,
      paths: 40, slices: 1000, span: 10,
      ink: 'row', norm: 'row', tickH: 0.9, tickW: 1.6, alpha: 0.95, shift: 0, margin: 0.06, grain: 0.04,
      seed: 'dyson-1962',
    },
    presets: {
      sweep: pre('Independence to rigidity', { mode: 'sweep', n: 150, rows: 200, betaLo: 0.04, betaHi: 12, logSweep: true, norm: 'row', ink: 'row', tickH: 0.9, tickW: 1.6 }, Pal.thermal),
      gue: pre('GUE, level repulsion', { mode: 'rows', n: 140, beta: 2, rows: 180, norm: 'global', ink: 'spacing', tickH: 0.85, tickW: 1.8 }, Pal.harbor),
      poisson: pre('β = 0.05, almost independent', { mode: 'rows', n: 140, beta: 0.05, rows: 180, norm: 'global', ink: 'flat', tickH: 0.9, tickW: 1.8 }, Pal.kiln),
      crystal: pre('β = 18, nearly a lattice', { mode: 'rows', n: 120, beta: 18, rows: 160, norm: 'row', ink: 'position', tickH: 0.95, tickW: 2 }, Pal.verdigris),
      dyson: pre('Dyson paths', { mode: 'dyson', paths: 40, slices: 1000, span: 10, ink: 'row', tickW: 1.3, alpha: 0.9, norm: 'global', aspect: '3:2' }, Pal.nightshade),
      braid: pre('A long braid', { mode: 'dyson', paths: 24, slices: 1100, span: 24, ink: 'position', tickW: 2, alpha: 0.85, norm: 'global', aspect: '16:9' }, Pal.ember),
      semicircle: pre('GOE, read as a comb', { mode: 'rows', n: 260, beta: 1, rows: 260, norm: 'global', ink: 'position', tickH: 1, tickW: 1 }, Pal.risograph),
    },
    hints: {
      Ensemble: 'Every draw comes from the seeded generator, so a seed reprints the same spectra exactly. β is a continuous parameter here, not a choice of three ensembles, because the tridiagonal models sample any positive value.',
      Picture: 'Discrete marks, so the export is a true vector: ticks become rectangles and Dyson paths become polylines.',
    },
    palette: true, defaultPalette: 'graphite', paletteLabel: 'Colors',
    headline: 'beta', headlineLabel: 'β',
    sanitize(s) {
      s.n = U.clamp(Math.round(Number(s.n) || 180), 24, 400);
      s.paths = U.clamp(Math.round(Number(s.paths) || 64), 12, 100);
      if (s.betaHi <= s.betaLo) s.betaHi = s.betaLo + 0.5;
      // A Dyson slice is a full Householder reduction, O(4n^3/3). Left alone, a hundred paths over twelve
      // hundred slices is billions of operations and the tab looks hung rather than slow, so the slice count
      // is capped against the matrix size and the status line reports the cap rather than hiding it.
      const cap = Math.max(120, Math.floor(4.5e8 / (s.paths * s.paths * s.paths)));
      s.slices = U.clamp(Math.round(Number(s.slices) || 900), 120, Math.min(1200, cap));
    },
    surprise(rng) {
      const mode = rng.pick(['sweep', 'rows', 'rows', 'dyson']);
      return {
        mode,
        n: rng.pick([120, 160, 200, 260, 320]),
        beta: rng.pick([0.05, 0.3, 1, 2, 4, 8, 16]),
        rows: rng.pick([160, 220, 280, 340]),
        betaLo: rng.pick([0.02, 0.05, 0.2]), betaHi: rng.pick([6, 12, 20]), logSweep: rng() < 0.8,
        paths: rng.pick([28, 40, 64, 80]), slices: rng.pick([500, 700, 900]), span: rng.pick([4, 8, 14, 20]),
        ink: mode === 'sweep' ? rng.pick(['row', 'row', 'spacing']) : rng.pick(['position', 'spacing', 'row', 'flat']),
        norm: mode === 'sweep' ? rng.pick(['row', 'row', 'global']) : rng.pick(['global', 'row']),
        tickH: rng.range(0.7, 1.1), tickW: rng.range(1, 2.4), alpha: rng.range(0.7, 1),
        shift: rng.int(0, 5), aspect: rng.pick(['1:1', '1:1', '4:5', '3:2', '16:9']),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let series = null;        // array of { lam: [...], beta } for rows/sweep, or paths for dyson
      let scaleG = 1, cv = null, cvLo = null, cvHi = null, timer = 0, building = false, capped = false, note = '';

      function stop() { clearTimeout(timer); }

      function betaAt(s, j, rows) {
        if (s.mode !== 'sweep') return s.beta;
        const t = rows > 1 ? j / (rows - 1) : 0;
        return s.logSweep
          ? s.betaLo * Math.pow(s.betaHi / s.betaLo, t)
          : s.betaLo + (s.betaHi - s.betaLo) * t;
      }

      function buildSpectra(s, done) {
        const rng = U.makeRng(s.seed + '/rmt');
        const n = s.n, rows = s.rows;
        const d = new Float64Array(n), e = new Float64Array(n);
        series = []; scaleG = 0;
        const uLo = [], uHi = [], uAll = [];
        let j = 0;
        (function chunk() {
          const t0 = performance.now();
          while (j < rows && performance.now() - t0 < 40) {
            const b = betaAt(s, j, rows);
            const lam = betaHermite(rng, n, b, d, e);
            let mx = 0;
            for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(lam[i]));
            scaleG = Math.max(scaleG, mx);
            series.push({ lam, beta: b, scale: mx || 1 });
            if (s.mode === 'sweep') { if (j < rows * 0.08) unfolded(lam, n, uLo); else if (j > rows * 0.92) unfolded(lam, n, uHi); }
            else if (uAll.length < 40000) unfolded(lam, n, uAll);
            j++;
          }
          if (j < rows) { note = 'sampling ' + j + ' / ' + rows; status(); timer = setTimeout(chunk, 0); }
          else {
            const stat = a => {
              if (a.length < 50) return null;
              const m = a.reduce((x, y) => x + y, 0) / a.length;
              const v = a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length;
              return m > 0 ? Math.sqrt(v) / m : null;
            };
            cv = stat(uAll); cvLo = stat(uLo); cvHi = stat(uHi);
            note = ''; building = false; done();
          }
        })();
      }

      // Exact Dyson Brownian motion at stationarity. The matrix follows an Ornstein-Uhlenbeck process,
      // H(t + delta) = e^{-delta/2} H(t) + sqrt(1 - e^{-delta}) G with G a fresh GOE, whose transition is
      // exact for any delta rather than a discretisation of one. Diagonalising at each step then gives the
      // eigenvalue paths with no softened repulsion and no minimum-gap fudge: the levels avoid each other
      // because the matrix process says so, which is Dyson's point.
      function buildDyson(s, done) {
        const rng = U.makeRng(s.seed + '/dyson');
        const n = s.paths, T = s.slices, delta = s.span / T;
        const a = Math.exp(-delta / 2), b = Math.sqrt(Math.max(0, 1 - Math.exp(-delta)));
        const H = new Float64Array(n * n), Gm = new Float64Array(n * n);
        goeInto(rng, H, n);
        series = [];
        scaleG = 0;
        let t = 0;
        (function chunk() {
          const t0 = performance.now();
          while (t < T && performance.now() - t0 < 40) {
            if (t > 0) {
              goeInto(rng, Gm, n);
              for (let i = 0; i < n * n; i++) H[i] = a * H[i] + b * Gm[i];
            }
            const { d, e } = tred(H, n);
            tqli(d, e, n);
            const lam = Array.prototype.slice.call(d, 0, n);
            lam.sort((x, y) => x - y);
            let mx = 0;
            for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(lam[i]));
            scaleG = Math.max(scaleG, mx);
            series.push({ lam, beta: 1, scale: mx || 1 });
            t++;
          }
          if (t < T) { note = 'diffusing ' + t + ' / ' + T; status(); timer = setTimeout(chunk, 0); }
          else {
            const u = [];
            unfolded(series[series.length - 1].lam, n, u);
            const m = u.length ? u.reduce((x, y) => x + y, 0) / u.length : 0;
            const v = u.length ? u.reduce((x, y) => x + (y - m) * (y - m), 0) / u.length : 0;
            cv = m > 0 ? Math.sqrt(v) / m : null; cvLo = cvHi = null;
            note = ''; building = false; done();
          }
        })();
      }

      function status() {
        const s = host.getState();
        const P = [];
        if (s.mode === 'dyson') {
          P.push('<span><b>' + s.paths + '</b> GOE eigenvalues · ' + s.slices.toLocaleString() + ' diagonalisations</span>');
          P.push('<span>time span <b>' + s.span.toFixed(1) + '</b></span>');
          if (capped) P.push('<span>slices capped by n³</span>');
        } else if (s.mode === 'sweep') {
          P.push('<span><b>' + s.rows + '</b> spectra of <b>' + s.n + '</b></span>');
          P.push('<span>β <b>' + s.betaLo.toFixed(2) + ' → ' + s.betaHi.toFixed(2) + '</b>' + (s.logSweep ? ' (log)' : '') + '</span>');
          if (cvLo !== null && cvHi !== null) P.push('<span>spacing spread <b>' + cvLo.toFixed(2) + ' → ' + cvHi.toFixed(2) + '</b> (1.00 is independent)</span>');
        } else {
          P.push('<span><b>' + s.rows + '</b> spectra of <b>' + s.n + '</b> · β <b>' + s.beta.toFixed(2) + '</b></span>');
          if (cv !== null) {
            const sur = SURMISE[s.beta.toFixed(2)];
            P.push('<span>unfolded spacing spread <b>' + cv.toFixed(3) + '</b>' + (sur ? ' · surmise ' + sur.toFixed(3) : '') + '</span>');
          }
        }
        P.push('<span>' + (series ? series.length.toLocaleString() : 0) + ' rows</span>');
        if (note) P.push('<span>' + note + '</span>');
        host.setStatus(P.join(''));
      }

      // A 256-entry ramp rather than the palette array indexed directly. Indexing the array quantizes a
      // continuous quantity into as many vertical bands as there are swatches, which reads as structure in
      // the plate and is not: the eigenvalues do not come in eight kinds. The palette is the ramp's stops.
      let lut = null, lutKey = '';
      function ensureLut(s) {
        const key = (s.palette || []).join(',');
        if (lut && lutKey === key) return;
        const ramp = U.makeRamp(s.palette);
        lut = new Array(256);
        for (let i = 0; i < 256; i++) {
          const c = ramp(i / 255);
          lut[i] = 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
        }
        lutKey = key;
      }
      const pick = (s, t) => lut[Math.max(0, Math.min(255, Math.round((((t + s.shift / 16) % 1) + 1) % 1 * 255)))];
      function colorOf(s, rowIdx, i, n, lam, rowScale, rows) {
        if (s.ink === 'flat') return pick(s, 0.72);
        if (s.ink === 'row') return pick(s, rows > 1 ? rowIdx / (rows - 1) : 0.5);
        if (s.ink === 'spacing') {
          const a = i > 0 ? lam[i] - lam[i - 1] : lam[1] - lam[0];
          const b = i < n - 1 ? lam[i + 1] - lam[i] : lam[n - 1] - lam[n - 2];
          const g = 0.5 * (a + b), mean = (lam[n - 1] - lam[0]) / (n - 1);
          return pick(s, U.clamp(0.5 + 0.5 * Math.log(Math.max(g, 1e-9) / Math.max(mean, 1e-9)) / 1.2, 0, 1));
        }
        return pick(s, U.clamp(0.5 + 0.5 * lam[i] / rowScale, 0, 1));
      }

      function layout(s, W, H) {
        const mx = W * s.margin, my = H * s.margin;
        return { x0: mx, y0: my, w: W - 2 * mx, h: H - 2 * my };
      }

      function paint(c2, W, H) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, W, H);
        if (!series || !series.length) return;
        ensureLut(s);
        const L = layout(s, W, H);
        c2.globalAlpha = s.alpha;
        if (s.mode === 'dyson') {
          const T = series.length, n = series[0].lam.length;
          const sc = scaleG || 1;
          c2.lineWidth = Math.max(0.4, s.tickW * W / 1400);
          c2.lineJoin = 'round'; c2.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            c2.beginPath();
            for (let t = 0; t < T; t++) {
              const lam = series[t].lam;
              const x = L.x0 + L.w * t / (T - 1);
              const y = L.y0 + L.h * (0.5 - 0.5 * lam[i] / sc);
              if (t === 0) c2.moveTo(x, y); else c2.lineTo(x, y);
            }
            const last = series[T - 1].lam;
            c2.strokeStyle = colorOf(s, i, i, n, last, sc, n);
            c2.stroke();
          }
        } else {
          const rows = series.length, n = series[0].lam.length;
          const pitch = L.h / rows;
          const th = Math.max(0.5, pitch * s.tickH);
          const tw = Math.max(0.35, s.tickW * W / 1400);
          for (let j = 0; j < rows; j++) {
            const row = series[j], lam = row.lam;
            const sc = s.norm === 'row' ? row.scale : (scaleG || 1);
            const yc = L.y0 + (j + 0.5) * pitch;
            for (let i = 0; i < n; i++) {
              const x = L.x0 + L.w * (0.5 + 0.5 * lam[i] / sc);
              c2.fillStyle = colorOf(s, j, i, n, lam, sc, rows);
              c2.fillRect(x - tw / 2, yc - th / 2, tw, th);
            }
          }
        }
        c2.globalAlpha = 1;
        if (s.grain > 0) {
          const rng = U.makeRng(s.seed + '/grain'), img = c2.getImageData(0, 0, W, H), px = img.data, amp = s.grain * 28;
          for (let i = 0; i < px.length; i += 4) { const v = (rng() - 0.5) * amp; px[i] += v; px[i + 1] += v; px[i + 2] += v; }
          c2.putImageData(img, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop();
          const s = host.getState();
          const cap = Math.max(120, Math.floor(4.5e8 / (s.paths * s.paths * s.paths)));
          capped = s.mode === 'dyson' && s.slices >= Math.min(1200, cap);
          series = null; cv = cvLo = cvHi = null; building = true;
          render(); note = 'sampling'; status();
          const done = () => { render(); status(); };
          if (s.mode === 'dyson') buildDyson(s, done); else buildSpectra(s, done);
        },
        repaint() { if (!building) render(); },
        resize() { if (!building) render(); },
        pause() {}, resume() { if (!building) render(); },
        async exportPNG(w, h) {
          if (!series) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        // Ticks are rectangles and paths are polylines, so the vector file is the thing that was computed
        // rather than a photograph of it.
        exportSVG(w, h) {
          if (!series || !series.length) throw new Error('nothing to export');
          const s = host.getState();
          ensureLut(s);
          const L = layout(s, w, h);
          const r = v => Math.round(v * 100) / 100;
          let body = '<g opacity="' + s.alpha + '">';
          if (s.mode === 'dyson') {
            const T = series.length, n = series[0].lam.length, sc = scaleG || 1;
            const lw = Math.max(0.4, s.tickW * w / 1400);
            for (let i = 0; i < n; i++) {
              const pts = [];
              for (let t = 0; t < T; t++) pts.push(r(L.x0 + L.w * t / (T - 1)) + ',' + r(L.y0 + L.h * (0.5 - 0.5 * series[t].lam[i] / sc)));
              body += '<polyline fill="none" stroke="' + colorOf(s, i, i, n, series[T - 1].lam, sc, n) +
                '" stroke-width="' + r(lw) + '" stroke-linejoin="round" points="' + pts.join(' ') + '"/>';
            }
          } else {
            const rows = series.length, n = series[0].lam.length;
            const pitch = L.h / rows, th = Math.max(0.5, pitch * s.tickH), tw = Math.max(0.35, s.tickW * w / 1400);
            for (let j = 0; j < rows; j++) {
              const row = series[j], lam = row.lam, sc = s.norm === 'row' ? row.scale : (scaleG || 1);
              const yc = L.y0 + (j + 0.5) * pitch;
              for (let i = 0; i < n; i++) {
                const x = L.x0 + L.w * (0.5 + 0.5 * lam[i] / sc);
                body += '<rect x="' + r(x - tw / 2) + '" y="' + r(yc - th / 2) + '" width="' + r(tw) + '" height="' + r(th) +
                  '" fill="' + colorOf(s, j, i, n, lam, sc, rows) + '"/>';
              }
            }
          }
          body += '</g>';
          return U.svgBlob(w, h, s.bg, body);
        },
      };
    },
  });
})();
