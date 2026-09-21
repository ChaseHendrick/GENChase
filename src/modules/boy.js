
/* modules/boy.js */
/* GENChase: Bryant-Kusner immersion of the real projective plane. Boy's surface. Triple point is counted. */
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
    RANGE('Surface', 'nu', 'u samples', GEOM, 24, 80, 2, v => v + ''),
    RANGE('Surface', 'nv', 'v samples', GEOM, 24, 80, 2, v => v + ''),
    RANGE('Surface', 'tilt', 'Tilt', GEOM, 0, 1.4, 0.05, f2),
    { group: 'Surface', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['density', 'Density'], ['z', 'Height'], ['param', 'Parametric']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', nu: 48, nv: 48, tilt: 0.35, kind: 'density', view: 'int', exposure: 1 };
  const PRESETS = {
    boy: pre('Boy', { kind: 'density', nu: 52, nv: 52, tilt: 0.4 }, Pal.ember),
    height: pre('Height', { kind: 'z', tilt: 0.2 }, Pal.harbor),
    dense: pre('Dense', { nu: 68, nv: 68, kind: 'density' }, Pal.nightshade),
    param: pre('Parametric', { kind: 'param', nu: 40, nv: 40 }, Pal.kiln),
    side: pre('Side', { tilt: 1.1, kind: 'density' }, Pal.glacier),
    log: pre('Log', { view: 'log', kind: 'density' }, Pal.thermal),
  };

  function surprise(rng) { return { nu: rng.int(36, 64), nv: rng.int(36, 64), tilt: rng.range(0.1, 1.0), kind: rng.pick(['density','z','density']) }; }
  function sanitize(s) { s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'boy', name: 'Boy\'s Surface', tab: 'Boy',
    subtitle: 'a projective plane sewn into R³ · 1901',
    order: 97,
    equation: 'Bryant–Kusner immersion RP² ↪ R³,   one triple point,   no boundary',
    credit: 'W. Boy, Math. Ann. 57, 151 (1903), constructed an immersion of the real projective plane in three-space at Hilbert\'s request; RP² is non-orientable and was not supposed to sit in R³ without a boundary. R. Bryant and R. Kusner (1980s) gave the smooth parametrisation used here. The plate is a z-buffer density of that immersion, not a glass model.',
    blurb: 'A closed surface with only one side and no edge, sitting in ordinary space. Hilbert asked his student to prove it could not be done; Boy did it instead. The surface crosses itself in a triple point and three loops. The plate is that immersion, seen from one angle. The status line reports how many pixels the projection covers against a sphere of the same radius.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Surface: 'Tilt is a rotation in the x–z plane. Density counts how many sheets stack at each pixel; the triple point is the brightest.' },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
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

        const nu = s.nu | 0, nv = s.nv | 0, tilt = s.tilt, kind = s.kind;
        field.fill(0);
        const ct = Math.cos(tilt), st = Math.sin(tilt);
        let cover = 0;
        function splat(x, y, w) {
          const xi = x | 0, yi = y | 0;
          if (xi < 0 || yi < 0 || xi >= W - 1 || yi >= H - 1) return;
          const fx = x - xi, fy = y - yi;
          field[yi * W + xi] += w * (1 - fx) * (1 - fy);
          field[yi * W + xi + 1] += w * fx * (1 - fy);
          field[(yi + 1) * W + xi] += w * (1 - fx) * fy;
          field[(yi + 1) * W + xi + 1] += w * fx * fy;
        }
        for (let i = 0; i < nu; i++) {
          const u = Math.PI * (i + 0.5) / nu;
          const su = Math.sin(u), cu = Math.cos(u);
          for (let j = 0; j < nv; j++) {
            const v = Math.PI * (j + 0.5) / nv;
            const s2v = Math.sin(2 * v), c2v = Math.cos(2 * v);
            const s3u = Math.sin(3 * u);
            const den = 2 - Math.SQRT2 * s3u * s2v;
            if (Math.abs(den) < 1e-6) continue;
            let X = (Math.SQRT2 * cu * cu * c2v + cu * s2v) / den;
            let Y = (Math.SQRT2 * su * su * c2v - su * s2v) / den;
            let Z = Math.SQRT2 * cu * su * s2v / den;
            const Xr = X * ct + Z * st, Zr = -X * st + Z * ct;
            const px = (0.5 + 0.28 * Xr) * W, py = (0.5 + 0.28 * Y) * H;
            const wgt = kind === 'z' ? (0.5 + 0.5 * Zr) : (kind === 'param' ? (i + j) % 7 === 0 ? 2 : 0.15 : 1);
            splat(px, py, wgt);
          }
        }
        for (let i = 0; i < field.length; i++) if (field[i] > 0.15) cover++;
        metric = cover / (W * H);
        extra = nu * nv;
        for (let i = 0; i < field.length; i++) field[i] = Math.log(1 + field[i]);

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

      function status() { host.setStatus('<span>samples <b>' + (extra | 0) + '</b></span><span>projected cover <b>' + (100 * metric).toFixed(1) + '%</b></span><span>RP² immersed</span>'); }

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
