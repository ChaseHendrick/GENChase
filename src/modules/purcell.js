
/* modules/purcell.js */
/* GENChase: Purcell three-link swimmer at zero Reynolds number. Net displacement per square gait is measured. A two-link scallop goes nowhere. */
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
    RANGE('Gait', 'amp', 'Amplitude', GEOM, 0.15, 0.8, 0.05, f2),
    RANGE('Gait', 'cycles', 'Cycles', GEOM, 1, 8, 1, v => v + ''),
    { group: 'Gait', key: 'kind', label: 'Swimmer', type: 'seg', kind: GEOM, options: [['purcell', 'Three-link'], ['scallop', 'Scallop']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', amp: 0.45, cycles: 3, kind: 'purcell', view: 'int', exposure: 1 };
  const PRESETS = {
    swim: pre('Purcell gait', { kind: 'purcell', amp: 0.5, cycles: 4 }, Pal.harbor),
    scallop: pre('Scallop (stuck)', { kind: 'scallop', amp: 0.5, cycles: 4 }, Pal.graphite),
    big: pre('Large amp', { kind: 'purcell', amp: 0.7, cycles: 3 }, Pal.ember),
    many: pre('Many cycles', { kind: 'purcell', cycles: 6, amp: 0.4 }, Pal.nightshade),
    tiny: pre('Small amp', { kind: 'purcell', amp: 0.22, cycles: 5 }, Pal.glacier),
    log: pre('Log trail', { kind: 'purcell', view: 'log' }, Pal.thermal),
  };

  function surprise(rng) { return { kind: rng() < 0.2 ? 'scallop' : 'purcell', amp: rng.range(0.25, 0.7), cycles: rng.int(2, 6) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'purcell', name: 'Purcell Swimmer', tab: 'Purcell',
    subtitle: 'a scallop cannot swim in molasses · 1977',
    order: 65,
    equation: 'Re → 0,   scallop theorem: a reciprocal gait gives Δx = 0,   three-link square gait: Δx ≠ 0',
    credit: 'E. M. Purcell, Am. J. Phys. 45, 3 (1977), "Life at low Reynolds number." Time-reversible stroking (a scallop) produces no net motion in Stokes flow. A three-link swimmer that traces a loop in shape space does. The plate is the trail of that gait, not a bacterium.',
    blurb: 'In molasses, inertia is gone and a scallop opening and closing gets nowhere: the movie played backwards is a valid swimming stroke, so the net displacement must vanish. Add a third link, trace a square in joint space, and the animal crawls. The status line reports |Δx| per cycle against 0 for the scallop.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Gait: 'The scallop is the theorem. The three-link square is the loophole.' },
    palette: true, defaultPalette: 'harbor', surprise, sanitize,
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

        const amp = s.amp, cyc = s.cycles | 0, three = s.kind !== 'scallop';
        field.fill(0);
        function splat(px, py, w) {
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const xi = (px + dx) | 0, yi = (py + dy) | 0;
            if (xi >= 0 && yi >= 0 && xi < W && yi < H) field[yi * W + xi] += w / (1 + dx * dx + dy * dy);
          }
        }
        function seg(x0, y0, x1, y1, w) {
          const n = Math.max(4, Math.hypot(x1 - x0, y1 - y0) | 0);
          for (let k = 0; k <= n; k++) splat(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, w);
        }
        let x = 0.22 * W, y = 0.55 * H, th = 0.2;
        const L = Math.min(W, H) * 0.12;
        const xStart = x;
        const steps = 240 * cyc;
        for (let i = 0; i <= steps; i++) {
          const sphi = (i / 240) % 1;
          let a1, a2;
          if (three) {
            if (sphi < 0.25) { a1 = -amp + 8 * amp * sphi; a2 = -amp; }
            else if (sphi < 0.5) { a1 = amp; a2 = -amp + 8 * amp * (sphi - 0.25); }
            else if (sphi < 0.75) { a1 = amp - 8 * amp * (sphi - 0.5); a2 = amp; }
            else { a1 = -amp; a2 = amp - 8 * amp * (sphi - 0.75); }
          } else {
            a1 = amp * Math.sin(sphi * Math.PI * 2); a2 = 0;
          }
          x += (three ? 0.08 * L * amp * amp : 0) * Math.cos(th);
          th += three ? 0.01 * amp * Math.sin(sphi * Math.PI * 2) : 0;
          const x1 = x + L * Math.cos(th), y1 = y + L * Math.sin(th);
          const x2 = x1 + L * Math.cos(th + a1), y2 = y1 + L * Math.sin(th + a1);
          const x3 = x2 + L * Math.cos(th + a1 + a2), y3 = y2 + L * Math.sin(th + a1 + a2);
          splat(x, y, 1.6);
          if (i % 5 === 0) {
            seg(x, y, x1, y1, 1.5);
            seg(x1, y1, x2, y2, 1.5);
            seg(x2, y2, x3, y3, 1.5);
          }
        }
        const dist = Math.abs(x - xStart) / Math.max(1, cyc);
        metric = dist / Math.max(1, W);
        extra = three ? 1 : 0;

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

      // The body's advance per step is written into compute() for each gait, zero for the scallop and
      // 0.08 L amp² cos θ in x for the three-link gait; no Stokes flow is solved. So the
      // displacement is true by construction, and the scallop's zero is not a test of the theorem.
      function status() {
        const scallop = host.getState().kind === 'scallop';
        host.setStatus(U.stats.compare(Object.assign({ label: '|Δx|/cycle', measured: metric, units: 'of the sheet', basis: 'construction', digits: 3 },
          scallop ? { expected: 0, reference: 'scallop theorem' } : {})) +
          '<span>' + (scallop ? 'scallop theorem' : 'non-reciprocal gait') + '</span>');
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
