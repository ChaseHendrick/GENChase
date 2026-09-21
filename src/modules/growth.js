
/* modules/growth.js */
/* GENChase — Differential Growth: buckling curves, coral and cortex folding. */
(function () {
  'use strict';
  const U = Studio.util;
  const TAU = U.TAU;
  const W = 1000;            // virtual width in "units"; everything (radii, widths) is measured in units
  const NB = 32;             // color buckets for gradient / curvature strokes
  const MAX_SNAPS = 72;      // ghost snapshots kept before thinning
  const FRAME_BUDGET_MS = 22;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };

  const pct = v => (v * 100).toFixed(1) + '%';
  const f1 = v => v.toFixed(1);
  const f2 = v => v.toFixed(2);

  const schema = [
    // ---- Shape
    { group: 'Shape', key: 'shape', label: 'Initial shape', type: 'seg', kind: 'geom', wrap: true,
      options: [['circle', 'Circle'], ['polygon', 'Polygon'], ['blob', 'Noise blob'], ['line', 'Line'], ['spiral', 'Spiral']] },
    { group: 'Shape', key: 'rings', label: 'Curves', type: 'range', kind: 'geom', min: 1, max: 9, step: 1,
      hint: 'Nested copies for circles, polygons and blobs; parallel copies for lines; extra turns for spirals.' },
    { group: 'Shape', key: 'count', label: 'Initial nodes per curve', type: 'range', kind: 'geom', min: 12, max: 600, step: 4 },
    { group: 'Shape', key: 'size', label: 'Initial size', type: 'range', kind: 'geom', min: 0.03, max: 0.45, step: 0.01, fmt: f2 },
    { group: 'Shape', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['16:9', '16:9']] },
    // ---- Growth
    { group: 'Growth', key: 'growth', label: 'Growth rate', type: 'range', kind: 'live', min: 0, max: 0.05, step: 0.001, fmt: pct,
      hint: 'New nodes injected per iteration, as a share of the current node count.' },
    { group: 'Growth', key: 'growthAt', label: 'Grow where', type: 'seg', kind: 'live', options: [['even', 'Everywhere'], ['curved', 'Bends'], ['noise', 'Patches']] },
    { group: 'Growth', key: 'iters', label: 'Iterations per frame', type: 'range', kind: 'live', min: 1, max: 10, step: 1 },
    { group: 'Growth', key: 'stopAfter', label: 'Stop after', type: 'range', kind: 'live', min: 100, max: 5000, step: 50, fmt: v => v >= 5000 ? '∞' : v + ' it' },
    { group: 'Growth', key: 'maxNodes', label: 'Max nodes', type: 'range', kind: 'live', min: 500, max: 30000, step: 500 },
    { group: 'Growth', key: 'reset', label: 'Restart growth', type: 'action' },
    // ---- Forces
    { group: 'Forces', key: 'radius', label: 'Repulsion radius', type: 'range', kind: 'live', min: 4, max: 80, step: 1 },
    { group: 'Forces', key: 'repulsion', label: 'Repulsion', type: 'range', kind: 'live', min: 0, max: 3, step: 0.05, fmt: f2 },
    { group: 'Forces', key: 'attraction', label: 'Attraction', type: 'range', kind: 'live', min: 0, max: 1, step: 0.01, fmt: f2 },
    { group: 'Forces', key: 'alignment', label: 'Alignment', type: 'range', kind: 'live', min: 0, max: 1, step: 0.01, fmt: f2 },
    { group: 'Forces', key: 'noise', label: 'Noise force', type: 'range', kind: 'live', min: 0, max: 1.5, step: 0.01, fmt: f2 },
    { group: 'Forces', key: 'noiseScale', label: 'Noise scale', type: 'range', kind: 'live', min: 0.002, max: 0.05, step: 0.001, fmt: v => (v * 1000).toFixed(0), dimUnless: s => s.noise > 0 },
    { group: 'Forces', key: 'split', label: 'Split distance', type: 'range', kind: 'live', min: 2, max: 40, step: 0.5, fmt: f1 },
    { group: 'Forces', key: 'merge', label: 'Merge distance', type: 'range', kind: 'live', min: 0.5, max: 20, step: 0.5, fmt: f1 },
    // ---- Boundary
    { group: 'Boundary', key: 'boundary', label: 'Mode', type: 'seg', kind: 'live', options: [['none', 'None'], ['circle', 'Circle'], ['frame', 'Frame'], ['center', 'Center pull']] },
    { group: 'Boundary', key: 'margin', label: 'Margin', type: 'range', kind: 'live', min: 0, max: 300, step: 5, dimUnless: s => s.boundary === 'circle' || s.boundary === 'frame' },
    { group: 'Boundary', key: 'boundaryStrength', label: 'Strength', type: 'range', kind: 'live', min: 0.05, max: 1, step: 0.05, fmt: f2, dimUnless: s => s.boundary !== 'none' },
    // ---- Color
    { group: 'Color', key: 'colorMode', label: 'Line color', type: 'seg', kind: 'paint', options: [['ring', 'Per curve'], ['gradient', 'Along curve'], ['curvature', 'By curvature']] },
    { group: 'Color', key: 'fill', label: 'Fill', type: 'seg', kind: 'paint', options: [['none', 'None'], ['rings', 'Per curve'], ['evenodd', 'Alternating']] },
    { group: 'Color', key: 'fillAlpha', label: 'Fill opacity', type: 'range', kind: 'paint', min: 0.05, max: 1, step: 0.05, fmt: f2, dimUnless: s => s.fill !== 'none' },
    { group: 'Color', key: 'strokeWidth', label: 'Stroke width', type: 'range', kind: 'paint', min: 0, max: 8, step: 0.1, fmt: f1 },
    { group: 'Color', key: 'opacity', label: 'Stroke opacity', type: 'range', kind: 'paint', min: 0.1, max: 1, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'glow', label: 'Glow', type: 'toggle', kind: 'paint' },
    // ---- Ghost trails
    { group: 'Ghost trails', key: 'ghost', label: 'Ghost trails', type: 'toggle', kind: 'paint' },
    { group: 'Ghost trails', key: 'ghostEvery', label: 'Snapshot every', type: 'range', kind: 'geom', min: 2, max: 40, step: 1, fmt: v => v + ' it', dimUnless: s => s.ghost },
    { group: 'Ghost trails', key: 'ghostAlpha', label: 'Trail opacity', type: 'range', kind: 'paint', min: 0.02, max: 0.6, step: 0.01, fmt: f2, dimUnless: s => s.ghost },
    // ---- Effects
    { group: 'Effects', key: 'grain', label: 'Grain', type: 'range', kind: 'paint', min: 0, max: 1, step: 0.05, fmt: f2 },
  ];

  const defaults = {
    shape: 'circle', rings: 1, count: 120, size: 0.12, aspect: '4:5',
    growth: 0.012, growthAt: 'even', iters: 3, stopAfter: 1500, maxNodes: 12000,
    radius: 24, repulsion: 1.1, attraction: 0.5, alignment: 0.4, noise: 0.18, noiseScale: 0.008, split: 9, merge: 3.5,
    boundary: 'none', margin: 60, boundaryStrength: 0.4,
    colorMode: 'gradient', fill: 'none', fillAlpha: 0.35, strokeWidth: 1.6, opacity: 0.95, glow: false,
    ghost: false, ghostEvery: 8, ghostAlpha: 0.12,
    grain: 0.2,
  };

  const P = Studio.PALETTES;
  const presets = {
    coral: { label: 'Coral', palette: P.ember,
      p: { shape: 'circle', rings: 1, count: 120, size: 0.12, growth: 0.012, growthAt: 'even', radius: 24, repulsion: 1.1, attraction: 0.5, alignment: 0.4, noise: 0.18, noiseScale: 0.008, split: 9, merge: 3.5, boundary: 'none', colorMode: 'gradient', fill: 'none', strokeWidth: 1.6, opacity: 0.95, glow: false, ghost: false, grain: 0.2, maxNodes: 12000, stopAfter: 1500 } },
    cortex: { label: 'Cortex', palette: P.petri,
      p: { shape: 'blob', rings: 1, count: 160, size: 0.22, growth: 0.02, growthAt: 'even', radius: 14, repulsion: 1.4, attraction: 0.55, alignment: 0.5, noise: 0.06, noiseScale: 0.012, split: 6, merge: 2.5, boundary: 'circle', margin: 70, boundaryStrength: 0.6, colorMode: 'curvature', fill: 'rings', fillAlpha: 0.25, strokeWidth: 1.4, opacity: 1, glow: false, ghost: false, grain: 0.25, maxNodes: 16000, stopAfter: 2500, aspect: '1:1' } },
    lettuce: { label: 'Lettuce', palette: P.meadow,
      p: { shape: 'circle', rings: 1, count: 100, size: 0.1, growth: 0.02, growthAt: 'curved', radius: 20, repulsion: 1.0, attraction: 0.45, alignment: 0.3, noise: 0.35, noiseScale: 0.012, split: 8, merge: 3, boundary: 'none', colorMode: 'curvature', fill: 'evenodd', fillAlpha: 0.45, strokeWidth: 1.8, opacity: 1, glow: false, ghost: false, grain: 0.2, maxNodes: 14000, stopAfter: 1600, aspect: '1:1' } },
    cracks: { label: 'Cracks', palette: P.graphite,
      p: { shape: 'line', rings: 5, count: 80, size: 0.36, growth: 0.008, growthAt: 'noise', radius: 26, repulsion: 1.3, attraction: 0.55, alignment: 0.45, noise: 0.25, noiseScale: 0.006, split: 10, merge: 4, boundary: 'frame', margin: 50, boundaryStrength: 0.5, colorMode: 'ring', fill: 'none', strokeWidth: 1.0, opacity: 0.9, glow: false, ghost: false, grain: 0.3, maxNodes: 10000, stopAfter: 1400, aspect: '5:4' } },
    rings: { label: 'Rings', palette: P.glacier,
      p: { shape: 'circle', rings: 4, count: 90, size: 0.06, growth: 0.006, growthAt: 'even', radius: 30, repulsion: 1.2, attraction: 0.5, alignment: 0.5, noise: 0.1, noiseScale: 0.006, split: 11, merge: 4, boundary: 'none', colorMode: 'ring', fill: 'none', strokeWidth: 1.2, opacity: 0.9, glow: false, ghost: true, ghostEvery: 6, ghostAlpha: 0.14, grain: 0.15, maxNodes: 10000, stopAfter: 1200, aspect: '1:1' } },
    bloom: { label: 'Bloom', palette: P.thermal,
      p: { shape: 'polygon', rings: 1, count: 60, size: 0.07, growth: 0.014, growthAt: 'curved', radius: 28, repulsion: 1.6, attraction: 0.4, alignment: 0.25, noise: 0.12, noiseScale: 0.01, split: 10, merge: 4, boundary: 'circle', margin: 40, boundaryStrength: 0.5, colorMode: 'gradient', fill: 'none', strokeWidth: 1.4, opacity: 0.95, glow: true, ghost: true, ghostEvery: 5, ghostAlpha: 0.08, grain: 0.15, maxNodes: 12000, stopAfter: 1800, aspect: '1:1' } },
    filament: { label: 'Filament', palette: P.bioluminescent,
      p: { shape: 'spiral', rings: 3, count: 400, size: 0.3, growth: 0.006, growthAt: 'noise', radius: 16, repulsion: 0.8, attraction: 0.35, alignment: 0.2, noise: 0.7, noiseScale: 0.014, split: 7, merge: 2.5, boundary: 'frame', margin: 40, boundaryStrength: 0.4, colorMode: 'gradient', fill: 'none', strokeWidth: 0.8, opacity: 0.85, glow: true, ghost: false, grain: 0.1, maxNodes: 12000, stopAfter: 1600, aspect: '4:5' } },
    ink: { label: 'Ink', palette: P.risograph,
      p: { shape: 'blob', rings: 3, count: 140, size: 0.16, growth: 0.014, growthAt: 'even', radius: 22, repulsion: 1.2, attraction: 0.5, alignment: 0.4, noise: 0.2, noiseScale: 0.009, split: 9, merge: 3.5, boundary: 'frame', margin: 60, boundaryStrength: 0.5, colorMode: 'ring', fill: 'rings', fillAlpha: 0.7, strokeWidth: 2.2, opacity: 1, glow: false, ghost: false, grain: 0.3, maxNodes: 12000, stopAfter: 1400, aspect: '4:5' } },
  };

  function keepInvariants(s, key) {
    // merge <= 0.6 * split <= 0.5 * radius, adjusting the field the user did not just touch
    if (key === 'merge') {
      if (s.merge > s.split * 0.6) s.split = Math.min(40, Math.ceil(s.merge / 0.6 * 2) / 2);
      if (s.radius < s.split * 1.2) s.radius = Math.min(80, Math.ceil(s.split * 1.2));
    } else if (key === 'radius') {
      if (s.radius < s.split * 1.2) s.split = Math.max(2, Math.floor(s.radius / 1.2 * 2) / 2);
      if (s.merge > s.split * 0.6) s.merge = Math.max(0.5, Math.floor(s.split * 0.6 * 2) / 2);
    } else {
      if (s.merge > s.split * 0.6) s.merge = Math.max(0.5, Math.floor(s.split * 0.6 * 2) / 2);
      if (s.radius < s.split * 1.2) s.radius = Math.min(80, Math.ceil(s.split * 1.2));
    }
  }

  /* ================================================================
     geometry helpers
  ================================================================ */
  function turnAngle(xs, ys, k, c, closed) {
    let a, b;
    if (closed) { a = (k + c - 1) % c; b = (k + 1) % c; }
    else { if (k === 0 || k === c - 1) return 0; a = k - 1; b = k + 1; }
    const ux = xs[k] - xs[a], uy = ys[k] - ys[a], vx = xs[b] - xs[k], vy = ys[b] - ys[k];
    return Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
  }

  // Smooth closed/open path through midpoints (quadratic through each node as control point).
  function ringPath(path, xs, ys, closed) {
    const c = xs.length;
    if (c < 2) return;
    if (closed) {
      const l = c - 1;
      path.moveTo((xs[l] + xs[0]) / 2, (ys[l] + ys[0]) / 2);
      for (let k = 0; k < c; k++) { const n = (k + 1) % c; path.quadraticCurveTo(xs[k], ys[k], (xs[k] + xs[n]) / 2, (ys[k] + ys[n]) / 2); }
      path.closePath();
    } else {
      path.moveTo(xs[0], ys[0]);
      for (let k = 1; k < c - 1; k++) path.quadraticCurveTo(xs[k], ys[k], (xs[k] + xs[k + 1]) / 2, (ys[k] + ys[k + 1]) / 2);
      path.lineTo(xs[c - 1], ys[c - 1]);
    }
  }

  // Per-node piece: mid(prev,k) -> k -> mid(k,next), used for bucketed coloring.
  function nodePiece(path, xs, ys, k, c, closed) {
    let ax, ay, bx, by;
    if (closed || k > 0) { const p = (k + c - 1) % c; ax = (xs[p] + xs[k]) / 2; ay = (ys[p] + ys[k]) / 2; } else { ax = xs[k]; ay = ys[k]; }
    if (closed || k < c - 1) { const n = (k + 1) % c; bx = (xs[n] + xs[k]) / 2; by = (ys[n] + ys[k]) / 2; } else { bx = xs[k]; by = ys[k]; }
    path.moveTo(ax, ay);
    path.quadraticCurveTo(xs[k], ys[k], bx, by);
  }

  /* ================================================================
     module
  ================================================================ */
  Studio.register({
    id: 'growth', name: 'Differential Growth', subtitle: 'buckling curves, coral and cortex folding · 2010s', equation: 'pi <- pi + a·(neighbors) - r·sum|pj-pi|<R (pj-pi);   split an edge when |e| > dmax', credit: "Differential line growth as a digital technique, documented by Anders Hoff (inconvergent) and indexed in Jason Webb's morphogenesis resources. The underlying idea is D'Arcy Wentworth Thompson, On Growth and Form, 1917.", order: 30,
    blurb: 'Differential growth is the geometry behind coral, lettuce leaves and the folded cortex: a surface that grows faster than the space it is allowed to occupy has to buckle. Here a closed curve of nodes is pulled tight by its neighbors, pushed away from every other part of itself, smoothed toward the local midpoint, and steadily given new nodes. Excess length has nowhere to go, so the curve wrinkles into ever finer lobes, each fold making room for the next.',
    schema, defaults, presets,
    hints: {
      Forces: 'Repulsion inflates the curve, attraction pulls it taut, alignment irons out kinks. Edges longer than the split distance gain a node; nodes closer than the merge distance collapse.',
      'Ghost trails': 'Keeps a faint copy of every N-th iteration underneath the live curve so the picture shows its own growth history.',
    },
    closedGroups: ['Boundary', 'Effects'],
    palette: true, defaultPalette: 'ember', paletteLabel: 'Colors (order matters for ramps)',
    headline: 'maxNodes', headlineLabel: 'max nodes',

    surprise(rng) {
      const shape = rng.pick(['circle', 'circle', 'blob', 'blob', 'polygon', 'line', 'spiral']);
      const open = shape === 'line' || shape === 'spiral';
      const split = rng.pick([6, 7, 8, 9, 10, 12]);
      const radius = Math.round(split * rng.range(1.8, 3.4));
      const ghost = rng() < 0.35;
      return {
        shape,
        rings: shape === 'circle' ? rng.pick([1, 1, 2, 3, 4, 5]) : shape === 'line' ? rng.int(2, 7) : rng.pick([1, 1, 2, 3]),
        count: rng.pick([60, 90, 120, 160, 240]),
        size: open ? rng.range(0.25, 0.4) : rng.range(0.06, 0.2),
        aspect: rng.pick(['1:1', '4:5', '4:5', '5:4', '3:2']),
        growth: rng.range(0.006, 0.022),
        growthAt: rng.pick(['even', 'even', 'curved', 'noise']),
        radius, split, merge: Math.max(0.5, Math.floor(split * rng.range(0.3, 0.55) * 2) / 2),
        repulsion: rng.range(0.8, 1.7), attraction: rng.range(0.3, 0.65), alignment: rng.range(0.2, 0.6),
        noise: rng() < 0.2 ? 0 : rng.range(0.05, 0.6), noiseScale: rng.range(0.005, 0.016),
        boundary: rng.pick(['none', 'none', 'circle', 'frame', 'frame']), margin: rng.pick([30, 50, 70, 100]), boundaryStrength: rng.range(0.3, 0.7),
        colorMode: rng.pick(['ring', 'gradient', 'gradient', 'curvature']),
        fill: open ? 'none' : rng.pick(['none', 'none', 'rings', 'evenodd']), fillAlpha: rng.range(0.2, 0.7),
        strokeWidth: rng.range(0.8, 2.4), opacity: rng.range(0.8, 1), glow: rng() < 0.25,
        ghost, ghostEvery: rng.int(4, 12), ghostAlpha: rng.range(0.06, 0.18),
        grain: rng.pick([0, 0.15, 0.25, 0.35]),
        maxNodes: rng.pick([8000, 10000, 12000, 16000]), stopAfter: rng.pick([1200, 1500, 2000, 3000]),
      };
    },
    onParam(s, key) { if (key === 'split' || key === 'merge' || key === 'radius') keepInvariants(s, key); },
    sanitize(s) { keepInvariants(s, 'split'); },

    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d');
      const ghostCanvas = document.createElement('canvas');
      const gctx = ghostCanvas.getContext('2d');
      let raf = 0;
      let sim = null;
      let ghostDrawn = 0;        // number of snapshots already composited into ghostCanvas
      let rampKey = '', rampHex = null;

      // Deterministic grain tile (independent of state; alpha controls strength)
      const grainTile = (() => {
        const t = document.createElement('canvas'); t.width = t.height = 160;
        const g = t.getContext('2d'), img = g.createImageData(160, 160), d = img.data, r = U.makeRng('growth/grain');
        for (let i = 0; i < d.length; i += 4) { const v = 128 + r.gauss() * 34; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
        g.putImageData(img, 0, 0); return t;
      })();

      /* ---------------- init ---------------- */
      function buildRings(s) {
        const rng = sim.rng, H = sim.H, cx = W / 2, cy = H / 2, m = Math.min(W, H);
        const rings = [];
        const n = s.rings, base = s.size * m;
        const jitter = () => (rng() - 0.5) * 0.6;
        const ringAt = (fn, count, closed) => {
          const xs = [], ys = [];
          for (let k = 0; k < count; k++) { const p = fn(closed ? k / count : k / (count - 1)); xs.push(p[0] + jitter()); ys.push(p[1] + jitter()); }
          rings.push({ xs, ys, closed });
        };
        const nestedRadius = i => n === 1 ? base : base + (m * 0.42 - base) * i / (n - 1);
        if (s.shape === 'circle') {
          for (let i = 0; i < n; i++) { const r = nestedRadius(i); ringAt(t => [cx + Math.cos(t * TAU) * r, cy + Math.sin(t * TAU) * r], s.count, true); }
        } else if (s.shape === 'polygon') {
          const sides = rng.int(3, 7), rot = rng() * TAU;
          for (let i = 0; i < n; i++) {
            const r = nestedRadius(i) * (1 + 0.08 * i);
            ringAt(t => {
              const a = t * sides, k = Math.floor(a), f = a - k;
              const a0 = rot + k / sides * TAU, a1 = rot + (k + 1) / sides * TAU;
              return [cx + U.lerp(Math.cos(a0), Math.cos(a1), f) * r, cy + U.lerp(Math.sin(a0), Math.sin(a1), f) * r];
            }, s.count, true);
          }
        } else if (s.shape === 'blob') {
          const noise = sim.noise;
          for (let i = 0; i < n; i++) {
            const r = n === 1 ? base : base * (0.7 + 0.5 * rng());
            const ang = rng() * TAU, dist = n === 1 ? 0 : m * (0.14 + 0.18 * rng());
            const bx = cx + Math.cos(ang) * dist * (W / m), by = cy + Math.sin(ang) * dist * (H / m), ph = i * 7.3;
            ringAt(t => {
              const a = t * TAU;
              const rr = r * (1 + 0.35 * noise.fbm(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3 - ph, 3));
              return [bx + Math.cos(a) * rr, by + Math.sin(a) * rr];
            }, s.count, true);
          }
        } else if (s.shape === 'line') {
          const half = W * s.size * 1.1, noise = sim.noise;
          for (let i = 0; i < n; i++) {
            const y = n === 1 ? cy : cy + (i / (n - 1) - 0.5) * H * 0.6, ph = i * 3.1;
            ringAt(t => [cx + (t - 0.5) * 2 * half, y + noise.n2(t * 3 + ph, ph) * m * 0.03], s.count, false);
          }
        } else { // spiral
          const turns = 1 + n * 0.5, rot = rng() * TAU, r0 = m * 0.02, r1 = base * 1.2;
          ringAt(t => { const a = rot + t * turns * TAU, r = r0 + (r1 - r0) * t; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }, s.count, false);
        }
        return rings;
      }

      function initSim(s) {
        const rng = U.makeRng(s.seed);
        sim = {
          rng, noise: U.makeNoise(rng), H: Math.round(W * ASPECTS[s.aspect]),
          rings: null, iter: 0, total: 0, snaps: [], snapEvery: s.ghostEvery, done: false,
          gx: new Float64Array(2048), gy: new Float64Array(2048), nx: new Float64Array(2048), ny: new Float64Array(2048),
          cellIdx: new Int32Array(2048), items: new Int32Array(2048), cellStart: new Int32Array(1),
        };
        sim.rings = buildRings(s);
        sim.total = sim.rings.reduce((a, r) => a + r.xs.length, 0);
        ghostDrawn = 0;
        takeSnapshot();
      }

      function takeSnapshot() {
        sim.snaps.push(sim.rings.map(r => ({ xs: Float32Array.from(r.xs), ys: Float32Array.from(r.ys), closed: r.closed })));
        if (sim.snaps.length > MAX_SNAPS) {
          sim.snaps = sim.snaps.filter((_, i) => i % 2 === 0);
          sim.snapEvery *= 2;
          ghostDrawn = 0; // force a rebuild of the ghost layer
        }
      }

      /* ---------------- simulation step ---------------- */
      function step(s) {
        const rings = sim.rings, H = sim.H;
        let N = 0;
        for (const r of rings) N += r.xs.length;
        if (sim.gx.length < N) {
          const cap = Math.ceil(N * 1.5);
          sim.gx = new Float64Array(cap); sim.gy = new Float64Array(cap); sim.nx = new Float64Array(cap); sim.ny = new Float64Array(cap);
          sim.cellIdx = new Int32Array(cap); sim.items = new Int32Array(cap);
        }
        const gx = sim.gx, gy = sim.gy, nx = sim.nx, ny = sim.ny, cellIdx = sim.cellIdx, items = sim.items;
        // gather + bbox
        let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, off = 0;
        for (const r of rings) {
          const xs = r.xs, ys = r.ys, c = xs.length;
          r.start = off;
          for (let k = 0; k < c; k++) {
            const x = xs[k], y = ys[k];
            gx[off] = x; gy[off] = y; off++;
            if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
          }
        }
        // spatial hash (counting sort)
        const R = s.radius, R2 = R * R;
        const ext = Math.max(maxx - minx, maxy - miny, 1);
        const cell = Math.max(R, ext / 400);
        const gw = Math.floor((maxx - minx) / cell) + 1, gh = Math.floor((maxy - miny) / cell) + 1, ncell = gw * gh;
        if (sim.cellStart.length < ncell + 1) sim.cellStart = new Int32Array(Math.ceil((ncell + 1) * 1.5));
        const cellStart = sim.cellStart;
        cellStart.fill(0, 0, ncell + 1);
        for (let i = 0; i < N; i++) {
          const ci = Math.floor((gy[i] - miny) / cell) * gw + Math.floor((gx[i] - minx) / cell);
          cellIdx[i] = ci; cellStart[ci + 1]++;
        }
        for (let c = 0; c < ncell; c++) cellStart[c + 1] += cellStart[c];
        // fill using a moving cursor stored in items' tail region is not possible; use a temp copy
        const cursor = sim.cursor && sim.cursor.length >= ncell ? sim.cursor : (sim.cursor = new Int32Array(Math.ceil(ncell * 1.5)));
        cursor.set(cellStart.subarray(0, ncell));
        for (let i = 0; i < N; i++) items[cursor[cellIdx[i]]++] = i;

        // forces
        const rep = s.repulsion * 0.5, attr = s.attraction, align = s.alignment, nz = s.noise, ns = s.noiseScale;
        const noise = sim.noise, tdrift = sim.iter * 0.002;
        const maxStep = Math.max(0.6, s.merge * 0.6);
        const bMode = s.boundary, bStr = s.boundaryStrength, cx = W / 2, cy = H / 2;
        const bR = Math.min(W, H) / 2 - s.margin, mg = s.margin;
        for (const r of rings) {
          const c = r.xs.length, st = r.start, closed = r.closed;
          for (let k = 0; k < c; k++) {
            const i = st + k, px = gx[i], py = gy[i];
            let fx = 0, fy = 0;
            // repulsion from everything within R
            if (rep > 0) {
              const ccx = cellIdx[i] % gw, ccy = (cellIdx[i] - ccx) / gw;
              let rx = 0, ry = 0;
              for (let dy = -1; dy <= 1; dy++) {
                const yy = ccy + dy; if (yy < 0 || yy >= gh) continue;
                for (let dx = -1; dx <= 1; dx++) {
                  const xx = ccx + dx; if (xx < 0 || xx >= gw) continue;
                  const ci = yy * gw + xx;
                  for (let q = cellStart[ci], qe = cellStart[ci + 1]; q < qe; q++) {
                    const j = items[q]; if (j === i) continue;
                    const ddx = px - gx[j], ddy = py - gy[j], d2 = ddx * ddx + ddy * ddy;
                    if (d2 >= R2 || d2 < 1e-9) continue;
                    const d = Math.sqrt(d2), w = (1 - d / R) / d;
                    rx += ddx * w; ry += ddy * w;
                  }
                }
              }
              fx += rx * rep; fy += ry * rep;
            }
            // attraction to chain neighbors + alignment (perpendicular smoothing)
            const hasPrev = closed || k > 0, hasNext = closed || k < c - 1;
            if (hasPrev && hasNext) {
              const ip = st + (k + c - 1) % c, inx = st + (k + 1) % c;
              const ax = (gx[ip] + gx[inx]) / 2 - px, ay = (gy[ip] + gy[inx]) / 2 - py;
              fx += ax * attr; fy += ay * attr;
              if (align > 0) {
                let tx = gx[inx] - gx[ip], ty = gy[inx] - gy[ip];
                const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
                const dot = ax * tx + ay * ty;
                fx += (ax - dot * tx) * align; fy += (ay - dot * ty) * align;
              }
            } else if (hasPrev || hasNext) {
              const j = hasPrev ? st + k - 1 : st + k + 1;
              fx += (gx[j] - px) * attr * 0.5; fy += (gy[j] - py) * attr * 0.5;
            }
            // noise field
            if (nz > 0) {
              const a = noise.fbm(px * ns + tdrift, py * ns - tdrift, 2) * TAU * 1.5;
              fx += Math.cos(a) * nz; fy += Math.sin(a) * nz;
            }
            // boundary
            if (bMode === 'circle') {
              const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy);
              if (d > bR) { const k2 = (d - bR) * bStr / d; fx -= dx * k2; fy -= dy * k2; }
            } else if (bMode === 'frame') {
              if (px < mg) fx += (mg - px) * bStr; else if (px > W - mg) fx -= (px - W + mg) * bStr;
              if (py < mg) fy += (mg - py) * bStr; else if (py > H - mg) fy -= (py - H + mg) * bStr;
            } else if (bMode === 'center') {
              const dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy) || 1;
              fx += dx / d * bStr * 0.6; fy += dy / d * bStr * 0.6;
            }
            const fl = Math.hypot(fx, fy);
            if (fl > maxStep) { const k2 = maxStep / fl; fx *= k2; fy *= k2; }
            nx[i] = px + fx; ny[i] = py + fy;
          }
        }

        // growth / split / merge — rebuild each ring
        const rng = sim.rng, maxE = s.split, maxE2 = maxE * maxE, minE2 = s.merge * s.merge;
        const cap = s.maxNodes;
        const capFactor = U.clamp((cap - N) / (0.25 * cap), 0, 1);
        const growthEff = s.growth * capFactor;
        const hardCap = N < cap * 1.08;
        const bias = s.growthAt, ns2 = s.noiseScale * 0.5;
        let total = 0;
        for (const r of rings) {
          const c = r.xs.length, st = r.start, closed = r.closed;
          const oxs = r.xs, oys = r.ys;
          for (let k = 0; k < c; k++) { oxs[k] = nx[st + k]; oys[k] = ny[st + k]; }
          // choose edges to inject a node into
          let inject = null;
          if (growthEff > 0 && hardCap) {
            const want = growthEff * c, nInj = Math.floor(want) + (rng() < want - Math.floor(want) ? 1 : 0);
            if (nInj > 0) {
              inject = new Uint8Array(c);
              const edges = closed ? c : c - 1;
              for (let q = 0; q < nInj; q++) {
                let e = Math.floor(rng() * edges);
                if (bias === 'curved') {
                  for (let tries = 0; tries < 6; tries++) {
                    const ang = turnAngle(oxs, oys, e, c, closed);
                    if (rng() < Math.min(1, ang * 2.5 + 0.03)) break;
                    e = Math.floor(rng() * edges);
                  }
                } else if (bias === 'noise') {
                  for (let tries = 0; tries < 6; tries++) {
                    const v = noise.n2(oxs[e] * ns2 + 11.3, oys[e] * ns2 - 5.7);
                    if (rng() < U.smoothstep(-0.15, 0.45, v) + 0.02) break;
                    e = Math.floor(rng() * edges);
                  }
                }
                inject[e] = 1;
              }
            }
          }
          const xs = [], ys = [];
          const minKeep = closed ? 4 : 2;
          let skipNext = false;
          for (let k = 0; k < c; k++) {
            if (skipNext) { skipNext = false; continue; }
            const x = oxs[k], y = oys[k];
            xs.push(x); ys.push(y);
            const hasEdge = closed || k < c - 1;
            if (!hasEdge) break;
            const n = (k + 1) % c, dx = oxs[n] - x, dy = oys[n] - y, d2 = dx * dx + dy * dy;
            if ((d2 > maxE2 && hardCap) || (inject && inject[k])) {
              xs.push(x + dx * 0.5 + (rng() - 0.5) * 0.4); ys.push(y + dy * 0.5 + (rng() - 0.5) * 0.4);
            } else if (d2 < minE2 && c > minKeep && n !== 0 && !(closed && n === c - 1 && k === 0) && !(!closed && n === c - 1)) {
              skipNext = true;
            }
          }
          r.xs = xs; r.ys = ys;
          total += xs.length;
        }
        sim.total = total;
        sim.iter++;
        if (sim.iter % sim.snapEvery === 0) takeSnapshot();
      }

      /* ---------------- painting ---------------- */
      function ramp(s) {
        const key = s.palette.join(',');
        if (key !== rampKey) {
          const rp = U.makeRamp(s.palette);
          rampHex = [];
          for (let b = 0; b < NB; b++) { const c = rp(b / (NB - 1)); rampHex.push(U.rgbToHex(c[0], c[1], c[2])); }
          rampKey = key;
        }
        return rampHex;
      }

      function strokeRings(c2, rings, s, alpha, lw, scale, glow) {
        if (lw <= 0) return;
        c2.lineWidth = lw; c2.lineJoin = 'round'; c2.lineCap = 'round';
        const pal = s.palette;
        const doStroke = (path, color) => {
          c2.strokeStyle = color;
          if (glow) {
            c2.save(); c2.shadowBlur = lw * scale * 6; c2.shadowColor = color; c2.globalAlpha = alpha * 0.7; c2.lineWidth = lw * 1.6;
            c2.stroke(path); c2.restore();
          }
          c2.globalAlpha = alpha; c2.stroke(path);
        };
        if (s.colorMode === 'ring') {
          rings.forEach((r, i) => { const p = new Path2D(); ringPath(p, r.xs, r.ys, r.closed); doStroke(p, pal[i % pal.length]); });
        } else {
          const hex = ramp(s);
          const buckets = new Array(NB);
          for (let b = 0; b < NB; b++) buckets[b] = new Path2D();
          const curv = s.colorMode === 'curvature';
          for (const r of rings) {
            const xs = r.xs, ys = r.ys, c = xs.length;
            for (let k = 0; k < c; k++) {
              const t = curv ? Math.min(1, turnAngle(xs, ys, k, c, r.closed) / 1.1) : k / c;
              nodePiece(buckets[Math.min(NB - 1, Math.floor(t * NB))], xs, ys, k, c, r.closed);
            }
          }
          for (let b = 0; b < NB; b++) doStroke(buckets[b], hex[b]);
        }
        c2.globalAlpha = 1;
      }

      function fillRings(c2, rings, s) {
        if (s.fill === 'none') return;
        const pal = s.palette;
        c2.globalAlpha = s.fillAlpha;
        if (s.fill === 'evenodd') {
          const p = new Path2D();
          for (const r of rings) if (r.closed) ringPath(p, r.xs, r.ys, true);
          c2.fillStyle = pal[0]; c2.fill(p, 'evenodd');
        } else {
          rings.forEach((r, i) => { if (!r.closed) return; const p = new Path2D(); ringPath(p, r.xs, r.ys, true); c2.fillStyle = pal[i % pal.length]; c2.fill(p); });
        }
        c2.globalAlpha = 1;
      }

      function paintGhostSnaps(c2, snaps, s, scale) {
        for (const snap of snaps) strokeRings(c2, snap, s, s.ghostAlpha, Math.max(0.35, s.strokeWidth * 0.6), scale, false);
      }

      function syncGhostLayer(s) {
        if (ghostCanvas.width !== canvas.width || ghostCanvas.height !== canvas.height) {
          ghostCanvas.width = canvas.width; ghostCanvas.height = canvas.height; ghostDrawn = 0;
        }
        const scale = canvas.width / W;
        if (ghostDrawn === 0) gctx.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);
        if (ghostDrawn < sim.snaps.length) {
          gctx.setTransform(scale, 0, 0, scale, 0, 0);
          paintGhostSnaps(gctx, sim.snaps.slice(ghostDrawn), s, scale);
          gctx.setTransform(1, 0, 0, 1, 0, 0);
          ghostDrawn = sim.snaps.length;
        }
      }

      function paintGrain(c2, w, h, amount) {
        if (amount <= 0) return;
        c2.save();
        c2.setTransform(1, 0, 0, 1, 0, 0);
        c2.globalCompositeOperation = 'overlay';
        c2.globalAlpha = amount * 0.7;
        c2.fillStyle = c2.createPattern(grainTile, 'repeat');
        c2.fillRect(0, 0, w, h);
        c2.restore();
      }

      // Full render onto any 2D context of pixel size w x h; when `ghostLayer` is given it is composited instead of re-stroking snapshots.
      function render(c2, w, h, s, ghostLayer) {
        const scale = w / W;
        c2.setTransform(1, 0, 0, 1, 0, 0);
        c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over';
        c2.fillStyle = s.bg; c2.fillRect(0, 0, w, h);
        c2.setTransform(scale, 0, 0, scale, 0, 0);
        if (s.ghost) {
          if (ghostLayer) { c2.setTransform(1, 0, 0, 1, 0, 0); c2.drawImage(ghostLayer, 0, 0, w, h); c2.setTransform(scale, 0, 0, scale, 0, 0); }
          else paintGhostSnaps(c2, sim.snaps, s, scale);
        }
        fillRings(c2, sim.rings, s);
        strokeRings(c2, sim.rings, s, s.opacity, s.strokeWidth, scale, s.glow);
        paintGrain(c2, w, h, s.grain);
        c2.setTransform(1, 0, 0, 1, 0, 0);
      }

      function draw() {
        const s = host.getState();
        if (s.ghost) syncGhostLayer(s);
        render(ctx, canvas.width, canvas.height, s, s.ghost ? ghostCanvas : null);
        host.setStatus('<span><b>' + sim.total.toLocaleString() + '</b> nodes</span><span>iteration ' + sim.iter + (sim.done ? ' · settled' : '') + '</span>');
      }

      /* ---------------- loop ---------------- */
      function stopLimit(s) { return s.stopAfter >= 5000 ? Infinity : s.stopAfter; }

      function frame() {
        raf = 0;
        const s = host.getState();
        const limit = stopLimit(s);
        const t0 = performance.now();
        let n = 0;
        while (n < s.iters && sim.iter < limit) {
          step(s); n++;
          if (performance.now() - t0 > FRAME_BUDGET_MS) break;
        }
        sim.done = sim.iter >= limit;
        draw();
        if (!sim.done && host.isActive()) raf = requestAnimationFrame(frame);
      }
      function start() {
        cancelAnimationFrame(raf); raf = 0;
        if (!sim.done && !host.reducedMotion()) raf = requestAnimationFrame(frame);
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          cancelAnimationFrame(raf); raf = 0;
          const s = host.getState();
          initSim(s);
          if (host.reducedMotion()) {
            // bounded synchronous run to a settled frame
            const limit = Math.min(stopLimit(s), 900), t0 = performance.now();
            while (sim.iter < limit && performance.now() - t0 < 2500) step(s);
            sim.done = true;
          }
          draw();
          start();
        },
        repaint() { ghostDrawn = 0; draw(); },
        live(key) {
          if (key === 'stopAfter' || key === 'iters') { const s = host.getState(); if (sim.iter < stopLimit(s)) { sim.done = false; if (!raf) start(); } }
        },
        resize() { ghostDrawn = 0; draw(); },
        pause() { cancelAnimationFrame(raf); raf = 0; },
        resume() { if (!raf) start(); },
        action(key) { if (key === 'reset') this.regenerate(); },
        async exportPNG(w, h) {
          const s = host.getState();
          const out = document.createElement('canvas');
          out.width = w; out.height = h;
          render(out.getContext('2d'), w, h, s, null);
          return U.toBlob(out);
        },
        exportSVG(w, h) {
          const s = host.getState();
          if (!sim || !sim.rings) return null;
          const Wout = w || 1000, Hout = h || Math.round(Wout * (ASPECTS[s.aspect] || 1));
          const sx = Wout / W, sy = Hout / H;
          const pal = s.palette || ['#111'];
          const lw = (s.strokeWidth || 1) * Math.min(sx, sy);
          let body = '';
          if (s.fill && s.fill !== 'none') {
            for (let i = 0; i < sim.rings.length; i++) {
              const r = sim.rings[i]; if (!r.closed) continue;
              let d = '';
              for (let k = 0; k < r.xs.length; k++) d += (k ? 'L' : 'M') + (r.xs[k] * sx).toFixed(2) + ' ' + (r.ys[k] * sy).toFixed(2);
              d += 'Z';
              body += '<path d="' + d + '" fill="' + U.svgEsc(pal[i % pal.length]) + '" fill-opacity="' + (s.fillAlpha || 0.4) + '" stroke="none"/>\n';
            }
          }
          for (let i = 0; i < sim.rings.length; i++) {
            const r = sim.rings[i];
            let d = '';
            for (let k = 0; k < r.xs.length; k++) d += (k ? 'L' : 'M') + (r.xs[k] * sx).toFixed(2) + ' ' + (r.ys[k] * sy).toFixed(2);
            if (r.closed) d += 'Z';
            body += '<path d="' + d + '" fill="none" stroke="' + U.svgEsc(pal[i % pal.length]) + '" stroke-width="' + lw.toFixed(2) + '" stroke-linejoin="round" stroke-linecap="round"/>\n';
          }
          return U.svgBlob(Wout, Hout, s.bg, body);
        },
      };
    },
  });
})();

