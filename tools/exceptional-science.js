'use strict';
// Independent 2x2 check of the exceptional-point dimer and its Riemann sheet.
// The plate function ev() is not copied. Eigenpairs come from the characteristic
// polynomial of H = [[i*gamma, kappa], [kappa, -i*gamma]] and a one-row null vector.
// node tools/exceptional-science.js [--write]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { load, replaceOnce, root } = require('./science-harness');

const SHEET_TOL = 1e-6;
const EIG_TOL = 1e-12;
const COALESCE = 1 - 1e-9;

const C = {
  add(a, b) { return { re: a.re + b.re, im: a.im + b.im }; },
  sub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; },
  mul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; },
  scale(a, s) { return { re: a.re * s, im: a.im * s }; },
  conj(a) { return { re: a.re, im: -a.im }; },
  abs(a) { return Math.hypot(a.re, a.im); },
};

// Principal square root. Nonnegative real part, and nonnegative imaginary part on the
// negative-real cut. This is the quadratic-formula branch, not ev()'s real if-split.
function csqrt(z) {
  if (z.re === 0 && z.im === 0) return { re: 0, im: 0 };
  const r = Math.hypot(z.re, z.im);
  const re = Math.sqrt((r + z.re) * 0.5);
  let im = Math.sqrt((r - z.re) * 0.5);
  if (z.im < 0) im = -im;
  return { re, im };
}

function ptMatrix(kappa, gamma) {
  return [
    [{ re: 0, im: gamma }, { re: kappa, im: 0 }],
    [{ re: kappa, im: 0 }, { re: 0, im: -gamma }],
  ];
}

// (2,2) entry flipped from -i*gamma to +i*gamma. Eigenvalues are i*gamma ± kappa.
function flippedMatrix(kappa, gamma) {
  return [
    [{ re: 0, im: gamma }, { re: kappa, im: 0 }],
    [{ re: kappa, im: 0 }, { re: 0, im: gamma }],
  ];
}

function rowNorm(row) { return C.abs(row[0]) + C.abs(row[1]); }

function nullVector(H, lambda) {
  const copy = z => ({ re: z.re, im: z.im });
  const rows = [
    [C.sub(H[0][0], lambda), copy(H[0][1])],
    [copy(H[1][0]), C.sub(H[1][1], lambda)],
  ];
  const ordered = rowNorm(rows[0]) >= rowNorm(rows[1]) ? [rows[0], rows[1]] : [rows[1], rows[0]];
  for (const row of ordered) {
    if (rowNorm(row) === 0) continue;
    // row[0] * v0 + row[1] * v1 = 0. Use the larger entry as the free component.
    const v = C.abs(row[1]) >= C.abs(row[0])
      ? [copy(row[1]), C.scale(row[0], -1)]
      : [C.scale(row[1], -1), copy(row[0])];
    const n = Math.hypot(v[0].re, v[0].im, v[1].re, v[1].im);
    if (n === 0) continue;
    return [C.scale(v[0], 1 / n), C.scale(v[1], 1 / n)];
  }
  return [{ re: 1, im: 0 }, { re: 0, im: 0 }];
}

// Stable 2x2 complex eigensolver: lambda = (tr ± sqrt(tr^2 - 4 det)) / 2.
// values[0] is the principal-square-root root. For the PT dimer that is the
// nonnegative-real eigenvalue below the exceptional point and the nonnegative-
// imaginary eigenvalue above it, which is the branch the sheet stores.
function eig2(H) {
  const a = H[0][0], b = H[0][1], c = H[1][0], d = H[1][1];
  const tr = C.add(a, d);
  const det = C.sub(C.mul(a, d), C.mul(b, c));
  const disc = C.sub(C.mul(tr, tr), C.scale(det, 4));
  const root = csqrt(disc);
  const l1 = C.scale(C.add(tr, root), 0.5);
  const l2 = C.scale(C.sub(tr, root), 0.5);
  return { values: [l1, l2], vectors: [nullVector(H, l1), nullVector(H, l2)], det, tr };
}

function overlap(u, v) {
  const dot = C.add(C.mul(C.conj(u[0]), v[0]), C.mul(C.conj(u[1]), v[1]));
  const nu = Math.hypot(u[0].re, u[0].im, u[1].re, u[1].im);
  const nv = Math.hypot(v[0].re, v[0].im, v[1].re, v[1].im);
  return C.abs(dot) / (nu * nv);
}

function residual(H, lambda, v) {
  const Hv0 = C.add(C.mul(H[0][0], v[0]), C.mul(H[0][1], v[1]));
  const Hv1 = C.add(C.mul(H[1][0], v[0]), C.mul(H[1][1], v[1]));
  const d0 = C.sub(Hv0, C.mul(lambda, v[0]));
  const d1 = C.sub(Hv1, C.mul(lambda, v[1]));
  return Math.hypot(C.abs(d0), C.abs(d1));
}

function separation(l1, l2) {
  return Math.hypot(l1.re - l2.re, l1.im - l2.im);
}

function eigMismatch(got, expect) {
  const dist = (p, q) => Math.hypot(p.re - q.re, p.im - q.im);
  const direct = Math.max(dist(got[0], expect[0]), dist(got[1], expect[1]));
  const swapped = Math.max(dist(got[0], expect[1]), dist(got[1], expect[0]));
  return Math.min(direct, swapped);
}

// Reference eigenvalues from det(H), not from ev(): tr is 0 so lambda^2 = -det,
// and the principal square root is the plate branch.
function referenceBranch(kappa, gamma) {
  const H = ptMatrix(kappa, gamma);
  const det = C.sub(C.mul(H[0][0], H[1][1]), C.mul(H[0][1], H[1][0]));
  assert.ok(Math.abs(det.im) <= 1e-15, 'PT determinant left the real axis');
  return csqrt({ re: -det.re, im: 0 });
}

function pairOf(branch) {
  return [branch, { re: -branch.re, im: -branch.im }];
}

function flippedReference(kappa, gamma) {
  return [
    { re: kappa, im: gamma },
    { re: -kappa, im: gamma },
  ];
}

function matMul(A, B) {
  const out = [[null, null], [null, null]];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    out[i][j] = C.add(C.mul(A[i][0], B[0][j]), C.mul(A[i][1], B[1][j]));
  }
  return out;
}

function maxAbs(H) {
  let m = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) m = Math.max(m, C.abs(H[i][j]));
  return m;
}

function coalesced(value) { return value > COALESCE; }

const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
function sheetSize(grid, aspect) {
  const a = ASPECTS[aspect] || 1;
  return { W: grid, H: Math.max(48, Math.round(grid * a)) };
}

// Same predicate for the real sheet and the sign-flipped failure control.
function sheetError(sample) {
  const { field, W, H } = sample;
  let max = 0, nonfinite = 0, below = 0, above = 0, on = 0;
  let at = null;
  for (let y = 0; y < H; y++) {
    const g = 2.2 * y / Math.max(1, H - 1);
    for (let x = 0; x < W; x++) {
      const k = 0.15 + 2.1 * x / Math.max(1, W - 1);
      const solved = eig2(ptMatrix(k, g));
      const lam = solved.values[0];
      const expect = lam.re + 0.6 * lam.im;
      const got = field[y * W + x];
      if (!Number.isFinite(got) || !Number.isFinite(expect)) nonfinite++;
      const err = Math.abs(got - expect);
      if (err > max) at = { x, y, kappa: k, gamma: g, got, expect, err };
      if (err > max) max = err;
      const d = k * k - g * g;
      if (d > 0) below++;
      else if (d < 0) above++;
      else on++;
    }
  }
  return { max, nonfinite, below, above, on, pixels: field.length, at };
}

function sheetPasses(err) {
  return err.nonfinite === 0 && err.max <= SHEET_TOL;
}

function linspace(a, b, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(a + (b - a) * i / (n - 1));
  return out;
}

function wordChanges(a, b) {
  assert.equal(a.length, b.length);
  const x = new Uint32Array(a.buffer, a.byteOffset, a.length);
  const y = new Uint32Array(b.buffer, b.byteOffset, b.length);
  let changed = 0;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) changed++;
  return changed;
}

function main() {
  const original = fs.readFileSync(path.join(root, 'src/modules/exceptional.js'), 'utf8');
  assert.equal(original.split('const d = k * k - g * g').length, 2, 'ev() discriminant must occur once');
  assert.equal(original.includes('const d = k * k + g * g'), false);

  const real = load('exceptional', { capture: 'field,metric,extra,W,H' });
  const broken = load('exceptional', {
    capture: 'field,metric,extra,W,H',
    mutate: s => replaceOnce(s, 'const d = k * k - g * g', 'const d = k * k + g * g'),
  });

  const cases = [
    { name: 'below', gamma: 0.4, kappa: 1.2, grid: 160, aspect: '1:1', kind: 'sheet', phase: 'exact' },
    { name: 'ep', gamma: 1, kappa: 1, grid: 160, aspect: '1:1', kind: 'sheet', phase: 'exceptional' },
    { name: 'above', gamma: 1.6, kappa: 0.8, grid: 96, aspect: '4:5', kind: 'sheet', phase: 'broken' },
    { name: 'axis', gamma: 0, kappa: 0.2, grid: 224, aspect: '16:9', kind: 'sheet', phase: 'exact' },
    { name: 'top', gamma: 2.2, kappa: 2, grid: 128, aspect: '5:4', kind: 'sheet', phase: 'broken' },
  ];

  const rows = [];
  for (const c of cases) {
    const sample = real.compute(c);
    const size = sheetSize(c.grid, c.aspect);
    assert.equal(sample.W, size.W);
    assert.equal(sample.H, size.H);
    assert.equal(sample.field.length, size.W * size.H);
    const err = sheetError(sample);
    const H = ptMatrix(c.kappa, c.gamma);
    const solved = eig2(H);
    const branch = referenceBranch(c.kappa, c.gamma);
    const eigErr = eigMismatch(solved.values, pairOf(branch));
    const res = Math.max(
      residual(H, solved.values[0], solved.vectors[0]),
      residual(H, solved.values[1], solved.vectors[1]),
    );
    const split = separation(solved.values[0], solved.values[1]);
    const metricErr = Math.abs(sample.metric - split);
    const extraExpect = c.gamma / Math.max(0.05, c.kappa);
    assert.ok(sheetPasses(err), c.name + ' sheet failed: ' + JSON.stringify(err.at));
    assert.ok(eigErr < EIG_TOL, c.name + ' dimer eigenvalue error ' + eigErr);
    assert.ok(res < EIG_TOL, c.name + ' dimer residual ' + res);
    assert.ok(metricErr < EIG_TOL, c.name + ' metric ' + sample.metric + ' vs ' + split);
    assert.ok(Math.abs(sample.extra - extraExpect) < 1e-15, c.name + ' extra');
    const imag = Math.max(Math.abs(solved.values[0].im), Math.abs(solved.values[1].im));
    const realPart = Math.max(Math.abs(solved.values[0].re), Math.abs(solved.values[1].re));
    if (c.phase === 'exceptional') {
      assert.equal(sample.metric, 0);
      assert.ok(realPart < EIG_TOL && imag < EIG_TOL);
    } else if (c.phase === 'exact') {
      assert.ok(sample.metric > 0.2);
      assert.ok(imag < EIG_TOL && realPart > 0.1);
    } else {
      assert.ok(sample.metric > 0.2);
      assert.ok(realPart < EIG_TOL && imag > 0.1);
    }
    rows.push({
      name: c.name,
      gamma: c.gamma,
      kappa: c.kappa,
      gammaOverKappa: sample.extra,
      grid: [sample.W, sample.H],
      phase: c.phase,
      metric: sample.metric,
      splitting: split,
      metricError: metricErr,
      eigenvalueError: eigErr,
      residual: res,
      sheet: {
        maxAbsError: err.max,
        nonfinite: err.nonfinite,
        pixels: err.pixels,
        exactPT: err.below,
        brokenPT: err.above,
        onEP: err.on,
        worst: err.at,
      },
    });
  }

  const belowField = real.compute(cases[0]).field;
  const epField = real.compute(cases[1]).field;
  const sheetWordsIndependentOfDimer = wordChanges(belowField, epField);
  assert.equal(sheetWordsIndependentOfDimer, 0, 'sheet pixels must not depend on the dimer sliders');
  assert.notEqual(rows[0].metric, rows[1].metric);

  // Eigenvectors on a lattice covering the sheet ranges kappa in [0.15, 2.25], gamma in [0, 2.2].
  const kappas = linspace(0.15, 2.25, 43);
  const gammas = linspace(0, 2.2, 45);
  let maxEig = 0, maxRes = 0, points = 0;
  let maxOverlap = 0, minOverlap = Infinity;
  for (const kappa of kappas) for (const gamma of gammas) {
    const H = ptMatrix(kappa, gamma);
    const solved = eig2(H);
    const err = eigMismatch(solved.values, pairOf(referenceBranch(kappa, gamma)));
    const res = Math.max(
      residual(H, solved.values[0], solved.vectors[0]),
      residual(H, solved.values[1], solved.vectors[1]),
    );
    const ov = overlap(solved.vectors[0], solved.vectors[1]);
    if (err > maxEig) maxEig = err;
    if (res > maxRes) maxRes = res;
    if (ov > maxOverlap) maxOverlap = ov;
    if (ov < minOverlap) minOverlap = ov;
    points++;
  }
  assert.ok(maxEig < EIG_TOL, 'grid eigenvalue error ' + maxEig);
  assert.ok(maxRes < EIG_TOL, 'grid residual ' + maxRes);

  const epKappas = [0.15, 0.5, 1, 1.6, 2.2];
  const epOverlaps = [];
  for (const kappa of epKappas) {
    const H = ptMatrix(kappa, kappa);
    const solved = eig2(H);
    const ov = overlap(solved.vectors[0], solved.vectors[1]);
    const H2 = matMul(H, H);
    const detAbs = C.abs(solved.det);
    const entry = maxAbs(H);
    const eigAbs = Math.max(C.abs(solved.values[0]), C.abs(solved.values[1]));
    const nil = maxAbs(H2);
    assert.ok(entry > 0.1, 'EP matrix vanished at kappa ' + kappa);
    assert.ok(detAbs < EIG_TOL, 'EP determinant ' + detAbs);
    assert.ok(nil < EIG_TOL, 'EP not nilpotent, H^2 entry ' + nil);
    assert.ok(eigAbs < EIG_TOL, 'EP eigenvalues ' + eigAbs);
    assert.ok(coalesced(ov), 'EP overlap ' + ov + ' at kappa ' + kappa);
    // Rank 1: singular and not the zero matrix, so the kernel is one-dimensional.
    assert.ok(detAbs < EIG_TOL && entry > 0);
    epOverlaps.push({
      kappa,
      gamma: kappa,
      overlap: ov,
      eigenvalueAbs: eigAbs,
      detAbs,
      maxEntry: entry,
      maxH2Entry: nil,
      geometricMultiplicity: 1,
    });
  }

  const wellBelow = { kappa: 1.5, gamma: 0 };
  const belowSolved = eig2(ptMatrix(wellBelow.kappa, wellBelow.gamma));
  const belowOverlap = overlap(belowSolved.vectors[0], belowSolved.vectors[1]);
  assert.ok(belowOverlap < 0.2, 'well below EP overlap ' + belowOverlap);
  const mild = { kappa: 1.5, gamma: 0.2 };
  const mildOverlap = overlap(eig2(ptMatrix(mild.kappa, mild.gamma)).vectors[0], eig2(ptMatrix(mild.kappa, mild.gamma)).vectors[1]);
  assert.ok(mildOverlap < 0.2, 'mild below EP overlap ' + mildOverlap);

  const near = eig2(ptMatrix(1, 0.999));
  const nearOverlap = overlap(near.vectors[0], near.vectors[1]);
  const justAbove = eig2(ptMatrix(1, 1.001));
  const justAboveOverlap = overlap(justAbove.vectors[0], justAbove.vectors[1]);

  // Failure control 1: sign error in ev() removes the exceptional point from the sheet.
  // The mutated field is scored with the same independent comparison as the real field.
  const mutated = broken.compute({ gamma: 1, kappa: 1, grid: 160, aspect: '1:1', kind: 'sheet' });
  const mutatedErr = sheetError(mutated);
  assert.ok(sheetPasses(rows[1] && { max: rows[1].sheet.maxAbsError, nonfinite: rows[1].sheet.nonfinite }), 'real sheet predicate');
  assert.equal(sheetPasses({ max: rows.find(r => r.name === 'ep').sheet.maxAbsError, nonfinite: 0 }), true);
  assert.equal(sheetPasses(mutatedErr), false, 'sign error must fail the sheet predicate');
  assert.ok(mutatedErr.max > 0.1, 'sign error max pixel error ' + mutatedErr.max + ' did not exceed 0.1');

  // Failure control 2: flipping (2,2) from -i*gamma to +i*gamma destroys coalescence.
  // Same overlap predicate: true on the PT exceptional point, false on the flipped matrix.
  let flippedMaxEig = 0, flippedMaxOverlap = 0, flippedMinSep = Infinity, flippedPoints = 0;
  const flippedEP = [];
  for (const kappa of kappas) for (const gamma of gammas) {
    const H = flippedMatrix(kappa, gamma);
    const solved = eig2(H);
    const err = eigMismatch(solved.values, flippedReference(kappa, gamma));
    const ov = overlap(solved.vectors[0], solved.vectors[1]);
    if (err > flippedMaxEig) flippedMaxEig = err;
    if (ov > flippedMaxOverlap) flippedMaxOverlap = ov;
    flippedPoints++;
  }
  assert.ok(flippedMaxEig < EIG_TOL, 'flipped eigenvalue error ' + flippedMaxEig);
  for (const kappa of epKappas) {
    const solved = eig2(flippedMatrix(kappa, kappa));
    const ov = overlap(solved.vectors[0], solved.vectors[1]);
    const sep = separation(solved.values[0], solved.values[1]);
    const sepErr = Math.abs(sep - 2 * kappa);
    assert.ok(sepErr < EIG_TOL, 'flipped separation ' + sep + ' at kappa ' + kappa);
    assert.ok(sep > 0.2);
    assert.equal(coalesced(ov), false, 'flipped matrix coalesced at kappa ' + kappa);
    assert.ok(ov < 0.25, 'flipped overlap ' + ov);
    if (sep < flippedMinSep) flippedMinSep = sep;
    flippedEP.push({ kappa, gamma: kappa, overlap: ov, separation: sep, separationError: sepErr, eigenvalues: solved.values });
  }
  assert.equal(coalesced(epOverlaps.find(r => r.kappa === 1).overlap), true);
  assert.equal(coalesced(flippedEP.find(r => r.kappa === 1).overlap), false);

  const result = {
    pass: true,
    date: '2026-09-27',
    source: 'src/modules/exceptional.js',
    sourceSha256: real.sourceSha256,
    harnessSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    command: 'node tools/exceptional-science.js --write',
    model: 'H = [[i*gamma, kappa], [kappa, -i*gamma]], lambda = ± principal sqrt(kappa^2 - gamma^2). Sheet pixel is Re(lambda) + 0.6*Im(lambda) with kappa = 0.15 + 2.1*x/(W-1), gamma = 2.2*y/(H-1). Dimer metric is |lambda+ - lambda-| = 2*sqrt(|kappa^2 - gamma^2|), extra is gamma/kappa.',
    criteria: {
      sheetAbsTolerance: SHEET_TOL,
      eigenvalueAbsTolerance: EIG_TOL,
      exceptionalOverlap: 'greater than 1 - 1e-9 at gamma = kappa',
      belowOverlap: 'less than 0.2 well below the exceptional point',
      failureSheet: 'mutated discriminant k*k + g*g must exceed 0.1 absolute pixel error on the same predicate',
      failureCoalescence: 'flipped (2,2) entry +i*gamma has eigenvalues i*gamma ± kappa and overlap bounded below 0.25',
    },
    rows,
    sheetWordsIndependentOfDimer,
    spectrum: {
      points,
      kappa: [0.15, 2.25],
      gamma: [0, 2.2],
      maxEigenvalueError: maxEig,
      maxResidual: maxRes,
      minOverlap: minOverlap,
      maxOverlap: maxOverlap,
    },
    exceptionalPoint: {
      overlaps: epOverlaps,
      wellBelow: { ...wellBelow, overlap: belowOverlap },
      mildBelow: { ...mild, overlap: mildOverlap },
      nearBelow: { kappa: 1, gamma: 0.999, overlap: nearOverlap },
      justAbove: { kappa: 1, gamma: 1.001, overlap: justAboveOverlap },
    },
    failureControls: {
      signError: {
        mutation: 'const d = k * k - g * g  ->  const d = k * k + g * g',
        realPasses: true,
        realMaxAbsError: rows.find(r => r.name === 'ep').sheet.maxAbsError,
        mutatedPasses: false,
        mutatedMaxAbsError: mutatedErr.max,
        mutatedNonfinite: mutatedErr.nonfinite,
        worst: mutatedErr.at,
      },
      flippedDiagonal: {
        matrix: '[[i*gamma, kappa], [kappa, i*gamma]]',
        points: flippedPoints,
        maxEigenvalueError: flippedMaxEig,
        maxOverlap: flippedMaxOverlap,
        minSeparationAtEP: flippedMinSep,
        atEP: flippedEP,
        realEPCoalesced: true,
        flippedEPCoalesced: false,
      },
    },
    limitations: 'The modes view is two Gaussians, not the eigenvectors, and is not compared. The gap view is outside this pixel check. This is the 2x2 dimer only: not a many-body PT system and not a laboratory exceptional point. Eigenvectors coalesce only at gamma = kappa; off that point the overlap is smaller, including in the broken phase.',
  };

  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/exceptional-science.json'), JSON.stringify(result, null, 2) + '\n');
  }
  const ep = rows.find(r => r.name === 'ep');
  console.log(JSON.stringify({
    pass: true,
    sheetMax: Math.max(...rows.map(r => r.sheet.maxAbsError)),
    eigMax: maxEig,
    residualMax: maxRes,
    epOverlap: epOverlaps.find(r => r.kappa === 1).overlap,
    belowOverlap,
    mildOverlap,
    nearOverlap,
    justAboveOverlap,
    signError: mutatedErr.max,
    flippedOverlapAt1: flippedEP.find(r => r.kappa === 1).overlap,
    flippedSepAt1: flippedEP.find(r => r.kappa === 1).separation,
    flippedMaxOverlap,
    epMetric: ep.metric,
    aboveMetric: rows.find(r => r.name === 'above').metric,
  }, null, 2));
}

main();
