'use strict';
const assert = require('node:assert/strict');
function sshHamiltonian(N, v, w, { periodic = false, scramble = false, reversePattern = false, rng = Math.random } = {}) {
  assert(N % 2 === 0 && N >= 4, 'N must be even and >= 4');
  const H = Array.from({ length: N }, () => new Float64Array(N));
  for (let i = 0; i < N - 1; i++) {
    let t;
    if (scramble) {
      t = rng() < 0.5 ? v : w;
    } else if (reversePattern) {
      t = (i % 2 === 0) ? w : v;
    } else {
      t = (i % 2 === 0) ? v : w;
    }
    H[i][i + 1] = t;
    H[i + 1][i] = t;
  }
  if (periodic) {
    const t = scramble ? (rng() < 0.5 ? v : w) : (reversePattern ? v : w);
    H[0][N - 1] = t;
    H[N - 1][0] = t;
  }
  return H;
}

function analyticBulkEnergies(v, w, M) {
  const out = [];
  for (let m = 0; m < M; m++) {
    const k = (2 * Math.PI * m) / M;
    const e = Math.sqrt(v * v + w * w + 2 * v * w * Math.cos(k));
    out.push(e, -e);
  }
  return out.sort((a, b) => a - b);
}

function jacobiEigen(H, { tol = 1e-14, maxSweeps = 80 } = {}) {
  const n = H.length;
  const A = H.map((row) => Float64Array.from(row));
  const V = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(n);
    row[i] = 1;
    return row;
  });
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (Math.sqrt(2 * off) < tol * (1 + Math.hypot(...Array.from({ length: n }, (_, i) => A[i][i])))) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) < tol) continue;
        const app = A[p][p], aqq = A[q][q];
        const tau = (aqq - app) / (2 * apq);
        const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t), s = t * c;
        for (let i = 0; i < n; i++) {
          if (i === p || i === q) continue;
          const aip = A[i][p], aiq = A[i][q];
          A[i][p] = A[p][i] = c * aip - s * aiq;
          A[i][q] = A[q][i] = s * aip + c * aiq;
        }
        A[p][p] = app - t * apq;
        A[q][q] = aqq + t * apq;
        A[p][q] = A[q][p] = 0;
        for (let i = 0; i < n; i++) {
          const vip = V[i][p], viq = V[i][q];
          V[i][p] = c * vip - s * viq;
          V[i][q] = s * vip + c * viq;
        }
      }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => A[i][i] - A[j][j]);
  const values = order.map((i) => A[i][i]);
  const vectors = order.map((j) => Float64Array.from({ length: n }, (_, i) => V[i][j]));
  return { values, vectors };
}

function endWeight(psi, fraction = 0.1) {
  const n = psi.length;
  const edge = Math.max(1, Math.floor(n * fraction));
  let end = 0, total = 0;
  for (let i = 0; i < n; i++) {
    const p = psi[i] * psi[i];
    total += p;
    if (i < edge || i >= n - edge) end += p;
  }
  return end / (total || 1);
}

function midGapPair(values, vectors) {
  const ranked = values.map((e, i) => ({ e, i, abs: Math.abs(e) })).sort((a, b) => a.abs - b.abs);
  return [ranked[0], ranked[1]].map(({ e, i }) => ({ energy: e, vector: vectors[i], endWeight: endWeight(vectors[i]) }));
}

function gapFromSpectrum(values) {
  let neg = -Infinity, pos = Infinity;
  for (const e of values) {
    if (e < 0) neg = Math.max(neg, e);
    if (e > 0) pos = Math.min(pos, e);
  }
  if (!Number.isFinite(neg) || !Number.isFinite(pos)) return 0;
  return pos - neg;
}

function bulkGapExcludingMidGap(values) {
  const ranked = values.map((e, i) => ({ e, i, abs: Math.abs(e) })).sort((a, b) => a.abs - b.abs);
  const drop = new Set([ranked[0].i, ranked[1].i]);
  const rest = values.filter((_, i) => !drop.has(i));
  return gapFromSpectrum(rest);
}

function maxAbsDiff(a, b) {
  assert.equal(a.length, b.length);
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

function meanAbsDiffSorted(a, b) {
  const aa = Float64Array.from(a).sort(), bb = Float64Array.from(b).sort();
  let s = 0;
  for (let i = 0; i < aa.length; i++) s += Math.abs(aa[i] - bb[i]);
  return s / aa.length;
}

function analyticLeftEdge(N, v, w) {
  const row = new Float64Array(N);
  const ratio = -v / w;
  let nrm = 0;
  for (let j = 0; j < N / 2; j++) {
    const a = Math.pow(ratio, j);
    row[2 * j] = a;
    nrm += a * a;
  }
  const inv = 1 / Math.sqrt(nrm || 1);
  for (let i = 0; i < N; i++) row[i] *= inv;
  return row;
}

function overlapAbs(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return Math.abs(s);
}



// Groups of consecutive eigenvalues closer than tol. Inside a group the eigenvectors are not unique, so
// the comparison below sums |psi|^2 over the group (the diagonal of its projector), which every basis
// agrees on; a nondegenerate mode is its own group and is compared row by row.
function clusters(values, tol) {
  const out = [];
  for (let a = 0; a < values.length;) {
    let b = a;
    while (b + 1 < values.length && values[b + 1] - values[b] <= tol) b++;
    out.push([a, b]);
    a = b + 1;
  }
  return out;
}

// The studio's own solver (src/modules/ssh.js: spectrum, midGap, verdict) against this file's independent
// Jacobi reference, on every registered preset. `studio` is passed in by tools/ssh-science.js, which
// evaluates the module source; nothing here is shared with the module.
function compareStudio(studio) {
  const EXPECT = { default: 'edge modes', topo: 'edge modes', edge: 'edge modes', log: 'edge modes', triv: 'trivial', ring: 'ring', crit: 'crossover' };
  const presets = [['default', studio.DEFAULTS], ...Object.entries(studio.PRESETS).map(([k, p]) => [k, Object.assign({}, studio.DEFAULTS, p.p)])];
  const runs = presets.map(([name, p]) => ({ name, N: 96, v: p.vIntra, w: p.w, periodic: p.bc === 'periodic', expect: EXPECT[name] }));
  // Critical again on a longer chain: its localisation length (18.5 cells) no longer spans the chain.
  runs.push({ name: 'crit-160', N: 160, v: 0.9, w: 0.95, periodic: false, expect: 'edge modes' });
  const cases = [];
  for (const c of runs) {
    assert(c.expect, 'no expected verdict for preset ' + c.name);
    const { N, v, w, periodic } = c;
    const mod = studio.spectrum(N, v, w, periodic);
    const H = sshHamiltonian(N, v, w, { periodic });
    const ref = jacobiEigen(H);
    const eigenvalueError = maxAbsDiff(mod.values, ref.values);
    let residual = 0, orthonormality = 0, mirror = 0;
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < N; i++) {
        let hx = 0;
        for (let j = 0; j < N; j++) hx += H[i][j] * mod.vectors[k * N + j];
        residual = Math.max(residual, Math.abs(hx - mod.values[k] * mod.vectors[k * N + i]));
        mirror = Math.max(mirror, Math.abs(mod.density[k * N + i] - mod.density[k * N + N - 1 - i]));
      }
      for (let l = k; l < N; l++) {
        let dot = 0;
        for (let i = 0; i < N; i++) dot += mod.vectors[k * N + i] * mod.vectors[l * N + i];
        orthonormality = Math.max(orthonormality, Math.abs(dot - (k === l ? 1 : 0)));
      }
    }
    const groups = clusters(ref.values, 1e-8);
    let densityError = 0;
    for (const [a, b] of groups) {
      for (let i = 0; i < N; i++) {
        let m = 0, r = 0;
        for (let k = a; k <= b; k++) { m += mod.density[k * N + i]; r += ref.vectors[k][i] * ref.vectors[k][i]; }
        densityError = Math.max(densityError, Math.abs(m - r));
      }
    }
    const mid = studio.midGap(mod);
    const pair = midGapPair(ref.values, ref.vectors);
    const referenceEndWeight = 0.5 * (pair[0].endWeight + pair[1].endWeight);
    const referenceMidGapAbs = Math.max(Math.abs(pair[0].energy), Math.abs(pair[1].energy));
    const verdict = studio.verdict(mod, mid);
    assert(eigenvalueError < 1e-10, c.name + ' eigenvalues ' + eigenvalueError);
    assert(residual < 1e-12, c.name + ' residual ' + residual);
    assert(orthonormality < 1e-12, c.name + ' orthonormality ' + orthonormality);
    assert(densityError < 1e-9, c.name + ' densities ' + densityError);
    assert(mirror < 1e-10, c.name + ' mirror symmetry ' + mirror);
    assert(Math.abs(mid.endWeight - referenceEndWeight) < 1e-9, c.name + ' end weight');
    assert(Math.abs(mid.energy - referenceMidGapAbs) < 1e-10, c.name + ' mid-gap energy');
    assert(verdict.startsWith(c.expect), c.name + ' verdict "' + verdict + '", expected ' + c.expect);
    cases.push({
      preset: c.name, N, v, w, boundary: periodic ? 'periodic' : 'open', degenerateGroups: groups.filter(([a, b]) => b > a).length,
      eigenvalueError, residual, orthonormality, densityError, mirrorSymmetryError: mirror,
      endWeight: mid.endWeight, referenceEndWeight, midGapAbs: mid.energy, referenceMidGapAbs,
      analyticBulkGap: 2 * Math.abs(w - v), verdict,
    });
  }
  const controls = [];
  // Swap the hoppings of every edge-mode preset: the same solver and the same verdict must now read trivial.
  for (const name of ['topo', 'edge', 'log']) {
    const p = Object.assign({}, studio.DEFAULTS, studio.PRESETS[name].p);
    const mod = studio.spectrum(96, p.w, p.vIntra, false);
    const mid = studio.midGap(mod), verdict = studio.verdict(mod, mid);
    controls.push({ name: 'swapped-hoppings-' + name, v: p.w, w: p.vIntra, endWeight: mid.endWeight, midGapAbs: mid.energy, verdict,
      separated: verdict === 'trivial' && mid.endWeight < 0.35 });
  }
  // The eigenvalue comparison must be able to miss: a reference chain terminated on the wrong bond.
  {
    const mod = studio.spectrum(96, 0.4, 1.2, false);
    const wrong = jacobiEigen(sshHamiltonian(96, 0.4, 1.2, { periodic: false, reversePattern: true }));
    const eigenvalueError = maxAbsDiff(mod.values, wrong.values);
    controls.push({ name: 'reference-with-reversed-termination', eigenvalueError, separated: eigenvalueError > 0.1 });
  }
  // The density comparison must be able to miss: the retired display heuristic, which put the analytic
  // left zero mode on every row of a topological plate.
  {
    const N = 96, v = 0.4, w = 1.2;
    const ref = jacobiEigen(sshHamiltonian(N, v, w, { periodic: false }));
    const row = new Float64Array(N);
    let norm = 0;
    for (let j = 0; j < N / 2; j++) { row[2 * j] = (v / w) ** (2 * j); norm += row[2 * j]; }
    let densityError = 0;
    for (const [a, b] of clusters(ref.values, 1e-8)) {
      for (let i = 0; i < N; i++) {
        let r = 0;
        for (let k = a; k <= b; k++) r += ref.vectors[k][i] * ref.vectors[k][i];
        densityError = Math.max(densityError, Math.abs((b - a + 1) * row[i] / norm - r));
      }
    }
    controls.push({ name: 'retired-heuristic-densities', densityError, separated: densityError > 0.1 });
  }
  assert(controls.every(f => f.separated), 'studio failure controls must separate');
  return {
    criteria: {
      eigenvalueMaxError: 1e-10, residualMax: 1e-12, orthonormalityMax: 1e-12,
      densityMaxErrorSummedOverDegenerateGroups: 1e-9, degenerateGroupTolerance: 1e-8, mirrorSymmetryMax: 1e-10,
      endWeightMaxError: 1e-9, midGapEnergyMaxError: 1e-10, verdictMatchesExpectation: true, failureControlsMustSeparate: true,
    },
    cases, failureControls: controls,
  };
}

function runScience(sourceSha256, studio) {
// ---------- poteto-mode: deliberate failure controls first ----------
const failures = [];
{
  const N = 40, v = 0.8, w = 0.8;
  const open = jacobiEigen(sshHamiltonian(N, v, w, { periodic: false }));
  const ring = jacobiEigen(sshHamiltonian(N, v, w, { periodic: true }));
  const openGap = gapFromSpectrum(open.values);
  const ringGap = gapFromSpectrum(ring.values);
  const pair = midGapPair(open.values, open.vectors);
  const meanEnd = 0.5 * (pair[0].endWeight + pair[1].endWeight);
  const analyticGap = 2 * Math.abs(w - v);
  assert(analyticGap === 0);
  assert(ringGap < 1e-10, 'v=w periodic bulk gap must close');
  assert(meanEnd < 0.35, 'v=w near-zero modes must not look edge-localized');
  const falselyClaimedTopo = meanEnd > 0.45;
  assert(!falselyClaimedTopo, 'equal hopping must not look topological');
  failures.push({
    name: 'equal-hoppings-gap-closure',
    v, w, N, openGap, periodicGap: ringGap, analyticGap, meanMidGapEndWeight: meanEnd,
    midGapEnergies: pair.map((p) => p.energy),
    separated: ringGap < 1e-10 && meanEnd < 0.35 && !falselyClaimedTopo,
  });
}
{
  const N = 48, v = 1.2, w = 0.4; // trivial open
  const { values, vectors } = jacobiEigen(sshHamiltonian(N, v, w, { periodic: false }));
  const gap = gapFromSpectrum(values);
  const pair = midGapPair(values, vectors);
  const meanEnd = 0.5 * (pair[0].endWeight + pair[1].endWeight);
  const wrongClaim = meanEnd > 0.45; // independent eigenvector end weight must stay bulk-like
  assert(gap > 0.5, 'trivial open chain remains gapped');
  assert(!wrongClaim && Math.max(Math.abs(pair[0].energy), Math.abs(pair[1].energy)) > 0.15,
    'trivial dimerization must not host mid-gap edge pair');
  failures.push({
    name: 'wrong-dimerization-trivial-as-topo',
    v, w, N, measuredGap: gap, midGapEnergies: pair.map((p) => p.energy),
    meanMidGapEndWeight: meanEnd, separated: !wrongClaim,
  });
}
{
  const N = 40, v = 0.4, w = 1.2;
  let seed = 1;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
  const good = jacobiEigen(sshHamiltonian(N, v, w, { periodic: false }));
  const scrambled = jacobiEigen(sshHamiltonian(N, v, w, { periodic: false, scramble: true, rng }));
  const reversed = jacobiEigen(sshHamiltonian(N, v, w, { periodic: false, reversePattern: true }));
  const goodPair = midGapPair(good.values, good.vectors);
  const scrambledPair = midGapPair(scrambled.values, scrambled.vectors);
  const reversedPair = midGapPair(reversed.values, reversed.vectors);
  const goodEnd = 0.5 * (goodPair[0].endWeight + goodPair[1].endWeight);
  const scrambledEnd = 0.5 * (scrambledPair[0].endWeight + scrambledPair[1].endWeight);
  const reversedEnd = 0.5 * (reversedPair[0].endWeight + reversedPair[1].endWeight);
  const goodE = Math.max(Math.abs(goodPair[0].energy), Math.abs(goodPair[1].energy));
  const scrambledE = Math.max(Math.abs(scrambledPair[0].energy), Math.abs(scrambledPair[1].energy));
  const reversedE = Math.max(Math.abs(reversedPair[0].energy), Math.abs(reversedPair[1].energy));
  assert(goodEnd > 0.55 && goodE < 1e-6, 'ordered topo baseline');
  const scrambleSeparated = (goodEnd - scrambledEnd) > 0.15 || scrambledE > 1e-3;
  const reverseSeparated = reversedEnd < 0.35 && reversedE > 0.1;
  assert(scrambleSeparated, 'scrambled hops must separate from ordered edge-mode signature');
  assert(reverseSeparated, 'reversed dimerization pattern must look trivial');
  failures.push({
    name: 'scrambled-hop-pattern',
    v, w, N, orderedEndWeight: goodEnd, scrambledEndWeight: scrambledEnd,
    orderedMidGapAbs: goodE, scrambledMidGapAbs: scrambledE, separated: scrambleSeparated,
  });
  failures.push({
    name: 'reversed-dimerization-pattern',
    v, w, N, orderedEndWeight: goodEnd, reversedEndWeight: reversedEnd,
    orderedMidGapAbs: goodE, reversedMidGapAbs: reversedE, separated: reverseSeparated,
  });
}
assert(failures.every((f) => f.separated), 'failure controls must separate first');
// ---------- positive independent benchmarks ----------
const spectrumCases = [];
for (const [N, v, w] of [[24, 0.45, 1.15], [32, 0.4, 1.2], [48, 0.7, 1.1], [32, 1.2, 0.4]]) {
  const M = N / 2;
  const { values } = jacobiEigen(sshHamiltonian(N, v, w, { periodic: true }));
  const analytic = analyticBulkEnergies(v, w, M);
  const maxErr = maxAbsDiff(values, analytic);
  const meanErr = meanAbsDiffSorted(values, analytic);
  const measuredGap = gapFromSpectrum(values);
  const analyticGap = 2 * Math.abs(w - v);
  assert(maxErr < 1e-10, 'periodic spectrum vs analytic Bloch energies ' + maxErr);
  assert(Math.abs(measuredGap - analyticGap) < 1e-10, 'periodic gap');
  spectrumCases.push({
    N, v, w, boundary: 'periodic', maxSpectrumError: maxErr, meanSpectrumError: meanErr,
    measuredGap, analyticGap, gapError: Math.abs(measuredGap - analyticGap),
  });
}
const topologyCases = [];
for (const [N, v, w, expectTopo] of [
  [40, 0.4, 1.2, true],
  [48, 0.35, 1.25, true],
  [40, 1.2, 0.4, false],
  [48, 1.0, 0.5, false],
  [40, 0.2, 1.4, true],
]) {
  const { values, vectors } = jacobiEigen(sshHamiltonian(N, v, w, { periodic: false }));
  const rawGap = gapFromSpectrum(values);
  const gap = bulkGapExcludingMidGap(values);
  const pair = midGapPair(values, vectors);
  const meanEnd = 0.5 * (pair[0].endWeight + pair[1].endWeight);
  const midAbs = Math.max(Math.abs(pair[0].energy), Math.abs(pair[1].energy));
  const analyticGap = 2 * Math.abs(w - v);
  if (expectTopo) {
    assert(midAbs < 1e-8, 'topo mid-gap near zero: ' + midAbs);
    assert(meanEnd > 0.55, 'topo end weight: ' + meanEnd);
    const left = analyticLeftEdge(N, v, w);
    const o0 = overlapAbs(left, pair[0].vector), o1 = overlapAbs(left, pair[1].vector);
    const subspaceOverlap = Math.sqrt(o0 * o0 + o1 * o1);
    assert(subspaceOverlap > 0.98, 'analytic edge subspace overlap ' + subspaceOverlap);
    assert(Math.abs(gap - analyticGap) < 0.15, 'open bulk gap after dropping mid-gap pair');
    topologyCases.push({
      N, v, w, regime: 'nontrivial', measuredBulkGap: gap, rawGapAroundZero: rawGap,
      analyticBulkGap: analyticGap, midGapEnergies: pair.map((p) => p.energy),
      meanEndWeight: meanEnd, analyticLeftEdgeSubspaceOverlap: subspaceOverlap,
      analyticLeftEdgeMaxSingleOverlap: Math.max(o0, o1), midGapAbsMax: midAbs,
    });
  } else {
    assert(midAbs > 0.1, 'trivial has no near-zero pair');
    assert(meanEnd < 0.35, 'trivial bulk-like end weight');
    assert(Math.abs(rawGap - analyticGap) < 0.05 || rawGap > analyticGap * 0.5, 'trivial remains gapped');
    topologyCases.push({
      N, v, w, regime: 'trivial', measuredBulkGap: rawGap, rawGapAroundZero: rawGap,
      analyticBulkGap: analyticGap, midGapEnergies: pair.map((p) => p.energy),
      meanEndWeight: meanEnd, midGapAbsMax: midAbs,
    });
  }
}
// Open vs periodic control at fixed topo dimerization: edge weight collapses on the ring.
const openTopo = (() => {
  const N = 40, v = 0.4, w = 1.2;
  const o = jacobiEigen(sshHamiltonian(N, v, w, { periodic: false }));
  const p = jacobiEigen(sshHamiltonian(N, v, w, { periodic: true }));
  const oPair = midGapPair(o.values, o.vectors);
  const pPair = midGapPair(p.values, p.vectors);
  const openEnd = 0.5 * (oPair[0].endWeight + oPair[1].endWeight);
  const ringEnd = 0.5 * (pPair[0].endWeight + pPair[1].endWeight);
  assert(openEnd > 0.55 && ringEnd < 0.35, 'periodic kills edge localization');
  return {
    N, v, w, openMeanEndWeight: openEnd, periodicMeanEndWeight: ringEnd,
    openMidGapAbs: Math.max(Math.abs(oPair[0].energy), Math.abs(oPair[1].energy)),
    periodicMidGapAbs: Math.max(Math.abs(pPair[0].energy), Math.abs(pPair[1].energy)),
    periodicGap: gapFromSpectrum(p.values),
  };
})();
const result = {
  schemaVersion: 1,
  date: new Date().toISOString().slice(0, 10),
  passed: true,
  source: 'src/modules/ssh.js',
  sourceSha256,
  harness: 'tools/ssh-science.js',
  command: 'node tools/ssh-science.js --write',
  precision: 'Float64',
  scope: 'Independent Float64 dimerized tight-binding SSH Hamiltonian: periodic spectrum vs analytic Bloch energies, open-chain mid-gap edge localization / end weight, nontrivial vs trivial dimerization, open-vs-periodic control; and the studio solver in src/modules/ssh.js (spectrum, mode densities, mid-gap end weight, verdict) against the independent Jacobi solve on every registered preset.',
  criteria: {
    periodicSpectrumMaxError: 1e-10,
    periodicGapError: 1e-10,
    nontrivialMidGapAbs: 1e-8,
    nontrivialMeanEndWeightMin: 0.55,
    analyticLeftEdgeSubspaceOverlapMin: 0.98,
    trivialMidGapAbsMin: 0.1,
    trivialMeanEndWeightMax: 0.35,
    failureControlsMustSeparate: true,
  },
  failureControls: failures,
  spectrum: spectrumCases,
  topology: topologyCases,
  openVersusPeriodic: openTopo,
  studio: compareStudio(studio),
  domain: {
    parameters: 'Finite even N in {24,32,40,48} for the reference checks; N = 96 for every studio preset and N = 160 for Critical; hoppings (v,w) covering nontrivial w>v and trivial v>w; open and periodic boundaries.',
    conditions: 'Single-particle nearest-neighbour SSH; no interactions, disorder (except scramble control), or continuum limit.',
    resolution: 'Dense N×N real-symmetric Jacobi diagonalization; analytic Bloch reference for periodic chains.',
    precision: 'IEEE Float64 throughout; spectrum agreement to 1e-10 on tested sizes.',
  },
  limitations: [
    'Finite open/periodic chains only; no thermodynamic-limit proof, interactions, phonons, or experimental polyacetylene claim.',
    'The studio comparison covers the registered presets at N = 96 and Critical at N = 160. Other grids, the row mapping, per-row scaling and palette of the plate, and the print path are not compared pixel by pixel.',
    'Jacobi dense eigensolve is an independent numerical reference, not a published table lookup.',
    'End weight uses a fixed 10% site window; localization length vs |v/w| is sampled, not exhaustively mapped.',
  ],
};
assert(result.passed);
assert(result.failureControls.every((f) => f.separated));
assert(result.studio.failureControls.every((f) => f.separated));

  return result;
}

module.exports = {
  sshHamiltonian, analyticBulkEnergies, jacobiEigen, endWeight, midGapPair,
  gapFromSpectrum, bulkGapExcludingMidGap, maxAbsDiff, meanAbsDiffSorted,
  analyticLeftEdge, overlapAbs, clusters, compareStudio, runScience,
};
