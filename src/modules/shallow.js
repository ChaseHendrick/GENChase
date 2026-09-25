/* modules/shallow.js */
/* Original implementation of established wet, flat-bed shallow-water dynamics. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, Pal = Studio.PALETTES;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': .8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const DEFAULTS = { grid: 128, aspect: '1:1', boundary: 'periodic', pattern: 'splashes', amplitude: .8,
    width: .09, courant: .45, warmup: 180, steps: 2, running: false, view: 'depth', exposure: 1 };
  const range = (group, key, label, kind, min, max, step, fmt) => ({ group, key, label, type: 'range', kind, min, max, step, fmt });
  const pre = (label, p, palette) => ({ label, p: { ...DEFAULTS, ...p }, palette });

  // Conservative Rusanov flux, g=1. axis=0 uses x-normal momentum;
  // axis=1 uses y-normal momentum. No wet/dry state replacement or clipping.
  function flux(out, axis, hl, xl, yl, hr, xr, yr) {
    const ml = axis ? yl : xl, mr = axis ? yr : xr;
    const ul = ml / hl, ur = mr / hr;
    const a = Math.max(Math.abs(ul) + Math.sqrt(hl), Math.abs(ur) + Math.sqrt(hr));
    out[0] = .5 * (ml + mr - a * (hr - hl));
    out[1] = .5 * (xl * ul + xr * ur + (axis ? 0 : .5 * (hl * hl + hr * hr)) - a * (xr - xl));
    out[2] = .5 * (yl * ul + yr * ur + (axis ? .5 * (hl * hl + hr * hr) : 0) - a * (yr - yl));
  }

  function makeSim(s) {
    const nx = s.grid, ny = Math.max(4, Math.round(nx * (ASPECTS[s.aspect] || 1))), dx = 1 / nx, size = nx * ny;
    const h = new Float64Array(size), mx = new Float64Array(size), my = new Float64Array(size);
    const nh = new Float64Array(size), nmx = new Float64Array(size), nmy = new Float64Array(size), f = new Float64Array(3);
    const sim = { nx, ny, dx, h, mx, my, time: 0, step: 0, lastDt: 0, halted: '', mass: 0, mass0: 0,
      momentumX: 0, momentumY: 0, energy: 0, minDepth: 0, maxDepth: 0, massDrift: 0, maxRateX: 0, maxRateY: 0 };
    function measure() {
      let volume = 0, px = 0, py = 0, energy = 0, lo = Infinity, hi = -Infinity, ax = 0, ay = 0;
      for (let i = 0; i < size; i++) {
        const c = h[i];
        if (!(c > 1e-8) || !Number.isFinite(c + mx[i] + my[i])) throw Error('Positive finite depth required; this model does not support dry beds');
        volume += c; px += mx[i]; py += my[i]; lo = Math.min(lo, c); hi = Math.max(hi, c);
        energy += .5 * ((mx[i] ** 2 + my[i] ** 2) / c + c * c);
        ax = Math.max(ax, Math.abs(mx[i] / c) + Math.sqrt(c)); ay = Math.max(ay, Math.abs(my[i] / c) + Math.sqrt(c));
      }
      sim.mass = volume * dx * dx; sim.momentumX = px * dx * dx; sim.momentumY = py * dx * dx;
      sim.energy = energy * dx * dx; sim.minDepth = lo; sim.maxDepth = hi; sim.maxRateX = ax; sim.maxRateY = ay;
      sim.massDrift = sim.mass0 ? (sim.mass - sim.mass0) / sim.mass0 : 0;
    }
    function reference() { measure(); sim.mass0 = sim.mass; sim.massDrift = 0; }
    function step(finalTime = Infinity) {
      if (sim.halted || finalTime <= sim.time) return;
      try {
        measure();
        if (!(s.courant > 0 && s.courant <= .8)) throw Error('CFL fraction must be greater than zero and no more than 0.8');
        // The coefficient of h_i in the 2D first-order update is nonnegative
        // when dt*(max ax/dx + max ay/dx)<=1. Neighbor coefficients are
        // nonnegative because every face speed bounds both normal velocities.
        const dt = Math.min(s.courant * dx / (sim.maxRateX + sim.maxRateY), finalTime - sim.time), factor = dt / dx;
        nh.set(h); nmx.set(mx); nmy.set(my);
        function face(i, j, axis) {
          flux(f, axis, h[i], mx[i], my[i], h[j], mx[j], my[j]);
          const dh = factor * f[0], px = factor * f[1], py = factor * f[2];
          nh[i] -= dh; nh[j] += dh; nmx[i] -= px; nmx[j] += px; nmy[i] -= py; nmy[j] += py;
        }
        for (let y = 0; y < ny; y++) for (let x = 0; x < nx - 1; x++) face(y * nx + x, y * nx + x + 1, 0);
        for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx; x++) face(y * nx + x, (y + 1) * nx + x, 1);
        if (s.boundary === 'periodic') {
          for (let y = 0; y < ny; y++) face(y * nx + nx - 1, y * nx, 0);
          for (let x = 0; x < nx; x++) face((ny - 1) * nx + x, x, 1);
        } else if (s.boundary === 'walls') {
          function wall(i, axis, right) {
            const gx = axis ? mx[i] : -mx[i], gy = axis ? -my[i] : my[i];
            if (right) flux(f, axis, h[i], mx[i], my[i], h[i], gx, gy);
            else flux(f, axis, h[i], gx, gy, h[i], mx[i], my[i]);
            const sign = right ? -1 : 1;
            nh[i] += sign * factor * f[0]; nmx[i] += sign * factor * f[1]; nmy[i] += sign * factor * f[2];
          }
          for (let y = 0; y < ny; y++) { wall(y * nx, 0, false); wall(y * nx + nx - 1, 0, true); }
          for (let x = 0; x < nx; x++) { wall(x, 1, false); wall((ny - 1) * nx + x, 1, true); }
        } else throw Error('Unsupported boundary');
        // Validate the full proposed step before touching the accepted state.
        for (let i = 0; i < size; i++) if (!(nh[i] > 1e-8) || !Number.isFinite(nh[i] + nmx[i] + nmy[i]))
          throw Error('Step approached a dry or nonfinite state; reduce the initial disturbance');
        h.set(nh); mx.set(nmx); my.set(nmy); sim.time += dt; sim.lastDt = dt; sim.step++; measure();
      } catch (error) { sim.halted = error.message; }
    }
    function advance(count, finalTime = Infinity) { for (let i = 0; i < count && !sim.halted && sim.time < finalTime; i++) step(finalTime); }
    const rng = U.makeRng(s.seed + '/shallow'), phase = rng.range(0, U.TAU), height = ny / nx;
    const centers = Array.from({ length: 6 }, () => [rng.range(.15, .85), rng.range(.15, .85) * height]);
    const delta = (v, L) => s.boundary === 'periodic' ? v - L * Math.round(v / L) : v;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = y * nx + x, xx = (x + .5) * dx, yy = (y + .5) * dx;
      const rx = delta(xx - .5, 1), ry = delta(yy - height / 2, height), r = Math.hypot(rx, ry);
      let shape = 0;
      if (s.pattern === 'drop') shape = Math.exp(-r * r / (2 * s.width ** 2));
      else if (s.pattern === 'ring') shape = Math.exp(-(((r - .23 * Math.min(1, height)) / s.width) ** 2) / 2);
      else if (s.pattern === 'dam') shape = xx < .5 + .035 * Math.sin(4 * Math.PI * yy / height + phase) ? 1 : 0;
      else if (s.pattern === 'standing') shape = .45 * Math.cos(4 * Math.PI * xx + phase) * Math.cos(4 * Math.PI * yy / height);
      else for (const c of centers) {
        const a = delta(xx - c[0], 1), b = delta(yy - c[1], height); shape += .65 * Math.exp(-(a * a + b * b) / (2 * s.width ** 2));
      }
      h[i] = 1 + s.amplitude * shape;
    }
    Object.assign(sim, { advance, measure, reference }); reference(); return sim;
  }

  const DISPLAY = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_field; uniform vec2 u_res; uniform float u_low,u_high,u_exposure;
${G.GLSL.bicubic}
${G.GLSL.ramp}
void main(){
  float value=texCR(u_field,v_uv,u_res);
  float t=clamp((value-u_low)/max(1e-8,u_high-u_low),0.0,1.0);
  outColor=vec4(ramp(clamp(0.5+(t-0.5)*u_exposure,0.0,1.0)),1.0);
}`;
  function create(host) {
    let gl, display;
    try {
      gl = G.createGL(host.canvas); if (!gl || !gl.floatExt) throw Error('This field view needs WebGL2 with float textures');
      display = new G.Pass(gl, DISPLAY);
    } catch (error) {
      host.fault(error.message); return { aspect: s => ASPECTS[s.aspect] || 1, regenerate() {}, repaint() {}, resize() {}, pause() {}, resume() {} };
    }
    let sim, texture, ramp, rampKey = '', low = 0, high = 1, remaining = 0, timer = 0, raf = 0, paused = false, liveRemaining = 0;
    function stop() { if (timer) clearTimeout(timer); if (raf) cancelAnimationFrame(raf); timer = raf = 0; }
    function upload() {
      const s = host.getState(), data = new Float32Array(sim.h.length * 4), values = new Float64Array(sim.h.length);
      for (let i = 0; i < sim.h.length; i++) values[i] = s.view === 'speed' ? Math.hypot(sim.mx[i], sim.my[i]) / sim.h[i] : sim.h[i];
      for (let i = 0; i < values.length; i++) { data[4 * i] = values[i]; data[4 * i + 3] = 1; }
      values.sort(); low = values[Math.floor(values.length * .02)]; high = values[Math.floor(values.length * .98)];
      if (high - low < 1e-7) { low -= 1e-7; high += 1e-7; }
      texture.upload(data);
    }
    function render(target) {
      const s = host.getState(), key = s.bg + '|' + s.palette.join(',');
      if (!ramp || key !== rampKey) { if (ramp) ramp.dispose(); ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key; }
      display.draw(target || null, { u_field: texture, u_res: [sim.nx, sim.ny], u_ramp: ramp, u_low: low, u_high: high, u_exposure: s.exposure });
    }
    function status() {
      const halted = sim.halted ? '<span>Stopped: <b>' + U.escapeHtml(sim.halted) + '</b></span>' : '';
      // The finite-volume update is in flux form, so every face flux leaves one cell and enters its
      // neighbor and the total volume is conserved to round-off whatever the flow: a regression test.
      host.setStatus('<span>grid <b>' + sim.nx + '×' + sim.ny + '</b> · step <b>' + sim.step.toLocaleString() + '</b>' +
        (remaining && !sim.halted ? ' · preparing' : '') + '</span><span>time <b>' + sim.time.toFixed(4) + '</b></span><span>depth <b>' +
        sim.minDepth.toFixed(3) + '–' + sim.maxDepth.toFixed(3) + '</b></span>' +
        U.stats.compare({ label: 'volume drift', measured: sim.massDrift, expected: 0, reference: 'flux form', basis: 'construction' }) + halted);
    }
    function draw() { if (!sim) return; upload(); render(); status(); }
    function chunk() {
      timer = 0; if (paused || !sim || sim.halted) return;
      const end = performance.now() + 18;
      do {
        sim.advance(1); if (remaining > 0) remaining--; else liveRemaining--;
      } while (!sim.halted && (remaining > 0 || liveRemaining > 0) && performance.now() < end);
      draw(); start();
    }
    function start() {
      stop(); if (paused || !sim || sim.halted) return;
      if (remaining > 0 || liveRemaining > 0) timer = setTimeout(chunk, 0);
      else if (host.getState().running && !host.reducedMotion() && host.isActive())
        raf = requestAnimationFrame(() => { raf = 0; liveRemaining = host.getState().steps; chunk(); });
    }
    return {
      aspect(s) { return ASPECTS[s.aspect] || 1; },
      regenerate() {
        stop(); paused = false; liveRemaining = 0;
        try {
          sim = makeSim(host.getState()); if (texture) texture.dispose();
          texture = new G.Target(gl, sim.nx, sim.ny, { type: 'rgba32f', filter: 'nearest', wrap: host.getState().boundary === 'periodic' ? 'repeat' : 'clamp' });
          remaining = host.getState().warmup; draw(); start();
        } catch (error) { host.fault(error.message); }
      },
      fieldCells() { return sim ? [sim.nx, sim.ny] : null; },
      repaint() { draw(); }, resize() { if (sim) render(); },
      // Stopping drops the rest of the current frame's batch so no step lands after Running is off.
      // Warmup and burst steps in `remaining` still finish; they are part of generating the plate.
      live(key) { if (key === 'running' && !host.getState().running) liveRemaining = 0; start(); },
      pause() { paused = true; stop(); }, resume() { paused = false; start(); },
      action(key) { if (key === 'reseed') this.regenerate(); else if (key === 'burst' && sim) { remaining += 64; start(); } },
      async exportPNG(w, h) {
        if (!sim) throw Error('No shallow-water field to export');
        const max = gl.getParameter(gl.MAX_TEXTURE_SIZE); if (w > max || h > max) throw Error('Print exceeds this GPU limit of ' + max + ' pixels');
        const target = new G.Target(gl, w, h, { type: 'rgba8' }), pixels = new Uint8Array(w * h * 4);
        try {
          render(target); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Print readback failed');
        } finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); target.dispose(); }
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const context = canvas.getContext('2d'), image = context.createImageData(w, h);
        for (let y = 0; y < h; y++) image.data.set(pixels.subarray((h - y - 1) * w * 4, (h - y) * w * 4), y * w * 4);
        context.putImageData(image, 0, 0); return U.toBlob(canvas);
      },
    };
  }
  Studio.register({
    id: 'shallow', name: 'Shallow Water', subtitle: 'depth, flow and shock waves · 1871', order: 89.4, familiarity: 'occasional',
    equation: 'h_t + ∇·(h u) = 0; (h u)_t + ∇·(h u⊗u + ½h² I) = 0, g = 1',
    credit: 'A. J. C. de Saint-Venant (1871), shallow-water equations. Rusanov/local Lax–Friedrichs conservative finite-volume flux. Exact wave benchmarks follow D. I. Ketcheson, R. J. LeVeque and M. J. del Razo, Riemann Problems and Jupyter Solutions (2020). Original implementation of established equations; no Clawpack code is included.',
    blurb: 'Raised patches of water spread, collide and form moving fronts. Depth and horizontal momentum evolve together, so stronger waves can steepen into shocks. Opposite edges can connect, or solid walls can reflect the flow. This is a wet, flat-bottom sheet in normalized units: no coastline, dry ground, bottom relief or breaking-wave spray. The first-order method spreads sharp fronts across several cells. Finer grids reduce that numerical smearing; a larger print keeps the same physical grid.',
    defaults: { ...DEFAULTS }, palette: true, defaultPalette: 'harbor', headline: 'grid', headlineLabel: 'cells across',
    schema: [
      { group: 'Water', key: 'pattern', label: 'Initial water', type: 'seg', kind: 'geom', options: [['splashes', 'Several drops'], ['drop', 'Single drop'], ['ring', 'Ring'], ['dam', 'Raised half'], ['standing', 'Standing wave']] },
      range('Water', 'amplitude', 'Height contrast', 'geom', .05, 1.5, .05, v => v.toFixed(2)),
      range('Water', 'width', 'Drop width', 'geom', .03, .2, .005, v => v.toFixed(3)),
      { group: 'Grid', key: 'grid', label: 'Cells across', type: 'seg', kind: 'geom', options: [[64, '64'], [128, '128'], [256, '256 · heavy'], [512, '512 · very heavy']] },
      { group: 'Grid', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', options: Object.keys(ASPECTS).map(v => [v, v]) },
      { group: 'Grid', key: 'boundary', label: 'Edges', type: 'seg', kind: 'geom', options: [['periodic', 'Connected'], ['walls', 'Reflecting walls']] },
      range('Evolution', 'courant', 'CFL fraction', 'geom', .1, .8, .05, v => v.toFixed(2)),
      range('Evolution', 'warmup', 'Warm-up steps', 'geom', 0, 800, 10, String),
      range('Evolution', 'steps', 'Steps per frame', 'live', 1, 6, 1, String),
      { group: 'Evolution', key: 'running', label: 'Running', type: 'toggle', kind: 'live' },
      { group: 'Evolution', key: 'burst', label: 'Run 64 steps', type: 'action' },
      { group: 'Evolution', key: 'reseed', label: 'Reseed', type: 'action' },
      { group: 'Picture', key: 'view', label: 'Color shows', type: 'seg', kind: 'paint', options: [['depth', 'Water depth'], ['speed', 'Flow speed']] },
      range('Picture', 'exposure', 'Contrast', 'paint', .4, 2, .05, v => v.toFixed(2)),
    ],
    presets: {
      drops: pre('Colliding drops', { pattern: 'splashes', amplitude: .8, width: .07, warmup: 160 }, Pal.harbor),
      pool: pre('Wall reflections', { pattern: 'splashes', boundary: 'walls', warmup: 300, view: 'speed' }, Pal.thermal),
      ring: pre('Expanding ring', { pattern: 'ring', width: .04, amplitude: 1.2, warmup: 160 }, Pal.glacier),
      dam: pre('Corrugated dam break', { pattern: 'dam', amplitude: 1.5, boundary: 'walls', warmup: 120 }, Pal.ember),
      wave: pre('Crossing standing waves', { pattern: 'standing', amplitude: 1.2, warmup: 100 }, Pal.bioluminescent),
      drop: pre('Single ripple', { pattern: 'drop', width: .12, amplitude: .6, warmup: 140, view: 'speed' }, Pal.verdigris),
    },
    hints: {
      Water: 'Depth starts positive everywhere. Height contrast sets the initial disturbance; changing it regenerates the water.',
      Grid: 'The CPU evolves three Float64 fields. At the same physical time, doubling both dimensions needs roughly eight times as much work. A print adds pixels without adding cells.',
      Evolution: 'The deterministic time step follows the fastest current wave speed. Warm-up is counted in steps, so different grids reach different physical times. Volume drift checks conservation; it does not certify wave accuracy.',
      Picture: 'Colors use the current field’s 2nd and 98th percentiles. Contrast is a display choice, not a change to depth or momentum.',
    },
    closedGroups: ['Grid', 'Evolution'],
    surprise(rng) { return { pattern: rng.pick(['splashes', 'ring', 'dam', 'standing']), amplitude: rng.range(.4, 1.4), width: rng.range(.04, .13), boundary: rng.pick(['periodic', 'walls']), view: rng.pick(['depth', 'speed']) }; },
    sanitize(s) { s.grid = [64, 128, 256, 512].includes(s.grid) ? s.grid : 128; s.courant = U.clamp(Number(s.courant) || .45, .1, .8); },
    create,
  });
})();
