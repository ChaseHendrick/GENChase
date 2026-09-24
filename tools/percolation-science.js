'use strict';
// node tools/percolation-science.js [--write] [--quick]
//
// Exact benchmark and print evidence for the percolation tab (src/modules/lattice.js), in the pattern of
// tools/ust-review.js. Everything numerical runs the tab's own code: the module is loaded in Node through
// tools/lib/lattice-harness.js, and its ensureField() (the seeded random field) and label() (Hoshen-Kopelman
// by union-find) are called directly. The print part reads the state back from the real studio through an
// auditRead() injected into a temporary copy of dist/studio.html and decodes the tab's own exportPNG().
//
//   1. Partitions. On 240 seeded lattices (both types, all five grid sizes and aspects, p across the slider
//      range) the tab's clusters must equal an independent breadth-first labeling exactly: every site's
//      cluster, every size, the cluster count, the largest size, the spanning decision and the lit cluster.
//      Failure control: the same labeler with diagonal neighbors injected must disagree on every site lattice.
//   2. The sweep. Changing p must reuse the same field, only add sites (or bonds) and only merge clusters.
//   3. Thresholds. Each independent seed has one exact p at which its lattice first spans top to bottom. An
//      independent Newman-Ziff style reference finds it, and the tab's labeler must not span just below it and
//      must span just above it; for the first 50 seeds of every size the tab's labeler alone finds it by
//      bisection over the field's own values and must agree exactly (see thresholdWorker). The spanning
//      probability R_L(p) is then the
//      fraction of seeds whose threshold is below p, reported with binomial errors, and the crossing of the
//      R_L curves for L = 128, 256, 512 is located with a bootstrap over seeds.
//      Bond: the crossing must be consistent with Kesten's exact 1/2. Site: reported against 0.592746.
//      Failure controls: diagonal neighbors (site) and a 10 per cent bias on vertical bonds (bond) must move
//      the crossing far outside its error bar.
//   4. Print. Five recipes, including four presets, at 8 in and 300 ppi: every exported pixel must equal the
//      color computed from the independent labeling, and exporting must leave the state unchanged.
//
// --quick uses a tenth of the seeds for a fast smoke run; it never writes results.
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const Hn = require('./lib/lattice-harness');

const PC_SITE = 0.592746, PC_BOND = 0.5;
// The tab credits 0.592746 ("about"). Newman and Ziff, Phys. Rev. Lett. 85, 4104 (2000), give 0.59274621(13).
// The reference uncertainty used below is the rounding of the tab's quoted value, 5e-7, far below our error bars.
const PC_SITE_UNCERTAINTY = 5e-7;

// Deliberately wrong rules, injected into a copy of the module for the failure controls.
const EDITS = {
  none: [],
  diagonal: [['if (y > 0 && field[i - W] < p) unite(parent, i, i - W);',
    'if (y > 0 && field[i - W] < p) unite(parent, i, i - W);\n' +
    '            if (x > 0 && y > 0 && field[i - W - 1] < p) unite(parent, i, i - W - 1);\n' +
    '            if (x < W - 1 && y > 0 && field[i - W + 1] < p) unite(parent, i, i - W + 1);', 'diagonal neighbors in the site labeler']],
  anisotropic: [['if (y < H - 1 && bonds[i * 2 + 1] < p) unite(parent, i, i + W);',
    'if (y < H - 1 && bonds[i * 2 + 1] < 0.9 * p) unite(parent, i, i + W);', 'vertical bonds open with probability 0.9 p']],
};

/* ------------------------------------------------------------------ independent references */

// Breadth-first labeling written from the definitions, sharing no code with the module. Site: site i is
// occupied iff field[i] < p; occupied nearest neighbors connect. Bond: every site is present; the bond to the
// right of site i is open iff bonds[2i] < p, the bond below iff bonds[2i + 1] < p. A cluster's label is its
// smallest site index. Returns labels (-1 for empty sites) and per-label size, top and bottom contact.
function bfsLabel(W, H, type, p, field, bonds) {
  const N = W * H, lab = new Int32Array(N).fill(-1), queue = new Int32Array(N), bond = type === 'bond';
  const occupied = i => bond || field[i] < p;
  const size = new Map(), top = new Set(), bottom = new Set();
  let head = 0, tail = 0, s0 = 0;
  const visit = j => { if (lab[j] < 0 && occupied(j)) { lab[j] = s0; queue[tail++] = j; } };
  for (s0 = 0; s0 < N; s0++) {
    if (lab[s0] >= 0 || !occupied(s0)) continue;
    head = 0; tail = 0;
    queue[tail++] = s0; lab[s0] = s0;
    while (head < tail) {
      const i = queue[head++], x = i % W, y = (i - x) / W;
      if (y === 0) top.add(s0);
      if (y === H - 1) bottom.add(s0);
      if (bond) {
        if (x + 1 < W && bonds[2 * i] < p) visit(i + 1);
        if (x > 0 && bonds[2 * (i - 1)] < p) visit(i - 1);
        if (y + 1 < H && bonds[2 * i + 1] < p) visit(i + W);
        if (y > 0 && bonds[2 * (i - W) + 1] < p) visit(i - W);
      } else {
        if (x + 1 < W) visit(i + 1);
        if (x > 0) visit(i - 1);
        if (y + 1 < H) visit(i + W);
        if (y > 0) visit(i - W);
      }
    }
    size.set(s0, tail);
  }
  let lit = -1, maxSize = 0;
  const spanning = [];
  for (const [k, n] of size) {
    if (n > maxSize) maxSize = n;
    if (top.has(k) && bottom.has(k)) { spanning.push(k); if (lit < 0 || n > size.get(lit)) lit = k; }
  }
  const litTie = spanning.some(k => k !== lit && size.get(k) === size.get(lit));
  return { lab, size, spanning, lit, litTie, nClusters: size.size, maxSize };
}

// Newman-Ziff style threshold: add sites (or bonds) in increasing order of their random value, merging with
// a separate union-find that carries top and bottom flags; the answer is the value whose addition first
// joins the top row to the bottom row. Ties need no care: the first spanning value is the same in any order.
function referenceThreshold(W, H, type, field, bonds) {
  const N = W * H, parent = new Int32Array(N), flags = new Uint8Array(N), on = new Uint8Array(N);
  for (let i = 0; i < N; i++) { parent[i] = i; flags[i] = (i < W ? 1 : 0) | (i >= N - W ? 2 : 0); }
  const find = i => { let r = i; while (parent[r] !== r) r = parent[r]; while (parent[i] !== r) { const n = parent[i]; parent[i] = r; i = n; } return r; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) { parent[a] = b; flags[b] |= flags[a]; } return flags[b] === 3; };
  // Sort by value with the index packed below it: every field value is a multiple of 2^-32 (a 32-bit draw
  // rounded to float32), so value * 2^52 + index is an exact double for indices below 2^20.
  const values = type === 'bond' ? bonds : field, n = values.length, keys = new Float64Array(n);
  let integral = n <= 1 << 20;
  for (let i = 0; i < n; i++) { const t = values[i] * 4294967296; integral = integral && t === Math.floor(t); keys[i] = t * 1048576 + i; }
  if (!integral) throw new Error('field values are not multiples of 2^-32');
  keys.sort();
  for (let k = 0; k < n; k++) {
    const idx = keys[k] % 1048576, v = values[idx];
    if (type === 'bond') {
      const i = idx >> 1, x = i % W, y = (i - x) / W;
      if (idx & 1) { if (y + 1 < H && join(i, i + W)) return v; }
      else if (x + 1 < W && join(i, i + 1)) return v;
    } else {
      const i = idx, x = i % W;
      on[i] = 1;
      let span = flags[i] === 3 && parent[i] === i;
      if (x > 0 && on[i - 1] && join(i, i - 1)) span = true;
      if (x + 1 < W && on[i + 1] && join(i, i + 1)) span = true;
      if (i >= W && on[i - W] && join(i, i - W)) span = true;
      if (i + W < N && on[i + W] && join(i, i + W)) span = true;
      if (span) return v;
    }
  }
  return Infinity;
}

// The tab's own field, regenerated from the engine's generator exactly as ensureField() draws it.
function drawField(seed, W, H) {
  const rng = Hn.makeRng(seed + '/perc'), field = new Float32Array(W * H), bonds = new Float32Array(W * H * 2);
  for (let i = 0; i < W * H; i++) field[i] = rng();
  for (let i = 0; i < W * H * 2; i++) bonds[i] = rng();
  return { field, bonds };
}
const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
const gridDims = (grid, aspect) => [grid & ~1, Math.max(64, Math.round(grid * ASPECTS[aspect])) & ~1];

/* ------------------------------------------------------------------ worker: thresholds by the tab's labeler */

// Each seed's threshold v* is the smallest field value at which the lattice spans; the tab spans at p exactly
// when p > v* (occupancy is field < p). Two ways to get it with the tab's code:
//   bisect  - the tab's labeler alone, by bisection over the sorted distinct field values (about 17 to 20
//             label() calls per seed). Used for the failure controls, which have no reference, and for the
//             first `bisectSeeds` seeds of every main run, where the result must equal the reference.
//   bracket - the reference finds v*, and the tab's labeler must report no spanning at p = v* (the
//             configuration strictly below v*) and spanning just above v* (midway to the next field value).
//             With the monotone sweep (checked on the report grid for the first `gridCheck` seeds, and in
//             section 2) this fixes the tab's spanning indicator for every p, at two label() calls per seed.
function thresholdWorker({ edits, type, L, seeds, gridPs, gridCheck, bisectSeeds, withReference }) {
  const loaded = Hn.load({ edits: EDITS[edits] }), host = Hn.instance(loaded, 'percolation', {}), P = loaded.hooks.percolation;
  const out = [], mismatches = [];
  let labelCalls = 0, gridChecked = 0, bisected = 0, bracketed = 0;
  const spans = (s, p) => { s.p = p; P.label(s); labelCalls++; return P.read().spanRoot >= 0; };
  seeds.forEach((seed, k) => {
    const s = { seed, type, grid: L, aspect: '1:1', p: 0.5 };
    host.state = s; P.ensureField(s);
    const r = P.read(), values = type === 'bond' ? r.bonds : r.field;
    let v;
    if (!withReference || k < bisectSeeds) {
      const sortedValues = Float64Array.from(values).sort(), u = [];
      for (const x of sortedValues) if (!u.length || u[u.length - 1] !== x) u.push(x);
      const above = j => spans(s, j + 1 < u.length ? (u[j] + u[j + 1]) / 2 : u[j] + 1e-9);
      let lo = 0, hi = u.length - 1;
      if (!above(hi)) { out.push(Infinity); return; }
      while (lo < hi) { const mid = (lo + hi) >> 1; if (above(mid)) hi = mid; else lo = mid + 1; }
      v = u[lo]; bisected++;
      if (withReference) { const ref = referenceThreshold(r.W, r.H, type, r.field, r.bonds); if (ref !== v) mismatches.push({ seed, tab: v, reference: ref }); }
    } else {
      v = referenceThreshold(r.W, r.H, type, r.field, r.bonds);
      let next = Infinity; for (let i = 0; i < values.length; i++) if (values[i] > v && values[i] < next) next = values[i];
      if (spans(s, v)) mismatches.push({ seed, bracket: 'spans below the reference threshold' });
      if (!spans(s, next < Infinity ? (v + next) / 2 : v + 1e-9)) mismatches.push({ seed, bracket: 'does not span above the reference threshold' });
      bracketed++;
    }
    out.push(v);
    if (k < gridCheck) {
      // monotone sweep: on the report grid the tab must span exactly when p exceeds the threshold
      for (const p of gridPs) if (spans(s, p) !== (v < p)) mismatches.push({ seed, p, gridCheck: true });
      gridChecked++;
    }
  });
  return { thresholds: out, mismatches, labelCalls, gridChecked, bisected, bracketed };
}
if (!isMainThread) {
  parentPort.on('message', job => parentPort.postMessage({ id: job.id, result: thresholdWorker(job) }));
  return;
}

/* ------------------------------------------------------------------ main thread */

const WRITE = process.argv.includes('--write'), QUICK = process.argv.includes('--quick');
assert(!(WRITE && QUICK), '--quick never writes results');
const scale = QUICK ? 0.1 : 1;
const log = (...a) => console.log(...a);

function pool(size) {
  const workers = Array.from({ length: size }, () => new Worker(__filename)), waiting = new Map();
  let next = 0;
  for (const w of workers) w.on('message', m => { waiting.get(m.id)(m.result); waiting.delete(m.id); });
  for (const w of workers) w.on('error', e => { throw e; });
  const run = (job, w) => new Promise(res => { const id = next++; waiting.set(id, res); w.postMessage({ ...job, id }); });
  return {
    async map(jobs) {
      const results = new Array(jobs.length); let k = 0;
      await Promise.all(workers.map(async w => { while (k < jobs.length) { const j = k++; results[j] = await run(jobs[j], w); } }));
      return results;
    },
    close: () => Promise.all(workers.map(w => w.terminate())),
  };
}

// Thresholds for M seeds, split into chunks over the worker pool, returned in seed order.
async function thresholds(P, { edits, type, L, M, prefix, gridPs, gridCheck, bisectSeeds = 0, withReference }) {
  const seeds = Array.from({ length: M }, (_, i) => prefix + '/' + type + '/L' + L + '/' + i), chunk = 25, jobs = [];
  for (let i = 0; i < M; i += chunk) jobs.push({ edits, type, L, seeds: seeds.slice(i, i + chunk), gridPs, gridCheck: Math.max(0, gridCheck - i), bisectSeeds: Math.max(0, bisectSeeds - i), withReference });
  const t0 = Date.now(), parts = await P.map(jobs);
  const v = parts.flatMap(p => p.thresholds), mismatches = parts.flatMap(p => p.mismatches);
  return { type, L, edits, M, seedPattern: prefix + '/' + type + '/L' + L + '/<0..' + (M - 1) + '>', thresholds: v, mismatches,
    labelCalls: parts.reduce((a, p) => a + p.labelCalls, 0), gridChecked: parts.reduce((a, p) => a + p.gridChecked, 0),
    bisectedByTabAlone: parts.reduce((a, p) => a + p.bisected, 0), bracketedByTab: parts.reduce((a, p) => a + p.bracketed, 0), seconds: (Date.now() - t0) / 1000 };
}

/* ---- statistics on thresholds ---- */
const sorted = a => Float64Array.from(a).sort();
function cdf(sortedV, p) { let lo = 0, hi = sortedV.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sortedV[m] < p) lo = m + 1; else hi = m; } return lo / sortedV.length; }
function wilson(k, n, z = 1.959964) {
  const ph = k / n, d = 1 + z * z / n, c = (ph + z * z / (2 * n)) / d, h = z * Math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)) / d;
  return [c - h, c + h];
}
function sdOf(a) { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); }
// Crossing of R_a and R_b (b the larger lattice): D(p) = R_b(p) - R_a(p) is sampled on 41 points across
// [c - w, c + w], a quadratic is fitted by least squares and its root nearest c becomes the new center; five
// passes from the median of b. Centering the window on the root makes the even-order curvature of D enter
// the root only at fourth order, which a straight-line fit does not achieve (it was biased by 3e-4 on the
// synthetic check below). The half-width w is half the standard deviation of b's thresholds, fixed from the
// full sample: a stated rule, not a tuned one.
function crossing(a, b, w) {
  let c = b[b.length >> 1];
  for (let pass = 0; pass < 5; pass++) {
    const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r = [0, 0, 0];
    for (let k = 0; k <= 40; k++) {
      const x = k / 20 - 1, p = c + w * x, y = cdf(b, p) - cdf(a, p), f = [1, x, x * x];
      for (let i = 0; i < 3; i++) { r[i] += f[i] * y; for (let j = 0; j < 3; j++) m[i][j] += f[i] * f[j]; }
    }
    const [A, B, C] = solve3(m, r);
    let x;
    if (Math.abs(C) < 1e-12 * Math.abs(B)) x = -A / B;
    else { const disc = B * B - 4 * A * C; if (!(disc >= 0)) return NaN; const q = -0.5 * (B + Math.sign(B) * Math.sqrt(disc)); x = [q / C, A / q].reduce((u, v) => Math.abs(u) < Math.abs(v) ? u : v); }
    if (!(B > 0) || !Number.isFinite(x)) return NaN;
    c += w * Math.max(-1, Math.min(1, x));
  }
  return c;
}
function solve3(m, r) { // Cramer's rule for the 3x3 normal equations
  const det = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const d = det(m);
  return [0, 1, 2].map(k => det(m.map((row, i) => row.map((v, j) => j === k ? r[i] : v))) / d);
}
// Ordinary bootstrap over seeds (independent seeds, so no blocking is needed), with a seeded generator.
function bootstrap(samples, stat, reps, seed) {
  const rng = Hn.makeRng(seed), draws = [];
  for (let r = 0; r < reps; r++) {
    const res = samples.map(s => { const o = new Float64Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s[Math.floor(rng() * s.length)]; return o.sort(); });
    const v = stat(res); if (Number.isFinite(v)) draws.push(v);
  }
  draws.sort((x, y) => x - y);
  return { se: sdOf(draws), lo: draws[Math.round(0.025 * (draws.length - 1))], hi: draws[Math.round(0.975 * (draws.length - 1))], reps: draws.length };
}
function medianCI(s) { // distribution-free 95% interval from order statistics
  const n = s.length, j = Math.max(0, Math.floor(n / 2 - 0.98 * Math.sqrt(n))), k = Math.min(n - 1, Math.ceil(n / 2 + 0.98 * Math.sqrt(n)));
  return { median: s[n >> 1], lo: s[j], hi: s[k], method: 'order statistics, binomial 95%' };
}

/* ------------------------------------------------------------------ 1. partitions */

function partitions() {
  const ok = Hn.load(), diag = Hn.load({ edits: EDITS.diagonal });
  const hostA = Hn.instance(ok, 'percolation', {}), hostB = Hn.instance(diag, 'percolation', {});
  const grids = [128, 192, 256, 384, 512], aspects = Object.keys(ASPECTS), rng = Hn.makeRng('perc-partition-p');
  const sitePs = [0.3, 0.45, 0.55, 0.58, 0.5927, 0.6, 0.62, 0.7, 0.8], bondPs = [0.3, 0.4, 0.47, 0.49, 0.5, 0.51, 0.53, 0.6, 0.8];
  const rows = [];
  let diagonalDiffers = 0, siteLattices = 0, sitesCompared = 0, spanning = 0, litTies = 0;
  for (let k = 0; k < 240; k++) {
    const type = k % 2 ? 'bond' : 'site', grid = grids[(k >> 1) % 5], aspect = aspects[Math.floor(k / 10) % 5];
    const list = type === 'site' ? sitePs : bondPs, p = k % 20 < 18 ? list[(k >> 1) % list.length] : +(0.3 + 0.5 * rng()).toFixed(4);
    const seed = 'perc-partition-' + k, s = { seed, type, grid, aspect, p };
    hostA.state = s; ok.hooks.percolation.ensureField(s); ok.hooks.percolation.label(s);
    const t = ok.hooks.percolation.read(), [W, H] = gridDims(grid, aspect);
    assert.equal(t.W, W); assert.equal(t.H, H);
    const f = drawField(seed, W, H);
    assert.deepEqual(t.field, f.field, 'field is the engine stream'); assert.deepEqual(t.bonds, f.bonds);
    const ref = bfsLabel(W, H, type, p, f.field, f.bonds), same = compareTab(t, ref);
    assert(same.equal, 'partition mismatch on ' + seed + ': ' + same.why);
    sitesCompared += W * H; if (ref.lit >= 0) spanning++; if (ref.litTie) litTies++;
    rows.push({ seed, type, grid: [W, H], aspect, p, clusters: ref.nClusters, largest: ref.maxSize, spanning: ref.lit >= 0 });
    if (type === 'site') {
      siteLattices++;
      hostB.state = s; diag.hooks.percolation.ensureField(s); diag.hooks.percolation.label(s);
      if (!compareTab(diag.hooks.percolation.read(), ref).equal) diagonalDiffers++;
    }
  }
  assert.equal(diagonalDiffers, siteLattices, 'diagonal control must change every site partition');
  log('PASS partitions: 240 lattices, ' + sitesCompared.toLocaleString() + ' sites identical to breadth-first labeling; diagonal control differs on ' + diagonalDiffers + '/' + siteLattices);
  return { lattices: rows.length, sitesCompared, spanningLattices: spanning, litClusterTies: litTies, identical: true,
    diagonalControl: { siteLattices, partitionsChanged: diagonalDiffers }, rows };
}
// Compare the tab's labeling state with the breadth-first reference, exactly.
function compareTab(t, ref) {
  const N = t.W * t.H, minOf = new Map();
  for (let i = 0; i < N; i++) { const r = t.parent[i]; if (r >= 0 && !minOf.has(r)) minOf.set(r, i); }
  for (let i = 0; i < N; i++) {
    const r = t.parent[i], canon = r < 0 ? -1 : minOf.get(r);
    if (canon !== ref.lab[i]) return { equal: false, why: 'site ' + i };
    if (r >= 0 && t.size[r] !== ref.size.get(canon)) return { equal: false, why: 'size at ' + i };
  }
  if (t.nClusters !== ref.nClusters || t.maxSize !== ref.maxSize) return { equal: false, why: 'counts' };
  if ((t.spanRoot >= 0) !== (ref.lit >= 0)) return { equal: false, why: 'spanning decision' };
  if (t.spanRoot >= 0 && !ref.litTie && minOf.get(t.spanRoot) !== ref.lit) return { equal: false, why: 'lit cluster' };
  // rank must be a size ranking: a permutation of 0..n-1 with sizes non-increasing
  const roots = [...minOf.keys()], byRank = new Array(roots.length);
  for (const r of roots) { if (byRank[t.rank[r]] !== undefined) return { equal: false, why: 'rank not a permutation' }; byRank[t.rank[r]] = r; }
  for (let k = 1; k < byRank.length; k++) if (t.size[byRank[k]] > t.size[byRank[k - 1]]) return { equal: false, why: 'rank order' };
  return { equal: true };
}

/* ------------------------------------------------------------------ 2. the sweep only adds sites */

function sweep() {
  const ok = Hn.load(), host = Hn.instance(ok, 'percolation', {}), P = ok.hooks.percolation;
  let steps = 0;
  for (const type of ['site', 'bond']) for (let k = 0; k < 12; k++) {
    const s = { seed: 'perc-sweep-' + type + '-' + k, type, grid: 128, aspect: k % 2 ? '4:5' : '1:1', p: 0.3 };
    host.state = s; P.ensureField(s);
    const field0 = P.read().field, copy = Float32Array.from(field0), bonds0 = Float32Array.from(P.read().bonds);
    let prev = null;
    for (let j = 0; j <= 50; j++) {
      s.p = +(0.3 + 0.01 * j).toFixed(2); P.ensureField(s); P.label(s);
      const t = P.read();
      assert(t.field === field0, 'field object replaced while only p changed');
      assert.deepEqual(t.field, copy); assert.deepEqual(t.bonds, bonds0);
      const canon = Int32Array.from(t.parent);
      if (prev) for (let i = 0; i < canon.length; i++) {
        if (prev[i] >= 0) assert(canon[i] >= 0, 'a site was removed by raising p');
      }
      if (prev) { // refinement: sites together at the lower p stay together
        const map = new Map();
        for (let i = 0; i < canon.length; i++) if (prev[i] >= 0) {
          if (!map.has(prev[i])) map.set(prev[i], canon[i]);
          else assert.equal(map.get(prev[i]), canon[i], 'a cluster split when p was raised');
        }
      }
      prev = canon; steps++;
    }
  }
  log('PASS sweep: ' + steps + ' p steps reuse the field, only add sites and only merge clusters');
  return { lattices: 24, pSteps: steps, fieldReused: true, occupancyNested: true, clustersOnlyMerge: true };
}

/* ------------------------------------------------------------------ 3. thresholds and crossings */

function summarize(run, gridPs, reference) {
  const s = sorted(run.thresholds), M = s.length;
  const table = gridPs.map(p => { const R = cdf(s, p), k = Math.round(R * M); return { p, R, se: Math.sqrt(R * (1 - R) / M), wilson95: wilson(k, M) }; });
  const R0 = cdf(s, reference), k0 = Math.round(R0 * M);
  return { type: run.type, L: run.L, M, seedPattern: run.seedPattern, seconds: run.seconds, labelCalls: run.labelCalls, bisectedByTabAlone: run.bisectedByTabAlone, bracketedByTab: run.bracketedByTab, gridMonotoneSeeds: run.gridChecked,
    thresholdsFloat32Base64: Buffer.from(Float32Array.from(run.thresholds).buffer).toString('base64'),
    thresholdMean: s.reduce((a, b) => a + b, 0) / M, thresholdSd: sdOf(Array.from(s)), median: medianCI(s),
    R_at_reference: { p: reference, R: R0, se: Math.sqrt(R0 * (1 - R0) / M), wilson95: wilson(k0, M) }, table };
}
function crossingReport(samples, labelPairs, reference, refUnc, seed, reps) {
  const S = samples.map(r => sorted(r.thresholds)), out = [];
  for (const [i, j] of labelPairs) {
    const w = 0.5 * sdOf(Array.from(S[j])), est = crossing(S[i], S[j], w), b = bootstrap([S[i], S[j]], r => crossing(r[0], r[1], w), reps, seed + '/' + i + j);
    const err = Math.hypot(b.se, refUnc);
    out.push({ pair: [samples[i].L, samples[j].L], estimate: est, se: b.se, ci95: [b.lo, b.hi], windowHalfWidth: w, reference, referenceUncertainty: refUnc, z: (est - reference) / err, bootstrapReps: b.reps });
  }
  return out;
}
function combined(samples, reference, refUnc, seed, reps) {
  // mean of the adjacent-pair crossings, with a joint bootstrap (the pairs share the middle lattice)
  const S = samples.map(r => sorted(r.thresholds)), ws = [0.5 * sdOf(Array.from(S[1])), 0.5 * sdOf(Array.from(S[2]))];
  const stat = r => 0.5 * (crossing(r[0], r[1], ws[0]) + crossing(r[1], r[2], ws[1]));
  const est = stat(S), b = bootstrap(S, stat, reps, seed), err = Math.hypot(b.se, refUnc);
  return { definition: 'mean of the (128,256) and (256,512) crossings', estimate: est, se: b.se, ci95: [b.lo, b.hi], reference, referenceUncertainty: refUnc, z: (est - reference) / err, bootstrapReps: b.reps };
}
function estimatorCheck() {
  // Synthetic thresholds with known crossing: a ~ N(mu1, s1), b ~ N(mu2, s2) cross at (mu2 s1 - mu1 s2)/(s1 - s2).
  const rng = Hn.makeRng('perc-estimator-check'), gauss = () => { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
  const cases = [[0.5900, 0.0146, 0.5925, 0.0084], [0.5000, 0.0107, 0.5000, 0.0066], [0.4950, 0.0184, 0.4990, 0.0107]], rows = [];
  for (const [m1, s1, m2, s2] of cases) {
    const n = 200000, a = new Float64Array(n), b = new Float64Array(n);
    for (let i = 0; i < n; i++) { a[i] = m1 + s1 * gauss(); b[i] = m2 + s2 * gauss(); }
    a.sort(); b.sort();
    const truth = (m2 * s1 - m1 * s2) / (s1 - s2), est = crossing(a, b, 0.5 * s2);
    rows.push({ mu: [m1, m2], sigma: [s1, s2], samples: n, truth, estimate: est, error: est - truth });
    assert(Math.abs(est - truth) < 1e-4, 'crossing estimator is biased on synthetic curves: ' + (est - truth));
  }
  log('PASS crossing estimator recovers known synthetic crossings (max error ' + Math.max(...rows.map(r => Math.abs(r.error))).toExponential(1) + ')');
  return rows;
}

/* ------------------------------------------------------------------ 4. print */

function expectedBuffer(state, lab, tabRoots, lut) {
  // lab: breadth-first labeling for state; tabRoots: the tab's representative per BFS label, used only to
  // order equal-size clusters in the rank view, as the tab does (size descending, then representative).
  const { W, H, type, p, field, bonds, ref } = state, bond = type === 'bond';
  const bg = [parseInt(state.bg.slice(1, 3), 16), parseInt(state.bg.slice(3, 5), 16), parseInt(state.bg.slice(5, 7), 16)];
  const labels = [...ref.size.keys()].sort((a, b) => ref.size.get(b) - ref.size.get(a) || tabRoots.get(a) - tabRoots.get(b));
  const rank = new Map(labels.map((k, i) => [k, i]));
  const logN = Math.log1p(Math.max(1, ref.nClusters)), logMax = Math.log(Math.max(2, ref.maxSize));
  const top = state.highlight && ref.lit >= 0 ? 0.72 : 1;
  const lutAt = t => { const li = (Math.min(1, Math.max(0, t)) * 255 | 0) * 3; return [lut[li], lut[li + 1], lut[li + 2]]; };
  const colorOf = i => {
    const k = lab[i];
    if (k < 0 || ref.size.get(k) < state.minSize) return bg;
    if (state.highlight && k === ref.lit) return lutAt(1);
    const t = state.view === 'size' ? Math.log(ref.size.get(k)) / logMax : state.view === 'occupied' ? 0.55 : 1 - Math.log1p(rank.get(k)) / logN;
    return lutAt(0.08 + (top - 0.08) * Math.min(1, Math.max(0, t)));
  };
  const bw = bond ? 2 * W - 1 : W, bh = bond ? 2 * H - 1 : H, out = new Uint8Array(bw * bh * 3);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    let c;
    if (!bond) c = colorOf(y * W + x);
    else if ((x & 1) && (y & 1)) c = bg;
    else if (x & 1) { const i = (y >> 1) * W + (x >> 1); c = bonds[2 * i] < p ? colorOf(i) : bg; }
    else if (y & 1) { const i = (y >> 1) * W + (x >> 1); c = bonds[2 * i + 1] < p ? colorOf(i) : bg; }
    else c = colorOf((y >> 1) * W + (x >> 1));
    out.set(c, (y * bw + x) * 3);
  }
  return { bw, bh, rgb: out };
}

async function prints() {
  const { chromium } = require('playwright');
  const studio = Hn.auditStudio(), browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const cases = [];
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + studio.file + '#percolation/review');
    await page.evaluate(() => Studio.ready);
    const fixtures = [
      { name: 'preset critical', palette: 'graphite', params: { type: 'site', grid: 256, aspect: '1:1', p: 0.5927, view: 'rank', highlight: true, minSize: 1 } },
      { name: 'preset bondc', palette: 'xray', params: { type: 'bond', grid: 192, aspect: '1:1', p: 0.5, view: 'rank', highlight: true, minSize: 1 } },
      { name: 'preset sup', palette: 'ember', params: { type: 'site', grid: 256, aspect: '1:1', p: 0.63, view: 'size', highlight: true, minSize: 1 } },
      { name: 'preset bondsub', palette: 'meadow', params: { type: 'bond', grid: 192, aspect: '1:1', p: 0.45, view: 'size', highlight: false, minSize: 3 } },
      { name: 'occupied 4:5', palette: 'risograph', params: { type: 'site', grid: 128, aspect: '4:5', p: 0.6, view: 'occupied', highlight: true, minSize: 1 } },
    ];
    for (let n = 0; n < fixtures.length; n++) {
      const fx = fixtures[n], seed = 'perc-print-' + n;
      const pal = await page.evaluate(name => Studio.PALETTES[name], fx.palette);
      const params = { ...fx.params, grain: 0, palette: pal.colors, bg: pal.bg, v: 2 };
      await page.evaluate(({ seed, params }) => { location.hash = 'percolation/' + seed + '/' + btoa(JSON.stringify(params)); }, { seed, params });
      await page.waitForFunction(({ seed, p }) => { const r = Studio.getRecipe(); const e = Studio.auditInstances().percolation; return r && r.seed === seed && e && e.state.p === p && e.inst.auditRead().bw > 0; }, { seed, p: params.p });
      const a = await page.evaluate(() => Studio.auditInstances().percolation.inst.auditRead());
      const st = await page.evaluate(() => JSON.parse(JSON.stringify(Studio.auditInstances().percolation.state)));
      for (const k of Object.keys(fx.params)) assert.deepEqual(st[k], fx.params[k], 'recipe key ' + k);
      const lut = await page.evaluate(s => Array.from(Studio.util.makeRampLUT(s.palette, s.bg, 256)), st);
      const [W, H] = gridDims(st.grid, st.aspect); assert.equal(a.W, W); assert.equal(a.H, H);
      const f = drawField(seed, W, H);
      assert.deepEqual(Float32Array.from(a.field), f.field); assert.deepEqual(Float32Array.from(a.bonds), f.bonds);
      const ref = bfsLabel(W, H, st.type, st.p, f.field, f.bonds);
      const same = compareTab({ ...a, parent: a.parent, size: a.size, rank: a.rank }, ref);
      assert(same.equal, 'studio state differs from the independent labeling: ' + same.why);
      const tabRoots = new Map(); for (let i = 0; i < W * H; i++) if (ref.lab[i] >= 0 && !tabRoots.has(ref.lab[i])) tabRoots.set(ref.lab[i], a.parent[i]);
      const exp = expectedBuffer({ ...st, W, H, field: f.field, bonds: f.bonds, ref }, ref.lab, tabRoots, lut);
      assert.equal(exp.bw, a.bw); assert.equal(exp.bh, a.bh);
      // wrong-state control: the picture of the same field at p + 0.01
      const refB = bfsLabel(W, H, st.type, st.p + 0.01, f.field, f.bonds), rootsB = new Map(); for (let i = 0; i < W * H; i++) if (refB.lab[i] >= 0 && !rootsB.has(refB.lab[i])) rootsB.set(refB.lab[i], refB.lab[i]);
      const ctl = expectedBuffer({ ...st, p: st.p + 0.01, W, H, field: f.field, bonds: f.bonds, ref: refB }, refB.lab, rootsB, lut);
      const aspect = { '1:1': [2400, 2400], '4:5': [1920, 2400], '5:4': [2400, 1920] }[st.aspect];
      const before = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), a: Studio.auditInstances().percolation.inst.auditRead() }));
      const print = await page.evaluate(Hn.PRINT_CHECK, { id: 'percolation', w: aspect[0], h: aspect[1], bw: exp.bw, bh: exp.bh, expected: Array.from(exp.rgb), controls: [Array.from(ctl.rgb)] });
      const after = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), a: Studio.auditInstances().percolation.inst.auditRead() }));
      assert.equal(after, before, 'export changed the state');
      assert(print.maxChannelError <= 1 && print.nearBoundaryFailures === 0, 'exported pixels differ from the independent picture: ' + JSON.stringify(print));
      assert(print.opaque && print.decoded[0] === aspect[0] && print.decoded[1] === aspect[1]);
      assert(print.displacedControlFailingPixels > 1000 && print.wrongStateControlFailingPixels[0] > 1000, 'print controls must fail');
      cases.push({ name: fx.name, seed, parameters: st, grid: [W, H], clusters: ref.nClusters, largest: ref.maxSize, spanning: ref.lit >= 0,
        fieldSha256: Hn.sha256(Buffer.from(f.field.buffer)), bondsSha256: Hn.sha256(Buffer.from(f.bonds.buffer)), stateMatchesIndependentLabeling: true, print, statePreserved: true });
      log('PASS print ' + fx.name + ' ' + aspect.join('x') + ': ' + print.pixels.toLocaleString() + ' pixels, max channel error ' + print.maxChannelError + ', ' + print.nearBoundaryPixels + ' near-boundary pixels (' + print.nearBoundaryShowingNeighborCell + ' show the neighbor cell); displaced control ' + print.displacedControlFailingPixels + ', wrong-state control ' + print.wrongStateControlFailingPixels[0]);
    }
    // the real studio's sweep: a new p on the same seed keeps the field and only adds sites
    const sweepSeed = 'perc-print-0';
    const pal = await page.evaluate(() => Studio.PALETTES.graphite);
    const hashFor = p => 'percolation/' + sweepSeed + '/' + btoa(JSON.stringify({ type: 'site', grid: 256, aspect: '1:1', p, view: 'rank', highlight: true, minSize: 1, grain: 0, palette: pal.colors, bg: pal.bg, v: 2 }));
    const read = async p => { await page.evaluate(h => { location.hash = h; }, hashFor(p)); await page.waitForFunction(({ seed, p }) => { const r = Studio.getRecipe(); const e = Studio.auditInstances().percolation; return r && r.seed === seed && e.state.p === p && e.inst.auditRead().W === 256; }, { seed: sweepSeed, p }); return page.evaluate(() => Studio.auditInstances().percolation.inst.auditRead()); };
    const lo = await read(0.58), hi = await read(0.61);
    assert.deepEqual(lo.field, hi.field, 'studio re-rolled the field when p changed');
    for (let i = 0; i < lo.parent.length; i++) if (lo.parent[i] >= 0) assert(hi.parent[i] >= 0, 'studio removed a site when p rose');
    assert.deepEqual(errors, []);
    log('PASS studio sweep: p 0.58 -> 0.61 on one seed keeps the field and only adds sites');
    return { cases, studioSweep: { seed: sweepSeed, from: 0.58, to: 0.61, fieldIdentical: true, sitesOnlyAdded: true }, chromium: browser.version() };
  } finally { await browser.close(); studio.cleanup(); }
}

/* ------------------------------------------------------------------ main */

async function main() {
  const t0 = Date.now();
  if (process.argv.includes('--print-only')) { assert(!WRITE); await prints(); return; }
  const timings = {}, lap = name => { const t = Date.now(); return () => { timings[name] = (Date.now() - t) / 1000; log('  (' + name + ' ' + timings[name].toFixed(0) + ' s)'); }; };
  let done = lap('estimator check'); const estimator = estimatorCheck(); done();
  done = lap('partitions'); const partition = partitions(); done();
  done = lap('sweep'); const sweepResult = sweep(); done();
  done = lap('main thresholds and crossings');
  const P = pool(Math.min(4, os.cpus().length));
  const siteGrid = Array.from({ length: 27 }, (_, k) => +(0.56 + 0.0025 * k).toFixed(4)), bondGrid = Array.from({ length: 29 }, (_, k) => +(0.465 + 0.0025 * k).toFixed(4));
  const plan = [[128, 4000], [256, 2000], [512, 1000]].map(([L, M]) => [L, Math.max(40, Math.round(M * scale))]);
  const main = {}, reps = QUICK ? 200 : 1000;
  try {
    for (const type of ['bond', 'site']) {
      const gridPs = type === 'bond' ? bondGrid : siteGrid, runs = [];
      for (const [L, M] of plan) {
        const run = await thresholds(P, { edits: 'none', type, L, M, prefix: 'perc-science', gridPs, gridCheck: Math.round(50 * scale), bisectSeeds: Math.round(50 * scale), withReference: true });
        assert.deepEqual(run.mismatches, [], 'tab threshold differs from the independent reference or is not monotone');
        assert(run.thresholds.every(Number.isFinite));
        log('PASS ' + type + ' L=' + L + ': ' + M + ' seeds (' + run.bisectedByTabAlone + ' found by the tab alone, ' + run.bracketedByTab + ' bracketed by the tab), all identical to the reference (' + run.seconds.toFixed(0) + ' s)');
        runs.push(run);
      }
      const reference = type === 'bond' ? PC_BOND : PC_SITE, refUnc = type === 'bond' ? 0 : PC_SITE_UNCERTAINTY;
      const pairs = crossingReport(runs, [[0, 1], [1, 2], [0, 2]], reference, refUnc, 'perc-boot-' + type, reps);
      const comb = combined(runs, reference, refUnc, 'perc-boot-combined-' + type, reps);
      main[type] = { reference, referenceUncertainty: refUnc, referenceSource: type === 'bond' ? 'Kesten, Comm. Math. Phys. 74, 41 (1980): exactly 1/2' : 'value credited by the tab, 0.592746 (numerical; Newman and Ziff, Phys. Rev. Lett. 85, 4104 (2000): 0.59274621(13))',
        sizes: runs.map(r => summarize(r, gridPs, reference)), crossings: pairs, combined: comb,
        referenceAgreement: { seeds: runs.reduce((a, r) => a + r.M, 0), identicalThresholds: true }, gridMonotoneSeeds: runs.reduce((a, r) => a + r.gridChecked, 0) };
      for (const c of pairs) log('  ' + type + ' crossing ' + c.pair.join('/') + ': ' + c.estimate.toFixed(5) + ' +/- ' + c.se.toFixed(5) + '  (' + c.z.toFixed(2) + ' sigma from ' + reference + ')');
      log('  ' + type + ' combined: ' + comb.estimate.toFixed(5) + ' +/- ' + comb.se.toFixed(5) + '  (' + comb.z.toFixed(2) + ' sigma)');
    }
    const bondPass = Math.abs(main.bond.combined.z) <= 2 && main.bond.combined.ci95[0] <= 0.5 && main.bond.combined.ci95[1] >= 0.5;
    main.bond.pass = bondPass;
    main.site.withinTwoSigma = Math.abs(main.site.combined.z) <= 2;
    log((bondPass ? 'PASS' : 'FAIL') + ' bond crossing consistent with 1/2');
    log((main.site.withinTwoSigma ? 'PASS' : 'NOTE') + ' site crossing against 0.592746: ' + main.site.combined.z.toFixed(2) + ' sigma');

    // failure controls
    done(); done = lap('failure controls');
    const controls = {};
    const cM = Math.max(40, Math.round(400 * scale));
    for (const [name, type, reference, predicted, why] of [
      ['diagonal', 'site', PC_SITE, 1 - PC_SITE, 'site labeler also joins diagonal neighbors; the matching-lattice relation (Sykes and Essam 1964) puts the next-nearest-neighbor site threshold at 1 - p_c(site) = 0.407254'],
      ['anisotropic', 'bond', PC_BOND, 1 / 1.9, 'vertical bonds open with probability 0.9 p; the exact anisotropic condition p_h + p_v = 1 predicts p = 1/1.9 = 0.526316'],
    ]) {
      const runs = [];
      for (const L of [128, 256]) runs.push(await thresholds(P, { edits: name, type, L, M: cM, prefix: 'perc-control-' + name, gridPs: [], gridCheck: 0, withReference: false }));
      const c = crossingReport(runs, [[0, 1]], reference, type === 'site' ? PC_SITE_UNCERTAINTY : 0, 'perc-boot-control-' + name, reps)[0];
      const failed = Math.abs(c.z) > 10;
      assert(failed, 'failure control ' + name + ' did not move the crossing');
      controls[name] = { type, description: why, seedsPerSize: cM, crossing: c, predicted, sigmaFromPredicted: (c.estimate - predicted) / c.se, detected: failed };
      log('PASS control ' + name + ': crossing ' + c.estimate.toFixed(4) + ' +/- ' + c.se.toFixed(4) + ', ' + c.z.toFixed(0) + ' sigma from ' + reference + ' (predicted ' + predicted.toFixed(4) + ')');
    }
    await P.close();
    done(); done = lap('prints');
    const printResult = await prints();
    done();
    const result = {
      date: new Date().toISOString().slice(0, 10), tool: 'tools/percolation-science.js', sourceSha256: Hn.sha256(Hn.source), engineSha256: Hn.sha256(Hn.engine),
      scope: 'Percolation tab (src/modules/lattice.js): Hoshen-Kopelman labeling against breadth-first search on 240 lattices; the p sweep; per-seed exact spanning thresholds from the tab labeler, cross-checked seed by seed against an independent reference; spanning-probability crossings for L = 128, 256, 512 against the exact bond threshold and the numerical site threshold; failure controls; five exported prints.',
      estimatorCheck: estimator, partitions: partition, sweep: sweepResult, thresholds: main, controls, print: printResult.cases, studioSweep: printResult.studioSweep,
      sampleSizes: { seedsPerSize: Object.fromEntries(plan.map(([L, M]) => ['L' + L, M])), controlSeedsPerSize: cM, bootstrapReps: reps, why: 'Binomial error of R_L near 1/2 is 0.008 at 4000 seeds and 0.016 at 1000; the crossing errors that result are about 3e-4, which bounds the bond crossing to 0.06 per cent of 1/2. The controls need only resolve shifts of 0.027 and 0.185, which 400 seeds per size do at well over 10 sigma.' },
      timings, cpuSeconds: (process.cpuUsage().user + process.cpuUsage().system) / 1e6, environment: { node: process.version, chromium: printResult.chromium, platform: process.platform, cpus: os.cpus().length }, seconds: (Date.now() - t0) / 1000,
      passed: bondPass,
    };
    if (WRITE) fs.writeFileSync(path.join(Hn.root, 'validation/results/percolation-science.json'), JSON.stringify(result, null, 1) + '\n');
    log((bondPass ? 'PASS' : 'FAIL') + ' percolation exact benchmark and print review (' + result.seconds.toFixed(0) + ' s wall, ' + result.cpuSeconds.toFixed(0) + ' s CPU over all threads)');
    if (!bondPass) process.exitCode = 1;
  } finally { await P.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
