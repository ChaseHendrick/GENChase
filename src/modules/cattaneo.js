/* modules/cattaneo.js */
/* GENChase: Maxwell-Cattaneo heat, the linear telegraph form. Heat pulses travel as damped waves on a GPU grid. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, Pal = Studio.PALETTES;
  const GEOM = 'geom', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const MAX_STEPS = 20000, MAX_DEP = 4;

  // The model is the linear, constant-coefficient Maxwell-Cattaneo-Vernotte law with the energy balance,
  //   T_t + ∇·q = S,   τ q_t + q = −α ∇T   (unit heat capacity, so the conductivity is α),
  // which for a source-free region is the telegraph equation τ T_tt + T_t = α ∇²T.
  // Staggered grid: T at cell centres, q_x on east faces, q_y on north faces. Each step first advances q over dt
  // with the relaxation integrated exactly and ∇T held at its mid-step value,
  //   q ← E q − (1 − E) α ∇T,   E = exp(−dt/τ)   (E = 0 at τ = 0: Fourier's law q = −α∇T),
  // then T by the divergence of the new flux, so total heat is conserved to round-off. The scheme is second
  // order in dt at fixed τ > 0 and reduces exactly to forward-Euler diffusion at τ = 0. Its growth factor g for a
  // mode whose Laplacian symbol is −m satisfies g² − (1 + E − dt α m (1 − E)) g + E = 0, stable while
  // dt α m ≤ 2 coth(dt/2τ); the largest m on a periodic grid is 8/h² (dtBound below solves for it).
  // The plate wraps (periodic), so every Fourier mode evolves on its own. State: R = T, G = q_x, B = q_y.
  const STEP_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_s; uniform vec2 u_res;
uniform float u_E, u_K, u_dtH, u_Kd;
uniform vec4 u_depX, u_depY, u_depS, u_depA;
uniform int u_ndep;
vec4 S(vec2 d){ return texture(u_s, v_uv + d / u_res); }
float bump(vec2 p, int i){
  vec2 d = p - vec2(u_depX[i], u_depY[i]);
  d -= u_res * floor(d / u_res + 0.5);
  return u_depA[i] * exp(-dot(d, d) / (2.0 * u_depS[i] * u_depS[i]));
}
void main(){
  vec4 c = S(vec2(0.0)), e = S(vec2(1.0, 0.0)), w = S(vec2(-1.0, 0.0)), n = S(vec2(0.0, 1.0)), s = S(vec2(0.0, -1.0));
  float qe = u_E * c.g - u_K * (e.r - c.r);
  float qw = u_E * w.g - u_K * (c.r - w.r);
  float qn = u_E * c.b - u_K * (n.r - c.r);
  float qs = u_E * s.b - u_K * (c.r - s.r);
  float T = c.r - u_dtH * ((qe - qw) + (qn - qs));
  // Heat deposited this step: Gaussians in cell units, nearest periodic image. The flux is staggered in time
  // (it lives half a step before T), so zero flux at the moment of the deposit means a flux of
  // +tanh(dt/2τ) α ∇(deposit) on the half step before it: with the next update, the two average to zero.
  // Without it the new heat would start with a head start of order dt/τ.
  vec2 p = floor(v_uv * u_res) + 0.5;
  for (int i = 0; i < ${MAX_DEP}; i++) {
    if (i >= u_ndep) break;
    float b0 = bump(p, i);
    T += b0;
    qe += u_Kd * (bump(p + vec2(1.0, 0.0), i) - b0);
    qn += u_Kd * (bump(p + vec2(0.0, 1.0), i) - b0);
  }
  outColor = vec4(T, qe, qn, 0.0);
}`;

  // Views: 0 temperature, 1 heat flux |q|, 2 relief of the temperature. The flux lives on the faces, so it is
  // sampled half a cell back to put it at the cell centre before its magnitude is taken.
  const RENDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_s; uniform vec2 u_res;
uniform int u_view;
uniform float u_mlo, u_mhi, u_lo, u_hi, u_exposure, u_gamma, u_contrast, u_grain, u_bump, u_lightAng;
uniform vec3 u_bg;
${G.GLSL.bicubic}
${G.GLSL.hash}
${G.GLSL.ramp}
float temp(vec2 uv){ return texCR(u_s, uv, u_res); }
float scalarAt(vec2 uv){
  if (u_view == 1) {
    vec2 px = 1.0 / u_res;
    float qx = texCR4(u_s, uv - vec2(0.5 * px.x, 0.0), u_res).g;
    float qy = texCR4(u_s, uv - vec2(0.0, 0.5 * px.y), u_res).b;
    return length(vec2(qx, qy));
  }
  return temp(uv);
}
float nrm(float x){
  float t = (x - u_mlo) / max(u_mhi - u_mlo, 1.0e-9);
  return (t - u_lo) / max(u_hi - u_lo, 1.0e-4);
}
void main(){
  vec3 col;
  if (u_view == 2) {
    vec2 px = 1.0 / u_res;
    float hE = nrm(temp(v_uv + vec2(px.x, 0.0))), hW = nrm(temp(v_uv - vec2(px.x, 0.0)));
    float hN = nrm(temp(v_uv + vec2(0.0, px.y))), hS = nrm(temp(v_uv - vec2(0.0, px.y)));
    float gx = 0.5 * (hE - hW) * u_bump, gy = 0.5 * (hN - hS) * u_bump;
    float ang = u_lightAng * 3.14159265 / 180.0;
    vec3 N = normalize(vec3(-gx, -gy, 1.0));
    vec3 Lt = normalize(vec3(cos(ang), sin(ang), 0.85));
    float sh = clamp(pow(max(dot(N, Lt), 0.0), 1.15), 0.0, 1.0);
    float t = clamp(nrm(temp(v_uv)), 0.0, 1.0);
    col = mix(u_bg, ramp(0.15 + 0.85 * t), mix(0.3, 1.0, sh)) * mix(0.6, 1.12, sh);
  } else {
    col = ramp(clamp(nrm(scalarAt(v_uv)), 0.0, 1.0));
  }
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  function sizeOf(s) {
    const n = Number(s.grid) || 512, ar = ASPECTS[s.aspect] || 1;
    return [n & ~1, Math.max(64, Math.round(n * ar)) & ~1];
  }
  const coth = x => 1 / Math.tanh(x);
  // The largest stable step for the scheme above: dt α m ≤ 2 coth(dt / 2τ) with m = 8/h², solved by bisection
  // (the left side rises and the right side falls with dt). τ = 0 gives h²/(4α), forward-Euler diffusion.
  function dtBound(alpha, tau, h) {
    const m = 8 / (h * h);
    if (!(tau > 0)) return 2 / (alpha * m);
    let lo = 0, hi = Math.max(2 / (alpha * m), Math.sqrt(4 * tau / (alpha * m))) * 4;
    for (let i = 0; i < 80; i++) {
      const mid = 0.5 * (lo + hi);
      if (mid * alpha * m <= 2 * coth(mid / (2 * tau))) lo = mid; else hi = mid;
    }
    return lo;
  }
  const cellOf = s => 1 / sizeOf(s)[0];                       // the plate is one unit wide
  const dtOf = s => U.clamp(Number(s.cfl) || 0.8, 0.2, 0.95) * dtBound(s.alpha, s.tau, cellOf(s));
  const stepsOf = s => Math.min(MAX_STEPS, Math.max(1, Math.ceil(s.until / dtOf(s))));
  const speedOf = s => s.tau > 0 ? Math.sqrt(s.alpha / s.tau) : Infinity;
  const kcOf = s => s.tau > 0 ? 1 / (2 * Math.sqrt(s.alpha * s.tau)) : Infinity;

  // The heat the plate receives: every deposit is a Gaussian added to T in one step, { k (step), x, y, sig (cells), a }.
  // Sparks fire at seeded times; a torch deposits every step along a straight seeded path.
  function depositsOf(s, W, H, dt, steps) {
    const rng = U.makeRng(s.seed + '/cattaneo/sources');
    const sig = Math.max(0.5, (Number(s.width) || 6) * W / 1000), out = [];
    if (s.source === 'torch') {
      const v = speedOf(s), speed = (Number.isFinite(v) ? v : 0.3) * (Number(s.mach) || 2) * W;   // cells per unit time
      const ang = rng.range(-0.35, 0.35) + (rng() < 0.5 ? 0 : Math.PI), x0 = rng.range(0.15, 0.35) * W, y0 = rng.range(0.25, 0.75) * H;
      const dir = [Math.cos(ang), Math.sin(ang)], sx = ang > Math.PI / 2 ? W - x0 : x0;
      const a = (Number(s.amp) || 1) * 0.02 * dt / 0.001;
      for (let k = 0; k < steps; k++) {
        const t = k * dt;
        out.push({ k, x: ((sx + dir[0] * speed * t) % W + W) % W, y: ((y0 + dir[1] * speed * t) % H + H) % H, sig, a });
      }
      return out;
    }
    const n = s.source === 'single' ? 1 : Math.max(1, Math.round(s.sparks));
    for (let i = 0; i < n; i++) {
      const t = s.source === 'burst' || s.source === 'single' ? 0 : rng.range(0, 0.75) * s.until;
      const x = s.source === 'single' ? W / 2 : rng.range(0, W), y = s.source === 'single' ? H / 2 : rng.range(0, H);
      const k = Math.min(steps - 1, Math.max(0, Math.round(t / dt)));
      out.push({ k, x, y, sig: sig * (s.source === 'single' ? 1 : rng.range(0.6, 1.5)), a: (Number(s.amp) || 1) * rng.range(0.5, 1) });
    }
    return out.sort((p, q) => p.k - q.k);
  }

  // The continuum response of one Fourier mode to heat deposited at t = 0 with no flux: the solution of
  // τ G'' + G' + α k² G = 0 with G(0) = 1, G'(0) = 0, from the roots of τ s² + s + α k² = 0.
  function modeResponse(alpha, tau, k2, t) {
    if (!(t >= 0)) return 0;
    if (!(tau > 0)) return Math.exp(-alpha * k2 * t);
    const disc = 1 - 4 * alpha * tau * k2, g = 1 / (2 * tau);
    if (Math.abs(disc) < 1e-12) return Math.exp(-g * t) * (1 + g * t);
    if (disc > 0) {
      const r = Math.sqrt(disc), s1 = -2 * alpha * k2 / (1 + r), s2 = -(1 + r) / (2 * tau);
      return (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
    }
    const om = Math.sqrt(-disc) / (2 * tau);
    return Math.exp(-g * t) * (Math.cos(om * t) + g * Math.sin(om * t) / om);
  }
  // The discrete Fourier coefficient, at mode (m, n), of one deposit exactly as the step shader lays it down
  // (the Gaussian is separable, and so is the nearest periodic image). Returns [re, im] without the amplitude.
  function depositMode(d, W, H, m, n) {
    const axis = (N, c, sig, j) => {
      let re = 0, im = 0;
      for (let i = 0; i < N; i++) {
        let x = i + 0.5 - c; x -= N * Math.floor(x / N + 0.5);
        const gv = Math.exp(-x * x / (2 * sig * sig)), ph = -U.TAU * j * i / N;
        re += gv * Math.cos(ph); im += gv * Math.sin(ph);
      }
      return [re, im];
    };
    const a = axis(W, d.x, d.sig, m), b = axis(H, d.y, d.sig, n);
    return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  }
  // The same coefficient measured from a temperature field (rows from the bottom, the order it was uploaded in).
  function fieldMode(st, W, H, m, n) {
    const cx = new Float64Array(W), sx = new Float64Array(W), cy = new Float64Array(H), sy = new Float64Array(H);
    for (let i = 0; i < W; i++) { cx[i] = Math.cos(-U.TAU * m * i / W); sx[i] = Math.sin(-U.TAU * m * i / W); }
    for (let j = 0; j < H; j++) { cy[j] = Math.cos(-U.TAU * n * j / H); sy[j] = Math.sin(-U.TAU * n * j / H); }
    let re = 0, im = 0;
    for (let j = 0; j < H; j++) {
      let rr = 0, ri = 0;
      for (let i = 0; i < W; i++) { const T = st[(j * W + i) * 4]; rr += T * cx[i]; ri += T * sx[i]; }
      re += rr * cy[j] - ri * sy[j]; im += rr * sy[j] + ri * cy[j];
    }
    return [re, im];
  }
  // The continuum amplitude of mode (m, n) at time t from the deposits made so far, with each deposit counted
  // from the end of its step. Also returns Fourier's law alone (τ = 0) and the total injected amplitude.
  function modeExact(s, deps, W, H, dt, stepsDone, m, n) {
    const kx = U.TAU * m, ky = U.TAU * n * W / H, k2 = kx * kx + ky * ky, t = stepsDone * dt;
    let re = 0, im = 0, fr = 0, fi = 0, scale = 0, heat = 0;
    for (const d of deps) {
      if (d.k >= stepsDone) break;
      const c = depositMode(d, W, H, m, n), c0 = depositMode(d, W, H, 0, 0)[0];
      const age = t - (d.k + 1) * dt, gk = modeResponse(s.alpha, s.tau, k2, age), gf = modeResponse(s.alpha, 0, k2, age);
      re += d.a * c[0] * gk; im += d.a * c[1] * gk; fr += d.a * c[0] * gf; fi += d.a * c[1] * gf;
      scale += d.a * Math.hypot(c[0], c[1]); heat += d.a * c0;
    }
    return { re, im, fourier: Math.hypot(fr, fi), scale, heat, k2 };
  }
  function readRaw(gl, target) {
    const out = new Float32Array(target.w * target.h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  }
  function hexToRgb01(hex) { const c = U.hexToRgb(hex || '#000000'); return [c[0] / 255, c[1] / 255, c[2] / 255]; }
  const VIEWS = { temp: 0, flux: 1, relief: 2 };

  function create(host) {
    const gl = G.createGL(host.canvas);
    const noop = () => {};
    const dead = msg => {
      host.setStatus(msg); host.fault(msg);
      return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), repaint: noop, resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
    };
    if (!gl) return dead('WebGL2 is not available in this browser');
    // The mode check and the flux bookkeeping need float32 state; float16 keeps about three digits.
    if (!gl.floatExt) return dead('Maxwell-Cattaneo heat needs float32 render targets on this device');
    let stepPass, renderPass;
    try { stepPass = new G.Pass(gl, STEP_FS); renderPass = new G.Pass(gl, RENDER_FS); }
    catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

    let C = null, W = 0, H = 0, h = 0, dt = 0, steps = 0, total = 0, deps = [], di = 0, timer = 0, paused = false, lastPaint = 0;
    let ramp = null, rampKey = '', mlo = -1, mhi = 1, meas = null, E = 0, K = 0, Kd = 0;
    function drop() { if (C) C.dispose(); C = null; }
    function step(n) {
      const uni = { u_res: [W, H], u_E: E, u_K: K, u_dtH: dt / h, u_Kd: Kd, u_depX: [0, 0, 0, 0], u_depY: [0, 0, 0, 0], u_depS: [1, 1, 1, 1], u_depA: [0, 0, 0, 0], u_ndep: { int: 0 } };
      for (let i = 0; i < n && steps < total; i++) {
        let nd = 0;
        const X = [0, 0, 0, 0], Y = [0, 0, 0, 0], Sg = [1, 1, 1, 1], A = [0, 0, 0, 0];
        while (di < deps.length && deps[di].k === steps && nd < MAX_DEP) { const d = deps[di++]; X[nd] = d.x; Y[nd] = d.y; Sg[nd] = d.sig; A[nd] = d.a; nd++; }
        // more than four deposits in one step wait for the next; the bookkeeping records the step they used
        for (let j = di; j < deps.length && deps[j].k === steps; j++) deps[j].k = steps + 1;
        uni.u_s = C.read; uni.u_depX = X; uni.u_depY = Y; uni.u_depS = Sg; uni.u_depA = A; uni.u_ndep = { int: nd };
        stepPass.draw(C.write, uni);
        C.swap();
        steps++;
      }
    }
    function ensureRamp(s) {
      const key = (s.bg || '') + '|' + (s.palette || []).join(',');
      if (ramp && key === rampKey) return;
      if (ramp) ramp.dispose();
      ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key;
    }
    // Black and white points from the field: the 1st and 99.7th percentiles of the view's scalar over a sample of
    // cells (the relief uses the temperature).
    function expose(st) {
      const s = host.getState(), flux = s.view === 'flux', vals = [];
      const stride = Math.max(1, Math.floor(W * H / 65536));
      for (let i = 0; i < W * H; i += stride) {
        if (!flux) { vals.push(st[i * 4]); continue; }
        const x = i % W, y = (i - x) / W, iw = y * W + (x + W - 1) % W, is = ((y + H - 1) % H) * W + x;
        vals.push(Math.hypot(0.5 * (st[i * 4 + 1] + st[iw * 4 + 1]), 0.5 * (st[i * 4 + 2] + st[is * 4 + 2])));
      }
      vals.sort((a, b) => a - b);
      const q = f => vals[Math.min(vals.length - 1, Math.floor(f * (vals.length - 1)))];
      mlo = flux ? 0 : q(0.01); mhi = Math.max(q(0.997), mlo + 1e-9);
    }
    function render(target) {
      if (!C) return;
      const s = host.getState();
      ensureRamp(s);
      renderPass.draw(target || null, {
        u_s: C.read, u_res: [W, H], u_view: { int: VIEWS[s.view] || 0 }, u_ramp: ramp, u_bg: hexToRgb01(s.bg),
        u_mlo: mlo, u_mhi: mhi, u_lo: s.lo, u_hi: s.hi,
        u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain, u_bump: s.bump, u_lightAng: s.lightAng,
      });
    }
    // The plate's lowest mode against the exact dispersion relation, and the total heat against what was deposited.
    function measure(st) {
      const s = host.getState();
      const ex = modeExact(s, deps, W, H, dt, steps, 1, 0);
      const a = fieldMode(st, W, H, 1, 0), q = fieldMode(st, W, H, 0, 0)[0];
      meas = { ex, a, heat: q, mis: Math.hypot(a[0] - ex.re, a[1] - ex.im) / Math.max(ex.scale, 1e-300) };
    }
    function status(extra) {
      const s = host.getState();
      const v = speedOf(s), kc = kcOf(s);
      const head = '<span>grid <b>' + W + '×' + H + '</b> · wave speed <b>' + (Number.isFinite(v) ? f3(v) : '∞ (τ = 0)') + '</b> · k_c <b>' +
        (Number.isFinite(kc) ? kc.toFixed(2) : '∞') + '</b></span>';
      const clock = '<span>t <b>' + (steps * dt).toFixed(3) + '</b> · step <b>' + steps.toLocaleString() + '</b> of ' + total.toLocaleString() +
        ' · dt <b>' + dt.toPrecision(3) + '</b>' + (extra ? ' · ' + extra : '') + '</span>';
      if (extra || !meas || !(meas.ex.heat > 0)) { host.setStatus(head + '<span>lowest mode after the run</span>' + clock); return; }
      const Q = meas.ex.heat, k = Math.sqrt(meas.ex.k2);
      const regime = !(s.tau > 0) ? 'Fourier limit' : k > kc ? 'oscillating, period ' + (U.TAU * 2 * s.tau / Math.sqrt(4 * s.alpha * s.tau * meas.ex.k2 - 1)).toPrecision(3) : 'overdamped';
      // Deterministic: the seed only places the heat. The mode evolves on its own because the plate wraps, so the
      // plate's coefficient can be set beside the exact solution of τ s² + s + α k² = 0 for the same deposits.
      const mode = U.stats.compare({
        label: 'mode (1,0) / heat', measured: Math.hypot(meas.a[0], meas.a[1]) / meas.heat, expected: Math.hypot(meas.ex.re, meas.ex.im) / Q,
        reference: 'exact dispersion', basis: 'deterministic', digits: 5,
        note: 'k/k_c ' + (Number.isFinite(kc) ? (k / kc).toFixed(2) : '0') + ', ' + regime + ' · Fourier law alone ' + (meas.ex.fourier / Q).toPrecision(3) +
          ' · complex mismatch ' + meas.mis.toExponential(1) + ' of the injected amplitude',
      });
      // Heat moves only through face fluxes, each leaving one cell and entering the next: a regression test.
      const heat = U.stats.compare({ label: 'total heat', measured: meas.heat, expected: Q, reference: 'deposited', basis: 'construction', digits: 7 });
      host.setStatus(head + mode + heat + clock);
    }
    function stop() { clearTimeout(timer); timer = 0; }
    function finish() { const st = readRaw(gl, C.read); expose(st); measure(st); render(); status(); }
    function run() {
      stop();
      if (paused || !C) return;
      if (steps >= total) { finish(); return; }
      const animate = !host.reducedMotion();
      let chunkN = 8;
      (function chunk() {
        timer = 0;
        if (paused) return;
        const t0 = performance.now();
        step(chunkN);
        const ms = Math.max(performance.now() - t0, 0.5);
        chunkN = Math.round(U.clamp(chunkN * 30 / ms, 4, 256));
        if (steps < total) {
          if (animate && performance.now() - lastPaint > 150) { expose(readRaw(gl, C.read)); render(); status('computing'); lastPaint = performance.now(); }
          timer = setTimeout(chunk, 0);
        } else finish();
      })();
    }

    return {
      fieldCells() { return C ? [W, H] : null; },
      aspect(s) { return ASPECTS[s.aspect] || 1; },
      regenerate() {
        stop(); drop(); paused = false; meas = null;
        const s = host.getState();
        [W, H] = sizeOf(s); h = 1 / W; dt = dtOf(s); total = stepsOf(s); steps = 0; di = 0;
        E = s.tau > 0 ? Math.exp(-dt / s.tau) : 0; K = (1 - E) * s.alpha / h;
        Kd = (s.tau > 0 ? Math.tanh(dt / (2 * s.tau)) : 1) * s.alpha / h;
        deps = depositsOf(s, W, H, dt, total);
        try {
          C = new G.PingPong(gl, W, H, { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' });
          C.read.upload(new Float32Array(W * H * 4));
        } catch (err) { drop(); host.fault('Float render targets are not available in this browser'); return; }
        mlo = -1; mhi = 1; lastPaint = performance.now();
        render(); status('computing');
        run();
      },
      repaint() { if (C) { expose(readRaw(gl, C.read)); render(); } },
      resize() { if (C) render(); },
      pause() { paused = true; stop(); },
      resume() { paused = false; if (C) { render(); run(); } },
      async exportData() {
        if (!C) throw new Error('nothing to export');
        const s = host.getState(), st = G.readTarget(C.read), n = W * H;
        const pick = c => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = st[i * 4 + c]; return a; };
        return {
          arrays: {
            temperature: { data: pick(0), shape: [H, W], description: 'temperature above ambient at cell centres' },
            flux_x: { data: pick(1), shape: [H, W], description: 'heat flux q_x on the east face of each cell (staggered half a cell to the right)' },
            flux_y: { data: pick(2), shape: [H, W], description: 'heat flux q_y on the face above each cell (staggered half a cell up in the picture)' },
          },
          meta: {
            tab: 'cattaneo', grid: [W, H], cell: h, units: 'lengths in plate widths, time in the units of α and τ, unit heat capacity',
            alpha: s.alpha, tau: s.tau, waveSpeed: speedOf(s), boundary: 'periodic',
            model: 'linear constant-coefficient Maxwell-Cattaneo-Vernotte (telegraph) heat equation',
            scheme: 'staggered flux; relaxation integrated exactly over dt with ∇T held at mid-step; conservative temperature update',
            steps, dt, time: steps * dt, precision: 'rgba32f',
            deposits: deps.filter(d => d.k < steps).map(d => ({ step: d.k, x: d.x, y: d.y, sigma: d.sig, amplitude: d.a })),
            deposits_note: 'Gaussians a exp(-r²/2σ²) added to T at the end of the given step, in cell units from the bottom-left corner, nearest periodic image',
          },
        };
      },
      async exportPNG(w, hh) {
        if (!C) throw new Error('nothing to export');
        const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (w > max || hh > max) throw new Error('larger than this GPU allows (' + max + ' px)');
        const Tgt = new G.Target(gl, w, hh, { type: 'rgba8' });
        const px = new Uint8Array(w * hh * 4);
        try {
          render(Tgt);
          gl.bindFramebuffer(gl.FRAMEBUFFER, Tgt.fbo);
          gl.readPixels(0, 0, w, hh, gl.RGBA, gl.UNSIGNED_BYTE, px);
        } finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); Tgt.dispose(); }
        const c = document.createElement('canvas'); c.width = w; c.height = hh;
        const ctx = c.getContext('2d'), img = ctx.createImageData(w, hh);
        for (let y = 0; y < hh; y++) img.data.set(px.subarray((hh - 1 - y) * w * 4, (hh - y) * w * 4), y * w * 4);
        ctx.putImageData(img, 0, 0);
        return U.toBlob(c);
      },
    };
  }

  const PICTURE_DEFAULTS = { lo: 0, hi: 1, bump: 6, lightAng: 40, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.04 };
  Studio.register({
    id: 'cattaneo',
    name: 'Maxwell-Cattaneo heat',
    tab: 'Heat waves',
    subtitle: 'heat that travels as a damped wave · 1948',
    order: 88.6,
    equation: 'τ ∂²T/∂t² + ∂T/∂t = α∇²T  (linear, constant coefficients),   τ s² + s + α k² = 0',
    credit: 'Carlo Cattaneo, Atti del Seminario Matematico e Fisico della Università di Modena 3, 83 (1948), and Pierre Vernotte, Comptes Rendus de l’Académie des Sciences 246, 3154 (1958), gave the heat flux a relaxation time τ, τ ∂q/∂t + q = −α∇T, so that heat released at a point spreads at the finite speed √(α/τ) instead of everywhere at once. With the energy balance it is the telegraph equation. The linear, constant-coefficient form here is the simplest member of the family; the proposal this tab follows points to Róbert Kovács and Patrizia Rogolino, Numerical treatment of nonlinear Fourier and Maxwell-Cattaneo-Vernotte heat transport equations, arXiv:1910.09175 (2019), whose nonlinear, temperature-dependent coefficients this tab does not include.',
    blurb: 'Fourier’s law says heat flows down the temperature gradient the instant the gradient appears, so a spark warms the far side of a plate at once, if only a little. Cattaneo and Vernotte let the flux take a relaxation time τ to catch up with the gradient. The change is small and the consequence is not: heat now travels as a wave, at the speed √(α/τ), with a sharp front, and it rings. A Fourier mode of wavenumber k decays smoothly while k is below k_c = 1/(2√(ατ)) and oscillates above it, all the fast ripples dying together at the rate 1/(2τ). Here sparks of heat are dropped on a plate that wraps at the edges; each throws out a ring that fades as it runs, leaving a diffusive glow behind it, and the rings pass through one another. Set τ to zero and the rings disappear: the same sparks only spread and blur, which is Fourier. The torch drags a source across the plate faster than the heat wave, and the heat piles into a Mach cone. The model is linear with constant coefficients, a simplification: it is not a material model, it allows the temperature to dip below ambient behind a front, and whether real solids behave this way outside a few special cases is a matter the literature still argues about.',
    schema: [
      { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[256, '256'], [384, '384'], [512, '512'], [768, '768'], [1024, '1024']] },
      { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      RANGE('Heat', 'alpha', 'Diffusivity α', GEOM, 0.0005, 0.1, 0.0005, v => v.toFixed(4), {
        hint: 'In plate widths squared per unit time. With τ it sets the wave speed √(α/τ) and the crossover wavenumber 1/(2√(ατ)).' }),
      RANGE('Heat', 'tau', 'Relaxation time τ', GEOM, 0, 2, 0.01, f2, {
        hint: 'How long the heat flux takes to follow the gradient. Zero is Fourier’s law: no wave, no front, pure diffusion. Longer τ: faster to ring, slower to fade.' }),
      { group: 'Sources', key: 'source', label: 'Heat', type: 'seg', kind: GEOM, options: [['sparks', 'Sparks'], ['burst', 'All at once'], ['single', 'One spark'], ['torch', 'Moving torch']] },
      RANGE('Sources', 'sparks', 'Sparks', GEOM, 1, 24, 1, String, { dimUnless: s => s.source === 'sparks' || s.source === 'burst' }),
      RANGE('Sources', 'width', 'Spark width', GEOM, 2, 30, 0.5, v => v.toFixed(1), { hint: 'Thousandths of the plate width. Below about two cells the grid starts to show in the rings as ripples trailing each front.' }),
      RANGE('Sources', 'amp', 'Heat per spark', GEOM, 0.2, 3, 0.05, f2),
      RANGE('Sources', 'mach', 'Torch speed / wave speed', GEOM, 0.5, 4, 0.05, f2, { dimUnless: s => s.source === 'torch',
        hint: 'Above 1 the torch outruns its own heat wave and a Mach cone forms, half-angle arcsin(1/M). Below 1 the heat runs ahead of it.' }),
      RANGE('Simulation', 'until', 'Run until t', GEOM, 0.05, 4, 0.01, f2),
      RANGE('Simulation', 'cfl', 'Time step (share of the bound)', GEOM, 0.2, 0.95, 0.05, f2, {
        hint: 'The step is explicit. Its bound, dt α (8/h²) ≤ 2 coth(dt/2τ), is solved exactly for the current α, τ and grid; this is the share used. It is the wave bound h√(τ/2α) when τ is large and the diffusion bound h²/4α when τ is small.' }),
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['temp', 'Temperature'], ['flux', 'Heat flux'], ['relief', 'Relief']] },
      RANGE('Picture', 'lo', 'Black point', PAINT, -0.5, 0.9, 0.01, f2, { hint: 'In measured units: 0 is the 1st percentile of the field, 1 the 99.7th.' }),
      RANGE('Picture', 'hi', 'White point', PAINT, 0.1, 1.5, 0.01, f2),
      RANGE('Picture', 'bump', 'Relief', PAINT, 1, 20, 0.5, v => v.toFixed(1), { dimUnless: s => s.view === 'relief' }),
      RANGE('Picture', 'lightAng', 'Light angle', PAINT, 0, 360, 5, v => v + '°', { dimUnless: s => s.view === 'relief' }),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: Object.assign({
      grid: 512, aspect: '1:1', alpha: 0.02, tau: 0.35,
      source: 'sparks', sparks: 11, width: 5, amp: 1, mach: 2,
      until: 1.1, cfl: 0.8, view: 'temp', seed: 'vernotte-1958',
    }, PICTURE_DEFAULTS),
    presets: {
      sparks: pre('Sparks', { source: 'sparks', sparks: 11, alpha: 0.02, tau: 0.35, until: 1.1, view: 'temp' }, Pal.thermal),
      burst: pre('All at once', { source: 'burst', sparks: 7, alpha: 0.02, tau: 0.5, until: 0.9, view: 'relief', width: 6 }, Pal.glacier),
      single: pre('One spark', { source: 'single', alpha: 0.03, tau: 0.4, until: 1.0, view: 'temp', width: 8 }, Pal.ember),
      crossover: pre('Rings and glow', { source: 'sparks', sparks: 9, alpha: 0.004, tau: 0.08, until: 0.8, view: 'temp', width: 9 }, Pal.kiln),
      fourier: pre('Fourier limit τ = 0', { source: 'sparks', sparks: 11, alpha: 0.001, tau: 0, until: 0.6, view: 'temp', width: 6 }, Pal.harbor),
      torch: pre('Moving torch', { source: 'torch', mach: 2, alpha: 0.02, tau: 0.35, until: 1.2, view: 'temp', width: 5 }, Pal.nightshade),
      flux: pre('Heat flux', { source: 'sparks', sparks: 11, alpha: 0.02, tau: 0.35, until: 1.1, view: 'flux' }, Pal.bioluminescent),
    },
    closedGroups: ['Simulation'],
    hints: {
      Heat: 'α and τ together make the two scales that decide the look: the wave speed √(α/τ) and the damping time 2τ. A ring travels about 2τ√(α/τ) before it has faded by a factor e.',
      Sources: 'Each spark is heat added in one step as a Gaussian, at a time and place drawn from the seed; the flux is left alone, so the new heat starts at rest and splits into an outgoing ring. The torch adds heat every step along a straight path.',
      Simulation: 'The status line measures the plate’s longest wave across the width, its (1, 0) Fourier coefficient divided by the total heat, and sets it beside the exact solution of τ s² + s + α k² = 0 for the same deposits. Since the plate wraps and the equation is linear, that mode evolves on its own, so the two agree to discretization and round-off error; the mismatch is printed. Fourier’s law alone is printed next to it, to show how far the waves have taken the plate from diffusion. Total heat is conserved by construction, a regression test.',
      Picture: 'Temperature is the field itself; ambient is wherever the plate has not been reached, and the Cattaneo front can leave it slightly colder than ambient. Heat flux shows |q|, bright along every moving front. Relief lights the temperature as a surface.',
    },
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Colors (cold → hot)',
    headline: 'tau', headlineLabel: 'relaxation time τ',
    sanitize(s) {
      s.grid = [256, 384, 512, 768, 1024].includes(Number(s.grid)) ? Number(s.grid) : 512;
      s.alpha = U.clamp(Number(s.alpha) || 0.02, 0.0005, 0.1);
      s.tau = U.clamp(Number(s.tau) || 0, 0, 2);
      // keep the run inside the step budget: the end time comes down rather than the step going up
      const dtv = dtOf(s);
      if (s.until / dtv > MAX_STEPS) s.until = Math.max(0.05, Math.floor(MAX_STEPS * dtv * 100) / 100);
    },
    surprise(rng) {
      const source = rng.pick(['sparks', 'sparks', 'burst', 'torch', 'single']);
      const tau = rng.pick([0.08, 0.2, 0.35, 0.5, 0.8]);
      return {
        grid: 512, aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '3:2']), alpha: tau < 0.1 ? rng.range(0.003, 0.006) : rng.range(0.012, 0.035), tau,
        source, sparks: rng.int(4, 16), width: rng.range(3.5, 9), amp: 1, mach: rng.range(1.4, 3),
        until: rng.range(0.7, 1.4), cfl: 0.8, view: rng.pick(['temp', 'temp', 'flux', 'relief']),
        lo: 0, hi: 1, bump: rng.range(4, 9), lightAng: rng.int(0, 360), exposure: 1, gamma: rng.range(0.9, 1.15), contrast: rng.range(0.95, 1.15), grain: rng.pick([0, 0.04, 0.08]),
      };
    },
    create,
  });
})();
