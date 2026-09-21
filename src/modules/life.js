
/* modules/life.js */
/* Artificial Life — Lenia (continuous cellular automata, Bert Chan 2019) and classic discrete automata on the GPU (WebGL2). */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const ASPECTS = { '1:1': 1, '4:5': 1.25 };
  const MODES = { lenia: 0, life: 1, highlife: 1, daynight: 1, seeds: 1, ltl: 2 };
  const MODE_LABEL = { lenia: 'Lenia', life: 'Life B3/S23', highlife: 'HighLife B36/S23', daynight: 'Day & Night', seeds: 'Seeds B2/S', ltl: 'Larger than Life' };
  // bitmasks over neighbor counts 0..8 for the Life family
  const bits = a => a.reduce((m, n) => m | (1 << n), 0);
  const RULES = { life: [bits([3]), bits([2, 3])], highlife: [bits([3, 6]), bits([2, 3])], daynight: [bits([3, 6, 7, 8]), bits([3, 4, 6, 7, 8])], seeds: [bits([2]), 0] };
  const KW = 512; // kernel list texture width (entries are laid out row-major)

  /* ---------------- shaders ---------------- */
  // One automaton step. State: .r = A (0..1), .g = age in steps, .b = trail (decaying max of A).
  // The kernel is a compact list of (dx, dy, weight) entries in an RGBA8 texture, weight split hi/lo for 16-bit precision.
  const SIM_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_state, u_kernel;
  uniform vec2 u_res;
  uniform int u_N, u_mode, u_birth, u_survive;
  uniform float u_kscale, u_mu, u_sigma, u_dt, u_decay, u_b1, u_b2, u_s1, u_s2;
  void main(){
    vec2 px = 1.0 / u_res;
    vec4 c = texture(u_state, v_uv);
    float sum = 0.0;
    for (int i = 0; i < u_N; i++) {
      vec4 e = texelFetch(u_kernel, ivec2(i % ${KW}, i / ${KW}), 0);
      vec2 d = e.rg * 255.0 - 128.0;
      float k = e.b + e.a / 255.0;
      sum += k * texture(u_state, v_uv + d * px).r;
    }
    sum *= u_kscale;
    float a = c.r, an, thr;
    if (u_mode == 0) {
      float g = 2.0 * exp(-(sum - u_mu) * (sum - u_mu) / (2.0 * u_sigma * u_sigma)) - 1.0;
      an = clamp(a + u_dt * g, 0.0, 1.0);
      thr = 0.1;
    } else if (u_mode == 1) {
      int n = int(sum + 0.5);
      bool alive = a > 0.5;
      an = ((alive ? (u_survive >> n) : (u_birth >> n)) & 1) == 1 ? 1.0 : 0.0;
      thr = 0.5;
    } else {
      bool alive = a > 0.5;
      bool nx = alive ? (sum >= u_s1 - 0.5 && sum <= u_s2 + 0.5) : (sum >= u_b1 - 0.5 && sum <= u_b2 + 0.5);
      an = nx ? 1.0 : 0.0;
      thr = 0.5;
    }
    float age = an > thr ? min(c.g + 1.0, 4000.0) : 0.0;
    float trail = max(an, c.b * u_decay);
    outColor = vec4(an, age, trail, 1.0);
  }`;

  /* ---------------- Flow Lenia (Plantec et al. 2023) ----------------
     Standard Lenia adds growth to each cell, so mass appears and vanishes. Flow Lenia reads the
     growth field as a potential instead: mass flows up its gradient and down its own concentration
     gradient, then moves by reintegration tracking, which carries each cell's mass as a unit square
     and splits it across the cells it lands on. The total is conserved exactly, so creatures have to
     compete for a fixed budget of substance rather than conjuring more.
     Pass 1 writes the growth field, pass 2 the clipped flow vector, pass 3 does the transport. */

  // Pass 1: convolution -> growth g, carried alongside A so the next pass needs one fetch per cell.
  const GROWTH_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_state, u_kernel;
  uniform vec2 u_res;
  uniform int u_N;
  uniform float u_kscale, u_mu, u_sigma;
  void main(){
    vec2 px = 1.0 / u_res;
    float a = texture(u_state, v_uv).r;
    float sum = 0.0;
    for (int i = 0; i < u_N; i++) {
      vec4 e = texelFetch(u_kernel, ivec2(i % KWX, i / KWX), 0);
      vec2 d = e.rg * 255.0 - 128.0;
      float k = e.b + e.a / 255.0;
      sum += k * texture(u_state, v_uv + d * px).r;
    }
    sum *= u_kscale;
    float g = 2.0 * exp(-(sum - u_mu) * (sum - u_mu) / (2.0 * u_sigma * u_sigma)) - 1.0;
    outColor = vec4(g, a, 0.0, 1.0);
  }`.replace(/KWX/g, String(KW));

  // Pass 2: F = grad(g) - alpha * grad(A), clipped so no mass outruns the gather radius.
  const FIELD_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_growth;
  uniform vec2 u_res;
  uniform float u_gain, u_alpha, u_drift;
  void main(){
    vec2 px = 1.0 / u_res;
    vec4 c = texture(u_growth, v_uv);
    float gx = texture(u_growth, v_uv + vec2(px.x, 0.0)).r - texture(u_growth, v_uv - vec2(px.x, 0.0)).r;
    float gy = texture(u_growth, v_uv + vec2(0.0, px.y)).r - texture(u_growth, v_uv - vec2(0.0, px.y)).r;
    float ax = texture(u_growth, v_uv + vec2(px.x, 0.0)).g - texture(u_growth, v_uv - vec2(px.x, 0.0)).g;
    float ay = texture(u_growth, v_uv + vec2(0.0, px.y)).g - texture(u_growth, v_uv - vec2(0.0, px.y)).g;
    vec2 f = (vec2(gx, gy) - u_alpha * vec2(ax, ay)) * 0.5 * u_gain;
    float m = length(f);
    if (m > u_drift) f *= u_drift / m;
    outColor = vec4(f, c.g, 1.0);
  }`;

  // Pass 3: reintegration tracking. Each source cell in the 5x5 neighborhood ships its mass to the
  // unit square centered on its displaced position; the overlap with this cell is our share. The
  // shares of any one source sum to 1, which is what keeps the total exactly constant.
  const TRANSPORT_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_field, u_state;
  uniform vec2 u_res;
  uniform float u_decay;
  void main(){
    vec2 px = 1.0 / u_res;
    float acc = 0.0;
    for (int dy = -2; dy <= 2; dy++) {
      for (int dx = -2; dx <= 2; dx++) {
        vec2 off = vec2(float(dx), float(dy));
        vec4 f = texture(u_field, v_uv + off * px);
        vec2 delta = off + f.xy;
        float wx = max(0.0, 1.0 - abs(delta.x));
        float wy = max(0.0, 1.0 - abs(delta.y));
        acc += f.z * wx * wy;
      }
    }
    vec4 c = texture(u_state, v_uv);
    float shown = clamp(acc, 0.0, 1.0);
    float age = shown > 0.1 ? min(c.g + 1.0, 4000.0) : 0.0;
    outColor = vec4(acc, age, max(shown, c.b * u_decay), 1.0);
  }`;

  // Paint pass: trail channel -> tone curve -> palette ramp (bg -> colors); long-lived cells slide down the ramp.
  const RENDER_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_state;
  uniform vec2 u_res;
  uniform float u_gamma, u_contrast, u_high, u_ageAmt, u_ageSpan;
  uniform bool u_pixel;
  ${G.GLSL.ramp}
  vec3 bil(vec2 uv){
    vec2 p = uv * u_res - 0.5; vec2 i = floor(p), f = fract(p);
    vec3 a = texture(u_state, (i + 0.5) / u_res).rgb, b = texture(u_state, (i + vec2(1.5, 0.5)) / u_res).rgb;
    vec3 c = texture(u_state, (i + vec2(0.5, 1.5)) / u_res).rgb, d = texture(u_state, (i + 1.5) / u_res).rgb;
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  void main(){
    vec3 s = u_pixel ? texture(u_state, v_uv).rgb : bil(v_uv);
    float v = pow(clamp(s.b, 0.0, 1.0), u_gamma);
    v = clamp((v - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    float ageT = clamp(s.g / u_ageSpan, 0.0, 1.0);
    v *= u_high * (1.0 - 0.65 * u_ageAmt * ageT);
    outColor = vec4(ramp(v), 1.0);
  }`;

  /* ---------------- helpers ---------------- */
  function gridSize(s) {
    const res = Number(s.grid), ar = ASPECTS[s.aspect] || 1;
    let w, h;
    if (ar >= 1) { h = res; w = Math.round(res / ar); } else { w = res; h = Math.round(res * ar); }
    return [w & ~1, h & ~1];
  }
  const isLenia = s => s.mode === 'lenia';
  const radiusOf = s => (s.mode === 'lenia' || s.mode === 'ltl') ? Math.round(s.R) : 1;

  // float32 -> float16 bit pattern, for the rgba16f fallback upload
  function toHalf(f32) {
    const out = new Uint16Array(f32.length), fb = new Float32Array(1), ib = new Int32Array(fb.buffer);
    for (let i = 0; i < f32.length; i++) {
      fb[0] = f32[i];
      const x = ib[0], sign = (x >> 16) & 0x8000, exp = ((x >> 23) & 0xff) - 112;
      out[i] = exp <= 0 ? sign : exp >= 31 ? sign | 0x7c00 : sign | (exp << 10) | ((x >> 13) & 0x3ff);
    }
    return out;
  }

  // Kernel as a compact list of non-zero taps. Lenia: ring shell of bell curves (1-3 rings, per-ring peak weight),
  // normalized so the weighted sum is a neighborhood mean. Discrete: every cell of the (2R+1)^2 box except the center.
  function buildKernel(s) {
    const lenia = isLenia(s), R = radiusOf(s), rings = lenia ? Math.round(s.rings) : 1;
    let w = [s.w1, s.w2, s.w3].slice(0, rings);
    if (!w.some(x => x > 0)) w = w.map(() => 1);
    const taps = [];
    let sum = 0, max = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      let k;
      if (lenia) {
        const r = Math.sqrt(dx * dx + dy * dy) / R;
        if (r >= 1) continue;
        const Br = rings * r, i = Math.min(rings - 1, Math.floor(Br)), f = Br - Math.floor(Br);
        const z = (f - 0.5) / 0.15;
        k = w[i] * Math.exp(-z * z / 2);
      } else {
        if (dx === 0 && dy === 0) continue;
        k = 1;
      }
      if (k <= 0) continue;
      taps.push(dx, dy, k); sum += k; if (k > max) max = k;
    }
    const N = taps.length / 3, rows = Math.max(1, Math.ceil(N / KW));
    const data = new Uint8Array(KW * rows * 4);
    for (let i = 0, j = 0; i < N; i++, j += 3) {
      const q = Math.round(taps[j + 2] / max * 65535);
      data[i * 4] = taps[j] + 128; data[i * 4 + 1] = taps[j + 1] + 128; data[i * 4 + 2] = q >> 8; data[i * 4 + 3] = q & 255;
    }
    // sum of encoded weights (relative to max) -> scale so the kernel integrates to 1 (Lenia) or counts cells (discrete)
    return { data, N, rows, kscale: lenia ? max / sum : 1 };
  }

  // Initial state from the seed: .r = A, .g = age 0, .b = trail = A
  function seedState(s, w, h) {
    const rng = U.makeRng(s.seed + '/life'), noise = U.makeNoise(rng);
    const lenia = isLenia(s), R = radiusOf(s), m = Math.min(w, h), d = s.density;
    const A = new Float32Array(w * h);
    const cell = () => lenia ? 0.35 + 0.65 * rng() : 1;
    const blob = (cx, cy, rad) => {
      const x0 = Math.max(0, Math.floor(cx - rad * 2)), x1 = Math.min(w - 1, Math.ceil(cx + rad * 2));
      const y0 = Math.max(0, Math.floor(cy - rad * 2)), y1 = Math.min(h - 1, Math.ceil(cy + rad * 2));
      const amp = 0.7 + 0.3 * rng(), ox = rng() * 100, oy = rng() * 100;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy, q = (dx * dx + dy * dy) / (rad * rad);
        if (lenia) {
          if (q > 4) continue;
          const g = Math.exp(-q * 1.6) * amp * (0.75 + 0.5 * noise.fbm(ox + x / (R * 0.45), oy + y / (R * 0.45), 3));
          A[y * w + x] = Math.min(1, A[y * w + x] + Math.max(0, g));
        } else if (q <= 1 && rng() < Math.max(d, 0.25)) A[y * w + x] = 1;
      }
    };
    const blobs = n => {
      for (let i = 0; i < n; i++) {
        const rad = lenia ? R * (0.55 + 0.5 * rng()) : m * (0.03 + 0.07 * rng());
        blob(rad + rng() * (w - 2 * rad), rad + rng() * (h - 2 * rad), rad);
      }
    };
    switch (s.init) {
      case 'noise':
        for (let i = 0; i < w * h; i++) if (rng() < d) A[i] = cell();
        break;
      case 'ring': {
        const r = m * 0.3, th = lenia ? 2.2 * R : Math.max(3, m * 0.05), ox = rng() * 100;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const dx = x - w / 2, dy = y - h / 2, dist = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(dist - r) < th / 2) {
            if (lenia) A[y * w + x] = Math.max(0, Math.min(1, (0.5 + 0.5 * noise.fbm(ox + x / (R * 0.5), y / (R * 0.5), 3)) * (0.5 + d)));
            else if (rng() < d) A[y * w + x] = 1;
          }
        }
        break;
      }
      case 'symmetric': {
        blobs(Math.max(2, Math.round(s.blobs / 2)));
        if (!lenia) for (let i = 0; i < w * h; i++) if (rng() < d * 0.15) A[i] = 1;
        const B = A.slice();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const sx = Math.min(x, w - 1 - x), sy = Math.min(y, h - 1 - y);
          A[y * w + x] = B[sy * w + sx];
        }
        break;
      }
      default: blobs(Math.round(s.blobs)); // 'blobs'
    }
    const data = new Float32Array(w * h * 4);
    for (let i = 0, j = 0; i < w * h; i++, j += 4) { data[j] = A[i]; data[j + 2] = A[i]; data[j + 3] = 1; }
    return data;
  }

  const fmt2 = v => v.toFixed(2), fmt3 = v => v.toFixed(3), pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) => Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const LENIA = s => s.mode === 'lenia', LTL = s => s.mode === 'ltl';
  // Known Lenia regimes [R, T, mu, sigma, rings, w1, w2, w3] used by "Surprise me"
  const REGIMES = [[13, 10, 0.15, 0.015, 1, 1, 0, 0], [13, 10, 0.15, 0.017, 1, 1, 0, 0], [16, 10, 0.26, 0.036, 3, 0.5, 1, 0.67], [13, 10, 0.24, 0.03, 2, 1, 0.5, 0], [12, 8, 0.3, 0.055, 1, 1, 0, 0], [15, 10, 0.28, 0.03, 2, 1, 1, 0], [18, 12, 0.2, 0.024, 2, 0.5, 1, 0]];

  Studio.register({
    id: 'life', name: 'Artificial Life', subtitle: 'Lenia, Flow Lenia and cellular automata · 2019-23', equation: 'A <- clamp(A + (1/T)·G(K*A)),   G(u) = 2·exp(-(u-mu)^2 / 2·sigma^2) - 1', credit: "Lenia: Bert Wang-Chak Chan, 2018-19. The discrete rules go back to John Conway's Game of Life, 1970, and Stanislaw Ulam and John von Neumann's cellular automata in the 1940s.", order: 8,
    blurb: 'Conway\'s Game of Life turns a grid of on/off cells into gliders, oscillators and guns from one rule about eight neighbors. Lenia (Bert Chan, 2019) makes everything continuous: cells hold a value between 0 and 1, the neighborhood is a smooth ring-shaped kernel of radius R, and a bell-shaped growth function nudges each cell up when the weighted neighborhood mean is near μ and down otherwise, a small step 1/T at a time. Out of that come self-organising creatures — Orbium, the first discovered, swims steadily across the grid, holding its shape while every cell in it is continuously being remade.',

    schema: [
      { group: 'Automaton', key: 'mode', label: 'Rule', type: 'seg', kind: 'geom', wrap: true, options: [['lenia', 'Lenia'], ['life', 'Life'], ['highlife', 'HighLife'], ['daynight', 'Day & Night'], ['seeds', 'Seeds'], ['ltl', 'Larger than Life']] },
      { group: 'Automaton', key: 'grid', label: 'Grid', type: 'seg', kind: 'geom', options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512'], [768, '768']] },
      { group: 'Automaton', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', options: [['1:1', '1:1'], ['4:5', '4:5']] },
      RANGE('Automaton', 'R', 'Radius R', 'geom', 6, 24, 1, String, { dimUnless: s => LENIA(s) || LTL(s), hint: 'Neighborhood radius in cells for Lenia and Larger than Life; the classic rules use radius 1.' }),

      RANGE('Lenia', 'T', 'Time T', 'live', 2, 20, 1, String, { dimUnless: LENIA }),
      RANGE('Lenia', 'mu', 'Growth center μ', 'live', 0.1, 0.5, 0.001, fmt3, { dimUnless: LENIA }),
      RANGE('Lenia', 'sigma', 'Growth width σ', 'live', 0.005, 0.1, 0.0005, v => v.toFixed(4), { dimUnless: LENIA }),
      { group: 'Lenia', key: 'flow', label: 'Conserve mass (Flow Lenia)', type: 'toggle', kind: 'live', dimUnless: LENIA,
        hint: 'Growth becomes a flow rather than a source: mass is transported up the growth gradient instead of created, so the total never changes and creatures compete for a fixed budget.' },
      RANGE('Lenia', 'flowGain', 'Flow gain', 'live', 1, 60, 1, String, { dimUnless: s => LENIA(s) && s.flow }),
      RANGE('Lenia', 'flowAlpha', 'Concentration repulsion α', 'live', 0, 3, 0.05, fmt2, { dimUnless: s => LENIA(s) && s.flow }),
      RANGE('Lenia', 'flowDrift', 'Max drift per step (cells)', 'live', 0.1, 1, 0.05, fmt2, { dimUnless: s => LENIA(s) && s.flow }),
      RANGE('Lenia', 'rings', 'Kernel rings', 'geom', 1, 3, 1, String, { dimUnless: LENIA }),
      RANGE('Lenia', 'w1', 'Ring 1 weight', 'geom', 0, 1, 0.01, fmt2, { dimUnless: LENIA }),
      RANGE('Lenia', 'w2', 'Ring 2 weight', 'geom', 0, 1, 0.01, fmt2, { dimUnless: s => LENIA(s) && s.rings >= 2 }),
      RANGE('Lenia', 'w3', 'Ring 3 weight', 'geom', 0, 1, 0.01, fmt2, { dimUnless: s => LENIA(s) && s.rings >= 3 }),

      RANGE('Larger than Life', 'b1', 'Birth from', 'live', 0, 1, 0.005, pct, { dimUnless: LTL }),
      RANGE('Larger than Life', 'b2', 'Birth to', 'live', 0, 1, 0.005, pct, { dimUnless: LTL }),
      RANGE('Larger than Life', 's1', 'Survive from', 'live', 0, 1, 0.005, pct, { dimUnless: LTL }),
      RANGE('Larger than Life', 's2', 'Survive to', 'live', 0, 1, 0.005, pct, { dimUnless: LTL }),

      { group: 'Seeding', key: 'init', label: 'Pattern', type: 'seg', kind: 'geom', options: [['blobs', 'Blobs'], ['noise', 'Noise'], ['ring', 'Ring'], ['symmetric', 'Symmetric']] },
      RANGE('Seeding', 'density', 'Density', 'geom', 0.02, 0.9, 0.01, fmt2),
      RANGE('Seeding', 'blobs', 'Blobs', 'geom', 1, 30, 1, String, { dimUnless: s => s.init === 'blobs' || s.init === 'symmetric' }),
      RANGE('Seeding', 'warmup', 'Warm-up steps', 'geom', 0, 300, 5, String, { hint: 'Steps run before the first frame is shown, so the piece opens with creatures already formed.' }),

      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: 'live' },
      RANGE('Simulation', 'steps', 'Steps per frame', 'live', 1, 20, 1, String),
      RANGE('Simulation', 'decay', 'Trail decay', 'live', 0, 0.99, 0.01, fmt2, { hint: 'Each cell remembers a fading maximum of its past values, so moving creatures leave echoes.' }),
      { group: 'Simulation', key: 'burst', label: 'Run 200 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },

      RANGE('Color', 'gamma', 'Gamma', 'paint', 0.3, 3, 0.01, fmt2),
      RANGE('Color', 'contrast', 'Contrast', 'paint', 0.5, 3, 0.01, fmt2),
      RANGE('Color', 'high', 'Ramp top', 'paint', 0.3, 1, 0.01, fmt2, { hint: 'Where a fully alive cell lands on the ramp. Lower it on palettes whose last color is close to the background.' }),
      RANGE('Color', 'ageAmt', 'Age tint', 'paint', 0, 1, 0.01, fmt2),
      RANGE('Color', 'ageSpan', 'Age span', 'paint', 5, 400, 1, String, { dimUnless: s => s.ageAmt > 0 }),
      { group: 'Color', key: 'pixelate', label: 'Pixelate', type: 'toggle', kind: 'paint' },
    ],
    defaults: {
      mode: 'lenia', grid: 256, aspect: '1:1', R: 13,
      T: 10, mu: 0.28, sigma: 0.05, flow: false, flowGain: 14, flowAlpha: 1, flowDrift: 0.6, rings: 1, w1: 1, w2: 0.5, w3: 0.67,
      b1: 0.28, b2: 0.37, s1: 0.28, s2: 0.48,
      init: 'blobs', density: 0.35, blobs: 24, warmup: 60,
      running: true, steps: 2, decay: 0.85,
      gamma: 0.9, contrast: 1.1, high: 1, ageAmt: 0.35, ageSpan: 60, pixelate: false,
    },
    presets: {
      orbium: { label: 'Gliders', p: { mode: 'lenia', grid: 256, R: 13, T: 10, mu: 0.28, sigma: 0.045, rings: 1, w1: 1, init: 'blobs', density: 0.35, blobs: 24, warmup: 60, steps: 2, decay: 0.85, gamma: 0.9, contrast: 1.1, high: 1, ageAmt: 0.35, ageSpan: 60, pixelate: false, running: true }, palette: Studio.PALETTES.bioluminescent },
      flowlenia: { label: 'Flow Lenia', p: { mode: 'lenia', grid: 256, R: 13, T: 10, mu: 0.28, sigma: 0.05, flow: true, flowGain: 14, flowAlpha: 1, flowDrift: 0.6, rings: 1, w1: 1, init: 'symmetric', density: 0.4, blobs: 30, warmup: 60, steps: 2, decay: 0.85, gamma: 0.9, contrast: 1.1, high: 1, ageAmt: 0.35, ageSpan: 60, pixelate: false, running: true }, palette: Studio.PALETTES.thermal },
      tworings: { label: 'Two rings', p: { mode: 'lenia', grid: 256, R: 13, T: 10, mu: 0.24, sigma: 0.03, rings: 2, w1: 1, w2: 0.5, init: 'blobs', density: 0.35, blobs: 12, warmup: 60, steps: 2, decay: 0.85, gamma: 0.9, contrast: 1.1, high: 1, ageAmt: 0.4, ageSpan: 80, pixelate: false, running: true }, palette: Studio.PALETTES.nightshade },
      amoeba: { label: 'Amoeba', p: { mode: 'lenia', grid: 256, R: 12, T: 8, mu: 0.3, sigma: 0.055, rings: 1, w1: 1, init: 'noise', density: 0.5, warmup: 80, steps: 2, decay: 0.7, gamma: 1, contrast: 1.2, high: 1, ageAmt: 0.5, ageSpan: 120, pixelate: false, running: true }, palette: Studio.PALETTES.verdigris },
      coral: { label: 'Coral reef', p: { mode: 'lenia', grid: 256, R: 15, T: 10, mu: 0.28, sigma: 0.03, rings: 2, w1: 1, w2: 1, init: 'symmetric', density: 0.4, blobs: 14, warmup: 100, steps: 2, decay: 0.5, gamma: 1, contrast: 1.2, high: 1, ageAmt: 0.6, ageSpan: 200, pixelate: false, running: true }, palette: Studio.PALETTES.petri },
      conway: { label: 'Conway', p: { mode: 'life', grid: 192, init: 'noise', density: 0.32, warmup: 20, steps: 1, decay: 0.8, gamma: 1, contrast: 1, high: 1, ageAmt: 0.6, ageSpan: 30, pixelate: true, running: true }, palette: Studio.PALETTES.glacier },
      daynight: { label: 'Day & Night', p: { mode: 'daynight', grid: 256, init: 'noise', density: 0.5, warmup: 40, steps: 1, decay: 0.6, gamma: 1, contrast: 1, high: 1, ageAmt: 0.5, ageSpan: 60, pixelate: true, running: true }, palette: Studio.PALETTES.graphite },
      ltl: { label: 'Larger than Life', p: { mode: 'ltl', grid: 256, R: 5, b1: 0.28, b2: 0.37, s1: 0.28, s2: 0.48, init: 'blobs', density: 0.5, blobs: 12, warmup: 30, steps: 1, decay: 0.85, gamma: 1, contrast: 1.1, high: 1, ageAmt: 0.5, ageSpan: 80, pixelate: true, running: true }, palette: Studio.PALETTES.ember },
      seeds: { label: 'Seeds', p: { mode: 'seeds', grid: 256, init: 'blobs', density: 0.12, blobs: 4, warmup: 30, steps: 1, decay: 0.92, gamma: 1, contrast: 1, high: 1, ageAmt: 0, pixelate: true, running: true }, palette: Studio.PALETTES.thermal },
    },
    hints: {
      Lenia: 'The kernel is a ring of bell curves around each cell; the growth function rewards a neighborhood mean near μ (width σ). Orbium lives at μ 0.15, σ 0.015. Small changes to μ and σ move between gliders, blobs, coral and extinction.',
      'Larger than Life': 'Birth and survival intervals as a fraction of the (2R+1)² − 1 neighborhood. The defaults are Bosco\'s rule (R = 5): B 34–45, S 34–58 of 120.',
      Color: 'The trail channel is painted through the palette ramp from the background. Age tint slides long-lived cells back down the ramp so fronts glow and settled regions calm down.',
    },
    closedGroups: ['Larger than Life'],
    palette: true, defaultPalette: 'bioluminescent', paletteLabel: 'Colors (dead → alive)',
    headline: 'steps', headlineLabel: 'steps/frame',

    onParam(state, key) {
      if (key === 'b1' && state.b1 > state.b2) state.b2 = state.b1;
      if (key === 'b2' && state.b2 < state.b1) state.b1 = state.b2;
      if (key === 's1' && state.s1 > state.s2) state.s2 = state.s1;
      if (key === 's2' && state.s2 < state.s1) state.s1 = state.s2;
    },

    surprise(rng) {
      const r = rng();
      const p = {
        grid: 256, aspect: rng.pick(['1:1', '1:1', '4:5']), init: rng.pick(['blobs', 'blobs', 'noise', 'ring', 'symmetric']),
        density: +rng.range(0.25, 0.6).toFixed(2), blobs: rng.int(4, 16), running: true,
        gamma: +rng.range(0.8, 1.2).toFixed(2), contrast: +rng.range(1, 1.4).toFixed(2), high: 1,
        ageAmt: +rng.range(0.2, 0.7).toFixed(2), ageSpan: rng.int(30, 150),
      };
      if (r < 0.6) {
        const [R, T, mu, sigma, rings, w1, w2, w3] = rng.pick(REGIMES);
        Object.assign(p, {
          mode: 'lenia', R, T, rings, w1, w2, w3,
          mu: +(mu + rng.range(-0.01, 0.01)).toFixed(3), sigma: +(sigma * rng.range(0.9, 1.15)).toFixed(4),
          warmup: 60, steps: 2, decay: +rng.range(0.6, 0.94).toFixed(2), pixelate: false,
        });
      } else {
        Object.assign(p, {
          mode: rng.pick(['life', 'highlife', 'daynight', 'ltl', 'seeds']), R: rng.int(4, 7),
          b1: 0.28, b2: +rng.range(0.34, 0.4).toFixed(3), s1: +rng.range(0.25, 0.3).toFixed(3), s2: +rng.range(0.44, 0.52).toFixed(3),
          warmup: rng.int(10, 50), steps: 1, decay: +rng.range(0.6, 0.93).toFixed(2), pixelate: rng() < 0.8,
        });
        if (p.mode === 'seeds') { p.density = 0.1; p.blobs = rng.int(2, 6); p.init = 'blobs'; }
        if (p.mode === 'daynight') p.density = 0.5;
      }
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
      const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
      if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');

      let simPass, renderPass, growthPass, fieldPass, transportPass, splatPass;
      try {
        simPass = new G.Pass(gl, SIM_FS); renderPass = new G.Pass(gl, RENDER_FS);
        growthPass = new G.Pass(gl, GROWTH_FS); fieldPass = new G.Pass(gl, FIELD_FS); transportPass = new G.Pass(gl, TRANSPORT_FS);
        splatPass = new G.Pass(gl, G.GLSL.splatFS);
      }
      catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let pp = null, gw = 0, gh = 0, growthTex = null, fieldTex = null;
      let massNow = 0, massRef = 0, massAt = -1;
      let kernelTex = null, kernel = null, kernelKey = '';
      let ramp = null, rampKey = '';
      let raf = 0, chunkTimer = 0, stepCount = 0, frameNo = 0;

      function ensureGrid(s) {
        const [w, h] = gridSize(s);
        if (pp && gw === w && gh === h) return;
        if (pp) pp.dispose();
        if (growthTex) growthTex.dispose();
        if (fieldTex) fieldTex.dispose();
        try {
          pp = new G.PingPong(gl, w, h, { type: texType, filter: 'nearest', wrap: 'repeat' });
          // Flow Lenia scratch: growth field, then the clipped flow vector carrying its own mass.
          growthTex = new G.Target(gl, w, h, { type: texType, filter: 'nearest', wrap: 'repeat' });
          fieldTex = new G.Target(gl, w, h, { type: texType, filter: 'nearest', wrap: 'repeat' });
        }
        catch (err) {
          if (texType !== 'rgba16f') throw err;
          throw new Error('Float render targets are not available in this browser');
        }
        gw = w; gh = h; massAt = -1;
      }
      function upload(target, f32) {
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        if (texType === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, f32);
        else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.HALF_FLOAT, toHalf(f32));
      }
      function ensureKernel(s) {
        const key = [s.mode, radiusOf(s), isLenia(s) ? [s.rings, s.w1, s.w2, s.w3].join(',') : ''].join('|');
        if (kernelTex && kernelKey === key) return;
        if (kernelTex) kernelTex.dispose();
        kernel = buildKernel(s);
        kernelTex = new G.Target(gl, KW, kernel.rows, { type: 'rgba8', filter: 'nearest', data: kernel.data });
        kernelKey = key;
      }
      function ensureRamp(s) {
        const key = s.bg + '|' + s.palette.join(',');
        if (ramp && rampKey === key) return;
        if (ramp) ramp.dispose();
        ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key;
      }
      function simUniforms(s) {
        const rule = RULES[s.mode] || [0, 0], n = kernel.N;
        return {
          u_kernel: kernelTex, u_res: [gw, gh], u_N: { int: kernel.N }, u_kscale: kernel.kscale,
          u_mode: { int: MODES[s.mode] || 0 }, u_birth: { int: rule[0] }, u_survive: { int: rule[1] },
          u_mu: s.mu, u_sigma: s.sigma, u_dt: 1 / s.T, u_decay: s.decay,
          u_b1: Math.round(s.b1 * n), u_b2: Math.round(s.b2 * n), u_s1: Math.round(s.s1 * n), u_s2: Math.round(s.s2 * n),
        };
      }
      function flowing(s) { return isLenia(s) && s.flow; }
      function step(n) {
        const s = host.getState();
        if (flowing(s)) {
          const gu = {
            u_kernel: kernelTex, u_res: [gw, gh], u_N: { int: kernel.N }, u_kscale: kernel.kscale,
            u_mu: s.mu, u_sigma: s.sigma,
          };
          const fu = { u_res: [gw, gh], u_gain: s.flowGain / s.T, u_alpha: s.flowAlpha, u_drift: s.flowDrift };
          const tu = { u_res: [gw, gh], u_decay: s.decay };
          for (let i = 0; i < n; i++) {
            gu.u_state = pp.read; growthPass.draw(growthTex, gu);
            fu.u_growth = growthTex; fieldPass.draw(fieldTex, fu);
            tu.u_field = fieldTex; tu.u_state = pp.read; transportPass.draw(pp.write, tu);
            pp.swap();
          }
        } else {
          const u = simUniforms(s);
          for (let i = 0; i < n; i++) { u.u_state = pp.read; simPass.draw(pp.write, u); pp.swap(); }
        }
        stepCount += n;
      }
      // Total mass, read back occasionally: the evidence that Flow Lenia conserves it.
      function readMass() {
        if (texType !== 'rgba32f') return null;
        const px = new Float32Array(gw * gh * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pp.read.fbo);
        gl.readPixels(0, 0, gw, gh, gl.RGBA, gl.FLOAT, px);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let sum = 0;
        for (let i = 0; i < px.length; i += 4) sum += px[i];
        return sum;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_state: pp.read, u_ramp: ramp, u_res: [gw, gh],
          u_gamma: s.gamma, u_contrast: s.contrast, u_high: s.high, u_ageAmt: s.ageAmt, u_ageSpan: s.ageSpan, u_pixel: !!s.pixelate,
        });
      }
      function status(extra) {
        const s = host.getState();
        let mass = '';
        if (flowing(s)) {
          if (massAt !== stepCount) {
            const m = readMass();
            if (m != null) { massNow = m; if (!massRef) massRef = m; }
            massAt = stepCount;
          }
          if (massNow) {
            const drift = massRef ? (massNow - massRef) / massRef * 100 : 0;
            mass = '<span>mass <b>' + Math.round(massNow).toLocaleString() + '</b> (' +
              (drift >= 0 ? '+' : '') + drift.toFixed(2) + '%)</span>';
          } else mass = '<span>mass conserved</span>';
        }
        host.setStatus('<span><b>' + MODE_LABEL[s.mode] + (flowing(s) ? ' · flow' : '') + '</b></span><span>grid <b>' + gw + '×' + gh + '</b></span><span>step <b>' + stepCount + '</b></span>' +
          (isLenia(s) ? '<span>R ' + radiusOf(s) + ' μ ' + s.mu.toFixed(3) + ' σ ' + s.sigma.toFixed(4) + '</span>' : '') +
          mass + (extra ? '<span>' + extra + '</span>' : ''));
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        step(host.getState().steps); render();
        if (++frameNo % 6 === 0) status();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        if (host.getState().running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else status(host.getState().running ? '' : 'paused');
      }
      // Run `total` steps in bounded chunks (keeps the UI responsive), painting progress, then hand back to the loop.
      function resetMass() { massRef = 0; massNow = 0; massAt = -1; }
      function burst(total) {
        stop();
        let left = total;
        (function chunk() {
          const n = Math.min(40, left); left -= n;
          step(n); render(); status(left > 0 ? 'running ' + total + ' steps…' : '');
          if (left > 0) chunkTimer = setTimeout(chunk, 0); else startLoop();
        })();
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop();
          const s = host.getState();
          ensureGrid(s); ensureKernel(s);
          upload(pp.read, seedState(s, gw, gh));
          stepCount = 0; resetMass();
          step(Math.round(s.warmup)); render(); status();
          if (host.reducedMotion()) burst(400); else startLoop();
        },
        repaint() { render(); },
        live(key) { if (key === 'running') startLoop(); else if (key === 'flow') resetMass(); },
        resize() { render(); },
        pause() { stop(); },
        resume() { render(); startLoop(); },
        action(key) { if (key === 'reseed') this.regenerate(); else if (key === 'burst') burst(200); },
        disturb(p) {
          if (!pp || !splatPass) return;
          splatPass.draw(pp.write, { u_src: pp.read, u_pos: [p.x, p.yGL], u_add: [1, 0, 0, 1], u_rad: 0.045, u_amt: 1, u_mode: { int: 2 } });
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

