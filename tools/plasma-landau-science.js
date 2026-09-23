// Quantitative Landau damping of a small Maxwellian Langmuir wave vs independent linear theory.
// Node only: node tools/plasma-landau-science.js > validation/results/plasma-landau-science.json
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/plasma.js'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();
function load(text) {
  const hooks = {}, marker = '  Studio.register({'; let mod;
  assert.equal(text.split(marker).length, 2);
  const Studio = {
    util: { makeRng, clamp: (x, a, b) => Math.max(a, Math.min(x, b)) },
    gl: { GLSL: { bicubic: '', ramp: '' } },
    PALETTES: new Proxy({}, { get: () => ({ bg: '#000', colors: ['#fff'] }) }),
    register(m) { mod = m; },
  };
  new Function('Studio', 'hooks', text.replace(marker, '  Object.assign(hooks,{makeSim,deposit,solveField,gather,L});\n' + marker))(Studio, hooks);
  return { ...hooks, mod };
}
const A = load(source), { L } = A;
function config(overrides = {}) { return { ...A.mod.defaults, running: false, ...overrides }; }
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const started = performance.now();

// ---------------------------------------------------------------------------
// Independent Landau root (Float64). Units match plasma.js:
//   ω_p = m = e = ε0 = n0 = 1, L = 2π.
//   thermal ≡ Maxwellian σ = v_th, so λ_D = v_th / ω_p = thermal.
// Dielectric: ε = 1 + (1/(k²λ_D²)) [1 + ζ Z(ζ)] = 0,
//   ζ = ω / (√2 k v_th),  Z(ζ) = i√π w(ζ),  w = Faddeeva.
// Time convention e^{-iωt}: damping ⇒ Im(ω) = γ < 0.
// ---------------------------------------------------------------------------
function cmul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function cadd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function csub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function cdiv(a, b) { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
function cscale(a, s) { return [a[0] * s, a[1] * s]; }
function cexp(a) { const e = Math.exp(a[0]); return [e * Math.cos(a[1]), e * Math.sin(a[1])]; }
function cabs(a) { return Math.hypot(a[0], a[1]); }
function cerf(z) {
  const zz = cmul(z, z); let term = z.slice(), sum = z.slice();
  for (let n = 1; n < 120; n++) {
    term = cdiv(cmul(term, cscale(zz, -1)), [n, 0]);
    const add = cdiv(term, [2 * n + 1, 0]);
    sum = cadd(sum, add);
    if (cabs(add) < 1e-18) break;
  }
  return cscale(sum, 2 / Math.sqrt(Math.PI));
}
function faddeeva(zIn) {
  let x = zIn[0], y = zIn[1], flip = false;
  if (y < 0) { flip = true; x = -x; y = -y; }
  const z = [x, y], r2 = x * x + y * y; let w;
  if (r2 < 16) w = cmul(cexp(cscale(cmul(z, z), -1)), csub([1, 0], cerf([y, -x])));
  else {
    let cf = [0, 0];
    for (let n = 50; n >= 1; n--) cf = cdiv([n / 2, 0], csub(z, cf));
    w = cdiv([0, 1 / Math.sqrt(Math.PI)], csub(z, cf));
  }
  if (flip) { const z0 = [-x, -y]; w = csub(cscale(cexp(cscale(cmul(z0, z0), -1)), 2), w); }
  return w;
}
function plasmaZ(z) { return cmul([0, Math.sqrt(Math.PI)], faddeeva(z)); }
function dielectric(omega, k, vth) {
  const zeta = cdiv(omega, [Math.SQRT2 * k * vth, 0]);
  return cadd([1, 0], cscale(cadd([1, 0], cmul(zeta, plasmaZ(zeta))), 1 / (k * k * vth * vth)));
}
function landauRoot(k, vth) {
  const kld = k * vth;
  let wr = Math.sqrt(1 + 3 * kld * kld);
  let wi = -Math.sqrt(Math.PI / 8) * Math.exp(-0.5 / (kld * kld) - 1.5) / (kld * kld * kld);
  if (!(wi < 0) || !Number.isFinite(wi)) wi = -0.05;
  let w = [wr, wi];
  for (let it = 0; it < 60; it++) {
    const h = 1e-8, e0 = dielectric(w, k, vth), ep = dielectric([w[0] + h, w[1]], k, vth);
    const fp = [(ep[0] - e0[0]) / h, (ep[1] - e0[1]) / h];
    const dw = cdiv(e0, fp); w = csub(w, dw);
    if (cabs(dw) < 1e-14) break;
  }
  return { omegaReal: w[0], gamma: w[1], residual: cabs(dielectric(w, k, vth)), kLambdaD: kld };
}
assert(Math.abs(plasmaZ([0, 0])[1] - Math.sqrt(Math.PI)) < 1e-14);
assert(Math.abs(plasmaZ([1, 0])[0] + 1.0761590138255366) < 1e-12);
assert(Math.abs(plasmaZ([1, 0])[1] - 0.6520493321732922) < 1e-12);
{
  const c = landauRoot(1, 0.5);
  assert(Math.abs(c.omegaReal - 1.4156618886045365) < 1e-10);
  assert(Math.abs(c.gamma + 0.15335946690960522) < 1e-10);
}

const MODE = 1, VTH = 0.4, AMP = 0.03, K = MODE;
assert.equal(K, 1);
const theory = landauRoot(K, VTH);
assert(theory.residual < 1e-12 && theory.gamma < 0);
const WINDOW = { t0: 2, t1: 12 }, PASS_REL = 0.15;

function modeAmp(sim, mode = MODE) {
  const M = sim.grid; let c = 0, s = 0;
  for (let j = 0; j < M; j++) {
    const x = (j + 0.5) * L / M;
    c += sim.field[j] * Math.cos(mode * x);
    s += sim.field[j] * Math.sin(mode * x);
  }
  return Math.hypot(c, s) / M;
}
function evolve(opts) {
  const sim = A.makeSim(config(opts)), hist = [];
  for (let i = 0; i <= opts.steps; i++) {
    if (i) sim.advance(1);
    if (sim.halted) break;
    hist.push({ t: sim.time, Ek: modeAmp(sim), U: sim.electric });
  }
  return { sim, hist };
}
function peaks(hist, key) {
  const out = [];
  for (let i = 2; i < hist.length - 2; i++) {
    if (hist[i][key] > hist[i - 1][key] && hist[i][key] > hist[i + 1][key] &&
        hist[i][key] >= hist[i - 2][key] && hist[i][key] >= hist[i + 2][key]) out.push(hist[i]);
  }
  return out;
}
function fitEnvelope(peakList, t0, t1, key, scale = 1) {
  const sel = peakList.filter(p => p.t >= t0 && p.t <= t1 && p[key] > 0);
  if (sel.length < 3) return null;
  let st = 0, sy = 0, stt = 0, sty = 0;
  for (const p of sel) { const y = Math.log(p[key]); st += p.t; sy += y; stt += p.t * p.t; sty += p.t * y; }
  const n = sel.length, den = n * stt - st * st;
  const slope = (n * sty - st * sy) / den, intercept = (sy - slope * st) / n;
  let ss = 0, mean = sy / n, sst = 0;
  for (const p of sel) { const y = Math.log(p[key]); ss += (y - intercept - slope * p.t) ** 2; sst += (y - mean) ** 2; }
  return {
    gamma: slope / scale, logAmplitude: intercept, n, r2: 1 - ss / Math.max(sst, 1e-30),
    rmsLog: Math.sqrt(ss / n), t0, t1, peaks: sel.map(p => ({ t: p.t, value: p[key] })),
  };
}
function measure(opts, window) {
  const { sim, hist } = evolve(opts);
  const pE = peaks(hist, 'Ek').filter(p => p.t > 0.5);
  const pU = peaks(hist, 'U').filter(p => p.t > 0.5);
  return {
    sim, hist,
    fitE: fitEnvelope(pE, window.t0, window.t1, 'Ek'),
    fitU: fitEnvelope(pU, window.t0, window.t1, 'U', 2),
  };
}

const base = { beam: 0, thermal: VTH, amplitude: AMP, mode: MODE };

// Primary
const primary = measure({ n: 131072, grid: 256, dt: 0.015, steps: 800, seed: 'ld-r2', ...base }, WINDOW);
assert(primary.fitE, 'Primary envelope fit failed');
assert.equal(primary.sim.halted, '');
const gammaNum = primary.fitE.gamma;
const relativeError = Math.abs(gammaNum - theory.gamma) / Math.abs(theory.gamma);
assert(relativeError < PASS_REL, `Primary relative error ${relativeError} exceeds ${PASS_REL}`);
assert(primary.fitE.r2 > 0.9, 'Primary envelope fit is not exponential');

// Refinement
const refinement = [];
for (const plan of [
  { n: 32768, grid: 128, dt: 0.02, steps: 700, seed: 'ld-r0' },
  { n: 65536, grid: 256, dt: 0.02, steps: 700, seed: 'ld-r1' },
  { n: 131072, grid: 256, dt: 0.015, steps: 800, seed: 'ld-r2' },
  { n: 262144, grid: 512, dt: 0.015, steps: 800, seed: 'ld-r3' },
]) {
  const m = measure({ ...plan, ...base }, WINDOW);
  assert(m.fitE, `Refinement fit failed at N=${plan.n}`);
  refinement.push({
    particles: plan.n, cells: plan.grid, dt: plan.dt, steps: plan.steps, seed: plan.seed,
    gammaNum: m.fitE.gamma,
    gammaFromEnergyEnvelope: m.fitU ? m.fitU.gamma : null,
    relativeError: Math.abs(m.fitE.gamma - theory.gamma) / Math.abs(theory.gamma),
    r2: m.fitE.r2, peakCount: m.fitE.n, window: WINDOW,
  });
}
assert(refinement[2].relativeError < PASS_REL && refinement[3].relativeError < PASS_REL,
  'Finest two refinements must approach theory within tolerance');

// Multi-seed fine mean
const seedGammas = [];
for (let s = 0; s < 4; s++) {
  const m = measure({ n: 262144, grid: 512, dt: 0.015, steps: 800, seed: 'ld-seed-' + s, ...base }, WINDOW);
  assert(m.fitE, 'Seed fit failed');
  seedGammas.push(m.fitE.gamma);
}
const seedMean = seedGammas.reduce((a, b) => a + b, 0) / seedGammas.length;
const seedMeanRel = Math.abs(seedMean - theory.gamma) / Math.abs(theory.gamma);
assert(seedMeanRel < 0.2, `Multi-seed mean relative error ${seedMeanRel} too large`);

// Failure: cold (Landau γ→0)
const cold = measure({ n: 65536, grid: 256, dt: 0.02, steps: 500, seed: 'ld-cold', beam: 0, thermal: 0, amplitude: AMP, mode: MODE }, { t0: 1, t1: 10 });
assert(cold.fitE, 'Cold envelope fit failed');
const coldRel = Math.abs(cold.fitE.gamma - theory.gamma) / Math.abs(theory.gamma);
assert(Math.abs(cold.fitE.gamma) < 0.25 * Math.abs(theory.gamma), 'Cold run should be nearly undamped');
assert(coldRel > 0.5, 'Cold run must fail the warm Landau-rate claim');

// Failure: trapping
const trap = measure({ n: 131072, grid: 256, dt: 0.02, steps: 500, seed: 'ld-trap', beam: 0, thermal: VTH, amplitude: 0.35, mode: MODE }, WINDOW);
assert(trap.fitE, 'Trapping envelope fit failed');
const trapRel = Math.abs(trap.fitE.gamma - theory.gamma) / Math.abs(theory.gamma);
assert(trapRel > PASS_REL, 'Large-amplitude trapping must reject the linear-rate test');

// Failure: flipped force
const badText = source.replaceAll('v[i] -= .5 * dt * gather', 'v[i] += .5 * dt * gather');
assert.notEqual(badText, source);
const Bad = load(badText);
const flipSim = Bad.makeSim(config({ n: 65536, grid: 256, beam: 0, thermal: VTH, amplitude: AMP, mode: MODE, dt: 0.02, seed: 'ld-flip' }));
const flipHist = [];
const u0 = flipSim.electric;
let maxU = u0;
for (let i = 0; i <= 200 && !flipSim.halted; i++) {
  if (i) flipSim.advance(1);
  flipHist.push({ t: flipSim.time, Ek: modeAmp(flipSim), U: flipSim.electric });
  maxU = Math.max(maxU, flipSim.electric);
}
const flipPeaks = peaks(flipHist, 'Ek').filter(p => p.t > 0.3);
const flipFit = flipPeaks.length >= 3 ? fitEnvelope(flipPeaks, 0.5, Math.min(4, flipHist.at(-1).t), 'Ek') : null;
const flipGrewOrHalted = flipSim.halted !== '' || maxU > 2 * Math.max(u0, 1e-12) || (flipFit && flipFit.gamma > 0);
assert(flipGrewOrHalted, 'Flipped force escaped detection');
if (flipFit && Number.isFinite(flipFit.gamma)) {
  assert(Math.abs(flipFit.gamma - theory.gamma) / Math.abs(theory.gamma) > PASS_REL,
    'Flipped force must not match Landau damping');
}

const check05 = landauRoot(1, 0.5);
const result = {
  sourceSha256: sha256(source),
  rngSha256: sha256(rngSource),
  harnessSha256: sha256(fs.readFileSync(__filename)),
  command: 'node tools/plasma-landau-science.js > validation/results/plasma-landau-science.json',
  scope: 'Periodic normalized 1D1V CIC Maxwellian Langmuir wave (beam=0, thermal>0, mode-1, k=1): independent plasma-Z Landau root vs early-time |E_k| envelope fit on the actual plasma.js solver; particle/grid refinement; cold, trapping, and flipped-force failure controls.',
  formula: {
    dielectric: 'ε(ω,k)=1+(1/(k²λ_D²))[1+ζ Z(ζ)]=0',
    zeta: 'ζ=ω/(√2 k v_th)',
    plasmaZ: 'Z(ζ)=i√π w(ζ), w=Faddeeva=exp(-ζ²)erfc(-iζ)',
    vth: 'v_th = thermal = Maxwellian velocity stddev σ in plasma.js; λ_D=v_th/ω_p=thermal (ω_p=1)',
    k: 'k=mode=1 on L=2π',
    fieldTime: 'E_k(t) ~ exp(γ t) cos(ω_r t+φ); γ=Im(ω)<0 for damping under e^{-iωt}',
  },
  fixture: {
    beam: 0, thermal: VTH, amplitude: AMP, mode: MODE, k: K, L,
    kLambdaD: theory.kLambdaD,
    vthDefinition: 'thermal = Maxwellian velocity stddev σ; λ_D = σ/ω_p = thermal',
  },
  theory: {
    omegaReal: theory.omegaReal,
    gamma: theory.gamma,
    residual: theory.residual,
    kLambdaD: theory.kLambdaD,
    verifyZ0: plasmaZ([0, 0]),
    verifyZ1: plasmaZ([1, 0]),
    verifyRootKld05: check05,
  },
  primary: {
    particles: 131072, cells: 256, dt: 0.015, steps: 800, seed: 'ld-r2', window: WINDOW,
    gammaTheory: theory.gamma,
    gammaNum,
    relativeError,
    r2: primary.fitE.r2,
    gammaFromEnergyEnvelope: primary.fitU ? primary.fitU.gamma : null,
    peaks: primary.fitE.peaks,
    peakCount: primary.fitE.n,
  },
  refinement,
  multiSeedFine: {
    particles: 262144, cells: 512, seeds: seedGammas.length,
    gammas: seedGammas, mean: seedMean, relativeError: seedMeanRel,
  },
  failureControls: {
    coldPlasma: {
      thermal: 0, gammaNum: cold.fitE.gamma, relativeErrorVsWarmTheory: coldRel,
      nearlyUndamped: Math.abs(cold.fitE.gamma) < 0.25 * Math.abs(theory.gamma),
      warmRateClaimRejected: coldRel > 0.5, peaks: cold.fitE.peaks,
    },
    largeAmplitudeTrapping: {
      amplitude: 0.35, gammaNum: trap.fitE.gamma, relativeError: trapRel,
      linearRateClaimRejected: trapRel > PASS_REL, peaks: trap.fitE.peaks,
    },
    flippedForceSign: {
      halted: flipSim.halted,
      maxElectricOverInitial: maxU / Math.max(u0, 1e-12),
      gammaNum: flipFit ? flipFit.gamma : null,
      detected: flipGrewOrHalted,
    },
  },
  acceptance: { primaryRelativeErrorBelow: PASS_REL, finestTwoRefinementsBelow: PASS_REL, multiSeedMeanBelow: 0.2 },
  seconds: (performance.now() - started) / 1000,
  limitations: 'Finite-N sampling noise and early-time transient limit γ accuracy; fit window avoids nonlinear trapping. One kλ_D, electrostatic 1D1V, no collisions/EM/ions/experiments. Seed dependence remains; multi-seed mean documents scatter. Not a general stability map.',
};
assert(Number.isFinite(result.primary.gammaNum) && Number.isFinite(result.theory.gamma));
assert(result.failureControls.coldPlasma.warmRateClaimRejected);
assert(result.failureControls.largeAmplitudeTrapping.linearRateClaimRejected);
assert(result.failureControls.flippedForceSign.detected);
console.log(JSON.stringify(result, null, 2));
