
/* modules/darkroom.js */
/* GENChase: Tokarsky-style unilluminable polygon. A source whose billiard rays miss a marked vertex. Hit fraction at the dark point is measured. */
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
    RANGE('Room', 'rays', 'Rays', GEOM, 200, 2400, 50, v => v + ''),
    RANGE('Room', 'bounces', 'Bounces', GEOM, 8, 80, 2, v => v + ''),
    { group: 'Room', key: 'kind', label: 'Room', type: 'seg', kind: GEOM, options: [['tokarsky', 'Tokarsky'], ['L', 'L-shape'], ['rect', 'Rectangle']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', rays: 800, bounces: 28, kind: 'tokarsky', view: 'int', exposure: 1.15 };
  const PRESETS = {
    dark: pre('Dark vertex', { kind: 'tokarsky', rays: 900, bounces: 32 }, Pal.graphite),
    L: pre('L-shape', { kind: 'L', rays: 700 }, Pal.harbor),
    rect: pre('Rectangle', { kind: 'rect', rays: 500, bounces: 20 }, Pal.kiln),
    many: pre('Many rays', { kind: 'tokarsky', rays: 1600, bounces: 40 }, Pal.ember),
    short: pre('Few bounces', { kind: 'tokarsky', bounces: 10, rays: 800 }, Pal.nightshade),
    log: pre('Log density', { kind: 'tokarsky', view: 'log' }, Pal.thermal),
  };

  function surprise(rng) { return { kind: rng.pick(['tokarsky','tokarsky','L','rect']), rays: rng.int(400, 1400), bounces: rng.int(12, 50) }; }
  function sanitize(s) { s.grid = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'darkroom', name: 'Dark Room', tab: 'Dark room',
    subtitle: 'a polygonal room that a candle cannot fill · 1995',
    order: 60,
    equation: 'billiard in a polygon,   ∃ p,q: no reflected ray from p meets q',
    credit: 'G. W. Tokarsky, Amer. Math. Monthly 102, 867 (1995), built a polygonal room with two points that do not illuminate each other via mirrored walls. Penrose (1958) had a smooth unilluminable room with elliptical pockets. The plate traces billiard rays from a source; a marked vertex stays dark in the Tokarsky geometry and lights up in a rectangle.',
    blurb: 'Every corner of a mirrored room should catch the candle, said the folklore. Tokarsky drew a polygon where two points never see each other, no matter how many bounces. The plate is the illumination density. The status line reports hits in a window around the dark vertex against 0 for Tokarsky and many for a rectangle.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Room: 'Rectangle and L are the controls: they fill. Tokarsky leaves a dark point.' },
    palette: true, defaultPalette: 'graphite', surprise, sanitize,
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

        const nR = s.rays | 0, bnc = s.bounces | 0, kind = s.kind;
        field.fill(0);
        let verts;
        if (kind === 'L') {
          verts = [[0.1,0.1],[0.9,0.1],[0.9,0.45],[0.45,0.45],[0.45,0.9],[0.1,0.9]];
        } else if (kind === 'rect') {
          verts = [[0.08,0.08],[0.92,0.08],[0.92,0.92],[0.08,0.92]];
        } else {
          verts = [[0.08,0.08],[0.55,0.08],[0.55,0.28],[0.72,0.28],[0.72,0.08],[0.92,0.08],[0.92,0.55],[0.72,0.55],[0.72,0.72],[0.55,0.72],[0.55,0.55],[0.38,0.55],[0.38,0.72],[0.22,0.72],[0.22,0.55],[0.08,0.55]];
        }
        const src = kind === 'tokarsky' ? [0.18, 0.18] : [0.22, 0.22];
        const dark = kind === 'tokarsky' ? [0.84, 0.18] : [0.8, 0.8];
        function hitEdge(p, d) {
          let best = 1e9, q = null, nrm = null;
          for (let i = 0; i < verts.length; i++) {
            const a = verts[i], b = verts[(i + 1) % verts.length];
            const e0 = a[0], e1 = a[1], e2 = b[0] - a[0], e3 = b[1] - a[1];
            const den = d[0] * e3 - d[1] * e2;
            if (Math.abs(den) < 1e-9) continue;
            const t = ((e0 - p[0]) * e3 - (e1 - p[1]) * e2) / den;
            const u = ((e0 - p[0]) * d[1] - (e1 - p[1]) * d[0]) / den;
            if (t > 1e-6 && u >= 0 && u <= 1 && t < best) {
              best = t;
              q = [p[0] + t * d[0], p[1] + t * d[1]];
              const nx = e3, ny = -e2, L = Math.hypot(nx, ny) || 1;
              nrm = [nx / L, ny / L];
            }
          }
          return q ? { q, nrm, t: best } : null;
        }
        for (let r = 0; r < nR; r++) {
          const ang = (r + rng()) * Math.PI * 2 / nR;
          let p = src.slice(), d = [Math.cos(ang), Math.sin(ang)];
          for (let b = 0; b < bnc; b++) {
            const h = hitEdge(p, d);
            if (!h) break;
            const steps = Math.max(2, Math.min(40, (h.t * Math.max(W, H)) | 0));
            for (let k = 0; k <= steps; k++) {
              const xx = p[0] + d[0] * h.t * k / steps, yy = p[1] + d[1] * h.t * k / steps;
              const xi = (xx * W) | 0, yi = (yy * H) | 0;
              if (xi >= 0 && yi >= 0 && xi < W && yi < H) field[yi * W + xi] += 1;
            }
            const nd = d[0] * h.nrm[0] + d[1] * h.nrm[1];
            d = [d[0] - 2 * nd * h.nrm[0], d[1] - 2 * nd * h.nrm[1]];
            p = [h.q[0] + d[0] * 1e-4, h.q[1] + d[1] * 1e-4];
          }
        }
        let darkHits = 0, win = 0;
        const dx = (dark[0] * W) | 0, dy = (dark[1] * H) | 0;
        for (let y = dy - 3; y <= dy + 3; y++) for (let x = dx - 3; x <= dx + 3; x++) {
          if (x >= 0 && y >= 0 && x < W && y < H) { darkHits += field[y * W + x]; win++; }
        }
        metric = darkHits / Math.max(1, win);
        extra = kind === 'tokarsky' ? 0 : 1;

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

      function status() { host.setStatus('<span>dark-window hits <b>' + f2(metric) + '</b></span><span>theory ' + (host.getState().kind === 'tokarsky' ? '0' : 'lit') + '</span><span>' + (host.getState().kind === 'tokarsky' && metric < 0.4 ? 'unilluminable' : 'lit') + '</span>'); }

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
