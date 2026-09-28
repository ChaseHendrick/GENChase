// The Arago plate against the Fresnel on-axis identities. Node only, no browser.
//   node tools/arago-science.js           run every check and print the results
//   node tools/arago-science.js --write   also write validation/results/arago-science.json
//
// What it runs is src/modules/arago.js loaded unchanged: fresnelAmplitude and renderField, the
// functions the plate calls. A separate quadrature in this file is not the propagator.
//
// The disk on axis is the open beam: I_disk(0)/I_open(0) = 1.
// The complementary circular aperture is not: I_ap(0)/I_open(0) = 4 sin^2(k R^2 / 4z).
// asksForOne demands the disk identity. The aperture must fail it, and it must match the closed form.
// The pre-v7 cutoff is the other control: its center/ring ratio is the old 1.83, not 1.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/modules/arago.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const stats = require(path.join(root, 'src/shared/stats.js'));
const started = performance.now();

function load(text) {
  const hooks = {}, marker = '  Studio.register({';
  assert.equal(text.split(marker).length, 2, 'arago.js should register once');
  let mod;
  const Studio = {
    util: {
      stats,
      clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
      makeRamp: () => () => [16, 18, 20],
    },
    PALETTES: new Proxy({}, { get: () => ({ bg: '#111', colors: ['#fff'] }) }),
    register(m) { mod = m; },
  };
  new Function('Studio', 'hooks', text.replace(marker,
    '  Object.assign(hooks, { fresnelAmplitude, fresnelIntensity, besselJ0, renderField, legacyPlate, spotRadius, AXIS_SAMPLES, FIELD_SAMPLES });\n' + marker
  ))(Studio, hooks);
  return { ...hooks, mod };
}

function fakeCanvas() {
  const ctx = {
    fillStyle: '', imageSmoothingEnabled: false,
    fillRect() {}, drawImage() {}, putImageData() {},
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
  };
  return { width: 0, height: 0, getContext: () => ctx };
}

function asksForOne(ratio) { return Math.abs(ratio - 1) <= 1e-2; }
function apertureExact(R, z, k) { return 4 * Math.sin((k * R * R) / (4 * z)) ** 2; }
function intensity(u) { return u.re * u.re + u.im * u.im; }

const A = load(source);
const out = {
  date: new Date().toISOString().slice(0, 10),
  source: { path: 'src/modules/arago.js', sha256: crypto.createHash('sha256').update(source).digest('hex') },
  harness: { path: 'tools/arago-science.js', sha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') },
  node: process.version,
  axisSamples: A.AXIS_SAMPLES,
  fieldSamples: A.FIELD_SAMPLES,
};
const log = (...a) => console.error(...a);

assert.equal(A.mod.id, 'arago');
assert.equal(A.mod.legacy[7].propagator, 'pre7');
assert.equal(A.mod.defaults.propagator, 'babinet');
assert.equal(A.AXIS_SAMPLES, 16);
assert.equal(A.FIELD_SAMPLES, 8);

// ---- J0, the kernel of the angular integral, against known values ----
{
  const known = [
    [0, 1],
    [1, 0.7651976865579666],
    [2.404825557695773, 0],
    [10, -0.24593576445134834],
    [12, 0.04768931079683354],
    [20, 0.16702466434058315],
    [50, 0.055812327669251815],
    [100, 0.019985850304223122],
  ];
  const rows = known.map(([x, y]) => {
    const got = A.besselJ0(x);
    return { x, expected: y, got, absError: Math.abs(got - y) };
  });
  for (const row of rows) assert(row.absError < 1e-8, 'J0(' + row.x + ') error ' + row.absError);
  out.besselJ0 = rows;
  log('J0 ok, max error', Math.max(...rows.map(r => r.absError)));
}

// ---- on-axis convergence of the module propagator, disk and aperture ----
{
  const cases = [
    { name: 'defaults', R: 26, z: 0.7, k: 1.35 },
    { name: 'low Fresnel', R: 10, z: 2.2, k: 0.5 },
    { name: 'mid', R: 30, z: 1, k: 1.2 },
    { name: 'hard', R: 48, z: 0.25, k: 2.2 },
  ];
  // A slider point whose aperture is near 0, and one near its maximum 4. Chosen from the closed form, then measured with the module.
  let near0 = null, near4 = null;
  for (let R = 10; R <= 60; R += 2) for (let z = 0.2; z <= 2.2 + 1e-9; z += 0.1) for (let k = 0.5; k <= 2.8 + 1e-9; k += 0.1) {
    const exact = apertureExact(R, z, k);
    if (!near0 || exact < near0.exact) near0 = { R, z, k, exact };
    if (!near4 || exact > near4.exact) near4 = { R, z, k, exact };
  }
  cases.push({ name: 'aperture near 0', R: near0.R, z: near0.z, k: near0.k });
  cases.push({ name: 'aperture near 4', R: near4.R, z: near4.z, k: near4.k });

  const rows = [];
  for (const c of cases) {
    const exact = apertureExact(c.R, c.z, c.k);
    const samples = [4, 8, 16, 32];
    const runs = samples.map(samplesN => {
      const disk = A.fresnelAmplitude(0, c.R, c.z, c.k, samplesN, 'disk');
      const ap = A.fresnelAmplitude(0, c.R, c.z, c.k, samplesN, 'aperture');
      const open = A.fresnelAmplitude(0, c.R, c.z, c.k, samplesN, 'open');
      const Iopen = intensity(open);
      const Idisk = intensity(disk) / Iopen;
      const Iap = intensity(ap) / Iopen;
      return {
        samples: samplesN,
        Iopen,
        diskRatio: Idisk,
        diskError: Math.abs(Idisk - 1),
        apertureRatio: Iap,
        apertureExact: exact,
        apertureError: Math.abs(Iap - exact),
        diskAsksForOne: asksForOne(Idisk),
        apertureAsksForOne: asksForOne(Iap),
      };
    });
    const prod = runs.find(r => r.samples === A.AXIS_SAMPLES);
    assert(prod.Iopen === 1, c.name + ' open beam');
    assert(prod.diskError < 1e-3, c.name + ' disk ' + prod.diskError);
    assert(prod.apertureError < 1e-3, c.name + ' aperture ' + prod.apertureError);
    assert(prod.diskAsksForOne === true, c.name + ' disk should pass asksForOne');
    if (Math.abs(exact - 1) > 0.05) assert(prod.apertureAsksForOne === false, c.name + ' aperture should fail asksForOne');
    // Coarse sampling must not already look converged, or the refinement would be unable to fail.
    if (c.name === 'defaults') {
      assert(runs[0].diskAsksForOne === false, 'samples 4 must fail asksForOne');
      assert(runs[0].diskError > runs[1].diskError && runs[1].diskError > runs[2].diskError && runs[2].diskError > runs[3].diskError);
      assert(runs[1].diskError / runs[3].diskError > 20, 'Simpson order');
    }
    // Babinet is how the disk is defined. Recorded as a wiring check, not as the benchmark.
    const wiring = A.fresnelAmplitude(0, c.R, c.z, c.k, 16, 'disk');
    const wiringAp = A.fresnelAmplitude(0, c.R, c.z, c.k, 16, 'aperture');
    assert(Math.abs(wiring.re + wiringAp.re - 1) < 1e-12 && Math.abs(wiring.im + wiringAp.im) < 1e-12);
    rows.push({ ...c, fresnelNumber: (c.R * c.R * c.k) / (2 * Math.PI * c.z), spotRadius: A.spotRadius(c.R, c.z, c.k), exactAperture: exact, runs });
    log(c.name, 'disk', prod.diskRatio.toFixed(6), 'aperture', prod.apertureRatio.toFixed(6), 'exact', exact.toFixed(6), 'asksForOne aperture', prod.apertureAsksForOne);
  }
  const defaults = rows[0];
  const prod = defaults.runs.find(r => r.samples === 16);
  assert(prod.apertureAsksForOne === false);
  out.onAxis = rows;
  out.failureControl = {
    predicate: 'abs(I/I_open - 1) <= 0.01',
    defaultsDiskPasses: prod.diskAsksForOne,
    defaultsAperturePasses: prod.apertureAsksForOne,
    defaultsDiskRatio: prod.diskRatio,
    defaultsApertureRatio: prod.apertureRatio,
    defaultsApertureExact: prod.apertureExact,
    coarseDiskSamples4Passes: defaults.runs[0].diskAsksForOne,
    note: 'The aperture is the wrong object for a predicate that asks for the disk identity. It is checked against 4 sin^2(k R^2 / 4z), not merely rejected.',
  };
}

// ---- one off-axis point against an independent polar quadrature (not this Bessel reduction) ----
// R=10, z=2.2, k=0.5. Reference: Simpson in radius, midpoint trapezoid in angle, 240 radial nodes,
// computed outside this repository's propagator. On axis the same run sat 9e-7 from the closed form.
{
  const R = 10, z = 2.2, k = 0.5;
  const ref = [
    { r: 2, Iap: 1.49789921, Idisk: 0.10338650 },
    { r: 10, Iap: 0.19506500, Idisk: 0.31889540 },
  ];
  const rows = ref.map(p => {
    const ap = intensity(A.fresnelAmplitude(p.r, R, z, k, 32, 'aperture'));
    const disk = intensity(A.fresnelAmplitude(p.r, R, z, k, 32, 'disk'));
    return { ...p, moduleAperture: ap, moduleDisk: disk, apertureError: Math.abs(ap - p.Iap), diskError: Math.abs(disk - p.Idisk) };
  });
  for (const row of rows) {
    assert(row.apertureError < 5e-4, 'off-axis aperture ' + row.apertureError);
    assert(row.diskError < 5e-4, 'off-axis disk ' + row.diskError);
  }
  // The geometric rim is the slowest radius to settle. Samples 16 and 64 of the same propagator must agree;
  // samples 8, which paints the field, is coarser and is not this assertion.
  const edge16 = intensity(A.fresnelAmplitude(10, R, z, k, 16, 'disk'));
  const edge64 = intensity(A.fresnelAmplitude(10, R, z, k, 64, 'disk'));
  assert(Math.abs(edge16 - edge64) < 2e-4, 'rim ' + edge16 + ' ' + edge64);
  out.offAxis = { R, z, k, reference: 'independent polar Simpson, 240 radial nodes', rows, rimAgreement16vs64: Math.abs(edge16 - edge64) };
  log('off-axis ok', rows.map(r => r.diskError.toExponential(2)).join(' '));
}

// ---- the plate's own render, default grid, and the pre-v7 picture ----
{
  const t0 = performance.now();
  const plate = A.renderField(160, 160, 26, 0.7, 1.35, 'babinet');
  const again = A.renderField(160, 160, 26, 0.7, 1.35, 'babinet');
  const axis = intensity(A.fresnelAmplitude(0, 26, 0.7, 1.35, A.AXIS_SAMPLES, 'disk'));
  assert(plate.propagator === 'babinet');
  assert(Math.abs(plate.metric - axis) < 1e-15, 'renderField metric is the axis sample');
  assert(asksForOne(plate.metric));
  assert(plate.field.length === 160 * 160);
  let same = true;
  for (let i = 0; i < plate.field.length; i++) if (plate.field[i] !== again.field[i]) { same = false; break; }
  assert(same && plate.metric === again.metric, 'deterministic');
  const legacyT = performance.now();
  const legacy = A.renderField(160, 160, 26, 0.7, 1.35, 'pre7');
  assert(legacy.propagator === 'pre7');
  assert(!asksForOne(legacy.metric), 'pre-v7 center/ring must fail the open-beam predicate');
  assert(Math.abs(legacy.metric - 1.83) < 0.02, 'pre-v7 metric ' + legacy.metric);
  let differ = 0;
  for (let i = 0; i < plate.field.length; i++) differ += Math.abs(plate.field[i] - legacy.field[i]);
  assert(differ > 1, 'Babinet field is not the old cutoff picture');
  out.plate = {
    grid: '160x160',
    defaults: { R: 26, z: 0.7, k: 1.35, fresnelNumber: plate.F, spotRadius: plate.spotRadius },
    babinetOnAxis: plate.metric,
    legacyCenterRing: legacy.metric,
    legacyFailsAsksForOne: !asksForOne(legacy.metric),
    fieldL1Difference: differ,
    babinetSeconds: (legacyT - t0) / 1000,
    legacySeconds: (performance.now() - legacyT) / 1000,
  };
  log('plate', plate.metric, 'legacy', legacy.metric, 'L1', differ.toExponential(3),
    'seconds', out.plate.babinetSeconds.toFixed(2), out.plate.legacySeconds.toFixed(2));
}

// ---- regenerate() through the module's create, so the status line is the plate's own metric ----
{
  global.document = { createElement: () => fakeCanvas() };
  const statuses = [];
  const state = {
    ...A.mod.defaults,
    seed: 'arago-science', v: 7,
    palette: ['#121110', '#F25C05', '#FFF3D6'], bg: '#121110',
  };
  const host = {
    canvas: fakeCanvas(),
    getState: () => state,
    setStatus: html => statuses.push(html),
    setWitness() {},
    reducedMotion: () => true,
    isActive: () => true,
    requestRepaint() {},
  };
  const inst = A.mod.create(host);
  inst.regenerate();
  const html = statuses.at(-1);
  assert(/I\(0\)\/I_open/.test(html), html);
  assert(/data-basis="deterministic"/.test(html), html);
  assert(/spot narrower than a cell/.test(html), html);
  assert(!/before v7/.test(html));
  const shown = /I\(0\)\/I_open <b>([^<]+)<\/b>/.exec(html);
  assert(shown && shown[1] === '1', shown && shown[1]);
  state.propagator = 'pre7';
  inst.regenerate();
  const oldHtml = statuses.at(-1);
  assert(/before v7/.test(oldHtml), oldHtml);
  assert(/aliased cutoff, not I\(0\)\/I_open/.test(oldHtml), oldHtml);
  assert(/center\/ring/.test(oldHtml));
  assert(!/Poisson/.test(oldHtml), 'legacy status must not claim the Poisson identity');
  out.status = { babinet: html, legacy: oldHtml };
  log('status ok');
}

out.seconds = (performance.now() - started) / 1000;
out.passed = true;
if (process.argv.includes('--write')) {
  const file = path.join(root, 'validation/results/arago-science.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
}
console.log('PASS arago science in ' + out.seconds.toFixed(2) + 's; disk ' +
  out.plate.babinetOnAxis.toFixed(6) + ' (was center/ring ' + out.plate.legacyCenterRing.toFixed(4) + ')');
