
/* modules/fluid.js */
/* Fluid — Navier-Stokes dye advected by a Jos Stam "stable fluids" solver on the GPU (WebGL2). */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, TAU = U.TAU;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const MAXE = 12;               // emitter slots (uniform array size)
  const REF_RES = 192;           // forces are scaled by simRes / REF_RES so speed in domain units is resolution independent
  const FORCE_K = 0.9, SWIRL_K = 0.05, NOISE_K = 0.05, CURL_K = 0.45, STIR_K = 1.2;

  /* ---------------- shaders ---------------- */
  const HEAD = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 outColor;`;
  // true for the one-texel border (pixel centers sit at 0.5, 1.5, ...)
  const EDGE = `bool edge(vec2 uv, vec2 res){ vec2 ip = uv * res; return ip.x < 1.0 || ip.y < 1.0 || ip.x > res.x - 1.0 || ip.y > res.y - 1.0; }`;

  // Semi-Lagrangian advection (RK2 midpoint back-trace). Velocity is stored in texels-per-step of the sim grid,
  // so the back-trace in uv space is v / simRes. Used for both velocity (src = vel) and dye (src at dye res).
  const ADVECT_FS = `${HEAD}
  uniform sampler2D u_vel, u_src;
  uniform vec2 u_simRes, u_res;
  uniform float u_diss;
  uniform bool u_zeroEdge;
  ${EDGE}
  void main(){
    vec2 v = texture(u_vel, v_uv).xy;
    v = texture(u_vel, v_uv - 0.5 * v / u_simRes).xy;
    vec4 s = texture(u_src, v_uv - v / u_simRes) * u_diss;
    if (u_zeroEdge && edge(v_uv, u_res)) s = vec4(0.0);
    outColor = s;
  }`;

  const CURL_FS = `${HEAD}
  uniform sampler2D u_vel; uniform vec2 u_res;
  void main(){
    vec2 px = 1.0 / u_res;
    float L = texture(u_vel, v_uv - vec2(px.x, 0.0)).y, R = texture(u_vel, v_uv + vec2(px.x, 0.0)).y;
    float B = texture(u_vel, v_uv - vec2(0.0, px.y)).x, T = texture(u_vel, v_uv + vec2(0.0, px.y)).x;
    outColor = vec4(0.5 * ((R - L) - (T - B)), 0.0, 0.0, 1.0);
  }`;

  // Vorticity confinement + emitter forces + body force (curl noise or swirl vortices), all in one velocity pass.
  // u_em[i*4..] = x, y, fx, fy (for swirl fx is the signed vortex strength).
  const FORCE_FS = `${HEAD}
  uniform sampler2D u_vel, u_curl;
  uniform vec2 u_res, u_aspect, u_noff;
  uniform float u_curlAmt, u_rad, u_noiseScale, u_bodyAmt;
  uniform int u_body, u_n;
  uniform float u_em[${MAXE * 4}];
  uniform bool u_closed;
  ${EDGE}
  ${G.GLSL.hash}
  ${G.GLSL.noise}
  float psi(vec2 p){ return fbm(p * u_noiseScale + u_noff, 4); }
  void main(){
    vec2 px = 1.0 / u_res;
    vec2 v = texture(u_vel, v_uv).xy;
    if (u_curlAmt > 0.0) {
      float L = texture(u_curl, v_uv - vec2(px.x, 0.0)).x, R = texture(u_curl, v_uv + vec2(px.x, 0.0)).x;
      float B = texture(u_curl, v_uv - vec2(0.0, px.y)).x, T = texture(u_curl, v_uv + vec2(0.0, px.y)).x;
      float C = texture(u_curl, v_uv).x;
      vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      f = f / (length(f) + 1e-5) * C * u_curlAmt;
      v += vec2(f.x, -f.y);
    }
    vec2 p = v_uv * u_aspect;
    for (int i = 0; i < ${MAXE}; i++) {
      if (i >= u_n) break;
      vec2 d = p - vec2(u_em[i * 4], u_em[i * 4 + 1]) * u_aspect;
      vec2 f = vec2(u_em[i * 4 + 2], u_em[i * 4 + 3]);
      if (u_body == 2) {
        float r = length(d) + 1e-4, R = u_rad * 4.0;
        float prof = r < R ? r / R : R / r;             // Rankine vortex profile
        v += f.x * prof * vec2(-d.y, d.x) / r;
      } else {
        v += f * exp(-dot(d, d) / (u_rad * u_rad));
      }
    }
    if (u_body == 1) {
      float e = 0.004;
      float dx = psi(p + vec2(e, 0.0)) - psi(p - vec2(e, 0.0));
      float dy = psi(p + vec2(0.0, e)) - psi(p - vec2(0.0, e));
      v += u_bodyAmt * vec2(dy, -dx) / (2.0 * e);
    }
    if (u_closed && edge(v_uv, u_res)) v = vec2(0.0);
    outColor = vec4(v, 0.0, 1.0);
  }`;

  const DIV_FS = `${HEAD}
  uniform sampler2D u_vel; uniform vec2 u_res;
  void main(){
    vec2 px = 1.0 / u_res;
    float L = texture(u_vel, v_uv - vec2(px.x, 0.0)).x, R = texture(u_vel, v_uv + vec2(px.x, 0.0)).x;
    float B = texture(u_vel, v_uv - vec2(0.0, px.y)).y, T = texture(u_vel, v_uv + vec2(0.0, px.y)).y;
    outColor = vec4(0.5 * ((R - L) + (T - B)), 0.0, 0.0, 1.0);
  }`;

  const PRESSURE_FS = `${HEAD}
  uniform sampler2D u_prs, u_div; uniform vec2 u_res;
  void main(){
    vec2 px = 1.0 / u_res;
    float L = texture(u_prs, v_uv - vec2(px.x, 0.0)).x, R = texture(u_prs, v_uv + vec2(px.x, 0.0)).x;
    float B = texture(u_prs, v_uv - vec2(0.0, px.y)).x, T = texture(u_prs, v_uv + vec2(0.0, px.y)).x;
    outColor = vec4(0.25 * (L + R + B + T - texture(u_div, v_uv).x), 0.0, 0.0, 1.0);
  }`;

  const GRAD_FS = `${HEAD}
  uniform sampler2D u_vel, u_prs; uniform vec2 u_res; uniform bool u_closed;
  ${EDGE}
  void main(){
    vec2 px = 1.0 / u_res;
    float L = texture(u_prs, v_uv - vec2(px.x, 0.0)).x, R = texture(u_prs, v_uv + vec2(px.x, 0.0)).x;
    float B = texture(u_prs, v_uv - vec2(0.0, px.y)).x, T = texture(u_prs, v_uv + vec2(0.0, px.y)).x;
    vec2 v = texture(u_vel, v_uv).xy - 0.5 * vec2(R - L, T - B);
    if (u_closed && edge(v_uv, u_res)) v = vec2(0.0);
    outColor = vec4(v, 0.0, 1.0);
  }`;

  // Dye is rgba: rgb = coverage-weighted color, a = coverage (so black ink and color mixing both work).
  // u_col[i*4..] = r, g, b, amount.
  const SPLAT_FS = `${HEAD}
  uniform sampler2D u_dye;
  uniform vec2 u_aspect;
  uniform float u_rad;
  uniform int u_n;
  uniform float u_em[${MAXE * 4}], u_col[${MAXE * 4}];
  void main(){
    vec4 d = texture(u_dye, v_uv);
    vec2 p = v_uv * u_aspect;
    for (int i = 0; i < ${MAXE}; i++) {
      if (i >= u_n) break;
      vec2 q = p - vec2(u_em[i * 4], u_em[i * 4 + 1]) * u_aspect;
      float g = u_col[i * 4 + 3] * exp(-dot(q, q) / (u_rad * u_rad)) * (1.0 - d.a);
      d += g * vec4(u_col[i * 4], u_col[i * 4 + 1], u_col[i * 4 + 2], 1.0);
    }
    outColor = d;
  }`;

  // Initial dye field: 0 none, 1 blobs (fbm), 2 bands, 3 rings. Colors come from the palette-only ramp.
  const INIT_DYE_FS = `${HEAD}
  uniform int u_mode;
  uniform vec2 u_aspect, u_off;
  uniform float u_ang, u_scale, u_k;
  ${G.GLSL.ramp}
  ${G.GLSL.hash}
  ${G.GLSL.noise}
  vec3 pick(float idx){ return ramp(mod(idx, u_k) / max(u_k - 1.0, 1.0)); }
  void main(){
    vec2 p = (v_uv - 0.5) * u_aspect;
    vec3 C = vec3(0.0); float a = 0.0;
    if (u_mode == 1) {
      float f = fbm(p * u_scale + u_off, 4);
      a = smoothstep(0.0, 0.3, f);
      C = ramp(0.5 + 0.5 * fbm(p * u_scale * 0.7 + u_off.yx + 13.1, 3));
    } else if (u_mode == 2) {
      float t = dot(p, vec2(cos(u_ang), sin(u_ang))) * u_scale + 0.5;
      float f = fract(t);
      a = smoothstep(0.0, 0.06, f) * smoothstep(1.0, 0.94, f);
      C = pick(floor(t) + 100.0);
    } else if (u_mode == 3) {
      float t = length(p) * u_scale;
      float f = fract(t);
      a = smoothstep(0.0, 0.06, f) * smoothstep(1.0, 0.94, f);
      C = pick(floor(t));
    }
    outColor = vec4(C * a, a);
  }`;

  // Initial velocity: curl of a noise potential (a single seeded stir).
  const INIT_VEL_FS = `${HEAD}
  uniform vec2 u_aspect, u_off, u_res;
  uniform float u_amt;
  uniform bool u_closed;
  ${EDGE}
  ${G.GLSL.hash}
  ${G.GLSL.noise}
  float psi(vec2 p){ return fbm(p * 2.5 + u_off, 4); }
  void main(){
    vec2 p = v_uv * u_aspect; float e = 0.004;
    float dx = psi(p + vec2(e, 0.0)) - psi(p - vec2(e, 0.0));
    float dy = psi(p + vec2(0.0, e)) - psi(p - vec2(0.0, e));
    vec2 v = u_amt * vec2(dy, -dx) / (2.0 * e);
    if (u_closed && edge(v_uv, u_res)) v = vec2(0.0);
    outColor = vec4(v, 0.0, 1.0);
  }`;

  // Paint pass: dye -> tone -> either palette ramp (by coverage) or direct color, composed as ink on paper
  // (multiply) or light on dark (screen), with shading from |curl| or |velocity| and a vignette.
  /* ---------------- Lagrangian coherent structures ----------------
     Dye shows where the fluid has been; the FTLE field shows the skeleton organising where it can go.
     A tracer starts in every cell and is carried by the flow; after t steps the Jacobian of that flow
     map says how fast neighboring tracers separated. Ridges of the finite-time Lyapunov exponent are
     the transport barriers that dye can never cross (Haller; Shadden, Lekien and Marsden, 2005).
     Integrating the present velocity field treats it as frozen over the window, which is the usual
     visualisation shortcut: honest for slow fields, approximate for fast ones. */
  const MAP_INIT_FS = `${HEAD}
  void main(){ outColor = vec4(v_uv, 0.0, 1.0); }`;

  const MAP_FS = `${HEAD}
  uniform sampler2D u_map, u_vel;
  uniform vec2 u_simRes;
  uniform float u_dir;
  void main(){
    vec2 p = texture(u_map, v_uv).xy;
    vec2 v1 = texture(u_vel, p).xy / u_simRes;
    vec2 v2 = texture(u_vel, p + 0.5 * u_dir * v1).xy / u_simRes;   // RK2 midpoint
    outColor = vec4(p + u_dir * v2, 0.0, 1.0);
  }`;

  const FTLE_FS = `${HEAD}
  uniform sampler2D u_map, u_scene;
  uniform vec2 u_res;
  uniform float u_t, u_gain, u_mix;
  ${G.GLSL.ramp}
  void main(){
    vec2 px = 1.0 / u_res;
    // Jacobian of the flow map, in cells per cell
    vec2 dx = (texture(u_map, v_uv + vec2(px.x, 0.0)).xy - texture(u_map, v_uv - vec2(px.x, 0.0)).xy) * u_res.x * 0.5;
    vec2 dy = (texture(u_map, v_uv + vec2(0.0, px.y)).xy - texture(u_map, v_uv - vec2(0.0, px.y)).xy) * u_res.y * 0.5;
    // C = J^T J, largest eigenvalue in closed form
    float a = dx.x * dx.x + dx.y * dx.y;
    float b = dx.x * dy.x + dx.y * dy.y;
    float d = dy.x * dy.x + dy.y * dy.y;
    float tr = a + d, det = a * d - b * b;
    float disc = max(tr * tr - 4.0 * det, 0.0);
    float lmax = max(0.5 * (tr + sqrt(disc)), 1.0);
    float sigma = log(sqrt(lmax)) / max(u_t, 1.0);
    float v = clamp(sigma * u_gain * 40.0, 0.0, 1.0);
    vec3 ridge = ramp(v);
    vec3 scene = texture(u_scene, v_uv).rgb;
    outColor = vec4(mix(ridge, scene, u_mix * (1.0 - v * 0.55)), 1.0);
  }`;

  const RENDER_FS = `${HEAD}
  uniform sampler2D u_dye, u_vel, u_curl;
  uniform vec3 u_bg;
  uniform vec2 u_aspect;
  uniform bool u_useRamp, u_ink;
  uniform int u_shade;
  uniform float u_shadeAmt, u_gamma, u_contrast, u_sat, u_vig;
  ${G.GLSL.ramp}
  void main(){
    vec4 d = texture(u_dye, v_uv);
    float a = clamp(d.a, 0.0, 1.0);
    vec3 C = clamp(d.rgb / max(d.a, 1e-4), 0.0, 1.0);
    a = pow(a, u_gamma);
    a = clamp((a - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    float lum = dot(C, vec3(0.299, 0.587, 0.114));
    C = clamp(mix(vec3(lum), C, u_sat), 0.0, 1.0);
    float q = 0.0;
    if (u_shade == 1) q = abs(texture(u_curl, v_uv).x) * u_shadeAmt * 1.2;
    else if (u_shade == 2) q = length(texture(u_vel, v_uv).xy) * u_shadeAmt * 0.6;
    q = q / (1.0 + q);
    vec3 col;
    if (u_useRamp) {
      col = ramp(a);
      col = u_ink ? col * (1.0 - 0.55 * q) : col + q * (0.2 + 0.5 * col);
    } else if (u_ink) {
      col = u_bg * (1.0 - a * (1.0 - C));
      col *= 1.0 - 0.55 * q;
    } else {
      col = 1.0 - (1.0 - u_bg) * (1.0 - a * C);
      col += q * (0.12 + 0.6 * a * C);
    }
    vec2 p = (v_uv - 0.5) * 2.0 * u_aspect;
    col = mix(col, u_bg, u_vig * smoothstep(0.35, 1.7, dot(p, p)));
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

  /* ---------------- helpers ---------------- */
  function gridSize(res, aspectKey) {
    const ar = ASPECTS[aspectKey] || 1;
    let w, h;
    if (ar >= 1) { h = res; w = Math.round(res / ar); } else { w = res; h = Math.round(res * ar); }
    return [w & ~1, h & ~1];
  }
  const rgb01 = hex => U.hexToRgb(hex).map(v => v / 255);
  const fmt2 = v => v.toFixed(2), fmt3 = v => v.toFixed(3);
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) => Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const MODES = ['jets', 'orbit', 'curl', 'swirl', 'splats', 'none'];
  const MODE_LABEL = { jets: 'jets', orbit: 'orbit', curl: 'curl noise', swirl: 'swirl', splats: 'splats', none: 'still' };
  const SHADES = { none: 0, curl: 1, velocity: 2 };
  const INITS = { none: 0, blobs: 1, bands: 2, rings: 3 };
  const BODY = { curl: 1, swirl: 2 };
  const hasEmitters = s => s.mode !== 'none';
  const usesForce = s => s.mode !== 'none' && s.mode !== 'curl';

  Studio.register({
    id: 'fluid', name: 'Fluid', subtitle: 'Navier-Stokes dye advected by a stable-fluids solver · 1999', equation: 'du/dt + (u·grad)u = -grad p - gamma·u + f,   div u ≈ 0   (no viscous term; gamma = -ln(dissipation) per step; f = vorticity confinement + forcing; advect -> force -> Jacobi project -> advect dye)', credit: "Stable fluids: Jos Stam, SIGGRAPH 1999. Vorticity confinement comes from Steinhoff and Underhill, 1994, brought into graphics by Fedkiw, Stam and Jensen, 2001.", order: 60,
    blurb: 'An incompressible fluid obeys the Navier-Stokes equations: velocity is carried along by itself, pushed by forces, and constrained so that no cell gains or loses volume. This solver keeps no explicit viscosity term: velocity is damped by a constant factor each step (the dissipation control, a linear drag), and the back-trace adds numerical diffusion that depends on the grid and the step, so it models a damped, forced incompressible flow rather than the full viscous Navier-Stokes equations. Jos Stam\'s 1999 "stable fluids" method makes this tractable on a grid — each step traces every cell backwards along the flow to fetch its new velocity (semi-Lagrangian advection, unconditionally stable), then solves a Poisson equation for pressure and subtracts its gradient to remove divergence. A passive dye field is advected by the same velocities at higher resolution; vorticity confinement re-injects the small swirls that the grid smooths away. The pressure solve runs a fixed number of Jacobi sweeps, so the divergence is reduced, not removed exactly.',

    schema: [
      { group: 'Grid', key: 'simRes', label: 'Sim resolution', type: 'seg', kind: 'geom', options: [[192, '192'], [256, '256'], [384, '384'], [512, '512'], [768, '768']] },
      { group: 'Grid', key: 'dyeRes', label: 'Dye resolution', type: 'seg', kind: 'geom', options: [[384, '384'], [512, '512'], [768, '768'], [1024, '1024'], [1536, '1536'], [2048, '2048']] },
      { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
      { group: 'Grid', key: 'boundary', label: 'Boundary', type: 'seg', kind: 'geom', options: [['closed', 'Closed box'], ['wrap', 'Wrap']] },

      { group: 'Forces', key: 'mode', label: 'Mode', type: 'seg', kind: 'geom', wrap: true, options: [['jets', 'Jets'], ['orbit', 'Orbit'], ['curl', 'Curl noise'], ['swirl', 'Swirl'], ['splats', 'Splats'], ['none', 'None']] },
      RANGE('Forces', 'count', 'Emitters', 'geom', 1, MAXE, 1, String, { dimUnless: hasEmitters }),
      RANGE('Forces', 'force', 'Force', 'live', 0, 1, 0.01, fmt2, { dimUnless: hasEmitters }),
      RANGE('Forces', 'radius', 'Emitter radius', 'live', 0.01, 0.15, 0.005, fmt3, { dimUnless: hasEmitters }),
      RANGE('Forces', 'dye', 'Dye amount', 'live', 0, 1, 0.01, fmt2, { dimUnless: hasEmitters }),
      RANGE('Forces', 'tempo', 'Tempo', 'live', 0.1, 3, 0.05, fmt2, { dimUnless: hasEmitters }),
      RANGE('Forces', 'noiseScale', 'Noise scale', 'live', 0.5, 8, 0.1, v => v.toFixed(1), { dimUnless: s => s.mode === 'curl' }),
      { group: 'Forces', key: 'colorMode', label: 'Emitter colors', type: 'seg', kind: 'geom', options: [['order', 'Palette order'], ['random', 'By emitter'], ['cycle', 'Cycling']], dimUnless: hasEmitters },

      { group: 'Coherent structures', key: 'ftle', label: 'Show FTLE ridges', type: 'toggle', kind: 'live',

        hint: 'Reveals the invisible transport barriers that organize the mixing: ridges of the finite-time Lyapunov exponent, the skeleton the dye is obeying.' },

      { group: 'Coherent structures', key: 'ftleDir', label: 'Structures', type: 'seg', kind: 'live',

        options: [['back', 'Attracting'], ['fwd', 'Repelling']], dimUnless: s => s.ftle },

      { group: 'Coherent structures', key: 'ftleGain', label: 'Ridge contrast', type: 'range', kind: 'paint', min: 0.2, max: 8, step: 0.1, fmt: v => v.toFixed(1), dimUnless: s => s.ftle },

      { group: 'Coherent structures', key: 'ftleMix', label: 'Dye showing through', type: 'range', kind: 'paint', min: 0, max: 1, step: 0.02, fmt: v => Math.round(v * 100) + '%', dimUnless: s => s.ftle },

      { group: 'Coherent structures', key: 'ftleWindow', label: 'Integration window (steps, 0 = keep going)', type: 'range', kind: 'live', min: 0, max: 600, step: 20, dimUnless: s => s.ftle },

      { group: 'Coherent structures', key: 'ftleReset', label: 'Restart the window', type: 'action' },


      { group: 'Initial state', key: 'initDye', label: 'Initial dye', type: 'seg', kind: 'geom', options: [['none', 'None'], ['blobs', 'Blobs'], ['bands', 'Bands'], ['rings', 'Rings']] },
      RANGE('Initial state', 'initScale', 'Initial scale', 'geom', 1, 12, 0.5, v => v.toFixed(1), { dimUnless: s => s.initDye !== 'none' }),
      RANGE('Initial state', 'stir', 'Initial stir', 'geom', 0, 1, 0.01, fmt2),

      RANGE('Fluid', 'velDiss', 'Velocity dissipation', 'live', 0.9, 1, 0.001, fmt3),
      RANGE('Fluid', 'dyeDiss', 'Dye dissipation', 'live', 0.9, 1, 0.001, fmt3),
      RANGE('Fluid', 'curl', 'Vorticity', 'live', 0, 1, 0.01, fmt2),
      RANGE('Fluid', 'iters', 'Pressure iterations', 'live', 10, 60, 2, String),
      { group: 'Fluid', key: 'running', label: 'Running', type: 'toggle', kind: 'live' },
      RANGE('Fluid', 'speed', 'Steps per frame', 'live', 1, 6, 1, String),
      { group: 'Fluid', key: 'clear', label: 'Clear dye', type: 'action' },
      { group: 'Fluid', key: 'restart', label: 'Restart', type: 'action' },

      { group: 'Color', key: 'useRamp', label: 'Palette ramp', type: 'toggle', kind: 'paint', hint: 'On: dye density is mapped through the ramp from background to the palette. Off: emitters carry the palette colors directly.' },
      { group: 'Color', key: 'inkMode', label: 'Composite', type: 'seg', kind: 'paint', options: [['auto', 'Auto'], ['ink', 'Ink on paper'], ['light', 'Light on dark']] },
      { group: 'Color', key: 'shade', label: 'Shading', type: 'seg', kind: 'paint', options: [['none', 'None'], ['curl', '|curl|'], ['velocity', '|velocity|']] },
      RANGE('Color', 'shadeAmt', 'Shading strength', 'paint', 0, 1, 0.01, fmt2, { dimUnless: s => s.shade !== 'none' }),
      RANGE('Color', 'gamma', 'Gamma', 'paint', 0.3, 3, 0.01, fmt2),
      RANGE('Color', 'contrast', 'Contrast', 'paint', 0.5, 3, 0.01, fmt2),
      RANGE('Color', 'saturation', 'Saturation', 'paint', 0, 2, 0.01, fmt2),
      RANGE('Color', 'vignette', 'Vignette', 'paint', 0, 1, 0.01, fmt2),
    ],
    defaults: {
      simRes: 192, dyeRes: 512, aspect: '1:1', boundary: 'closed',
      ftle: false, ftleDir: 'back', ftleGain: 2.2, ftleMix: 0.3, ftleWindow: 180,
      mode: 'jets', count: 3, force: 0.5, radius: 0.04, dye: 0.5, tempo: 1, noiseScale: 2.5, colorMode: 'order',
      initDye: 'none', initScale: 4, stir: 0,
      velDiss: 0.995, dyeDiss: 0.99, curl: 0.35, iters: 20, running: true, speed: 2,
      useRamp: true, inkMode: 'auto', shade: 'curl', shadeAmt: 0.3, gamma: 1, contrast: 1, saturation: 1, vignette: 0.25,
    },
    presets: {
      inkdrop: { label: 'Ink drop', p: { simRes: 192, dyeRes: 512, boundary: 'closed', mode: 'jets', count: 2, force: 0.4, radius: 0.035, dye: 0.55, tempo: 0.8, colorMode: 'order', initDye: 'none', stir: 0, velDiss: 0.99, dyeDiss: 0.996, curl: 0.25, iters: 24, speed: 2, useRamp: false, inkMode: 'auto', shade: 'curl', shadeAmt: 0.2, gamma: 1, contrast: 1, saturation: 1, vignette: 0.15 }, palette: Studio.PALETTES.graphite },
      smoke: { label: 'Smoke', p: { simRes: 192, dyeRes: 512, boundary: 'closed', mode: 'jets', count: 3, force: 0.55, radius: 0.04, dye: 0.35, tempo: 1.2, colorMode: 'order', initDye: 'none', stir: 0, velDiss: 0.998, dyeDiss: 0.985, curl: 0.7, iters: 20, speed: 2, useRamp: true, inkMode: 'auto', shade: 'velocity', shadeAmt: 0.25, gamma: 0.8, contrast: 1, saturation: 1, vignette: 0.35 }, palette: Studio.PALETTES.xray },
      nebula: { label: 'Nebula', p: { simRes: 192, dyeRes: 512, boundary: 'wrap', mode: 'curl', count: 5, force: 0.6, radius: 0.05, dye: 0.25, tempo: 1, noiseScale: 2.5, colorMode: 'order', initDye: 'blobs', initScale: 3, stir: 0.3, velDiss: 0.998, dyeDiss: 0.999, curl: 0.3, iters: 20, speed: 2, useRamp: false, inkMode: 'auto', shade: 'curl', shadeAmt: 0.45, gamma: 0.9, contrast: 1.05, saturation: 1.1, vignette: 0.4 }, palette: Studio.PALETTES.thermal },
      vortex: { label: 'Vortex', p: { simRes: 192, dyeRes: 768, boundary: 'closed', mode: 'swirl', count: 1, force: 0.7, radius: 0.06, dye: 0.2, tempo: 1, colorMode: 'order', initDye: 'bands', initScale: 5, stir: 0, velDiss: 0.997, dyeDiss: 0.999, curl: 0.15, iters: 30, speed: 2, useRamp: false, inkMode: 'auto', shade: 'curl', shadeAmt: 0.3, gamma: 1, contrast: 1, saturation: 1, vignette: 0.3 }, palette: Studio.PALETTES.glacier },
      marbling: { label: 'Marbling', p: { simRes: 192, dyeRes: 1024, boundary: 'closed', mode: 'orbit', count: 4, force: 0.6, radius: 0.03, dye: 0.7, tempo: 0.8, colorMode: 'order', initDye: 'bands', initScale: 6, stir: 0, velDiss: 0.975, dyeDiss: 1, curl: 0.1, iters: 30, speed: 2, useRamp: false, inkMode: 'auto', shade: 'none', shadeAmt: 0, gamma: 1, contrast: 1, saturation: 1, vignette: 0 }, palette: Studio.PALETTES.tram },
      plasma: { label: 'Plasma', p: { simRes: 192, dyeRes: 512, boundary: 'wrap', mode: 'splats', count: 8, force: 0.75, radius: 0.05, dye: 0.6, tempo: 1.3, colorMode: 'order', initDye: 'none', stir: 0.2, velDiss: 0.997, dyeDiss: 0.985, curl: 0.8, iters: 20, speed: 3, useRamp: true, inkMode: 'auto', shade: 'velocity', shadeAmt: 0.5, gamma: 0.7, contrast: 1.1, saturation: 1, vignette: 0.3 }, palette: Studio.PALETTES.bioluminescent },
      tidal: { label: 'Tidal', p: { simRes: 192, dyeRes: 512, aspect: '5:4', boundary: 'closed', mode: 'jets', count: 2, force: 0.7, radius: 0.045, dye: 0.5, tempo: 0.6, colorMode: 'order', initDye: 'none', stir: 0, velDiss: 0.996, dyeDiss: 0.992, curl: 0.5, iters: 24, speed: 2, useRamp: true, inkMode: 'auto', shade: 'curl', shadeAmt: 0.35, gamma: 0.9, contrast: 1, saturation: 1, vignette: 0.3 }, palette: Studio.PALETTES.harbor },
      stir: { label: 'Stirred cream', p: { simRes: 256, dyeRes: 768, boundary: 'closed', mode: 'none', initDye: 'rings', initScale: 7, stir: 0.8, velDiss: 0.998, dyeDiss: 1, curl: 0.4, iters: 30, speed: 2, useRamp: false, inkMode: 'auto', shade: 'curl', shadeAmt: 0.15, gamma: 1, contrast: 1, saturation: 1, vignette: 0.2 }, palette: Studio.PALETTES.petri },
    },
    hints: {
      Forces: 'Jets push from fixed seeded points, orbit emitters paint along Lissajous paths, curl noise stirs the whole field with a divergence-free turbulence, swirl spins vortex cores, splats fire seeded random bursts. Tempo scales every animated part.',
      Fluid: 'Dissipation below 1 lets momentum and color fade each step. Vorticity confinement sharpens the small eddies the grid would otherwise smooth away; more pressure iterations give a tighter incompressibility solve.',
      'Initial state': 'A pre-drawn dye field (bands for marbling, blobs for nebulae) and a single seeded stir that sets the fluid moving before the emitters start.',
    },
    closedGroups: ['Initial state', 'Coherent structures'],
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Colors (ramp low → high / emitters in order)', paletteIsGeom: true,
    headline: 'speed', headlineLabel: 'steps/frame',

    surprise(rng) {
      const mode = rng.pick(['jets', 'jets', 'orbit', 'curl', 'swirl', 'splats']);
      const p = {
        simRes: 192, dyeRes: rng.pick([512, 512, 768]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']), boundary: rng() < 0.3 ? 'wrap' : 'closed',
        mode, count: mode === 'splats' ? rng.int(4, 12) : mode === 'swirl' ? rng.int(1, 3) : rng.int(2, 6),
        force: +rng.range(0.35, 0.8).toFixed(2), radius: +rng.range(0.025, 0.07).toFixed(3), dye: +rng.range(0.3, 0.7).toFixed(2),
        tempo: +rng.range(0.6, 1.6).toFixed(2), noiseScale: +rng.range(1.5, 4).toFixed(1), colorMode: rng.pick(['order', 'order', 'random', 'cycle']),
        initDye: mode === 'swirl' || mode === 'orbit' ? rng.pick(['bands', 'rings', 'blobs']) : mode === 'curl' ? rng.pick(['blobs', 'none']) : 'none',
        initScale: rng.int(3, 8), stir: mode === 'curl' || mode === 'splats' ? +rng.range(0, 0.5).toFixed(2) : 0,
        velDiss: +rng.range(0.985, 0.999).toFixed(3), dyeDiss: +rng.range(0.985, 1).toFixed(3), curl: +rng.range(0.1, 0.8).toFixed(2), iters: rng.pick([20, 24, 30]), speed: 2,
        useRamp: rng() < 0.5, inkMode: 'auto', shade: rng.pick(['curl', 'curl', 'velocity', 'none']), shadeAmt: +rng.range(0.15, 0.5).toFixed(2),
        gamma: +rng.range(0.75, 1.2).toFixed(2), contrast: +rng.range(0.95, 1.2).toFixed(2), saturation: +rng.range(0.9, 1.2).toFixed(2), vignette: +rng.range(0, 0.4).toFixed(2),
      };
      if (mode === 'orbit') { p.velDiss = +rng.range(0.97, 0.99).toFixed(3); p.dyeDiss = 1; p.dye = +rng.range(0.6, 0.9).toFixed(2); }
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
      // Velocity and dye are sampled with linear filtering; 32f needs OES_texture_float_linear for that, 16f is filterable in core.
      let texType = gl.floatExt && gl.getExtension('OES_texture_float_linear') ? 'rgba32f' : 'rgba16f';
      if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');

      let advectPass, curlPass, forcePass, divPass, prsPass, gradPass, splatPass, initDyePass, initVelPass, renderPass;
      let mapInitPass, mapPass, ftlePass;
      try {
        advectPass = new G.Pass(gl, ADVECT_FS); curlPass = new G.Pass(gl, CURL_FS); forcePass = new G.Pass(gl, FORCE_FS);
        divPass = new G.Pass(gl, DIV_FS); prsPass = new G.Pass(gl, PRESSURE_FS); gradPass = new G.Pass(gl, GRAD_FS);
        splatPass = new G.Pass(gl, SPLAT_FS); initDyePass = new G.Pass(gl, INIT_DYE_FS); initVelPass = new G.Pass(gl, INIT_VEL_FS);
        renderPass = new G.Pass(gl, RENDER_FS);
        mapInitPass = new G.Pass(gl, MAP_INIT_FS); mapPass = new G.Pass(gl, MAP_FS); ftlePass = new G.Pass(gl, FTLE_FS);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let vel = null, dye = null, prs = null, divT = null, curlT = null;
      let fmap = null, sceneT = null, ftleT0 = 0;
      let sw = 0, sh = 0, dw = 0, dh = 0, gridWrap = '';
      let rampBg = null, rampCols = null, rampKey = '', jsRamp = null;
      let raf = 0, chunkTimer = 0, stepCount = 0, frameNo = 0;
      let rig = [], noff = [0, 0], initOff = [0, 0], initAng = 0, resScale = 1;
      const em = new Float32Array(MAXE * 4), col = new Float32Array(MAXE * 4);

      function ensureTargets(s) {
        const [w, h] = gridSize(Number(s.simRes), s.aspect), [w2, h2] = gridSize(Number(s.dyeRes), s.aspect);
        const wrap = s.boundary === 'wrap' ? 'repeat' : 'clamp';
        if (vel && sw === w && sh === h && dw === w2 && dh === h2 && gridWrap === wrap) return;
        if (vel) { vel.dispose(); dye.dispose(); prs.dispose(); divT.dispose(); curlT.dispose(); }
        if (fmap) { fmap.dispose(); sceneT.dispose(); fmap = null; sceneT = null; }
        try {
          vel = new G.PingPong(gl, w, h, { type: texType, filter: 'linear', wrap });
          dye = new G.PingPong(gl, w2, h2, { type: texType, filter: 'linear', wrap });
          prs = new G.PingPong(gl, w, h, { type: texType, filter: 'nearest', wrap });
          divT = new G.Target(gl, w, h, { type: texType, filter: 'nearest', wrap });
          // flow map for the FTLE, at sim resolution; the scene is composited at dye resolution
          fmap = new G.PingPong(gl, w2, h2, { type: texType, filter: 'linear', wrap: 'clamp' });
          sceneT = new G.Target(gl, w2, h2, { type: 'rgba8', filter: 'linear', wrap: 'clamp' });
          curlT = new G.Target(gl, w, h, { type: texType, filter: 'linear', wrap });
        } catch (err) { throw new Error('Float render targets are not available in this browser'); }
        sw = w; sh = h; dw = w2; dh = h2; gridWrap = wrap;
        resScale = Math.max(sw, sh) / REF_RES;
      }
      function ensureRamps(s) {
        const key = s.bg + '|' + s.palette.join(',');
        if (rampBg && rampKey === key) return;
        if (rampBg) { rampBg.dispose(); rampCols.dispose(); }
        rampBg = G.rampTexture(gl, s.palette, s.bg);
        rampCols = G.rampTexture(gl, s.palette, null);
        jsRamp = U.makeRamp(s.palette);
        rampKey = key;
      }
      const aspectVec = () => { const m = Math.max(sw, sh); return [sw / m, sh / m]; };

      // Seeded emitter rig: positions, aim, wobble, Lissajous frequencies, vortex sign, color pick.
      function buildRig(s) {
        const rng = U.makeRng(s.seed + '/emitters');
        rig = [];
        for (let i = 0; i < MAXE; i++) {
          const x = rng.range(0.18, 0.82), y = rng.range(0.18, 0.82);
          rig.push({ x, y, ang: Math.atan2(0.5 - y, 0.5 - x) + rng.range(-0.7, 0.7), wob: rng.range(0.3, 1), ph: rng() * TAU,
            fa: rng.int(1, 3), fb: rng.int(1, 3), pa: rng() * TAU, pb: rng() * TAU, sign: rng() < 0.5 ? -1 : 1, ci: rng.int(0, 15) });
        }
        if (s.mode === 'jets' && s.count === 1) Object.assign(rig[0], { x: 0.5, y: 0.1, ang: Math.PI / 2 });
        if (s.mode === 'jets' && s.count === 2) { Object.assign(rig[0], { x: 0.08, y: 0.44, ang: 0 }); Object.assign(rig[1], { x: 0.92, y: 0.56, ang: Math.PI }); }
        if (s.mode === 'swirl' && s.count === 1) Object.assign(rig[0], { x: 0.58, y: 0.5 });
        const nr = U.makeRng(s.seed + '/noise');
        noff = [nr.range(0, 100), nr.range(0, 100)];
        initOff = [nr.range(0, 100), nr.range(0, 100)];
        initAng = nr() * Math.PI;
      }
      function colorOf(s, i, ci, t) {
        const pal = s.palette;
        if (s.colorMode === 'random') return rgb01(pal[ci % pal.length]);
        if (s.colorMode === 'cycle') {
          const c = jsRamp((t * 0.0015 * s.tempo + i / Math.max(1, s.count)) % 1);
          return [c[0] / 255, c[1] / 255, c[2] / 255];
        }
        return rgb01(pal[i % pal.length]);
      }
      function setSlot(m, x, y, fx, fy, c, amt) {
        em[m * 4] = x; em[m * 4 + 1] = y; em[m * 4 + 2] = fx; em[m * 4 + 3] = fy;
        col[m * 4] = c[0]; col[m * 4 + 1] = c[1]; col[m * 4 + 2] = c[2]; col[m * 4 + 3] = amt;
      }
      // Fill the emitter uniform arrays for step t. Returns the number of active slots.
      function emitters(s, t) {
        em.fill(0); col.fill(0);
        if (s.mode === 'none') return 0;
        const n = s.count, F = s.force * FORCE_K * resScale, tempo = s.tempo;
        if (s.mode === 'splats') {
          const interval = Math.max(2, Math.round(120 / (n * tempo))), dur = 5;
          let m = 0;
          for (let k = Math.max(0, Math.floor((t - dur + 1) / interval)); k * interval <= t && m < MAXE; k++) {
            if (t - k * interval >= dur) continue;
            const r = U.makeRng(s.seed + '/splat/' + k);
            const x = r.range(0.15, 0.85), y = r.range(0.15, 0.85), a = r() * TAU;
            const c = s.colorMode === 'cycle' ? colorOf(s, 0, 0, (k * 0.17 % 1) / (0.0015 * tempo)) : colorOf(s, k, r.int(0, 15), t);
            setSlot(m++, x, y, Math.cos(a) * F * 2.5, Math.sin(a) * F * 2.5, c, s.dye);
          }
          return m;
        }
        for (let i = 0; i < n; i++) {
          const e = rig[i];
          let x = e.x, y = e.y, fx = 0, fy = 0;
          if (s.mode === 'jets') {
            const a = e.ang + e.wob * 0.45 * Math.sin(t * 0.02 * tempo + e.ph);
            fx = Math.cos(a) * F; fy = Math.sin(a) * F;
          } else if (s.mode === 'orbit') {
            const w = 0.012 * tempo, A = 0.33;
            x = 0.5 + A * Math.sin(e.fa * w * t + e.pa); y = 0.5 + A * Math.sin(e.fb * w * t + e.pb);
            let tx = e.fa * Math.cos(e.fa * w * t + e.pa), ty = e.fb * Math.cos(e.fb * w * t + e.pb);
            const L = Math.hypot(tx, ty) || 1;
            fx = tx / L * F; fy = ty / L * F;
          } else if (s.mode === 'swirl') {
            const a = t * 0.003 * tempo, ca = Math.cos(a), sa = Math.sin(a), dx = e.x - 0.5, dy = e.y - 0.5;
            x = 0.5 + dx * ca - dy * sa; y = 0.5 + dx * sa + dy * ca;
            fx = e.sign * s.force * SWIRL_K * resScale;
          }
          setSlot(i, x, y, fx, fy, colorOf(s, i, e.ci, t), s.dye);
        }
        return n;
      }

      function step() {
        const s = host.getState(), t = stepCount, closed = s.boundary === 'closed';
        const simRes = [sw, sh], dyeRes = [dw, dh], asp = aspectVec();
        advectPass.draw(vel.write, { u_vel: vel.read, u_src: vel.read, u_simRes: simRes, u_res: simRes, u_diss: s.velDiss, u_zeroEdge: closed }); vel.swap();
        curlPass.draw(curlT, { u_vel: vel.read, u_res: simRes });
        const n = emitters(s, t);
        const drift = t * 0.004 * s.tempo;
        forcePass.draw(vel.write, {
          u_vel: vel.read, u_curl: curlT, u_res: simRes, u_aspect: asp, u_noff: [noff[0] + drift, noff[1] + drift * 0.7],
          u_curlAmt: s.curl * CURL_K, u_rad: s.radius, u_noiseScale: s.noiseScale,
          u_bodyAmt: s.mode === 'curl' ? s.force * NOISE_K * resScale / s.noiseScale : 0,
          u_body: { int: BODY[s.mode] || 0 }, u_n: { int: n }, u_em: em, u_closed: closed,
        }); vel.swap();
        divPass.draw(divT, { u_vel: vel.read, u_res: simRes });
        for (let i = 0; i < s.iters; i++) { prsPass.draw(prs.write, { u_prs: prs.read, u_div: divT, u_res: simRes }); prs.swap(); }
        gradPass.draw(vel.write, { u_vel: vel.read, u_prs: prs.read, u_res: simRes, u_closed: closed }); vel.swap();
        if (n > 0 && s.dye > 0) {
          splatPass.draw(dye.write, { u_dye: dye.read, u_aspect: asp, u_rad: s.radius, u_n: { int: n }, u_em: em, u_col: col }); dye.swap();
        }
        advectPass.draw(dye.write, { u_vel: vel.read, u_src: dye.read, u_simRes: simRes, u_res: dyeRes, u_diss: s.dyeDiss, u_zeroEdge: false }); dye.swap();
        if (s.ftle) {
          if (s.ftleWindow > 0 && stepCount - ftleT0 >= s.ftleWindow) resetMap();
          mapPass.draw(fmap.write, { u_map: fmap.read, u_vel: vel.read, u_simRes: simRes, u_dir: s.ftleDir === 'fwd' ? 1 : -1 });
          fmap.swap();
        }
        stepCount++;
      }
      function steps(k) { for (let i = 0; i < k; i++) step(); }
      function resetMap() { if (!fmap) return; mapInitPass.draw(fmap.write, {}); fmap.swap(); ftleT0 = stepCount; }

      function render(target) {
        const s = host.getState();
        ensureRamps(s);
        const ink = s.inkMode === 'auto' ? U.isLight(s.bg) : s.inkMode === 'ink';
        const sceneTarget = s.ftle ? sceneT : (target || null);
        renderPass.draw(sceneTarget, {
          u_dye: dye.read, u_vel: vel.read, u_curl: curlT, u_ramp: rampBg, u_bg: rgb01(s.bg), u_aspect: aspectVec(),
          u_useRamp: !!s.useRamp, u_ink: ink, u_shade: { int: SHADES[s.shade] || 0 }, u_shadeAmt: s.shadeAmt,
          u_gamma: s.gamma, u_contrast: s.contrast, u_sat: s.saturation, u_vig: s.vignette,
        });
        if (s.ftle) {
          ftlePass.draw(target || null, {
            u_map: fmap.read, u_scene: sceneT, u_ramp: rampBg, u_res: [dw, dh],
            u_t: Math.max(1, stepCount - ftleT0), u_gain: s.ftleGain, u_mix: s.ftleMix,
          });
        }
      }
      function status(extra) {
        const s = host.getState();
        host.setStatus('<span>frame <b>' + stepCount + '</b></span><span>sim <b>' + sw + '×' + sh + '</b></span><span>dye <b>' + dw + '×' + dh + '</b></span>' +
          (s.ftle ? '<span>FTLE ' + (s.ftleDir === 'fwd' ? 'repelling' : 'attracting') + ' · t <b>' + (stepCount - ftleT0) + '</b></span>' : '') +
          '<span>' + MODE_LABEL[s.mode] + (usesForce(s) || s.mode === 'curl' ? ' · ' + s.count + (s.mode === 'swirl' ? ' vortices' : ' emitters') : '') + '</span>' +
          (extra ? '<span>' + extra + '</span>' : ''));
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        steps(host.getState().speed); render();
        if (++frameNo % 6 === 0) status();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        if (host.getState().running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else status(host.getState().running ? '' : 'paused');
      }
      // Reduced motion: advance `total` steps in bounded chunks, paint progress, then rest on the final frame.
      function settle(total) {
        stop();
        let left = total;
        (function chunk() {
          const k = Math.min(20, left); left -= k;
          steps(k); render(); status(left > 0 ? 'settling…' : '');
          if (left > 0) chunkTimer = setTimeout(chunk, 0);
        })();
      }
      function reset() {
        const s = host.getState();
        ensureTargets(s); ensureRamps(s); buildRig(s);
        const closed = s.boundary === 'closed', asp = aspectVec();
        vel.write.clear(0, 0, 0, 1); prs.read.clear(0, 0, 0, 1); prs.write.clear(0, 0, 0, 1); dye.write.clear(0, 0, 0, 0);
        initVelPass.draw(vel.read, { u_aspect: asp, u_off: initOff, u_res: [sw, sh], u_amt: s.stir * STIR_K * resScale, u_closed: closed });
        initDyePass.draw(dye.read, { u_mode: { int: INITS[s.initDye] || 0 }, u_aspect: asp, u_off: [initOff[1], initOff[0]], u_ang: initAng, u_scale: s.initScale, u_k: s.palette.length, u_ramp: rampCols });
        stepCount = 0; frameNo = 0;
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop();
          reset();
          resetMap();
          if (host.reducedMotion()) { render(); settle(200); return; }
          steps(24); render(); status();
          startLoop();
        },
        repaint() { render(); },
        live(key) {
          if (key === 'running') startLoop();
          else if (key === 'ftle' || key === 'ftleDir' || key === 'ftleWindow') { resetMap(); render(); }
        },
        resize() { render(); },
        pause() { stop(); },
        resume() { render(); startLoop(); },
        action(key) {
          if (key === 'restart') this.regenerate();
          else if (key === 'clear') { dye.read.clear(0, 0, 0, 0); render(); }
          else if (key === 'ftleReset') { resetMap(); render(); status(); }
        },
        disturb(p) {
          if (!dye || !splatPass) return;
          const s = host.getState();
          const c = colorOf(s, 0, 0, stepCount);
          const fx = (p.dx || 0) * 14;
          const fy = (p.dy || 0) * 14;
          setSlot(0, p.x, p.yGL, fx, fy, c, Math.max(0.45, s.dye || 0.5));
          splatPass.draw(dye.write, { u_dye: dye.read, u_aspect: aspectVec(), u_rad: Math.max(0.03, s.radius || 0.04), u_n: { int: 1 }, u_em: em, u_col: col });
          dye.swap();
          if (forcePass && vel) {
            forcePass.draw(vel.write, {
              u_vel: vel.read, u_curl: curlT, u_res: [sw, sh], u_aspect: aspectVec(),
              u_noff: noff, u_curlAmt: 0, u_rad: Math.max(0.03, s.radius || 0.04),
              u_noiseScale: s.noiseScale || 1, u_bodyAmt: 0, u_body: { int: 0 },
              u_n: { int: 1 }, u_em: em, u_closed: s.boundary === 'closed',
            });
            vel.swap();
          }
          render();
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

