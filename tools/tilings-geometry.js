'use strict';
// Independent exact-geometry predicates for the tilings review. Nothing here calls the module's own
// geometry: tiles arrive as polygons and are judged by lengths, angles, edge incidences, a 1-chain,
// a lift to the integer lattice and a cut-and-project window. Used by tools/tilings-science.js and
// tools/tilings-print-state.js.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const PHI = (1 + Math.sqrt(5)) / 2, TAU = 2 * Math.PI;

/* ---------------- loading the actual module with read-only hooks ---------------- */
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Expected one hook: ' + before);
  return source.replace(before, after);
}
// The engine's own makeRng is extracted from src/shared/engine.js so the seeded crop and multigrid
// offsets are the ones the studio draws. `mutate` edits the module text for failure controls only.
function loadTilings(mutate = s => s) {
  const original = fs.readFileSync(path.join(root, 'src/modules/tilings.js'), 'utf8');
  const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
  const m = /\n  function makeRng\(seedStr\) \{[\s\S]*?\n  \}\n/.exec(engine);
  if (!m) throw Error('engine makeRng not found');
  const makeRng = new Function('TAU', m[0] + '\nreturn makeRng;')(TAU);
  const hooks = {};
  let src = mutate(original);
  src = replaceOnce(src, '  Studio.register({', '  Object.assign(hooks, { MODES, ARCS, PHI, IPHI, IPHI2, ASPECTS, seedWheel, deflate, glue, edgesOf, tileEdges, multigrid, buildModel, buildMono, fitDepth, spanOf, hatInit, hatPatch, hatPromote, spectreBase, spectrePromote, walkLeaves, HAT_OUT, SPEC_PTS, PRESETS, DEFAULTS });\n  Studio.register({');
  src = replaceOnce(src, '      tiles = multigrid(n, gamma, gx, gy, rad, xf, rect, dirOf);', '      tiles = multigrid(n, gamma, gx, gy, rad, xf, rect, dirOf);\n      hooks.lastGrid = { n, gamma: gamma.slice(), gx, gy, rad, xf: { ...xf }, rect: { ...rect }, th };');
  src = replaceOnce(src, '      let tris = seedWheel(Math.pow(PHI, levels), cx, cy, -th);', '      let tris = seedWheel(Math.pow(PHI, levels), cx, cy, -th);\n      hooks.lastSub = { levels, R: Math.pow(PHI, levels), cx, cy, th, rect: { ...rect } };');
  let registered = null;
  const Studio = {
    util: { makeRng, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    PALETTES: new Proxy({}, { get: (_, k) => ({ name: String(k), colors: ['#000000'], bg: '#ffffff' }) }),
    register: mod => { registered = mod; },
  };
  new Function('Studio', 'hooks', src)(Studio, hooks);
  return {
    hooks, module: registered,
    sourceSha256: crypto.createHash('sha256').update(original).digest('hex'),
    makeRngSha256: crypto.createHash('sha256').update(m[0]).digest('hex'),
  };
}

/* ---------------- polygons ---------------- */
function polygonsOf(tiles) {
  const out = new Array(tiles.n);
  for (let i = 0; i < tiles.n; i++) {
    const o = tiles.off[i], m = tiles.nv[i], pts = new Array(m);
    for (let k = 0; k < m; k++) pts[k] = [tiles.xy[o + 2 * k], tiles.xy[o + 2 * k + 1]];
    out[i] = { type: tiles.type[i], flip: tiles.flip[i], pts };
  }
  return out;
}
function signedArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return a / 2;
}
// Interior angle at each vertex of a counter-clockwise polygon, in (0, 2π).
function interiorAngles(p) {
  const m = p.length, out = new Array(m);
  for (let k = 0; k < m; k++) {
    const a = p[(k + m - 1) % m], b = p[k], c = p[(k + 1) % m];
    const wx = c[0] - b[0], wy = c[1] - b[1], ux = a[0] - b[0], uy = a[1] - b[1];
    let t = Math.atan2(wx * uy - wy * ux, wx * ux + wy * uy);
    if (t <= 0) t += TAU;
    out[k] = t;
  }
  return out;
}
function edgeLengths(p) { return p.map((a, k) => { const b = p[(k + 1) % p.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]); }); }
function segCross(a, b, c, d) { // closed segments ab and cd intersect?
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const on = (p, q, r) => Math.min(p[0], q[0]) - 1e-12 <= r[0] && r[0] <= Math.max(p[0], q[0]) + 1e-12 && Math.min(p[1], q[1]) - 1e-12 <= r[1] && r[1] <= Math.max(p[1], q[1]) + 1e-12;
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (d1 === 0 && on(c, d, a)) || (d2 === 0 && on(c, d, b)) || (d3 === 0 && on(a, b, c)) || (d4 === 0 && on(a, b, d));
}
function isSimple(p) {
  const m = p.length;
  for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) {
    if (j === i + 1 || (i === 0 && j === m - 1)) continue;
    if (segCross(p[i], p[(i + 1) % m], p[j], p[(j + 1) % m])) return false;
  }
  return true;
}
// Sutherland-Hodgman against an axis-aligned rectangle. For a non-convex subject the result may
// carry zero-area slivers along the clip edges, which leave its signed area exact.
function clipArea(p, r) {
  let poly = p;
  const planes = [[1, 0, -r.x0], [-1, 0, r.x1], [0, 1, -r.y0], [0, -1, r.y1]]; // a x + b y + c >= 0 inside
  for (const [a, b, c] of planes) {
    if (!poly.length) break;
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], Q = poly[(i + 1) % poly.length];
      const fp = a * P[0] + b * P[1] + c, fq = a * Q[0] + b * Q[1] + c;
      if (fp >= 0) out.push(P);
      if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
    }
    poly = out;
  }
  return poly.length >= 3 ? signedArea(poly) : 0;
}
function segmentMeetsRect(a, b, r) { // Liang-Barsky on the closed rectangle
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - r.x0], [dx, r.x1 - a[0]], [-dy, a[1] - r.y0], [dy, r.y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

/* ---------------- vertex identification ---------------- */
// Points within `tol` of an existing vertex are the same vertex. The largest merged spread and the
// smallest distance between distinct vertices are both reported, so the identification is checkable.
class Snap {
  constructor(tol) { this.tol = tol; this.cell = tol * 1000; this.grid = new Map(); this.pts = []; this.maxSpread = 0; }
  id(x, y) {
    const c = this.cell, ix = Math.floor(x / c), iy = Math.floor(y / c);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const list = this.grid.get((ix + dx) + ',' + (iy + dy));
      if (!list) continue;
      for (const id of list) {
        const p = this.pts[id], d = Math.hypot(p[0] - x, p[1] - y);
        if (d <= this.tol) { if (d > this.maxSpread) this.maxSpread = d; return id; }
      }
    }
    const id = this.pts.length;
    this.pts.push([x, y]);
    const k = ix + ',' + iy;
    const list = this.grid.get(k);
    if (list) list.push(id); else this.grid.set(k, [id]);
    return id;
  }
  find(x, y) { // lookup only
    const c = this.cell, ix = Math.floor(x / c), iy = Math.floor(y / c);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const list = this.grid.get((ix + dx) + ',' + (iy + dy));
      if (list) for (const id of list) { const p = this.pts[id]; if (Math.hypot(p[0] - x, p[1] - y) <= this.tol) return id; }
    }
    return -1;
  }
  // Smallest distance between distinct vertices, searched below `range` (returns range if none closer).
  minSeparation(range) {
    const g = new Map(), key = (i, j) => i + ',' + j;
    this.pts.forEach((p, id) => { const k = key(Math.floor(p[0] / range), Math.floor(p[1] / range)); if (!g.has(k)) g.set(k, []); g.get(k).push(id); });
    let best = range;
    this.pts.forEach((p, id) => {
      const ix = Math.floor(p[0] / range), iy = Math.floor(p[1] / range);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const list = g.get(key(ix + dx, iy + dy));
        if (list) for (const o of list) if (o > id) { const q = this.pts[o]; const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best) best = d; }
      }
    });
    return best;
  }
}

/* ---------------- the 1-chain check ---------------- */
// Every tile must be simple and counter-clockwise. Its boundary is split at any vertex lying on an
// edge (a T-junction) and the directed sub-edges are summed. Interior sub-edges must cancel in pairs;
// no directed sub-edge may appear twice. Then the number of tiles covering a point equals the winding
// number of the uncancelled boundary chain, so a view that the chain avoids and winds once is covered
// exactly once. `view` is optional; `unit` is the prototile edge scale.
function chainCheck(polys, { unit = 1, view = null, snap = null } = {}) {
  const tol = 1e-7 * unit;
  snap = snap || new Snap(tol);
  const ids = polys.map(P => P.pts.map(q => snap.id(q[0], q[1])));
  let notCCW = 0, notSimple = 0, maxEdge = 0;
  polys.forEach(P => {
    if (!(signedArea(P.pts) > 0)) notCCW++;
    if (!isSimple(P.pts)) notSimple++;
    for (const L of edgeLengths(P.pts)) if (L > maxEdge) maxEdge = L;
  });
  const V = snap.pts, NV = V.length, cell = Math.max(maxEdge, unit), grid = new Map();
  V.forEach((p, id) => { const k = Math.floor(p[0] / cell) + ',' + Math.floor(p[1] / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(id); });
  const directed = new Map();
  let tJunctions = 0, degenerateEdges = 0;
  const split = (a, b) => {
    const A = V[a], B = V[b], dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy;
    if (!(L2 > tol * tol)) { degenerateEdges++; return [a, b]; }
    const on = [];
    const x0 = Math.floor((Math.min(A[0], B[0]) - tol) / cell), x1 = Math.floor((Math.max(A[0], B[0]) + tol) / cell);
    const y0 = Math.floor((Math.min(A[1], B[1]) - tol) / cell), y1 = Math.floor((Math.max(A[1], B[1]) + tol) / cell);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
      const list = grid.get(i + ',' + j);
      if (!list) continue;
      for (const c of list) {
        if (c === a || c === b) continue;
        const C = V[c], t = ((C[0] - A[0]) * dx + (C[1] - A[1]) * dy) / L2;
        if (t <= 1e-9 || t >= 1 - 1e-9) continue;
        if (Math.abs((C[0] - A[0]) * dy - (C[1] - A[1]) * dx) / Math.sqrt(L2) < tol) on.push([t, c]);
      }
    }
    if (!on.length) return [a, b];
    tJunctions += on.length;
    on.sort((u, w) => u[0] - w[0]);
    return [a, ...on.map(u => u[1]), b];
  };
  ids.forEach(list => {
    for (let k = 0; k < list.length; k++) {
      const chain = split(list[k], list[(k + 1) % list.length]);
      for (let s = 0; s + 1 < chain.length; s++) { const key = chain[s] * NV + chain[s + 1]; directed.set(key, (directed.get(key) || 0) + 1); }
    }
  });
  let repeated = 0, interior = 0;
  const boundary = [];
  for (const [key, n] of directed) {
    if (n > 1) repeated += n - 1;
    const a = Math.floor(key / NV), b = key - a * NV;
    if (directed.has(b * NV + a)) interior++; else boundary.push([a, b]);
  }
  const out = {
    tiles: polys.length, vertices: NV, notCCW, notSimple, degenerateEdges, tJunctions, repeatedDirectedSubEdges: repeated,
    interiorSubEdges: interior / 2, boundarySubEdges: boundary.length, maxMergeSpread: snap.maxSpread,
  };
  // Boundary vertex degrees: a single simple loop has in = out = 1 everywhere.
  const inDeg = new Map(), outDeg = new Map();
  for (const [a, b] of boundary) { outDeg.set(a, (outDeg.get(a) || 0) + 1); inDeg.set(b, (inDeg.get(b) || 0) + 1); }
  let unbalanced = 0, pinched = 0;
  for (const v of new Set([...inDeg.keys(), ...outDeg.keys()])) {
    if ((inDeg.get(v) || 0) !== (outDeg.get(v) || 0)) unbalanced++;
    if ((outDeg.get(v) || 0) > 1) pinched++;
  }
  out.boundaryUnbalancedVertices = unbalanced;
  out.boundaryPinchVertices = pinched;
  if (!pinched) { // count loops
    const next = new Map(boundary.map(([a, b]) => [a, b]));
    const seen = new Set(); let loops = 0; const loopAreas = [];
    for (const [a] of boundary) {
      if (seen.has(a)) continue;
      loops++; let v = a, area = 0, guard = 0;
      while (!seen.has(v) && guard++ <= boundary.length) { seen.add(v); const w = next.get(v); if (w === undefined) break; area += V[v][0] * V[w][1] - V[w][0] * V[v][1]; v = w; }
      loopAreas.push(area / 2);
    }
    out.boundaryLoops = loops;
    out.boundaryLoopAreas = loopAreas;
  }
  out.tileAreaSum = polys.reduce((s, P) => s + signedArea(P.pts), 0);
  if (view) {
    let touches = 0, wind = 0;
    for (const [a, b] of boundary) {
      if (segmentMeetsRect(V[a], V[b], view)) touches++;
      const ax = V[a][0], ay = V[a][1], bx = V[b][0], by = V[b][1];
      wind += Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    }
    out.boundarySubEdgesMeetingView = touches;
    out.windingAboutViewCentre = wind / TAU;
    out.viewCoveredOnce = !notCCW && !notSimple && !repeated && !touches && Math.abs(wind / TAU - 1) < 1e-6;
    let covered = 0;
    for (const P of polys) covered += clipArea(P.pts, view);
    const A = (view.x1 - view.x0) * (view.y1 - view.y0);
    out.viewArea = A;
    out.tileAreaInView = covered;
    out.viewAreaRelativeError = Math.abs(covered / A - 1);
  }
  out._boundary = boundary;
  out._ids = ids;
  out._snap = snap;
  return out;
}

/* ---------------- prototiles ---------------- */
const D = Math.PI / 180, IPHI = 1 / PHI;
// Each prototile: counter-clockwise cyclic list of [interior angle at vertex k, length of edge k -> k+1].
const PROTOTILES = {
  p3: [{ name: 'thin', type: 0, seq: [[36, 1], [144, 1], [36, 1], [144, 1]] }, { name: 'thick', type: 1, seq: [[72, 1], [108, 1], [72, 1], [108, 1]] }],
  // Kite: tip 72 between the two long edges, sides 72, tail 144 between the two short edges.
  // Dart: tip 72 between the two long edges, sides 36, reflex 216 between the two short edges.
  p2: [{ name: 'kite', type: 0, seq: [[72, 1], [72, IPHI], [144, IPHI], [72, 1]] }, { name: 'dart', type: 1, seq: [[72, 1], [36, IPHI], [216, IPHI], [36, 1]] }],
  ab: [{ name: 'rhomb', type: 0, seq: [[45, 1], [135, 1], [45, 1], [135, 1]] }, { name: 'square', type: 1, seq: [[90, 1], [90, 1], [90, 1], [90, 1]] }],
  d12: [{ name: '30-degree rhomb', type: 0, seq: [[30, 1], [150, 1], [30, 1], [150, 1]] }, { name: '60-degree rhomb', type: 1, seq: [[60, 1], [120, 1], [60, 1], [120, 1]] }, { name: 'square', type: 2, seq: [[90, 1], [90, 1], [90, 1], [90, 1]] }],
};
// Match a polygon against a prototile cyclic sequence, forwards (same handedness) or mirrored.
function matchPrototile(pts, seq, scale, { mirror = true, angTol = 1e-9, lenTol = 1e-9 } = {}) {
  const m = pts.length;
  if (m !== seq.length) return null;
  const A = interiorAngles(pts), L = edgeLengths(pts);
  const fits = (angle, len, want) => Math.abs(angle - want[0] * D) <= angTol && Math.abs(len - want[1] * scale) <= lenTol * scale;
  for (let s = 0; s < m; s++) {
    let ok = true;
    for (let k = 0; k < m && ok; k++) ok = fits(A[(s + k) % m], L[(s + k) % m], seq[k]);
    if (ok) return { offset: s, mirrored: false };
  }
  if (mirror) { // a mirror image read counter-clockwise: angle k pairs with the edge before it
    for (let s = 0; s < m; s++) {
      let ok = true;
      for (let k = 0; k < m && ok; k++) {
        const v = (s - k + m) % m;
        ok = fits(A[v], L[(v - 1 + m) % m], seq[k]);
      }
      if (ok) return { offset: s, mirrored: true };
    }
  }
  return null;
}
function shapeCheck(mode, polys, scale = 1) {
  const protos = PROTOTILES[mode];
  const counts = {}, out = { unmatched: 0, labelMismatch: 0, counts, mirrored: 0 };
  for (const P of polys) {
    let hit = null;
    for (const pr of protos) { const r = matchPrototile(P.pts, pr.seq, scale); if (r) { hit = { pr, r }; break; } }
    if (!hit) { out.unmatched++; continue; }
    counts[hit.pr.name] = (counts[hit.pr.name] || 0) + 1;
    if (hit.pr.type !== P.type) out.labelMismatch++;
  }
  return out;
}

/* ---------------- vertex census ---------------- */
// Corner codes are read from the geometry: angle and, for kites and darts, which edges meet there.
function cornerCode(mode, P, k, A, L) {
  const deg = Math.round(A[k] / D), m = P.pts.length;
  if (mode === 'p3') return (deg === 36 || deg === 144 ? 'thin' : 'thick') + deg;
  if (mode === 'ab') return (deg === 90 ? 'sq' : 'rh') + deg;
  if (mode === 'd12') return (deg === 90 ? 'sq' : deg === 30 || deg === 150 ? 'r30-' : 'r60-') + deg;
  if (mode === 'p2') {
    const next = L[k], prev = L[(k + m - 1) % m], long = x => x > 0.8; // edges k->k+1 and k-1->k
    const kite = P.shape === 'kite';
    if (deg === 144) return 'Kb';
    if (deg === 216) return 'Dr';
    if (deg === 36) return long(next) ? 'Ds>' : 'Ds<';
    if (long(next) && long(prev)) return kite ? 'Kt' : 'Dt';
    return long(next) ? 'Ks>' : 'Ks<';
  }
  return String(deg);
}
function canonicalCycle(seq) {
  const flip = s => s.replace(/[<>]/g, c => (c === '<' ? '>' : '<'));
  const rev = seq.slice().reverse().map(flip);
  let best = null;
  for (const s of [seq, rev]) for (let r = 0; r < s.length; r++) {
    const k = s.slice(r).concat(s.slice(0, r)).join(' ');
    if (best === null || k < best) best = k;
  }
  return best;
}
// Full (interior) vertices only: corners summing to 2π, not on the boundary chain, contiguous.
// `label` optionally decorates a vertex key (the P3 index class from the lift).
function census(mode, polys, chain, label = null) {
  const V = chain._snap.pts, ids = chain._ids;
  const onBoundary = new Set();
  for (const [a, b] of chain._boundary) { onBoundary.add(a); onBoundary.add(b); }
  if (mode === 'p2') for (const P of polys) P.shape = P.shape || (matchPrototile(P.pts, PROTOTILES.p2[0].seq, 1) ? 'kite' : 'dart');
  const at = new Map();
  polys.forEach((P, t) => {
    const A = interiorAngles(P.pts), L = edgeLengths(P.pts);
    ids[t].forEach((v, k) => {
      const nx = P.pts[(k + 1) % P.pts.length], start = Math.atan2(nx[1] - P.pts[k][1], nx[0] - P.pts[k][0]);
      if (!at.has(v)) at.set(v, []);
      at.get(v).push({ start, angle: A[k], code: cornerCode(mode, P, k, A, L), kind: P.shape || P.type });
    });
  });
  const classes = new Map();
  let full = 0, gaps = 0, colourViolations = 0, forbiddenRhombi = 0;
  const X = new Set(['Ks>', 'Ks<', 'Dt', 'Dr']);
  for (const [v, list] of at) {
    if (mode === 'p2') { // two-colour vertex rule: every corner at a vertex in one class
      const cls = new Set(list.map(c => X.has(c.code)));
      if (cls.size > 1) colourViolations++;
      if (list.some(c => c.code === 'Kb') && list.some(c => c.code === 'Dr')) forbiddenRhombi++;
    }
    const sum = list.reduce((s, c) => s + c.angle, 0);
    if (onBoundary.has(v) || Math.abs(sum - TAU) > 1e-9) continue;
    list.sort((a, b) => a.start - b.start);
    let contiguous = true;
    for (let i = 0; i < list.length; i++) {
      const c = list[i], d = list[(i + 1) % list.length];
      let gap = d.start - (c.start + c.angle);
      gap = ((gap % TAU) + TAU + Math.PI) % TAU - Math.PI;
      if (Math.abs(gap) > 1e-9) contiguous = false;
    }
    if (!contiguous) { gaps++; continue; }
    full++;
    const key = canonicalCycle(list.map(c => c.code)) + (label ? ' @' + label(v) : '');
    const rec = classes.get(key) || { key, count: 0, kites: 0, darts: 0, valence: list.length };
    rec.count++;
    if (mode === 'p2') { rec.kites = list.filter(c => c.code[0] === 'K').length; rec.darts = list.filter(c => c.code[0] === 'D').length; }
    classes.set(key, rec);
  }
  const out = { fullVertices: full, noncontiguous: gaps, classes: [...classes.values()].sort((a, b) => (a.key < b.key ? -1 : 1)) };
  if (mode === 'p2') { out.colourViolations = colourViolations; out.forbiddenRhombi = forbiddenRhombi; }
  return out;
}

/* ---------------- matching arcs ---------------- */
// Each arc crosses the two edges at its corner at distance r. On every edge shared by two tiles the two
// crossings must coincide and belong to the same arc family.
function arcCheck(polys, chain, spec) {
  const V = chain._snap.pts, ids = chain._ids, NV = V.length;
  const byEdge = new Map();
  let crossings = 0;
  polys.forEach((P, t) => {
    const sp = spec[P.type], fl = P.flip, p = P.pts, m = p.length;
    for (let a = 0; a < 2; a++) {
      const idx = sp.c[a], r = sp.r[fl ? 1 - a : a], fam = sp.f[fl ? 1 - a : a];
      for (const other of [(idx + 1) % m, (idx + m - 1) % m]) {
        const dx = p[other][0] - p[idx][0], dy = p[other][1] - p[idx][1], L = Math.hypot(dx, dy);
        const pt = [p[idx][0] + r * dx / L, p[idx][1] + r * dy / L];
        const u = ids[t][idx], w = ids[t][other], key = Math.min(u, w) * NV + Math.max(u, w);
        if (!byEdge.has(key)) byEdge.set(key, []);
        byEdge.get(key).push({ t, pt, fam, inside: r < L });
        crossings++;
      }
    }
  });
  let shared = 0, mismatches = 0, positionMismatch = 0, familyMismatch = 0, notOnce = 0, maxGap = 0, outside = 0;
  for (const list of byEdge.values()) {
    if (list.some(c => !c.inside)) outside++;
    const tiles = new Set(list.map(c => c.t));
    if (tiles.size !== list.length) { notOnce++; continue; }
    if (tiles.size < 2) continue;
    if (tiles.size > 2) { notOnce++; continue; }
    shared++;
    const [c1, c2] = list, gap = Math.hypot(c1.pt[0] - c2.pt[0], c1.pt[1] - c2.pt[1]);
    if (gap > maxGap) maxGap = gap;
    const pm = gap > 1e-9, fm = c1.fam !== c2.fam;
    if (pm) positionMismatch++;
    if (fm) familyMismatch++;
    if (pm || fm) mismatches++;
  }
  return { crossings, sharedEdgesChecked: shared, mismatches, positionMismatch, familyMismatch, edgesNotCrossedOncePerTile: notOnce, arcsNotCrossingTheirEdge: outside, maxSharedGap: maxGap };
}

/* ---------------- lift to Z^n and the cut-and-project window ---------------- */
// Physical edge directions are omega * zeta^j; the internal map sends zeta^j to zeta^(g j) (the Galois
// conjugate). P3: zeta = exp(2 pi i / 5), g = 2, with -e_j as the other five directions.
// AB: zeta = exp(i pi / 4), g = 3. Dodecagonal: zeta = exp(i pi / 6), g = 5.
const LATTICES = {
  p3: { n: 5, step: 2 * Math.PI / 5, galois: 2, dirs: 10 },
  ab: { n: 4, step: Math.PI / 4, galois: 3, dirs: 8 },
  d12: { n: 6, step: Math.PI / 6, galois: 5, dirs: 12 },
};
function basis(mode, alpha0) {
  const L = LATTICES[mode], E = [], Ep = [];
  for (let j = 0; j < L.n; j++) {
    E.push([Math.cos(alpha0 + j * L.step), Math.sin(alpha0 + j * L.step)]);
    Ep.push([Math.cos(L.galois * j * L.step), Math.sin(L.galois * j * L.step)]);
  }
  // sum_j e_j (x) e_perp_j must vanish: the physical and internal projections are orthogonal.
  let orth = 0;
  for (const [a, b] of [[0, 0], [0, 1], [1, 0], [1, 1]]) orth = Math.max(orth, Math.abs(E.reduce((s, e, j) => s + e[a] * Ep[j][b], 0)));
  return { E, Ep, orthogonality: orth };
}
function edgeDirection(mode, dx, dy, alpha0) {
  const L = LATTICES[mode], len = Math.hypot(dx, dy), unit = Math.PI * 2 / L.dirs;
  const t = (Math.atan2(dy, dx) - alpha0) / unit, m = Math.round(t);
  const err = Math.abs(t - m) * unit;
  const mm = ((m % L.dirs) + L.dirs) % L.dirs;
  if (mode === 'p3') return mm % 2 === 0 ? { j: mm / 2, sign: 1, err, len } : { j: ((mm - 5) / 2 + 5) % 5, sign: -1, err, len };
  return mm < L.n ? { j: mm, sign: 1, err, len } : { j: mm - L.n, sign: -1, err, len };
}
function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 1e-12) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 1e-12) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function halfPlanes(hull) { // outward normals: n . x <= h
  return hull.map((a, i) => {
    const b = hull[(i + 1) % hull.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const n = [dy / L, -dx / L];
    return { n, h: n[0] * a[0] + n[1] * a[1] };
  });
}
// Window for index t: projection of the unit-cube slice sum = t (P3), or the whole cube (AB, d12).
function windows(mode, Ep) {
  const n = Ep.length, byT = new Map();
  for (let mask = 0; mask < (1 << n); mask++) {
    let x = 0, y = 0, t = 0;
    for (let j = 0; j < n; j++) if (mask & (1 << j)) { x += Ep[j][0]; y += Ep[j][1]; t++; }
    const key = mode === 'p3' ? t : 0;
    if (!byT.has(key)) byT.set(key, []);
    byT.get(key).push([x, y]);
  }
  const out = new Map();
  for (const [t, pts] of byT) {
    const hull = convexHull(pts);
    if (hull.length >= 3) out.set(t, { hull, planes: halfPlanes(hull) });
  }
  return out;
}
// min over a window shift g of max_k (n_k . g - b_k): the largest window violation that the best
// shift leaves. Nonpositive means some shift accepts every vertex.
function minimax(cons) {
  const F = (gx, gy) => { let m = -Infinity; for (const c of cons) { const v = c.n[0] * gx + c.n[1] * gy - c.b; if (v > m) m = v; } return m; };
  let best = Infinity, arg = null;
  for (let a = 0; a < cons.length; a++) for (let b = a + 1; b < cons.length; b++) for (let c = b + 1; c < cons.length; c++) {
    const A = cons[a], B = cons[b], C = cons[c];
    const m11 = A.n[0] - B.n[0], m12 = A.n[1] - B.n[1], r1 = A.b - B.b, m21 = A.n[0] - C.n[0], m22 = A.n[1] - C.n[1], r2 = A.b - C.b;
    const det = m11 * m22 - m12 * m21;
    if (Math.abs(det) < 1e-12) continue;
    const gx = (r1 * m22 - m12 * r2) / det, gy = (m11 * r2 - r1 * m21) / det, v = F(gx, gy);
    if (v < best) { best = v; arg = [gx, gy]; }
  }
  return { s: best, g: arg };
}
function liftAndWindow(mode, polys, chain) {
  const V = chain._snap.pts, ids = chain._ids, NV = V.length;
  const first = polys[0].pts, alpha0raw = Math.atan2(first[1][1] - first[0][1], first[1][0] - first[0][0]);
  const unit = TAU / LATTICES[mode].dirs, alpha0 = alpha0raw - Math.round(alpha0raw / unit) * unit;
  const B = basis(mode, alpha0), n = B.E.length;
  const adj = new Map();
  let maxDirErr = 0, maxLenErr = 0;
  polys.forEach((P, t) => {
    const m = P.pts.length;
    for (let k = 0; k < m; k++) {
      const a = ids[t][k], b = ids[t][(k + 1) % m];
      const d = edgeDirection(mode, V[b][0] - V[a][0], V[b][1] - V[a][1], alpha0);
      maxDirErr = Math.max(maxDirErr, d.err); maxLenErr = Math.max(maxLenErr, Math.abs(d.len - 1));
      if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push([b, d.j, d.sign]); adj.get(b).push([a, d.j, -d.sign]);
    }
  });
  const K = new Map(), comp = [];
  let inconsistent = 0;
  for (const start of adj.keys()) {
    if (K.has(start)) continue;
    comp.push(start);
    K.set(start, new Int32Array(n));
    const queue = [start];
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi], ku = K.get(u);
      for (const [w, j, sg] of adj.get(u)) {
        const kw = ku.slice(); kw[j] += sg;
        if (!K.has(w)) { K.set(w, kw); queue.push(w); }
        else { const have = K.get(w); for (let i = 0; i < n; i++) if (have[i] !== kw[i]) { inconsistent++; break; } }
      }
    }
  }
  // The lift must also reproduce each vertex position from the first vertex (checks the basis).
  const s0 = comp[0], k0 = K.get(s0);
  let maxPositionError = 0;
  for (const [v, k] of K) {
    let x = V[s0][0], y = V[s0][1];
    for (let i = 0; i < n; i++) { x += (k[i] - k0[i]) * B.E[i][0]; y += (k[i] - k0[i]) * B.E[i][1]; }
    maxPositionError = Math.max(maxPositionError, Math.hypot(x - V[v][0], y - V[v][1]));
  }
  const W = windows(mode, B.Ep);
  const perp = new Map(); let tMin = Infinity, tMax = -Infinity;
  for (const [v, k] of K) {
    let x = 0, y = 0, t = 0;
    for (let i = 0; i < n; i++) { x += k[i] * B.Ep[i][0]; y += k[i] * B.Ep[i][1]; t += k[i]; }
    perp.set(v, [x, y, t]);
    if (t < tMin) tMin = t; if (t > tMax) tMax = t;
  }
  const solve = shift => {
    const agg = new Map();
    for (const [x, y, t] of perp.values()) {
      const w = W.get(mode === 'p3' ? t + shift : 0);
      if (!w) return null;
      for (const pl of w.planes) {
        const key = Math.round(Math.atan2(pl.n[1], pl.n[0]) * 1e6);
        const b = pl.h - (pl.n[0] * x + pl.n[1] * y);
        const cur = agg.get(key);
        if (!cur || b < cur.b) agg.set(key, { n: pl.n, b });
      }
    }
    return minimax([...agg.values()]);
  };
  let best = null;
  if (mode === 'p3') {
    for (let c = 1 - tMin; c <= 4 - tMax; c++) { const r = solve(c); if (r && (!best || r.s < best.s)) best = { ...r, indexShift: c }; }
  } else best = solve(0);
  return {
    components: comp.length, liftInconsistencies: inconsistent, maxLiftPositionError: maxPositionError,
    maxDirectionError: maxDirErr, maxUnitLengthError: maxLenErr, orthogonality: B.orthogonality,
    indexRange: mode === 'p3' ? [tMin, tMax] : null, indexSpan: mode === 'p3' ? tMax - tMin + 1 : null,
    windowViolation: best ? best.s : Infinity, windowShift: best ? best.g : null, indexShift: best && best.indexShift !== undefined ? best.indexShift : null,
    _K: K, _perp: perp, _basis: B,
  };
}

/* ---------------- independent de Bruijn constructions ---------------- */
// Pentagrid (de Bruijn 1981): e_j = 5th roots of unity, K_j(x) = ceil(x . e_j + gamma_j), sum gamma = 0.
function pentagrid(gamma, radius) {
  const e = [0, 1, 2, 3, 4].map(j => [Math.cos(2 * Math.PI * j / 5), Math.sin(2 * Math.PI * j / 5)]);
  const polys = [];
  for (let r = 0; r < 5; r++) for (let s = r + 1; s < 5; s++) {
    const det = e[r][0] * e[s][1] - e[r][1] * e[s][0];
    for (let kr = Math.floor(-radius - gamma[r]) - 1; kr <= Math.ceil(radius - gamma[r]) + 1; kr++) {
      for (let ks = Math.floor(-radius - gamma[s]) - 1; ks <= Math.ceil(radius - gamma[s]) + 1; ks++) {
        const ar = kr - gamma[r], as = ks - gamma[s];
        const x = (ar * e[s][1] - e[r][1] * as) / det, y = (e[r][0] * as - ar * e[s][0]) / det;
        if (x * x + y * y > radius * radius) continue;
        let vx = kr * e[r][0] + ks * e[s][0], vy = kr * e[r][1] + ks * e[s][1];
        for (let j = 0; j < 5; j++) if (j !== r && j !== s) { const K = Math.ceil(x * e[j][0] + y * e[j][1] + gamma[j]); vx += K * e[j][0]; vy += K * e[j][1]; }
        // The four meshes around the intersection have K_r in {k_r, k_r + 1} and K_s in {k_s, k_s + 1}.
        const pts = [[vx, vy], [vx + e[r][0], vy + e[r][1]], [vx + e[r][0] + e[s][0], vy + e[r][1] + e[s][1]], [vx + e[s][0], vy + e[s][1]]];
        if (signedArea(pts) < 0) pts.reverse();
        const d = s - r;
        polys.push({ type: d === 1 || d === 4 ? 1 : 0, flip: 0, pts });
      }
    }
  }
  return polys;
}
// Dual multigrid written from de Bruijn's definition (solve each pair of lines directly), with the
// module's own view transform and bounding-box cull applied afterwards so tile sets can be compared.
function dualMultigrid(n, gamma, cx, cy, rad, xf, rect) {
  const e = []; for (let j = 0; j < n; j++) e.push([Math.cos(j * Math.PI / n), Math.sin(j * Math.PI / n)]);
  const polys = [], counts = {}, boundaryAmbiguous = [];
  for (let r = 0; r < n; r++) for (let s = r + 1; s < n; s++) {
    const det = e[r][0] * e[s][1] - e[r][1] * e[s][0];
    const cr = cx * e[r][0] + cy * e[r][1], cs = cx * e[s][0] + cy * e[s][1];
    let count = 0;
    for (let kr = Math.floor(cr - rad - gamma[r]) - 1; kr <= Math.ceil(cr + rad - gamma[r]) + 1; kr++) {
      for (let ks = Math.floor(cs - rad - gamma[s]) - 1; ks <= Math.ceil(cs + rad - gamma[s]) + 1; ks++) {
        const ar = kr + gamma[r], as = ks + gamma[s];
        const x = (ar * e[s][1] - e[r][1] * as) / det, y = (e[r][0] * as - ar * e[s][0]) / det;
        const dist = Math.hypot(x - cx, y - cy);
        if (Math.abs(dist - rad) < 1e-9) boundaryAmbiguous.push([r, s, kr, ks]);
        if (dist > rad) continue;
        count++;
        if (!rect) continue;
        let vx = kr * e[r][0] + ks * e[s][0], vy = kr * e[r][1] + ks * e[s][1];
        for (let j = 0; j < n; j++) if (j !== r && j !== s) { const K = Math.ceil(x * e[j][0] + y * e[j][1] - gamma[j]); vx += K * e[j][0]; vy += K * e[j][1]; }
        const q = [[vx, vy], [vx + e[r][0], vy + e[r][1]], [vx + e[r][0] + e[s][0], vy + e[r][1] + e[s][1]], [vx + e[s][0], vy + e[s][1]]];
        const pts = q.map(([a, b]) => [xf.c * a + xf.s * b + xf.tx, -xf.s * a + xf.c * b + xf.ty]);
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        if (Math.min(...xs) > rect.x1 || Math.max(...xs) < rect.x0 || Math.min(...ys) > rect.y1 || Math.max(...ys) < rect.y0) continue;
        if (signedArea(pts) < 0) pts.reverse();
        const dd = Math.min(s - r, n - (s - r));
        polys.push({ type: dd === n / 2 ? n / 2 - 1 : dd - 1, flip: 0, pts, pair: [r, s] });
      }
    }
    counts[r + ',' + s] = count;
  }
  return { polys, counts, boundaryAmbiguous };
}
// Rigorous lattice-point bounds for the intersections of line families r and s inside a disk of radius
// rad: the fundamental parallelogram has area 1/sin(a) and diameter 1/sin(a'/2) with a' = min(a, pi - a).
function pairBounds(n, r, s, rad) {
  const a = (s - r) * Math.PI / n, ap = Math.min(a, Math.PI - a), sn = Math.sin(ap), dia = 1 / Math.sin(ap / 2);
  return { expected: Math.PI * rad * rad * sn, lo: Math.PI * Math.max(0, rad - dia) ** 2 * sn, hi: Math.PI * (rad + dia) ** 2 * sn };
}
// Tile-set identity on shared snapped vertices: tiles are equal when their vertex-id sets are equal.
function tileKeys(polys, snap) {
  return polys.map(P => P.pts.map(q => snap.id(q[0], q[1])).sort((a, b) => a - b).join(','));
}

module.exports = {
  root, PHI, TAU, replaceOnce, loadTilings, polygonsOf, signedArea, interiorAngles, edgeLengths, isSimple, clipArea,
  segmentMeetsRect, Snap, chainCheck, PROTOTILES, matchPrototile, shapeCheck, census, canonicalCycle, arcCheck,
  LATTICES, basis, liftAndWindow, windows, minimax, pentagrid, dualMultigrid, pairBounds, tileKeys,
};
