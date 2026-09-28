// Hatano-Nelson skin plate: row count, closed-form right eigenvectors, the disordered
// open chain against Jacobi, the disordered ring against a Krylov solve, and a node print fixture.
//
// The plate used to draw the sheet height in cells. On the default 4:5 sheet that is 120 rows for
// a chain of 96 sites. Row 97 has wave number pi and is rounding error; rows 98-120 repeat modes
// 1-23. Recipe v7 draws at most N rows. Recipes older than v7 keep the sheet height (rows: 'sheet').
//
//   node tools/skin-rows.js [--write]
//
// No browser. The print fixture drives the module's own paint and exportPNG through a canvas mock.
// It is not tools/export.js and it is not a reason to promote the validation status.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { load } = require('./science-harness');
const stats = require('../src/shared/stats.js');

const root = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const failures = [];
const check = (ok, what) => { if (!ok) failures.push(what); return ok; };

const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
const EMBER = ['#3F3A36', '#8C2F0D', '#F25C05', '#F2A20C', '#FFF3D6'];
const EMBER_BG = '#121110';

function sheetRows(grid, aspect) {
  return Math.max(32, Math.round(grid * (ASPECTS[aspect] || 1)));
}
function modeRows(grid, aspect) {
  return Math.min(sheetRows(grid, aspect), grid);
}

// Independent open-chain operator: (H psi)_i = e^g psi_{i-1} + e^{-g} psi_{i+1}, open ends.
// The closed form psi_j = e^{g j} sin(pi n (j+1) / (N+1)) has eigenvalue 2 cos(pi n / (N+1)).
function eigenvector(N, n, g) {
  const k = Math.PI * n / (N + 1);
  const psi = new Float64Array(N);
  for (let j = 0; j < N; j++) psi[j] = Math.exp(g * j) * Math.sin(k * (j + 1));
  return { k, lambda: 2 * Math.cos(k), psi };
}
function applyOpen(psi, g, sign) {
  const N = psi.length;
  const tR = Math.exp(sign * g), tL = Math.exp(-sign * g);
  const dst = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const L = i === 0 ? 0 : psi[i - 1];
    const R = i === N - 1 ? 0 : psi[i + 1];
    dst[i] = tR * L + tL * R;
  }
  return dst;
}
function relativeResidual(psi, g, lambda, sign) {
  const Hp = applyOpen(psi, g, sign);
  let num = 0, den = 0;
  for (let i = 0; i < psi.length; i++) {
    num = Math.max(num, Math.abs(Hp[i] - lambda * psi[i]));
    den = Math.max(den, Math.abs(psi[i]));
  }
  return den ? num / den : Infinity;
}
// Same float32 normalization the module uses: square, store, then divide by the sum of the stored squares.
function density32(psi) {
  const row = new Float32Array(psi.length);
  let nrm = 0;
  for (let j = 0; j < psi.length; j++) {
    row[j] = psi[j] * psi[j];
    nrm += row[j];
  }
  nrm = nrm || 1;
  for (let j = 0; j < psi.length; j++) row[j] = row[j] / nrm;
  return row;
}
function density64(sineOf, N, g) {
  const row = new Float64Array(N);
  let nrm = 0;
  for (let j = 0; j < N; j++) {
    const v = Math.exp(g * j) * sineOf(j);
    row[j] = v * v;
    nrm += row[j];
  }
  nrm = nrm || 1;
  for (let j = 0; j < N; j++) row[j] /= nrm;
  return row;
}
function skinWeight(amp, N, H) {
  const cut = Math.max(2, Math.floor(N * 0.9));
  let w = 0;
  for (let n = 0; n < H; n++) {
    let right = 0;
    for (let j = cut; j < N; j++) right += amp[n * N + j];
    w += right;
  }
  return w / H;
}
function rowsEqual(amp, N, a, b) {
  for (let j = 0; j < N; j++) if (amp[a * N + j] !== amp[b * N + j]) return false;
  return true;
}
function rowL1(a, b) {
  let s = 0;
  for (let j = 0; j < a.length; j++) s += Math.abs(a[j] - b[j]);
  return s;
}
// Rows at index >= N. m = index+1. When m is a multiple of N+1 the wave number is an integer
// times pi (rounding error). Otherwise m mod (N+1) is the mode the squared sine repeats.
function rowsPastN(amp, N, H) {
  const period = N + 1;
  const out = [];
  for (let r = N; r < H; r++) {
    const m = r + 1;
    const s = m % period;
    if (s === 0) {
      let maxSin = 0;
      const k = Math.PI * m / period;
      for (let j = 0; j < N; j++) maxSin = Math.max(maxSin, Math.abs(Math.sin(k * (j + 1))));
      out.push({ row: m, kind: 'pi-noise', maxAbsSin: maxSin });
    } else {
      out.push({ row: m, kind: rowsEqual(amp, N, r, s - 1) ? 'copy' : 'mismatch', ofMode: s });
    }
  }
  return out;
}

// IEC 61966-2-1 ramp, written here rather than sliced from the engine, so the pixel check has
// a second implementation of the color map the module asks the shell for.
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
const srgbToLinear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const linearToSrgb = v => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055);
function independentRamp(colors, bg) {
  const stops = [bg].concat(colors).map(hexToRgb);
  const n = stops.length;
  const lin = stops.map(c => [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2])]);
  return t => {
    t = clamp(t, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(t)), f = t - i;
    return [0, 1, 2].map(ch => linearToSrgb(lin[i][ch] + (lin[i + 1][ch] - lin[i][ch]) * f));
  };
}
function paintLog(amp, W, H, exposure, gamma, ramp) {
  const data = new Uint8ClampedArray(W * H * 4);
  const raw = new Float64Array(amp.length);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < amp.length; i++) {
    raw[i] = Math.log(1e-12 + amp[i]);
    if (raw[i] < lo) lo = raw[i];
    if (raw[i] > hi) hi = raw[i];
  }
  const span = (hi - lo) || 1;
  for (let i = 0; i < amp.length; i++) {
    const t = clamp(Math.pow(Math.max(0, (raw[i] - lo) / span), gamma) * exposure, 0, 1);
    const c = ramp(Number.isFinite(t) ? t : 0);
    const o = i * 4;
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
  }
  return data;
}
function channelDelta(a, b) {
  if (a.length !== b.length) return { channels: a.length + b.length, max: 255 };
  let channels = 0, max = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) {
    channels++;
    max = Math.max(max, Math.abs(a[i] - b[i]));
  }
  return { channels, max };
}
function shiftX(data, W, H) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = (y * W + ((x + 1) % W)) * 4, d = (y * W + x) * 4;
    out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
  }
  return out;
}

function makeSurface() {
  let w = 300, h = 150, data = new Uint8ClampedArray(w * h * 4);
  const surface = {
    get width() { return w; },
    set width(v) { w = v | 0; data = new Uint8ClampedArray(w * h * 4); },
    get height() { return h; },
    set height(v) { h = v | 0; data = new Uint8ClampedArray(w * h * 4); },
    get _data() { return data; },
    getContext() { return ctx; },
  };
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '#000000',
    createImageData(iw, ih) {
      return { data: new Uint8ClampedArray(iw * ih * 4), width: iw, height: ih };
    },
    putImageData(img, dx, dy) {
      const buf = surface._data;
      for (let y = 0; y < img.height; y++) {
        const yy = y + (dy | 0);
        if (yy < 0 || yy >= surface.height) continue;
        for (let x = 0; x < img.width; x++) {
          const xx = x + (dx | 0);
          if (xx < 0 || xx >= surface.width) continue;
          const s = (y * img.width + x) * 4, d = (yy * surface.width + xx) * 4;
          buf[d] = img.data[s]; buf[d + 1] = img.data[s + 1]; buf[d + 2] = img.data[s + 2]; buf[d + 3] = img.data[s + 3];
        }
      }
    },
    fillRect(x, y, rw, rh) {
      const hex = String(ctx.fillStyle);
      const c = /^#[0-9a-f]{6}$/i.test(hex) ? hexToRgb(hex) : [0, 0, 0];
      const buf = surface._data;
      const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
      const x1 = Math.min(surface.width, (x + rw) | 0), y1 = Math.min(surface.height, (y + rh) | 0);
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const d = (yy * surface.width + xx) * 4;
        buf[d] = c[0]; buf[d + 1] = c[1]; buf[d + 2] = c[2]; buf[d + 3] = 255;
      }
    },
    drawImage(src, dx, dy, dw, dh) {
      const sw = src.width, sh = src.height, sd = src._data, buf = surface._data;
      const nearest = ctx.imageSmoothingEnabled === false;
      for (let y = 0; y < dh; y++) {
        const sy = Math.min(sh - 1, nearest ? Math.floor(y * sh / dh) : Math.round(((y + 0.5) * sh) / dh - 0.5));
        const yy = y + (dy | 0);
        if (yy < 0 || yy >= surface.height) continue;
        for (let x = 0; x < dw; x++) {
          const sx = Math.min(sw - 1, nearest ? Math.floor(x * sw / dw) : Math.round(((x + 0.5) * sw) / dw - 0.5));
          const xx = x + (dx | 0);
          if (xx < 0 || xx >= surface.width) continue;
          const s = (sy * sw + sx) * 4, d = (yy * surface.width + xx) * 4;
          buf[d] = sd[s]; buf[d + 1] = sd[s + 1]; buf[d + 2] = sd[s + 2]; buf[d + 3] = sd[s + 3];
        }
      }
    },
  };
  return surface;
}

function enginePieces() {
  const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
  const recipeV = +((/const RECIPE_V = (\d+);/.exec(engine) || [])[1] || 0);
  const makeRng = new Function('const TAU = Math.PI * 2;\n' + engine.slice(engine.indexOf('  function makeRng'), engine.indexOf('  function makeNoise')) + 'return makeRng;')();
  const legacyFill = new Function('RECIPE_V', engine.slice(engine.indexOf('  function legacyFill'), engine.indexOf('  function textProblem')) + '\nreturn legacyFill;')(recipeV);
  const rampSrc = engine.slice(engine.indexOf('  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));'), engine.indexOf('  function makeRampLUT('));
  const ramp = new Function(rampSrc + '\nreturn { clamp, makeRamp };')();
  return { recipeV, makeRng, legacyFill, makeRamp: ramp.makeRamp, clamp: ramp.clamp };
}

function openPlate(pieces) {
  const hooks = {};
  const document = { createElement: () => makeSurface() };
  const canvas = makeSurface();
  let state = null;
  const host = {
    canvas,
    getState: () => state,
    setStatus(html) { hooks.status = html; },
    reducedMotion: () => true,
    isActive: () => true,
    requestRepaint() {},
  };
  const context = {
    Studio: {
      util: {
        TAU: Math.PI * 2,
        clamp: pieces.clamp,
        makeRng: pieces.makeRng,
        makeRamp: pieces.makeRamp,
        stats,
        toBlob(c) {
          return Promise.resolve({ width: c.width, height: c.height, data: Uint8ClampedArray.from(c._data) });
        },
      },
      PALETTES: new Proxy({}, { get: () => ({ bg: EMBER_BG, colors: EMBER }) }),
      register(m) { hooks.module = m; },
    },
    document,
    hooks,
  };
  let source = fs.readFileSync(path.join(root, 'src/modules/skin.js'), 'utf8');
  const needle = '      return {\n        aspect(s)';
  if (source.split(needle).length !== 2) throw new Error('skin.js no longer has the instance return this harness hooks');
  source = source.replace(needle, '      hooks.read = () => ({ amp: amp && new Float32Array(amp), W, H, skinW });\n' + needle);
  vm.runInNewContext(source, context, { filename: 'src/modules/skin.js' });
  const inst = hooks.module.create(host);
  return {
    module: hooks.module,
    inst,
    setState(s) { state = Object.assign({}, hooks.module.defaults, s); },
    read: () => hooks.read(),
    status: () => hooks.status,
  };
}

function jacobiHermitian(diag) {
  const n = diag.length;
  const A = Array.from({ length: n }, () => new Float64Array(n));
  const V = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    A[i][i] = diag[i];
    V[i][i] = 1;
    if (i + 1 < n) A[i][i + 1] = A[i + 1][i] = 1;
  }
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (Math.sqrt(off) < 1e-14) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p][q];
      if (Math.abs(apq) < 1e-18) continue;
      const tau = (A[q][q] - A[p][p]) / (2 * apq);
      const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
      const c = 1 / Math.sqrt(1 + t * t), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k][p], akq = A[k][q];
        A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p][k], aqk = A[q][k];
        A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
      }
    }
  }
  return { values: A.map((row, i) => row[i]), V };
}

function openReference(pot, g) {
  const { values, V } = jacobiHermitian(pot);
  const N = pot.length;
  const order = values.map((_, i) => i).sort((a, b) => values[b] - values[a] || a - b);
  const tR = Math.exp(g), tL = Math.exp(-g);
  let maxRes = 0;
  const rows = order.map(col => {
    const psi = new Float64Array(N);
    for (let j = 0; j < N; j++) psi[j] = Math.exp(g * j) * V[j][col];
    const lambda = values[col];
    let num = 0, den = 0;
    for (let i = 0; i < N; i++) {
      const L = i === 0 ? 0 : psi[i - 1];
      const R = i === N - 1 ? 0 : psi[i + 1];
      num = Math.max(num, Math.abs(tR * L + tL * R + pot[i] * psi[i] - lambda * psi[i]));
      den = Math.max(den, Math.abs(psi[i]));
    }
    maxRes = Math.max(maxRes, den ? num / den : Infinity);
    const row = new Float64Array(N);
    let nrm = 0;
    for (let j = 0; j < N; j++) { row[j] = psi[j] * psi[j]; nrm += row[j]; }
    for (let j = 0; j < N; j++) row[j] /= nrm || 1;
    return row;
  });
  return { rows, maxRes };
}

function floatRowDiff(amp, N, n, dens) {
  let s = 0;
  const stored = new Float32Array(N);
  for (let j = 0; j < N; j++) { stored[j] = dens[j]; s += stored[j]; }
  let m = 0;
  for (let j = 0; j < N; j++) m = Math.max(m, Math.abs(amp[n * N + j] - stored[j] / (s || 1)));
  return m;
}

function meanBestL1(a, b, N) {
  const H = a.length / N;
  let sum = 0;
  for (let n = 0; n < H; n++) {
    let best = Infinity;
    for (let m = 0; m < H; m++) {
      let l1 = 0;
      for (let j = 0; j < N; j++) l1 += Math.abs(a[n * N + j] - b[m * N + j]);
      if (l1 < best) best = l1;
    }
    sum += best;
  }
  return sum / H;
}

// Periodic Hatano–Nelson matrix, built here and not copied from the plate.
// (H psi)_i = e^g psi_{i-1} + e^{-g} psi_{i+1} + V_i psi_i, with or without the wrap.
function hatanoMatrix(pot, g, periodic) {
  const n = pot.length;
  const A = Array.from({ length: n }, () => new Float64Array(n));
  const tR = Math.exp(g), tL = Math.exp(-g);
  for (let i = 0; i < n; i++) {
    A[i][i] = pot[i];
    const L = i === 0 ? (periodic ? n - 1 : -1) : i - 1;
    const R = i === n - 1 ? (periodic ? 0 : -1) : i + 1;
    if (L >= 0) A[i][L] += tR;
    if (R >= 0) A[i][R] += tL;
  }
  return A;
}
function cdiv(ar, ai, br, bi) {
  const den = br * br + bi * bi;
  return [(ar * br + ai * bi) / den, (ai * br - ar * bi) / den];
}
// Eigenvalues of a Hessenberg matrix. Francis double-shift QR (Numerical Recipes hqr).
// The plate reduces the periodic matrix by Householder elimination and then this QR.
// This copy is applied only to an Arnoldi Hessenberg matrix, a different reduction.
function hessEigen(M) {
  const n = M.length, a = M.map(r => Float64Array.from(r)), wr = new Float64Array(n), wi = new Float64Array(n);
  for (let m = 1; m < n - 1; m++) {
    let x = 0, i = m;
    for (let j = m; j < n; j++) if (Math.abs(a[j][m - 1]) > Math.abs(x)) { x = a[j][m - 1]; i = j; }
    if (i !== m) { for (let j = m - 1; j < n; j++) [a[i][j], a[m][j]] = [a[m][j], a[i][j]]; for (let j = 0; j < n; j++) [a[j][i], a[j][m]] = [a[j][m], a[j][i]]; }
    if (x) for (i = m + 1; i < n; i++) { let y = a[i][m - 1]; if (y) { y /= x; a[i][m - 1] = y; for (let j = m; j < n; j++) a[i][j] -= y * a[m][j]; for (let j = 0; j < n; j++) a[j][m] += y * a[j][i]; } }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < i - 1; j++) a[i][j] = 0;
  let anorm = 0; for (let i = 0; i < n; i++) for (let j = Math.max(i - 1, 0); j < n; j++) anorm += Math.abs(a[i][j]);
  let nn = n - 1, t = 0, p = 0, q = 0, r = 0, x, y, z, w, s, l;
  while (nn >= 0) {
    let its = 0;
    do {
      for (l = nn; l >= 1; l--) { s = Math.abs(a[l - 1][l - 1]) + Math.abs(a[l][l]); if (s === 0) s = anorm; if (Math.abs(a[l][l - 1]) + s === s) { a[l][l - 1] = 0; break; } }
      x = a[nn][nn];
      if (l === nn) { wr[nn] = x + t; wi[nn--] = 0; }
      else {
        y = a[nn - 1][nn - 1]; w = a[nn][nn - 1] * a[nn - 1][nn];
        if (l === nn - 1) {
          p = 0.5 * (y - x); q = p * p + w; z = Math.sqrt(Math.abs(q)); x += t;
          if (q >= 0) { z = p + (p >= 0 ? z : -z); wr[nn - 1] = wr[nn] = x + z; if (z) wr[nn] = x - w / z; wi[nn - 1] = wi[nn] = 0; }
          else { wr[nn - 1] = wr[nn] = x + p; wi[nn - 1] = -(wi[nn] = z); }
          nn -= 2;
        } else {
          if (its === 60) throw Error('eigenvalue iteration did not converge');
          if (its === 10 || its === 20) { t += x; for (let i = 0; i <= nn; i++) a[i][i] -= x; s = Math.abs(a[nn][nn - 1]) + Math.abs(a[nn - 1][nn - 2]); y = x = 0.75 * s; w = -0.4375 * s * s; }
          ++its;
          let m;
          for (m = nn - 2; m >= l; m--) {
            z = a[m][m]; r = x - z; s = y - z;
            p = (r * s - w) / a[m + 1][m] + a[m][m + 1]; q = a[m + 1][m + 1] - z - r - s; r = a[m + 2][m + 1];
            s = Math.abs(p) + Math.abs(q) + Math.abs(r); p /= s; q /= s; r /= s;
            if (m === l) break;
            const u = Math.abs(a[m][m - 1]) * (Math.abs(q) + Math.abs(r)), v = Math.abs(p) * (Math.abs(a[m - 1][m - 1]) + Math.abs(z) + Math.abs(a[m + 1][m + 1]));
            if (u + v === v) break;
          }
          for (let i = m + 2; i <= nn; i++) { a[i][i - 2] = 0; if (i !== m + 2) a[i][i - 3] = 0; }
          for (let k = m; k <= nn - 1; k++) {
            if (k !== m) { p = a[k][k - 1]; q = a[k + 1][k - 1]; r = 0; if (k !== nn - 1) r = a[k + 2][k - 1]; if ((x = Math.abs(p) + Math.abs(q) + Math.abs(r)) !== 0) { p /= x; q /= x; r /= x; } }
            if ((s = (p >= 0 ? 1 : -1) * Math.sqrt(p * p + q * q + r * r)) !== 0) {
              if (k === m) { if (l !== m) a[k][k - 1] = -a[k][k - 1]; } else a[k][k - 1] = -s * x;
              p += s; x = p / s; y = q / s; z = r / s; q /= p; r /= p;
              for (let j = k; j <= nn; j++) { p = a[k][j] + q * a[k + 1][j]; if (k !== nn - 1) { p += r * a[k + 2][j]; a[k + 2][j] -= p * z; } a[k + 1][j] -= p * y; a[k][j] -= p * x; }
              const mmin = nn < k + 3 ? nn : k + 3;
              for (let i = l; i <= mmin; i++) { p = x * a[i][k] + y * a[i][k + 1]; if (k !== nn - 1) { p += z * a[i][k + 2]; a[i][k + 2] -= p * r; } a[i][k + 1] -= p * q; a[i][k] -= p; }
            }
          }
        }
      }
    } while (l < nn - 1);
  }
  return Array.from(wr, (re, i) => [re, wi[i]]);
}
function arnoldiEigen(A) {
  const n = A.length;
  const V = Array.from({ length: n }, () => new Float64Array(n));
  const H = Array.from({ length: n }, () => new Float64Array(n));
  let n0 = 0;
  for (let i = 0; i < n; i++) { V[i][0] = Math.sin(i * 1.7 + 0.3); n0 += V[i][0] * V[i][0]; }
  n0 = Math.sqrt(n0);
  for (let i = 0; i < n; i++) V[i][0] /= n0;
  for (let k = 0; k < n; k++) {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) w[i] += A[i][j] * V[j][k];
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i <= k; i++) {
        let h = 0;
        for (let j = 0; j < n; j++) h += V[j][i] * w[j];
        if (pass === 0) H[i][k] += h;
        for (let j = 0; j < n; j++) w[j] -= h * V[j][i];
      }
    }
    if (k + 1 === n) break;
    let h = 0;
    for (let j = 0; j < n; j++) h += w[j] * w[j];
    h = Math.sqrt(h);
    if (!(h > 1e-12)) {
      for (let j = 0; j < n; j++) w[j] = 0;
      w[(k * 3) % n] = 1;
      for (let i = 0; i <= k; i++) {
        let dot = 0;
        for (let j = 0; j < n; j++) dot += V[j][i] * w[j];
        for (let j = 0; j < n; j++) w[j] -= dot * V[j][i];
      }
      h = 0;
      for (let j = 0; j < n; j++) h += w[j] * w[j];
      h = Math.sqrt(h) || 1;
    }
    H[k + 1][k] = h;
    for (let j = 0; j < n; j++) V[j][k + 1] = w[j] / h;
  }
  return hessEigen(H);
}
function denseSolve(A, re, im, br, bi) {
  const n = A.length;
  const Ar = A.map(row => Float64Array.from(row));
  const Ai = A.map(() => new Float64Array(n));
  for (let i = 0; i < n; i++) { Ar[i][i] -= re; Ai[i][i] -= im; }
  const xr = Float64Array.from(br), xi = Float64Array.from(bi);
  for (let k = 0; k < n; k++) {
    let piv = k, best = -1;
    for (let i = k; i < n; i++) {
      const mag = Math.hypot(Ar[i][k], Ai[i][k]);
      if (mag > best) { best = mag; piv = i; }
    }
    if (!(best > 0)) return null;
    if (piv !== k) {
      const ar = Ar[piv]; Ar[piv] = Ar[k]; Ar[k] = ar;
      const ai = Ai[piv]; Ai[piv] = Ai[k]; Ai[k] = ai;
      const tx = xr[piv]; xr[piv] = xr[k]; xr[k] = tx;
      const ti = xi[piv]; xi[piv] = xi[k]; xi[k] = ti;
    }
    for (let i = k + 1; i < n; i++) {
      const [fr, fi] = cdiv(Ar[i][k], Ai[i][k], Ar[k][k], Ai[k][k]);
      for (let j = k; j < n; j++) {
        Ar[i][j] -= fr * Ar[k][j] - fi * Ai[k][j];
        Ai[i][j] -= fr * Ai[k][j] + fi * Ar[k][j];
      }
      xr[i] -= fr * xr[k] - fi * xi[k];
      xi[i] -= fr * xi[k] + fi * xr[k];
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    let sr = xr[i], si = xi[i];
    for (let j = i + 1; j < n; j++) {
      sr -= Ar[i][j] * xr[j] - Ai[i][j] * xi[j];
      si -= Ar[i][j] * xi[j] + Ai[i][j] * xr[j];
    }
    const [qr, qi] = cdiv(sr, si, Ar[i][i], Ai[i][i]);
    xr[i] = qr; xi[i] = qi;
  }
  return { xr, xi };
}
function krylovDensities(A) {
  const n = A.length;
  const ev = arnoldiEigen(A).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const rows = [];
  let maxRes = 0;
  for (const [re, im] of ev) {
    let xr = Float64Array.from({ length: n }, (_, i) => ((i * 17) % 7) - 3);
    let xi = new Float64Array(n);
    for (let it = 0; it < 6; it++) {
      const sol = denseSolve(A, re, im, xr, xi);
      if (!sol || !sol.xr.every(Number.isFinite)) throw new Error('periodic solve failed at ' + re);
      xr = sol.xr; xi = sol.xi;
      let n2 = 0;
      for (let i = 0; i < n; i++) n2 += xr[i] * xr[i] + xi[i] * xi[i];
      const inv = 1 / Math.sqrt(n2 || 1);
      for (let i = 0; i < n; i++) { xr[i] *= inv; xi[i] *= inv; }
    }
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      let hr = 0, hi = 0;
      for (let j = 0; j < n; j++) { hr += A[i][j] * xr[j]; hi += A[i][j] * xi[j]; }
      num = Math.max(num, Math.hypot(hr - (re * xr[i] - im * xi[i]), hi - (re * xi[i] + im * xr[i])));
      den = Math.max(den, Math.hypot(xr[i], xi[i]));
    }
    maxRes = Math.max(maxRes, den ? num / den : Infinity);
    const row = new Float64Array(n);
    let s = 0;
    for (let j = 0; j < n; j++) { row[j] = xr[j] * xr[j] + xi[j] * xi[j]; s += row[j]; }
    for (let j = 0; j < n; j++) row[j] /= s || 1;
    rows.push(row);
  }
  return { rows, maxRes };
}

function run() {
  const source = fs.readFileSync(path.join(root, 'src/modules/skin.js'), 'utf8');
  const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
  const pieces = enginePieces();
  check(pieces.recipeV >= 8, 'RECIPE_V is ' + pieces.recipeV + ', skin legacy v8 would not apply');
  check(/8:\s*\{\s*rows:\s*'sheet',\s*solver:\s*'gram'\s*\}/.test(source), 'skin.js does not declare legacy v8 rows sheet and solver gram');
  check(/rows:\s*'modes'/.test(source), 'skin.js default rows is not modes');
  check(/solver:\s*'right'/.test(source), 'skin.js default solver is not right');

  const harness = load('skin', { capture: 'amp,W,H,skinW,ipr' });
  check(harness.sourceSha256 === sourceSha256, 'harness hashed a different skin.js');

  const counts = {};
  let maxRowDiff = 0, maxResidual = 0, minOffByOne = Infinity;
  const weightRows = [];
  for (const grid of [48, 96, 192]) {
    for (const aspect of ['1:1', '4:5', '5:4', '16:9']) {
      for (const g of grid === 96 ? [0, 0.025, 0.06, 0.08, 0.14] : [0.06]) {
        const sample = harness.compute({ grid, aspect, g, disorder: 0, bc: 'open', rows: 'modes', seed: 'skin-rows' });
        const N = grid, H = sample.H, want = modeRows(grid, aspect);
        const key = grid + ' ' + aspect;
        if (g === 0.06) counts[key] = { N, sheet: sheetRows(grid, aspect), drawn: H };
        check(sample.W === N && H === want && sample.amp.length === N * H, key + ' g=' + g + ' drew ' + sample.W + 'x' + H + ', want ' + N + 'x' + want);
        check(rowsPastN(sample.amp, N, H).length === 0, key + ' has rows past N');
        let refW = 0;
        const cut = Math.max(2, Math.floor(N * 0.9));
        for (let n = 1; n <= H; n++) {
          const ev = eigenvector(N, n, g);
          const res = relativeResidual(ev.psi, g, ev.lambda, 1);
          maxResidual = Math.max(maxResidual, res);
          check(res < 1e-9, 'mode ' + n + ' N=' + N + ' g=' + g + ' residual ' + res);
          const ref = density32(ev.psi);
          let diff = 0;
          for (let j = 0; j < N; j++) diff = Math.max(diff, Math.abs(sample.amp[(n - 1) * N + j] - ref[j]));
          maxRowDiff = Math.max(maxRowDiff, diff);
          if (n <= 3 || n === H) check(diff === 0, 'row ' + n + ' N=' + N + ' g=' + g + ' differs from the closed form by ' + diff);
          // Every mode on the default chain. On the other sizes the ends are enough.
          if (grid === 96) check(diff === 0, 'default-chain row ' + n + ' aspect ' + aspect + ' g=' + g + ' diff ' + diff);
          let right = 0;
          for (let j = cut; j < N; j++) right += ref[j];
          refW += right;
          if (g === 0.06 && n === 1) {
            const bad = density64(j => Math.sin(ev.k * j), N, g);
            const good = density64(j => Math.sin(ev.k * (j + 1)), N, g);
            minOffByOne = Math.min(minOffByOne, rowL1(good, bad));
          }
        }
        refW /= H;
        check(Math.abs(sample.skinW - refW) === 0, key + ' g=' + g + ' skin weight ' + sample.skinW + ' vs closed form ' + refW);
        if (grid === 96 && (g === 0.06 || g === 0.08) && (aspect === '1:1' || aspect === '4:5')) {
          weightRows.push({ grid, aspect, g, rows: H, skinWeight: sample.skinW, rounded3: sample.skinW.toFixed(3) });
        }
      }
    }
  }
  check(minOffByOne > 0.05, 'off-by-one sine L1 is ' + minOffByOne + ', the control did not separate');
  // Wrong hop direction. Swapping e^g and e^{-g} leaves the eigenvalues alone and moves the
  // pile-up to the other end. The ground mode's residual under the swapped operator is only
  // about 0.06; the largest mode reaches about 0.30. The gate is that maximum, plus the skin
  // weight, which falls from about 0.78 to under 0.01.
  let maxFlipped = 0;
  for (let n = 1; n <= 96; n++) {
    const ev = eigenvector(96, n, 0.08);
    maxFlipped = Math.max(maxFlipped, relativeResidual(ev.psi, 0.08, ev.lambda, -1));
  }
  const flippedPlate = harness.compute({ grid: 96, aspect: '1:1', g: -0.08, disorder: 0, bc: 'open', rows: 'modes', seed: 'skin-rows' });
  const w08 = weightRows.find(r => r.grid === 96 && r.g === 0.08 && r.aspect === '1:1').skinWeight;
  check(maxFlipped > 0.1, 'sign-flipped hop residual max is ' + maxFlipped + ', the control did not fire');
  check(flippedPlate.skinW < 0.01 && w08 > 0.5, 'sign-flipped skin weight ' + flippedPlate.skinW + ' did not separate from ' + w08);
  check(counts['96 4:5'].drawn === 96 && counts['96 1:1'].drawn === 96, 'default sheet did not draw N rows on 4:5 and 1:1');
  check(counts['96 4:5'].sheet === 120, 'expected the old 4:5 sheet to be 120 cells, got ' + counts['96 4:5'].sheet);

  // Within the N modes, |psi_n|^2 equals |psi_{N+1-n}|^2 because the sines differ by a sign.
  // That pair is the spectrum. It is not an extra row past N.
  const pairSample = harness.compute({ grid: 96, aspect: '1:1', g: 0.06, disorder: 0, bc: 'open', rows: 'modes', seed: 'skin-rows' });
  let pairs = 0;
  for (let r = 0; r < 48; r++) if (rowsEqual(pairSample.amp, 96, r, 95 - r)) pairs++;
  check(pairs === 48, 'physical mode pairs bit-exact: ' + pairs + ' of 48');

  const legacy = {};
  for (const g of [0.06, 0.08]) {
    const sample = harness.compute({ grid: 96, aspect: '4:5', g, disorder: 0, bc: 'open', rows: 'sheet', seed: 'skin-rows' });
    const past = rowsPastN(sample.amp, 96, sample.H);
    const copies = past.filter(r => r.kind === 'copy').length;
    const noise = past.filter(r => r.kind === 'pi-noise');
    legacy[String(g)] = {
      rows: sample.H,
      skinWeight: sample.skinW,
      rounded3: sample.skinW.toFixed(3),
      copies,
      piNoiseMaxAbsSin: noise.length ? noise[0].maxAbsSin : null,
    };
    check(sample.H === 120, 'legacy 4:5 g=' + g + ' drew ' + sample.H + ' rows, want 120');
    check(copies === 23 && noise.length === 1, 'legacy g=' + g + ' copies ' + copies + ' noise rows ' + noise.length);
    check(noise[0] && noise[0].maxAbsSin < 1e-12, 'legacy pi row sine is ' + (noise[0] && noise[0].maxAbsSin));
    check(past.every(r => r.kind === 'copy' || r.kind === 'pi-noise'), 'legacy row past N was neither a copy nor the pi row');
  }
  const modes08 = weightRows.find(r => r.g === 0.08 && r.aspect === '1:1');
  const modes08tall = weightRows.find(r => r.g === 0.08 && r.aspect === '4:5');
  check(modes08.rounded3 === '0.780' && modes08tall.rounded3 === '0.780' && legacy['0.08'].rounded3 === '0.773',
    'g=0.08 weights ' + modes08.rounded3 + ' / ' + modes08tall.rounded3 + ' / legacy ' + legacy['0.08'].rounded3);
  check(Math.abs(modes08.skinWeight - modes08tall.skinWeight) === 0, '4:5 and 1:1 skin weights differ at g=0.08 after the cap');
  check(legacy['0.08'].skinWeight < modes08.skinWeight - 0.005, 'legacy weight did not drop relative to the N-mode weight');

  const probe = openPlate(pieces);
  const at7 = pieces.legacyFill(probe.module, { v: 7 });
  const at6 = pieces.legacyFill(probe.module, { v: 6 });
  const at8 = pieces.legacyFill(probe.module, { v: 8 });
  check(at7 && at7.solver === 'gram' && at7.rows === 'sheet', 'recipe v7 legacy is ' + JSON.stringify(at7));
  check(at6 && at6.solver === 'gram' && at6.rows === 'sheet', 'recipe v6 legacy is ' + JSON.stringify(at6));
  check(at8 === null, 'recipe v8 should not legacy-fill, got ' + JSON.stringify(at8));

  const eigenRows = [];
  let maxOpenDiff = 0, maxOpenRes = 0, gramOpenL1 = 0, gramRingDev = 0, ringDev = 0, hermDev = 0;
  let ringDisorderDiff = 0, ringDisorderRes = 0, ringOpenDiff = 0, gramRingDisorderL1 = 0;
  for (const N of [48, 96]) {
    const g = 0.07, disorder = 1.4, seed = 'skin-disorder';
    const rng = pieces.makeRng(seed + '/hn');
    const pot = new Float64Array(N);
    for (let i = 0; i < N; i++) pot[i] = disorder * rng.gauss();
    const ref = openReference(pot, g);
    maxOpenRes = Math.max(maxOpenRes, ref.maxRes);
    probe.setState({ grid: N, aspect: '1:1', rows: 'modes', solver: 'right', g, disorder, bc: 'open', seed, view: 'modes' });
    probe.inst.regenerate();
    const got = probe.read();
    let diff = 0;
    for (let n = 0; n < N; n++) diff = Math.max(diff, floatRowDiff(got.amp, N, n, ref.rows[n]));
    maxOpenDiff = Math.max(maxOpenDiff, diff);
    check(got.H === N && diff < 1e-6, 'open disorder N=' + N + ' density diff ' + diff);
    check(ref.maxRes < 1e-8, 'open disorder N=' + N + ' Jacobi residual ' + ref.maxRes);
    eigenRows.push({ kind: 'open-disorder', N, g, disorder, seed, maxAbsDensity: diff, jacobiResidual: ref.maxRes, skinWeight: got.skinW });
  }
  {
    const N = 48, g = 0.07, disorder = 1.4, seed = 'skin-disorder';
    probe.setState({ grid: N, aspect: '1:1', rows: 'modes', solver: 'gram', g, disorder, bc: 'open', seed, view: 'modes' });
    probe.inst.regenerate();
    const gram = probe.read();
    check(/Gram–Schmidt basis is orthonormal/.test(probe.status()), 'gram status: ' + probe.status());
    probe.setState({ grid: N, aspect: '1:1', rows: 'modes', solver: 'right', g, disorder, bc: 'open', seed, view: 'modes' });
    probe.inst.regenerate();
    const right = probe.read();
    gramOpenL1 = meanBestL1(gram.amp, right.amp, N);
    check(gramOpenL1 > 0.2, 'Gram-Schmidt open mean best L1 is ' + gramOpenL1);
    check(/right eigenvectors/.test(probe.status()) && !/Gram–Schmidt/.test(probe.status()), 'right status: ' + probe.status());
  }
  for (const N of [48, 96]) {
    probe.setState({ grid: N, aspect: '1:1', rows: 'modes', solver: 'right', g: 0.08, disorder: 0, bc: 'periodic', seed: 'ring', view: 'modes' });
    probe.inst.regenerate();
    const ring = probe.read();
    let dev = 0;
    for (let i = 0; i < ring.amp.length; i++) dev = Math.max(dev, Math.abs(ring.amp[i] - 1 / N));
    ringDev = Math.max(ringDev, dev);
    const expectW = (N - Math.max(2, Math.floor(0.9 * N))) / N;
    check(dev < 1e-6, 'periodic clean N=' + N + ' departed from 1/N by ' + dev);
    check(Math.abs(ring.skinW - expectW) < 1e-6, 'periodic clean weight ' + ring.skinW + ' vs ' + expectW);
    eigenRows.push({ kind: 'periodic-clean', N, g: 0.08, maxAbsFromUniform: dev, skinWeight: ring.skinW });
  }
  {
    const N = 48;
    probe.setState({ grid: N, aspect: '1:1', rows: 'modes', solver: 'gram', g: 0.08, disorder: 0, bc: 'periodic', seed: 'ring', view: 'modes' });
    probe.inst.regenerate();
    const gram = probe.read();
    for (let i = 0; i < gram.amp.length; i++) gramRingDev = Math.max(gramRingDev, Math.abs(gram.amp[i] - 1 / N));
    check(gramRingDev > 0.05, 'Gram-Schmidt ring departed from 1/N by only ' + gramRingDev);
  }
  {
    const N = 32;
    probe.setState({ grid: N, aspect: '1:1', rows: 'modes', solver: 'right', g: 0, disorder: 0, bc: 'periodic', seed: 'herm', view: 'modes' });
    probe.inst.regenerate();
    const herm = probe.read();
    const col = new Float64Array(N);
    for (let n = 0; n < N; n++) for (let j = 0; j < N; j++) col[j] += herm.amp[n * N + j];
    for (let j = 0; j < N; j++) hermDev = Math.max(hermDev, Math.abs(col[j] - 1));
    check(hermDev < 1e-6, 'g=0 periodic resolution of the identity missed by ' + hermDev);
    eigenRows.push({ kind: 'periodic-hermitian', N, g: 0, maxAbsResolution: hermDev, skinWeight: herm.skinW });
  }
  {
    const N = 48, g = 0.07, disorder = 1.4, seed = 'skin-ring';
    const rng = pieces.makeRng(seed + '/hn');
    const pot = new Float64Array(N);
    for (let i = 0; i < N; i++) pot[i] = disorder * rng.gauss();
    const ref = krylovDensities(hatanoMatrix(pot, g, true));
    ringDisorderRes = ref.maxRes;
    probe.setState({ grid: N, aspect: '1:1', rows: 'modes', solver: 'right', g, disorder, bc: 'periodic', seed, view: 'modes' });
    probe.inst.regenerate();
    const got = probe.read();
    for (let n = 0; n < N; n++) ringDisorderDiff = Math.max(ringDisorderDiff, floatRowDiff(got.amp, N, n, ref.rows[n]));
    check(got.H === N && ringDisorderDiff < 1e-6, 'periodic disorder density diff ' + ringDisorderDiff);
    check(ringDisorderRes < 1e-8, 'periodic disorder Krylov residual ' + ringDisorderRes);
    const openRef = krylovDensities(hatanoMatrix(pot, g, false));
    for (let n = 0; n < N; n++) ringOpenDiff = Math.max(ringOpenDiff, floatRowDiff(got.amp, N, n, openRef.rows[n]));
    check(ringOpenDiff > 0.2, 'open ends on the ring potential differed by only ' + ringOpenDiff);
    probe.setState({ grid: N, aspect: '1:1', rows: 'modes', solver: 'gram', g, disorder, bc: 'periodic', seed, view: 'modes' });
    probe.inst.regenerate();
    gramRingDisorderL1 = meanBestL1(probe.read().amp, got.amp, N);
    check(gramRingDisorderL1 > 0.2, 'Gram-Schmidt ring disorder L1 is ' + gramRingDisorderL1);
    eigenRows.push({
      kind: 'periodic-disorder', N, g, disorder, seed,
      maxAbsDensity: ringDisorderDiff, krylovResidual: ringDisorderRes,
      openBoundaryMaxAbs: ringOpenDiff, gramMeanBestL1: gramRingDisorderL1, skinWeight: got.skinW,
    });
  }

  const plate = openPlate(pieces);
  plate.setState({
    grid: 96, aspect: '1:1', rows: 'modes', g: 0.06, disorder: 0, bc: 'open',
    view: 'log', exposure: 1.1, gamma: 0.55, seed: 'skin-row-check',
    palette: EMBER, bg: EMBER_BG,
  });
  plate.inst.regenerate();
  const drawn = plate.read();
  const cells = plate.inst.fieldCells();
  check(drawn.W === 96 && drawn.H === 96 && cells && cells[0] === 96 && cells[1] === 96, '1:1 fieldCells ' + JSON.stringify(cells));
  check(!/before v7/.test(plate.status()), 'modes status mentions the legacy row count: ' + plate.status());
  check(/modes <b>96<\/b>/.test(plate.status()), 'modes status does not name 96 modes: ' + plate.status());

  const ramp = independentRamp(EMBER, EMBER_BG);
  const engineRamp = pieces.makeRamp(EMBER, EMBER_BG);
  let rampDiff = 0;
  for (let i = 0; i <= 1000; i++) {
    const a = ramp(i / 1000), b = engineRamp(i / 1000);
    for (let c = 0; c < 3; c++) rampDiff = Math.max(rampDiff, Math.abs(a[c] - b[c]));
  }
  check(rampDiff < 1e-9, 'independent ramp differs from the engine ramp by ' + rampDiff);

  const painted = paintLog(drawn.amp, drawn.W, drawn.H, 1.1, 0.55, ramp);
  const same = plate.inst.exportPNG(drawn.W, drawn.H);
  const twice = plate.inst.exportPNG(drawn.W * 2, drawn.H * 2);
  return Promise.all([same, twice]).then(([sameBlob, twiceBlob]) => {
    const after = plate.read();
    let stateSame = after.W === drawn.W && after.H === drawn.H && after.skinW === drawn.skinW && after.amp.length === drawn.amp.length;
    if (stateSame) for (let i = 0; i < drawn.amp.length; i++) if (after.amp[i] !== drawn.amp[i]) stateSame = false;
    const sameDelta = channelDelta(sameBlob.data, painted);
    check(sameBlob.width === 96 && sameBlob.height === 96 && sameDelta.channels === 0, '1:1 export delta ' + JSON.stringify(sameDelta));
    let blocks = 0;
    for (let y = 0; y < drawn.H; y++) for (let x = 0; x < drawn.W; x++) {
      const o = (y * drawn.W + x) * 4;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const p = ((2 * y + dy) * drawn.W * 2 + (2 * x + dx)) * 4;
        for (let c = 0; c < 4; c++) if (twiceBlob.data[p + c] !== painted[o + c]) blocks++;
      }
    }
    check(twiceBlob.width === 192 && twiceBlob.height === 192 && blocks === 0, '2x nearest export mismatches ' + blocks);
    check(stateSame, 'exportPNG changed the amplitude or the skin weight');
    const shifted = channelDelta(shiftX(painted, drawn.W, drawn.H), painted);
    const wrongGamma = channelDelta(paintLog(drawn.amp, drawn.W, drawn.H, 1.1, 1, ramp), painted);
    check(shifted.channels > 1000, 'one-cell shift changed only ' + shifted.channels + ' channels');
    check(wrongGamma.channels > 1000, 'wrong gamma changed only ' + wrongGamma.channels + ' channels');

    plate.setState({
      grid: 96, aspect: '4:5', rows: 'sheet', g: 0.08, disorder: 0, bc: 'open',
      view: 'log', exposure: 1.1, gamma: 0.55, seed: 'skin-row-check',
      palette: EMBER, bg: EMBER_BG,
    });
    plate.inst.regenerate();
    const old = plate.read();
    const oldCells = plate.inst.fieldCells();
    check(old.H === 120 && oldCells[1] === 120, 'legacy regenerate drew ' + old.H);
    check(/before v8/.test(plate.status()) && /sheet rows <b>120<\/b>/.test(plate.status()),
      'legacy status does not say so: ' + plate.status());

    plate.setState({
      grid: 48, aspect: '4:5', rows: 'modes', g: 0.07, disorder: 1.4, bc: 'open',
      view: 'modes', seed: 'skin-disorder',
    });
    plate.inst.regenerate();
    const dirty = plate.read();
    check(dirty.W === 48 && dirty.H === 48, 'disordered 4:5 drew ' + dirty.W + 'x' + dirty.H + ', want 48x48');
    let finite = true, normBad = 0;
    for (let n = 0; n < dirty.H; n++) {
      let s = 0;
      for (let j = 0; j < dirty.W; j++) {
        const a = dirty.amp[n * dirty.W + j];
        if (!Number.isFinite(a)) finite = false;
        s += a;
      }
      if (Math.abs(s - 1) > 1e-5) normBad++;
    }
    check(finite && normBad === 0, 'disordered rows not finite or not normalized (' + normBad + ')');
    check(rowsPastN(dirty.amp, dirty.W, dirty.H).length === 0, 'disordered plate has rows past N');

    const modes06 = weightRows.find(r => r.g === 0.06 && r.aspect === '1:1');
    const result = {
      date: new Date().toISOString().slice(0, 10),
      command: 'node tools/skin-rows.js --write',
      sourceSha256,
      recipeVersion: pieces.recipeV,
      domain: {
        parameters: 'Open chain, disorder 0, rows modes, g in {0, 0.025, 0.06, 0.08, 0.14} at N=96 and g=0.06 at N=48 and 192, aspects 1:1, 4:5, 5:4 and 16:9. Open disorder at N=48 and 96, g=0.07, W=1.4, seed skin-disorder. Clean periodic chain at g=0.08, N=48 and 96. Periodic disorder at N=48, g=0.07, W=1.4, seed skin-ring. g=0 periodic at N=32 resolves the identity. Legacy rows sheet and solver gram are the failure controls.',
        conditions: 'Open ends. Right eigenvectors e^{g j} sin(pi n (j+1)/(N+1)), n=1..drawn rows, of (H psi)_i = e^g psi_{i-1} + e^{-g} psi_{i+1}. Skin weight is the mean, over the drawn rows, of the probability on sites j >= floor(0.9 N).',
        resolution: 'N = 48, 96, 192. Drawn rows = min(max(32, round(N * aspect)), N) for rows modes.',
        precision: 'Binary64 closed form. The module stores each row as float32 after the same square-then-normalize order. RGBA8 for the node print fixture.',
      },
      rowCounts: counts,
      maxAbsRowDiff: maxRowDiff,
      maxRelativeResidual: maxResidual,
      signFlippedHopResidual: maxFlipped,
      signFlippedSkinWeight: flippedPlate.skinW,
      offByOneSineL1: minOffByOne,
      physicalPairsBitExact: pairs,
      weights: weightRows,
      legacy4x5: legacy,
      printFixture: {
        domain: '1:1, N=96, g=0.06, disorder 0, open, rows modes, log view, exposure 1.1, gamma 0.55, ember palette',
        sameSizeChannels: sameDelta.channels,
        twiceSizeMismatches: blocks,
        stateUnchanged: stateSame,
        rampDiff: rampDiff,
        shiftChannels: shifted.channels,
        wrongGammaChannels: wrongGamma.channels,
        note: 'Node canvas mock of the module paint and exportPNG. Not the browser shell and not tools/export.js.',
      },
      disorderedRowCap: { grid: dirty.W, rows: dirty.H, aspect: '4:5' },
      rightEigenvectors: {
        maxOpenDensityDiff: maxOpenDiff,
        maxJacobiResidual: maxOpenRes,
        gramOpenMeanBestL1: gramOpenL1,
        periodicCleanMaxAbsFromUniform: ringDev,
        gramPeriodicMaxAbsFromUniform: gramRingDev,
        periodicHermitianResolution: hermDev,
        periodicDisorderMaxAbs: ringDisorderDiff,
        periodicDisorderResidual: ringDisorderRes,
        periodicDisorderOpenBoundaryMaxAbs: ringOpenDiff,
        gramPeriodicDisorderMeanBestL1: gramRingDisorderL1,
        rows: eigenRows,
      },
      pass: failures.length === 0,
      failures,
    };
    if (WRITE && result.pass) {
      const out = path.join(root, 'validation/results/skin-rows.json');
      fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
    }
    console.log(JSON.stringify({
      pass: result.pass,
      rows4x5: counts['96 4:5'],
      rows1x1: counts['96 1:1'],
      weightG006: { modes: modes06.skinWeight, legacy: legacy['0.06'].skinWeight },
      weightG008: { modes: modes08.skinWeight, legacy: legacy['0.08'].skinWeight, rounded: { modes: modes08.rounded3, legacy: legacy['0.08'].rounded3 } },
      maxResidual, maxRowDiff, copies: legacy['0.08'].copies, piNoise: legacy['0.08'].piNoiseMaxAbsSin,
      rightEigenvectors: { maxOpenDiff, maxOpenRes, gramOpenL1, ringDev, gramRingDev, hermDev, ringDisorderDiff, ringDisorderRes, ringOpenDiff, gramRingDisorderL1 },
      print: result.printFixture,
      failures,
    }, null, 2));
    if (!result.pass) process.exitCode = 1;
  });
}

run().catch(err => { console.error(err); process.exitCode = 1; });
