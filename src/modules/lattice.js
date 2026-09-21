
/* modules/lattice.js */
/* Statistical physics on the square lattice: Ising Metropolis, the Abelian sandpile, cyclic and Greenberg-Hastings automata, site and bond percolation. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RED = 32;
  const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
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
  function hex01(hex) { const rgb = U.hexToRgb(hex || '#000000'); return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]; }

  // Grid schema entries shared by the GPU tabs; cells stay isotropic: W = grid, H = round(grid * aspect).
  const GRID = [
    { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512']] },
    { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
  ];
  function gridSize(s) {
    const n = Number(s.grid) || 256, ar = ASPECTS[s.aspect] || 1;
    return [n & ~1, Math.max(64, Math.round(n * ar)) & ~1];
  }
  function simFields(label) {
    return [
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', label, LIVE, 1, 8, 1, String),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 1500, 25, String),
      { group: 'Simulation', key: 'burst', label: 'Run 300 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },
    ];
  }
  function toneFields() {
    return [
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ];
  }

  const HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
`;
  // Per-site random numbers for the GPU: an integer hash of (site, tick) where tick = seed offset + step index.
  // The shared float hash21 loses bits once its inputs pass a few thousand, and a Metropolis acceptance test is
  // sensitive to that, so this one mixes 32-bit integers (lowbias32) and is exact for any step count.
  const HASH_U = `
uint uhash(uint x){ x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u; return x; }
float siteHash(ivec2 site, int t){
  uint h = uhash(uint(site.x + 65536) * 0x9E3779B1u + uhash(uint(site.y + 65536) * 0x85EBCA77u + uhash(uint(t + 1048576))));
  return (float(h >> 8u) + 0.5) / 16777216.0;
}
`;
  const TONE = `
vec3 tone(vec3 col, float exposure, float gamma, float contrast, float grain){
  col = pow(clamp(col, 0.0, 1.0), vec3(gamma)) * exposure;
  col = clamp((col - 0.5) * contrast + 0.5, 0.0, 1.0);
  if (grain > 0.0) col = clamp(col + (siteHash(ivec2(gl_FragCoord.xy), 977) - 0.5) * grain * 0.4, 0.0, 1.0);
  return col;
}
`;
  // Block reduce: .r = 0.5 + 0.5 * mean of channel r (clamped to -1..1), .g = mean of channel b (0..1).
  const REDUCE_FS = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res, u_block;
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float sm = 0.0, sb = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + vec2(x, y) * u_block * 0.125 + 0.5) / u_res;
    vec4 v = texture(u_c, uv);
    sm += v.r; sb += v.b;
  }
  outColor = vec4(0.5 + 0.5 * clamp(sm / 64.0, -1.0, 1.0), clamp(sb / 64.0, 0.0, 1.0), 0.0, 1.0);
}`;

  // WebGL2 context plus the rgba32f / rgba16f selection every GPU tab makes. Returns null when WebGL2 is missing.
  function gpuInit(host) {
    const gl = G.createGL(host.canvas);
    if (!gl) return null;
    const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
    if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');
    const upload = (target, f32) => {
      gl.bindTexture(gl.TEXTURE_2D, target.tex);
      if (texType === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, f32);
      else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.HALF_FLOAT, toHalf(f32));
    };
    return { gl, texType, upload };
  }
  function deadInstance(host, msg) {
    host.setStatus(msg);
    host.fault(msg);
    const noop = () => {};
    return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
  }
  // Render the display pass into a w x h target and hand back a PNG blob of exactly that size.
  async function gpuExport(gl, w, h, render) {
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
  }
  // Read the reduce target back: mean of channel r (-1..1) and mean of channel b (0..1).
  function gpuMeasure(gl, reducePass, reduceT, src, gw, gh, buf) {
    reducePass.draw(reduceT, { u_c: src, u_res: [gw, gh], u_block: [gw / RED, gh / RED] });
    gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
    gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let sm = 0, sb = 0;
    for (let i = 0; i < RED * RED; i++) { sm += (buf[i * 4] / 255) * 2 - 1; sb += buf[i * 4 + 1] / 255; }
    return { mean: sm / (RED * RED), act: sb / (RED * RED) };
  }

  // CPU still plates: a cell buffer painted with nearest-neighbor scaling so cells stay crisp on screen and in print.
  function nearestBlit(ctx, buf, w, h, bg) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(buf, 0, 0, w, h);
  }
  function crispExport(buf, w, h) { return U.toBlob(U.upscale(buf, w, h, false)); }
  function grainImage(img, amt, seed) {
    if (!(amt > 0)) return;
    const rng = U.makeRng(seed + '/grain'), d = img.data, a = amt * 24;
    for (let i = 0; i < d.length; i += 4) { const n = (rng() - 0.5) * a; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  }
  function lutColor(lut, t) {
    const li = (U.clamp(t, 0, 1) * 255 | 0) * 3;
    return [lut[li], lut[li + 1], lut[li + 2]];
  }

  /* ---------- Ising Model ---------- */
  const T_C = 2 / Math.log(1 + Math.SQRT2);
  const ISING_STEP = HEAD + `
uniform sampler2D u_s; uniform vec2 u_res;
uniform int u_parity, u_tick, u_hMode;
uniform float u_T, u_h, u_bands;
${HASH_U}
float sg(float v){ return v >= 0.0 ? 1.0 : -1.0; }
void main(){
  ivec2 site = ivec2(gl_FragCoord.xy);
  float s = sg(texture(u_s, v_uv).r);
  if (((site.x + site.y) & 1) != u_parity) { outColor = vec4(s, 0.0, 0.0, 1.0); return; }
  vec2 px = 1.0 / u_res;
  float nb = sg(texture(u_s, v_uv + vec2(px.x, 0.0)).r) + sg(texture(u_s, v_uv - vec2(px.x, 0.0)).r)
           + sg(texture(u_s, v_uv + vec2(0.0, px.y)).r) + sg(texture(u_s, v_uv - vec2(0.0, px.y)).r);
  float h = u_h;
  if (u_hMode == 1) h *= sg(sin(6.28318530718 * u_bands * v_uv.x));
  else if (u_hMode == 2) h *= 2.0 * v_uv.x - 1.0;
  else if (u_hMode == 3) h *= sg(sin(6.28318530718 * u_bands * v_uv.x) * sin(6.28318530718 * u_bands * v_uv.y * u_res.y / u_res.x));
  float dE = 2.0 * s * (nb + h);
  float r = siteHash(site, u_tick);
  if (dE <= 0.0 || r < exp(-dE / u_T)) s = -s;
  outColor = vec4(s, 0.0, 0.0, 1.0);
}`;
  const ISING_BLUR = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res; uniform float u_amt;
void main(){
  vec2 px = 1.0 / u_res;
  float c = texture(u_c, v_uv).r;
  float avg = (4.0 * c + texture(u_c, v_uv + vec2(px.x, 0.0)).r + texture(u_c, v_uv - vec2(px.x, 0.0)).r
             + texture(u_c, v_uv + vec2(0.0, px.y)).r + texture(u_c, v_uv - vec2(0.0, px.y)).r) / 8.0;
  outColor = vec4(mix(c, avg, u_amt), 0.0, 0.0, 1.0);
}`;
  const ISING_RENDER = HEAD + `
uniform sampler2D u_s, u_m; uniform vec2 u_res;
uniform int u_view; uniform bool u_pixel;
uniform float u_lo, u_hi, u_wall, u_exposure, u_gamma, u_contrast, u_grain;
${HASH_U}
${G.GLSL.ramp}
${TONE}
float sg(float v){ return v >= 0.0 ? 1.0 : -1.0; }
float bil(sampler2D t, vec2 uv){
  vec2 p = uv * u_res - 0.5; vec2 i = floor(p), f = fract(p);
  float a = texture(t, (i + 0.5) / u_res).r, b = texture(t, (i + vec2(1.5, 0.5)) / u_res).r;
  float c = texture(t, (i + vec2(0.5, 1.5)) / u_res).r, d = texture(t, (i + 1.5) / u_res).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main(){
  vec2 px = 1.0 / u_res;
  float span = max(u_hi - u_lo, 1e-4), t;
  if (u_view == 0) {
    t = (sg(texture(u_s, v_uv).r) - u_lo) / span;
  } else if (u_view == 1) {
    float m = u_pixel ? texture(u_m, v_uv).r : bil(u_m, v_uv);
    t = (m - u_lo) / span;
  } else if (u_view == 2) {
    float gx = 0.5 * (texture(u_m, v_uv + vec2(px.x, 0.0)).r - texture(u_m, v_uv - vec2(px.x, 0.0)).r);
    float gy = 0.5 * (texture(u_m, v_uv + vec2(0.0, px.y)).r - texture(u_m, v_uv - vec2(0.0, px.y)).r);
    t = length(vec2(gx, gy)) * u_wall;
  } else {
    float s = sg(texture(u_s, v_uv).r);
    float nb = sg(texture(u_s, v_uv + vec2(px.x, 0.0)).r) + sg(texture(u_s, v_uv - vec2(px.x, 0.0)).r)
             + sg(texture(u_s, v_uv + vec2(0.0, px.y)).r) + sg(texture(u_s, v_uv - vec2(0.0, px.y)).r);
    t = (4.0 - s * nb) / 8.0;
  }
  vec3 col = ramp(clamp(t, 0.0, 1.0));
  outColor = vec4(tone(col, u_exposure, u_gamma, u_contrast, u_grain), 1.0);
}`;
  const ISING_VIEWS = { spins: 0, mag: 1, walls: 2, energy: 3 };
  const ISING_HMODES = { uniform: 0, stripes: 1, gradient: 2, checks: 3 };
  function isingSeed(s, W, H) {
    const rng = U.makeRng(s.seed + '/ising');
    const data = new Float32Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v;
      if (s.init === 'cold') v = 1;
      else if (s.init === 'split') v = x < W / 2 ? 1 : -1;
      else v = rng() < 0.5 ? 1 : -1;
      data[(y * W + x) * 4] = v;
      data[(y * W + x) * 4 + 3] = 1;
    }
    return data;
  }
  Studio.register({
    id: 'ising',
    name: 'Ising Model',
    tab: 'Ising',
    subtitle: 'Metropolis Monte Carlo on the square lattice · 1925',
    order: 98,
    equation: 'E = −J Σ⟨ij⟩ sᵢsⱼ − h Σᵢ sᵢ,   P(flip) = min(1, e^{−ΔE/T}),   T_c = 2/ln(1+√2) ≈ 2.269',
    credit: "Ernst Ising, Z. Phys. 31, 253 (1925); Lars Onsager, Phys. Rev. 65, 117 (1944); Nicholas Metropolis, Arianna W. Rosenbluth, Marshall N. Rosenbluth, Augusta H. Teller and Edward Teller, J. Chem. Phys. 21, 1087 (1953). Ising solved the chain and found no transition. Onsager solved the square lattice exactly and found one at T_c = 2/ln(1+√2). The Metropolis algorithm samples the Boltzmann distribution by proposing single flips and accepting them with probability min(1, exp(−ΔE/T)). Here the lattice is updated as a checkerboard: two half-sweeps per step, each parity with its neighbors held fixed, so the GPU can flip every site of one color at once.",
    blurb: 'Every site is a spin, up or down, and each one would rather agree with its four neighbors. Temperature is the argument against. Well below T_c the plate is nearly all one color with the odd flipped island; well above it is salt and pepper. At T_c itself, the critical point, there are islands inside islands at every size, which is why the critical plate has no scale you can point to. Quench from hot to cold and watch the domains coarsen, walls straightening and shrinking, the same picture Cahn-Hilliard paints with a conserved field. An external field h tips the balance; paint it in stripes and the spins print the stripes.',
    schema: GRID.concat([
      RANGE('Model', 'T', 'Temperature T', LIVE, 0.5, 5, 0.01, f2, {
        hint: 'In units of J/k_B. T_c ≈ 2.269. Below: ordered domains. Above: disorder. At T_c: fluctuations at every scale.' }),
      RANGE('Model', 'h', 'Field h', LIVE, -2, 2, 0.02, f2, { hint: 'External field per spin. Positive favors up. Zero at the transition keeps the symmetry.' }),
      { group: 'Model', key: 'hMode', label: 'Field shape', type: 'seg', kind: LIVE, wrap: true,
        options: [['uniform', 'Uniform'], ['stripes', 'Stripes'], ['gradient', 'Gradient'], ['checks', 'Checks']] },
      RANGE('Model', 'bands', 'Bands', LIVE, 1, 12, 1, String, { dimUnless: s => s.hMode === 'stripes' || s.hMode === 'checks' }),
      { group: 'Model', key: 'init', label: 'Start', type: 'seg', kind: GEOM, options: [['hot', 'Hot'], ['cold', 'Cold'], ['split', 'Split']],
        hint: 'Hot is random spins (a quench when T is low). Cold is all up. Split is two halves.' },
    ]).concat(simFields('Sweeps per frame')).concat([
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true,
        options: [['spins', 'Spins'], ['mag', 'Magnetization'], ['walls', 'Domain walls'], ['energy', 'Bond energy']] },
      RANGE('Picture', 'blur', 'Blur passes', PAINT, 0, 16, 1, String, { dimUnless: s => s.view === 'mag' || s.view === 'walls',
        hint: 'Jacobi averaging of the spin field before the magnetization and wall views.' }),
      RANGE('Picture', 'lo', 'Black point', PAINT, -2, 1, 0.02, f2),
      RANGE('Picture', 'hi', 'White point', PAINT, 0, 2, 0.02, f2),
      RANGE('Picture', 'wall', 'Wall gain', PAINT, 0.3, 4, 0.05, f2, { dimUnless: s => s.view === 'walls' }),
      { group: 'Picture', key: 'pixelate', label: 'Pixelate', type: 'toggle', kind: PAINT },
    ]).concat(toneFields()),
    defaults: {
      grid: 256, aspect: '1:1',
      T: 2.27, h: 0, hMode: 'uniform', bands: 6, init: 'hot',
      running: true, steps: 2, warmup: 250,
      view: 'spins', blur: 3, lo: -1, hi: 1, wall: 1.2, pixelate: true,
      exposure: 1, gamma: 1, contrast: 1.05, grain: 0,
      seed: 'ising-1925',
    },
    presets: {
      critical: pre('Critical point', { T: 2.27, h: 0, hMode: 'uniform', init: 'hot', warmup: 300, view: 'spins', grid: 256 }, Pal.graphite),
      quench: pre('Quench coarsening', { T: 1.2, h: 0, hMode: 'uniform', init: 'hot', warmup: 120, view: 'mag', blur: 4, pixelate: false, grid: 256 }, Pal.harbor),
      below: pre('Just below T_c', { T: 2.12, h: 0, hMode: 'uniform', init: 'hot', warmup: 300, view: 'spins', grid: 256 }, Pal.xray),
      stripes: pre('Field stripes', { T: 2.0, h: 0.5, hMode: 'stripes', bands: 6, init: 'hot', warmup: 150, view: 'spins', grid: 256 }, Pal.kiln),
      walls: pre('Domain walls', { T: 1.6, h: 0, hMode: 'uniform', init: 'hot', warmup: 200, view: 'walls', blur: 2, wall: 1.6, grid: 256 }, Pal.ember),
      gradient: pre('Field gradient', { T: 2.3, h: 1.2, hMode: 'gradient', init: 'hot', warmup: 200, view: 'mag', blur: 3, pixelate: false, grid: 256 }, Pal.thermal),
      energy: pre('Bond energy', { T: 2.27, h: 0, hMode: 'uniform', init: 'hot', warmup: 300, view: 'energy', grid: 256 }, Pal.verdigris),
    },
    closedGroups: [],
    hints: {
      Model: 'T is the whole story. Sweep it through 2.27 and watch the plate go from domains to critical clouds to noise. h breaks the up/down symmetry; the stripes and checks shapes alternate its sign across the plate.',
      Picture: 'Spins is the raw lattice. Magnetization averages it so domains read as tone. Domain walls is |∇| of that average. Bond energy counts how many of the four neighbors disagree, five levels through the palette.',
    },
    palette: true, defaultPalette: 'graphite', paletteLabel: 'Colors (down → up)',
    headline: 'T', headlineLabel: 'temperature',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 64, 512);
      s.T = U.clamp(Number(s.T) || 2.27, 0.3, 6);
      s.blur = U.clamp(Math.round(Number(s.blur) || 0), 0, 16);
      s.bands = U.clamp(Math.round(Number(s.bands) || 1), 1, 12);
    },
    surprise(rng) {
      const T = rng.pick([1.3, 1.8, 2.12, 2.27, 2.27, 2.35, 2.6]);
      const hMode = rng.pick(['uniform', 'uniform', 'uniform', 'stripes', 'gradient', 'checks']);
      const view = rng.pick(['spins', 'spins', 'mag', 'walls', 'energy']);
      return {
        grid: rng.pick([192, 256, 256, 384]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        T, h: hMode === 'uniform' ? rng.pick([0, 0, 0, 0.1]) : rng.range(0.4, 1.2), hMode, bands: rng.int(3, 9), init: 'hot',
        running: true, steps: rng.int(1, 3), warmup: rng.int(150, 450),
        view, blur: rng.int(2, 6), lo: -1, hi: 1, wall: rng.range(1, 2), pixelate: view !== 'mag',
        exposure: rng.range(0.9, 1.1), gamma: rng.range(0.85, 1.15), contrast: rng.range(0.95, 1.2), grain: rng.pick([0, 0, 0.05]),
      };
    },
    create(host) {
      const gpu = gpuInit(host);
      if (!gpu) return deadInstance(host, 'WebGL2 is not available in this browser');
      const { gl, texType, upload } = gpu;
      let stepPass, blurPass, renderPass, reducePass, splatPass;
      try {
        stepPass = new G.Pass(gl, ISING_STEP);
        blurPass = new G.Pass(gl, ISING_BLUR);
        renderPass = new G.Pass(gl, ISING_RENDER);
        reducePass = new G.Pass(gl, REDUCE_FS);
        splatPass = new G.Pass(gl, G.GLSL.splatFS);
      } catch (err) { console.error(err); return deadInstance(host, 'Shader compilation failed on this GPU'); }

      let C = null, B = null, reduceT = null, gw = 0, gh = 0, ramp = null, rampPal = null, rampKey = '';
      const redBuf = new Uint8Array(RED * RED * 4);
      let raf = 0, chunkTimer = 0, sweeps = 0, tick0 = 0, meanM = 0;

      function ensureGrid(s) {
        const [W, H] = gridSize(s);
        if (C && gw === W && gh === H) return;
        if (C) { C.dispose(); B.dispose(); reduceT.dispose(); }
        C = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'repeat' });
        B = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'repeat' });
        reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
        gw = W; gh = H;
      }
      function ensureRamp(s) {
        const key = (s.bg || '') + '|' + (s.palette || []).join(',');
        if (ramp && rampKey === key) return;
        if (ramp) { ramp.dispose(); rampPal.dispose(); }
        // walls rise from the background; spins, magnetization and energy run first color to last
        ramp = G.rampTexture(gl, s.palette, s.bg);
        rampPal = G.rampTexture(gl, s.palette, null);
        rampKey = key;
      }
      function step(n) {
        const s = host.getState();
        const u = { u_res: [gw, gh], u_T: s.T, u_h: s.h, u_bands: s.bands, u_hMode: { int: ISING_HMODES[s.hMode] || 0 } };
        for (let i = 0; i < n; i++) {
          for (let parity = 0; parity < 2; parity++) {
            u.u_s = C.read; u.u_parity = { int: parity }; u.u_tick = { int: tick0 + 2 * (sweeps + i) + parity };
            stepPass.draw(C.write, u);
            C.swap();
          }
        }
        sweeps += n;
      }
      // Jacobi averaging of the spin field into B.read; zero passes copies the spins through.
      function smooth(s) {
        const n = Math.max(1, s.blur | 0);
        for (let i = 0; i < n; i++) {
          blurPass.draw(B.write, { u_c: i === 0 ? C.read : B.read, u_res: [gw, gh], u_amt: s.blur > 0 ? 1 : 0 });
          B.swap();
        }
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        if (s.view === 'mag' || s.view === 'walls') smooth(s);
        renderPass.draw(target || null, {
          u_s: C.read, u_m: B.read, u_ramp: s.view === 'walls' ? ramp : rampPal, u_res: [gw, gh],
          u_view: { int: ISING_VIEWS[s.view] || 0 }, u_pixel: !!s.pixelate,
          u_lo: s.lo, u_hi: s.hi, u_wall: s.wall,
          u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
        });
      }
      function measure() { meanM = gpuMeasure(gl, reducePass, reduceT, C.read, gw, gh, redBuf).mean; }
      function status(extra) {
        const s = host.getState(), r = s.T / T_C;
        const phase = r < 0.93 ? 'ordered' : r < 1.07 ? 'critical' : 'disordered';
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          '<span>T <b>' + s.T.toFixed(2) + '</b> · ' + r.toFixed(2) + ' T<sub>c</sub> · ' + phase + '</span>' +
          '<span>m <b>' + (meanM >= 0 ? '+' : '') + meanM.toFixed(2) + '</b></span>' +
          '<span>sweep <b>' + sweeps.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps); render();
        if (sweeps % 16 < s.steps) { measure(); status(); }
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { measure(); status(s.running ? '' : 'paused'); render(); }
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
          stop(); sweeps = 0;
          const s = host.getState();
          tick0 = U.makeRng(s.seed + '/ising/tick').int(0, 1e6);
          ensureGrid(s);
          upload(C.read, isingSeed(s, gw, gh));
          B.read.clear(0, 0, 0, 1);
          const warm = host.reducedMotion() ? Math.min(s.warmup, 100) : s.warmup;
          if (warm > 0) burst(warm);
          else { render(); measure(); status(); startLoop(); }
        },
        repaint() { if (C) render(); },
        live(key) { if (key === 'running') startLoop(); else if (!raf) startLoop(); },
        resize() { if (C) render(); },
        pause() { stop(); },
        resume() { if (C) { render(); startLoop(); } },
        action(key) {
          if (key === 'reseed') this.regenerate();
          else if (key === 'burst') burst(300);
        },
        disturb(p) {
          if (!C) return;
          // paint a disk of the minority spin so the poke is visible whatever the plate's majority
          const v = meanM > 0 ? -1 : 1;
          splatPass.draw(C.write, { u_src: C.read, u_pos: [p.x, p.yGL], u_add: [v, 0, 0, 1], u_rad: 0.05, u_amt: 1, u_mode: { int: 0 } });
          C.swap(); render(); startLoop();
        },
        exportPNG(w, h) {
          if (!C) return Promise.reject(new Error('nothing to export'));
          return gpuExport(gl, w, h, render);
        },
      };
    },
  });

  /* ---------- Abelian Sandpile ---------- */
  // Topple every unstable site of an n x n grid with a sink boundary until none is left. Sites are taken from a
  // LIFO stack and toppled floor(h/4) times at once; the Abelian property makes the final state independent of order.
  // Runs for at most `ms` milliseconds and returns whether it finished. `mark`, when given, records the drop index.
  function makeGridToppler(n) {
    const N = n * n, stack = new Int32Array(N), inq = new Uint8Array(N);
    let sp = 0, pops = 0;
    function push(i) { if (!inq[i]) { inq[i] = 1; stack[sp++] = i; } }
    function run(h, ms, mark, tag) {
      const t0 = performance.now();
      let k = 0;
      while (sp > 0) {
        const p = stack[--sp]; inq[p] = 0;
        const v = h[p]; if (v < 4) continue;
        const t = v >> 2; h[p] = v - 4 * t; pops++;
        if (mark) mark[p] = tag;
        const x = p % n, y = (p / n) | 0;
        if (x > 0) { const q = p - 1; if ((h[q] += t) >= 4) push(q); }
        if (x < n - 1) { const q = p + 1; if ((h[q] += t) >= 4) push(q); }
        if (y > 0) { const q = p - n; if ((h[q] += t) >= 4) push(q); }
        if (y < n - 1) { const q = p + n; if ((h[q] += t) >= 4) push(q); }
        if ((++k & 4095) === 0 && performance.now() - t0 > ms) return false;
      }
      return true;
    }
    function seedAll(h) { sp = 0; for (let i = 0; i < N; i++) { inq[i] = 0; if (h[i] >= 4) { inq[i] = 1; stack[sp++] = i; } } }
    return { push, run, seedAll, pops: () => pops };
  }
  // Single-source pile: one octant 0 <= y <= x of the square lattice, using its 8-fold symmetry. When a representative
  // topples, its whole orbit topples, so each folded neighbor receives |orbit(p)| / |orbit(q)| grains per toppling.
  function makeOctantPile(N) {
    const R = Math.ceil(0.4 * Math.sqrt(N)) + 6;      // measured: the pile radius is about 0.367 sqrt(N)
    const cells = (R + 1) * (R + 2) / 2;
    const idx = (x, y) => x * (x + 1) / 2 + y;
    const orb = (x, y) => x === 0 ? 1 : (y === 0 || y === x) ? 4 : 8;
    const nq = new Int32Array(cells * 4).fill(-1), nw = new Int32Array(cells * 4);
    for (let x = 0; x <= R; x++) for (let y = 0; y <= x; y++) {
      const p = idx(x, y), op = orb(x, y);
      const qs = [], ws = [];
      for (let d = 0; d < 4; d++) {
        let fx = Math.abs(x + (d === 0 ? 1 : d === 1 ? -1 : 0)), fy = Math.abs(y + (d === 2 ? 1 : d === 3 ? -1 : 0));
        if (fy > fx) { const t = fx; fx = fy; fy = t; }
        if (fx > R) continue;
        const q = idx(fx, fy), w = op / orb(fx, fy);
        const j = qs.indexOf(q);
        if (j < 0) { qs.push(q); ws.push(w); } else ws[j] += w;
      }
      for (let k = 0; k < qs.length; k++) { nq[p * 4 + k] = qs[k]; nw[p * 4 + k] = Math.round(ws[k]); }
    }
    const h = new Float64Array(cells), inq = new Uint8Array(cells), stack = new Int32Array(cells);
    let sp = 0, pops = 0;
    h[0] = N; stack[sp++] = 0; inq[0] = 1;
    function run(ms) {
      const t0 = performance.now();
      let k = 0;
      while (sp > 0) {
        const p = stack[--sp]; inq[p] = 0;
        const t = Math.floor(h[p] / 4); if (t <= 0) continue;
        h[p] -= 4 * t; pops++;
        for (let d = 0; d < 4; d++) {
          const q = nq[p * 4 + d]; if (q < 0) break;
          h[q] += nw[p * 4 + d] * t;
          if (h[q] >= 4 && !inq[q]) { inq[q] = 1; stack[sp++] = q; }
        }
        if ((++k & 4095) === 0 && performance.now() - t0 > ms) return false;
      }
      return true;
    }
    function extent() {
      for (let x = R; x >= 0; x--) for (let y = 0; y <= x; y++) if (h[idx(x, y)] > 0) return x;
      return 0;
    }
    // grain count at any lattice point, folded into the octant
    function at(x, y) {
      x = Math.abs(x); y = Math.abs(y);
      if (y > x) { const t = x; x = y; y = t; }
      return x > R ? 0 : h[idx(x, y)];
    }
    return { run, extent, at, pops: () => pops, R };
  }
  const SAND_MODE = { pile: 'Single source', identity: 'Group identity', soc: 'Random drops' };
  Studio.register({
    id: 'sandpile',
    name: 'Abelian Sandpile',
    tab: 'Sandpile',
    subtitle: 'self-organized criticality · 1987',
    order: 60.5,
    equation: 'if hᵢ ≥ 4: hᵢ −= 4, hⱼ += 1 for each neighbor j;   identity e = (2m − (2m)°)°, m = all 3',
    credit: "Per Bak, Chao Tang and Kurt Wiesenfeld, Phys. Rev. Lett. 59, 381 (1987); Deepak Dhar, Phys. Rev. Lett. 64, 1613 (1990). Bak, Tang and Wiesenfeld dropped grains one at a time on a lattice with a toppling threshold and found avalanches of every size, a power law with no tuning: self-organized criticality. Dhar showed the toppling operators commute, so the final stable state does not depend on the order of toppling, and the recurrent configurations form an Abelian group. The identity of that group, computed on a square, is the fractal plate in the second mode.",
    blurb: 'Grains stack four high, then the pile topples: four grains, one to each neighbor, and those neighbors may topple in turn. That is the whole rule. Drop a million grains on one site and the pile that settles is a square-ish medallion of arabesques with sharp lines running to the corners, patterned to the last cell, with nothing random in it. The group identity is stranger: stabilize a plate of sixes, subtract it from sixes, stabilize again, and the result is the one configuration that adds to any recurrent state without changing it. Random drops give the third picture, the critical state itself, where the last avalanches are lit by size.',
    schema: [
      { group: 'Pile', key: 'mode', label: 'Mode', type: 'seg', kind: GEOM, wrap: true,
        options: [['pile', 'Single source'], ['identity', 'Identity'], ['soc', 'Random drops']] },
      { group: 'Pile', key: 'grains', label: 'Grains', type: 'seg', kind: GEOM, wrap: true, dimUnless: s => s.mode === 'pile',
        options: [[4096, '2¹²'], [16384, '2¹⁴'], [65536, '2¹⁶'], [131072, '2¹⁷'], [262144, '2¹⁸'], [1048576, '2²⁰']],
        hint: 'Grains dropped on the center. The work grows like the square of the count: 2¹⁸ takes several seconds, 2²⁰ a minute or two, with progress shown.' },
      { group: 'Pile', key: 'size', label: 'Grid', type: 'seg', kind: GEOM, dimUnless: s => s.mode !== 'pile',
        options: [[64, '64'], [96, '96'], [128, '128'], [192, '192'], [256, '256']],
        hint: 'Side of the square for the identity and random drop modes. The identity at 256 takes about ten seconds.' },
      RANGE('Pile', 'drops', 'Drops', GEOM, 2000, 200000, 1000, v => v.toLocaleString(), { dimUnless: s => s.mode === 'soc',
        hint: 'Random grains added one at a time from a seeded start of 0 to 3 grains per site.' }),
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, dimUnless: s => s.mode === 'soc',
        options: [['grains', 'Grains'], ['avalanche', 'Recent avalanches'], ['patches', 'Avalanche patches']] },
      { group: 'Picture', key: 'zero', label: 'Empty sites', type: 'seg', kind: PAINT, options: [['paper', 'Paper'], ['ink', 'Ink']],
        hint: 'Paper leaves sites with no grains as background. Ink gives all four counts a palette color.' },
      RANGE('Picture', 'memory', 'Avalanche memory', PAINT, 5, 2000, 5, String, { dimUnless: s => s.mode === 'soc' && s.view === 'avalanche',
        hint: 'How many drops back an avalanche stays lit. The last one is brightest; older ones sink down the ramp.' }),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.4, 0.02, pct),
    ],
    defaults: { mode: 'pile', grains: 65536, size: 128, drops: 30000, view: 'grains', zero: 'paper', memory: 100, grain: 0, seed: 'btw-1987' },
    presets: {
      medallion: pre('Medallion 2¹⁶', { mode: 'pile', grains: 65536, zero: 'paper', view: 'grains' }, Pal.kiln),
      big: pre('Medallion 2¹⁷', { mode: 'pile', grains: 131072, zero: 'ink', view: 'grains' }, Pal.nightshade),
      identity: pre('Identity 128', { mode: 'identity', size: 128, zero: 'paper', view: 'grains' }, Pal.graphite),
      identity96: pre('Identity 96', { mode: 'identity', size: 96, zero: 'ink', view: 'grains' }, Pal.tram),
      soc: pre('Random drops', { mode: 'soc', size: 128, drops: 30000, view: 'avalanche', memory: 100, zero: 'paper' }, Pal.ember),
      patches: pre('Avalanche patches', { mode: 'soc', size: 192, drops: 50000, view: 'patches', memory: 100, zero: 'paper' }, Pal.thermal),
      small: pre('Small pile 2¹⁴', { mode: 'pile', grains: 16384, zero: 'ink', view: 'grains' }, Pal.risograph),
    },
    closedGroups: [],
    hints: {
      Pile: 'Single source drops every grain on the center of an infinite plane and computes one octant of the symmetric result. Identity is the sandpile group identity on a square with sink edges. Random drops is the Bak-Tang-Wiesenfeld experiment itself.',
      Picture: 'Cells hold 0 to 3 grains after toppling and take four steps of the palette. In random drops, Recent avalanches lights the last few footprints by age and Avalanche patches gives every footprint its own color, later ones stamped over earlier ones.',
    },
    palette: true, defaultPalette: 'kiln', paletteLabel: 'Colors (0 → 3 grains)',
    headline: 'drops', headlineLabel: 'drops',
    sanitize(s) {
      s.drops = U.clamp(Math.round(Number(s.drops) / 1000) * 1000, 2000, 200000);
      s.memory = U.clamp(Math.round(Number(s.memory) / 5) * 5, 5, 2000);
    },
    surprise(rng) {
      const mode = rng.pick(['pile', 'pile', 'identity', 'soc']);
      return {
        mode, grains: rng.pick([16384, 65536, 65536, 131072]), size: rng.pick([96, 128, 128, 192]), drops: rng.pick([20000, 30000, 50000]),
        view: mode === 'soc' ? rng.pick(['avalanche', 'patches']) : 'grains', zero: rng.pick(['paper', 'ink']), memory: rng.pick([40, 100, 300]), grain: rng.pick([0, 0, 0.05]),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let buf = document.createElement('canvas'), bw = 0, bh = 0;
      let timer = 0, job = null, done = false, key = '';
      // results
      let heights = null, marks = null, n = 0, drops = 0, topples = 0, maxAv = 0, sumAv = 0, pile = null, radius = 0;

      function colors(s) {
        const lut = U.makeRampLUT(s.palette, null, 256), bg = U.hexToRgb(s.bg);
        if (s.zero === 'ink') return [lutColor(lut, 0), lutColor(lut, 1 / 3), lutColor(lut, 2 / 3), lutColor(lut, 1)];
        return [bg, lutColor(lut, 0), lutColor(lut, 0.5), lutColor(lut, 1)];
      }
      function paint(progress) {
        const s = host.getState();
        if (!bw) return;
        const g = buf.getContext('2d'), img = g.createImageData(bw, bh), d = img.data;
        const col = colors(s), bg = U.hexToRgb(s.bg);
        const lut = U.makeRampLUT(s.palette, s.bg, 256);
        const soc = s.mode === 'soc' && s.view !== 'grains' && marks;
        if (s.mode === 'pile' && pile) {
          const c = (bw - 1) / 2;
          for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
            const h = Math.min(3, pile.at(x - c, y - c) | 0), o = (y * bw + x) * 4, k = col[h];
            d[o] = k[0]; d[o + 1] = k[1]; d[o + 2] = k[2]; d[o + 3] = 255;
          }
        } else if (heights) {
          for (let i = 0, o = 0; i < bw * bh; i++, o += 4) {
            let k = col[Math.min(3, heights[i])];
            if (soc) {
              const m = marks[i], age = m < 0 ? Infinity : drops - 1 - m;
              if (s.view === 'patches') {
                // every cell wears the color of the last avalanche that toppled it: nested footprints, later over earlier
                k = m < 0 ? bg : lutColor(lut, 0.15 + 0.85 * ((m * 0.6180339887) % 1));
              } else if (age < s.memory) {
                k = lutColor(lut, 0.2 + 0.8 * (1 - age / s.memory));
              } else k = [k[0] * 0.5 + bg[0] * 0.5, k[1] * 0.5 + bg[1] * 0.5, k[2] * 0.5 + bg[2] * 0.5];
            }
            d[o] = k[0]; d[o + 1] = k[1]; d[o + 2] = k[2]; d[o + 3] = 255;
          }
        }
        if (!progress) grainImage(img, s.grain, s.seed);
        g.putImageData(img, 0, 0);
        nearestBlit(ctx, buf, canvas.width, canvas.height, s.bg);
      }
      function status(extra) {
        const s = host.getState();
        let mid;
        if (s.mode === 'pile') mid = '<span>grains <b>' + Number(s.grains).toLocaleString() + '</b> · radius <b>' + radius + '</b></span>';
        else if (s.mode === 'identity') mid = '<span>identity <b>' + n + '×' + n + '</b></span>';
        else mid = '<span>drops <b>' + drops.toLocaleString() + '</b> · largest avalanche <b>' + maxAv.toLocaleString() + '</b> · mean <b>' + (drops ? (sumAv / drops).toFixed(1) : '0') + '</b></span>';
        host.setStatus('<span><b>' + SAND_MODE[s.mode] + '</b></span>' + mid + '<span>topplings <b>' + topples.toLocaleString() + '</b></span>' + (extra ? '<span>' + extra + '</span>' : ''));
      }
      function stop() { clearTimeout(timer); timer = 0; job = null; }
      function setBuffer(w, h) { bw = w; bh = h; buf.width = w; buf.height = h; }

      function startPile(s) {
        const N = Number(s.grains) || 65536;
        pile = makeOctantPile(N); heights = null; marks = null; radius = 0;
        setBuffer(2 * pile.R + 1, 2 * pile.R + 1);
        return {
          run(ms) {
            const fin = pile.run(ms);
            topples = pile.pops();
            if (fin) {
              radius = pile.extent();
              // crop the plate to the pile plus a margin
              const side = 2 * (radius + 3) + 1;
              setBuffer(side, side);
            }
            return fin;
          },
          label: () => 'toppling ' + topples.toLocaleString(),
        };
      }
      function startIdentity(s) {
        n = Number(s.size) || 128; pile = null; marks = null;
        const N = n * n; heights = new Int32Array(N); heights.fill(6);
        setBuffer(n, n);
        const top = makeGridToppler(n); top.seedAll(heights);
        let phase = 0;
        return {
          run(ms) {
            const fin = top.run(heights, ms);
            topples = top.pops();
            if (!fin) return false;
            if (phase === 0) {
              phase = 1;
              for (let i = 0; i < N; i++) heights[i] = 6 - heights[i];
              top.seedAll(heights);
              return false;
            }
            return true;
          },
          label: () => (phase === 0 ? 'stabilizing 2m' : 'stabilizing 2m − (2m)°') + ' · ' + topples.toLocaleString(),
        };
      }
      function startSoc(s) {
        n = Number(s.size) || 128; pile = null;
        const N = n * n, rng = U.makeRng(s.seed + '/soc');
        heights = new Int32Array(N); marks = new Int32Array(N).fill(-1);
        for (let i = 0; i < N; i++) heights[i] = rng.int(0, 3);
        setBuffer(n, n);
        const top = makeGridToppler(n), total = s.drops | 0;
        let pops0 = 0, touched = [];
        drops = 0; maxAv = 0; sumAv = 0;
        return {
          run(ms) {
            const t0 = performance.now();
            while (drops < total) {
              const i = rng.int(0, N - 1);
              if (++heights[i] >= 4) {
                top.push(i);
                top.run(heights, 1e9, marks, drops);
                const size = top.pops() - pops0; pops0 = top.pops();
                sumAv += size; if (size > maxAv) maxAv = size;
              }
              drops++;
              if ((drops & 31) === 0 && performance.now() - t0 > ms) { topples = top.pops(); return false; }
            }
            topples = top.pops();
            return true;
          },
          label: () => 'dropping ' + drops.toLocaleString() + ' / ' + total.toLocaleString(),
        };
      }
      function compute() {
        stop();
        const s = host.getState();
        done = false; topples = 0;
        job = s.mode === 'identity' ? startIdentity(s) : s.mode === 'soc' ? startSoc(s) : startPile(s);
        const quiet = host.reducedMotion();
        const rec = () => {
          if (!job) return;
          const fin = job.run(40);
          if (fin) { done = true; job = null; paint(false); status(); return; }
          if (!quiet) { paint(true); status(job.label() + '…'); }
          timer = setTimeout(rec, 0);
        };
        rec();
      }
      return {
        aspect() { return 1; },
        regenerate() {
          const s = host.getState();
          const k = [s.mode, s.grains, s.size, s.drops, s.seed].join('|');
          if (k === key && done) { paint(false); status(); return; }
          key = k; compute();
        },
        repaint() { if (done) { paint(false); status(); } },
        resize() { if (done) paint(false); },
        pause() {}, resume() { if (done) paint(false); },
        exportPNG(w, h) {
          if (!done) return Promise.reject(new Error('the pile is still toppling'));
          paint(false);
          return crispExport(buf, w, h);
        },
      };
    },
  });

  /* ---------- Cyclic Automaton ---------- */
  const CCA_STEP = HEAD + `
uniform sampler2D u_s; uniform vec2 u_res;
uniform int u_k, u_range, u_thr, u_rule, u_nbhd;
void main(){
  vec2 px = 1.0 / u_res;
  vec4 c = texture(u_s, v_uv);
  int s = int(c.r + 0.5) % u_k;
  int target = u_rule == 0 ? (s + 1) % u_k : 1;
  int count = 0;
  for (int dy = -u_range; dy <= u_range; dy++) for (int dx = -u_range; dx <= u_range; dx++) {
    if (dx == 0 && dy == 0) continue;
    if (u_nbhd == 1 && abs(dx) + abs(dy) > u_range) continue;
    int nb = int(texture(u_s, v_uv + vec2(float(dx), float(dy)) * px).r + 0.5) % u_k;
    if (nb == target) count++;
  }
  int ns = s;
  if (u_rule == 0) { if (count >= u_thr) ns = target; }
  else if (s == 0) { if (count >= u_thr) ns = 1; }
  else ns = (s + 1) % u_k;
  // age: steps since the last front passed. Cyclic: since the cell last advanced. GH: since it was last excited.
  bool fresh = u_rule == 0 ? ns != s : (s == 0 && ns == 1);
  float age = fresh ? 0.0 : min(c.g + 1.0, 4000.0);
  outColor = vec4(float(ns), age, ns == s ? 0.0 : 1.0, 1.0);
}`;
  const CCA_RENDER = HEAD + `
uniform sampler2D u_s, u_pal; uniform vec2 u_res; uniform vec3 u_bg;
uniform int u_k, u_view;
uniform float u_phase, u_ageAmt, u_ageSpan, u_exposure, u_gamma, u_contrast, u_grain;
${HASH_U}
${G.GLSL.ramp}
${TONE}
void main(){
  vec4 c = texture(u_s, v_uv);
  float s = floor(c.r + 0.5), k = float(u_k);
  float ageT = clamp(c.g / u_ageSpan, 0.0, 1.0);
  vec3 col;
  if (u_view == 0) col = ramp(s / max(k - 1.0, 1.0));
  else if (u_view == 1) col = texture(u_pal, vec2(fract(s / k + u_phase), 0.5)).rgb;
  else col = ramp(1.0 - ageT);
  if (u_view != 2) col = mix(col, u_bg, u_ageAmt * ageT);
  outColor = vec4(tone(col, u_exposure, u_gamma, u_contrast, u_grain), 1.0);
}`;
  const CCA_VIEWS = { states: 0, cyclic: 1, fronts: 2 };
  function ccaSeed(s, W, H) {
    const rng = U.makeRng(s.seed + '/cca');
    const k = s.k | 0, data = new Float32Array(W * H * 4);
    const put = (x, y, v) => { x = ((x % W) + W) % W; y = ((y % H) + H) % H; data[(y * W + x) * 4] = v; };
    if (s.init === 'random') {
      for (let i = 0; i < W * H; i++) data[i * 4] = rng.int(0, k - 1);
    } else if (s.init === 'sparse') {
      for (let i = 0; i < W * H; i++) data[i * 4] = rng() < s.density ? rng.int(1, k - 1) : 0;
    } else {
      // broken wavefronts: a short excited line with a refractory line behind it, each end curls into a spiral
      const nSeg = Math.max(2, Math.round(s.density * 80));
      for (let i = 0; i < nSeg; i++) {
        const cx = rng.int(0, W - 1), cy = rng.int(0, H - 1), L = rng.int(Math.round(Math.min(W, H) * 0.05), Math.round(Math.min(W, H) * 0.18));
        const horiz = rng() < 0.5, dir = rng() < 0.5 ? 1 : -1;
        for (let j = -L; j <= L; j++) {
          for (let w = 0; w < k - 1; w++) {
            const v = 1 + w;
            if (horiz) put(cx + j, cy + dir * w, v); else put(cx + dir * w, cy + j, v);
          }
        }
      }
    }
    for (let i = 0; i < W * H; i++) data[i * 4 + 3] = 1;
    return data;
  }
  Studio.register({
    id: 'cyclicca',
    name: 'Cyclic Automaton',
    tab: 'Cyclic CA',
    subtitle: 'cyclic and Greenberg-Hastings excitable automata · 1991',
    order: 54.5,
    equation: 'cyclic: s → s+1 (mod k) if ≥ θ neighbors within range r are in state s+1;   GH: 0 → 1 if ≥ θ excited, 1 → 2 → … → k−1 → 0',
    credit: "Robert Fisch, Janko Gravner and David Griffeath, Statistics and Computing 1, 23 (1991), on threshold-range scaling of excitable automata; David Griffeath, Notices of the AMS, 1988, for the cyclic cellular automaton; James M. Greenberg and Stuart P. Hastings, SIAM J. Appl. Math. 34, 515 (1978), for the excitable rest-excited-refractory rule. In the cyclic automaton every state eats the one below it, so k colors chase each other around the cycle and a random soup organizes into spirals. Greenberg-Hastings is the same cycle with one excitable state: waves propagate, refractory tails follow, and broken fronts curl into spiral pairs.",
    blurb: 'Rock, paper, scissors with k hands. A cell in state s advances to s+1 as soon as enough of its neighbors are already there, and s+1 is in turn eaten by s+2, all the way around the cycle. From random noise the plate first goes through debris, then droplets where the cycle closes on itself, and then the spirals win, because a spiral is a defect that never runs out of successors. Range and threshold change the geometry: wide ranges make thick smooth waves, high thresholds make the automaton fixate into a still mosaic. The Greenberg-Hastings rule is the same cycle with a single excitable state, the textbook model of a heart wave.',
    schema: GRID.concat([
      { group: 'Rule', key: 'rule', label: 'Rule', type: 'seg', kind: GEOM, options: [['cca', 'Cyclic'], ['gh', 'Greenberg-Hastings']] },
      RANGE('Rule', 'k', 'States k', LIVE, 3, 24, 1, String, { hint: 'Number of colors in the cycle. For Greenberg-Hastings, one rest state, one excited, k−2 refractory.' }),
      RANGE('Rule', 'range', 'Range r', LIVE, 1, 5, 1, String, { hint: 'Neighborhood radius in cells.' }),
      RANGE('Rule', 'thr', 'Threshold θ', LIVE, 1, 30, 1, String, { hint: 'How many neighbors in the successor state it takes to advance. Small θ: spirals. Large θ: the automaton fixates.' }),
      { group: 'Rule', key: 'nbhd', label: 'Neighborhood', type: 'seg', kind: LIVE, options: [['moore', 'Box'], ['vn', 'Diamond']] },
      { group: 'Seeding', key: 'init', label: 'Start', type: 'seg', kind: GEOM, options: [['random', 'Noise'], ['sparse', 'Sparse'], ['seeds', 'Fronts']],
        hint: 'Noise is every cell random. Sparse is mostly rest with scattered excited sites. Fronts drops broken wave segments that curl into spirals.' },
      RANGE('Seeding', 'density', 'Density', GEOM, 0.01, 0.5, 0.01, f2, { dimUnless: s => s.init !== 'random' }),
    ]).concat(simFields('Steps per frame')).concat([
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['states', 'States'], ['cyclic', 'Cycle'], ['fronts', 'Fronts']] },
      RANGE('Picture', 'phase', 'Cycle phase', PAINT, 0, 1, 0.01, f2, { dimUnless: s => s.view === 'cyclic' }),
      RANGE('Picture', 'ageAmt', 'Age fade', PAINT, 0, 1, 0.01, f2, { hint: 'Cells that have not changed for a while sink toward the background, so the moving fronts carry the light.' }),
      RANGE('Picture', 'ageSpan', 'Age span', PAINT, 5, 400, 1, String, { dimUnless: s => s.ageAmt > 0 || s.view === 'fronts' }),
    ]).concat(toneFields()),
    defaults: {
      grid: 256, aspect: '1:1',
      rule: 'cca', k: 14, range: 1, thr: 1, nbhd: 'vn', init: 'random', density: 0.08,
      running: true, steps: 1, warmup: 300,
      view: 'states', phase: 0, ageAmt: 0.25, ageSpan: 80,
      exposure: 1, gamma: 1, contrast: 1.05, grain: 0,
      seed: 'griffeath-1991',
    },
    presets: {
      griffeath: pre('Griffeath 14', { rule: 'cca', k: 14, range: 1, thr: 1, nbhd: 'vn', init: 'random', warmup: 300, view: 'cyclic', ageAmt: 0.2 }, Pal.risograph),
      eight: pre('Eight colors', { rule: 'cca', k: 8, range: 1, thr: 1, nbhd: 'moore', init: 'random', warmup: 120, view: 'states', ageAmt: 0.25 }, Pal.kiln),
      turbulent: pre('Turbulent r=2', { rule: 'cca', k: 4, range: 2, thr: 5, nbhd: 'moore', init: 'random', warmup: 150, view: 'cyclic', ageAmt: 0.3 }, Pal.thermal),
      fixation: pre('Fixation', { rule: 'cca', k: 6, range: 3, thr: 12, nbhd: 'moore', init: 'random', warmup: 100, view: 'states', ageAmt: 0 }, Pal.petri),
      gh: pre('Greenberg-Hastings', { rule: 'gh', k: 8, range: 1, thr: 1, nbhd: 'moore', init: 'seeds', density: 0.1, warmup: 120, view: 'states', ageAmt: 0.3 }, Pal.glacier),
      ghwide: pre('Wide excitable waves', { rule: 'gh', k: 5, range: 3, thr: 6, nbhd: 'moore', init: 'seeds', density: 0.1, warmup: 150, view: 'states', ageAmt: 0 }, Pal.bioluminescent),
      ghdense: pre('Dense excitable', { rule: 'gh', k: 3, range: 2, thr: 3, nbhd: 'vn', init: 'random', warmup: 100, view: 'states', ageAmt: 0.4 }, Pal.xray),
    },
    closedGroups: ['Seeding'],
    hints: {
      Rule: 'k, r and θ are the whole phase diagram. Threshold 1 with range 1 is Griffeath’s original cyclic space. Raise θ toward the neighborhood size and the plate fixates into a mosaic; raise r and the waves thicken.',
      Picture: 'States runs the k colors up the palette from the background. Cycle wraps them around the palette so the spiral arms read as a continuous chase. Fronts lights the cells that changed most recently.',
    },
    palette: true, defaultPalette: 'risograph', paletteLabel: 'Colors (state 0 → k−1)',
    headline: 'k', headlineLabel: 'states',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 64, 512);
      s.k = U.clamp(Math.round(Number(s.k) || 3), 3, 24);
      s.range = U.clamp(Math.round(Number(s.range) || 1), 1, 5);
      const nb = s.nbhd === 'vn' ? 2 * s.range * (s.range + 1) : (2 * s.range + 1) * (2 * s.range + 1) - 1;
      s.thr = U.clamp(Math.round(Number(s.thr) || 1), 1, Math.min(30, nb));
    },
    surprise(rng) {
      const rule = rng.pick(['cca', 'cca', 'gh']);
      const range = rng.pick([1, 1, 2, 3]);
      const nbhd = rng.pick(['moore', 'vn']);
      const nb = nbhd === 'vn' ? 2 * range * (range + 1) : (2 * range + 1) * (2 * range + 1) - 1;
      return {
        grid: rng.pick([192, 256, 256, 384]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        rule, k: rule === 'gh' ? rng.int(3, 10) : rng.pick([4, 6, 8, 12, 14, 16]), range, thr: rng.int(1, Math.max(1, Math.round(nb * 0.35))), nbhd,
        init: rule === 'gh' ? rng.pick(['seeds', 'sparse', 'random']) : 'random', density: rng.range(0.04, 0.15),
        running: true, steps: 1, warmup: rng.int(100, 350),
        view: rng.pick(['states', 'cyclic', 'cyclic', 'fronts']), phase: rng(), ageAmt: rng.range(0, 0.4), ageSpan: rng.int(30, 120),
        exposure: rng.range(0.9, 1.1), gamma: rng.range(0.85, 1.15), contrast: rng.range(0.95, 1.2), grain: rng.pick([0, 0, 0.05]),
      };
    },
    create(host) {
      const gpu = gpuInit(host);
      if (!gpu) return deadInstance(host, 'WebGL2 is not available in this browser');
      const { gl, texType, upload } = gpu;
      let stepPass, renderPass, reducePass, splatPass;
      try {
        stepPass = new G.Pass(gl, CCA_STEP);
        renderPass = new G.Pass(gl, CCA_RENDER);
        reducePass = new G.Pass(gl, REDUCE_FS);
        splatPass = new G.Pass(gl, G.GLSL.splatFS);
      } catch (err) { console.error(err); return deadInstance(host, 'Shader compilation failed on this GPU'); }

      let C = null, reduceT = null, gw = 0, gh = 0, ramp = null, palTex = null, rampKey = '';
      const redBuf = new Uint8Array(RED * RED * 4);
      let raf = 0, chunkTimer = 0, stepCount = 0, activity = 0;

      function ensureGrid(s) {
        const [W, H] = gridSize(s);
        if (C && gw === W && gh === H) return;
        if (C) { C.dispose(); reduceT.dispose(); }
        C = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'repeat' });
        reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
        gw = W; gh = H;
      }
      function ensureRamp(s) {
        const key = (s.bg || '') + '|' + (s.palette || []).join(',');
        if (ramp && rampKey === key) return;
        if (ramp) { ramp.dispose(); palTex.dispose(); }
        ramp = G.rampTexture(gl, s.palette, s.bg);
        // the cycle view wraps: palette only, first color repeated at the end so the seam is continuous
        palTex = G.rampTexture(gl, s.palette.concat([s.palette[0]]), null);
        rampKey = key;
      }
      function step(n) {
        const s = host.getState();
        const u = { u_res: [gw, gh], u_k: { int: s.k | 0 }, u_range: { int: s.range | 0 }, u_thr: { int: s.thr | 0 },
          u_rule: { int: s.rule === 'gh' ? 1 : 0 }, u_nbhd: { int: s.nbhd === 'vn' ? 1 : 0 } };
        for (let i = 0; i < n; i++) { u.u_s = C.read; stepPass.draw(C.write, u); C.swap(); }
        stepCount += n;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, {
          u_s: C.read, u_ramp: ramp, u_pal: palTex, u_res: [gw, gh], u_bg: hex01(s.bg),
          u_k: { int: s.k | 0 }, u_view: { int: CCA_VIEWS[s.view] || 0 },
          u_phase: s.phase, u_ageAmt: s.ageAmt, u_ageSpan: s.ageSpan,
          u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
        });
      }
      function measure() { activity = gpuMeasure(gl, reducePass, reduceT, C.read, gw, gh, redBuf).act; }
      function status(extra) {
        const s = host.getState();
        host.setStatus(
          '<span><b>' + (s.rule === 'gh' ? 'Greenberg-Hastings' : 'Cyclic') + '</b> · k ' + s.k + ' · r ' + s.range + ' · θ ' + s.thr + '</span>' +
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          '<span>active <b>' + pct(activity) + '</b>' + (activity < 0.002 ? ' · fixated' : '') + '</span>' +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps); render();
        if (stepCount % 12 < s.steps) { measure(); status(); }
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { measure(); status(s.running ? '' : 'paused'); render(); }
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
          ensureGrid(s);
          upload(C.read, ccaSeed(s, gw, gh));
          const warm = host.reducedMotion() ? Math.min(s.warmup, 100) : s.warmup;
          if (warm > 0) burst(warm);
          else { render(); measure(); status(); startLoop(); }
        },
        repaint() { if (C) render(); },
        live(key) { if (key === 'running') startLoop(); else if (!raf) startLoop(); },
        resize() { if (C) render(); },
        pause() { stop(); },
        resume() { if (C) { render(); startLoop(); } },
        action(key) {
          if (key === 'reseed') this.regenerate();
          else if (key === 'burst') burst(300);
        },
        disturb(p) {
          if (!C) return;
          // erase a disk to the rest state: a hole in the pattern that the waves have to grow back into
          splatPass.draw(C.write, { u_src: C.read, u_pos: [p.x, p.yGL], u_add: [0, 0, 0, 1], u_rad: 0.04, u_amt: 1, u_mode: { int: 0 } });
          C.swap(); render(); startLoop();
        },
        exportPNG(w, h) {
          if (!C) return Promise.reject(new Error('nothing to export'));
          return gpuExport(gl, w, h, render);
        },
      };
    },
  });

  /* ---------- Percolation ---------- */
  const PC_SITE = 0.592746, PC_BOND = 0.5;
  // Hoshen-Kopelman cluster labeling by union-find with path halving.
  function findRoot(parent, i) {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  }
  function unite(parent, a, b) {
    a = findRoot(parent, a); b = findRoot(parent, b);
    if (a !== b) parent[b] = a;
  }
  Studio.register({
    id: 'percolation',
    name: 'Percolation',
    tab: 'Percolation',
    subtitle: 'site and bond percolation on the square lattice · 1957',
    order: 88,
    equation: 'site occupied iff rᵢ < p;   bond open iff rᵢⱼ < p;   p_c(site) ≈ 0.5927,   p_c(bond) = 1/2',
    credit: "S. R. Broadbent and J. M. Hammersley, Proc. Cambridge Philos. Soc. 53, 629 (1957); J. Hoshen and R. Kopelman, Phys. Rev. B 14, 3438 (1976); Harry Kesten, Comm. Math. Phys. 74, 41 (1980). Broadbent and Hammersley asked how a fluid spreads through a random porous medium and found a sharp threshold: below p_c every cluster is finite, above it one cluster spans the lattice. Kesten proved the bond threshold on the square lattice is exactly 1/2. The site threshold, about 0.592746, is known only numerically. Hoshen and Kopelman gave the one-pass labeling that finds the clusters.",
    blurb: 'Fill each site with probability p and ask whether you can walk from the top edge to the bottom on filled sites. Below the threshold you cannot, no matter how large the lattice; above it, almost surely you can. Right at p_c the largest cluster is a fractal, with holes at every size and a mass that grows like L^1.896. This plate keeps one random number per site, so sliding p only adds sites: you watch the same clusters swell and join rather than a new draw each time. Clusters are colored by size rank, biggest first through the palette, and the spanning cluster, once it exists, is lit.',
    schema: [
      { group: 'Lattice', key: 'type', label: 'Type', type: 'seg', kind: GEOM, options: [['site', 'Site'], ['bond', 'Bond']],
        hint: 'Site: sites are filled, neighbors connect. Bond: every site is present, the links between them open.' },
      { group: 'Lattice', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512']] },
      { group: 'Lattice', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      RANGE('Occupation', 'p', 'Probability p', PAINT, 0.3, 0.8, 0.001, f3, {
        hint: 'Sweeping p re-labels the same random field: sites are only added, never re-rolled. p_c is 0.5927 for sites, 0.5 for bonds.' }),
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['rank', 'Size rank'], ['size', 'Log size'], ['occupied', 'Occupied']] },
      { group: 'Picture', key: 'highlight', label: 'Light the spanning cluster', type: 'toggle', kind: PAINT },
      RANGE('Picture', 'minSize', 'Hide clusters under', PAINT, 1, 50, 1, String, { hint: 'Clusters smaller than this are drawn as background, which clears the dust around the big ones.' }),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.4, 0.02, pct),
    ],
    defaults: { type: 'site', grid: 256, aspect: '1:1', p: 0.5927, view: 'rank', highlight: true, minSize: 1, grain: 0, seed: 'hammersley-1957' },
    presets: {
      critical: pre('Site at p_c', { type: 'site', grid: 256, p: 0.5927, view: 'rank', highlight: true, minSize: 1 }, Pal.graphite),
      sub: pre('Below threshold', { type: 'site', grid: 256, p: 0.55, view: 'rank', highlight: true, minSize: 2 }, Pal.harbor),
      sup: pre('Spanning', { type: 'site', grid: 256, p: 0.63, view: 'size', highlight: true, minSize: 1 }, Pal.ember),
      bondc: pre('Bond at 1/2', { type: 'bond', grid: 192, p: 0.5, view: 'rank', highlight: true, minSize: 1 }, Pal.xray),
      bondsub: pre('Bond below', { type: 'bond', grid: 192, p: 0.45, view: 'size', highlight: false, minSize: 3 }, Pal.meadow),
      ink: pre('Occupied ink', { type: 'site', grid: 256, p: 0.6, view: 'occupied', highlight: true, minSize: 1 }, Pal.risograph),
      fine: pre('Fine critical', { type: 'site', grid: 512, p: 0.5927, view: 'rank', highlight: true, minSize: 4 }, Pal.glacier),
    },
    closedGroups: [],
    hints: {
      Occupation: 'The one dial. The picture below p_c is dust, above it one cluster, and at p_c the largest cluster is a fractal that only just holds together.',
      Picture: 'Size rank sends the largest cluster to the top of the palette and the rest down the ramp by rank. Log size colors by cluster mass. Occupied is the bare lattice, ink on paper.',
    },
    palette: true, defaultPalette: 'graphite', paletteLabel: 'Colors (small → large)',
    headline: 'p', headlineLabel: 'p',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 64, 512);
      s.p = U.clamp(Number(s.p) || 0.5927, 0.3, 0.8);
      s.minSize = U.clamp(Math.round(Number(s.minSize) || 1), 1, 50);
    },
    surprise(rng) {
      const type = rng.pick(['site', 'site', 'bond']);
      const pc = type === 'site' ? PC_SITE : PC_BOND;
      return {
        type, grid: rng.pick([192, 256, 256, 384]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '16:9']),
        p: +(pc + rng.pick([-0.04, -0.015, 0, 0, 0.01, 0.03])).toFixed(3),
        view: rng.pick(['rank', 'rank', 'size', 'occupied']), highlight: rng() < 0.8, minSize: rng.pick([1, 1, 2, 4]), grain: rng.pick([0, 0, 0.04]),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      const buf = document.createElement('canvas');
      let W = 0, H = 0, field = null, bonds = null, fieldKey = '';
      let parent = null, size = null, rank = null, spanRoot = -1, nClusters = 0, maxSize = 0, labelKey = '';

      function ensureField(s) {
        const [w, h] = gridSize(s);
        const key = [s.seed, s.type, w, h].join('|');
        if (key === fieldKey) return;
        fieldKey = key; W = w; H = h;
        const rng = U.makeRng(s.seed + '/perc');
        field = new Float32Array(W * H);
        for (let i = 0; i < W * H; i++) field[i] = rng();
        bonds = new Float32Array(W * H * 2);
        for (let i = 0; i < W * H * 2; i++) bonds[i] = rng();
        parent = new Int32Array(W * H); size = new Int32Array(W * H); rank = new Int32Array(W * H);
        labelKey = '';
      }
      function label(s) {
        const key = fieldKey + '|' + s.p;
        if (key === labelKey) return;
        labelKey = key;
        const N = W * H, p = s.p, bond = s.type === 'bond';
        for (let i = 0; i < N; i++) parent[i] = i;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (bond) {
            if (x < W - 1 && bonds[i * 2] < p) unite(parent, i, i + 1);
            if (y < H - 1 && bonds[i * 2 + 1] < p) unite(parent, i, i + W);
          } else {
            if (field[i] >= p) continue;
            if (x > 0 && field[i - 1] < p) unite(parent, i, i - 1);
            if (y > 0 && field[i - W] < p) unite(parent, i, i - W);
          }
        }
        size.fill(0);
        const top = new Uint8Array(N), bottom = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
          if (!bond && field[i] >= p) { parent[i] = -1; continue; }
          const r = findRoot(parent, i); parent[i] = r; size[r]++;
          if (i < W) top[r] = 1;
          if (i >= N - W) bottom[r] = 1;
        }
        const roots = [];
        spanRoot = -1; maxSize = 0;
        for (let i = 0; i < N; i++) if (size[i] > 0) {
          roots.push(i);
          if (size[i] > maxSize) maxSize = size[i];
          if (top[i] && bottom[i] && (spanRoot < 0 || size[i] > size[spanRoot])) spanRoot = i;
        }
        roots.sort((a, b) => size[b] - size[a]);
        nClusters = roots.length;
        for (let k = 0; k < roots.length; k++) rank[roots[k]] = k;
      }
      function paint() {
        const s = host.getState();
        ensureField(s); label(s);
        const bond = s.type === 'bond', p = s.p;
        const bw = bond ? 2 * W - 1 : W, bh = bond ? 2 * H - 1 : H;
        buf.width = bw; buf.height = bh;
        const g = buf.getContext('2d'), img = g.createImageData(bw, bh), d = img.data;
        const lut = U.makeRampLUT(s.palette, s.bg, 256), bg = U.hexToRgb(s.bg);
        const logN = Math.log1p(Math.max(1, nClusters)), logMax = Math.log(Math.max(2, maxSize));
        const top = s.highlight && spanRoot >= 0 ? 0.72 : 1;
        const colorOf = i => {
          const r = parent[i];
          if (r < 0 || size[r] < s.minSize) return bg;
          if (s.highlight && r === spanRoot) return lutColor(lut, 1);
          let t;
          if (s.view === 'size') t = Math.log(size[r]) / logMax;
          else if (s.view === 'occupied') t = 0.55;
          else t = 1 - Math.log1p(rank[r]) / logN;
          return lutColor(lut, 0.08 + (top - 0.08) * U.clamp(t, 0, 1));
        };
        for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
          const o = (y * bw + x) * 4;
          let k;
          if (!bond) k = colorOf(y * W + x);
          else if ((x & 1) && (y & 1)) k = bg;
          else if (x & 1) { const i = (y >> 1) * W + (x >> 1); k = bonds[i * 2] < p ? colorOf(i) : bg; }
          else if (y & 1) { const i = (y >> 1) * W + (x >> 1); k = bonds[i * 2 + 1] < p ? colorOf(i) : bg; }
          else k = colorOf((y >> 1) * W + (x >> 1));
          d[o] = k[0]; d[o + 1] = k[1]; d[o + 2] = k[2]; d[o + 3] = 255;
        }
        grainImage(img, s.grain, s.seed);
        g.putImageData(img, 0, 0);
        nearestBlit(ctx, buf, canvas.width, canvas.height, s.bg);
      }
      function status() {
        const s = host.getState(), pc = s.type === 'bond' ? PC_BOND : PC_SITE;
        const rel = s.p < pc - 0.004 ? 'below' : s.p > pc + 0.004 ? 'above' : 'at';
        host.setStatus(
          '<span><b>' + (s.type === 'bond' ? 'bond' : 'site') + '</b> ' + W + '×' + H + '</span>' +
          '<span>p <b>' + s.p.toFixed(3) + '</b> · ' + rel + ' p<sub>c</sub> ' + pc.toFixed(4) + '</span>' +
          '<span>spanning <b>' + (spanRoot >= 0 ? 'yes' : 'no') + '</b> · largest <b>' + pct(maxSize / (W * H)) + '</b></span>' +
          '<span>clusters <b>' + nClusters.toLocaleString() + '</b></span>'
        );
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() { paint(); status(); },
        repaint() { paint(); status(); },
        resize() { if (W) nearestBlit(ctx, buf, canvas.width, canvas.height, host.getState().bg); },
        pause() {}, resume() { if (W) nearestBlit(ctx, buf, canvas.width, canvas.height, host.getState().bg); },
        exportPNG(w, h) {
          if (!W) return Promise.reject(new Error('nothing to export'));
          return crispExport(buf, w, h);
        },
      };
    },
  });
})();
