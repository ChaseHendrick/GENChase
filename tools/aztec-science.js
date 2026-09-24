// node tools/aztec-science.js [--write] [--skip-browser | --print-only]
//
// Exact benchmark and print evidence for the Arctic Circle tab (src/modules/aztec.js).
//
// 1. Counting. Every domino tiling of the Aztec diamond of order n = 1..5 is enumerated by
//    backtracking over the cells (tools/lib/aztec-reference.js), and the count is held to
//    2^{n(n+1)/2} (Elkies, Kuperberg, Larsen and Propp 1992).
// 2. Uniformity. The tab's own build() and shuffle(), run in Node from the unmodified source behind a
//    mock host (tools/lib/tiling-sandbox.js), draw many tilings at each order n = 1..5 from seeded
//    recipes. Every tiling must appear, the Pearson chi-square against the uniform distribution must
//    have p >= 0.001, and every tiling probability and every domino placement probability must sit
//    inside a simultaneous Hoeffding bound (alpha 0.001) and a Bonferroni z bound.
// 3. Arctic circle (Jockusch, Propp and Shor 1998). At seven orders from 40 to 320 the tab's plates
//    are measured over independent seeds. The tab's frozen flags are the polar regions of the theorem
//    (a domino connected to the boundary through edge-adjacent dominoes of its own type), and must equal
//    an independent union-find implementation on every plate. Measured: the tab's polar fraction, the
//    corner-attached variant (the cluster containing each corner domino, computed here), and the boundary
//    radius along the four axes; each is extrapolated in n with a stated finite-size form and compared
//    with 1 - pi/4 and 1/sqrt(2). The status line's per-plate error bar (the spread of the four polar
//    regions) is calibrated against the scatter of the printed fraction over seeds.
// 4. Failure controls. A coin biased to 0.7 must fail the uniformity test and move the boundary; a
//    shuffle with the destruction step removed must be rejected by the independent tiling check.
// 5. Print. Five recipes are built in a temporary copy of dist/studio.html with an auditRead() hook:
//    the browser tiling must equal the Node run of the same recipe, every SVG rectangle must match the
//    independently computed geometry within its 0.01 px rounding, every PNG byte must match an
//    independent painting within one level, the shell's own export (the vector RIP at 8 in, 300 ppi)
//    must be the rasterized SVG of that geometry, and exporting must not change the state.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const S = require('./lib/tiling-sandbox.js');
const R = require('./lib/aztec-reference.js');

const root = S.root;
const SOURCE = S.read('src/modules/aztec.js');
const WRITE = process.argv.includes('--write');
const SKIP_BROWSER = process.argv.includes('--skip-browser');
const started = Date.now();
const log = (...a) => console.log(...a);

const AUDIT = ['        aspect() { return ASPECT; },',
  '        auditRead() { return { order, grid, list, frozen, building }; },\n        aspect() { return ASPECT; },'];
const BIAS = [['      if (rng() < 0.5) {\n        // two horizontals', '      if (rng() < 0.7) {\n        // two horizontals'],
  ['if (rng() < 0.5) { grid[0] = N;', 'if (rng() < 0.7) { grid[0] = N;']];
const NO_DESTRUCTION = [['    for (let j = 0; j < w1; j++) for (let i = 0; i < w1; i++) {\n      if (dark(i, j, n)) continue;',
  '    for (let j = 0; j < 0; j++) for (let i = 0; i < w1; i++) {\n      if (dark(i, j, n)) continue;']];

// A sampler over the module's own code. draw(n, seed) runs regenerate() on a recipe with that order
// and seed; small orders bypass the UI clamp (8..320) but run the same build() and shuffle().
function sampler(patches) {
  const L = S.load(SOURCE, { patches: [AUDIT, ...(patches || [])] });
  const state = S.stateFor(L.mod, { grain: 0 }, 'x');
  const box = L.create(state);
  return {
    mod: L.mod,
    draw(n, seed, clockStep) { state.n = n; state.seed = seed; box.run(clockStep); const a = box.inst.auditRead(); assert(!a.building && a.order === n); return Object.assign({ status: box.host.status }, a); },
  };
}

/* ---------------- 1 and 2: counting and uniformity ---------------- */
const DRAWS = { 1: 4000, 2: 8000, 3: 12800, 4: 40960, 5: 655360 };
const ALPHA = 0.001;

function uniformity(sm, orders, label) {
  const rows = [];
  for (const n of orders) {
    const t0 = Date.now(), exact = R.enumerate(n), expected = 2 ** (n * (n + 1) / 2);
    assert.equal(exact.count, expected, 'enumeration disagrees with 2^{n(n+1)/2} at n = ' + n);
    assert.equal(exact.cells, 2 * n * (n + 1));
    const index = new Map(exact.keys.map((k, i) => [k, i])), counts = new Array(exact.count).fill(0);
    const placeKeys = [...exact.placements.keys()], placeIndex = new Map(placeKeys.map((k, i) => [k, i])), placeCounts = new Array(placeKeys.length).fill(0);
    const draws = DRAWS[n];
    let invalid = 0, firstError = '', valid = 0;
    for (let i = 0; i < draws; i++) {
      const a = sm.draw(n, 'aztec-uniform-n' + n + '-' + i);
      let r;
      try { r = R.inspect(a.list, a.grid, n); } catch (err) { invalid++; if (!firstError) firstError = err.message; continue; }
      const k = index.get(r.key);
      assert(k !== undefined, 'a valid tiling that the enumeration does not contain');
      counts[k]++; valid++;
      const w = 2 * n;
      for (let c = 0; c < w * w; c++) if (r.partner[c] > c) placeCounts[placeIndex.get(c + ':' + r.partner[c])]++;
    }
    const probs = new Array(exact.count).fill(1 / exact.count);
    const marginals = placeKeys.map((k, i) => ({ domino: k, exact: exact.placements.get(k) / exact.count, count: placeCounts[i] }));
    const test = valid ? S.frequencyTest(counts, probs, valid, marginals, ALPHA) : { passes: false };
    rows.push(Object.assign({ order: n, exactTilings: exact.count, formula: '2^' + (n * (n + 1) / 2), cells: exact.cells, seeds: "'aztec-uniform-n" + n + "-<i>', i = 0.." + (draws - 1),
      invalidTilings: invalid, firstInvalidReason: firstError || undefined, dominoPositions: placeKeys.length }, test,
      n <= 3 ? { tilingCounts: counts, placementProbabilities: marginals } : { minCount: Math.min(...counts), maxCount: Math.max(...counts) }, { ms: Date.now() - t0 }));
    log(label + ' n=' + n + ' tilings ' + exact.count + ' draws ' + draws + ' invalid ' + invalid + ' chi2 ' + (test.chiSquare || NaN).toFixed(1) + '/' + test.df + ' p ' + (test.pValue === undefined ? 'n/a' : test.pValue.toExponential(3)) + ' missing ' + test.missing + ' passes ' + test.passes);
  }
  return rows;
}

/* ---------------- 3: the arctic circle ---------------- */
const ORDERS = [40, 57, 80, 113, 160, 226, 320];
const SEEDS = { 40: 400, 57: 400, 80: 400, 113: 300, 160: 200, 226: 150, 320: 100 };
const F_EXACT = 1 - Math.PI / 4, R_EXACT = Math.SQRT1_2;

function measurePlate(sm, n, seed) {
  const a = sm.draw(n, seed), r = R.inspect(a.list, a.grid, n);
  const pb = R.polarBoundary(a.list, n);
  let same = pb.flags.length === a.frozen.length;
  for (let k = 0; same && k < pb.flags.length; k++) if (pb.flags[k] !== a.frozen[k]) same = false;
  const tabFrozen = a.frozen.reduce((x, y) => x + y, 0) / a.list.length;
  // the status line prints this fraction and its error bar through compare(): "<b>value ± error</b>"
  const m = /polar regions <b>([\d.]+) ± ([\d.]+)<\/b>/.exec(a.status);
  assert(m, 'status line carries no polar fraction with an error bar');
  const p = R.polar(a.list, r.partner, r.types, n);
  return { tabFrozen, printed: Number(m[1]), printedSe: Number(m[2]), se4: pb.se4, frozenMatchesDefinition: same,
    polar: p.fraction, radius: p.radius, cornerType: p.cornerType };
}

// Weighted least squares y = X b with weights 1/se^2; returns b, chi-square and degrees of freedom.
function wls(X, y, se) {
  const p = X[0].length, A = Array.from({ length: p }, () => new Array(p).fill(0)), v = new Array(p).fill(0);
  for (let i = 0; i < y.length; i++) { const w = 1 / (se[i] * se[i]); for (let a = 0; a < p; a++) { v[a] += w * X[i][a] * y[i]; for (let b = 0; b < p; b++) A[a][b] += w * X[i][a] * X[i][b]; } }
  // Gaussian elimination
  const M = A.map((row, i) => row.concat([v[i]]));
  for (let c = 0; c < p; c++) {
    let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < p; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= p; k++) M[r][k] -= f * M[c][k]; }
  }
  const b = M.map((row, i) => row[p] / row[i]);
  let chi = 0; for (let i = 0; i < y.length; i++) { const f = X[i].reduce((s, x, a) => s + x * b[a], 0); chi += ((y[i] - f) / se[i]) ** 2; }
  return { b, chi, dof: y.length - p };
}

// Extrapolate a per-seed quantity measured at several orders. Model: q(n) = q_inf + A n^{-2/3} + B n^{-1}.
// The n^{-2/3} term is the leading correction if the boundary sits a distance of order n^{1/3} from the
// circle (Johansson 2005, the Airy-process scale of the arctic boundary); B n^{-1} absorbs the next
// order. Error bars: a bootstrap over seeds at every order, refitting each replicate.
function extrapolate(perOrder, key, exact, bootRng, B) {
  const ns = Object.keys(perOrder).map(Number).sort((a, b) => a - b);
  const vals = ns.map(n => perOrder[n].map(r => r[key]));
  const mean = x => x.reduce((a, b) => a + b, 0) / x.length;
  const summary = ns.map((n, i) => { const e = S.stats.ensemble(vals[i]); return { order: n, seeds: e.n, mean: e.mean, sd: e.sd, se: e.se, deviation: e.mean - exact, deviationTimesN23: (e.mean - exact) * Math.pow(n, 2 / 3), sigmaFromExact: (e.mean - exact) / e.se }; });
  const se = summary.map(r => r.se);
  const fits = {
    three: { label: 'q_inf + A n^-2/3 + B n^-1, all orders', rows: ns.map((n, i) => i), X: n => [1, Math.pow(n, -2 / 3), 1 / n] },
    two: { label: 'q_inf + A n^-2/3, orders >= 113', rows: ns.map((n, i) => i).filter(i => ns[i] >= 113), X: n => [1, Math.pow(n, -2 / 3)] },
  };
  const out = { summary, exact };
  for (const [name, f] of Object.entries(fits)) {
    const X = f.rows.map(i => f.X(ns[i])), y0 = f.rows.map(i => summary[i].mean), s0 = f.rows.map(i => se[i]);
    const fit = wls(X, y0, s0), draws = [];
    for (let b = 0; b < B; b++) {
      const y = f.rows.map(i => { const v = vals[i], m = v.length; let s = 0; for (let k = 0; k < m; k++) s += v[Math.floor(bootRng() * m)]; return s / m; });
      draws.push(wls(X, y, s0).b[0]);
    }
    const sd = S.stats.sd(draws), z = (fit.b[0] - exact) / sd;
    out[name] = { model: f.label, orders: f.rows.map(i => ns[i]), limit: fit.b[0], limitSe: sd, coefficients: fit.b, chiSquare: fit.chi, dof: fit.dof,
      fitPValue: fit.dof > 0 ? S.chiSquareP(fit.chi, fit.dof) : null, sigmaFromExact: z, bootstrapReplicates: B };
  }
  void mean;
  return out;
}

// Standard deviation of one axis radius across seeds, pooled over the four axes, against n; the slope
// of log sd on log n is the fluctuation exponent (1/3 on the Airy scale). Bootstrap over seeds.
function fluctuation(perOrder, bootRng, B) {
  const ns = Object.keys(perOrder).map(Number).sort((a, b) => a - b);
  const pooled = rows => { let v = 0; for (const k of ['N', 'S', 'W', 'E']) v += S.stats.variance(rows.map(r => r.radius[k])); return Math.sqrt(v / 4); };
  const sds = ns.map(n => pooled(perOrder[n]));
  const slope = ys => S.stats.ols(ns.map(Math.log), ys.map(Math.log)).slope;
  const est = slope(sds), draws = [];
  for (let b = 0; b < B; b++) draws.push(slope(ns.map(n => { const v = perOrder[n], m = v.length, pick = []; for (let k = 0; k < m; k++) pick.push(v[Math.floor(bootRng() * m)]); return pooled(pick); })));
  const se = S.stats.sd(draws);
  return { orders: ns, pooledAxisSd: sds, exponent: est, exponentSe: se, reference: 1 / 3, sigmaFromReference: (est - 1 / 3) / se, bootstrapReplicates: B };
}

function arctic(sm) {
  const perOrder = {}, rows = [];
  for (const n of ORDERS) {
    const t0 = Date.now(), plates = [];
    for (let i = 0; i < SEEDS[n]; i++) plates.push(measurePlate(sm, n, 'aztec-arctic-n' + n + '-' + i));
    perOrder[n] = plates.map(p => Object.assign({}, p, { axis: (p.radius.N + p.radius.S + p.radius.E + p.radius.W) / (4 * n) }));
    const wrongCorner = plates.filter(p => p.cornerType.N !== 1 || p.cornerType.S !== 2 || p.cornerType.W !== 3 || p.cornerType.E !== 4).length;
    const definitionMismatch = plates.filter(p => !p.frozenMatchesDefinition).length;
    const printedMismatch = plates.filter(p => Math.abs(p.printed - p.tabFrozen) > 5e-4 + 1e-12 || Math.abs(p.printedSe - p.se4) > 5e-4 + 1e-12).length;
    // Calibration of the printed error bar: the scatter of the fraction over seeds against the RMS per-plate bar.
    const scatter = S.stats.sd(plates.map(p => p.tabFrozen)), rmsBar = Math.sqrt(plates.reduce((a, p) => a + p.se4 * p.se4, 0) / plates.length);
    const nsew = plates.map(p => (p.radius.N + p.radius.S - p.radius.E - p.radius.W) / (2 * n));
    rows.push({ order: n, seeds: plates.length, seedPattern: "'aztec-arctic-n" + n + "-<i>'", cornerTypeMismatches: wrongCorner, frozenDefinitionMismatches: definitionMismatch,
      printedMismatches: printedMismatch, errorBarCalibration: { scatter, rmsBar, ratio: scatter / rmsBar }, northSouthMinusEastWest: S.stats.ensemble(nsew), ms: Date.now() - t0 });
    log('arctic n=' + n + ' seeds ' + plates.length + ' polar ' + S.stats.ensemble(plates.map(p => p.polar)).mean.toFixed(4) + ' tab ' + S.stats.ensemble(plates.map(p => p.tabFrozen)).mean.toFixed(4) +
      ' axis ' + S.stats.ensemble(perOrder[n].map(p => p.axis)).mean.toFixed(4) + ' bar calibration ' + (scatter / rmsBar).toFixed(2) + ' (' + (Date.now() - t0) + ' ms)');
  }
  const rng = S.util.makeRng('aztec-science-bootstrap'), B = 1000;
  return {
    orders: rows,
    polarFraction: extrapolate(perOrder, 'polar', F_EXACT, rng, B),
    axisRadius: extrapolate(perOrder, 'axis', R_EXACT, rng, B),
    tabFrozenFraction: extrapolate(perOrder, 'tabFrozen', F_EXACT, rng, B),
    axisFluctuation: fluctuation(perOrder, rng, B),
  };
}

function biasedBoundary(n, seeds) {
  const out = {};
  for (const [name, sm] of [['uniform', sampler()], ['biased0.7', sampler(BIAS)]]) {
    const plates = [];
    for (let i = 0; i < seeds; i++) plates.push(measurePlate(sm, n, 'aztec-arctic-n' + n + '-' + i));
    const ns = plates.map(p => (p.radius.N + p.radius.S) / (2 * n)), ew = plates.map(p => (p.radius.E + p.radius.W) / (2 * n));
    const diff = S.stats.ensemble(plates.map((p, i) => ns[i] - ew[i]));
    out[name] = { order: n, seeds, northSouthRadius: S.stats.ensemble(ns), eastWestRadius: S.stats.ensemble(ew), difference: diff, differenceSigma: diff.mean / diff.se,
      polarFraction: S.stats.ensemble(plates.map(p => p.polar)), tabFrozenFraction: S.stats.ensemble(plates.map(p => p.tabFrozen)) };
  }
  return out;
}

/* ---------------- 5: print ---------------- */
const FIXTURES = [
  { n: 8, fill: 'type', shift: 0, inset: 0.12, strokeWidth: 1, strokeColor: 3, circle: false, margin: 0.05, grain: 0, palette: 'tram' },
  { n: 28, fill: 'orient', shift: 2, inset: 0, strokeWidth: 0, strokeColor: 3, circle: true, margin: 0.08, grain: 0, palette: 'kiln' },
  { n: 60, fill: 'frozen', shift: 1, inset: 0.03, strokeWidth: 0.8, strokeColor: 4, circle: true, margin: 0.04, grain: 0, palette: 'verdigris' },
  { n: 120, fill: 'type', shift: 0, inset: 0.08, strokeWidth: 0, strokeColor: 3, circle: false, margin: 0.05, grain: 0, palette: 'kiln' },
  { n: 180, fill: 'frozen', shift: 3, inset: 0.03, strokeWidth: 0, strokeColor: 3, circle: true, margin: 0.06, grain: 0, palette: 'graphite' },
];

const r2 = v => Math.round(v * 100) / 100;
const lum = h => 0.2126 * parseInt(h.slice(1, 3), 16) + 0.7152 * parseInt(h.slice(3, 5), 16) + 0.0722 * parseInt(h.slice(5, 7), 16);
const inkHex = bg => lum(bg) > 128 ? '#141008' : '#F5F0E8';
const inkRgba = (bg, a) => lum(bg) > 128 ? 'rgba(20,16,8,' + a + ')' : 'rgba(245,240,232,' + a + ')';

// An SVG document with the independently computed geometry, in the SVG 1.1 form any writer would use.
function referenceSvg(geo, s, w, h) {
  let body = '';
  const st = geo.stroke ? ' stroke="' + geo.stroke.color + '" stroke-width="' + r2(geo.stroke.width) + '"' : '';
  for (const q of geo.rects) body += '<rect x="' + r2(q.x) + '" y="' + r2(q.y) + '" width="' + r2(q.w) + '" height="' + r2(q.h) + '" fill="' + q.fill + '"' + st + '/>';
  if (geo.circle) body += '<circle cx="' + r2(geo.circle.cx) + '" cy="' + r2(geo.circle.cy) + '" r="' + r2(geo.circle.r) + '" fill="none" stroke="' + inkHex(s.bg) + '" stroke-opacity="0.8" stroke-width="' + r2(geo.circle.width) + '"/>';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">\n<rect width="100%" height="100%" fill="' + s.bg + '"/>\n' + body + '\n</svg>';
}

// Parse the rectangles and circles of an SVG text and hold them to the geometry.
function checkSvg(text, geo, s, w, h) {
  const attrs = el => Object.fromEntries([...el.matchAll(/([A-Za-z:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  const root = attrs(/<svg\b[^>]*>/.exec(text)[0]);
  assert.equal(root.viewBox, '0 0 ' + w + ' ' + h);
  const rects = [...text.matchAll(/<rect\b[^>]*\/>/g)].map(m => attrs(m[0]));
  const circles = [...text.matchAll(/<circle\b[^>]*\/>/g)].map(m => attrs(m[0]));
  const bg = rects.shift();
  let maxErr = 0, coords = 0, fills = 0;
  const fail = [];
  if (!(bg && bg.width === '100%' && bg.fill.toUpperCase() === s.bg.toUpperCase())) fail.push('background');
  if (rects.length !== geo.rects.length) fail.push('rect count ' + rects.length + ' vs ' + geo.rects.length);
  for (let i = 0; i < Math.min(rects.length, geo.rects.length); i++) {
    const a = rects[i], q = geo.rects[i];
    for (const [k, v] of [['x', q.x], ['y', q.y], ['width', q.w], ['height', q.h]]) { maxErr = Math.max(maxErr, Math.abs(Number(a[k]) - v)); coords++; }
    if (a.fill.toUpperCase() !== q.fill.toUpperCase()) { if (fail.length < 5) fail.push('fill of rect ' + i); } else fills++;
    if (geo.stroke) { if (a.stroke.toUpperCase() !== geo.stroke.color.toUpperCase() || Math.abs(Number(a['stroke-width']) - geo.stroke.width) > 0.00501) { if (fail.length < 5) fail.push('stroke of rect ' + i); } }
    else if (a.stroke !== undefined) { if (fail.length < 5) fail.push('unexpected stroke'); }
  }
  if (!!geo.circle !== (circles.length === 1)) fail.push('circle count');
  if (geo.circle && circles.length === 1) {
    const c = circles[0];
    for (const [k, v] of [['cx', geo.circle.cx], ['cy', geo.circle.cy], ['r', geo.circle.r], ['stroke-width', geo.circle.width]]) { maxErr = Math.max(maxErr, Math.abs(Number(c[k]) - v)); coords++; }
    if (c.stroke.toUpperCase() !== inkHex(s.bg).toUpperCase() || c['stroke-opacity'] !== '0.8' || c.fill !== 'none') fail.push('circle ink');
  }
  if (maxErr > 0.00501) fail.push('coordinate error ' + maxErr);
  return { ok: !fail.length, fail, rects: rects.length, coordinates: coords, fillsMatched: fills, maxCoordinateError: maxErr };
}

async function browser() {
  const { chromium } = require('playwright');
  const injected = S.patch(SOURCE, [[AUDIT[0], '        auditRead() { return { order, n: order, grid: grid && Array.from(grid), list, frozen: frozen && Array.from(frozen), building }; },\n' + AUDIT[0]]]);
  const html = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8');
  assert(html.includes(SOURCE), 'dist/studio.html does not contain the current src/modules/aztec.js; run node tools/build.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aztec-science-')), file = path.join(dir, 'studio.html');
  fs.writeFileSync(file, S.patch(html, [[SOURCE, injected], ['generatePalette, register, boot,', 'generatePalette, register, auditInstances:()=>instances, boot,']]));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const cases = [], node = sampler();
  try {
    const page = await b.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + file + '#aztec/aztec-science', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => Studio.ready);
    // print size the way a user sets it: 8 inches at 300 ppi
    await page.evaluate(() => {
      const i = document.querySelector('#export-inches'), d = document.querySelector('#export-dpi');
      i.value = '8'; i.dispatchEvent(new Event('change', { bubbles: true })); d.value = '300'; d.dispatchEvent(new Event('change', { bubbles: true }));
    });
    for (let f = 0; f < FIXTURES.length; f++) {
      const seed = 'aztec-print-' + f, fx = FIXTURES[f], pal = S.PALETTES[fx.palette];
      const params = Object.assign({}, fx, { palette: pal.colors, bg: pal.bg });
      await page.evaluate(({ seed, params }) => { location.hash = 'aztec/' + seed + '/' + btoa(JSON.stringify(Object.assign({}, params, { v: 2 }))); }, { seed, params });
      await page.waitForFunction(seed => { const e = Studio.auditInstances().aztec; if (!e || Studio.getRecipe()?.seed !== seed) return false; const a = e.inst.auditRead(); return !a.building && a.list && a.order === e.state.n; }, seed, { timeout: 120000 });
      const a = await page.evaluate(() => Studio.auditInstances().aztec.inst.auditRead());
      const s = await page.evaluate(() => JSON.parse(JSON.stringify(Studio.auditInstances().aztec.state)));
      const n = a.order;
      assert.equal(n, fx.n);
      // the same recipe through the same code in Node
      const nd = node.draw(n, s.seed);
      assert.deepEqual(Array.from(nd.grid), a.grid, 'browser and Node tilings differ');
      assert.deepEqual(Array.from(nd.frozen), a.frozen);
      const chunked = node.draw(n, s.seed, 20);
      assert.deepEqual(Array.from(chunked.grid), a.grid, 'chunking one shuffle per timer slice changed the tiling');
      R.inspect(a.list, a.grid, n);
      const local = R.polarBoundary(a.list, n).flags;
      assert.deepEqual(local, a.frozen, 'frozen flags differ from the polar regions of the theorem');
      const W = 2400, H = 2400, geo = R.geometry(s, a.list, local, n, W, H);
      const before = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), a: Studio.auditInstances().aztec.inst.auditRead() }));
      const module = await page.evaluate(PRINT, { geo, w: W, h: H, ink: s.circle ? inkRgba(s.bg, 0.8) : null });
      const svg = checkSvg(module.svg, geo, s, W, H);
      assert(svg.ok, 'module SVG: ' + svg.fail.join('; '));
      // control: the SVG must not match the geometry of another seed's tiling of the same order
      const other = node.draw(n, s.seed + '-other'), otherInsp = R.inspect(other.list, other.grid, n);
      const wrong = checkSvg(module.svg, R.geometry(s, other.list, R.polarBoundary(other.list, n).flags, n, W, H), s, W, H);
      assert(!wrong.ok, 'a different tiling passed the SVG check');
      // the shell's export, as a user presses it
      const shell = await page.evaluate(SHELL, { ref: referenceSvg(geo, s, W, H), w: W, h: H });
      const shellSvg = checkSvg(shell.svg.replace(/<metadata id="genchase-provenance">[\s\S]*?<\/metadata>/, ''), geo, s, W, H);
      assert(shellSvg.ok, 'shell SVG: ' + shellSvg.fail.join('; '));
      assert(shell.provenance, 'shell SVG carries no provenance');
      assert.equal(shell.width, W); assert.equal(shell.height, H);
      assert(shell.maxChannelError === 0, 'shell print differs from the rasterized reference SVG: ' + JSON.stringify(shell));
      const after = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), a: Studio.auditInstances().aztec.inst.auditRead() }));
      assert.equal(after, before, 'exporting changed the recipe or the tiling');
      delete module.svg; delete shell.svg;
      cases.push({ seed, parameters: s, order: n, dominoes: a.list.length, frozenDominoes: local.reduce((x, y) => x + y, 0), gridSha256: S.sha256(Buffer.from(a.grid)),
        browserEqualsNode: true, chunkingPreserved: true, frozenMatchesDefinition: true, validTiling: true,
        modulePng: module.png, moduleSvg: svg, wrongTilingSvgRejected: { fail: wrong.fail.slice(0, 3) }, shellExport: Object.assign(shell, { svg: shellSvg }), statePreserved: true });
      log('PASS print ' + seed + ' n=' + n + ' rects ' + svg.rects + ' svg err ' + svg.maxCoordinateError.toExponential(2) + ' png max ' + module.png.maxChannelError + ' shell max ' + shell.maxChannelError);
    }
    assert.deepEqual(errors, []);
    return { cases, chromium: b.version() };
  } finally { await b.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

// In the page: the module's own PNG and SVG exports against an independent painting of the geometry.
const PRINT = async ({ geo, w, h, ink }) => {
  const e = Studio.auditInstances().aztec, s = e.state;
  const blob = await e.inst.exportPNG(w, h), bitmap = await createImageBitmap(blob), c = document.createElement('canvas');
  c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
  const actual = ctx.getImageData(0, 0, w, h).data;
  ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h);
  for (const q of geo.rects) {
    ctx.fillStyle = q.fill; ctx.fillRect(q.x, q.y, q.w, q.h);
    if (geo.stroke) { ctx.lineWidth = geo.stroke.width; ctx.strokeStyle = geo.stroke.color; ctx.strokeRect(q.x, q.y, q.w, q.h); }
  }
  if (geo.circle) { ctx.beginPath(); ctx.arc(geo.circle.cx, geo.circle.cy, geo.circle.r, 0, 2 * Math.PI); ctx.lineWidth = geo.circle.width; ctx.strokeStyle = ink; ctx.stroke(); }
  const ref = ctx.getImageData(0, 0, w, h).data;
  let max = 0, sum = 0, shifted = 0;
  for (let i = 0; i < actual.length; i++) { const d = Math.abs(actual[i] - ref[i]); if (d > max) max = d; sum += d; if (Math.abs(actual[i] - ref[(i + 4) % ref.length]) > 2) shifted++; }
  const svg = await e.inst.exportSVG(w, h);
  return { png: { width: w, height: h, channelsChecked: actual.length, maxChannelError: max, meanChannelError: sum / actual.length, shiftedPrintFailureChannels: shifted, ok: max <= 1 && shifted > 100 }, svg: typeof svg === 'string' ? svg : await svg.text() };
};

// In the page: press Export, wait for the sheet, and compare the shell's PNG with the reference SVG
// rasterized the way the shell rasterizes a vector plate.
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
  const x = c.getContext('2d', { alpha: false }); x.fillStyle = Studio.auditInstances().aztec.state.bg; x.fillRect(0, 0, w, h);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h); URL.revokeObjectURL(url);
  const reference = x.getImageData(0, 0, w, h).data;
  let max = 0, sum = 0;
  if (shell.width === w && shell.height === h) for (let i = 0; i < reference.length; i++) { const d = Math.abs(shell.data[i] - reference[i]); if (d > max) max = d; sum += d; }
  const note = document.querySelector('#export-note').textContent;
  document.querySelector('#export-close').click();
  return { width: shell.width, height: shell.height, vectorRip: /vector RIP/.test(note), maxChannelError: shell.width === w ? max : null, meanChannelError: sum / reference.length,
    provenance: /<metadata id="genchase-provenance">/.test(svgText), svg: svgText };
};

async function main() {
  if (process.argv.includes('--print-only')) { const pr = await browser(); log(JSON.stringify(pr.cases.map(c => [c.seed, c.moduleSvg.maxCoordinateError, c.modulePng.maxChannelError, c.shellExport.maxChannelError]))); return; }
  log('aztec: counting and uniformity');
  const uniform = uniformity(sampler(), [1, 2, 3, 4, 5], 'uniform');
  const biased = uniformity(sampler(BIAS), [1, 2, 3, 4], 'control biased 0.7');
  const broken = uniformity(sampler(NO_DESTRUCTION), [3, 4], 'control no destruction');
  const uniformOk = uniform.every(r => r.passes && r.invalidTilings === 0);
  const biasCaught = biased.every(r => !r.passes);
  const brokenCaught = broken.every(r => r.invalidTilings > 0 && !r.passes);
  log('aztec: arctic circle');
  const arc = arctic(sampler());
  const bias = biasedBoundary(160, 40);
  for (const k of ['polarFraction', 'axisRadius', 'tabFrozenFraction']) for (const f of ['three', 'two']) {
    const x = arc[k][f];
    log(k + ' ' + f + ': limit ' + x.limit.toFixed(4) + ' +/- ' + x.limitSe.toFixed(4) + ' against ' + arc[k].exact.toFixed(4) + ', ' + x.sigmaFromExact.toFixed(1) + ' sigma; fit chi2 ' + x.chiSquare.toFixed(2) + '/' + x.dof);
  }
  log('axis fluctuation exponent ' + arc.axisFluctuation.exponent.toFixed(3) + ' +/- ' + arc.axisFluctuation.exponentSe.toFixed(3) + ' against 1/3');
  log('bias: ' + JSON.stringify({ u: [bias.uniform.northSouthRadius.mean, bias.uniform.eastWestRadius.mean, bias.uniform.differenceSigma], b: [bias['biased0.7'].northSouthRadius.mean, bias['biased0.7'].eastWestRadius.mean, bias['biased0.7'].differenceSigma, bias['biased0.7'].polarFraction.mean] }));
  const checks = {
    enumerationMatchesFormula: uniform.every(r => r.exactTilings === 2 ** (r.order * (r.order + 1) / 2)),
    uniformityPasses: uniformOk,
    biasedCoinFailsUniformity: biasCaught,
    missingDestructionRejected: brokenCaught,
    frozenFlagsMatchDefinitionOnEveryPlate: arc.orders.every(r => r.frozenDefinitionMismatches === 0),
    printedValueAndBarMatch: arc.orders.every(r => r.printedMismatches === 0),
    tabPolarLimitWithin3Sigma: Math.abs(arc.tabFrozenFraction.three.sigmaFromExact) < 3,
    printedBarCalibrated: arc.orders.every(r => r.errorBarCalibration.ratio > 0.75 && r.errorBarCalibration.ratio < 1.33),
    cornerTypesAsExpected: arc.orders.every(r => r.cornerTypeMismatches === 0),
    polarLimitWithin3Sigma: Math.abs(arc.polarFraction.three.sigmaFromExact) < 3,
    axisLimitWithin3Sigma: Math.abs(arc.axisRadius.three.sigmaFromExact) < 3,
    fourfoldSymmetryWithin3Sigma: Math.abs(bias.uniform.differenceSigma) < 3,
    biasMovesBoundaryOver5Sigma: Math.abs(bias['biased0.7'].differenceSigma) > 5,
  };
  log(JSON.stringify(checks));
  let print = null;
  if (!SKIP_BROWSER) { log('aztec: print'); print = await browser(); }
  const passed = Object.values(checks).every(Boolean) && (SKIP_BROWSER || !!print);
  const result = {
    date: new Date().toISOString().slice(0, 10), tool: 'tools/aztec-science.js',
    sourceSha256: S.sha256(SOURCE), engineSha256: S.sha256(S.engine),
    scope: 'Domino shuffling as implemented in src/modules/aztec.js (build, shuffle, dominoes, the polar regions) run from the unmodified source. Exhaustive enumeration and sampled frequencies at orders 1 to 5; polar-region area, axis radius and the tab\'s frozen fraction over independent seeds at seven orders from 40 to 320; five complete rendered recipes with every SVG rectangle, every PNG byte and the shell\'s vector RIP checked.',
    references: {
      count: 'N. Elkies, G. Kuperberg, M. Larsen and J. Propp, J. Algebraic Combin. 1, 111 and 219 (1992): 2^{n(n+1)/2} tilings; domino shuffling samples them uniformly.',
      arcticCircle: 'W. Jockusch, J. Propp and P. Shor, arXiv:math/9801068 (1998): the boundary of the four polar regions converges to the inscribed circle, so the polar area fraction tends to 1 - pi/4 and the axis radius to n/sqrt(2).',
      polarRegions: 'The north polar region is the union of the north-going dominoes connected to the boundary by a sequence of adjacent north-going dominoes, as K. Johansson, Ann. Probab. 33, 1 (2005), arXiv:math/0306216, states the definition of Jockusch, Propp and Shor; likewise for the other three.',
      fluctuations: 'K. Johansson, Ann. Probab. 33, 1 (2005): the arctic boundary fluctuates on the scale n^{1/3} (Airy process); used only to choose the finite-size form n^{-2/3} and as the reference exponent 1/3.',
    },
    uniformity: { alpha: ALPHA, rows: uniform, interpretation: 'Seeds are distinct recipe strings through U.makeRng; the probability statements assume those streams behave as independent uniform draws, which a fixed PRNG regression does not prove.' },
    controls: { biasedCoin: { description: 'creation step fills a block with two horizontals with probability 0.7 instead of 1/2 (order-1 seed tiling too)', rows: biased, caught: biasCaught },
      noDestruction: { description: 'destruction step removed', rows: broken, caught: brokenCaught }, biasedBoundary: bias },
    arctic: arc, checks, print,
    environment: { node: process.version, chromium: print ? print.chromium : null, platform: process.platform, cpus: os.cpus().length, seconds: Math.round((Date.now() - started) / 1000) },
    passed,
  };
  if (WRITE) fs.writeFileSync(path.join(root, 'validation/results/aztec-science.json'), JSON.stringify(result, null, 2) + '\n');
  log((passed ? 'PASS' : 'FAIL') + ' aztec science (' + result.environment.seconds + ' s)');
  if (!passed) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
