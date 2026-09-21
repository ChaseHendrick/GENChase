
/* modules/nematic.js */
/* GENChase — Active nematics: Beris–Edwards Q-tensor + frictional Stokes, ±1/2 defects · 2010s. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU, PI = Math.PI;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const VIEW = { schlieren: 0, director: 1, orient: 2, order: 3, defects: 4, flow: 5, mix: 6 };
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

  const HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
`;

  /* Force from active stress σ^A = −ζ Q. In 2D, Q = [[q,p],[p,−q]],
     ∇·Q = (∂x q + ∂y p, ∂x p − ∂y q). f = −ζ ∇·Q. .b stores ∇·f for the Poisson. */
  const FORCE_FS = HEAD + `
uniform sampler2D u_Q; uniform vec2 u_res; uniform float u_zeta;
void main(){
  vec2 px = 1.0 / u_res;
  vec4 L = texture(u_Q, v_uv - vec2(px.x, 0.0)), R = texture(u_Q, v_uv + vec2(px.x, 0.0));
  vec4 B = texture(u_Q, v_uv - vec2(0.0, px.y)), T = texture(u_Q, v_uv + vec2(0.0, px.y));
  float dqx = 0.5 * (R.r - L.r), dpx = 0.5 * (R.g - L.g);
  float dqy = 0.5 * (T.r - B.r), dpy = 0.5 * (T.g - B.g);
  vec2 f = -u_zeta * vec2(dqx + dpy, dpx - dqy);
  outColor = vec4(f, 0.0, 1.0);
}`;

  const DIV_FS = HEAD + `
uniform sampler2D u_f; uniform vec2 u_res;
void main(){
  vec2 px = 1.0 / u_res;
  float L = texture(u_f, v_uv - vec2(px.x, 0.0)).x, R = texture(u_f, v_uv + vec2(px.x, 0.0)).x;
  float B = texture(u_f, v_uv - vec2(0.0, px.y)).y, T = texture(u_f, v_uv + vec2(0.0, px.y)).y;
  outColor = vec4(0.5 * ((R - L) + (T - B)), 0.0, 0.0, 1.0);
}`;

  const PRESSURE_FS = HEAD + `
uniform sampler2D u_prs, u_div; uniform vec2 u_res;
void main(){
  vec2 px = 1.0 / u_res;
  float L = texture(u_prs, v_uv - vec2(px.x, 0.0)).x, R = texture(u_prs, v_uv + vec2(px.x, 0.0)).x;
  float B = texture(u_prs, v_uv - vec2(0.0, px.y)).x, T = texture(u_prs, v_uv + vec2(0.0, px.y)).x;
  outColor = vec4(0.25 * (L + R + B + T - texture(u_div, v_uv).x), 0.0, 0.0, 1.0);
}`;

  const VEL_FS = HEAD + `
uniform sampler2D u_f, u_prs; uniform vec2 u_res; uniform float u_gamma;
void main(){
  vec2 px = 1.0 / u_res;
  float L = texture(u_prs, v_uv - vec2(px.x, 0.0)).x, R = texture(u_prs, v_uv + vec2(px.x, 0.0)).x;
  float B = texture(u_prs, v_uv - vec2(0.0, px.y)).x, T = texture(u_prs, v_uv + vec2(0.0, px.y)).x;
  vec2 f = texture(u_f, v_uv).xy - 0.5 * vec2(R - L, T - B);
  outColor = vec4(f / max(u_gamma, 0.05), 0.0, 1.0);
}`;

  /* Beris–Edwards: Γ H + vorticity co-rotation + λ strain, then semi-Lagrangian advection.
     H = α (1 − 4|Q|²/S0²) Q + K ∇²Q. 2D co-rotation: Ḋ = −2Ω p, ṗ = 2Ω q. */
  const Q_FS = HEAD + `
uniform sampler2D u_Q, u_vel;
uniform vec2 u_res;
uniform float u_dt, u_Gamma, u_K, u_S0, u_lambda, u_noise, u_step, u_nOff;
${G.GLSL.hash}
float gauss(vec2 p){
  float a = max(hash21(p), 1.0e-6), b = hash21(p + 17.3);
  return sqrt(-2.0 * log(a)) * cos(6.28318530718 * b);
}
void main(){
  vec2 px = 1.0 / u_res;
  vec2 u = texture(u_vel, v_uv).xy;
  vec2 back = v_uv - u * u_dt * px;
  vec2 qp = texture(u_Q, back).rg;
  float q = qp.x, p = qp.y;
  float lapq = texture(u_Q, v_uv + vec2(px.x, 0.0)).r + texture(u_Q, v_uv - vec2(px.x, 0.0)).r
             + texture(u_Q, v_uv + vec2(0.0, px.y)).r + texture(u_Q, v_uv - vec2(0.0, px.y)).r - 4.0 * texture(u_Q, v_uv).r;
  float lapp = texture(u_Q, v_uv + vec2(px.x, 0.0)).g + texture(u_Q, v_uv - vec2(px.x, 0.0)).g
             + texture(u_Q, v_uv + vec2(0.0, px.y)).g + texture(u_Q, v_uv - vec2(0.0, px.y)).g - 4.0 * texture(u_Q, v_uv).g;
  float r2 = q * q + p * p;
  float seq2 = max(u_S0 * u_S0 * 0.25, 1.0e-6);
  float land = 1.0 - r2 / seq2;
  float hq = land * q + u_K * lapq;
  float hp = land * p + u_K * lapp;
  vec2 uxL = texture(u_vel, v_uv - vec2(px.x, 0.0)).xy, uxR = texture(u_vel, v_uv + vec2(px.x, 0.0)).xy;
  vec2 uyB = texture(u_vel, v_uv - vec2(0.0, px.y)).xy, uyT = texture(u_vel, v_uv + vec2(0.0, px.y)).xy;
  float duxdx = 0.5 * (uxR.x - uxL.x), duydx = 0.5 * (uxR.y - uxL.y);
  float duxdy = 0.5 * (uyT.x - uyB.x), duydy = 0.5 * (uyT.y - uyB.y);
  float Omega = 0.5 * (duydx - duxdy);
  float Exx = duxdx, Exy = 0.5 * (duydx + duxdy);
  vec2 nse = vec2(gauss(v_uv * u_res + vec2(u_nOff, u_step)), gauss(v_uv * u_res + vec2(u_nOff + 9.1, u_step + 3.7)));
  q += u_dt * (u_Gamma * hq - 2.0 * Omega * p + u_lambda * Exx) + u_noise * nse.x * sqrt(max(u_dt, 1e-6));
  p += u_dt * (u_Gamma * hp + 2.0 * Omega * q + u_lambda * Exy) + u_noise * nse.y * sqrt(max(u_dt, 1e-6));
  float r = sqrt(q * q + p * p), rmax = u_S0 * 0.65;
  if (r > rmax) { q *= rmax / r; p *= rmax / r; }
  outColor = vec4(q, p, 0.0, 1.0);
}`;

  const DEFECT_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_Q;
uniform vec2 u_res, u_pos;
uniform float u_S0, u_charge;
void main(){
  vec2 qp = texture(u_Q, v_uv).rg;
  vec2 d = (v_uv - u_pos) * u_res;
  float r = length(d);
  float th = u_charge * atan(d.y, d.x);
  float S = u_S0 * tanh(r / 3.2);
  vec2 qn = 0.5 * S * vec2(cos(2.0 * th), sin(2.0 * th));
  float w = smoothstep(14.0, 2.0, r);
  outColor = vec4(mix(qp, qn, w), 0.0, 1.0);
}`;

  const RENDER_FS = HEAD + `
uniform sampler2D u_Q, u_vel;
uniform vec2 u_res;
uniform int u_view;
uniform float u_exposure, u_gamma, u_contrast, u_grain, u_polar, u_licLen, u_licStep, u_cores, u_coreSize, u_S0, u_flowAmt;
uniform vec3 u_bg;
${G.GLSL.hash}
${G.GLSL.ramp}
const float TAU = 6.28318530718;
const float PI = 3.14159265359;
vec2 QP(vec2 uv){ return texture(u_Q, uv).rg; }
float wrap(float a){ return mod(a + PI, TAU) - PI; }
float theta(vec2 qp){ return 0.5 * atan(qp.y, qp.x); }
float charge(vec2 uv, vec2 px){
  float t00 = theta(QP(uv));
  float t10 = theta(QP(uv + vec2(px.x, 0.0)));
  float t11 = theta(QP(uv + px));
  float t01 = theta(QP(uv + vec2(0.0, px.y)));
  return (wrap(t10 - t00) + wrap(t11 - t10) + wrap(t01 - t11) + wrap(t00 - t01)) / TAU;
}
vec3 hsv(float h, float s, float v){
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1.0), rgb, s);
}
float lic(vec2 uv, vec2 px, bool flow){
  float acc = 0.0, wsum = 0.0;
  float L = clamp(u_licLen, 4.0, 28.0);
  float ds = u_licStep * min(px.x, px.y);
  for (int dir = 0; dir < 2; dir++) {
    vec2 p = uv;
    float sgn = dir == 0 ? 1.0 : -1.0;
    for (int i = 0; i < 28; i++) {
      if (float(i) > L) break;
      vec2 v;
      if (flow) v = texture(u_vel, p).xy;
      else { float t = theta(QP(p)); v = vec2(cos(t), sin(t)); }
      float ln = length(v); if (ln > 1e-6) v /= ln;
      float k = 1.0 - float(i) / L;
      float n = hash21(floor(p / px) + 0.5);
      acc += n * k; wsum += k;
      p += v * ds * sgn;
    }
  }
  return acc / max(wsum, 1e-4);
}
void main(){
  vec2 px = 1.0 / u_res;
  vec2 qp = QP(v_uv);
  float q = qp.x, p = qp.y;
  float r2 = q * q + p * p;
  float S = 2.0 * sqrt(r2);
  float Sn = clamp(S / max(u_S0, 1e-4), 0.0, 1.2);
  float th = theta(qp);
  vec3 col;
  if (u_view == 0 || u_view == 6) {
    float phi = u_polar * PI / 180.0;
    float c2 = cos(2.0 * phi), s2 = sin(2.0 * phi);
    float nd = (q * c2 + p * s2) / max(sqrt(r2), 1e-5);
    float I = clamp(1.0 - nd * nd, 0.0, 1.0) * smoothstep(0.02, 0.35, Sn);
    col = mix(u_bg, ramp(I), I);
  } else if (u_view == 1) {
    float L = lic(v_uv, px, false);
    L = pow(clamp((L - 0.5) * u_contrast + 0.5, 0.0, 1.0), u_gamma);
    col = mix(u_bg, ramp(L), 0.2 + 0.8 * L * smoothstep(0.05, 0.5, Sn));
  } else if (u_view == 2) {
    float t01 = fract(th / PI);
    col = mix(u_bg, hsv(t01, 0.62, 0.92), smoothstep(0.05, 0.45, Sn));
  } else if (u_view == 3) {
    col = ramp(pow(clamp(Sn, 0.0, 1.0), u_gamma));
  } else if (u_view == 4) {
    float w = charge(v_uv, px);
    float a = smoothstep(0.12, 0.42, abs(w));
    vec3 pos = ramp(0.92), neg = ramp(0.08);
    col = mix(u_bg, w >= 0.0 ? pos : neg, a);
  } else {
    float spd = length(texture(u_vel, v_uv).xy);
    float L = lic(v_uv, px, true);
    float v = clamp(spd * 1.8, 0.0, 1.0) * (0.35 + 0.65 * L);
    col = mix(u_bg, ramp(pow(v, u_gamma)), clamp(v, 0.0, 1.0));
  }
  if (u_view == 6) {
    float spd = length(texture(u_vel, v_uv).xy);
    col += ramp(0.7) * spd * u_flowAmt * 0.55;
  }
  if (u_cores > 0.5 && u_view != 4) {
    float w = charge(v_uv, px);
    float d = length(fract(v_uv * u_res) - 0.5);
    float mark = smoothstep(u_coreSize, u_coreSize * 0.3, d) * smoothstep(0.15, 0.4, abs(w));
    vec3 mk = w > 0.0 ? ramp(0.95) : ramp(0.05);
    col = mix(col, mk, mark);
  }
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.71) - 0.5) * u_grain * 0.35, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  const REDUCE_FS = HEAD + `
uniform sampler2D u_Q; uniform vec2 u_res, u_block;
const float TAU = 6.28318530718;
const float PI = 3.14159265359;
float wrap(float a){ return mod(a + PI, TAU) - PI; }
float th(vec2 uv){ vec2 qp = texture(u_Q, uv).rg; return 0.5 * atan(qp.y, qp.x); }
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float ssum = 0.0, def = 0.0;
  vec2 px = 1.0 / u_res;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + vec2(x, y) * u_block * 0.125 + 0.5) / u_res;
    vec2 qp = texture(u_Q, uv).rg;
    ssum += 2.0 * length(qp);
    float t00 = th(uv), t10 = th(uv + vec2(px.x, 0.0)), t11 = th(uv + px), t01 = th(uv + vec2(0.0, px.y));
    float w = abs(wrap(t10 - t00) + wrap(t11 - t10) + wrap(t01 - t11) + wrap(t00 - t01)) / TAU;
    if (w > 0.25) def += 1.0;
  }
  outColor = vec4(ssum / 64.0, def / 64.0, 0.0, 1.0);
}`;

  function minImage(d, n) { d = d % n; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d; }

  function seedField(s, W, H) {
    const rng = U.makeRng(s.seed + '/nematic');
    const data = new Float32Array(W * H * 4);
    const S0 = s.S0, xi = Math.max(1.5, s.coreXi);
    const defects = [];
    const addPair = (ax, ay, bx, by, psi) => {
      defects.push({ x: ax, y: ay, q: 0.5, psi: psi || 0 });
      defects.push({ x: bx, y: by, q: -0.5, psi: 0 });
    };
    if (s.init === 'pair') {
      const sep = s.defectSep * Math.min(W, H);
      addPair(W * 0.5 - sep * 0.5, H * 0.5, W * 0.5 + sep * 0.5, H * 0.5, s.pairAngle * PI / 180);
    } else if (s.init === 'pairs' || s.init === 'lattice') {
      const n = Math.max(1, Math.round(s.nDefects));
      if (s.init === 'lattice') {
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        for (let i = 0; i < n; i++) {
          const gx = (i % cols + 0.35) / cols, gy = (Math.floor(i / cols) + 0.5) / rows;
          addPair(gx * W, gy * H, (gx + 0.28 / cols) * W, gy * H, rng.range(0, TAU));
        }
      } else {
        for (let i = 0; i < n; i++) {
          const ax = rng.range(0.1, 0.9) * W, ay = rng.range(0.1, 0.9) * H;
          const a = rng.range(0, TAU), d = s.defectSep * Math.min(W, H) * rng.range(0.5, 1.2);
          addPair(ax, ay, ax + Math.cos(a) * d, ay + Math.sin(a) * d, rng.range(0, TAU));
        }
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let th = 0, Sm = S0;
      if (s.init === 'aligned') {
        th = s.alignAngle * PI / 180 + (rng() - 0.5) * TAU * s.seedNoise;
      } else if (s.init === 'bands') {
        th = (x / W > 0.5 ? 0 : PI / 2) + (rng() - 0.5) * TAU * s.seedNoise;
      } else if (s.init === 'random') {
        th = rng() * PI;
        Sm = S0 * (0.75 + 0.25 * rng());
      } else {
        let cx = 0, cy = 0;
        for (const d of defects) {
          const dx = minImage(x + 0.5 - d.x, W), dy = minImage(y + 0.5 - d.y, H);
          const r = Math.hypot(dx, dy);
          th += d.q * Math.atan2(dy, dx) + (d.q > 0 ? d.psi : 0);
          Sm *= Math.tanh(r / xi);
        }
        th += (rng() - 0.5) * TAU * s.seedNoise;
      }
      const qv = 0.5 * Sm * Math.cos(2 * th);
      const pv = 0.5 * Sm * Math.sin(2 * th);
      const j = (y * W + x) * 4;
      data[j] = qv; data[j + 1] = pv; data[j + 3] = 1;
    }
    return data;
  }

  const SCHEMA = [
    { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512'], [768, '768'], [1024, '1024']] },
    { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },

    RANGE('Activity', 'zeta', 'Activity ζ', LIVE, -8, 8, 0.1, f1, {
      hint: 'σ^A = −ζ Q. ζ > 0 is extensile (microtubule–kinesin): +½ defects self-propel and the film goes turbulent. ζ < 0 is contractile (actomyosin): defects tend to stall and pair. ζ = 0 is a passive liquid crystal.' }),
    RANGE('Activity', 'gamma', 'Friction γ', LIVE, 0.2, 4, 0.05, f2, {
      hint: 'Substrate friction in the overdamped force balance γ u = −∇P − ζ ∇·Q. Lower γ means faster flow for the same activity.' }),
    RANGE('Activity', 'lambda', 'Flow alignment λ', LIVE, 0, 2, 0.05, f2, {
      hint: 'λ ≳ 1: rods align with extension (flow-aligning). λ < 1: they tumble in shear. Microtubules sit near 1.' }),

    RANGE('Nematic', 'K', 'Elastic K', LIVE, 0.05, 1.2, 0.02, f2, {
      hint: 'One-constant Frank elasticity. The defect core size is ξ ∼ √K. Larger K, fatter cores, fewer defects.' }),
    RANGE('Nematic', 'Gamma', 'Relaxation Γ', LIVE, 0.1, 2, 0.05, f2),
    RANGE('Nematic', 'S0', 'Equilibrium order S₀', LIVE, 0.4, 1.6, 0.02, f2),
    RANGE('Nematic', 'noise', 'Thermal noise', LIVE, 0, 0.08, 0.002, f3),

    { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
      options: [['random', 'Quench'], ['aligned', 'Aligned'], ['pair', '+½ −½ pair'], ['pairs', 'Gas of pairs'], ['lattice', 'Lattice'], ['bands', 'Bands']] },
    RANGE('Seeding', 'nDefects', 'Number of pairs', GEOM, 1, 16, 1, String, { dimUnless: s => s.init === 'pairs' || s.init === 'lattice' }),
    RANGE('Seeding', 'defectSep', 'Pair separation', GEOM, 0.08, 0.45, 0.01, pct, { dimUnless: s => s.init === 'pair' || s.init === 'pairs' || s.init === 'lattice' }),
    RANGE('Seeding', 'pairAngle', 'Comet angle', GEOM, 0, 180, 5, deg, { dimUnless: s => s.init === 'pair' }),
    RANGE('Seeding', 'alignAngle', 'Director angle', GEOM, 0, 180, 1, deg, { dimUnless: s => s.init === 'aligned' }),
    RANGE('Seeding', 'coreXi', 'Core width ξ', GEOM, 1.5, 6, 0.1, f1, { dimUnless: s => s.init === 'pair' || s.init === 'pairs' || s.init === 'lattice' }),
    RANGE('Seeding', 'seedNoise', 'Seed jitter', GEOM, 0, 0.25, 0.01, pct),

    { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
    RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 8, 1, String),
    RANGE('Simulation', 'dt', 'Time step', LIVE, 0.08, 0.8, 0.02, f2),
    RANGE('Simulation', 'iters', 'Poisson iterations', LIVE, 8, 40, 2, String),
    RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 4000, 50, String),
    { group: 'Simulation', key: 'burst', label: 'Run 400 steps', type: 'action' },
    { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },

    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true,
      options: [['schlieren', 'Schlieren'], ['director', 'Director LIC'], ['mix', 'Schlieren + flow'], ['orient', 'Orientation'], ['order', 'Order S'], ['defects', 'Defects'], ['flow', 'Flow']] },
    RANGE('Picture', 'polar', 'Polarizer angle', PAINT, 0, 90, 1, deg, { dimUnless: s => s.view === 'schlieren' || s.view === 'mix' }),
    RANGE('Picture', 'licLen', 'LIC length', PAINT, 4, 24, 1, String, { dimUnless: s => s.view === 'director' || s.view === 'flow' }),
    RANGE('Picture', 'licStep', 'LIC step', PAINT, 0.4, 1.6, 0.05, f2, { dimUnless: s => s.view === 'director' || s.view === 'flow' }),
    RANGE('Picture', 'flowAmt', 'Flow tint', PAINT, 0, 1, 0.02, pct, { dimUnless: s => s.view === 'mix' }),
    { group: 'Picture', key: 'cores', label: 'Mark ±½ cores', type: 'toggle', kind: PAINT },
    RANGE('Picture', 'coreSize', 'Core size', PAINT, 0.15, 0.7, 0.02, f2, { dimUnless: s => s.cores }),
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
    RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
    RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
    RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
  ];

  const DEFAULTS = {
    grid: 512, aspect: '1:1',
    zeta: 2.4, gamma: 1, lambda: 0.9,
    K: 0.45, Gamma: 0.8, S0: 1, noise: 0.006,
    init: 'pairs', nDefects: 4, defectSep: 0.22, pairAngle: 0, alignAngle: 25, coreXi: 2.8, seedNoise: 0.04,
    running: true, steps: 2, dt: 0.35, iters: 16, warmup: 160,
    view: 'director', polar: 0, licLen: 14, licStep: 0.85, flowAmt: 0.35, cores: true, coreSize: 0.38,
    exposure: 1, gamma: 1, contrast: 1.08, grain: 0.06,
    seed: 'dogic-2012',
  };

  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const PRESETS = {
    extensile: pre('Extensile turbulence', { zeta: 3.2, init: 'random', view: 'schlieren', warmup: 400, cores: false, grain: 0.08 }, Pal.graphite),
    contractile: pre('Contractile', { zeta: -2.4, init: 'random', view: 'schlieren', warmup: 350, lambda: 0.7, grain: 0.08 }, Pal.harbor),
    pair: pre('+½ −½ pair', { zeta: 2.2, init: 'pair', defectSep: 0.28, view: 'director', cores: true, warmup: 80, licLen: 14, K: 0.45 }, Pal.glacier),
    fluorescence: pre('Fluorescence', { zeta: 3.0, init: 'random', view: 'orient', warmup: 400, cores: true, grain: 0.06 }, Pal.bioluminescent),
    schlieren: pre('Polarized light', { zeta: 1.6, init: 'aligned', seedNoise: 0.12, view: 'schlieren', polar: 0, warmup: 250, cores: false }, Pal.xray),
    mix: pre('Schlieren + flow', { zeta: 3.4, init: 'pairs', nDefects: 6, view: 'mix', flowAmt: 0.45, cores: true, warmup: 200 }, Pal.thermal),
    quiescent: pre('Quiescent', { zeta: 0, init: 'bands', view: 'schlieren', warmup: 120, cores: false, grain: 0.05 }, Pal.petri),
    turbulentLIC: pre('Director hair', { zeta: 3.6, init: 'random', view: 'director', warmup: 500, licLen: 16, grain: 0.05 }, Pal.nightshade),
  };

  Studio.register({
    id: 'nematic',
    name: 'Active Nematics',
    tab: 'Nematics',
    subtitle: 'self-driven rods, ±½ defects and active turbulence · 2012',
    order: 59,
    equation: '∂tQ + u·∇Q − S(Ω,E,Q) = Γ H,   H = [α − β|Q|²]Q + K∇²Q,   γu = −∇P − ζ ∇·Q',
    credit: "Continuum active nematohydrodynamics: Aditi Simha and Ramaswamy (2002); Beris–Edwards Q-tensor hydrodynamics. The experimental archetype is the microtubule–kinesin active gel of Sanchez, Chen, DeCamp, Heymann and Dogic, Nature 2012. Defect statistics and active turbulence: Giomi, PRL / Phys. Rev. X 2015; Doostmohammadi, Ignés-Mullol, Yeomans and Sagués, Nat. Commun. 2018. Flow here is the frictional (substrate) Stokes limit, incompressible: γ u = −∇P − ζ ∇·Q.",
    blurb: 'A nematic liquid crystal is a fluid of rods that share a direction but not a head. In two dimensions that direction can only break in two kinds of defect: a comet-shaped +½ and a trefoil −½. Give the rods an engine — kinesin motors walking microtubules apart, or myosin pulling actin — and the stress they generate is not isotropic. Extensile rods push out along their axis. The +½ defect, which looks like a comet, has a built-in arrow and self-propels; the −½ is a three-fold sink and mostly sits. When the activity is high enough the pairs unbind and the film becomes a two-dimensional turbulence whose vortices are topological defects, not eddies of inertia. That is an active nematic. The picture is the one from the microscope: crossed polarizers (schlieren) or a comb of the director field.',
    schema: SCHEMA,
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Seeding', 'Nematic'],
    hints: {
      Activity: 'ζ is the only number that turns a liquid crystal into an engine. Positive is extensile (the Dogic film, most bacteria); negative is contractile (cell cortex). Friction γ sets how hard the substrate holds the flow. λ is whether shear aligns or tumbles the rods.',
      Nematic: 'K is Frank elasticity in the one-constant approximation; it sets the core size. Γ is how fast the Q-tensor relaxes to its Landau–de Gennes minimum. Thermal noise nucleates extra pairs — useful if a quench came out too clean.',
      Picture: 'Schlieren is crossed polarizers: two dark brushes around every ±½ core (in 3D, ±1 defects show four). Director LIC combs the rods. Mark cores if you want the defects named on the plate.',
    },
    palette: true, defaultPalette: 'graphite', paletteLabel: 'Colors (paper → bright)',
    headline: 'zeta', headlineLabel: 'activity ζ',

    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024);
      s.zeta = U.clamp(Number(s.zeta) || 0, -10, 10);
      s.dt = U.clamp(Number(s.dt) || 0.35, 0.05, 1);
    },
    surprise(rng) {
      const z = rng.pick([0, 1.4, 2.4, 2.8, 3.4, 3.4, -1.8, -2.6]);
      const init = Math.abs(z) < 0.2 ? rng.pick(['aligned', 'bands']) : rng.pick(['random', 'random', 'pairs', 'pair']);
      const view = rng.pick(['schlieren', 'schlieren', 'director', 'mix', 'orient']);
      return {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        zeta: z, gamma: rng.range(0.7, 1.4), lambda: rng.range(0.5, 1.3),
        K: rng.range(0.22, 0.55), Gamma: rng.range(0.5, 1.1), S0: rng.range(0.85, 1.15),
        noise: rng.pick([0, 0.004, 0.01]),
        init, nDefects: rng.int(3, 10), defectSep: rng.range(0.14, 0.3), pairAngle: rng.int(0, 180),
        alignAngle: rng.int(0, 180), coreXi: rng.range(2, 4), seedNoise: rng.range(0.03, 0.12),
        running: true, steps: rng.int(1, 3), dt: 0.35, iters: 16, warmup: rng.int(150, 500),
        view, polar: rng.pick([0, 0, 22, 45]), licLen: rng.int(10, 16), licStep: 0.85,
        flowAmt: rng.range(0.2, 0.55), cores: view !== 'defects' && rng() < 0.4, coreSize: 0.38,
        exposure: rng.range(0.9, 1.2), gamma: rng.range(0.85, 1.2), contrast: rng.range(0.95, 1.25),
        grain: rng.pick([0, 0.06, 0.1]),
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

      let forcePass, divPass, prsPass, velPass, qPass, renderPass, reducePass, defectPass;
      try {
        forcePass = new G.Pass(gl, FORCE_FS);
        divPass = new G.Pass(gl, DIV_FS);
        prsPass = new G.Pass(gl, PRESSURE_FS);
        velPass = new G.Pass(gl, VEL_FS);
        qPass = new G.Pass(gl, Q_FS);
        renderPass = new G.Pass(gl, RENDER_FS);
        reducePass = new G.Pass(gl, REDUCE_FS);
        defectPass = new G.Pass(gl, DEFECT_FS);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let Q = null, vel = null, forceT = null, divT = null, prs = null;
      let gw = 0, gh = 0, ramp = null, rampKey = '';
      const redBuf = new Uint8Array(RED * RED * 4);
      let reduceT = null, raf = 0, chunkTimer = 0, stepCount = 0, nOff = 0, meanS = 0, defFrac = 0;

      function sizeOf(s) {
        const n = Number(s.grid) || 192;
        const ar = ASPECTS[s.aspect] || 1;
        let W = n, H = Math.max(64, Math.round(n * ar));
        return [W & ~1, H & ~1];
      }
      function makePP(W, H, filter) {
        return new G.PingPong(gl, W, H, { type: texType, filter: filter || 'linear', wrap: 'repeat' });
      }
      function makeT(W, H, filter) {
        return new G.Target(gl, W, H, { type: texType, filter: filter || 'linear', wrap: 'repeat' });
      }
      function ensureGrid(s) {
        const [W, H] = sizeOf(s);
        if (Q && gw === W && gh === H) return;
        if (Q) { Q.dispose(); vel.dispose(); forceT.dispose(); divT.dispose(); prs.dispose(); }
        Q = makePP(W, H);
        vel = makeT(W, H);
        forceT = makeT(W, H, 'nearest');
        divT = makeT(W, H, 'nearest');
        prs = makePP(W, H, 'nearest');
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
      function hydro(s) {
        forcePass.draw(forceT, { u_Q: Q.read, u_res: [gw, gh], u_zeta: s.zeta });
        divPass.draw(divT, { u_f: forceT, u_res: [gw, gh] });
        const n = Math.max(4, s.iters | 0);
        for (let i = 0; i < n; i++) {
          prsPass.draw(prs.write, { u_prs: prs.read, u_div: divT, u_res: [gw, gh] });
          prs.swap();
        }
        velPass.draw(vel, { u_f: forceT, u_prs: prs.read, u_res: [gw, gh], u_gamma: s.gamma });
      }
      function step(n) {
        const s = host.getState();
        for (let i = 0; i < n; i++) {
          hydro(s);
          qPass.draw(Q.write, {
            u_Q: Q.read, u_vel: vel, u_res: [gw, gh],
            u_dt: s.dt, u_Gamma: s.Gamma, u_K: s.K, u_S0: s.S0, u_lambda: s.lambda,
            u_noise: s.noise, u_step: (stepCount + i) * 1.19, u_nOff: nOff,
          });
          Q.swap();
        }
        stepCount += n;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_Q: Q.read, u_vel: vel, u_ramp: ramp, u_res: [gw, gh],
          u_view: { int: VIEW[s.view] || 0 },
          u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
          u_polar: s.polar, u_licLen: s.licLen, u_licStep: s.licStep,
          u_cores: s.cores ? 1 : 0, u_coreSize: s.coreSize, u_S0: s.S0, u_flowAmt: s.flowAmt,
          u_bg: hexToRgb01(s.bg),
        });
      }
      function measure() {
        reducePass.draw(reduceT, { u_Q: Q.read, u_res: [gw, gh], u_block: [gw / RED, gh / RED] });
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let ssum = 0, dsum = 0;
        for (let i = 0; i < RED * RED; i++) {
          ssum += redBuf[i * 4] / 255;
          dsum += redBuf[i * 4 + 1] / 255;
        }
        meanS = ssum / (RED * RED);
        defFrac = dsum / (RED * RED);
      }
      function status(extra) {
        const s = host.getState();
        const kind = s.zeta > 0.15 ? 'extensile' : (s.zeta < -0.15 ? 'contractile' : 'passive');
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          '<span>ζ <b>' + s.zeta.toFixed(1) + '</b> · ' + kind + '</span>' +
          '<span>S̄ <b>' + meanS.toFixed(2) + '</b></span>' +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps);
        render();
        if (stepCount % 16 < s.steps) { measure(); status(); }
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { measure(); status(!s.running ? 'paused' : ''); render(); }
      }
      function burst(total) {
        stop();
        let left = total;
        (function chunk() {
          const n = Math.min(24, left); left -= n;
          step(n); render();
          if (left > 0) chunkTimer = setTimeout(chunk, 0);
          else { measure(); status(); startLoop(); }
        })();
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop(); stepCount = 0;
          const s = host.getState();
          const rng = U.makeRng(s.seed + '/nematic/off');
          nOff = rng.range(0, 800);
          ensureGrid(s);
          upload(Q.read, seedField(s, gw, gh));
          vel.clear(0, 0, 0, 1); prs.read.clear(0, 0, 0, 1);
          hydro(s);
          const warm = host.reducedMotion() ? Math.min(s.warmup, 80) : s.warmup;
          if (warm > 0) burst(warm);
          else { render(); measure(); status(); startLoop(); }
        },
        repaint() { if (Q) render(); },
        live(key) {
          if (key === 'running') startLoop();
          else if (!raf) startLoop();
        },
        resize() { if (Q) render(); },
        pause() { stop(); },
        resume() { if (Q) { render(); startLoop(); } },
        action(key) {
          if (key === 'reseed') this.regenerate();
          else if (key === 'burst') burst(400);
        },
        disturb(p) {
          if (!Q || !defectPass) return;
          const s = host.getState();
          defectPass.draw(Q.write, { u_Q: Q.read, u_res: [gw, gh], u_pos: [p.x, p.yGL], u_S0: s.S0, u_charge: 0.5 });
          Q.swap(); hydro(s); render(); startLoop();
        },
        async exportPNG(w, h) {
          if (!Q) throw new Error('nothing to export');
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
      };
    },
  });
})();

