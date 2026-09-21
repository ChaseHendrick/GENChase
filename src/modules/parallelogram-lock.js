
/* modules/parallelogram-lock.js */
/* GENChase: Novikov-Sedov parallelogram. Product ω t_c = (√3/4)(4−cos 2θ)/sin(2θ); min 3√5/4 at cos 2θ = 1/4. Motion is Novikov-Sedov 1979; A,B in θ are Gotoda 2020 (3.13). */
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

  const SQRT3 = Math.sqrt(3);
  const LOCK = 3 * Math.sqrt(5) / 4;
  const TWOPI = 2 * Math.PI;
  const G2 = -2 - SQRT3;
  const G = [1, 1, G2, G2];
  const N = 4;
  const D2 = 1;
  const D1 = Math.sqrt(2 + SQRT3);
  // Collapse orientation is the negative angle: Novikov-Sedov 0 < ψ < π/2 with this numbering expands.
  const THETA_LOCK = Math.acos(0.25) / 2 * 180 / Math.PI;
  const N_DRAW = 640;
  const VIEWS = ['spiral', 'overlay', 'polar', 'beads', 'space'];
  const METAL_FALLBACK = ['#D4B05A', '#C06E3A', '#8A96A3', '#E8D5A3'];
  const RING = [0, 3, 1, 2];

  const SCHEMA = [
    { group: 'Sheet', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    { group: 'Collapse', key: 'kind', label: 'Kind', type: 'seg', kind: GEOM, options: [['lock', 'Lock'], ['family', 'Family'], ['broken', 'Broken']], hint: 'Lock is the unique minimizer of |ω t_c| on this family, cos 2θ = 1/4. Family walks the Novikov-Sedov parallelograms. Broken pushes one vertex off the parallelogram, so L ≠ 0 and the lock does not hold. The status line then marks miss; the picture still draws.' },
    RANGE('Collapse', 'theta', 'Angle', GEOM, 8, 82, 0.5, v => Number(v).toFixed(1) + '°', { dimUnless: s => s.kind === 'family', hint: 'Angle between the diagonals. Collapse on this numbering for θ in (0, 90°). Lock is 37.761°. Rhombus rotation at 90° is off this slider.' }),
    RANGE('Collapse', 't', 'Time t', LIVE, 0, 0.92, 0.01, f2, { hint: 'Fraction of the collapse time. 0 is the initial parallelogram. The plate stops short of the singularity.' }),
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
    seed: 'cos-quarter',
    aspect: '1:1', kind: 'lock', theta: +THETA_LOCK.toFixed(3), t: 0.62, running: false, speed: 0.85,
    view: 'spiral', zoom: 1.05, fade: 0.22, weight: 1.12, panX: 0, panY: 0,
  };
  const PRESETS = {
    lock: pre('Lock', { kind: 'lock', theta: +THETA_LOCK.toFixed(3), t: 0.62, view: 'spiral', zoom: 1.05, fade: 0.22, weight: 1.12, panX: 0, panY: 0 }, Pal.ember),
    squareish: pre('Diagonals at 45°', { kind: 'family', theta: 45, t: 0.58, view: 'spiral', zoom: 1.0, fade: 0.2, weight: 1.1, panX: 0, panY: 0 }, Pal.kiln),
    thirty: pre('Thirty', { kind: 'family', theta: 30, t: 0.6, view: 'spiral', zoom: 0.98, fade: 0.18, weight: 1.08, panX: 0, panY: 0 }, Pal.harbor),
    tight: pre('Tight collapse', { kind: 'family', theta: 14, t: 0.7, view: 'spiral', zoom: 0.9, fade: 0.16, weight: 1.0, panX: 0, panY: 0 }, Pal.nightshade),
    overlay: pre('Similar parallelograms', { kind: 'lock', theta: +THETA_LOCK.toFixed(3), t: 0.55, view: 'overlay', zoom: 1.18, fade: 0.05, weight: 1.22, panX: 0, panY: 0 }, Pal.glacier),
    polar: pre('Log spiral', { kind: 'lock', theta: +THETA_LOCK.toFixed(3), t: 0.72, view: 'polar', zoom: 1.08, fade: 0.12, weight: 1.15, panX: 0, panY: 0 }, Pal.graphite),
    broken: pre('Off the parallelogram', { kind: 'broken', theta: +THETA_LOCK.toFixed(3), t: 0.55, view: 'spiral', zoom: 0.88, fade: 0.15, weight: 1.0, panX: 0, panY: 0 }, Pal.thermal),
  };

  function surprise(rng) {
    const kind = rng() < 0.14 ? 'broken' : (rng() < 0.45 ? 'lock' : 'family');
    return {
      kind,
      theta: kind === 'lock' ? +THETA_LOCK.toFixed(3) : rng.range(12, 72),
      t: rng.range(0.35, 0.78),
      view: rng.pick(['spiral', 'spiral', 'spiral', 'overlay', 'polar', 'beads', 'space']),
      zoom: rng.range(0.85, 1.35),
      fade: rng.range(0.08, 0.45),
      weight: rng.range(0.85, 1.4),
      panX: 0, panY: 0,
    };
  }
  function sanitize(s) {
    if (s.kind !== 'family' && s.kind !== 'broken') s.kind = 'lock';
    if (s.kind === 'lock') s.theta = +THETA_LOCK.toFixed(3);
    s.theta = U.clamp(Number(s.theta) || THETA_LOCK, 8, 82);
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
    const th = -thetaDeg * Math.PI / 180;
    const z = [
      [0.5 * D1 * Math.cos(th), 0.5 * D1 * Math.sin(th)],
      [-0.5 * D1 * Math.cos(th), -0.5 * D1 * Math.sin(th)],
      [-0.5 * D2, 0],
      [0.5 * D2, 0],
    ];
    if (broken) {
      z[3][0] += 0.18;
      z[3][1] += 0.14;
    }
    return z;
  }
  function velOf(z) {
    const out = z.map(() => [0, 0]);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) {
      const dx = z[i][0] - z[j][0], dy = z[i][1] - z[j][1];
      const r2 = dx * dx + dy * dy;
      const c = G[j] / (TWOPI * r2);
      out[i][0] += -c * dy;
      out[i][1] += c * dx;
    }
    return out;
  }
  function cmOf(z) {
    const S = G[0] + G[1] + G[2] + G[3];
    let cx = 0, cy = 0;
    for (let i = 0; i < N; i++) { cx += G[i] * z[i][0]; cy += G[i] * z[i][1]; }
    return [cx / S, cy / S];
  }
  function signedI(z, c) {
    let I = 0;
    for (let i = 0; i < N; i++) I += G[i] * ((z[i][0] - c[0]) ** 2 + (z[i][1] - c[1]) ** 2);
    return I;
  }
  function geomR2(z, c) {
    let s = 0;
    for (let i = 0; i < N; i++) s += (z[i][0] - c[0]) ** 2 + (z[i][1] - c[1]) ** 2;
    return s / N;
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
    const s = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) s.push(d(i, j));
    return s;
  }
  function simResidual(s, s0) {
    const r0 = Math.hypot.apply(null, s0);
    const r = Math.hypot.apply(null, s);
    if (r < 1e-12 || r0 < 1e-12) return 0;
    let e = 0;
    for (let i = 0; i < s.length; i++) e += (s[i] / r - s0[i] / r0) ** 2;
    return Math.sqrt(e);
  }
  function wtcClosed(thetaDeg) {
    const th = thetaDeg * Math.PI / 180;
    const s2 = Math.sin(2 * th);
    if (Math.abs(s2) < 1e-14) return Infinity;
    const v = (SQRT3 / 4) * (4 - Math.cos(2 * th)) / s2;
    return v < 0 ? -v : v;
  }

  function metricsOf(z0) {
    const c = cmOf(z0);
    const v = velOf(z0);
    const ws = omegaEach(z0, v, c);
    const w0 = (ws[0] + ws[1] + ws[2] + ws[3]) / N;
    const wVar = ws.reduce((s, w) => s + (w - w0) ** 2, 0) / (N - 1);
    const wSig = Math.sqrt(Math.max(0, wVar));
    const R2 = geomR2(z0, c);
    let dR2 = 0;
    for (let i = 0; i < N; i++) dR2 += 2 * ((z0[i][0] - c[0]) * v[i][0] + (z0[i][1] - c[1]) * v[i][1]) / N;
    const tau = Math.abs(dR2) < 1e-14 ? Infinity : -R2 / dR2;
    const I = signedI(z0, c);
    const s0 = sidesOf(z0);
    const wtc = isFinite(tau) ? w0 * tau : Infinity;
    return { c, v, w0, wSig, ws, R2, dR2, tau, I, s0, wtc, z0 };
  }

  function atExact(m, tFrac) {
    const { z0, c, tau, w0 } = m;
    const out = [];
    if (!isFinite(tau) || Math.abs(tau) > 1e8) {
      const psi = w0 * tFrac * 4;
      const cs = Math.cos(psi), sn = Math.sin(psi);
      for (let i = 0; i < N; i++) {
        const rx = z0[i][0] - c[0], ry = z0[i][1] - c[1];
        out.push([c[0] + cs * rx - sn * ry, c[1] + sn * rx + cs * ry]);
      }
      return out;
    }
    const t = tFrac * Math.abs(tau);
    const u = 1 - t / tau;
    if (u <= 1e-8) {
      return [[c[0], c[1]], [c[0], c[1]], [c[0], c[1]], [c[0], c[1]]];
    }
    const beta = w0 * tau;
    const logu = Math.log(u);
    const mag = Math.sqrt(u);
    const cs = Math.cos(-beta * logu), sn = Math.sin(-beta * logu);
    for (let i = 0; i < N; i++) {
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
    const th = kind === 'lock' ? THETA_LOCK : theta;
    const z0 = place(th, broken);
    const m = metricsOf(z0);
    m.wtcForm = broken ? NaN : wtcClosed(th);
    const n = N_DRAW;
    const px = [0, 1, 2, 3].map(() => new Float64Array(n));
    const py = [0, 1, 2, 3].map(() => new Float64Array(n));
    const tt = new Float64Array(n);
    let odeErr = 0, simMax = 0;
    if (broken) {
      let z = z0.map(p => p.slice());
      const T = isFinite(m.tau) && m.tau > 0 ? m.tau * 0.88 : 6;
      const dt = T / (n - 1);
      for (let k = 0; k < n; k++) {
        tt[k] = k / (n - 1);
        for (let i = 0; i < N; i++) { px[i][k] = z[i][0]; py[i][k] = z[i][1]; }
        if (k < n - 1) z = rk4Step(z, dt);
        if (k > 0 && (k % 8) === 0) {
          const sim = simResidual(sidesOf(z), m.s0);
          if (sim > simMax) simMax = sim;
        }
      }
    } else {
      let z = z0.map(p => p.slice());
      const tauAbs = isFinite(m.tau) ? Math.abs(m.tau) : 8;
      const dt = Math.min(0.002, tauAbs / 400);
      const nStep = 80;
      for (let s = 0; s < nStep; s++) z = rk4Step(z, dt);
      const tProbe = nStep * dt;
      const tFracProbe = isFinite(m.tau) && m.tau > 0 ? tProbe / m.tau : tProbe / 8;
      const ex = atExact(m, U.clamp(tFracProbe, 0, 0.9));
      let e = 0, R = Math.sqrt(m.R2) || 1;
      for (let i = 0; i < N; i++) e += (z[i][0] - ex[i][0]) ** 2 + (z[i][1] - ex[i][1]) ** 2;
      odeErr = Math.sqrt(e / N) / R;
      for (let k = 0; k < n; k++) {
        const tf = 0.92 * k / (n - 1);
        tt[k] = tf;
        const zk = atExact(m, tf);
        for (let i = 0; i < N; i++) { px[i][k] = zk[i][0]; py[i][k] = zk[i][1]; }
        if (k > 0 && (k % 12) === 0) {
          const sim = simResidual(sidesOf(zk), m.s0);
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
    return [0, 1, 2, 3].map(i => pal[Math.min(i, pal.length - 1)] || METAL_FALLBACK[i]);
  }

  function collect(traj, view) {
    const pts = [[], [], [], []];
    const n = traj.n;
    for (let k = 0; k < n; k++) {
      if (view === 'space') {
        const t = traj.tt[k];
        for (let i = 0; i < N; i++) pts[i].push([traj.px[i][k], t]);
      } else if (view === 'polar') {
        const c = traj.m.c;
        for (let i = 0; i < N; i++) {
          const rx = traj.px[i][k] - c[0], ry = traj.py[i][k] - c[1];
          pts[i].push([Math.atan2(ry, rx), Math.log(Math.max(Math.hypot(rx, ry), 1e-6))]);
        }
      } else {
        for (let i = 0; i < N; i++) pts[i].push([traj.px[i][k], traj.py[i][k]]);
      }
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < N; i++) for (let k = 0; k < pts[i].length; k++) {
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
    const sc = Math.min(w * (1 - 2 * pad) / dx, h * (1 - 2 * pad) / dy) * zoom;
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
        for (let r = 0; r < 4; r++) {
          const p = packed.pts[RING[r]][k];
          const xy = xf(p[0], p[1]);
          if (r === 0) ctx.moveTo(xy[0], xy[1]); else ctx.lineTo(xy[0], xy[1]);
        }
        ctx.closePath();
        ctx.strokeStyle = metals[k % 4];
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
      for (let r = 0; r < 4; r++) {
        const p = packed.pts[RING[r]][k];
        const xy = xf(p[0], p[1]);
        if (r === 0) ctx.moveTo(xy[0], xy[1]); else ctx.lineTo(xy[0], xy[1]);
      }
      ctx.closePath();
      ctx.strokeStyle = metals[2];
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < N; i++) {
        const p = packed.pts[i][k];
        const xy = xf(p[0], p[1]);
        ctx.beginPath();
        ctx.fillStyle = metals[i];
        ctx.arc(xy[0], xy[1], lw * (2.0 + 0.55 * Math.abs(G[i])), 0, TWOPI);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < N; i++) {
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
        ctx.arc(xy[0], xy[1], lw * (1.6 + 0.45 * Math.abs(G[i])), 0, TWOPI);
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
        for (let r = 0; r < 4; r++) {
          const p = packed.pts[RING[r]][k];
          const xy = xf(p[0], p[1]);
          d.push((r ? 'L' : 'M') + xy[0].toFixed(2) + ' ' + xy[1].toFixed(2));
        }
        parts.push('<path d="' + d.join(' ') + ' Z" fill="none" stroke="' + U.svgEsc(metals[k % 4]) + '" stroke-width="' + (lw * 0.7).toFixed(2) + '" opacity="' + a + '"/>');
      }
    } else {
      for (let i = 0; i < N; i++) {
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

  Studio.register({
    id: 'parallelogram-lock', name: 'Parallelogram lock', tab: 'Parallelogram',
    subtitle: 'ω₀ t_c ≥ 3√5/4 on Novikov-Sedov\'s parallelogram',
    order: 118,
    familiarity: 'unseen',
    equation: 'ω₀ t_c = (√3/4)(4 − cos 2θ)/sin(2θ) ≥ 3√5/4  on the Novikov–Sedov parallelogram;  equality at cos 2θ = 1/4',
    credit: 'A closed form and sharp minimum for the scale-invariant product on the classical four-vortex parallelogram collapse family, independently derived in this project with AI assistance. Circulations Γ = (1, 1, −2 − √3, −2 − √3), diagonals in ratio √(2 + √3), angle θ between the diagonals, 0 < θ < π/2. ω₀ t_c = (√3/4)(4 − cos 2θ)/sin(2θ) ≥ 3√5/4, equality uniquely at cos 2θ = 1/4. With φ = 2θ the quotient is (4 − cos φ)/sin φ, and the critical point is cos φ = 1/4. Four-vortex parallelogram collapse is Novikov and Sedov, Sov. Phys. JETP 50, 297 (1979). Gotoda, arXiv:2002.09624 (2020 preprint), eq. (3.13), gives the collapse rate A(θ) and the spin B(θ) separately after those authors. The product −B/(2A) simplifies to the formula above. The formula and minimum were derived here and recorded on 2026-09-20. Historical priority is unconfirmed; see identities/NOVELTY-AUDIT.md and IDENTITIES.md. The reciprocal pair Γ = (1, 1, −2 + √3, −2 + √3) is the same family with the diagonals swapped. If the vortices leave the parallelogram, or the kernel is wrong, the ratio against 3√5/4 misses and the status line marks miss. The picture still draws.',
    blurb: 'Four point vortices at the vertices of a parallelogram, Novikov and Sedov 1979. Two equal, two equal and opposite, diagonals locked by 2 ± √3 so that L = 0. They collapse self-similarly. ω₀ t_c = (√3/4)(4 − cos 2θ)/sin(2θ) ≥ 3√5/4, equality at cos 2θ = 1/4. The status line is that ratio against 1, the similarity residual against 0, and signed L against 0. Broken steps off the parallelogram so the lock does not hold and the status line marks miss. That is the check working, not the studio breaking. The motion is classical; the closed form of the product and the sharp minimum are the observation.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Collapse: 'Lock is the unique minimizer, cos 2θ = 1/4. Family is the rest of Novikov and Sedov\'s parallelograms. Broken is the control with L ≠ 0. Time is a fraction of t_c.',
      Picture: 'Spiral is the four worldlines. Similar overlays nested snapshots about the center of vorticity; they coincide if the motion is self-similar. Polar is log r against angle, a straight line for a logarithmic spiral. Beads is the parallelogram now. Spacetime is x against t.',
    },
    palette: true,
    defaultPalette: { bg: '#0D0C0B', colors: ['#D4B05A', '#C06E3A', '#8A96A3', '#E8D5A3'] },
    paletteLabel: 'Metals (four vortices)',
    headline: 't', headlineLabel: 't / t_c',
    surprise, sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let traj = null, raf = 0, last = 0;

      function status() {
        if (!traj) return;
        const m = traj.m;
        const lock = Math.abs(m.wtc) / LOCK;
        const form = m.wtcForm;
        const formFail = isFinite(form) && isFinite(m.wtc) && Math.abs(Math.abs(m.wtc) / form - 1) > 0.02;
        const lockFail = !(Math.abs(lock - 1) < 0.02);
        const simFail = traj.simMax > 0.02;
        const IFail = Math.abs(m.I) > 0.02;
        const odeFail = traj.odeErr > 0.03 || formFail;
        const onLock = !traj.broken && Math.abs((host.getState().kind === 'lock' ? THETA_LOCK : host.getState().theta) - THETA_LOCK) < 0.15;
        let tag;
        if (traj.broken) tag = 'off parallelogram';
        else if (traj.rotating) tag = 'relative equilibrium';
        else if (!traj.collapsing) tag = 'expanding';
        else if (onLock && !lockFail && !simFail && !IFail) tag = 'lock held';
        else if (traj.collapsing) tag = 'collapsing';
        else tag = 'drifting';
        const sig = (isFinite(m.tau) && isFinite(m.wSig)) ? sci(m.wSig * Math.abs(m.tau) / LOCK) : '0';
        const lockStr = isFinite(lock) ? f3(lock) : 'inf';
        const wtcStr = isFinite(m.wtc) ? f3(Math.abs(m.wtc)) : 'inf';
        host.setStatus(
          '<span>ω t_c / (3√5/4) <b>' + lockStr + '</b> ± ' + sig + ' · 1' + (onLock && lockFail ? ' · miss' : '') + '</span>' +
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
