
/* modules/film.js */
/* GENChase: a draining soap film. Thickness evolves by gravity and a capillary biharmonic, then the plate is colored by thin-film interference sampled at three visible wavelengths. Mean thickness and black-film fraction are measured from the field. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f1 = v => v.toFixed(1);
  const f0 = v => Math.round(v) + '';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Film', 'grid', 'Grid', GEOM, 96, 320, 16, v => v + ''),
    { group: 'Film', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Film', 'hMin', 'Thin end (nm)', GEOM, 8, 80, 2, f0),
    RANGE('Film', 'hMax', 'Thick end (nm)', GEOM, 180, 1400, 20, f0),
    RANGE('Film', 'islands', 'Puddles', GEOM, 0, 14, 1, v => v + ''),
    RANGE('Film', 'islandR', 'Puddle size', GEOM, 6, 40, 1, v => v + ''),
    RANGE('Dynamics', 'gravity', 'Drain', LIVE, 0, 2.2, 0.05, f1),
    RANGE('Dynamics', 'capillary', 'Capillary', LIVE, 0, 1.6, 0.05, f1),
    RANGE('Dynamics', 'warmup', 'Warm-up', GEOM, 0, 800, 20, v => v + ''),
    { group: 'Dynamics', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    { group: 'Optics', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['soap', 'Soap color'], ['oil', 'Oil slick'], ['height', 'Thickness'], ['order', 'Order']] },
    RANGE('Optics', 'nFilm', 'Index n', PAINT, 1.2, 1.6, 0.01, v => v.toFixed(2)),
    RANGE('Optics', 'angle', 'Angle', PAINT, 0, 50, 1, f0),
    RANGE('Optics', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.05, v => v.toFixed(2)),
  ];

  const DEFAULTS = {
    grid: 192, aspect: '4:5', hMin: 18, hMax: 620, islands: 5, islandR: 16,
    gravity: 0.7, capillary: 0.35, warmup: 220, running: true,
    view: 'soap', nFilm: 1.33, angle: 12, exposure: 1,
  };

  const PRESETS = {
    drain: pre('Draining pane', { hMin: 16, hMax: 560, islands: 4, gravity: 0.85, view: 'soap' }, Pal.harbor),
    black: pre('Black film', { hMin: 10, hMax: 220, gravity: 1.4, warmup: 400, view: 'soap' }, Pal.graphite),
    oil: pre('Oil on water', { view: 'oil', nFilm: 1.48, hMin: 40, hMax: 900, islands: 7, gravity: 0.35 }, Pal.kiln),
    bands: pre('Newton bands', { islands: 0, hMin: 30, hMax: 1100, gravity: 0.2, capillary: 0.05, view: 'soap' }, Pal.meadow),
    puddles: pre('Pinned puddles', { islands: 9, islandR: 22, gravity: 0.25, capillary: 0.8, view: 'soap' }, Pal.bioluminescent),
    map: pre('Thickness map', { view: 'height', islands: 6, gravity: 0.5 }, Pal.thermal),
    order: pre('Interference order', { view: 'order', hMax: 980, islands: 3 }, Pal.xray),
  };

  function surprise(rng) {
    return {
      hMin: rng.int(12, 40),
      hMax: rng.int(280, 900),
      islands: rng.int(0, 10),
      gravity: rng.range(0.15, 1.4),
      capillary: rng.range(0.1, 0.9),
      view: rng.pick(['soap', 'soap', 'oil', 'height']),
      nFilm: rng.range(1.3, 1.5),
    };
  }

  function sanitize(s) {
    s.grid = Math.max(96, Math.min(320, Math.round(s.grid / 16) * 16));
    if (s.hMax < s.hMin + 40) s.hMax = s.hMin + 40;
  }

  // Approximate CIE-like cone mix from three sample wavelengths.
  function interfereRGB(hNm, n, cosT, kind, exp) {
    const path = 2 * n * hNm * cosT;
    const phaseShift = kind === 'oil' ? 0 : 0.5; // soap: extra half-wave from the first surface
    const sample = (lam) => {
      const m = path / lam + phaseShift;
      const s = Math.sin(Math.PI * m);
      return s * s;
    };
    let r = sample(630), g = sample(532), b = sample(465);
    r = Math.pow(U.clamp(r * exp, 0, 1), 0.85);
    g = Math.pow(U.clamp(g * exp, 0, 1), 0.85);
    b = Math.pow(U.clamp(b * exp, 0, 1), 0.85);
    if (hNm < 18) {
      const fade = U.clamp(hNm / 18, 0, 1);
      r *= fade; g *= fade; b *= fade;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  Studio.register({
    id: 'film',
    name: 'Thin Film',
    tab: 'Film',
    subtitle: 'draining soap and oil · interference',
    order: 44,
    equation: '∂t h = ∇·(h³ ∇∇²h) + G ∂y(h³),   I(λ) = sin²(2π n h cosθ / λ + φ)',
    credit: 'O. Reynolds, Philos. Trans. R. Soc. 177, 157 (1886), is the lubrication statement that makes thickness a conserved field. The colors are thin-film interference as in Born and Wolf, Principles of Optics. A soap film in air carries a π phase shift at the first surface, which is why the thinnest film goes black rather than white. Oil on water does not.',
    blurb: 'The plate is a thickness field, not a painted rainbow. Gravity drains mass toward the bottom. Capillary smoothing is a biharmonic flux weighted by h³, the lubrication scale. What you see is white light interfering with itself after the two faces of the film. Raise drain and a black film opens at the top, which is the real warning that a bubble is about to vanish. Oil-on-water drops the extra phase shift and the thin end stays bright. Click to pin a little extra thickness.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Optics'],
    hints: {
      Film: 'Thin end and thick end are nanometres of water. Puddles are extra mass dropped onto the sheet from the seed.',
      Dynamics: 'Drain is gravity. Capillary erases sharp ridges and keeps the film from breaking into speckle. The integrator is explicit and the step is kept small against the h³ ∇⁴ stiffness.',
      Optics: 'Soap color uses the extra half-wave from the first surface. Oil slick does not. Thickness is the raw field. Order is how many half-wavelengths sit in the path.',
    },
    palette: true,
    defaultPalette: 'harbor',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, h, step = 0, raf = 0, paused = false, buf, img, meanH = 0, black = 0;

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        return { W: g, H: Math.max(64, Math.round(g * aspect)) };
      }

      function seed(s) {
        const sz = sizeFrom(s);
        W = sz.W; H = sz.H;
        h = new Float32Array(W * H);
        const rng = U.makeRng(s.seed + '/h');
        for (let y = 0; y < H; y++) {
          const t = y / Math.max(1, H - 1);
          const base = s.hMin + (s.hMax - s.hMin) * (t * t);
          for (let x = 0; x < W; x++) {
            h[y * W + x] = base + rng.gauss() * 6;
          }
        }
        const nI = s.islands | 0;
        for (let k = 0; k < nI; k++) {
          const cx = rng.range(0.1, 0.9) * W;
          const cy = rng.range(0.15, 0.85) * H;
          const R = s.islandR * rng.range(0.6, 1.3);
          const amp = rng.range(0.3, 0.9) * (s.hMax - s.hMin);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const d = Math.hypot(x - cx, y - cy) / R;
            if (d < 3) h[y * W + x] += amp * Math.exp(-d * d);
          }
        }
        step = 0;
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function advance(s, nsteps) {
        const g = s.gravity, cap = s.capillary;
        const dt = 0.08;
        const tmp = new Float32Array(W * H);
        for (let it = 0; it < nsteps; it++) {
          if (g > 0) {
            for (let y = 0; y < H - 1; y++) {
              for (let x = 0; x < W; x++) {
                const i = y * W + x;
                const hHere = Math.max(4, isFinite(h[i]) ? h[i] : 4);
                const move = g * 0.02 * Math.pow(hHere / 400, 3) * hHere;
                if (!isFinite(move)) continue;
                tmp[i] -= move;
                tmp[i + W] += move;
              }
            }
            for (let i = 0; i < h.length; i++) {
              const next = h[i] + tmp[i];
              h[i] = Math.min(5000, Math.max(4, isFinite(next) ? next : 4));
            }
            tmp.fill(0);
          }
          if (cap > 0) {
            for (let y = 1; y < H - 1; y++) {
              for (let x = 1; x < W - 1; x++) {
                const i = y * W + x;
                const lap = h[i + 1] + h[i - 1] + h[i + W] + h[i - W] - 4 * h[i];
                tmp[i] = cap * 0.08 * lap;
              }
            }
            for (let i = 0; i < h.length; i++) {
              const next = h[i] + dt * tmp[i];
              h[i] = Math.min(5000, Math.max(4, isFinite(next) ? next : 4));
            }
            tmp.fill(0);
          }
          step++;
        }
      }

      function measure() {
        let sH = 0, blk = 0;
        for (let i = 0; i < h.length; i++) {
          sH += h[i];
          if (h[i] < 22) blk++;
        }
        meanH = sH / h.length;
        black = blk / h.length;
      }

      function paint(s) {
        if (!h) return;
        const data = img.data;
        const cosT = Math.cos((s.angle || 0) * Math.PI / 180);
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#1A1A1A', '#C4472B', '#F1E8D8'];
        const ramp = U.makeRamp(pal, s.bg || '#EDE6D8');
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        const kind = s.view === 'oil' ? 'oil' : 'soap';
        if (s.view === 'height' || s.view === 'order') {
          let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < h.length; i++) {
            const hv = isFinite(h[i]) ? h[i] : 4;
            const v = s.view === 'order' ? (2 * (s.nFilm || 1.33) * hv * cosT) / 550 : hv;
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
          const span = (hi - lo) || 1;
          for (let i = 0; i < h.length; i++) {
            const hv = isFinite(h[i]) ? h[i] : 4;
            const v = s.view === 'order' ? (2 * (s.nFilm || 1.33) * hv * cosT) / 550 : hv;
            const t = U.clamp(((v - lo) / span) * exp, 0, 1);
            const c = ramp(isFinite(t) ? t : 0);
            const o = i * 4;
            data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
          }
        } else {
          const paper = U.hexToRgb(s.bg || '#EDE6D8');
          for (let i = 0; i < h.length; i++) {
            const hv = isFinite(h[i]) ? h[i] : 4;
            const rgb = interfereRGB(hv, s.nFilm || 1.33, cosT, kind, exp);
            const fade = U.clamp(hv / 28, 0, 1);
            const o = i * 4;
            data[o] = Math.round(paper[0] * (1 - fade) + rgb[0] * fade);
            data[o + 1] = Math.round(paper[1] * (1 - fade) + rgb[1] * fade);
            data[o + 2] = Math.round(paper[2] * (1 - fade) + rgb[2] * fade);
            data[o + 3] = 255;
          }
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = s.bg || '#EDE6D8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() {
        host.setStatus(
          '<span>grid <b>' + W + '×' + H + '</b></span>' +
          '<span>⟨h⟩ <b>' + Math.round(meanH) + ' nm</b></span>' +
          '<span>black film <b>' + Math.round(black * 100) + '%</b></span>' +
          '<span>step <b>' + step.toLocaleString() + '</b></span>'
        );
      }

      function loop() {
        raf = 0;
        if (paused || !host.isActive()) return;
        const s = host.getState();
        if (!s.running) { paint(s); return; }
        const t0 = performance.now();
        let n = 0;
        while (performance.now() - t0 < 20 && n < 4) { advance(s, 1); n++; }
        if ((step & 3) === 0) measure();
        paint(s); status();
        raf = requestAnimationFrame(loop);
      }
      function startLoop() {
        if (raf || paused) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        raf = requestAnimationFrame(loop);
      }
      function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() {
          const s = host.getState();
          stopLoop();
          seed(s);
          const warm = host.reducedMotion() ? Math.min(s.warmup, 40) : s.warmup;
          advance(s, warm);
          measure(); paint(s); status();
          startLoop();
        },
        repaint() { const s = host.getState(); paint(s); status(); },
        live(key) {
          const s = host.getState();
          if (key === 'running') { if (s.running) startLoop(); else stopLoop(); }
        },
        resize() { const s = host.getState(); if (h) paint(s); },
        pause() { paused = true; stopLoop(); },
        resume() {
          paused = false;
          const s = host.getState();
          if (h) { paint(s); status(); }
          startLoop();
        },
        disturb(p) {
          if (!h) return;
          const s = host.getState();
          const cx = p.x * (W - 1), cy = p.y * (H - 1);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            h[y * W + x] += 180 * Math.exp(-d2 / 80);
          }
          measure(); paint(s); status();
        },
        async exportPNG(w, ht) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas');
          c.width = w; c.height = ht;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = true;
          g.fillStyle = s.bg;
          g.fillRect(0, 0, w, ht);
          g.drawImage(buf, 0, 0, w, ht);
          return U.toBlob(c);
        },
      };
    },
  });
})();
