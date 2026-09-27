// The neural-field tab against the computer-assisted pulse speeds of papers/nf-pulse. Node only, about a minute.
//   node tools/neural-field-science.js           run every check and print the results
//   node tools/neural-field-science.js --write   also write validation/results/neural-field-science.json
//
// What it checks, on the maintained source of src/modules/neural-field.js loaded unchanged:
//   1. the kernel solve: a constant returns itself, Fourier modes return f/(1 + q^2) with an error that falls at
//      fourth order, and the discrete symbol lies in (0, 1], which the step bound below rests on;
//   2. the RK4 step bound, computed over the eigenvalue set of the linearization for every offered step and every
//      recovery rate on the slider;
//   3. the timed pulse speed at the two proved points under grid refinement (cells 1024, 2048, 4096 with the time
//      step halved each time), the observed order, the error constants K (space) and Kt (time) estimated from the
//      refinement alone, the Richardson limit against the proved speed, and the module's witness tolerance;
//   4. the timing rules: launch transient, window choice, stimulus shape, kicks behind a front, a short ring;
//   5. negative controls that must fail: recovery rate 0.5 (no fast pulse), a kernel of twice the mass, and the
//      second-order stencil in place of Numerov's;
//   6. every preset to completion, and determinism.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..'), file = path.join(root, 'src/modules/neural-field.js');
const source = fs.readFileSync(file, 'utf8'), shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();
const stats = require(path.join(root, 'src/shared/stats.js'));
const started = performance.now();
function load(text) {
  const hooks = {}, marker = '  Studio.register({';
  assert.equal(text.split(marker).length, 2);
  let mod;
  const Studio = { util: { makeRng, clamp: (x, a, b) => Math.max(a, Math.min(x, b)), stats }, gl: { GLSL: { bicubic: '', ramp: '' } },
    PALETTES: new Proxy({}, { get: () => ({}) }), register(m) { mod = m; } };
  new Function('Studio', 'hooks', text.replace(marker, '  Object.assign(hooks,{makeSim,makeKernel,stimuli,PROVED,FLOOR,SKIP,MIN_WINDOW,AHEAD,REST_FROM,REST_TOL,provedAt});\n' + marker))(Studio, hooks);
  return { ...hooks, mod };
}
const A = load(source);
const config = (p, mod = A.mod) => { const s = { ...mod.defaults, ...p }; if (!p.raw) mod.sanitize(s); return s; };
function run(p, B = A) {
  const s = config(p, B.mod), sim = B.makeSim(s), t0 = performance.now();
  while (sim.step < sim.steps && !sim.halted) sim.advance(4096);
  return { s, sim, m: sim.measure(), seconds: (performance.now() - t0) / 1000 };
}
const out = {};
const log = (...a) => console.error(...a);

// ---- 1. kernel ----
{
  const k = A.makeKernel(1000, .1), f = new Float64Array(1000).fill(1), r = new Float64Array(1000);
  k.solve(f, r);
  const constantError = Math.max(...Array.from(r, x => Math.abs(x - 1)));
  assert(constantError < 1e-13);
  const modes = [];
  for (const wave of [1, 3, 12]) {
    const L = 40, q = 2 * Math.PI * wave / L, row = { wave, q, errors: [] };
    for (const N of [100, 200, 400, 800]) {
      const h = L / N, kk = A.makeKernel(N, h), ff = new Float64Array(N), rr = new Float64Array(N);
      for (let i = 0; i < N; i++) ff[i] = Math.cos(q * (i + .5) * h);
      kk.solve(ff, rr);
      let e = 0; for (let i = 0; i < N; i++) e = Math.max(e, Math.abs(rr[i] - ff[i] / (1 + q * q)));
      row.errors.push({ N, h, maxError: e });
    }
    row.ratios = row.errors.slice(1).map((e, i) => row.errors[i].maxError / e.maxError);
    modes.push(row);
  }
  // Wave 1 is resolved to rounding already; the others must fall at fourth order.
  for (const row of modes.filter(r => r.wave > 1)) for (const ratio of row.ratios.slice(0, 2)) assert(ratio > 14 && ratio < 18, 'Numerov ratio ' + ratio);
  // The discrete symbol: the solve applied to cos(k x) returns sigma(k) cos(k x). The step bound uses 0 < sigma <= 1.
  const N = 256, h = .25, ks = A.makeKernel(N, h), fs2 = new Float64Array(N), rs = new Float64Array(N);
  let minSymbol = Infinity, maxSymbol = -Infinity, monotone = true, last = Infinity;
  for (let m = 0; m <= N / 2; m++) {
    for (let i = 0; i < N; i++) fs2[i] = Math.cos(2 * Math.PI * m * i / N);
    ks.solve(fs2, rs);
    const sigma = rs[0] / fs2[0];
    for (let i = 0; i < N; i++) assert(Math.abs(rs[i] - sigma * fs2[i]) < 1e-12);
    minSymbol = Math.min(minSymbol, sigma); maxSymbol = Math.max(maxSymbol, sigma);
    if (sigma > last + 1e-15) monotone = false; last = sigma;
  }
  assert(minSymbol > 0 && Math.abs(maxSymbol - 1) < 1e-12 && monotone);
  out.kernel = { method: 'Numerov periodic solve of r - r_xx = f', constantError, modes, symbol: { N, h, min: minSymbol, max: maxSymbol, monotoneDecreasing: monotone } };
  log('kernel ok: constant error', constantError, 'symbol in', minSymbol, maxSymbol);
}

// ---- 2. the RK4 step bound ----
// Linearization about any state: A = -I + K diag(S'(u)), K the discrete kernel (symmetric, symbol in (0, 1]) and
// 0 <= S' <= beta/4, so A is similar to a symmetric matrix with real eigenvalues mu in [-1, -1 + beta/4]. The full
// Jacobian [[A, -I], [eps I, 0]] then has eigenvalues lambda with lambda + eps/lambda = mu. Decaying ones are real
// in [-1, 0) or complex with modulus sqrt(eps) and real part mu/2 in [-1/2, 0). RK4 is stable where
// |1 + z + z^2/2 + z^3/6 + z^4/24| <= 1, z = dt lambda.
{
  const R = (x, y) => { // |R(z)| for z = x + iy
    let re = 1, im = 0, pr = 1, pi = 0;
    for (const c of [1, 1 / 2, 1 / 6, 1 / 24]) { const nr = pr * x - pi * y, ni = pr * y + pi * x; pr = nr; pi = ni; re += c * pr; im += c * pi; }
    return Math.hypot(re, im);
  };
  const decaying = eps => {
    const out2 = [];
    for (let k = 0; k <= 2000; k++) {
      const mu = -k / 2000, disc = mu * mu - 4 * eps;
      if (disc >= 0) { out2.push([(mu + Math.sqrt(disc)) / 2, 0], [(mu - Math.sqrt(disc)) / 2, 0]); }
      else out2.push([mu / 2, Math.sqrt(-disc) / 2]);
    }
    return out2;
  };
  const stableAt = (dt, eps) => decaying(eps).every(([x, y]) => R(dt * x, dt * y) <= 1 + 1e-12);
  const rows = [];
  for (const eps of [.01, .1, .3]) {
    let lo = 0, hi = 10;
    for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (stableAt(mid, eps)) lo = mid; else hi = mid; }
    rows.push({ eps, largestStableStep: lo });
    for (const dt of [.1, .05, .025]) assert(stableAt(dt, eps));
  }
  out.stepBound = { argument: 'eigenvalues of the linearization: real in [-1, 0) or modulus sqrt(eps) with real part in [-1/2, 0) for the decaying modes, independent of the cell size', rows,
    offeredSteps: [.1, .05, .025], note: 'Growing modes (mu > 0, up to beta/4 - 1) are the physical instability of the front; at dt = 0.1 and beta = 40 dt times the largest growth rate is 0.9.' };
  log('step bound ok', JSON.stringify(rows));
}

// ---- 3. the pulse speed under refinement at the proved points ----
function refine(point, extra) {
  const base = { beta: point.beta, theta: point.theta, eps: point.eps, stimulus: 'single', kick: 1, width: 2, length: 240, duration: 100, ...extra };
  const grid = [[1024, .1], [2048, .05], [4096, .025]].map(([cells, dt]) => {
    const { sim, m, seconds } = run({ ...base, cells, dt });
    assert(m.best, 'no timed pulse at ' + cells);
    return { cells, dt, dx: sim.h, speed: m.best.speed, window: [m.best.t0, m.best.t1], rows: m.best.rows, fronts: m.tracks, errorFromProved: m.best.speed - point.c, seconds };
  });
  const [a, b, c] = grid;
  // Both errors are fourth order (Numerov in space, RK4 in time) and they are separated below; with dt halved with
  // dx the combined error still falls by 16.
  const order = Math.log2((a.speed - b.speed) / (b.speed - c.speed));
  const times = [.1, .05, .025].map(dt => { const { sim, m } = run({ ...base, cells: 2048, dt }); return { dt, dx: sim.h, speed: m.best.speed }; });
  const Kt = (times[1].speed - times[2].speed) / (Math.pow(.05, 4) - Math.pow(.025, 4));
  const timeOrder = Math.log2((times[0].speed - times[1].speed) / (times[1].speed - times[2].speed));
  // The space constant from the two finest grids, after removing the time part measured above. The proved value
  // is not used to estimate either constant.
  const spaceB = b.speed - Kt * Math.pow(b.dt, 4), spaceC = c.speed - Kt * Math.pow(c.dt, 4);
  const K = (spaceB - spaceC) / (Math.pow(b.dx, 4) - Math.pow(c.dx, 4));
  const limit = spaceC - K * Math.pow(c.dx, 4);
  return { base, grid, observedOrder: order, timeRefinement: times, timeOrder, K, Kt, richardsonLimit: limit, limitMinusProved: limit - point.c };
}
const tolerance = (point, dx, dt) => 2 * (Math.abs(point.K) * Math.pow(dx, 4) + Math.abs(point.Kt) * Math.pow(dt, 4)) + A.FLOOR;
out.proved = [];
for (const point of A.PROVED) {
  const r = refine(point, point.beta === 12 ? { duration: 110 } : {});
  log(point.source, 'order', r.observedOrder.toFixed(3), 'K', r.K.toExponential(3), 'Kt', r.Kt.toExponential(3), 'limit-proved', r.limitMinusProved.toExponential(2));
  for (const g of r.grid) log('   cells', g.cells, 'dt', g.dt, 'speed', g.speed, 'error', g.errorFromProved.toExponential(3), 'tol', tolerance(point, g.dx, g.dt).toExponential(2));
  assert(r.observedOrder > 3.6 && r.observedOrder < 4.4, 'observed order ' + r.observedOrder);
  assert(Math.abs(r.limitMinusProved) < A.FLOOR, 'Richardson limit misses the proved speed by ' + r.limitMinusProved);
  assert(Math.abs(r.K - point.K) < .05 * Math.abs(r.K), 'module K ' + point.K + ' differs from measured ' + r.K);
  assert(Math.abs(r.Kt - point.Kt) < .1 * Math.abs(r.Kt) + 1e-6, 'module Kt ' + point.Kt + ' differs from measured ' + r.Kt);
  for (const g of r.grid) assert(Math.abs(g.errorFromProved) <= tolerance(point, g.dx, g.dt), 'witness tolerance fails at ' + g.cells);
  // The coarsest spacing the sliders reach (ring 400 on 1,024 cells), at the coarsest step, and the finest cells with
  // the coarsest step: the fourth-order estimate must still cover the error there.
  const corners = [];
  for (const [length, cells, dt, duration] of [[400, 1024, .1, 160], [240, 4096, .1, 100], [400, 1024, .025, 160]]) {
    const { sim, m } = run({ ...r.base, length, cells, dt, duration });
    const tol = tolerance(point, sim.h, dt), err = m.best.speed - point.c;
    corners.push({ length, cells, dt, dx: sim.h, speed: m.best.speed, error: err, tolerance: tol, estimate: point.K * Math.pow(sim.h, 4) + point.Kt * Math.pow(dt, 4) });
    assert(Math.abs(err) <= tol, 'corner ' + length + '/' + cells + '/' + dt + ' error ' + err + ' tolerance ' + tol);
  }
  out.proved.push({ point: { beta: point.beta, theta: point.theta, eps: point.eps, gamma: 0, provedLower: point.text + '...', width: 1e-25, source: point.source }, moduleK: point.K, moduleKt: point.Kt, ...r, corners });
}

// ---- 4. timing rules ----
{
  const P = A.PROVED[0];
  // On the finest grid, where the part of the window dependence that falls with the grid (about 3e-8 between these
  // windows at the default 2,048 cells) is below 3e-9, so what remains is the launch transient.
  const { sim } = run({ stimulus: 'single', cells: 4096, dt: .025 });
  const tr = sim.tracks[0], fit = (t0, t1) => {
    let n = 0, st = 0, sx = 0, stt = 0, stx = 0;
    tr.t.forEach((t, k) => { if (t >= t0 && t <= t1) { const x = tr.x[k]; n++; st += t; sx += x; stt += t * t; stx += t * x; } });
    return Math.abs((n * stx - st * sx) / (n * stt - st * st));
  };
  const windows = [[10, 30], [20, 40], [30, 55], [40, 65], [55, 80]].map(([t0, t1]) => ({ from: t0, to: t1, speed: fit(t0, t1), minusLate: fit(t0, t1) - fit(55, 80) }));
  // After SKIP the speed no longer depends on the window; before it, the launch transient shows.
  assert(Math.abs(windows[2].minusLate) < 1e-8 && Math.abs(windows[0].minusLate) > 1e-5);
  const stimuliRows = [];
  for (const [kick, width] of [[.3, 2], [2, .5], [2, 8], [.26, 1.5], [.5, 8], [1, 4]]) {
    const { sim: s2, m } = run({ stimulus: 'single', kick, width });
    const err = m.best.speed - P.c, tol = tolerance(P, s2.h, s2.dt);
    stimuliRows.push({ kick, width, speed: m.best.speed, error: err, tolerance: tol });
    assert(Math.abs(err) <= tol);
  }
  const short = run({ stimulus: 'single', length: 60, duration: 60 });
  assert.equal(short.m.best, null);
  // A kick behind the left front still couples to it through the symmetric kernel. Check that front alone:
  // selecting the longest window across both fronts could hide its bad speed behind the unaffected right one.
  const baseline = run({}), kickTime = 42.3, behind = 8.7;
  const left = baseline.sim.tracks.find(tr => tr.dir === -1);
  const row = left.t.findIndex(t => Math.abs(t - kickTime) < 1e-9);
  assert(row >= 0 && baseline.m.timed === 2, 'default plate must supply two timed fronts and the kick row');
  const kicked = A.makeSim(baseline.s);
  const kickX = (left.x[row] - left.dir * behind + kicked.L) % kicked.L;
  kicked.kicks.push({ x: kickX, t: kickTime, step: Math.round(kickTime / kicked.dt), amp: 1 });
  while (kicked.step < kicked.steps && !kicked.halted) kicked.advance(4096);
  assert.equal(kicked.halted, '');
  const tracks = kicked.tracks, affected = tracks.find(tr => tr.id === left.id);
  assert(affected && affected.dir === -1 && affected.t.at(-1) > kickTime + A.MIN_WINDOW);
  let affectedTiming;
  try { kicked.tracks = [affected]; affectedTiming = kicked.measure().best; }
  finally { kicked.tracks = tracks; }
  const kickTol = tolerance(P, kicked.h, kicked.dt);
  const kickError = affectedTiming ? affectedTiming.speed - P.c : null;
  log('behind kick:', affectedTiming ? 'error ' + kickError + ', tolerance ' + kickTol : 'affected front untimed');
  assert(!affectedTiming || Math.abs(kickError) <= kickTol, 'kick behind the front must end its clear run or leave its speed within tolerance');
  const behindKick = { time: kickTime, behind, amplitude: 1, x: kickX, track: affected.id, timed: affectedTiming, error: kickError, tolerance: kickTol };
  // The same failure can occur with an ordinary seeded scatter recipe, without an injected stimulus.
  const scatter = run({ stimulus: 'scatter', seed: 'probe-54', count: 2 });
  const scatterTol = tolerance(P, scatter.sim.h, scatter.sim.dt);
  const scatterError = scatter.m.best ? scatter.m.best.speed - P.c : null;
  assert(!scatter.m.best || Math.abs(scatterError) <= scatterTol, 'probe-54 scatter witness misses the proved speed');
  const scatterKick = { seed: 'probe-54', count: 2, timed: scatter.m.best, error: scatterError, tolerance: scatterTol };
  const sub = run({ stimulus: 'single', kick: .2, width: 2, duration: 60 });
  assert.equal(sub.m.best, null); assert.equal(sub.m.alive, 0);
  // At the launch threshold (kick width 1.5, found by bisection) the fronts hesitate, creeping at about 0.1, and then
  // either die or accelerate to the fast pulse. None settles at the slow pulse's speed (about 0.3775,
  // papers/nf-pulse/ext/slow-pulse), which the accelerating front only passes through.
  let lo = .05, hi = 1.5;
  for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (run({ stimulus: 'single', kick: mid, width: 1.5, duration: 40 }).m.alive) hi = mid; else lo = mid; }
  const profile = kick => {
    const r2 = run({ stimulus: 'single', kick, width: 1.5, duration: 40 }), tr = r2.sim.tracks.find(t => t.dir === 1), rows = [];
    for (let k = 10; tr && k < tr.t.length; k += 10) rows.push({ t: +tr.t[k].toFixed(2), speed: (tr.x[k] - tr.x[k - 10]) / (tr.t[k] - tr.t[k - 10]) });
    return { kick, alive: r2.m.alive, rows };
  };
  const up = profile(hi * (1 + 1e-6)), down = profile(lo * (1 - 1e-6));
  const at = (p, t) => p.rows.find(r => r.t >= t - 1e-9).speed;
  assert(up.alive === 2 && down.alive === 0);
  assert(at(up, 3) > .05 && at(up, 3) < .2 && at(up, 4) < .2 && Math.abs(at(up, 20) - P.c) < 1e-3 * P.c);
  const settled = up.rows.filter(r => Math.abs(r.speed - .3775) < .05).length;
  assert(settled <= 2, 'the front lingered near the slow pulse speed');
  const nearThreshold = { width: 1.5, threshold: [lo, hi], launched: up, died: down, rowsWithin005OfSlowSpeed: settled };
  out.timing = { nearThreshold, skip: A.SKIP, minWindow: A.MIN_WINDOW, ahead: A.AHEAD, restFrom: A.REST_FROM, restTol: A.REST_TOL, windows, stimuli: stimuliRows, behindKick, scatterKick,
    shortRing: { length: 60, timed: short.m.best, fronts: short.m.tracks, note: 'a ring no longer than twice the clear distance never isolates a front, so nothing is timed' },
    subthreshold: { kick: .2, width: 2, fronts: sub.m.tracks, alive: sub.m.alive } };
  log('timing ok', JSON.stringify(windows.map(w => w.minusLate.toExponential(2))));
}

// ---- 5. negative controls ----
{
  const P = A.PROVED[0], controls = {};
  // eps = 0.5: at gain 20 and threshold 1/4 the pulse dies. No front may survive or be timed.
  const fast = run({ beta: 20, theta: .25, eps: .5, stimulus: 'single', kick: 1, width: 2, length: 240, duration: 100, cells: 2048, dt: .05, raw: true });
  assert.equal(fast.m.best, null); assert.equal(fast.m.alive, 0);
  const lastFront = Math.max(...fast.sim.tracks.map(t => t.t[t.t.length - 1]));
  controls.recoveryRateHalf = { eps: .5, timed: null, fronts: fast.m.tracks, lastFrontTime: lastFront, expected: 'no pulse: every front ends and nothing is timed' };
  // A wrong kernel normalization: mass m instead of 1 (m = 2 is e^-|x| in place of e^-|x|/2). The uniform rest state
  // moves to v = m S(0), so the mutated plate starts there; otherwise the whole ring drifts and nothing is timed.
  const withMass = m => {
    const text = source.replace('scale = mu / -a,', 'scale = ' + m + ' * mu / -a,').replace('S0 = S(0),', 'S0 = ' + m + ' * S(0),');
    assert.notEqual(text, source);
    return load(text);
  };
  controls.kernelMass = [];
  // At mass 2 the fronts run at about 3.6, so the ring is lengthened past the slider (raw) to leave a timing window.
  for (const [m, extra] of [[2, { length: 1000, cells: 4096, duration: 100, raw: true }], [1.001, {}]]) {
    const r2 = run({ stimulus: 'single', ...extra }, withMass(m));
    assert(r2.m.best, 'mass ' + m + ' timed nothing');
    const dm = r2.m.best.speed - P.c, dtol = tolerance(P, r2.sim.h, r2.sim.dt);
    assert(Math.abs(dm) > 10 * dtol, 'mass ' + m + ' error ' + dm + ' tolerance ' + dtol);
    controls.kernelMass.push({ mass: m, length: r2.s.length, cells: r2.sim.N, speed: r2.m.best.speed, error: dm, tolerance: dtol, witness: 'fails' });
  }
  const dm = controls.kernelMass[0].error;
  // The second-order stencil: the speed misses the witness tolerance and converges at second order.
  const fd2src = source.replace("const a = -(1 - h * h / 12), b = 2 + 10 * h * h / 12, wl = h * h / 12, wc = 10 * h * h / 12;", 'const a = -1, b = 2 + h * h, wl = 0, wc = h * h;');
  assert.notEqual(fd2src, source);
  const fd2 = load(fd2src), rows = [[1024, .1], [2048, .05], [4096, .025]].map(([cells, dt]) => {
    const { sim, m } = run({ stimulus: 'single', cells, dt }, fd2);
    return { cells, dt, dx: sim.h, speed: m.best.speed, error: m.best.speed - P.c, tolerance: tolerance(P, sim.h, dt) };
  });
  for (const r of rows) assert(Math.abs(r.error) > 10 * r.tolerance);
  const fd2Order = Math.log2(rows[0].error / rows[1].error);
  assert(fd2Order > 1.8 && fd2Order < 2.2);
  controls.secondOrderStencil = { rows, observedOrder: fd2Order, witness: 'fails at every grid' };
  out.failureControls = controls;
  log('controls ok: doubled mass error', dm.toExponential(2), 'fd2 order', fd2Order.toFixed(2));
}

// ---- 6. presets and determinism ----
{
  const presets = [];
  for (const [name, preset] of [['default', { p: {} }], ...Object.entries(A.mod.presets)]) {
    const { s, sim, m, seconds } = run(preset.p);
    assert.equal(sim.halted, ''); assert.equal(sim.step, sim.steps); assert.equal(sim.recorded, sim.rows);
    assert(sim.histU.every(Number.isFinite) && sim.histV.every(Number.isFinite));
    const proved = A.provedAt(s);
    const row = { name, beta: s.beta, theta: s.theta, eps: s.eps, stimulus: s.stimulus, cells: sim.N, dx: sim.h, dt: sim.dt, rows: sim.rows, columns: sim.M,
      fronts: m.tracks, timed: m.timed, running: m.alive, speed: m.best ? m.best.speed : null, window: m.best ? [m.best.t0, m.best.t1] : null,
      restSlope: sim.slope0, peakU: sim.peak, lowU: sim.low, compared: !!(m.best && proved), seconds };
    if (m.best && proved) { row.error = m.best.speed - proved.c; row.tolerance = tolerance(proved, sim.h, sim.dt); assert(Math.abs(row.error) <= row.tolerance); }
    presets.push(row);
  }
  const hash = sim => crypto.createHash('sha256').update(Buffer.from(sim.histU.buffer)).update(Buffer.from(sim.histV.buffer)).digest('hex');
  const one = run({ stimulus: 'scatter' }), two = run({ stimulus: 'scatter' }), other = run({ stimulus: 'scatter', seed: 'another-seed' });
  assert.equal(hash(one.sim), hash(two.sim)); assert.notEqual(hash(one.sim), hash(other.sim));
  out.presets = presets;
  out.determinism = { sameSeedSameRecord: true, otherSeedOtherRecord: true, sha256: hash(one.sim) };
  log('presets ok', presets.map(p => p.name + ':' + (p.speed ? p.speed.toFixed(6) : 'untimed')).join(' '));
}

const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const result = {
  sourceSha256: sha(source), rngSha256: sha(rngSource), harnessSha256: sha(fs.readFileSync(__filename)),
  command: 'node tools/neural-field-science.js --write',
  scope: 'Pinto-Ermentrout neural field with logistic rate, gamma = 0, kernel exp(-|x|)/2, on a periodic ring: the maintained Float64 solver (Numerov kernel solve, classical RK4) and its front timing, against the computer-assisted speed enclosures at beta 20, theta 1/4, eps 1/10 (papers/nf-pulse) and beta 12, theta 1/4, eps 3/20 (papers/nf-pulse/ext/gain-12).',
  ...out,
  seconds: (performance.now() - started) / 1000,
  limitations: 'Deterministic finite-grid evidence at two parameter points only. The enclosures are computer-assisted proofs drafted in this repository; the timed speed is compared with them within a fourth-order error estimate whose constants come from this refinement. No stability proof is used: that the simulation settles on the fast pulse is observed, not proved. Other parameters, the display, the print path and the GPU are outside this check.',
};
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/neural-field-science.json'), JSON.stringify(result, null, 1) + '\n');
  log('wrote validation/results/neural-field-science.json');
}
console.log(JSON.stringify({ proved: out.proved.map(p => ({ source: p.point.source, order: p.observedOrder, K: p.K, Kt: p.Kt, limitMinusProved: p.limitMinusProved, grid: p.grid.map(g => [g.cells, g.dt, g.speed, g.errorFromProved]) })), seconds: result.seconds }, null, 1));
console.log('PASS');
