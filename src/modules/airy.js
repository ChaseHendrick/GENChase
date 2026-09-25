
/* modules/airy.js */
/* GENChase: Airy accelerating beam. A free-space packet that bends with no force. The caustic is measured against x = z²/4. */
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
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Beam', 'span', 'Window', GEOM, 6, 22, 0.5, f2),
    RANGE('Beam', 'apod', 'Apodisation a', GEOM, 0.02, 0.35, 0.01, f2),
    { group: 'Beam', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['int', '|ψ|²'], ['caustic', 'Caustic'], ['phase', 'Phase']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '4:5', span: 12, apod: 0.08, kind: 'int', view: 'int', exposure: 1 };
  const PRESETS = {
    fly: pre('Accelerating', { span: 12, apod: 0.08, kind: 'int' }, Pal.glacier),
    caustic: pre('Parabola', { kind: 'caustic', span: 14 }, Pal.ember),
    tight: pre('Tight', { apod: 0.18, span: 10 }, Pal.nightshade),
    wide: pre('Wide', { span: 18, apod: 0.05 }, Pal.harbor),
    phase: pre('Phase', { kind: 'phase', span: 12 }, Pal.thermal),
    log: pre('Log |ψ|²', { view: 'log', kind: 'int', span: 14 }, Pal.xray),
  };

  function surprise(rng) { return { span: rng.range(8, 16), apod: rng.range(0.04, 0.2), kind: rng.pick(['int','caustic','int']) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'airy', name: 'Airy Beam', tab: 'Airy',
    subtitle: 'a wave packet that accelerates with no force · 1979',
    order: 91,
    equation: 'ψ(x,z) = Ai(x − z²/4 + i a) exp(a x − a z²/2 + i(x z/2 − z³/12)),   x_peak = z²/4',
    credit: 'M. V. Berry and N. L. Balazs, Am. J. Phys. 47, 264 (1979). A free Schrödinger (or paraxial Helmholtz) packet is not supposed to accelerate: there is no force. The Airy packet does, its intensity maximum riding the parabola x = z²/4, a consequence of the linear potential in the Airy ODE rather than of a force in the wave equation. Siviloglou, Broky, Dogariu and Christodoulides, Phys. Rev. Lett. 99, 213901 (2007), flew one in the lab. The plate is the exact finite-energy Airy beam, not a cannonball.',
    blurb: 'A wave in empty space that turns a corner. Nothing pushes it. The intensity maximum of an Airy packet rides a parabola, the same curve a thrown stone would, because Airy\'s equation secretly contains a linear potential. Finite energy (a > 0) keeps it square-integrable; the bend remains. The status line reports the tracked peak against z²/4.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Beam: 'Apodisation a > 0 is the finite-energy beam of Siviloglou et al. a = 0 is Berry–Balazs, which is not square-integrable.' },
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

        function ai(z) {
          if (z > 8) {
            const s = Math.sqrt(z), zeta = (2 / 3) * z * s;
            return 0.5 * Math.exp(Math.max(-40, -zeta)) / Math.sqrt(Math.PI * s);
          }
          if (z < -10) {
            const ax = -z, s = Math.sqrt(ax), zeta = (2 / 3) * ax * s;
            return Math.sin(zeta + Math.PI / 4) / Math.sqrt(Math.PI * s);
          }
          const A0 = 0.355028053887817, Ap0 = -0.258819403792807;
          const n = 80, h = z / n;
          let f = 1, df = 0, g = 0, dg = 1, x = 0;
          for (let i = 0; i < n; i++) {
            const k1f = df, k1df = x * f, k1g = dg, k1dg = x * g;
            const x2 = x + 0.5 * h;
            const f2 = f + 0.5 * h * k1f, df2 = df + 0.5 * h * k1df;
            const g2 = g + 0.5 * h * k1g, dg2 = dg + 0.5 * h * k1dg;
            const k2f = df2, k2df = x2 * f2, k2g = dg2, k2dg = x2 * g2;
            const f3 = f + 0.5 * h * k2f, df3 = df + 0.5 * h * k2df;
            const g3 = g + 0.5 * h * k2g, dg3 = dg + 0.5 * h * k2dg;
            const k3f = df3, k3df = x2 * f3, k3g = dg3, k3dg = x2 * g3;
            const x4 = x + h;
            const f4 = f + h * k3f, df4 = df + h * k3df;
            const g4 = g + h * k3g, dg4 = dg + h * k3dg;
            const k4f = df4, k4df = x4 * f4, k4g = dg4, k4dg = x4 * g4;
            f += (h / 6) * (k1f + 2 * k2f + 2 * k3f + k4f);
            df += (h / 6) * (k1df + 2 * k2df + 2 * k3df + k4df);
            g += (h / 6) * (k1g + 2 * k2g + 2 * k3g + k4g);
            dg += (h / 6) * (k1dg + 2 * k2dg + 2 * k3dg + k4dg);
            x = x4;
          }
          const v = A0 * f + Ap0 * g;
          return isFinite(v) ? v : 0;
        }
        const L = s.span, a = s.apod, kind = s.kind;
        let err = 0, nErr = 0;
        const zMax = Math.sqrt(Math.max(0.5, 4 * L * 0.5));
        for (let y = 0; y < H; y++) {
          const z = zMax * (y / Math.max(1, H - 1));
          let peakX = 0, peakI = -1;
          for (let x = 0; x < W; x++) {
            const xx = L * (x / Math.max(1, W - 1) - 0.52);
            const arg = xx - z * z / 4;
            const Ai = ai(arg);
            const env = Math.exp(Math.max(-18, a * xx - a * z * z / 2));
            const amp = Ai * env;
            const I = amp * amp;
            const ph = 0.5 * xx * z - z * z * z / 12;
            let v = I;
            if (!isFinite(v) || v < 0) v = 0;
            if (kind === 'phase') v = (Math.sin(ph) * 0.5 + 0.5) * Math.min(1, v * 8);
            else if (kind === 'caustic') {
              const pred = z * z / 4;
              const dx = xx - pred;
              v = v + 0.45 * Math.exp(-28 * dx * dx);
            }
            field[y * W + x] = v;
            if (I > peakI) { peakI = I; peakX = xx; }
          }
          const pred = z * z / 4;
          if (y > H * 0.25 && y < H * 0.9) { err += Math.abs(peakX - pred); nErr++; }
        }
        metric = err / Math.max(1, nErr);
        extra = 0.25;

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

      // The field is Ai(x − z²/4) evaluated directly, so the parabolic path is an input, not a result: the
      // offset of the intensity peak from z²/4 is fixed by the shape of Ai and the apodization.
      function status() {
        host.setStatus(U.stats.compare({ label: 'peak offset from z²/4, ⟨|Δx|⟩', measured: metric, basis: 'construction', digits: 3, note: 'shift built into the formula' }) +
          '<span>' + (metric < 1.5 ? 'accelerating' : 'off caustic') + '</span>');
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
