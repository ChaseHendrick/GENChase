
/* modules/anderson.js */
/* GENChase: 2D Anderson localisation by imaginary-time relaxation. Inverse participation ratio is measured from the plate. */
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
    RANGE('Lattice', 'Wdis', 'Disorder W', GEOM, 0, 8, 0.1, f2, { hint: 'W = 0 is a plane wave. In 2D any W > 0 localises, but the length is exponential in 1/W² so a small grid looks extended until W is a few hoppings.' }),
    RANGE('Lattice', 'hop', 'Hopping t', GEOM, 0.4, 2, 0.05, f2),
    RANGE('Lattice', 'relax', 'Relax steps', GEOM, 40, 400, 10, v => v + ''),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 96, aspect: '1:1', Wdis: 3.2, hop: 1, relax: 140, view: 'int', exposure: 1.1 };
  const PRESETS = {
    loc: pre('Localised', { Wdis: 4.5, relax: 160 }, Pal.ember),
    ext: pre('Almost extended', { Wdis: 0.4, relax: 120 }, Pal.harbor),
    crit: pre('Strong disorder', { Wdis: 6.5, relax: 180 }, Pal.thermal),
    clean: pre('No disorder', { Wdis: 0, relax: 80 }, Pal.glacier),
    mid: pre('Moderate', { Wdis: 2.2, relax: 150 }, Pal.nightshade),
    tight: pre('Pinned', { Wdis: 7.2, hop: 0.7, relax: 200 }, Pal.xray),
  };

  function surprise(rng) { return { Wdis: rng.range(0.5, 6.5), hop: rng.range(0.7, 1.4) }; }
  function sanitize(s) { s.grid = Math.max(64, Math.min(160, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'anderson', name: 'Anderson', tab: 'Anderson',
    subtitle: 'waves that refuse to diffuse · 1958',
    order: 52,
    equation: 'H = t Σ_<ij> |i><j| + Σ_i ε_i |i><i|,   ε ~ U[-W/2,W/2],   IPR = Σ |ψ|⁴',
    credit: 'P. W. Anderson, Phys. Rev. 109, 1492 (1958). A random potential can trap a wave that classical intuition says must spread. Abrahams, Anderson, Licciardello and Ramakrishnan (1979) argued that in two dimensions all states localise. The plate is imaginary-time relaxation to the ground state of a tight-binding square, not a wave-packet detector (that lives on Schrödinger).',
    blurb: 'A wave in a random landscape does not diffuse. It finds a well and sits. Anderson showed that enough disorder turns extended Bloch waves into exponentially localised eigenstates; in 2D the scaling theory says this happens at any disorder, though the length can exceed the plate. The status line reports the inverse participation ratio against 1/N (extended) and O(1) (a few sites).',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Lattice: 'IPR near 1/N is extended on this grid. IPR above a few percent is a localised well.' },
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

        const t = s.hop, Wd = s.Wdis, steps = s.relax | 0;
        const pot = new Float32Array(W * H);
        for (let i = 0; i < pot.length; i++) pot[i] = (rng() - 0.5) * Wd;
        let psi = new Float32Array(W * H), nxt = new Float32Array(W * H);
        for (let i = 0; i < psi.length; i++) psi[i] = rng.gauss();
        const dt = 0.12 / (4 * t + Wd + 1);
        for (let k = 0; k < steps; k++) {
          let n2 = 0;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const n = psi[y * W + (x + 1) % W] + psi[y * W + (x + W - 1) % W] + psi[((y + 1) % H) * W + x] + psi[((y + H - 1) % H) * W + x];
            const v = psi[i] - dt * (-t * n + (4 * t + pot[i]) * psi[i]);
            nxt[i] = v; n2 += v * v;
          }
          const inv = 1 / Math.sqrt(n2 || 1);
          for (let i = 0; i < psi.length; i++) psi[i] = nxt[i] * inv;
        }
        let ipr = 0, maxp = 0;
        for (let i = 0; i < psi.length; i++) {
          const p = psi[i] * psi[i];
          field[i] = p; ipr += p * p; if (p > maxp) maxp = p;
        }
        metric = ipr;
        extra = 1 / (W * H);

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

      function status() { host.setStatus('<span>IPR <b>' + f3(metric) + '</b> · 1/N ' + f3(extra) + '</span><span>' + (metric > 8 * extra ? 'localised' : 'extended on this grid') + '</span>'); }

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
