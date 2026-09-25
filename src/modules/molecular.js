/* modules/molecular.js */
/* Original implementation of established 2D Lennard-Jones molecular dynamics. */
(function () {
  'use strict';
  const U = Studio.util, Pal = Studio.PALETTES;
  const RC = 2.5, RC2 = RC * RC;
  const UC = 4 * (RC ** -12 - RC ** -6);
  const FC = 24 * (2 * RC ** -13 - RC ** -7);
  const RANGE = (group, key, label, kind, min, max, step, fmt) =>
    ({ group, key, label, type: 'range', kind, min, max, step, fmt });
  const DEFAULTS = { n: 1024, density: .55, temperature: .7, dt: .002, warmup: 1000, running: false, speed: 4, view: 'speed', radius: .34, links: false };
  const pre = (label, p, palette) => ({ label, p: { ...DEFAULTS, ...p }, palette });

  // sigma = epsilon = mass = k_B = 1. The radial force is -dV/dr.
  // Both V and force vanish continuously at rc; this changes the model from
  // the full LJ potential and from merely subtracting the potential at rc.
  function pair(r2) {
    if (r2 >= RC2) return { energy: 0, coefficient: 0, stiffness: 0 };
    if (!(r2 >= .36) || !Number.isFinite(r2)) throw Error('Unresolved close approach');
    const r = Math.sqrt(r2), inv2 = 1 / r2, s6 = inv2 ** 3;
    const coefficient = 24 * inv2 * s6 * (2 * s6 - 1) - FC / r;
    return {
      energy: 4 * s6 * (s6 - 1) - UC + (r - RC) * FC,
      coefficient,
      // Operator norm of the central-force pair Hessian in 2D.
      stiffness: Math.max(Math.abs(24 * inv2 * s6 * (26 * s6 - 7)), Math.abs(coefficient)),
    };
  }
  const image = (d, L) => d - L * Math.round(d / L);
  const wrap = (x, L) => x - L * Math.floor(x / L);

  function makeSim(s) {
    const n = s.n, L = Math.sqrt(n / s.density), dt = s.dt;
    if (L <= 2 * RC) throw Error('Periodic box must exceed twice the interaction cutoff');
    const x = new Float64Array(n), y = new Float64Array(n);
    const vx = new Float64Array(n), vy = new Float64Array(n);
    const fx = new Float64Array(n), fy = new Float64Array(n), curvature = new Float64Array(n);
    const bx = new Float64Array(n), by = new Float64Array(n), bvx = new Float64Array(n), bvy = new Float64Array(n);
    const cells = Math.max(1, Math.floor(L / RC)), cellWidth = L / cells;
    const head = new Int32Array(cells * cells), next = new Int32Array(n), cellOf = new Int32Array(n);
    // Deduplicate wrapped cells: a two-cell-wide box must not count a pair twice.
    const neighbors = Array.from({ length: cells * cells }, (_, c) => {
      const list = new Set(), cx = c % cells, cy = Math.floor(c / cells);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
        list.add(((cy + dy + cells) % cells) * cells + (cx + dx + cells) % cells);
      return [...list];
    });
    const sim = { n, L, dt, x, y, vx, vy, fx, fy, step: 0, halted: '', energy0: 0,
      scale: 1, potential: 0, kinetic: 0, temperature: 0, px: 0, py: 0,
      drift: 0, stiffnessBound: 0, candidates: 0, interactions: 0 };

    function rebuild() {
      head.fill(-1);
      for (let i = 0; i < n; i++) {
        const c = Math.min(cells - 1, Math.floor(x[i] / cellWidth)) +
          cells * Math.min(cells - 1, Math.floor(y[i] / cellWidth));
        cellOf[i] = c; next[i] = head[c]; head[c] = i;
      }
    }
    function eachPair(visit) {
      for (let i = 0; i < n; i++) for (const cell of neighbors[cellOf[i]])
        for (let j = head[cell]; j !== -1; j = next[j]) {
          if (j <= i) continue;
          const dx = image(x[i] - x[j], L), dy = image(y[i] - y[j], L);
          visit(i, j, dx, dy, dx * dx + dy * dy);
        }
    }
    function forces() {
      rebuild(); fx.fill(0); fy.fill(0); curvature.fill(0);
      let potential = 0, candidates = 0, interactions = 0;
      eachPair((i, j, dx, dy, r2) => {
        candidates++;
        if (r2 >= RC2) return;
        const p = pair(r2), ax = p.coefficient * dx, ay = p.coefficient * dy;
        fx[i] += ax; fy[i] += ay; fx[j] -= ax; fy[j] -= ay;
        potential += p.energy; curvature[i] += p.stiffness; curvature[j] += p.stiffness;
        interactions++;
      });
      let max = 0; for (const c of curvature) max = Math.max(max, c);
      sim.stiffnessBound = 2 * max; sim.potential = potential;
      sim.candidates = candidates; sim.interactions = interactions;
    }
    function measure() {
      let kinetic = 0, px = 0, py = 0;
      for (let i = 0; i < n; i++) { kinetic += .5 * (vx[i] ** 2 + vy[i] ** 2); px += vx[i]; py += vy[i]; }
      sim.kinetic = kinetic; sim.px = px; sim.py = py;
      // Removing center-of-mass velocity removes two degrees of freedom.
      sim.temperature = kinetic / (n - 1);
      sim.drift = (kinetic + sim.potential - sim.energy0) / sim.scale;
    }
    function guard() {
      if (!Number.isFinite(sim.kinetic + sim.potential)) throw Error('Nonfinite molecular state');
      // For a frozen Hessian velocity Verlet requires dt*sqrt(lambda)<2.
      // 2*max_i sum_j ||H_ij|| bounds its spectral magnitude. The stricter
      // 0.5 guard is local and conservative, NOT a global nonlinear proof.
      if (dt * Math.sqrt(sim.stiffnessBound) > .5) throw Error('Timestep too large for current forces');
      if (Math.abs(sim.drift) > .02) throw Error('Energy drift exceeded 2% of the initial energy scale');
    }
    function reference() {
      forces(); measure(); sim.energy0 = sim.kinetic + sim.potential;
      sim.scale = Math.max(n, sim.kinetic + Math.abs(sim.potential)); measure();
    }
    function advance(count) {
      for (let k = 0; k < count && !sim.halted; k++) {
        bx.set(x); by.set(y); bvx.set(vx); bvy.set(vy);
        try {
          guard();
          for (let i = 0; i < n; i++) {
            vx[i] += .5 * dt * fx[i]; vy[i] += .5 * dt * fy[i];
            x[i] = wrap(x[i] + dt * vx[i], L); y[i] = wrap(y[i] + dt * vy[i], L);
          }
          forces();
          for (let i = 0; i < n; i++) { vx[i] += .5 * dt * fx[i]; vy[i] += .5 * dt * fy[i]; }
          measure(); guard(); sim.step++;
        } catch (error) {
          // Keep the last accepted physical state. Never clip force or velocity,
          // silently reduce dt, or continue a failed trajectory as a valid plate.
          x.set(bx); y.set(by); vx.set(bvx); vy.set(bvy); forces(); measure();
          sim.halted = error.message + '. Lower the timestep and regenerate.';
        }
      }
    }
    const rng = U.makeRng(s.seed + '/molecular'), columns = Math.ceil(Math.sqrt(n)), spacing = L / columns;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) {
      x[i] = (i % columns + .5 + .025 * (2 * rng() - 1)) * spacing;
      y[i] = (Math.floor(i / columns) + .5 + .025 * (2 * rng() - 1)) * spacing;
      vx[i] = rng.gauss(); vy[i] = rng.gauss(); mx += vx[i]; my += vy[i];
    }
    mx /= n; my /= n;
    let kinetic = 0;
    for (let i = 0; i < n; i++) { vx[i] -= mx; vy[i] -= my; kinetic += .5 * (vx[i] ** 2 + vy[i] ** 2); }
    const scale = Math.sqrt((n - 1) * s.temperature / kinetic);
    for (let i = 0; i < n; i++) { vx[i] *= scale; vy[i] *= scale; }
    Object.assign(sim, { advance, eachPair, forces, measure, reference }); reference();
    return sim;
  }

  Studio.register({
    id: 'molecular', name: 'Molecular Dynamics', subtitle: 'Lennard-Jones particles · 1924 / 1967', order: 82.4, familiarity: 'occasional',
    equation: 'V(r) = 4(r^-12 - r^-6) - V_LJ(rc) + (r-rc)F_LJ(rc), r < rc = 2.5;  m r̈ = -∇V',
    credit: 'J. E. Lennard-Jones, Proceedings of the Royal Society A (1924). L. Verlet, Physical Review (1967). Force shifting and molecular dynamics: M. P. Allen and D. J. Tildesley, Computer Simulation of Liquids, second edition (2017).',
    blurb: 'Atoms repel strongly when close and attract at a modest distance. Here thousands of particles move in a periodic two-dimensional box. Warm the initial velocities or change the density and watch collisions rearrange the material. The force and potential both taper to zero at 2.5 particle diameters. There is no thermostat: temperature can change as kinetic and potential energy trade places. Colors show particle speed or identity, and optional links mark nearby pairs, not chemical bonds. This is an established idealized model, not a simulation of a specific substance.',
    palette: true, defaultPalette: 'thermal', headline: 'n', headlineLabel: 'particles',
    defaults: { ...DEFAULTS },
    schema: [
      { group: 'Material', key: 'n', label: 'Particles', type: 'seg', kind: 'geom', options: [[256, '256'], [1024, '1,024'], [4096, '4,096'], [16384, '16,384']] },
      RANGE('Material', 'density', 'Number density', 'geom', .1, .85, .01, v => v.toFixed(2)),
      RANGE('Material', 'temperature', 'Initial temperature', 'geom', .05, 2, .05, v => v.toFixed(2)),
      RANGE('Evolution', 'dt', 'Time step', 'geom', .0005, .004, .0005, v => v.toFixed(4)),
      RANGE('Evolution', 'warmup', 'Initial steps', 'geom', 0, 6000, 100, v => String(v)),
      { group: 'Evolution', key: 'running', label: 'Keep evolving', type: 'toggle', kind: 'live' },
      RANGE('Evolution', 'speed', 'Steps per frame', 'live', 1, 12, 1, v => String(v)),
      { group: 'Picture', key: 'view', label: 'Color', type: 'seg', kind: 'paint', options: [['speed', 'Speed'], ['identity', 'Identity']] },
      RANGE('Picture', 'radius', 'Drawn radius', 'paint', .15, .55, .01, v => v.toFixed(2)),
      { group: 'Picture', key: 'links', label: 'Near-neighbor links', type: 'toggle', kind: 'paint' },
    ],
    presets: {
      warm: pre('Warm material', { density: .55, temperature: .7, warmup: 1000 }, Pal.thermal),
      cool: pre('Cool dense layer', { density: .8, temperature: .1, warmup: 1600, links: true }, Pal.glacier),
      dilute: pre('Dilute gas', { density: .12, temperature: 1.5, warmup: 1200, radius: .5 }, Pal.kiln),
      clusters: pre('Condensing clusters', { density: .32, temperature: .15, warmup: 2600, links: true }, Pal.meadow),
      dense: pre('Dense collisions', { density: .8, temperature: 1.2, dt: .001, warmup: 1800 }, Pal.ember),
      large: pre('Large particle field', { n: 4096, density: .55, temperature: .7, warmup: 1000, view: 'identity' }, Pal.bioluminescent),
    },
    hints: {
      Material: 'Two-dimensional reduced units: particle mass, interaction diameter, energy scale and Boltzmann constant equal 1. The box grows with count at fixed density. This is not a three-dimensional equation of state.',
      Evolution: 'The same seed and fixed step count reproduce the trajectory. Larger counts cost more CPU time. A failed trajectory stops visibly at its last accepted state. The local stiffness guard does not prove global stability.',
      Picture: 'Circle size, palette and links only change the drawing. Links connect pairs closer than 1.6 diameters and do not represent chemical bonds. The periodic box repeats at every edge.',
    },
    closedGroups: ['Evolution', 'Picture'],
    surprise(rng) { return { n: rng.pick([256, 1024, 4096]), density: rng.range(.25, .8), temperature: rng.range(.1, 1.3), warmup: 1600, links: rng() < .4 }; },
    sanitize(s) {
      if (![256, 1024, 4096, 16384].includes(s.n)) s.n = 1024;
      s.density = U.clamp(Number(s.density) || .55, .1, .85);
      s.temperature = U.clamp(Number(s.temperature) || .7, .05, 2);
      s.dt = U.clamp(Number(s.dt) || .002, .0005, .004);
      s.warmup = U.clamp(Math.round(Number(s.warmup) || 0), 0, 6000);
      s.speed = U.clamp(Math.round(Number(s.speed) || 4), 1, 12);
    },
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d');
      let sim = null, raf = 0, timer = 0, paused = false, remaining = 0, pendingLive = 0;
      function stop() { cancelAnimationFrame(raf); clearTimeout(timer); raf = timer = 0; }
      function status() {
        if (!sim) return;
        const halt = sim.halted ? '<span>Stopped: <b>' + U.escapeHtml(sim.halted) + '</b></span>' : '';
        // Energy change since the start over the initial energy scale: the integration error of a
        // deterministic velocity Verlet run from a seeded start, not a sampled quantity.
        host.setStatus('<span>step <b>' + sim.step.toLocaleString() + '</b> · particles <b>' + sim.n.toLocaleString() + '</b>' +
          (remaining && !sim.halted ? ' · preparing' : '') + '</span><span>T <b>' + sim.temperature.toFixed(4) + '</b> · E/N <b>' +
          ((sim.kinetic + sim.potential) / sim.n).toFixed(5) + '</b></span>' +
          U.stats.compare({ label: 'ΔE/scale', measured: sim.drift, expected: 0, reference: 'energy conservation', basis: 'deterministic' }) + halt);
      }
      // Render the current coordinates directly at the target resolution. A
      // non-square export letterboxes the same physical square rather than
      // stretching it or changing the simulation domain.
      function marks(w, h, circle, line) {
        const s = host.getState(), side = Math.min(w, h), scale = side / sim.L;
        const ox = (w - side) / 2, oy = (h - side) / 2, radius = s.radius * scale;
        const colors = s.palette, last = colors.length - 1;
        if (s.links) sim.eachPair((i, j, dx, dy, r2) => {
          if (r2 >= 2.56) return;
          // Duplicate wrapped segments and clip them at the physical box edge.
          for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
            const x = sim.x[i] + a * sim.L, y = sim.y[i] + b * sim.L;
            if (Math.max(x, x - dx) < 0 || Math.min(x, x - dx) > sim.L || Math.max(y, y - dy) < 0 || Math.min(y, y - dy) > sim.L) continue;
            line(ox + x * scale, oy + y * scale, ox + (x - dx) * scale, oy + (y - dy) * scale, colors[0], .026 * scale);
          }
        });
        for (let i = 0; i < sim.n; i++) {
          const speed = Math.hypot(sim.vx[i], sim.vy[i]);
          const t = s.view === 'identity' ? ((i * .618033988749895) % 1) : Math.min(1, speed / (3 * Math.sqrt(s.temperature)));
          const color = colors[Math.min(last, Math.floor(t * colors.length))];
          for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
            const x = (sim.x[i] + a * sim.L) * scale, y = (sim.y[i] + b * sim.L) * scale;
            if (x + radius < 0 || x - radius > side || y + radius < 0 || y - radius > side) continue;
            circle(ox + x, oy + y, radius, color);
          }
        }
      }
      function paint(context, w, h) {
        const s = host.getState(); context.fillStyle = s.bg; context.fillRect(0, 0, w, h);
        if (!sim) return;
        const side = Math.min(w, h); context.save(); context.beginPath();
        context.rect((w - side) / 2, (h - side) / 2, side, side); context.clip();
        marks(w, h, (x, y, r, color) => { context.fillStyle = color; context.beginPath(); context.arc(x, y, r, 0, U.TAU); context.fill(); },
          (x, y, xx, yy, color, width) => { context.strokeStyle = color; context.lineWidth = width; context.globalAlpha = .35; context.beginPath(); context.moveTo(x, y); context.lineTo(xx, yy); context.stroke(); context.globalAlpha = 1; });
        context.restore();
      }
      function draw() { paint(ctx, canvas.width, canvas.height); status(); }
      function warm() {
        timer = 0;
        if (paused || !sim) return;
        // Time limits only yield scheduling. They never change the number or
        // size of physical steps in the requested warmup.
        const end = performance.now() + 20;
        do { sim.advance(1); remaining--; } while (remaining > 0 && !sim.halted && performance.now() < end);
        draw();
        if (remaining > 0 && !sim.halted) timer = setTimeout(warm, 0);
        else start();
      }
      function frame() {
        raf = 0;
        if (paused || !sim || sim.halted || !host.isActive()) return;
        pendingLive = host.getState().speed; liveChunk();
      }
      function liveChunk() {
        timer = 0;
        if (paused || !sim || sim.halted || !host.isActive()) return;
        const end = performance.now() + 20;
        do { sim.advance(1); pendingLive--; } while (pendingLive > 0 && !sim.halted && performance.now() < end);
        draw(); start();
      }
      function start() {
        stop(); if (paused || !sim || sim.halted) return;
        if (remaining > 0) timer = setTimeout(warm, 0);
        else if (host.getState().running && !host.reducedMotion() && host.isActive()) {
          if (pendingLive > 0) timer = setTimeout(liveChunk, 0);
          else raf = requestAnimationFrame(frame);
        }
      }
      return {
        aspect() { return 1; },
        regenerate() { stop(); paused = false; pendingLive = 0; sim = makeSim(host.getState()); remaining = host.getState().warmup; draw(); start(); },
        repaint() { draw(); }, resize() { draw(); }, live() { start(); },
        pause() { paused = true; stop(); }, resume() { paused = false; start(); },
        async exportPNG(w, h) {
          const out = document.createElement('canvas'); out.width = w; out.height = h;
          paint(out.getContext('2d'), w, h); return U.toBlob(out);
        },
        exportSVG(w, h) {
          const s = host.getState(), side = Math.min(w, h), nodes = [];
          marks(w, h, (x, y, r, color) => nodes.push('<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + U.svgEsc(color) + '"/>'),
            (x, y, xx, yy, color, width) => nodes.push('<path d="M' + x + ',' + y + 'L' + xx + ',' + yy + '" stroke="' + U.svgEsc(color) + '" stroke-width="' + width + '" opacity=".35"/>'));
          return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
            '<rect width="100%" height="100%" fill="' + U.svgEsc(s.bg) + '"/><defs><clipPath id="box"><rect x="' + (w - side) / 2 + '" y="' + (h - side) / 2 + '" width="' + side + '" height="' + side + '"/></clipPath></defs><g clip-path="url(#box)">' + nodes.join('') + '</g></svg>';
        },
      };
    },
  });
})();
