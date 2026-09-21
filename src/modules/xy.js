
/* modules/xy.js */
/* GENChase — XY model / Kosterlitz–Thouless: planar rotors on a lattice, vortex unbinding · 1973. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU, PI = Math.PI;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const VIEW = { phase: 0, blend: 1, order: 2, energy: 3, vorticity: 4, lic: 5, licphase: 6 };
  const CYC = { wrap: 0, mirror: 1, hue: 2 };
  const RED = 32;
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const deg = v => v + '°';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});

  function toHalf(f32) {
    const out = new Uint16Array(f32.length), fb = new Float32Array(1), ib = new Int32Array(fb.buffer);
    for (let i = 0; i < f32.length; i++) {
      fb[0] = f32[i];
      const x = ib[0], sign = (x >> 16) & 0x8000, exp = ((x >> 23) & 0xff) - 112;
      out[i] = exp <= 0 ? sign : exp >= 31 ? sign | 0x7c00 : sign | (exp << 10) | ((x >> 13) & 0x3ff);
    }
    return out;
  }

  /* Langevin / model A on the classical XY Hamiltonian
       H = −J Σ_<ij> cos(θ_i − θ_j) − h Σ_i cos(θ_i − φ)
     dθ_i/dt = J Σ_nn sin(θ_j − θ_i) + h sin(φ − θ_i) + √(2T) η
     State stores θ / 2π in [0, 1). Periodic wrapping: sin is 2π-periodic so the wrap is free. */
  const SIM_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_state;
uniform vec2 u_res;
uniform float u_dt, u_J, u_J2, u_T, u_h, u_hAng, u_step, u_nOff;
${G.GLSL.hash}
float ang(ivec2 c){
  vec2 r = u_res;
  vec2 w = mod(mod(vec2(c), r) + r, r);
  return texelFetch(u_state, ivec2(w), 0).r * 6.28318530718;
}
float gauss(vec2 p){
  float a = max(hash21(p), 1.0e-6), b = hash21(p + 19.17);
  return sqrt(-2.0 * log(a)) * cos(6.28318530718 * b);
}
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  float t = ang(c);
  float torque = sin(ang(c + ivec2(1, 0)) - t) + sin(ang(c + ivec2(-1, 0)) - t)
               + sin(ang(c + ivec2(0, 1)) - t) + sin(ang(c + ivec2(0, -1)) - t);
  if (u_J2 > 0.001) {
    torque += u_J2 * (
      sin(ang(c + ivec2(1, 1)) - t) + sin(ang(c + ivec2(-1, -1)) - t) +
      sin(ang(c + ivec2(1, -1)) - t) + sin(ang(c + ivec2(-1, 1)) - t)
    );
  }
  torque = u_J * torque + u_h * sin(u_hAng - t);
  float sig = sqrt(max(0.0, 2.0 * u_T * u_dt));
  float nt = t + u_dt * torque + sig * gauss(vec2(c) + vec2(u_nOff, u_step));
  outColor = vec4(fract(nt * 0.15915494309 + 1.0), 0.0, 0.0, 1.0);
}`;

  const VORTEX_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_state;
uniform vec2 u_res, u_a, u_b;
uniform float u_q1, u_q2;
void main(){
  float t = texture(u_state, v_uv).r * 6.28318530718;
  vec2 d1 = (v_uv - u_a) * u_res;
  vec2 d2 = (v_uv - u_b) * u_res;
  t += u_q1 * atan(d1.y, d1.x) + u_q2 * atan(d2.y, d2.x);
  outColor = vec4(fract(t * 0.15915494309 + 1.0), 0.0, 0.0, 1.0);
}`;

  const RENDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_state;
uniform vec2 u_res;
uniform int u_view, u_cyc;
uniform float u_exposure, u_gamma, u_contrast, u_grain, u_orderW, u_licLen, u_licStep, u_cores, u_coreSize;
uniform vec3 u_bg;
${G.GLSL.hash}
${G.GLSL.ramp}
const float TAU = 6.28318530718;
const float PI = 3.14159265359;
float angAt(vec2 uv){ return texture(u_state, uv).r * TAU; }
float wrap(float a){ return mod(a + PI, TAU) - PI; }
float vort(vec2 uv, vec2 px){
  float t00 = angAt(uv);
  float t10 = angAt(uv + vec2(px.x, 0.0));
  float t11 = angAt(uv + px);
  float t01 = angAt(uv + vec2(0.0, px.y));
  return (wrap(t10 - t00) + wrap(t11 - t10) + wrap(t01 - t11) + wrap(t00 - t01)) / TAU;
}
vec3 hsv(float h, float s, float v){
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1.0), rgb, s);
}
vec3 phaseCol(float th01){
  if (u_cyc == 2) return hsv(th01, 0.62, 0.92);
  if (u_cyc == 1) { float t = 1.0 - abs(fract(th01) * 2.0 - 1.0); return ramp(t); }
  return texture(u_ramp, vec2(fract(th01), 0.5)).rgb;
}
float localR(vec2 uv, vec2 px, float W){
  float c = 0.0, s = 0.0, n = 0.0;
  int R = int(clamp(W, 1.0, 4.0));
  for (int y = -4; y <= 4; y++) if (abs(y) <= R) {
    for (int x = -4; x <= 4; x++) if (abs(x) <= R) {
      float t = angAt(uv + vec2(x, y) * px);
      c += cos(t); s += sin(t); n += 1.0;
    }
  }
  return length(vec2(c, s)) / max(n, 1.0);
}
float energy(vec2 uv, vec2 px){
  float t = angAt(uv);
  return 1.0 - 0.25 * (
    cos(angAt(uv + vec2(px.x, 0.0)) - t) + cos(angAt(uv - vec2(px.x, 0.0)) - t) +
    cos(angAt(uv + vec2(0.0, px.y)) - t) + cos(angAt(uv - vec2(0.0, px.y)) - t)
  );
}
float lic(vec2 uv, vec2 px){
  float acc = 0.0, wsum = 0.0;
  float L = clamp(u_licLen, 4.0, 28.0);
  float ds = u_licStep * min(px.x, px.y);
  for (int dir = 0; dir < 2; dir++) {
    vec2 p = uv;
    float sign = dir == 0 ? 1.0 : -1.0;
    for (int i = 0; i < 28; i++) {
      if (float(i) > L) break;
      float t = angAt(p);
      vec2 v = vec2(cos(t), sin(t)) * sign;
      float k = 1.0 - float(i) / L;
      float n = hash21(floor(p / px) + 0.5);
      acc += n * k; wsum += k;
      p += v * ds;
    }
  }
  return acc / max(wsum, 1e-4);
}
void main(){
  vec2 px = 1.0 / u_res;
  float th = texture(u_state, v_uv).r;
  vec3 col;
  if (u_view == 0) col = phaseCol(th);
  else if (u_view == 1) {
    float r = localR(v_uv, px, u_orderW);
    col = mix(u_bg, phaseCol(th), pow(clamp(r, 0.0, 1.0), 0.85));
  } else if (u_view == 2) {
    float r = localR(v_uv, px, u_orderW);
    col = ramp(pow(clamp(r, 0.0, 1.0), u_gamma));
  } else if (u_view == 3) {
    col = ramp(pow(clamp(energy(v_uv, px) * 1.4, 0.0, 1.0), u_gamma));
  } else if (u_view == 4) {
    float w = vort(v_uv, px);
    float a = tanh(abs(w) * 4.0);
    vec3 pos = phaseCol(0.02), neg = phaseCol(0.52);
    col = mix(u_bg, w >= 0.0 ? pos : neg, a);
  } else {
    float L = lic(v_uv, px);
    L = pow(clamp((L - 0.5) * u_contrast + 0.5, 0.0, 1.0), u_gamma);
    if (u_view == 6) col = phaseCol(th) * (0.28 + 0.85 * L);
    else col = mix(u_bg, ramp(L), 0.15 + 0.85 * L);
  }
  if (u_cores > 0.5 && (u_view == 0 || u_view == 1 || u_view == 5 || u_view == 6)) {
    float w = vort(v_uv, px);
    float d = length(fract(v_uv * u_res) - 0.5);
    float mark = smoothstep(u_coreSize, u_coreSize * 0.35, d) * smoothstep(0.28, 0.72, abs(w));
    vec3 mk = w > 0.0 ? phaseCol(0.0) : phaseCol(0.5);
    col = mix(col, mk, mark);
  }
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.35, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  const REDUCE_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_state;
uniform vec2 u_res, u_block;
const float TAU = 6.28318530718;
const float PI = 3.14159265359;
float wrap(float a){ return mod(a + PI, TAU) - PI; }
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float c = 0.0, s = 0.0, vort = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + vec2(x, y) * u_block * 0.125 + 0.5) / u_res;
    float t = texture(u_state, uv).r * TAU;
    c += cos(t); s += sin(t);
    vec2 px = 1.0 / u_res;
    float t00 = t;
    float t10 = texture(u_state, uv + vec2(px.x, 0.0)).r * TAU;
    float t11 = texture(u_state, uv + px).r * TAU;
    float t01 = texture(u_state, uv + vec2(0.0, px.y)).r * TAU;
    float w = abs(wrap(t10 - t00) + wrap(t11 - t10) + wrap(t01 - t11) + wrap(t00 - t01)) / TAU;
    if (w > 0.5) vort += 1.0;
  }
  outColor = vec4(c / 64.0 * 0.5 + 0.5, s / 64.0 * 0.5 + 0.5, vort / 64.0, 1.0);
}`;

  function seedField(s, W, H) {
    const rng = U.makeRng(s.seed + '/xy');
    const data = new Float32Array(W * H * 4);
    const init = s.init;
    const cx = (0.5 + s.panx * 0.15) * W, cy = (0.5 + s.pany * 0.15) * H;
    const sep = Math.max(4, s.vortexSep * Math.min(W, H));
    const noise = (amp) => (rng() - 0.5) * TAU * amp;
    const pair = (x, y, ax, ay, bx, by) => Math.atan2(y - ay, x - ax) - Math.atan2(y - by, x - bx);
    const vortices = [];
    if (init === 'pair' || init === 'pairs' || init === 'lattice') {
      const n = init === 'pair' ? 1 : (init === 'lattice' ? Math.max(2, Math.round(s.nVortices)) : Math.max(2, Math.round(s.nVortices)));
      for (let i = 0; i < n; i++) {
        let px, py, qx, qy;
        if (init === 'pair') {
          px = cx - sep * 0.5; py = cy; qx = cx + sep * 0.5; qy = cy;
        } else if (init === 'lattice') {
          const cols = Math.ceil(Math.sqrt(n));
          const gx = (i % cols + 0.5) / cols, gy = (Math.floor(i / cols) + 0.5) / Math.ceil(n / cols);
          px = gx * W; py = gy * H;
          qx = (gx + 0.5 / cols) * W; qy = gy * H;
        } else {
          px = rng.range(0.12, 0.88) * W; py = rng.range(0.12, 0.88) * H;
          const a = rng.range(0, TAU);
          qx = px + Math.cos(a) * sep * rng.range(0.6, 1.2);
          qy = py + Math.sin(a) * sep * rng.range(0.6, 1.2);
        }
        vortices.push([px, py, qx, qy]);
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let th = 0;
      if (init === 'aligned') th = s.hAngle * PI / 180 + noise(s.seedNoise);
      else if (init === 'twist') th = TAU * s.twistK * x / W + noise(s.seedNoise);
      else if (init === 'wave') th = s.waveAmp * Math.sin(TAU * s.twistK * x / W) * Math.sin(TAU * Math.max(1, s.twistK - 1) * y / H) + noise(s.seedNoise);
      else if (init === 'pair' || init === 'pairs' || init === 'lattice') {
        for (let i = 0; i < vortices.length; i++) {
          const v = vortices[i];
          th += pair(x + 0.5, y + 0.5, v[0], v[1], v[2], v[3]);
        }
        th += noise(s.seedNoise);
      } else th = rng() * TAU;
      let u = th / TAU; u -= Math.floor(u);
      const j = (y * W + x) * 4;
      data[j] = u; data[j + 3] = 1;
    }
    return data;
  }

  const SCHEMA = [
    { group: 'Lattice', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512'], [768, '768']] },
    { group: 'Lattice', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
    RANGE('Lattice', 'panx', 'Pan x', GEOM, -1, 1, 0.02, f2, { dimUnless: s => s.init === 'pair' || s.init === 'lattice' }),
    RANGE('Lattice', 'pany', 'Pan y', GEOM, -1, 1, 0.02, f2, { dimUnless: s => s.init === 'pair' || s.init === 'lattice' }),

    RANGE('Thermodynamics', 'T', 'Temperature T / J', LIVE, 0, 2.2, 0.01, f2, {
      hint: 'Kosterlitz–Thouless unbinding on the square lattice sits near T/J ≈ 0.89. Below it vortices bind in pairs and the phase has quasi-long-range order; above it they unbind into a plasma and correlations decay exponentially.' }),
    RANGE('Thermodynamics', 'J', 'Coupling J', LIVE, 0.2, 2, 0.02, f2),
    RANGE('Thermodynamics', 'J2', 'Diagonal coupling', LIVE, 0, 0.8, 0.02, f2, {
      hint: 'Next-nearest (diagonal) neighbors. A little J₂ stiffens the lattice and slightly raises T_KT; too much pushes it toward an Ising-like transition.' }),
    RANGE('Thermodynamics', 'dt', 'Time step', LIVE, 0.02, 0.25, 0.01, f2),
    RANGE('Thermodynamics', 'h', 'External field h', LIVE, 0, 1.2, 0.02, f2),
    RANGE('Thermodynamics', 'hAngle', 'Field angle', LIVE, 0, 360, 1, deg, { dimUnless: s => s.h > 0.001 }),

    { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
      options: [['random', 'Hot'], ['aligned', 'Aligned'], ['pair', 'Vortex pair'], ['pairs', 'Gas of pairs'], ['lattice', 'Pair lattice'], ['twist', 'Twist'], ['wave', 'Wave']] },
    RANGE('Seeding', 'vortexSep', 'Pair separation', GEOM, 0.06, 0.45, 0.01, pct, { dimUnless: s => s.init === 'pair' || s.init === 'pairs' || s.init === 'lattice' }),
    RANGE('Seeding', 'nVortices', 'Number of pairs', GEOM, 2, 24, 1, String, { dimUnless: s => s.init === 'pairs' || s.init === 'lattice' }),
    RANGE('Seeding', 'twistK', 'Winding / wave number', GEOM, 1, 12, 1, String, { dimUnless: s => s.init === 'twist' || s.init === 'wave' }),
    RANGE('Seeding', 'waveAmp', 'Wave amplitude', GEOM, 0.2, 3.2, 0.05, f2, { dimUnless: s => s.init === 'wave' }),
    RANGE('Seeding', 'seedNoise', 'Seed jitter', GEOM, 0, 0.35, 0.01, pct),

    { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
    RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 24, 1, String),
    RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 2500, 50, String),
    RANGE('Simulation', 'stopAfter', 'Stop after', LIVE, 0, 20000, 100, v => v === 0 ? '∞' : String(v)),
    { group: 'Simulation', key: 'burst', label: 'Run 800 steps', type: 'action' },
    { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },

    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true,
      options: [['phase', 'Phase'], ['blend', 'Blend'], ['licphase', 'LIC + phase'], ['lic', 'LIC'], ['vorticity', 'Vorticity'], ['order', 'Order r'], ['energy', 'Energy']] },
    { group: 'Picture', key: 'cyc', label: 'Phase ramp', type: 'seg', kind: PAINT, options: [['wrap', 'Wrap'], ['mirror', 'Mirror'], ['hue', 'Hue wheel']],
      dimUnless: s => s.view === 'phase' || s.view === 'blend' || s.view === 'licphase' || s.view === 'vorticity' },
    RANGE('Picture', 'orderW', 'Order neighborhood', PAINT, 1, 4, 1, String, { dimUnless: s => s.view === 'blend' || s.view === 'order' }),
    RANGE('Picture', 'licLen', 'LIC length', PAINT, 4, 24, 1, String, { dimUnless: s => s.view === 'lic' || s.view === 'licphase' }),
    RANGE('Picture', 'licStep', 'LIC step', PAINT, 0.4, 1.6, 0.05, f2, { dimUnless: s => s.view === 'lic' || s.view === 'licphase' }),
    { group: 'Picture', key: 'cores', label: 'Mark vortex cores', type: 'toggle', kind: PAINT },
    RANGE('Picture', 'coreSize', 'Core size', PAINT, 0.15, 0.7, 0.02, f2, { dimUnless: s => s.cores }),
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
    RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
    RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
    RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
  ];

  const DEFAULTS = {
    grid: 256, aspect: '1:1', panx: 0, pany: 0,
    T: 0.7, J: 1, J2: 0, dt: 0.08, h: 0, hAngle: 0,
    init: 'random', vortexSep: 0.22, nVortices: 6, twistK: 2, waveAmp: 1.2, seedNoise: 0.04,
    running: true, steps: 6, warmup: 400, stopAfter: 0,
    view: 'blend', cyc: 'wrap', orderW: 2, licLen: 12, licStep: 0.8, cores: false, coreSize: 0.35,
    exposure: 1, gamma: 1, contrast: 1.05, grain: 0.08,
    seed: 'kt-1973',
  };

  const P = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const PRESETS = {
    bound: pre('Bound pairs', { T: 0.62, init: 'random', view: 'blend', warmup: 800, steps: 6, cores: false, grain: 0.08, cyc: 'wrap' }, P.nightshade),
    unbind: pre('Unbinding', { T: 0.89, init: 'random', view: 'vorticity', warmup: 600, steps: 8, cores: false, grain: 0.06, contrast: 1.15 }, P.thermal),
    plasma: pre('Vortex plasma', { T: 1.35, init: 'random', view: 'phase', warmup: 200, steps: 8, cores: false, grain: 0.1, cyc: 'hue' }, P.ember),
    pair: pre('Vortex pair', { T: 0.15, init: 'pair', view: 'licphase', vortexSep: 0.28, warmup: 200, cores: true, licLen: 14, grain: 0.05 }, P.glacier),
    ice: pre('Quenched ice', { T: 0.05, init: 'random', view: 'lic', warmup: 1400, steps: 8, cores: true, grain: 0.06, contrast: 1.2 }, P.graphite),
    qlr: pre('Quasi-long-range', { T: 0.45, init: 'aligned', seedNoise: 0.12, view: 'licphase', warmup: 500, cores: false, licLen: 16 }, P.harbor),
    twist: pre('Twisted', { T: 0.25, init: 'twist', twistK: 3, view: 'phase', warmup: 300, cyc: 'wrap', grain: 0.08 }, P.kiln),
    gas: pre('Gas of pairs', { T: 0.55, init: 'pairs', nVortices: 10, vortexSep: 0.14, view: 'blend', cores: true, warmup: 250 }, P.bioluminescent),
  };

  Studio.register({
    id: 'xy',
    name: 'XY / Kosterlitz–Thouless',
    tab: 'XY / KT',
    subtitle: 'planar spins, bound vortices and the 1973 unbinding transition',
    order: 58,
    equation: 'H = −J Σ_<ij> cos(θ_i−θ_j);   dθ_i/dt = J Σ_j sin(θ_j−θ_i) + √(2T) η',
    credit: "J. M. Kosterlitz and D. J. Thouless, 'Ordering, metastability and phase transitions in two-dimensional systems', J. Phys. C 6, 1181 (1973). V. L. Berezinskii reached the same unbinding picture in 1971. Nobel Prize in Physics, 2016. The lattice XY Hamiltonian is the classical planar rotor; overdamped Langevin dynamics (model A) is used here so the plate can be watched as it thermalizes.",
    blurb: 'Every site of a square lattice carries an angle, a little arrow that can point anywhere in the plane, and neighboring arrows want to agree. In two dimensions that is not enough to pick a direction: thermal ripples destroy true long-range order at any T > 0. What survives below a critical temperature is subtler — arrows still wander, but slowly, and the defects that would scramble them, vortices and antivortices, stay bound in pairs. Heat the lattice through T_KT ≈ 0.89 J and the pairs unbind. Free vortices roam, correlations collapse exponentially, and the film has melted. That is the Kosterlitz–Thouless transition, the reason a thin superfluid film can still be superfluid, and the reason the phase portrait of this model is a plate of bound charges below T_KT and a plasma above it.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Seeding'],
    hints: {
      Thermodynamics: 'T is measured in units of the coupling J. The square-lattice XY model unbinds near 0.89; 0.6 is a bound-pair liquid with quasi-long-range order, 1.3 is a vortex plasma. An external field h pins a global direction and rounds the transition into a crossover. Diagonal coupling J₂ is a small perturbation unless you push it.',
      Seeding: 'Hot is a fully random quench. Vortex pair is the textbook KT picture: a +1 and a −1, total winding zero so it fits on the torus. A single vortex cannot live on periodic boundaries. Twist lays a uniform winding across the frame and lets it relax.',
      Picture: 'Phase colors the angle. Blend fades disordered regions toward the paper. LIC (line integral convolution) combs the spin field into hair — the print view. Vorticity lights the plaquettes whose winding is ±1. Mark cores if you want the defects drawn on top.',
    },
    palette: true, defaultPalette: 'nightshade', paletteLabel: 'Colors (cyclic phase, then paper)',
    headline: 'T', headlineLabel: 'T / J',

    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024);
      s.T = U.clamp(Number(s.T) || 0, 0, 2.5);
      s.dt = U.clamp(Number(s.dt) || 0.08, 0.01, 0.3);
    },
    surprise(rng) {
      const T = rng.pick([0.05, 0.25, 0.5, 0.62, 0.7, 0.89, 0.89, 1.2, 1.4]);
      const init = T < 0.2 ? rng.pick(['pair', 'random', 'twist']) : rng.pick(['random', 'random', 'pairs', 'aligned']);
      const view = T > 1.0 ? rng.pick(['phase', 'vorticity', 'blend']) : rng.pick(['blend', 'licphase', 'lic', 'phase']);
      return {
        grid: rng.pick([192, 256, 256, 384]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        T, J: 1, J2: rng() < 0.2 ? rng.range(0.1, 0.35) : 0, dt: 0.08, h: rng() < 0.12 ? rng.range(0.05, 0.4) : 0,
        hAngle: rng.int(0, 359),
        init, vortexSep: rng.range(0.14, 0.32), nVortices: rng.int(4, 14), twistK: rng.int(1, 5),
        seedNoise: init === 'aligned' ? rng.range(0.05, 0.2) : rng.range(0, 0.08),
        running: true, steps: rng.int(4, 10), warmup: T < 0.2 ? rng.int(200, 600) : rng.int(300, 1200), stopAfter: 0,
        view, cyc: rng.pick(['wrap', 'wrap', 'hue', 'mirror']), orderW: 2,
        licLen: rng.int(10, 18), licStep: 0.8, cores: view !== 'vorticity' && rng() < 0.35,
        coreSize: 0.35, exposure: rng.range(0.9, 1.2), gamma: rng.range(0.85, 1.2), contrast: rng.range(0.95, 1.25),
        grain: rng.pick([0, 0.06, 0.1, 0.14]),
      };
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

      let simPass, renderPass, reducePass, vortexPass;
      try { simPass = new G.Pass(gl, SIM_FS); renderPass = new G.Pass(gl, RENDER_FS); reducePass = new G.Pass(gl, REDUCE_FS); vortexPass = new G.Pass(gl, VORTEX_FS); }
      catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let pp = null, gw = 0, gh = 0, reduceT = null, ramp = null, rampKey = '';
      const redBuf = new Uint8Array(RED * RED * 4);
      let raf = 0, chunkTimer = 0, stepCount = 0, halted = false, mag = 0, vortices = 0, nOff = 0;

      function sizeOf(s) {
        const n = Number(s.grid) || 256;
        const ar = ASPECTS[s.aspect] || 1;
        let W = n, H = Math.max(64, Math.round(n * ar));
        W &= ~1; H &= ~1;
        return [W, H];
      }
      function ensureGrid(s) {
        const [W, H] = sizeOf(s);
        if (pp && gw === W && gh === H) return;
        if (pp) pp.dispose();
        pp = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'repeat' });
        gw = W; gh = H;
        if (reduceT) reduceT.dispose();
        reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
      }
      function upload(target, f32) {
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        if (texType === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, f32);
        else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.HALF_FLOAT, toHalf(f32));
      }
      function ensureRamp(s) {
        const key = (s.bg || '') + '|' + (s.palette || []).join(',');
        if (ramp && rampKey === key) return;
        if (ramp) ramp.dispose();
        ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key;
      }
      function hexToRgb01(hex) {
        const rgb = U.hexToRgb(hex || '#000000');
        return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
      }
      function uniformsPaint(s) {
        return {
          u_state: pp.read, u_ramp: ramp, u_res: [gw, gh],
          u_view: { int: VIEW[s.view] || 0 }, u_cyc: { int: CYC[s.cyc] || 0 },
          u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
          u_orderW: s.orderW, u_licLen: s.licLen, u_licStep: s.licStep,
          u_cores: s.cores ? 1 : 0, u_coreSize: s.coreSize,
          u_bg: hexToRgb01(s.bg),
        };
      }
      function setFilter(linear) {
        const f = linear ? gl.LINEAR : gl.NEAREST;
        const apply = (t) => {
          gl.bindTexture(gl.TEXTURE_2D, t.tex);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
        };
        apply(pp.read); apply(pp.write);
      }
      function step(n) {
        const s = host.getState();
        setFilter(false);
        const u = {
          u_res: [gw, gh], u_dt: s.dt, u_J: s.J, u_J2: s.J2, u_T: s.T,
          u_h: s.h, u_hAng: s.hAngle * PI / 180, u_nOff: nOff, u_step: 0,
        };
        for (let i = 0; i < n; i++) {
          u.u_state = pp.read;
          u.u_step = (stepCount + i) * 1.173;
          simPass.draw(pp.write, u);
          pp.swap();
        }
        stepCount += n;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        setFilter(true);
        renderPass.draw(target || null, uniformsPaint(s));
      }
      function measure() {
        reducePass.draw(reduceT, { u_state: pp.read, u_res: [gw, gh], u_block: [gw / RED, gh / RED] });
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let c = 0, s = 0, v = 0;
        for (let i = 0; i < RED * RED; i++) {
          c += redBuf[i * 4] / 255 * 2 - 1;
          s += redBuf[i * 4 + 1] / 255 * 2 - 1;
          v += redBuf[i * 4 + 2] / 255;
        }
        mag = Math.hypot(c, s) / (RED * RED);
        vortices = v; // mean fraction of 8×8 cells that contain a core
      }
      function status(extra) {
        const s = host.getState();
        const kt = s.T < 0.75 ? 'bound' : (s.T < 1.02 ? 'near T_KT' : 'unbound');
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          '<span>T/J <b>' + s.T.toFixed(2) + '</b> · ' + kt + '</span>' +
          '<span>|m| <b>' + mag.toFixed(3) + '</b></span>' +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        if (s.stopAfter > 0 && stepCount >= s.stopAfter) { halted = true; status('settled'); return; }
        step(s.steps);
        render();
        if (stepCount % 24 < s.steps) { measure(); status(); }
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion() && !halted) raf = requestAnimationFrame(frame);
        else { measure(); status(!s.running ? 'paused' : halted ? 'settled' : ''); render(); }
      }
      function burst(total) {
        stop();
        let left = total;
        (function chunk() {
          const n = Math.min(40, left); left -= n;
          step(n); render();
          if (left > 0) chunkTimer = setTimeout(chunk, 0);
          else { measure(); status(); startLoop(); }
        })();
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop(); halted = false; stepCount = 0;
          const s = host.getState();
          const rng = U.makeRng(s.seed + '/xy/off');
          nOff = rng.range(0, 800);
          ensureGrid(s);
          upload(pp.read, seedField(s, gw, gh));
          const warm = host.reducedMotion() ? Math.min(s.warmup, 200) : s.warmup;
          if (warm > 0) burst(warm);
          else { render(); measure(); status(); startLoop(); }
        },
        repaint() { if (pp) render(); },
        live(key) {
          if (key === 'running') { halted = false; startLoop(); }
          else if (key === 'T' || key === 'J' || key === 'dt' || key === 'h' || key === 'stopAfter') {
            if (key === 'T' || key === 'stopAfter') halted = false;
            if (!raf) startLoop();
            status();
          }
        },
        resize() { if (pp) render(); },
        pause() { stop(); },
        resume() { if (pp) { render(); startLoop(); } },
        action(key) {
          if (key === 'reseed') this.regenerate();
          else if (key === 'burst') { halted = false; burst(800); }
        },
        disturb(p) {
          if (!pp || !vortexPass) return;
          halted = false;
          const dx = 0.045, a = [p.x - dx, p.yGL], b = [p.x + dx, p.yGL];
          vortexPass.draw(pp.write, { u_state: pp.read, u_res: [gw, gh], u_a: a, u_b: b, u_q1: 1, u_q2: -1 });
          pp.swap(); render(); startLoop();
        },
        async exportPNG(w, h) {
          if (!pp) throw new Error('nothing to export');
          const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
          if (w > max || h > max) throw new Error('larger than this GPU allows (' + max + ' px)');
          const Tgt = new G.Target(gl, w, h, { type: 'rgba8' });
          render(Tgt);
          const px = new Uint8Array(w * h * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, Tgt.fbo);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          Tgt.dispose();
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
          for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
          ctx.putImageData(img, 0, 0);
          return U.toBlob(c);
        },
        exportSVG(ow, oh) {
          const s = host.getState();
          if (s.view !== 'lic') return null;
          if (!pp) throw new Error('nothing to export');
          const W = gw, H = gh;
          const buf = texType === 'rgba32f' ? new Float32Array(W * H * 4) : null;
          if (!buf) throw new Error('SVG export needs float textures');
          gl.bindFramebuffer(gl.FRAMEBUFFER, pp.read.fbo);
          gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, buf);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          const th = (x, y) => {
            const xx = ((Math.floor(x) % W) + W) % W, yy = ((Math.floor(y) % H) + H) % H;
            return buf[(yy * W + xx) * 4] * TAU;
          };
          const VW = ow || 1000, VH = oh || Math.round(VW * (ASPECTS[s.aspect] || 1));
          const sx = VW / W, sy = VH / H;
          const pal = s.palette || ['#000'];
          const ink = pal[0] || '#111';
          const step = Math.max(6, Math.round(Math.min(W, H) / 22));
          const ds = 0.9, nStep = Math.round(Math.min(W, H) * 0.55);
          const sw = (0.7 * Math.min(VW, VH) / 1000).toFixed(2);
          let body = '';
          for (let y = step / 2; y < H; y += step) {
            for (let x = step / 2; x < W; x += step) {
              let px = x, py = y, d = 'M ' + (px * sx).toFixed(1) + ' ' + ((H - py) * sy).toFixed(1);
              for (let k = 0; k < nStep; k++) {
                const t = th(px, py);
                px += Math.cos(t) * ds; py += Math.sin(t) * ds;
                if (px < 0 || py < 0 || px >= W || py >= H) break;
                d += ' L ' + (px * sx).toFixed(1) + ' ' + ((H - py) * sy).toFixed(1);
              }
              body += '<path fill="none" stroke="' + U.svgEsc(ink) + '" stroke-width="' + sw + '" stroke-linecap="round" d="' + d + '"/>\n';
            }
          }
          return U.svgBlob(VW, VH, s.bg || '#fff', body);
        },
      };
    },
  });
})();

