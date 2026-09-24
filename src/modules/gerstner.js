
/* modules/gerstner.js */
/* GENChase: Gerstner trochoidal waves. Exact Euler. Circular particle orbits. */
(function () {
  'use strict';
  const U = Studio.util;
  const TAU = U.TAU;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const GRAV = 9.81;
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const two = s => s.trains === '2' || s.trains === 2;

  const SCHEMA = [
    RANGE('Wave', 'steep', 'Steepness σ', GEOM, 0.08, 0.99, 0.01, f2, { hint: 'σ = k A. At 1 the crests cusp and the surface is a cycloid.' }),
    RANGE('Wave', 'waves', 'Wavelengths', GEOM, 1.5, 6, 0.1, f2),
    { group: 'Wave', key: 'trains', label: 'Trains', type: 'seg', kind: GEOM, options: [['1', 'One'], ['2', 'Two']], hint: 'Two is a superposition of Gerstners. Graphics, not Euler.' },
    RANGE('Wave', 'mix', 'Second A', GEOM, 0.2, 0.95, 0.05, f2, { dimUnless: s => two(s), hint: 'Amplitude of the second train as a fraction of the first.' }),
    RANGE('Wave', 'kRatio', 'Second k', GEOM, 0.55, 1.45, 0.05, f2, { dimUnless: s => two(s) }),
    RANGE('Wave', 't', 'Time t', LIVE, 0, 8, 0.02, f2),
    { group: 'Wave', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    { group: 'Slice', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Slice', 'depth', 'Depth (λ)', GEOM, 0.28, 0.9, 0.02, f2, { hint: 'View depth in wavelengths. Orbits die in a fraction of a wavelength (e-folding  λ/2π).' }),
    RANGE('Slice', 'rows', 'Orbit rows', GEOM, 4, 16, 1, v => Math.round(v) + ''),
    RANGE('Slice', 'nAlong', 'Along-wave', GEOM, 6, 22, 1, v => Math.round(v) + ''),
    { group: 'Slice', key: 'columns', label: 'Material columns', type: 'toggle', kind: PAINT },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['slice', 'Slice'], ['trails', 'Trails'], ['woodcut', 'Woodcut']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.5, 1.8, 0.05, f2),
    RANGE('Picture', 'grain', 'Grain', PAINT, 0, 0.25, 0.01, f2),
  ];
  const DEFAULTS = {
    steep: 0.54, waves: 2.2, trains: '1', mix: 0.55, kRatio: 0.72, t: 0, running: false,
    aspect: '16:9', depth: 0.5, rows: 8, nAlong: 12, columns: true,
    view: 'slice', exposure: 1.08, grain: 0.04,
  };
  const PRESETS = {
    swell: pre('Gentle swell', { steep: 0.22, waves: 2.8, trains: '1', depth: 0.46, rows: 7, nAlong: 11, view: 'slice', columns: true, t: 0.2, aspect: '16:9' }, Pal.glacier),
    steep: pre('Near-cusp', { steep: 0.86, waves: 2.0, trains: '1', depth: 0.44, rows: 8, nAlong: 13, view: 'slice', columns: true, t: 0, aspect: '16:9' }, Pal.ember),
    cross: pre('Two trains', { steep: 0.46, waves: 2.6, trains: '2', mix: 0.58, kRatio: 0.74, depth: 0.48, rows: 7, nAlong: 11, view: 'trails', columns: false, t: 0.4, aspect: '16:9' }, Pal.nightshade),
    deep: pre('Deep view', { steep: 0.42, waves: 1.8, trains: '1', depth: 0.82, rows: 14, nAlong: 10, view: 'slice', columns: true, t: 0.15, aspect: '4:5' }, Pal.bioluminescent),
    trails: pre('Particle trails', { steep: 0.64, waves: 2.4, trains: '1', depth: 0.4, rows: 6, nAlong: 15, view: 'trails', columns: false, t: 0.6, aspect: '16:9' }, Pal.thermal),
    cycloid: pre('Cycloid limit', { steep: 0.97, waves: 1.9, trains: '1', depth: 0.38, rows: 7, nAlong: 14, view: 'slice', columns: true, t: 0, aspect: '5:4' }, Pal.kiln),
    woodcut: pre('Woodcut', { steep: 0.72, waves: 1.7, trains: '1', depth: 0.55, rows: 10, nAlong: 12, view: 'woodcut', columns: true, t: 0.1, grain: 0.07, aspect: '4:5' }, Pal.graphite),
  };

  function surprise(rng) {
    return {
      steep: rng.range(0.18, 0.93),
      waves: rng.range(2.0, 4.2),
      trains: rng() < 0.2 ? '2' : '1',
      mix: rng.range(0.35, 0.75),
      kRatio: rng.range(0.62, 1.2),
      t: rng.range(0, 2.4),
      depth: rng.range(0.34, 0.72),
      rows: rng.int(6, 13),
      nAlong: rng.int(8, 16),
      columns: rng() < 0.7,
      view: rng.pick(['slice', 'slice', 'trails', 'woodcut']),
      exposure: rng.range(0.9, 1.25),
      grain: rng.pick([0, 0.04, 0.05, 0.1]),
      aspect: rng.pick(['1:1', '4:5', '4:5', '5:4']),
    };
  }
  function sanitize(s) {
    s.steep = U.clamp(Number(s.steep) || 0.52, 0.04, 0.99);
    s.waves = U.clamp(Number(s.waves) || 2.6, 1.2, 7);
    if (s.trains !== '1' && s.trains !== '2') s.trains = '1';
    s.rows = Math.round(U.clamp(Number(s.rows) || 8, 3, 18));
    s.nAlong = Math.round(U.clamp(Number(s.nAlong) || 11, 4, 28));
    if (s.view !== 'slice' && s.view !== 'trails' && s.view !== 'woodcut') s.view = 'slice';
  }

  function specFrom(s) {
    const lambda = 1;
    const k = TAU / lambda;
    const sigma = U.clamp(s.steep, 0.04, 0.99);
    const A = sigma / k;
    const omega = Math.sqrt(GRAV * k);
    const trains = two(s) ? 2 : 1;
    const k2 = k * U.clamp(s.kRatio, 0.4, 1.8);
    const A2 = A * U.clamp(s.mix, 0.05, 1);
    const omega2 = Math.sqrt(GRAV * k2);
    const Aeff = trains === 2 ? A + A2 : A;
    return {
      lambda, k, A, sigma, omega, period: TAU / omega, g: GRAV,
      trains, k2, A2, omega2, period2: TAU / omega2, phi2: 0.85,
      t: Number(s.t) || 0, Aeff,
      waves: s.waves, depth: s.depth, rows: s.rows | 0, nAlong: s.nAlong | 0,
    };
  }

  // One Gerstner train: θ = k a − ω t (dir = +1), or k a + ω t (dir = −1).
  function addTrain(out, a, b, t, k, A, omega, dir, phi) {
    const r = A * Math.exp(k * b);
    const th = k * a - dir * omega * t + phi;
    const c = Math.cos(th), sn = Math.sin(th);
    const kr = k * r;
    const tht = -dir * omega;
    out.x += r * sn;
    out.z -= r * c;
    out.r += r;
    out.Xa += r * c * k;
    out.Za += r * sn * k;
    out.Xb += kr * sn;
    out.Zb -= kr * c;
    out.Xt += r * c * tht;
    out.Zt += r * sn * tht;
    out.Xtt += r * (-sn) * tht * tht;
    out.Ztt += r * c * tht * tht;
    return r;
  }
  function stateAt(a, b, t, spec) {
    const out = { x: a, z: b, r: 0, Xa: 1, Za: 0, Xb: 0, Zb: 1, Xt: 0, Zt: 0, Xtt: 0, Ztt: 0 };
    addTrain(out, a, b, t, spec.k, spec.A, spec.omega, 1, 0);
    if (spec.trains === 2) addTrain(out, a, b, t, spec.k2, spec.A2, spec.omega2, -1, spec.phi2);
    return out;
  }
  function pos(a, b, t, spec) {
    return stateAt(a, b, t, spec);
  }
  function rTheory(b, spec) {
    return spec.A * Math.exp(spec.k * b);
  }

  // Orbit circularity, radius law, and Gerstner's constant-pressure free surface.
  // One train: orbit RMS/r and r / A e^{kb} must sit at numerical zero against 1.
  // Two trains is graphics, not Euler: the orbits stop being circles.
  function measure(spec) {
    const Nth = 48;
    const bs = [0, -0.25 / spec.k, -0.6 / spec.k, -1.1 / spec.k];
    const as = [0, 0.27 * spec.lambda, 0.61 * spec.lambda];
    let oSq = 0, nO = 0, radSq = 0, nR = 0, pSq = 0, nP = 0;
    let rSurf = 0, nSurf = 0, ratioSum = 0;
    for (let bi = 0; bi < bs.length; bi++) {
      const b = bs[bi];
      const rTh = rTheory(b, spec);
      if (!(rTh > 1e-14)) continue;
      for (let ai = 0; ai < as.length; ai++) {
        const a = as[ai];
        let rSum = 0;
        for (let i = 0; i < Nth; i++) {
          const t = (i / Nth) * spec.period;
          const p = stateAt(a, b, t, spec);
          const rr = Math.hypot(p.x - a, p.z - b);
          const rel = (rr - rTh) / rTh;
          oSq += rel * rel; nO++;
          rSum += rr;
          if (b === 0) {
            const dp = (p.Xtt * p.Xa + (p.Ztt + spec.g) * p.Za) / spec.g;
            pSq += dp * dp; nP++;
            rSurf += rr; nSurf++;
          }
        }
        const rAvg = rSum / Nth;
        const ratio = rAvg / rTh - 1;
        radSq += ratio * ratio; nR++;
        ratioSum += rAvg / rTh;
      }
    }
    return {
      orbit: nO ? Math.sqrt(oSq / nO) : 0,
      radLaw: nR ? Math.sqrt(radSq / nR) : 0,
      rMean: nR ? ratioSum / nR : 0,
      pressure: nP ? Math.sqrt(pSq / nP) : 0,
      rSurfOverA: nSurf && spec.A > 0 ? (rSurf / nSurf) / spec.A : 0,
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
    let zTop = Math.max(2.2 * spec.Aeff, 0.14 * spec.lambda);
    let zBot = -spec.depth * spec.lambda;
    let worldH = zTop - zBot;
    const canvasAspect = innerH / Math.max(1e-9, innerW);
    const natural = worldH / worldW;
    if (natural < canvasAspect) {
      const need = canvasAspect * worldW;
      const extra = need - worldH;
      const maxDeep = Math.max(0.68, spec.depth + 0.12) * spec.lambda;
      const deepRoom = Math.max(0, maxDeep + zBot);
      const extraDeep = Math.min(extra * 0.22, deepRoom);
      zBot -= extraDeep;
      zTop += extra - extraDeep;
      worldH = zTop - zBot;
    }
    const scale = Math.min(innerW / worldW, innerH / worldH);
    const usedW = worldW * scale, usedH = worldH * scale;
    const left = pad + (innerW - usedW) / 2;
    const top = pad + (innerH - usedH) / 2;
    return {
      pad, x0, x1, zTop, zBot,
      left, right: left + usedW, top, bottom: top + usedH,
      sx: scale, sz: scale,
    };
  }
  function scr(x, z, w) {
    return [w.left + (x - w.x0) * w.sx, w.top + (w.zTop - z) * w.sz];
  }

  function sampleB(b, spec, w, nPts) {
    nPts = nPts || Math.max(180, Math.round(spec.waves * 140));
    const a0 = w.x0 - 0.35 * spec.lambda, a1 = w.x1 + 0.35 * spec.lambda;
    const pts = [];
    for (let i = 0; i <= nPts; i++) {
      const a = a0 + (a1 - a0) * (i / nPts);
      const p = pos(a, b, spec.t, spec);
      pts.push(scr(p.x, p.z, w));
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
    const rng = U.makeRng(String(seed == null ? 'grain' : seed) + '/gerstner/' + w + 'x' + h);
    const img = g.getImageData(0, 0, w, h), d = img.data, a = amt * 22;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * a;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }

  function labels(spec, wld) {
    const rows = [];
    const bMin = -0.9 * spec.depth * spec.lambda;
    const nR = Math.max(2, spec.rows);
    for (let j = 0; j < nR; j++) rows.push(nR === 1 ? 0 : bMin * (j / (nR - 1)));
    const cols = [];
    const nA = Math.max(4, Math.round(spec.nAlong * spec.waves));
    const a0 = -0.45 * spec.lambda / spec.nAlong;
    const a1 = spec.waves * spec.lambda - a0;
    for (let i = 0; i <= nA; i++) cols.push(a0 + (a1 - a0) * (i / nA));
    return { rows, cols, bMin, waterBot: wld.zBot * 0.94 };
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
    const S = Math.min(W, H);
    const lab = labels(spec, w);

    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.save();
    g.beginPath();
    g.rect(w.left, w.top, w.right - w.left, w.bottom - w.top);
    g.clip();
    g.lineCap = 'round';
    g.lineJoin = 'round';

    const surf = sampleB(0, spec, w, Math.max(220, Math.round(spec.waves * 180)));

    // Night/paper air above the still-water line.
    if (!light) {
      const air = g.createLinearGradient(0, w.top, 0, scr(0, 0, w)[1]);
      air.addColorStop(0, bg);
      air.addColorStop(1, rgba(U.mixHex(bg, crest, 0.12), 0.55));
      g.fillStyle = air;
      g.fillRect(w.left, w.top, w.right - w.left, Math.max(0, scr(0, 0, w)[1] - w.top));
    }

    // Water body.
    if (!wood) {
      g.beginPath();
      g.moveTo(surf[0][0], surf[0][1]);
      for (let i = 1; i < surf.length; i++) g.lineTo(surf[i][0], surf[i][1]);
      g.lineTo(w.right + 4, w.bottom + 4);
      g.lineTo(w.left - 4, w.bottom + 4);
      g.closePath();
      let grd;
      if (light) {
        grd = g.createLinearGradient(0, w.top, 0, w.bottom);
        grd.addColorStop(0, rgba(deepC, 0.07 * exp));
        grd.addColorStop(1, rgba(deepC, 0.2 * exp));
      } else {
        const z0y = scr(0, 0, w)[1];
        grd = g.createLinearGradient(0, z0y, 0, w.bottom);
        grd.addColorStop(0, rgba(U.mixHex(deepC, crest, 0.18), U.clamp(0.42 * exp, 0.22, 0.7)));
        grd.addColorStop(0.35, rgba(deepC, U.clamp(0.55 * exp, 0.28, 0.8)));
        grd.addColorStop(1, rgba(U.mixHex(deepC, bg, 0.5), U.clamp(0.9 * exp, 0.5, 0.98)));
      }
      g.fillStyle = grd;
      g.fill();
    } else if (light) {
      // Paper wash under the waterline, faint.
      g.beginPath();
      g.moveTo(surf[0][0], surf[0][1]);
      for (let i = 1; i < surf.length; i++) g.lineTo(surf[i][0], surf[i][1]);
      g.lineTo(w.right + 4, w.bottom + 4);
      g.lineTo(w.left - 4, w.bottom + 4);
      g.closePath();
      g.fillStyle = rgba(deepC, 0.06);
      g.fill();
    }

    // Still-water z = 0.
    const z0 = scr(w.x0, 0, w), z1 = scr(w.x1, 0, w);
    g.save();
    g.setLineDash([S * 0.008, S * 0.007]);
    g.strokeStyle = rgba(ink, light ? 0.32 : 0.18);
    g.lineWidth = Math.max(1, S * 0.0012);
    g.beginPath(); g.moveTo(z0[0], z0[1]); g.lineTo(z1[0], z1[1]); g.stroke();
    g.restore();

    // Lagrangian columns (constant a).
    if (s.columns) {
      const nColDraw = Math.max(6, Math.round(lab.cols.length / 2));
      const step = Math.max(1, Math.round(lab.cols.length / nColDraw));
      g.strokeStyle = rgba(ink, light ? 0.28 : 0.12);
      g.lineWidth = Math.max(0.8, S * 0.00115);
      const nB = 28;
      for (let i = 0; i < lab.cols.length; i += step) {
        const a = lab.cols[i];
        g.beginPath();
        for (let j = 0; j <= nB; j++) {
          const b = lab.bMin * (j / nB);
          const p = pos(a, b, spec.t, spec);
          const q = scr(p.x, p.z, w);
          if (j === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]);
        }
        g.stroke();
      }
    }

    // Nested material surfaces: inverted trochoids of decaying amplitude.
    const nestBot = lab.waterBot;
    const nNest = wood ? Math.max(22, spec.rows + 10) : Math.max(spec.rows + 4, 12);
    for (let j = nNest - 1; j >= 1; j--) {
      const b = nestBot * (j / (nNest - 1));
      const tDepth = U.clamp(j / (nNest - 1), 0, 1);
      const col = ramp(light
        ? U.clamp(0.16 + 0.48 * tDepth, 0.12, 0.68)
        : U.clamp((1 - tDepth) * 0.62 + 0.18, 0, 1));
      const alpha = wood
        ? (light ? 0.78 : 0.48) * (0.35 + 0.65 * (1 - tDepth))
        : (light ? 0.58 : 0.44) * (0.35 + 0.65 * (1 - tDepth)) * exp;
      g.strokeStyle = 'rgba(' + Math.round(col[0]) + ',' + Math.round(col[1]) + ',' + Math.round(col[2]) + ',' + U.clamp(alpha, 0.08, 0.88) + ')';
      g.lineWidth = Math.max(0.7, S * (wood ? 0.0024 : 0.0017) * (0.65 + 0.55 * (1 - tDepth)));
      strokePts(g, sampleB(b, spec, w, 160));
      g.stroke();
    }

    // Particle orbits. Circles for one Gerstner; sampled loops for two trains.
    const orbitW = Math.max(1.0, S * (wood ? 0.0028 : 0.0024));
    function depthTone(b) {
      const tDepth = spec.depth * spec.lambda > 1e-9 ? U.clamp(-b / (spec.depth * spec.lambda), 0, 1) : 0;
      const t = light
        ? U.clamp(0.18 + 0.5 * tDepth, 0.14, 0.7)
        : U.clamp(0.28 + 0.68 * (1 - tDepth), 0, 1);
      const col = ramp(t);
      const a = (wood ? (light ? 0.92 : 0.78) : (light ? 0.78 : 0.62)) * (0.45 + 0.55 * (1 - tDepth)) * exp;
      return { col, a: U.clamp(a, light ? 0.28 : 0.16, 0.96), tDepth };
    }
    function drawCircle(cx, cz, r, tone) {
      const c = scr(cx, cz, w);
      const rx = r * w.sx, ry = r * w.sz;
      if (rx < 0.55 && ry < 0.55) return false;
      g.beginPath();
      g.ellipse(c[0], c[1], Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, TAU);
      g.stroke();
      return true;
    }
    function drawLoop(a, b, tone) {
      const n = spec.trains === 2 ? 96 : 64;
      const T = spec.trains === 2 ? spec.period * 2.2 : spec.period;
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const p = pos(a, b, spec.t + (i / n) * T, spec);
        const q = scr(p.x, p.z, w);
        if (i === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]);
      }
      g.stroke();
    }
    function drawTrail(a, b, tone) {
      const n = 36;
      const behind = 0.72 * spec.period;
      let prev = null;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const p = pos(a, b, spec.t - (1 - u) * behind, spec);
        const q = scr(p.x, p.z, w);
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

    if (!trails) {
      for (let j = 0; j < lab.rows.length; j++) {
        const b = lab.rows[j];
        const tone = depthTone(b);
        g.strokeStyle = 'rgba(' + Math.round(tone.col[0]) + ',' + Math.round(tone.col[1]) + ',' + Math.round(tone.col[2]) + ',' + tone.a + ')';
        g.lineWidth = orbitW * (0.75 + 0.45 * (1 - tone.tDepth));
        for (let i = 0; i < lab.cols.length; i++) {
          const a = lab.cols[i];
          if (spec.trains === 2) drawLoop(a, b, tone);
          else {
            const r = rTheory(b, spec);
            drawCircle(a, b, r, tone);
          }
        }
      }
    } else {
      for (let j = 0; j < lab.rows.length; j++) {
        const b = lab.rows[j];
        const tone = depthTone(b);
        g.strokeStyle = cssRgb(tone.col);
        for (let i = 0; i < lab.cols.length; i++) drawTrail(lab.cols[i], b, tone);
      }
    }

    // Free-surface trochoid: the picture's ridge.
    const surfCol = (wood || light) ? ink : crest;
    g.strokeStyle = rgba(light ? ink : U.mixHex(deepC, surfCol, 0.35), 0.55);
    g.lineWidth = Math.max(2.2, S * (wood ? 0.011 : 0.01));
    strokePts(g, surf);
    g.stroke();
    g.strokeStyle = rgba(surfCol, U.clamp(0.7 * exp + 0.28, 0.7, 1));
    g.lineWidth = Math.max(1.5, S * (wood ? 0.0065 : 0.0052));
    strokePts(g, surf);
    g.stroke();
    if (!wood && !light) {
      g.strokeStyle = rgba(crest, 0.92);
      g.lineWidth = Math.max(0.8, S * 0.002);
      strokePts(g, surf);
      g.stroke();
    }

    // Particles at the current phase.
    for (let j = 0; j < lab.rows.length; j++) {
      const b = lab.rows[j];
      const tDepth = spec.depth * spec.lambda > 1e-9 ? U.clamp(-b / (spec.depth * spec.lambda), 0, 1) : 0;
      const col = (b === 0)
        ? U.hexToRgb(light ? ink : crest)
        : ramp(light ? U.clamp(0.2 + 0.45 * tDepth, 0.15, 0.65) : U.clamp(0.45 + 0.55 * (1 - tDepth), 0, 1));
      const pr = Math.max(1.25, S * (b === 0 ? 0.007 : 0.0048) * (1.05 - 0.4 * tDepth) * Math.sqrt(exp));
      g.fillStyle = 'rgba(' + Math.round(col[0]) + ',' + Math.round(col[1]) + ',' + Math.round(col[2]) + ',' + (wood ? 1 : 0.95) + ')';
      for (let i = 0; i < lab.cols.length; i++) {
        const p = pos(lab.cols[i], b, spec.t, spec);
        const q = scr(p.x, p.z, w);
        g.beginPath();
        g.arc(q[0], q[1], pr, 0, TAU);
        g.fill();
      }
    }

    g.restore();

    // Plate margin line, like a copper-plate mark.
    g.strokeStyle = rgba(ink, light ? 0.22 : 0.14);
    g.lineWidth = Math.max(1, S * 0.0014);
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
    const deepC = pal[0];
    const lab = labels(spec, w);
    const f = n => n.toFixed(2);
    const S = Math.min(W, H);
    const wood = s.view === 'woodcut';
    const trails = s.view === 'trails';
    const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
    const clipId = 'gclip' + Math.abs((W * 13 + H) | 0);
    let body = '';
    body += '<defs><clipPath id="' + clipId + '"><rect x="' + f(w.left) + '" y="' + f(w.top) + '" width="' + f(w.right - w.left) + '" height="' + f(w.bottom - w.top) + '"/></clipPath></defs>';
    body += '<g clip-path="url(#' + clipId + ')">';
    const surf = sampleB(0, spec, w, Math.max(220, Math.round(spec.waves * 180)));
    let d = 'M ' + f(surf[0][0]) + ' ' + f(surf[0][1]);
    for (let i = 1; i < surf.length; i++) d += ' L ' + f(surf[i][0]) + ' ' + f(surf[i][1]);
    const waterFill = light ? rgba(deepC, 0.14 * exp) : rgba(U.mixHex(deepC, bg, 0.45), U.clamp(0.52 * exp, 0.32, 0.7));
    body += '<path d="' + d + ' L ' + f(w.right + 4) + ' ' + f(w.bottom + 4) + ' L ' + f(w.left - 4) + ' ' + f(w.bottom + 4) + ' Z" fill="' + waterFill + '"/>';
    const nestBot = lab.waterBot;
    const nNest = wood ? Math.max(22, spec.rows + 10) : Math.max(spec.rows + 4, 12);
    const ramp = U.makeRamp(pal, bg);
    for (let j = nNest - 1; j >= 1; j--) {
      const b = nestBot * (j / (nNest - 1));
      const tDepth = U.clamp(j / (nNest - 1), 0, 1);
      const col = ramp(light
        ? U.clamp(0.16 + 0.48 * tDepth, 0.12, 0.68)
        : U.clamp((1 - tDepth) * 0.62 + 0.18, 0, 1));
      const alpha = wood
        ? (light ? 0.78 : 0.48) * (0.35 + 0.65 * (1 - tDepth))
        : (light ? 0.58 : 0.44) * (0.35 + 0.65 * (1 - tDepth)) * exp;
      const pts = sampleB(b, spec, w, 160);
      let nd = 'M ' + f(pts[0][0]) + ' ' + f(pts[0][1]);
      for (let i = 1; i < pts.length; i++) nd += ' L ' + f(pts[i][0]) + ' ' + f(pts[i][1]);
      const hex = '#' + [col[0], col[1], col[2]].map(v => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
      const lw = Math.max(0.7, S * (wood ? 0.0024 : 0.0017) * (0.65 + 0.55 * (1 - tDepth)));
      body += '<path d="' + nd + '" fill="none" stroke="' + hex + '" stroke-width="' + lw.toFixed(2) + '" opacity="' + U.clamp(alpha, 0.08, 0.88).toFixed(3) + '"/>';
    }
    if (!trails) {
      for (let j = 0; j < lab.rows.length; j++) {
        const b = lab.rows[j];
        const tDepth = spec.depth * spec.lambda > 1e-9 ? U.clamp(-b / (spec.depth * spec.lambda), 0, 1) : 0;
        const t = light
          ? U.clamp(0.18 + 0.5 * tDepth, 0.14, 0.7)
          : U.clamp(0.28 + 0.68 * (1 - tDepth), 0, 1);
        const col = ramp(t);
        const hex = '#' + [col[0], col[1], col[2]].map(v => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
        const a = (wood ? (light ? 0.92 : 0.78) : (light ? 0.78 : 0.62)) * (0.45 + 0.55 * (1 - tDepth)) * exp;
        const op = U.clamp(a, light ? 0.28 : 0.16, 0.96);
        const lw = Math.max(1.0, S * (wood ? 0.0028 : 0.0024) * (0.75 + 0.45 * (1 - tDepth)));
        for (let i = 0; i < lab.cols.length; i++) {
          const aa = lab.cols[i];
          if (spec.trains === 2) {
            let pd = '';
            const n = 96, T = spec.period * 2.2;
            for (let k = 0; k <= n; k++) {
              const p = pos(aa, b, spec.t + (k / n) * T, spec);
              const q = scr(p.x, p.z, w);
              pd += (k ? ' L ' : 'M ') + f(q[0]) + ' ' + f(q[1]);
            }
            body += '<path d="' + pd + '" fill="none" stroke="' + hex + '" stroke-width="' + lw.toFixed(2) + '" opacity="' + op.toFixed(3) + '"/>';
          } else {
            const r = rTheory(b, spec);
            const c = scr(aa, b, w);
            body += '<ellipse cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" rx="' + f(Math.max(0.5, r * w.sx)) + '" ry="' + f(Math.max(0.5, r * w.sz)) + '" fill="none" stroke="' + hex + '" stroke-width="' + lw.toFixed(2) + '" opacity="' + op.toFixed(3) + '"/>';
          }
        }
      }
    } else {
      const behind = 0.72 * spec.period;
      const nTr = 36;
      for (let j = 0; j < lab.rows.length; j++) {
        const b = lab.rows[j];
        const tDepth = spec.depth * spec.lambda > 1e-9 ? U.clamp(-b / (spec.depth * spec.lambda), 0, 1) : 0;
        const t = light
          ? U.clamp(0.18 + 0.5 * tDepth, 0.14, 0.7)
          : U.clamp(0.28 + 0.68 * (1 - tDepth), 0, 1);
        const col = ramp(t);
        const hex = '#' + [col[0], col[1], col[2]].map(v => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
        const a = (light ? 0.78 : 0.62) * (0.45 + 0.55 * (1 - tDepth)) * exp;
        const op = U.clamp(a, light ? 0.28 : 0.16, 0.96);
        const lw = Math.max(1.0, S * 0.0024);
        for (let i = 0; i < lab.cols.length; i++) {
          let pd = '';
          for (let k = 0; k < nTr; k++) {
            const u = k / (nTr - 1);
            const p = pos(lab.cols[i], b, spec.t - (1 - u) * behind, spec);
            const q = scr(p.x, p.z, w);
            pd += (k ? ' L ' : 'M ') + f(q[0]) + ' ' + f(q[1]);
          }
          body += '<path d="' + pd + '" fill="none" stroke="' + hex + '" stroke-width="' + lw.toFixed(2) + '" opacity="' + op.toFixed(3) + '" stroke-linecap="round"/>';
        }
      }
    }
    body += '<path d="' + d + '" fill="none" stroke="' + (light ? ink : crest) + '" stroke-width="' + (Math.max(2, S * 0.006)).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    for (let j = 0; j < lab.rows.length; j++) {
      const b = lab.rows[j];
      for (let i = 0; i < lab.cols.length; i++) {
        const p = pos(lab.cols[i], b, spec.t, spec);
        const q = scr(p.x, p.z, w);
        const rr = b === 0 ? Math.max(2.4, S * 0.004) : Math.max(1.7, S * 0.003);
        body += '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="' + f(rr) + '" fill="' + (b === 0 ? crest : ink) + '"/>';
      }
    }
    body += '</g>';
    body += '<rect x="' + f(w.left) + '" y="' + f(w.top) + '" width="' + f(w.right - w.left) + '" height="' + f(w.bottom - w.top) + '" fill="none" stroke="' + rgba(ink, light ? 0.22 : 0.14) + '" stroke-width="' + Math.max(1, S * 0.0014).toFixed(2) + '"/>';
    return U.svgDoc(W, H, bg, body);
  }

  Studio.register({
    id: 'gerstner', name: 'Gerstner', tab: 'Gerstner',
    subtitle: 'trochoidal waves, the exact Euler deep-water solution · 1802',
    order: 110,
    equation: 'X = a + A e^{k b} sin(k a − ω t),   Z = b − A e^{k b} cos(k a − ω t),   ω² = g k,   σ = k A < 1',
    credit: 'Gerstner, Theorie der Wellen, Abh. Bohm. Ges. Wiss. (1802), found the unique exact periodic deep-water gravity wave of finite amplitude: every particle traces a circle, the free surface is an inverted trochoid, and the pressure is constant along it. Rankine, On the exact form of waves near the surface of deep water, Phil. Trans. Roy. Soc. 153, 127 (1863), rediscovered the same motion. Superposing two Gerstners (the Two trains control) is graphics practice, Tessendorf, Simulating Ocean Water, SIGGRAPH course notes (2001), and is not an Euler solution. This plate is a seeded print of the exact Lagrangian map. It is not a new equation.',
    blurb: 'In deep water a periodic gravity wave of finite height has an exact Euler solution, and only one: Gerstner (1802), rediscovered by Rankine. Each particle labeled (a, b) goes in a circle of radius A e^{k b}, so the orbits shrink exponentially with depth, and the free surface is an inverted trochoid, pointed at the crests, round in the troughs. At steepness σ = k A → 1 the crests cusp and the curve is a cycloid. The status line reports the RMS radial deviation from a circle, against 0, and the surface radius against A. If the map were a stacked sine, both would fail. Two trains superposes a second Gerstner; that is a rendering trick, not a solution, and the orbits stop being circles.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Wave: 'σ = k A is the steepness. At σ → 1 the crests cusp and the surface is a cycloid. Two trains superposes two Gerstners; that is graphics, not Euler, and the orbits are no longer circles.',
      Slice: 'Depth is in wavelengths. Orbits die in a fraction of a wavelength because the radius is A e^{k b} with k = 2π/λ. Rows are Lagrangian material surfaces. The particle paths are the picture.',
      Picture: 'Slice is the textbook plate: circular orbits and the free-surface trochoid. Trails mark a fraction of a period. Woodcut is the same geometry as ink on paper.',
    },
    palette: true, defaultPalette: 'ember', paletteLabel: 'Water (deep → crest)',
    headline: 'steep', headlineLabel: 'σ',
    surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let metric = { orbit: 0, radLaw: 0, rMean: 1, pressure: 0, rSurfOverA: 1 }, raf = 0, last = 0, trainsN = 1;

      function paint() {
        const s = host.getState();
        ctx.fillStyle = s.bg || '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        paintTo(ctx, canvas.width, canvas.height, s);
      }
      function status() {
        const s = host.getState();
        const m = metric;
        const ok = trainsN === 1 && m.orbit < 1e-8 && Math.abs(m.rSurfOverA - 1) < 1e-6;
        const twoTr = trainsN === 2;
        const tag = twoTr ? 'two trains, graphics' : (ok ? 'Gerstner' : 'map failed');
        // One train: the map is Gerstner's own formula, so circular orbits of radius A e^{kb} are what it
        // draws, and both orbit numbers are regression tests of the map. Two trains is not an Euler
        // solution, and the orbit numbers are then deterministic measurements of how far the superposition
        // misses. The along-surface pressure gradient vanishes because ω² = g k is what the map codes; the
        // cross terms of two such trains cancel pairwise at b = 0 as well, so it is a regression test in
        // both cases.
        const orbitBasis = twoTr ? 'deterministic' : 'construction';
        host.setStatus(
          U.stats.compare({ label: 'orbit RMS/r', measured: m.orbit, expected: 0, reference: 'circle', basis: orbitBasis }) +
          U.stats.compare({ label: 'r / A e^{kb}', measured: m.rMean, expected: 1, basis: orbitBasis, digits: 7 }) +
          U.stats.compare({ label: 'surface ∂p/∂a (RMS)', measured: m.pressure, expected: 0, reference: 'constant pressure', basis: 'construction' }) +
          '<span>σ <b>' + f2(s.steep) + '</b> · ' + tag + '</span>'
        );
      }
      function compute() {
        const s = host.getState();
        const spec = specFrom(s);
        trainsN = spec.trains;
        metric = measure(spec);
      }
      function tick(now) {
        raf = 0;
        if (!host.isActive()) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        const spec = specFrom(s);
        s.t = (s.t + dt * spec.period * 0.18) % Math.max(spec.period * 4, 1);
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
          const s = host.getState();
          if (s.running && !host.reducedMotion() && !raf) { last = 0; raf = requestAnimationFrame(tick); }
          else paint();
        },
        async exportPNG(pw, ph) {
          const s = host.getState();
          const c = document.createElement('canvas'); c.width = pw; c.height = ph;
          const g = c.getContext('2d', { alpha: false });
          paintTo(g, pw, ph, s);
          return U.toBlob(c);
        },
        exportSVG(pw, ph) {
          const s = host.getState();
          if (s.view && s.view !== 'woodcut') return null;
          return svgOf(s, pw, ph);
        },
      };
    },
  });
})();
