
/* shared/studio.js */
/* GENChase — shared shell. Modules call Studio.register({...}); see tools/modules/CONTRACT.md. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  /* ================================================================
     util
  ================================================================ */
  function makeRng(seedStr) {
    seedStr = String(seedStr);
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    const s = [];
    for (let i = 0; i < 4; i++) {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      s.push(h >>> 0);
    }
    let [a, b, c, d] = s;
    const rng = function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
    for (let i = 0; i < 12; i++) rng();
    rng.range = (lo, hi) => lo + rng() * (hi - lo);
    rng.int = (lo, hi) => Math.floor(lo + rng() * (hi - lo + 1));
    rng.pick = arr => arr[Math.floor(rng() * arr.length)];
    rng.gauss = () => { const u = 1 - rng(), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
    return rng;
  }

  function makeNoise(rng) {
    const perm = new Uint8Array(512);
    const base = [];
    for (let i = 0; i < 256; i++) base.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = base[i]; base[i] = base[j]; base[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    function grad(h, x, y) {
      switch (h & 7) {
        case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
        case 4: return x * 1.4142; case 5: return -x * 1.4142; case 6: return y * 1.4142; default: return -y * 1.4142;
      }
    }
    function n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const X = xi & 255, Y = yi & 255;
      x -= xi; y -= yi;
      const u = fade(x), v = fade(y);
      const A = perm[X] + Y, B = perm[X + 1] + Y;
      return lerp(
        lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
        lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
        v) * 0.9;
    }
    function fbm(x, y, oct, lac, gain) {
      oct = oct || 3; lac = lac || 2; gain = gain == null ? 0.5 : gain;
      let sum = 0, amp = 1, norm = 0, f = 1;
      for (let o = 0; o < oct; o++) {
        sum += n2(x * f + o * 31.7, y * f - o * 17.3) * amp;
        norm += amp; amp *= gain; f *= lac;
      }
      return sum / norm;
    }
    return { n2, fbm, perm };
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    if (s === 0) { const v = l * 255; return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function hslToHex(h, s, l) { const c = hslToRgb(h, s, l); return rgbToHex(c[0], c[1], c[2]); }
  function luminance(hex) { const c = hexToRgb(hex); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function isLight(hex) { return luminance(hex) > 128; }
  function inkFor(bg) { return isLight(bg) ? '#141008' : '#F5F0E8'; }
  function inkRgba(bg, a) { return isLight(bg) ? 'rgba(20,16,8,' + a + ')' : 'rgba(245,240,232,' + a + ')'; }
  // sRGB is a display encoding, not a measure of light: the byte 128 is about 21.6% of the light of
  // the byte 255, not half of it. Mixing two colors by averaging their bytes therefore lands well
  // below the true midpoint, which is why a blend between two saturated hues goes dark and muddy
  // through the middle instead of passing through a bright mixture. Undo the encoding, mix the
  // light, put the encoding back. Constants are the sRGB transfer function (IEC 61966-2-1).
  const srgbToLinear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const linearToSrgb = v => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055);
  const mixLinear = (A, B, t) => [
    linearToSrgb(lerp(srgbToLinear(A[0]), srgbToLinear(B[0]), t)),
    linearToSrgb(lerp(srgbToLinear(A[1]), srgbToLinear(B[1]), t)),
    linearToSrgb(lerp(srgbToLinear(A[2]), srgbToLinear(B[2]), t)),
  ];
  function mixHex(a, b, t) {
    const c = mixLinear(hexToRgb(a), hexToRgb(b), t);
    return rgbToHex(c[0], c[1], c[2]);
  }
  // A color ramp through the palette: ramp(t) for t in [0,1] -> [r,g,b] (0..255 floats).
  // Pass bg to start the ramp from the background (useful for density maps).
  function makeRamp(colors, bg) {
    const stops = (bg ? [bg] : []).concat(colors).map(hexToRgb);
    const n = stops.length;
    if (n === 1) return () => stops[0].slice();
    // Interpolated in linear light, so the midpoint between two stops is the color that actually
    // sits halfway between them rather than the one whose byte values do.
    const lin = stops.map(c => [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2])]);
    return function (t) {
      t = clamp(t, 0, 1) * (n - 1);
      const i = Math.min(n - 2, Math.floor(t)), f = t - i;
      const A = lin[i], B = lin[i + 1];
      return [linearToSrgb(lerp(A[0], B[0], f)), linearToSrgb(lerp(A[1], B[1], f)), linearToSrgb(lerp(A[2], B[2], f))];
    };
  }
  // 256-entry lookup table version for hot loops: Uint8ClampedArray of rgb triples
  function makeRampLUT(colors, bg, size) {
    size = size || 256;
    const ramp = makeRamp(colors, bg);
    const lut = new Uint8ClampedArray(size * 3);
    for (let i = 0; i < size; i++) { const c = ramp(i / (size - 1)); lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2]; }
    return lut;
  }
  function toBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('toBlob failed')),
      type || 'image/png',
      quality
    ));
  }
  function svgEsc(s) {
    return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/"/g, '"');
  }
  function svgDoc(w, h, bg, body) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      w + ' ' + h + '" width="' + w + '" height="' + h + '">\n<rect width="100%" height="100%" fill="' +
      svgEsc(bg || '#ffffff') + '"/>\n' + body + '\n</svg>';
  }
  function svgBlob(w, h, bg, body) {
    return new Blob([svgDoc(w, h, bg, body)], { type: 'image/svg+xml' });
  }
  // Scale a source canvas onto a new canvas of pixel size w x h (smooth or nearest)
  function upscale(src, w, h, smooth) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = smooth !== false;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    return c;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const util = { TAU, makeRng, makeNoise, clamp, lerp, smoothstep, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, luminance, isLight, inkFor, inkRgba, mixHex, makeRamp, makeRampLUT, toBlob, upscale, escapeHtml, svgEsc, svgDoc, svgBlob };

  /* ================================================================
     gl — small WebGL2 helper for fullscreen-pass simulations
  ================================================================ */
  const QUAD_VS = `#version 300 es
  in vec2 a_pos; out vec2 v_uv;
  void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const glContexts = new WeakMap();
  function createGL(canvas, opts) {
    const gl = canvas.getContext('webgl2', Object.assign({ antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false }, opts || {}));
    if (!gl) return null;
    glContexts.set(canvas, gl);
    gl.floatExt = gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    // shared fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.__quad = buf;
    return gl;
  }
  function compile(gl, vs, fs) {
    function sh(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        throw new Error('Shader compile error: ' + log + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
      }
      return s;
    }
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs || QUAD_VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Program link error: ' + gl.getProgramInfoLog(p));
    return p;
  }
  // A fullscreen fragment pass. pass.draw(target, uniforms) where target is null (screen) or a Target.
  class Pass {
    constructor(gl, fs) {
      this.gl = gl;
      this.prog = compile(gl, QUAD_VS, fs);
      this.loc = {};
      this.aPos = gl.getAttribLocation(this.prog, 'a_pos');
    }
    u(name) { if (!(name in this.loc)) this.loc[name] = this.gl.getUniformLocation(this.prog, name); return this.loc[name]; }
    draw(target, uniforms) {
      const gl = this.gl;
      gl.useProgram(this.prog);
      if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.viewport(0, 0, target.w, target.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); }
      let unit = 0;
      for (const k in (uniforms || {})) {
        const v = uniforms[k], loc = this.u(k);
        if (loc == null) continue;
        if (v && v.tex !== undefined) {          // a Target or {tex}
          gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(loc, unit); unit++;
        } else if (v instanceof WebGLTexture) {
          gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(loc, unit); unit++;
        } else if (typeof v === 'number') gl.uniform1f(loc, v);
        else if (typeof v === 'boolean') gl.uniform1i(loc, v ? 1 : 0);
        else if (Array.isArray(v) || v instanceof Float32Array) {
          if (v.length === 2) gl.uniform2fv(loc, v);
          else if (v.length === 3) gl.uniform3fv(loc, v);
          else if (v.length === 4) gl.uniform4fv(loc, v);
          else if (v.length === 9) gl.uniformMatrix3fv(loc, false, v);
          else if (v.length === 16) gl.uniformMatrix4fv(loc, false, v);
          else gl.uniform1fv(loc, v);
        } else if (v && v.int !== undefined) gl.uniform1i(loc, v.int);
        else if (v && v.ivec !== undefined) { const a = v.ivec; if (a.length === 2) gl.uniform2iv(loc, a); else if (a.length === 3) gl.uniform3iv(loc, a); else gl.uniform4iv(loc, a); }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.__quad);
      gl.enableVertexAttribArray(this.aPos);
      gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }
  // A texture + framebuffer render target. type: 'rgba32f' | 'rgba16f' | 'rgba8'. filter: 'linear' | 'nearest'. wrap: 'repeat' | 'clamp'.
  class Target {
    constructor(gl, w, h, opts) {
      opts = opts || {};
      this.gl = gl; this.w = w; this.h = h;
      const type = opts.type || (gl.floatExt ? 'rgba32f' : 'rgba8');
      this.type = type;
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      const filter = opts.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
      const wrap = opts.wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      let internal, format = gl.RGBA, dtype, data = opts.data || null;
      if (type === 'rgba32f') { internal = gl.RGBA32F; dtype = gl.FLOAT; }
      else if (type === 'rgba16f') { internal = gl.RGBA16F; dtype = gl.HALF_FLOAT; if (data && !(data instanceof Uint16Array)) { data = null; } }
      else { internal = gl.RGBA8; dtype = gl.UNSIGNED_BYTE; }
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, dtype, data);
      this.fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer incomplete for ' + type + ' (' + status + ')');
    }
    // upload Float32Array (rgba32f) or Uint8Array (rgba8) data of size w*h*4
    upload(data) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      if (this.type === 'rgba32f') gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.w, this.h, gl.RGBA, gl.FLOAT, data);
      else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.w, this.h, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    clear(r, g, b, a) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.viewport(0, 0, this.w, this.h);
      gl.clearColor(r || 0, g || 0, b || 0, a == null ? 1 : a);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    dispose() { this.gl.deleteTexture(this.tex); this.gl.deleteFramebuffer(this.fbo); }
  }
  // Two targets that swap: pp.read / pp.write, pp.swap()
  class PingPong {
    constructor(gl, w, h, opts) { this.a = new Target(gl, w, h, opts); this.b = new Target(gl, w, h, opts); this.read = this.a; this.write = this.b; }
    swap() { const t = this.read; this.read = this.write; this.write = t; }
    dispose() { this.a.dispose(); this.b.dispose(); }
  }
  // Read the current default framebuffer into a 2D canvas (for export or compositing)
  function glToCanvas(gl) {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    // flip vertically
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    return c;
  }
  // GLSL snippets modules can splice into shaders
  const GLSL = {
    hash: `float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    vec2 hash22(vec2 p){ float n = hash21(p); return vec2(n, hash21(p+n)); }`,
    noise: `float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      float a = hash21(i), b = hash21(i+vec2(1,0)), c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y)*2.0-1.0; }
    float fbm(vec2 p, int oct){ float s=0.0, a=1.0, n=0.0; for(int i=0;i<8;i++){ if(i>=oct) break; s += vnoise(p)*a; n += a; a *= 0.5; p = p*2.02 + vec2(31.7,-17.3);} return s/n; }`,
    // sample a palette ramp: u_ramp is a 256x1 RGBA8 texture built with rampTexture()
    ramp: `uniform sampler2D u_ramp; vec3 ramp(float t){ return texture(u_ramp, vec2(clamp(t,0.0,1.0), 0.5)).rgb; }`,
    // Catmull-Rom bicubic from 16 nearest taps, for showing a coarse simulation grid at print size.
    // A field of a few hundred cells magnifies to thousands of pixels; nearest sampling turns that into a
    // mosaic of hard squares and bilinear into mush. Catmull-Rom interpolates smoothly and keeps edges.
    // Needs no filtering mode on the texture, so simulation passes that sample at exact texel centers are unaffected.
    bicubic: `float crW(float x){ x = abs(x);
      if (x < 1.0) return 1.5*x*x*x - 2.5*x*x + 1.0;
      if (x < 2.0) return -0.5*x*x*x + 2.5*x*x - 4.0*x + 2.0;
      return 0.0; }
    float texCR(sampler2D t, vec2 uv, vec2 res){
      vec2 p = uv * res - 0.5, f = fract(p), base = floor(p);
      float sum = 0.0, wsum = 0.0;
      for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
        float w = crW(float(i) - f.x) * crW(float(j) - f.y);
        sum += texture(t, (base + vec2(float(i), float(j)) + 0.5) / res).r * w;
        wsum += w;
      }
      return sum / max(wsum, 1e-6); }
    vec4 texCR4(sampler2D t, vec2 uv, vec2 res){
      vec2 p = uv * res - 0.5, f = fract(p), base = floor(p);
      vec4 sum = vec4(0.0); float wsum = 0.0;
      for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
        float w = crW(float(i) - f.x) * crW(float(j) - f.y);
        sum += texture(t, (base + vec2(float(i), float(j)) + 0.5) / res) * w;
        wsum += w;
      }
      return sum / max(wsum, 1e-6); }`,
    splatFS: `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_src;
uniform vec2 u_pos;
uniform vec4 u_add;
uniform float u_rad, u_amt;
uniform int u_mode;
void main(){
  vec4 c = texture(u_src, v_uv);
  vec2 d = v_uv - u_pos;
  float g = exp(-dot(d, d) / max(u_rad * u_rad, 1.0e-8));
  float a = clamp(g * u_amt, 0.0, 1.0);
  if (u_mode == 1) outColor = c + u_add * a;
  else if (u_mode == 2) outColor = max(c, u_add * a);
  else outColor = mix(c, u_add, a);
}`,
  };
  // Build a 256x1 texture from a palette for GLSL.ramp
  function rampTexture(gl, colors, bg) {
    const lut = makeRampLUT(colors, bg, 256);
    const data = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) { data[i * 4] = lut[i * 3]; data[i * 4 + 1] = lut[i * 3 + 1]; data[i * 4 + 2] = lut[i * 3 + 2]; data[i * 4 + 3] = 255; }
    // The 256 entries are correct now; the hardware still blends between neighboring entries in
    // sRGB, but adjacent entries of a 256-step ramp are close enough that the residual is invisible.
    const t = new Target(gl, 256, 1, { type: 'rgba8', filter: 'linear', data });
    return t;
  }
  const glh = { createGL, compile, Pass, Target, PingPong, glToCanvas, rampTexture, GLSL, QUAD_VS };

  /* ================================================================
     Palettes (original)
  ================================================================ */
  const PALETTES = {
    kiln:       { bg: '#F1E8D8', colors: ['#C4472B', '#E8A33C', '#2E4A62', '#1E1B18', '#FFFBF2'] },
    harbor:     { bg: '#ECEFEA', colors: ['#1F3A5F', '#4F7CAC', '#C9D6DF', '#E07A5F', '#F2CC8F'] },
    meadow:     { bg: '#F6F3E8', colors: ['#3D6B3A', '#8AB17D', '#E9C46A', '#D65A31', '#264653'] },
    graphite:   { bg: '#E9E7E2', colors: ['#1A1A1A', '#4A4A4A', '#8C8C8C', '#C8C4BB', '#E63B2E'] },
    verdigris:  { bg: '#EFEADF', colors: ['#2A6F6B', '#63A69F', '#B8860B', '#8C3B2F', '#1B2A2A'] },
    tram:       { bg: '#F5E6C8', colors: ['#D94F30', '#F2A541', '#3C6E71', '#284B63', '#FAF3E3'] },
    risograph:  { bg: '#FBF7EE', colors: ['#FF5E5B', '#00CECB', '#FFED66', '#2B2B2B'] },
    nightshade: { bg: '#17141F', colors: ['#3A2E5C', '#7A4FBF', '#C084FC', '#F7C8E0', '#E6E1F5'] },
    ember:      { bg: '#121110', colors: ['#3F3A36', '#8C2F0D', '#F25C05', '#F2A20C', '#FFF3D6'] },
    glacier:    { bg: '#0F1B2D', colors: ['#1B4F72', '#2E86C1', '#7FB3D5', '#D6EAF8', '#F4F6F7'] },
    bioluminescent: { bg: '#050A12', colors: ['#0B3D5C', '#0FA3B1', '#5CE1E6', '#B8FFF9', '#F0FFFE'] },
    thermal:    { bg: '#0A0710', colors: ['#2C0F4A', '#8A1C6B', '#E63946', '#FF9F1C', '#FFF1A8'] },
    petri:      { bg: '#F4F1EA', colors: ['#D9C7A7', '#B08968', '#7F5539', '#3E2C22', '#9C6644'] },
    xray:       { bg: '#000000', colors: ['#1D2A3A', '#3F6B8E', '#88B7D5', '#E0F2FF', '#FFFFFF'] },
    triad:      { bg: '#F3EFE6', colors: ['#C4472B', '#2A7AB8', '#E9B949'] },   // three equal weights, for three-species plates
  };
  function generatePalette(rng) {
    const baseH = rng() * 360;
    const schemes = [[0, 30, 60, 180], [0, 120, 240], [0, 150, 210, 330], [0, 20, 40, 200, 220]];
    const sch = rng.pick(schemes);
    const dark = rng() < 0.4;
    const cols = sch.map(d => hslToHex((baseH + d + (rng() - 0.5) * 12 + 360) % 360, 45 + rng() * 40, dark ? 40 + rng() * 35 : 28 + rng() * 40));
    cols.push(dark ? hslToHex(baseH, 20, 90) : hslToHex(baseH, 30, 12));
    if (dark) cols.sort((a, b) => luminance(a) - luminance(b));
    const bg = dark ? hslToHex(baseH, 15 + rng() * 20, 6 + rng() * 8) : hslToHex((baseH + 30) % 360, 20 + rng() * 30, 88 + rng() * 8);
    return { bg, colors: cols };
  }

  /* ================================================================
     Shell
  ================================================================ */
  const modules = [];          // registration order = tab order
  const byId = {};
  // How often you see the picture elsewhere. A curator's call, not a measurement. Five named
  // buckets, never a number. register() copies the value onto the module so the catalog can
  // read it; a missing id fails tools/index.js and tools/lint.js rather than defaulting to the middle.
  const FAMILIARITY_BUCKETS = ['ubiquitous', 'common', 'occasional', 'rare', 'unseen'];
  const FAMILIARITY_LABEL = {
    ubiquitous: 'Ubiquitous',
    common: 'Common',
    occasional: 'Occasional',
    rare: 'Rare',
    unseen: 'Almost unseen',
  };
  const FAMILIARITY = {
    // ubiquitous
    life: 'ubiquitous',
    fractal: 'ubiquitous',
    pendulum: 'ubiquitous',
    fluid: 'ubiquitous',
    holomorphic: 'ubiquitous',
    flow: 'ubiquitous',
    percolation: 'ubiquitous',
    attractors: 'ubiquitous',
    ising: 'ubiquitous',
    // common
    phyllotaxis: 'common',
    lichtenberg: 'common',
    snowflake: 'common',
    growth: 'common',
    landscape: 'common',
    kpz: 'common',
    grains: 'common',
    film: 'common',
    vegetation: 'common',
    cppn: 'common',
    schrodinger: 'common',
    excitable: 'common',
    soliton: 'common',
    cyclicca: 'common',
    xy: 'common',
    sandpile: 'common',
    turing: 'common',
    dendrite: 'common',
    chemotaxis: 'common',
    reaction: 'common',
    tilings: 'common',
    caustics: 'common',
    orbitals: 'common',
    pearls: 'common',
    convection: 'common',
    chladni: 'common',
    photon: 'common',
    // occasional
    physarum3d: 'occasional',
    bec: 'occasional',
    physarum: 'occasional',
    hl: 'occasional',
    cyclic: 'occasional',
    potts: 'occasional',
    sle: 'occasional',
    lens: 'occasional',
    web: 'occasional',
    faraday: 'occasional',
    aztec: 'occasional',
    skin: 'occasional',
    arago: 'occasional',
    rogue: 'occasional',
    aharonov: 'occasional',
    anderson: 'occasional',
    fput: 'occasional',
    chimera: 'occasional',
    swarm: 'occasional',
    cahn: 'occasional',
    hopf: 'occasional',
    lp: 'occasional',
    cloak: 'occasional',
    cgl: 'occasional',
    vortex: 'occasional',
    nematic: 'occasional',
    darkroom: 'occasional',
    ks: 'occasional',
    breather: 'occasional',
    klein: 'occasional',
    gyroid: 'occasional',
    meissner: 'occasional',
    tennis: 'occasional',
    airy: 'occasional',
    chirikov: 'occasional',
    hofstadter: 'occasional',
    weierstrass: 'occasional',
    scars: 'occasional',
    talbot: 'occasional',
    boy: 'occasional',
    reuleaux: 'occasional',
    apollonian: 'occasional',
    knotlight: 'occasional',
    kp: 'occasional',
    gerstner: 'occasional',
    eight: 'occasional',
    peakon: 'occasional',
    crapper: 'occasional',
    hasimoto: 'occasional',
    lump: 'occasional',
    // rare
    cortex: 'rare',
    liesegang: 'rare',
    skyrmion: 'rare',
    tonertu: 'rare',
    timecrystal: 'rare',
    spinice: 'rare',
    stealth: 'rare',
    ust: 'rare',
    ssh: 'rare',
    amb: 'rare',
    ohta: 'rare',
    swift: 'rare',
    pfc: 'rare',
    kakeya: 'rare',
    purcell: 'rare',
    smectic: 'rare',
    kitaev: 'rare',
    veselago: 'rare',
    devil: 'rare',
    loschmidt: 'rare',
    thouless: 'rare',
    causticsea: 'rare',
    // unseen
    hyperbolic: 'unseen',
    rotor: 'unseen',
    growdomain: 'unseen',
    rmt: 'unseen',
    lozenge: 'unseen',
    aubry: 'unseen',
    exceptional: 'unseen',
    track: 'unseen',
    'three-vortex-bound': 'unseen',
    'parallelogram-lock': 'unseen',
    'quincunx-lock': 'unseen',
    'double-triangle-bound': 'rare',
  };
  const ALIAS = { hendrick: 'three-vortex-bound', 'hendricks-identity': 'three-vortex-bound' };
  const S = window.Studio = { util, gl: glh, PALETTES, generatePalette, register, boot, modules: byId, exportJob: null, familiarity: FAMILIARITY };

  function register(mod) {
    if (!mod || !mod.id) throw new Error('Studio.register: module needs an id');
    mod.schema = mod.schema || [];
    mod.defaults = mod.defaults || {};
    mod.presets = mod.presets || {};
    mod.palette = mod.palette !== false;
    mod.order = mod.order == null ? 100 : mod.order;
    if (!mod.familiarity) mod.familiarity = FAMILIARITY[mod.id];
    modules.push(mod); byId[mod.id] = mod;
  }

  /* ---- hold the simulation rate steady whatever the monitor does ----
     Every technique drives its own requestAnimationFrame loop and does a fixed amount of simulation
     per frame, so the display's refresh rate sets how fast a plate evolves in wall-clock time: twice
     as fast on a 120 Hz laptop as on a 60 Hz desktop, four times on a 240 Hz monitor. The exported
     plate is identical either way, because warm-ups are counted in steps rather than seconds, but a
     living plate races on one machine and crawls on another, and the fast machine spends the extra
     frames for no extra detail.

     Sixty-odd loops call requestAnimationFrame directly, so the gate goes here rather than in each
     of them. Whole frames are accepted or skipped, and every callback waiting on an accepted frame
     runs on it. Gating each callback separately against a shared clock instead looks simpler and is
     wrong: the first loop to run claims the frame, so a loop registered later never sees an interval
     long enough and is starved forever. That version delivered exactly zero callbacks to a second
     loop in twelve seconds while the first kept running.

     Callbacks are deferred, never dropped, so the sequence of states is what it always was and only
     the rate is bounded. cancelAnimationFrame keeps working because the id handed back is ours. */
  (function holdFrameRate() {
    const nativeRequest = window.requestAnimationFrame.bind(window);
    const nativeCancel = window.cancelAnimationFrame.bind(window);
    const MIN_FRAME_MS = 1000 / 60.5;   // just under 60 so a 60 Hz display never skips a frame
    let queue = [];                     // callbacks waiting for an accepted frame
    let driver = 0;                     // the one native request outstanding, if any
    let lastRun = -1e9;
    let nextId = 1;
    const byId = new Map();

    function pump(t) {
      driver = 0;
      if (t - lastRun < MIN_FRAME_MS) { driver = nativeRequest(pump); return; }
      lastRun = t;
      const batch = queue;
      queue = [];
      for (const e of batch) {
        if (e.cancelled) continue;
        byId.delete(e.id);
        try { e.cb(t); } catch (err) { setTimeout(() => { throw err; }); }
      }
      if (queue.length && !driver) driver = nativeRequest(pump);
    }

    window.requestAnimationFrame = function (cb) {
      const e = { cb, id: nextId++, cancelled: false };
      queue.push(e);
      byId.set(e.id, e);
      if (!driver) driver = nativeRequest(pump);
      return e.id;
    };
    window.cancelAnimationFrame = function (id) {
      const e = byId.get(id);
      if (e) { e.cancelled = true; byId.delete(id); }
      else nativeCancel(id);            // an id from before this shim, or from another source
    };
  })();

  const STORE = 'genchase.v1.';
  // Recipe version. Bumped to 2 when the default grids were raised so that plates print sharp.
  // A hash carries only what differs from the defaults, so raising a default would silently reprint
  // every older recipe that never named a grid at a resolution it was not made at. Modules that
  // changed a default therefore declare the old value under the version that changed it, and
  // legacyFill gives it back to any recipe written before that version. Reprinting a seed years
  // later is the product; a default is allowed to move, a finished plate is not.
  const RECIPE_V = 2;
  const WORDS = ['kiln', 'harbor', 'moss', 'ember', 'slate', 'tide', 'quartz', 'loam', 'gale', 'reed', 'ochre', 'flint', 'delta', 'fern', 'basalt', 'wren', 'spore', 'lichen', 'coral', 'nacre'];
  // A seed you type can be any string up to 64 characters, so the input has never been the limit. The
  // roll was: one of twenty words and four digits is two hundred thousand seeds, and a birthday
  // collision arrives after about five hundred and thirty presses of Space, which is one sitting. Two
  // words and six base-36 characters is about 8.7e11, comfortably past the 2^32 distinct streams that
  // makeRng's seeding can actually produce, so the label is no longer what runs out first. Old seeds
  // still work unchanged: this only changes what a fresh roll looks like, and a roll was random anyway.
  function randomSeed() {
    const w = () => WORDS[Math.floor(Math.random() * WORDS.length)];
    let tail = '';
    for (let i = 0; i < 6; i++) tail += Math.floor(Math.random() * 36).toString(36);
    return w() + '-' + w() + '-' + tail;
  }
  let currentId = null;
  const instances = {};        // id -> { inst, canvas, state, anim... }
  const presetAt = {};         // id -> the preset key last applied, so , and . can walk the list
  let regenTimer = null, historyTimer = null;
  let downloads = null;
  let hashSilent = false;
  const undoStack = [];
  let undoLock = false;

  const $ = id => document.getElementById(id);
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    if (children) for (const c of children) if (c) el.appendChild(c);
    return el;
  }

  function own(obj) {
    const out = {};
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
    for (const k of Object.keys(obj)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = obj[k];
    }
    return out;
  }

  // What a module's defaults were at an earlier recipe version. mod.legacy is { <version>: { key: old } },
  // read as "recipes older than <version> were made with these values". Keys the recipe states itself
  // always win: it only fills what the recipe left to the defaults.
  function legacyFill(mod, src) {
    const v = Number(src.v);
    if (!mod.legacy || !isFinite(v) || v >= RECIPE_V) return null;
    const out = {};
    for (const step of Object.keys(mod.legacy)) {
      if (v >= Number(step)) continue;
      const vals = mod.legacy[step];
      for (const k of Object.keys(vals)) if (!(k in src)) out[k] = vals[k];
    }
    return out;
  }

  function sanitize(mod, s) {
    const src = own(s);
    const out = Object.assign({}, mod.defaults, legacyFill(mod, src), src);
    for (const f of mod.schema) {
      if (f.type === 'range') {
        let v = Number(out[f.key]);
        if (!isFinite(v)) v = mod.defaults[f.key];
        out[f.key] = clamp(v, f.min, f.max);
      } else if (f.type === 'seg') {
        // Exact match first. Failing that, a numeric option matched by a numeric string: the Settings
        // JSON is a text box a person edits by hand, and "grid": "512" is a reasonable thing to type.
        // Strict equality alone silently threw that away and reset the control to its default, which
        // is the same class of lie as a control that offers an option its validator clamps away.
        if (!f.options.some(o => o[0] === out[f.key])) {
          const v = out[f.key];
          const loose = (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)))
            ? f.options.find(o => typeof o[0] === 'number' && o[0] === Number(v)) : null;
          out[f.key] = loose ? loose[0] : mod.defaults[f.key];
        }
      } else if (f.type === 'toggle') out[f.key] = !!out[f.key];
    }
    if (mod.palette) {
      const dp = typeof mod.defaultPalette === 'string' ? PALETTES[mod.defaultPalette] : (mod.defaultPalette || PALETTES.kiln);
      if (!Array.isArray(out.palette) || !out.palette.length) out.palette = dp.colors.slice();
      out.palette = out.palette.map(c => /^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : '#888888').slice(0, 16);
      if (!/^#[0-9a-f]{6}$/i.test(out.bg || '')) out.bg = dp.bg;
    }
    out.seed = String(out.seed || randomSeed()).slice(0, 64);
    out.v = RECIPE_V;
    if (mod.sanitize) mod.sanitize(out);
    return out;
  }
  function loadState(mod) {
    let saved = null;
    try { const raw = localStorage.getItem(STORE + mod.id); if (raw) saved = JSON.parse(raw); } catch (e) { saved = null; }
    const out = sanitize(mod, saved);
    out.seed = randomSeed();
    return out;
  }
  function persist(id) {
    const e = instances[id]; if (!e) return;
    try { localStorage.setItem(STORE + id, JSON.stringify(e.state)); } catch (err) { /* per-viewer convenience */ }
    try { localStorage.setItem(STORE + 'tab', id); } catch (err) { /* ignore */ }
    try { localStorage.setItem(STORE + 'panel', panelSide); } catch (err) { /* ignore */ }
    updateColoPreview();
  }
  function refit() {
    const e = instances[currentId]; if (!e) return;
    if (fitCanvas(e) && e.inst && e.inst.resize) { try { e.inst.resize(); } catch (err) { showError(err); } }
  }
  async function copyText(text, okMsg, failMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg); return; } catch (err) { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) { toast(okMsg); return; }
    } catch (err2) { /* fall through */ }
    toast(failMsg || 'Copy failed');
  }

  function recipePayload(e) {
    const st = e.state, diff = { v: RECIPE_V };
    for (const k of Object.keys(st)) {
      if (k === 'v') continue;
      const def = e.mod.defaults[k];
      if (k === 'seed' || k === 'palette' || k === 'bg') { diff[k] = st[k]; continue; }
      if (JSON.stringify(st[k]) !== JSON.stringify(def)) diff[k] = st[k];
    }
    return diff;
  }
  function encodeRecipe(e) {
    const body = recipePayload(e);
    const seed = encodeURIComponent(String(e.state.seed || ''));
    let b64 = '';
    try {
      b64 = btoa(unescape(encodeURIComponent(JSON.stringify(body))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    } catch (err) { b64 = ''; }
    return '#' + e.mod.id + '/' + seed + (b64 ? '/' + b64 : '');
  }
  function parseHash() {
    const raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    const parts = raw.split('/');
    let id = parts[0];
    if (!id) return null;
    if (ALIAS[id] && byId[ALIAS[id]]) id = ALIAS[id];
    if (!byId[id]) return { id, unknown: true };
    const out = { id };
    if (parts[1]) {
      try { out.seed = decodeURIComponent(parts[1]); }
      catch (err) { /* a broken seed encoding is still a named technique */ }
    }
    if (parts[2]) {
      try {
        let b64 = parts[2].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        Object.assign(out, own(JSON.parse(decodeURIComponent(escape(atob(b64))))));
      } catch (err) { /* seed-only hash still works */ }
    }
    return out;
  }
  function writeHash() {
    const e = instances[currentId]; if (!e) return;
    const next = encodeRecipe(e);
    if (location.hash === next) return;
    hashSilent = true;
    try { history.replaceState(null, '', next); } catch (err) { location.hash = next; }
    hashSilent = false;
  }
  let hashTimer = 0;
  function scheduleHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(writeHash, 180);
  }

  function snapshot(label) {
    const e = instances[currentId]; if (!e || undoLock) return;
    undoStack.push({ id: currentId, state: JSON.parse(JSON.stringify(e.state)), label: label || 'change' });
    if (undoStack.length > 40) undoStack.shift();
  }
  function undoLast() {
    const snap = undoStack.pop();
    if (!snap) { toast('Nothing to undo'); return; }
    undoLock = true;
    const go = () => {
      const e = instances[currentId];
      if (!e) { undoLock = false; return; }
      e.state = sanitize(e.mod, snap.state);
      e.host.getState = () => e.state;
      buildSidebar(e); syncAll(e);
      regenerate({ skipSnap: true, skipHistory: true });
      undoLock = false;
      toast('Undid ' + snap.label);
    };
    if (snap.id !== currentId) { switchTo(snap.id, { skipHash: false }); setTimeout(go, 30); }
    else go();
  }

  const HISTORY_KEY = STORE + 'history';
  const HISTORY_MAX = 24;
  function captureThumb() {
    const e = instances[currentId]; if (!e || !e.canvas || !e.canvas.width) return null;
    try {
      const src = e.canvas, c = document.createElement('canvas');
      const w = 152, h = Math.max(8, Math.round(w * (src.height / Math.max(1, src.width))));
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (err) { return null; }
  }
  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(x => x && typeof x === 'object' && typeof x.hash === 'string' && typeof x.id === 'string').map(x => ({
        t: Number(x.t) || 0,
        id: String(x.id).slice(0, 40),
        seed: String(x.seed || '').slice(0, 64),
        name: String(x.name || '').slice(0, 80),
        hash: String(x.hash).slice(0, 12000),
        thumb: (typeof x.thumb === 'string' && /^data:image\/(png|jpeg|jpg|webp);/i.test(x.thumb)) ? x.thumb : null,
      }));
    } catch (err) { return []; }
  }
  function pushHistory(opts) {
    const e = instances[currentId]; if (!e) return;
    const hash = encodeRecipe(e).slice(1);
    const list = loadHistory();
    const thumb = captureThumb();
    if (list[0] && thumb && list[0].thumb === thumb) return;
    if (list[0] && list[0].hash === hash && !(opts && opts.allowSameHash)) return;
    const item = {
      t: Date.now(), id: e.mod.id, seed: e.state.seed, name: e.mod.name,
      hash, thumb,
    };
    const next = list.filter(x => x.hash !== hash);
    next.unshift(item);
    const trimmed = next.slice(0, HISTORY_MAX);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)); }
    catch (err) {
      trimmed.forEach(x => { delete x.thumb; });
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)); } catch (e2) { /* quota */ }
    }
    renderHistory();
  }
  function scheduleHistory(opts) {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => pushHistory(opts), 520);
  }
  function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch (err) { /* ignore */ }
    renderHistory();
    toast('Timeline cleared');
  }

  const GALLERY_KEY = STORE + 'gallery';
  const GALLERY_MAX = 80;
  function loadGallery() {
    try {
      const raw = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(x => x && x.hash && x.id).map(x => ({
        t: Number(x.t) || 0,
        id: String(x.id).slice(0, 40),
        seed: String(x.seed || '').slice(0, 64),
        name: String(x.name || '').slice(0, 80),
        hash: String(x.hash).slice(0, 12000),
        thumb: (typeof x.thumb === 'string' && /^data:image\//i.test(x.thumb)) ? x.thumb : null,
      }));
    } catch (err) { return []; }
  }
  function persistGallery(list) {
    try { localStorage.setItem(GALLERY_KEY, JSON.stringify(list.slice(0, GALLERY_MAX))); }
    catch (err) {
      list.forEach(x => { delete x.thumb; });
      try { localStorage.setItem(GALLERY_KEY, JSON.stringify(list.slice(0, GALLERY_MAX))); } catch (e2) { /* quota */ }
    }
  }
  /* ---- presets: the menu and the , . keys both come through here ---- */
  function applyPreset(key) {
    const e = instances[currentId]; const p = e && e.mod.presets[key];
    if (!p) return false;
    presetAt[currentId] = key;
    e.state = sanitize(e.mod, Object.assign({}, e.state, p.p, p.palette ? { palette: p.palette.colors.slice(), bg: p.palette.bg } : {}));
    buildSidebar(e); syncAll(e); regenerate({ snapLabel: 'preset' });
    return true;
  }
  // Walk the preset list without opening the menu, so you can find the one you want by looking at the plate.
  // Parameters edited by hand do not clear the position: stepping continues from the last preset applied.
  function stepPreset(dir) {
    const e = instances[currentId]; if (!e) return;
    const keys = Object.keys(e.mod.presets || {});
    if (!keys.length) { toast('This technique has no presets'); return; }
    const i = keys.indexOf(presetAt[currentId] || '');
    const key = i < 0 ? keys[dir > 0 ? 0 : keys.length - 1] : keys[(i + dir + keys.length) % keys.length];
    if (applyPreset(key)) toast(e.mod.presets[key].label + '  ·  ' + (keys.indexOf(key) + 1) + ' of ' + keys.length);
  }
  // Copy the plate as it stands on screen. This is the screen image; E is still the route to a file at
  // print pixels. The clipboard write needs a secure context, and Safari wants the blob's promise handed
  // to ClipboardItem inside the gesture rather than an already-awaited blob.
  async function copyPlate() {
    const e = instances[currentId];
    if (!e || !e.canvas || !e.canvas.width) return;
    if (!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem)) {
      toast('This browser will not put an image on the clipboard. Export with E.');
      return;
    }
    try {
      const src = e.canvas, c = document.createElement('canvas');
      c.width = src.width; c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': util.toBlob(c) })]);
      toast('Plate copied  ·  ' + src.width + ' × ' + src.height + ' px, screen size');
    } catch (err) {
      toast('The browser refused the clipboard. Export with E instead.');
    }
  }
  function saveToGallery() {
    const e = instances[currentId]; if (!e) return;
    const hash = encodeRecipe(e).slice(1);
    const list = loadGallery();
    if (list.some(x => x.hash === hash)) { toast('Already in the gallery'); openGallery(); return; }
    list.unshift({ t: Date.now(), id: e.mod.id, seed: e.state.seed, name: e.mod.name, hash, thumb: captureThumb() });
    persistGallery(list);
    toast('Saved to gallery');
    const grid = $('gallery-grid');
    if (grid && !$('modal-gallery').hidden) renderGallery();
  }
  function removeFromGallery(hash) {
    persistGallery(loadGallery().filter(x => x.hash !== hash));
    renderGallery();
  }
  function renderGallery() {
    const grid = $('gallery-grid'); if (!grid) return;
    const list = loadGallery();
    grid.innerHTML = '';
    if (!list.length) {
      grid.appendChild(h('p', { class: 'gempty', text: 'Empty. Save on the bar keeps this plate here.' }));
      return;
    }
    list.forEach(item => {
      const card = h('button', { class: 'gitem', type: 'button', title: item.name + ' · ' + item.seed, onclick: () => {
        closeModal('modal-gallery');
        restoreHistory(item);
      }});
      if (item.thumb) card.appendChild(h('img', { src: item.thumb, alt: '' }));
      const meta = h('div', { class: 'gmeta' });
      meta.appendChild(h('span', { class: 'gname', text: item.name || item.id }));
      meta.appendChild(h('span', { class: 'gseed', text: item.seed || '' }));
      card.appendChild(meta);
      const del = h('button', { class: 'gdel', type: 'button', title: 'Remove', text: '×', onclick: ev => { ev.stopPropagation(); removeFromGallery(item.hash); } });
      card.appendChild(del);
      grid.appendChild(card);
    });
  }
  function openGallery() {
    renderGallery();
    openModal('modal-gallery');
  }
  let historyVisible = true;
  let focusMode = false;
  function setHistoryVisible(on, opts) {
    historyVisible = !!on;
    try { localStorage.setItem(STORE + 'timeline', historyVisible ? '1' : '0'); } catch (err) { /* ignore */ }
    const btn = $('btn-history');
    if (btn) btn.setAttribute('aria-checked', String(historyVisible));
    renderHistory();
    if (!(opts && opts.skipFit)) refit();
    if (!(opts && opts.silent)) toast(historyVisible ? 'Timeline on' : 'Timeline hidden');
  }
  function setFocus(on) {
    focusMode = !!on;
    const app = document.querySelector('.app');
    if (app) app.classList.toggle('focus', focusMode);
    const btn = $('btn-focus');
    if (btn) btn.setAttribute('aria-pressed', String(focusMode));
    const exit = $('btn-exit-focus');
    if (exit) exit.hidden = !focusMode;
    if (!focusMode && ambientOn) setAmbient(false);
    refit();
    const stage = $('stage');
    if (focusMode) {
      if (stage) { try { stage.focus(); } catch (err) { /* ignore */ } }
    } else if (btn) {
      try { btn.focus(); } catch (err) { /* ignore */ }
    }
  }

  /* ---- ambient mode: walk the tabs on a timer, a fresh seed each time ---- */
  let ambientOn = false, ambientTimer = 0;
  const AMBIENT_MS = 30000;
  function ambientStep() {
    const ids = [...document.querySelectorAll('button.tab[data-id]')].map(b => b.dataset.id);
    if (!ids.length) return;
    const next = ids[(ids.indexOf(currentId) + 1) % ids.length];
    switchTo(next);
    $('btn-generate').click();   // a fresh seed through the same path as the Generate button
  }
  function setAmbient(on) {
    ambientOn = !!on;
    clearInterval(ambientTimer); ambientTimer = 0;
    const btn = $('btn-ambient');
    if (btn) btn.setAttribute('aria-pressed', String(ambientOn));
    if (!ambientOn) return;
    if (!focusMode) setFocus(true);
    ambientStep();
    ambientTimer = setInterval(ambientStep, AMBIENT_MS);
    toast('Ambient: a new technique every 30 s. Esc or A stops it.');
  }
  function togglePause() {
    const e = instances[currentId]; if (!e) return;
    if (Object.prototype.hasOwnProperty.call(e.state, 'running')) {
      setParam(e, 'running', !e.state.running, 'live');
      toast(e.state.running ? 'Running' : 'Paused');
      return;
    }
    // no running key: hold the plate through the same pause/resume the shell uses when switching tabs
    e.paused = !e.paused;
    try { if (e.paused) e.inst.pause && e.inst.pause(); else e.inst.resume && e.inst.resume(); } catch (err) { showError(err); }
    toast(e.paused ? 'Paused' : 'Running');
  }
  function renderHistory() {
    const wrap = $('history'); if (!wrap) return;
    const list = loadHistory();
    wrap.hidden = !historyVisible || list.length === 0;
    wrap.innerHTML = '';
    if (!list.length) return;
    wrap.appendChild(h('button', {
      class: 'hclear', type: 'button',
      title: 'Clear the session timeline',
      onclick: clearHistory,
      text: 'Clear',
    }));
    list.forEach((item, i) => {
      const btn = h('button', {
        class: 'hitem', type: 'button',
        title: item.name + ' · ' + item.seed,
        onclick: () => restoreHistory(item),
      });
      if (item.thumb && item.thumb.indexOf('data:image/') === 0) btn.appendChild(h('img', { src: item.thumb, alt: '' }));
      else btn.appendChild(h('span', { text: item.id }));
      btn.appendChild(h('span', { text: item.seed || item.id }));
      wrap.appendChild(btn);
      if (i === 0) btn.dataset.latest = '1';
    });
  }
  function restoreHistory(item) {
    if (!item || !item.hash) return;
    snapshot('history jump');
    hashSilent = true;
    location.hash = '#' + item.hash;
    hashSilent = false;
    applyHash({ skipSnap: true });
  }
  function applyHash(opts) {
    const rec = parseHash();
    if (!rec || !rec.id || !byId[rec.id]) return false;
    const { id } = rec;
    const rest = own(rec);
    delete rest.id;
    if (currentId !== id) switchTo(id);
    const e = instances[id]; if (!e) return false;
    // A hash that names a seed is a complete recipe, so it is built on the module's defaults rather
    // than on whatever the viewer happened to have on screen. Merging it into the current state
    // instead meant every key the recipe did not name was inherited from the viewer's own last
    // session, so two people opening the same link got two different plates and a published recipe
    // did not reprint. rest keeps its v so legacyFill can see how old the recipe is. A bare '#id',
    // which names nothing at all, still means 'this tab as I left it'.
    const base = rest.seed != null ? {} : own(e.state);
    e.state = sanitize(e.mod, Object.assign(base, rest));
    e.host.getState = () => e.state;
    buildSidebar(e); syncAll(e);
    regenerate({ skipSnap: opts && opts.skipSnap, skipHistory: true });
    return true;
  }

  const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const coarsePointer = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  /* ---- entry (per-module runtime) ---- */
  function ensureEntry(mod, initialState) {
    if (instances[mod.id]) return instances[mod.id];
    const canvas = h('canvas', { class: 'art', role: 'img', 'aria-label': mod.name + ' artwork' });
    canvas.hidden = true;
    const sheet = $('sheet');
    const cap = $('colo-preview');
    if (sheet && cap) sheet.insertBefore(canvas, cap);
    else $('stage').insertBefore(canvas, $('status'));
    const e = { mod, canvas, state: initialState || loadState(mod), inst: null, statusHtml: '' };
    const host = {
      canvas,
      util, gl: glh,
      getState: () => e.state,
      setStatus: html => { e.statusHtml = html || ''; if (currentId === mod.id) renderStatus(); },
      reducedMotion,
      isActive: () => currentId === mod.id && !document.hidden,
      requestRepaint: () => { if (currentId === mod.id) repaint(); },
      // A technique that cannot run reports it here as well as in the status line, so the stage says
      // so instead of sitting empty. Only the technique on screen gets to raise the panel.
      fault: (msg, opts) => { if (currentId === mod.id) showFault(mod.id, msg, opts); },
    };
    e.host = host;
    e.inst = mod.create(host);
    // A getContext probe would create a lazy renderer's context with default attributes,
    // disabling preserveDrawingBuffer before the module can request it. Observe creation.
    Object.defineProperty(e, 'usesGL', { get: () => glContexts.has(canvas) });
    instances[mod.id] = e;

    // A browser may take the GL context away at any time: a phone backgrounding the tab, a driver
    // reset, memory pressure. Without this the plate goes blank and stays blank for the rest of the
    // session, with nothing said. preventDefault is what makes a restore possible at all.
    canvas.addEventListener('webglcontextlost', ev => {
      ev.preventDefault();
      e.contextLost = true;
      try { e.inst.pause && e.inst.pause(); } catch (err) { /* it is already gone */ }
      if (currentId === mod.id) {
        showFault(mod.id, 'The browser took back the graphics context, which usually means this tab was in the background or the device was short of memory. The plate can be rebuilt from its seed.',
                  { title: 'Graphics context lost', retry: true });
      }
    });
    canvas.addEventListener('webglcontextrestored', () => {
      if (e.contextLost) rebuildEntry(mod.id);
    });

    e.canvas.addEventListener('pointerdown', ev => onPokeDown(e, ev));
    e.canvas.addEventListener('auxclick', ev => { if (ev.button === 1) ev.preventDefault(); });
    e.canvas.addEventListener('keydown', ev => onPokeKey(e, ev));
    e.canvas.addEventListener('focus', () => {
      pokeCursor = { x: 0.5, y: 0.5 };
      if (e.inst && e.inst.disturb) placePokeAim(e.canvas, pokeCursor);
      tickWitness(true);
    });
    e.canvas.addEventListener('blur', hidePokeAim);
    e.canvas.tabIndex = -1;
    return e;
  }

  /* ---- canvas sizing ---- */
  function fitCanvas(e) {
    const stage = $('stage');
    const cs = getComputedStyle(stage);
    const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const colo = $('colo-preview');
    const coloH = colo && !colo.hidden ? colo.offsetHeight + 16 : 0;
    const availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 24 - coloH;
    const ar = (e.inst.aspect && e.inst.aspect(e.state)) || 1;
    let cw = Math.max(120, availW), ch = cw * ar;
    if (ch > availH) { ch = Math.max(120, availH); cw = ch / ar; }
    // The device ratio is capped at 2, but the CSS size is whatever the stage is, and the stage is
    // as wide as the window. On a 5K display that alone reaches roughly 28 megapixels of backbuffer
    // before any technique allocates its own, and the CPU techniques that raster at canvas size pay
    // it twice. Cap the drawing buffer by area instead and let CSS scale the last few percent: past
    // this size the limit is the screen, not the plate. Export is unaffected, since it recomputes at
    // print pixels rather than reading this canvas.
    const MAX_CANVAS_PX = 8e6;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cw * ch * dpr * dpr > MAX_CANVAS_PX) dpr = Math.sqrt(MAX_CANVAS_PX / Math.max(1, cw * ch));
    e.canvas.style.width = cw + 'px';
    e.canvas.style.height = ch + 'px';
    const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    const changed = e.canvas.width !== pw || e.canvas.height !== ph;
    if (changed) { e.canvas.width = pw; e.canvas.height = ph; }
    return changed;
  }

  function renderStatus() {
    const e = instances[currentId]; if (!e) return;
    // every integrator with a time step shows it, so a preset that changes dt says so
    const dt = Number(e.state.dt);
    const dtHtml = isFinite(dt) && dt > 0 && !/\bdt\b/.test(e.statusHtml) ? '<span>dt <b>' + (dt >= 1 ? dt.toFixed(1) : dt.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')) + '</b></span>' : '';
    $('status').innerHTML = e.statusHtml + dtHtml + '<span>seed <b>' + escapeHtml(e.state.seed) + '</b></span>';
  }

  /* ---- lifecycle ---- */
  function regenerate(opts) {
    const e = instances[currentId]; if (!e) return;
    if (!(opts && opts.skipSnap)) snapshot(opts && opts.snapLabel || 'generate');
    clearTimeout(regenTimer);
    fitCanvas(e);
    e.paused = false;
    try { e.inst.regenerate(); } catch (err) { showError(err); }
    updateDims();
    persist(currentId);
    if (!(opts && opts.skipHistory)) scheduleHistory();
    resetWitness();
    scheduleHash();
  }
  function repaint() {
    const e = instances[currentId]; if (!e) return;
    fitCanvas(e);
    try { if (e.inst.repaint) e.inst.repaint(); else e.inst.regenerate(); } catch (err) { showError(err); }
    updateDims();
    persist(currentId);
  }
  function scheduleRegen(opts) { clearTimeout(regenTimer); regenTimer = setTimeout(() => regenerate(opts), 120); }
  function showError(err) {
    console.error(err);
    toast('Something went wrong in this module: ' + (err && err.message ? err.message.split('\n')[0] : err));
  }

  /* ---- modals: open and close through here so focus goes in and comes back ---- */
  const MODALS = ['modal-export', 'modal-settings', 'modal-about', 'modal-gallery', 'modal-more'];
  let returnFocusTo = null;
  function openModal(id) {
    const m = $(id);
    if (!m) return;
    returnFocusTo = document.activeElement;
    m.hidden = false;
    // Land on something inside rather than leaving focus on the button behind the overlay.
    const first = [...m.querySelectorAll('button, [href], input, select, textarea')]
      .find(el => !el.hidden && !el.disabled && el.offsetParent !== null);
    if (first) { try { first.focus(); } catch (err) { /* nothing focusable yet */ } }
  }
  function abortExportIfBusy() {
    if (!exportBusy) return;
    if (S.exportJob) S.exportJob.abort = true;
    const cancel = $('export-cancel');
    if (cancel) cancel.hidden = true;
    const note = $('export-note');
    if (note) note.textContent = 'Cancelling…';
  }
  function closeModal(id) {
    if (id === 'modal-export' || !id) abortExportIfBusy();
    const m = $(id);
    if (m) m.hidden = true;
    if (id === 'modal-more' || !id) {
      const moreBtn = $('btn-more');
      if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
    }
    if (returnFocusTo && document.contains(returnFocusTo)) { try { returnFocusTo.focus(); } catch (err) { /* gone */ } }
    returnFocusTo = null;
  }
  function closeAllModals() { for (const id of MODALS) { const m = $(id); if (m) m.hidden = true; } closeModal(null); }

  /* ---- a technique that cannot run says so on the stage, not in 11px at the bottom ---- */
  // A GPU technique with no WebGL2, or whose shaders will not compile, returns a stub whose only
  // report was host.setStatus(). The canvas is then sized but never painted, so the page reads as
  // broken rather than as a message. This takes the stage and offers the two things worth doing.
  function showFault(id, msg, opts) {
    const panel = $('fault');
    if (!panel) return;
    faultFor = id;
    faulted.add(id);
    $('fault-title').textContent = (opts && opts.title) || 'This technique cannot run here';
    $('fault-msg').textContent = msg || 'Something went wrong starting this technique.';
    $('fault-retry').hidden = !(opts && opts.retry);
    panel.hidden = false;
  }
  function clearFault() {
    const panel = $('fault');
    if (panel) panel.hidden = true;
    faultFor = null;
  }
  let faultFor = null;
  // On a device with no WebGL2 every GPU technique fails the same way, so offering "the next one"
  // just shows the same panel again. Skip the ones already known to fail here.
  const faulted = new Set();

  /* ---- living witness: pixel fingerprint + frame strip + poke ---- */
  const probe = document.createElement('canvas');
  probe.width = probe.height = 24;
  let lastFp = '', stillMs = 0, stripAt = 0, witnessClock = 0, liveNow = false, liveStreak = 0;
  // How loudly the witness announces itself. A viewing preference, not part of the plate: it is kept
  // in localStorage rather than in the recipe, because a hash has to describe the picture and nothing
  // else. Two people opening the same link must get the same plate whatever either of them prefers
  // to see in the corner.
  const WITNESS_MODES = ['full', 'quiet', 'off'];
  let witnessMode = 'full';
  function applyWitnessMode() {
    const w = $('witness'); if (!w) return;
    w.classList.toggle('w-quiet', witnessMode === 'quiet');
    w.classList.toggle('w-off', witnessMode === 'off');
  }
  function setWitnessMode(mode, announce) {
    witnessMode = WITNESS_MODES.indexOf(mode) < 0 ? 'full' : mode;
    applyWitnessMode();
    try { localStorage.setItem(STORE + 'witness', witnessMode); } catch (err) { /* private window */ }
    if (announce) toast(witnessMode === 'full' ? 'Witness: full'
      : witnessMode === 'quiet' ? 'Witness: dot only' : 'Witness: hidden (W brings it back)');
  }
  function cycleWitness() {
    setWitnessMode(WITNESS_MODES[(WITNESS_MODES.indexOf(witnessMode) + 1) % WITNESS_MODES.length], true);
  }
  function fingerprint(canvas) {
    if (!canvas || !canvas.width) return '';
    try {
      const g = probe.getContext('2d');
      g.drawImage(canvas, 0, 0, 24, 24);
      const d = g.getImageData(0, 0, 24, 24).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 13) { h ^= d[i]; h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(16).padStart(8, '0');
    } catch (err) { return ''; }
  }
  function setLive(on) {
    liveNow = !!on;
    const badge = $('live-badge'), label = $('live-label');
    if (badge) badge.classList.toggle('is-live', liveNow);
    if (label) label.textContent = liveNow ? 'Live' : 'Still';
    updateRecordUI();
  }
  function resetWitness() {
    lastFp = ''; stillMs = 0; stripAt = 0; liveStreak = 0;
    setLive(false);
    const strip = $('witness-strip'); if (strip) strip.innerHTML = '';
    tickWitness(true);
  }
  function markPokeable() {
    const e = instances[currentId];
    if (!e || !e.canvas) return;
    const poke = !!(e.inst && e.inst.disturb);
    e.canvas.classList.toggle('pokeable', poke);
    e.canvas.tabIndex = poke ? 0 : -1;
    if (!poke) hidePokeAim();
  }

  /* ---- video capture: a clip of a plate that moves ---- */
  // Record is offered on a living plate, and on a still one whose state has `running` so V can
  // start it rather than film a still. WebM is preferred; MP4 is the fallback where the browser
  // only encodes that. A timed clip from the export sheet uses the same encoder and caps at 8 s.
  let recorder = null, recTimer = 0, recStart = 0, recCapMs = 0;
  const REC_MAX_MS = 60000;
  function pickRecMime() {
    const M = window.MediaRecorder;
    if (!M || typeof M.isTypeSupported !== 'function') return '';
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=avc1', 'video/mp4'];
    for (const t of types) { try { if (M.isTypeSupported(t)) return t; } catch (err) { /* keep looking */ } }
    return '';
  }
  function canFilm() {
    if (liveNow) return true;
    const e = instances[currentId];
    return !!(e && e.state && Object.prototype.hasOwnProperty.call(e.state, 'running'));
  }
  function wakeForRecord() {
    const e = instances[currentId]; if (!e) return;
    if (Object.prototype.hasOwnProperty.call(e.state, 'running') && !e.state.running) {
      setParam(e, 'running', true, 'live');
    }
    if (e.paused) {
      e.paused = false;
      try { e.inst.resume && e.inst.resume(); } catch (err) { /* already moving */ }
    }
  }
  function updateRecordUI() {
    const btn = $('btn-record'); if (!btn) return;
    const on = !!recorder;
    btn.hidden = !(on || liveNow || canFilm());
    btn.classList.toggle('rec', on);
    btn.setAttribute('aria-pressed', String(on));
    if (!on) { btn.textContent = 'Record'; return; }
    const ms = Date.now() - recStart;
    const cap = recCapMs > 0 ? recCapMs : REC_MAX_MS;
    btn.textContent = 'Stop ' + Math.floor(ms / 1000) + 's';
    if (ms >= cap) stopRecord();
  }
  function toggleRecord() {
    if (recorder) stopRecord();
    else startRecord(0);
  }
  function startRecord(capMs) {
    const e = instances[currentId]; if (!e || !e.canvas) return;
    if (!canFilm()) { toast('Nothing to record — this plate is still'); return; }
    if (!window.MediaRecorder || typeof e.canvas.captureStream !== 'function') { toast('This browser cannot record a canvas'); return; }
    const mime = pickRecMime();
    if (!mime) { toast('No video format is available for recording'); return; }
    wakeForRecord();
    let stream, rec;
    try {
      stream = e.canvas.captureStream(30);
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
    } catch (err) { toast('Could not start recording: ' + err.message); return; }
    const chunks = [];
    const ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
    const name = 'genchase-' + e.mod.id + '-' + e.state.seed.replace(/[^a-z0-9_-]+/gi, '_') + '-clip.' + ext;
    rec.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    rec.onstop = () => {
      for (const t of stream.getTracks()) t.stop();
      if (recorder === rec) recorder = null;
      recCapMs = 0;
      clearInterval(recTimer); recTimer = 0;
      updateRecordUI();
      if (!chunks.length) { toast('Nothing was recorded'); return; }
      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: name });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast('Saved ' + name + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)');
    };
    recorder = rec; recStart = Date.now(); recCapMs = capMs > 0 ? capMs : 0;
    rec.start(250);
    recTimer = setInterval(updateRecordUI, 250);
    updateRecordUI();
    toast(recCapMs ? ('Recording ' + Math.round(recCapMs / 1000) + ' s clip…') : 'Recording. Press V or Stop to finish; clips cap at 60 s.');
  }
  function stopRecord() {
    if (!recorder) return;
    try { if (recorder.state !== 'inactive') recorder.stop(); } catch (err) { /* already stopped */ }
  }
  function tickWitness(force) {
    const e = instances[currentId], badge = $('live-badge'), fpEl = $('live-fp'), hint = $('witness-hint');
    if (!e || !badge) return;
    if (e.paused && !force) return;
    const fp = fingerprint(e.canvas);
    let changed = false;
    if (!lastFp) {
      lastFp = fp || '_';
      liveStreak = 0;
      setLive(false);
    } else if (fp && fp !== lastFp) {
      changed = true;
      liveStreak += 1;
      lastFp = fp;
      stillMs = 0;
      setLive(liveStreak >= 2);
    } else {
      liveStreak = 0;
      stillMs += 400;
      if (stillMs >= 800) setLive(false);
    }
    if (fpEl && fp) fpEl.textContent = fp.slice(-4);
    const poke = !!(e.inst && e.inst.disturb);
    // "Drag" is a mouse word; on a touch screen the gesture has a different name.
    const canvasFocused = !!(e.canvas && document.activeElement === e.canvas);
    if (hint) {
      hint.textContent = canvasFocused && poke
        ? 'Arrows move the poke. Enter applies. Shift+arrow drags.'
        : poke ? (coarsePointer() ? 'Touch or drag to disturb' : 'Click or drag to disturb') : '';
    }
    if (force) {
      pushWitnessFrame(e.canvas);
      stripAt = Date.now();
    } else if (liveNow && changed && Date.now() - stripAt > 1600) {
      pushWitnessFrame(e.canvas);
      stripAt = Date.now();
    }
    markPokeable();
  }
  function pushWitnessFrame(canvas) {
    const strip = $('witness-strip'); if (!strip || !canvas.width) return;
    try {
      const c = document.createElement('canvas');
      c.width = 80; c.height = 80;
      const g = c.getContext('2d');
      g.drawImage(canvas, 0, 0, 80, 80);
      const img = h('img', { src: c.toDataURL('image/jpeg', 0.62), alt: '' });
      strip.appendChild(img);
      while (strip.childNodes.length > 6) strip.removeChild(strip.firstChild);
    } catch (err) { /* tainted or lost context */ }
  }
  let pokeStroke = null;
  let panStroke = null;
  let pokeWindowBound = false;
  let viewX = 0, viewY = 0, viewS = 1;
  const VIEW_MIN = 1, VIEW_MAX = 8;
  function viewIdle() { return viewS === 1 && viewX === 0 && viewY === 0; }
  function applyView() {
    const e = instances[currentId];
    const c = e && e.canvas;
    for (const other of document.querySelectorAll('.stage canvas.art')) {
      if (other !== c) other.style.transform = '';
    }
    if (c) {
      c.style.transformOrigin = 'center center';
      c.style.transform = viewIdle() ? '' : ('translate(' + viewX + 'px,' + viewY + 'px) scale(' + viewS + ')');
    }
    const fit = $('view-fit');
    if (fit) fit.disabled = viewIdle();
  }
  function resetView() {
    viewX = 0; viewY = 0; viewS = 1;
    applyView();
  }
  function panBy(dx, dy) {
    viewX += dx; viewY += dy;
    applyView();
  }
  function zoomAt(clientX, clientY, factor) {
    const e = instances[currentId]; if (!e || !e.canvas) return;
    const next = util.clamp(viewS * factor, VIEW_MIN, VIEW_MAX);
    if (Math.abs(next - viewS) < 1e-6) return;
    const r = e.canvas.getBoundingClientRect();
    const fx = (clientX - r.left) / Math.max(1, r.width);
    const fy = (clientY - r.top) / Math.max(1, r.height);
    viewS = next;
    applyView();
    const r2 = e.canvas.getBoundingClientRect();
    viewX += clientX - (r2.left + fx * r2.width);
    viewY += clientY - (r2.top + fy * r2.height);
    if (viewS === 1) { viewX = 0; viewY = 0; }
    applyView();
  }
  function zoomCenter(factor) {
    const e = instances[currentId]; if (!e || !e.canvas) return;
    const r = e.canvas.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
  }
  function bindPokeWindow() {
    if (pokeWindowBound) return;
    pokeWindowBound = true;
    window.addEventListener('pointermove', onPokeMove);
    window.addEventListener('pointerup', onPokeUp, true);
    window.addEventListener('pointercancel', onPokeUp, true);
  }
  function pokeUV(canvas, ev) {
    const r = canvas.getBoundingClientRect();
    const x = util.clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1);
    const y = util.clamp((ev.clientY - r.top) / Math.max(1, r.height), 0, 1);
    return { x, y, yGL: 1 - y };
  }
  function applyPoke(e, uv, prev) {
    const dx = prev ? uv.x - prev.x : 0;
    const dy = prev ? uv.yGL - prev.yGL : 0;
    e.inst.disturb({ x: uv.x, y: uv.y, yGL: uv.yGL, dx, dy });
    if (e.paused) {
      e.paused = false;
      try { e.inst.resume && e.inst.resume(); } catch (err) { /* already moving */ }
    }
  }
  function wantsPan(e, ev) {
    if (ev.altKey || ev.button === 1 || ev.buttons === 4) return true;
    if (!e.inst || !e.inst.disturb) return ev.button === 0 || !ev.button;
    return false;
  }
  function onPokeDown(e, ev) {
    if (ev.target && ev.target.closest && ev.target.closest('.viewpad')) return;
    if (wantsPan(e, ev)) {
      ev.preventDefault();
      bindPokeWindow();
      panStroke = { x: ev.clientX, y: ev.clientY, vx: viewX, vy: viewY, pointerId: ev.pointerId };
      try { e.canvas.setPointerCapture(ev.pointerId); } catch (err) { /* iframe / WebGL capture */ }
      e.canvas.style.cursor = 'grabbing';
      return;
    }
    if (ev.button && ev.button !== 0) return;
    if (!e.inst || !e.inst.disturb) return;
    ev.preventDefault();
    bindPokeWindow();
    try { e.canvas.setPointerCapture(ev.pointerId); } catch (err) { /* iframe and some GPUs refuse capture on a WebGL canvas */ }
    const uv = pokeUV(e.canvas, ev);
    pokeStroke = { e, last: uv, dirty: true, pointerId: ev.pointerId };
    try { applyPoke(e, uv, null); } catch (err) { showError(err); }
  }
  function onPokeMove(ev) {
    if (panStroke && panStroke.pointerId === ev.pointerId) {
      viewX = panStroke.vx + (ev.clientX - panStroke.x);
      viewY = panStroke.vy + (ev.clientY - panStroke.y);
      applyView();
      return;
    }
    if (!pokeStroke || pokeStroke.pointerId !== ev.pointerId) return;
    const e = pokeStroke.e;
    if (!e.inst || !e.inst.disturb) return;
    const uv = pokeUV(e.canvas, ev);
    if (Math.hypot(uv.x - pokeStroke.last.x, uv.y - pokeStroke.last.y) < 0.004) return;
    try { applyPoke(e, uv, pokeStroke.last); } catch (err) { showError(err); }
    pokeStroke.last = uv;
    pokeStroke.dirty = true;
  }
  function onPokeUp(ev) {
    if (panStroke && (ev.pointerId == null || panStroke.pointerId === ev.pointerId)) {
      const cur = instances[currentId];
      if (cur && cur.canvas) cur.canvas.style.cursor = '';
      panStroke = null;
      return;
    }
    if (!pokeStroke || (ev.pointerId != null && pokeStroke.pointerId !== ev.pointerId)) return;
    const e = pokeStroke.e;
    try { if (e && e.canvas && e.canvas.releasePointerCapture) e.canvas.releasePointerCapture(ev.pointerId); } catch (err) { /* already released */ }
    const dirty = pokeStroke.dirty;
    pokeStroke = null;
    if (!dirty) return;
    snapshot('poke');
    scheduleHistory({ allowSameHash: true });
  }
  let pokeCursor = { x: 0.5, y: 0.5 };
  function hidePokeAim() {
    const aim = $('poke-aim');
    if (aim) { aim.classList.remove('on'); aim.hidden = true; }
  }
  function placePokeAim(canvas, uv) {
    const aim = $('poke-aim'); if (!aim || !canvas) return;
    const stage = $('stage'); if (!stage) return;
    const cr = canvas.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    aim.hidden = false;
    aim.classList.add('on');
    aim.style.left = (cr.left - sr.left + uv.x * cr.width) + 'px';
    aim.style.top = (cr.top - sr.top + uv.y * cr.height) + 'px';
  }
  function onPokeKey(e, ev) {
    if (!e.inst || !e.inst.disturb) return;
    const keys = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Enter: 1 };
    if (!keys[ev.key]) return;
    ev.preventDefault();
    const step = ev.shiftKey ? 0.02 : 0.05;
    const prev = { x: pokeCursor.x, y: pokeCursor.y, yGL: 1 - pokeCursor.y };
    if (ev.key === 'ArrowLeft') pokeCursor.x = util.clamp(pokeCursor.x - step, 0, 1);
    else if (ev.key === 'ArrowRight') pokeCursor.x = util.clamp(pokeCursor.x + step, 0, 1);
    else if (ev.key === 'ArrowUp') pokeCursor.y = util.clamp(pokeCursor.y - step, 0, 1);
    else if (ev.key === 'ArrowDown') pokeCursor.y = util.clamp(pokeCursor.y + step, 0, 1);
    const uv = { x: pokeCursor.x, y: pokeCursor.y, yGL: 1 - pokeCursor.y };
    placePokeAim(e.canvas, uv);
    if (ev.key === 'Enter' || ev.shiftKey) {
      try { applyPoke(e, uv, ev.shiftKey && ev.key !== 'Enter' ? prev : null); } catch (err) { showError(err); }
      snapshot('poke');
      scheduleHistory({ allowSameHash: true });
    }
    const hint = $('witness-hint');
    if (hint) hint.textContent = 'Arrows move the poke. Enter applies. Shift+arrow drags.';
  }

  const LIVE_CAP = 16;
  const GL_CAP = 8;
  const visitOrder = [];
  function touchLive(id) {
    const i = visitOrder.indexOf(id);
    if (i >= 0) visitOrder.splice(i, 1);
    visitOrder.push(id);
  }
  function disposeEntry(id) {
    const old = instances[id];
    if (!old || id === currentId) return;
    try { persist(id); } catch (err) { /* keep going; the canvas has to go */ }
    try { old.inst.pause && old.inst.pause(); } catch (err) { /* ignore */ }
    if (old.usesGL) {
      try {
        const gl = glContexts.get(old.canvas);
        const lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (err) { /* already gone */ }
    }
    try { old.inst.dispose && old.inst.dispose(); } catch (err) { /* ignore */ }
    try { old.canvas.remove(); } catch (err) { /* ignore */ }
    delete instances[id];
    const i = visitOrder.indexOf(id);
    if (i >= 0) visitOrder.splice(i, 1);
  }
  function trimLive() {
    const glIds = visitOrder.filter(id => instances[id] && instances[id].usesGL);
    while (glIds.length > GL_CAP) {
      const oldest = glIds.find(id => id !== currentId);
      if (!oldest) break;
      disposeEntry(oldest);
      glIds.splice(glIds.indexOf(oldest), 1);
    }
    while (visitOrder.length > LIVE_CAP) {
      const oldest = visitOrder.find(id => id !== currentId);
      if (!oldest) break;
      disposeEntry(oldest);
    }
  }

  function switchTo(id) {
    if (!byId[id]) id = modules[0].id;
    if (currentId === id) return;
    const prev = instances[currentId];
    if (recorder) stopRecord();
    if (prev) { prev.canvas.hidden = true; try { prev.inst.pause && prev.inst.pause(); } catch (e) { /* ignore */ } }
    currentId = id;
    if (faultFor && faultFor !== id) clearFault();
    let e = ensureEntry(byId[id]);
    if (e.contextLost) {
      rebuildEntry(id);
      e = instances[id] || e;
    }
    touchLive(id);
    e.canvas.hidden = false;
    resetView();
    for (const b of document.querySelectorAll('.tab')) {
      const on = b.dataset.id === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      // the strip scrolls horizontally on narrow screens, so pull the active tab into view
      if (on && b.scrollIntoView) { try { b.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (err) { b.scrollIntoView(); } }
    }
    buildSidebar(e);
    buildTopControls(e);
    renderStatus();
    const changed = fitCanvas(e);
    if (!e.started) { e.started = true; regenerate({ skipHistory: true, skipSnap: true }); }
    else {
      if (changed && e.inst.resize) { try { e.inst.resize(); } catch (err) { showError(err); } }
      if (!e.paused) { try { e.inst.resume && e.inst.resume(); } catch (err) { showError(err); } }
    }
    // Lazy renderers have now created their contexts, so include them in the cap.
    trimLive();
    persist(id);
    updateDims();
    updateColoPreview();
    document.title = 'GENChase · ' + byId[id].name;
    resetWitness();
    markPokeable();
    scheduleHash();
  }

  /* ---- sidebar ---- */
  let controls = {}, dimmers = [];
  function refreshDims() { for (const d of dimmers) d(); }

  let dragSnap = false;
  function setParam(e, key, value, kind, phase) {
    if (phase === 'drag' && !dragSnap) { snapshot(key); dragSnap = true; }
    if (phase === 'commit') dragSnap = false;
    e.state[key] = value;
    if (e.mod.onParam) e.mod.onParam(e.state, key);           // e.g. keep min <= max
    for (const k in controls) if (controls[k].sync) controls[k].sync(e.state[k]);
    refreshDims();
    const commit = phase !== 'drag';
    const fromSlider = phase === 'drag' || phase === 'commit';
    if (kind === 'geom') {
      if (commit) regenerate(fromSlider ? { skipSnap: true } : { snapLabel: key });
      else scheduleRegen({ skipSnap: true, skipHistory: true });
    } else if (kind === 'paint') {
      repaint();
      if (commit) scheduleHistory();
    } else if (kind === 'live') {
      try { e.inst.live && e.inst.live(key, value); } catch (err) { showError(err); }
      persist(e.mod.id);
      if (commit) scheduleHistory();
    } else persist(e.mod.id);
    if (commit) scheduleHash();
  }

  function bindRange(input, apply) {
    input.addEventListener('pointerdown', () => { dragSnap = false; });
    input.addEventListener('input', () => apply('drag'));
    input.addEventListener('change', () => apply('commit'));
  }

  function buildField(e, f) {
    const state = e.state, id = 'p-' + e.mod.id + '-' + f.key;
    let row;
    if (f.type === 'range') {
      const fmt = f.fmt || (v => String(v));
      const val = h('span', { class: 'val', text: fmt(state[f.key]) });
      const input = h('input', { type: 'range', id, min: f.min, max: f.max, step: f.step, value: state[f.key], 'aria-label': f.label });
      bindRange(input, phase => {
        const v = Number(input.value); val.textContent = fmt(v); setParam(e, f.key, v, f.kind, phase);
      });
      controls[f.key] = { sync: v => { input.value = v; val.textContent = fmt(v); } };
      row = h('div', { class: 'row' }, [h('label', { class: 'lbl', for: id, text: f.label }), val, input]);
    } else if (f.type === 'seg') {
      const btns = f.options.map(([v, label]) => h('button', {
        type: 'button', text: label, id: id + '-' + v, 'aria-pressed': String(state[f.key] === v),
        onclick: () => setParam(e, f.key, v, f.kind),
      }));
      controls[f.key] = { sync: v => btns.forEach((b, i) => b.setAttribute('aria-pressed', String(f.options[i][0] === v))) };
      const wrap = f.wrap || f.options.length > 4;
      row = h('div', { class: 'row' }, [h('span', { class: 'lbl', text: f.label }), h('span'), h('div', { class: 'seg' + (wrap ? ' wrap' : ''), role: 'group', 'aria-label': f.label }, btns)]);
    } else if (f.type === 'toggle') {
      const sw = h('button', { type: 'button', class: 'switch', role: 'switch', id, 'aria-checked': String(!!state[f.key]), 'aria-label': f.label });
      sw.addEventListener('click', () => setParam(e, f.key, !state[f.key], f.kind));
      controls[f.key] = { sync: v => sw.setAttribute('aria-checked', String(!!v)) };
      row = h('div', { class: 'toggle' }, [h('label', { class: 'lbl', for: id, text: f.label }), sw]);
    } else if (f.type === 'action') {
      const btn = h('button', { type: 'button', class: 'btn small', id, text: f.label });
      btn.addEventListener('click', () => { try { e.inst.action && e.inst.action(f.key); } catch (err) { showError(err); } });
      controls[f.key] = {};
      row = h('div', { class: 'btnrow' }, [btn]);
    }
    if (f.dimUnless && row) dimmers.push(() => row.classList.toggle('dim', !f.dimUnless(state)));
    if (f.hint && row) {
      // a hint inside a flex toggle row would sit beside the switch, so stack them
      return h('div', { class: 'field' }, [row, h('p', { class: 'hint field-hint', text: f.hint })]);
    }
    return row;
  }

  function buildPaletteEditor(e) {
    const state = e.state;
    const wrap = h('div', { class: 'swatches' });
    const strip = h('div', { class: 'palette-strip', 'aria-hidden': 'true' });
    const presetSel = h('select', { id: 'p-paletteset', 'aria-label': 'Palette' },
      [h('option', { value: '', text: 'Load a palette…' })].concat(Object.keys(PALETTES).map(k => h('option', { value: k, text: k[0].toUpperCase() + k.slice(1) }))));
    presetSel.addEventListener('change', () => {
      const p = PALETTES[presetSel.value]; presetSel.value = '';
      if (!p) return;
      state.palette = p.colors.slice(); state.bg = p.bg;
      render(); afterPalette(true);
    });
    const afterPalette = structural => { if (structural && e.mod.paletteIsGeom) scheduleRegen(); else repaint(); };
    const randBtn = h('button', { class: 'btn small', type: 'button', text: 'Random palette', onclick: () => {
      const p = generatePalette(makeRng(state.seed + '/pal/' + Date.now()));
      state.palette = p.colors; state.bg = p.bg; render(); afterPalette(true);
    } });
    const shuffleBtn = h('button', { class: 'btn small', type: 'button', text: 'Shuffle order', onclick: () => {
      for (let i = state.palette.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = state.palette[i]; state.palette[i] = state.palette[j]; state.palette[j] = t; }
      render(); afterPalette(false);
    } });
    const revBtn = h('button', { class: 'btn small', type: 'button', text: 'Reverse', onclick: () => { state.palette.reverse(); render(); afterPalette(false); } });
    const swapBtn = h('button', { class: 'btn small', type: 'button', text: 'Swap bg ↔ first', onclick: () => {
      const t = state.bg; state.bg = state.palette[0]; state.palette[0] = t; render(); afterPalette(false);
    } });
    const icon = d => '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.4">' + d + '</svg>';
    function swatchRow(i, isBg) {
      const color = isBg ? state.bg : state.palette[i];
      const inp = h('input', { type: 'color', value: color, id: isBg ? 'p-bg' : 'p-col-' + i, 'aria-label': isBg ? 'Background color' : 'Color ' + (i + 1) });
      const hex = h('input', { type: 'text', class: 'hex', value: color, spellcheck: 'false', 'aria-label': (isBg ? 'Background' : 'Color ' + (i + 1)) + ' hex' });
      const commit = v => {
        if (!/^#[0-9a-f]{6}$/i.test(v)) return;
        v = v.toUpperCase();
        if (isBg) state.bg = v; else state.palette[i] = v;
        inp.value = v; hex.value = v; paintStrip(); afterPalette(false);
      };
      inp.addEventListener('input', () => commit(inp.value));
      hex.addEventListener('change', () => { const t = hex.value.trim(); commit(t.startsWith('#') ? t : '#' + t); hex.value = isBg ? state.bg : state.palette[i]; });
      const ops = h('div', { class: 'ops' });
      if (!isBg) {
        const up = h('button', { type: 'button', title: 'Move up', 'aria-label': 'Move color up', html: icon('<path d="M2 8l4-4 4 4"/>') });
        const dn = h('button', { type: 'button', title: 'Move down', 'aria-label': 'Move color down', html: icon('<path d="M2 4l4 4 4-4"/>') });
        const dup = h('button', { type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate color', html: icon('<rect x="1.5" y="1.5" width="6" height="6" rx="1"/><rect x="4.5" y="4.5" width="6" height="6" rx="1"/>') });
        const rm = h('button', { type: 'button', title: 'Remove', 'aria-label': 'Remove color', html: icon('<path d="M3 3l6 6M9 3l-6 6"/>') });
        up.disabled = i === 0; dn.disabled = i === state.palette.length - 1;
        rm.disabled = state.palette.length <= 1; dup.disabled = state.palette.length >= 16;
        up.addEventListener('click', () => { const t = state.palette[i]; state.palette[i] = state.palette[i - 1]; state.palette[i - 1] = t; render(); afterPalette(false); });
        dn.addEventListener('click', () => { const t = state.palette[i]; state.palette[i] = state.palette[i + 1]; state.palette[i + 1] = t; render(); afterPalette(false); });
        dup.addEventListener('click', () => { state.palette.splice(i + 1, 0, state.palette[i]); render(); afterPalette(true); });
        rm.addEventListener('click', () => { state.palette.splice(i, 1); render(); afterPalette(true); });
        ops.append(up, dn, dup, rm);
      }
      return h('div', { class: 'sw' + (isBg ? ' bg' : '') }, [inp, hex, ops]);
    }
    function paintStrip() { strip.innerHTML = ''; for (const c of state.palette) strip.appendChild(h('span', { style: 'background:' + c })); }
    function render() {
      wrap.innerHTML = '';
      wrap.appendChild(h('div', { class: 'mini-label', text: 'Background' }));
      wrap.appendChild(swatchRow(0, true));
      wrap.appendChild(h('div', { class: 'mini-label', text: e.mod.paletteLabel || 'Colors (order matters for ramps)', style: 'margin-top:6px' }));
      state.palette.forEach((_, i) => wrap.appendChild(swatchRow(i, false)));
      const add = h('button', { class: 'btn small', type: 'button', text: '+ Add color', style: 'align-self:flex-start;margin-top:2px' });
      add.disabled = state.palette.length >= 16;
      add.addEventListener('click', () => {
        const g = makeRng(state.seed + '/' + state.palette.length + '/' + Date.now());
        state.palette.push(hslToHex(g() * 360, 45 + g() * 40, 35 + g() * 35));
        render(); afterPalette(true);
      });
      wrap.appendChild(add);
      paintStrip();
    }
    controls.__palette = { sync: render };
    render();
    return h('div', { class: 'body' }, [presetSel, h('div', { class: 'btnrow' }, [randBtn, shuffleBtn, revBtn, swapBtn]), strip, wrap]);
  }

  function buildSidebar(e) {
    const side = $('side');
    side.innerHTML = '';
    controls = {}; dimmers = [];
    const mod = e.mod;
    side.appendChild(h('div', { class: 'modhead' }, [
      h('h2', { text: mod.name }),
      mod.subtitle ? h('p', { class: 'modsub', text: mod.subtitle }) : null,
      mod.equation ? h('p', { class: 'modeq', text: mod.equation }) : null,
    ]));
    if (mod.blurb || mod.credit) {
      const about = h('details', { class: 'group about' }, [h('summary', { text: 'What this is' })]);
      let openAbout = false;
      try { openAbout = localStorage.getItem(STORE + 'about') === '1'; } catch (err) { openAbout = false; }
      if (openAbout) about.setAttribute('open', '');
      about.addEventListener('toggle', () => {
        try { localStorage.setItem(STORE + 'about', about.open ? '1' : '0'); } catch (err) { /* ignore */ }
      });
      const body = h('div', { class: 'body' });
      if (mod.blurb) body.appendChild(h('p', { class: 'about-text', text: mod.blurb }));
      if (mod.credit) body.appendChild(h('p', { class: 'about-credit', text: mod.credit }));
      about.appendChild(body);
      side.appendChild(about);
    }
    const groups = [];
    for (const f of mod.schema) if (!groups.includes(f.group)) groups.push(f.group);
    const closed = new Set(mod.closedGroups || []);
    const palName = mod.paletteGroup || 'Color';
    let paletteDone = false;
    let first = true;
    for (const g of groups) {
      const det = h('details', { class: 'group' }, [h('summary', { text: g })]);
      if (!closed.has(g)) det.setAttribute('open', '');
      const body = h('div', { class: 'body' });
      for (const f of mod.schema) if (f.group === g) { const row = buildField(e, f); if (row) body.appendChild(row); }
      if (mod.hints && mod.hints[g]) body.appendChild(h('p', { class: 'hint', text: mod.hints[g] }));
      if (mod.palette && g === palName) { det.appendChild(buildPaletteEditor(e)); paletteDone = true; }
      det.appendChild(body);
      side.appendChild(det);
      if (first && mod.palette && !paletteDone) {
        const pal = h('details', { class: 'group', open: '' }, [h('summary', { text: palName })]);
        pal.appendChild(buildPaletteEditor(e));
        side.appendChild(pal);
        paletteDone = true;
      }
      first = false;
    }
    if (mod.palette && !paletteDone) {
      const det = h('details', { class: 'group', open: '' }, [h('summary', { text: palName })]);
      det.appendChild(buildPaletteEditor(e));
      side.appendChild(det);
    }
    refreshDims();
  }

  function syncAll(e) {
    for (const k in controls) if (controls[k].sync) controls[k].sync(k === '__palette' ? undefined : e.state[k]);
    $('seed').value = e.state.seed;
    if (headlineInput && e.mod.headline) headlineInput.value = e.state[e.mod.headline];
    refreshDims();
  }

  /* ---- top bar controls (presets + headline) ---- */
  let headlineInput = null;
  function buildTopControls(e) {
    const mod = e.mod;
    const sel = $('preset');
    sel.innerHTML = '';
    sel.appendChild(h('option', { value: '', text: 'Presets…' }));
    for (const k in mod.presets) sel.appendChild(h('option', { value: k, text: mod.presets[k].label }));
    sel.hidden = !Object.keys(mod.presets).length;

    const box = $('headline');
    box.innerHTML = ''; headlineInput = null;
    const f = mod.headline && mod.schema.find(x => x.key === mod.headline && x.type === 'range');
    if (f) {
      box.hidden = false;
      const label = h('label', { for: 'headline-input', text: (mod.headlineLabel || f.label).toLowerCase() });
      headlineInput = h('input', { id: 'headline-input', type: 'number', min: f.min, max: f.max, step: f.step, inputmode: 'numeric', 'aria-label': f.label, value: e.state[f.key] });
      let timer = null;
      headlineInput.addEventListener('input', () => {
        const raw = Number(headlineInput.value); if (!isFinite(raw)) return;
        const v = clamp(Math.round(raw / f.step) * f.step, f.min, f.max);
        clearTimeout(timer);
        timer = setTimeout(() => { setParam(e, f.key, v, f.kind, 'drag'); }, 250);
      });
      headlineInput.addEventListener('change', () => {
        const raw = Number(headlineInput.value); if (!isFinite(raw)) return;
        const v = clamp(Math.round(raw / f.step) * f.step, f.min, f.max);
        clearTimeout(timer);
        setParam(e, f.key, v, f.kind, 'commit');
      });
      headlineInput.addEventListener('blur', () => { headlineInput.value = e.state[f.key]; });
      headlineInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') headlineInput.blur(); });
      box.append(label, headlineInput);
    } else box.hidden = true;
    $('seed').value = e.state.seed;
  }

  /* ---- panel side ---- */
  let panelSide = 'left';
  function applyPanelSide() {
    const right = panelSide === 'right';
    $('main').classList.toggle('side-right', right);
    $('btn-side-label').textContent = right ? 'Panel right' : 'Panel left';
    $('btn-side-divider').setAttribute('d', right ? 'M10 2.5v11' : 'M6 2.5v11');
    const e = instances[currentId];
    if (e) { const changed = fitCanvas(e); if (changed && e.inst.resize) { try { e.inst.resize(); } catch (err) { showError(err); } } }
  }

  /* ---- toast ---- */
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---- print sizing ---- */
  // Long edge in inches. Fine-art printers take 300-360 ppi native, so these
  // are real paper sizes rather than arbitrary pixel counts.
  const PRINT_INCHES = [8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 30, 36, 40, 44, 48, 60];
  const PRINT_DPI = [[300, '300 ppi'], [360, '360 ppi'], [450, '450 ppi'], [600, '600 ppi']];
  const MAX_EDGE = 16000;          // browser canvas limit territory
  const MAX_AREA = 132e6;          // ~132 MP: the most a browser will reliably encode to PNG
  let maxTexSize = 8192;
  try {
    const probe = document.createElement('canvas');
    const g = probe.getContext('webgl2') || probe.getContext('webgl');
    if (g) maxTexSize = g.getParameter(g.MAX_TEXTURE_SIZE) || maxTexSize;
  } catch (err) { /* keep the conservative default */ }
  let printInches = 20, printDpi = 300;

  function currentAspect() {
    const e = instances[currentId];
    if (!e) return 1;
    return (e.inst.aspect && e.inst.aspect(e.state)) || 1;
  }
  // ar = height / width
  function printSpec() {
    const ar = currentAspect();
    let hIn = printInches, wIn = printInches;
    if (ar >= 1) wIn = printInches / ar; else hIn = printInches * ar;
    let pw = Math.round(wIn * printDpi), ph = Math.round(hIn * printDpi);
    let clamp = 1, clampWhy = '';
    if (Math.max(pw, ph) > MAX_EDGE) { clamp = MAX_EDGE / Math.max(pw, ph); clampWhy = 'canvas'; }
    if (Math.max(pw, ph) * clamp > maxTexSize) { clamp = Math.min(clamp, maxTexSize / Math.max(pw, ph)); clampWhy = 'texture'; }
    if (pw * ph * clamp * clamp > MAX_AREA) { clamp = Math.min(clamp, Math.sqrt(MAX_AREA / (pw * ph))); clampWhy = 'encode'; }
    const clamped = clamp < 0.999;
    if (clamped) { pw = Math.round(pw * clamp); ph = Math.round(ph * clamp); }
    const effDpi = Math.round(pw / wIn);
    return { ar, wIn, hIn, pw, ph, clamped, clampWhy, dpi: printDpi, effDpi, mp: (pw * ph) / 1e6 };
  }
  const inTxt = v => (Math.round(v * 10) / 10).toFixed(1);
  const cmTxt = v => (Math.round(v * 2.54 * 10) / 10).toFixed(1);
  function printLabel(sp) {
    return inTxt(sp.wIn) + ' × ' + inTxt(sp.hIn) + ' in · ' +
           cmTxt(sp.wIn) + ' × ' + cmTxt(sp.hIn) + ' cm · ' +
           sp.pw.toLocaleString() + ' × ' + sp.ph.toLocaleString() + ' px';
  }
  function updateDims() {
    const el = $('export-dims');
    if (!el || !instances[currentId]) return;
    const sp = printSpec();
    const line = printLabel(sp) + (sp.clamped ? ' · ' + sp.effDpi + ' ppi' : '') + (colophon ? ' · colophon' : '');
    el.textContent = line;
    const dock = $('dock-dims');
    if (dock) { dock.textContent = line; dock.hidden = false; }
    const why = sp.clampWhy === 'texture'
      ? ' Clamped to this device\'s GPU texture limit (' + maxTexSize.toLocaleString() + ' px), so the file lands at ' + sp.effDpi + ' ppi for that paper size.'
      : (sp.clamped ? ' Clamped to what a browser can encode, so the file lands at ' + sp.effDpi + ' ppi for that paper size.' : '');
    el.title = 'At ' + sp.dpi + ' ppi this piece prints ' + inTxt(sp.wIn) + ' × ' + inTxt(sp.hIn) + ' inches (' +
      cmTxt(sp.wIn) + ' × ' + cmTxt(sp.hIn) + ' cm) from a ' + sp.pw.toLocaleString() + ' × ' + sp.ph.toLocaleString() +
      ' pixel file, ' + sp.mp.toFixed(0) + ' megapixels.' + why +
      (colophon ? ' Colophon on: caption prints under the image.' : ' Colophon off: image only.');
    updateColoPreview();
  }

  /* ---- colophon: the piece, then the recipe that made it ---- */
  let colophon = false;
  let exportBusy = false;

  function syncColophonButtons() {
    const top = $('btn-colophon');
    const modal = $('export-colo-tog');
    if (top) {
      top.setAttribute('aria-checked', String(colophon));
      top.textContent = 'Colophon';
    }
    if (modal) modal.setAttribute('aria-checked', String(colophon));
    const sheet = $('sheet');
    if (sheet) sheet.classList.toggle('has-colo', colophon);
  }

  function updateColoPreview() {
    const cap = $('colo-preview');
    if (!cap) return;
    const e = instances[currentId];
    if (!colophon || !e) {
      cap.hidden = true;
      if ($('sheet')) $('sheet').classList.remove('has-colo');
      return;
    }
    cap.hidden = false;
    if ($('sheet')) $('sheet').classList.add('has-colo');
    const title = $('colo-title'), eq = $('colo-eq'), meta = $('colo-meta'), params = $('colo-params');
    if (title) title.textContent = 'GENChase · ' + e.mod.name;
    if (eq) { eq.textContent = e.mod.equation || ''; eq.hidden = !e.mod.equation; }
    const sp = printSpec();
    const L = sheetLayout(sp);
    if (meta) {
      meta.textContent = 'seed ' + e.state.seed + '   ·   image ' +
        inTxt(L.artWIn) + ' × ' + inTxt(L.artHIn) + ' in on a ' +
        inTxt(sp.wIn) + ' × ' + inTxt(sp.hIn) + ' in sheet   ·   ' + sp.effDpi + ' ppi';
    }
    if (params) params.textContent = paramText(e);
  }

  function setColophon(on, opts) {
    colophon = !!on;
    try { localStorage.setItem(STORE + 'colophon', colophon ? '1' : '0'); } catch (err) { /* ignore */ }
    syncColophonButtons();
    updateColoPreview();
    const e = instances[currentId];
    if (e) {
      const changed = fitCanvas(e);
      if (changed && e.inst.resize) { try { e.inst.resize(); } catch (err) { showError(err); } }
      else { try { e.inst.resize && e.inst.resize(); } catch (err) { /* ignore */ } }
    }
    updateDims();
    if (opts && opts.reexport && !$('modal-export').hidden && !exportBusy) doExport();
  }

  function paramText(e) {
    const st = e.state, parts = [];
    for (const f of e.mod.schema) {
      if (f.type === 'action') continue;
      const v = st[f.key];
      if (v === undefined) continue;
      let out;
      if (typeof v === 'boolean') out = v ? 'on' : 'off';
      else if (typeof v === 'number') out = (Math.abs(v) >= 1000 || Number.isInteger(v)) ? String(v) : String(Number(v.toPrecision(4)));
      else out = String(v);
      parts.push(f.key + '=' + out);
    }
    if (e.mod.palette) {
      parts.push('bg=' + st.bg);
      parts.push('palette=' + st.palette.join(','));
    }
    return parts.join('   ');
  }
  function wrapText(ctx, text, maxW) {
    const words = text.split(/\s+/).filter(Boolean), lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + '  ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('could not read the rendered image'));
      img.src = url;
    });
  }
  // Sheet layout: image inset in a paper margin, caption band beneath.
  // Type is sized in points against physical inches, then converted at the file's ppi, so 8 in / 300 ppi
  // does not print a 3 pt caption. Art size is the image window, not the sheet.
  function sheetLayout(sp) {
    const sheetW = sp.pw, sheetH = sp.ph;
    const small = Math.min(sheetW, sheetH);
    const pad = Math.round(small * 0.055);
    const dpi = sp.dpi || printDpi;
    const pt = (minPt, inchFrac) => Math.max(minPt, inchFrac * sp.wIn) / 72 * dpi;
    const fs = {
      title: pt(11, 0.16),
      eq: pt(8, 0.10),
      meta: pt(8, 0.085),
      p: pt(7, 0.072),
    };
    const bandH = Math.round(fs.title * 1.25 + fs.eq * 2.0 + fs.meta * 1.9 + 6 * fs.p * 1.55 + pad * 0.9);
    const innerW = sheetW - pad * 2, innerH = sheetH - pad * 2 - bandH;
    let artW = innerW, artH = Math.round(innerW * sp.ar);
    if (artH > innerH) { artH = innerH; artW = Math.round(innerH / sp.ar); }
    return {
      sheetW, sheetH, pad, fs, artW, artH,
      artWIn: artW / dpi, artHIn: artH / dpi,
    };
  }
  async function composeSheet(artBlob, e, sp) {
    const L = sheetLayout(sp);
    const { sheetW, sheetH, pad, fs } = L;
    const meas = document.createElement('canvas').getContext('2d');
    const monoP = fs.p + 'px "Geist Mono", ui-monospace, monospace';
    meas.font = monoP;
    const pLines = wrapText(meas, paramText(e), sheetW - pad * 2).slice(0, 12);
    const bandH = Math.round(fs.title * 1.25 + fs.eq * 2.0 + fs.meta * 1.9 + pLines.length * fs.p * 1.55 + pad * 0.9);
    const innerW = sheetW - pad * 2, innerH = sheetH - pad * 2 - bandH;
    let artW = innerW, artH = Math.round(innerW * sp.ar);
    if (artH > innerH) { artH = innerH; artW = Math.round(innerH / sp.ar); }
    const artX = Math.round((sheetW - artW) / 2), artY = pad;
    L.artW = artW; L.artH = artH; L.artWIn = artW / (sp.dpi || printDpi); L.artHIn = artH / (sp.dpi || printDpi);

    // the module rendered at sheet size; draw it into the image window
    const url = URL.createObjectURL(artBlob);
    let img;
    try { img = await loadImage(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }

    const c = document.createElement('canvas');
    c.width = sheetW; c.height = sheetH;
    const cx = c.getContext('2d');
    const light = util.isLight(e.state.bg);
    const paper = light ? '#FAF7F1' : '#0A090B';
    const ink = light ? '#17140F' : '#EDE8DF';
    const mutedInk = light ? 'rgba(23,20,15,0.62)' : 'rgba(237,232,223,0.60)';
    const faintInk = light ? 'rgba(23,20,15,0.42)' : 'rgba(237,232,223,0.42)';
    cx.fillStyle = paper; cx.fillRect(0, 0, sheetW, sheetH);
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, artX, artY, artW, artH);
    cx.strokeStyle = light ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.18)';
    cx.lineWidth = Math.max(1, sheetW / 2600);
    cx.strokeRect(artX + cx.lineWidth / 2, artY + cx.lineWidth / 2, artW - cx.lineWidth, artH - cx.lineWidth);

    let y = artY + artH + pad * 0.78 + fs.title;
    cx.textBaseline = 'alphabetic';
    cx.fillStyle = ink;
    cx.font = '400 ' + fs.title + 'px "Instrument Serif", Georgia, serif';
    cx.fillText('GENChase · ' + e.mod.name, pad, y);

    // palette swatches, right-aligned on the title line
    if (e.mod.palette) {
      const sw = Math.round(fs.title * 0.62), gap = Math.round(sw * 0.32);
      const cols = [e.state.bg].concat(e.state.palette);
      let x = sheetW - pad - cols.length * (sw + gap) + gap;
      for (const col of cols) {
        cx.fillStyle = col;
        cx.fillRect(x, y - sw, sw, sw);
        cx.strokeStyle = faintInk; cx.lineWidth = Math.max(1, sheetW / 5000);
        cx.strokeRect(x + 0.5, y - sw + 0.5, sw - 1, sw - 1);
        x += sw + gap;
      }
    }

    if (e.mod.equation) {
      y += fs.eq * 1.75;
      cx.fillStyle = mutedInk;
      cx.font = fs.eq + 'px "Geist Mono", ui-monospace, monospace';
      cx.fillText(e.mod.equation, pad, y);
    }

    y += fs.meta * 1.85;
    cx.fillStyle = ink;
    cx.font = fs.meta + 'px "Geist Mono", ui-monospace, monospace';
    cx.fillText('seed ' + e.state.seed + '   ·   image ' + inTxt(L.artWIn) + ' × ' + inTxt(L.artHIn) +
      ' in on a ' + inTxt(sp.wIn) + ' × ' + inTxt(sp.hIn) + ' in sheet   ·   ' + sp.effDpi + ' ppi   ·   ' +
      new Date().toISOString().slice(0, 10), pad, y);

    cx.fillStyle = faintInk;
    cx.font = monoP;
    for (const line of pLines) { y += fs.p * 1.55; cx.fillText(line, pad, y); }

    return util.toBlob(c);
  }

  /* ---- export ---- */
  let lastUrl = null, lastBlob = null, lastName = '';
  async function doExport() {
    const e = instances[currentId]; if (!e) return;
    if (exportBusy) return;
    exportBusy = true;
    const sp = printSpec();
    const pw = sp.pw, ph = sp.ph;
    const modal = $('modal-export'), img = $('export-img'), note = $('export-note'), dl = $('export-download'), save = $('export-save');
    const pnote = $('export-print');
    const svgBtn = $('export-svg');
    const jpgBtn = $('export-jpg');
    const webpBtn = $('export-webp');
    const clipBtn = $('export-clip');
    const cancel = $('export-cancel');
    const title = $('export-title');
    if (title) title.textContent = (e.mod.name || e.mod.id) + ' · ' + (e.state.seed || '');
    if (svgBtn) svgBtn.hidden = true;
    if (jpgBtn) jpgBtn.hidden = true;
    if (webpBtn) webpBtn.hidden = true;
    if (clipBtn) clipBtn.hidden = true;
    img.hidden = true; dl.hidden = true; save.hidden = true;
    if (cancel) cancel.hidden = false;
    const job = {
      abort: false,
      started: Date.now(),
      progress(msg) { if (!this.abort && note) note.textContent = msg; },
    };
    S.exportJob = job;
    note.textContent = 'Rendering ' + pw.toLocaleString() + ' × ' + ph.toLocaleString() + ' px (' + sp.mp.toFixed(0) + ' MP) at print resolution (not an upscale of the screen)…' +
      (sp.mp > 45 ? ' A file this size takes a while and a lot of memory. Cancel stops it.' : ' Cancel stops it.');
    note.classList.remove('err');
    pnote.hidden = false;
    const lay = colophon ? sheetLayout(sp) : null;
    pnote.textContent = (colophon
      ? ('Image ' + inTxt(lay.artWIn) + ' × ' + inTxt(lay.artHIn) + ' in on a ' + inTxt(sp.wIn) + ' × ' + inTxt(sp.hIn) + ' in sheet (' +
         cmTxt(sp.wIn) + ' × ' + cmTxt(sp.hIn) + ' cm) at ' + sp.effDpi + ' ppi. The image sits in a paper margin with the technique, its rule, the seed and every parameter captioned beneath.')
      : ('Prints ' + inTxt(sp.wIn) + ' × ' + inTxt(sp.hIn) + ' in (' + cmTxt(sp.wIn) + ' × ' + cmTxt(sp.hIn) +
         ' cm) at ' + sp.effDpi + ' ppi.')) +
      (sp.clamped ? (sp.clampWhy === 'texture'
        ? ' Requested ' + sp.dpi + ' ppi was clamped to this device\'s GPU texture limit (' + maxTexSize.toLocaleString() + ' px).'
        : ' Requested ' + sp.dpi + ' ppi was clamped to the largest file a browser can encode.') : '');
    openModal('modal-export');
    const tick = setInterval(() => {
      if (!exportBusy || job.abort) return;
      if (note && note.textContent.indexOf('Tile ') !== 0) {
        const s = Math.round((Date.now() - job.started) / 1000);
        if (s >= 2) job.progress('Rendering… ' + s + ' s. Cancel stops it.');
      }
    }, 400);
    try {
      await new Promise(r => setTimeout(r, 30));
      if (job.abort) throw new Error('cancelled');
      if (colophon && document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (err) { /* metrics fall back */ } }
      if (job.abort) throw new Error('cancelled');
      let ss = 1, blob = null, usedVector = false, svgBlob = null, fieldNote = '';
      if (e.inst.exportSVG) {
        try {
          // The contract says exportSVG returns a string or a Blob. Only the Blob was handled, so a
          // module returning the document text threw inside createObjectURL, and because that throw
          // happened outside this guard it took the whole export with it: the Arctic Circle and
          // Schramm-Loewner tabs could not export at any size, in any format, vector or raster.
          const svg = await Promise.resolve(e.inst.exportSVG(pw, ph));
          svgBlob = typeof svg === 'string' ? new Blob([svg], { type: 'image/svg+xml' }) : svg;
        } catch (svgErr) { svgBlob = null; }
      }
      if (svgBlob) {
        usedVector = true;
        const url = URL.createObjectURL(svgBlob);
        try {
          const im = await loadImage(url);
          const c = document.createElement('canvas');
          c.width = pw; c.height = ph;
          const cx = c.getContext('2d', { alpha: false });
          cx.fillStyle = (e.state && e.state.bg) || '#fff';
          cx.fillRect(0, 0, pw, ph);
          cx.imageSmoothingEnabled = true;
          cx.imageSmoothingQuality = 'high';
          cx.drawImage(im, 0, 0, pw, ph);
          blob = await util.toBlob(c);
        } catch (ripErr) {
          usedVector = false;
          svgBlob = null;
        } finally { URL.revokeObjectURL(url); }
      }
      if (!blob) {
        // Supersampling is right for a technique that recomputes itself per pixel: rendering at twice the
        // print size and averaging down is how a fractal or a caustic gets its edges antialiased. It is
        // wrong for a field that was magnified from a simulation grid. That image is already band-limited
        // by the grid, so rendering it larger adds no detail and averaging it down is a second low-pass on
        // top of the interpolation: strictly softer, for twice the memory. A technique that draws a coarse
        // grid says so through fieldCells(), and then the plate is rendered once, at size.
        let field = null;
        try { field = e.inst.fieldCells && e.inst.fieldCells(); } catch (fe) { field = null; }
        const gridLimited = !!(field && field[0] > 0 && pw >= field[0] * 2);
        ss = (!gridLimited && pw * ph * 4 < MAX_AREA) ? 2 : 1;
        if (gridLimited) fieldNote = ' The field is ' + field[0] + ' × ' + field[1] + ' cells, so one cell is about ' +
          (pw / field[0]).toFixed(1) + ' px here and the detail is set by the simulation, not by the paper: raise the grid for a finer plate.';
        try {
          blob = await e.inst.exportPNG(pw * ss, ph * ss);
        } catch (hiErr) {
          if (ss === 1) throw hiErr;
          ss = 1;
          blob = await e.inst.exportPNG(pw, ph);
        }
        if (!blob) throw new Error('empty export');
        if (e.inst.exportNote) fieldNote += e.inst.exportNote;
        if (ss > 1) {
          const url = URL.createObjectURL(blob);
          try {
            const im = await loadImage(url);
            const c = document.createElement('canvas');
            c.width = pw; c.height = ph;
            const cx = c.getContext('2d');
            cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
            cx.drawImage(im, 0, 0, pw, ph);
            blob = await util.toBlob(c);
          } catch (ssErr) {
            try { blob = await e.inst.exportPNG(pw, ph); ss = 1; } catch (e2) { /* keep oversized blob */ }
          } finally { URL.revokeObjectURL(url); }
        }
      }
      if (job.abort) throw new Error('cancelled');
      if (colophon) blob = await composeSheet(blob, e, sp);
      if (job.abort) throw new Error('cancelled');
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastBlob = blob; lastUrl = URL.createObjectURL(blob);
      lastName = 'genchase-' + e.mod.id + '-' + e.state.seed.replace(/[^a-z0-9_-]+/gi, '_') + '-' +
        inTxt(sp.wIn).replace('.', '_') + 'x' + inTxt(sp.hIn).replace('.', '_') + 'in-' + sp.effDpi + 'ppi' +
        (colophon ? '-with-code' : '') + '.png';
      img.src = lastUrl; img.hidden = false;
      const size = (blob.size / 1048576).toFixed(1) + ' MB';
      const dims = pw.toLocaleString() + ' × ' + ph.toLocaleString() + ' px, ' + size + '. ';
      if (downloads) { save.hidden = false; note.textContent = dims + (usedVector ? 'PNG is a vector RIP at print pixels. ' : '') + 'Save PNG asks you to confirm the download.'; }
      else { dl.href = lastUrl; dl.download = lastName; dl.hidden = false; note.textContent = dims + (usedVector ? 'Rasterized from SVG at print pixels (vector RIP).' : ('Recomputed at print pixels' + (ss > 1 ? ' with 2× supersampling' : '') + '.') + fieldNote) + ' If the download button does nothing, right-click the image and save it.'; }
      if (svgBlob && svgBtn) {
        const svgUrl = URL.createObjectURL(svgBlob);
        svgBtn.href = svgUrl;
        svgBtn.download = lastName.replace(/\.png$/i, '.svg');
        svgBtn.hidden = false;
      }
      if (jpgBtn) { jpgBtn.hidden = false; jpgBtn.removeAttribute('href'); }
      if (webpBtn) { webpBtn.hidden = false; webpBtn.removeAttribute('href'); }
      if (clipBtn) {
        clipBtn.hidden = !canFilm();
        clipBtn.textContent = '8 s clip';
      }
    } catch (err) {
      const cancelled = (job && job.abort) || /cancell/i.test(String(err && err.message || err));
      if (cancelled) {
        note.textContent = 'Cancelled.';
        note.classList.remove('err');
        img.hidden = true;
      } else {
        console.error(err);
        note.textContent = 'Export failed at this size (' + (err && err.message ? err.message.split('\n')[0] : err) + '). Try a smaller paper size or a lower ppi.';
        note.classList.add('err');
      }
    } finally {
      clearInterval(tick);
      exportBusy = false;
      if (S.exportJob === job) S.exportJob = null;
      if (cancel) cancel.hidden = true;
    }
  }
  async function saveViaCapability() {
    const save = $('export-save');
    if (!downloads || !lastBlob) return;
    save.disabled = true;
    try { await downloads.save({ filename: lastName, data: lastBlob }); toast('Saved ' + lastName); }
    catch (err) {
      const code = err && err.code;
      if (code === 'declined') { /* viewer said no */ }
      else if (code === 'rate_limited') toast('A save prompt is already open. Try again in a moment.');
      else if (code === 'unavailable' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') {
        downloads = null; save.hidden = true;
        const dl = $('export-download'); dl.href = lastUrl; dl.download = lastName; dl.hidden = false;
        toast('Saving is unavailable here; right-click the image to save it.');
      } else toast('Could not save the file' + (err && err.message ? ': ' + err.message : '.'));
    } finally { save.disabled = false; }
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 12000);
  }
  async function transcodeExport(type, ext, quality, label) {
    if (!lastUrl) return;
    const btn = $('export-' + (ext === 'jpg' ? 'jpg' : ext));
    if (btn) btn.setAttribute('aria-busy', 'true');
    try {
      const im = await loadImage(lastUrl);
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      if (c.width * c.height > 48e6) throw new Error('this print is too large to recode; use PNG');
      const cx = c.getContext('2d', { alpha: false });
      cx.fillStyle = '#fff';
      cx.fillRect(0, 0, c.width, c.height);
      cx.drawImage(im, 0, 0);
      const blob = await new Promise((res, rej) => c.toBlob(
        b => b ? res(b) : rej(new Error('this browser cannot encode ' + label)),
        type, quality
      ));
      const name = lastName.replace(/\.png$/i, '.' + ext);
      downloadBlob(blob, name);
      toast('Saved ' + name + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)');
    } catch (err) {
      toast('Could not make ' + label + (err && err.message ? ': ' + err.message : ''));
      if (btn && /cannot encode/i.test(String(err && err.message))) btn.hidden = true;
    } finally { if (btn) btn.removeAttribute('aria-busy'); }
  }
  function clipFromExport() {
    closeModal('modal-export');
    startRecord(8000);
  }

  /* ---- surprise ---- */
  function surprise() {
    const e = instances[currentId]; if (!e) return;
    snapshot('surprise');
    const seed = randomSeed();
    const g = makeRng(seed + '/surprise');
    let p = { seed };
    if (e.mod.surprise) Object.assign(p, e.mod.surprise(g, e.state) || {});
    if (e.mod.palette) {
      const pal = g() < 0.5 ? generatePalette(g) : PALETTES[g.pick(Object.keys(PALETTES))];
      p.palette = pal.colors.slice(); p.bg = pal.bg;
    }
    e.state = sanitize(e.mod, Object.assign({}, e.state, p));
    e.host.getState = () => e.state;
    buildSidebar(e); syncAll(e);
    regenerate({ skipSnap: true });
  }
  // Build the technique's runtime again from the state it already has, keeping the seed and every
  // parameter, so a plate recovers from a lost GL context without becoming a different plate.
  // A canvas whose context is gone cannot be handed a new one, so the element itself is replaced;
  // ensureEntry creates that, which is why the old one is removed rather than swapped.
  function rebuildEntry(id) {
    const old = instances[id];
    if (!old || !byId[id]) return false;
    let keep;
    try { keep = JSON.parse(JSON.stringify(old.state)); } catch (err) { keep = old.state; }
    const wasCurrent = currentId === id;
    const wasHidden = old.canvas.hidden;
    try { old.inst.pause && old.inst.pause(); } catch (err) { /* the context is already gone */ }
    try { old.inst.dispose && old.inst.dispose(); } catch (err) { /* likewise */ }
    old.canvas.remove();
    delete instances[id];

    const next = ensureEntry(byId[id], keep);
    next.canvas.hidden = wasCurrent ? false : wasHidden;
    if (wasCurrent) applyView();
    if (!wasCurrent) return true;
    clearFault();
    buildSidebar(next);
    buildTopControls(next);
    next.started = true;
    fitCanvas(next);
    try { regenerate({ skipSnap: true, skipHistory: true }); }
    catch (err) { showError(err); return false; }
    renderStatus();
    return true;
  }

  function resetModule() {
    const e = instances[currentId]; if (!e) return;
    snapshot('reset');
    e.state = sanitize(e.mod, {});
    e.host.getState = () => e.state;
    buildSidebar(e); syncAll(e);
    regenerate({ skipSnap: true });
    toast('Reset ' + e.mod.name);
  }

  /* Drag-scroll a horizontal strip of tiles. A mouse drag on a button used to
     neither pan the strip nor fire the click, which is the "I dragged then
     clicked and nothing happened" failure. Touch keeps native overflow pan. */
  function bindDragScroll(el) {
    if (!el || el.dataset.dragScroll === '1') return;
    el.dataset.dragScroll = '1';
    let pid = null, x0 = 0, sl0 = 0, dragged = false;
    el.addEventListener('pointerdown', ev => {
      if (ev.pointerType === 'touch' || ev.pointerType === 'pen') return;
      if (ev.button && ev.button !== 0) return;
      pid = ev.pointerId;
      x0 = ev.clientX;
      sl0 = el.scrollLeft;
      dragged = false;
    });
    el.addEventListener('pointermove', ev => {
      if (ev.pointerId !== pid) return;
      const dx = ev.clientX - x0;
      if (!dragged) {
        if (Math.abs(dx) < 8) return;
        dragged = true;
        el.classList.add('dragging');
        try { el.setPointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
      }
      el.scrollLeft = sl0 - dx;
      ev.preventDefault();
    });
    const end = ev => {
      if (ev.pointerId !== pid) return;
      pid = null;
      el.classList.remove('dragging');
      if (dragged) el.dataset.suppressClick = '1';
      dragged = false;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('click', ev => {
      if (el.dataset.suppressClick !== '1') return;
      ev.preventDefault();
      ev.stopPropagation();
      el.dataset.suppressClick = '';
    }, true);
  }

  function bindViewControls() {
    const stage = $('stage'), pad = $('viewpad');
    if (stage) {
      stage.addEventListener('wheel', ev => {
        if (ev.target.closest && (ev.target.closest('.tabstrip') || ev.target.closest('.side'))) return;
        ev.preventDefault();
        if (ev.target.closest && ev.target.closest('.viewpad')) {
          zoomCenter(ev.deltaY < 0 ? 1.12 : 1 / 1.12);
          return;
        }
        if (!ev.ctrlKey && Math.abs(ev.deltaX) > Math.abs(ev.deltaY) + 0.5) {
          panBy(-ev.deltaX, -ev.deltaY);
          return;
        }
        zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * 0.0018));
      }, { passive: false });
    }
    if (pad) {
      pad.addEventListener('pointerdown', ev => {
        const btn = ev.target.closest('[data-pan]');
        if (!btn) return;
        ev.preventDefault();
        const parts = btn.getAttribute('data-pan').split(',');
        const dx = +parts[0], dy = +parts[1];
        const step = () => panBy(dx * 36, dy * 36);
        step();
        const t = setInterval(step, 40);
        const stop = () => { clearInterval(t); window.removeEventListener('pointerup', stop, true); };
        window.addEventListener('pointerup', stop, true);
      });
      const minus = $('view-minus'), plus = $('view-plus'), fit = $('view-fit');
      if (minus) minus.addEventListener('click', () => zoomCenter(1 / 1.25));
      if (plus) plus.addEventListener('click', () => zoomCenter(1.25));
      if (fit) fit.addEventListener('click', resetView);
    }
    const moreFit = $('more-fit');
    if (moreFit) moreFit.addEventListener('click', () => {
      closeModal('modal-more');
      resetView();
    });
    applyView();
  }

  /* ---- boot ---- */
  function boot() {
    modules.sort((a, b) => a.order - b.order || 0);
    if (!modules.length) { $('side').textContent = 'No modules loaded.'; return; }
    // tabs
    const tabs = $('tabs');
    const markScroll = () => {
      const more = tabs.scrollWidth - tabs.clientWidth;
      tabs.classList.toggle('scrollable', more > 2);
      tabs.classList.toggle('at-start', tabs.scrollLeft <= 2);
      tabs.classList.toggle('at-end', tabs.scrollLeft >= more - 2);
    };
    tabs.addEventListener('scroll', markScroll, { passive: true });
    window.addEventListener('resize', markScroll);
    setTimeout(markScroll, 0);
    for (const m of modules) {
      // Roving tabindex: the strip is one tab stop and the arrow keys move within it. A long
      // sequential tab strip is what a tablist without this costs a keyboard user.
      const seen = m.familiarity ? (FAMILIARITY_LABEL[m.familiarity] || m.familiarity) : '';
      const hay = [m.id, m.name, m.tab, m.subtitle, m.equation, m.credit, m.blurb, m.familiarity, seen].join(' ').toLowerCase();
      tabs.appendChild(h('button', { class: 'tab', role: 'tab', type: 'button', 'data-id': m.id, 'data-hay': hay, 'data-seen': m.familiarity || '', 'aria-selected': 'false', tabindex: '-1', title: m.subtitle || m.name, onclick: () => switchTo(m.id) }, [
        h('span', { class: 'tab-name', text: m.tab || m.name }),
      ]));
    }
    const find = $('find'), findN = $('find-n'), seenSel = $('seen'), seenHint = $('seen-hint');
    const applyFind = () => {
      const q = (find && find.value || '').trim().toLowerCase();
      const bits = q ? q.split(/\s+/).filter(Boolean) : [];
      const bucket = seenSel && seenSel.value || '';
      let n = 0, first = null;
      for (const b of tabs.querySelectorAll('.tab[data-id]')) {
        const okBits = !bits.length || bits.every(bit => (b.dataset.hay || '').indexOf(bit) >= 0);
        const okSeen = !bucket || b.dataset.seen === bucket;
        const ok = okBits && okSeen;
        b.classList.toggle('is-hidden', !ok);
        if (ok) { n++; if (!first) first = b; }
      }
      if (findN) {
        findN.hidden = !(bits.length || bucket);
        findN.textContent = (bits.length || bucket) ? String(n) : '';
      }
      if (seenHint) seenHint.hidden = !bucket;
      markScroll();
      return first;
    };
    if (find) {
      find.addEventListener('input', applyFind);
      find.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const first = applyFind();
          if (first) switchTo(first.dataset.id);
        }
        if (ev.key === 'Escape') {
          ev.preventDefault();
          if (find.value) { find.value = ''; applyFind(); }
          else find.blur();
        }
      });
    }
    if (seenSel) seenSel.addEventListener('change', applyFind);
    tabs.addEventListener('wheel', ev => {
      if (!ev.deltaY || Math.abs(ev.deltaY) < Math.abs(ev.deltaX)) return;
      if (tabs.scrollWidth <= tabs.clientWidth + 2) return;
      tabs.scrollLeft += ev.deltaY;
      ev.preventDefault();
    }, { passive: false });
    bindDragScroll(tabs);
    bindDragScroll($('history'));
    bindViewControls();
    // top bar wiring
    const seed = $('seed');
    seed.addEventListener('change', () => { const e = instances[currentId]; if (!e) return; e.state.seed = seed.value.trim().slice(0, 64) || randomSeed(); seed.value = e.state.seed; regenerate(); });
    seed.addEventListener('keydown', ev => { if (ev.key === 'Enter') seed.blur(); });
    const roll = () => {
      const e = instances[currentId]; if (!e) return;
      snapshot('new seed');
      e.state.seed = randomSeed(); seed.value = e.state.seed;
      regenerate({ skipSnap: true });
    };
    $('btn-dice').addEventListener('click', roll);
    $('btn-generate').addEventListener('click', roll);
    $('btn-surprise').addEventListener('click', surprise);
    $('preset').addEventListener('change', () => {
      const sel = $('preset'); const key = sel.value; sel.value = '';
      applyPreset(key);
    });
    const inchSel = $('export-inches'), dpiSel = $('export-dpi');
    try {
      const pi = Number(localStorage.getItem(STORE + 'printIn'));
      if (PRINT_INCHES.includes(pi)) printInches = pi;
      const pd = Number(localStorage.getItem(STORE + 'printDpi'));
      if (PRINT_DPI.some(d => d[0] === pd)) printDpi = pd;
    } catch (err) { /* defaults */ }
    for (const v of PRINT_INCHES) inchSel.appendChild(h('option', { value: v, text: v + ' in' }));
    for (const [v, label] of PRINT_DPI) dpiSel.appendChild(h('option', { value: v, text: label }));
    inchSel.value = String(printInches);
    dpiSel.value = String(printDpi);
    inchSel.addEventListener('change', () => {
      printInches = Number(inchSel.value);
      try { localStorage.setItem(STORE + 'printIn', String(printInches)); } catch (err) { /* ignore */ }
      updateDims();
    });
    dpiSel.addEventListener('change', () => {
      printDpi = Number(dpiSel.value);
      try { localStorage.setItem(STORE + 'printDpi', String(printDpi)); } catch (err) { /* ignore */ }
      updateDims();
    });
    const coloBtn = $('btn-colophon');
    try { colophon = localStorage.getItem(STORE + 'colophon') === '1'; } catch (err) { colophon = false; }
    syncColophonButtons();
    coloBtn.addEventListener('click', () => {
      setColophon(!colophon);
      toast(colophon ? 'Colophon on — caption will print under the image' : 'Colophon off — print is the image alone');
    });
    const coloModal = $('export-colo-tog');
    if (coloModal) {
      coloModal.addEventListener('click', () => {
        setColophon(!colophon, { reexport: true });
        toast(colophon ? 'Re-rendering with colophon' : 'Re-rendering image only');
      });
    }
    $('btn-export').addEventListener('click', doExport);
    $('export-save').addEventListener('click', saveViaCapability);
    const exportJpg = $('export-jpg');
    if (exportJpg) exportJpg.addEventListener('click', ev => { ev.preventDefault(); transcodeExport('image/jpeg', 'jpg', 0.92, 'JPEG'); });
    const exportWebp = $('export-webp');
    if (exportWebp) exportWebp.addEventListener('click', ev => { ev.preventDefault(); transcodeExport('image/webp', 'webp', 0.88, 'WebP'); });
    const exportClip = $('export-clip');
    if (exportClip) exportClip.addEventListener('click', clipFromExport);
    const exportCancel = $('export-cancel');
    if (exportCancel) exportCancel.addEventListener('click', abortExportIfBusy);
    $('export-close').addEventListener('click', () => { closeModal('modal-export'); });
    $('modal-export').addEventListener('click', ev => { if (ev.target === $('modal-export')) closeModal('modal-export'); });
    const exitFocus = $('btn-exit-focus');
    if (exitFocus) exitFocus.addEventListener('click', () => setFocus(false));
    // settings JSON
    $('btn-about').addEventListener('click', () => { openModal('modal-about'); });
    $('about-close').addEventListener('click', () => { closeModal('modal-about'); });
    $('modal-about').addEventListener('click', ev => { if (ev.target === $('modal-about')) closeModal('modal-about'); });
    $('btn-settings').addEventListener('click', () => {
      const e = instances[currentId];
      const payload = Object.assign({ v: RECIPE_V, id: e.mod.id }, e.state);
      $('settings-text').value = JSON.stringify(payload, null, 2);
      $('settings-err').hidden = true;
      openModal('modal-settings');
    });
    $('settings-close').addEventListener('click', () => { closeModal('modal-settings'); });
    $('modal-settings').addEventListener('click', ev => { if (ev.target === $('modal-settings')) closeModal('modal-settings'); });
    $('settings-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('settings-text').value); toast('Settings copied'); } catch (err) { $('settings-text').select(); toast('Select the text and copy it manually'); } });
    $('settings-apply').addEventListener('click', () => {
      const e = instances[currentId];
      try {
        const obj = own(JSON.parse($('settings-text').value));
        if (!Object.keys(obj).length) throw new Error('Not an object');
        delete obj.v;
        if (obj.id && ALIAS[obj.id]) obj.id = ALIAS[obj.id];
        if (obj.id && byId[obj.id] && obj.id !== currentId) switchTo(obj.id);
        const e2 = instances[currentId];
        e2.state = sanitize(e2.mod, Object.assign(own(e2.state), obj));
        e2.host.getState = () => e2.state;
        buildSidebar(e2); syncAll(e2); closeModal('modal-settings'); regenerate({ snapLabel: 'settings JSON' }); toast('Settings applied');
      } catch (err) { $('settings-err').textContent = 'That is not valid JSON: ' + err.message; $('settings-err').hidden = false; }
    });
    $('btn-save').addEventListener('click', saveToGallery);
    $('btn-record').addEventListener('click', toggleRecord);
    $('btn-gallery').addEventListener('click', openGallery);
    const galClose = $('gallery-close');
    if (galClose) galClose.addEventListener('click', () => { closeModal('modal-gallery'); });
    $('modal-gallery').addEventListener('click', ev => { if (ev.target === $('modal-gallery')) closeModal('modal-gallery'); });
    $('btn-copy-link').addEventListener('click', async () => {
      writeHash();
      const url = location.href;
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copied — technique, seed and knobs');
        return;
      } catch (err) { /* fall through */ }
      try {
        const ta = document.createElement('textarea');
        ta.value = url; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) { toast('Link copied — technique, seed and knobs'); return; }
      } catch (err2) { /* fall through */ }
      toast('Copy the URL in the address bar');
    });
    $('btn-undo').addEventListener('click', undoLast);
    $('btn-reset').addEventListener('click', resetModule);
    try { historyVisible = localStorage.getItem(STORE + 'timeline') !== '0'; } catch (err) { historyVisible = true; }
    const histBtn = $('btn-history');
    if (histBtn) {
      histBtn.setAttribute('aria-checked', String(historyVisible));
      histBtn.addEventListener('click', () => setHistoryVisible(!historyVisible));
    }
    $('btn-focus').addEventListener('click', () => setFocus(!focusMode));
    $('btn-ambient').addEventListener('click', () => setAmbient(!ambientOn));
    $('seed-copy').addEventListener('click', () => {
      const e = instances[currentId]; if (!e) return;
      copyText(e.state.seed, 'Seed copied', 'Copy the seed field');
    });
    $('btn-side').addEventListener('click', () => { panelSide = panelSide === 'right' ? 'left' : 'right'; applyPanelSide(); persist(currentId); });
    const moreBtn = $('btn-more');
    const moreClose = $('more-close');
    if (moreBtn) moreBtn.addEventListener('click', () => {
      moreBtn.setAttribute('aria-expanded', 'true');
      openModal('modal-more');
    });
    if (moreClose) moreClose.addEventListener('click', () => closeModal('modal-more'));
    const moreModal = $('modal-more');
    if (moreModal) {
      moreModal.addEventListener('click', ev => { if (ev.target === moreModal) closeModal('modal-more'); });
      moreModal.addEventListener('click', ev => {
        const btn = ev.target.closest('[data-for]');
        if (!btn) return;
        const target = $(btn.getAttribute('data-for'));
        closeModal('modal-more');
        if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
        if (target) target.click();
      });
    }
    const bar = document.querySelector('header.bar');
    if (bar) {
      const markBar = () => {
        const more = bar.scrollWidth - bar.clientWidth;
        bar.classList.toggle('scrollable', more > 2);
        bar.classList.toggle('at-start', bar.scrollLeft <= 2);
        bar.classList.toggle('at-end', bar.scrollLeft >= more - 2);
      };
      bar.addEventListener('scroll', markBar, { passive: true });
      window.addEventListener('resize', markBar);
      setTimeout(markBar, 0);
    }
    $('fault-retry').addEventListener('click', () => {
      const id = faultFor || currentId;
      clearFault();
      if (!rebuildEntry(id)) toast('That technique still will not start on this device');
    });
    $('fault-other').addEventListener('click', () => {
      clearFault();
      const next = modules.find(m => !faulted.has(m.id));
      if (next) switchTo(next.id);
      else toast('Every technique tried so far has failed on this device');
    });

    // The tablist's keyboard contract: arrows move, Home and End jump. Declaring role="tablist"
    // without this tells a screen reader the arrows work when they do not.
    $('tabs').addEventListener('keydown', ev => {
      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (keys.indexOf(ev.key) < 0) return;
      const list = [...document.querySelectorAll('.tab[data-id]')];
      if (!list.length) return;
      const at = Math.max(0, list.findIndex(b => b.dataset.id === currentId));
      let to = at;
      if (ev.key === 'Home') to = 0;
      else if (ev.key === 'End') to = list.length - 1;
      else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') to = (at + 1) % list.length;
      else to = (at - 1 + list.length) % list.length;
      ev.preventDefault();
      switchTo(list[to].dataset.id);
      const now = document.querySelector('.tab[aria-selected="true"]');
      if (now) now.focus();
    });

    // Modals are role="dialog" aria-modal="true", which promises the focus stays inside. It did not:
    // Tab walked straight out into the tab strip behind the overlay, and closing never gave focus
    // back to whatever opened it.
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'Tab') return;
      const open = MODALS.map($).find(m => m && !m.hidden);
      if (!open) return;
      const items = [...open.querySelectorAll('button, [href], input, select, textarea, [tabindex]')]
        .filter(el => !el.hidden && !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      else if (!open.contains(document.activeElement)) { ev.preventDefault(); first.focus(); }
    });

    // Anything thrown outside a wrapped module call — a key handler, a slider listener, a promise
    // nobody awaited — used to die in the console with the page looking fine. Say so instead.
    window.addEventListener('error', ev => {
      if (!ev || !ev.message) return;
      toast('Something went wrong: ' + String(ev.message).split('\n')[0].slice(0, 120));
    });
    window.addEventListener('unhandledrejection', ev => {
      const r = ev && ev.reason;
      toast('Something went wrong: ' + String((r && r.message) || r || 'a background task failed').split('\n')[0].slice(0, 120));
    });
    document.addEventListener('keydown', ev => {
      const tag = (ev.target && ev.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ev.target.isContentEditable;
      const modalOpen = MODALS.map($).some(m => m && !m.hidden);
      if (ev.key === 'Escape') {
        if (find && find.value) { find.value = ''; find.dispatchEvent(new Event('input')); return; }
        if (modalOpen) { closeAllModals(); return; }
        if (focusMode) { setFocus(false); return; }
        return;
      }
      if (ev.key === '/' && !ev.metaKey && !ev.ctrlKey && !ev.altKey && !typing) {
        ev.preventDefault();
        if (find) { find.focus(); find.select(); }
        return;
      }
      if (modalOpen || typing) return;
      const role = (ev.target && ev.target.getAttribute && ev.target.getAttribute('role')) || '';
      if (ev.key === ' ') {
        if (tag === 'BUTTON' || role === 'button' || role === 'tab' || role === 'switch' || tag === 'A' || tag === 'SUMMARY') return;
        ev.preventDefault(); roll();
      }
      else if (ev.key === 's' || ev.key === 'S') { ev.preventDefault(); surprise(); }
      else if (ev.key === 'e' || ev.key === 'E') { ev.preventDefault(); doExport(); }
      else if (ev.key === 'l' || ev.key === 'L') { ev.preventDefault(); $('btn-copy-link').click(); }
      else if (ev.key === 'b' || ev.key === 'B') { ev.preventDefault(); saveToGallery(); }
      else if (ev.key === 'g' || ev.key === 'G') { ev.preventDefault(); openGallery(); }
      else if (ev.key === 'z' || ev.key === 'Z') {
        if (!ev.metaKey && !ev.ctrlKey && ev.key === 'z') { ev.preventDefault(); undoLast(); }
        else if (ev.metaKey || ev.ctrlKey) { ev.preventDefault(); undoLast(); }
      }
      else if (ev.key === 'r' || ev.key === 'R') { ev.preventDefault(); resetModule(); }
      else if (ev.key === 'h' || ev.key === 'H') { ev.preventDefault(); setHistoryVisible(!historyVisible); }
      else if (ev.key === 'f' || ev.key === 'F') { ev.preventDefault(); setFocus(!focusMode); }
      else if (ev.key === 'p' || ev.key === 'P') { ev.preventDefault(); togglePause(); }
      else if (ev.key === 'v' || ev.key === 'V') { ev.preventDefault(); toggleRecord(); }
      else if (ev.key === 'a' || ev.key === 'A') { ev.preventDefault(); setAmbient(!ambientOn); }
      else if (ev.key === 'w' || ev.key === 'W') { ev.preventDefault(); cycleWitness(); }
      else if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); zoomCenter(1.25); }
      else if (ev.key === '-' || ev.key === '_') { ev.preventDefault(); zoomCenter(1 / 1.25); }
      else if (ev.key === '0') { ev.preventDefault(); resetView(); }
      else if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === 'ArrowUp' || ev.key === 'ArrowDown') && ev.target === $('stage')) {
        ev.preventDefault();
        const step = ev.shiftKey ? 72 : 36;
        if (ev.key === 'ArrowLeft') panBy(step, 0);
        else if (ev.key === 'ArrowRight') panBy(-step, 0);
        else if (ev.key === 'ArrowUp') panBy(0, step);
        else panBy(0, -step);
      }
      else if (ev.key === 'c' || ev.key === 'C') { if (!ev.metaKey && !ev.ctrlKey) { ev.preventDefault(); copyPlate(); } }
      else if (ev.key === ',' || ev.key === '<') { ev.preventDefault(); stepPreset(-1); }
      else if (ev.key === '.' || ev.key === '>') { ev.preventDefault(); stepPreset(1); }
      else if (ev.key === '?' ) { openModal('modal-about'); }
      else if (ev.key >= '1' && ev.key <= '9') {
        const m = modules[Number(ev.key) - 1];
        if (m) switchTo(m.id);
      }
      else if (ev.key === '[') {
        const list = loadHistory();
        if (list[1]) restoreHistory(list[1]);
      }
      else if (ev.key === ']') {
        const list = loadHistory();
        if (list[0]) restoreHistory(list[0]);
      }
    });
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { const e = instances[currentId]; if (!e) return; if (fitCanvas(e) && e.inst.resize) { try { e.inst.resize(); } catch (err) { showError(err); } } }, 80);
    });
    document.addEventListener('visibilitychange', () => {
      const e = instances[currentId]; if (!e) return;
      try { if (document.hidden) e.inst.pause && e.inst.pause(); else if (!e.paused) e.inst.resume && e.inst.resume(); } catch (err) { /* ignore */ }
    });
    (async function () {
      try { if (window.claude && typeof window.claude.use === 'function') downloads = await window.claude.use('downloads'); } catch (err) { downloads = null; }
    })();
    try { panelSide = localStorage.getItem(STORE + 'panel') === 'right' ? 'right' : 'left'; } catch (err) { panelSide = 'left'; }
    try { setWitnessMode(localStorage.getItem(STORE + 'witness') || 'full', false); } catch (err) { setWitnessMode('full', false); }
    const lb = $('live-badge'); if (lb) lb.addEventListener('click', cycleWitness);
    applyPanelSide();
    renderHistory();
    (function witnessLoop() {
      const e = instances[currentId];
      const delay = (e && e.paused) ? 2500 : ((!liveNow && stillMs >= 1600) ? 2500 : 400);
      witnessClock = setTimeout(() => {
        if (!document.hidden) {
          const cur = instances[currentId];
          if (!(cur && cur.paused)) tickWitness();
        }
        witnessLoop();
      }, delay);
    })();
    window.addEventListener('hashchange', () => { if (!hashSilent) applyHash(); });
    const framed = window.self !== window.top;
    const rec = !framed && parseHash();
    if (framed) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (err) { /* ignore */ }
    }
    if (rec && rec.unknown) {
      toast('No technique called "' + rec.id + '" in this build');
      switchTo(modules[0].id);
    } else if (rec) applyHash();
    else {
      switchTo(modules[Math.floor(Math.random() * modules.length)].id);
      surprise();
    }
    window.addEventListener('pageshow', ev => {
      if (!ev.persisted) return;
      const e = instances[currentId]; if (!e) return;
      if (e.inst && e.inst.resume && !e.paused) {
        try { e.inst.resume(); } catch (err) { /* ignore */ }
      }
    });
    try {
      if (location.protocol !== 'file:' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(rs => { for (const r of rs) r.unregister(); }).catch(() => {});
        if (window.caches) caches.keys().then(keys => { for (const k of keys) caches.delete(k); }).catch(() => {});
      }
    } catch (err) { /* optional */ }
  }
})();

