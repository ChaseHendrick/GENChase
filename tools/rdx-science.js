// Independent benchmarks for the five multi-species reaction-diffusion tabs in src/modules/rdx.js:
// excitable, turing, cyclic, chemotaxis and vegetation.
// node tools/rdx-science.js [--write]
//
// The maintained step shaders run unmodified in Chromium through WebGL2 (SwiftShader when headless).
// The harness evaluates the module source with Studio.register captured, so the shader text, the
// uniform mapping (spec.stepUniforms) and the time-step ceilings (spec.dtMax) are the ones the studio
// uses. Every reference value is computed here in Float64 from the model equations: exact solutions,
// linear dispersion relations of the continuum and of the semi-discrete lattice, conserved quantities
// and an independently written discrete update. Nothing is read back from the shader to build a reference.
// Each failure control edits the shader text in the page (never the file) and must fail its criterion.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const SOURCE_PATH = 'src/modules/rdx.js', OUT = 'validation/results/rdx-science.json';
const source = fs.readFileSync(path.join(root, SOURCE_PATH), 'utf8');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const TAU = 2 * Math.PI;

// ---------- small numerics ----------
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
  div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
  sqrt: a => { const r = Math.hypot(a[0], a[1]), re = Math.sqrt((r + a[0]) / 2), im = Math.sign(a[1] || 1) * Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, im]; },
  abs: a => Math.hypot(a[0], a[1]), re: x => [x, 0],
};
// Eigenpairs of a complex 2x2 matrix [[a,b],[c,d]], the one with the larger real part first.
function eig2(a, b, c, d) {
  const tr = C.add(a, d), det = C.sub(C.mul(a, d), C.mul(b, c));
  const disc = C.sqrt(C.sub(C.mul(tr, tr), C.mul(C.re(4), det)));
  const l1 = C.mul(C.re(0.5), C.add(tr, disc)), l2 = C.mul(C.re(0.5), C.sub(tr, disc));
  const top = l1[0] >= l2[0] ? l1 : l2, other = top === l1 ? l2 : l1;
  // eigenvector (b, lambda - a), or (lambda - d, c) when b vanishes
  let vec = C.abs(b) > 1e-14 ? [b, C.sub(top, a)] : [C.sub(top, d), c];
  const n = Math.hypot(C.abs(vec[0]), C.abs(vec[1])); vec = vec.map(z => [z[0] / n, z[1] / n]);
  return { lambda: top, other, vec };
}
// Lattice symbols of the two Laplacians for a Fourier mode with phase advances (al, be) per cell,
// derived from the stencil weights: 5-point {1,1,1,1,-4}; Mehrstellen 9-point {4 axis, 1 corner, -20}/6.
const q5 = (al, be, h) => (2 * Math.cos(al) + 2 * Math.cos(be) - 4) / (h * h);
const q9 = (al, be, h) => (8 * Math.cos(al) + 8 * Math.cos(be) + 4 * Math.cos(al) * Math.cos(be) - 20) / (6 * h * h);
const qLat = (nine, al, be, h) => (nine ? q9 : q5)(al, be, h);
// Complex amplitude of channel ch about `base` in mode (mx, my): (2/N) sum (f - base) exp(-i k.x).
function modeAmp(f, W, H, ch, mx, my, base = 0) {
  let re = 0, im = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ph = TAU * (mx * x / W + my * y / H), v = f[(y * W + x) * 4 + ch] - base;
    re += v * Math.cos(ph); im -= v * Math.sin(ph);
  }
  return [2 * re / (W * H), 2 * im / (W * H)];
}
function field(W, H, fn) {
  const d = new Float32Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = fn(x, y), i = (y * W + x) * 4; d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2] || 0; d[i + 3] = 1; }
  return d;
}
// Least-squares slope of y against t.
function slope(t, y) { const n = t.length, mt = t.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (t[i] - mt) * (y[i] - my); sxx += (t[i] - mt) ** 2; } return sxy / sxx; }
// Unwrapped phase increments.
function unwrap(ph) { const out = [ph[0]]; for (let i = 1; i < ph.length; i++) { let d = ph[i] - ph[i - 1]; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; out.push(out[i - 1] + d); } return out; }
const orders = errs => errs.slice(1).map((e, i) => Math.log2(errs[i] / e));
// Richardson self-convergence from three grids halving h: the order from successive differences, where any
// level-independent offset (nonlinear feedback, rounding bias) cancels, and the extrapolated h -> 0 value.
function richardson(v) { const d1 = v[0] - v[1], d2 = v[1] - v[2], p = Math.log2(d1 / d2); return { order: p, extrapolated: v[2] - d2 / (2 ** p - 1) }; }

// ---------- independent Float64 discrete updates (written from the model equations and the scheme
// the module documents: forward Euler, linear loss terms implicit where the comments say so,
// periodic 5- or 9-point Laplacian scaled by c^2, conservative face fluxes, upwind water advection) ----------
function refStep(id, s, f, W, H, dt, c, nine) {
  const out = new Float64Array(f.length), c2 = c * c;
  const at = (x, y, ch) => f[((((y % H) + H) % H) * W + (((x % W) + W) % W)) * 4 + ch];
  const lap = (x, y, ch) => {
    const axis = at(x + 1, y, ch) + at(x - 1, y, ch) + at(x, y + 1, ch) + at(x, y - 1, ch), cc = at(x, y, ch);
    if (!nine) return (axis - 4 * cc) * c2;
    const corner = at(x + 1, y + 1, ch) + at(x - 1, y + 1, ch) + at(x + 1, y - 1, ch) + at(x - 1, y - 1, ch);
    return (4 * axis + corner - 20 * cc) / 6 * c2;
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, u = f[i], v = f[i + 1], w = f[i + 2];
    const Lu = lap(x, y, 0), Lv = lap(x, y, 1), Lw = lap(x, y, 2);
    let nu = u, nv = v, nw = 0;
    if (id === 'excitable' && s.model !== 'fhn') {
      nu = clamp(u + dt * (Lu + u * (1 - u) * (u - (v + s.b) / s.a) / s.eps), 0, 1);
      nv = clamp(v + dt * (s.D * Lv + u - v), 0, 2);
    } else if (id === 'excitable') {
      nu = clamp(u + dt * (Lu + u - u ** 3 - v), -3, 3);
      nv = clamp(v + dt * (s.fD * Lv + s.feps * (u - s.fa * v - s.fb)), -3, 3);
    } else if (id === 'turing') {
      const m = s.tmodel;
      if (m === 'schnak') { nu = (u + dt * (Lu + s.sa + u * u * v)) / (1 + dt); nv = (v + dt * (s.D * Lv + s.sb)) / (1 + dt * u * u); }
      else if (m === 'bruss') { nu = (u + dt * (Lu + s.ba + u * u * v)) / (1 + dt * (s.bb + 1)); nv = (v + dt * (s.D * Lv + s.bb * u)) / (1 + dt * u * u); }
      else if (m === 'gm') { const vv = Math.max(v, 1e-3); nu = (u + dt * (Lu + s.ga + u * u / (vv * (1 + s.gK * u * u)))) / (1 + dt * s.gb); nv = (v + dt * (s.D * Lv + u * u)) / (1 + dt * s.gc); }
      else { const h = 1 / (1 + u * u); nu = (u + dt * (Lu + s.la)) / (1 + dt * (1 + 4 * v * h)); nv = (v + dt * s.lsig * (s.D * Lv + s.lb * u)) / (1 + dt * s.lsig * s.lb * u * h); }
      nu = clamp(nu, 0, 40); nv = clamp(nv, 0, 40);
    } else if (id === 'cyclic') {
      nu = clamp(u + dt * (s.D * Lu + u * (1 - u - s.a * v - s.b * w)), 0, 2);
      nv = clamp(v + dt * (s.D * Lv + v * (1 - v - s.a * w - s.b * u)), 0, 2);
      nw = clamp(w + dt * (s.D * Lw + w * (1 - w - s.a * u - s.b * v)), 0, 2);
    } else if (id === 'chemotaxis') {
      const chi = q => s.chi * q / (1 + q * q);
      const flux = (dx, dy) => chi(0.5 * (u + at(x + dx, y + dy, 0))) * (at(x + dx, y + dy, 1) - v);
      const div = (flux(1, 0) + flux(-1, 0) + flux(0, 1) + flux(0, -1)) * c2; // sum of outward face fluxes
      nu = clamp(u + dt * (Lu - div + u * (1 - u)), 0, 60);
      nv = clamp(v + dt * (s.D * Lv + u - s.a * v), 0, 200);
    } else if (id === 'vegetation') {
      const a = s.a * (1 + s.agrad * (2 * (y + 0.5) / H - 1)), wx = (at(x + 1, y, 0) - u) * c;
      nu = clamp((u + dt * (a + s.slope * wx + s.Dw * Lu)) / (1 + dt * (1 + v * v)), 0, 40);
      nv = clamp((v + dt * (u * v * v + s.Dn * Lv)) / (1 + dt * s.m), 0, 40);
    }
    out[i] = nu; out[i + 1] = nv; out[i + 2] = nw; out[i + 3] = 1;
  }
  return out;
}

// ---------- analytic references ----------
// Real roots of u^3 - u + v0 = 0 (three when |v0| < 2/(3 sqrt 3)), ascending, trigonometric form.
function cubicRoots(v0) {
  const r = 2 / Math.sqrt(3), th = Math.acos(-1.5 * Math.sqrt(3) * v0) / 3;
  return [0, 1, 2].map(k => r * Math.cos(th - TAU * k / 3)).sort((a, b) => a - b);
}
// Turing kinetics: rest state and Jacobian, derived by hand from the stated equations.
function turLinear(s) {
  const m = s.tmodel;
  if (m === 'schnak') { const a = s.sa, b = s.sb, u = a + b, v = b / (u * u); return { u, v, J: [-1 + 2 * u * v, u * u, -2 * u * v, -u * u], Du: 1, Dv: s.D }; }
  if (m === 'bruss') { const a = s.ba, b = s.bb, u = a, v = b / a; return { u, v, J: [-(b + 1) + 2 * u * v, u * u, b - 2 * u * v, -u * u], Du: 1, Dv: s.D }; }
  if (m === 'gm') {
    const a = s.ga, b = s.gb, c = s.gc, K = s.gK;
    let lo = 1e-9, hi = 1e3; // a + c/(1+K u^2) - b u is strictly decreasing in u > 0
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (a + c / (1 + K * mid * mid) - b * mid > 0) lo = mid; else hi = mid; }
    const u = (lo + hi) / 2, v = u * u / c, q = 1 + K * u * u;
    return { u, v, J: [2 * u / (v * q * q) - b, -u * u / (v * v * q), 2 * u, -c], Du: 1, Dv: s.D };
  }
  const a = s.la, b = s.lb, sig = s.lsig, u = a / 5, v = 1 + u * u, p = 1 + u * u;
  return { u, v, J: [-1 - 4 * v * (1 - u * u) / (p * p), -4 * u / p, sig * b * (1 - v * (1 - u * u) / (p * p)), -sig * b * u / p], Du: 1, Dv: sig * s.D };
}
// Largest growth rate of a 2-species linearization at symbol q (q = -k^2 in the continuum).
function growth(lin, q, adv = [0, 0]) {
  const [a, b, c, d] = lin.J;
  return eig2(C.add([a + lin.Du * q, 0], adv), C.re(b), C.re(c), C.re(d + lin.Dv * q));
}
function argmaxK(fn, k0, k1) { let best = k0, bv = -Infinity; for (let i = 0; i <= 4000; i++) { const k = k0 + (k1 - k0) * i / 4000, g = fn(k); if (g > bv) { bv = g; best = k; } } return best; }

// ---------- report bookkeeping ----------
const checks = [], controls = [];
function check(technique, name, value, tolerance, pass, extra) {
  checks.push(Object.assign({ technique, name, value, tolerance, pass: !!pass }, extra || {}));
  process.stderr.write((pass ? 'pass ' : 'FAIL ') + technique + ': ' + name + '\n');
  return !!pass;
}
function control(technique, name, mutant, value, tolerance, detected, extra) {
  controls.push(Object.assign({ technique, name, mutant, value, tolerance, detected: !!detected }, extra || {}));
  process.stderr.write((detected ? 'detected ' : 'MISSED ') + technique + ' control: ' + name + '\n');
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { schema: 1, date: new Date().toISOString().slice(0, 10), source: { path: SOURCE_PATH, sha256: sha(source) }, harness: { path: 'tools/rdx-science.js', sha256: sha(fs.readFileSync(__filename)) } };
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/rdx-science');
    // Capture the registered specs. The only edits are to route Studio.register into a table and to
    // record the spec object each tab hands to rdxCreate; no shader or numerical code is touched.
    const instrumented = source.replace(/Studio\.register\(/g, 'window.__rdxReg(').replace('function rdxCreate(spec) {', 'function rdxCreate(spec) { window.__rdxSpec[spec.id] = spec;');
    if (instrumented.split('window.__rdxReg(').length !== 6 || !instrumented.includes('window.__rdxSpec[spec.id]')) throw Error('Unexpected rdx.js layout; update the harness capture');
    // rdxCreate(spec) runs while each definition object is built, so the specs are captured without
    // ever calling create().
    await page.evaluate(src => {
      window.__rdxSpec = {}; window.__rdxDefs = {};
      window.__rdxReg = def => { window.__rdxDefs[def.id] = def; };
      (0, eval)(src);
    }, instrumented);
    const nSpecs = await page.evaluate(() => Object.keys(window.__rdxSpec).sort().join(','));
    if (nSpecs !== 'chemotaxis,cyclic,excitable,turing,vegetation') throw Error('Captured specs: ' + nSpecs);
    report.backend = await browser.version();
    report.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });

    await page.evaluate(() => {
      const G = Studio.gl, gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Float32 render targets are required for this benchmark');
      const passes = new Map();
      window.rdxDefaults = id => JSON.parse(JSON.stringify(window.__rdxDefs[id].defaults));
      window.rdxDtMax = (id, s) => window.__rdxSpec[id].dtMax(s);
      // Run the tab's own step shader, with the uniforms its own rdxCreate step() would bind.
      window.rdxRun = ({ id, s, W, H, init, dt, steps, snaps, mutants }) => {
        const spec = window.__rdxSpec[id];
        let fs = spec.stepFS;
        for (const [from, to] of mutants || []) { if (!fs.includes(from)) throw Error('Mutant anchor not found: ' + from); fs = fs.split(from).join(to); }
        if (!passes.has(fs)) passes.set(fs, new G.Pass(gl, fs));
        const pass = passes.get(fs), opts = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
        let a = new G.Target(gl, W, H, Object.assign({ data: new Float32Array(init) }, opts)), b = new G.Target(gl, W, H, opts);
        const c = Number(s.scale) || 1;
        const uni = Object.assign({ u_res: [W, H], u_dt: dt, u_c: c, u_c2: c * c, u_noise: 0, u_nOff: 0, u_lap9: { int: Number(s.lap) === 9 ? 1 : 0 } }, spec.stepUniforms(s));
        const want = new Set(snaps || [steps]), out = [], px = new Float32Array(W * H * 4);
        const grab = n => { gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo); gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); if (gl.getError() !== gl.NO_ERROR) throw Error('readback failed'); out.push({ step: n, f: Array.from(px) }); };
        if (want.has(0)) grab(0);
        for (let i = 0; i < steps; i++) {
          uni.u_s = a; uni.u_step = i * 1.17;
          pass.draw(b, uni); [a, b] = [b, a];
          if (want.has(i + 1)) grab(i + 1);
        }
        a.dispose(); b.dispose();
        return out;
      };
    });
    const defaults = id => page.evaluate(id => window.rdxDefaults(id), id);
    const dtMax = (id, s) => page.evaluate(([id, s]) => window.rdxDtMax(id, s), [id, s]);
    const run = arg => page.evaluate(a => window.rdxRun(a), Object.assign({}, arg, { init: Array.from(arg.init) }));
    const t0 = Date.now(), only = (process.env.RDX_ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);

    // ---- linear-mode harness shared by the Turing, chemotaxis and vegetation growth tests ----
    // One Fourier mode (one wavelength across W cells, uniform in y) is laid along the dominant eigenvector
    // of the one-step linear map of the scheme, A = I + dt diag(1/(1 + dt Q_r)) M, where M = J + diag(Du q, Dv q)
    // (+ advection symbol) and Q_r is the loss coefficient each row takes implicitly (Q = 0 for explicit rows).
    // A is derived from the model equations and the documented scheme, not from the shader. Three rates:
    //   discrete  ln(mu)/dt, mu the eigenvalue of A (what the GPU must reproduce at this dt),
    //   lattice   the eigenvalue of M (the dt -> 0 limit on this grid),
    //   continuum the eigenvalue with q = -k^2 and advection ik (the h -> 0 limit).
    // Perturbation 1e-2 of the base state: the O(delta^2) nonlinear feedback on the mode is ~1e-4 relative,
    // and the per-step increment stays far above float32 rounding of the base value (see eps and roundBound).
    const linearMode = async ({ id, s, W, lin, Q, advLat = [0, 0], dt, T, ch: chIn, mutants, epsRel = 1e-2 }) => {
      const h = 1 / s.scale, al = TAU / W, q = qLat(Number(s.lap) === 9, al, 0, h);
      // lin.chi1: chemotactic cross-diffusion, -chi(u0) lap v in the u row
      const [a, b, c, d] = lin.J, M = [C.add([a + lin.Du * q, 0], advLat), C.re(b - (lin.chi1 || 0) * q), C.re(c), C.re(d + lin.Dv * q)];
      const r0 = dt / (1 + dt * Q[0]), r1 = dt / (1 + dt * Q[1]);
      const A = eig2(C.add([1, 0], C.mul(C.re(r0), M[0])), C.mul(C.re(r0), M[1]), C.mul(C.re(r1), M[2]), C.add([1, 0], C.mul(C.re(r1), M[3])));
      const mu = A.lambda, disc = [Math.log(C.abs(mu)) / dt, Math.atan2(mu[1], mu[0]) / dt], lat = eig2(...M).lambda;
      // each component's relative amplitude is at most epsRel; the mode is read on the channel where it is largest
      const base = [lin.u, lin.v], relAmp = [0, 1].map(r => C.abs(A.vec[r]) / Math.abs(base[r])), eps = epsRel / Math.max(...relAmp);
      const ch = chIn == null ? (relAmp[0] >= relAmp[1] ? 0 : 1) : chIn;
      const init = field(W, 2, x => { const ph = al * x; return [0, 1].map(r => base[r] + eps * (A.vec[r][0] * Math.cos(ph) - A.vec[r][1] * Math.sin(ph))); });
      const steps = Math.max(8, Math.round(T / dt)), ts = [0.25, 0.5, 0.75, 1].map(f => Math.round(f * steps));
      const ceiling = await dtMax(id, s);
      if (dt > ceiling * (1 + 1e-12)) throw Error(id + ' linear fixture exceeds the module ceiling: ' + dt + ' > ' + ceiling);
      const out = await run({ id, s, W, H: 2, init, dt, steps, snaps: ts, mutants });
      const z = out.map(o => modeAmp(o.f, W, 2, ch, 1, 0, base[ch])), tt = ts.map(n => n * dt);
      const sigma = slope(tt, z.map(v => Math.log(C.abs(v)))), omega = slope(tt, unwrap(z.map(v => Math.atan2(v[1], v[0]))));
      // worst-case coherent float32 rounding of the update u + dt f, as a bound on the rate: ulp(base)/2 / (dt |mode|)
      const modeMin = eps * C.abs(A.vec[ch]) * Math.exp(Math.min(0, disc[0]) * T);
      return { dt, steps, sigma, omega, discrete: disc, lattice: lat, errDiscrete: Math.hypot(sigma - disc[0], omega - disc[1]), roundBound: 6e-8 * Math.abs(base[ch]) / (dt * modeMin), ceiling };
    };

    // ================= Shared: independent discrete update, all five tabs, both stencils =================
    // Tolerance 2e-5 absolute over 10 steps: float32 unit roundoff 6e-8, ~30 roundings per cell per step,
    // and field magnitudes of order 1 give ~2e-5 as a worst-case bound on accumulated rounding.
    const stencilCases = [
      ['excitable', { model: 'barkley', a: 0.75, b: 0.01, eps: 0.02, D: 0.5, scale: 2.5 }, (x, y) => [0.5 + 0.4 * Math.sin(TAU * (x / 16 + y / 12)), 0.25 + 0.2 * Math.cos(TAU * (2 * x / 16 - y / 12))], 0.004],
      ['excitable', { model: 'fhn', fa: 0.5, fb: -0.7, feps: 0.1, fD: 0.5, scale: 2.5 }, (x, y) => [0.8 * Math.sin(TAU * (x / 16 + y / 12)), 0.3 * Math.cos(TAU * (2 * x / 16 - y / 12))], 0.004],
      ['turing', { tmodel: 'schnak', D: 20, sa: 0.1, sb: 0.9, scale: 1 }, (x, y) => [1 + 0.3 * Math.sin(TAU * (x / 16 + y / 12)), 0.9 + 0.2 * Math.cos(TAU * (2 * x / 16 - y / 12))], 0.004],
      ['turing', { tmodel: 'bruss', D: 8, ba: 4.5, bb: 9, scale: 1 }, (x, y) => [4.5 + Math.sin(TAU * (x / 16 + y / 12)), 2 + 0.5 * Math.cos(TAU * (2 * x / 16 - y / 12))], 0.004],
      ['turing', { tmodel: 'gm', D: 40, ga: 0.02, gb: 1, gc: 1.5, gK: 0.2, scale: 0.8 }, (x, y) => [1.5 + 0.5 * Math.sin(TAU * (x / 16 + y / 12)), 1 + 0.4 * Math.cos(TAU * (2 * x / 16 - y / 12))], 0.004],
      ['turing', { tmodel: 'le', D: 1.5, la: 10, lb: 0.2, lsig: 20, scale: 1.1 }, (x, y) => [2 + 0.5 * Math.sin(TAU * (x / 16 + y / 12)), 5 + Math.cos(TAU * (2 * x / 16 - y / 12))], 0.004],
      ['cyclic', { a: 0.6, b: 1.6, D: 0.1, scale: 2 }, (x, y) => [0.3 + 0.2 * Math.sin(TAU * (x / 16 + y / 12)), 0.3 + 0.2 * Math.cos(TAU * (2 * x / 16 - y / 12)), 0.3 + 0.2 * Math.sin(TAU * (3 * x / 16 + 2 * y / 12))], 0.05],
      ['chemotaxis', { chi: 3.5, a: 0.2, D: 0.2, scale: 2.2 }, (x, y) => [1 + 0.6 * Math.sin(TAU * (x / 16 + y / 12)), 5 + 2 * Math.cos(TAU * (2 * x / 16 - y / 12))], 0.01],
      ['vegetation', { a: 1.1, agrad: 0.6, m: 0.45, slope: 40, Dw: 1, Dn: 1, scale: 1 }, (x, y) => [0.4 + 0.2 * Math.sin(TAU * (x / 16 + y / 12)), 1.2 + 0.6 * Math.cos(TAU * (2 * x / 16 - y / 12))], 0.01],
    ];
    const stencilRows = [];
    if (want('stencil')) for (const [id, p, fn, dt] of stencilCases) for (const lap of [5, 9]) {
      const s = Object.assign(await defaults(id), p, { lap }), W = 16, H = 12, steps = 10, init = field(W, H, fn);
      const ceiling = await dtMax(id, s);
      if (dt > ceiling) throw Error(id + ' stencil fixture exceeds the module ceiling');
      const got = (await run({ id, s, W, H, init, dt, steps }))[0].f;
      let ref = Float64Array.from(init);
      for (let n = 0; n < steps; n++) ref = refStep(id, s, ref, W, H, dt, s.scale, lap === 9);
      let err = 0; for (let i = 0; i < got.length; i++) if (i % 4 !== 3) err = Math.max(err, Math.abs(got[i] - ref[i]));
      const label = id + (s.tmodel ? '/' + s.tmodel : s.model ? '/' + s.model : '') + ' ' + lap + '-point';
      stencilRows.push({ id, case: label, dt, steps, maxAbsError: err });
      check(id, 'independent Float64 update, ' + label, err, 2e-5, err < 2e-5);
    }
    // controls for the discrete update: a sign flip in each tab's reaction
    const signMutants = {
      excitable: [0, ['(v + u_b) / u_a', '(v - u_b) / u_a']], turing: [2, ['(L.r + a + u * u * v)) / (1.0 + u_dt);', '(L.r + a - u * u * v)) / (1.0 + u_dt);']],
      cyclic: [6, ['u * (1.0 - u - u_a * v - u_b * x)', 'u * (1.0 - u + u_a * v - u_b * x)']], chemotaxis: [7, ['float fu = L.r - divF', 'float fu = L.r + divF']],
      vegetation: [8, ['wa * pl * pl + u_Dn', '-wa * pl * pl + u_Dn']],
    };
    if (want('stencil')) for (const [id, [k, mut]] of Object.entries(signMutants)) {
      const [, p, fn, dt] = stencilCases[k], s = Object.assign(await defaults(id), p, { lap: 5 }), W = 16, H = 12, init = field(W, H, fn);
      const got = (await run({ id, s, W, H, init, dt, steps: 10, mutants: [mut] }))[0].f;
      let ref = Float64Array.from(init); for (let n = 0; n < 10; n++) ref = refStep(id, s, ref, W, H, dt, s.scale, false);
      let err = 0; for (let i = 0; i < got.length; i++) if (i % 4 !== 3) err = Math.max(err, Math.abs(got[i] - ref[i]));
      control(id, 'reaction sign flip against the independent update', mut, err, 2e-5, err >= 2e-5);
    }
    report.stencil = stencilRows;

    // ================= Shared: pure-diffusion Fourier mode, exact discrete and continuum =================
    // The profile A (1.2 + cos k.x) keeps every species non-negative (the shaders clamp at 0) and near 0,
    // where float32 is relatively precise; the uniform part evolves separately because the equations are linear.
    // Parameters that switch each tab's reaction off (or make it exactly linear) leave
    //   d(phi)/dt = D lap(phi) - alpha phi + (advection),
    // whose discrete solution is phi_k(n) = phi_k(0) G^n with G fixed by the stencil symbol, and whose
    // continuum solution is phi_k(0) exp((-alpha - D k^2) T). Oblique 2D mode (1, 2) on an L x L torus.
    // Exact-discrete tolerance: relative 2e-5 (float32 rounding over <= 4000 steps of a linear recurrence,
    // measured in a projection over N^2 cells). Continuum: observed order of accuracy within 0.25 of the
    // formal order 2 (forward Euler at dt proportional to h^2 plus an O(h^2) stencil). A wrong coefficient
    // makes the error plateau at the coefficient error, which drives the observed order towards zero.
    const diffusion = [];
    const diffusionCases = [
      { id: 'excitable', label: 'FHN recovery v, eps = 0', p: { model: 'fhn', feps: 0, fD: 1.5, fa: 0.5, fb: -0.7 }, ch: 1, rest: () => [0, 0], D: 1.5, alpha: 0, implicit: 0, diffKey: ['fv = u_D * L.g', 'fv = 1.05 * u_D * L.g'] },
      { id: 'excitable', label: 'Barkley recovery v at u = 0', p: { model: 'barkley', D: 0.8, a: 0.75, b: 0.01, eps: 0.02 }, ch: 1, rest: () => [0, 1], D: 0.8, alpha: 1, implicit: 0, diffKey: ['fv = u_D * L.g + u - v', 'fv = 1.05 * u_D * L.g + u - v'] },
      { id: 'turing', label: 'Schnakenberg inhibitor, a = b = u = 0', p: { tmodel: 'schnak', sa: 0, sb: 0, D: 1.2 }, ch: 1, rest: () => [0, 1], D: 1.2, alpha: 0, implicit: 0, diffKey: ['(v + u_dt * (u_D * L.g + b)) / (1.0 + u_dt * u * u)', '(v + u_dt * (1.05 * u_D * L.g + b)) / (1.0 + u_dt * u * u)'] },
      { id: 'turing', label: 'Lengyel-Epstein inhibitor (sigma D), a = u = 0', p: { tmodel: 'le', la: 0, lb: 0.2, lsig: 20, D: 0.06 }, ch: 1, rest: () => [0, 1], D: 1.2, alpha: 0, implicit: 0, diffKey: ['u_sig * (u_D * L.g + b * u)', 'u_sig * (1.05 * u_D * L.g + b * u)'] },
      { id: 'cyclic', label: 'species w near 0 (linear growth rate 1), u = v = 0', p: { a: 0.6, b: 1.6, D: 0.9 }, ch: 2, amp: 1e-6, rest: () => [0, 0, 0], D: 0.9, alpha: -1, implicit: 0, diffKey: ['float fx = u_D * L.b', 'float fx = 1.05 * u_D * L.b'] },
      { id: 'chemotaxis', label: 'attractant v at u = 0', p: { chi: 3.5, a: 0.2, D: 1.1 }, ch: 1, rest: () => [0, 1], D: 1.1, alpha: 0.2, implicit: 0, diffKey: ['float fv = u_D * L.g', 'float fv = 1.05 * u_D * L.g'] },
      { id: 'vegetation', label: 'water w at n = 0, no rain, flat', p: { a: 0, agrad: 0, slope: 0, Dw: 1.3, Dn: 1, m: 0.45 }, ch: 0, rest: () => [0, 0], D: 1.3, alpha: 1, implicit: 1, diffKey: ['u_v * wx + u_Dw * L.r', 'u_v * wx + 1.05 * u_Dw * L.r'] },
    ];
    const L = 8, T = 0.6, mx = 1, my = 2, amp = 1e-3, kk = (TAU / L) ** 2 * (mx * mx + my * my);
    if (want('diffusion')) for (const dc of diffusionCases) for (const lap of [5, 9]) {
      const rows = [];
      // dt = kappa h^2 at every level, kappa chosen so the coarsest level respects the module's own ceiling
      const kappa = Math.min(0.1 / dc.D, 0.9 * (await dtMax(dc.id, Object.assign(await defaults(dc.id), dc.p, { lap, scale: 16 / L }))) / (L / 16) ** 2);
      for (const N of [16, 32, 64]) {
        const h = L / N, s = Object.assign(await defaults(dc.id), dc.p, { lap, scale: N / L });
        const dt = T / Math.ceil(T / (kappa * h * h)), steps = Math.round(T / dt);
        if (dt > await dtMax(dc.id, s)) throw Error('diffusion fixture exceeds module ceiling');
        const init = field(N, N, (x, y) => { const r = dc.rest().slice(); r[dc.ch] = (dc.amp || amp) * (1.2 + Math.cos(TAU * (mx * x + my * y) / N)); return r; });
        const out = await run({ id: dc.id, s, W: N, H: N, init, dt, steps, snaps: [0, steps] });
        // subtract the uniform part, which evolves separately (it is the k = 0 mode of a linear equation)
        const got = C.abs(modeAmp(out[1].f, N, N, dc.ch, mx, my)) / C.abs(modeAmp(out[0].f, N, N, dc.ch, mx, my));
        const q = qLat(lap === 9, TAU * mx / N, TAU * my / N, h);
        // An implicit row divides by 1 + dt alpha, which the GPU forms in float32: near 1 that quantizes the
        // effective loss rate by up to ulp(1)/(2 dt), 3e-5 relative at dt = 1e-3 (1.5e-6 at the studio's 0.02).
        // The exact discrete factor therefore uses the float32 denominator; the unrounded value is recorded too.
        const G = dc.implicit ? (1 + dt * dc.D * q) / Math.fround(1 + Math.fround(dt) * dc.alpha) : 1 + dt * (dc.D * q - dc.alpha);
        const G64 = dc.implicit ? (1 + dt * dc.D * q) / (1 + dt * dc.alpha) : G;
        const exactDiscrete = Math.abs(G) ** steps, continuum = Math.exp((-dc.alpha - dc.D * kk) * T);
        rows.push({ N, h, dt, steps, measured: got, exactDiscrete, continuum, discreteRelError: Math.abs(got / exactDiscrete - 1), discreteRelErrorUnroundedDenominator: Math.abs(got / Math.abs(G64) ** steps - 1), continuumRelError: Math.abs(got / continuum - 1) });
      }
      const ord = orders(rows.map(r => r.continuumRelError)), worst = Math.max(...rows.map(r => r.discreteRelError));
      // cyclic's w(1 - w) is linear to first order; at amplitude 1e-6 the w^2 term is a 1e-6 relative residue
      const tolD = 2e-5;
      diffusion.push({ id: dc.id, case: dc.label, laplacian: lap, D: dc.D, alpha: dc.alpha, rows, orders: ord });
      check(dc.id, dc.label + ', ' + lap + '-point: exact discrete mode factor', worst, tolD, worst < tolD);
      check(dc.id, dc.label + ', ' + lap + '-point: continuum convergence order (formal 2)', ord[ord.length - 1], [1.75, 2.25], ord.every(o => o > 1.75 && o < 2.25), { finestRelError: rows[2].continuumRelError });
      if (lap === 5) {
        // controls: diffusion coefficient 5% high, and a broken 5-point centre weight (-3.9 instead of -4)
        for (const [name, mut] of [['diffusion coefficient 5% high', dc.diffKey], ['5-point stencil centre weight -3.9', ['return (n + s + e + w - 4.0 * c) * u_c2;', 'return (n + s + e + w - 3.9 * c) * u_c2;']]]) {
          const N = 32, h = L / N, s = Object.assign(await defaults(dc.id), dc.p, { lap, scale: N / L }), r = rows[1];
          const init = field(N, N, (x, y) => { const v = dc.rest().slice(); v[dc.ch] = (dc.amp || amp) * (1.2 + Math.cos(TAU * (mx * x + my * y) / N)); return v; });
          const out = await run({ id: dc.id, s, W: N, H: N, init, dt: r.dt, steps: r.steps, snaps: [0, r.steps], mutants: [mut] });
          const got = C.abs(modeAmp(out[1].f, N, N, dc.ch, mx, my)) / C.abs(modeAmp(out[0].f, N, N, dc.ch, mx, my));
          const e = Math.abs(got / r.exactDiscrete - 1);
          control(dc.id, dc.label + ': ' + name, mut, e, tolD, e >= tolD);
          void h;
        }
      }
    }
    report.diffusion = diffusion;
    process.stderr.write('shared checks ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n');

    // ================= Excitable media =================
    if (want('excitable')) {
      const ex = {};
      // (1) FitzHugh-Nagumo with eps = 0 and D_v = 0 freezes v at v0, leaving the bistable equation
      //   u_t = u_xx + f(u),  f(u) = u - u^3 - v0 = -(u - u1)(u - u2)(u - u3),
      // whose exact front (u3 invading u1) moves at c = (u1 + u3 - 2 u2)/sqrt(2) with unit diffusion.
      const v0 = -0.2, [u1, u2, u3] = cubicRoots(v0), cExact = (u1 + u3 - 2 * u2) / Math.SQRT2;
      const resid = Math.max(...[u1, u2, u3].map(u => Math.abs(u ** 3 - u + v0)));
      if (resid > 1e-12) throw Error('cubic roots');
      // Reference self-check: the profile u1 + (u3 - u1)/(1 + exp(kappa xi)), kappa = (u3 - u1)/sqrt 2, must solve
      // u'' + c u' + f(u) = 0 with this c. Central differences in Float64, step 1e-3 (residual O(1e-7)).
      {
        const kap = (u3 - u1) / Math.SQRT2, P = xi => u1 + (u3 - u1) / (1 + Math.exp(kap * xi)), d = 1e-3;
        let r = 0; for (let xi = -8; xi <= 8; xi += 0.05) { const up = (P(xi + d) - P(xi - d)) / (2 * d), upp = (P(xi + d) - 2 * P(xi) + P(xi - d)) / (d * d), u = P(xi); r = Math.max(r, Math.abs(upp + cExact * up + u - u ** 3 - v0)); }
        check('excitable', 'reference self-check: exact Nagumo profile satisfies the travelling-wave ODE (Float64, no GPU)', r, 1e-5, r < 1e-5);
      }
      const Lx = 40, Tf = 16, snapsT = [4, 6, 8, 10, 12, 14, 16];
      const front = async (scale, mutants) => {
        const W = Lx * scale, H = 2, h = 1 / scale, dt = Tf / Math.ceil(Tf / (0.1 * h * h)), steps = Math.round(Tf / dt);
        const s = Object.assign(await defaults('excitable'), { model: 'fhn', feps: 0, fD: 0, fa: 0.5, fb: -0.7, lap: 5, scale });
        if (dt > await dtMax('excitable', s)) throw Error('front fixture exceeds ceiling');
        const kappa = (u3 - u1) / Math.SQRT2; // exact profile u1 + (u3 - u1)/(1 + exp(kappa * xi))
        const init = field(W, H, x => { const X = (x + 0.5) * h; return [u1 + (u3 - u1) / (1 + Math.exp(kappa * (X - 25))) / (1 + Math.exp(-kappa * (X - 15))), v0]; });
        const out = await run({ id: 'excitable', s, W, H, init, dt, steps, snaps: snapsT.map(t => Math.round(t / dt)), mutants });
        const mass = out.map(o => { let m = 0; for (let x = 0; x < W; x++) m += (o.f[x * 4] - u1) / (u3 - u1); return m * h; });
        const frozen = Math.max(...out.map(o => { let m = 0; for (let i = 1; i < o.f.length; i += 4) m = Math.max(m, Math.abs(o.f[i] - Math.fround(v0))); return m; }));
        return { scale, h, dt, steps, speed: slope(snapsT, mass) / 2, vFrozenMaxDev: frozen };
      };
      const levels = [];
      for (const sc of [4, 8, 16]) levels.push(await front(sc));
      levels.forEach(l => { l.relError = Math.abs(l.speed / cExact - 1); });
      const ord = orders(levels.map(l => l.relError));
      ex.nagumoFront = { v0, roots: [u1, u2, u3], exactSpeed: cExact, levels, orders: ord };
      // 0.5%: the leading truncation estimate (h/delta)^2/12, delta = sqrt(2)/(u3 - u1) the front width,
      // is 7e-4 at h = 1/16; 0.5% allows the O(dt) Euler term and the fit window.
      check('excitable', 'Nagumo front speed against exact c = (u1 + u3 - 2u2)/sqrt(2), h = 1/16', levels[2].relError, 5e-3, levels[2].relError < 5e-3 && levels.every(l => l.vFrozenMaxDev === 0), { measured: levels[2].speed, exact: cExact });
      check('excitable', 'Nagumo front speed convergence order (formal 2)', ord[1], [1.7, 2.3], ord.every(o => o > 1.7 && o < 2.3), { orders: ord });
      for (const [name, mut] of [['recovery coupling sign flipped (+v)', ['fu = L.r + u - u * u * u - v;', 'fu = L.r + u - u * u * u + v;']], ['activator diffusion 10% high', ['fu = L.r + u - u * u * u - v;', 'fu = 1.1 * L.r + u - u * u * u - v;']]]) {
        const r = await front(16, [mut]), e = Math.abs(r.speed / cExact - 1);
        control('excitable', 'Nagumo front: ' + name, mut, e, 5e-3, e >= 5e-3, { measuredSpeed: r.speed });
      }
      // (2) Barkley kinetics in a uniform field (the Laplacian of a constant vanishes): the upstroke from
      // (u, v) = (0.1, 0) until 1 - u = 5e-3, against Float64 RK4 at dt = 1e-5.
      // The window stops before saturation on purpose. u = 1 is a root of u(1 - u)(u - (v + b)/a) for every v,
      // so near it the float32 increment drops below half an ulp and the uniform state stops moving, even after
      // (v + b)/a > 1 makes it unstable (recorded below as a finding, not a pass/fail check).
      const bk = { a: 0.75, b: 0.01, eps: 0.02 }, Tb = 0.4, tb = [0.1, 0.2, 0.25, 0.3, 0.35, 0.4];
      const rhsB = (u, v) => [u * (1 - u) * (u - (v + bk.b) / bk.a) / bk.eps, u - v];
      const rk = (y, dt) => { const k1 = rhsB(...y), k2 = rhsB(y[0] + dt / 2 * k1[0], y[1] + dt / 2 * k1[1]), k3 = rhsB(y[0] + dt / 2 * k2[0], y[1] + dt / 2 * k2[1]), k4 = rhsB(y[0] + dt * k3[0], y[1] + dt * k3[1]); return [y[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])]; };
      const refTraj = dt => { let y = [0.1, 0]; const out = []; const n = Math.round(Tb / dt); for (let i = 1; i <= n; i++) { y = rk(y, dt); if (tb.some(t => Math.round(t / dt) === i)) out.push(y.slice()); } return out; };
      const refB = refTraj(1e-5), refB2 = refTraj(2e-5);
      const refSens = Math.max(...refB.map((y, i) => Math.max(Math.abs(y[0] - refB2[i][0]), Math.abs(y[1] - refB2[i][1]))));
      const barkley = async (dt, mutants, y0 = [0.1, 0], times = tb) => {
        const s = Object.assign(await defaults('excitable'), bk, { model: 'barkley', D: 0, lap: 5 }), steps = Math.round(times[times.length - 1] / dt);
        return run({ id: 'excitable', s, W: 4, H: 4, init: field(4, 4, () => y0), dt, steps, snaps: times.map(t => Math.round(t / dt)), mutants });
      };
      const errB = out => Math.max(...out.map((o, i) => Math.max(Math.abs(o.f[0] - refB[i][0]), Math.abs(o.f[1] - refB[i][1]))));
      const bl = []; for (const dt of [0.002, 0.001, 0.0005]) bl.push({ dt, maxError: errB(await barkley(dt)) });
      const bo = orders(bl.map(l => l.maxError));
      ex.barkleyKinetics = { params: bk, start: [0.1, 0], times: tb, reference: 'Float64 RK4, dt = 1e-5', referenceSensitivity: refSens, levels: bl, orders: bo };
      check('excitable', 'Barkley upstroke kinetics: forward Euler order against RK4 (formal 1)', bo[1], [0.85, 1.2], bo.every(o => o > 0.85 && o < 1.2) && refSens < 1e-8, { levels: bl });
      // Control criterion: the correct kernel's finest error times 10.
      const bm = errB(await barkley(0.0005, [['(v + u_b) / u_a', '(v - u_b) / u_a']]));
      control('excitable', 'Barkley upstroke kinetics: threshold sign flipped (v - b)', '(v + u_b) -> (v - u_b)', bm, 10 * bl[2].maxError, bm > 10 * bl[2].maxError);
      // Finding: the uniform excited state in float32. From (0.6, 0.05) the Float64 Euler ODE leaves u = 1 near
      // t = 3.4 and returns to rest; the GPU uniform field is recorded at t = 3 and t = 6.
      {
        const out = await barkley(0.001, null, [0.6, 0.05], [3, 6]);
        ex.barkleySaturationFinding = { start: [0.6, 0.05], gpu: out.map(o => ({ t: o.step * 0.001, u: o.f[0], v: o.f[1] })), note: 'u = 1 is a root of the Barkley reaction for every v, so near it the Euler increment dt u(1 - u)(u - (v + b)/a)/eps falls below half a float32 ulp of 1 and is lost (stagnation). A uniform excited cell therefore stays excited after (v + b)/a exceeds 1, where the exact ODE recovers. In space, diffusion from neighbours below 1 supplies increments above the rounding floor.' };
      }
      report.excitable = ex;
      process.stderr.write('excitable ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n');
    }

    // ================= Turing patterns =================
    if (want('turing')) {
      const tu = {};
      const presets = {
        schnak: { tmodel: 'schnak', D: 100, sa: 0.1, sb: 0.9 }, bruss: { tmodel: 'bruss', D: 8, ba: 4.5, bb: 9 },
        gm: { tmodel: 'gm', D: 40, ga: 0.02, gb: 1, gc: 1.5, gK: 0 }, le: { tmodel: 'le', D: 1.5, la: 10, lb: 0.2, lsig: 20 },
      };
      // (1) Analytic uniform steady state is a fixed point of the GPU update: 2000 steps from the rest state.
      // Tolerance: relative 1e-5 (float32 rounding of the rest values and the fixed-point residual).
      tu.rest = [];
      for (const [m, p] of Object.entries(presets)) {
        const s = Object.assign(await defaults('turing'), p, { lap: 9, scale: 1 }), lin = turLinear(s), dt = Math.min(0.01, await dtMax('turing', s));
        const out = await run({ id: 'turing', s, W: 4, H: 4, init: field(4, 4, () => [lin.u, lin.v]), dt, steps: 2000 });
        const dev = Math.max(Math.abs(out[0].f[0] / lin.u - 1), Math.abs(out[0].f[1] / lin.v - 1));
        tu.rest.push({ model: m, u0: lin.u, v0: lin.v, relDrift: dev });
        check('turing', m + ': analytic uniform steady state held for 2000 steps', dev, 1e-5, dev < 1e-5);
      }
      // (2) Fastest-growing mode of each kinetics at its preset, at 0.9 of the module's own step ceiling:
      // the GPU rate must equal the exact discrete rate; the discrete, lattice and continuum rates are recorded
      // so the discretization error at studio settings is visible.
      // Tolerance: 1% of the rate. The O(delta^2) nonlinear term is ~1e-4; roundBound, recorded per run, is the
      // worst case if every float32 rounding of the update were coherent with the mode, which it is not.
      const Qtur = (s, lin) => s.tmodel === 'schnak' ? [1, lin.u * lin.u] : s.tmodel === 'bruss' ? [s.bb + 1, lin.u * lin.u] : s.tmodel === 'gm' ? [s.gb, s.gc] : [1 + 4 * lin.v / (1 + lin.u * lin.u), s.lsig * s.lb * lin.u / (1 + lin.u * lin.u)];
      tu.growth = [];
      for (const [m, p] of Object.entries(presets)) {
        const s0 = Object.assign(await defaults('turing'), p, { lap: 5 }), lin = turLinear(s0);
        const kmax = argmaxK(k => growth(lin, -k * k).lambda[0], 0.01, 6), sigC = growth(lin, -kmax * kmax).lambda[0], W = 16;
        const s = Object.assign({}, s0, { scale: W / (TAU / kmax) }), dt = 0.9 * await dtMax('turing', s);
        const r = await linearMode({ id: 'turing', s, W, lin, Q: Qtur(s, lin), dt, T: 1.5 / sigC });
        const rel = r.errDiscrete / Math.abs(r.discrete[0]);
        tu.growth.push({ model: m, params: p, kFastest: kmax, wavelength: TAU / kmax, cellsPerWavelength: W, dt, measured: r.sigma, discrete: r.discrete[0], lattice: r.lattice[0], continuum: sigC, relErrorToDiscrete: rel, roundBound: r.roundBound });
        check('turing', m + ': fastest-mode growth rate equals the exact discrete linear rate', rel, 0.01, rel < 0.01, { measured: r.sigma, discrete: r.discrete[0], lattice: r.lattice[0], continuum: sigC });
      }
      // (3) Spatial refinement of the Schnakenberg growth rate to the continuum dispersion relation.
      // dt = 0.9 x ceiling scales with h^2 (the diffusive limit governs at D = 100), so both errors are O(h^2).
      {
        const s0 = Object.assign(await defaults('turing'), presets.schnak, { lap: 5 }), lin = turLinear(s0);
        // k = 0.75 k_max, off the peak of sigma(k), for the reason given under chemotaxis (4).
        const kmax = 0.75 * tu.growth[0].kFastest, sigC = growth(lin, -kmax * kmax).lambda[0], levels = [];
        for (const W of [6, 12, 24]) {
          const s = Object.assign({}, s0, { scale: W / (TAU / kmax) }), dt = 0.9 * await dtMax('turing', s);
          const r = await linearMode({ id: 'turing', s, W, lin, Q: Qtur(s, lin), dt, T: 1.5 / sigC });
          levels.push({ W, h: 1 / s.scale, dt, sigma: r.sigma, discrete: r.discrete[0], error: Math.abs(r.sigma - sigC), roundBound: r.roundBound });
        }
        const rich = richardson(levels.map(l => l.sigma)), limErr = Math.abs(rich.extrapolated / sigC - 1);
        tu.spatial = { model: 'schnak', k: kmax, kOverKFastest: 0.75, sigmaContinuum: sigC, levels, richardson: rich, extrapolatedRelError: limErr };
        // 2e-3: the level-independent offset between GPU and exact discrete rates is ~4e-4 relative here.
        check('turing', 'schnak, k = 0.75 k_max: observed order of the growth rate (formal 2) and extrapolated limit = continuum within 2e-3', rich.order, [1.75, 2.25], rich.order > 1.75 && rich.order < 2.25 && limErr < 2e-3, { extrapolatedRelError: limErr });
      }
      // (4) Turing threshold. Schnakenberg a = 0.1, b = 0.9: D_c solves (D fu + gv)^2 = 4 D det,
      // k_c^2 = (D_c fu + gv)/(2 D_c). At D = 0.95 D_c and 1.05 D_c the critical mode must decay and grow,
      // matching the exact discrete rate within 5% (the rates are ~0.02, so 5% is ~1e-3 absolute).
      {
        const base = Object.assign(await defaults('turing'), presets.schnak, { lap: 5 }), lin0 = turLinear(base);
        const [fu, fv, gu, gv] = lin0.J, det = fu * gv - fv * gu;
        const A2 = fu * fu, B2 = 2 * fu * gv - 4 * det, C2 = gv * gv, Dc = (-B2 + Math.sqrt(B2 * B2 - 4 * A2 * C2)) / (2 * A2), kc = Math.sqrt((Dc * fu + gv) / (2 * Dc));
        tu.threshold = { Dc, kc, runs: [] };
        const W = 16;
        for (const f of [0.95, 1.05]) {
          const s = Object.assign({}, base, { D: f * Dc, scale: W / (TAU / kc) }), lin = turLinear(s), dt = 0.9 * await dtMax('turing', s);
          const sigC = growth(lin, -kc * kc).lambda[0], r = await linearMode({ id: 'turing', s, W, lin, Q: Qtur(s, lin), dt, T: 60 });
          tu.threshold.runs.push({ D: s.D, dt, measured: r.sigma, discrete: r.discrete[0], lattice: r.lattice[0], continuum: sigC, roundBound: r.roundBound });
          const e = Math.abs(r.sigma - r.discrete[0]);
          check('turing', 'schnak: D = ' + f + ' D_c critical mode ' + (f < 1 ? 'decays' : 'grows') + ' (exact discrete rate within 5%)', e, 0.05 * Math.abs(r.discrete[0]), Math.sign(r.sigma) === Math.sign(f - 1) && Math.sign(sigC) === Math.sign(f - 1) && e < 0.05 * Math.abs(r.discrete[0]), { measured: r.sigma, discrete: r.discrete[0], continuum: sigC });
        }
        // control: give the inhibitor the activator's diffusion; no Turing instability can exist
        const s = Object.assign({}, base, { D: 1.05 * Dc, scale: W / (TAU / kc) }), lin = turLinear(s);
        const r = await linearMode({ id: 'turing', s, W, lin, Q: Qtur(s, lin), dt: 0.9 * await dtMax('turing', s), T: 60, mutants: [['(v + u_dt * (u_D * L.g + b)) / (1.0 + u_dt * u * u)', '(v + u_dt * (L.g + b)) / (1.0 + u_dt * u * u)']] });
        const e = Math.abs(r.sigma - r.discrete[0]);
        control('turing', 'D = 1.05 D_c critical mode with equal diffusivities (inhibitor D replaced by 1)', 'u_D * L.g -> L.g (Schnakenberg)', e, 0.05 * Math.abs(r.discrete[0]), !(Math.sign(r.sigma) > 0 && e < 0.05 * Math.abs(r.discrete[0])), { measured: r.sigma, discrete: r.discrete[0] });
      }
      // (5) Dominant wavelength from noise while still linear (default Schnakenberg, 9-point, scale 0.6,
      // 128 x 128, default step at its ceiling). Growth e^4 from 1e-3 noise keeps the field below 6% of u0.
      // Radially averaged power-spectrum peak against the fastest-growing wavenumber of the 9-point lattice.
      // Tolerance: one spectral bin 2 pi / L, the resolution of the measurement.
      {
        const s = Object.assign(await defaults('turing'), presets.schnak, { lap: 9, scale: 0.6 }), lin = turLinear(s), N = 128, h = 1 / 0.6, Ld = N * h;
        const dt = Math.min(s.dt, await dtMax('turing', s)), rng = mulberry32(1952);
        const init = field(N, N, () => [lin.u * (1 + 1e-3 * (2 * rng() - 1)), lin.v * (1 + 1e-3 * (2 * rng() - 1))]);
        const kmaxC = tu.growth[0].kFastest, sigMax = tu.growth[0].continuum;
        const latAxis = argmaxK(k => growth(lin, q9(k * h, 0, h)).lambda[0], 0.01, Math.PI / h);
        const latDiag = argmaxK(k => growth(lin, q9(k * h / Math.SQRT2, k * h / Math.SQRT2, h)).lambda[0], 0.01, Math.PI / h);
        const spectrum = f => {
          const re = new Float64Array(N * N), im = new Float64Array(N * N), tre = new Float64Array(N * N), tim = new Float64Array(N * N);
          let meanU = 0; for (let i = 0; i < N * N; i++) meanU += f[i * 4]; meanU /= N * N;
          const cs = Array.from({ length: N }, (_, j) => Math.cos(TAU * j / N)), sn = Array.from({ length: N }, (_, j) => Math.sin(TAU * j / N));
          for (let y = 0; y < N; y++) for (let kx = 0; kx < N; kx++) { let a = 0, b = 0; for (let x = 0; x < N; x++) { const v = f[(y * N + x) * 4] - meanU, j = (kx * x) % N; a += v * cs[j]; b -= v * sn[j]; } tre[y * N + kx] = a; tim[y * N + kx] = b; }
          for (let kx = 0; kx < N; kx++) for (let ky = 0; ky < N; ky++) { let a = 0, b = 0; for (let y = 0; y < N; y++) { const j = (ky * y) % N, c1 = cs[j], s1 = -sn[j], xr = tre[y * N + kx], xi = tim[y * N + kx]; a += xr * c1 - xi * s1; b += xr * s1 + xi * c1; } re[ky * N + kx] = a; im[ky * N + kx] = b; }
          const nb = N / 2, pw = new Float64Array(nb + 1), cnt = new Float64Array(nb + 1);
          for (let ky = 0; ky < N; ky++) for (let kx = 0; kx < N; kx++) { const ix = kx > N / 2 ? kx - N : kx, iy = ky > N / 2 ? ky - N : ky, r = Math.round(Math.hypot(ix, iy)); if (r > 0 && r <= nb) { pw[r] += re[ky * N + kx] ** 2 + im[ky * N + kx] ** 2; cnt[r]++; } }
          for (let r = 1; r <= nb; r++) pw[r] /= Math.max(cnt[r], 1);
          let rb = 1; for (let r = 2; r < nb; r++) if (pw[r] > pw[rb]) rb = r;
          const y0 = Math.log(pw[rb - 1]), y1 = Math.log(pw[rb]), y2 = Math.log(pw[rb + 1]), off = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2);
          return (rb + off) * TAU / Ld;
        };
        const Tlin = 4 / sigMax, Tpat = 30, sLin = Math.round(Tlin / dt), sPat = Math.round(Tpat / dt);
        const out = await run({ id: 'turing', s, W: N, H: N, init, dt, steps: sPat, snaps: [sLin, sPat] });
        let dev = 0; for (let i = 0; i < N * N; i++) dev = Math.max(dev, Math.abs(out[0].f[i * 4] / lin.u - 1));
        const kLin = spectrum(out[0].f), kPat = spectrum(out[1].f), dk = TAU / Ld;
        const statusLam = await page.evaluate(s => { const x = window.__rdxSpec.turing.status(s, { dt: 0.01 }); const m = /λ ≈ ([0-9.]+) cells/.exec(x); return m ? Number(m[1]) : null; }, s);
        tu.spectrum = { grid: [N, N], scale: 0.6, dt, spectralBin: dk, linearTime: Tlin, linearMaxRelDeviation: dev, kMeasuredLinear: kLin, kFastestContinuum: kmaxC, kFastestLatticeAxis: latAxis, kFastestLatticeDiagonal: latDiag,
          patternTime: Tpat, kMeasuredPattern: kPat,
          cells: { measuredLinear: TAU / kLin / h, fastestLattice: TAU / latAxis / h, measuredPattern: TAU / kPat / h, statusLine: statusLam, onsetCritical: TAU / Math.pow(1 / 100, 0.25) / h },
          note: 'The status line reports 2 pi (Du Dv/det)^(1/4), the critical wavelength at onset. Far above onset (D = 100 against D_c = 8.57) the fastest-growing and the saturated wavelengths are shorter.' };
        check('turing', 'schnak default: dominant FFT wavenumber in the linear regime against the fastest-growing lattice mode', Math.abs(kLin - latAxis), dk, dev < 0.1 && Math.abs(kLin - latAxis) < dk && Math.abs(latDiag - latAxis) < 0.1 * dk, { kMeasured: kLin, kPredicted: latAxis, maxRelDeviation: dev });
      }
      // (6) Below threshold nothing grows: D = 0.9 D_c from 1e-2 noise, the perturbation r.m.s. must fall.
      {
        const s = Object.assign(await defaults('turing'), presets.schnak, { lap: 9, scale: 1, D: 0.9 * tu.threshold.Dc }), lin = turLinear(s), N = 64, rng = mulberry32(8);
        const dt = Math.min(0.01, await dtMax('turing', s)), steps = Math.round(100 / dt);
        const init = field(N, N, () => [lin.u * (1 + 1e-2 * (2 * rng() - 1)), lin.v * (1 + 1e-2 * (2 * rng() - 1))]);
        const out = await run({ id: 'turing', s, W: N, H: N, init, dt, steps, snaps: [0, steps] });
        const rms = f => { let a = 0; for (let i = 0; i < N * N; i++) a += (f[i * 4] - lin.u) ** 2; return Math.sqrt(a / (N * N)); };
        const ratio = rms(out[1].f) / rms(out[0].f);
        tu.stable = { D: s.D, time: 100, rmsRatio: ratio };
        check('turing', 'schnak: D = 0.9 D_c, noise decays (no pattern)', ratio, 0.1, ratio < 0.1);
      }
      report.turing = tu;
      process.stderr.write('turing ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n');
    }

    // ================= Cyclic competition (May-Leonard) =================
    if (want('cyclic')) {
      const cy = {};
      // Well-mixed limit: a uniform field has zero Laplacian, so each cell integrates the ODE
      //   u' = u(1 - u - a v - b w) and cyclic permutations.
      // With S = u + v + w, P = u v w, Q = uv + vw + wu:
      //   S' = S(1 - S) + (2 - a - b) Q,   d/dt ln(P/S^3) = (2 - a - b)(S^2 - 3Q)/S.
      // For a + b = 2, S is exactly logistic and P/S^3 is a first integral (May and Leonard 1975).
      // Reference self-check of both identities at random interior points (Float64, no GPU).
      {
        const R = mulberry32(1975); let r = 0;
        for (let i = 0; i < 1000; i++) {
          const a = 0.2 + 0.8 * R(), b = 1 + 2 * R(), u = R(), v = R(), w = R();
          const du = u * (1 - u - a * v - b * w), dv = v * (1 - v - a * w - b * u), dw = w * (1 - w - a * u - b * v);
          const S = u + v + w, Q = u * v + v * w + w * u, dS = du + dv + dw, dlog = du / u + dv / v + dw / w - 3 * dS / S;
          r = Math.max(r, Math.abs(dS - (S * (1 - S) + (2 - a - b) * Q)), Math.abs(dlog - (2 - a - b) * (S * S - 3 * Q) / S));
        }
        check('cyclic', 'reference self-check: S and ln(P/S^3) identities at 1000 random points (Float64, no GPU)', r, 1e-12, r < 1e-12);
      }
      const y0 = [0.5, 0.2, 0.1], Tc = 20, ts = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
      const S0 = y0[0] + y0[1] + y0[2], I0 = y0[0] * y0[1] * y0[2] / S0 ** 3;
      const logistic = t => 1 / (1 + (1 / S0 - 1) * Math.exp(-t));
      const ode = async (a, b, dt, mutants, times = ts, T = Tc) => {
        const s = Object.assign(await defaults('cyclic'), { a, b, D: 0.1, lap: 5, scale: 2 }), steps = Math.round(T / dt);
        const out = await run({ id: 'cyclic', s, W: 2, H: 2, init: field(2, 2, () => y0), dt, steps, snaps: times.map(t => Math.round(t / dt)), mutants });
        return out.map(o => [o.f[0], o.f[1], o.f[2]]);
      };
      const lv = [];
      for (const dt of [0.04, 0.02, 0.01]) {
        const tr = await ode(0.6, 1.4, dt);
        const eS = Math.max(...tr.map((y, i) => Math.abs(y[0] + y[1] + y[2] - logistic(ts[i]))));
        const eI = Math.max(...tr.map(y => Math.abs(y[0] * y[1] * y[2] / (y[0] + y[1] + y[2]) ** 3 / I0 - 1)));
        lv.push({ dt, sumError: eS, invariantRelDrift: eI });
      }
      const oS = orders(lv.map(l => l.sumError)), oI = orders(lv.map(l => l.invariantRelDrift));
      cy.neutral = { a: 0.6, b: 1.4, start: y0, levels: lv, sumOrders: oS, invariantOrders: oI };
      check('cyclic', 'a + b = 2: total population follows the exact logistic solution (Euler order 1)', oS[1], [0.85, 1.2], oS.every(o => o > 0.85 && o < 1.2) && lv[2].sumError < 5e-3, { finestError: lv[2].sumError });
      check('cyclic', 'a + b = 2: first integral uvw/(u+v+w)^3 conserved (drift order 1)', oI[1], [0.85, 1.2], oI.every(o => o > 0.85 && o < 1.2) && lv[2].invariantRelDrift < 2e-2, { finestRelDrift: lv[2].invariantRelDrift });
      {
        const mut = ['x * (1.0 - x - u_a * u - u_b * v)', 'x * (1.0 - x - u_b * u - u_a * v)'];
        const tr = await ode(0.6, 1.4, 0.01, [mut]), eI = Math.max(...tr.map(y => Math.abs(y[0] * y[1] * y[2] / (y[0] + y[1] + y[2]) ** 3 / I0 - 1)));
        control('cyclic', 'a and b swapped for species w only (breaks the cyclic symmetry)', mut, eI, 2e-2, eI >= 2e-2);
      }
      // Sign of the Lyapunov-type quantity: P/S^3 must fall monotonically for a + b > 2 and rise for a + b < 2.
      cy.monotone = [];
      for (const [a, b] of [[0.6, 1.6], [0.5, 1.3]]) {
        const times = Array.from({ length: 40 }, (_, i) => (i + 1));
        const tr = await ode(a, b, 0.01, null, times, 40), R = tr.map(y => y[0] * y[1] * y[2] / (y[0] + y[1] + y[2]) ** 3);
        const inc = R.slice(1).map((r, i) => r - R[i]), want = Math.sign(2 - a - b);
        const okMono = inc.every(d => Math.sign(d) === want);
        cy.monotone.push({ a, b, expectedSign: want, ratioStart: R[0], ratioEnd: R[R.length - 1] });
        check('cyclic', 'a + b = ' + (a + b).toFixed(1) + ': uvw/(u+v+w)^3 ' + (want < 0 ? 'decreases' : 'increases') + ' monotonically', R[R.length - 1] / R[0], want < 0 ? '< 1' : '> 1', okMono);
      }
      // Interior fixed point x* = 1/(1 + a + b). The Jacobian is circulant with first row -x*(1, a, b);
      // on (1, w, w^2), w = exp(2 pi i/3), the eigenvalue is lambda = -x*(1 + a w + b w^2):
      // Re = -x*(1 - (a + b)/2), Im = x* (sqrt 3/2)(b - a). The GPU's complex amplitude
      // z = (du + conj(w) dv + conj(w)^2 dw)/3 must evolve as (1 + dt lambda)^n (Euler, exact discrete)
      // and converge to exp(lambda t) as dt -> 0.
      cy.focus = [];
      for (const [a, b] of [[0.6, 1.6], [0.5, 1.3]]) {
        const xs = 1 / (1 + a + b), lam = [-xs * (1 - (a + b) / 2), xs * Math.sqrt(3) / 2 * (b - a)];
        const levels = [];
        for (const dt of [0.04, 0.02, 0.01]) {
          const eps = 2e-3, Tf = 40, times = [10, 20, 30, 40];
          const s = Object.assign(await defaults('cyclic'), { a, b, D: 0.1, lap: 5, scale: 2 }), steps = Math.round(Tf / dt);
          const init = field(2, 2, () => [xs + eps, xs - eps / 2, xs - eps / 2]);
          const out = await run({ id: 'cyclic', s, W: 2, H: 2, init, dt, steps, snaps: times.map(t => Math.round(t / dt)) });
          const z = out.map(o => { const d = [o.f[0] - xs, o.f[1] - xs, o.f[2] - xs], c1 = Math.cos(TAU / 3), s1 = Math.sin(TAU / 3); return [(d[0] + c1 * d[1] + c1 * d[2]) / 3, (-s1 * d[1] + s1 * d[2]) / 3]; });
          const re = slope(times, z.map(v => Math.log(C.abs(v)))), im = slope(times, unwrap(z.map(v => Math.atan2(v[1], v[0]))));
          const g = C.add([1, 0], [dt * lam[0], dt * lam[1]]), eulerRe = Math.log(C.abs(g)) / dt, eulerIm = Math.atan2(g[1], g[0]) / dt;
          levels.push({ dt, measured: [re, im], eulerExact: [eulerRe, eulerIm], continuum: lam, errorContinuum: Math.hypot(re - lam[0], im - lam[1]), errorEuler: Math.hypot(re - eulerRe, im - eulerIm) });
        }
        const ord = orders(levels.map(l => l.errorContinuum));
        cy.focus.push({ a, b, fixedPoint: xs, lambda: lam, levels, orders: ord });
        // Euler-exact tolerance 2e-4 absolute on the rate (0.1% of |lambda|): the amplitude 2e-3 keeps the
        // per-step increment dt |lambda| eps >= 5e-6, two orders above float32 rounding of x* ~ 0.3, and
        // the quadratic terms feed the mode at O(eps^2) once averaged over the fit window.
        const worst = Math.max(...levels.map(l => l.errorEuler));
        check('cyclic', 'a = ' + a + ', b = ' + b + ': fixed-point eigenvalue matches exact Euler recurrence', worst, 2e-4, worst < 2e-4, { lambda: lam, type: lam[0] > 0 ? 'unstable focus' : 'stable focus' });
        check('cyclic', 'a = ' + a + ', b = ' + b + ': eigenvalue converges to -x*(1 + a w + b w^2) (formal order 1)', ord[1], [0.8, 1.25], ord.every(o => o > 0.8 && o < 1.25) && Math.sign(levels[2].measured[0]) === Math.sign(lam[0]) && Math.sign(levels[2].measured[1]) === Math.sign(lam[1]));
      }
      report.cyclic = cy;
      process.stderr.write('cyclic ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n');
    }

    // ================= Chemotaxis (Keller-Segel with saturating sensitivity and logistic growth) =================
    if (want('chemotaxis')) {
      const ch = {};
      // (1) Discrete mass balance. Face fluxes and the Laplacian telescope on the torus, so over one step
      //   sum(u_{n+1}) - sum(u_n) = dt sum u_n (1 - u_n)
      // exactly, whatever the chemotactic flux does. Strongly aggregated random field, both stencils.
      // Tolerance: 1e-6 relative to sum(u) (float32 summation of 4096 terms in the check itself, in Float64,
      // plus per-cell rounding 6e-8 x ~20 operations).
      const rng = mulberry32(1970), N = 64;
      const aggr = field(N, N, (x, y) => { let u = 0.05; for (const [cx, cy, A] of [[14, 20, 6], [40, 44, 9], [50, 12, 4]]) { const dx = Math.min(Math.abs(x - cx), N - Math.abs(x - cx)), dy = Math.min(Math.abs(y - cy), N - Math.abs(y - cy)); u += A * Math.exp(-(dx * dx + dy * dy) / 18); } return [u * (1 + 0.2 * (rng() - 0.5)), 5 + 3 * Math.cos(TAU * x / N) * Math.sin(TAU * 2 * y / N) + rng()]; });
      const balance = async (lap, mutants) => {
        const s = Object.assign(await defaults('chemotaxis'), { lap, chi: 5, a: 0.2, D: 0.2, scale: 2.2 }), dt = 0.01;
        if (dt > await dtMax('chemotaxis', s)) throw Error('chemotaxis fixture exceeds ceiling');
        const out = await run({ id: 'chemotaxis', s, W: N, H: N, init: aggr, dt, steps: 1, snaps: [0, 1], mutants });
        let m0 = 0, m1 = 0, src = 0; for (let i = 0; i < N * N; i++) { const u = out[0].f[i * 4]; m0 += u; m1 += out[1].f[i * 4]; src += u * (1 - u); }
        return { mass: m0, residual: Math.abs(m1 - m0 - dt * src) / m0 };
      };
      ch.massBalance = [];
      for (const lap of [5, 9]) { const r = await balance(lap); ch.massBalance.push(Object.assign({ laplacian: lap }, r)); check('chemotaxis', 'discrete mass balance sum(du) = dt sum u(1-u), ' + lap + '-point', r.residual, 1e-6, r.residual < 1e-6); }
      {
        const mut = ['chiAt(0.5 * (c.r + e.r))', 'chiAt(c.r)'], r = await balance(5, [mut, ['chiAt(0.5 * (c.r + w.r))', 'chiAt(c.r)'], ['chiAt(0.5 * (c.r + n.r))', 'chiAt(c.r)'], ['chiAt(0.5 * (c.r + s.r))', 'chiAt(c.r)']]);
        control('chemotaxis', 'non-conservative flux (sensitivity at the cell, not the face)', 'chiAt(0.5 * (c.r + X.r)) -> chiAt(c.r)', r.residual, 1e-6, r.residual >= 1e-6);
      }
      // (2) Uniform steady state (u, v) = (1, 1/a) is held.
      {
        const s = Object.assign(await defaults('chemotaxis'), { lap: 9 }), out = await run({ id: 'chemotaxis', s, W: 4, H: 4, init: field(4, 4, () => [1, 1 / s.a]), dt: 0.02, steps: 2000 });
        const dev = Math.max(Math.abs(out[0].f[0] - 1), Math.abs(out[0].f[1] * s.a - 1));
        ch.rest = { u0: 1, v0: 1 / s.a, relDrift: dev };
        check('chemotaxis', 'uniform steady state (1, 1/a) held for 2000 steps', dev, 1e-5, dev < 1e-5);
      }
      // (3) Linear stability of (1, 1/a). With chi1 = chi(1) = c/2, a mode of symbol q evolves under
      //   [[q - 1, -chi1 q], [1, D q - a]],
      // unstable iff chi1 > a + D + 2 sqrt(aD), i.e. c > c* = 2 (sqrt a + sqrt D)^2, at k_c^2 = sqrt(a/D).
      const a = 0.2, D = 0.2, cStar = 2 * (Math.sqrt(a) + Math.sqrt(D)) ** 2, kc = Math.pow(a / D, 0.25);
      const ksLin = cc => ({ u: 1, v: 1 / a, J: [-1, 0, 1, -a], Du: 1, Dv: D, chi1: cc / 2 });
      const ksCont = (lin, k) => eig2(C.re(-1 - k * k), C.re(lin.chi1 * k * k), C.re(1), C.re(-D * k * k - a)).lambda[0];
      const ksMode = async (cc, W, k, T, mutants) => {
        const lin = ksLin(cc), s = Object.assign(await defaults('chemotaxis'), { chi: cc, a, D, lap: 5, scale: W / (TAU / k) });
        return Object.assign(await linearMode({ id: 'chemotaxis', s, W, lin, Q: [0, 0], dt: 0.9 * await dtMax('chemotaxis', s), T, mutants }), { continuum: ksCont(lin, k) });
      };
      ch.threshold = { a, D, cStar, kc, runs: [] };
      for (const f of [0.95, 1.05]) {
        const r = await ksMode(f * cStar, 16, kc, 120), e = Math.abs(r.sigma - r.discrete[0]);
        ch.threshold.runs.push({ c: f * cStar, dt: r.dt, measured: r.sigma, discrete: r.discrete[0], lattice: r.lattice[0], continuum: r.continuum });
        check('chemotaxis', 'c = ' + f + ' c*: critical mode ' + (f < 1 ? 'decays' : 'grows') + ' (exact discrete rate within 5%)', e, 0.05 * Math.abs(r.discrete[0]), Math.sign(r.sigma) === Math.sign(f - 1) && Math.sign(r.continuum) === Math.sign(f - 1) && e < 0.05 * Math.abs(r.discrete[0]), { measured: r.sigma, discrete: r.discrete[0], continuum: r.continuum });
      }
      {
        const r = await ksMode(1.05 * cStar, 16, kc, 120, [['float fu = L.r - divF', 'float fu = L.r + divF']]), e = Math.abs(r.sigma - r.discrete[0]);
        control('chemotaxis', 'c = 1.05 c*: chemotactic flux sign flipped (chemorepulsion)', 'L.r - divF -> L.r + divF', e, 0.05 * Math.abs(r.discrete[0]), !(r.sigma > 0 && e < 0.05 * Math.abs(r.discrete[0])), { measured: r.sigma, discrete: r.discrete[0] });
      }
      // (4) Fastest mode at the default c = 3.5: GPU against the exact discrete rate (1%), and spatial
      // refinement to the continuum relation (formal order 2; the step ceiling scales with h^2 here).
      {
        // Refinement uses k = 0.75 k_max: at the peak d(sigma)/dk = 0, so the O(h^2) shift of the lattice symbol
        // only changes sigma at O(h^4) and the study would not probe the stencil's leading error.
        // Grids of 6, 12 and 24 cells per wavelength: dt scales with h^2 here, and below dt ~ 2e-3 float32
        // rounding of the base state biases the measured rate by ~1e-3 relative (see roundBound), the size of
        // the discretization error a finer level would have to resolve.
        const cc = 3.5, lin = ksLin(cc), kmax = argmaxK(k => ksCont(lin, k), 0.01, 4), kr = 0.75 * kmax, sigC = ksCont(lin, kr), spatial = [];
        for (const W of [6, 12, 24]) { const r = await ksMode(cc, W, kr, 1.5 / sigC); spatial.push({ W, h: TAU / kr / W, dt: r.dt, sigma: r.sigma, discrete: r.discrete[0], lattice: r.lattice[0], error: Math.abs(r.sigma - sigC), relErrorToDiscrete: r.errDiscrete / Math.abs(r.discrete[0]) }); }
        const rich = richardson(spatial.map(l => l.sigma)), worst = Math.max(...spatial.map(l => l.relErrorToDiscrete)), limErr = Math.abs(rich.extrapolated / sigC - 1);
        ch.growth = { c: cc, kFastest: kmax, kRefinement: kr, sigmaContinuum: sigC, spatial, richardson: rich, extrapolatedRelError: limErr };
        check('chemotaxis', 'c = 3.5, k = 0.75 k_max: growth rate equals the exact discrete linear rate', worst, 0.01, worst < 0.01);
        check('chemotaxis', 'c = 3.5, k = 0.75 k_max: observed order of the growth rate (formal 2) and extrapolated limit = continuum within 2e-3', rich.order, [1.75, 2.25], rich.order > 1.75 && rich.order < 2.25 && limErr < 2e-3, { extrapolatedRelError: limErr });
      }
      // (5) The hint text states the threshold at the defaults; record what it says against c*.
      const hint = await page.evaluate(() => window.__rdxDefs.chemotaxis.schema.find(f => f.key === 'chi').hint);
      const m = /c > ([0-9]+(?:\.[0-9]+)?)/.exec(hint), hinted = m ? Number(m[1]) : null;
      ch.hint = { text: hint, stated: hinted, derived: cStar };
      check('chemotaxis', 'UI hint threshold at the defaults equals c* = 2(sqrt a + sqrt D)^2', hinted, cStar, hinted != null && Math.abs(hinted - cStar) < 0.05);
      report.chemotaxis = ch;
      process.stderr.write('chemotaxis ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n');
    }

    // ================= Vegetation (Klausmeier) =================
    if (want('vegetation')) {
      const vg = {};
      const m = 0.45;
      // (1) Uniform states: desert (w, n) = (a, 0) always; vegetated n = (a + sqrt(a^2 - 4m^2))/(2m),
      // w = m/n, iff a >= 2m.
      const veg = a => { const n = (a + Math.sqrt(a * a - 4 * m * m)) / (2 * m); return { w: m / n, n }; };
      vg.states = [];
      for (const a of [1.1, 1.6]) {
        const st = veg(a), s = Object.assign(await defaults('vegetation'), { a, agrad: 0, m, slope: 40, Dw: 1, Dn: 1, lap: 5 }), dt = Math.min(0.02, await dtMax('vegetation', s));
        const out = await run({ id: 'vegetation', s, W: 4, H: 4, init: field(4, 4, () => [st.w, st.n]), dt, steps: 2000 });
        const dev = Math.max(Math.abs(out[0].f[0] / st.w - 1), Math.abs(out[0].f[1] / st.n - 1));
        vg.states.push({ a, w: st.w, n: st.n, relDrift: dev });
        check('vegetation', 'a = ' + a + ': vegetated uniform state n = (a + sqrt(a^2 - 4m^2))/2m held', dev, 1e-5, dev < 1e-5);
      }
      {
        const a = 0.8, s = Object.assign(await defaults('vegetation'), { a, agrad: 0, m, slope: 40, Dw: 1, Dn: 1, lap: 5 });
        const out = await run({ id: 'vegetation', s, W: 4, H: 4, init: field(4, 4, () => [0.5, 1]), dt: 0.02, steps: 10000 });
        vg.desert = { a, twoM: 2 * m, final: [out[0].f[0], out[0].f[1]] };
        check('vegetation', 'a = 0.8 < 2m: cover collapses to the desert state (a, 0)', Math.max(Math.abs(out[0].f[0] - a), out[0].f[1]), 1e-4, Math.abs(out[0].f[0] - a) < 1e-4 && out[0].f[1] < 1e-4);
      }
      // Linearization at the vegetated state, water advected by v d/dx:
      //   [[-1 - n^2 + Dw q + v s, -2m], [n^2, m + Dn q]],  s = ik (continuum) or (e^{ikh} - 1)/h (upwind lattice).
      const vegLin = (a, Dw, Dn) => { const st = veg(a); return { u: st.w, v: st.n, J: [-1 - st.n * st.n, -2 * st.w * st.n, st.n * st.n, 2 * st.w * st.n - m], Du: Dw, Dv: Dn }; };
      const vegCont = (lin, k, v) => growth(lin, -k * k, [0, v * k]).lambda;
      const vegMode = async (p, W, k, T, mutants) => {
        const lin = vegLin(p.a, p.Dw, p.Dn), s = Object.assign(await defaults('vegetation'), p, { agrad: 0, m, lap: 5, scale: W / (TAU / k) }), h = 1 / s.scale, al = TAU / W;
        const r = await linearMode({ id: 'vegetation', s, W, lin, Q: [1 + lin.v * lin.v, m], advLat: [p.slope * (Math.cos(al) - 1) / h, p.slope * Math.sin(al) / h], dt: 0.9 * await dtMax('vegetation', s), T, mutants });
        return Object.assign(r, { continuum: vegCont(lin, k, p.slope), phaseVelocity: -r.omega / k, phaseVelocityDiscrete: -r.discrete[1] / k });
      };
      // (2) Flat ground (v = 0): Turing onset in Dw. The critical Dw solves (Dw gn + Dn fw)^2 = 4 Dw Dn det,
      // k_c^2 = (Dw_c gn + Dn fw)/(2 Dw_c Dn). The critical mode must decay at 0.95 Dw_c and grow at 1.05 Dw_c,
      // within 5% of the exact discrete rate.
      {
        const a = 1.1, lin = vegLin(a, 1, 1), [fw, fn, gw, gn] = lin.J, det = fw * gn - fn * gw, Dn = 1;
        const A2 = gn * gn, B2 = 2 * gn * Dn * fw - 4 * Dn * det, C2 = (Dn * fw) ** 2, Dwc = (-B2 + Math.sqrt(B2 * B2 - 4 * A2 * C2)) / (2 * A2);
        const kc = Math.sqrt((Dwc * gn + Dn * fw) / (2 * Dwc * Dn));
        vg.flatOnset = { a, m, Dn, DwCritical: Dwc, kc, runs: [] };
        for (const f of [0.95, 1.05]) {
          const r = await vegMode({ a, slope: 0, Dw: f * Dwc, Dn }, 16, kc, 150), e = Math.abs(r.sigma - r.discrete[0]);
          vg.flatOnset.runs.push({ Dw: f * Dwc, dt: r.dt, measured: r.sigma, discrete: r.discrete[0], lattice: r.lattice[0], continuum: r.continuum[0] });
          check('vegetation', 'flat ground, Dw = ' + f + ' Dw_c: critical mode ' + (f < 1 ? 'decays' : 'grows') + ' (exact discrete rate within 5%)', e, 0.05 * Math.abs(r.discrete[0]), Math.sign(r.sigma) === Math.sign(f - 1) && Math.sign(r.continuum[0]) === Math.sign(f - 1) && e < 0.05 * Math.abs(r.discrete[0]), { measured: r.sigma, discrete: r.discrete[0], continuum: r.continuum[0] });
        }
      }
      // (3) Slope (default v = 40, a = 1.1, Dw = Dn = 1). The fastest-growing mode of the continuum relation
      // grows and travels uphill (+x, against the water): the GPU complex rate must equal the exact discrete one
      // within 1%. Refinement at k = 0.75 k_max (dt set by the advection limit, proportional to h), observed
      // order against the formal order 1 of the upwind water flux, and the extrapolated limit against the continuum.
      {
        const p = { a: 1.1, slope: 40, Dw: 1, Dn: 1 }, lin = vegLin(p.a, p.Dw, p.Dn);
        const kmax = argmaxK(k => vegCont(lin, k, p.slope)[0], 0.01, 3), gC = vegCont(lin, kmax, p.slope), cC = -gC[1] / kmax;
        const peak = await vegMode(p, 32, kmax, 1.5 / gC[0]), relPeak = peak.errDiscrete / C.abs(peak.discrete);
        vg.slope = { params: p, kFastest: kmax, continuum: gC, phaseVelocityContinuum: cC, fastest: { W: 32, dt: peak.dt, measured: [peak.sigma, peak.omega], discrete: peak.discrete, lattice: peak.lattice, phaseVelocity: peak.phaseVelocity, relErrorToDiscrete: relPeak } };
        check('vegetation', 'slope v = 40: fastest mode complex rate equals the exact discrete rate', relPeak, 0.01, relPeak < 0.01, { measured: [peak.sigma, peak.omega], discrete: peak.discrete });
        check('vegetation', 'slope v = 40: fastest mode grows and migrates uphill (+x, against the water)', peak.phaseVelocity, '> 0', gC[0] > 0 && cC > 0 && peak.sigma > 0 && peak.phaseVelocity > 0, { measuredPhaseVelocity: peak.phaseVelocity, continuumPhaseVelocity: cC });
        const kr = 0.75 * kmax, gR = vegCont(lin, kr, p.slope), levels = [];
        for (const W of [16, 32, 64]) { const r = await vegMode(p, W, kr, 1.5 / gR[0]); levels.push({ W, dt: r.dt, sigma: r.sigma, omega: r.omega, discrete: r.discrete, relErrorToDiscrete: r.errDiscrete / C.abs(r.discrete) }); }
        const rs = richardson(levels.map(l => l.sigma)), rw = richardson(levels.map(l => l.omega));
        const limErr = Math.hypot(rs.extrapolated - gR[0], rw.extrapolated - gR[1]) / C.abs(gR);
        vg.slope.refinement = { k: kr, continuum: gR, levels, richardsonSigma: rs, richardsonOmega: rw, extrapolatedRelError: limErr };
        // order band 0.8 to 1.25 around the formal 1 (first-order upwind, dt proportional to h); limit within 1%
        // because a first-order extrapolation from three levels leaves an O(h^2) remainder of that size here.
        check('vegetation', 'slope v = 40, k = 0.75 k_max: observed order of the complex rate (formal 1, upwind) and extrapolated limit = continuum within 1%', rs.order, [0.8, 1.25], [rs.order, rw.order].every(o => o > 0.8 && o < 1.25) && limErr < 0.01, { omegaOrder: rw.order, extrapolatedRelError: limErr });
        const r = await vegMode(p, 32, kmax, 1.5 / gC[0], [['float wx = (e.r - c.r) * u_c;', 'float wx = (w.r - c.r) * u_c;']]);
        control('vegetation', 'water advected the wrong way (downhill becomes +x)', '(e.r - c.r) -> (w.r - c.r)', r.phaseVelocity, '> 0 and within 1% of the discrete rate', !(r.phaseVelocity > 0 && r.errDiscrete / C.abs(r.discrete) < 0.01), { measuredPhaseVelocity: r.phaseVelocity });
      }
      // (4) Water alone (n = 0, a = 0): w_t = v w_x + Dw lap w - w. Exact discrete factor of the
      // semi-implicit upwind step, and the continuum solution cos(k(x + v t)) exp(-(1 + Dw k^2) t):
      // phase velocity -v (downhill), convergence order 1 (upwind).
      {
        const p = { a: 0, slope: 12, Dw: 0.5, Dn: 1 }, Lw = 10, k = TAU / Lw, Tw = 0.3, rows = []; // k v T = 2.26 < pi: phase unambiguous
        for (const W of [32, 64, 128]) {
          const h = Lw / W, dt = Tw / Math.ceil(Tw / Math.min(0.2 * h / p.slope, 0.1 * h * h / p.Dw)), steps = Math.round(Tw / dt);
          const s = Object.assign(await defaults('vegetation'), p, { agrad: 0, m, lap: 5, scale: 1 / h });
          if (dt > await dtMax('vegetation', s)) throw Error('water fixture exceeds ceiling');
          const out = await run({ id: 'vegetation', s, W, H: 2, init: field(W, 2, x => [1e-3 * (1.2 + Math.cos(TAU * x / W)), 0]), dt, steps, snaps: [0, steps] });
          const z0 = modeAmp(out[0].f, W, 2, 0, 1, 0), z1 = modeAmp(out[1].f, W, 2, 0, 1, 0), ratio = C.div(z1, z0);
          const al = TAU / W, sym = [p.slope * (Math.cos(al) - 1) / h + p.Dw * q5(al, 0, h), p.slope * Math.sin(al) / h];
          let G = C.div(C.add([1, 0], [dt * sym[0], dt * sym[1]]), [1 + dt, 0]), Gn = [1, 0]; for (let i = 0; i < steps; i++) Gn = C.mul(Gn, G);
          const cont = [Math.exp(-(1 + p.Dw * k * k) * Tw) * Math.cos(k * p.slope * Tw), Math.exp(-(1 + p.Dw * k * k) * Tw) * Math.sin(k * p.slope * Tw)];
          rows.push({ W, h, dt, steps, measured: ratio, exactDiscrete: Gn, continuum: cont, discreteError: C.abs(C.sub(ratio, Gn)) / C.abs(Gn), continuumError: C.abs(C.sub(ratio, cont)) / C.abs(cont) });
        }
        const ord = orders(rows.map(r => r.continuumError)), worst = Math.max(...rows.map(r => r.discreteError));
        vg.water = { params: p, rows, orders: ord };
        check('vegetation', 'water advection-diffusion-loss: exact discrete mode factor', worst, 2e-5, worst < 2e-5);
        check('vegetation', 'water advection-diffusion-loss: continuum convergence (formal order 1, upwind), phase moving downhill (-x)', ord[1], [0.8, 1.25], ord.every(o => o > 0.8 && o < 1.25) && rows[2].measured[1] > 0);
      }
      report.vegetation = vg;
      process.stderr.write('vegetation ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n');
    }

    report.checks = checks; report.controls = controls;
    report.summary = { checks: checks.length, passed: checks.filter(c => c.pass).length, controls: controls.length, detected: controls.filter(c => c.detected).length };
    report.passed = report.summary.passed === checks.length && report.summary.detected === controls.length;
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, OUT), JSON.stringify(report, null, 2) + '\n');
    const outArg = process.argv.indexOf('--out');
    if (outArg > 0) fs.writeFileSync(process.argv[outArg + 1], JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report.summary));
    for (const c of checks.filter(c => !c.pass)) console.error('FAILED CHECK ' + c.technique + ': ' + c.name + ' value=' + JSON.stringify(c.value) + ' tol=' + JSON.stringify(c.tolerance));
    for (const c of controls.filter(c => !c.detected)) console.error('MISSED CONTROL ' + c.technique + ': ' + c.name);
    if (!report.passed) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
