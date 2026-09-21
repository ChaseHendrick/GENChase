
/* modules/hyperbolic.js */
/* GENChase — reaction-diffusion on a {p,q} hyperbolic tiling, drawn in the Poincare disk. */
(function () {
  'use strict';
  const U = Studio.util;
  const TAU = U.TAU, PI = Math.PI;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECT = 1;
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), f3 = v => v.toFixed(3), f4 = v => v.toFixed(4);
  const pct = v => Math.round(v * 100) + '%';
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // The {p,q} tiling exists in the hyperbolic plane exactly when 1/p + 1/q < 1/2. At equality it is
  // Euclidean ({3,6}, {4,4}, {6,3}) and above it spherical, and in both of those cases the construction
  // below does not terminate the way it does here, so the schema only offers hyperbolic pairs.
  const isHyperbolic = (p, q) => 1 / p + 1 / q < 0.5 - 1e-9;

  // Circumradius of the central {p,q} cell in the Poincare disk. Everything else follows from reflecting
  // this one polygon, so if this is wrong the tiling is wrong everywhere and it will not close up around
  // a vertex. The status line checks exactly that: it counts how many cells meet at each interior vertex
  // and reports the fraction where the answer is q.
  function circumradius(p, q) {
    const a = PI / p, b = PI / q;
    const num = Math.cos(a + b), den = Math.cos(a - b);
    if (!(den > 1e-12) || num <= 0) return 0;
    return Math.sqrt(num / den);
  }

  // Reflection across the geodesic through two points of the disk. A geodesic is an arc of the circle
  // orthogonal to the unit circle, and reflection across it is inversion in that circle. Its center C
  // satisfies |C - a| = |C - b| = R together with |C|^2 = 1 + R^2, and eliminating R turns both into
  // linear equations: 2 C . a = 1 + |a|^2 and 2 C . b = 1 + |b|^2. When a and b lie on a diameter the
  // system is singular, because the geodesic is that diameter and the reflection is an ordinary Euclidean
  // one; that case has to be handled or the central cell of an even-sided tiling comes out as NaN.
  function geodesic(a, b) {
    const d = 2 * (a[0] * b[1] - a[1] * b[0]);
    const ra = 1 + a[0] * a[0] + a[1] * a[1];
    const rb = 1 + b[0] * b[0] + b[1] * b[1];
    if (Math.abs(d) < 1e-12) {
      // a, b and the origin are collinear: reflect in the line through them
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return { line: true, nx: -(b[1] - a[1]) / len, ny: (b[0] - a[0]) / len };
    }
    const cx = (ra * b[1] - rb * a[1]) / d;
    const cy = (rb * a[0] - ra * b[0]) / d;
    const r2 = cx * cx + cy * cy - 1;
    if (!(r2 > 1e-14)) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return { line: true, nx: -(b[1] - a[1]) / len, ny: (b[0] - a[0]) / len };
    }
    return { line: false, cx, cy, r2, r: Math.sqrt(r2) };
  }
  function reflect(g, z) {
    if (g.line) {
      const d = 2 * (z[0] * g.nx + z[1] * g.ny);
      return [z[0] - d * g.nx, z[1] - d * g.ny];
    }
    const dx = z[0] - g.cx, dy = z[1] - g.cy;
    const dd = dx * dx + dy * dy;
    if (dd < 1e-18) return [z[0], z[1]];
    const k = g.r2 / dd;
    return [g.cx + dx * k, g.cy + dy * k];
  }

  /* ---------- Hyperbolic Turing ---------- */
  Studio.register({
    id: 'hyperbolic',
    name: 'Hyperbolic Turing',
    tab: 'Curved',
    subtitle: 'reaction-diffusion on a {p,q} tiling · Poincare disk',
    order: 38,
    equation: '∂u/∂t = D_u Δ_G u − uv² + F(1−u),   ∂v/∂t = D_v Δ_G v + uv² − (F+k)v,   Δ_G u_i = Σ_{j∼i}(u_j − u_i)',
    credit: "The chemistry is the Gray-Scott model, Peter Gray and Stephen Scott, Chemical Engineering Science 38, 29 (1983) and 39, 1087 (1984), on Alan Turing's mechanism, 'The chemical basis of morphogenesis', Phil. Trans. R. Soc. B 237, 37 (1952). The substrate is the regular hyperbolic tessellation {p,q}, in the disk model Henri Poincare introduced in 1882; the construction by reflection in the sides of a fundamental polygon is standard, and the drawing convention of geodesics as circular arcs orthogonal to the boundary is what makes the model conformal. The Laplacian used is the degree-normalized graph Laplacian, which on a tiling of equal-area cells is the natural discretisation and, unlike the combinatorial one, means the same thing whatever p is.",
    blurb: 'Every pattern-forming system in this studio runs on a flat sheet, where the amount of space at distance r from a point grows like r. In the hyperbolic plane it grows like e^r, and nothing about a Turing pattern survives that unchanged. There is exponentially more room further out, so a pattern with a preferred wavelength cannot simply repeat: it has to keep branching to fill the space, and every cell is effectively near a boundary because almost all of the plane is. The tiling is built by taking one regular p-gon with q of them around each vertex and reflecting it in its own sides, forever; the Poincare disk squeezes all of that into a finite picture, which is why the cells shrink toward the edge. They are all the same size. It is the picture that is distorted, and the chemistry does not know.',
    schema: [
      { group: 'Tiling', key: 'pq', label: 'Tiling {p,q}', type: 'seg', kind: GEOM, wrap: true,
        options: [['7,3', '{7,3}'], ['5,4', '{5,4}'], ['4,5', '{4,5}'], ['6,4', '{6,4}'], ['3,7', '{3,7}'], ['8,3', '{8,3}']],
        hint: 'p sides per cell, q cells around each vertex. A tiling is hyperbolic exactly when 1/p + 1/q is less than a half; at equality it is the flat plane and the picture would be an ordinary lattice.' },
      RANGE('Tiling', 'rmax', 'Reach', GEOM, 0.8, 0.999, 0.002, f3, { hint: 'How far toward the boundary of the disk to build. Euclidean radius is a badly compressed ruler here: the first ring of cells already sits near 0.5 and the fourth near 0.93, so reaching a few more rings means going to three nines, and the cell cap below is what actually decides where it stops.' }),
      RANGE('Tiling', 'maxCells', 'Cell cap', GEOM, 400, 12000, 100, String),
      RANGE('Tiling', 'spin', 'Rotation', PAINT, 0, 360, 5, v => v + '°'),
      RANGE('Chemistry', 'F', 'Feed F', LIVE, 0.005, 0.11, 0.001, f3),
      RANGE('Chemistry', 'k', 'Kill k', LIVE, 0.03, 0.075, 0.0005, f4),
      RANGE('Chemistry', 'Du', 'Diffusion Dᵤ', LIVE, 0.1, 1.4, 0.02, f2),
      RANGE('Chemistry', 'Dv', 'Diffusion D_v', LIVE, 0.05, 0.7, 0.01, f2, {
        hint: 'Turing needs the inhibitor to outrun the activator, which here means Dᵤ above D_v by a factor of two or so. Bring them together and the pattern dissolves. The operator is normalized by the number of neighbors, so these numbers mean the same thing on every tiling offered.' }),
      RANGE('Chemistry', 'seedCells', 'Seed sites', GEOM, 1, 40, 1, String),
      RANGE('Chemistry', 'seedRadius', 'Seed radius', GEOM, 1, 6, 1, String, {
        hint: 'In cells. Below two the seed diffuses away before the reaction can take hold and the field relaxes back to nothing at all.' }),
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      RANGE('Simulation', 'steps', 'Steps per frame', LIVE, 1, 40, 1, String),
      RANGE('Simulation', 'dtScale', 'Step fraction', LIVE, 0.1, 1, 0.02, f2),
      RANGE('Simulation', 'warmup', 'Warm-up steps', GEOM, 0, 20000, 250, String),
      { group: 'Simulation', key: 'burst', label: 'Run 3,000 steps', type: 'action' },
      { group: 'Picture', key: 'view', label: 'Draw', type: 'seg', kind: PAINT, wrap: true,
        options: [['v', 'Inhibitor'], ['u', 'Activator'], ['ring', 'Distance from center'], ['plain', 'The tiling']] },
      { group: 'Picture', key: 'arcs', label: 'Geodesic edges', type: 'toggle', kind: PAINT,
        hint: 'On, each cell wall is the circular arc that a straight line actually is in this model. Off, walls are chords, which is faster and wrong in a way that only shows on the largest cells.' },
      RANGE('Picture', 'wall', 'Wall weight', PAINT, 0, 3, 0.1, f1),
      RANGE('Picture', 'lo', 'Black point', PAINT, 0, 0.6, 0.01, f2),
      RANGE('Picture', 'hi', 'White point', PAINT, 0.05, 1, 0.01, f2),
      RANGE('Picture', 'margin', 'Margin', PAINT, 0, 0.15, 0.01, f2),
      RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.6, 0.02, pct),
    ],
    defaults: {
      pq: '7,3', rmax: 0.996, maxCells: 3500, spin: 0,
      F: 0.037, k: 0.06, Du: 0.64, Dv: 0.32, seedCells: 8, seedRadius: 3,
      running: true, steps: 12, dtScale: 0.5, warmup: 9000,
      view: 'v', arcs: true, wall: 0.6, lo: 0.06, hi: 0.3, margin: 0.04, grain: 0.03,
      seed: 'poincare-1882',
    },
    presets: {
      spots: pre('Spots on {7,3}', { pq: '7,3', F: 0.037, k: 0.06, view: 'v', arcs: true, wall: 0.5, lo: 0.06, hi: 0.3, rmax: 0.996, maxCells: 3500 }, Pal.nightshade),
      worms: pre('Worms on {5,4}', { pq: '5,4', F: 0.03, k: 0.056, view: 'v', arcs: true, wall: 0.4, lo: 0.06, hi: 0.3, rmax: 0.996, maxCells: 3000 }, Pal.verdigris),
      mitosis: pre('Mitosis on {4,5}', { pq: '4,5', F: 0.028, k: 0.062, view: 'v', arcs: true, wall: 0.4, lo: 0.06, hi: 0.3, rmax: 0.996, maxCells: 3000 }, Pal.ember),
      coral: pre('Coral on {8,3}', { pq: '8,3', F: 0.055, k: 0.062, view: 'v', arcs: true, wall: 0.5, lo: 0.06, hi: 0.3, rmax: 0.996, maxCells: 3500 }, Pal.harbor),
      triangles: pre('{3,7}, and very many cells', { pq: '3,7', F: 0.037, k: 0.06, view: 'v', arcs: false, wall: 0.2, lo: 0.06, hi: 0.3, rmax: 0.997, maxCells: 6000 }, Pal.thermal),
      rings: pre('Distance from the center', { pq: '7,3', view: 'ring', arcs: true, wall: 0.8, rmax: 0.996, maxCells: 3500 }, Pal.glacier),
      tiling: pre('The tiling alone', { pq: '5,4', view: 'plain', arcs: true, wall: 1.4, rmax: 0.996, maxCells: 3500 }, Pal.graphite),
    },
    hints: {
      Tiling: 'The tiling is built by reflecting one cell in its own sides. The status line reports what fraction of interior vertices have exactly q cells around them, which is the check that the construction closed up rather than drifted.',
      Chemistry: 'The operator is the graph Laplacian: the sum of a cell’s neighbors minus its own value times how many it has. On a regular tiling that is the natural discretisation, and it is what makes the chemistry blind to the fact that the picture is distorted.',
    },
    palette: true, defaultPalette: 'nightshade',
    headline: 'k', headlineLabel: 'kill',
    sanitize(s) {
      s.maxCells = U.clamp(Math.round(Number(s.maxCells) || 4000), 400, 12000);
      s.rmax = U.clamp(Number(s.rmax) || 0.995, 0.8, 0.999);
    },
    surprise(rng) {
      return {
        pq: rng.pick(['7,3', '5,4', '4,5', '6,4', '8,3', '3,7']),
        F: rng.range(0.02, 0.07), k: rng.range(0.05, 0.068),
        Du: rng.range(0.4, 0.9), Dv: rng.range(0.2, 0.45),
        seedCells: rng.int(3, 20), seedRadius: rng.int(2, 5),
        view: rng.pick(['v', 'v', 'v', 'u', 'ring']),
        arcs: rng() < 0.85, wall: rng.range(0.2, 1.2),
        rmax: rng.pick([0.99, 0.995, 0.997]), maxCells: rng.pick([1500, 2500, 4000]),
        spin: rng.int(0, 71) * 5,
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let cells = null, nbr = null, nbrOff = null, gen = null;
      let u = null, v = null, u2 = null, v2 = null;
      let timer = 0, building = false, stepNo = 0, vertexOk = null, maxGen = 0, vMin = 0, vMax = 0;

      function stop() { clearTimeout(timer); clearTimeout(timer); }

      /* ---- build the tiling ---- */
      function buildTiling(s) {
        const [p, q] = String(s.pq).split(',').map(Number);
        if (!isHyperbolic(p, q)) return null;
        const R = circumradius(p, q);
        if (!(R > 0)) return null;
        const verts = [];
        for (let k = 0; k < p; k++) verts.push([R * Math.cos(TAU * k / p), R * Math.sin(TAU * k / p)]);
        const out = [{ v: verts, c: [0, 0], g: 0 }];
        // Dedup by centroid. Cells shrink toward the boundary as (1 - |c|^2), so a fixed tolerance either
        // merges distinct outer cells or fails to merge the two arrivals at the same inner cell. Scaling
        // the tolerance by that same factor is what makes one rule work across the whole disk.
        const buckets = new Map();
        const key = c => Math.round(c[0] * 500) + ',' + Math.round(c[1] * 500);
        const put = c => {
          const k0 = key(c);
          let arr = buckets.get(k0);
          if (!arr) { arr = []; buckets.set(k0, arr); }
          arr.push(c);
        };
        const seen = c => {
          const bx = Math.round(c[0] * 500), by = Math.round(c[1] * 500);
          const tol = 3e-3 * Math.max(1e-5, 1 - c[0] * c[0] - c[1] * c[1]);
          for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
            const arr = buckets.get((bx + dx) + ',' + (by + dy));
            if (!arr) continue;
            for (const o of arr) if (Math.hypot(o[0] - c[0], o[1] - c[1]) < tol) return true;
          }
          return false;
        };
        put([0, 0]);
        const rmax2 = s.rmax * s.rmax;
        for (let head = 0; head < out.length && out.length < s.maxCells; head++) {
          const cell = out[head];
          for (let e = 0; e < p; e++) {
            if (out.length >= s.maxCells) break;
            const a = cell.v[e], b = cell.v[(e + 1) % p];
            const g = geodesic(a, b);
            const nv = new Array(p);
            let cx = 0, cy = 0, ok = true;
            for (let i = 0; i < p; i++) {
              const z = reflect(g, cell.v[i]);
              if (!isFinite(z[0]) || !isFinite(z[1])) { ok = false; break; }
              nv[i] = z; cx += z[0]; cy += z[1];
            }
            if (!ok) continue;
            cx /= p; cy /= p;
            if (cx * cx + cy * cy > rmax2) continue;
            if (seen([cx, cy])) continue;
            put([cx, cy]);
            out.push({ v: nv, c: [cx, cy], g: cell.g + 1 });
          }
        }
        return { p, q, R, list: out };
      }

      // Adjacency from shared vertices: two cells are neighbors when they have two vertices in common,
      // which is one whole edge. Matching on the edge midpoint rather than on the vertices themselves
      // avoids having to decide which of two floating point vertices is "the same" one twice over.
      function buildAdjacency(T) {
        const list = T.list, p = T.p, n = list.length;
        const edges = new Map();
        const ekey = (a, b) => {
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          return Math.round(mx * 20000) + ',' + Math.round(my * 20000);
        };
        for (let i = 0; i < n; i++) {
          const cv = list[i].v;
          for (let e = 0; e < p; e++) {
            const k = ekey(cv[e], cv[(e + 1) % p]);
            let arr = edges.get(k);
            if (!arr) { arr = []; edges.set(k, arr); }
            arr.push(i);
          }
        }
        const adj = new Array(n);
        for (let i = 0; i < n; i++) adj[i] = [];
        for (const arr of edges.values()) {
          if (arr.length !== 2) continue;
          adj[arr[0]].push(arr[1]);
          adj[arr[1]].push(arr[0]);
        }
        nbrOff = new Int32Array(n + 1);
        let tot = 0;
        for (let i = 0; i < n; i++) { nbrOff[i] = tot; tot += adj[i].length; }
        nbrOff[n] = tot;
        nbr = new Int32Array(tot);
        let w = 0;
        for (let i = 0; i < n; i++) for (const j of adj[i]) nbr[w++] = j;

        // Does the tiling actually close up? At an interior vertex of a {p,q} tiling exactly q cells meet.
        // Counting them is the one check that catches a wrong circumradius, a bad reflection or a dedup
        // tolerance that merged cells it should not have, none of which look wrong in the picture.
        const vmap = new Map();
        for (let i = 0; i < n; i++) for (const z of list[i].v) {
          const k = Math.round(z[0] * 20000) + ',' + Math.round(z[1] * 20000);
          vmap.set(k, (vmap.get(k) || 0) + 1);
        }
        let good = 0, tested = 0;
        const inner = s2 => s2 < (0.75 * 0.75);
        for (const [k, cnt] of vmap) {
          const parts = k.split(',');
          const x = +parts[0] / 20000, y = +parts[1] / 20000;
          if (!inner(x * x + y * y)) continue;
          tested++;
          if (cnt === T.q) good++;
        }
        vertexOk = tested > 0 ? good / tested : null;
      }

      /* ---- chemistry ---- */
      // The graph Laplacian has eigenvalues in [-2 deg, 0] on a regular graph of degree deg, so an
      // explicit step needs dt below 2 over the largest of (D * 2 deg) plus whatever the reaction
      // contributes. Past it the field fills with the cell-scale checkerboard, which at this cell size
      // reads as texture rather than as the failure it is.
      function maxDt(s) {
        const diff = Math.max(s.Du, s.Dv) * 2;
        const react = 3;
        return 2 / Math.max(1e-6, diff + react);
      }
      const dtOf = s => maxDt(s) * s.dtScale;

      // Seeds are balls of cells, not single cells. A one-cell seed with its immediate neighbors does not
      // survive: diffusion spreads it below the threshold where u v^2 can beat (F + k) v before the
      // reaction has anything to work with, and the whole field relaxes silently back to u = 1, v = 0.
      // The plate then shows a perfectly good tiling with no chemistry on it, which looks like a design
      // choice rather than a dead simulation. A ball of radius two or more grows.
      function ball(i, radius, mark) {
        const seenSet = new Set([i]);
        let frontier = [i];
        for (let d = 0; d < radius; d++) {
          const next = [];
          for (const c of frontier) for (let m = nbrOff[c]; m < nbrOff[c + 1]; m++) {
            const j = nbr[m];
            if (seenSet.has(j)) continue;
            seenSet.add(j); next.push(j);
          }
          frontier = next;
        }
        for (const c of seenSet) mark(c);
      }
      function seedChem(s, T) {
        const n = T.list.length;
        u = new Float32Array(n).fill(1);
        v = new Float32Array(n).fill(0);
        u2 = new Float32Array(n); v2 = new Float32Array(n);
        const rng = U.makeRng(s.seed + '/hyperbolic');
        // Seeds are spread across rings, not drawn uniformly from the cell list. In hyperbolic space the
        // number of cells grows exponentially with the ring, so almost every cell is in the outermost one
        // and a uniform draw puts every seed against the boundary: the first version did exactly that and
        // produced a plate with a ring of spots around an empty middle. Picking a ring first and then a
        // cell within it gives the pattern somewhere to start at every scale, which in this model is what
        // self-similar detail looks like.
        const byGen = [];
        for (let i = 0; i < n; i++) { const g = gen[i]; (byGen[g] || (byGen[g] = [])).push(i); }
        const rings = byGen.filter(Boolean);
        ball(0, s.seedRadius, c => { u[c] = 0.5; v[c] = 0.25; });
        for (let k = 0; k < s.seedCells; k++) {
          const ring = rings[Math.min(rings.length - 1, Math.floor(rng() * rings.length))];
          const i = ring[Math.min(ring.length - 1, Math.floor(rng() * ring.length))];
          ball(i, s.seedRadius, c => { u[c] = 0.5; v[c] = 0.25; });
        }
      }
      function stepChem(s, n) {
        const N = u.length, dt = dtOf(s);
        for (let it = 0; it < n; it++) {
          for (let i = 0; i < N; i++) {
            const a = nbrOff[i], b = nbrOff[i + 1];
            let su = 0, sv = 0;
            for (let m = a; m < b; m++) { su += u[nbr[m]]; sv += v[nbr[m]]; }
            const deg = b - a;
            // Degree-normalized Laplacian: the average of the neighbors minus the cell, not the sum.
            // The combinatorial version makes the diffusion coefficient mean something different on every
            // tiling, because a {3,7} cell has three neighbors and an {8,3} cell has eight, so the same
            // F and k give a pattern on one and a washed-out gradient on the next. Normalizing also puts
            // the operator's spectrum in [-2, 0] regardless of p, which is what lets one step bound and
            // one set of Gray-Scott coefficients work across all of them.
            const inv = deg > 0 ? 1 / deg : 0;
            const lu = (su - deg * u[i]) * inv, lv = (sv - deg * v[i]) * inv;
            const uv2 = u[i] * v[i] * v[i];
            u2[i] = u[i] + dt * (s.Du * lu - uv2 + s.F * (1 - u[i]));
            v2[i] = v[i] + dt * (s.Dv * lv + uv2 - (s.F + s.k) * v[i]);
          }
          const tu = u; u = u2; u2 = tu;
          const tv = v; v = v2; v2 = tv;
        }
        stepNo += n;
        vMin = Infinity; vMax = -Infinity;
        for (let i = 0; i < N; i++) { if (v[i] < vMin) vMin = v[i]; if (v[i] > vMax) vMax = v[i]; }
      }

      let T0 = null;

      /* ---- picture ---- */
      let lut = null, lutKey = '';
      function ensureLut(s) {
        const key = (s.palette || []).join(',');
        if (lut && lutKey === key) return;
        lut = U.makeRampLUT(s.palette, null, 256); lutKey = key;
      }
      function colorOf(s, i) {
        let t;
        if (s.view === 'u') t = (u[i] - s.lo) / Math.max(s.hi - s.lo, 1e-4);
        else if (s.view === 'ring') t = maxGen > 0 ? gen[i] / maxGen : 0;
        else if (s.view === 'plain') t = 0.55;
        else t = (v[i] - s.lo) / Math.max(s.hi - s.lo, 1e-4);
        const c = Math.max(0, Math.min(255, Math.round(U.clamp(t, 0, 1) * 255))) * 3;
        return 'rgb(' + lut[c] + ',' + lut[c + 1] + ',' + lut[c + 2] + ')';
      }

      function cellPath(c2, cell, cx, cy, R, arcs) {
        const p = cell.v.length;
        const X = z => cx + z[0] * R, Y = z => cy - z[1] * R;
        c2.beginPath();
        c2.moveTo(X(cell.v[0]), Y(cell.v[0]));
        for (let e = 0; e < p; e++) {
          const a = cell.v[e], b = cell.v[(e + 1) % p];
          if (!arcs) { c2.lineTo(X(b), Y(b)); continue; }
          const g = geodesic(a, b);
          if (g.line) { c2.lineTo(X(b), Y(b)); continue; }
          // the geodesic arc, in screen coordinates; y is flipped, so the sweep direction flips with it
          const gx = cx + g.cx * R, gy = cy - g.cy * R, gr = g.r * R;
          let a0 = Math.atan2(Y(a) - gy, X(a) - gx);
          let a1 = Math.atan2(Y(b) - gy, X(b) - gx);
          let d = a1 - a0;
          while (d > PI) d -= TAU;
          while (d < -PI) d += TAU;
          c2.arc(gx, gy, gr, a0, a0 + d, d < 0);
        }
        c2.closePath();
      }

      function paint(c2, W, H) {
        const s = host.getState();
        c2.fillStyle = s.bg; c2.fillRect(0, 0, W, H);
        if (!T0 || !u) return;
        ensureLut(s);
        const R = Math.min(W, H) * (1 - 2 * s.margin) / 2;
        const cx = W / 2, cy = H / 2;
        const rot = s.spin * PI / 180;
        const cs = Math.cos(rot), sn = Math.sin(rot);
        const list = T0.list;
        // rotation is applied to the disk, not to the tiling, so the chemistry is untouched by it
        const rotated = rot === 0 ? list : list.map(cell => ({
          v: cell.v.map(z => [z[0] * cs - z[1] * sn, z[0] * sn + z[1] * cs]),
          c: cell.c, g: cell.g,
        }));
        c2.lineJoin = 'round';
        const wallW = s.wall * Math.min(W, H) / 900;
        for (let i = 0; i < rotated.length; i++) {
          cellPath(c2, rotated[i], cx, cy, R, s.arcs);
          c2.fillStyle = colorOf(s, i);
          c2.fill();
          if (wallW > 0) { c2.lineWidth = wallW; c2.strokeStyle = U.inkRgba(s.bg, 0.55); c2.stroke(); }
        }
        if (s.grain > 0 && !building) {
          const img = c2.getImageData(0, 0, W, H), px = img.data;
          const rng = U.makeRng(s.seed + '/grain'), amp = s.grain * 28;
          for (let i = 0; i < px.length; i += 4) { const g2 = (rng() - 0.5) * amp; px[i] += g2; px[i + 1] += g2; px[i + 2] += g2; }
          c2.putImageData(img, 0, 0);
        }
      }
      function render() { paint(ctx, canvas.width, canvas.height); }

      function status(extra) {
        const s = host.getState();
        const [p, q] = String(s.pq).split(',').map(Number);
        host.setStatus(
          '<span>tiling <b>{' + p + ',' + q + '}</b> · ' + (T0 ? T0.list.length.toLocaleString() : 0) + ' cells</span>' +
          (vertexOk !== null ? '<span>vertices with exactly <b>' + q + '</b> cells: ' + Math.round(vertexOk * 100) + '%</span>' : '') +
          '<span>rings <b>' + maxGen + '</b> deep</span>' +
          (v ? '<span>inhibitor <b>' + vMin.toFixed(3) + ' … ' + vMax.toFixed(3) + '</b></span>' : '') +
          '<span>step <b>' + stepNo.toLocaleString() + '</b> · dt ' + dtOf(s, p).toFixed(3) + '</span>' +
          (extra ? '<span>' + extra + '</span>' : '')
        );
      }

      let raf = 0;
      function stopAll() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        stepChem(s, s.steps);
        render();
        if (stepNo % 200 < s.steps) status();
        raf = requestAnimationFrame(frame);
      }
      function startLoop() {
        stopAll();
        const s = host.getState();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { render(); status(!s.running ? 'paused' : ''); }
      }
      function burst(total) {
        stopAll(); building = true;
        let left = total;
        const s = host.getState();
        (function chunk() {
          const t0 = performance.now();
          while (left > 0 && performance.now() - t0 < 40) { const n = Math.min(40, left); stepChem(s, n); left -= n; }
          if (left > 0) { status('running'); timer = setTimeout(chunk, 0); }
          else { building = false; render(); status(); startLoop(); }
        })();
      }

      return {
        aspect() { return ASPECT; },
        regenerate() {
          stopAll(); stepNo = 0; building = true;
          const s = host.getState();
          T0 = buildTiling(s);
          if (!T0) { building = false; host.setStatus('that {p,q} is not hyperbolic'); host.fault('{p,q} must satisfy 1/p + 1/q < 1/2'); return; }
          buildAdjacency(T0);
          gen = new Int32Array(T0.list.length);
          maxGen = 0;
          for (let i = 0; i < T0.list.length; i++) { gen[i] = T0.list[i].g; if (gen[i] > maxGen) maxGen = gen[i]; }
          seedChem(s, T0);
          building = false;
          render();
          const warm = host.reducedMotion() ? Math.min(s.warmup, 800) : s.warmup;
          if (warm > 0) burst(warm); else { status(); startLoop(); }
        },
        repaint() { if (T0) render(); },
        live(key) { if (key === 'running') startLoop(); else if (!raf) startLoop(); },
        resize() { if (T0) render(); },
        pause() { stopAll(); },
        resume() { if (T0) { render(); startLoop(); } },
        action(key) { if (key === 'burst') burst(3000); },
        // A poke lands on the nearest cell to the pointer, measured in the picture rather than in the
        // hyperbolic metric, which is what the viewer is actually aiming at.
        disturb(pt) {
          if (!T0 || !u) return;
          const s = host.getState();
          const rot = -s.spin * PI / 180;
          const x = (pt.x - 0.5) * 2 / (1 - 2 * s.margin);
          const y = -(pt.y - 0.5) * 2 / (1 - 2 * s.margin);
          const dx = x * Math.cos(rot) - y * Math.sin(rot), dy = x * Math.sin(rot) + y * Math.cos(rot);
          let best = -1, bd = Infinity;
          for (let i = 0; i < T0.list.length; i++) {
            const c = T0.list[i].c;
            const d = (c[0] - dx) * (c[0] - dx) + (c[1] - dy) * (c[1] - dy);
            if (d < bd) { bd = d; best = i; }
          }
          if (best < 0) return;
          u[best] = 0.5; v[best] = 0.25;
          for (let m = nbrOff[best]; m < nbrOff[best + 1]; m++) { u[nbr[m]] = 0.5; v[nbr[m]] = 0.25; }
          render(); startLoop();
        },
        async exportPNG(w, h) {
          if (!T0) throw new Error('nothing to export');
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          paint(c.getContext('2d'), w, h);
          return U.toBlob(c);
        },
        // Cells are discrete marks with real geometry, so the vector file is the tiling itself: each cell
        // a path of geodesic arcs, at the printer's resolution rather than at the canvas's.
        exportSVG(w, h) {
          if (!T0 || !u) throw new Error('nothing to export');
          const s = host.getState();
          ensureLut(s);
          const R = Math.min(w, h) * (1 - 2 * s.margin) / 2, cx = w / 2, cy = h / 2;
          const rot = s.spin * PI / 180, cs = Math.cos(rot), sn = Math.sin(rot);
          const r2 = val => Math.round(val * 100) / 100;
          const wallW = s.wall * Math.min(w, h) / 900;
          let body = '';
          for (let i = 0; i < T0.list.length; i++) {
            const cell = T0.list[i];
            const vs = cell.v.map(z => [z[0] * cs - z[1] * sn, z[0] * sn + z[1] * cs]);
            const X = z => cx + z[0] * R, Y = z => cy - z[1] * R;
            let d = 'M' + r2(X(vs[0])) + ' ' + r2(Y(vs[0]));
            for (let e = 0; e < vs.length; e++) {
              const a = vs[e], b = vs[(e + 1) % vs.length];
              const g = s.arcs ? geodesic(a, b) : { line: true };
              if (g.line) { d += 'L' + r2(X(b)) + ' ' + r2(Y(b)); continue; }
              const gx = cx + g.cx * R, gy = cy - g.cy * R, gr = g.r * R;
              let a0 = Math.atan2(Y(a) - gy, X(a) - gx), a1 = Math.atan2(Y(b) - gy, X(b) - gx);
              let da = a1 - a0;
              while (da > PI) da -= TAU;
              while (da < -PI) da += TAU;
              d += 'A' + r2(gr) + ' ' + r2(gr) + ' 0 0 ' + (da > 0 ? 1 : 0) + ' ' + r2(X(b)) + ' ' + r2(Y(b));
            }
            d += 'Z';
            body += '<path d="' + d + '" fill="' + colorOf(s, i) + '"' +
              (wallW > 0 ? ' stroke="' + U.inkFor(s.bg) + '" stroke-opacity="0.55" stroke-width="' + r2(wallW) + '"' : '') + '/>';
          }
          return U.svgBlob(w, h, s.bg, body);
        },
      };
    },
  });
})();
