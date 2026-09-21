
/* modules/chladni.js */
/* GENChase — Chladni & Waves: standing waves, nodal lines and interference. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const TAU = U.TAU;
  const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3), deg = v => v + '°';
  const pct = v => Math.round(v * 100) + '%';

  /* ---------- Bessel J_n (power series; ample for n <= 8, x <= ~24) ---------- */
  const FACT = [1];
  for (let i = 1; i < 40; i++) FACT[i] = FACT[i - 1] * i;
  function besselJ(n, x) {
    if (x < 0) x = -x;
    const half = x / 2;
    let sum = 0;
    for (let k = 0; k < 26; k++) {
      const num = Math.pow(-1, k) * Math.pow(half, 2 * k + n);
      const den = FACT[k] * FACT[k + n];
      const term = num / den;
      sum += term;
      if (Math.abs(term) < 1e-12 && k > n + 4) break;
    }
    return sum;
  }

  /* ---------- field builders ---------- */
  function modeList(s) {
    return [
      { n: s.n1, m: s.m1, a: s.a1 },
      { n: s.n2, m: s.m2, a: s.a2 },
      { n: s.n3, m: s.m3, a: s.a3 },
    ].filter(k => k.a > 0.001);
  }

  // Returns f(x, y) over x,y in [-1, 1], roughly normalized to [-1, 1].
  function makeField(s, phase) {
    const rot = s.rotation * Math.PI / 180;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const z = 1 / s.zoom;
    const fs = s.freq;
    const modes = modeList(s);
    let norm = modes.reduce((t, k) => t + k.a, 0) || 1;
    const rng = U.makeRng(s.seed + '/chladni/' + (s.rerolls || 0));

    if (s.mode === 'interference') {
      const N = s.sources;
      const src = [];
      if (N === 2) {
        const sep = 0.45;
        src.push({ x: -sep, y: 0, ph: 0, a: 1 }, { x: sep, y: 0, ph: s.phase, a: 1 });
      } else if (s.ring) {
        for (let i = 0; i < N; i++) {
          const a = (i / N) * TAU;
          src.push({ x: Math.cos(a) * 0.62, y: Math.sin(a) * 0.62, ph: (i % 2) * s.phase, a: 1 });
        }
      } else {
        for (let i = 0; i < N; i++) src.push({ x: rng.range(-0.7, 0.7), y: rng.range(-0.7, 0.7), ph: rng() * TAU * s.phase, a: rng.range(0.6, 1) });
      }
      const k = fs * 6.0;
      const fall = s.falloff;
      norm = src.reduce((t, q) => t + q.a, 0) || 1;
      return function (x0, y0) {
        const x = (x0 * cr - y0 * sr) * z, y = (x0 * sr + y0 * cr) * z;
        let sum = 0;
        for (let i = 0; i < src.length; i++) {
          const q = src[i];
          const dx = x - q.x, dy = y - q.y;
          const r = Math.sqrt(dx * dx + dy * dy) + 0.02;
          sum += q.a * Math.sin(k * r - q.ph - phase) / Math.pow(r + 0.35, fall);
        }
        return sum / norm * 1.5;
      };
    }

    if (s.mode === 'moire') {
      const N = Math.max(2, Math.min(6, s.sources));
      const grat = [];
      for (let i = 0; i < N; i++) {
        const a = rot + (i / N) * Math.PI + rng.range(-0.12, 0.12);
        grat.push({ c: Math.cos(a), s: Math.sin(a), k: fs * 9 * rng.range(0.85, 1.15) });
      }
      return function (x0, y0) {
        const x = x0 * z, y = y0 * z;
        let sum = 0;
        for (let i = 0; i < grat.length; i++) {
          const g = grat[i];
          sum += Math.cos(g.k * (x * g.c + y * g.s) + phase);
        }
        return sum / grat.length;
      };
    }

    if (s.plate === 'circle') {
      // circular membrane: J_n(k r) cos(n θ) superposition
      return function (x0, y0) {
        const x = (x0 * cr - y0 * sr) * z, y = (x0 * sr + y0 * cr) * z;
        const r = Math.sqrt(x * x + y * y);
        if (r > 1) return 0;
        const th = Math.atan2(y, x);
        let sum = 0;
        for (let i = 0; i < modes.length; i++) {
          const k = modes[i];
          const nn = Math.min(8, Math.round(k.n));
          const kr = (k.m + 1) * 2.4048 * fs * r;
          sum += k.a * besselJ(nn, kr) * Math.cos(nn * th + phase);
        }
        return sum / norm * 2.2;
      };
    }

    // square plate
    const sym = s.symmetric;
    return function (x0, y0) {
      const x = (x0 * cr - y0 * sr) * z, y = (x0 * sr + y0 * cr) * z;
      let sum = 0;
      for (let i = 0; i < modes.length; i++) {
        const k = modes[i];
        const nx = k.n * Math.PI * fs, my = k.m * Math.PI * fs;
        if (sym) sum += k.a * (Math.cos(nx * x) * Math.cos(my * y) - Math.cos(my * x) * Math.cos(nx * y));
        else sum += k.a * Math.cos(nx * x) * Math.cos(my * y);
      }
      return sum / norm;
    };
  }

  /* ---------- rendering ---------- */
  function computeToImageData(ctx, s, w, h, phase, sandBuf, sandMax) {
    const field = makeField(s, phase);
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const lut = U.makeRampLUT(s.palette, s.bg, 256);
    const bgc = U.hexToRgb(s.bg);
    const inkc = U.hexToRgb(s.palette[s.palette.length - 1]);
    const lineC = U.hexToRgb(s.palette[Math.min(s.palette.length - 1, Math.max(0, s.lineColor))]);
    const style = s.style;
    const thr = s.threshold;
    const soft = Math.max(0.002, s.softness);
    const post = s.posterize | 0;
    const inv = s.invert;
    const ar = h / w;
    const grain = s.grain;
    const grng = U.makeRng(s.seed + '/grain');
    const contour = Math.max(0.01, s.contour);

    for (let py = 0; py < h; py++) {
      const y = ((py + 0.5) / h * 2 - 1) * ar;
      for (let px = 0; px < w; px++) {
        const x = (px + 0.5) / w * 2 - 1;
        let r, g, b;
        if (style === 'sand') {
          const dens = sandBuf ? sandBuf[py * w + px] : 0;
          let t = sandMax > 0 ? Math.pow(Math.min(1, dens / sandMax), 0.55) : 0;
          if (inv) t = 1 - t;
          r = bgc[0] + (inkc[0] - bgc[0]) * t;
          g = bgc[1] + (inkc[1] - bgc[1]) * t;
          b = bgc[2] + (inkc[2] - bgc[2]) * t;
        } else {
          let u = field(x, y);
          if (inv) u = -u;
          if (style === 'nodal') {
            const a = 1 - U.smoothstep(thr, thr + soft, Math.abs(u));
            r = bgc[0] + (lineC[0] - bgc[0]) * a;
            g = bgc[1] + (lineC[1] - bgc[1]) * a;
            b = bgc[2] + (lineC[2] - bgc[2]) * a;
          } else if (style === 'contour') {
            let t = U.clamp((u + 1) / 2, 0, 1);
            if (post > 1) t = Math.round(t * (post - 1)) / (post - 1);
            const band = Math.abs((u / contour) % 1);
            const line = 1 - U.smoothstep(0, 0.14, Math.min(band, 1 - band));
            const i3 = Math.min(255, (t * 255) | 0) * 3;
            r = lut[i3]; g = lut[i3 + 1]; b = lut[i3 + 2];
            r = r + (lineC[0] - r) * line * 0.85;
            g = g + (lineC[1] - g) * line * 0.85;
            b = b + (lineC[2] - b) * line * 0.85;
          } else { // filled
            let t = s.signed ? U.clamp((u + 1) / 2, 0, 1) : U.clamp(Math.abs(u), 0, 1);
            if (post > 1) t = Math.round(t * (post - 1)) / (post - 1);
            const i3 = Math.min(255, (t * 255) | 0) * 3;
            r = lut[i3]; g = lut[i3 + 1]; b = lut[i3 + 2];
          }
        }
        if (grain > 0) {
          const n = (grng() - 0.5) * grain * 46;
          r += n; g += n; b += n;
        }
        const o = (py * w + px) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    return img;
  }

  /* ---------- sand simulation ---------- */
  function makeSand(s, w, h) {
    const count = Math.min(200000, Math.max(1000, s.particles | 0));
    const rng = U.makeRng(s.seed + '/sand');
    const xs = new Float32Array(count), ys = new Float32Array(count);
    const ar = h / w;
    for (let i = 0; i < count; i++) {
      xs[i] = rng.range(-1, 1);
      ys[i] = rng.range(-ar, ar);
    }
    return { xs, ys, count, ar, buf: new Float32Array(w * h), max: 0, step: 0, rng };
  }
  function sandStep(sand, s, w, h, steps) {
    const field = makeField(s, 0);
    const eps = 0.0035;
    const mv = s.pstep;
    const jitter = s.pjitter;
    const { xs, ys, buf, count, ar, rng } = sand;
    const circle = s.mode === 'plate' && s.plate === 'circle';
    for (let it = 0; it < steps; it++) {
      for (let i = 0; i < count; i++) {
        let x = xs[i], y = ys[i];
        const a = Math.abs(field(x + eps, y)) - Math.abs(field(x - eps, y));
        const b = Math.abs(field(x, y + eps)) - Math.abs(field(x, y - eps));
        const len = Math.hypot(a, b) + 1e-6;
        x -= (a / len) * mv + (rng() - 0.5) * jitter;
        y -= (b / len) * mv + (rng() - 0.5) * jitter;
        if (circle) {
          const r = Math.hypot(x, y);
          if (r > 0.995) { x = x / r * 0.995; y = y / r * 0.995; }
        } else {
          if (x < -1) x = -1; else if (x > 1) x = 1;
          if (y < -ar) y = -ar; else if (y > ar) y = ar;
        }
        xs[i] = x; ys[i] = y;
        const px = ((x + 1) / 2 * w) | 0;
        const py = ((y / ar + 1) / 2 * h) | 0;
        if (px >= 0 && px < w && py >= 0 && py < h) {
          const idx = py * w + px;
          const v = buf[idx] + 1;
          buf[idx] = v;
          if (v > sand.max) sand.max = v;
        }
      }
      sand.step++;
    }
  }

  const SCHEMA = [
    { group: 'System', key: 'mode', label: 'System', type: 'seg', kind: GEOM, options: [['plate', 'Chladni plate'], ['interference', 'Interference'], ['moire', 'Moiré']] },
    { group: 'System', key: 'plate', label: 'Plate shape', type: 'seg', kind: GEOM, options: [['square', 'Square'], ['circle', 'Circular']], dimUnless: s => s.mode === 'plate' },
    { group: 'System', key: 'symmetric', label: 'Antisymmetric pair (true Chladni)', type: 'toggle', kind: GEOM, dimUnless: s => s.mode === 'plate' && s.plate === 'square' },
    { group: 'System', key: 'freq', label: 'Frequency scale', type: 'range', kind: GEOM, min: 0.2, max: 4, step: 0.05, fmt: f2 },
    { group: 'System', key: 'sources', label: 'Sources / gratings', type: 'range', kind: GEOM, min: 2, max: 12, step: 1, dimUnless: s => s.mode !== 'plate' },
    { group: 'System', key: 'ring', label: 'Place sources on a ring', type: 'toggle', kind: GEOM, dimUnless: s => s.mode === 'interference' },
    { group: 'System', key: 'phase', label: 'Phase offset', type: 'range', kind: GEOM, min: 0, max: 6.28, step: 0.02, fmt: f2, dimUnless: s => s.mode === 'interference' },
    { group: 'System', key: 'falloff', label: 'Amplitude falloff', type: 'range', kind: GEOM, min: 0, max: 2, step: 0.05, fmt: f2, dimUnless: s => s.mode === 'interference' },
    { group: 'System', key: 'animate', label: 'Animate phase', type: 'toggle', kind: LIVE, dimUnless: s => s.mode !== 'plate' },
    { group: 'System', key: 'reroll', label: 'Reroll modes / sources', type: 'action' },

    { group: 'Modes', key: 'n1', label: 'Mode 1 · n', type: 'range', kind: GEOM, min: 0, max: 14, step: 1, dimUnless: s => s.mode === 'plate' },
    { group: 'Modes', key: 'm1', label: 'Mode 1 · m', type: 'range', kind: GEOM, min: 0, max: 14, step: 1, dimUnless: s => s.mode === 'plate' },
    { group: 'Modes', key: 'a1', label: 'Mode 1 · amplitude', type: 'range', kind: GEOM, min: 0, max: 1, step: 0.02, fmt: f2, dimUnless: s => s.mode === 'plate' },
    { group: 'Modes', key: 'n2', label: 'Mode 2 · n', type: 'range', kind: GEOM, min: 0, max: 14, step: 1, dimUnless: s => s.mode === 'plate' },
    { group: 'Modes', key: 'm2', label: 'Mode 2 · m', type: 'range', kind: GEOM, min: 0, max: 14, step: 1, dimUnless: s => s.mode === 'plate' },
    { group: 'Modes', key: 'a2', label: 'Mode 2 · amplitude', type: 'range', kind: GEOM, min: 0, max: 1, step: 0.02, fmt: f2, dimUnless: s => s.mode === 'plate' },
    { group: 'Modes', key: 'n3', label: 'Mode 3 · n', type: 'range', kind: GEOM, min: 0, max: 14, step: 1, dimUnless: s => s.mode === 'plate' },
    { group: 'Modes', key: 'm3', label: 'Mode 3 · m', type: 'range', kind: GEOM, min: 0, max: 14, step: 1, dimUnless: s => s.mode === 'plate' },
    { group: 'Modes', key: 'a3', label: 'Mode 3 · amplitude', type: 'range', kind: GEOM, min: 0, max: 1, step: 0.02, fmt: f2, dimUnless: s => s.mode === 'plate' },

    { group: 'Render', key: 'style', label: 'Style', type: 'seg', kind: PAINT, wrap: true, options: [['nodal', 'Nodal lines'], ['filled', 'Filled field'], ['contour', 'Contours'], ['sand', 'Sand']] },
    { group: 'Render', key: 'threshold', label: 'Nodal threshold', type: 'range', kind: PAINT, min: 0.005, max: 0.3, step: 0.005, fmt: f3, dimUnless: s => s.style === 'nodal' },
    { group: 'Render', key: 'softness', label: 'Line softness', type: 'range', kind: PAINT, min: 0.002, max: 0.2, step: 0.002, fmt: f3, dimUnless: s => s.style === 'nodal' },
    { group: 'Render', key: 'signed', label: 'Signed mapping (show both phases)', type: 'toggle', kind: PAINT, dimUnless: s => s.style === 'filled' },
    { group: 'Render', key: 'posterize', label: 'Posterize levels (0 = off)', type: 'range', kind: PAINT, min: 0, max: 16, step: 1, dimUnless: s => s.style === 'filled' || s.style === 'contour' },
    { group: 'Render', key: 'contour', label: 'Contour spacing', type: 'range', kind: PAINT, min: 0.02, max: 0.5, step: 0.01, fmt: f2, dimUnless: s => s.style === 'contour' },
    { group: 'Render', key: 'lineColor', label: 'Line color index', type: 'range', kind: PAINT, min: 0, max: 15, step: 1, dimUnless: s => s.style === 'nodal' || s.style === 'contour' },
    { group: 'Render', key: 'invert', label: 'Invert', type: 'toggle', kind: PAINT },
    { group: 'Render', key: 'zoom', label: 'Zoom', type: 'range', kind: GEOM, min: 0.3, max: 3, step: 0.05, fmt: f2 },
    { group: 'Render', key: 'rotation', label: 'Rotation', type: 'range', kind: GEOM, min: 0, max: 360, step: 1, fmt: deg },
    { group: 'Render', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 1, step: 0.05, fmt: pct },
    { group: 'Render', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },

    { group: 'Sand', key: 'particles', label: 'Particles', type: 'range', kind: GEOM, min: 5000, max: 200000, step: 1000, dimUnless: s => s.style === 'sand' },
    { group: 'Sand', key: 'psteps', label: 'Settling steps', type: 'range', kind: GEOM, min: 20, max: 600, step: 10, dimUnless: s => s.style === 'sand' },
    { group: 'Sand', key: 'pstep', label: 'Drift per step', type: 'range', kind: GEOM, min: 0.0005, max: 0.01, step: 0.0005, fmt: v => v.toFixed(4), dimUnless: s => s.style === 'sand' },
    { group: 'Sand', key: 'pjitter', label: 'Grain agitation', type: 'range', kind: GEOM, min: 0, max: 0.01, step: 0.0002, fmt: v => v.toFixed(4), dimUnless: s => s.style === 'sand' },
  ];

  const DEFAULTS = {
    mode: 'plate', plate: 'square', symmetric: true, freq: 1, sources: 2, ring: true, phase: 0, falloff: 0.5, animate: false,
    n1: 3, m1: 7, a1: 1, n2: 5, m2: 2, a2: 0.35, n3: 0, m3: 0, a3: 0,
    style: 'nodal', threshold: 0.045, softness: 0.03, signed: true, posterize: 0, contour: 0.16, lineColor: 0,
    invert: false, zoom: 1, rotation: 0, grain: 0.12, aspect: '1:1',
    particles: 60000, psteps: 240, pstep: 0.003, pjitter: 0.0016,
    seed: 'chladni-0417',
  };

  const PRESETS = {
    classic: { label: 'Classic plate', p: { mode: 'plate', plate: 'square', symmetric: true, n1: 3, m1: 7, a1: 1, n2: 5, m2: 2, a2: 0.35, n3: 0, a3: 0, freq: 1, style: 'nodal', threshold: 0.05, softness: 0.014, lineColor: 0, grain: 0.12, zoom: 1 }, palette: Studio.PALETTES.graphite },
    sand: { label: 'Fine sand', p: { mode: 'plate', plate: 'square', symmetric: true, n1: 4, m1: 9, a1: 1, n2: 2, m2: 6, a2: 0.3, a3: 0, freq: 1, style: 'sand', particles: 90000, psteps: 300, pstep: 0.0035, pjitter: 0.0014, grain: 0 }, palette: Studio.PALETTES.xray },
    drum: { label: 'Bessel drum', p: { mode: 'plate', plate: 'circle', n1: 3, m1: 2, a1: 1, n2: 0, m2: 0, a2: 0, a3: 0, freq: 1.1, style: 'filled', signed: true, posterize: 0, grain: 0.1, zoom: 1 }, palette: Studio.PALETTES.verdigris },
    ripple: { label: 'Two-source ripple', p: { mode: 'interference', sources: 2, phase: 0, falloff: 0.6, freq: 1.6, style: 'filled', signed: true, posterize: 0, grain: 0.08, zoom: 1 }, palette: Studio.PALETTES.harbor },
    sevenfold: { label: 'Sevenfold interference', p: { mode: 'interference', sources: 7, ring: true, phase: 0, falloff: 0.35, freq: 1.9, style: 'contour', contour: 0.12, posterize: 0, lineColor: 4, grain: 0.08 }, palette: Studio.PALETTES.bioluminescent },
    moire: { label: 'Moiré', p: { mode: 'moire', sources: 3, freq: 1.4, style: 'filled', signed: true, posterize: 6, grain: 0.05, zoom: 1, rotation: 12 }, palette: Studio.PALETTES.risograph },
    topo: { label: 'Topographic', p: { mode: 'plate', plate: 'square', symmetric: true, n1: 2, m1: 5, a1: 1, n2: 7, m2: 3, a2: 0.45, a3: 0, freq: 0.8, style: 'contour', contour: 0.1, posterize: 0, lineColor: 4, grain: 0.1 }, palette: Studio.PALETTES.meadow },
    ink: { label: 'Ink plate', p: { mode: 'plate', plate: 'square', symmetric: true, n1: 6, m1: 11, a1: 1, n2: 3, m2: 8, a2: 0.5, a3: 0, freq: 1, style: 'nodal', threshold: 0.09, softness: 0.008, lineColor: 0, grain: 0.15 }, palette: Studio.PALETTES.kiln },
  };

  function aspectRatio(s) {
    const [w, h] = s.aspect.split(':').map(Number);
    return h / w;
  }

  Studio.register({
    id: 'chladni',
    name: 'Chladni & Waves',
    subtitle: 'standing waves, nodal lines and interference · 1787', equation: 'u = sum Ak[cos(nk·pi·x)cos(mk·pi·y) - cos(mk·pi·x)cos(nk·pi·y)];   nodes where u = 0', credit: "Ernst Chladni, Entdeckungen uber die Theorie des Klanges, 1787. The governing plate equation was solved by Sophie Germain, whose 1816 work won the Paris Academy prize; Lord Rayleigh's Theory of Sound, 1877, put it on modern footing.",
    order: 100,
    blurb: 'Bow the edge of a metal plate and it rings in a standing-wave mode; sand sprinkled on top migrates off the vibrating antinodes and settles along the nodal lines where displacement stays zero. Ernst Chladni mapped those figures in 1787, and they are computed here in closed form: a square plate as a superposition of cos(nπx)cos(mπy) terms in the antisymmetric pairing that makes the classic patterns, and a circular membrane from Bessel functions J_n(kr)cos(nθ). The sand style simulates the physical experiment directly, letting particles drift down the gradient of |u| until they pile on the nodes.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Sand'],
    hints: {
      'Modes': 'Integer mode numbers are the physics: (n, m) picks which standing wave the plate is ringing in, and superposing two or three at different amplitudes is what produces the intricate figures. Circular plates read n as the angular order and m as the radial order.',
      'Render': 'Nodal lines show where the plate is still; the filled field shows displacement; contours read it as a topographic map; sand runs the actual experiment.',
    },
    palette: true,
    defaultPalette: 'graphite',
    paletteLabel: 'Colors (low → high displacement)',
    headline: 'particles',
    headlineLabel: 'particles',
    onParam(state) {
      if (state.lineColor > state.palette.length - 1) state.lineColor = state.palette.length - 1;
    },
    surprise(rng) {
      const mode = rng.pick(['plate', 'plate', 'plate', 'interference', 'moire']);
      const style = rng.pick(['nodal', 'filled', 'contour', 'sand']);
      return {
        mode,
        plate: rng() < 0.3 ? 'circle' : 'square',
        symmetric: rng() < 0.8,
        freq: Math.round(rng.range(0.6, 2.2) * 20) / 20,
        sources: rng.int(2, 9), ring: rng() < 0.7,
        phase: Math.round(rng.range(0, 6.2) * 50) / 50,
        falloff: Math.round(rng.range(0.2, 1.2) * 20) / 20,
        n1: rng.int(1, 11), m1: rng.int(1, 11), a1: 1,
        n2: rng.int(0, 9), m2: rng.int(0, 9), a2: Math.round(rng.range(0, 0.6) * 50) / 50,
        n3: rng.int(0, 7), m3: rng.int(0, 7), a3: rng() < 0.4 ? Math.round(rng.range(0.05, 0.3) * 50) / 50 : 0,
        style,
        threshold: Math.round(rng.range(0.02, 0.12) * 200) / 200,
        softness: Math.round(rng.range(0.004, 0.06) * 500) / 500,
        signed: rng() < 0.7,
        posterize: rng() < 0.3 ? rng.int(3, 10) : 0,
        contour: Math.round(rng.range(0.06, 0.25) * 100) / 100,
        lineColor: rng.int(0, 4),
        invert: rng() < 0.15,
        zoom: Math.round(rng.range(0.7, 1.6) * 20) / 20,
        rotation: rng.int(0, 359),
        grain: Math.round(rng.range(0, 0.25) * 20) / 20,
        particles: rng.int(5, 12) * 10000,
        psteps: rng.int(15, 35) * 10,
      };
    },

    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      const buf = document.createElement('canvas');
      const bctx = buf.getContext('2d', { alpha: false });
      let raf = 0, phase = 0, sand = null, chunkTimer = 0;
      const CAP = 1100;

      function computeSize(s) {
        const ar = aspectRatio(s);
        let w = Math.min(CAP, Math.max(320, canvas.width));
        let h = Math.round(w * ar);
        if (h > CAP) { h = CAP; w = Math.round(h / ar); }
        return [w, h];
      }

      function blit() {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status(s) {
        const modes = modeList(s).map(k => '(' + k.n + ',' + k.m + ')').join(' ');
        const name = s.mode === 'plate' ? (s.plate === 'circle' ? 'circular plate' : 'square plate') : (s.mode === 'moire' ? 'moiré' : s.sources + ' sources');
        host.setStatus(
          '<span><b>' + name + '</b></span>' +
          (s.mode === 'plate' ? '<span>' + modes + '</span>' : '') +
          (s.style === 'sand' && sand ? '<span>' + sand.count.toLocaleString() + ' grains, step ' + sand.step + '</span>' : '<span>' + s.style + '</span>'));
      }

      function renderStatic() {
        const s = host.getState();
        const [w, h] = computeSize(s);
        buf.width = w; buf.height = h;
        bctx.putImageData(computeToImageData(bctx, s, w, h, phase, null, 0), 0, 0);
        blit();
        status(s);
      }

      function renderSand() {
        const s = host.getState();
        const [w, h] = computeSize(s);
        buf.width = w; buf.height = h;
        bctx.putImageData(computeToImageData(bctx, s, w, h, 0, sand.buf, sand.max), 0, 0);
        blit();
        status(s);
      }

      function stop() {
        cancelAnimationFrame(raf); raf = 0;
        clearTimeout(chunkTimer); chunkTimer = 0;
      }

      function startSand() {
        const s = host.getState();
        const [w, h] = computeSize(s);
        sand = makeSand(s, w, h);
        const total = s.psteps;
        const perFrame = Math.max(1, Math.round(total / 60));
        if (host.reducedMotion()) {
          const chunk = () => {
            const left = total - sand.step;
            if (left <= 0) { renderSand(); return; }
            sandStep(sand, s, w, h, Math.min(30, left));
            renderSand();
            chunkTimer = setTimeout(chunk, 0);
          };
          chunk();
          return;
        }
        const frame = () => {
          if (sand.step >= total) { renderSand(); return; }
          sandStep(sand, s, w, h, perFrame);
          renderSand();
          raf = requestAnimationFrame(frame);
        };
        frame();
      }

      function startPhase() {
        const frame = () => {
          phase += 0.05;
          renderStatic();
          raf = requestAnimationFrame(frame);
        };
        frame();
      }

      function go() {
        stop();
        phase = 0;
        const s = host.getState();
        if (s.style === 'sand') { startSand(); return; }
        if (s.animate && s.mode !== 'plate' && !host.reducedMotion()) { startPhase(); return; }
        renderStatic();
      }

      return {
        aspect(s) { return aspectRatio(s); },
        regenerate() { go(); },
        repaint() {
          const s = host.getState();
          if (s.style === 'sand') { if (!sand) { go(); return; } renderSand(); return; }
          if (raf) return;
          renderStatic();
        },
        live(key) {
          if (key === 'animate') go();
        },
        resize() {
          const s = host.getState();
          if (s.style === 'sand') { if (sand) blit(); else go(); return; }
          if (raf) return;
          renderStatic();
        },
        pause() { stop(); },
        resume() {
          const s = host.getState();
          if (s.style === 'sand') { if (sand && sand.step >= s.psteps) { renderSand(); return; } go(); return; }
          if (s.animate && s.mode !== 'plate' && !host.reducedMotion()) { stop(); startPhase(); return; }
          renderStatic();
        },
        action(key) {
          if (key !== 'reroll') return;
          const s = host.getState();
          s.rerolls = (s.rerolls || 0) + 1;
          if (s.mode === 'plate') {
            const rng = U.makeRng(s.seed + '/modes/' + s.rerolls);
            s.n1 = rng.int(1, 11); s.m1 = rng.int(1, 11);
            s.n2 = rng.int(0, 9); s.m2 = rng.int(0, 9);
            s.a2 = Math.round(rng.range(0.1, 0.6) * 50) / 50;
          }
          go();
        },
        async exportPNG(w, h) {
          const s = host.getState();
          const out = document.createElement('canvas');
          out.width = w; out.height = h;
          const octx = out.getContext('2d', { alpha: false });
          if (s.style === 'sand') {
            const es = Math.min(2400, Math.max(w, h));
            const ar = aspectRatio(s);
            const ew = ar > 1 ? Math.round(es / ar) : es;
            const eh = ar > 1 ? es : Math.round(es * ar);
            const esand = makeSand(s, ew, eh);
            const steps = Math.min(s.psteps, 320);
            sandStep(esand, s, ew, eh, steps);
            const tmp = document.createElement('canvas');
            tmp.width = ew; tmp.height = eh;
            const tctx = tmp.getContext('2d', { alpha: false });
            tctx.putImageData(computeToImageData(tctx, s, ew, eh, 0, esand.buf, esand.max), 0, 0);
            octx.imageSmoothingEnabled = true;
            octx.imageSmoothingQuality = 'high';
            octx.drawImage(tmp, 0, 0, w, h);
          } else {
            octx.putImageData(computeToImageData(octx, s, w, h, phase, null, 0), 0, 0);
          }
          return U.toBlob(out);
        },
        exportSVG(w, h) {
          const s = host.getState();
          if (s.style !== 'contour') return null;
          const W = w || 1000, H = h || Math.round(W * aspectRatio(s));
          const field = makeField(s, phase);
          const ar = aspectRatio(s);
          const n = Math.max(120, Math.min(480, Math.round(Math.min(W, H) / 6)));
          const pal = s.palette || ['#111'];
          const ink = pal[Math.min(pal.length - 1, s.lineColor | 0)] || pal[0];
          const lw = (s.style === 'nodal'
            ? Math.max(0.6, (s.threshold + s.softness) * Math.min(W, H) * 0.55)
            : Math.max(0.4, Math.min(W, H) / 900)).toFixed(2);
          function F(i, j) { return field((i / n) * 2 - 1, ((j / n) * 2 - 1) * ar); }
          function pt(i, j) { return [(i / n) * W, (j / n) * H]; }
          function mid(ia, ja, ib, jb, ua, ub) {
            const t = ua === ub ? 0.5 : ua / (ua - ub);
            const a = pt(ia, ja), b = pt(ib, jb);
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          }
          let d = '';
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            const ua = F(i, j), ub = F(i + 1, j), uc = F(i + 1, j + 1), ud = F(i, j + 1);
            const code = (ua > 0 ? 1 : 0) | (ub > 0 ? 2 : 0) | (uc > 0 ? 4 : 0) | (ud > 0 ? 8 : 0);
            if (!code || code === 15) continue;
            const e = [], push = (p, q) => e.push(p, q);
            if (code === 1 || code === 14) push(mid(i, j, i, j + 1, ua, ud), mid(i, j, i + 1, j, ua, ub));
            else if (code === 2 || code === 13) push(mid(i, j, i + 1, j, ua, ub), mid(i + 1, j, i + 1, j + 1, ub, uc));
            else if (code === 4 || code === 11) push(mid(i + 1, j, i + 1, j + 1, ub, uc), mid(i, j + 1, i + 1, j + 1, ud, uc));
            else if (code === 8 || code === 7) push(mid(i, j, i, j + 1, ua, ud), mid(i, j + 1, i + 1, j + 1, ud, uc));
            else if (code === 3 || code === 12) push(mid(i, j, i, j + 1, ua, ud), mid(i + 1, j, i + 1, j + 1, ub, uc));
            else if (code === 6 || code === 9) push(mid(i, j, i + 1, j, ua, ub), mid(i, j + 1, i + 1, j + 1, ud, uc));
            else {
              push(mid(i, j, i, j + 1, ua, ud), mid(i, j, i + 1, j, ua, ub));
              push(mid(i + 1, j, i + 1, j + 1, ub, uc), mid(i, j + 1, i + 1, j + 1, ud, uc));
            }
            for (let k = 0; k + 1 < e.length; k += 2)
              d += 'M' + e[k][0].toFixed(2) + ' ' + e[k][1].toFixed(2) + 'L' + e[k + 1][0].toFixed(2) + ' ' + e[k + 1][1].toFixed(2);
          }
          const body = '<path d="' + d + '" fill="none" stroke="' + U.svgEsc(ink) + '" stroke-width="' + lw + '" stroke-linecap="round"/>';
          return U.svgBlob(W, H, s.bg, body);
        },
      };
    },
  });
})();

