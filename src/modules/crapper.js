
/* modules/crapper.js */
/* GENChase: Crapper exact capillary waves. Steepness 4|A|/(π(1−A²)). Bubble limit. */
(function () {
  'use strict';
  const U = Studio.util;
  const TAU = U.TAU;
  const PI = Math.PI;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // Period-1 Crapper. X is Hur & Vanden-Broeck arXiv:2003.00950 (13).
  // Y is the same potential mapping with y up, water below, so crests flatten
  // and troughs sharpen. Then s = Y_crest - Y_trough = 4|A|/(π(1-A²)) identically.
  // A* ≈ 0.45467 at the touching bubble s* ≈ 0.7298. The diffeomorphism range
  // |A| ≤ 3-2√2 ≈ 0.1716 (Constantin-Martín) is a different limit.
  const A_UNI = 3 - 2 * Math.sqrt(2);
  const S_STAR = 0.7298;

  function sOfA(A) {
    const a = Math.abs(A);
    if (a >= 1) return Infinity;
    return 4 * a / (PI * (1 - a * a));
  }
  function AofS(s) {
    if (!(s > 0)) return 0;
    const ps = PI * s;
    return (2 / ps) * (Math.sqrt(1 + 0.25 * ps * ps) - 1);
  }
  const A_STAR = AofS(S_STAR);

  const SCHEMA = [
    RANGE('Wave', 'amp', 'Amplitude A', GEOM, 0.03, 0.458, 0.002, f3, {
      hint: 'Crapper parameter. s = 4|A|/(π(1-A²)). Diffeomorphism only for |A| ≤ 3-2√2 ≈ 0.172. The trough pinches a bubble at A* ≈ 0.455, s* ≈ 0.730. Those two limits are not the same.',
    }),
    RANGE('Wave', 'waves', 'Wavelengths', GEOM, 1.4, 5.5, 0.1, f2),
    RANGE('Wave', 't', 'Time t', LIVE, 0, 4, 0.02, f2),
    { group: 'Wave', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    { group: 'Wave', key: 'reading', label: 'Reading', type: 'seg', kind: GEOM, options: [['capillary', 'Capillary'], ['euler', 'Dual Euler']], hint: 'Same profile. Capillary is irrotational Crapper (g=0, σ>0). Dual Euler is the Hur & Vanden-Broeck constant-vorticity flow (g=0, σ=0). The flows underneath differ.' },
    { group: 'Slice', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Slice', 'depth', 'Depth (λ)', GEOM, 0.28, 0.95, 0.02, f2, { hint: 'View depth in wavelengths. Irrotational streamlines decay as e^{2π y} with y ≤ 0.' }),
    RANGE('Slice', 'rows', 'Stream rows', GEOM, 4, 16, 1, v => Math.round(v) + ''),
    RANGE('Slice', 'nAlong', 'Along-wave', GEOM, 6, 22, 1, v => Math.round(v) + ''),
    { group: 'Slice', key: 'columns', label: 'Potential columns', type: 'toggle', kind: PAINT },
    { group: 'Slice', key: 'paths', label: 'Particle paths', type: 'toggle', kind: PAINT, hint: 'Closed lab-frame orbits of a few labelled particles. Optional.' },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['slice', 'Slice'], ['trails', 'Trails'], ['woodcut', 'Woodcut']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 1.8, 0.05, f2),
    RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.25, 0.01, f2),
  ];
  const DEFAULTS = {
    amp: 0.20, waves: 2.5, t: 0.5, running: false, reading: 'capillary',
    aspect: '16:9', depth: 0.52, rows: 8, nAlong: 12, columns: true, paths: false,
    view: 'slice', exposure: 1.08, grain: 0.04,
  };
  const PRESETS = {
    ripple: pre('Ripple', { amp: 0.07, waves: 3.6, reading: 'capillary', depth: 0.42, rows: 7, nAlong: 14, view: 'slice', columns: true, paths: false, t: 0.1, aspect: '16:9' }, Pal.glacier),
    moderate: pre('Moderate', { amp: 0.20, waves: 2.5, reading: 'capillary', depth: 0.52, rows: 8, nAlong: 12, view: 'slice', columns: true, paths: false, t: 0, aspect: '16:9' }, Pal.ember),
    steep: pre('Steep', { amp: 0.36, waves: 2.05, reading: 'capillary', depth: 0.58, rows: 8, nAlong: 13, view: 'slice', columns: true, paths: false, t: 0, aspect: '16:9' }, Pal.thermal),
    bubble: pre('Bubble', { amp: A_STAR, waves: 1.85, reading: 'capillary', depth: 0.72, rows: 7, nAlong: 11, view: 'slice', columns: false, paths: false, t: 0.5, aspect: '16:9' }, Pal.nightshade),
    dual: pre('Dual vorticity', { amp: 0.22, waves: 2.4, reading: 'euler', depth: 0.5, rows: 9, nAlong: 12, view: 'slice', columns: false, paths: false, t: 0.05, aspect: '16:9' }, Pal.bioluminescent),
    deep: pre('Deep', { amp: 0.16, waves: 1.8, reading: 'capillary', depth: 0.88, rows: 14, nAlong: 10, view: 'slice', columns: true, paths: true, t: 0.12, aspect: '4:5' }, Pal.harbor),
    woodcut: pre('Woodcut', { amp: 0.28, waves: 1.7, reading: 'capillary', depth: 0.56, rows: 11, nAlong: 12, view: 'woodcut', columns: true, paths: false, t: 0.08, grain: 0.07, aspect: '4:5' }, Pal.graphite),
  };

  function surprise(rng) {
    const bubble = rng() < 0.12;
    return {
      amp: bubble ? A_STAR : rng.range(0.06, 0.38),
      waves: rng.range(1.8, 4.0),
      t: rng.range(0, 1.2),
      reading: rng() < 0.18 ? 'euler' : 'capillary',
      depth: rng.range(0.36, 0.78),
      rows: rng.int(6, 13),
      nAlong: rng.int(8, 16),
      columns: rng() < 0.65,
      paths: rng() < 0.25,
      view: rng.pick(['slice', 'slice', 'trails', 'woodcut']),
      exposure: rng.range(0.9, 1.25),
      grain: rng.pick([0, 0.04, 0.05, 0.1]),
      aspect: rng.pick(['16:9', '16:9', '4:5', '5:4', '1:1']),
    };
  }
  function sanitize(s) {
    s.amp = U.clamp(Number(s.amp) || 0.2, 0.02, 0.458);
    s.waves = U.clamp(Number(s.waves) || 2.5, 1.2, 6);
    s.rows = Math.round(U.clamp(Number(s.rows) || 8, 3, 18));
    s.nAlong = Math.round(U.clamp(Number(s.nAlong) || 11, 4, 28));
    if (s.reading !== 'euler') s.reading = 'capillary';
    if (s.view !== 'slice' && s.view !== 'trails' && s.view !== 'woodcut') s.view = 'slice';
  }

  function specFrom(s) {
    const A = U.clamp(Number(s.amp) || 0.2, 0.02, 0.458);
    const sTh = sOfA(A);
    return {
      A, sTh, lambda: 1,
      t: Number(s.t) || 0,
      waves: s.waves, depth: s.depth, rows: s.rows | 0, nAlong: s.nAlong | 0,
      reading: s.reading === 'euler' ? 'euler' : 'capillary',
      uni: Math.abs(A) <= A_UNI + 1e-12,
    };
  }

  // Interior Crapper map. ψ ≤ 0 is the fluid, B = A e^{2πψ} decays with depth.
  // Phase t travels to the right: the trig argument is 2π(φ − t).
  function pos(phi, psi, t, A) {
    const B = A * Math.exp(TAU * psi);
    const th = TAU * (phi - t);
    const c = Math.cos(th), sn = Math.sin(th);
    const D = 1 + B * B - 2 * B * c;
    const inv = D > 1e-18 ? 1 / D : 0;
    const twoPi = 2 / PI;
    return {
      x: phi - twoPi * B * sn * inv,
      y: psi - twoPi * B * (c - B) * inv,
    };
  }
  function posSurf(phi, t, A) { return pos(phi, 0, t, A); }

  // Analytic z_φ on the surface, for speed q = 1/|z_φ| and curvature.
  function surfDerivs(phi, t, A) {
    const th = TAU * (phi - t);
    const c = Math.cos(th), sn = Math.sin(th);
    const D = 1 + A * A - 2 * A * c;
    const D2 = D * D;
    const twoPi = 2 / PI;
    const x = phi - twoPi * A * sn / D;
    const y = -twoPi * A * (c - A) / D;
    // dX/dφ = 1 - 4 A (c(1+A²) - 2A) / D²
    // dY_classic/dφ = -4 A (1-A²) sn / D², then Y = -Y_classic so Y' flips.
    const Xp = 1 - 4 * A * (c * (1 + A * A) - 2 * A) / D2;
    const Yp = 4 * A * (1 - A * A) * sn / D2;
    return { x, y, Xp, Yp, D };
  }
  function surfD2(phi, t, A, h) {
    h = h || 1e-5;
    const m = surfDerivs(phi, t, A);
    const L = surfDerivs(phi - h, t, A);
    const R = surfDerivs(phi + h, t, A);
    return { x: m.x, y: m.y, Xp: m.Xp, Yp: m.Yp, Xpp: (R.Xp - L.Xp) / (2 * h), Ypp: (R.Yp - L.Yp) / (2 * h) };
  }

  function measure(spec) {
    const A = spec.A, t = spec.t;
    const N = 720;
    let ymin = 1e9, ymax = -1e9;
    let x0 = posSurf(0, t, A).x, x1 = posSurf(1, t, A).x;
    for (let i = 0; i <= N; i++) {
      const y = posSurf(i / N, t, A).y;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
    const period = x1 - x0;
    const sMeas = (ymax - ymin) / (period || 1);
    const sTh = spec.sTh;
    const ratio = sTh > 0 ? sMeas / sTh : 0;

    const tr = surfD2(t, t, A); // φ − t = 0: trough
    const cr = surfD2(t + 0.5, t, A);
    function kappa(d) {
      const sp2 = d.Xp * d.Xp + d.Yp * d.Yp;
      const sp = Math.sqrt(sp2);
      return sp > 1e-12 ? (d.Xp * d.Ypp - d.Yp * d.Xpp) / (sp2 * sp) : 0;
    }
    const kT = kappa(tr), kC = kappa(cr);
    const kRatio = Math.abs(kC) > 1e-12 ? Math.abs(kT) / Math.abs(kC) : 0;
    return {
      sMeas, sTh, ratio, period,
      ymin, ymax,
      kTrough: kT, kCrest: kC, kRatio,
      bubble: Math.abs(sMeas - S_STAR),
    };
  }

  function rgba(hex, a) {
    const c = U.hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function cssRgb(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }

  function worldOf(W, H, spec) {
    const pad = 0.042 * Math.min(W, H);
    const innerW = W - 2 * pad, innerH = H - 2 * pad;
    const x0 = 0, x1 = spec.waves * spec.lambda;
    const worldW = x1 - x0;
    const yCrest = (2 / PI) * spec.A / (1 + spec.A);
    const yTrough = -(2 / PI) * spec.A / (1 - spec.A);
    let yTop = Math.max(1.35 * yCrest, 0.10 * spec.lambda);
    let yBot = Math.min(-spec.depth * spec.lambda, yTrough - 0.08 * spec.lambda);
    let worldH = yTop - yBot;
    const canvasAspect = innerH / Math.max(1e-9, innerW);
    const natural = worldH / worldW;
    if (natural < canvasAspect) {
      const need = canvasAspect * worldW;
      const extra = need - worldH;
      const extraDeep = extra * 0.28;
      yBot -= extraDeep;
      yTop += extra - extraDeep;
      worldH = yTop - yBot;
    }
    const scale = Math.min(innerW / worldW, innerH / worldH);
    const usedW = worldW * scale, usedH = worldH * scale;
    const left = pad + (innerW - usedW) / 2;
    const top = pad + (innerH - usedH) / 2;
    return {
      pad, x0, x1, yTop, yBot,
      left, right: left + usedW, top, bottom: top + usedH,
      sx: scale, sy: scale,
    };
  }
  function scr(x, y, w) {
    return [w.left + (x - w.x0) * w.sx, w.top + (w.yTop - y) * w.sy];
  }

  function samplePsi(psi, spec, w, nPts) {
    nPts = nPts || Math.max(220, Math.round(spec.waves * 180));
    const a0 = w.x0 - 0.45 * spec.lambda, a1 = w.x1 + 0.45 * spec.lambda;
    const pts = [];
    for (let i = 0; i <= nPts; i++) {
      const phi = a0 + (a1 - a0) * (i / nPts);
      const p = pos(phi, psi, spec.t, spec.A);
      pts.push(scr(p.x, p.y, w));
    }
    return pts;
  }
  function strokePts(g, pts, close) {
    if (!pts.length) return;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (close) g.closePath();
  }

  function grainPut(g, w, h, amt, seed) {
    if (!(amt > 0)) return;
    const rng = U.makeRng(String(seed == null ? 'grain' : seed) + '/crapper/' + w + 'x' + h);
    const img = g.getImageData(0, 0, w, h), d = img.data, a = amt * 22;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * a;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }

  function labels(spec, wld) {
    const rows = [];
    const bMin = -0.92 * spec.depth * spec.lambda;
    const nR = Math.max(2, spec.rows);
    for (let j = 0; j < nR; j++) rows.push(nR === 1 ? 0 : bMin * (j / (nR - 1)));
    const cols = [];
    const nA = Math.max(4, Math.round(spec.nAlong * spec.waves));
    const a0 = -0.45 * spec.lambda / spec.nAlong;
    const a1 = spec.waves * spec.lambda - a0;
    for (let i = 0; i <= nA; i++) cols.push(a0 + (a1 - a0) * (i / nA));
    return { rows, cols, bMin, waterBot: wld.yBot * 0.94 };
  }

  function paintTo(g, W, H, s) {
    const spec = specFrom(s);
    const w = worldOf(W, H, spec);
    const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#1a1a1a', '#eee'];
    const bg = s.bg || '#111';
    const light = U.isLight(bg);
    const ramp = U.makeRamp(pal, bg);
    const ink = U.inkFor(bg);
    const crest = pal[pal.length - 1];
    const deepC = pal[0];
    const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
    const view = s.view;
    const wood = view === 'woodcut';
    const trails = view === 'trails';
    const euler = spec.reading === 'euler';
    const Smin = Math.min(W, H);
    const lab = labels(spec, w);

    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.save();
    g.beginPath();
    g.rect(w.left, w.top, w.right - w.left, w.bottom - w.top);
    g.clip();
    g.lineCap = 'round';
    g.lineJoin = 'round';

    const nSurf = Math.max(280, Math.round(spec.waves * 220));
    const surf = samplePsi(0, spec, w, nSurf);

    if (!light) {
      const air = g.createLinearGradient(0, w.top, 0, scr(0, 0, w)[1]);
      air.addColorStop(0, bg);
      air.addColorStop(1, rgba(U.mixHex(bg, crest, 0.16), 0.55));
      g.fillStyle = air;
      g.fillRect(w.left, w.top, w.right - w.left, Math.max(0, scr(0, 0, w)[1] - w.top));
    }

    // Water body. evenodd so a pinched trough bubble reads as air.
    function fillWater() {
      g.beginPath();
      g.moveTo(surf[0][0], surf[0][1]);
      for (let i = 1; i < surf.length; i++) g.lineTo(surf[i][0], surf[i][1]);
      g.lineTo(w.right + 6, w.bottom + 6);
      g.lineTo(w.left - 6, w.bottom + 6);
      g.closePath();
      g.fill('evenodd');
    }
    if (!wood) {
      let grd;
      if (light) {
        grd = g.createLinearGradient(0, w.top, 0, w.bottom);
        grd.addColorStop(0, rgba(deepC, 0.08 * exp * (euler ? 1.15 : 1)));
        grd.addColorStop(1, rgba(deepC, 0.22 * exp));
      } else {
        const z0y = scr(0, 0, w)[1];
        grd = g.createLinearGradient(0, z0y, 0, w.bottom);
        const topMix = euler ? 0.08 : 0.22;
        grd.addColorStop(0, rgba(U.mixHex(deepC, crest, topMix), U.clamp(0.44 * exp, 0.22, 0.72)));
        grd.addColorStop(0.4, rgba(deepC, U.clamp(0.58 * exp, 0.3, 0.82)));
        grd.addColorStop(1, rgba(U.mixHex(deepC, bg, 0.5), U.clamp(0.92 * exp, 0.52, 0.98)));
      }
      g.fillStyle = grd;
      fillWater();
    } else if (light) {
      g.fillStyle = rgba(deepC, 0.06);
      fillWater();
    }

    // Dual Euler: constant-vorticity wash. Same profile, shear layers instead of
    // irrotational Crapper streamlines. Not a new flow: Hur & Vanden-Broeck 2020.
    if (euler && !wood) {
      g.save();
      g.beginPath();
      g.moveTo(surf[0][0], surf[0][1]);
      for (let i = 1; i < surf.length; i++) g.lineTo(surf[i][0], surf[i][1]);
      g.lineTo(w.right + 6, w.bottom + 6);
      g.lineTo(w.left - 6, w.bottom + 6);
      g.closePath();
      g.clip('evenodd');
      const nShear = Math.max(10, spec.rows + 4);
      g.lineWidth = Math.max(0.7, Smin * 0.0016);
      for (let j = 1; j < nShear; j++) {
        const u = j / nShear;
        const nP = Math.max(160, Math.round(spec.waves * 100));
        g.beginPath();
        for (let i = 0; i <= nP; i++) {
          const phi = w.x0 + (w.x1 - w.x0) * (i / nP);
          const p0 = posSurf(phi, spec.t, spec.A);
          const q2 = scr(p0.x, w.yBot + (p0.y - w.yBot) * (1 - u), w);
          if (i === 0) g.moveTo(q2[0], q2[1]); else g.lineTo(q2[0], q2[1]);
        }
        const col = ramp(light ? U.clamp(0.2 + 0.45 * u, 0.12, 0.7) : U.clamp(0.55 * (1 - u) + 0.12, 0, 1));
        g.strokeStyle = 'rgba(' + Math.round(col[0]) + ',' + Math.round(col[1]) + ',' + Math.round(col[2]) + ',' +
          (light ? 0.35 : 0.28) * (0.4 + 0.6 * (1 - u)) * exp + ')';
        g.stroke();
      }
      g.restore();
    }

    // Still water y = 0.
    const z0 = scr(w.x0, 0, w), z1 = scr(w.x1, 0, w);
    g.save();
    g.setLineDash([Smin * 0.008, Smin * 0.007]);
    g.strokeStyle = rgba(ink, light ? 0.32 : 0.18);
    g.lineWidth = Math.max(1, Smin * 0.0012);
    g.beginPath(); g.moveTo(z0[0], z0[1]); g.lineTo(z1[0], z1[1]); g.stroke();
    g.restore();

    // Constant-φ potential columns (capillary conformal grid).
    if (s.columns && !euler) {
      const nColDraw = Math.max(6, Math.round(lab.cols.length / 2));
      const step = Math.max(1, Math.round(lab.cols.length / nColDraw));
      g.strokeStyle = rgba(ink, light ? 0.26 : 0.11);
      g.lineWidth = Math.max(0.8, Smin * 0.0011);
      const nB = 32;
      for (let i = 0; i < lab.cols.length; i += step) {
        const phi = lab.cols[i];
        g.beginPath();
        for (let j = 0; j <= nB; j++) {
          const psi = lab.bMin * (j / nB);
          const p = pos(phi, psi, spec.t, spec.A);
          const q = scr(p.x, p.y, w);
          if (j === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]);
        }
        g.stroke();
      }
    }

    // Nested streamlines: exact Crapper (capillary) or skipped for dual Euler
    // (already drawn as shear). Exponential decay of amplitude with depth.
    if (!euler) {
      const nestBot = lab.waterBot;
      const nNest = wood ? Math.max(22, spec.rows + 10) : Math.max(spec.rows + 4, 12);
      for (let j = nNest - 1; j >= 1; j--) {
        const psi = nestBot * (j / (nNest - 1));
        const tDepth = U.clamp(j / (nNest - 1), 0, 1);
        const col = ramp(light
          ? U.clamp(0.16 + 0.48 * tDepth, 0.12, 0.68)
          : U.clamp((1 - tDepth) * 0.62 + 0.18, 0, 1));
        const alpha = wood
          ? (light ? 0.78 : 0.48) * (0.35 + 0.65 * (1 - tDepth))
          : (light ? 0.58 : 0.44) * (0.35 + 0.65 * (1 - tDepth)) * exp;
        g.strokeStyle = 'rgba(' + Math.round(col[0]) + ',' + Math.round(col[1]) + ',' + Math.round(col[2]) + ',' + U.clamp(alpha, 0.08, 0.88) + ')';
        g.lineWidth = Math.max(0.7, Smin * (wood ? 0.0024 : 0.0017) * (0.65 + 0.55 * (1 - tDepth)));
        strokePts(g, samplePsi(psi, spec, w, 170));
        g.stroke();
      }
    }

    function depthTone(psi) {
      const tDepth = spec.depth * spec.lambda > 1e-9 ? U.clamp(-psi / (spec.depth * spec.lambda), 0, 1) : 0;
      const tt = light
        ? U.clamp(0.18 + 0.5 * tDepth, 0.14, 0.7)
        : U.clamp(0.28 + 0.68 * (1 - tDepth), 0, 1);
      const col = ramp(tt);
      const a = (wood ? (light ? 0.92 : 0.78) : (light ? 0.78 : 0.62)) * (0.45 + 0.55 * (1 - tDepth)) * exp;
      return { col, a: U.clamp(a, light ? 0.28 : 0.16, 0.96), tDepth };
    }

    // Optional lab-frame orbits: a particle labelled (φ0, ψ0) in the wave frame
    // rides a streamline. In the lab frame we add the wave speed, so the path
    // is the image of φ = φ0 + τ over a period, shifted back by c τ. For a
    // travelling wave that is the closed orbit around the Lagrangian centre.
    const orbitW = Math.max(1.0, Smin * (wood ? 0.0026 : 0.0022));
    function drawOrbit(phi, psi, tone) {
      const n = 72;
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const tau = i / n;
        const p = pos(phi + tau, psi, spec.t + tau, spec.A);
        const q = scr(p.x - tau, p.y, w);
        if (i === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]);
      }
      g.stroke();
    }
    function drawTrail(phi, psi, tone) {
      const n = 36;
      const behind = 0.65;
      let prev = null;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const tau = -(1 - u) * behind;
        const p = pos(phi + tau, psi, spec.t + tau, spec.A);
        const q = scr(p.x - tau, p.y, w);
        if (prev) {
          g.globalAlpha = (0.08 + 0.92 * u) * tone.a;
          g.lineWidth = orbitW * (0.25 + 0.9 * u);
          g.beginPath();
          g.moveTo(prev[0], prev[1]);
          g.lineTo(q[0], q[1]);
          g.stroke();
        }
        prev = q;
      }
      g.globalAlpha = 1;
    }

    if (s.paths && !trails) {
      for (let j = 0; j < lab.rows.length; j++) {
        const psi = lab.rows[j];
        const tone = depthTone(psi);
        g.strokeStyle = 'rgba(' + Math.round(tone.col[0]) + ',' + Math.round(tone.col[1]) + ',' + Math.round(tone.col[2]) + ',' + tone.a + ')';
        g.lineWidth = orbitW * (0.7 + 0.4 * (1 - tone.tDepth));
        for (let i = 0; i < lab.cols.length; i++) drawOrbit(lab.cols[i], psi, tone);
      }
    } else if (trails) {
      for (let j = 0; j < lab.rows.length; j++) {
        const psi = lab.rows[j];
        const tone = depthTone(psi);
        g.strokeStyle = cssRgb(tone.col);
        for (let i = 0; i < lab.cols.length; i++) drawTrail(lab.cols[i], psi, tone);
      }
    }

    // Free surface: the picture's ridge. Gold on dark, ink on paper.
    const surfCol = (wood || light) ? ink : crest;
    g.strokeStyle = rgba(light ? ink : U.mixHex(deepC, surfCol, 0.35), 0.55);
    g.lineWidth = Math.max(2.2, Smin * (wood ? 0.011 : 0.01));
    strokePts(g, surf);
    g.stroke();
    g.strokeStyle = rgba(surfCol, U.clamp(0.72 * exp + 0.28, 0.7, 1));
    g.lineWidth = Math.max(1.5, Smin * (wood ? 0.0065 : 0.0052));
    strokePts(g, surf);
    g.stroke();
    if (!wood && !light) {
      g.strokeStyle = rgba(crest, 0.92);
      g.lineWidth = Math.max(0.8, Smin * 0.002);
      strokePts(g, surf);
      g.stroke();
    }

    // Markers on the conformal grid (or on the surface only, for dual Euler).
    const markRows = euler ? [0] : lab.rows;
    for (let j = 0; j < markRows.length; j++) {
      const psi = markRows[j];
      const tDepth = spec.depth * spec.lambda > 1e-9 ? U.clamp(-psi / (spec.depth * spec.lambda), 0, 1) : 0;
      const col = (psi === 0)
        ? U.hexToRgb(light ? ink : crest)
        : ramp(light ? U.clamp(0.2 + 0.45 * tDepth, 0.15, 0.65) : U.clamp(0.45 + 0.55 * (1 - tDepth), 0, 1));
      const pr = Math.max(1.2, Smin * (psi === 0 ? 0.0068 : 0.0046) * (1.05 - 0.4 * tDepth) * Math.sqrt(exp));
      g.fillStyle = 'rgba(' + Math.round(col[0]) + ',' + Math.round(col[1]) + ',' + Math.round(col[2]) + ',' + (wood ? 1 : 0.95) + ')';
      for (let i = 0; i < lab.cols.length; i++) {
        const p = pos(lab.cols[i], psi, spec.t, spec.A);
        const q = scr(p.x, p.y, w);
        g.beginPath();
        g.arc(q[0], q[1], pr, 0, TAU);
        g.fill();
      }
    }

    g.restore();

    g.strokeStyle = rgba(ink, light ? 0.22 : 0.14);
    g.lineWidth = Math.max(1, Smin * 0.0014);
    g.strokeRect(w.left, w.top, w.right - w.left, w.bottom - w.top);

    grainPut(g, W, H, s.grain || 0, s.seed);
  }

  function svgOf(s, W, H) {
    const spec = specFrom(s);
    const w = worldOf(W, H, spec);
    const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
    const bg = s.bg || '#111';
    const light = U.isLight(bg);
    const ink = U.inkFor(bg);
    const crest = pal[pal.length - 1];
    const lab = labels(spec, w);
    const f = n => n.toFixed(2);
    let body = '';
    const surf = samplePsi(0, spec, w, 280);
    let d = 'M ' + f(surf[0][0]) + ' ' + f(surf[0][1]);
    for (let i = 1; i < surf.length; i++) d += ' L ' + f(surf[i][0]) + ' ' + f(surf[i][1]);
    body += '<path d="' + d + ' L ' + f(w.right) + ' ' + f(w.bottom) + ' L ' + f(w.left) + ' ' + f(w.bottom) + ' Z" fill="' + (light ? rgba(pal[0], 0.08) : rgba(pal[0], 0.42)) + '"/>';
    if (spec.reading !== 'euler') {
      for (let j = 1; j < lab.rows.length; j++) {
        const psi = lab.rows[j];
        const pts = samplePsi(psi, spec, w, 160);
        let pd = 'M ' + f(pts[0][0]) + ' ' + f(pts[0][1]);
        for (let i = 1; i < pts.length; i++) pd += ' L ' + f(pts[i][0]) + ' ' + f(pts[i][1]);
        const stroke = U.mixHex(pal[0], crest, U.clamp(1 + psi / (spec.depth * spec.lambda + 1e-9), 0, 1));
        body += '<path d="' + pd + '" fill="none" stroke="' + stroke + '" stroke-width="0.8" opacity="0.5"/>';
      }
    }
    body += '<path d="' + d + '" fill="none" stroke="' + (light ? ink : crest) + '" stroke-width="' + (Math.max(2, Math.min(W, H) * 0.006)).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    for (let j = 0; j < lab.rows.length; j++) {
      const psi = lab.rows[j];
      for (let i = 0; i < lab.cols.length; i++) {
        const p = pos(lab.cols[i], psi, spec.t, spec.A);
        const q = scr(p.x, p.y, w);
        const rr = psi === 0 ? 2.4 : 1.7;
        body += '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="' + rr + '" fill="' + (psi === 0 ? crest : ink) + '"/>';
      }
    }
    return U.svgDoc(W, H, bg, body);
  }

  Studio.register({
    id: 'crapper', name: 'Crapper', tab: 'Crapper',
    subtitle: 'exact finite-amplitude pure-capillary waves · 1957',
    order: 114,
    equation: 'X = φ − (2/π) A sin(2πφ) / (1+A²−2A cos 2πφ),   Y = −(2/π) A (cos 2πφ − A) / (1+A²−2A cos 2πφ),   s = 4|A|/(π(1−A²))',
    credit: 'Crapper, An exact solution for progressive capillary waves of arbitrary amplitude, J. Fluid Mech. 2, 532 (1957), found the unique closed-form finite-amplitude pure-capillary wave on deep water: crests flatten, troughs sharpen, and at s* ≈ 0.730 the trough pinches a bubble of air. Hur and Vanden-Broeck, Eur. J. Mech. B/Fluids 83, 190 (2020), arXiv:2003.00950, showed that the same profile is a periodic traveling wave of a constant-vorticity Euler flow with g=0 and σ=0. The flows underneath differ. Constantin and Martín, On Crapper\'s wave, J. Nonlinear Math. Phys. (2011), proved the interior map is a diffeomorphism only for |A| ≤ 3−2√2 ≈ 0.172, a smaller range than the bubble. This plate is a seeded print of the exact map. It is not a new equation.',
    blurb: 'A pure capillary wave on deep water has an exact Euler solution, and only one: Crapper (1957). The free surface is an inverted cousin of Gerstner\'s trochoid, rounded at the crests and needle-sharp in the troughs. Steepness s = crest-to-trough over a period is 4|A|/(π(1−A²)) identically. At A* ≈ 0.455, s* ≈ 0.730, the trough pinches a bubble of air. The interior map is a diffeomorphism only out to |A| ≤ 3−2√2 ≈ 0.172 (Constantin-Martín); do not treat those two limits as the same. The Dual Euler reading keeps the profile and replaces irrotational Crapper streamlines by a constant-vorticity shear (Hur and Vanden-Broeck 2020, g=0 and σ=0). The status line reports measured s against 4|A|/(π(1−A²)). If the map were a stacked sine, that ratio would fail.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Wave: 'A is Crapper\'s amplitude. s = 4|A|/(π(1−A²)). The trough pinches a bubble at A* ≈ 0.455, s* ≈ 0.730. Univalent interior flow only for |A| ≤ 3−2√2 ≈ 0.172. Dual Euler is the same profile as a constant-vorticity wave with no gravity and no surface tension.',
      Slice: 'Depth is in wavelengths. Capillary streamlines are the exact conformal map, amplitude A e^{2πψ} with ψ ≤ 0. Dual Euler draws a linear shear instead. Columns are constant-potential lines.',
      Picture: 'Slice is the textbook plate: rounded gold crests, needle troughs, dark water. Trails mark a fraction of a period. Woodcut is the same geometry as ink on paper.',
    },
    palette: true, defaultPalette: 'ember', paletteLabel: 'Water (deep → crest)',
    headline: 'amp', headlineLabel: 'A',
    surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let metric = { sMeas: 0, sTh: 0, ratio: 1, period: 1, ymin: 0, ymax: 0, kRatio: 0, bubble: 1 }, raf = 0, last = 0;

      function paint() {
        const st = host.getState();
        ctx.fillStyle = st.bg || '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        paintTo(ctx, canvas.width, canvas.height, st);
      }
      function status() {
        const st = host.getState();
        const m = metric;
        const A = U.clamp(Number(st.amp) || 0.2, 0.02, 0.458);
        const euler = st.reading === 'euler';
        const nearBubble = Math.abs(A - A_STAR) < 0.012 || Math.abs(m.sMeas - S_STAR) < 0.02;
        const ok = Math.abs(m.ratio - 1) < 1e-4;
        const tag = !ok ? 'map failed' : (euler ? 'dual Euler' : (nearBubble ? 'bubble' : (Math.abs(A) <= A_UNI ? 'univalent' : 'Crapper')));
        // The height of the implemented map is 4|A|/(π(1−A²)) algebraically, so the measured steepness
        // meets it to round-off whatever the physics; and A* is defined by inverting that formula at
        // s* = 0.7298, so the bubble reference is the same identity. Regression tests, not predictions.
        host.setStatus(
          U.stats.compare({ label: 's_meas / (4|A|/(π(1−A²)))', measured: m.ratio, expected: 1, reference: 'identity', basis: 'construction', digits: 6 }) +
          (nearBubble
            ? U.stats.compare({ label: 's', measured: m.sMeas, expected: S_STAR, reference: 'bubble', basis: 'construction' })
            : U.stats.compare({ label: 's', measured: m.sMeas, expected: m.sTh, reference: '4|A|/(π(1−A²))', basis: 'construction' })) +
          (euler
            ? '<span>dual Euler <b>same profile</b> · g=0 σ=0</span>'
            : '<span>κ_trough/κ_crest <b>' + (m.kRatio > 99 ? m.kRatio.toExponential(1) : m.kRatio.toFixed(1)) + '</b> · Crapper</span>') +
          '<span>A <b>' + f3(A) + '</b> · ' + tag + '</span>'
        );
      }
      function compute() {
        const st = host.getState();
        metric = measure(specFrom(st));
      }
      function tick(now) {
        raf = 0;
        if (!host.isActive()) return;
        const st = host.getState();
        if (!st.running || host.reducedMotion()) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        st.t = (st.t + dt * 0.18) % 4;
        compute(); paint(); status();
        raf = requestAnimationFrame(tick);
      }
      return {
        aspect(st) { return ASPECTS[st.aspect] || 1; },
        fieldCells() { return null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        live(key) {
          if (key === 't' || key === 'running') {
            if (host.getState().running) {
              if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
            } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
            if (key === 't') { compute(); paint(); status(); }
          }
        },
        resize() { paint(); },
        pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } },
        resume() {
          const st = host.getState();
          if (st.running && !host.reducedMotion() && !raf) { last = 0; raf = requestAnimationFrame(tick); }
          else paint();
        },
        async exportPNG(pw, ph) {
          const st = host.getState();
          const c = document.createElement('canvas'); c.width = pw; c.height = ph;
          const g = c.getContext('2d', { alpha: false });
          paintTo(g, pw, ph, st);
          return U.toBlob(c);
        },
        exportSVG(pw, ph) {
          const st = host.getState();
          if (st.view && st.view !== 'woodcut') return null;
          return svgOf(st, pw, ph);
        },
      };
    },
  });
})();
