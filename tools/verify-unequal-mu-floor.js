#!/usr/bin/env node
/**
 * Float64 verification of the μ=1/2 unequal three-vortex spin–collapse product floor.
 *
 * Circulations: Γ = (1, 1/2, −1/3) on Gotoda's L=0 circle construction (arXiv:2002.09624 §3.1).
 * Similarity rate C = A+iB from the 2π Biot–Savart kernel (Gotoda eq. 2.4).
 * Product P(θ) = ω0 tc = −B/(2A) on the collapsing arc A<0.
 *
 * Does NOT claim novelty. Does NOT edit IDENTITIES.md.
 *
 * Usage: node tools/verify-unequal-mu-floor.js
 * Writes: validation/results/unequal-mu-half-floor-verify.json
 * Exit 0 iff all checks pass (including deliberate wrong-floor control fails).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REL_TOL = 1e-12;
const SAMPLE_COUNT = 200_000;
const REFINE_ITERS = 80;

const SQRT7 = Math.sqrt(7);
const SQRT10 = Math.sqrt(10);
const SQRT70 = Math.sqrt(70);

/** cos θ0 for equilateral / A=0 boundary: −√7/14 */
const COS_TH0 = -SQRT7 / 14;
const TH0 = Math.acos(COS_TH0);

/**
 * Exact critical cosine on the collapsing arc (casus irreducibilis / triple-angle form):
 *   cos θ⋆ = −8√7/21 + (5√70/21) cos(arccos(−124√10/3125)/3)
 * Root of  c³ + (8√7/7)c² + c/14 − 32√7/49 = 0  in (−√7/14, 1).
 */
function cosThetaStar() {
  const phi = Math.acos((-124 * SQRT10) / 3125);
  return (-8 * SQRT7) / 21 + (5 * SQRT70 * Math.cos(phi / 3)) / 21;
}

/**
 * Closed positive product on the collapsing arc (sin θ > 0, 0 < θ < θ0):
 *   P(θ) = (14 sin²θ + 6√7 cosθ + 21) / [2 (14 cosθ + √7) sinθ]
 * Derived from Biot–Savart / Gotoda Prop. 2.1 (not the unequal specialization of Gotoda 3.3 B,
 * which disagrees with the 2π kernel for Γ1 ≠ Γ2).
 */
function productTheta(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return (14 * s * s + 6 * SQRT7 * c + 21) / (2 * (14 * c + SQRT7) * s);
}

function productFromCos(c) {
  const s = Math.sqrt(Math.max(0, 1 - c * c));
  return (14 * (1 - c * c) + 6 * SQRT7 * c + 21) / (2 * (14 * c + SQRT7) * s);
}

/** Closed A(θ), B(θ) matching Biot–Savart (σ of Gotoda construction). */
function AB(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const D = 28 * s * s + 5 * SQRT7 * c + 16;
  const A = (-27 * (14 * c + SQRT7) * s) / (28 * Math.PI * D);
  const B = (27 * (14 * s * s + 6 * SQRT7 * c + 21)) / (28 * Math.PI * D);
  return { A, B };
}

/** Gotoda (3.6) positions for Γ=(1,μ,−μ/(1+μ)) with μ=1/2. */
function positions(theta) {
  const G1 = 1;
  const G2 = 0.5;
  const R = G1 * G1 + G1 * G2 + G2 * G2; // 7/4
  const sR = Math.sqrt(R);
  const fac = (G1 * G2) / (G1 + G2) ** 2;
  const e = { re: Math.cos(-theta), im: Math.sin(-theta) };
  const k1 = {
    re: fac * (1 + (sR / G1) * e.re),
    im: fac * ((sR / G1) * e.im),
  };
  const k2 = {
    re: fac * (1 - (sR / G2) * e.re),
    im: fac * (-(sR / G2) * e.im),
  };
  const k3 = { re: 1, im: 0 };
  return [k1, k2, k3];
}

const GAMMAS = [1, 0.5, -1 / 3];

/** C_m = i/(2π k_m) Σ_{n≠m} Γ_n / (conj(k_m)−conj(k_n)) — Gotoda (2.4), 2π kernel. */
function biotSavartC(ks) {
  const out = [];
  const twoPi = 2 * Math.PI;
  for (let m = 0; m < 3; m++) {
    // S = Σ Γ_n / (conj(k_m) − conj(k_n))
    let sRe = 0;
    let sIm = 0;
    for (let n = 0; n < 3; n++) {
      if (n === m) continue;
      // conj(km)−conj(kn) = (re_m−re_n) − i (im_m−im_n)
      const dRe = ks[m].re - ks[n].re;
      const dIm = -(ks[m].im - ks[n].im);
      const den = dRe * dRe + dIm * dIm;
      // 1/(dRe+i dIm) = (dRe−i dIm)/den
      sRe += (GAMMAS[n] * dRe) / den;
      sIm += (GAMMAS[n] * -dIm) / den;
    }
    // i/k = (im_k + i re_k)/|k|²
    const kRe = ks[m].re;
    const kIm = ks[m].im;
    const k2 = kRe * kRe + kIm * kIm;
    const invRe = kIm / k2;
    const invIm = kRe / k2;
    // (i/k)*S = (invRe + i invIm)(sRe + i sIm)
    const cRe = (invRe * sRe - invIm * sIm) / twoPi;
    const cIm = (invRe * sIm + invIm * sRe) / twoPi;
    out.push({ re: cRe, im: cIm });
  }
  return out;
}

function meanC(Cs) {
  let re = 0;
  let im = 0;
  for (const c of Cs) {
    re += c.re;
    im += c.im;
  }
  return { re: re / Cs.length, im: im / Cs.length };
}

function relErr(a, b) {
  const den = Math.max(Math.abs(a), Math.abs(b), Number.EPSILON);
  return Math.abs(a - b) / den;
}

function sampleMin(samples = SAMPLE_COUNT) {
  let minP = Infinity;
  let minTh = NaN;
  let minJ = -1;
  for (let j = 1; j < samples; j++) {
    const th = (j * TH0) / samples;
    const P = productTheta(th);
    if (P < minP) {
      minP = P;
      minTh = th;
      minJ = j;
    }
  }
  let lo = Math.max(((minJ - 1) * TH0) / samples, 1e-15);
  let hi = Math.min(((minJ + 1) * TH0) / samples, TH0 - 1e-15);
  for (let i = 0; i < REFINE_ITERS; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (productTheta(m1) < productTheta(m2)) hi = m2;
    else lo = m1;
  }
  const th = (lo + hi) / 2;
  return { minP: productTheta(th), minTh: th, cosMin: Math.cos(th) };
}

function main() {
  const cosStar = cosThetaStar();
  const thStar = Math.acos(cosStar);
  const Pstar = productFromCos(cosStar);
  const { A: Astar, B: Bstar } = AB(thStar);
  const PfromAB = -Bstar / (2 * Astar);

  const sampled = sampleMin();

  // Biot–Savart at θ⋆
  const ks = positions(thStar);
  const Cs = biotSavartC(ks);
  const C = meanC(Cs);
  const residual = Math.max(...Cs.map((c) => Math.hypot(c.re - C.re, c.im - C.im)));
  const Pbs = -C.im / (2 * C.re);

  // Critical cubic residual
  const c = cosStar;
  const cubic =
    c ** 3 + ((8 * SQRT7) / 7) * c ** 2 + c / 14 - (32 * SQRT7) / 49;

  // L = M invariant (Gotoda M / angular impulse combo) should be ~0
  // M = Γ1Γ2 l12² + Γ2Γ3 l23² + Γ3Γ1 l31²
  const [k1, k2, k3] = ks;
  const l12 = Math.hypot(k1.re - k2.re, k1.im - k2.im);
  const l23 = Math.hypot(k2.re - k3.re, k2.im - k3.im);
  const l31 = Math.hypot(k3.re - k1.re, k3.im - k1.im);
  const M =
    GAMMAS[0] * GAMMAS[1] * l12 * l12 +
    GAMMAS[1] * GAMMAS[2] * l23 * l23 +
    GAMMAS[2] * GAMMAS[0] * l31 * l31;

  const checks = [];
  function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
  }

  check('Pstar_finite_positive', Number.isFinite(Pstar) && Pstar > 0, { Pstar });
  check('cosStar_in_collapsing_arc', cosStar > COS_TH0 && cosStar < 1, {
    cosStar,
    COS_TH0,
  });
  check('A_negative_at_star', Astar < 0, { Astar });
  check('cubic_residual', Math.abs(cubic) < 1e-14, { cubic });
  check('P_from_AB_matches_closed', relErr(PfromAB, Pstar) < REL_TOL, {
    PfromAB,
    Pstar,
    rel: relErr(PfromAB, Pstar),
  });
  check('sample_min_matches_Pstar', relErr(sampled.minP, Pstar) < 1e-12, {
    sampleMin: sampled.minP,
    Pstar,
    rel: relErr(sampled.minP, Pstar),
    cosSample: sampled.cosMin,
    cosStar,
  });
  check('biot_savart_common_C', residual < 1e-14, { residual });
  check('biot_savart_A_matches', relErr(C.re, Astar) < REL_TOL, {
    bsA: C.re,
    Astar,
    rel: relErr(C.re, Astar),
  });
  check('biot_savart_B_matches', relErr(C.im, Bstar) < REL_TOL, {
    bsB: C.im,
    Bstar,
    rel: relErr(C.im, Bstar),
  });
  check('biot_savart_P_matches', relErr(Pbs, Pstar) < REL_TOL, {
    Pbs,
    Pstar,
    rel: relErr(Pbs, Pstar),
  });
  check('M_invariant_near_zero', Math.abs(M) < 1e-14, { M });

  // Deliberate wrong-floor control: claim P ≥ 3 (too large). Sample min undershoots.
  const tooLarge = 3;
  const tooLargeWouldPass = sampled.minP + 1e-12 >= tooLarge;
  check('wrong_too_large_floor_control_fails', !tooLargeWouldPass, {
    sampleMin: sampled.minP,
    tooLarge,
  });

  // Equal-slice Gröbli formula is not this P (μ≠1).
  const equalSliceP =
    (3 - Math.cos(2 * thStar)) / (2 * Math.sin(2 * thStar));
  check('not_equal_slice_formula', relErr(equalSliceP, Pstar) > 1e-3, {
    equalSliceP,
    Pstar,
    rel: relErr(equalSliceP, Pstar),
  });

  // Adjacent-open witness used Gotoda (3.3) B (buggy for Γ1≠Γ2). That formula must disagree.
  const buggyNum =
    56 * cosStar * cosStar - 10 * SQRT7 * cosStar - 133;
  const buggyDen = 8 * (14 * cosStar + SQRT7) * Math.sin(thStar);
  const buggyP = Math.abs(buggyNum / buggyDen);
  check('gotoda_33_B_specialization_disagrees', relErr(buggyP, Pstar) > 1e-3, {
    buggyP,
    Pstar,
    rel: relErr(buggyP, Pstar),
    note: 'adjacent-open / RESEARCH ≈1.741 came from Gotoda (3.3) B; Prop. 2.1 gives ≈2.204',
  });

  const allOk = checks.every((c) => c.ok);
  const result = {
    generated: new Date().toISOString(),
    target: {
      Gamma: [1, 0.5, -1 / 3],
      mu: 0.5,
      claim: 'P(θ)=−B/(2A) ≥ P⋆ on collapsing L=0 arc, unique interior min',
    },
    closedForm: {
      P:
        '(14 sin^2 θ + 6√7 cos θ + 21) / [2 (14 cos θ + √7) sin θ]',
      criticalCubic: 'c^3 + (8√7/7) c^2 + c/14 − 32√7/49 = 0',
      cosThetaStar:
        '−8√7/21 + (5√70/21) cos(arccos(−124√10/3125)/3)',
    },
    numbers: {
      cosThetaStar: cosStar,
      thetaStarRad: thStar,
      thetaStarDeg: (thStar * 180) / Math.PI,
      Pstar,
      Astar,
      Bstar,
      theta0Rad: TH0,
      theta0Deg: (TH0 * 180) / Math.PI,
      cosTheta0: COS_TH0,
      sampleMin: sampled.minP,
      sampleCos: sampled.cosMin,
      biotSavart: { A: C.re, B: C.im, P: Pbs, residual, M },
    },
    checks,
    pass: allOk,
    note:
      'Gotoda (3.3) B specialization disagrees with Prop. 2.1 / Biot–Savart when Γ1≠Γ2; A and P here use the 2π kernel. Priority of the optimized floor is unconfirmed. Do not invent novelty.',
  };

  const outDir = path.join(__dirname, '..', 'validation', 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'unequal-mu-half-floor-verify.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ pass: allOk, outPath, Pstar, cosStar }, null, 2));
  for (const c of checks) {
    console.log((c.ok ? 'PASS' : 'FAIL') + '  ' + c.name);
  }
  process.exit(allOk ? 0 : 1);
}

main();
