'use strict';
// Independent Aztec diamond references for tools/aztec-science.js. Nothing here calls the module:
// the diamond is defined by its cells, tilings are enumerated by backtracking, and a tiling produced
// by the module is read back only as a list of rectangles, which is also what its print draws.
const assert = require('node:assert/strict');

// The Aztec diamond of order n is the union of the unit squares whose centers (x, y) satisfy
// |x| + |y| <= n. On a 2n by 2n grid with the center at (n, n), cell (i, j) has center (i + 1/2, j + 1/2).
const inDiamond = (i, j, n) => i >= 0 && j >= 0 && i < 2 * n && j < 2 * n && Math.abs(i + 0.5 - n) + Math.abs(j + 0.5 - n) <= n;

function cells(n) {
  const out = [];
  for (let j = 0; j < 2 * n; j++) for (let i = 0; i < 2 * n; i++) if (inDiamond(i, j, n)) out.push(j * 2 * n + i);
  return out;
}

// Every tiling, by covering the first uncovered cell in row-major order with a domino to its right or
// below. Returns the tilings as partner arrays (partner[c] is the other cell of c's domino) keyed by a
// string, and the number of tilings containing each domino (keyed "c1:c2" with c1 < c2).
function enumerate(n) {
  const w = 2 * n, all = cells(n), covered = new Uint8Array(w * w), partner = new Int32Array(w * w).fill(-1);
  const keys = [], placements = new Map();
  for (const c of all) covered[c] = 0;
  const inside = new Uint8Array(w * w); for (const c of all) inside[c] = 1;
  function visit(k) {
    while (k < all.length && covered[all[k]]) k++;
    if (k === all.length) {
      keys.push(keyOf(partner, all));
      for (const c of all) if (partner[c] > c) { const d = c + ':' + partner[c]; placements.set(d, (placements.get(d) || 0) + 1); }
      return;
    }
    const c = all[k], i = c % w, j = (c - i) / w;
    for (const d of [c + 1, c + w]) {
      const di = d % w, dj = (d - di) / w;
      if ((d === c + 1 && di !== i + 1) || dj >= w || !inside[d] || covered[d]) continue;
      covered[c] = covered[d] = 1; partner[c] = d; partner[d] = c;
      visit(k + 1);
      covered[c] = covered[d] = 0; partner[c] = partner[d] = -1;
    }
  }
  visit(0);
  return { n, cells: all.length, count: keys.length, keys, placements };
}

// A key names a tiling by each cell's partner direction: R, L, D or U, in row-major cell order.
function keyOf(partner, all) {
  let s = '';
  for (const c of all) { const p = partner[c]; s += p === c + 1 ? 'R' : p === c - 1 ? 'L' : p > c ? 'D' : 'U'; }
  return s;
}

// A module tiling is read as its list of dominoes [x, y, type, horizontal]. It must cover every cell
// of the order-n diamond exactly once, each domino on two cells of the diamond, and each domino's
// two grid cells must carry its type.
function inspect(list, grid, n) {
  const w = 2 * n, all = cells(n), partner = new Int32Array(w * w).fill(-1), types = new Uint8Array(w * w);
  for (const [x, y, t, hz] of list) {
    assert(Number.isInteger(x) && Number.isInteger(y) && t >= 1 && t <= 4, 'bad domino record');
    assert.equal(hz, t === 1 || t === 2, 'N and S dominoes are horizontal, W and E vertical');
    const x2 = hz ? x + 1 : x, y2 = hz ? y : y + 1;
    assert(inDiamond(x, y, n) && inDiamond(x2, y2, n), 'domino leaves the diamond');
    const a = y * w + x, b = y2 * w + x2;
    assert(partner[a] < 0 && partner[b] < 0, 'cell covered twice');
    partner[a] = b; partner[b] = a; types[a] = types[b] = t;
    if (grid) assert(grid[a] === t && grid[b] === t, 'grid type differs from the domino list');
  }
  for (const c of all) assert(partner[c] >= 0, 'cell left uncovered');
  if (grid) for (let c = 0; c < w * w; c++) if (!inDiamond(c % w, Math.floor(c / w), n)) assert.equal(grid[c], 0, 'grid marks a cell outside the diamond');
  assert.equal(list.length, all.length / 2);
  return { key: keyOf(partner, all), partner, types };
}

// "Frozen" as the tab's hint defines it: every cell edge-adjacent to the domino, inside the diamond,
// carries the domino's type. Written from the definition, not from the module.
function localFrozen(list, types, n) {
  const w = 2 * n;
  return list.map(([x, y, t, hz]) => {
    const own = hz ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]];
    for (const [cx, cy] of own) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inDiamond(nx, ny, n)) continue;
      if (types[ny * w + nx] !== t) return 0;
    }
    return 1;
  });
}

// The four polar regions: for each corner, the edge-connected cluster of dominoes of one type that
// contains the domino covering the corner cell, when that domino has the corner's type (N at the top
// corner, S at the bottom, W at the left, E at the right). Two dominoes of one type that share an
// edge are necessarily offset by one cell, so each cluster is a piece of brickwork. The axis depth is
// how many cells of the central column (or row) pair, counted in from the corner, lie in the region
// before the first that does not; the boundary radius along that axis is n minus that depth.
function polar(list, partner, types, n) {
  const w = 2 * n, owner = new Int32Array(w * w).fill(-1);
  list.forEach(([x, y, t, hz], k) => { owner[y * w + x] = k; owner[(hz ? y : y + 1) * w + (hz ? x + 1 : x)] = k; });
  const inRegion = new Uint8Array(list.length), corner = { N: [n - 1, 0, 1], S: [n - 1, w - 1, 2], W: [0, n - 1, 3], E: [w - 1, n - 1, 4] };
  const regionSize = {}, depth = {}, cornerType = {};
  for (const side of ['N', 'S', 'W', 'E']) {
    const [ci, cj, want] = corner[side], start = owner[cj * w + ci];
    cornerType[side] = list[start][2];
    const mark = new Uint8Array(list.length);
    let size = 0;
    if (list[start][2] === want) {
      const queue = [start]; mark[start] = 1;
      for (let q = 0; q < queue.length; q++) {
        const [x, y, , hz] = list[queue[q]];
        for (const [cx, cy] of hz ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (!inDiamond(nx, ny, n)) continue;
          const o = owner[ny * w + nx];
          if (o >= 0 && !mark[o] && list[o][2] === want) { mark[o] = 1; queue.push(o); }
        }
      }
      size = queue.length;
      for (const k of queue) inRegion[k] = 1;
    }
    regionSize[side] = size;
    // central pair of cells at each depth d, walking in from the corner
    let d = 0;
    for (; d < n; d++) {
      const pair = side === 'N' ? [[n - 1, d], [n, d]] : side === 'S' ? [[n - 1, w - 1 - d], [n, w - 1 - d]] :
        side === 'W' ? [[d, n - 1], [d, n]] : [[w - 1 - d, n - 1], [w - 1 - d, n]];
      if (!pair.every(([x, y]) => mark[owner[y * w + x]])) break;
    }
    depth[side] = d;
  }
  let total = 0; for (const v of inRegion) total += v;
  return { fraction: total / list.length, regionSize, depth, radius: Object.fromEntries(Object.entries(depth).map(([k, v]) => [k, n - v])), cornerType };
}

// The polar regions as Jockusch, Propp and Shor define them, in Johansson's statement (Annals of Probability
// 33, 2005): the north polar region is the union of the N dominoes connected to the boundary of the diamond
// by a chain of edge-adjacent N dominoes, and likewise for S, W and E. Written independently of the module
// (which floods from the boundary): union-find joins every pair of edge-adjacent dominoes of one type, and a
// domino is polar when its component contains a domino with an edge on the boundary.
function polarBoundary(list, n) {
  const w = 2 * n, owner = new Int32Array(w * w).fill(-1), parent = list.map((_, k) => k);
  list.forEach(([x, y, , hz], k) => { owner[y * w + x] = k; owner[(hz ? y : y + 1) * w + (hz ? x + 1 : x)] = k; });
  const find = k => { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; };
  const touches = new Uint8Array(list.length);
  list.forEach(([x, y, t, hz], k) => {
    for (const [cx, cy] of hz ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inDiamond(nx, ny, n)) { touches[k] = 1; continue; }
      const o = owner[ny * w + nx];
      if (o !== k && list[o][2] === t) { const a = find(k), b = find(o); if (a !== b) parent[a] = b; }
    }
  });
  const rootTouches = new Uint8Array(list.length);
  list.forEach((_, k) => { if (touches[k]) rootTouches[find(k)] = 1; });
  const flags = list.map((_, k) => rootTouches[find(k)]);
  const byType = [0, 0, 0, 0];
  list.forEach((d, k) => { if (flags[k]) byType[d[2] - 1]++; });
  const q = byType.map(c => 4 * c / list.length), f = q.reduce((a, b) => a + b, 0) / 4;
  const sd = Math.sqrt(q.reduce((a, b) => a + (b - f) ** 2, 0) / 3);
  return { flags, byType, fraction: f, se4: sd / 2 };
}

// The status line's error bar, recomputed from the definition in validation/AZTEC.md without the module's code:
// every cell of the diamond outside the polar regions is placed at the angle of its center about the center of
// the diamond and shared between the two nearest of 60 sector centers in proportion to its angular distance;
// the error bar is sd sqrt(60 tau) over the number of cells, with tau = 1 + 2 sum of the circular
// autocorrelations up to the first that is not positive (at most lag 15), then held between 2 and 15.
function sectorBar(list, flags, n) {
  const w = 2 * n, owner = new Int32Array(w * w).fill(-1), NB = 60, bins = new Array(NB).fill(0);
  list.forEach(([x, y, , hz], k) => { owner[y * w + x] = k; owner[(hz ? y : y + 1) * w + (hz ? x + 1 : x)] = k; });
  const all = cells(n);
  for (const c of all) {
    const i = c % w, j = (c - i) / w;
    if (flags[owner[c]]) continue;
    const ang = (Math.atan2(j + 0.5 - n, i + 0.5 - n) + 2 * Math.PI) % (2 * Math.PI);
    const pos = ang / (2 * Math.PI / NB) - 0.5, lo = Math.floor(pos), t = pos - lo;
    bins[(lo + NB) % NB] += 1 - t; bins[(lo + 1 + NB) % NB] += t;
  }
  const m = bins.reduce((a, b) => a + b, 0) / NB, dev = bins.map(b => b - m);
  const gamma = l => dev.reduce((acc, d, k) => acc + d * dev[(k + l) % NB], 0) / NB;
  const g0 = gamma(0);
  let tau = 1;
  for (let l = 1; l <= NB / 4; l++) { const r = gamma(l) / g0; if (!(r > 0)) break; tau += 2 * r; }
  tau = Math.min(NB / 4, Math.max(2, tau));
  const sd = Math.sqrt(g0 * NB / (NB - 1));
  return { bins, tau, se: sd * Math.sqrt(NB * tau) / all.length };
}

// Print geometry written from the documented layout: a square of side min(W, H)(1 - 2 margin) centered
// on the sheet, 2n cells across, each domino a rectangle inset by inset * cell on every side. Colors
// by fill mode from the palette with the offset; frozen flags come from localFrozen.
function geometry(s, list, frozen, n, W, H) {
  const side = Math.min(W, H) * (1 - 2 * s.margin), cell = side / (2 * n), ox = (W - side) / 2, oy = (H - side) / 2, g = s.inset * cell, P = s.palette;
  const color = (d, k) => s.fill === 'orient' ? P[(s.shift + (d[3] ? 0 : 1)) % P.length] :
    s.fill === 'frozen' ? P[(s.shift + (frozen[k] ? d[2] - 1 : 4)) % P.length] : P[(s.shift + d[2] - 1) % P.length];
  const rects = list.map((d, k) => ({ x: ox + d[0] * cell + g, y: oy + d[1] * cell + g, w: (d[3] ? 2 : 1) * cell - 2 * g, h: (d[3] ? 1 : 2) * cell - 2 * g, fill: color(d, k) }));
  const stroke = s.strokeWidth > 0 ? { color: P[s.strokeColor % P.length], width: s.strokeWidth * cell / 12 } : null;
  const circle = s.circle ? { cx: W / 2, cy: H / 2, r: side / 2, width: Math.max(1, cell * 0.35) } : null;
  return { rects, stroke, circle, cell };
}

module.exports = { inDiamond, cells, enumerate, keyOf, inspect, localFrozen, polar, polarBoundary, sectorBar, geometry };
