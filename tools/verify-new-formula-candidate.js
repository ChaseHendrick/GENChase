#!/usr/bin/env node
/**
 * Float64 + exact-algebra verification of the n=5 polygon-collapse floor
 *   F_5 = √31682 / 80,  cos(5θ⋆) = 12√2 / 127
 *   ω₀ t_c = (127√2 − 24 cos(5θ)) / (80 sin(5θ))
 *
 * Specialization of the classical two-ring / general polygon family
 * (Koiller et al. 1985; GENChase candidate 5). Does NOT claim novelty.
 * Does NOT edit IDENTITIES.md.
 *
 * Usage: node tools/verify-new-formula-candidate.js
 * Writes: validation/results/new-formula-candidate-2026-09-23.json
 * Exit 0 iff all checks pass (including deliberate wrong-floor controls).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REL_TOL = 1e-12;
const SAMPLE_COUNT = 200_000;
const REFINE_ITERS = 80;
const N = 5;
const TWO_N = 2 * N;

const SQRT2 = Math.sqrt(2);
/** Exact K_5 = 127√2 / 8 */
const K5 = (127 * SQRT2) / 8;
const D5 = 3;
/** Cleared product coefficients: (a − b cos α)/(80 sin α) */
const A_COEFF = 127 * SQRT2;
const B_COEFF = 24;
const DEN_COEFF = 80;
/** Exact floor √31682 / 80 */
const F5 = Math.sqrt(31682) / 80;
/** Exact equality cos(5θ⋆) = 12√2 / 127 */
const COS_ALPHA_STAR = (12 * SQRT2) / 127;

/**
 * Closed product on the collapsing arc α = 5θ ∈ (0, π):
 *   P = (127√2 − 24 cos α) / (80 sin α)
 */
function productAlpha(alpha) {
  return (A_COEFF - B_COEFF * Math.cos(alpha)) / (DEN_COEFF * Math.sin(alpha));
}

function productTheta(theta) {
  return productAlpha(N * theta);
}

/** General hyperbolic formula for comparison. */
function generalKn(n) {
  const eta = Math.acosh(n / (n - 1));
  return (n - 1) * Math.sinh(((n + 2) / 2) * eta);
}

function generalFn(n) {
  const d = Math.sqrt(2 * n - 1);
  const K = generalKn(n);
  return Math.sqrt(K * K - d * d) / (2 * n);
}

/**
 * Place two regular 5-gons: outer Γ=−1 at √x e^{iθ} ζ^k, inner Γ=x=2 at ζ^k.
 * x_5 = 2, √x = √2.
 */
function positions(theta) {
  const x = 2;
  const rOuter = Math.sqrt(x);
  const zs = [];
  const gammas = [];
  for (let k = 0; k < N; k++) {
    const ang = (2 * Math.PI * k) / N;
    // outer
    zs.push({
      re: rOuter * Math.cos(theta + ang),
      im: rOuter * Math.sin(theta + ang),
    });
    gammas.push(-1);
  }
  for (let k = 0; k < N; k++) {
    const ang = (2 * Math.PI * k) / N;
    zs.push({ re: Math.cos(ang), im: Math.sin(ang) });
    gammas.push(x);
  }
  return { zs, gammas };
}

/** Velocity of each vortex under 2π Biot–Savart; return C_j = v_j / z_j. */
function biotSavartC(zs, gammas) {
  const out = [];
  const twoPi = 2 * Math.PI;
  const m = zs.length;
  for (let j = 0; j < m; j++) {
    let vx = 0;
    let vy = 0;
    for (let ell = 0; ell < m; ell++) {
      if (ell === j) continue;
      const dx = zs[j].re - zs[ell].re;
      const dy = zs[j].im - zs[ell].im;
      const r2 = dx * dx + dy * dy;
      // \dot z = (i/(2π)) Σ Γ_ℓ (z_j − z_ℓ)/|z_j−z_ℓ|²
      // i(dx+i dy) = i dx − dy = −dy + i dx
      const fac = gammas[ell] / (twoPi * r2);
      vx += fac * -dy;
      vy += fac * dx;
    }
    // C = v / z = (vx+i vy)/(re+i im)
    const re = zs[j].re;
    const im = zs[j].im;
    const den = re * re + im * im;
    const cRe = (vx * re + vy * im) / den;
    const cIm = (vy * re - vx * im) / den;
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
  const thMax = Math.PI / N;
  let minP = Infinity;
  let minTh = NaN;
  let minJ = -1;
  for (let j = 1; j < samples; j++) {
    const th = (j * thMax) / samples;
    const P = productTheta(th);
    if (P < minP) {
      minP = P;
      minTh = th;
      minJ = j;
    }
  }
  let lo = Math.max(((minJ - 1) * thMax) / samples, 1e-15);
  let hi = Math.min(((minJ + 1) * thMax) / samples, thMax - 1e-15);
  for (let i = 0; i < REFINE_ITERS; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (productTheta(m1) < productTheta(m2)) hi = m2;
    else lo = m1;
  }
  const th = (lo + hi) / 2;
  return { minP: productTheta(th), minTh: th, cosAlpha: Math.cos(N * th) };
}

/**
 * Closed A,B from the polygon derivation (2π kernel):
 *   A = −n R sin α / (2π D)
 *   B = R (K − d cos α) / (2π D)
 * with R = x^{n/2} = 2^{5/2} = 4√2, D = |R e^{-iα} − 1|² = 1+R²−2R cos α.
 * Product −B/(2A) = (K − d cos α)/(2n sin α).
 */
function AB(theta) {
  const alpha = N * theta;
  const x = 2;
  const R = Math.pow(x, N / 2); // 2^{2.5} = 4√2
  const D = 1 + R * R - 2 * R * Math.cos(alpha);
  const A = (-N * R * Math.sin(alpha)) / (2 * Math.PI * D);
  const B = (R * (K5 - D5 * Math.cos(alpha))) / (2 * Math.PI * D);
  return { A, B, R, D };
}

function main() {
  const alphaStar = Math.acos(COS_ALPHA_STAR);
  const thStar = alphaStar / N;
  const Pstar = productAlpha(alphaStar);
  const { A: Astar, B: Bstar } = AB(thStar);
  const PfromAB = -Bstar / (2 * Astar);

  const sampled = sampleMin();

  // Biot–Savart at θ⋆
  const { zs, gammas } = positions(thStar);
  const Cs = biotSavartC(zs, gammas);
  const C = meanC(Cs);
  const residual = Math.max(
    ...Cs.map((c) => Math.hypot(c.re - C.re, c.im - C.im)),
  );
  const Pbs = -C.im / (2 * C.re);

  // Angular impulse I = Σ Γ |z|² should vanish
  let inertia = 0;
  for (let j = 0; j < zs.length; j++) {
    inertia += gammas[j] * (zs[j].re * zs[j].re + zs[j].im * zs[j].im);
  }

  // Exact algebraic identities (Float64 of exact integers / radicals)
  const K5fromGen = generalKn(N);
  const F5fromGen = generalFn(N);
  // (127√2/8)^2 − 9 = 31682/64  ⇒  √(K²−9)/10 = √31682/80
  const KsqMinusDsq = K5 * K5 - D5 * D5;
  const expectedKsqMinus = 31682 / 64;

  const checks = [];
  function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
  }

  check('F5_finite_positive', Number.isFinite(F5) && F5 > 0, { F5 });
  check('Pstar_equals_F5', relErr(Pstar, F5) < REL_TOL, {
    Pstar,
    F5,
    rel: relErr(Pstar, F5),
  });
  check('cos_alpha_star_in_arc', COS_ALPHA_STAR > 0 && COS_ALPHA_STAR < 1, {
    COS_ALPHA_STAR,
  });
  check('A_negative_at_star', Astar < 0, { Astar });
  check('P_from_AB_matches_closed', relErr(PfromAB, Pstar) < REL_TOL, {
    PfromAB,
    Pstar,
    rel: relErr(PfromAB, Pstar),
  });
  check('sample_min_matches_F5', relErr(sampled.minP, F5) < 1e-12, {
    sampleMin: sampled.minP,
    F5,
    rel: relErr(sampled.minP, F5),
    cosSample: sampled.cosAlpha,
    cosStar: COS_ALPHA_STAR,
  });
  check('K5_matches_general_sinh', relErr(K5, K5fromGen) < REL_TOL, {
    K5,
    K5fromGen,
    rel: relErr(K5, K5fromGen),
  });
  check('F5_matches_general_Fn', relErr(F5, F5fromGen) < REL_TOL, {
    F5,
    F5fromGen,
    rel: relErr(F5, F5fromGen),
  });
  check('exact_Ksq_identity', relErr(KsqMinusDsq, expectedKsqMinus) < 1e-14, {
    KsqMinusDsq,
    expectedKsqMinus,
    rel: relErr(KsqMinusDsq, expectedKsqMinus),
  });
  check(
    'exact_cos_equals_d_over_K',
    relErr(COS_ALPHA_STAR, D5 / K5) < REL_TOL,
    { COS_ALPHA_STAR, dOverK: D5 / K5 },
  );
  check('biot_savart_common_C', residual < 1e-12, { residual });
  check('biot_savart_A_matches', relErr(C.re, Astar) < 1e-11, {
    bsA: C.re,
    Astar,
    rel: relErr(C.re, Astar),
  });
  check('biot_savart_B_matches', relErr(C.im, Bstar) < 1e-11, {
    bsB: C.im,
    Bstar,
    rel: relErr(C.im, Bstar),
  });
  check('biot_savart_P_matches', relErr(Pbs, F5) < 1e-11, {
    Pbs,
    F5,
    rel: relErr(Pbs, F5),
  });
  check('inertia_near_zero', Math.abs(inertia) < 1e-12, { inertia });

  // Dense sample: product always ≥ F5 − eps on the arc
  let undershoot = 0;
  let minSeen = Infinity;
  for (let j = 1; j < 10000; j++) {
    const th = (j * Math.PI) / (N * 10000);
    const P = productTheta(th);
    minSeen = Math.min(minSeen, P);
    if (P < F5 - 1e-10) undershoot++;
  }
  check('dense_sample_obeys_floor', undershoot === 0, {
    undershoot,
    minSeen,
    F5,
  });

  // Deliberate wrong-floor controls
  const tooLarge = 3;
  check('wrong_too_large_floor_control_fails', !(sampled.minP + 1e-12 >= tooLarge), {
    sampleMin: sampled.minP,
    tooLarge,
  });

  // Square floor √322/9 ≈ 1.994 is below F5; claiming F5 = F4 must fail
  const F4 = Math.sqrt(322) / 9;
  check('not_square_floor_F4', relErr(F5, F4) > 1e-3, {
    F5,
    F4,
    rel: relErr(F5, F4),
  });

  // Wrong equality angle (square's cos 4θ* = 9/55) must not minimize n=5 product
  const wrongCos = 9 / 55;
  const wrongAlpha = Math.acos(wrongCos);
  const Pwrong = productAlpha(wrongAlpha);
  check('wrong_equality_angle_not_min', Pwrong > F5 + 1e-6, {
    Pwrong,
    F5,
    gap: Pwrong - F5,
  });

  // Consistency: F2,F3,F4 still match known radicals (sanity, not re-claim)
  check('sanity_F2', relErr(generalFn(2), (3 * Math.sqrt(5)) / 4) < REL_TOL, {
    F2: generalFn(2),
  });
  check('sanity_F3', relErr(generalFn(3), Math.sqrt(29) / 3) < REL_TOL, {
    F3: generalFn(3),
  });
  check('sanity_F4', relErr(generalFn(4), Math.sqrt(322) / 9) < REL_TOL, {
    F4: generalFn(4),
  });

  const allOk = checks.every((c) => c.ok);
  const result = {
    generated: new Date().toISOString(),
    target: {
      n: 5,
      x: 2,
      d: 3,
      claim:
        'ω₀ t_c = (127√2 − 24 cos 5θ)/(80 sin 5θ) ≥ √31682/80 on collapsing two-pentagon arc',
    },
    closedForm: {
      K5: '127√2 / 8',
      product: '(127√2 − 24 cos(5θ)) / (80 sin(5θ))',
      floor: '√31682 / 80',
      cos5thetaStar: '12√2 / 127',
    },
    numbers: {
      K5,
      F5,
      cosAlphaStar: COS_ALPHA_STAR,
      alphaStarRad: alphaStar,
      thetaStarRad: thStar,
      thetaStarDeg: (thStar * 180) / Math.PI,
      Pstar,
      Astar,
      Bstar,
      sampleMin: sampled.minP,
      sampleCosAlpha: sampled.cosAlpha,
      biotSavart: { A: C.re, B: C.im, P: Pbs, residual, inertia },
      generalKn: K5fromGen,
      generalFn: F5fromGen,
    },
    checks,
    pass: allOk,
    note:
      'Specialization of candidate-5 / Koiller two-ring family at n=5. Not a new dynamical family. Priority of the explicit radical unconfirmed. Do not invent novelty; do not count as a sixth independent IDENTITIES row.',
  };

  const outDir = path.join(__dirname, '..', 'validation', 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'new-formula-candidate-2026-09-23.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  console.log(
    JSON.stringify(
      { pass: allOk, outPath, F5, cosAlphaStar: COS_ALPHA_STAR, thetaStarDeg: result.numbers.thetaStarDeg },
      null,
      2,
    ),
  );
  for (const c of checks) {
    console.log((c.ok ? 'PASS' : 'FAIL') + '  ' + c.name);
  }
  process.exit(allOk ? 0 : 1);
}

main();
