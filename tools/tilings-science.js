'use strict';
// Exact-geometry review of src/modules/tilings.js: Penrose P3 and P2 by Robinson-triangle deflation,
// Ammann-Beenker and dodecagonal tilings by de Bruijn's dual multigrid. The module's own code generates
// every tile (loaded from disk with read-only hooks and the engine's makeRng); the predicates in
// tools/tilings-geometry.js judge them independently: exact Fibonacci counts of geometrically classified
// half-tiles, an oriented 1-chain that must cancel (single coverage, no gaps, edge to edge), clipped area,
// the de Bruijn cut-and-project window for every lifted vertex, vertex censuses against independent
// pentagrid and multigrid references, matching arcs, lattice-point counts of the multigrid, and deliberate
// failure controls. Hat and spectre are measured but lie outside the reviewed domain.
// node tools/tilings-science.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const G = require('./tilings-geometry.js');
const { PHI, TAU } = G;
const root = G.root;
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const INF = { x0: -Infinity, x1: Infinity, y0: -Infinity, y1: Infinity };
const fib = n => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; }; // F(1) = F(2) = 1
const strip = o => { const r = {}; for (const k of Object.keys(o)) if (k[0] !== '_') r[k] = o[k]; return r; };
const IPHI = 1 / PHI;

// Acceptance criteria, fixed before any result was inspected.
const CRITERIA = {
  mergeSpread: 1e-9,          // largest distance between points identified as one vertex (edge units)
  minSeparation: 0.2,         // smallest distance between distinct vertices (edge units)
  viewArea: 1e-9,             // |sum area(tile ∩ view) / view area - 1|
  wheelArea: 1e-12,           // |sum half-tile area / decagon area - 1|
  window: 1e-9,               // largest cut-and-project window violation left by the best shift
  arcGap: 1e-9,               // arc crossing positions on a shared edge
  segment: 1e-9,              // inflation-level segment lengths (relative)
};
const DOMAIN_MODES = ['p3', 'p2', 'ab', 'd12'];

/* ---------------- full deflation of the sun wheel ---------------- */
function wheel(hooks, mode, k) {
  let tris = hooks.seedWheel(Math.pow(PHI, k), 0, 0, 0);
  for (let i = 0; i < k; i++) tris = hooks.deflate(mode, tris, INF, false);
  return tris;
}
function triangles(tris) {
  const out = [], v = tris.v;
  for (let i = 0; i < tris.n; i++) {
    const o = i * 6, A = [v[o], v[o + 1]], B = [v[o + 2], v[o + 3]], C = [v[o + 4], v[o + 5]];
    const hand = Math.sign((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]));
    out.push({ type: tris.t[i], flip: 0, A, B, C, hand, pts: hand > 0 ? [A, B, C] : [A, C, B] });
  }
  return out;
}
// Robinson triangles: apex A between equal legs; base/leg = 1/φ (acute) or φ (obtuse). Leg lengths:
// P3 both 1 (rhomb edges); P2 kite half 1, dart half 1/φ.
function classifyHalf(mode, T) {
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const ab = d(T.A, T.B), ac = d(T.A, T.C), bc = d(T.B, T.C), rel = (x, y) => Math.abs(x / y - 1) <= 1e-9;
  if (!rel(ab, ac)) return null;
  const acute = rel(bc / ab, IPHI), obtuse = rel(bc / ab, PHI);
  if (!acute && !obtuse) return null;
  const leg = mode === 'p3' ? 1 : acute ? 1 : IPHI;
  if (!rel(ab, leg)) return null;
  if (mode === 'p3') return acute ? { name: 'thin half', type: 0 } : { name: 'thick half', type: 1 };
  return acute ? { name: 'kite half', type: 0 } : { name: 'dart half', type: 1 };
}
function onDecagon(p, R, tol) {
  let best = Infinity;
  for (let i = 0; i < 10; i++) {
    const a = (2 * i + 1) * Math.PI / 10, b = (2 * i + 3) * Math.PI / 10;
    const P = [R * Math.cos(a), R * Math.sin(a)], Q = [R * Math.cos(b), R * Math.sin(b)];
    const dx = Q[0] - P[0], dy = Q[1] - P[1], t = Math.max(0, Math.min(1, ((p[0] - P[0]) * dx + (p[1] - P[1]) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(p[0] - P[0] - t * dx, p[1] - P[1] - t * dy));
  }
  return best <= tol;
}
function wheelStudy(hooks, mode, k) {
  const tris = wheel(hooks, mode, k), R = Math.pow(PHI, k), T = triangles(tris);
  const names = mode === 'p3' ? ['thin half', 'thick half'] : ['kite half', 'dart half'];
  const counts = { [names[0]]: 0, [names[1]]: 0 }, hands = { [names[0]]: [0, 0], [names[1]]: [0, 0] };
  let unclassified = 0, labelMismatch = 0, area = 0;
  for (const t of T) {
    const c = classifyHalf(mode, t);
    area += Math.abs(G.signedArea(t.pts));
    if (!c) { unclassified++; continue; }
    counts[c.name]++; hands[c.name][t.hand > 0 ? 0 : 1]++;
    if (c.type !== t.type) labelMismatch++;
  }
  const expected = mode === 'p3' ? { 'thin half': 10 * fib(2 * k - 1), 'thick half': 10 * fib(2 * k) } : { 'kite half': 10 * fib(2 * k + 1), 'dart half': 10 * fib(2 * k) };
  const decagon = 5 * R * R * Math.sin(Math.PI / 5);
  const chain = G.chainCheck(T, { unit: 1 });
  const V = chain._snap.pts;
  let offDecagon = 0, wind = 0;
  for (const [a, b] of chain._boundary) {
    const mid = [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2];
    if (!onDecagon(V[a], R, 1e-9 * R) || !onDecagon(V[b], R, 1e-9 * R) || !onDecagon(mid, R, 1e-9 * R)) offDecagon++;
    wind += Math.atan2(V[a][0] * V[b][1] - V[a][1] * V[b][0], V[a][0] * V[b][0] + V[a][1] * V[b][1]);
  }
  // Glue: every half whose glue edge is interior must be paired; unpaired halves sit on the decagon.
  const whole = hooks.glue(mode, tris, () => 0);
  let glueOnBoundary = 0;
  for (const t of T) {
    const [P, Q] = mode === 'p3' ? [t.B, t.C] : [t.A, t.B];
    const mid = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
    if (onDecagon(P, R, 1e-9 * R) && onDecagon(Q, R, 1e-9 * R) && onDecagon(mid, R, 1e-9 * R)) glueOnBoundary++;
  }
  const wholeShapes = G.shapeCheck(mode, G.polygonsOf(whole));
  const row = {
    k, R, halves: T.length, counts, expected, handedness: hands, unclassified, labelMismatch,
    countsExact: counts[names[0]] === expected[names[0]] && counts[names[1]] === expected[names[1]],
    ratio: counts[names[1]] ? (mode === 'p3' ? counts[names[1]] / counts[names[0]] : counts[names[0]] / counts[names[1]]) : null,
    areaRelativeError: Math.abs(area / decagon - 1),
    chain: { tJunctions: chain.tJunctions, repeatedDirectedSubEdges: chain.repeatedDirectedSubEdges, notSimple: chain.notSimple, degenerateEdges: chain.degenerateEdges,
      boundarySubEdges: chain.boundarySubEdges, boundaryOffDecagon: offDecagon, windingAboutCentre: wind / TAU, maxMergeSpread: chain.maxMergeSpread },
    wholeTiles: whole.n, unpairedHalves: T.length - 2 * whole.n, halvesWithGlueEdgeOnBoundary: glueOnBoundary,
    wholeShapes: { unmatched: wholeShapes.unmatched, labelMismatch: wholeShapes.labelMismatch, counts: wholeShapes.counts },
  };
  row.ratioError = row.ratio === null ? null : Math.abs(row.ratio - PHI);
  row.ok = row.countsExact && !unclassified && !labelMismatch && row.areaRelativeError <= CRITERIA.wheelArea &&
    !chain.tJunctions && !chain.repeatedDirectedSubEdges && !chain.notSimple && !chain.degenerateEdges && !offDecagon && Math.abs(wind / TAU - 1) < 1e-9 &&
    row.unpairedHalves === glueOnBoundary && !wholeShapes.unmatched && !wholeShapes.labelMismatch;
  return row;
}

/* ---------------- fixtures ---------------- */
const SEEDS = ['penrose-1974', 'tilings-review-a', 'tilings-review-b', 'tilings-review-c'];
const DOMAIN_PRESETS = ['rhombs', 'arcs', 'kitedart', 'ammann', 'inflation', 'linedrawing', 'dodeca', 'kilnfloor'];
function fixtures(hooks) {
  const out = [];
  for (const name of DOMAIN_PRESETS) for (const seed of SEEDS) out.push({ name: name + '@' + seed, preset: name, state: { ...hooks.DEFAULTS, ...hooks.PRESETS[name].p, seed } });
  const rot = [0, 17, 233, 90, 311, 45, 180, 7, 271], asp = ['1:1', '16:9', '4:5', '3:2', '5:4', '1:1', '16:9', '4:5', '3:2'];
  const zoom = [1, 0.3, 2.5, 4, 0.75, 1.6, 1, 0.5, 1], pan = [[0, 0], [0.5, -0.35], [-2.9, 3], [0, 0], [1.2, 0.4], [0, 0], [-0.6, -1.5], [3, -3], [0, 0]];
  for (const mode of DOMAIN_MODES) for (let depth = 1; depth <= 9; depth++) {
    const i = depth - 1;
    out.push({ name: 'sweep-' + mode + '-' + depth, preset: null, state: { ...hooks.DEFAULTS, mode, depth, rotation: rot[i], aspect: asp[i], zoom: zoom[i], panx: pan[i][0], pany: pan[i][1], seed: 'tilings-sweep-' + mode + '-' + depth } });
  }
  return out;
}
const pick = s => ({ mode: s.mode, depth: s.depth, zoom: s.zoom, rotation: s.rotation, panx: s.panx, pany: s.pany, aspect: s.aspect, superLevel: s.superLevel, levels: s.levels, arcs: s.arcs, seed: s.seed });
function sameModel(a, b) {
  const words = (x, y) => { if (x.length !== y.length) return false; const u = new Uint8Array(x.buffer, x.byteOffset, x.byteLength), w = new Uint8Array(y.buffer, y.byteOffset, y.byteLength); for (let i = 0; i < u.length; i++) if (u[i] !== w[i]) return false; return true; };
  const ta = a.tiles, tb = b.tiles;
  if (ta.n !== tb.n || ta._used !== tb._used) return false;
  for (const k of ['off', 'nv', 'type', 'cls', 'anc', 'flip']) if (!words(ta[k].subarray(0, ta.n), tb[k].subarray(0, tb.n))) return false;
  if (!words(ta.xy.subarray(0, ta._used), tb.xy.subarray(0, tb._used))) return false;
  if (a.levelSegs.length !== b.levelSegs.length || a.levelSegs.some((s, i) => !words(s, b.levelSegs[i]))) return false;
  return a.hx === b.hx && a.hy === b.hy && a.depth === b.depth && a.levels === b.levels;
}
// The arc decoration forced by the module's own thick-rhomb arcs: thin-rhomb arcs around the obtuse
// corners (B and C of the half-tiles), one in each family. Used as a reference, never as the module's.
const P3_REFERENCE_ARCS = hooks => [{ c: [1, 3], r: [IPHI, IPHI], f: [0, 1] }, hooks.ARCS.p3[1]];

function runFixture(hooks, fx, refs) {
  const s = fx.state, mode = s.mode;
  hooks.lastSub = null; hooks.lastGrid = null;
  const M = hooks.buildModel(s);
  const sub = hooks.lastSub, grid = hooks.lastGrid;
  const replay = sameModel(M, hooks.buildModel(s));
  const polys = G.polygonsOf(M.tiles);
  const view = { x0: -M.hx, x1: M.hx, y0: -M.hy, y1: M.hy };
  const chain = G.chainCheck(polys, { unit: 1, view });
  const row = {
    fixture: fx.name, preset: fx.preset, state: pick(s), depthRendered: M.depth, capped: M.depth !== s.depth, levels: M.levels, hx: M.hx, hy: M.hy, tiles: M.tiles.n,
    replayIdentical: replay,
    chain: strip(chain), minSeparation: chain._snap.minSeparation(0.5),
  };
  delete row.chain.boundaryLoopAreas;
  const shapes = G.shapeCheck(mode, polys);
  row.shapes = shapes;
  let inView = {};
  for (const P of polys) {
    const cx = P.pts.reduce((a, q) => a + q[0], 0) / P.pts.length, cy = P.pts.reduce((a, q) => a + q[1], 0) / P.pts.length;
    if (cx >= view.x0 && cx <= view.x1 && cy >= view.y0 && cy <= view.y1) inView[P.type] = (inView[P.type] || 0) + 1;
  }
  row.typeCountsCentroidInView = inView;
  if (mode !== 'p2') {
    const L = G.liftAndWindow(mode, polys, chain);
    row.lift = strip(L);
    if (mode === 'p3') {
      const cls = v => { const t = L._perp.get(v)[2] + L.indexShift; return t === 1 || t === 4 ? 'small' : 'large'; };
      row.census = censusSummary(G.census(mode, polys, chain), refs.p3);
      row.censusIndexed = censusSummary(G.census(mode, polys, chain, cls), refs.p3Indexed);
    } else if (mode === 'ab') row.census = censusSummary(G.census(mode, polys, chain), refs.ab);
    else row.census = censusSummary(G.census(mode, polys, chain), null);
  } else {
    const c = G.census(mode, polys, chain);
    row.census = censusSummary(c, null);
    row.census.colourViolations = c.colourViolations;
    row.census.forbiddenRhombi = c.forbiddenRhombi;
    // Every class must be one of Conway's seven stars, identified by its (kites, darts) composition.
    const comps = row.census.classes.map(k => k.kites + ',' + k.darts);
    row.census.outsideConway = row.census.classes.filter(k => !refs.conway.includes(k.kites + ',' + k.darts)).map(k => k.key);
    row.census.distinctCompositions = new Set(comps).size;
  }
  if (mode === 'p3' || mode === 'p2') {
    row.arcs = G.arcCheck(polys, chain, hooks.ARCS[mode]);
    if (mode === 'p3') row.arcsReferenceDecoration = G.arcCheck(polys, chain, P3_REFERENCE_ARCS(hooks));
    row.completeness = completeness(hooks, mode, sub, polys, view);
    row.levelSegments = levelSegments(mode, M, chain, view);
  } else {
    row.multigrid = multigridChecks(hooks, grid, polys, view, mode);
  }
  row.ok = judge(row, mode);
  return row;
}
function censusSummary(c, ref) {
  const out = { fullVertices: c.fullVertices, noncontiguous: c.noncontiguous, classes: c.classes.map(k => ({ key: k.key, count: k.count, valence: k.valence, ...(k.kites || k.darts ? { kites: k.kites, darts: k.darts } : {}) })) };
  if (ref) {
    out.outsideReference = c.classes.filter(k => !ref.has(k.key)).map(k => k.key);
    out.referenceClassesSeen = c.classes.filter(k => ref.has(k.key)).length;
    out.referenceClasses = ref.size;
  }
  return out;
}
function completeness(hooks, mode, sub, polys, view) {
  if (sub.levels > 13) return { run: false, levels: sub.levels };
  let tris = hooks.seedWheel(sub.R, sub.cx, sub.cy, -sub.th);
  for (let k = 0; k < sub.levels; k++) tris = hooks.deflate(mode, tris, INF, false);
  // deflate culls parents, so a rendered child can reach one parent size (at most φ² < 3 edges)
  // beyond the cull rectangle; compare against every full tile near that widened rectangle.
  const whole = hooks.glue(mode, tris, () => 0), r = { x0: sub.rect.x0 - 3, x1: sub.rect.x1 + 3, y0: sub.rect.y0 - 3, y1: sub.rect.y1 + 3 };
  const near = [];
  for (let i = 0; i < whole.n; i++) {
    const o = whole.off[i], m = whole.nv[i];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < m; k++) { const x = whole.xy[o + 2 * k], y = whole.xy[o + 2 * k + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x0 > r.x1 || x1 < r.x0 || y0 > r.y1 || y1 < r.y0) continue;
    const pts = []; for (let k = 0; k < m; k++) pts.push([whole.xy[o + 2 * k], whole.xy[o + 2 * k + 1]]);
    near.push({ pts });
  }
  const snap = new G.Snap(1e-7), rendered = new Set(G.tileKeys(polys, snap)), fullKeys = G.tileKeys(near, snap), full = new Set(fullKeys);
  let missingFromRender = 0, visibleFull = 0;
  near.forEach((P, i) => { if (G.clipArea(P.pts, view) > 1e-12) { visibleFull++; if (!rendered.has(fullKeys[i])) missingFromRender++; } });
  let notInFull = 0;
  for (const k of rendered) if (!full.has(k)) notInFull++;
  return { run: true, levels: sub.levels, fullHalfTiles: tris.n, fullTilesNearView: near.length, fullTilesMeetingView: visibleFull, visibleMissingFromRender: missingFromRender, renderedNotInFullDeflation: notInFull };
}
function levelSegments(mode, M, chain, view) {
  if (!M.levelSegs.length) return null;
  const snap = chain._snap, out = [];
  M.levelSegs.forEach((e, idx) => {
    const k = idx + 1, lens = mode === 'p3' ? [Math.pow(PHI, k)] : [Math.pow(PHI, k), Math.pow(PHI, k - 1)];
    let badLength = 0, endpointsInView = 0, endpointsNotVertices = 0;
    for (let i = 0; i < e.length; i += 4) {
      const L = Math.hypot(e[i + 2] - e[i], e[i + 3] - e[i + 1]);
      if (!lens.some(x => Math.abs(L / x - 1) <= CRITERIA.segment)) badLength++;
      for (const [x, y] of [[e[i], e[i + 1]], [e[i + 2], e[i + 3]]]) {
        if (x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1) { endpointsInView++; if (snap.find(x, y) < 0) endpointsNotVertices++; }
      }
    }
    out.push({ level: k, segments: e.length / 4, badLength, endpointsInView, endpointsNotVertices });
  });
  return out;
}
function multigridChecks(hooks, g, polys, view, mode) {
  const ref = G.dualMultigrid(g.n, g.gamma, g.gx, g.gy, g.rad, g.xf, g.rect);
  const snap = new G.Snap(1e-7);
  const mine = G.tileKeys(polys, snap), theirs = G.tileKeys(ref.polys, snap);
  const count = keys => { const m = new Map(); for (const k of keys) m.set(k, (m.get(k) || 0) + 1); return m; };
  const A = count(mine), B = count(theirs);
  let onlyModule = 0, onlyReference = 0, multiplicity = 0;
  for (const [k, n] of A) { if (!B.has(k)) onlyModule += n; else if (B.get(k) !== n) multiplicity++; }
  for (const [k, n] of B) if (!A.has(k)) onlyReference += n;
  // Unculled disk: tiles per pair of line families, from each tile's own edge directions.
  const whole = G.polygonsOf(hooks.multigrid(g.n, g.gamma, g.gx, g.gy, g.rad, g.xf, INF, () => 0));
  const perPair = {};
  let unclassifiedPair = 0;
  for (const P of whole) {
    const dir = (p, q) => { const t = (Math.atan2(q[1] - p[1], q[0] - p[0]) + g.th) / (Math.PI / g.n); const m = Math.round(t); return Math.abs(t - m) < 1e-9 ? ((m % g.n) + g.n) % g.n : -1; };
    const a = dir(P.pts[0], P.pts[1]), b = dir(P.pts[1], P.pts[2]);
    if (a < 0 || b < 0 || a === b) { unclassifiedPair++; continue; }
    const key = Math.min(a, b) + ',' + Math.max(a, b);
    perPair[key] = (perPair[key] || 0) + 1;
  }
  const lattice = G.dualMultigrid(g.n, g.gamma, g.gx, g.gy, g.rad, null, null);
  let pairMismatch = 0, outsideBounds = 0;
  const pairs = [];
  for (const key of Object.keys(lattice.counts)) {
    const [r, s] = key.split(',').map(Number), b = G.pairBounds(g.n, r, s, g.rad), n = perPair[key] || 0, want = lattice.counts[key];
    if (n !== want) pairMismatch++;
    if (n < b.lo || n > b.hi) outsideBounds++;
    pairs.push({ pair: key, tiles: n, latticePoints: want, expected: b.expected, lo: b.lo, hi: b.hi });
  }
  const typeOf = key => { const [r, s] = key.split(',').map(Number), d = Math.min(s - r, g.n - (s - r)); return d; };
  const sum = (f, d) => pairs.filter(p => typeOf(p.pair) === d).reduce((a, p) => a + p[f], 0);
  let freq;
  if (mode === 'ab') {
    const rh = sum('tiles', 1), sq = sum('tiles', 2);
    freq = { rhombs: rh, squares: sq, ratio: rh / sq, theory: Math.SQRT2, rigorousInterval: [sum('lo', 1) / sum('hi', 2), sum('hi', 1) / sum('lo', 2)] };
    freq.theoryInsideInterval = freq.rigorousInterval[0] <= Math.SQRT2 && Math.SQRT2 <= freq.rigorousInterval[1];
  } else {
    const a = sum('tiles', 1), b = sum('tiles', 2), c = sum('tiles', 3), S3 = Math.sqrt(3);
    freq = { r30: a, r60: b, squares: c, ratio60to30: b / a, ratioSquareTo30: c / a, theory60to30: S3, theorySquareTo30: 1,
      rigorous60to30: [sum('lo', 2) / sum('hi', 1), sum('hi', 2) / sum('lo', 1)], rigorousSquareTo30: [sum('lo', 3) / sum('hi', 1), sum('hi', 3) / sum('lo', 1)] };
    freq.theoryInsideInterval = freq.rigorous60to30[0] <= S3 && S3 <= freq.rigorous60to30[1] && freq.rigorousSquareTo30[0] <= 1 && 1 <= freq.rigorousSquareTo30[1];
  }
  return {
    n: g.n, gamma: g.gamma, gridCentre: [g.gx, g.gy], radius: g.rad,
    replay: { moduleTiles: mine.length, referenceTiles: theirs.length, onlyInModule: onlyModule, onlyInReference: onlyReference, multiplicityMismatch: multiplicity, boundaryAmbiguous: ref.boundaryAmbiguous.length },
    disk: { tiles: whole.length, unclassifiedPair, pairMismatch, outsideBounds, pairs, frequency: freq },
  };
}
function judge(r, mode) {
  const c = r.chain, fails = [];
  const need = (ok, what) => { if (!ok) fails.push(what); };
  need(r.replayIdentical, 'replay');
  need(c.maxMergeSpread <= CRITERIA.mergeSpread && r.minSeparation >= CRITERIA.minSeparation, 'vertex identification');
  need(!c.notCCW && !c.notSimple && !c.degenerateEdges && !c.repeatedDirectedSubEdges && !c.tJunctions, 'tiling chain');
  need(c.viewCoveredOnce && c.boundarySubEdgesMeetingView === 0, 'view covered once');
  need(c.viewAreaRelativeError <= CRITERIA.viewArea, 'view area');
  need(!r.shapes.unmatched && !r.shapes.labelMismatch, 'shapes');
  need(!r.census.noncontiguous && (!r.census.outsideReference || !r.census.outsideReference.length), 'census');
  if (r.censusIndexed) need(!r.censusIndexed.outsideReference.length, 'indexed census');
  if (r.lift) {
    need(r.lift.components === 1 && !r.lift.liftInconsistencies && r.lift.maxLiftPositionError < 1e-9, 'lift');
    need(r.lift.windowViolation <= CRITERIA.window, 'window');
    if (mode === 'p3') need(r.lift.indexSpan <= 4, 'index span');
  }
  if (mode === 'p2') need(!r.census.colourViolations && !r.census.forbiddenRhombi, 'vertex colouring');
  if (mode === 'p2') need(!r.census.outsideConway.length && r.census.distinctCompositions === r.census.classes.length, 'conway stars');
  if (mode === 'p2') need(!r.arcs.mismatches && !r.arcs.edgesNotCrossedOncePerTile && !r.arcs.arcsNotCrossingTheirEdge, 'arcs');
  if (mode === 'p3') need(!r.arcsReferenceDecoration.mismatches && !r.arcsReferenceDecoration.edgesNotCrossedOncePerTile, 'reference arcs');
  if (r.completeness && r.completeness.run) need(!r.completeness.visibleMissingFromRender && !r.completeness.renderedNotInFullDeflation, 'completeness');
  if (r.levelSegments) need(r.levelSegments.every(l => !l.badLength && !l.endpointsNotVertices), 'level segments');
  if (r.multigrid) {
    const m = r.multigrid;
    need(!m.replay.onlyInModule && !m.replay.onlyInReference && !m.replay.multiplicityMismatch, 'multigrid replay');
    need(!m.disk.pairMismatch && !m.disk.unclassifiedPair && !m.disk.outsideBounds && m.disk.frequency.theoryInsideInterval, 'multigrid counts');
  }
  return { pass: !fails.length, fails };
}

/* ---------------- references ---------------- */
function references(hooks) {
  const out = {};
  // Penrose P3: de Bruijn pentagrid with sum gamma = 0 (a regular, generic grid).
  const gam = [0.2113, -0.3719, 0.4271, 0.1802]; gam.push(-gam.reduce((a, b) => a + b, 0));
  const pg = G.pentagrid(gam, 30), ch = G.chainCheck(pg, { unit: 1 }), L = G.liftAndWindow('p3', pg, ch);
  const cls = v => { const t = L._perp.get(v)[2] + L.indexShift; return t === 1 || t === 4 ? 'small' : 'large'; };
  const c1 = G.census('p3', pg, ch), c2 = G.census('p3', pg, ch, cls);
  out.p3 = { gamma: gam, radius: 30, tiles: pg.length, chain: pickChain(ch), shapes: G.shapeCheck('p3', pg), lift: strip(L), classes: c1.classes.map(k => ({ key: k.key, count: k.count })), indexedClasses: c2.classes.map(k => ({ key: k.key, count: k.count })), fullVertices: c1.fullVertices };
  // Control: sum gamma != 0 is a generalized (non-Penrose) rhomb tiling.
  const bad = gam.slice(); bad[4] += 0.33;
  const pb = G.pentagrid(bad, 30), cb = G.chainCheck(pb, { unit: 1 }), Lb = G.liftAndWindow('p3', pb, cb), cenb = G.census('p3', pb, cb);
  const refSet = new Set(c1.classes.map(k => k.key));
  out.p3GeneralizedControl = { gamma: bad, gammaSum: bad.reduce((a, b) => a + b, 0), tiles: pb.length, chain: pickChain(cb), indexSpan: Lb.indexSpan, windowViolation: Lb.windowViolation,
    censusClasses: cenb.classes.length, classesOutsideReference: cenb.classes.filter(k => !refSet.has(k.key)).length };
  // Ammann-Beenker: an independent dual 4-grid with a generic offset.
  const gAB = [0.137, 0.581, 0.296, 0.803];
  const ab = G.dualMultigrid(4, gAB, 0, 0, 40, { c: 1, s: 0, tx: 0, ty: 0 }, INF).polys, cha = G.chainCheck(ab, { unit: 1 }), La = G.liftAndWindow('ab', ab, cha), ca = G.census('ab', ab, cha);
  out.ab = { gamma: gAB, radius: 40, tiles: ab.length, chain: pickChain(cha), shapes: G.shapeCheck('ab', ab), lift: strip(La), classes: ca.classes.map(k => ({ key: k.key, count: k.count })), fullVertices: ca.fullVertices };
  // Kite and dart: Conway's seven vertex stars by composition (kites, darts).
  out.p2 = { conway: { sun: [5, 0], star: [0, 5], ace: [2, 1], deuce: [2, 2], jack: [3, 2], queen: [4, 1], king: [2, 3] } };
  return out;
}
function pickChain(ch) { const r = strip(ch); delete r.boundaryLoopAreas; return r; }

/* ---------------- phason flip (failure control) ---------------- */
// Replace the three tiles around an interior valence-3 vertex v by the same tiles translated so they
// meet at v + a + b + c. The result is still a tiling by the same prototiles; only legality can see it.
function phasonFlip(mode, polys, chain) {
  const V = chain._snap.pts, ids = chain._ids, onB = new Set();
  for (const [a, b] of chain._boundary) { onB.add(a); onB.add(b); }
  const at = new Map();
  ids.forEach((list, t) => list.forEach((v, k) => { if (!at.has(v)) at.set(v, []); at.get(v).push([t, k]); }));
  let best = null;
  for (const [v, list] of at) {
    if (list.length !== 3 || onB.has(v)) continue;
    const sum = list.reduce((s, [t, k]) => s + G.interiorAngles(polys[t].pts)[k], 0);
    if (Math.abs(sum - TAU) > 1e-9) continue;
    const d = Math.hypot(V[v][0], V[v][1]);
    if (!best || d < best.d) best = { v, list, d };
  }
  if (!best) return null;
  const vecs = new Map();
  for (const [t, k] of best.list) {
    const p = polys[t].pts, m = p.length;
    for (const q of [p[(k + 1) % m], p[(k + m - 1) % m]]) { const e = [q[0] - V[best.v][0], q[1] - V[best.v][1]]; vecs.set(Math.round(Math.atan2(e[1], e[0]) * 1e6), e); }
  }
  if (vecs.size !== 3) return null;
  const out = polys.slice();
  for (const [t, k] of best.list) {
    const p = polys[t].pts, m = p.length;
    // the edge vector of the hexagon not used by this tile
    const used = new Set([p[(k + 1) % m], p[(k + m - 1) % m]].map(q => Math.round(Math.atan2(q[1] - V[best.v][1], q[0] - V[best.v][0]) * 1e6)));
    const shift = [...vecs.entries()].find(([key]) => !used.has(key))[1];
    out[t] = { ...polys[t], pts: p.map(q => [q[0] + shift[0], q[1] + shift[1]]) };
  }
  return { polys: out, vertex: V[best.v], tiles: best.list.map(([t]) => t) };
}
function legalityOf(mode, polys, view, refs, hooks) {
  const chain = G.chainCheck(polys, { unit: 1, view });
  const r = { tilingValid: !chain.notCCW && !chain.notSimple && !chain.repeatedDirectedSubEdges && !chain.tJunctions && chain.viewCoveredOnce && chain.viewAreaRelativeError <= CRITERIA.viewArea };
  if (mode !== 'p2') { const L = G.liftAndWindow(mode, polys, chain); r.windowViolation = L.windowViolation; r.indexSpan = L.indexSpan; }
  const c = G.census(mode, polys, chain);
  const ref = mode === 'p3' ? refs.p3 : mode === 'ab' ? refs.ab : mode === 'p2' ? refs.p2 : null;
  r.censusOutsideReference = ref ? c.classes.filter(k => !ref.has(k.key)).map(k => k.key) : null;
  if (mode === 'p2') { r.colourViolations = c.colourViolations; r.forbiddenRhombi = c.forbiddenRhombi; }
  if (mode === 'p3') r.referenceArcMismatches = G.arcCheck(polys, chain, P3_REFERENCE_ARCS(hooks)).mismatches;
  if (mode === 'p2') r.arcMismatches = G.arcCheck(polys, chain, hooks.ARCS.p2).mismatches;
  return r;
}

/* ---------------- monotiles (outside the reviewed domain) ---------------- */
function monotile(hooks, fx) {
  const s = fx.state, M = hooks.buildModel(s), polys = G.polygonsOf(M.tiles);
  const proto = (s.mode === 'hat' ? hooks.HAT_OUT : hooks.SPEC_PTS).map(p => [p.x, p.y]);
  const A = G.interiorAngles(proto), Lp = G.edgeLengths(proto);
  const seq = A.map((a, k) => [a * 180 / Math.PI, Lp[k]]);
  const per = pts => G.edgeLengths(pts).reduce((a, b) => a + b, 0);
  const scale = per(polys[0].pts) / Lp.reduce((a, b) => a + b, 0);
  let unmatched = 0, mirrored = 0, forward = 0, labelMismatch = 0;
  for (const P of polys) {
    const r = G.matchPrototile(P.pts, seq, scale, { angTol: 1e-7, lenTol: 1e-9 });
    if (!r) { unmatched++; continue; }
    if (r.mirrored) mirrored++; else forward++;
    if (s.mode === 'hat' && (P.type === 0) !== r.mirrored) labelMismatch++;
    if (!!P.flip !== r.mirrored) labelMismatch++;
  }
  const chain = G.chainCheck(polys, { unit: scale });
  const disk = !chain.notCCW && !chain.notSimple && !chain.repeatedDirectedSubEdges && !chain.boundaryPinchVertices && chain.boundaryLoops === 1 && chain.boundaryLoopAreas[0] > 0;
  return {
    fixture: fx.name, state: pick(s), depthRendered: M.depth, tiles: polys.length, scale, unmatched, forward, mirrored, flagOrLabelMismatch: labelMismatch,
    reflectedFraction: mirrored / polys.length, unreflectedPerReflected: mirrored ? forward / mirrored : null,
    chain: pickChain(chain), singleCoverDisk: disk, areaCheck: disk ? Math.abs(chain.tileAreaSum / chain.boundaryLoopAreas[0] - 1) : null,
  };
}

/* ---------------- failure controls ---------------- */
const MUTATIONS = {
  perturbedSplit: ['          const rx = bx + (cx - bx) * IPHI, ry = by + (cy - by) * IPHI;', '          const rx = bx + (cx - bx) * 0.6, ry = by + (cy - by) * 0.6;'],
  mirroredThinChild: ['          out.add(0, cx, cy, px, py, bx, by, an);', '          out.add(0, cx, cy, bx, by, px, py, an);'],
  mirroredKiteChild: ['          out.add(0, cx, cy, qx, qy, bx, by, an);', '          out.add(0, cx, cy, bx, by, qx, qy, an);'],
  swappedLabel: ['          out.add(1, qx, qy, rx, ry, bx, by, an);', '          out.add(0, qx, qy, rx, ry, bx, by, an);'],
  droppedChild: ['          out.add(0, rx, ry, qx, qy, ax, ay, an);', ''],
  wrongMultigridOffset: ['            const K = Math.ceil(px * e[i][0] + py * e[i][1] - gamma[i]);', '            const K = Math.ceil(px * e[i][0] + py * e[i][1] - gamma[(i + 1) % n]);'],
  swappedKiteArcs: ['{ c: [1, 3], r: [IPHI, IPHI2], f: [0, 1] }', '{ c: [1, 3], r: [IPHI2, IPHI], f: [0, 1] }'],
};
function mutated(name) { const [a, b] = MUTATIONS[name]; return G.loadTilings(src => G.replaceOnce(src, a, b)).hooks; }
function controlFixture(hooks, fx, refs) { try { return runFixture(hooks, fx, refs); } catch (e) { return { error: String(e && e.message), ok: { pass: false, fails: ['threw'] } }; } }
function failureControls(hooks, refs, byName) { // refs: the class sets used by runFixture
  const out = {};
  const wheelRows = (h, mode) => [1, 2, 3, 4].map(k => { const r = wheelStudy(h, mode, k); return { k, ok: r.ok, countsExact: r.countsExact, unclassified: r.unclassified, labelMismatch: r.labelMismatch, areaRelativeError: r.areaRelativeError, tJunctions: r.chain.tJunctions, repeated: r.chain.repeatedDirectedSubEdges, boundaryOffDecagon: r.chain.boundaryOffDecagon, unpaired: r.unpairedHalves, glueOnBoundary: r.halvesWithGlueEdgeOnBoundary }; });
  const fxRow = (h, name) => { const r = controlFixture(h, byName[name], refs); return { fixture: name, pass: r.ok.pass, fails: r.ok.fails, error: r.error || null, window: r.lift ? r.lift.windowViolation : null, tJunctions: r.chain ? r.chain.tJunctions : null, repeated: r.chain ? r.chain.repeatedDirectedSubEdges : null, viewCoveredOnce: r.chain ? r.chain.viewCoveredOnce : null, shapes: r.shapes || null, census: r.census ? r.census.outsideReference : null, replay: r.multigrid ? r.multigrid.replay : null }; };
  const perturbed = mutated('perturbedSplit');
  out.perturbedSplit = { change: 'thick half split at 0.6 instead of 1/φ (tilings.js deflate, P3)', wheel: wheelRows(perturbed, 'p3'), fixture: fxRow(perturbed, 'rhombs@penrose-1974') };
  const thin = mutated('mirroredThinChild');
  out.mirroredThinChild = { change: 'thin child of a thin half emitted with B and C exchanged (P3)', wheel: wheelRows(thin, 'p3'), fixture: fxRow(thin, 'rhombs@penrose-1974') };
  const kite = mutated('mirroredKiteChild');
  out.mirroredKiteChild = { change: 'kite child of a kite half emitted with B and C exchanged (P2)', wheel: wheelRows(kite, 'p2'), fixture: fxRow(kite, 'kitedart@penrose-1974') };
  const label = mutated('swappedLabel');
  out.swappedLabel = { change: 'one thick child of a thick half labelled thin (P3)', wheel: wheelRows(label, 'p3'), fixture: fxRow(label, 'rhombs@penrose-1974') };
  const dropped = mutated('droppedChild');
  out.droppedChild = { change: 'thin child of a thick half omitted (P3)', wheel: wheelRows(dropped, 'p3'), fixture: fxRow(dropped, 'rhombs@penrose-1974') };
  const mg = mutated('wrongMultigridOffset');
  out.wrongMultigridOffset = { change: 'vertex offsets K_i computed with gamma of the next family', ammann: fxRow(mg, 'ammann@penrose-1974'), dodeca: fxRow(mg, 'dodeca@penrose-1974') };
  const arcs = mutated('swappedKiteArcs');
  const kd = controlFixture(arcs, byName['kitedart@penrose-1974'], refs);
  out.swappedKiteArcs = { change: 'kite arc radii exchanged (P2 ARCS)', arcMismatches: kd.arcs.mismatches, positionMismatch: kd.arcs.positionMismatch, pass: kd.ok.pass, fails: kd.ok.fails };
  // Phason flips: the result is still a tiling; the legality predicates must see it.
  out.phasonFlip = {};
  for (const name of ['rhombs@penrose-1974', 'ammann@penrose-1974', 'dodeca@penrose-1974']) {
    const fx = byName[name], M = hooks.buildModel(fx.state), polys = G.polygonsOf(M.tiles), view = { x0: -M.hx, x1: M.hx, y0: -M.hy, y1: M.hy };
    const chain = G.chainCheck(polys, { unit: 1, view }), f = phasonFlip(fx.state.mode, polys, chain);
    out.phasonFlip[name] = f ? { vertex: f.vertex, tiles: f.tiles, before: legalityOf(fx.state.mode, polys, view, refs, hooks), after: legalityOf(fx.state.mode, f.polys, view, refs, hooks) } : { found: false };
  }
  return out;
}

/* ---------------- main ---------------- */
function main() {
  const t0 = Date.now();
  const L = G.loadTilings();
  const hooks = L.hooks;
  const refsRaw = references(hooks);
  const refs = {
    p3: new Set(refsRaw.p3.classes.map(k => k.key)),
    p3Indexed: new Set(refsRaw.p3.indexedClasses.map(k => k.key)),
    ab: new Set(refsRaw.ab.classes.map(k => k.key)),
    p2: null,
    conway: Object.values(refsRaw.p2.conway).map(x => x.join(',')),
  };
  const deflation = {};
  for (const mode of ['p3', 'p2']) deflation[mode] = Array.from({ length: 10 }, (_, i) => wheelStudy(hooks, mode, i + 1));
  const fx = fixtures(hooks), byName = Object.fromEntries(fx.map(f => [f.name, f]));
  const rows = [];
  for (const f of fx) {
    const r = runFixture(hooks, f, refs);
    rows.push(r);
    console.error(r.ok.pass ? 'PASS' : 'FAIL', f.name, 'tiles', r.tiles, r.ok.fails.join(','), r.lift ? 'window ' + r.lift.windowViolation.toExponential(2) : '', r.arcs ? 'arcs ' + r.arcs.mismatches : '', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  const mono = [];
  for (let d = 1; d <= 6; d++) mono.push(monotile(hooks, { name: 'hat-depth-' + d, state: { ...hooks.DEFAULTS, mode: 'hat', depth: d, seed: 'penrose-1974' } }));
  for (let d = 1; d <= 5; d++) mono.push(monotile(hooks, { name: 'spectre-depth-' + d, state: { ...hooks.DEFAULTS, mode: 'spec', depth: d, seed: 'penrose-1974' } }));
  for (const p of ['hat', 'spectre', 'hatline']) mono.push(monotile(hooks, { name: p + '@penrose-1974', state: { ...hooks.DEFAULTS, ...hooks.PRESETS[p].p, seed: 'penrose-1974' } }));
  const controls = failureControls(hooks, refs, byName);

  /* ---- assertions ---- */
  const problems = [];
  const check = (ok, what) => { if (!ok) problems.push(what); };
  for (const mode of ['p3', 'p2']) for (const r of deflation[mode]) check(r.ok, 'deflation ' + mode + ' k=' + r.k);
  // In-domain fixtures: every criterion except the module's own P3 arc decoration, which is a recorded miss.
  for (const r of rows) check(r.ok.pass, 'fixture ' + r.fixture + ': ' + r.ok.fails.join(','));
  check(refsRaw.p3.lift.windowViolation <= CRITERIA.window && refsRaw.p3.chain.tJunctions === 0 && !refsRaw.p3.chain.repeatedDirectedSubEdges, 'pentagrid reference');
  check(refsRaw.ab.lift.windowViolation <= CRITERIA.window && refsRaw.ab.chain.tJunctions === 0 && !refsRaw.ab.chain.repeatedDirectedSubEdges, 'AB reference');
  check(refsRaw.p3GeneralizedControl.indexSpan > 4 && refsRaw.p3GeneralizedControl.classesOutsideReference > 0, 'generalized pentagrid control');
  // Failure controls must be caught.
  const wheelCaught = rows => rows.some(r => !r.ok);
  check(wheelCaught(controls.perturbedSplit.wheel) && !controls.perturbedSplit.fixture.pass, 'control perturbedSplit');
  check(wheelCaught(controls.mirroredThinChild.wheel) && !controls.mirroredThinChild.fixture.pass, 'control mirroredThinChild');
  check(wheelCaught(controls.mirroredKiteChild.wheel) && !controls.mirroredKiteChild.fixture.pass, 'control mirroredKiteChild');
  check(wheelCaught(controls.swappedLabel.wheel) && !controls.swappedLabel.fixture.pass, 'control swappedLabel');
  check(wheelCaught(controls.droppedChild.wheel) && !controls.droppedChild.fixture.pass, 'control droppedChild');
  check(!controls.wrongMultigridOffset.ammann.pass && !controls.wrongMultigridOffset.dodeca.pass, 'control wrongMultigridOffset');
  check(controls.swappedKiteArcs.arcMismatches > 0 && !controls.swappedKiteArcs.pass, 'control swappedKiteArcs');
  const pf = controls.phasonFlip;
  check(pf['rhombs@penrose-1974'].after && pf['rhombs@penrose-1974'].after.tilingValid && pf['rhombs@penrose-1974'].after.windowViolation > CRITERIA.window &&
    pf['rhombs@penrose-1974'].after.referenceArcMismatches > 0 && pf['rhombs@penrose-1974'].before.windowViolation <= CRITERIA.window, 'control P3 phason flip');
  check(pf['ammann@penrose-1974'].after && pf['ammann@penrose-1974'].after.tilingValid && pf['ammann@penrose-1974'].after.windowViolation > CRITERIA.window, 'control AB phason flip');

  // The module's own P3 arc decoration: recorded, not gating (see findings).
  const p3rows = rows.filter(r => r.state.mode === 'p3');
  const findings = {
    p3ArcDecoration: {
      location: 'src/modules/tilings.js:31 (ARCS.p3 thin rhomb: { c: [0, 2], r: [IPHI2, IPHI2], f: [0, 0] })',
      fixtures: p3rows.length,
      fixturesWithFamilyMismatch: p3rows.filter(r => r.arcs.familyMismatch > 0).length,
      sharedEdgesChecked: p3rows.reduce((a, r) => a + r.arcs.sharedEdgesChecked, 0),
      familyMismatches: p3rows.reduce((a, r) => a + r.arcs.familyMismatch, 0),
      positionMismatches: p3rows.reduce((a, r) => a + r.arcs.positionMismatch, 0),
      defaultFixture: (() => { const r = rows.find(x => x.fixture === 'arcs@penrose-1974'); return { fixture: r.fixture, sharedEdges: r.arcs.sharedEdgesChecked, familyMismatch: r.arcs.familyMismatch, positionMismatch: r.arcs.positionMismatch }; })(),
      referenceDecoration: 'thin-rhomb arcs around the obtuse corners (B, C of the half-tiles), radius 1/φ, one per family, with the module\'s thick-rhomb arcs unchanged',
      referenceDecorationMismatches: p3rows.reduce((a, r) => a + r.arcsReferenceDecoration.mismatches, 0),
    },
  };

  const pass = problems.length === 0;
  const result = {
    pass,
    source: 'src/modules/tilings.js',
    sourceSha256: L.sourceSha256,
    engineMakeRngSha256: L.makeRngSha256,
    harnessSha256: sha(fs.readFileSync(__filename)),
    geometrySha256: sha(fs.readFileSync(path.join(__dirname, 'tilings-geometry.js'))),
    command: 'node tools/tilings-science.js --write',
    scope: 'The actual tilings.js deflation (seedWheel, deflate, glue), multigrid and buildModel code, loaded from disk with read-only hooks and the engine makeRng, for Penrose P3 and P2, Ammann-Beenker and dodecagonal modes: ' +
      'the sun wheel deflated 1 to 10 times without culling; ' + rows.length + ' rendered recipes (the eight P3/P2/AB/dodecagonal presets at four seeds, and a nine-depth sweep per mode over zoom 0.3 to 4, rotation, pan and all five aspects); ' +
      'independent references (a de Bruijn pentagrid with sum gamma = 0, a dual 4-grid, Conway\'s seven kite-dart stars); deliberate failure controls. Hat and spectre supertiles are measured and reported outside the domain.',
    criteria: CRITERIA,
    criteriaText: 'Deflation: half-tile counts, classified by their own side lengths, equal 10F(2k-1) thin and 10F(2k) thick (P3) and 10F(2k+1) kite and 10F(2k) dart halves (P2) exactly; zero label/geometry mismatches; |area/decagon - 1| <= 1e-12; zero T-junctions and repeated directed sub-edges, every boundary sub-edge on the decagon, winding 1; unpaired halves exactly those with a glue edge on the decagon. ' +
      'Rendered recipes: bitwise replay; vertex identification spread <= 1e-9 with distinct vertices >= 0.2 apart; every tile simple and counter-clockwise, no repeated directed sub-edge, zero T-junctions, no boundary sub-edge meeting the view and winding 1 about its centre (the view covered exactly once); |sum area(tile ∩ view)/view - 1| <= 1e-9; every tile congruent to its labelled prototile (angles and lengths within 1e-9). ' +
      'P3: relative Z^5 lift consistent, index span <= 4, and a window shift leaving no vertex more than 1e-9 outside its de Bruijn pentagon; geometric and index-class vertex census inside the pentagrid reference; a continuous two-family arc decoration exists (reference decoration, zero mismatches); every tile of the unculled deflation meeting the view rendered and every rendered tile in it; inflation-level segments of length φ^k with in-view endpoints on tile vertices. ' +
      'P2: census inside Conway\'s seven compositions; two-colour vertex rule with zero violations and no kite-dart rhombus; the module\'s arcs continuous on every shared edge; completeness and level segments as P3. ' +
      'AB: Z^4 lift inside the octagon window (<= 1e-9), census inside the dual-4-grid reference; dodecagonal: Z^6 lift inside the dodecagonal zonogon (a necessary condition). Both: tile set identical to an independent dual-multigrid construction from the same offsets, tiles per line-family pair in the unculled disk equal to independent lattice-point counts and inside rigorous lattice bounds, whose ratio interval contains sqrt 2 (AB) or sqrt 3 and 1 (dodecagonal). ' +
      'Failure controls: a perturbed split, mirrored P3 and P2 children, a swapped label, a dropped child, a wrong multigrid offset, swapped kite arcs and phason flips must each be rejected.',
    benchmark: 'Exact Fibonacci recurrences for Robinson-triangle substitution; decagon area; the 1-chain/winding identity for single coverage; de Bruijn\'s cut-and-project theorem (windows from the unit-cube slices) and an independent pentagrid; Conway\'s seven kite-dart vertex stars; de Bruijn duality (one tile per grid intersection) with lattice-point bounds.',
    environment: { node: process.version, platform: process.platform },
    references: refsRaw,
    deflation,
    fixtures: rows,
    monotiles: { inDomain: false, note: 'Measured only: congruence to the module prototile, single cover of the supertile, reflected/chirality counts. No legality, substitution or frequency reference was established.', rows: mono },
    failureControls: controls,
    findings,
    limitations: [
      'Finite enumerated recipes: the eight Penrose, Ammann-Beenker and dodecagonal presets at four seeds and a nine-depth sweep per mode. Other seeds, pans and zooms are untested, although the predicates do not depend on them.',
      'The Penrose patches are crops of the sun-centred tiling (one local-isomorphism class point of the hull), not arbitrary Penrose tilings; legality is shown by the window, census and arcs within each finite patch, not for the infinite tiling.',
      'The module\'s own P3 arc decoration fails the arc criterion (findings.p3ArcDecoration); P3 matching-rule legality rests on the window, the census and a reference decoration, not on the drawn arcs.',
      'Completeness against the unculled deflation was not run for the two sweep recipes that need 14 deflation levels; their coverage, shapes and legality were checked.',
      'The dodecagonal window test is only a necessary condition: a single phason flip passes it (failureControls.phasonFlip). The dodecagonal claim is de Bruijn duality, established by the exact replay, the tiling check and the lattice counts; no local matching rule is claimed.',
      'Frequency bounds are rigorous but loose; the sharp statements are the exact Fibonacci and lattice-point counts.',
      'Hat and spectre are outside the domain: only congruence, single cover of a supertile and reflection counts are measured, against no published reference.',
      'JavaScript binary64 in Node; the browser rounds one sun-wheel sine differently (tools/tilings-print-state.js records it).',
    ],
    problems,
    seconds: (Date.now() - t0) / 1000,
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/tilings-science.json'), JSON.stringify(result, null, 1) + '\n');
  console.log(JSON.stringify({ pass, problems, fixtures: rows.length, failing: rows.filter(r => !r.ok.pass).map(r => r.fixture), findings, seconds: result.seconds }, null, 1));
  if (!pass) process.exitCode = 1;
}
module.exports = { wheelStudy, fixtures, runFixture, references, CRITERIA };
if (require.main === module) main();
