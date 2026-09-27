// Independent Rice-Mele Thouless pump. Not the studio plate.
//
// src/modules/thouless.js draws a cartoon density. Its pol() keeps only the real part of the
// overlap, so that sum is not a Berry phase, and the status line says pumping is not measured.
// This file never calls that module. It diagonalizes the Rice-Mele Hamiltonian itself.
//
//   H(k) = (v + w cos k) σ_x + (w sin k) σ_y + δ σ_z
//   gap closes at v = w and δ = 0, the origin of the (v − w, δ) plane.
//
// The lattice Chern number is the Fukui-Hatsugai-Suzuki sum on the (k, φ) torus. The pumped
// charge is the many-body Resta center of mass of the occupied band on a finite ring, cross-checked
// against the bond current. A loop that encloses the origin pumps ±1. A loop that misses it pumps
// 0 and fails a predicate that demands |C| = 1. A coarse time step on the same period is diabatic
// and fails a predicate that demands an integer.
//
// node tools/thouless-science.js [--write] [--sweep]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { jacobiEigen } = require('./lib/ssh-reference');

const root = path.resolve(__dirname, '..');
const sourcePath = 'src/modules/thouless.js';
const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');

const N_CELLS = 16;
const N_K = 32;
const N_PHI = 32;
const CURVATURE_K = 96;
const CURVATURE_PHI = 96;
const SLOW_PERIOD = 40;
const SLOW_STEPS = 80;
const FAST_PERIOD = 4;
const FAST_STEPS = 80;
const FAST_REFINED_STEPS = 160;
const QUANTUM_TOL = 0.02;
const INTEGER_FAIL_MIN = 0.15;

function enclosing(phi) {
  const radius = 0.5;
  const stagger = 0.8;
  return {
    v: 1 + radius * Math.cos(phi),
    w: 1 - radius * Math.cos(phi),
    delta: stagger * Math.sin(phi),
  };
}

function trivial(phi) {
  return {
    v: 1.5 + 0.2 * Math.cos(phi),
    w: 0.5 - 0.2 * Math.cos(phi),
    delta: 0.4 * Math.sin(phi),
  };
}

function reversed(phi) {
  return enclosing(-phi);
}

function bloch(p, k) {
  return {
    dx: p.v + p.w * Math.cos(k),
    dy: p.w * Math.sin(k),
    dz: p.delta,
  };
}

function dByK(p, k) {
  return { dx: -p.w * Math.sin(k), dy: p.w * Math.cos(k), dz: 0 };
}

function lowerSpinor(dx, dy, dz) {
  const norm = Math.hypot(dx, dy, dz);
  assert(norm > 0, 'occupied spinor requested at a gap closing');
  if (dz >= 0) {
    const scale = Math.sqrt(2 * norm * (norm + dz));
    return { re1: -dx / scale, im1: dy / scale, re2: (norm + dz) / scale, im2: 0 };
  }
  const scale = Math.sqrt(2 * norm * (norm - dz));
  return { re1: (norm - dz) / scale, im1: 0, re2: -dx / scale, im2: -dy / scale };
}

function riceMeleMatrix(nCells, v, w, delta) {
  const n = 2 * nCells;
  const H = Array.from({ length: n }, () => new Float64Array(n));
  for (let cell = 0; cell < nCells; cell++) {
    const a = 2 * cell;
    const b = a + 1;
    const nextA = (a + 2) % n;
    H[a][a] = delta;
    H[b][b] = -delta;
    H[a][b] = H[b][a] = v;
    H[b][nextA] = H[nextA][b] = w;
  }
  return H;
}

function bandEdge(p) {
  let lo = Infinity;
  const samples = 256;
  for (let i = 0; i < samples; i++) {
    const k = 2 * Math.PI * i / samples;
    const d = bloch(p, k);
    const energy = Math.hypot(d.dx, d.dy, d.dz);
    if (energy < lo) lo = energy;
  }
  return 2 * lo;
}

function cycleGap(cycle) {
  let gap = Infinity;
  let phiAt = 0;
  let vMinusW = 0;
  let delta = 0;
  const samples = 1440;
  for (let i = 0; i < samples; i++) {
    const phi = 2 * Math.PI * i / samples;
    const p = cycle(phi);
    const g = bandEdge(p);
    if (g < gap) {
      gap = g;
      phiAt = phi;
      vMinusW = p.v - p.w;
      delta = p.delta;
    }
  }
  return { gap, phi: phiAt, vMinusW, delta };
}

function planeWinding(cycle) {
  const samples = 8192;
  const angle = phi => {
    const p = cycle(phi);
    return Math.atan2(p.delta, p.v - p.w);
  };
  let total = 0;
  let prev = angle(0);
  for (let i = 1; i <= samples; i++) {
    const next = angle(2 * Math.PI * i / samples);
    let d = next - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d <= -Math.PI) d += 2 * Math.PI;
    total += d;
    prev = next;
  }
  return total / (2 * Math.PI);
}

function link(a, b) {
  const re = a.re1 * b.re1 + a.im1 * b.im1 + a.re2 * b.re2 + a.im2 * b.im2;
  const im = a.re1 * b.im1 - a.im1 * b.re1 + a.re2 * b.im2 - a.im2 * b.re2;
  const mag = Math.hypot(re, im);
  assert(mag > 1e-12, 'Berry link vanished; mesh crossed a gap closing or a gauge node');
  return { re: re / mag, im: im / mag, mag };
}

function fhsChern(cycle, nK, nPhi, dropImag) {
  const grid = [];
  for (let it = 0; it < nPhi; it++) {
    const p = cycle(2 * Math.PI * it / nPhi);
    const row = [];
    for (let ik = 0; ik < nK; ik++) {
      const d = bloch(p, 2 * Math.PI * ik / nK);
      let u = lowerSpinor(d.dx, d.dy, d.dz);
      if (dropImag) {
        const scale = Math.hypot(u.re1, u.re2);
        assert(scale > 0, 'real-part spinor vanished');
        u = { re1: u.re1 / scale, im1: 0, re2: u.re2 / scale, im2: 0 };
      }
      row.push(u);
    }
    grid.push(row);
  }
  let flux = 0;
  let maxPlaquette = 0;
  let minLink = 1;
  for (let it = 0; it < nPhi; it++) {
    const t2 = (it + 1) % nPhi;
    for (let ik = 0; ik < nK; ik++) {
      const k2 = (ik + 1) % nK;
      const ux = link(grid[it][ik], grid[it][k2]);
      const uy = link(grid[it][ik], grid[t2][ik]);
      const uxNext = link(grid[t2][ik], grid[t2][k2]);
      const uyNext = link(grid[it][k2], grid[t2][k2]);
      minLink = Math.min(minLink, ux.mag, uy.mag, uxNext.mag, uyNext.mag);
      let re = 1;
      let im = 0;
      const factors = [ux, uyNext, { re: uxNext.re, im: -uxNext.im }, { re: uy.re, im: -uy.im }];
      for (const factor of factors) {
        const nr = re * factor.re - im * factor.im;
        im = re * factor.im + im * factor.re;
        re = nr;
      }
      const plaquette = Math.atan2(im, re);
      flux += plaquette;
      maxPlaquette = Math.max(maxPlaquette, Math.abs(plaquette));
    }
  }
  return { chern: flux / (2 * Math.PI), maxPlaquette, minLink };
}

function curvatureChern(cycle, nK, nPhi) {
  const dk = 2 * Math.PI / nK;
  const dphi = 2 * Math.PI / nPhi;
  const eps = 1e-7;
  let sum = 0;
  for (let it = 0; it < nPhi; it++) {
    const phi = dphi * it;
    const p = cycle(phi);
    const pp = cycle(phi + eps);
    const pm = cycle(phi - eps);
    for (let ik = 0; ik < nK; ik++) {
      const k = dk * ik;
      const d = bloch(p, k);
      const dkD = dByK(p, k);
      const plus = bloch(pp, k);
      const minus = bloch(pm, k);
      const dphiD = {
        dx: (plus.dx - minus.dx) / (2 * eps),
        dy: (plus.dy - minus.dy) / (2 * eps),
        dz: (plus.dz - minus.dz) / (2 * eps),
      };
      const crossX = dkD.dy * dphiD.dz - dkD.dz * dphiD.dy;
      const crossY = dkD.dz * dphiD.dx - dkD.dx * dphiD.dz;
      const crossZ = dkD.dx * dphiD.dy - dkD.dy * dphiD.dx;
      const norm = Math.hypot(d.dx, d.dy, d.dz);
      const triple = d.dx * crossX + d.dy * crossY + d.dz * crossZ;
      sum += triple / (norm * norm * norm);
    }
  }
  // Occupied band of H = d·σ. Its Berry curvature is minus the skyrmion density of d-hat.
  return -sum * dk * dphi / (4 * Math.PI);
}

function initialOrbitals(nCells, p) {
  const n = 2 * nCells;
  const orbitals = [];
  for (let m = 0; m < nCells; m++) {
    const k = 2 * Math.PI * m / nCells;
    const d = bloch(p, k);
    const u = lowerSpinor(d.dx, d.dy, d.dz);
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    const scale = 1 / Math.sqrt(nCells);
    for (let cell = 0; cell < nCells; cell++) {
      const ck = Math.cos(k * cell);
      const sk = Math.sin(k * cell);
      re[2 * cell] = scale * (u.re1 * ck - u.im1 * sk);
      im[2 * cell] = scale * (u.re1 * sk + u.im1 * ck);
      re[2 * cell + 1] = scale * (u.re2 * ck - u.im2 * sk);
      im[2 * cell + 1] = scale * (u.re2 * sk + u.im2 * ck);
    }
    orbitals.push({ re, im, energy: -Math.hypot(d.dx, d.dy, d.dz) });
  }
  return orbitals;
}

function applyReal(H, re, im, outRe, outIm) {
  const n = H.length;
  for (let i = 0; i < n; i++) {
    let rr = 0;
    let ii = 0;
    const row = H[i];
    for (let j = 0; j < n; j++) {
      rr += row[j] * re[j];
      ii += row[j] * im[j];
    }
    outRe[i] = rr;
    outIm[i] = ii;
  }
}

function blochResidual(nCells, p) {
  const H = riceMeleMatrix(nCells, p.v, p.w, p.delta);
  const orbitals = initialOrbitals(nCells, p);
  const n = 2 * nCells;
  let maxResidual = 0;
  const tmpRe = new Float64Array(n);
  const tmpIm = new Float64Array(n);
  for (const orb of orbitals) {
    applyReal(H, orb.re, orb.im, tmpRe, tmpIm);
    let norm2 = 0;
    for (let i = 0; i < n; i++) {
      const dr = tmpRe[i] - orb.energy * orb.re[i];
      const di = tmpIm[i] - orb.energy * orb.im[i];
      norm2 += dr * dr + di * di;
    }
    maxResidual = Math.max(maxResidual, Math.sqrt(norm2));
  }
  return maxResidual;
}

function sitePhase(nCells) {
  const n = 2 * nCells;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let cell = 0; cell < nCells; cell++) {
    const a = 2 * Math.PI * cell / nCells;
    const b = 2 * Math.PI * (cell + 0.5) / nCells;
    re[2 * cell] = Math.cos(a);
    im[2 * cell] = Math.sin(a);
    re[2 * cell + 1] = Math.cos(b);
    im[2 * cell + 1] = Math.sin(b);
  }
  return { re, im };
}

function resta(orbitals, phase) {
  const nOcc = orbitals.length;
  const n = orbitals[0].re.length;
  const re = Array.from({ length: nOcc }, () => new Float64Array(nOcc));
  const im = Array.from({ length: nOcc }, () => new Float64Array(nOcc));
  for (let m = 0; m < nOcc; m++) {
    for (let o = 0; o < nOcc; o++) {
      let rr = 0;
      let ii = 0;
      const mr = orbitals[m].re;
      const mi = orbitals[m].im;
      const nr = orbitals[o].re;
      const ni = orbitals[o].im;
      for (let j = 0; j < n; j++) {
        const cr = mr[j];
        const ci = -mi[j];
        const tr = cr * phase.re[j] - ci * phase.im[j];
        const ti = cr * phase.im[j] + ci * phase.re[j];
        rr += tr * nr[j] - ti * ni[j];
        ii += tr * ni[j] + ti * nr[j];
      }
      re[m][o] = rr;
      im[m][o] = ii;
    }
  }
  return complexDet(re, im);
}

function complexDet(re, im) {
  const n = re.length;
  const ur = re.map(row => Float64Array.from(row));
  const ui = im.map(row => Float64Array.from(row));
  let detRe = 1;
  let detIm = 0;
  let sign = 1;
  for (let k = 0; k < n; k++) {
    let pivot = k;
    let best = Math.hypot(ur[k][k], ui[k][k]);
    for (let i = k + 1; i < n; i++) {
      const mag = Math.hypot(ur[i][k], ui[i][k]);
      if (mag > best) {
        best = mag;
        pivot = i;
      }
    }
    assert(best > 1e-18, 'Resta matrix is singular');
    if (pivot !== k) {
      const swapR = ur[k];
      ur[k] = ur[pivot];
      ur[pivot] = swapR;
      const swapI = ui[k];
      ui[k] = ui[pivot];
      ui[pivot] = swapI;
      sign = -sign;
    }
    const pr = ur[k][k];
    const pi = ui[k][k];
    const p2 = pr * pr + pi * pi;
    const nextRe = detRe * pr - detIm * pi;
    detIm = detRe * pi + detIm * pr;
    detRe = nextRe;
    for (let i = k + 1; i < n; i++) {
      const fr = (ur[i][k] * pr + ui[i][k] * pi) / p2;
      const fi = (ui[i][k] * pr - ur[i][k] * pi) / p2;
      for (let j = k; j < n; j++) {
        const nr = ur[i][j] - (fr * ur[k][j] - fi * ui[k][j]);
        const ni = ui[i][j] - (fr * ui[k][j] + fi * ur[k][j]);
        ur[i][j] = nr;
        ui[i][j] = ni;
      }
    }
  }
  return { re: sign * detRe, im: sign * detIm };
}

function bondCurrent(H, orbitals) {
  const n = H.length;
  let total = 0;
  for (const orb of orbitals) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const hop = H[i][j];
      if (hop === 0) continue;
      const imag = orb.re[i] * orb.im[j] - orb.im[i] * orb.re[j];
      total += -2 * hop * imag;
    }
  }
  return total / n;
}

function toBasis(vectors, orb) {
  const n = orb.re.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const vk = vectors[k];
    let rr = 0;
    let ii = 0;
    for (let j = 0; j < n; j++) {
      rr += vk[j] * orb.re[j];
      ii += vk[j] * orb.im[j];
    }
    re[k] = rr;
    im[k] = ii;
  }
  return { re, im };
}

function fromBasis(vectors, coeff, time, values) {
  const n = values.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const c = Math.cos(values[k] * time);
    const s = Math.sin(values[k] * time);
    const rr = c * coeff.re[k] + s * coeff.im[k];
    const ii = c * coeff.im[k] - s * coeff.re[k];
    const vk = vectors[k];
    for (let j = 0; j < n; j++) {
      re[j] += vk[j] * rr;
      im[j] += vk[j] * ii;
    }
  }
  return { re, im };
}

function advancePhase(previous, z) {
  const phase = Math.atan2(z.im, z.re);
  let d = phase - previous;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return { phase, d };
}

function propagate(cycle, nCells, period, nSteps) {
  const phase = sitePhase(nCells);
  const p0 = cycle(0);
  let orbitals = initialOrbitals(nCells, p0).map(orb => ({ re: orb.re, im: orb.im }));
  let z = resta(orbitals, phase);
  let arg = Math.atan2(z.im, z.re);
  let wound = 0;
  let minModulus = Math.hypot(z.re, z.im);
  let maxSampleJump = 0;
  let currentIntegral = 0;
  const dt = period / nSteps;
  const sampleDt = Math.min(dt, 0.05);
  const scratch = orbitals.map(orb => ({ re: new Float64Array(orb.re.length), im: new Float64Array(orb.im.length) }));
  for (let step = 0; step < nSteps; step++) {
    const phi = 2 * Math.PI * (step + 0.5) / nSteps;
    const p = cycle(phi);
    const H = riceMeleMatrix(nCells, p.v, p.w, p.delta);
    const { values, vectors } = jacobiEigen(H);
    const coeff = orbitals.map(orb => toBasis(vectors, orb));
    const samples = Math.max(1, Math.ceil(dt / sampleDt));
    const slice = dt / samples;
    let previousCurrent = bondCurrent(H, orbitals);
    for (let s = 1; s <= samples; s++) {
      for (let a = 0; a < orbitals.length; a++) {
        const next = fromBasis(vectors, coeff[a], slice * s, values);
        scratch[a].re.set(next.re);
        scratch[a].im.set(next.im);
      }
      z = resta(scratch, phase);
      const moved = advancePhase(arg, z);
      arg = moved.phase;
      wound += moved.d;
      const jump = Math.abs(moved.d) / (2 * Math.PI);
      if (jump > maxSampleJump) maxSampleJump = jump;
      minModulus = Math.min(minModulus, Math.hypot(z.re, z.im));
      const now = bondCurrent(H, scratch);
      currentIntegral += 0.5 * (previousCurrent + now) * slice;
      previousCurrent = now;
    }
    orbitals = scratch.map(orb => ({ re: Float64Array.from(orb.re), im: Float64Array.from(orb.im) }));
  }
  return {
    deltaP: wound / (2 * Math.PI),
    current: currentIntegral,
    minModulus,
    maxSampleJump,
    dt,
    period,
    nSteps,
  };
}

function distToInteger(q) {
  return Math.abs(q - Math.round(q));
}

function integerPredicate(q) {
  return distToInteger(q) < QUANTUM_TOL;
}

function chernOnePredicate(q) {
  return integerPredicate(q) && Math.abs(Math.round(q)) === 1;
}

function roundTrip(cycle, nK, nPhi) {
  const lattice = fhsChern(cycle, nK, nPhi, false);
  const coarse = fhsChern(cycle, nK / 2, nPhi / 2, false);
  const curvature = curvatureChern(cycle, CURVATURE_K, CURVATURE_PHI);
  const winding = planeWinding(cycle);
  const gap = cycleGap(cycle);
  return { lattice, coarse, curvature, winding, gap };
}

function run() {
  assert(source.includes('pumping is not measured'), 'plate status no longer says pumping is not measured');
  assert(source.includes('pumping is not computed from a Hamiltonian'), 'plate blurb no longer disclaims a Hamiltonian pump');
  const plateClaimsMeasuredChern = /ΔP\s+\d|Chern\s+\d/.test(source.split('function status')[1] || '');
  assert(!plateClaimsMeasuredChern, 'plate status prints a Chern number; this record would overclaim');

  const start = enclosing(0);
  const residual = blochResidual(N_CELLS, start);
  assert(residual < 1e-9, 'real-space Rice-Mele matrix disagrees with the Bloch spinor: ' + residual);

  const enclosed = roundTrip(enclosing, N_K, N_PHI);
  const missed = roundTrip(trivial, N_K, N_PHI);
  const flipped = fhsChern(reversed, N_K, N_PHI, false);
  const dropped = fhsChern(enclosing, N_K, N_PHI, true);

  assert(enclosed.lattice.maxPlaquette < Math.PI * 0.5, 'enclosing plaquette flux is near the branch cut');
  assert(missed.lattice.maxPlaquette < Math.PI * 0.5, 'trivial plaquette flux is near the branch cut');
  assert(enclosed.gap.gap > 0.5, 'enclosing cycle is not gapped');
  assert(missed.gap.gap > 0.5, 'trivial cycle is not gapped');
  assert(Math.abs(enclosed.winding - 1) < 1e-9, 'enclosing (v-w, δ) loop does not wind +1');
  assert(Math.abs(missed.winding) < 1e-9, 'trivial (v-w, δ) loop winds');
  assert(distToInteger(enclosed.lattice.chern) < 1e-8, 'FHS Chern of the enclosing cycle is not an integer');
  assert(Math.abs(Math.abs(enclosed.lattice.chern) - 1) < 1e-8, 'enclosing cycle does not pump ±1');
  assert(Math.abs(enclosed.coarse.chern - enclosed.lattice.chern) < 1e-8, 'coarse FHS mesh disagrees');
  assert(Math.abs(missed.lattice.chern) < 1e-8, 'trivial cycle Chern is not 0');
  assert(Math.abs(missed.coarse.chern) < 1e-8, 'coarse trivial Chern is not 0');
  assert(Math.abs(enclosed.curvature - enclosed.lattice.chern) < 1e-4, 'Berry curvature integral misses the lattice Chern number');
  assert(Math.abs(missed.curvature - missed.lattice.chern) < 1e-4, 'trivial curvature misses 0');
  assert(Math.abs(flipped.chern + enclosed.lattice.chern) < 1e-8, 'reversing the cycle did not flip the Chern number');
  assert(chernOnePredicate(enclosed.lattice.chern), 'enclosing cycle failed |C|=1');
  assert(!chernOnePredicate(missed.lattice.chern), 'trivial cycle must fail the |C|=1 predicate');
  assert(Math.abs(dropped.chern - enclosed.lattice.chern) > 0.5, 'dropping the imaginary overlap still reproduced the Chern number');

  const passDt = SLOW_PERIOD / SLOW_STEPS;
  const failDt = FAST_PERIOD / FAST_STEPS;
  const refinedDt = FAST_PERIOD / FAST_REFINED_STEPS;
  const slow = propagate(enclosing, N_CELLS, SLOW_PERIOD, SLOW_STEPS);
  const fast = propagate(enclosing, N_CELLS, FAST_PERIOD, FAST_STEPS);
  const fastRefined = propagate(enclosing, N_CELLS, FAST_PERIOD, FAST_REFINED_STEPS);
  const still = propagate(trivial, N_CELLS, SLOW_PERIOD, SLOW_STEPS);
  const frozen = propagate(() => enclosing(0), N_CELLS, SLOW_PERIOD, SLOW_STEPS);

  assert(slow.maxSampleJump < 0.25, 'slow center-of-mass tracking jumped a branch');
  assert(fast.maxSampleJump < 0.25, 'fast center-of-mass tracking jumped a branch');
  assert(still.maxSampleJump < 0.25, 'trivial center-of-mass tracking jumped a branch');
  assert(frozen.maxSampleJump < 0.25, 'frozen center-of-mass tracking jumped a branch');
  assert(slow.minModulus > 1e-3, 'Resta modulus collapsed on the slow cycle');
  assert(fast.minModulus > 1e-3, 'Resta modulus collapsed on the fast cycle');
  assert(Math.abs(slow.deltaP - enclosed.lattice.chern) < QUANTUM_TOL, 'slow center of mass missed the Chern number');
  assert(Math.abs(slow.current - slow.deltaP) < QUANTUM_TOL, 'slow bond current missed the center of mass');
  assert(integerPredicate(slow.deltaP), 'passing step is not quantized');
  assert(chernOnePredicate(slow.deltaP), 'passing step does not pump ±1');
  assert(!integerPredicate(fast.deltaP), 'failing step is still quantized: dt=' + failDt + ' deltaP=' + fast.deltaP);
  assert(distToInteger(fast.deltaP) >= INTEGER_FAIL_MIN, 'failing step is too close to an integer');
  assert(!integerPredicate(fast.current), 'failing-step bond current is still an integer');
  assert(fastRefined.maxSampleJump < 0.25, 'refined fast tracking jumped a branch');
  assert(fastRefined.minModulus > 1e-3, 'Resta modulus collapsed on the refined fast cycle');
  assert(!integerPredicate(fastRefined.deltaP), 'halving the failing step restored quantization');
  assert(Math.abs(fastRefined.deltaP - fast.deltaP) < 0.01, 'fast center of mass is not converged in the time step');
  assert(Math.abs(still.deltaP) < QUANTUM_TOL, 'trivial cycle pumped a nonzero charge');
  assert(integerPredicate(still.deltaP), 'trivial dynamical charge is not the integer 0');
  assert(!chernOnePredicate(still.deltaP), 'trivial dynamical charge must fail |C|=1');
  assert(Math.abs(frozen.deltaP) < 1e-6, 'a frozen Hamiltonian pumped charge');
  assert(Math.abs(frozen.current) < 1e-6, 'a frozen Hamiltonian carried a net current');

  return {
    schemaVersion: 1,
    date: '2026-09-27',
    passed: true,
    label: 'Independent Rice-Mele solver. Not the studio plate. The plate does not compute delta P.',
    source: sourcePath,
    sourceSha256,
    harness: 'tools/thouless-science.js',
    command: 'node tools/thouless-science.js --write',
    precision: 'Float64',
    model: {
      hamiltonian: 'H(k) = (v + w cos k) sigma_x + (w sin k) sigma_y + delta sigma_z',
      gapClosing: 'v = w and delta = 0',
      nCells: N_CELLS,
      sites: 2 * N_CELLS,
      kPoints: N_K,
      fhsTimeSteps: N_PHI,
      curvatureK: CURVATURE_K,
      curvaturePhi: CURVATURE_PHI,
      period: SLOW_PERIOD,
      passSteps: SLOW_STEPS,
      passDt: passDt,
      failPeriod: FAST_PERIOD,
      failSteps: FAST_STEPS,
      failDt: failDt,
      failRefinedSteps: FAST_REFINED_STEPS,
      failRefinedDt: refinedDt,
      quantumTolerance: QUANTUM_TOL,
      integerFailMinimum: INTEGER_FAIL_MIN,
    },
    blochResidual: residual,
    enclosing: {
      parameters: 'v = 1 + 0.5 cos phi, w = 1 - 0.5 cos phi, delta = 0.8 sin phi',
      planeWinding: enclosed.winding,
      gap: enclosed.gap.gap,
      gapAtPhi: enclosed.gap.phi,
      fhsChern: enclosed.lattice.chern,
      fhsChernCoarse: enclosed.coarse.chern,
      maxPlaquette: enclosed.lattice.maxPlaquette,
      minLink: enclosed.lattice.minLink,
      curvatureChern: enclosed.curvature,
      reversedChern: flipped.chern,
      chernOnePredicate: chernOnePredicate(enclosed.lattice.chern),
      com: slow.deltaP,
      bondCurrent: slow.current,
      comMinModulus: slow.minModulus,
      comMaxSampleJump: slow.maxSampleJump,
      integerPredicate: integerPredicate(slow.deltaP),
    },
    trivial: {
      parameters: 'v = 1.5 + 0.2 cos phi, w = 0.5 - 0.2 cos phi, delta = 0.4 sin phi',
      planeWinding: missed.winding,
      gap: missed.gap.gap,
      fhsChern: missed.lattice.chern,
      fhsChernCoarse: missed.coarse.chern,
      curvatureChern: missed.curvature,
      maxPlaquette: missed.lattice.maxPlaquette,
      chernOnePredicate: chernOnePredicate(missed.lattice.chern),
      com: still.deltaP,
      bondCurrent: still.current,
      integerPredicate: integerPredicate(still.deltaP),
    },
    fast: {
      period: FAST_PERIOD,
      dt: failDt,
      nSteps: FAST_STEPS,
      com: fast.deltaP,
      bondCurrent: fast.current,
      comMinModulus: fast.minModulus,
      comMaxSampleJump: fast.maxSampleJump,
      integerPredicate: integerPredicate(fast.deltaP),
      distanceToInteger: distToInteger(fast.deltaP),
      refinedDt: refinedDt,
      refinedSteps: FAST_REFINED_STEPS,
      refinedCom: fastRefined.deltaP,
      refinedDistanceToInteger: distToInteger(fastRefined.deltaP),
      note: 'Same enclosing loop as the slow cycle. The period is 4 instead of 40, so the schedule is diabatic. Delta t = 0.05 fails the integer predicate, and delta t = 0.025 does not restore it.',
    },
    frozen: {
      deltaP: frozen.deltaP,
      current: frozen.current,
    },
    droppedImaginaryOverlap: {
      chern: dropped.chern,
      agreesWithEnclosing: Math.abs(dropped.chern - enclosed.lattice.chern) < 0.5,
    },
    plate: {
      computesDeltaP: false,
      note: 'src/modules/thouless.js is not executed. Its status line says pumping is not measured. The cartoon density and the unused 1-or-0 metric are not this Chern number.',
    },
  };
}

function sweep() {
  const rows = [];
  for (const period of [1, 2, 3, 4, 5, 8, 12, 20]) {
    for (const nSteps of [20, 40, 80, 160]) {
      const dt = period / nSteps;
      if (dt > 0.2) continue;
      const out = propagate(enclosing, N_CELLS, period, nSteps);
      rows.push({
        period,
        nSteps,
        dt,
        deltaP: out.deltaP,
        current: out.current,
        minModulus: out.minModulus,
        maxSampleJump: out.maxSampleJump,
        dist: distToInteger(out.deltaP),
        agree: Math.abs(out.deltaP - out.current),
      });
    }
  }
  console.log(JSON.stringify(rows, null, 2));
}

if (process.argv.includes('--sweep')) {
  sweep();
} else {
  const result = run();
  const outPath = path.join(root, 'validation/results/thouless-science.json');
  const text = JSON.stringify(result, null, 2) + '\n';
  if (process.argv.includes('--write')) fs.writeFileSync(outPath, text);
  else {
    const stored = fs.readFileSync(outPath, 'utf8');
    assert.equal(stored, text, 'validation/results/thouless-science.json is stale; run node tools/thouless-science.js --write');
  }
  const e = result.enclosing;
  const t = result.trivial;
  const f = result.fast;
  console.log('Rice-Mele pump, not the plate');
  console.log('N=' + N_CELLS + ' cells, k=' + N_K + ', FHS steps=' + N_PHI + ', gap=' + e.gap);
  console.log('enclosing FHS C=' + e.fhsChern + ' COM=' + e.com + ' current=' + e.bondCurrent);
  console.log('trivial FHS C=' + t.fhsChern + ' COM=' + t.com + ' |C|=1 predicate=' + t.chernOnePredicate);
  console.log('fast dt=' + f.dt + ' COM=' + f.com + ' integer predicate=' + f.integerPredicate + ' dist=' + f.distanceToInteger);
  console.log('pass dt=' + result.model.passDt + ' on period ' + result.model.period + ' integer predicate=true');
  console.log('fail dt=' + result.model.failDt + ' on period ' + result.model.failPeriod + ' stays non-integer at dt=' + result.model.failRefinedDt);
}
