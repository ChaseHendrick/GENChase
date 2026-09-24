
/* modules/cloak.js */
/* GENChase: Pendry transformation-optics cloak. Rays that would hit a disk are mapped around it. Interior hits are counted. */
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

  // The Grid slider and sanitize() read the same bounds, so no slider position is clamped away.
  const GRID_MIN = 128, GRID_MAX = 224;
  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, GRID_MIN, GRID_MAX, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Cloak', 'R1', 'Core R1', GEOM, 8, 40, 1, v => v + ''),
    RANGE('Cloak', 'R2', 'Shell R2', GEOM, 20, 80, 1, v => v + ''),
    RANGE('Cloak', 'rays', 'Rays', GEOM, 16, 80, 2, v => v + ''),
    { group: 'Cloak', key: 'on', label: 'Cloak', type: 'seg', kind: GEOM, options: [['on', 'On'], ['off', 'Off']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', R1: 18, R2: 48, rays: 36, on: 'on', view: 'int', exposure: 1 };
  const PRESETS = {
    cloaked: pre('Cloaked', { on: 'on', R1: 18, R2: 48 }, Pal.glacier),
    bare: pre('Bare disk', { on: 'off', R1: 18, R2: 48 }, Pal.ember),
    tight: pre('Thin shell', { on: 'on', R1: 22, R2: 34, rays: 40 }, Pal.nightshade),
    fat: pre('Fat shell', { on: 'on', R1: 14, R2: 64 }, Pal.harbor),
    many: pre('Many rays', { on: 'on', rays: 64 }, Pal.thermal),
    core: pre('Large core', { on: 'on', R1: 28, R2: 52 }, Pal.kiln),
  };

  function surprise(rng) { return { on: rng() < 0.25 ? 'off' : 'on', R1: rng.int(12, 28), R2: rng.int(36, 64), rays: rng.int(24, 56) }; }
  function sanitize(s) { s.grid = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'cloak', name: 'Pendry Cloak', tab: 'Cloak',
    subtitle: 'a disk that light goes around · 2006',
    order: 58,
    equation: 'r = R1 + r\' (R2-R1)/R2,   n_r = (r-R1)/r · R2/(R2-R1),   n_θ = r / (r-R1)',
    credit: 'J. B. Pendry, D. Schurig and D. R. Smith, Science 312, 1780 (2006). A coordinate transformation that blows a point into a disk pulls every ray around the hole. In the virtual plane the rays are straight; in the physical plane they miss the core. The plate traces that map, not a fabricated metamaterial.',
    blurb: 'Invisibility, of a kind: a coordinate change that opens a hole in space and tells light to go around it. Inside the core, no ray. Switch the cloak off and the same rays hit the disk. The status line reports the fraction of sample points that land in the core, against 0 for a working cloak.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Cloak: 'R2 must exceed R1. A thin shell is a harsher index; a fat one is gentler.' },
    palette: true, defaultPalette: 'glacier', surprise, sanitize,
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

        const R1 = Math.min(s.R1, s.R2 - 4), R2 = s.R2, nR = s.rays | 0, on = s.on === 'on';
        const cx = W / 2, cy = H / 2;
        field.fill(0);
        function splat(x, y, w) {
          const xi = Math.round(x), yi = Math.round(y);
          if (xi >= 0 && yi >= 0 && xi < W && yi < H) field[yi * W + xi] += w;
        }
        let hits = 0, tot = 0;
        for (let r = 0; r < nR; r++) {
          const y0 = (r + 0.5) / nR * H;
          for (let xs = 0; xs < W; xs += 0.7) {
            const X = xs - cx, Y = y0 - cy;
            const rp = Math.hypot(X, Y);
            tot++;
            let px = xs, py = y0;
            if (on && rp < R2) {
              if (rp < 1e-6) { hits++; continue; }
              const rPhys = R1 + rp * (R2 - R1) / R2;
              const sc = rPhys / rp;
              px = cx + X * sc; py = cy + Y * sc;
              if (rPhys <= R1 + 0.5) hits++;
            } else {
              if (rp < R1) hits++;
            }
            splat(px, py, 1);
          }
        }
        metric = hits / Math.max(1, tot);
        extra = on ? 0 : 1;

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

      function status() { host.setStatus('<span>core hits <b>' + (100 * metric).toFixed(1) + '%</b></span><span>theory ' + (host.getState().on === 'on' ? '0' : 'geometric') + '</span><span>' + (host.getState().on === 'on' && metric < 0.08 ? 'cloaked' : 'visible') + '</span>'); }

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
