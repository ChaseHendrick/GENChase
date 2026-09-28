// Independent checks of Crapper's classical profile. Calls the module's own map.
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const PI = Math.PI, TAU = 2 * PI;

function load() {
  const source = fs.readFileSync(path.join(root, 'src/modules/crapper.js'), 'utf8');
  const hooks = {}, marker = '  Studio.register({';
  assert.equal(source.split(marker).length, 2);
  const Studio = {
    util: { TAU, clamp: (x, a, b) => Math.max(a, Math.min(b, x)), makeRng: () => () => 0.5 },
    PALETTES: {},
    register() {},
  };
  new Function('Studio', 'hooks', source.replace(marker, '  Object.assign(hooks,{crapperMap});\n' + marker))(Studio, hooks);
  assert.equal(typeof hooks.crapperMap, 'function');
  return { map: hooks.crapperMap, source, sourceSha256: crypto.createHash('sha256').update(source).digest('hex') };
}

// Private copy of the classical surface and its interior, denominator 1+A^2+2A cos.
function independent(phi, psi, A) {
  const B = A * Math.exp(TAU * psi);
  const th = TAU * phi, c = Math.cos(th), sn = Math.sin(th);
  const D = 1 + B * B + 2 * B * c, k = 2 / PI;
  return { x: phi - k * B * sn / D, y: psi - k * B * (B + c) / D };
}

function steepnessFormula(A) {
  const a = Math.abs(A);
  return 4 * a / (PI * (1 - a * a));
}

// Limiting amplitude from the Hur-Wheeler maximum, not from inverting s* = 0.7298.
function limiting() {
  const f = a => 2 * Math.sin(a) / a - Math.cos(a);
  const fp = a => 2 * (a * Math.cos(a) - Math.sin(a)) / (a * a) + Math.sin(a);
  const fpp = a => {
    const u = a * Math.cos(a) - Math.sin(a), up = -a * Math.sin(a);
    return 2 * (up * a * a - u * 2 * a) / (a ** 4) + Math.cos(a);
  };
  let alpha = 2.08;
  for (let k = 0; k < 30; k++) alpha -= fp(alpha) / fpp(alpha);
  const F = f(alpha);
  const A = F - Math.sqrt(F * F - 1);
  return { alpha, A, delta: alpha / TAU, steepness: steepnessFormula(A) };
}

function branchGap(map, profile, A, delta) {
  const p = map(1 - delta, 0, A, profile), q = map(delta, 0, A, profile);
  const dx = p.x - q.x - 1, dy = p.y - q.y;
  return { dx, dy, distance: Math.hypot(dx, dy) };
}

function tangents(map, profile, A, delta) {
  const h = 1e-6;
  const d = phi => {
    const a = map(phi - h, 0, A, profile), b = map(phi + h, 0, A, profile);
    return { xp: (b.x - a.x) / (2 * h), yp: (b.y - a.y) / (2 * h) };
  };
  const d1 = d(delta), d2 = d(1 - delta);
  const n1 = Math.hypot(d1.xp, d1.yp), n2 = Math.hypot(d2.xp, d2.yp);
  const cross = d1.xp * d2.yp - d1.yp * d2.xp;
  const dot = d1.xp * d2.xp + d1.yp * d2.yp;
  return { sin: cross / (n1 * n2), dot: dot / (n1 * n2) };
}

function sampledSteepness(map, profile, A) {
  const N = 4000;
  let ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i <= N; i++) {
    const y = map(i / N, 0, A, profile).y;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  const period = map(1, 0, A, profile).x - map(0, 0, A, profile).x;
  return { measured: (ymax - ymin) / period, ymin, ymax, period };
}

function closureError(map, profile) {
  let dx = 0, dy = 0;
  for (const A of [0.07, 0.2, 0.36, 0.45]) for (const phi of [0, 0.13, 0.5, 0.81]) for (const psi of [0, -0.04, -0.2]) {
    const p = map(phi, psi, A, profile), q = map(phi + 1, psi, A, profile);
    dx = Math.max(dx, Math.abs(q.x - p.x - 1));
    dy = Math.max(dy, Math.abs(q.y - p.y));
  }
  return { dx, dy };
}

function formulaError(map) {
  let e = 0;
  for (const A of [0.07, 0.2, 0.36, 0.45]) for (const phi of [0, 0.17, 0.5, 0.83]) for (const psi of [0, -0.05, -0.22]) {
    const a = map(phi, psi, A, 'classical'), b = independent(phi, psi, A);
    e = Math.max(e, Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }
  return e;
}

function troughSlope(map, profile, A) {
  const h = 1e-7;
  return (map(h, 0, A, profile).x - map(-h, 0, A, profile).x) / (2 * h);
}

// Amplitude where the flipped curve's second meeting with the trough line sits on y = 0.
function flippedStillWater(map) {
  const xAt = (A, phi) => map(phi, 0, A, 'flipped').x;
  function neckPhi(A) {
    let prev = xAt(A, 0.002), lo = null, hi = null;
    for (let i = 1; i <= 2000; i++) {
      const phi = 0.002 + 0.48 * i / 2000, xv = xAt(A, phi);
      if (prev * xv <= 0) { lo = phi - 0.48 / 2000; hi = phi; break; }
      prev = xv;
    }
    if (lo == null) return null;
    for (let k = 0; k < 60; k++) {
      const m = (lo + hi) / 2;
      if (xAt(A, lo) * xAt(A, m) <= 0) hi = m; else lo = m;
    }
    return (lo + hi) / 2;
  }
  let lo = 0.2, hi = 0.4;
  for (let k = 0; k < 50; k++) {
    const m = (lo + hi) / 2;
    if (map(neckPhi(m), 0, m, 'flipped').y < 0) lo = m; else hi = m;
  }
  const A = (lo + hi) / 2;
  return { A, steepness: steepnessFormula(A), y: map(neckPhi(A), 0, A, 'flipped').y };
}

const { map, source, sourceSha256 } = load();
assert(source.includes("legacy: { 7: { profile: 'flipped' } }"), 'missing legacy flipped profile');

const closure = closureError(map, 'classical');
assert(closure.dx < 1e-12 && closure.dy < 1e-12, JSON.stringify(closure));
const formulaMaxAbs = formulaError(map);
assert(formulaMaxAbs < 1e-12, formulaMaxAbs);

const steepness = [];
for (const A of [0.07, 0.2, 0.36, 0.45]) {
  const row = sampledSteepness(map, 'classical', A);
  const expected = steepnessFormula(A);
  const absErr = Math.abs(row.measured - expected);
  assert(absErr < 1e-10 && Math.abs(row.period - 1) < 1e-12, absErr);
  steepness.push({ A, measured: row.measured, expected, absErr });
}
const flippedSteep = sampledSteepness(map, 'flipped', 0.3);
assert(Math.abs(flippedSteep.measured - steepnessFormula(0.3)) < 1e-10, 'flipped steepness identity');

const lim = limiting();
assert(lim.A > 0.454 && lim.A < 0.456 && lim.steepness > 0.729 && lim.steepness < 0.731, JSON.stringify(lim));
const gapAt = branchGap(map, 'classical', lim.A, lim.delta);
const gapBelow = branchGap(map, 'classical', lim.A - 1e-4, lim.delta);
const gapAbove = branchGap(map, 'classical', lim.A + 1e-4, lim.delta);
const tangent = tangents(map, 'classical', lim.A, lim.delta);
assert(gapAt.distance < 1e-9, JSON.stringify(gapAt));
assert(gapBelow.dx < -1e-5 && gapAbove.dx > 1e-5, 'signed gap did not open through the touch');
assert(Math.abs(tangent.sin) < 1e-6 && tangent.dot < -0.999, JSON.stringify(tangent));
const sampledAtLimit = sampledSteepness(map, 'classical', lim.A);
assert(Math.abs(sampledAtLimit.measured - lim.steepness) < 1e-9);

function accepts(profile) {
  const g = branchGap(map, profile, lim.A, lim.delta);
  const s = sampledSteepness(map, profile, lim.A).measured;
  return lim.A > 0.454 && lim.A < 0.456 && s > 0.729 && s < 0.731 && g.distance < 1e-6;
}
assert.equal(accepts('classical'), true);

const flippedGap = branchGap(map, 'flipped', lim.A, lim.delta);
const flippedSteepAtLimit = sampledSteepness(map, 'flipped', lim.A).measured;
assert.equal(accepts('flipped'), false, 'flipped sign must fail the self-intersection check');
assert(flippedGap.distance > 0.2, flippedGap.distance);
assert(Math.abs(flippedSteepAtLimit - lim.steepness) < 1e-9, 'steepness alone must not distinguish the sign');

const overturnA = 3 - 2 * Math.sqrt(2);
const flippedTroughSlope = troughSlope(map, 'flipped', overturnA);
const classicalTroughSlope = troughSlope(map, 'classical', overturnA);
assert(Math.abs(flippedTroughSlope) < 1e-8, flippedTroughSlope);
assert(Math.abs(classicalTroughSlope) > 0.1, classicalTroughSlope);
const neck = flippedStillWater(map);
assert(neck.A > 0.29 && neck.A < 0.31 && (neck.A < 0.454 || neck.A > 0.456), neck.A);

const result = {
  sourceSha256,
  scope: 'The module map in node: classical profile at sampled phases and a few depths. Not the plate, the canvas, or the print path.',
  closure,
  formulaMaxAbs,
  steepness,
  selfIntersection: {
    alphaStar: lim.alpha,
    A: lim.A,
    steepness: lim.steepness,
    sampledSteepness: sampledAtLimit.measured,
    gapAt, gapBelow, gapAbove, tangent,
    accepts: true,
  },
  failureControl: {
    profile: 'flipped',
    accepts: false,
    gapAtAnalyticTouch: flippedGap,
    steepnessAtAnalyticA: flippedSteepAtLimit,
    steepnessAtA03: flippedSteep.measured,
    troughOverturnA: overturnA,
    flippedTroughSlope,
    classicalTroughSlopeAtSameA: classicalTroughSlope,
    stillWaterCrossingA: neck.A,
    stillWaterCrossingSteepness: neck.steepness,
  },
  limitations: [
    'Calls the module map in node. Does not run the plate, the canvas, or the print path.',
    'Steepness 4|A|/(pi(1-A^2)) holds for both signs. The sign is tested by the self-intersection.',
    'The touch amplitude is the Hur-Wheeler maximum, not the module preset that inverts the rounded steepness 0.7298.',
    'No full parameter domain and no review date.',
  ],
  pass: true,
};
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/crapper-science.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
