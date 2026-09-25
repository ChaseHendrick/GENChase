
/* modules/attractors.js */
/* GENChase — Attractors: strange attractors and harmonographs rendered as density maps. */
(function () {
  'use strict';
  const U = Studio.util;
  const TAU = U.TAU;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '2:3': 1.5, '16:9': 9 / 16 };
  const LUT_N = 1024;              // entries in the color ramps
  const FLOW_WALKERS = 6;          // parallel trajectories for 3D flows (fills the attractor faster)
  const FRAME_MARGIN = 0.06;       // empty border around the auto-framed attractor
  const FRAME_BUDGET_MS = 24;      // max accumulation time per animation frame
  const CHUNK = 4096;              // points per inner batch between clock checks
  const EXPORT_CAP = 40e6;         // points ceiling for exportPNG
  const EXPORT_MAX_RES = 4000;     // accumulate at most this many pixels on the long side, then upscale
  const REDUCED_MOTION_BUDGET_MS = 4000;

  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const fmtM = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M' : Math.round(v / 1e3) + 'k';
  const deg = v => v + '°';

  /* ================================================================
     systems
     A walker is a Float64Array(8): [x, y, z, t, X, Y, prevX, prevY] where X/Y are the
     projected 2D coordinates written by adv(). Coefficients are always called a, b, c, d.
  ================================================================ */
  function rk4(der, h) {
    const k = new Float64Array(12), h2 = h * 0.5, h6 = h / 6;
    return function (st) {
      const x = st[0], y = st[1], z = st[2];
      der(x, y, z, k, 0);
      der(x + h2 * k[0], y + h2 * k[1], z + h2 * k[2], k, 3);
      der(x + h2 * k[3], y + h2 * k[4], z + h2 * k[5], k, 6);
      der(x + h * k[6], y + h * k[7], z + h * k[8], k, 9);
      st[0] = x + h6 * (k[0] + 2 * k[3] + 2 * k[6] + k[9]);
      st[1] = y + h6 * (k[1] + 2 * k[4] + 2 * k[7] + k[10]);
      st[2] = z + h6 * (k[2] + 2 * k[5] + 2 * k[8] + k[11]);
    };
  }

  function mapSys(name, n, def, roll, start, fn) {
    return { name, kind: 'map', n, def, dt: 0.01, view: { yaw: 0, pitch: 0 }, roll, start,
      make: co => { const step = fn(co.a, co.b, co.c, co.d); return st => { step(st); st[4] = st[0]; st[5] = st[1]; }; } };
  }
  function flowSys(name, n, def, dt, view, roll, start, der) {
    return { name, kind: 'flow', n, def, dt, view, roll, start,
      make: (co, h, yaw, pitch, rng, s) => {
        const step = rk4(der(co.a, co.b, co.c, co.d, s), h);
        const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        return st => {
          step(st);
          const x = st[0], y = st[1], z = st[2];
          const y1 = x * sy + y * cy;
          st[4] = x * cy - y * sy;          // screen X
          st[5] = y1 * sp + z * cp;         // screen Y (pitch 0 = side view of the x–z plane, 90 = top view)
        };
      } };
  }
  const j = (r, w) => (r() - 0.5) * w;

  /* Custom ODE: dx/dt, dy/dt, dz/dt typed by the viewer in x, y, z and the coefficients a, b, c, d,
     parsed by the shared expression language (never evaluated as code) and integrated with the same
     RK4 step as every other flow here. The default is the Lorenz system written out, so the mode
     opens on a known picture. A trajectory that leaves |x|, |y|, |z| < 1e6 or becomes undefined stops
     the plate: the divergence guard reports it instead of silently restarting the walker. */
  const ODE_SPEC = { vars: ['x', 'y', 'z'], params: ['a', 'b', 'c', 'd'] };
  // Lorenz with its classical constants written in, so a link that picks the custom system without naming
  // a, b and c still runs the Lorenz attractor instead of the tab's map coefficients, which diverge here.
  const ODE_DEFAULTS = { odeX: '10*(y - x)', odeY: 'x*(28 - z) - y', odeZ: 'x*y - 8/3*z' };
  const ODE_LIMIT = 1e6;
  const checkOde = v => U.expr.check(v, ODE_SPEC);
  function compileOde(text, fallback) {
    try { return U.expr.compile(text, ODE_SPEC); } catch (err) { return U.expr.compile(fallback, ODE_SPEC); }
  }
  const sane = st => Math.abs(st[0]) < ODE_LIMIT && Math.abs(st[1]) < ODE_LIMIT && Math.abs(st[2]) < ODE_LIMIT;

  const SYSTEMS = {
    clifford: mapSys('Clifford', 4, { a: -1.4, b: 1.6, c: 1.0, d: 0.7 },
      r => ({ a: r.range(-3, 3), b: r.range(-3, 3), c: r.range(-3, 3), d: r.range(-3, 3) }),
      (st, r) => { st[0] = j(r, 1); st[1] = j(r, 1); },
      (a, b, c, d) => st => { const x = st[0], y = st[1]; st[0] = Math.sin(a * y) + c * Math.cos(a * x); st[1] = Math.sin(b * x) + d * Math.cos(b * y); }),
    dejong: mapSys('Peter de Jong', 4, { a: 1.4, b: -2.3, c: 2.4, d: -2.1 },
      r => ({ a: r.range(-3, 3), b: r.range(-3, 3), c: r.range(-3, 3), d: r.range(-3, 3) }),
      (st, r) => { st[0] = j(r, 1); st[1] = j(r, 1); },
      (a, b, c, d) => st => { const x = st[0], y = st[1]; st[0] = Math.sin(a * y) - Math.cos(b * x); st[1] = Math.sin(c * x) - Math.cos(d * y); }),
    svensson: mapSys('Johnny Svensson', 4, { a: 1.4, b: 1.56, c: 1.4, d: -6.56 },
      r => ({ a: r.range(-3, 3), b: r.range(-3, 3), c: r.range(-3, 3), d: r.range(-7, 7) }),
      (st, r) => { st[0] = j(r, 1); st[1] = j(r, 1); },
      (a, b, c, d) => st => { const x = st[0], y = st[1]; st[0] = d * Math.sin(a * x) - Math.sin(b * y); st[1] = c * Math.cos(a * x) + Math.cos(b * y); }),
    bedhead: mapSys('Bedhead', 2, { a: -0.81, b: -0.92, c: 0, d: 0 },
      r => ({ a: r.range(-1, 1), b: r.range(-1, 1), c: 0, d: 0 }),
      (st, r) => { st[0] = 1 + j(r, 0.2); st[1] = 1 + j(r, 0.2); },
      (a, b) => st => { const x = st[0], y = st[1]; st[0] = Math.sin(x * y / b) * y + Math.cos(a * x - y); st[1] = x + Math.sin(y) / b; }),
    tinkerbell: mapSys('Tinkerbell', 4, { a: 0.9, b: -0.6013, c: 2.0, d: 0.5 },
      r => ({ a: r.range(0.3, 1), b: r.range(-0.9, -0.3), c: r.range(1.5, 2.5), d: r.range(0.2, 0.9) }),
      (st, r) => { st[0] = -0.72 + j(r, 0.1); st[1] = -0.64 + j(r, 0.1); },
      (a, b, c, d) => st => { const x = st[0], y = st[1]; st[0] = x * x - y * y + a * x + b * y; st[1] = 2 * x * y + c * x + d * y; }),
    gumowski: mapSys('Gumowski-Mira', 3, { a: -0.7, b: 0.008, c: 0.05, d: 0 },
      r => ({ a: r.range(-1, 1), b: r.range(0.001, 0.05), c: r.range(0.01, 0.1), d: 0 }),
      (st, r) => { st[0] = 0.1 + j(r, 0.1); st[1] = 0.1 + j(r, 0.1); },
      (mu, alpha, sigma) => {
        const g = x => mu * x + 2 * (1 - mu) * x * x / (1 + x * x);
        return st => { const x = st[0], y = st[1]; const nx = y + alpha * (1 - sigma * y * y) * y + g(x); st[0] = nx; st[1] = -x + g(nx); };
      }),
    ikeda: mapSys('Ikeda', 4, { a: 1.0, b: 0.9, c: 0.4, d: 6.0 },
      r => ({ a: r.range(0.5, 1.2), b: r.range(0.7, 0.95), c: r.range(0.2, 0.6), d: r.range(4, 8) }),
      (st, r) => { st[0] = 0.1 + j(r, 0.2); st[1] = j(r, 0.2); },
      (a, b, c, d) => st => { const x = st[0], y = st[1]; const t = c - d / (1 + x * x + y * y), ct = Math.cos(t), s = Math.sin(t); st[0] = a + b * (x * ct - y * s); st[1] = b * (x * s + y * ct); }),
    hopalong: mapSys('Hopalong', 3, { a: 2.0, b: 1.0, c: 0.0, d: 0 },
      r => ({ a: r.range(-10, 10), b: r.range(-2, 2), c: r.range(-3, 3), d: 0 }),
      (st, r) => { st[0] = j(r, 0.1); st[1] = j(r, 0.1); },
      (a, b, c) => st => { const x = st[0], y = st[1]; st[0] = y - (x < 0 ? -1 : 1) * Math.sqrt(Math.abs(b * x - c)); st[1] = a - x; }),
    lorenz: flowSys('Lorenz', 3, { a: 10, b: 28, c: 2.667, d: 0 }, 0.002, { yaw: 0, pitch: 0 },
      r => ({ a: r.range(8, 14), b: r.range(22, 45), c: r.range(2, 3.5), d: 0 }),
      (st, r) => { st[0] = r.range(-10, 10); st[1] = r.range(-10, 10); st[2] = r.range(10, 30); },
      (s, rho, beta) => (x, y, z, k, o) => { k[o] = s * (y - x); k[o + 1] = x * (rho - z) - y; k[o + 2] = x * y - beta * z; }),
    rossler: flowSys('Rössler', 3, { a: 0.2, b: 0.2, c: 5.7, d: 0 }, 0.005, { yaw: 0, pitch: 60 },
      r => ({ a: r.range(0.1, 0.3), b: r.range(0.1, 0.3), c: r.range(4.5, 9), d: 0 }),
      (st, r) => { st[0] = r.range(-5, 5); st[1] = r.range(-5, 5); st[2] = r.range(0, 1); },
      (a, b, c) => (x, y, z, k, o) => { k[o] = -y - z; k[o + 1] = x + a * y; k[o + 2] = b + z * (x - c); }),
    aizawa: flowSys('Aizawa', 4, { a: 0.95, b: 0.7, c: 0.6, d: 3.5 }, 0.01, { yaw: 0, pitch: 10 },
      r => ({ a: r.range(0.85, 1.0), b: r.range(0.6, 0.8), c: r.range(0.5, 0.7), d: r.range(3, 4) }),
      (st, r) => { st[0] = 0.1 + j(r, 0.2); st[1] = j(r, 0.2); st[2] = j(r, 0.2); },
      (a, b, c, d) => (x, y, z, k, o) => {
        k[o] = (z - b) * x - d * y; k[o + 1] = d * x + (z - b) * y;
        k[o + 2] = c + a * z - z * z * z / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x * x * x;
      }),
    thomas: flowSys('Thomas', 1, { a: 0.208, b: 0, c: 0, d: 0 }, 0.02, { yaw: 45, pitch: -35 },
      r => ({ a: r.range(0.1, 0.21), b: 0, c: 0, d: 0 }),
      (st, r) => { st[0] = r.range(-1, 1); st[1] = r.range(-1, 1); st[2] = r.range(-1, 1); },
      b => (x, y, z, k, o) => { k[o] = Math.sin(y) - b * x; k[o + 1] = Math.sin(z) - b * y; k[o + 2] = Math.sin(x) - b * z; }),
    halvorsen: flowSys('Halvorsen', 1, { a: 1.89, b: 0, c: 0, d: 0 }, 0.0015, { yaw: 45, pitch: -35 },
      r => ({ a: r.range(1.4, 2.2), b: 0, c: 0, d: 0 }),
      (st, r) => { st[0] = r.range(-5, 5); st[1] = r.range(-5, 5); st[2] = r.range(-5, 5); },
      a => (x, y, z, k, o) => { k[o] = -a * x - 4 * y - 4 * z - y * y; k[o + 1] = -a * y - 4 * z - 4 * x - z * z; k[o + 2] = -a * z - 4 * x - 4 * y - x * x; }),
    harmonograph: {
      name: 'Harmonograph', kind: 'harm', n: 4, def: { a: 3, b: 0.01, c: 0.005, d: 1.571 }, dt: 0.001, view: { yaw: 0, pitch: 0 },
      roll: r => ({ a: r.pick([1.5, 2, 2, 2.5, 3, 3, 4, 5]) + (r() < 0.3 ? r.pick([-0.5, 0.5, 0.25]) : 0), b: r.range(0.002, 0.03), c: r.range(0.002, 0.012), d: r.range(0, TAU) }),
      start: st => { st[3] = 0; },
      // a = frequency ratio, b = detune, c = damping, d = phase. 2–4 pendulums per axis from the seed.
      make: (co, h, yaw, pitch, rng) => {
        const n = rng.int(2, 4);
        const ratios = [1, co.a, rng.pick([2, 3, 4, 5]), rng.pick([1.5, 2.5, 3, 5, 7])];
        const amps = [1, 0.75, 0.5, 0.4];
        const fx = [], fy = [], px = [], py = [], ax = [], ay = [], dx = [], dy = [];
        let dmin = Infinity;
        for (let i = 0; i < n; i++) {
          fx.push(ratios[i] + co.b * j(rng, 2)); fy.push(ratios[i] + co.b * j(rng, 2));
          px.push(co.d * (i + 1) + rng() * 0.5); py.push(co.d * (i + 1) + TAU / 4 + rng() * 0.5);
          ax.push(amps[i] * rng.range(0.8, 1.2)); ay.push(amps[i] * rng.range(0.8, 1.2));
          const d1 = co.c * rng.range(0.7, 1.3), d2 = co.c * rng.range(0.7, 1.3);
          dx.push(d1); dy.push(d2); dmin = Math.min(dmin, d1, d2);
        }
        const tEnd = Math.log(1 / 0.03) / Math.max(dmin, 1e-6);
        return st => {
          let t = st[3] + h;
          if (t > tEnd) t = 0;           // pen lifted: retrace (sharpens the same curve)
          st[3] = t;
          let X = 0, Y = 0;
          for (let i = 0; i < n; i++) {
            X += ax[i] * Math.sin(fx[i] * t + px[i]) * Math.exp(-dx[i] * t);
            Y += ay[i] * Math.sin(fy[i] * t + py[i]) * Math.exp(-dy[i] * t);
          }
          st[4] = X; st[5] = Y;
        };
      },
    },
  };
  SYSTEMS.custom = Object.assign(flowSys('Custom ODE', 4, { a: 10, b: 28, c: 2.667, d: 0 }, 0.002, { yaw: 0, pitch: 0 },
    // Reroll nudges the current coefficients by up to 15 per cent; random ones would mostly diverge.
    (r, s) => ({ a: s.a * (1 + r.range(-0.15, 0.15)), b: s.b * (1 + r.range(-0.15, 0.15)), c: s.c * (1 + r.range(-0.15, 0.15)), d: s.d * (1 + r.range(-0.15, 0.15)) }),
    (st, r) => { st[0] = r.range(-1, 1); st[1] = r.range(-1, 1); st[2] = r.range(-1, 1); },
    (a, b, c, d, s) => {
      const fx = compileOde(s.odeX, ODE_DEFAULTS.odeX), fy = compileOde(s.odeY, ODE_DEFAULTS.odeY), fz = compileOde(s.odeZ, ODE_DEFAULTS.odeZ);
      const env = new Float64Array(7);
      env[3] = a; env[4] = b; env[5] = c; env[6] = d;
      return (x, y, z, k, o) => { env[0] = x; env[1] = y; env[2] = z; k[o] = fx(env); k[o + 1] = fy(env); k[o + 2] = fz(env); };
    }), { custom: true });
  const SYS_KEYS = Object.keys(SYSTEMS);

  function resetWalker(sys, st, rng) {
    st[0] = st[1] = st[2] = st[3] = 0;
    sys.start(st, rng);
    st[4] = st[5] = st[6] = st[7] = 0;
  }
  function makeAdv(sys, co, s, rng) {
    return sys.make(co, s.dt, s.yaw * TAU / 360, s.pitch * TAU / 360, rng, s);
  }
  const bounded = st => st[4] * st[4] + st[5] * st[5] < 1e12;   // false for NaN too

  /* Quick quality check for rolled coefficients: bounded, not a fixed point / short cycle, not drifting away, not needle-thin. */
  function probe(sysKey, co, rng, state) {
    const sys = SYSTEMS[sysKey];
    if (sys.kind === 'harm') return true;
    const s = Object.assign({}, state, { dt: sys.dt * (sys.kind === 'flow' ? 3 : 1), yaw: 0, pitch: 0 });
    const adv = makeAdv(sys, co, s, rng);
    const nw = sys.kind === 'flow' ? 3 : 1, per = sys.kind === 'flow' ? 1500 : 4000;
    const xs = new Float64Array(nw * per), ys = new Float64Array(nw * per);
    let m = 0;
    for (let w = 0; w < nw; w++) {
      const st = new Float64Array(8); resetWalker(sys, st, rng);
      for (let k = 0; k < 300; k++) { adv(st); if (!bounded(st) || (sys.custom && !sane(st))) return false; }
      for (let k = 0; k < per; k++) { adv(st); if (!bounded(st) || (sys.custom && !sane(st)) || Math.abs(st[4]) > 1e5 || Math.abs(st[5]) > 1e5) return false; xs[m] = st[4]; ys[m] = st[5]; m++; }
    }
    const box = (lo, hi) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (let i = lo; i < hi; i++) { if (xs[i] < x0) x0 = xs[i]; if (xs[i] > x1) x1 = xs[i]; if (ys[i] < y0) y0 = ys[i]; if (ys[i] > y1) y1 = ys[i]; } return [x0, x1, y0, y1]; };
    const all = box(0, m), w = all[1] - all[0], h = all[3] - all[2];
    if (!(w > 1e-3 && h > 1e-3) || w / h > 12 || h / w > 12) return false;
    if (sys.kind === 'map') {   // drifting orbits (e.g. some Hopalong sets) keep growing
      const a = box(0, m >> 1), b = box(m >> 1, m);
      const ga = Math.max(a[1] - a[0], a[3] - a[2]), gb = Math.max(b[1] - b[0], b[3] - b[2]);
      if (gb > ga * 1.6) return false;
    }
    const G = 40, cells = new Uint8Array(G * G);
    let filled = 0;
    for (let i = 0; i < m; i++) {
      const cx = Math.min(G - 1, ((xs[i] - all[0]) / w * G) | 0), cy = Math.min(G - 1, ((ys[i] - all[2]) / h * G) | 0);
      const ci = cy * G + cx; if (!cells[ci]) { cells[ci] = 1; filled++; }
    }
    return filled >= G * G * 0.045;
  }
  function rollCoeffs(sysKey, rng, state) {
    const sys = SYSTEMS[sysKey];
    for (let t = 0; t < 60; t++) {
      const co = sys.roll(rng, state);
      for (const k in co) co[k] = Math.round(co[k] * 1000) / 1000;
      if (probe(sysKey, co, rng, state)) return co;
    }
    return sys.custom ? { a: state.a, b: state.b, c: state.c, d: state.d } : Object.assign({}, sys.def);
  }

  /* ================================================================
     schema
  ================================================================ */
  const sysOf = s => SYSTEMS[s.system] || SYSTEMS.clifford;
  const isFlow = s => sysOf(s).kind === 'flow';
  const isCustom = s => s.system === 'custom';
  const schema = [
    { group: 'System', key: 'system', label: 'System', type: 'seg', kind: 'geom', wrap: true,
      options: SYS_KEYS.map(k => [k, SYSTEMS[k].name]) },
    { group: 'System', key: 'odeX', label: 'dx/dt =', type: 'text', kind: 'geom', maxLength: 256, validate: checkOde, dimUnless: isCustom, activeOnly: true },
    { group: 'System', key: 'odeY', label: 'dy/dt =', type: 'text', kind: 'geom', maxLength: 256, validate: checkOde, dimUnless: isCustom, activeOnly: true },
    { group: 'System', key: 'odeZ', label: 'dz/dt =', type: 'text', kind: 'geom', maxLength: 256, validate: checkOde, dimUnless: isCustom, activeOnly: true,
      hint: 'Custom ODE: right-hand sides in x, y, z and the coefficients a, b, c, d below, integrated with the same RK4 step as the other flows. Functions sin cos tan asin acos atan atan2 sinh cosh tanh exp log sqrt abs min max pow floor sign, constants pi and e. A trajectory that passes 1e6 or becomes undefined stops the plate. A user-defined system is not validated.' },
    { group: 'System', key: 'a', label: 'a', type: 'range', kind: 'geom', min: -12, max: 30, step: 0.001, fmt: f3 },
    { group: 'System', key: 'b', label: 'b', type: 'range', kind: 'geom', min: -12, max: 30, step: 0.001, fmt: f3, dimUnless: s => sysOf(s).n >= 2 },
    { group: 'System', key: 'c', label: 'c', type: 'range', kind: 'geom', min: -12, max: 30, step: 0.001, fmt: f3, dimUnless: s => sysOf(s).n >= 3 },
    { group: 'System', key: 'd', label: 'd', type: 'range', kind: 'geom', min: -12, max: 30, step: 0.001, fmt: f3, dimUnless: s => sysOf(s).n >= 4 },
    { group: 'System', key: 'reroll', label: 'Reroll coefficients', type: 'action' },
    { group: 'System', key: 'dt', label: 'Time step', type: 'range', kind: 'geom', min: 0.0005, max: 0.1, step: 0.0005, fmt: v => v.toFixed(4), dimUnless: s => sysOf(s).kind !== 'map',
      hint: 'Integration step for the 3D flows and the harmonograph pen. Smaller = smoother lines, more points needed.' },
    { group: 'System', key: 'burnIn', label: 'Burn-in', type: 'range', kind: 'geom', min: 0, max: 5000, step: 50, dimUnless: s => sysOf(s).kind !== 'harm',
      hint: 'Iterations discarded before drawing, so the transient from the starting point does not show.' },
    // ---- Points
    { group: 'Points', key: 'points', label: 'Points target', type: 'range', kind: 'live', min: 500000, max: 50000000, step: 500000, fmt: fmtM },
    { group: 'Points', key: 'ppf', label: 'Points per frame', type: 'range', kind: 'live', min: 20000, max: 500000, step: 10000, fmt: fmtM },
    // ---- Framing
    { group: 'Framing', key: 'zoom', label: 'Zoom', type: 'range', kind: 'geom', min: 0.25, max: 4, step: 0.01, fmt: f2 },
    { group: 'Framing', key: 'offsetX', label: 'Offset x', type: 'range', kind: 'geom', min: -1, max: 1, step: 0.01, fmt: f2 },
    { group: 'Framing', key: 'offsetY', label: 'Offset y', type: 'range', kind: 'geom', min: -1, max: 1, step: 0.01, fmt: f2 },
    { group: 'Framing', key: 'rotation', label: 'Rotation', type: 'range', kind: 'geom', min: 0, max: 360, step: 1, fmt: deg },
    { group: 'Framing', key: 'yaw', label: 'Yaw (3D)', type: 'range', kind: 'geom', min: 0, max: 360, step: 1, fmt: deg, dimUnless: isFlow },
    { group: 'Framing', key: 'pitch', label: 'Pitch (3D)', type: 'range', kind: 'geom', min: -90, max: 90, step: 1, fmt: deg, dimUnless: isFlow },
    { group: 'Framing', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'geom', wrap: true, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['2:3', '2:3'], ['16:9', '16:9']] },
    { group: 'Framing', key: 'res', label: 'Internal resolution', type: 'seg', kind: 'geom', options: [['800', '800'], ['1200', '1200'], ['1600', '1600'], ['2400', '2400']],
      hint: 'Density buffer size on the long side. Higher is sharper but needs more points to fill in.' },
    // ---- Color
    { group: 'Color', key: 'tone', label: 'Tone map', type: 'seg', kind: 'paint', options: [['log', 'Log'], ['power', 'Power']] },
    { group: 'Color', key: 'exposure', label: 'Exposure', type: 'range', kind: 'paint', min: 0.1, max: 8, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'gamma', label: 'Gamma', type: 'range', kind: 'paint', min: 0.3, max: 3, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'colorMode', label: 'Color by', type: 'seg', kind: 'geom', options: [['density', 'Density'], ['velocity', 'Velocity'], ['direction', 'Direction']] },
    { group: 'Color', key: 'colorMix', label: 'Color mix', type: 'range', kind: 'paint', min: 0, max: 1, step: 0.05, fmt: f2, dimUnless: s => s.colorMode !== 'density' },
    { group: 'Color', key: 'blur', label: 'Smoothing', type: 'range', kind: 'paint', min: 0, max: 4, step: 0.25, fmt: f2 },
    { group: 'Color', key: 'sortRamp', label: 'Sort ramp by contrast', type: 'toggle', kind: 'paint' },
    { group: 'Color', key: 'invert', label: 'Invert', type: 'toggle', kind: 'paint' },
  ];

  const defaults = {
    system: 'clifford', a: -1.4, b: 1.6, c: 1.0, d: 0.7, dt: 0.01, burnIn: 500,
    odeX: ODE_DEFAULTS.odeX, odeY: ODE_DEFAULTS.odeY, odeZ: ODE_DEFAULTS.odeZ,
    points: 4000000, ppf: 150000,
    zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, yaw: 0, pitch: 0, aspect: '1:1', res: '1200',
    tone: 'log', exposure: 1, gamma: 1, colorMode: 'density', colorMix: 0.6, blur: 0, sortRamp: false, invert: false,
  };

  const P = Studio.PALETTES;
  const base = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, yaw: 0, pitch: 0, res: '1200', tone: 'log', exposure: 1, gamma: 1, colorMode: 'density', colorMix: 0.6, blur: 0, sortRamp: false, invert: false, burnIn: 500, ppf: 150000 };
  const pre = (p, palette) => ({ label: p.label, palette, p: Object.assign({}, base, p, { label: undefined }) });
  const presets = {
    clifford: pre({ label: 'Clifford classic', system: 'clifford', a: -1.4, b: 1.6, c: 1.0, d: 0.7, dt: 0.01, points: 4000000, aspect: '1:1', exposure: 1.2, gamma: 1 }, P.xray),
    dejong: pre({ label: 'De Jong veil', system: 'dejong', a: 1.4, b: -2.3, c: 2.4, d: -2.1, dt: 0.01, points: 5000000, aspect: '1:1', exposure: 1, gamma: 1, colorMode: 'velocity', colorMix: 0.55 }, P.nightshade),
    svensson: pre({ label: 'Svensson silk', system: 'svensson', a: 1.4, b: 1.56, c: 1.4, d: -6.56, dt: 0.01, points: 5000000, aspect: '5:4', exposure: 1.1, gamma: 1 }, P.bioluminescent),
    lorenz: pre({ label: 'Lorenz butterfly', system: 'lorenz', a: 10, b: 28, c: 2.667, d: 0, dt: 0.002, points: 4000000, aspect: '5:4', yaw: 0, pitch: 0, exposure: 1.4, gamma: 1, colorMode: 'velocity', colorMix: 0.7 }, P.ember),
    rossler: pre({ label: 'Rössler', system: 'rossler', a: 0.2, b: 0.2, c: 5.7, d: 0, dt: 0.005, points: 4000000, aspect: '1:1', yaw: 0, pitch: 60, exposure: 1.3, gamma: 1, colorMode: 'velocity', colorMix: 0.5 }, P.glacier),
    aizawa: pre({ label: 'Aizawa', system: 'aizawa', a: 0.95, b: 0.7, c: 0.6, d: 3.5, dt: 0.01, points: 4000000, aspect: '4:5', yaw: 0, pitch: 10, exposure: 1.2, gamma: 1, colorMode: 'direction', colorMix: 0.5 }, P.thermal),
    thomas: pre({ label: 'Thomas', system: 'thomas', a: 0.208, b: 0, c: 0, d: 0, dt: 0.02, points: 5000000, aspect: '1:1', yaw: 45, pitch: -35, exposure: 1.2, gamma: 1, colorMode: 'velocity', colorMix: 0.6 },
      { bg: '#EFEADF', colors: ['#63A69F', '#2A6F6B', '#8C3B2F', '#1B2A2A'] }),
    harmonograph: pre({ label: 'Harmonograph', system: 'harmonograph', a: 3, b: 0.01, c: 0.005, d: 1.571, dt: 0.001, points: 3000000, aspect: '1:1', exposure: 1, gamma: 1, colorMode: 'velocity', colorMix: 0.5 },
      { bg: '#E9E7E2', colors: ['#C8C4BB', '#8C8C8C', '#4A4A4A', '#1A1A1A'] }),
    gumowski: pre({ label: 'Gumowski-Mira', system: 'gumowski', a: -0.7, b: 0.008, c: 0.05, d: 0, dt: 0.01, points: 4000000, aspect: '1:1', exposure: 1.2, gamma: 1 },
      { bg: '#F1E8D8', colors: ['#E8A33C', '#C4472B', '#2E4A62', '#1E1B18'] }),
    ikeda: pre({ label: 'Ikeda', system: 'ikeda', a: 1.0, b: 0.9, c: 0.4, d: 6.0, dt: 0.01, points: 4000000, aspect: '4:5', exposure: 1.2, gamma: 1, colorMode: 'direction', colorMix: 0.45 },
      { bg: '#ECEFEA', colors: ['#C9D6DF', '#4F7CAC', '#E07A5F', '#1F3A5F'] }),
  };

  /* ================================================================
     color helpers
  ================================================================ */
  function rampColors(s) {
    if (!s.sortRamp) return s.palette;
    const light = U.isLight(s.bg);
    return s.palette.slice().sort((a, b) => light ? U.luminance(b) - U.luminance(a) : U.luminance(a) - U.luminance(b));
  }

  /* Robust "white point": density at the 99.7th percentile of hit pixels. */
  function densityRef(d, N) {
    const stride = Math.max(1, Math.floor(N / 1.5e6));
    let max = 0;
    for (let i = 0; i < N; i += stride) if (d[i] > max) max = d[i];
    if (max <= 0) return 1;
    const lm = Math.log1p(max), B = 512, hist = new Uint32Array(B);
    let cnt = 0;
    for (let i = 0; i < N; i += stride) { const v = d[i]; if (v > 0) { hist[Math.min(B - 1, (Math.log1p(v) / lm * B) | 0)]++; cnt++; } }
    const target = cnt * 0.997;
    let acc = 0, b = 0;
    for (; b < B - 1; b++) { acc += hist[b]; if (acc >= target) break; }
    return Math.max(1, Math.expm1((b + 1) / B * lm));
  }
  /* 2%..98% range of the per-pixel average color value (velocity or direction). */
  function colorRange(col, d, N) {
    const stride = Math.max(1, Math.floor(N / 1.5e6));
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < N; i += stride) { const dd = d[i]; if (dd > 0) { const v = col[i] / dd; if (v < lo) lo = v; if (v > hi) hi = v; } }
    if (!(hi > lo)) return [0, 1];
    const B = 256, hist = new Uint32Array(B), sc = B / (hi - lo);
    let cnt = 0;
    for (let i = 0; i < N; i += stride) { const dd = d[i]; if (dd > 0) { hist[Math.min(B - 1, ((col[i] / dd - lo) * sc) | 0)]++; cnt++; } }
    let acc = 0, b0 = 0, b1 = B - 1;
    for (let b = 0; b < B; b++) { acc += hist[b]; if (acc >= cnt * 0.02) { b0 = b; break; } }
    acc = 0;
    for (let b = B - 1; b >= 0; b--) { acc += hist[b]; if (acc >= cnt * 0.02) { b1 = b; break; } }
    if (b1 <= b0) b1 = b0 + 1;
    return [lo + b0 / sc, lo + (b1 + 1) / sc];
  }
  /* Separable gaussian blur of src into dst (tmp is scratch), all Float32Array(W*H). */
  function gaussBlur(src, dst, tmp, W, H, sigma) {
    const r = Math.max(1, Math.ceil(sigma * 2.5)), wts = new Float32Array(r + 1);
    let sum = 0;
    for (let i = 0; i <= r; i++) { wts[i] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += i ? 2 * wts[i] : wts[i]; }
    for (let i = 0; i <= r; i++) wts[i] /= sum;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        let v = src[row + x] * wts[0];
        for (let k = 1; k <= r; k++) {
          const xl = x - k < 0 ? 0 : x - k, xr = x + k >= W ? W - 1 : x + k;
          v += (src[row + xl] + src[row + xr]) * wts[k];
        }
        tmp[row + x] = v;
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let v = tmp[y * W + x] * wts[0];
        for (let k = 1; k <= r; k++) {
          const yu = y - k < 0 ? 0 : y - k, yd = y + k >= H ? H - 1 : y + k;
          v += (tmp[yu * W + x] + tmp[yd * W + x]) * wts[k];
        }
        dst[y * W + x] = v;
      }
    }
  }

  /* ================================================================
     accumulator: density (+ color) buffers for one seed/state at W x H
  ================================================================ */
  function buildAcc(s, W, H) {
    const sys = sysOf(s);
    const rng = U.makeRng(s.seed);
    const co = { a: s.a, b: s.b, c: s.c, d: s.d };
    const adv = makeAdv(sys, co, s, rng);
    const nw = sys.kind === 'flow' ? FLOW_WALKERS : 1;
    const walkers = [];
    for (let i = 0; i < nw; i++) { const st = new Float64Array(8); resetWalker(sys, st, rng); walkers.push(st); }
    const rot = s.rotation * TAU / 360;
    const A = {
      sys, adv, walkers, rng, W, H, N: W * H, guard: !!sys.custom, diverged: null,
      dens: new Float32Array(W * H), col: new Float32Array(W * H), count: 0,
      colorMode: s.colorMode === 'velocity' ? 1 : s.colorMode === 'direction' ? 2 : 0,
      cr: Math.cos(rot), sr: Math.sin(rot), fs: 1, cx: 0, cy: 0, ox: W / 2, oy: H / 2,
    };
    const burn = sys.kind === 'harm' ? 0 : s.burnIn;
    for (const st of walkers) {
      for (let k = 0; k < burn && !A.diverged; k++) {
        adv(st);
        if (!bounded(st) || (A.guard && !sane(st))) {
          if (A.guard) A.diverged = 'during burn-in';
          else resetWalker(sys, st, rng);
        }
      }
    }
    frameAcc(A, s);
    return A;
  }

  /* Auto-frame: sample the (rotated, projected) attractor and fit its 0.1–99.9 percentile box. */
  function frameAcc(A, s) {
    const { sys, adv, walkers, rng, W, H, cr, sr } = A;
    const n = sys.kind === 'flow' ? 48000 : 24000, per = Math.ceil(n / walkers.length);
    const xs = new Float64Array(n), ys = new Float64Array(n);
    let m = 0;
    for (const st of walkers) {
      for (let k = 0; k < per && m < n && !A.diverged; k++) {
        adv(st);
        if (!bounded(st) || (A.guard && !sane(st))) {
          if (A.guard) { A.diverged = 'while framing'; break; }
          resetWalker(sys, st, rng); continue;
        }
        const X = st[4], Y = st[5];
        xs[m] = X * cr - Y * sr; ys[m] = X * sr + Y * cr; m++;
      }
    }
    let x0 = -1, x1 = 1, y0 = -1, y1 = 1;
    if (m > 10) {
      const sx = xs.subarray(0, m).sort(), sy = ys.subarray(0, m).sort();
      const lo = Math.floor(m * 0.001), hi = Math.max(lo + 1, Math.ceil(m * 0.999) - 1);
      x0 = sx[lo]; x1 = sx[hi]; y0 = sy[lo]; y1 = sy[hi];
    }
    const w = Math.max(x1 - x0, 1e-6), h = Math.max(y1 - y0, 1e-6);
    const fit = Math.min(W * (1 - 2 * FRAME_MARGIN) / w, H * (1 - 2 * FRAME_MARGIN) / h);
    A.fs = fit * s.zoom;
    A.cx = (x0 + x1) / 2; A.cy = (y0 + y1) / 2;
    A.ox = W / 2 + s.offsetX * W / 2; A.oy = H / 2 - s.offsetY * H / 2;
  }

  /* Iterate n more points into the buffers (round-robin over walkers). */
  function accumulate(A, n) {
    const { sys, adv, walkers, rng, W, H, dens, col, fs, cx, cy, ox, oy, cr, sr, colorMode, guard } = A;
    if (A.diverged) return;
    const per = Math.ceil(n / walkers.length), INV_TAU = 1 / TAU;
    for (const st of walkers) {
      let pxr = st[6], pyr = st[7];
      for (let k = 0; k < per; k++) {
        adv(st);
        if (!bounded(st) || (guard && !sane(st))) {
          if (guard) { A.diverged = 'after ' + fmtM(A.count) + ' points'; return; }
          resetWalker(sys, st, rng); pxr = 0; pyr = 0; continue;
        }
        const X = st[4], Y = st[5];
        const xr = X * cr - Y * sr, yr = X * sr + Y * cr;
        const fx = (xr - cx) * fs + ox, fy = oy - (yr - cy) * fs;
        if (fx >= 0 && fx < W && fy >= 0 && fy < H) {
          const idx = (fy | 0) * W + (fx | 0);
          dens[idx] += 1;
          if (colorMode === 1) col[idx] += Math.sqrt((xr - pxr) * (xr - pxr) + (yr - pyr) * (yr - pyr)) * fs;
          else if (colorMode === 2) col[idx] += Math.atan2(yr - pyr, xr - pxr) * INV_TAU + 0.5;
        }
        pxr = xr; pyr = yr;
      }
      st[6] = pxr; st[7] = pyr;
    }
    A.count += per * walkers.length;
  }

  /* Tone-map the buffers into an RGBA byte array. blurScale converts the smoothing radius to this buffer's pixels. */
  function toneMap(A, s, rgba, blurScale, scratch) {
    const { W, H, N } = A;
    let dens = A.dens, col = A.col;
    const sigma = s.blur * blurScale;
    if (sigma > 0.05) {
      gaussBlur(A.dens, scratch.a, scratch.tmp, W, H, sigma); dens = scratch.a;
      if (A.colorMode) { gaussBlur(A.col, scratch.b, scratch.tmp, W, H, sigma); col = scratch.b; }
    }
    const ref = densityRef(dens, N), invRef = 1 / ref;
    const colors = rampColors(s);
    const lut = U.makeRampLUT(colors, s.bg, LUT_N);
    const hue = U.makeRampLUT(colors, null, LUT_N);
    const bg = U.hexToRgb(s.bg);
    const invert = s.invert, mix = A.colorMode ? s.colorMix : 0;
    const zero = invert ? [lut[(LUT_N - 1) * 3], lut[(LUT_N - 1) * 3 + 1], lut[(LUT_N - 1) * 3 + 2]] : bg;
    const z0 = zero[0], z1 = zero[1], z2 = zero[2];
    let clo = 0, cscale = 1;
    if (mix > 0) { const r = colorRange(col, dens, N); clo = r[0]; cscale = 1 / (r[1] - r[0]); }
    const useLog = s.tone === 'log', K = 30 * s.exposure * s.exposure, invLog = 1 / Math.log1p(K), expo = s.exposure, gam = s.gamma;
    const L = LUT_N - 1;
    for (let i = 0, o = 0; i < N; i++, o += 4) {
      const d = dens[i];
      if (d <= 0) { rgba[o] = z0; rgba[o + 1] = z1; rgba[o + 2] = z2; rgba[o + 3] = 255; continue; }
      let t = useLog ? Math.log1p(d * invRef * K) * invLog : d * invRef * expo;
      if (t > 1) t = 1;
      if (gam !== 1) t = Math.pow(t, gam);
      const li = ((invert ? 1 - t : t) * L | 0) * 3;
      let r = lut[li], g = lut[li + 1], b = lut[li + 2];
      if (mix > 0) {
        let hv = (col[i] / d - clo) * cscale;
        hv = hv < 0 ? 0 : hv > 1 ? 1 : hv;
        const hi = (hv * L | 0) * 3;
        r += (z0 + (hue[hi] - z0) * t - r) * mix;
        g += (z1 + (hue[hi + 1] - z1) * t - g) * mix;
        b += (z2 + (hue[hi + 2] - z2) * t - b) * mix;
      }
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = 255;
    }
  }

  function bufferSize(s) {
    const res = Number(s.res) || 1200, ar = ASPECTS[s.aspect] || 1;
    return ar >= 1 ? [Math.round(res / ar), res] : [res, Math.round(res * ar)];
  }
  function makeScratch(N) { return { a: new Float32Array(N), b: new Float32Array(N), tmp: new Float32Array(N) }; }

  /* ================================================================
     module
  ================================================================ */
  Studio.register({
    id: 'attractors', name: 'Attractors', subtitle: 'strange attractors and harmonographs as density maps · 1963', equation: 'x(n+1) = f(xn, yn; a,b,c,d) - iterate, accumulate density, tone-map', credit: "Lorenz system: Edward Lorenz, 'Deterministic nonperiodic flow', 1963. Rossler followed in 1976, Thomas in 1999; the 2D maps were popularized by Clifford Pickover and Peter de Jong. Harmonographs are Victorian drawing machines from the 1840s. Typed formula entry follows VisualPDE (Walker, Townsend, Chudasama and Krause, Bull. Math. Biol., 2023).", order: 90,
    blurb: 'A strange attractor is the shape a chaotic system keeps returning to: iterate a simple map or integrate a small set of differential equations, and although no two steps ever repeat, the orbit is confined to a folded, fractal set. Counting how often the orbit lands on each pixel turns that set into a density map — the bright veins are the folds where the dynamics pile up. Harmonographs are the mechanical cousin: damped pendulums summed into a pen path, tracing Lissajous curves that slowly drift as the frequencies beat against each other. Custom ODE lets you type the three right-hand sides of your own flow, which opens on the Lorenz equations written out; the equations travel in the link, and nothing checks a system you type against theory.',
    schema, defaults, presets,
    hints: {
      System: 'Coefficients mean different things per system. Clifford, De Jong, Svensson, Tinkerbell, Ikeda and Aizawa use all four; Gumowski-Mira uses a (μ), b (α), c (σ); Hopalong a, b, c; Lorenz a = σ, b = ρ, c = β; Rössler a, b, c; Bedhead a, b; Thomas and Halvorsen only a. Harmonograph: a = frequency ratio, b = detune, c = damping, d = phase. Unused coefficients are dimmed. Reroll draws a new set from the seed and keeps only sets that pass a quick “is it interesting” test.',
      Framing: 'The attractor is auto-framed from a sample of its orbit; zoom, offset and rotation adjust that frame. Yaw and pitch orient the 3D flows before they are flattened onto the canvas.',
      Color: 'Density is tone-mapped through the palette, starting at the background. Velocity and direction coloring tint each pixel by how fast, or which way, the orbit moves there.',
    },
    closedGroups: ['Framing'],
    palette: true, defaultPalette: 'xray', paletteLabel: 'Colors (ramp from background → last)',
    headline: 'points', headlineLabel: 'points',

    surprise(rng) {
      const key = rng.pick(['clifford', 'clifford', 'dejong', 'dejong', 'svensson', 'svensson', 'bedhead', 'tinkerbell', 'gumowski', 'ikeda', 'hopalong', 'lorenz', 'rossler', 'aizawa', 'thomas', 'halvorsen', 'harmonograph']);
      const sys = SYSTEMS[key], co = rollCoeffs(key, rng), flow = sys.kind === 'flow';
      const log = rng() < 0.8;
      return {
        system: key, a: co.a, b: co.b, c: co.c, d: co.d, dt: sys.dt, burnIn: 500,
        yaw: flow ? rng.int(0, 359) : 0, pitch: flow ? rng.int(-70, 70) : 0,
        rotation: sys.kind === 'map' ? rng.pick([0, 0, 90, 180, 270]) : 0,
        zoom: rng.range(0.95, 1.15), offsetX: 0, offsetY: 0,
        aspect: rng.pick(['1:1', '1:1', '4:5', '5:4']), res: '1200',
        colorMode: rng.pick(['density', 'density', 'velocity', 'direction']), colorMix: rng.range(0.4, 0.8),
        tone: log ? 'log' : 'power', exposure: log ? rng.range(0.7, 1.6) : rng.range(1.5, 3), gamma: rng.range(0.85, 1.25),
        blur: rng() < 0.3 ? rng.pick([0.5, 0.75, 1]) : 0, invert: rng() < 0.1, sortRamp: true,
        points: rng.pick([3000000, 4000000, 6000000]), ppf: 150000,
      };
    },
    onParam(s, key) {
      if (key === 'system') {   // switching system loads its known-good coefficients, step and view
        const sys = sysOf(s);
        Object.assign(s, sys.def, { dt: sys.dt, yaw: sys.view.yaw, pitch: sys.view.pitch });
      }
    },

    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d');
      const img = document.createElement('canvas');
      const ictx = img.getContext('2d');
      let imageData = null, scratch = null;
      let A = null, raf = 0, done = false, lastDrawMs = 0, nextDrawAt = 0, rollIndex = 0;

      function ensureBuffers(W, H) {
        if (img.width !== W || img.height !== H || !imageData) {
          img.width = W; img.height = H;
          imageData = ictx.createImageData(W, H);
          scratch = makeScratch(W * H);
        }
      }
      function blit() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = host.getState().bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      // A custom system says it is user-defined and makes no claim; a diverged one says where it stopped.
      // The typed equations appear only as escaped text in a tooltip.
      function status(s) {
        let tail = '';
        if (A.sys.custom) {
          const tip = U.escapeHtml('dx/dt = ' + s.odeX + ', dy/dt = ' + s.odeY + ', dz/dt = ' + s.odeZ);
          tail = A.diverged
            ? '<span title="' + tip + '">diverged ' + A.diverged + ': a coordinate passed 1e6 or became undefined · stopped</span>'
            : '<span title="' + tip + '">user-defined, not validated</span>';
        }
        host.setStatus('<span><b>' + fmtM(Math.min(A.count, s.points)) + '</b> / ' + fmtM(s.points) + ' points</span><span>' + A.sys.name + (A.diverged ? '' : done ? ' · done' : '') + '</span>' + tail);
      }
      function draw() {
        const s = host.getState();
        const t0 = performance.now();
        toneMap(A, s, imageData.data, 1, scratch);
        ictx.putImageData(imageData, 0, 0);
        blit();
        lastDrawMs = performance.now() - t0;
        nextDrawAt = performance.now() + lastDrawMs * 1.5;
        status(s);
      }
      function accumulateFor(budgetMs, maxPoints) {
        const t0 = performance.now();
        let n = 0;
        while (n < maxPoints && !A.diverged) {
          const step = Math.min(CHUNK, maxPoints - n);
          accumulate(A, step); n += step;
          if (performance.now() - t0 > budgetMs) break;
        }
      }

      function frame() {
        raf = 0;
        const s = host.getState();
        const remaining = s.points - A.count;
        if (remaining > 0) accumulateFor(FRAME_BUDGET_MS, Math.min(s.ppf, remaining));
        done = A.count >= s.points || !!A.diverged;
        if (done || performance.now() >= nextDrawAt) draw();
        if (!done && host.isActive()) raf = requestAnimationFrame(frame);
      }
      function start() {
        cancelAnimationFrame(raf); raf = 0;
        if (!done && !host.reducedMotion()) raf = requestAnimationFrame(frame);
      }

      function applyCoeffs(co) {
        // Push the new coefficients through the shell's own sliders so the sidebar, persistence and the
        // debounced regenerate all stay in sync; fall back to a direct write if the sidebar is not built.
        const s = host.getState();
        let viaUi = true;
        for (const k of ['a', 'b', 'c', 'd']) {
          const el = document.getElementById('p-attractors-' + k);
          if (el && el.type === 'range') { el.value = co[k]; el.dispatchEvent(new Event('input', { bubbles: true })); }
          else { s[k] = co[k]; viaUi = false; }
        }
        return viaUi;
      }

      const inst = {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        regenerate() {
          cancelAnimationFrame(raf); raf = 0;
          const s = host.getState();
          const [W, H] = bufferSize(s);
          ensureBuffers(W, H);
          A = buildAcc(s, W, H);
          done = false;
          if (host.reducedMotion()) {
            const t0 = performance.now();
            while (A.count < s.points && !A.diverged && performance.now() - t0 < REDUCED_MOTION_BUDGET_MS) accumulate(A, Math.min(1e6, s.points - A.count));
            done = true;
          } else {
            accumulateFor(FRAME_BUDGET_MS * 2, Math.min(s.ppf, s.points));
            done = A.count >= s.points || !!A.diverged;
          }
          draw();
          start();
        },
        repaint() { if (A) draw(); },
        live(key) {
          if (key === 'points' && A) {
            const s = host.getState();
            done = A.count >= s.points || !!A.diverged;
            status(s);
            if (!done && !raf) start();
          }
        },
        resize() { if (A) blit(); },
        pause() { cancelAnimationFrame(raf); raf = 0; },
        resume() { if (!raf) start(); },
        action(key) {
          if (key !== 'reroll') return;
          const s = host.getState();
          rollIndex++;
          const co = rollCoeffs(s.system, U.makeRng(s.seed + '/roll/' + rollIndex), s);
          if (!applyCoeffs(co)) this.regenerate();
        },
        async exportPNG(w, h) {
          const s = host.getState();
          const wasRunning = !!raf;
          this.pause();
          try {
            // Accumulate at up to EXPORT_MAX_RES on the long side, then upscale — beyond that, points get too sparse to fill in.
            const k = Math.min(1, EXPORT_MAX_RES / Math.max(w, h));
            const W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
            const E = buildAcc(s, W, H);
            const screenArea = A ? (A.W * A.H) : (W * H);
            const want = s.points * (W * H) / Math.max(1, screenArea);
            const target = Math.min(EXPORT_CAP, Math.max(1, want));
            inst.exportNote = want > EXPORT_CAP
              ? ' Point budget capped at ' + EXPORT_CAP.toLocaleString() + ' for this sheet (asked for ' + Math.round(want).toLocaleString() + ').'
              : '';
            while (E.count < target && !E.diverged) {
              accumulate(E, Math.min(1e6, target - E.count));
              await new Promise(r => setTimeout(r, 0));
            }
            const out = document.createElement('canvas');
            out.width = W; out.height = H;
            const octx = out.getContext('2d');
            const id = octx.createImageData(W, H);
            toneMap(E, s, id.data, A ? (W / A.W) : 1, makeScratch(W * H));
            octx.putImageData(id, 0, 0);
            return U.toBlob(k < 1 ? U.upscale(out, w, h, true) : out);
          } finally {
            if (wasRunning) this.resume();
          }
        },
      };
      return inst;
    },
  });
})();

