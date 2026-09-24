
/* modules/rdx.js */
/* GENChase: multi-species reaction-diffusion: excitable media, Turing patterns, cyclic competition, chemotaxis, vegetation bands. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RED = 32;
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3), f4 = v => v.toFixed(4);
  const pct = v => Math.round(v * 100) + '%';
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

  // ---- shared GLSL ----
  // Every step shader starts here: the state texture holds up to four species in RGBA,
  // u_c is cells per length unit (so a physical Laplacian is the cell Laplacian times u_c^2),
  // and the Laplacian is the 5-point or the 9-point (Mehrstellen) stencil.
  const STEP_HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_s; uniform vec2 u_res;
uniform float u_dt, u_c, u_c2, u_noise, u_step, u_nOff;
uniform int u_lap9;
${G.GLSL.hash}
vec4 S(vec2 d){ return texture(u_s, v_uv + d / u_res); }
vec4 lapOf(vec4 c, vec4 e, vec4 w, vec4 n, vec4 s){
  if (u_lap9 == 1) {
    vec4 ne = S(vec2(1.0, 1.0)), nw = S(vec2(-1.0, 1.0)), se = S(vec2(1.0, -1.0)), sw = S(vec2(-1.0, -1.0));
    return (4.0 * (n + s + e + w) + (ne + nw + se + sw) - 20.0 * c) / 6.0 * u_c2;
  }
  return (n + s + e + w - 4.0 * c) * u_c2;
}
vec4 noise4(){
  if (u_noise <= 0.0) return vec4(0.0);
  vec2 p = floor(v_uv * u_res) + vec2(u_nOff, u_step * 0.37);
  return (vec4(hash21(p), hash21(p + 13.1), hash21(p + 27.7), hash21(p + 41.3)) - 0.5) * 2.0 * u_noise * sqrt(u_dt);
}
`;

  // Barkley 1991 (model 0) and FitzHugh-Nagumo (model 1), two species in R and G.
  const STEP_EXC = STEP_HEAD + `
uniform int u_model; uniform float u_a, u_b, u_eps, u_D;
void main(){
  vec4 c = S(vec2(0.0)), e = S(vec2(1.0, 0.0)), w = S(vec2(-1.0, 0.0)), n = S(vec2(0.0, 1.0)), s = S(vec2(0.0, -1.0));
  vec4 L = lapOf(c, e, w, n, s);
  vec4 nz = noise4();
  float u = c.r, v = c.g, fu, fv;
  if (u_model == 0) {
    fu = L.r + u * (1.0 - u) * (u - (v + u_b) / u_a) / u_eps;
    fv = u_D * L.g + u - v;
    u = clamp(u + u_dt * fu + nz.r, 0.0, 1.0);
    v = clamp(v + u_dt * fv + nz.g, 0.0, 2.0);
  } else {
    fu = L.r + u - u * u * u - v;
    fv = u_D * L.g + u_eps * (u - u_a * v - u_b);
    u = clamp(u + u_dt * fu + nz.r, -3.0, 3.0);
    v = clamp(v + u_dt * fv + nz.g, -3.0, 3.0);
  }
  outColor = vec4(u, v, 0.0, 1.0);
}`;

  // Schnakenberg (0), Brusselator (1), Gierer-Meinhardt with saturation (2), Lengyel-Epstein (3).
  // Each linear decay term is taken implicitly (u_new = (u + dt * gain) / (1 + dt * loss)), which keeps
  // the step stable inside the tall activator peaks where u^2 makes the inhibitor equation stiff.
  const STEP_TUR = STEP_HEAD + `
uniform int u_model; uniform vec4 u_p; uniform float u_D, u_sig;
void main(){
  vec4 c = S(vec2(0.0)), e = S(vec2(1.0, 0.0)), w = S(vec2(-1.0, 0.0)), n = S(vec2(0.0, 1.0)), s = S(vec2(0.0, -1.0));
  vec4 L = lapOf(c, e, w, n, s);
  vec4 nz = noise4();
  float u = c.r, v = c.g, un, vn;
  float a = u_p.x, b = u_p.y, cc = u_p.z, K = u_p.w;
  if (u_model == 0) {
    un = (u + u_dt * (L.r + a + u * u * v)) / (1.0 + u_dt);
    vn = (v + u_dt * (u_D * L.g + b)) / (1.0 + u_dt * u * u);
  } else if (u_model == 1) {
    un = (u + u_dt * (L.r + a + u * u * v)) / (1.0 + u_dt * (b + 1.0));
    vn = (v + u_dt * (u_D * L.g + b * u)) / (1.0 + u_dt * u * u);
  } else if (u_model == 2) {
    float vv = max(v, 1.0e-3);
    un = (u + u_dt * (L.r + a + u * u / (vv * (1.0 + K * u * u)))) / (1.0 + u_dt * b);
    vn = (v + u_dt * (u_D * L.g + u * u)) / (1.0 + u_dt * cc);
  } else {
    float h = 1.0 / (1.0 + u * u);
    un = (u + u_dt * (L.r + a)) / (1.0 + u_dt * (1.0 + 4.0 * v * h));
    vn = (v + u_dt * u_sig * (u_D * L.g + b * u)) / (1.0 + u_dt * u_sig * b * u * h);
  }
  u = clamp(un + nz.r, 0.0, 40.0);
  v = clamp(vn + nz.g, 0.0, 40.0);
  outColor = vec4(u, v, 0.0, 1.0);
}`;

  // May-Leonard cyclic competition, three species in R, G, B.
  const STEP_CYC = STEP_HEAD + `
uniform float u_a, u_b, u_D;
void main(){
  vec4 c = S(vec2(0.0)), e = S(vec2(1.0, 0.0)), w = S(vec2(-1.0, 0.0)), n = S(vec2(0.0, 1.0)), s = S(vec2(0.0, -1.0));
  vec4 L = lapOf(c, e, w, n, s);
  vec4 nz = noise4();
  float u = c.r, v = c.g, x = c.b;
  float fu = u_D * L.r + u * (1.0 - u - u_a * v - u_b * x);
  float fv = u_D * L.g + v * (1.0 - v - u_a * x - u_b * u);
  float fx = u_D * L.b + x * (1.0 - x - u_a * u - u_b * v);
  u = clamp(u + u_dt * fu + nz.r, 0.0, 2.0);
  v = clamp(v + u_dt * fv + nz.g, 0.0, 2.0);
  x = clamp(x + u_dt * fx + nz.b, 0.0, 2.0);
  outColor = vec4(u, v, x, 1.0);
}`;

  // Keller-Segel, saturating chemotactic sensitivity, logistic growth. The chemotactic flux is
  // conservative: chi is evaluated at each cell face from the mean of the two cells, multiplied by
  // the face gradient of v, and the four face fluxes are differenced.
  const STEP_KS = STEP_HEAD + `
uniform float u_chi, u_a, u_D;
float chiAt(float uu){ return u_chi * uu / (1.0 + uu * uu); }
void main(){
  vec4 c = S(vec2(0.0)), e = S(vec2(1.0, 0.0)), w = S(vec2(-1.0, 0.0)), n = S(vec2(0.0, 1.0)), s = S(vec2(0.0, -1.0));
  vec4 L = lapOf(c, e, w, n, s);
  vec4 nz = noise4();
  float u = c.r, v = c.g;
  float Fe = chiAt(0.5 * (c.r + e.r)) * (e.g - c.g);
  float Fw = chiAt(0.5 * (c.r + w.r)) * (c.g - w.g);
  float Fn = chiAt(0.5 * (c.r + n.r)) * (n.g - c.g);
  float Fs = chiAt(0.5 * (c.r + s.r)) * (c.g - s.g);
  float divF = (Fe - Fw + Fn - Fs) * u_c2;
  float fu = L.r - divF + u * (1.0 - u);
  float fv = u_D * L.g + u - u_a * v;
  u = clamp(u + u_dt * fu + nz.r, 0.0, 60.0);
  v = clamp(v + u_dt * fv + nz.g, 0.0, 200.0);
  outColor = vec4(u, v, 0.0, 1.0);
}`;

  // Klausmeier 1999: water w in R, plants n in G. Water runs downhill (toward -x) at speed v,
  // upwind differenced. Rainfall a varies linearly up the plate by u_agrad. The water loss w(1 + n^2)
  // and the plant mortality are implicit, so the step is set by the advection CFL, not by the tallest band.
  const STEP_VEG = STEP_HEAD + `
uniform float u_a, u_agrad, u_m, u_v, u_Dw, u_Dn;
void main(){
  vec4 c = S(vec2(0.0)), e = S(vec2(1.0, 0.0)), w = S(vec2(-1.0, 0.0)), n = S(vec2(0.0, 1.0)), s = S(vec2(0.0, -1.0));
  vec4 L = lapOf(c, e, w, n, s);
  vec4 nz = noise4();
  float wa = c.r, pl = c.g;
  float a = u_a * (1.0 + u_agrad * (2.0 * v_uv.y - 1.0));
  float wx = (e.r - c.r) * u_c;
  float wn = (wa + u_dt * (a + u_v * wx + u_Dw * L.r)) / (1.0 + u_dt * (1.0 + pl * pl));
  float pn = (pl + u_dt * (wa * pl * pl + u_Dn * L.g)) / (1.0 + u_dt * u_m);
  wa = clamp(wn + nz.r, 0.0, 40.0);
  pl = clamp(pn + nz.g, 0.0, 40.0);
  outColor = vec4(wa, pl, 0.0, 1.0);
}`;

  // The scalar each view shows. Views: 0..3 one species, 4 difference, 5 interfaces |grad|,
  // 6 relief (height = primary), 7 dominance (max species; the winner picks the color).
  const FIELD_GLSL = `
uniform sampler2D u_s; uniform vec2 u_res;
uniform int u_view, u_prim, u_sec, u_n, u_smooth;
${G.GLSL.bicubic}
float ch(vec4 v, int i){ return i == 0 ? v.r : (i == 1 ? v.g : (i == 2 ? v.b : v.a)); }
// A few hundred cells shown across a few thousand pixels: bilinear leaves the diamond creases of the grid
// on every front, so the smooth view is Catmull-Rom. It interpolates, so a tap at a texel center is exact.
vec4 fetch(vec2 uv){
  if (u_smooth == 0) return texture(u_s, uv);
  return texCR4(u_s, uv, u_res);
}
float scalarAt(vec2 uv){
  vec4 v = fetch(uv);
  if (u_view < 4) return ch(v, u_view);
  if (u_view == 4) return ch(v, u_prim) - ch(v, u_sec);
  if (u_view == 5) {
    vec2 px = 1.0 / u_res;
    float gx = 0.5 * (ch(fetch(uv + vec2(px.x, 0.0)), u_prim) - ch(fetch(uv - vec2(px.x, 0.0)), u_prim));
    float gy = 0.5 * (ch(fetch(uv + vec2(0.0, px.y)), u_prim) - ch(fetch(uv - vec2(0.0, px.y)), u_prim));
    return length(vec2(gx, gy));
  }
  if (u_view == 6) return ch(v, u_prim);
  float m = v.r;
  if (u_n > 1) m = max(m, v.g);
  if (u_n > 2) m = max(m, v.b);
  if (u_n > 3) m = max(m, v.a);
  return m;
}
`;

  const RENDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
${FIELD_GLSL}
uniform float u_mlo, u_mhi, u_lo, u_hi, u_exposure, u_gamma, u_contrast, u_grain, u_bump, u_lightAng;
uniform vec3 u_bg; uniform vec4 u_dom;
${G.GLSL.hash}
${G.GLSL.ramp}
float nrm(float x){
  float t = (x - u_mlo) / max(u_mhi - u_mlo, 1.0e-6);
  return (t - u_lo) / max(u_hi - u_lo, 1.0e-4);
}
void main(){
  vec3 col; float t;
  if (u_view == 6) {
    vec2 px = 1.0 / u_res;
    float hE = nrm(scalarAt(v_uv + vec2(px.x, 0.0))), hW = nrm(scalarAt(v_uv - vec2(px.x, 0.0)));
    float hN = nrm(scalarAt(v_uv + vec2(0.0, px.y))), hS = nrm(scalarAt(v_uv - vec2(0.0, px.y)));
    float gx = 0.5 * (hE - hW) * u_bump, gy = 0.5 * (hN - hS) * u_bump;
    float ang = u_lightAng * 3.14159265 / 180.0;
    vec3 N = normalize(vec3(-gx, -gy, 1.0));
    vec3 Lt = normalize(vec3(cos(ang), sin(ang), 0.85));
    t = clamp(pow(max(dot(N, Lt), 0.0), 1.15), 0.0, 1.0);
    col = mix(u_bg, ramp(t), mix(0.15, 1.0, t));
  } else if (u_view == 7) {
    vec4 v = fetch(v_uv);
    int best = 0; float m = v.r;
    if (u_n > 1 && v.g > m) { m = v.g; best = 1; }
    if (u_n > 2 && v.b > m) { m = v.b; best = 2; }
    if (u_n > 3 && v.a > m) { m = v.a; best = 3; }
    t = clamp(nrm(m), 0.0, 1.0);
    float td = best == 0 ? u_dom.x : (best == 1 ? u_dom.y : (best == 2 ? u_dom.z : u_dom.w));
    col = mix(u_bg, ramp(td), 0.25 + 0.75 * t);
  } else {
    t = clamp(nrm(scalarAt(v_uv)), 0.0, 1.0);
    col = ramp(t);
  }
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  // Per block: the min and the max of the view scalar over an 8x8 sample, each packed into 16 bits
  // over [-16, 16]. The CPU takes percentiles of the block extremes to set the black and white points.
  const REDUCE_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
${FIELD_GLSL}
uniform vec2 u_block;
vec2 enc(float v){
  float x = clamp((v + 16.0) / 32.0, 0.0, 1.0) * 65535.0;
  float hi = floor(x / 256.0);
  return vec2(hi, x - hi * 256.0) / 255.0;
}
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float lo = 1.0e9, hi = -1.0e9;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + (vec2(x, y) + 0.5) * u_block * 0.125) / u_res;
    float v = scalarAt(uv);
    lo = min(lo, v); hi = max(hi, v);
  }
  outColor = vec4(enc(lo), enc(hi));
}`;

  function hexToRgb01(hex) {
    const rgb = U.hexToRgb(hex || '#000000');
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  }
  // Ramp positions for the dominance view: species i takes palette color 1 + i*(npal-1)/(n-1).
  function domStops(s, n) {
    const np = Math.max(1, (s.palette || []).length);
    const out = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const j = n > 1 ? 1 + Math.round(i * (np - 1) / (n - 1)) : 1;
      out[i] = Math.min(j, np) / np;
    }
    return out;
  }
  // Forward Euler diffusion limit with a margin: the 5-point stencil allows dt < 0.25/(D c^2), the 9-point 0.375/(D c^2).
  const dtDiff = (Dmax, c, lap9) => (lap9 ? 0.3 : 0.2) / Math.max(Dmax * c * c, 1e-6);

  // ---- the factory ----
  function rdxCreate(spec) {
    return function create(host) {
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
      let stepPass, renderPass, reducePass, splatPass;
      try {
        stepPass = new G.Pass(gl, spec.stepFS);
        renderPass = new G.Pass(gl, RENDER_FS);
        reducePass = new G.Pass(gl, REDUCE_FS);
        splatPass = new G.Pass(gl, G.GLSL.splatFS);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let C = null, gw = 0, gh = 0, ramp = null, rampKey = '';
      const redBuf = new Uint8Array(RED * RED * 4);
      const mins = new Float32Array(RED * RED), maxs = new Float32Array(RED * RED);
      let reduceT = null, pbo = null, fence = null, raf = 0, chunkTimer = 0, stepCount = 0, nOff = 0;
      let mlo = 0, mhi = 1, measView = '', measStep = -1, measOK = false, dtEff = 0, lastPaint = 0;

      function sizeOf(s) {
        const n = Number(s.grid) || 192;
        const ar = ASPECTS[s.aspect] || 1;
        const W = n, H = Math.max(64, Math.round(n * ar));
        return [W & ~1, H & ~1];
      }
      function ensureGrid(s) {
        const [W, H] = sizeOf(s);
        if (C && gw === W && gh === H) return;
        if (C) C.dispose();
        try { C = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'repeat' }); }
        catch (err) { throw new Error('Float render targets are not available in this browser'); }
        gw = W; gh = H;
        if (!reduceT) {
          reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
          pbo = gl.createBuffer();
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
          gl.bufferData(gl.PIXEL_PACK_BUFFER, RED * RED * 4, gl.STREAM_READ);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        }
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
      function step(n) {
        const s = host.getState();
        const c = Number(s.scale) || 1;
        dtEff = Math.min(s.dt, spec.dtMax(s));
        const uni = Object.assign({
          u_res: [gw, gh], u_dt: dtEff, u_c: c, u_c2: c * c, u_noise: s.noise || 0, u_nOff: nOff,
          u_lap9: { int: Number(s.lap) === 9 ? 1 : 0 },
        }, spec.stepUniforms(s));
        for (let i = 0; i < n; i++) {
          uni.u_s = C.read; uni.u_step = (stepCount + i) * 1.17;
          stepPass.draw(C.write, uni);
          C.swap();
        }
        stepCount += n;
      }
      function viewUniforms(s) {
        const v = spec.views[s.view];
        return {
          u_s: C.read, u_res: [gw, gh],
          u_view: { int: v == null ? 0 : v }, u_prim: { int: spec.prim || 0 }, u_sec: { int: spec.sec == null ? 1 : spec.sec },
          u_n: { int: spec.n }, u_smooth: { int: 0 },
        };
      }
      // Black and white points from the field. The reduce pass writes the extremes of each 8x8 block
      // to a 32x32 target, which is read back through a pixel buffer behind a fence so the GPU is never
      // stalled; collect() applies the numbers once the fence has signaled.
      function measure() {
        if (fence) return;
        const s = host.getState();
        reducePass.draw(reduceT, Object.assign(viewUniforms(s), { u_block: [gw / RED, gh / RED] }));
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (fence) gl.deleteSync(fence);
        fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        if (measView !== s.view) measOK = false;
        measView = s.view; measStep = stepCount;
      }
      function collect() {
        if (!fence) return true;
        if (gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED) return false;
        gl.deleteSync(fence); fence = null;
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, redBuf);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        for (let i = 0; i < RED * RED; i++) {
          mins[i] = ((redBuf[i * 4] * 256 + redBuf[i * 4 + 1]) / 65535) * 32 - 16;
          maxs[i] = ((redBuf[i * 4 + 2] * 256 + redBuf[i * 4 + 3]) / 65535) * 32 - 16;
        }
        mins.sort(); maxs.sort();
        const lo = mins[Math.floor(0.03 * (RED * RED - 1))];
        const hi = maxs[Math.floor(0.97 * (RED * RED - 1))];
        const nlo = lo, nhi = lo + Math.max(hi - lo, 1e-5);
        if (raf && measOK) { mlo += (nlo - mlo) * 0.35; mhi += (nhi - mhi) * 0.35; }
        else { mlo = nlo; mhi = nhi; }
        measOK = true;
        return true;
      }
      // Drain any readback in flight, measure the field as it is now, and call back once the numbers
      // have landed (a few milliseconds of polling). The pixel buffer is never rewritten before it is read.
      function settle(cb) {
        let tries = 0;
        (function drain() {
          if (!collect() && tries++ < 250) { chunkTimer = setTimeout(drain, 4); return; }
          measure();
          (function poll() {
            if (collect() || tries++ > 500) cb();
            else chunkTimer = setTimeout(poll, 4);
          })();
        })();
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        renderPass.draw(target || null, Object.assign(viewUniforms(s), {
          u_smooth: { int: s.smooth ? 1 : 0 }, u_ramp: ramp,
          u_mlo: mlo, u_mhi: mhi, u_lo: s.lo, u_hi: s.hi,
          u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
          u_bump: s.bump, u_lightAng: s.lightAng, u_bg: hexToRgb01(s.bg), u_dom: domStops(s, spec.n),
        }));
      }
      function status(extra) {
        const s = host.getState();
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          spec.status(s, { lo: mlo, hi: mhi, dt: dtEff }) +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s.steps);
        if (fence) { if (collect()) status(); }
        else if (measView !== s.view || stepCount - measStep >= 24) measure();
        render();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else settle(() => { render(); status(!s.running ? 'paused' : ''); });
      }
      // Run `total` steps in chunks sized to about 30 ms each, painting progress a few times a second
      // unless the viewer prefers reduced motion. The result depends only on the total, never on the chunking.
      function burst(total) {
        stop();
        let left = total, chunkN = 16;
        const animate = !host.reducedMotion();
        lastPaint = performance.now();
        (function chunk() {
          const n = Math.min(chunkN, left); left -= n;
          const t0 = performance.now();
          step(n);
          const ms = Math.max(performance.now() - t0, 0.5);
          chunkN = Math.round(U.clamp(n * 30 / ms, 8, 128));
          if (fence) collect();
          else if (stepCount - measStep >= 150) measure();
          if (left > 0) {
            if (animate && performance.now() - lastPaint > 120) { render(); status('warming up'); lastPaint = performance.now(); }
            chunkTimer = setTimeout(chunk, 0);
          } else settle(() => { render(); status(); startLoop(); });
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
          stop(); stepCount = 0; measStep = -1; measView = ''; measOK = false;
          const s = host.getState();
          const rng = U.makeRng(s.seed + '/' + spec.id + '/off');
          nOff = rng.range(0, 900);
          ensureGrid(s);
          upload(C.read, spec.seed(s, gw, gh));
          settle(() => { render(); if (s.warmup > 0) burst(s.warmup); else { status(); startLoop(); } });
        },
        repaint() {
          if (!C) return;
          if (!raf && host.getState().view !== measView) settle(render);
          else render();
        },
        live(key) { if (key === 'running') startLoop(); else if (!raf) startLoop(); },
        resize() { if (C) render(); },
        pause() { stop(); },
        resume() { if (C) { render(); startLoop(); } },
        action(key) {
          if (key === 'reseed') this.regenerate();
          else if (key === 'burst') burst(400);
        },
        disturb(p) {
          if (!C || !splatPass) return;
          splatPass.draw(C.write, {
            u_src: C.read, u_pos: [p.x, p.yGL],
            u_add: spec.pokeAdd, u_rad: spec.pokeRad, u_amt: 1, u_mode: { int: spec.pokeMode == null ? 1 : spec.pokeMode },
          });
          C.swap(); render(); startLoop();
        },
        // The species concentrations for research use, read back unrounded from the state texture.
        async exportData() {
          if (!C) throw new Error('nothing to export');
          const s = host.getState(), st = G.readTarget(C.read), n = gw * gh, k = spec.n;
          const species = new Float32Array(n * k);
          for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) species[i * k + c] = st[i * 4 + c];
          return {
            arrays: { species: { data: species, shape: [gh, gw, k], description: k + ' species in state-texture channel order (the order of the equation)' } },
            meta: { tab: spec.id, grid: [gw, gh], species: k, units: 'the model\'s dimensionless units on the step shader\'s lattice', boundary: 'periodic',
              steps: stepCount, dt: s.dt, precision: texType },
          };
        },
        async exportPNG(w, h) {
          if (!C) throw new Error('nothing to export');
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
    };
  }

  // ---- shared schema pieces ----
  const GRID = [
    { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512'], [768, '768'], [1024, '1024']] },
    { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
    { group: 'Grid', key: 'lap', label: 'Laplacian', type: 'seg', kind: LIVE, options: [[5, '5-point'], [9, '9-point']],
      hint: 'The 9-point stencil is more isotropic (rounder spots, cleaner hexagons) and tolerates a time step about 1.5 times larger.' },
  ];
  function scaleField(min, max, def) {
    return RANGE('Grid', 'scale', 'Cells per length unit', LIVE, min, max, 0.05, f2, {
      hint: 'Resolution of the physics: how many cells one length unit of the equations spans. Higher is finer and slower (the stable time step shrinks with the square of this number). Default ' + def + '.' });
  }
  function simFields(dtMin, dtMax, dtStep, warmMax) {
    return [
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 24, 1, String),
      RANGE('Simulation', 'dt', 'Time step', LIVE, dtMin, dtMax, dtStep, f4, {
        hint: 'Forward Euler. The step is clamped against the diffusion limit dx²/(4·Dmax) and against the stiffest reaction term; the status line shows the step actually used.' }),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, warmMax, 50, String),
      RANGE('Simulation', 'noise', 'Noise', LIVE, 0, 0.1, 0.002, f3),
      { group: 'Simulation', key: 'burst', label: 'Run 400 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },
    ];
  }
  function pictureFields(views) {
    return [
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true, options: views },
      RANGE('Picture', 'lo', 'Black point', PAINT, -0.5, 0.9, 0.01, f2, {
        hint: 'In measured units: 0 is the 3rd percentile of the field, 1 the 97th. Exposure is read from the field, not from a formula.' }),
      RANGE('Picture', 'hi', 'White point', PAINT, 0.1, 1.5, 0.01, f2),
      RANGE('Picture', 'bump', 'Relief', PAINT, 0.5, 12, 0.1, f1, { dimUnless: s => s.view === 'shade' }),
      RANGE('Picture', 'lightAng', 'Light angle', PAINT, 0, 360, 5, v => v + '°', { dimUnless: s => s.view === 'shade' }),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
      { group: 'Picture', key: 'smooth', label: 'Smooth cells', type: 'toggle', kind: PAINT },
    ];
  }
  const PICTURE_DEFAULTS = { lo: 0, hi: 1, bump: 4, lightAng: 35, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.05, smooth: true };
  function surprisePicture(rng, views) {
    return {
      view: rng.pick(views), lo: 0, hi: 1, bump: rng.range(3, 8), lightAng: rng.int(0, 360),
      exposure: rng.range(0.92, 1.12), gamma: rng.range(0.85, 1.2), contrast: rng.range(0.95, 1.2),
      grain: rng.pick([0, 0.05, 0.08]), smooth: true,
    };
  }
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  function gridClamp(s) { s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024); }
  // minimal-image offsets on the torus
  function wrapD(d, n) { if (d > n / 2) d -= n; else if (d < -n / 2) d += n; return d; }
  function blank(W, H, u, v, w) {
    const data = new Float32Array(W * H * 4);
    for (let i = 0; i < W * H; i++) { data[i * 4] = u; data[i * 4 + 1] = v; data[i * 4 + 2] = w || 0; data[i * 4 + 3] = 1; }
    return data;
  }
  function paintDisk(data, W, H, cx, cy, R, ch, val) {
    const x0 = Math.floor(cx - R - 1), x1 = Math.ceil(cx + R + 1), y0 = Math.floor(cy - R - 1), y1 = Math.ceil(cy + R + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (Math.hypot(x - cx, y - cy) > R) continue;
      const xi = ((x % W) + W) % W, yi = ((y % H) + H) % H;
      data[(yi * W + xi) * 4 + ch] = val;
    }
  }

  /* ---------- Excitable Media ---------- */
  // Rest state of FHN in the form v_t = eps(u - a v - b): the lowest root of u - a(u - u^3) - b = 0.
  function fhnRest(a, b) {
    const f = u => u - a * (u - u * u * u) - b;
    let lo = -3, flo = f(lo);
    for (let u = -3 + 0.01; u <= 3.001; u += 0.01) {
      const fu = f(u);
      if ((flo <= 0 && fu >= 0) || (flo >= 0 && fu <= 0)) {
        let A = lo, B = u, fa = flo;
        for (let i = 0; i < 40; i++) { const m = 0.5 * (A + B), fm = f(m); if ((fa <= 0 && fm >= 0) || (fa >= 0 && fm <= 0)) B = m; else { A = m; fa = fm; } }
        const r = 0.5 * (A + B);
        return [r, r - r * r * r];
      }
      lo = u; flo = fu;
    }
    return [-1, 0];
  }
  function excRest(s) { return s.model === 'fhn' ? fhnRest(s.fa, s.fb) : [0, 0]; }
  function excDtMax(s) {
    const c = Number(s.scale) || 1, lap9 = Number(s.lap) === 9;
    if (s.model === 'fhn') return Math.min(dtDiff(Math.max(1, s.fD), c, lap9), 0.25);
    return Math.min(dtDiff(Math.max(1, s.D), c, lap9), 0.6 * s.eps);
  }
  function seedExcitable(s, W, H) {
    const rng = U.makeRng(s.seed + '/excitable');
    const [u0, v0] = excRest(s);
    const barkley = s.model !== 'fhn';
    const uEx = barkley ? 1 : 1.3, vRef = barkley ? 0.9 : v0 + 0.7;
    const c = Number(s.scale) || 1;
    const data = blank(W, H, u0, v0);
    const fw = Math.max(3, Math.round((barkley ? 1.6 : 2.2) * c)), tail = fw * 4;
    const k = Math.max(1, Math.round(s.fronts));
    if (s.init === 'spiral') {
      for (let f = 0; f < k; f++) {
        const cx = rng() * W, cy = rng() * H, th = rng() * TAU, L = rng.range(0.18, 0.32) * Math.min(W, H);
        const ct = Math.cos(th), st = Math.sin(th);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const dx = wrapD(x - cx, W), dy = wrapD(y - cy, H);
          const p = dx * ct + dy * st, q = -dx * st + dy * ct;
          if (Math.abs(q) > L) continue;
          const i = (y * W + x) * 4;
          if (p >= 0 && p < fw) data[i] = uEx;
          else if (p < 0 && p >= -tail) data[i + 1] = vRef;
        }
      }
    } else if (s.init === 'target') {
      for (let f = 0; f < k; f++) paintDisk(data, W, H, rng() * W, rng() * H, Math.max(3, 2.2 * c), 0, uEx);
    } else if (s.init === 'scatter') {
      const n = rng.int(10, 24);
      for (let f = 0; f < n; f++) {
        const cx = rng() * W, cy = rng() * H, R = rng.range(1.2, 2.6) * Math.max(1.5, c);
        paintDisk(data, W, H, cx, cy, R, 0, uEx);
        if (rng() < 0.6) paintDisk(data, W, H, cx + rng.range(-1, 1) * R * 2, cy + rng.range(-1, 1) * R * 2, R * 1.4, 1, vRef);
      }
    }
    if (s.amp > 0) for (let i = 0; i < W * H; i++) data[i * 4] += (rng() * 2 - 1) * s.amp;
    return data;
  }
  Studio.register({
    id: 'excitable',
    name: 'Excitable Media',
    subtitle: 'spirals, targets and wave turbulence · 1991',
    order: 54,
    equation: 'Barkley: ∂u/∂t = ∇²u + u(1−u)(u − (v+b)/a)/ε,  ∂v/∂t = u − v;   FHN: ∂u/∂t = ∇²u + u − u³ − v,  ∂v/∂t = D∇²v + ε(u − a v − b)',
    credit: 'Richard FitzHugh, Biophysical Journal 1, 445 (1961); Jin-ichi Nagumo, Suguru Arimoto and Shuji Yoshizawa, Proceedings of the IRE 50, 2061 (1962); Dwight Barkley, Physica D 49, 61 (1991). FitzHugh reduced the Hodgkin-Huxley neuron to a fast activator u and a slow recovery variable v; Nagumo built it as a circuit. Barkley wrote the same excitable kinetics as a cubic with a threshold that the recovery variable raises, chosen so that spiral waves can be computed fast. Both are the standard models of spiral waves in heart tissue and in the Belousov-Zhabotinsky reaction.',
    blurb: 'An excitable medium is quiet until it is pushed past a threshold, then it fires, then it must rest before it can fire again. Put a wave in it and the wave runs; break the wave and its free end curls into a spiral that never stops. That is the picture in a Petri dish of Belousov-Zhabotinsky reagent and on the surface of a fibrillating heart. The seed lays broken wavefronts across the plate, each with a refractory tail on one side so the tip has somewhere to turn. In the Barkley model ε is how fast the medium fires, a and b set the threshold; push b up and the spirals meander and break into turbulence. The FitzHugh-Nagumo switch gives the slower classic kinetics, and with the recovery variable diffusing much faster than the activator (D large) the same equations stop making waves and grow labyrinths instead.',
    schema: GRID.concat([scaleField(1, 5, '2.5')]).concat([
      { group: 'Model', key: 'model', label: 'Model', type: 'seg', kind: LIVE, options: [['barkley', 'Barkley'], ['fhn', 'FitzHugh-Nagumo']] },
      RANGE('Model', 'a', 'Barkley a', LIVE, 0.3, 1.2, 0.01, f2, { dimUnless: s => s.model === 'barkley',
        hint: 'a sets the excitation threshold (v+b)/a. Smaller a raises the threshold; below about 0.5 nothing propagates.' }),
      RANGE('Model', 'b', 'Barkley b', LIVE, 0, 0.2, 0.005, f3, { dimUnless: s => s.model === 'barkley',
        hint: 'b is the threshold at rest. Around 0.01 spirals rotate rigidly; raise it and the tip meanders, then the arms break.' }),
      RANGE('Model', 'eps', 'Barkley ε', LIVE, 0.005, 0.12, 0.001, f3, { dimUnless: s => s.model === 'barkley',
        hint: 'ε is the ratio of the recovery time to the excitation time. Small ε: sharp fast fronts. Large ε: fat slow pulses.' }),
      RANGE('Model', 'D', 'Recovery diffusion', LIVE, 0, 2, 0.05, f2, { dimUnless: s => s.model === 'barkley' }),
      RANGE('Model', 'fa', 'FHN a', LIVE, 0, 3, 0.05, f2, { dimUnless: s => s.model === 'fhn',
        hint: 'a is the slope of the recovery nullcline. a = 0.5 with b = −0.7 is excitable; a = 2 with b = −0.1 is bistable and makes labyrinths when D is large.' }),
      RANGE('Model', 'fb', 'FHN b', LIVE, -1.2, 1.2, 0.02, f2, { dimUnless: s => s.model === 'fhn' }),
      RANGE('Model', 'feps', 'FHN ε', LIVE, 0.005, 0.5, 0.005, f3, { dimUnless: s => s.model === 'fhn' }),
      RANGE('Model', 'fD', 'FHN D', LIVE, 0, 6, 0.1, f1, { dimUnless: s => s.model === 'fhn',
        hint: 'Diffusion of the recovery variable relative to the activator. Zero for waves; 3 to 5 for the Turing-like labyrinths of Hagberg and Meron.' }),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['spiral', 'Broken fronts'], ['target', 'Point sources'], ['scatter', 'Scatter'], ['flat', 'Rest']] },
      RANGE('Seeding', 'fronts', 'Fronts or sources', GEOM, 1, 5, 1, String),
      RANGE('Seeding', 'amp', 'Seed noise', GEOM, 0, 0.3, 0.01, f2),
    ]).concat(simFields(0.001, 0.12, 0.0005, 4000)).concat(pictureFields([
      ['u', 'Activator u'], ['v', 'Recovery v'], ['diff', 'u − v'], ['grad', 'Fronts'], ['shade', 'Relief'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: Object.assign({
      grid: 512, aspect: '1:1', lap: 5, scale: 2.5,
      model: 'barkley', a: 0.75, b: 0.01, eps: 0.02, D: 0,
      fa: 0.5, fb: -0.7, feps: 0.1, fD: 0,
      init: 'spiral', fronts: 2, amp: 0.01,
      running: true, steps: 6, dt: 0.012, warmup: 900, noise: 0,
      view: 'u', seed: 'barkley-1991',
    }, PICTURE_DEFAULTS),
    presets: {
      spirals: pre('Spiral pair', { model: 'barkley', a: 0.75, b: 0.01, eps: 0.02, D: 0, init: 'spiral', fronts: 2, view: 'u', warmup: 900, scale: 2.5 }, Pal.ember),
      meander: pre('Meander', { model: 'barkley', a: 0.7, b: 0.05, eps: 0.02, D: 0, init: 'spiral', fronts: 1, view: 'v', warmup: 1200, scale: 2.5 }, Pal.thermal),
      breakup: pre('Breakup turbulence', { model: 'barkley', a: 1.1, b: 0.19, eps: 0.02, D: 0, init: 'spiral', fronts: 3, view: 'u', warmup: 1500, scale: 2 }, Pal.nightshade),
      targets: pre('Target waves', { model: 'barkley', a: 0.75, b: 0.01, eps: 0.02, D: 0, init: 'target', fronts: 4, view: 'v', warmup: 700, scale: 2.5 }, Pal.glacier),
      fhn: pre('FHN spiral', { model: 'fhn', fa: 0.5, fb: -0.7, feps: 0.1, fD: 0, init: 'spiral', fronts: 2, view: 'u', warmup: 1500, scale: 3, dt: 0.025 }, Pal.harbor),
      labyrinth: pre('Labyrinth', { model: 'fhn', fa: 2, fb: -0.1, feps: 0.05, fD: 4, init: 'scatter', fronts: 3, view: 'u', warmup: 1800, scale: 1.5, dt: 0.025 }, Pal.graphite),
      relief: pre('Relief', { model: 'barkley', a: 0.75, b: 0.02, eps: 0.02, D: 0, init: 'spiral', fronts: 3, view: 'shade', bump: 6, warmup: 900, scale: 2.5 }, Pal.xray),
    },
    closedGroups: ['Seeding'],
    hints: {
      Model: 'Barkley is fast and made for spirals: ε is the speed, b the threshold. FitzHugh-Nagumo is the classic neuron reduction; with D large it makes labyrinths instead of waves.',
      Seeding: 'Broken fronts is the spiral recipe: an excited strip with a refractory tail, ends free. Point sources fire once each. Scatter is a shower of excited spots for wave chaos.',
      Picture: 'Activator u is the fast field, the wave itself. Recovery v is the slow tail that follows it. Fronts is |∇u|, the leading and trailing edges only.',
    },
    palette: true, defaultPalette: 'ember', paletteLabel: 'Colors (rest → excited)',
    headline: 'eps', headlineLabel: 'ε',
    sanitize(s) {
      gridClamp(s);
      s.dt = U.clamp(Math.min(Number(s.dt) || 0.012, excDtMax(s)), 0.0005, 0.12);
    },
    surprise(rng) {
      const model = rng.pick(['barkley', 'barkley', 'barkley', 'fhn']);
      const p = {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']), lap: rng.pick([5, 5, 9]),
        model, scale: model === 'fhn' ? rng.range(2.5, 3.5) : rng.range(2, 3.2),
        a: rng.range(0.65, 0.9), b: rng.pick([0.01, 0.02, 0.04, 0.06]), eps: rng.pick([0.015, 0.02, 0.03, 0.06]), D: 0,
        fa: 0.5, fb: -0.7, feps: rng.pick([0.08, 0.1, 0.15]), fD: 0,
        init: rng.pick(['spiral', 'spiral', 'target', 'scatter']), fronts: rng.int(1, 4), amp: rng.pick([0, 0.01, 0.03]),
        running: true, steps: rng.int(4, 8), dt: 0.012, warmup: rng.int(700, 1400), noise: rng.pick([0, 0, 0.01]),
      };
      if (model === 'fhn') { p.dt = 0.025; if (rng() < 0.35) { p.fa = 2; p.fb = -0.1; p.feps = 0.05; p.fD = rng.range(3, 5); p.init = 'scatter'; p.scale = 1.5; p.warmup = rng.int(1600, 2200); } }
      return Object.assign(p, surprisePicture(rng, ['u', 'u', 'v', 'shade']));
    },
    create: rdxCreate({
      id: 'excitable', stepFS: STEP_EXC, n: 2, prim: 0, sec: 1,
      views: { u: 0, v: 1, diff: 4, grad: 5, shade: 6 },
      pokeAdd: [1, 0, 0, 0], pokeRad: 0.05, pokeMode: 1,
      dtMax: excDtMax,
      stepUniforms: s => s.model === 'fhn'
        ? { u_model: { int: 1 }, u_a: s.fa, u_b: s.fb, u_eps: s.feps, u_D: s.fD }
        : { u_model: { int: 0 }, u_a: s.a, u_b: s.b, u_eps: s.eps, u_D: s.D },
      status: (s, m) => {
        const name = s.model === 'fhn' ? 'FitzHugh-Nagumo' : 'Barkley';
        const eps = s.model === 'fhn' ? s.feps : s.eps;
        return '<span>' + name + ' · ε <b>' + eps.toFixed(3) + '</b></span><span>dt <b>' + m.dt.toFixed(4) + '</b></span>';
      },
      seed: seedExcitable,
    }),
  });

  /* ---------- Turing Patterns ---------- */
  const TUR_MODELS = { schnak: 0, bruss: 1, gm: 2, le: 3 };
  function turParams(s) {
    if (s.tmodel === 'bruss') return [s.ba, s.bb, 0, 0];
    if (s.tmodel === 'gm') return [s.ga, s.gb, s.gc, s.gK];
    if (s.tmodel === 'le') return [s.la, s.lb, 0, 0];
    return [s.sa, s.sb, 0, 0];
  }
  function turKin(model, p, sig, u, v) {
    const a = p[0], b = p[1], c = p[2], K = p[3];
    if (model === 'bruss') return [a - (b + 1) * u + u * u * v, b * u - u * u * v];
    if (model === 'gm') { const vv = Math.max(v, 1e-3); return [a + u * u / (vv * (1 + K * u * u)) - b * u, u * u - c * v]; }
    if (model === 'le') { const q = u * v / (1 + u * u); return [a - u - 4 * q, sig * b * (u - q)]; }
    return [a - u + u * u * v, b - u * u * v];
  }
  function turRest(s) {
    const p = turParams(s);
    if (s.tmodel === 'bruss') return [p[0], p[1] / p[0]];
    if (s.tmodel === 'le') { const u = p[0] / 5; return [u, 1 + u * u]; }
    if (s.tmodel === 'gm') {
      const a = p[0], b = p[1], c = p[2], K = p[3];
      let u = (a + c) / b;
      for (let i = 0; i < 60; i++) {
        const q = 1 + K * u * u, g = a + c / q - b * u, dg = -2 * K * u * c / (q * q) - b;
        u -= g / dg;
        if (u < 1e-3) u = 1e-3;
      }
      return [u, u * u / c];
    }
    return [p[0] + p[1], p[1] / ((p[0] + p[1]) * (p[0] + p[1]))];
  }
  // Linear theory at the uniform state: Turing band and the critical wavelength in cells.
  function turInfo(s) {
    const p = turParams(s), [u0, v0] = turRest(s), h = 1e-4;
    const kin = (u, v) => turKin(s.tmodel, p, s.lsig, u, v);
    const f0 = kin(u0, v0), fu = (kin(u0 + h, v0)[0] - f0[0]) / h, fv = (kin(u0, v0 + h)[0] - f0[0]) / h;
    const gu = (kin(u0 + h, v0)[1] - f0[1]) / h, gv = (kin(u0, v0 + h)[1] - f0[1]) / h;
    const Dv = s.tmodel === 'le' ? s.lsig * s.D : s.D, Du = 1;
    const det = fu * gv - fv * gu, tr = fu + gv;
    const turing = det > 0 && (Dv * fu + Du * gv) > 2 * Math.sqrt(Math.max(Du * Dv * det, 0));
    const lam = det > 0 ? TAU / Math.sqrt(Math.sqrt(det / (Du * Dv))) * (Number(s.scale) || 1) : 0;
    return { turing, hopf: tr > 0, lam, u0, v0 };
  }
  function turDtMax(s) {
    const c = Number(s.scale) || 1, lap9 = Number(s.lap) === 9;
    const Dv = s.tmodel === 'le' ? s.lsig * s.D : s.D;
    const react = s.tmodel === 'le' ? 0.5 / Math.max(s.lsig * s.lb, 1) : s.tmodel === 'bruss' ? 0.5 / (s.bb + 1) : 0.25;
    return Math.min(dtDiff(Math.max(1, Dv), c, lap9), react);
  }
  function seedTuring(s, W, H) {
    const rng = U.makeRng(s.seed + '/turing');
    const [u0, v0] = turRest(s);
    const data = blank(W, H, u0, v0);
    const amp = s.amp;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let m = 1 + amp * (rng() * 2 - 1);
      if (s.init === 'band') m *= 1 + 0.35 * Math.sin((x / W) * TAU * 4 + 0.6 * Math.sin((y / H) * TAU));
      data[i] = u0 * m;
      data[i + 1] = v0 * (1 + amp * 0.5 * (rng() * 2 - 1));
    }
    if (s.init === 'spots') {
      const k = rng.int(5, 11);
      for (let f = 0; f < k; f++) paintDisk(data, W, H, rng() * W, rng() * H, rng.range(2, 4) * Math.max(1, s.scale), 0, u0 * 2.2);
    }
    return data;
  }
  Studio.register({
    id: 'turing',
    name: 'Turing Patterns',
    subtitle: 'spots, stripes and hexagons from two chemicals · 1952',
    order: 62,
    equation: 'Schnakenberg: ∂u/∂t = ∇²u + a − u + u²v,  ∂v/∂t = D∇²v + b − u²v;   Brusselator: ∂u/∂t = ∇²u + a − (b+1)u + u²v,  ∂v/∂t = D∇²v + bu − u²v',
    credit: 'Alan Turing, Philosophical Transactions of the Royal Society B 237, 37 (1952). J. Schnakenberg, Journal of Theoretical Biology 81, 389 (1979). Ilya Prigogine and René Lefever, Journal of Chemical Physics 48, 1695 (1968), the Brusselator. Alfred Gierer and Hans Meinhardt, Kybernetik 12, 30 (1972), activator-inhibitor with saturation. István Lengyel and Irving Epstein, Science 251, 650 (1991), the model of the chlorite-iodide-malonic acid reaction in which Turing patterns were first seen in a real chemistry.',
    blurb: 'Turing showed in 1952 that two chemicals that would settle to a dull uniform state on their own can break into a pattern when one of them diffuses much faster than the other: the fast inhibitor outruns the slow activator, so a rising bump starves its surroundings and the field organizes into spots or stripes with a wavelength the chemistry chooses. Four classic kinetics are here. Schnakenberg and the Brusselator are the textbook autocatalysts; the Brusselator is what Prigogine used to argue that chemistry can self-organize, and it is the one that most readily gives stripes, well above its threshold. Gierer-Meinhardt is the biology version, with a saturation term K that turns spots into stripes. Lengyel-Epstein is the kinetics of the reaction in which a Turing pattern was first photographed. The diffusion ratio D is the main dial: at large D the plate goes to spots, at moderate D to stripes and labyrinths. The status line reports the wavelength linear theory predicts, and whether the uniform state is inside the Turing band at all.',
    schema: GRID.concat([scaleField(0.3, 3, '0.6 to 1.5')]).concat([
      { group: 'Model', key: 'tmodel', label: 'Kinetics', type: 'seg', kind: LIVE, wrap: true,
        options: [['schnak', 'Schnakenberg'], ['bruss', 'Brusselator'], ['gm', 'Gierer-Meinhardt'], ['le', 'Lengyel-Epstein']] },
      RANGE('Model', 'D', 'Diffusion ratio D', LIVE, 1, 200, 0.5, f1, {
        hint: 'Inhibitor diffusion over activator diffusion. Every model needs D above a critical ratio before anything grows. Schnakenberg at D = 100 gives spots; the Brusselator patterns once b exceeds (1 + a/√D)², spots near that line and stripes well above it. Lengyel-Epstein: this is c, and σ multiplies it.' }),
      RANGE('Model', 'sa', 'a', LIVE, 0.01, 0.5, 0.005, f3, { dimUnless: s => s.tmodel === 'schnak' }),
      RANGE('Model', 'sb', 'b', LIVE, 0.3, 2, 0.01, f2, { dimUnless: s => s.tmodel === 'schnak' }),
      RANGE('Model', 'ba', 'a', LIVE, 0.5, 6, 0.05, f2, { dimUnless: s => s.tmodel === 'bruss' }),
      RANGE('Model', 'bb', 'b', LIVE, 1, 14, 0.05, f2, { dimUnless: s => s.tmodel === 'bruss',
        hint: 'Hopf at b = 1 + a². Keep b below that for stationary patterns.' }),
      RANGE('Model', 'ga', 'a (source)', LIVE, 0, 0.5, 0.005, f3, { dimUnless: s => s.tmodel === 'gm' }),
      RANGE('Model', 'gb', 'b (activator decay)', LIVE, 0.3, 2, 0.01, f2, { dimUnless: s => s.tmodel === 'gm' }),
      RANGE('Model', 'gc', 'c (inhibitor decay)', LIVE, 0.5, 4, 0.05, f2, { dimUnless: s => s.tmodel === 'gm',
        hint: 'The inhibitor must decay faster than the activator (c > b) or the uniform state oscillates.' }),
      RANGE('Model', 'gK', 'Saturation K', LIVE, 0, 0.6, 0.005, f3, { dimUnless: s => s.tmodel === 'gm',
        hint: 'K = 0: spots. Saturation caps the activator peak so the spots stretch into stripes. It also lowers the Turing threshold, so stripes want a small source a and a large D; the status line says whether the uniform state is still unstable.' }),
      RANGE('Model', 'la', 'a', LIVE, 7, 20, 0.1, f1, { dimUnless: s => s.tmodel === 'le' }),
      RANGE('Model', 'lb', 'b', LIVE, 0.1, 1.5, 0.01, f2, { dimUnless: s => s.tmodel === 'le' }),
      RANGE('Model', 'lsig', 'σ', LIVE, 5, 60, 1, String, { dimUnless: s => s.tmodel === 'le' }),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM,
        options: [['noise', 'Noise'], ['spots', 'Spots'], ['band', 'Bands']] },
      RANGE('Seeding', 'amp', 'Seed noise', GEOM, 0.01, 0.6, 0.01, f2),
    ]).concat(simFields(0.0005, 0.05, 0.0005, 6000)).concat(pictureFields([
      ['u', 'Activator u'], ['v', 'Inhibitor v'], ['diff', 'u − v'], ['grad', 'Edges'], ['shade', 'Relief'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: Object.assign({
      grid: 512, aspect: '1:1', lap: 9, scale: 0.6,
      tmodel: 'schnak', D: 100, sa: 0.1, sb: 0.9, ba: 2, bb: 3, ga: 0.02, gb: 1, gc: 1.5, gK: 0, la: 10, lb: 0.2, lsig: 20,
      init: 'noise', amp: 0.25,
      running: true, steps: 8, dt: 0.01, warmup: 1500, noise: 0,
      view: 'u', seed: 'turing-1952',
    }, PICTURE_DEFAULTS),
    presets: {
      spots: pre('Spots', { tmodel: 'schnak', D: 100, sa: 0.1, sb: 0.9, scale: 0.6, init: 'noise', view: 'u', warmup: 1500, lap: 9 }, Pal.verdigris),
      stripes: pre('Stripes', { tmodel: 'bruss', D: 8, ba: 4.5, bb: 9, scale: 2, init: 'noise', view: 'u', warmup: 1500, lap: 9 }, Pal.graphite),
      bruss: pre('Brusselator honeycomb', { tmodel: 'bruss', D: 10, ba: 2, bb: 3.6, scale: 1.5, init: 'noise', view: 'v', warmup: 1500, lap: 9 }, Pal.kiln),
      gmspots: pre('Gierer-Meinhardt spots', { tmodel: 'gm', D: 40, ga: 0.02, gb: 1, gc: 1.5, gK: 0, scale: 0.8, init: 'noise', view: 'u', warmup: 1500, lap: 9 }, Pal.petri),
      gmstripes: pre('Saturated stripes', { tmodel: 'gm', D: 60, ga: 0.005, gb: 1, gc: 1.2, gK: 0.2, scale: 0.7, init: 'noise', view: 'u', warmup: 2200, lap: 9 }, Pal.harbor),
      cima: pre('CIMA', { tmodel: 'le', D: 1.5, la: 10, lb: 0.2, lsig: 20, scale: 1.1, init: 'noise', view: 'u', warmup: 2000, lap: 9 }, Pal.thermal),
      relief: pre('Hexagonal relief', { tmodel: 'schnak', D: 100, sa: 0.1, sb: 0.9, scale: 0.6, init: 'noise', view: 'shade', bump: 6, warmup: 1500, lap: 9 }, Pal.xray),
    },
    closedGroups: ['Seeding'],
    hints: {
      Model: 'Only the sliders of the chosen kinetics matter; the rest are dimmed. D is the dial in every model: it has to exceed a critical ratio for any pattern, and the higher it goes the more the plate prefers spots.',
      Picture: 'Activator u peaks are the spots. The inhibitor v is its negative, smoother. Edges is |∇u|, the outline of every spot.',
    },
    palette: true, defaultPalette: 'verdigris', paletteLabel: 'Colors (low → high)',
    headline: 'D', headlineLabel: 'diffusion ratio D',
    sanitize(s) {
      gridClamp(s);
      s.dt = U.clamp(Math.min(Number(s.dt) || 0.01, turDtMax(s)), 0.0002, 0.05);
    },
    surprise(rng) {
      const tmodel = rng.pick(['schnak', 'schnak', 'bruss', 'gm', 'gm', 'le']);
      const p = {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']), lap: 9,
        tmodel, D: 100, scale: 0.6, sa: 0.1, sb: 0.9, ba: 2, bb: 3, ga: 0.02, gb: 1, gc: 1.5, gK: 0, la: 10, lb: 0.2, lsig: 20,
        init: rng.pick(['noise', 'noise', 'spots', 'band']), amp: rng.range(0.15, 0.4),
        running: true, steps: 8, dt: 0.01, warmup: rng.int(1400, 2400), noise: 0,
      };
      if (tmodel === 'schnak') { p.D = rng.pick([30, 45, 60, 100, 140]); p.scale = rng.range(0.55, 0.9); p.sb = rng.range(0.8, 1.1); }
      else if (tmodel === 'bruss') {
        if (rng() < 0.5) { p.D = 8; p.ba = 4.5; p.bb = rng.range(8, 10); p.scale = rng.range(1.8, 2.4); }
        else { p.D = rng.range(9, 14); p.bb = rng.range(3.2, 4.2); p.scale = rng.range(1.2, 1.8); }
      }
      else if (tmodel === 'gm') {
        p.gK = rng.pick([0, 0, 0.1, 0.2, 0.3]);
        if (p.gK > 0) { p.D = rng.range(45, 70); p.ga = 0.005; p.gc = 1.2; p.scale = rng.range(0.6, 0.8); p.warmup = rng.int(2200, 3000); }
        else { p.D = rng.range(30, 50); p.scale = rng.range(0.7, 1); }
      }
      else { p.D = rng.range(1.2, 2.2); p.lb = rng.range(0.18, 0.3); p.scale = rng.range(0.9, 1.4); }
      return Object.assign(p, surprisePicture(rng, ['u', 'u', 'v', 'shade']));
    },
    create: rdxCreate({
      id: 'turing', stepFS: STEP_TUR, n: 2, prim: 0, sec: 1,
      views: { u: 0, v: 1, diff: 4, grad: 5, shade: 6 },
      pokeAdd: [0.6, 0, 0, 0], pokeRad: 0.05, pokeMode: 1,
      dtMax: turDtMax,
      stepUniforms: s => ({ u_model: { int: TUR_MODELS[s.tmodel] || 0 }, u_p: turParams(s), u_D: s.D, u_sig: s.lsig }),
      status: (s, m) => {
        const info = turInfo(s);
        const names = { schnak: 'Schnakenberg', bruss: 'Brusselator', gm: 'Gierer-Meinhardt', le: 'Lengyel-Epstein' };
        const band = info.hopf ? 'Hopf unstable' : info.turing ? 'λ ≈ ' + info.lam.toFixed(0) + ' cells' : 'below the Turing threshold';
        return '<span>' + (names[s.tmodel] || '') + ' · D <b>' + s.D.toFixed(1) + '</b></span><span>' + band + '</span>';
      },
      seed: seedTuring,
    }),
  });

  /* ---------- Cyclic Competition ---------- */
  function cycDtMax(s) {
    const c = Number(s.scale) || 1, lap9 = Number(s.lap) === 9;
    return Math.min(dtDiff(Math.max(0.05, s.D), c, lap9), 0.2);
  }
  function seedCyclic(s, W, H) {
    const rng = U.makeRng(s.seed + '/cyclic');
    const p0 = 1 / (1 + s.a + s.b), amp = s.amp;
    const data = new Float32Array(W * H * 4);
    const k = Math.max(1, Math.round(s.fronts));
    const sites = [];
    for (let i = 0; i < (s.init === 'patches' ? k * 6 : k); i++) sites.push({ x: rng() * W, y: rng() * H, sp: i % 3, rot: rng() * TAU, dir: rng() < 0.5 ? 1 : -1 });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let u = p0, v = p0, w = p0;
      if (s.init === 'sectors' || s.init === 'patches') {
        let best = 0, bd = 1e12;
        for (let j = 0; j < sites.length; j++) {
          const dx = wrapD(x - sites[j].x, W), dy = wrapD(y - sites[j].y, H), d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = j; }
        }
        let sp = sites[best].sp;
        if (s.init === 'sectors') {
          const dx = wrapD(x - sites[best].x, W), dy = wrapD(y - sites[best].y, H);
          const ang = Math.atan2(dy, dx) * sites[best].dir + sites[best].rot;
          sp = ((Math.floor(ang / TAU * 3) % 3) + 3) % 3;
        }
        u = sp === 0 ? 0.8 : 0.05; v = sp === 1 ? 0.8 : 0.05; w = sp === 2 ? 0.8 : 0.05;
      }
      data[i] = Math.max(0, u * (1 + amp * (rng() * 2 - 1)));
      data[i + 1] = Math.max(0, v * (1 + amp * (rng() * 2 - 1)));
      data[i + 2] = Math.max(0, w * (1 + amp * (rng() * 2 - 1)));
      data[i + 3] = 1;
    }
    return data;
  }
  Studio.register({
    id: 'cyclic',
    name: 'Cyclic Competition',
    subtitle: 'rock, paper, scissors in space · 2007',
    order: 31,
    equation: '∂u/∂t = D∇²u + u(1 − u − a v − b w),  ∂v/∂t = D∇²v + v(1 − v − a w − b u),  ∂w/∂t = D∇²w + w(1 − w − a u − b v)',
    credit: 'Robert May and Warren Leonard, SIAM Journal on Applied Mathematics 29, 243 (1975), the three-species competition with a heteroclinic cycle for a < 1 < b. Tobias Reichenbach, Mauro Mobilia and Erwin Frey, Nature 448, 1046 (2007), showed that mobility in the spatial rock-paper-scissors game organizes the populations into rotating spirals, and that biodiversity survives exactly when those spirals fit in the arena.',
    blurb: 'Three species each beat one neighbor and lose to the other: u outcompetes v, v outcompetes w, w outcompetes u, rock, paper, scissors. Without space the cycle spins ever wider until one species is left. With diffusion the same rule sends fronts across the plate, each species chasing the one it beats and fleeing the one that beats it, and the fronts wind into spirals whose arms carry all three colors in order. Reichenbach, Mobilia and Frey found that this is how mobile competitors keep their diversity: as long as the spiral wavelength fits inside the arena everyone survives. a and b are how hard each species is beaten and beats; the cycle needs a < 1 < b. D sets the wavelength. The dominance view paints each cell with the color of whichever species is winning there, so the spirals read as three-armed pinwheels.',
    schema: GRID.concat([scaleField(0.5, 4, '2')]).concat([
      RANGE('Competition', 'a', 'a (weak interaction)', LIVE, 0.2, 0.99, 0.01, f2, {
        hint: 'How much a species is held back by the one it beats. The cycle needs a < 1 < b; the closer a + b is to 2 the gentler the oscillation.' }),
      RANGE('Competition', 'b', 'b (strong interaction)', LIVE, 1.01, 3, 0.01, f2),
      RANGE('Competition', 'D', 'Mobility D', LIVE, 0.02, 2, 0.01, f2, {
        hint: 'Diffusion of all three species. The spiral wavelength grows with the square root of D. Reichenbach et al.: diversity is lost once the spirals outgrow the arena.' }),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM,
        options: [['sectors', 'Spiral cores'], ['patches', 'Patches'], ['noise', 'Noise']] },
      RANGE('Seeding', 'fronts', 'Cores', GEOM, 1, 12, 1, String),
      RANGE('Seeding', 'amp', 'Seed noise', GEOM, 0, 0.6, 0.01, f2),
    ]).concat(simFields(0.002, 0.2, 0.001, 6000)).concat(pictureFields([
      ['dom', 'Dominance'], ['u', 'Species u'], ['v', 'Species v'], ['w', 'Species w'], ['diff', 'u − v'], ['grad', 'Fronts'], ['shade', 'Relief'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: Object.assign({
      grid: 512, aspect: '1:1', lap: 5, scale: 2,
      a: 0.6, b: 1.6, D: 0.1,
      init: 'sectors', fronts: 4, amp: 0.05,
      running: true, steps: 6, dt: 0.1, warmup: 1500, noise: 0,
      view: 'dom', seed: 'rps-2007',
    }, PICTURE_DEFAULTS),
    presets: {
      pinwheels: pre('Pinwheels', { a: 0.6, b: 1.6, D: 0.1, init: 'sectors', fronts: 4, view: 'dom', warmup: 1500, scale: 2, dt: 0.1 }, Pal.triad),
      many: pre('Many cores', { a: 0.6, b: 1.6, D: 0.08, init: 'sectors', fronts: 10, view: 'dom', warmup: 1200, scale: 2, dt: 0.1 }, Pal.risograph),
      patches: pre('Patch war', { a: 0.5, b: 1.8, D: 0.1, init: 'patches', fronts: 4, view: 'dom', warmup: 1200, scale: 2, dt: 0.1 }, Pal.tram),
      noise: pre('From noise', { a: 0.7, b: 1.5, D: 0.1, init: 'noise', amp: 0.5, fronts: 3, view: 'dom', warmup: 2500, scale: 2, dt: 0.1 }, Pal.meadow),
      single: pre('One species', { a: 0.6, b: 1.6, D: 0.1, init: 'sectors', fronts: 4, view: 'u', warmup: 1500, scale: 2, dt: 0.1 }, Pal.glacier),
      relief: pre('Front relief', { a: 0.6, b: 1.6, D: 0.2, init: 'sectors', fronts: 4, view: 'shade', bump: 5, warmup: 1500, scale: 2, dt: 0.1 }, Pal.graphite),
    },
    closedGroups: ['Seeding'],
    hints: {
      Competition: 'a < 1 < b is the whole game: each species suppresses one rival strongly and the other weakly. D is the mobility, the wavelength of the spirals.',
      Seeding: 'Spiral cores seeds three sectors around each core, one species each, so every core spins from the first step. Patches is a random map of territories. Noise starts near coexistence and waits for the instability.',
      Picture: 'Dominance colors each cell by its winning species, three palette colors. The single-species views show one population as a density.',
    },
    palette: true, defaultPalette: 'triad', paletteLabel: 'Colors (three species)',
    headline: 'D', headlineLabel: 'mobility D',
    sanitize(s) {
      gridClamp(s);
      if (s.a >= 1) s.a = 0.99;
      if (s.b <= 1) s.b = 1.01;
      s.dt = U.clamp(Math.min(Number(s.dt) || 0.1, cycDtMax(s)), 0.001, 0.2);
    },
    surprise(rng) {
      const init = rng.pick(['sectors', 'sectors', 'patches', 'noise']);
      return Object.assign({
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']), lap: rng.pick([5, 9]),
        scale: rng.range(1.5, 2.5), a: rng.range(0.45, 0.8), b: rng.range(1.4, 2), D: rng.range(0.05, 0.25),
        init, fronts: init === 'sectors' ? rng.int(1, 8) : rng.int(2, 6), amp: init === 'noise' ? rng.range(0.3, 0.6) : rng.range(0, 0.1),
        running: true, steps: rng.int(4, 8), dt: 0.1, warmup: init === 'noise' ? rng.int(2000, 3000) : rng.int(1000, 1800), noise: 0,
      }, surprisePicture(rng, ['dom', 'dom', 'dom', 'u', 'shade']));
    },
    create: rdxCreate({
      id: 'cyclic', stepFS: STEP_CYC, n: 3, prim: 0, sec: 1,
      views: { dom: 7, u: 0, v: 1, w: 2, diff: 4, grad: 5, shade: 6 },
      pokeAdd: [0.9, 0, 0, 0], pokeRad: 0.05, pokeMode: 1,
      dtMax: cycDtMax,
      stepUniforms: s => ({ u_a: s.a, u_b: s.b, u_D: s.D }),
      status: (s, m) => '<span>a <b>' + s.a.toFixed(2) + '</b> · b <b>' + s.b.toFixed(2) + '</b>' + (s.a + s.b > 2 ? ' · heteroclinic' : ' · stable coexistence') + '</span><span>dt <b>' + m.dt.toFixed(3) + '</b></span>',
      seed: seedCyclic,
    }),
  });

  /* ---------- Chemotaxis ---------- */
  function ksDtMax(s) {
    const c = Number(s.scale) || 1, lap9 = Number(s.lap) === 9;
    return Math.min(dtDiff(Math.max(1 + 0.6 * s.chi, s.D), c, lap9), 0.2);
  }
  function seedChemotaxis(s, W, H) {
    const rng = U.makeRng(s.seed + '/chemotaxis');
    const v0 = 1 / Math.max(s.a, 1e-3), amp = s.amp;
    const data = blank(W, H, s.init === 'noise' ? 1 : 0.02, s.init === 'noise' ? v0 : 0.02 * v0);
    if (s.init === 'colony') paintDisk(data, W, H, W / 2, H / 2, 0.14 * Math.min(W, H), 0, 1);
    else if (s.init === 'scatter') {
      const k = rng.int(6, 14);
      for (let f = 0; f < k; f++) paintDisk(data, W, H, rng() * W, rng() * H, rng.range(2, 5) * Math.max(1, s.scale), 0, 1);
    }
    for (let i = 0; i < W * H; i++) {
      data[i * 4] = Math.max(0, data[i * 4] * (1 + amp * (rng() * 2 - 1)));
      if (s.init !== 'noise') data[i * 4 + 1] = data[i * 4] * v0;
    }
    return data;
  }
  Studio.register({
    id: 'chemotaxis',
    name: 'Chemotaxis',
    subtitle: 'Keller-Segel aggregation · 1970',
    order: 71,
    equation: '∂u/∂t = ∇²u − ∇·(χ(u)∇v) + u(1 − u),   ∂v/∂t = D∇²v + u − a v,   χ(u) = c u/(1 + u²)',
    credit: 'Evelyn Keller and Lee Segel, Journal of Theoretical Biology 26, 399 (1970), the continuum model of slime mold amoebae climbing the gradient of a chemical they secrete. This form adds a sensitivity that saturates at high density and logistic growth, so aggregates stay finite instead of collapsing to points: the uniform state loses stability when 2√(aD) < c/2 − D − a.',
    blurb: 'Cells that secrete an attractant and crawl up its gradient cannot stay evenly spread. Wherever a few more cells gather, more attractant is made there, and more cells arrive: Keller and Segel wrote that feedback down for the amoebae of Dictyostelium streaming toward a common point before they build a fruiting body. In the plain model the collapse runs away to a singularity. Here the sensitivity χ(u) falls off in a crowd and the cells reproduce logistically, so the run-away stops at finite density and the plate settles into spots, worms and honeycombs of cells around pools of attractant. c is how strongly cells respond, a how fast the attractant decays, D how fast it spreads. The chemotactic flux is differenced conservatively across cell faces, so the total number of cells is exactly what growth and death make it.',
    schema: GRID.concat([scaleField(0.5, 4, '2.2')]).concat([
      RANGE('Cells', 'chi', 'Sensitivity c', LIVE, 0.5, 8, 0.05, f2, {
        hint: 'Chemotactic strength. Patterns need c/2 − D − a > 2√(aD); at the defaults that is c > 1.6. Around 3.3 to 3.6 the aggregates are spots and short worms.' }),
      RANGE('Cells', 'a', 'Attractant decay a', LIVE, 0.02, 1.5, 0.01, f2),
      RANGE('Cells', 'D', 'Attractant diffusion D', LIVE, 0.02, 3, 0.01, f2),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM,
        options: [['noise', 'Noise'], ['colony', 'Colony'], ['scatter', 'Scatter']] },
      RANGE('Seeding', 'amp', 'Seed noise', GEOM, 0, 0.6, 0.01, f2),
    ]).concat(simFields(0.001, 0.1, 0.0005, 6000)).concat(pictureFields([
      ['u', 'Cells u'], ['v', 'Attractant v'], ['diff', 'u − v'], ['grad', 'Edges'], ['shade', 'Relief'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: Object.assign({
      grid: 512, aspect: '1:1', lap: 9, scale: 2.2,
      chi: 3.5, a: 0.2, D: 0.2,
      init: 'noise', amp: 0.2,
      running: true, steps: 6, dt: 0.02, warmup: 1200, noise: 0,
      view: 'u', seed: 'keller-1970',
    }, PICTURE_DEFAULTS),
    presets: {
      spots: pre('Spots', { chi: 3.5, a: 0.2, D: 0.2, scale: 2.2, init: 'noise', view: 'u', warmup: 1200 }, Pal.petri),
      worms: pre('Worms', { chi: 3.3, a: 0.2, D: 0.2, scale: 2.2, init: 'noise', view: 'u', warmup: 1600 }, Pal.verdigris),
      honeycomb: pre('Honeycomb', { chi: 5, a: 0.25, D: 0.2, scale: 2, init: 'noise', view: 'v', warmup: 1400 }, Pal.bioluminescent),
      colony: pre('Colony', { chi: 3.6, a: 0.2, D: 0.2, scale: 2, init: 'colony', view: 'u', warmup: 2200 }, Pal.meadow),
      scatter: pre('Scattered founders', { chi: 3.6, a: 0.2, D: 0.3, scale: 2, init: 'scatter', view: 'u', warmup: 1800 }, Pal.harbor),
      relief: pre('Relief', { chi: 3.5, a: 0.2, D: 0.2, scale: 2.2, init: 'noise', view: 'shade', bump: 5, warmup: 1200 }, Pal.xray),
    },
    closedGroups: ['Seeding'],
    hints: {
      Cells: 'c is the pull of the gradient, a and D are the life and reach of the attractant. The instability condition is in the credit line; the status line says whether you are past it.',
      Seeding: 'Noise starts at the uniform density and lets the instability pick the pattern. Colony is one dense disk on empty ground: an invasion wave with aggregates forming behind it.',
      Picture: 'Cells u is the density, the print. Attractant v is smoother and follows the cells. Edges is |∇u|.',
    },
    palette: true, defaultPalette: 'petri', paletteLabel: 'Colors (sparse → dense)',
    headline: 'chi', headlineLabel: 'sensitivity c',
    sanitize(s) {
      gridClamp(s);
      s.dt = U.clamp(Math.min(Number(s.dt) || 0.02, ksDtMax(s)), 0.0005, 0.1);
    },
    surprise(rng) {
      const init = rng.pick(['noise', 'noise', 'colony', 'scatter']);
      return Object.assign({
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']), lap: 9,
        scale: rng.range(1.8, 2.6), chi: rng.range(3.1, 5.5), a: rng.range(0.15, 0.35), D: rng.range(0.12, 0.4),
        init, amp: rng.range(0.1, 0.3),
        running: true, steps: 6, dt: 0.02, warmup: init === 'noise' ? rng.int(1000, 1800) : rng.int(1800, 2600), noise: 0,
      }, surprisePicture(rng, ['u', 'u', 'v', 'shade']));
    },
    create: rdxCreate({
      id: 'chemotaxis', stepFS: STEP_KS, n: 2, prim: 0, sec: 1,
      views: { u: 0, v: 1, diff: 4, grad: 5, shade: 6 },
      pokeAdd: [0.8, 0, 0, 0], pokeRad: 0.05, pokeMode: 1,
      dtMax: ksDtMax,
      stepUniforms: s => ({ u_chi: s.chi, u_a: s.a, u_D: s.D }),
      status: (s, m) => {
        const unstable = 2 * Math.sqrt(s.a * s.D) < s.chi / 2 - s.D - s.a;
        return '<span>c <b>' + s.chi.toFixed(2) + '</b> · ' + (unstable ? 'aggregating' : 'uniform is stable') + '</span><span>dt <b>' + m.dt.toFixed(3) + '</b></span>';
      },
      seed: seedChemotaxis,
    }),
  });

  /* ---------- Vegetation Bands ---------- */
  function vegDtMax(s) {
    const c = Number(s.scale) || 1, lap9 = Number(s.lap) === 9;
    const diff = dtDiff(Math.max(s.Dw, s.Dn, 0.05), c, lap9);
    const adv = s.slope > 0 ? 0.8 / (s.slope * c) : 1;
    return Math.min(diff, adv, 0.5 / Math.max(s.m, 0.05), 0.25);
  }
  function seedVegetation(s, W, H) {
    const rng = U.makeRng(s.seed + '/vegetation');
    const data = blank(W, H, s.a, 0);
    const amp = s.amp;
    if (s.init === 'patches') {
      const k = rng.int(30, 70);
      for (let f = 0; f < k; f++) paintDisk(data, W, H, rng() * W, rng() * H, rng.range(1.5, 4) * Math.max(1, s.scale), 1, 1.4);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let n = data[i + 1];
      if (s.init === 'noise') n = 0.9 * (1 + amp * (rng() * 2 - 1));
      else if (s.init === 'stripes') n = Math.sin((x / W) * TAU * 7 + 0.4 * Math.sin((y / H) * TAU * 2)) > 0.2 ? 1.2 : 0.02;
      n *= 1 + amp * 0.5 * (rng() * 2 - 1);
      data[i + 1] = Math.max(0, n);
      data[i] = s.a / (1 + n * n);
    }
    return data;
  }
  Studio.register({
    id: 'vegetation',
    name: 'Vegetation Bands',
    subtitle: 'tiger bush on a dry hillside · 1999',
    order: 46,
    equation: '∂w/∂t = a − w − w n² + v ∂w/∂x + D_w∇²w,   ∂n/∂t = w n² − m n + ∇²n',
    credit: 'Christopher Klausmeier, Science 284, 1826 (1999). Water w rains in at rate a, evaporates, runs downhill at speed v and is taken up by plants n in proportion to n², because roots make the soil take water faster. Plants die at rate m and spread slowly. On a slope the model makes bands of vegetation perpendicular to the flow that creep uphill: the tiger bush of Niger, Australia and the Horn of Africa seen from the air. Diffusion of water is not in the original; here it is a small optional term.',
    blurb: 'On a dry hillside plants cannot cover the ground, so they line up. Rain runs downhill over bare crusted soil until it meets a band of bushes, which drink it; the downhill edge of the band starves and the uphill edge, which gets the runoff first, grows. The whole band walks uphill a few centimeters a year. Klausmeier put that into two equations, and in them the bands appear by themselves when rainfall a drops below a threshold that depends on the plant mortality m. Water flows toward the left of the plate. Rainfall increases from the bottom edge to the top, so one plate shows the whole transition: bare soil where it is driest, bands in the middle, and closed vegetation where it is wet enough. The plants view is the print; the water view shows the runoff that pools against each band.',
    schema: GRID.concat([scaleField(0.3, 3, '1')]).concat([
      RANGE('Hillside', 'a', 'Rainfall a', LIVE, 0.1, 3, 0.02, f2, {
        hint: 'Mean rainfall. Uniform vegetation needs a > 2m; below that only bands survive; far below, nothing does. Klausmeier: 0.94 to 2.81 for grass.' }),
      RANGE('Hillside', 'agrad', 'Rainfall gradient', LIVE, 0, 1, 0.02, f2, {
        hint: 'a varies linearly from a(1 − g) at the bottom edge to a(1 + g) at the top, so the plate spans bare, banded and uniform.' }),
      RANGE('Hillside', 'm', 'Plant mortality m', LIVE, 0.05, 1.2, 0.01, f2, {
        hint: 'Klausmeier: 0.45 for grass, 0.045 for trees. Higher m needs more rain; the tree value is slow, its bands take hundreds of time units to form.' }),
      RANGE('Hillside', 'slope', 'Slope (water speed v)', LIVE, 0, 120, 1, String, {
        hint: 'Downhill water speed. Klausmeier used 182.5 in these units. Zero is flat ground, where water diffusion has to do the work and the pattern becomes spots or a labyrinth.' }),
      RANGE('Hillside', 'Dw', 'Water diffusion', LIVE, 0, 40, 0.5, f1),
      RANGE('Hillside', 'Dn', 'Plant diffusion', LIVE, 0.2, 3, 0.05, f2),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM,
        options: [['noise', 'Noisy cover'], ['patches', 'Patches'], ['stripes', 'Stripes']] },
      RANGE('Seeding', 'amp', 'Seed noise', GEOM, 0, 0.8, 0.01, f2),
    ]).concat(simFields(0.001, 0.25, 0.001, 6000)).concat(pictureFields([
      ['v', 'Plants n'], ['u', 'Water w'], ['diff', 'w − n'], ['grad', 'Band edges'], ['shade', 'Relief'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: Object.assign({
      grid: 512, aspect: '1:1', lap: 5, scale: 1,
      a: 1.1, agrad: 0.6, m: 0.45, slope: 40, Dw: 1, Dn: 1,
      init: 'noise', amp: 0.5,
      running: true, steps: 8, dt: 0.02, warmup: 1800, noise: 0,
      view: 'v', seed: 'klausmeier-1999',
    }, PICTURE_DEFAULTS),
    presets: {
      tiger: pre('Tiger bush', { a: 1.1, agrad: 0.6, m: 0.45, slope: 40, Dw: 1, Dn: 1, scale: 1, lap: 5, init: 'noise', amp: 0.5, view: 'v', warmup: 1800, dt: 0.02 }, Pal.meadow),
      sparse: pre('Sparse bands: a = 0.75', { a: 0.75, agrad: 0, m: 0.45, slope: 40, Dw: 1, Dn: 1, scale: 1, lap: 5, init: 'stripes', amp: 0.3, view: 'v', warmup: 1800, dt: 0.02 }, Pal.kiln),
      steep: pre('Steep slope', { a: 1.1, agrad: 0.6, m: 0.45, slope: 100, Dw: 1, Dn: 1, scale: 0.8, lap: 5, init: 'noise', amp: 0.5, view: 'v', warmup: 1500, dt: 0.01 }, Pal.verdigris),
      gentle: pre('Gentle slope', { a: 0.9, agrad: 0.3, m: 0.45, slope: 12, Dw: 2, Dn: 1, scale: 1, lap: 5, init: 'noise', amp: 0.5, view: 'v', warmup: 1500, dt: 0.05 }, Pal.petri),
      flat: pre('Flat ground', { a: 0.95, agrad: 0.25, m: 0.45, slope: 0, Dw: 40, Dn: 1, scale: 0.5, lap: 9, init: 'noise', amp: 0.5, view: 'v', warmup: 2500, dt: 0.03 }, Pal.graphite),
      water: pre('Runoff', { a: 1.1, agrad: 0.6, m: 0.45, slope: 40, Dw: 1, Dn: 1, scale: 1, lap: 5, init: 'noise', amp: 0.5, view: 'u', warmup: 1800, dt: 0.02 }, Pal.glacier),
      relief: pre('Relief', { a: 1.1, agrad: 0.6, m: 0.45, slope: 40, Dw: 1, Dn: 1, scale: 1, lap: 5, init: 'noise', amp: 0.5, view: 'shade', bump: 6, lightAng: 20, warmup: 1800, dt: 0.02 }, Pal.xray),
    },
    closedGroups: ['Seeding'],
    hints: {
      Hillside: 'a against 2m decides whether closed cover can exist. v is the slope and sets the band spacing along with plant diffusion. The gradient turns the plate into a rainfall map.',
      Seeding: 'Noisy cover is full vegetation with noise, the way a wet decade would leave a hillside before a drought. Patches is scattered bushes on bare soil. Stripes starts the bands in place, which is how sparse bands survive rainfall too low for cover to take hold on its own.',
      Picture: 'Plants n is the aerial photograph. Water w is the runoff, brightest just downhill of each band. Band edges is |∇n|.',
    },
    palette: true, defaultPalette: 'meadow', paletteLabel: 'Colors (bare → dense)',
    headline: 'a', headlineLabel: 'rainfall a',
    sanitize(s) {
      gridClamp(s);
      s.dt = U.clamp(Math.min(Number(s.dt) || 0.02, vegDtMax(s)), 0.0005, 0.25);
    },
    surprise(rng) {
      const slope = rng.pick([12, 25, 40, 40, 60, 100]);
      return Object.assign({
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '3:2', '16:9']), lap: 5,
        scale: slope >= 60 ? 0.8 : rng.range(0.8, 1.2), a: slope <= 12 ? rng.range(0.85, 1) : rng.range(0.8, 1.4), agrad: rng.pick([0, 0.3, 0.6, 0.8]),
        m: rng.range(0.38, 0.5), slope, Dw: rng.pick([0.5, 1, 2]), Dn: 1,
        init: rng.pick(['noise', 'noise', 'patches', 'stripes']), amp: rng.range(0.3, 0.6),
        running: true, steps: 8, dt: 0.05, warmup: rng.int(1500, 2500), noise: 0,
      }, surprisePicture(rng, ['v', 'v', 'v', 'u', 'shade']));
    },
    create: rdxCreate({
      id: 'vegetation', stepFS: STEP_VEG, n: 2, prim: 1, sec: 0,
      views: { v: 1, u: 0, diff: 4, grad: 5, shade: 6 },
      pokeAdd: [0, 1, 0, 0], pokeRad: 0.05, pokeMode: 1,
      dtMax: vegDtMax,
      stepUniforms: s => ({ u_a: s.a, u_agrad: s.agrad, u_m: s.m, u_v: s.slope, u_Dw: s.Dw, u_Dn: s.Dn }),
      status: (s, m) => {
        const lo = s.a * (1 - s.agrad), hi = s.a * (1 + s.agrad);
        const regime = hi < 2 * s.m ? 'bands only' : lo > 2 * s.m ? 'closed cover possible' : 'bare → bands → cover';
        return '<span>a <b>' + lo.toFixed(2) + '–' + hi.toFixed(2) + '</b> · 2m = ' + (2 * s.m).toFixed(2) + ' · ' + regime + '</span><span>dt <b>' + m.dt.toFixed(3) + '</b></span>';
      },
      seed: seedVegetation,
    }),
  });
})();
