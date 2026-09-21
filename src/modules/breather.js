
/* modules/breather.js */
/* GENChase: sine-Gordon breather. A localised oscillation that does not radiate. Exterior energy is measured against the total. */
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
    RANGE('Field', 'beta', 'Envelope β', GEOM, 0.15, 0.85, 0.05, f2),
    RANGE('Field', 't0', 'Time centre', GEOM, -8, 8, 0.2, f2),
    RANGE('Field', 'span', 'Window', GEOM, 8, 24, 0.5, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '4:5', beta: 0.45, t0: 0, span: 14, view: 'int', exposure: 1 };
  const PRESETS = {
    live: pre('Breather', { beta: 0.45, t0: 0 }, Pal.bioluminescent),
    tight: pre('Tight', { beta: 0.75, span: 10 }, Pal.ember),
    wide: pre('Wide', { beta: 0.22, span: 18 }, Pal.glacier),
    late: pre('Late', { t0: 4, beta: 0.5 }, Pal.nightshade),
    log: pre('Log', { view: 'log', beta: 0.4 }, Pal.thermal),
    peak: pre('Peak', { t0: 0, span: 8, beta: 0.55 }, Pal.harbor),
  };

  function surprise(rng) { return { beta: rng.range(0.2, 0.75), t0: rng.range(-3, 3), span: rng.range(10, 18) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'breather', name: 'SG Breather', tab: 'Breather',
    subtitle: 'a lump that oscillates and never radiates · 1962',
    order: 62,
    equation: 'u_tt − u_xx + sin u = 0,   u = 4 arctan[ (β/α) sin(α t) sech(β x) ],   α²+β² = 1',
    credit: 'The sine-Gordon breather is an exact, time-periodic, spatially localised solution; see Seeger, Donth and Kochendörfer (1953) and the inverse-scattering account of Faddeev and Takhtajan. Linear waves radiate. This one does not: the envelope sech(β x) holds a bound oscillation forever. The plate is spacetime of u.',
    blurb: 'A lump of field that rings in place and never sheds a wave. Linear PDEs cannot do this; sine-Gordon can, because the oscillation sits below the phonon band. The plate is that spacetime. The status line reports energy outside a window of width 6/β against the total, which should stay near 0.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Field: 'β sets how tight the envelope is. α = sqrt(1-β²) is the internal frequency.' },
    palette: true, defaultPalette: 'bioluminescent', surprise, sanitize,
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

        const b = U.clamp(s.beta, 0.05, 0.95), a = Math.sqrt(Math.max(0, 1 - b * b)), L = s.span, t0 = s.t0;
        let eOut = 0, eAll = 0;
        const wCut = 3 / Math.max(0.1, b);
        for (let y = 0; y < H; y++) {
          const t = t0 + L * (y / Math.max(1, H - 1) - 0.5);
          for (let x = 0; x < W; x++) {
            const xx = L * (x / Math.max(1, W - 1) - 0.5);
            const u = 4 * Math.atan((b / Math.max(0.05, a)) * Math.sin(a * t) / Math.cosh(Math.max(-20, Math.min(20, b * xx))));
            field[y * W + x] = u;
            const e = u * u;
            eAll += e;
            if (Math.abs(xx) > wCut) eOut += e;
          }
        }
        metric = eOut / Math.max(1e-12, eAll);
        extra = a;

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

      function status() { host.setStatus('<span>ω = α <b>' + f2(extra) + '</b></span><span>E_out / E <b>' + f3(metric) + '</b> · theory 0</span><span>' + (metric < 0.08 ? 'bound' : 'leaking') + '</span>'); }

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
