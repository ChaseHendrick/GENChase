/* modules/growdomain.js */
/* GENChase · Turing patterns on a uniformly growing domain: Schnakenberg and Gierer-Meinhardt kinetics in Lagrangian coordinates, with the dilution term that makes a growing sheet insert new stripes instead of stretching the old ones. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const PI = Math.PI;
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // How much arithmetic one plate is allowed, counted in cell updates (one species pair, one step, one
  // cell). Measured rather than guessed, and quoted with the machine it was measured on rather than
  // with an imaginary laptop: headless Chromium in a container runs the line loop at about 5.3e7 cell
  // updates a second and the square loop at about 3.2e7, the difference being the extra index
  // arithmetic. The default sheet is 105 million updates and builds in 2.0 seconds, the plane preset
  // 97 million in 3.0 seconds, both timed from the first status that says building to the last. A
  // faster machine finishes sooner; the point of the ceiling is that no recipe can ask for much more.
  // sanitize() holds every recipe under it by raising the growth rate and then, if that is not enough,
  // lowering the growth factor; nothing here ever buys speed by enlarging the time step.
  const BUDGET_1D = 1.1e8, BUDGET_2D = 1.0e8;

  /* ================================================================
     Kinetics

     Schnakenberg (1979), in the form Murray writes it:
       f = gamma (a - u + u^2 v),  g = gamma (b - u^2 v)
     Uniform state u0 = a + b, v0 = b / (a + b)^2.

     Gierer-Meinhardt (1972), the activator-inhibitor pair:
       f = gamma (a - b u + u^2 / v),  g = gamma (u^2 - v)
     Uniform state u0 = (1 + a) / b, v0 = u0^2.

     Both are returned with the Jacobian at the uniform state, because everything the status line
     claims about the pattern comes out of that matrix and the two diffusion coefficients.
  ================================================================ */
  function kinetics(s) {
    const g = Number(s.gam) || 100, a = Number(s.ka) || 0.1, b = Number(s.kb) || 0.9;
    if (s.kinetics === 'gm') {
      const u0 = (1 + a) / Math.max(b, 1e-3), v0 = u0 * u0;
      return {
        kind: 'gm', u0, v0,
        fu: g * (-b + 2 / u0), fv: -g / (u0 * u0), gu: g * 2 * u0, gv: -g,
      };
    }
    const u0 = a + b, v0 = b / (u0 * u0);
    return {
      kind: 'sch', u0, v0,
      fu: g * (-1 + 2 * u0 * v0), fv: g * u0 * u0, gu: -g * 2 * u0 * v0, gv: -g * u0 * u0,
    };
  }

  /* ================================================================
     Linear stability of the kinetics about the uniform state, in PHYSICAL space.

     For u_t = Du u_xx + f, v_t = Dv v_xx + g the mode at wavenumber k obeys
       lambda^2 - tr(q) lambda + h(q) = 0,   q = k^2,
       tr(q) = (fu + gv) - q (Du + Dv),   h(q) = Du Dv q^2 - (Dv fu + Du gv) q + det J.
     The four standard Turing conditions are tr J < 0, det J > 0, S = Dv fu + Du gv > 0 and
     S^2 - 4 Du Dv det J > 0. The marginal wavenumber, the one that goes unstable first as the
     diffusion ratio is raised, is the minimizer of h: q_marg = S / (2 Du Dv).

     The wavenumber the pattern actually selects is the maximizer of lambda_+(q), which is not the
     same point, because tr(q) is still falling there. That one is closed form too. Setting
     dlambda/dq = 0 and squaring once gives, with s = Du + Dv, B = 4S - 2 s tr J, C = tr J^2 - 4 det J,

       (Dv - Du)^2 q^2 + B q - (B^2 - 4 s^2 C) / (16 Du Dv) = 0,

     whose positive root is the selected q. Checked against a 200,000 point scan of lambda_+ for
     Schnakenberg at three diffusion ratios and Gierer-Meinhardt at two: agreement to five decimals.
     That root is what n = k L / pi is predicted from, because it is the mode that grows.
  ================================================================ */
  function dispersion(K, Du, Dv) {
    const trJ = K.fu + K.gv, det = K.fu * K.gv - K.fv * K.gu;
    const S = Dv * K.fu + Du * K.gv, disc = S * S - 4 * Du * Dv * det;
    const cond = [trJ < 0, det > 0, S > 0, disc > 0];
    const ok = cond[0] && cond[1] && cond[2] && cond[3];
    const qMarg = S > 0 ? S / (2 * Du * Dv) : 0;
    const sD = Du + Dv, DD = (Dv - Du) * (Dv - Du);
    const B = 4 * S - 2 * trJ * sD, C = trJ * trJ - 4 * det;
    let q = 0;
    if (DD > 1e-9) {
      const rad = B * B + DD * (B * B - 4 * sD * sD * C) / (4 * Du * Dv);
      if (rad > 0) q = (-B + Math.sqrt(rad)) / (2 * DD);
    }
    if (!(q > 0)) q = qMarg;
    const tq = trJ - q * sD, hq = Du * Dv * q * q - S * q + det, d2 = tq * tq - 4 * hq;
    const lamMax = d2 >= 0 ? (tq + Math.sqrt(d2)) / 2 : tq / 2;
    // The diffusion ratio at which condition four first closes, with Du = 1. Solving
    // (d fu + gv)^2 = 4 d det for d gives a quadratic in d; the larger root is the threshold.
    let dCrit = 0;
    if (K.fu > 0) {
      const p = 4 * det - 2 * K.fu * K.gv, r2 = p * p - 4 * K.fu * K.fu * K.gv * K.gv;
      if (r2 > 0) dCrit = (p + Math.sqrt(r2)) / (2 * K.fu * K.fu * Du);
    }
    // The unstable band: h(q) < 0 between the two roots, so every mode with k in (kLo, kHi) grows and
    // every mode outside it decays. The realized pattern does not have to sit at the fastest mode,
    // because a mode that is already there keeps growing until the domain carries it out of the band,
    // and only then does it break. That is why the measured count moves in jumps rather than tracking
    // the prediction, and why the status line prints the band as well as the peak.
    let kLo = 0, kHi = 0;
    if (ok && disc > 0) {
      const rt = Math.sqrt(disc);
      kLo = Math.sqrt(Math.max(0, (S - rt) / (2 * Du * Dv)));
      kHi = Math.sqrt(Math.max(0, (S + rt) / (2 * Du * Dv)));
    }
    return { ok, cond, trJ, det, S, disc, kMarg: qMarg > 0 ? Math.sqrt(qMarg) : 0,
      k: q > 0 ? Math.sqrt(q) : 0, lamMax, dCrit, kLo, kHi };
  }

  const FAIL = ['tr J < 0 fails, the uniform state oscillates instead',
    'det J > 0 fails, the uniform state is a saddle',
    'D_v f_u + D_u g_v > 0 fails, no mode is destabilized by diffusion',
    'the discriminant is negative, the diffusion ratio is below d_c'];
  function failure(D) {
    for (let i = 0; i < 4; i++) if (!D.cond[i]) return FAIL[i];
    return '';
  }

  /* ================================================================
     Growth laws. L(t) is the physical length of the domain; the plate needs L, its logarithmic
     derivative (which is the dilution rate), and the time at which the run stops.
  ================================================================ */
  function lengthAt(law, L0, Gf, r, t) {
    if (law === 'lin') return L0 * (1 + r * t);
    if (law === 'log') return L0 * Gf / (1 + (Gf - 1) * Math.exp(-r * t));
    return L0 * Math.exp(r * t);
  }
  function dilationAt(law, Gf, r, t) {          // Ldot / L
    if (law === 'lin') return r / (1 + r * t);
    if (law === 'log') return r * (Gf - 1) * Math.exp(-r * t) / (1 + (Gf - 1) * Math.exp(-r * t));
    return r;
  }
  // Exponential and linear stop when the domain has reached its target. Logistic never reaches it, so
  // it stops at nine tenths of the way, which leaves the bottom of the sheet visibly static: that flat
  // ending is the whole point of the logistic preset.
  //
  // Nine tenths of the way means L = L0 (1 + 0.9 (Gf - 1)). Put that into the logistic form and the
  // exponential cancels to e^{-r t} = 1 / (9 Gf + 1), so the stopping time is log(9 Gf + 1) / r. The
  // earlier log(9 (Gf - 1)) / r is a different time entirely: it lands at 0.70 of the way for a growth
  // factor of 1.5 and 0.89 for a factor of 10, so the logistic sheet stopped at a different point on
  // the curve for every setting of the slider and the flat tail the preset is about was sometimes
  // missing. Checked against a direct evaluation of L(t) at both times for Gf in {1.5, 2, 5, 8, 10}.
  function endTime(law, Gf, r) {
    const g = Math.max(1.02, Gf);
    if (law === 'lin') return (g - 1) / r;
    if (law === 'log') return Math.log(9 * g + 1) / r;
    return Math.log(g) / r;
  }
  function growFor(law, r, tMax) {              // inverse of endTime, used by the budget clamp
    if (law === 'lin') return 1 + r * tMax;
    if (law === 'log') return (Math.exp(r * tMax) - 1) / 9;
    return Math.exp(r * tMax);
  }

  /* ================================================================
     The plan: every derived number one recipe implies, including the time step.

     In Lagrangian coordinates xi in [0, 1] the equations are

       du/dt = (Du / L(t)^2) u_xixi + f(u,v) - d (Ldot/L) u
       dv/dt = (Dv / L(t)^2) v_xixi + g(u,v) - d (Ldot/L) v

     with d the number of growing spatial dimensions. The last term is dilution: the domain carries
     material apart, so a fixed amount of substance thins out. It belongs to the transformation and
     is not optional, because without it these equations stop conserving what the physical problem
     conserves under dilation.

     It is worth being exact about what it does, because it is easy to credit it with the whole
     phenomenon and that is not what the numbers say. The stripes insert because of the 1/L(t)^2 on
     the two diffusion coefficients: as the domain lengthens the effective diffusion in xi falls, the
     pattern's wavelength in xi shrinks with it, and the wavelength in PHYSICAL space therefore stays
     put while the domain grows past it. Dilution is a correction on top of that, and its size is the
     ratio of Ldot/L to the reaction rate, which is exactly what the growth rate slider sets: at most
     about two per cent anywhere on it, since the slider tops out at 0.2 of the pattern's own linear
     growth rate and the reaction Jacobian's row sum is an order of magnitude larger again.

     Measured by ablation rather than argued. Setting the dilution term to zero and rerunning the
     default recipe left the final stripe count at 32 on one seed and 28 on another, both unchanged,
     and moved the fitted exponent from 1.04 +/- 0.06 to 1.035 +/- 0.042 and from 0.98 +/- 0.10 to
     0.93 +/- 0.06: inside the error bars, which is what a two per cent correction should do. At the
     top of the growth rate slider it does show, the same seed ending on 20 stripes with the term and
     28 without. So it stays, and it is scaled by d, but nothing here claims it is what inserts the
     stripes.

     STABILITY. The step is explicit Euler, so the bound is set by the stiffest linear mode. The
     3-point Laplacian on the line has symbol on [-4, 0] / dxi^2, the 5-point Laplacian on the square
     grid on [-8, 0] / dxi^2, and dxi = 1 / N, so the diffusive rate is

       c_dim * max(Du, Dv) * N^2 / L(t)^2,   c_dim = 4 on the line, 8 in the plane.

     The effective diffusion coefficient is D / L(t)^2, so it is LARGEST WHEN THE DOMAIN IS SMALLEST.
     On a growing domain the binding value is therefore L0, the length at the top of the sheet, not
     the length at the bottom: a bound taken from the final domain is too loose by the square of the
     growth factor, which for the default plate is a factor of 64, and the field fills with the
     grid-scale checkerboard within the first few hundred steps. To that rate add the largest row sum
     of the reaction Jacobian, which bounds the local reaction rate, and the dilution rate d * r.
     Forward Euler needs dt < 2 / rate; the 0.8 factor is the usual margin for the nonlinear terms
     (u^2 v, u^2 / v) that a linear estimate does not see. tools/check.js reports the neighbor
     correlation as nyq and fails below -0.35.
  ================================================================ */
  function plan(s) {
    const K = kinetics(s);
    const Du = 1, Dv = Math.max(1.05, Number(s.dratio) || 20);
    const D = dispersion(K, Du, Dv);
    // Outside the Turing window there is no selected wavenumber to scale the domain by, so fall back
    // on the marginal one and then on a plain unit length. The plate still runs and the status line
    // says the window is shut, which is more use than a blank sheet.
    const kSel = D.k > 0 ? D.k : (D.kMarg > 0 ? D.kMarg : 1);
    const lam = 2 * PI / kSel;
    const plane = s.mode === 'plane';
    const dims = plane ? 2 : 1;
    const N = plane ? (Number(s.grid) || 80) : (Number(s.cells) || 192);
    const L0 = Math.max(1e-3, (Number(s.waves0) || 2) * lam);
    // The growth rate is quoted as a fraction of the pattern's own linear growth rate, so a recipe
    // keeps its quasi-static character when the kinetics are retuned. Below the window lamMax can be
    // zero or negative, so there is a floor on the reference.
    const lamRef = Math.max(D.lamMax, 0.02 * (Number(s.gam) || 100));
    let r = Math.max(1e-6, (Number(s.rate) || 0.033) * lamRef);
    let Gf = Math.max(1.05, Number(s.grow) || 8);
    const cdim = plane ? 8 : 4;
    const diffRate = cdim * Math.max(Du, Dv) * N * N / (L0 * L0);
    const reactRate = Math.max(Math.abs(K.fu) + Math.abs(K.fv), Math.abs(K.gu) + Math.abs(K.gv));
    // The dilation rate is largest at t = 0 for every law here: r for exponential, r for linear,
    // r (Gf - 1) / Gf for logistic. Taking r bounds all three.
    const diluRate = dims * r;
    const dtMax = 1.6 / (diffRate + reactRate + diluRate);
    // Which of the three actually sets the step. On every recipe this tab can reach it is the
    // diffusive one, by three or four orders of magnitude, and it is evaluated at L0 because D/L(t)^2
    // is largest when the domain is smallest. The status line says so rather than leaving a reader to
    // assume it, because the whole hazard of a growing domain is taking that bound at the wrong end.
    const rates = [[diffRate, 'L₀ diffusion'], [reactRate, 'reaction'], [diluRate, 'dilution']];
    rates.sort((a, b) => b[0] - a[0]);
    const bind = rates[0][1];
    const perStep = plane ? N * N : N;
    const budgetSteps = (plane ? BUDGET_2D : BUDGET_1D) / perStep;
    const tMax = budgetSteps * dtMax;
    // A one percent slack on the comparison. Without it the budget clamp fires again on its own
    // output, because the rate it hands back has been rounded to the slider's step and the second
    // pass then shaves a tenth off the growth factor for no reason a viewer could see.
    let tEnd = endTime(s.law, Gf, r), clamped = false;
    if (tEnd > tMax * 1.01) { r *= tEnd / tMax; clamped = true; tEnd = endTime(s.law, Gf, r); }
    const rMax = 0.2 * lamRef;
    if (r > rMax) { r = rMax; tEnd = endTime(s.law, Gf, r); }
    if (tEnd > tMax * 1.01) { Gf = Math.max(1.2, growFor(s.law, r, tMax)); tEnd = endTime(s.law, Gf, r); clamped = true; }
    // Time rows. More rows is very nearly free, because spr falls as rows rises and the product,
    // which is the total number of Euler steps, is fixed by tEnd / dt. What it buys is the vertical
    // resolution of the sheet, which is the axis print quality is limited by. Two and a half rows per
    // cell of width is where the row bands stop being visible at eight inches.
    const rows = plane ? 0 : U.clamp(Math.round(N * (ASPECTS[s.aspect] || 1.25) * 2.5), 160, 720);
    let steps, spr, dt;
    if (plane) {
      steps = Math.max(1, Math.ceil(tEnd / dtMax)); spr = steps; dt = tEnd / steps;
    } else {
      spr = Math.max(1, Math.ceil(tEnd / (rows * dtMax)));
      steps = rows * spr; dt = tEnd / steps;
    }
    // The widest row of the sheet is the length actually reached, not the target. They are the same
    // for exponential and linear growth and they are not for logistic, which approaches its ceiling
    // and never arrives; taking the target there would leave the sheet permanently a tenth narrower
    // than the plate and put fewer than one pixel on each cell.
    const Lend = lengthAt(s.law, L0, Gf, r, tEnd);
    // Belt and braces: steps was chosen so that dt <= dtMax, but the bound is the one thing in this
    // file that a later edit must not be able to break quietly, so it is enforced rather than assumed.
    if (dt > dtMax) { steps = Math.max(steps, Math.ceil(tEnd / dtMax)); dt = tEnd / steps; if (!plane) spr = Math.ceil(steps / rows); }
    return { K, D, Du, Dv, kSel, lam, plane, dims, N, rows, L0, Lend, Gf, r, tEnd,
      dtMax, dt, spr, steps, clamped, bind, rateOut: r / lamRef };
  }

  /* ---- measurement helpers ---- */

  // Stripes on the plate: sign changes of u minus its mean along the row. For a domain carrying the
  // mode cos(m pi xi) that count is exactly m, which is the same m that k L / pi predicts, so the two
  // numbers are directly comparable with nothing fitted in between.
  function crossings(arr, off, n) {
    let mean = 0;
    for (let i = 0; i < n; i++) mean += arr[off + i];
    mean /= n;
    let c = 0, prev = arr[off] - mean;
    for (let i = 1; i < n; i++) {
      const cur = arr[off + i] - mean;
      if ((cur > 0) !== (prev > 0)) c++;
      prev = cur;
    }
    return c;
  }

  /* ================================================================
     Uncertainty

     Every number this tab prints next to a theoretical value carries an error bar and the comparison
     is quoted in standard deviations, because "measured 6.11 against exactly 6" is not a check. The
     three cases the house rule names all appear here:

       a MEAN over N samples        -> sd / sqrt(N), with N stated,
       a FITTED EXPONENT            -> the least squares standard error of the slope,
       a DERIVED quantity           -> propagated from the quantity it came from,

     and the fourth case, an exact combinatorial count, is stated as exact rather than given an
     invented uncertainty. The stripe count is exactly that: the number of sign changes of u minus its
     row mean is an integer read off the field, with no sampling in it at all.
  ================================================================ */

  function meanSE(a) {
    const n = a.length;
    if (!n) return { mean: NaN, se: NaN, n: 0 };
    let m = 0;
    for (let i = 0; i < n; i++) m += a[i];
    m /= n;
    if (n < 2) return { mean: m, se: NaN, n: 1 };
    let ss = 0;
    for (let i = 0; i < n; i++) { const d = a[i] - m; ss += d * d; }
    return { mean: m, se: Math.sqrt(ss / (n - 1) / n), n };
  }

  // Ordinary least squares slope with the textbook standard error, se(b)^2 = s^2 / Sxx with
  // s^2 = sum(residual^2) / (n - 2). Computed from the residuals and the spread of the independent
  // variable, which is the only way it means anything; nothing here is guessed from the scatter of
  // the points by eye. Three points is the fewest that leaves a degree of freedom, so below that the
  // caller is told there is no fit rather than handed a slope with no error bar.
  function fitSlope(xs, ys, dx) {
    const n = xs.length;
    if (n < 3) return { a: NaN, se: NaN, n, df: 0 };
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
    mx /= n; my /= n;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { const d = xs[i] - mx; sxx += d * d; sxy += d * (ys[i] - my); }
    if (!(sxx > 1e-12)) return { a: NaN, se: NaN, n, df: n - 2 };
    const a = sxy / sxx, c = my - a * mx;
    let ss = 0;
    for (let i = 0; i < n; i++) { const r = ys[i] - (a * xs[i] + c); ss += r * r; }
    let se = Math.sqrt(ss / (n - 2) / sxx);
    // The independent variable is read off a recorded row, so it carries that row's own resolution.
    // To first order an independent error dx on each x moves the slope by |a| dx / sqrt(Sxx), which
    // is added in quadrature here. Without it a fit through three points that happen to lie almost
    // exactly on a line claims a precision finer than the grid the points were located on.
    if (dx > 0) se = Math.sqrt(se * se + a * a * dx * dx / sxx);
    return { a, se, n, df: n - 2 };
  }

  // "1.4σ high", or "0.3σ from it" when the two agree. A deviation is never rounded toward the
  // theory and never dropped when it is large; measured() below says plainly when it is.
  function sigmas(v, se, ref) {
    if (!(isFinite(v) && isFinite(se) && se > 0)) return null;
    return (v - ref) / se;
  }
  // A sigma from a fit with one or two degrees of freedom is not a sigma. The residual based standard
  // error is itself a random variable with that many degrees of freedom, so the ratio follows Student's
  // t, whose tail is far fatter than the normal one: t = 4.9 on 1 d.f. is a two sided probability of
  // 0.13, which is 1.5 sigma and not 4.9. Reporting the raw ratio would put a five sigma badge on an
  // exponent that agrees with one to half a per cent, which is the same class of dishonesty as an
  // error bar left off altogether. The two small cases have closed form tails,
  //
  //   df = 1, which is Cauchy:  P(|T| > t) = 1 - (2/pi) atan(t)
  //   df = 2:                   P(|T| > t) = 1 - t / sqrt(t^2 + 2)
  //
  // and from 3 d.f. up the gap is small enough that the ratio is reported as it stands. The
  // probability is turned back into the equivalent normal deviate with the Hastings rational
  // approximation, good to about 0.003 of a sigma, which is more than one decimal place needs.
  function tToSigma(t, df) {
    const a = Math.abs(t);
    if (!(df >= 1) || df >= 3 || !isFinite(a)) return a;
    const pr = df === 1 ? 1 - (2 / PI) * Math.atan(a) : 1 - a / Math.sqrt(a * a + 2);
    const q = Math.max(1e-12, Math.min(0.5, pr / 2));
    const u = Math.sqrt(-2 * Math.log(q));
    return u - (2.30753 + 0.27061 * u) / (1 + 0.99229 * u + 0.04481 * u * u);
  }
  // The deviation as it is printed: a t on the sample's own degrees of freedom, expressed as the
  // normal deviate that carries the same probability.
  function devTxt(v, se, ref, df) {
    const z = sigmas(v, se, ref);
    if (z === null) return 'no uncertainty available';
    return sigTxt(z < 0 ? -tToSigma(z, df) : tToSigma(z, df));
  }

  function sigTxt(z) {
    if (z === null) return 'no uncertainty available';
    const m = Math.abs(z);
    return m.toFixed(1) + 'σ ' + (m < 0.05 ? 'from it' : (z > 0 ? 'high' : 'low'));
  }
  // Enough decimals to show the error bar. A value printed to two places beside an uncertainty of
  // four thousandths reads as "± 0.00", which is exactly the sort of decoration this tab is trying
  // not to print.
  const pm = (v, se) => {
    const d = !isFinite(se) || se >= 0.05 ? 2 : (se >= 0.005 ? 3 : 4);
    return v.toFixed(d) + ' ± ' + (isFinite(se) ? se.toFixed(d) : '?');
  };

  // The plane has no single row to count, so the mode index is read off the cosine transform instead.
  // Zero flux walls make cos(m pi xi) cos(n pi eta) the natural basis, so the amplitudes are a plain
  // separable DCT-II, and a pair (m, n) carries |k| = pi sqrt(m^2 + n^2) / L. sqrt(m^2 + n^2) is then
  // the same number a stripe count would be, and is compared with k L / pi in the same breath.
  //
  // The reported radius is not the single loudest pair. A spot lattice or a labyrinth spreads its
  // energy over every pair on one ring, so which pair comes out largest is close to arbitrary and
  // jumps between seeds while the ring itself does not move. The ring is found first, as the peak of
  // the power binned by integer radius, and the radius is then the power weighted centroid inside a
  // window of two bins either side of it.
  //
  // THE UNCERTAINTY comes from splitting the quadrant into six angular sectors of fifteen degrees and
  // taking that centroid inside each one. Six independent estimates of the same ring radius, so the
  // standard error is sd / sqrt(6) and the spread is a real measurement of how round the ring is: an
  // anisotropic pattern, which is what a stripe field looks like in this basis, widens the error bar
  // instead of being reported at a precision it does not have.
  const SECTORS = 6;
  function ringStat(u, N) {
    const M = Math.min(N >> 1, 48);
    const cosT = new Float32Array(M * N);
    for (let m = 0; m < M; m++) for (let x = 0; x < N; x++) cosT[m * N + x] = Math.cos(PI * m * (x + 0.5) / N);
    const half = new Float32Array(M * N);            // half[m][y] = sum_x u(x,y) cos(m pi (x+.5)/N)
    for (let y = 0; y < N; y++) {
      const row = y * N;
      for (let m = 0; m < M; m++) {
        let acc = 0;
        const cm = m * N;
        for (let x = 0; x < N; x++) acc += u[row + x] * cosT[cm + x];
        half[m * N + y] = acc;
      }
    }
    const pw = new Float64Array(M * M);
    const ring = new Float64Array(2 * M + 2);
    let best = 0, bm = 0, bn = 0;
    for (let m = 0; m < M; m++) {
      const hm = m * N;
      for (let n = 0; n < M; n++) {
        if (m === 0 && n === 0) continue;
        let acc = 0;
        const cn = n * N;
        for (let y = 0; y < N; y++) acc += half[hm + y] * cosT[cn + y];
        const p2 = acc * acc;
        pw[m * M + n] = p2;
        const rr = Math.sqrt(m * m + n * n);
        if (rr < M) ring[Math.round(rr)] += p2;
        if (p2 > best) { best = p2; bm = m; bn = n; }
      }
    }
    let peak = 0, rp = 0;
    for (let i = 1; i < M; i++) if (ring[i] > rp) { rp = ring[i]; peak = i; }
    const rLo = peak - 2.5, rHi = peak + 2.5;
    const sec = [];
    for (let sIdx = 0; sIdx < SECTORS; sIdx++) {
      const a0 = sIdx * (PI / 2) / SECTORS, a1 = (sIdx + 1) * (PI / 2) / SECTORS;
      let wsum = 0, rsum = 0;
      for (let m = 0; m < M; m++) for (let n = 0; n < M; n++) {
        const p2 = pw[m * M + n];
        if (!(p2 > 0)) continue;
        const rr = Math.sqrt(m * m + n * n);
        if (rr < rLo || rr > rHi) continue;
        const th = Math.atan2(n, m);
        if (th < a0 || th >= (sIdx === SECTORS - 1 ? a1 + 1e-6 : a1)) continue;
        wsum += p2; rsum += p2 * rr;
      }
      if (wsum > 0) sec.push(rsum / wsum);
    }
    const st = meanSE(sec);
    return { m: bm, n: bn, peak, rho: isFinite(st.mean) ? st.mean : peak, se: st.se, sectors: st.n };
  }

  function pctile(arr, q) {
    const a = Float32Array.from(arr).sort();
    return a[U.clamp(Math.round(q * (a.length - 1)), 0, a.length - 1)];
  }

  // A 256 entry color table with the black point, white point and tone controls already folded in, so
  // the per-pixel work is one index and three byte copies.
  function toneLUT(s) {
    const base = U.makeRampLUT(s.palette, s.bg, 256);
    const out = new Uint8Array(256 * 3);
    const lo = Number(s.lo) || 0, hi = Number(s.hi), span = Math.max(1e-4, hi - lo);
    for (let i = 0; i < 256; i++) {
      const t = U.clamp((i / 255 - lo) / span, 0, 1);
      const j = (t * 255 | 0) * 3;
      for (let c = 0; c < 3; c++) {
        let v = base[j + c] / 255;
        v = Math.pow(U.clamp(v, 0, 1), s.gamma) * s.exposure;
        v = U.clamp((v - 0.5) * s.contrast + 0.5, 0, 1);
        out[i * 3 + c] = v * 255 | 0;
      }
    }
    return out;
  }

  function grainOut(ctx, w, h, amt, seed) {
    if (!(amt > 0)) return;
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const rng = U.makeRng(seed + '/growdomain/grain'), a = amt * 26;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * a;
      d[i] = U.clamp(d[i] + n, 0, 255); d[i + 1] = U.clamp(d[i + 1] + n, 0, 255); d[i + 2] = U.clamp(d[i + 2] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  }

  const MODE_LABEL = { sheet: 'sheet', plane: 'plane' };
  const LAW_LABEL = { exp: 'exp growth', lin: 'linear', log: 'logistic' };
  const KIN_LABEL = { sch: 'Schnakenberg', gm: 'Gierer-Meinhardt' };

  /* ---------- Growing Domain ---------- */
  Studio.register({
    id: 'growdomain',
    name: 'Growing Domain',
    subtitle: 'Turing patterns on a domain that grows · 1999',
    order: 45.5,
    equation: '∂u/∂t = (D_u/L²)∂²u/∂ξ² + f(u,v) − d(L̇/L)u,  ∂v/∂t = (D_v/L²)∂²v/∂ξ² + g(u,v) − d(L̇/L)v',
    credit: "Alan M. Turing, 'The chemical basis of morphogenesis', Philosophical Transactions of the Royal Society of London B 237, 37 (1952), showed that two substances which react and diffuse at different rates can break a uniform state into a pattern with a wavelength of its own. Edward J. Crampin, Eamonn A. Gaffney and Philip K. Maini, 'Reaction and diffusion on growing domains: scenarios for robust pattern formation', Bulletin of Mathematical Biology 61, 1093 (1999), wrote the same problem in fixed Lagrangian coordinates on a domain of changing length L(t); the diffusion coefficients pick up a factor 1/L², and a dilution term d(L̇/L) appears because growth carries material apart. That is the formulation integrated here. Shigeru Kondo and Rihito Asai, 'A reaction-diffusion wave on the skin of the marine angelfish Pomacanthus', Nature 376, 765 (1995), measured the consequence on a live animal: as the fish grows its stripes do not widen, new ones are inserted between the old, at the spacing the reaction-diffusion wavelength fixes. The kinetics are Schnakenberg's trimolecular scheme and the Gierer-Meinhardt activator-inhibitor pair.",
    blurb: 'A Turing pattern has a wavelength of its own, set by the chemistry and the two diffusion rates, and that wavelength lives in real space: centimeters, not fractions of the animal. So what happens when the animal gets bigger? The space-time sheet answers it. Time runs down the page and the domain runs across it, drawn at its true physical width, so the sheet widens as the tissue grows. The stripes do not widen with it. Each time the domain has stretched far enough to hold another wavelength, the pattern splits and a new stripe appears between two old ones, which is exactly what Kondo and Asai filmed on the skin of a growing angelfish. Growth rate and growth law are the controls that matter: grow slowly and the stripes insert one at a time, grow fast and the pattern cannot keep up and doubles in jumps, choose the logistic law and the insertions stop when the growth does. The status line counts the stripes on the sheet and prints them next to the number linear stability predicts, with an error bar on everything that can carry one. The count itself is exact, so it is labelled exact rather than given an invented uncertainty. The exponent in n proportional to L, which is the mode doubling claim, carries the standard error of its fit. The wavenumber carries the spread across the plateaus, and that spread is physical: the pattern holds a count while the domain stretches, so its wavenumber slides down and jumps back at each insertion rather than sitting still. Slow the growth down and the measured wavenumber walks back up to the value linear theory picks out.',
    schema: [
      { group: 'Plate', key: 'mode', label: 'Plate', type: 'seg', kind: GEOM, wrap: true,
        options: [['sheet', 'Space-time sheet'], ['plane', 'Growing plane']],
        hint: 'The sheet is one space dimension with time running down the page, which is the picture that shows stripes being inserted. The plane is an isotropic two dimensional domain growing in both directions, which gives spots or a labyrinth.' },
      { group: 'Plate', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM,
        options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      { group: 'Plate', key: 'cells', label: 'Cells across', type: 'seg', kind: GEOM,
        options: [[128, '128'], [160, '160'], [192, '192'], [224, '224'], [256, '256']],
        dimUnless: s => s.mode === 'sheet',
        hint: 'Lagrangian cells across the domain, written one to a pixel on the widest row. The number of rows follows from the aspect, so a taller sheet is a finer time axis at the same cost.' },
      { group: 'Plate', key: 'grid', label: 'Grid', type: 'seg', kind: GEOM,
        options: [[64, '64'], [80, '80'], [96, '96'], [112, '112']],
        dimUnless: s => s.mode === 'plane',
        hint: 'The plane costs the square of this and the time step falls as its square as well, so it is deliberately small.' },
      { group: 'Kinetics', key: 'kinetics', label: 'Kinetics', type: 'seg', kind: GEOM, wrap: true,
        options: [['sch', 'Schnakenberg'], ['gm', 'Gierer-Meinhardt']],
        hint: 'Schnakenberg is the trimolecular scheme, nearly sinusoidal near onset and the one linear theory describes best. Gierer-Meinhardt is the activator-inhibitor pair, whose peaks sharpen into spikes and select a longer wavelength than linear theory predicts.' },
      RANGE('Kinetics', 'ka', 'Source a', GEOM, 0.01, 0.4, 0.005, f3),
      RANGE('Kinetics', 'kb', 'Source b', GEOM, 0.3, 1.6, 0.01, f2),
      RANGE('Kinetics', 'gam', 'Reaction strength γ', GEOM, 20, 200, 5, String, {
        hint: 'Scales the reaction against diffusion, so it sets the wavelength: the pattern period goes as one over the square root of γ. It does not change how much work the plate is, because the growth rate is quoted against the pattern’s own rate and scales with it.' }),
      RANGE('Kinetics', 'dratio', 'Diffusion ratio D_v/D_u', GEOM, 4, 48, 0.5, f1, {
        hint: 'The inhibitor has to outrun the activator or nothing happens. The status line prints the threshold d_c for the current a, b and kinetics; below it the sheet relaxes flat.' }),
      { group: 'Growth', key: 'law', label: 'Growth law', type: 'seg', kind: GEOM, wrap: true,
        options: [['exp', 'Exponential'], ['lin', 'Linear'], ['log', 'Logistic']],
        hint: 'Exponential holds the dilution rate constant, so insertions come at a steady cadence down the sheet. Linear slows the dilution as the domain lengthens, so the insertions thin out. Logistic saturates and the insertions stop altogether.' },
      RANGE('Growth', 'waves0', 'Initial wavelengths', GEOM, 1.5, 8, 0.1, f1, {
        hint: 'How many pattern wavelengths the domain holds at the top of the sheet. This also sets the stiffest time step, because the effective diffusion coefficient is D/L² and L is smallest here.' }),
      RANGE('Growth', 'grow', 'Grown by', GEOM, 1.5, 10, 0.1, v => '×' + v.toFixed(1), {
        hint: 'Final length over initial length. Each doubling should double the stripe count, so a factor of eight is three doublings.' }),
      RANGE('Growth', 'rate', 'Growth rate', GEOM, 0.01, 0.2, 0.002, f3, {
        hint: 'In units of the pattern’s own linear growth rate. Small values keep the pattern quasi-static, so it tracks the predicted count and inserts one stripe at a time. Large values outrun it and the pattern jumps by whole doublings instead. A very slow rate is a very long run, so it is held up to fit the work budget.' }),
      RANGE('Growth', 'amp', 'Initial noise', GEOM, 0.002, 0.1, 0.002, f3, {
        hint: 'The uniform state is exactly steady, so something has to break it. This is the amplitude of the seeded perturbation, and it sets how far down the sheet the pattern first becomes visible.' }),
      { group: 'Growth', key: 'reseed', label: 'Reseed', type: 'action' },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true,
        options: [['field', 'Activator'], ['row', 'Per slice'], ['stripes', 'Two tone'], ['inhibitor', 'Inhibitor']] },
      { group: 'Picture', key: 'rings', label: 'Growth rings', type: 'toggle', kind: PAINT,
        dimUnless: s => s.mode === 'plane',
        hint: 'Outlines the domain at four earlier times, so a still plate of the plane still says how much of it is new.' },
      RANGE('Picture', 'lo', 'Black point', PAINT, 0, 0.9, 0.01, f2),
      RANGE('Picture', 'hi', 'White point', PAINT, 0.1, 1.5, 0.01, f2),
      RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.4, 2.2, 0.02, f2),
      RANGE('Picture', 'contrast', 'Contrast', PAINT, 0.5, 2.2, 0.02, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      mode: 'sheet', aspect: '4:5', cells: 192, grid: 80,
      kinetics: 'sch', ka: 0.1, kb: 0.9, gam: 100, dratio: 20,
      law: 'exp', waves0: 2, grow: 8, rate: 0.04, amp: 0.02,
      view: 'field', rings: true,
      lo: 0.02, hi: 1, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.04,
      seed: 'growdomain-1999',
    },
    presets: {
      insertion: pre('Stripe insertion', { mode: 'sheet', law: 'exp', kinetics: 'sch', ka: 0.1, kb: 0.9, gam: 100,
        dratio: 20, cells: 192, aspect: '4:5', waves0: 2, grow: 8, rate: 0.04, amp: 0.02,
        view: 'field', lo: 0.02, hi: 1, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.04 }, Pal.graphite),
      angelfish: pre('Angelfish', { mode: 'sheet', law: 'exp', kinetics: 'sch', ka: 0.1, kb: 0.9, gam: 100,
        dratio: 20, cells: 192, aspect: '4:5', waves0: 2.5, grow: 7, rate: 0.038, amp: 0.02,
        view: 'stripes', lo: 0, hi: 1, exposure: 1, gamma: 0.95, contrast: 1.1, grain: 0.08 }, Pal.risograph),
      linear: pre('Linear growth', { mode: 'sheet', law: 'lin', kinetics: 'sch', ka: 0.1, kb: 0.9, gam: 100,
        dratio: 20, cells: 160, aspect: '4:5', waves0: 2, grow: 4.5, rate: 0.038, amp: 0.02,
        view: 'row', lo: 0.02, hi: 1, exposure: 1, gamma: 1, contrast: 1.05, grain: 0.04 }, Pal.kiln),
      saturating: pre('Growth that stops', { mode: 'sheet', law: 'log', kinetics: 'sch', ka: 0.1, kb: 0.9, gam: 100,
        dratio: 20, cells: 160, aspect: '4:5', waves0: 2, grow: 5, rate: 0.042, amp: 0.02,
        view: 'field', lo: 0.02, hi: 1, exposure: 1, gamma: 0.95, contrast: 1.05, grain: 0.04 }, Pal.verdigris),
      doubling: pre('Mode doubling', { mode: 'sheet', law: 'exp', kinetics: 'sch', ka: 0.1, kb: 0.9, gam: 100,
        dratio: 20, cells: 192, aspect: '4:5', waves0: 2, grow: 8, rate: 0.09, amp: 0.02,
        view: 'row', lo: 0, hi: 1, exposure: 1, gamma: 0.9, contrast: 1.1, grain: 0 }, Pal.nightshade),
      meinhardt: pre('Gierer-Meinhardt', { mode: 'sheet', law: 'exp', kinetics: 'gm', ka: 0.1, kb: 1, gam: 60,
        dratio: 20, cells: 192, aspect: '4:5', waves0: 2, grow: 6, rate: 0.038, amp: 0.02,
        view: 'row', lo: 0.02, hi: 1, exposure: 1, gamma: 0.9, contrast: 1.1, grain: 0.04 }, Pal.ember),
      plane: pre('Growing plane', { mode: 'plane', law: 'exp', kinetics: 'sch', ka: 0.1, kb: 0.9, gam: 100,
        dratio: 20, grid: 80, aspect: '1:1', waves0: 4, grow: 2.2, rate: 0.048, amp: 0.02,
        view: 'field', rings: true, lo: 0.02, hi: 1, exposure: 1, gamma: 0.95, contrast: 1.05, grain: 0.04 }, Pal.bioluminescent),
    },
    closedGroups: ['Kinetics'],
    hints: {
      Plate: 'Everything here rebuilds the run. The sheet is the picture that shows insertion; the plane is the same physics with both directions growing, so the dilution term carries a factor of two.',
      Kinetics: 'Two reaction schemes and the diffusion ratio between them. The four Turing conditions are checked against these numbers and the status line says whether the window is open.',
      Growth: 'The domain length L(t) enters twice: as 1/L² on both diffusion coefficients, and as the dilution term that keeps the concentrations from simply riding along with the stretch. The growth rate is also the control the self-check responds to: the slower the growth, the closer the measured wavenumber sits to the peak of the dispersion relation. A fit over only three or four insertions has one or two degrees of freedom, and the status line says how many. With that few, an error bar is itself so uncertain that the ratio to it follows Student\u2019s t rather than a normal, so the sigma printed is the normal deviate carrying the same probability as that t, not the raw ratio.',
      Picture: 'Activator maps u over the whole sheet at once. Per slice normalizes each time row against its own range, which brings the pattern up from the moment it leaves the uniform state. Two tone thresholds each row at its mean, which is the fish-skin picture.',
    },
    palette: true, defaultPalette: 'graphite', paletteLabel: 'Colors (low → high activator)',
    headline: 'grow', headlineLabel: 'domain growth',

    // Nothing here can blow the integrator up, because the time step is derived rather than stored.
    // What sanitize has to do is keep a recipe inside the work budget, and it buys that by growing
    // faster or by growing less far, never by taking a longer step than the bound in plan() allows.
    sanitize(s) {
      s.dratio = U.clamp(Number(s.dratio) || 20, 4, 48);
      s.grow = U.clamp(Number(s.grow) || 8, 1.5, 10);
      s.waves0 = U.clamp(Number(s.waves0) || 2, 1.5, 8);
      if (s.kinetics === 'gm') s.kb = U.clamp(Number(s.kb) || 1, 0.3, 1.6);
      const p = plan(s);
      // Write the trimmed run back onto the sliders only when plan() actually trimmed it. Rounding an
      // untouched rate onto the slider's step moves a recipe that was already inside the budget, and a
      // default that is not a fixed point of its own sanitize appears in every hash as a difference
      // from itself: the shell records the diff against the defaults, so a default that sanitizes to
      // something else is carried in every link this tab ever makes.
      //
      // The direction of each rounding matters too. The rate is rounded up, because a rate rounded
      // down is a run slightly longer than the budget and plan() would trim it again on the next
      // rebuild. The growth factor is rounded down for the same reason from the other side.
      const rate0 = Number(s.rate) || 0.04, grow0 = Number(s.grow) || 8;
      if (p.rateOut > rate0 * 1.0005) s.rate = U.clamp(Math.ceil(p.rateOut * 500) / 500, 0.01, 0.2);
      if (p.Gf < grow0 - 1e-6) s.grow = U.clamp(Math.floor(p.Gf * 10) / 10, 1.5, 10);
    },
    surprise(rng) {
      const plane = rng() < 0.22;
      const gm = rng() < 0.3;
      const law = rng.pick(['exp', 'exp', 'exp', 'lin', 'log']);
      return {
        mode: plane ? 'plane' : 'sheet',
        aspect: plane ? '1:1' : rng.pick(['4:5', '4:5', '1:1', '5:4']),
        cells: rng.pick([160, 192, 192, 224]),
        grid: rng.pick([64, 80, 80, 96]),
        // The draws are held inside the Turing window rather than checked afterwards: tr J < 0 needs
        // (a+b)^2 > (b-a)/(a+b) for Schnakenberg and b(1-a)/(1+a) < 1 for Gierer-Meinhardt, and the
        // diffusion ratio has to clear d_c, which is about 14 at the far corner of these ranges. A
        // surprise outside the window is a flat sheet with an explanation, which is not a keeper.
        kinetics: gm ? 'gm' : 'sch',
        ka: gm ? rng.range(0.1, 0.25) : rng.range(0.05, 0.14),
        kb: gm ? rng.range(0.9, 1.1) : rng.range(0.75, 1),
        gam: rng.int(12, 26) * 5,
        dratio: gm ? rng.range(22, 40) : rng.range(16, 32),
        law,
        waves0: plane ? rng.range(3, 5.5) : rng.range(1.8, 3),
        grow: plane ? rng.range(1.8, 2.6) : (law === 'exp' ? rng.range(5, 9) : rng.range(3.5, 5.5)),
        rate: rng.pick([0.04, 0.042, 0.05, 0.06, 0.09]),
        amp: rng.range(0.01, 0.04),
        view: plane ? 'field' : rng.pick(['field', 'field', 'row', 'stripes']),
        rings: true,
        lo: rng.range(0, 0.06), hi: rng.range(0.9, 1.1),
        exposure: rng.range(0.92, 1.12), gamma: rng.range(0.85, 1.12),
        contrast: rng.range(0.95, 1.2), grain: rng.pick([0, 0.04, 0.08]),
      };
    },

    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d');
      let P = null;                 // the current plan
      let U1 = null, V1 = null;     // working fields
      let UN = null, VN = null;     // scratch for the out-of-place update
      let SU = null, SV = null;     // recorded sheet (rows x N) or the plane field
      let Lrow = null;              // physical length per recorded row
      let ringL = null;             // domain length at four earlier times, for the plane
      let rowsDone = 0, stepsDone = 0, timer = 0, building = false, pending = null;
      let lo = 0, hi = 1;           // measured black and white points of the field
      let trace = [], measN = 0, measLabel = 'stripes', modeMN = null;
      let kStat = null, kSample = '', expStat = null, expSample = '', expVar = 'n', snaps = [];

      function stop() { clearTimeout(timer); timer = 0; }

      /* ---- one Euler step of the whole system, on the line ---- */
      function step1D(n, tRef) {
        const N = P.N, dxi2 = N * N, dt = P.dt, K = P.K;
        const s = host.getState();
        const a = Number(s.ka), b = Number(s.kb), g = Number(s.gam);
        const gm = K.kind === 'gm';
        const uu = UN, vv = VN;
        let t = tRef;
        for (let q = 0; q < n; q++) {
          const L = lengthAt(s.law, P.L0, P.Gf, P.r, t);
          const cu = P.Du * dxi2 / (L * L), cv = P.Dv * dxi2 / (L * L);
          const dl = dilationAt(s.law, P.Gf, P.r, t);
          for (let i = 0; i < N; i++) {
            const im = i === 0 ? 1 : i - 1, ip = i === N - 1 ? N - 2 : i + 1;
            const u = U1[i], v = V1[i];
            const lu = U1[im] + U1[ip] - 2 * u, lv = V1[im] + V1[ip] - 2 * v;
            let f, gg;
            if (gm) { f = g * (a - b * u + u * u / v); gg = g * (u * u - v); }
            else { const uv = u * u * v; f = g * (a - u + uv); gg = g * (b - uv); }
            let nu = u + dt * (cu * lu + f - dl * u);
            let nv = v + dt * (cv * lv + gg - dl * v);
            uu[i] = nu < 1e-5 ? 1e-5 : (nu > 1e3 ? 1e3 : nu);
            vv[i] = nv < 1e-5 ? 1e-5 : (nv > 1e3 ? 1e3 : nv);
          }
          U1.set(uu); V1.set(vv);
          t += dt;
        }
        return t;
      }

      /* ---- one Euler step of the whole system, on the square ---- */
      function step2D(n, tRef) {
        const N = P.N, dxi2 = N * N, dt = P.dt, K = P.K;
        const s = host.getState();
        const a = Number(s.ka), b = Number(s.kb), g = Number(s.gam);
        const gm = K.kind === 'gm';
        const uu = UN, vv = VN;
        let t = tRef;
        for (let q = 0; q < n; q++) {
          const L = lengthAt(s.law, P.L0, P.Gf, P.r, t);
          const cu = P.Du * dxi2 / (L * L), cv = P.Dv * dxi2 / (L * L);
          const dl = 2 * dilationAt(s.law, P.Gf, P.r, t);
          for (let y = 0; y < N; y++) {
            const y0 = y * N, ym = (y === 0 ? 1 : y - 1) * N, yp = (y === N - 1 ? N - 2 : y + 1) * N;
            for (let x = 0; x < N; x++) {
              const xm = x === 0 ? 1 : x - 1, xp = x === N - 1 ? N - 2 : x + 1;
              const c = y0 + x, u = U1[c], v = V1[c];
              const lu = U1[y0 + xm] + U1[y0 + xp] + U1[ym + x] + U1[yp + x] - 4 * u;
              const lv = V1[y0 + xm] + V1[y0 + xp] + V1[ym + x] + V1[yp + x] - 4 * v;
              let f, gg;
              if (gm) { f = g * (a - b * u + u * u / v); gg = g * (u * u - v); }
              else { const uv = u * u * v; f = g * (a - u + uv); gg = g * (b - uv); }
              let nu = u + dt * (cu * lu + f - dl * u);
              let nv = v + dt * (cv * lv + gg - dl * v);
              uu[c] = nu < 1e-5 ? 1e-5 : (nu > 1e3 ? 1e3 : nu);
              vv[c] = nv < 1e-5 ? 1e-5 : (nv > 1e3 ? 1e3 : nv);
            }
          }
          U1.set(uu); V1.set(vv);
          t += dt;
        }
        return t;
      }

      /* ---- exposure, measured from the field rather than assumed ---- */
      function expose() {
        const s = host.getState();
        const src = s.view === 'inhibitor' ? SV : SU;
        const n = P.plane ? P.N * P.N : rowsDone * P.N;
        if (!n) { lo = 0; hi = 1; return; }
        const stride = Math.max(1, Math.floor(n / 4096));
        const samp = [];
        for (let i = 0; i < n; i += stride) samp.push(src[i]);
        lo = pctile(samp, 0.02); hi = pctile(samp, 0.98);
        if (!(hi > lo)) { hi = lo + 1e-3; }
      }

      /* ---- the measurement the tab exists for, and its error bars ---- */
      // Always on the activator, whatever the picture is showing: the prediction is a statement about
      // u, and switching the view must not change the number the plate reports.
      //
      // Two checks, against two numbers that are fixed before the run starts.
      //
      //   MODE DOUBLING. The wavelength is fixed in physical space, so a domain of length L carries
      //   a stripe count proportional to L: n ∝ L^1, with the exponent exactly one. That is the whole
      //   content of the angelfish observation, and a fitted exponent is the honest way to test it,
      //   because it does not care where in the band the pattern happens to sit.
      //
      //   WAVENUMBER. k = n pi / L against the peak of the dispersion relation. This one is not
      //   obliged to agree and usually does not, for a reason worth printing rather than hiding: at
      //   a fixed stripe count k falls as the domain grows, until the pattern splits and k jumps
      //   back up, so the realized k saws back and forth inside the unstable band. The scatter quoted
      //   on it is that sawtooth. It is physical, not instrumental.
      //
      //   The sample is the plateaus, not the rows. Six hundred rows holding eight distinct counts
      //   are eight measurements written down seventy five times each, and averaging over rows would
      //   divide the error bar by a factor of nine for nothing.
      function measure() {
        trace = []; measN = 0; modeMN = null;
        kStat = null; expStat = null; kSample = ''; expSample = '';
        if (P.plane) {
          if (!rowsDone) return;
          expVar = 'ρ';
          measLabel = 'ring';
          modeMN = ringStat(SU, P.N);
          measN = modeMN.rho;
          const pts = snaps.filter(v => v.L > 0 && v.rho > 0);
          // k = pi rho / L, and L is analytic rather than measured, so within one snapshot the error
          // propagates straight through a constant factor: se(k) = pi se(rho) / L.
          //
          // That is not the error bar to print, though, and finding out why is worth recording. The
          // sectors of one ring are six views of ONE realization, so their scatter measures how round
          // that ring is and nothing else. Three seeds of the same recipe gave k of 4.42, 4.51 and
          // 4.94 while each run's sector standard error was about 0.04, so a sigma computed from the
          // sectors would have called a ten percent seed-to-seed spread a ten sigma disagreement with
          // theory. The run's own snapshots are the honest sample: each is a separate reading of the
          // selected wavenumber as the domain grows, and their spread carries the same sawtooth the
          // sheet's plateaus carry. The sector scatter is still what the printed ring radius carries,
          // because that number really is about this one picture.
          // The plane lags in the same way the sheet does and responds to the same control: at grid
          // 64 on one seed the measured k ran 3.60 +/- 0.16 at rate 0.1, 4.28 +/- 0.08 at 0.048 and
          // 4.648 +/- 0.040 at 0.02, against a peak of 4.87.
          kStat = pts.length
            ? meanSE(pts.map(v => PI * v.rho / v.L))
            : { mean: PI * modeMN.rho / Lrow[0], se: NaN, n: 1 };
          kSample = 'snapshots';
          expStat = fitSlope(pts.map(v => Math.log(v.L)), pts.map(v => Math.log(v.rho)));
          expSample = 'snapshots';
          return;
        }
        expVar = 'n';
        measLabel = 'stripes';
        // A count at every recorded row would be noise at the top, where the field is still the
        // uniform state plus a perturbation. Counting only once the pattern has an amplitude worth
        // the name keeps the trace honest about when the stripes actually exist.
        const N = P.N;
        let amp0 = 0;
        for (let j = 0; j < rowsDone; j++) {
          let mn = 1e30, mx = -1e30;
          const off = j * N;
          for (let i = 0; i < N; i++) { const v = SU[off + i]; if (v < mn) mn = v; if (v > mx) mx = v; }
          if (mx - mn > amp0) amp0 = mx - mn;
        }
        const floorAmp = 0.15 * amp0;
        const segs = [];
        let cur = null;
        for (let j = 0; j < rowsDone; j++) {
          const off = j * N;
          let mn = 1e30, mx = -1e30;
          for (let i = 0; i < N; i++) { const v = SU[off + i]; if (v < mn) mn = v; if (v > mx) mx = v; }
          if (mx - mn < floorAmp) continue;
          const c = crossings(SU, off, N);
          if (!cur || c !== cur.n) { cur = { n: c, rows: 0, sl: 0, row: j }; segs.push(cur); }
          cur.rows++; cur.sl += Math.log(Math.max(1e-9, Lrow[j]));
          measN = c;
        }
        // A plateau lasting a row or two is the field crossing between two counts, not a state the
        // pattern held. It is dropped from the sample and from the trace, except for the last one,
        // which is kept however short because it is the state the plate actually ends in.
        const minRows = Math.max(3, rowsDone / 60);
        const keep = segs.filter((g, i) => g.n > 0 && (g.rows >= minRows || i === segs.length - 1));
        trace = keep.map(g => ({ row: g.row, n: g.n }));
        if (trace.length > 8) trace = trace.slice(-8);
        // WAVENUMBER, from the geometric mean of L over each plateau. The plateau spans a range of
        // lengths at one fixed count and k slides across it, so the mean is the middle of one tooth
        // of the sawtooth. Lowering the growth rate at a fixed seed walks this straight at the peak
        // of the dispersion relation: 3.26 at rate 0.15, 3.78 at 0.09, 4.31 at 0.04, 4.64 at 0.02 and
        // 4.75 ± 0.37 at 0.012 against a peak of 4.87, which is 0.3 sigma. That is the quasi-static
        // limit arriving, and it is why the middle of the tooth is the quantity compared with the
        // peak rather than either end of it.
        const Lbar = keep.map(g => Math.exp(g.sl / g.rows));
        kStat = meanSE(keep.map((g, i) => g.n * PI / Lbar[i]));
        kSample = 'plateaus';
        // EXPONENT, from the insertion events rather than from the same plateau means. A plateau is
        // truncated at both ends of the run, by the amplitude floor at the top of the sheet and by the
        // sheet simply stopping at the bottom, so its mean L sits at a different place inside the
        // tooth for the first and last plateaus than for the ones in between. That bias is worth
        // about +0.19 in the exponent and it does not shrink with the growth rate, which is how it
        // was caught: a lag effect would have. The length at which a count first appears has no such
        // bias, because an insertion is an event and how long it was watched afterwards cannot move
        // it. The first plateau is dropped, since its start is where the pattern became detectable
        // rather than where it was inserted.
        const ins = keep.slice(1);
        // An insertion is located to the recorded row it first appears on, so log L carries one row
        // of quantization. The standard deviation of a uniform error one row wide is that row's own
        // step in log L over sqrt(12), and that is what is propagated into the slope.
        const dLogL = Math.log(P.Lend / P.L0) / Math.max(1, P.rows) / Math.sqrt(12);
        expStat = fitSlope(ins.map(g => Math.log(Math.max(1e-9, Lrow[g.row]))), ins.map(g => Math.log(g.n)), dLogL);
        expSample = 'insertions';
      }

      function status(extra) {
        const s = host.getState();
        const D = P.D, L = P.plane ? (rowsDone ? Lrow[0] : P.L0) : (rowsDone ? Lrow[rowsDone - 1] : P.L0);
        const pred = P.kSel * L / PI;
        const win = D.ok
          ? (D.dCrit > 0 ? 'd <b>' + P.Dv.toFixed(1) + '</b> > d_c ' + D.dCrit.toFixed(1) : 'window <b>open</b>')
          : '<b>outside the Turing window</b>: ' + failure(D);
        const tr = trace.length
          ? trace.slice(-3).map(x => x.n).join(' → ')
          : (P.plane && modeMN ? 'peak (' + modeMN.m + ', ' + modeMN.n + ')' : 'no pattern yet');
        // The plane's radius is a weighted centroid and carries an error bar of its own; the sheet's
        // count is an integer read straight off the field, so it is labelled exact rather than given
        // a fabricated one.
        const meas = !measN ? 'not yet'
          : (P.plane ? '<b>' + pm(measN, modeMN ? modeMN.se : NaN) + '</b>'
                     : '<b>' + measN + '</b> exact');

        // The self-check. Every measured quantity beside a theoretical one carries an uncertainty and
        // every comparison is in standard deviations; where no uncertainty can be formed, because
        // there are too few independent samples, that is said rather than papered over.
        let chk;
        if (expStat && isFinite(expStat.a) && isFinite(expStat.se) && expStat.se > 0) {
          chk = expVar + ' ∝ L^<b>' + pm(expStat.a, expStat.se) + '</b>, ' + expStat.n + ' '
            + expSample + (expStat.df <= 2 ? ' (' + expStat.df + ' d.f.)' : '')
            + ', <b>' + devTxt(expStat.a, expStat.se, 1, expStat.df) + '</b> of 1';
        } else {
          chk = expVar + ' ∝ L not fitted, ' + (expStat ? expStat.n : 0) + ' '
            + (expSample || 'samples') + ' is too few for an error bar';
        }
        if (kStat && isFinite(kStat.mean) && isFinite(kStat.se) && kStat.se > 0) {
          const z0 = sigmas(kStat.mean, kStat.se, P.kSel);
          const z = z0 === null ? 0 : (z0 < 0 ? -tToSigma(z0, kStat.n - 1) : tToSigma(z0, kStat.n - 1));
          chk += ' · k <b>' + pm(kStat.mean, kStat.se) + '</b>, ' + kStat.n + ' ' + kSample
            + ' vs ' + P.kSel.toFixed(2) + ', <b>' + sigTxt(z) + '</b>';
          // A large deviation is named, and the reason given where it is known. The peak of the
          // dispersion relation is the fastest growing mode of a FIXED domain; on a growing one the
          // pattern holds a count while k slides down the band and then splits, so the realized k
          // sweeps the band instead of sitting at its peak. That is finite size in the literal sense:
          // only integer numbers of half wavelengths fit.
          // A large deviation is named and its cause given, in the few words the bar has room for.
          // The Growth hint carries the rest: the count is held while k slides down the band and
          // jumps back at each insertion, so a faster domain lags further behind the peak.
          if (Math.abs(z) > 3) chk += ', growth lag';
        } else if (kStat && isFinite(kStat.mean)) {
          chk += ' · k <b>' + kStat.mean.toFixed(2) + '</b>, one ' + (kSample || 'sample')
            + ', no uncertainty claimed';
        }

        // Four spans, and short ones. The shell gives the bar about two lines before the text starts
        // running over the bottom of the plate, so everything here is squeezed to fit that: the mode
        // label is one word, the trace is the last four counts, and the reason for a large deviation
        // is three words pointing at the Growth hint, which has room for the sentence.
        host.setStatus(
          // "grid <w>×<h>" is load bearing, not decoration: tools/check.js reads the field size out of
          // this text and samples the canvas at those cell centres to compute the neighbour
          // correlation that catches an unstable integrator. Rename it and the detector silently
          // stops running while the check still reports PASS.
          '<span>grid <b>' + P.N + '×' + (P.plane ? P.N : P.rows) + '</b> ' + MODE_LABEL[s.mode] +
            ' · dt ' + P.dt.toExponential(1) + ', ' + P.bind + ' binds · step <b>' +
            stepsDone.toLocaleString() + '</b></span>' +
          '<span>' + KIN_LABEL[P.K.kind] + ', ' + LAW_LABEL[s.law] + ' · ' + win +
            ' · L <b>' + P.L0.toFixed(2) + ' → ' + L.toFixed(2) + '</b></span>' +
          '<span>' + (P.plane ? 'ρ' : 'n') + ' ' + meas + ' of <b>' + pred.toFixed(1) + '</b> · ' +
            tr + '</span>' +
          '<span>' + chk + (P.clamped ? ' · run trimmed to fit' : '') + (extra ? ' · ' + extra : '') + '</span>'
        );
      }

      /* ================= painting ================= */

      // Resample one Lagrangian row of N cells into wid output pixels.
      //
      // Compressing, which is every row above the bottom of the sheet, is an area average with
      // fractional ends. An integer box, counting whole cells only, takes one cell in some pixels and
      // two in the next as the row width creeps up by a fraction of a cell, and that alternation
      // beats against the stripes into a herringbone that is not in the field. Weighting the end
      // cells by how much of them the pixel covers removes it.
      //
      // Magnifying, which is the bottom of the sheet on a print sheet, is Catmull-Rom. It is
      // interpolating, so a tap at a cell centre returns that cell exactly and the picture still
      // agrees with the numbers measured off the field; nearest would give a mosaic and bilinear
      // leaves a lattice crease down every stripe.
      function resampleRow(src, off, N, wid, out) {
        if (wid <= N) {
          for (let x = 0; x < wid; x++) {
            const xs = x * N / wid, xe = (x + 1) * N / wid;
            let v = 0, ws = 0;
            for (let c = Math.max(0, xs | 0); c < Math.min(N, Math.ceil(xe)); c++) {
              const ov = Math.min(xe, c + 1) - Math.max(xs, c);
              if (ov <= 0) continue;
              v += src[off + c] * ov; ws += ov;
            }
            out[x] = ws > 0 ? v / ws : src[off + U.clamp(xs | 0, 0, N - 1)];
          }
          return;
        }
        for (let x = 0; x < wid; x++) {
          const fx = (x + 0.5) * N / wid - 0.5;
          const i0 = Math.floor(fx), f = fx - i0, f2 = f * f, f3 = f2 * f;
          const w0 = -0.5 * f3 + f2 - 0.5 * f, w1 = 1.5 * f3 - 2.5 * f2 + 1;
          const w2 = -1.5 * f3 + 2 * f2 + 0.5 * f, w3 = 0.5 * f3 - 0.5 * f2;
          out[x] = src[off + U.clamp(i0 - 1, 0, N - 1)] * w0 + src[off + U.clamp(i0, 0, N - 1)] * w1
            + src[off + U.clamp(i0 + 1, 0, N - 1)] * w2 + src[off + U.clamp(i0 + 2, 0, N - 1)] * w3;
        }
      }

      // The sheet. Every row holds the same N Lagrangian cells, drawn across the fraction of the
      // plate its physical length occupies, which is what makes the sheet widen as it goes down.
      //
      // It is composed straight at the output size rather than into an N wide buffer that is then
      // blown up with nearest sampling. The row width changes by a fraction of a cell from one row to
      // the next, so at cell resolution every stripe edge lands in a different cell in each row and
      // the plate comes out as a staircase of blocks; resampling per output pixel puts the edge where
      // the field puts it. The time axis is left at one plate row per computed row, because that is a
      // real resolution limit rather than an artifact, and fieldCells() declares it.
      function paintSheet(g, w, h) {
        const s = host.getState();
        const N = P.N, rows = P.rows;
        const lut = toneLUT(s);
        // Two tone has to be two tones. Mapping the threshold onto the ends of the ramp is not enough,
        // because several palettes end on a color close to their own background and the plate comes out
        // as a pale ghost of itself. The two entries actually furthest apart in luminance always read.
        let iDark = 0, iLight = 255;
        if (s.view === 'stripes') {
          let lmin = 1e9, lmax = -1e9;
          for (let i = 0; i < 256; i++) {
            const y = 0.2126 * lut[i * 3] + 0.7152 * lut[i * 3 + 1] + 0.0722 * lut[i * 3 + 2];
            if (y < lmin) { lmin = y; iDark = i; }
            if (y > lmax) { lmax = y; iLight = i; }
          }
        }
        const bgRgb = U.hexToRgb(s.bg || '#000000');
        const src = s.view === 'inhibitor' ? SV : SU;
        const span = Math.max(1e-6, hi - lo);
        const perRow = s.view === 'row' || s.view === 'stripes';
        // Per-slice views need a floor under the row range, or the rows above the bifurcation, where
        // the field is still the seeded perturbation, are stretched into a field of static.
        let gmax = 0;
        if (perRow) {
          for (let j = 0; j < rowsDone; j++) {
            const off = j * N; let mn = 1e30, mx = -1e30;
            for (let i = 0; i < N; i++) { const v = src[off + i]; if (v < mn) mn = v; if (v > mx) mx = v; }
            if (mx - mn > gmax) gmax = mx - mn;
          }
        }
        const rowFloor = 0.16 * gmax;
        const line = new Float32Array(w), rgb = new Uint8Array(w * 3);

        const buildRow = j => {
          if (j >= rowsDone) {
            for (let q = 0; q < w * 3; q += 3) { rgb[q] = bgRgb[0]; rgb[q + 1] = bgRgb[1]; rgb[q + 2] = bgRgb[2]; }
            return;
          }
          const off = j * N;
          const wid = U.clamp(Math.round(w * Lrow[j] / P.Lend), 1, w);
          const x0 = (w - wid) >> 1;
          let mean = 0, mn = 1e30, mx = -1e30;
          if (perRow) {
            for (let i = 0; i < N; i++) { const v = src[off + i]; mean += v; if (v < mn) mn = v; if (v > mx) mx = v; }
            mean /= N;
          }
          const half = Math.max(1e-6, Math.max(mx - mn, rowFloor) * 0.5);
          resampleRow(src, off, N, wid, line);
          for (let x = 0; x < w; x++) {
            const q = x * 3;
            if (x < x0 || x >= x0 + wid) { rgb[q] = bgRgb[0]; rgb[q + 1] = bgRgb[1]; rgb[q + 2] = bgRgb[2]; continue; }
            const v = line[x - x0];
            let li;
            if (s.view === 'stripes') li = (v > mean ? iLight : iDark) * 3;
            else {
              const t = s.view === 'row'
                ? U.clamp(0.5 + 0.5 * (v - mean) / half, 0, 1)
                : U.clamp((v - lo) / span, 0, 1);
              li = (t * 255 | 0) * 3;
            }
            rgb[q] = lut[li]; rgb[q + 1] = lut[li + 1]; rgb[q + 2] = lut[li + 2];
          }
        };

        const img = g.createImageData(w, h), d = img.data;
        let jPrev = -1;
        for (let y = 0; y < h; y++) {
          const j = Math.min(rows - 1, Math.floor(y * rows / h));
          if (j !== jPrev) { buildRow(j); jPrev = j; }
          let p = y * w * 4;
          for (let x = 0, q = 0; x < w; x++, p += 4, q += 3) {
            d[p] = rgb[q]; d[p + 1] = rgb[q + 1]; d[p + 2] = rgb[q + 2]; d[p + 3] = 255;
          }
        }
        g.putImageData(img, 0, 0);
        if (!building) grainOut(g, w, h, s.grain, s.seed);
      }

      // The plane. The field is far coarser than the plate, so it is resampled with Catmull-Rom,
      // which is interpolating: a tap at a cell center returns that cell's own value, so the picture
      // agrees with the measurement and no lattice crease is left along the fronts. The transform is
      // separable, so it is one horizontal pass into a strip and one vertical pass out of it rather
      // than sixteen taps per output pixel.
      function paintPlane(g, w, h) {
        const s = host.getState();
        const N = P.N;
        const side = Math.max(4, Math.round(Math.min(w, h) * (rowsDone ? Lrow[0] : P.L0) / P.Lend));
        const ox = Math.round((w - side) / 2), oy = Math.round((h - side) / 2);
        g.imageSmoothingEnabled = false;
        g.fillStyle = s.bg; g.fillRect(0, 0, w, h);
        const src = s.view === 'inhibitor' ? SV : SU;
        const idx = new Int32Array(side * 4), wt = new Float32Array(side * 4);
        for (let o = 0; o < side; o++) {
          const fx = (o + 0.5) * N / side - 0.5;
          const i0 = Math.floor(fx), f = fx - i0;
          const f2v = f * f, f3 = f2v * f;
          wt[o * 4] = -0.5 * f3 + f2v - 0.5 * f;
          wt[o * 4 + 1] = 1.5 * f3 - 2.5 * f2v + 1;
          wt[o * 4 + 2] = -1.5 * f3 + 2 * f2v + 0.5 * f;
          wt[o * 4 + 3] = 0.5 * f3 - 0.5 * f2v;
          for (let k = 0; k < 4; k++) idx[o * 4 + k] = U.clamp(i0 - 1 + k, 0, N - 1);
        }
        const strip = new Float32Array(side * N);
        for (let y = 0; y < N; y++) {
          const row = y * N, so = y * side;
          for (let o = 0; o < side; o++) {
            const b4 = o * 4;
            strip[so + o] = src[row + idx[b4]] * wt[b4] + src[row + idx[b4 + 1]] * wt[b4 + 1]
              + src[row + idx[b4 + 2]] * wt[b4 + 2] + src[row + idx[b4 + 3]] * wt[b4 + 3];
          }
        }
        const lut = toneLUT(s);
        const span = Math.max(1e-6, hi - lo);
        const img = g.createImageData(side, side), d = img.data;
        for (let oy2 = 0; oy2 < side; oy2++) {
          const b4 = oy2 * 4;
          const r0 = idx[b4] * side, r1 = idx[b4 + 1] * side, r2 = idx[b4 + 2] * side, r3 = idx[b4 + 3] * side;
          const w0 = wt[b4], w1 = wt[b4 + 1], w2 = wt[b4 + 2], w3 = wt[b4 + 3];
          for (let ox2 = 0; ox2 < side; ox2++) {
            const v = strip[r0 + ox2] * w0 + strip[r1 + ox2] * w1 + strip[r2 + ox2] * w2 + strip[r3 + ox2] * w3;
            const t = U.clamp((v - lo) / span, 0, 1);
            const li = (t * 255 | 0) * 3, p = (oy2 * side + ox2) * 4;
            d[p] = lut[li]; d[p + 1] = lut[li + 1]; d[p + 2] = lut[li + 2]; d[p + 3] = 255;
          }
        }
        g.putImageData(img, ox, oy);
        if (s.rings && ringL) {
          g.save();
          g.strokeStyle = U.inkRgba(s.bg, 0.45);
          g.lineWidth = Math.max(1, Math.round(Math.min(w, h) / 900));
          for (let i = 0; i < ringL.length; i++) {
            if (!(ringL[i] > 0)) continue;
            const sd = Math.round(Math.min(w, h) * ringL[i] / P.Lend);
            g.strokeRect(Math.round((w - sd) / 2) + 0.5, Math.round((h - sd) / 2) + 0.5, sd - 1, sd - 1);
          }
          g.restore();
        }
        if (!building) grainOut(g, w, h, s.grain, s.seed);
      }

      function paintTo(g, w, h) {
        if (!P || !SU) return;
        if (P.plane) paintPlane(g, w, h); else paintSheet(g, w, h);
      }
      function draw() { paintTo(ctx, canvas.width, canvas.height); }

      /* ================= build ================= */

      function seedFields() {
        const s = host.getState();
        const rng = U.makeRng(s.seed + '/growdomain/seed');
        const K = P.K, n = P.plane ? P.N * P.N : P.N;
        U1 = new Float32Array(n); V1 = new Float32Array(n);
        UN = new Float32Array(n); VN = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          U1[i] = K.u0 * (1 + s.amp * (rng() - 0.5) * 2);
          V1[i] = K.v0 * (1 + s.amp * (rng() - 0.5) * 2);
        }
      }

      function buildSheet() {
        const N = P.N, rows = P.rows;
        SU = new Float32Array(rows * N); SV = new Float32Array(rows * N);
        Lrow = new Float32Array(rows);
        rowsDone = 0; stepsDone = 0;
        let t = 0, tick = 0;
        building = true;
        const law = host.getState().law;
        // Painting the sheet costs more than extending it: a chunk is forty milliseconds of the inner
        // loop, while a repaint rebuilds the whole buffer, pushes it to the canvas and, on the last
        // pass, walks every canvas pixel for the grain. Show every third chunk, which still reads as
        // the sheet growing downwards, and always show the last one. A viewer who has asked for
        // reduced motion gets the finished sheet and nothing moving on the way there.
        const quiet = host.reducedMotion();
        const chunk = () => {
          timer = 0;
          const t0 = Date.now();
          while (rowsDone < rows && Date.now() - t0 < 38) {
            t = step1D(P.spr, t);
            const off = rowsDone * N;
            SU.set(U1, off); SV.set(V1, off);
            Lrow[rowsDone] = lengthAt(law, P.L0, P.Gf, P.r, t);
            rowsDone++; stepsDone += P.spr;
          }
          const done = rowsDone >= rows;
          if (done) building = false;
          if ((!quiet && tick % 3 === 0) || done) { expose(); measure(); draw(); status(done ? '' : 'building'); }
          tick++;
          if (!done) timer = setTimeout(chunk, 0);
          else pending = null;
        };
        pending = chunk; chunk();
      }

      // One point of the plane's own mode-doubling sample: the ring radius of the field as it stands,
      // paired with the domain length at that moment. The plane is a single picture rather than a
      // space-time sheet, so without these the exponent would have one point and no error bar.
      //
      // Before the bifurcation the field is the uniform state plus the seeded perturbation and its
      // spectrum is the spectrum of that noise, so a radius read off it would be a number about the
      // random number generator. Only a snapshot that carries a pattern joins the sample, and the
      // status line says how many did.
      function snapshot(t) {
        let mn = 1e30, mx = -1e30;
        for (let i = 0; i < U1.length; i++) { const v = U1[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
        if (!(mx - mn > 0.25 * P.K.u0)) return;
        const rs = ringStat(U1, P.N);
        snaps.push({ L: lengthAt(host.getState().law, P.L0, P.Gf, P.r, t), rho: rs.rho, se: rs.se });
      }

      function buildPlane() {
        const N = P.N;
        SU = new Float32Array(N * N); SV = new Float32Array(N * N);
        Lrow = new Float32Array(1); Lrow[0] = P.L0;
        ringL = new Float32Array(4);
        rowsDone = 0; stepsDone = 0; snaps = [];
        let t = 0, tick = 0;
        const marks = [0.25, 0.45, 0.65, 0.85].map(f => Math.floor(P.steps * f));
        const law = host.getState().law;
        const quiet = host.reducedMotion();
        building = true;
        const chunk = () => {
          timer = 0;
          const t0 = Date.now();
          while (stepsDone < P.steps && Date.now() - t0 < 38) {
            const n = Math.min(24, P.steps - stepsDone);
            t = step2D(n, t);
            stepsDone += n;
            for (let i = 0; i < 4; i++) if (!ringL[i] && stepsDone >= marks[i]) {
              ringL[i] = lengthAt(law, P.L0, P.Gf, P.r, t);
              snapshot(t);
            }
          }
          SU.set(U1); SV.set(V1);
          Lrow[0] = lengthAt(law, P.L0, P.Gf, P.r, t);
          rowsDone = 1;
          const done = stepsDone >= P.steps;
          if (done) { building = false; snapshot(t); }
          if ((!quiet && tick % 3 === 0) || done) { expose(); if (done) measure(); draw(); status(done ? '' : 'building'); }
          tick++;
          if (!done) timer = setTimeout(chunk, 0);
          else pending = null;
        };
        pending = chunk; chunk();
      }

      return {
        // The plate is a simulation grid magnified to print size, so the shell is told the grid and
        // renders once at size rather than supersampling and averaging down: on a field that is
        // already band limited by the cells that is a second low-pass for twice the memory. For the
        // sheet the two numbers are cells across and time rows, which is exactly what limits it.
        fieldCells() { return P ? [P.N, P.plane ? P.N : P.rows] : null; },
        aspect(s) { return ASPECTS[s.aspect] || 1.25; },
        regenerate() {
          stop(); pending = null; building = false; snaps = [];
          P = plan(host.getState());
          seedFields();
          if (P.plane) buildPlane(); else buildSheet();
        },
        repaint() { if (P && SU) { expose(); draw(); status(building ? 'building' : ''); } },
        resize() { if (P && SU) draw(); },
        pause() { stop(); },
        resume() {
          if (!P || !SU) return;
          draw();
          // A build interrupted by a tab switch picks up from the chunk it stopped on, with the
          // fields where it left them; a finished one just repaints.
          if (building && !timer && pending) timer = setTimeout(pending, 0);
        },
        action(key) { if (key === 'reseed') this.regenerate(); },
        async exportPNG(w, h) {
          if (!P || !SU) throw new Error('nothing to export');
          const out = document.createElement('canvas'); out.width = w; out.height = h;
          paintTo(out.getContext('2d'), w, h);
          return U.toBlob(out);
        },
      };
    },
  });
})();
