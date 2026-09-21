
/* modules/three-vortex-bound.js */
/* GENChase: Three-vortex collapse bound. Closed form ω t_c = (2-cos²θ)/sin(2θ); min √2 at tan θ = 1/√2. Motion is Gröbli; product as spiral pitch is Aref 29c. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const sci = v => {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e3)) return v.toExponential(1);
    return v.toFixed(3);
  };
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const G = [1, 1, -0.5];
  const TWOPI = 2 * Math.PI;
  const SQRT2 = Math.SQRT2;
  // L=0 circle for Γ = (1, 1, −1/2): vortex 3 on the circle of radius √3/2 about the
  // midpoint of vortices 1 and 2. On that family the Biot-Savart product of initial
  // rotation rate about the center of vorticity and collapse time is exactly
  //   ω t_c(θ) = (2 − cos²θ) / sin(2θ).
  // Unique critical point on (0, π/2) at tan θ = 1/√2, where ω t_c = √2.
  // Triangle angles there: π/8, π/4, 5π/8. Aref 2010 eq. 25a gives Ω = 1 (his
  // units, no 2π) at the same triangle, so τ = √2. The product is convention-invariant.
  const THETA_OCTANT = Math.atan(1 / SQRT2) * 180 / Math.PI;
  const N_DRAW = 720;
  const VIEWS = ['spiral', 'overlay', 'polar', 'beads', 'space'];
  const METAL_FALLBACK = ['#D4B05A', '#C06E3A', '#8A96A3'];

  const SCHEMA = [
    { group: 'Sheet', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    { group: 'Collapse', key: 'kind', label: 'Kind', type: 'seg', kind: GEOM, options: [['octant', 'Octant'], ['family', 'Family'], ['broken', 'Broken']], hint: 'Octant is the π/8, π/4, 5π/8 triangle, the unique minimizer of ω t_c on this family. Family walks the L=0 circle with the Angle slider. Broken pushes vortex 3 off the circle, so L ≠ 0 and the lock does not hold. The status line then marks miss; the picture still draws.' },
    RANGE('Collapse', 'theta', 'Angle', GEOM, 8, 172, 0.5, v => Number(v).toFixed(1) + '°', { dimUnless: s => s.kind === 'family', hint: 'Position of vortex 3 on the L=0 circle. Collapse for θ < 90°, rigid rotation at 90°, expansion for θ > 90°. Octant is 35.264°.' }),
    RANGE('Collapse', 't', 'Time t', LIVE, 0, 0.92, 0.01, f2, { hint: 'Fraction of the collapse time. 0 is the initial triangle. The plate stops short of the singularity.' }),
    { group: 'Collapse', key: 'running', label: 'Run', type: 'toggle', kind: LIVE, hint: 'Walk t toward collapse and loop. Reduced motion leaves the still plate.' },
    RANGE('Collapse', 'speed', 'Pace', LIVE, 0.2, 2.4, 0.05, f2, { dimUnless: s => s.running }),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['spiral', 'Spiral'], ['overlay', 'Similar'], ['polar', 'Polar'], ['beads', 'Beads'], ['space', 'Spacetime']] },
    RANGE('Picture', 'zoom', 'View', PAINT, 0.45, 2.8, 0.05, f2),
    RANGE('Picture', 'fade', 'Fade', PAINT, 0, 1, 0.05, f2),
    RANGE('Picture', 'weight', 'Weight', PAINT, 0.4, 2.2, 0.05, f2),
    RANGE('Picture', 'panX', 'Pan X', PAINT, -0.6, 0.6, 0.02, f2),
    RANGE('Picture', 'panY', 'Pan Y', PAINT, -0.6, 0.6, 0.02, f2),
  ];
  const DEFAULTS = {
    seed: 'octant-root-two',
    aspect: '1:1', kind: 'octant', theta: +THETA_OCTANT.toFixed(3), t: 0.62, running: false, speed: 0.85,
    view: 'spiral', zoom: 1.05, fade: 0.22, weight: 1.12, panX: 0, panY: 0,
  };
  const PRESETS = {
    octant: pre('Octant lock', { kind: 'octant', theta: +THETA_OCTANT.toFixed(3), t: 0.62, view: 'spiral', zoom: 1.05, fade: 0.22, weight: 1.12, panX: 0, panY: 0 }, Pal.ember),
    threehalves: pre('Three halves', { kind: 'family', theta: 45, t: 0.58, view: 'spiral', zoom: 1.0, fade: 0.2, weight: 1.1, panX: 0, panY: 0 }, Pal.kiln),
    equal: pre('Equilateral', { kind: 'family', theta: 90, t: 0.4, view: 'spiral', zoom: 1.15, fade: 0.08, weight: 1.2, panX: 0, panY: 0 }, Pal.harbor),
    tight: pre('Tight collapse', { kind: 'family', theta: 18, t: 0.7, view: 'spiral', zoom: 0.92, fade: 0.18, weight: 1.05, panX: 0, panY: 0 }, Pal.nightshade),
    overlay: pre('Similar triangles', { kind: 'octant', theta: +THETA_OCTANT.toFixed(3), t: 0.55, view: 'overlay', zoom: 1.2, fade: 0.05, weight: 1.25, panX: 0, panY: 0 }, Pal.glacier),
    polar: pre('Log spiral', { kind: 'octant', theta: +THETA_OCTANT.toFixed(3), t: 0.72, view: 'polar', zoom: 1.08, fade: 0.12, weight: 1.15, panX: 0, panY: 0 }, Pal.graphite),
    broken: pre('Off the circle', { kind: 'broken', theta: +THETA_OCTANT.toFixed(3), t: 0.55, view: 'spiral', zoom: 0.88, fade: 0.15, weight: 1.0, panX: 0, panY: 0 }, Pal.thermal),
  };

  function surprise(rng) {
    const kind = rng() < 0.14 ? 'broken' : (rng() < 0.45 ? 'octant' : 'family');
    return {
      kind,
      theta: kind === 'octant' ? +THETA_OCTANT.toFixed(3) : rng.range(12, 82),
      t: rng.range(0.35, 0.78),
      view: rng.pick(['spiral', 'spiral', 'spiral', 'overlay', 'polar', 'beads', 'space']),
      zoom: rng.range(0.85, 1.35),
      fade: rng.range(0.08, 0.45),
      weight: rng.range(0.85, 1.4),
      panX: 0, panY: 0,
    };
  }
  function sanitize(s) {
    if (s.kind !== 'family' && s.kind !== 'broken') s.kind = 'octant';
    if (s.kind === 'octant') s.theta = +THETA_OCTANT.toFixed(3);
    s.theta = U.clamp(Number(s.theta) || THETA_OCTANT, 8, 172);
    s.t = U.clamp(Number(s.t) || 0, 0, 0.92);
    if (VIEWS.indexOf(s.view) < 0) s.view = 'spiral';
    s.zoom = U.clamp(Number(s.zoom) || 1, 0.45, 2.8);
    s.fade = U.clamp(Number(s.fade) || 0, 0, 1);
    s.weight = U.clamp(Number(s.weight) || 1, 0.4, 2.2);
    s.speed = U.clamp(Number(s.speed) || 0.85, 0.2, 2.4);
    s.panX = U.clamp(Number(s.panX) || 0, -0.6, 0.6);
    s.panY = U.clamp(Number(s.panY) || 0, -0.6, 0.6);
    s.running = !!s.running;
  }

  function place(thetaDeg, broken) {
    const th = thetaDeg * Math.PI / 180;
    const R = Math.sqrt(0.75);
    const z = [
      [0, 0],
      [1, 0],
      [0.5 + R * Math.cos(th), R * Math.sin(th)],
    ];
    if (broken) {
      z[2][0] += 0.22;
      z[2][1] += 0.11;
    }
    return z;
  }
  function velOf(z) {
    const n = 3, out = z.map(() => [0, 0]);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) {
      const dx = z[i][0] - z[j][0], dy = z[i][1] - z[j][1];
      const r2 = dx * dx + dy * dy;
      const c = G[j] / (TWOPI * r2);
      out[i][0] += -c * dy;
      out[i][1] += c * dx;
    }
    return out;
  }
  function cmOf(z) {
    const S = G[0] + G[1] + G[2];
    let cx = 0, cy = 0;
    for (let i = 0; i < 3; i++) { cx += G[i] * z[i][0]; cy += G[i] * z[i][1]; }
    return [cx / S, cy / S];
  }
  function signedI(z, c) {
    let I = 0;
    for (let i = 0; i < 3; i++) I += G[i] * ((z[i][0] - c[0]) ** 2 + (z[i][1] - c[1]) ** 2);
    return I;
  }
  function geomR2(z, c) {
    let s = 0;
    for (let i = 0; i < 3; i++) s += (z[i][0] - c[0]) ** 2 + (z[i][1] - c[1]) ** 2;
    return s / 3;
  }
  function omegaEach(z, v, c) {
    return z.map((p, i) => {
      const rx = p[0] - c[0], ry = p[1] - c[1];
      const r2 = rx * rx + ry * ry;
      return r2 > 1e-18 ? (rx * v[i][1] - ry * v[i][0]) / r2 : 0;
    });
  }
  function sidesOf(z) {
    const d = (i, j) => Math.hypot(z[i][0] - z[j][0], z[i][1] - z[j][1]);
    return [d(0, 1), d(1, 2), d(2, 0)];
  }
  function anglesOf(s) {
    const cosA = (b, c, a) => Math.acos(U.clamp((b * b + c * c - a * a) / (2 * b * c), -1, 1));
    return [
      cosA(s[2], s[0], s[1]) * 180 / Math.PI,
      cosA(s[0], s[1], s[2]) * 180 / Math.PI,
      cosA(s[1], s[2], s[0]) * 180 / Math.PI,
    ];
  }
  function simResidual(s, s0) {
    const r0 = Math.hypot(s0[0], s0[1], s0[2]);
    const r = Math.hypot(s[0], s[1], s[2]);
    if (r < 1e-12 || r0 < 1e-12) return 0;
    return Math.hypot(s[0] / r - s0[0] / r0, s[1] / r - s0[1] / r0, s[2] / r - s0[2] / r0);
  }
  // Closed form on the L=0 circle. Independent of the 2π convention.
  function wtcClosed(thetaDeg) {
    const th = thetaDeg * Math.PI / 180;
    const c = Math.cos(th);
    const s2 = Math.sin(2 * th);
    if (Math.abs(s2) < 1e-14) return Infinity;
    const v = (2 - c * c) / s2;
    return v < 0 ? -v : v;
  }

  function metricsOf(z0) {
    const c = cmOf(z0);
    const v = velOf(z0);
    const ws = omegaEach(z0, v, c);
    const w0 = (ws[0] + ws[1] + ws[2]) / 3;
    const wVar = ((ws[0] - w0) ** 2 + (ws[1] - w0) ** 2 + (ws[2] - w0) ** 2) / 2;
    const wSig = Math.sqrt(Math.max(0, wVar));
    const R2 = geomR2(z0, c);
    let dR2 = 0;
    for (let i = 0; i < 3; i++) dR2 += 2 * ((z0[i][0] - c[0]) * v[i][0] + (z0[i][1] - c[1]) * v[i][1]) / 3;
    const tau = Math.abs(dR2) < 1e-14 ? Infinity : -R2 / dR2;
    const I = signedI(z0, c);
    const s0 = sidesOf(z0);
    const ang = anglesOf(s0);
    const wtc = isFinite(tau) ? w0 * tau : Infinity;
    return { c, v, w0, wSig, ws, R2, dR2, tau, I, s0, ang, wtc, z0 };
  }

  function atExact(m, tFrac) {
    const { z0, c, tau, w0 } = m;
    const out = [];
    if (!isFinite(tau) || Math.abs(tau) > 1e8) {
      const psi = w0 * tFrac * 4;
      const cs = Math.cos(psi), sn = Math.sin(psi);
      for (let i = 0; i < 3; i++) {
        const rx = z0[i][0] - c[0], ry = z0[i][1] - c[1];
        out.push([c[0] + cs * rx - sn * ry, c[1] + sn * rx + cs * ry]);
      }
      return out;
    }
    const t = tFrac * Math.abs(tau);
    const u = 1 - t / tau;
    if (u <= 1e-8) {
      return [[c[0], c[1]], [c[0], c[1]], [c[0], c[1]]];
    }
    const beta = w0 * tau;
    const logu = Math.log(u);
    const mag = Math.sqrt(u);
    const cs = Math.cos(-beta * logu), sn = Math.sin(-beta * logu);
    for (let i = 0; i < 3; i++) {
      const rx = z0[i][0] - c[0], ry = z0[i][1] - c[1];
      out.push([c[0] + mag * (cs * rx - sn * ry), c[1] + mag * (sn * rx + cs * ry)]);
    }
    return out;
  }

  function rk4Step(z, dt) {
    const k1 = velOf(z);
    const z2 = z.map((p, i) => [p[0] + 0.5 * dt * k1[i][0], p[1] + 0.5 * dt * k1[i][1]]);
    const k2 = velOf(z2);
    const z3 = z.map((p, i) => [p[0] + 0.5 * dt * k2[i][0], p[1] + 0.5 * dt * k2[i][1]]);
    const k3 = velOf(z3);
    const z4 = z.map((p, i) => [p[0] + dt * k3[i][0], p[1] + dt * k3[i][1]]);
    const k4 = velOf(z4);
    return z.map((p, i) => [
      p[0] + dt * (k1[i][0] + 2 * k2[i][0] + 2 * k3[i][0] + k4[i][0]) / 6,
      p[1] + dt * (k1[i][1] + 2 * k2[i][1] + 2 * k3[i][1] + k4[i][1]) / 6,
    ]);
  }

  function integrate(kind, theta) {
    const broken = kind === 'broken';
    const th = kind === 'octant' ? THETA_OCTANT : theta;
    const z0 = place(th, broken);
    const m = metricsOf(z0);
    m.wtcForm = broken ? NaN : wtcClosed(th);
    const n = N_DRAW;
    const px = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
    const py = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
    const tt = new Float64Array(n);
    let odeErr = 0, simMax = 0;
    if (broken) {
      let z = z0.map(p => p.slice());
      const T = isFinite(m.tau) && m.tau > 0 ? m.tau * 0.88 : 6;
      const dt = T / (n - 1);
      for (let k = 0; k < n; k++) {
        tt[k] = k / (n - 1);
        for (let i = 0; i < 3; i++) { px[i][k] = z[i][0]; py[i][k] = z[i][1]; }
        if (k < n - 1) z = rk4Step(z, dt);
        if (k > 0 && (k % 8) === 0) {
          const s = sidesOf(z);
          const sim = simResidual(s, m.s0);
          if (sim > simMax) simMax = sim;
        }
      }
    } else {
      // Independent RK4 sample near t = 0.25 τ, compared to the exact scaling form.
      let z = z0.map(p => p.slice());
      const tauAbs = isFinite(m.tau) ? Math.abs(m.tau) : 8;
      const dt = Math.min(0.002, tauAbs / 400);
      const nStep = 80;
      for (let s = 0; s < nStep; s++) z = rk4Step(z, dt);
      const tProbe = nStep * dt;
      const tFracProbe = isFinite(m.tau) && m.tau > 0 ? tProbe / m.tau : tProbe / 8;
      const ex = atExact(m, U.clamp(tFracProbe, 0, 0.9));
      let e = 0, R = Math.sqrt(m.R2) || 1;
      for (let i = 0; i < 3; i++) e += (z[i][0] - ex[i][0]) ** 2 + (z[i][1] - ex[i][1]) ** 2;
      odeErr = Math.sqrt(e / 3) / R;
      for (let k = 0; k < n; k++) {
        const tf = 0.92 * k / (n - 1);
        tt[k] = tf;
        const zk = atExact(m, tf);
        for (let i = 0; i < 3; i++) { px[i][k] = zk[i][0]; py[i][k] = zk[i][1]; }
        if (k > 0 && (k % 12) === 0) {
          const s = sidesOf(zk);
          const sim = simResidual(s, m.s0);
          if (sim > simMax) simMax = sim;
        }
      }
    }
    return {
      m, px, py, tt, n, odeErr, simMax,
      broken,
      collapsing: isFinite(m.tau) && m.tau > 0 && m.tau < 1e6,
      rotating: !isFinite(m.tau) || Math.abs(m.tau) > 1e6,
    };
  }

  function metalsOf(s) {
    const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : METAL_FALLBACK;
    return [pal[0] || METAL_FALLBACK[0], pal[Math.min(1, pal.length - 1)] || METAL_FALLBACK[1], pal[Math.min(2, pal.length - 1)] || METAL_FALLBACK[2]];
  }

  function collect(traj, view) {
    const pts = [[], [], []];
    const n = traj.n;
    for (let k = 0; k < n; k++) {
      const x0 = traj.px[0][k], y0 = traj.py[0][k];
      const x1 = traj.px[1][k], y1 = traj.py[1][k];
      const x2 = traj.px[2][k], y2 = traj.py[2][k];
      if (view === 'space') {
        const t = traj.tt[k];
        pts[0].push([x0, t]); pts[1].push([x1, t]); pts[2].push([x2, t]);
      } else if (view === 'polar') {
        const c = traj.m.c;
        for (let i = 0; i < 3; i++) {
          const rx = traj.px[i][k] - c[0], ry = traj.py[i][k] - c[1];
          const r = Math.hypot(rx, ry);
          const th = Math.atan2(ry, rx);
          pts[i].push([th, Math.log(Math.max(r, 1e-6))]);
        }
      } else {
        pts[0].push([x0, y0]); pts[1].push([x1, y1]); pts[2].push([x2, y2]);
      }
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 3; i++) for (let k = 0; k < pts[i].length; k++) {
      const p = pts[i][k];
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }
    return { pts, minX, maxX, minY, maxY };
  }

  let packTraj = null, packView = '', packVal = null;
  function packedOf(traj, view) {
    if (packTraj === traj && packView === view) return packVal;
    packVal = collect(traj, view);
    packTraj = traj;
    packView = view;
    return packVal;
  }

  function xformOf(packed, w, h, zoom, panX, panY) {
    const dx = packed.maxX - packed.minX || 1;
    const dy = packed.maxY - packed.minY || 1;
    const pad = 0.12;
    const sx = w * (1 - 2 * pad) / dx;
    const sy = h * (1 - 2 * pad) / dy;
    const sc = Math.min(sx, sy) * zoom;
    const cx = (packed.minX + packed.maxX) / 2 - panX * dx;
    const cy = (packed.minY + packed.maxY) / 2 - panY * dy;
    return (x, y) => [w / 2 + (x - cx) * sc, h / 2 - (y - cy) * sc];
  }

  function paintTo(ctx, w, h, s, traj, tFrac) {
    ctx.fillStyle = s.bg || '#0D0C0B';
    ctx.fillRect(0, 0, w, h);
    if (!traj) return;
    const metals = metalsOf(s);
    const view = s.view;
    const packed = packedOf(traj, view);
    const xf = xformOf(packed, w, h, s.zoom, s.panX, s.panY);
    const lw = Math.max(0.8, 0.011 * Math.min(w, h) * s.weight);
    const fade = s.fade;
    const n = traj.n;
    const kNow = U.clamp(Math.round(tFrac * (n - 1)), 0, n - 1);

    if (view === 'overlay') {
      const step = Math.max(1, (n / 18) | 0);
      for (let k = 0; k < n; k += step) {
        const a = 0.12 + 0.55 * (k / n);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const p = packed.pts[i][k];
          const xy = xf(p[0], p[1]);
          if (i === 0) ctx.moveTo(xy[0], xy[1]); else ctx.lineTo(xy[0], xy[1]);
        }
        ctx.closePath();
        ctx.strokeStyle = metals[k % 3];
        ctx.globalAlpha = a;
        ctx.lineWidth = lw * 0.7;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (view === 'beads') {
      const k = kNow;
      ctx.lineWidth = lw * 0.7;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const p = packed.pts[i][k];
        const xy = xf(p[0], p[1]);
        if (i === 0) ctx.moveTo(xy[0], xy[1]); else ctx.lineTo(xy[0], xy[1]);
      }
      ctx.closePath();
      ctx.strokeStyle = metals[2];
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const p = packed.pts[i][k];
        const xy = xf(p[0], p[1]);
        ctx.beginPath();
        ctx.fillStyle = metals[i];
        ctx.arc(xy[0], xy[1], lw * (2.2 + 1.4 * Math.abs(G[i])), 0, TWOPI);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const path = packed.pts[i];
        const cut = view === 'space' ? path.length : kNow + 1;
        ctx.beginPath();
        for (let k = 0; k < cut; k++) {
          const xy = xf(path[k][0], path[k][1]);
          if (k === 0) ctx.moveTo(xy[0], xy[1]); else ctx.lineTo(xy[0], xy[1]);
        }
        ctx.strokeStyle = metals[i];
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.28 + 0.72 * (1 - fade);
        ctx.stroke();
        if (fade > 0.04 && cut > 8) {
          ctx.beginPath();
          const k0 = Math.max(0, cut - Math.round(cut * (0.22 + 0.5 * fade)));
          for (let k = k0; k < cut; k++) {
            const xy = xf(path[k][0], path[k][1]);
            if (k === k0) ctx.moveTo(xy[0], xy[1]); else ctx.lineTo(xy[0], xy[1]);
          }
          ctx.globalAlpha = 0.95;
          ctx.lineWidth = lw * 1.15;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const p = path[Math.min(cut - 1, path.length - 1)];
        const xy = xf(p[0], p[1]);
        ctx.beginPath();
        ctx.fillStyle = metals[i];
        ctx.arc(xy[0], xy[1], lw * (1.8 + 1.1 * Math.abs(G[i])), 0, TWOPI);
        ctx.fill();
      }
    }

    if (view === 'spiral' || view === 'beads') {
      const cxy = xf(traj.m.c[0], traj.m.c[1]);
      ctx.strokeStyle = U.inkFor ? U.inkFor(s.bg || '#0D0C0B') : '#888';
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(0.8, lw * 0.45);
      const tick = lw * 2.2;
      ctx.beginPath();
      ctx.moveTo(cxy[0] - tick, cxy[1]); ctx.lineTo(cxy[0] + tick, cxy[1]);
      ctx.moveTo(cxy[0], cxy[1] - tick); ctx.lineTo(cxy[0], cxy[1] + tick);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function svgOf(s, w, h, traj, tFrac) {
    if (!traj) return '';
    const view = s.view;
    if (view !== 'spiral' && view !== 'overlay' && view !== 'beads' && view !== 'polar') return null;
    const metals = metalsOf(s);
    const packed = packedOf(traj, view);
    const xf = xformOf(packed, w, h, s.zoom, s.panX, s.panY);
    const lw = Math.max(0.8, 0.011 * Math.min(w, h) * s.weight);
    const n = traj.n;
    const kNow = U.clamp(Math.round(tFrac * (n - 1)), 0, n - 1);
    const parts = [];
    if (view === 'overlay') {
      const step = Math.max(1, (n / 18) | 0);
      for (let k = 0; k < n; k += step) {
        const a = (0.12 + 0.55 * (k / n)).toFixed(2);
        const d = [];
        for (let i = 0; i < 3; i++) {
          const p = packed.pts[i][k];
          const xy = xf(p[0], p[1]);
          d.push((i ? 'L' : 'M') + xy[0].toFixed(2) + ' ' + xy[1].toFixed(2));
        }
        parts.push('<path d="' + d.join(' ') + ' Z" fill="none" stroke="' + U.svgEsc(metals[k % 3]) + '" stroke-width="' + (lw * 0.7).toFixed(2) + '" opacity="' + a + '"/>');
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const path = packed.pts[i];
        const cut = kNow + 1;
        const d = [];
        for (let k = 0; k < cut; k++) {
          const xy = xf(path[k][0], path[k][1]);
          d.push((k ? 'L' : 'M') + xy[0].toFixed(2) + ' ' + xy[1].toFixed(2));
        }
        parts.push('<path d="' + d.join(' ') + '" fill="none" stroke="' + U.svgEsc(metals[i]) + '" stroke-width="' + lw.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>');
      }
    }
    return U.svgDoc(w, h, s.bg, parts.join(''));
  }

  /* ---------- Three-vortex collapse bound ---------- */
  Studio.register({
    id: 'three-vortex-bound', name: 'Three-vortex collapse bound', tab: 'Three-vortex collapse bound',
    subtitle: 'ω₀ t_c ≥ √2 on Gröbli\'s collapsing triangle · Three-vortex collapse bound',
    order: 117,
    equation: 'ω₀ t_c = (2 − cos²θ)/sin(2θ) ≥ √2  on  Γ = (1, 1, −1/2), L = 0;  equality at tan θ = 1/√2',
    credit: 'Three-vortex collapse bound: an explicit formula and sharp minimum for a classical three-vortex collapse family, independently derived in this project with AI assistance. Circulations Γ = (1, 1, −1/2), positions z₁ = 0, z₂ = 1, z₃ = 1/2 + (√3/2) e^{iθ} on the L = 0 circle, 0 < θ < π/2. θ is the third vortex\'s place on that circle, not an interior angle. ω₀ t_c = (2 − cos²θ)/sin(2θ) ≥ √2, equality uniquely at tan θ = 1/√2 (interior angles 22.5°, 45°, 112.5°). With u = tan θ the product is u + 1/(2u), and ω₀ t_c − √2 = (√2 u − 1)² / (2u) ≥ 0. At θ = 45° the product is 3/2. Three-vortex collapse is Gröbli (1877). Aref, Phys. Fluids 22, 057104 (2010), gives rotation and collapse separately and writes their product as the pitch of the log spiral. The formula explicitly specializes and reparameterizes the spiral coefficient in Gröbli (1877), section 10. It was independently derived here and recorded on 2026-09-19. Priority of the optimized minimum remains unconfirmed; see identities/ORIGINALITY-FOLLOWUP.md, identities/NOVELTY-AUDIT.md and IDENTITIES.md. Cite as Three-vortex collapse bound. If the vortices leave the circle, or the kernel is wrong, the ratio against √2 misses and the status line marks miss. The picture still draws.',
    blurb: 'Three-vortex collapse bound. Three point vortices of circulations 1, 1, and −1/2, on the L = 0 circle, collapse self-similarly. ω₀ t_c = (2 − cos²θ)/sin(2θ) ≥ √2, equality at tan θ = 1/√2, a triangle of 22.5°, 45°, and 112.5°. θ places the third vortex on the circle; it is not an interior angle. The status line is that ratio against 1, the similarity residual against 0, and signed L against 0. Broken steps off the circle so the lock does not hold and the status line marks miss. That is the check working, not the studio breaking. Cite as Three-vortex collapse bound.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Collapse: 'Octant is the lock. Family is the rest of Gröbli\'s circle: collapse, then the equilateral relative equilibrium, then expansion. Broken is the control with L ≠ 0. Time is a fraction of t_c.',
      Picture: 'Spiral is the three worldlines. Similar overlays nested snapshots about the center of vorticity; they coincide if the motion is self-similar. Polar is log r against angle, a straight line for a logarithmic spiral. Beads is the triangle now. Spacetime is x against t.',
    },
    palette: true,
    defaultPalette: { bg: '#0D0C0B', colors: ['#D4B05A', '#C06E3A', '#8A96A3', '#E8D5A3'] },
    paletteLabel: 'Metals (three vortices)',
    headline: 't', headlineLabel: 't / t_c',
    surprise, sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let traj = null, raf = 0, last = 0;

      function status() {
        if (!traj) return;
        const m = traj.m;
        const lock = m.wtc / SQRT2;
        const form = m.wtcForm;
        const formFail = isFinite(form) && isFinite(m.wtc) && Math.abs(m.wtc / form - 1) > 0.02;
        const lockFail = !(Math.abs(lock - 1) < 0.02);
        const simFail = traj.simMax > 0.02;
        const IFail = Math.abs(m.I) > 0.02;
        const odeFail = traj.odeErr > 0.03 || formFail;
        const onOctant = !traj.broken && Math.abs((host.getState().kind === 'octant' ? THETA_OCTANT : host.getState().theta) - THETA_OCTANT) < 0.15;
        let tag;
        if (traj.broken) tag = 'off circle';
        else if (traj.rotating) tag = 'relative equilibrium';
        else if (!traj.collapsing) tag = 'expanding';
        else if (onOctant && !lockFail && !simFail && !IFail) tag = 'octant lock';
        else if (!lockFail && onOctant) tag = 'lock held';
        else if (traj.collapsing) tag = 'collapsing';
        else tag = 'drifting';
        const sig = (isFinite(m.tau) && isFinite(m.wSig)) ? sci(m.wSig * Math.abs(m.tau) / SQRT2) : '0';
        const lockStr = isFinite(lock) ? f3(lock) : 'inf';
        const wtcStr = isFinite(m.wtc) ? f3(m.wtc) : 'inf';
        host.setStatus(
          '<span>ω t_c / √2 <b>' + lockStr + '</b> ± ' + sig + ' · 1' + (onOctant && lockFail ? ' · miss' : '') + '</span>' +
          '<span>similar <b>' + sci(traj.simMax) + '</b> · 0' + (simFail ? ' · miss' : '') + '</span>' +
          '<span>L <b>' + sci(m.I) + '</b> · 0' + (IFail ? ' · miss' : '') + '</span>' +
          '<span>' + tag + (odeFail ? ' · ODE off' : '') + ' · ω t_c ' + wtcStr + '</span>'
        );
      }
      function compute() {
        const s = host.getState();
        traj = integrate(s.kind, s.theta);
      }
      function paint() {
        const s = host.getState();
        paintTo(ctx, canvas.width, canvas.height, s, traj, s.t);
      }
      function tick(now) {
        raf = 0;
        if (!host.isActive()) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        s.t = (s.t + dt * (s.speed || 0.85) * 0.18) % 0.92;
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
        aspect(st) { return ASPECTS[st.aspect] || 1; },
        fieldCells() { return null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        live(key) {
          const s = host.getState();
          if (key === 't') { paint(); status(); }
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
          paintTo(g, w, h, s, traj, s.t);
          return U.toBlob(c);
        },
        exportSVG(w, h) {
          if (!traj) return '';
          const s = host.getState();
          return svgOf(s, w, h, traj, s.t);
        },
      };
    },
  });
})();
