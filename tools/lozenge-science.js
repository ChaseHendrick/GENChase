// node tools/lozenge-science.js [--write] [--skip-browser | --print-only]
//
// Exact benchmark and print evidence for the Lozenge Tilings tab (src/modules/lozenge.js).
//
// 1. Counting. Every lozenge tiling of the a, b, c hexagon is enumerated directly as a tiling of the
//    hexagon's unit triangles (tools/lib/lozenge-reference.js), every plane partition in the box is
//    enumerated separately, and both counts are held to MacMahon's product, computed exactly in
//    BigInt, for 2·2·2, 2·2·3, 2·3·4, 3·3·3 and 4·4·4. The module's buildTiling and corners (what the
//    plate draws) must carry every plane partition onto a distinct tiling in the direct enumeration.
// 2. Uniformity. The module's makeJob and runJob (coupling from the past), keyed exactly as build()
//    keys them, draw tilings of the four smallest boxes from seeded recipes. Every tiling must appear,
//    Pearson chi-square must have p >= 0.001, and every tiling and rhombus placement probability must
//    sit inside a simultaneous Hoeffding bound and a Bonferroni z bound at alpha = 0.001. On 4·4·4 the
//    distribution of the volume is tested against its exact distribution from the enumeration.
// 3. Failure controls. A biased heat-bath update (uniform u replaced by u^2, still monotone), reading
//    the state at the meeting time instead of at time 0, and a coalescence check that compares only
//    half of the sites must each fail the same uniformity test. The tab's own printed self-test is run
//    under each control too.
// 4. Limit shape. The ellipse the tab predicts is solved again here from its tangency to the six sides.
//    The tab's frozen test (from recipe v4) is global: a rhombus is frozen when a chain of edge-adjacent
//    rhombi of its own orientation joins it to the rim, the lozenge analogue of the Jockusch-Propp-Shor
//    polar regions. On every plate its flags must equal an independent union-find over rhombi, and the
//    number of frozen rhombi of each orientation must equal the extreme level sets of the height
//    function. The arctic radius and free area are run over independent seeds through the full
//    regenerate() path on seven regular hexagons (12 to 48) and a skewed family (3:5:6 at four sizes),
//    extrapolated in the size with the stated form q_inf + A n^-2/3 + B n^-1 (bootstrap over seeds), and
//    compared with the limit shape: radius 1 and free area pi/(2 sqrt 3) for a regular hexagon, the
//    ellipse area over the hexagon area from ellipseOf in general. The per-plate error bars the status
//    line prints must be calibrated against the scatter over seeds within a band fixed before the run
//    (0.75 to 1.33) at every hexagon. The local ring-3 test that recipes before v4 use is measured on
//    the same plates for comparison, and a biased sampler must move the boundary.
// 5. Print. Seven recipes are built in a temporary copy of dist/studio.html with an auditRead() hook:
//    every SVG rhombus and curve point must match geometry rebuilt from the cube stack within the
//    0.01 px rounding, every PNG byte must match an independent painting within one level, the shell's
//    own export must be the rasterized SVG of that geometry, and exporting must not change the state.
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const S = require('./lib/tiling-sandbox.js');
const L = require('./lib/lozenge-reference.js');

const root = S.root;
const SOURCE = S.read('src/modules/lozenge.js');
const WRITE = process.argv.includes('--write');
const SKIP_BROWSER = process.argv.includes('--skip-browser');
const PRINT_ONLY = process.argv.includes('--print-only');
const started = Date.now();
const log = (...a) => console.log(...a);
const U = S.util;

const HOOKS = ['  /* ---------- Lozenge Tilings ---------- */',
  '  Studio.auditHooks = { makeJob, runJob, buildTiling, corners, classify, frozenRim, measureArctic, ellipseOf, macmahonLog10, samplerSelfTest };\n  /* ---------- Lozenge Tilings ---------- */'];
const AUDIT_BODY = 'auditRead() { const st = host.getState(); if (!tile) return { building, tile: null }; const h = []; for (let n = 0; n < st.a * st.b; n++) h.push(tile.rz[n] / 2); ' +
  'return { building, sig, sound: tile.sound, M: tile.M, U0: tile.U0, V0: tile.V0, UW: tile.UW, VW: tile.VW, TA: Array.from(tile.TA), TB: Array.from(tile.TB), h, info, self, mac, ' +
  'meas: meas && { ring: meas.ring, rMean: meas.rMean, rSe: meas.rSe, tau: meas.tau, tauF: meas.tauF, neff: meas.neff, disFrac: meas.disFrac, disSe: meas.disSe, predDisFrac: meas.predDisFrac, nTot: meas.nTot, nDis: meas.nDis, rs: Array.from(meas.rs), fA: Array.from(meas.fA), fB: Array.from(meas.fB) } }; },\n';
const AUDIT = ['        aspect(s) {', '        ' + AUDIT_BODY + '        aspect(s) {'];
const CONTROLS = {
  biasedUpdate: { description: 'heat-bath uniform u replaced by u^2 in every site update (monotone, so CFTP still coalesces, on a non-uniform measure)',
    patches: [['h[site] = lo + Math.floor(xi(t, site, key) * (hi - lo + 1));', 'h[site] = lo + Math.floor(xi(t, site, key) ** 2 * (hi - lo + 1));']] },
  readAtMeeting: { description: 'the state is read at the meeting time instead of being carried on to time 0',
    patches: [['if (eq) { job.coal = job.t + job.T; if (job.t >= 0) job.done = true; }', 'if (eq) { job.coal = job.t + job.T; job.done = true; }']] },
  halfCoalescenceCheck: { description: 'the coalescence check compares only the first half of the sites, so it can stop early',
    patches: [['for (let k = 0; k < N; k++) if (job.bot[k] !== job.top[k])', 'for (let k = 0; k < (N >> 1); k++) if (job.bot[k] !== job.top[k])']] },
};
const loadModule = patches => S.load(SOURCE, { patches: [HOOKS, AUDIT, ...(patches || [])] });
// build() keys the sampler by makeRng(seed + '/lozenge'); the self-test by makeRng(seed + '/selftest')
const keyOf = seed => (U.makeRng(seed + '/lozenge')() * 4294967296) >>> 0;
function drawHeights(H, a, b, c, seed) { const job = H.makeJob(a, b, c, keyOf(seed), 'cftp', 0); H.runJob(job, 1e15); assert(job.exact && job.done); return job.bot; }

/* ---------------- 1: counting, the bijection and the ellipse ---------------- */
const BOXES = [[2, 2, 2], [2, 2, 3], [2, 3, 4], [3, 3, 3], [4, 4, 4]];
function counting(H) {
  const rows = [], exactSets = {};
  for (const [a, b, c] of BOXES) {
    const t0 = Date.now(), reg = L.region(a, b, c), T = L.enumerateTilings(reg), PP = L.enumeratePartitions(a, b, c), mm = L.macmahon(a, b, c);
    assert.equal(BigInt(T.count), mm, 'direct tiling count differs from MacMahon');
    assert.equal(BigInt(PP.length), mm, 'plane partition count differs from MacMahon');
    const log10 = H.macmahonLog10(a, b, c), exactLog10 = Math.log10(Number(mm));
    // the module draws each plane partition as rhombi; they must be a tiling in the direct set, all distinct
    const images = new Set(), ppTiling = [];
    const q = new Int16Array(8);
    for (const h of PP) {
      const t = H.buildTiling(Int16Array.from(h), a, b, c);
      assert(t.sound, 'buildTiling reports an unsound tiling');
      const F = [];
      for (let n = 0; n < t.M; n++) { H.corners(t.ro[n], t.ru[n], t.rv[n], q); F.push({ o: t.ro[n], pts: [0, 1, 2, 3].map(e => [(q[2 * e] - q[2 * e + 1]) * L.S3, -(q[2 * e] + q[2 * e + 1]) / 2]) }); }
      const drawn = L.tilingOfFaces(reg, F), mine = L.tilingOfFaces(reg, L.faces(h, a, b, c));
      assert(T.keys.has(drawn.key), 'the drawn rhombi are not a tiling of the hexagon');
      assert.equal(drawn.key, mine.key, 'the drawn tiling differs from the cube stack');
      images.add(drawn.key); if (a * b * c <= 36) ppTiling.push(drawn.partner);
    }
    assert.equal(images.size, PP.length, 'two plane partitions draw the same tiling');
    exactSets[[a, b, c].join('x')] = { reg, T, PP, ppTiling };
    rows.push({ box: [a, b, c], triangles: reg.tris.length, directTilings: T.count, planePartitions: PP.length, macmahon: String(mm), moduleLog10: log10, exactLog10, log10Error: Math.abs(log10 - exactLog10),
      drawnTilingsDistinctAndInEnumeration: true, ms: Date.now() - t0 });
    log('count ' + [a, b, c].join('x') + ': ' + T.count + ' tilings = ' + PP.length + ' plane partitions = MacMahon ' + mm + ' (' + (Date.now() - t0) + ' ms)');
  }
  return { rows, exactSets };
}

function ellipses(H) {
  const rows = [];
  for (const [a, b, c] of [[11, 11, 11], [24, 24, 24], [32, 32, 32], [48, 48, 48], [24, 40, 46], [20, 20, 40], [48, 48, 8], [16, 16, 48], [3, 5, 7]]) {
    const tab = H.ellipseOf(a, b, c), ref = L.inscribedEllipse(a, b, c);
    const scale = Math.max(Math.abs(ref.A11), Math.abs(ref.A22));
    const err = Math.max(Math.abs(tab.A11 - ref.A11), Math.abs(tab.A12 - ref.A12), Math.abs(tab.A22 - ref.A22)) / scale;
    const centerErr = Math.max(Math.abs(tab.cx - ref.cx), Math.abs(tab.cy - ref.cy));
    const pred = Math.PI * Math.sqrt(tab.det) / ((a * b + b * c + c * a) * L.S3);
    rows.push({ box: [a, b, c], relativeMatrixError: err, centerError: centerErr, tangencyResidual: ref.tangencyResidual, predictedFreeArea: pred, independentFreeArea: ref.areaFraction, freeAreaError: Math.abs(pred - ref.areaFraction) });
  }
  const ok = rows.every(r => r.relativeMatrixError < 1e-12 && r.centerError < 1e-12 && r.tangencyResidual < 1e-9 && r.freeAreaError < 1e-12);
  return { rows, ok };
}

/* ---------------- 2 and 3: uniformity and the failure controls ---------------- */
const DRAWS = { '2x2x2': 8000, '2x2x3': 10000, '2x3x4': 19600, '3x3x3': 39200 };
const ALPHA = 0.001;
function uniformity(H, sets, boxes, label) {
  const rows = [];
  for (const name of boxes) {
    const t0 = Date.now(), [a, b, c] = name.split('x').map(Number), E = sets[name], draws = DRAWS[name];
    const index = new Map(E.PP.map((h, i) => [h.join(','), i])), counts = new Array(E.PP.length).fill(0);
    const placeKeys = [...E.T.placements.keys()], placeIndex = new Map(placeKeys.map((k, i) => [k, i])), placeCounts = new Array(placeKeys.length).fill(0);
    const ppPlacements = E.ppTiling.map(partner => { const out = []; for (let i = 0; i < partner.length; i++) if (partner[i] > i) out.push(placeIndex.get(i + ':' + partner[i])); return out; });
    for (let i = 0; i < draws; i++) {
      const h = drawHeights(H, a, b, c, 'lozenge-uniform-' + name + '-' + i), k = index.get(Array.from(h).join(','));
      assert(k !== undefined, 'the sampler returned a state that is not a plane partition in the box');
      counts[k]++; for (const p of ppPlacements[k]) placeCounts[p]++;
    }
    const probs = new Array(E.PP.length).fill(1 / E.PP.length);
    const marginals = placeKeys.map((k, i) => ({ rhombus: k, exact: E.T.placements.get(k) / E.T.count, count: placeCounts[i] }));
    const test = S.frequencyTest(counts, probs, draws, marginals, ALPHA);
    rows.push(Object.assign({ box: [a, b, c], tilings: E.PP.length, seeds: "'lozenge-uniform-" + name + "-<i>', i = 0.." + (draws - 1), rhombusPositions: placeKeys.length }, test,
      E.PP.length <= 50 ? { tilingCounts: counts } : { minCount: Math.min(...counts), maxCount: Math.max(...counts) }, { ms: Date.now() - t0 }));
    log(label + ' ' + name + ' draws ' + draws + ' chi2 ' + test.chiSquare.toFixed(1) + '/' + test.df + ' p ' + test.pValue.toExponential(3) + ' missing ' + test.missing + ' maxZ ' + test.maxMarginalZ.toFixed(2) + ' passes ' + test.passes);
  }
  return rows;
}

// 4·4·4 has 232,848 tilings, too many to fill with draws; its volume distribution is tested instead.
function volumeTest(H, sets, draws) {
  const E = sets['4x4x4'], exact = new Array(65).fill(0);
  for (const h of E.PP) exact[h.reduce((s, z) => s + z, 0)]++;
  const counts = new Array(65).fill(0), vols = [];
  for (let i = 0; i < draws; i++) { const h = drawHeights(H, 4, 4, 4, 'lozenge-volume-4x4x4-' + i); let v = 0; for (const z of h) v += z; counts[v]++; vols.push(v); }
  // merge the thin tails so that every class expects at least 20 draws
  const classes = [];
  let cur = { exact: 0, count: 0, from: 0 };
  for (let v = 0; v <= 64; v++) { cur.exact += exact[v]; cur.count += counts[v]; if (cur.exact / E.PP.length * draws >= 20 && v < 64) { classes.push(Object.assign(cur, { to: v })); cur = { exact: 0, count: 0, from: v + 1 }; } }
  Object.assign(classes[classes.length - 1], { exact: classes[classes.length - 1].exact + cur.exact, count: classes[classes.length - 1].count + cur.count, to: 64 });
  let chi = 0; for (const k of classes) { const e = k.exact / E.PP.length * draws; chi += (k.count - e) ** 2 / e; }
  const df = classes.length - 1, p = S.chiSquareP(chi, df), m = S.stats.sampleMean(vols);
  return { box: [4, 4, 4], draws, seeds: "'lozenge-volume-4x4x4-<i>'", classes: classes.length, chiSquare: chi, df, pValue: p, meanVolume: m.mean, meanVolumeSe: m.se, exactMeanVolume: 32, sigma: (m.mean - 32) / m.se, passes: p >= ALPHA && Math.abs((m.mean - 32) / m.se) < 3.29 };
}

/* ---------------- 4: limit shape over seeds ---------------- */
// Regular hexagons for the extrapolation to the regular limit, and a skewed family scaled from 3:5:6 for
// the general one. Seed counts give a standard error of the mean of a few parts in ten thousand at every
// size and keep the largest hexagons (about 3 s a plate at 48) inside a practical run.
const REGULAR = [[12, 400], [16, 400], [20, 300], [24, 300], [32, 200], [40, 120], [48, 100]];
const SKEW = [[4, 300], [5, 300], [6, 200], [8, 100]];
const SHAPES = REGULAR.map(([n, seeds]) => ({ box: [n, n, n], n, family: 'regular', seeds }))
  .concat(SKEW.map(([k, seeds]) => ({ box: [3 * k, 5 * k, 6 * k], n: k, family: 'skew 3:5:6', seeds })));
// The calibration band for the per-plate bars, the one tools/aztec-science.js uses, fixed before this run.
const BAND = [0.75, 1.33];

function calib(vals, ses) {
  const rms = x => Math.sqrt(x.reduce((t, v) => t + v * v, 0) / x.length);
  const sdAcross = S.stats.sd(vals), rmsSe = rms(ses), ratio = sdAcross / rmsSe, n = vals.length;
  // sd^2 (n - 1) / sigma^2 is chi-square on n - 1 degrees of freedom; 95% interval on the ratio
  const lo = ratio * Math.sqrt((n - 1) / chiQuantile(0.975, n - 1)), hi = ratio * Math.sqrt((n - 1) / chiQuantile(0.025, n - 1));
  const mean = S.stats.mean(vals), z = vals.map((v, i) => (v - mean) / ses[i]);
  return { sdAcrossSeeds: sdAcross, rmsPerPlateSe: rmsSe, ratio, ratio95: [lo, hi], band: BAND, inBand: ratio > BAND[0] && ratio < BAND[1], sdOfPerPlateZ: S.stats.sd(z),
    verdict: hi < 1 ? 'per-plate bar wider than the scatter (conservative)' : lo > 1 ? 'per-plate bar narrower than the scatter' : 'consistent with calibrated' };
}

function limitShape(Lm) {
  const out = [], perShape = [], zSelf = [], chiSelf = [];
  let chunkCheck = null;
  for (const shape of SHAPES) {
    const [a, b, c] = shape.box, seeds = shape.seeds;
    const t0 = Date.now(), state = S.stateFor(Lm.mod, { a, b, c, sampler: 'cftp', grain: 0 }, 'x'), inst = Lm.create(state), plates = [];
    assert.equal(state.ring, 0, 'the default frozen test is not the rim-connected one');
    const reg = L.region(a, b, c);
    let flagMismatch = 0, levelMismatch = 0, printedMismatch = 0, localChecked = 0;
    for (let i = 0; i < seeds; i++) {
      state.seed = 'lozenge-arctic-' + [a, b, c].join('x') + '-' + i;
      inst.run();
      const r = inst.inst.auditRead(), m = r.meas;
      assert(r.sound && r.info.exact && m && m.ring === 0, 'plate did not finish exact and sound');
      // the heights the plate shows are the sampler's draw for this seed
      if (i < 3) assert.deepEqual(r.h, Array.from(drawHeights(Lm.hooks, a, b, c, state.seed)));
      // the frozen flags against the independent union-find, triangle for triangle, and the free area
      const F = L.faces(r.h, a, b, c), tl = L.tilingOfFaces(reg, F), fo = F.map(f => f.o), rim = L.rimFrozen(reg, tl.faceTris, fo);
      let mismatch = 0, dis = 0;
      reg.tris.forEach((T, k) => { const idx = (T.u - r.U0) * r.VW + (T.v - r.V0); if ((T.t === 0 ? m.fA : m.fB)[idx] !== rim.tris[k]) mismatch++; if (!rim.tris[k]) dis++; });
      if (mismatch || dis / reg.tris.length !== m.disFrac) flagMismatch++;
      // and against the extreme level sets of the height function, a route with no tiling in it
      const byO = [0, 0, 0]; F.forEach((f, k) => { if (rim.faces[k]) byO[f.o]++; });
      if (byO.join() !== L.extremeLevelCounts(r.h, a, b, c).join()) levelMismatch++;
      // the status line prints both numbers and their bars through compare(): "<b>value ± error</b>"
      const pr = /arctic radius <b>([\d.]+) ± ([\d.]+)<\/b>/.exec(inst.host.status), pf = /free area <b>([\d.]+) ± ([\d.]+)<\/b>/.exec(inst.host.status);
      const er = S.stats.formatPair(m.rMean, m.rSe), ef = S.stats.formatPair(m.disFrac, m.disSe);
      if (!pr || !pf || pr[1] !== er[0] || pr[2] !== er[1] || pf[1] !== ef[0] || pf[2] !== ef[1]) printedMismatch++;
      // the local ring-3 test (recipes before v4) on the same tiling, through the module's own code
      const Tt = { TA: r.TA, TB: r.TB, U0: r.U0, V0: r.V0, UW: r.UW, VW: r.VW }, loc = Lm.hooks.measureArctic(Tt, a, b, c, 3);
      if (i < 2) {   // whose flags still equal the independent breadth-first ball test
        const orient = new Int8Array(reg.tris.length); tl.faceTris.forEach((pair, f) => { for (const t of pair) orient[t] = fo[f]; });
        const fz = L.frozenBall(reg, orient, 3);
        let lm = 0; reg.tris.forEach((T, k) => { const idx = (T.u - r.U0) * r.VW + (T.v - r.V0); if ((T.t === 0 ? loc.fA : loc.fB)[idx] !== fz[k]) lm++; });
        assert.equal(lm, 0, 'the local test differs from the independent ball test');
        localChecked++;
      }
      // depth of the full corner and of the empty corner along the diagonal of the column grid (regular only):
      // the frozen boundary crossed at a point, whose spread over seeds should grow as n^(1/3)
      let depth = null;
      if (a === b && b === c) {
        let dc = 0; while (dc < a && r.h[dc * a + dc] === c) dc++;
        let d0 = 0; while (d0 < a && r.h[(a - 1 - d0) * a + (a - 1 - d0)] === 0) d0++;
        depth = [dc, d0];
      }
      if (!chunkCheck && a === 24 && b === 24) {
        const again = Lm.create(Object.assign({}, state)); again.run(40);
        const r2 = again.inst.auditRead();
        assert.deepEqual(r2.h, r.h); assert.deepEqual(r2.info, r.info); assert.equal(r2.meas.rMean, m.rMean); assert.equal(r2.meas.disSe, m.disSe);
        chunkCheck = { seed: state.seed, T: r.info.T, meetingSweep: r.info.coal, identical: true, note: 'every timer slice limited to one sweep' };
      }
      zSelf.push(r.self.z); chiSelf.push(r.self.chi);
      assert.equal(r.self.k, 20);
      plates.push({ rMean: m.rMean, rSe: m.rSe, tau: m.tau, tauF: m.tauF, disFrac: m.disFrac, disSe: m.disSe, pred: m.predDisFrac, T: r.info.T, coal: r.info.coal, selfZ: r.self.z,
        localR: loc.rMean, localF: loc.disFrac, depth, frozenByOrientation: byO });
    }
    const rm = S.stats.ensemble(plates.map(p => p.rMean)), fm = S.stats.ensemble(plates.map(p => p.disFrac)), pred = plates[0].pred;
    const lr = S.stats.ensemble(plates.map(p => p.localR)), lf = S.stats.ensemble(plates.map(p => p.localF));
    const row = { box: [a, b, c], family: shape.family, size: shape.n, seeds, seedPattern: "'lozenge-arctic-" + [a, b, c].join('x') + "-<i>'", ring: 0,
      frozenFlagMismatches: flagMismatch, levelSetMismatches: levelMismatch, printedMismatches: printedMismatch, localTestCheckedPlates: localChecked,
      radius: { mean: rm.mean, se: rm.se, sd: rm.sd, expected: 1, sigma: (rm.mean - 1) / rm.se, calibration: calib(plates.map(p => p.rMean), plates.map(p => p.rSe)) },
      freeArea: { mean: fm.mean, se: fm.se, sd: fm.sd, expected: pred, sigma: (fm.mean - pred) / fm.se, calibration: calib(plates.map(p => p.disFrac), plates.map(p => p.disSe)) },
      localRing3: { radius: lr.mean, radiusSe: lr.se, freeArea: lf.mean, freeAreaSe: lf.se, note: 'the local test recipes before v4 use, on the same tilings' },
      perPlateSigmaRadius: S.stats.ensemble(plates.map(p => (p.rMean - 1) / p.rSe)), perPlateSigmaFreeArea: S.stats.ensemble(plates.map(p => (p.disFrac - pred) / p.disSe)),
      tauRadius: S.stats.ensemble(plates.map(p => p.tau)), tauFreeArea: S.stats.ensemble(plates.map(p => p.tauF)),
      tauFloorBinds: plates.filter(p => p.tauF <= 2).length, tauCeilingBinds: plates.filter(p => p.tauF >= 15).length,
      cftpStartBack: S.stats.ensemble(plates.map(p => p.T)), meetingSweep: S.stats.ensemble(plates.map(p => p.coal)), allExact: true, ms: Date.now() - t0 };
    out.push(row); perShape.push({ shape, plates });
    log('limit ' + [a, b, c].join('x') + ' seeds ' + seeds + ': radius ' + rm.mean.toFixed(4) + ' +/- ' + rm.se.toFixed(4) + ' (' + row.radius.sigma.toFixed(1) + ' sigma), calib ' + row.radius.calibration.ratio.toFixed(3) +
      '; free ' + fm.mean.toFixed(4) + ' +/- ' + fm.se.toFixed(4) + ' vs ' + pred.toFixed(4) + ' (' + row.freeArea.sigma.toFixed(1) + ' sigma), calib ' + row.freeArea.calibration.ratio.toFixed(3) +
      '; ring 3 ' + lr.mean.toFixed(4) + ' ' + lf.mean.toFixed(4) + '; mismatches ' + [flagMismatch, levelMismatch, printedMismatch].join('/') + ' (' + (Date.now() - t0) + ' ms)');
  }
  const z = S.stats.ensemble(zSelf), totalChi = chiSelf.reduce((t, v) => t + v, 0), df = 19 * chiSelf.length;
  const selfTest = { plates: zSelf.length, drawsPerPlate: 4000, meanZ: z.mean, sdZ: z.sd, fractionAbove2: zSelf.filter(v => v > 2).length / zSelf.length, fractionAbove3: zSelf.filter(v => v > 3).length / zSelf.length,
    pooledChiSquare: totalChi, pooledDf: df, pooledPValue: S.chiSquareP(totalChi, df), note: 'Each plate draws its own 4,000 self-test tilings with keys offset from its own seed; the pooled chi-square treats the plates as independent.' };
  const rng = U.makeRng('lozenge-science-bootstrap'), B = 1000;
  const fam = name => perShape.filter(x => x.shape.family === name);
  const extrapolation = {
    regular: {
      freeArea: extrapolate(fam('regular'), 'disFrac', Math.PI / (2 * Math.sqrt(3)), rng, B, 24),
      radius: extrapolate(fam('regular'), 'rMean', 1, rng, B, 24),
      localRing3FreeArea: extrapolate(fam('regular'), 'localF', Math.PI / (2 * Math.sqrt(3)), rng, B, 24),
      localRing3Radius: extrapolate(fam('regular'), 'localR', 1, rng, B, 24),
    },
    skew: {
      freeArea: extrapolate(fam('skew 3:5:6'), 'disFrac', fam('skew 3:5:6')[0].plates[0].pred, rng, B, 5),
      radius: extrapolate(fam('skew 3:5:6'), 'rMean', 1, rng, B, 5),
    },
  };
  return { shapes: out, selfTest, chunkCheck, extrapolation, fluctuation: fluctuation(fam('regular'), rng, B) };
}

// Weighted least squares y = X b with weights 1/se^2; returns b, chi-square and degrees of freedom.
function wls(X, y, se) {
  const p = X[0].length, A = Array.from({ length: p }, () => new Array(p).fill(0)), v = new Array(p).fill(0);
  for (let i = 0; i < y.length; i++) { const w = 1 / (se[i] * se[i]); for (let a = 0; a < p; a++) { v[a] += w * X[i][a] * y[i]; for (let b = 0; b < p; b++) A[a][b] += w * X[i][a] * X[i][b]; } }
  const M = A.map((row, i) => row.concat([v[i]]));
  for (let c = 0; c < p; c++) {
    let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < p; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= p; k++) M[r][k] -= f * M[c][k]; }
  }
  const b = M.map((row, i) => row[p] / row[i]);
  let chi = 0; for (let i = 0; i < y.length; i++) { const f = X[i].reduce((t, x, a) => t + x * b[a], 0); chi += ((y[i] - f) / se[i]) ** 2; }
  return { b, chi, dof: y.length - p };
}

// Extrapolate a per-seed quantity in the size n of the hexagon (the side of a regular one, the scale factor
// of a scaled family). Model q(n) = q_inf + A n^-2/3 + B n^-1, the form tools/aztec-science.js uses: if the
// frozen boundary sits a distance of order n^(1/3) from the ellipse (the Airy scale of the arctic boundary,
// assumed here by analogy with the Aztec diamond, Johansson 2005, and measured below through the depth of
// the frozen corners), an area or radius over n moves by order n^-2/3, and B n^-1 absorbs the next order.
// Also the two-parameter form q_inf + A n^-2/3 over the larger sizes, to show how much the answer leans on
// the third term. Error bars: a bootstrap over seeds at every size, refitting each replicate.
function extrapolate(group, key, exact, bootRng, B, minTwo) {
  const ns = group.map(g => g.shape.n), vals = group.map(g => g.plates.map(p => p[key]));
  const summary = group.map((g, i) => { const e = S.stats.ensemble(vals[i]); return { size: ns[i], box: g.shape.box, seeds: e.n, mean: e.mean, sd: e.sd, se: e.se, deviation: e.mean - exact, deviationTimesN23: (e.mean - exact) * Math.pow(ns[i], 2 / 3), sigmaFromExact: (e.mean - exact) / e.se }; });
  const se = summary.map(r => r.se), out = { summary, exact };
  const fits = {
    three: { label: 'q_inf + A n^-2/3 + B n^-1, all sizes', rows: ns.map((n, i) => i), X: n => [1, Math.pow(n, -2 / 3), 1 / n] },
    two: { label: 'q_inf + A n^-2/3, sizes >= ' + minTwo, rows: ns.map((n, i) => i).filter(i => ns[i] >= minTwo), X: n => [1, Math.pow(n, -2 / 3)] },
  };
  for (const [name, f] of Object.entries(fits)) {
    const X = f.rows.map(i => f.X(ns[i])), fit = wls(X, f.rows.map(i => summary[i].mean), f.rows.map(i => se[i])), draws = [];
    for (let b = 0; b < B; b++) {
      const y = f.rows.map(i => { const v = vals[i], m = v.length; let t = 0; for (let k = 0; k < m; k++) t += v[Math.floor(bootRng() * m)]; return t / m; });
      draws.push(wls(X, y, f.rows.map(i => se[i])).b[0]);
    }
    const sd = S.stats.sd(draws);
    out[name] = { model: f.label, sizes: f.rows.map(i => ns[i]), limit: fit.b[0], limitSe: sd, coefficients: fit.b, chiSquare: fit.chi, dof: fit.dof,
      fitPValue: fit.dof > 0 ? S.chiSquareP(fit.chi, fit.dof) : null, sigmaFromExact: (fit.b[0] - exact) / sd, bootstrapReplicates: B };
  }
  return out;
}

// Spread over seeds of the depth of the full and of the empty corner along the diagonal of the column grid,
// pooled over the two, against the side n; the slope of log sd on log n is the fluctuation exponent (1/3 on
// the Airy scale). Bootstrap over seeds. Reported, not a pass criterion: the sizes span a factor of four only.
function fluctuation(group, bootRng, B) {
  const ns = group.map(g => g.shape.n);
  const pooled = plates => Math.sqrt((S.stats.variance(plates.map(p => p.depth[0])) + S.stats.variance(plates.map(p => p.depth[1]))) / 2);
  const sds = group.map(g => pooled(g.plates));
  const slope = ys => S.stats.ols(ns.map(Math.log), ys.map(Math.log)).slope;
  const est = slope(sds), draws = [];
  for (let b = 0; b < B; b++) draws.push(slope(group.map(g => { const v = g.plates, m = v.length, pick = []; for (let k = 0; k < m; k++) pick.push(v[Math.floor(bootRng() * m)]); return pooled(pick); })));
  const se = S.stats.sd(draws);
  return { sizes: ns, pooledDepthSd: sds, meanDepth: group.map(g => S.stats.mean(g.plates.map(p => (p.depth[0] + p.depth[1]) / 2))), exponent: est, exponentSe: se, reference: 1 / 3, sigmaFromReference: (est - 1 / 3) / se, bootstrapReplicates: B };
}

// Two shapes the tab's hints quote, measured the same way but outside the calibrated domain and not held to
// any criterion: the smallest regular preset and the flattened box, where one short side keeps the hexagon small.
function reportedShapes(Lm, seeds) {
  const out = [];
  for (const [a, b, c] of [[11, 11, 11], [48, 48, 8]]) {
    const state = S.stateFor(Lm.mod, { a, b, c, sampler: 'cftp', grain: 0 }, 'x'), inst = Lm.create(state), rs = [], fs = [];
    let pred = null;
    for (let i = 0; i < seeds; i++) {
      state.seed = 'lozenge-hint-' + [a, b, c].join('x') + '-' + i; inst.run();
      const r = inst.inst.auditRead();
      assert(r.info.exact && r.meas.ring === 0);
      rs.push(r.meas.rMean); fs.push(r.meas.disFrac); pred = r.meas.predDisFrac;
    }
    const er = S.stats.ensemble(rs), ef = S.stats.ensemble(fs);
    out.push({ box: [a, b, c], seeds, seedPattern: "'lozenge-hint-" + [a, b, c].join('x') + "-<i>'", radius: er.mean, radiusSe: er.se, freeArea: ef.mean, freeAreaSe: ef.se, predictedFreeArea: pred });
    log('reported ' + [a, b, c].join('x') + ': radius ' + er.mean.toFixed(4) + ' +/- ' + er.se.toFixed(4) + ', free ' + ef.mean.toFixed(4) + ' +/- ' + ef.se.toFixed(4) + ' vs ' + pred.toFixed(4));
  }
  return out;
}

// A biased sampler must move the boundary. Under the uniform measure the map h(i, j) -> c - h(a-1-i, b-1-j)
// (the complement of the pile in the box) is a symmetry, so the full corner {h = c} and the empty corner
// {h = 0} have the same expected size; the u^2 control biases every column low and must separate them.
function biasedBoundary(n, seeds) {
  const out = {};
  for (const [name, patches] of [['uniform', []], ['biasedUpdate', CONTROLS.biasedUpdate.patches]]) {
    const H = loadModule(patches).hooks, diffs = [];
    for (let i = 0; i < seeds; i++) {
      const h = drawHeights(H, n, n, n, 'lozenge-bias-' + n + '-' + i);
      let full = 0, empty = 0; for (const z of h) { if (z === n) full++; if (z === 0) empty++; }
      diffs.push((full - empty) / (n * n));
    }
    const e = S.stats.ensemble(diffs);
    out[name] = { box: [n, n, n], seeds, fullMinusEmptyShare: e, sigma: e.mean / e.se };
  }
  return out;
}

// chi-square quantile by bisection on the upper tail
function chiQuantile(p, df) { let lo = 0, hi = df + 20 * Math.sqrt(2 * df) + 50; for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (1 - S.chiSquareP(mid, df) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; }

/* ---------------- 5: print ---------------- */
const FIXTURES = [
  { a: 11, b: 11, c: 11, aspect: 'fit', fill: 'shade', shift: 0, inset: 0.05, strokeWidth: 1.2, strokeColor: 3, arctic: 'off', margin: 0.07, palette: 'tram' },
  { a: 24, b: 40, c: 46, aspect: 'fit', fill: 'shade', shift: 1, inset: 0.03, strokeWidth: 0, arctic: 'both', curveW: 1.8, margin: 0.06, palette: 'verdigris' },
  { a: 48, b: 48, c: 8, aspect: 'fit', fill: 'frozen', shift: 0, inset: 0.02, strokeWidth: 0, arctic: 'pred', curveW: 1.6, margin: 0.05, palette: 'ember' },
  { a: 32, b: 32, c: 32, aspect: 'fit', fill: 'shade', shift: 0, inset: 0.04, strokeWidth: 0, arctic: 'off', margin: 0.06, palette: 'kiln' },
  { a: 20, b: 20, c: 40, aspect: 'fit', fill: 'flat', shift: 0, inset: 0.06, strokeWidth: 0.6, strokeColor: 3, arctic: 'off', margin: 0.06, palette: 'risograph' },
  // an old link: recipe v3 names no frozen test, so legacy hands it the local radius-3 test it was made with
  { a: 36, b: 36, c: 36, aspect: '1:1', fill: 'frozen', shift: 2, inset: 0.02, strokeWidth: 0, arctic: 'both', curveW: 2, margin: 0.06, palette: 'graphite', v: 3 },
  { a: 16, b: 16, c: 16, aspect: 'fit', fill: 'height', shift: 0, inset: 0, strokeWidth: 0, arctic: 'off', margin: 0.05, palette: 'glacier' },
];
const r2 = v => Math.round(v * 100) / 100;
const rot = (P, k) => { const n = P.length, i = ((k % n) + n) % n; return P.slice(i).concat(P.slice(0, i)); };
function lift(hex, bg) { const lb = U.luminance(bg), ink = U.inkFor(bg); let c = hex; for (let k = 0; k < 8 && Math.abs(U.luminance(c) - lb) < 20; k++) c = U.mixHex(c, ink, 0.14); return c; }

// The plate rebuilt from the heights: faces of the cube stack, the documented layout (the hexagon's
// extent scaled into the sheet less its margins and centered), the documented color rules, and the
// independent ellipse and frozen test.
function sceneReference(s, h, frozenTri, reg, measRs, W, H) {
  const { a, b, c } = s, S3 = L.S3, x0 = -b * S3, x1 = a * S3, y0 = -(a + b) / 2, y1 = c, dw = x1 - x0, dh = y1 - y0;
  const k = Math.min(W * (1 - 2 * s.margin) / dw, H * (1 - 2 * s.margin) / dh), ox = (W - k * dw) / 2 - k * x0, oy = (H - k * dh) / 2 + k * y1;
  const P = rot(s.palette, s.shift).map(x => lift(x, s.bg)), base = [P[0], P[1 % P.length], P[2 % P.length]];
  let F = base;
  if (s.fill === 'shade') { const ord = base.slice().sort((x, y) => U.luminance(y) - U.luminance(x)); F = [lift(U.mixHex(ord[0], '#FFFFFF', 0.26), s.bg), lift(U.mixHex(ord[2], '#000000', 0.32), s.bg), ord[1]]; }
  const ramp = s.fill === 'height' ? U.makeRamp(P, null) : null, SHADE = [0.22, -0.3, 0];
  const shade = (hex, o) => SHADE[o] > 0 ? U.mixHex(hex, '#FFFFFF', SHADE[o]) : SHADE[o] < 0 ? U.mixHex(hex, '#000000', -SHADE[o]) : hex;
  const strokeOn = s.strokeWidth > 0, Pr = rot(s.palette, s.shift), sc = Pr[s.strokeColor % Pr.length] || U.inkFor(s.bg);
  const sw = strokeOn ? Math.max(0.3, s.strokeWidth * k * 0.09) : (s.inset > 0.004 ? 0 : Math.max(0.35, k * 0.02));
  const faces = L.faces(h, a, b, c), tl = L.tilingOfFaces(reg, faces);
  const polys = faces.map((f, i) => {
    let pts = f.pts.map(([X, Y]) => [ox + k * X, oy - k * Y]);
    const cx = pts.reduce((t, p) => t + p[0] / 4, 0), cy = pts.reduce((t, p) => t + p[1] / 4, 0);
    if (s.inset > 0) pts = pts.map(([x, y]) => [cx + (x - cx) * (1 - s.inset), cy + (y - cy) * (1 - s.inset)]);
    let col = ramp ? shade(U.rgbToHex(...ramp(f.level / (2 * c))), f.o) : F[f.o];
    if (s.fill === 'frozen' && tl.faceTris[i].every(t => frozenTri[t])) col = U.mixHex(col, s.bg, 0.72);
    return { pts, c: col, s: strokeOn ? sc : col, w: sw };
  });
  const curves = [];
  if (s.arctic !== 'off') {
    const el = L.inscribedEllipse(a, b, c), ink = U.inkFor(s.bg);
    const map = (wx, wy) => [ox + k * (el.cx + el.l11 * wx), oy - k * (el.cy + el.l21 * wx + el.l22 * wy)];
    const pred = []; for (let i = 0; i <= 192; i++) { const th = i / 192 * 2 * Math.PI; pred.push(map(Math.cos(th), Math.sin(th))); }
    curves.push({ pts: pred, c: ink, w: Math.max(0.6, s.curveW * k * 0.06), dash: 0 });
    if (s.arctic === 'both') {
      const NB = measRs.length, mm = [];
      for (let i = 0; i <= NB; i++) { const bb = i % NB, th = (bb + 0.5) / NB * 2 * Math.PI; mm.push(map(measRs[bb] * Math.cos(th), measRs[bb] * Math.sin(th))); }
      curves.push({ pts: mm, c: U.mixHex(ink, s.bg, 0.12), w: Math.max(0.5, s.curveW * k * 0.045), dash: Math.max(2, k * 0.6) });
    }
  }
  return { polys, curves, k };
}

function referenceSvg(scene, s, w, h) {
  const groups = new Map();
  for (const g of scene.polys) { const key = g.c + '|' + g.s + '|' + r2(g.w); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(g.pts); }
  let body = '';
  groups.forEach((arr, key) => {
    const [fill, stroke, width] = key.split('|');
    body += '<path d="' + arr.map(p => 'M' + r2(p[0][0]) + ' ' + r2(p[0][1]) + 'L' + r2(p[1][0]) + ' ' + r2(p[1][1]) + 'L' + r2(p[2][0]) + ' ' + r2(p[2][1]) + 'L' + r2(p[3][0]) + ' ' + r2(p[3][1]) + 'Z').join('') +
      '" fill="' + fill + '"' + (Number(width) > 0 ? ' stroke="' + stroke + '" stroke-width="' + width + '" stroke-linejoin="round"' : ' stroke="none"') + '/>\n';
  });
  for (const cu of scene.curves) body += '<path d="M' + cu.pts.map(p => r2(p[0]) + ' ' + r2(p[1])).join('L') + '" fill="none" stroke="' + cu.c + '" stroke-width="' + r2(cu.w) + '" stroke-linecap="round"' + (cu.dash ? ' stroke-dasharray="' + r2(cu.dash) + ' ' + r2(cu.dash) + '"' : '') + '/>\n';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">\n<rect width="100%" height="100%" fill="' + s.bg + '"/>\n' + body + '\n</svg>';
}

function checkSvg(text, scene, s, w, h) {
  const attrs = el => Object.fromEntries([...el.matchAll(/([A-Za-z:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  const fail = [];
  if (attrs(/<svg\b[^>]*>/.exec(text)[0]).viewBox !== '0 0 ' + w + ' ' + h) fail.push('viewBox');
  const bg = attrs(/<rect\b[^>]*\/>/.exec(text)[0]);
  if (bg.width !== '100%' || bg.fill.toUpperCase() !== s.bg.toUpperCase()) fail.push('background');
  const paths = [...text.matchAll(/<path\b[^>]*\/>/g)].map(m => attrs(m[0]));
  const polys = [], curves = [];
  for (const p of paths) {
    const nums = p.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    if (p.fill === 'none') { const pts = []; for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]); curves.push({ pts, stroke: p.stroke, width: Number(p['stroke-width']), dash: p['stroke-dasharray'] || null, cap: p['stroke-linecap'] }); continue; }
    assert.equal(nums.length % 8, 0);
    for (let i = 0; i < nums.length; i += 8) polys.push({ pts: [0, 1, 2, 3].map(e => [nums[i + 2 * e], nums[i + 2 * e + 1]]), fill: p.fill, stroke: p.stroke, width: p['stroke-width'] === undefined ? 0 : Number(p['stroke-width']), join: p['stroke-linejoin'] });
  }
  if (polys.length !== scene.polys.length) fail.push('rhombus count ' + polys.length + ' vs ' + scene.polys.length);
  // match every reference rhombus to the SVG rhombus with the same corners
  const cell = 2, bucket = new Map(), key = (x, y) => Math.floor(x / cell) + ',' + Math.floor(y / cell);
  polys.forEach((p, i) => { const cx = p.pts.reduce((t, q) => t + q[0] / 4, 0), cy = p.pts.reduce((t, q) => t + q[1] / 4, 0), kk = key(cx, cy); if (!bucket.has(kk)) bucket.set(kk, []); bucket.get(kk).push(i); });
  const used = new Uint8Array(polys.length);
  let maxErr = 0, coords = 0, matched = 0;
  for (const g of scene.polys) {
    const cx = g.pts.reduce((t, q) => t + q[0] / 4, 0), cy = g.pts.reduce((t, q) => t + q[1] / 4, 0), bx = Math.floor(cx / cell), by = Math.floor(cy / cell);
    let best = -1, bestErr = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const i of bucket.get((bx + dx) + ',' + (by + dy)) || []) {
      if (used[i]) continue;
      const e = Math.max(...g.pts.map(q => Math.min(...polys[i].pts.map(t => Math.max(Math.abs(t[0] - q[0]), Math.abs(t[1] - q[1]))))), ...polys[i].pts.map(t => Math.min(...g.pts.map(q => Math.max(Math.abs(t[0] - q[0]), Math.abs(t[1] - q[1]))))));
      if (e < bestErr) { bestErr = e; best = i; }
    }
    if (best < 0 || bestErr > 0.00501) { if (fail.length < 6) fail.push('rhombus not found at ' + cx.toFixed(2) + ',' + cy.toFixed(2) + ' (' + bestErr + ')'); continue; }
    used[best] = 1; matched++; maxErr = Math.max(maxErr, bestErr); coords += 8;
    const p = polys[best];
    if (p.fill.toUpperCase() !== g.c.toUpperCase()) { if (fail.length < 6) fail.push('fill ' + p.fill + ' vs ' + g.c); }
    if (g.w > 0) { if (p.stroke.toUpperCase() !== g.s.toUpperCase() || Math.abs(p.width - g.w) > 0.00501 || p.join !== 'round') { if (fail.length < 6) fail.push('stroke'); } }
    else if (p.stroke !== 'none') { if (fail.length < 6) fail.push('unexpected stroke'); }
  }
  if (curves.length !== scene.curves.length) fail.push('curve count');
  scene.curves.forEach((cu, i) => {
    const got = curves[i]; if (!got) return;
    if (got.pts.length !== cu.pts.length) { fail.push('curve points'); return; }
    got.pts.forEach((p, j) => { maxErr = Math.max(maxErr, Math.abs(p[0] - cu.pts[j][0]), Math.abs(p[1] - cu.pts[j][1])); coords += 2; });
    if (got.stroke.toUpperCase() !== cu.c.toUpperCase() || Math.abs(got.width - cu.w) > 0.00501 || got.cap !== 'round') fail.push('curve ink');
    if (cu.dash ? !(got.dash && got.dash.split(' ').every(v => Math.abs(Number(v) - cu.dash) <= 0.00501)) : got.dash) fail.push('curve dash');
  });
  if (maxErr > 0.00501) fail.push('coordinate error ' + maxErr);
  return { ok: !fail.length, fail, rhombi: polys.length, matched, curves: curves.length, coordinates: coords, maxCoordinateError: maxErr };
}

async function browser() {
  const { chromium } = require('playwright');
  const html = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8');
  assert(html.includes(SOURCE), 'dist/studio.html does not contain the current src/modules/lozenge.js; run node tools/build.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lozenge-science-')), file = path.join(dir, 'studio.html');
  fs.writeFileSync(file, S.patch(html, [[SOURCE, S.patch(SOURCE, [AUDIT])], ['generatePalette, register, boot,', 'generatePalette, register, auditInstances:()=>instances, boot,']]));
  const b = await chromium.launch({ args: [...glArgs(), '--ignore-gpu-blocklist'] });
  const cases = [], Lm = loadModule();
  try {
    const page = await b.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + file + '#lozenge/lozenge-science', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => Studio.ready);
    await page.evaluate(() => {
      const i = document.querySelector('#export-inches'), d = document.querySelector('#export-dpi');
      i.value = '8'; i.dispatchEvent(new Event('change', { bubbles: true })); d.value = '300'; d.dispatchEvent(new Event('change', { bubbles: true }));
    });
    for (let f = 0; f < FIXTURES.length; f++) {
      const seed = 'lozenge-print-' + f, fx = FIXTURES[f], pal = S.PALETTES[fx.palette];
      const params = Object.assign({ sampler: 'cftp', grain: 0 }, fx, { palette: pal.colors, bg: pal.bg });
      if (!params.v) params.v = await page.evaluate(() => Studio.recipeVersion);
      await page.evaluate(({ seed, params }) => { location.hash = 'lozenge/' + seed + '/' + btoa(JSON.stringify(params)); }, { seed, params });
      await page.waitForFunction(seed => { const e = Studio.auditInstances().lozenge; if (!e || Studio.getRecipe()?.seed !== seed) return false; const a = e.inst.auditRead(); return !a.building && a.meas && a.info; }, seed, { timeout: 240000 });
      const a = await page.evaluate(() => Studio.auditInstances().lozenge.inst.auditRead());
      const s = await page.evaluate(() => JSON.parse(JSON.stringify(Studio.auditInstances().lozenge.state)));
      const sp = await page.evaluate(() => { const x = document.querySelector('#export-dims').textContent; return x; });
      // same recipe in Node through the full regenerate() path
      const nodeState = Object.assign({}, s), box = Lm.create(nodeState); box.run();
      const nd = box.inst.auditRead();
      assert.deepEqual(nd.h, a.h, 'browser and Node heights differ'); assert.deepEqual(nd.info, a.info); assert.deepEqual(nd.meas.rs, a.meas.rs); assert.equal(nd.meas.disSe, a.meas.disSe);
      assert(a.sound && a.info.exact);
      // a v4 recipe gets the rim-connected test by default; an older one that names none gets radius 3
      assert.equal(s.ring, params.v < 4 ? 3 : 0, 'the recipe did not load the frozen test it was made with');
      const reg = L.region(s.a, s.b, s.c), faces = L.faces(a.h, s.a, s.b, s.c), tl = L.tilingOfFaces(reg, faces), orient = new Int8Array(reg.tris.length);
      tl.faceTris.forEach((pair, i) => { for (const t of pair) orient[t] = faces[i].o; });
      const fz = s.ring > 0 ? L.frozenBall(reg, orient, s.ring) : L.rimFrozen(reg, tl.faceTris, faces.map(f => f.o)).tris;
      let mismatch = 0;
      reg.tris.forEach((T, k) => { const idx = (T.u - a.U0) * a.VW + (T.v - a.V0); if ((T.t === 0 ? a.TA : a.TB)[idx] !== orient[k] || (T.t === 0 ? a.meas.fA : a.meas.fB)[idx] !== fz[k]) mismatch++; });
      assert.equal(mismatch, 0, 'orientation or frozen flags differ from the independent reconstruction');
      const dims = /([\d,]+) × ([\d,]+) px/.exec(sp), W = Number(dims[1].replace(/,/g, '')), H = Number(dims[2].replace(/,/g, ''));
      const scene = sceneReference(s, a.h, fz, reg, a.meas.rs, W, H);
      const before = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), a: Studio.auditInstances().lozenge.inst.auditRead() }));
      const module = await page.evaluate(PRINT, { polys: scene.polys, curves: scene.curves, w: W, h: H });
      const svg = checkSvg(module.svg, scene, s, W, H);
      assert(svg.ok, 'module SVG: ' + svg.fail.join('; '));
      assert(module.png.ok, 'module PNG: ' + JSON.stringify(module.png));
      // control: another seed's tiling of the same hexagon must not pass
      const other = Array.from(drawHeights(Lm.hooks, s.a, s.b, s.c, s.seed + '-other'));
      const otherTl = L.tilingOfFaces(reg, L.faces(other, s.a, s.b, s.c)), oo = new Int8Array(reg.tris.length);
      otherTl.faceTris.forEach((pair, i) => { for (const t of pair) oo[t] = L.faces(other, s.a, s.b, s.c)[i].o; });
      const oF = L.faces(other, s.a, s.b, s.c);
      const wrong = checkSvg(module.svg, sceneReference(s, other, s.ring > 0 ? L.frozenBall(reg, oo, s.ring) : L.rimFrozen(reg, otherTl.faceTris, oF.map(f => f.o)).tris, reg, a.meas.rs, W, H), s, W, H);
      assert(!wrong.ok, 'a different tiling passed the SVG check');
      const shell = await page.evaluate(SHELL, { ref: referenceSvg(scene, s, W, H), w: W, h: H });
      const shellSvg = checkSvg(shell.svg.replace(/<metadata id="genchase-provenance">[\s\S]*?<\/metadata>/, ''), scene, s, W, H);
      assert(shellSvg.ok, 'shell SVG: ' + shellSvg.fail.join('; '));
      assert(shell.provenance && shell.vectorRip && shell.width === W && shell.height === H, 'shell export: ' + JSON.stringify(Object.assign({}, shell, { svg: undefined })));
      assert(shell.maxChannelError <= 1, 'shell print differs from the rasterized reference SVG: ' + JSON.stringify(Object.assign({}, shell, { svg: undefined })));
      const after = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), a: Studio.auditInstances().lozenge.inst.auditRead() }));
      assert.equal(after, before, 'exporting changed the recipe or the tiling');
      delete module.svg; delete shell.svg;
      cases.push({ seed, recipeVersion: params.v, frozenTest: s.ring, parameters: s, box: [s.a, s.b, s.c], rhombi: scene.polys.length, heightsSha256: S.sha256(JSON.stringify(a.h)), cftp: a.info,
        arctic: { rMean: a.meas.rMean, rSe: a.meas.rSe, disFrac: a.meas.disFrac, disSe: a.meas.disSe, predDisFrac: a.meas.predDisFrac },
        browserEqualsNode: true, orientationsAndFrozenFlagsIndependent: true, modulePng: module.png, moduleSvg: svg, wrongTilingSvgRejected: { fail: wrong.fail.slice(0, 3) },
        shellExport: Object.assign(shell, { svg: shellSvg }), statePreserved: true });
      log('PASS print ' + seed + ' ' + [s.a, s.b, s.c].join('x') + ' ' + W + 'x' + H + ' rhombi ' + svg.rhombi + ' svg err ' + svg.maxCoordinateError.toExponential(2) + ' png max ' + module.png.maxChannelError + ' shell max ' + shell.maxChannelError);
    }
    assert.deepEqual(errors, []);
    return { cases, chromium: b.version() };
  } finally { await b.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

const PRINT = async ({ polys, curves, w, h }) => {
  const e = Studio.auditInstances().lozenge, s = e.state;
  const blob = await e.inst.exportPNG(w, h), bitmap = await createImageBitmap(blob), c = document.createElement('canvas');
  c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
  const actual = ctx.getImageData(0, 0, w, h).data;
  ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const g of polys) {
    ctx.beginPath(); ctx.moveTo(g.pts[0][0], g.pts[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(g.pts[i][0], g.pts[i][1]); ctx.closePath();
    ctx.fillStyle = g.c; ctx.fill(); if (g.w > 0) { ctx.strokeStyle = g.s; ctx.lineWidth = g.w; ctx.stroke(); }
  }
  for (const cu of curves) {
    ctx.beginPath(); ctx.moveTo(cu.pts[0][0], cu.pts[0][1]); for (let i = 1; i < cu.pts.length; i++) ctx.lineTo(cu.pts[i][0], cu.pts[i][1]);
    ctx.setLineDash(cu.dash ? [cu.dash, cu.dash] : []); ctx.strokeStyle = cu.c; ctx.lineWidth = cu.w; ctx.stroke(); ctx.setLineDash([]);
  }
  const ref = ctx.getImageData(0, 0, w, h).data;
  let max = 0, sum = 0, over1 = 0, shifted = 0;
  for (let i = 0; i < actual.length; i++) { const d = Math.abs(actual[i] - ref[i]); if (d > max) max = d; if (d > 1) over1++; sum += d; if (Math.abs(actual[i] - ref[(i + 4) % ref.length]) > 2) shifted++; }
  const svg = await e.inst.exportSVG(w, h);
  return { png: { width: w, height: h, channelsChecked: actual.length, maxChannelError: max, channelsOverOne: over1, meanChannelError: sum / actual.length, shiftedPrintFailureChannels: shifted, ok: max <= 1 && shifted > 100 },
    svg: typeof svg === 'string' ? svg : await svg.text() };
};

const SHELL = async ({ ref, w, h }) => {
  const img = document.querySelector('#export-img');
  img.removeAttribute('src'); img.hidden = true;
  document.querySelector('#btn-export').click();
  const t0 = Date.now();
  while (!(img.getAttribute('src') && !img.hidden)) {
    if (document.querySelector('#export-note').classList.contains('err')) throw new Error('export failed: ' + document.querySelector('#export-note').textContent);
    if (Date.now() - t0 > 300000) throw new Error('export timed out');
    await new Promise(r => setTimeout(r, 200));
  }
  const decode = async blob => { const bm = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); bm.close(); return { data: x.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height }; };
  const shell = await decode(await (await fetch(img.getAttribute('src'))).blob());
  const svgText = await (await fetch(document.querySelector('#export-svg').href)).text();
  const url = URL.createObjectURL(new Blob([ref], { type: 'image/svg+xml' }));
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { alpha: false }); x.fillStyle = Studio.auditInstances().lozenge.state.bg; x.fillRect(0, 0, w, h);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h); URL.revokeObjectURL(url);
  const reference = x.getImageData(0, 0, w, h).data;
  let max = 0, sum = 0, over = 0;
  if (shell.width === w && shell.height === h) for (let i = 0; i < reference.length; i++) { const d = Math.abs(shell.data[i] - reference[i]); if (d > max) max = d; if (d > 0) over++; sum += d; }
  const note = document.querySelector('#export-note').textContent;
  document.querySelector('#export-close').click();
  return { width: shell.width, height: shell.height, vectorRip: /vector RIP/.test(note), maxChannelError: shell.width === w ? max : null, channelsDiffering: over, meanChannelError: sum / reference.length,
    provenance: /<metadata id="genchase-provenance">/.test(svgText), svg: svgText };
};

async function main() {
  if (PRINT_ONLY) { const pr = await browser(); log(JSON.stringify(pr.cases.map(c => [c.seed, c.moduleSvg.maxCoordinateError, c.modulePng.maxChannelError, c.shellExport.maxChannelError]))); return; }
  const Lm = loadModule();
  log('lozenge: counting');
  const { rows: counts, exactSets } = counting(Lm.hooks);
  const ell = ellipses(Lm.hooks);
  log('lozenge: uniformity');
  // the hooks draw what build() draws: same key derivation, checked against the full regenerate path
  for (const [a, b, c] of [[2, 2, 2], [3, 3, 3]]) for (let i = 0; i < 5; i++) {
    const seed = 'lozenge-path-' + a + '-' + i, st = S.stateFor(Lm.mod, { a, b, c, __raw: true }, seed), box = Lm.create(st); box.run();
    assert.deepEqual(box.inst.auditRead().h, Array.from(drawHeights(Lm.hooks, a, b, c, seed)), 'hook draw differs from regenerate()');
  }
  const names = Object.keys(DRAWS);
  const uniform = uniformity(Lm.hooks, exactSets, names, 'uniform');
  const volume = volumeTest(Lm.hooks, exactSets, 400000);
  log('volume 4x4x4: chi2 ' + volume.chiSquare.toFixed(1) + '/' + volume.df + ' p ' + volume.pValue.toExponential(3) + ' mean ' + volume.meanVolume.toFixed(4) + ' +/- ' + volume.meanVolumeSe.toFixed(4));
  const controls = {};
  for (const [name, ctl] of Object.entries(CONTROLS)) {
    const Lc = loadModule(ctl.patches);
    const rows = uniformity(Lc.hooks, exactSets, ['2x2x2', '3x3x3'], 'control ' + name);
    const self = Lc.hooks.samplerSelfTest((U.makeRng('lozenge-control/selftest')() * 4294967296) | 0, 4000);
    controls[name] = { description: ctl.description, rows, caught: rows.every(r => !r.passes), tabSelfTest: { chi: self.chi, df: self.df, z: self.z, distinct: self.k } };
    log('control ' + name + ' tab self-test z ' + self.z.toFixed(1));
  }
  const selfUniform = Lm.hooks.samplerSelfTest((U.makeRng('lozenge-control/selftest')() * 4294967296) | 0, 4000);
  log('lozenge: limit shape');
  const lim = limitShape(Lm);
  log('self-test over ' + lim.selfTest.plates + ' plates: z mean ' + lim.selfTest.meanZ.toFixed(3) + ' sd ' + lim.selfTest.sdZ.toFixed(3) + ' pooled p ' + lim.selfTest.pooledPValue.toExponential(3));
  for (const [fam, e] of Object.entries(lim.extrapolation)) for (const [k, x] of Object.entries(e)) for (const f of ['three', 'two']) {
    log(fam + ' ' + k + ' ' + f + ': limit ' + x[f].limit.toFixed(4) + ' +/- ' + x[f].limitSe.toFixed(4) + ' against ' + x.exact.toFixed(4) + ', ' + x[f].sigmaFromExact.toFixed(1) + ' sigma; fit chi2 ' + x[f].chiSquare.toFixed(2) + '/' + x[f].dof);
  }
  log('corner depth fluctuation exponent ' + lim.fluctuation.exponent.toFixed(3) + ' +/- ' + lim.fluctuation.exponentSe.toFixed(3) + ' against 1/3');
  const bias = biasedBoundary(24, 40);
  lim.reportedShapes = reportedShapes(Lm, 30);
  log('bias: uniform full-minus-empty ' + bias.uniform.fullMinusEmptyShare.mean.toFixed(4) + ' (' + bias.uniform.sigma.toFixed(1) + ' sigma), biased ' + bias.biasedUpdate.fullMinusEmptyShare.mean.toFixed(4) + ' (' + bias.biasedUpdate.sigma.toFixed(1) + ' sigma)');
  const checks = {
    countsMatchMacMahon: counts.every(r => r.directTilings === r.planePartitions && String(r.directTilings) === r.macmahon),
    moduleLog10Matches: counts.every(r => r.log10Error < 1e-9),
    drawnTilingsAreABijection: counts.every(r => r.drawnTilingsDistinctAndInEnumeration),
    ellipseMatchesTangencySolution: ell.ok,
    uniformityPasses: uniform.every(r => r.passes),
    volumeDistributionPasses: volume.passes,
    controlsFailUniformity: Object.values(controls).every(c => c.caught),
    everyPlateExactAndSound: lim.shapes.every(r => r.allExact),
    frozenFlagsMatchUnionFindOnEveryPlate: lim.shapes.every(r => r.frozenFlagMismatches === 0),
    frozenCountsMatchLevelSetsOnEveryPlate: lim.shapes.every(r => r.levelSetMismatches === 0),
    printedValuesAndBarsMatch: lim.shapes.every(r => r.printedMismatches === 0),
    radiusBarCalibrated: lim.shapes.every(r => r.radius.calibration.inBand),
    freeAreaBarCalibrated: lim.shapes.every(r => r.freeArea.calibration.inBand),
    regularFreeAreaLimitWithin3Sigma: Math.abs(lim.extrapolation.regular.freeArea.three.sigmaFromExact) < 3,
    regularRadiusLimitWithin3Sigma: Math.abs(lim.extrapolation.regular.radius.three.sigmaFromExact) < 3,
    skewFreeAreaLimitWithin3Sigma: Math.abs(lim.extrapolation.skew.freeArea.three.sigmaFromExact) < 3,
    skewRadiusLimitWithin3Sigma: Math.abs(lim.extrapolation.skew.radius.three.sigmaFromExact) < 3,
    uniformCornersSymmetricWithin3Sigma: Math.abs(bias.uniform.sigma) < 3,
    biasMovesBoundaryOver5Sigma: Math.abs(bias.biasedUpdate.sigma) > 5,
    selfTestCalibrated: Math.abs(lim.selfTest.meanZ) < 3 * lim.selfTest.sdZ / Math.sqrt(lim.selfTest.plates) && lim.selfTest.pooledPValue >= ALPHA,
    chunkingPreserved: !!(lim.chunkCheck && lim.chunkCheck.identical),
  };
  log(JSON.stringify(checks));
  let print = null;
  if (!SKIP_BROWSER) { log('lozenge: print'); print = await browser(); }
  const passed = Object.values(checks).every(Boolean) && (SKIP_BROWSER || !!print);
  const result = {
    date: new Date().toISOString().slice(0, 10), tool: 'tools/lozenge-science.js',
    sourceSha256: S.sha256(SOURCE), engineSha256: S.sha256(S.engine),
    scope: 'Coupling from the past as implemented in src/modules/lozenge.js (makeJob, runJob, sweep, buildTiling, corners, frozenRim, classify, measureArctic, ellipseOf, macmahonLog10, samplerSelfTest), run from the unmodified source. Exhaustive enumeration of tilings and plane partitions up to 4x4x4 with sampled frequencies on four boxes and the volume law on 4x4x4; the rim-connected frozen regions, arctic radius and free area over independent seeds on seven regular hexagons (12 to 48) and a skewed 3:5:6 family at four sizes, extrapolated in the size; seven complete rendered recipes, one of them an old (v3) recipe on the local test, with every SVG rhombus and curve point, every PNG byte and the shell vector RIP checked.',
    references: {
      sampler: 'J. Propp and D. Wilson, Random Structures and Algorithms 9, 223 (1996): monotone coupling from the past returns an exact draw from the stationary measure.',
      count: 'P. MacMahon, Phil. Trans. R. Soc. A 211, 345 (1912): prod (i+j+k-1)/(i+j+k-2) boxed plane partitions.',
      limitShape: 'H. Cohn, M. Larsen and J. Propp, New York J. Math. 4, 137 (1998): the frozen regions converge to the complement of the ellipse inscribed in the hexagon and tangent to its six sides.',
      frozenRegions: 'A rhombus is frozen when a chain of edge-adjacent rhombi of its own orientation joins it to the rim of the hexagon: the lozenge analogue, adopted here, of the polar regions of W. Jockusch, J. Propp and P. Shor (1998) for the Aztec diamond as K. Johansson, Ann. Probab. 33, 1 (2005), arXiv:math/0306216, states them. It is not quoted from Cohn, Larsen and Propp.',
      fluctuations: 'The n^(1/3) scale of the frozen boundary is K. Johansson, Ann. Probab. 33, 1 (2005), for the Aztec diamond; for the hexagon it is assumed by analogy, used only to choose the finite-size form, and measured here through the depth of the frozen corners.',
    },
    counting: { rows: counts }, ellipse: ell,
    uniformity: { alpha: ALPHA, rows: uniform, volume4x4x4: volume, interpretation: 'Seeds are distinct recipe strings through U.makeRng and the module counter hash; the probability statements assume those draws behave as independent uniform variates, which a fixed PRNG regression does not prove.' },
    controls: Object.assign({}, controls, { biasedBoundary: bias }), tabSelfTestUnmodified: { chi: selfUniform.chi, df: selfUniform.df, z: selfUniform.z, distinct: selfUniform.k },
    limitShape: lim, checks, print,
    environment: { node: process.version, chromium: print ? print.chromium : null, platform: process.platform, cpus: os.cpus().length, seconds: Math.round((Date.now() - started) / 1000) },
    passed,
  };
  if (WRITE) fs.writeFileSync(path.join(root, 'validation/results/lozenge-science.json'), JSON.stringify(result, null, 2) + '\n');
  log((passed ? 'PASS' : 'FAIL') + ' lozenge science (' + result.environment.seconds + ' s)');
  if (!passed) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
