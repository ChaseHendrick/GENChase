/* modules/fisher-kpp.js */
/* GENChase: Fisher-KPP invasion fronts. Logistic growth with diffusion on a GPU grid; the plate is the arrival time. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, Pal = Studio.PALETTES;
  const GEOM = 'geom', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const MAX_STEPS = 24000;

  // One step of u_t = D ∇²u + r g(x) u (1 − u), split in two: forward Euler for the diffusion with the
  // 9-point (Mehrstellen) Laplacian, then the exact logistic flow over dt. With mu = D dt / h² ≤ 3/10 the
  // diffusion update is a convex combination of the nine cells and the logistic flow maps [0, 1] into itself,
  // so the discrete solution stays in [0, 1] and no clamp is needed. At mu = 1/6 the leading errors of the
  // stencil (+h²∇⁴/12, the same in every direction) and of the Euler step (−D dt ∇⁴/2) cancel, which leaves the
  // speed of the leading edge in error at O(h⁴) in every direction. The texture is sampled clamp-to-edge, so a
  // missing neighbour is the cell itself: zero flux through the edge of the plate (a closed habitat).
  // State: R = u, G = arrival time (the first time u reaches 1/2, linearly interpolated inside the step;
  // -1 before), B = founder label (copied at arrival from the neighbour that arrived first), A = g(x).
  const STEP_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_s; uniform vec2 u_res;
uniform float u_mu, u_rdt, u_t0, u_dt;
vec4 S(vec2 d){ return texture(u_s, v_uv + d / u_res); }
float first, most, lab, labU;
void consider(vec4 q){
  if (q.g >= 0.0 && q.g < first) { first = q.g; lab = q.b; }
  if (q.b >= 0.0 && q.r > most) { most = q.r; labU = q.b; }
}
void main(){
  vec4 c = S(vec2(0.0)), e = S(vec2(1.0, 0.0)), w = S(vec2(-1.0, 0.0)), n = S(vec2(0.0, 1.0)), s = S(vec2(0.0, -1.0));
  float dg = S(vec2(1.0, 1.0)).r + S(vec2(-1.0, 1.0)).r + S(vec2(1.0, -1.0)).r + S(vec2(-1.0, -1.0)).r;
  float ud = c.r + u_mu * (4.0 * (e.r + w.r + n.r + s.r) + dg - 20.0 * c.r) / 6.0;
  float gr = exp(u_rdt * c.a);
  float un = ud * gr / (1.0 + ud * (gr - 1.0));
  float T = c.g;
  lab = c.b;
  if (T < 0.0 && un >= 0.5) {
    T = u_t0 + u_dt * clamp((0.5 - c.r) / max(un - c.r, 1.0e-30), 0.0, 1.0);
    first = 1.0e30; most = -1.0; labU = -1.0;
    consider(e); consider(w); consider(n); consider(s);
    if (first > 1.0e29) lab = labU;
  }
  outColor = vec4(un, T, lab, c.a);
}`;

  // The plate. Views: 0 arrival time with isochrones, 1 territories (who arrived first), 2 density u, 3 relief
  // of the arrival time. A cell the front has not reached counts as arriving now: that is the earliest it can
  // arrive, and it keeps the interpolated arrival time continuous across the front.
  const RENDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_s; uniform vec2 u_res;
uniform int u_view;
uniform float u_tnow, u_tmax, u_lo, u_hi, u_iso, u_linePx, u_lineAmt, u_npal;
uniform float u_exposure, u_gamma, u_contrast, u_grain, u_bump, u_lightAng;
uniform vec3 u_bg;
${G.GLSL.bicubic}
${G.GLSL.hash}
${G.GLSL.ramp}
vec4 tapAt(vec2 ij){ return texture(u_s, (ij + 0.5) / u_res); }
vec2 field(vec2 uv){
  vec2 p = uv * u_res - 0.5, f = fract(p), b = floor(p);
  vec2 sum = vec2(0.0); float ws = 0.0;
  for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
    vec4 q = tapAt(b + vec2(float(i), float(j)));
    float w = crW(float(i) - f.x) * crW(float(j) - f.y);
    sum += w * vec2(q.r, q.g >= 0.0 ? q.g : u_tnow);
    ws += w;
  }
  return sum / ws;
}
float tone(float T){ return clamp((T / max(u_tmax, 1.0e-6) - u_lo) / max(u_hi - u_lo, 1.0e-4), 0.0, 1.0); }
vec3 labelColor(float l){
  if (l < 0.0) return u_bg;
  return ramp((1.0 + mod(floor(l + 0.5), u_npal)) / u_npal);
}
void main(){
  vec2 fu = field(v_uv);
  float u = fu.x, T = fu.y;
  // Everything that takes a screen derivative is computed here, in uniform control flow.
  float fwU = max(fwidth(u), 1.0e-5);
  float arrived = smoothstep(0.5 - fwU, 0.5 + fwU, u);
  float fIso = T / max(u_tmax / max(u_iso, 1.0), 1.0e-6);
  float fwIso = max(fwidth(fIso), 1.0e-6);
  float dIso = abs(fract(fIso + 0.5) - 0.5) / fwIso;
  float line = (u_iso > 0.0 && fIso > 0.5) ? (1.0 - smoothstep(0.5 * u_linePx - 0.5, 0.5 * u_linePx + 0.5, dIso)) * u_lineAmt : 0.0;
  // territories: the label whose bilinear weight wins, antialiased along the curve where two labels tie
  vec2 p = v_uv * u_res - 0.5, b = floor(p), f = p - b;
  vec4 q[4]; q[0] = tapAt(b); q[1] = tapAt(b + vec2(1.0, 0.0)); q[2] = tapAt(b + vec2(0.0, 1.0)); q[3] = tapAt(b + vec2(1.0, 1.0));
  float wt[4]; wt[0] = (1.0 - f.x) * (1.0 - f.y); wt[1] = f.x * (1.0 - f.y); wt[2] = (1.0 - f.x) * f.y; wt[3] = f.x * f.y;
  float lw[4];
  for (int i = 0; i < 4; i++) { lw[i] = 0.0; for (int j = 0; j < 4; j++) if (q[j].b == q[i].b) lw[i] += wt[j]; }
  int top = 0;
  for (int i = 1; i < 4; i++) if (lw[i] > lw[top]) top = i;
  int sec = top; float sw = -1.0;
  for (int i = 0; i < 4; i++) if (q[i].b != q[top].b && lw[i] > sw) { sw = lw[i]; sec = i; }
  float margin = lw[top] - (sec == top ? 0.0 : lw[sec]);
  float fwM = max(fwidth(margin), 1.0e-5);
  float win = smoothstep(-fwM, fwM, margin);
  vec3 col;
  float t = tone(T);
  if (u_view == 1) {
    vec3 cTop = labelColor(q[top].b), cSec = labelColor(q[sec].b);
    col = mix(cSec, cTop, win) * mix(0.82, 1.06, t);
    col = mix(col, u_bg, line);
    col = mix(u_bg, col, arrived);
  } else if (u_view == 2) {
    col = ramp(clamp((u - u_lo) / max(u_hi - u_lo, 1.0e-4), 0.0, 1.0));
  } else if (u_view == 3) {
    vec2 px = 1.0 / u_res;
    float hE = tone(field(v_uv + vec2(px.x, 0.0)).y), hW = tone(field(v_uv - vec2(px.x, 0.0)).y);
    float hN = tone(field(v_uv + vec2(0.0, px.y)).y), hS = tone(field(v_uv - vec2(0.0, px.y)).y);
    float gx = 0.5 * (hE - hW) * u_bump, gy = 0.5 * (hN - hS) * u_bump;
    float ang = u_lightAng * 3.14159265 / 180.0;
    vec3 N = normalize(vec3(-gx, -gy, 1.0));
    vec3 Lt = normalize(vec3(cos(ang), sin(ang), 0.85));
    float sh = clamp(pow(max(dot(N, Lt), 0.0), 1.15), 0.0, 1.0);
    col = mix(u_bg, ramp(0.08 + 0.92 * t), mix(0.35, 1.0, sh)) * mix(0.55, 1.1, sh);
    col = mix(col, u_bg, line * 0.6);
    col = mix(u_bg, col, arrived);
  } else {
    col = ramp(0.08 + 0.92 * t);
    col = mix(col, u_bg, line);
    col = mix(u_bg, col, arrived);
  }
  col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
  col *= u_exposure;
  col = clamp((col - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  if (u_grain > 0.0) col = clamp(col + (hash21(gl_FragCoord.xy * 0.73) - 0.5) * u_grain * 0.4, 0.0, 1.0);
  outColor = vec4(col, 1.0);
}`;

  // ---- geometry, habitat, time step ----
  function sizeOf(s) {
    const n = Number(s.grid) || 512, ar = ASPECTS[s.aspect] || 1;
    return [n & ~1, Math.max(64, Math.round(n * ar)) & ~1];
  }
  const cellOf = s => 1 / (Number(s.scale) || 2);                    // h, length units per cell
  // The diffusion number mu = D dt / h². The 9-point Euler step is monotone for mu ≤ 3/10 (its centre weight
  // 1 − 10 mu / 3 stays nonnegative) and stable for mu ≤ 3/8 (the grid-scale symbol is −16/(3h²)).
  const MUS = { '1/6': 1 / 6, '1/10': 0.1, '1/4': 0.25, '3/10': 0.3 };
  const muOf = s => MUS[s.mu] || 1 / 6;
  const dtOf = s => muOf(s) * cellOf(s) * cellOf(s) / Math.max(Number(s.D) || 1, 1e-6);
  // Steps to the end time, a multiple of 4 so the half-resolution twin (4 dt per step) ends at the same time.
  const stepsOf = s => Math.min(MAX_STEPS, 4 * Math.ceil(s.until / (4 * dtOf(s))));
  // Growth multiplier g(x) at a point in length units: 1 on uniform ground, a smooth patchwork between 1 − a and
  // 1 + a, or −1 inside islands where the population declines. Defined in length units, so both resolutions
  // see the same habitat.
  function habitatOf(s) {
    if (s.habitat === 'uniform') return () => 1;
    const nz = U.makeNoise(U.makeRng(s.seed + '/fisher-kpp/habitat'));
    const L = Math.max(Number(s.patch) || 20, 1), a = U.clamp(Number(s.contrast) || 0, 0, 0.9);
    if (s.habitat === 'patchy') return (x, y) => 1 + a * U.clamp(1.8 * nz.fbm(x / L, y / L, 3), -1, 1);
    const cut = 0.55 - 0.5 * a;
    return (x, y) => (nz.fbm(x / L, y / L, 3) > cut * 0.5 ? -1 : 1);
  }
  function foundersOf(s, Lx, Ly) {
    const rng = U.makeRng(s.seed + '/fisher-kpp/founders');
    const R = Math.max(Number(s.radius) || 3, 0.5);
    if (s.init === 'single') return [{ x: Lx / 2, y: Ly / 2, R }];
    if (s.init === 'edge') return [{ edge: true, R, k: 1 + rng.int(1, 3), ph: rng() * U.TAU, amp: R * rng.range(0.4, 0.8) }];
    const n = Math.max(1, Math.round(s.founders)), out = [];
    for (let i = 0; i < n; i++) {
      let best = null, bestD = -1;
      // Best of 12 candidates: the one farthest from the founders placed so far (Mitchell's blue noise).
      for (let tries = 0; tries < 12; tries++) {
        const c = { x: rng.range(R, Lx - R), y: rng.range(R, Ly - R), R: R * rng.range(0.7, 1.3) };
        let d = Infinity;
        for (const o of out) d = Math.min(d, Math.hypot(c.x - o.x, c.y - o.y));
        if (d > bestD) { best = c; bestD = d; }
      }
      out.push(best);
    }
    return out;
  }
  // The initial field for a W x H grid of cell h: rows from the bottom (GL order), RGBA = u, arrival, label, g.
  function seedField(s, W, H, h) {
    const Lx = W * h, Ly = H * h, g = habitatOf(s), fs = foundersOf(s, Lx, Ly);
    const data = new Float32Array(W * H * 4);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = (i + 0.5) * h, y = (j + 0.5) * h, k = (j * W + i) * 4;
      let u = 0, lab = -1;
      for (let f = 0; f < fs.length; f++) {
        const F = fs[f];
        const d = F.edge ? F.R + F.amp * Math.sin(U.TAU * F.k * y / Ly + F.ph) - x : F.R - Math.hypot(x - F.x, y - F.y);
        const v = U.clamp(d / h + 0.5, 0, 1);
        if (v > u) { u = v; lab = f; }
      }
      data[k] = u; data[k + 1] = u >= 0.5 ? 0 : -1; data[k + 2] = u >= 0.5 ? lab : -1; data[k + 3] = g(x, y);
    }
    return data;
  }

  // Front speed read from the arrival-time field: the mean of 1/|∇T| (central differences) over the cells that
  // arrived in the last half of the arrival times, away from everything that is not a free front. A cell is
  // used only when no cell within `m` of it is unreached, belongs to another founder, lies on the edge of the
  // plate or has a growth rate other than r. Where two fronts meet their leading edges overlap before either
  // arrives, so m is three decay lengths √(D/r) of the leading edge.
  function frontSpeed(st, W, H, h, m) {
    let tmax = 0;
    for (let i = 0; i < W * H; i++) if (st[i * 4 + 1] > tmax) tmax = st[i * 4 + 1];
    const out = { speed: NaN, n: 0, tmax, invT: NaN, tMean: NaN };
    if (!(tmax > 0)) return out;
    const bad = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, lab = st[i * 4 + 2];
      let b = st[i * 4 + 1] < 0 || st[i * 4 + 3] !== 1 || x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (!b) for (const j of [i + 1, i - 1, i + W, i - W]) if (st[j * 4 + 2] !== lab || st[j * 4 + 1] < 0) { b = true; break; }
      bad[i] = b ? 1 : 0;
    }
    // dilate by m along rows, then along columns (a square of side 2m + 1), with running sums
    const rowNear = new Uint8Array(W * H), near = new Uint8Array(W * H), pre = new Int32Array(Math.max(W, H) + 1);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) pre[x + 1] = pre[x] + bad[y * W + x];
      for (let x = 0; x < W; x++) rowNear[y * W + x] = pre[Math.min(W, x + m + 1)] - pre[Math.max(0, x - m)] > 0 ? 1 : 0;
    }
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) pre[y + 1] = pre[y] + rowNear[y * W + x];
      for (let y = 0; y < H; y++) near[y * W + x] = pre[Math.min(H, y + m + 1)] - pre[Math.max(0, y - m)] > 0 ? 1 : 0;
    }
    const lo = 0.5 * tmax;
    let n = 0, sv = 0, si = 0, st2 = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, T = st[i * 4 + 1];
      if (near[i] || !(T >= lo)) continue;
      const gx = (st[(i + 1) * 4 + 1] - st[(i - 1) * 4 + 1]) / (2 * h), gy = (st[(i + W) * 4 + 1] - st[(i - W) * 4 + 1]) / (2 * h);
      const gg = Math.hypot(gx, gy);
      if (!(gg > 0)) continue;
      sv += 1 / gg; si += 1 / T; st2 += T; n++;
    }
    if (n) Object.assign(out, { speed: sv / n, n, invT: si / n, tMean: st2 / n });
    return out;
  }

  function hexToRgb01(hex) { const c = U.hexToRgb(hex || '#000000'); return [c[0] / 255, c[1] / 255, c[2] / 255]; }
  // A float32 texture read back in its own row order (row 0 at the bottom, the order it was uploaded in).
  function readRaw(gl, target) {
    const out = new Float32Array(target.w * target.h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  }
  const VIEWS = { arrival: 0, territory: 1, density: 2, relief: 3 };

  function create(host) {
    const gl = G.createGL(host.canvas);
    const noop = () => {};
    const dead = msg => {
      host.setStatus(msg); host.fault(msg);
      return { aspect: s => ASPECTS[s.aspect] || 1, regenerate: () => host.setStatus(msg), repaint: noop, resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(new Error(msg)) };
    };
    if (!gl) return dead('WebGL2 is not available in this browser');
    // A pulled front is set by densities far below what float16 can hold: with a cutoff ε the speed falls by
    // about π²/(ln ε)² (Brunet and Derrida 1997), several per cent at float16. Refuse rather than draw it.
    if (!gl.floatExt) return dead('Fisher-KPP needs float32 render targets: the front is pulled by densities far below float16 resolution');
    let stepPass, renderPass;
    try { stepPass = new G.Pass(gl, STEP_FS); renderPass = new G.Pass(gl, RENDER_FS); }
    catch (err) { console.error(err); return dead('Shader compilation failed on this GPU'); }

    // the plate's grid and, on uniform ground, a twin at twice the cell size that runs the same recipe to the
    // same time (4 dt per step, the same D dt / h²) for the resolution part of the error
    let fine = null, coarse = null, ramp = null, rampKey = '';
    let steps = 0, total = 0, dt = 0, timer = 0, paused = false, meas = null, tmaxShown = 1, lastPaint = 0;
    function grid(W, H, h) { return { W, H, h, C: new G.PingPong(gl, W, H, { type: 'rgba32f', filter: 'nearest', wrap: 'clamp' }) }; }
    function drop() { if (fine) fine.C.dispose(); if (coarse) coarse.C.dispose(); fine = coarse = null; }
    function stepGrid(g, k, dtg) {
      const s = host.getState();
      stepPass.draw(g.C.write, { u_s: g.C.read, u_res: [g.W, g.H], u_mu: s.D * dtg / (g.h * g.h), u_rdt: s.r * dtg, u_t0: k * dtg, u_dt: dtg });
      g.C.swap();
    }
    function step(n) {
      for (let i = 0; i < n && steps < total; i++) {
        stepGrid(fine, steps, dt);
        if (coarse && (steps + 1) % 4 === 0) stepGrid(coarse, (steps + 1) / 4 - 1, 4 * dt);
        steps++;
      }
    }
    function ensureRamp(s) {
      const key = (s.bg || '') + '|' + (s.palette || []).join(',');
      if (ramp && key === rampKey) return;
      if (ramp) ramp.dispose();
      ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key;
    }
    function render(target, pxWidth) {
      if (!fine) return;
      const s = host.getState();
      ensureRamp(s);
      const w = pxWidth || (target ? target.w : gl.drawingBufferWidth);
      renderPass.draw(target || null, {
        u_s: fine.C.read, u_res: [fine.W, fine.H], u_view: { int: VIEWS[s.view] || 0 },
        u_tnow: steps * dt, u_tmax: Math.max(tmaxShown, 1e-6), u_lo: s.lo, u_hi: s.hi,
        u_iso: s.iso, u_linePx: Math.max(0.75, s.line * w / 1000), u_lineAmt: s.lineAmt,
        u_npal: Math.max(1, (s.palette || []).length), u_ramp: ramp, u_bg: hexToRgb01(s.bg),
        u_exposure: s.exposure, u_gamma: s.gamma, u_contrast: s.contrast, u_grain: s.grain, u_bump: s.bump, u_lightAng: s.lightAng,
      });
    }
    // At the end of the run: read the arrival times back, set the colour scale from the latest arrival
    // actually present, and measure the front speed on both grids.
    function measure() {
      const s = host.getState();
      const st = readRaw(gl, fine.C.read);
      const m = k => Math.max(2, Math.ceil(3 * Math.sqrt(s.D / s.r) / k));
      const a = frontSpeed(st, fine.W, fine.H, fine.h, m(fine.h));
      tmaxShown = a.tmax > 0 ? a.tmax : Math.max(steps * dt, 1e-6);
      const b = coarse ? frontSpeed(readRaw(gl, coarse.C.read), coarse.W, coarse.H, coarse.h, m(coarse.h)) : null;
      meas = { a, b, time: steps * dt };
    }
    function status(extra) {
      const s = host.getState();
      const head = '<span>grid <b>' + fine.W + '×' + fine.H + '</b> · h <b>' + f2(fine.h) + '</b></span>';
      const clock = '<span>t <b>' + (steps * dt).toFixed(1) + '</b> · step <b>' + steps.toLocaleString() + '</b> of ' + total.toLocaleString() +
        ' · dt <b>' + dt.toPrecision(3) + '</b>' + (extra ? ' · ' + extra : '') + '</span>';
      const cs = 2 * Math.sqrt(s.r * s.D);
      let cmp;
      if (extra) cmp = '<span>front speed after the run · 2√(rD) <b>' + cs.toFixed(3) + '</b></span>';
      else if (s.habitat !== 'uniform') cmp = '<span>growth varies across the habitat: local speeds differ, no single front speed to compare</span>';
      else if (!meas || !(meas.a.n > 0)) cmp = '<span>no free front cells to measure (fronts met too early, or nothing arrived)</span>';
      else {
        const k = Math.sqrt(s.D / s.r) * meas.a.invT;
        const grid = meas.b && meas.b.n > 0 ? Math.abs(meas.a.speed - meas.b.speed) : NaN;
        // Deterministic: the seed only places the founders. The printed lags are Bramson's (3/2)√(D/r)/t for a
        // straight front and Gärtner's 2√(D/r)/t for a circular one in two dimensions, at the sampled times.
        cmp = U.stats.compare({
          label: 'front speed', measured: meas.a.speed, expected: cs, reference: '2√(rD)', basis: 'deterministic', digits: 4,
          note: 'mean arrival t ' + f1(meas.a.tMean) + ' over ' + meas.a.n.toLocaleString() + ' cells · finite-time lag ' +
            (1.5 * k).toFixed(3) + ' straight to ' + (2 * k).toFixed(3) + ' circular · ' +
            (Number.isFinite(grid) ? 'cells h and 2h differ by ' + grid.toFixed(4) : 'no half-resolution twin'),
        });
      }
      host.setStatus(head + cmp + clock);
    }
    function stop() { clearTimeout(timer); timer = 0; }
    function finish() { measure(); render(); status(); }
    function run() {
      stop();
      if (paused || !fine) return;
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
          if (animate && performance.now() - lastPaint > 150) {
            tmaxShown = Math.max(steps * dt, 1e-6); render(); status('computing'); lastPaint = performance.now();
          }
          timer = setTimeout(chunk, 0);
        } else finish();
      })();
    }

    return {
      // The plate magnifies a grid, so the shell renders once at print size instead of supersampling.
      fieldCells() { return fine ? [fine.W, fine.H] : null; },
      aspect(s) { return ASPECTS[s.aspect] || 1; },
      regenerate() {
        stop(); drop(); paused = false; meas = null;
        const s = host.getState(), [W, H] = sizeOf(s), h = cellOf(s);
        dt = dtOf(s); total = stepsOf(s); steps = 0; tmaxShown = 1e-6;
        try {
          fine = grid(W, H, h);
          fine.C.read.upload(seedField(s, W, H, h));
          if (s.habitat === 'uniform') { coarse = grid(W / 2, H / 2, 2 * h); coarse.C.read.upload(seedField(s, W / 2, H / 2, 2 * h)); }
        } catch (err) { drop(); host.fault('Float render targets are not available in this browser'); return; }
        lastPaint = performance.now();
        render(); status('computing');
        run();
      },
      repaint() { if (fine) render(); },
      resize() { if (fine) render(); },
      pause() { paused = true; stop(); },
      resume() { paused = false; if (fine) { render(); run(); } },
      // The fields for research use, read back unrounded; rows from the top.
      async exportData() {
        if (!fine) throw new Error('nothing to export');
        const s = host.getState(), st = G.readTarget(fine.C.read), n = fine.W * fine.H;
        const pick = c => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = st[i * 4 + c]; return a; };
        const shape = [fine.H, fine.W];
        return {
          arrays: {
            density: { data: pick(0), shape, description: 'population density u in [0, 1] (carrying capacity 1)' },
            arrival: { data: pick(1), shape, units: 'model time', description: 'first time u reached 1/2, interpolated inside the step; -1 where the front has not arrived' },
            founder: { data: pick(2), shape, description: 'index of the founder whose front arrived first (copied from the neighbour that arrived first); -1 before arrival' },
            habitat: { data: pick(3), shape, description: 'growth multiplier g(x): the local growth rate is r g(x); negative inside hostile islands' },
          },
          meta: {
            tab: 'fisher-kpp', grid: [fine.W, fine.H], cell: fine.h, units: 'length and time in the units of D and r', D: s.D, r: s.r,
            boundary: 'zero flux (closed habitat)', scheme: 'forward Euler diffusion (5-point) then the exact logistic flow',
            steps, dt, time: steps * dt, precision: 'rgba32f',
            frontSpeed: meas && meas.a.n ? { measured: meas.a.speed, cells: meas.a.n, meanArrival: meas.a.tMean, halfResolution: meas.b && meas.b.n ? meas.b.speed : null, minimalSpeed: 2 * Math.sqrt(s.r * s.D) } : null,
          },
        };
      },
      async exportPNG(w, h) {
        if (!fine) throw new Error('nothing to export');
        const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (w > max || h > max) throw new Error('larger than this GPU allows (' + max + ' px)');
        const Tgt = new G.Target(gl, w, h, { type: 'rgba8' });
        const px = new Uint8Array(w * h * 4);
        try {
          render(Tgt, w);
          gl.bindFramebuffer(gl.FRAMEBUFFER, Tgt.fbo);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        } finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); Tgt.dispose(); }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        ctx.putImageData(img, 0, 0);
        return U.toBlob(c);
      },
    };
  }

  const PICTURE_DEFAULTS = { lo: 0, hi: 1, iso: 14, line: 1.1, lineAmt: 0.85, bump: 5, lightAng: 35, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.04 };
  Studio.register({
    id: 'fisher-kpp',
    name: 'Fisher-KPP',
    tab: 'Fisher-KPP',
    subtitle: 'invasion fronts and arrival times · 1937',
    order: 96.3,
    equation: '∂u/∂t = D∇²u + r u(1 − u),   minimal front speed 2√(rD)',
    credit: 'R. A. Fisher, The wave of advance of advantageous genes, Annals of Eugenics 7, 355 (1937); A. N. Kolmogorov, I. G. Petrovsky and N. S. Piskunov, Bulletin of Moscow University, Mathematics and Mechanics 1, 1 (1937). A front started from a bounded patch travels at the minimal speed 2√(rD) only in the long run: Maury Bramson, Communications on Pure and Applied Mathematics 31, 531 (1978), showed a straight front lags by (3/2)√(D/r) ln t, so its speed is 2√(rD) − (3/2)√(D/r)/t; Ute Ebert and Wim van Saarloos, Physica D 146, 1 (2000), found the next term; Jürgen Gärtner, Mathematische Nachrichten 105, 317 (1982), gave the circular front in two dimensions, which lags by 2√(D/r) ln t. Habitats of varying quality follow Nanako Shigesada, Kohkichi Kawasaki and Ei Teramoto, Theoretical Population Biology 30, 143 (1986).',
    blurb: 'A population that grows until it fills its ground and wanders at random spreads as a wave. Fisher wrote the equation for an advantageous gene sweeping through a species strung out along a coast; Kolmogorov, Petrovsky and Piskunov proved the same year that the wave settles to the speed 2√(rD), set by the growth rate r at vanishing density and the diffusion D, and not by anything that happens behind the front. The front is pulled by its own thin leading edge. Here a few founders are dropped on empty ground and every cell records the moment the density first reaches half the carrying capacity. That arrival time is the picture: bands of equal arrival ring each founder like growth rings, and where two invasions meet their rings fold into a crease, so the plate divides itself into territories. The territory view colors each cell by the founder whose wave got there first; it is a map of arrival, not a model of genetics. Patchy habitat changes the growth rate from place to place and wrinkles the rings; hostile islands, where the population declines, deflect the waves around them.',
    schema: [
      { group: 'Grid', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM, options: [[256, '256'], [384, '384'], [512, '512'], [768, '768'], [1024, '1024']] },
      { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      RANGE('Grid', 'scale', 'Cells per length unit', GEOM, 1, 4, 0.25, f2, {
        hint: 'Resolution of the physics: cells per unit of length in which D and r are measured. The leading edge decays over √(D/r); two cells per unit resolves it at D = r = 1. Finer is slower: the stable step shrinks with the square of this number.' }),
      RANGE('Population', 'D', 'Diffusion D', GEOM, 0.25, 4, 0.05, f2, {
        hint: 'How fast individuals wander. The front speed grows as √D and its leading edge thickens as √D.' }),
      RANGE('Population', 'r', 'Growth rate r', GEOM, 0.25, 2, 0.05, f2, {
        hint: 'Growth rate at low density. The minimal speed 2√(rD) is set here, at vanishing density, which is why the front is called pulled.' }),
      { group: 'Founders', key: 'init', label: 'Start', type: 'seg', kind: GEOM, options: [['founders', 'Founders'], ['single', 'One founder'], ['edge', 'From an edge']] },
      RANGE('Founders', 'founders', 'Founders', GEOM, 2, 24, 1, String, { dimUnless: s => s.init === 'founders' }),
      RANGE('Founders', 'radius', 'Founder radius', GEOM, 1, 10, 0.5, f1),
      { group: 'Habitat', key: 'habitat', label: 'Habitat', type: 'seg', kind: GEOM, options: [['uniform', 'Uniform'], ['patchy', 'Patchy'], ['islands', 'Hostile islands']] },
      RANGE('Habitat', 'contrast', 'Contrast', GEOM, 0, 0.9, 0.05, f2, { dimUnless: s => s.habitat !== 'uniform',
        hint: 'Patchy: the growth rate varies between r(1 − c) and r(1 + c), always positive, so the whole plate is invaded. Hostile islands: more cover as c rises; inside an island the population declines at rate r.' }),
      RANGE('Habitat', 'patch', 'Patch size', GEOM, 5, 80, 1, String, { dimUnless: s => s.habitat !== 'uniform' }),
      RANGE('Simulation', 'until', 'Run until t', GEOM, 5, 200, 1, String, {
        hint: 'The model time the plate is computed to. Arrival times run from 0 to this; the colors are scaled to the latest arrival actually present.' }),
      { group: 'Simulation', key: 'mu', label: 'Time step D dt/h²', type: 'seg', kind: GEOM, options: [['1/6', '1/6'], ['1/10', '1/10'], ['1/4', '1/4'], ['3/10', '3/10']],
        hint: 'The diffusion step is explicit. At 1/6 its error cancels the leading error of the 9-point stencil, so the front speed is right to fourth order in the cell size; the other values are there to show the difference. Above 3/10 the step would stop being monotone. The growth step is the exact logistic flow at any dt.' },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true, options: [['arrival', 'Arrival time'], ['territory', 'Territories'], ['density', 'Density'], ['relief', 'Relief']] },
      RANGE('Picture', 'iso', 'Isochrones', PAINT, 0, 40, 1, String, { hint: 'Lines of equal arrival time, evenly spaced from 0 to the latest arrival. Their spacing is the front speed times the interval.' }),
      RANGE('Picture', 'line', 'Line weight', PAINT, 0.3, 4, 0.1, f1, { hint: 'Thousandths of the plate width, so a print keeps the proportions of the screen.' }),
      RANGE('Picture', 'lineAmt', 'Line strength', PAINT, 0, 1, 0.05, pct),
      RANGE('Picture', 'lo', 'Black point', PAINT, -0.5, 0.9, 0.01, f2),
      RANGE('Picture', 'hi', 'White point', PAINT, 0.1, 1.5, 0.01, f2),
      RANGE('Picture', 'bump', 'Relief', PAINT, 1, 20, 0.5, f1, { dimUnless: s => s.view === 'relief' }),
      RANGE('Picture', 'lightAng', 'Light angle', PAINT, 0, 360, 5, v => v + '°', { dimUnless: s => s.view === 'relief' }),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: Object.assign({
      grid: 512, aspect: '1:1', scale: 2, D: 1, r: 1,
      init: 'founders', founders: 7, radius: 3, habitat: 'uniform', contrast: 0.6, patch: 24,
      until: 64, mu: '1/6', view: 'arrival', seed: 'fisher-1937',
    }, PICTURE_DEFAULTS),
    presets: {
      rings: pre('Growth rings', { init: 'founders', founders: 7, habitat: 'uniform', until: 64, view: 'arrival', iso: 14 }, Pal.kiln),
      territories: pre('Territories', { init: 'founders', founders: 14, habitat: 'uniform', until: 48, view: 'territory', iso: 10, lineAmt: 0.5 }, Pal.risograph),
      single: pre('One founder', { init: 'single', radius: 4, habitat: 'uniform', until: 60, view: 'arrival', iso: 18 }, Pal.glacier),
      edge: pre('Straight front', { init: 'edge', radius: 6, habitat: 'uniform', until: 110, view: 'arrival', iso: 22 }, Pal.harbor),
      patchy: pre('Patchy habitat', { init: 'founders', founders: 5, habitat: 'patchy', contrast: 0.7, patch: 22, until: 70, view: 'relief', iso: 16, lineAmt: 0.6, bump: 8 }, Pal.meadow),
      islands: pre('Hostile islands', { init: 'edge', radius: 5, habitat: 'islands', contrast: 0.45, patch: 20, until: 90, view: 'arrival', iso: 20 }, Pal.verdigris),
      spread: pre('Mid-invasion density', { init: 'founders', founders: 9, habitat: 'uniform', until: 22, view: 'density', iso: 0 }, Pal.thermal),
    },
    closedGroups: ['Habitat', 'Simulation'],
    hints: {
      Population: 'D and r set the only speed in the problem, 2√(rD), and the only length, √(D/r), the decay length of the leading edge.',
      Founders: 'Founders are disks of full density on empty ground, placed by the seed. From an edge starts a straight front along the left side with a gentle ripple, which the invasion irons out.',
      Habitat: 'The growth rate becomes r g(x). Patchy keeps g positive, so every place is eventually invaded, at a local pace near 2√(r g D). Hostile islands have g = −1: the population declines there, and the waves go around them.',
      Simulation: 'The front speed on the status line is measured from the arrival times on the plate, over cells that arrived in the last half of the run and are clear of other founders, walls and the unreached ground. It reads low, and should: the approach to 2√(rD) is slow, a lag of (3/2)√(D/r)/t for a straight front and 2√(D/r)/t for a circle, still a few per cent at t = 40. The status prints both lags at the sampled times, and the grid effect as the difference from the same run on a grid of twice the cell size. Nothing here is rounded toward 2√(rD).',
      Picture: 'Arrival time colors each cell by when the front reached it, with isochrones. Territories colors it by the founder that got there first. Density is the population itself, interesting mid-invasion. Relief lights the arrival time as a landscape of cones.',
    },
    palette: true, defaultPalette: 'kiln', paletteLabel: 'Colors (early → late)',
    headline: 'founders', headlineLabel: 'founders',
    sanitize(s) {
      s.grid = [256, 384, 512, 768, 1024].includes(Number(s.grid)) ? Number(s.grid) : 512;
      s.founders = Math.round(U.clamp(Number(s.founders) || 7, 2, 24));
      // keep the run inside the step budget: the end time comes down rather than the step going up
      const dtv = dtOf(s);
      if (s.until / dtv > MAX_STEPS) s.until = Math.max(5, Math.floor(MAX_STEPS * dtv));
    },
    surprise(rng) {
      const init = rng.pick(['founders', 'founders', 'founders', 'single', 'edge']);
      const habitat = rng.pick(['uniform', 'uniform', 'patchy', 'islands']);
      return {
        grid: 512, aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '3:2']), scale: 2, D: 1, r: 1,
        init, founders: rng.int(3, 16), radius: rng.pick([2, 3, 4, 5]), habitat, contrast: rng.range(0.3, 0.8), patch: rng.int(12, 40),
        until: init === 'edge' ? rng.int(90, 140) : rng.int(40, 80), mu: '1/6',
        view: rng.pick(['arrival', 'arrival', 'territory', 'relief']), iso: rng.int(8, 24), line: rng.range(0.8, 1.6), lineAmt: rng.range(0.5, 0.95),
        lo: 0, hi: 1, bump: rng.range(3, 8), lightAng: rng.int(0, 360), exposure: 1, gamma: rng.range(0.9, 1.15), contrast: rng.range(0.95, 1.15), grain: rng.pick([0, 0.04, 0.08]),
      };
    },
    create,
  });
})();
