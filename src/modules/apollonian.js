
/* modules/apollonian.js */
/* GENChase: Apollonian gasket. Descartes integer curvatures. Packed circles fill a disk, leftover area measured against 0. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Pack', 'depth', 'Generations', GEOM, 3, 10, 1, v => v + ''),
    RANGE('Pack', 'seedK', 'Seed k', GEOM, 1, 6, 1, v => v + ''),
    { group: 'Pack', key: 'kind', label: 'Color', type: 'seg', kind: GEOM, options: [['gen', 'Generation'], ['k', 'Curvature'], ['fill', 'Fill']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', depth: 7, seedK: 2, kind: 'gen', view: 'int', exposure: 1 };
  const PRESETS = {
    gasket: pre('Gasket', { depth: 7, kind: 'gen' }, Pal.kiln),
    k: pre('Curvature', { depth: 7, kind: 'k' }, Pal.ember),
    deep: pre('Deep', { depth: 9, kind: 'fill' }, Pal.nightshade),
    coarse: pre('Coarse', { depth: 4, kind: 'gen' }, Pal.harbor),
    fill: pre('Fill', { depth: 8, kind: 'fill' }, Pal.graphite),
    log: pre('Log k', { view: 'log', kind: 'k', depth: 8 }, Pal.thermal),
  };

  function surprise(rng) { return { depth: rng.int(5, 9), seedK: rng.int(1, 4), kind: rng.pick(['gen','k','fill']) }; }
  function sanitize(s) { s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'apollonian', name: 'Apollonian', tab: 'Apollonian',
    subtitle: 'infinite circles, integer curvatures, zero leftover · 1643',
    order: 100,
    equation: 'k₄ = k₁+k₂+k₃ ± 2√(k₁k₂+k₁k₃+k₂k₃)   (Descartes),   k ∈ ℤ if the seeds are',
    credit: 'Descartes\' circle theorem (1643, in a letter to Princess Elisabeth of the Palatinate) gives the fourth curvature from three mutually tangent circles. The Apollonian gasket iterates that packing to infinity. Soddy (1936) wrote the poem; Graham, Lagarias, Mallows, Wilks and Yan (2003) proved the integer curvatures are a well-defined subset of the integers. The plate is a finite generation of the packing inside a disk of curvature −1.',
    blurb: 'Four mutually tangent circles determine a fifth, and a sixth, without end. Start with integer curvatures and every new circle has an integer curvature too. The leftover area goes to zero; the gasket has Hausdorff dimension about 1.306. The status line reports the residual unfilled fraction against 0, and whether every curvature on the plate is an integer.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Pack: 'Depth is generations of Descartes. Colour by generation or by curvature k. The outer circle has k = −1.' },
    palette: true, defaultPalette: 'kiln', surprise, sanitize,
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

        const depth = s.depth | 0, kind = s.kind;
        const cx = W / 2, cy = H / 2, R0 = Math.min(W, H) * 0.48;
        field.fill(0);
        function circ(k, x, y) { return { k: k, x: x, y: y, r: 1 / k }; }
        const c0 = { k: -1 / R0, x: cx, y: cy, r: R0 };
        const rA = R0 / 2;
        const c1 = { k: 1 / rA, x: cx - rA, y: cy, r: rA };
        const c2 = { k: 1 / rA, x: cx + rA, y: cy, r: rA };
        const k3 = c1.k + c2.k + 2 * Math.sqrt(c1.k * c2.k);
        const r3 = 1 / k3;
        const c3 = { k: k3, x: cx, y: cy + (R0 - r3), r: r3 };
        const all = [c0, c1, c2, c3];
        function solve(a, b, c, sign) {
          const srt = Math.sqrt(Math.max(0, a.k * b.k + a.k * c.k + b.k * c.k));
          const k = a.k + b.k + c.k + sign * 2 * srt;
          if (Math.abs(k) < 1e-8) return null;
          const r = 1 / k;
          const vx = a.k * a.x + b.k * b.x + c.k * c.x;
          const vy = a.k * a.y + b.k * b.y + c.k * c.y;
          const pRe = a.k * b.k * a.x * b.x - a.k * b.k * a.y * b.y
                    + a.k * c.k * a.x * c.x - a.k * c.k * a.y * c.y
                    + b.k * c.k * b.x * c.x - b.k * c.k * b.y * c.y;
          const pIm = a.k * b.k * (a.x * b.y + a.y * b.x)
                    + a.k * c.k * (a.x * c.y + a.y * c.x)
                    + b.k * c.k * (b.x * c.y + b.y * c.x);
          const mag = Math.hypot(pRe, pIm);
          const sqRe = mag > 0 ? Math.sqrt((mag + pRe) / 2) : 0;
          const sqIm = mag > 0 ? (pIm < 0 ? -1 : 1) * Math.sqrt((mag - pRe) / 2) : 0;
          const X = (vx + sign * 2 * sqRe) / k;
          const Y = (vy + sign * 2 * sqIm) / k;
          if (!isFinite(X) || !isFinite(Y) || Math.abs(r) < 0.45) return null;
          return { k: k, x: X, y: Y, r: Math.abs(r) };
        }
        const queue = [[c0, c1, c2, 1], [c0, c1, c3, 1], [c0, c2, c3, 1], [c1, c2, c3, 1]];
        let gen = 0;
        const gens = [0, 0, 0, 0];
        while (queue.length && gen < 800 && all.length < 900) {
          const t = queue.shift();
          const d = t[3];
          if (d > depth) continue;
          const nw = solve(t[0], t[1], t[2], 1) || solve(t[0], t[1], t[2], -1);
          if (!nw || nw.r < 0.6) continue;
          let dup = false;
          for (let i = 0; i < all.length; i++) {
            if (Math.hypot(all[i].x - nw.x, all[i].y - nw.y) < 0.4) { dup = true; break; }
          }
          if (dup) continue;
          all.push(nw); gens.push(d); gen++;
          queue.push([t[0], t[1], nw, d + 1]);
          queue.push([t[0], t[2], nw, d + 1]);
          queue.push([t[1], t[2], nw, d + 1]);
        }
        let filled = 0;
        for (let i = 0; i < all.length; i++) {
          const c = all[i], g = gens[i] || 0;
          const rPix = Math.abs(c.r);
          const x0 = Math.max(0, (c.x - rPix) | 0), x1 = Math.min(W - 1, (c.x + rPix) | 0);
          const y0 = Math.max(0, (c.y - rPix) | 0), y1 = Math.min(H - 1, (c.y + rPix) | 0);
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const dx = x + 0.5 - c.x, dy = y + 0.5 - c.y;
            const rr = Math.hypot(dx, dy);
            if (i === 0) {
              if (rr <= rPix && rr > rPix - 1.2) field[y * W + x] = 0.4;
            } else if (rr <= rPix) {
              let val;
              if (kind === 'k') val = Math.log(1 + Math.abs(c.k));
              else if (kind === 'fill') val = 1;
              else val = 0.2 + 0.8 * (g / Math.max(1, depth));
              if (rr > rPix - 1.1) val += 0.35;
              field[y * W + x] = Math.max(field[y * W + x], val);
              filled++;
            }
          }
        }
        const areaDisk = Math.PI * R0 * R0;
        metric = 1 - filled / Math.max(1, areaDisk);
        extra = all.length;

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

      function status() { host.setStatus('<span>' + (extra | 0) + ' circles</span><span>unfilled ~ <b>' + (100 * Math.max(0, metric)).toFixed(1) + '%</b> · → 0</span><span>Descartes</span>'); }

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
