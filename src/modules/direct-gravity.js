/* modules/direct-gravity.js */
/* Planar direct N-body gravity. Original implementation of published equations. */
(function () {
  'use strict';
  const U = Studio.util, Pal = Studio.PALETTES;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const range = (group, key, label, kind, min, max, step, fmt = String) =>
    ({ group, key, label, kind, type: 'range', min, max, step, fmt });
  function allocate(n) {
    const b = { n };
    for (const key of ['x', 'y', 'vx', 'vy', 'ax', 'ay', 'mass']) b[key] = new Float64Array(n);
    return b;
  }
  // Each unordered pair is evaluated once; opposite forces update both bodies.
  // Yield within long rows, so even the largest N never requires an entire row per task.
  function* forces(b, eps, batch = 2048) {
    b.ax.fill(0); b.ay.fill(0);
    let work = 0;
    for (let i = 0; i < b.n; i++) for (let j = i + 1; j < b.n; j++) {
      const dx = b.x[j] - b.x[i], dy = b.y[j] - b.y[i];
      const r2 = dx * dx + dy * dy + eps * eps;
      const inv = 1 / (r2 * Math.sqrt(r2));
      const fx = dx * inv, fy = dy * inv;
      b.ax[i] += b.mass[j] * fx; b.ay[i] += b.mass[j] * fy;
      b.ax[j] -= b.mass[i] * fx; b.ay[j] -= b.mass[i] * fy;
      if (++work === batch) { work = 0; yield; }
    }
  }
  function* verlet(b, eps, dt, batch = 2048) {
    for (let i = 0; i < b.n; i++) {
      b.vx[i] += 0.5 * dt * b.ax[i]; b.vy[i] += 0.5 * dt * b.ay[i];
      b.x[i] += dt * b.vx[i]; b.y[i] += dt * b.vy[i];
    }
    yield* forces(b, eps, batch);
    for (let i = 0; i < b.n; i++) {
      b.vx[i] += 0.5 * dt * b.ax[i]; b.vy[i] += 0.5 * dt * b.ay[i];
    }
  }
  // The softened pair potential has Hessian norm <= 1/eps^3. For total mass M,
  // sqrt(2 M/eps^3) bounds a conservative local relative-acceleration scale.
  // The 0.15 margin resolves that scale; it is NOT a global nonlinear accuracy proof.
  function timeStep(eps, totalMass, requested) {
    return Math.min(requested, 0.15 * Math.sqrt(eps * eps * eps / (2 * totalMass)));
  }
  function initial(s, rng) {
    const b = allocate(s.count), n = b.n;
    for (let i = 0; i < n; i++) {
      const a = rng() * 2 * Math.PI;
      const r = s.layout === 'ring' ? 0.72 + 0.08 * rng() : 0.12 + 0.82 * Math.sqrt(rng());
      const side = i < n / 2 ? -1 : 1;
      const scale = s.layout === 'collision' ? 0.42 : 1;
      b.x[i] = scale * r * Math.cos(a) + (s.layout === 'collision' ? side * 0.82 : 0);
      b.y[i] = scale * r * Math.sin(a);
      b.vx[i] = -s.spin * Math.sin(a) + s.heat * rng.gauss();
      b.vy[i] = s.spin * Math.cos(a) + s.heat * rng.gauss();
      if (s.layout === 'collision') { b.vx[i] -= 0.25 * side; b.vy[i] += 0.12 * side; }
      b.mass[i] = 1 / n;
    }
    for (const key of ['x', 'y', 'vx', 'vy']) {
      let mean = 0; for (let i = 0; i < n; i++) mean += b[key][i] / n;
      for (let i = 0; i < n; i++) b[key][i] -= mean;
    }
    return b;
  }
  const preset = (label, p, palette) => ({ label, p, palette });
  Studio.register({
    id: 'direct-gravity', name: 'Direct Gravity', tab: 'Direct Gravity', order: 66.4,
    subtitle: 'every pair attracts · Newton 1687 / Verlet 1967',
    equation: 'a_i = Σ(j≠i) m_j (r_j−r_i) / (|r_j−r_i|²+ε²)^(3/2), G=1; velocity Verlet',
    credit: 'Newton, Principia (1687); Verlet, Physical Review 159 (1967), 98. Plummer softening and the direct all-pairs kernel: Nyland, Harris and Prins, GPU Gems 3, chapter 31 (2007). This implementation runs the pair kernel on the CPU.',
    blurb: 'Every point attracts every other point, with no tree approximation or hidden particle cap. Positions lie in a plane but use the three-dimensional inverse-distance potential. Softening replaces singular encounters with a smooth force; it changes the model. Disk and ring seeds are prepared configurations, not claimed equilibrium galaxies. Heavy particle counts increase work quadratically. Each run stops at its step budget, and pause remains available while pairs are being computed.',
    schema: [
      { group: 'Bodies', key: 'layout', label: 'Seed shape', type: 'seg', kind: 'geom', options: [['disk', 'Disk'], ['ring', 'Ring'], ['collision', 'Two clusters']] },
      range('Bodies', 'count', 'Particles (CPU)', 'geom', 32, 16384, 32),
      range('Bodies', 'spin', 'Initial rotation', 'geom', 0, 1.5, 0.05, v => v.toFixed(2)),
      range('Bodies', 'heat', 'Velocity scatter', 'geom', 0, 0.6, 0.02, v => v.toFixed(2)),
      range('Dynamics', 'softening', 'Softening length', 'geom', 0.03, 0.3, 0.01, v => v.toFixed(2)),
      range('Dynamics', 'dt', 'Requested time step', 'geom', 0.0001, 0.01, 0.0001, v => v.toFixed(4)),
      range('Dynamics', 'steps', 'Finite step budget', 'geom', 1, 20000, 1),
      { group: 'Dynamics', key: 'running', label: 'Run / pause', type: 'toggle', kind: 'live' },
      { group: 'Picture', key: 'aspect', label: 'Sheet', type: 'seg', kind: 'geom', options: Object.keys(ASPECTS).map(k => [k, k]) },
      range('Picture', 'extent', 'View half-width', 'paint', 0.8, 6, 0.1, v => v.toFixed(1)),
      range('Picture', 'radius', 'Point size', 'paint', 0.5, 5, 0.1, v => v.toFixed(1))
    ],
    defaults: { layout: 'disk', count: 256, spin: 0.62, heat: 0.08, softening: 0.12, dt: 0.004, steps: 160, running: true, aspect: '1:1', extent: 1.6, radius: 2.4 },
    presets: {
      disk: preset('Rotating disk', { layout: 'disk', count: 256, spin: 0.62, heat: 0.08, steps: 160 }, Pal.ember),
      ring: preset('Thin ring', { layout: 'ring', count: 256, spin: 0.5, heat: 0.02, steps: 160 }, Pal.glacier),
      collision: preset('Cluster encounter', { layout: 'collision', count: 384, spin: 0.24, heat: 0.04, steps: 220, extent: 2 }, Pal.kiln),
      collapse: preset('Cold collapse', { layout: 'disk', count: 256, spin: 0, heat: 0.02, steps: 240 }, Pal.thermal),
      hot: preset('Dispersing cloud', { layout: 'disk', count: 256, spin: 0.1, heat: 0.6, steps: 260, extent: 2 }, Pal.harbor),
      extreme: preset('Extreme CPU: 16,384', { count: 16384, layout: 'collision', steps: 20, running: false, extent: 2, radius: 0.6 }, Pal.nightshade)
    },
    hints: { Bodies: '16,384 bodies means 134,209,536 unique pairs per force evaluation. Extreme preset starts paused. No particles are silently removed.', Dynamics: 'Actual dt is limited by the softened force curvature. This is a resolution margin, not a guarantee of accuracy for every encounter. A new run includes one initial force evaluation.', Picture: 'Points are the current completed step. View cropping does not remove particles from the calculation.' },
    closedGroups: ['Picture'], palette: true, defaultPalette: 'ember',
    surprise(rng) { return { count: 256, layout: rng.pick(['disk', 'ring', 'collision']), spin: rng.range(0.15, 0.8), heat: rng.range(0.02, 0.2), steps: 160, running: true }; },
    sanitize(s) { s.count = Math.max(32, Math.min(16384, Math.round(s.count / 32) * 32)); },
    create(host) {
      let b, shownX, shownY, job, timer = null, active = true, done = 0, initialized = false, dt = 0, error = '', sliceMax = 0, statusAt = 0;
      function copyPlate() { shownX.set(b.x); shownY.set(b.y); }
      function status() {
        const s = host.getState(), pairs = b.n * (b.n - 1) / 2;
        const phase = error || (done >= s.steps ? 'finished' : (!active || !s.running ? 'paused' : initialized ? 'computing' : 'initial forces'));
        host.setStatus('<span>CPU <b>' + b.n.toLocaleString('en-US') + ' bodies</b></span><span>step <b>' + done + '/' + s.steps + '</b> · ' + phase + '</span><span>pairs/force <b>' + pairs.toLocaleString('en-US') + '</b> · arrays ' + (9 * b.n * 8 / 1048576).toFixed(2) + ' MiB</span><span>dt <b>' + dt.toPrecision(3) + '</b> · T ' + (done * dt).toFixed(4) + '</span>');
      }
      function paint(canvas) {
        const s = host.getState(), ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
        ctx.fillStyle = s.bg; ctx.fillRect(0, 0, w, h);
        if (!shownX) return;
        const scale = w / (2 * s.extent), r = s.radius * Math.min(w, h) / 650;
        for (let k = 0; k < s.palette.length; k++) {
          ctx.fillStyle = s.palette[k]; ctx.beginPath();
          let marks = 0;
          for (let i = k; i < b.n; i += s.palette.length) {
            const x = w / 2 + shownX[i] * scale, y = h / 2 - shownY[i] * scale;
            if (x < -r || x > w + r || y < -r || y > h + r) continue;
            ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
            if (++marks === 128) { ctx.fill(); ctx.beginPath(); marks = 0; }
          }
          ctx.fill();
        }
      }
      function stop() { if (timer !== null) clearTimeout(timer); timer = null; }
      function schedule() {
        const s = host.getState();
        if (timer === null && active && host.isActive() && s.running && !error && done < s.steps) timer = setTimeout(chunk, host.computeBudget ? host.computeBudget().cpuDelayMs : 0);
      }
      function chunk() {
        timer = null;
        if (!active || !host.isActive() || !host.getState().running || error) return;
        const start = performance.now(), s = host.getState();
        let advanced = false;
        try {
          do {
            if (!job) job = initialized ? verlet(b, s.softening, dt) : forces(b, s.softening);
            if (job.next().done) {
              job = null;
              if (initialized) { done++; copyPlate(); advanced = true; } else initialized = true;
              if (done >= s.steps) break;
            }
          } while (performance.now() - start < (host.computeBudget ? host.computeBudget().cpuSliceMs : 8));
          for (let i = 0; i < b.n; i++) if (!Number.isFinite(shownX[i]) || !Number.isFinite(shownY[i])) throw new Error('Non-finite state; reset with a smaller dt');
        } catch (e) { error = 'Stopped: ' + U.escapeHtml(e.message); job = null; }
        // Reduced-motion users receive the final plate without intermediate animation.
        if ((advanced && (!host.reducedMotion() || done >= s.steps)) || error) paint(host.canvas);
        if (performance.now() - statusAt > 100 || done >= s.steps || error) { status(); statusAt = performance.now(); }
        sliceMax = Math.max(sliceMax, performance.now() - start); schedule();
      }
      function regenerate() {
        stop(); job = null; done = 0; initialized = false; error = ''; sliceMax = 0;
        const s = host.getState(); b = initial(s, U.makeRng(s.seed + '/direct-gravity'));
        shownX = new Float64Array(b.n); shownY = new Float64Array(b.n); copyPlate();
        dt = timeStep(s.softening, 1, s.dt); paint(host.canvas); status(); schedule();
      }
      return {
        aspect: s => ASPECTS[s.aspect] || 1, regenerate,
        repaint() { paint(host.canvas); }, resize() { paint(host.canvas); },
        pause() { active = false; stop(); if (b) status(); },
        resume() { active = true; if (b) { status(); schedule(); } },
        live() { stop(); status(); schedule(); },
        // Test observables expose a completed-step snapshot, never a half-computed step.
        inspect() { return { step: done, dt, count: b.n, sliceMax, x: Array.from(shownX), y: Array.from(shownY) }; },
        async exportPNG(w, h) {
          const out = document.createElement('canvas'); out.width = w; out.height = h; paint(out); return U.toBlob(out);
        },
        exportSVG(w, h) {
          const s = host.getState(), scale = w / (2 * s.extent), r = s.radius * Math.min(w, h) / 650;
          let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect width="100%" height="100%" fill="' + U.svgEsc(s.bg) + '"/>';
          for (let i = 0; i < b.n; i++) svg += '<circle cx="' + (w / 2 + shownX[i] * scale) + '" cy="' + (h / 2 - shownY[i] * scale) + '" r="' + r + '" fill="' + U.svgEsc(s.palette[i % s.palette.length]) + '"/>';
          return svg + '</svg>';
        }
      };
    }
  });
})();
