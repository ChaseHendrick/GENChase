'use strict';
// node tools/sandpile-science.js [--write] [--print-only]
//
// Exact benchmarks and print evidence for the Abelian sandpile tab (id 'sandpile' in src/modules/lattice.js;
// not 'rotor', which lives in sandpile.js), in the pattern of tools/ust-review.js. The module is loaded in Node
// through tools/lib/lattice-harness.js, so every check below runs the tab's own makeGridToppler(),
// makeOctantPile() and its identity and random-drop jobs. The print part reads the state back from the real
// studio through an auditRead() injected into a temporary copy of dist/studio.html.
//
//   1. Abelian property (exact). 100 configurations on 8x8 to 64x64 grids with the tab's sink boundary are
//      stabilized in five orders: the tab's LIFO stack, the tab's toppler fed in a shuffled order, the tab's
//      toppler interrupted every 4096 pops, an independent FIFO single-toppling reference and an independent
//      synchronous parallel reference. Final configurations and the per-site toppling counts (odometers)
//      must be identical, and each must satisfy h_final = h_initial - Laplacian * odometer exactly. The tab's
//      toppling count must equal the reference odometer total in every one of its orders.
//      Failure control: a rule that sends the grains above four unevenly (all to one neighbor) must break it.
//      Count control: the pre-fix counter (one per pop, not floor(h/4)) must disagree with the odometer.
//   2. Dhar's theorem (exact). On the 1x1, 2x2 and 3x3 grids every stable configuration is enumerated. The
//      recurrent ones are found three ways (closed classes of the tab's own add-and-stabilize chain, Dhar's
//      burning test, and (c + e) = c with the tab's identity e) and counted against the reduced-Laplacian
//      determinant in BigInt and an exhaustive count of spanning trees. Failure control: a threshold of five
//      (five grains removed per toppling) must break the count.
//   3. The identity. At every grid the UI offers (64 to 256), the tab's e = (2m - (2m)°)° must equal an
//      independent computation, be recurrent, lie in the image of the Laplacian, be symmetric, satisfy
//      (e + e)° = e and (c + e)° = c for random recurrent c. Failure control: (2m)° is not the identity. The
//      tab's toppling count must equal the total of the two reference odometers.
//   4. Single source. The octant-folded pile equals a full-plane reference cell by cell for 2^12, 2^14 and
//      2^16 grains, and conserves every grain inside its truncation radius at all six menu counts. Its toppling
//      count, for the whole plane, must equal the reference odometer total (up to 2^16) and, at all six counts,
//      a quarter of the second moment sum |x|^2 h(x) of the final pile: summing h = N delta_0 - (4I - A) u
//      against |x|^2, which (4I - A) maps to the constant -4, gives sum |x|^2 h = 4 sum u exactly.
//      Count controls: the pre-fix counter, and an octant counter without the orbit weight, must fail it.
//   5. Random drops. After 30,000 and 50,000 single-grain avalanches the tab's heights equal one batch
//      relaxation of all the grains (abelian property at scale) and its avalanche marks equal a reference.
//      Every avalanche size, the largest, the sum and the total topplings equal a one-toppling-per-visit
//      FIFO reference exactly. Count control: the pre-fix counter must disagree.
//   6. Print. Six recipes (five presets and the default) at 8 in and 300 ppi: every exported pixel is compared
//      with colors computed from the independent states, and exporting must leave the state unchanged. The
//      numbers the tab printed on its status line (topplings; for random drops also the drops, the largest
//      avalanche and the mean) must equal the independent references exactly.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const Hn = require('./lib/lattice-harness');

const WRITE = process.argv.includes('--write'), PRINT_ONLY = process.argv.includes('--print-only');
const log = (...a) => console.log(...a);
const TOPPLE = 'const v = h[p]; if (v < 4) continue;\n        const t = v >> 2; h[p] = v - 4 * t; count += t;';
const SIZES = 'sumAv += size; if (size > maxAv) maxAv = size;';
const EDITS = {
  // A side channel only: count topplings per site. Numerics unchanged (checked against the unedited code).
  odometer: [[TOPPLE, TOPPLE + ' if (hooks.odo) hooks.odo[p] += t;', 'odometer side channel']],
  // A second side channel for random drops: every avalanche size, as the status line accumulates it.
  sizes: [[TOPPLE, TOPPLE + ' if (hooks.odo) hooks.odo[p] += t;', 'odometer side channel'], [SIZES, SIZES + ' if (hooks.sizes) hooks.sizes.push(size);', 'avalanche size side channel']],
  // Order-dependent rule: the site empties completely and the grains above 4t all go to its first neighbor.
  uneven: [
    [TOPPLE, 'const v = h[p]; if (v < 4) continue;\n        const t = v >> 2; let extra = v - 4 * t; h[p] = 0; count += t; if (hooks.odo) hooks.odo[p] += t;', 'uneven toppling'],
    ['if (x > 0) { const q = p - 1; if ((h[q] += t) >= 4) push(q); }', 'if (x > 0) { const q = p - 1; if ((h[q] += t + extra) >= 4) push(q); extra = 0; }', 'left'],
    ['if (x < n - 1) { const q = p + 1; if ((h[q] += t) >= 4) push(q); }', 'if (x < n - 1) { const q = p + 1; if ((h[q] += t + extra) >= 4) push(q); extra = 0; }', 'right'],
    ['if (y > 0) { const q = p - n; if ((h[q] += t) >= 4) push(q); }', 'if (y > 0) { const q = p - n; if ((h[q] += t + extra) >= 4) push(q); extra = 0; }', 'up'],
    ['if (y < n - 1) { const q = p + n; if ((h[q] += t) >= 4) push(q); }', 'if (y < n - 1) { const q = p + n; if ((h[q] += t + extra) >= 4) push(q); extra = 0; }', 'down'],
  ],
  // Wrong threshold: topple at five, removing five (four to the neighbors, one lost).
  threshold5: [[TOPPLE, 'const v = h[p]; if (v < 5) continue;\n        const t = (v / 5) | 0; h[p] = v - 5 * t; count += t;', 'threshold five, five removed']],
  // Threshold shifted to five while still removing four: the ordinary sandpile shifted by one grain.
  threshold5keep: [['const v = h[p]; if (v < 4) continue;', 'const v = h[p]; if (v < 5) continue;', 'threshold five, four removed']],
  // Count controls. The pre-fix counter: one per pop, however many topplings floor(h/4) the pop performs, in
  // the grid toppler and in the octant pile. Numerics unchanged; only the printed numbers move.
  events: [[TOPPLE, 'const v = h[p]; if (v < 4) continue;\n        const t = v >> 2; h[p] = v - 4 * t; count++;', 'grid: count pops'],
    ['h[p] -= 4 * t; count += ow[p] * t;', 'h[p] -= 4 * t; count++;', 'octant: count pops']],
  // The octant's own topplings, without the orbit weight: a count for the representatives only.
  octantOnly: [['h[p] -= 4 * t; count += ow[p] * t;', 'h[p] -= 4 * t; count += t;', 'octant: no orbit weight']],
};

/* ------------------------------------------------------------------ independent references */

// FIFO toppling on an n x n grid whose boundary sites lose grains to a sink. single: one toppling per visit;
// otherwise floor(h/4) at once. Returns the odometer. Shares no code with the module.
function stabilizeFIFO(h, n, single) {
  const N = n * n, q = new Int32Array(N), inq = new Uint8Array(N), odo = new Float64Array(N);
  let head = 0, tail = 0, count = 0;
  const enqueue = i => { if (!inq[i] && h[i] >= 4) { inq[i] = 1; q[tail] = i; tail = tail + 1 === N ? 0 : tail + 1; count++; } };
  for (let i = 0; i < N; i++) enqueue(i);
  while (count) {
    const p = q[head]; head = head + 1 === N ? 0 : head + 1; count--; inq[p] = 0;
    const t = single ? (h[p] >= 4 ? 1 : 0) : Math.floor(h[p] / 4);
    if (!t) continue;
    h[p] -= 4 * t; odo[p] += t;
    const x = p % n, y = (p - x) / n;
    if (x > 0) { h[p - 1] += t; enqueue(p - 1); }
    if (x < n - 1) { h[p + 1] += t; enqueue(p + 1); }
    if (y > 0) { h[p - n] += t; enqueue(p - n); }
    if (y < n - 1) { h[p + n] += t; enqueue(p + n); }
    enqueue(p);
  }
  return odo;
}
// Synchronous parallel toppling: every unstable site topples once per round.
function stabilizeParallel(h, n) {
  const N = n * n, odo = new Float64Array(N);
  for (;;) {
    const list = []; for (let i = 0; i < N; i++) if (h[i] >= 4) list.push(i);
    if (!list.length) return odo;
    for (const p of list) {
      h[p] -= 4; odo[p]++;
      const x = p % n, y = (p - x) / n;
      if (x > 0) h[p - 1]++; if (x < n - 1) h[p + 1]++; if (y > 0) h[p - n]++; if (y < n - 1) h[p + n]++;
    }
  }
}
// (Laplacian u)_i = 4 u_i - sum of u over the grid neighbors of i (the sink carries no odometer).
function laplacian(u, n) {
  const out = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const x = i % n, y = (i - x) / n;
    out[i] = 4 * u[i] - (x > 0 ? u[i - 1] : 0) - (x < n - 1 ? u[i + 1] : 0) - (y > 0 ? u[i - n] : 0) - (y < n - 1 ? u[i + n] : 0);
  }
  return out;
}
// Dhar's burning test: the sink is burnt; a site burns once its height is at least its number of unburnt grid
// neighbors. The configuration is recurrent iff every site burns.
function recurrentByBurning(h, n) {
  const N = n * n, unburnt = new Int32Array(N), burnt = new Uint8Array(N), queue = [];
  for (let i = 0; i < N; i++) { const x = i % n, y = (i - x) / n; unburnt[i] = (x > 0) + (x < n - 1) + (y > 0) + (y < n - 1); }
  for (let i = 0; i < N; i++) if (h[i] >= unburnt[i]) { burnt[i] = 1; queue.push(i); }
  let count = 0;
  while (queue.length) {
    const p = queue.pop(); count++;
    const x = p % n, y = (p - x) / n;
    for (const q of [x > 0 ? p - 1 : -1, x < n - 1 ? p + 1 : -1, y > 0 ? p - n : -1, y < n - 1 ? p + n : -1]) {
      if (q < 0 || burnt[q]) continue;
      unburnt[q]--;
      if (h[q] >= unburnt[q]) { burnt[q] = 1; queue.push(q); }
    }
  }
  return count === N;
}
// Determinant of the reduced Laplacian (diag * I - A on the n x n grid) by Bareiss elimination in BigInt.
function reducedLaplacianDet(n, diag) {
  const N = n * n, A = [];
  for (let i = 0; i < N; i++) {
    const row = new Array(N).fill(0n), x = i % n, y = (i - x) / n; row[i] = BigInt(diag);
    if (x > 0) row[i - 1] = -1n; if (x < n - 1) row[i + 1] = -1n; if (y > 0) row[i - n] = -1n; if (y < n - 1) row[i + n] = -1n;
    A.push(row);
  }
  let prev = 1n, sign = 1n;
  for (let k = 0; k < N - 1; k++) {
    if (A[k][k] === 0n) { let s = k + 1; while (s < N && A[s][k] === 0n) s++; if (s === N) return 0n; [A[k], A[s]] = [A[s], A[k]]; sign = -sign; }
    for (let i = k + 1; i < N; i++) for (let j = k + 1; j < N; j++) A[i][j] = (A[i][j] * A[k][k] - A[i][k] * A[k][j]) / prev;
    prev = A[k][k];
  }
  return sign * A[N - 1][N - 1];
}
// Spanning trees of the grid plus one sink vertex joined to each site by (4 - grid degree) parallel edges,
// counted by exhaustive search over edge subsets with a rollback union-find: no determinant involved.
function countSpanningTrees(n) {
  const N = n * n, sink = N, edges = [];
  for (let i = 0; i < N; i++) {
    const x = i % n, y = (i - x) / n;
    if (x < n - 1) edges.push([i, i + 1]);
    if (y < n - 1) edges.push([i, i + n]);
    const deg = (x > 0) + (x < n - 1) + (y > 0) + (y < n - 1);
    for (let k = deg; k < 4; k++) edges.push([i, sink]);
  }
  const parent = Array.from({ length: N + 1 }, (_, i) => i), rank = new Array(N + 1).fill(0);
  const find = i => { while (parent[i] !== i) i = parent[i]; return i; };
  let count = 0;
  (function choose(start, chosen) {
    if (chosen === N) { count++; return; }
    for (let e = start; e <= edges.length - (N - chosen); e++) {
      let a = find(edges[e][0]), b = find(edges[e][1]);
      if (a === b) continue;
      if (rank[a] < rank[b]) [a, b] = [b, a];
      parent[b] = a; const bumped = rank[a] === rank[b]; if (bumped) rank[a]++;
      choose(e + 1, chosen + 1);
      parent[b] = b; if (bumped) rank[a]--;
    }
  })(0, 0);
  return { edges: edges.length, trees: count };
}
// Full-plane single-source pile on a (2R+1)^2 grid, FIFO with floor(h/4) topplings.
function referencePile(N, R) {
  const side = 2 * R + 1, h = new Float64Array(side * side);
  h[R * side + R] = N;
  const odo = stabilizeFIFO(h, side, false);
  let total = 0, extent = 0;
  for (let i = 0; i < h.length; i++) { total += h[i]; if (h[i] > 0) extent = Math.max(extent, Math.abs(i % side - R), Math.abs(Math.floor(i / side) - R)); }
  return { h, side, R, total, extent, topplings: odo.reduce((a, b) => a + b, 0) };
}
// The random-drop experiment replayed from the engine's generator, as startSoc() draws it: initial heights
// rng.int(0, 3) per site, then one site rng.int(0, N - 1) per drop.
function socDraws(seed, n, drops) {
  const rng = Hn.makeRng(seed + '/soc'), N = n * n, h0 = new Int32Array(N), sites = new Int32Array(drops);
  for (let i = 0; i < N; i++) h0[i] = rng.int(0, 3);
  for (let d = 0; d < drops; d++) sites[d] = rng.int(0, N - 1);
  return { h0, sites };
}
// Drop by drop with a FIFO reference that starts from the dropped site and topples once per visit: marks
// (the last drop that toppled each site) and the number of topplings in each avalanche. Then, separately,
// every grain added at once and relaxed in one batch.
function referenceSoc(seed, n, drops) {
  const { h0, sites } = socDraws(seed, n, drops), N = n * n, h = Int32Array.from(h0), marks = new Int32Array(N).fill(-1), sizes = new Int32Array(drops);
  const q = new Int32Array(N), inq = new Uint8Array(N);
  for (let d = 0; d < drops; d++) {
    const i = sites[d];
    if (++h[i] < 4) continue;
    let head = 0, tail = 0, count = 0, size = 0;
    const enqueue = j => { if (!inq[j] && h[j] >= 4) { inq[j] = 1; q[tail] = j; tail = tail + 1 === N ? 0 : tail + 1; count++; } };
    enqueue(i);
    while (count) {
      const p = q[head]; head = head + 1 === N ? 0 : head + 1; count--; inq[p] = 0;
      if (h[p] < 4) continue;
      h[p] -= 4; size++; marks[p] = d;
      const x = p % n, y = (p - x) / n;
      if (x > 0) { h[p - 1]++; enqueue(p - 1); }
      if (x < n - 1) { h[p + 1]++; enqueue(p + 1); }
      if (y > 0) { h[p - n]++; enqueue(p - n); }
      if (y < n - 1) { h[p + n]++; enqueue(p + n); }
      enqueue(p);
    }
    sizes[d] = size;
  }
  const batch = Float64Array.from(h0); for (let d = 0; d < drops; d++) batch[sites[d]]++;
  const batchOdo = stabilizeFIFO(batch, n, false);
  return { heights: h, marks, sizes, batch, batchTopplings: batchOdo.reduce((a, b) => a + b, 0) };
}
const eqArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const sum = a => { let s = 0; for (const v of a) s += v; return s; };
// Total topplings of a single-source pile from its final heights alone: h = N delta_0 - (4I - A) u with u of
// finite support, and (4I - A)|x|^2 = -4 everywhere, so summation by parts gives sum |x|^2 h(x) = 4 sum u(x).
// `at(x, y)` is the final height; everything outside the square of half-side R is empty.
function secondMomentTopplings(at, R) {
  let m = 0;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) m += (x * x + y * y) * at(x, y);
  assert(Number.isSafeInteger(m) && m % 4 === 0, 'second moment ' + m + ' is not a multiple of 4');
  return m / 4;
}
// The numbers the tab put on its status line, read from the HTML it passed to host.setStatus().
function printedNumbers(html) {
  const num = re => { const m = html.match(re); return m ? Number(m[1].replace(/[^0-9.]/g, '')) : null; };
  return { topplings: num(/topplings <b>([^<]+)<\/b>/), largest: num(/largest avalanche <b>([^<]+)<\/b>/), mean: (html.match(/mean <b>([^<]+)<\/b>/) || [])[1] || null,
    drops: num(/drops <b>([^<]+)<\/b>/), html };
}

/* ------------------------------------------------------------------ 1. abelian property */

function abelian() {
  const plain = Hn.load(), counted = Hn.load({ edits: EDITS.odometer }), uneven = Hn.load({ edits: EDITS.uneven }), events = Hn.load({ edits: EDITS.events });
  const rows = [];
  let unevenDetected = 0, unevenConservationBroken = 0, eventsDetected = 0;
  const bySize = {}, byKind = {};
  for (const n of [8, 16, 32, 64]) for (let k = 0; k < 25; k++) {
    const seed = 'sandpile-abelian-' + n + '-' + k, rng = Hn.makeRng(seed), N = n * n, h0 = new Int32Array(N);
    const kind = ['uniform 0..7', 'uniform 0..15', 'all 6', 'central pile', 'uniform 0..7'][k % 5];
    for (let i = 0; i < N; i++) h0[i] = kind === 'uniform 0..15' ? rng.int(0, 15) : kind === 'all 6' ? 6 : kind === 'central pile' ? rng.int(0, 3) : rng.int(0, 7);
    if (kind === 'central pile') h0[rng.int(0, N - 1)] += 4 * N;
    const order = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = rng.int(0, i); [order[i], order[j]] = [order[j], order[i]]; }
    const tab = (loaded, how) => {
      const h = Int32Array.from(h0), top = loaded.hooks.makeGridToppler(n), odo = new Float64Array(N);
      loaded.hooks.odo = odo; let chunks = 1;
      if (how === 'shuffled') { for (const i of order) if (h[i] >= 4) top.push(i); top.run(h, 1e12); }
      else if (how === 'chunked') { top.seedAll(h); while (!top.run(h, -1)) chunks++; }
      else { top.seedAll(h); top.run(h, 1e12); }
      loaded.hooks.odo = null;
      return { h, odo, count: top.topplings(), chunks };
    };
    const o0 = tab(plain, 'lifo'), o1 = tab(counted, 'lifo'), o2 = tab(counted, 'shuffled'), o3 = tab(counted, 'chunked');
    const h4 = Float64Array.from(h0), u4 = stabilizeFIFO(h4, n, true), h5 = Float64Array.from(h0), u5 = stabilizeParallel(h5, n);
    for (const [name, o] of [['tab shuffled', o2], ['tab chunked', o3], ['tab unedited', o0]]) assert(eqArr(o.h, o1.h), 'final heights differ: ' + name + ' ' + seed);
    for (const [name, h] of [['FIFO', h4], ['parallel', h5]]) assert(eqArr(Array.from(h), Array.from(o1.h)), 'final heights differ: ' + name + ' ' + seed);
    for (const [name, u] of [['tab shuffled', o2.odo], ['tab chunked', o3.odo], ['FIFO', u4], ['parallel', u5]]) assert(eqArr(Array.from(u), Array.from(o1.odo)), 'odometers differ: ' + name + ' ' + seed);
    const lap = laplacian(o1.odo, n);
    for (let i = 0; i < N; i++) assert.equal(o1.h[i], h0[i] - lap[i], 'conservation fails at ' + i);
    for (let i = 0; i < N; i++) assert(o1.h[i] >= 0 && o1.h[i] <= 3);
    // the tab's toppling count, in all four of its runs, against the independent FIFO odometer total
    const topplings = sum(u4);
    for (const [name, o] of [['tab LIFO', o1], ['tab shuffled', o2], ['tab chunked', o3], ['tab unedited', o0]]) assert.equal(o.count, topplings, 'toppling count differs from the odometer total: ' + name + ' ' + seed);
    const ev = tab(events, 'lifo'); assert(eqArr(ev.h, o1.h), 'the event counter changed the numerics');
    if (ev.count !== topplings) eventsDetected++;
    // the order-dependent control, run in the tab's own two orders
    const u1 = tab(uneven, 'lifo'), u2 = tab(uneven, 'shuffled');
    const differs = !eqArr(u1.h, u2.h); if (differs) unevenDetected++;
    if (!eqArr(Array.from(u1.h), Array.from(h0).map((v, i) => v - laplacian(u1.odo, n)[i]))) unevenConservationBroken++;
    const b = bySize[n] = bySize[n] || { configurations: 0, unevenDetected: 0, eventCounterDetected: 0 };
    b.configurations++; if (differs) b.unevenDetected++; if (ev.count !== topplings) b.eventCounterDetected++;
    const bk = byKind[kind] = byKind[kind] || { configurations: 0, unevenDetected: 0 }; bk.configurations++; if (differs) bk.unevenDetected++;
    rows.push({ seed, n, kind, grains: h0.reduce((a, v) => a + v, 0), topplings, tabCount: o1.count, eventCounterControl: ev.count, chunks: o3.chunks, finalSha256: Hn.sha256(Buffer.from(o1.h.buffer)), unevenControlDiffers: differs });
  }
  for (const n of Object.keys(bySize)) assert(bySize[n].unevenDetected > 0, 'uneven control not detected at n=' + n);
  for (const n of Object.keys(bySize)) assert(bySize[n].eventCounterDetected > 0, 'event counter control not detected at n=' + n);
  log('PASS abelian: 100 configurations, 5 orders each, identical final states and odometers; h = h0 - Laplacian(odometer) exactly; tab count = odometer total in all 4 tab runs');
  log('PASS control uneven toppling: order dependence detected on ' + unevenDetected + '/100 configurations');
  log('PASS control event counter: count differs from the odometer total on ' + eventsDetected + '/100 configurations');
  return { configurations: rows.length, orders: ['tab LIFO (seedAll)', 'tab, shuffled push order', 'tab, interrupted every 4096 pops', 'independent FIFO, one toppling per visit', 'independent synchronous parallel'],
    identicalStates: true, identicalOdometers: true, conservationExact: true, countEqualsOdometerTotal: true, bySize, byKind,
    eventCounterControl: { description: 'the pre-fix counter: one per pop of the stack, however many topplings floor(h/4) that pop performs', detected: eventsDetected, of: rows.length },
    unevenControl: { description: 'site empties completely; the grains above 4t all go to its first existing neighbor (left, right, up, down)', detected: unevenDetected, of: rows.length,
      note: 'The two tab orders differ only in the order the initially unstable sites are pushed; the central-pile configurations start with one unstable site, so both orders coincide there and the control cannot show a difference on them.', conservationBrokenWithTrueLaplacian: unevenConservationBroken },
    rows };
}

/* ------------------------------------------------------------------ 2. Dhar's theorem */

// Recurrent states of the add-a-grain-and-stabilize chain on all stable configurations (heights 0..maxH),
// using a loaded module's own toppler: the states of the closed communicating classes.
function chainRecurrent(loaded, n, maxH) {
  const N = n * n, base = maxH + 1, S = base ** N, top = loaded.hooks.makeGridToppler(n), succ = new Int32Array(S * N), h = new Int32Array(N);
  let outOfRange = 0;
  for (let s = 0; s < S; s++) for (let i = 0; i < N; i++) {
    let k = s; for (let j = 0; j < N; j++) { h[j] = k % base; k = Math.floor(k / base); }
    if (++h[i] >= 4) top.push(i);
    top.run(h, 1e12);
    let code = 0; for (let j = N - 1; j >= 0; j--) { if (h[j] > maxH || h[j] < 0) outOfRange++; code = code * base + Math.min(maxH, Math.max(0, h[j])); }
    succ[s * N + i] = code;
  }
  // Tarjan's strongly connected components, iterative
  const index = new Int32Array(S).fill(-1), low = new Int32Array(S), on = new Uint8Array(S), comp = new Int32Array(S).fill(-1), stack = [], calls = [];
  let next = 0, nc = 0;
  for (let v0 = 0; v0 < S; v0++) {
    if (index[v0] >= 0) continue;
    index[v0] = low[v0] = next++; stack.push(v0); on[v0] = 1; calls.push([v0, 0]);
    while (calls.length) {
      const frame = calls[calls.length - 1], v = frame[0];
      if (frame[1] < N) {
        const w = succ[v * N + frame[1]++];
        if (index[w] < 0) { index[w] = low[w] = next++; stack.push(w); on[w] = 1; calls.push([w, 0]); }
        else if (on[w]) low[v] = Math.min(low[v], index[w]);
      } else {
        calls.pop();
        if (calls.length) { const u = calls[calls.length - 1][0]; low[u] = Math.min(low[u], low[v]); }
        if (low[v] === index[v]) { let w; do { w = stack.pop(); on[w] = 0; comp[w] = nc; } while (w !== v); nc++; }
      }
    }
  }
  const closed = new Uint8Array(nc).fill(1);
  for (let s = 0; s < S; s++) for (let i = 0; i < N; i++) if (comp[succ[s * N + i]] !== comp[s]) closed[comp[s]] = 0;
  const rec = new Uint8Array(S); let count = 0, classes = 0;
  for (let c = 0; c < nc; c++) classes += closed[c];
  for (let s = 0; s < S; s++) if (closed[comp[s]]) { rec[s] = 1; count++; }
  return { states: S, recurrent: rec, count, closedClasses: classes, outOfRange };
}
function tabIdentity(loaded, n) {
  const host = Hn.instance(loaded, 'sandpile', { mode: 'identity', size: n }), S = loaded.hooks.sandpile, job = S.startIdentity(host.state);
  while (!job.run(1e12));
  const r = S.read();
  return { e: Int32Array.from(r.heights), topples: r.topples };
}
function dhar() {
  const plain = Hn.load(), rows = [];
  for (const n of [1, 2, 3]) {
    const N = n * n, det = reducedLaplacianDet(n, 4), trees = countSpanningTrees(n), chain = chainRecurrent(plain, n, 3);
    assert.equal(chain.outOfRange, 0);
    const { e } = tabIdentity(plain, n), top = plain.hooks.makeGridToppler(n), h = new Int32Array(N);
    let burning = 0, byIdentity = 0, agree = true;
    for (let s = 0; s < chain.states; s++) {
      let k = s; for (let j = 0; j < N; j++) { h[j] = k % 4; k = Math.floor(k / 4); }
      const burns = recurrentByBurning(h, n);
      const c = Int32Array.from(h); for (let j = 0; j < N; j++) c[j] += e[j];
      top.seedAll(c); top.run(c, 1e12);
      const fixed = eqArr(c, h);
      burning += burns; byIdentity += fixed;
      if (burns !== !!chain.recurrent[s] || fixed !== !!chain.recurrent[s]) agree = false;
    }
    assert(agree, 'recurrent sets differ at n=' + n);
    assert(BigInt(chain.count) === det && BigInt(trees.trees) === det && burning === chain.count && byIdentity === chain.count, 'Dhar count fails at n=' + n);
    rows.push({ grid: [n, n], stableConfigurations: chain.states, recurrentByChain: chain.count, closedClasses: chain.closedClasses, recurrentByBurning: burning, recurrentByIdentity: byIdentity,
      identity: Array.from(e), determinant: String(det), spanningTreesByEnumeration: trees.trees, graphEdges: trees.edges, setsIdentical: true });
    log('PASS Dhar ' + n + 'x' + n + ': ' + chain.count + ' recurrent of ' + chain.states + ' (chain, burning, identity agree) = det ' + det + ' = ' + trees.trees + ' spanning trees');
  }
  // Failure controls on the threshold
  const t5 = Hn.load({ edits: EDITS.threshold5 }), t5k = Hn.load({ edits: EDITS.threshold5keep }), controls = [];
  for (const n of [1, 2]) {
    const c5 = chainRecurrent(t5, n, 4), det4 = reducedLaplacianDet(n, 4), det5 = reducedLaplacianDet(n, 5);
    assert(BigInt(c5.count) !== det4, 'threshold-five control was not detected');
    const ck = chainRecurrent(t5k, n, 4);
    // how many of its recurrent configurations hold a height of 4, which the tab's stable range 0..3 excludes
    let withFour = 0;
    for (let s = 0; s < ck.states; s++) if (ck.recurrent[s]) { let k = s, four = false; for (let j = 0; j < n * n; j++) { if (k % 5 === 4) four = true; k = Math.floor(k / 5); } withFour += four; }
    assert(withFour > 0, 'shifted-threshold control is invisible to the stability range');
    controls.push({ grid: [n, n], threshold5Removes5: { recurrent: c5.count, spanningTreeCount: String(det4), detected: true, equalsDet5IminusA: BigInt(c5.count) === det5, det5IminusA: String(det5) },
      threshold5Removes4: { recurrent: ck.count, spanningTreeCount: String(det4), countDetects: BigInt(ck.count) !== det4, recurrentWithAHeightOf4: withFour, stableRangeDetects: withFour > 0,
        note: 'the ordinary sandpile shifted up by one grain; its recurrent count is still det(4I - A), but its stable heights include 4, outside the tab\'s 0..3' } });
    log('PASS control threshold 5 on ' + n + 'x' + n + ': ' + c5.count + ' recurrent, not ' + det4 + ' (= det(5I - A) ' + det5 + ')');
  }
  return { rows, thresholdControls: controls };
}

/* ------------------------------------------------------------------ 3. the identity */

function identity() {
  const plain = Hn.load(), counted = Hn.load({ edits: EDITS.odometer }), rows = [];
  for (const n of [64, 96, 128, 192, 256]) {
    const N = n * n, t0 = Date.now();
    const odoTab = new Float64Array(N); counted.hooks.odo = odoTab;
    const tab = tabIdentity(counted, n); counted.hooks.odo = null;
    const plainTab = tabIdentity(plain, n);
    assert(eqArr(tab.e, plainTab.e), 'odometer side channel changed the identity');
    const e = tab.e;
    // independent computation, with its two odometers
    const h1 = new Float64Array(N).fill(6), u1 = stabilizeFIFO(h1, n, false), h2 = h1.map(v => 6 - v), u2 = stabilizeFIFO(h2, n, false);
    assert(eqArr(Array.from(h2), Array.from(e)), 'identity differs from the independent computation at n=' + n);
    const du = u1.map((v, i) => v - u2[i]), lap = laplacian(du, n);
    for (let i = 0; i < N; i++) assert.equal(lap[i], e[i], 'e is not Laplacian(u1 - u2)');
    for (let i = 0; i < N; i++) assert.equal(odoTab[i], u1[i] + u2[i], 'tab odometer differs from the reference');
    const refTopplings = sum(u1) + sum(u2);
    assert.equal(plainTab.topples, refTopplings, 'identity toppling count differs from the reference odometers');
    assert.equal(tab.topples, refTopplings);
    assert(recurrentByBurning(e, n), 'identity is not recurrent');
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = e[y * n + x];
      assert(v === e[y * n + (n - 1 - x)] && v === e[(n - 1 - y) * n + x] && v === e[x * n + y], 'identity not symmetric');
    }
    const top = plain.hooks.makeGridToppler(n), add = (a, b) => { const c = Int32Array.from(a); for (let i = 0; i < N; i++) c[i] += b[i]; top.seedAll(c); top.run(c, 1e12); return c; };
    assert(eqArr(add(e, e), e), '(e + e) is not e');
    // (2m)° is recurrent but is not the identity: the failure control
    const wrong = Int32Array.from(h1);
    assert(recurrentByBurning(wrong, n));
    const K = n <= 128 ? 3 : 1, tests = [];
    for (let k = 0; k < K; k++) {
      const rng = Hn.makeRng('sandpile-identity-' + n + '-' + k), c0 = new Int32Array(N);
      for (let i = 0; i < N; i++) c0[i] = 3 + rng.int(0, 3);
      top.seedAll(c0); top.run(c0, 1e12);
      assert(recurrentByBurning(c0, n));
      const back = add(c0, e), control = add(c0, wrong);
      assert(eqArr(back, c0), '(c + e) is not c');
      assert(!eqArr(control, c0), 'control identity (2m)° was not detected');
      tests.push({ seed: 'sandpile-identity-' + n + '-' + k, recurrentCSha256: Hn.sha256(Buffer.from(c0.buffer)), cPlusE_equals_c: true, cPlusWrongDiffersAtSites: control.reduce((a, v, i) => a + (v !== c0[i]), 0) });
    }
    const hist = [0, 0, 0, 0]; for (const v of e) hist[v]++;
    rows.push({ grid: [n, n], identitySha256: Hn.sha256(Buffer.from(e.buffer)), heightCounts: hist, equalsIndependent: true, inLaplacianImage: true, recurrent: true, d4Symmetric: true, ePlusE: true,
      topplings: refTopplings, referenceTopplings: [sum(u1), sum(u2)], statusTopplings: plainTab.topples, recurrentTests: tests, seconds: (Date.now() - t0) / 1000 });
    log('PASS identity ' + n + 'x' + n + ': equals the independent e, in the Laplacian image, recurrent, symmetric, idempotent, (c + e) = c on ' + K + '; (2m)° control fails; topplings ' + refTopplings + ' = reference (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  }
  return rows;
}

/* ------------------------------------------------------------------ 4. single source */

// The tab's own pile job (startPile), run to the end: the pile and the toppling count the status line prints.
function tabPile(loaded, N) {
  const host = Hn.instance(loaded, 'sandpile', { mode: 'pile', grains: N }), job = loaded.hooks.sandpile.startPile(host.state);
  while (!job.run(1e12));
  return loaded.hooks.sandpile.read();
}
function singleSource() {
  const plain = Hn.load(), rows = [];
  for (const N of [4096, 16384, 65536, 131072, 262144, 1048576]) {
    const t0 = Date.now(), r = tabPile(plain, N), pile = r.pile;
    const R = pile.R, ext = pile.extent();
    assert.equal(r.radius, ext);
    let total = 0; for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) total += pile.at(x, y);
    assert.equal(total, N, 'grains lost at the truncation radius'); assert(ext < R);
    const moment = secondMomentTopplings(pile.at, R);
    assert.equal(r.topples, moment, 'pile toppling count differs from the second moment of the final pile');
    const row = { grains: N, truncationRadius: R, extent: ext, conserved: true, statusTopplings: r.topples, secondMomentTopplings: moment, seconds: 0 };
    if (N <= 65536) {
      const Rr = Math.ceil(0.45 * Math.sqrt(N)) + 8, ref = referencePile(N, Rr);
      assert.equal(ref.total, N); assert(ref.extent < Rr - 1);
      let cells = 0;
      for (let y = -Rr; y <= Rr; y++) for (let x = -Rr; x <= Rr; x++) { assert.equal(pile.at(x, y), ref.h[(y + Rr) * ref.side + x + Rr], 'octant differs at ' + x + ',' + y); cells++; }
      assert.equal(r.topples, ref.topplings, 'pile toppling count differs from the full-plane reference odometer');
      row.fullPlaneReference = { radius: Rr, extent: ref.extent, cellsCompared: cells, identical: true, topplings: ref.topplings };
    }
    row.seconds = (Date.now() - t0) / 1000;
    rows.push(row);
    log('PASS single source ' + N + ': conserved inside R = ' + R + ' (extent ' + ext + '); topplings ' + r.topples + ' = second moment / 4' + (row.fullPlaneReference ? ' = full-plane reference odometer; heights identical to it on ' + row.fullPlaneReference.cellsCompared + ' cells' : ''));
  }
  // Count controls: the same piles with the pre-fix counter and with the octant counted without its orbit weight.
  const controls = [];
  for (const [name, edits] of [['event counter', EDITS.events], ['octant without orbit weight', EDITS.octantOnly]]) {
    const loaded = Hn.load({ edits });
    for (const N of [4096, 16384, 65536]) {
      const r = tabPile(loaded, N), moment = secondMomentTopplings(r.pile.at, r.pile.R), good = rows.find(x => x.grains === N);
      assert.equal(moment, good.secondMomentTopplings, 'the count control changed the pile');
      const detected = r.topples !== moment;
      assert(detected, 'count control ' + name + ' not detected at ' + N);
      controls.push({ control: name, grains: N, printed: r.topples, secondMomentTopplings: moment, detected });
      log('PASS control ' + name + ' at ' + N + ': prints ' + r.topples + ', not ' + moment);
    }
  }
  return { rows, countControls: controls };
}

/* ------------------------------------------------------------------ 5. random drops */

function randomDrops() {
  const plain = Hn.load(), counted = Hn.load({ edits: EDITS.sizes }), events = Hn.load({ edits: EDITS.events }), rows = [];
  for (const [n, drops, seed] of [[128, 30000, 'btw-1987'], [192, 50000, 'sandpile-soc-192']]) {
    const run = loaded => { const host = Hn.instance(loaded, 'sandpile', { mode: 'soc', size: n, drops, seed }), job = loaded.hooks.sandpile.startSoc(host.state); while (!job.run(1e12)); return { ...loaded.hooks.sandpile.read() }; };
    const N = n * n, odo = new Float64Array(N), sizes = []; counted.hooks.odo = odo; counted.hooks.sizes = sizes;
    const a = run(counted); counted.hooks.odo = null; counted.hooks.sizes = null;
    const b = run(plain);
    assert(eqArr(a.heights, b.heights) && eqArr(a.marks, b.marks) && a.topples === b.topples && a.maxAv === b.maxAv && a.sumAv === b.sumAv, 'side channels changed the run');
    const ref = referenceSoc(seed, n, drops);
    assert(eqArr(Array.from(b.heights), Array.from(ref.batch)), 'drop-by-drop heights differ from one batch relaxation');
    assert(eqArr(Array.from(b.heights), Array.from(ref.heights)), 'heights differ from the reference');
    assert(eqArr(Array.from(b.marks), Array.from(ref.marks)), 'avalanche marks differ from the reference');
    const topplings = sum(odo), refTopplings = sum(ref.sizes);
    assert.equal(topplings, refTopplings); assert.equal(topplings, ref.batchTopplings);
    const maxRef = Math.max(...ref.sizes);
    // every avalanche the tab counted, in drop order, against the reference (drops with no toppling carry no size)
    const refSizes = Array.from(ref.sizes).filter(s => s > 0);
    assert(eqArr(sizes, refSizes), 'avalanche sizes differ from the reference');
    assert.equal(b.topples, refTopplings, 'printed topplings differ from the reference');
    assert.equal(b.sumAv, refTopplings, 'avalanche sum differs from the reference');
    assert.equal(b.maxAv, maxRef, 'largest avalanche differs from the reference');
    const c = run(events);
    assert(eqArr(c.heights, b.heights) && eqArr(c.marks, b.marks), 'the event counter changed the run');
    const eventDetected = c.topples !== refTopplings || c.maxAv !== maxRef || c.sumAv !== refTopplings;
    assert(eventDetected, 'event counter control not detected');
    rows.push({ grid: [n, n], drops, seed, heightsEqualBatchRelaxation: true, marksEqualReference: true, avalancheSizesEqualReference: true, topplings,
      statusTopplings: b.topples, statusSumAv: b.sumAv, statusMaxAv: b.maxAv, statusMean: (b.sumAv / drops).toFixed(1),
      referenceMaxAvalancheTopplings: maxRef, avalanches: refSizes.length,
      eventCounterControl: { topplings: c.topples, maxAv: c.maxAv, sumAv: c.sumAv, detected: eventDetected } });
    log('PASS random drops ' + n + 'x' + n + ', ' + drops + ' drops: heights = one batch relaxation, marks identical; ' + refSizes.length + ' avalanche sizes, largest ' + maxRef + ' and topplings ' + topplings + ' = reference');
    log('PASS control event counter ' + n + 'x' + n + ': prints topplings ' + c.topples + ', largest ' + c.maxAv + ', not ' + topplings + ', ' + maxRef);
  }
  return rows;
}

/* ------------------------------------------------------------------ 6. print */

function colorsFor(st, lut0, lut) {
  const bg = [parseInt(st.bg.slice(1, 3), 16), parseInt(st.bg.slice(3, 5), 16), parseInt(st.bg.slice(5, 7), 16)];
  const at = (L, t) => { const li = (Math.min(1, Math.max(0, t)) * 255 | 0) * 3; return [L[li], L[li + 1], L[li + 2]]; };
  const col = st.zero === 'ink' ? [at(lut0, 0), at(lut0, 1 / 3), at(lut0, 2 / 3), at(lut0, 1)] : [bg, at(lut0, 0), at(lut0, 0.5), at(lut0, 1)];
  return { bg, col, at };
}
function expectedBuffer(st, heights, marks, drops, bw, bh, lut0, lut) {
  const { bg, col, at } = colorsFor(st, lut0, lut), out = new Uint8ClampedArray(bw * bh * 3);
  const soc = st.mode === 'soc' && st.view !== 'grains' && marks;
  for (let i = 0; i < bw * bh; i++) {
    let k = col[Math.min(3, heights[i] | 0)];
    if (soc) {
      const m = marks[i], age = m < 0 ? Infinity : drops - 1 - m;
      if (st.view === 'patches') k = m < 0 ? bg : at(lut, 0.15 + 0.85 * ((m * 0.6180339887) % 1));
      else if (age < st.memory) k = at(lut, 0.2 + 0.8 * (1 - age / st.memory));
      else k = [k[0] * 0.5 + bg[0] * 0.5, k[1] * 0.5 + bg[1] * 0.5, k[2] * 0.5 + bg[2] * 0.5];
    }
    out[i * 3] = k[0]; out[i * 3 + 1] = k[1]; out[i * 3 + 2] = k[2];
  }
  return out;
}
async function prints() {
  const { chromium } = require('playwright');
  const studio = Hn.auditStudio(), browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const cases = [];
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + studio.file + '#sandpile/review');
    await page.evaluate(() => Studio.ready);
    const fixtures = [
      { name: 'default (medallion 2^16)', palette: 'kiln', params: { mode: 'pile', grains: 65536, zero: 'paper', view: 'grains' } },
      { name: 'preset small 2^14', palette: 'risograph', params: { mode: 'pile', grains: 16384, zero: 'ink', view: 'grains' } },
      { name: 'preset identity 128', palette: 'graphite', params: { mode: 'identity', size: 128, zero: 'paper', view: 'grains' } },
      { name: 'preset identity 96', palette: 'tram', params: { mode: 'identity', size: 96, zero: 'ink', view: 'grains' } },
      { name: 'preset random drops', palette: 'ember', params: { mode: 'soc', size: 128, drops: 30000, view: 'avalanche', memory: 100, zero: 'paper' } },
      { name: 'preset avalanche patches', palette: 'thermal', params: { mode: 'soc', size: 192, drops: 50000, view: 'patches', memory: 100, zero: 'paper' } },
    ];
    for (let k = 0; k < fixtures.length; k++) {
      const fx = fixtures[k], seed = 'sandpile-print-' + k;
      const pal = await page.evaluate(name => Studio.PALETTES[name], fx.palette);
      const params = { ...fx.params, grain: 0, palette: pal.colors, bg: pal.bg, v: 2 };
      await page.evaluate(({ seed, params }) => { location.hash = 'sandpile/' + seed + '/' + btoa(JSON.stringify(params)); }, { seed, params });
      await page.waitForFunction(({ seed, mode }) => { const r = Studio.getRecipe(); const e = Studio.auditInstances().sandpile; return r && r.seed === seed && e && e.state.mode === mode && e.inst.auditRead().done; }, { seed, mode: params.mode }, { timeout: 300000 });
      const a = await page.evaluate(() => Studio.auditInstances().sandpile.inst.auditRead());
      const st = await page.evaluate(() => JSON.parse(JSON.stringify(Studio.auditInstances().sandpile.state)));
      for (const key of Object.keys(fx.params)) assert.deepEqual(st[key], fx.params[key], 'recipe key ' + key);
      const luts = await page.evaluate(s => [Array.from(Studio.util.makeRampLUT(s.palette, null, 256)), Array.from(Studio.util.makeRampLUT(s.palette, s.bg, 256))], st);
      const printed = printedNumbers(await page.evaluate(() => Studio.auditInstances().sandpile.statusHtml));
      let heights, marks = null, state, expectedPrinted;
      if (st.mode === 'pile') {
        const Rr = Math.ceil(0.45 * Math.sqrt(st.grains)) + 8, ref = referencePile(st.grains, Rr), c = (a.bw - 1) / 2;
        expectedPrinted = { topplings: ref.topplings };
        assert.equal(a.radius, ref.extent); assert.equal(a.bw, 2 * (ref.extent + 3) + 1);
        heights = new Float64Array(a.bw * a.bh);
        for (let y = 0; y < a.bh; y++) for (let x = 0; x < a.bw; x++) { const X = x - c, Y = y - c; heights[y * a.bw + x] = Math.abs(X) <= Rr && Math.abs(Y) <= Rr ? ref.h[(Y + Rr) * ref.side + X + Rr] : 0; }
        assert(eqArr(a.pileGrid, Array.from(heights)), 'studio pile differs from the full-plane reference');
        state = { grains: st.grains, radius: a.radius, crop: [a.bw, a.bh] };
      } else if (st.mode === 'identity') {
        const n = st.size, h1 = new Float64Array(n * n).fill(6), u1 = stabilizeFIFO(h1, n, false);
        heights = h1.map(v => 6 - v); const u2 = stabilizeFIFO(heights, n, false);
        expectedPrinted = { topplings: sum(u1) + sum(u2) };
        assert(eqArr(a.heights, Array.from(heights)), 'studio identity differs from the independent computation');
        state = { n };
      } else {
        const ref = referenceSoc(seed, st.size, st.drops);
        heights = ref.heights; marks = ref.marks;
        const total = sum(ref.sizes);
        expectedPrinted = { topplings: total, largest: Math.max(...ref.sizes), mean: (total / st.drops).toFixed(1), drops: st.drops };
        assert(eqArr(a.heights, Array.from(heights)) && eqArr(a.marks, Array.from(marks)) && a.drops === st.drops, 'studio random drops differ from the reference');
        state = { n: st.size, drops: st.drops };
      }
      for (const key of Object.keys(expectedPrinted)) assert.equal(printed[key], expectedPrinted[key], 'printed ' + key + ' differs from the reference: ' + printed[key] + ' against ' + expectedPrinted[key]);
      const expected = expectedBuffer(st, heights, marks, st.drops, a.bw, a.bh, luts[0], luts[1]);
      // wrong-state control: the same recipe painted from a state with every height moved up one level (3 wraps
      // to 0) and every avalanche mark moved one drop later
      const shiftedHeights = Array.from(heights, v => ((v | 0) + 1) % 4), shiftedMarks = marks && Int32Array.from(marks, m => m < 0 ? m : m + 1);
      const ctl = expectedBuffer(st, shiftedHeights, shiftedMarks, st.drops, a.bw, a.bh, luts[0], luts[1]);
      const before = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), a: Studio.auditInstances().sandpile.inst.auditRead() }));
      const print = await page.evaluate(Hn.PRINT_CHECK, { id: 'sandpile', w: 2400, h: 2400, bw: a.bw, bh: a.bh, expected: Array.from(expected), controls: [Array.from(ctl)] });
      const after = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), a: Studio.auditInstances().sandpile.inst.auditRead() }));
      assert.equal(after, before, 'export changed the state');
      assert(print.maxChannelError <= 1 && print.nearBoundaryFailures === 0 && print.opaque, 'exported pixels differ from the independent picture: ' + JSON.stringify(print));
      assert(print.displacedControlFailingPixels > 1000 && print.wrongStateControlFailingPixels[0] > 1000, 'print controls must fail');
      cases.push({ name: fx.name, seed, parameters: st, state, heightsSha256: Hn.sha256(Buffer.from(Float64Array.from(heights).buffer)), stateMatchesIndependent: true,
        printedStatus: printed, printedStatusReference: expectedPrinted, printedStatusEqualsReference: true, print, statePreserved: true });
      log('PASS print ' + fx.name + ': printed ' + Object.keys(expectedPrinted).map(k => k + ' ' + printed[k]).join(', ') + ' = reference; ' + print.pixels.toLocaleString() + ' pixels, max channel error ' + print.maxChannelError + ', ' + print.nearBoundaryPixels + ' near-boundary pixels (' + print.nearBoundaryShowingNeighborCell + ' show the neighbor cell); displaced control ' + print.displacedControlFailingPixels + ', wrong-state control ' + print.wrongStateControlFailingPixels[0]);
    }
    assert.deepEqual(errors, []);
    return { cases, chromium: browser.version() };
  } finally { await browser.close(); studio.cleanup(); }
}

/* ------------------------------------------------------------------ main */

async function main() {
  const t0 = Date.now();
  if (PRINT_ONLY) { assert(!WRITE); await prints(); return; }
  const timed = (name, f) => { const t = Date.now(), r = f(); log('  (' + name + ' ' + ((Date.now() - t) / 1000).toFixed(0) + ' s)'); return r; };
  const abelianResult = timed('abelian', abelian);
  const dharResult = timed('Dhar', dhar);
  const identityResult = timed('identity', identity);
  const pileResult = timed('single source', singleSource);
  const socResult = timed('random drops', randomDrops);
  const printResult = await prints();
  const result = {
    date: new Date().toISOString().slice(0, 10), tool: 'tools/sandpile-science.js', sourceSha256: Hn.sha256(Hn.source), engineSha256: Hn.sha256(Hn.engine),
    scope: 'Abelian sandpile tab (id sandpile, src/modules/lattice.js), square n x n grid with sink boundary: exact abelian property in five toppling orders; exact Dhar count on 1x1, 2x2, 3x3 by three recurrence tests against the reduced-Laplacian determinant and a spanning-tree enumeration; the identity at every UI grid; the octant single-source pile against a full plane; random drops against batch relaxation; the toppling counts, avalanche sizes and printed status numbers against independent odometers; six exported prints. All results are exact integer comparisons; there is no sampling error.',
    abelian: abelianResult, dhar: dharResult, identity: identityResult, singleSource: pileResult, randomDrops: socResult, print: printResult.cases,
    environment: { node: process.version, chromium: printResult.chromium, platform: process.platform, cpus: os.cpus().length }, seconds: (Date.now() - t0) / 1000, passed: true,
  };
  if (WRITE) fs.writeFileSync(path.join(Hn.root, 'validation/results/sandpile-science.json'), JSON.stringify(result, null, 1) + '\n');
  log('PASS sandpile exact benchmarks and print review (' + result.seconds.toFixed(0) + ' s)');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
