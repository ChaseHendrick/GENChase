/* modules/lozenge.js */
/* GENChase: uniformly random lozenge tilings of the a,b,c hexagon, sampled exactly by coupling from the past, with the arctic ellipse measured on the finished plate. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // "1.4σ high", or "0.3σ from it" when the two agree. A measured number printed beside a theoretical
  // one without an error bar says nothing at all: there is no way to tell agreement from disagreement.
  // Nothing here is ever rounded toward the theory, and a large deviation is named rather than buried.
  function sigmas(v, se, ref) {
    if (!(isFinite(v) && isFinite(se) && se > 0)) return null;
    return (v - ref) / se;
  }
  function sigTxt(z) {
    if (z === null) return 'no uncertainty available';
    const m = Math.abs(z);
    return m.toFixed(1) + 'σ ' + (m < 0.05 ? 'from it' : (z > 0 ? 'high' : 'low'));
  }
  const pm = (v, se, d) => v.toFixed(d) + ' ± ' + (isFinite(se) && se > 0 ? se.toFixed(d) : '?');

  const S3 = Math.sqrt(3) / 2;
  const SIDE = 48;   // largest side the sampler is asked for; see MAXSITE
  // Angular sectors the arctic boundary is measured in. Fixed rather than scaled with the hexagon, so
  // that the reported deviation means the same thing at every size: more sectors means fewer tiles per
  // sector and more counting noise, and a number that moved with the size would not be comparable.
  const NB = 60;
  // Site updates the exact sampler may spend before it gives up and says so. Coupling from the past
  // has no upper bound on its running time, only an expectation, so a budget is the only honest way to
  // stop an unlucky seed at the largest hexagon from hanging the page.
  const MAXSITE = 3.2e8;

  const rot = (P, k) => { const n = P.length, i = ((k % n) + n) % n; return P.slice(i).concat(P.slice(0, i)); };

  // A face color that sits on the paper paints nothing, and the palette offset can rotate such a stop
  // onto any of the three orientations: that orientation then reads as a hole in the tiling rather
  // than as a rhombus. Push a color that close to the background toward the ink until it separates.
  function lift(hex, bg) {
    const lb = U.luminance(bg), ink = U.inkFor(bg);
    let c = hex;
    for (let k = 0; k < 8 && Math.abs(U.luminance(c) - lb) < 20; k++) c = U.mixHex(c, ink, 0.14);
    return c;
  }

  /* ---------------- the chain ----------------

     A lozenge tiling of the a, b, c hexagon is the same object as a boxed plane partition: a height
     h(x, y) on the a by b grid, integer, in [0, c], weakly decreasing in x and in y. The three rhombi
     are the three visible faces of the stack of unit cubes that height function describes.

     The single site heat bath resamples one column: given its neighbors, h(x, y) is uniform on
     [max(h(x+1, y), h(x, y+1)) .. min(h(x-1, y), h(x, y-1))], with c off the low side of the grid and
     0 off the high side. That conditional is exactly what the uniform measure on tilings says, so the
     chain holds the uniform measure with nothing to tune.

     Driving both the low and the high configuration from one uniform makes the update monotone.
     Uniform on {lo..hi} stochastically dominates uniform on {lo'..hi'} whenever lo' <= lo and
     hi' <= hi, and the shared inverse CDF is then order preserving pointwise, so two configurations
     ordered everywhere stay ordered everywhere. That is the whole reason coupling from the past can be
     run from the two extremes alone instead of from all of the astronomically many tilings at once. */

  // Counter based randomness. The uniform used at absolute sweep t on site k is a hash of (t, k) and
  // the seed, not the next draw from a stream. Coupling from the past demands that the map applied at
  // a given time be the same map on every restart, and a stream cannot be rewound into the middle of a
  // run; a hash can be evaluated at any (t, k) in any order, which is also what lets the build be
  // chunked against the clock without changing the sample it produces.
  function xi(t, site, key) {
    let h = Math.imul(t ^ key, 2654435761) ^ Math.imul((site + 0x9E3779B9) | 0, 2246822519);
    h ^= h >>> 15; h = Math.imul(h, 2246822507);
    h = (h + key) | 0;
    h ^= h >>> 13; h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // One systematic sweep of the heat bath over every column, in a fixed order. Gauss-Seidel: a column
  // sees the columns already updated in this sweep. Each single site update preserves the uniform
  // measure and is monotone, and a composition of monotone maps is monotone, so a whole sweep is a
  // legal update map for monotone coupling from the past.
  function sweep(h, a, b, c, t, key) {
    for (let j = 0; j < b; j++) {
      const row = j * a;
      for (let i = 0; i < a; i++) {
        const site = row + i;
        const hi = Math.min(i > 0 ? h[site - 1] : c, j > 0 ? h[site - a] : c);
        const lo = Math.max(i < a - 1 ? h[site + 1] : 0, j < b - 1 ? h[site + a] : 0);
        h[site] = lo + Math.floor(xi(t, site, key) * (hi - lo + 1));
      }
    }
  }

  // The sampler as a resumable job. Coupling from the past: start the empty box and the full box at
  // time -T, run both forward to time 0 through the same maps, and if they agree the common value is
  // an exact draw from the uniform measure. If they do not, double T and start again from the new,
  // earlier time, reusing every map from -T/2 onward. Doubling costs at most twice the successful run.
  //
  // What is sampled is the state at time 0 and nothing else. Once the two chains have met there is
  // only one state to carry, so the second chain is dropped and the survivor is run on to time 0; what
  // must not happen is stopping at the meeting and printing the state found there. The meeting time is
  // decided by the very maps being applied, so the state at the meeting is drawn from a tilted measure:
  // tilings that are easy to arrive at from both extremes at once are over-represented. Measured, on
  // the two by two by two box, which has twenty tilings, 8,000 draws with 400 expected in each:
  // reading at the meeting gives counts from 116 to 679 and chi-square 1,789 on 19 degrees of freedom,
  // reading at time 0 gives 349 to 440 and chi-square 33. It is the difference between exact and
  // plausible, and it is invisible on a plate.
  //
  // The exactness claim is the whole reason for doing it this way rather than running one long chain,
  // so it was tested rather than argued. Against complete enumeration of every tiling, comparing the
  // empirical distribution with the uniform one: 2·2·2 (20 tilings, 200,000 draws) chi-square 22.5 on
  // 19 degrees of freedom; 3·2·2 (50 tilings) 35.8 on 49; 2·3·4 and 4·3·2 (490 tilings) 462.3 and
  // 455.0 on 489; 3·3·3 (980 tilings) 976.6 on 979. Against the exact distribution of the volume,
  // which MacMahon's count confirms is over all of them: 4·4·4 (232,848 tilings) chi-square 79.0 on
  // 61, mean volume 31.992 ± 0.013 against exactly 32, 0.7σ low; 5·5·5 (267,227,532 tilings) 103.6 on
  // 96, mean volume 62.5006 ± 0.0228 against exactly 62.5, 0.0σ from it. Separately, the sandwich
  // itself was checked step by step: over 4,968,000 site comparisons the bottom chain never rose above
  // a third chain started elsewhere, that chain never rose above the top chain, and no chain ever left
  // the set of legal plane partitions. A run chunked against the clock reproduces the un-chunked run
  // exactly, state, T and meeting time alike.
  function makeJob(a, b, c, key, mode, heatSweeps) {
    const N = a * b;
    const maxT = Math.max(64, Math.pow(2, Math.floor(Math.log2(MAXSITE / (4 * N)))));
    const job = {
      a, b, c, key, mode, N, maxT,
      T: 1, t: mode === 'cftp' ? -1 : 0,
      bot: new Int16Array(N), top: new Int16Array(N),
      total: heatSweeps, coal: -1, exact: mode === 'cftp', done: false,
    };
    if (mode === 'cftp') job.top.fill(c);
    return job;
  }

  function runJob(job, ms) {
    const t0 = performance.now();
    const a = job.a, b = job.b, c = job.c, key = job.key, N = job.N;
    while (!job.done) {
      if (job.mode === 'heat') {
        sweep(job.bot, a, b, c, job.t, key);
        job.t++;
        if (job.t >= job.total) job.done = true;
      } else if (job.coal >= 0) {                      // met already: carry the one state on to time 0
        sweep(job.bot, a, b, c, job.t, key);
        job.t++;
        if (job.t >= 0) job.done = true;
      } else {
        if (job.t >= 0) {                              // the round reached time 0 without coalescing
          job.T *= 2;
          if (job.T > job.maxT) {                      // out of budget: say so and run a plain chain
            job.mode = 'heat'; job.exact = false;
            job.bot.fill(0); job.total = job.maxT; job.t = 0;
            continue;
          }
          job.bot.fill(0); job.top.fill(c); job.t = -job.T;
        }
        sweep(job.bot, a, b, c, job.t, key);
        sweep(job.top, a, b, c, job.t, key);
        job.t++;
        let eq = true;
        for (let k = 0; k < N; k++) if (job.bot[k] !== job.top[k]) { eq = false; break; }
        if (eq) { job.coal = job.t + job.T; if (job.t >= 0) job.done = true; }
      }
      if (performance.now() - t0 > ms) return;
    }
  }

  /* ---------------- does the sampler do what it claims ----------------

     The tab says the draw is exact, and that is not something a viewer should have to take on faith,
     so the plate tests it rather than asserting it. MacMahon's formula says the 2 by 2 by 2 box has
     exactly twenty lozenge tilings, and the same makeJob and runJob that draw the plate draw from that
     box a few thousand times, off this seed. Under the exactness claim the twenty counts are
     multinomial with equal probabilities, so chi-square on 19 degrees of freedom is the test, and
     Wilson-Hilferty, (chi2/df)^(1/3) being near normal with mean 1 - 2/(9 df) and variance 2/(9 df),
     turns it into the same standard deviations everything else here is quoted in. Any number of
     distinct tilings other than twenty fails outright, whatever the chi-square says.

     No verdict is printed, only the number. A test with a real null distribution overshoots sometimes
     and that is what makes it a test: over three hundred plate seeds the statistic came out with mean
     0.06 and standard deviation 1.03, 4.7 per cent of seeds past two sigma and 0.7 per cent past
     three, which is a standard normal to the accuracy three hundred seeds can measure one. A reading
     of 2.5 sigma on one plate is therefore ordinary; a reading that large on plate after plate is not.

     It is cheap, but the number depends on where it is timed and the two differ by more than a factor
     of two, so both are given. The 2 by 2 box coalesces after a handful of sweeps, and four thousand
     exact draws cost 7.7 to 9.2 ms under node once the call is warm, against 31 to 108 ms on the very
     first call in a process, which is the JIT rather than the work. Timed inside the tab where it
     actually runs, in a headless Chromium on a software renderer, it is 35 ms on the first plate of a
     session and 16 to 28 ms on every later one. That is inside one chunk of the plate's own sampler
     either way, and build() spends it in a chunk of its own rather than on the front of the first
     sampler chunk.

     What a regenerate actually blocks the page for, measured in a headless Chromium on a software
     renderer by timing every chunk callback the module schedules: each sampler chunk is the 32 ms it
     asks runJob for, and the finishing chunk, which measures the boundary and paints, is 30 to 60 ms
     once warm. Whichever plate is painted first in a session pays far more than that once, 0.26 s at
     32, 32, 32 and 1.4 to 1.8 s at 48, 48, 48 across two runs, and it is the canvas path being
     compiled rather than work this code repeats: every later plate in the same page finishes in
     under 75 ms, and the seventh repaint of the 48, 48, 48 plate is 61 ms. Nothing here chunks the paint itself, and it should not. The shell fingerprints
     the canvas every 400 ms and calls a plate Live after two consecutive changes, so a paint spread
     over several hundred milliseconds would announce a still plate as living, which is worse than a
     slow first frame.

     Twenty is not written down here either. It is Math.round of MacMahon's formula at 2, 2, 2, the
     same macmahonLog10 the status line quotes, so the number the test is held to comes from the
     closed form rather than from a constant somebody typed. */
  function samplerSelfTest(key, draws) {
    const seen = new Map();
    for (let i = 0; i < draws; i++) {
      const job = makeJob(2, 2, 2, (key + Math.imul(i, 2654435761)) | 0, 'cftp', 0);
      runJob(job, 1e9);
      const w = job.bot[0] * 27 + job.bot[1] * 9 + job.bot[2] * 3 + job.bot[3];
      seen.set(w, (seen.get(w) || 0) + 1);
    }
    // The cells are the twenty tilings MacMahon counts, not the ones that happened to turn up. A
    // sampler that could never reach one of them would show as a cell with zero in it, and dividing
    // the draws over the observed support instead would quietly drop that cell, shrink the degrees of
    // freedom and leave the chi-square looking healthy. Taking the larger of the two also keeps the
    // arithmetic right in the other direction, if the encoding ever let in a state that is not a
    // tiling at all. With 4,000 draws and 200 expected per cell, k is 20 on every seed tried, so this
    // changes nothing that is printed; it is what lets the test fail the way it says it can.
    const k = seen.size;
    const want = Math.round(Math.pow(10, macmahonLog10(2, 2, 2)));
    const cells = Math.max(k, want), exp = draws / cells;
    let chi = 0;
    seen.forEach(n => { chi += (n - exp) * (n - exp) / exp; });
    chi += (cells - k) * exp;                          // cells never drawn: (0 - exp)^2 / exp each
    const df = cells - 1;
    const z = df > 0 ? (Math.pow(chi / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df)) : NaN;
    return { draws, k, want, chi, df, z };
  }

  /* ---------------- the picture ----------------

     Project a cube corner (i, j, k) along (1, 1, 1). In the plane the three cube axes land on three
     unit vectors at 120 degrees, and the projection of the integer lattice is the triangular lattice:
     (i, j, k) and (i+1, j+1, k+1) land on the same point, so (u, v) = (i - k, j - k) names it. Every
     visible face of the stack is then a unit rhombus of that lattice, and the three face normals give
     the three orientations: 0 the tops, 1 the faces looking down and to the right, 2 the faces looking
     down and to the left.

     There are exactly a*b tops, one per column; b*c right faces, one for each row and level, sitting
     where that row of cubes ends; and a*c left faces. That is ab + bc + ca rhombi, which is the area
     of the hexagon in rhombus units. Each rhombus is two unit triangles, indexed A(u, v) and B(u, v)
     inside lattice cell (u, v). Filling those two arrays and finding no cell written twice and none
     out of range is a complete check that the faces really tile the hexagon, and bad counts any
     failure so the plate can admit it rather than draw over it. */
  function buildTiling(h, a, b, c) {
    const U0 = -c - 1, V0 = -c - 1, UW = a + c + 2, VW = b + c + 2;
    const TA = new Int8Array(UW * VW).fill(-1), TB = new Int8Array(UW * VW).fill(-1);
    const M = a * b + b * c + c * a;
    const ro = new Int8Array(M), ru = new Int16Array(M), rv = new Int16Array(M), rz = new Int16Array(M);
    const cnt = [0, 0, 0];
    let n = 0, bad = 0;
    const put = (arr, u, v, o) => {
      const uu = u - U0, vv = v - V0;
      if (uu < 0 || vv < 0 || uu >= UW || vv >= VW) { bad++; return; }
      if (arr[uu * VW + vv] !== -1) { bad++; return; }
      arr[uu * VW + vv] = o;
    };
    for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) {
      const z = h[j * a + i], u = i - z, v = j - z;
      put(TA, u, v, 0); put(TB, u, v, 0);
      ro[n] = 0; ru[n] = u; rv[n] = v; rz[n] = 2 * z; n++; cnt[0]++;
    }
    for (let k = 0; k < c; k++) for (let j = 0; j < b; j++) {
      let m = 0; while (m < a && h[j * a + m] > k) m++;
      const u = m - k - 1, v = j - k - 1;
      put(TB, u, v, 1); put(TA, u, v + 1, 1);
      ro[n] = 1; ru[n] = u; rv[n] = v; rz[n] = 2 * k + 1; n++; cnt[1]++;
    }
    for (let k = 0; k < c; k++) for (let i = 0; i < a; i++) {
      let q = 0; while (q < b && h[q * a + i] > k) q++;
      const u = i - k - 1, v = q - k - 1;
      put(TA, u, v, 2); put(TB, u + 1, v, 2);
      ro[n] = 2; ru[n] = u; rv[n] = v; rz[n] = 2 * k + 1; n++; cnt[2]++;
    }
    // Every triangle of the hexagon written exactly once, and ab, bc, ca faces of the three
    // orientations: both are counts fixed by the box, not estimates, so they carry no sampling error
    // and none is invented for them. cov is what the two triangle arrays actually hold, and it is the
    // one number that can catch a face laid in the wrong place at all.
    let cov = 0;
    for (let q = 0; q < TA.length; q++) { if (TA[q] >= 0) cov++; if (TB[q] >= 0) cov++; }
    const want = [a * b, b * c, c * a];
    const sound = bad === 0 && n === M && cov === 2 * M &&
      cnt[0] === want[0] && cnt[1] === want[1] && cnt[2] === want[2];
    return { TA, TB, U0, V0, UW, VW, ro, ru, rv, rz, M: n, bad, cnt, want, cov, sound };
  }

  // The four corners of a rhombus in lattice coordinates, written into out as u0, v0, u1, v1, ...
  function corners(o, u, v, out) {
    if (o === 0) { out[0] = u; out[1] = v; out[2] = u + 1; out[3] = v; out[4] = u + 1; out[5] = v + 1; out[6] = u; out[7] = v + 1; }
    else if (o === 1) { out[0] = u; out[1] = v; out[2] = u + 1; out[3] = v + 1; out[4] = u + 1; out[5] = v + 2; out[6] = u; out[7] = v + 1; }
    else { out[0] = u; out[1] = v; out[2] = u + 1; out[3] = v; out[4] = u + 2; out[5] = v + 1; out[6] = u + 1; out[7] = v + 1; }
  }

  /* ---------------- the arctic ellipse ----------------

     Cohn, Larsen and Propp: rescale the hexagon to a fixed size and let a, b, c grow. The frozen corner
     regions converge to the six pieces the hexagon cuts off outside the ellipse inscribed in it and
     tangent to all six sides, a circle when a, b and c are equal. Tangency alone fixes that ellipse.
     Each of the three pairs of parallel sides puts the center on its own midline, and the three
     midlines meet in one point; writing the conic as (p - C)' A^{-1} (p - C) = 1, tangency to a line
     at distance d with unit normal n reads n' A n = d^2, three linear equations for the three entries
     of A. The Cholesky factor of A is kept because it is what carries the ellipse to the unit circle. */
  function ellipseOf(a, b, c) {
    const P = 3 * (a + b) * (a + b) / 16, Q = 3 * (b + c) * (b + c) / 16, R = 3 * (a + c) * (a + c) / 16;
    const A11 = P, A12 = (Q - R) / Math.sqrt(3), A22 = 2 * (Q + R) / 3 - P / 3;
    const det = A11 * A22 - A12 * A12;
    const l11 = Math.sqrt(A11), l21 = A12 / l11, l22 = Math.sqrt(Math.max(1e-12, A22 - l21 * l21));
    return { A11, A12, A22, det, l11, l21, l22, cx: S3 * (a - b) / 2, cy: (2 * c - a - b) / 4 };
  }

  // MacMahon's box formula, in decimal digits. Nothing in the sampler uses it; it is there to say how
  // large the set is that the tiling on screen was drawn from.
  function macmahonLog10(a, b, c) {
    let s = 0;
    for (let i = 1; i <= a; i++) for (let j = 1; j <= b; j++) for (let k = 1; k <= c; k++) s += Math.log10((i + j + k - 1) / (i + j + k - 2));
    return s;
  }

  /* Frozen or disordered, decided locally. A triangle is frozen at radius R when every triangle within
     R steps of it, through shared edges, carries the same rhombus orientation. Deep in a corner of the
     hexagon the tiling is a brickwork of one orientation and nothing within any radius disagrees; in
     the middle the three orientations mix on every scale. Rather than walk a ball around every
     triangle, use f_R(x) = f_1(x) and f_{R-1}(y) for every neighbor y, which is the same set and costs
     three reads per triangle per radius. Triangles off the hexagon are absent rather than disagreeing,
     so a corner sitting against the rim is frozen, as it should be. */
  function classify(T, ring) {
    const TA = T.TA, TB = T.TB, UW = T.UW, VW = T.VW, nS = UW * VW;
    const fA = new Uint8Array(nS), fB = new Uint8Array(nS);
    const gA = new Uint8Array(nS), gB = new Uint8Array(nS);
    // neighbors of A(u, v) are B(u, v), B(u, v-1), B(u+1, v); of B(u, v) they are A(u, v), A(u, v+1), A(u-1, v)
    for (let uu = 0; uu < UW; uu++) for (let vv = 0; vv < VW; vv++) {
      const k = uu * VW + vv, oa = TA[k], ob = TB[k];
      if (oa >= 0) {
        let ok = !(TB[k] >= 0 && TB[k] !== oa);
        if (ok && vv > 0 && TB[k - 1] >= 0 && TB[k - 1] !== oa) ok = false;
        if (ok && uu + 1 < UW && TB[k + VW] >= 0 && TB[k + VW] !== oa) ok = false;
        fA[k] = ok ? 1 : 0;
      }
      if (ob >= 0) {
        let ok = !(TA[k] >= 0 && TA[k] !== ob);
        if (ok && vv + 1 < VW && TA[k + 1] >= 0 && TA[k + 1] !== ob) ok = false;
        if (ok && uu > 0 && TA[k - VW] >= 0 && TA[k - VW] !== ob) ok = false;
        fB[k] = ok ? 1 : 0;
      }
    }
    for (let r = 1; r < ring; r++) {
      gA.set(fA); gB.set(fB);
      for (let uu = 0; uu < UW; uu++) for (let vv = 0; vv < VW; vv++) {
        const k = uu * VW + vv;
        if (TA[k] >= 0 && gA[k]) {
          let ok = !(TB[k] >= 0 && !gB[k]);
          if (ok && vv > 0 && TB[k - 1] >= 0 && !gB[k - 1]) ok = false;
          if (ok && uu + 1 < UW && TB[k + VW] >= 0 && !gB[k + VW]) ok = false;
          fA[k] = ok ? 1 : 0;
        }
        if (TB[k] >= 0 && gB[k]) {
          let ok = !(TA[k] >= 0 && !gA[k]);
          if (ok && vv + 1 < VW && TA[k + 1] >= 0 && !gA[k + 1]) ok = false;
          if (ok && uu > 0 && TA[k - VW] >= 0 && !gA[k - VW]) ok = false;
          fB[k] = ok ? 1 : 0;
        }
      }
    }
    return { fA, fB };
  }

  /* ---------------- how large the error bar is ----------------

     The sixty sector radii are one measurement each, but they are not sixty independent numbers, and
     sd/sqrt(60) would be a flattering lie. Two things tie neighbors together: the split weighting hands
     every triangle to the two nearest sectors on purpose, and the arctic boundary is a smooth curve
     whose excursions run over a finite angle rather than jumping from sector to sector. The effective
     count is 60/tau with tau the integrated autocorrelation around the circle, the usual
     1 + 2 sum rho_l with the window closed at the first non-positive rho. Averaged over seeds tau comes
     out near 4 at every size tried; on one plate it runs from the floor of 2 up to about 10. Counted
     over twenty-five seeds at each of the eight shapes the presets use, the effective count lands
     between 5.8 and 30.0 of the sixty, the ceiling being where the floor on tau binds, with a mean
     near 16 on the regular hexagons and near 10 at 48, 48, 8. A second, independent family of forty
     to a hundred and twenty seeds per shape reached 5.0 at 48, 48, 8, where tau came out 12.1 on one
     plate, so the status line can print five; call the range five to thirty rather than six to thirty.
     The ceiling on tau, n/4, did not bind on any of the 460 plates of that family. The status line
     prints which.

     Checked rather than asserted, by drawing many tilings at one size and comparing the scatter of the
     mean radius across seeds with this single-tiling estimate averaged over the same seeds:

       a,b,c      seeds   sd over seeds   this estimate   ratio
       11,11,11    120       0.0084          0.0094        1.12
       12,12,12    120       0.0084          0.0092        1.10
       24,24,24    120       0.0054          0.0071        1.31
       32,32,32     80       0.0051          0.0062        1.20
       40,40,40     60       0.0044          0.0051        1.17
       48,48,48     60       0.0039          0.0044        1.13
       24,40,46     60       0.0059          0.0071        1.21
       20,20,40     60       0.0085          0.0079        0.92
       48,48, 8     60       0.0152          0.0226        1.49

     It runs a little wide except at 20,20,40, and wide is the safe direction for an error bar. It is
     quoted as it comes out rather than scaled to make the table read better.

     Rebuilt from scratch on a second, independent family of seeds, forty to a hundred and twenty per
     shape, the ratio came out 1.27 at 32,32,32, 1.54 at 40,40,40, 1.05 at 24,40,46, 1.11 at 11,11,11,
     1.82 at 48,48,8, 1.07 at 48,48,48, 0.86 at 20,20,40 and 1.10 at 36,36,36. Sixty seeds only pin an
     sd to about nine per cent of itself, so a single ratio moves by that much between seed families,
     and what survives both is the shape of the answer: wide nearly everywhere, and narrow at 20,20,40
     on both families. The floor on tau bound on 1 run in 60 at 32,32,32 and 48,48,48, 2 in 60 at
     40,40,40, 12 in 120 at 11,11,11 and on none of the rest; the ceiling at n/4 never bound at all. */
  function acTime(x) {
    const n = x.length;
    let m = 0;
    for (let i = 0; i < n; i++) m += x[i];
    m /= n;
    let c0 = 0;
    for (let i = 0; i < n; i++) c0 += (x[i] - m) * (x[i] - m);
    c0 /= n;
    if (!(c0 > 0)) return { mean: m, sd: 0, tau: 1, neff: n, se: 0 };
    let tau = 1;
    for (let l = 1; l <= Math.floor(n / 4); l++) {
      let c = 0;
      for (let k = 0; k < n; k++) c += (x[k] - m) * (x[(k + l) % n] - m);
      const rho = c / n / c0;
      if (!(rho > 0)) break;
      tau += 2 * rho;
    }
    // Floored at 2 rather than 1. The split weighting hands every triangle to two adjacent sectors
    // by construction, so consecutive sectors literally share data and tau cannot honestly be 1;
    // on the small hexagons the estimator can return it anyway when the sample is too short to see
    // its own correlation. Averaged over forty plates tau lands between 3.2 and 6.8 at every shape
    // these presets use, so the floor is not what sets the bar in the ordinary case; counted plate by
    // plate it binds on 4 of 40 at 11, 11, 11, 1 of 40 at 40, 40, 40 and at 24, 40, 46, and on none
    // at 32, 32, 32 or 48, 48, 48. A second family of seeds put it at 12 of 120 at 11, 11, 11, 2 of
    // 60 at 40, 40, 40, 1 of 60 at 32, 32, 32, 1 of 40 at 48, 48, 48 and none at the other four
    // shapes, so "none" above is that family and not a rule: the honest reading is a few plates in a
    // hundred everywhere except 11, 11, 11, where it is nearer one in ten. Where it binds the status
    // line says about thirty independent sectors, which is the most this ever claims.
    tau = Math.min(Math.max(tau, 2), n / 4);
    const sd = Math.sqrt(c0 * n / (n - 1));
    return { mean: m, sd, tau, neff: n / tau, se: sd * Math.sqrt(tau / n) };
  }

  /* The free area fraction is a ratio of two counts that are neither independent nor Poisson: frozen
     and free are large connected regions, so a binomial bar on the roughly 5,570 free triangles out of
     the 6,144 that a 32 by 32 by 32 plate carries comes out near 0.004, when the real seed to seed
     scatter is 0.0093: more than twice too small.
     Propagating anything through that would be a guess. Resample instead, in the one direction the
     fluctuation lives in: a circular block bootstrap over the sixty sector counts, blocks of tau
     consecutive sectors drawn with replacement from any starting angle, four hundred resamples, every
     draw off U.makeRng so the error bar reprints with the plate. Against the scatter across seeds, as
     above: 11,11,11 0.0151 measured and 0.0141 estimated; 24,24,24 0.0098 and 0.0105; 32,32,32 0.0093
     and 0.0092; 40,40,40 0.0079 and 0.0075; 48,48,48 0.0070 and 0.0064; 24,40,46 0.0102 and 0.0101;
     20,20,40 0.0150 and 0.0112; 48,48,8 0.0192 and 0.0230.

     On a second, independent family of seeds the same ratios read 1.04 at 32,32,32, 1.24 at 40,40,40,
     0.85 at 24,40,46, 0.91 at 11,11,11, 1.50 at 48,48,8, 0.87 at 48,48,48, 0.71 at 20,20,40 and 0.90
     at 36,36,36. Both families put 20,20,40 near 0.7, which is too far below one to be seed noise: an
     sd over sixty seeds carries about nine per cent of itself, and 0.71 sits three of those below.
     That shortfall is not a windowing choice that could be tuned away. A tall box's boundary has a
     mode in which the whole ring moves in or out together, and a shared offset changes the spread of
     the sixty sector counts not at all, so no resampling of one plate's own sectors can see it. The
     bar is left as it comes out and the Arctic hint says where it runs narrow; inflating it by a
     factor picked to make the table read better would be inventing the part that is missing. Counted
     over sixty seeds at 20,20,40 the free area reads past three sigma on 5 of them and the radius on
     3, against a mean deviation of only +0.7 and +0.5 sigma, which is what a bar that size does. */
  function blockBoot(bins, tau, rng, B) {
    const n = bins.length;
    const Lb = Math.max(2, Math.min(Math.round(tau), Math.floor(n / 3)));
    const nb = Math.max(1, Math.round(n / Lb));
    let tot = 0;
    for (let i = 0; i < n; i++) tot += bins[i];
    if (!(tot > 0)) return 0;
    const scale = n / (nb * Lb);
    let s1 = 0, s2 = 0;
    for (let b = 0; b < B; b++) {
      let s = 0;
      for (let q = 0; q < nb; q++) {
        const st = Math.min(n - 1, Math.floor(rng() * n));
        for (let l = 0; l < Lb; l++) s += bins[(st + l) % n];
      }
      s *= scale; s1 += s; s2 += s * s;
    }
    const m = s1 / B, v = Math.max(0, (s2 / B - m * m)) * B / (B - 1);
    return Math.sqrt(v) / tot;          // relative standard error of the total, hence of the fraction
  }

  /* The measurement. Map the plane by the inverse of the Cholesky factor of A, which carries the
     predicted ellipse onto the unit circle and scales every area by one constant. Sort the disordered
     triangles into NB angular sectors around the center. A sector of opening dtheta filled out to
     radius r holds area r^2 dtheta / 2, and the triangles have a known constant density, so the count
     in a sector gives the radius a boundary would need to enclose exactly them. That estimator uses
     every disordered triangle in the sector rather than the single outermost one, so a stray flip far
     out in a frozen corner moves it by one tile's worth instead of by its own distance. The predicted
     radius is 1 in these coordinates, at every angle, by construction.

     Each triangle is split between the two nearest sector centers by angle rather than dropped whole
     into one sector. Hard sector edges alias badly against a triangular lattice: wherever an edge lies
     along a lattice direction a whole row of centroids crosses at once, and a perfect disk measured
     that way comes back with a six-fold ripple of three per cent, which is the size of the effect
     being looked for. The same disk through the split weighting comes back flat to a few parts in a
     thousand, so what is left in the number below is the tiling and not the bookkeeping. */
  function measureArctic(T, a, b, c, ring, seed) {
    const TA = T.TA, TB = T.TB, U0 = T.U0, V0 = T.V0, UW = T.UW, VW = T.VW;
    const cl = classify(T, ring), fA = cl.fA, fB = cl.fB;
    const el = ellipseOf(a, b, c);
    const bins = new Float64Array(NB);
    let nTot = 0, nDis = 0;
    for (let uu = 0; uu < UW; uu++) for (let vv = 0; vv < VW; vv++) {
      const k = uu * VW + vv;
      for (let s = 0; s < 2; s++) {
        if ((s === 0 ? TA : TB)[k] < 0) continue;
        nTot++;
        if ((s === 0 ? fA : fB)[k]) continue;
        nDis++;
        const u = uu + U0 + (s === 0 ? 2 / 3 : 1 / 3), v = vv + V0 + (s === 0 ? 1 / 3 : 2 / 3);
        const px = (u - v) * S3 - el.cx, py = -(u + v) / 2 - el.cy;
        const wx = px / el.l11, wy = (py - el.l21 * wx) / el.l22;
        let th = Math.atan2(wy, wx); if (th < 0) th += 2 * Math.PI;
        const x = th / (2 * Math.PI) * NB - 0.5, i0 = Math.floor(x), fr = x - i0;
        bins[((i0 % NB) + NB) % NB] += 1 - fr;
        bins[((i0 + 1) % NB + NB) % NB] += fr;
      }
    }
    const rho = 4 * Math.sqrt(el.det) / Math.sqrt(3);   // triangles per unit area after the map
    const dth = 2 * Math.PI / NB;
    const rs = new Float64Array(NB);
    for (let k = 0; k < NB; k++) rs[k] = Math.sqrt(2 * bins[k] / (rho * dth));
    const st = acTime(rs);
    const disFrac = nDis / Math.max(1, nTot);
    const relSe = blockBoot(bins, st.tau, U.makeRng(String(seed) + '/arctic-boot'), 400);
    const hexArea = (a * b + b * c + c * a) * S3;
    return {
      ring, el, fA, fB, rs,
      rMean: st.mean, rSe: st.se, tau: st.tau, neff: st.neff, nSect: NB,
      nTot, nDis, disFrac, disSe: disFrac * relSe,
      predDisFrac: Math.PI * Math.sqrt(el.det) / hexArea,
    };
  }

  /* ---------- Lozenge Tilings ---------- */
  Studio.register({
    id: 'lozenge',
    name: 'Lozenge Tilings',
    tab: 'Lozenge',
    subtitle: 'random lozenge tilings of a hexagon, exact by coupling from the past · 1996',
    order: 48.5,
    equation: 'h(x, y) ∈ [0, c] weakly decreasing;  heat bath h(x, y) ~ U{max(h(x+1,y), h(x,y+1)) … min(h(x−1,y), h(x,y−1))};  run −T → 0 from ⊥ and ⊤ on one fixed set of maps, doubling T until they agree, and read the common value at 0',
    credit: "The sampler is James Propp and David Wilson, 'Exact sampling with coupled Markov chains and applications to statistical mechanics', Random Structures and Algorithms 9, 223 to 252 (1996); random tilings are one of their own worked examples. The limit shape measured on the plate is Henry Cohn, Michael Larsen and James Propp, 'The shape of a typical boxed plane partition', New York Journal of Mathematics 4, 137 to 165 (1998). The count of boxed plane partitions is Percy MacMahon, 'Memoir on the theory of the partitions of numbers, Part VI: partitions in two-dimensional space, to which is added an adumbration of the theory of partitions in three-dimensional space', Philosophical Transactions of the Royal Society A 211, 345 to 373 (1912). The height function that turns a tiling into a stack of cubes is William Thurston, 'Conway's tiling groups', American Mathematical Monthly 97, 757 to 773 (1990). How long this chain needs is David Wilson, 'Mixing times of lozenge tiling and card shuffling Markov chains', Annals of Applied Probability 14, 274 to 325 (2004).",
    blurb: 'Cut a hexagon with sides a, b, c, a, b, c out of the triangular grid and cover it with the three rhombi that fit, every covering equally likely. What comes out is a stack of unit cubes in the corner of an a by b by c room, seen from the corner: the three rhombi are the three visible faces of the cubes, and the tiling is nothing but the shape of the pile. Near each of the six corners of the hexagon the rhombi lock into a single orientation and stay there, and in the middle all three mix. The boundary between the two is nowhere in the rule and is not a hexagon: as the box grows it becomes the ellipse inscribed in the hexagon and tangent to all six sides, a circle when a, b and c are equal. This plate measures that boundary from the tiling on screen and prints it beside the prediction. The sampler is exact rather than merely long. Coupling from the past runs the empty box and the full box forward from further and further back on one fixed set of random choices, and once the two have met, what the pair of them has become by the present moment is a perfectly uniform draw, with no burn-in to judge and no bias left over. The present moment is the point: reading the tiling off at the moment the two met instead would quietly favor the tilings that are easy to meet in, and the plate would look exactly the same. The status line says how far back it had to start and how long the two took to meet, which is a fact about this hexagon and this seed rather than a number anyone chose. Two numbers there carry error bars, because a measurement printed beside a prediction without one cannot be read: the arctic radius is a mean over sixty angular sectors and the free area is a ratio of two counts, and both are compared with the prediction in standard deviations. A third number, how many rhombi of each orientation the tiling holds, is a plain count fixed by the box, so it is labeled exact and given no error bar at all. The agreement is a limit statement, so it improves as a, b and c grow together; where it does not agree the status line says so and, when the reason is known, gives it.',
    schema: [
      RANGE('Hexagon', 'a', 'Side a', GEOM, 3, SIDE, 1, String, { hint: 'The three sides of the box. The hexagon reads a, b, c, a, b, c around its rim and the tiling holds ab + bc + ca rhombi however the pieces fall.' }),
      RANGE('Hexagon', 'b', 'Side b', GEOM, 3, SIDE, 1, String),
      RANGE('Hexagon', 'c', 'Side c', GEOM, 3, SIDE, 1, String),
      { group: 'Hexagon', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, wrap: true,
        options: [['fit', 'Fit hexagon'], ['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']],
        hint: 'Fit gives the plate the hexagon\'s own proportion. The others letterbox the same hexagon inside a standard sheet.' },
      { group: 'Sampler', key: 'sampler', label: 'Sampler', type: 'seg', kind: GEOM,
        options: [['cftp', 'Exact (CFTP)'], ['heat', 'Heat bath']],
        hint: 'Exact is coupling from the past, and the plate is then a perfectly uniform tiling. Heat bath runs the same chain forward from the empty box for the number of sweeps you set, which is an approximation with no guarantee attached; the status line says which one you are looking at.' },
      RANGE('Sampler', 'sweeps', 'Sweeps', GEOM, 200, 20000, 100, String, { dimUnless: s => s.sampler === 'heat',
        hint: 'One sweep is one heat bath update of every column. Coupling from the past at the same size usually starts a few thousand sweeps back, which is a fair place to set this if you want to see what a short run leaves behind.' }),
      { group: 'Tiles', key: 'fill', label: 'Color by', type: 'seg', kind: PAINT, wrap: true,
        options: [['shade', 'Cube faces'], ['flat', 'Three colors'], ['height', 'Height'], ['frozen', 'Frozen vs free']] },
      RANGE('Tiles', 'shift', 'Palette offset', PAINT, 0, 15, 1, String),
      RANGE('Tiles', 'inset', 'Gap inset (grout)', PAINT, 0, 0.3, 0.01, f2),
      RANGE('Tiles', 'strokeWidth', 'Stroke weight', PAINT, 0, 3, 0.1, f1),
      RANGE('Tiles', 'strokeColor', 'Stroke color index', PAINT, 0, 15, 1, String, { dimUnless: s => s.strokeWidth > 0 }),
      RANGE('Arctic', 'ring', 'Frozen test radius', PAINT, 1, 4, 1, String, { hint: 'A tile counts as frozen when every tile within this many steps of it carries the same orientation. This is a systematic choice, not a statistical one, so it moves the answer rather than scattering it and it sits outside the error bar. Measured at 48, 48, 48 over thirty seeds, the arctic radius against 1 and then the free area against the predicted 0.9069: radius 1 gives 0.9104 ± 0.0007 and 0.7521 ± 0.0012, radius 2 gives 0.9835 ± 0.0006 and 0.8775 ± 0.0011, radius 3 gives 0.9984 ± 0.0007 and 0.9042 ± 0.0013, radius 4 gives 1.0073 ± 0.0007 and 0.9205 ± 0.0014. Both printed numbers move together, so this setting shifts the whole measurement rather than one half of it. Those bars are on the mean of thirty plates, about five times tighter than the bar a single plate carries, which is why the status line on one plate can call radius 3 perfect agreement while thirty plates together show it is two sigma low. None of the four settings agrees once enough plates are averaged, because none of them is the arctic boundary itself; 3 is simply the one that lands closest, and where it lands depends on the size: over forty seeds at 32, 32, 32 it reads 1.0026 ± 0.0009, three sigma high, against two sigma low at 48, 48, 48, so it crosses somewhere between the two.' }),
      { group: 'Arctic', key: 'arctic', label: 'Draw the boundary', type: 'seg', kind: PAINT,
        options: [['off', 'Off'], ['pred', 'Predicted ellipse'], ['both', 'Predicted and measured']] },
      RANGE('Arctic', 'curveW', 'Curve weight', PAINT, 0.4, 5, 0.2, f1, { dimUnless: s => s.arctic !== 'off' }),
      RANGE('Finish', 'margin', 'Margin', PAINT, 0, 0.2, 0.01, f2),
      RANGE('Finish', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      a: 32, b: 32, c: 32, aspect: 'fit',
      sampler: 'cftp', sweeps: 4000,
      fill: 'shade', shift: 0, inset: 0.04, strokeWidth: 0, strokeColor: 3,
      ring: 3, arctic: 'off', curveW: 1.6,
      margin: 0.06, grain: 0.04,
      seed: 'propp-wilson-1996',
    },
    presets: {
      // No grout and a cool palette, so this is not the default plate at a larger side. Closing the
      // gap between the rhombi drops the frozen corners back to three sheets of one color, so the
      // circle between them is the only place anything happens, which is the point of the preset.
      // The sheets are not quite flat: with inset at zero the hairline below narrows the seam between
      // abutting rhombi without closing it, so a faint lattice of the paper still shows through the
      // corners. On this plate it reads as the weave of a tiled surface rather than as a fault.
      circle: pre('Arctic circle, a = b = c = 40', { a: 40, b: 40, c: 40, aspect: 'fit', sampler: 'cftp', fill: 'shade', shift: 0, inset: 0, strokeWidth: 0, ring: 3, arctic: 'off', margin: 0.06, grain: 0.03 }, Pal.harbor),
      ellipse: pre('Skewed hexagon, the ellipse', { a: 24, b: 40, c: 46, aspect: 'fit', sampler: 'cftp', fill: 'shade', shift: 1, inset: 0.03, strokeWidth: 0, ring: 3, arctic: 'both', curveW: 1.8, margin: 0.06, grain: 0.03 }, Pal.verdigris),
      cubes: pre('Stack of cubes, a = b = c = 11', { a: 11, b: 11, c: 11, aspect: 'fit', sampler: 'cftp', fill: 'shade', shift: 0, inset: 0.05, strokeWidth: 1.2, strokeColor: 3, ring: 3, arctic: 'off', margin: 0.07, grain: 0 }, Pal.tram),
      flat: pre('Flattened box, wide frozen wedges', { a: 48, b: 48, c: 8, aspect: 'fit', sampler: 'cftp', fill: 'frozen', shift: 0, inset: 0.02, strokeWidth: 0, ring: 3, arctic: 'pred', curveW: 1.6, margin: 0.05, grain: 0.04 }, Pal.ember),
      fine: pre('Fine, a = b = c = 48', { a: 48, b: 48, c: 48, aspect: 'fit', sampler: 'cftp', fill: 'height', shift: 0, inset: 0, strokeWidth: 0, ring: 3, arctic: 'off', margin: 0.05, grain: 0.05 }, Pal.glacier),
      tower: pre('Tall box, a = b = 20, c = 40', { a: 20, b: 20, c: 40, aspect: 'fit', sampler: 'cftp', fill: 'flat', shift: 0, inset: 0.06, strokeWidth: 0.6, strokeColor: 3, ring: 3, arctic: 'off', margin: 0.06, grain: 0.03 }, Pal.risograph),
      proof: pre('Frozen versus free', { a: 36, b: 36, c: 36, aspect: '1:1', sampler: 'cftp', fill: 'frozen', shift: 2, inset: 0.02, strokeWidth: 0, ring: 3, arctic: 'both', curveW: 2, margin: 0.06, grain: 0.03 }, Pal.graphite),
    },
    hints: {
      Hexagon: 'The seed fixes every random choice the sampler makes, so a seed and a, b, c reprint exactly the same tiling. MacMahon counted how many there are to choose from, and the status line reports it.',
      Sampler: 'Coupling from the past has no fixed running time. It doubles how far back it starts until the two extreme tilings, run forward on the same random choices, arrive at the same place. At the largest hexagons an unlucky seed can run past the work budget, and the plate then falls back to a plain forward run and says in the status line that it is no longer exact. The status line also tests the exactness claim instead of only making it: four thousand draws from the 2 by 2 by 2 box, which MacMahon says has exactly twenty tilings, against the uniform distribution over those twenty. It is a real statistical test with a real null distribution, so about one seed in twenty reads past two sigma and about one in a hundred and fifty past three; that is the test working, not the sampler failing. A reading that large on seed after seed would be something else.',
      Arctic: 'The measured boundary is read off the plate itself: every tile is called frozen or free from its own neighborhood, the free ones are counted in sixty angular sectors around the center of the predicted ellipse, and the radius that would enclose them is compared with the ellipse. In the coordinates that comparison is made in, the prediction is a radius of exactly 1 at every angle. The sixty sectors are not sixty independent numbers, so the error bar on their mean is widened by the measured autocorrelation around the circle, which over the shapes these presets use leaves somewhere between five and thirty of them and the status line says how many; the error bar on the free area comes from a seeded bootstrap over the same sectors, since a binomial bar on that many tiles would be more than twice too small. Both estimates were checked against the scatter across many seeds, at the eight shapes these presets use, and neither is exact: the radius bar comes out between about 0.9 and 1.8 times that scatter and the free area bar between about 0.7 and 1.5 of it. Wide is the safe direction and most shapes sit there, but on a tall box like 20, 20, 40 the free area bar runs about thirty per cent narrow, because resampling one plate\'s own sectors cannot see the whole boundary breathing in or out together, and on such a box a reading of three sigma is nearer two. Read these bars as the right size rather than as an exact one. It is a limit statement, so the agreement improves as a, b and c grow together and is poor when one of them is small: averaged over many seeds the radius reads 1.023 at 11, 11, 11 and 0.954 at 48, 48, 8, against 1.000 wherever the limit has been reached.',
      Tiles: 'Cube faces shades the three orientations light, middle and dark so the pile reads as solid, as if the light came from over your left shoulder. Height colors every face by how far above the floor of the box it sits and keeps the same shading over it.',
    },
    palette: true, defaultPalette: 'kiln', paletteLabel: 'Colors (tops, right faces, left faces)',
    headline: 'a', headlineLabel: 'side a',
    closedGroups: ['Finish'],
    sanitize(s) {
      s.a = U.clamp(Math.round(Number(s.a) || 32), 3, SIDE);
      s.b = U.clamp(Math.round(Number(s.b) || 32), 3, SIDE);
      s.c = U.clamp(Math.round(Number(s.c) || 32), 3, SIDE);
      s.ring = U.clamp(Math.round(Number(s.ring) || 3), 1, 4);
      s.sweeps = U.clamp(Math.round(Number(s.sweeps) || 4000), 200, 20000);
    },
    surprise(rng) {
      const shape = rng.pick(['reg', 'reg', 'skew', 'flat', 'tall']);
      let a, b, c;
      if (shape === 'reg') { a = b = c = rng.pick([11, 18, 26, 34, 44]); }
      else if (shape === 'skew') { a = rng.int(14, 46); b = rng.int(12, 44); c = rng.int(12, 44); }
      else if (shape === 'flat') { a = rng.int(28, 48); b = a; c = rng.int(5, 12); }
      else { a = rng.int(12, 22); b = rng.int(12, 22); c = rng.int(28, 46); }
      return {
        a, b, c, aspect: rng.pick(['fit', 'fit', 'fit', '1:1', '4:5']),
        sampler: 'cftp', sweeps: 4000,
        fill: rng.pick(['shade', 'shade', 'flat', 'height', 'frozen']), shift: rng.int(0, 4),
        inset: a < 16 ? rng.pick([0.05, 0.08]) : rng.pick([0, 0.02, 0.04]),
        strokeWidth: a < 16 ? rng.pick([0, 0.8, 1.2]) : 0, strokeColor: rng.int(0, 4),
        ring: 3, arctic: rng() < 0.25 ? 'both' : 'off', curveW: 1.6,
        margin: 0.06, grain: rng.pick([0, 0.03, 0.06]),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let tile = null, meas = null, timer = 0, building = false;
      let sig = '', mac = 0, info = null, self = null;

      const sigOf = s => [s.a, s.b, s.c, s.sampler, s.sweeps, s.seed].join('/');

      function build(s, done) {
        clearTimeout(timer); building = true; tile = null; meas = null; info = null; self = null;
        const key = (U.makeRng(s.seed + '/lozenge')() * 4294967296) >>> 0;
        const selfKey = (U.makeRng(s.seed + '/selftest')() * 4294967296) | 0;
        const job = makeJob(s.a, s.b, s.c, key, s.sampler, s.sweeps);
        mac = macmahonLog10(s.a, s.b, s.c);
        status('sampling');
        (function chunk() {
          // The self-test gets a slice of its own rather than riding along with the first sampler
          // chunk, so neither slice is longer than one ordinary chunk. Timed in the tab in a headless
          // Chromium on a software renderer, it is 35 ms on the first plate of a session and 16 to
          // 28 ms afterwards, against the 7.7 to 9.2 ms the same call costs warm under node.
          if (!self) { self = samplerSelfTest(selfKey, 4000); status('sampling'); timer = setTimeout(chunk, 0); return; }
          runJob(job, 32);
          if (!job.done) {
            status(job.mode === 'cftp'
              ? 'from <b>' + job.T.toLocaleString() + '</b> back, at <b>' + (job.t + job.T).toLocaleString() + '</b>'
              : 'forward run <b>' + Math.round(100 * job.t / job.total) + '%</b>');
            timer = setTimeout(chunk, 0);
          } else {
            tile = buildTiling(job.bot, s.a, s.b, s.c);
            info = { T: job.T, coal: job.coal, exact: job.exact, total: job.total, fell: job.mode === 'heat' && s.sampler === 'cftp' };
            sig = sigOf(s);
            status('measuring');
            // The finish gets a slice of its own too, for the same reason the self-test does: it
            // measures the arctic boundary and paints every rhombus, and riding on the tail of a
            // 32 ms sampler chunk put both on top of that. Warm, on a software renderer at 630 by 727,
            // the measurement is about 2 ms and the paint 32 ms at 32, 32, 32 and 61 ms at 48, 48, 48,
            // of which the grain is 33 and 17; separating them takes the worst slice of a regenerate
            // from roughly 93 ms to roughly 61. `building` stays true until this runs, so repaint,
            // resize and resume still see a build in progress and keep off the canvas.
            timer = setTimeout(function () { building = false; done(); }, 0);
          }
        })();
      }

      function ensureMeas(s) {
        if (!tile) return null;
        if (!meas || meas.ring !== s.ring) meas = measureArctic(tile, s.a, s.b, s.c, s.ring, s.seed);
        return meas;
      }

      // Three per cent out on a limit shape can be flawless agreement or a plain disagreement, and
      // only the error bar tells them apart, so a deviation past three sigma is named out loud and,
      // where the cause is known, the cause is given. All three causes below are systematic: they
      // shift the number rather than scatter it, so none of them belongs inside the error bar, and
      // where the cause is not known this says nothing rather than inventing one.
      function whyOff(s) {
        // Measured at radius 1, twelve seeds each: 0.902 at 11, 11, 11, 0.912 at 24, 24, 24, 0.908 at
        // 48, 48, 48, 0.896 at 20, 20, 40 and 0.777 at 48, 48, 8. So the offset is a property of the
        // test rather than of this hexagon, but it is not one number everywhere, and a lopsided box
        // takes it further down. Saying "near 0.91 at every size" would have been false on the flat
        // preset, which is the one place a viewer is most likely to try radius 1.
        if (s.ring <= 1) return 'radius 1 is too weak a frozen test, and calls much of the disordered middle frozen: it reads near 0.91 on hexagons whose three sides are comparable, whatever their size, and lower still on a lopsided one';
        if (s.ring >= 4) return 'radius 4 is strict enough to call a rare flip deep in a frozen corner disordered, which pushes the boundary out';
        const mn = Math.min(s.a, s.b, s.c), mx = Math.max(s.a, s.b, s.c);
        // A lopsided box does not have one direction of error, and saying it did was wrong. Fifteen
        // seeds at each of six shapes, radius against 1 and free area against the ellipse:
        //   48,48, 8   0.955   0.649 against 0.708      one short side, reads low
        //    8,48,48   0.955   0.650 against 0.708      one short side, reads low
        //   48,48,16   0.989   0.815 against 0.831      one short side, reads low
        //   16,16,48   1.002   0.874 against 0.869      two short sides, reads high
        //   48,16,16   1.004   0.878 against 0.869      two short sides, reads high
        //    6, 6,48   1.012   0.851 against 0.826      two short sides, reads high
        // The split is whether one side is short against two long ones or two are short against one
        // long one, which is what the ratio test below asks. Why the second family goes the other way
        // is not something this has diagnosed, so it does not pretend to have.
        if (mn * 3 <= mx) {
          const q = [s.a, s.b, s.c].sort((x, y) => x - y);
          return q[1] / q[0] >= q[2] / q[1]
            ? 'the box is lopsided, one short side ' + q[0] + ' against two long ones, ' + q[1] + ' and ' + q[2] +
              ': the limit shape needs all three to grow together, and one short side leaves wide flat wedges well inside the arctic region that a local test counts as frozen, so the plate reads low. Measured over fifteen seeds, 0.955 for the radius and 0.649 against 0.708 for the free area at 48, 48, 8'
            : 'the box is lopsided, two short sides ' + q[0] + ' and ' + q[1] + ' against one long one, ' + q[2] +
              ': the limit shape needs all three to grow together. Measured over fifteen seeds this family reads a little high rather than low, 1.002 for the radius at 16, 16, 48 and 1.012 at 6, 6, 48, with the free area high with it. Why it leans the opposite way from a box with one short side is not diagnosed';
        }
        if (mx <= 16) return 'the ellipse is a limit shape and this hexagon is small: the boundary is a few tiles wide, so the ring test finds disagreeing neighborhoods some way into the corners and the free region reads large';
        return null;
      }

      function status(extra) {
        const s = host.getState();
        const nRh = s.a * s.b + s.b * s.c + s.c * s.a;
        // An exact combinatorial count: ab tops, bc of one side face and ca of the other, whatever the
        // pile does. There is no sampling error in it, so none is invented for it.
        let out = '<span>hexagon <b>' + s.a + '·' + s.b + '·' + s.c + '</b> · <b>' + nRh.toLocaleString() +
          '</b> rhombi';
        if (tile) {
          out += ' = ' + tile.cnt.map(v => v.toLocaleString()).join(' + ') +
            (tile.sound ? ', an exact count' : ', WHICH IS WRONG: ' + tile.want.map(v => v.toLocaleString()).join(' + ') +
              ' expected, ' + tile.bad + ' misplaced');
        }
        // MacMahon's count is an integer with hundreds of digits and this is its base ten logarithm
        // rounded, so it says the size and not the number: "about" rather than a false exactness.
        if (mac > 0) out += ' · MacMahon about <b>10^' + Math.round(mac).toLocaleString() + '</b> tilings';
        out += '</span>';
        // How this draw was made, and then the exactness claim tested rather than merely made.
        //
        // The count is named "sweep" on purpose. tools/check.js establishes that two loads of one
        // recipe are comparable either by seeing both go still or by reading the same step or sweep
        // count out of the status, and it can do neither here by accident: the status is longer than
        // the 200 characters the harness keeps, so the seed the shell appends is cut off and the
        // stillness route never fires. With no count either, two different plates would have been
        // reported as "not comparable" rather than as a failure, which is a determinism check that
        // silently does not run. This number is a deterministic function of the recipe, so the two
        // loads agree on it whenever the plate is right, and the check has something to hold.
        let sp2 = '';
        if (info) {
          sp2 += info.exact
            ? 'CFTP <b>exact</b>, from <b>' + info.T.toLocaleString() + '</b> back, met after sweep <b>' +
              info.coal.toLocaleString() + '</b>'
            : 'forward run to sweep <b>' + info.total.toLocaleString() + '</b>, <b>not exact</b>' +
              (info.fell ? ', CFTP over budget' : '');
        }
        if (self) {
          sp2 += (sp2 ? ' · ' : '') + 'self-test <b>' + self.draws.toLocaleString() + '</b> draws on 2·2·2: <b>' +
            self.k + ' of ' + self.want + '</b>' + (self.k === self.want ? '' : ' WHICH IS WRONG') +
            ', χ² <b>' + self.chi.toFixed(1) + '</b>/' + self.df + ' df, <b>' +
            sigTxt(isFinite(self.z) ? self.z : null) + '</b>';
        }
        if (sp2) out += '<span>' + sp2 + '</span>';
        if (meas) {
          // A mean over NB sectors, with its standard error and the number of samples behind it, the
          // sectors counted as the autocorrelation says they should be rather than as sixty
          // independent ones; then a ratio of two counts, bootstrapped rather than propagated.
          const zr = sigmas(meas.rMean, meas.rSe, 1);
          const zf = sigmas(meas.disFrac, meas.disSe, meas.predDisFrac);
          let sp = '<span>arctic radius <b>' + pm(meas.rMean, meas.rSe, 3) + '</b> over ' + meas.nSect +
            ' sectors, ~' + Math.round(meas.neff) + ' independent, against 1: <b>' + sigTxt(zr) + '</b>' +
            ' · free area <b>' + pm(meas.disFrac, meas.disSe, 3) + '</b> of n = ' + meas.nTot.toLocaleString() +
            ' triangles, against <b>' + f3(meas.predDisFrac) + '</b>: <b>' + sigTxt(zf) + '</b>';
          const worst = Math.max(zr === null ? 0 : Math.abs(zr), zf === null ? 0 : Math.abs(zf));
          // When the draw is not uniform, that is the diagnosis, and it has to be given as one. The
          // limit shape is a statement about the uniform measure, so a forward run that has not
          // mixed disagrees with it for a reason that is already known, and saying "cause not
          // diagnosed" next to "not exact" would be claiming ignorance of something on the same
          // line. It is not a corner case: the heat bath at the 200 sweeps the schema allows reads
          // 6.0 sigma off on a 48, 48, 48 hexagon, 2.5 sigma at 4,000 and 1.7 sigma at 20,000, so a
          // short forward run trips this every time.
          const notExact = !info || !info.exact;
          if (worst > 3) {
            const w = notExact
              ? 'the draw is not uniform, which is cause enough: the limit shape describes the uniform measure and a forward run that has not mixed is not from it'
              : whyOff(s);
            sp += w ? ' · ' + w : ' · a real disagreement, cause not diagnosed';
          }
          if (notExact) sp += ' · from a sample that is not exact';
          out += sp + '</span>';
        }
        if (extra) out += '<span>' + extra + '</span>';
        host.setStatus(out);
      }

      // Screen placement. The hexagon spans x from -b*S3 to a*S3 and y from -(a+b)/2 to c in the plane
      // the projection lands in, where y points up; the canvas y points down, hence the sign.
      function layout(s, Wpx, Hpx) {
        const x0 = -s.b * S3, x1 = s.a * S3, y0 = -(s.a + s.b) / 2, y1 = s.c;
        const dw = x1 - x0, dh = y1 - y0;
        const k = Math.min(Wpx * (1 - 2 * s.margin) / dw, Hpx * (1 - 2 * s.margin) / dh);
        return { k, ox: (Wpx - k * dw) / 2 - k * x0, oy: (Hpx - k * dh) / 2 + k * y1 };
      }

      // Three face colors, with the light coming from over the viewer's left shoulder: tops brightest,
      // the faces looking down and to the left next, the faces looking down and to the right darkest.
      // That ordering is what makes a heap of cubes read as solid rather than as a flat mosaic. Cube
      // faces sorts whichever three palette stops the offset lands on by lightness and then pushes
      // them further apart; Three colors leaves them exactly as the palette has them and lets the
      // offset decide which face gets which.
      function faceColors(s) {
        const P = rot(s.palette, s.shift).map(c => lift(c, s.bg));
        const n = P.length;
        const base = [P[0], P[1 % n], P[2 % n]];
        if (s.fill !== 'shade') return base;
        const ord = base.slice().sort((x, y) => U.luminance(y) - U.luminance(x));
        // lift again after the shading: pushing the top face toward white can walk it onto a pale
        // paper, and a top face the color of the paper is a hole rather than a lit surface
        return [lift(U.mixHex(ord[0], '#FFFFFF', 0.26), s.bg), lift(U.mixHex(ord[2], '#000000', 0.32), s.bg), ord[1]];
      }

      // Height coloring keeps the same light: the ramp says how far above the floor a face sits, and
      // the face shading is laid over it, so the plate is a relief rather than a flat gradient.
      const SHADE = [0.22, -0.3, 0];
      function shadeFace(hex, o) {
        return SHADE[o] > 0 ? U.mixHex(hex, '#FFFFFF', SHADE[o]) : (SHADE[o] < 0 ? U.mixHex(hex, '#000000', -SHADE[o]) : hex);
      }

      // Everything drawn is a list of filled quadrilaterals plus at most two open curves, so the canvas
      // and the SVG are built from one description and cannot drift apart.
      function sceneFor(s, Wpx, Hpx) {
        const L = layout(s, Wpx, Hpx), k = L.k, ox = L.ox, oy = L.oy;
        const F = faceColors(s);
        const m = ensureMeas(s);
        const ramp = s.fill === 'height' ? U.makeRamp(rot(s.palette, s.shift).map(c => lift(c, s.bg)), null) : null;
        const cz = 2 * s.c;
        const polys = [], curves = [];
        const q = new Int16Array(8), pt = new Float64Array(8);
        const strokeOn = s.strokeWidth > 0;
        const Pr = rot(s.palette, s.shift);
        const sc = Pr[s.strokeColor % Pr.length] || U.inkFor(s.bg);
        // With no grout and no stroke asked for, a hairline in the fill color narrows the seam that
        // antialiasing leaves between two abutting polygons. It does not close it. Two fills that
        // share an edge each cover part of the boundary pixel and composite over the paper in turn,
        // which leaves up to a quarter of the background showing along every edge, and the seam is
        // one pixel wide whatever the tile size, so a stroke that scales with the tile cannot track
        // it: at forty a side it is 0.35 px on screen and 0.6 px at print, enough to dim the seam and
        // not enough to remove it. A flat pixel of stroke would remove it, at the cost of growing
        // every rhombus by half a pixel into its neighbor and moving the color boundaries with it.
        // Measured on the circle preset, the visible result is a faint lattice over the frozen
        // corners; the preset note above says so rather than claiming three flat sheets.
        const sw = strokeOn ? Math.max(0.3, s.strokeWidth * k * 0.09) : (s.inset > 0.004 ? 0 : Math.max(0.35, k * 0.02));
        for (let n = 0; n < tile.M; n++) {
          const o = tile.ro[n], au = tile.ru[n], av = tile.rv[n];
          corners(o, au, av, q);
          let cxs = 0, cys = 0;
          for (let e = 0; e < 4; e++) {
            const u = q[e * 2], v = q[e * 2 + 1];
            pt[e * 2] = ox + k * ((u - v) * S3);
            pt[e * 2 + 1] = oy + k * ((u + v) / 2);
            cxs += pt[e * 2]; cys += pt[e * 2 + 1];
          }
          cxs /= 4; cys /= 4;
          if (s.inset > 0) {
            const g = 1 - s.inset;
            for (let e = 0; e < 4; e++) { pt[e * 2] = cxs + (pt[e * 2] - cxs) * g; pt[e * 2 + 1] = cys + (pt[e * 2 + 1] - cys) * g; }
          }
          let col;
          if (ramp) { const cc = ramp(tile.rz[n] / cz); col = shadeFace(U.rgbToHex(cc[0], cc[1], cc[2]), o); }
          else col = F[o];
          if (s.fill === 'frozen' && m) {
            // a rhombus is frozen when both of its triangles are; for orientations 1 and 2 the pair
            // straddles two lattice cells
            const kk = (au - tile.U0) * tile.VW + (av - tile.V0);
            const t1 = o === 1 ? m.fB[kk] : m.fA[kk];
            const t2 = o === 0 ? m.fB[kk] : (o === 1 ? m.fA[kk + 1] : m.fB[kk + tile.VW]);
            if (t1 && t2) col = U.mixHex(col, s.bg, 0.72);
          }
          polys.push({ p: pt.slice(), c: col, s: strokeOn ? sc : col, w: sw });
        }
        if (s.arctic !== 'off' && m) {
          const el = m.el, ink = U.inkFor(s.bg);
          const map = (wx, wy) => [ox + k * (el.cx + el.l11 * wx), oy - k * (el.cy + el.l21 * wx + el.l22 * wy)];
          const pred = [];
          for (let i = 0; i <= 192; i++) { const th = i / 192 * 2 * Math.PI; pred.push(map(Math.cos(th), Math.sin(th))); }
          curves.push({ pts: pred, c: ink, w: Math.max(0.6, s.curveW * k * 0.06), dash: 0 });
          if (s.arctic === 'both') {
            const mm = [];
            for (let i = 0; i <= NB; i++) {
              const bb = i % NB, th = (bb + 0.5) / NB * 2 * Math.PI;
              mm.push(map(m.rs[bb] * Math.cos(th), m.rs[bb] * Math.sin(th)));
            }
            curves.push({ pts: mm, c: U.mixHex(ink, s.bg, 0.12), w: Math.max(0.5, s.curveW * k * 0.045), dash: Math.max(2, k * 0.6) });
          }
        }
        return { polys, curves };
      }

      function paint(c2, Wpx, Hpx) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, Wpx, Hpx);
        if (!tile) return;
        const scene = sceneFor(s, Wpx, Hpx);
        c2.lineJoin = 'round'; c2.lineCap = 'round';
        for (const g of scene.polys) {
          const p = g.p;
          c2.beginPath();
          c2.moveTo(p[0], p[1]); c2.lineTo(p[2], p[3]); c2.lineTo(p[4], p[5]); c2.lineTo(p[6], p[7]);
          c2.closePath();
          c2.fillStyle = g.c; c2.fill();
          if (g.w > 0) { c2.strokeStyle = g.s; c2.lineWidth = g.w; c2.stroke(); }
        }
        for (const cu of scene.curves) {
          c2.beginPath();
          c2.moveTo(cu.pts[0][0], cu.pts[0][1]);
          for (let i = 1; i < cu.pts.length; i++) c2.lineTo(cu.pts[i][0], cu.pts[i][1]);
          c2.setLineDash(cu.dash ? [cu.dash, cu.dash] : []);
          c2.strokeStyle = cu.c; c2.lineWidth = cu.w; c2.stroke();
          c2.setLineDash([]);
        }
        if (s.grain > 0) {
          const rng = U.makeRng(s.seed + '/grain'), img = c2.getImageData(0, 0, Wpx, Hpx), px = img.data, amp = s.grain * 28;
          for (let i = 0; i < px.length; i += 4) { const v = (rng() - 0.5) * amp; px[i] += v; px[i + 1] += v; px[i + 2] += v; }
          c2.putImageData(img, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      return {
        aspect(s) {
          if (s.aspect !== 'fit') return ASPECTS[s.aspect] || 1;
          const a = U.clamp(Math.round(Number(s.a) || 32), 3, SIDE);
          const b = U.clamp(Math.round(Number(s.b) || 32), 3, SIDE);
          const c = U.clamp(Math.round(Number(s.c) || 32), 3, SIDE);
          return U.clamp(((a + b) / 2 + c) / ((a + b) * S3), 0.5, 2);
        },
        regenerate() {
          const s = host.getState();
          if (tile && sig === sigOf(s)) { ensureMeas(s); render(); status(); return; }
          tile = null; meas = null; info = null; render();
          build(s, () => { ensureMeas(host.getState()); render(); status(); });
        },
        repaint() { if (!building) { ensureMeas(host.getState()); render(); status(); } },
        resize() { if (!building) render(); },
        pause() {}, resume() { if (!building) render(); },
        async exportPNG(w, h) {
          if (!tile) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        // The picture is ab + bc + ca filled rhombi and at most two curves, so the print path emits
        // exactly those and stays sharp at any size. Rhombi that share a color share one path, which
        // keeps the sheet to a few dozen elements instead of one per tile. Grain is a screen finish
        // with no geometry in it and is the one thing the vector sheet leaves out.
        exportSVG(w, h) {
          if (!tile) throw new Error('nothing to export');
          const s = host.getState();
          const scene = sceneFor(s, w, h);
          const r = v => Math.round(v * 100) / 100;
          const byColor = new Map();
          for (const g of scene.polys) {
            const key = g.c + '|' + g.s + '|' + r(g.w);
            let arr = byColor.get(key);
            if (!arr) { arr = []; byColor.set(key, arr); }
            arr.push(g.p);
          }
          let body = '';
          byColor.forEach((arr, key) => {
            const parts = key.split('|');
            let d = '';
            for (const p of arr) {
              d += 'M' + r(p[0]) + ' ' + r(p[1]) + 'L' + r(p[2]) + ' ' + r(p[3]) +
                'L' + r(p[4]) + ' ' + r(p[5]) + 'L' + r(p[6]) + ' ' + r(p[7]) + 'Z';
            }
            body += '<path d="' + d + '" fill="' + U.svgEsc(parts[0]) + '"' +
              (Number(parts[2]) > 0 ? ' stroke="' + U.svgEsc(parts[1]) + '" stroke-width="' + parts[2] + '" stroke-linejoin="round"' : ' stroke="none"') +
              '/>\n';
          });
          for (const cu of scene.curves) {
            let d = 'M' + r(cu.pts[0][0]) + ' ' + r(cu.pts[0][1]);
            for (let i = 1; i < cu.pts.length; i++) d += 'L' + r(cu.pts[i][0]) + ' ' + r(cu.pts[i][1]);
            body += '<path d="' + d + '" fill="none" stroke="' + U.svgEsc(cu.c) + '" stroke-width="' + r(cu.w) +
              '" stroke-linecap="round"' + (cu.dash ? ' stroke-dasharray="' + r(cu.dash) + ' ' + r(cu.dash) + '"' : '') + '/>\n';
          }
          return U.svgBlob(w, h, s.bg, body);
        },
      };
    },
  });
})();
