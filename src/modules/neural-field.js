/* modules/neural-field.js */
/* Original integration of the Pinto-Ermentrout neural field with a smooth (logistic) firing rate, recorded as a
   space-time plate. The exponential kernel's convolution is the bounded periodic solution of r - r'' = S(u), solved on
   the grid with Numerov's fourth-order stencil by two first-order recursions, and the pulse speed is timed from the
   level crossing of u at theta. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, Pal = Studio.PALETTES;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const MAX_COLUMNS = 2048, MAX_ROWS = 1536;
  // Timing rules for the front speed. A front is clear at a row when no other level crossing and no kick site lies
  // within AHEAD length units in front of it and the medium from REST_FROM to AHEAD ahead is at rest to REST_TOL in u and
  // v. (Its own leading tail falls as e^-(0.73 to 1) d at rest, so it is below 3e-8 at REST_FROM.) It is isolated once it
  // has stayed clear for as long as it takes to cover AHEAD, so everything it now runs into was checked at rest while it
  // was still REST_FROM to AHEAD ahead. It is timed only SKIP time units after its birth (the launch transient falls
  // about tenfold every five time units at the proved points) and over at least MIN_WINDOW. A residue of 1e-7 ahead
  // moves the speed by a few times 1e-8. Kick sites behind the front also break a clear run within the larger of
  // their half-width and 20 kernel lengths: the symmetric kernel still couples backwards, and exp(-20)/2 is
  // about 1e-9, below FLOOR. This is a timing heuristic, checked by tools/neural-field-science.js, not an error bound.
  const SKIP = 30, MIN_WINDOW = 20, AHEAD = 42, REST_FROM = 22, REST_TOL = 1e-7;
  // Computer-assisted speed enclosures drafted in this repository: c is the lower end of an interval of width 1e-25.
  // The timed speed's error is K dx^4 + Kt dt^4 (Numerov in space, RK4 in time), with K and Kt estimated from grid and
  // step refinement alone in tools/neural-field-science.js (validation/results/neural-field-science.json). FLOOR
  // covers what is left once both are removed: the launch transient and the timing of the crossings.
  const PROVED = [
    { beta: 20, theta: .25, eps: .1, c: 1.1027477097341592, text: '1.1027477097', K: -9.19e-3, Kt: -1.0e-3, source: 'papers/nf-pulse' },
    { beta: 12, theta: .25, eps: .15, c: 1.0475374977991711, text: '1.0475374978', K: -2.84e-3, Kt: -7.1e-4, source: 'papers/nf-pulse/ext/gain-12' },
  ];
  const FLOOR = 2e-8;
  const errorEstimate = (p, dx, dt) => Math.abs(p.K) * Math.pow(dx, 4) + Math.abs(p.Kt) * Math.pow(dt, 4);
  const DEFAULTS = { beta: 20, theta: .25, eps: .1, stimulus: 'single', kick: 1, width: 2, count: 7, period: 24,
    length: 240, duration: 100, cells: 2048, dt: .05, aspect: '4:5', view: 'recovery', tone: 1, seed: 'pulse-front' };
  const range = (group, key, label, kind, min, max, step, fmt) => ({ group, key, label, type: 'range', kind, min, max, step, fmt });
  const pre = (label, p, palette) => ({ label, p, palette });
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const provedAt = s => PROVED.find(p => near(p.beta, s.beta) && near(p.theta, s.theta) && near(p.eps, s.eps)) || null;

  // Periodic solve of r - r'' = f with Numerov's stencil
  //   r[i+1] - 2 r[i] + r[i-1] = (h^2/12)(g[i+1] + 10 g[i] + g[i-1]),  g = r - f,
  // fourth order for smooth f. The operator is a(r[i-1] + r[i+1]) + b r[i] with a = -(1 - h^2/12), b = 2 + 10 h^2/12,
  // which factors as -(a/mu)(1 - mu E^-1)(1 - mu E) with mu + 1/mu = -b/a, so the cyclic system is two geometric
  // recursions, each started from its exact periodic sum (terms below 1e-18 dropped). A constant f returns itself
  // exactly (2a + b = 2 h^2/12 + 10 h^2/12), so the discrete kernel keeps the unit mass of e^-|x|/2.
  function makeKernel(N, h) {
    const a = -(1 - h * h / 12), b = 2 + 10 * h * h / 12, wl = h * h / 12, wc = 10 * h * h / 12;
    const sum = -b / a, mu = (sum - Math.sqrt(sum * sum - 4)) / 2, scale = mu / -a, wrap = 1 / (1 - Math.pow(mu, N));
    const g = new Float64Array(N), y = new Float64Array(N);
    function solve(f, r) {
      for (let i = 0; i < N; i++) g[i] = scale * (wl * (f[i === 0 ? N - 1 : i - 1] + f[i === N - 1 ? 0 : i + 1]) + wc * f[i]);
      let acc = 0, p = 1;
      for (let k = 0; k < N && p > 1e-18; k++, p *= mu) acc += p * g[k === 0 ? 0 : N - k];
      y[0] = acc * wrap;
      for (let i = 1; i < N; i++) y[i] = g[i] + mu * y[i - 1];
      acc = 0; p = 1;
      for (let k = 0; k < N && p > 1e-18; k++, p *= mu) acc += p * y[(N - 1 + k) % N];
      r[N - 1] = acc * wrap;
      for (let i = N - 2; i >= 0; i--) r[i] = y[i] + mu * r[i + 1];
    }
    return { solve, mu, a, b };
  }

  // Stimuli are instantaneous kicks u += A exp(-(x - x0)^2 / w^2), applied between steps, so no RK stage straddles one.
  function stimuli(s) {
    const L = s.length, out = [], add = (x, t, amp) => out.push({ x: ((x % L) + L) % L, t, amp });
    if (s.stimulus === 'single') add(L / 2, 0, s.kick);
    else if (s.stimulus === 'pacemaker') for (let t = 0; t <= .8 * s.duration + 1e-9; t += s.period) add(L / 2, t, s.kick);
    else if (s.stimulus === 'ladder') for (let k = 0; k < s.count; k++) add((k + .5) * L / s.count, 0, s.kick * (k + 1) / s.count);
    else {
      const rng = U.makeRng(s.seed + '/neural-field');
      add(rng.range(0, L), 0, s.kick);
      for (let k = 1; k < s.count; k++) add(rng.range(0, L), rng.range(0, .6 * s.duration), s.kick * rng.range(.8, 1.2));
    }
    return out;
  }

  function makeSim(s) {
    const L = s.length, N = s.cells, h = L / N, dt = s.dt, beta = s.beta, theta = s.theta, eps = s.eps;
    const steps = Math.round(s.duration / dt), stride = Math.max(1, Math.ceil(N / MAX_COLUMNS)), M = N / stride;
    const aspect = ASPECTS[s.aspect] || 1.25, rowTarget = U.clamp(Math.round(M * aspect), 256, MAX_ROWS);
    let every = Math.max(1, Math.ceil(steps / (rowTarget - 1)));
    while (steps % every) every++;
    const rows = steps / every + 1, kernel = makeKernel(N, h);
    const S = x => 1 / (1 + Math.exp(-beta * (x - theta))), S0 = S(0), slope0 = beta * S0 * (1 - S0);
    const u = new Float64Array(N), v = new Float64Array(N).fill(S0), f = new Float64Array(N), r = new Float64Array(N);
    const k1u = new Float64Array(N), k1v = new Float64Array(N), k2u = new Float64Array(N), k2v = new Float64Array(N);
    const k3u = new Float64Array(N), k3v = new Float64Array(N), k4u = new Float64Array(N), k4v = new Float64Array(N);
    const tu = new Float64Array(N), tv = new Float64Array(N);
    const histU = new Float32Array(rows * M), histV = new Float32Array(rows * M);
    const kicks = stimuli(s).map(k => Object.assign(k, { step: Math.min(steps, Math.round(k.t / dt)) })).sort((p, q) => p.step - q.step);
    // Exposure is measured from the record: a histogram of the active cells (u > 0.02) gives the 99.5th percentile
    // of u, so the brief peak of a kick does not set the top of the ramp.
    const HBINS = 1500, HMAX = 3, active = new Float64Array(HBINS);
    const sim = { N, M, h, dt, L, steps, every, rows, stride, S0, slope0, kicks, histU, histV, u, v, step: 0, recorded: 0,
      tracks: [], open: [], peak: -Infinity, low: Infinity, vPeak: -Infinity, vLow: Infinity, halted: '', lastCrossings: 0, activeCells: 0 };
    let nextKick = 0;
    const sites = [];
    function rhs(uu, vv, du, dv) {
      for (let i = 0; i < N; i++) f[i] = 1 / (1 + Math.exp(-beta * (uu[i] - theta)));
      kernel.solve(f, r);
      for (let i = 0; i < N; i++) { du[i] = -uu[i] - vv[i] + r[i]; dv[i] = eps * uu[i]; }
    }
    function applyKicks() {
      while (nextKick < kicks.length && kicks[nextKick].step === sim.step) {
        const k = kicks[nextKick++], w2 = s.width * s.width;
        sites.push({ x: k.x, half: 3 * s.width });
        for (let i = 0; i < N; i++) {
          let d = Math.abs((i + .5) * h - k.x); if (d > L / 2) d = L - d;
          u[i] += k.amp * Math.exp(-d * d / w2);
        }
      }
    }
    // Where u crosses theta between cells i and i+1: the root in [0, 1] of the cubic through four cells, found by a
    // bracketed Newton iteration that starts from the linear estimate.
    function crossingAt(i) {
      const y0 = u[(i - 1 + N) % N] - theta, y1 = u[i] - theta, y2 = u[(i + 1) % N] - theta, y3 = u[(i + 2) % N] - theta;
      const c0 = y1, c1 = -y0 / 3 - y1 / 2 + y2 - y3 / 6, c2 = y0 / 2 - y1 + y2 / 2, c3 = -y0 / 6 + y1 / 2 - y2 / 2 + y3 / 6;
      let lo = 0, hi = 1, x = y1 / (y1 - y2);
      const sign = Math.sign(y1);
      for (let it = 0; it < 40; it++) {
        const p = c0 + x * (c1 + x * (c2 + x * c3)), dp = c1 + x * (2 * c2 + 3 * x * c3);
        if (Math.sign(p) === sign) lo = x; else hi = x;
        let nx = dp !== 0 ? x - p / dp : (lo + hi) / 2;
        if (!(nx > lo && nx < hi)) nx = (lo + hi) / 2;
        if (Math.abs(nx - x) < 1e-15) { x = nx; break; }
        x = nx;
      }
      return x;
    }
    function record() {
      const o = sim.recorded * M;
      for (let j = 0; j < M; j++) {
        const i = j * stride, a = u[i], b = v[i];
        histU[o + j] = a; histV[o + j] = b;
        if (a > sim.peak) sim.peak = a; if (a < sim.low) sim.low = a;
        if (a > .02) { active[Math.min(HBINS - 1, Math.floor(a / HMAX * HBINS))]++; sim.activeCells++; }
        if (b > sim.vPeak) sim.vPeak = b; if (b < sim.vLow) sim.vLow = b;
      }
      sim.recorded++;
    }
    // Fronts are the theta crossings where u rises in time (du from the RK4 stage at this state). A front moves
    // right when u falls to the right of it. Each is linked to the open track of the same direction nearest to
    // where that track was heading; a track that finds no front has ended (annihilation or decay).
    function track(t, du) {
      const all = [];
      for (let i = 0; i < N; i++) {
        const j = i + 1 === N ? 0 : i + 1;
        if ((u[i] >= theta) === (u[j] >= theta)) continue;
        const sx = crossingAt(i), ut = du[i] + sx * (du[j] - du[i]);
        all.push({ x: (((i + .5 + sx) * h) % L + L) % L, i, dir: u[i] >= theta ? 1 : -1, front: ut > 0 });
      }
      sim.lastCrossings = all.length;
      const fronts = all.filter(c => c.front), dtRow = every * dt, tol = .6 + 2.5 * dtRow + 2 * h;
      const wrapd = d => d - L * Math.round(d / L);
      const pairs = [];
      for (const tr of sim.open) {
        const n = tr.t.length, vel = n > 1 ? (tr.x[n - 1] - tr.x[n - 2]) / (tr.t[n - 1] - tr.t[n - 2]) : tr.dir;
        const guess = tr.x[n - 1] + vel * (t - tr.t[n - 1]);
        fronts.forEach((c, k) => { if (c.dir === tr.dir) { const d = Math.abs(wrapd(c.x - guess)); if (d <= tol) pairs.push([d, tr, k]); } });
      }
      pairs.sort((p, q) => p[0] - q[0]);
      const usedTrack = new Set(), usedFront = new Set(), open = [];
      for (const [, tr, k] of pairs) {
        if (usedTrack.has(tr) || usedFront.has(k)) continue;
        usedTrack.add(tr); usedFront.add(k);
        const c = fronts[k], n = tr.t.length;
        tr.t.push(t); tr.x.push(tr.x[n - 1] + wrapd(c.x - tr.x[n - 1]));
        const clear = isolated(c, all), speedNow = Math.abs((tr.x[n] - tr.x[n - 1]) / (t - tr.t[n - 1]));
        if (!clear) tr.lastFail = t;
        tr.iso.push(clear && t - tr.lastFail >= AHEAD / Math.max(speedNow, .1));
        open.push(tr);
      }
      fronts.forEach((c, k) => {
        if (usedFront.has(k)) return;
        const tr = { id: sim.tracks.length, dir: c.dir, born: t, lastFail: t, t: [t], x: [c.x], iso: [false] };
        sim.tracks.push(tr); open.push(tr);
      });
      sim.open = open;
    }
    function isolated(c, all) {
      for (const k of sites) {
        const near = ((((k.x - c.x) * c.dir) % L + L) % L);
        if (near <= AHEAD + k.half || near >= L - Math.max(k.half, 20)) return false;
      }
      for (const o of all) {
        if (o === c) continue;
        const ahead = (((o.x - c.x) * c.dir) % L + L) % L;
        if (ahead > 0 && ahead <= AHEAD) return false;
      }
      if (L <= 2 * AHEAD) return false;
      const from = Math.ceil(REST_FROM / h), to = Math.floor(AHEAD / h);
      for (let k = from; k <= to; k++) {
        const i = (((c.i + c.dir * k) % N) + N) % N;
        if (Math.abs(u[i]) > REST_TOL || Math.abs(v[i] - S0) > REST_TOL) return false;
      }
      return true;
    }
    function sample(du) {
      record();
      track(sim.step * dt, du);
    }
    function advance(count) {
      let done = 0;
      while (done < count && sim.step < steps && !sim.halted) {
        applyKicks();
        rhs(u, v, k1u, k1v);
        if (sim.step % every === 0) sample(k1u);
        const hdt = .5 * dt;
        for (let i = 0; i < N; i++) { tu[i] = u[i] + hdt * k1u[i]; tv[i] = v[i] + hdt * k1v[i]; }
        rhs(tu, tv, k2u, k2v);
        for (let i = 0; i < N; i++) { tu[i] = u[i] + hdt * k2u[i]; tv[i] = v[i] + hdt * k2v[i]; }
        rhs(tu, tv, k3u, k3v);
        for (let i = 0; i < N; i++) { tu[i] = u[i] + dt * k3u[i]; tv[i] = v[i] + dt * k3v[i]; }
        rhs(tu, tv, k4u, k4v);
        const w = dt / 6;
        for (let i = 0; i < N; i++) {
          u[i] += w * (k1u[i] + 2 * k2u[i] + 2 * k3u[i] + k4u[i]);
          v[i] += w * (k1v[i] + 2 * k2v[i] + 2 * k3v[i] + k4v[i]);
        }
        sim.step++; done++;
        if (!(Number.isFinite(u[0]) && Number.isFinite(u[N >> 1]))) sim.halted = 'Nonfinite state';
      }
      if (sim.step === steps && sim.recorded < rows && !sim.halted) { applyKicks(); rhs(u, v, k1u, k1v); sample(k1u); }
      return done;
    }
    // The speed of the longest isolated window, fitted by least squares to the unwrapped front positions. The fit
    // has no sampling error: the front positions are deterministic and the error is discretization.
    function measure() {
      let best = null, timed = 0;
      for (const tr of sim.tracks) {
        let runStart = -1, trackBest = null;
        for (let k = 0; k <= tr.t.length; k++) {
          const ok = k < tr.t.length && tr.iso[k] && tr.t[k] - tr.born >= SKIP;
          if (ok && runStart < 0) runStart = k;
          if (!ok && runStart >= 0) {
            const span = tr.t[k - 1] - tr.t[runStart];
            if (span >= MIN_WINDOW && (!trackBest || span > trackBest.span)) trackBest = { from: runStart, to: k - 1, span };
            runStart = -1;
          }
        }
        if (!trackBest) continue;
        timed++;
        let n = 0, st = 0, sx = 0, stt = 0, stx = 0;
        for (let k = trackBest.from; k <= trackBest.to; k++) { const t = tr.t[k], x = tr.x[k]; n++; st += t; sx += x; stt += t * t; stx += t * x; }
        const speed = Math.abs((n * stx - st * sx) / (n * stt - st * st));
        if (!best || trackBest.span > best.span) best = { speed, span: trackBest.span, t0: tr.t[trackBest.from], t1: tr.t[trackBest.to], track: tr.id, dir: tr.dir, rows: n };
      }
      return { best, timed, tracks: sim.tracks.length, alive: sim.open.length };
    }
    function activeHigh() {
      if (!sim.activeCells) return Math.max(sim.peak, 1e-6);
      let above = 0;
      for (let k = HBINS - 1; k >= 0; k--) { above += active[k]; if (above >= .005 * sim.activeCells) return (k + 1) * HMAX / HBINS; }
      return sim.peak;
    }
    sim.advance = advance; sim.measure = measure; sim.rhs = rhs; sim.kernel = kernel; sim.activeHigh = activeHigh;
    return sim;
  }

  const DISPLAY_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_field; uniform float u_cols, u_rows, u_done, u_col0, u_lo, u_hi, u_tone; uniform vec3 u_bg;
${G.GLSL.bicubic}
${G.GLSL.ramp}
float tap(int i, int j){
  int m = int(u_cols); if (i < 0) i += m; if (i >= m) i -= m; j = clamp(j, 0, int(u_done) - 1);
  return texelFetch(u_field, ivec2(i, j), 0).r;
}
void main(){
  float row = (1.0 - v_uv.y) * (u_rows - 1.0);
  if (row > u_done - 1.0 + 1e-3) { outColor = vec4(u_bg, 1.0); return; }
  float col = v_uv.x * u_cols - u_col0;
  float bx = floor(col), fx = col - bx, by = floor(row), fy = row - by, value = 0.0;
  for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++)
    value += tap(int(bx) + i, int(by) + j) * crW(float(i) - fx) * crW(float(j) - fy);
  float t = clamp((value - u_lo) / max(u_hi - u_lo, 1e-12), 0.0, 1.0);
  outColor = vec4(ramp(pow(t, u_tone)), 1.0);
}`;

  function create(host) {
    const gl = G.createGL(host.canvas), noop = () => {};
    if (!gl) {
      host.fault('The neural field plate needs WebGL2.');
      return { aspect: s => ASPECTS[s.aspect] || 1.25, regenerate: noop, resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(Error('WebGL2 unavailable')) };
    }
    const display = new G.Pass(gl, DISPLAY_FS);
    let sim = null, tex = null, texCols = 0, texRows = 0, uploaded = 0, uploadedView = '', timer = 0, paused = false, ramp = null, rampKey = '';
    const views = {
      activity: (a) => a,
      rate: (a, b, sm) => 1 / (1 + Math.exp(-sm.beta * (a - sm.theta))),
      recovery: (a, b) => b,
    };
    function levels(s) {
      if (s.view === 'rate') return [0, 1];
      if (s.view === 'recovery') return [sim.S0, Math.max(sim.vPeak, sim.S0 + 1e-6)];
      return [0, sim.activeHigh()];
    }
    function stop() { clearTimeout(timer); timer = 0; }
    function ensureTexture() {
      if (tex && texCols === sim.M && texRows === sim.rows) return;
      if (tex) gl.deleteTexture(tex);
      tex = gl.createTexture(); texCols = sim.M; texRows = sim.rows; uploaded = 0;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, val);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, texCols, texRows, 0, gl.RED, gl.FLOAT, null);
    }
    function upload() {
      const s = host.getState();
      ensureTexture();
      if (uploadedView !== s.view) { uploaded = 0; uploadedView = s.view; }
      const from = uploaded, to = sim.recorded;
      if (to <= from) return;
      const M = sim.M, fn = views[s.view] || views.activity, buf = new Float32Array((to - from) * M);
      for (let k = 0; k < buf.length; k++) buf[k] = fn(sim.histU[from * M + k], sim.histV[from * M + k], s);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, from, M, to - from, gl.RED, gl.FLOAT, buf);
      uploaded = to;
    }
    function render(target) {
      const s = host.getState(), key = s.palette.join(',') + s.bg;
      if (key !== rampKey) { if (ramp) ramp.dispose(); ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key; }
      upload();
      const [lo, hi] = levels(s);
      display.draw(target || null, { u_field: { tex }, u_cols: sim.M, u_rows: sim.rows, u_done: Math.max(1, sim.recorded), u_col0: .5 / sim.stride,
        u_lo: lo, u_hi: hi, u_tone: s.tone, u_bg: U.hexToRgb(s.bg).map(x => x / 255), u_ramp: ramp });
    }
    function status() {
      const s = host.getState(), m = sim.measure(), proved = provedAt(s), complete = sim.step >= sim.steps;
      const t = sim.step * sim.dt;
      let speed;
      if (m.best && proved) {
        const est = errorEstimate(proved, sim.h, sim.dt);
        speed = U.stats.compare({ label: 'pulse speed', measured: m.best.speed, expected: proved.text, expectedValue: proved.c, reference: 'proved', basis: 'deterministic', digits: 8,
          note: 'discretization error about ' + est.toExponential(1) + ' at dx ' + sim.h.toFixed(3) + ' and dt ' + sim.dt + ', fourth order in each' });
      } else if (m.best) {
        speed = '<span>isolated pulse speed <b>' + m.best.speed.toFixed(5) + '</b> · timed over t ' + m.best.t0.toFixed(0) + ' to ' + m.best.t1.toFixed(0) + ' · no proved value at these parameters</span>';
      } else if (m.tracks) {
        speed = '<span>fronts <b>' + m.tracks + '</b>' + (m.alive ? ', ' + m.alive + ' running' : ', all ended') + ' · none clear of other activity for ' + MIN_WINDOW + ' time units after the first ' + SKIP + ', so none timed</span>';
      } else {
        speed = '<span>no front <b>' + (complete ? 'the stimulus stayed below threshold' : 'yet') + '</b></span>';
      }
      const slope = sim.slope0 < 1e-3 ? sim.slope0.toExponential(1) : sim.slope0.toFixed(3);
      const rest = sim.slope0 < 1 ? 'rest stable, S′(0) <b>' + slope + '</b>' : 'rest unstable, S′(0) <b>' + slope + '</b> ≥ 1: the medium oscillates by itself';
      host.setStatus('<span>t <b>' + t.toFixed(1) + '/' + s.duration + '</b> · step <b>' + sim.step.toLocaleString() + '</b>' + (sim.halted ? ' · stopped: ' + U.escapeHtml(sim.halted) : complete ? ' · complete' : ' · preparing, computing') + '</span>' +
        speed + '<span>cells <b>' + sim.N.toLocaleString() + '</b> · dx ' + sim.h.toFixed(3) + ' · periodic ring of length ' + sim.L + '</span><span>' + rest + '</span>');
      if (m.best && proved) {
        const est = errorEstimate(proved, sim.h, sim.dt);
        host.setWitness({ label: 'Fast pulse speed, proved enclosure of width 1e-25 (' + proved.source + ')', measured: m.best.speed, expected: proved.c, tol: 2 * est + FLOOR,
          missWhen: 'the timed speed differs from the proved speed by more than twice the fourth-order discretization estimate plus 2e-8',
          basis: 'deterministic', step: sim.step });
      }
    }
    function draw() { render(); status(); }
    // Chunks of about 24 ms keep the page responsive. With reduced motion the plate is drawn once, when complete.
    function chunk() {
      timer = 0; if (paused || !sim || sim.halted) return;
      const end = performance.now() + 24;
      do { sim.advance(1); } while (sim.step < sim.steps && !sim.halted && performance.now() < end);
      if (host.reducedMotion() && sim.step < sim.steps && !sim.halted) status(); else draw();
      if (sim.step < sim.steps && !sim.halted) timer = setTimeout(chunk, 0);
    }
    function start() { stop(); if (sim && !paused && !sim.halted && sim.step < sim.steps) timer = setTimeout(chunk, 0); }
    return {
      aspect(s) { return ASPECTS[s.aspect] || 1.25; },
      fieldCells() { return sim ? [sim.M, sim.rows] : null; },
      regenerate() {
        stop(); sim = makeSim(host.getState()); paused = false; uploaded = 0; uploadedView = '';
        draw(); start();
      },
      repaint() { if (sim) draw(); }, resize() { if (sim) render(); },
      pause() { paused = true; stop(); }, resume() { paused = false; start(); },
      async exportData() {
        if (!sim) throw Error('nothing to export');
        const s = host.getState(), m = sim.measure(), R = sim.recorded, M = sim.M;
        const time = new Float64Array(R), x = new Float64Array(M), fronts = [];
        for (let k = 0; k < R; k++) time[k] = k * sim.every * sim.dt;
        for (let j = 0; j < M; j++) x[j] = (j * sim.stride + .5) * sim.h;
        for (const tr of sim.tracks) for (let k = 0; k < tr.t.length; k++) fronts.push(tr.id, tr.dir, tr.t[k], tr.x[k], tr.iso[k] ? 1 : 0);
        const proved = provedAt(s);
        return {
          arrays: {
            u: { data: sim.histU.slice(0, R * M), shape: [R, M], description: 'activity u(x, t); row k is time[k], column j is x[j]' },
            v: { data: sim.histV.slice(0, R * M), shape: [R, M], description: 'recovery v(x, t) on the same rows and columns' },
            time: { data: time, shape: [R], units: 'model time (membrane time constant 1)' },
            x: { data: x, shape: [M], units: 'model length (kernel length scale 1)', description: sim.stride > 1 ? 'every ' + sim.stride + 'th simulation cell centre' : 'simulation cell centres' },
            fronts: { data: new Float64Array(fronts), shape: [fronts.length / 5, 5], description: 'theta crossings where u rises: track id, direction (+1 right), time, unwrapped position, 1 if isolated' },
          },
          meta: { tab: 'neural-field', equation: 'u_t = -u - v + w*S(u), v_t = eps u, w(x) = exp(-|x|)/2, S(u) = 1/(1 + exp(-beta (u - theta)))',
            beta: s.beta, theta: s.theta, eps: s.eps, restState: { u: 0, v: sim.S0 }, boundary: 'periodic', length: sim.L, cells: sim.N, dx: sim.h,
            dt: sim.dt, steps: sim.step, time: sim.step * sim.dt, rowEvery: sim.every, kernel: 'Numerov fourth-order periodic solve of r - r_xx = S(u)',
            integrator: 'classical RK4', stimuli: sim.kicks.map(k => ({ x: k.x, t: k.step * sim.dt, amplitude: k.amp, width: s.width })),
            speed: m.best ? { value: m.best.speed, from: m.best.t0, to: m.best.t1, track: m.best.track, proved: proved ? { lower: proved.text, width: 1e-25, source: proved.source, discretizationEstimate: errorEstimate(proved, sim.h, sim.dt) } : null } : null,
            halted: sim.halted || null, precision: 'float64 state, float32 record' },
        };
      },
      async exportPNG(w, h) {
        if (!sim) throw Error('No neural field recording');
        if (Math.max(w, h) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw Error('Print exceeds GPU texture limit (' + gl.getParameter(gl.MAX_TEXTURE_SIZE) + ' px)');
        const target = new G.Target(gl, w, h, { type: 'rgba8' }), bytes = new Uint8Array(w * h * 4);
        try { render(target); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bytes); }
        finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); target.dispose(); }
        const out = document.createElement('canvas'); out.width = w; out.height = h;
        const ctx = out.getContext('2d'), image = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) image.data.set(bytes.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        ctx.putImageData(image, 0, 0); return U.toBlob(out);
      },
    };
  }

  Studio.register({
    id: 'neural-field', name: 'Neural-Field Pulse', tab: 'Neural Field', subtitle: 'a traveling pulse of cortical activity · 2001', order: 45.8,
    equation: '∂u/∂t = −u − v + w ∗ S(u);  ∂v/∂t = εu;  w(x) = e^−|x|/2;  S(u) = 1/(1 + e^−β(u − θ))',
    credit: 'D. J. Pinto and G. B. Ermentrout, Spatially structured activity in synaptically coupled neuronal networks: I. Traveling fronts and pulses, SIAM J. Appl. Math. 62, 206–225 (2001), eq. (3) with the feedback decay set to zero; S. Amari, Dynamics of pattern formation in lateral-inhibition type neural fields, Biol. Cybern. 27, 77–87 (1977). The pulse speeds compared at β = 20, θ = 1/4, ε = 1/10 and at β = 12, θ = 1/4, ε = 3/20 are computer-assisted enclosures drafted in this repository (papers/nf-pulse). Original implementation of established equations.',
    blurb: 'A line of cortex, treated as a continuum: u is the local activity, S(u) the firing rate, and every point excites its neighbors through a kernel that falls off as e^−|x|, while a slow recovery variable v builds up wherever the tissue has been active and shuts it down. Space runs across the plate and time runs down it, so a traveling pulse is a slanted stripe. A brief stimulus in the middle launches two pulses that run apart at constant speed and meet again on the far side of the ring, where each runs into the other\'s refractory wake and both die. The gain β sets how sharp the firing threshold θ is; the recovery rate ε sets how long each patch stays lit, so a small ε gives wide pulses and a large one extinguishes them. Other stimulus patterns show collisions, a pacemaker train and the threshold for launching a pulse at all. At the default point the plate settles onto the fast pulse, whose speed is compared with a proved value; a slower pulse also exists there, is expected to be unstable, and never appears.',
    palette: true, defaultPalette: 'ember', headline: 'eps', headlineLabel: 'recovery rate ε', defaults: { ...DEFAULTS },
    schema: [
      range('Model', 'beta', 'Gain β', 'geom', 8, 40, .5, v => v.toFixed(1)),
      range('Model', 'theta', 'Threshold θ', 'geom', .15, .45, .005, v => v.toFixed(3)),
      range('Model', 'eps', 'Recovery rate ε', 'geom', .01, .3, .005, v => v.toFixed(3)),
      { group: 'Stimulus', key: 'stimulus', label: 'Stimulus', type: 'seg', kind: 'geom', options: [['single', 'One kick'], ['scatter', 'Scattered'], ['pacemaker', 'Pacemaker'], ['ladder', 'Threshold ladder']] },
      range('Stimulus', 'kick', 'Kick amplitude', 'geom', .1, 2, .05, v => v.toFixed(2)),
      range('Stimulus', 'width', 'Kick width', 'geom', .5, 8, .25, v => v.toFixed(2)),
      range('Stimulus', 'count', 'Kicks', 'geom', 2, 14, 1, String),
      range('Stimulus', 'period', 'Pacemaker period', 'geom', 6, 60, 1, String),
      range('Recording', 'length', 'Ring length', 'geom', 60, 400, 10, String),
      range('Recording', 'duration', 'Duration', 'geom', 30, 240, 5, String),
      { group: 'Recording', key: 'cells', label: 'Cells', type: 'seg', kind: 'geom', options: [[1024, '1,024'], [2048, '2,048'], [4096, '4,096 · heavy']] },
      { group: 'Recording', key: 'dt', label: 'Time step', type: 'seg', kind: 'geom', options: [[.1, '0.1'], [.05, '0.05'], [.025, '0.025']] },
      { group: 'Picture', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      { group: 'Picture', key: 'view', label: 'Color', type: 'seg', kind: 'paint', options: [['activity', 'Activity u'], ['rate', 'Firing rate S(u)'], ['recovery', 'Recovery v']] },
      range('Picture', 'tone', 'Tone', 'paint', .35, 3, .05, v => v.toFixed(2)),
    ],
    presets: {
      proved: pre('The proved pulse', { beta: 20, theta: .25, eps: .1, stimulus: 'single', kick: 1, width: 2, length: 240, duration: 100, view: 'recovery', tone: 1 }, Pal.ember),
      gain12: pre('Pinto and Ermentrout’s rate', { beta: 12, theta: .25, eps: .15, stimulus: 'single', kick: 1, width: 2, length: 240, duration: 110, view: 'activity', tone: .45 }, Pal.glacier),
      collisions: pre('Collisions', { beta: 20, theta: .25, eps: .1, stimulus: 'scatter', count: 7, kick: 1, width: 2, length: 300, duration: 160, view: 'rate', tone: 1 }, Pal.risograph),
      pacemaker: pre('Pacemaker train', { beta: 20, theta: .25, eps: .1, stimulus: 'pacemaker', period: 20, kick: 1, width: 2, length: 240, duration: 150, view: 'activity', tone: .7 }, Pal.verdigris),
      threshold: pre('Threshold ladder', { beta: 20, theta: .25, eps: .1, stimulus: 'ladder', count: 5, kick: .45, width: 1.5, length: 360, duration: 120, view: 'rate', tone: 1 }, Pal.graphite),
      wide: pre('Slow recovery', { beta: 20, theta: .25, eps: .03, stimulus: 'single', kick: 1, width: 2, length: 240, duration: 120, view: 'recovery', tone: .6 }, Pal.nightshade),
      refractory: pre('Refractory block', { beta: 40, theta: .3, eps: .03, stimulus: 'pacemaker', period: 30, kick: 1.2, width: 2, length: 240, duration: 150, view: 'activity', tone: 1.2 }, Pal.thermal),
    },
    hints: {
      Model: 'β is the gain of the logistic firing rate and θ its threshold; ε is the rate at which the recovery variable integrates activity (no recovery decay, γ = 0). The rest state is u = 0, v = S(0). It is stable while S′(0) = βS(0)(1 − S(0)) < 1, which the status line checks; above that the whole ring oscillates on its own. The pulse speed is compared with a proved value only at β = 20, θ = 0.25, ε = 0.1 and at β = 12, θ = 0.25, ε = 0.15; elsewhere it is printed as a measurement alone. At the first point a slow pulse (speed about 0.3775) is proved to exist as well. It is expected to be unstable: a kick right at the launch threshold hesitates, its fronts creeping at about 0.1, and then dies or accelerates to the fast pulse, and none settles at the slow speed.',
      Stimulus: 'Each kick adds A e^−(x − x0)²/w² to u between two steps. One kick sits in the middle of the ring at t = 0. Scattered kicks fall at seeded places and times in the first 60 per cent of the run; a kick that lands in refractory tissue fails. The pacemaker kicks the middle every period until 80 per cent of the run. The ladder kicks at evenly spaced places with amplitudes rising from A/n to A, so the weak ones fade.',
      Recording: 'Units are the membrane time constant and the kernel length. The ring is periodic. The kernel term is the periodic solution of r − r″ = S(u) with Numerov’s fourth-order stencil, and classical RK4 advances u and v. There is no diffusion, so no grid-scale mode is stiff: whatever the cell size, the decaying eigenvalues of the linearization are real in [−1, 0) or complex of modulus √ε with real part in [−1/2, 0), and RK4 is stable on them for any step below 2.78; every offered step is at most 0.1. At the default point the timed speed is low by about 9.2e-3 dx⁴ + 1.0e-3 dt⁴, fourth order in each. Rows are stored every few steps and columns at up to 2,048 cells; more print pixels do not add resolution.',
      Picture: 'Activity maps u from 0 (the paper) to its largest value, so the refractory undershoot below zero stays blank. Firing rate shows S(u) from 0 to 1, the sharpest-edged view. Recovery maps v from its rest value S(0) to its largest value and shows the wake the pulses leave. Tone bends the ramp.',
    },
    closedGroups: ['Recording', 'Picture'],
    surprise(rng) {
      const pick = rng.pick(['single', 'scatter', 'scatter', 'pacemaker', 'ladder']);
      return { beta: Math.round(rng.range(14, 32) * 2) / 2, theta: Math.round(rng.range(.22, .32) * 200) / 200, eps: Math.round(rng.range(.04, .13) * 200) / 200,
        stimulus: pick, kick: 1.1, width: 2, count: rng.int(3, 9), period: rng.int(16, 34), length: rng.pick([200, 240, 300]), duration: rng.pick([100, 130, 160]),
        view: rng.pick(['activity', 'rate', 'recovery']), tone: Math.round(rng.range(.6, 1.4) * 20) / 20 };
    },
    sanitize(s) {
      const num = (v, d, a, b) => U.clamp(Number.isFinite(Number(v)) ? Number(v) : d, a, b);
      s.beta = num(s.beta, DEFAULTS.beta, 8, 40); s.theta = num(s.theta, DEFAULTS.theta, .15, .45); s.eps = num(s.eps, DEFAULTS.eps, .01, .3);
      s.stimulus = ['single', 'scatter', 'pacemaker', 'ladder'].includes(s.stimulus) ? s.stimulus : DEFAULTS.stimulus;
      s.kick = num(s.kick, DEFAULTS.kick, .1, 2); s.width = num(s.width, DEFAULTS.width, .5, 8);
      s.count = Math.round(num(s.count, DEFAULTS.count, 2, 14)); s.period = Math.round(num(s.period, DEFAULTS.period, 6, 60));
      s.length = Math.round(num(s.length, DEFAULTS.length, 60, 400) / 10) * 10; s.duration = Math.round(num(s.duration, DEFAULTS.duration, 30, 240) / 5) * 5;
      s.cells = [1024, 2048, 4096].includes(Number(s.cells)) ? Number(s.cells) : DEFAULTS.cells;
      s.dt = [.1, .05, .025].includes(Number(s.dt)) ? Number(s.dt) : DEFAULTS.dt;
      s.aspect = Object.prototype.hasOwnProperty.call(ASPECTS, s.aspect) ? s.aspect : DEFAULTS.aspect;
      s.view = ['activity', 'rate', 'recovery'].includes(s.view) ? s.view : DEFAULTS.view;
      s.tone = num(s.tone, DEFAULTS.tone, .35, 3);
    },
    create,
  });
})();
