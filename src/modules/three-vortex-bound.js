
/* modules/three-vortex-bound.js */
/* GENChase: Three-vortex collapse bound. Closed form ω t_c = (2-cos²θ)/sin(2θ); min √2 at tan θ = 1/√2. Motion is Gröbli; product as spiral pitch is Aref 29c; the rates A, B in this parametrization are Kimura 1987 (4.4). */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
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
    { group: 'Collapse', key: 'kind', label: 'Kind', type: 'seg', kind: GEOM, options: [['octant', 'Octant'], ['family', 'Family'], ['broken', 'Broken'], ['custom', 'Custom']], hint: 'Octant is the π/8, π/4, 5π/8 triangle, the unique minimizer of ω t_c on this family. Family walks the L=0 circle with the Angle slider. Broken pushes vortex 3 off the circle, so L ≠ 0 and the lock does not hold. The status line then marks miss; the picture still draws. Custom takes any three circulations and positions from the Configuration group.' },
    RANGE('Collapse', 'theta', 'Angle', GEOM, 8, 172, 0.5, v => Number(v).toFixed(1) + '°', { dimUnless: s => s.kind === 'family', hint: 'Position of vortex 3 on the L=0 circle. Collapse for θ < 90°, rigid rotation at 90°, expansion for θ > 90°. Octant is 35.264°.' }),
    RANGE('Collapse', 't', 'Time t', LIVE, 0, 0.92, 0.01, f2, { hint: 'Fraction of the collapse time. 0 is the initial triangle. The plate stops short of the singularity.' }),
    { group: 'Collapse', key: 'running', label: 'Run', type: 'toggle', kind: LIVE, hint: 'Walk t toward collapse and loop. Reduced motion leaves the still plate.' },
    RANGE('Collapse', 'speed', 'Pace', LIVE, 0.2, 2.4, 0.05, f2, { dimUnless: s => s.running }),
    RANGE('Configuration', 'gam1', 'Γ₁', GEOM, -3, 3, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    RANGE('Configuration', 'gam2', 'Γ₂', GEOM, -3, 3, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    RANGE('Configuration', 'gam3', 'Γ₃', GEOM, -3, 3, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    RANGE('Configuration', 'x1', 'x₁', GEOM, -2, 2, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    RANGE('Configuration', 'y1', 'y₁', GEOM, -2, 2, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    RANGE('Configuration', 'x2', 'x₂', GEOM, -2, 2, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    RANGE('Configuration', 'y2', 'y₂', GEOM, -2, 2, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    RANGE('Configuration', 'x3', 'x₃', GEOM, -2, 2, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    RANGE('Configuration', 'y3', 'y₃', GEOM, -2, 2, 0.001, v => Number(v).toFixed(3), { dimUnless: s => s.kind === 'custom' }),
    { group: 'Configuration', key: 'project', label: 'Make it collapse', type: 'toggle', kind: GEOM, dimUnless: s => s.kind === 'custom', hint: 'Compute on the nearest self-similar collapse instead of the entered numbers: the circulations move to the nearest point with Σ ΓᵢΓⱼ = 0, written as (1, μ, −μ/(1+μ)) times the larger like-signed circulation, and the odd vortex moves radially onto the zero-impulse circle. If that point would expand, its mirror image across the line through the like-signed pair collapses with the same P, and the mirror is used. The sliders keep the entered numbers.' },
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
    // Custom configuration only; a recipe that does not choose Custom never reads these.
    gam1: 1, gam2: 0.5, gam3: -0.25, x1: -0.5, y1: 0, x2: 0.5, y2: 0, x3: 0.2, y3: 0.6, project: false,
  };
  const PRESETS = {
    octant: pre('Octant lock', { kind: 'octant', theta: +THETA_OCTANT.toFixed(3), t: 0.62, view: 'spiral', zoom: 1.05, fade: 0.22, weight: 1.12, panX: 0, panY: 0 }, Pal.ember),
    threehalves: pre('Three halves', { kind: 'family', theta: 45, t: 0.58, view: 'spiral', zoom: 1.0, fade: 0.2, weight: 1.1, panX: 0, panY: 0 }, Pal.kiln),
    equal: pre('Equilateral', { kind: 'family', theta: 90, t: 0.4, view: 'spiral', zoom: 1.15, fade: 0.08, weight: 1.2, panX: 0, panY: 0 }, Pal.harbor),
    tight: pre('Tight collapse', { kind: 'family', theta: 18, t: 0.7, view: 'spiral', zoom: 0.92, fade: 0.18, weight: 1.05, panX: 0, panY: 0 }, Pal.nightshade),
    overlay: pre('Similar triangles', { kind: 'octant', theta: +THETA_OCTANT.toFixed(3), t: 0.55, view: 'overlay', zoom: 1.2, fade: 0.05, weight: 1.25, panX: 0, panY: 0 }, Pal.glacier),
    polar: pre('Log spiral', { kind: 'octant', theta: +THETA_OCTANT.toFixed(3), t: 0.72, view: 'polar', zoom: 1.08, fade: 0.12, weight: 1.15, panX: 0, panY: 0 }, Pal.graphite),
    // Circulations (1, 1/2, −1/3) at the positions of the paper's parametrization with cos θ = −0.9243893679,
    // sin θ < 0, the minimum of P on the arc A−; Make it collapse snaps the rounded numbers back onto the circle.
    custom: pre('Custom, μ = 1/2', { kind: 'custom', gam1: 1, gam2: 0.5, gam3: -0.333333333333, x1: 0, y1: 0, x2: 1, y2: 0, x3: 1.148568, y3: 0.336408, project: true, t: 0.8, view: 'spiral', zoom: 1.0, fade: 0.2, weight: 1.1, panX: 0, panY: 0 }, Pal.harbor),
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
    if (s.kind !== 'family' && s.kind !== 'broken' && s.kind !== 'custom') s.kind = 'octant';
    s.project = !!s.project;
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

  // Time controls use physical time fractions, while stored trajectories stop at 0.92.
  // Broken controls retain their original normalized diagnostic timeline.
  function timeIndex(traj, fraction) {
    const extent = traj.tt[traj.n - 1] || 1;
    return U.clamp(Math.round(fraction / extent * (traj.n - 1)), 0, traj.n - 1);
  }

  /* ---------- Custom configuration: any three circulations and positions ---------- */
  // custom:begin (tools/three-vortex-custom-check.js evaluates this block on its own)
  // Conventions of papers/minimal-winding: conj(dz_j/dt) = (1/2πi) Σ_k Γ_k/(z_j − z_k), the kernel velOf
  // uses; κ is the common value of (dz_j/dt)/(z_j − z_c) when the motion is self-similar; a collapse has
  // t_c = −1/(2 Re κ), ω₀ = Im κ and P = |ω₀| t_c = |Im κ|/(−2 Re κ). The necessary conditions, Σ_{i<j} ΓᵢΓⱼ = 0
  // and zero angular impulse about the center of vorticity, are Gröbli's and Aref's.
  const SQRT3_2 = Math.sqrt(3) / 2;       // the sharp lower bound on P over every three-vortex collapse
  const CUSTOM_TOL = 1e-9;             // relative κ spread and relative condition size that count as zero
  const MU_MIN = 0.01;                 // the projection keeps μ at least this, since μ → 0 is no collapse
  const ARC_MARGIN = Math.PI / 180;    // and keeps θ a degree inside its arc, off the relative equilibria at its ends
  const CUSTOM_CAP = 400000;           // RK4 steps before a close approach stops the integration

  function bsVel(g, z) {
    const out = z.map(() => [0, 0]);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j) {
      const dx = z[i][0] - z[j][0], dy = z[i][1] - z[j][1];
      const c = g[j] / (2 * Math.PI * (dx * dx + dy * dy));
      out[i][0] -= c * dy;
      out[i][1] += c * dx;
    }
    return out;
  }
  function hamiltonianOf(g, z) {
    let H = 0;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const d2 = (z[i][0] - z[j][0]) ** 2 + (z[i][1] - z[j][1]) ** 2;
      H -= g[i] * g[j] * Math.log(d2) / (4 * Math.PI);
    }
    return H;
  }
  function sidesAll(z) {
    const d = (i, j) => Math.hypot(z[i][0] - z[j][0], z[i][1] - z[j][1]);
    return [d(0, 1), d(1, 2), d(2, 0)];
  }
  function sizeOfZ(z) {
    const s = sidesAll(z);
    return Math.sqrt((s[0] * s[0] + s[1] * s[1] + s[2] * s[2]) / 3);
  }
  function rk4Custom(g, z, dt) {
    const add = (a, k, h) => a.map((p, i) => [p[0] + h * k[i][0], p[1] + h * k[i][1]]);
    const k1 = bsVel(g, z), k2 = bsVel(g, add(z, k1, dt / 2)), k3 = bsVel(g, add(z, k2, dt / 2)), k4 = bsVel(g, add(z, k3, dt));
    return z.map((p, i) => [
      p[0] + dt * (k1[i][0] + 2 * k2[i][0] + 2 * k3[i][0] + k4[i][0]) / 6,
      p[1] + dt * (k1[i][1] + 2 * k2[i][1] + 2 * k3[i][1] + k4[i][1]) / 6,
    ]);
  }

  // The invariant conditions, κ and its spread across the three vortices, and what the motion does.
  function analyzeCustom(g, z) {
    const gmax = Math.max(Math.abs(g[0]), Math.abs(g[1]), Math.abs(g[2]));
    const side = sidesAll(z), size = sizeOfZ(z);
    const out = { g, z, gmax, size, dmin: Math.min(side[0], side[1], side[2]) };
    if (!(gmax > 0)) { out.outcome = 'still'; out.c = [0, 0]; return out; }
    if (!(out.dmin > 1e-9 * Math.max(size, 1e-300))) { out.outcome = 'coincide'; out.c = [z[0][0], z[0][1]]; return out; }
    const S = g[0] + g[1] + g[2];
    out.S = S;
    out.centered = Math.abs(S) > 1e-12 * gmax;
    out.c = out.centered
      ? [(g[0] * z[0][0] + g[1] * z[1][0] + g[2] * z[2][0]) / S, (g[0] * z[0][1] + g[1] * z[1][1] + g[2] * z[2][1]) / S]
      : [(z[0][0] + z[1][0] + z[2][0]) / 3, (z[0][1] + z[1][1] + z[2][1]) / 3];
    out.h2 = g[0] * g[1] + g[1] * g[2] + g[2] * g[0];
    const hAbs = Math.abs(g[0] * g[1]) + Math.abs(g[1] * g[2]) + Math.abs(g[2] * g[0]);
    let L = 0, LAbs = 0;
    for (let i = 0; i < 3; i++) {
      const r2 = (z[i][0] - out.c[0]) ** 2 + (z[i][1] - out.c[1]) ** 2;
      L += g[i] * r2; LAbs += Math.abs(g[i]) * r2;
    }
    out.L = L;
    out.hRel = hAbs > 0 ? out.h2 / hAbs : 0;
    out.LRel = LAbs > 0 ? L / LAbs : 0;
    out.hOk = Math.abs(out.hRel) < CUSTOM_TOL;
    out.LOk = out.centered && Math.abs(out.LRel) < CUSTOM_TOL;
    const v = bsVel(g, z);
    out.v = v;
    let vmax = 0;
    for (let i = 0; i < 3; i++) vmax = Math.max(vmax, Math.hypot(v[i][0], v[i][1]));
    const q = [];
    let offCenter = false;
    for (let i = 0; i < 3; i++) {
      const rx = z[i][0] - out.c[0], ry = z[i][1] - out.c[1], r2 = rx * rx + ry * ry;
      if (r2 <= 1e-24 * size * size) { if (Math.hypot(v[i][0], v[i][1]) > 1e-9 * vmax) offCenter = true; continue; }
      q.push([(v[i][0] * rx + v[i][1] * ry) / r2, (v[i][1] * rx - v[i][0] * ry) / r2]);
    }
    let kr = 0, ki = 0;
    for (const p of q) { kr += p[0] / q.length; ki += p[1] / q.length; }
    const km = Math.hypot(kr, ki);
    let spread = 0;
    for (const p of q) spread = Math.max(spread, Math.hypot(p[0] - kr, p[1] - ki));
    out.kappa = [kr, ki];
    // Without a center of vorticity (ΣΓ = 0) or with a moving vortex at it, no motion is self-similar about it.
    out.spread = !out.centered || offCenter ? Infinity : km > 0 ? spread / km : (spread > 0 ? Infinity : 0);
    out.selfSimilar = out.spread < CUSTOM_TOL;
    if (!out.selfSimilar) out.outcome = 'general';
    else if (!(km > 0)) out.outcome = 'still';
    else if (Math.abs(kr) <= CUSTOM_TOL * km) out.outcome = 'rigid';
    else out.outcome = kr < 0 ? 'collapse' : 'expand';
    if (out.outcome === 'collapse') {
      out.tc = -1 / (2 * kr);
      out.omega0 = ki;
      out.P = Math.abs(ki) / (-2 * kr);
      out.spiral = Math.atan(2 * out.P);       // angle between each path and the direction to the collision point
      out.path = Math.sqrt(1 + 4 * out.P * out.P);
    }
    return out;
  }

  // Nearest self-similar collapse, in the paper's normalization. Circulations: the nearest point of the cone
  // Σ_{i<j} ΓᵢΓⱼ = 0, which for Γ = α e + β, e = (1,1,1)/√3, β ⊥ e, is |β| = √2 |α|; then rewritten exactly as
  // σA(1, μ, −μ/(1+μ)) on (larger like-signed, smaller like-signed, odd). Positions: the like-signed pair stays,
  // the odd vortex moves radially onto the zero-impulse circle w = μ/(1+μ) − (√R/(1+μ)) e^{iθ}, R = 1 + μ + μ²,
  // w = (z_odd − z_a)/(z_b − z_a). Collapsing arcs for σ = +1 are (0, θ₀) and (π, 2π − θ₀), cos θ₀ = (μ − 1)/(2√R);
  // σ = −1 reverses time, which conjugation undoes, so there θ is read as −θ.
  function projectCollapse(g0, z0) {
    const e = 1 / Math.sqrt(3);
    const a0 = (g0[0] + g0[1] + g0[2]) * e;
    let u = [g0[0] - a0 * e, g0[1] - a0 * e, g0[2] - a0 * e];
    const bn = Math.hypot(u[0], u[1], u[2]);
    const sgn = a0 < 0 ? -1 : 1;
    if (bn > 1e-12 * Math.max(Math.abs(a0), 1e-300)) u = u.map(x => x / bn);
    else u = [sgn / Math.sqrt(6), sgn / Math.sqrt(6), -2 * sgn / Math.sqrt(6)];   // equal circulations: vortex 3 goes odd
    const t = (Math.abs(a0) + Math.SQRT2 * bn) / Math.sqrt(3) || 1;
    const cone = [0, 1, 2].map(i => t * e * (sgn * e + Math.SQRT2 * u[i]));
    let odd = 0;
    for (let i = 1; i < 3; i++) if (sgn * cone[i] < sgn * cone[odd]) odd = i;
    const pair = [0, 1, 2].filter(i => i !== odd);
    if (Math.abs(cone[pair[1]]) > Math.abs(cone[pair[0]])) pair.reverse();
    const [a, b] = pair;
    const A = Math.abs(cone[a]) || 1;
    const mu = Math.min(1, Math.max(MU_MIN, sgn * cone[b] / A));
    const g = [0, 0, 0];
    g[a] = sgn * A; g[b] = sgn * A * mu; g[odd] = -sgn * A * mu / (1 + mu);
    let ex = z0[b][0] - z0[a][0], ey = z0[b][1] - z0[a][1];
    if (!(Math.hypot(ex, ey) > 1e-9)) { ex = 1; ey = 0; }
    const e2 = ex * ex + ey * ey;
    const dx = z0[odd][0] - z0[a][0], dy = z0[odd][1] - z0[a][1];
    const wr = (dx * ex + dy * ey) / e2, wi = (dy * ex - dx * ey) / e2;
    const R = 1 + mu + mu * mu, m = mu / (1 + mu), rho = Math.sqrt(R) / (1 + mu);
    const th0 = Math.acos((mu - 1) / (2 * Math.sqrt(R)));
    const wrap = x => ((x % TWOPI) + TWOPI) % TWOPI;
    let th = wrap(sgn * Math.atan2(-wi, m - wr));   // θ in the paper's σ = +1 normalization
    const inArc = x => (x > 0 && x < th0) || (x > Math.PI && x < TWOPI - th0);
    const mirrored = !inArc(th);
    if (mirrored) th = wrap(-th);
    th = th <= Math.PI ? Math.min(Math.max(th, ARC_MARGIN), th0 - ARC_MARGIN)
      : Math.min(Math.max(th, Math.PI + ARC_MARGIN), TWOPI - th0 - ARC_MARGIN);
    const ph = sgn * th, cr = Math.cos(ph), ci = Math.sin(ph);
    const w = [m - rho * cr, -rho * ci];
    const z = [null, null, null];
    z[a] = [z0[a][0], z0[a][1]];
    z[b] = [z0[a][0] + ex, z0[a][1] + ey];
    z[odd] = [z0[a][0] + ex * w[0] - ey * w[1], z0[a][1] + ey * w[0] + ex * w[1]];
    return { g, z, mu, theta: th, arc: th < Math.PI ? 'A+' : 'A−', odd, mirrored, sigma: sgn };
  }

  function similarityAt(z0, c, kr, ki, t) {
    const l2 = 1 + 2 * kr * t;
    if (!(l2 > 0)) return [[c[0], c[1]], [c[0], c[1]], [c[0], c[1]]];
    const lam = Math.sqrt(l2), phi = kr === 0 ? ki * t : ki * Math.log1p(2 * kr * t) / (2 * kr);
    const cs = lam * Math.cos(phi), sn = lam * Math.sin(phi);
    return z0.map(p => {
      const rx = p[0] - c[0], ry = p[1] - c[1];
      return [c[0] + cs * rx - sn * ry, c[1] + sn * rx + cs * ry];
    });
  }

  // Worldlines: the exact similarity solution when the motion is self-similar, with an RK4 probe of it; otherwise
  // RK4 with the step tied to the closest pair (dt = 0.005 · 2π d²/max|Γ|) for four times 2π s²/max|Γ|, s the RMS
  // side, and the change in the Hamiltonian as the integrator's check.
  function customPaths(an, nDraw) {
    const { g, z } = an;
    const out = { an, custom: true, m: { c: an.c } };
    const gmax = an.gmax || 1;
    const record = (n, fill) => {
      const px = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
      const py = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
      const tt = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        const r = fill(k);
        tt[k] = r.tf;
        for (let i = 0; i < 3; i++) { px[i][k] = r.z[i][0]; py[i][k] = r.z[i][1]; }
      }
      Object.assign(out, { px, py, tt, n });
    };
    out.gamDraw = g.map(x => gmax > 0 ? x / gmax : 0);
    if (an.outcome === 'still' || an.outcome === 'coincide') {
      record(2, k => ({ tf: 0.92 * k, z }));
      return out;
    }
    if (an.outcome !== 'general') {
      const [kr, ki] = an.kappa;
      const T = an.outcome === 'collapse' ? an.tc : an.outcome === 'expand' ? 1.5 / kr : TWOPI / Math.abs(ki);
      out.T = T;
      const n = an.outcome === 'collapse' ? Math.min(6000, Math.max(nDraw, Math.round(nDraw * an.P / SQRT2))) : nDraw;
      record(n, k => { const tf = 0.92 * k / (n - 1); return { tf, z: similarityAt(z, an.c, kr, ki, tf * T) }; });
      let zp = z.map(p => p.slice());
      const steps = 1000, dt = 0.25 * T / steps;
      for (let s = 0; s < steps; s++) zp = rk4Custom(g, zp, dt);
      const ex = similarityAt(z, an.c, kr, ki, 0.25 * T);
      let e = 0;
      for (let i = 0; i < 3; i++) e += (zp[i][0] - ex[i][0]) ** 2 + (zp[i][1] - ex[i][1]) ** 2;
      out.odeErr = Math.sqrt(e / 3) / an.size;
      return out;
    }
    const T = 4 * TWOPI * an.size * an.size / gmax;
    out.T = T;
    const H0 = hamiltonianOf(g, z), hScale = (Math.abs(g[0] * g[1]) + Math.abs(g[1] * g[2]) + Math.abs(g[2] * g[0])) / (4 * Math.PI) || 1;
    let zc = z.map(p => p.slice()), t = 0, steps = 0, stopped = false, lo = Infinity, hi = 0, dminAll = Infinity;
    record(nDraw, k => {
      const target = T * k / (nDraw - 1);
      while (!stopped && target - t > 1e-12 * T) {
        const s = sidesAll(zc), dmin = Math.min(s[0], s[1], s[2]);
        const dt = Math.min(target - t, 0.005 * TWOPI * dmin * dmin / gmax);
        const next = rk4Custom(g, zc, dt);
        if (++steps > CUSTOM_CAP || !next.every(p => isFinite(p[0]) && isFinite(p[1]))) { stopped = true; break; }
        zc = next; t += dt;
      }
      const s = sidesAll(zc), sz = sizeOfZ(zc);
      lo = Math.min(lo, sz); hi = Math.max(hi, sz); dminAll = Math.min(dminAll, s[0], s[1], s[2]);
      return { tf: k / (nDraw - 1), z: zc };
    });
    Object.assign(out, { steps, stopped, tEnd: t, sizeLo: lo / an.size, sizeHi: hi / an.size, dminRel: dminAll / an.size,
      dH: (hamiltonianOf(g, zc) - H0) / hScale });
    return out;
  }
  // custom:end

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
    const kNow = timeIndex(traj, tFrac);

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
        ctx.arc(xy[0], xy[1], lw * (2.2 + 1.4 * Math.abs((traj.gamDraw || G)[i])), 0, TWOPI);
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
        ctx.arc(xy[0], xy[1], lw * (1.8 + 1.1 * Math.abs((traj.gamDraw || G)[i])), 0, TWOPI);
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
    const kNow = timeIndex(traj, tFrac);
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
    credit: 'Three-vortex collapse bound: an explicit formula and sharp minimum for a classical three-vortex collapse family, independently derived in this project with AI assistance. Circulations Γ = (1, 1, −1/2), positions z₁ = 0, z₂ = 1, z₃ = 1/2 + (√3/2) e^{iθ} on the L = 0 circle, 0 < θ < π/2. θ is the third vortex\'s place on that circle, not an interior angle. ω₀ t_c = (2 − cos²θ)/sin(2θ) ≥ √2, equality uniquely at tan θ = 1/√2 (interior angles 22.5°, 45°, 112.5°). With u = tan θ the product is u + 1/(2u), and ω₀ t_c − √2 = (√2 u − 1)² / (2u) ≥ 0. At θ = 45° the product is 3/2. Three-vortex collapse is Gröbli (1877). Aref, Phys. Fluids 22, 057104 (2010), gives rotation and collapse separately and writes their product as the pitch of the log spiral. The formula explicitly specializes and reparameterizes the spiral coefficient in Gröbli (1877), section 10. Kimura, J. Phys. Soc. Jpn. 56, 2024 (1987), section 4, gives the collapse and rotation rates A and B in this same parametrization, for circulations (2, 2, −1), and their ratio B/(−2A) is this formula; he minimizes the collision time instead, at cos 2θ = 3/5, where the product is 3/2, the value it also takes at θ = 45°. It was independently derived here and recorded on 2026-09-19. Priority of the optimized minimum remains unconfirmed; see identities/ORIGINALITY-FOLLOWUP.md, identities/NOVELTY-AUDIT.md and IDENTITIES.md. Cite as Three-vortex collapse bound. If the vortices leave the circle, or the kernel is wrong, the ratio against √2 misses and the status line marks miss. The picture still draws. Custom takes any three circulations and positions, computes their Biot-Savart velocities in the same convention, and tests the classical conditions for self-similar collapse, Σ ΓᵢΓⱼ = 0 and zero angular impulse about the center of vorticity (Gröbli 1877; Aref, Phys. Fluids 22, 393 (1979) and 057104 (2010)). Its normalization, circulations (1, μ, −μ/(1+μ)) on the zero-impulse circle, is that of Gotoda, J. Dyn. Differ. Equ. 33, 1759 (2021). The bound P = |ω₀| t_c > √3/2 over every three-vortex collapse, printed beside a custom collapse, is from this project\'s manuscript Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons (papers/minimal-winding), which has not been peer reviewed.',
    blurb: 'Three-vortex collapse bound. Three point vortices of circulations 1, 1, and −1/2, on the L = 0 circle, collapse self-similarly. ω₀ t_c = (2 − cos²θ)/sin(2θ) ≥ √2, equality at tan θ = 1/√2, a triangle of 22.5°, 45°, and 112.5°. θ places the third vortex on the circle; it is not an interior angle. The status line is that ratio against 1, the similarity residual against 0, and signed L against 0. Broken steps off the circle so the lock does not hold and the status line marks miss. That is the check working, not the studio breaking. Custom takes your own three circulations and positions: the status line says whether they collapse and, if not, which condition fails and by how much, and Make it collapse moves them to the nearest configuration that does. Cite as Three-vortex collapse bound.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Collapse: 'Octant is the lock. Family is the rest of Gröbli\'s circle: collapse, then the equilateral relative equilibrium, then expansion. Broken is the control with L ≠ 0. Time is a fraction of t_c.',
      Configuration: 'Custom only. Circulations Γ and positions (x, y) in any units; P does not depend on them. Type exact values in Settings JSON, since the sliders step by 0.001. The status line gives Σ ΓᵢΓⱼ and the angular impulse L about the center of vorticity, both zero for a collapse, and the spread of κ = (dz/dt)/(z − z_c) across the three vortices, zero when the motion is self-similar. A collapse prints κ, t_c, the angle arctan 2P between each path and the collision point, and P beside the sharp bound √3/2. Anything else is integrated with RK4 and the change in the Hamiltonian is printed.',
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

      function customStatus() {
        const a = traj.an, pr = traj.proj;
        const deg = r => (r * 180 / Math.PI).toFixed(2) + '°';
        const cx = (re, im) => sci(re) + (im < 0 ? ' − ' : ' + ') + sci(Math.abs(im)) + 'i';
        const lead = pr
          ? '<span>projected · μ <b>' + pr.mu.toFixed(4) + '</b> · θ <b>' + deg(pr.theta) + '</b> on ' + pr.arc + (pr.mirrored ? ', mirrored' : '') + '</span>'
          : '';
        if (a.outcome === 'still' || a.outcome === 'coincide') {
          host.setStatus(lead + '<span>custom · <b>' + (a.outcome === 'still' ? 'all circulations zero' : 'two vortices coincide') + '</b> · nothing to integrate</span>');
          return;
        }
        const fails = (ok, rel, what) => ok ? 'holds' : 'fails by ' + sci(Math.abs(rel)) + ' of ' + what;
        let html = lead +
          U.stats.compare({ label: 'ΣΓᵢΓⱼ', measured: a.h2, expected: 0, reference: 'collapse condition', basis: 'deterministic', note: fails(a.hOk, a.hRel, 'Σ|ΓᵢΓⱼ|') }) +
          (a.centered
            ? U.stats.compare({ label: 'L', measured: a.L, expected: 0, reference: 'collapse condition', basis: 'deterministic', note: fails(a.LOk, a.LRel, 'Σ|Γᵢ|rᵢ²') })
            : '<span>L <b>undefined</b> · ΣΓ = 0, no center of vorticity</span>') +
          U.stats.compare({ label: 'κ spread', measured: a.spread, expected: 0, reference: 'self-similar', basis: 'deterministic', note: a.selfSimilar ? 'self-similar' : 'not self-similar' });
        const odeOff = isFinite(traj.odeErr) && traj.odeErr > 1e-6 ? ' · ODE off' : '';
        if (a.outcome === 'collapse') {
          html += '<span>collapse · κ <b>' + cx(a.kappa[0], a.kappa[1]) + '</b> · t_c <b>' + sci(a.tc) + '</b> · spiral <b>' + deg(a.spiral) + '</b></span>' +
            U.stats.compare({ label: 'P = |ω₀| t_c', measured: a.P, digits: 10, expected: '√3/2', reference: 'sharp bound P >', basis: 'deterministic',
              note: (a.P > SQRT3_2 ? 'above by ' + sci(a.P - SQRT3_2) : 'miss, below the bound') + odeOff });
        } else if (a.outcome === 'expand') {
          html += '<span>expands self-similarly · κ <b>' + cx(a.kappa[0], a.kappa[1]) + '</b> · Re κ > 0, no collapse' + odeOff + '</span>';
        } else if (a.outcome === 'rigid') {
          html += '<span>rigid rotation · ω <b>' + sci(a.kappa[1]) + '</b> · relative equilibrium, no collapse' + odeOff + '</span>';
        } else {
          html += '<span>RK4 to t <b>' + sci(traj.tEnd) + '</b>' + (traj.stopped ? ' · stopped at a close approach' : '') +
            ' · size <b>' + traj.sizeLo.toFixed(3) + '–' + traj.sizeHi.toFixed(3) + '</b> × start</span>' +
            U.stats.compare({ label: 'ΔH', measured: traj.dH, expected: 0, reference: 'energy invariant', basis: 'deterministic', note: Math.abs(traj.dH) > 1e-6 ? 'integrator off' : 'in units of Σ|ΓᵢΓⱼ|/4π' });
        }
        host.setStatus(html);
      }
      function status() {
        if (!traj) return;
        if (traj.custom) { customStatus(); return; }
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
        // The spread of the three rotation rates about their mean says how rigidly the triangle turns. It
        // is not an error bar: ω t_c comes from Biot-Savart velocities at t = 0 with no randomness in it.
        const sig = (isFinite(m.tau) && isFinite(m.wSig)) ? sci(m.wSig * Math.abs(m.tau) / SQRT2) : '0';
        const miss = fail => fail ? ' · miss' : '';
        // Octant and Family frames come from the analytic similarity map and are placed on the L = 0
        // circle, so those two checks hold by construction there. Broken integrates the ODE off it.
        const built = traj.broken ? 'deterministic' : 'construction';
        host.setStatus(
          (isFinite(lock)
            ? U.stats.compare({ label: 'ω t_c / √2', measured: lock, expected: 1, reference: 'sharp minimum', basis: 'deterministic',
                note: 'rotation-rate spread ' + sig + miss(onOctant && lockFail) })
            : '<span>ω t_c / √2 <b>inf</b></span>') +
          U.stats.compare({ label: 'similar', measured: traj.simMax, expected: 0, reference: 'self-similar', basis: built, note: simFail ? 'miss' : undefined }) +
          U.stats.compare({ label: 'L', measured: m.I, expected: 0, reference: 'collapse condition', basis: built, note: IFail ? 'miss' : undefined }) +
          '<span>' + tag + ' · ' + (isFinite(m.wtc)
            ? U.stats.compare({ label: 'ω t_c', measured: m.wtc, expected: isFinite(form) ? form : undefined, reference: 'closed form', basis: 'deterministic', note: odeFail ? 'ODE off' : undefined })
            : 'ω t_c inf' + (odeFail ? ' · ODE off' : '')) + '</span>'
        );
      }
      function compute() {
        const s = host.getState();
        if (s.kind === 'custom') {
          let g = [s.gam1, s.gam2, s.gam3], z = [[s.x1, s.y1], [s.x2, s.y2], [s.x3, s.y3]], proj = null;
          if (s.project) { proj = projectCollapse(g, z); g = proj.g; z = proj.z; }
          traj = customPaths(analyzeCustom(g, z), N_DRAW);
          traj.proj = proj;
        } else traj = integrate(s.kind, s.theta);
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
