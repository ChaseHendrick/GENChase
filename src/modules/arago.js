
/* modules/arago.js */
/* GENChase: Fresnel diffraction of an opaque disk. Poisson's bright axial spot. Centre intensity is measured against the ring. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const SCHEMA = [
    RANGE('Wave', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Wave', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Wave', 'radius', 'Disk R', GEOM, 10, 60, 1, v => v + ''),
    RANGE('Wave', 'z', 'Distance z', GEOM, 0.2, 2.2, 0.05, f2),
    RANGE('Wave', 'k', 'Wavenumber k', GEOM, 0.5, 2.8, 0.05, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Intensity'], ['log', 'Log I']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', radius: 26, z: 0.7, k: 1.35, view: 'log', exposure: 1.05 };
  const PRESETS = {
    spot: pre('Arago spot', { radius: 26, z: 0.65, k: 1.4, view: 'log' }, Pal.ember),
    tight: pre('Tight disk', { radius: 40, z: 0.45, view: 'int' }, Pal.nightshade),
    far: pre('Far field', { radius: 16, z: 1.7, k: 1.1, view: 'log' }, Pal.glacier),
    bright: pre('On axis', { radius: 30, z: 0.55, k: 1.7, view: 'int', exposure: 0.75 }, Pal.thermal),
    wide: pre('Wide', { radius: 14, z: 1.05, view: 'log' }, Pal.harbor),
    hard: pre('Hard shadow', { radius: 48, z: 0.25, k: 2.2, view: 'log' }, Pal.graphite),
  };
  function surprise(rng) { return { radius: rng.int(14, 44), z: rng.range(0.4, 1.5), k: rng.range(0.8, 2), view: rng.pick(['log', 'int']) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'arago', name: 'Arago Spot', tab: 'Arago',
    subtitle: 'Poisson bright spot behind a disk · 1818',
    order: 49,
    equation: 'U(0) = (e^{ikz}/iλz) ∫_{|ρ|>R} exp(ik|ρ|²/2z) dρ,   I(0) ≃ I_open',
    credit: 'S. D. Poisson argued in 1818 that Fresnel\'s wave theory implied a bright spot on axis in the shadow of an opaque disk, which he took as a reductio. D. F. J. Arago performed the experiment and found the spot. The plate is a Fresnel propagator through a circular stop.',
    blurb: 'Poisson said: if light is a wave, the centre of a disk\'s shadow must glow, which is absurd. Arago looked. It glows. Huygens wavelets from the unobstructed plane meet in phase on axis, so the measured centre intensity sits near the open beam. A geometric shadow would be black there. The status line reports I(0) against a ring just outside the disk.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Wave: 'Fresnel number R²/(λ z) of order 1 makes the spot crisp.' },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, F = 0, buf, img;
      const AS = ASPECTS;
      function sizeFrom(s) { const a = AS[s.aspect] || 1, g = s.grid | 0; return { W: g, H: Math.max(48, Math.round(g * a)) }; }
      function compute() {
        const s = host.getState(); const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const R = s.radius, z = Math.max(0.15, s.z), k = s.k, cx = W / 2, cy = H / 2;
        F = (R * R * k) / (2 * Math.PI * z);
        const nPhi = 24, nRad = 18, rMax = Math.hypot(W, H) * 0.52;
        let I0 = 0, n0 = 0, Ir = 0, nr = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r2 = dx * dx + dy * dy;
          let re = 0, im = 0;
          for (let ir = 0; ir < nRad; ir++) {
            const r = R + (rMax - R) * (ir + 0.5) / nRad, dr = (rMax - R) / nRad;
            const wgt = r * dr * (Math.PI * 2 / nPhi);
            for (let ip = 0; ip < nPhi; ip++) {
              const ph = (ip + 0.5) * Math.PI * 2 / nPhi;
              const sx = r * Math.cos(ph), sy = r * Math.sin(ph);
              const d2 = (dx - sx) * (dx - sx) + (dy - sy) * (dy - sy);
              const phase = k * d2 / (2 * z);
              re += wgt * Math.cos(phase); im += wgt * Math.sin(phase);
            }
          }
          const I = re * re + im * im;
          field[y * W + x] = I;
          if (r2 < 6) { I0 += I; n0++; }
          if (r2 > (R + 6) * (R + 6) && r2 < (R + 16) * (R + 16)) { Ir += I; nr++; }
        }
        metric = (I0 / Math.max(1, n0)) / Math.max(1e-12, Ir / Math.max(1, nr));
        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }
      function paint() {
        if (!field) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#121110', '#F25C05', '#FFF3D6'];
        const ramp = U.makeRamp(pal, s.bg || '#121110'), data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        let lo = Infinity, hi = -Infinity;
        const logv = s.view === 'log';
        for (let i = 0; i < field.length; i++) {
          const v = logv ? Math.log(1e-9 + field[i]) : field[i];
          if (v < lo) lo = v; if (v > hi) hi = v;
        }
        const span = (hi - lo) || 1;
        for (let i = 0; i < field.length; i++) {
          const v = logv ? Math.log(1e-9 + field[i]) : field[i];
          const t = U.clamp(((v - lo) / span) * exp, 0, 1);
          const c = ramp(isFinite(t) ? t : 0);
          const o = i * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg || '#121110'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }
      function status() {
        host.setStatus('<span>F <b>' + f2(F) + '</b></span>' +
          U.stats.compare({ label: 'I(0)/I_ring', measured: metric, expected: '~1', reference: 'open-beam proxy', basis: 'deterministic', digits: 3 }) +
          '<span>' + (metric > 0.3 ? 'Arago spot' : 'geometric') + '</span>');
      }
      return {
        aspect(s) { return AS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); }, resize() { paint(); }, pause() {}, resume() { paint(); },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState(), c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false }); g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#121110'; g.fillRect(0, 0, w, h); g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
