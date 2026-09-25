'use strict';
// Exact benchmarks and print evidence for the Random Matrices tab (src/modules/rmt.js).
//
//   node tools/rmt-science.js [--write]
//
// The module's own functions are extracted in Node with new Function and a hook (as in
// tools/ust-review.js), so every number below comes from the code the studio runs. The references in
// tools/lib/rmt-reference.js are written independently from the mathematics. What is tested:
//
//  1. Eigenvalues. The module's implicit-shift QL (tqli) against Sturm-sequence bisection on the same
//     tridiagonal, to a stated backward-error tolerance. Control: a QL that deflates early must fail.
//  2. Exact moments. E Tr H^2 and E Tr H^4 of the Dumitriu-Edelman model in the tab's normalization,
//     derived in closed form, against sample means over seeded matrices, as z-scores with a Bonferroni
//     family threshold. Controls: chi degrees of freedom beta (n - i + 1) and beta n must fail.
//  3. Semicircle. Kolmogorov-Smirnov distance of each scaled spectrum from the semicircle over n = 24
//     to 400, and a formal KS test on one uniformly chosen eigenvalue per matrix (independent draws)
//     against its critical value. Control: the beta n rule, which widens the spectrum, must fail.
//  4. Spacings. The tab's own unfolded spacings at beta = 1 and 2 against the exact Gaudin-Mehta law
//     (Fredholm determinants of the sine kernel) and against the Wigner surmise, by a pooled KS
//     distance with a matrix-block bootstrap critical value, and the coefficient of variation with a
//     matrix-block bootstrap error bar. Control: gaps without unfolding must fail.
//  5. The spacing spread the status line prints, recomputed and bootstrapped for two presets.
//  6. Dyson paths. The module's Householder + QL eigenvalues against Jacobi rotations on independently
//     rebuilt Ornstein-Uhlenbeck matrices, stationarity of E Tr H^2 and the exact decay e^{-t/2} of the
//     trace autocorrelation. Control: a wrong OU decay factor must fail.
//  7. Print. Five studio recipes through a copy of dist/studio.html with an auditRead() hook: the
//     studio's spectra equal the Node computation, every SVG tick and polyline vertex matches geometry
//     rebuilt from Sturm (or Jacobi) eigenvalues, the fallback PNG matches an independent painting, a
//     displaced painting fails, and exporting leaves the recipe and spectra unchanged.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), { performance } = require('node:perf_hooks');
const R = require('./lib/rmt-reference');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/rmt.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const started = performance.now();
const WRITE = process.argv.includes('--write');
const log = (...a) => console.log(...a);

// The studio's seeded generator, extracted from the engine (TAU is the engine's 2 pi).
const makeRng = new Function('const TAU = Math.PI * 2;\n' + engine.slice(engine.indexOf('  function makeRng'), engine.indexOf('  function makeNoise')) + 'return makeRng;')();

/* ---------------- loading the module's code ---------------- */
const MARK_REGISTER = '  /* ---------- Random Matrices ---------- */';
const MARK_TRIDIAG = '    tqli(d, e, n);\n    const out';
const MARK_RETURN = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
const AUDIT = '        auditRead() { return { series: series && series.map(r => ({ lam: r.lam.slice(), beta: r.beta, scale: r.scale })), scaleG, cv, cvLo, cvHi, building, capped }; },\n';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function loadModule(src, label) {
  for (const m of [MARK_REGISTER, MARK_TRIDIAG, MARK_RETURN]) assert(src.includes(m), label + ': marker missing: ' + m.trim());
  const hooks = {};
  const code = src
    .replace(MARK_REGISTER, '  hooks.tqli = tqli; hooks.tred = tred; hooks.betaHermite = betaHermite; hooks.unfolded = unfolded; hooks.goeInto = goeInto; hooks.SURMISE = SURMISE;\n' + MARK_REGISTER)
    .replace(MARK_TRIDIAG, '    if (hooks.onTridiag) hooks.onTridiag(d, e, n);\n' + MARK_TRIDIAG)
    .replace(MARK_RETURN, AUDIT + MARK_RETURN);
  // The module's error bars go through the shared harness, as they do in the studio.
  const util = { clamp, makeRng, makeRamp: () => () => [0, 0, 0], stats: require('../src/shared/stats.js') };
  new Function('Studio', 'hooks', 'performance', code)({ util, PALETTES: {}, register(m) { hooks.mod = m; } }, hooks, performance);
  assert(hooks.mod && hooks.mod.id === 'rmt');
  return hooks;
}
// A deliberately wrong copy: the replacement must change the source, or the control tests nothing.
function variant(from, to, label) {
  assert(source.includes(from), label + ': control target not found');
  const out = source.replace(from, to);
  assert.notEqual(out, source);
  return loadModule(out, label);
}
const MOD = loadModule(source, 'module');
const DOF_RULE = 'e[i] = chi(rng, (n - 1 - i) * beta);';
const WRONG_DOF_SHIFT = variant(DOF_RULE, 'e[i] = chi(rng, (n - i) * beta);', 'dof beta(n-i+1)');
const WRONG_DOF_FLAT = variant(DOF_RULE, 'e[i] = chi(rng, n * beta);', 'dof beta n');
const EARLY_DEFLATION = variant('if (Math.abs(e[m]) <= 2.3e-16 * dd) break;', 'if (Math.abs(e[m]) <= 1e-4 * dd) break;', 'early deflation');
const WRONG_OU = variant('const a = Math.exp(-delta / 2)', 'const a = Math.exp(-delta)', 'OU decay');

// Run the module's create() against a stub host, exactly as the studio would, and wait for it.
function runTab(hooks, recipe) {
  const state = Object.assign({}, hooks.mod.defaults, recipe, { palette: ['#000000', '#FFFFFF'], bg: '#101010', grain: 0 });
  hooks.mod.sanitize(state);
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  let statusHtml = '';
  const host = { canvas: { width: 64, height: 64, getContext: () => ctx }, getState: () => state, setStatus: h => { statusHtml = h; } };
  const inst = hooks.mod.create(host);
  inst.regenerate();
  return new Promise(resolve => {
    (function poll() {
      const a = inst.auditRead();
      if (!a.building && a.series) resolve({ state, audit: a, statusHtml }); else setTimeout(poll, 2);
    })();
  });
}

const mean = a => { let s = 0; for (const v of a) s += v; return s / a.length; };
const sdev = a => { const m = mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return Math.sqrt(s / (a.length - 1)); };
const se = a => sdev(a) / Math.sqrt(a.length);
const round = (v, d = 6) => Number(v.toPrecision(d));

/* ---------------- 1. eigenvalues against Sturm bisection ---------------- */
function eigenCheck(hooks, cases, perCase, seedBase) {
  let worst = 0, matrices = 0, worstAbs = 0;
  for (const [n, beta] of cases) {
    const rng = makeRng(seedBase + '/' + n + '/' + beta), d = new Float64Array(n), e = new Float64Array(n);
    let cap = null;
    hooks.onTridiag = (dd, ee) => { cap = { d: Float64Array.from(dd), e: Float64Array.from(ee) }; };
    for (let k = 0; k < perCase; k++) {
      const lam = hooks.betaHermite(rng, n, beta, d, e), ref = R.sturmEigenvalues(cap.d, cap.e, n), tol = 4 * n * Number.EPSILON * ref.norm;
      assert.equal(lam.length, n);
      for (let i = 1; i < n; i++) assert(lam[i] >= lam[i - 1], 'spectrum not sorted');
      for (let i = 0; i < n; i++) { const err = Math.abs(lam[i] - ref.values[i]); worst = Math.max(worst, err / tol); worstAbs = Math.max(worstAbs, err / ref.norm); }
      matrices++;
    }
    hooks.onTridiag = null;
  }
  return { matrices, worstErrorOverTolerance: worst, worstErrorOverNorm: worstAbs };
}
log('1. eigenvalues: tqli against Sturm bisection');
const EIG_CASES = [];
for (const n of [24, 150, 400]) for (const beta of [0.05, 1, 2, 20]) EIG_CASES.push([n, beta]);
const eigen = eigenCheck(MOD, EIG_CASES, 5, 'rmt-science/eigen');
assert(eigen.worstErrorOverTolerance <= 1, 'tqli disagrees with Sturm bisection beyond 4 n eps ||T||');
const eigenControl = eigenCheck(EARLY_DEFLATION, EIG_CASES, 5, 'rmt-science/eigen');
assert(eigenControl.worstErrorOverTolerance > 1, 'early-deflation control was not detected');
log('   worst |error| / (4 n eps ||T||) = ' + eigen.worstErrorOverTolerance.toFixed(3) + ' over ' + eigen.matrices + ' matrices; early-deflation control ' + eigenControl.worstErrorOverTolerance.toExponential(2));

/* ---------------- 2 and 3. ensembles: exact moments and the semicircle ---------------- */
const NS = [24, 50, 100, 200, 400], BETAS = [0.1, 1, 2, 4, 12], SC_BETAS = [1, 2, 4, 12];
const ensembleSize = n => (n >= 400 ? 1000 : 2000);
function ensemble(hooks, n, beta, M, seed) {
  const rng = makeRng(seed), pick = makeRng(seed + '/pick'), d = new Float64Array(n), e = new Float64Array(n), radius = 2 * Math.sqrt(beta * n);
  const m2 = new Float64Array(M), m4 = new Float64Array(M), one = new Float64Array(M), dSingle = new Float64Array(M);
  for (let k = 0; k < M; k++) {
    const lam = hooks.betaHermite(rng, n, beta, d, e);
    let a = 0, b = 0;
    for (const l of lam) { const q = l * l; a += q; b += q * q; }
    m2[k] = a; m4[k] = b;
    one[k] = lam[Math.floor(pick() * n)] / radius;
    dSingle[k] = R.ksSorted(lam.map(v => v / radius), R.semicircleCdf);
  }
  const x2 = R.exactTrH2(n, beta), x4 = R.exactTrH4(n, beta);
  const r = {
    n, beta, matrices: M, seed,
    trH2: { exact: x2, mean: mean(m2), se: se(m2), z: (mean(m2) - x2) / se(m2), sampleVariance: sdev(m2) ** 2, exactVariance: R.exactVarTrH2(n, beta) },
    trH4: { exact: x4, mean: mean(m4), se: se(m4), z: (mean(m4) - x4) / se(m4) },
    semicircle: { radius, singleSpectrumKS: mean(dSingle), singleSpectrumKSse: se(dSingle), nTimesKS: n * mean(dSingle), iidKS: R.ksSorted(Array.from(one).sort((p, q) => p - q), R.semicircleCdf) },
  };
  return r;
}
const MOMENT_TESTS = NS.length * BETAS.length * 2, Z_MOMENT = R.bonferroniZ(0.001, MOMENT_TESTS);
const SC_TESTS = NS.length * SC_BETAS.length, SC_ALPHA = 0.001 / SC_TESTS;
log('2-3. ensembles: family z threshold ' + Z_MOMENT.toFixed(3) + ' over ' + MOMENT_TESTS + ' moment tests; semicircle KS at alpha ' + SC_ALPHA.toExponential(2) + ' per test');
const ensembles = [];
for (const n of NS) for (const beta of BETAS) {
  const M = ensembleSize(n), r = ensemble(MOD, n, beta, M, 'rmt-science/ensemble/' + n + '/' + beta);
  r.trH2.pass = Math.abs(r.trH2.z) < Z_MOMENT; r.trH4.pass = Math.abs(r.trH4.z) < Z_MOMENT;
  if (SC_BETAS.includes(beta)) { r.semicircle.critical = R.kolmogorovCritical(SC_ALPHA, M); r.semicircle.pass = r.semicircle.iidKS < r.semicircle.critical; }
  else r.semicircle.note = 'beta n = ' + (beta * n).toFixed(1) + ': outside the semicircle regime (needs beta n >> 1); reported, not tested';
  ensembles.push(r);
  log('   n ' + n + ' beta ' + beta + ': Tr H^2 z ' + r.trH2.z.toFixed(2) + ', Tr H^4 z ' + r.trH4.z.toFixed(2) + ', single-spectrum KS ' + r.semicircle.singleSpectrumKS.toFixed(4) + ', iid KS ' + r.semicircle.iidKS.toFixed(4) + (r.semicircle.critical ? ' / ' + r.semicircle.critical.toFixed(4) : ''));
}
assert(ensembles.every(r => r.trH2.pass && r.trH4.pass), 'an exact moment test failed');
assert(ensembles.every(r => r.semicircle.pass !== false), 'a semicircle KS test failed');
// Convergence: the single-spectrum distance must fall with n at every tested beta.
const convergence = SC_BETAS.map(beta => {
  const rows = ensembles.filter(r => r.beta === beta), xs = rows.map(r => Math.log(r.n)), ys = rows.map(r => Math.log(r.semicircle.singleSpectrumKS));
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const monotone = rows.every((r, i) => i === 0 || r.semicircle.singleSpectrumKS < rows[i - 1].semicircle.singleSpectrumKS);
  return { beta, n: rows.map(r => r.n), ks: rows.map(r => round(r.semicircle.singleSpectrumKS, 4)), nTimesKS: rows.map(r => round(r.semicircle.nTimesKS, 4)), logLogSlope: round(sxy / sxx, 4), monotone };
});
assert(convergence.every(c => c.monotone), 'single-spectrum KS distance does not decrease with n');

// Controls: the wrong degrees-of-freedom rules.
log('   controls: wrong chi degrees of freedom');
const dofControls = [];
for (const n of NS) for (const beta of [1, 2]) {
  const r = ensemble(WRONG_DOF_SHIFT, n, beta, ensembleSize(n), 'rmt-science/ensemble/' + n + '/' + beta);
  dofControls.push({ rule: 'beta (n - i + 1)', n, beta, matrices: r.matrices, trH2z: round(r.trH2.z, 4), trH4z: round(r.trH4.z, 4), detected: Math.abs(r.trH2.z) > Z_MOMENT && Math.abs(r.trH4.z) > Z_MOMENT });
}
for (const n of [24, 100]) for (const beta of [1, 2]) {
  const M = 1000, r = ensemble(WRONG_DOF_FLAT, n, beta, M, 'rmt-science/ensemble/' + n + '/' + beta), crit = R.kolmogorovCritical(SC_ALPHA, M);
  dofControls.push({ rule: 'beta n', n, beta, matrices: M, trH2z: round(r.trH2.z, 4), trH4z: round(r.trH4.z, 4), semicircleIidKS: round(r.semicircle.iidKS, 4), semicircleCritical: round(crit, 4), detected: Math.abs(r.trH2.z) > Z_MOMENT && r.semicircle.iidKS > crit });
}
assert(dofControls.every(c => c.detected), 'a wrong degrees-of-freedom control was not detected');
log('   smallest |z| under beta (n - i + 1): ' + Math.min(...dofControls.filter(c => c.rule !== 'beta n').map(c => Math.abs(c.trH2z))).toFixed(1));

/* ---------------- 4. spacings against Gaudin-Mehta ---------------- */
log('4. spacings: Gaudin-Mehta by Fredholm determinants');
const GRID = 1000, SMAX = 5;
const exact = {};
for (const beta of [1, 2]) {
  const g = R.gaudinMehta(beta, GRID, SMAX), sur = new Float64Array(GRID + 1).map((_, i) => R.surmiseCdf[beta](i * g.ds));
  let dSur = 0;
  for (let i = 0; i <= GRID; i++) dSur = Math.max(dSur, Math.abs(g.cdf[i] - sur[i]));
  exact[beta] = { cdf: g.cdf, surmise: sur, cv: g.cv, variance: g.variance, surmiseCv: R.surmiseCv[beta], ksExactVsSurmise: dSur, cdfAtZero: g.cdfAtZero, nodeCheck: g.nodeCheck };
  log('   beta ' + beta + ': exact CV ' + g.cv.toFixed(5) + ' (variance ' + g.variance.toFixed(5) + '), surmise CV ' + R.surmiseCv[beta].toFixed(5) + ', sup |F_exact - F_surmise| ' + dSur.toFixed(4));
}
// Unfolding rules: the module's own, and two controls built from it.
const UNFOLD_LOCAL = 'const local = (lam[i + K] - lam[i - K]) / (2 * K);';
const NO_UNFOLD_WINDOW = variant(UNFOLD_LOCAL, 'const local = (lam[Math.floor(n * 0.8)] - lam[Math.floor(n * 0.2)]) / (Math.floor(n * 0.8) - Math.floor(n * 0.2));', 'no unfolding, window kept');
const NO_UNFOLD_ALL = variant('for (let i = Math.floor(n * 0.2); i < Math.floor(n * 0.8); i++) {\n      if (i - K < 0 || i + K >= n) continue;\n      ' + UNFOLD_LOCAL,
  'for (let i = 0; i < n - 1; i++) {\n      const local = (lam[n - 1] - lam[0]) / (n - 1);', 'no unfolding, whole spectrum');
function spacingSample(n, beta, M, seed) {
  const rng = makeRng(seed), d = new Float64Array(n), e = new Float64Array(n), rules = { tab: MOD, noUnfoldingWindow: NO_UNFOLD_WINDOW, noUnfoldingWholeSpectrum: NO_UNFOLD_ALL }, per = {};
  for (const k of Object.keys(rules)) per[k] = [];
  for (let m = 0; m < M; m++) {
    const lam = MOD.betaHermite(rng, n, beta, d, e);
    for (const [k, h] of Object.entries(rules)) { const u = []; h.unfolded(lam, n, u); per[k].push(u); }
  }
  return per;
}
// Pooled KS on the grid and CV, with a matrix-block bootstrap: matrices are independent, spacings in one
// matrix are not, so whole matrices are resampled. The KS critical value is the 99th percentile of
// sup |F*_boot - F_hat| (the bootstrap of the centered empirical process).
function spacingTest(per, beta, seed, reps) {
  const ds = SMAX / GRID, M = per.length;
  const bins = per.map(u => Uint16Array.from(u, s => Math.min(GRID, Math.ceil(s / ds))));
  const s1 = per.map(u => u.reduce((a, b) => a + b, 0)), s2 = per.map(u => u.reduce((a, b) => a + b * b, 0)), cnt = per.map(u => u.length);
  const pooled = w => {
    const h = new Float64Array(GRID + 1);
    let N = 0, a = 0, b = 0;
    for (let k = 0; k < M; k++) { const wk = w ? w[k] : 1; if (!wk) continue; N += wk * cnt[k]; a += wk * s1[k]; b += wk * s2[k]; const bk = bins[k]; for (let i = 0; i < bk.length; i++) h[bk[i]] += wk; }
    let c = 0;
    for (let g = 0; g <= GRID; g++) { c += h[g]; h[g] = c / N; }
    const m = a / N;
    return { cdf: h, cv: Math.sqrt(b / N - m * m) / m, mean: m, N };
  };
  const est = pooled(null), rng = makeRng(seed), dBoot = [], cvBoot = [], mBoot = [], w = new Float64Array(M);
  for (let r = 0; r < reps; r++) {
    w.fill(0);
    for (let k = 0; k < M; k++) w[Math.floor(rng() * M)]++;
    const b = pooled(w);
    let D = 0;
    for (let g = 0; g <= GRID; g++) D = Math.max(D, Math.abs(b.cdf[g] - est.cdf[g]));
    dBoot.push(D); cvBoot.push(b.cv); mBoot.push(b.mean);
  }
  dBoot.sort((p, q) => p - q);
  const sup = F => { let D = 0; for (let g = 0; g <= GRID; g++) D = Math.max(D, Math.abs(est.cdf[g] - F[g])); return D; };
  const cvSe = sdev(cvBoot), X = exact[beta];
  return {
    spacings: est.N, matrices: M, bootstrapReps: reps, meanSpacing: round(est.mean), meanSpacingSe: round(sdev(mBoot), 3),
    cv: round(est.cv), cvSe: round(cvSe, 3), zExact: round((est.cv - X.cv) / cvSe, 4), zSurmise: round((est.cv - X.surmiseCv) / cvSe, 4),
    ksExact: round(sup(X.cdf), 4), ksSurmise: round(sup(X.surmise), 4), ksCritical99: round(dBoot[Math.floor(0.99 * reps)], 4),
  };
}
const spacing = [];
const SPACING_RUNS = [[400, 1, 3000, 2000], [400, 2, 3000, 2000], [150, 1, 2000, 1000], [150, 2, 2000, 1000]];
for (const [n, beta, M, reps] of SPACING_RUNS) {
  const per = spacingSample(n, beta, M, 'rmt-science/spacing/' + n + '/' + beta), row = { n, beta };
  for (const k of Object.keys(per)) row[k] = spacingTest(per[k], beta, 'rmt-science/bootstrap/' + n + '/' + beta + '/' + k, reps);
  spacing.push(row);
  const t = row.tab;
  log('   n ' + n + ' beta ' + beta + ': CV ' + t.cv.toFixed(4) + ' +/- ' + t.cvSe.toFixed(4) + ' (' + t.zExact.toFixed(1) + ' sigma from Gaudin-Mehta, ' + t.zSurmise.toFixed(1) + ' from surmise); KS exact ' + t.ksExact.toFixed(4) + ', surmise ' + t.ksSurmise.toFixed(4) + ', critical ' + t.ksCritical99.toFixed(4) + '; no-unfolding KS ' + row.noUnfoldingWindow.ksExact.toFixed(4) + ' (window), ' + row.noUnfoldingWholeSpectrum.ksExact.toFixed(4) + ' (whole)');
}
const Z_SPACING = R.bonferroniZ(0.001, 4);
log("   spacing z threshold " + Z_SPACING.toFixed(3));
for (const row of spacing.filter(r => r.n === 400)) {
  assert(row.tab.ksExact < row.tab.ksCritical99, 'unfolded spacings differ from Gaudin-Mehta at n = 400');
  assert(Math.abs(row.tab.zExact) < Z_SPACING, 'unfolded CV differs from Gaudin-Mehta at n = 400');
  assert(row.noUnfoldingWholeSpectrum.ksExact > 10 * row.tab.ksCritical99 && Math.abs(row.noUnfoldingWholeSpectrum.zExact) > Z_SPACING, 'no-unfolding control was not detected');
}
// The surmise is rejected at beta = 1 by both statistics: the test can tell the approximation from the law.
assert(spacing.find(r => r.n === 400 && r.beta === 1).tab.ksSurmise > spacing.find(r => r.n === 400 && r.beta === 1).tab.ksCritical99);

/* ---------------- 5. the status line's spacing spread ---------------- */
log('5. printed spacing spread');
async function printedSpread(recipe) {
  // The status line prints the spread through compare(): "<b>value ± error</b>", to the error's precision.
  const run = await runTab(MOD, recipe), m = /unfolded spacing spread <b>([\d.]+) ± ([\d.]+)<\/b>/.exec(run.statusHtml);
  assert(m, 'status line carries no spacing spread with an error bar');
  // Rebuild what buildSpectra pooled: whole rows while fewer than 40000 spacings were held.
  const rows = [];
  let held = 0;
  for (const r of run.audit.series) { if (held >= 40000) break; const u = []; MOD.unfolded(r.lam, run.state.n, u); rows.push(u); held += u.length; }
  const all = rows.flat(), mu = mean(all), cvPop = Math.sqrt(all.reduce((a, b) => a + (b - mu) ** 2, 0) / all.length) / mu;
  const digits = (m[1].split('.')[1] || '').length;
  assert(Math.abs(cvPop - Number(m[1])) <= 0.5 * 10 ** -digits + 1e-12, 'recomputed spread differs from the printed one');
  const t = spacingTest(rows, run.state.beta, 'rmt-science/printed/' + run.state.beta, 2000), X = exact[run.state.beta];
  // The printed error bar is the module's own row bootstrap (200 draws); it must agree with this one (2000 draws).
  const barRatio = Number(m[2]) / t.cvSe;
  assert(barRatio > 0.67 && barRatio < 1.5, 'printed error bar ' + m[2] + ' disagrees with the row bootstrap ' + t.cvSe.toFixed(4));
  return { recipe, seed: run.state.seed, printed: Number(m[1]), printedError: Number(m[2]), errorRatio: round(barRatio, 3), printedSurmise: MOD.SURMISE[run.state.beta.toFixed(2)], rows: rows.length, spacings: all.length, cvSe: t.cvSe,
    gaudinMehtaCv: round(X.cv), zGaudinMehta: round((cvPop - X.cv) / t.cvSe, 3), surmiseCv: round(X.surmiseCv), zSurmise: round((cvPop - X.surmiseCv) / t.cvSe, 3), statusHtml: run.statusHtml };
}

/* ---------------- 6. Dyson paths ---------------- */
function goeIndependent(rng, n) {
  // The GOE of the tab's normalization, rebuilt from the model: N(0, 2) diagonal, N(0, 1) above it,
  // drawn row by row over the lower triangle as the ensemble definition in the module states.
  const A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) { A[i * n + i] = Math.SQRT2 * rng.gauss(); for (let j = 0; j < i; j++) { const v = rng.gauss(); A[i * n + j] = v; A[j * n + i] = v; } }
  return A;
}
async function dysonCheck(hooks, seeds, recipe, jacobiSeeds) {
  const lagsT = [0.5, 1, 2, 4], perSeed = [];
  let worstJacobi = 0, slicesChecked = 0;
  for (let si = 0; si < seeds; si++) {
    const seed = 'rmt-science/dyson/' + si, run = await runTab(hooks, Object.assign({ seed }, recipe)), s = run.state, n = s.paths, T = s.slices, delta = s.span / T;
    const series = run.audit.series.map(r => r.lam);
    if (si < jacobiSeeds) {
      const rng = makeRng(seed + '/dyson'), a = Math.exp(-delta / 2), b = Math.sqrt(1 - Math.exp(-delta));
      let H = goeIndependent(rng, n);
      for (let t = 0; t < T; t++) {
        if (t > 0) { const G = goeIndependent(rng, n); for (let i = 0; i < n * n; i++) H[i] = a * H[i] + b * G[i]; }
        let fro = 0;
        for (const v of H) fro += v * v;
        const ref = R.jacobiEigenvalues(H, n), tol = 8 * n * Number.EPSILON * Math.sqrt(fro);
        for (let i = 0; i < n; i++) worstJacobi = Math.max(worstJacobi, Math.abs(series[t][i] - ref[i]) / tol);
        slicesChecked++;
      }
    }
    const tr = series.map(l => l.reduce((p, q) => p + q, 0)), tr2 = series.map(l => l.reduce((p, q) => p + q * q, 0));
    // Known mean 0 and variance 2n of Tr H make the lag-product estimator unbiased.
    const rho = lagsT.map(L => { const k = Math.round(L / delta); let acc = 0; for (let t = 0; t + k < T; t++) acc += tr[t] * tr[t + k]; return acc / (T - k) / (2 * n); });
    perSeed.push({ stationary: mean(tr2) / (n * n + n), rho });
  }
  const stat = perSeed.map(p => p.stationary);
  return {
    seeds, recipe, jacobiSlices: slicesChecked, worstJacobiOverTolerance: worstJacobi,
    trH2OverExact: { mean: round(mean(stat)), se: round(se(stat), 3), z: round((mean(stat) - 1) / se(stat), 3) },
    autocorrelation: lagsT.map((L, i) => { const v = perSeed.map(p => p.rho[i]), exp = Math.exp(-L / 2); return { lag: L, exact: round(exp), mean: round(mean(v)), se: round(se(v), 3), z: round((mean(v) - exp) / se(v), 3) }; }),
  };
}

/* ---------------- 7. print through the studio ---------------- */
const FIXTURES = [
  { name: 'gue', params: { mode: 'rows', n: 140, beta: 2, rows: 180, norm: 'global', ink: 'spacing', tickH: 0.85, tickW: 1.8, aspect: '1:1' } },
  { name: 'semicircle', params: { mode: 'rows', n: 260, beta: 1, rows: 260, norm: 'global', ink: 'position', tickH: 1, tickW: 1, aspect: '4:5' } },
  { name: 'sweep', params: { mode: 'sweep', n: 150, rows: 200, betaLo: 0.04, betaHi: 12, logSweep: true, norm: 'row', ink: 'row', tickH: 0.9, tickW: 1.6, aspect: '5:4' } },
  { name: 'crystal', params: { mode: 'rows', n: 120, beta: 18, rows: 160, norm: 'row', ink: 'position', tickH: 0.95, tickW: 2, aspect: '1:1', shift: 3 } },
  { name: 'dyson', params: { mode: 'dyson', paths: 40, slices: 1000, span: 10, ink: 'row', tickW: 1.3, alpha: 0.9, norm: 'global', aspect: '3:2' } },
];
const PRINT_SIZE = { '1:1': [2400, 2400], '4:5': [1920, 2400], '5:4': [2400, 1920], '3:2': [2400, 1600] };

// Independent eigenvalues for a studio recipe: the tridiagonals drawn by the module's sampler on the
// recipe's stream, solved by Sturm bisection; Dyson slices rebuilt and solved by Jacobi rotations.
function independentSpectra(state) {
  if (state.mode === 'dyson') {
    const rng = makeRng(state.seed + '/dyson'), n = state.paths, T = state.slices, delta = state.span / T, a = Math.exp(-delta / 2), b = Math.sqrt(Math.max(0, 1 - Math.exp(-delta)));
    let H = goeIndependent(rng, n);
    const out = [];
    const tol = [];
    for (let t = 0; t < T; t++) {
      if (t > 0) { const G = goeIndependent(rng, n); for (let i = 0; i < n * n; i++) H[i] = a * H[i] + b * G[i]; }
      out.push(Array.from(R.jacobiEigenvalues(H, n)));
      tol.push(8 * n * Number.EPSILON * Math.sqrt(H.reduce((p, q) => p + q * q, 0)));
    }
    return { spectra: out, tol, node: null };
  }
  const rng = makeRng(state.seed + '/rmt'), n = state.n, d = new Float64Array(n), e = new Float64Array(n), out = [], node = [], tol = [];
  let cap = null;
  MOD.onTridiag = (dd, ee) => { cap = { d: Float64Array.from(dd), e: Float64Array.from(ee) }; };
  for (let j = 0; j < state.rows; j++) {
    const t = state.rows > 1 ? j / (state.rows - 1) : 0;
    const beta = state.mode !== 'sweep' ? state.beta : state.logSweep ? state.betaLo * Math.pow(state.betaHi / state.betaLo, t) : state.betaLo + (state.betaHi - state.betaLo) * t;
    node.push(MOD.betaHermite(rng, n, beta, d, e));
    const ref = R.sturmEigenvalues(cap.d, cap.e, n);
    out.push(Array.from(ref.values)); tol.push(4 * n * Number.EPSILON * ref.norm);
  }
  MOD.onTridiag = null;
  return { spectra: out, tol, node };
}

// Runs in the page. Rebuilds every mark from the independent spectra with its own layout and color
// rule, compares the SVG attribute by attribute, and compares exportPNG with an independent painting.
const PRINT = async ({ spectra, colorSpectra, w, h }) => {
  const e = Studio.auditInstances().rmt, s = e.state, U = Studio.util;
  const ramp = U.makeRamp(s.palette), lut = [];
  for (let i = 0; i < 256; i++) { const c = ramp(i / 255); lut.push('rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'); }
  // The documented rule: t in [0, 1] indexes the 256-entry ramp, and the palette offset turns it by 16
  // entries per step, wrapping over the 256 entries, so t = 1 keeps the top colour at offset 0.
  const pick = t => lut[(Math.max(0, Math.min(255, Math.round(t * 255))) + 16 * (((Math.round(s.shift) % 16) + 16) % 16)) % 256];
  if (s.shift === 0 && (pick(1) !== lut[255] || pick(0) !== lut[0])) throw Error('the reference colour rule wraps the ramp');
  const color = (rowIdx, i, n, lam, sc, rows) => {
    if (s.ink === 'flat') return pick(0.72);
    if (s.ink === 'row') return pick(rows > 1 ? rowIdx / (rows - 1) : 0.5);
    if (s.ink === 'spacing') {
      const a = i > 0 ? lam[i] - lam[i - 1] : lam[1] - lam[0], b = i < n - 1 ? lam[i + 1] - lam[i] : lam[n - 1] - lam[n - 2];
      const g = 0.5 * (a + b), m = (lam[n - 1] - lam[0]) / (n - 1);
      return pick(Math.min(1, Math.max(0, 0.5 + 0.5 * Math.log(Math.max(g, 1e-9) / Math.max(m, 1e-9)) / 1.2)));
    }
    return pick(Math.min(1, Math.max(0, 0.5 + 0.5 * lam[i] / sc)));
  };
  const mx = w * s.margin, my = h * s.margin, L = { x0: mx, y0: my, w: w - 2 * mx, h: h - 2 * my };
  const maxAbs = l => l.reduce((m, v) => Math.max(m, Math.abs(v)), 0), global = spectra.reduce((m, l) => Math.max(m, maxAbs(l)), 0);
  const marks = [];
  if (s.mode === 'dyson') {
    const T = spectra.length, n = spectra[0].length, lw = Math.max(0.4, s.tickW * w / 1400);
    for (let i = 0; i < n; i++) {
      const pts = [];
      for (let t = 0; t < T; t++) pts.push(L.x0 + L.w * t / (T - 1), L.y0 + L.h * (0.5 - 0.5 * spectra[t][i] / global));
      marks.push({ pts, lw, color: color(i, i, n, colorSpectra[T - 1], global, n) });
    }
  } else {
    const rows = spectra.length, n = spectra[0].length, pitch = L.h / rows, th = Math.max(0.5, pitch * s.tickH), tw = Math.max(0.35, s.tickW * w / 1400);
    for (let j = 0; j < rows; j++) {
      const lam = spectra[j], sc = s.norm === 'row' ? maxAbs(lam) : global, yc = L.y0 + (j + 0.5) * pitch, csc = s.norm === 'row' ? maxAbs(colorSpectra[j]) : colorSpectra.reduce((m, l) => Math.max(m, maxAbs(l)), 0);
      for (let i = 0; i < n; i++) marks.push({ x: L.x0 + L.w * (0.5 + 0.5 * lam[i] / sc) - tw / 2, y: yc - th / 2, w: tw, h: th, color: color(j, i, n, colorSpectra[j], csc, rows) });
    }
  }
  // SVG, the vector file the shell's RIP rasterizes for a print.
  const svg = new DOMParser().parseFromString(await (await e.inst.exportSVG(w, h)).text(), 'image/svg+xml');
  const bg = svg.querySelector('svg > rect');
  if (!bg || bg.getAttribute('fill').toLowerCase() !== s.bg.toLowerCase()) throw Error('Wrong SVG background');
  const group = svg.querySelector('g');
  if (Number(group.getAttribute('opacity')) !== s.alpha) throw Error('Wrong SVG opacity');
  let coordinateError = 0, coordinates = 0;
  if (s.mode === 'dyson') {
    const lines = [...group.querySelectorAll('polyline')];
    if (lines.length !== marks.length) throw Error('Wrong polyline count');
    lines.forEach((p, i) => {
      const v = p.getAttribute('points').split(/[ ,]/).map(Number), m = marks[i];
      if (v.length !== m.pts.length) throw Error('Wrong vertex count');
      for (let k = 0; k < v.length; k++) { coordinateError = Math.max(coordinateError, Math.abs(v[k] - m.pts[k])); coordinates++; }
      if (p.getAttribute('stroke') !== m.color) throw Error('Wrong path ink');
      if (Math.abs(Number(p.getAttribute('stroke-width')) - m.lw) > 0.00501) throw Error('Wrong stroke width');
    });
  } else {
    const rects = [...group.querySelectorAll('rect')];
    if (rects.length !== marks.length) throw Error('Wrong tick count ' + rects.length + ' vs ' + marks.length);
    rects.forEach((r, i) => {
      const m = marks[i];
      for (const [k, v] of [['x', m.x], ['y', m.y], ['width', m.w], ['height', m.h]]) { coordinateError = Math.max(coordinateError, Math.abs(Number(r.getAttribute(k)) - v)); coordinates++; }
      if (r.getAttribute('fill') !== m.color) throw Error('Wrong tick ink at ' + i);
    });
  }
  if (coordinateError > 0.00501) throw Error('Vector coordinate error ' + coordinateError);
  // PNG fallback against an independent painting, and the same painting displaced by one pixel.
  const blob = await e.inst.exportPNG(w, h), bitmap = await createImageBitmap(blob), c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(bitmap, 0, 0); bitmap.close();
  const actual = ctx.getImageData(0, 0, w, h).data;
  ctx.globalAlpha = 1; ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = s.alpha;
  if (s.mode === 'dyson') {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const m of marks) { ctx.lineWidth = m.lw; ctx.beginPath(); for (let k = 0; k < m.pts.length; k += 2) (k ? ctx.lineTo : ctx.moveTo).call(ctx, m.pts[k], m.pts[k + 1]); ctx.strokeStyle = m.color; ctx.stroke(); }
  } else for (const m of marks) { ctx.fillStyle = m.color; ctx.fillRect(m.x, m.y, m.w, m.h); }
  ctx.globalAlpha = 1;
  const reference = ctx.getImageData(0, 0, w, h).data;
  let max = 0, sum = 0, displaced = 0;
  for (let i = 0; i < actual.length; i++) { const d = Math.abs(actual[i] - reference[i]); max = Math.max(max, d); sum += d; if (Math.abs(actual[i] - reference[(i + 4) % reference.length]) > 2) displaced++; }
  if (max > 1 || displaced < 100) throw Error(JSON.stringify({ max, displaced }));
  // The shell's vector RIP: the SVG decoded as an image and drawn over the background at print size.
  // Recorded against the same independent painting; SVG group opacity composites overlapping marks
  // once where the canvas applies alpha per mark, so overlaps are expected to differ slightly.
  const url = URL.createObjectURL(await e.inst.exportSVG(w, h)), im = new Image();
  await new Promise((ok, bad) => { im.onload = ok; im.onerror = bad; im.src = url; });
  ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, 0, 0, w, h); URL.revokeObjectURL(url);
  const rip = ctx.getImageData(0, 0, w, h).data;
  let ripMax = 0, ripSum = 0, ripOver2 = 0;
  for (let i = 0; i < rip.length; i++) { const d = Math.abs(rip[i] - reference[i]); ripMax = Math.max(ripMax, d); ripSum += d; if (d > 2) ripOver2++; }
  return { width: w, height: h, marks: marks.length, svgCoordinates: coordinates, maxSvgCoordinateError: coordinateError, maxChannelError: max, meanChannelError: sum / actual.length, channelsChecked: actual.length, displacedPrintFailureChannels: displaced,
    vectorRip: { maxChannelDifference: ripMax, meanChannelDifference: ripSum / rip.length, fractionOver2Levels: ripOver2 / rip.length } };
};

async function printEvidence() {
  const { chromium } = require('playwright');
  const injected = source.replace(MARK_RETURN, AUDIT + MARK_RETURN);
  const html = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8');
  assert(html.includes(source), 'dist/studio.html is stale: run node tools/build.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rmt-science-')), file = path.join(dir, 'studio.html');
  fs.writeFileSync(file, html.replace(source, injected).replace('generatePalette, register, boot,', 'generatePalette, register, auditInstances:()=>instances, boot,'));
  const browser = await chromium.launch(), cases = [];
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + file + '#rmt/review');
    await page.evaluate(() => Studio.ready);
    // Let the boot plate finish: a hash applied while the boot hash is still being applied can race it.
    const built = seed => page.waitForFunction(seed => { const e = Studio.auditInstances().rmt; if (!e || Studio.getRecipe()?.seed !== seed) return false; const a = e.inst.auditRead(); return a.series && !a.building; }, seed, { timeout: 300000, polling: 200 });
    await built('review');
    for (const fx of FIXTURES) {
      const seed = 'rmt-science-' + fx.name, params = Object.assign({ grain: 0 }, fx.params);
      await page.evaluate(({ seed, params }) => { location.hash = 'rmt/' + seed + '/' + btoa(JSON.stringify(Object.assign({}, params, { v: 2 }))); }, { seed, params });
      await built(seed);
      const read = () => page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), state: Studio.auditInstances().rmt.state, audit: Studio.auditInstances().rmt.inst.auditRead(), status: Studio.auditInstances().rmt.statusHtml }));
      const before = await read(), got = JSON.parse(before), s = got.state, studio = got.audit.series.map(r => r.lam);
      // The studio computed exactly what the extracted module computes in Node, and that agrees with
      // the independent solver to the backward-error tolerance.
      // Chromium and Node round a few library functions (Math.pow, Math.log) differently in the last
      // bit, so the studio and Node spectra are compared to the solver tolerance, not bit for bit.
      const node = await runTab(MOD, Object.assign({}, s)), nodeSpectra = node.audit.series.map(r => r.lam);
      const ind = independentSpectra(s);
      if (ind.node) assert.deepEqual(nodeSpectra, ind.node, fx.name + ': the module run and the direct sampler differ');
      let worst = 0, worstNode = 0, identical = 0;
      studio.forEach((lam, j) => lam.forEach((v, i) => {
        worst = Math.max(worst, Math.abs(v - ind.spectra[j][i]) / ind.tol[j]);
        worstNode = Math.max(worstNode, Math.abs(v - nodeSpectra[j][i]) / ind.tol[j]);
        if (v === nodeSpectra[j][i]) identical++;
      }));
      assert(worst <= 1, fx.name + ': studio spectra differ from the independent solver');
      assert(worstNode <= 1, fx.name + ': studio spectra differ from the Node run');
      const m = /unfolded spacing spread <b>([\d.]+)<\/b>/.exec(got.status), mn = /unfolded spacing spread <b>([\d.]+)<\/b>/.exec(node.statusHtml);
      if (s.mode === 'rows') assert.equal(m && m[1], mn && mn[1], fx.name + ': printed spread differs from Node');
      const [w, h] = PRINT_SIZE[s.aspect];
      const print = await page.evaluate(PRINT, { spectra: ind.spectra, colorSpectra: studio, w, h });
      assert.equal(before, await read(), fx.name + ': export changed the recipe or spectra');
      cases.push({ name: fx.name, seed, parameters: s, spectra: studio.length, perSpectrum: studio[0].length, spectraSha256: sha(JSON.stringify(studio)), studioVsNodeOverTolerance: round(worstNode, 4), bitIdenticalToNode: identical / (studio.length * studio[0].length), worstIndependentErrorOverTolerance: round(worst, 4), printedSpread: m ? Number(m[1]) : null, print, statePreserved: true });
      log('   PASS ' + fx.name + ': ' + print.marks + ' marks, SVG error ' + print.maxSvgCoordinateError.toFixed(4) + ' px, PNG max ' + print.maxChannelError);
    }
    assert.deepEqual(errors, []);
    return { cases, chromium: browser.version() };
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

(async () => {
  const printed = [];
  for (const recipe of [{ mode: 'rows', n: 140, beta: 2, rows: 180, seed: 'dyson-1962' }, { mode: 'rows', n: 260, beta: 1, rows: 260, seed: 'dyson-1962' }]) {
    const p = await printedSpread(recipe);
    printed.push(p);
    log('   beta ' + recipe.beta + ' preset: printed ' + p.printed.toFixed(3) + ' +/- ' + p.cvSe.toFixed(3) + ' (block bootstrap), ' + p.zGaudinMehta.toFixed(1) + ' sigma from Gaudin-Mehta ' + p.gaudinMehtaCv.toFixed(3) + ', ' + p.zSurmise.toFixed(1) + ' sigma from the surmise it prints');
  }
  log('6. Dyson paths');
  const DYSON = { mode: 'dyson', paths: 24, slices: 480, span: 24 };
  const dyson = await dysonCheck(MOD, 48, DYSON, 4);
  const Z_DYSON = R.bonferroniZ(0.001, 5);
  assert(dyson.worstJacobiOverTolerance <= 1, 'Dyson eigenvalues differ from Jacobi');
  assert(Math.abs(dyson.trH2OverExact.z) < Z_DYSON && dyson.autocorrelation.every(a => Math.abs(a.z) < Z_DYSON), 'Dyson stationarity or decay test failed');
  const dysonControl = await dysonCheck(WRONG_OU, 48, DYSON, 0);
  const controlDetected = Math.abs(dysonControl.trH2OverExact.z) > Z_DYSON || dysonControl.autocorrelation.some(a => Math.abs(a.z) > Z_DYSON);
  assert(controlDetected, 'wrong OU decay control was not detected');
  log('   Jacobi worst ' + dyson.worstJacobiOverTolerance.toFixed(3) + ' of tolerance over ' + dyson.jacobiSlices + ' slices; Tr H^2 ratio ' + dyson.trH2OverExact.mean + ' +/- ' + dyson.trH2OverExact.se + '; rho(1) ' + dyson.autocorrelation[1].mean + ' +/- ' + dyson.autocorrelation[1].se + ' vs ' + dyson.autocorrelation[1].exact + '; wrong-decay control z ' + dysonControl.autocorrelation[1].z);

  log('7. print through the studio');
  const print = await printEvidence();
  const seconds = (performance.now() - started) / 1000;
  const result = {
    date: new Date().toISOString().slice(0, 10), tool: 'tools/rmt-science.js', sourceSha256: sha(source), engineSha256: sha(engine), referenceSha256: sha(fs.readFileSync(path.join(__dirname, 'lib/rmt-reference.js'), 'utf8')),
    scope: 'Dumitriu-Edelman tridiagonal sampler and QL eigenvalues of src/modules/rmt.js: exact second and fourth spectral moments, semicircle convergence, Gaudin-Mehta spacing law and the printed spacing spread at beta 1 and 2, exact Ornstein-Uhlenbeck Dyson statistics, and five complete studio prints. Finite samples from the seeded generator.',
    normalization: 'The tab samples diagonal N(0,2) and subdiagonal chi_{beta(n-i)} without the 1/sqrt(2) of Dumitriu and Edelman, so its eigenvalue density is proportional to prod|l_i - l_j|^beta exp(-sum l^2 / 4) and the spectrum edge is 2 sqrt(beta n). The displayed equation writes exp(-sum l^2 / 2).',
    eigenvalues: { tolerance: '4 n eps ||T||_inf (Gershgorin norm)', cases: EIG_CASES, perCase: 5, ...eigen, control: { rule: 'deflate when |e| <= 1e-4 (|d_m| + |d_m+1|)', ...eigenControl, detected: true } },
    moments: { familyAlpha: 0.001, tests: MOMENT_TESTS, zThreshold: round(Z_MOMENT, 5), formulae: { trH2: '2n + beta n (n - 1)', trH4: '12n + 10 beta n (n - 1) + beta^2 n (n - 1)(2n - 3)', varTrH2: '8n + 4 beta n (n - 1)' },
      ensembles: ensembles.map(r => ({ n: r.n, beta: r.beta, matrices: r.matrices, seed: r.seed, trH2: mapRound(r.trH2), trH4: mapRound(r.trH4) })), controls: dofControls },
    semicircle: { scaling: 'x = lambda / (2 sqrt(beta n))', familyAlpha: 0.001, tests: SC_TESTS, iidTest: 'one eigenvalue per matrix at a uniformly drawn index, Kolmogorov critical value with Stephens correction',
      ensembles: ensembles.map(r => ({ n: r.n, beta: r.beta, matrices: r.matrices, ...mapRound(r.semicircle) })), convergence },
    spacings: { unfolding: 'module unfolded(): central 60 percent of each spectrum, each gap over the mean of the 24 gaps around it', grid: { points: GRID + 1, sMax: SMAX }, bootstrap: 'whole matrices resampled; KS critical value = 99th percentile of sup|F*-F_hat|; CV error = bootstrap standard deviation',
      exact: Object.fromEntries(Object.entries(exact).map(([b, x]) => [b, { cv: round(x.cv, 7), variance: round(x.variance, 7), surmiseCv: round(x.surmiseCv, 7), ksExactVsSurmise: round(x.ksExactVsSurmise, 4), cdfAtZero: x.cdfAtZero, quadratureNodeChange30to40: x.nodeCheck }])),
      zThreshold: round(Z_SPACING, 5), runs: spacing },
    printedSpread: printed,
    dyson: { ...dyson, zThreshold: round(Z_DYSON, 5), control: { rule: 'OU factor exp(-delta) in place of exp(-delta/2)', trH2OverExact: dysonControl.trH2OverExact, autocorrelation: dysonControl.autocorrelation, detected: controlDetected } },
    print: print.cases,
    environment: { node: process.version, chromium: print.chromium, platform: process.platform, arch: process.arch, cpus: os.cpus().length },
    runtimeSeconds: round(seconds, 4), passed: true,
  };
  if (WRITE) fs.writeFileSync(path.join(root, 'validation/results/rmt-science.json'), JSON.stringify(result, null, 2) + '\n');
  log('PASS random-matrix numerical and print review in ' + seconds.toFixed(0) + ' s' + (WRITE ? ' (written)' : ''));
})().catch(e => { console.error(e); process.exitCode = 1; });

function mapRound(o) { const out = {}; for (const [k, v] of Object.entries(o)) out[k] = typeof v === 'number' ? round(v, 7) : v; return out; }
