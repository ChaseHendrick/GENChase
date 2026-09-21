/* modules/hodgkin-huxley.js */
/* Original classical squid-membrane equations in the modern resting-voltage convention. */
(function () {
  'use strict';
  const U = Studio.util, G = Studio.gl, Pal = Studio.PALETTES;
  const P = { C: 1, gNa: 120, gK: 36, gL: .3, ENa: 50, EK: -77, EL: -54.387 };
  // Frozen gates give |lambdaV| <= (gNa+gK+gL)/C = 156.3/ms. RK4's negative-real bound is 2.785,
  // so dt <= .01ms is below .0178ms for that limit. This is not a full coupled stability proof.
  const DEFAULTS = { n: 64, current: 11, spread: 4, start: 10, pulse: 80, duration: 100, dt: .01, jitter: 1, view: 'voltage', seed: 'membrane-gates' };
  const range = (group, key, label, min, max, step, fmt) => ({ group, key, label, type: 'range', kind: 'geom', min, max, step, fmt });
  const pre = (label, p, palette) => ({ label, p, palette });
  // x/(1-exp(-x)) has a removable singularity at zero. Series is stable on both sides.
  function exprel(x) { return Math.abs(x) < 1e-5 ? 1 + x / 2 + x * x / 12 - x ** 4 / 720 : -x / Math.expm1(-x); }
  function rates(V, out, o = 0) {
    out[o] = exprel((V + 40) / 10); out[o + 1] = 4 * Math.exp(-(V + 65) / 18);
    out[o + 2] = .07 * Math.exp(-(V + 65) / 20); out[o + 3] = 1 / (1 + Math.exp(-(V + 35) / 10));
    out[o + 4] = .1 * exprel((V + 55) / 10); out[o + 5] = .125 * Math.exp(-(V + 65) / 80);
    return out;
  }
  function rhs(V, m, h, n, I, out, o = 0, p = P) {
    rates(V, out, 16);
    out[o] = (I - p.gNa * m ** 3 * h * (V - p.ENa) - p.gK * n ** 4 * (V - p.EK) - p.gL * (V - p.EL)) / p.C;
    out[o + 1] = out[16] * (1 - m) - out[17] * m;
    out[o + 2] = out[18] * (1 - h) - out[19] * h;
    out[o + 3] = out[20] * (1 - n) - out[21] * n;
  }
  function rk4(y, o, I, dt, next, work, p = P) {
    const V = y[o], m = y[o + 1], h = y[o + 2], n = y[o + 3], half = .5 * dt;
    rhs(V, m, h, n, I, work, 0, p);
    rhs(V + half * work[0], m + half * work[1], h + half * work[2], n + half * work[3], I, work, 4, p);
    rhs(V + half * work[4], m + half * work[5], h + half * work[6], n + half * work[7], I, work, 8, p);
    rhs(V + dt * work[8], m + dt * work[9], h + dt * work[10], n + dt * work[11], I, work, 12, p);
    for (let j = 0; j < 4; j++) next[o + j] = y[o + j] + dt / 6 * (work[j] + 2 * work[4 + j] + 2 * work[8 + j] + work[12 + j]);
  }
  function makeSim(s) {
    const n = s.n, sampleEvery = Math.round(.1 / s.dt), columns = Math.round(s.duration * 10) + 1;
    const state = new Float64Array(n * 4), next = new Float64Array(n * 4), currents = new Float64Array(n), work = new Float64Array(22);
    const history = new Float32Array(n * columns * 4), spikeCounts = new Uint32Array(n), events = Array.from({ length: n }, () => []);
    const sim = { n, dt: s.dt, columns, sampleEvery, totalSteps: Math.round(s.duration / s.dt), startStep: Math.round(s.start / s.dt), endStep: Math.round((s.start + s.pulse) / s.dt), state, next, currents, work, history, spikeCounts, events, step: 0, time: 0, samples: 1, halted: '', totalSpikes: 0, minV: Infinity, maxV: -Infinity };
    const rng = U.makeRng(s.seed + '/hodgkin-huxley');
    for (let i = 0; i < n; i++) currents[i] = s.current + s.spread * rng.range(-1, 1);
    currents.sort();
    for (let i = 0; i < n; i++) {
      const V = -65 + s.jitter * rng.range(-1, 1), o = i * 4; rates(V, work);
      state[o] = V; for (let k = 0; k < 3; k++) state[o + k + 1] = work[2 * k] / (work[2 * k] + work[2 * k + 1]);
      sim.minV = Math.min(sim.minV, V); sim.maxV = Math.max(sim.maxV, V);
      history.set(state.subarray(o, o + 4), i * columns * 4);
    }
    function advance(count) {
      let accepted = 0;
      for (let k = 0; k < count && !sim.halted && sim.step < sim.totalSteps; k++) {
        const active = sim.step >= sim.startStep && sim.step < sim.endStep;
        // Pulse endpoints coincide with step boundaries. Each RK stage uses the current on this interval.
        for (let i = 0; i < n; i++) rk4(state, i * 4, active ? currents[i] : 0, sim.dt, next, work);
        let reason = '';
        for (let i = 0; i < next.length; i++) {
          const value = next[i];
          if (!Number.isFinite(value)) { reason = 'Nonfinite trial state'; break; }
          if (i % 4 ? value < 0 || value > 1 : value < -120 || value > 80) { reason = i % 4 ? 'Gate left its physical range' : 'Voltage left the supported range'; break; }
        }
        if (reason) { next.set(state); work.fill(0); sim.halted = reason; break; }
        for (let i = 0; i < n; i++) {
          const o = i * 4, V = next[o];
          if (state[o] < 0 && V >= 0) { events[i].push((sim.step + (-state[o]) / (V - state[o])) * sim.dt); spikeCounts[i]++; sim.totalSpikes++; }
          sim.minV = Math.min(sim.minV, V); sim.maxV = Math.max(sim.maxV, V);
        }
        state.set(next); sim.step++; sim.time = sim.step * sim.dt; accepted++;
        if (sim.step % sampleEvery === 0) {
          for (let i = 0; i < n; i++) history.set(state.subarray(i * 4, i * 4 + 4), (i * columns + sim.samples) * 4);
          sim.samples++;
        }
      }
      return accepted;
    }
    sim.advance = advance; return sim;
  }
  const DISPLAY_FS = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 outColor;
uniform sampler2D u_history; uniform vec2 u_res,u_output; uniform float u_progress,u_samples; uniform int u_view; uniform vec3 u_bg;
${G.GLSL.bicubic}
${G.GLSL.ramp}
vec4 historyCR(vec2 uv){
  vec2 p=uv*u_res-0.5,b=floor(p),f=p-b;vec4 result=vec4(0.0);
  for(int j=-1;j<=2;j++)for(int i=-1;i<=2;i++){
    vec2 cell=vec2(clamp(b.x+float(i),0.0,u_samples-1.0),clamp(b.y+float(j),0.0,u_res.y-1.0));
    result+=texture(u_history,(cell+0.5)/u_res)*crW(float(i)-f.x)*crW(float(j)-f.y);
  }return result;
}
void main(){
  vec2 box=vec2(min(u_output.x,u_output.y*1.5),min(u_output.y,u_output.x/1.5));
  vec2 uv=(v_uv*u_output-0.5*(u_output-box))/box;
  if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1)))||uv.x>u_progress){outColor=vec4(u_bg,1);return;}
  vec2 samples=vec2((uv.x*(u_res.x-1.0)+0.5)/u_res.x,uv.y);
  vec4 y=historyCR(samples);
  float z=u_view==0?(y.r+80.0)/120.0:(u_view==1?y.g:y.a);
  outColor=vec4(ramp(clamp(z,0.0,1.0)),1.0);
}`;
  function create(host) {
    const gl = G.createGL(host.canvas), noop = () => {};
    if (!gl || !gl.floatExt) { host.fault('Membrane traces need WebGL2 float buffers.'); return { regenerate: noop, resize: noop, pause: noop, resume: noop, exportPNG: () => Promise.reject(Error('WebGL2 float rendering unavailable')) }; }
    const display = new G.Pass(gl, DISPLAY_FS); let sim = null, texture = null, timer = 0, paused = false, ramp = null, rampKey = '';
    function stop() { clearTimeout(timer); timer = 0; }
    function render(target) {
      const s = host.getState(), key = s.palette.join(',') + s.bg;
      if (key !== rampKey) { if (ramp) ramp.dispose(); ramp = G.rampTexture(gl, s.palette, s.bg); rampKey = key; }
      display.draw(target || null, { u_history: texture, u_res: [sim.columns, sim.n], u_output: [target ? target.w : host.canvas.width, target ? target.h : host.canvas.height], u_samples: sim.samples, u_progress: (sim.samples - 1) / (sim.columns - 1), u_view: { int: { voltage: 0, sodium: 1, potassium: 2 }[s.view] || 0 }, u_bg: U.hexToRgb(s.bg).map(x => x / 255), u_ramp: ramp });
    }
    function status() {
      const s = host.getState(), active = sim.step >= sim.startStep && sim.step < sim.endStep;
      host.setStatus('<span>t <b>' + sim.time.toFixed(1) + '/' + s.duration + ' ms</b> · step <b>' + sim.step.toLocaleString() + '</b></span>' +
        '<span>step current <b>' + sim.currents[0].toFixed(2) + ' to ' + sim.currents[sim.n - 1].toFixed(2) + ' µA/cm²</b> · ' + s.start + '–' + (s.start + s.pulse) + ' ms · ' + (active ? 'on' : 'off') + '</span>' +
        '<span>trace 1 <b>' + sim.state[0].toFixed(2) + ' mV</b> · total upward 0 mV crossings <b>' + sim.totalSpikes + '</b></span>' +
        (sim.halted ? '<span>Stopped: <b>' + U.escapeHtml(sim.halted) + '</b></span>' : sim.step < sim.totalSteps ? '<span>preparing</span>' : '<span>complete</span>'));
    }
    function draw() { texture.upload(sim.history); render(); status(); }
    function chunk() {
      timer = 0; if (paused || !sim || sim.halted) return;
      const end = performance.now() + 16;
      do { sim.advance(1); } while (sim.step < sim.totalSteps && !sim.halted && performance.now() < end);
      draw(); if (sim.step < sim.totalSteps && !sim.halted) timer = setTimeout(chunk, 0);
    }
    function start() { stop(); if (sim && !paused && !sim.halted && sim.step < sim.totalSteps) timer = setTimeout(chunk, 0); }
    return {
      aspect() { return 2 / 3; }, fieldCells() { return sim ? [sim.columns, sim.n] : null; },
      regenerate() {
        stop(); sim = makeSim(host.getState()); paused = false;
        if (texture) texture.dispose(); texture = new G.Target(gl, sim.columns, sim.n, { type: 'rgba32f', filter: 'nearest', wrap: 'clamp' }); draw(); start();
      },
      repaint() { if (sim) render(); }, resize() { if (sim) render(); },
      pause() { paused = true; stop(); }, resume() { paused = false; start(); },
      async exportPNG(w, h) {
        if (!sim) throw Error('No membrane traces');
        if (Math.max(w, h) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw Error('Print exceeds GPU texture limit');
        const target = new G.Target(gl, w, h, { type: 'rgba8' }), bytes = new Uint8Array(w * h * 4);
        try { render(target); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bytes); }
        finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); target.dispose(); }
        const out = document.createElement('canvas'); out.width = w; out.height = h; const ctx = out.getContext('2d'), image = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) image.data.set(bytes.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        ctx.putImageData(image, 0, 0); return U.toBlob(out);
      },
    };
  }
  Studio.register({
    id: 'hodgkin-huxley', name: 'Hodgkin-Huxley Membranes', tab: 'Membranes', subtitle: 'sodium and potassium gates · 1952', order: 50.2,
    equation: 'C dV/dt = I − gNa m³h(V − ENa) − gK n⁴(V − EK) − gL(V − EL); dx/dt = αx(V)(1 − x) − βx(V)x',
    credit: 'A. L. Hodgkin and A. F. Huxley, A quantitative description of membrane current and its application to conduction and excitation in nerve, J. Physiol. 117, 500–544 (1952), doi:10.1113/jphysiol.1952.sp004764. Classical squid membrane at 6.3°C, modern −65 mV resting-voltage convention. Original implementation of established equations.',
    blurb: 'Each horizontal row is a separate squid-membrane model receiving a measured-duration current step. Time runs left to right. Rows are ordered by their seeded current amplitudes, from lower at the bottom to higher at the top. Voltage rises when sodium gates open, then potassium and sodium inactivation return it toward rest. Color can instead show either activation gate. The rows do not communicate and are not a brain network. This is a deterministic, single-compartment 1952 model, with no synapses, channel noise, spatial propagation or human-patient interpretation. A brighter stripe is a computed voltage excursion, not a drawn spike or a reset rule.',
    palette: true, defaultPalette: 'thermal', headline: 'n', headlineLabel: 'membranes', defaults: { ...DEFAULTS },
    schema: [
      { group: 'Stimulus', key: 'n', label: 'Independent membranes', type: 'seg', kind: 'geom', options: [[16, '16'], [32, '32'], [64, '64'], [128, '128'], [256, '256 · heavy']] },
      range('Stimulus', 'current', 'Mean step · µA/cm²', -10, 30, .5, v => v.toFixed(1)),
      range('Stimulus', 'spread', 'Current half-range · µA/cm²', 0, 10, .5, v => v.toFixed(1)),
      range('Stimulus', 'start', 'Step starts · ms', 0, 60, 1, String),
      range('Stimulus', 'pulse', 'Step duration · ms', 1, 200, 1, String),
      range('Recording', 'duration', 'Record length · ms', 20, 240, 10, String),
      range('Recording', 'jitter', 'Initial voltage spread · mV', 0, 5, .25, v => v.toFixed(2)),
      { group: 'Recording', key: 'dt', label: 'Time step · ms', type: 'seg', kind: 'geom', options: [[.01, '0.01'], [.005, '0.005'], [.0025, '0.0025']] },
      { group: 'Picture', key: 'view', label: 'Color', type: 'seg', kind: 'paint', options: [['voltage', 'Voltage'], ['sodium', 'Sodium activation'], ['potassium', 'Potassium activation']] },
    ],
    presets: {
      repeated: pre('Repeated responses', { current: 11, spread: 4, start: 10, pulse: 80, duration: 100 }, Pal.thermal),
      brief: pre('Brief pulse', { current: 16, spread: 8, start: 5, pulse: 1, duration: 30 }, Pal.glacier),
      recruitment: pre('A range of inputs', { current: 6, spread: 5, start: 10, pulse: 70, duration: 100 }, Pal.ember),
      sodium: pre('Sodium gate opens', { current: 14, spread: 5, start: 10, pulse: 80, duration: 100, view: 'sodium' }, Pal.bioluminescent),
      potassium: pre('Potassium recovery', { current: 18, spread: 7, start: 10, pulse: 80, duration: 100, view: 'potassium' }, Pal.meadow),
      rebound: pre('Release from inhibition', { current: -4, spread: 2, start: 5, pulse: 30, duration: 80 }, Pal.kiln),
    },
    hints: {
      Stimulus: 'Current density is positive inward, in µA/cm², and zero outside the stated step. This is a prescribed stimulus, not a feedback rule. The 256-membrane setting costs four times the default ODE work.',
      Recording: 'Units are mV and ms; Cm = 1 µF/cm². RK4 integrates voltage and all three gates together. Pulse edges align exactly with steps. Gate probabilities are never clipped. An invalid gate, nonfinite trial, or voltage outside −120 to +80 mV stops at the last accepted state. Fine steps are still not a general accuracy guarantee.',
      Picture: 'Voltage color spans −80 to +40 mV; gate color spans 0 to 1. These are fixed display ranges only. Records store a sample every 0.1 ms and interpolate for printing; added print pixels do not improve time resolution. The 0 mV upward-crossing count is a measurement, not a firing rule.',
    },
    closedGroups: ['Recording', 'Picture'],
    surprise(rng) { return { current: rng.range(8, 20), spread: rng.range(2, 7), start: 10, pulse: 80, duration: 100, n: 64 }; },
    sanitize(s) {
      const num = (v, d, a, b) => U.clamp(Number.isFinite(Number(v)) ? Number(v) : d, a, b);
      s.n = [16, 32, 64, 128, 256].includes(Number(s.n)) ? Number(s.n) : DEFAULTS.n;
      s.dt = [.01, .005, .0025].includes(Number(s.dt)) ? Number(s.dt) : .01;
      s.current = num(s.current, 11, -10, 30); s.spread = num(s.spread, 4, 0, 10); s.jitter = num(s.jitter, 1, 0, 5);
      s.duration = Math.round(num(s.duration, 100, 20, 240)); s.start = Math.round(num(s.start, 10, 0, Math.min(60, s.duration - 1)));
      s.pulse = Math.round(num(s.pulse, 80, 1, Math.min(200, s.duration - s.start)));
    }, create,
  });
})();
