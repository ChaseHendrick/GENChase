/* modules/neural-mass.js */
/* Original integration and plotting of the established MPR population equations. */
(function () {
  'use strict';
  const U = Studio.util, Pal = Studio.PALETTES, PI = Math.PI;
  const DEFAULTS = { populations: 32, eta: -1, delta: .5, J: 5, drive: 'sine', amplitude: 1.5,
    frequency: .16, duration: 30, dt: .002, spread: .8, view: 'phase', weight: .8, opacity: .65 };
  const range = (group, key, label, kind, min, max, step, fmt) => ({ group, key, label, type: 'range', kind, min, max, step, fmt });
  const pre = (label, p, palette) => ({ label, p: { ...DEFAULTS, ...p }, palette });
  function input(t, p) {
    if (p.drive === 'sine') return p.amplitude * Math.sin(2 * PI * p.frequency * t);
    if (p.drive === 'pulse') return t >= .25 * p.duration && t < .6 * p.duration ? p.amplitude : 0;
    return 0;
  }
  function check(r, v, dt, p) {
    if (!(r > 0) || !Number.isFinite(r + v)) throw Error('The firing rate must stay positive and finite');
    // Local Jacobian infinity norm, used as a conservative resolution guard.
    // This is not a global nonlinear RK4 stability proof.
    const norm = Math.max(2 * Math.abs(v) + 2 * r, Math.abs(p.J - 2 * PI * PI * r) + 2 * Math.abs(v));
    if (dt * norm > .4) throw Error('Time step is too large for the current population response; lower the time step');
  }
  function rk4(out, r, v, t, dt, p) {
    check(r, v, dt, p);
    // Pulse boundaries are split by makeSim. Within that step the current is
    // constant, including the one-sided endpoint used in RK4's last stage.
    const pulse = p.drive === 'pulse' ? input(t + dt / 2, p) : null;
    const forcing = time => pulse === null ? input(time, p) : pulse;
    const r1 = p.delta / PI + 2 * r * v, v1 = v * v + p.eta + p.J * r + forcing(t) - PI * PI * r * r;
    const ar = r + dt * r1 / 2, av = v + dt * v1 / 2; check(ar, av, dt, p);
    const r2 = p.delta / PI + 2 * ar * av, v2 = av * av + p.eta + p.J * ar + forcing(t + dt / 2) - PI * PI * ar * ar;
    const br = r + dt * r2 / 2, bv = v + dt * v2 / 2; check(br, bv, dt, p);
    const r3 = p.delta / PI + 2 * br * bv, v3 = bv * bv + p.eta + p.J * br + forcing(t + dt / 2) - PI * PI * br * br;
    const cr = r + dt * r3, cv = v + dt * v3; check(cr, cv, dt, p);
    const r4 = p.delta / PI + 2 * cr * cv, v4 = cv * cv + p.eta + p.J * cr + forcing(t + dt) - PI * PI * cr * cr;
    out[0] = r + dt * (r1 + 2 * r2 + 2 * r3 + r4) / 6;
    out[1] = v + dt * (v1 + 2 * v2 + 2 * v3 + v4) / 6;
    check(out[0], out[1], dt, p);
  }
  function makeSim(p) {
    if (!(p.delta > 0 && p.dt > 0 && p.duration > 0)) throw Error('Positive input width, duration and time step are required');
    const n = p.populations, samples = 1200, r = new Float64Array(n), v = new Float64Array(n);
    const nr = new Float64Array(n), nv = new Float64Array(n), work = new Float64Array(2);
    const historyR = new Float64Array((samples + 1) * n), historyV = new Float64Array((samples + 1) * n);
    const times = new Float64Array(samples + 1), rng = U.makeRng(p.seed + '/neural-mass');
    for (let i = 0; i < n; i++) { r[i] = .15 * Math.exp(p.spread * rng.range(-2, 2)); v[i] = -.8 + p.spread * rng.range(-1.5, 1.5); }
    const sim = { n, r, v, historyR, historyV, times, samples, recorded: 0, time: 0, steps: 0, halted: '', complete: false, minRate: Infinity, maxRate: 0 };
    function record() {
      const offset = sim.recorded * n; historyR.set(r, offset); historyV.set(v, offset); times[sim.recorded] = sim.time;
      for (let i = 0; i < n; i++) { sim.minRate = Math.min(sim.minRate, r[i]); sim.maxRate = Math.max(sim.maxRate, r[i]); }
    }
    function reference() { sim.minRate = Infinity; sim.maxRate = 0; record(); }
    function advance(count) {
      for (let k = 0; k < count && !sim.complete && !sim.halted; k++) {
        try {
          const nextSample = p.duration * (sim.recorded + 1) / samples;
          let stop = nextSample;
          if (p.drive === 'pulse') for (const event of [.25 * p.duration, .6 * p.duration])
            if (event > sim.time + 1e-12) stop = Math.min(stop, event);
          const dt = Math.min(p.dt, stop - sim.time);
          if (!(dt > 0)) throw Error('Invalid population time interval');
          for (let i = 0; i < n; i++) { rk4(work, r[i], v[i], sim.time, dt, p); nr[i] = work[0]; nv[i] = work[1]; }
          r.set(nr); v.set(nv); sim.time += dt; sim.steps++;
          if (Math.abs(sim.time - nextSample) < 1e-11) {
            sim.time = nextSample; sim.recorded++; record(); sim.complete = sim.recorded === samples;
          }
        } catch (error) { sim.halted = error.message; }
      }
    }
    Object.assign(sim, { advance, reference }); reference(); return sim;
  }
  function create(host) {
    const canvas = host.canvas, ctx = canvas.getContext('2d'); let sim, timer = 0, paused = false;
    function stop() { if (timer) clearTimeout(timer); timer = 0; }
    function status() {
      const tail = sim.halted ? '<span>Stopped: <b>' + U.escapeHtml(sim.halted) + '</b></span>' : '';
      host.setStatus('<span>populations <b>' + sim.n + '</b></span><span>step <b>' + sim.steps.toLocaleString() + '</b>' +
        (sim.complete ? ' · complete' : sim.halted ? '' : ' · preparing') + '</span><span>time <b>' + sim.time.toFixed(3) +
        '</b></span><span>sampled rate <b>' + sim.minRate.toFixed(3) + '–' + sim.maxRate.toFixed(3) + '</b></span>' + tail);
    }
    function geometry(w, h) {
      const s = host.getState(), count = sim.recorded + 1, phase = s.view === 'phase';
      let ymin = Infinity, ymax = -Infinity, xmin = phase ? Infinity : 0, xmax = phase ? -Infinity : s.duration;
      for (let j = 0; j < count * sim.n; j++) {
        const yy = s.view === 'rate' ? sim.historyR[j] : sim.historyV[j]; ymin = Math.min(ymin, yy); ymax = Math.max(ymax, yy);
        if (phase) { xmin = Math.min(xmin, sim.historyR[j]); xmax = Math.max(xmax, sim.historyR[j]); }
      }
      const padY = Math.max(.02, (ymax - ymin) * .08), padX = Math.max(.02, (xmax - xmin) * .05);
      ymin -= padY; ymax += padY; if (phase) { xmin = Math.max(0, xmin - padX); xmax += padX; }
      const left = .11 * w, right = .94 * w, top = .07 * h, bottom = .89 * h;
      const px = value => left + (right - left) * (value - xmin) / (xmax - xmin);
      const py = value => bottom - (bottom - top) * (value - ymin) / (ymax - ymin);
      const paths = [];
      for (let i = 0; i < sim.n; i++) {
        const points = [];
        for (let j = 0; j < count; j++) {
          const k = j * sim.n + i, xx = phase ? sim.historyR[k] : sim.times[j], yy = s.view === 'rate' ? sim.historyR[k] : sim.historyV[k];
          points.push([px(xx), py(yy)]);
        }
        paths.push({ points, color: s.palette[i % s.palette.length] });
      }
      const labels = [], lines = [[left, bottom, right, bottom], [left, bottom, left, top]];
      const fmt = n => Math.abs(n) < .01 && n !== 0 ? n.toExponential(1) : n.toFixed(2);
      for (let i = 0; i <= 4; i++) {
        const x = xmin + (xmax - xmin) * i / 4, y = ymin + (ymax - ymin) * i / 4;
        labels.push({ x: px(x), y: bottom + .035 * h, text: fmt(x), align: 'center' });
        labels.push({ x: left - .015 * w, y: py(y), text: fmt(y), align: 'right' });
        lines.push([px(x), bottom, px(x), bottom + .008 * h], [left - .006 * w, py(y), left, py(y)]);
      }
      labels.push({ x: (left + right) / 2, y: .965 * h, text: phase ? 'population firing rate r' : 'dimensionless time', align: 'center' });
      labels.push({ x: left, y: .03 * h, text: s.view === 'rate' ? 'population firing rate r' : 'population voltage v', align: 'left' });
      return { paths, labels, lines };
    }
    function paint(context, w, h) {
      const s = host.getState(); context.fillStyle = s.bg; context.fillRect(0, 0, w, h); if (!sim) return;
      const g = geometry(w, h), unit = Math.min(w, h), ink = U.inkFor(s.bg);
      context.lineJoin = 'round'; context.lineCap = 'round'; context.lineWidth = s.weight * unit / 700; context.globalAlpha = s.opacity;
      for (const path of g.paths) {
        context.strokeStyle = path.color; context.beginPath(); path.points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y)); context.stroke();
      }
      context.globalAlpha = .65; context.strokeStyle = ink; context.lineWidth = unit / 1000;
      for (const [x, y, xx, yy] of g.lines) { context.beginPath(); context.moveTo(x, y); context.lineTo(xx, yy); context.stroke(); }
      context.globalAlpha = .85; context.fillStyle = ink; context.font = (unit * .019) + 'px monospace'; context.textBaseline = 'middle';
      for (const label of g.labels) { context.textAlign = label.align; context.fillText(label.text, label.x, label.y); }
      context.globalAlpha = 1;
    }
    function draw() { paint(ctx, canvas.width, canvas.height); if (sim) status(); }
    function chunk() {
      timer = 0; if (paused || !sim || sim.halted || sim.complete) return;
      const end = performance.now() + 18;
      do { sim.advance(16); } while (!sim.halted && !sim.complete && performance.now() < end);
      draw(); if (!sim.halted && !sim.complete) timer = setTimeout(chunk, 0);
    }
    function ready() { if (!sim || !sim.complete) throw Error(sim?.halted || 'Wait for the population traces to finish before exporting'); }
    return {
      aspect() { return 1; },
      regenerate() { stop(); paused = false; sim = makeSim(host.getState()); draw(); timer = setTimeout(chunk, 0); },
      repaint() { draw(); }, resize() { draw(); }, pause() { paused = true; stop(); },
      resume() { paused = false; if (sim && !sim.complete && !sim.halted && !timer) timer = setTimeout(chunk, 0); },
      async exportPNG(w, h) { ready(); const out = document.createElement('canvas'); out.width = w; out.height = h; paint(out.getContext('2d'), w, h); return U.toBlob(out); },
      exportSVG(w, h) {
        ready(); const s = host.getState(), g = geometry(w, h), unit = Math.min(w, h), ink = U.svgEsc(U.inkFor(s.bg));
        const paths = g.paths.map(p => '<path d="' + p.points.map(([x, y], i) => (i ? 'L' : 'M') + x + ',' + y).join(' ') + '" stroke="' + U.svgEsc(p.color) + '"/>').join('');
        const axes = g.lines.map(([x, y, xx, yy]) => '<path d="M' + x + ',' + y + 'L' + xx + ',' + yy + '"/>').join('');
        const labels = g.labels.map(l => '<text x="' + l.x + '" y="' + l.y + '" text-anchor="' + ({ center: 'middle', left: 'start', right: 'end' }[l.align]) + '">' + U.svgEsc(l.text) + '</text>').join('');
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect width="100%" height="100%" fill="' + U.svgEsc(s.bg) + '"/>' +
          '<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="' + s.weight * unit / 700 + '" stroke-opacity="' + s.opacity + '">' + paths + '</g>' +
          '<g fill="none" stroke="' + ink + '" stroke-width="' + unit / 1000 + '" opacity="0.65">' + axes + '</g>' +
          '<g fill="' + ink + '" font-family="monospace" font-size="' + unit * .019 + '" dominant-baseline="central" opacity="0.85">' + labels + '</g></svg>';
      },
    };
  }
  Studio.register({
    id: 'neural-mass', name: 'Neural Populations', subtitle: 'exact QIF mean-field model · 2015', order: 36.8, familiarity: 'occasional',
    equation: 'dr/dt = Δ/π + 2rv; dv/dt = v² + η̄ + Jr + I(t) − π²r²',
    credit: 'E. Montbrió, D. Pazó and A. Roxin, Macroscopic Description for Networks of Spiking Neurons, Physical Review X 5, 021028 (2015), doi:10.1103/PhysRevX.5.021028, Eq. (12). Original implementation of the established macroscopic equations.',
    blurb: 'Each curve follows the firing rate and population voltage of an idealized, infinitely large network of quadratic integrate-and-fire neurons. Coupling acts within each population; the displayed curves are independent preparations of the same model. The seed changes their initial rates and voltages. A common pulse or sinusoidal current drives their responses. The equations assume all-to-all coupling, Lorentzian variation in fixed inputs and instantaneous synapses. These are dimensionless model traces, not recordings from a brain or a finite collection of individual neurons. With constant input this model relaxes toward fixed points; driven oscillations require the selected time-varying input.',
    defaults: { ...DEFAULTS }, palette: true, defaultPalette: 'bioluminescent', headline: 'populations', headlineLabel: 'preparations',
    schema: [
      { group: 'Population', key: 'populations', label: 'Independent preparations', type: 'seg', kind: 'geom', options: [[16, '16'], [32, '32'], [64, '64'], [128, '128']] },
      range('Population', 'eta', 'Mean fixed input', 'geom', -5, 3, .1, v => v.toFixed(1)),
      range('Population', 'delta', 'Lorentzian input width', 'geom', .1, 2, .05, v => v.toFixed(2)),
      range('Population', 'J', 'Within-population coupling', 'geom', -8, 12, .2, v => v.toFixed(1)),
      range('Population', 'spread', 'Initial-state spread', 'geom', .05, 1, .05, v => v.toFixed(2)),
      { group: 'Input', key: 'drive', label: 'Common current', type: 'seg', kind: 'geom', options: [['none', 'None'], ['pulse', 'Pulse'], ['sine', 'Sine wave']] },
      range('Input', 'amplitude', 'Current amplitude', 'geom', 0, 4, .1, v => v.toFixed(1)),
      range('Input', 'frequency', 'Cycles per unit time', 'geom', .03, 1.5, .01, v => v.toFixed(2)),
      range('Integration', 'duration', 'Duration', 'geom', 8, 80, 1, String),
      range('Integration', 'dt', 'Maximum time step', 'geom', .0005, .008, .0005, v => v.toFixed(4)),
      { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: 'paint', options: [['phase', 'Rate–voltage portrait'], ['rate', 'Firing-rate traces'], ['voltage', 'Voltage traces']] },
      range('Picture', 'weight', 'Line weight', 'paint', .4, 2, .1, v => v.toFixed(1)),
      range('Picture', 'opacity', 'Line opacity', 'paint', .1, 1, .05, v => v.toFixed(2)),
    ],
    presets: {
      driven: pre('Driven population', {}, Pal.bioluminescent),
      relaxation: pre('Damped relaxation', { J: 0, eta: 1, delta: .5, drive: 'none', duration: 12, spread: 1 }, Pal.harbor),
      pulse: pre('Pulse response', { J: 8, eta: -2, delta: .5, drive: 'pulse', amplitude: 3, duration: 30, view: 'rate' }, Pal.thermal),
      inhibitory: pre('Inhibitory coupling', { J: -6, eta: 2, delta: .5, drive: 'sine', amplitude: 2, frequency: .4, duration: 20, view: 'voltage' }, Pal.verdigris),
      slow: pre('Slow common drive', { J: 8, eta: -3, delta: .5, drive: 'sine', amplitude: 3, frequency: .05, duration: 60 }, Pal.ember),
      broad: pre('Broad fixed inputs', { J: 4, eta: 1, delta: 2, drive: 'sine', amplitude: 1, frequency: .12, duration: 30, view: 'rate' }, Pal.glacier),
    },
    hints: {
      Population: 'Each preparation represents its own infinite QIF population. More curves do not mean more individual neurons. Δ describes fixed input heterogeneity, not added time-dependent noise.',
      Input: 'The pulse starts at one quarter of the displayed duration and ends at three fifths. Its boundaries are integrated exactly as separate time intervals.',
      Integration: 'Float64 RK4 with 1,201 stored times per preparation. A local resolution guard stops an unresolved response instead of clipping rates. Reduce the maximum step if it stops.',
      Picture: 'Axes show dimensionless quantities. Population voltage is the principal-value mean defined in the model. Print paths use the computed coordinates; extra pixels do not add integration accuracy.',
    },
    closedGroups: ['Input', 'Integration'],
    surprise(rng) { return { eta: rng.range(-2, 2), J: rng.range(-4, 8), delta: rng.range(.3, 1.5), amplitude: rng.range(.5, 2.5), frequency: rng.range(.06, .5), view: rng.pick(['phase', 'rate', 'voltage']) }; },
    sanitize(s) { s.populations = [16, 32, 64, 128].includes(s.populations) ? s.populations : 32; s.dt = U.clamp(Number(s.dt) || .002, .0005, .008); s.delta = U.clamp(Number(s.delta) || .5, .1, 2); },
    create,
  });
})();
