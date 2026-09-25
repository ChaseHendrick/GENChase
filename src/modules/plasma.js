/* modules/plasma.js */
/* Original standard electrostatic CIC implementation, not a GEMPIC discretization. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, Pal = Studio.PALETTES, L = 2 * Math.PI;
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) => Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const pre = (label, p, palette) => ({ label, p, palette });
  const DEFAULTS = { n: 16384, grid: 256, thermal: .08, beam: .65, amplitude: .06, mode: 1, dt: .025, warmup: 500, speed: 2, running: true, vspan: 1.6, exposure: 1.2, view: 'density', seed: 'electron-clouds' };

  // Charge lives at (j+1/2)dx. A macroparticle has charge -L/n; ions have density +1.
  function deposit(x, grid, rho) {
    const factor = grid / x.length; rho.fill(1);
    for (let i = 0; i < x.length; i++) {
      const u = x[i] * grid / L - .5, base = Math.floor(u), fraction = u - base;
      const j = (base + grid) % grid;
      rho[j] -= factor * (1 - fraction); rho[(j + 1) % grid] -= factor * fraction;
    }
  }
  // Equivalent to periodic finite-difference Poisson, fixed by zero mean electric field.
  // It solves (edge[j+1]-edge[j])/dx = rho[j]-mean(rho) without an iterative tolerance.
  function solveField(rho, edge, center) {
    const grid = rho.length, dx = L / grid;
    let meanRho = 0; for (let j = 0; j < grid; j++) meanRho += rho[j]; meanRho /= grid;
    edge[0] = 0; let sum = 0;
    for (let j = 1; j < grid; j++) { edge[j] = edge[j - 1] + dx * (rho[j - 1] - meanRho); sum += edge[j]; }
    const meanE = sum / grid;
    for (let j = 0; j < grid; j++) edge[j] -= meanE;
    for (let j = 0; j < grid; j++) center[j] = .5 * (edge[j] + edge[(j + 1) % grid]);
    return meanRho * L;
  }
  // Same linear weights as deposition. Center averaging gives standard momentum-conserving CIC.
  function gather(x, center) {
    const grid = center.length, u = x * grid / L - .5, base = Math.floor(u), fraction = u - base;
    const j = (base + grid) % grid;
    return center[j] * (1 - fraction) + center[(j + 1) % grid] * fraction;
  }
  function makeSim(s) {
    const n = s.n, grid = s.grid, dx = L / grid;
    const x = new Float64Array(n), v = new Float64Array(n), oldX = new Float64Array(n), oldV = new Float64Array(n);
    const rho = new Float64Array(grid), edge = new Float64Array(grid), field = new Float64Array(grid);
    const sim = { n, grid, L, dx, dt: s.dt, x, v, rho, edge, field, step: 0, time: 0, halted: '', charge: 0, gauss: 0, kinetic: 0, electric: 0, momentum: 0, energy0: 0, drift: 0, peakDrift: 0 };
    function solve() { deposit(x, grid, rho); sim.charge = solveField(rho, edge, field); }
    function measure() {
      let kinetic = 0, momentum = 0, electric = 0, gauss = 0;
      for (let i = 0; i < n; i++) { kinetic += .5 * v[i] * v[i]; momentum += v[i]; }
      for (let j = 0; j < grid; j++) {
        electric += .5 * edge[j] * edge[j] * dx;
        gauss = Math.max(gauss, Math.abs((edge[(j + 1) % grid] - edge[j]) / dx - (rho[j] - sim.charge / L)));
      }
      sim.kinetic = kinetic * L / n; sim.electric = electric; sim.momentum = momentum * L / n; sim.gauss = gauss;
      sim.drift = (sim.kinetic + sim.electric - sim.energy0) / Math.max(sim.energy0, 1e-10 * L);
      return Number.isFinite(sim.kinetic + sim.electric + sim.momentum + sim.gauss + sim.charge);
    }
    function reference() {
      solve(); measure(); sim.energy0 = sim.kinetic + sim.electric;
      sim.drift = 0; sim.peakDrift = 0; sim.step = 0; sim.time = 0; sim.halted = '';
    }
    function advance(count) {
      let accepted = 0;
      for (let k = 0; k < count && !sim.halted; k++) {
        oldX.set(x); oldV.set(v); const dt = sim.dt;
        // Integer-time velocity form of leapfrog (kick, drift, recompute, kick).
        for (let i = 0; i < n; i++) {
          v[i] -= .5 * dt * gather(x[i], field);
          const next = x[i] + dt * v[i]; x[i] = next - L * Math.floor(next / L);
        }
        solve();
        for (let i = 0; i < n; i++) v[i] -= .5 * dt * gather(x[i], field);
        const finite = measure();
        if (!finite || Math.abs(sim.charge) > 1e-8 || Math.abs(sim.drift) > .1) {
          const reason = !finite ? 'Nonfinite state' : Math.abs(sim.charge) > 1e-8 ? 'Charge balance failed' : 'Energy drift exceeded 10%';
          x.set(oldX); v.set(oldV); solve(); measure(); sim.halted = reason; break;
        }
        sim.step++; sim.time += dt; accepted++; sim.peakDrift = Math.max(sim.peakDrift, Math.abs(sim.drift));
      }
      return accepted;
    }
    const rng = U.makeRng(s.seed + '/plasma'), phase = rng.range(-Math.PI, Math.PI);
    let meanV = 0;
    for (let i = 0; i < n; i++) {
      const base = (i + .5) * L / n, displaced = base + s.amplitude / s.mode * Math.sin(s.mode * base + phase);
      x[i] = displaced - L * Math.floor(displaced / L);
      v[i] = (i % 2 ? s.beam : -s.beam) + s.thermal * rng.gauss(); meanV += v[i];
    }
    meanV /= n; for (let i = 0; i < n; i++) v[i] -= meanV;
    Object.assign(sim, { solve, measure, reference, advance }); reference(); return sim;
  }

  const RENDER_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_hist; uniform vec2 u_res, u_output;
uniform float u_scale, u_exposure; uniform int u_view;
uniform vec3 u_bg;
${G.GLSL.bicubic}
${G.GLSL.ramp}
void main(){
  float side=min(u_output.x,u_output.y); vec2 uv=(v_uv*u_output-0.5*(u_output-vec2(side)))/side;
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0)))){outColor=vec4(u_bg,1.0);return;}
  float q=max(0.0,texCR(u_hist,uv,u_res));
  float z=clamp(log(1.0+u_exposure*q/max(u_scale,1e-9))/log(4.0),0.0,1.0);
  vec3 color=u_view==1?mix(u_bg,ramp(uv.y),z):mix(u_bg,ramp(z),smoothstep(0.0,0.12,z));
  outColor=vec4(color,1.0);
}`;
  function create(host) {
    const gl = G.createGL(host.canvas);
    if (!gl || !gl.floatExt) {
      const noop = () => {}; host.fault('Plasma phase-space rendering needs WebGL2 float buffers.');
      return { regenerate: noop, resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(Error('WebGL2 float rendering unavailable')) };
    }
    const display = new G.Pass(gl, RENDER_FS), binsY = 256;
    let sim = null, hist = null, density = null, pixels = null, scale = 1, clipped = 0, ramp = null, rampKey = '';
    let paused = false, remaining = 0, pendingLive = 0, timer = 0, raf = 0;
    function stop() { cancelAnimationFrame(raf); clearTimeout(timer); raf = timer = 0; }
    function histogram() {
      const s = host.getState(), W = sim.grid, H = binsY;
      density.fill(0); clipped = 0;
      for (let i = 0; i < sim.n; i++) {
        const u = sim.x[i] / L * W - .5, a = Math.floor(u), fx = u - a;
        const vy = (sim.v[i] / s.vspan + 1) * .5 * (H - 1);
        if (vy < 0 || vy > H - 1) { clipped++; continue; }
        const b = Math.floor(vy), fy = vy - b;
        for (let oy = 0; oy <= 1; oy++) for (let ox = 0; ox <= 1; ox++) {
          const y = Math.min(H - 1, b + oy), x = (a + ox + W) % W;
          density[y * W + x] += (ox ? fx : 1 - fx) * (oy ? fy : 1 - fy);
        }
      }
      const positive = [];
      for (let i = 0; i < density.length; i++) { pixels[i * 4] = density[i]; if (density[i] > 0) positive.push(density[i]); }
      positive.sort((a, b) => a - b); scale = positive.length ? positive[Math.floor(positive.length * .9)] : 1;
      hist.upload(pixels);
    }
    function render(target) {
      const s = host.getState(), key = s.palette.join(',') + s.bg;
      if (key !== rampKey) { if (ramp) ramp.dispose(); ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key; }
      const W = target ? target.w : host.canvas.width, H = target ? target.h : host.canvas.height;
      display.draw(target || null, { u_hist: hist, u_res: [sim.grid, binsY], u_output: [W, H], u_scale: scale, u_exposure: s.exposure, u_view: { int: s.view === 'velocity' ? 1 : 0 }, u_bg: U.hexToRgb(s.bg).map(v => v / 255), u_ramp: ramp });
    }
    function status() {
      const s = host.getState(), debye = s.thermal / sim.dx;
      host.setStatus('<span>step <b>' + sim.step.toLocaleString() + '</b> · t <b>' + sim.time.toFixed(2) + '</b>' + (remaining ? ' · preparing' : '') + '</span>' +
        '<span>particles <b>' + sim.n.toLocaleString() + '</b> · grid <b>' + sim.grid + '</b></span>' +
        U.stats.compare({ label: 'ΔE/E₀', measured: sim.drift, expected: 0, reference: 'energy of the initial state', basis: 'deterministic' }) +
        '<span>' + (clipped ? (100 * clipped / sim.n).toFixed(1) + '% outside view' : 'full velocity window') + '</span>' +
        (s.thermal > 0 && debye < 1 ? '<span>Debye length <b>under one cell</b></span>' : '') +
        (sim.halted ? '<span>Stopped: <b>' + U.escapeHtml(sim.halted) + '</b></span>' : ''));
    }
    function draw() { if (sim) { histogram(); render(); status(); } }
    function warm() {
      timer = 0; if (paused || !sim || sim.halted) return;
      const end = performance.now() + 20;
      do { const count = sim.advance(1); remaining -= count; } while (remaining > 0 && !sim.halted && performance.now() < end);
      draw(); start();
    }
    function liveChunk() {
      timer = 0; if (paused || !sim || sim.halted || !host.isActive()) return;
      const end = performance.now() + 20;
      do { pendingLive -= sim.advance(1); } while (pendingLive > 0 && !sim.halted && performance.now() < end);
      draw(); start();
    }
    function frame() { raf = 0; pendingLive = host.getState().speed; liveChunk(); }
    function start() {
      stop(); if (paused || !sim || sim.halted) return;
      if (remaining > 0) timer = setTimeout(warm, 0);
      else if (host.getState().running && !host.reducedMotion() && host.isActive()) {
        if (pendingLive > 0) timer = setTimeout(liveChunk, 0); else raf = requestAnimationFrame(frame);
      }
    }
    return {
      aspect() { return 1; }, fieldCells() { return sim ? [sim.grid, binsY] : null; },
      regenerate() {
        stop(); paused = false; pendingLive = 0; const s = host.getState(); sim = makeSim(s); remaining = s.warmup;
        if (hist) hist.dispose(); hist = new G.Target(gl, sim.grid, binsY, { type: 'rgba32f', filter: 'nearest', wrap: 'clamp' });
        density = new Float32Array(sim.grid * binsY); pixels = new Float32Array(sim.grid * binsY * 4); draw(); start();
      },
      repaint() { draw(); }, resize() { if (sim) render(); }, live() { start(); },
      pause() { paused = true; stop(); }, resume() { paused = false; start(); },
      async exportPNG(w, h) {
        if (!sim) throw Error('No plasma state');
        if (Math.max(w, h) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw Error('Print exceeds GPU texture limit');
        const target = new G.Target(gl, w, h, { type: 'rgba8' }), rgba = new Uint8Array(w * h * 4);
        try { render(target); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba); }
        finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); target.dispose(); }
        const out = document.createElement('canvas'); out.width = w; out.height = h;
        const cx = out.getContext('2d'), image = cx.createImageData(w, h);
        for (let y = 0; y < h; y++) image.data.set(rgba.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        cx.putImageData(image, 0, 0); return U.toBlob(out);
      },
    };
  }

  Studio.register({
    id: 'plasma', name: 'Kinetic Plasma', tab: 'Plasma', subtitle: 'electrons in phase space · 1960s', order: 53.7,
    equation: '∂f/∂t + v ∂f/∂x − E ∂f/∂v = 0; ∂E/∂x = 1 − ∫f dv; x ∈ [0, 2π), periodic',
    credit: 'Standard cloud-in-cell electrostatic plasma model. C. K. Birdsall and A. B. Langdon, Plasma Physics via Computer Simulation (1985). CIC field centering and conservation limitations: J. U. Brackbill, arXiv:1510.08741 (2015), sections 3.1–3.5. Original implementation; not the GEMPIC geometric scheme.',
    blurb: 'Each moving cloud represents electrons in a one-dimensional periodic plasma with a fixed positive background. Position runs horizontally and velocity vertically. Color shows the density of particles in this phase-space window. Two counter-moving populations can fold into islands as their electric field traps particles. The same deposited charge creates the force that moves the particles. This is collisionless electrostatic motion, with no magnetic field or ion motion. A finite particle sample adds noise, and a finite grid can heat the plasma numerically. Printing enlarges the measured histogram; it does not add particles or resolve more physics.',
    palette: true, defaultPalette: 'thermal', headline: 'n', headlineLabel: 'particles', defaults: { ...DEFAULTS },
    schema: [
      { group: 'Plasma', key: 'n', label: 'Particles', type: 'seg', kind: 'geom', options: [[4096, '4,096'], [16384, '16,384'], [65536, '65,536'], [262144, '262,144 · heavy']] },
      { group: 'Plasma', key: 'grid', label: 'Spatial cells', type: 'seg', kind: 'geom', options: [[64, '64'], [128, '128'], [256, '256'], [512, '512'], [1024, '1,024']] },
      RANGE('Plasma', 'thermal', 'Velocity spread', 'geom', 0, .8, .01, v => v.toFixed(2)),
      RANGE('Plasma', 'beam', 'Opposite beam speeds', 'geom', 0, 2, .05, v => v.toFixed(2)),
      RANGE('Plasma', 'amplitude', 'Position perturbation', 'geom', .001, .4, .001, v => v.toFixed(3)),
      RANGE('Plasma', 'mode', 'Spatial mode', 'geom', 1, 8, 1, String),
      RANGE('Evolution', 'dt', 'Time step', 'geom', .005, .08, .005, v => v.toFixed(3)),
      RANGE('Evolution', 'warmup', 'Initial steps', 'geom', 0, 2000, 20, String),
      RANGE('Evolution', 'speed', 'Steps per frame', 'live', 1, 8, 1, String),
      { group: 'Evolution', key: 'running', label: 'Keep evolving', type: 'toggle', kind: 'live' },
      RANGE('Picture', 'vspan', 'Velocity half-window', 'paint', .2, 4, .05, v => v.toFixed(2)),
      RANGE('Picture', 'exposure', 'Exposure', 'paint', .2, 4, .1, v => v.toFixed(1)),
      { group: 'Picture', key: 'view', label: 'Color', type: 'seg', kind: 'paint', options: [['density', 'Density'], ['velocity', 'Velocity']] },
    ],
    presets: {
      streams: pre('Two moving populations', { beam: .65, thermal: .08, amplitude: .06, warmup: 500, vspan: 1.6 }, Pal.thermal),
      oscillation: pre('Cold plasma oscillation', { beam: 0, thermal: 0, amplitude: .15, warmup: 60, vspan: .25, view: 'velocity' }, Pal.glacier),
      warm: pre('Warm velocity mixing', { beam: 0, thermal: .4, amplitude: .12, warmup: 200, vspan: 1.7 }, Pal.kiln),
      twins: pre('Two spatial islands', { beam: .35, thermal: .04, mode: 2, amplitude: .1, warmup: 640, vspan: 1, view: 'velocity' }, Pal.bioluminescent),
      broad: pre('Broad overlapping beams', { beam: .8, thermal: .35, amplitude: .2, warmup: 320, vspan: 2.5 }, Pal.meadow),
      dense: pre('More particles, less sampling noise', { n: 65536, grid: 512, beam: .65, thermal: .08, amplitude: .06, warmup: 500 }, Pal.ember),
    },
    hints: {
      Plasma: 'Normalized electron mass, charge magnitude, background density and permittivity equal 1, so the cold plasma frequency is 1. Equal linear charge/force weights conserve momentum to roundoff; energy is approximate. The 262,144-particle setting uses 16 times the default particle work and can prepare slowly.',
      Evolution: 'The step is far below the cold-oscillator leapfrog bound Δt < 2, but this alone does not exclude grid instability. Resolve the thermal Debye length with the spatial grid, refine the step and increase particles when measuring an effect. A 10% energy error stops visibly at the last accepted state.',
      Picture: 'A 256-row velocity histogram is smoothed for display. The velocity window only crops the picture, and the status reports excluded particles. Density and velocity colors are render choices; no measured Landau damping rate or universal instability threshold is claimed.',
    },
    closedGroups: ['Evolution', 'Picture'],
    surprise(rng) { return { beam: rng.range(.35, .85), thermal: rng.range(.04, .15), amplitude: rng.range(.02, .15), mode: rng.pick([1, 2]), warmup: 500, vspan: 1.7, n: 16384, grid: 256 }; },
    sanitize(s) {
      const number = (v, fallback, lo, hi) => U.clamp(Number.isFinite(Number(v)) ? Number(v) : fallback, lo, hi);
      s.n = [4096, 16384, 65536, 262144].includes(Number(s.n)) ? Number(s.n) : DEFAULTS.n;
      s.grid = [64, 128, 256, 512, 1024].includes(Number(s.grid)) ? Number(s.grid) : DEFAULTS.grid;
      s.thermal = number(s.thermal, .08, 0, .8); s.beam = number(s.beam, .65, 0, 2); s.amplitude = number(s.amplitude, .06, .001, .4);
      s.mode = Math.round(number(s.mode, 1, 1, 8)); s.dt = number(s.dt, .025, .005, .08);
      s.warmup = Math.round(number(s.warmup, 500, 0, 2000)); s.speed = Math.round(number(s.speed, 2, 1, 8));
      s.vspan = number(s.vspan, 1.6, .2, 4); s.exposure = number(s.exposure, 1.2, .2, 4);
    }, create,
  });
})();
