/* modules/sandpile.js */
/* GENChase: rotor-router aggregation (the Propp machine) against internal DLA at the same particle count, with the odometer, the rotor field, the measured inradius and outradius, and the abelian property checked cell by cell. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const PI = Math.PI;

  /* ---------- uncertainty ---------- */
  // A measured number printed beside a theoretical one without an error bar says nothing at all:
  // there is no way to tell agreement from disagreement. Every measurement this tab prints carries
  // one, or says in so many words that it is exact and carries no sampling error. Nothing is rounded
  // toward the theory and a large deviation is named rather than buried.
  function sigmas(v, se, ref) {
    if (!(isFinite(v) && isFinite(se) && se > 0)) return null;
    return (v - ref) / se;
  }
  function sigTxt(z) {
    if (z === null) return 'no uncertainty available';
    const m = Math.abs(z);
    return m.toFixed(1) + '\u03c3 ' + (m < 0.05 ? 'from it' : (z > 0 ? 'high' : 'low'));
  }
  // A sigma from a fit with one or two degrees of freedom is not a sigma. The residual based standard
  // error is itself a random variable with that many degrees of freedom, so the ratio follows Student's
  // t, whose tail is far fatter than the normal one. The two small cases have closed form tails,
  //
  //   df = 1, which is Cauchy:  P(|T| > t) = 1 - (2/pi) atan(t)
  //   df = 2:                   P(|T| > t) = 1 - t / sqrt(t^2 + 2)
  //
  // and from 3 d.f. up the gap is small enough that the ratio is reported as it stands. The
  // probability is turned back into the equivalent normal deviate with the Hastings rational
  // approximation. The rotor ladder below has four rungs and so two degrees of freedom, which is
  // exactly the case this matters for: a raw ratio there would print half a sigma too large.
  function tToSigma(t, df) {
    const a = Math.abs(t);
    if (!(df >= 1) || df >= 3 || !isFinite(a)) return a;
    const pr = df === 1 ? 1 - (2 / PI) * Math.atan(a) : 1 - a / Math.sqrt(a * a + 2);
    const q = Math.max(1e-12, Math.min(0.5, pr / 2));
    const u = Math.sqrt(-2 * Math.log(q));
    return u - (2.30753 + 0.27061 * u) / (1 + 0.99229 * u + 0.04481 * u * u);
  }
  function devTxt(v, se, ref, df) {
    const z = sigmas(v, se, ref);
    if (z === null) return 'no uncertainty available';
    return sigTxt(z < 0 ? -tToSigma(z, df) : tToSigma(z, df));
  }
  const pm = (v, se, d) => v.toFixed(d) + ' \u00b1 ' + (isFinite(se) && se > 0 ? se.toFixed(d) : '?');
  // Mean, sample standard deviation and the standard error of the mean, sd / sqrt(N), with N kept so
  // the status line can say how many samples are behind the bar. One sample has no spread to report.
  function meanSe(a) {
    const n = a.length;
    let m = 0; for (let i = 0; i < n; i++) m += a[i]; m /= n;
    if (n < 2) return { m, sd: NaN, se: NaN, n };
    let s = 0; for (let i = 0; i < n; i++) { const d = a[i] - m; s += d * d; }
    const sd = Math.sqrt(s / (n - 1));
    return { m, sd, se: sd / Math.sqrt(n), n };
  }
  // Ordinary least squares slope with the textbook standard error, se(b)^2 = s^2 / Sxx and
  // s^2 = sum(residual^2) / (k - 2): computed from the residuals and from the spread of the
  // independent variable, which is the only way it means anything. Three points is the fewest that
  // leaves a degree of freedom; below that the caller is handed no fit rather than a bare slope.
  function fitSlope(xs, ys) {
    const k = xs.length;
    if (k < 3) return { a: NaN, c: NaN, se: NaN, df: 0 };
    let mx = 0, my = 0;
    for (let i = 0; i < k; i++) { mx += xs[i]; my += ys[i]; }
    mx /= k; my /= k;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < k; i++) { const d = xs[i] - mx; sxx += d * d; sxy += d * (ys[i] - my); }
    if (!(sxx > 1e-12)) return { a: NaN, c: NaN, se: NaN, df: k - 2 };
    const a = sxy / sxx, c = my - a * mx;
    let ss = 0;
    for (let i = 0; i < k; i++) { const r = ys[i] - (a * xs[i] + c); ss += r * r; }
    return { a, c, se: Math.sqrt(ss / (k - 2) / sxx), df: k - 2 };
  }

  // Directions in screen order with y running down the buffer: 0 east, 1 south, 2 west, 3 north.
  // A rotor advances 0 -> 1 -> 2 -> 3 -> 0, which is a quarter turn clockwise on the plate.

  // Lattice half-width. The aggregate of n particles has radius about sqrt(n / pi); a particle only ever
  // moves while it is standing on an occupied site, so it can never get outside the aggregate. At
  // n = 50,000, the largest the slider offers, the half-width is 167 cells and the measured outradius
  // ran 128.4 to 128.9 over six seeds of the random aggregate and 126.9 for the rotor one, so the
  // nearest any run came to the border was 38 cells. That is a measurement on the sizes actually
  // offered and not a proof, so every loop here checks whether a particle has come to rest on the
  // border ring, stops if one ever does, and says so in the status line rather than quietly drawing a
  // clipped aggregate.
  const latticeR = n => Math.ceil(Math.sqrt(n / Math.PI)) + 12 + Math.ceil(2.5 * Math.log(Math.max(2, n)));
  // Half-width of the plate itself, fixed in advance from n so the picture does not jump size while it
  // builds. Six cells of margin past sqrt(n / pi) is what the fluctuation needs: the outradius sits about
  // 2.3 cells outside that circle at n = 8,000 and the excess grows like a logarithm, and the tightest
  // clearance measured at n = 50,000 over six seeds was 4.1 cells with a spread of half a cell.
  const plateR = n => Math.ceil(Math.sqrt(n / Math.PI)) + 6;

  // The starting rotors are built once, into an array, and both firing orders are handed the same array.
  // Drawing them twice from one seeded generator would advance the stream and hand the second order a
  // different lattice, which would make the abelian comparison a comparison of two different problems.
  function initRotors(kind, W, N, rng) {
    const a = new Uint8Array(N);
    if (kind === 'random') { for (let i = 0; i < N; i++) a[i] = rng.int(0, 3); }
    else if (kind === 'checker') { for (let i = 0; i < N; i++) a[i] = (((i % W) + ((i / W) | 0)) & 3); }
    // otherwise every rotor points east, so the first chip out of every site goes south
    return a;
  }

  // Rotor-router aggregation, routed one particle at a time. Each particle leaves the origin, and at every
  // occupied site it turns that site's rotor one step and follows it; the first unoccupied site it reaches
  // is where it stops. No random number is consulted anywhere in this loop.
  function newRotorSim(W, c, n, rot0) {
    const N = W * W;
    const occ = new Uint8Array(N), rot = new Uint8Array(N), od = new Int32Array(N), arr = new Int32Array(N).fill(-1);
    rot.set(rot0);
    occ[c] = 1; arr[c] = 0;
    let k = 1, steps = 0, escaped = false;
    const edge = p => p < W || p >= N - W || (p % W) === 0 || (p % W) === W - 1;
    return {
      occ, rot, od, arr, W,
      placed: () => k, steps: () => steps, escaped: () => escaped,
      step(ms) {
        const t0 = performance.now();
        while (k < n) {
          let p = c;
          while (occ[p]) {
            const d = (rot[p] + 1) & 3; rot[p] = d; od[p]++;
            p += d === 0 ? 1 : d === 1 ? W : d === 2 ? -1 : -W;
            steps++;
          }
          occ[p] = 1; arr[p] = k; k++;
          if (edge(p)) { escaped = true; return true; }
          if ((k & 63) === 0 && performance.now() - t0 > ms) return false;
        }
        return true;
      },
    };
  }

  // Internal diffusion limited aggregation: the same growth with a fair four-sided coin in place of the rotor.
  // This is the one place in the tab a random number is drawn, and it comes from the seeded generator.
  // A walk of four hundred million steps needs four hundred million coin flips, so the draws are taken
  // sixteen at a time: makeRng returns a full 32-bit word scaled into [0, 1), the multiplication back up by
  // 2^32 is exact, and the word is spent two bits per step. Same generator, same stream, same plate for a
  // given seed, one call instead of sixteen.
  function newIdlaSim(W, c, n, rng) {
    const N = W * W;
    const occ = new Uint8Array(N), od = new Int32Array(N), arr = new Int32Array(N).fill(-1);
    occ[c] = 1; arr[c] = 0;
    let k = 1, steps = 0, escaped = false, bits = 0, spare = 0;
    const edge = p => p < W || p >= N - W || (p % W) === 0 || (p % W) === W - 1;
    return {
      occ, rot: null, od, arr, W,
      placed: () => k, steps: () => steps, escaped: () => escaped,
      step(ms) {
        const t0 = performance.now();
        while (k < n) {
          let p = c;
          while (occ[p]) {
            if (spare === 0) { bits = (rng() * 4294967296) >>> 0; spare = 16; }
            const d = bits & 3; bits >>>= 2; spare--;
            od[p]++;
            p += d === 0 ? 1 : d === 1 ? W : d === 2 ? -1 : -W;
            steps++;
          }
          occ[p] = 1; arr[p] = k; k++;
          if (edge(p)) { escaped = true; return true; }
          if ((k & 63) === 0 && performance.now() - t0 > ms) return false;
        }
        return true;
      },
    };
  }

  // The same rotor-router aggregate built in a completely different order. Instead of routing one particle
  // to rest before the next one starts, all n particles are released at once and advanced in a rotation: on
  // each pass a particle standing on an occupied site turns that rotor and follows it, and a particle
  // standing on an unoccupied site claims it and drops out. Every interleaving of legal moves is allowed and
  // the abelian property says they all end in the same place; that is what the plate checks, cell by cell,
  // on the occupied set, on the final rotor at every site and on the odometer.
  //
  // BATCH is how many moves a particle is given before the rotation passes on. One move each is the most
  // thoroughly interleaved order there is and it is what this started as, but writing every particle's
  // position back on every single move costs about as much as the move does: measured at n = 20,000, one
  // move per pass took 1,390 ms against 826 at eight, 629 at thirty-two and 583 at a hundred and twenty
  // eight, where routing the same aggregate one particle at a time took 466. Thirty-two still has all
  // twenty thousand particles in flight at once against the one the sequential order has, which is the
  // whole substance of the claim. All four of those settings were compared against the sequential
  // aggregate cell by cell while this was chosen, and all four agreed in every cell.
  const BATCH = 32;
  function newRoundRobin(W, c, n, rot0) {
    const N = W * W;
    const occ = new Uint8Array(N), rot = new Uint8Array(N), od = new Int32Array(N);
    rot.set(rot0);
    const pos = new Int32Array(n);
    for (let i = 0; i < n; i++) pos[i] = c;
    let m = n, escaped = false;
    // The same border guard the one at a time loop carries. Without it a particle that reached the
    // edge ring would step off the buffer, and a typed array would swallow the write instead of
    // throwing: the comparison would then report a difference with no way to say where it came from.
    const edge = p => p < W || p >= N - W || (p % W) === 0 || (p % W) === W - 1;
    return {
      occ, rot, od,
      left: () => m, escaped: () => escaped,
      step(ms) {
        const t0 = performance.now();
        while (m > 0) {
          let w = 0;
          for (let i = 0; i < m; i++) {
            let p = pos[i], moved = 0;
            while (moved < BATCH && occ[p]) {
              const d = (rot[p] + 1) & 3; rot[p] = d; od[p]++;
              p += d === 0 ? 1 : d === 1 ? W : d === 2 ? -1 : -W;
              moved++;
            }
            if (occ[p] === 0) { occ[p] = 1; if (edge(p)) escaped = true; continue; }
            pos[w++] = p;
          }
          m = w;
          if (escaped) { m = 0; break; }
          if (performance.now() - t0 > ms) break;
        }
        return m === 0;
      },
    };
  }

  // Inradius as the distance to the nearest site the aggregate failed to fill, outradius as the distance to
  // the farthest site it did fill. Both are read off the finished plate, not predicted.
  function radii(occ, W, cx, cy) {
    let inr = Infinity, out = 0, cells = 0;
    for (let y = 0; y < W; y++) {
      const dy = y - cy, row = y * W;
      for (let x = 0; x < W; x++) {
        const dx = x - cx, r = Math.sqrt(dx * dx + dy * dy);
        if (occ[row + x]) { if (r > out) out = r; cells++; }
        else if (r < inr) inr = r;
      }
    }
    return { inr: inr === Infinity ? 0 : inr, out, cells };
  }

  function maxOf(a) { let m = 0; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; }

  /* ---------- the self-check ladder ---------- */
  // The plate itself is one aggregate of each kind, and one aggregate carries no error bar: there is
  // nothing to take a standard deviation over. So the tab grows a small ladder of its own, in the
  // background, once the plate is up, and that ladder is where every sigma on the status line comes
  // from. Four rungs, because a fit needs at least three to have a degree of freedom and the top rung
  // costs three quarters of the whole ladder: both models spend about n^2 / 2*pi steps in total, so
  // 8,000 is where a longer lever arm in log n stops paying for the second it adds.
  const LADDER = [1000, 2000, 4000, 8000];
  // Independent random aggregates per rung. Six is not many, and the status line says it is six rather
  // than hiding it; the standard error of a mean of six is itself uncertain by about a third, which is
  // why the deviations below are quoted to one decimal and not two.
  const REPS = 6;
  // Resamples behind the bootstrapped slope. Four hundred settles the standard deviation of the slope
  // to about four per cent of itself, which is finer than the slope is known.
  const BOOT = 400;
  // Computed once per (seed, starting arrows) and kept, so that moving the particle slider or switching
  // between the two growths does not pay for it again.
  const CHECKS = new Map();

  // The ladder, run in slices so the page never blocks. Each job is one whole aggregate; a job is
  // stepped for whatever is left of the slice and picked up again on the next one.
  function newLadder(seed, rot0) {
    const jobs = [];
    // With every rotor pointing the same way, or laid out in stripes, the rotor aggregate at a given n
    // is a single object: one run is the whole population and there is nothing to average. Scattered
    // rotors are drawn from the seed, so that case does get an ensemble.
    const rotReps = rot0 === 'random' ? REPS : 1;
    for (let i = 0; i < LADDER.length; i++) {
      const n = LADDER[i];
      for (let j = 0; j < rotReps; j++) jobs.push({ kind: 'rotor', i, n, seed: seed + '/chk/rot/' + n + '/' + j });
      for (let j = 0; j < REPS; j++) jobs.push({ kind: 'idla', i, n, seed: seed + '/chk/idla/' + n + '/' + j });
    }
    const rot = LADDER.map(() => []), idla = LADDER.map(() => []);
    let q = 0, sim = null, cur = null, R = 0, W = 0, bad = 0;
    return {
      done: () => q, total: jobs.length, result: null,
      step(ms) {
        const t0 = performance.now();
        while (q < jobs.length) {
          if (performance.now() - t0 >= ms) return false;
          if (!sim) {
            cur = jobs[q];
            R = latticeR(cur.n); W = 2 * R + 1;
            const c = R * W + R;
            sim = cur.kind === 'rotor'
              ? newRotorSim(W, c, cur.n, initRotors(rot0, W, W * W, U.makeRng(cur.seed)))
              : newIdlaSim(W, c, cur.n, U.makeRng(cur.seed));
          }
          if (!sim.step(Math.max(1, ms - (performance.now() - t0)))) return false;
          const st = radii(sim.occ, W, R, R);
          // Every particle occupies exactly one site, so an aggregate that does not hold exactly n of
          // them, or that reached the border ring, is not the object the theorem is about. Such a run
          // is counted and named rather than averaged in.
          if (sim.escaped() || st.cells !== cur.n) bad++;
          else (cur.kind === 'rotor' ? rot : idla)[cur.i].push(st);
          sim = null; q++;
        }
        // A rung the runs all fell out of has no mean and no bar. NaN is not an error bar, so the
        // ladder says it could not be measured rather than printing one.
        const thin = idla.some(a => a.length < 2) || rot.some(a => a.length < 1);
        this.result = thin ? { broken: true, bad } : summarizeLadder(rot, idla, seed, rot0, bad);
        return true;
      },
    };
  }

  // Everything the status line says in sigmas is computed here, once.
  function summarizeLadder(rot, idla, seed, rot0, bad) {
    const spread = a => a.map(o => o.out - o.inr);
    const rs = rot.map(a => meanSe(spread(a)));
    const is = idla.map(a => meanSe(spread(a)));
    const iIn = idla.map(a => meanSe(a.map(o => o.inr)));
    const iOut = idla.map(a => meanSe(a.map(o => o.out)));
    const rIn = rot.map(a => meanSe(a.map(o => o.inr)));
    const rOut = rot.map(a => meanSe(a.map(o => o.out)));
    const xs = LADDER.map(n => Math.log(n));
    const T = LADDER.length - 1, nT = LADDER[T], rootT = Math.sqrt(nT / PI), lnT = Math.log(nT);

    // The rim width is fitted as a power of n rather than against log n directly, because a power is
    // the thing there is an alternative hypothesis for. Over this ladder a width exactly proportional
    // to log n is itself a small power, and this is what that power is; it is derived from the ladder
    // rather than written down, so the two cannot drift apart if the rungs ever move. A rim that grew
    // like the square root of n, as a genuinely rough interface would, sits at 0.5 instead.
    const pLog = fitSlope(xs, xs.map(x => Math.log(x))).a;
    const fr = fitSlope(xs, rs.map(o => Math.log(o.m)));
    const fi = fitSlope(xs, is.map(o => Math.log(o.m)));

    // The rotor ladder with a fixed starting arrangement has no ensemble to resample: each rung is one
    // number with no sampling error in it at all, and the only scatter in that fit is how far four
    // exact points miss a straight line. Its slope therefore carries the residual standard error on two
    // degrees of freedom, read as a Student's t. The random ladder does have an ensemble, so its slope
    // is bootstrapped over the replicas with the seeded generator instead: propagating a standard error
    // through a log and a least squares fit by hand is exactly the case the house rules say to
    // bootstrap, and the resample also carries the rung to rung correlation that propagation would miss.
    const brng = U.makeRng(seed + '/boot');
    const sl = [];
    for (let b = 0; b < BOOT; b++) {
      const ys = idla.map(a => {
        let t = 0;
        for (let j = 0; j < a.length; j++) { const o = a[(brng() * a.length) | 0]; t += o.out - o.inr; }
        return Math.log(t / a.length);
      });
      const f = fitSlope(xs, ys);
      if (isFinite(f.a)) sl.push(f.a);
    }
    // Two standard errors are available for that slope and they answer different questions. The
    // bootstrap says how much the slope moves when the six aggregates at each rung are redrawn, and it
    // is blind to the line being the wrong shape. The residual standard error says how far the four
    // rung means miss a straight line, and it is blind to how well each mean is known. Reporting the
    // smaller of the two would claim a precision neither of them supports, so the larger is used and
    // both were looked at: on the default seed with all rotors east they are 0.0418 and 0.0078, the
    // bootstrap winning by a factor of five. Which one won is carried out with the number, because it
    // decides how the deviation is read. A bootstrap standard deviation over four hundred resamples is
    // read as a normal deviate; a residual standard error on two degrees of freedom is not one, and
    // has to go through the same Student's t the rotor slope does or it would overstate the result.
    const bootSd = sl.length > 1 ? meanSe(sl).sd : NaN;
    const useBoot = isFinite(bootSd) && (!isFinite(fi.se) || bootSd >= fi.se);
    const bootSe = useBoot ? bootSd : fi.se;
    const bootDf = useBoot ? 0 : fi.df;   // 0 means "read as a normal deviate"

    // The ratio of the two rim widths at the top rung. When the rotor side is a single exact number the
    // whole relative error is the random side's; when the starting rotors are scattered both sides have
    // one and they add in quadrature.
    const rExact = rs[T].n < 2;
    const ratio = is[T].m / rs[T].m;
    const relI = is[T].se / is[T].m;
    const relR = rExact ? 0 : rs[T].se / rs[T].m;
    const ratioSe = ratio * Math.sqrt(relI * relI + relR * relR);

    return {
      rot0, bad, reps: REPS, nTop: nT, rootTop: rootT, lnTop: lnT,
      rSpread: rs[T], iSpread: is[T], rExact,
      rOut: rOut[T], rIn: rIn[T], iOut: iOut[T], iIn: iIn[T],
      ratio, ratioSe, ratioZ: sigmas(ratio, ratioSe, 1),
      pLog, fr, fi, bootSe, bootDf,
      // out - sqrt(n/pi) and sqrt(n/pi) - in at the top rung. The theorem does not say either of these
      // is zero. It bounds the second by O(log r) and the first only by O(r^alpha) for alpha above a
      // half, so zero is the wrong reference to take a sigma against on either side, and the status
      // line quotes each offset as a fraction of log n, which is the scale the inner bound is written
      // in and, from what this ladder measures, the scale the outer one behaves on as well.
      iOutOff: iOut[T].m - rootT, iOutOffSe: iOut[T].se,
      iInOff: rootT - iIn[T].m, iInOffSe: iIn[T].se,
      rOutOff: rOut[T].m - rootT, rOutOffSe: rExact ? NaN : rOut[T].se,
      rInOff: rootT - rIn[T].m, rInOffSe: rExact ? NaN : rIn[T].se,
    };
  }

  const band = (t, cyc) => {
    t = U.clamp(t, 0, 1);
    if (cyc <= 1) return t;
    const v = t * cyc, f = v - Math.floor(v);
    return f === 0 && v > 0 ? 1 : f;
  };

  /* ---------- Rotor Routers ---------- */
  Studio.register({
    id: 'rotor',
    name: 'Rotor Routers',
    tab: 'Rotor',
    subtitle: 'rotor-router aggregation and internal DLA · 2009',
    order: 41,
    equation: 'at an occupied site turn the rotor a quarter turn and follow it; stop at the first unoccupied site.   inradius ≥ r − O(log r),  outradius ≤ r + O(r^α) for every α > 1 − 1/d,  r = √(n/π) in d = 2',
    credit: "Lionel Levine and Yuval Peres, 'Strong spherical asymptotics for rotor-router aggregation and the divisible sandpile', Potential Analysis 30, 1 (2009), is the theorem this plate measures. For an aggregate of n particles in d dimensions, written as n = ω_d r^d, they prove the inradius is at least r − O(log r) and the outradius at most r + O(r^α) for every α > 1 − 1/d, which in the plane is r + O(r^α) for every α > 1/2. The two sides of that sandwich are not the same strength, and the plate does not pretend they are: the inner bound is logarithmic and proved, the outer bound proved here is a power, and the status line reports what this lattice actually measures rather than what the tighter of the two would suggest. There is no probability anywhere in the statement. The rotor-router walk and the aggregation model are James Propp's; they are studied in Ander Holroyd and James Propp, 'Rotor walks and Markov chains', Contemporary Mathematics 520 (2010), and in Joshua Cooper and Joel Spencer, 'Simulating a random walk with constant error', Combinatorics, Probability and Computing 15 (2006). Internal diffusion limited aggregation, the random counterpart drawn beside it, is Gregory Lawler, Maury Bramson and David Griffeath, 'Internal diffusion limited aggregation', Annals of Probability 20, 2117 (1992), who proved its limit shape is a disk; David Jerison, Lionel Levine and Scott Sheffield, Journal of the American Mathematical Society 25, 271 (2012), showed its fluctuations are logarithmic as well, so the gap the plate measures between the two is one of constants and of certainty, not of orders. That a finished aggregate does not depend on the order the particles were routed in is the abelian property of Persi Diaconis and William Fulton, Rendiconti del Seminario Matematico dell'Università e del Politecnico di Torino (1991); it is the same argument Deepak Dhar, Physical Review Letters 64, 1613 (1990), made for the abelian sandpile of Per Bak, Chao Tang and Kurt Wiesenfeld, Physical Review Letters 59, 381 (1987).",
    blurb: 'Give every site of the square lattice a little arrow and one rule: when a particle arrives, turn the arrow a quarter turn and send the particle the way it now points. Release particles one at a time from the origin, each walking until it reaches a site nobody has claimed, and let it stop there. Nothing in that is random, and yet twenty thousand particles settle into a disk that is round to within about a cell and a half. The theorem behind that is one sided in a way worth knowing: Levine and Peres prove the aggregate contains a disk of radius √(n/π) − O(log n), and that it sits inside one of radius √(n/π) + O(n^β) for every β > 1/4, which is a far weaker statement than the inner one. The status line measures the inradius, the outradius and √(n/π) off the plate rather than asserting any of them, and it carries an error bar on every measurement that has one and says plainly which measurements are exact. Beside it is internal diffusion limited aggregation, the identical growth with a coin flip in place of the arrow at the identical particle count, and the comparison is the point: the random blob is round too, but its rim is frayed several times as wide. The status line makes that a measurement instead of an impression. It grows a small ladder of aggregates of both kinds, at 1,000, 2,000, 4,000 and 8,000 particles, several independent random ones at each rung, and reports the ratio of the two rim widths with the error bar the ensemble gives it, together with how each rim width grows with n. Two things about how that is read are worth knowing. The outradius is not supposed to equal √(n/π): the theorem asks for an offset that grows no faster than a logarithm, so zero is the wrong thing to compare against and the offset is quoted as a fraction of log n instead. And the rim width is fitted as a power of n rather than against log n directly, because a power is the thing there is an alternative to: over this ladder a width proportional to log n is itself a small power, the status line says which, and a rim that grew like √n, the way a genuinely rough interface does, would sit at 0.5 instead. The random rim lands on the logarithm. The rotor rim does not grow measurably at all across this decade, which the theorem allows, since its logarithm is an upper bound and nothing in it says the bound is reached. The picture you land on colors each site by when it was claimed and bands that order into growth rings, which is the sharpest of the four views on paper: an arrival ring is one cell wide, so the deterministic rings stay circles and the random ones break up into a mottle. The odometer counts how many particles passed through each site instead and bands the count into contours, a smoother picture of the same thing, and there the deterministic level sets come out as clean circles and the random ones shred at the edge. The rotor view draws the arrows themselves, and it is the strangest picture here, a quilt of patches with no randomness anywhere in it. The seed changes only the coin flips of the random aggregate, the optional scatter of the starting arrows, and the paper grain.',
    schema: [
      { group: 'Aggregate', key: 'mode', label: 'Growth', type: 'seg', kind: GEOM, wrap: true,
        options: [['rotor', 'Rotor-router'], ['idla', 'Internal DLA'], ['both', 'Side by side']],
        hint: 'Side by side grows both at the same particle count and draws them on one plate at one scale, which is the only fair way to look at them.' },
      RANGE('Aggregate', 'n', 'Particles', GEOM, 1000, 50000, 1000, v => v.toLocaleString(),
        { hint: 'Both models cost about n² steps in total, because the n-th particle has to cross an aggregate of radius √(n/π) before it can stop. Twenty thousand rotor-routed particles land in about a second, and side by side in under three; fifty thousand side by side takes around fifteen, with the count shown as it goes.' }),
      { group: 'Aggregate', key: 'rot0', label: 'Starting arrows', type: 'seg', kind: GEOM,
        options: [['east', 'All east'], ['checker', 'Diagonal stripes'], ['random', 'Scattered']],
        dimUnless: s => s.mode !== 'idla',
        hint: 'The theorem holds for any starting arrangement of rotors. All east is the classic Propp machine. Scattered is the one choice on this tab that the seed controls, and it is still a disk.' },
      { group: 'Picture', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['disk', 'Core and rim'], ['arrival', 'Arrival time'], ['odometer', 'Odometer'], ['rotors', 'Rotor field']],
        hint: 'Core and rim splits the aggregate at the measured inradius, so the ragged shell between inradius and outradius is drawn as itself. Rotor field needs rotors and falls back to core and rim for the random aggregate.' },
      RANGE('Picture', 'cycles', 'Contour bands', PAINT, 1, 14, 1, String,
        { dimUnless: s => s.view === 'arrival' || s.view === 'odometer',
          hint: 'How many times the palette repeats across the range. One is a smooth gradient; several turn the level sets of the count into contour rings, which is where the two models part company.' }),
      RANGE('Picture', 'tone', 'Odometer curve', PAINT, 0.15, 1, 0.05, f2,
        { dimUnless: s => s.view === 'odometer',
          hint: 'The odometer falls off steeply from the origin. This is the exponent it is raised to before the ramp, so a low value opens out the quiet rim.' }),
      { group: 'Picture', key: 'rings', label: 'Draw the measured radii', type: 'toggle', kind: PAINT,
        hint: 'Three circles on the lattice: the measured inradius, the measured outradius, and √(n/π) in full ink. They are marked cell by cell, like everything else on the plate.' },
      RANGE('Finish', 'grain', 'Grain', PAINT, 0, 0.5, 0.02, pct),
    ],
    defaults: {
      mode: 'both', n: 20000, rot0: 'east',
      // Arrival time at eleven bands rather than the odometer at six, because the odometer is a smooth
      // function of radius and six contour rings are too few to put any detail on paper: measured through
      // the real export path at 8 in and 300 ppi, the odometer default read edge acutance 0.19 and pixel
      // scale acuity 0.064, which is a verdict of SOFT, and raising the band count does not rescue it
      // (0.41 at twelve, 0.50 at fourteen, still SOFT). Arrival time at eleven bands reads 1.90 and 0.087,
      // which is sharp, because the level sets of the arrival order are one cell wide and there are
      // eleven of them. The odometer at six bands is still a preset; it is a picture, not the default.
      view: 'arrival', cycles: 11, tone: 0.4, rings: false, grain: 0.03,
      seed: 'propp-machine',
    },
    presets: {
      quilt: pre('The rotor quilt', { mode: 'rotor', n: 20000, rot0: 'east', view: 'rotors', rings: false, grain: 0 }, Pal.risograph),
      odometer: pre('Rotor odometer', { mode: 'rotor', n: 40000, rot0: 'east', view: 'odometer', cycles: 8, tone: 0.4, rings: false, grain: 0.03 }, Pal.ember),
      shells: pre('Growth rings', { mode: 'rotor', n: 20000, rot0: 'east', view: 'arrival', cycles: 14, rings: false, grain: 0.02 }, Pal.thermal),
      idla: pre('Internal DLA, the random twin', { mode: 'idla', n: 20000, view: 'arrival', cycles: 1, rings: true, grain: 0.04 }, Pal.glacier),
      versus: pre('The odometer, side by side', { mode: 'both', n: 20000, rot0: 'east', view: 'odometer', cycles: 6, tone: 0.4, rings: false, grain: 0.03 }, Pal.nightshade),
      rims: pre('Two rims at one scale', { mode: 'both', n: 12000, rot0: 'east', view: 'disk', rings: true, grain: 0.03 }, Pal.tram),
      stripes: pre('Started on the diagonal', { mode: 'rotor', n: 20000, rot0: 'checker', view: 'rotors', rings: false, grain: 0 }, Pal.verdigris),
    },
    hints: {
      Aggregate: 'The rotor-router aggregate is fully determined by the starting arrows: no seed, no coin, the same picture every time. The seed moves only the random walk of the internal DLA aggregate, the scattered starting arrows if you choose them, and the grain. That is also why half the numbers in the status line carry an error bar and half of them say "exact": a quantity with nothing random in it has no sampling error to report, and inventing a bar for it would be worse than saying so. The rotor rim at a given n and a given starting arrangement, the cell counts, and the cell by cell comparison of the two firing orders are all in that class. The random rim is not, so it is measured over an ensemble.',
      Picture: 'One pixel per lattice site, scaled up with nearest sampling. The picture is exact integers on a lattice, so nothing here is ever interpolated, on screen or in print.',
      Finish: 'Grain is added per lattice cell, so it scales up with the cells rather than sitting on top of the print as a separate texture.',
    },
    palette: true, defaultPalette: 'nightshade', paletteLabel: 'Colors (low → high count; four directions in the rotor view)',
    headline: 'n', headlineLabel: 'particles',
    closedGroups: ['Finish'],
    sanitize(s) {
      s.n = U.clamp(Math.round(Number(s.n) / 1000) * 1000, 1000, 50000);
      s.cycles = U.clamp(Math.round(Number(s.cycles) || 1), 1, 14);
      if (s.mode === 'idla' && s.view === 'rotors') s.view = 'disk';
    },
    surprise(rng) {
      const mode = rng.pick(['rotor', 'rotor', 'idla', 'both', 'both']);
      const view = mode === 'idla'
        ? rng.pick(['disk', 'arrival', 'odometer'])
        : rng.pick(['disk', 'arrival', 'odometer', 'odometer', 'rotors']);
      return {
        mode, n: rng.pick([6000, 12000, 20000, 20000, 30000]),
        rot0: rng.pick(['east', 'east', 'checker', 'random']),
        view, cycles: view === 'arrival' ? rng.int(1, 12) : rng.int(3, 10),
        tone: rng.pick([0.25, 0.4, 0.55, 0.8]),
        rings: view === 'disk' ? rng() < 0.7 : rng() < 0.2,
        grain: rng.pick([0, 0.03, 0.03, 0.08]),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      const buf = document.createElement('canvas');
      let bw = 0, bh = 0;

      let timer = 0, tasks = null, ti = 0, paused = false, key = '';
      let rotorSim = null, idlaSim = null, verify = null;
      let N = 0, R = 0, CR = 0, S = 0;
      let statRotor = null, statIdla = null, sharedMax = 1;
      let abelian = null, warn = '';
      // The self-check ladder runs on its own timer rather than as another item in the plate's task
      // list, so that moving the particle slider does not throw away a ladder halfway through: the
      // ladder depends on the seed and the starting arrows, and on nothing else the sliders touch.
      let chk = null, chkTimer = 0, chkKey = '', chkRes = null;
      // Repainting a half built plate on every work slice costs more than the work does. The whole
      // picture is rebuilt from scratch each time, one lattice site per pixel, and in a software
      // renderer that was running four times the arithmetic the simulation itself was. Four frames a
      // second is still a plate you watch grow, and it cut the time to the finished picture by more
      // than half. The finished plate is painted unconditionally, so nothing depends on the throttle.
      const PROGRESS_MS = 240;
      let lastTick = 0;
      function tickView(txt, repaintToo) {
        const now = performance.now();
        if (now - lastTick < PROGRESS_MS) return;
        lastTick = now;
        if (repaintToo) paint();
        status(txt);
      }

      function stopTimer() { if (timer) { clearTimeout(timer); timer = 0; } }
      function pump() {
        timer = 0;
        if (paused || !tasks) return;
        const t = tasks[ti];
        if (!t) { tasks = null; startCheck(); return; }
        const fin = t.step(28);
        if (fin) { if (t.after) t.after(); ti++; }
        else if (t.tick) t.tick();
        if (tasks && ti < tasks.length) timer = setTimeout(pump, 0);
        else { tasks = null; startCheck(); }
      }
      function start(list) { stopTimer(); tasks = list; ti = 0; timer = setTimeout(pump, 0); }

      /* ---- the self-check ladder ---- */
      const checkKeyOf = s => s.seed + '|' + (s.rot0 || 'east');
      function stopCheck() { if (chkTimer) { clearTimeout(chkTimer); chkTimer = 0; } chk = null; }
      // Started only once the plate is finished, so the picture never waits on the arithmetic behind it.
      function startCheck() {
        const s = host.getState(), ck = checkKeyOf(s);
        if (chkKey === ck && (chkRes || chk)) { if (chkRes) status(); return; }
        stopCheck(); chkKey = ck; chkRes = null;
        if (CHECKS.has(ck)) { chkRes = CHECKS.get(ck); status(); return; }
        chk = newLadder(s.seed, s.rot0 || 'east');
        chkTimer = setTimeout(pumpCheck, 0);
      }
      function pumpCheck() {
        chkTimer = 0;
        if (paused || !chk) return;
        if (chk.step(24)) { chkRes = chk.result; CHECKS.set(chkKey, chkRes); chk = null; status(); return; }
        tickView(undefined, false);
        chkTimer = setTimeout(pumpCheck, 0);
      }

      /* ---- picture ---- */
      let lut = null, lutKey = '';
      function ensureLut(s) {
        const k = (s.palette || []).join(',') + '|' + s.bg;
        if (lut && lutKey === k) return;
        lut = U.makeRampLUT(s.palette, null, 256); lutKey = k;
      }
      const col = t => { const i = (U.clamp(t, 0, 1) * 255 | 0) * 3; return [lut[i], lut[i + 1], lut[i + 2]]; };
      // The four rotor directions get four palette entries rather than four samples of the ramp, because
      // a direction is a label, not a quantity, and a sequential ramp would imply an order the rotors do
      // not have. Parsed once per repaint instead of once per lattice site.
      const rotorColors = s => [0, 1, 2, 3].map(k => U.hexToRgb(s.palette[k % s.palette.length]));

      // One lattice site, one pixel. Everything the plate says is an integer read out of the simulation.
      function blockColor(s, sim, i, dx, dy, st, rc) {
        const occ = sim.occ[i];
        if (s.view === 'odometer') {
          const v = sim.od[i];
          if (!occ && v === 0) return null;
          return col(band(Math.pow(v / sharedMax, s.tone), s.cycles));
        }
        if (!occ) {
          // a site the aggregate skipped although it lies inside the outer radius: the fluctuation itself
          if (s.view === 'disk' && st && dx * dx + dy * dy < st.out * st.out) return col(0.1);
          return null;
        }
        if (s.view === 'arrival') return col(band(sim.arr[i] / Math.max(1, sim.placed() - 1), s.cycles));
        if (s.view === 'rotors' && sim.rot) return rc[sim.rot[i] & 3];
        if (st) return dx * dx + dy * dy <= st.inr * st.inr ? col(0.5) : col(0.92);
        return col(0.5);
      }

      function drawBlock(px, s, sim, st, ox) {
        const bgc = U.hexToRgb(s.bg), W = sim.W, Rc = R, rc = rotorColors(s);
        for (let yy = 0; yy < S; yy++) {
          const gy = yy - CR + Rc;
          for (let xx = 0; xx < S; xx++) {
            const gx = xx - CR + Rc;
            const o = (yy * bw + ox + xx) * 4;
            let c = null;
            if (gx >= 0 && gy >= 0 && gx < W && gy < W) c = blockColor(s, sim, gy * W + gx, xx - CR, yy - CR, st, rc);
            if (!c) c = bgc;
            px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
          }
        }
      }

      // The measured radii marked on the lattice itself, a cell wide, so the circles are as discrete as the
      // aggregate they measure. Full ink is the theoretical radius; the two measurements sit either side of it.
      function drawRings(px, s, st, ox) {
        if (!st) return;
        const ink = U.hexToRgb(U.inkFor(s.bg)), bgc = U.hexToRgb(s.bg);
        const soft = [0, 1, 2].map(k => Math.round(ink[k] * 0.55 + bgc[k] * 0.45));
        const list = [[st.inr, soft], [Math.sqrt(st.n / Math.PI), ink], [st.out, soft]];
        for (const [r, c] of list) {
          if (!(r > 0.5) || r > CR) continue;
          const lo = (r - 0.5) * (r - 0.5), hi = (r + 0.5) * (r + 0.5);
          for (let yy = 0; yy < S; yy++) {
            const dy = yy - CR, dy2 = dy * dy;
            for (let xx = 0; xx < S; xx++) {
              const dx = xx - CR, d2 = dx * dx + dy2;
              if (d2 < lo || d2 > hi) continue;
              const o = (yy * bw + ox + xx) * 4;
              px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
            }
          }
        }
      }

      function paint() {
        const s = host.getState();
        if (!S || !rotorSim && !idlaSim) return;
        ensureLut(s);
        // The odometer ramp is normalised against the largest count on the plate, and in the side by side
        // it is the larger of the two, so the two halves are read against one scale and not each against
        // its own. Recomputed here rather than cached, so a half-built plate is exposed on what it has.
        sharedMax = Math.max(1, rotorSim ? maxOf(rotorSim.od) : 0, idlaSim ? maxOf(idlaSim.od) : 0);
        if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
        const g = buf.getContext('2d');
        const img = g.createImageData(bw, bh), px = img.data;
        const bgc = U.hexToRgb(s.bg);
        for (let i = 0; i < px.length; i += 4) { px[i] = bgc[0]; px[i + 1] = bgc[1]; px[i + 2] = bgc[2]; px[i + 3] = 255; }
        if (s.mode === 'both') {
          if (rotorSim) { drawBlock(px, s, rotorSim, statRotor, 0); if (s.rings) drawRings(px, s, statRotor, 0); }
          if (idlaSim) { drawBlock(px, s, idlaSim, statIdla, S); if (s.rings) drawRings(px, s, statIdla, S); }
        } else {
          const sim = s.mode === 'idla' ? idlaSim : rotorSim, st = s.mode === 'idla' ? statIdla : statRotor;
          if (sim) { drawBlock(px, s, sim, st, 0); if (s.rings) drawRings(px, s, st, 0); }
        }
        if (s.grain > 0) {
          const rng = U.makeRng(s.seed + '/grain'), a = s.grain * 26;
          for (let i = 0; i < px.length; i += 4) { const v = (rng() - 0.5) * a; px[i] += v; px[i + 1] += v; px[i + 2] += v; }
        }
        g.putImageData(img, 0, 0);
        blit(ctx, canvas.width, canvas.height, s.bg);
      }

      // Nearest sampling at an integer-free but uniform scale, centered: every lattice cell is the same size
      // and no cell is ever blended with its neighbor. Smoothing here would be a lie about an exact lattice.
      function blit(c2, w, h, bg) {
        c2.imageSmoothingEnabled = false;
        c2.fillStyle = bg; c2.fillRect(0, 0, w, h);
        if (!bw || !bh) return;
        const k = Math.min(w / bw, h / bh);
        const dw = Math.max(1, Math.round(bw * k)), dh = Math.max(1, Math.round(bh * k));
        c2.drawImage(buf, 0, 0, bw, bh, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
        c2.imageSmoothingEnabled = true;
      }

      /* ---- status ---- */
      // "exact" on this tab is not a compliment, it is a statement that the quantity has no sampling
      // error of any kind because there is nothing random in it to sample: the rotor aggregate at a given
      // n and a given starting arrangement is one object, and a cell count is a count. Saying so is more
      // informative than inventing a bar for it, and it is why the rotor numbers below carry no plus or
      // minus while the random ones do. The status line has a plate to sit under, so it says "exact" and
      // leaves the sentence explaining what that means to the panel on the left.
      function line(st, exact) {
        return 'in <b>' + f2(st.inr) + '</b> out <b>' + f2(st.out) + '</b> rim <b>' + f2(st.out - st.inr) +
          '</b> ' + (exact ? 'exact' : 'one draw');
      }
      // Total moves made by all the particles put together. It is the cost of the plate and it grows like
      // n², because the last particle has to cross an aggregate of radius √(n/π) before it can stop.
      function walked() {
        const v = (rotorSim ? rotorSim.steps() : 0) + (idlaSim ? idlaSim.steps() : 0);
        return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v.toLocaleString();
      }

      // The ladder, said out loud. Every sigma printed anywhere on this tab is printed here, and every
      // measured number printed beside a theoretical one is printed with its bar. It is written tight
      // because it has a plate to sit under; the panel on the left carries the sentences.
      function checkSpans() {
        if (!chkRes) {
          return chk ? '<span>ladder <b>' + chk.done() + '/' + chk.total + '</b> grown\u2026</span>' : '';
        }
        const c = chkRes;
        if (c.broken) return '<span><b>the self-check ladder could not be measured: ' + c.bad +
          ' of its aggregates did not hold exactly n cells</b></span>';
        const nT = c.nTop.toLocaleString(), L = c.lnTop;
        const rimR = c.rExact ? f2(c.rSpread.m) + '</b> exact' : pm(c.rSpread.m, c.rSpread.se, 2) + '</b>';
        // The theorem does not say either radius sits at exactly sqrt(n/pi); it says the two offsets are
        // bounded. So zero is not treated as the prediction: each offset is quoted in units of log n,
        // which is the scale the theorem talks in, with its bar carried through a division by an exact
        // constant. The rotor side carries a bar only when the starting arrows are scattered, which is the
        // one setting that gives it an ensemble; otherwise it is one object and says so.
        let a = '<span>ladder n = ' + nT + ', ' + c.reps + ' random: rim <b>' + pm(c.iSpread.m, c.iSpread.se, 2) +
          '</b> against rotor <b>' + rimR + ', rounder <b>\u00d7' + pm(c.ratio, c.ratioSe, 2) + '</b>, <b>' +
          sigTxt(c.ratioZ) + '</b> from 1 \u00b7 \u221a(n/\u03c0) <b>' + f2(c.rootTop) + '</b>: random out <b>+' +
          pm(c.iOutOff, c.iOutOffSe, 2) + '</b> in <b>\u2212' + pm(c.iInOff, c.iInOffSe, 2) + '</b>, that is <b>' +
          pm(c.iOutOff / L, c.iOutOffSe / L, 3) + '</b> and <b>' + pm(c.iInOff / L, c.iInOffSe / L, 3) +
          '</b> of log n ' + f2(L) + '; rotor <b>' +
          (c.rExact ? '+' + f2(c.rOutOff) + ' \u2212' + f2(c.rInOff) + '</b> exact'
                    : '+' + pm(c.rOutOff, c.rOutOffSe, 2) + ' \u2212' + pm(c.rInOff, c.rInOffSe, 2) + '</b>') + '</span>';
        // The fitted exponent, with the standard error of the fit coefficient rather than a guess at it.
        const rDev = devTxt(c.fr.a, c.fr.se, c.pLog, c.fr.df);
        const iDev = devTxt(c.fi.a, c.bootSe, c.pLog, c.bootDf);
        const iRough = devTxt(c.fi.a, c.bootSe, 0.5, c.bootDf);
        a += '<span>rim \u221d n^p: rotor <b>' + pm(c.fr.a, c.fr.se, 3) + '</b> on ' + c.fr.df +
          ' d.f., random <b>' + pm(c.fi.a, c.bootSe, 3) + '</b> ' +
          (c.bootDf ? 'on ' + c.bootDf + ' d.f.' : 'bootstrapped') + ', against <b>' + f3(c.pLog) +
          '</b> for growth \u221d log n: <b>' + rDev + '</b> and <b>' + iDev + '</b> \u00b7 \u221an, p = 0.5, is <b>' +
          iRough + '</b></span>';
        if (c.bad) a += '<span><b>' + c.bad + ' ladder runs discarded for not holding exactly n cells</b></span>';
        return a;
      }

      function status(extra) {
        const s = host.getState(), n = s.n;
        const root = Math.sqrt(n / Math.PI);
        const spans = [];
        const head = s.mode === 'both' ? '' : s.mode === 'idla' ? 'internal DLA · ' : 'rotor-router · ';
        spans.push('<span>' + head + 'n <b>' + n.toLocaleString() + '</b> · √(n/π) <b>' + f2(root) +
          '</b> · <b>' + bw + '×' + bh + '</b> cells · <b>' + walked() + '</b> steps</span>');
        const pieces = [];
        if (s.mode !== 'idla' && statRotor) pieces.push('rotor ' + line(statRotor, s.rot0 !== 'random'));
        if (s.mode !== 'rotor' && statIdla) pieces.push('IDLA ' + line(statIdla, false));
        const cells = (statRotor || statIdla || {}).cells;
        if (pieces.length) spans.push('<span>plate ' + pieces.join(' · ') + ' · cells <b>' +
          (cells || 0).toLocaleString() + '</b> = n, exact' + (abelian ? ' · abelian ' + abelian : '') + '</span>');

        let tail = extra ? '<span>' + extra + '</span>' : '';
        if (!extra) {
          if (warn) tail = '<span><b>' + warn + '</b></span>';
          else tail = checkSpans();
        }
        host.setStatus(spans.join('') + tail);
      }

      /* ---- build ---- */
      function compute() {
        const s = host.getState(), n = s.n;
        stopTimer(); tasks = null;
        rotorSim = idlaSim = verify = null;
        statRotor = statIdla = null; abelian = null; warn = ''; sharedMax = 1;
        R = latticeR(n); const W = 2 * R + 1; N = W * W;
        CR = plateR(n); S = 2 * CR + 1;
        // each half carries its own ring of empty cells, so the two plates butt together and still read apart
        bw = s.mode === 'both' ? 2 * S : S; bh = S;
        const c = R * W + R;
        const wantRotor = s.mode !== 'idla', wantIdla = s.mode !== 'rotor';
        const rot0 = initRotors(s.rot0, W, N, U.makeRng(s.seed + '/rotors'));
        const quiet = host.reducedMotion();
        const list = [];

        if (wantRotor) {
          rotorSim = newRotorSim(W, c, n, rot0);
          list.push({
            step: ms => rotorSim.step(ms),
            tick: () => tickView('routing <b>' + rotorSim.placed().toLocaleString() + '</b> of ' + n.toLocaleString() + '…', !quiet),
            after: () => {
              statRotor = radii(rotorSim.occ, W, R, R); statRotor.n = n;
              // every particle occupies exactly one site, so the aggregate has to hold n of them
              if (rotorSim.escaped()) warn = 'the rotor aggregate reached the edge of the lattice';
              else if (statRotor.cells !== n) warn = 'rotor aggregate holds ' + statRotor.cells.toLocaleString() + ' cells, not ' + n.toLocaleString();
            },
          });
        }
        if (wantIdla) {
          const rng = U.makeRng(s.seed + '/idla');
          idlaSim = newIdlaSim(W, c, n, rng);
          list.push({
            step: ms => idlaSim.step(ms),
            tick: () => tickView('walking <b>' + idlaSim.placed().toLocaleString() + '</b> of ' + n.toLocaleString() + '…', !quiet),
            after: () => {
              statIdla = radii(idlaSim.occ, W, R, R); statIdla.n = n;
              if (idlaSim.escaped()) warn = 'the random aggregate reached the edge of the lattice';
              else if (statIdla.cells !== n) warn = 'random aggregate holds ' + statIdla.cells.toLocaleString() + ' cells, not ' + n.toLocaleString();
            },
          });
        }
        // Paint the finished plate before the verification starts, so the picture does not wait on it.
        list.push({ step: () => true, after: () => { paint(); status(wantRotor ? 'checking the abelian property…' : ''); } });

        if (wantRotor) {
          verify = newRoundRobin(W, c, n, rot0);
          list.push({
            step: ms => verify.step(ms),
            tick: () => tickView('checking the abelian property, <b>' + verify.left().toLocaleString() + '</b> particles still moving…', false),
            after: () => {
              let diff = 0;
              for (let i = 0; i < N; i++) {
                if (verify.occ[i] !== rotorSim.occ[i] || verify.rot[i] !== rotorSim.rot[i] || verify.od[i] !== rotorSim.od[i]) diff++;
              }
              // A cell by cell comparison of two finite arrays is a count, not an estimate. There is
              // nothing to average and no bar to put on it: either every cell agrees or some named
              // number of them does not, and the occupied set, the final rotor at each site and the
              // number of particles that left each site are all compared, not just the silhouette.
              abelian = verify.escaped()
                ? '<b>the second order reached the edge of the lattice; not a valid comparison</b>'
                : diff === 0
                  ? '<b>identical</b> over ' + N.toLocaleString() +
                    ' cells under two firing orders, exact'
                  : '<b>' + diff.toLocaleString() + ' of ' + N.toLocaleString() + ' cells differ</b>, exact';
              verify = null;
              status();
            },
          });
        }
        start(list);
      }

      return {
        aspect(s) { return s.mode === 'both' ? 0.5 : 1; },
        // The plate is one pixel per lattice site: the print pipeline reads this and stops supersampling it.
        fieldCells() { return bw && bh ? [bw, bh] : null; },
        regenerate() {
          const s = host.getState();
          const k = [s.mode, s.n, s.rot0, s.seed].join('|');
          if (k === key && !tasks && (rotorSim || idlaSim)) { paint(); startCheck(); status(); return; }
          key = k;
          status('building…');
          compute();
        },
        repaint() { paint(); status(); },
        resize() { blit(ctx, canvas.width, canvas.height, host.getState().bg); },
        pause() { paused = true; stopTimer(); if (chkTimer) { clearTimeout(chkTimer); chkTimer = 0; } },
        resume() {
          if (!paused) { paint(); return; }
          paused = false;
          if (tasks && !timer) timer = setTimeout(pump, 0); else paint();
          if (chk && !chkTimer) chkTimer = setTimeout(pumpCheck, 0);
        },
        async exportPNG(w, h) {
          if (!bw || !bh) throw new Error('nothing to export');
          if (w > 30000 || h > 30000) throw new Error('print size too large for this lattice');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          blit(c.getContext('2d'), w, h, host.getState().bg);
          return U.toBlob(c);
        },
      };
    },
  });
})();
