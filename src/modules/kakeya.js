
/* modules/kakeya.js */
/* GENChase: Besicovitch / Perron-tree Kakeya set. Unit needles in every direction packed into small area. Occupied fraction is measured. */
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
    RANGE('Set', 'needles', 'Needles', GEOM, 12, 90, 2, v => v + ''),
    RANGE('Set', 'overlap', 'Overlap', GEOM, 0.15, 0.9, 0.05, f2),
    RANGE('Set', 'thick', 'Thickness', GEOM, 0.6, 3.5, 0.1, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', needles: 36, overlap: 0.55, thick: 1.2, view: 'int', exposure: 1 };
  const PRESETS = {
    tree: pre('Perron tree', { needles: 40, overlap: 0.6 }, Pal.kiln),
    sparse: pre('Sparse', { needles: 16, overlap: 0.2, thick: 1.6 }, Pal.harbor),
    packed: pre('Packed', { needles: 72, overlap: 0.8, thick: 0.8 }, Pal.ember),
    fat: pre('Fat needles', { thick: 2.6, needles: 24, overlap: 0.4 }, Pal.graphite),
    log: pre('Log', { view: 'log', needles: 48 }, Pal.nightshade),
    fine: pre('Fine', { needles: 64, thick: 0.7, overlap: 0.7 }, Pal.thermal),
  };

  function surprise(rng) { return { needles: rng.int(18, 70), overlap: rng.range(0.25, 0.8), thick: rng.range(0.8, 2.2) }; }
  function sanitize(s) { s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'kakeya', name: 'Kakeya', tab: 'Kakeya',
    subtitle: 'a needle rotated in arbitrarily small area · 1919',
    order: 61,
    equation: 'K_ε ⊃ a unit segment in every direction,   |K_ε| → 0 as ε → 0',
    credit: 'S. Kakeya asked in 1917 for the smallest set in which a unit needle can be rotated. Besicovitch (1919/1928) showed the infimum of the area is zero: a Perron tree of overlapping triangles contains a unit segment in a dense set of directions and can be made as thin as one likes. The plate is a finite Perron-like union, not the infinite construction.',
    blurb: 'To turn a needle through every angle you would think you need a disk of area π/4. Besicovitch built a set of area as small as you please that still contains a unit segment in every direction. The plate is a finite sprouting of those needles, packed so they share area. The status line reports occupied fraction against π/4 for a spinning disk.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Set: 'Overlap slides the triangles together. More needles, more directions, not necessarily more area.' },
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

        const n = s.needles | 0, ov = s.overlap, th = s.thick;
        field.fill(0);
        const cx = W / 2, cy = H / 2, L = Math.min(W, H) * 0.42;
        for (let k = 0; k < n; k++) {
          const ang = Math.PI * k / n;
          const slide = (k - n / 2) * ov * L * 0.04;
          const dx = Math.cos(ang), dy = Math.sin(ang);
          const px = -dy, py = dx;
          const ox = cx + slide * px, oy = cy + slide * py;
          for (let t = -L; t <= L; t += 0.55) {
            for (let spt = -th; spt <= th; spt += 0.5) {
              const x = ox + t * dx + spt * px, y = oy + t * dy + spt * py;
              const xi = x | 0, yi = y | 0;
              if (xi >= 0 && yi >= 0 && xi < W && yi < H) field[yi * W + xi] += 1;
            }
          }
        }
        let occ = 0;
        for (let i = 0; i < field.length; i++) if (field[i] > 0.5) occ++;
        metric = occ / (W * H);
        extra = Math.PI / 4;

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

      function status() { host.setStatus('<span>occupied <b>' + (100 * metric).toFixed(1) + '%</b></span><span>disk π/4 = ' + (100 * extra).toFixed(0) + '%</span><span>' + (metric < extra * 0.85 ? 'smaller than a disk' : 'not yet thin') + '</span>'); }

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
