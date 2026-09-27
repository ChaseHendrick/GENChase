// node tools/closed-forms-science.js [--write]
//
// Precision checks of three closed-form plates against independent formulas.
// These are precision checks of exact expressions, not confirmed predictions.
// crapper and airy are loaded with tools/science-harness.js. orbitals lives in
// src/modules/dynamics.js, so its Laguerre helpers are hooked directly.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { load } = require('./science-harness');

const root = path.resolve(__dirname, '..');
const PI = Math.PI;
const outPath = path.join(root, 'validation/results/closed-forms-science.json');
const failures = [];
const fail = (why) => { failures.push(why); };

function gamma(z) {
  // Lanczos, g = 7. Used only to build Ai(0) and Ai'(0) for the Airy series.
  const p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return PI / (Math.sin(PI * z) * gamma(1 - z));
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
const AI0 = Math.pow(3, -2 / 3) / gamma(2 / 3);
const AIP = -Math.pow(3, -1 / 3) / gamma(1 / 3);

// Independent real Airy series. Not the module's RK4.
function airySeries(z) {
  let f = 1, g = z, sf = 1, sg = z;
  const z3 = z * z * z;
  for (let k = 0; k < 120; k++) {
    f *= z3 / ((3 * k + 2) * (3 * k + 3));
    g *= z3 / ((3 * k + 3) * (3 * k + 4));
    sf += f;
    sg += g;
    if (Math.abs(f) + Math.abs(g) < 1e-18 * (Math.abs(sf) + Math.abs(sg) + 1)) break;
  }
  return AI0 * sf + AIP * sg;
}

// Second independent real evaluation: fine RK4 of y'' = x y, not the module's 80 steps.
function airyRK(z, n) {
  if (z === 0) return AI0;
  const h = z / n;
  let f = 1, df = 0, g = 0, dg = 1, x = 0;
  for (let i = 0; i < n; i++) {
    const k1f = df, k1df = x * f, k1g = dg, k1dg = x * g;
    const x2 = x + 0.5 * h;
    const f2 = f + 0.5 * h * k1f, df2 = df + 0.5 * h * k1df;
    const g2 = g + 0.5 * h * k1g, dg2 = dg + 0.5 * h * k1dg;
    const k2f = df2, k2df = x2 * f2, k2g = dg2, k2dg = x2 * g2;
    const f3 = f + 0.5 * h * k2f, df3 = df + 0.5 * h * k2df;
    const g3 = g + 0.5 * h * k2g, dg3 = dg + 0.5 * h * k2dg;
    const k3f = df3, k3df = x2 * f3, k3g = dg3, k3dg = x2 * g3;
    const x4 = x + h;
    const f4 = f + h * k3f, df4 = df + h * k3df;
    const g4 = g + h * k3g, dg4 = dg + h * k3dg;
    const k4f = df4, k4df = x4 * f4, k4g = dg4, k4dg = x4 * g4;
    f += (h / 6) * (k1f + 2 * k2f + 2 * k3f + k4f);
    df += (h / 6) * (k1df + 2 * k2df + 2 * k3df + k4df);
    g += (h / 6) * (k1g + 2 * k2g + 2 * k3g + k4g);
    dg += (h / 6) * (k1dg + 2 * k2dg + 2 * k3dg + k4dg);
    x = x4;
  }
  return AI0 * f + AIP * g;
}

function factI(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function binomI(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
  return r;
}
// Associated Laguerre L_k^{(alpha)}(x), float64, independent of the module.
function laguerreRef(k, alpha, x) {
  let s = 0, p = 1;
  for (let j = 0; j <= k; j++) {
    s += ((j % 2) ? -1 : 1) * binomI(k + alpha, k - j) / factI(j) * p;
    p *= x;
  }
  return s;
}

function steepnessFormula(A) { return 4 * Math.abs(A) / (PI * (1 - A * A)); }

// Catalog / module surface map, transcribed here only as the failure-control variants.
// The subject profile is the module's own posSurf.
function closureOf(profile, A, t) {
  let maxDx = 0, maxDy = 0;
  for (let i = 0; i <= 64; i++) {
    const phi = -0.37 + i / 32;
    const a = profile(phi, t, A);
    const b = profile(phi + 1, t, A);
    maxDx = Math.max(maxDx, Math.abs(b.x - a.x - 1));
    maxDy = Math.max(maxDy, Math.abs(b.y - a.y));
  }
  return { maxDx, maxDy };
}
function crestTrough(profile, A) {
  // Analytic extrema of the catalog trig map sit at theta = 0 and theta = pi.
  const y0 = profile(0, 0, A).y;
  const y1 = profile(0.5, 0, A).y;
  const height = Math.abs(y0 - y1);
  const period = profile(1, 0, A).x - profile(0, 0, A).x;
  return { height, period, s: height / period, yCrest: Math.max(y0, y1), yTrough: Math.min(y0, y1) };
}

// Classical Crapper profile from z_A(alpha) = alpha + 4i/(1 + A e^{-i alpha}) - 4i,
// scaled to period 1. Independent of the plate.
function classical(phi, A) {
  const th = 2 * PI * phi, c = Math.cos(th), sn = Math.sin(th);
  const D = 1 + A * A + 2 * A * c;
  return {
    x: phi - (2 / PI) * A * sn / D,
    y: -(2 / PI) * A * (A + c) / D,
  };
}
// Splash: alpha (1+A^2+2 A cos alpha) = 4 A sin alpha, and the alpha derivative vanishes.
function solveSplash() {
  let A = 0.45, alpha = 2.08;
  for (let it = 0; it < 25; it++) {
    const c = Math.cos(alpha), s = Math.sin(alpha);
    const f = alpha * (1 + A * A + 2 * A * c) - 4 * A * s;
    const fp = 1 + A * A - 2 * A * c - 2 * A * alpha * s;
    const fA = alpha * (2 * A + 2 * c) - 4 * s;
    const fa = fp;
    const fpA = 2 * A - 2 * c - 2 * alpha * s;
    const fpa = -2 * A * alpha * c;
    const det = fA * fpa - fa * fpA;
    A -= (fpa * f - fa * fp) / det;
    alpha -= (-fpA * f + fA * fp) / det;
  }
  const c = Math.cos(alpha), s = Math.sin(alpha);
  const f = alpha * (1 + A * A + 2 * A * c) - 4 * A * s;
  const fp = 1 + A * A - 2 * A * c - 2 * A * alpha * s;
  let ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i <= 8000; i++) {
    const a = 2 * PI * i / 8000, cc = Math.cos(a);
    const y = -4 * A * (A + cc) / (1 + A * A + 2 * A * cc);
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  return { A, alpha, residual: Math.hypot(f, fp), steepness: (ymax - ymin) / (2 * PI), formula: steepnessFormula(A) };
}
function bracketX(profile, A) {
  // Sign change of X(phi) on (0.05, 0.45). Phi = 0 is the trough and is excluded:
  // P(phi) and P(-phi) coincide there for any smooth profile.
  const a0 = 0.05, a1 = 0.45, N = 4000;
  let lo = null, hi = null, prev = profile(a0, 0, A).x, prevPhi = a0;
  let minAbs = Math.abs(prev), minPhi = a0;
  for (let i = 1; i <= N; i++) {
    const phi = a0 + (a1 - a0) * i / N;
    const x = profile(phi, 0, A).x;
    const ax = Math.abs(x);
    if (ax < minAbs) { minAbs = ax; minPhi = phi; }
    if (lo === null && prev * x < 0) { lo = prevPhi; hi = phi; }
    prev = x;
    prevPhi = phi;
  }
  if (lo === null) return { crossed: false, gap: null, phi: null, x: null, minAbs, minPhi };
  for (let it = 0; it < 70; it++) {
    const mid = 0.5 * (lo + hi);
    if (profile(lo, 0, A).x * profile(mid, 0, A).x <= 0) hi = mid;
    else lo = mid;
  }
  const phi = 0.5 * (lo + hi);
  const p = profile(phi, 0, A);
  const q = profile(-phi, 0, A);
  return { crossed: true, phi, x: p.x, y: p.y, gap: Math.hypot(p.x - q.x, p.y - q.y), minAbs, minPhi };
}
// Classical splash function on (0, pi). A tangent touch has no sign change; a crossed bubble has two.
function fSignChanges(A) {
  const f = a => a * (1 + A * A + 2 * A * Math.cos(a)) - 4 * A * Math.sin(a);
  let n = 0, prev = f(1e-6);
  for (let i = 1; i <= 8000; i++) {
    const a = 1e-6 + (PI - 2e-6) * i / 8000;
    const v = f(a);
    if (prev * v < 0) n++;
    prev = v;
  }
  return n;
}
// Surface X_phi at the trough of the implemented map. Zero at A = 3 - 2*sqrt(2).
function plateXp0(A) { return 1 - 4 * A / ((1 - A) * (1 - A)); }

function hookOrbitals() {
  const src = fs.readFileSync(path.join(root, 'src/modules/dynamics.js'), 'utf8');
  const needle = '  /* ---------- Hydrogen Orbitals ---------- */';
  assert.equal(src.split(needle).length, 2, 'orbitals hook point missing');
  const hooked = src.replace(needle, '  Object.assign(hooks, { laguerre, orbital, evalPoly });\n' + needle);
  const hooks = {};
  const Studio = {
    util: { TAU: 2 * PI, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), hexToRgb: () => [0, 0, 0], makeRng: () => () => 0.5 },
    gl: {}, PALETTES: {}, register() {},
  };
  new Function('Studio', 'hooks', hooked)(Studio, hooks);
  return hooks;
}

function evalCoeff(c, x) {
  let s = 0, p = 1;
  for (let i = 0; i < c.length; i++) { s += c[i] * p; p *= x; }
  return s;
}
function radialR(n, l, r, orb) {
  const rho = 2 * r / n;
  return orb.norm * Math.pow(rho, l) * Math.exp(-rho / 2) * evalCoeff(orb.lag, rho);
}
function simpsonRadial(n, l, orb) {
  const rTop = 4 * n * n + 30;
  const N = 8192;
  const h = rTop / N;
  let acc = 0;
  for (let i = 0; i <= N; i++) {
    const r = i * h;
    const f = radialR(n, l, r, orb) ** 2 * r * r;
    const w = (i === 0 || i === N) ? 1 : (i % 2 ? 4 : 2);
    acc += w * f;
  }
  return acc * h / 3;
}

function airyPeaks(ai, state, mode) {
  const aspects = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const W = state.grid, H = Math.max(48, Math.round(state.grid * (aspects[state.aspect] || 1)));
  const L = state.span, a = state.apod;
  const zMax = Math.sqrt(Math.max(0.5, 4 * L * 0.5));
  const rows = [];
  let err = 0, nErr = 0;
  for (let y = 0; y < H; y++) {
    const z = zMax * (y / Math.max(1, H - 1));
    let peakX = 0, peakI = -1;
    for (let x = 0; x < W; x++) {
      const xx = L * (x / Math.max(1, W - 1) - 0.52);
      let arg = xx - z * z / 4;
      if (mode === 'half') arg = xx - z * z / 2;
      if (mode === 'sign') arg = xx + z * z / 4;
      const Ai = ai(arg);
      const env = Math.exp(Math.max(-18, a * xx - a * z * z / 2));
      const I = Ai * Ai * env * env;
      if (I > peakI) { peakI = I; peakX = xx; }
    }
    if (y > H * 0.25 && y < H * 0.9) {
      err += Math.abs(peakX - z * z / 4);
      nErr++;
      rows.push(peakX);
    }
  }
  return { metric: err / Math.max(1, nErr), rows };
}

/* ===================== Crapper ===================== */
const cr = load('crapper', { names: 'sOfA, posSurf, measure, specFrom, A_UNI, A_STAR, S_STAR' });
const H = cr.hooks;
const crapperAs = [0.05, 0.2, 0.36, 0.45, 0.458];
const closureRows = crapperAs.map(A => {
  const c = closureOf(H.posSurf, A, 0.37);
  const ct = crestTrough(H.posSurf, A);
  const formula = steepnessFormula(A);
  const own = H.sOfA(A);
  return { A, maxDx: c.maxDx, maxDy: c.maxDy, sProfile: ct.s, sFormula: formula, sModule: own,
    formulaMinusProfile: formula - ct.s, moduleMinusFormula: own - formula };
});
let closureMax = 0, steepMax = 0;
for (const row of closureRows) {
  closureMax = Math.max(closureMax, row.maxDx, row.maxDy);
  steepMax = Math.max(steepMax, Math.abs(row.formulaMinusProfile), Math.abs(row.moduleMinusFormula));
  if (row.maxDx > 1e-12 || row.maxDy > 1e-12) fail('crapper closure A=' + row.A);
  if (Math.abs(row.formulaMinusProfile) > 1e-12 || Math.abs(row.moduleMinusFormula) > 1e-12) fail('crapper steepness A=' + row.A);
}

const splash = solveSplash();
if (splash.residual > 1e-10) fail('classical splash residual ' + splash.residual);
if (Math.abs(splash.steepness - 0.730) > 0.001) fail('classical s* not within 0.001 of 0.730');
if (Math.abs(splash.steepness - splash.formula) > 1e-12) fail('classical height vs 4|A|/(pi(1-A^2))');

const Auni = 3 - 2 * Math.sqrt(2);
const classProfile = (phi, t, A) => classical(phi, A);
const plate030 = bracketX(H.posSurf, 0.30);
const plate015 = bracketX(H.posSurf, 0.15);
const class030 = bracketX(classProfile, 0.30);
const class046 = bracketX(classProfile, 0.46);
const classSplashX = bracketX(classProfile, splash.A);
const fAt = { A030: fSignChanges(0.30), A046: fSignChanges(0.46), splash: fSignChanges(splash.A) };
const xpAtUni = plateXp0(Auni);
if (!(Math.abs(xpAtUni) < 1e-12)) fail('plate trough derivative should vanish at A = 3-2*sqrt(2)');
if (!(plate030.crossed && plate030.gap < 1e-9)) fail('expected the implemented map to self-intersect at A=0.30');
if (plate015.crossed) fail('implemented map should not cross the symmetry line at A=0.15');
if (class030.crossed || fAt.A030 !== 0 || !(class030.minAbs > 1e-2)) fail('classical profile should still be separated at A=0.30');
if (!(class046.crossed && class046.gap < 1e-8) || fAt.A046 < 1) fail('classical profile should meet near A=0.46');
if (classSplashX.crossed || fAt.splash !== 0 || !(classSplashX.minAbs < 1e-6)) fail('classical limiting wave should be a tangent touch');

const clampA = 0.458;
const clampS = steepnessFormula(clampA);
let mapSep = 0, mapSepPhi = 0;
for (let i = 0; i <= 4000; i++) {
  const phi = i / 4000;
  const p = H.posSurf(phi, 0, 0.2);
  const q = classical(phi, 0.2);
  const d = Math.hypot(p.x - q.x, p.y - q.y);
  if (d > mapSep) { mapSep = d; mapSepPhi = phi; }
}

// Failure controls on mutated copies of the module, and on a wrong steepness formula.
const wrongSteep = crapperAs.map(A => ({ A, wrong: 4 * A / (PI * (1 - A)), profile: crestTrough(H.posSurf, A).s }));
const wrongSteepMiss = Math.min(...wrongSteep.map(r => Math.abs(r.wrong - r.profile)));
if (!(wrongSteepMiss > 1e-3)) fail('wrong steepness 4|A|/(pi(1-A)) did not miss the profile');

const signY = load('crapper', {
  names: 'posSurf',
  mutate: s => s.replace('y: psi - twoPi * B * (c - B) * inv', 'y: psi - twoPi * B * (c + B) * inv'),
});
const signX = load('crapper', {
  names: 'posSurf',
  mutate: s => s.replace('x: phi - twoPi * B * sn * inv', 'x: -phi - twoPi * B * sn * inv'),
});
const signYMiss = Math.abs(crestTrough(signY.hooks.posSurf, 0.2).s - steepnessFormula(0.2));
const signXClose = closureOf(signX.hooks.posSurf, 0.2, 0.2);
if (!(signYMiss > 1e-3)) fail('sign error (cos+A) did not fail the steepness identity');
if (!(signXClose.maxDx > 0.5)) fail('sign error on the linear phi term did not fail closure');

const crapper = {
  label: 'precision check of an exact formula',
  closureMax,
  steepnessIdentityMaxAbs: steepMax,
  rows: closureRows,
  classicalSplash: splash,
  classicalWithin0p001Of0p730: Math.abs(splash.steepness - 0.730) < 0.001,
  pointwiseDistanceAtA0p2: { maxHypot: mapSep, phi: mapSepPhi,
    note: 'Implemented catalog map versus classical z_A, same A, one period. Recorded disagreement. The plate was not retuned.' },
  plateInjectivity: {
    note: 'The implemented catalog map (denominator 1+A^2-2A cos) is a different curve from classical z_A (denominator 1+A^2+2A cos). X_phi at the trough vanishes at A = 3-2*sqrt(2). Above that, the catalog map meets itself on the symmetry line. Classical z_A stays separated until the tangent splash solved above.',
    Auni, steepnessAtAuni: steepnessFormula(Auni), troughXpAtAuni: xpAtUni,
    plateAtA0p30: plate030, plateAtA0p15Crossed: plate015.crossed,
    classicalAtA0p30: { crossed: class030.crossed, minAbsX: class030.minAbs, fSignChanges: fAt.A030 },
    classicalAtA0p46: class046,
    classicalSplashTouch: { crossed: classSplashX.crossed, minAbsX: classSplashX.minAbs, minPhi: classSplashX.minPhi, fSignChanges: fAt.splash },
  },
  clamp: { A: clampA, steepness: clampS, classicalA: splash.A, classicalSteepness: splash.steepness,
    isLimitingWave: false,
    moduleAStarFromHardcoded0p7298: H.A_STAR, moduleHardcodedS: H.S_STAR },
  failureControls: {
    wrongSteepnessMinAbsMiss: wrongSteepMiss,
    signInsideCosMiss: signYMiss,
    linearPhiSignClosureDx: signXClose.maxDx,
    allCaught: wrongSteepMiss > 1e-3 && signYMiss > 1e-3 && signXClose.maxDx > 0.5,
  },
};

/* ===================== Airy ===================== */
const airyMod = load('airy', { capture: 'ai, metric, W, H' });
const airyCases = [
  { span: 12, apod: 0.08, grid: 96, aspect: '4:5', kind: 'int' },
  { span: 10, apod: 0.12, grid: 96, aspect: '1:1', kind: 'int' },
  { span: 14, apod: 0.05, grid: 80, aspect: '16:9', kind: 'int' },
];
let seriesVsRk = 0;
for (let z = -5; z <= 4; z += 0.5) seriesVsRk = Math.max(seriesVsRk, Math.abs(airySeries(z) - airyRK(z, 2000)));
if (seriesVsRk > 1e-9) fail('Airy series and fine RK4 disagree: ' + seriesVsRk);

const aiSample = airyMod.compute({ grid: 32, span: 8, apod: 0.08, aspect: '1:1', kind: 'int' });
let aiErr44 = 0, aiAt = 0;
for (let z = -4; z <= 4; z += 0.05) {
  const e = Math.abs(aiSample.ai(z) - airySeries(z));
  if (e > aiErr44) { aiErr44 = e; aiAt = z; }
}
if (aiErr44 > 1e-6) fail('module ai vs series on [-4,4]: ' + aiErr44);

// Leading asymptotic is what the module uses for z>8. The independent check is the two-term expansion.
function airyAsymptotic(z, terms) {
  const s = Math.sqrt(z), zeta = (2 / 3) * z * s;
  const lead = 0.5 * Math.exp(-zeta) / Math.sqrt(PI * s);
  if (terms < 2) return lead;
  return lead * (1 - (5 / 72) / zeta);
}
const asymRows = [9, 12, 15].map(z => {
  const mod = aiSample.ai(z), two = airyAsymptotic(z, 2), one = airyAsymptotic(z, 1);
  return { z, module: mod, oneTerm: one, twoTerm: two, relToTwoTerm: (mod - two) / two };
});
const tail = { z6: { module: aiSample.ai(6), series: airySeries(6) }, z8: { module: aiSample.ai(8), series: airySeries(8) },
  zMinus10: { module: aiSample.ai(-10), series: airySeries(-10) } };

const peakRows = [];
let peakAgree = 0, halfShift = 0, signShift = 0;
for (const state of airyCases) {
  const mod = airyMod.compute(state);
  const correct = airyPeaks(airySeries, state, 'ok');
  const half = airyPeaks(airySeries, state, 'half');
  const sign = airyPeaks(airySeries, state, 'sign');
  let dMod = 0, dHalf = 0, dSign = 0;
  for (let i = 0; i < correct.rows.length; i++) {
    dHalf = Math.max(dHalf, Math.abs(half.rows[i] - correct.rows[i]));
    dSign = Math.max(dSign, Math.abs(sign.rows[i] - correct.rows[i]));
  }
  // Module metric is the mean |peak x - z^2/4| from its own ai. Compare that scalar and the row peaks via the module ai.
  const modPeaks = airyPeaks(mod.ai, state, 'ok');
  for (let i = 0; i < correct.rows.length; i++) dMod = Math.max(dMod, Math.abs(modPeaks.rows[i] - correct.rows[i]));
  peakAgree = Math.max(peakAgree, dMod, Math.abs(mod.metric - correct.metric));
  halfShift = Math.max(halfShift, dHalf);
  signShift = Math.max(signShift, dSign);
  peakRows.push({
    state, moduleMetric: mod.metric, independentMetric: correct.metric,
    maxPeakDelta: dMod, halfCausticMaxShift: dHalf, signFlipMaxShift: dSign,
  });
  if (dMod > 1e-9) fail('Airy peak disagrees with independent real Ai');
  if (!(dHalf > 1)) fail('z^2/2 caustic did not move the peak');
  if (!(dSign > 1)) fail('Airy argument sign flip did not move the peak');
}

function cmul(u, v) { return [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]]; }
function cdivS(u, s) { return [u[0] / s, u[1] / s]; }
function cabs(u) { return Math.hypot(u[0], u[1]); }
// Same power series as airySeries, evaluated at a complex argument. Not the plate.
function airySeriesComplex(re, im) {
  let f = [1, 0], g = [re, im], sf = [1, 0], sg = [re, im];
  const z3 = cmul([re, im], cmul([re, im], [re, im]));
  for (let k = 0; k < 80; k++) {
    f = cdivS(cmul(f, z3), (3 * k + 2) * (3 * k + 3));
    g = cdivS(cmul(g, z3), (3 * k + 3) * (3 * k + 4));
    sf = [sf[0] + f[0], sf[1] + f[1]];
    sg = [sg[0] + g[0], sg[1] + g[1]];
    if (cabs(f) + cabs(g) < 1e-18 * (cabs(sf) + cabs(sg) + 1)) break;
  }
  return [AI0 * sf[0] + AIP * sg[0], AI0 * sf[1] + AIP * sg[1]];
}
const complexSeriesRealMax = Math.max(...[-2, -1, 0, 1, 2].map(z => Math.abs(airySeriesComplex(z, 0)[0] - airySeries(z))));
if (complexSeriesRealMax > 1e-12) fail('complex Airy series disagrees with the real series');
const complexVsReal = [-2, -1, 0, 1, 2].map(xi => {
  const a = 0.08;
  const cat = cabs(airySeriesComplex(xi, a));
  const real = Math.abs(airySeries(xi));
  return { xi, a, absAiComplex: cat, absAiReal: real, ratio: cat / real };
});
const airy = {
  label: 'precision check of the real-argument Ai the plate actually evaluates, not a complex Ai(x-z^2/4+ia) prediction',
  Ai0: AI0, Aip0: AIP,
  seriesVersusFineRk4MaxAbsOnMinus5To4: seriesVsRk,
  moduleVersusSeriesOnMinus4To4: { maxAbs: aiErr44, at: aiAt },
  tails: { asymRows, samples: tail,
    note: 'For z>8 the plate returns the one-term asymptotic, clipped by exp(-40). At z=6 and z=8 the 80-step RK4 bridge disagrees with the series. The intensity peak sits near Airy argument -1, inside the accurate interval.' },
  peaks: peakRows,
  peakAgreementMax: peakAgree,
  meanOffsetFromZ2over4: peakRows.map(r => r.independentMetric),
  catalogComplexFactorNotEvaluated: true,
  complexArgumentRatio: {
    note: 'Ratio |Ai(xi + i a)| / |Ai(xi)| from the independent series at a=0.08. The plate multiplies real Ai(xi) by exp(a x - a z^2/2). It does not evaluate Ai(xi + i a). A ratio other than 1 is a disagreement with the catalog argument, not a failure of the real evaluator.',
    seriesAgreesOnRealAxis: complexSeriesRealMax,
    rows: complexVsReal,
  },
  failureControls: {
    causticZ2over2MaxPeakShift: halfShift,
    argumentSignFlipMaxPeakShift: signShift,
    allCaught: halfShift > 1 && signShift > 1,
  },
};

/* ===================== Orbitals ===================== */
const orb = hookOrbitals();
const rhoGrid = [];
for (let t = 0; t <= 8; t++) rhoGrid.push(t * 0.25);
let lagMax = 0, lagWhere = null;
const lagCases = [];
for (let n = 1; n <= 6; n++) {
  for (let l = 0; l < n; l++) {
    const k = n - l - 1, alpha = 2 * l + 1;
    const c = orb.laguerre(k, alpha);
    let local = 0;
    for (const x of rhoGrid) {
      const e = Math.abs(evalCoeff(c, x) - laguerreRef(k, alpha, x));
      if (e > local) local = e;
    }
    if (local > lagMax) { lagMax = local; lagWhere = { n, l, k, alpha }; }
    lagCases.push({ n, l, k, alpha, maxAbs: local });
  }
}
// 1e-8 is not met: coefficients are Float32. The passing bar is the measured float32 scale.
if (!(lagMax < 1e-6)) fail('Laguerre float32 error above 1e-6: ' + lagMax);
if (!(lagMax > 1e-8)) fail('expected Float32 Laguerre error above 1e-8 so the stricter bar is not silently claimed');

let wrongKMin = Infinity, wrongAFails = 0, wrongAChecked = 0;
for (let n = 1; n <= 6; n++) {
  for (let l = 0; l < n; l++) {
    const k = n - l - 1, alpha = 2 * l + 1;
    const c = orb.laguerre(k, alpha);
    let miss = 0;
    for (const x of rhoGrid) miss = Math.max(miss, Math.abs(evalCoeff(c, x) - laguerreRef(k + 1, alpha, x)));
    wrongKMin = Math.min(wrongKMin, miss);
    if (k >= 1) {
      wrongAChecked++;
      let missA = 0;
      for (const x of rhoGrid) missA = Math.max(missA, Math.abs(evalCoeff(c, x) - laguerreRef(k, alpha + 1, x)));
      if (missA > 1e-2) wrongAFails++;
    }
  }
}
if (!(wrongKMin > 1e-2)) fail('k+1 Laguerre index did not fail');

const nodeRows = [];
let nodeOk = 0, nodeWrongOk = 0, normMax = 0, normWhere = null;
for (let n = 1; n <= 6; n++) {
  for (let l = 0; l < n; l++) {
    const o = orb.orbital(n, l, 0);
    const expect = n - l - 1;
    const wrong = n - (l + 1) - 1;
    if (o.radialNodes === expect) nodeOk++;
    if (o.radialNodes === wrong) nodeWrongOk++;
    const integral = simpsonRadial(n, l, o);
    const err = Math.abs(integral - 1);
    if (err > normMax) { normMax = err; normWhere = { n, l, integral }; }
    nodeRows.push({ n, l, radialNodes: o.radialNodes, expect, integral });
    if (o.radialNodes !== expect) fail('radial nodes ' + n + ',' + l);
    if (err > 1e-3) fail('radial norm ' + n + ',' + l + ' ' + integral);
  }
}
if (nodeOk !== 21) fail('node count coverage ' + nodeOk);
if (nodeWrongOk !== 0) fail('l+1 node formula did not fail');

const orbitals = {
  label: 'precision check of an exact radial formula',
  measure: 'int_0^inf R(r)^2 r^2 dr in atomic units. The module factors psi = R(r) times an angular factor (anorm, and sqrt(2) for real m>0). This check is only the radial measure.',
  laguerre: { maxAbs: lagMax, where: lagWhere, grid: 'rho = 0, 0.25, ..., 2', nMax: 6,
    under1e8: false, under1e6: lagMax < 1e-6,
    note: 'laguerre() stores coefficients in a Float32Array. Absolute error 1e-8 is not met; the largest miss on this grid is recorded.' },
  nodes: { matched: nodeOk, expectedStates: 21, wrongLplus1Matches: nodeWrongOk },
  norm: { maxAbsError: normMax, where: normWhere, quadrature: 'Simpson, 8192 panels, upper limit 4 n^2 + 30' },
  rows: nodeRows,
  failureControls: {
    wrongLaguerreIndexKplus1MinAbs: wrongKMin,
    alphaPlus1FailsForKAtLeast1: { checked: wrongAChecked, failed: wrongAFails },
    nodeCountWithLplus1Matches: nodeWrongOk,
    allCaught: wrongKMin > 1e-2 && wrongAFails === wrongAChecked && nodeWrongOk === 0,
  },
};

const result = {
  kind: 'precision check of exact formulas, not a confirmed prediction',
  reviewed: '2026-09-27',
  print: 'not run',
  crapper, airy, orbitals,
  passed: failures.length === 0,
  failures,
};
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('closed-forms precision checks passed');
console.log('crapper closure', closureMax, 'steep', steepMax, 'classical s*', splash.steepness, 'A', splash.A);
console.log('airy [-4,4]', aiErr44, 'peak agree', peakAgree, 'half shift', halfShift);
console.log('laguerre', lagMax, 'norm', normMax, 'nodes', nodeOk);
