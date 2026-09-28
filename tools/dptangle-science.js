// The double-pendulum tangle tab against the enclosures in research/double-pendulum/REPORT.md.
// Node only. Loads src/modules/dptangle.js unchanged and calls that file's integrator.
//   node tools/dptangle-science.js           run the checks and print them
//   node tools/dptangle-science.js --write   also write validation/results/dptangle-science.json
//
// The fixed point and the unstable eigenvalue must land in the report's enclosures at the
// plate's point step and at half that step. A pendulum with unequal masses must miss both.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), file = path.join(root, 'src/modules/dptangle.js');
const source = fs.readFileSync(file, 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();
function load(text) {
  const hooks = {}, marker = '  Studio.register({';
  assert.equal(text.split(marker).length, 2, 'the science tool injects at the plate register and nowhere else');
  let mod;
  const Studio = {
    util: { makeRng, clamp: (x, a, b) => Math.max(a, Math.min(b, x)) },
    PALETTES: new Proxy({}, { get: () => ({}) }),
    register(m) { mod = m; },
  };
  const injected = '  Object.assign(hooks,{poincare,locate,energy,lift,deriv,provedAt,POINT_H,pictureSession,symmetryPoint,REPORT,pBound,seaSeeds});\n' + marker;
  new Function('Studio', 'hooks', text.replace(marker, injected))(Studio, hooks);
  return { ...hooks, mod };
}
const A = load(source);
const sha = crypto.createHash('sha256').update(source).digest('hex');

// REPORT.md table. The parenthetical digit is the next printed digit of the center, not a
// standard uncertainty; the report states that each y enclosure is narrower than 2e-12.
// The centers below are the values the plate's Newton is started from (configs/*.cfg).
const REPORT = {
  '-0.5': {
    y: -1.244860970918396,
    trace: [-3.23158, -3.23150],
    mu: 2.88345,
    T: [3.70477454, 3.70477455],
  },
  '0': {
    y: -1.462373092479858,
    trace: [-3.80869, -3.80863],
    mu: 3.52385,
    T: [2.95348900, 2.95348902],
  },
  '0.5': {
    y: -1.627044959203058,
    trace: [-3.33283, -3.33278],
    mu: 2.99875,
    T: [2.56436222, 2.56436223],
  },
};
// Unstable eigenvalue of an area-preserving map, increasing in the trace for trace < -2.
function lamOf(tr) {
  const h = tr / 2;
  return h - Math.sqrt(h * h - 1);
}
function lamInterval(trace) {
  return [lamOf(trace[0]), lamOf(trace[1])];
}
const inside = (x, ab) => x >= ab[0] && x <= ab[1];

for (const key of Object.keys(REPORT)) {
  const plate = A.REPORT[key];
  assert(plate, 'plate REPORT is missing E = ' + key);
  assert.equal(plate.y, REPORT[key].y, 'plate fixed-point center drifted from the report');
  assert.deepEqual(plate.trace, REPORT[key].trace);
  assert.equal(plate.mu, REPORT[key].mu);
  assert.deepEqual(plate.T, REPORT[key].T);
}
assert.equal(A.POINT_H, 0.0005);
const createSrc = A.mod.create.toString();
for (const needle of ['locate(', 'pictureSession(', 'exportSVG(', 'symmetryPoint', 'POINT_H']) {
  assert(createSrc.includes(needle), 'create() does not use ' + needle);
}
assert.equal(A.mod.id, 'dptangle');
assert(/10\.5281\/zenodo\.22997540/.test(A.mod.credit) && !/unpublished/.test(A.mod.credit));
assert(/Smale/.test(A.mod.credit) && /Birkhoff/.test(A.mod.credit));
assert(!/—/.test(A.mod.credit + A.mod.blurb + A.mod.equation));
const labels = Object.values(A.mod.presets).map(p => p.label);
assert(labels.filter(l => /in the proof/.test(l)).length >= 3, 'the three proved energies need presets');
assert(labels.some(l => /not covered/.test(l)), 'an energy outside the proof must be labeled not covered');
assert(createSrc.includes("status: 'unvalidated'"));

// Hamilton's equations: the plate's deriv against a central difference of the plate's energy.
function fieldGap(y, m1, m2) {
  const eps = 1e-6, g = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const yp = y.slice(), ym = y.slice();
    yp[i] += eps; ym[i] -= eps;
    g[i] = (A.energy(yp, m1, m2) - A.energy(ym, m1, m2)) / (2 * eps);
  }
  const d = [0, 0, 0, 0];
  A.deriv(y, m1, m2, d);
  const want = [g[2], g[3], -g[0], -g[1]];
  let e = 0;
  for (let i = 0; i < 4; i++) e = Math.max(e, Math.abs(d[i] - want[i]));
  return e;
}
const rest = [0, 0, 0, 0];
assert(Math.abs(A.energy(rest, 1, 1) + 3) < 1e-15, 'bottom rest must be E = -3');
assert(Math.abs(A.energy(rest, 1, 1.001) + (1 + 2 * 1.001)) < 1e-12);
let fieldErr = 0;
for (const E of [-0.5, 0, 0.5]) {
  for (const t2 of [-1.2, 0.4, 2.2]) {
    const y = A.lift(E, t2, -0.3, 1, 1);
    assert(y, 'lift failed');
    assert(Math.abs(A.energy(y, 1, 1) - E) < 1e-12, 'lift is not on the energy');
    fieldErr = Math.max(fieldErr, fieldGap(y, 1, 1));
    fieldErr = Math.max(fieldErr, fieldGap(y, 1, 1.001));
  }
}
assert(fieldErr < 1e-7, 'deriv disagrees with dH: ' + fieldErr);
const sym = A.symmetryPoint(1.25, -0.4);
assert(Math.abs(sym.t2 + 1.25) < 1e-15 && sym.p2 === -0.4);
const back = A.symmetryPoint(sym.t2, sym.p2);
assert(Math.abs(back.t2 - 1.25) < 1e-15 && back.p2 === -0.4);

const rows = [];
for (const E of [-0.5, 0, 0.5]) {
  const spec = REPORT[String(E)];
  const lamBox = lamInterval(spec.trace);
  const h = A.POINT_H;
  const fp = A.locate(E, h, 1, 1);
  const half = A.locate(E, h / 2, 1, 1);
  assert(fp && half, 'Newton failed at E = ' + E);
  const row = {
    E, h,
    t2: fp.t2, p2: fp.p2, dy: fp.p2 - spec.y, halfP2: half.p2, halfGap: Math.abs(fp.p2 - half.p2),
    lam: fp.lam, lamBox, trace: fp.tr, det: fp.det, T: fp.T, res: fp.res, it: fp.it,
    H: fp.H,
  };
  console.log('E', E, 'p2', fp.p2, 'dy', row.dy.toExponential(3), 'half', row.halfGap.toExponential(3),
    'lam', fp.lam, 'tr', fp.tr, 'det', fp.det, 'T', fp.T, 'it', fp.it);
  assert(Math.abs(fp.t2) < 1e-9, 'fixed point left t2 = 0');
  assert(Math.abs(fp.p2 - spec.y) <= 1e-12, 'p2 outside the 2e-12 window at E = ' + E);
  assert(row.halfGap <= 1e-11, 'half-step point moved at E = ' + E);
  assert(Math.abs(fp.det - 1) < 1e-6, 'return is not area-preserving at E = ' + E);
  assert(inside(fp.tr, spec.trace), 'trace outside the report at E = ' + E);
  assert(inside(fp.lam, lamBox), 'unstable eigenvalue outside the trace enclosure at E = ' + E);
  assert(Math.abs(fp.lam) >= spec.mu, 'eigenvalue under the proved lower bound at E = ' + E);
  assert(inside(fp.T, spec.T), 'return time outside the report at E = ' + E);
  assert(Math.abs(fp.H - E) < 1e-9, 'energy drifted on the return');
  assert(fp.vu && fp.vu[0] >= 0, 'unstable eigenvector should have nonnegative t2 component');
  rows.push(row);
}

// Failure control: the same locate(), unequal masses. It must be a real fixed point of the
// perturbed pendulum, and it must fall outside the equal-mass enclosures.
const badM = 1.001;
const equal = REPORT['0'];
const equalLam = lamInterval(equal.trace);
const bad = A.locate(0, A.POINT_H, 1, badM);
assert(bad, 'perturbed Newton failed; that is not a failure control');
const badDy = bad.p2 - equal.y;
const badOutsideY = Math.abs(badDy) > 1e-12;
const badOutsideLam = !inside(bad.lam, equalLam);
console.log('FAILURE CONTROL m2=' + badM + ' at E=0: p2', bad.p2, 'dy', badDy.toExponential(3),
  'lam', bad.lam, 'outside y enclosure', badOutsideY, 'outside lambda enclosure', badOutsideLam);
assert(bad.res < 1e-8, 'perturbed point is not a fixed point of its own map');
assert(badOutsideY, 'unequal masses did not move p2 out of the enclosure');
assert(badOutsideLam, 'unequal masses did not move the eigenvalue out of the enclosure');
console.log('failure control fails the equal-mass enclosures, as required');

// The curves use the same poincare. A short session must actually call it.
const seedFp = A.locate(0, A.POINT_H, 1, 1);
const sess = A.pictureSession({
  E: 0, h: 0.002, m1: 1, m2: 1, fp: seedFp,
  seeds: [{ t2: 0.5, p2: -0.2 }],
  orbitReturns: 4, iterates: 4, segments: 6, s0: 1.5e-5, maxGap: 0.35, maxPoints: 80, maxCalls: 200,
});
let guard = 0;
while (!sess.step(20) && guard++ < 50) {}
assert(sess.calls() >= 8, 'pictureSession did not integrate');
assert(sess.generations().length >= 2, 'the unstable curve was not iterated');
const gens = sess.generations();
const reflected = A.symmetryPoint(gens[0][0].t2, gens[0][0].p2);
assert(Number.isFinite(reflected.t2) && reflected.p2 === gens[0][0].p2);

// Presets outside the proof. E = -0.6 and 0.75 still have the symmetric saddle, so the
// curve is drawn and labeled not covered. E = -0.75 is past the end of that family.
const outside = [];
for (const E of [-0.6, 0.75]) {
  const fp = A.locate(E, A.POINT_H, 1, 1);
  assert(fp && fp.res < 1e-8 && Math.abs(fp.lam) > 1.2, 'no hyperbolic point at E = ' + E);
  outside.push({ E, p2: fp.p2, lam: fp.lam, res: fp.res, covered: false });
  console.log('outside proof E', E, 'p2', fp.p2, 'lam', fp.lam);
}
const gone = A.locate(-0.75, A.POINT_H, 1, 1);
assert(gone === null, 'expected the symmetric family to have ended by E = -0.75');
console.log('E = -0.75: no symmetric fixed point from the report seed, sea only');

const out = {
  source: 'src/modules/dptangle.js',
  sourceSha256: sha,
  command: 'node tools/dptangle-science.js --write',
  integrator: 'classical RK4 in the plate (poincare, locate), float64, fixed step, crossing bisected to 1e-14',
  pointStep: A.POINT_H,
  fieldErr,
  energies: rows.map(r => ({
    E: r.E, p2: r.p2, dy: r.dy, halfGap: r.halfGap, lam: r.lam,
    lamBox: r.lamBox, trace: r.trace, det: r.det, T: r.T, res: r.res, it: r.it,
  })),
  failureControl: {
    description: 'same locate() with m1=1, m2=1.001 at E=0; must leave the equal-mass y window of half-width 1e-12 and the trace-implied eigenvalue interval',
    m1: 1, m2: badM, E: 0,
    p2: bad.p2, dy: badDy, lam: bad.lam,
    yEnclosureHalfWidth: 1e-12,
    lamBox: equalLam,
    outsideY: badOutsideY,
    outsideLam: badOutsideLam,
    res: bad.res,
    note: 'The control fails the equal-mass enclosures. That is the expected result.',
  },
  manifoldCalls: sess.calls(),
  manifoldGenerations: sess.generations().length,
  outsideProof: outside,
  symmetricFamilyEndedBy: -0.75,
};
if (process.argv.includes('--write')) {
  const dest = path.join(root, 'validation/results/dptangle-science.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', dest);
}
console.log('dptangle-science OK', sha.slice(0, 12));
