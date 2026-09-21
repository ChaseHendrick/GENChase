
/* modules/tonertu.js */
/* GENChase — Toner-Tu: a polar active fluid, its traveling bands, and the giant number fluctuations measured on the plate. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RED = 32;
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

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
uniform sampler2D u_f;
uniform vec2 u_res;
vec3 F(vec2 uv){ return texture(u_f, uv).rgb; }
`;

  // One explicit step. Three things here are chosen rather than default, and each of them is the
  // difference between a flock and a blown-up field:
  //
  // The continuity equation is written in conservative flux form with an upwind density at each face.
  // Writing it as -rho div v - v . grad rho with centered differences does not conserve mass on the
  // lattice, and the error accumulates where the density is sharpest, which in this model is exactly
  // inside the bands that are the thing being drawn.
  //
  // The advection of velocity by itself is upwinded for the same reason a centered scheme fails on any
  // hyperbolic term: at the grid scale a centered first derivative has zero numerical dissipation and the
  // odd-even modes are free to grow.
  //
  // The self-propulsion coefficient is density dependent. With a constant alpha the model orders
  // uniformly and there is nothing to see; it is the fact that dense regions order and dilute ones do
  // not that makes the ordered phase phase-separate into traveling bands, which is Toner and Tu's point.
  const STEP = HEAD + `
uniform float u_dt, u_dx, u_a0, u_a1, u_beta, u_sigma, u_nu, u_lambda, u_rho0, u_noise, u_step, u_nOff, u_vmax;
${G.GLSL.hash}
void main(){
  vec2 px = 1.0 / u_res;
  vec3 c = F(v_uv);
  vec3 e = F(v_uv + vec2(px.x, 0.0)), w = F(v_uv - vec2(px.x, 0.0));
  vec3 n = F(v_uv + vec2(0.0, px.y)), s = F(v_uv - vec2(0.0, px.y));
  float rho = max(c.r, 1e-4);
  vec2 v = c.gb;

  // conservative upwind fluxes on the four faces
  float vE = 0.5 * (c.g + e.g), vW = 0.5 * (w.g + c.g);
  float vN = 0.5 * (c.b + n.b), vS = 0.5 * (s.b + c.b);
  float fE = vE * (vE > 0.0 ? c.r : e.r);
  float fW = vW * (vW > 0.0 ? w.r : c.r);
  float fN = vN * (vN > 0.0 ? c.r : n.r);
  float fS = vS * (vS > 0.0 ? s.r : c.r);
  float drho = -((fE - fW) + (fN - fS)) / u_dx;

  // upwind (v . grad) v
  vec2 dvdx = v.x > 0.0 ? (c.gb - w.gb) / u_dx : (e.gb - c.gb) / u_dx;
  vec2 dvdy = v.y > 0.0 ? (c.gb - s.gb) / u_dx : (n.gb - c.gb) / u_dx;
  vec2 adv = v.x * dvdx + v.y * dvdy;

  vec2 gradRho = vec2(e.r - w.r, n.r - s.r) / (2.0 * u_dx);
  vec2 lapV = (e.gb + w.gb + n.gb + s.gb - 4.0 * c.gb) / (u_dx * u_dx);

  float alpha = u_a0 + u_a1 * (rho / u_rho0 - 1.0);
  float v2 = dot(v, v);
  vec2 dv = -u_lambda * adv + (alpha - u_beta * v2) * v - u_sigma * gradRho + u_nu * lapV;
  if (u_noise > 0.0) {
    vec2 r2 = vec2(hash21(v_uv * u_res + vec2(u_nOff, u_step)), hash21(v_uv * u_res + vec2(u_nOff + 37.0, u_step))) - 0.5;
    dv += r2 * 2.0 * u_noise;
  }
  float nr = max(rho + u_dt * drho, 1e-4);
  vec2 nv = v + u_dt * dv;
  // A ceiling at the speed the model itself permits, not an arbitrary large number. The local dynamics
  // dv/dt = (alpha - beta v^2) v has its fixed point at sqrt(alpha/beta); a few times that is far outside
  // anything physical, so anything reaching it is a numerical excursion and clamping there keeps one bad
  // cell from driving the step bound for the whole field. A clamp at eight instead let the field sit
  // pinned at the ceiling and still call itself a flock.
  float sp = length(nv);
  if (sp > u_vmax) nv *= u_vmax / sp;
  outColor = vec4(nr, nv, 1.0);
}`;

  const RENDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_f;
uniform vec2 u_res;
uniform int u_view;
uniform float u_lo, u_hi, u_exposure, u_gamma, u_contrast, u_grain, u_rho0, u_streak;
uniform vec3 u_bg;
${G.GLSL.hash}
${G.GLSL.ramp}
${G.GLSL.bicubic}
void main(){
  vec4 c = texCR4(u_f, v_uv, u_res);
  float rho = c.r;
  vec2 v = c.gb;
  float t;
  if (u_view == 1) t = (length(v) - u_lo) / max(u_hi - u_lo, 1e-4);
  else if (u_view == 2) {
    // Heading. The ramp is not cyclic, so the angle is folded to |theta|/pi rather than wrapped: a
    // straight wrap leaves a seam at +/- pi that reads as a line in the flock and is not one.
    t = abs(atan(v.y, v.x)) / 3.14159265;
  } else if (u_view == 3) {
    float d = (rho / u_rho0 - u_lo) / max(u_hi - u_lo, 1e-4);
    float ang = abs(atan(v.y, v.x)) / 3.14159265;
    t = mix(d, ang, u_streak);
  } else t = (rho / u_rho0 - u_lo) / max(u_hi - u_lo, 1e-4);
  t = clamp(t, 0.0, 1.0);
  vec3 col = ramp(t);
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  // Density packed to bytes, so the fluctuation statistics can be taken on the CPU without depending on
  // float readback being supported.
  const ENCODE_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_f; uniform float u_rho0;
void main(){
  vec3 c = texture(u_f, v_uv).rgb;
  outColor = vec4(clamp(c.r / (4.0 * u_rho0), 0.0, 1.0), clamp(length(c.gb) / 4.0, 0.0, 1.0), 0.0, 1.0);
}`;

  const REDUCE_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_f; uniform vec2 u_res, u_block; uniform float u_rho0;
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float sr = 0.0, sv = 0.0;
  vec2 sdir = vec2(0.0);
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + vec2(x, y) * u_block * 0.125 + 0.5) / u_res;
    vec3 c = texture(u_f, uv).rgb;
    sr += c.r / u_rho0; sv += length(c.gb);
    sdir += c.gb;
  }
  outColor = vec4(clamp(sr / 64.0, 0.0, 4.0) / 4.0, clamp(sv / 64.0, 0.0, 4.0) / 4.0,
                  clamp(length(sdir) / 64.0, 0.0, 4.0) / 4.0, 1.0);
}`;

  function hexToRgb01(hex) {
    const rgb = U.hexToRgb(hex || '#000000');
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  }

  /* ---------- Flocking ---------- */
  Studio.register({
    id: 'tonertu',
    name: 'Flocking',
    tab: 'Flock',
    subtitle: 'Toner-Tu, a polar active fluid · 1995',
    order: 37,
    equation: '∂ρ/∂t + ∇·(ρv) = 0;   ∂v/∂t + λ(v·∇)v = (α(ρ) − β|v|²)v − σ∇ρ + ν∇²v + η',
    credit: "John Toner and Yuhai Tu, 'Long-range order in a two-dimensional dynamical XY model: how birds fly together', Physical Review Letters 75, 4326 (1995), and Phys. Rev. E 58, 4828 (1998). The particle model it coarse-grains is Tamás Vicsek, András Czirók, Eshel Ben-Jacob, Inon Cohen and Ofer Shochet, Phys. Rev. Lett. 75, 1226 (1995). That the ordered state phase separates into traveling bands rather than ordering uniformly is Guillaume Grégoire and Hugues Chaté, Phys. Rev. Lett. 92, 025702 (2004), and Chaté, Francesco Ginelli, Grégoire and Franck Raynaud, Phys. Rev. E 77, 046113 (2008). Giant number fluctuations in active matter are Sriram Ramaswamy, R. Aditi Simha and John Toner, Europhysics Letters 62, 196 (2003).",
    blurb: 'A flock is not a fluid at rest that happens to be moving. Every element drives itself, so momentum is not conserved, and that one missing conservation law changes what the system is allowed to do. Toner and Tu wrote down the hydrodynamics of it: a density that is conserved, a velocity that is not, and a term that makes speed relax toward a preferred value rather than toward zero. Two things fall out that no equilibrium fluid does. The ordered state does not order evenly, it breaks into dense traveling bands moving through a dilute disordered sea, because dense regions align and sparse ones do not. And the number of elements in a box fluctuates far more than the square root of the mean, which in an equilibrium system it cannot: count the flock in boxes and the fluctuations are giant. The status line measures that exponent on the plate.',
    schema: [
      { group: 'Flock', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [320, '320'], [512, '512'], [768, '768']] },
      { group: 'Flock', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      RANGE('Flock', 'a0', 'Drive α₀', LIVE, -1, 2, 0.02, f2, { hint: 'The self-propulsion at the mean density. Below zero the flock is disordered everywhere; above it the ordered state exists, and near the crossing is where the bands live.' }),
      RANGE('Flock', 'a1', 'Density coupling α₁', LIVE, 0, 6, 0.05, f2, { hint: 'How much denser regions order more strongly. Set it to zero and the flock orders uniformly with nothing to look at: this term is what makes it band.' }),
      RANGE('Flock', 'beta', 'Saturation β', LIVE, 0.2, 4, 0.05, f2),
      RANGE('Flock', 'sigma', 'Pressure σ', LIVE, 0.05, 3, 0.05, f2),
      RANGE('Flock', 'nu', 'Viscosity ν', LIVE, 0.02, 2, 0.02, f2),
      RANGE('Flock', 'lambda', 'Advection λ', LIVE, 0, 2, 0.05, f2),
      RANGE('Flock', 'noise', 'Noise', LIVE, 0, 0.3, 0.005, f3),
      RANGE('Flock', 'startNoise', 'Initial disorder', GEOM, 0.02, 1, 0.02, f2),
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 12, 1, String),
      RANGE('Simulation', 'dtScale', 'Step fraction', LIVE, 0.1, 1, 0.02, f2, { hint: 'As a fraction of the computed stability bound, which the status line prints. At one the scheme is at its limit; the default leaves margin for the nonlinearity the linear estimate does not see.' }),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 8000, 100, String),
      { group: 'Simulation', key: 'burst', label: 'Run 1,500 steps', type: 'action' },
      { group: 'Picture', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['density', 'Density'], ['speed', 'Order'], ['heading', 'Heading'], ['both', 'Density and heading']] },
      RANGE('Picture', 'streak', 'Heading mix', PAINT, 0, 1, 0.02, f2, { dimUnless: s => s.view === 'both' }),
      RANGE('Picture', 'lo', 'Black point', PAINT, -1, 2, 0.02, f2),
      RANGE('Picture', 'hi', 'White point', PAINT, 0, 4, 0.02, f2),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    legacy: { 2: { grid: 256 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 512, aspect: '1:1',
      a0: 0.3, a1: 1.2, beta: 1, sigma: 0.6, nu: 1.2, lambda: 0.9, noise: 0.03, startNoise: 0.35,
      running: true, steps: 4, dtScale: 0.4, warmup: 2500,
      view: 'density', streak: 0.5, lo: 0, hi: 1.6,
      exposure: 1, gamma: 1, contrast: 1, grain: 0.03,
      seed: 'toner-1995',
    },
    presets: {
      bands: pre('Dense clusters', { a0: 0.12, a1: 1.8, sigma: 0.6, nu: 0.3, noise: 0.03, view: 'density', lo: 0, hi: 1.8, warmup: 3000 }, Pal.thermal),
      ordered: pre('Ordered, and even', { a0: 0.9, a1: 0.2, sigma: 0.5, nu: 0.4, noise: 0.02, view: 'heading', lo: 0, hi: 1, warmup: 2500 }, Pal.harbor),
      disordered: pre('Below the transition', { a0: -0.3, a1: 1.4, sigma: 0.5, nu: 0.3, noise: 0.08, view: 'speed', lo: 0, hi: 0.8, warmup: 2000 }, Pal.graphite),
      turbulent: pre('Active turbulence', { a0: 0.6, a1: 2.4, sigma: 1.2, nu: 0.12, lambda: 1.4, noise: 0.05, view: 'both', streak: 0.45, lo: 0, hi: 2, warmup: 3500 }, Pal.nightshade),
      sparse: pre('Sparse and clumped', { a0: 0.05, a1: 3, sigma: 0.35, nu: 0.25, noise: 0.04, view: 'density', lo: 0, hi: 2.6, warmup: 3500 }, Pal.ember),
      wide: pre('A wide sky, where bands can run', { a0: 0.12, a1: 1.8, sigma: 0.6, nu: 0.3, noise: 0.03, view: 'density', lo: 0, hi: 1.8, warmup: 3000, aspect: '16:9' }, Pal.glacier),
      heading: pre('Heading alone', { a0: 0.4, a1: 1.2, sigma: 0.5, nu: 0.5, noise: 0.03, view: 'heading', lo: 0, hi: 1, warmup: 2500 }, Pal.risograph),
    },
    hints: {
      Flock: 'Density is measured against its mean, which is conserved exactly by the flux form of the continuity equation. The status line prints the step bound it computed and the number-fluctuation exponent it measured.',
      Picture: 'A continuous field with no geometry to emit, so the export is raster and stays raster.',
    },
    palette: true, defaultPalette: 'thermal',
    headline: 'a1', headlineLabel: 'α₁',
    sanitize(s) {
      s.startNoise = U.clamp(Number(s.startNoise) || 0.35, 0.02, 1);
    },
    surprise(rng) {
      return {
        a0: rng.range(-0.2, 0.8), a1: rng.range(0.6, 3.2), beta: rng.range(0.6, 1.6),
        sigma: rng.range(0.25, 1.4), nu: rng.range(0.1, 0.8), lambda: rng.range(0.4, 1.5),
        noise: rng.range(0.01, 0.09), startNoise: rng.range(0.15, 0.7),
        view: rng.pick(['density', 'density', 'heading', 'speed', 'both']),
        streak: rng.range(0.2, 0.8), lo: 0, hi: rng.range(1.2, 2.6),
        aspect: rng.pick(['1:1', '1:1', '5:4', '3:2', '16:9']),
      };
    },
    create(host) {
      const gl = G.createGL(host.canvas);
      const noop = () => {};
      const dead = msg => {
        host.setStatus(msg); host.fault(msg);
        return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
      };
      if (!gl) return dead('WebGL2 is not available in this browser');
      const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
      if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');
      let stepPass, renderPass, reducePass, encodePass, splatPass;
      try {
        stepPass = new G.Pass(gl, STEP);
        renderPass = new G.Pass(gl, RENDER_FS);
        reducePass = new G.Pass(gl, REDUCE_FS);
        encodePass = new G.Pass(gl, ENCODE_FS);
        splatPass = new G.Pass(gl, G.GLSL.splatFS);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      const RHO0 = 1, DX = 1;
      let P = null, gw = 0, gh = 0, ramp = null, rampKey = '', reduceT = null, encT = null;
      const redBuf = new Uint8Array(RED * RED * 4);
      let raf = 0, chunkTimer = 0, stepCount = 0, nOff = 0;
      let meanRho = 1, meanSpeed = 0, order = 0, gnf = null;

      // Two bounds, both computed. The viscous term is diffusion on the 5-point stencil, whose symbol runs
      // over [-8, 0], so an explicit step needs dt < 2/(8 nu / dx^2). The pressure term together with the
      // continuity equation is a wave system of speed sqrt(sigma rho), which with the advection speed gives
      // the usual Courant condition dt < dx/(|v| + c). The step is the smaller of the two, times a margin,
      // because neither estimate sees the cubic saturation term.
      // The largest self-propulsion the density field can reach, and the speed that goes with it. Density
      // in a banded state runs to a few times the mean, so this is taken against that rather than against
      // the mean, which would leave the bands themselves outside the bound that was computed for them.
      function scales(s) {
        const rhoPeak = Math.max(meanRho * 3, 1);
        const alphaMax = Math.max(s.a0 + s.a1 * (rhoPeak / RHO0 - 1), 0.05);
        const vEq = Math.sqrt(alphaMax / Math.max(s.beta, 1e-3));
        return { alphaMax, vEq, vmax: 3 * vEq };
      }
      function bounds(s) {
        const k = scales(s);
        const dtVisc = 2 / Math.max(1e-6, 8 * s.nu / (DX * DX));
        const c = Math.sqrt(Math.max(s.sigma * Math.max(meanRho, 0.1), 1e-9));
        const speed = Math.max(meanSpeed, k.vEq, 0.2);
        const dtCfl = DX / Math.max(1e-6, (1 + s.lambda) * speed + c);
        // The cubic saturation is the term the linear estimates do not see, and at large speed it is the
        // tightest of the three: linearising (alpha - beta v^2) v about the clamp gives a rate
        // |alpha - 3 beta vmax^2|, and forward Euler needs twice its reciprocal.
        const dtReact = 2 / Math.max(1e-6, Math.abs(k.alphaMax - 3 * s.beta * k.vmax * k.vmax));
        return { dtVisc, dtCfl, dtReact, dt: Math.min(dtVisc, dtCfl, dtReact) * 0.8 };
      }
      const dtOf = s => bounds(s).dt * s.dtScale;

      function sizeOf(s) {
        const n = Number(s.grid) || 256, ar = ASPECTS[s.aspect] || 1;
        return [n & ~1, Math.max(64, Math.round(n * ar)) & ~1];
      }
      function ensureGrid(s) {
        const [W, H] = sizeOf(s);
        if (P && gw === W && gh === H) return;
        if (P) { P.dispose(); if (encT) encT.dispose(); }
        P = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'repeat' });
        gw = W; gh = H;
        if (reduceT) reduceT.dispose();
        reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
        encT = new G.Target(gl, W, H, { type: 'rgba8', filter: 'nearest' });
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
      function seedField(s) {
        const rng = U.makeRng(s.seed + '/tonertu');
        const data = new Float32Array(gw * gh * 4);
        for (let i = 0; i < gw * gh; i++) {
          const th = rng() * U.TAU, sp = s.startNoise * rng();
          data[i * 4] = RHO0 * (1 + (rng() * 2 - 1) * s.startNoise * 0.4);
          data[i * 4 + 1] = sp * Math.cos(th);
          data[i * 4 + 2] = sp * Math.sin(th);
          data[i * 4 + 3] = 1;
        }
        return data;
      }
      function step(n) {
        const s = host.getState();
        const dt = dtOf(s);
        for (let i = 0; i < n; i++) {
          stepPass.draw(P.write, {
            u_f: P.read, u_res: [gw, gh], u_dt: dt, u_dx: DX,
            u_a0: s.a0, u_a1: s.a1, u_beta: s.beta, u_sigma: s.sigma, u_nu: s.nu, u_lambda: s.lambda,
            u_rho0: RHO0, u_noise: s.noise, u_step: (stepCount + i) * 1.17, u_nOff: nOff,
            u_vmax: scales(s).vmax,
          });
          P.swap();
        }
        stepCount += n;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_f: P.read, u_ramp: ramp, u_res: [gw, gh],
          u_view: { int: { density: 0, speed: 1, heading: 2, both: 3 }[s.view] || 0 },
          u_lo: s.lo, u_hi: s.hi, u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast,
          u_grain: s.grain, u_rho0: RHO0, u_streak: s.streak, u_bg: hexToRgb01(s.bg),
        });
      }
      function measure() {
        reducePass.draw(reduceT, { u_f: P.read, u_res: [gw, gh], u_block: [gw / RED, gh / RED], u_rho0: RHO0 });
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let sr = 0, sv = 0, sd = 0;
        for (let i = 0; i < RED * RED; i++) {
          sr += (redBuf[i * 4] / 255) * 4;
          sv += (redBuf[i * 4 + 1] / 255) * 4;
          sd += (redBuf[i * 4 + 2] / 255) * 4;
        }
        meanRho = (sr / (RED * RED)) * RHO0;
        meanSpeed = sv / (RED * RED);
        order = meanSpeed > 1e-6 ? Math.min(1, (sd / (RED * RED)) / meanSpeed) : 0;
      }

      // Giant number fluctuations. Count the field in square boxes of several sizes; for each size take the
      // mean count and the standard deviation across boxes, then fit log(deltaN) against log(N). An
      // equilibrium system with short-ranged correlations gives one half, by the central limit theorem.
      // Anything reliably above that is the claim this tab is making, and it is measured here rather than
      // asserted, from the density on the plate.
      function fitGNF() {
        gnf = null;
        if (!P || !encT) return;
        encodePass.draw(encT, { u_f: P.read, u_rho0: RHO0 });
        const bytes = new Uint8Array(gw * gh * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, encT.fbo);
        gl.readPixels(0, 0, gw, gh, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const rho = new Float64Array(gw * gh);
        for (let i = 0; i < gw * gh; i++) rho[i] = (bytes[i * 4] / 255) * 4 * RHO0;
        const pts = [];
        for (let b = 4; b <= Math.min(gw, gh) / 4; b *= 2) {
          const nx = Math.floor(gw / b), ny = Math.floor(gh / b);
          if (nx * ny < 16) break;
          let sum = 0, sum2 = 0, cnt = 0;
          for (let by = 0; by < ny; by++) for (let bx = 0; bx < nx; bx++) {
            let N = 0;
            for (let y = 0; y < b; y++) { const row = (by * b + y) * gw + bx * b; for (let x = 0; x < b; x++) N += rho[row + x]; }
            sum += N; sum2 += N * N; cnt++;
          }
          const m = sum / cnt, v = Math.max(0, sum2 / cnt - m * m);
          if (m > 1e-6 && v > 0) pts.push([Math.log(m), Math.log(Math.sqrt(v))]);
        }
        if (pts.length < 3) return;
        let sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
        const n = pts.length, den = n * sxx - sx * sx;
        if (Math.abs(den) > 1e-9) gnf = (n * sxy - sx * sy) / den;
      }

      function status(extra) {
        const s = host.getState();
        const b = bounds(s);
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          '<span>order <b>' + order.toFixed(2) + '</b> · mean speed ' + meanSpeed.toFixed(2) + '</span>' +
          '<span>step bound <b>' + b.dt.toFixed(3) + '</b> (' +
            (b.dtReact <= b.dtCfl && b.dtReact <= b.dtVisc ? 'saturation' : b.dtCfl <= b.dtVisc ? 'Courant' : 'viscous') +
            ') · using ' + dtOf(s).toFixed(3) + '</span>' +
          (gnf !== null ? '<span>ΔN ~ N<sup>' + gnf.toFixed(2) + '</sup> (equilibrium: 0.50)</span>' : '') +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps); render();
        if (stepCount % 64 < s.steps) { measure(); status(); }
        if (stepCount % 512 < s.steps) fitGNF();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { measure(); fitGNF(); status(!s.running ? 'paused' : ''); render(); }
      }
      function burst(total) {
        stop();
        let left = total;
        (function chunk() {
          const n = Math.min(60, left); left -= n;
          step(n); render();
          if (left > 0) chunkTimer = setTimeout(chunk, 0);
          else { measure(); fitGNF(); status(); startLoop(); }
        })();
      }

      return {
        // The plate is a simulation grid magnified to print size, so the shell is told the grid: it then
        // renders once at size instead of supersampling and averaging down, which on an already
        // band-limited field is a second low-pass for twice the memory, and it can state on the sheet
        // what the real limit on detail is.
        fieldCells() { return gw && gh ? [gw, gh] : null; },
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop(); stepCount = 0; gnf = null;
          const s = host.getState();
          nOff = U.makeRng(s.seed + '/tonertu/off').range(0, 900);
          ensureGrid(s);
          meanRho = RHO0; meanSpeed = 0.2;
          upload(P.read, seedField(s));
          const warm = host.reducedMotion() ? Math.min(s.warmup, 400) : s.warmup;
          if (warm > 0) burst(warm);
          else { render(); measure(); status(); startLoop(); }
        },
        repaint() { if (P) render(); },
        live(key) { if (key === 'running') startLoop(); else if (!raf) startLoop(); },
        resize() { if (P) render(); },
        pause() { stop(); },
        resume() { if (P) { render(); startLoop(); } },
        action(key) { if (key === 'burst') burst(1500); },
        disturb(p) {
          if (!P) return;
          splatPass.draw(P.write, {
            u_src: P.read, u_pos: [p.x, p.yGL],
            u_add: [0.8, (p.dx || 0) * 6, -(p.dy || 0) * 6, 0], u_rad: 0.05, u_amt: 1, u_mode: { int: 1 },
          });
          P.swap(); render(); startLoop();
        },
        async exportPNG(w, h) {
          if (!P) throw new Error('nothing to export');
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
