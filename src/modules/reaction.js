
/* modules/reaction.js */
/* Reaction-Diffusion — Gray-Scott activator/inhibitor chemistry on the GPU (WebGL2). */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const DEG = Math.PI / 180;

  /* ---------------- shaders ---------------- */
  // One Gray-Scott step. U in .r, V in .g. 9-point Laplacian (Sims weights) + optional anisotropic correction,
  // spatially varying F/k (gradient + fbm noise), optional constant drift (semi-Lagrangian back-sample).
  const SIM_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_state;
  uniform vec2 u_res, u_aspect, u_noff, u_drift;
  uniform float u_F, u_k, u_Du, u_Dv, u_dt;
  uniform float u_gradF, u_gradK, u_gradAng;
  uniform float u_noiseAmt, u_noiseScale;
  uniform float u_aniso, u_anisoAng;
  ${G.GLSL.hash}
  ${G.GLSL.noise}
  vec2 S(vec2 uv){ return texture(u_state, uv).rg; }
  void main(){
    vec2 px = 1.0 / u_res;
    vec2 p = v_uv - u_drift * px;
    vec2 c = S(p);
    vec2 n = S(p + vec2(0.0, px.y)), s = S(p - vec2(0.0, px.y));
    vec2 e = S(p + vec2(px.x, 0.0)), w = S(p - vec2(px.x, 0.0));
    vec2 ne = S(p + px), sw = S(p - px);
    vec2 nw = S(p + vec2(-px.x, px.y)), se = S(p + vec2(px.x, -px.y));
    vec2 lap = 0.2 * (n + s + e + w) + 0.05 * (ne + nw + se + sw) - c;
    if (u_aniso > 0.0) {
      // D = I + a(2vv^T - I): stretches diffusion along v, squeezes it across; trace-free so the mean rate is unchanged
      vec2 uxx = e + w - 2.0 * c, uyy = n + s - 2.0 * c, uxy = 0.25 * (ne + sw - nw - se);
      float ca = cos(u_anisoAng), sa = sin(u_anisoAng);
      lap += 0.3 * u_aniso * ((2.0 * ca * ca - 1.0) * uxx + 4.0 * ca * sa * uxy + (2.0 * sa * sa - 1.0) * uyy);
    }
    vec2 q = (v_uv - 0.5) * u_aspect;
    vec2 g = vec2(cos(u_gradAng), sin(u_gradAng));
    float F = u_F + u_gradF * dot(q, g);
    float k = u_k + u_gradK * dot(q, vec2(-g.y, g.x));
    if (u_noiseAmt > 0.0) {
      F += u_noiseAmt * fbm(q * u_noiseScale + u_noff, 4);
      k += 0.4 * u_noiseAmt * fbm(q * u_noiseScale + u_noff.yx + 7.31, 4);
    }
    F = clamp(F, 0.0, 0.14); k = clamp(k, 0.02, 0.09);
    float uvv = c.x * c.y * c.y;
    float Un = c.x + u_dt * (u_Du * lap.x - uvv + F * (1.0 - c.x));
    float Vn = c.y + u_dt * (u_Dv * lap.y + uvv - (F + k) * c.y);
    outColor = vec4(clamp(Un, 0.0, 1.0), clamp(Vn, 0.0, 1.0), 0.0, 1.0);
  }`;

  // Paint pass: channel -> tone curve -> palette ramp, plus emboss lighting from the V gradient.
  const RENDER_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_state;
  uniform vec2 u_res;
  uniform int u_channel;
  uniform float u_exposure, u_gamma, u_contrast, u_low, u_high, u_levels, u_light, u_lightAng, u_smooth;
  uniform bool u_poster;
  ${G.GLSL.ramp}
  vec2 bil(vec2 uv){
    vec2 p = uv * u_res - 0.5; vec2 i = floor(p), f = fract(p);
    vec2 a = texture(u_state, (i + 0.5) / u_res).rg, b = texture(u_state, (i + vec2(1.5, 0.5)) / u_res).rg;
    vec2 c = texture(u_state, (i + vec2(0.5, 1.5)) / u_res).rg, d = texture(u_state, (i + 1.5) / u_res).rg;
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  vec2 smp(vec2 uv){
    if (u_smooth <= 0.0) return bil(uv);
    vec2 d = u_smooth / u_res;
    vec2 s = 4.0 * bil(uv);
    s += 2.0 * (bil(uv + vec2(d.x, 0.0)) + bil(uv - vec2(d.x, 0.0)) + bil(uv + vec2(0.0, d.y)) + bil(uv - vec2(0.0, d.y)));
    s += bil(uv + d) + bil(uv - d) + bil(uv + vec2(d.x, -d.y)) + bil(uv + vec2(-d.x, d.y));
    return s / 16.0;
  }
  void main(){
    vec2 px = 1.0 / u_res;
    vec2 c = smp(v_uv);
    vec2 e = smp(v_uv + vec2(px.x, 0.0)), w = smp(v_uv - vec2(px.x, 0.0));
    vec2 n = smp(v_uv + vec2(0.0, px.y)), s = smp(v_uv - vec2(0.0, px.y));
    vec2 grad = vec2(e.y - w.y, n.y - s.y) * 0.5;
    float v;
    if (u_channel == 0) v = c.y * 2.0;
    else if (u_channel == 1) v = c.x;
    else if (u_channel == 2) v = c.x - c.y;
    else v = length(grad) * 6.0;
    v = clamp((v - u_low) / max(u_high - u_low, 1e-4), 0.0, 1.0);
    v = pow(v, u_gamma) * u_exposure;
    v = clamp((v - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    if (u_poster) v = min(floor(v * u_levels), u_levels - 1.0) / (u_levels - 1.0);
    vec3 col = ramp(v);
    if (u_light > 0.0) {
      float sh = dot(grad, vec2(cos(u_lightAng), sin(u_lightAng))) * u_light * 7.0;
      col = clamp(col * (1.0 + sh) + 0.3 * sh, 0.0, 1.0);
    }
    outColor = vec4(col, 1.0);
  }`;

  /* ---------------- helpers ---------------- */
  function gridSize(s) {
    const res = Number(s.resolution), ar = ASPECTS[s.aspect] || 1;
    let w, h;
    if (ar >= 1) { h = res; w = Math.round(res / ar); } else { w = res; h = Math.round(res * ar); }
    return [w & ~1, h & ~1];
  }

  // float32 -> float16 bit pattern, for the rgba16f fallback upload (values are all in [0,1])
  function toHalf(f32) {
    const out = new Uint16Array(f32.length), fb = new Float32Array(1), ib = new Int32Array(fb.buffer);
    for (let i = 0; i < f32.length; i++) {
      fb[0] = f32[i];
      const x = ib[0], sign = (x >> 16) & 0x8000, exp = ((x >> 23) & 0xff) - 112;
      out[i] = exp <= 0 ? sign : exp >= 31 ? sign | 0x7c00 : sign | (exp << 10) | ((x >> 13) & 0x3ff);
    }
    return out;
  }

  // Initial chemistry: U=1,V=0 everywhere, seeded regions U=0.5,V=0.25 (Pearson) with 1% noise. All from the seed rng.
  function seedState(s, w, h) {
    const rng = U.makeRng(s.seed + '/seed');
    const mask = new Uint8Array(w * h);
    const d = s.density, m = Math.min(w, h);
    const disk = (cx, cy, r) => {
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) mask[y * w + x] = 1;
      }
    };
    const rect = (x0, y0, x1, y1) => {
      x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(w, x1 | 0); y1 = Math.min(h, y1 | 0);
      for (let y = y0; y < y1; y++) mask.fill(1, y * w + x0, y * w + x1);
    };
    switch (s.seeding) {
      case 'random': {
        const n = Math.round((8 + d * d * 700) * (w * h) / (512 * 512));
        for (let i = 0; i < n; i++) disk(rng() * w, rng() * h, 1.5 + rng() * 2.5);
        break;
      }
      case 'disk': disk(w / 2, h / 2, m * (0.03 + 0.22 * d)); break;
      case 'disks': {
        const n = 3 + Math.round(d * 28);
        for (let i = 0; i < n; i++) disk(rng() * w, rng() * h, m * (0.012 + 0.035 * rng()));
        break;
      }
      case 'ring': {
        const r = m * (0.18 + 0.22 * d), th = 2 + d * 10;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const dx = x - w / 2, dy = y - h / 2;
          if (Math.abs(Math.sqrt(dx * dx + dy * dy) - r) < th / 2) mask[y * w + x] = 1;
        }
        break;
      }
      case 'stripes': {
        const n = 2 + Math.round(d * 18), ang = rng() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang);
        const period = m / n, duty = 0.12 + 0.3 * d, ph = rng();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const t = (x * ca + y * sa) / period + ph;
          if (t - Math.floor(t) < duty) mask[y * w + x] = 1;
        }
        break;
      }
      case 'threshold': {
        const noise = U.makeNoise(rng), freq = 2.5 + d * 5, thr = 0.85 - 1.3 * d;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (noise.fbm(x / m * freq, y / m * freq, 4) > thr) mask[y * w + x] = 1;
        }
        break;
      }
      default: { // 'grid': rows of blocky glyph-like marks
        const cs = Math.max(6, Math.round(m / (6 + d * 26))), pad = Math.max(1, Math.round(cs * 0.2));
        for (let cy = 0; cy < h; cy += cs) for (let cx = 0; cx < w; cx += cs) {
          if (rng() > 0.82) continue;
          const strokes = 1 + (rng() < 0.4 ? 1 : 0);
          for (let k = 0; k < strokes; k++) {
            const gw = pad + rng() * (cs - 2 * pad) * 0.7, gh = pad + rng() * (cs - 2 * pad) * 0.7;
            const gx = cx + pad + rng() * (cs - 2 * pad - gw), gy = cy + pad + rng() * (cs - 2 * pad - gh);
            rect(gx, gy, gx + Math.max(2, gw), gy + Math.max(2, gh));
          }
        }
      }
    }
    const data = new Float32Array(w * h * 4);
    for (let i = 0, j = 0; i < w * h; i++, j += 4) {
      if (mask[i]) { data[j] = 0.5 + (rng() - 0.5) * 0.02; data[j + 1] = (Number(s.seedV) || 0.25) + (rng() - 0.5) * 0.02; }
      else { data[j] = 1.0; data[j + 1] = 0.0; }
      data[j + 3] = 1.0;
    }
    return data;
  }

  const fmt4 = v => v.toFixed(4), fmt2 = v => v.toFixed(2), fmt1 = v => v.toFixed(1), fmtDeg = v => v + '°';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) => Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});

  const CHANNELS = { v: 0, u: 1, umv: 2, gv: 3 };
  const SEEDINGS = ['random', 'disk', 'disks', 'ring', 'stripes', 'threshold', 'grid'];
  // (F, k) coordinates of the classic Pearson/Sims regimes, used by "Surprise me"
  const REGIMES = [[0.0545, 0.062], [0.0367, 0.0649], [0.037, 0.06], [0.03, 0.062], [0.078, 0.061], [0.029, 0.057], [0.098, 0.057], [0.026, 0.051], [0.039, 0.058], [0.062, 0.061], [0.018, 0.051], [0.025, 0.06], [0.046, 0.0594]];

  Studio.register({
    id: 'reaction', name: 'Reaction-Diffusion', subtitle: 'Gray-Scott activator/inhibitor chemistry · 1983', equation: 'du/dt = Du·lap u - u·v^2 + F(1-u);   dv/dt = Dv·lap v + u·v^2 - (F+k)v', credit: "Gray-Scott model: Peter Gray and Stephen Scott, 1983-84. The idea that two diffusing chemicals can break symmetry into pattern is Alan Turing, 'The chemical basis of morphogenesis', 1952.", order: 80,
    blurb: 'Two virtual chemicals share a grid: U is fed in at rate F, converted into V by the reaction U + 2V → 3V, and V is removed at rate F + k. U diffuses faster than V, so a growing spot of V starves its own center while its edges keep spreading. Depending only on F and k, this single rule settles into spots, stripes, mazes, mitosis or coral — Pearson mapped the whole zoo in 1993, and the same maths shapes zebra stripes, seashell pigment and fingerprint ridges.',

    schema: [
      { group: 'Grid', key: 'resolution', label: 'Resolution', type: 'seg', kind: 'geom', options: [[384, '384'], [512, '512'], [768, '768'], [1024, '1024'], [1536, '1536'], [2048, '2048']] },
      { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
      { group: 'Grid', key: 'boundary', label: 'Boundary', type: 'seg', kind: 'geom', options: [['wrap', 'Wrap'], ['clamp', 'Clamp']] },
      { group: 'Grid', key: 'seeding', label: 'Seeding', type: 'seg', kind: 'geom', wrap: true, options: [['random', 'Noise'], ['disk', 'Disk'], ['disks', 'Disks'], ['ring', 'Ring'], ['stripes', 'Stripes'], ['threshold', 'Blobs'], ['grid', 'Glyphs']] },
      RANGE('Grid', 'density', 'Seed density', 'geom', 0.05, 1, 0.01, fmt2),
      RANGE('Grid', 'seedV', 'Seed strength', 'geom', 0.1, 1, 0.05, fmt2, {
        hint: 'V inside the seeded regions. Pearson used 0.25, which is enough at low feed rates; the high-feed regimes (bubbles, worms) need a strong seed or V dies before the pattern forms.' }),

      RANGE('Chemistry', 'F', 'Feed F', 'live', 0.01, 0.11, 0.0005, fmt4),
      RANGE('Chemistry', 'k', 'Kill k', 'live', 0.04, 0.075, 0.0005, fmt4),
      RANGE('Chemistry', 'Du', 'Diffusion U', 'live', 0.1, 1.2, 0.01, fmt2),
      RANGE('Chemistry', 'Dv', 'Diffusion V', 'live', 0.05, 0.6, 0.01, fmt2),
      RANGE('Chemistry', 'dt', 'Time step', 'live', 0.5, 1.2, 0.01, fmt2, { hint: 'Above about Du × dt ≈ 1.2 the integration goes unstable and checkerboards.' }),

      RANGE('Variation', 'gradF', 'F gradient', 'live', 0, 0.09, 0.001, v => v.toFixed(3)),
      RANGE('Variation', 'gradK', 'k gradient', 'live', 0, 0.03, 0.0005, fmt4),
      RANGE('Variation', 'gradAngle', 'Gradient angle', 'live', 0, 359, 1, fmtDeg, { dimUnless: s => s.gradF > 0 || s.gradK > 0 }),
      RANGE('Variation', 'noiseAmt', 'Noise amount', 'live', 0, 0.03, 0.0005, fmt4),
      RANGE('Variation', 'noiseScale', 'Noise scale', 'live', 0.5, 8, 0.1, fmt1, { dimUnless: s => s.noiseAmt > 0 }),

      RANGE('Direction', 'aniso', 'Anisotropy', 'live', 0, 0.85, 0.01, fmt2),
      RANGE('Direction', 'anisoAngle', 'Stretch angle', 'live', 0, 179, 1, fmtDeg, { dimUnless: s => s.aniso > 0 }),
      RANGE('Direction', 'drift', 'Drift speed', 'live', 0, 0.6, 0.005, v => v.toFixed(3)),
      RANGE('Direction', 'driftAngle', 'Drift angle', 'live', 0, 359, 1, fmtDeg, { dimUnless: s => s.drift > 0 }),

      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: 'live' },
      RANGE('Simulation', 'steps', 'Steps per frame', 'live', 1, 40, 1, String),
      { group: 'Simulation', key: 'burst', label: 'Run 500 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },

      { group: 'Color', key: 'channel', label: 'Channel', type: 'seg', kind: 'paint', options: [['v', 'V'], ['u', 'U'], ['umv', 'U − V'], ['gv', '|∇V|']] },
      RANGE('Color', 'exposure', 'Exposure', 'paint', 0.3, 3, 0.01, fmt2),
      RANGE('Color', 'gamma', 'Gamma', 'paint', 0.3, 3, 0.01, fmt2),
      RANGE('Color', 'contrast', 'Contrast', 'paint', 0.5, 3, 0.01, fmt2),
      RANGE('Color', 'low', 'Low threshold', 'paint', 0, 0.9, 0.01, fmt2),
      RANGE('Color', 'high', 'High threshold', 'paint', 0.1, 1.5, 0.01, fmt2),
      { group: 'Color', key: 'posterize', label: 'Posterize', type: 'toggle', kind: 'paint' },
      RANGE('Color', 'levels', 'Levels', 'paint', 2, 12, 1, String, { dimUnless: s => s.posterize }),

      RANGE('Lighting', 'light', 'Emboss strength', 'paint', 0, 1, 0.01, fmt2),
      RANGE('Lighting', 'lightAngle', 'Light angle', 'paint', 0, 359, 1, fmtDeg, { dimUnless: s => s.light > 0 }),
      RANGE('Lighting', 'smooth', 'Smoothing', 'paint', 0, 2, 0.05, fmt2),
    ],
    defaults: {
      resolution: 512, aspect: '1:1', boundary: 'wrap', seeding: 'random', density: 0.4, seedV: 0.25,
      F: 0.0545, k: 0.062, Du: 1.0, Dv: 0.5, dt: 1.0,
      gradF: 0, gradK: 0, gradAngle: 0, noiseAmt: 0, noiseScale: 2.5,
      aniso: 0, anisoAngle: 45, drift: 0, driftAngle: 0,
      running: true, steps: 16,
      channel: 'v', exposure: 1, gamma: 1, contrast: 1, low: 0, high: 1, posterize: false, levels: 4,
      light: 0.35, lightAngle: 315, smooth: 0.6,
    },
    presets: {
      coral: { label: 'Coral', p: { F: 0.0545, k: 0.062, seeding: 'random', density: 0.4, channel: 'v', light: 0.35, lightAngle: 315, posterize: false, gradF: 0, gradK: 0, noiseAmt: 0, aniso: 0, drift: 0, boundary: 'wrap', exposure: 1, gamma: 1, contrast: 1, low: 0, high: 1 }, palette: Studio.PALETTES.petri },
      mitosis: { label: 'Mitosis', p: { F: 0.034, k: 0.0618, seeding: 'threshold', density: 0.45, channel: 'v', light: 0.5, lightAngle: 300, posterize: false, gradF: 0, gradK: 0, noiseAmt: 0, aniso: 0, drift: 0, boundary: 'wrap', exposure: 1.1, gamma: 0.9, contrast: 1.1, low: 0, high: 1 }, palette: Studio.PALETTES.bioluminescent },
      fingerprint: { label: 'Fingerprint', p: { F: 0.037, k: 0.06, seeding: 'threshold', density: 0.5, channel: 'v', light: 0.25, lightAngle: 315, posterize: false, gradF: 0, gradK: 0, noiseAmt: 0, aniso: 0.35, anisoAngle: 30, drift: 0, boundary: 'wrap', exposure: 1, gamma: 1, contrast: 1.2, low: 0, high: 0.95 }, palette: Studio.PALETTES.graphite },
      spots: { label: 'Spots', p: { F: 0.026, k: 0.061, seeding: 'random', density: 0.6, channel: 'v', light: 0.45, lightAngle: 320, posterize: false, gradF: 0, gradK: 0, noiseAmt: 0, aniso: 0, drift: 0, boundary: 'wrap', exposure: 1, gamma: 1, contrast: 1, low: 0, high: 1 }, palette: Studio.PALETTES.verdigris },
      worms: { label: 'Worms', p: { F: 0.062, k: 0.061, seeding: 'threshold', density: 0.45, channel: 'v', light: 0.6, lightAngle: 300, posterize: false, gradF: 0, gradK: 0, noiseAmt: 0, aniso: 0, drift: 0, boundary: 'wrap', exposure: 1.1, gamma: 1, contrast: 1, low: 0, high: 1 }, palette: Studio.PALETTES.ember },
      maze: { label: 'Maze', p: { F: 0.029, k: 0.057, seeding: 'random', density: 0.5, channel: 'v', light: 0.3, lightAngle: 315, posterize: false, gradF: 0, gradK: 0, noiseAmt: 0, aniso: 0, drift: 0, boundary: 'wrap', exposure: 1, gamma: 1, contrast: 1.1, low: 0, high: 1 }, palette: Studio.PALETTES.harbor },
      bubbles: { label: 'Bubbles', p: { F: 0.098, k: 0.057, seeding: 'threshold', density: 0.5, seedV: 1, channel: 'u', light: 0.5, lightAngle: 320, posterize: false, gradF: 0, gradK: 0, noiseAmt: 0, aniso: 0, drift: 0, boundary: 'wrap', exposure: 1, gamma: 1.2, contrast: 1.2, low: 0.1, high: 1 }, palette: Studio.PALETTES.glacier },
      solitons: { label: 'Solitons', p: { F: 0.03, k: 0.062, seeding: 'grid', density: 0.5, channel: 'v', light: 0.4, lightAngle: 315, posterize: false, gradF: 0, gradK: 0, noiseAmt: 0, aniso: 0, drift: 0, boundary: 'wrap', exposure: 1, gamma: 1, contrast: 1, low: 0, high: 1 }, palette: Studio.PALETTES.nightshade },
      map: { label: 'Parameter map', p: { F: 0.05, k: 0.06, gradF: 0.08, gradK: 0.024, gradAngle: 0, noiseAmt: 0, seeding: 'threshold', density: 0.55, boundary: 'clamp', aniso: 0, drift: 0, channel: 'v', light: 0.3, lightAngle: 315, posterize: false, exposure: 1, gamma: 1, contrast: 1, low: 0, high: 1 }, palette: Studio.PALETTES.thermal },
    },
    hints: {
      Chemistry: 'F feeds U in, k removes V. The interesting regimes live on a thin diagonal band: raise F and k together to move from spots through stripes to mazes and coral.',
      Variation: 'F changes along the gradient angle, k perpendicular to it, so a strong pair of gradients lays out the whole Pearson parameter map in one image. Noise scatters regimes instead.',
      Direction: 'Anisotropy stretches diffusion along an angle for combed, wood-grain textures. Drift advects the whole chemistry so patterns streak and trail.',
    },
    closedGroups: ['Direction', 'Lighting'],
    palette: true, defaultPalette: 'petri', paletteLabel: 'Colors (low → high)',
    headline: 'steps', headlineLabel: 'steps/frame',

    surprise(rng) {
      const [F, k] = rng.pick(REGIMES);
      const p = {
        F: +(F + rng.range(-0.002, 0.002)).toFixed(4), k: +(k + rng.range(-0.001, 0.001)).toFixed(4),
        Du: 1, Dv: 0.5, dt: 1, resolution: 512, boundary: 'wrap',
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        seeding: rng.pick(SEEDINGS), density: +rng.range(0.25, 0.8).toFixed(2),
        channel: rng.pick(['v', 'v', 'v', 'u', 'umv', 'gv']),
        exposure: 1, gamma: +rng.range(0.8, 1.3).toFixed(2), contrast: +rng.range(0.9, 1.4).toFixed(2), low: 0, high: +rng.range(0.85, 1.1).toFixed(2),
        posterize: rng() < 0.2, levels: rng.int(3, 7),
        light: rng() < 0.7 ? +rng.range(0.2, 0.7).toFixed(2) : 0, lightAngle: rng.int(0, 359), smooth: +rng.range(0.3, 1).toFixed(2),
        gradF: 0, gradK: 0, gradAngle: rng.int(0, 359), noiseAmt: 0, noiseScale: +rng.range(1, 4).toFixed(1),
        aniso: 0, anisoAngle: rng.int(0, 179), drift: 0, driftAngle: rng.int(0, 359),
      };
      const r = rng();
      if (r < 0.25) { p.gradF = +rng.range(0.02, 0.07).toFixed(3); p.gradK = +rng.range(0.005, 0.02).toFixed(4); p.boundary = 'clamp'; }
      else if (r < 0.45) { p.noiseAmt = +rng.range(0.006, 0.02).toFixed(4); }
      if (rng() < 0.3) p.aniso = +rng.range(0.25, 0.7).toFixed(2);
      if (rng() < 0.15) p.drift = +rng.range(0.05, 0.25).toFixed(3);
      return p;
    },

    create(host) {
      const gl = G.createGL(host.canvas);
      const noop = () => {};
      const dead = msg => {
        host.setStatus(msg);
        host.fault(msg);
        return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
      };
      if (!gl) return dead('WebGL2 is not available in this browser');
      let texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
      if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');
      // linear filtering of 32-bit float textures needs its own extension; 16f is filterable in core WebGL2
      const filter = (texType === 'rgba16f' || gl.getExtension('OES_texture_float_linear')) ? 'linear' : 'nearest';

      let simPass, renderPass, splatPass;
      try { simPass = new G.Pass(gl, SIM_FS); renderPass = new G.Pass(gl, RENDER_FS); splatPass = new G.Pass(gl, G.GLSL.splatFS); }
      catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let pp = null, gw = 0, gh = 0, gridWrap = '';
      let ramp = null, rampKey = '';
      let raf = 0, chunkTimer = 0, stepCount = 0, frameNo = 0, noff = [0, 0];

      function ensureGrid(s) {
        const [w, h] = gridSize(s), wrap = s.boundary === 'wrap' ? 'repeat' : 'clamp';
        if (pp && gw === w && gh === h && gridWrap === wrap) return;
        if (pp) pp.dispose();
        try { pp = new G.PingPong(gl, w, h, { type: texType, filter, wrap }); }
        catch (err) {
          if (texType !== 'rgba16f') throw err;
          throw new Error('Float render targets are not available in this browser');
        }
        gw = w; gh = h; gridWrap = wrap;
      }
      function upload(target, f32) {
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        if (texType === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, f32);
        else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.HALF_FLOAT, toHalf(f32));
      }
      function ensureRamp(s) {
        const key = s.bg + '|' + s.palette.join(',');
        if (ramp && rampKey === key) return;
        if (ramp) ramp.dispose();
        ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key;
      }
      function simUniforms(s) {
        const mx = Math.max(gw, gh);
        return {
          u_res: [gw, gh], u_aspect: [gw / mx, gh / mx], u_noff: noff,
          u_F: s.F, u_k: s.k, u_Du: s.Du, u_Dv: s.Dv, u_dt: s.dt,
          u_gradF: s.gradF, u_gradK: s.gradK, u_gradAng: s.gradAngle * DEG,
          u_noiseAmt: s.noiseAmt, u_noiseScale: s.noiseScale,
          u_aniso: s.aniso, u_anisoAng: s.anisoAngle * DEG,
          u_drift: [s.drift * Math.cos(s.driftAngle * DEG), s.drift * Math.sin(s.driftAngle * DEG)],
        };
      }
      function step(n) {
        const u = simUniforms(host.getState());
        for (let i = 0; i < n; i++) { u.u_state = pp.read; simPass.draw(pp.write, u); pp.swap(); }
        stepCount += n;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_state: pp.read, u_ramp: ramp, u_res: [gw, gh], u_channel: { int: CHANNELS[s.channel] || 0 },
          u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_low: s.low, u_high: s.high,
          u_poster: !!s.posterize, u_levels: s.levels, u_light: s.light, u_lightAng: s.lightAngle * DEG, u_smooth: s.smooth,
        });
      }
      function status(extra) {
        const s = host.getState();
        host.setStatus('<span>grid <b>' + gw + '×' + gh + '</b></span><span>step <b>' + stepCount + '</b></span>' +
          '<span>F ' + s.F.toFixed(4) + ' k ' + s.k.toFixed(4) + '</span>' + (extra ? '<span>' + extra + '</span>' : ''));
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps); render();
        if (++frameNo % 6 === 0) status();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        if (host.getState().running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else status(host.getState().running ? '' : 'paused');
      }
      // Run `total` steps in bounded chunks (keeps the UI responsive), painting progress, then hand back to the loop.
      function burst(total) {
        stop();
        let left = total;
        (function chunk() {
          const n = Math.min(80, left); left -= n;
          step(n); render(); status(left > 0 ? 'running ' + total + ' steps…' : '');
          if (left > 0) chunkTimer = setTimeout(chunk, 0); else startLoop();
        })();
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop();
          const s = host.getState();
          ensureGrid(s);
          const nr = U.makeRng(s.seed + '/noise');
          noff = [nr.range(0, 200), nr.range(0, 200)];
          upload(pp.read, seedState(s, gw, gh));
          stepCount = 0;
          step(300); render(); status();
          if (host.reducedMotion()) burst(2000); else startLoop();
        },
        repaint() { render(); },
        live(key, value) { if (key === 'running') startLoop(); },
        resize() { render(); },
        pause() { stop(); },
        resume() { render(); startLoop(); },
        action(key) { if (key === 'reseed') this.regenerate(); else if (key === 'burst') burst(500); },
        disturb(p) {
          if (!pp || !splatPass) return;
          splatPass.draw(pp.write, { u_src: pp.read, u_pos: [p.x, p.yGL], u_add: [0.45, 0.32, 0, 1], u_rad: 0.07, u_amt: 1, u_mode: { int: 0 } });
          pp.swap(); render();
        },
        async exportPNG(w, h) {
          const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
          if (w > max || h > max) throw new Error('larger than this GPU allows (' + max + ' px)');
          const T = new G.Target(gl, w, h, { type: 'rgba8' });
          render(T);
          const px = new Uint8Array(w * h * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, T.fbo);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          T.dispose();
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
          for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
          ctx.putImageData(img, 0, 0);
          return U.toBlob(c);
        },
      };
    },
  });
})();

