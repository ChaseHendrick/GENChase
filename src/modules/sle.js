
/* modules/sle.js */
/* GENChase: Schramm-Loewner evolution, the random curve driven by Brownian motion through the Loewner equation. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // Principal square root of a complex number, then the root in the closed upper half plane.
  function sqrtH(re, im) {
    const r = Math.hypot(re, im);
    let a = Math.sqrt(Math.max(0, (r + re) / 2)), b = Math.sqrt(Math.max(0, (r - re) / 2));
    if (im < 0) b = -b;
    if (b < 0) { a = -a; b = -b; }
    return [a, b];
  }

  // Chordal SLE in the upper half plane with a piecewise-constant driving function U_k on steps of length dt.
  // The elementary inverse map is f_k(w) = U_k + sqrt((w - U_k)^2 - 4 dt), and the tip after n steps is
  // f_1(f_2(... f_{n-1}(U_n + 2i sqrt(dt)))). O(N^2) in total, chunked so the page stays responsive.
  function makeTrace(drive, dt) {
    const N = drive.length, xs = new Float64Array(N), ys = new Float64Array(N);
    const h = 2 * Math.sqrt(dt), four = 4 * dt;
    let n = 0;
    return {
      N, xs, ys,
      done() { return n >= N; },
      progress() { return n / N; },
      step(ms) {
        const t0 = performance.now();
        while (n < N && performance.now() - t0 < ms) {
          let re = drive[n], im = h;
          for (let k = n - 1; k >= 0; k--) {
            const u = drive[k], dr = re - u;
            const q = sqrtH(dr * dr - im * im - four, 2 * dr * im);
            re = u + q[0]; im = q[1];
          }
          xs[n] = re; ys[n] = im; n++;
        }
      },
    };
  }

  function brownian(rng, N, dt, kappa) {
    const d = new Float64Array(N), s = Math.sqrt(kappa * dt);
    let u = 0;
    for (let i = 0; i < N; i++) { u += s * rng.gauss(); d[i] = u; }
    return d;
  }

  const KAPPAS = { lerw: 2, saw: 8 / 3, gff: 4, perc: 6, ust: 8 };
  const SWEEP = [1, 2, 8 / 3, 4, 6, 8];

  /* ---------- Schramm-Loewner Evolution ---------- */
  Studio.register({
    id: 'sle',
    name: 'Schramm-Loewner Evolution',
    tab: 'SLE',
    subtitle: 'the random curve of critical two-dimensional systems · 2000',
    order: 38,
    equation: '∂g_t/∂t = 2 / (g_t(z) − √κ B_t),   γ(t) = g_t⁻¹(√κ B_t);   κ = 2 loop-erased walk, 8/3 self-avoiding walk, 4 level lines, 6 percolation, 8 Peano curve',
    credit: "Oded Schramm, Israel Journal of Mathematics 118, 221 (2000), 'Scaling limits of loop-erased random walks and uniform spanning trees'. Charles Loewner's 1923 equation grows a curve into the upper half plane from a real driving function; Schramm showed that the only conformally invariant random curves with the domain Markov property come from driving it with Brownian motion of variance κ, and identified κ with the critical models whose interfaces they describe. Gregory Lawler, Schramm and Wendelin Werner computed the exponents; Stanislav Smirnov proved the percolation case. The curve is computed here as a composition of vertical slit maps, after Tom Kennedy, Journal of Statistical Physics 137, 839 (2009).",
    blurb: 'One family of random curves stands behind the interfaces of every critical two-dimensional model with conformal symmetry: the boundary of a percolation cluster, the loop-erased random walk, the level line of a Gaussian free field. Loewner\'s equation turns a real-valued function of time into a curve growing into the half plane; Schramm put Brownian motion in as the driver. A single number κ selects the model. Below 4 the curve is simple. Between 4 and 8 it touches itself and its own past. At 8 and beyond it fills the plane. The sweep preset drives every κ with the same Brownian path, so you can watch one noise open into six curves.',
    schema: [
      RANGE('Curve', 'kappa', 'κ', GEOM, 0.2, 12, 0.1, f1, { hint: '2: loop-erased random walk. 8/3: self-avoiding walk. 4: level line of the Gaussian free field. 6: percolation hull. 8: uniform spanning tree Peano curve.' }),
      RANGE('Curve', 'N', 'Steps', GEOM, 300, 8000, 100, String, { hint: 'Resolution of the driving function. Cost grows as N², so 8000 takes a few seconds.' }),
      { group: 'Curve', key: 'mode', label: 'Plate', type: 'seg', kind: GEOM, wrap: true,
        options: [['single', 'One curve'], ['sweep', 'κ sweep, same noise'], ['seeds', 'Several seeds']] },
      RANGE('Curve', 'curves', 'Curves', GEOM, 2, 12, 1, String, { dimUnless: s => s.mode === 'seeds' }),
      { group: 'Ink', key: 'color', label: 'Color by', type: 'seg', kind: PAINT, wrap: true,
        options: [['curve', 'Curve'], ['time', 'Time along curve'], ['ink', 'Single ink']] },
      RANGE('Ink', 'width', 'Line weight', PAINT, 0.3, 6, 0.1, f1),
      RANGE('Ink', 'alpha', 'Opacity', PAINT, 0.1, 1, 0.05, pct),
      { group: 'Ink', key: 'axis', label: 'Draw the real axis', type: 'toggle', kind: PAINT },
      RANGE('Ink', 'margin', 'Margin', PAINT, 0, 0.25, 0.01, f2),
      { group: 'Finish', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
    ],
    defaults: {
      kappa: 6, N: 3000, mode: 'single', curves: 6, color: 'time', width: 1.4, alpha: 1, axis: true, margin: 0.08, aspect: '5:4',
      seed: 'schramm-2000',
    },
    presets: {
      perc: pre('Percolation, κ = 6', { kappa: 6, N: 4000, mode: 'single', color: 'time', width: 1.4, aspect: '5:4' }, Pal.thermal),
      saw: pre('Self-avoiding walk, κ = 8/3', { kappa: 8 / 3, N: 5000, mode: 'single', color: 'time', width: 1.6, aspect: '4:5' }, Pal.glacier),
      lerw: pre('Loop-erased walk, κ = 2', { kappa: 2, N: 5000, mode: 'single', color: 'ink', width: 2, aspect: '4:5' }, Pal.graphite),
      gff: pre('Level line, κ = 4', { kappa: 4, N: 4000, mode: 'single', color: 'time', width: 1.4, aspect: '5:4' }, Pal.verdigris),
      peano: pre('Space filling, κ = 8', { kappa: 8, N: 6000, mode: 'single', color: 'time', width: 1, aspect: '1:1' }, Pal.ember),
      sweep: pre('One noise, six κ', { mode: 'sweep', N: 3000, color: 'curve', width: 1.2, alpha: 0.9, aspect: '5:4' }, Pal.kiln),
      bundle: pre('Twelve seeds, κ = 6', { kappa: 6, mode: 'seeds', curves: 12, N: 2000, color: 'curve', width: 1, alpha: 0.75, aspect: '3:2' }, Pal.harbor),
    },
    hints: {
      Curve: 'κ is the whole story. The seed fixes the Brownian driving function, so the same seed at two κ values gives two curves opened from the same noise.',
      Ink: 'Time along curve runs the palette from the start of the curve to its tip. Curve gives each curve of a sweep or bundle its own color.',
    },
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Colors (start → tip, or per curve)',
    headline: 'kappa', headlineLabel: 'κ',
    sanitize(s) { s.N = U.clamp(Math.round(Number(s.N) / 100) * 100, 300, 8000); s.kappa = U.clamp(Number(s.kappa) || 6, 0.2, 12); },
    surprise(rng) {
      const mode = rng.pick(['single', 'single', 'single', 'sweep', 'seeds']);
      return {
        kappa: rng.pick([2, 8 / 3, 3, 4, 5, 6, 6, 7, 8]), N: rng.pick([2000, 3000, 4000, 5000]), mode, curves: rng.int(4, 12),
        color: rng.pick(['time', 'time', 'curve', 'ink']), width: rng.range(0.8, 2.2), alpha: mode === 'single' ? 1 : rng.range(0.6, 0.95),
        axis: rng() < 0.6, margin: 0.08, aspect: rng.pick(['1:1', '4:5', '5:4', '3:2']),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
      let traces = [], timer = 0, building = false;

      function plan(s) {
        const dt = 1 / s.N;
        if (s.mode === 'sweep') {
          const base = brownian(U.makeRng(s.seed + '/sle'), s.N, dt, 1);
          return SWEEP.map(k => ({ kappa: k, drive: base.map(v => v * Math.sqrt(k)) }));
        }
        if (s.mode === 'seeds') {
          return Array.from({ length: s.curves }, (_, i) => ({ kappa: s.kappa, drive: brownian(U.makeRng(s.seed + '/sle/' + i), s.N, dt, s.kappa) }));
        }
        return [{ kappa: s.kappa, drive: brownian(U.makeRng(s.seed + '/sle'), s.N, dt, s.kappa) }];
      }
      function build(s, onProgress, done) {
        clearTimeout(timer); building = true;
        const dt = 1 / s.N;
        traces = plan(s).map(p => Object.assign(makeTrace(p.drive, dt), { kappa: p.kappa }));
        let i = 0;
        (function chunk() {
          const t0 = performance.now();
          while (i < traces.length && performance.now() - t0 < 40) { traces[i].step(40); if (traces[i].done()) i++; }
          onProgress();
          if (i < traces.length) timer = setTimeout(chunk, 0); else { building = false; done(); }
        })();
      }
      function bounds() {
        let x0 = Infinity, x1 = -Infinity, y1 = 0;
        for (const t of traces) { const n = t.done() ? t.N : Math.max(1, Math.round(t.progress() * t.N)); for (let i = 0; i < n; i++) { if (t.xs[i] < x0) x0 = t.xs[i]; if (t.xs[i] > x1) x1 = t.xs[i]; if (t.ys[i] > y1) y1 = t.ys[i]; } }
        if (!isFinite(x0)) { x0 = -1; x1 = 1; y1 = 1; }
        return [x0, x1, Math.max(y1, 1e-6)];
      }
      function paint(c2, W, H, forSvg) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, W, H);
        if (!traces.length) return;
        const [x0, x1, y1] = bounds();
        const m = s.margin, availW = W * (1 - 2 * m), availH = H * (1 - 2 * m);
        const scale = Math.min(availW / Math.max(x1 - x0, 1e-6), availH / y1);
        const cx = (x0 + x1) / 2, ox = W / 2 - cx * scale, oy = H * (1 - m);
        const lw = s.width * Math.min(W, H) / 700;
        if (s.axis) { c2.strokeStyle = U.inkRgba(s.bg, 0.35); c2.lineWidth = Math.max(0.6, lw * 0.6); c2.beginPath(); c2.moveTo(0, oy); c2.lineTo(W, oy); c2.stroke(); }
        c2.lineWidth = lw; c2.lineCap = 'round'; c2.lineJoin = 'round'; c2.globalAlpha = s.alpha;
        const P = s.palette, ramp = U.makeRamp(P, null);
        traces.forEach((t, ti) => {
          const n = t.done() ? t.N : Math.round(t.progress() * t.N);
          if (n < 2) return;
          const X = i => ox + t.xs[i] * scale, Y = i => oy - t.ys[i] * scale;
          if (s.color === 'time') {
            const segs = 48, per = Math.ceil(n / segs);
            for (let a = 0; a < n - 1; a += per) {
              const b = Math.min(n - 1, a + per);
              const col = ramp(a / n); c2.strokeStyle = U.rgbToHex(col[0], col[1], col[2]);
              c2.beginPath();
              if (a > 0) c2.moveTo(X(a), Y(a)); else { c2.moveTo(ox, oy); c2.lineTo(X(0), Y(0)); }   // the curve starts at the origin
              for (let i = a + 1; i <= b; i++) c2.lineTo(X(i), Y(i));
              c2.stroke();
            }
          } else {
            c2.strokeStyle = s.color === 'ink' ? U.inkFor(s.bg) : P[ti % P.length];
            c2.beginPath(); c2.moveTo(ox, oy);
            for (let i = 0; i < n; i++) c2.lineTo(X(i), Y(i));
            c2.stroke();
          }
        });
        c2.globalAlpha = 1;
      }
      function render() { paint(ctx, canvas.width, canvas.height); }
      function status(extra) {
        const s = host.getState();
        const phase = s.kappa <= 4 ? 'simple' : (s.kappa < 8 ? 'self-touching' : 'space filling');
        const head = s.mode === 'sweep' ? '<span>κ <b>1 to 8</b> · one driving path</span>' : '<span>κ <b>' + f1(s.kappa) + '</b> · ' + phase + '</span>';
        host.setStatus(head + '<span>' + traces.length + (traces.length === 1 ? ' curve' : ' curves') + ' · ' + s.N.toLocaleString() + ' steps</span>' + (extra ? '<span>' + extra + '</span>' : ''));
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          const s = host.getState();
          build(s, () => { render(); status('computing ' + Math.round(100 * traces.reduce((a, t) => a + t.progress(), 0) / traces.length) + '%'); }, () => { render(); status(); });
        },
        repaint() { if (!building) render(); },
        resize() { render(); },
        pause() {}, resume() { if (!building) render(); },
        async exportPNG(w, h) {
          if (!traces.length) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        exportSVG(w, h) {
          if (!traces.length) throw new Error('nothing to export');
          const s = host.getState();
          const [x0, x1, y1] = bounds();
          const m = s.margin, scale = Math.min(w * (1 - 2 * m) / Math.max(x1 - x0, 1e-6), h * (1 - 2 * m) / y1);
          const ox = w / 2 - (x0 + x1) / 2 * scale, oy = h * (1 - m), lw = s.width * Math.min(w, h) / 700;
          const r = v => Math.round(v * 100) / 100, P = s.palette, ramp = U.makeRamp(P, null);
          let body = '';
          if (s.axis) body += '<line x1="0" y1="' + r(oy) + '" x2="' + w + '" y2="' + r(oy) + '" stroke="' + U.inkFor(s.bg) + '" stroke-opacity="0.35" stroke-width="' + r(Math.max(0.6, lw * 0.6)) + '"/>';
          const attrs = ' fill="none" stroke-width="' + r(lw) + '" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="' + s.alpha + '"';
          traces.forEach((t, ti) => {
            const n = t.N, X = i => r(ox + t.xs[i] * scale), Y = i => r(oy - t.ys[i] * scale);
            if (s.color === 'time') {
              const segs = 48, per = Math.ceil(n / segs);
              for (let a = 0; a < n - 1; a += per) {
                const b = Math.min(n - 1, a + per), col = ramp(a / n);
                let d = a > 0 ? 'M' + X(a) + ' ' + Y(a) : 'M' + r(ox) + ' ' + r(oy) + ' L' + X(0) + ' ' + Y(0);
                for (let i = a + 1; i <= b; i++) d += ' L' + X(i) + ' ' + Y(i);
                body += '<path d="' + d + '" stroke="' + U.rgbToHex(col[0], col[1], col[2]) + '"' + attrs + '/>';
              }
            } else {
              let d = 'M' + r(ox) + ' ' + r(oy);
              for (let i = 0; i < n; i++) d += ' L' + X(i) + ' ' + Y(i);
              body += '<path d="' + d + '" stroke="' + (s.color === 'ink' ? U.inkFor(s.bg) : P[ti % P.length]) + '"' + attrs + '/>';
            }
          });
          return U.svgDoc(w, h, s.bg, body);
        },
      };
    },
  });
})();
