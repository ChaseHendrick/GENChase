
/* modules/aharonov.js */
/* GENChase: Aharonov-Bohm two-slit with a shielded flux. A prescribed relative phase illustrates flux-periodic interference. */
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
    RANGE('Beam', 'slit', 'Slit sep', GEOM, 8, 48, 1, v => v + ''),
    RANGE('Beam', 'width', 'Slit width', GEOM, 1, 8, 0.5, v => Number(v).toFixed(1)),
    RANGE('Beam', 'flux', 'Flux Φ/Φ0', GEOM, 0, 2, 0.02, f2, { hint: 'The prescribed relative phase is 2π Φ/Φ0. This illustrative two-slit field does not solve particle paths around a solenoid.' }),
    RANGE('Beam', 'k', 'Wavenumber', GEOM, 0.4, 2.4, 0.05, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', slit: 22, width: 3, flux: 0.35, k: 1.1, view: 'int', exposure: 1 };
  const PRESETS = {
    shift: pre('Shifted', { flux: 0.5, slit: 22 }, Pal.glacier),
    zero: pre('No flux', { flux: 0, slit: 22 }, Pal.harbor),
    quantum: pre('One fluxon', { flux: 1, slit: 18 }, Pal.nightshade),
    tight: pre('Tight slits', { slit: 12, width: 2, flux: 0.4 }, Pal.ember),
    wide: pre('Wide', { slit: 36, k: 0.8, flux: 0.25 }, Pal.thermal),
    half: pre('Half fluxon', { flux: 0.5, k: 1.4 }, Pal.xray),
  };

  function surprise(rng) { return { flux: rng.range(0, 1.2), slit: rng.int(12, 36), k: rng.range(0.7, 1.8) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'aharonov', name: 'Aharonov–Bohm', tab: 'Aharonov',
    subtitle: 'phase from a field the particle never enters · 1959',
    order: 51,
    equation: 'Δφ = (e/ℏ) ∮ A·dl = 2π Φ/Φ0,   I(x) = |ψ_L + e^{iΔφ} ψ_R|²',
    credit: 'Y. Aharonov and D. Bohm, Phys. Rev. 115, 485 (1959). Ehrenberg and Siday had the same phase in 1949. Chambers (1960) and Tonomura et al. (1986) saw the fringes shift around a shielded magnet. The plate is two Huygens slits plus a pure gauge phase, not a solenoid in a TEM.',
    blurb: 'A particle that never enters a magnetic field still feels it. The vector potential around a shielded flux shifts the two-slit fringes by 2π Φ/Φ0. Classical Lorentz force is zero on both paths. The status line gives the brightest lower-field pixel’s horizontal offset as a fraction of plate width, not a calibrated fringe shift. Display intensity is scaled to its 95th percentile; the brightest 5% clips at unit exposure.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Beam: 'Φ/Φ0 = 1 is one flux quantum: the pattern looks like zero flux again, but the phase has wound once.' },
    palette: true, defaultPalette: 'glacier', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, displayLo = 0, displayHi = 1, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);

        const sep = s.slit, w = s.width, k = s.k, phi = s.flux * Math.PI * 2;
        const cx = W / 2, yWall = H * 0.38;
        let peakX = cx, peakI = -1;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const px = x + 0.5, py = y + 0.5;
          let re = 0, im = 0;
          for (let side = -1; side <= 1; side += 2) {
            const sx = cx + side * sep / 2, sy = yWall;
            const phs = side < 0 ? 0 : phi;
            for (let ds = -w; ds <= w; ds += 0.5) {
              const dx = px - (sx + ds), dy = py - sy;
              const r = Math.hypot(dx, dy) + 1e-6;
              const phase = k * r + phs;
              re += Math.cos(phase) / r; im += Math.sin(phase) / r;
            }
          }
          const I = re * re + im * im;
          field[y * W + x] = I;
          if (y > H * 0.72 && I > peakI) { peakI = I; peakX = x; }
        }
        metric = (peakX + 0.5 - cx) / W;
        // Presentation only: prevent near-source peaks from hiding the far-field fringes.
        // Cache per computed field so palette/exposure changes do not sort again.
        const sorted = field.slice().sort();
        displayLo = sorted[0];
        displayHi = sorted[Math.floor(0.95 * (sorted.length - 1))];
        extra = s.flux;

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
        const lo = displayLo, span = (displayHi - lo) || 1, logv = s.view === 'log';
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

      function status() { host.setStatus('<span>Φ/Φ0 <b>' + f2(extra) + '</b></span><span>lower-field peak x offset <b>' + f2(metric) + '</b> of width (descriptive)</span><span>display: intensity p95</span><span>' + (Math.abs(extra) < 0.05 ? 'unshifted' : 'gauge phase') + '</span>'); }

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
