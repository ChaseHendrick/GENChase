
/* modules/knotlight.js */
/* GENChase: Optical trefoil of Berry–Dennis, Milnor open book, Weierstrass bark. The arrangement is the artifact. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 128, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Knot', 'a', 'Offset a', GEOM, 0.35, 1.4, 0.05, f2, { hint: 'Imaginary offset of the (z − ia) factor. Smaller a tightens the braid.' }),
    RANGE('Knot', 'tilt', 'Tilt', GEOM, 0, 1.3, 0.05, f2),
    RANGE('Knot', 'bark', 'Bark a_W', GEOM, 0, 0.7, 0.05, f2, { hint: 'Weierstrass amplitude along the tube. 0 is a smooth filament; > 0 is the unpublished bark.' }),
    { group: 'Knot', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['weave', 'Weave'], ['knot', 'Filament'], ['pages', 'Open book'], ['phase', 'Phase']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.4, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', a: 0.72, tilt: 0.42, bark: 0.35, kind: 'weave', view: 'int', exposure: 1.1 };
  const PRESETS = {
    weave: pre('Weave', { kind: 'weave', a: 0.72, tilt: 0.42, bark: 0.35 }, Pal.nightshade),
    filament: pre('Filament', { kind: 'knot', a: 0.65, bark: 0, tilt: 0.35 }, Pal.ember),
    pages: pre('Open book', { kind: 'pages', a: 0.8, bark: 0, tilt: 0.15 }, Pal.harbor),
    phase: pre('Phase', { kind: 'phase', a: 0.7, tilt: 0.5, bark: 0.1 }, Pal.thermal),
    tight: pre('Tight braid', { a: 0.45, kind: 'weave', bark: 0.45, tilt: 0.55 }, Pal.kiln),
    smooth: pre('Smooth knot', { bark: 0, kind: 'knot', a: 0.85, tilt: 0.25 }, Pal.glacier),
  };

  function surprise(rng) {
    return {
      a: rng.range(0.48, 1.05),
      tilt: rng.range(0.12, 0.9),
      bark: rng.range(0.05, 0.55),
      kind: rng.pick(['weave', 'weave', 'knot', 'pages']),
    };
  }
  function sanitize(s) { s.grid = Math.max(128, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'knotlight', name: 'Knotted Light', tab: 'Knot',
    subtitle: 'a trefoil of darkness, an open book, a bark with no tangent · 2001 / this plate',
    order: 101,
    equation: 'ψ = (x+iy)³ − (z−ia)²,   zeros ≃ (2,3) torus knot;   pages = arg ψ;   bark = Σ α^n cos(β^n s)',
    credit: 'The polynomial whose zeros are a trefoil in R³ is M. V. Berry and M. R. Dennis, Proc. R. Soc. A 457, 2251 (2001); J. Leach, M. R. Dennis, J. Courtial and M. J. Padgett flew a knotted optical vortex in Nature 432, 165 (2004). The open-book fibration of the trefoil singularity is J. Milnor, Singular Points of Complex Hypersurfaces, 1968. The bark is Weierstrass, 1872. No paper draws the three on one seed. That arrangement, and this print, are the artifact; the science is not a claim.',
    blurb: 'A wave is not supposed to go dark along a knot. Berry and Dennis wrote a polynomial whose zeros are a trefoil; Padgett\'s group hung that darkness in the lab. Around it the argument of the same polynomial is Milnor\'s open book: pages that close on the binding. The bark of the filament is a Weierstrass series, a curve with no tangent, which no paper put on this knot. The plate is the three together. The status line reports |ψ| on the algebraic trefoil against the bulk, which theory says is 0.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Knot: 'Weave is the artifact: filament + pages + bark. Filament is min |ψ| alone. Open book is arg ψ. Bark a_W = 0 is the smooth published knot.' },
    palette: true, defaultPalette: 'nightshade', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const rng = U.makeRng(String(s.seed) + '/x');
        const aa = s.a, tilt = s.tilt, barkA = s.bark, kind = s.kind;
        const ct = Math.cos(tilt), st = Math.sin(tilt);
        const span = 3.4;
        const nZ = W >= 208 ? 36 : 44;
        const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28];
        function weier(t) {
          let sum = 0, am = 1, fr = 1;
          for (let n = 0; n < 5; n++) {
            sum += am * Math.cos(fr * Math.PI * t + ph[n]);
            am *= 0.5; fr *= 5;
          }
          return sum;
        }
        function psi(x, y, z) {
          const x2 = x * x, y2 = y * y, xy = x * y;
          const r3 = x * (x2 - 3 * y2), i3 = y * (3 * x2 - y2);
          const zr = z * z - aa * aa, zi = -2 * aa * z;
          const pr = r3 - zr, pi = i3 - zi;
          const env = Math.exp(-0.22 * (x2 + y2 + z * z));
          return [pr * env, pi * env];
        }
        function magArg(x, y, z) {
          const p = psi(x, y, z);
          return [Math.hypot(p[0], p[1]), Math.atan2(p[1], p[0])];
        }
        for (let y = 0; y < H; y++) {
          const yy = span * (y / Math.max(1, H - 1) - 0.5);
          for (let x = 0; x < W; x++) {
            const xx = span * (x / Math.max(1, W - 1) - 0.5);
            let minM = 1e9, argAt = 0, sumM = 0;
            for (let k = 0; k < nZ; k++) {
              const zz = span * (k / Math.max(1, nZ - 1) - 0.5);
              const xr = xx * ct - zz * st;
              const zr = xx * st + zz * ct;
              const ma = magArg(xr, yy, zr);
              sumM += ma[0];
              if (ma[0] < minM) { minM = ma[0]; argAt = ma[1]; }
            }
            const glow = Math.log(1 + 14 / (0.022 + minM));
            const pages = 0.5 + 0.5 * Math.sin(argAt * 3);
            const bark = barkA > 0.001 ? (1 + barkA * weier(argAt / Math.PI + xx * 0.15 + yy * 0.15)) : 1;
            const book = (0.5 + argAt / (Math.PI * 2)) * (0.45 + 0.55 / (0.35 + minM));
            let v;
            if (kind === 'knot') v = glow;
            else if (kind === 'pages') v = book * (0.55 + 0.45 * pages);
            else if (kind === 'phase') v = (argAt / (Math.PI * 2) + 0.5) * (0.35 + 0.65 * Math.tanh(glow));
            else v = 0.72 * glow * Math.max(0.25, bark) + 0.95 * book * (0.35 + 0.65 * pages);
            field[y * W + x] = isFinite(v) ? v : 0;
          }
        }
        let on = 0, nOn = 0, bulk = 0, nB = 0;
        for (let i = 0; i < 360; i++) {
          const t = (i + 0.37) / 360 * Math.PI * 4;
          const s3 = Math.sin(1.5 * t);
          if (aa > 0 && s3 >= -0.08) continue;
          if (aa <= 0 && s3 <= 0.08) continue;
          const rho = Math.pow(Math.abs(aa / s3), 2 / 3);
          const z = -aa * Math.cos(1.5 * t) / s3;
          if (rho > 2.6 || Math.abs(z) > 2.6) continue;
          const ma = magArg(rho * Math.cos(t), rho * Math.sin(t), z);
          on += ma[0]; nOn++;
        }
        for (let i = 0; i < 180; i++) {
          const ma = magArg((rng() - 0.5) * 2.4, (rng() - 0.5) * 2.4, (rng() - 0.5) * 2.4);
          bulk += ma[0]; nB++;
        }
        metric = nOn > 8 ? (on / nOn) / Math.max(1e-9, bulk / Math.max(1, nB)) : 1;
        extra = nOn;

        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function paint() {
        if (!field) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
        const ramp = U.makeRamp(pal, s.bg || '#111');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < field.length; i++) { const v = field[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        const span = (hi - lo) || 1, logv = s.view === 'log';
        for (let i = 0; i < field.length; i++) {
          let t = (field[i] - lo) / span;
          if (logv) t = Math.log(1.001 + 9 * Math.max(0, t)) / Math.log(10);
          t = U.clamp(t * exp, 0, 1);
          const c = ramp(isFinite(t) ? t : 0);
          const o = i * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg || '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }
      function status() {
        // The on-knot points are the closed-form zero set of the same polynomial, so the ratio is 0 up to
        // round-off by construction. Below nine on-knot samples compute() stores a placeholder, not a ratio.
        host.setStatus(extra > 8
          ? U.stats.compare({ label: 'on-knot / bulk |ψ|', measured: metric, expected: 0, reference: 'zero set', basis: 'construction' }) +
            '<span>' + (metric < 0.25 ? 'trefoil zeros' : (metric < 0.6 ? 'near knot' : 'off knot')) + '</span>'
          : '<span>too few on-knot samples</span>');
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#111'; g.fillRect(0, 0, w, h);
          g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
