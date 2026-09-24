'use strict';
// Exact benchmarks, dimension measurement and print evidence for the Schramm-Loewner tab (src/modules/sle.js).
//
//   node tools/sle-science.js [--write]
//
// The module's makeTrace (the composition of vertical slit maps) and brownian (the driver) are extracted
// in Node with new Function and a hook, as tools/ust-review.js does, and driven directly. References are
// in tools/lib/sle-reference.js. What is tested:
//
//  1. Deterministic drivers with closed-form traces: xi = 0 (the segment of height 2 sqrt t), xi = c t
//     (Kager, Nienhuis and Kadanoff 2004) and xi = c sqrt t (a straight ray at angle alpha pi), with
//     step refinement at the tab's fixed capacity time 1. Controls: a slit of the wrong capacity and a
//     reversed composition order must fail.
//  2. The driver: quadratic variation of the tab's Brownian path against kappa. Control: doubled variance.
//  3. The trace dimension min(2, 1 + kappa/8) (Beffara 2008) by box counting over independent seeds at
//     kappa = 2, 4 and 6, with a fit range fixed in advance relative to each curve's size, reported
//     honestly against the theorem. Control: a driver of variance 2 kappa must shift the dimension.
//  4. Print. Five studio recipes through a copy of dist/studio.html with an auditRead() hook: the studio's
//     traces agree with the Node run, every SVG path vertex matches an independent reconstruction of the
//     page transform, the fallback PNG matches an independent painting, a displaced painting fails, and
//     exporting leaves the recipe and traces unchanged.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), { performance } = require('node:perf_hooks');
const R = require('./lib/sle-reference'), { bonferroniZ } = require('./lib/rmt-reference');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/sle.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const started = performance.now();
const WRITE = process.argv.includes('--write');
const log = (...a) => console.log(...a);
const round = (v, d = 6) => Number(v.toPrecision(d));
const mean = a => a.reduce((p, q) => p + q, 0) / a.length;
const sdev = a => { const m = mean(a); return Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / (a.length - 1)); };
const se = a => sdev(a) / Math.sqrt(a.length);
const makeRng = new Function('const TAU = Math.PI * 2;\n' + engine.slice(engine.indexOf('  function makeRng'), engine.indexOf('  function makeNoise')) + 'return makeRng;')();

/* ---------------- loading the module's code ---------------- */
const MARK_REGISTER = '  /* ---------- Schramm-Loewner Evolution ---------- */';
const MARK_RETURN = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
const AUDIT = '        auditRead() { const s = host.getState(); return { building, traces: traces.map(t => ({ kappa: t.kappa, N: t.N, done: t.done(), xs: Array.from(t.xs), ys: Array.from(t.ys) })), drives: plan(s).map(p => ({ kappa: p.kappa, drive: Array.from(p.drive) })) }; },\n';
function loadModule(src, label) {
  for (const m of [MARK_REGISTER, MARK_RETURN]) assert(src.includes(m), label + ': marker missing');
  const hooks = {};
  const code = src.replace(MARK_REGISTER, '  hooks.makeTrace = makeTrace; hooks.brownian = brownian; hooks.SWEEP = SWEEP;\n' + MARK_REGISTER).replace(MARK_RETURN, AUDIT + MARK_RETURN);
  const util = { clamp: (v, a, b) => Math.min(b, Math.max(a, v)), makeRng, makeRamp: () => () => [0, 0, 0], rgbToHex: () => '#000000', inkFor: () => '#000000', inkRgba: () => 'rgba(0,0,0,0)' };
  new Function('Studio', 'hooks', 'performance', code)({ util, PALETTES: {}, register(m) { hooks.mod = m; } }, hooks, performance);
  assert(hooks.mod && hooks.mod.id === 'sle');
  return hooks;
}
function variant(from, to, label) {
  assert(source.includes(from), label + ': control target not found');
  const out = source.replace(from, to);
  assert.notEqual(out, source);
  return loadModule(out, label);
}
const MOD = loadModule(source, 'module');
const WRONG_CAPACITY = variant('const h = 2 * Math.sqrt(dt), four = 4 * dt;', 'const h = 2 * Math.sqrt(dt), four = 2 * dt;', 'slit capacity dt instead of 2 dt');
const REVERSED = variant('for (let k = n - 1; k >= 0; k--) {', 'for (let k = 0; k <= n - 1; k++) {', 'reversed composition');
const DOUBLED = variant('const d = new Float64Array(N), s = Math.sqrt(kappa * dt);', 'const d = new Float64Array(N), s = Math.sqrt(2 * kappa * dt);', 'driver variance 2 kappa');

function trace(hooks, drive, dt) { const t = hooks.makeTrace(drive, dt); while (!t.done()) t.step(1e9); return t; }
// The tab's single-curve plan: seed + '/sle', N steps over capacity time 1.
const tabDrive = (hooks, seed, N, kappa) => hooks.brownian(makeRng(seed + '/sle'), N, 1 / N, kappa);

// Run the module's create() against a stub host and wait for every trace.
function runTab(hooks, recipe) {
  const state = Object.assign({}, hooks.mod.defaults, recipe, { palette: ['#000000', '#FFFFFF'], bg: '#101010' });
  hooks.mod.sanitize(state);
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  const host = { canvas: { width: 64, height: 64, getContext: () => ctx }, getState: () => state, setStatus: () => {} };
  const inst = hooks.mod.create(host);
  inst.regenerate();
  return new Promise(resolve => { (function poll() { const a = inst.auditRead(); if (!a.building && a.traces.every(t => t.done)) resolve({ state, audit: a }); else setTimeout(poll, 5); })(); });
}

/* ---------------- 1. deterministic drivers ---------------- */
const REFINE = [500, 1000, 2000, 4000, 8000];
function zeroCase(hooks) {
  return [300, 1000, 3000, 8000].map(N => {
    const t = trace(hooks, new Float64Array(N), 1 / N);
    let worst = 0;
    for (let n = 0; n < N; n++) { const [x, y] = R.zeroTrace((n + 1) / N); worst = Math.max(worst, Math.hypot(t.xs[n] - x, t.ys[n] - y) / y); }
    return { N, maxRelativeError: worst, tolerance: N * Number.EPSILON, pass: worst <= N * Number.EPSILON };
  });
}
// The driver is sampled at the right end of each step, as brownian() does: drive[k] = xi((k + 1) dt), and
// point n approximates gamma((n + 1) dt).
function linearCase(hooks, c) {
  const rows = REFINE.map(N => {
    const dt = 1 / N, drive = Float64Array.from({ length: N }, (_, k) => c * (k + 1) * dt), t = trace(hooks, drive, dt);
    let worst = 0;
    for (let n = 0; n < N; n++) { const [x, y] = R.linearTrace(c, (n + 1) * dt); worst = Math.max(worst, Math.hypot(t.xs[n] - x, t.ys[n] - y)); }
    const [xe, ye] = R.linearTrace(c, 1);
    return { N, maxError: worst, driverStep: Math.abs(c) * dt, errorOverDriverStep: worst / (Math.abs(c) * dt), endpoint: [t.xs[N - 1], t.ys[N - 1]], exactEndpoint: [xe, ye] };
  });
  const orders = rows.slice(1).map((r, i) => Math.log2(rows[i].maxError / r.maxError));
  return { c, rows, observedOrders: orders.map(o => round(o, 4)), pass: rows.every(r => r.maxError <= r.driverStep) && orders.every(o => o > 0.9 && o < 1.1) };
}
function sqrtCase(hooks, alpha) {
  const c = R.sqrtDriverCoefficient(alpha);
  const rows = REFINE.map(N => {
    const dt = 1 / N, drive = Float64Array.from({ length: N }, (_, k) => c * Math.sqrt((k + 1) * dt)), t = trace(hooks, drive, dt);
    const [xe, ye] = R.sqrtTrace(alpha, 1), L = Math.hypot(xe, ye), rel = Math.hypot(t.xs[N - 1] - xe, t.ys[N - 1] - ye) / L;
    // Scale covariance: xi = c sqrt t is self-similar, so the n-th point for step dt is sqrt(dt) times the
    // n-th point for step 1, and the relative error at step 500 cannot depend on N.
    const k = 499, [xk, yk] = R.sqrtTrace(alpha, (k + 1) * dt), relAt500 = Math.hypot(t.xs[k] - xk, t.ys[k] - yk) / Math.hypot(xk, yk);
    return { N, relativeErrorAtT1: rel, angleOverPi: Math.atan2(t.ys[N - 1], t.xs[N - 1]) / Math.PI, relativeErrorAtStep500: relAt500 };
  });
  const orders = rows.slice(1).map((r, i) => Math.log2(rows[i].relativeErrorAtT1 / r.relativeErrorAtT1));
  const spread500 = Math.max(...rows.map(r => r.relativeErrorAtStep500)) - Math.min(...rows.map(r => r.relativeErrorAtStep500));
  return { alpha, c, rows, observedOrders: orders.map(o => round(o, 4)), step500Spread: spread500,
    pass: rows.every(r => r.relativeErrorAtT1 <= 1 / r.N) && orders.every(o => o > 0.9 && o < 1.1) && spread500 < 1e-9 };
}
function deterministic(hooks) {
  return { zero: zeroCase(hooks), linear: [2, -3, 0.5].map(c => linearCase(hooks, c)), sqrt: [0.25, 1 / 3, 0.4, 0.6].map(a => sqrtCase(hooks, a)) };
}
const allPass = d => d.zero.every(r => r.pass) && d.linear.every(r => r.pass) && d.sqrt.every(r => r.pass);
log('1. deterministic drivers');
const exactCases = deterministic(MOD);
assert(allPass(exactCases), 'a deterministic Loewner case failed: ' + JSON.stringify(exactCases, null, 1).slice(0, 2000));
log('   zero driver worst relative error ' + Math.max(...exactCases.zero.map(r => r.maxRelativeError)).toExponential(2) + '; linear error / driver step ' + exactCases.linear.map(l => l.rows[4].errorOverDriverStep.toFixed(3)).join(', ') + ' at N 8000, orders ' + exactCases.linear.map(l => l.observedOrders.join('/')).join('; '));
log('   sqrt driver relative error at t = 1, N 8000: ' + exactCases.sqrt.map(s => s.rows[4].relativeErrorAtT1.toExponential(2)).join(', '));
const controlCases = { wrongCapacity: deterministic(WRONG_CAPACITY), reversedComposition: deterministic(REVERSED) };
const controlSummary = Object.fromEntries(Object.entries(controlCases).map(([k, d]) => [k, {
  zeroDriverPasses: d.zero.every(r => r.pass), linearPasses: d.linear.every(r => r.pass), sqrtPasses: d.sqrt.every(r => r.pass),
  worstZeroRelativeError: Math.max(...d.zero.map(r => r.maxRelativeError)), worstLinearErrorOverDriverStep: Math.max(...d.linear.flatMap(l => l.rows.map(r => r.errorOverDriverStep))),
  detected: !allPass(d) }]));
assert(controlSummary.wrongCapacity.detected && !controlSummary.wrongCapacity.zeroDriverPasses, 'wrong-capacity control not detected by the zero driver');
assert(controlSummary.reversedComposition.detected && !controlSummary.reversedComposition.linearPasses, 'reversed-composition control not detected by the linear driver');
log('   controls: wrong capacity zero-driver error ' + controlSummary.wrongCapacity.worstZeroRelativeError.toExponential(2) + '; reversed order linear error / step ' + controlSummary.reversedComposition.worstLinearErrorOverDriverStep.toExponential(2));

/* ---------------- 2 and 3. driver and dimension ---------------- */
const KAPPAS = [2, 4, 6], SEEDS = 16, NS = [2000, 4000, 8000];
// Fit range fixed before measuring: seven scales eps = D 2^{-k/2}, k = 8..14, where D is the curve's own
// diameter (the larger of its width and height, origin included). The top scale keeps sixteen boxes across
// the curve; the bottom, D/128, stays well above the median step of the discretized trace (checked below).
const FIT_K = [8, 9, 10, 11, 12, 13, 14], LOCAL_K = Array.from({ length: 21 }, (_, i) => i + 2);
function measure(hooks, kappa, N, seed) {
  const drive = tabDrive(hooks, seed, N, kappa), t = trace(hooks, drive, 1 / N);
  let qv = 0, prev = 0, x0 = 0, x1 = 0, y1 = 0;
  for (let k = 0; k < N; k++) { qv += (drive[k] - prev) ** 2; prev = drive[k]; }
  const seg = [];
  let px = 0, py = 0;
  for (let k = 0; k < N; k++) { seg.push(Math.hypot(t.xs[k] - px, t.ys[k] - py)); px = t.xs[k]; py = t.ys[k]; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
  seg.sort((a, b) => a - b);
  const D = Math.max(x1 - x0, y1), logCount = k => Math.log(R.boxCount(t.xs, t.ys, D * Math.pow(2, -k / 2)));
  const fit = R.ols(FIT_K.map(k => k * Math.LN2 / 2), FIT_K.map(logCount));
  return { seed, dimension: fit.slope, quadraticVariationOverKappa: qv / kappa, diameter: D, medianStepOverSmallestBox: seg[Math.floor(N / 2)] / (D / 128), p90StepOverSmallestBox: seg[Math.floor(0.9 * N)] / (D / 128),
    local: N === 8000 ? LOCAL_K.map(logCount) : null };
}
function dimensionSet(hooks, kappa, N, tag) {
  const runs = [];
  for (let i = 0; i < SEEDS; i++) runs.push(measure(hooks, kappa, N, 'sle-science/' + tag + '/' + kappa + '/' + i));
  const dims = runs.map(r => r.dimension), qv = runs.map(r => r.quadraticVariationOverKappa), theory = Math.min(2, 1 + kappa / 8);
  const out = { kappa, N, seeds: SEEDS, seedPattern: 'sle-science/' + tag + '/' + kappa + '/<i>', theory,
    dimension: { mean: round(mean(dims)), se: round(se(dims), 3), sd: round(sdev(dims), 3), z: round((mean(dims) - theory) / se(dims), 4), values: dims.map(v => round(v, 5)) },
    quadraticVariationOverKappa: { mean: round(mean(qv), 7), se: round(se(qv), 3), exactSe: round(Math.sqrt(2 / N / SEEDS), 3), z: round((mean(qv) - 1) / Math.sqrt(2 / N / SEEDS), 4) },
    medianStepOverSmallestBox: round(mean(runs.map(r => r.medianStepOverSmallestBox)), 4), p90StepOverSmallestBox: round(mean(runs.map(r => r.p90StepOverSmallestBox)), 4), meanDiameter: round(mean(runs.map(r => r.diameter)), 4) };
  if (N === 8000) {
    // Local slopes over one octave, averaged over seeds: where the scaling window is and is not.
    const L = LOCAL_K.map((k, j) => mean(runs.map(r => r.local[j])));
    out.localSlopes = LOCAL_K.slice(2).map((k, j) => ({ epsOverDiameter: round(Math.pow(2, -k / 2), 4), slope: round((L[j + 2] - L[j]) / Math.LN2, 4) }));
  }
  return out;
}
log('2-3. driver and box-counting dimension (' + SEEDS + ' seeds per set)');
const Z_DIM = bonferroniZ(0.001, KAPPAS.length), Z_QV = bonferroniZ(0.001, KAPPAS.length * NS.length);
const dimension = [];
for (const N of NS) for (const kappa of KAPPAS) {
  const r = dimensionSet(MOD, kappa, N, 'dim');
  r.dimension.agrees = Math.abs(r.dimension.z) < Z_DIM;
  dimension.push(r);
  log('   kappa ' + kappa + ' N ' + N + ': D = ' + r.dimension.mean.toFixed(4) + ' +/- ' + r.dimension.se.toFixed(4) + ' against ' + r.theory + ' (' + r.dimension.z.toFixed(1) + ' sigma); QV/kappa ' + r.quadraticVariationOverKappa.mean.toFixed(5) + ' (' + r.quadraticVariationOverKappa.z.toFixed(2) + ' sigma)');
}
assert(dimension.every(r => Math.abs(r.quadraticVariationOverKappa.z) < Z_QV), 'the driver variance is not kappa');
assert(dimension.filter(r => r.N === 8000).every(r => r.medianStepOverSmallestBox < 0.5), 'fit range reaches the discretization step at N 8000');
// Estimator calibration: the same box counter and fit range on self-similar curves of known dimension
// with a comparable number of vertices, over 16 seeded grid offsets. This separates a bias of the
// estimator from a bias of the discretized trace.
const calRng = makeRng('sle-science/calibration');
const calibration = [];
for (const dim of [1.25, 1.5, 1.75]) for (const level of [6, 7]) {
  const k = R.kochCurve(dim, level), D = Math.max(1, Math.max(...k.ys)), slopes = [];
  for (let o = 0; o < 16; o++) {
    const ox = calRng(), oy = calRng(), xs = k.xs.map(v => v + ox), ys = k.ys.map(v => v + oy);
    slopes.push(R.ols(FIT_K.map(q => q * Math.LN2 / 2), FIT_K.map(q => Math.log(R.boxCount(xs, ys, D * Math.pow(2, -q / 2), ox, oy)))).slope);
  }
  calibration.push({ curve: 'generalized Koch', exactDimension: round(k.dimension, 6), spikeAngleDegrees: round(k.theta * 180 / Math.PI, 4), level, vertices: k.xs.length, offsets: 16,
    measured: round(mean(slopes), 5), offsetSd: round(sdev(slopes), 3), offsetSe: round(se(slopes), 3), bias: round(mean(slopes) - k.dimension, 4) });
}
log('   estimator on Koch curves: ' + calibration.map(c => c.exactDimension.toFixed(2) + ' -> ' + c.measured.toFixed(3) + ' (' + c.vertices + ')').join(', '));
// Controls: the same seeds with a driver of variance 2 kappa.
const doubled = [2, 4].map(kappa => {
  const good = dimension.find(r => r.kappa === kappa && r.N === 8000), bad = dimensionSet(DOUBLED, kappa, 8000, 'dim');
  const shift = bad.dimension.mean - good.dimension.mean, zShift = shift / Math.hypot(bad.dimension.se, good.dimension.se);
  return { kappa, labeledKappa: kappa, drivenWithVariance: 2 * kappa, dimension: bad.dimension, quadraticVariationOverKappa: bad.quadraticVariationOverKappa, dimensionShift: round(shift, 5), zShift: round(zShift, 4),
    detected: zShift > Z_DIM && Math.abs(bad.quadraticVariationOverKappa.z) > Z_QV };
});
assert(doubled.every(c => c.detected), 'doubled-variance control not detected');
log('   doubled-variance controls: shift ' + doubled.map(c => c.dimensionShift.toFixed(3) + ' (' + c.zShift.toFixed(1) + ' sigma)').join(', '));

/* ---------------- 4. print through the studio ---------------- */
const FIXTURES = [
  { name: 'percolation', params: { kappa: 6, N: 3000, mode: 'single', color: 'time', width: 1.4, aspect: '5:4', axis: true } },
  { name: 'lerw', params: { kappa: 2, N: 5000, mode: 'single', color: 'ink', width: 2, aspect: '4:5', axis: true } },
  { name: 'sweep', params: { mode: 'sweep', N: 3000, color: 'curve', width: 1.2, alpha: 0.9, aspect: '5:4', axis: true } },
  { name: 'bundle', params: { kappa: 6, mode: 'seeds', curves: 12, N: 2000, color: 'curve', width: 1, alpha: 0.75, aspect: '3:2', axis: true } },
  { name: 'peano', params: { kappa: 8, N: 6000, mode: 'single', color: 'time', width: 1, aspect: '1:1', axis: false } },
];
const PRINT_SIZE = { '1:1': [2400, 2400], '4:5': [1920, 2400], '5:4': [2400, 1920], '3:2': [2400, 1600] };

// Runs in the page: an independent reconstruction of the page transform and inks from the traces.
const PRINT = async ({ traces, w, h }) => {
  const e = Studio.auditInstances().sle, s = e.state, U = Studio.util, P = s.palette, ramp = U.makeRamp(P, null);
  let x0 = Infinity, x1 = -Infinity, y1 = 0;
  for (const t of traces) for (let i = 0; i < t.xs.length; i++) { x0 = Math.min(x0, t.xs[i]); x1 = Math.max(x1, t.xs[i]); y1 = Math.max(y1, t.ys[i]); }
  y1 = Math.max(y1, 1e-6);
  const m = s.margin, scale = Math.min(w * (1 - 2 * m) / Math.max(x1 - x0, 1e-6), h * (1 - 2 * m) / y1), ox = w / 2 - (x0 + x1) / 2 * scale, oy = h * (1 - m), lw = s.width * Math.min(w, h) / 700;
  const X = (t, i) => ox + t.xs[i] * scale, Y = (t, i) => oy - t.ys[i] * scale, paths = [];
  traces.forEach((t, ti) => {
    const n = t.xs.length;
    if (s.color === 'time') {
      const per = Math.ceil(n / 48);
      for (let a = 0; a < n - 1; a += per) {
        const b = Math.min(n - 1, a + per), col = ramp(a / n), pts = a > 0 ? [X(t, a), Y(t, a)] : [ox, oy, X(t, 0), Y(t, 0)];
        for (let i = a + 1; i <= b; i++) pts.push(X(t, i), Y(t, i));
        paths.push({ pts, color: U.rgbToHex(col[0], col[1], col[2]) });
      }
    } else {
      const pts = [ox, oy];
      for (let i = 0; i < n; i++) pts.push(X(t, i), Y(t, i));
      paths.push({ pts, color: s.color === 'ink' ? U.inkFor(s.bg) : P[ti % P.length] });
    }
  });
  const svgText = await e.inst.exportSVG(w, h), svg = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (svg.querySelector('svg > rect').getAttribute('fill').toLowerCase() !== s.bg.toLowerCase()) throw Error('Wrong background');
  const axis = svg.querySelector('line');
  if (!!axis !== !!s.axis) throw Error('Axis presence');
  let coordinateError = 0, coordinates = 0;
  if (axis) {
    for (const [k, v] of [['x1', 0], ['y1', oy], ['x2', w], ['y2', oy], ['stroke-width', Math.max(0.6, lw * 0.6)]]) { coordinateError = Math.max(coordinateError, Math.abs(Number(axis.getAttribute(k)) - v)); coordinates++; }
    if (axis.getAttribute('stroke') !== U.inkFor(s.bg) || axis.getAttribute('stroke-opacity') !== '0.35') throw Error('Wrong axis ink');
  }
  const els = [...svg.querySelectorAll('path')];
  if (els.length !== paths.length) throw Error('Wrong path count ' + els.length + ' vs ' + paths.length);
  let halfPlane = 0;
  els.forEach((p, i) => {
    const v = p.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g).map(Number), q = paths[i];
    if (v.length !== q.pts.length) throw Error('Wrong vertex count in path ' + i);
    for (let k = 0; k < v.length; k++) { const d = Math.abs(v[k] - q.pts[k]); coordinateError = Math.max(coordinateError, d); halfPlane = Math.max(halfPlane, d / scale); coordinates++; }
    if (p.getAttribute('stroke').toLowerCase() !== q.color.toLowerCase()) throw Error('Wrong ink in path ' + i);
    if (Math.abs(Number(p.getAttribute('stroke-width')) - lw) > 0.00501 || p.getAttribute('stroke-linecap') !== 'round' || p.getAttribute('stroke-linejoin') !== 'round' || Number(p.getAttribute('stroke-opacity')) !== s.alpha || p.getAttribute('fill') !== 'none') throw Error('Wrong stroke attributes in path ' + i);
  });
  if (coordinateError > 0.00501) throw Error('Vector coordinate error ' + coordinateError);
  // PNG fallback against an independent painting in the same order.
  const blob = await e.inst.exportPNG(w, h), bitmap = await createImageBitmap(blob), c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(bitmap, 0, 0); bitmap.close();
  const actual = ctx.getImageData(0, 0, w, h).data;
  ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h);
  if (s.axis) { ctx.strokeStyle = U.inkRgba(s.bg, 0.35); ctx.lineWidth = Math.max(0.6, lw * 0.6); ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(w, oy); ctx.stroke(); }
  ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = s.alpha;
  for (const q of paths) { ctx.strokeStyle = q.color; ctx.beginPath(); ctx.moveTo(q.pts[0], q.pts[1]); for (let k = 2; k < q.pts.length; k += 2) ctx.lineTo(q.pts[k], q.pts[k + 1]); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const reference = ctx.getImageData(0, 0, w, h).data;
  let max = 0, sum = 0, displaced = 0;
  for (let i = 0; i < actual.length; i++) { const d = Math.abs(actual[i] - reference[i]); max = Math.max(max, d); sum += d; if (Math.abs(actual[i] - reference[(i + 4) % reference.length]) > 2) displaced++; }
  if (max > 1 || displaced < 100) throw Error(JSON.stringify({ max, displaced }));
  // The shell's vector RIP (SVG decoded and drawn at print size), recorded against the same painting.
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' })), im = new Image();
  await new Promise((ok, bad) => { im.onload = ok; im.onerror = bad; im.src = url; });
  ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, 0, 0, w, h); URL.revokeObjectURL(url);
  const rip = ctx.getImageData(0, 0, w, h).data;
  let ripMax = 0, ripSum = 0, ripOver2 = 0;
  for (let i = 0; i < rip.length; i++) { const d = Math.abs(rip[i] - reference[i]); ripMax = Math.max(ripMax, d); ripSum += d; if (d > 2) ripOver2++; }
  return { width: w, height: h, paths: paths.length, svgCoordinates: coordinates, maxSvgCoordinateError: coordinateError, maxHalfPlaneError: halfPlane, scale, maxChannelError: max, meanChannelError: sum / actual.length, channelsChecked: actual.length, displacedPrintFailureChannels: displaced,
    vectorRip: { maxChannelDifference: ripMax, meanChannelDifference: ripSum / rip.length, fractionOver2Levels: ripOver2 / rip.length } };
};

async function printEvidence() {
  const { chromium } = require('playwright');
  const html = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8');
  assert(html.includes(source), 'dist/studio.html is stale: run node tools/build.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sle-science-')), file = path.join(dir, 'studio.html');
  fs.writeFileSync(file, html.replace(source, source.replace(MARK_RETURN, AUDIT + MARK_RETURN)).replace('generatePalette, register, boot,', 'generatePalette, register, auditInstances:()=>instances, boot,'));
  const browser = await chromium.launch(), cases = [];
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + file + '#sle/review');
    await page.evaluate(() => Studio.ready);
    // requestAnimationFrame polling can stall in the headless shell, so poll on a timer; and let the boot
    // plate finish, since a hash applied while the boot hash is still being applied can race it.
    const built = seed => page.waitForFunction(seed => { const e = Studio.auditInstances().sle; if (!e || Studio.getRecipe()?.seed !== seed) return false; const a = e.inst.auditRead(); return !a.building && a.traces.length && a.traces.every(t => t.done); }, seed, { timeout: 300000, polling: 200 });
    await built('review');
    for (const fx of FIXTURES) {
      const seed = 'sle-science-' + fx.name;
      await page.evaluate(({ seed, params }) => { location.hash = 'sle/' + seed + '/' + btoa(JSON.stringify(Object.assign({}, params, { v: 2 }))); }, { seed, params: fx.params });
      await built(seed);
      const read = () => page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), state: Studio.auditInstances().sle.state, audit: Studio.auditInstances().sle.inst.auditRead() }));
      const before = await read(), got = JSON.parse(before), s = got.state, node = await runTab(MOD, Object.assign({}, s));
      assert.equal(got.audit.traces.length, node.audit.traces.length);
      // Chromium and Node may round Math.log and Math.cos in the Box-Muller draw differently in the last
      // bit, so studio and Node are compared to a tolerance relative to the curve's size.
      let driveErr = 0, traceErr = 0, size = 0;
      got.audit.traces.forEach((t, i) => {
        const u = node.audit.traces[i], dd = got.audit.drives[i].drive, dn = node.audit.drives[i].drive;
        assert.equal(t.kappa, u.kappa); assert.equal(t.N, u.N);
        for (let k = 0; k < t.N; k++) { driveErr = Math.max(driveErr, Math.abs(dd[k] - dn[k])); traceErr = Math.max(traceErr, Math.hypot(t.xs[k] - u.xs[k], t.ys[k] - u.ys[k])); size = Math.max(size, Math.hypot(u.xs[k], u.ys[k])); }
      });
      assert(driveErr < 1e-12 && traceErr < 1e-9 * size, fx.name + ': studio differs from the Node run');
      // The trace in the studio is the module's slit composition of the studio's own driver.
      const again = got.audit.traces.map((t, i) => trace(MOD, Float64Array.from(got.audit.drives[i].drive), 1 / t.N));
      let recompute = 0;
      again.forEach((t, i) => { for (let k = 0; k < t.N; k++) recompute = Math.max(recompute, Math.hypot(t.xs[k] - got.audit.traces[i].xs[k], t.ys[k] - got.audit.traces[i].ys[k])); });
      assert(recompute < 1e-9 * size);
      if (s.mode === 'sweep') {
        const base = got.audit.drives[0].drive.map(v => v / Math.sqrt(got.audit.drives[0].kappa));
        got.audit.drives.forEach(d => { for (let k = 0; k < d.drive.length; k++) assert(Math.abs(d.drive[k] - base[k] * Math.sqrt(d.kappa)) < 1e-12, 'sweep drivers are not one noise'); });
      }
      const [w, h] = PRINT_SIZE[s.aspect];
      const print = await page.evaluate(PRINT, { traces: got.audit.traces.map(t => ({ xs: t.xs, ys: t.ys })), w, h });
      assert.equal(before, await read(), fx.name + ': export changed the recipe or traces');
      cases.push({ name: fx.name, seed, parameters: s, curves: got.audit.traces.map(t => ({ kappa: t.kappa, N: t.N })), tracesSha256: sha(JSON.stringify(got.audit.traces.map(t => [t.xs, t.ys]))),
        studioVsNode: { maxDriverDifference: driveErr, maxTraceDifference: traceErr, curveSize: size }, recomputedFromStudioDriver: recompute, print, statePreserved: true });
      log('   PASS ' + fx.name + ': ' + print.paths + ' paths, ' + print.svgCoordinates + ' coordinates, SVG error ' + print.maxSvgCoordinateError.toFixed(4) + ' px, PNG max ' + print.maxChannelError);
    }
    assert.deepEqual(errors, []);
    return { cases, chromium: browser.version() };
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

(async () => {
  log('4. print through the studio');
  const print = await printEvidence();
  const seconds = (performance.now() - started) / 1000;
  const brief = d => ({ zero: d.zero, linear: d.linear.map(l => ({ c: l.c, observedOrders: l.observedOrders, pass: l.pass, rows: l.rows.map(r => ({ N: r.N, maxError: r.maxError, errorOverDriverStep: round(r.errorOverDriverStep, 5) })) })),
    sqrt: d.sqrt.map(q => ({ alpha: q.alpha, c: q.c, observedOrders: q.observedOrders, step500Spread: q.step500Spread, pass: q.pass, rows: q.rows })) });
  const result = {
    date: new Date().toISOString().slice(0, 10), tool: 'tools/sle-science.js', sourceSha256: sha(source), engineSha256: sha(engine), referenceSha256: sha(fs.readFileSync(path.join(__dirname, 'lib/sle-reference.js'), 'utf8')),
    scope: 'Vertical-slit Loewner solver and Brownian driver of src/modules/sle.js at capacity time 1: closed-form traces for zero, linear and square-root drivers under step refinement, driver quadratic variation, box-counting dimension at kappa 2, 4 and 6 over seeded ensembles, and five complete studio prints with SVG geometry.',
    deterministic: { tolerances: { zero: 'relative error <= N eps (the composition is exact for a constant driver)', linear: 'error <= |c| dt (one driver increment) at every step, observed order in (0.9, 1.1)', sqrt: 'relative error at t = 1 <= 1/N, observed order in (0.9, 1.1), scale covariance at step 500 to 1e-9' }, module: brief(exactCases), controls: controlSummary },
    dimension: { theory: 'min(2, 1 + kappa/8), Beffara, Ann. Probab. 36, 1421 (2008)', estimator: 'box counting of the polyline from 0 through the N trace points by exact grid traversal; OLS slope of log count on log(1/eps)',
      fitRange: 'eps = D 2^{-k/2}, k = 8..14 (D/16 down to D/128), D = the curve diameter; fixed before measurement', estimatorCalibration: calibration, familyZ: round(Z_DIM, 5), quadraticVariationFamilyZ: round(Z_QV, 5), sets: dimension, doubledVarianceControls: doubled },
    print: print.cases,
    environment: { node: process.version, chromium: print.chromium, platform: process.platform, arch: process.arch, cpus: os.cpus().length },
    runtimeSeconds: round(seconds, 4), passed: true,
  };
  if (WRITE) fs.writeFileSync(path.join(root, 'validation/results/sle-science.json'), JSON.stringify(result, null, 2) + '\n');
  log('PASS Loewner numerical and print review in ' + seconds.toFixed(0) + ' s' + (WRITE ? ' (written)' : ''));
})().catch(e => { console.error(e); process.exitCode = 1; });
