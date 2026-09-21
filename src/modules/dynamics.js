
/* modules/dynamics.js */
/* GENChase: holomorphic dynamics in the complex plane, the double pendulum flip-time map, and hydrogen orbital densities; per-pixel plates recomputed at print size in tiles. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const PI = Math.PI, TAU = U.TAU;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const deg = v => v + '°';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const ASPECT_FIELD = { group: 'Frame', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] };
  const TILE = 1024;             // largest tile side used for print exports; small enough that JS can run between tiles
  const MAX_SHEET = 268e6;       // largest pixel count a browser canvas will encode

  function hex01(hex) { const rgb = U.hexToRgb(hex || '#000000'); return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]; }
  const yieldNow = () => new Promise(r => setTimeout(r, 0));
  function exportAborted() {
    const job = window.Studio && window.Studio.exportJob;
    return !!(job && job.abort);
  }
  function exportProgress(msg) {
    const job = window.Studio && window.Studio.exportJob;
    if (job && typeof job.progress === 'function') job.progress(msg);
  }

  // Shared GL start: context, float texture type and a dead stub when WebGL2 is missing.
  function glStart(host) {
    const gl = G.createGL(host.canvas);
    const noop = () => {};
    const dead = msg => {
      host.setStatus(msg);
      host.fault(msg);
      return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), repaint: noop, live: noop, resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
    };
    if (!gl) return { gl: null, dead: dead('WebGL2 is not available in this browser') };
    const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
    if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');
    return { gl, texType, dead };
  }

  // Read an rgba8 target back as bytes (bottom-up rows, as GL gives them) through a pixel pack buffer
  // and a fence, so the CPU never stalls the GPU queue; resolves once the copy has landed.
  function readAsync(gl, target) {
    const n = target.w * target.h * 4;
    const pbo = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, n, gl.STREAM_READ);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    return new Promise((resolve, reject) => {
      let tries = 0;
      (function poll() {
        const st = gl.clientWaitSync(sync, 0, 0);
        if (st === gl.ALREADY_SIGNALED || st === gl.CONDITION_SATISFIED) {
          gl.deleteSync(sync);
          const px = new Uint8Array(n);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
          gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
          gl.deleteBuffer(pbo);
          resolve(px);
        } else if (st === gl.WAIT_FAILED || ++tries > 5000) {
          gl.deleteSync(sync); gl.deleteBuffer(pbo);
          reject(new Error('GPU readback failed'));
        } else setTimeout(poll, 4);
      })();
    });
  }

  // Print export for per-pixel plates: the picture is recomputed at w x h in tiles no larger than the GPU
  // allows, each tile rendered by drawTile(target, ox, oy) with pixel offsets into the full plate, then
  // composited into one canvas. Nothing is upscaled.
  async function exportTiled(gl, w, h, drawTile) {
    if (!(w > 0 && h > 0)) throw new Error('bad export size');
    if (w * h > MAX_SHEET) throw new Error('larger than a browser canvas can hold (' + Math.round(w * h / 1e6) + ' MP)');
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    const side = Math.max(256, Math.min(TILE, maxTex));
    const sheet = document.createElement('canvas');
    sheet.width = w; sheet.height = h;
    const ctx = sheet.getContext('2d');
    const tilesX = Math.ceil(w / side), tilesY = Math.ceil(h / side);
    const tiles = tilesX * tilesY;
    let k = 0;
    for (let oy = 0; oy < h; oy += side) {
      for (let ox = 0; ox < w; ox += side) {
        if (exportAborted()) throw new Error('cancelled');
        k += 1;
        exportProgress('Tile ' + k + ' of ' + tiles + ' (' + w.toLocaleString() + ' × ' + h.toLocaleString() + ' px). Cancel stops it.');
        const tw = Math.min(side, w - ox), th = Math.min(side, h - oy);
        const target = new G.Target(gl, tw, th, { type: 'rgba8', filter: 'nearest' });
        try {
          await drawTile(target, ox, oy);
          if (exportAborted()) throw new Error('cancelled');
          const px = await readAsync(gl, target);
          const img = ctx.createImageData(tw, th);
          for (let y = 0; y < th; y++) img.data.set(px.subarray((th - 1 - y) * tw * 4, (th - y) * tw * 4), y * tw * 4);
          ctx.putImageData(img, ox, h - oy - th);
        } finally { target.dispose(); }
        await yieldNow();
      }
    }
    return U.toBlob(sheet);
  }

  const HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform vec2 u_res, u_off;
`;
  const DITHER = `float dth = fract(dot(gl_FragCoord.xy, vec2(0.7548776662, 0.5698402909)));
  col = clamp(col + (dth - 0.5) / 255.0, 0.0, 1.0);`;

  /* ==================== Holomorphic dynamics ==================== */
  const HOLO_SPAN = 3.2;        // width of the plane shown at zoom 1
  const HOLO_REF_W = 1024;      // reference plate width for the float32 precision limit
  // Deepest zoom float32 can show at a given center: a pixel must stay at least two ulps of |c| wide on a
  // 1024 px plate, or adjacent pixels iterate identical constants and the plate turns to blocks.
  function holoZoomLimit(cx, cy) {
    const mag = Math.max(0.5, Math.hypot(cx, cy) + 0.25);
    const ulp = mag * Math.pow(2, -23);
    return Math.log10(HOLO_SPAN / (HOLO_REF_W * 2 * ulp));
  }
  const GOLD = (Math.sqrt(5) - 1) / 2;
  const JULIA_C = {
    rabbit: [-0.123, 0.745],
    dendrite: [0, 1],
    sanmarco: [-0.75, 0],
    // Siegel disk: c = lambda/2 - lambda^2/4 with lambda = exp(2 pi i theta), theta the golden mean
    siegel: [Math.cos(TAU * GOLD) / 2 - Math.cos(2 * TAU * GOLD) / 4, Math.sin(TAU * GOLD) / 2 - Math.sin(2 * TAU * GOLD) / 4],
  };
  const SETS = { mandel: 0, julia: 1, newton: 2, newtonr: 2, ship: 3 };
  const COLORS = { smooth: 0, distance: 1, point: 2, cross: 3 };

  const HOLO_FS = HEAD + `
uniform vec2 u_center, u_rot, u_c, u_trap;
uniform float u_scale, u_cycles, u_shift, u_relax, u_gamma, u_roots[18];
uniform int u_set, u_iters, u_color, u_nroots, u_aa, u_interior;
uniform vec3 u_bg;
uniform sampler2D u_ramp, u_pal;
vec3 ramp(float t){ return texture(u_ramp, vec2(clamp(t, 0.002, 0.998), 0.5)).rgb; }
vec3 pal(float t){ return texture(u_pal, vec2(clamp(t, 0.002, 0.998), 0.5)).rgb; }
vec2 cmul(vec2 a, vec2 b){ return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cinv(vec2 a){ return vec2(a.x, -a.y) / max(dot(a, a), 1e-30); }
float tri(float x){ return abs(fract(x) * 2.0 - 1.0); }
float trapDist(vec2 z){
  if (u_color == 3) return min(abs(z.x - u_trap.x), abs(z.y - u_trap.y));
  return length(z - u_trap);
}
// escape-time sets: returns the palette position, or -1 for points that never escaped
float escape(vec2 p){
  bool julia = u_set == 1;
  vec2 z = julia ? p : vec2(0.0);
  vec2 c = julia ? u_c : p;
  vec2 dz = julia ? vec2(1.0, 0.0) : vec2(0.0);
  float trap = 1e9; int n = 0; bool fled = false;
  for (int k = 0; k < 4000; k++) {
    if (k >= u_iters) break;
    if (u_set == 3) z = abs(z);
    dz = 2.0 * cmul(z, dz);
    if (!julia) dz.x += 1.0;
    z = cmul(z, z) + c;
    trap = min(trap, trapDist(z));
    n = k + 1;
    if (dot(z, z) > 1e8) { fled = true; break; }
  }
  if (!fled) return -1.0;
  float r = length(z);
  if (u_color == 1 && u_set != 3) {
    // Milnor distance estimate d = |z| ln|z| / |dz|, measured in pixels
    float d = r * log(r) / max(length(dz), 1e-30);
    float px = d / u_scale;
    if (px < 0.5) return 0.0;
    return clamp((log2(px) + 1.0) / 10.0 * u_cycles + u_shift, 0.0, 1.0);
  }
  if (u_color >= 2) return tri(trap * u_cycles * 0.5 + u_shift);
  float mu = float(n) + 1.0 - log2(max(log(r), 1e-6));
  return tri(mu * u_cycles / 64.0 + u_shift);
}
// Newton basins for p(z) = prod (z - r_k): z <- z - a p / p', with p'/p = sum 1/(z - r_k)
vec3 newton(vec2 p){
  vec2 z = p; float mu = 0.0, trap = 1e9;
  for (int k = 0; k < 400; k++) {
    if (k >= u_iters) break;
    vec2 sum = vec2(0.0);
    for (int j = 0; j < 8; j++) { if (j >= u_nroots) break; sum += cinv(z - vec2(u_roots[2 * j], u_roots[2 * j + 1])); }
    vec2 st = cinv(sum) * u_relax;
    z -= st;
    trap = min(trap, trapDist(z));
    mu = float(k + 1);
    float sl = dot(st, st);
    if (sl < 1e-12) { mu += clamp(log2(log(1e-12) / log(max(sl, 1e-38))), -3.0, 0.0); break; }
  }
  int root = 0; float bd = 1e9;
  for (int j = 0; j < 8; j++) {
    if (j >= u_nroots) break;
    float d = distance(z, vec2(u_roots[2 * j], u_roots[2 * j + 1]));
    if (d < bd) { bd = d; root = j; }
  }
  if (bd > 0.05) return u_bg;
  if (u_color >= 2) return ramp(tri(trap * u_cycles * 0.5 + u_shift));
  vec3 hue = pal(fract((float(root) + 0.5) / float(u_nroots) + u_shift));
  float shade = exp(-mu * 0.09 * u_cycles);
  return mix(u_bg, hue, 0.22 + 0.78 * shade);
}
vec3 shade(vec2 px){
  vec2 d = (px - u_res * 0.5) * u_scale;
  vec2 p = u_center + vec2(u_rot.x * d.x - u_rot.y * d.y, u_rot.y * d.x + u_rot.x * d.y);
  if (u_set == 3) p.y = -p.y;
  if (u_set == 2) return newton(p);
  float t = escape(p);
  if (t < 0.0) return u_interior == 1 ? pal(0.5 + 0.5 * u_shift) : u_bg;
  return ramp(t);
}
void main(){
  vec2 px = gl_FragCoord.xy + u_off;
  vec3 col;
  if (u_aa == 1) col = 0.25 * (shade(px + vec2(-0.25, -0.25)) + shade(px + vec2(0.25, -0.25)) + shade(px + vec2(-0.25, 0.25)) + shade(px + vec2(0.25, 0.25)));
  else col = shade(px);
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  ${DITHER}
  outColor = vec4(col, 1.0);
}`;

  function holoRoots(s) {
    const n = Math.round(s.degree);
    const out = new Float32Array(18);   // 9 slots: never 16 floats, which Pass.draw would send as a matrix
    if (s.set === 'newtonr') {
      const rng = U.makeRng(s.seed + '/holo/roots');
      for (let k = 0; k < n; k++) {
        const r = rng.range(0.35, 1.1), a = rng.range(0, TAU);
        out[2 * k] = r * Math.cos(a); out[2 * k + 1] = r * Math.sin(a);
      }
    } else {
      for (let k = 0; k < n; k++) { out[2 * k] = Math.cos(TAU * k / n); out[2 * k + 1] = Math.sin(TAU * k / n); }
    }
    return out;
  }
  function holoC(s) {
    if (s.juliaSet === 'custom') return [s.cRe, s.cIm];
    return JULIA_C[s.juliaSet] || JULIA_C.rabbit;
  }
  const SET_NAMES = { mandel: 'Mandelbrot', julia: 'Julia', newton: 'Newton zⁿ − 1', newtonr: 'Newton, seeded roots', ship: 'Burning Ship' };

  /* ==================== Double pendulum flip time ==================== */
  const SENT = 30000.0;   // omega1 channel value marking a cell that has flipped (fits half floats too)
  const PEND_SUB = 4;     // RK4 substeps per draw
  const PEND_HEAD = HEAD + `
uniform vec2 u_center; uniform float u_span;
`;
  const PEND_INIT = PEND_HEAD + `
const float PI = 3.14159265358979;
void main(){
  vec2 px = gl_FragCoord.xy + u_off;
  vec2 uv = px / u_res;
  float th1 = u_center.x + (uv.x - 0.5) * u_span;
  float th2 = u_center.y + (uv.y - 0.5) * u_span * (u_res.y / u_res.x);
  // the map is 2 pi periodic in both angles, so frames wider than the square continue it
  th1 = mod(th1 + PI, 2.0 * PI) - PI;
  th2 = mod(th2 + PI, 2.0 * PI) - PI;
  outColor = vec4(th1, 0.0, th2, 0.0);
}`;
  // Two identical uniform rods, equal mass and length, g = 1, time in units of sqrt(l/g).
  // State is (theta1, omega1, theta2, omega2); once an arm passes the top the cell is frozen as
  // (flip time, SENT, arm, 0) and integrated no further.
  const PEND_STEP = HEAD + `
uniform sampler2D u_state; uniform float u_dt, u_t; uniform int u_sub;
const float PI = 3.14159265358979;
vec4 deriv(vec4 s){
  float d = s.x - s.z, c = cos(d), sn = sin(d);
  float A = -3.0 * s.w * s.w * sn - 9.0 * sin(s.x);
  float B = 3.0 * s.y * s.y * sn - 3.0 * sin(s.z);
  float det = 16.0 - 9.0 * c * c;
  return vec4(s.y, (2.0 * A - 3.0 * c * B) / det, s.w, (8.0 * B - 3.0 * c * A) / det);
}
vec4 rk4(vec4 s, float h){
  vec4 k1 = deriv(s), k2 = deriv(s + 0.5 * h * k1), k3 = deriv(s + 0.5 * h * k2), k4 = deriv(s + h * k3);
  return s + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}
void main(){
  vec4 st = texture(u_state, v_uv);
  if (st.y >= ${SENT.toFixed(1)}) { outColor = st; return; }
  float t = u_t;
  for (int k = 0; k < 16; k++) {
    if (k >= u_sub) break;
    st = rk4(st, u_dt);
    t += u_dt;
    if (abs(st.x) > PI) { outColor = vec4(t, ${SENT.toFixed(1)} * 1.5, 1.0, 0.0); return; }
    if (abs(st.z) > PI) { outColor = vec4(t, ${SENT.toFixed(1)} * 1.5, 2.0, 0.0); return; }
  }
  outColor = st;
}`;
  const PEND_RENDER = HEAD + `
uniform sampler2D u_state, u_pal;
uniform float u_horizon, u_gamma, u_shift;
uniform int u_view, u_tone;
uniform vec3 u_bg;
vec3 pal(float t){ return texture(u_pal, vec2(clamp(t, 0.002, 0.998), 0.5)).rgb; }
void main(){
  vec4 st = texture(u_state, v_uv);
  vec3 col = u_bg;
  if (st.y >= ${SENT.toFixed(1)}) {
    float tt = clamp(st.x / u_horizon, 0.0, 1.0);
    float v = u_tone == 0 ? log(1.0 + 40.0 * tt) / log(41.0) : (u_tone == 1 ? sqrt(tt) : tt);
    v = pow(v, u_gamma);
    if (u_view == 0) col = pal(fract(v * 0.998 + u_shift));
    else {
      vec3 hue = pal(st.z < 1.5 ? 0.15 + u_shift * 0.3 : 0.85 - u_shift * 0.3);
      col = mix(hue, u_bg, v * 0.8);
    }
  }
  ${DITHER}
  outColor = vec4(col, 1.0);
}`;

  /* ==================== Hydrogen orbitals ==================== */
  const NMAX = 8, COEF = 12;
  const L_LETTERS = 'spdfghik';
  function binom(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
  function fact(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
  // associated Laguerre L_k^alpha(x) = sum_j (-1)^j C(k+alpha, k-j) x^j / j!
  function laguerre(k, alpha) {
    const c = new Float32Array(COEF);
    for (let j = 0; j <= k; j++) c[j] = ((j % 2) ? -1 : 1) * binom(k + alpha, k - j) / fact(j);
    return c;
  }
  // Legendre P_l by recurrence, then the m-th derivative; P_l^m = (1-x^2)^(m/2) d^m P_l / dx^m
  function legendreDeriv(l, m) {
    let p0 = [1], p1 = [0, 1];
    if (l === 0) p1 = p0;
    for (let n = 1; n < l; n++) {
      const p2 = new Array(n + 2).fill(0);
      for (let i = 0; i < p1.length; i++) p2[i + 1] += (2 * n + 1) * p1[i] / (n + 1);
      for (let i = 0; i < p0.length; i++) p2[i] -= n * p0[i] / (n + 1);
      p0 = p1; p1 = p2;
    }
    let c = p1;
    for (let d = 0; d < m; d++) { const nc = []; for (let i = 1; i < c.length; i++) nc.push(c[i] * i); c = nc.length ? nc : [0]; }
    const out = new Float32Array(COEF);
    for (let i = 0; i < c.length && i < COEF; i++) out[i] = c[i];
    return out;
  }
  function evalPoly(c, x) { let s = 0, p = 1; for (let i = 0; i < c.length; i++) { s += c[i] * p; p *= x; } return s; }
  // Everything the shader needs for psi_nlm, plus the measured radial extent and node counts.
  function orbital(n, l, m) {
    const lag = laguerre(n - l - 1, 2 * l + 1);
    const leg = legendreDeriv(l, m);
    const norm = Math.sqrt(Math.pow(2 / n, 3) * fact(n - l - 1) / (2 * n * fact(n + l)));
    const anorm = Math.sqrt((2 * l + 1) / (4 * PI) * fact(l - m) / fact(l + m));
    // radial cumulative probability on a fine grid: the sphere that holds 99.5% of it frames the picture
    const rTop = 4 * n * n + 20, N = 4000, dr = rTop / N;
    let cum = 0, radialNodes = 0, prev = null, rmax = rTop;
    const acc = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const r = (i + 0.5) * dr, rho = 2 * r / n;
      const R = norm * Math.pow(rho, l) * Math.exp(-rho / 2) * evalPoly(lag, rho);
      if (prev !== null && Math.sign(R) !== Math.sign(prev) && R !== 0) radialNodes++;
      prev = R;
      cum += r * r * R * R * dr;
      acc[i] = cum;
    }
    for (let i = 0; i < N; i++) if (acc[i] >= 0.995 * cum) { rmax = (i + 1) * dr; break; }
    let thetaNodes = 0; prev = null;
    for (let x = -0.999; x < 0.999; x += 0.002) { const v = evalPoly(leg, x); if (prev !== null && Math.sign(v) !== Math.sign(prev)) thetaNodes++; prev = v; }
    return { lag, leg, norm, anorm, rmax, radialNodes, thetaNodes };
  }
  const REAL_NAMES = {
    '1,0': 'z', '1,1c': 'x', '1,1s': 'y',
    '2,0': 'z²', '2,1c': 'xz', '2,1s': 'yz', '2,2c': 'x²−y²', '2,2s': 'xy',
    '3,0': 'z³', '3,1c': 'xz²', '3,1s': 'yz²', '3,2c': 'z(x²−y²)', '3,2s': 'xyz', '3,3c': 'x(x²−3y²)', '3,3s': 'y(3x²−y²)',
  };
  function orbitalName(s) {
    const n = s.n, l = s.l, m = s.m;
    const base = n + L_LETTERS[l];
    if (s.real === 'complex') return base + (m ? ' m=' + m : '');
    if (m === 0) return base + (REAL_NAMES[l + ',0'] ? '<sub>' + REAL_NAMES[l + ',0'] + '</sub>' : '');
    const key = l + ',' + m + (s.real === 'cos' ? 'c' : 's');
    return base + (REAL_NAMES[key] ? '<sub>' + REAL_NAMES[key] + '</sub>' : ' ' + (s.real === 'cos' ? 'cos' : 'sin') + ' ' + m + 'φ');
  }

  const ORB_FS = HEAD + `
uniform float u_lag[${COEF}], u_leg[${COEF}];
uniform int u_n, u_l, u_m, u_real, u_view, u_steps, u_plane, u_tone, u_phase, u_raw;
uniform float u_norm, u_anorm, u_rmax, u_frame, u_offset, u_scale, u_expo, u_gamma;
uniform mat3 u_cam;
uniform vec3 u_bg;
uniform sampler2D u_ramp, u_pal;
vec3 ramp(float t){ return texture(u_ramp, vec2(clamp(t, 0.002, 0.998), 0.5)).rgb; }
vec3 pal(float t){ return texture(u_pal, vec2(clamp(t, 0.002, 0.998), 0.5)).rgb; }
float psi(vec3 p){
  float r = length(p);
  float rho = 2.0 * r / float(u_n);
  float ct = p.z / max(r, 1e-9);
  float st = sqrt(max(0.0, 1.0 - ct * ct));
  float L = 0.0, pw = 1.0;
  for (int j = 0; j < ${COEF}; j++) { L += u_lag[j] * pw; pw *= rho; }
  float rl = 1.0;
  for (int j = 0; j < ${NMAX}; j++) { if (j >= u_l) break; rl *= rho; }
  float R = u_norm * rl * exp(-0.5 * rho) * L;
  float P = 0.0; pw = 1.0;
  for (int j = 0; j < ${COEF}; j++) { P += u_leg[j] * pw; pw *= ct; }
  float sm = 1.0;
  for (int j = 0; j < ${NMAX}; j++) { if (j >= u_m) break; sm *= st; }
  float ang = 1.0;
  if (u_m > 0 && u_real > 0) {
    float ph = atan(p.y, p.x) * float(u_m);
    ang = 1.41421356 * (u_real == 1 ? cos(ph) : sin(ph));
  }
  return R * u_anorm * P * sm * ang;
}
float tone(float x){
  float v = u_tone == 0 ? log(1.0 + 30.0 * x) / log(31.0) : (u_tone == 1 ? sqrt(x) : x);
  return pow(clamp(v, 0.0, 1.0), u_gamma);
}
void main(){
  vec2 px = gl_FragCoord.xy + u_off;
  vec2 q = (px - u_res * 0.5) / u_res.x * 2.0 * u_rmax * u_frame;
  float T = 0.0, S = 0.0;
  if (u_view == 0) {
    vec3 ro = u_cam[0] * q.x + u_cam[1] * q.y - u_cam[2] * (2.0 * u_rmax);
    vec3 rd = u_cam[2];
    float b = dot(ro, rd), c = dot(ro, ro) - u_rmax * u_rmax;
    float disc = b * b - c;
    if (disc > 0.0) {
      float sq = sqrt(disc), t0 = -b - sq, t1 = -b + sq;
      float ds = (t1 - t0) / float(u_steps);
      for (int i = 0; i < 512; i++) {
        if (i >= u_steps) break;
        vec3 p = ro + rd * (t0 + (float(i) + 0.5) * ds);
        float w = psi(p);
        float d = w * w;
        T += d * ds;
        S += w * abs(w) * ds;
      }
    }
  } else {
    vec3 p = u_plane == 0 ? vec3(q.x, u_offset, q.y) : (u_plane == 1 ? vec3(q.x, q.y, u_offset) : vec3(u_offset, q.x, q.y));
    if (length(p) < u_rmax) { float w = psi(p); T = w * w; S = w * abs(w); }
  }
  if (u_raw == 1) {
    // log2 density packed into two bytes for the exposure readback
    float v = T > 0.0 ? clamp((log2(T) + 60.0) / 90.0, 0.001, 1.0) : 0.0;
    float hi = floor(v * 255.0) / 255.0;
    outColor = vec4(hi, fract(v * 255.0), 0.0, 1.0);
    return;
  }
  float v = tone(T * u_scale * u_expo);
  vec3 col;
  if (u_phase == 1) {
    float sgn = T > 0.0 ? S / T : 0.0;
    col = mix(u_bg, pal(sgn >= 0.0 ? 0.85 : 0.15), v);
  } else col = ramp(v);
  ${DITHER}
  outColor = vec4(col, 1.0);
}`;

  /* ---------- Holomorphic Dynamics ---------- */
  Studio.register({
    id: 'holomorphic',
    name: 'Holomorphic dynamics',
    tab: 'Holomorphic',
    subtitle: 'escape-time and Newton basins in the complex plane · 1918',
    order: 63,
    equation: 'z ← z² + c   (Mandelbrot, Julia);   z ← z − a p(z)/p′(z)   (Newton);   z ← (|Re z| + i|Im z|)² + c   (Burning Ship)',
    credit: "Gaston Julia, J. Math. Pures Appl. (1918) and Pierre Fatou, Bull. Soc. Math. France (1919) on the iteration of rational maps; Benoit Mandelbrot, Ann. N.Y. Acad. Sci. (1980) for the set of parameters c with connected Julia set; Adrien Douady and John H. Hubbard, C. R. Acad. Sci. Paris (1982) for the connectedness of the Mandelbrot set and the rabbit; Michael Michelitsch and Otto E. Rössler, Computers & Graphics (1992) for the Burning Ship. The distance estimate follows John Milnor's formula d = |z| ln|z| / |dz/dc|.",
    blurb: 'Every pixel is a point in the complex plane pushed through the same map again and again. The Mandelbrot set is the black heart of parameters whose orbit never escapes; the Julia sets are the same question asked of the starting point with c held fixed, so the rabbit, the dendrite and the Siegel disk each show one c from inside the heart. Newton basins color the plane by which root Newton\'s method lands on, with the relaxation factor bending the basin boundaries into filigree. Smooth iteration count bands the escape time, the distance estimator draws the boundary itself, and the orbit traps color by how close each orbit came to a point or a cross. Zoom is clamped where 32-bit floats run out of digits.',
    schema: [
      { group: 'Set', key: 'set', label: 'Map', type: 'seg', kind: GEOM, wrap: true, options: [['mandel', 'Mandelbrot'], ['julia', 'Julia'], ['newton', 'Newton zⁿ−1'], ['newtonr', 'Newton seeded'], ['ship', 'Burning Ship']] },
      { group: 'Set', key: 'juliaSet', label: 'Julia constant', type: 'seg', kind: GEOM, wrap: true, options: [['rabbit', 'Douady rabbit'], ['dendrite', 'Dendrite'], ['sanmarco', 'San Marco'], ['siegel', 'Siegel disk'], ['custom', 'Custom']], dimUnless: s => s.set === 'julia' },
      RANGE('Set', 'cRe', 'Re c', GEOM, -2, 1, 0.001, f3, { dimUnless: s => s.set === 'julia' && s.juliaSet === 'custom' }),
      RANGE('Set', 'cIm', 'Im c', GEOM, -1.5, 1.5, 0.001, f3, { dimUnless: s => s.set === 'julia' && s.juliaSet === 'custom' }),
      RANGE('Set', 'degree', 'Polynomial degree n', GEOM, 3, 8, 1, String, { dimUnless: s => s.set === 'newton' || s.set === 'newtonr' }),
      RANGE('Set', 'relax', 'Relaxation a', GEOM, 0.5, 1.6, 0.01, f2, { dimUnless: s => s.set === 'newton' || s.set === 'newtonr', hint: 'a = 1 is plain Newton. Below 1 the basins swell and smooth out; above 1 the boundaries fold into new filigree.' }),
      RANGE('Set', 'iters', 'Iterations', GEOM, 20, 2000, 10, String),
      RANGE('View', 'cx', 'Center Re', GEOM, -2.2, 2.2, 0.0001, v => v.toFixed(4)),
      RANGE('View', 'cy', 'Center Im', GEOM, -1.6, 1.6, 0.0001, v => v.toFixed(4)),
      RANGE('View', 'zoom', 'Zoom (log10)', GEOM, 0, 5, 0.01, v => '10^' + v.toFixed(2)),
      RANGE('View', 'rot', 'Rotation', GEOM, 0, 360, 1, deg),
      ASPECT_FIELD,
      { group: 'Color', key: 'color', label: 'Coloring', type: 'seg', kind: PAINT, wrap: true, options: [['smooth', 'Smooth count'], ['distance', 'Distance'], ['point', 'Point trap'], ['cross', 'Cross trap']] },
      RANGE('Color', 'cycles', 'Color cycles', PAINT, 0.1, 6, 0.05, f2),
      RANGE('Color', 'shift', 'Color shift', PAINT, 0, 1, 0.01, f2),
      RANGE('Color', 'trapX', 'Trap Re', PAINT, -2, 2, 0.01, f2, { dimUnless: s => s.color === 'point' || s.color === 'cross' }),
      RANGE('Color', 'trapY', 'Trap Im', PAINT, -2, 2, 0.01, f2, { dimUnless: s => s.color === 'point' || s.color === 'cross' }),
      { group: 'Color', key: 'interior', label: 'Light interior', type: 'toggle', kind: PAINT },
      RANGE('Color', 'gamma', 'Gamma', PAINT, 0.5, 2, 0.02, f2),
      { group: 'Quality', key: 'aa', label: 'Supersample 2×2', type: 'toggle', kind: PAINT, hint: 'Four samples per pixel on screen and in print. Four times the work.' },
    ],
    defaults: {
      set: 'mandel', juliaSet: 'rabbit', cRe: -0.8, cIm: 0.156, degree: 3, relax: 1, iters: 300,
      cx: -0.745, cy: 0.186, zoom: 1.6, rot: 0, aspect: '1:1',
      color: 'smooth', cycles: 1.2, shift: 0, trapX: 0, trapY: 0, interior: false, gamma: 1,
      aa: false, seed: 'julia-1918',
    },
    presets: {
      seahorse: pre('Seahorse valley', { set: 'mandel', cx: -0.745, cy: 0.186, zoom: 1.6, rot: 0, iters: 300, color: 'smooth', cycles: 1.2, shift: 0, interior: false }, Pal.thermal),
      boundary: pre('Distance estimate', { set: 'mandel', cx: -0.6, cy: 0, zoom: 0.05, rot: 0, iters: 400, color: 'distance', cycles: 1, shift: 0, interior: false }, Pal.graphite),
      rabbit: pre('Douady rabbit', { set: 'julia', juliaSet: 'rabbit', cx: 0, cy: 0, zoom: 0.1, rot: 0, iters: 250, color: 'smooth', cycles: 1.4, shift: 0.1, interior: true }, Pal.meadow),
      dendrite: pre('Dendrite', { set: 'julia', juliaSet: 'dendrite', cx: 0, cy: 0, zoom: 0.08, rot: 0, iters: 250, color: 'distance', cycles: 1, shift: 0, interior: false }, Pal.xray),
      siegel: pre('Siegel disk', { set: 'julia', juliaSet: 'siegel', cx: 0, cy: 0, zoom: 0.1, rot: 0, iters: 400, color: 'point', trapX: 0, trapY: 0, cycles: 2, shift: 0, interior: true }, Pal.verdigris),
      newton: pre('Newton z⁵ − 1', { set: 'newton', degree: 5, relax: 1, cx: 0, cy: 0, zoom: 0.15, rot: 0, iters: 60, color: 'smooth', cycles: 1, shift: 0 }, Pal.tram),
      ship: pre('Burning Ship', { set: 'ship', cx: -1.755, cy: 0.028, zoom: 1.5, rot: 0, iters: 300, color: 'smooth', cycles: 1.6, shift: 0.2, interior: false }, Pal.ember),
    },
    hints: {
      Set: 'Julia constants are the classic four; San Marco sits on the real axis at the period-doubling point, the Siegel disk uses c for the golden-mean rotation number. Seeded Newton draws its roots from the seed.',
      View: 'Zoom is log10 of the magnification. It is clamped where a 32-bit float can no longer separate neighboring pixels, about 10^4 near the main cardioid.',
      Color: 'Smooth count bands the escape time; Distance draws the set boundary; the traps color by the closest approach of the orbit to a point or to the axes through it.',
    },
    closedGroups: ['Quality'],
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Ramp (background → colors)',
    headline: 'iters', headlineLabel: 'iterations',
    sanitize(s) {
      s.degree = U.clamp(Math.round(Number(s.degree) || 3), 3, 8);
      s.iters = U.clamp(Math.round(Number(s.iters) || 300), 20, 2000);
      s.zoom = U.clamp(Number(s.zoom) || 0, 0, holoZoomLimit(s.cx, s.cy));
    },
    surprise(rng) {
      const set = rng.pick(['mandel', 'mandel', 'julia', 'julia', 'newton', 'newtonr', 'ship']);
      const p = { set, rot: rng() < 0.3 ? rng.int(0, 359) : 0, aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']), gamma: rng.range(0.85, 1.15), cycles: rng.range(0.6, 2.2), shift: rng.range(0, 1), interior: rng() < 0.4, aa: false, trapX: rng.range(-0.6, 0.6), trapY: rng.range(-0.6, 0.6) };
      const tame = () => { if (p.color === 'distance') { p.cycles = rng.range(0.5, 1.2); p.shift = rng.range(0, 0.2); } return p; };
      if (set === 'mandel') {
        const spots = [[-0.745, 0.186, 1.6], [-0.1011, 0.9563, 1.4], [0.2820, 0.0100, 1.3], [-1.7687, 0.0017, 1.8], [-0.7457, 0.1101, 2.1], [-0.16, 1.0405, 1.3], [-1.25066, 0.02012, 2.2]];
        const sp = rng.pick(spots);
        Object.assign(p, { cx: sp[0], cy: sp[1], zoom: sp[2] + rng.range(-0.3, 0.4), iters: rng.pick([250, 400, 600]), color: rng.pick(['smooth', 'smooth', 'distance', 'point', 'cross']) });
        return tame();
      } else if (set === 'julia') {
        const js = rng.pick(['rabbit', 'dendrite', 'sanmarco', 'siegel', 'custom', 'custom']);
        Object.assign(p, { juliaSet: js, cRe: rng.range(-0.9, 0.4), cIm: rng.range(-0.7, 0.7), cx: rng.range(-0.3, 0.3), cy: rng.range(-0.3, 0.3), zoom: rng.range(0.05, 0.6), iters: rng.pick([200, 300, 500]), color: rng.pick(['smooth', 'distance', 'point', 'cross']) });
        return tame();
      } else if (set === 'ship') {
        Object.assign(p, { cx: rng.pick([-1.755, -1.7443, -1.58]), cy: rng.pick([0.028, 0.026, 0.02]), zoom: rng.range(1.2, 2.2), iters: rng.pick([250, 400]), color: rng.pick(['smooth', 'smooth', 'cross']) });
      } else {
        Object.assign(p, { degree: rng.int(3, 7), relax: rng.pick([1, 1, rng.range(0.6, 1.5)]), cx: rng.range(-0.3, 0.3), cy: rng.range(-0.3, 0.3), zoom: rng.range(0, 0.6), iters: rng.int(40, 90), color: rng.pick(['smooth', 'smooth', 'point']) });
      }
      return p;
    },
    create(host) {
      const start = glStart(host);
      if (!start.gl) return start.dead;
      const gl = start.gl;
      let pass;
      try { pass = new G.Pass(gl, HOLO_FS); } catch (err) { console.error(err); return start.dead('Shader compilation failed on this GPU'); }
      let ramp = null, pal = null, rampKey = '';
      function ensureRamp(s) {
        const key = s.bg + '|' + s.palette.join(',');
        if (ramp && rampKey === key) return;
        if (ramp) { ramp.dispose(); pal.dispose(); }
        ramp = G.rampTexture(gl, s.palette, s.bg);
        pal = G.rampTexture(gl, s.palette, null);
        rampKey = key;
      }
      function uniforms(s, w, h, ox, oy) {
        ensureRamp(s);
        const zoom = Math.pow(10, s.zoom), a = s.rot * PI / 180;
        return {
          u_res: [w, h], u_off: [ox, oy], u_center: [s.cx, s.cy], u_rot: [Math.cos(a), Math.sin(a)],
          u_scale: HOLO_SPAN / (zoom * w), u_c: holoC(s), u_trap: [s.trapX, s.trapY],
          u_cycles: s.cycles, u_shift: s.shift, u_relax: s.relax, u_gamma: s.gamma,
          u_roots: holoRoots(s), u_nroots: { int: Math.round(s.degree) },
          u_set: { int: SETS[s.set] || 0 }, u_iters: { int: Math.round(s.iters) }, u_color: { int: COLORS[s.color] || 0 },
          u_aa: { int: s.aa ? 1 : 0 }, u_interior: { int: s.interior ? 1 : 0 },
          u_bg: hex01(s.bg), u_ramp: ramp, u_pal: pal,
        };
      }
      function draw() {
        const s = host.getState();
        pass.draw(null, uniforms(s, host.canvas.width, host.canvas.height, 0, 0));
        gl.finish();
        const limit = holoZoomLimit(s.cx, s.cy);
        host.setStatus(
          '<span><b>' + SET_NAMES[s.set] + '</b>' + (s.set === 'julia' ? ' c = ' + holoC(s).map(f3).join(' + ') + 'i' : '') + '</span>' +
          '<span>zoom <b>10^' + f2(s.zoom) + '</b>' + (s.zoom >= limit - 0.005 ? ' · float32 limit' : '') + '</span>' +
          '<span>' + s.iters + ' iters' + (s.aa ? ' · 2×2 AA' : '') + '</span><span>' + host.canvas.width + '×' + host.canvas.height + ' px</span>');
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() { draw(); },
        repaint() { draw(); },
        resize() { draw(); },
        pause() {}, resume() { draw(); },
        async exportPNG(w, h) {
          const s = host.getState();
          const blob = await exportTiled(gl, w, h, (target, ox, oy) => { pass.draw(target, uniforms(s, w, h, ox, oy)); gl.finish(); });
          draw();
          return blob;
        },
      };
    },
  });

  /* ---------- Double Pendulum Flip Time ---------- */
  Studio.register({
    id: 'pendulum',
    name: 'Double pendulum flip time',
    tab: 'Pendulum',
    subtitle: 'first flip of a chaotic double pendulum · 1992',
    order: 51,
    equation: 'L = (m l² / 6)(ω₂² + 4ω₁² + 3ω₁ω₂ cos(θ₁ − θ₂)) + (m g l / 2)(3 cos θ₁ + cos θ₂);   plate = first t with |θ₁| > π or |θ₂| > π',
    credit: "Troy Shinbrot, Celso Grebogi, Jack Wisdom and James A. Yorke, Chaos in a double pendulum, American Journal of Physics 60, 491 (1992), measured the exponential divergence of nearby trajectories on a real double pendulum. The flip-time plot itself is a widely reproduced numerical experiment rather than a paper: every pixel is an initial pair of angles released from rest, colored by the time until either arm first passes over the top.",
    blurb: 'Two identical rods hang from each other. Release them from rest at the angles (θ₁, θ₂) that a pixel stands for and watch until one of them swings over the top; that time is the color. Near the middle the rods hang almost straight down and there is not enough energy to flip at all, which is the dark lens where 3 cos θ₁ + cos θ₂ > 2. Just outside it the flip comes late and the boundary is smooth; further out the motion is chaotic and the flip time changes wildly from one pixel to the next, so the plate turns to grain and filigree. The integration runs on the GPU while you watch and stops when the horizon is reached. A print recomputes every pixel from scratch at its own resolution.',
    schema: [
      RANGE('Pendulum', 'horizon', 'Time horizon', GEOM, 5, 200, 1, v => v + ' √(l/g)', { hint: 'How long each pixel is integrated before it is declared unflipped. Longer horizons fill in the outer chaos and cost time in proportion.' }),
      RANGE('Pendulum', 'dt', 'Time step', GEOM, 0.01, 0.06, 0.005, f3),
      RANGE('Pendulum', 'perFrame', 'Draws per frame', LIVE, 1, 8, 1, String, { hint: 'Each draw is four RK4 substeps. Higher is faster and less responsive.' }),
      { group: 'Frame', key: 'grid', label: 'Screen grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512']], hint: 'Resolution of the screen computation. Prints recompute at print pixels regardless.' },
      RANGE('Frame', 'c1', 'Center θ₁', GEOM, -3.14, 3.14, 0.01, f2),
      RANGE('Frame', 'c2', 'Center θ₂', GEOM, -3.14, 3.14, 0.01, f2),
      RANGE('Frame', 'span', 'Width (rad)', GEOM, 0.5, 6.2832, 0.01, f2),
      ASPECT_FIELD,
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['time', 'Flip time'], ['arm', 'Which arm']] },
      { group: 'Picture', key: 'tone', label: 'Tone', type: 'seg', kind: PAINT, options: [['log', 'Log'], ['sqrt', 'Square root'], ['linear', 'Linear']] },
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'shift', 'Color shift', PAINT, 0, 1, 0.01, f2),
    ],
    defaults: {
      horizon: 32, dt: 0.04, perFrame: 3, grid: 256, c1: 0, c2: 0, span: 6.2832, aspect: '1:1',
      view: 'time', tone: 'log', gamma: 1, shift: 0, seed: 'pendulum-1992',
    },
    presets: {
      classic: pre('Full square', { horizon: 32, dt: 0.04, grid: 256, c1: 0, c2: 0, span: 6.2832, aspect: '1:1', view: 'time', tone: 'log', gamma: 1, shift: 0 }, Pal.thermal),
      lens: pre('The lens', { horizon: 32, dt: 0.04, grid: 256, c1: 0, c2: 0, span: 4.4, aspect: '1:1', view: 'time', tone: 'sqrt', gamma: 1, shift: 0 }, Pal.glacier),
      arms: pre('Which arm', { horizon: 20, dt: 0.04, grid: 256, c1: 0, c2: 0, span: 6.2832, aspect: '1:1', view: 'arm', tone: 'log', gamma: 1, shift: 0 }, Pal.risograph),
      edge: pre('Edge of chaos', { horizon: 30, dt: 0.04, grid: 256, c1: 1.9, c2: -1.2, span: 1.8, aspect: '4:5', view: 'time', tone: 'linear', gamma: 1.2, shift: 0.1 }, Pal.bioluminescent),
      long: pre('Long horizon', { horizon: 48, dt: 0.05, grid: 192, c1: 0, c2: 0, span: 6.2832, aspect: '1:1', view: 'time', tone: 'log', gamma: 1.1, shift: 0 }, Pal.nightshade),
      wide: pre('Wide band', { horizon: 24, dt: 0.04, grid: 256, c1: 0, c2: 0.9, span: 6.2832, aspect: '16:9', view: 'time', tone: 'log', gamma: 1, shift: 0.3 }, Pal.ember),
    },
    hints: {
      Pendulum: 'Time is in units of √(l/g), about 0.3 s for a 1 m rod on Earth. The plate is deterministic: the same angles always flip at the same time.',
      Frame: 'The whole square is θ₁, θ₂ in [−π, π]. Narrow the width to zoom into the lens boundary or the chaotic corners.',
      Picture: 'Unflipped cells take the background color. Flip time runs through the palette from early to late.',
    },
    closedGroups: ['Frame'],
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Flip time (early → late)',
    headline: 'horizon', headlineLabel: 'horizon',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) || 256), 64, 512);
      s.dt = U.clamp(Number(s.dt) || 0.04, 0.005, 0.08);
      s.horizon = U.clamp(Number(s.horizon) || 32, 2, 400);
      s.span = U.clamp(Number(s.span) || TAU, 0.1, TAU);
    },
    surprise(rng) {
      const zoomed = rng() < 0.4;
      // a zoomed frame should sit on the lens boundary, where the flips begin, not inside the dead lens
      let c1 = 0, c2 = 0;
      if (zoomed) {
        for (let k = 0; k < 16; k++) {
          c1 = rng.range(-2.6, 2.6); c2 = rng.range(-2.6, 2.6);
          const e = 3 * Math.cos(c1) + Math.cos(c2);
          if (e > -0.6 && e < 1.8) break;
        }
      }
      return {
        horizon: rng.pick([24, 32, 32, 40]), dt: 0.04, perFrame: 3, grid: rng.pick([192, 256, 256]),
        c1: Math.round(c1 * 100) / 100, c2: Math.round(c2 * 100) / 100,
        span: zoomed ? rng.range(1, 3) : TAU, aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        view: rng() < 0.8 ? 'time' : 'arm', tone: rng.pick(['log', 'log', 'sqrt']), gamma: rng.range(0.8, 1.2), shift: rng.range(0, 1),
      };
    },
    create(host) {
      const start = glStart(host);
      if (!start.gl) return start.dead;
      const gl = start.gl, texType = start.texType;
      let initPass, stepPass, renderPass;
      try {
        initPass = new G.Pass(gl, PEND_INIT);
        stepPass = new G.Pass(gl, PEND_STEP);
        renderPass = new G.Pass(gl, PEND_RENDER);
      } catch (err) { console.error(err); return start.dead('Shader compilation failed on this GPU'); }
      let P = null, gw = 0, gh = 0, pal = null, palKey = '';
      let raf = 0, timer = 0, stepCount = 0, simT = 0, total = 0, t0 = 0, done = false;

      function sizeOf(s) {
        const n = s.grid, ar = ASPECTS[s.aspect] || 1;
        return [n, Math.max(32, Math.round(n * ar))];
      }
      function ensureGrid(s) {
        const [W, H] = sizeOf(s);
        if (P && gw === W && gh === H) return;
        if (P) P.dispose();
        P = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'clamp' });
        gw = W; gh = H;
      }
      function ensurePal(s) {
        const key = s.bg + '|' + s.palette.join(',');
        if (pal && palKey === key) return;
        if (pal) pal.dispose();
        pal = G.rampTexture(gl, s.palette, null); palKey = key;
      }
      function frameUniforms(s, w, h, ox, oy) { return { u_res: [w, h], u_off: [ox, oy], u_center: [s.c1, s.c2], u_span: s.span }; }
      function stepsFor(s) { return Math.ceil(s.horizon / s.dt / PEND_SUB); }
      // integrate n draws of PEND_SUB substeps on a PingPong
      function integrate(pp, s, n, at) {
        for (let i = 0; i < n; i++) {
          stepPass.draw(pp.write, { u_state: pp.read, u_dt: s.dt, u_t: at, u_sub: { int: PEND_SUB } });
          pp.swap();
          at += s.dt * PEND_SUB;
        }
        return at;
      }
      function render(target, pp) {
        const s = host.getState();
        ensurePal(s);
        renderPass.draw(target || null, {
          u_state: (pp || P).read, u_pal: pal, u_horizon: s.horizon, u_gamma: s.gamma, u_shift: s.shift,
          u_view: { int: s.view === 'arm' ? 1 : 0 }, u_tone: { int: s.tone === 'log' ? 0 : (s.tone === 'sqrt' ? 1 : 2) }, u_bg: hex01(s.bg),
        });
      }
      function status(extra) {
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          '<span>t <b>' + f1(Math.min(simT, host.getState().horizon)) + '</b> / ' + host.getState().horizon + ' √(l/g)</span>' +
          '<span>RK4 steps <b>' + (stepCount * PEND_SUB).toLocaleString() + '</b></span>' +
          (extra ? '<span>' + extra + '</span>' : ''));
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }
      function finish() {
        done = true;
        render();
        status('done in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s');
      }
      function frame() {
        raf = 0;
        const s = host.getState();
        const n = Math.min(s.perFrame, total - stepCount);
        simT = integrate(P, s, n, simT);
        stepCount += n;
        render();
        if (stepCount >= total) finish();
        else { status(); raf = requestAnimationFrame(frame); }
      }
      // reduced motion: same integration in timer chunks without painting the intermediate frames
      function chunk() {
        timer = 0;
        const s = host.getState();
        const n = Math.min(6, total - stepCount);
        simT = integrate(P, s, n, simT);
        stepCount += n;
        if (stepCount >= total) finish();
        else timer = setTimeout(chunk, 0);
      }
      function begin() {
        stop();
        const s = host.getState();
        ensureGrid(s);
        initPass.draw(P.write, frameUniforms(s, gw, gh, 0, 0));
        P.swap();
        stepCount = 0; simT = 0; done = false; total = stepsFor(s); t0 = performance.now();
        render(); status();
        if (host.reducedMotion()) timer = setTimeout(chunk, 0);
        else raf = requestAnimationFrame(frame);
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() { begin(); },
        repaint() { if (P) render(); },
        live() { /* perFrame is read on the next frame */ },
        resize() { if (P) render(); },
        pause() { stop(); },
        resume() { if (!P) return; render(); if (!done && !raf && !timer) { if (host.reducedMotion()) timer = setTimeout(chunk, 0); else raf = requestAnimationFrame(frame); } },
        async exportPNG(w, h) {
          if (!P) throw new Error('nothing to export');
          const s = host.getState();
          const n = stepsFor(s);
          const blob = await exportTiled(gl, w, h, async (target, ox, oy) => {
            const pp = new G.PingPong(gl, target.w, target.h, { type: texType, filter: 'nearest', wrap: 'clamp' });
            try {
              initPass.draw(pp.write, frameUniforms(s, w, h, ox, oy));
              pp.swap();
              let at = 0;
              for (let k = 0; k < n; k += 12) {
                if (exportAborted()) throw new Error('cancelled');
                at = integrate(pp, s, Math.min(12, n - k), at);
                gl.finish();
                await yieldNow();
              }
              render(target, pp);
            } finally { pp.dispose(); }
          });
          render();
          return blob;
        },
      };
    },
  });

  /* ---------- Hydrogen Orbitals ---------- */
  Studio.register({
    id: 'orbitals',
    name: 'Hydrogen orbitals',
    tab: 'Orbitals',
    subtitle: 'hydrogen atom probability density |ψₙₗₘ|² · 1926',
    order: 96,
    equation: 'ψₙₗₘ = Rₙₗ(r) Yₗₘ(θ, φ),   Rₙₗ ∝ ρˡ e^{−ρ/2} L²ˡ⁺¹ₙ₋ₗ₋₁(ρ),   ρ = 2r / n a₀',
    credit: "Erwin Schrödinger, Quantisierung als Eigenwertproblem, Annalen der Physik 79, 361 (1926), solved the hydrogen atom as a wave equation; the radial functions are associated Laguerre polynomials and the angular parts spherical harmonics. The plate evaluates |ψ|² exactly from those polynomials and either integrates it along view rays or cuts a plane through it.",
    blurb: 'The three integers n, l, m pick one stationary state of the electron in a hydrogen atom, and the picture is where you would find it. The radial part has n − l − 1 spherical nodes, the angular part l nodal surfaces, so 1s is a fuzzy ball, 2p a dumbbell and 3d_z² a dumbbell threaded through a torus. Real combinations replace e^{imφ} by cos mφ or sin mφ, which is how chemists get the lobed p_x, d_xy and friends. The ray view integrates the density through the cloud from a camera you can orbit; the section cuts a plane and colors each lobe by the sign of ψ. Exposure is measured from the rendered density, not guessed from a formula, so every orbital lands on the page.',
    schema: [
      RANGE('Orbital', 'n', 'Principal n', GEOM, 1, NMAX, 1, String),
      RANGE('Orbital', 'l', 'Angular l', GEOM, 0, NMAX - 1, 1, String, { hint: 'l runs 0 to n − 1; larger values are clamped.' }),
      RANGE('Orbital', 'm', 'Magnetic |m|', GEOM, 0, NMAX - 1, 1, String, { hint: '|m| runs 0 to l.' }),
      { group: 'Orbital', key: 'real', label: 'Angular form', type: 'seg', kind: GEOM, options: [['complex', 'e^{imφ}'], ['cos', 'cos mφ'], ['sin', 'sin mφ']], hint: 'The complex orbital has no φ dependence in |ψ|², so it is a ring. Real combinations give the lobes.' },
      { group: 'View', key: 'view', label: 'View', type: 'seg', kind: GEOM, options: [['volume', 'Ray integrated'], ['section', 'Section']] },
      RANGE('View', 'yaw', 'Yaw', GEOM, 0, 360, 1, deg, { dimUnless: s => s.view === 'volume' }),
      RANGE('View', 'pitch', 'Pitch', GEOM, -89, 89, 1, deg, { dimUnless: s => s.view === 'volume' }),
      RANGE('View', 'steps', 'Ray steps', GEOM, 48, 384, 8, String, { dimUnless: s => s.view === 'volume' }),
      { group: 'View', key: 'plane', label: 'Section plane', type: 'seg', kind: GEOM, options: [['xz', 'xz (through the axis)'], ['xy', 'xy (equator)'], ['yz', 'yz']], dimUnless: s => s.view === 'section' },
      RANGE('View', 'offset', 'Plane offset', GEOM, -0.9, 0.9, 0.01, f2, { dimUnless: s => s.view === 'section', hint: 'As a fraction of the framing radius.' }),
      RANGE('View', 'frame', 'Framing', GEOM, 0.4, 1.6, 0.02, f2, { hint: 'Half-width of the picture relative to the sphere holding 99.5% of the radial probability.' }),
      ASPECT_FIELD,
      { group: 'Picture', key: 'phase', label: 'Phase coloring (sign of ψ)', type: 'toggle', kind: PAINT },
      { group: 'Picture', key: 'tone', label: 'Tone', type: 'seg', kind: PAINT, options: [['log', 'Log'], ['sqrt', 'Square root'], ['linear', 'Linear']] },
      RANGE('Picture', 'expo', 'Exposure', PAINT, 0.25, 4, 0.05, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
    ],
    defaults: {
      n: 3, l: 2, m: 0, real: 'cos', view: 'volume', yaw: 30, pitch: 18, steps: 128, plane: 'xz', offset: 0, frame: 1, aspect: '1:1',
      phase: false, tone: 'log', expo: 1, gamma: 1, seed: 'schrodinger-1926',
    },
    presets: {
      dz2: pre('3d z² torus', { n: 3, l: 2, m: 0, real: 'cos', view: 'volume', yaw: 30, pitch: 18, steps: 128, frame: 1, phase: false, tone: 'log', expo: 1, gamma: 1 }, Pal.glacier),
      pz: pre('2p z section', { n: 2, l: 1, m: 0, real: 'cos', view: 'section', plane: 'xz', offset: 0, frame: 1, phase: true, tone: 'sqrt', expo: 0.8, gamma: 1 }, Pal.harbor),
      fz3: pre('4f z³ phase', { n: 4, l: 3, m: 0, real: 'cos', view: 'volume', yaw: 20, pitch: 12, steps: 160, frame: 1, phase: true, tone: 'log', expo: 1.2, gamma: 1 }, Pal.thermal),
      dxy: pre('3d xy section', { n: 3, l: 2, m: 2, real: 'sin', view: 'section', plane: 'xy', offset: 0, frame: 1, phase: true, tone: 'sqrt', expo: 0.8, gamma: 1 }, Pal.risograph),
      g: pre('5g cloud', { n: 5, l: 4, m: 2, real: 'cos', view: 'volume', yaw: 45, pitch: 30, steps: 160, frame: 1, phase: false, tone: 'log', expo: 1, gamma: 1 }, Pal.bioluminescent),
      s6: pre('6s shells', { n: 6, l: 0, m: 0, real: 'cos', view: 'section', plane: 'xz', offset: 0, frame: 1, phase: true, tone: 'log', expo: 1, gamma: 0.9 }, Pal.xray),
      dxz: pre('4d xz cloud', { n: 4, l: 2, m: 1, real: 'cos', view: 'volume', yaw: 60, pitch: 10, steps: 128, frame: 1, phase: true, tone: 'log', expo: 1, gamma: 1 }, Pal.nightshade),
    },
    hints: {
      Orbital: 'n sets the size and energy, l the shape, m the orientation. The status line counts the nodes found in the polynomials.',
      View: 'Ray integrated sums |ψ|² along each line of sight through a sphere that holds 99.5% of the electron. Section cuts one plane and shows the density in it.',
      Picture: 'Exposure is relative to the measured 99.5th percentile of the rendered density, so 1.0 always fills the tonal range.',
    },
    closedGroups: ['Picture'],
    palette: true, defaultPalette: 'glacier', paletteLabel: 'Density (background → colors)',
    headline: 'n', headlineLabel: 'principal n',
    sanitize(s) {
      s.n = U.clamp(Math.round(Number(s.n) || 1), 1, NMAX);
      s.l = U.clamp(Math.round(Number(s.l) || 0), 0, s.n - 1);
      s.m = U.clamp(Math.round(Number(s.m) || 0), 0, s.l);
      s.steps = U.clamp(Math.round(Number(s.steps) || 128), 32, 512);
    },
    surprise(rng) {
      const n = rng.int(2, 6), l = rng.int(Math.min(1, n - 1), n - 1), m = rng.int(0, l);
      const view = rng() < 0.6 ? 'volume' : 'section';
      return {
        n, l, m, real: rng.pick(['cos', 'cos', 'sin', 'complex']), view,
        yaw: rng.int(0, 359), pitch: rng.int(-40, 60), steps: 128, plane: rng.pick(['xz', 'xz', 'xy', 'yz']), offset: rng() < 0.3 ? rng.range(-0.4, 0.4) : 0,
        frame: rng.range(0.8, 1.2), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        phase: rng() < 0.5, tone: rng.pick(['log', 'log', 'sqrt']), expo: rng.range(0.8, 1.4), gamma: rng.range(0.85, 1.15),
      };
    },
    create(host) {
      const start = glStart(host);
      if (!start.gl) return start.dead;
      const gl = start.gl;
      let pass;
      try { pass = new G.Pass(gl, ORB_FS); } catch (err) { console.error(err); return start.dead('Shader compilation failed on this GPU'); }
      let ramp = null, pal = null, rampKey = '', orb = null, orbKey = '', scale = 1, token = 0;
      const MEAS = 128;
      let measT = null, measW = 0, measH = 0;
      function ensureRamp(s) {
        const key = s.bg + '|' + s.palette.join(',');
        if (ramp && rampKey === key) return;
        if (ramp) { ramp.dispose(); pal.dispose(); }
        ramp = G.rampTexture(gl, s.palette, s.bg);
        pal = G.rampTexture(gl, s.palette, null);
        rampKey = key;
      }
      function ensureOrbital(s) {
        const key = s.n + '/' + s.l + '/' + s.m;
        if (orb && orbKey === key) return orb;
        orb = orbital(s.n, s.l, s.m); orbKey = key;
        return orb;
      }
      function camera(s) {
        const y = s.yaw * PI / 180, p = s.pitch * PI / 180;
        const f = [-Math.cos(p) * Math.cos(y), -Math.cos(p) * Math.sin(y), -Math.sin(p)];
        // right = normalize(cross(forward, z))
        let r = [f[1], -f[0], 0];
        const rl = Math.hypot(r[0], r[1]) || 1;
        r = [r[0] / rl, r[1] / rl, 0];
        const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
        return [r[0], r[1], r[2], u[0], u[1], u[2], f[0], f[1], f[2]];
      }
      function uniforms(s, w, h, ox, oy, raw) {
        ensureRamp(s);
        const o = ensureOrbital(s);
        return {
          u_res: [w, h], u_off: [ox, oy], u_lag: o.lag, u_leg: o.leg,
          u_n: { int: s.n }, u_l: { int: s.l }, u_m: { int: s.m }, u_real: { int: s.real === 'cos' ? 1 : (s.real === 'sin' ? 2 : 0) },
          u_view: { int: s.view === 'section' ? 1 : 0 }, u_steps: { int: s.steps }, u_plane: { int: s.plane === 'xy' ? 1 : (s.plane === 'yz' ? 2 : 0) },
          u_tone: { int: s.tone === 'log' ? 0 : (s.tone === 'sqrt' ? 1 : 2) }, u_phase: { int: s.phase ? 1 : 0 }, u_raw: { int: raw ? 1 : 0 },
          u_norm: o.norm, u_anorm: o.anorm, u_rmax: o.rmax, u_frame: s.frame, u_offset: s.offset * o.rmax * s.frame,
          u_scale: scale, u_expo: s.expo, u_gamma: s.gamma, u_cam: camera(s),
          u_bg: hex01(s.bg), u_ramp: ramp, u_pal: pal,
        };
      }
      // exposure: render a small copy of the same composition, read the packed log density and take the
      // 99.5th percentile of the pixels inside the sphere; then() draws once the readback lands
      function measure(s, then) {
        const ar = ASPECTS[s.aspect] || 1;
        const mw = MEAS, mh = Math.max(8, Math.round(MEAS * ar));
        if (!measT || measW !== mw || measH !== mh) {
          if (measT) measT.dispose();
          measT = new G.Target(gl, mw, mh, { type: 'rgba8', filter: 'nearest' });
          measW = mw; measH = mh;
        }
        pass.draw(measT, uniforms(s, mw, mh, 0, 0, true));
        const mine = ++token;
        readAsync(gl, measT).then(px => {
          if (mine !== token) return;
          const vals = [];
          for (let i = 0; i < mw * mh; i++) {
            const v = px[i * 4] / 255 + px[i * 4 + 1] / (255 * 255);
            if (v > 0) vals.push(Math.pow(2, v * 90 - 60));
          }
          let hi = 0;
          if (vals.length) { vals.sort((a, b) => a - b); hi = vals[Math.min(vals.length - 1, Math.floor(0.995 * (vals.length - 1)))]; }
          scale = hi > 0 ? 1 / hi : 1;
          then();
        }, err => { console.error(err); scale = 1; then(); });
      }
      function draw() {
        const s = host.getState();
        pass.draw(null, uniforms(s, host.canvas.width, host.canvas.height, 0, 0, false));
        gl.finish();
        const o = orb;
        host.setStatus(
          '<span><b>' + orbitalName(s) + '</b></span>' +
          '<span>radial nodes <b>' + o.radialNodes + '</b> · angular <b>' + (o.thetaNodes + s.m) + '</b></span>' +
          '<span>r₉₉.₅ <b>' + f1(o.rmax) + ' a₀</b></span>' +
          '<span>' + (s.view === 'section' ? s.plane + ' section' : s.steps + ' ray steps') + '</span>');
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() { measure(host.getState(), draw); },
        repaint() { draw(); },
        resize() { draw(); },
        pause() {}, resume() { draw(); },
        async exportPNG(w, h) {
          const s = host.getState();
          const blob = await exportTiled(gl, w, h, (target, ox, oy) => { pass.draw(target, uniforms(s, w, h, ox, oy, false)); gl.finish(); });
          draw();
          return blob;
        },
      };
    },
  });
})();
