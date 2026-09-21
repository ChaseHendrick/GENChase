
/* modules/eight.js */
/* GENChase: Moore–Chenciner–Montgomery figure-eight three-body choreography. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // C. Simó's 16-digit Euler IC, as tabulated after Simó, Contemp. Math. 292, 209 (2002).
  // Equal masses m = 1, G = 1. Body 3 sits at the origin. Linear and angular momentum vanish.
  const X1 = 0.970004356883304;
  const Y1 = -0.243087537752473;
  const VX1 = 0.466203685572010;
  const VY1 = 0.432365731646229;
  const PERIOD = 6.325913982926396;
  const N_STEP = 9600;
  const N_DRAW = 2400;
  const VIEWS = ['world', 'space', 'braid', 'shape', 'beads', 'polar'];
  const METAL_FALLBACK = ['#D4B05A', '#C06E3A', '#8A96A3'];

  const SCHEMA = [
    { group: 'Sheet', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    { group: 'Orbit', key: 'kind', label: 'Orbit', type: 'seg', kind: GEOM, options: [['eight', 'Eight'], ['broken', 'Broken']], hint: 'Eight is Simó’s choreography. Broken is a nearby Euler IC that does not close: |L| stays 0, the return does not.' },
    RANGE('Orbit', 'periods', 'Periods', GEOM, 1, 4, 1, v => (v | 0) + ''),
    { group: 'Orbit', key: 'running', label: 'Run', type: 'toggle', kind: LIVE, hint: 'Advance the three beads along the computed eight. The trails stay; only the beads move.' },
    RANGE('Orbit', 'speed', 'Pace', LIVE, 0.2, 2.4, 0.05, f2, { dimUnless: s => s.running }),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['world', 'World'], ['space', 'Spacetime'], ['braid', 'Braid'], ['shape', 'Shape'], ['beads', 'Beads'], ['polar', 'Wreath']] },
    RANGE('Picture', 'zoom', 'View', PAINT, 0.45, 2.8, 0.05, f2),
    RANGE('Picture', 'lift', 'Ribbon', PAINT, 0, 0.14, 0.005, f2, { hint: 'Separate the three worldlines along the local normal so the eight reads as a three-metal ribbon.' }),
    RANGE('Picture', 'fade', 'Fade', PAINT, 0, 1, 0.05, f2, { hint: 'Time as stroke fade. 0 keeps the whole trail; 1 keeps only the recent chase.' }),
    RANGE('Picture', 'weight', 'Weight', PAINT, 0.4, 2.2, 0.05, f2),
    RANGE('Picture', 'panX', 'Pan X', PAINT, -0.6, 0.6, 0.02, f2),
    RANGE('Picture', 'panY', 'Pan Y', PAINT, -0.6, 0.6, 0.02, f2),
  ];
  const DEFAULTS = {
    aspect: '1:1', kind: 'eight', periods: 1, running: false, speed: 0.85,
    view: 'world', zoom: 1.12, lift: 0.048, fade: 0.38, weight: 1.08, panX: 0, panY: 0,
  };
  const PRESETS = {
    eight: pre('Figure eight', { kind: 'eight', periods: 1, view: 'world', zoom: 1.12, lift: 0.048, fade: 0.38, weight: 1.08, panX: 0, panY: 0 }, Pal.ember),
    long: pre('Long trail', { kind: 'eight', periods: 2, view: 'world', zoom: 0.95, lift: 0.04, fade: 0.12, weight: 0.95, panX: 0, panY: 0 }, Pal.nightshade),
    braid: pre('Braid', { kind: 'eight', periods: 1, view: 'braid', zoom: 1.0, lift: 0.02, fade: 0.08, weight: 1.15, panX: 0, panY: 0 }, Pal.graphite),
    shape: pre('Shape space', { kind: 'eight', periods: 1, view: 'shape', zoom: 1.05, lift: 0, fade: 0.2, weight: 1.2, panX: 0, panY: 0 }, Pal.glacier),
    broken: pre('Broken nearby', { kind: 'broken', periods: 1, view: 'world', zoom: 0.58, lift: 0.04, fade: 0.15, weight: 0.95, panX: 0, panY: 0 }, Pal.thermal),
    three: pre('Three periods', { kind: 'eight', periods: 3, view: 'polar', zoom: 0.95, lift: 0.03, fade: 0.12, weight: 0.85, panX: 0, panY: 0 }, Pal.kiln),
    tight: pre('Tight crop', { kind: 'eight', periods: 1, view: 'world', zoom: 2.35, lift: 0.055, fade: 0.35, weight: 1.35, panX: 0.22, panY: 0.04 }, Pal.harbor),
  };

  function surprise(rng) {
    const kind = rng() < 0.12 ? 'broken' : 'eight';
    return {
      kind,
      periods: rng.pick([1, 1, 1, 2, 3]),
      view: rng.pick(['world', 'world', 'world', 'space', 'braid', 'shape', 'beads', 'polar']),
      zoom: rng.range(0.8, 1.4),
      lift: rng.range(0.02, 0.08),
      fade: rng.range(0.1, 0.6),
      weight: rng.range(0.8, 1.4),
      panX: 0, panY: 0,
    };
  }
  function sanitize(s) {
    s.periods = Math.max(1, Math.min(4, Math.round(Number(s.periods) || 1)));
    if (s.kind !== 'broken') s.kind = 'eight';
    if (VIEWS.indexOf(s.view) < 0) s.view = 'world';
    s.zoom = U.clamp(Number(s.zoom) || 1, 0.45, 2.8);
    s.lift = U.clamp(Number(s.lift) || 0, 0, 0.14);
    s.fade = U.clamp(Number(s.fade) || 0, 0, 1);
    s.weight = U.clamp(Number(s.weight) || 1, 0.4, 2.2);
    s.speed = U.clamp(Number(s.speed) || 0.85, 0.2, 2.4);
    s.panX = U.clamp(Number(s.panX) || 0, -0.6, 0.6);
    s.panY = U.clamp(Number(s.panY) || 0, -0.6, 0.6);
    s.running = !!s.running;
  }

  function initial(kind) {
    const kick = kind === 'broken' ? 1.08 : 1;
    const vx1 = VX1 * kick, vy1 = VY1 * kick;
    return {
      x: [X1, -X1, 0],
      y: [Y1, -Y1, 0],
      vx: [vx1, vx1, -2 * vx1],
      vy: [vy1, vy1, -2 * vy1],
    };
  }

  function accel(x, y, ax, ay) {
    ax[0] = ax[1] = ax[2] = 0;
    ay[0] = ay[1] = ay[2] = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const dx = x[j] - x[i], dy = y[j] - y[i];
        const r2 = dx * dx + dy * dy + 1e-18;
        const inv = 1 / (r2 * Math.sqrt(r2));
        ax[i] += dx * inv; ay[i] += dy * inv;
        ax[j] -= dx * inv; ay[j] -= dy * inv;
      }
    }
  }
  function leapfrog(s, dt, ax, ay) {
    for (let i = 0; i < 3; i++) {
      s.vx[i] += ax[i] * (dt * 0.5);
      s.vy[i] += ay[i] * (dt * 0.5);
      s.x[i] += s.vx[i] * dt;
      s.y[i] += s.vy[i] * dt;
    }
    accel(s.x, s.y, ax, ay);
    for (let i = 0; i < 3; i++) {
      s.vx[i] += ax[i] * (dt * 0.5);
      s.vy[i] += ay[i] * (dt * 0.5);
    }
  }
  const CBRT2 = Math.cbrt(2);
  const W1 = 1 / (2 - CBRT2);
  const W0 = -CBRT2 / (2 - CBRT2);
  function yoshida4(s, dt, ax, ay) {
    leapfrog(s, W1 * dt, ax, ay);
    leapfrog(s, W0 * dt, ax, ay);
    leapfrog(s, W1 * dt, ax, ay);
  }
  function energyOf(s) {
    let K = 0, V = 0;
    for (let i = 0; i < 3; i++) K += 0.5 * (s.vx[i] * s.vx[i] + s.vy[i] * s.vy[i]);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      V -= 1 / Math.hypot(s.x[j] - s.x[i], s.y[j] - s.y[i]);
    }
    return K + V;
  }
  function angMom(s) {
    let L = 0;
    for (let i = 0; i < 3; i++) L += s.x[i] * s.vy[i] - s.y[i] * s.vx[i];
    return L;
  }

  function integrate(kind, periods) {
    const s = initial(kind);
    const ax = [0, 0, 0], ay = [0, 0, 0];
    accel(s.x, s.y, ax, ay);
    const E0 = energyOf(s);
    const L0 = angMom(s);
    const x0 = s.x.slice(), y0 = s.y.slice();
    const nPer = periods | 0;
    const nInt = N_STEP * nPer;
    const dt = PERIOD / N_STEP;
    const stride = Math.max(1, (N_STEP / N_DRAW) | 0);
    const nSamp = Math.floor(nInt / stride) + 1;
    const px = [new Float64Array(nSamp), new Float64Array(nSamp), new Float64Array(nSamp)];
    const py = [new Float64Array(nSamp), new Float64Array(nSamp), new Float64Array(nSamp)];
    const vx = [new Float64Array(nSamp), new Float64Array(nSamp), new Float64Array(nSamp)];
    const vy = [new Float64Array(nSamp), new Float64Array(nSamp), new Float64Array(nSamp)];
    const tt = new Float64Array(nSamp);
    let k = 0, eMax = 0, dead = false;
    function rec(step) {
      if (k >= nSamp) return;
      for (let b = 0; b < 3; b++) {
        px[b][k] = s.x[b]; py[b][k] = s.y[b];
        vx[b][k] = s.vx[b]; vy[b][k] = s.vy[b];
      }
      tt[k] = step * dt;
      k++;
    }
    rec(0);
    for (let step = 1; step <= nInt; step++) {
      yoshida4(s, dt, ax, ay);
      if (!isFinite(s.x[0]) || !isFinite(s.y[1])) { dead = true; break; }
      if ((step & 31) === 0) {
        const dE = Math.abs(energyOf(s) - E0) / Math.max(1e-15, Math.abs(E0));
        if (dE > eMax) eMax = dE;
      }
      if (step % stride === 0) rec(step);
    }
    if (k < nSamp) rec(Math.min(nInt, k * stride));
    const E1 = energyOf(s);
    const L1 = angMom(s);
    let dq = 0;
    for (let i = 0; i < 3; i++) dq += (s.x[i] - x0[i]) * (s.x[i] - x0[i]) + (s.y[i] - y0[i]) * (s.y[i] - y0[i]);
    return {
      n: k, px, py, vx, vy, tt, periods: nPer,
      E0, dE: Math.abs(E1 - E0) / Math.max(1e-15, Math.abs(E0)), eMax,
      L0, L: L1, dq: Math.sqrt(dq), dead,
    };
  }

  function shapeAt(px, py, k) {
    const x1 = px[0][k], y1 = py[0][k], x2 = px[1][k], y2 = py[1][k], x3 = px[2][k], y3 = py[2][k];
    const rx = (x2 - x1) * Math.SQRT1_2, ry = (y2 - y1) * Math.SQRT1_2;
    const lx = Math.sqrt(1.5) * x3, ly = Math.sqrt(1.5) * y3;
    const r2 = rx * rx + ry * ry, l2 = lx * lx + ly * ly;
    const R2 = r2 + l2;
    if (R2 < 1e-18) return [0, 0];
    const n1 = (r2 - l2) / R2;
    const n2 = 2 * (rx * lx + ry * ly) / R2;
    return [n1, n2];
  }

  function metalsOf(s) {
    const pal = Array.isArray(s.palette) ? s.palette : [];
    const bg = s.bg || '#0D0C0B';
    const lb = U.luminance(bg);
    const ranked = pal.filter(c => c && Math.abs(U.luminance(c) - lb) > 22);
    const out = [];
    if (ranked.length >= 3) {
      out.push(ranked[ranked.length - 1], ranked[(ranked.length >> 1)], ranked[0]);
    } else {
      for (let i = 0; i < ranked.length; i++) out.push(ranked[i]);
      for (let i = 0; out.length < 3; i++) out.push(METAL_FALLBACK[i % 3]);
    }
    return out.slice(0, 3);
  }
  function rgba(hex, a) {
    const c = U.hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function sci(v) {
    const a = Math.abs(v);
    if (!isFinite(v)) return '∞';
    if (a === 0) return '0';
    if (a >= 0.01 && a < 100) return v.toFixed(3);
    return v.toExponential(1);
  }

  function mapPoint(view, tr, b, k, lift) {
    const x = tr.px[b][k], y = tr.py[b][k], t = tr.tt[k];
    if (view === 'shape') return shapeAt(tr.px, tr.py, k);
    if (view === 'braid') return [t / PERIOD, x];
    if (view === 'space') {
      const tn = t / PERIOD;
      return [x + 1.15 * tn, y + 0.30 * tn];
    }
    if (view === 'polar') {
      const th = U.TAU * (t / PERIOD);
      const c = Math.cos(th), sn = Math.sin(th);
      const R = 0.82;
      return [(R + 0.52 * x) * c - 0.52 * y * sn, (R + 0.52 * x) * sn + 0.52 * y * c];
    }
    const vx = tr.vx[b][k], vy = tr.vy[b][k];
    const sp = Math.hypot(vx, vy) || 1;
    const off = lift * (b - 1);
    return [x + off * (-vy / sp), y + off * (vx / sp)];
  }

  function collect(tr, view, lift) {
    const bodies = view === 'shape' ? [0] : [0, 1, 2];
    const pts = bodies.map(() => []);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let b = 0; b < bodies.length; b++) {
      const body = bodies[b];
      for (let k = 0; k < tr.n; k++) {
        const p = mapPoint(view, tr, body, k, lift);
        pts[b].push(p);
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
      }
    }
    if (!(x1 > x0)) { x0 = -1; x1 = 1; }
    if (!(y1 > y0)) { y0 = -1; y1 = 1; }
    return { pts, bodies, x0, y0, x1, y1 };
  }

  function xformOf(b, w, h, zoom, panX, panY) {
    const bw = Math.max(1e-6, b.x1 - b.x0);
    const bh = Math.max(1e-6, b.y1 - b.y0);
    const pad = 0.11;
    const sc = Math.min(w * (1 - 2 * pad) / bw, h * (1 - 2 * pad) / bh) * zoom;
    const cx = (b.x0 + b.x1) * 0.5 - panX * bw;
    const cy = (b.y0 + b.y1) * 0.5 - panY * bh;
    return function (x, y) {
      return [w * 0.5 + (x - cx) * sc, h * 0.5 - (y - cy) * sc];
    };
  }

  function strokeRibbon(g, mapped, color, width, fade, glow) {
    const n = mapped.length;
    if (n < 2) return;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (glow) {
      g.beginPath();
      g.moveTo(mapped[0][0], mapped[0][1]);
      for (let i = 1; i < n; i++) g.lineTo(mapped[i][0], mapped[i][1]);
      g.strokeStyle = rgba(color, 0.10);
      g.lineWidth = width * 3.2;
      g.stroke();
    }
    const chunk = Math.max(4, (n / 90) | 0);
    for (let i = 0; i < n - 1; i += chunk) {
      const j1 = Math.min(n - 1, i + chunk);
      const t = i / Math.max(1, n - 1);
      const a = fade <= 0 ? 0.92 : Math.pow(t, 0.35 + 1.4 * fade) * (0.38 + 0.62 * (1 - fade * 0.35));
      if (a < 0.03) continue;
      g.beginPath();
      g.moveTo(mapped[i][0], mapped[i][1]);
      for (let j = i + 1; j <= j1; j++) g.lineTo(mapped[j][0], mapped[j][1]);
      g.strokeStyle = rgba(color, a);
      g.lineWidth = width * (0.78 + 0.32 * t);
      g.stroke();
    }
  }

  function drawBead(g, x, y, r, color, bg) {
    const hi = U.mixHex(color, '#FFFFFF', 0.45);
    const lo = U.mixHex(color, bg, 0.35);
    const grd = g.createRadialGradient(x - r * 0.32, y - r * 0.32, r * 0.1, x, y, r);
    grd.addColorStop(0, hi);
    grd.addColorStop(0.45, color);
    grd.addColorStop(1, lo);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = grd;
    g.fill();
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.strokeStyle = rgba(U.mixHex(color, '#000000', 0.25), 0.7);
    g.lineWidth = Math.max(0.6, r * 0.12);
    g.stroke();
  }

  function arrow(g, x, y, ux, uy, len, color) {
    const x1 = x + ux * len, y1 = y + uy * len;
    const hx = -ux * len * 0.28, hy = -uy * len * 0.28;
    const px = -uy * len * 0.16, py = ux * len * 0.16;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x1, y1);
    g.strokeStyle = color;
    g.lineWidth = Math.max(1.2, len * 0.06);
    g.lineCap = 'round';
    g.stroke();
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x1 + hx + px, y1 + hy + py);
    g.lineTo(x1 + hx - px, y1 + hy - py);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  }

  function sampleAt(tr, b, phase) {
    const nPer = Math.max(2, (tr.n / tr.periods) | 0);
    const u = ((phase % 1) + 1) % 1;
    const f = u * (nPer - 1);
    const i = Math.min(nPer - 2, f | 0);
    const t = f - i;
    return {
      x: tr.px[b][i] * (1 - t) + tr.px[b][i + 1] * t,
      y: tr.py[b][i] * (1 - t) + tr.py[b][i + 1] * t,
      vx: tr.vx[b][i] * (1 - t) + tr.vx[b][i + 1] * t,
      vy: tr.vy[b][i] * (1 - t) + tr.vy[b][i + 1] * t,
      k: i,
    };
  }

  function paintTo(g, w, h, s, tr, phase) {
    const bg = s.bg || '#0D0C0B';
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (!tr || tr.n < 4) return;
    const view = s.view;
    const metals = metalsOf(s);
    const packed = collect(tr, view, s.lift);
    const xf = xformOf(packed, w, h, s.zoom, s.panX, s.panY);
    const mapped = packed.pts.map(path => path.map(p => xf(p[0], p[1])));
    const minS = Math.min(w, h);
    const W0 = Math.max(1.1, 0.011 * minS * s.weight);

    const vig = g.createRadialGradient(w * 0.5, h * 0.5, minS * 0.18, w * 0.5, h * 0.5, minS * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, U.isLight(bg) ? 'rgba(20,16,10,0.10)' : 'rgba(0,0,0,0.28)');
    g.fillStyle = vig;
    g.fillRect(0, 0, w, h);

    if (view === 'shape') {
      const c0 = xf(0, 0);
      const rEq = Math.hypot(xf(1, 0)[0] - c0[0], xf(1, 0)[1] - c0[1]);
      g.beginPath();
      g.arc(c0[0], c0[1], rEq, 0, Math.PI * 2);
      g.strokeStyle = U.inkRgba(bg, 0.28);
      g.lineWidth = Math.max(0.8, minS * 0.0022);
      g.stroke();
      for (let i = 0; i < 3; i++) {
        const ang = i * U.TAU / 3;
        const p = xf(Math.cos(ang), Math.sin(ang));
        g.beginPath();
        g.arc(p[0], p[1], Math.max(2.2, minS * 0.007), 0, Math.PI * 2);
        g.strokeStyle = U.inkRgba(bg, 0.55);
        g.lineWidth = Math.max(1, minS * 0.0025);
        g.stroke();
      }
    }

    if (view !== 'shape' && view !== 'braid') {
      const under = mapped[0].map((_, i) => {
        const a = mapped[0][i], bpt = mapped[1][i], c = mapped[2][i];
        return [(a[0] + bpt[0] + c[0]) / 3, (a[1] + bpt[1] + c[1]) / 3];
      });
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(under[0][0], under[0][1]);
      for (let i = 1; i < under.length; i++) g.lineTo(under[i][0], under[i][1]);
      g.strokeStyle = rgba(U.mixHex(metals[0], bg, 0.55), 0.22);
      g.lineWidth = W0 * 2.4;
      g.stroke();
    }

    if (view === 'braid') {
      const n = tr.n;
      const chunk = Math.max(3, (n / 160) | 0);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (let i = 0; i < n - 1; i += chunk) {
        const j1 = Math.min(n - 1, i + chunk);
        const depth = [0, 1, 2].sort((a, b) => tr.py[a][i] - tr.py[b][i]);
        const t = i / Math.max(1, n - 1);
        const a = s.fade <= 0 ? 0.92 : Math.pow(t, 0.25 + s.fade) * (0.45 + 0.55 * (1 - s.fade * 0.3));
        for (let q = 0; q < 3; q++) {
          const b = depth[q];
          g.beginPath();
          g.moveTo(mapped[b][i][0], mapped[b][i][1]);
          for (let j = i + 1; j <= j1; j++) g.lineTo(mapped[b][j][0], mapped[b][j][1]);
          g.strokeStyle = rgba(metals[b], Math.max(0.08, a));
          g.lineWidth = W0 * (1.05 + 0.25 * q);
          g.stroke();
        }
      }
    } else {
      const order = view === 'shape' ? [0] : [0, 1, 2];
      for (let q = 0; q < order.length; q++) {
        strokeRibbon(g, mapped[q], metals[order[q] % 3], W0 * (view === 'shape' ? 1.25 : 1), s.fade, true);
      }
    }

    const showBeads = view === 'beads' || view === 'world' || view === 'polar' || view === 'space' || s.running;
    if (showBeads && view !== 'shape' && view !== 'braid' && mapped[0] && mapped[0].length) {
      const beads = [0, 1, 2].map(b => sampleAt(tr, b, phase));
      const xy = beads.map((p, b) => mapped[b][Math.min(mapped[b].length - 1, p.k)]);
      if (view === 'beads') {
        g.beginPath();
        g.moveTo(xy[0][0], xy[0][1]);
        g.lineTo(xy[1][0], xy[1][1]);
        g.lineTo(xy[2][0], xy[2][1]);
        g.closePath();
        g.strokeStyle = U.inkRgba(bg, 0.4);
        g.lineWidth = Math.max(0.9, minS * 0.0022);
        g.stroke();
        const kStep = Math.max(6, (tr.n / 70) | 0);
        for (let b = 0; b < 3; b++) {
          const k2 = Math.min(mapped[b].length - 1, beads[b].k + kStep);
          const txy = mapped[b][k2];
          const dx = txy[0] - xy[b][0], dy = txy[1] - xy[b][1];
          const dl = Math.hypot(dx, dy) || 1;
          const vlen = Math.hypot(beads[b].vx, beads[b].vy);
          arrow(g, xy[b][0], xy[b][1], dx / dl, dy / dl, 0.06 * minS * (0.75 + 0.4 * Math.min(1.4, vlen)), rgba(metals[b], 0.92));
          drawBead(g, xy[b][0], xy[b][1], Math.max(3.6, 0.015 * minS * s.weight), metals[b], bg);
        }
      } else {
        for (let b = 0; b < 3; b++) {
          drawBead(g, xy[b][0], xy[b][1], Math.max(3.2, 0.012 * minS * s.weight), metals[b], bg);
        }
      }
    }

    const rng = U.makeRng(String(s.seed || 'eight') + '/grain');
    const nGrain = (w * h * 0.006) | 0;
    const ink = U.inkFor(bg);
    g.fillStyle = rgba(ink, U.isLight(bg) ? 0.035 : 0.045);
    for (let i = 0; i < nGrain; i++) {
      const gx = rng() * w, gy = rng() * h;
      g.fillRect(gx, gy, 1, 1);
    }
  }

  Studio.register({
    id: 'eight', name: 'Figure Eight', tab: 'Eight',
    subtitle: 'three equal masses chasing on a planar figure-eight · 1993 / 2000',
    order: 111,
    equation: 'r̈_i = −Σ_{j≠i} (r_i−r_j)/|r_i−r_j|³,   m_i = G = 1,   r_i(t) = r(t+(i−1)T/3),   L = 0',
    credit: 'Cris Moore, Phys. Rev. Lett. 70, 3675 (1993), found the orbit numerically. Alain Chenciner and Richard Montgomery, Ann. of Math. 152, 881 (2000), proved it exists: three equal masses, Newtonian gravity, a periodic choreography on a figure-eight, zero angular momentum. The 16-digit Euler initial conditions and the period T = 6.325913982926396 used here are C. Simó’s set, Contemp. Math. 292, 209 (2002). This plate is a print of that orbit. It is not a new solution.',
    blurb: 'Three equal masses chase each other around a single figure-eight. Moore found the orbit; Chenciner and Montgomery proved it. The plate is that choreography as worldlines: a three-metal ribbon on a dark sheet, time as fade, or wrapped as a wreath with angle for time. Shape space kills rotation and scale, and the curve is still an eight. Braid is x against t. Broken is a nearby Euler initial condition that does not close, kept so the status line can miss. The check is |L| against 0, energy drift against 0, and the return to the initial configuration at t = T against 0.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Orbit: 'Eight is Simó’s choreography. Broken scales the same Euler velocities by 1.08: still zero angular momentum, not periodic. Run walks the beads along the stored trail.',
      Picture: 'World is the shared curve as a three-metal ribbon. Spacetime uses time as a third coordinate. Braid is x against t. Shape space is the unit disk of the shape sphere, equator equal to collinear configurations. Beads is a snapshot with velocities. Wreath wraps time as angle.',
    },
    palette: true,
    defaultPalette: { bg: '#0D0C0B', colors: ['#D4B05A', '#C06E3A', '#8A96A3', '#E8D5A3'] },
    paletteLabel: 'Metals (three bodies)',
    surprise, sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let traj = null, raf = 0, last = 0, phase = 0.14;

      function status() {
        if (!traj) return;
        const s = host.getState();
        const L = Math.abs(traj.L);
        const closed = traj.dq < 1e-5 && !traj.dead;
        const conserved = L < 1e-8 && traj.dE < 1e-8;
        let tag;
        if (traj.dead) tag = 'escaped';
        else if (s.kind === 'broken') tag = closed ? 'closed, unexpectedly' : 'broken';
        else tag = (closed && conserved) ? 'choreography' : 'drifting';
        host.setStatus(
          '<span>|L| <b>' + sci(L) + '</b> · 0</span>' +
          '<span>|ΔE|/|E| <b>' + sci(traj.dE) + '</b> · 0</span>' +
          '<span>|q(T)−q(0)| <b>' + sci(traj.dq) + '</b> · 0</span>' +
          '<span>' + tag + '</span>'
        );
      }
      function paint() {
        const s = host.getState();
        paintTo(ctx, canvas.width, canvas.height, s, traj, phase);
      }
      function compute() {
        const s = host.getState();
        traj = integrate(s.kind, s.periods);
        phase = 0.14;
      }
      function tick(now) {
        raf = 0;
        if (!host.isActive()) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        phase = (phase + dt * (s.speed || 0.85) * 0.22) % 1;
        paint();
        raf = requestAnimationFrame(tick);
      }
      function startLoop() {
        if (raf) return;
        last = 0;
        raf = requestAnimationFrame(tick);
      }
      function stopLoop() {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        live(key) {
          const s = host.getState();
          if (key === 'running' || key === 'speed') {
            if (s.running && !host.reducedMotion()) startLoop();
            else stopLoop();
            if (!s.running) { paint(); status(); }
          }
        },
        resize() { paint(); },
        pause() { stopLoop(); },
        resume() {
          const s = host.getState();
          paint();
          if (s.running && !host.reducedMotion()) startLoop();
        },
        async exportPNG(w, h) {
          if (!traj) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          paintTo(g, w, h, s, traj, phase);
          return U.toBlob(c);
        },
        exportSVG(w, h) {
          if (!traj) return '';
          const s = host.getState();
          const metals = metalsOf(s);
          const packed = collect(traj, s.view, s.lift);
          const xf = xformOf(packed, w, h, s.zoom, s.panX, s.panY);
          const lw = Math.max(0.8, 0.011 * Math.min(w, h) * s.weight);
          const parts = [];
          packed.pts.forEach((path, q) => {
            const d = path.map((p, i) => {
              const xy = xf(p[0], p[1]);
              return (i ? 'L' : 'M') + xy[0].toFixed(2) + ' ' + xy[1].toFixed(2);
            }).join(' ');
            parts.push('<path d="' + d + '" fill="none" stroke="' + U.svgEsc(metals[q % 3]) + '" stroke-width="' + lw.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>');
          });
          return U.svgDoc(w, h, s.bg, parts.join(''));
        },
      };
    },
  });
})();
