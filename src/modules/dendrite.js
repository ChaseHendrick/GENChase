
/* modules/dendrite.js */
/* Dendritic Growth — Kobayashi's 1993 phase-field model of solidification (WebGL2). */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const DEG = Math.PI / 180;
  const DX = 0.03;          // grid spacing, in the model's own length units (Kobayashi's value)
  const RED = 32;           // side of the reduction target used for the solid-fraction readout

  /* ---------------- shaders ---------------- */
  // One explicit Euler step of the coupled pair. p (phase) in .r, T (temperature) in .g.
  //   tau p_t = div( eps^2 grad p ) + d/dx(eps eps' p_y) - d/dy(eps eps' p_x) + p(1-p)(p - 1/2 + m + noise)
  //   T_t     = lap T + K p_t
  // The gradient flux A = (eps^2 p_x + eps eps' p_y, eps^2 p_y - eps eps' p_x) is evaluated on cell faces
  // (finite volume), so the whole stencil is the 3x3 block: conservative, compact, no odd/even decoupling.
  const SIM_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_state;
  uniform vec2 u_res, u_nOff;
  uniform float u_dt, u_tau, u_eps, u_delta, u_fold, u_theta0;
  uniform float u_alpha, u_gamma, u_Te, u_K, u_noise, u_step, u_shift;
  uniform bool u_wrap;
  ${G.GLSL.hash}
  const float PI = 3.14159265359;

  vec2 F(ivec2 c){
    ivec2 n = ivec2(u_res);
    if (u_wrap) c = (c % n + n) % n; else c = clamp(c, ivec2(0), n - 1);
    return texelFetch(u_state, c, 0).rg;
  }
  // flux through one face, given the phase gradient there
  vec2 flux(vec2 g){
    if (dot(g, g) < 1e-10) return vec2(0.0);
    float a = u_fold * (atan(g.y, g.x) - u_theta0);   // u_theta0 already offset so tips point along theta0
    float e = u_eps * (1.0 + u_delta * cos(a));          // eps(theta)
    float ed = -u_eps * u_fold * u_delta * sin(a);       // d eps / d theta
    return vec2(e * e * g.x + e * ed * g.y, e * e * g.y - e * ed * g.x);
  }
  void main(){
    ivec2 c = ivec2(gl_FragCoord.xy);
    vec2 C = F(c);
    vec2 E = F(c + ivec2(1, 0)), W = F(c - ivec2(1, 0)), N = F(c + ivec2(0, 1)), S = F(c - ivec2(0, 1));
    vec2 NE = F(c + ivec2(1, 1)), NW = F(c + ivec2(-1, 1)), SE = F(c + ivec2(1, -1)), SW = F(c - ivec2(1, 1));
    float q = 1.0 / DX_C, h4 = 0.25 / DX_C;
    // gradients on the four cell faces around this cell
    vec2 gxp = vec2((E.r - C.r) * q, ((N.r + NE.r) - (S.r + SE.r)) * h4);
    vec2 gxm = vec2((C.r - W.r) * q, ((N.r + NW.r) - (S.r + SW.r)) * h4);
    vec2 gyp = vec2(((E.r + NE.r) - (W.r + NW.r)) * h4, (N.r - C.r) * q);
    vec2 gym = vec2(((E.r + SE.r) - (W.r + SW.r)) * h4, (C.r - S.r) * q);
    float div = (flux(gxp).x - flux(gxm).x + flux(gyp).y - flux(gym).y) * q;

    float m = (u_alpha / PI) * atan(u_gamma * (u_Te - C.g));
    float chi = u_noise > 0.0 ? hash21(vec2(c) + u_nOff + vec2(u_step * 0.7213, u_step * 0.3175)) - 0.5 : 0.0;
    float react = C.r * (1.0 - C.r) * (C.r - 0.5 + m + u_noise * chi);
    float pNew = clamp(C.r + (u_dt / u_tau) * (div + react), 0.0, 1.0);

    // 9-point isotropic Laplacian for heat: the square grid must not bias six-fold arms
    float lapT = (4.0 * (N.g + S.g + E.g + W.g) + (NE.g + NW.g + SE.g + SW.g) - 20.0 * C.g) / (6.0 * DX_C * DX_C);
    float TNew = C.g + u_dt * lapT + u_K * (pNew - C.r) + u_shift;
    outColor = vec4(pNew, clamp(TNew, -8.0, 8.0), 0.0, 1.0);
  }`.replace(/DX_C/g, DX.toFixed(6));

  // Paint pass: crystal and/or thermal halo -> tone curve -> palette ramp, plus rim light on the interface.
  const RENDER_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_state;
  uniform vec2 u_res;
  uniform int u_show, u_map;
  uniform float u_halo, u_exposure, u_gamma, u_contrast, u_rim, u_rimAng, u_grain, u_backdrop;
  uniform float u_T0, u_Tspan;
  ${G.GLSL.hash}
  ${G.GLSL.ramp}
  vec2 fetchc(ivec2 c){ return texelFetch(u_state, clamp(c, ivec2(0), ivec2(u_res) - 1), 0).rg; }
  vec2 smp(vec2 uv){
    vec2 p = uv * u_res - 0.5, i = floor(p), f = fract(p);
    ivec2 c = ivec2(i);
    vec2 a = fetchc(c), b = fetchc(c + ivec2(1, 0)), d = fetchc(c + ivec2(0, 1)), e = fetchc(c + ivec2(1, 1));
    return mix(mix(a, b, f.x), mix(d, e, f.x), f.y);
  }
  void main(){
    vec2 px = 1.0 / u_res;
    vec2 s = smp(v_uv);
    float p = clamp(s.r, 0.0, 1.0);
    float heat = clamp((s.g - u_T0) / max(u_Tspan, 1e-3), 0.0, 1.0);
    vec2 g = vec2(smp(v_uv + vec2(px.x, 0.0)).r - smp(v_uv - vec2(px.x, 0.0)).r,
                  smp(v_uv + vec2(0.0, px.y)).r - smp(v_uv - vec2(0.0, px.y)).r) * 0.5;
    float gm = length(g);
    float edge = clamp(gm * 3.5, 0.0, 1.0);

    float halo = pow(heat, 0.6) * u_halo * 0.5;
    float shape = (u_map == 2) ? edge : p;
    float v;
    if (u_show == 0) v = shape;
    else if (u_show == 1) v = heat;
    else v = mix(halo, 1.0, (u_map == 2) ? edge : smoothstep(0.2, 0.8, p));

    v = pow(clamp(v, 0.0, 1.0), u_gamma) * u_exposure;
    v = clamp((v - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    if (u_map == 1) v = 1.0 - v;
    if (u_backdrop > 0.0) {
      float r = length(v_uv - 0.5) * 1.414;
      v = clamp(v + u_backdrop * (1.0 - smoothstep(0.1, 1.0, r)) * (1.0 - p), 0.0, 1.0);
    }
    vec3 col = ramp(v);
    if (u_rim > 0.0 && gm > 1e-6) {
      float sh = dot(g / gm, vec2(cos(u_rimAng), sin(u_rimAng))) * edge;
      col = clamp(col * (1.0 + u_rim * sh) + u_rim * sh * 0.18, 0.0, 1.0);
    }
    if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.731) - 0.5) * u_grain * 0.3, 0.0, 1.0);
    outColor = vec4(col, 1.0);
  }`;

  // Block-average of the phase field into a small rgba8 target, so the solid fraction can be read back as bytes.
  const REDUCE_FS = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;
  uniform sampler2D u_state;
  uniform vec2 u_res, u_block;
  void main(){
    vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
    float s = 0.0;
    for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
      ivec2 c = ivec2(o + vec2(x, y) * u_block * 0.125);
      s += texelFetch(u_state, clamp(c, ivec2(0), ivec2(u_res) - 1), 0).r;
    }
    outColor = vec4(s / 64.0);
  }`;

  /* ---------------- seeding ---------------- */
  // Initial field: liquid at T = Te - undercooling, solid nuclei (p = 1) with a one-cell soft edge.
  function seedField(s, n) {
    const rng = U.makeRng(s.seed + '/dendrite');
    const T0 = s.Te - s.undercooling;
    const data = new Float32Array(n * n * 4);
    for (let i = 0, j = 0; i < n * n; i++, j += 4) { data[j + 1] = T0; data[j + 3] = 1; }
    const disk = (cx, cy, r) => {
      const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(n - 1, Math.ceil(cx + r + 1));
      const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(n - 1, Math.ceil(cy + r + 1));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        const v = U.clamp(r - d + 0.5, 0, 1), k = (y * n + x) * 4;
        if (v > data[k]) data[k] = v;
      }
    };
    if (s.seeding === 'scatter') {
      const count = Math.round(s.nuclei);
      for (let i = 0; i < count; i++) disk(rng.range(0.1, 0.9) * n, rng.range(0.1, 0.9) * n, s.radius * rng.range(0.7, 1.3));
    } else if (s.seeding === 'line') {
      const th = Math.max(2, s.radius);
      for (let x = 0; x < n; x++) {
        const top = th + (rng() < 0.5 ? 0 : 1);
        for (let y = 0; y < top; y++) data[(y * n + x) * 4] = 1;
      }
    } else {
      disk(n / 2, n / 2, s.radius);
    }
    return data;
  }

  // float32 -> float16 bits, for the rgba16f fallback upload
  function toHalf(f32) {
    const out = new Uint16Array(f32.length), fb = new Float32Array(1), ib = new Int32Array(fb.buffer);
    for (let i = 0; i < f32.length; i++) {
      fb[0] = f32[i];
      const x = ib[0], sign = (x >> 16) & 0x8000, exp = ((x >> 23) & 0xff) - 112;
      out[i] = exp <= 0 ? sign : exp >= 31 ? sign | 0x7c00 : sign | (exp << 10) | ((x >> 13) & 0x3ff);
    }
    return out;
  }

  // explicit-Euler stability ceiling: heat diffusion (9-point) and phase diffusion eps^2/tau (5-point)
  function dtLimit(s) { return Math.min(0.375 * DX * DX, 0.25 * DX * DX * s.tau / (s.eps * s.eps)); }

  const fmt2 = v => v.toFixed(2), fmt3 = v => v.toFixed(3), fmt1 = v => v.toFixed(1);
  const fmtExp = v => v.toExponential(1), fmtDeg = v => v + '°';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const SHOW = { phase: 0, temp: 1, both: 2 }, MAP = { bright: 0, dark: 1, edge: 2 };

  Studio.register({
    id: 'dendrite', name: 'Dendritic Growth', order: 65,
    subtitle: 'phase-field solidification: snowflakes and metal dendrites · 1993',
    equation: 'τ p_t = ∇·(ε(θ)²∇p) + ∂x(ε ε′ p_y) − ∂y(ε ε′ p_x) + p(1−p)(p − ½ + m);   T_t = ∇²T + K p_t',
    credit: "Ryo Kobayashi, 'Modeling and numerical simulations of dendritic crystal growth', Physica D 63 (1993) 410–423.",
    blurb: 'A phase field p slides from 0 (liquid) to 1 (solid) across a thin interface, driven by how far the local temperature sits below freezing. Freezing releases latent heat, which diffuses away and warms the liquid just ahead of the interface — so a bump that runs into cold liquid grows faster and a hollow stalls. That instability alone gives shapeless blobs; the surface energy ε is made to depend on the angle θ of the interface normal, ε = ε̄(1 + δ·cos(j(θ − θ₀))), and the crystal picks out j preferred directions. Six of them and you get a snowflake, four and you get the dendrite of a cast metal grain — the same equations, one number apart.',

    schema: [
      { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: 'geom', options: [[256, '256'], [384, '384'], [512, '512'], [768, '768'], [1024, '1024']] },
      { group: 'Grid', key: 'boundary', label: 'Boundary', type: 'seg', kind: 'geom', options: [['wrap', 'Periodic'], ['insulate', 'Insulating']] },
      RANGE('Grid', 'dt', 'Time step', 'live', 0.00002, 0.0003, 0.00001, fmtExp, { hint: 'Explicit Euler: past about dx²τ/4ε², or dx²·0.375 for the heat field, the integration goes unstable and the whole field blows up into a checkerboard within a few hundred steps. The status line warns as soon as dt is over that limit.' }),

      { group: 'Seed', key: 'seeding', label: 'Seeding', type: 'seg', kind: 'geom', options: [['center', 'Center'], ['scatter', 'Scatter'], ['line', 'Line']] },
      RANGE('Seed', 'nuclei', 'Nuclei', 'geom', 1, 40, 1, String, { dimUnless: s => s.seeding === 'scatter' }),
      RANGE('Seed', 'radius', 'Nucleus radius', 'geom', 2, 14, 0.5, fmt1),
      RANGE('Seed', 'undercooling', 'Undercooling', 'live', 0.2, 1.8, 0.01, fmt2),

      RANGE('Crystal', 'delta', 'Anisotropy δ', 'live', 0, 0.09, 0.002, fmt3),
      { group: 'Crystal', key: 'fold', label: 'Symmetry j', type: 'seg', kind: 'live', options: [[3, '3'], [4, '4'], [5, '5'], [6, '6'], [8, '8'], [12, '12']] },
      RANGE('Crystal', 'theta0', 'Orientation θ₀', 'live', 0, 359, 1, fmtDeg, { dimUnless: s => s.delta > 0 }),
      RANGE('Crystal', 'eps', 'Interface width ε̄', 'live', 0.005, 0.03, 0.001, fmt3),
      RANGE('Crystal', 'tau', 'Relaxation τ', 'live', 0.0001, 0.001, 0.00005, fmtExp),
      RANGE('Crystal', 'noise', 'Interface noise', 'live', 0, 0.3, 0.005, fmt3),

      RANGE('Heat', 'alpha', 'Driving force α', 'live', 0.3, 1.2, 0.01, fmt2),
      RANGE('Heat', 'sharpness', 'Sharpness γ', 'live', 1, 40, 0.5, fmt1),
      RANGE('Heat', 'Te', 'Equilibrium T', 'live', 0.5, 1.5, 0.01, fmt2),
      RANGE('Heat', 'K', 'Latent heat K', 'live', 0.5, 3, 0.05, fmt2),

      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: 'live' },
      { group: 'Simulation', key: 'autoStop', label: 'Stop when grown', type: 'toggle', kind: 'live' },
      RANGE('Simulation', 'steps', 'Steps per frame', 'live', 1, 200, 1, String),
      { group: 'Simulation', key: 'burst', label: 'Run 2000 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },

      { group: 'Color', key: 'show', label: 'Show', type: 'seg', kind: 'paint', options: [['phase', 'Crystal'], ['temp', 'Heat'], ['both', 'Both']] },
      { group: 'Color', key: 'map', label: 'Ramp', type: 'seg', kind: 'paint', options: [['bright', 'Solid light'], ['dark', 'Solid dark'], ['edge', 'Interface']] },
      RANGE('Color', 'halo', 'Thermal halo', 'paint', 0, 1, 0.01, fmt2, { dimUnless: s => s.show === 'both' }),
      RANGE('Color', 'exposure', 'Exposure', 'paint', 0.3, 2.5, 0.01, fmt2),
      RANGE('Color', 'gamma', 'Gamma', 'paint', 0.3, 3, 0.01, fmt2),
      RANGE('Color', 'contrast', 'Contrast', 'paint', 0.5, 3, 0.01, fmt2),
      RANGE('Color', 'backdrop', 'Backdrop', 'paint', 0, 0.5, 0.01, fmt2),

      RANGE('Lighting', 'rim', 'Rim light', 'paint', 0, 1, 0.01, fmt2),
      RANGE('Lighting', 'rimAngle', 'Light angle', 'paint', 0, 359, 1, fmtDeg, { dimUnless: s => s.rim > 0 }),
      RANGE('Lighting', 'grain', 'Grain', 'paint', 0, 0.3, 0.01, fmt2),
    ],
    defaults: {
      grid: 384, boundary: 'wrap', dt: 0.0002,
      seeding: 'center', nuclei: 12, radius: 5, undercooling: 1,
      delta: 0.025, fold: 6, theta0: 90, eps: 0.01, tau: 0.0003, noise: 0.08,
      alpha: 0.9, sharpness: 10, Te: 1, K: 1.6,
      running: true, autoStop: true, steps: 60,
      show: 'both', map: 'bright', halo: 0.55, exposure: 1, gamma: 1, contrast: 1.1, backdrop: 0.06,
      rim: 0.35, rimAngle: 300, grain: 0.05,
    },
    presets: {
      snowflake: { label: 'Snowflake', p: { fold: 6, delta: 0.025, theta0: 90, undercooling: 1.1, alpha: 0.9, sharpness: 10, K: 1.6, eps: 0.01, tau: 0.0003, noise: 0.08, seeding: 'center', radius: 5, boundary: 'wrap', show: 'both', map: 'bright', halo: 0.55, exposure: 1, gamma: 1, contrast: 1.1, backdrop: 0.06, rim: 0.35, rimAngle: 300, grain: 0.05 }, palette: Studio.PALETTES.glacier },
      frost: { label: 'Frost', p: { fold: 6, delta: 0.022, theta0: 15, undercooling: 1, alpha: 0.9, sharpness: 10, K: 1.8, eps: 0.01, tau: 0.0003, noise: 0.1, seeding: 'scatter', nuclei: 12, radius: 3, boundary: 'wrap', show: 'both', map: 'bright', halo: 0.4, exposure: 1, gamma: 1, contrast: 1.15, backdrop: 0, rim: 0.3, rimAngle: 300, grain: 0.06 }, palette: Studio.PALETTES.xray },
      metal: { label: 'Metal dendrite', p: { fold: 4, delta: 0.045, theta0: 0, undercooling: 0.95, alpha: 0.9, sharpness: 10, K: 2.1, eps: 0.011, tau: 0.0003, noise: 0.12, seeding: 'center', radius: 5, boundary: 'wrap', show: 'both', map: 'bright', halo: 0.35, exposure: 1, gamma: 1, contrast: 1.2, backdrop: 0.05, rim: 0.5, rimAngle: 300, grain: 0.07 }, palette: Studio.PALETTES.ember },
      seaweed: { label: 'Seaweed', p: { fold: 6, delta: 0.005, theta0: 0, undercooling: 1, alpha: 0.95, sharpness: 12, K: 2.2, eps: 0.01, tau: 0.0003, noise: 0.14, seeding: 'center', radius: 4, boundary: 'wrap', show: 'both', map: 'bright', halo: 0.5, exposure: 1, gamma: 1, contrast: 1.1, backdrop: 0.05, rim: 0.25, rimAngle: 300, grain: 0.05 }, palette: Studio.PALETTES.bioluminescent },
      twelve: { label: 'Twelve-fold', p: { fold: 12, delta: 0.007, theta0: 0, undercooling: 1.1, alpha: 0.9, sharpness: 10, K: 1.6, eps: 0.01, tau: 0.0003, noise: 0.05, seeding: 'center', radius: 5, boundary: 'wrap', show: 'both', map: 'bright', halo: 0.45, exposure: 1, gamma: 1, contrast: 1.1, backdrop: 0.08, rim: 0.3, rimAngle: 300, grain: 0.05 }, palette: Studio.PALETTES.nightshade },
      halo: { label: 'Thermal halo', p: { fold: 6, delta: 0.025, theta0: 90, undercooling: 1, alpha: 0.9, sharpness: 10, K: 2, eps: 0.01, tau: 0.0003, noise: 0.08, seeding: 'center', radius: 5, boundary: 'wrap', show: 'both', map: 'bright', halo: 1, exposure: 1.15, gamma: 0.85, contrast: 1, backdrop: 0, rim: 0.2, rimAngle: 300, grain: 0.04 }, palette: Studio.PALETTES.thermal },
      slow: { label: 'Slow growth', p: { fold: 6, delta: 0.02, theta0: 90, undercooling: 0.6, alpha: 0.9, sharpness: 12, K: 0.9, eps: 0.011, tau: 0.0003, noise: 0.02, seeding: 'center', radius: 6, boundary: 'wrap', show: 'both', map: 'bright', halo: 0.35, exposure: 1, gamma: 1, contrast: 1.25, backdrop: 0, rim: 0.3, rimAngle: 300, grain: 0.05 }, palette: Studio.PALETTES.petri },
      forest: { label: 'Frozen forest', p: { fold: 6, delta: 0.03, theta0: 90, undercooling: 1.05, alpha: 0.9, sharpness: 10, K: 1.7, eps: 0.01, tau: 0.0003, noise: 0.12, seeding: 'line', radius: 3, boundary: 'insulate', show: 'both', map: 'bright', halo: 0.5, exposure: 1, gamma: 1, contrast: 1.1, backdrop: 0, rim: 0.3, rimAngle: 300, grain: 0.05 }, palette: Studio.PALETTES.harbor },
    },
    hints: {
      Grid: 'Cell size is fixed, so a bigger grid is a bigger dish rather than a magnified one: more room for side branches and finer tips, but more steps to fill it — and a large print wants a large grid, since crystal detail can never be finer than one cell.',
      Seed: 'Undercooling is how far the liquid starts below the equilibrium temperature. Deeper means a faster, thinner, more branched crystal. Moving it while the crystal grows quenches the whole dish by that much, which visibly speeds growth up.',
      Crystal: 'δ is how much the surface energy prefers the j chosen directions: 0 gives a round blob, and past δ ≈ 1/(j²−1) the model is ill-posed and the arms go faceted and noisy. θ₀ points the tips; changing it or j mid-growth grafts a new symmetry onto the existing crystal — compound crystals. Interface noise is Kobayashi’s fluctuation term; without it arms grow smooth and never sprout side branches.',
      Heat: 'Freezing dumps latent heat K into the liquid. Large K warms the crystal’s surroundings enough to starve its own branches, so arms stay thin and hungry and the dish never fully freezes; as K approaches the undercooling the front stops being heat-starved and grows as a fat, almost round plate.',
      Simulation: 'Growth stops on its own once the crystal has reached the edge of the dish or frozen most of it — that is the finished piece. Press Run 2000 steps, touch any physics control, or switch the stop off to carry on past it: the crystal keeps going until the liquid has warmed to the equilibrium temperature and there is no undercooling left to drive it.',
    },
    closedGroups: ['Lighting'],
    palette: true, defaultPalette: 'glacier', paletteLabel: 'Colors (liquid → solid)',
    headline: 'steps', headlineLabel: 'steps/frame',

    surprise(rng) {
      const fold = rng.pick([4, 4, 6, 6, 6, 6, 8, 5, 3, 12]);
      const cap = 1 / (fold * fold - 1);
      const seeding = rng() < 0.22 ? (rng() < 0.5 ? 'scatter' : 'line') : 'center';
      // keep the latent heat well above the undercooling: a heat-starved front is what branches
      const under = +rng.range(0.8, 1.2).toFixed(2);
      return {
        grid: rng.pick([384, 384, 512]), boundary: seeding === 'line' ? 'insulate' : 'wrap', dt: 0.0002,
        seeding, nuclei: rng.int(6, 22), radius: seeding === 'scatter' ? 3 : +rng.range(4, 7).toFixed(1),
        undercooling: under,
        delta: +(cap * rng.range(0.4, 1.05)).toFixed(3), fold, theta0: rng.int(0, 359),
        eps: +rng.range(0.009, 0.013).toFixed(3), tau: 0.0003, noise: +rng.range(0.04, 0.18).toFixed(3),
        alpha: +rng.range(0.8, 1).toFixed(2), sharpness: +rng.range(7, 16).toFixed(1), Te: 1,
        K: +(under * rng.range(1.5, 2.3)).toFixed(2),
        steps: 60,
        show: rng() < 0.75 ? 'both' : rng.pick(['phase', 'temp']),
        map: rng() < 0.8 ? 'bright' : rng.pick(['dark', 'edge']),
        halo: +rng.range(0.3, 0.8).toFixed(2),
        exposure: +rng.range(0.9, 1.2).toFixed(2), gamma: +rng.range(0.85, 1.2).toFixed(2),
        contrast: +rng.range(1, 1.3).toFixed(2), backdrop: +rng.range(0, 0.1).toFixed(2),
        rim: +rng.range(0.15, 0.6).toFixed(2), rimAngle: rng.int(0, 359), grain: +rng.range(0, 0.1).toFixed(2),
      };
    },

    create(host) {
      const gl = G.createGL(host.canvas);
      const noop = () => {};
      const dead = msg => {
        host.setStatus(msg);
        host.fault(msg);
        return { aspect: () => 1, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
      };
      if (!gl) return dead('WebGL2 is not available in this browser');
      const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
      if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');

      let simPass, renderPass, reducePass, splatPass;
      try { simPass = new G.Pass(gl, SIM_FS); renderPass = new G.Pass(gl, RENDER_FS); reducePass = new G.Pass(gl, REDUCE_FS); splatPass = new G.Pass(gl, G.GLSL.splatFS); }
      catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let pp = null, gw = 0, reduceT = null;
      const redBuf = new Uint8Array(RED * RED * 4);
      let ramp = null, rampKey = '';
      let raf = 0, chunkTimer = 0, stepCount = 0, frameNo = 0;
      let nOff = [0, 0], ambient = 0, lastUnder = 1, shift = 0, solid = 0, grown = false, halted = false;

      function ensureGrid(s) {
        const n = Number(s.grid);
        if (pp && gw === n) return;
        if (pp) pp.dispose();
        try { pp = new G.PingPong(gl, n, n, { type: texType, filter: 'nearest', wrap: 'clamp' }); }
        catch (err) {
          if (texType === 'rgba32f') throw err;
          throw new Error('Float render targets are not available in this browser');
        }
        gw = n;
        if (!reduceT) reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
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
      function step(n) {
        const s = host.getState();
        const u = {
          u_res: [gw, gw], u_nOff: nOff, u_dt: s.dt, u_tau: s.tau, u_eps: s.eps, u_delta: s.delta,
          u_fold: Number(s.fold), u_theta0: (s.theta0 + 180 / Number(s.fold)) * DEG, u_alpha: s.alpha, u_gamma: s.sharpness,
          u_Te: s.Te, u_K: s.K, u_noise: s.noise, u_wrap: s.boundary === 'wrap', u_step: 0, u_shift: 0,
        };
        for (let i = 0; i < n; i++) {
          u.u_state = pp.read;
          u.u_step = (stepCount + i) % 4096;
          u.u_shift = shift; shift = 0;               // a live quench is applied once, on the next step
          simPass.draw(pp.write, u);
          pp.swap();
        }
        stepCount += n;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_state: pp.read, u_ramp: ramp, u_res: [gw, gw],
          u_show: { int: SHOW[s.show] || 0 }, u_map: { int: MAP[s.map] || 0 },
          u_halo: s.halo, u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast,
          u_rim: s.rim, u_rimAng: s.rimAngle * DEG, u_grain: s.grain, u_backdrop: s.backdrop,
          u_T0: ambient, u_Tspan: Math.max(0.2, s.Te - ambient),
        });
      }
      // Block-average the phase field: solid fraction, and whether the crystal has touched the dish wall.
      // Row 0 of the readback is the bottom of the grid, where the 'line' seeding starts, so that edge is exempt.
      function measure() {
        reducePass.draw(reduceT, { u_state: pp.read, u_res: [gw, gw], u_block: [gw / RED, gw / RED] });
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const seeding = host.getState().seeding;
        let sum = 0, rim = 0;
        for (let y = 0; y < RED; y++) for (let x = 0; x < RED; x++) {
          const v = redBuf[(y * RED + x) * 4];
          sum += v;
          const onWall = seeding === 'line' ? y >= RED - 2 : (x < 2 || y < 2 || x >= RED - 2 || y >= RED - 2);
          if (onWall && v > rim) rim = v;
        }
        solid = sum / (RED * RED * 255);
        // grown = the crystal has reached the edge of the dish, or the dish has largely frozen over.
        // Scattered nuclei start all over the dish, so for those only the second test means anything.
        if (solid > 0.4 || (seeding !== 'scatter' && rim / 255 > 0.02)) grown = true;
      }
      function status(extra) {
        const s = host.getState();
        const warn = s.dt > dtLimit(s) ? '<span>dt above stability limit</span>' : '';
        host.setStatus('<span>grid <b>' + gw + '×' + gw + '</b></span><span>step <b>' + stepCount + '</b></span>' +
          '<span>solid <b>' + (solid * 100).toFixed(1) + '%</b></span>' + warn + (extra ? '<span>' + extra + '</span>' : ''));
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps);
        render();
        if (++frameNo % 4 === 0) {
          measure(); status();
          if (grown && s.autoStop && !halted) { halted = true; status('grown'); return; }
        }
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion() && !(grown && s.autoStop && !halted)) raf = requestAnimationFrame(frame);
        else { measure(); status(!s.running ? 'paused' : grown ? 'grown' : ''); }
      }
      // Run `total` steps in bounded chunks so the UI stays responsive, then hand back to the loop.
      function burst(total) {
        stop();
        let left = total;
        (function chunk() {
          const n = Math.min(60, left); left -= n;
          step(n); render(); measure();
          if (grown && host.getState().autoStop && !halted) { halted = true; left = 0; }
          status(left > 0 ? 'growing…' : '');
          if (left > 0) chunkTimer = setTimeout(chunk, 0); else startLoop();
        })();
      }

      return {
        aspect() { return 1; },
        regenerate() {
          stop();
          const s = host.getState();
          ensureGrid(s);
          const nr = U.makeRng(s.seed + '/noise');
          nOff = [nr.range(0, 400), nr.range(0, 400)];
          ambient = s.Te - s.undercooling;
          lastUnder = s.undercooling;
          shift = 0; stepCount = 0; frameNo = 0; grown = false; halted = false;
          upload(pp.read, seedField(s, gw));
          step(200); render(); measure(); status();
          if (host.reducedMotion()) burst(Math.round(gw * 14)); else startLoop();
        },
        repaint() { render(); },
        live(key, value) {
          if (key === 'undercooling') { shift += lastUnder - value; ambient = host.getState().Te - value; lastUnder = value; }
          // touching the physics after the piece has settled means the viewer wants to see it grow on
          if (key === 'running' || !raf) startLoop(); else if (key === 'dt') status();
        },
        resize() { render(); },
        pause() { stop(); },
        resume() { render(); startLoop(); },
        action(key) { if (key === 'reseed') this.regenerate(); else if (key === 'burst') { halted = true; burst(2000); } },
        disturb(p) {
          if (!pp || !splatPass) return;
          halted = false; grown = false;
          splatPass.draw(pp.write, { u_src: pp.read, u_pos: [p.x, p.yGL], u_add: [1, 0, 0, 1], u_rad: 0.03, u_amt: 1, u_mode: { int: 2 } });
          pp.swap(); render(); startLoop();
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

