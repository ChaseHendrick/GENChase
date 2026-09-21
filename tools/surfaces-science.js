// node tools/surfaces-science.js [--write]
// Independent differential-geometric references evaluated against maintained parameter maps.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), file = 'src/modules/surfaces.js';
const source = fs.readFileSync(path.join(root, file), 'utf8');
function load(text) {
  const context = { Studio: { util: { clamp: (x, a, b) => Math.max(a, Math.min(b, x)) }, PALETTES: {}, register() {} } };
  vm.runInNewContext(text.replace('  Studio.register({',
    '  globalThis.api = { point, domain, mesh, rotate, defaults };\n  Studio.register({'), context);
  return context.api;
}
const mod = load(source);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function differential(fn, s, u, v, h) {
  const p = fn(s, u, v), up = fn(s, u + h, v), um = fn(s, u - h, v);
  const vp = fn(s, u, v + h), vm2 = fn(s, u, v - h);
  const pp = fn(s, u + h, v + h), pm = fn(s, u + h, v - h);
  const mp = fn(s, u - h, v + h), mm = fn(s, u - h, v - h);
  const du = p.map((_, k) => (up[k] - um[k]) / (2 * h));
  const dv = p.map((_, k) => (vp[k] - vm2[k]) / (2 * h));
  const duu = p.map((x, k) => (up[k] - 2 * x + um[k]) / (h * h));
  const dvv = p.map((x, k) => (vp[k] - 2 * x + vm2[k]) / (h * h));
  const duv = p.map((_, k) => (pp[k] - pm[k] - mp[k] + mm[k]) / (4 * h * h));
  const c = cross(du, dv), area = Math.sqrt(dot(c, c)), normal = c.map(x => x / area);
  const E = dot(du, du), F = dot(du, dv), G = dot(dv, dv);
  const e = dot(normal, duu), f = dot(normal, duv), g = dot(normal, dvv), det = E * G - F * F;
  return { E, F, G, area, K: (e * g - f * f) / det, H: (e * G - 2 * f * F + g * E) / (2 * det) };
}
// Closed references were derived independently from the first and second fundamental forms.
// No production curvature value is reused: the app only implements coordinates.
function reference(s, u, v) {
  if (s.family === 'enneper') {
    const q = 1 + u * u + v * v;
    return { E: q * q, F: 0, G: q * q, K: -4 / q ** 4, H: 0 };
  }
  if (s.family === 'associate') {
    const g = Math.cosh(v) ** 2;
    return { E: g, F: 0, G: g, K: -1 / (g * g), H: 0 };
  }
  const b = s.pitch, sn = Math.sin(v), cs = Math.cos(v);
  return { E: sn * sn + b * b, F: b * cs * cs / sn, G: (cs / sn) ** 2,
    K: -1 / (1 + b * b), H: -1 / (Math.tan(2 * v) * Math.sqrt(1 + b * b)) };
}
const states = [
  { family: 'enneper' },
  ...[0, 0.25, 0.5, 0.75, 1].map(associate => ({ family: 'associate', associate })),
  ...[0.1, 0.2, 0.6].map(pitch => ({ family: 'dini', pitch }))
].map(s => ({ ...mod.defaults, ...s }));
const samples = [];
for (const s of states) {
  const us = s.family === 'enneper' ? [-1.3, -0.4, 0, 0.6, 1.7] : [-4, -1.2, 0, 1.1, 4];
  const vs = s.family === 'dini' ? [0.3, 0.5, 0.8, 1.1, 1.3] : [-1.7, -0.6, 0, 0.3, 1.4];
  for (const u of us) for (const v of vs) samples.push({ s, u, v });
}
function errors(fn, h, subset = samples) {
  let metricRelative = 0, gaussianRelative = 0, meanScaled = 0, minArea = Infinity;
  for (const { s, u, v } of subset) {
    const a = differential(fn, s, u, v, h), b = reference(s, u, v);
    for (const key of ['E', 'F', 'G']) metricRelative = Math.max(metricRelative, Math.abs(a[key] - b[key]) / Math.max(1, Math.abs(b[key])));
    gaussianRelative = Math.max(gaussianRelative, Math.abs(a.K / b.K - 1));
    meanScaled = Math.max(meanScaled, Math.abs(a.H - b.H) / Math.max(1, Math.abs(b.H)));
    minArea = Math.min(minArea, a.area);
  }
  return { h, metricRelative, gaussianRelative, meanScaled, minArea };
}
const refinements = [0.02, 0.01, 0.005].map(h => errors(mod.point, h));
const fine = refinements[2];
assert(fine.metricRelative < 0.001 && fine.gaussianRelative < 0.001 && fine.meanScaled < 0.001, 'curvature and metric reference tolerances');
assert(refinements.every(x => x.minArea > 0.1), 'sampled patches are regular');
const orders = refinements.slice(1).map((x, i) => Math.log2(refinements[i].gaussianRelative / x.gaussianRelative));
assert(orders.every(x => x > 1.8 && x < 2.2), 'second-order finite-difference curvature refinement');
const mutationCases = [
  ['Enneper wrong vertical scale', 'u * u - v * v];', '0.8 * (u * u - v * v)];', 'enneper'],
  ['Dini missing logarithm', 'Math.log(Math.tan(v / 2))', '0', 'dini'],
  ['Associate wrong conjugate sign', '- a * Math.sinh(v) * Math.cos(u)', '+ a * Math.sinh(v) * Math.cos(u)', 'associate']
];
const controls = mutationCases.map(([label, before, after, family]) => {
  assert(source.includes(before), label + ' mutation applies');
  const bad = errors(load(source.replace(before, after)).point, 0.005, samples.filter(x => x.s.family === family));
  const rejected = !Number.isFinite(bad.gaussianRelative) || bad.gaussianRelative > 0.01 || bad.metricRelative > 0.01 || bad.meanScaled > 0.01;
  assert(rejected, label + ' must be rejected');
  return { label, rejected, errors: bad };
});
let rotationDistanceError = 0, meshEndpointError = 0;
for (const s of states) {
  const m = mod.mesh(s), d = mod.domain(s), a = mod.point(s, d[0], d[2]), b = mod.point(s, d[1], d[3]);
  for (let k = 0; k < 3; k++) meshEndpointError = Math.max(meshEndpointError,
    Math.abs(m.vertices[k] - a[k]), Math.abs(m.vertices[m.vertices.length - 3 + k] - b[k]));
  assert(Array.from(m.vertices).every(Number.isFinite), 'all mesh coordinates finite');
  const p = [1.23, -2.4, 0.7], q = [-0.52, 1.1, 3], c = { yaw: 1.2, tilt: -0.7, roll: 0.5 };
  const rp = mod.rotate(p, c), rq = mod.rotate(q, c);
  const delta = p.map((x, k) => x - q[k]), rotated = rp.map((x, k) => x - rq[k]);
  rotationDistanceError = Math.max(rotationDistanceError, Math.abs(dot(delta, delta) - dot(rotated, rotated)));
}
assert(meshEndpointError < 1e-12 && rotationDistanceError < 1e-12);
// A separate tessellation check measures straight-chord error against the analytic map,
// normalized by the patch's three-dimensional bounding-box diagonal.
const tessellation = [];
for (const s0 of [{ family: 'enneper', extent: 2 }, { family: 'dini', turns: 3, pitch: 0.2 },
  { family: 'associate', associate: 0.45, extent: 2 }]) {
  const levels = [48, 96, 192].map(detail => {
    const s = { ...mod.defaults, ...s0, detail }, m = mod.mesh(s), d = mod.domain(s), n = detail;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < m.vertices.length; k += 3) for (let c = 0; c < 3; c++) {
      lo[c] = Math.min(lo[c], m.vertices[k + c]); hi[c] = Math.max(hi[c], m.vertices[k + c]);
    }
    const diagonal = Math.hypot(...hi.map((x, k) => x - lo[k]));
    let max = 0;
    for (let axis = 0; axis < 2; axis++) for (let j = 0; j <= n; j++) for (let i = 0; i < n; i++) {
      const a = axis === 0 ? j * (n + 1) + i : i * (n + 1) + j;
      const b = a + (axis === 0 ? 1 : n + 1);
      const u = d[0] + (d[1] - d[0]) * (axis === 0 ? i + 0.5 : j) / n;
      const v = d[2] + (d[3] - d[2]) * (axis === 0 ? j : i + 0.5) / n;
      const p = mod.point(s, u, v);
      max = Math.max(max, Math.hypot(...p.map((x, k) => x - (m.vertices[3 * a + k] + m.vertices[3 * b + k]) / 2)) / diagonal);
    }
    return { detail, maxRelativeChordMidpointError: max };
  });
  const observedOrders = levels.slice(1).map((x, i) => Math.log2(levels[i].maxRelativeChordMidpointError / x.maxRelativeChordMidpointError));
  assert(levels[2].maxRelativeChordMidpointError < 0.001 && observedOrders.every(x => x > 1.8 && x < 2.2));
  tessellation.push({ state: s0, levels, observedOrders });
}
const result = { schemaVersion: 1, date: new Date().toISOString().slice(0, 10), passed: true,
  source: file, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  benchmark: 'Independent centered finite differences of maintained point coordinates versus analytic first fundamental form and H/K',
  sampleCount: samples.length, states: states.map(s => ({ family: s.family, associate: s.associate, pitch: s.pitch })),
  criteria: { maxMetricRelativeError: 0.001, maxGaussianRelativeError: 0.001, maxMeanScaledError: 0.001,
    curvatureRefinementOrder: [1.8, 2.2], meshEndpointTolerance: 1e-12, rotationSquaredDistanceTolerance: 1e-12 },
  refinements, observedOrders: orders, controls, meshEndpointError, rotationDistanceError, tessellation,
  limitations: ['Established differential geometry, not a novelty claim.',
    '225 sampled parameter/shape points and finite mesh sanity checks, not exhaustive domain certification.',
    'Finite differences refine the benchmark derivative; a separate three-patch chord test checks displayed tessellation.',
    'Self-intersections, global embedding, topology and physical soap-film stability are not validated.',
    'Dini is a regular cropped patch with v between 0.15 and 1.4; its singular rim is excluded.',
    'Print evidence is separate in surfaces-print.json.'] };
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.join(root, 'validation/results'), { recursive: true });
  fs.writeFileSync(path.join(root, 'validation/results/surfaces-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
