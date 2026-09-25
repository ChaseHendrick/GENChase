'use strict';
// Independent lozenge references for tools/lozenge-science.js. Nothing here calls the module.
//
// Lattice. Points (u, v) of the triangular lattice sit in the plane at P(u, v) = ((u - v) sqrt(3)/2,
// -(u + v)/2), so (1, 0), (0, 1) and (1, 1) are unit steps. Unit triangles are A(u, v) with corners
// (u, v), (u+1, v), (u+1, v+1) and B(u, v) with corners (u, v), (u+1, v+1), (u, v+1). The box corner
// (i, j, k) projects along (1, 1, 1) to (u, v) = (i - k, j - k), and the a, b, c hexagon is the convex
// hull of the projected corners of the a by b by c box.
const assert = require('node:assert/strict');
const S3 = Math.sqrt(3) / 2;

function hull(points) {
  const p = points.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const boxCorners = (a, b, c) => { const out = []; for (const i of [0, a]) for (const j of [0, b]) for (const k of [0, c]) out.push([i - k, j - k]); return out; };

// The region's triangles: every unit triangle whose centroid lies strictly inside the hexagon.
function region(a, b, c) {
  const H = hull(boxCorners(a, b, c));
  assert.equal(H.length, 6, 'the projected box is not a hexagon');
  const inside = (x, y) => H.every((p, i) => { const q = H[(i + 1) % H.length]; return (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]) > 1e-9; });
  const tris = [], id = new Map();
  for (let u = -c - 1; u <= a + 1; u++) for (let v = -c - 1; v <= b + 1; v++) {
    for (const t of [0, 1]) {
      const cx = u + (t === 0 ? 2 / 3 : 1 / 3), cy = v + (t === 0 ? 1 / 3 : 2 / 3);
      if (!inside(cx, cy)) continue;
      const corners = t === 0 ? [[u, v], [u + 1, v], [u + 1, v + 1]] : [[u, v], [u + 1, v + 1], [u, v + 1]];
      id.set(t + ':' + u + ':' + v, tris.length);
      tris.push({ t, u, v, corners });
    }
  }
  assert.equal(tris.length, 2 * (a * b + b * c + c * a), 'hexagon area is not 2(ab + bc + ca) triangles');
  // edge adjacency: two triangles that share two corners
  const edges = new Map();
  tris.forEach((T, k) => { for (let e = 0; e < 3; e++) { const p = T.corners[e], q = T.corners[(e + 1) % 3], key = [p, q].map(x => x.join(',')).sort().join('|'); if (!edges.has(key)) edges.set(key, []); edges.get(key).push(k); } });
  const adj = tris.map(() => []);
  for (const pair of edges.values()) if (pair.length === 2) { adj[pair[0]].push(pair[1]); adj[pair[1]].push(pair[0]); }
  return { a, b, c, hexagon: H, tris, id, adj };
}

// Every lozenge tiling of the region, by pairing the first unpaired triangle with each unpaired
// neighbor. Returns keys (partner triangle index per triangle, joined) and rhombus placement counts.
function enumerateTilings(R) {
  const n = R.tris.length, partner = new Int32Array(n).fill(-1), keys = new Map(), placements = new Map();
  function visit(k) {
    while (k < n && partner[k] >= 0) k++;
    if (k === n) {
      keys.set(partner.join(','), keys.size);
      for (let i = 0; i < n; i++) if (partner[i] > i) { const d = i + ':' + partner[i]; placements.set(d, (placements.get(d) || 0) + 1); }
      return;
    }
    for (const m of R.adj[k]) if (partner[m] < 0) { partner[k] = m; partner[m] = k; visit(k + 1); partner[k] = partner[m] = -1; }
  }
  visit(0);
  return { count: keys.size, keys, placements };
}

// Every plane partition in the a by b box with parts at most c: h(i, j) weakly decreasing along rows
// and columns, stored row-major with index j a + i as the module stores its heights.
function enumeratePartitions(a, b, c) {
  const h = new Int16Array(a * b), out = [];
  (function fill(k) {
    if (k === a * b) { out.push(Array.from(h)); return; }
    const i = k % a, j = (k - i) / a;
    const hi = Math.min(i > 0 ? h[k - 1] : c, j > 0 ? h[k - a] : c);
    for (let z = 0; z <= hi; z++) { h[k] = z; fill(k + 1); }
  })(0);
  return out;
}

// MacMahon's product, exactly: prod over i <= a, j <= b, k <= c of (i + j + k - 1) / (i + j + k - 2).
function macmahon(a, b, c) {
  let num = 1n, den = 1n;
  for (let i = 1; i <= a; i++) for (let j = 1; j <= b; j++) for (let k = 1; k <= c; k++) { num *= BigInt(i + j + k - 1); den *= BigInt(i + j + k - 2); }
  assert.equal(num % den, 0n);
  return num / den;
}

// The visible faces of the stack of cubes with heights h, from the 3D picture: a top (normal +z) over
// each column at its height; for each row j and level k < c a face with normal +x at x = the number
// of columns in that row taller than k; for each column i and level k a face with normal +y at y =
// the number of rows in that column taller than k. Each face as four plane points (y up) and its
// orientation: 0 for +z, 1 for +x (looking down and to the right), 2 for +y. level is twice the
// face's height above the floor for a top and 2k + 1 for a side, the module's height-color index.
function faces(h, a, b, c) {
  const P = (x, y, z) => [(x - y) * S3, z - (x + y) / 2], out = [];
  for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) { const z = h[j * a + i]; out.push({ o: 0, level: 2 * z, pts: [P(i, j, z), P(i + 1, j, z), P(i + 1, j + 1, z), P(i, j + 1, z)] }); }
  for (let k = 0; k < c; k++) for (let j = 0; j < b; j++) { let m = 0; for (let i = 0; i < a; i++) if (h[j * a + i] > k) m++; out.push({ o: 1, level: 2 * k + 1, pts: [P(m, j, k), P(m, j + 1, k), P(m, j + 1, k + 1), P(m, j, k + 1)] }); }
  for (let k = 0; k < c; k++) for (let i = 0; i < a; i++) { let q = 0; for (let j = 0; j < b; j++) if (h[j * a + i] > k) q++; out.push({ o: 2, level: 2 * k + 1, pts: [P(i, q, k), P(i + 1, q, k), P(i + 1, q, k + 1), P(i, q, k + 1)] }); }
  return out;
}

// Which two region triangles a face covers. The face's corners are carried back to lattice points by
// the inverse of the plane map; the rhombus is the two unit triangles on either side of its short
// diagonal (the one that is a unit lattice step), each named by its three corners.
function tilingOfFaces(R, F) {
  const partner = new Int32Array(R.tris.length).fill(-1), faceTris = [];
  const lattice = ([X, Y]) => { const d = X / S3, s = -2 * Y, u = Math.round((d + s) / 2), v = Math.round((s - d) / 2); assert(Math.abs((u - v) * S3 - X) < 1e-9 && Math.abs(-(u + v) / 2 - Y) < 1e-9, 'face corner off the lattice'); return [u, v]; };
  const unit = (p, q) => { const du = q[0] - p[0], dv = q[1] - p[1]; return (Math.abs(du) + Math.abs(dv) === 1) || (du === dv && Math.abs(du) === 1); };
  // unit triangles by the corner pattern relative to their lowest u and v: A holds (0,0), (1,0), (1,1)
  // and B holds (0,0), (1,1), (0,1); bit 2 du + dv of a four-bit mask per corner
  if (!R.lookup) {
    R.uMin = -R.c - 2; R.vMin = -R.c - 2; R.uSpan = R.a + R.c + 5; R.vSpan = R.b + R.c + 5;
    R.lookup = new Int32Array(2 * R.uSpan * R.vSpan).fill(-1);
    R.tris.forEach((T, k) => { R.lookup[(T.t * R.uSpan + (T.u - R.uMin)) * R.vSpan + (T.v - R.vMin)] = k; });
  }
  const triId = (p, q, r) => {
    const u0 = Math.min(p[0], q[0], r[0]), v0 = Math.min(p[1], q[1], r[1]);
    let mask = 0;
    for (const x of [p, q, r]) { const du = x[0] - u0, dv = x[1] - v0; if (du > 1 || dv > 1) return undefined; mask |= 1 << (2 * du + dv); }
    const t = mask === 13 ? 0 : mask === 11 ? 1 : -1;
    if (t < 0 || u0 < R.uMin || v0 < R.vMin || u0 - R.uMin >= R.uSpan || v0 - R.vMin >= R.vSpan) return undefined;
    const k = R.lookup[(t * R.uSpan + (u0 - R.uMin)) * R.vSpan + (v0 - R.vMin)];
    return k < 0 ? undefined : k;
  };
  for (const f of F) {
    const c = f.pts.map(lattice);
    const [d1, d2, o1, o2] = unit(c[0], c[2]) ? [c[0], c[2], c[1], c[3]] : [c[1], c[3], c[0], c[2]];
    assert(unit(d1, d2) && !unit(o1, o2), 'face is not a unit rhombus');
    const p = triId(d1, d2, o1), q = triId(d1, d2, o2);
    assert(p !== undefined && q !== undefined, 'a face leaves the hexagon');
    assert(partner[p] < 0 && partner[q] < 0, 'two faces cover one triangle');
    assert(R.adj[p].includes(q), 'a face covers two triangles that do not share an edge');
    partner[p] = q; partner[q] = p; faceTris.push([p, q]);
  }
  assert(partner.every(v => v >= 0), 'the faces leave a triangle uncovered');
  return { key: partner.join(','), partner, faceTris };
}

// Frozen at radius R: every triangle within R edge steps (through triangles of the hexagon) has the
// same orientation. By breadth-first search, not by the module's recursion.
function frozenBall(R, orient, ring) {
  return R.tris.map((_, s) => {
    const dist = new Map([[s, 0]]), queue = [s];
    for (let q = 0; q < queue.length; q++) {
      const x = queue[q]; if (orient[x] !== orient[s]) return 0;
      if (dist.get(x) === ring) continue;
      for (const y of R.adj[x]) if (!dist.has(y)) { dist.set(y, dist.get(x) + 1); queue.push(y); }
    }
    return 1;
  });
}

// Frozen as the tab defines it from recipe v4: a rhombus is frozen when a chain of edge-adjacent rhombi of
// its own orientation joins it to the rim of the hexagon (the lozenge analogue of the Jockusch-Propp-Shor
// polar regions). Written independently of the module, which floods triangles outward from the rim:
// here union-find runs over rhombi, joining two rhombi of one orientation whenever a triangle of one
// shares an edge with a triangle of the other, and a component is frozen when one of its rhombi has a
// triangle with an edge on the rim (fewer than three neighbors inside the hexagon). Returns per-face and
// per-triangle flags.
function rimFrozen(R, faceTris, faceOrient) {
  const nF = faceTris.length, parent = Array.from({ length: nF }, (_, i) => i), faceOf = new Int32Array(R.tris.length).fill(-1);
  faceTris.forEach((pair, f) => { for (const t of pair) faceOf[t] = f; });
  const find = k => { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; };
  const rim = new Uint8Array(nF);
  faceTris.forEach((pair, f) => {
    for (const t of pair) {
      if (R.adj[t].length < 3) rim[f] = 1;
      for (const u of R.adj[t]) { const g = faceOf[u]; if (g !== f && faceOrient[g] === faceOrient[f]) { const x = find(f), y = find(g); if (x !== y) parent[x] = y; } }
    }
  });
  const rootRim = new Uint8Array(nF);
  for (let f = 0; f < nF; f++) if (rim[f]) rootRim[find(f)] = 1;
  const faces = new Uint8Array(nF), tris = new Uint8Array(R.tris.length);
  for (let f = 0; f < nF; f++) { faces[f] = rootRim[find(f)]; for (const t of faceTris[f]) tris[t] = faces[f]; }
  return { faces, tris };
}

// The same frozen set read off the height function, as a third route with no tiling in it at all. Two
// tops share an edge exactly when two neighboring columns have one height, and the only tops on the rim
// are full columns (h = c) in the first row or column and empty ones (h = 0) in the last, so the frozen
// tops are the columns with h = c or h = 0 (each set is a staircase containing its corner column). The
// same holds for the faces with normal +x, indexed by row j and level k with m(j, k) = #{i : h(i, j) > k}
// in [0, a], and for the faces with normal +y, with q(i, k) = #{j : h(i, j) > k} in [0, b]. Returns the
// number of frozen rhombi of each orientation.
function extremeLevelCounts(h, a, b, c) {
  let tops = 0, right = 0, left = 0;
  for (let j = 0; j < b; j++) for (let i = 0; i < a; i++) { const z = h[j * a + i]; if (z === c || z === 0) tops++; }
  for (let k = 0; k < c; k++) for (let j = 0; j < b; j++) { let m = 0; for (let i = 0; i < a; i++) if (h[j * a + i] > k) m++; if (m === a || m === 0) right++; }
  for (let k = 0; k < c; k++) for (let i = 0; i < a; i++) { let q = 0; for (let j = 0; j < b; j++) if (h[j * a + i] > k) q++; if (q === b || q === 0) left++; }
  return [tops, right, left];
}

// The ellipse inscribed in the hexagon and tangent to its six sides, solved from the tangency
// conditions: center at the hexagon's center of symmetry, and n' A n = d^2 for each side with unit
// normal n at distance d, three independent equations (opposite sides repeat) for A = [[p, q], [q, r]].
function inscribedEllipse(a, b, c) {
  const plane = ([u, v]) => [(u - v) * S3, -(u + v) / 2];
  const H = hull(boxCorners(a, b, c)).map(plane);
  const C = H.reduce((s, p) => [s[0] + p[0] / 6, s[1] + p[1] / 6], [0, 0]);
  const rows = [], rhs = [], sides = [];
  for (let i = 0; i < 6; i++) {
    const p = H[i], q = H[(i + 1) % 6], ex = q[0] - p[0], ey = q[1] - p[1], L = Math.hypot(ex, ey), nx = ey / L, ny = -ex / L;
    const d = Math.abs(nx * (p[0] - C[0]) + ny * (p[1] - C[1]));
    sides.push({ nx, ny, d }); rows.push([nx * nx, 2 * nx * ny, ny * ny]); rhs.push(d * d);
  }
  // least squares over all six (exact when the conditions are consistent)
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
  rows.forEach((r, i) => { for (let x = 0; x < 3; x++) { v[x] += r[x] * rhs[i]; for (let y = 0; y < 3; y++) M[x][y] += r[x] * r[y]; } });
  const det3 = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(M), sol = [0, 1, 2].map(k => det3(M.map((row, i) => row.map((x, j) => j === k ? v[i] : x))) / D);
  const [p, q, r] = sol, residual = Math.max(...rows.map((row, i) => Math.abs(row[0] * p + row[1] * q + row[2] * r - rhs[i])));
  const l11 = Math.sqrt(p), l21 = q / l11, l22 = Math.sqrt(r - l21 * l21);
  const hexArea = Math.abs(H.reduce((s, P, i) => { const Q = H[(i + 1) % 6]; return s + P[0] * Q[1] - Q[0] * P[1]; }, 0)) / 2;
  return { cx: C[0], cy: C[1], A11: p, A12: q, A22: r, det: p * r - q * q, l11, l21, l22, tangencyResidual: residual, hexArea, areaFraction: Math.PI * Math.sqrt(p * r - q * q) / hexArea, sides };
}

module.exports = { S3, hull, region, enumerateTilings, enumeratePartitions, macmahon, faces, tilingOfFaces, frozenBall, rimFrozen, extremeLevelCounts, inscribedEllipse };
