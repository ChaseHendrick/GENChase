
/* modules/photon.js */
/* GENChase: Schwarzschild photon sphere. Null geodesics. Critical b = 3√3 M. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const f4 = v => v.toFixed(4);
  const TAU = U.TAU;
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const M = 1;
  const RS = 2 * M;
  const BC_TH = 3 * Math.sqrt(3) * M;
  const RPH_TH = 3 * M;

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 128, 256, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Field', 'zoom', 'View', GEOM, 0.4, 2.2, 0.05, f2, { hint: 'Frame half-width is about 14 M / zoom. The shadow sits at b = 3√3 M.' }),
    { group: 'Rays', key: 'view', label: 'View', type: 'seg', kind: GEOM, options: [['disk', 'Disk'], ['equatorial', 'Equator'], ['orbit', 'r, φ'], ['impact', 'Impact'], ['polar', 'Polar']] },
    { group: 'Rays', key: 'scene', label: 'Scene', type: 'seg', kind: GEOM, options: [['stars', 'Stars'], ['belt', 'Belt'], ['einstein', 'Einstein'], ['spray', 'Spray']] },
    RANGE('Rays', 'rays', 'Rays', GEOM, 48, 200, 8, v => v + '', { hint: 'Geodesics drawn in the equatorial, polar, r-φ and impact views.', dimUnless: s => s.view !== 'disk' }),
    RANGE('Rays', 'incline', 'Incline', GEOM, 0, 72, 1, v => v + '°', { hint: 'Camera tilt from face-on. The shadow stays circular. The belt becomes an ellipse.', dimUnless: s => s.view === 'disk' || s.view === 'polar' }),
    RANGE('Rays', 'beltR', 'Belt r/M', GEOM, 4, 16, 0.5, f2, { hint: 'Thin equatorial luminous ring, in units of M. 6 M is the ISCO of a Schwarzschild hole.' }),
    { group: 'Picture', key: 'tone', label: 'Tone', type: 'seg', kind: PAINT, options: [['log', 'Log'], ['lin', 'Lin'], ['shade', 'Relief']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.4, 0.05, f2),
  ];
  const DEFAULTS = {
    grid: 224, aspect: '1:1', zoom: 1.15,
    view: 'disk', scene: 'stars', rays: 120, incline: 14, beltR: 6,
    tone: 'log', exposure: 1.08,
  };
  const PRESETS = {
    ring: pre('Photon ring', { view: 'disk', scene: 'stars', zoom: 1.2, incline: 10, beltR: 6, tone: 'log' }, Pal.kiln),
    spray: pre('Grazing spray', { view: 'equatorial', scene: 'spray', zoom: 0.95, rays: 160, tone: 'log' }, Pal.graphite),
    einstein: pre('Einstein ring', { view: 'disk', scene: 'einstein', zoom: 0.72, incline: 0, beltR: 8, tone: 'log' }, Pal.harbor),
    weak: pre('Weak field', { view: 'equatorial', scene: 'spray', zoom: 0.58, rays: 144, tone: 'lin', exposure: 1.2 }, Pal.glacier),
    capture: pre('Capture', { view: 'equatorial', scene: 'spray', zoom: 1.45, rays: 140, tone: 'log' }, Pal.nightshade),
    polar: pre('Polar', { view: 'polar', scene: 'belt', zoom: 1.05, incline: 56, beltR: 7, rays: 96, tone: 'log' }, Pal.ember),
    impact: pre('Impact portrait', { view: 'impact', scene: 'spray', zoom: 1, rays: 160, tone: 'log' }, Pal.xray),
  };

  function surprise(rng) {
    return {
      view: rng.pick(['disk', 'disk', 'equatorial', 'polar', 'orbit', 'impact']),
      scene: rng.pick(['stars', 'stars', 'belt', 'einstein', 'spray']),
      zoom: rng.range(0.55, 1.6),
      incline: rng.pick([0, 8, 18, 48, 62]),
      beltR: rng.range(5, 12),
      rays: rng.int(80, 176),
      tone: rng.pick(['log', 'log', 'lin']),
    };
  }
  function sanitize(s) {
    s.grid = Math.max(128, Math.min(256, Math.round(s.grid / 16) * 16));
    s.rays = Math.max(48, Math.min(200, Math.round(s.rays / 8) * 8));
    s.incline = U.clamp(s.incline, 0, 72);
    s.beltR = U.clamp(s.beltR, 4, 16);
  }

  function force(u) { return 3 * M * u * u - u; }

  function integrate(b, opt) {
    const r0 = (opt && opt.r0) || 280;
    const h = (opt && opt.h) || 0.012;
    const maxPhi = (opt && opt.maxPhi) || 36;
    const wantPts = opt && opt.pts;
    const onStep = opt && opt.onStep;
    const srcX = (opt && opt.srcX) || -48;
    const pts = wantPts ? [] : null;
    const absB = Math.abs(b);
    if (!(absB > 1e-8)) return { captured: true, phi: 0, rMin: 0, defl: 0, ySrc: 0, gotSrc: false, pts: pts || [] };
    let u = 1 / r0;
    const W0 = 2 * M * u * u * u - u * u + 1 / (absB * absB);
    let v = W0 > 0 ? Math.sqrt(W0) : 0;
    let phi = 0, rMin = r0, turned = false, ySrc = absB, gotSrc = false;
    let xPrev = r0, yPrev = 0;
    const uH = 1 / (RS + 0.015);
    const nMax = (maxPhi / h) | 0;
    for (let i = 0; i < nMax; i++) {
      const k1u = v, k1v = force(u);
      const k2u = v + 0.5 * h * k1v, k2v = force(u + 0.5 * h * k1u);
      const k3u = v + 0.5 * h * k2v, k3v = force(u + 0.5 * h * k2u);
      const k4u = v + h * k3v, k4v = force(u + h * k3u);
      u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
      v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
      phi += h;
      if (!(u > 1e-14) || !isFinite(u) || !isFinite(v)) break;
      const r = 1 / u;
      if (r < rMin) rMin = r;
      const cp = Math.cos(phi), sp = Math.sin(phi);
      const x = r * cp, y = r * sp;
      if (onStep) onStep(r, phi, x, y);
      if (pts) {
        const jump = Math.hypot(x - xPrev, y - yPrev);
        if (jump > 0.35) {
          const n = Math.min(8, (jump / 0.25) | 0);
          for (let k = 1; k <= n; k++) {
            const t = k / (n + 1);
            pts.push(xPrev + (x - xPrev) * t, yPrev + (y - yPrev) * t);
          }
        }
        pts.push(x, y);
      }
      if (!gotSrc && xPrev > srcX && x <= srcX) {
        const t = (srcX - xPrev) / ((x - xPrev) || 1e-9);
        ySrc = yPrev + (y - yPrev) * t;
        gotSrc = true;
      }
      xPrev = x; yPrev = y;
      if (u > uH || r < RS + 0.02) return { captured: true, phi, rMin, defl: NaN, ySrc: 0, gotSrc: false, pts: pts || [] };
      if (!turned && v < 0) turned = true;
      if (turned && r > r0 * 0.92 && v < 0) {
        const ain = Math.asin(Math.min(1, absB / r0));
        const aout = Math.asin(Math.min(1, absB * u));
        return { captured: false, phi, rMin, defl: phi - Math.PI + ain + aout, ySrc, gotSrc, pts: pts || [] };
      }
    }
    const ain = Math.asin(Math.min(1, absB / r0));
    const aout = Math.asin(Math.min(1, absB * Math.max(u, 1e-9)));
    return { captured: !turned, phi, rMin, defl: phi - Math.PI + ain + aout, ySrc, gotSrc, pts: pts || [] };
  }

  function searchBc() {
    let lo = 1.5 * M, hi = 9 * M;
    for (let i = 0; i < 36; i++) {
      const mid = 0.5 * (lo + hi);
      if (integrate(mid, { r0: 220, h: 0.012, maxPhi: 28 }).captured) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  function searchRph() {
    function drift(r) {
      const h = 0.01, n = 64;
      let u = 1 / r, v = 0;
      for (let i = 0; i < n; i++) {
        const k1u = v, k1v = force(u);
        const k2u = v + 0.5 * h * k1v, k2v = force(u + 0.5 * h * k1u);
        const k3u = v + 0.5 * h * k2v, k3v = force(u + 0.5 * h * k2u);
        const k4u = v + h * k3v, k4v = force(u + h * k3u);
        u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
        v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
      }
      return 1 / u - r;
    }
    let lo = 2.15 * M, hi = 5.5 * M;
    for (let i = 0; i < 32; i++) {
      const mid = 0.5 * (lo + hi);
      if (drift(mid) < 0) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  function hash21(x, y, s0) {
    const n = Math.sin(x * 127.1 + y * 311.7 + s0 * 74.71) * 43758.5453;
    return n - Math.floor(n);
  }

  function darkest(pal, bg) {
    let best = pal && pal[0] ? pal[0] : '#111', lu = 2;
    const list = (pal || []).concat(bg || '#000');
    for (let i = 0; i < list.length; i++) {
      const L = U.luminance(list[i]);
      if (L < lu) { lu = L; best = list[i]; }
    }
    return best;
  }

  Studio.register({
    id: 'photon', name: 'Photon Sphere', tab: 'Photon',
    subtitle: 'Schwarzschild photon sphere · 1916',
    order: 113,
    equation: 'd²u/dφ² = 3M u² − u,   u = 1/r,   r_ph = 3M,   b_c = 3√3 M',
    credit: 'K. Schwarzschild, Sitzungsber. Preuss. Akad. Wiss. (1916). The unstable circular photon orbit at r = 3M is a textbook consequence of that metric. C. Darwin, Proc. R. Soc. Lond. A 249, 180 (1959) and J. L. Synge, Mon. Not. R. Astron. Soc. 131, 463 (1966) integrated the null geodesics and the capture cross-section. The plate is a seeded print of those equatorial (or slightly inclined) rays. It is not a new black hole.',
    blurb: 'Light that aims too close at a Schwarzschild hole never comes out. The last ray that still can is the photon sphere, an unstable circle at r = 3M, and on the sky of a distant observer it sits at impact parameter b = 3√3 M. Inside that, a dark disk. Just outside, a razor of light that wound once or more around the hole. The plate integrates the equatorial null geodesic, not a painted ring: the status line is the measured capture boundary over 3√3 M, and the radius the circular orbit actually holds, over 3M. If the integrator is wrong, the ring is in the wrong place.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Field: 'Zoom frames the hole in units of M. The shadow radius is 3√3 M regardless of zoom; pull back to see the Einstein ring of a distant source.',
      Rays: 'Disk is the camera at infinity. Equator is the textbook pencil in the plane. r, φ is the orbit chart. Impact paints fate against b. Polar tilts the belt. Stars, belt, Einstein and spray choose what the geodesics light up.',
    },
    palette: true, defaultPalette: 'kiln', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, mask, buf, img;
      let bMeas = BC_TH, rPh = RPH_TH, deflRatio = 1, kindLabel = 'photon ring';

      function sizeFrom(s, wpx, hpx) {
        if (wpx && hpx) return { W: wpx, H: hpx };
        const cw = canvas.width | 0, ch = canvas.height | 0;
        if (cw >= 64 && ch >= 64) return { W: cw, H: ch };
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(64, Math.round(g * a)) };
      }
      function extentOf(s) { return 14 / Math.max(0.2, s.zoom); }

      function lookup(tab, b) {
        const n = tab.length;
        if (b <= tab[0].b) return tab[0];
        if (b >= tab[n - 1].b) return tab[n - 1];
        let lo = 0, hi = n - 1;
        while (hi - lo > 1) {
          const m = (lo + hi) >> 1;
          if (tab[m].b < b) lo = m; else hi = m;
        }
        const a = tab[lo], c = tab[hi], t = (b - a.b) / ((c.b - a.b) || 1e-9);
        if (a.captured && c.captured) return a;
        if (a.captured !== c.captured) return t < 0.5 ? a : c;
        return {
          b, captured: false,
          phi: a.phi + (c.phi - a.phi) * t,
          rMin: a.rMin + (c.rMin - a.rMin) * t,
          defl: a.defl + (c.defl - a.defl) * t,
          ySrc: a.ySrc + (c.ySrc - a.ySrc) * t,
          gotSrc: a.gotSrc && c.gotSrc,
        };
      }

      function buildTable(n, bMax) {
        const samples = [];
        const nU = Math.max(40, (n * 0.45) | 0);
        const nC = n - nU;
        for (let i = 0; i < nU; i++) samples.push((i + 0.5) / nU * bMax);
        for (let i = 0; i < nC; i++) {
          const t = (i + 0.5) / nC;
          const g = (t - 0.5) * 6;
          samples.push(bMeas * Math.exp(g * 0.12));
        }
        samples.sort((a, b) => a - b);
        const tab = [];
        let last = -1;
        for (let i = 0; i < samples.length; i++) {
          const b = samples[i];
          if (b < 0.08 || b > bMax * 1.05) continue;
          if (b - last < 1e-4) continue;
          last = b;
          const near = Math.abs(b / bMeas - 1) < 0.08;
          const row = integrate(b, { r0: near ? 200 : 240, h: near ? 0.008 : 0.014, maxPhi: near ? 40 : 16, srcX: -40 });
          tab.push({ b, captured: row.captured, phi: row.phi, rMin: row.rMin, defl: row.defl, ySrc: row.ySrc, gotSrc: row.gotSrc });
        }
        return tab;
      }

      function buildSky(s, rng) {
        const sw = 384, sh = 192;
        const sky = new Float32Array(sw * sh);
        function splatS(u, v, w) {
          const x = ((u % sw) + sw) % sw, y = ((v % sh) + sh) % sh;
          const xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi;
          const x2 = (xi + 1) % sw, y2 = Math.min(sh - 1, yi + 1);
          sky[yi * sw + xi] += w * (1 - fx) * (1 - fy);
          sky[yi * sw + x2] += w * fx * (1 - fy);
          sky[y2 * sw + xi] += w * (1 - fx) * fy;
          sky[y2 * sw + x2] += w * fx * fy;
        }
        const nStar = s.scene === 'stars' ? 280 : (s.scene === 'einstein' ? 70 : 120);
        for (let i = 0; i < nStar; i++) {
          const u = rng() * sw, v = rng() * sh;
          const mag = Math.pow(rng(), 2.8) * (rng() < 0.06 ? 4.5 : 1.4);
          const rad = rng.range(0.35, 1.25);
          const rInt = Math.ceil(rad * 3);
          for (let dy = -rInt; dy <= rInt; dy++) for (let dx = -rInt; dx <= rInt; dx++) {
            const d2 = dx * dx + dy * dy;
            splatS(u + dx, v + dy, mag * Math.exp(-d2 / (2 * rad * rad)));
          }
        }
        for (let y = 0; y < sh; y++) {
          const band = 0.035 * (0.55 + 0.45 * Math.cos((y / sh) * TAU * 2.0));
          for (let x = 0; x < sw; x++) {
            const milky = 0.028 * Math.pow(Math.max(0, Math.cos((x / sw - 0.35) * TAU)), 4);
            sky[y * sw + x] += band + milky;
          }
        }
        return { sky, sw, sh };
      }

      function skyAt(S, defl, psi) {
        const u = ((psi / TAU) % 1 + 1) % 1 * S.sw;
        const v = ((defl / TAU) % 1 + 1) % 1 * S.sh;
        const xi = u | 0, yi = v | 0, fx = u - xi, fy = v - yi;
        const x2 = (xi + 1) % S.sw, y2 = Math.min(S.sh - 1, yi + 1);
        const a = S.sky[yi * S.sw + (xi % S.sw)];
        const b = S.sky[yi * S.sw + x2];
        const c = S.sky[y2 * S.sw + (xi % S.sw)];
        const d = S.sky[y2 * S.sw + x2];
        return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
      }

      function bForRing(tab, rWant) {
        let bestB = BC_TH * 1.4, best = 1e9;
        for (let i = 0; i < tab.length; i++) {
          if (tab[i].captured) continue;
          const d = Math.abs(tab[i].rMin - rWant);
          if (d < best) { best = d; bestB = tab[i].b; }
        }
        return bestB;
      }

      function splat(out, WW, HH, px, py, w) {
        if (px < 0 || py < 0 || px >= WW - 1 || py >= HH - 1) return;
        const xi = px | 0, yi = py | 0, fx = px - xi, fy = py - yi;
        const o = yi * WW + xi;
        out[o] += w * (1 - fx) * (1 - fy);
        out[o + 1] += w * fx * (1 - fy);
        out[o + WW] += w * (1 - fx) * fy;
        out[o + WW + 1] += w * fx * fy;
      }

      function xyMap(s, WW, HH, xM, yM) {
        const L = extentOf(s);
        const px = (xM / (2 * L) + 0.5) * WW;
        const py = (0.5 - yM / (2 * L * (HH / WW))) * HH;
        return [px, py];
      }

      function sampleDisk(s, tab, sky, X, Y, bBelt) {
        const b = Math.hypot(X, Y);
        if (b < bMeas) return { I: 0, cap: 1 };
        const row = lookup(tab, b);
        const psi = Math.atan2(Y, X);
        const defl = isFinite(row.defl) ? row.defl : 0;
        const wind = Math.max(0, row.phi - Math.PI);
        let I = 0.018 + 0.10 * Math.log(1 + wind) + 0.62 * Math.min(4, wind * wind / 28);
        if (s.scene === 'stars' || s.scene === 'einstein') I += 1.15 * skyAt(sky, defl, psi);
        else if (s.scene === 'belt') I += 0.22 * skyAt(sky, defl, psi);
        if (s.scene === 'einstein' && row.gotSrc) {
          const yr = row.ySrc;
          const sx = yr * Math.cos(psi), sy = yr * Math.sin(psi);
          I += 5.4 * Math.exp(-(sx * sx + sy * sy) / (2 * 0.85 * 0.85));
        }
        if (s.scene === 'belt' || s.view === 'polar') {
          const inc = (s.incline || 0) * Math.PI / 180;
          const cy = Math.max(0.18, Math.cos(inc));
          const be = Math.hypot(X, Y / cy);
          const wBelt = 0.10 + 0.025 * (s.beltR || 6);
          I += 1.2 * Math.exp(-Math.pow((be - bBelt) / wBelt, 2));
        } else if (s.scene === 'stars') {
          const inc = (s.incline || 0) * Math.PI / 180;
          const cy = Math.max(0.18, Math.cos(inc));
          const be = Math.hypot(X, Y / cy);
          I += 0.18 * Math.exp(-Math.pow((be - bBelt) / 0.14, 2));
        }
        if (s.scene === 'spray') I += 0.05 + 0.32 * Math.log(1 + wind);
        return { I, cap: 0 };
      }

      function fillDisk(s, WW, HH, out, msk, tab, sky, rng) {
        const L = extentOf(s);
        const bBelt = bForRing(tab, s.beltR);
        const aa = WW < 480 ? 2 : 1;
        const s0 = rng();
        const dx = 2 * L / WW, dy = 2 * L / WW;
        for (let y = 0; y < HH; y++) {
          const yy = (0.5 - (y + 0.5) / HH) * 2 * L * (HH / WW);
          for (let x = 0; x < WW; x++) {
            const xx = ((x + 0.5) / WW - 0.5) * 2 * L;
            let I = 0, cap = 0;
            if (aa === 1) {
              const sm = sampleDisk(s, tab, sky, xx, yy, bBelt);
              I = sm.I; cap = sm.cap;
            } else {
              for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
                const sm = sampleDisk(s, tab, sky, xx + (sx - 0.5) * dx * 0.5, yy + (sy - 0.5) * dy * 0.5, bBelt);
                I += sm.I; cap += sm.cap;
              }
              I *= 0.25; cap *= 0.25;
            }
            const g = 0.028 * (hash21(x, y, s0) - 0.5);
            out[y * WW + x] = I + g;
            msk[y * WW + x] = cap;
          }
        }
      }

      function fillPencil(s, WW, HH, out, msk, tab, polar) {
        const L = extentOf(s);
        const nR = s.rays | 0;
        const inc = polar ? (s.incline || 0) * Math.PI / 180 : 0;
        const ci = Math.cos(inc);
        out.fill(0);
        msk.fill(0);
        const bMax = L * 1.15;
        for (let k = 0; k < nR; k++) {
          const t = (k + 0.5) / nR;
          const bUnif = (t - 0.5) * 2 * bMax;
          const warp = bMeas * Math.tanh((t - 0.5) * 8) / Math.tanh(4);
          const b = 0.58 * bUnif + 0.42 * warp;
          const absB = Math.abs(b);
          const near = Math.abs(absB / bMeas - 1) < 0.12;
          const row = integrate(b, {
            r0: Math.max(L * 1.35, 40), h: near ? 0.008 : 0.013,
            maxPhi: near ? (L > 20 ? 12 : 42) : 16, pts: true,
          });
          const w = (1.35 + (near ? 0.45 : 0.25) + (absB > bMeas * 1.6 ? 1.1 : 0)) * (320 / nR) / Math.max(1, Math.pow(row.phi || 1, 0.28));
          const sgn = b < 0 ? -1 : 1;
          const pts = row.pts;
          let px0 = 0, py0 = 0, have = false;
          for (let i = 0; i < pts.length; i += 2) {
            const xM = pts[i], yM = sgn * pts[i + 1];
            const yP = polar ? yM * ci : yM;
            const p = xyMap(s, WW, HH, xM, yP);
            if (have) {
              const dist = Math.hypot(p[0] - px0, p[1] - py0);
              const n = Math.max(1, Math.min(10, dist | 0));
              for (let spt = 0; spt <= n; spt++) {
                const tt = spt / n;
                splat(out, WW, HH, px0 + (p[0] - px0) * tt, py0 + (p[1] - py0) * tt, w * (0.45 + 0.55 * tt) / (n + 1));
              }
            }
            px0 = p[0]; py0 = p[1]; have = true;
          }
        }
        const bBelt = bForRing(tab, s.beltR);
        for (let y = 0; y < HH; y++) {
          const yy = (0.5 - (y + 0.5) / HH) * 2 * L * (HH / WW);
          for (let x = 0; x < WW; x++) {
            const xx = ((x + 0.5) / WW - 0.5) * 2 * L;
            const r = Math.hypot(xx, polar ? yy / Math.max(0.2, ci) : yy);
            const rp = Math.hypot(xx, yy);
            if (rp < RS) { msk[y * WW + x] = 1; out[y * WW + x] *= 0.08; }
            if (s.scene === 'belt' && Math.abs(r - s.beltR) < 0.18) out[y * WW + x] += 0.9;
            if (polar && s.scene === 'belt') {
              const be = Math.hypot(xx, yy / Math.max(0.2, ci));
              out[y * WW + x] += 0.55 * Math.exp(-Math.pow((be - bBelt) / 0.22, 2));
            }
          }
        }
      }

      function fillOrbit(s, WW, HH, out, msk) {
        out.fill(0); msk.fill(0);
        const nR = s.rays | 0;
        const phiMax = 8.2, rMax = extentOf(s) * 1.15;
        for (let k = 0; k < nR; k++) {
          const t = (k + 0.5) / nR;
          const clustered = Math.tanh((t - 0.35) * 4) * 0.5 + 0.5;
          const b = 0.45 + (0.55 * t + 0.45 * clustered) * 13.5;
          const near = Math.abs(b / bMeas - 1) < 0.1;
          const w = 1.15 + (near ? 2.4 : 0);
          let px0 = 0, py0 = 0, have = false;
          integrate(b, {
            r0: 90, h: 0.01, maxPhi: near ? 42 : 14,
            onStep(r, phi) {
              const px = (phi / phiMax) * WW;
              const py = (1 - r / rMax) * HH;
              if (have) {
                const dist = Math.hypot(px - px0, py - py0);
                const n = Math.max(1, Math.min(8, dist | 0));
                for (let spt = 0; spt <= n; spt++) {
                  const tt = spt / n;
                  splat(out, WW, HH, px0 + (px - px0) * tt, py0 + (py - py0) * tt, w / (n + 1));
                }
              }
              px0 = px; py0 = py; have = true;
            },
          });
        }
        for (let y = 0; y < HH; y++) {
          const r = (1 - (y + 0.5) / HH) * rMax;
          if (r < RS) for (let x = 0; x < WW; x++) msk[y * WW + x] = 1;
        }
      }

      function fillImpact(s, WW, HH, out, msk, tab) {
        out.fill(0); msk.fill(0);
        const bMax = 13.5;
        const phiMax = 9.5;
        for (let x = 0; x < WW; x++) {
          const b = ((x + 0.5) / WW) * bMax;
          const cap = b < bMeas;
          const edge = Math.exp(-Math.abs(b - bMeas) * 22);
          for (let y = 0; y < HH; y++) {
            const i = y * WW + x;
            if (cap) {
              msk[i] = 0.78;
              out[i] = 0.04 + 0.06 * (1 - (y + 0.5) / HH);
            } else {
              const row = lookup(tab, b);
              const phi = ((y + 0.5) / HH) * phiMax;
              const along = phi < row.phi ? 0.22 : 0.06;
              out[i] = along + 1.65 * edge;
            }
          }
        }
        const nR = Math.min(s.rays | 0, 90);
        for (let k = 0; k < nR; k++) {
          const t = (k + 0.5) / nR;
          const b = 0.35 + t * (bMax - 0.35);
          const near = Math.abs(b / bMeas - 1) < 0.12;
          const w = 1.1 + (near ? 1.8 : 0);
          let py0 = 0, have = false;
          integrate(b, {
            r0: 80, h: 0.01, maxPhi: near ? 34 : 12,
            onStep(r, phi) {
              const px = (b / bMax) * WW;
              const py = (phi / phiMax) * HH;
              const ww = w * (0.5 + 0.5 * Math.exp(-Math.abs(r - RPH_TH) * 0.35));
              if (have) {
                const n = Math.max(1, Math.min(6, Math.abs(py - py0) | 0));
                for (let spt = 0; spt <= n; spt++) splat(out, WW, HH, px, py0 + (py - py0) * spt / n, ww / (n + 1));
              }
              py0 = py; have = true;
            },
          });
        }
      }

      function fill(s, WW, HH, out, msk) {
        const rng = U.makeRng(String(s.seed) + '/ph');
        const nB = Math.max(160, Math.min(520, (s.grid | 0) * 2));
        const tab = buildTable(nB, Math.max(22, extentOf(s) * 1.6));
        const sky = buildSky(s, rng);
        const v = s.view;
        if (v === 'equatorial') fillPencil(s, WW, HH, out, msk, tab, false);
        else if (v === 'polar') {
          fillDisk(s, WW, HH, out, msk, tab, sky, rng);
          const tmp = new Float32Array(WW * HH);
          const m2 = new Float32Array(WW * HH);
          fillPencil(s, WW, HH, tmp, m2, tab, true);
          for (let i = 0; i < out.length; i++) {
            out[i] = out[i] * 0.82 + tmp[i] * 0.28;
            if (m2[i] > 0.5) msk[i] = 1;
          }
        } else if (v === 'orbit') fillOrbit(s, WW, HH, out, msk);
        else if (v === 'impact') fillImpact(s, WW, HH, out, msk, tab);
        else fillDisk(s, WW, HH, out, msk, tab, sky, rng);
        kindLabel = v === 'disk' ? (s.scene === 'einstein' ? 'Einstein ring' : 'photon ring')
          : v === 'equatorial' ? 'equatorial' : v === 'polar' ? 'polar' : v === 'orbit' ? 'r, φ' : 'impact';
      }

      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        bMeas = searchBc();
        rPh = searchRph();
        const weakB = 50;
        const weak = integrate(weakB, { r0: 900, h: 0.005, maxPhi: 8 });
        deflRatio = (weak.defl || 0) / (4 * M / weakB);
        field = new Float32Array(W * H);
        mask = new Float32Array(W * H);
        fill(s, W, H, field, mask);
        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function paintBuf() {
        if (!field || !img) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#1E1B18', '#C4472B', '#E8A33C', '#FFFBF2'];
        const bg = s.bg || '#F1E8D8';
        const ramp = U.makeRamp(pal, bg);
        const ink = darkest(pal, bg);
        const inkRgb = U.hexToRgb(ink);
        const bgLum = U.luminance(bg);
        const inkDeep = bgLum > 80 ? [Math.min(inkRgb[0], 28), Math.min(inkRgb[1], 24), Math.min(inkRgb[2], 22)] : inkRgb;
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        const live = [];
        for (let i = 0; i < field.length; i++) if (mask[i] < 0.6) live.push(field[i]);
        live.sort((a, b) => a - b);
        const q = p => live.length ? live[Math.max(0, Math.min(live.length - 1, (p * (live.length - 1)) | 0))] : 0;
        let lo = q(0.08), hi = q(0.985);
        if (!(hi > lo)) { lo = 0; hi = 1; }
        const span = hi - lo, logv = s.tone === 'log', shade = s.tone === 'shade';
        for (let i = 0; i < field.length; i++) {
          const cap = mask[i];
          let tv = (field[i] - lo) / span;
          if (logv) tv = Math.log(1.002 + 14 * Math.max(0, tv)) / Math.log(16);
          if (shade) {
            const x = i % W, y = (i / W) | 0;
            const xm = x > 0 ? field[i - 1] : field[i];
            const xp = x + 1 < W ? field[i + 1] : field[i];
            const ym = y > 0 ? field[i - W] : field[i];
            const yp = y + 1 < H ? field[i + W] : field[i];
            const sh = 0.5 + 0.5 * ((xm - xp) * 0.55 + (ym - yp) * 0.8) / (span * 2.4 + 1e-6);
            tv = U.clamp(0.4 * tv + 0.6 * sh, 0, 1);
          }
          tv = U.clamp(tv * exp, 0, 1);
          const c = ramp(isFinite(tv) ? tv : 0);
          const k = U.clamp(cap, 0, 1);
          const o = i * 4;
          data[o] = (c[0] * (1 - k) + inkDeep[0] * k + 0.5) | 0;
          data[o + 1] = (c[1] * (1 - k) + inkDeep[1] * k + 0.5) | 0;
          data[o + 2] = (c[2] * (1 - k) + inkDeep[2] * k + 0.5) | 0;
          data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
      }

      function paint() {
        paintBuf();
        if (!buf) return;
        const s = host.getState();
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = s.bg || '#F1E8D8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() {
        const br = bMeas / BC_TH, rr = rPh / RPH_TH;
        const okB = Math.abs(br - 1) < 0.02, okR = Math.abs(rr - 1) < 0.02;
        host.setStatus(
          '<span>b_meas / (3√3 M) <b>' + f4(br) + '</b></span>' +
          '<span>r_ph / 3M <b>' + f4(rr) + '</b></span>' +
          '<span>δ(50M)/(4M/b) <b>' + f3(deflRatio) + '</b></span>' +
          '<span>' + (okB && okR ? kindLabel : 'integrator missed') + '</span>'
        );
      }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, ht) {
          const s = host.getState();
          const c = document.createElement('canvas'); c.width = w; c.height = ht;
          const g = c.getContext('2d', { alpha: false });
          const tmp = new Float32Array(w * ht), tmpM = new Float32Array(w * ht);
          const builtW = W, builtH = H, builtF = field, builtM = mask, builtB = buf, builtI = img;
          W = w; H = ht; field = tmp; mask = tmpM;
          buf = document.createElement('canvas'); buf.width = w; buf.height = ht;
          img = buf.getContext('2d').createImageData(w, ht);
          fill(s, w, ht, tmp, tmpM);
          paintBuf();
          g.fillStyle = s.bg || '#F1E8D8'; g.fillRect(0, 0, w, ht);
          g.drawImage(buf, 0, 0);
          W = builtW; H = builtH; field = builtF; mask = builtM; buf = builtB; img = builtI;
          paint();
          return U.toBlob(c);
        },
      };
    },
  });
})();
