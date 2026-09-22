
/* modules/bec.js */
/* GENChase — the Gross-Pitaevskii equation: an Abrikosov vortex lattice in a rotating condensate, and the vortex tangle of quantum turbulence. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECT = 1;
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
uniform sampler2D u_psi;
uniform vec2 u_res;
uniform float u_dx, u_half, u_g, u_omega, u_dt, u_trap, u_scale;
vec2 coord(vec2 uv){ return (uv - 0.5) * 2.0 * u_half; }
vec2 psiAt(vec2 uv){ return texture(u_psi, uv).rg; }
`;

  // Imaginary time. The equation becomes a damped diffusion, so the ground state is whatever survives:
  // relax, renormalize, repeat. In the rotating frame the Hamiltonian carries -Omega L_z, which is what
  // makes vortices cheaper than the kinetic energy of rigid rotation and so makes them appear at all.
  //
  // Explicit Euler is used here and nowhere near as casually as that sounds. The 5-point Laplacian has
  // symbol on [-8, 0], so the stiffest mode of the kinetic term sits at the grid scale at 4/dx^2 and the
  // step must satisfy dt < 2 over the whole operator's spread, trap and interaction included. The rotation
  // term is first order in space with an imaginary coefficient, so on its own it is unconditionally
  // unstable under forward Euler; it is only the diffusion at the grid scale that damps it, and that
  // holds while Omega * r * k stays below k^2/2, which at the grid scale is Omega < pi/(2 dx r_max).
  // sanitize() computes both bounds and clamps to them.
  const STEP_IM = HEAD + `
void main(){
  vec2 px = 1.0 / u_res;
  vec2 p = psiAt(v_uv);
  vec2 e = psiAt(v_uv + vec2(px.x, 0.0)), w = psiAt(v_uv - vec2(px.x, 0.0));
  vec2 n = psiAt(v_uv + vec2(0.0, px.y)), s = psiAt(v_uv - vec2(0.0, px.y));
  vec2 lap = (e + w + n + s - 4.0 * p) / (u_dx * u_dx);
  vec2 r = coord(v_uv);
  float V = u_trap * 0.5 * dot(r, r);
  float dens = dot(p, p);
  // L_z acting on psi: (x d/dy - y d/dx) psi, central differences in the same units as the Laplacian
  vec2 dpdx = (e - w) / (2.0 * u_dx);
  vec2 dpdy = (n - s) / (2.0 * u_dx);
  vec2 Lz = r.x * dpdy - r.y * dpdx;
  // dpsi/dtau = 0.5 lap - (V + g|psi|^2) psi - i Omega (x d_y - y d_x) psi
  vec2 rhs = 0.5 * lap - (V + u_g * dens) * p + u_omega * vec2(Lz.y, -Lz.x);
  vec2 np = p + u_dt * rhs;
  outColor = vec4(np * u_scale, 0.0, 1.0);
}`;

  // Real time, staggered in the manner of Visscher: the real part is advanced using the imaginary part,
  // then the imaginary part using the real part that was just written. Taking both from the same old
  // state instead is forward Euler on a purely imaginary spectrum, which grows without bound at every
  // wavenumber; staggering is what makes an explicit scheme here conditionally stable and norm-preserving
  // to the order of the scheme.
  const STEP_RE = HEAD + `
uniform int u_part;
void main(){
  vec2 px = 1.0 / u_res;
  vec2 p = psiAt(v_uv);
  vec2 e = psiAt(v_uv + vec2(px.x, 0.0)), w = psiAt(v_uv - vec2(px.x, 0.0));
  vec2 n = psiAt(v_uv + vec2(0.0, px.y)), s = psiAt(v_uv - vec2(0.0, px.y));
  vec2 lap = (e + w + n + s - 4.0 * p) / (u_dx * u_dx);
  vec2 r = coord(v_uv);
  float V = u_trap * 0.5 * dot(r, r);
  float dens = dot(p, p);
  // H psi, with H = -0.5 lap + V + g|psi|^2
  vec2 Hp = -0.5 * lap + (V + u_g * dens) * p;
  vec2 np = p;
  if (u_part == 0) np.x = p.x + u_dt * Hp.y;     // dR/dt = +H I
  else np.y = p.y - u_dt * Hp.x;                 // dI/dt = -H R
  outColor = vec4(np, 0.0, 1.0);
}`;

  const RENDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_psi;
uniform vec2 u_res;
uniform int u_view;
uniform float u_exposure, u_gamma, u_contrast, u_grain, u_hi, u_phaseMix;
uniform vec3 u_bg;
${G.GLSL.hash}
${G.GLSL.ramp}
${G.GLSL.bicubic}
void main(){
  vec4 p4 = texCR4(u_psi, v_uv, u_res);
  vec2 p = p4.rg;
  float dens = dot(p, p) / max(u_hi, 1e-9);
  float ph = atan(p.y, p.x);
  vec3 col;
  if (u_view == 1) {
    // Phase alone. The ramp is not cyclic, so the phase is folded to |phase|/pi: the seam that a
    // straight wrap would leave at +/- pi would read as a line in the plate that is not in the field.
    col = ramp(clamp(abs(ph) / 3.14159265, 0.0, 1.0));
  } else if (u_view == 2) {
    float t = clamp(abs(ph) / 3.14159265, 0.0, 1.0);
    // Zero phase is valid matter, not the empty background. Reserve the upper
    // half of the ramp for phase when density controls opacity.
    col = mix(u_bg, ramp(0.5 + 0.5 * t), clamp(pow(dens, 0.75) * 1.2, 0.0, 1.0));
  } else {
    col = ramp(clamp(dens, 0.0, 1.0));
  }
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  // Phase and density packed into bytes. Reading a float or half-float attachment back is only
  // conditionally supported, and the winding number does not need the precision: eight bits of phase is
  // a fortieth of a radian, against the 2 pi a vortex accumulates. Encoding first makes the vortex hunt
  // work the same on every GPU instead of on the ones that happen to allow the float read.
  const ENCODE_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_psi; uniform float u_hi;
void main(){
  vec2 p = texture(u_psi, v_uv).rg;
  float ph = atan(p.y, p.x) / 6.28318530718 + 0.5;
  float d = clamp(dot(p, p) / max(u_hi, 1e-12), 0.0, 1.0);
  outColor = vec4(ph, sqrt(d), 0.0, 1.0);
}`;

  // The reduction is read back through an 8-bit target, so what it measures has to be scaled into that
  // range or the answer is quantization noise. An absolute density is the wrong quantity to encode: a
  // Thomas-Fermi cloud in a box of half-width nine has a peak density around 0.02, which over a fixed
  // range of 0 to 8 lands on byte value one. The renormalization then reads a norm that is wrong by a
  // factor of ten, shrinks the condensate every stride, and the plate fades to nothing with no error
  // anywhere. Everything here is therefore measured against u_ref, the mean density the seed was
  // normalized to, which is known exactly: one over the area of the box.
  const REDUCE_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_psi; uniform vec2 u_res, u_block; uniform float u_ref;
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float sn = 0.0, mx = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + vec2(x, y) * u_block * 0.125 + 0.5) / u_res;
    vec2 p = texture(u_psi, uv).rg;
    float d = dot(p, p) / max(u_ref, 1e-30);
    sn += d; mx = max(mx, d);
  }
  outColor = vec4(clamp(sn / 64.0, 0.0, 2.0) / 2.0, clamp(mx, 0.0, 8.0) / 8.0, 0.0, 1.0);
}`;

  // The vortex marks are drawn with the 2D canvas API, which cannot be used on the canvas the shell gave
  // this technique: that canvas already holds a WebGL context, and asking it for a 2D one returns null.
  // The marks are drawn offscreen and blitted through this pass instead. The offscreen canvas is
  // top-down and the framebuffer is bottom-up, hence the flip.
  const BLIT_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_tex;
void main(){ outColor = vec4(texture(u_tex, vec2(v_uv.x, 1.0 - v_uv.y)).rgb, 1.0); }`;

  function hexToRgb01(hex) {
    const rgb = U.hexToRgb(hex || '#000000');
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  }

  /* ---------- Vortex Lattice ---------- */
  Studio.register({
    id: 'bec',
    name: 'Vortex Lattice',
    tab: 'Condensate',
    subtitle: 'Gross-Pitaevskii, rotating · 1961',
    order: 12,
    equation: 'iℏ ∂ψ/∂t = [−½∇² + V(r) + g|ψ|² − Ω L_z] ψ,   circulation quantized in units of h/m',
    credit: "The mean-field equation is Eugene Gross, Il Nuovo Cimento 20, 454 (1961), and Lev Pitaevskii, Soviet Physics JETP 13, 451 (1961). That a rotating superfluid answers with a triangular array of singly quantized vortices rather than rigid rotation is Alexei Abrikosov's 1957 result for type-II superconductors, Soviet Physics JETP 5, 1174, carried over to condensates; it was seen in the laboratory by Kirk Madison, Frédéric Chevy, Wendel Wohlleben and Jean Dalibard, Phys. Rev. Lett. 84, 806 (2000), and resolved into a lattice of well over a hundred vortices by Jamil Abo-Shaeer, Chandra Raman, Johnny Vogels and Wolfgang Ketterle, Science 292, 476 (2001). The staggered explicit scheme used in real time follows P. B. Visscher, Computers in Physics 5, 596 (1991). The quantization of circulation is Lars Onsager (1949) and Richard Feynman (1955).",
    blurb: 'A condensate cannot rotate the way a bucket of water does. Its velocity field is the gradient of a phase, so it is irrotational everywhere the wavefunction is non-zero, and the only way to carry angular momentum is to make places where the wavefunction is zero and wind the phase by a whole turn around each of them. Those are vortices, and their circulation is not adjustable: it comes in units of Planck\'s constant over the mass. Spin the trap faster and the condensate does not spin faster, it makes more vortices, and they arrange themselves into the triangular lattice that minimises their mutual energy. This is the same lattice Abrikosov predicted for magnetic flux in a superconductor, and the same one photographed in sodium in 2001. The plate solves the equation and then finds the phase singularities directly, by walking the winding number around every plaquette, so the vortices marked are the ones the field actually has.',
    schema: [
      { group: 'Condensate', key: 'mode', label: 'Evolution', type: 'seg', kind: GEOM, wrap: true,
        options: [['ground', 'Relax to the ground state'], ['turbulence', 'Real time']],
        hint: 'Relaxation runs the equation in imaginary time, which throws away everything but the lowest state, so what is left is the vortex lattice itself. Real time keeps the phase and lets an unrelaxed condensate tangle.' },
      { group: 'Condensate', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[192, '192'], [256, '256'], [320, '320'], [384, '384'], [512, '512'], [768, '768']] },
      RANGE('Condensate', 'omega', 'Rotation Ω', LIVE, 0, 0.95, 0.01, f2, { dimUnless: s => s.mode === 'ground',
        hint: 'In units of the trap frequency. Below about 0.2 the condensate stays vortex-free; above it the number of vortices climbs, and as Ω approaches one the trap stops holding at all.' }),
      RANGE('Condensate', 'g', 'Interaction g', GEOM, 20, 1600, 10, String, { hint: 'Repulsion between atoms. It sets the cloud radius and the healing length, which is the size of a vortex core; a stronger interaction gives a wider cloud with finer cores.' }),
      RANGE('Condensate', 'half', 'Box half-width', GEOM, 4, 16, 0.5, f1),
      RANGE('Condensate', 'trap', 'Trap strength', GEOM, 0.2, 2, 0.05, f2),
      RANGE('Condensate', 'startNoise', 'Seeding noise', GEOM, 0, 0.6, 0.02, f2, {
        hint: 'A perfectly symmetric cloud has nothing to break its symmetry with, so it relaxes to no vortices at all however fast the trap turns. The noise is what lets the lattice nucleate; the seed decides where.' }),
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 60, 1, String),
      RANGE('Simulation', 'dtScale', 'Step fraction', LIVE, 0.1, 1, 0.02, f2, { hint: 'As a fraction of the computed stability bound, which the status line prints. At one the scheme is at its limit and the field will fill with the grid-scale checkerboard; the default leaves margin.' }),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 40000, 500, String),
      { group: 'Simulation', key: 'burst', label: 'Run 4,000 steps', type: 'action' },
      { group: 'Picture', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['density', 'Density'], ['phase', 'Phase'], ['both', 'Density and phase'], ['vortices', 'Vortices']] },
      RANGE('Picture', 'markR', 'Vortex mark', PAINT, 0.2, 4, 0.1, f1, { dimUnless: s => s.view === 'vortices' }),
      RANGE('Picture', 'bond', 'Bond weight', PAINT, 0, 3, 0.1, f1, { dimUnless: s => s.view === 'vortices',
        hint: 'Draws the nearest-neighbor bonds between vortices, which is where the triangular order is visible rather than inferred.' }),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    legacy: { 2: { grid: 256 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      mode: 'ground', grid: 512, omega: 0.75, g: 600, half: 9, trap: 1, startNoise: 0.2,
      running: true, steps: 40, dtScale: 0.35, warmup: 16000,
      view: 'density', markR: 1.2, bond: 0.8,
      exposure: 1, gamma: 1, contrast: 1, grain: 0.03,
      seed: 'abrikosov-1957',
    },
    presets: {
      lattice: pre('Abrikosov lattice', { mode: 'ground', omega: 0.8, g: 700, half: 9, warmup: 18000, view: 'density' }, Pal.nightshade),
      few: pre('A handful of vortices', { mode: 'ground', omega: 0.45, g: 400, half: 8, warmup: 16000, view: 'density' }, Pal.nightshade),
      dense: pre('Fast, and crowded', { mode: 'ground', omega: 0.9, g: 900, half: 11, warmup: 20000, view: 'density' }, Pal.bioluminescent),
      marks: pre('The lattice as points', { mode: 'ground', omega: 0.85, g: 800, half: 10, warmup: 18000, view: 'vortices', markR: 1.4, bond: 1 }, Pal.graphite),
      phase: pre('Phase', { mode: 'ground', omega: 0.8, g: 700, half: 9, warmup: 18000, view: 'both' }, Pal.thermal),
      quiet: pre('No rotation, no vortices', { mode: 'ground', omega: 0, g: 600, half: 9, warmup: 12000, view: 'density' }, Pal.kiln),
      tangle: pre('Real time', { mode: 'turbulence', g: 500, half: 9, startNoise: 0.5, warmup: 4000, view: 'both', steps: 30 }, Pal.ember),
    },
    hints: {
      Condensate: 'Lengths are in oscillator units, so the trap is ½r² and the cloud radius follows from the interaction. The status line prints the step bound it computed and the number of phase singularities it found.',
      Picture: 'Vortices are discrete marks found from the winding number, so that view exports as vectors. Density and phase are fields and stay raster.',
    },
    palette: true, defaultPalette: 'nightshade',
    headline: 'omega', headlineLabel: 'Ω',
    sanitize(s) {
      s.half = U.clamp(Number(s.half) || 9, 4, 16);
      s.omega = U.clamp(Number(s.omega) || 0, 0, 0.95);
    },
    surprise(rng) {
      const mode = rng() < 0.82 ? 'ground' : 'turbulence';
      return {
        mode,
        omega: mode === 'ground' ? rng.pick([0.3, 0.5, 0.65, 0.75, 0.85, 0.9]) : 0,
        g: rng.pick([200, 400, 600, 800, 1200]),
        half: rng.pick([7, 8, 9, 10, 12]),
        trap: rng.range(0.7, 1.3), startNoise: rng.range(0.1, 0.45),
        view: rng.pick(['density', 'density', 'both', 'phase', 'vortices']),
        markR: rng.range(0.8, 2), bond: rng.pick([0, 0.8, 1.2]),
      };
    },
    create(host) {
      const gl = G.createGL(host.canvas);
      const noop = () => {};
      const dead = msg => {
        host.setStatus(msg); host.fault(msg);
        return { aspect: () => ASPECT, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
      };
      if (!gl) return dead('WebGL2 is not available in this browser');
      const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
      if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');
      let imPass, rePass, renderPass, reducePass, encodePass, blitPass;
      let markCanvas = null, markTex = null;
      try {
        imPass = new G.Pass(gl, STEP_IM);
        rePass = new G.Pass(gl, STEP_RE);
        renderPass = new G.Pass(gl, RENDER_FS);
        reducePass = new G.Pass(gl, REDUCE_FS);
        encodePass = new G.Pass(gl, ENCODE_FS);
        blitPass = new G.Pass(gl, BLIT_FS);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let P = null, gw = 0, gh = 0, ramp = null, rampKey = '', reduceT = null, encT = null;
      const redBuf = new Uint8Array(RED * RED * 4);
      let raf = 0, chunkTimer = 0, stepCount = 0, normV = 1, maxV = 1, refDens = 1;
      let vortices = null, psi6 = null, vortAt = -1, bondLen = 0;

      function dxOf(s) { return 2 * s.half / (Number(s.grid) || 256); }

      // Both bounds, computed rather than guessed. The kinetic term's stiffest mode is 4/dx^2; the trap
      // and the interaction add their largest values on top; and the rotation term needs the grid-scale
      // diffusion to dominate it, which is Omega r_max k_max < k_max^2 / 2.
      function bounds(s) {
        const dx = dxOf(s);
        const kin = 4 / (dx * dx);
        const pot = s.trap * 0.5 * 2 * s.half * s.half;
        const inter = s.g * Math.max(maxV, 1e-6);
        const dtOp = 2 / Math.max(1e-6, kin + pot + inter);
        const kMax = Math.PI / dx;
        const dtRot = s.omega > 1e-6 ? (kMax * kMax / 2) / (s.omega * s.half * kMax) * (2 / (kMax * kMax)) : Infinity;
        return { dx, dtOp, dtRot, dt: Math.min(dtOp, dtRot) };
      }
      function dtOf(s) { return bounds(s).dt * s.dtScale; }

      function ensureGrid(s) {
        const n = Number(s.grid) || 256;
        if (P && gw === n) return;
        if (P) P.dispose();
        P = new G.PingPong(gl, n, n, { type: texType, filter: 'nearest', wrap: 'clamp' });
        gw = n; gh = n;
        if (reduceT) reduceT.dispose();
        reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
        if (encT) encT.dispose();
        encT = new G.Target(gl, n, n, { type: 'rgba8', filter: 'nearest' });
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

      // Thomas-Fermi profile times a noisy phase. A perfectly smooth cloud is an exact stationary state of
      // the rotating problem with no vortices in it, and imaginary time will happily keep it: the noise is
      // the symmetry breaking that lets the lattice nucleate, and the seed fixes it.
      function seedField(s) {
        const n = gw, dx = dxOf(s), data = new Float32Array(n * n * 4);
        const rng = U.makeRng(s.seed + '/bec');
        const mu = Math.sqrt(Math.max(s.g, 1) * s.trap / Math.PI);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const x = (i + 0.5 - n / 2) * dx, y = (j + 0.5 - n / 2) * dx;
          const V = s.trap * 0.5 * (x * x + y * y);
          const d = Math.max(0, (mu - V) / Math.max(s.g, 1));
          const amp = Math.sqrt(d);
          const ph = (rng() * 2 - 1) * Math.PI * s.startNoise;
          const jitter = 1 + (rng() * 2 - 1) * s.startNoise * 0.5;
          const o = (j * n + i) * 4;
          data[o] = amp * jitter * Math.cos(ph);
          data[o + 1] = amp * jitter * Math.sin(ph);
          data[o + 3] = 1;
        }
        // Normalize exactly here, on the CPU, so the reference the GPU measurement is scaled against is
        // known rather than estimated: after this the mean density is one over the area of the box.
        let sum = 0;
        for (let i = 0; i < n * n; i++) sum += data[i * 4] * data[i * 4] + data[i * 4 + 1] * data[i * 4 + 1];
        const k = sum > 0 ? 1 / Math.sqrt(sum * dx * dx) : 1;
        for (let i = 0; i < n * n; i++) { data[i * 4] *= k; data[i * 4 + 1] *= k; }
        refDens = 1 / ((2 * s.half) * (2 * s.half));
        return data;
      }

      // Imaginary time does not conserve the norm: it damps every state by exp(-E tau), so left alone the
      // condensate simply fades to nothing and the plate goes black with no error anywhere. The fix is to
      // renormalize, and the cheapest way to do it is to reuse the stepping pass with the time step set to
      // zero, which then does nothing but multiply. Measuring every step would mean a GPU readback every
      // step, so it is done on a stride; the decay over that stride is a few tens of percent, well inside
      // what a single rescale corrects exactly.
      const NORM_EVERY = 32;
      function renormalize(s, base) {
        measure();
        const area = (2 * s.half) * (2 * s.half);
        const integral = normV * area;
        if (!(integral > 1e-12)) return;
        const k = 1 / Math.sqrt(integral);
        if (Math.abs(k - 1) < 1e-6) return;
        imPass.draw(P.write, Object.assign({}, base, { u_psi: P.read, u_omega: 0, u_dt: 0, u_scale: k }));
        P.swap();
      }
      function step(n, fixedDt) {
        const s = host.getState();
        const dt = fixedDt === undefined ? dtOf(s) : fixedDt, dx = dxOf(s);
        const base = { u_res: [gw, gh], u_dx: dx, u_half: s.half, u_g: s.g, u_trap: s.trap, u_dt: dt };
        for (let i = 0; i < n; i++) {
          if (s.mode === 'ground') {
            imPass.draw(P.write, Object.assign({ u_psi: P.read, u_omega: s.omega, u_scale: 1 }, base));
            P.swap();
            if (((stepCount + i + 1) % NORM_EVERY) === 0) renormalize(s, base);
          } else {
            rePass.draw(P.write, Object.assign({ u_psi: P.read, u_omega: 0, u_scale: 1, u_part: { int: 0 } }, base));
            P.swap();
            rePass.draw(P.write, Object.assign({ u_psi: P.read, u_omega: 0, u_scale: 1, u_part: { int: 1 } }, base));
            P.swap();
          }
        }
        stepCount += n;
        vortAt = -1;
      }
      function measure() {
        reducePass.draw(reduceT, { u_psi: P.read, u_res: [gw, gh], u_block: [gw / RED, gh / RED], u_ref: refDens });
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let sn = 0, mx = 0;
        for (let i = 0; i < RED * RED; i++) { sn += (redBuf[i * 4] / 255) * 2; mx = Math.max(mx, (redBuf[i * 4 + 1] / 255) * 8); }
        normV = (sn / (RED * RED)) * refDens;      // mean |psi|^2 over the grid
        maxV = mx * refDens;                        // peak |psi|^2
      }

      // Phase singularities, found by walking the winding number round every plaquette. A vortex is where
      // the phase accumulates a whole turn, so this finds what the field has rather than what the density
      // picture suggests: a low-density dimple that carries no winding is not a vortex and is not marked.
      function findVortices() {
        if (vortAt === stepCount && vortices) return vortices;
        const n = gw, bytes = new Uint8Array(n * n * 4);
        encodePass.draw(encT, { u_psi: P.read, u_hi: Math.max(maxV, 1e-12) });
        gl.bindFramebuffer(gl.FRAMEBUFFER, encT.fbo);
        gl.readPixels(0, 0, n, n, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const ph = new Float32Array(n * n), dens = new Float32Array(n * n);
        let dmax = 1e-12;
        for (let i = 0; i < n * n; i++) {
          ph[i] = (bytes[i * 4] / 255 - 0.5) * TAU;
          const a = bytes[i * 4 + 1] / 255;
          dens[i] = a * a;
          if (dens[i] > dmax) dmax = dens[i];
        }
        // Where to look. The dilute gas outside the cloud has no phase to speak of, and every plaquette out
        // there registers a winding, so it has to be excluded. Excluding by the local density is exactly
        // wrong, though, and cost this tab half its vortices: a vortex core is a density zero, so a
        // threshold that keeps out the vacuum also keeps out the thing being looked for. The mask is
        // therefore the neighborhood maximum, taken separably over a few healing lengths: a core stays
        // inside it because the bulk around it is bright, and the vacuum stays outside because nothing is.
        const RAD = 5;
        const tmpM = new Float32Array(n * n), mask = new Float32Array(n * n);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          let m = 0;
          for (let k = -RAD; k <= RAD; k++) { const x = i + k; if (x < 0 || x >= n) continue; const v = dens[j * n + x]; if (v > m) m = v; }
          tmpM[j * n + i] = m;
        }
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          let m = 0;
          for (let k = -RAD; k <= RAD; k++) { const y = j + k; if (y < 0 || y >= n) continue; const v = tmpM[y * n + i]; if (v > m) m = v; }
          mask[j * n + i] = m;
        }
        const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
        const out = [];
        for (let j = 1; j < n - 2; j++) for (let i = 1; i < n - 2; i++) {
          const a = j * n + i, b = j * n + i + 1, c = (j + 1) * n + i + 1, d = (j + 1) * n + i;
          if (mask[a] < dmax * 0.06) continue;
          // A winding number is necessary but not sufficient. In real time, before the field has smoothed,
          // the phase is uncorrelated at the grid scale and very nearly every plaquette winds: the first
          // pass at this reported sixteen thousand vortices in a condensate that had a few dozen. A vortex
          // is a zero of the wavefunction, so the plaquette must also sit in a density minimum against its
          // own surroundings, which grid-scale phase noise on a smooth density does not.
          if (dens[a] > mask[a] * 0.55) continue;
          const s1 = wrap(ph[b] - ph[a]) + wrap(ph[c] - ph[b]) + wrap(ph[d] - ph[c]) + wrap(ph[a] - ph[d]);
          const wnd = Math.round(s1 / TAU);
          if (wnd !== 0) out.push({ x: (i + 1) / n, y: (j + 1) / n, w: wnd });
        }
        // bond-orientational order: |psi6| is one for a perfect triangular lattice and near zero for a
        // disordered set of points. Six nearest neighbors per vortex, angles taken in the plate's frame.
        psi6 = null;
        if (out.length >= 7) {
          let acc = 0, cnt = 0;
          for (let k = 0; k < out.length; k++) {
            const d2 = [];
            for (let m = 0; m < out.length; m++) {
              if (m === k) continue;
              const dx = out[m].x - out[k].x, dy = out[m].y - out[k].y;
              d2.push([dx * dx + dy * dy, Math.atan2(dy, dx)]);
            }
            d2.sort((p, q) => p[0] - q[0]);
            const use = Math.min(6, d2.length);
            let sr = 0, si = 0;
            for (let m = 0; m < use; m++) { sr += Math.cos(6 * d2[m][1]); si += Math.sin(6 * d2[m][1]); }
            acc += Math.hypot(sr, si) / use; cnt++;
          }
          psi6 = acc / cnt;
        }
        // Bond length, measured rather than assumed. Estimating the lattice spacing from the vortex count
        // and the plate area assumes the vortices fill the plate; they fill the cloud, which is a fraction
        // of it, so that estimate comes out two to three times too long and the bond drawing joins every
        // pair to every other. The median nearest-neighbor distance makes no such assumption.
        bondLen = 0;
        if (out.length > 2) {
          const nn = [];
          for (let k = 0; k < out.length; k++) {
            let best = Infinity;
            for (let m = 0; m < out.length; m++) {
              if (m === k) continue;
              const dx = out[m].x - out[k].x, dy = out[m].y - out[k].y;
              const d = dx * dx + dy * dy;
              if (d < best) best = d;
            }
            if (isFinite(best)) nn.push(Math.sqrt(best));
          }
          nn.sort((a, b) => a - b);
          bondLen = nn.length ? nn[nn.length >> 1] * 1.35 : 0;
        }
        vortices = out; vortAt = stepCount;
        return out;
      }

      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_psi: P.read, u_ramp: ramp, u_res: [gw, gh],
          u_view: { int: { density: 0, phase: 1, both: 2, vortices: 0 }[s.view] || 0 },
          u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
          u_hi: Math.max(maxV, 1e-9), u_phaseMix: 1, u_bg: hexToRgb01(s.bg),
        });
      }

      function drawVortices(c2, w, h) {
        const s = host.getState();
        const list = findVortices();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, w, h);
        const R = Math.max(1, s.markR * w / 500);
        const pal = s.palette || ['#111'];
        if (s.bond > 0 && list.length > 2) {
          c2.strokeStyle = U.inkRgba(s.bg, 0.45);
          c2.lineWidth = Math.max(0.3, s.bond * w / 1400);
          const typ = bondLen;
          c2.beginPath();
          for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
            const dx = list[j].x - list[i].x, dy = list[j].y - list[i].y;
            if (dx * dx + dy * dy > typ * typ) continue;
            c2.moveTo(list[i].x * w, (1 - list[i].y) * h);
            c2.lineTo(list[j].x * w, (1 - list[j].y) * h);
          }
          c2.stroke();
        }
        for (const v of list) {
          c2.fillStyle = v.w > 0 ? pal[0] : pal[Math.min(2, pal.length - 1)];
          c2.beginPath();
          c2.arc(v.x * w, (1 - v.y) * h, R, 0, TAU);
          c2.fill();
        }
      }

      function status(extra) {
        const s = host.getState();
        const b = bounds(s);
        const nv = vortices ? vortices.length : null;
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b> · dx ' + b.dx.toFixed(3) + '</span>' +
          '<span>' + (s.mode === 'ground' ? 'imaginary time · Ω <b>' + s.omega.toFixed(2) + '</b>' : 'real time') + '</span>' +
          '<span>step bound <b>' + b.dt.toExponential(1) + '</b>' + (isFinite(b.dtRot) && b.dtRot < b.dtOp ? ' (set by Ω)' : '') + ' · using ' + dtOf(s).toExponential(1) + '</span>' +
          (nv !== null ? '<span><b>' + nv + '</b> vortices' + (psi6 !== null ? ' · |ψ₆| ' + psi6.toFixed(2) : '') + '</span>' : '') +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function paintAll() {
        const s = host.getState();
        if (s.view !== 'vortices') { render(); return; }
        const w = host.canvas.width, h = host.canvas.height;
        if (!markCanvas) markCanvas = document.createElement('canvas');
        markCanvas.width = w; markCanvas.height = h;
        drawVortices(markCanvas.getContext('2d'), w, h);
        if (!markTex) markTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, markTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, markCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        blitPass.draw(null, { u_tex: { tex: markTex } });
      }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps);
        if (stepCount % 200 < s.steps) measure();
        paintAll();
        if (stepCount % 400 < s.steps) status();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { measure(); findVortices(); paintAll(); status(!s.running ? 'paused' : ''); }
      }
      function burst(total) {
        stop();
        let left = total, batchLeft = 0, batchDt = 0;
        (function chunk() {
          // Preserve the existing 400-step timestep cadence while yielding more often.
          // Recomputing dt every yield would change the numerical trajectory.
          if (!batchLeft) { batchLeft = Math.min(400, left); batchDt = dtOf(host.getState()); }
          const n = Math.min(8, batchLeft); left -= n; batchLeft -= n;
          step(n, batchDt);
          if (left > 0) { if (left % 2000 < 8) { measure(); paintAll(); status('relaxing'); } chunkTimer = setTimeout(chunk, 0); }
          else { measure(); findVortices(); paintAll(); status(); startLoop(); }
        })();
      }

      return {
        // The plate is a simulation grid magnified to print size, so the shell is told the grid: it then
        // renders once at size instead of supersampling and averaging down, which on an already
        // band-limited field is a second low-pass for twice the memory, and it can state on the sheet
        // what the real limit on detail is.
        fieldCells() { return gw && gh ? [gw, gh] : null; },
        aspect() { return ASPECT; },
        regenerate() {
          stop(); stepCount = 0; vortices = null; psi6 = null; vortAt = -1;
          const s = host.getState();
          ensureGrid(s);
          normV = 1; maxV = 1;
          upload(P.read, seedField(s));
          measure();
          paintAll(); // Show the initialized field while the finite warm-up runs.
          const warm = host.reducedMotion() ? Math.min(s.warmup, 2000) : s.warmup;
          if (warm > 0) { status('relaxing'); burst(warm); }
          else { paintAll(); status(); startLoop(); }
        },
        repaint() { if (P) { if (host.getState().view === 'vortices') findVortices(); paintAll(); } },
        live(key) { if (key === 'running') startLoop(); else if (!raf) startLoop(); },
        resize() { if (P) paintAll(); },
        pause() { stop(); },
        resume() { if (P) { paintAll(); startLoop(); } },
        action(key) { if (key === 'burst') burst(4000); },
        async exportPNG(w, h) {
          if (!P) throw new Error('nothing to export');
          const s = host.getState();
          if (s.view === 'vortices') {
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            drawVortices(c.getContext('2d'), w, h);
            return U.toBlob(c);
          }
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
        exportSVG(w, h) {
          const s = host.getState();
          if (s.view !== 'vortices' || !P) throw new Error('raster view');
          const list = findVortices();
          const pal = s.palette || ['#111'];
          const R = Math.max(1, s.markR * w / 500), r2 = v => Math.round(v * 100) / 100;
          let body = '';
          if (s.bond > 0 && list.length > 2) {
            const typ = bondLen;
            body += '<g stroke="' + U.inkFor(s.bg) + '" stroke-opacity="0.45" stroke-width="' + r2(Math.max(0.3, s.bond * w / 1400)) + '">';
            for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
              const dx = list[j].x - list[i].x, dy = list[j].y - list[i].y;
              if (dx * dx + dy * dy > typ * typ) continue;
              body += '<line x1="' + r2(list[i].x * w) + '" y1="' + r2((1 - list[i].y) * h) +
                '" x2="' + r2(list[j].x * w) + '" y2="' + r2((1 - list[j].y) * h) + '"/>';
            }
            body += '</g>';
          }
          for (const v of list) {
            body += '<circle cx="' + r2(v.x * w) + '" cy="' + r2((1 - v.y) * h) + '" r="' + r2(R) +
              '" fill="' + (v.w > 0 ? pal[0] : pal[Math.min(2, pal.length - 1)]) + '"/>';
          }
          return U.svgBlob(w, h, s.bg, body);
        },
      };
    },
  });
})();
