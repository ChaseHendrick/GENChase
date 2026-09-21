
/* modules/physarum.js */
/* GENChase — Physarum: slime mold agents building a transport network (Jones 2010). */
(function () {
  'use strict';
  const U = Studio.util;
  const TAU = U.TAU;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const FRAME_BUDGET_MS = 24;      // stop adding sub-steps once a frame has used this much time
  const AGENT_BUDGET = 170000;     // agent updates per frame before sub-steps are reduced
  const WARM_STEPS = 300;          // reduced-motion: steps run in chunks before the still frame
  const TONE_N = 4096;             // tone-map LUT entries
  const TONE_UMAX = 6;             // trail / reference value that maps to the last LUT entry
  const TONE_K = 0.85;             // exposure 1 puts the measured reference level in the upper mid-tones

  const deg = v => v + '°';
  const pct = v => v + '%';
  const f1 = v => v.toFixed(1);
  const f2 = v => v.toFixed(2);

  const schema = [
    // ---- Colony
    { group: 'Colony', key: 'agents', label: 'Agents', type: 'range', kind: 'geom', min: 1000, max: 200000, step: 1000, fmt: v => v.toLocaleString() },
    { group: 'Colony', key: 'res', label: 'Grid resolution', type: 'seg', kind: 'geom', options: [['384', '384'], ['512', '512'], ['768', '768'], ['1024', '1024'], ['1536', '1536'], ['2048', '2048']] },
    { group: 'Colony', key: 'spawn', label: 'Spawn', type: 'seg', kind: 'geom', wrap: true,
      options: [['random', 'Random'], ['disk', 'Center disk'], ['ring', 'Ring'], ['edge', 'Edge band'], ['noise', 'Noise patches']] },
    { group: 'Colony', key: 'boundary', label: 'Boundary', type: 'seg', kind: 'live', options: [['wrap', 'Wrap (torus)'], ['bounce', 'Bounce']] },
    { group: 'Colony', key: 'crowd', label: 'One agent per cell', type: 'toggle', kind: 'live',
      hint: 'Jones\u2019 occupancy rule: an agent whose next cell is taken stays put and picks a new random heading. Dense colonies then push outward instead of collapsing.' },
    { group: 'Colony', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    // ---- Behavior
    { group: 'Behavior', key: 'sensorAngle', label: 'Sensor angle', type: 'range', kind: 'live', min: 5, max: 90, step: 1, fmt: deg },
    { group: 'Behavior', key: 'sensorDist', label: 'Sensor distance', type: 'range', kind: 'live', min: 1, max: 30, step: 0.5, fmt: v => f1(v) + ' cells' },
    { group: 'Behavior', key: 'rotAngle', label: 'Rotation angle', type: 'range', kind: 'live', min: 5, max: 90, step: 1, fmt: deg },
    { group: 'Behavior', key: 'stepSize', label: 'Step size', type: 'range', kind: 'live', min: 0.3, max: 3, step: 0.1, fmt: f1 },
    { group: 'Behavior', key: 'deposit', label: 'Deposit', type: 'range', kind: 'live', min: 0.5, max: 15, step: 0.5, fmt: f1 },
    { group: 'Behavior', key: 'decay', label: 'Decay', type: 'range', kind: 'live', min: 0.5, max: 15, step: 0.5, fmt: v => f1(v) + '%' },
    { group: 'Behavior', key: 'diffusion', label: 'Diffusion', type: 'range', kind: 'live', min: 0, max: 1, step: 0.05, fmt: f2 },
    { group: 'Behavior', key: 'speed', label: 'Speed', type: 'range', kind: 'live', min: 1, max: 8, step: 1, fmt: v => v + ' sub-steps',
      hint: 'Sub-steps per frame. With many agents the module lowers this automatically to keep the frame rate up.' },
    { group: 'Behavior', key: 'stopAfter', label: 'Run for', type: 'range', kind: 'live', min: 200, max: 6000, step: 100, fmt: v => v >= 6000 ? '∞' : v + ' steps' },
    { group: 'Behavior', key: 'reset', label: 'Restart from seed', type: 'action' },
    // ---- Food
    { group: 'Food', key: 'food', label: 'Food spots', type: 'range', kind: 'geom', min: 0, max: 40, step: 1 },
    { group: 'Food', key: 'foodStrength', label: 'Food strength', type: 'range', kind: 'live', min: 0.5, max: 10, step: 0.5, fmt: f1, dimUnless: s => s.food > 0 },
    // ---- Color
    { group: 'Color', key: 'exposure', label: 'Exposure', type: 'range', kind: 'paint', min: 0.3, max: 3, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'gamma', label: 'Gamma', type: 'range', kind: 'paint', min: 0.3, max: 3, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'contrast', label: 'Contrast', type: 'range', kind: 'paint', min: 0, max: 1, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'invert', label: 'Invert', type: 'toggle', kind: 'paint' },
    { group: 'Color', key: 'glow', label: 'Glow', type: 'toggle', kind: 'paint' },
    { group: 'Color', key: 'dots', label: 'Show agents', type: 'toggle', kind: 'paint' },
    // ---- Effects
    { group: 'Effects', key: 'grain', label: 'Grain', type: 'range', kind: 'paint', min: 0, max: 1, step: 0.05, fmt: f2 },
    { group: 'Effects', key: 'nearest', label: 'Pixelated', type: 'toggle', kind: 'paint' },
  ];

  const defaults = {
    agents: 45000, res: '768', spawn: 'random', boundary: 'wrap', crowd: true, aspect: '1:1',
    sensorAngle: 30, sensorDist: 12, rotAngle: 35, stepSize: 1, deposit: 5, decay: 9, diffusion: 0.45, speed: 3, stopAfter: 6000,
    food: 0, foodStrength: 3,
    exposure: 0.9, gamma: 1.2, contrast: 0.25, invert: false, glow: true, dots: false,
    grain: 0.15, nearest: false,
  };

  const P = Studio.PALETTES;
  const presets = {
    veins: { label: 'Veins', palette: P.bioluminescent,
      p: { agents: 45000, res: '768', spawn: 'random', boundary: 'wrap', aspect: '1:1', sensorAngle: 30, sensorDist: 12, rotAngle: 35, stepSize: 1, deposit: 5, decay: 9, diffusion: 0.45, speed: 3, stopAfter: 6000, food: 0, exposure: 0.9, gamma: 1.2, contrast: 0.25, invert: false, glow: true, dots: false, grain: 0.15, nearest: false } },
    coral: { label: 'Coral', palette: P.ember,
      p: { agents: 50000, res: '512', spawn: 'disk', boundary: 'bounce', aspect: '1:1', sensorAngle: 45, sensorDist: 5, rotAngle: 40, stepSize: 1, deposit: 5, decay: 5, diffusion: 0.7, speed: 3, stopAfter: 6000, food: 0, exposure: 1.1, gamma: 1.1, contrast: 0.3, invert: false, glow: true, dots: false, grain: 0.2, nearest: false } },
    web: { label: 'Web', palette: P.xray,
      p: { agents: 30000, res: '512', spawn: 'random', boundary: 'wrap', aspect: '4:5', sensorAngle: 30, sensorDist: 20, rotAngle: 15, stepSize: 1.2, deposit: 5, decay: 8, diffusion: 0.5, speed: 3, stopAfter: 6000, food: 0, exposure: 1.3, gamma: 0.9, contrast: 0.2, invert: false, glow: false, dots: false, grain: 0.1, nearest: false } },
    nebula: { label: 'Nebula', palette: P.thermal,
      p: { agents: 140000, res: '512', spawn: 'noise', boundary: 'wrap', aspect: '5:4', sensorAngle: 60, sensorDist: 3, rotAngle: 60, stepSize: 1.5, deposit: 3, decay: 3, diffusion: 1, speed: 3, stopAfter: 6000, food: 0, exposure: 0.8, gamma: 1.2, contrast: 0.15, invert: false, glow: true, dots: false, grain: 0.25, nearest: false } },
    roots: { label: 'Roots', palette: P.petri,
      p: { agents: 40000, res: '512', spawn: 'edge', boundary: 'bounce', aspect: '4:5', sensorAngle: 22, sensorDist: 12, rotAngle: 45, stepSize: 1, deposit: 5, decay: 6, diffusion: 0.8, speed: 3, stopAfter: 6000, food: 0, exposure: 1.2, gamma: 1, contrast: 0.3, invert: false, glow: false, dots: false, grain: 0.25, nearest: false } },
    mycelium: { label: 'Mycelium', palette: P.verdigris,
      p: { agents: 60000, res: '512', spawn: 'random', boundary: 'bounce', aspect: '1:1', sensorAngle: 30, sensorDist: 12, rotAngle: 35, stepSize: 1, deposit: 5, decay: 9, diffusion: 0.45, speed: 3, stopAfter: 6000, food: 18, foodStrength: 4, exposure: 1, gamma: 1, contrast: 0.3, invert: false, glow: false, dots: false, grain: 0.2, nearest: false } },
    storm: { label: 'Storm', palette: P.glacier,
      p: { agents: 80000, res: '512', spawn: 'random', boundary: 'wrap', aspect: '16:9', sensorAngle: 15, sensorDist: 28, rotAngle: 30, stepSize: 2, deposit: 4, decay: 1, diffusion: 1, speed: 3, stopAfter: 6000, food: 0, exposure: 0.6, gamma: 1.3, contrast: 0.2, invert: false, glow: true, dots: false, grain: 0.15, nearest: false } },
    filigree: { label: 'Filigree', palette: P.risograph,
      p: { agents: 100000, res: '768', spawn: 'ring', boundary: 'bounce', aspect: '1:1', sensorAngle: 80, sensorDist: 6, rotAngle: 12, stepSize: 0.8, deposit: 3, decay: 12, diffusion: 0.4, speed: 3, stopAfter: 6000, food: 0, exposure: 1.4, gamma: 0.9, contrast: 0.35, invert: false, glow: false, dots: false, grain: 0.1, nearest: false } },
  };

  Studio.register({
    id: 'physarum', name: 'Physarum', subtitle: 'slime mold agents building a transport network · 2010', equation: 'sense(L,F,R) -> turn ±RA -> step SS -> deposit D;   trail <- blur(trail)·(1-decay)', credit: "Agent model: Jeff Jones, 2010, 'Characteristics of pattern formation and evolution in approximations of Physarum transport networks'. The biology follows Toshiyuki Nakagaki's maze-solving slime mold experiments, Nature 2000.", order: 20,
    blurb: 'Physarum polycephalum, the many-headed slime mold, is a single giant cell that finds shortest paths through mazes and once rebuilt the Tokyo rail map out of oat flakes. Jeff Jones (2010) showed that a swarm of simple agents reproduces its networks: each one smells the trail ahead through three sensors, turns toward the strongest scent, steps forward and leaves a little more trail behind. The trail diffuses and fades, so only paths that many agents keep using survive — faint tracks merge into veins, veins compete, and a transport network emerges with nobody in charge.',
    schema, defaults, presets,
    hints: {
      Behavior: 'Sensor angle and distance set how far ahead an agent smells; rotation angle is how sharply it turns. Small rotation with a long sensor makes sweeping filaments, wide sensors with quick turns make tight cellular veins. Decay is how fast old trail fades, diffusion how far it spreads.',
      Food: 'Food spots deposit trail constantly, so agents discover them and build paths between them — the classic shortest-network experiment.',
      Color: 'Exposure scales the trail before the palette ramp (background at zero). Glow adds a blurred copy of the veins.',
    },
    closedGroups: ['Food', 'Effects'],
    palette: true, defaultPalette: 'bioluminescent', paletteLabel: 'Colors (faint → dense trail)',
    headline: 'agents', headlineLabel: 'agents',

    surprise(rng) {
      const regime = rng.pick(['veins', 'veins', 'filament', 'cloud', 'lace']);
      const p = {
        agents: rng.pick([30000, 40000, 60000, 60000, 80000, 120000]),
        res: rng.pick(['384', '512', '512', '768']),
        spawn: rng.pick(['random', 'random', 'disk', 'ring', 'edge', 'noise']),
        boundary: rng.pick(['wrap', 'wrap', 'bounce']),
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4', '16:9']),
        stepSize: rng.range(0.8, 1.6), deposit: rng.pick([3, 4, 5, 6]), diffusion: rng.range(0.4, 1), speed: 3, stopAfter: 6000,
        food: rng() < 0.3 ? rng.int(4, 24) : 0, foodStrength: rng.range(2, 6),
        exposure: rng.range(0.8, 1.4), gamma: rng.range(0.85, 1.25), contrast: rng.range(0.1, 0.4),
        invert: rng() < 0.12, glow: rng() < 0.5, dots: false, grain: rng.pick([0, 0.1, 0.2, 0.3]), nearest: rng() < 0.1,
      };
      if (regime === 'veins') Object.assign(p, { sensorAngle: rng.int(18, 35), sensorDist: rng.range(6, 12), rotAngle: rng.int(35, 55), decay: rng.range(5, 12) });
      else if (regime === 'filament') Object.assign(p, { sensorAngle: rng.int(12, 30), sensorDist: rng.range(16, 30), rotAngle: rng.int(10, 30), decay: rng.range(1, 6) });
      else if (regime === 'cloud') Object.assign(p, { sensorAngle: rng.int(45, 75), sensorDist: rng.range(2, 5), rotAngle: rng.int(45, 75), decay: rng.range(2, 5), agents: rng.pick([100000, 140000, 180000]) });
      else Object.assign(p, { sensorAngle: rng.int(60, 90), sensorDist: rng.range(4, 8), rotAngle: rng.int(8, 20), decay: rng.range(8, 15), res: '768', agents: rng.pick([80000, 100000, 140000]) });
      return p;
    },

    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d');
      const supportsFilter = typeof ctx.filter === 'string';
      const gridCanvas = document.createElement('canvas');
      const gctx = gridCanvas.getContext('2d');
      const glowCanvas = document.createElement('canvas');
      const glctx = glowCanvas.getContext('2d');
      let raf = 0, timer = 0;
      let sim = null;
      let img = null, glowImg = null;             // ImageData at grid size
      let toneKey = '', toneLUT = null, glowA = null, toneScale = 1;

      // Deterministic grain tile (independent of state; alpha controls strength)
      const grainTile = (() => {
        const t = document.createElement('canvas'); t.width = t.height = 160;
        const g = t.getContext('2d'), im = g.createImageData(160, 160), d = im.data, r = U.makeRng('physarum/grain');
        for (let i = 0; i < d.length; i += 4) { const v = 128 + r.gauss() * 34; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
        g.putImageData(im, 0, 0); return t;
      })();

      /* ---------------- init ---------------- */
      function spawnAgents(s) {
        const rng = sim.rng, W = sim.W, H = sim.H, N = sim.N, x = sim.x, y = sim.y, dx = sim.dx, dy = sim.dy;
        const cx = W / 2, cy = H / 2, m = Math.min(W, H);
        const noise = s.spawn === 'noise' ? U.makeNoise(rng) : null;
        for (let i = 0; i < N; i++) {
          let px, py;
          if (s.spawn === 'disk') {
            const r = m * 0.24 * Math.sqrt(rng()), a = rng() * TAU;
            px = cx + Math.cos(a) * r; py = cy + Math.sin(a) * r;
          } else if (s.spawn === 'ring') {
            const r = m * (0.34 + rng.gauss() * 0.012), a = rng() * TAU;
            px = cx + Math.cos(a) * r; py = cy + Math.sin(a) * r;
          } else if (s.spawn === 'edge') {
            const band = m * 0.05, side = rng.int(0, 3), t = rng() * band;
            if (side === 0) { px = rng() * W; py = t; } else if (side === 1) { px = rng() * W; py = H - 1 - t; }
            else if (side === 2) { px = t; py = rng() * H; } else { px = W - 1 - t; py = rng() * H; }
          } else if (noise) {
            let tries = 0;
            do { px = rng() * W; py = rng() * H; tries++; }
            while (tries < 12 && rng() > U.smoothstep(-0.1, 0.5, noise.fbm(px / m * 3.2, py / m * 3.2, 3)));
          } else { px = rng() * W; py = rng() * H; }
          x[i] = U.clamp(px, 0, W - 1e-3); y[i] = U.clamp(py, 0, H - 1e-3);
          const a = rng() * TAU; dx[i] = Math.cos(a); dy[i] = Math.sin(a);
        }
      }

      function placeFood(s) {
        const rng = sim.rng, W = sim.W, H = sim.H, m = Math.min(W, H);
        const n = s.food, rad = Math.max(2.5, m * 0.011), margin = m * 0.08;
        const px = [], py = [], minD2 = (m * 0.09) * (m * 0.09);
        for (let i = 0; i < n; i++) {
          let bx = 0, by = 0, best = -1;
          for (let t = 0; t < 30; t++) {          // best-candidate sampling keeps spots spread out
            const cx = margin + rng() * (W - 2 * margin), cy = margin + rng() * (H - 2 * margin);
            let d2 = Infinity;
            for (let k = 0; k < px.length; k++) { const ddx = px[k] - cx, ddy = py[k] - cy; d2 = Math.min(d2, ddx * ddx + ddy * ddy); }
            if (d2 > best) { best = d2; bx = cx; by = cy; }
            if (d2 > minD2) break;
          }
          px.push(bx); py.push(by);
        }
        const idx = [], wgt = [], r2 = rad * rad;
        for (let k = 0; k < n; k++) {
          const x0 = Math.max(0, Math.floor(px[k] - rad)), x1 = Math.min(W - 1, Math.ceil(px[k] + rad));
          const y0 = Math.max(0, Math.floor(py[k] - rad)), y1 = Math.min(H - 1, Math.ceil(py[k] + rad));
          for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
            const ddx = xx + 0.5 - px[k], ddy = yy + 0.5 - py[k], d2 = ddx * ddx + ddy * ddy;
            if (d2 < r2) { idx.push(yy * W + xx); wgt.push(Math.exp(-d2 / r2 * 2.5)); }
          }
        }
        sim.foodIdx = Int32Array.from(idx); sim.foodW = Float32Array.from(wgt);
      }

      function initSim(s) {
        const W = Number(s.res), H = Math.max(16, Math.round(W * ASPECTS[s.aspect])), N = s.agents;
        sim = {
          rng: U.makeRng(s.seed), W, H, N, step: 0, done: false,
          trail: new Float32Array(W * H), tmp: new Float32Array(W * H), occ: new Uint16Array(W * H),
          x: new Float32Array(N), y: new Float32Array(N), dx: new Float32Array(N), dy: new Float32Array(N),
          foodIdx: null, foodW: null,
        };
        spawnAgents(s);
        for (let i = 0; i < N; i++) sim.occ[(sim.y[i] | 0) * W + (sim.x[i] | 0)]++;
        placeFood(s);
        if (gridCanvas.width !== W || gridCanvas.height !== H) {
          gridCanvas.width = glowCanvas.width = W; gridCanvas.height = glowCanvas.height = H;
          img = gctx.createImageData(W, H); glowImg = glctx.createImageData(W, H);
          const d = img.data; for (let i = 3; i < d.length; i += 4) d[i] = 255;
        }
      }

      /* ---------------- simulation step ---------------- */
      function step(s) {
        const W = sim.W, H = sim.H, N = sim.N, trail = sim.trail, tmp = sim.tmp;
        const x = sim.x, y = sim.y, dx = sim.dx, dy = sim.dy, rng = sim.rng, occ = sim.occ;
        const wrap = s.boundary === 'wrap', crowd = !!s.crowd;
        const SO = s.sensorDist, SS = s.stepSize, D = s.deposit;
        const sa = s.sensorAngle * TAU / 360, ra = s.rotAngle * TAU / 360;
        const cs = Math.cos(sa), sn = Math.sin(sa), cr = Math.cos(ra), sr = Math.sin(ra);
        const Wm = W - 1e-3, Hm = H - 1e-3;

        // food deposits (constant sources)
        if (sim.foodIdx) {
          const fi = sim.foodIdx, fw = sim.foodW, amt = s.foodStrength * D;
          for (let k = 0; k < fi.length; k++) trail[fi[k]] += amt * fw[k];
        }

        // agents: sense, turn, move, deposit
        for (let i = 0; i < N; i++) {
          const px = x[i], py = y[i];
          let ddx = dx[i], ddy = dy[i];
          // sensor directions: rotate heading by ±SA
          const lx = ddx * cs - ddy * sn, ly = ddy * cs + ddx * sn;
          const rx = ddx * cs + ddy * sn, ry = ddy * cs - ddx * sn;
          let fx = Math.floor(px + ddx * SO), fy = Math.floor(py + ddy * SO);
          let lxi = Math.floor(px + lx * SO), lyi = Math.floor(py + ly * SO);
          let rxi = Math.floor(px + rx * SO), ryi = Math.floor(py + ry * SO);
          if (wrap) {
            if (fx < 0) fx += W; else if (fx >= W) fx -= W;
            if (fy < 0) fy += H; else if (fy >= H) fy -= H;
            if (lxi < 0) lxi += W; else if (lxi >= W) lxi -= W;
            if (lyi < 0) lyi += H; else if (lyi >= H) lyi -= H;
            if (rxi < 0) rxi += W; else if (rxi >= W) rxi -= W;
            if (ryi < 0) ryi += H; else if (ryi >= H) ryi -= H;
          } else {
            if (fx < 0) fx = 0; else if (fx >= W) fx = W - 1;
            if (fy < 0) fy = 0; else if (fy >= H) fy = H - 1;
            if (lxi < 0) lxi = 0; else if (lxi >= W) lxi = W - 1;
            if (lyi < 0) lyi = 0; else if (lyi >= H) lyi = H - 1;
            if (rxi < 0) rxi = 0; else if (rxi >= W) rxi = W - 1;
            if (ryi < 0) ryi = 0; else if (ryi >= H) ryi = H - 1;
          }
          const F = trail[fy * W + fx], L = trail[lyi * W + lxi], R = trail[ryi * W + rxi];
          // Jones' rule: keep going if front is strongest; turn toward the stronger side; random when both sides beat front
          let turn = 0;
          if (F > L && F > R) turn = 0;
          else if (F < L && F < R) turn = rng() < 0.5 ? 1 : -1;
          else if (L > R) turn = 1;
          else if (R > L) turn = -1;
          if (turn !== 0) {
            const s2 = turn * sr;
            const tx = ddx * cr - ddy * s2, ty = ddy * cr + ddx * s2;
            const inv = 1 / Math.sqrt(tx * tx + ty * ty);
            ddx = tx * inv; ddy = ty * inv;
          }
          let nx = px + ddx * SS, ny = py + ddy * SS;
          if (wrap) {
            if (nx < 0) nx += W; else if (nx >= W) nx -= W;
            if (ny < 0) ny += H; else if (ny >= H) ny -= H;
          } else {
            if (nx < 0) { nx = -nx; ddx = -ddx; } else if (nx >= W) { nx = 2 * Wm - nx; ddx = -ddx; }
            if (ny < 0) { ny = -ny; ddy = -ddy; } else if (ny >= H) { ny = 2 * Hm - ny; ddy = -ddy; }
            if (nx >= W) nx = Wm; if (ny >= H) ny = Hm;
          }
          const from = (py | 0) * W + (px | 0), to = (ny | 0) * W + (nx | 0);
          if (crowd && to !== from && occ[to] > 0) {
            // occupancy rule: stay, pick a random new heading, no deposit
            const a = rng() * TAU; dx[i] = Math.cos(a); dy[i] = Math.sin(a);
            continue;
          }
          occ[from]--; occ[to]++;
          x[i] = nx; y[i] = ny; dx[i] = ddx; dy[i] = ddy;
          trail[to] += D;
        }

        // diffuse (separable 3x3 mean, blended by `diffusion`) and decay
        const keep = 1 - s.decay / 100, dif = s.diffusion, base = 1 - dif;
        const third = 1 / 3;
        for (let yy = 0; yy < H; yy++) {
          const o = yy * W;
          const l0 = wrap ? trail[o + W - 1] : trail[o], r1 = wrap ? trail[o] : trail[o + W - 1];
          tmp[o] = (l0 + trail[o] + trail[o + 1]) * third;
          for (let xx = 1; xx < W - 1; xx++) tmp[o + xx] = (trail[o + xx - 1] + trail[o + xx] + trail[o + xx + 1]) * third;
          tmp[o + W - 1] = (trail[o + W - 2] + trail[o + W - 1] + r1) * third;
        }
        for (let yy = 0; yy < H; yy++) {
          const o = yy * W;
          const up = yy > 0 ? o - W : (wrap ? (H - 1) * W : o);
          const dn = yy < H - 1 ? o + W : (wrap ? 0 : o);
          for (let xx = 0; xx < W; xx++) {
            const i = o + xx;
            const b = (tmp[up + xx] + tmp[i] + tmp[dn + xx]) * third;
            trail[i] = (trail[i] * base + b * dif) * keep;
          }
        }
        sim.step++;
      }

      /* ---------------- painting ---------------- */
      // The trail's absolute scale swings by orders of magnitude with agents, deposit,
      // decay and diffusion, so the reference level is measured from the map itself:
      // the 99.5th percentile of occupied cells. Rises immediately, falls slowly, so the
      // image neither clips nor flickers as the colony grows.
      let refLevel = 0;
      const SAMPLES = [];
      function measureRef(trail) {
        const n = trail.length;
        const stride = Math.max(1, Math.floor(n / 24000));
        SAMPLES.length = 0;
        for (let i = 0; i < n; i += stride) { const v = trail[i]; if (v > 1e-7) SAMPLES.push(v); }
        if (!SAMPLES.length) return refLevel || 1;
        SAMPLES.sort((a, b) => a - b);
        const p = SAMPLES[Math.min(SAMPLES.length - 1, Math.floor(SAMPLES.length * 0.995))];
        refLevel = refLevel > 0 ? Math.max(p, refLevel * 0.94) : p;
        return Math.max(refLevel, 1e-6);
      }

      function buildTone(s, ref) {
        const key = [s.palette.join(','), s.bg, s.exposure, s.gamma, s.contrast, s.invert, ref.toPrecision(3)].join('|');
        if (key === toneKey) return;
        toneKey = key;
        const ramp = U.makeRampLUT(s.palette, s.bg, 256);
        toneScale = TONE_N / (ref * TONE_UMAX);
        toneLUT = new Uint8ClampedArray(TONE_N * 3); glowA = new Uint8ClampedArray(TONE_N);
        const k = TONE_K * s.exposure, g = s.gamma, c = s.contrast;
        for (let i = 0; i < TONE_N; i++) {
          const u = (i + 0.5) / TONE_N * TONE_UMAX;
          let t = Math.pow(1 - Math.exp(-u * k), g);
          const sc = t * t * (3 - 2 * t);
          t += (sc - t) * c;
          glowA[i] = U.clamp((t - 0.12) / 0.88, 0, 1) * 255;
          if (s.invert) t = 1 - t;
          const ci = Math.round(t * 255) * 3;
          toneLUT[i * 3] = ramp[ci]; toneLUT[i * 3 + 1] = ramp[ci + 1]; toneLUT[i * 3 + 2] = ramp[ci + 2];
        }
      }

      // Trail map -> grid-size canvases (opaque main image, alpha glow layer).
      function paintGrid(s) {
        buildTone(s, measureRef(sim.trail));
        const trail = sim.trail, n = trail.length, d = img.data, lut = toneLUT, sc = toneScale, top = TONE_N - 1;
        for (let i = 0, j = 0; i < n; i++, j += 4) {
          let k = (trail[i] * sc) | 0; if (k > top) k = top;
          k *= 3;
          d[j] = lut[k]; d[j + 1] = lut[k + 1]; d[j + 2] = lut[k + 2];
        }
        if (s.dots) {
          const ink = U.hexToRgb(s.invert ? U.inkFor(s.palette[s.palette.length - 1]) : U.inkFor(s.bg));
          const x = sim.x, y = sim.y, W = sim.W;
          for (let i = 0; i < sim.N; i++) {
            const j = ((y[i] | 0) * W + (x[i] | 0)) * 4;
            d[j] = ink[0]; d[j + 1] = ink[1]; d[j + 2] = ink[2];
          }
        }
        gctx.putImageData(img, 0, 0);
        if (s.glow && supportsFilter) {
          const gd = glowImg.data, ga = glowA;
          for (let i = 0, j = 0; i < n; i++, j += 4) {
            let k = (trail[i] * sc) | 0; if (k > top) k = top;
            const k3 = k * 3;
            gd[j] = lut[k3]; gd[j + 1] = lut[k3 + 1]; gd[j + 2] = lut[k3 + 2]; gd[j + 3] = ga[k];
          }
          glctx.putImageData(glowImg, 0, 0);
        }
      }

      function paintGrain(c2, w, h, amount) {
        if (amount <= 0) return;
        c2.save();
        c2.globalCompositeOperation = 'overlay';
        c2.globalAlpha = amount * 0.7;
        c2.fillStyle = c2.createPattern(grainTile, 'repeat');
        c2.fillRect(0, 0, w, h);
        c2.restore();
      }

      // Composite the painted grid onto any 2D context of pixel size w x h.
      function render(c2, w, h, s) {
        c2.setTransform(1, 0, 0, 1, 0, 0);
        c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over';
        c2.fillStyle = s.bg; c2.fillRect(0, 0, w, h);
        c2.imageSmoothingEnabled = !s.nearest; c2.imageSmoothingQuality = 'high';
        c2.drawImage(gridCanvas, 0, 0, w, h);
        if (s.glow && supportsFilter) {
          const light = U.isLight(s.bg);
          c2.save();
          c2.globalCompositeOperation = light ? 'multiply' : 'lighter';
          c2.globalAlpha = light ? 0.55 : 0.6;
          c2.filter = 'blur(' + (w / sim.W * 2.5).toFixed(1) + 'px)';
          c2.imageSmoothingEnabled = true;
          c2.drawImage(glowCanvas, 0, 0, w, h);
          c2.restore();
        }
        paintGrain(c2, w, h, s.grain);
      }

      function status() {
        const limit = stopLimit(host.getState());
        host.setStatus('<span><b>' + sim.N.toLocaleString() + '</b> agents</span><span>step ' + sim.step + (sim.done ? ' · stopped' : (limit < Infinity ? ' / ' + limit : '')) + '</span>');
      }

      function draw() {
        const s = host.getState();
        paintGrid(s);
        render(ctx, canvas.width, canvas.height, s);
        status();
      }

      /* ---------------- loop ---------------- */
      function stopLimit(s) { return s.stopAfter >= 6000 ? Infinity : s.stopAfter; }
      function stopLoop() { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }

      function frame() {
        raf = 0;
        const s = host.getState();
        const limit = stopLimit(s);
        const subs = Math.max(1, Math.min(s.speed, Math.floor(AGENT_BUDGET / sim.N)));
        const t0 = performance.now();
        let n = 0;
        while (n < subs && sim.step < limit) {
          step(s); n++;
          if (performance.now() - t0 > FRAME_BUDGET_MS) break;
        }
        sim.done = sim.step >= limit;
        draw();
        if (!sim.done && host.isActive()) raf = requestAnimationFrame(frame);
      }

      // Reduced motion: advance to WARM_STEPS in bounded synchronous chunks, then show one still frame.
      function chunk() {
        timer = 0;
        const s = host.getState();
        const limit = Math.min(WARM_STEPS, stopLimit(s));
        const t0 = performance.now();
        while (sim.step < limit && performance.now() - t0 < 40) step(s);
        if (sim.step < limit) { status(); timer = setTimeout(chunk, 0); }
        else { sim.done = true; draw(); }
      }

      function start() {
        stopLoop();
        if (sim.done) return;
        if (host.reducedMotion()) timer = setTimeout(chunk, 0);
        else raf = requestAnimationFrame(frame);
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stopLoop();
          initSim(host.getState());
          draw();
          start();
        },
        repaint() { draw(); },
        live(key) {
          if (key === 'stopAfter' || key === 'speed') {
            if (sim.step < stopLimit(host.getState())) { sim.done = false; if (!raf && !timer) start(); }
          }
        },
        resize() { render(ctx, canvas.width, canvas.height, host.getState()); },
        pause() { stopLoop(); },
        resume() { if (!raf && !timer) start(); },
        action(key) { if (key === 'reset') this.regenerate(); },
        async exportPNG(w, h) {
          const s = host.getState();
          paintGrid(s);
          const out = document.createElement('canvas');
          out.width = w; out.height = h;
          render(out.getContext('2d'), w, h, s);
          return U.toBlob(out);
        },
      };
    },
  });
})();

