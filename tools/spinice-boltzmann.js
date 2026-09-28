// node tools/spinice-boltzmann.js [--write] [--smoke]
//
// The plate's sweep is single-arrow Metropolis for
// E = (J/2) sum_v Q_v^2 - h sum sigma, on every orientation, not only the ice rule.
// On the 2x2 torus there are 256 orientations. This tool loads src/modules/spinice.js,
// calls that sweep, and compares the sampled frequencies with exp(-E/T).
//
// Consecutive frames are not independent: the frame loop attempts W*8 flips between
// them. The z score is a batch-mean z, 200 batches. It is not an independent-draw z.
//
// A state with Boltzmann probability below 1e-4 is too thin for its own normal z at
// this sample size. Those states are pooled into one tail, so all 256 frequencies
// still enter the comparison. The sum of z^2 is over the states at or above 1e-4.
//
// Failure controls call a sweep that is wrong on purpose. One passes twice the
// temperature into the plate's own sweep and still scores it against exp(-E/T).
// The other loads the same module with the energy ignored, so a proposed flip is
// kept with probability 1/2. Both must fail the same batch-mean gate. The
// unmodified sweep is the sampler under test, not a failure.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const SMOKE = process.argv.includes('--smoke');
const sourcePath = path.join(root, 'src/modules/spinice.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const makeRng = new Function('TAU', engine.slice(engine.indexOf('  function makeRng'), engine.indexOf('  function makeNoise')) + '\nreturn makeRng;')(Math.PI * 2);

const BATCHES = 200;
const PER_BATCH = SMOKE ? 200 : 10000;
const BURN = SMOKE ? 40 : 2000;
const P_MIN = 1e-4;
const Z_MAX = 4;
const SUM_SIGMA_MAX = 4;
const POINTS = [
  { J: 1.6, T: 0.55, h: 0, states: 162 },
  { J: 1.6, T: 0.55, h: 0.3, states: 121 },
  { J: 1, T: 1.2, h: 0, states: 254 },
];

function replaceOnce(text, before, after) {
  const parts = text.split(before);
  assert.equal(parts.length, 2, 'expected one hook: ' + before.slice(0, 80));
  return parts.join(after);
}

function loadPlate(text) {
  let body = text;
  body = replaceOnce(body, '      return {\n        aspect(s)',
    '      return {\n        audit() { return { sweep, charges, step: () => step, W: () => W, H: () => H, hx: () => hx, hy: () => hy, Q: () => Q }; },\n        aspect(s)');
  body = replaceOnce(body, 'return { W: g, H: Math.max(32, Math.round(g * aspect)) };',
    'return { W: g, H: s._small ? Math.max(1, Math.round(g * aspect)) : Math.max(32, Math.round(g * aspect)) };');
  assert(body.includes('if (dE + dH > 0 && rng() >= Math.exp(-(dE + dH) / T))') || body.includes('energy ignored'),
    'plate sweep acceptance is no longer the Metropolis test this harness calls');
  let state = {};
  const host = {
    canvas: { width: 4, height: 4, getContext: () => ({ imageSmoothingEnabled: false, fillStyle: '', fillRect() {}, drawImage() {} }) },
    getState: () => state,
    setStatus() {},
    isActive: () => false,
    reducedMotion: () => true,
  };
  const document = {
    createElement() {
      return { width: 1, height: 1, getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }) };
    },
  };
  const context = {
    Studio: {
      util: {
        makeRng,
        clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
        makeRamp: () => () => [0, 0, 0],
        stats: { compare: () => '' },
      },
      PALETTES: {},
      register(m) { context.module = m; },
    },
    document,
  };
  vm.createContext(context);
  vm.runInContext(body, context);
  assert.equal(typeof context.module.create, 'function', 'spinice module did not register');
  return {
    module: context.module,
    boot(extra) {
      state = Object.assign({
        grid: 2, aspect: '1:1', J: 1.6, temp: 0.55, field: 0,
        warmup: 0, running: false, init: 'ice', view: 'charge', exposure: 1,
        seed: 'spinice-boltzmann', palette: ['#000000'], bg: '#000000', _small: true,
      }, extra);
      const inst = context.module.create(host);
      inst.regenerate();
      return { state, api: inst.audit() };
    },
  };
}

function energy(api, J, h) {
  api.charges();
  const Q = api.Q();
  const hx = api.hx();
  const hy = api.hy();
  let q2 = 0;
  let mag = 0;
  for (let i = 0; i < Q.length; i++) q2 += Q[i] * Q[i];
  for (let i = 0; i < hx.length; i++) mag += hx[i];
  for (let i = 0; i < hy.length; i++) mag += hy[i];
  return { E: 0.5 * J * q2 - h * mag, q2, mag };
}

function enumerate(plate) {
  const { api } = plate.boot({ seed: 'enumerate', warmup: 0 });
  assert.equal(api.W(), 2);
  assert.equal(api.H(), 2);
  const hx = api.hx();
  const hy = api.hy();
  const rows = [];
  let ice = 0;
  for (let bits = 0; bits < 256; bits++) {
    for (let i = 0; i < 4; i++) hx[i] = (bits & (1 << i)) ? 1 : -1;
    for (let i = 0; i < 4; i++) hy[i] = (bits & (1 << (4 + i))) ? 1 : -1;
    const row = energy(api, 1, 0);
    if (row.q2 === 0) ice++;
    rows.push({ halfQ2: 0.5 * row.q2, mag: row.mag });
  }
  assert.equal(ice, 18, 'plate charges() did not find 18 ice configurations on the 2x2 torus');
  return rows;
}

function probabilities(rows, J, T, h) {
  const w = new Float64Array(256);
  let Z = 0;
  for (let i = 0; i < 256; i++) {
    const E = J * rows[i].halfQ2 - h * rows[i].mag;
    const wi = Math.exp(-E / T);
    w[i] = wi;
    Z += wi;
  }
  const p = new Float64Array(256);
  for (let i = 0; i < 256; i++) p[i] = w[i] / Z;
  return p;
}

function scripted(seq) {
  let i = 0;
  const rng = () => {
    assert(i < seq.length, 'sweep drew more random numbers than the forced flip allows');
    return seq[i++];
  };
  rng.int = (lo, hi) => Math.floor(lo + rng() * (hi - lo + 1));
  rng.used = () => i;
  return rng;
}

function arrowsEqual(a, b) {
  for (let i = 0; i < a.hx.length; i++) if (a.hx[i] !== b.hx[i] || a.hy[i] !== b.hy[i]) return false;
  return true;
}

// One proposed flip through the plate sweep. The first three draws pick the edge.
// An uphill move consumes a fourth draw; a downhill move must not.
function agreeWithEnergy(plate) {
  const cases = [];
  for (const field of [0, 0.3]) {
    for (const horiz of [true, false]) {
      for (const x of [0, 1]) {
        for (const y of [0, 1]) {
          cases.push({ field, horiz, x, y });
        }
      }
    }
  }
  // A second sheet of moves, from a fixed non-ice orientation, so some proposals are downhill.
  const hot = 0b00110101;
  for (const spec of cases) {
    for (const start of ['ice', 'hot']) {
      const { state, api } = plate.boot({
        seed: 'energy-agree', J: 1.6, temp: 0.55, field: spec.field, init: start === 'ice' ? 'ice' : 'noise', warmup: 0,
      });
      const hx = api.hx();
      const hy = api.hy();
      if (start === 'hot') {
        for (let i = 0; i < 4; i++) hx[i] = (hot & (1 << i)) ? 1 : -1;
        for (let i = 0; i < 4; i++) hy[i] = (hot & (1 << (4 + i))) ? 1 : -1;
      }
      const saved = { hx: Int8Array.from(hx), hy: Int8Array.from(hy) };
      const E0 = energy(api, state.J, state.field).E;
      const hDraw = spec.horiz ? 0.1 : 0.6;
      const probe = scripted([hDraw, spec.x / 2 + 0.01, spec.y / 2 + 0.01, 0]);
      api.sweep(state, probe, 1);
      const E1 = energy(api, state.J, state.field).E;
      const dE = E1 - E0;
      const moved = !arrowsEqual(saved, { hx, hy });
      assert.equal(moved, true, 'a forced flip did not change the arrows');
      if (dE <= 0) assert.equal(probe.used(), 3, 'a downhill flip consumed an accept draw');
      else {
        assert.equal(probe.used(), 4, 'an uphill flip did not consult the accept draw');
        const pKeep = Math.exp(-dE / state.temp);
        hx.set(saved.hx);
        hy.set(saved.hy);
        const reject = scripted([hDraw, spec.x / 2 + 0.01, spec.y / 2 + 0.01, (1 + pKeep) / 2]);
        api.sweep(state, reject, 1);
        assert.equal(arrowsEqual(saved, { hx, hy }), true, 'a draw above exp(-dE/T) did not reject');
        assert.equal(reject.used(), 4);
        hx.set(saved.hx);
        hy.set(saved.hy);
        const accept = scripted([hDraw, spec.x / 2 + 0.01, spec.y / 2 + 0.01, pKeep / 2]);
        api.sweep(state, accept, 1);
        assert.equal(arrowsEqual(saved, { hx, hy }), false, 'a draw below exp(-dE/T) did not accept');
        assert.equal(accept.used(), 4);
      }
    }
  }
}

function sample(api, state, batches, perBatch, mask) {
  const nflip = api.W() * 8;
  assert.equal(nflip, 16);
  const hx = api.hx();
  const hy = api.hy();
  const sum = new Float64Array(256);
  const sumsq = new Float64Array(256);
  const total = new Uint32Array(256);
  const hist = new Uint32Array(256);
  let tailSum = 0;
  let tailSumsq = 0;
  const burnRng = () => {
    api.sweep(state, makeRng(state.seed + '/mc/' + api.step()), nflip);
  };
  for (let i = 0; i < BURN; i++) burnRng();
  for (let b = 0; b < batches; b++) {
    hist.fill(0);
    for (let t = 0; t < perBatch; t++) {
      api.sweep(state, makeRng(state.seed + '/mc/' + api.step()), nflip);
      let key = 0;
      if (hx[0] === 1) key |= 1;
      if (hx[1] === 1) key |= 2;
      if (hx[2] === 1) key |= 4;
      if (hx[3] === 1) key |= 8;
      if (hy[0] === 1) key |= 16;
      if (hy[1] === 1) key |= 32;
      if (hy[2] === 1) key |= 64;
      if (hy[3] === 1) key |= 128;
      hist[key]++;
    }
    const inv = 1 / perBatch;
    let tail = 0;
    for (let s = 0; s < 256; s++) {
      const f = hist[s] * inv;
      sum[s] += f;
      sumsq[s] += f * f;
      total[s] += hist[s];
      if (!mask[s]) tail += f;
    }
    tailSum += tail;
    tailSumsq += tail * tail;
  }
  return { sum, sumsq, total, tailSum, tailSumsq, batches, perBatch };
}

function variance(sum, sumsq, n) {
  const v = (sumsq - (sum * sum) / n) / (n - 1);
  if (v < 0 && v > -1e-18) return 0;
  return v;
}

function score(sampleRun, p, mask) {
  const B = sampleRun.batches;
  let sumZ2 = 0;
  let maxAbsZ = 0;
  let k = 0;
  let worst = null;
  let tailP = 0;
  const states = [];
  for (let s = 0; s < 256; s++) {
    if (!mask[s]) {
      tailP += p[s];
      continue;
    }
    const mean = sampleRun.sum[s] / B;
    const v = variance(sampleRun.sum[s], sampleRun.sumsq[s], B);
    let z;
    if (!(v > 0)) z = mean === p[s] ? 0 : Infinity;
    else z = (mean - p[s]) / Math.sqrt(v / B);
    const az = Math.abs(z);
    if (az > maxAbsZ) {
      maxAbsZ = az;
      worst = { state: s, p: p[s], mean, z };
    }
    if (Number.isFinite(z)) sumZ2 += z * z;
    else sumZ2 = Infinity;
    k++;
    states.push({ state: s, count: sampleRun.total[s], p: p[s], mean, z });
  }
  const tailMean = sampleRun.tailSum / B;
  const tailV = variance(sampleRun.tailSum, sampleRun.tailSumsq, B);
  let tailZ;
  if (!(tailV > 0)) tailZ = tailMean === tailP ? 0 : Infinity;
  else tailZ = (tailMean - tailP) / Math.sqrt(tailV / B);
  const sumSigma = Number.isFinite(sumZ2) ? (sumZ2 - k) / Math.sqrt(2 * k) : Infinity;
  const pass = k > 0 && maxAbsZ <= Z_MAX && Math.abs(sumSigma) <= SUM_SIGMA_MAX && Math.abs(tailZ) <= Z_MAX;
  return { k, sumZ2, sumSigma, maxAbsZ, tailP, tailMean, tailZ, pass, worst, states };
}

function maskOf(p) {
  const mask = new Uint8Array(256);
  let k = 0;
  for (let i = 0; i < 256; i++) if (p[i] >= P_MIN) { mask[i] = 1; k++; }
  return { mask, k };
}

function runPoint(plate, rows, point, opts) {
  const p = probabilities(rows, point.J, point.T, point.h);
  const { mask, k } = maskOf(p);
  assert.equal(k, point.states, 'probability floor 1e-4 did not select the expected number of states at ' + point.J + ',' + point.T + ',' + point.h);
  const temp = opts.tempFactor ? point.T * opts.tempFactor : point.T;
  const { state, api } = plate.boot({
    seed: opts.seed, J: point.J, temp, field: point.h, init: 'ice', warmup: 0,
  });
  const sampled = sample(api, state, BATCHES, PER_BATCH, mask);
  const scored = score(sampled, p, mask);
  return {
    J: point.J, T: point.T, h: point.h,
    sweepTemperature: temp,
    batches: BATCHES,
    framesPerBatch: PER_BATCH,
    burnFrames: BURN,
    flipsPerFrame: 16,
    frames: BATCHES * PER_BATCH,
    probabilityFloor: P_MIN,
    states: scored.k,
    sumZ2: scored.sumZ2,
    sumSigma: scored.sumSigma,
    maxAbsZ: scored.maxAbsZ,
    tailP: scored.tailP,
    tailMean: scored.tailMean,
    tailZ: scored.tailZ,
    pass: scored.pass,
    worst: scored.worst,
    counts: opts.keepCounts ? Array.from(sampled.total) : undefined,
    probabilities: opts.keepCounts ? Array.from(p) : undefined,
  };
}

function round(x, d) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return x;
  const p = 10 ** d;
  return Math.round(x * p) / p;
}

function publish(row, keep) {
  const out = {
    J: row.J, T: row.T, h: row.h,
    sweepTemperature: row.sweepTemperature,
    batches: row.batches,
    framesPerBatch: row.framesPerBatch,
    burnFrames: row.burnFrames,
    flipsPerFrame: row.flipsPerFrame,
    frames: row.frames,
    probabilityFloor: row.probabilityFloor,
    states: row.states,
    sumZ2: round(row.sumZ2, 4),
    sumSigma: round(row.sumSigma, 4),
    maxAbsZ: round(row.maxAbsZ, 4),
    tailProbability: round(row.tailP, 8),
    tailMean: round(row.tailMean, 8),
    tailZ: round(row.tailZ, 4),
    pass: row.pass,
    worst: row.worst ? {
      state: row.worst.state,
      p: round(row.worst.p, 8),
      mean: round(row.worst.mean, 8),
      z: round(row.worst.z, 4),
    } : null,
  };
  if (keep) {
    out.counts = row.counts;
    out.probabilities = row.probabilities.map(x => round(x, 10));
  }
  return out;
}

function brokenSource(text) {
  const hxLine = 'if (dE + dH > 0 && rng() >= Math.exp(-(dE + dH) / T)) hx[i] = -hx[i];';
  const hyLine = 'if (dE + dH > 0 && rng() >= Math.exp(-(dE + dH) / T)) hy[i] = -hy[i];';
  assert.equal(text.includes(hxLine), true, 'horizontal Metropolis reject is not where the failure control expects it');
  assert.equal(text.includes(hyLine), true, 'vertical Metropolis reject is not where the failure control expects it');
  // Ignore the energy. Keep the proposed flip with probability 1/2. Rejections
  // still happen, so an even number of flips per frame is not stuck in one parity.
  const ignored = 'if (rng() >= 0.5) hx[i] = -hx[i]; /* energy ignored */';
  const ignoredV = 'if (rng() >= 0.5) hy[i] = -hy[i]; /* energy ignored */';
  return text.replace(hxLine, ignored).replace(hyLine, ignoredV);
}

function main() {
  const plate = loadPlate(source);
  assert.equal(plate.module.defaults.J, 1.6);
  assert.equal(plate.module.defaults.temp, 0.55);
  assert.equal(plate.module.defaults.field, 0);
  const rows = enumerate(plate);
  agreeWithEnergy(plate);

  const correct = [];
  const wrongT = [];
  const brokenRuns = [];
  const broken = loadPlate(brokenSource(source));
  for (const point of POINTS) {
    const tag = point.J + ',' + point.T + ',' + point.h;
    process.stderr.write('point ' + tag + '\n');
    const ok = runPoint(plate, rows, point, { seed: 'spinice/boltzmann/' + tag, keepCounts: !SMOKE });
    correct.push(ok);
    process.stderr.write('  plate sumZ2=' + ok.sumZ2 + ' states=' + ok.states + ' max|z|=' + ok.maxAbsZ + ' tailZ=' + ok.tailZ + ' pass=' + ok.pass + '\n');
    const badT = runPoint(plate, rows, point, { seed: 'spinice/boltzmann/' + tag + '/wrong-temperature', tempFactor: 2 });
    wrongT.push(badT);
    process.stderr.write('  wrong T sumZ2=' + badT.sumZ2 + ' max|z|=' + badT.maxAbsZ + ' pass=' + badT.pass + '\n');
    const bad = runPoint(broken, rows, point, { seed: 'spinice/boltzmann/' + tag + '/broken-accept' });
    brokenRuns.push(bad);
    process.stderr.write('  broken sumZ2=' + bad.sumZ2 + ' max|z|=' + bad.maxAbsZ + ' pass=' + bad.pass + '\n');
  }

  if (!SMOKE) {
    for (const row of correct.concat(wrongT, brokenRuns)) {
      assert(Number.isFinite(row.sumZ2) && Number.isFinite(row.maxAbsZ) && Number.isFinite(row.tailZ),
        'non-finite z at J=' + row.J + ' T=' + row.T + ' h=' + row.h + ' sweep T=' + row.sweepTemperature
        + '; a scored state had no batch variance');
    }
    for (const row of correct) {
      assert.equal(row.pass, true, 'plate sweep failed the batch-mean gate at J=' + row.J + ' T=' + row.T + ' h=' + row.h
        + ' sumZ2=' + row.sumZ2 + ' max|z|=' + row.maxAbsZ + ' tailZ=' + row.tailZ);
      assert.equal(Number.isFinite(row.sumZ2), true);
    }
    for (const row of wrongT) {
      assert.equal(row.pass, false, 'twice the temperature passed the batch-mean gate at J=' + row.J + ' T=' + row.T + ' h=' + row.h);
      assert(row.maxAbsZ > Z_MAX, 'twice the temperature did not move a scored state by more than ' + Z_MAX + ' batch-mean standard errors');
    }
    for (const row of brokenRuns) {
      assert.equal(row.pass, false, 'the sweep with rejection disabled passed the batch-mean gate at J=' + row.J + ' T=' + row.T + ' h=' + row.h);
      assert(row.maxAbsZ > Z_MAX, 'the broken sweep did not move a scored state by more than ' + Z_MAX + ' batch-mean standard errors');
    }
  }

  const maxAbsZ = Math.max(...correct.map(row => row.maxAbsZ));
  const result = {
    date: '2026-09-27',
    source: 'src/modules/spinice.js',
    sourceSha256,
    smoke: SMOKE,
    model: 'Square ice on the 2x2 torus. Single-arrow Metropolis for E = (J/2) sum Q^2 - h sum sigma, stationary weight exp(-E/T) on all 256 orientations.',
    method: {
      batches: BATCHES,
      framesPerBatch: PER_BATCH,
      burnFrames: BURN,
      flipsPerFrame: 16,
      probabilityFloor: P_MIN,
      zMax: Z_MAX,
      sumSigmaMax: SUM_SIGMA_MAX,
      independence: 'Consecutive frames are not independent. Each frame is 16 attempted flips after the previous one. The z score divides the batch-mean residual by the standard error of the 200 batch means. An independent-draw multinomial variance is not the acceptance test.',
    },
    plate: correct.map(row => publish(row, !SMOKE)),
    failureControls: {
      wrongTemperature: {
        note: 'The plate sweep is called with twice the temperature and scored against exp(-E/T) at the stated temperature. The accept rule is not rewritten.',
        runs: wrongT.map(row => publish(row, false)),
        allFail: wrongT.every(row => row.pass === false),
      },
      brokenAccept: {
        note: 'The module is loaded with the energy ignored: every proposed flip is kept with probability 1/2. That sweep is not the plate. It is scored against the same exp(-E/T).',
        runs: brokenRuns.map(row => publish(row, false)),
        allFail: brokenRuns.every(row => row.pass === false),
      },
    },
    maxAbsZ: round(maxAbsZ, 4),
    pass: correct.every(row => row.pass) && wrongT.every(row => !row.pass) && brokenRuns.every(row => !row.pass),
  };

  const lines = [];
  for (const row of correct) {
    lines.push('(' + row.J + ', ' + row.T + ', ' + row.h + ') sum z^2 = ' + round(row.sumZ2, 1) + ' over ' + row.states + ' states, max |z| = ' + round(row.maxAbsZ, 2) + ', tail z = ' + round(row.tailZ, 2));
  }
  lines.push('max |z| across the three plate runs = ' + round(maxAbsZ, 2));
  lines.push('wrong temperature fails = ' + result.failureControls.wrongTemperature.allFail);
  lines.push('broken accept fails = ' + result.failureControls.brokenAccept.allFail);
  lines.push('pass = ' + result.pass);
  console.log(lines.join('\n'));

  if (WRITE && !SMOKE) {
    const file = path.join(root, 'validation/results/spinice-boltzmann.json');
    fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
    console.log('wrote ' + path.relative(root, file));
  }
}

main();
