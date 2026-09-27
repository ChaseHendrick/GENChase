// London disk: the module's Jacobi update against I0, plus a sign-flipped failure control.
// node tools/meissner-science.js [--write]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { load, replaceOnce, root } = require('./science-harness');

// Independent modified-Bessel I0. Power series, all terms positive, stopped at 1e-18 relative.
function besselI0(z) {
  const q = z * z / 4;
  let term = 1, sum = 1;
  for (let k = 1; k < 800; k++) {
    term *= q / (k * k);
    sum += term;
    if (term < 1e-18 * sum) break;
  }
  return sum;
}

function analyze(sample, R, lam) {
  const { field, W, H, metric, extra } = sample;
  const cx = W / 2, cy = H / 2, inv = 1 / (lam * lam), I0R = besselI0(R / lam);
  let sse = 0, n = 0, maxErr = 0, resMax = 0, truncMax = 0, truncN = 0;
  const interior = (x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const rad = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (rad >= R) continue;
      const exact = besselI0(rad / lam) / I0R;
      const v = field[y * W + x];
      const e = Math.abs(v - exact);
      sse += e * e; n++;
      if (e > maxErr) maxErr = e;
      if (interior(x + 1, y) && interior(x - 1, y) && interior(x, y + 1) && interior(x, y - 1)) {
        const lap = field[y * W + x + 1] + field[y * W + x - 1] + field[(y + 1) * W + x] + field[(y - 1) * W + x] - 4 * v;
        resMax = Math.max(resMax, Math.abs(lap - v * inv));
      }
      if (rad < R - 3) {
        const at = (dx, dy) => besselI0(Math.hypot(x + 0.5 + dx - cx, y + 0.5 + dy - cy) / lam) / I0R;
        const lap = at(1, 0) + at(-1, 0) + at(0, 1) + at(0, -1) - 4 * exact;
        truncMax = Math.max(truncMax, Math.abs(lap - exact * inv));
        truncN++;
      }
    }
  }
  return {
    rms: Math.sqrt(sse / n), maxErr, residual: resMax, truncation: truncMax, truncCells: truncN, cells: n,
    center: metric, plateBessel: extra, theoryCenter: 1 / I0R,
  };
}

const good = load('meissner', { capture: 'field,metric,extra,W,H' });
const flipped = load('meissner', {
  capture: 'field,metric,extra,W,H',
  mutate: s => replaceOnce(s,
    'nB[i] = B[i] + 0.2 * (lap - B[i] * (1 / (lam * lam)));',
    'nB[i] = B[i] + 0.2 * (lap + B[i] * (1 / (lam * lam)));'),
});

// Same physical disk (R/λ = 2). Finer runs use more cells per λ, which is the mesh size.
const plan = [
  { R: 16, lam: 8, grid: 96, relax: 8000 },
  { R: 32, lam: 16, grid: 96, relax: 22000 },
  { R: 48, lam: 24, grid: 160, relax: 45000 },
];
const cases = plan.map(spec => {
  const sample = good.compute({ grid: spec.grid, aspect: '1:1', lambda: spec.lam, R: spec.R, relax: spec.relax, seed: 'meissner-science' });
  const row = analyze(sample, spec.R, spec.lam);
  assert(row.residual < 1e-6, 'not relaxed: ' + JSON.stringify({ spec, residual: row.residual }));
  assert(Math.abs(row.plateBessel - row.theoryCenter) < 1e-12, 'plate I0 disagrees with the independent series');
  return { ...spec, ...row };
});

for (let i = 1; i < cases.length; i++) {
  assert(cases[i].maxErr < cases[i - 1].maxErr, 'global error did not fall under refinement');
  const href = cases[i - 1].lam / cases[i].lam;
  const order = Math.log(cases[i - 1].maxErr / cases[i].maxErr) / Math.log(1 / href);
  const truncRatio = cases[i - 1].truncation / cases[i].truncation;
  cases[i].observedOrder = order;
  cases[i].truncationRatio = truncRatio;
  // Interior stencil on the exact I0 is finer than h^2. The solved field is limited by the
  // staircased rim, so its observed order is near 1, not 2. Both have to be what this mesh does.
  assert(truncRatio > (cases[i].lam / cases[i - 1].lam) ** 2, 'interior truncation is not falling at least as h^2');
  assert(order > 0.8 && order < 1.6, 'solved-field order left the staircased-boundary range: ' + order);
}
assert(cases[cases.length - 1].maxErr < 0.02, 'finest disk is not within 0.02 of I0: ' + cases[cases.length - 1].maxErr);

const badSpec = { R: 16, lam: 8, grid: 96, relax: 8000 };
const bad = analyze(flipped.compute({
  grid: badSpec.grid, aspect: '1:1', lambda: badSpec.lam, R: badSpec.R, relax: badSpec.relax, seed: 'meissner-science',
}), badSpec.R, badSpec.lam);
assert(bad.maxErr > 0.2, 'sign-flipped London update still matched I0');
assert(bad.maxErr > 10 * cases[0].maxErr, 'failure control did not separate from the real update');

const result = {
  pass: true,
  date: '2026-09-27',
  tool: 'tools/meissner-science.js',
  command: 'node tools/meissner-science.js --write',
  sourceSha256: good.sourceSha256,
  benchmark: 'B(r) = I0(r/λ) / I0(R/λ) on a disk with B = 1 for r >= R. The series for I0 is independent of the plate. The field is the module Jacobi update, iterated until the discrete residual is below 1e-6, which is far under the discretization error.',
  schemeOrder: 'The 5-point stencil applied to the exact I0, three cells inside the rim, falls faster than h^2. The solved field approaches I0 more slowly: the rim is a staircase, so the global error is about first order in the cell size. Both rates are measured. This is not a claim that the default 90-sweep plate has reached either.',
  cases: cases.map(c => ({
    R: c.R, lambda: c.lam, grid: c.grid, relax: c.relax, cells: c.cells,
    rms: c.rms, maxErr: c.maxErr, residual: c.residual, truncation: c.truncation,
    observedOrder: c.observedOrder || null, truncationRatio: c.truncationRatio || null,
    center: c.center, theoryCenter: c.theoryCenter,
  })),
  failureControl: {
    change: 'the update lap - B/λ^2 was replaced by lap + B/λ^2, which is ∇²B = -B/λ^2',
    spec: badSpec,
    maxErr: bad.maxErr,
    rms: bad.rms,
    passedRealCheck: false,
    note: 'The same I0 acceptance the real update meets is failed by more than an order of magnitude.',
  },
  limitations: [
    'Pixel disk, Dirichlet data on the staircase r >= R, cell size 1. Not a cut-cell or polar mesh.',
    'The clamp at 0 is part of the module update. The exact I0 profile is positive, so the clamp is idle on the real runs.',
    'Default relax of 90 sweeps is outside this domain: the plate has not converged at the slider default.',
    'No physical λ in metres and no Meissner experiment. The check is the London boundary-value problem.',
  ],
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/meissner-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
