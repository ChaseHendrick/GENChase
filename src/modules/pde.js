
/* modules/pde.js */
/* GENChase — Cahn–Hilliard, Swift–Hohenberg, Kuramoto–Sivashinsky: 4th-order pattern-forming PDEs. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl;
  const TAU = U.TAU, PI = Math.PI;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RED = 32;
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
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

  const HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
float crossed(float value, float limit){
  return isnan(value) || isinf(value) || abs(value) > limit ? 1.0 : 0.0;
}
float lap(sampler2D t, vec2 uv, vec2 px){
  return texture(t, uv + vec2(px.x, 0.0)).r + texture(t, uv - vec2(px.x, 0.0)).r
       + texture(t, uv + vec2(0.0, px.y)).r + texture(t, uv - vec2(0.0, px.y)).r
       - 4.0 * texture(t, uv).r;
}
`;

  const MU_CH = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res; uniform float u_eps2;
void main(){
  vec2 px = 1.0 / u_res;
  float c = texture(u_c, v_uv).r;
  float mu = (c * c * c - c) - u_eps2 * lap(u_c, v_uv, px);
  outColor = vec4(mu, 0.0, 0.0, 1.0);
}`;

  // Symmetric face mobility gives equal and opposite fluxes to neighboring cells.
  // This discretizes div(M(c) grad(mu)); M(c) lap(mu) alone is not conservative.
  const MOBILITY_FLUX = `
float mobility(float c) { return max(1.0 - c*c, 0.0); }
float mobilityFlux(sampler2D field, sampler2D chem, vec2 uv, vec2 px) {
  float c = texture(field, uv).r, mu = texture(chem, uv).r;
  float m = mobility(c);
  vec2 e = vec2(px.x, 0.0), n = vec2(0.0, px.y);
  float ce = texture(field, uv+e).r, cw = texture(field, uv-e).r;
  float cn = texture(field, uv+n).r, cs = texture(field, uv-n).r;
  return 0.5*(m+mobility(ce))*(texture(chem,uv+e).r-mu)
       + 0.5*(m+mobility(cw))*(texture(chem,uv-e).r-mu)
       + 0.5*(m+mobility(cn))*(texture(chem,uv+n).r-mu)
       + 0.5*(m+mobility(cs))*(texture(chem,uv-n).r-mu);
}`;

  const STEP_CH = HEAD + `
uniform sampler2D u_c, u_mu; uniform vec2 u_res;
uniform float u_dt, u_M, u_deg, u_noise, u_step, u_nOff;
${G.GLSL.hash}
${MOBILITY_FLUX}
void main(){
  vec2 px = 1.0 / u_res;
  float c = texture(u_c, v_uv).r;
  float diffusion = u_M * lap(u_mu, v_uv, px);
  if (u_deg > 0.5) diffusion = u_M * mobilityFlux(u_c, u_mu, v_uv, px);
  float n = 0.0;
  if (u_noise > 0.0) n = (hash21(v_uv * u_res + vec2(u_nOff, u_step)) - 0.5) * 2.0 * u_noise;
  c += u_dt * (diffusion + n);
  outColor = vec4(c, max(texture(u_c, v_uv).g, crossed(c, 1.7)), 0.0, 1.0);
}`;

  const STEP_OK = HEAD + `
uniform sampler2D u_c, u_mu; uniform vec2 u_res;
uniform float u_dt, u_M, u_deg, u_noise, u_step, u_nOff, u_sigma, u_m;
${G.GLSL.hash}
${MOBILITY_FLUX}
void main(){
  vec2 px = 1.0 / u_res;
  float c = texture(u_c, v_uv).r;
  float diffusion = u_M * lap(u_mu, v_uv, px);
  if (u_deg > 0.5) diffusion = u_M * mobilityFlux(u_c, u_mu, v_uv, px);
  float n = 0.0;
  if (u_noise > 0.0) n = (hash21(v_uv * u_res + vec2(u_nOff, u_step)) - 0.5) * 2.0 * u_noise;
  c += u_dt * (diffusion - u_sigma * (c - u_m) + n);
  outColor = vec4(c, max(texture(u_c, v_uv).g, crossed(c, 1.7)), 0.0, 1.0);
}`;

  // Active Model B+: mu gains lambda |grad phi|^2, and the Laplacian of phi rides along in .g for the zeta current
  const MU_AMB = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res; uniform float u_eps2, u_lambda;
void main(){
  vec2 px = 1.0 / u_res;
  float c = texture(u_c, v_uv).r;
  float L = lap(u_c, v_uv, px);
  float gx = 0.5 * (texture(u_c, v_uv + vec2(px.x, 0.0)).r - texture(u_c, v_uv - vec2(px.x, 0.0)).r);
  float gy = 0.5 * (texture(u_c, v_uv + vec2(0.0, px.y)).r - texture(u_c, v_uv - vec2(0.0, px.y)).r);
  float mu = (c * c * c - c) - u_eps2 * L + u_lambda * (gx * gx + gy * gy);
  outColor = vec4(mu, L, 0.0, 1.0);
}`;

  const STEP_AMB = HEAD + `
uniform sampler2D u_c, u_mu; uniform vec2 u_res;
uniform float u_dt, u_M, u_zeta, u_noise, u_step, u_nOff;
${G.GLSL.hash}
void main(){
  vec2 px = 1.0 / u_res;
  float c = texture(u_c, v_uv).r;
  vec2 E = vec2(px.x, 0.0), N = vec2(0.0, px.y);
  // zeta current J = zeta (lap phi) grad phi, divergence from face-centered fluxes so mass is conserved
  float Lc = texture(u_mu, v_uv).g;
  float Le = texture(u_mu, v_uv + E).g, Lw = texture(u_mu, v_uv - E).g, Ln = texture(u_mu, v_uv + N).g, Ls = texture(u_mu, v_uv - N).g;
  float ce = texture(u_c, v_uv + E).r, cw = texture(u_c, v_uv - E).r, cn = texture(u_c, v_uv + N).r, cs = texture(u_c, v_uv - N).r;
  float div = 0.5 * (Lc + Le) * (ce - c) - 0.5 * (Lc + Lw) * (c - cw)
            + 0.5 * (Lc + Ln) * (cn - c) - 0.5 * (Lc + Ls) * (c - cs);
  float n = 0.0;
  if (u_noise > 0.0) n = (hash21(v_uv * u_res + vec2(u_nOff, u_step)) - 0.5) * 2.0 * u_noise;
  c += u_dt * (u_M * lap(u_mu, v_uv, px) - u_zeta * div + n);
  outColor = vec4(c, max(texture(u_c, v_uv).g, crossed(c, 1.7)), 0.0, 1.0);
}`;

  const MU_SH = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res;
void main(){
  vec2 px = 1.0 / u_res;
  outColor = vec4(lap(u_c, v_uv, px), 0.0, 0.0, 1.0);
}`;

  const STEP_SH = HEAD + `
uniform sampler2D u_c, u_mu; uniform vec2 u_res;
uniform float u_dt, u_r, u_k0, u_g, u_cub, u_noise, u_step, u_nOff;
${G.GLSL.hash}
void main(){
  vec2 px = 1.0 / u_res;
  float u = texture(u_c, v_uv).r;
  float v = texture(u_mu, v_uv).r;
  float w = lap(u_mu, v_uv, px);
  float k2 = u_k0 * u_k0;
  float lin = u_r * u - (k2 * k2 * u + 2.0 * k2 * v + w);
  float N = u_g * u * u - u_cub * u * u * u;
  float n = 0.0;
  if (u_noise > 0.0) n = (hash21(v_uv * u_res + vec2(u_nOff, u_step)) - 0.5) * 2.0 * u_noise;
  u += u_dt * (lin + N + n);
  outColor = vec4(u, max(texture(u_c, v_uv).g, crossed(u, 4.0)), 0.0, 1.0);
}`;

  const MU_KS = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res;
void main(){
  vec2 px = 1.0 / u_res;
  outColor = vec4(lap(u_c, v_uv, px), 0.0, 0.0, 1.0);
}`;

  const STEP_KS = HEAD + `
uniform sampler2D u_c, u_mu; uniform vec2 u_res;
uniform float u_dt, u_nu, u_alpha, u_noise, u_step, u_nOff;
${G.GLSL.hash}
void main(){
  vec2 px = 1.0 / u_res;
  float u = texture(u_c, v_uv).r;
  float v = texture(u_mu, v_uv).r;
  float w = lap(u_mu, v_uv, px);
  float ux = 0.5 * (texture(u_c, v_uv + vec2(px.x, 0.0)).r - texture(u_c, v_uv - vec2(px.x, 0.0)).r);
  float uy = 0.5 * (texture(u_c, v_uv + vec2(0.0, px.y)).r - texture(u_c, v_uv - vec2(0.0, px.y)).r);
  float nl = 0.5 * u_alpha * (ux * ux + uy * uy);
  float n = 0.0;
  if (u_noise > 0.0) n = (hash21(v_uv * u_res + vec2(u_nOff, u_step)) - 0.5) * 2.0 * u_noise;
  u += u_dt * (-u_nu * w - v - nl + n);
  outColor = vec4(u, max(texture(u_c, v_uv).g, crossed(u, 10000.0)), 0.0, 1.0);
}`;

  const LAP9 = `float lap9(sampler2D t, vec2 uv, vec2 px){
  float c = texture(t, uv).r;
  float n = texture(t, uv + vec2(0.0, px.y)).r, s = texture(t, uv - vec2(0.0, px.y)).r;
  float e = texture(t, uv + vec2(px.x, 0.0)).r, w = texture(t, uv - vec2(px.x, 0.0)).r;
  float ne = texture(t, uv + px).r, nw = texture(t, uv + vec2(-px.x, px.y)).r;
  float se = texture(t, uv + vec2(px.x, -px.y)).r, sw = texture(t, uv - px).r;
  return (4.0 * (n + s + e + w) + (ne + nw + se + sw) - 20.0 * c) / 6.0;
}
`;

  const MU_PFC = HEAD + LAP9 + `
uniform sampler2D u_c; uniform vec2 u_res;
void main(){ outColor = vec4(lap9(u_c, v_uv, 1.0 / u_res), 0.0, 0.0, 1.0); }`;

  const MID_PFC = HEAD + LAP9 + `
uniform sampler2D u_c, u_v; uniform vec2 u_res;
uniform float u_r, u_k0;

void main(){
  vec2 px = 1.0 / u_res;
  float psi = texture(u_c, v_uv).r;
  float v = texture(u_v, v_uv).r;
  float w = lap9(u_v, v_uv, px);
  float k2 = u_k0 * u_k0;
  float mu = (u_r + k2 * k2) * psi + 2.0 * k2 * v + w + psi * psi * psi;
  outColor = vec4(mu, 0.0, 0.0, 1.0);
}`;

  const STEP_PFC = HEAD + LAP9 + `
uniform sampler2D u_c, u_mu; uniform vec2 u_res;
uniform float u_dt, u_M, u_damp, u_noise, u_step, u_nOff;
${G.GLSL.hash}

void main(){
  vec2 px = 1.0 / u_res;
  float psi = texture(u_c, v_uv).r;
  float lmu = lap9(u_mu, v_uv, px);
  float n = 0.0;
  if (u_noise > 0.0) n = (hash21(v_uv * u_res + vec2(u_nOff, u_step)) - 0.5) * 2.0 * u_noise;
  psi += u_dt * u_M * lmu + u_dt * n;
  outColor = vec4(psi, max(texture(u_c, v_uv).g, crossed(psi, 2.8)), 0.0, 1.0);
}`;

  const RENDER_FS = HEAD + `
uniform sampler2D u_c, u_mu;
uniform vec2 u_res;
uniform int u_view;
uniform float u_exposure, u_gamma, u_contrast, u_grain, u_lo, u_hi, u_bump, u_lightAng;
uniform vec3 u_bg;
${G.GLSL.hash}
${G.GLSL.ramp}
${G.GLSL.bicubic}
void main(){
  vec2 px = 1.0 / u_res;
  // the grid is far coarser than the plate, so the displayed value is interpolated rather than blocked up
  float u = texCR(u_c, v_uv, u_res);
  float gx = 0.5 * (texture(u_c, v_uv + vec2(px.x, 0.0)).r - texture(u_c, v_uv - vec2(px.x, 0.0)).r);
  float gy = 0.5 * (texture(u_c, v_uv + vec2(0.0, px.y)).r - texture(u_c, v_uv - vec2(0.0, px.y)).r);
  float t;
  if (u_view == 1) t = abs(u);
  else if (u_view == 2) t = length(vec2(gx, gy)) * 2.4;
  else if (u_view == 3) {
    float ang = u_lightAng * 3.14159265 / 180.0;
    vec3 N = normalize(vec3(-gx * u_bump, -gy * u_bump, 1.0));
    vec3 L = normalize(vec3(cos(ang), sin(ang), 0.85));
    t = pow(max(dot(N, L), 0.0), 1.15);
  } else if (u_view == 4) {
    float mu = texture(u_mu, v_uv).r;
    t = 0.5 + 0.5 * tanh(mu * 0.85);
  } else if (u_view == 5) {
    t = fract(atan(gy, gx) / 6.28318530718 + 1.0);
  } else {
    t = (u - u_lo) / max(u_hi - u_lo, 1e-4);
  }
  t = clamp(t, 0.0, 1.0);
  vec3 col = mix(u_bg, ramp(t), mix(0.15, 1.0, t));
  if (u_view == 0 || u_view == 1) col = ramp(t);
  // A direction is periodic. Join the palette endpoints and hide undefined
  // directions in nearly flat cells instead of creating a color seam at 2π.
  if (u_view == 5) col = mix(u_bg, ramp(t), smoothstep(0.0, 0.001, length(vec2(gx, gy))));
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  const REDUCE_FS = HEAD + `
uniform sampler2D u_c; uniform vec2 u_res, u_block;
void main(){
  vec2 o = floor(v_uv * (u_res / u_block)) * u_block;
  float sm = 0.0, sa = 0.0;
  for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (o + vec2(x, y) * u_block * 0.125 + 0.5) / u_res;
    float v = texture(u_c, uv).r;
    sm += v; sa += abs(v);
  }
  outColor = vec4(0.5 + 0.5 * clamp(sm / 64.0, -1.0, 1.0), clamp(sa / 64.0, 0.0, 4.0) / 4.0, 0.0, 1.0);
}`;

  // Every cell participates, including at non-square edges. Reducing sticky flags
  // once per batch avoids a synchronous full-field float readback on every step.
  const GUARD_FS = HEAD + `
uniform sampler2D u_c; uniform ivec2 u_size; uniform float u_limit;
void main(){
  ivec2 base = ivec2(gl_FragCoord.xy) * 8;
  float bad = 0.0;
  for(int y=0;y<8;y++) for(int x=0;x<8;x++) {
    ivec2 p = base + ivec2(x,y);
    if(p.x<u_size.x && p.y<u_size.y) {
      vec2 v = texelFetch(u_c,p,0).rg;
      bad = max(bad, max(v.g, crossed(v.r, u_limit)));
    }
  }
  outColor=vec4(bad,0.0,0.0,1.0);
}`;
  const COPY_FS = HEAD + `uniform sampler2D u_c;
void main(){ outColor=texture(u_c,v_uv); }`;

  function hexToRgb01(hex) {
    const rgb = U.hexToRgb(hex || '#000000');
    return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  }

  function pdeCreate(spec) {
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
      let muPass, stepPass, renderPass, reducePass, splatPass, guardPass, copyPass, midPass = null;
      try {
        guardPass = new G.Pass(gl, GUARD_FS);
        copyPass = new G.Pass(gl, COPY_FS);
        muPass = new G.Pass(gl, spec.muFS);
        stepPass = new G.Pass(gl, spec.stepFS);
        renderPass = new G.Pass(gl, RENDER_FS);
        reducePass = new G.Pass(gl, REDUCE_FS);
        splatPass = new G.Pass(gl, G.GLSL.splatFS);
        if (spec.midFS) midPass = new G.Pass(gl, spec.midFS);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

      let backupT = null, guardT = null, guardBuf = null, guardMessage = '', reactionMean = 0;
      let C = null, muT = null, midT = null, gw = 0, gh = 0, gbc = '', ramp = null, rampKey = '';
      const redBuf = new Uint8Array(RED * RED * 4);
      let reduceT = null, raf = 0, chunkTimer = 0, stepCount = 0, nOff = 0, meanV = 0, absV = 0;

      function sizeOf(s) {
        const n = Number(s.grid) || 192;
        const ar = ASPECTS[s.aspect] || 1;
        let W = n, H = Math.max(64, Math.round(n * ar));
        return [W & ~1, H & ~1];
      }
      function ensureGrid(s) {
        const [W, H] = sizeOf(s);
        // clamp-to-edge sampling makes every finite difference see its own value past the wall: a zero-gradient (no-flux) boundary
        const wrap = s.bc === 'noflux' ? 'clamp' : 'repeat';
        if (C && gw === W && gh === H && gbc === wrap) return;
        if (C) { C.dispose(); muT.dispose(); backupT.dispose(); guardT.dispose(); if (midT) midT.dispose(); }
        C = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap });
        muT = new G.Target(gl, W, H, { type: texType, filter: 'nearest', wrap });
        backupT = new G.Target(gl, W, H, { type: texType, filter: 'nearest', wrap });
        guardT = new G.Target(gl, Math.ceil(W / 8), Math.ceil(H / 8), { type: 'rgba8' });
        guardBuf = new Uint8Array(guardT.w * guardT.h * 4);
        midT = midPass ? new G.Target(gl, W, H, { type: texType, filter: 'nearest', wrap }) : null;
        gw = W; gh = H; gbc = wrap;
        if (reduceT) reduceT.dispose();
        reduceT = new G.Target(gl, RED, RED, { type: 'rgba8', filter: 'nearest' });
      }
      function upload(target, f32) {
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        if (texType === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, f32);
        else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.HALF_FLOAT, toHalf(f32));
      }
      function ensureRamp(s) {
        const cyclic = s.view === 'orient';
        const key = cyclic + '|' + (s.bg || '') + '|' + (s.palette || []).join(',');
        if (ramp && rampKey === key) return;
        if (ramp) ramp.dispose();
        ramp = cyclic ? G.rampTexture(gl, [...s.palette, s.palette[0]], null) : G.rampTexture(gl, s.palette, s.bg); rampKey = key;
      }
      function refreshChem(s) {
        muPass.draw(muT, Object.assign({ u_c: C.read, u_res: [gw, gh] }, spec.muUniforms(s)));
        if (midPass) midPass.draw(midT, Object.assign({ u_c: C.read, u_v: muT, u_res: [gw, gh] }, spec.midUniforms(s)));
      }
      function crossedGuard() {
        guardPass.draw(guardT, { u_c: C.read, u_size: { ivec: [gw, gh] }, u_limit: spec.id === 'ks' ? 10000 : spec.id === 'swift' ? 4 : spec.id === 'pfc' ? 2.8 : 1.7 });
        gl.bindFramebuffer(gl.FRAMEBUFFER, guardT.fbo);
        gl.readPixels(0, 0, guardT.w, guardT.h, gl.RGBA, gl.UNSIGNED_BYTE, guardBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (gl.getError() !== gl.NO_ERROR) return true;
        for (let i = 0; i < guardBuf.length; i += 4) if (guardBuf[i]) return true;
        return false;
      }
      function step(n) {
        if (guardMessage || n <= 0) return false;
        const s = host.getState();
        copyPass.draw(backupT, { u_c: C.read });
        for (let i = 0; i < n; i++) {
          muPass.draw(muT, Object.assign({ u_c: C.read, u_res: [gw, gh] }, spec.muUniforms(s)));
          const chem = midPass ? midT : muT;
          if (midPass) midPass.draw(midT, Object.assign({ u_c: C.read, u_v: muT, u_res: [gw, gh] }, spec.midUniforms(s)));
          stepPass.draw(C.write, Object.assign({
            u_c: C.read, u_mu: chem, u_res: [gw, gh],
            u_dt: s.dt, u_noise: s.noise, u_step: (stepCount + i) * 1.17, u_nOff: nOff,
          }, spec.stepUniforms(s), spec.id === 'ohta' ? { u_m: reactionMean } : {}));
          C.swap();
        }
        if (crossedGuard()) {
          copyPass.draw(C.read, { u_c: backupT });
          refreshChem(s);
          guardMessage = 'numerical guard: last valid batch retained; lower time step or activity, then reseed';
          stop(); measure(); status();
          return false;
        }
        stepCount += n;
        refreshChem(s);
        return true;
      }
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        const V = spec.views;
        renderPass.draw(target || null, {
          u_c: C.read, u_mu: midT || muT, u_ramp: ramp, u_res: [gw, gh],
          u_view: { int: V[s.view] || 0 },
          u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain,
          u_lo: s.lo, u_hi: s.hi, u_bump: s.bump, u_lightAng: s.lightAng,
          u_bg: hexToRgb01(s.bg),
        });
      }
      function measure() {
        reducePass.draw(reduceT, { u_c: C.read, u_res: [gw, gh], u_block: [gw / RED, gh / RED] });
        gl.bindFramebuffer(gl.FRAMEBUFFER, reduceT.fbo);
        gl.readPixels(0, 0, RED, RED, gl.RGBA, gl.UNSIGNED_BYTE, redBuf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let sm = 0, sa = 0;
        for (let i = 0; i < RED * RED; i++) {
          sm += (redBuf[i * 4] / 255) * 2 - 1;
          sa += (redBuf[i * 4 + 1] / 255) * 4;
        }
        meanV = sm / (RED * RED);
        absV = sa / (RED * RED);
      }
      function status(extra) {
        host.setStatus(
          '<span>grid <b>' + gw + '×' + gh + '</b></span>' +
          spec.status(host.getState(), meanV, absV, stepCount) +
          '<span>step <b>' + stepCount.toLocaleString() + '</b></span>' +
          (guardMessage ? '<span><b>' + guardMessage + '</b></span>' : extra ? '<span>' + extra + '</span>' : '')
        );
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(chunkTimer); chunkTimer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        const advanced = step(s.steps);
        render();
        if (!advanced) return;
        if (stepCount % 16 < s.steps) { measure(); status(); }
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stop();
        const s = host.getState();
        if (!guardMessage && s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { measure(); status(!s.running ? 'paused' : ''); render(); }
      }
      function burst(total) {
        stop();
        let left = total;
        (function chunk() {
          const n = Math.min(24, left); left -= n;
          const advanced = step(n); render();
          if (!advanced) return;
          if (left > 0) chunkTimer = setTimeout(chunk, 0);
          else { measure(); status(); startLoop(); }
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
          stop(); stepCount = 0; guardMessage = '';
          const s = host.getState();
          const rng = U.makeRng(s.seed + '/' + spec.id + '/off');
          nOff = rng.range(0, 900);
          ensureGrid(s);
          const initial = spec.seed(s, gw, gh);
          reactionMean = 0;
          for (let i = 0; i < initial.length; i += 4) reactionMean += initial[i];
          reactionMean /= gw * gh;
          upload(C.read, initial);
          refreshChem(s);
          if (crossedGuard()) { guardMessage = 'initial field exceeds the monitored range; reduce seed amplitude'; render(); measure(); status(); return; }
          const warm = host.reducedMotion() ? Math.min(s.warmup, 80) : s.warmup;
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
          else if (key === 'burst') burst(400);
        },
        disturb(p) {
          if (!C || !splatPass || guardMessage) return;
          copyPass.draw(backupT, { u_c: C.read });
          splatPass.draw(C.write, {
            u_src: C.read, u_pos: [p.x, p.yGL],
            u_add: spec.pokeAdd, u_rad: spec.pokeRad, u_amt: 1, u_mode: { int: spec.pokeMode ?? 1 },
          });
          C.swap();
          if (crossedGuard()) {
            copyPass.draw(C.read, { u_c: backupT });
            guardMessage = 'brush exceeded the monitored range; previous field retained; reseed to resume';
            stop(); refreshChem(host.getState()); render(); measure(); status(); return;
          }
          // A brush is an external material addition. Keep the original Ohta mean
          // reference: the reaction subsequently relaxes the added zero mode.
          refreshChem(host.getState()); render(); startLoop();
        },
        // The field itself for research use: the state texture read back unrounded, in lattice units
        // (cell spacing 1, as the stencils use it). The engine packs these into an .npz with provenance.
        async exportData() {
          if (!C) throw new Error('nothing to export');
          const s = host.getState(), st = G.readTarget(C.read), aux = G.readTarget(midT || muT);
          const n = gw * gh, field = new Float32Array(n), auxField = new Float32Array(n);
          for (let i = 0; i < n; i++) { field[i] = st[i * 4]; auxField[i] = aux[i * 4]; }
          return {
            arrays: {
              field: { data: field, shape: [gh, gw], description: 'the evolved field, channel 0 of the state texture (the order parameter of this tab\'s equation)' },
              state: { data: st, shape: [gh, gw, 4], description: 'all four channels of the state texture as stored' },
              auxiliary: { data: auxField, shape: [gh, gw], description: 'channel 0 of the auxiliary texture the step reads (the chemical potential for the Cahn-Hilliard family)' },
            },
            meta: { tab: spec.id, grid: [gw, gh], cellSpacing: 1, units: 'dimensionless lattice units', boundary: s.bc === 'noflux' ? 'no-flux' : 'periodic',
              steps: stepCount, dt: s.dt, time: stepCount * s.dt, timeNote: 'steps times the current dt; exact only if dt was not changed during the run',
              precision: texType, guard: guardMessage || null },
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

  // Constant-mobility linearization about a uniform c has decay rate
  // M q (3c^2 - 1 + eps^2 q), with q in [0, 8] for the unit-cell 5-point stencil.
  // Use the solver's monitored concentration envelope, |c| <= 1.7, instead of 1.2:
  // a disturbance can reach larger amplitudes and the old ceiling amplified grid-scale modes.
  // The 0.8 margin is a conditional linear estimate, not a nonlinear/variable-mobility stability proof.
  // The optional reaction rate covers Ohta-Kawasaki's additional -sigma(c-m) term.
  // States outside the stored envelope are not covered by this estimate.
  function chMaxDt(M, eps, reactionRate = 0) {
    const L = 8, cMax = 1.7, cubic = 3 * cMax * cMax;
    const rate = Math.max(1e-6, (M || 1) * (eps * eps * L * L + cubic * L - L) + reactionRate);
    return 1.6 / rate;
  }

  // Explicit Euler on the 5-point lattice. The discrete Laplacian's symbol runs over [-8, 0], so the stiffest
  // linear mode always sits at the grid scale and the step has to satisfy dt < 2/|lambda| there.
  //
  // Kuramoto-Sivashinsky is du/dt = -nu L^2 u - L u with L the discrete Laplacian, so lambda(L) = -nu L^2 - L
  // and the worst case at L = -8 is |lambda| = 64 nu - 8. Past that the grid-scale mode grows every step and
  // the plate becomes a checkerboard, which a thumbnail averages back into a plausible flame. The 0.8 factor
  // leaves room for the (alpha/2)|grad u|^2 term, which the linear estimate does not see.
  function ksMaxDt(nu) {
    return 1.6 / Math.max(1e-6, 64 * (Number(nu) || 1) - 8);
  }
  // SH's local derivative is r + 2g u - 3 cub u². Bound its negative
  // part on |u|<=4, together with the full lattice symbol, with a 0.8 margin.
  function shMaxDt(r, k0, g, cub) {
    const k2 = Number(k0) ** 2, A = 4;
    const stiff = Math.max(k2 * k2, (8 - k2) ** 2);
    return 1.6 / Math.max(1e-6, stiff - Number(r) + 2 * Math.abs(Number(g)) * A + 3 * Number(cub) * A * A);
  }
  // Δ9 has q=-symbol in [0,16/3]. Linearizing PFC about uniform psi
  // gives decay M q [r+(k0²-q)²+3psi²]. Bound it on |psi|<=2.8.
  // This is a conditional frozen-state estimate, not global nonlinear stability.
  function pfcMaxDt(M, r, k0) {
    const Q = 16 / 3, k2 = Number(k0) ** 2, A = 2.8;
    return 1.6 / Math.max(1e-6, Number(M) * Q * (Math.max(0, Number(r)) + Math.max(k2 * k2, (Q - k2) ** 2) + 3 * A * A));
  }

  function seedNoise(s, W, H, amp, mean) {
    const rng = U.makeRng(s.seed + '/pde');
    const data = new Float32Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      data[i * 4] = mean + (rng() * 2 - 1) * amp;
      data[i * 4 + 3] = 1;
    }
    return data;
  }

  const GRID = [
    { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128, '128'], [192, '192'], [256, '256'], [384, '384'], [512, '512'], [768, '768'], [1024, '1024']] },
    { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
    { group: 'Grid', key: 'bc', label: 'Boundary', type: 'seg', kind: GEOM, options: [['periodic', 'Periodic'], ['noflux', 'No-flux']],
      hint: 'Periodic wraps the plate into a torus, so patterns tile. No-flux is a closed dish: zero gradient at the walls, so domains and stripes meet the edge instead of continuing through it.' },
  ];
  function simFields() {
    return [
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 8, 1, String),
      RANGE('Simulation', 'dt', 'Time step', LIVE, 0.0001, 0.12, 0.0001, v => v.toFixed(4), { hint: 'Explicit Euler. A parameter-dependent ceiling limits the step; it is not a nonlinear stability proof. A numerical guard stops and retains the last valid batch instead of clipping the field.' }),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 2000, 50, String),
      { group: 'Simulation', key: 'burst', label: 'Run 400 steps', type: 'action' },
      { group: 'Simulation', key: 'reseed', label: 'Reseed', type: 'action' },
    ];
  }
  function pictureFields(views) {
    return [
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true, options: views },
      RANGE('Picture', 'lo', 'Black point', PAINT, -2, 1, 0.02, f2),
      RANGE('Picture', 'hi', 'White point', PAINT, 0, 2, 0.02, f2),
      RANGE('Picture', 'bump', 'Relief', PAINT, 0.5, 12, 0.1, f1, { dimUnless: s => s.view === 'shade' }),
      RANGE('Picture', 'lightAng', 'Light angle', PAINT, 0, 360, 5, v => v + '°', { dimUnless: s => s.view === 'shade' }),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ];
  }
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  /* ---------- Cahn–Hilliard ---------- */
  Studio.register({
    id: 'cahn',
    name: 'Cahn–Hilliard',
    subtitle: 'spinodal decomposition · 1958',
    order: 56,
    equation: '∂c/∂t = ∇·[M ∇μ],   μ = c³ − c − ε² ∇²c',
    credit: "John W. Cahn and John E. Hilliard, J. Chem. Phys. 28, 258 (1958). A binary mixture whose free energy has two wells is unstable inside the spinodal: infinitesimal fluctuations grow, then the domains coarsen. With constant mobility the late-stage length grows as t^{1/3}. Degenerate mobility M ∝ max(1−c²,0) suppresses mobility near pure phases; it does not imply pure surface diffusion for this polynomial free energy (Lee, Munch and Suli, 2015).",
    blurb: 'A uniform mixture, cooled through the spinodal, does not wait for a nucleus. Every wavelength inside a band is unstable, the field breaks into A and B, and then the interfaces move so that the small domains feed the large ones. That coarsening is why the plate changes as you watch: the pattern is the same kind of thing at a larger scale. Mean composition c₀ is the fork in the road. Near zero you get a bicontinuous labyrinth. Off-critical, droplets of the minority phase in a sea of the majority.',
    schema: GRID.concat([
      RANGE('Mixture', 'c0', 'Mean composition c₀', GEOM, -0.6, 0.6, 0.01, f2, {
        hint: 'c₀ = 0 is critical: bicontinuous spinodal. |c₀| ≳ 0.2 is off-critical: droplets of the minority phase.' }),
      RANGE('Mixture', 'eps', 'Interface width ε', LIVE, 0.6, 2.4, 0.05, f2, {
        hint: 'ε sets how thick the A/B wall is, in cells. Smaller ε, sharper interfaces, more (and slower) coarsening.' }),
      RANGE('Mixture', 'M', 'Mobility M', LIVE, 0.2, 2.5, 0.05, f2),
      { group: 'Mixture', key: 'deg', label: 'Degenerate mobility', type: 'toggle', kind: LIVE,
        hint: 'M(c) = M max(1−c²,0), applied as conservative face fluxes. Mobility is reduced near pure phases; this is not a pure surface-diffusion model.' },
      RANGE('Mixture', 'amp', 'Quench amplitude', GEOM, 0.02, 0.5, 0.01, f2),
      RANGE('Mixture', 'noise', 'Additive forcing', LIVE, 0, 0.08, 0.002, f3, { hint: 'Independent cell forcing changes total composition. Set to zero for the deterministic conservative model; this is not conserved thermal noise.' }),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['quench', 'Quench'], ['drops', 'Drops'], ['bands', 'Bands']] },
    ]).concat(simFields()).concat(pictureFields([
      ['field', 'Composition'], ['abs', '|c|'], ['grad', 'Interfaces'], ['shade', 'Relief'], ['mu', 'μ'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 512, aspect: '1:1', bc: 'periodic',
      c0: 0, eps: 1.1, M: 1, deg: false, amp: 0.12, noise: 0.004, init: 'quench',
      running: true, steps: 3, dt: 0.014, warmup: 2000,
      view: 'field', lo: -1, hi: 1, bump: 4, lightAng: 35, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.06,
      seed: 'cahn-1958',
    },
    presets: {
      labyrinth: pre('Labyrinth', { c0: 0, init: 'quench', view: 'field', warmup: 500, eps: 1.1 }, Pal.graphite),
      droplets: pre('Droplets', { c0: -0.35, init: 'quench', view: 'field', warmup: 600, amp: 0.18 }, Pal.petri),
      sharp: pre('Sharp interfaces', { c0: 0, deg: true, eps: 0.85, view: 'grad', warmup: 400 }, Pal.xray),
      relief: pre('Relief', { c0: 0.05, view: 'shade', bump: 6, warmup: 500 }, Pal.harbor),
      bands: pre('Bands', { init: 'bands', c0: 0, view: 'field', warmup: 200, eps: 1.3 }, Pal.glacier),
    },
    closedGroups: ['Seeding'],
    hints: {
      Mixture: 'c₀ is the only number that changes the topology of the quench. ε is the wall thickness. Degenerate mobility is how you get the late-stage “soap foam” look instead of a blurry mix.',
      Picture: 'Composition is the phase field itself, −1 to +1 through the palette. Interfaces is |∇c|, the walls. Relief treats c as height.',
    },
    palette: true, defaultPalette: 'graphite', paletteLabel: 'Colors (A → B)',
    headline: 'c0', headlineLabel: 'mean c₀',
    sanitize(s) { s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024); s.dt = U.clamp(Number(s.dt) || 0.014, 0.0001, chMaxDt(s.M, s.eps)); },
    surprise(rng) {
      const c0 = rng.pick([0, 0, 0.05, -0.3, 0.35, -0.45]);
      return {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        c0, eps: rng.range(0.85, 1.6), M: rng.range(0.7, 1.4), deg: rng() < 0.25,
        amp: rng.range(0.08, 0.25), noise: rng.pick([0, 0.003, 0.01]),
        init: Math.abs(c0) < 0.15 ? rng.pick(['quench', 'quench', 'bands']) : 'quench',
        running: true, steps: rng.int(2, 4), dt: 0.014, warmup: rng.int(1400, 3000),
        view: rng.pick(['field', 'field', 'grad', 'shade']), lo: -1, hi: 1, bump: rng.range(3, 8),
        lightAng: rng.int(0, 360), exposure: rng.range(0.9, 1.15), gamma: rng.range(0.85, 1.2),
        contrast: rng.range(0.95, 1.2), grain: rng.pick([0, 0.05, 0.1]),
      };
    },
    create: pdeCreate({
      id: 'cahn', muFS: MU_CH, stepFS: STEP_CH,
      views: { field: 0, abs: 1, grad: 2, shade: 3, mu: 4 },
      pokeAdd: [1, 0, 0, 1], pokeRad: 0.06, pokeMode: 0,
      muUniforms: s => ({ u_eps2: s.eps * s.eps }),
      stepUniforms: s => ({ u_M: s.M, u_deg: s.deg ? 1 : 0 }),
      status: (s, mean) => {
        return '<span>⟨c⟩ ≈ <b>' + mean.toFixed(2) + '</b></span>';
      },
      seed(s, W, H) {
        const rng = U.makeRng(s.seed + '/cahn');
        const data = new Float32Array(W * H * 4);
        if (s.init === 'bands') {
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const v = Math.sin((x / W) * TAU * 3) > 0 ? 1 : -1;
            data[(y * W + x) * 4] = v * 0.9 + (rng() * 2 - 1) * s.amp * 0.3;
            data[(y * W + x) * 4 + 3] = 1;
          }
        } else if (s.init === 'drops') {
          data.fill(0);
          for (let i = 0; i < W * H; i++) { data[i * 4] = s.c0; data[i * 4 + 3] = 1; }
          const n = 8;
          for (let k = 0; k < n; k++) {
            const cx = rng.range(0.15, 0.85) * W, cy = rng.range(0.15, 0.85) * H, R = rng.range(4, 12), sg = rng() < 0.5 ? 1 : -1;
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              const d = Math.hypot(x - cx, y - cy);
              if (d < R) data[(y * W + x) * 4] = sg;
            }
          }
        } else {
          for (let i = 0; i < W * H; i++) {
            data[i * 4] = s.c0 + (rng() * 2 - 1) * s.amp;
            data[i * 4 + 3] = 1;
          }
        }
        return data;
      },
    }),
  });

  /* ---------- Ohta–Kawasaki ---------- */
  Studio.register({
    id: 'ohta',
    name: 'Ohta–Kawasaki',
    tab: 'Ohta–Kawasaki',
    subtitle: 'diblock copolymer · finite-size spots and lamellae · 1986',
    order: 56.5,
    equation: '∂u/∂t = ∇·[M(u)∇μ] − σ(u−m),   μ = u³ − u − ε²Δu',
    credit: "Takao Ohta and Kyozi Kawasaki, Macromolecules 19, 2621 (1986). A diblock melt is Cahn–Hilliard plus a long-range Coulomb term from the incompressibility of the chains: the inverse Laplacian turns, after one more Laplacian in the dynamics, into −σ(u−m). The long-range penalty can frustrate ordinary coarsening and favor microstructured states. Pattern selection depends on composition and parameters; a finite preview does not prove equilibrium.",
    blurb: 'A diblock links two chemistries into one chain. The long-range penalty opposes macroscopic segregation and can favor a finite pattern scale. Here the constant-mobility model adds −σ(u−m) to Cahn–Hilliard, with m fixed to the actual initialized mean. Added site noise and a brush can change the mean; after a brush the reaction relaxes it toward m. The optional variable mobility is a local-flux variant, not the full variable-mobility nonlocal Ohta–Kawasaki equation.',
    schema: GRID.concat([
      RANGE('Copolymer', 'c0', 'Mean m', GEOM, -0.5, 0.5, 0.01, f2, {
        hint: 'Baseline composition for the seed. With noise off and no brush, the actual initialized mean is conserved. Composition affects morphology but is not a phase diagnosis.' }),
      RANGE('Copolymer', 'eps', 'Interface width ε', LIVE, 0.7, 2.2, 0.05, f2),
      RANGE('Copolymer', 'sigma', 'Long-range σ', LIVE, 0, 0.24, 0.002, f3, {
        hint: 'For constant mobility and homogeneous mean m, a lattice mode q grows at M q(1−3m²−ε²q)−σ. The familiar σ < M/(4ε²) estimate applies only at m=0 in the continuum. It is not a universal phase boundary.' }),
      RANGE('Copolymer', 'M', 'Mobility M', LIVE, 0.2, 2.5, 0.05, f2),
      { group: 'Copolymer', key: 'deg', label: 'Degenerate mobility', type: 'toggle', kind: LIVE },
      RANGE('Copolymer', 'amp', 'Quench amplitude', GEOM, 0.02, 0.5, 0.01, f2),
      RANGE('Copolymer', 'noise', 'Added noise', LIVE, 0, 0.06, 0.002, f3, { hint: 'Additive site forcing, not conserved thermal noise. Turn off for the deterministic model.' }),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['quench', 'Quench'], ['drops', 'Drops'], ['bands', 'Bands']] },
    ]).concat(simFields()).concat(pictureFields([
      ['field', 'Composition'], ['abs', '|u|'], ['grad', 'Interfaces'], ['shade', 'Relief'], ['mu', 'μ'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 512, aspect: '1:1', bc: 'periodic',
      c0: 0, eps: 1.05, sigma: 0.06, M: 1, deg: false, amp: 0.14, noise: 0.003, init: 'quench',
      running: true, steps: 3, dt: 0.015, warmup: 2200,
      view: 'field', lo: -1, hi: 1, bump: 4, lightAng: 35, exposure: 1, gamma: 1, contrast: 1.08, grain: 0.05,
      seed: 'ohta-1986',
    },
    presets: {
      lamellae: pre('Lamellae', { c0: 0, sigma: 0.05, init: 'quench', view: 'field', warmup: 800 }, Pal.graphite),
      spots: pre('Spots', { c0: -0.32, sigma: 0.09, init: 'quench', view: 'field', warmup: 900, amp: 0.2 }, Pal.petri),
      fingerprint: pre('Fingerprint', { c0: 0.08, sigma: 0.12, view: 'grad', warmup: 750, eps: 0.9 }, Pal.xray),
      relief: pre('Relief', { c0: 0, sigma: 0.05, view: 'shade', bump: 6, warmup: 700 }, Pal.harbor),
      coarse: pre('Soft σ', { c0: 0, sigma: 0.015, view: 'field', warmup: 600 }, Pal.glacier),
    },
    closedGroups: ['Seeding'],
    hints: {
      Copolymer: 'σ penalizes deviations from the initialized mean. Composition, mobility, interface width and domain size jointly affect the pattern. The preview does not establish an equilibrium phase.',
    },
    palette: true, defaultPalette: 'graphite', paletteLabel: 'Colors (A → B)',
    headline: 'sigma', headlineLabel: 'σ',
    sanitize(s) { s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024); s.sigma = U.clamp(Number(s.sigma) || 0, 0, 0.3); s.dt = U.clamp(Number(s.dt) || 0.015, 0.0001, chMaxDt(s.M, s.eps, s.sigma)); },
    surprise(rng) {
      const c0 = rng.pick([0, 0, 0.05, -0.3, 0.32]);
      return {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5']),
        c0, eps: rng.range(0.85, 1.5), sigma: rng.range(0.02, 0.11), M: 1, deg: rng() < 0.15,
        amp: rng.range(0.08, 0.22), noise: rng.pick([0, 0.003, 0.01]), init: 'quench',
        running: true, steps: rng.int(2, 4), dt: 0.015, warmup: rng.int(1500, 3200),
        view: rng.pick(['field', 'field', 'grad', 'shade']), lo: -1, hi: 1, bump: rng.range(3, 8),
        lightAng: rng.int(0, 360), exposure: rng.range(0.9, 1.15), gamma: rng.range(0.85, 1.2),
        contrast: rng.range(0.95, 1.2), grain: rng.pick([0, 0.05, 0.1]),
      };
    },
    create: pdeCreate({
      id: 'ohta', muFS: MU_CH, stepFS: STEP_OK,
      views: { field: 0, abs: 1, grad: 2, shade: 3, mu: 4 },
      pokeAdd: [1, 0, 0, 1], pokeRad: 0.07, pokeMode: 0,
      muUniforms: s => ({ u_eps2: s.eps * s.eps }),
      stepUniforms: s => ({ u_M: s.M, u_deg: s.deg ? 1 : 0, u_sigma: s.sigma, u_m: s.c0 }),
      status: (s, mean) => {
        return '<span>⟨u⟩ ≈ <b>' + mean.toFixed(2) + '</b></span><span>σ <b>' + s.sigma.toFixed(3) + '</b></span>';
      },
      seed(s, W, H) {
        const rng = U.makeRng(s.seed + '/ohta');
        const data = new Float32Array(W * H * 4);
        if (s.init === 'bands') {
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const v = Math.sin((x / W) * TAU * 5) > 0 ? 1 : -1;
            data[(y * W + x) * 4] = v * 0.85 + (rng() * 2 - 1) * s.amp * 0.3;
            data[(y * W + x) * 4 + 3] = 1;
          }
        } else if (s.init === 'drops') {
          for (let i = 0; i < W * H; i++) { data[i * 4] = s.c0; data[i * 4 + 3] = 1; }
          const n = 10;
          for (let k = 0; k < n; k++) {
            const cx = rng.range(0.12, 0.88) * W, cy = rng.range(0.12, 0.88) * H, R = rng.range(3, 9);
            const sg = s.c0 < 0 ? 1 : -1;
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              if (Math.hypot(x - cx, y - cy) < R) data[(y * W + x) * 4] = sg;
            }
          }
        } else {
          for (let i = 0; i < W * H; i++) {
            data[i * 4] = s.c0 + (rng() * 2 - 1) * s.amp;
            data[i * 4 + 3] = 1;
          }
        }
        return data;
      },
    }),
  });

  /* ---------- Active Model B+ ---------- */
  Studio.register({
    id: 'amb',
    name: 'Active Model B+',
    tab: 'Active B+',
    subtitle: 'active conserved phase field · 2018',
    order: 55.7,
    equation: '∂φ/∂t = M ∇²μ − ζ ∇·[(∇²φ)∇φ],   μ = φ³ − φ − ε²∇²φ + λ|∇φ|²',
    credit: "Elsen Tjhung, Cesare Nardini and Michael E. Cates, Physical Review X 8, 031080 (2018). Cahn-Hilliard describes a passive mixture relaxing toward equilibrium. Two extra gradient terms, λ|∇φ|² in the chemical potential and a current ζ(∇²φ)∇φ that cannot come from any free energy, are the leading ways an active system (motile bacteria, self-propelled colloids) can break time-reversal symmetry while still conserving φ. They give the two phases different interfacial tensions, and when the tension felt by the minority phase turns negative the Ostwald process runs backward: large droplets shed material to small ones and coarsening stops.",
    blurb: 'A passive mixture can coarsen by transferring material between droplets. Active Model B+ adds two gradient terms that can change this exchange and, in suitable regimes, reverse Ostwald ripening. Both coefficients and the surrounding phase matter. The tab integrates a finite-grid version with a cubic local potential; a bubbly picture alone does not establish reverse ripening or a steady microphase. Turn added noise off for the deterministic conserved model.',
    schema: GRID.concat([
      RANGE('Activity', 'zeta', 'Current ζ', LIVE, -8, 8, 0.1, f1, {
        hint: 'The non-equilibrium current ζ(∇²φ)∇φ. Together with λ and composition, it can permit reverse Ostwald regimes. Its sign alone does not establish that behavior.' }),
      RANGE('Activity', 'lambda', 'Potential λ', LIVE, -4, 4, 0.1, f1, {
        hint: 'λ|∇φ|² in μ is a nonvariational active term even when ζ=0. Both λ and ζ must vanish to recover this passive model.' }),
      RANGE('Mixture', 'c0', 'Mean composition φ₀', GEOM, -0.6, 0.6, 0.01, f2, {
        hint: 'Off-critical means droplets of the minority phase, which is where reverse Ostwald shows. φ₀ near 0 gives a bicontinuous labyrinth.' }),
      RANGE('Mixture', 'eps', 'Interface width ε', LIVE, 0.6, 2.4, 0.05, f2),
      RANGE('Mixture', 'M', 'Mobility M', LIVE, 0.2, 2.5, 0.05, f2),
      RANGE('Mixture', 'amp', 'Quench amplitude', GEOM, 0.02, 0.5, 0.01, f2),
      RANGE('Mixture', 'noise', 'Added noise', LIVE, 0, 0.08, 0.002, f3, { hint: 'Illustrative additive site forcing, not conserved thermal noise. Set zero for noise-free conservation checks.' }),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['quench', 'Quench'], ['drops', 'Drops']] },
    ]).concat(simFields()).concat(pictureFields([
      ['field', 'Composition'], ['abs', '|φ|'], ['grad', 'Interfaces'], ['shade', 'Relief'], ['mu', 'μ'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 512, aspect: '1:1', bc: 'periodic',
      zeta: -4, lambda: 1, c0: -0.4, eps: 1.1, M: 1, amp: 0.15, noise: 0.004, init: 'quench',
      running: true, steps: 3, dt: 0.013, warmup: 1800,
      view: 'field', lo: -1, hi: 1, bump: 4, lightAng: 35, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.06,
      seed: 'tjhung-2018',
    },
    presets: {
      bubbly: pre('Bubbly phase separation', { zeta: -4, lambda: 1, c0: -0.4, init: 'quench', view: 'field', warmup: 600 }, Pal.petri),
      foam: pre('Foam', { zeta: -5, lambda: 1, c0: -0.45, init: 'quench', view: 'field', warmup: 800, eps: 1 }, Pal.xray),
      passive: pre('Passive (Cahn-Hilliard)', { zeta: 0, lambda: 0, c0: -0.4, init: 'quench', view: 'field', warmup: 600 }, Pal.graphite),
      labyrinth: pre('Active labyrinth', { zeta: -2, lambda: 2, c0: 0, init: 'quench', view: 'field', warmup: 500 }, Pal.verdigris),
      drops: pre('Seeded drops', { zeta: -5, lambda: 1, c0: -0.45, init: 'drops', view: 'field', warmup: 400 }, Pal.harbor),
      relief: pre('Relief', { zeta: -4, lambda: 1, c0: -0.4, init: 'quench', view: 'shade', bump: 6, warmup: 600 }, Pal.glacier),
    },
    closedGroups: ['Seeding'],
    hints: {
      Activity: 'ζ and λ are the two leading-order ways activity enters a conserved scalar field. ζ = λ = 0 recovers Cahn-Hilliard. Reverse Ostwald regimes depend jointly on activity, composition and interfaces; a negative ζ alone is not a diagnosis.',
      Picture: 'Composition is φ itself through the palette. Interfaces is |∇φ|. Relief treats φ as height.',
    },
    palette: true, defaultPalette: 'petri', paletteLabel: 'Colors (A → B)',
    headline: 'zeta', headlineLabel: 'ζ',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024);
      // Combine the passive linear ceiling with a heuristic activity restriction.
      // This is not a stability guarantee for the nonlinear active-current terms.
      s.dt = U.clamp(Number(s.dt) || 0.013, 0.0001, Math.min(chMaxDt(s.M, s.eps), 0.24 / (1 + Math.abs(Number(s.zeta) || 0))));
    },
    surprise(rng) {
      const c0 = rng.pick([-0.4, -0.45, -0.35, 0.4, 0, -0.5]);
      return {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']),
        zeta: rng.range(-6, -1.5), lambda: rng.range(-0.5, 2.5), c0, eps: rng.range(0.85, 1.5), M: 1,
        amp: rng.range(0.1, 0.25), noise: rng.pick([0, 0.004, 0.01]), init: 'quench',
        running: true, steps: 3, dt: 0.013, warmup: rng.int(1200, 2600),
        view: rng.pick(['field', 'field', 'grad', 'shade']), lo: -1, hi: 1, bump: rng.range(3, 8),
        lightAng: rng.int(0, 360), exposure: rng.range(0.9, 1.15), gamma: rng.range(0.85, 1.2),
        contrast: rng.range(0.95, 1.2), grain: rng.pick([0, 0.05, 0.1]),
      };
    },
    create: pdeCreate({
      id: 'amb', muFS: MU_AMB, stepFS: STEP_AMB,
      views: { field: 0, abs: 1, grad: 2, shade: 3, mu: 4 },
      pokeAdd: [1, 0, 0, 1], pokeRad: 0.06, pokeMode: 0,
      muUniforms: s => ({ u_eps2: s.eps * s.eps, u_lambda: s.lambda }),
      stepUniforms: s => ({ u_M: s.M, u_zeta: s.zeta }),
      status: (s, mean, abs, step) => {
        const regime = s.zeta === 0 && s.lambda === 0 ? 'passive terms' : 'active terms';
        return '<span>⟨φ⟩ <b>' + mean.toFixed(2) + '</b> · ' + regime + '</span>';
      },
      seed(s, W, H) {
        const rng = U.makeRng(s.seed + '/amb');
        const data = new Float32Array(W * H * 4);
        for (let i = 0; i < W * H; i++) { data[i * 4] = s.c0 + (rng() * 2 - 1) * s.amp; data[i * 4 + 3] = 1; }
        if (s.init === 'drops') {
          const n = 14;
          for (let k = 0; k < n; k++) {
            const cx = rng.range(0.08, 0.92) * W, cy = rng.range(0.08, 0.92) * H, R = rng.range(4, 14);
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              if (Math.hypot(x - cx, y - cy) < R) data[(y * W + x) * 4] = 0.95;
            }
          }
        }
        return data;
      },
    }),
  });

  /* ---------- Swift–Hohenberg ---------- */
  Studio.register({
    id: 'swift',
    name: 'Swift–Hohenberg',
    subtitle: 'rolls, hexagons, localized states · 1977',
    order: 57,
    equation: '∂u/∂t = r u − (k₀² + ∇²)² u + g u² − b u³',
    credit: "J. Swift and P. C. Hohenberg, Phys. Rev. A 15, 319 (1977). The Swift–Hohenberg equation is a phenomenological pattern-forming model motivated by convection near onset: a real scalar field with a preferred wavenumber k₀. Quadratic and cubic nonlinearities affect the available branches. Localized patterns can exist in suitable subcritical regimes; this display does not establish branch stability.",
    blurb: 'Near convection onset, patterns can prefer a band of wavelengths. This scalar model captures that competition: k₀ chooses a preferred wavelength, r changes linear growth, and quadratic and cubic terms limit or redirect it. Rolls, hexagons and localized structures are possible, depending on parameters and initial conditions. For continuum one-dimensional stripes near onset, the subcritical threshold is g² > 27 b k₀⁴/38. That condition alone does not establish a stable localized state on this two-dimensional grid.',
    schema: GRID.concat([
      RANGE('Onset', 'r', 'Control r', LIVE, -0.4, 1.2, 0.01, f2, {
        hint: 'r controls linear growth. Near onset the one-dimensional continuum stripe threshold depends on all three coefficients: g² > 27 b k₀⁴/38. Negative r and a seeded bump do not guarantee a stable localized pattern.' }),
      RANGE('Onset', 'k0', 'Wavenumber k₀', LIVE, 0.35, 1.2, 0.01, f2, {
        hint: 'Preferred spatial frequency, in 1/cells. λ ≈ 2π/k₀. Smaller k₀, fatter rolls.' }),
      RANGE('Onset', 'g', 'Quadratic g', LIVE, -1.2, 1.2, 0.02, f2, {
        hint: 'g=0: rolls. g>0: hexagons. g<0: the opposite (down-hexagons). The quadratic term breaks u ↔ −u.' }),
      RANGE('Onset', 'cub', 'Cubic', LIVE, 0.4, 2, 0.05, f2),
      RANGE('Onset', 'noise', 'Noise', LIVE, 0, 0.06, 0.002, f3),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['noise', 'Noise'], ['roll', 'Roll'], ['bump', 'Bump'], ['target', 'Target']] },
    ]).concat(simFields()).concat(pictureFields([
      ['field', 'Field'], ['abs', '|u|'], ['grad', '|∇u|'], ['shade', 'Relief'], ['orient', 'Orientation'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 512, aspect: '1:1', bc: 'periodic',
      r: 0.35, k0: 0.62, g: 0, cub: 1, noise: 0.006, init: 'noise',
      running: true, steps: 3, dt: 0.025, warmup: 500,
      view: 'field', lo: -1.2, hi: 1.2, bump: 5, lightAng: 40, exposure: 1, gamma: 1, contrast: 1.08, grain: 0.05,
      seed: 'swift-1977',
    },
    presets: {
      rolls: pre('Rolls', { r: 0.3, g: 0, k0: 0.62, init: 'noise', view: 'field', warmup: 550 }, Pal.harbor),
      hex: pre('Hexagons', { r: 0.25, g: 0.7, init: 'noise', view: 'field', warmup: 700, k0: 0.58 }, Pal.glacier),
      localized: pre('Localized', { r: -0.1, g: 1.2, init: 'bump', view: 'field', warmup: 900, k0: 0.7 }, Pal.nightshade),
      target: pre('Target', { r: 0.4, g: 0, k0: 0.62, init: 'target', view: 'abs', warmup: 450 }, Pal.thermal),
      relief: pre('Convection relief', { r: 0.45, g: 0, k0: 0.62, view: 'shade', bump: 7, warmup: 500 }, Pal.xray),
    },
    closedGroups: ['Seeding'],
    hints: {
      Onset: 'r is the heat. k₀ is the depth of the pan, in disguise — it sets the stripe width. g is whether the fluid prefers hexagons (the usual weakly nonlinear result with non-Boussinesq effects).',
      Picture: 'Field is u itself. Orientation colors the local field-gradient direction with a cyclic palette. Relief is u as height, the convection cells as terrain.',
    },
    palette: true, defaultPalette: 'harbor', paletteLabel: 'Colors',
    headline: 'r', headlineLabel: 'control r',
    sanitize(s) { s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024); s.dt = U.clamp(Number(s.dt) || 0.025, 0.0001, Math.min(0.12, shMaxDt(s.r, s.k0, s.g, s.cub))); },
    surprise(rng) {
      const r = rng.pick([0.2, 0.3, 0.4, 0.55, -0.1]);
      // These negative-r choices exceed the continuum stripe threshold over the
      // sampled k0 range. This does not certify a 2D localized branch.
      const g = r < 0 ? rng.pick([1.2, 1.0, -1.1]) : rng.pick([0, 0, 0, 0.6, -0.5]);
      return {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5']),
        r, k0: rng.range(0.48, 0.85), g, cub: 1, noise: r < 0 ? 0 : rng.pick([0, 0.004, 0.01]),
        init: r < 0 ? 'bump' : rng.pick(['noise', 'noise', 'roll', 'target']),
        // A convecton takes longer to settle on its edge than a field of rolls takes to fill.
        running: true, steps: rng.int(2, 4), dt: 0.025, warmup: r < 0 ? rng.int(800, 1200) : rng.int(300, 700),
        view: rng.pick(['field', 'field', 'shade', 'orient']), lo: -1.2, hi: 1.2,
        bump: rng.range(4, 9), lightAng: rng.int(0, 360),
        exposure: rng.range(0.9, 1.2), gamma: rng.range(0.85, 1.2), contrast: rng.range(0.95, 1.25),
        grain: rng.pick([0, 0.05, 0.08]),
      };
    },
    create: pdeCreate({
      id: 'swift', muFS: MU_SH, stepFS: STEP_SH,
      views: { field: 0, abs: 1, grad: 2, shade: 3, orient: 5 },
      pokeAdd: [1.4, 0, 0, 1], pokeRad: 0.08, pokeMode: 1,
      muUniforms: () => ({}),
      stepUniforms: s => ({ u_r: s.r, u_k0: s.k0, u_g: s.g, u_cub: s.cub }),
      status: (s, mean, abs) => {
        const kind = s.r < 0 ? 'below linear onset' : 'above linear onset';
        return '<span>r <b>' + s.r.toFixed(2) + '</b> · ' + kind + '</span><span>|u|̄ <b>' + abs.toFixed(2) + '</b></span>';
      },
      seed(s, W, H) {
        const rng = U.makeRng(s.seed + '/swift');
        const data = new Float32Array(W * H * 4);
        const k = s.k0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let u = (rng() * 2 - 1) * 0.15;
          if (s.init === 'roll') u = 0.4 * Math.sin(k * x) + (rng() * 2 - 1) * 0.04;
          else if (s.init === 'bump') {
            const dx = x - W * 0.5, dy = y - H * 0.5;
            u = 1.6 * Math.exp(-(dx * dx + dy * dy) / (2 * 14 * 14)) * Math.cos(k * dx);
          } else if (s.init === 'target') {
            const r = Math.hypot(x - W * 0.5, y - H * 0.5);
            u = 0.55 * Math.cos(k * r) * Math.exp(-r / (0.45 * Math.min(W, H)));
          }
          data[(y * W + x) * 4] = u;
          data[(y * W + x) * 4 + 3] = 1;
        }
        return data;
      },
    }),
  });

  /* ---------- Kuramoto–Sivashinsky ---------- */
  Studio.register({
    id: 'ks',
    name: 'Kuramoto–Sivashinsky',
    tab: 'KS chaos',
    subtitle: 'cellular flame chaos · 1977',
    order: 61,
    equation: '∂u/∂t = −ν ∇⁴u − ∇²u − (α/2)|∇u|²',
    credit: "Yoshiki Kuramoto and Toshio Tsuzuki, Prog. Theor. Phys. 55, 356 (1976); G. I. Sivashinsky, Acta Astronautica 4, 1177 (1977). Independently derived for reaction-diffusion phase turbulence and for laminar flame fronts. It is the simplest PDE that produces extensive spatiotemporal chaos: a band of unstable modes, a stabilizing biharmonic, and a Burgers-like nonlinearity. In two dimensions the cells of a flame.",
    blurb: 'A flame front wants to wrinkle. Long waves grow (the −∇² term), short waves are damped (the −∇⁴ term), and the slope of the front feeds itself ((1/2)|∇u|²). Nothing else is required. In suitable parameter and domain ranges, cells can appear, merge and disappear in irregular spatiotemporal motion. Steady or simple solutions also exist. This visual evolution is not a measurement of chaos. The spatial mean of height can drift; it is not a conserved field.',
    schema: GRID.concat([
      RANGE('Flame', 'nu', 'Viscosity ν', LIVE, 0.4, 2.4, 0.05, f2, {
        hint: 'Coefficient of the stabilizing ∇⁴. Larger ν, fatter cells, slower chaos. The most unstable wavelength is ∼2π√(2ν).' }),
      RANGE('Flame', 'alpha', 'Nonlinearity α', LIVE, 0.2, 2.5, 0.05, f2, {
        hint: 'Strength of (α/2)|∇u|². This is the Burgers term that steepens the front and saturates the linear instability.' }),
      RANGE('Flame', 'noise', 'Noise', LIVE, 0, 0.05, 0.002, f3),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['noise', 'Noise'], ['front', 'Front'], ['bump', 'Bump']] },
    ]).concat(simFields()).concat(pictureFields([
      ['shade', 'Relief'], ['field', 'Height'], ['grad', 'Slope'], ['abs', '|u|'], ['orient', 'Cells'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 512, aspect: '1:1', bc: 'periodic',
      nu: 1, alpha: 1, noise: 0.008, init: 'noise',
      running: true, steps: 3, dt: 0.018, warmup: 350,
      view: 'shade', lo: -2.5, hi: 2.5, bump: 3.5, lightAng: 50, exposure: 1.05, gamma: 0.95, contrast: 1.1, grain: 0.06,
      seed: 'siva-1977',
    },
    presets: {
      flame: pre('Flame cells', { nu: 1, alpha: 1, view: 'shade', bump: 3.8, warmup: 400 }, Pal.thermal),
      cellular: pre('Cellular', { nu: 1.4, alpha: 0.9, view: 'orient', warmup: 450 }, Pal.bioluminescent),
      quiet: pre('Large cells', { nu: 2, alpha: 0.7, view: 'shade', bump: 5, warmup: 300 }, Pal.graphite),
      storm: pre('Storm', { nu: 0.65, alpha: 1.4, view: 'field', warmup: 500, dt: 0.014 }, Pal.nightshade),
      ink: pre('Ink height', { nu: 1.1, view: 'field', lo: -2, hi: 2, warmup: 350 }, Pal.xray),
    },
    closedGroups: ['Seeding'],
    hints: {
      Flame: 'ν controls short-wave damping and α controls slope coupling. Domain size and initial state also affect the behavior. A stationary uniform field is an exact solution; this tab does not measure a Lyapunov exponent.',
      Picture: 'Relief is the honest flame-front picture: u as height, lit. Slope is |∇u|. Cells colors the local facet orientation.',
    },
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Colors',
    headline: 'nu', headlineLabel: 'viscosity ν',
    sanitize(s) { s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024); s.dt = U.clamp(Number(s.dt) || 0.018, 0.0001, Math.min(0.08, ksMaxDt(s.nu))); },
    surprise(rng) {
      return {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5', '16:9']),
        nu: rng.range(0.7, 1.8), alpha: rng.range(0.6, 1.5), noise: rng.pick([0, 0.005, 0.012]),
        init: rng.pick(['noise', 'noise', 'front', 'bump']),
        running: true, steps: rng.int(2, 4), dt: 0.018, warmup: rng.int(200, 500),
        view: rng.pick(['shade', 'shade', 'field', 'orient']), lo: -2.5, hi: 2.5,
        bump: rng.range(2.5, 6), lightAng: rng.int(0, 360),
        exposure: rng.range(0.9, 1.2), gamma: rng.range(0.8, 1.15), contrast: rng.range(0.95, 1.25),
        grain: rng.pick([0, 0.05, 0.1]),
      };
    },
    create: pdeCreate({
      id: 'ks', muFS: MU_KS, stepFS: STEP_KS,
      views: { field: 0, abs: 1, grad: 2, shade: 3, orient: 5 },
      pokeAdd: [2.2, 0, 0, 1], pokeRad: 0.07, pokeMode: 1,
      muUniforms: () => ({}),
      stepUniforms: s => ({ u_nu: s.nu, u_alpha: s.alpha }),
      status: s => '<span>ν <b>' + s.nu.toFixed(2) + '</b></span><span>α <b>' + s.alpha.toFixed(2) + '</b></span>',
      seed(s, W, H) {
        const rng = U.makeRng(s.seed + '/ks');
        const data = new Float32Array(W * H * 4);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let u = (rng() * 2 - 1) * 0.25;
          if (s.init === 'front') u = 0.8 * Math.sin((x / W) * TAU) + (rng() * 2 - 1) * 0.08;
          else if (s.init === 'bump') {
            const dx = x - W * 0.5, dy = y - H * 0.5;
            u += 1.8 * Math.exp(-(dx * dx + dy * dy) / (2 * 18 * 18));
          }
          data[(y * W + x) * 4] = u;
          data[(y * W + x) * 4 + 3] = 1;
        }
        return data;
      },
    }),
  });

  function triPsi(x, y, theta, k, A, psi0) {
    const c = Math.cos(theta), s = Math.sin(theta);
    const xr = c * x + s * y, yr = -s * x + c * y;
    const ks = k * Math.sqrt(3) / 2;
    return psi0 + A * (Math.cos(k * xr) + Math.cos(-0.5 * k * xr + ks * yr) + Math.cos(-0.5 * k * xr - ks * yr));
  }

  /* ---------- Phase-field crystal (Elder) ---------- */
  Studio.register({
    id: 'pfc',
    name: 'Phase-field crystal',
    tab: 'PFC',
    subtitle: 'Elder density-wave crystal · 2002',
    order: 57.5,
    equation: '∂ψ/∂t = M ∇²(δF/δψ),   F = ∫ ½ ψ [r + (k₀²+∇²)²] ψ + ψ⁴/4',
    credit: "K. R. Elder, M. Katakowski, M. Haataja and M. Grant, Phys. Rev. Lett. 88, 245701 (2002); Elder and Grant, Phys. Rev. E 70, 051605 (2004). The phase-field crystal model is Swift–Hohenberg’s free energy evolved with conserved (Cahn–Hilliard) dynamics. The field represents time-averaged atomic-scale density, not individual particle trajectories. The model supports crystalline order and defects on diffusive time scales; this finite-grid display does not locate a material melting line.",
    blurb: 'The phase-field crystal model favors spatially periodic density. Its conserved dynamics redistribute the field through a chemical potential. Undercooling, mean density and wavelength affect which structures can develop. Seeds with different orientations can produce grain boundaries, while other settings can relax toward a uniform field or stripes. The simulation uses a consistent nine-point Laplacian throughout. Preset names describe intended illustrations, not measured phases or a calibrated material.',
    schema: GRID.concat([
      RANGE('Crystal', 'r', 'Quench r', LIVE, -0.8, 0.2, 0.01, f2, {
        hint: 'r is the undercooling. More negative, deeper quench, stronger lattice. r ≳ 0 melts everything back to liquid.' }),
      RANGE('Crystal', 'psi0', 'Mean density ψ₀', GEOM, -0.4, 0.55, 0.01, f2, {
        hint: 'Requested baseline density; a finite seeded pattern can shift its actual mean. With noise off that actual mean is conserved. Near 0: stripes. Around 0.25–0.35: triangular crystal. Outside the solid window: liquid.' }),
      RANGE('Crystal', 'k0', 'Lattice k₀', LIVE, 0.45, 1.1, 0.01, f2, {
        hint: 'Preferred reciprocal-lattice spacing. λ ≈ 2π/k₀. Smaller k₀, fatter atoms.' }),
      RANGE('Crystal', 'M', 'Mobility M', LIVE, 0.15, 1.5, 0.05, f2),
      RANGE('Crystal', 'amp', 'Seed amplitude', GEOM, 0.15, 0.9, 0.02, f2),
      RANGE('Crystal', 'misori', 'Misorientation', GEOM, 0, 30, 1, v => v + '°', {
        dimUnless: s => s.init === 'bicrystal' || s.init === 'poly',
        hint: 'Angle between grains, in degrees. Small angle: a wall of discrete dislocations. Large: a disordered boundary.' }),
      RANGE('Crystal', 'noise', 'Added noise', LIVE, 0, 0.04, 0.001, f3, { hint: 'Additive site forcing changes mean density. It does not implement the conserved thermal noise of the paper.' }),
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['seed', 'Nucleus'], ['poly', 'Polycrystal'], ['bicrystal', 'Bicrystal'], ['stripe', 'Stripes'], ['liquid', 'Liquid'], ['vacancy', 'Vacancy']] },
    ]).concat(simFields()).concat(pictureFields([
      ['field', 'Density'], ['abs', '|ψ|'], ['grad', '|∇ψ|'], ['shade', 'Relief'], ['orient', 'Orientation'], ['mu', 'μ'],
    ])),
    legacy: { 2: { grid: 192 } },   // raised for print sharpness at v2; see "Print sharpness" in AGENTS.md
    defaults: {
      grid: 512, aspect: '1:1', bc: 'periodic',
      r: -0.25, psi0: 0.28, k0: 0.72, M: 0.35, amp: 0.55, misori: 12, noise: 0.002, init: 'seed',
      running: true, steps: 5, dt: 0.005, warmup: 800,
      view: 'field', lo: -0.35, hi: 1.15, bump: 5, lightAng: 40, exposure: 1, gamma: 1, contrast: 1.08, grain: 0.05,
      seed: 'elder-2002',
    },
    presets: {
      nucleus: pre('Nucleus', { init: 'seed', r: -0.25, psi0: 0.28, view: 'field', warmup: 700 }, Pal.graphite),
      poly: pre('Polycrystal', { init: 'poly', r: -0.3, psi0: 0.3, misori: 18, view: 'orient', warmup: 900, k0: 0.7 }, Pal.kiln),
      grain: pre('Grain boundary', { init: 'bicrystal', r: -0.28, psi0: 0.29, misori: 10, view: 'field', warmup: 800 }, Pal.xray),
      stripes: pre('Stripes', { init: 'stripe', r: -0.35, psi0: 0.02, view: 'field', warmup: 500, k0: 0.68 }, Pal.harbor),
      melt: pre('Melting', { init: 'vacancy', r: -0.08, psi0: 0.22, view: 'field', warmup: 400 }, Pal.thermal),
      relief: pre('Atomic relief', { init: 'seed', r: -0.3, psi0: 0.3, view: 'shade', bump: 7, warmup: 750 }, Pal.petri),
    },
    closedGroups: ['Seeding'],
    hints: {
      Crystal: 'This is Swift–Hohenberg with a conservation law. r and ψ₀ together pick the phase: liquid, stripes, or triangular crystal. k₀ is the lattice constant. Two orientations meeting is a grain boundary.',
      Picture: 'Density is ψ, the atomic density wave. Orientation colors the local density-gradient direction with a cyclic palette; it is not a measured crystallographic orientation. Relief treats atoms as height.',
    },
    palette: true, defaultPalette: 'graphite', paletteLabel: 'Colors',
    headline: 'r', headlineLabel: 'quench r',
    sanitize(s) {
      s.grid = U.clamp(Math.round(Number(s.grid) / 2) * 2, 96, 1024);
      s.M = U.clamp(Number(s.M) || 0.45, 0.05, 2);
      s.dt = Math.min(Math.max(Number(s.dt) || 0.005, 0.00001), pfcMaxDt(s.M, s.r, s.k0));
    },
    surprise(rng) {
      const init = rng.pick(['seed', 'seed', 'poly', 'bicrystal', 'stripe', 'liquid']);
      const stripe = init === 'stripe';
      return {
        grid: rng.pick([128, 192, 192, 256]), aspect: rng.pick(['1:1', '1:1', '4:5']),
        r: stripe ? rng.range(-0.45, -0.22) : rng.range(-0.4, -0.12),
        psi0: stripe ? rng.range(-0.05, 0.08) : rng.range(0.22, 0.35),
        k0: rng.range(0.58, 0.85), M: rng.range(0.3, 0.7), amp: rng.range(0.4, 0.7),
        misori: rng.int(6, 22), noise: rng.pick([0, 0.003, 0.008]), init,
        running: true, steps: rng.int(3, 5), dt: 0.01, warmup: rng.int(400, 900),
        view: rng.pick(['field', 'field', 'orient', 'shade']), lo: -0.4, hi: 1.2,
        bump: rng.range(4, 8), lightAng: rng.int(0, 360),
        exposure: rng.range(0.9, 1.15), gamma: rng.range(0.85, 1.2), contrast: rng.range(0.95, 1.2),
        grain: rng.pick([0, 0.04, 0.08]),
      };
    },
    create: pdeCreate({
      id: 'pfc', muFS: MU_PFC, midFS: MID_PFC, stepFS: STEP_PFC,
      views: { field: 0, abs: 1, grad: 2, shade: 3, mu: 4, orient: 5 },
      pokeAdd: [0.7, 0, 0, 1], pokeRad: 0.09, pokeMode: 1,
      muUniforms: () => ({}),
      midUniforms: s => ({ u_r: s.r, u_k0: s.k0 }),
      stepUniforms: s => ({ u_M: s.M, u_damp: 0.0 }),
      status: (s, mean, abs) => {
        return '<span>⟨ψ⟩ ≈ <b>' + mean.toFixed(2) + '</b></span><span>r <b>' + s.r.toFixed(2) + '</b></span>';
      },
      seed(s, W, H) {
        const rng = U.makeRng(s.seed + '/pfc');
        const data = new Float32Array(W * H * 4);
        const k = s.k0, A = s.amp, p0 = s.psi0;
        const grains = [];
        if (s.init === 'poly') {
          const n = rng.int(4, 7);
          for (let i = 0; i < n; i++) grains.push({ x: rng() * W, y: rng() * H, th: rng() * TAU });
        } else if (s.init === 'bicrystal') {
          grains.push({ x: W * 0.25, y: H * 0.5, th: 0 });
          grains.push({ x: W * 0.75, y: H * 0.5, th: s.misori * PI / 180 });
        }
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let u = p0 + (rng() * 2 - 1) * 0.04;
          if (s.init === 'liquid') {
            u = p0 + (rng() * 2 - 1) * 0.08;
          } else if (s.init === 'stripe') {
            u = p0 + A * Math.cos(k * x);
          } else if (s.init === 'seed') {
            const dx = x - W * 0.5, dy = y - H * 0.5, R = 0.22 * Math.min(W, H);
            const w = 1 / (1 + Math.exp((Math.hypot(dx, dy) - R) / 3));
            u = p0 * (1 - w) + triPsi(dx, dy, 0, k, A, p0) * w;
          } else if (s.init === 'vacancy') {
            u = triPsi(x, y, 0, k, A, p0);
            const dx = x - W * 0.5, dy = y - H * 0.5;
            if (Math.hypot(dx, dy) < 10) u = p0;
          } else if (grains.length) {
            let best = 0, bd = 1e12;
            for (let i = 0; i < grains.length; i++) {
              let gx = x - grains[i].x, gy = y - grains[i].y;
              if (gx > W / 2) gx -= W; if (gx < -W / 2) gx += W;
              if (gy > H / 2) gy -= H; if (gy < -H / 2) gy += H;
              const d = gx * gx + gy * gy;
              if (d < bd) { bd = d; best = i; }
            }
            u = triPsi(x - grains[best].x, y - grains[best].y, grains[best].th, k, A, p0);
          }
          data[(y * W + x) * 4] = u;
          data[(y * W + x) * 4 + 3] = 1;
        }
        return data;
      },
    }),
  });
})();

