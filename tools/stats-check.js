// node tools/stats-check.js
// Checks the shared uncertainty harness (src/shared/stats.js) against processes whose answers are known
// in closed form, with a negative control that must fail: the naive standard error on a correlated
// series has to undercover, or this test could not tell a correct error bar from a wrong one.
'use strict';
const S = require('../src/shared/stats.js');

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
  if (!ok) failures++;
}
function gauss(rng) {
  let u = 0; while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
// AR(1): x_t = phi x_{t-1} + e_t. Exact tau_int = (1 + phi) / (2 (1 - phi)) in the 1/2 convention.
function ar1(n, phi, rng) {
  const x = new Float64Array(n);
  let v = gauss(rng) / Math.sqrt(1 - phi * phi);
  for (let i = 0; i < n; i++) { v = phi * v + gauss(rng); x[i] = v; }
  return x;
}

// 1. tau_int of a long AR(1) series.
{
  const rng = S.seeded('tau'), phi = 0.9, exact = (1 + phi) / (2 * (1 - phi));
  const t = S.tauInt(ar1(200000, phi, rng));
  check('tau_int of AR(1), phi 0.9', Math.abs(t.tau - exact) / exact < 0.08 && t.reliable,
    'measured ' + t.tau.toFixed(2) + ', exact ' + exact.toFixed(2) + ', window ' + t.window);
}

// 2. Coverage of the 95% interval from seriesMean, and the negative control.
{
  const rng = S.seeded('coverage'), phi = 0.8, runs = 400, n = 4000;
  let covered = 0, naiveCovered = 0;
  for (let r = 0; r < runs; r++) {
    const x = ar1(n, phi, rng), m = S.seriesMean(x), naive = Math.sqrt(S.variance(x) / n);
    if (Math.abs(m.mean) <= 1.96 * m.se) covered++;
    if (Math.abs(m.mean) <= 1.96 * naive) naiveCovered++;
  }
  const c = covered / runs, cn = naiveCovered / runs;
  check('seriesMean 95% interval covers the true mean', c > 0.91 && c < 0.985, 'coverage ' + c.toFixed(3) + ' over ' + runs + ' runs');
  check('negative control: naive sd/sqrt(n) undercovers', cn < 0.6, 'coverage ' + cn.toFixed(3));
}

// 3. Blocking and the block bootstrap agree with tau_int on the same series.
{
  // Averaged over 12 series, because one series' error estimate is itself noisy by 10 to 30 percent.
  const rng = S.seeded('agree'), exact = Math.sqrt(1 / (1 - 0.81)) * Math.sqrt(19 / 65536);
  let rb = 0, rt = 0, rs = 0, first = null;
  for (let r = 0; r < 12; r++) {
    const x = ar1(65536, 0.9, rng);
    rt += S.seriesMean(x).se / exact / 12; rb += S.blocking(x).se / exact / 12;
    const boot = S.blockBootstrap(x, S.mean, { seed: 'agree/boot/' + r, reps: 200 });
    rs += boot.se / exact / 12;
    if (!first) first = { x, se: boot.se };
  }
  check('tau_int error matches the exact error', Math.abs(rt - 1) < 0.1, rt.toFixed(3) + ' x exact');
  check('blocking error is conservative and close', rb > 0.95 && rb < 1.25, rb.toFixed(3) + ' x exact');
  check('block bootstrap error matches', Math.abs(rs - 1) < 0.2, rs.toFixed(3) + ' x exact');
  check('bootstrap reprints from its seed', S.blockBootstrap(first.x, S.mean, { seed: 'agree/boot/0', reps: 200 }).se === first.se);
}

// 4. A correlated field: tile means give a larger, honest error than the naive one.
{
  const rng = S.seeded('field'), W = 256, H = 256, raw = new Float64Array(W * H), f = new Float64Array(W * H);
  for (let i = 0; i < raw.length; i++) raw[i] = gauss(rng);
  const R = 3;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) s += raw[((y + dy + H) % H) * W + ((x + dx + W) % W)];
    f[y * W + x] = s;
  }
  // On the torus every raw value enters 49 cells, so mean(f) = 49 mean(raw) exactly: se = 49 / sqrt(N).
  const white = S.fieldMean(raw, W, H), smooth = S.fieldMean(f, W, H), naive = Math.sqrt(S.variance(f) / f.length);
  const exactWhite = 1 / Math.sqrt(W * H), exactSmooth = 49 / Math.sqrt(W * H);
  check('fieldMean on white noise matches 1/sqrt(N)', Math.abs(white.se / exactWhite - 1) < 0.15, (white.se / exactWhite).toFixed(3) + ' x exact');
  check('fieldMean on a smoothed field matches the exact error', Math.abs(smooth.se / exactSmooth - 1) < 0.15 && smooth.reliable,
    (smooth.se / exactSmooth).toFixed(3) + ' x exact, tau ' + smooth.tauX.toFixed(2) + ' x ' + smooth.tauY.toFixed(2) + ', tiles ' + (smooth.seTiles / exactSmooth).toFixed(2) + ' x exact');
  check('negative control: naive field error is far too small', naive < 0.3 * exactSmooth, (naive / exactSmooth).toFixed(3) + ' x exact');
}

// 5. A slope along one autocorrelated trajectory.
{
  const rng = S.seeded('slope'), runs = 120, n = 400;
  let covered = 0, olsCovered = 0;
  for (let r = 0; r < runs; r++) {
    const xs = Array.from({ length: n }, (_, i) => i / n), noise = ar1(n, 0.9, rng), ys = xs.map((x, i) => 2 * x + 0.1 * noise[i]);
    const fit = S.slopeBootstrap(xs, ys, { seed: 'slope/' + r, reps: 120 });
    if (Math.abs(fit.slope - 2) <= 1.96 * fit.se) covered++;
    // OLS standard error assuming independent residuals.
    const f = S.ols(xs, ys), res = ys.map((y, i) => y - f.intercept - f.slope * xs[i]);
    const s2 = res.reduce((a, e) => a + e * e, 0) / (n - 2), mx = S.mean(xs);
    const olsSe = Math.sqrt(s2 / xs.reduce((a, x) => a + (x - mx) * (x - mx), 0));
    if (Math.abs(fit.slope - 2) <= 1.96 * olsSe) olsCovered++;
  }
  check('block-bootstrap slope covers', covered / runs > 0.82, 'coverage ' + (covered / runs).toFixed(3));
  check('negative control: OLS error on one trajectory undercovers', olsCovered / runs < covered / runs - 0.15, 'coverage ' + (olsCovered / runs).toFixed(3));
}

// 6. Hill estimator on a Pareto tail.
{
  const rng = S.seeded('hill'), alpha = 2, v = Array.from({ length: 50000 }, () => Math.pow(1 - rng(), -1 / alpha));
  const h = S.hill(v, 2000);
  check('Hill estimator recovers alpha', Math.abs(h.alpha - alpha) < 3 * h.se, 'alpha ' + h.alpha.toFixed(3) + ' ± ' + h.se.toFixed(3));
}

// 7. compare(): the gate.
{
  const s = S.compare({ label: 'fitted β', measured: 0.3071, uncertainty: 0.0123, expected: 1 / 3, reference: 'KPZ', basis: 'sampled', method: '12 seeds' });
  check('sampled comparison prints value, error and sigmas', /0\.307 ± 0\.012/.test(s) && /2\.1σ low/.test(s) && /data-basis="sampled"/.test(s), s);
  check('exact comparison says so', /exact, no sampling error/.test(S.compare({ label: 'tilings', measured: 20, expected: 20, basis: 'exact' })));
  const throws = f => { try { f(); return false; } catch (e) { return true; } };
  check('a comparison without a basis is refused', throws(() => S.compare({ label: 'x', measured: 1, expected: 1 })));
  check('a sampled comparison without an error bar is refused', throws(() => S.compare({ label: 'x', measured: 1, expected: 1, basis: 'sampled' })));
  check('a sampled comparison without a method is refused', throws(() => S.compare({ label: 'x', measured: 1, expected: 1, basis: 'sampled', uncertainty: 0.1 })));
  const pending = S.compare({ label: 'x', measured: 1.2, expected: 1, basis: 'sampled', pending: 'fewer than 20 samples' });
  check('a pending error bar prints no verdict', /error bar pending/.test(pending) && !/σ/.test(pending), pending);
  check('labels are escaped', !/<i>/.test(S.compare({ label: '<i>x</i>', measured: 1, basis: 'deterministic' })));
}

console.log(failures ? failures + ' check(s) failed' : 'stats harness OK');
process.exitCode = failures ? 1 : 0;
