
/* modules/ust.js */
/* GENChase: uniform spanning trees of a grid graph sampled exactly by Wilson's algorithm, and the loop-erased random walk that builds them. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f2 = v => v.toFixed(2), f1 = v => v.toFixed(1), pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // Directions in screen order: 0 east, 1 west, 2 south, 3 north.
  const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
  // Depth colors are quantized into bands so a plate is a few dozen stroked paths rather than one
  // path per edge. At 48 bands the steps are below what the eye separates on a continuous ramp, and
  // the exported SVG is a few hundred kilobytes instead of several megabytes.
  const BANDS = 48;

  // Wilson's algorithm. Hold a set of cells already in the tree, starting from the root alone. Pick a
  // cell outside it, walk at random until the walk first hits the tree, erase the loops the walk made,
  // and add what survives. The only state the erasure needs is next[], the direction most recently
  // taken out of each cell: a loop overwrites its own entries on the way round, so following the
  // arrows from the start cell walks the loop-erased path and nothing else. Every spanning tree of the
  // graph comes out with exactly equal probability. This is a sampler, not a relaxation, so there is
  // no burn-in to get wrong and no bias to bound: the tree on screen is drawn from the exact measure.
  function makeWilson(W, H, rootIx, wrap, rng) {
    const N = W * H;
    const next = new Int8Array(N).fill(-1);
    const inTree = new Uint8Array(N);
    inTree[rootIx] = 1;
    let added = 1, scan = 0, at = -1, start = -1, steps = 0;

    function nb(i, d) {
      let x = i % W + DX[d], y = ((i / W) | 0) + DY[d];
      if (wrap) { x = x < 0 ? W - 1 : (x === W ? 0 : x); y = y < 0 ? H - 1 : (y === H ? 0 : y); }
      else if (x < 0 || y < 0 || x >= W || y >= H) return -1;
      return y * W + x;
    }

    return {
      next, nb,
      steps: () => steps,
      added: () => added,
      done: () => added >= N,
      // Chunked against a wall clock, but the chunk boundary never touches the draw sequence: the walk
      // resumes from exactly the cell and the exact rng position it stopped at, so the finished tree is
      // the same tree whether it was built in one chunk or forty. That is what makes the seed reprint.
      step(ms) {
        const t0 = performance.now();
        while (added < N) {
          if (at < 0) {
            while (scan < N && inTree[scan]) scan++;
            if (scan >= N) break;
            start = scan; at = scan;
          }
          let u = at, took = 0;
          while (!inTree[u] && took < 30000) {
            let d, v;
            // Redraw until the neighbor exists. That is uniform over the neighbors a cell actually
            // has, which is the simple random walk on this graph, and it is what the boundary cells
            // need: a walk that always drew from four directions and treated the off-grid ones as
            // legal would be walking on a different graph and sampling a different measure.
            do { d = (rng() * 4) | 0; v = nb(u, d); } while (v < 0);
            next[u] = d; u = v; took++;
          }
          steps += took;
          at = u;
          if (performance.now() - t0 > ms && !inTree[u]) return;
          if (!inTree[u]) continue;
          // The walk has hit the tree. Follow the recorded arrows from the start cell and add them.
          let c = start;
          while (!inTree[c]) { inTree[c] = 1; added++; c = nb(c, next[c]); }
          at = -1;
          if (performance.now() - t0 > ms) return;
        }
      },
    };
  }

  const rot = (P, k) => { const n = P.length, i = ((k % n) + n) % n; return P.slice(i).concat(P.slice(0, i)); };

  // A palette stop that sits on the paper paints nothing, and the palette offset rotates whichever
  // stop it likes into the single ink the tree is drawn with: kiln's near-white on kiln's cream is a
  // blank plate, not a pale one, and a random offset finds it. Push a stop that close to the
  // background toward the ink until it separates. Anything already far enough from the paper is left
  // exactly as the viewer chose it.
  function lift(hex, bg) {
    const lb = U.luminance(bg), ink = U.inkFor(bg);
    let c = hex;
    for (let k = 0; k < 8 && Math.abs(U.luminance(c) - lb) < 30; k++) c = U.mixHex(c, ink, 0.16);
    return c;
  }

  /* ---------- Spanning Trees ---------- */
  Studio.register({
    id: 'ust',
    name: 'Spanning Trees',
    tab: 'Trees',
    subtitle: 'uniform spanning trees by loop-erased random walk · 1996',
    order: 49,
    equation: 'pick v ∉ T, walk at random from v erasing each loop as it closes, attach the surviving path;  P(T) = 1 / κ(G) for every one of the κ(G) spanning trees',
    credit: "David Bruce Wilson, 'Generating random spanning trees more quickly than the cover time', Proceedings of the 28th ACM Symposium on Theory of Computing, 296 (1996), is the algorithm drawn here: cycle popping by loop-erased random walk, exact rather than approximate, and finishing in the mean hitting time rather than the cover time the earlier samplers need. Those are Andrei Broder, 'Generating random spanning trees', 30th Symposium on Foundations of Computer Science, 442 (1989), and David Aldous, SIAM Journal on Discrete Mathematics 3, 450 (1990). The loop-erased walk itself is Gregory Lawler, Duke Mathematical Journal 47, 655 (1980). Lawler, Oded Schramm and Wendelin Werner, Annals of Probability 32, 939 (2004), proved that the loop-erased walk scales to SLE with κ = 2 and the tree's Peano curve to SLE with κ = 8. That every spanning tree of a graph can be counted at all is Gustav Kirchhoff, Annalen der Physik 148, 497 (1847).",
    blurb: 'A spanning tree of a grid is a set of corridors that reaches every cell and closes no loop. A grid of any size has an astronomical number of them, and this plate holds one drawn with every tree exactly as likely as every other. Wilson\'s algorithm gets there by a move that looks like it should not work: start a random walk at any cell not yet in the tree, let it wander, erase each loop the moment it closes, and attach what is left. Repeat until the tree covers the grid. The result is exactly uniform, with nothing to converge and no approximation anywhere in it. What the walk leaves behind is the loop-erased random walk, the curve that scales to SLE at κ = 2 on the neighboring tab, and the path view picks one of them out of the finished tree. Depth colors every edge by how far it sits from the root, which is what makes the branching readable: a few long rivers leave the root and split, and the palette runs out along them. Maze draws the walls instead of the corridors, because a spanning tree of a grid is exactly a perfect maze, one route between any two cells and no loop anywhere. On a torus there is no boundary to push against, so the branches run off one edge of the plate and back in at the other.',
    schema: [
      RANGE('Lattice', 'grid', 'Grid', GEOM, 24, 220, 1, String, { hint: 'Cells across. The tree has one edge fewer than it has cells, so 200 across is roughly fifty thousand strokes and reads as a texture; below 60 you can follow a single branch by eye.' }),
      { group: 'Lattice', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
      { group: 'Lattice', key: 'topo', label: 'Boundary', type: 'seg', kind: GEOM,
        options: [['plane', 'Rectangle'], ['torus', 'Torus (wrap)']],
        hint: 'The topology is part of the graph, so wrapping does not rearrange a tree, it samples from a different set of trees. Wrapped edges are drawn as a pair of stubs at the plate edge rather than as a line straight across the picture.' },
      { group: 'Lattice', key: 'root', label: 'Root', type: 'seg', kind: GEOM, options: [['center', 'Center'], ['corner', 'Corner'], ['random', 'Random']],
        hint: 'The tree itself does not care: the uniform measure has no root in it, and rerooting a uniform spanning tree gives a uniform spanning tree. The root only decides which way the arrows point, which is what Depth and the path view read.' },
      { group: 'Tree', key: 'view', label: 'View', type: 'seg', kind: PAINT, wrap: true,
        options: [['tree', 'Tree'], ['branch', 'Depth'], ['path', 'Loop-erased path'], ['maze', 'Maze walls']] },
      RANGE('Tree', 'cycles', 'Ramp cycles', PAINT, 1, 6, 1, String, { dimUnless: s => s.view === 'branch', hint: 'How many times the palette repeats between the root and the deepest leaf. One cycle reads as distance, several read as contour lines on the tree.' }),
      RANGE('Tree', 'dim', 'Rest of the tree', PAINT, 0, 1, 0.05, f2, { dimUnless: s => s.view === 'path' }),
      RANGE('Ink', 'weight', 'Line weight', PAINT, 0.2, 3, 0.1, f1),
      RANGE('Ink', 'shift', 'Palette offset', PAINT, 0, 15, 1, String),
      { group: 'Ink', key: 'mark', label: 'Mark the root', type: 'toggle', kind: PAINT, dimUnless: s => s.view !== 'maze' },
      RANGE('Finish', 'margin', 'Margin', PAINT, 0, 0.2, 0.01, f2),
      RANGE('Finish', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      grid: 96, aspect: '4:5', topo: 'plane', root: 'center',
      view: 'tree', cycles: 1, dim: 0.3, weight: 1, shift: 0, mark: true,
      margin: 0.06, grain: 0.04,
      seed: 'wilson-1996',
    },
    presets: {
      tree: pre('One uniform spanning tree', { grid: 100, aspect: '4:5', topo: 'plane', root: 'center', view: 'tree', weight: 1.1, shift: 3, mark: true, grain: 0.04 }, Pal.kiln),
      depth: pre('Distance from the root', { grid: 150, aspect: '4:5', topo: 'plane', root: 'center', view: 'branch', cycles: 1, weight: 1, shift: 0, mark: false, grain: 0.03 }, Pal.ember),
      lerw: pre('The loop-erased walk', { grid: 130, aspect: '4:5', topo: 'plane', root: 'center', view: 'path', dim: 0.3, weight: 1, shift: 1, mark: true, grain: 0.03 }, Pal.glacier),
      maze: pre('Perfect maze', { grid: 42, aspect: '1:1', topo: 'plane', root: 'corner', view: 'maze', weight: 1.5, shift: 0, grain: 0 }, Pal.graphite),
      torus: pre('Wrapped on a torus', { grid: 120, aspect: '1:1', topo: 'torus', root: 'random', view: 'branch', cycles: 2, weight: 1.1, shift: 0, mark: false, grain: 0.04 }, Pal.verdigris),
      fine: pre('Fine, 200 across', { grid: 200, aspect: '5:4', topo: 'plane', root: 'center', view: 'tree', weight: 0.6, shift: 0, mark: false, margin: 0.04, grain: 0.06 }, Pal.harbor),
      corner: pre('Rooted in a corner', { grid: 170, aspect: '5:4', topo: 'plane', root: 'corner', view: 'branch', cycles: 1, weight: 0.9, shift: 0, mark: true, grain: 0.03 }, Pal.nightshade),
    },
    hints: {
      Lattice: 'The seed fixes every step of every walk, so a seed and a grid reprint the same tree exactly. Changing the grid or the boundary changes the graph, and a different graph is a different tree.',
      Tree: 'Tree draws the corridors, Maze draws the walls between the cells the corridors do not join, and the two are the same picture read the other way round.',
      Ink: 'Line weight is measured in cells, not pixels, so the plate looks the same on screen and on paper.',
    },
    palette: true, defaultPalette: 'kiln', paletteLabel: 'Colors (root → deepest leaf)',
    headline: 'grid', headlineLabel: 'grid',
    closedGroups: ['Finish'],
    sanitize(s) { s.grid = U.clamp(Math.round(Number(s.grid) || 96), 24, 220); s.cycles = U.clamp(Math.round(Number(s.cycles) || 1), 1, 6); },
    surprise(rng) {
      const view = rng.pick(['tree', 'tree', 'branch', 'branch', 'path', 'maze']);
      return {
        grid: view === 'maze' ? rng.int(30, 70) : rng.pick([80, 110, 140, 180, 210]),
        aspect: rng.pick(['1:1', '4:5', '5:4', '3:2']),
        topo: rng() < 0.3 ? 'torus' : 'plane',
        root: rng.pick(['center', 'center', 'corner', 'random']),
        view, cycles: rng.int(1, 4), dim: rng.pick([0.18, 0.3, 0.45]),
        weight: rng.pick([0.6, 0.8, 1, 1.4]), shift: rng.int(0, 4), mark: rng() < 0.6,
        margin: 0.06, grain: rng.pick([0, 0.04, 0.1]),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let W = 0, H = 0, N = 0, rootIx = 0, wrap = false;
      let wil = null, next = null, par = null, depth = null, path = null, maxDepth = 0;
      let timer = 0, building = false;

      function build(s, done) {
        clearTimeout(timer); building = true;
        par = null;
        W = s.grid;
        H = Math.max(8, Math.round(s.grid * (ASPECTS[s.aspect] || 1)));
        N = W * H;
        wrap = s.topo === 'torus';
        const rr = U.makeRng(s.seed + '/root');
        rootIx = s.root === 'center' ? (H >> 1) * W + (W >> 1)
          : s.root === 'corner' ? 0
          : rr.int(0, N - 1);
        const rng = U.makeRng(s.seed + '/wilson');
        wil = makeWilson(W, H, rootIx, wrap, rng);
        next = wil.next;
        (function chunk() {
          wil.step(40);
          // The walk count is worth watching: Wilson's cost is the mean hitting time of the graph, so a
          // tree of a few tens of thousands of cells takes a few million steps and most of them are
          // erased again.
          if (!wil.done()) { status('walking ' + Math.round(100 * wil.added() / N) + '% · ' + wil.steps().toLocaleString() + ' steps'); timer = setTimeout(chunk, 0); }
          else { building = false; finish(); done(); }
        })();
      }

      // Parent pointers, depth, and the highlighted path. All three are read off next[] once the tree
      // is complete; none of them feeds back into the sampler.
      function finish() {
        par = new Int32Array(N);
        for (let i = 0; i < N; i++) par[i] = i === rootIx ? -1 : wil.nb(i, next[i]);
        depth = new Int32Array(N).fill(-1);
        depth[rootIx] = 0;
        const buf = new Int32Array(N);
        maxDepth = 0;
        for (let i = 0; i < N; i++) {
          if (depth[i] >= 0) continue;
          // Climb to the nearest ancestor whose depth is known, then hand the depths back down.
          // The obvious recursive version overflows the JS stack: the deepest branch of a 200 square
          // tree runs to several thousand cells, and it is exactly the large grids that need this.
          let len = 0, c = i;
          while (depth[c] < 0) { buf[len++] = c; c = par[c]; }
          let d = depth[c];
          while (len > 0) { depth[buf[--len]] = ++d; if (d > maxDepth) maxDepth = d; }
        }
        // The highlighted loop-erased walk runs from a corner to the root. Take the corner that is
        // farthest from the root across the grid, so that a corner root still leaves a path across the
        // whole plate instead of a path of length zero.
        const corners = [0, W - 1, (H - 1) * W, (H - 1) * W + W - 1];
        let src = corners[0], far = -1;
        for (const c of corners) {
          const d = Math.abs(c % W - rootIx % W) + Math.abs(((c / W) | 0) - ((rootIx / W) | 0));
          if (d > far) { far = d; src = c; }
        }
        path = [];
        for (let c = src; c !== rootIx; c = par[c]) path.push(c);
        path.push(rootIx);
      }

      function status(extra) {
        host.setStatus('<span>grid <b>' + W + '×' + H + '</b></span>' +
          (par ? '<span>edges <b>' + (N - 1).toLocaleString() + '</b></span>' +
            '<span>depth <b>' + maxDepth.toLocaleString() + '</b></span>' +
            '<span>LERW <b>' + (path.length - 1).toLocaleString() + '</b> steps</span>' : '') +
          (extra ? '<span>' + extra + '</span>' : ''));
      }

      // Everything drawn is a set of straight segments in one of a handful of colors, so both the
      // canvas and the SVG are built from the same list of groups. The segment arrays are flat,
      // x1, y1, x2, y2 per segment, in device pixels.
      function groupsFor(s, Wpx, Hpx) {
        const cell = Math.min(Wpx * (1 - 2 * s.margin) / W, Hpx * (1 - 2 * s.margin) / H);
        const ox = (Wpx - cell * W) / 2, oy = (Hpx - cell * H) / 2;
        const P = rot(s.palette, s.shift).map(c => lift(c, s.bg));
        const lw = Math.max(0.35, s.weight * cell * 0.2);
        const groups = [], dots = [];
        const put = (a, x1, y1, x2, y2) => a.push(ox + x1 * cell, oy + y1 * cell, ox + x2 * cell, oy + y2 * cell);

        // One tree edge, from cell i to its parent. An edge that wraps is drawn as two half-cell stubs,
        // one at each side of the plate: the two cells really are neighbors, and a line straight
        // across the picture would say the opposite.
        function edgeSegs(i, arr) {
          const d = next[i], x = i % W, y = (i / W) | 0;
          const ux = x + DX[d], uy = y + DY[d];
          if (ux >= 0 && uy >= 0 && ux < W && uy < H) { put(arr, x + 0.5, y + 0.5, ux + 0.5, uy + 0.5); return; }
          const wx = (ux + W) % W, wy = (uy + H) % H;
          put(arr, x + 0.5, y + 0.5, x + 0.5 + DX[d] * 0.5, y + 0.5 + DY[d] * 0.5);
          put(arr, wx + 0.5, wy + 0.5, wx + 0.5 - DX[d] * 0.5, wy + 0.5 - DY[d] * 0.5);
        }
        // The wall on the far side of cell (x, y) in direction d, drawn along the shared cell boundary.
        function wall(arr, x, y, d) {
          if (d === 0) put(arr, x + 1, y, x + 1, y + 1);
          else if (d === 1) put(arr, x, y, x, y + 1);
          else if (d === 2) put(arr, x, y + 1, x + 1, y + 1);
          else put(arr, x, y, x + 1, y);
        }

        if (s.view === 'maze') {
          const seg = [];
          for (let i = 0; i < N; i++) {
            const x = i % W, y = (i / W) | 0;
            for (let d = 0; d < 4; d++) {
              const off = x + DX[d] < 0 || y + DY[d] < 0 || x + DX[d] >= W || y + DY[d] >= H;
              if (off && !wrap) { wall(seg, x, y, d); continue; }   // the rectangle's own outer wall
              const j = wil.nb(i, d);
              if (par[i] === j || par[j] === i) continue;           // a tree edge is a corridor, not a wall
              // East and south only, so each interior wall is drawn once. A wrapped wall is the
              // exception: on the torus it is one wall, but the plate shows both of its ends.
              if (d === 0 || d === 2 || off) wall(seg, x, y, d);
            }
          }
          groups.push({ color: P[0], w: Math.max(0.35, s.weight * cell * 0.16), cap: 'square', seg });
        } else if (s.view === 'branch') {
          const ramp = U.makeRamp(P, null);
          const buckets = [];
          for (let b = 0; b < BANDS; b++) buckets.push([]);
          for (let i = 0; i < N; i++) {
            if (i === rootIx) continue;
            let t = depth[i] / (maxDepth + 1) * s.cycles;
            t -= Math.floor(t);
            edgeSegs(i, buckets[Math.min(BANDS - 1, (t * BANDS) | 0)]);
          }
          for (let b = 0; b < BANDS; b++) {
            if (!buckets[b].length) continue;
            const c = ramp((b + 0.5) / BANDS);
            groups.push({ color: U.rgbToHex(c[0], c[1], c[2]), w: lw, cap: 'round', seg: buckets[b] });
          }
        } else if (s.view === 'path') {
          if (s.dim > 0.02) {
            const seg = [];
            for (let i = 0; i < N; i++) if (i !== rootIx) edgeSegs(i, seg);
            // The rest of the tree is a neutral ghost rather than a palette color, so the palette is
            // free to belong entirely to the walk.
            groups.push({ color: U.mixHex(s.bg, U.inkFor(s.bg), s.dim), w: lw * 0.8, cap: 'round', seg });
          }
          const ramp = U.makeRamp(P, null);
          const L = Math.max(1, path.length - 1), M = Math.min(BANDS, L);
          const buckets = [];
          for (let b = 0; b < M; b++) buckets.push([]);
          for (let k = 0; k < path.length - 1; k++) edgeSegs(path[k], buckets[Math.min(M - 1, ((k / L) * M) | 0)]);
          for (let b = 0; b < M; b++) {
            if (!buckets[b].length) continue;
            const c = ramp(1 - (b + 0.5) / M);   // the ramp runs from the root out to the corner
            groups.push({ color: U.rgbToHex(c[0], c[1], c[2]), w: lw * 2.4, cap: 'round', seg: buckets[b] });
          }
          if (s.mark) {
            const c = ramp(1);   // the corner the walk started from, in the color its first edge carries
            dots.push({ x: ox + (path[0] % W + 0.5) * cell, y: oy + (((path[0] / W) | 0) + 0.5) * cell,
              r: Math.max(lw * 1.6, cell * 0.7), c: U.rgbToHex(c[0], c[1], c[2]) });
          }
        } else {
          const seg = [];
          for (let i = 0; i < N; i++) if (i !== rootIx) edgeSegs(i, seg);
          groups.push({ color: P[0], w: lw, cap: 'round', seg });
        }
        if (s.mark && s.view !== 'maze') {
          dots.push({ x: ox + (rootIx % W + 0.5) * cell, y: oy + (((rootIx / W) | 0) + 0.5) * cell,
            r: Math.max(lw * 1.8, cell * 0.8), c: U.inkFor(s.bg) });
        }
        return { groups, dots };
      }

      function paint(c2, Wpx, Hpx) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, Wpx, Hpx);
        if (!par) return;
        const gg = groupsFor(s, Wpx, Hpx);
        c2.lineJoin = 'round';
        for (const g of gg.groups) {
          const a = g.seg;
          if (!a.length) continue;
          c2.strokeStyle = g.color; c2.lineWidth = g.w; c2.lineCap = g.cap;
          c2.beginPath();
          for (let k = 0; k < a.length; k += 4) { c2.moveTo(a[k], a[k + 1]); c2.lineTo(a[k + 2], a[k + 3]); }
          c2.stroke();
        }
        for (const d of gg.dots) {
          c2.beginPath(); c2.arc(d.x, d.y, d.r, 0, U.TAU); c2.fillStyle = d.c; c2.fill();
        }
        if (s.grain > 0) {
          const rng = U.makeRng(s.seed + '/grain'), img = c2.getImageData(0, 0, Wpx, Hpx), px = img.data, a = s.grain * 28;
          for (let i = 0; i < px.length; i += 4) { const v = (rng() - 0.5) * a; px[i] += v; px[i + 1] += v; px[i + 2] += v; }
          c2.putImageData(img, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          const s = host.getState();
          par = null; render(); status('walking');
          build(s, () => { render(); status(); });
        },
        repaint() { if (!building) render(); },
        resize() { if (!building) render(); },
        pause() {}, resume() { if (!building) render(); },
        async exportPNG(w, h) {
          if (!par) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        // The plate is nothing but line segments, so the print path emits them as segments and lets the
        // printer rasterize at its own resolution. Grain is a screen finish with no geometry in it, so
        // it is the one thing the vector sheet does not carry.
        exportSVG(w, h) {
          if (!par) throw new Error('nothing to export');
          const s = host.getState();
          const gg = groupsFor(s, w, h);
          const r = v => Math.round(v * 100) / 100;
          let body = '';
          for (const g of gg.groups) {
            const a = g.seg;
            if (!a.length) continue;
            let d = '';
            for (let k = 0; k < a.length; k += 4) d += 'M' + r(a[k]) + ' ' + r(a[k + 1]) + 'L' + r(a[k + 2]) + ' ' + r(a[k + 3]);
            body += '<path d="' + d + '" fill="none" stroke="' + U.svgEsc(g.color) + '" stroke-width="' + r(g.w) +
              '" stroke-linecap="' + g.cap + '" stroke-linejoin="round"/>\n';
          }
          for (const d of gg.dots) {
            body += '<circle cx="' + r(d.x) + '" cy="' + r(d.y) + '" r="' + r(d.r) + '" fill="' + U.svgEsc(d.c) + '"/>\n';
          }
          return U.svgBlob(w, h, s.bg, body);
        },
      };
    },
  });
})();
