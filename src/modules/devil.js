
/* modules/devil.js */
/* GENChase: Circle-map devil's staircase and Arnold tongues. Finite-time rotation estimates and orbit histograms; no infinite-time locking certificate. */
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
    RANGE('Map', 'K', 'Coupling K', GEOM, 0, 2.2, 0.05, f2, { hint: 'K = 1 is critical. Below, locked tongues have width; above, chaos eats the gaps.' }),
    RANGE('Map', 'iters', 'Iters', GEOM, 40, 240, 10, v => v + ''),
    { group: 'Map', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['tongues', 'Arnold tongues'], ['stair', 'Staircase'], ['orbit', 'Orbit']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', K: 1, iters: 80, kind: 'tongues', view: 'int', exposure: 1 };
  const PRESETS = {
    tongues: pre('Arnold tongues', { kind: 'tongues', K: 1 }, Pal.ember),
    stair: pre('Devil\'s staircase', { kind: 'stair', K: 1 }, Pal.nightshade),
    sub: pre('Subcritical', { kind: 'tongues', K: 0.55 }, Pal.harbor),
    super: pre('Supercritical', { kind: 'tongues', K: 1.4 }, Pal.thermal),
    orbit: pre('Orbit', { kind: 'orbit', K: 0.9 }, Pal.glacier),
    golden: pre('Golden', { kind: 'stair', K: 0.8 }, Pal.kiln),
  };

  function surprise(rng) { return { K: rng.range(0.4, 1.6), kind: rng.pick(['tongues','stair','tongues']) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  function circleRotation(omega, K, steps) {
          if (K === 0) return omega;
          let th = 0.17, acc = 0;
          const k = K / (Math.PI * 2);
          for (let i = 0; i < 20; i++) th = (th + omega - k * Math.sin(Math.PI * 2 * th)) % 1;
          if (th < 0) th += 1;
          for (let i = 0; i < steps; i++) {
            const d = omega - k * Math.sin(Math.PI * 2 * th);
            th += d;
            acc += d;
            th = th - Math.floor(th);
          }
          return acc / steps;
        }
  Studio.register({
    id: 'devil', name: 'Devil\'s Staircase', tab: 'Devil',
    subtitle: 'finite-time circle-map rotation estimates · 1965',
    order: 95,
    equation: 'θ_{n+1} = θ_n + Ω − (K/2π) sin(2π θ_n),   ρ(Ω) = lim (θ_n−θ_0)/n   (devil\'s staircase)',
    credit: 'V. I. Arnold, Am. Math. Soc. Transl. Ser. 2, 46, 213 (1965), studied the circle-map resonance tongues. This plate evaluates the standard sine circle map with a fixed initial phase. The rotation number is an infinite-time quantity; the plate displays finite-time estimates. For non-monotone maps, different initial phases can have different long-time rotation behavior.',
    blurb: 'The staircase and tongue views estimate mean phase advance after 20 discarded iterations. A tolerance band near 1/2 is a finite-sample statistic, not proof of a locked rational orbit or its tongue width. The orbit view bins one trajectory at golden-mean drive. K<=1 preserves orientation; K>1 need not have a unique rotation number.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Map: 'Tongues plot finite-time rotation estimates over Ω=0..1 and K=0..2.1. The K slider selects the diagnostic band only in this view. Staircase uses that K throughout. Iters controls averaging; a near-rational estimate does not establish locking.' },
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

        const K0 = s.K, it = s.iters | 0, kind = s.kind;
        let halfW = 0, samplesInBand = 0;
        if (kind === 'stair') {
          for (let x = 0; x < W; x++) {
            const omega = x / Math.max(1, W - 1);
            const r = circleRotation(omega, K0, it);
            samplesInBand++; if (Math.abs(r - 0.5) < 0.02) halfW++;
            for (let y = 0; y < H; y++) {
              const yy = 1 - y / Math.max(1, H - 1);
              field[y * W + x] = Math.abs(yy - r) < 0.012 ? 1 : (yy < r ? r : 0.05);
            }
          }
        } else if (kind === 'orbit') {
          let th = 0.2;
          const k = K0 / (Math.PI * 2);
          field.fill(0);
          for (let i = 0; i < W * H; i++) {
            th = (th + 0.5 * (Math.sqrt(5) - 1) - k * Math.sin(Math.PI * 2 * th));
            th -= Math.floor(th);
            const x = (th * W) | 0, y = ((i / (W * 2)) | 0) % H;
            if (x >= 0 && x < W) field[y * W + x] += 1;
          }
        } else {
          for (let y = 0; y < H; y++) {
            const K = 2.1 * y / Math.max(1, H - 1);
            for (let x = 0; x < W; x++) {
              const omega = x / Math.max(1, W - 1);
              const r = circleRotation(omega, K, Math.max(30, it >> 1));
              field[y * W + x] = r;
              if (Math.abs(K - K0) < 0.05) { samplesInBand++; if (Math.abs(r - 0.5) < 0.02) halfW++; }
            }
          }
        }
        metric = samplesInBand ? halfW / samplesInBand : null;
        extra = K0;

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

      function status() { host.setStatus('<span>K <b>' + f2(extra) + '</b></span><span>near-½ sample fraction <b>' + (metric === null ? 'not measured' : f2(metric)) + '</b></span><span>finite iterations · tolerance 0.02 · no locking certificate</span>'); }

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
