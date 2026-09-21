
/* modules/swarm.js + modules/chirikov.js */
(function () {
  'use strict';
  const U = Studio.util, TAU = U.TAU, PI = Math.PI;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  /* ---------- Swarmalators (O'Keeffe, Hong, Strogatz 2017) ---------- */
  Studio.register({
    id: 'swarm',
    name: 'Swarmalators',
    subtitle: 'oscillators that sync and swarm · 2017',
    order: 55.5,
    equation: 'ẋᵢ = (1/N) Σⱼ [ (xⱼ−xᵢ)/rᵢⱼ · (1 + J cos Δθ) − (xⱼ−xᵢ)/rᵢⱼ² ],   θ̇ᵢ = (K/N) Σⱼ sin(Δθ)/rᵢⱼ',
    credit: "Kevin P. O’Keeffe, Hyunsuk Hong and Steven H. Strogatz, Nature Communications 8, 1504 (2017), 'Oscillators that sync and swarm'. Identical agents with a phase and a position: spatial attraction depends on phase agreement, and phase coupling falls with distance. Five collective states live in the (J, K) plane, including a static rainbow ring and an active phase wave.",
    blurb: 'A firefly that walks. Each agent has a place and a phase, and the two talk: agents of similar phase attract, opposite phase repel, and the phase coupling itself dies with distance. That is enough for five states that do not exist in either the Kuramoto model or a swarm alone. The rainbow ring is the one you cannot unsee — phase locked to polar angle, a color wheel of bodies. Turn K a little negative and the ring splinters. More negative, and it never sits still.',
    schema: [
      { group: 'Agents', key: 'N', label: 'Agents', type: 'range', kind: GEOM, min: 80, max: 800, step: 20 },
      { group: 'Agents', key: 'init', label: 'Seeding', type: 'seg', kind: GEOM, wrap: true,
        options: [['random', 'Random'], ['ring', 'Ring'], ['sync', 'Sync blob'], ['two', 'Two tribes']] },
      { group: 'Coupling', key: 'J', label: 'Spatial J', type: 'range', kind: LIVE, min: -1, max: 1.5, step: 0.02, fmt: f2,
        hint: 'How much phase agreement attracts in space. J>0: like phases cluster. J<0: like phases avoid.' },
      { group: 'Coupling', key: 'K', label: 'Phase K', type: 'range', kind: LIVE, min: -1.5, max: 1.5, step: 0.02, fmt: f2,
        hint: 'Kuramoto coupling, weighted by 1/distance. K>0: sync. K<0: async. The rainbow ring lives near K=0, J>0.' },
      { group: 'Coupling', key: 'noise', label: 'Noise', type: 'range', kind: LIVE, min: 0, max: 0.15, step: 0.005, fmt: f3 },
      { group: 'Simulation', key: 'running', label: 'Running', type: 'toggle', kind: LIVE },
      { group: 'Simulation', key: 'dt', label: 'Time step', type: 'range', kind: LIVE, min: 0.02, max: 0.25, step: 0.01, fmt: f2 },
      { group: 'Simulation', key: 'warmup', label: 'Warm-up steps', type: 'range', kind: GEOM, min: 0, max: 400, step: 10 },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT,
        options: [['agents', 'Agents'], ['trails', 'Trails'], ['density', 'Density']] },
      { group: 'Picture', key: 'size', label: 'Dot size', type: 'range', kind: PAINT, min: 0.4, max: 3.5, step: 0.1, fmt: f2 },
      { group: 'Picture', key: 'fade', label: 'Trail fade', type: 'range', kind: PAINT, min: 0.04, max: 0.5, step: 0.02, fmt: f2, dimUnless: s => s.view === 'trails' },
      { group: 'Picture', key: 'zoom', label: 'Zoom', type: 'range', kind: PAINT, min: 0.5, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: v => Math.round(v * 100) + '%' },
    ],
    defaults: {
      N: 360, init: 'random', J: 1, K: 0, noise: 0.01,
      running: true, dt: 0.08, warmup: 90,
      view: 'agents', size: 1.4, fade: 0.12, zoom: 1, grain: 0.06,
      aspect: '1:1', seed: 'okeeffe-2017',
    },
    presets: {
      rainbow: pre('Rainbow ring', { J: 1, K: 0, init: 'random', view: 'agents', warmup: 120 }, Pal.thermal),
      sync: pre('Static sync', { J: 0.5, K: 1, init: 'random', view: 'agents', warmup: 100 }, Pal.ember),
      async: pre('Static async', { J: 0.8, K: -0.5, init: 'random', view: 'agents', warmup: 80 }, Pal.graphite),
      splinter: pre('Splintered wave', { J: 1, K: -0.15, init: 'ring', view: 'agents', warmup: 140 }, Pal.nightshade),
      active: pre('Active phase wave', { J: 1, K: -0.75, init: 'random', view: 'trails', fade: 0.1, warmup: 80 }, Pal.bioluminescent),
    },
    hints: {
      Coupling: 'The whole phase diagram is these two numbers. Rainbow ring: J=1, K=0. Sync crystal: K positive. Active chaos: K negative and J positive.',
      Picture: 'Agents are colored by phase through the palette. Trails keep a ghost of the motion — that is how you see an active phase wave is actually moving.',
    },
    palette: true, defaultPalette: 'thermal', paletteLabel: 'Phase colors',
    headline: 'K', headlineLabel: 'phase K',
    sanitize(s) { s.N = U.clamp(Math.round(Number(s.N) / 20) * 20, 80, 800); },
    surprise(rng) {
      const pick = rng.pick(['rainbow', 'sync', 'async', 'splinter', 'active']);
      const table = { rainbow: [1, 0], sync: [0.5, 0.9], async: [0.7, -0.5], splinter: [1, -0.12], active: [1, -0.7] };
      const [J, K] = table[pick];
      return {
        N: rng.pick([240, 360, 480]), init: rng.pick(['random', 'random', 'ring']),
        J, K, noise: rng.pick([0, 0.01, 0.04]), running: true, dt: 0.08, warmup: rng.int(40, 160),
        view: pick === 'active' ? 'trails' : 'agents', size: rng.range(1, 2), fade: 0.12, zoom: rng.range(0.85, 1.15),
        grain: rng.pick([0, 0.05, 0.1]),
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let x, y, th, N = 0, raf = 0, stepCount = 0, R = 0;
      const trail = document.createElement('canvas'), tctx = trail.getContext('2d');

      function seed(s) {
        N = s.N | 0;
        x = new Float32Array(N); y = new Float32Array(N); th = new Float32Array(N);
        const rng = U.makeRng(s.seed + '/swarm');
        for (let i = 0; i < N; i++) {
          if (s.init === 'ring') {
            const a = TAU * i / N;
            x[i] = Math.cos(a); y[i] = Math.sin(a);
            th[i] = a;
          } else if (s.init === 'sync') {
            x[i] = rng.range(-0.4, 0.4); y[i] = rng.range(-0.4, 0.4);
            th[i] = rng.range(-0.2, 0.2);
          } else if (s.init === 'two') {
            const left = i < N / 2;
            x[i] = (left ? -0.7 : 0.7) + rng.range(-0.25, 0.25);
            y[i] = rng.range(-0.4, 0.4);
            th[i] = left ? rng.range(-0.3, 0.3) : PI + rng.range(-0.3, 0.3);
          } else {
            x[i] = rng.range(-1.1, 1.1); y[i] = rng.range(-1.1, 1.1);
            th[i] = rng() * TAU;
          }
        }
        stepCount = 0;
      }
      function step(s) {
        const J = s.J, K = s.K, dt = s.dt, nse = s.noise;
        const fx = new Float32Array(N), fy = new Float32Array(N), ft = new Float32Array(N);
        const cs = new Float32Array(N), sn = new Float32Array(N);
        for (let i = 0; i < N; i++) { cs[i] = Math.cos(th[i]); sn[i] = Math.sin(th[i]); }
        const invN = 1 / N;
        for (let i = 0; i < N; i++) {
          let sx = 0, sy = 0, st = 0;
          const xi = x[i], yi = y[i], ci = cs[i], si = sn[i];
          for (let j = 0; j < N; j++) {
            if (j === i) continue;
            const dx = x[j] - xi, dy = y[j] - yi;
            let r = Math.hypot(dx, dy); if (r < 0.05) r = 0.05;
            const ir = 1 / r;
            const coss = cs[j] * ci + sn[j] * si;
            const sinn = sn[j] * ci - cs[j] * si;
            // attraction (A + J cos Δθ)·r̂ minus the hard-core repulsion B·r̂/r: without the second term
            // every pair attracts at unit strength at any range and the swarm collapses to one point
            const f = ir * (1 + J * coss) - ir * ir;
            sx += dx * f; sy += dy * f; st += sinn * ir;
          }
          fx[i] = sx * invN; fy[i] = sy * invN; ft[i] = K * st * invN;
        }
        const rng = nse > 0 ? U.makeRng(s.seed + '/n/' + stepCount) : null;
        let cx = 0, cy = 0, cr = 0, sr = 0;
        for (let i = 0; i < N; i++) {
          x[i] += dt * fx[i]; y[i] += dt * fy[i]; th[i] += dt * ft[i];
          if (rng) { x[i] += (rng() * 2 - 1) * nse * dt; y[i] += (rng() * 2 - 1) * nse * dt; th[i] += (rng() * 2 - 1) * nse * dt; }
          cx += x[i]; cy += y[i]; cr += Math.cos(th[i]); sr += Math.sin(th[i]);
        }
        R = Math.hypot(cr, sr) / N;
        stepCount++;
      }
      function paint(target, w, h, s) {
        const g = target;
        const bg = s.bg || '#111';
        if (s.view !== 'trails') { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
        else {
          g.fillStyle = bg; g.globalAlpha = s.fade; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
        }
        const lut = U.makeRampLUT(s.palette, null, 256);
        let mx = 0, my = 0;
        for (let i = 0; i < N; i++) { mx += x[i]; my += y[i]; }
        mx /= N; my /= N;
        let rad = 0.4;
        for (let i = 0; i < N; i++) rad = Math.max(rad, Math.hypot(x[i] - mx, y[i] - my));
        const sc = 0.42 * Math.min(w, h) * s.zoom / rad;
        const cx = w / 2, cy = h / 2;
        const r = Math.max(1.2, s.size * Math.min(w, h) / 280);
        if (s.view === 'density') {
          const dens = new Float32Array(w * h);
          for (let i = 0; i < N; i++) {
            const px = ((x[i] - mx) * sc + cx) | 0, py = ((y[i] - my) * sc + cy) | 0;
            if (px >= 1 && py >= 1 && px < w - 1 && py < h - 1) {
              dens[py * w + px] += 3; dens[py * w + px + 1] += 1; dens[py * w + px - 1] += 1;
              dens[(py + 1) * w + px] += 1; dens[(py - 1) * w + px] += 1;
            }
          }
          const img = g.getImageData(0, 0, w, h), d = img.data;
          const bgc = U.hexToRgb(bg);
          for (let i = 0; i < w * h; i++) {
            const t = Math.min(1, dens[i] / 8);
            const li = (t * 255 | 0) * 3;
            d[i * 4] = bgc[0] + (lut[li] - bgc[0]) * t;
            d[i * 4 + 1] = bgc[1] + (lut[li + 1] - bgc[1]) * t;
            d[i * 4 + 2] = bgc[2] + (lut[li + 2] - bgc[2]) * t;
            d[i * 4 + 3] = 255;
          }
          g.putImageData(img, 0, 0);
        } else {
          for (let i = 0; i < N; i++) {
            let p = th[i] / TAU; p -= Math.floor(p);
            const li = (p * 255 | 0) * 3;
            g.fillStyle = 'rgb(' + (lut[li] | 0) + ',' + (lut[li + 1] | 0) + ',' + (lut[li + 2] | 0) + ')';
            g.beginPath();
            g.arc((x[i] - mx) * sc + cx, (y[i] - my) * sc + cy, r, 0, TAU);
            g.fill();
          }
        }
        if (s.grain > 0) {
          const img = g.getImageData(0, 0, w, h), d = img.data;
          const amp = s.grain * 28;
          const rng = U.makeRng(s.seed + '/grain/' + w + 'x' + h);
          for (let i = 0; i < d.length; i += 4) {
            const nz = (rng() - 0.5) * amp;
            d[i] += nz; d[i + 1] += nz; d[i + 2] += nz;
          }
          g.putImageData(img, 0, 0);
        }
      }
      function draw() {
        const s = host.getState();
        const w = canvas.width, h = canvas.height;
        if (s.view === 'trails') {
          if (trail.width !== w || trail.height !== h) { trail.width = w; trail.height = h; tctx.fillStyle = s.bg; tctx.fillRect(0, 0, w, h); }
          paint(tctx, w, h, s);
          ctx.drawImage(trail, 0, 0);
        } else paint(ctx, w, h, s);
      }
      function status() {
        const s = host.getState();
        let kind = 'mixed';
        if (s.K > 0.25 && R > 0.8) kind = 'static sync';
        else if (Math.abs(s.K) < 0.08 && s.J > 0.4) kind = 'phase wave';
        else if (s.K < -0.4 && s.J > 0.4) kind = 'active wave';
        else if (s.K < 0 && R < 0.3) kind = 'async';
        host.setStatus('<span>N <b>' + N + '</b></span><span>R <b>' + R.toFixed(2) + '</b> · ' + kind + '</span><span>step <b>' + stepCount + '</b></span>');
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        step(s); draw();
        if (stepCount % 8 === 0) status();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
      }
      function start() {
        stop();
        if (host.getState().running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { draw(); status(); }
      }
      return {
        aspect() { return 1; },
        regenerate() {
          stop();
          const s = host.getState();
          seed(s);
          const warm = host.reducedMotion() ? Math.min(s.warmup, 40) : s.warmup;
          for (let i = 0; i < warm; i++) step(s);
          trail.width = 0;
          draw(); status(); start();
        },
        repaint() { draw(); },
        live(key) { if (key === 'running') start(); },
        resize() { trail.width = 0; draw(); },
        pause() { stop(); },
        resume() { draw(); start(); },
        disturb(p) {
          const s = host.getState();
          let mx = 0, my = 0, rad = 0.4;
          for (let i = 0; i < N; i++) { mx += x[i]; my += y[i]; }
          mx /= N; my /= N;
          for (let i = 0; i < N; i++) rad = Math.max(rad, Math.hypot(x[i] - mx, y[i] - my));
          const wx = mx + (p.x - 0.5) * 2 * rad / s.zoom;
          const wy = my + (p.y - 0.5) * 2 * rad / s.zoom;
          for (let i = 0; i < N; i++) {
            const d = Math.hypot(x[i] - wx, y[i] - wy);
            if (d < 0.45) {
              const k = Math.exp(-d * d / 0.08);
              th[i] += 1.4 * k;
              x[i] += (p.dx || 0) * 2 * k; y[i] += ((p.yGL ? -p.dy : p.dy) || 0) * 2 * k;
            }
          }
          draw();
        },
        async exportPNG(w, h) {
          const s = host.getState();
          const out = document.createElement('canvas'); out.width = w; out.height = h;
          paint(out.getContext('2d'), w, h, Object.assign({}, s, { view: s.view === 'trails' ? 'agents' : s.view }));
          return U.toBlob(out);
        },
      };
    },
  });

  /* ---------- Chirikov standard map as a density plate ---------- */
  Studio.register({
    id: 'chirikov',
    name: 'Chirikov map',
    subtitle: 'standard map · KAM islands in a chaotic sea · 1969',
    order: 91,
    equation: 'pₙ₊₁ = pₙ + K sin θₙ,   θₙ₊₁ = θₙ + pₙ₊₁   (mod 2π)',
    credit: "Boris V. Chirikov, Physics Reports 52, 263 (1979); the map itself in 1969. The Chirikov–Taylor standard map is the Poincaré section of a kicked rotor, and the textbook picture of Kolmogorov–Arnold–Moser theory: as K grows, invariant curves break, islands shrink, and a chaotic sea floods the torus. The last golden KAM curve dies at K ≈ 0.971635.",
    blurb: 'A kicked rotor, reduced to two numbers and a kick. Each orbit is a point on a torus; iterate, and the torus fills in two textures at once: closed curves that never mix (the KAM islands) and a sea that does. Color by density and you see the islands as dark continents. Color by Lyapunov exponent and the sea lights up — that is chaos, measured. K is the only coupling that matters. Below one, a world of islands. At 0.9716 the last circle breaks. Above two, almost everything wanders.',
    schema: [
      { group: 'Map', key: 'K', label: 'Kick K', type: 'range', kind: GEOM, min: 0, max: 6, step: 0.01, fmt: f2,
        hint: 'Chirikov’s stochasticity parameter. K≈0.97 is the death of the last golden KAM curve. Below: islands. Above: a growing sea.' },
      { group: 'Map', key: 'orbits', label: 'Orbits', type: 'range', kind: GEOM, min: 400, max: 8000, step: 200, fmt: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v) },
      { group: 'Map', key: 'iters', label: 'Iters / orbit', type: 'range', kind: GEOM, min: 40, max: 800, step: 20 },
      { group: 'Map', key: 'burn', label: 'Burn-in', type: 'range', kind: GEOM, min: 0, max: 80, step: 5 },
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT,
        options: [['density', 'Density'], ['lyap', 'Lyapunov'], ['orbit', 'Orbit']] },
      { group: 'Picture', key: 'tone', label: 'Tone', type: 'seg', kind: PAINT, options: [['log', 'Log'], ['power', 'Linear']] },
      { group: 'Picture', key: 'exposure', label: 'Exposure', type: 'range', kind: PAINT, min: 0.4, max: 2.4, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'gamma', label: 'Gamma', type: 'range', kind: PAINT, min: 0.4, max: 2.2, step: 0.05, fmt: f2 },
      { group: 'Picture', key: 'aspect', label: 'Aspect', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4']] },
      { group: 'Picture', key: 'grain', label: 'Grain', type: 'range', kind: PAINT, min: 0, max: 0.4, step: 0.02, fmt: v => Math.round(v * 100) + '%' },
      { group: 'Simulation', key: 'running', label: 'Accumulate', type: 'toggle', kind: LIVE },
    ],
    defaults: {
      K: 1.2, orbits: 2400, iters: 220, burn: 12,
      view: 'density', tone: 'log', exposure: 1.15, gamma: 0.95, aspect: '1:1', grain: 0.05,
      running: true, seed: 'chirikov-1969',
    },
    presets: {
      kam: pre('KAM islands', { K: 0.5, view: 'density', orbits: 2000, iters: 280 }, Pal.xray),
      critical: pre('Last KAM', { K: 0.97, view: 'density', orbits: 3000, iters: 320 }, Pal.graphite),
      mixed: pre('Mixed sea', { K: 1.2, view: 'density', orbits: 2400, iters: 220 }, Pal.glacier),
      lyap: pre('Lyapunov sea', { K: 1.4, view: 'lyap', orbits: 1800, iters: 180 }, Pal.thermal),
      chaos: pre('Global chaos', { K: 4, view: 'density', orbits: 2000, iters: 160, exposure: 1.3 }, Pal.ember),
    },
    hints: {
      Map: 'K is the whole story. The famous number is 0.9716: Greene’s residue criterion for the last golden invariant circle. Density is the portrait; Lyapunov colors chaos versus order.',
    },
    palette: true, defaultPalette: 'xray', paletteLabel: 'Colors',
    headline: 'K', headlineLabel: 'kick K',
    sanitize(s) { s.K = U.clamp(Number(s.K) || 1.2, 0, 8); s.orbits = U.clamp(Math.round(Number(s.orbits) / 200) * 200, 400, 8000); },
    surprise(rng) {
      return {
        K: rng.pick([0.4, 0.8, 0.97, 1.2, 1.6, 2.5, 4]),
        orbits: rng.pick([1600, 2400, 3600]), iters: rng.int(120, 360), burn: 10,
        view: rng.pick(['density', 'density', 'lyap']), tone: 'log',
        exposure: rng.range(0.9, 1.4), gamma: rng.range(0.8, 1.15), aspect: '1:1',
        grain: rng.pick([0, 0.05, 0.1]), running: true,
      };
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let dens, lyap, orbitC, BW = 0, BH = 0, raf = 0, count = 0, hits = 0, rng, walkers;
      const TWO = TAU;

      function sizeOf(s) {
        const ar = ASPECTS[s.aspect] || 1;
        const long = 720;
        return ar >= 1 ? [Math.round(long / ar), long] : [long, Math.round(long * ar)];
      }
      function reset(s) {
        const [w, h] = sizeOf(s);
        BW = w; BH = h;
        dens = new Float32Array(w * h);
        lyap = new Float32Array(w * h);
        orbitC = new Float32Array(w * h);
        count = 0; hits = 0;
        rng = U.makeRng(s.seed + '/map');
        const n = s.orbits | 0;
        walkers = [];
        for (let i = 0; i < n; i++) {
          walkers.push({
            th: rng() * TWO, p: rng() * TWO,
            ux: 1, uy: 0, lam: 0, n: 0,
            hue: rng(),
          });
        }
      }
      function kick(w, K) {
        const s = Math.sin(w.th), c = Math.cos(w.th);
        const kct = K * c;
        w.p += K * s;
        w.th += w.p;
        const nux = (1 + kct) * w.ux + w.uy;
        const nuy = kct * w.ux + w.uy;
        const nrm = Math.hypot(nux, nuy) || 1;
        w.ux = nux / nrm; w.uy = nuy / nrm;
        w.lam += Math.log(nrm);
        w.n++;
        w.th = ((w.th % TWO) + TWO) % TWO;
        w.p = ((w.p % TWO) + TWO) % TWO;
      }
      function plot(w) {
        const ix = Math.min(BW - 1, (w.th / TWO * BW) | 0);
        const iy = Math.min(BH - 1, (w.p / TWO * BH) | 0);
        const i = iy * BW + ix;
        dens[i] += 1;
        lyap[i] += w.n > 0 ? w.lam / w.n : 0;
        orbitC[i] += w.hue;
        hits++;
      }
      function accumulate(s, budgetMs) {
        const t0 = performance.now(), K = s.K, burn = s.burn | 0, per = 24;
        while (performance.now() - t0 < budgetMs) {
          for (let i = 0; i < walkers.length; i++) {
            const w = walkers[i];
            for (let k = 0; k < per; k++) {
              kick(w, K);
              if (w.n > burn) plot(w);
            }
          }
          count += walkers.length * per;
        }
      }
      function tone(s, rgba, W, H) {
        const lut = U.makeRampLUT(s.palette, s.bg, 256);
        const bg = U.hexToRgb(s.bg);
        let maxD = 0;
        for (let i = 0; i < dens.length; i++) if (dens[i] > maxD) maxD = dens[i];
        const inv = 1 / Math.max(1, maxD), L = 255, log = s.tone === 'log', expo = s.exposure, gam = s.gamma;
        const view = s.view;
        for (let i = 0, o = 0; i < dens.length; i++, o += 4) {
          const d = dens[i];
          if (d <= 0) { rgba[o] = bg[0]; rgba[o + 1] = bg[1]; rgba[o + 2] = bg[2]; rgba[o + 3] = 255; continue; }
          let t;
          if (view === 'lyap') {
            const lam = lyap[i] / d;
            t = U.clamp((lam - 0.02) / 0.55, 0, 1);
          } else if (view === 'orbit') {
            t = (orbitC[i] / d) % 1; if (t < 0) t += 1;
          } else {
            t = log ? Math.log1p(d * inv * 40) / Math.log1p(40) : d * inv;
            t = Math.min(1, t * expo);
          }
          if (gam !== 1 && view !== 'orbit') t = Math.pow(t, gam);
          const li = (t * L | 0) * 3;
          rgba[o] = lut[li]; rgba[o + 1] = lut[li + 1]; rgba[o + 2] = lut[li + 2]; rgba[o + 3] = 255;
        }
        if (s.grain > 0) {
          const amp = s.grain * 22;
          const rng = U.makeRng(s.seed + '/grain/' + dens.length);
          for (let i = 0; i < rgba.length; i += 4) {
            const nz = (rng() - 0.5) * amp;
            rgba[i] += nz; rgba[i + 1] += nz; rgba[i + 2] += nz;
          }
        }
      }
      function draw() {
        const s = host.getState();
        const w = canvas.width, h = canvas.height;
        if (!dens) return;
        const buf = document.createElement('canvas'); buf.width = BW; buf.height = BH;
        const bctx = buf.getContext('2d');
        const img = bctx.createImageData(BW, BH);
        tone(s, img.data, BW, BH);
        bctx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(buf, 0, 0, w, h);
      }
      function status() {
        const s = host.getState();
        const k = s.K;
        const kind = k < 0.8 ? 'KAM' : k < 1.05 ? 'critical' : k < 2.2 ? 'mixed' : 'chaotic';
        host.setStatus('<span>K <b>' + k.toFixed(2) + '</b> · ' + kind + '</span><span>hits <b>' + (hits / 1e6).toFixed(2) + 'M</b></span>');
      }
      function stop() { cancelAnimationFrame(raf); raf = 0; }
      function frame() {
        raf = 0;
        const s = host.getState();
        if (s.running) accumulate(s, 18);
        draw(); status();
        if (s.running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
      }
      function start() {
        stop();
        if (host.getState().running && !host.reducedMotion()) raf = requestAnimationFrame(frame);
        else { draw(); status(); }
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          stop();
          reset(host.getState());
          accumulate(host.getState(), host.reducedMotion() ? 80 : 40);
          draw(); status(); start();
        },
        repaint() { draw(); },
        live(key) { if (key === 'running') start(); },
        resize() { draw(); },
        pause() { stop(); },
        resume() { start(); },
        disturb(p) {
          const s = host.getState();
          if (!walkers) return;
          const th0 = p.x * TWO, p0 = (1 - p.y) * TWO;
          const rng = U.makeRng(s.seed + '/poke/' + walkers.length);
          for (let i = 0; i < 40; i++) {
            walkers.push({ th: th0 + (rng() - 0.5) * 0.08, p: p0 + (rng() - 0.5) * 0.08, ux: 1, uy: 0, lam: 0, n: 0, hue: rng() });
          }
          if (!raf) start();
        },
        async exportPNG(w, h) {
          const s = host.getState();
          const out = document.createElement('canvas'); out.width = w; out.height = h;
          const octx = out.getContext('2d');
          const buf = document.createElement('canvas'); buf.width = BW; buf.height = BH;
          const img = buf.getContext('2d').createImageData(BW, BH);
          tone(s, img.data, BW, BH);
          buf.getContext('2d').putImageData(img, 0, 0);
          octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
          octx.drawImage(buf, 0, 0, w, h);
          return U.toBlob(out);
        },
      };
    },
  });
})();

