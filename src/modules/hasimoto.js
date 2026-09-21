
/* modules/hasimoto.js */
/* GENChase: Hasimoto vortex-filament soliton. Speed equals twice the torsion. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const VIEWS = ['filament', 'head', 'print', 'space', 'overlay'];
  const METAL_FALLBACK = ['#D4B05A', '#C06E3A', '#E8D5A3'];
  const N_DRAW = 640;
  const N_MEAS = 1401;

  const SCHEMA = [
    { group: 'Sheet', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Soliton', 'nu', 'Width ν', GEOM, 0.28, 2.4, 0.02, f2, { hint: 'Inverse width of the sech. Peak curvature is 2ν. Larger ν is a tighter loop.' }),
    RANGE('Soliton', 'tau0', 'Torsion τ₀', GEOM, 0, 2.8, 0.02, f2, { hint: 'Constant torsion. Envelope speed along the filament is 2τ₀. Zero is the planar smoke-ring limit.' }),
    RANGE('Soliton', 't', 'Time t', LIVE, -6, 6, 0.05, f2, { hint: 'The sech envelope sits at s = 2τ₀ t. The helix also rotates as Θ = τ₀ s + (ν² − τ₀²) t.' }),
    { group: 'Soliton', key: 'running', label: 'Run', type: 'toggle', kind: LIVE, hint: 'Advance t. The loop travels along the line vortex at speed 2τ₀.' },
    RANGE('Soliton', 'speed', 'Pace', LIVE, 0.2, 2.4, 0.05, f2, { dimUnless: s => s.running }),
    RANGE('Soliton', 'lag', 'Overlay Δt', GEOM, 0.2, 3.2, 0.05, f2, { hint: 'Second snapshot in Overlay. The peak should have moved Δs = 2τ₀ Δt.', dimUnless: s => s.view === 'overlay' }),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['filament', 'Filament'], ['head', 'Head-on'], ['print', 'Print'], ['space', 'Spacetime'], ['overlay', 'Overlay']] },
    RANGE('Picture', 'zoom', 'View', PAINT, 0.45, 2.6, 0.05, f2),
    RANGE('Picture', 'yaw', 'Yaw', PAINT, -180, 180, 2, v => Math.round(v) + '°', { dimUnless: s => s.view === 'filament' || s.view === 'overlay' }),
    RANGE('Picture', 'pitch', 'Pitch', PAINT, -80, 80, 1, v => Math.round(v) + '°', { dimUnless: s => s.view === 'filament' || s.view === 'overlay' }),
    RANGE('Picture', 'persp', 'Persp', PAINT, 0, 0.18, 0.01, f2, { hint: '0 is orthographic. A little perspective makes the line recede.', dimUnless: s => s.view === 'filament' || s.view === 'overlay' || s.view === 'head' }),
    RANGE('Picture', 'weight', 'Weight', PAINT, 0.4, 2.2, 0.05, f2),
    RANGE('Picture', 'panX', 'Pan X', PAINT, -0.6, 0.6, 0.02, f2),
    RANGE('Picture', 'panY', 'Pan Y', PAINT, -0.6, 0.6, 0.02, f2),
  ];
  const DEFAULTS = {
    aspect: '1:1', nu: 0.88, tau0: 0.34, t: 0, running: false, speed: 0.85, lag: 1.15,
    view: 'filament', zoom: 1.08, yaw: 48, pitch: 22, persp: 0.05, weight: 1.22, panX: 0, panY: 0,
  };
  const PRESETS = {
    loop: pre('Loop', { nu: 0.88, tau0: 0.34, t: 0, view: 'filament', zoom: 1.08, yaw: 48, pitch: 22, persp: 0.05, weight: 1.22, panX: 0, panY: 0 }, Pal.ember),
    tight: pre('Tight', { nu: 1.72, tau0: 0.46, t: 0, view: 'filament', zoom: 1.35, yaw: 42, pitch: 26, persp: 0.04, weight: 1.28, panX: 0.04, panY: 0.02 }, Pal.thermal),
    helix: pre('Helix', { nu: 0.64, tau0: 1.32, t: 0.2, view: 'filament', zoom: 1.12, yaw: 52, pitch: 26, persp: 0.06, weight: 1.22, panX: 0, panY: 0 }, Pal.nightshade),
    planar: pre('Smoke ring', { nu: 0.72, tau0: 0.02, t: 0, view: 'filament', zoom: 0.92, yaw: 28, pitch: 54, persp: 0.03, weight: 1.18, panX: 0, panY: -0.04 }, Pal.glacier),
    space: pre('Spacetime', { nu: 0.9, tau0: 0.48, t: 0, view: 'space', zoom: 1, yaw: 48, pitch: 22, persp: 0, weight: 1, panX: 0, panY: 0 }, Pal.kiln),
    overlay: pre('Two snapshots', { nu: 0.82, tau0: 0.55, t: -0.35, lag: 1.35, view: 'overlay', zoom: 1.05, yaw: 44, pitch: 24, persp: 0.05, weight: 1.08, panX: 0, panY: 0 }, Pal.harbor),
    head: pre('Head-on', { nu: 0.58, tau0: 1.85, t: 0.2, view: 'head', zoom: 1.22, yaw: 0, pitch: 0, persp: 0.02, weight: 1.2, panX: 0, panY: 0 }, Pal.xray),
  };

  function surprise(rng) {
    const nu = rng.range(0.45, 1.85);
    const helix = rng() < 0.22;
    return {
      nu,
      tau0: helix ? rng.range(1.2, 2.5) : rng() < 0.18 ? rng.range(0, 0.06) : rng.range(0.18, 0.85),
      t: rng.range(-1.2, 1.2),
      lag: rng.range(0.6, 1.8),
      view: rng.pick(['filament', 'filament', 'filament', 'head', 'print', 'space', 'overlay']),
      zoom: rng.range(0.8, 1.45),
      yaw: rng.range(18, 72),
      pitch: rng.range(8, 42),
      persp: rng.pick([0, 0.03, 0.05, 0.08]),
      weight: rng.range(0.85, 1.45),
      panX: 0, panY: 0,
    };
  }
  function sanitize(s) {
    s.nu = U.clamp(Number(s.nu) || 0.88, 0.28, 2.4);
    s.tau0 = U.clamp(Number(s.tau0) || 0, 0, 2.8);
    s.t = U.clamp(Number(s.t) || 0, -6, 6);
    s.lag = U.clamp(Number(s.lag) || 1.15, 0.2, 3.2);
    s.speed = U.clamp(Number(s.speed) || 0.85, 0.2, 2.4);
    if (VIEWS.indexOf(s.view) < 0) s.view = 'filament';
    s.zoom = U.clamp(Number(s.zoom) || 1, 0.45, 2.6);
    s.yaw = U.clamp(Number(s.yaw) || 0, -180, 180);
    s.pitch = U.clamp(Number(s.pitch) || 0, -80, 80);
    s.persp = U.clamp(Number(s.persp) || 0, 0, 0.18);
    s.weight = U.clamp(Number(s.weight) || 1, 0.4, 2.2);
    s.panX = U.clamp(Number(s.panX) || 0, -0.6, 0.6);
    s.panY = U.clamp(Number(s.panY) || 0, -0.6, 0.6);
    s.running = !!s.running;
  }

  function sech(x) {
    const a = Math.abs(x);
    if (a > 20) return 2 * Math.exp(-a);
    return 1 / Math.cosh(x);
  }
  function muOf(nu, tau0) { return (nu * nu) / (nu * nu + tau0 * tau0); }

  // Kida / Hasimoto traveling wave. s is arc length. Envelope speed is 2 τ0.
  function posAt(s, t, nu, tau0) {
    const mu = muOf(nu, tau0);
    const eta = nu * (s - 2 * tau0 * t);
    const r = (2 * mu / nu) * sech(eta);
    const Th = tau0 * s + (nu * nu - tau0 * tau0) * t;
    return {
      x: s - (2 * mu / nu) * Math.tanh(eta),
      y: r * Math.cos(Th),
      z: r * Math.sin(Th),
    };
  }

  function sample(t, nu, tau0, n, span, sCenter) {
    const ds = (2 * span) / (n - 1);
    const s0 = sCenter - span;
    const x = new Float64Array(n), y = new Float64Array(n), z = new Float64Array(n), ss = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const s = s0 + i * ds;
      const p = posAt(s, t, nu, tau0);
      x[i] = p.x; y[i] = p.y; z[i] = p.z; ss[i] = s;
    }
    return { n, x, y, z, s: ss, ds, t, nu, tau0, span, sCenter };
  }

  function crossX(ax, ay, az, bx, by, bz) { return ay * bz - az * by; }
  function crossY(ax, ay, az, bx, by, bz) { return az * bx - ax * bz; }
  function crossZ(ax, ay, az, bx, by, bz) { return ax * by - ay * bx; }

  function stencil(crv, i) {
    const ds = crv.ds, n = crv.n;
    const i0 = i - 1, i1 = i + 1;
    const gsx = (crv.x[i1] - crv.x[i0]) / (2 * ds);
    const gsy = (crv.y[i1] - crv.y[i0]) / (2 * ds);
    const gsz = (crv.z[i1] - crv.z[i0]) / (2 * ds);
    const gssx = (crv.x[i1] - 2 * crv.x[i] + crv.x[i0]) / (ds * ds);
    const gssy = (crv.y[i1] - 2 * crv.y[i] + crv.y[i0]) / (ds * ds);
    const gssz = (crv.z[i1] - 2 * crv.z[i] + crv.z[i0]) / (ds * ds);
    let gsssx = 0, gsssy = 0, gsssz = 0;
    if (i >= 2 && i <= n - 3) {
      const i2 = i + 2, im2 = i - 2;
      const inv = 1 / (2 * ds * ds * ds);
      gsssx = (crv.x[i2] - 2 * crv.x[i1] + 2 * crv.x[i0] - crv.x[im2]) * inv;
      gsssy = (crv.y[i2] - 2 * crv.y[i1] + 2 * crv.y[i0] - crv.y[im2]) * inv;
      gsssz = (crv.z[i2] - 2 * crv.z[i1] + 2 * crv.z[i0] - crv.z[im2]) * inv;
    }
    return { gsx, gsy, gsz, gssx, gssy, gssz, gsssx, gsssy, gsssz };
  }

  function peakOf(crv) {
    const n = crv.n;
    const k = new Float64Array(n);
    const tau = new Float64Array(n);
    let kMax = 0, iMax = 2;
    for (let i = 2; i < n - 2; i++) {
      const d = stencil(crv, i);
      const cx = crossX(d.gsx, d.gsy, d.gsz, d.gssx, d.gssy, d.gssz);
      const cy = crossY(d.gsx, d.gsy, d.gsz, d.gssx, d.gssy, d.gssz);
      const cz = crossZ(d.gsx, d.gsy, d.gsz, d.gssx, d.gssy, d.gssz);
      const gsN = Math.hypot(d.gsx, d.gsy, d.gsz);
      const cn = Math.hypot(cx, cy, cz);
      const ki = gsN > 1e-14 ? cn / (gsN * gsN * gsN) : 0;
      k[i] = ki;
      if (cn > 1e-14) tau[i] = (cx * d.gsssx + cy * d.gsssy + cz * d.gsssz) / (cn * cn);
      if (ki > kMax) { kMax = ki; iMax = i; }
    }
    const km = k[iMax - 1], k0 = k[iMax], kp = k[iMax + 1];
    const den = km - 2 * k0 + kp;
    const delta = Math.abs(den) > 1e-18 ? U.clamp(0.5 * (km - kp) / den, -1, 1) : 0;
    const kPeak = k0 - 0.25 * (km - kp) * delta;
    const sPeak = crv.s[iMax] + delta * crv.ds;
    let tSum = 0, tSq = 0, tN = 0;
    const cut = 0.35 * kMax;
    for (let i = 2; i < n - 2; i++) {
      if (k[i] > cut) { tSum += tau[i]; tSq += tau[i] * tau[i]; tN++; }
    }
    const tauMean = tN ? tSum / tN : 0;
    const tauSd = tN > 1 ? Math.sqrt(Math.max(0, tSq / tN - tauMean * tauMean)) : 0;
    return { k, tau, kMax, iMax, kPeak, sPeak, tauMean, tauSd, nTau: tN };
  }

  function liaResidual(nu, tau0, t, n, span, sCenter) {
    const eps = 1e-4;
    const a = sample(t - eps, nu, tau0, n, span, sCenter);
    const b = sample(t, nu, tau0, n, span, sCenter);
    const c = sample(t + eps, nu, tau0, n, span, sCenter);
    let sum = 0, nn = 0, worst = 0;
    for (let i = 2; i < n - 2; i++) {
      const d = stencil(b, i);
      const gssN = Math.hypot(d.gssx, d.gssy, d.gssz);
      if (gssN < 1e-6) continue;
      const gtx = (c.x[i] - a.x[i]) / (2 * eps);
      const gty = (c.y[i] - a.y[i]) / (2 * eps);
      const gtz = (c.z[i] - a.z[i]) / (2 * eps);
      const rx = crossX(d.gsx, d.gsy, d.gsz, d.gssx, d.gssy, d.gssz);
      const ry = crossY(d.gsx, d.gsy, d.gsz, d.gssx, d.gssy, d.gssz);
      const rz = crossZ(d.gsx, d.gsy, d.gsz, d.gssx, d.gssy, d.gssz);
      const res = Math.hypot(gtx - rx, gty - ry, gtz - rz) / gssN;
      sum += res; nn++;
      if (res > worst) worst = res;
    }
    return { mean: nn ? sum / nn : 0, max: worst };
  }

  function measure(nu, tau0, t) {
    const span = 12 / nu;
    const sCenter = 2 * tau0 * t;
    const crv = sample(t, nu, tau0, N_MEAS, span, sCenter);
    const pk = peakOf(crv);
    const kTh = 2 * nu;
    const kRatio = kTh > 1e-12 ? pk.kPeak / kTh : 0;
    let kCoarse = pk.kMax;
    const iC = pk.iMax;
    if (iC >= 4 && iC <= crv.n - 5) {
      const ds2 = 2 * crv.ds;
      const gsx = (crv.x[iC + 2] - crv.x[iC - 2]) / (2 * ds2);
      const gsy = (crv.y[iC + 2] - crv.y[iC - 2]) / (2 * ds2);
      const gsz = (crv.z[iC + 2] - crv.z[iC - 2]) / (2 * ds2);
      const gssx = (crv.x[iC + 2] - 2 * crv.x[iC] + crv.x[iC - 2]) / (ds2 * ds2);
      const gssy = (crv.y[iC + 2] - 2 * crv.y[iC] + crv.y[iC - 2]) / (ds2 * ds2);
      const gssz = (crv.z[iC + 2] - 2 * crv.z[iC] + crv.z[iC - 2]) / (ds2 * ds2);
      const cx = crossX(gsx, gsy, gsz, gssx, gssy, gssz);
      const cy = crossY(gsx, gsy, gsz, gssx, gssy, gssz);
      const cz = crossZ(gsx, gsy, gsz, gssx, gssy, gssz);
      const gsN = Math.hypot(gsx, gsy, gsz);
      if (gsN > 1e-14) kCoarse = Math.hypot(cx, cy, cz) / (gsN * gsN * gsN);
    }
    const kSigma = Math.abs(pk.kPeak - kCoarse) / Math.max(kTh, 1e-9);

    const dt = 0.4 / Math.max(0.12, Math.abs(tau0) || 0.12);
    const b = sample(t + dt, nu, tau0, N_MEAS, span, 2 * tau0 * (t + dt));
    const pb = peakOf(b);
    const c = (pb.sPeak - pk.sPeak) / dt;
    const cTh = 2 * tau0;
    const cRatio = Math.abs(cTh) > 1e-6 ? c / cTh : (Math.abs(c) < 1e-3 ? 1 : 0);
    const sigS = 0.25 * crv.ds;
    const cSigma = Math.abs(cTh) > 1e-6 ? (Math.SQRT2 * sigS / dt) / Math.abs(cTh) : 0;

    const lia = liaResidual(nu, tau0, t, N_MEAS, span, sCenter);
    const mu = muOf(nu, tau0);
    let tag = 'helix';
    if (Math.abs(tau0) < 0.08 * nu) tag = 'planar';
    else if (mu > 0.5) tag = 'loop';
    return {
      kRatio, kSigma, kPeak: pk.kPeak, kTh,
      cRatio, cSigma, c, cTh,
      tauMean: pk.tauMean, tauSd: pk.tauSd, tau0,
      liaMean: lia.mean, liaMax: lia.max,
      sPeak: pk.sPeak, mu, tag, pk, crv,
    };
  }

  function metalsOf(s) {
    const pal = Array.isArray(s.palette) ? s.palette : [];
    const bg = s.bg || '#0D0C0B';
    const lb = U.luminance(bg);
    const ranked = pal.filter(c => c && Math.abs(U.luminance(c) - lb) > 18)
      .slice()
      .sort((a, b) => Math.abs(U.luminance(b) - lb) - Math.abs(U.luminance(a) - lb));
    const out = [];
    for (let i = 0; i < ranked.length && out.length < 3; i++) out.push(ranked[i]);
    const fb = U.isLight(bg) ? ['#1A1510', '#8C4A28', '#5C6570'] : METAL_FALLBACK;
    for (let i = 0; out.length < 3; i++) out.push(fb[i % 3]);
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

  function camOf(s, view, target) {
    let yaw = (Number(s.yaw) || 0) * Math.PI / 180;
    let pitch = (Number(s.pitch) || 0) * Math.PI / 180;
    if (view === 'head') { yaw = 0; pitch = 0; }
    return {
      yaw, pitch, persp: view === 'print' || view === 'space' ? 0 : (Number(s.persp) || 0),
      tx: target.x, ty: target.y, tz: target.z,
    };
  }
  function toCam(x, y, z, cam) {
    x -= cam.tx; y -= cam.ty; z -= cam.tz;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const x1 = x * cy + y * sy;
    const y1 = -x * sy + y * cy;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const x2 = x1 * cp - z * sp;
    const z2 = x1 * sp + z * cp;
    const persp = 1 / (1 + cam.persp * (x2 + 2.4));
    return { X: y1 * persp, Y: z2 * persp, D: x2, p: persp };
  }

  function boundsOf(arr) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      if (p.X < x0) x0 = p.X; if (p.X > x1) x1 = p.X;
      if (p.Y < y0) y0 = p.Y; if (p.Y > y1) y1 = p.Y;
    }
    if (!(x1 > x0)) { x0 = -1; x1 = 1; }
    if (!(y1 > y0)) { y0 = -1; y1 = 1; }
    const cx = (x0 + x1) * 0.5, cy = (y0 + y1) * 0.5;
    let hw = (x1 - x0) * 0.5, hh = (y1 - y0) * 0.5;
    const maxA = 2.15;
    if (hw > maxA * hh) hw = maxA * hh;
    if (hh > maxA * hw) hh = maxA * hw;
    const pad = 0.04 * Math.max(hw, hh);
    return { x0: cx - hw - pad, y0: cy - hh - pad, x1: cx + hw + pad, y1: cy + hh + pad };
  }
  function xformOf(b, w, h, zoom, panX, panY) {
    const bw = Math.max(1e-6, b.x1 - b.x0);
    const bh = Math.max(1e-6, b.y1 - b.y0);
    const pad = 0.12;
    const sc = Math.min(w * (1 - 2 * pad) / bw, h * (1 - 2 * pad) / bh) * zoom;
    const cx = (b.x0 + b.x1) * 0.5 - panX * bw;
    const cy = (b.y0 + b.y1) * 0.5 - panY * bh;
    return function (X, Y) {
      return [w * 0.5 + (X - cx) * sc, h * 0.5 - (Y - cy) * sc];
    };
  }

  function projectCurve(crv, cam, kArr) {
    const n = crv.n;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = toCam(crv.x[i], crv.y[i], crv.z[i], cam);
      p.k = kArr ? kArr[i] : 0;
      p.i = i;
      out[i] = p;
    }
    return out;
  }

  function drawBead(g, x, y, r, color, bg) {
    const hi = U.mixHex(color, '#FFFFFF', 0.42);
    const lo = U.mixHex(color, bg, 0.35);
    const grd = g.createRadialGradient(x - r * 0.32, y - r * 0.32, r * 0.1, x, y, r);
    grd.addColorStop(0, hi);
    grd.addColorStop(0.5, color);
    grd.addColorStop(1, lo);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = grd;
    g.fill();
  }

  function strokeDepth(g, mapped, xf, color, colorLo, width, kMax, glow, mixHeat) {
    const n = mapped.length;
    if (n < 2) return;
    const pts = new Array(n);
    for (let i = 0; i < n; i++) {
      const xy = xf(mapped[i].X, mapped[i].Y);
      pts[i] = { x: xy[0], y: xy[1], D: mapped[i].D, k: mapped[i].k, p: mapped[i].p };
    }
    if (glow) {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < n; i++) g.lineTo(pts[i].x, pts[i].y);
      g.strokeStyle = rgba(color, 0.11);
      g.lineWidth = width * 3.6;
      g.stroke();
    }
    const order = [];
    const chunk = 4;
    for (let i = 0; i < n - 1; i += chunk) {
      const j1 = Math.min(n - 1, i + chunk);
      let D = 0;
      for (let j = i; j <= j1; j++) D += pts[j].D;
      D /= (j1 - i + 1);
      order.push({ i, j1, D });
    }
    order.sort((a, b) => b.D - a.D);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const lo = colorLo || color;
    for (let q = 0; q < order.length; q++) {
      const a = order[q], i0 = a.i, j1 = a.j1;
      const mid = pts[(i0 + j1) >> 1];
      const heat = kMax > 1e-9 ? U.clamp(mid.k / kMax, 0, 1) : 0;
      const col = mixHeat ? U.mixHex(lo, color, 0.18 + 0.82 * heat) : color;
      const lit = 0.40 + 0.60 * heat;
      const wp = width * (0.72 + 0.30 * (mid.p || 1)) * (0.76 + 0.48 * heat);
      g.beginPath();
      g.moveTo(pts[i0].x, pts[i0].y);
      for (let j = i0 + 1; j <= j1; j++) g.lineTo(pts[j].x, pts[j].y);
      g.strokeStyle = rgba(col, 0.48 + 0.50 * lit);
      g.lineWidth = wp;
      g.stroke();
    }
  }

  function paintFilaments(g, w, h, s, layers, view) {
    const bg = s.bg || '#0D0C0B';
    const metals = metalsOf(s);
    const minS = Math.min(w, h);
    const W0 = Math.max(1.4, 0.016 * minS * s.weight);
    const camTarget = layers[0].target;
    const cam = camOf(s, view, camTarget);
    const projected = layers.map(L => projectCurve(L.crv, cam, L.k));
    const all = [];
    for (let q = 0; q < projected.length; q++) {
      const arr = projected[q];
      const kM = layers[q].kMax;
      for (let i = 0; i < arr.length; i++) {
        const heat = kM > 1e-9 ? arr[i].k / kM : 0;
        if (heat > 0.025) all.push(arr[i]);
      }
    }
    const used = all.length > 8 ? all : projected[0];
    const b = boundsOf(used);
    const xf = xformOf(b, w, h, s.zoom, s.panX, s.panY);

    const vig = g.createRadialGradient(w * 0.5, h * 0.48, minS * 0.16, w * 0.5, h * 0.5, minS * 0.74);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, U.isLight(bg) ? 'rgba(20,16,10,0.10)' : 'rgba(0,0,0,0.32)');
    g.fillStyle = vig;
    g.fillRect(0, 0, w, h);

    // Ghost of the unperturbed line vortex, a faint axis through the tails.
    const axis = [];
    const spanA = layers[0].crv.span * 1.15;
    const sc0 = layers[0].crv.sCenter;
    const tau0 = layers[0].crv.tau0, nu = layers[0].crv.nu, t0 = layers[0].crv.t;
    for (let i = 0; i < 48; i++) {
      const sv = sc0 - spanA + 2 * spanA * i / 47;
      const p = posAt(sv, t0, nu, tau0);
      const r2 = p.y * p.y + p.z * p.z;
      if (r2 > 0.08) continue;
      axis.push(toCam(p.x, 0, 0, cam));
    }
    if (axis.length > 1) {
      g.lineCap = 'round';
      g.beginPath();
      const a0 = xf(axis[0].X, axis[0].Y);
      g.moveTo(a0[0], a0[1]);
      for (let i = 1; i < axis.length; i++) {
        const a = xf(axis[i].X, axis[i].Y);
        g.lineTo(a[0], a[1]);
      }
      g.strokeStyle = U.inkRgba(bg, U.isLight(bg) ? 0.18 : 0.14);
      g.lineWidth = Math.max(0.7, minS * 0.0018);
      g.stroke();
    }

    for (let q = 0; q < layers.length; q++) {
      const L = layers[q];
      const col = metals[q % 3];
      const lo = metals[Math.min(1, metals.length - 1)];
      strokeDepth(g, projected[q], xf, col, lo, W0 * (q === 0 ? 1 : 0.92), L.kMax, true, layers.length === 1);
    }

    for (let q = 0; q < layers.length; q++) {
      const L = layers[q];
      const iP = L.iMax;
      const bead = xf(projected[q][iP].X, projected[q][iP].Y);
      drawBead(g, bead[0], bead[1], Math.max(3.2, 0.011 * minS * s.weight), metals[q % 3], bg);
    }
    return { xf, projected, metals, minS };
  }

  function paintPrint(g, w, h, s, meas) {
    const bg = s.bg || '#0D0C0B';
    const metals = metalsOf(s);
    const gold = metals[0], copper = metals[1];
    const minS = Math.min(w, h);
    const crv = meas.crv, pk = meas.pk;
    const n = crv.n;
    const s0 = crv.s[2], s1 = crv.s[n - 3];
    let tMax = 0.15;
    for (let i = 2; i < n - 2; i++) if (Math.abs(pk.tau[i]) > tMax) tMax = Math.abs(pk.tau[i]);
    tMax = Math.max(tMax, Math.abs(s.tau0) * 1.4, 0.2);
    const kScale = Math.max(meas.kTh * 1.35, pk.kPeak * 1.2, 0.4);
    const padL = w * 0.12, padR = w * 0.08, padT = h * 0.14, padB = h * 0.16;
    const xOf = sv => padL + (sv - s0) / (s1 - s0) * (w - padL - padR);
    const yK = kv => padT + (1 - kv / kScale) * (h - padT - padB);
    const yT = tv => padT + (1 - (tv + tMax) / (2 * tMax)) * (h - padT - padB);

    g.strokeStyle = U.inkRgba(bg, 0.22);
    g.lineWidth = Math.max(0.8, minS * 0.0018);
    const y0 = yK(0);
    g.beginPath(); g.moveTo(padL, padT); g.lineTo(padL, h - padB); g.lineTo(w - padR, h - padB); g.stroke();
    g.beginPath(); g.moveTo(padL, y0); g.lineTo(w - padR, y0); g.stroke();
    const xPeak = xOf(pk.sPeak);
    g.setLineDash([minS * 0.008, minS * 0.01]);
    g.beginPath(); g.moveTo(xPeak, padT); g.lineTo(xPeak, h - padB); g.stroke();
    g.setLineDash([]);

    g.beginPath();
    g.moveTo(xOf(crv.s[2]), y0);
    for (let i = 2; i < n - 2; i++) g.lineTo(xOf(crv.s[i]), yK(pk.k[i]));
    g.lineTo(xOf(crv.s[n - 3]), y0);
    g.closePath();
    g.fillStyle = rgba(gold, U.isLight(bg) ? 0.28 : 0.22);
    g.fill();
    g.beginPath();
    g.moveTo(xOf(crv.s[2]), yK(pk.k[2]));
    for (let i = 3; i < n - 2; i++) g.lineTo(xOf(crv.s[i]), yK(pk.k[i]));
    g.strokeStyle = rgba(gold, 0.95);
    g.lineWidth = Math.max(1.4, 0.007 * minS * s.weight);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.stroke();

    g.beginPath();
    g.moveTo(xOf(crv.s[2]), yT(pk.tau[2]));
    for (let i = 3; i < n - 2; i++) g.lineTo(xOf(crv.s[i]), yT(pk.tau[i]));
    g.strokeStyle = rgba(copper, 0.88);
    g.lineWidth = Math.max(1.1, 0.0045 * minS * s.weight);
    g.stroke();

    const yTh = yK(meas.kTh);
    g.setLineDash([minS * 0.006, minS * 0.008]);
    g.beginPath(); g.moveTo(padL, yTh); g.lineTo(w - padR, yTh); g.strokeStyle = rgba(gold, 0.45); g.stroke();
    g.setLineDash([]);
    drawBead(g, xPeak, yK(pk.kPeak), Math.max(3.4, 0.01 * minS), gold, bg);
  }

  function paintSpace(g, w, h, s, meas) {
    const bg = s.bg || '#0D0C0B';
    const metals = metalsOf(s);
    const gold = metals[0], copper = metals[1];
    const nu = s.nu, tau0 = s.tau0, tNow = meas.crv.t;
    const spanS = 8 / nu;
    const spanT = Math.max(2.2, 5.5 / Math.max(0.35, Math.abs(2 * tau0)));
    const sC = 2 * tau0 * tNow;
    const t0 = tNow - spanT * 0.5, t1 = tNow + spanT * 0.5;
    const sLo = sC - spanS, sHi = sC + spanS;
    const img = g.createImageData(w, h);
    const data = img.data;
    const lut = U.makeRampLUT(s.palette && s.palette.length ? s.palette : metals, bg, 256);
    const kTh = 2 * nu;
    for (let py = 0; py < h; py++) {
      const tt = t1 - (py + 0.5) / h * (t1 - t0);
      for (let px = 0; px < w; px++) {
        const sv = sLo + (px + 0.5) / w * (sHi - sLo);
        const eta = nu * (sv - 2 * tau0 * tt);
        const kv = 2 * nu * sech(eta);
        const u = U.clamp(Math.pow(kv / (kTh * 1.05), 0.72), 0, 1);
        const idx = Math.max(0, Math.min(255, (u * 255 + 0.5) | 0)) * 3;
        const o = (py * w + px) * 4;
        data[o] = lut[idx]; data[o + 1] = lut[idx + 1]; data[o + 2] = lut[idx + 2]; data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.globalAlpha = U.isLight(bg) ? 0.08 : 0.18;
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;

    const xOf = sv => (sv - sLo) / (sHi - sLo) * w;
    const yOf = tt => (t1 - tt) / (t1 - t0) * h;
    const nTrack = 28;
    const minS = Math.min(w, h);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < nTrack; i++) {
      const tt = t0 + (i + 0.5) / nTrack * (t1 - t0);
      const sm = sample(tt, nu, tau0, 401, spanS, 2 * tau0 * tt);
      const pk = peakOf(sm);
      const xy = [xOf(pk.sPeak), yOf(tt)];
      if (i === 0) g.moveTo(xy[0], xy[1]); else g.lineTo(xy[0], xy[1]);
    }
    g.strokeStyle = rgba(gold, 0.92);
    g.lineWidth = Math.max(1.6, 0.007 * minS * s.weight);
    g.stroke();

    const yNow = yOf(tNow);
    g.setLineDash([minS * 0.008, minS * 0.01]);
    g.beginPath(); g.moveTo(0, yNow); g.lineTo(w, yNow);
    g.strokeStyle = rgba(copper, 0.55);
    g.lineWidth = Math.max(0.8, minS * 0.002);
    g.stroke();
    g.setLineDash([]);
    drawBead(g, xOf(meas.sPeak), yNow, Math.max(3.6, 0.012 * minS), gold, bg);
  }

  function grain(g, w, h, s) {
    const rng = U.makeRng(String(s.seed || 'hasimoto') + '/grain');
    const nGrain = (w * h * 0.006) | 0;
    const ink = U.inkFor(s.bg || '#0D0C0B');
    g.fillStyle = rgba(ink, U.isLight(s.bg) ? 0.035 : 0.045);
    for (let i = 0; i < nGrain; i++) {
      g.fillRect(rng() * w, rng() * h, 1, 1);
    }
  }

  function layerAt(t, nu, tau0) {
    const sCenter = 2 * tau0 * t;
    const span = 8.2 / nu;
    const crv = sample(t, nu, tau0, N_DRAW, span, sCenter);
    const pk = peakOf(crv);
    const iP = pk.iMax;
    return {
      crv, k: pk.k, kMax: pk.kMax, iMax: iP,
      target: { x: crv.x[iP], y: crv.y[iP] * 0.35, z: crv.z[iP] * 0.35 },
    };
  }

  function paintTo(g, w, h, s, meas) {
    const bg = s.bg || '#0D0C0B';
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (!meas) return;
    const nu = s.nu, tau0 = s.tau0;
    const t = meas.crv.t;
    const view = s.view;
    if (view === 'print') {
      paintPrint(g, w, h, s, meas);
    } else if (view === 'space') {
      paintSpace(g, w, h, s, meas);
    } else if (view === 'overlay') {
      const dt = s.lag;
      const A = layerAt(t, nu, tau0);
      const B = layerAt(t + dt, nu, tau0);
      B.target = A.target;
      paintFilaments(g, w, h, s, [A, B], 'filament');
    } else {
      const L = layerAt(t, nu, tau0);
      paintFilaments(g, w, h, s, [L], view === 'head' ? 'head' : 'filament');
    }
    grain(g, w, h, s);
  }

  function pathSVG(crv, xf, cam, color, lw) {
    const n = crv.n;
    const d = [];
    for (let i = 0; i < n; i++) {
      const p = toCam(crv.x[i], crv.y[i], crv.z[i], cam);
      const xy = xf(p.X, p.Y);
      d.push((i ? 'L' : 'M') + xy[0].toFixed(2) + ' ' + xy[1].toFixed(2));
    }
    return '<path d="' + d.join(' ') + '" fill="none" stroke="' + U.svgEsc(color) + '" stroke-width="' + lw.toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>';
  }

  Studio.register({
    id: 'hasimoto', name: 'Hasimoto', tab: 'Hasimoto',
    subtitle: 'a soliton on a vortex filament · 1972',
    order: 115,
    equation: 'γ_t = γ_s × γ_ss,   ψ = κ exp(i ∫ τ ds),   κ = 2ν sech(ν(s−2τ₀ t)),   c = 2τ₀',
    credit: 'H. Hasimoto, J. Fluid Mech. 51, 477 (1972), mapped the local-induction approximation for a thin vortex filament to the cubic nonlinear Schrödinger equation and found the sech soliton: a loop of helical motion that travels along a line vortex at speed equal to twice the torsion. The explicit traveling-wave curve sampled here is the solitary-wave member of S. Kida, J. Fluid Mech. 112, 397 (1981). This plate is a print of that curve. It is not a new law of vortex motion.',
    blurb: 'Local induction sends a thin vortex along its binormal, γ_t = γ_s × γ_ss. Hasimoto packed curvature and torsion into a complex field that obeys NLS. The sech soliton of NLS is a loop of helical motion riding a line vortex. Speed along the filament equals twice the torsion. The plate is Kida’s traveling-wave curve, gold on dark: the loop itself, head-on so the helix reads as a winding, a print of measured curvature and torsion, spacetime of the sech bump, or two snapshots overlay. The status line is peak curvature over 2ν, envelope speed over 2τ₀, and the LIA residual, all from finite differences of the polyline. If speed is not twice the torsion, the curve is wrong.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Soliton: 'ν is inverse width: peak curvature is 2ν. τ₀ is torsion and sets the envelope speed 2τ₀. Zero torsion is the planar smoke-ring limit, a loop that rotates in place. Run walks t along that speed.',
      Picture: 'Filament is the 3D curve, orthographic or a little perspective. Head-on looks down the line vortex. Print is measured κ(s) in gold and τ(s) in copper. Spacetime is the traveling sech as a ridge, with the measured peak track on top. Overlay is two times, gold then copper.',
    },
    palette: true,
    defaultPalette: { bg: '#0D0C0B', colors: ['#D4B05A', '#C06E3A', '#8A96A3', '#E8D5A3'] },
    paletteLabel: 'Metals',
    headline: 't', headlineLabel: 't',
    surprise, sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let meas = null, raf = 0, last = 0;

      function status() {
        if (!meas) return;
        const m = meas;
        const planar = m.tag === 'planar';
        const kFail = Math.abs(m.kRatio - 1) > 0.04;
        const cFail = planar ? false : Math.abs(m.cRatio - 1) > 0.04;
        const liaFail = m.liaMean > 0.02;
        const ok = !kFail && !cFail && !liaFail;
        host.setStatus(
          '<span>κ_max/(2ν) <b>' + f3(m.kRatio) + '</b> ± ' + sci(m.kSigma) + ' · 1' + (kFail ? ' · miss' : '') + '</span>' +
          (planar
            ? '<span>c · 0 · planar (τ₀ ≈ 0)</span>'
            : '<span>c/(2τ₀) <b>' + f3(m.cRatio) + '</b> ± ' + sci(m.cSigma) + ' · 1' + (cFail ? ' · miss' : '') + '</span>') +
          '<span>LIA <b>' + sci(m.liaMean) + '</b> · 0' + (liaFail ? ' · miss' : '') + '</span>' +
          '<span>' + m.tag + (ok ? '' : ' · drifting') + '</span>'
        );
      }
      function compute() {
        const s = host.getState();
        meas = measure(s.nu, s.tau0, s.t);
      }
      function paint() {
        const s = host.getState();
        paintTo(ctx, canvas.width, canvas.height, s, meas);
      }
      function tick(now) {
        raf = 0;
        if (!host.isActive()) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        s.t = ((s.t + dt * (s.speed || 0.85) * 0.28 + 6) % 12) - 6;
        compute(); paint(); status();
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
          if (key === 't') { compute(); paint(); status(); }
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
          if (!meas) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const gg = c.getContext('2d', { alpha: false });
          paintTo(gg, w, h, s, meas);
          return U.toBlob(c);
        },
        exportSVG(w, h) {
          if (!meas) return '';
          const s = host.getState();
          const metals = metalsOf(s);
          const nu = s.nu, tau0 = s.tau0, t = meas.crv.t;
          const view = s.view;
          const lw = Math.max(0.8, 0.013 * Math.min(w, h) * s.weight);
          const parts = [];
          if (view === 'print') {
            const crv = meas.crv, pk = meas.pk, n = crv.n;
            const s0 = crv.s[2], s1 = crv.s[n - 3];
            const kScale = Math.max(meas.kTh * 1.35, pk.kPeak * 1.2, 0.4);
            const padL = w * 0.12, padR = w * 0.08, padT = h * 0.14, padB = h * 0.16;
            const xOf = sv => padL + (sv - s0) / (s1 - s0) * (w - padL - padR);
            const yK = kv => padT + (1 - kv / kScale) * (h - padT - padB);
            const d = [];
            for (let i = 2; i < n - 2; i++) d.push((i === 2 ? 'M' : 'L') + xOf(crv.s[i]).toFixed(2) + ' ' + yK(pk.k[i]).toFixed(2));
            parts.push('<path d="' + d.join(' ') + '" fill="none" stroke="' + U.svgEsc(metals[0]) + '" stroke-width="' + lw.toFixed(2) + '" stroke-linecap="round"/>');
          } else if (view === 'space') {
            const spanS = 8 / nu, spanT = Math.max(2.2, 5.5 / Math.max(0.35, Math.abs(2 * tau0)));
            const sC = 2 * tau0 * t, t0 = t - spanT * 0.5, t1 = t + spanT * 0.5;
            const xOf = sv => (sv - (sC - spanS)) / (2 * spanS) * w;
            const yOf = tt => (t1 - tt) / (t1 - t0) * h;
            const d = [];
            for (let i = 0; i < 28; i++) {
              const tt = t0 + (i + 0.5) / 28 * (t1 - t0);
              const sm = sample(tt, nu, tau0, 401, spanS, 2 * tau0 * tt);
              const pk = peakOf(sm);
              d.push((i ? 'L' : 'M') + xOf(pk.sPeak).toFixed(2) + ' ' + yOf(tt).toFixed(2));
            }
            parts.push('<path d="' + d.join(' ') + '" fill="none" stroke="' + U.svgEsc(metals[0]) + '" stroke-width="' + lw.toFixed(2) + '" stroke-linecap="round"/>');
          } else {
            const A = layerAt(t, nu, tau0);
            const cam = camOf(s, view === 'head' ? 'head' : 'filament', A.target);
            const proj = projectCurve(A.crv, cam, A.k);
            const xf = xformOf(boundsOf(proj), w, h, s.zoom, s.panX, s.panY);
            parts.push(pathSVG(A.crv, xf, cam, metals[0], lw));
            if (view === 'overlay') {
              const B = layerAt(t + s.lag, nu, tau0);
              parts.push(pathSVG(B.crv, xf, cam, metals[1], lw * 0.92));
            }
          }
          return U.svgDoc(w, h, s.bg, parts.join(''));
        },
      };
    },
  });
})();
