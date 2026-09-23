'use strict';
// Independent Float64 twin of src/modules/kpz.js column deposition kernels.
// Measures interface roughening W(t)~t^β for RD / EW / KPZ classes.
// node tools/kpz-science.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/kpz.js'), 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const started = performance.now();

// Maintain parity with production deposition rules and the UI log-window fit.
assert(source.includes("y = Math.max(h[x] + 1, l, r);"));
assert(source.includes('if (h[lx] < h[best]) best = lx;'));
assert(source.includes('if (h[rx] < h[best]) best = rx;'));
assert(source.includes('if (y - h[lx] > 1 || y - h[rx] > 1) continue;'));
assert(source.includes('y = h[x] + 1;') || source.includes('y = h[x] + 1'));
assert(source.includes('return { w: Math.sqrt(v / W), mean: m };'));
assert(source.includes('const pts = widths.filter(p => p[0] >= 4 && p[1] > 0.4 && p[1] < W * 0.06);'));
assert(source.includes("random: { beta: 0.5"));
assert(source.includes('relax: { beta: 0.25'));
assert(source.includes('ballistic: { beta: 1 / 3'));
assert(source.includes('rsos: { beta: 1 / 3'));

// Same seeded RNG as Studio.util.makeRng (src/shared/engine.js).
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
  return function () {
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
}

function interfaceWidth(h, L) {
  let m = 0;
  for (let x = 0; x < L; x++) m += h[x];
  m /= L;
  let v = 0;
  for (let x = 0; x < L; x++) { const d = h[x] - m; v += d * d; }
  return { w: Math.sqrt(v / L), mean: m };
}

/**
 * Faithful Float64 twin of kpz.js stepColumns for solid-on-solid column models.
 * Heights are numbers with integer values matching production Int32Array h[].
 * options.breakLateral: drop ballistic neighbor sticking / relax site choice → RD.
 */
function deposit(model, L, layers, seed, options = {}) {
  const breakLateral = !!options.breakLateral;
  const h = new Float64Array(L);
  const rng = makeRng(seed);
  let nPart = 0;
  const widths = [];
  let nextMeasure = 4 * L;
  const target = Math.floor(L * layers);
  while (nPart < target) {
    const x = (rng() * L) | 0;
    let site = x, y;
    const useRandom = model === 'random' || (breakLateral && (model === 'ballistic' || model === 'relax' || model === 'rsos'));
    if (useRandom) {
      y = h[x] + 1;
      site = x;
    } else if (model === 'ballistic') {
      const l = x > 0 ? h[x - 1] : h[L - 1], r = x < L - 1 ? h[x + 1] : h[0];
      y = Math.max(h[x] + 1, l, r);
      site = x;
    } else if (model === 'relax') {
      const lx = x > 0 ? x - 1 : L - 1, rx = x < L - 1 ? x + 1 : 0;
      let best = x;
      if (h[lx] < h[best]) best = lx;
      if (h[rx] < h[best]) best = rx;
      y = h[best] + 1;
      site = best;
    } else if (model === 'rsos') {
      const lx = x > 0 ? x - 1 : L - 1, rx = x < L - 1 ? x + 1 : 0;
      y = h[x] + 1;
      if (y - h[lx] > 1 || y - h[rx] > 1) continue;
      site = x;
    } else {
      throw new Error('unknown model ' + model);
    }
    h[site] = y;
    nPart++;
    if (nPart >= nextMeasure) {
      const m = interfaceWidth(h, L);
      widths.push([nPart / L, m.w]);
      nextMeasure = Math.ceil(nextMeasure * 1.25);
    }
  }
  return { h, nPart, widths, final: interfaceWidth(h, L) };
}

// Same log-window least-squares fit as the plate status line.
function fitBeta(widths, L) {
  const pts = widths.filter(p => p[0] >= 4 && p[1] > 0.4 && p[1] < L * 0.06);
  let beta = null;
  if (pts.length > 5) {
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const [t, w] of pts) {
      const X = Math.log(t), Y = Math.log(w);
      sx += X; sy += Y; sxx += X * X; sxy += X * Y;
    }
    const n = pts.length, den = n * sxx - sx * sx;
    if (Math.abs(den) > 1e-9) beta = (n * sxy - sx * sy) / den;
  }
  return { beta, pointsUsed: pts.length, window: { tMin: 4, wMin: 0.4, wMaxFracL: 0.06 } };
}

function meanStd(xs) {
  const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n;
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / n;
  return { mean: m, std: Math.sqrt(v), n };
}

function inBand(x, [lo, hi]) { return x >= lo && x <= hi; }

const PROTOCOL = {
  L: 512,
  layers: 80,
  seedsPerClass: 5,
  seedPrefix: 'kpz-science-2026',
  classes: {
    random: { theoryBeta: 0.5, band: [0.42, 0.58], name: 'random deposition (RD)' },
    relax: { theoryBeta: 0.25, band: [0.12, 0.38], name: 'surface relaxation (EW)' },
    // RSOS reaches KPZ faster than ballistic; ballistic is reported but not the gate.
    rsos: { theoryBeta: 1 / 3, band: [0.22, 0.45], name: 'restricted solid-on-solid (KPZ)' },
  },
  ballisticReport: { theoryBeta: 1 / 3, band: [0.18, 0.42], name: 'ballistic deposition (KPZ, crossover)' },
  // Cheap Family–Vicsek α probe: late-time W(L) across small L (theory α=1/2 for EW/KPZ).
  alpha: {
    Ls: [24, 48, 96],
    layers: 2500,
    seeds: 6,
    // Wide: finite-L / undersaturation / single-block noise; only require EW/KPZ grow with L.
    band: [0.2, 0.95],
    rdMax: 0.25,
  },
};

function measureClass(model, cfg, { breakLateral = false } = {}) {
  const betas = [];
  const runs = [];
  for (let i = 0; i < PROTOCOL.seedsPerClass; i++) {
    const seed = `${PROTOCOL.seedPrefix}/${model}/${i}${breakLateral ? '/broken' : ''}`;
    const dep = deposit(model, PROTOCOL.L, PROTOCOL.layers, seed, { breakLateral });
    const fit = fitBeta(dep.widths, PROTOCOL.L);
    assert(fit.beta != null && Number.isFinite(fit.beta), `no β fit for ${model} seed ${i}`);
    betas.push(fit.beta);
    runs.push({
      seed,
      beta: fit.beta,
      pointsUsed: fit.pointsUsed,
      finalW: dep.final.w,
      meanHeight: dep.final.mean,
      samples: dep.widths.length,
    });
  }
  const stats = meanStd(betas);
  return {
    model,
    theoryBeta: cfg.theoryBeta,
    band: cfg.band,
    name: cfg.name,
    breakLateral,
    betas,
    runs,
    meanBeta: stats.mean,
    stdBeta: stats.std,
    inBand: inBand(stats.mean, cfg.band),
  };
}

function fitAlpha(model) {
  const { Ls, layers, seeds } = PROTOCOL.alpha;
  const ws = [];
  for (const L of Ls) {
    let sum = 0;
    for (let i = 0; i < seeds; i++) {
      const dep = deposit(model, L, layers, `${PROTOCOL.seedPrefix}/alpha/${model}/${L}/${i}`);
      sum += dep.final.w;
    }
    ws.push(sum / seeds);
  }
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = Ls.length;
  for (let i = 0; i < n; i++) {
    const X = Math.log(Ls[i]), Y = Math.log(ws[i]);
    sx += X; sy += Y; sxx += X * X; sxy += X * Y;
  }
  const den = n * sxx - sx * sx;
  const alpha = Math.abs(den) > 1e-12 ? (n * sxy - sx * sy) / den : null;
  return { Ls, layers, seeds, Wsat: ws, alpha };
}

// ---- primary β evidence ----
const classResults = {};
for (const [model, cfg] of Object.entries(PROTOCOL.classes)) {
  classResults[model] = measureClass(model, cfg);
  assert(classResults[model].inBand,
    `${model}: mean β=${classResults[model].meanBeta} outside band ${cfg.band} (theory ${cfg.theoryBeta})`);
}

const ballistic = measureClass('ballistic', PROTOCOL.ballisticReport);
assert(ballistic.inBand,
  `ballistic: mean β=${ballistic.meanBeta} outside crossover band ${PROTOCOL.ballisticReport.band}`);

// Class ordering: RD > KPZ > EW on mean β (honest separation of universality).
assert(classResults.random.meanBeta > classResults.rsos.meanBeta,
  'RD mean β should exceed KPZ (rsos)');
assert(classResults.rsos.meanBeta > classResults.relax.meanBeta,
  'KPZ (rsos) mean β should exceed EW');

// ---- failureControl ----
// 1) Claiming the KPZ band for random deposition must fail.
const randomAsKpz = inBand(classResults.random.meanBeta, PROTOCOL.classes.rsos.band);
assert(!randomAsKpz, 'failureControl: random mean β must not land in the KPZ band');

// 2) Break lateral sticking on ballistic → collapses to RD (β~1/2), fails KPZ crossover band.
const brokenBallistic = measureClass('ballistic', PROTOCOL.ballisticReport, { breakLateral: true });
assert(!brokenBallistic.inBand,
  `failureControl: broken ballistic mean β=${brokenBallistic.meanBeta} should miss KPZ band`);
assert(inBand(brokenBallistic.meanBeta, PROTOCOL.classes.random.band),
  `failureControl: broken ballistic should land in RD band, got ${brokenBallistic.meanBeta}`);

// 3) Break relaxation → RD.
const brokenRelax = measureClass('relax', PROTOCOL.classes.relax, { breakLateral: true });
assert(!brokenRelax.inBand,
  `failureControl: broken relax mean β=${brokenRelax.meanBeta} should miss EW band`);
assert(inBand(brokenRelax.meanBeta, PROTOCOL.classes.random.band),
  `failureControl: broken relax should land in RD band, got ${brokenRelax.meanBeta}`);

// ---- optional Family–Vicsek α (cheap, wide) ----
const alphaRelax = fitAlpha('relax');
const alphaRsos = fitAlpha('rsos');
const alphaRandom = fitAlpha('random');
assert(alphaRelax.alpha != null && alphaRsos.alpha != null && alphaRandom.alpha != null);
assert(inBand(alphaRelax.alpha, PROTOCOL.alpha.band),
  `α(relax)=${alphaRelax.alpha} outside coarse band ${PROTOCOL.alpha.band}`);
assert(inBand(alphaRsos.alpha, PROTOCOL.alpha.band),
  `α(rsos)=${alphaRsos.alpha} outside coarse band ${PROTOCOL.alpha.band}`);
assert(alphaRandom.alpha < PROTOCOL.alpha.rdMax,
  `α(random)=${alphaRandom.alpha} should stay below ${PROTOCOL.alpha.rdMax} (RD does not saturate)`);

const result = {
  sourceSha256: hash(source),
  pass: true,
  elapsedMs: Math.round(performance.now() - started),
  protocol: {
    L: PROTOCOL.L,
    layers: PROTOCOL.layers,
    seedsPerClass: PROTOCOL.seedsPerClass,
    seedPrefix: PROTOCOL.seedPrefix,
    fitWindow: { tMin: 4, wMin: 0.4, wMaxFracL: 0.06, note: 'Matches production kpz.js status-line filter.' },
    measureSchedule: 'log-spaced: nextMeasure starts at 4L, multiplies by 1.25',
  },
  classes: {
    random: {
      ...PROTOCOL.classes.random,
      meanBeta: classResults.random.meanBeta,
      stdBeta: classResults.random.stdBeta,
      betas: classResults.random.betas,
      inBand: classResults.random.inBand,
    },
    relax: {
      ...PROTOCOL.classes.relax,
      meanBeta: classResults.relax.meanBeta,
      stdBeta: classResults.relax.stdBeta,
      betas: classResults.relax.betas,
      inBand: classResults.relax.inBand,
    },
    rsos: {
      ...PROTOCOL.classes.rsos,
      meanBeta: classResults.rsos.meanBeta,
      stdBeta: classResults.rsos.stdBeta,
      betas: classResults.rsos.betas,
      inBand: classResults.rsos.inBand,
    },
    ballistic: {
      ...PROTOCOL.ballisticReport,
      meanBeta: ballistic.meanBeta,
      stdBeta: ballistic.stdBeta,
      betas: ballistic.betas,
      inBand: ballistic.inBand,
      note: 'Reported for completeness; RSOS is the KPZ gate (faster crossover).',
    },
  },
  failureControl: {
    randomClaimedAsKpz: { landsInKpzBand: randomAsKpz, mustFail: true, passed: !randomAsKpz },
    brokenBallisticSticking: {
      meanBeta: brokenBallistic.meanBeta,
      stdBeta: brokenBallistic.stdBeta,
      betas: brokenBallistic.betas,
      landsInKpzBand: brokenBallistic.inBand,
      landsInRdBand: inBand(brokenBallistic.meanBeta, PROTOCOL.classes.random.band),
      mustMissKpzBand: true,
      passed: !brokenBallistic.inBand && inBand(brokenBallistic.meanBeta, PROTOCOL.classes.random.band),
    },
    brokenRelaxation: {
      meanBeta: brokenRelax.meanBeta,
      stdBeta: brokenRelax.stdBeta,
      betas: brokenRelax.betas,
      landsInEwBand: brokenRelax.inBand,
      landsInRdBand: inBand(brokenRelax.meanBeta, PROTOCOL.classes.random.band),
      mustMissEwBand: true,
      passed: !brokenRelax.inBand && inBand(brokenRelax.meanBeta, PROTOCOL.classes.random.band),
    },
  },
  familyVicsekAlpha: {
    theory: 0.5,
    band: PROTOCOL.alpha.band,
    rdMax: PROTOCOL.alpha.rdMax,
    relax: alphaRelax,
    rsos: alphaRsos,
    random: alphaRandom,
    note: 'Coarse small-L saturation probe only; not a precision α=1/2 claim.',
  },
  limitations: [
    'Finite L=512 and one growth window; KPZ ballistic deposition has a known slow crossover (fits often sit under 1/3).',
    'Single-realization noise averaged over only 5 seeds per class; no block-bootstrap uncertainty certification.',
    'Eden radial geometry is separate and not measured here; no Tracy–Widom edge statistics or liquid-crystal experiment claim.',
    'Float64 CPU twin of column kernels; production Int32Array heights agree in integer arithmetic but this is not a browser UI replay.',
    'Family–Vicsek α uses wide bands at small L; undersaturation and noise remain.',
    'No print-state accuracy audit is registered.',
  ],
};

assert(result.failureControl.randomClaimedAsKpz.passed);
assert(result.failureControl.brokenBallisticSticking.passed);
assert(result.failureControl.brokenRelaxation.passed);

if (process.argv.includes('--write')) {
  fs.writeFileSync(
    path.join(root, 'validation/results/kpz-science.json'),
    JSON.stringify(result, null, 2) + '\n'
  );
}
console.log(JSON.stringify(result, null, 2));
