'use strict';

// On-axis Fresnel check for Poisson's spot. The subject is this quadrature, not the
// plate's fixed 24 by 18 sum. Run: node tools/arago-science.js [--write]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { load, root } = require('./science-harness');

const TOL = 1e-3;
// Same predicate for the disk and the aperture. The aperture must fail it.
function acceptsOpenBeam(ratio) {
  return Math.abs(ratio - 1) < TOL;
}

// Midpoint rule in rho. Open beam and disk carry exp(-eps rho^2); the aperture is
// the finite integral and is left undamped. Zones are split on the edge rho = R.
function radial(dr, alpha, eps, R, tail) {
  const rhoMax = Math.ceil(Math.sqrt(tail / eps) / dr) * dr;
  const nZones = Math.round(rhoMax / dr);
  const nEdge = Math.round(R / dr);
  assert.equal(nEdge * dr, R, 'disk edge is not on a zone boundary');
  let oRe = 0, oIm = 0, dRe = 0, dIm = 0, aRe = 0, aIm = 0;
  for (let n = 0; n < nZones; n++) {
    const rho = (n + 0.5) * dr;
    const phase = alpha * rho * rho;
    const c = Math.cos(phase), s = Math.sin(phase);
    const w = Math.exp(-eps * rho * rho) * rho * dr;
    oRe += w * c;
    oIm += w * s;
    if (n >= nEdge) {
      dRe += w * c;
      dIm += w * s;
    } else {
      const bare = rho * dr;
      aRe += bare * c;
      aIm += bare * s;
    }
  }
  const openI = oRe * oRe + oIm * oIm;
  const diskI = dRe * dRe + dIm * dIm;
  const apertureI = aRe * aRe + aIm * aIm;
  return {
    dr, eps, rhoMax, nZones, nEdge, nDisk: nZones - nEdge,
    diskRatio: diskI / openI,
    apertureRatio: apertureI / openI,
  };
}

// R = 1, z = 1, k = 5 pi. Then k R^2 / (4 z) = 5 pi / 4 and 4 sin^2 of that is 2,
// while the Fresnel number R^2 k / (2 pi z) is 2.5. Not a one-cycle toy, and not
// the special radius whose aperture integral vanishes.
const R = 1, z = 1, k = 5 * Math.PI;
const alpha = k / (2 * z);
const eps = 1e-4;
const tail = 40;
const theta = k * R * R / (4 * z);
const apertureClosed = 4 * Math.sin(theta) ** 2;
const fresnelNumber = R * R * k / (2 * Math.PI * z);

const ladder = [0.004, 0.002, 0.001, 0.0005].map(dr => radial(dr, alpha, eps, R, tail));
const converged = ladder.find(row => row.dr === 0.0005);
const coarser = ladder.find(row => row.dr === 0.002);
assert(converged && coarser, 'missing sampling rows');

assert(acceptsOpenBeam(converged.diskRatio), 'converged disk missed the open beam: ' + converged.diskRatio);
assert(!acceptsOpenBeam(coarser.diskRatio), 'coarser disk still passed; the check cannot fail');
assert(Math.abs(coarser.diskRatio - 1) > Math.abs(converged.diskRatio - 1), 'refinement did not improve the disk');
assert(Math.abs(coarser.diskRatio - 1) > 1e-2, 'coarser disk is not clearly worse');

assert(Math.abs(converged.apertureRatio - apertureClosed) < 1e-4, 'aperture quadrature missed 4 sin^2: ' + converged.apertureRatio);
assert(!acceptsOpenBeam(converged.apertureRatio), 'aperture passed the disk predicate');
// A missing factor of 4 would land on sin^2 = 1/2, which is not this integral.
assert(Math.abs(converged.apertureRatio - Math.sin(theta) ** 2) > 0.5, 'aperture matched sin^2 without the factor 4');

// Same zone width, convergence factor ten times stronger. The bias exp(-2 eps R^2)
// then sits near 0.002, outside the tolerance. The predicate is not automatic.
const strong = radial(0.0005, alpha, 1e-3, R, tail);
assert(!acceptsOpenBeam(strong.diskRatio), 'strong convergence factor still looked like the open beam');
assert(Math.abs(strong.apertureRatio - apertureClosed) < 1e-4, 'strong-factor run spoiled the aperture');

const source = fs.readFileSync(path.join(root, 'src/modules/arago.js'), 'utf8');
assert(source.includes('const nPhi = 24, nRad = 18'), 'plate quadrature is no longer 24 by 18; update this record');

const plate = load('arago', { capture: 'field,metric,F,W,H' });
function plateRun(state) {
  const sample = plate.compute(state);
  assert(sample.field && sample.field.length === sample.W * sample.H, 'plate field was not filled');
  assert(Number.isFinite(sample.metric) && sample.metric > 0, 'plate metric was not a positive number');
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < sample.field.length; i++) {
    const v = sample.field[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  assert(Number.isFinite(lo) && Number.isFinite(hi) && hi > lo, 'plate field was flat or nonfinite');
  return { metric: sample.metric, F: sample.F, W: sample.W, H: sample.H, fieldMin: lo, fieldMax: hi, cells: sample.field.length };
}
const shipped = plateRun();
const probe96 = plateRun({ radius: 20, z: 0.8, k: 1.2, grid: 96 });
const probe160 = plateRun({ radius: 20, z: 0.8, k: 1.2, grid: 160 });
// I(0)/I_ring is not I(0)/I_open. These three numbers must not be treated as the identity.
for (const row of [shipped, probe96, probe160]) assert(Math.abs(row.metric - 1) > 0.2, 'plate metric fell inside the converged tolerance; re-review the plate');
assert(Math.abs(probe96.F - (20 * 20 * 1.2) / (2 * Math.PI * 0.8)) < 1e-9, 'probe Fresnel number moved');
assert(Math.abs(probe96.F - 95.5) < 0.1, 'probe is no longer the F ~ 95 case');
assert(Math.max(probe96.metric, probe160.metric) - Math.min(probe96.metric, probe160.metric) > 0.3, 'plate metric did not move when the grid changed');

const result = {
  sourceSha256: plate.sourceSha256,
  model: 'paraxial Fresnel on-axis integral of a unit-amplitude plane wave',
  validatedObject: 'independent radial midpoint quadrature',
  notValidated: 'src/modules/arago.js 24 by 18 angular sum, compared with a ring',
  parameters: { k, R, z, alpha, fresnelNumber, theta, apertureClosedForm: apertureClosed },
  quadrature: {
    rule: 'midpoint in rho',
    convergenceFactor: 'exp(-eps rho^2)',
    eps,
    tail: 'eps rho_max^2 = 40',
    acceptance: '|I(0)/I_open(0) - 1| < 1e-3',
    regularizationRatio: Math.exp(-2 * eps * R * R),
    note: 'The acceptance target is 1, the undamped identity. The convergence factor alone moves the exact ratio to exp(-2 eps R^2), about 0.9998, which is inside the tolerance. The quadrature does not use the radial antiderivative.',
  },
  disk: {
    converged: { ...converged, absError: Math.abs(converged.diskRatio - 1), passes: true },
    coarser: { ...coarser, absError: Math.abs(coarser.diskRatio - 1), passes: false },
    ladder: ladder.map(row => ({ dr: row.dr, nZones: row.nZones, rhoMax: row.rhoMax, diskRatio: row.diskRatio, absError: Math.abs(row.diskRatio - 1), passes: acceptsOpenBeam(row.diskRatio) })),
  },
  aperture: {
    dr: converged.dr,
    nEdge: converged.nEdge,
    ratio: converged.apertureRatio,
    closedForm: apertureClosed,
    absError: Math.abs(converged.apertureRatio - apertureClosed),
    passesDiskPredicate: false,
  },
  strongConvergenceFactor: {
    eps: 1e-3,
    dr: strong.dr,
    nZones: strong.nZones,
    rhoMax: strong.rhoMax,
    diskRatio: strong.diskRatio,
    absError: Math.abs(strong.diskRatio - 1),
    passes: false,
    apertureRatio: strong.apertureRatio,
  },
  plate: {
    nPhi: 24,
    nRad: 18,
    comparison: 'I(0)/I_ring',
    outsideConvergedClaim: true,
    shippedDefaults: shipped,
    probe: {
      radius: 20, z: 0.8, k: 1.2,
      grid96: probe96,
      grid160: probe160,
    },
  },
  pass: true,
  limitations: [
    'The interactive plate uses a fixed 24 by 18 angular quadrature and compares I(0) to a ring; that number is not this proof.',
    'No laboratory photometry.',
    'No print path. The plate picture was not changed.',
  ],
};

const out = path.join(root, 'validation/results/arago-science.json');
if (process.argv.includes('--write')) fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
