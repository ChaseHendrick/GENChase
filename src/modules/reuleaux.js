
/* modules/reuleaux.js */
/* GENChase: Reuleaux triangle. Constant width that is not a circle. Width versus angle is measured against the side length. */
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
    RANGE('Body', 'R', 'Side R', GEOM, 24, 80, 1, v => v + ''),
    RANGE('Body', 'frames', 'Roll frames', GEOM, 8, 48, 2, v => v + ''),
    { group: 'Body', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['roll', 'Rolling'], ['shape', 'Shape'], ['width', 'Width rose']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', R: 44, frames: 24, kind: 'roll', view: 'int', exposure: 1 };
  const PRESETS = {
    roll: pre('Square drill', { kind: 'roll', R: 44, frames: 28 }, Pal.kiln),
    shape: pre('Triangle', { kind: 'shape', R: 52 }, Pal.harbor),
    rose: pre('Width rose', { kind: 'width', R: 48 }, Pal.ember),
    fat: pre('Fat', { R: 64, kind: 'shape' }, Pal.nightshade),
    many: pre('Many frames', { frames: 40, kind: 'roll' }, Pal.graphite),
    log: pre('Log', { view: 'log', kind: 'roll' }, Pal.thermal),
  };

  function surprise(rng) { return { R: rng.int(32, 64), frames: rng.int(14, 36), kind: rng.pick(['roll','shape','width']) }; }
  function sanitize(s) { s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'reuleaux', name: 'Reuleaux', tab: 'Reuleaux',
    subtitle: 'a non-circle of constant width · 1875',
    order: 99,
    equation: 'width(θ) = R  for all θ,   W ≠ a disk,   area = ½(π − √3) R²',
    credit: 'F. Reuleaux, The Kinematics of Machinery (1875), described the curved triangle of constant width now named for him. Euler had already noted constant-width bodies; a wheel does not have to be a circle to keep its axle at constant height. The same shape, rotated in a square, drills a hole that is almost square. The plate is the rolling body and the width rose, which theory says is a circle.',
    blurb: 'A wheel does not have to be round. A Reuleaux triangle has the same width in every direction, so it rolls between two rails at constant height, and yet it is not a disk. Watts used it; Harry Watts (no relation) used it to drill square holes. The status line reports the standard deviation of the support width against 0.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Body: 'Rolling is the square-hole movie stacked as density. Width rose should be a perfect circle of radius R.' },
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

        const R = s.R, nF = s.frames | 0, kind = s.kind;
        const cx = W / 2, cy = H / 2;
        field.fill(0);
        const v0 = [0, -R / Math.sqrt(3)], v1 = [R / 2, R / (2 * Math.sqrt(3))], v2 = [-R / 2, R / (2 * Math.sqrt(3))];
        function rot(p, ang) {
          const c = Math.cos(ang), s2 = Math.sin(ang);
          return [p[0] * c - p[1] * s2, p[0] * s2 + p[1] * c];
        }
        function splat(x, y, w) {
          const xi = Math.round(x), yi = Math.round(y);
          if (xi >= 0 && yi >= 0 && xi < W && yi < H) field[yi * W + xi] += w;
        }
        function inReuleaux(p, verts) {
          const d0 = Math.hypot(p[0] - verts[0][0], p[1] - verts[0][1]);
          const d1 = Math.hypot(p[0] - verts[1][0], p[1] - verts[1][1]);
          const d2 = Math.hypot(p[0] - verts[2][0], p[1] - verts[2][1]);
          return d0 <= R + 0.6 && d1 <= R + 0.6 && d2 <= R + 0.6;
        }
        const widths = [];
        if (kind === 'width') {
          for (let a = 0; a < 180; a++) {
            const ang = a * Math.PI / 180;
            const dir = [Math.cos(ang), Math.sin(ang)];
            let mn = 1e9, mx = -1e9;
            const verts = [v0, v1, v2];
            for (let k = 0; k < 3; k++) {
              const pr = verts[k][0] * dir[0] + verts[k][1] * dir[1];
              if (pr < mn) mn = pr; if (pr > mx) mx = pr;
            }
            for (let k = 0; k < 3; k++) {
              const A = verts[k], B = verts[(k + 1) % 3];
              for (let t = 0; t <= 12; t++) {
                const px = A[0] + (B[0] - A[0]) * (t / 12), py = A[1] + (B[1] - A[1]) * (t / 12);
                const pr = px * dir[0] + py * dir[1];
                if (pr < mn) mn = pr; if (pr > mx) mx = pr;
              }
            }
            widths.push(mx - mn);
            const rr = 0.35 * Math.min(W, H) * ((mx - mn) / R);
            splat(cx + rr * dir[0], cy + rr * dir[1], 2);
            splat(cx - rr * dir[0], cy - rr * dir[1], 2);
          }
        } else {
          const frames = kind === 'shape' ? 1 : nF;
          for (let f = 0; f < frames; f++) {
            const ang = (f / Math.max(1, frames)) * Math.PI * 2 / 3;
            const verts = [rot(v0, ang), rot(v1, ang), rot(v2, ang)];
            const ox = kind === 'roll' ? (f / Math.max(1, frames - 1) - 0.5) * W * 0.15 : 0;
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              const p = [x + 0.5 - cx - ox, y + 0.5 - cy];
              if (inReuleaux(p, verts)) field[y * W + x] += kind === 'shape' ? 1 : 0.35;
            }
          }
          for (let a = 0; a < 72; a++) {
            const ang = a * Math.PI / 36;
            const dir = [Math.cos(ang), Math.sin(ang)];
            let mn = 1e9, mx = -1e9;
            for (let k = 0; k < 3; k++) {
              const pr = v0[0]; // dummy
            }
            const verts = [v0, v1, v2];
            for (let k = 0; k < 3; k++) {
              const pr = verts[k][0] * dir[0] + verts[k][1] * dir[1];
              if (pr < mn) mn = pr; if (pr > mx) mx = pr;
            }
            widths.push(mx - mn);
          }
        }
        let mean = 0; for (let i = 0; i < widths.length; i++) mean += widths[i];
        mean /= Math.max(1, widths.length);
        let varw = 0; for (let i = 0; i < widths.length; i++) varw += (widths[i] - mean) * (widths[i] - mean);
        metric = Math.sqrt(varw / Math.max(1, widths.length)) / Math.max(1e-6, mean);
        extra = mean;

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

      function status() { host.setStatus('<span>mean width <b>' + f2(extra) + '</b> · R ' + (host.getState().R | 0) + '</span><span>σ/mean <b>' + f3(metric) + '</b> · theory 0</span><span>constant width</span>'); }

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
