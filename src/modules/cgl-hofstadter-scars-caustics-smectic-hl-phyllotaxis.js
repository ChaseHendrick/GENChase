
/* modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, TAU = U.TAU, PI = Math.PI;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
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
  function hex01(hex) { const rgb = U.hexToRgb(hex || '#000'); return [rgb[0]/255, rgb[1]/255, rgb[2]/255]; }
  function grainPut(g, w, h, amt, seed) {
    if (!(amt > 0)) return;
    const rng = U.makeRng(String(seed == null ? 'grain' : seed) + '/film/' + w + 'x' + h);
    const img = g.getImageData(0, 0, w, h), d = img.data, a = amt * 24;
    for (let i = 0; i < d.length; i += 4) { const n = (rng() - 0.5) * a; d[i]+=n; d[i+1]+=n; d[i+2]+=n; }
    g.putImageData(img, 0, 0);
  }
  function toneMap(dens, W, H, s, rgba) {
    const lut = U.makeRampLUT(s.palette, s.bg, 256);
    const bg = U.hexToRgb(s.bg);
    let maxD = 0;
    for (let i = 0; i < dens.length; i++) if (dens[i] > maxD) maxD = dens[i];
    const inv = 1 / Math.max(1e-8, maxD), L = 255, log = s.tone !== 'power';
    const expo = s.exposure || 1, gam = s.gamma || 1;
    for (let i = 0, o = 0; i < dens.length; i++, o += 4) {
      const d = dens[i];
      if (d <= 0) { rgba[o]=bg[0]; rgba[o+1]=bg[1]; rgba[o+2]=bg[2]; rgba[o+3]=255; continue; }
      let t = log ? Math.log1p(d * inv * 40) / Math.log1p(40) : d * inv;
      t = Math.min(1, t * expo);
      if (gam !== 1) t = Math.pow(t, gam);
      const li = (t * L | 0) * 3;
      rgba[o]=lut[li]; rgba[o+1]=lut[li+1]; rgba[o+2]=lut[li+2]; rgba[o+3]=255;
    }
  }
  function blit(ctx, buf, BW, BH, w, h) {
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buf, 0, 0, w, h);
  }

  /* ==================== Complex Ginzburg–Landau ==================== */
  const CGL_HEAD = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
vec2 lap2(sampler2D t, vec2 uv, vec2 px){
  return texture(t, uv+vec2(px.x,0.0)).rg + texture(t, uv-vec2(px.x,0.0)).rg
       + texture(t, uv+vec2(0.0,px.y)).rg + texture(t, uv-vec2(0.0,px.y)).rg
       - 4.0 * texture(t, uv).rg;
}
`;
  // Lie splitting: exact local cubic flow, then explicit complex diffusion.
  // The five-point symbol is -q, q in [0,8]. Diffusion requires
  // h <= 1 / (4*(1+alpha^2)); use an 80% margin. The phase limit is
  // an accuracy precaution near saturated amplitude, not a global error bound.
  function cglSubsteps(s) {
    const limit = Math.min(0.8 / (4 * (1 + s.alpha * s.alpha)),
      0.1 / Math.max(0.01, Math.abs(s.beta) * s.lin));
    return Math.max(1, Math.ceil(s.dt / limit));
  }
  const CGL_STEP = CGL_HEAD + `
uniform sampler2D u_a; uniform vec2 u_res;
uniform float u_dt, u_alpha, u_beta, u_lin, u_noise, u_step, u_nOff;
${G.GLSL.hash}
vec2 localFlow(vec2 A){
  float e = exp(2.0 * u_lin * u_dt);
  float d = 1.0 + dot(A,A) * (e - 1.0) / u_lin;
  float phase = -0.5 * u_beta * log(d);
  return sqrt(e / d) * vec2(cos(phase)*A.x-sin(phase)*A.y,
                            sin(phase)*A.x+cos(phase)*A.y);
}
void main(){
  vec2 px = 1.0 / u_res;
  vec2 A = localFlow(texture(u_a, v_uv).rg);
  vec2 L = localFlow(texture(u_a, v_uv+vec2(px.x,0.0)).rg)
         + localFlow(texture(u_a, v_uv-vec2(px.x,0.0)).rg)
         + localFlow(texture(u_a, v_uv+vec2(0.0,px.y)).rg)
         + localFlow(texture(u_a, v_uv-vec2(0.0,px.y)).rg) - 4.0*A;
  A += u_dt * (L + u_alpha * vec2(-L.y, L.x));
  if (u_noise > 0.0) {
    vec2 n = vec2(hash21(v_uv * u_res + vec2(u_nOff, u_step)),
                  hash21(v_uv * u_res + vec2(u_step, u_nOff))) - 0.5;
    A += u_dt * n * 2.0 * u_noise;
  }
  outColor = vec4(A, 0.0, 1.0);
}`;
  const CGL_DRAW = CGL_HEAD + `
uniform sampler2D u_a; uniform vec2 u_res;
uniform int u_view; uniform float u_exposure, u_gamma, u_contrast, u_grain;
uniform vec3 u_bg;
${G.GLSL.hash}
${G.GLSL.ramp}
${G.GLSL.bicubic}
void main(){
  vec2 A = texCR4(u_a, v_uv, u_res).rg;
  float amp = length(A);
  float ph = atan(A.y, A.x);
  float t = 0.0;
  if (u_view == 0) t = ph / 6.28318530718 + 0.5;
  else if (u_view == 1) t = clamp(amp * 0.85, 0.0, 1.0);
  else if (u_view == 2) t = clamp(A.x * 0.5 + 0.5, 0.0, 1.0);
  else t = 1.0 - smoothstep(0.0, 0.18, amp);
  vec3 col = mix(u_bg, ramp(t), u_view == 3 ? t : 1.0);
  if (u_view == 0) col = ramp(t);
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma)) * u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.71) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;
  const CGL_POKE = CGL_HEAD + `
uniform sampler2D u_a; uniform vec2 u_pos; uniform float u_rad, u_amp, u_charge;
void main(){
  vec2 A = texture(u_a, v_uv).rg;
  vec2 d = v_uv - u_pos;
  float r = length(d);
  float env = exp(-r * r / max(u_rad * u_rad, 1e-6));
  float ang = atan(d.y, d.x);
  A += env * u_amp * vec2(cos(u_charge * ang), sin(u_charge * ang));
  outColor = vec4(A, 0.0, 1.0);
}`;

  Studio.register({
    id: 'cgl',
    name: 'Complex Ginzburg–Landau',
    tab: 'CGL',
    subtitle: 'spirals, defect chaos, frozen vortex glass',
    order: 58.1,
    equation: '∂A/∂t = μA + (1 + iα) ∇²A − (1 + iβ) |A|² A',
    credit: "The complex Ginzburg–Landau equation is the universal envelope of a Hopf instability in an extended medium (Newell, Whitehead, Segel, 1969–71). The (α, β) plane was mapped by Aranson and Kramer: Benjamin–Feir when 1+αβ<0, spiral defect chaos, frozen states, amplitude turbulence. The field A is complex; its zeros are topological defects.",
    blurb: 'A complex amplitude is enough. Real diffusion, imaginary dispersion, a cubic that saturates. The zeros of A are vortices, and they cannot die alone. In one corner of the (α, β) plane they freeze into a glass. In another they birth and annihilate forever — spiral defect chaos, the weather of an oscillatory medium. Color by phase and you see the spirals. Color by amplitude and you see the holes they leave.',
    schema: [
      { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128,'128'],[192,'192'],[256,'256'],[384,'384'],[512,'512'],[768,'768']] },
      { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1','1:1'],['4:5','4:5'],['5:4','5:4'],['16:9','16:9']] },
      { group: 'Envelope', key: 'alpha', label: 'Dispersion α', type: 'range', kind: LIVE, min: -4, max: 4, step: 0.05, fmt: f2,
        hint: 'Coefficient of i∇²A. With β, the Benjamin–Feir line is 1+αβ=0.' },
      { group: 'Envelope', key: 'beta', label: 'Nonlinear β', type: 'range', kind: LIVE, min: -4, max: 4, step: 0.05, fmt: f2 },
      { group: 'Envelope', key: 'lin', label: 'Linear gain', type: 'range', kind: LIVE, min: 0.2, max: 1.6, step: 0.05, fmt: f2 },
      { group: 'Envelope', key: 'noise', label: 'Noise', type: 'range', kind: LIVE, min: 0, max: 0.08, step: 0.002, fmt: f3 },
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['noise','Noise'],['vortex','Vortex'],['spiral','Spiral'],['wave','Wave']] },
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      { group: 'Simulation', key: 'steps', label: 'Steps per frame', type: 'range', kind: LIVE, min: 1, max: 8, step: 1, fmt: String },
      { group: 'Simulation', key: 'dt', label: 'Time step', type: 'range', kind: LIVE, min: 0.01, max: 0.12, step: 0.002, fmt: f3, hint: 'Requested time per step. Internal substeps respect the complex-diffusion limit.' },
      { group: 'Simulation', key: 'warmup', label: 'Warm-up steps', type: 'range', kind: GEOM, min: 0, max: 1500, step: 50, fmt: String },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true,
        options: [['phase','Phase'],['amp','|A|'],['real','Re A'],['defects','Defects']] },
      { group: 'Picture', key: 'exposure', label: 'Exposure', type: 'range', kind: PAINT, min: 0.5, max: 2.2, step: 0.02, fmt: f2 },
      { group: 'Picture', key: 'gamma', label: 'Gamma', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.02, fmt: f2 },
      { group: 'Picture', key: 'contrast', label: 'Contrast', type: 'range', kind: PAINT, min: 0.5, max: 2.2, step: 0.02, fmt: f2 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.6, step: 0.02, fmt: pct },
    ],
    defaults: {
      grid: 192, aspect: '1:1', alpha: -2, beta: 2, lin: 1, noise: 0.004, init: 'noise',
      running: true, steps: 3, dt: 0.05, warmup: 400,
      view: 'phase', exposure: 1, gamma: 1, contrast: 1.05, grain: 0.05, seed: 'cgl-1970',
    },
    presets: {
      chaos: pre('Spiral chaos', { alpha: -2, beta: 2, init: 'noise', view: 'phase', warmup: 500 }, Pal.thermal),
      frozen: pre('Frozen glass', { alpha: 1.2, beta: -0.8, init: 'noise', view: 'phase', warmup: 600 }, Pal.glacier),
      spirals: pre('Spirals', { alpha: 0, beta: 1.4, init: 'spiral', view: 'phase', warmup: 350 }, Pal.nightshade),
      amp: pre('Amplitude holes', { alpha: -1.5, beta: 1.2, view: 'amp', warmup: 450 }, Pal.ember),
      defects: pre('Defects', { alpha: -2.2, beta: 2.4, view: 'defects', warmup: 500 }, Pal.xray),
    },
    hints: { Envelope: '1+αβ < 0 is Benjamin–Feir: plane waves are unstable, spirals and chaos follow. 1+αβ > 0 can freeze.' },
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Phase colors',
    headline: 'alpha', headlineLabel: 'α',
    sanitize(s) { s.grid = U.clamp(Math.round(Number(s.grid)/2)*2, 96, 384); },
    surprise(rng) {
      const bf = rng() < 0.65;
      return {
        grid: rng.pick([128, 192, 192, 256]), aspect: '1:1',
        alpha: bf ? rng.range(-3, -0.4) : rng.range(0.4, 2),
        beta: bf ? rng.range(0.8, 3) : rng.range(-2, -0.3),
        lin: 1, noise: rng.pick([0, 0.004, 0.015]), init: rng.pick(['noise','noise','spiral']),
        running: true, steps: 3, dt: 0.05, warmup: rng.int(250, 700),
        view: rng.pick(['phase','phase','amp','defects']), exposure: 1, gamma: 1, contrast: 1.05,
        grain: rng.pick([0, 0.05, 0.1]),
      };
    },
    create(host) {
      const gl = G.createGL(host.canvas);
      const noop = () => {};
      const dead = msg => { host.setStatus(msg); host.fault(msg); return { aspect: s => ASPECTS[s.aspect]||1, regenerate: () => host.setStatus(msg), resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) }; };
      if (!gl) return dead('WebGL2 is not available in this browser');
      const texType = gl.floatExt ? 'rgba32f' : 'rgba16f';
      if (!gl.floatExt) gl.getExtension('EXT_color_buffer_half_float');
      let stepPass, drawPass, pokePass;
      try {
        stepPass = new G.Pass(gl, CGL_STEP);
        drawPass = new G.Pass(gl, CGL_DRAW);
        pokePass = new G.Pass(gl, CGL_POKE);
      } catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }
      let A = null, gw = 0, gh = 0, ramp = null, rampKey = '', raf = 0, chunkTimer = 0, stepCount = 0, nOff = 0;
      function sizeOf(s) {
        const n = Number(s.grid)||192, ar = ASPECTS[s.aspect]||1;
        let W = n, H = Math.max(64, Math.round(n * ar));
        return [W & ~1, H & ~1];
      }
      function ensure(s) {
        const [W,H] = sizeOf(s);
        if (A && gw===W && gh===H) return;
        if (A) A.dispose();
        A = new G.PingPong(gl, W, H, { type: texType, filter: 'nearest', wrap: 'repeat' });
        gw = W; gh = H;
      }
      function seedField(s, W, H) {
        const rng = U.makeRng(s.seed + '/cgl');
        const data = new Float32Array(W*H*4);
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i = (y*W+x)*4;
          const nx = x/W-0.5, ny = y/H-0.5, r = Math.hypot(nx, ny), ang = Math.atan2(ny, nx);
          let re=0, im=0;
          if (s.init === 'vortex') { re = (1-Math.exp(-r*18)) * Math.cos(ang); im = (1-Math.exp(-r*18)) * Math.sin(ang); }
          else if (s.init === 'spiral') { re = Math.cos(ang + r*40); im = Math.sin(ang + r*40); re *= Math.min(1, r*8); im *= Math.min(1, r*8); }
          else if (s.init === 'wave') { re = 0.7*Math.cos(x*0.22); im = 0.7*Math.sin(x*0.22); }
          else { re = (rng()*2-1)*0.35; im = (rng()*2-1)*0.35; }
          data[i]=re; data[i+1]=im; data[i+3]=1;
        }
        return data;
      }
      function upload(target, f32) {
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        if (texType === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, f32);
        else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target.w, target.h, gl.RGBA, gl.HALF_FLOAT, toHalf(f32));
      }
      function ensureRamp(s) {
        const key = (s.bg||'')+'|'+(s.palette||[]).join(',');
        if (ramp && rampKey===key) return;
        if (ramp) ramp.dispose();
        ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key;
      }
      function step(n) {
        const s = host.getState();
        const substeps = cglSubsteps(s), dt = s.dt / substeps;
        for (let i=0;i<n;i++) for (let j=0;j<substeps;j++) {
          stepPass.draw(A.write, {
            u_a: A.read, u_res:[gw,gh], u_dt:dt, u_alpha:s.alpha, u_beta:s.beta, u_lin:s.lin,
            u_noise:s.noise, u_step:((stepCount+i)*substeps+j)*1.13, u_nOff:nOff,
          });
          A.swap();
        }
        stepCount += n;
      }
      const VIEW = { phase:0, amp:1, real:2, defects:3 };
      function render(target) {
        const s = host.getState();
        ensureRamp(s);
        drawPass.draw(target||null, {
          u_a: A.read, u_ramp: ramp, u_res:[gw,gh], u_view:{int: VIEW[s.view]||0},
          u_exposure:s.exposure, u_gamma:s.gamma, u_contrast:s.contrast, u_grain:s.grain, u_bg: hex01(s.bg),
        });
      }
      function status() {
        const s = host.getState();
        const bf = 1 + s.alpha * s.beta;
        host.setStatus('<span>grid <b>'+gw+'×'+gh+'</b></span><span>1+αβ <b>'+bf.toFixed(2)+'</b> · '+(bf<0?'uniform wave unstable':'uniform wave criterion')+'</span><span>step <b>'+stepCount.toLocaleString()+'</b> · '+cglSubsteps(s)+' substeps</span>');
      }
      function stop(){ cancelAnimationFrame(raf); raf=0; clearTimeout(chunkTimer); chunkTimer=0; }
      function frame(){ raf=0; const s=host.getState(); step(s.steps); render(); if(stepCount%16<s.steps) status(); raf=requestAnimationFrame(frame); }
      function startLoop(){
        stop();
        const s=host.getState();
        if (s.running && !host.reducedMotion()) raf=requestAnimationFrame(frame);
        else { status(); render(); }
      }
      function burst(total){
        stop(); let left=total;
        (function chunk(){ const n=Math.min(24,left); left-=n; step(n); render(); if(left>0) chunkTimer=setTimeout(chunk,0); else { status(); startLoop(); } })();
      }
      return {
        fieldCells(){ return [gw,gh]; },
        aspect(s){ return ASPECTS[s.aspect]||1; },
        regenerate(){
          stop(); stepCount=0;
          const s=host.getState();
          nOff = U.makeRng(s.seed+'/cgl/off').range(0,800);
          ensure(s); upload(A.read, seedField(s,gw,gh));
          const warm = host.reducedMotion() ? Math.min(s.warmup,80) : s.warmup;
          if (warm>0) burst(warm); else { render(); status(); startLoop(); }
        },
        repaint(){ if(A) render(); },
        live(key){ if(key==='running') startLoop(); else if(!raf) startLoop(); },
        resize(){ if(A) render(); },
        pause(){ stop(); },
        resume(){ if(A){ render(); startLoop(); } },
        disturb(p){
          if(!A) return;
          pokePass.draw(A.write, { u_a:A.read, u_pos:[p.x, p.yGL], u_rad:0.08, u_amp:1.1, u_charge:1 });
          A.swap(); render(); startLoop();
        },
        async exportPNG(w,h){
          if(!A) throw new Error('nothing to export');
          const Tgt = new G.Target(gl, w, h, { type:'rgba8' });
          render(Tgt);
          const px = new Uint8Array(w*h*4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, Tgt.fbo);
          gl.readPixels(0,0,w,h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null); Tgt.dispose();
          const c=document.createElement('canvas'); c.width=w; c.height=h;
          const ctx=c.getContext('2d'), img=ctx.createImageData(w,h);
          for(let y=0;y<h;y++) img.data.set(px.subarray((h-1-y)*w*4,(h-y)*w*4), y*w*4);
          ctx.putImageData(img,0,0); return U.toBlob(c);
        },
      };
    },
  });


  /* ==================== Hofstadter butterfly ==================== */
  function gcd(a,b){ a=Math.abs(a)|0; b=Math.abs(b)|0; while(b){ const t=a%b; a=b; b=t; } return a; }
  function jacobiEV(A, n) {
    const maxIter = Math.min(60, 8 + n);
    for (let it=0; it<maxIter; it++) {
      let mx=0, p=0, q=1;
      for (let i=0;i<n;i++) for (let j=i+1;j<n;j++) {
        const v = Math.abs(A[i*n+j]);
        if (v>mx) { mx=v; p=i; q=j; }
      }
      if (mx < 1e-9) break;
      const app=A[p*n+p], aqq=A[q*n+q], apq=A[p*n+q];
      const tau = (aqq-app) / (2*apq);
      const t = (tau>=0?1:-1) / (Math.abs(tau) + Math.sqrt(1+tau*tau));
      const c = 1/Math.sqrt(1+t*t), s = t*c;
      for (let k=0;k<n;k++) {
        if (k===p || k===q) continue;
        const aik=A[p*n+k], aqk=A[q*n+k];
        A[p*n+k]=A[k*n+p]= c*aik - s*aqk;
        A[q*n+k]=A[k*n+q]= s*aik + c*aqk;
      }
      A[p*n+p] = c*c*app - 2*s*c*apq + s*s*aqq;
      A[q*n+q] = s*s*app + 2*s*c*apq + c*c*aqq;
      A[p*n+q]=A[q*n+p]=0;
    }
    const ev = new Float64Array(n);
    for (let i=0;i<n;i++) ev[i]=A[i*n+i];
    return ev;
  }
  function harperEV(p, q) {
    const n = q, A = new Float64Array(n*n);
    for (let i=0;i<n;i++) {
      A[i*n+i] = 2 * Math.cos(TAU * p * i / q);
      const j = (i+1)%n;
      A[i*n+j] = 1; A[j*n+i] = 1;
    }
    return jacobiEV(A, n);
  }
  Studio.register({
    id: 'hofstadter',
    name: 'Hofstadter butterfly',
    tab: 'Hofstadter',
    subtitle: 'almost-Mathieu spectrum · 1976',
    order: 92,
    equation: 'ψₙ₊₁ + ψₙ₋₁ + 2 cos(2π n α) ψₙ = E ψₙ',
    credit: "Douglas R. Hofstadter, Phys. Rev. B 14, 2239 (1976). A Bloch electron in a square lattice with perpendicular flux α (in flux quanta per plaquette) has a spectrum that is a fractal in the (α, E) plane — the butterfly. Gaps carry Chern numbers; Avron colored them. At rational α=p/q the Harper matrix is q×q.",
    blurb: 'A lattice, a magnetic field, and nothing else. Plot energy against flux and a butterfly appears, identical at every scale. Each wing is a gap, each gap a Chern number, the integer quantum Hall effect written as a moth. Rational fluxes give finite matrices; the irrationals, a Cantor spectrum. This plate diagonalizes the Harper operator at every coprime p/q up to a cutoff and lays the eigenvalues down as density.',
    schema: [
      { group: 'Spectrum', key: 'Q', label: 'Max denominator q', type: 'range', kind: GEOM, min: 12, max: 48, step: 1, fmt: String,
        hint: 'Every coprime p/q with q≤Q is diagonalized. 36 is a fine butterfly; 48 is denser and slower.' },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['density','Density'],['chern','Chern']] },
      { group: 'Picture', key: 'tone', label: 'Tone', type: 'seg', kind: PAINT, options: [['log','Log'],['power','Linear']] },
      { group: 'Picture', key: 'exposure', label: 'Exposure', type: 'range', kind: PAINT, min: 0.4, max: 2.4, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'gamma', label: 'Gamma', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1','1:1'],['4:5','4:5'],['5:4','5:4']] },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
    ],
    defaults: { Q: 32, view: 'density', tone: 'log', exposure: 1.2, gamma: 0.9, aspect: '1:1', grain: 0.04, seed: 'hofstadter-1976' },
    presets: {
      classic: pre('Classic', { Q: 36, view: 'density' }, Pal.xray),
      chern: pre('Chern color', { Q: 28, view: 'chern' }, Pal.thermal),
      fine: pre('Fine q=44', { Q: 44, view: 'density' }, Pal.graphite),
      ink: pre('Ink', { Q: 32, view: 'density', exposure: 1.4 }, Pal.ember),
    },
    hints: { Spectrum: 'q is resolution. The last golden-mean flux is the most broken wing. Chern colors the gaps by the Hall integer of the band below.' },
    palette: true, defaultPalette: 'xray', paletteLabel: 'Colors',
    headline: 'Q', headlineLabel: 'max q',
    sanitize(s){ s.Q = U.clamp(Math.round(Number(s.Q)||32), 8, 56); },
    surprise(rng){ return { Q: rng.pick([24,28,32,36,40]), view: rng.pick(['density','density','chern']), tone:'log', exposure: rng.range(0.9,1.4), gamma: rng.range(0.8,1.1), aspect:'1:1', grain: rng.pick([0,0.04,0.08]) }; },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let dens, chern, BW=0, BH=0, nEV=0;
      function sizeOf(){ return [640, 640]; }
      function rebuild(s) {
        const [W,H] = sizeOf(); BW=W; BH=H;
        dens = new Float32Array(W*H); chern = new Float32Array(W*H);
        nEV = 0;
        const Q = s.Q|0;
        for (let q=1; q<=Q; q++) {
          for (let p=0; p<=q; p++) {
            if (gcd(p,q)!==1 && !(p===0 && q===1) && !(p===q && q>1 && gcd(p,q)!==1)) {
              if (gcd(p,q)!==1) continue;
            }
            if (q>1 && gcd(p,q)!==1) continue;
            let ev;
            try { ev = harperEV(p, q); } catch (e) { continue; }
            const sorted = Array.from(ev).sort((a,b)=>a-b);
            const a = p/q;
            for (let r=0;r<sorted.length;r++) {
              const E = sorted[r];
              const ix = Math.min(W-1, (a * (W-1)) | 0);
              const iy = Math.min(H-1, ((1 - (E+4)/8) * (H-1)) | 0);
              if (iy<0 || iy>=H) continue;
              dens[iy*W+ix] += 1;
              if (ix+1<W) dens[iy*W+ix+1] += 0.4;
              if (ix>0) dens[iy*W+ix-1] += 0.4;
              // Chern of gap above band r: r ≡ p C (mod q), smallest |C|
              let C = 0, best=1e9;
              for (let c=-q;c<=q;c++) {
                let m = r - p*c;
                m = ((m%q)+q)%q;
                if (m===0 && Math.abs(c)<best) { best=Math.abs(c); C=c; }
              }
              chern[iy*W+ix] += C;
              nEV++;
            }
          }
        }
      }
      function draw() {
        const s = host.getState();
        if (!dens) return;
        const w=canvas.width, h=canvas.height;
        const buf=document.createElement('canvas'); buf.width=BW; buf.height=BH;
        const bctx=buf.getContext('2d');
        const img=bctx.createImageData(BW,BH);
        if (s.view==='chern') {
          const lut = U.makeRampLUT(s.palette, s.bg, 256);
          const bg = U.hexToRgb(s.bg);
          for (let i=0,o=0;i<dens.length;i++,o+=4) {
            if (dens[i]<=0) { img.data[o]=bg[0]; img.data[o+1]=bg[1]; img.data[o+2]=bg[2]; img.data[o+3]=255; continue; }
            const C = chern[i]/dens[i];
            let t = U.clamp(C / 8 + 0.5, 0, 1);
            const li=(t*255|0)*3;
            img.data[o]=lut[li]; img.data[o+1]=lut[li+1]; img.data[o+2]=lut[li+2]; img.data[o+3]=255;
          }
        } else toneMap(dens, BW, BH, s, img.data);
        bctx.putImageData(img,0,0);
        blit(ctx, buf, BW, BH, w, h);
        grainPut(ctx, w, h, s.grain, s.seed);
      }
      return {
        aspect(s){ return ASPECTS[s.aspect]||1; },
        regenerate(){
          const s=host.getState();
          host.setStatus('<span>diagonalizing Harper matrices…</span>');
          rebuild(s); draw();
          host.setStatus('<span>q ≤ <b>'+s.Q+'</b></span><span>eigenvalues <b>'+nEV.toLocaleString()+'</b></span>');
        },
        repaint(){ draw(); },
        resize(){ draw(); },
        pause(){}, resume(){ draw(); },
        async exportPNG(w,h){
          const s=host.getState();
          const out=document.createElement('canvas'); out.width=w; out.height=h;
          const octx=out.getContext('2d');
          const buf=document.createElement('canvas'); buf.width=BW; buf.height=BH;
          const img=buf.getContext('2d').createImageData(BW,BH);
          if (s.view==='chern') {
            const lut=U.makeRampLUT(s.palette,s.bg,256); const bg=U.hexToRgb(s.bg);
            for (let i=0,o=0;i<dens.length;i++,o+=4) {
              if (dens[i]<=0){ img.data[o]=bg[0]; img.data[o+1]=bg[1]; img.data[o+2]=bg[2]; img.data[o+3]=255; continue; }
              const t=U.clamp(chern[i]/dens[i]/8+0.5,0,1); const li=(t*255|0)*3;
              img.data[o]=lut[li]; img.data[o+1]=lut[li+1]; img.data[o+2]=lut[li+2]; img.data[o+3]=255;
            }
          } else toneMap(dens,BW,BH,s,img.data);
          buf.getContext('2d').putImageData(img,0,0);
          octx.imageSmoothingEnabled=true; octx.imageSmoothingQuality='high';
          octx.drawImage(buf,0,0,w,h);
          return U.toBlob(out);
        },
      };
    },
  });


  /* ==================== Helmholtz scars ==================== */
  function insideShape(shape, x, y, L, R) {
    // x,y in [-1,1] box
    if (shape === 'cardioid') {
      const px = x + 0.22, py = y;
      const t = Math.atan2(py, px);
      const r = Math.hypot(px, py);
      return r < 0.5 * (1 - Math.cos(t));
    }
    if (shape === 'sinai') {
      const inSq = Math.abs(x)<0.92 && Math.abs(y)<0.92;
      return inSq && Math.hypot(x, y) > 0.38;
    }
    if (shape === 'disk') return Math.hypot(x, y) < 0.92;
    // stadium: rectangle with caps. L = length of rect, R = cap radius, in normalized coords
    const a = 0.55, rr = 0.38;
    if (Math.abs(x) <= a && Math.abs(y) <= rr) return true;
    if (x > a) return Math.hypot(x-a, y) <= rr;
    if (x < -a) return Math.hypot(x+a, y) <= rr;
    return false;
  }
  Studio.register({
    id: 'scars',
    name: 'Helmholtz scars',
    tab: 'Scars',
    subtitle: 'stadium and cardioid eigenmodes · Heller 1984',
    order: 93,
    equation: '∇²ψ + k² ψ = 0  on Ω,   ψ = 0 on ∂Ω',
    credit: "Eric J. Heller, Phys. Rev. Lett. 53, 1515 (1984). In a classically chaotic billiard the high eigenfunctions of the Dirichlet Laplacian are usually ergodic — and yet some sit, as scars, along unstable periodic orbits. The Bunimovich stadium and the cardioid are the textbook domains. Inverse iteration of the discrete Laplacian with a Weyl shift yields a mode near index n.",
    blurb: 'A particle in a stadium should forget where it is. Most high wavefunctions do: a speckle, the quantum face of chaos. A few do not. They light up a bouncing-ball, a bow-tie, an orbit that is unstable classically and yet refuses to die. Heller called them scars. Pick a mode index, pick a domain, and the plate is that eigenfunction, signed through the palette, zeros as nodal lines.',
    schema: [
      { group: 'Domain', key: 'shape', label: 'Domain', type: 'seg', kind: GEOM, wrap: true,
        options: [['stadium','Stadium'],['cardioid','Cardioid'],['sinai','Sinai'],['disk','Disk']] },
      { group: 'Domain', key: 'n', label: 'Mode n', type: 'range', kind: GEOM, min: 20, max: 1200, step: 1, fmt: String,
        hint: 'Weyl index. Low n: room modes. High n (hundreds): speckle, and sometimes a scar.' },
      { group: 'Domain', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[96,'96'],[128,'128'],[160,'160'],[192,'192']] },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['signed','Signed'],['prob','|ψ|²'],['log','log |ψ|']] },
      { group: 'Picture', key: 'exposure', label: 'Exposure', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'gamma', label: 'Gamma', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
      { group: 'Simulation', key: 'running', label: 'Wave packet', type: 'toggle', kind: LIVE,
        hint: 'Off: a computed eigenmode. On: a live wave equation, Dirichlet, from a Gaussian packet.' },
    ],
    defaults: { shape: 'stadium', n: 520, grid: 128, view: 'signed', exposure: 1, gamma: 1, grain: 0.05, running: false, seed: 'heller-1984' },
    presets: {
      stadium: pre('Stadium n=520', { shape:'stadium', n:520, view:'signed' }, Pal.xray),
      high: pre('High speckle', { shape:'stadium', n:900, view:'prob', grid:160 }, Pal.thermal),
      cardioid: pre('Cardioid', { shape:'cardioid', n:560, view:'signed' }, Pal.nightshade),
      sinai: pre('Sinai', { shape:'sinai', n:640, view:'log' }, Pal.graphite),
      bounce: pre('Bouncing ball', { shape:'stadium', n:220, view:'prob' }, Pal.glacier),
    },
    hints: { Domain: 'n is the Weyl index, not a guaranteed scar. Scan it. The stadium’s bouncing-ball family is the easy one; bow-ties hide at higher n.' },
    palette: true, defaultPalette: 'xray', paletteLabel: 'Colors',
    headline: 'n', headlineLabel: 'mode n',
    sanitize(s){ s.n = U.clamp(Math.round(Number(s.n)||280), 8, 2000); s.grid = U.clamp(Math.round(Number(s.grid)||128), 64, 224); },
    surprise(rng){ return { shape: rng.pick(['stadium','stadium','cardioid','sinai']), n: rng.int(80,900), grid: rng.pick([96,128,160]), view: rng.pick(['signed','prob','log']), exposure:1, gamma: rng.range(0.85,1.15), grain: rng.pick([0,0.05]), running:false }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let psi, prev, mask, N=0, raf=0, kEst=0, area=0;
      function buildMask(s) {
        N = s.grid|0;
        mask = new Uint8Array(N*N); psi = new Float64Array(N*N); prev = new Float64Array(N*N);
        area=0;
        for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
          const xn = (x+0.5)/N*2-1, yn = (y+0.5)/N*2-1;
          const m = insideShape(s.shape, xn, yn) ? 1 : 0;
          mask[y*N+x]=m; area+=m;
        }
      }
      function inverseIter(s) {
        const rng = U.makeRng(s.seed + '/scar/' + s.n);
        kEst = Math.sqrt(U.clamp(4 * PI * s.n / Math.max(1, area), 0.2, 7.4));
        const k2 = kEst * kEst;
        const Hpsi = new Float64Array(N * N);
        const grad = new Float64Array(N * N);
        function applyH(src, dst) {
          dst.fill(0);
          for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
            const i = y * N + x;
            if (!mask[i]) { dst[i] = 0; continue; }
            const lap = (mask[i - 1] ? src[i - 1] : 0) + (mask[i + 1] ? src[i + 1] : 0)
                      + (mask[i - N] ? src[i - N] : 0) + (mask[i + N] ? src[i + N] : 0) - 4 * src[i];
            dst[i] = lap + k2 * src[i];
          }
        }
        for (let i = 0; i < N * N; i++) {
          if (!mask[i]) { psi[i] = 0; continue; }
          const x = i % N, y = (i / N) | 0;
          psi[i] = (rng() * 2 - 1) * Math.sin(kEst * x * 0.62 + rng()) * Math.sin(kEst * y * 0.58);
        }
        function norm() {
          let nrm = 0; for (let i = 0; i < N * N; i++) nrm += psi[i] * psi[i];
          nrm = Math.sqrt(nrm) || 1;
          for (let i = 0; i < N * N; i++) psi[i] = mask[i] ? psi[i] / nrm : 0;
        }
        norm();
        for (let it = 0; it < 90; it++) {
          applyH(psi, Hpsi);
          applyH(Hpsi, grad);
          let num = 0, den = 0;
          for (let i = 0; i < N * N; i++) { num += psi[i] * grad[i]; den += grad[i] * grad[i]; }
          const mu = num / (den || 1);
          for (let i = 0; i < N * N; i++) if (mask[i]) psi[i] -= mu * grad[i];
          norm();
        }
        applyH(psi, Hpsi);
        let num = 0, denN = 0;
        for (let i = 0; i < N * N; i++) { num += -psi[i] * (Hpsi[i] - k2 * psi[i]); denN += psi[i] * psi[i]; }
        kEst = Math.sqrt(Math.max(0, num / (denN || 1)));
        prev.set(psi);
      }
      function paint() {
        const s=host.getState();
        const w=canvas.width, h=canvas.height;
        const img=ctx.createImageData(w,h);
        const lut=U.makeRampLUT(s.palette, s.bg, 256);
        const bg=U.hexToRgb(s.bg);
        let mx=0; for (let i=0;i<psi.length;i++) { const a=Math.abs(psi[i]); if(a>mx) mx=a; }
        const inv=1/Math.max(1e-12, mx);
        for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
          const gx = Math.min(N-1, (x/w*N)|0), gy = Math.min(N-1, (y/h*N)|0);
          const i=gy*N+gx, o=(y*w+x)*4;
          if (!mask[i]) { img.data[o]=bg[0]; img.data[o+1]=bg[1]; img.data[o+2]=bg[2]; img.data[o+3]=255; continue; }
          const v = psi[i]*inv;
          let t;
          if (s.view==='prob') t = v*v;
          else if (s.view==='log') t = Math.log1p(v*v*40)/Math.log1p(40);
          else t = U.clamp(v*0.5*s.exposure + 0.5, 0, 1);
          if (s.view!=='signed') t = Math.min(1, t * s.exposure);
          if (s.gamma!==1 && s.view!=='signed') t = Math.pow(t, s.gamma);
          const li=(t*255|0)*3;
          img.data[o]=lut[li]; img.data[o+1]=lut[li+1]; img.data[o+2]=lut[li+2]; img.data[o+3]=255;
        }
        ctx.putImageData(img,0,0);
        grainPut(ctx,w,h,s.grain,s.seed);
      }
      function waveStep() {
        const nxt = new Float64Array(N*N);
        const c2 = 0.18;
        for (let y=1;y<N-1;y++) for (let x=1;x<N-1;x++) {
          const i=y*N+x; if(!mask[i]) continue;
          const lap = (mask[i-1]?psi[i-1]:0)+(mask[i+1]?psi[i+1]:0)+(mask[i-N]?psi[i-N]:0)+(mask[i+N]?psi[i+N]:0) - 4*psi[i];
          nxt[i] = 2*psi[i] - prev[i] + c2 * lap;
        }
        prev.set(psi); psi.set(nxt);
      }
      function stop(){ cancelAnimationFrame(raf); raf=0; }
      function frame(){ raf=0; waveStep(); paint(); if(host.getState().running && !host.reducedMotion()) raf=requestAnimationFrame(frame); }
      return {
        aspect(){ return 1; },
        regenerate(){
          stop();
          const s=host.getState();
          buildMask(s); inverseIter(s);
          if (s.running) {
            const rng=U.makeRng(s.seed+'/pkt');
            for (let i=0;i<N*N;i++) { psi[i]=0; prev[i]=0; }
            const cx=(0.35+rng()*0.3)*N, cy=N*0.5, sx=4;
            for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
              if (!mask[y*N+x]) continue;
              psi[y*N+x] = Math.exp(-((x-cx)*(x-cx)+(y-cy)*(y-cy))/(2*sx*sx)) * Math.cos((x-cx)*0.9);
            }
            prev.set(psi);
          }
          paint();
          host.setStatus('<span>'+s.shape+'</span><span>n <b>'+s.n+'</b> · k≈'+kEst.toFixed(2)+'</span><span>cells <b>'+area+'</b></span>');
          if (s.running && !host.reducedMotion()) raf=requestAnimationFrame(frame);
        },
        repaint(){ paint(); },
        live(key){ if(key==='running') this.regenerate(); },
        resize(){ paint(); },
        pause(){ stop(); },
        resume(){ paint(); if(host.getState().running) raf=requestAnimationFrame(frame); },
        disturb(p){
          if(!psi) return;
          const cx=p.x*N, cy=p.y*N;
          for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
            if(!mask[y*N+x]) continue;
            const d=(x-cx)*(x-cx)+(y-cy)*(y-cy);
            psi[y*N+x] += Math.exp(-d/18);
          }
          paint();
        },
        async exportPNG(w,h){
          const out=document.createElement('canvas'); out.width=w; out.height=h;
          const octx=out.getContext('2d');
          const saved=canvas.width;
          // paint into offscreen by temporarily using local loop
          const img=octx.createImageData(w,h);
          const s=host.getState();
          const lut=U.makeRampLUT(s.palette,s.bg,256); const bg=U.hexToRgb(s.bg);
          let mx=0; for (let i=0;i<psi.length;i++) { const a=Math.abs(psi[i]); if(a>mx) mx=a; }
          const inv=1/Math.max(1e-12,mx);
          for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
            const gx=Math.min(N-1,(x/w*N)|0), gy=Math.min(N-1,(y/h*N)|0);
            const i=gy*N+gx, o=(y*w+x)*4;
            if(!mask[i]){ img.data[o]=bg[0]; img.data[o+1]=bg[1]; img.data[o+2]=bg[2]; img.data[o+3]=255; continue; }
            const v=psi[i]*inv;
            let t = s.view==='prob' ? v*v : s.view==='log' ? Math.log1p(v*v*40)/Math.log1p(40) : U.clamp(v*0.5*s.exposure+0.5,0,1);
            if (s.view!=='signed') t=Math.min(1,t*s.exposure);
            const li=(t*255|0)*3;
            img.data[o]=lut[li]; img.data[o+1]=lut[li+1]; img.data[o+2]=lut[li+2]; img.data[o+3]=255;
          }
          octx.putImageData(img,0,0); return U.toBlob(out);
        },
      };
    },
  });


  /* ==================== Optical caustics ==================== */
  Studio.register({
    id: 'caustics',
    name: 'Optical caustics',
    tab: 'Caustics',
    subtitle: 'folds and cusps of a light field · Berry',
    order: 94,
    equation: 'X = x + s ∇h(x),   I(X) = Σ 1 / |det(I + s Hess h)|',
    credit: "Michael V. Berry’s catastrophe optics: the brightness of a light field after a smooth phase screen is the density of the gradient map of the height. Folds (A2) and cusps (A3) are the generic caustics in the plane. The swimming-pool network is this map, not a Voronoi diagram.",
    blurb: 'Light through a wavy surface does not make cells. It folds. Where the map x ↦ x + s ∇h has a vanishing Jacobian, rays pile up and the intensity diverges — a fold curve, and on it, isolated cusps. That is the silk on a pool floor, the network in a glass of water, the catastrophe Berry named. A band-limited height, a distance s, and a density of mapped points: the plate is the real eikonal, not a decoration.',
    schema: [
      { group: 'Screen', key: 's', label: 'Distance s', type: 'range', kind: GEOM, min: 0.02, max: 0.9, step: 0.01, fmt: f2,
        hint: 'Propagation distance. Small s: weak ripples. Large s: folds fill the plate.' },
      { group: 'Screen', key: 'modes', label: 'Fourier modes', type: 'range', kind: GEOM, min: 3, max: 24, step: 1, fmt: String },
      { group: 'Screen', key: 'rough', label: 'Amplitude', type: 'range', kind: GEOM, min: 0.1, max: 1.8, step: 0.05, fmt: f2 },
      { group: 'Screen', key: 'k0', label: 'Wavenumber', type: 'range', kind: GEOM, min: 1, max: 12, step: 0.2, fmt: f1 },
      { group: 'Picture', key: 'samples', label: 'Samples', type: 'range', kind: GEOM, min: 180, max: 520, step: 20, fmt: String },
      { group: 'Picture', key: 'tone', label: 'Tone', type: 'seg', kind: PAINT, options: [['log','Log'],['power','Linear']] },
      { group: 'Picture', key: 'exposure', label: 'Exposure', type: 'range', kind: PAINT, min: 0.4, max: 2.4, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'gamma', label: 'Gamma', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1','1:1'],['4:5','4:5'],['5:4','5:4'],['16:9','16:9']] },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
    ],
    defaults: { s: 0.28, modes: 8, rough: 0.7, k0: 4.5, samples: 320, tone: 'log', exposure: 1.15, gamma: 0.85, aspect: '1:1', grain: 0.05, seed: 'berry-caustic' },
    presets: {
      pool: pre('Pool floor', { s: 0.32, modes: 10, k0: 5, rough: 0.65 }, Pal.glacier),
      silk: pre('Silk', { s: 0.45, modes: 7, k0: 3.2, rough: 0.9, exposure: 1.3 }, Pal.xray),
      cusp: pre('Cusps', { s: 0.55, modes: 5, k0: 2.4, rough: 1.1 }, Pal.thermal),
      fine: pre('Fine ripple', { s: 0.18, modes: 16, k0: 8, samples: 400 }, Pal.bioluminescent),
    },
    hints: { Screen: 's is how far the light has travelled after the height. Modes and k₀ are the weather on the surface.' },
    palette: true, defaultPalette: 'glacier', paletteLabel: 'Intensity',
    headline: 's', headlineLabel: 'distance s',
    sanitize(s){ s.samples = U.clamp(Math.round(Number(s.samples)/20)*20, 160, 560); },
    surprise(rng){ return { s: rng.range(0.15, 0.6), modes: rng.int(5,16), rough: rng.range(0.4,1.2), k0: rng.range(2,9), samples: rng.pick([280,320,400]), tone:'log', exposure: rng.range(0.9,1.4), gamma: rng.range(0.7,1.05), aspect: rng.pick(['1:1','5:4']), grain: rng.pick([0,0.05]) }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let dens, BW=0, BH=0;
      function rebuild(st) {
        const ar = ASPECTS[st.aspect]||1;
        const long=720;
        BW = ar>=1 ? Math.round(long/ar) : long;
        BH = ar>=1 ? long : Math.round(long*ar);
        dens = new Float32Array(BW*BH);
        const rng = U.makeRng(st.seed + '/cau');
        const M = st.modes|0, modes=[];
        for (let i=0;i<M;i++) {
          const ang = rng()*TAU, k = st.k0 * (0.55 + rng()*0.9);
          modes.push({ kx: k*Math.cos(ang), ky: k*Math.sin(ang), A: st.rough * (0.4+rng()) / M, ph: rng()*TAU });
        }
        const S = st.samples|0, dist=st.s;
        for (let iy=0; iy<S; iy++) for (let ix=0; ix<S; ix++) {
          const x = ix/(S-1), y = iy/(S-1);
          let hx=0, hy=0, hxx=0, hyy=0, hxy=0;
          for (let m=0;m<M;m++) {
            const md=modes[m], arg = md.kx*x + md.ky*y + md.ph, sn=Math.sin(arg), cs=Math.cos(arg);
            hx += -md.A * md.kx * sn; hy += -md.A * md.ky * sn;
            hxx += -md.A * md.kx * md.kx * cs; hyy += -md.A * md.ky * md.ky * cs; hxy += -md.A * md.kx * md.ky * cs;
          }
          const X = x + dist*hx, Y = y + dist*hy;
          const jac = (1+dist*hxx)*(1+dist*hyy) - (dist*hxy)*(dist*hxy);
          const wgt = 1 / Math.max(0.02, Math.abs(jac));
          const px = X*BW, py = Y*BH;
          if (px<1||py<1||px>=BW-1||py>=BH-1) continue;
          const i = (py|0)*BW + (px|0);
          dens[i]+=wgt; dens[i+1]+=wgt*0.3; dens[i-1]+=wgt*0.3;
          dens[i+BW]+=wgt*0.3; dens[i-BW]+=wgt*0.3;
        }
      }
      function draw() {
        const s=host.getState(); if(!dens) return;
        const w=canvas.width, h=canvas.height;
        const buf=document.createElement('canvas'); buf.width=BW; buf.height=BH;
        const img=buf.getContext('2d').createImageData(BW,BH);
        toneMap(dens,BW,BH,s,img.data);
        buf.getContext('2d').putImageData(img,0,0);
        blit(ctx,buf,BW,BH,w,h); grainPut(ctx,w,h,s.grain,s.seed);
      }
      return {
        aspect(s){ return ASPECTS[s.aspect]||1; },
        regenerate(){ rebuild(host.getState()); draw(); host.setStatus('<span>s <b>'+host.getState().s.toFixed(2)+'</b></span><span>modes <b>'+host.getState().modes+'</b></span>'); },
        repaint(){ draw(); }, resize(){ draw(); }, pause(){}, resume(){ draw(); },
        async exportPNG(w,h){
          const s=host.getState(); const out=document.createElement('canvas'); out.width=w; out.height=h;
          const buf=document.createElement('canvas'); buf.width=BW; buf.height=BH;
          const img=buf.getContext('2d').createImageData(BW,BH); toneMap(dens,BW,BH,s,img.data);
          buf.getContext('2d').putImageData(img,0,0);
          const o=out.getContext('2d'); o.imageSmoothingEnabled=true; o.imageSmoothingQuality='high'; o.drawImage(buf,0,0,w,h);
          return U.toBlob(out);
        },
      };
    },
  });

  /* ==================== Smectic focal conics ==================== */
  Studio.register({
    id: 'smectic',
    name: 'Smectic focal conics',
    tab: 'Focal conics',
    subtitle: 'Dupin cyclides · Friedel 1910',
    order: 72,
    equation: 'layers: Dupin cyclides of a confocal ellipse–hyperbola pair',
    credit: "G. Friedel, Annales de Physique 18, 273 (1910). Smectic-A layers prefer equal spacing and may bend; the surfaces of constant spacing whose centers of curvature lie on an ellipse and a confocal hyperbola are Dupin cyclides. Packed in the plane they are toroidal focal conic domains — an Apollonian foam of nested rings.",
    blurb: 'A smectic is a stack of liquid pages. Bend them and the only defects they will tolerate are perfect: an ellipse and a hyperbola sharing foci, the layers wrapping as cyclides. Look down on a film and you see circles inside circles, packed until the gaps themselves grow smaller circles — Friedel’s focal conics, the baroque of liquid crystals. This plate packs seeded disks and fills each with the concentric traces of a toroidal domain.',
    schema: [
      { group: 'Packing', key: 'n', label: 'Domains', type: 'range', kind: GEOM, min: 8, max: 80, step: 1, fmt: String },
      { group: 'Packing', key: 'pitch', label: 'Layer pitch', type: 'range', kind: GEOM, min: 0.008, max: 0.06, step: 0.001, fmt: f3 },
      { group: 'Packing', key: 'minR', label: 'Smallest domain', type: 'range', kind: GEOM, min: 0.02, max: 0.12, step: 0.005, fmt: f2 },
      { group: 'Packing', key: 'fill', label: 'Fill attempts', type: 'range', kind: GEOM, min: 40, max: 400, step: 20, fmt: String },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['layers','Layers'],['ellipses','Defects'],['both','Both']] },
      { group: 'Picture', key: 'lw', label: 'Line weight', type: 'range', kind: PAINT, min: 0.4, max: 2.4, step: 0.1, fmt: f1 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
    ],
    defaults: { n: 36, pitch: 0.016, minR: 0.028, fill: 280, view: 'layers', lw: 1, grain: 0.04, seed: 'friedel-1910' },
    presets: {
      foam: pre('TFCD foam', { n: 36, pitch: 0.016, view: 'layers' }, Pal.xray),
      coarse: pre('Coarse', { n: 14, pitch: 0.028, minR: 0.06, view: 'both' }, Pal.graphite),
      fine: pre('Fine layers', { n: 48, pitch: 0.011, fill: 280, view: 'layers' }, Pal.glacier),
      defects: pre('Ellipse defects', { n: 22, view: 'ellipses', pitch: 0.02 }, Pal.ember),
    },
    hints: { Packing: 'Each disk is a toroidal focal conic. Pitch is the smectic layer spacing. More fill attempts pack the Apollonian gaps.' },
    palette: true, defaultPalette: 'xray', paletteLabel: 'Inks',
    headline: 'n', headlineLabel: 'domains',
    surprise(rng){ return { n: rng.int(14,50), pitch: rng.range(0.012,0.03), minR: rng.range(0.025,0.07), fill: rng.int(80,260), view: rng.pick(['layers','layers','both']), lw: rng.range(0.7,1.5), grain: rng.pick([0,0.04]) }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let circles=[];
      function pack(s) {
        const rng=U.makeRng(s.seed+'/smec');
        circles=[];
        const tries=s.fill|0, nMax=s.n|0;
        for (let t=0;t<tries && circles.length<nMax;t++) {
          const x=rng(), y=rng();
          let rMax=Math.min(x,1-x,y,1-y);
          for (let i=0;i<circles.length;i++) {
            const c=circles[i];
            rMax = Math.min(rMax, Math.hypot(x-c.x,y-c.y)-c.r);
          }
          if (rMax > s.minR) circles.push({ x, y, r: rMax * (0.92 + rng()*0.08), e: 0.15+rng()*0.5, th: rng()*TAU });
        }
        circles.sort((a,b)=>b.r-a.r);
      }
      function draw() {
        const s=host.getState();
        const w=canvas.width, h=canvas.height;
        ctx.fillStyle=s.bg; ctx.fillRect(0,0,w,h);
        const lut=U.makeRampLUT(s.palette,null,256);
        const col = k => { const li=((k%1)*255|0)*3; return 'rgb('+(lut[li]|0)+','+(lut[li+1]|0)+','+(lut[li+2]|0)+')'; };
        ctx.lineJoin='round'; ctx.lineCap='round';
        for (let i=0;i<circles.length;i++) {
          const c=circles[i], cx=c.x*w, cy=c.y*h, sc=Math.min(w,h);
          const R=c.r*sc;
          ctx.strokeStyle=col(i*0.17);
          ctx.lineWidth=Math.max(0.6, s.lw * sc/900);
          if (s.view!=='ellipses') {
            const pitch=s.pitch*sc;
            for (let r=R; r>1.5; r-=pitch) {
              ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU); ctx.stroke();
            }
          }
          if (s.view!=='layers') {
            ctx.save(); ctx.translate(cx,cy); ctx.rotate(c.th);
            ctx.beginPath(); ctx.ellipse(0,0, R, R*(0.55+c.e*0.3), 0, 0, TAU); ctx.stroke();
            const f = R * Math.sqrt(Math.max(0, 1 - (0.55+c.e*0.3)**2));
            ctx.beginPath(); ctx.moveTo(-f, -R*1.1); ctx.quadraticCurveTo(0,0, f, R*1.1); ctx.stroke();
            ctx.restore();
          }
        }
        grainPut(ctx,w,h,s.grain,s.seed);
      }
      return {
        aspect(){ return 1; },
        regenerate(){ pack(host.getState()); draw(); host.setStatus('<span>domains <b>'+circles.length+'</b></span><span>pitch <b>'+host.getState().pitch.toFixed(3)+'</b></span>'); },
        repaint(){ draw(); }, resize(){ draw(); }, pause(){}, resume(){ draw(); },
        disturb(p){
          circles.push({ x:p.x, y:p.y, r:0.08, e:0.3, th:0 });
          draw();
        },
        async exportPNG(w,h){
          const out=document.createElement('canvas'); out.width=w; out.height=h;
          const old=canvas; const octx=out.getContext('2d');
          // reuse draw against a fake by temporarily swapping sizes via a local paint
          const savedW=canvas.width, savedH=canvas.height;
          // paint using same code path scaled: draw into out by monkeypatching
          const prev=canvas.getContext; 
          const s=host.getState();
          const g=out.getContext('2d');
          g.fillStyle=s.bg; g.fillRect(0,0,w,h);
          const lut=U.makeRampLUT(s.palette,null,256);
          const col = k => { const li=((k%1)*255|0)*3; return 'rgb('+(lut[li]|0)+','+(lut[li+1]|0)+','+(lut[li+2]|0)+')'; };
          const sc=Math.min(w,h);
          g.lineJoin='round'; g.lineCap='round';
          for (let i=0;i<circles.length;i++) {
            const c=circles[i], cx=c.x*w, cy=c.y*h, R=c.r*sc;
            g.strokeStyle=col(i*0.17); g.lineWidth=Math.max(0.6, s.lw*sc/900);
            if (s.view!=='ellipses') {
              const pitch=s.pitch*sc;
              for (let r=R;r>1.5;r-=pitch){ g.beginPath(); g.arc(cx,cy,r,0,TAU); g.stroke(); }
            }
            if (s.view!=='layers') {
              g.save(); g.translate(cx,cy); g.rotate(c.th);
              g.beginPath(); g.ellipse(0,0,R,R*(0.55+c.e*0.3),0,0,TAU); g.stroke();
              g.restore();
            }
          }
          return U.toBlob(out);
        },
        exportSVG(w,h){
          const s=host.getState();
          const W=w||1000, H=h||W, sc=Math.min(W,H);
          const pal=s.palette||['#111'];
          const lw=Math.max(0.35, s.lw*sc/900).toFixed(2);
          let body='';
          for (let i=0;i<circles.length;i++) {
            const c=circles[i], cx=(c.x*W).toFixed(2), cy=(c.y*H).toFixed(2), col=U.svgEsc(pal[i%pal.length]);
            const R=c.r*sc;
            if (s.view!=='ellipses') {
              const pitch=s.pitch*sc;
              for (let r=R; r>1.2; r-=pitch)
                body+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r.toFixed(2)+'" fill="none" stroke="'+col+'" stroke-width="'+lw+'"/>\n';
            }
            if (s.view!=='layers') {
              const ry=R*(0.55+c.e*0.3);
              body+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+R.toFixed(2)+'" ry="'+ry.toFixed(2)+'" transform="rotate('+(c.th*180/Math.PI).toFixed(2)+' '+cx+' '+cy+')" fill="none" stroke="'+col+'" stroke-width="'+lw+'"/>\n';
            }
          }
          return U.svgBlob(W,H,s.bg,body);
        },
      };
    },
  });

  function cmul(a,b){ return [a[0]*b[0]-a[1]*b[1], a[0]*b[1]+a[1]*b[0]]; }
  function cdiv(a,b){ const d=b[0]*b[0]+b[1]*b[1]||1e-18; return [(a[0]*b[0]+a[1]*b[1])/d, (a[1]*b[0]-a[0]*b[1])/d]; }
  function csqrt(z){
    const r=Math.hypot(z[0],z[1]); const s=Math.sqrt(Math.max(0,(r+z[0])*0.5));
    const t = (z[1]>0 || (z[1]===0 && z[0]<0) ? 1 : -1)*Math.sqrt(Math.max(0,(r-z[0])*0.5));
    return [s,t];
  }
  function extToHalf(z){ return cmul([0,1], cdiv([z[0]-1, z[1]], [z[0]+1, z[1]])); }
  function halfToExt(w){ return cdiv([w[0], w[1]+1], [-w[0], 1-w[1]]); }
  // Attach a radial slit of capacity c at z = 1 on the exterior of the unit disk. In the half-plane chart w = i(z-1)/(z+1)
  // the point z = 1 is w = 0 and infinity is w = i; the map w -> sqrt(w^2 - 4t) opens a vertical slit of height 2 sqrt(t)
  // at 0 (the sign matters: with + 4t it would remove a slit and the cluster never grows), and the dilation by
  // 1/sqrt(1 + 4t) keeps w = i fixed so that infinity stays where it is under every composition.
  function slitMap(z, c){
    // the chart has derivative 1/2 at z = 1, so a slit that grows the conformal radius by e^c needs t = (e^c - 1) / 4
    const t = Math.max(1e-10, (Math.exp(c) - 1) / 4);
    let w = extToHalf(z);
    const w2 = [w[0]*w[0] - w[1]*w[1] - 4*t, 2*w[0]*w[1]];
    w = csqrt(w2);
    if (w[1] < 0) w = [-w[0], -w[1]];
    const k = 1 / Math.sqrt(1 + 4*t);
    return halfToExt([w[0]*k, w[1]*k]);
  }
  function attachAt(z, theta, c) {
    const e=[Math.cos(theta), Math.sin(theta)], em=[e[0], -e[1]];
    return cmul(slitMap(cmul(z, em), c), e);
  }
  Studio.register({
    id: 'hl',
    name: 'Hastings–Levitov',
    tab: 'HL growth',
    subtitle: 'conformal Laplacian growth · 1998',
    order: 26,
    equation: 'Φₙ = Φₙ₋₁ ∘ f_{θₙ,cₙ},   cₙ ∝ |Φ′(e^{iθ})|^{−α}',
    credit: "M. B. Hastings and L. S. Levitov, Physica D 116, 244 (1998). Laplacian growth (viscous fingering, DLA in a limit) as iterated conformal maps of the exterior disk. α=0 grows a disk; α=2 is DLA-like; the transition at α=1 is sharp. Each particle is a slit map of capacity c composed onto the cluster.",
    blurb: 'DLA is a rumour of this. Hastings and Levitov grow the cluster by composing tiny conformal maps: each particle is a slit attached at a random harmonic-measure angle. One exponent α decides whether you get a disk, a finger, or frozen lightning. The boundary is a map of the circle, so it is sharp at any print size. Color by age and the growth rings are the history of the harmonic measure.',
    schema: [
      { group: 'Growth', key: 'N', label: 'Particles', type: 'range', kind: GEOM, min: 80, max: 1200, step: 20, fmt: String },
      { group: 'Growth', key: 'alpha', label: 'α', type: 'range', kind: GEOM, min: 0, max: 2.4, step: 0.05, fmt: f2,
        hint: 'α=0: disk. α=1: HL transition. α=2: DLA-like lightning. Each particle is a radial slit of capacity c.' },
      { group: 'Growth', key: 'cap', label: 'Capacity c', type: 'range', kind: GEOM, min: 0.001, max: 0.04, step: 0.001, fmt: f3 },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['fill','Cluster'],['age','Age'],['outline','Outline']] },
      { group: 'Picture', key: 'samples', label: 'Boundary samples', type: 'range', kind: GEOM, min: 240, max: 900, step: 30, fmt: String },
      { group: 'Picture', key: 'lw', label: 'Line weight', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.1, fmt: f1 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
    ],
    defaults: { N: 560, alpha: 2, cap: 0.003, view: 'outline', samples: 800, lw: 0.9, grain: 0.03, seed: 'hastings-1998' },
    presets: {
      lightning: pre('Lightning α=2', { alpha: 2, N: 640, cap: 0.0025, view: 'outline', samples: 900 }, Pal.ember),
      fingers: pre('Fingers α=1.4', { alpha: 1.4, N: 480, cap: 0.004, view: 'fill' }, Pal.glacier),
      disk: pre('Disk α=0', { alpha: 0, N: 200, cap: 0.012, view: 'outline' }, Pal.graphite),
      fine: pre('Fine DLA', { alpha: 2.2, N: 800, cap: 0.002, samples: 1000, view: 'age' }, Pal.xray),
    },
    hints: { Growth: 'α is the whole phase diagram. Capacity is particle size. More particles, more filigree, slower compose.' },
    palette: true, defaultPalette: 'ember', paletteLabel: 'Age colors',
    headline: 'alpha', headlineLabel: 'α',
    sanitize(s){ s.N=U.clamp(Math.round(Number(s.N)/20)*20, 40, 1200); },
    surprise(rng){ return { N: rng.pick([200,280,360,480]), alpha: rng.pick([0, 1, 1.5, 2, 2.2]), cap: rng.range(0.01,0.04), view: rng.pick(['age','fill','outline']), samples: 480, lw:1, grain: rng.pick([0,0.04]) }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let parts=[], boundary=[], rings=[];
      function grow(s) {
        const rng=U.makeRng(s.seed+'/hl');
        parts=[]; rings=[];
        const n=s.N|0, a0=s.cap, al=s.alpha;
        const snapEvery = Math.max(20, (n / 6) | 0);
        function sampleBoundary(M, rad) {
          const R = rad || 1.0002, out=[];
          for (let i=0;i<M;i++) {
            const th=TAU*i/M;
            let z=[R*Math.cos(th), R*Math.sin(th)];
            for (let k=parts.length-1;k>=0;k--) z=attachAt(z, parts[k].th, parts[k].c);
            out.push(z);
          }
          return out;
        }
        for (let i=0;i<n;i++) {
          const th=rng()*TAU;
          let c=a0;
          if (al>0 && parts.length) {
            const dth = 3e-4, R=1.0004;
            const z0=[R*Math.cos(th), R*Math.sin(th)], z1=[R*Math.cos(th+dth), R*Math.sin(th+dth)];
            let p0=z0, p1=z1;
            for (let k=parts.length-1;k>=0;k--) { p0=attachAt(p0, parts[k].th, parts[k].c); p1=attachAt(p1, parts[k].th, parts[k].c); }
            const der = Math.hypot(p1[0]-p0[0], p1[1]-p0[1]) / (R*dth);
            c = a0 / Math.pow(Math.max(der, 0.04), al);
            c = U.clamp(c, a0 * 0.05, a0 * 14);
          }
          parts.push({ th, c });
          if ((i+1)%snapEvery===0) rings.push(sampleBoundary(Math.min(480, s.samples|0)));
        }
        boundary = sampleBoundary(s.samples|0);
      }
      function pathOf(g, arr, sc, cx, cy) {
        g.beginPath();
        for (let i=0;i<arr.length;i++) {
          const x=cx+arr[i][0]*sc, y=cy+arr[i][1]*sc;
          if(i===0) g.moveTo(x,y); else g.lineTo(x,y);
        }
        g.closePath();
      }
      function draw() {
        const s=host.getState(); if(!boundary.length) return;
        const w=canvas.width, h=canvas.height;
        ctx.fillStyle=s.bg; ctx.fillRect(0,0,w,h);
        let m=0; for (let i=0;i<boundary.length;i++) m=Math.max(m, Math.hypot(boundary[i][0], boundary[i][1]));
        const sc = 0.44*Math.min(w,h)/Math.max(m,1), cx=w/2, cy=h/2;
        const lut=U.makeRampLUT(s.palette,null,256);
        const rgb = t => { const li=((t%1)*255|0)*3; return 'rgb('+lut[li]+','+lut[li+1]+','+lut[li+2]+')'; };
        ctx.lineJoin='round'; ctx.lineCap='round';
        ctx.lineWidth=Math.max(0.8, s.lw * Math.min(w,h)/800);
        if (s.view==='age' && rings.length) {
          for (let r=0;r<rings.length;r++) {
            ctx.strokeStyle=rgb(r/Math.max(1,rings.length-1));
            pathOf(ctx, rings[r], sc, cx, cy); ctx.stroke();
          }
        }
        pathOf(ctx, boundary, sc, cx, cy);
        if (s.view!=='outline') {
          ctx.fillStyle=rgb(0.72);
          ctx.globalAlpha = s.view==='age' ? 0.18 : 0.92;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        // the outline view has nothing but this line, so it takes the ink that contrasts with the ground
        ctx.strokeStyle = s.view==='outline' ? U.inkFor(s.bg) : rgb(0.12);
        ctx.stroke();
        grainPut(ctx,w,h,s.grain,s.seed);
      }
      return {
        aspect(){ return 1; },
        regenerate(){
          const s=host.getState();
          host.setStatus('<span>composing maps…</span>');
          grow(s); draw();
          host.setStatus('<span>α <b>'+s.alpha.toFixed(2)+'</b></span><span>particles <b>'+parts.length+'</b></span>');
        },
        repaint(){ draw(); }, resize(){ draw(); }, pause(){}, resume(){ draw(); },
        async exportPNG(w,h){
          const out=document.createElement('canvas'); out.width=w; out.height=h;
          const oldC=canvas.width, oldH=canvas.height;
          // draw scaled copy via current draw onto a temp by hijacking canvas size is messy; replay
          const s=host.getState(); const g=out.getContext('2d');
          g.fillStyle=s.bg; g.fillRect(0,0,w,h);
          let m=0; for (let i=0;i<boundary.length;i++) m=Math.max(m, Math.hypot(boundary[i][0], boundary[i][1]));
          const sc=0.42*Math.min(w,h)/Math.max(m,1), cx=w/2, cy=h/2;
          const lut=U.makeRampLUT(s.palette,null,256);
          g.beginPath();
          for (let i=0;i<boundary.length;i++) { const x=cx+boundary[i][0]*sc, y=cy+boundary[i][1]*sc; if(i===0) g.moveTo(x,y); else g.lineTo(x,y); }
          g.closePath();
          if (s.view!=='outline') { const li=180*3; g.fillStyle='rgb('+lut[li]+','+lut[li+1]+','+lut[li+2]+')'; g.fill(); }
          g.strokeStyle = s.view==='outline' ? U.inkFor(s.bg) : 'rgb('+lut[40*3]+','+lut[40*3+1]+','+lut[40*3+2]+')';
          g.lineWidth=Math.max(0.8,s.lw*Math.min(w,h)/700); g.stroke();
          return U.toBlob(out);
        },
        exportSVG(w,h){
          const s=host.getState(); if(!boundary.length) return null;
          const W=w||1000, H=h||W;
          let m=0; for (let i=0;i<boundary.length;i++) m=Math.max(m, Math.hypot(boundary[i][0], boundary[i][1]));
          const sc=0.44*Math.min(W,H)/Math.max(m,1), cx=W/2, cy=H/2;
          const pal=s.palette||['#111'], ink=pal[0]||'#111', fill=pal[Math.min(pal.length-1,2)]||ink;
          const dOf=arr=>{
            let d=''; for (let i=0;i<arr.length;i++) d+=(i?'L':'M')+(cx+arr[i][0]*sc).toFixed(2)+' '+(cy+arr[i][1]*sc).toFixed(2);
            return d+'Z';
          };
          let body='';
          const lw=Math.max(0.4, s.lw*Math.min(W,H)/900).toFixed(2);
          if (s.view==='age' && rings.length) {
            for (let r=0;r<rings.length;r++) {
              const col=pal[r%pal.length];
              body+='<path fill="none" stroke="'+U.svgEsc(col)+'" stroke-width="'+lw+'" d="'+dOf(rings[r])+'"/>\n';
            }
          }
          if (s.view!=='outline') body+='<path fill="'+U.svgEsc(fill)+'" fill-opacity="'+(s.view==='age'?'0.18':'0.92')+'" stroke="none" d="'+dOf(boundary)+'"/>\n';
          body+='<path fill="none" stroke="'+U.svgEsc(ink)+'" stroke-width="'+lw+'" stroke-linejoin="round" d="'+dOf(boundary)+'"/>';
          return U.svgBlob(W,H,s.bg,body);
        },
      };
    },
  });

  /* ==================== Douady–Couder phyllotaxis ==================== */
  Studio.register({
    id: 'phyllotaxis',
    name: 'Phyllotaxis',
    subtitle: 'Douady–Couder inhibitory field · 1996',
    order: 25,
    equation: 'new primordium at argmin_θ Σᵢ exp(−|x(θ) − xᵢ| / λ) on the meristem ring',
    credit: "S. Douady and Y. Couder, Phys. Rev. Lett. 68, 2098 (1992); J. Theor. Biol. 178, 255 (1996). Primordia appear on a growing disc at the minimum of an inhibitory field left by the previous ones, then ride outward. The divergence angle converges on the golden angle 137.5° for a wide interval of the control parameter, which is how sunflowers count Fibonacci without counting.",
    blurb: 'Every sunflower generator you have seen is Vogel’s formula: points placed at n·137.5°. This is not that. A new bump appears on the meristem ring wherever the inhibition of the old ones is weakest, then the disc grows and they all move out. Fibonacci is not put in. It is what the inhibitory field does. Drag to drop a rogue primordium and watch the lattice forgive it, or not.',
    schema: [
      { group: 'Meristem', key: 'N', label: 'Primordia', type: 'range', kind: GEOM, min: 40, max: 600, step: 10, fmt: String },
      { group: 'Meristem', key: 'lam', label: 'Inhibition λ', type: 'range', kind: GEOM, min: 0.04, max: 0.45, step: 0.01, fmt: f2,
        hint: 'Range of the inhibitory field. This is Douady–Couder’s control parameter. Golden packing lives in the middle.' },
      { group: 'Meristem', key: 'growth', label: 'Growth', type: 'range', kind: GEOM, min: 1.01, max: 1.08, step: 0.001, fmt: f3 },
      { group: 'Meristem', key: 'r0', label: 'Meristem radius', type: 'range', kind: GEOM, min: 0.02, max: 0.12, step: 0.005, fmt: f2 },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['dots','Dots'],['voronoi','Voronoi'],['para','Parastichies']] },
      { group: 'Picture', key: 'size', label: 'Dot size', type: 'range', kind: PAINT, min: 0.4, max: 2.4, step: 0.1, fmt: f1 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
      { group: 'Simulation', key: 'running', label: 'Keep growing', type: 'toggle', kind: LIVE },
    ],
    defaults: { N: 240, lam: 0.11, growth: 1.024, r0: 0.04, view: 'dots', size: 1.1, grain: 0.04, running: false, seed: 'douady-1996' },
    presets: {
      golden: pre('Golden', { lam: 0.14, N: 240, view: 'dots' }, Pal.tram),
      voronoi: pre('Voronoi', { lam: 0.14, N: 180, view: 'voronoi' }, Pal.graphite),
      para: pre('Parastichies', { lam: 0.12, N: 280, view: 'para' }, Pal.ember),
      tight: pre('Tight λ', { lam: 0.08, N: 600, view: 'dots', size: 1.6 }, Pal.meadow),
    },
    hints: { Meristem: 'λ is the only number that matters. Too small: a radial pile-up. Too large: opposite pairs. In between: 137.5° and the Fibonacci spirals.' },
    palette: true, defaultPalette: 'tram', paletteLabel: 'Colors',
    headline: 'lam', headlineLabel: 'λ',
    sanitize(s){ s.N=U.clamp(Math.round(Number(s.N)/10)*10, 20, 800); },
    surprise(rng){ return { N: rng.pick([160,220,300]), lam: rng.range(0.08,0.22), growth: rng.range(1.02,1.045), r0: 0.045, view: rng.pick(['dots','voronoi','para']), size: rng.range(0.8,1.4), grain: rng.pick([0,0.04]), running:false }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let pts=[], divs=[], raf=0, stepCount=0;
      function inhibit(th, r0, lam) {
        let s=0, cx=r0*Math.cos(th), cy=r0*Math.sin(th);
        const eps = lam * lam;
        for (let i=0;i<pts.length;i++) {
          const d2=(cx-pts[i].x)*(cx-pts[i].x)+(cy-pts[i].y)*(cy-pts[i].y);
          s += 1 / (d2 + eps);
        }
        return s;
      }
      function addOne(s) {
        const g=s.growth;
        for (let i=0;i<pts.length;i++) { pts[i].x*=g; pts[i].y*=g; }
        const lam=s.lam, r0=s.r0;
        let best=0, bestV=1e12;
        const samples= 180;
        for (let i=0;i<samples;i++) {
          const th=TAU*i/samples;
          const v=inhibit(th,r0,lam);
          if (v<bestV) { bestV=v; best=th; }
        }
        for (let k=0;k<8;k++) {
          const span=TAU/samples/Math.pow(2,k);
          for (const d of [-span,0,span]) {
            const th=best+d, v=inhibit(th,r0,lam);
            if (v<bestV) { bestV=v; best=th; }
          }
        }
        if (pts.length) {
          let dth = best - pts[pts.length-1].th;
          dth = ((dth+PI)%TAU+TAU)%TAU - PI;
          divs.push(Math.abs(dth)*180/PI);
        }
        pts.push({ x: r0*Math.cos(best), y: r0*Math.sin(best), th: best, age: stepCount });
        stepCount++;
      }
      function build(s) {
        pts=[]; divs=[]; stepCount=0;
        const n=s.N|0;
        for (let i=0;i<n;i++) addOne(s);
      }
      function draw() {
        const s=host.getState();
        const w=canvas.width, h=canvas.height;
        ctx.fillStyle=s.bg; ctx.fillRect(0,0,w,h);
        if (!pts.length) return;
        let m=0; for (let i=0;i<pts.length;i++) m=Math.max(m, Math.hypot(pts[i].x, pts[i].y));
        const sc=0.46*Math.min(w,h)/Math.max(m,1e-3), cx=w/2, cy=h/2;
        const lut=U.makeRampLUT(s.palette,null,256);
        const col=t=>{ const li=((t%1)*255|0)*3; return 'rgb('+(lut[li]|0)+','+(lut[li+1]|0)+','+(lut[li+2]|0)+')'; };
        if (s.view==='voronoi') {
          const img=ctx.createImageData(w,h), bg=U.hexToRgb(s.bg);
          const step=2;
          for (let y=0;y<h;y+=step) for (let x=0;x<w;x+=step) {
            const px=(x-cx)/sc, py=(y-cy)/sc;
            let bd=1e9, bi=0;
            for (let i=0;i<pts.length;i++) {
              const d=(px-pts[i].x)**2+(py-pts[i].y)**2;
              if (d<bd){ bd=d; bi=i; }
            }
            const t=bi/pts.length;
            const li=(t*255|0)*3;
            for (let dy=0;dy<step;dy++) for (let dx=0;dx<step;dx++) {
              const o=((y+dy)*w+x+dx)*4;
              if (x+dx<w && y+dy<h) { img.data[o]=lut[li]; img.data[o+1]=lut[li+1]; img.data[o+2]=lut[li+2]; img.data[o+3]=255; }
            }
          }
          ctx.putImageData(img,0,0);
        } else {
          if (s.view==='para') {
            ctx.lineWidth=Math.max(0.6, Math.min(w,h)/900);
            for (let i=0;i<pts.length;i++) {
              let b1=i, b2=i, d1=1e9, d2=1e9;
              for (let j=0;j<pts.length;j++) if (j!==i) {
                const d=Math.hypot(pts[i].x-pts[j].x, pts[i].y-pts[j].y);
                if (d<d1) { d2=d1; b2=b1; d1=d; b1=j; }
                else if (d<d2) { d2=d; b2=j; }
              }
              ctx.strokeStyle=col(i/pts.length);
              ctx.beginPath();
              ctx.moveTo(cx+pts[i].x*sc, cy+pts[i].y*sc);
              ctx.lineTo(cx+pts[b1].x*sc, cy+pts[b1].y*sc);
              ctx.stroke();
            }
          }
          const r0 = s.size * Math.min(w,h)/220;
          for (let i=0;i<pts.length;i++) {
            ctx.fillStyle=col(i/Math.max(1,pts.length-1));
            ctx.beginPath();
            ctx.arc(cx+pts[i].x*sc, cy+pts[i].y*sc, r0*(0.7+0.6*i/pts.length), 0, TAU);
            ctx.fill();
          }
        }
        grainPut(ctx,w,h,s.grain,s.seed);
      }
      function meanDiv() {
        if (!divs.length) return 0;
        const cut=divs.slice(Math.floor(divs.length*0.4));
        let s=0; for (let i=0;i<cut.length;i++) s+=cut[i];
        return s/cut.length;
      }
      function stop(){ cancelAnimationFrame(raf); raf=0; }
      function frame(){
        raf=0; addOne(host.getState()); draw();
        host.setStatus('<span>N <b>'+pts.length+'</b></span><span>⟨div⟩ <b>'+meanDiv().toFixed(1)+'°</b></span>');
        if (host.getState().running && !host.reducedMotion()) raf=requestAnimationFrame(frame);
      }
      return {
        aspect(){ return 1; },
        regenerate(){
          stop(); build(host.getState()); draw();
          host.setStatus('<span>N <b>'+pts.length+'</b></span><span>⟨div⟩ <b>'+meanDiv().toFixed(1)+'°</b> · golden 137.5</span>');
          if (host.getState().running && !host.reducedMotion()) raf=requestAnimationFrame(frame);
        },
        repaint(){ draw(); },
        live(key){ if(key==='running'){ stop(); if(host.getState().running) raf=requestAnimationFrame(frame); } },
        resize(){ draw(); }, pause(){ stop(); }, resume(){ draw(); if(host.getState().running) raf=requestAnimationFrame(frame); },
        disturb(p){
          const s=host.getState();
          let m=0; for (let i=0;i<pts.length;i++) m=Math.max(m, Math.hypot(pts[i].x,pts[i].y));
          const x=(p.x-0.5)*2*m, y=(p.y-0.5)*2*m;
          pts.push({ x, y, th:Math.atan2(y,x), age:stepCount });
          draw();
        },
        async exportPNG(w,h){
          const out=document.createElement('canvas'); out.width=w; out.height=h;
          const g=out.getContext('2d'); const s=host.getState();
          g.fillStyle=s.bg; g.fillRect(0,0,w,h);
          if(!pts.length) return U.toBlob(out);
          let m=0; for (let i=0;i<pts.length;i++) m=Math.max(m, Math.hypot(pts[i].x,pts[i].y));
          const sc=0.46*Math.min(w,h)/Math.max(m,1e-3), cx=w/2, cy=h/2;
          const lut=U.makeRampLUT(s.palette,null,256);
          const r0=s.size*Math.min(w,h)/220;
          for (let i=0;i<pts.length;i++) {
            const li=((i/Math.max(1,pts.length-1))*255|0)*3;
            g.fillStyle='rgb('+lut[li]+','+lut[li+1]+','+lut[li+2]+')';
            g.beginPath(); g.arc(cx+pts[i].x*sc, cy+pts[i].y*sc, r0*(0.7+0.6*i/pts.length), 0, TAU); g.fill();
          }
          return U.toBlob(out);
        },
        exportSVG(w,h){
          const s=host.getState(); if(!pts.length) return null;
          const W=w||1000, H=h||W;
          let m=0; for (let i=0;i<pts.length;i++) m=Math.max(m, Math.hypot(pts[i].x, pts[i].y));
          const sc=0.46*Math.min(W,H)/Math.max(m,1e-3), cx=W/2, cy=H/2;
          const pal=s.palette||['#111'];
          const r0=s.size*Math.min(W,H)/220;
          let body='';
          if (s.view==='para') {
            const lw=Math.max(0.4, Math.min(W,H)/1100).toFixed(2);
            for (let i=0;i<pts.length;i++) {
              let b1=i, d1=1e9;
              for (let j=0;j<pts.length;j++) if (j!==i) {
                const d=Math.hypot(pts[i].x-pts[j].x, pts[i].y-pts[j].y);
                if (d<d1) { d1=d; b1=j; }
              }
              const col=U.svgEsc(pal[i%pal.length]);
              body+='<line x1="'+(cx+pts[i].x*sc).toFixed(2)+'" y1="'+(cy+pts[i].y*sc).toFixed(2)+'" x2="'+(cx+pts[b1].x*sc).toFixed(2)+'" y2="'+(cy+pts[b1].y*sc).toFixed(2)+'" stroke="'+col+'" stroke-width="'+lw+'"/>\n';
            }
          }
          for (let i=0;i<pts.length;i++) {
            const rr=r0*(0.7+0.6*i/pts.length);
            body+='<circle cx="'+(cx+pts[i].x*sc).toFixed(2)+'" cy="'+(cy+pts[i].y*sc).toFixed(2)+'" r="'+rr.toFixed(2)+'" fill="'+U.svgEsc(pal[i%pal.length])+'" stroke="none"/>\n';
          }
          return U.svgBlob(W,H,s.bg,body);
        },
      };
    },
  });

  /* ==================== Indra's Pearls ==================== */
  Studio.register({
    id: 'pearls',
    name: "Indra's Pearls",
    tab: 'Pearls',
    subtitle: 'Schottky limit set · Mumford–Series–Wright',
    order: 97,
    equation: 'Γ = ⟨a, b⟩  Schottky,   Λ(Γ) = ∩ g∈Γ g(Ĉ \\ Ω)',
    credit: "David Mumford, Caroline Series and David Wright, Indra's Pearls: The Vision of Felix Klein (Cambridge, 2002). A Schottky group is generated by pairing disjoint circles; the limit set is the dust (or curve) left when every complementary disk has been eaten. Nested inversions draw the group without matrices.",
    blurb: 'Four circles, paired. Invert each through the others, again and again, and the plane fills with a necklace of nested pearls. When the circles kiss, the limit set is a curve; when they stand apart it is Cantor dust that still looks like jewelry. This is Klein’s vision as Mumford, Series and Wright drew it — not a fractal toy, a discrete group of Möbius transformations, every circle the image of another.',
    schema: [
      { group: 'Group', key: 'n', label: 'Circles', type: 'seg', kind: GEOM, options: [[3,'3'],[4,'4'],[5,'5'],[6,'6']] },
      { group: 'Group', key: 'gap', label: 'Gap', type: 'range', kind: GEOM, min: 0.02, max: 0.55, step: 0.01, fmt: f2,
        hint: '0 is kissing (limit curve). Larger: Schottky dust.' },
      { group: 'Group', key: 'twist', label: 'Twist', type: 'range', kind: GEOM, min: 0, max: 1, step: 0.01, fmt: f2 },
      { group: 'Group', key: 'depth', label: 'Word length', type: 'range', kind: GEOM, min: 4, max: 12, step: 1, fmt: String },
      { group: 'Picture', key: 'minR', label: 'Smallest pearl', type: 'range', kind: PAINT, min: 0.0004, max: 0.008, step: 0.0002, fmt: f3 },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['stroke','Stroke'],['fill','Fill'],['both','Both']] },
      { group: 'Picture', key: 'lw', label: 'Line weight', type: 'range', kind: PAINT, min: 0.3, max: 2, step: 0.1, fmt: f1 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
    ],
    defaults: { n: 4, gap: 0.08, twist: 0.16, depth: 9, minR: 0.0008, view: 'stroke', lw: 0.65, grain: 0.03, seed: 'indra-2002' },
    presets: {
      necklace: pre('Necklace', { n:4, gap:0.08, twist:0.22, depth:9, view:'stroke' }, Pal.xray),
      kissing: pre('Kissing', { n:4, gap:0.02, twist:0, depth:8, view:'both' }, Pal.graphite),
      dust: pre('Schottky dust', { n:5, gap:0.28, twist:0.35, depth:9, minR:0.0008, view:'fill' }, Pal.ember),
      six: pre('Six generators', { n:6, gap:0.14, twist:0.1, depth:7, view:'stroke' }, Pal.nightshade),
    },
    hints: { Group: 'Gap is the whole phase diagram. Kissing circles make a connected limit set. Twist shears the pairing so the necklace kinks.' },
    palette: true, defaultPalette: 'xray', paletteLabel: 'Inks',
    headline: 'gap', headlineLabel: 'gap',
    surprise(rng){ return { n: rng.pick([3,4,4,5,6]), gap: rng.range(0.03,0.4), twist: rng.range(0,0.6), depth: rng.int(6,10), minR: rng.range(0.0006,0.002), view: rng.pick(['stroke','both']), lw: rng.range(0.5,1.2), grain: rng.pick([0,0.03]) }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let circs=[];
      function invertCirc(c, th) {
        const dx=c.x-th.x, dy=c.y-th.y, d2=dx*dx+dy*dy, den=d2-c.r*c.r;
        if (Math.abs(den)<1e-14) return null;
        const s=th.r*th.r/den;
        const r=Math.abs(c.r*s);
        if (!isFinite(r) || r>8) return null;
        return { x: th.x+dx*s, y: th.y+dy*s, r, g:c.g+1 };
      }
      function build(s) {
        const rng=U.makeRng(s.seed+'/pearls');
        const n=s.n|0, gens=[];
        const R=0.62, r=Math.sin(PI/n)*R*(1-s.gap);
        for (let i=0;i<n;i++) {
          const th=TAU*i/n + s.twist*0.7 + rng()*0.02;
          gens.push({ x: Math.cos(th)*R, y: Math.sin(th)*R, r, g:0 });
        }
        circs=gens.slice();
        const seen=new Set();
        const key=c=> (c.x*2000|0)+','+(c.y*2000|0)+','+(c.r*4000|0);
        const q=gens.slice();
        const minR=s.minR, maxG=s.depth|0;
        while (q.length && circs.length<8000) {
          const c=q.pop();
          if (c.g>=maxG) continue;
          for (let i=0;i<gens.length;i++) {
            const img=invertCirc(c, gens[i]);
            if (!img || img.r<minR) continue;
            const k=key(img); if (seen.has(k)) continue; seen.add(k);
            circs.push(img);
            if (img.g<maxG && circs.length<8000) q.push(img);
          }
        }
      }
      function draw() {
        const s=host.getState();
        const w=canvas.width, h=canvas.height;
        ctx.fillStyle=s.bg; ctx.fillRect(0,0,w,h);
        const sc=0.48*Math.min(w,h), cx=w/2, cy=h/2;
        const pal=s.palette||['#111'];
        ctx.lineJoin='round';
        ctx.lineWidth=Math.max(0.35, s.lw*Math.min(w,h)/1100);
        for (let i=0;i<circs.length;i++) {
          const c=circs[i], col=pal[c.g%pal.length];
          ctx.beginPath(); ctx.arc(cx+c.x*sc, cy+c.y*sc, c.r*sc, 0, TAU);
          if (s.view!=='stroke') { ctx.globalAlpha=s.view==='fill'?0.55:0.18; ctx.fillStyle=col; ctx.fill(); ctx.globalAlpha=1; }
          if (s.view!=='fill') { ctx.strokeStyle=col; ctx.stroke(); }
        }
        grainPut(ctx,w,h,s.grain,s.seed);
      }
      return {
        aspect(){ return 1; },
        regenerate(){ build(host.getState()); draw(); host.setStatus('<span>circles <b>'+circs.length.toLocaleString()+'</b></span><span>gap '+host.getState().gap.toFixed(2)+'</span>'); },
        repaint(){ draw(); }, resize(){ draw(); }, pause(){}, resume(){ draw(); },
        disturb(p){
          circs.push({ x:(p.x-0.5)*2.1, y:(p.y-0.5)*2.1, r:0.04, g:0 });
          draw();
        },
        async exportPNG(w,h){
          const s=host.getState(); const out=document.createElement('canvas'); out.width=w; out.height=h;
          const g=out.getContext('2d'); g.fillStyle=s.bg; g.fillRect(0,0,w,h);
          const sc=0.48*Math.min(w,h), cx=w/2, cy=h/2, pal=s.palette||['#111'];
          g.lineWidth=Math.max(0.35,s.lw*Math.min(w,h)/1100);
          for (let i=0;i<circs.length;i++) {
            const c=circs[i]; g.beginPath(); g.arc(cx+c.x*sc, cy+c.y*sc, c.r*sc, 0, TAU);
            if (s.view!=='stroke') { g.globalAlpha=s.view==='fill'?0.55:0.18; g.fillStyle=pal[c.g%pal.length]; g.fill(); g.globalAlpha=1; }
            if (s.view!=='fill') { g.strokeStyle=pal[c.g%pal.length]; g.stroke(); }
          }
          return U.toBlob(out);
        },
        exportSVG(w,h){
          const s=host.getState(); const W=w||1000, H=h||W;
          const sc=0.48*Math.min(W,H), cx=W/2, cy=H/2, pal=s.palette||['#111'];
          const lw=Math.max(0.25, s.lw*Math.min(W,H)/1100).toFixed(2);
          let body='';
          for (let i=0;i<circs.length;i++) {
            const c=circs[i], col=U.svgEsc(pal[c.g%pal.length]);
            const tag='<circle cx="'+(cx+c.x*sc).toFixed(2)+'" cy="'+(cy+c.y*sc).toFixed(2)+'" r="'+(c.r*sc).toFixed(2)+'"';
            if (s.view==='fill') body+=tag+' fill="'+col+'" fill-opacity="0.55" stroke="none"/>\n';
            else if (s.view==='both') body+=tag+' fill="'+col+'" fill-opacity="0.18" stroke="'+col+'" stroke-width="'+lw+'"/>\n';
            else body+=tag+' fill="none" stroke="'+col+'" stroke-width="'+lw+'"/>\n';
          }
          return U.svgBlob(W,H,s.bg,body);
        },
      };
    },
  });

  /* ==================== Lichtenberg / DBM ==================== */
  Studio.register({
    id: 'lichtenberg',
    name: 'Lichtenberg',
    tab: 'Lichtenberg',
    subtitle: 'dielectric breakdown · Niemeyer–Pietronero–Wiesmann 1984',
    order: 27,
    equation: '∇²φ = 0,   P(i) ∝ φᵢ^η  on the growth interface',
    credit: "L. Niemeyer, L. Pietronero and H. J. Wiesmann, Phys. Rev. Lett. 52, 1033 (1984). The dielectric breakdown model grows a cluster where the harmonic potential of the Laplace equation, raised to η, is the attachment probability. η=1 is DLA; η→∞ is a ballistic needle; lightning lives in between.",
    blurb: 'A spark is a solution of Laplace’s equation that chooses. Hold one electrode at zero, the other at one, and grow the cluster by attaching wherever the field is fiercest — the η-model. Low η is a fat Eden blob; high η is a single needle; around 3 to 5 the figure is a Lichtenberg discharge, the fern of a lightning scar in acrylic. Vector because it is a tree.',
    schema: [
      { group: 'Discharge', key: 'eta', label: 'η', type: 'range', kind: GEOM, min: 0.4, max: 8, step: 0.1, fmt: f1,
        hint: 'η=1 DLA. η≈4 Lichtenberg. η large: a needle.' },
      { group: 'Discharge', key: 'N', label: 'Steps', type: 'range', kind: GEOM, min: 400, max: 6000, step: 100, fmt: String },
      { group: 'Discharge', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[96,'96'],[128,'128'],[160,'160'],[192,'192']] },
      { group: 'Discharge', key: 'seedAt', label: 'Seed', type: 'seg', kind: GEOM, options: [['edge','Edge'],['center','Center']] },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['tree','Tree'],['age','Age'],['field','Potential']] },
      { group: 'Picture', key: 'lw', label: 'Line weight', type: 'range', kind: PAINT, min: 0.4, max: 2.4, step: 0.1, fmt: f1 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
    ],
    defaults: { eta: 4.5, N: 1200, grid: 96, seedAt: 'edge', view: 'tree', lw: 1, grain: 0.04, seed: 'npw-1984' },
    presets: {
      lightning: pre('Lightning η=4', { eta:4, N:2800, view:'tree' }, Pal.ember),
      dla: pre('DLA η=1', { eta:1, N:2400, seedAt:'center', view:'age' }, Pal.graphite),
      needle: pre('Needle η=7', { eta:7, N:1600, view:'tree' }, Pal.xray),
      fern: pre('Fern', { eta:3.2, N:3200, grid:160, view:'age' }, Pal.meadow),
    },
    hints: { Discharge: 'η is the whole look. Grid and steps are resolution. Edge seed is a strike from the ground; center is a bush.' },
    palette: true, defaultPalette: 'ember', paletteLabel: 'Discharge',
    headline: 'eta', headlineLabel: 'η',
    surprise(rng){ return { eta: rng.pick([1, 2, 3.5, 4, 6]), N: rng.pick([1400,2200,3000]), grid: rng.pick([96,128,160]), seedAt: rng.pick(['edge','center']), view: rng.pick(['tree','age']), lw: rng.range(0.7,1.4), grain: rng.pick([0,0.04]) }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let segs=[], G=0, age=null;
      function grow(s) {
        const rng=U.makeRng(s.seed+'/dbm');
        G=s.grid|0; const n=G*G;
        const cl=new Uint8Array(n), phi=new Float64Array(n);
        const parent=new Int32Array(n); parent.fill(-1);
        age=new Int32Array(n); age.fill(-1);
        segs=[];
        phi.fill(1);
        const at=(x,y)=>y*G+x;
        function add(i, p, t){ cl[i]=1; phi[i]=0; parent[i]=p; age[i]=t; if(p>=0) segs.push([p,i]); }
        if (s.seedAt==='center') add(at(G>>1,G>>1), -1, 0);
        else { for (let x=0;x<G;x++) add(at(x,G-1), -1, 0); }
        const eta=s.eta, steps=s.N|0;
        const nb=[[1,0],[-1,0],[0,1],[0,-1]];
        for (let t=1;t<=steps;t++) {
          for (let sw=0;sw<18;sw++) {
            for (let y=1;y<G-1;y++) for (let x=1;x<G-1;x++) {
              const i=at(x,y); if (cl[i]) continue;
              phi[i]=0.25*(phi[i-1]+phi[i+1]+phi[i-G]+phi[i+G]);
            }
            for (let x=0;x<G;x++) if(!cl[x]) phi[x]=1;
          }
          const cand=[], w=[];
          let sum=0;
          for (let y=1;y<G-1;y++) for (let x=1;x<G-1;x++) {
            const i=at(x,y); if (cl[i]) continue;
            let touch=-1;
            for (let k=0;k<4;k++) {
              const j=at(x+nb[k][0], y+nb[k][1]);
              if (cl[j]) { touch=j; break; }
            }
            if (touch<0) continue;
            const ww=Math.pow(Math.max(phi[i],1e-8), eta);
            cand.push(i); w.push(ww); sum+=ww;
          }
          if (!cand.length || sum<=0) break;
          let r=rng()*sum, pick=cand[0], par=-1;
          for (let k=0;k<cand.length;k++) { r-=w[k]; if (r<=0) { pick=cand[k]; break; } }
          const x=pick%G, y=(pick/G)|0;
          for (let k=0;k<4;k++) { const j=at(x+nb[k][0], y+nb[k][1]); if (cl[j]) { par=j; break; } }
          add(pick, par, t);
        }
      }
      function xy(i){ return [((i%G)+0.5)/G, (((i/G)|0)+0.5)/G]; }
      function draw() {
        const s=host.getState(); const w=canvas.width, h=canvas.height;
        ctx.fillStyle=s.bg; ctx.fillRect(0,0,w,h);
        const pal=s.palette||['#111'];
        if (s.view==='field' && age) {
          /* fall through to tree; field is slow to store */
        }
        ctx.lineCap='round'; ctx.lineJoin='round';
        const tmax=Math.max(1, s.N);
        for (let i=0;i<segs.length;i++) {
          const a=xy(segs[i][0]), b=xy(segs[i][1]);
          const t=(age[segs[i][1]]||0)/tmax;
          ctx.strokeStyle=pal[(t*pal.length)|0]||pal[0];
          ctx.lineWidth=Math.max(0.5, s.lw * Math.min(w,h)/700 * (s.view==='age' ? 0.4+0.8*(1-t) : 0.85));
          ctx.beginPath(); ctx.moveTo(a[0]*w,a[1]*h); ctx.lineTo(b[0]*w,b[1]*h); ctx.stroke();
        }
        grainPut(ctx,w,h,s.grain,s.seed);
      }
      return {
        aspect(){ return 1; },
        regenerate(){ const s=host.getState(); grow(s); draw(); host.setStatus('<span>η <b>'+s.eta.toFixed(1)+'</b></span><span>branches <b>'+segs.length.toLocaleString()+'</b></span>'); },
        repaint(){ draw(); }, resize(){ draw(); }, pause(){}, resume(){ draw(); },
        disturb(p){
          if (!G) return;
          const i=Math.min(G-1,Math.max(0,(p.x*G)|0))+Math.min(G-1,Math.max(0,(p.y*G)|0))*G;
          segs.push([i, i]); draw();
        },
        async exportPNG(w,h){
          const s=host.getState(); const out=document.createElement('canvas'); out.width=w; out.height=h;
          const g=out.getContext('2d'); g.fillStyle=s.bg; g.fillRect(0,0,w,h);
          g.lineCap='round'; const pal=s.palette||['#111']; const tmax=Math.max(1,s.N);
          for (let i=0;i<segs.length;i++) {
            const a=xy(segs[i][0]), b=xy(segs[i][1]); const t=(age[segs[i][1]]||0)/tmax;
            g.strokeStyle=pal[(t*pal.length)|0]||pal[0];
            g.lineWidth=Math.max(0.5, s.lw*Math.min(w,h)/700);
            g.beginPath(); g.moveTo(a[0]*w,a[1]*h); g.lineTo(b[0]*w,b[1]*h); g.stroke();
          }
          return U.toBlob(out);
        },
        exportSVG(w,h){
          const s=host.getState(); const W=w||1000, H=h||W;
          const pal=s.palette||['#111']; const tmax=Math.max(1,s.N);
          const lw=Math.max(0.35, s.lw*Math.min(W,H)/900).toFixed(2);
          let body='';
          for (let i=0;i<segs.length;i++) {
            const a=xy(segs[i][0]), b=xy(segs[i][1]); const t=(age[segs[i][1]]||0)/tmax;
            const col=U.svgEsc(pal[(t*pal.length)|0]||pal[0]);
            body+='<line x1="'+(a[0]*W).toFixed(2)+'" y1="'+(a[1]*H).toFixed(2)+'" x2="'+(b[0]*W).toFixed(2)+'" y2="'+(b[1]*H).toFixed(2)+'" stroke="'+col+'" stroke-width="'+lw+'" stroke-linecap="round"/>\n';
          }
          return U.svgBlob(W,H,s.bg,body);
        },
      };
    },
  });

  /* ==================== Talbot carpet ==================== */
  Studio.register({
    id: 'talbot',
    name: 'Talbot carpet',
    tab: 'Talbot',
    subtitle: 'near-field self-imaging · 1836',
    order: 95,
    equation: 'I(x,z) = |Σₙ aₙ exp(i 2π n x/d − i π n² z/z_T)|²,   z_T = 2 d²/λ',
    credit: "H. F. Talbot, Phil. Mag. 9, 401 (1836). A periodic grating, lit coherently, revives as a sharp image at the Talbot distance z_T and as a half-period image at z_T/2. Between, the near field is a carpet of fractional revivals — a plot of I(x,z) is one of the most intricate figures in wave optics.",
    blurb: 'Shine a plane wave through a comb of slits and walk away. At one exact distance the comb comes back, sharp, as if the slits had been printed in the air. Halfway there it comes back shifted. In between, the light is a tapestry of fractional images, a carpet Talbot found with a magnifying glass in 1836. Nothing here is drawn. It is the squared modulus of a finite Fourier sum.',
    schema: [
      { group: 'Grating', key: 'slits', label: 'Periods across', type: 'range', kind: GEOM, min: 2, max: 24, step: 1, fmt: String },
      { group: 'Grating', key: 'fill', label: 'Duty cycle', type: 'range', kind: GEOM, min: 0.08, max: 0.7, step: 0.02, fmt: f2 },
      { group: 'Grating', key: 'orders', label: 'Fourier orders', type: 'range', kind: GEOM, min: 6, max: 40, step: 1, fmt: String },
      { group: 'Grating', key: 'zMax', label: 'Depth in z_T', type: 'range', kind: GEOM, min: 0.5, max: 3, step: 0.1, fmt: f1 },
      { group: 'Picture', key: 'exposure', label: 'Exposure', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'gamma', label: 'Gamma', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
    ],
    defaults: { slits: 8, fill: 0.22, orders: 18, zMax: 1.5, exposure: 1, gamma: 0.85, grain: 0.04, seed: 'talbot-1836' },
    presets: {
      classic: pre('Classic carpet', { slits:8, fill:0.22, orders:20, zMax:2 }, Pal.xray),
      dense: pre('Dense grating', { slits:14, fill:0.12, orders:28, zMax:1.2 }, Pal.thermal),
      binary: pre('Binary 50%', { slits:6, fill:0.5, orders:16, zMax:2 }, Pal.graphite),
      deep: pre('Two revivals', { slits:10, fill:0.18, orders:22, zMax:2.5 }, Pal.glacier),
    },
    hints: { Grating: 'Duty cycle is slit width over period. More Fourier orders, sharper fractional revivals. Depth in units of the Talbot length.' },
    palette: true, defaultPalette: 'xray', paletteLabel: 'Intensity',
    headline: 'slits', headlineLabel: 'slits',
    surprise(rng){ return { slits: rng.int(4,16), fill: rng.range(0.12,0.45), orders: rng.int(12,28), zMax: rng.range(1,2.4), exposure:1, gamma: rng.range(0.7,1.1), grain: rng.pick([0,0.04]) }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      function paint(g, w, h, s) {
        const img=g.createImageData(w,h);
        const lut=U.makeRampLUT(s.palette,s.bg,256);
        const M=s.orders|0, fill=s.fill, P=s.slits, zMax=s.zMax;
        const an=new Float64Array(2*M+1);
        for (let n=-M;n<=M;n++) an[n+M] = n===0 ? fill : Math.sin(n*PI*fill)/(n*PI);
        const rng=U.makeRng(s.seed+'/talbot');
        const jitter=s.grain;
        for (let y=0;y<h;y++) {
          const z=(y/(h-1))*zMax;
          for (let x=0;x<w;x++) {
            const u=(x/(w-1)-0.5)*P;
            let re=0, im=0;
            for (let n=-M;n<=M;n++) {
              const a=an[n+M]; if (!a) continue;
              const ph = TAU*n*u - PI*n*n*z;
              re+=a*Math.cos(ph); im+=a*Math.sin(ph);
            }
            let t=Math.min(1, (re*re+im*im)*s.exposure);
            if (s.gamma!==1) t=Math.pow(t, s.gamma);
            if (jitter) t=U.clamp(t+(rng()-0.5)*jitter*0.25,0,1);
            const li=(t*255|0)*3, o=(y*w+x)*4;
            img.data[o]=lut[li]; img.data[o+1]=lut[li+1]; img.data[o+2]=lut[li+2]; img.data[o+3]=255;
          }
        }
        g.putImageData(img,0,0);
      }
      function draw(){ const s=host.getState(); paint(ctx, canvas.width, canvas.height, s); }
      return {
        aspect(){ return 1.15; },
        regenerate(){ draw(); host.setStatus('<span>slits <b>'+host.getState().slits+'</b></span><span>z ≤ '+host.getState().zMax.toFixed(1)+' z<sub>T</sub></span>'); },
        repaint(){ draw(); }, resize(){ draw(); }, pause(){}, resume(){ draw(); },
        async exportPNG(w,h){ const out=document.createElement('canvas'); out.width=w; out.height=h; paint(out.getContext('2d'),w,h,host.getState()); return U.toBlob(out); },
      };
    },
  });

  /* ==================== Gravner–Griffeath snowflake ==================== */
  const HEX_NBR = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  Studio.register({
    id: 'snowflake',
    name: 'Gravner–Griffeath',
    tab: 'Snowflake',
    subtitle: 'mesoscopic snow crystal · 2008',
    order: 29,
    equation: 'diffusion of vapor on Aᶜ;  freeze κ;  attach by (n, b, α, β, θ);  melt μ, γ',
    credit: "Janko Gravner and David Griffeath, Physica D 237, 385 (2008); Phys. Rev. E 79, 011601 (2009). A hexagonal lattice map with three masses — vapor, quasi-liquid, ice — that combines diffusion-limited aggregation with anisotropic attachment and a quasi-liquid layer. It is the first local model to grow plates, sectored plates, stellar dendrites and ferns that look like Nakaya’s atlas, not like a cartoon star.",
    blurb: 'A snowflake is not a drawing of six lines. Vapor walks in, a film of quasi-liquid sits on the ice, and attachment is picky about how many frozen neighbors you have: one or two needs a lot of film, three needs a quiet neighborhood, four or more fills the notch. That is why real flakes are faceted and branched at once. Gravner and Griffeath wrote it as a lattice map. ρ is how supersaturated the air is. β is how hard a tip must work to grow. The hex grid is the crystal, not a decoration.',
    schema: [
      { group: 'Crystal', key: 'rho', label: 'Vapor ρ', type: 'range', kind: GEOM, min: 0.28, max: 0.72, step: 0.01, fmt: f2,
        hint: 'Background supersaturation. Low ρ: sparse ferns. High ρ: fat plates.' },
      { group: 'Crystal', key: 'beta', label: 'Attachment β', type: 'range', kind: GEOM, min: 0.8, max: 3.2, step: 0.05, fmt: f2,
        hint: 'Threshold for a 1–2 neighbor tip. Low β: branching. High β: facets.' },
      { group: 'Crystal', key: 'alpha', label: 'α (n=3)', type: 'range', kind: GEOM, min: 0.02, max: 0.25, step: 0.01, fmt: f2 },
      { group: 'Crystal', key: 'theta', label: 'θ (n=3 vapor)', type: 'range', kind: GEOM, min: 0.005, max: 0.08, step: 0.005, fmt: f3 },
      { group: 'Crystal', key: 'kappa', label: 'Freeze κ', type: 'range', kind: GEOM, min: 0.001, max: 0.12, step: 0.001, fmt: f3 },
      { group: 'Crystal', key: 'mu', label: 'Melt μ', type: 'range', kind: GEOM, min: 0, max: 0.12, step: 0.005, fmt: f3 },
      { group: 'Crystal', key: 'R', label: 'Hex radius', type: 'range', kind: GEOM, min: 40, max: 110, step: 2, fmt: String },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['ice','Ice'],['mass','Mass'],['vapor','Vapor']] },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
      { group: 'Simulation', key: 'running', label: 'Keep growing', type: 'toggle', kind: LIVE },
    ],
    defaults: { rho: 0.40, beta: 1.35, alpha: 0.08, theta: 0.025, kappa: 0.005, mu: 0.015, R: 72, view: 'ice', grain: 0.04, running: true, seed: 'gravner-2008' },
    presets: {
      dendrite: pre('Stellar dendrite', { rho:0.42, beta:1.3, kappa:0.004, mu:0.02, R:72 }, Pal.glacier),
      fern: pre('Fern', { rho:0.32, beta:1.1, kappa:0.003, mu:0.02, R:80 }, Pal.xray),
      plate: pre('Plate', { rho:0.58, beta:2.6, kappa:0.05, alpha:0.12, R:64 }, Pal.graphite),
      sectored: pre('Sectored plate', { rho:0.48, beta:1.9, alpha:0.1, kappa:0.01, R:70 }, Pal.harbor),
      stellar: pre('Stellar', { rho:0.36, beta:1.45, kappa:0.004, R:78 }, Pal.nightshade),
    },
    hints: { Crystal: 'ρ and β are the whole Nakaya diagram. Low ρ + low β: ferns. High ρ + high β: plates. κ is how fast vapor freezes at the film. The hex grid is the ice lattice.' },
    palette: true, defaultPalette: 'glacier', paletteLabel: 'Ice',
    headline: 'rho', headlineLabel: 'ρ',
    sanitize(s){ s.R=U.clamp(Math.round(Number(s.R)/2)*2, 32, 120); },
    surprise(rng){ return { rho: rng.range(0.32,0.58), beta: rng.range(1.05,2.6), alpha: rng.range(0.05,0.14), theta: 0.025, kappa: rng.range(0.003,0.04), mu: rng.range(0.005,0.08), R: rng.pick([64,72,80]), view:'ice', grain: rng.pick([0,0.04]), running:true }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let R=0, W=0, a,b,c,d0,d1,age, iceN=0, stepN=0, raf=0, hitWall=false;
      const NBR=HEX_NBR;
      function id(q,r){ return (r+R)*W+(q+R); }
      function ok(q,r){ return Math.max(Math.abs(q), Math.abs(r), Math.abs(-q-r)) <= R; }
      function init(s) {
        R=s.R|0; W=2*R+1;
        const n=W*W;
        a=new Uint8Array(n); b=new Float32Array(n); c=new Float32Array(n);
        d0=new Float32Array(n); d1=new Float32Array(n); age=new Int32Array(n);
        iceN=0; stepN=0; hitWall=false;
        const rho=s.rho;
        for (let r=-R;r<=R;r++) for (let q=-R;q<=R;q++) if (ok(q,r)) d0[id(q,r)]=rho;
        const i0=id(0,0); a[i0]=1; c[i0]=1; d0[i0]=0; age[i0]=0; iceN=1;
      }
      function nIce(q,r) {
        let n=0;
        for (let k=0;k<6;k++) { const q2=q+NBR[k][0], r2=r+NBR[k][1]; if (ok(q2,r2) && a[id(q2,r2)]) n++; }
        return n;
      }
      function vaporNear(q,r) {
        let s=d0[id(q,r)];
        for (let k=0;k<6;k++) {
          const q2=q+NBR[k][0], r2=r+NBR[k][1];
          s += ok(q2,r2) ? d0[id(q2,r2)] : host.getState().rho;
        }
        return s;
      }
      function stepOnce(s) {
        if (hitWall) return;
        const rho=s.rho, kappa=s.kappa, mu=s.mu, beta=s.beta, alpha=s.alpha, theta=s.theta;
        const gamma=0.00005;
        for (let r=-R;r<=R;r++) for (let q=-R;q<=R;q++) {
          if (!ok(q,r)) continue;
          const i=id(q,r);
          if (a[i]) { d1[i]=0; continue; }
          if (Math.max(Math.abs(q),Math.abs(r),Math.abs(-q-r))===R) { d1[i]=rho; continue; }
          let sm=d0[i];
          for (let k=0;k<6;k++) {
            const q2=q+NBR[k][0], r2=r+NBR[k][1];
            if (!ok(q2,r2)) { sm+=rho; continue; }
            const j=id(q2,r2);
            sm += a[j] ? 0 : d0[j];
          }
          d1[i]=sm/7;
        }
        const tmp=d0; d0=d1; d1=tmp;
        const boundary=[];
        for (let r=-R+1;r<=R-1;r++) for (let q=-R+1;q<=R-1;q++) {
          if (!ok(q,r)) continue;
          const i=id(q,r); if (a[i]) continue;
          const n=nIce(q,r); if (!n) continue;
          const vap=vaporNear(q,r);
          const dd=d0[i];
          b[i] += (1-kappa)*dd;
          c[i] += kappa*dd;
          d0[i] = 0;
          boundary.push(i, n, vap);
        }
        const attach=[];
        for (let k=0;k<boundary.length;k+=3) {
          const i=boundary[k], n=boundary[k+1], vap=boundary[k+2];
          let yes=false;
          if (n>=4) yes=true;
          else if (n===3) yes = (b[i]>=1) || (b[i]>=alpha && vap<theta);
          else yes = b[i]>=beta;
          if (yes) attach.push(i);
        }
        for (let k=0;k<attach.length;k++) {
          const i=attach[k];
          if (a[i]) continue;
          a[i]=1; c[i]+=b[i]; b[i]=0; d0[i]=0; age[i]=stepN; iceN++;
        }
        for (let k=0;k<boundary.length;k+=3) {
          const i=boundary[k];
          if (a[i]) continue;
          d0[i] += mu*b[i] + gamma*c[i];
          b[i] *= (1-mu);
          c[i] *= (1-gamma);
        }
        stepN++;
        if (a[id(R-2,0)] || a[id(2-R,0)] || a[id(0,R-2)] || a[id(0,2-R)]) hitWall=true;
      }
      function run(s, n, ms) {
        const t0=performance.now();
        let k=0;
        while (k<n && !hitWall && performance.now()-t0 < (ms||40)) { stepOnce(s); k++; }
        return k;
      }
      function paintTo(g, w, h) {
        const s=host.getState();
        g.fillStyle=s.bg; g.fillRect(0,0,w,h);
        if (!W) return;
        const size=0.92*Math.min(w,h)/(Math.sqrt(3)*(2*R+1));
        const cx=w/2, cy=h/2;
        const lut=U.makeRampLUT(s.palette,s.bg,256);
        g.lineJoin='round';
        for (let r=-R;r<=R;r++) for (let q=-R;q<=R;q++) {
          if (!ok(q,r)) continue;
          const i=id(q,r);
          const ice=a[i];
          if (s.view==='vapor' && ice) continue;
          if (s.view!=='vapor' && !ice) continue;
          const x=cx+size*(Math.sqrt(3)*q + Math.sqrt(3)/2*r);
          const y=cy+size*(1.5*r);
          let t;
          if (s.view==='mass') t=U.clamp(c[i]/1.6,0,1);
          else if (s.view==='vapor') t=U.clamp(d0[i]/Math.max(0.01,s.rho),0,1);
          else t=U.clamp(0.35+0.65*(age[i]/(stepN||1)),0,1);
          const li=(t*255|0)*3;
          g.fillStyle='rgb('+lut[li]+','+lut[li+1]+','+lut[li+2]+')';
          g.beginPath();
          for (let k=0;k<6;k++) {
            const ang=Math.PI/6 + k*Math.PI/3;
            const px=x+size*1.02*Math.cos(ang), py=y+size*1.02*Math.sin(ang);
            if (k===0) g.moveTo(px,py); else g.lineTo(px,py);
          }
          g.closePath(); g.fill();
        }
        grainPut(g,w,h,s.grain,s.seed);
      }
      function draw(){ paintTo(ctx, canvas.width, canvas.height); }
      function stop(){ cancelAnimationFrame(raf); raf=0; }
      function frame(){
        raf=0; const s=host.getState();
        run(s, 12, 28); draw();
        host.setStatus('<span>ice <b>'+iceN.toLocaleString()+'</b></span><span>step '+stepN+(hitWall?' · rim': '')+'</span>');
        if (s.running && !hitWall && !host.reducedMotion()) raf=requestAnimationFrame(frame);
      }
      return {
        aspect(){ return 1; },
        regenerate(){
          stop(); const s=host.getState(); init(s);
          const warm = host.reducedMotion() ? 200 : 700;
          run(s, warm, 900); draw();
          host.setStatus('<span>ice <b>'+iceN.toLocaleString()+'</b></span><span>step '+stepN+'</span>');
          if (s.running && !hitWall && !host.reducedMotion()) raf=requestAnimationFrame(frame);
        },
        repaint(){ draw(); },
        live(key){ if (key==='running') { stop(); if (host.getState().running) raf=requestAnimationFrame(frame); } },
        resize(){ draw(); }, pause(){ stop(); }, resume(){ draw(); if (host.getState().running && !hitWall) raf=requestAnimationFrame(frame); },
        disturb(p){
          if (!W) return;
          const size=0.92*Math.min(canvas.width,canvas.height)/(Math.sqrt(3)*(2*R+1));
          const x=(p.x-0.5)*canvas.width, y=(p.y-0.5)*canvas.height;
          const qf = (Math.sqrt(3)/3*x - 1/3*y)/size;
          const rf = (2/3*y)/size;
          const q=Math.round(qf), r=Math.round(rf);
          if (!ok(q,r)) return;
          const i=id(q,r); if (a[i]) return;
          a[i]=1; c[i]+=b[i]+0.8; b[i]=0; d0[i]=0; age[i]=stepN; iceN++;
          draw();
        },
        async exportPNG(w,h){
          const out=document.createElement('canvas'); out.width=w; out.height=h;
          paintTo(out.getContext('2d'), w, h);
          return U.toBlob(out);
        },
        exportSVG(w,h){
          const s=host.getState(); if (!W) return null;
          const Wout=w||1000, Hout=h||Wout;
          const size=0.92*Math.min(Wout,Hout)/(Math.sqrt(3)*(2*R+1));
          const cx=Wout/2, cy=Hout/2;
          const pal=s.palette||['#e8f4ff'];
          let body='';
          for (let r=-R;r<=R;r++) for (let q=-R;q<=R;q++) {
            if (!ok(q,r)) continue;
            const i=id(q,r); if (!a[i]) continue;
            const x=cx+size*(Math.sqrt(3)*q + Math.sqrt(3)/2*r);
            const y=cy+size*(1.5*r);
            const col=U.svgEsc(pal[Math.min(pal.length-1, (age[i]*pal.length/(stepN||1))|0)]||pal[0]);
            let d='';
            for (let k=0;k<6;k++) {
              const ang=Math.PI/6 + k*Math.PI/3;
              d+=(k?'L':'M')+(x+size*1.02*Math.cos(ang)).toFixed(2)+' '+(y+size*1.02*Math.sin(ang)).toFixed(2);
            }
            body+='<path d="'+d+'Z" fill="'+col+'" stroke="none"/>\n';
          }
          return U.svgBlob(Wout,Hout,s.bg,body);
        },
      };
    },
  });

  /* ==================== Lifshitz–Petrich 12-fold ==================== */
  function fftRadix2(re, im, n, inv) {
    for (let i=1,j=0;i<n;i++) {
      let bit=n>>1;
      for (; j&bit; bit>>=1) j^=bit;
      j^=bit;
      if (i<j) { let t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; }
    }
    for (let len=2; len<=n; len<<=1) {
      const ang=(inv?-2:2)*Math.PI/len, wlenRe=Math.cos(ang), wlenIm=Math.sin(ang);
      for (let i=0;i<n;i+=len) {
        let wr=1, wi=0;
        const h=len>>1;
        for (let j=0;j<h;j++) {
          const p=i+j, q=p+h;
          const vRe=re[q]*wr - im[q]*wi, vIm=re[q]*wi + im[q]*wr;
          re[q]=re[p]-vRe; im[q]=im[p]-vIm;
          re[p]+=vRe; im[p]+=vIm;
          const nwr=wr*wlenRe - wi*wlenIm;
          wi=wr*wlenIm + wi*wlenRe; wr=nwr;
        }
      }
    }
    if (inv) { const invn=1/n; for (let i=0;i<n;i++) { re[i]*=invn; im[i]*=invn; } }
  }
  function fft2(re, im, n, inv, rowRe, rowIm) {
    for (let y=0;y<n;y++) {
      rowRe.set(re.subarray(y*n, y*n+n));
      rowIm.set(im.subarray(y*n, y*n+n));
      fftRadix2(rowRe, rowIm, n, inv);
      re.set(rowRe, y*n); im.set(rowIm, y*n);
    }
    for (let x=0;x<n;x++) {
      for (let y=0;y<n;y++) { rowRe[y]=re[y*n+x]; rowIm[y]=im[y*n+x]; }
      fftRadix2(rowRe, rowIm, n, inv);
      for (let y=0;y<n;y++) { re[y*n+x]=rowRe[y]; im[y*n+x]=rowIm[y]; }
    }
  }
  Studio.register({
    id: 'lp',
    name: 'Lifshitz–Petrich',
    tab: '12-fold',
    subtitle: 'two-scale quasicrystal · 1997',
    order: 57.9,
    equation: '∂tψ = εψ − (∇²+1)²(∇²+q²)²ψ + α ψ² − ψ³,   q = 2 cos(π/12)',
    credit: "Ron Lifshitz and Dean M. Petrich, Phys. Rev. Lett. 79, 1261 (1997). Faraday waves with two frequencies impose two length scales. The free energy with operator (∇²+1)²(∇²+q²)² and a quadratic term is enough to stabilize a dodecagonal quasicrystal when q = 2 cos(π/12) ≈ 1.932. Hexagons and stripes are the other ground states. This plate is a semi-implicit spectral integration of that PDE.",
    blurb: 'One length scale makes stripes or hexagons. Two, in the right ratio, make a tiling that never repeats and still has twelve-fold order — a quasicrystal you can grow from noise. Lifshitz and Petrich wrote Faraday’s two-frequency experiment as a free energy. The quadratic term is three-body physics in disguise: without it you get stripes; with it the 12-fold can win. q is not a decoration. It is 2 cos(π/12), the chord of a dodecagon.',
    schema: [
      { group: 'Scales', key: 'fold', label: 'Ratio q', type: 'seg', kind: GEOM, wrap: true,
        options: [['12','12-fold'],['10','10-fold'],['8','8-fold'],['hex','Hex']] },
      { group: 'Scales', key: 'eps', label: 'ε', type: 'range', kind: LIVE, min: 0.05, max: 0.8, step: 0.01, fmt: f2,
        hint: 'Distance above onset. Too small: slow. Too large: defect soup.' },
      { group: 'Scales', key: 'alpha', label: 'Quadratic α', type: 'range', kind: LIVE, min: 0, max: 2.2, step: 0.05, fmt: f2,
        hint: 'Three-body term. α=0: stripes. α large: 12-fold and hexagons can lock in.' },
      { group: 'Scales', key: 'waves', label: 'Waves across', type: 'range', kind: GEOM, min: 6, max: 22, step: 1, fmt: String },
      { group: 'Scales', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[128,'128'],[256,'256'],[384,'384'],[512,'512'],[768,'768']] },
      { group: 'Seeding', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, options: [['twelve','12-fold'],['noise','Noise'],['hex','Hex']] },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['field','Field'],['abs','|ψ|'],['shade','Relief']] },
      { group: 'Picture', key: 'exposure', label: 'Exposure', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'gamma', label: 'Gamma', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: pct },
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      { group: 'Simulation', key: 'dt', label: 'Time step', type: 'range', kind: LIVE, min: 0.15, max: 1.2, step: 0.05, fmt: f2 },
    ],
    defaults: { fold:'12', eps:0.32, alpha:1.1, waves:12, grid:128, init:'twelve', view:'field', exposure:1, gamma:1, grain:0.04, running:true, dt:0.45, seed:'lifshitz-1997' },
    presets: {
      dodec: pre('Dodecagonal', { fold:'12', eps:0.32, alpha:1.15, init:'twelve', waves:12 }, Pal.nightshade),
      noisy: pre('From noise', { fold:'12', eps:0.4, alpha:1.3, init:'noise', waves:14 }, Pal.thermal),
      dec: pre('Decagonal q', { fold:'10', eps:0.35, alpha:1.2, init:'twelve', waves:12 }, Pal.ember),
      hex: pre('Two-scale hex', { fold:'hex', eps:0.28, alpha:0.9, init:'hex', waves:10 }, Pal.harbor),
      stripes: pre('Stripes α=0', { fold:'12', alpha:0, eps:0.35, init:'noise', view:'abs' }, Pal.graphite),
    },
    hints: { Scales: 'q is the whole point. 12-fold is 2 cos(π/12). α is whether three-body terms can beat stripes. Waves across is how many of the short scale fit on the plate.' },
    palette: true, defaultPalette: 'nightshade', paletteLabel: 'Density',
    headline: 'eps', headlineLabel: 'ε',
    sanitize(s){ s.grid = Number(s.grid)>=256 ? 256 : 128; },
    surprise(rng){ return { fold: rng.pick(['12','12','12','10','hex']), eps: rng.range(0.22,0.5), alpha: rng.pick([0, 0.8, 1.1, 1.4]), waves: rng.int(8,16), grid: rng.pick([128,128,256]), init: rng.pick(['twelve','noise']), view:'field', exposure:1, gamma: rng.range(0.85,1.15), grain: rng.pick([0,0.04]), running:true, dt:0.45 }; },
    create(host) {
      const canvas=host.canvas, ctx=canvas.getContext('2d');
      let N=0, psi, nRe, nIm, pRe, pIm, rowRe, rowIm, op, stepN=0, raf=0;
      function qOf(fold) {
        if (fold==='10') return 2*Math.cos(Math.PI/5);
        if (fold==='8') return 2*Math.cos(Math.PI/8);
        if (fold==='hex') return Math.sqrt(3);
        return 2*Math.cos(Math.PI/12);
      }
      function alloc(n) {
        N=n; const m=n*n;
        psi=new Float64Array(m); nRe=new Float64Array(m); nIm=new Float64Array(m);
        pRe=new Float64Array(m); pIm=new Float64Array(m);
        rowRe=new Float64Array(n); rowIm=new Float64Array(n); op=new Float64Array(m);
      }
      function buildOp(s) {
        const q=qOf(s.fold), waves=Math.max(4, s.waves|0);
        for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
          const nx = x<=N/2 ? x : x-N, ny = y<=N/2 ? y : y-N;
          const k2 = (nx*nx + ny*ny) / (waves*waves);
          const L = -k2;
          const a = L+1, b = L+q*q;
          op[y*N+x] = a*a*b*b;
        }
      }
      function seedField(s) {
        const rng=U.makeRng(s.seed+'/lp');
        const waves=Math.max(4,s.waves|0);
        const k1=2*Math.PI*waves/N, q=qOf(s.fold);
        for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
          let u=(rng()*2-1)*0.08;
          if (s.init!=='noise') {
            const nfold = s.init==='hex' ? 6 : 12;
            for (let m=0;m<nfold;m++) {
              const a=m*Math.PI/(nfold/2);
              const ph=rng.range(0,0.4);
              u += 0.12*Math.cos(k1*(x*Math.cos(a)+y*Math.sin(a))+ph);
              u += 0.08*Math.cos(k1*q*(x*Math.cos(a)+y*Math.sin(a))-ph);
            }
          }
          psi[y*N+x]=u;
        }
      }
      function stepOnce(s) {
        const dt=s.dt, eps=s.eps, al=s.alpha, m=N*N;
        for (let i=0;i<m;i++) {
          const u=psi[i];
          nRe[i]= al*u*u - u*u*u;
          nIm[i]=0;
          pRe[i]=u; pIm[i]=0;
        }
        fft2(pRe,pIm,N,false,rowRe,rowIm);
        fft2(nRe,nIm,N,false,rowRe,rowIm);
        for (let i=0;i<m;i++) {
          const den=1 + dt*(op[i]-eps);
          pRe[i]=(pRe[i] + dt*nRe[i])/den;
          pIm[i]=(pIm[i] + dt*nIm[i])/den;
        }
        fft2(pRe,pIm,N,true,rowRe,rowIm);
        for (let i=0;i<m;i++) psi[i]=U.clamp(pRe[i], -3, 3);
        stepN++;
      }
      function paint() {
        const s=host.getState();
        const w=canvas.width, h=canvas.height;
        if (!N) { ctx.fillStyle=s.bg; ctx.fillRect(0,0,w,h); return; }
        const img=ctx.createImageData(w,h);
        const lut=U.makeRampLUT(s.palette,s.bg,256);
        let mn=1e9, mx=-1e9;
        for (let i=0;i<psi.length;i++) { const u=psi[i]; if (u<mn) mn=u; if (u>mx) mx=u; }
        const den=Math.max(1e-6, mx-mn);
        for (let y=0;y<h;y++) {
          const gy=Math.min(N-1, (y*N/h)|0);
          for (let x=0;x<w;x++) {
            const gx=Math.min(N-1, (x*N/w)|0);
            const i=gy*N+gx, u=psi[i];
            let t;
            if (s.view==='abs') t=U.clamp(Math.abs(u)*s.exposure,0,1);
            else if (s.view==='shade') {
              const ux=psi[gy*N+((gx+1)%N)]-u, uy=psi[((gy+1)%N)*N+gx]-u;
              t=U.clamp(0.5 + 0.5*(u/den) + 0.35*(-ux*0.6+uy), 0, 1);
            } else t=U.clamp(((u-mn)/den)*s.exposure,0,1);
            if (s.gamma!==1) t=Math.pow(t,s.gamma);
            const li=(t*255|0)*3, o=(y*w+x)*4;
            img.data[o]=lut[li]; img.data[o+1]=lut[li+1]; img.data[o+2]=lut[li+2]; img.data[o+3]=255;
          }
        }
        ctx.putImageData(img,0,0);
        grainPut(ctx,w,h,s.grain,s.seed);
      }
      function rms() {
        let s=0; for (let i=0;i<psi.length;i++) s+=psi[i]*psi[i];
        return Math.sqrt(s/psi.length);
      }
      function stop(){ cancelAnimationFrame(raf); raf=0; }
      function frame(){
        raf=0; const s=host.getState();
        stepOnce(s); paint();
        if (stepN%8===0) host.setStatus('<span>q '+qOf(s.fold).toFixed(3)+'</span><span>ε '+s.eps.toFixed(2)+'</span><span>rms '+rms().toFixed(3)+'</span><span>step '+stepN+'</span>');
        if (s.running && !host.reducedMotion()) raf=requestAnimationFrame(frame);
      }
      return {
        aspect(){ return 1; },
        regenerate(){
          stop(); const s=host.getState();
          alloc(s.grid>=256?256:128);
          buildOp(s); seedField(s); stepN=0;
          const warm=host.reducedMotion()?8:90;
          for (let i=0;i<warm;i++) stepOnce(s);
          paint();
          host.setStatus('<span>q '+qOf(s.fold).toFixed(3)+'</span><span>ε '+s.eps.toFixed(2)+'</span><span>rms '+rms().toFixed(3)+'</span>');
          if (s.running && !host.reducedMotion()) raf=requestAnimationFrame(frame);
        },
        repaint(){ paint(); },
        live(key){ if (key==='running') { stop(); if (host.getState().running) raf=requestAnimationFrame(frame); } else if (N) { buildOp(host.getState()); } },
        resize(){ paint(); }, pause(){ stop(); }, resume(){ paint(); if (host.getState().running) raf=requestAnimationFrame(frame); },
        disturb(p){
          if (!N) return;
          const gx=(p.x*N)|0, gy=(p.y*N)|0, rad=6;
          for (let dy=-rad;dy<=rad;dy++) for (let dx=-rad;dx<=rad;dx++) {
            if (dx*dx+dy*dy>rad*rad) continue;
            const x=(gx+dx+N)%N, y=(gy+dy+N)%N;
            psi[y*N+x]+=0.8*(1-(dx*dx+dy*dy)/(rad*rad));
          }
          paint();
        },
        async exportPNG(w,h){
          const s=host.getState(); const out=document.createElement('canvas'); out.width=w; out.height=h;
          const g=out.getContext('2d'); const img=g.createImageData(w,h);
          const lut=U.makeRampLUT(s.palette,s.bg,256);
          let mn=1e9, mx=-1e9; for (let i=0;i<psi.length;i++) { const u=psi[i]; if(u<mn)mn=u; if(u>mx)mx=u; }
          const den=Math.max(1e-6,mx-mn);
          for (let y=0;y<h;y++) {
            const gy=Math.min(N-1,(y*N/h)|0);
            for (let x=0;x<w;x++) {
              const gx=Math.min(N-1,(x*N/w)|0);
              let t=((psi[gy*N+gx]-mn)/den)*s.exposure; t=U.clamp(t,0,1);
              if (s.gamma!==1) t=Math.pow(t,s.gamma);
              const li=(t*255|0)*3, o=(y*w+x)*4;
              img.data[o]=lut[li]; img.data[o+1]=lut[li+1]; img.data[o+2]=lut[li+2]; img.data[o+3]=255;
            }
          }
          g.putImageData(img,0,0); return U.toBlob(out);
        },
      };
    },
  });
})();
