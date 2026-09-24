'use strict';
// node tools/ising-science.js [--full] [--write]
//
// Validates the ising tab's actual GPU checkerboard Metropolis (ISING_STEP in src/modules/lattice.js)
// by driving the real studio, against three exact results for the square lattice with J = k_B = 1, h = 0:
//
//   1. Yang's spontaneous magnetization, M(T) = (1 - sinh(2/T)^-4)^(1/8) below T_c (Phys. Rev. 85, 808, 1952).
//   2. Onsager's internal energy per site, u(T) = -coth(2K)[1 + (2/pi)(2 tanh^2(2K) - 1) K(k)],
//      K = 1/T, k = 2 sinh(2K)/cosh^2(2K) (Phys. Rev. 65, 117, 1944), above and below T_c.
//   3. Onsager's T_c = 2/ln(1 + sqrt 2), estimated from Binder-cumulant crossings between grid sizes.
//
// A temporary copy of dist/studio.html gains one read-only hook on the ising instance (its own step(),
// sample(), spin texture and GL context), so every sweep below is the tab's own shader, uniforms, random
// ticks and textures. Failure controls inject a wrong acceptance rule (2T for T) and a dropped neighbor
// sum into further copies of the same studio and must fail the same tests. The print section checks that
// the module's PNG and the shell's print export draw exactly the spin state and leave it unchanged, and
// that Studio.exportData() returns the same spins.
//
// Options: --save-series <file> and --load-series <file> keep or reuse the raw series (see below); --plan prints
// the runs, seeds and random windows and exits.
// The default (quick) mode is sized to finish in about ten minutes on a 4-core machine with SwiftShader.
// --full runs longer chains, more seeds, more temperatures and grid sizes, for a long local run; the
// results file records which mode produced it. --write saves validation/results/ising-science.json.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict'), { execSync } = require('node:child_process');
const { chromium } = require('playwright');
const stats = require('../src/shared/stats.js');

const root = path.resolve(__dirname, '..');
const FULL = process.argv.includes('--full'), WRITE = process.argv.includes('--write');
// --save-series <file> keeps the raw m and E series of every run; --load-series <file> re-analyzes them without
// re-running the chains (the print checks still run). A results file written from loaded series says so.
const argAfter = flag => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; };
const SAVE_SERIES = argAfter('--save-series'), LOAD_SERIES = argAfter('--load-series');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const source = read('src/modules/lattice.js'), engine = read('src/shared/engine.js'), statsSource = read('src/shared/stats.js');
const makeRng = new Function(engine.slice(engine.indexOf('  function makeRng'), engine.indexOf('  function makeNoise')) + 'return makeRng;')();

/* ------------------------------------------------------------------------------------------------ */
/* Exact results                                                                                    */
/* ------------------------------------------------------------------------------------------------ */
const TC = 2 / Math.log(1 + Math.SQRT2);
function agm(a, b) {
  for (let i = 0; i < 100 && Math.abs(a - b) > 1e-16 * a; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return (a + b) / 2;
}
// Complete elliptic integral of the first kind by the arithmetic-geometric mean: K(k) = pi / (2 AGM(1, k')).
const ellipticK = k => Math.PI / (2 * agm(1, Math.sqrt(1 - k * k)));
// Onsager's energy as usually printed. At T_c, k = 1 and K(k) diverges against a vanishing factor, so this
// form returns NaN or garbage there; it is kept to check the stable form below away from T_c.
function onsagerUTextbook(T) {
  const K = 1 / T, t = Math.tanh(2 * K), k = 2 * Math.sinh(2 * K) / Math.cosh(2 * K) ** 2;
  return -(1 / Math.tanh(2 * K)) * (1 + (2 / Math.PI) * (2 * t * t - 1) * ellipticK(k));
}
// The same formula rearranged without cancellation. With s = sinh 2K and c = cosh 2K,
// 1 - k^2 = (s^2 - 1)^2 / c^4 exactly, so k' = |s^2 - 1| / c^2, and 2 tanh^2 2K - 1 = (s^2 - 1) / c^2 = sign * k'.
// Then (2/pi)(2 tanh^2 2K - 1) K(k) = sign * k' / AGM(1, k'), which tends to 0 at T_c because
// AGM(1, k') ~ pi / (2 ln(4/k')). Hence u(T_c) = -coth(2 K_c) = -sqrt 2, since sinh(2 K_c) = 1.
function onsagerU(T) {
  const K = 1 / T, s = Math.sinh(2 * K), c = Math.cosh(2 * K), kp = Math.abs(s * s - 1) / (c * c);
  const term = kp === 0 ? 0 : Math.sign(s * s - 1) * kp / agm(1, kp);
  return -(c / s) * (1 + term);
}
// Independent of the elliptic reduction: u = d(beta f)/d(beta) from Onsager's double integral
// -beta f = ln 2 + (1/2 pi^2) int_0^pi int_0^pi ln[cosh^2 2K - sinh 2K (cos a + cos b)] da db,
// differentiated under the integral sign and evaluated by the midpoint rule on an n x n grid.
function onsagerUIntegral(T, n) {
  const K = 1 / T, c = Math.cosh(2 * K), s = Math.sinh(2 * K), s4 = Math.sinh(4 * K), cs = new Float64Array(n);
  for (let i = 0; i < n; i++) cs[i] = Math.cos(Math.PI * (i + 0.5) / n);
  let sum = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const q = cs[i] + cs[j];
    sum += (2 * s4 - 2 * c * q) / (c * c - s * q);
  }
  return -(1 / (2 * Math.PI * Math.PI)) * sum * (Math.PI / n) ** 2;
}
const yangM = T => T < TC ? Math.pow(1 - Math.pow(Math.sinh(2 / T), -4), 1 / 8) : 0;
// Finite-size scales on the periodic L x L lattice. Dual coupling K* = -ln(tanh K) / 2. Above T_c the
// exponential correlation length is 1 / (2 (K* - K)); below T_c the connected correlation length is
// 1 / (4 (K - K*)), and the interface tension is sigma = 2 (K - K*) (Onsager 1944). On a torus the
// corrections to M and u decay like exp(-L / xi) and, below T_c, like L^2 exp(-2 sigma L) from pairs of
// wrapping domain walls. The bound below is an order-of-magnitude estimate, not a rigorous constant.
function finiteSize(T, L) {
  const K = 1 / T, Ks = -0.5 * Math.log(Math.tanh(K));
  if (T < TC) {
    const xi = 1 / (4 * (K - Ks)), sigma = 2 * (K - Ks);
    return { xi, sigma, bound: Math.exp(-L / xi) + L * L * Math.exp(-2 * sigma * L) };
  }
  const xi = 1 / (2 * (Ks - K));
  return { xi, sigma: 0, bound: Math.exp(-L / xi) };
}
const QUALIFY = 1e-6;   // a temperature qualifies when the bound is far below every error bar quoted here

function exactChecks() {
  const out = {};
  // 1. u(T_c) = -sqrt 2 exactly, and the formula is continuous through T_c.
  out.uAtTc = onsagerU(TC);
  out.uAtTcError = Math.abs(out.uAtTc + Math.SQRT2);
  out.uNearTc = [1 - 1e-9, 1 + 1e-9, 1 - 1e-6, 1 + 1e-6].map(f => ({ T: TC * f, u: onsagerU(TC * f) }));
  out.textbookAtTc = String(onsagerUTextbook(TC));
  assert(out.uAtTcError < 1e-14, 'u(T_c) must equal -sqrt 2');
  for (const r of out.uNearTc) assert(Math.abs(r.u + Math.SQRT2) < 1e-4, 'u must be continuous at T_c');
  // 2. The AGM against direct quadrature of K(k) = int_0^{pi/2} (1 - k^2 sin^2 t)^-1/2 dt.
  out.elliptic = [0.3, 0.8, 0.99, 0.9999].map(k => {
    const n = 200000; let s = 0;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) * (Math.PI / 2) / n; s += 1 / Math.sqrt(1 - k * k * Math.sin(t) ** 2); }
    const quad = s * (Math.PI / 2) / n, a = ellipticK(k);
    return { k, agm: a, quadrature: quad, relError: Math.abs(a - quad) / quad };
  });
  for (const r of out.elliptic) assert(r.relError < 1e-8, 'AGM elliptic integral disagrees with quadrature');
  // 3. The closed form against the textbook form and against Onsager's double integral.
  out.energy = [1.2, 1.5, 1.8, 2.0, 2.1, 2.2, 2.5, 3.0, 4.0].map(T => {
    const u = onsagerU(T), text = onsagerUTextbook(T), integral = onsagerUIntegral(T, 1200);
    return { T, u, textbook: text, integral, textbookError: Math.abs(u - text), integralError: Math.abs(u - integral) };
  });
  for (const r of out.energy) assert(r.textbookError < 1e-12 && r.integralError < 1e-9, 'Onsager energy forms disagree at T = ' + r.T);
  out.integralAtTc = onsagerUIntegral(TC, 4000);
  out.integralAtTcError = Math.abs(out.integralAtTc + Math.SQRT2);
  assert(out.integralAtTcError < 1e-3, 'double integral must approach -sqrt 2 at T_c');
  // 4. Low-temperature expansions (single flipped spins): M = 1 - 2 z^4 - 8 z^6 + O(z^8), u = -2 + 8 z^4 + O(z^6), z = e^{-2K}.
  out.lowT = [0.6, 0.8].map(T => {
    const z = Math.exp(-2 / T), M = yangM(T), u = onsagerU(T);
    return { T, M, series: 1 - 2 * z ** 4 - 8 * z ** 6, Merror: Math.abs(M - (1 - 2 * z ** 4 - 8 * z ** 6)), z8: z ** 8,
      u, useries: -2 + 8 * z ** 4, uerror: Math.abs(u - (-2 + 8 * z ** 4)), z6: z ** 6 };
  });
  for (const r of out.lowT) assert(r.Merror < 60 * r.z8 && r.uerror < 60 * r.z6, 'low-temperature series disagree');
  out.yangAtTc = yangM(TC * (1 - 1e-12));
  assert(out.yangAtTc < 0.1 && yangM(TC) === 0, 'Yang magnetization must vanish at T_c');
  return out;
}

/* ------------------------------------------------------------------------------------------------ */
/* Plan                                                                                             */
/* ------------------------------------------------------------------------------------------------ */
// Sweeps are counted in full sweeps (both checkerboard colors). `every` is the sampling interval in sweeps;
// it divides 24 so the tab's own |m| series (sampled every 24 sweeps) lines up with ours.
const PLAN = FULL ? {
  mode: 'full', pack: true,
  yang: [{ L: 128, T: [1.5, 1.8, 2.0, 2.1, 2.2], seeds: 3, burn: 2000, sweeps: 50000, every: 4 },
    { L: 256, T: [2.1, 2.2], seeds: 3, burn: 3000, sweeps: 50000, every: 8 }],
  above: [{ L: 128, T: [2.4, 2.5, 3.0], seeds: 3, burn: 2000, sweeps: 30000, every: 4 },
    { L: 256, T: [2.4, 2.5], seeds: 3, burn: 2000, sweeps: 30000, every: 8 }],
  controls: { L: 128, burn: 500, sweeps: 4000, every: 4 },
  // One long chain per size: the Binder windows must be disjoint from each other (see Random streams), and
  // at these lengths three sizes only fit as single chains. Expected tau_int(m^2) is about 570, 1400 and 2500 sweeps.
  binder: { T0: 2.27, sizes: [{ L: 128, seeds: 1, burn: 10000, sweeps: 240000, every: 8 },
    { L: 192, seeds: 1, burn: 15000, sweeps: 360000, every: 12 }, { L: 256, seeds: 1, burn: 30000, sweeps: 600000, every: 24 }], reps: 500 },
  print: { grid: 256, sweeps: 500 },
} : {
  mode: 'quick',
  yang: [{ L: 128, T: [1.5, 1.8, 2.0, 2.1], seeds: 1, burn: 1000, sweeps: 8000, every: 4 }],
  above: [{ L: 128, T: [2.5, 3.0], seeds: 1, burn: 1000, sweeps: 6000, every: 4 }],
  controls: { L: 128, burn: 500, sweeps: 2000, every: 4 },
  binder: { T0: 2.27, sizes: [{ L: 128, seeds: 1, burn: 4000, sweeps: 40000, every: 8 },
    { L: 192, seeds: 1, burn: 6000, sweeps: 28000, every: 12 }], reps: 400 },
  print: { grid: 256, sweeps: 500 },
};
const Z_PASS = 3.5;   // two-sided p = 4.7e-4 per comparison; about 1% family-wise over the quick plan

/* ------------------------------------------------------------------------------------------------ */
/* Random streams                                                                                   */
/* ------------------------------------------------------------------------------------------------ */
// The tab's random number for site x at tick t is a hash of (x, t), and tick = tick0 + 2 * sweep + parity with
// tick0 = makeRng(seed + '/ising/tick').int(0, 1e6). Different seeds therefore read windows of ONE hash
// sequence: two runs whose tick0 differ by an even offset smaller than twice their length reuse the same
// random numbers at the same sites, at a time lag, and coupled Metropolis chains can coalesce. A site of
// color q is only updated at ticks of parity tick0 + q, so windows with tick0 of opposite parity never share
// a number. Every run here gets a seed whose window [tick0, tick0 + 2 sweeps) is disjoint from every other
// run of the same parity class: globally when that fits, otherwise within its statistical group (runs that
// are pooled or compared as independent). The scope reached is recorded per run.
// That describes the shared stream. Since recipe v3 the tab folds a per-seed key into the hash
// (siteHashKeyed), so different seeds no longer share numbers; the runs here load v3 recipes, and the disjoint
// windows are kept as a second guard. streamCheck() below shows both behaviors directly.
const windows = [];
function allocate(label, group, sweeps) {
  const len = 2 * sweeps, free = (t0, scope) => !windows.some(w => (scope === 'global' || w.group === group) &&
    (w.tick0 & 1) === (t0 & 1) && t0 < w.tick0 + w.len && w.tick0 < t0 + len);
  const take = (seed, tick0, scope) => { windows.push({ label, group, tick0, len, seed, scope }); return { seed, tick0, scope }; };
  const candidate = k => { const seed = 'ising-science/' + label + '/' + k; return { seed, tick0: makeRng(seed + '/ising/tick').int(0, 1e6) }; };
  for (const scope of ['global', 'group']) {
    // Quick mode takes the first seed that fits. The full plan's windows are long enough (up to 1.3 million
    // ticks against a tick0 range of one million) that they must be packed from the left: of 300,000 candidate
    // seeds, the one with the smallest tick0 that fits.
    if (!PLAN.pack) {
      for (let k = 0; k < 400000; k++) { const c = candidate(k); if (free(c.tick0, scope)) return take(c.seed, c.tick0, scope); }
    } else {
      let best = null;
      for (let k = 0; k < 300000; k++) { const c = candidate(k); if ((!best || c.tick0 < best.tick0) && free(c.tick0, scope)) best = c; }
      if (best) return take(best.seed, best.tick0, scope);
    }
  }
  throw Error('No disjoint random window for ' + label + ' (' + sweeps + ' sweeps)');
}
function planRuns() {
  const runs = [];
  const add = (kind, group, L, T, init, seedIx, spec, mutant) => runs.push({ kind, group, L, T, init, seedIx, mutant: mutant || null,
    burn: spec.burn, sweeps: spec.burn + spec.sweeps, every: spec.every, label: [kind, mutant || 'tab', 'L' + L, 'T' + T, 's' + seedIx].join('-') });
  for (const b of PLAN.binder.sizes) for (let i = 0; i < b.seeds; i++) add('binder', 'binder', b.L, PLAN.binder.T0, 'cold', i, b);
  for (const y of PLAN.yang) for (const T of y.T) for (let i = 0; i < y.seeds; i++) add('below', 'L' + y.L + '-T' + T, y.L, T, 'cold', i, y);
  for (const a of PLAN.above) for (const T of a.T) for (let i = 0; i < a.seeds; i++) add('above', 'L' + a.L + '-T' + T, a.L, T, 'hot', i, a);
  for (const mutant of ['twoT', 'noNeighbors']) {
    add('control', 'control', PLAN.controls.L, 2.0, 'cold', 0, PLAN.controls, mutant);
    add('control', 'control', PLAN.controls.L, 2.5, 'hot', 0, PLAN.controls, mutant);
  }
  // Longest windows first, so the packing of the tick range is easiest.
  for (const r of runs.slice().sort((a, b) => b.sweeps - a.sweeps)) Object.assign(r, allocate(r.label, r.group, r.sweeps));
  return runs;
}

/* ------------------------------------------------------------------------------------------------ */
/* Studio copies                                                                                    */
/* ------------------------------------------------------------------------------------------------ */
const ANCHOR = '        // The spin configuration and the |m| time series behind the printed error bar, for research use.';
const HOOK = '        auditHook() { return { step, stop, sample, gl, texType, target: () => C.read, size: () => [gw, gh], ' +
  'sweeps: () => sweeps, tick0: () => tick0, series: () => mSeries.slice() }; },\n';
const MUTANTS = {
  // Acceptance exp(-dE / 2T): the chain then samples the Boltzmann distribution at 2T, not T.
  twoT: ['if (dE <= 0.0 || r < exp(-dE / u_T)) s = -s;', 'if (dE <= 0.0 || r < exp(-dE / (2.0 * u_T))) s = -s;'],
  // The neighbor sum is dropped from the energy change: at h = 0 every proposal is accepted.
  noNeighbors: ['float dE = 2.0 * s * (nb + h);', 'float dE = 2.0 * s * h;'],
};
const dist = read('dist/studio.html');
assert.equal(dist.split(source).length, 2, 'dist/studio.html must embed the current src/modules/lattice.js once; run node tools/build.js');
assert.equal(source.split(ANCHOR).length, 2, 'hook anchor');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ising-science-'));
function studioCopy(mutant) {
  let mod = source.replace(ANCHOR, HOOK + ANCHOR);
  if (mutant) {
    const [from, to] = MUTANTS[mutant];
    assert.equal(mod.split(from).length, 2, 'mutation anchor for ' + mutant);
    mod = mod.replace(from, to);
  }
  const html = dist.replace(source, mod).replace('generatePalette, register, boot,', 'generatePalette, register, auditInstances: () => instances, boot,');
  assert(html.includes('auditInstances: () => instances'), 'instance hook');
  const file = path.join(tmp, (mutant || 'tab') + '.html');
  fs.writeFileSync(file, html);
  return file;
}

// Runs in the page. Steps the tab's own chain with its own step() and sample(), and after every `every`
// sweeps reads the float spin texture back and computes m and the bond energy per site independently.
const PAGE_RUNNER = () => {
  window.isingAudit = {
    hook() { return Studio.auditInstances().ising.inst.auditHook(); },
    run(n, every) {
      const H = this.hook(), gl = H.gl, [W, Ht] = H.size(), N = W * Ht;
      if (H.texType !== 'rgba32f') throw Error('this benchmark reads float32 spins; the device fell back to ' + H.texType);
      const buf = this.buf && this.buf.length === 4 * N ? this.buf : (this.buf = new Float32Array(4 * N));
      const s = new Int8Array(N), out = { sweep: [], m: [], e: [] };
      H.stop();
      for (let done = 0; done < n; done += every) {
        H.step(every); H.sample();
        gl.bindFramebuffer(gl.FRAMEBUFFER, H.target().fbo);
        gl.readPixels(0, 0, W, Ht, gl.RGBA, gl.FLOAT, buf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        let sum = 0, bonds = 0;
        for (let i = 0; i < N; i++) { s[i] = buf[4 * i] >= 0 ? 1 : -1; sum += s[i]; }
        for (let y = 0; y < Ht; y++) {
          const row = y * W, up = ((y + 1) % Ht) * W;
          for (let x = 0; x < W; x++) { const v = s[row + x]; bonds += v * (s[row + (x + 1) % W] + s[up + x]); }
        }
        out.sweep.push(H.sweeps()); out.m.push(sum / N); out.e.push(-bonds / N);
      }
      return out;
    },
    // Spins as a string of '1' (up) and '0' (down), row 0 at the top of the plate as exportData() and the PNG use.
    spins() {
      const H = this.hook(), [W, Ht] = H.size(), f = Studio.gl.readTarget(H.target()), out = new Array(W * Ht);
      for (let i = 0; i < W * Ht; i++) out[i] = f[4 * i] >= 0 ? '1' : '0';
      return { W, H: Ht, spins: out.join(''), sweeps: H.sweeps(), series: H.series() };
    },
    info() {
      const H = this.hook(), gl = H.gl, dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return { texType: H.texType, tick0: H.tick0(), sweeps: H.sweeps(), size: H.size(),
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
    },
  };
};
const BROWSER_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function openStudio(browser, file) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:/, r => r.abort());
  await page.goto('file://' + file + '#ising/ising-science-boot');
  await page.evaluate(() => Studio.ready);
  await page.evaluate(PAGE_RUNNER);
  return { page, errors };
}
async function loadRecipe(page, seed, params, v = 3) {
  // The seed is URI-encoded and the payload is URL-safe base64, as the engine's own links are. Recipe v3 selects
  // the keyed random stream; a v2 recipe keeps the shared stream it was made on (legacy).
  await page.evaluate(({ seed, params, v }) => {
    const b64 = btoa(JSON.stringify(Object.assign({}, params, { v }))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    location.hash = 'ising/' + encodeURIComponent(seed) + '/' + b64;
  }, { seed, params, v });
  await page.waitForFunction(({ seed, L }) => {
    const r = Studio.getRecipe('ising'), e = Studio.auditInstances().ising;
    return r && r.seed === seed && e && e.inst && e.inst.auditHook && e.inst.auditHook().size()[0] === L && e.inst.auditHook().sweeps() === 0;
  }, { seed, L: params.grid });
  // The recipe payload names only what differs from the defaults, so the effective state is checked.
  const state = await page.evaluate(() => JSON.parse(JSON.stringify(Studio.auditInstances().ising.state)));
  for (const k of Object.keys(params)) assert.deepEqual(state[k], params[k], 'recipe key ' + k + ' did not survive sanitize');
  return state;
}
const measureParams = (L, T, init) => ({ grid: L, aspect: '1:1', T, h: 0, hMode: 'uniform', init, running: false, warmup: 0, steps: 1 });

async function simulate(page, run) {
  await loadRecipe(page, run.seed, measureParams(run.L, run.T, run.init));
  const info = await page.evaluate(() => isingAudit.info());
  assert.equal(info.tick0, run.tick0, 'tick0 computed in Node must match the tab');
  const series = { sweep: [], m: [], e: [] }, chunk = Math.max(run.every, Math.round(1.5e7 / (run.L * run.L)) * run.every);
  const t0 = Date.now();
  for (let done = 0; done < run.sweeps; done += chunk) {
    const n = Math.min(chunk, run.sweeps - done), part = await page.evaluate(([n, every]) => isingAudit.run(n, every), [n, run.every]);
    for (const k of Object.keys(series)) series[k].push(...part[k]);
  }
  const tab = await page.evaluate(() => isingAudit.spins());
  return { series, seconds: (Date.now() - t0) / 1000, info, tabSeries: tab.series };
}

/* ------------------------------------------------------------------------------------------------ */
/* Analysis                                                                                         */
/* ------------------------------------------------------------------------------------------------ */
const finite = x => Number.isFinite(x) ? x : x === Infinity ? 'Infinity' : x === -Infinity ? '-Infinity' : null;
const zOf = (mean, se, exact) => se > 0 ? (mean - exact) / se : mean === exact ? 0 : (mean > exact ? Infinity : -Infinity);
function analyzeSeries(sim, run) {
  const keep = sim.series.sweep.map((s, i) => s > run.burn ? i : -1).filter(i => i >= 0);
  const absm = keep.map(i => Math.abs(sim.series.m[i])), e = keep.map(i => sim.series.e[i]);
  const one = (x, exact) => {
    const r = stats.seriesMean(x), z = zOf(r.mean, r.se, exact);
    return { mean: r.mean, se: r.se, tauSweeps: r.tau * run.every, nEff: r.nEff, n: r.n, reliable: r.reliable, exact, z: finite(z),
      pass: r.reliable && Math.abs(z) <= Z_PASS };
  };
  // The tab's own |m| series (sampled every 24 sweeps by sample()) must equal ours at the same sweeps.
  const byS = new Map(sim.series.sweep.map((s, i) => [s, Math.abs(sim.series.m[i])]));
  let tabMatches = 0, tabMismatches = 0;
  sim.tabSeries.forEach((v, j) => { const ours = byS.get(24 * (j + 1)); if (ours === undefined) return; if (ours === v) tabMatches++; else tabMismatches++; });
  const half = sim.tabSeries.slice(Math.floor(sim.tabSeries.length / 2)), tw = half.length >= 20 ? stats.seriesMean(half) : null;
  return {
    absM: one(absm, yangM(run.T)), energy: one(e, onsagerU(run.T)),
    tabSeries: { samples: sim.tabSeries.length, matchedOurs: tabMatches, mismatched: tabMismatches,
      tabWitness: tw && { mean: tw.mean, se: tw.se, reliable: tw.reliable, note: 'what the status line would print: second half of the tab series, tau_int error' } },
  };
}
// Several independent seeds of one (L, T): the mean of the per-seed means, with the per-seed errors propagated,
// and the chi-square of the seed means about it as a check that the tau_int errors are not too small.
function pool(rows, key, exact) {
  const xs = rows.map(r => r[key]);
  if (xs.length === 1) return Object.assign({ seeds: 1 }, xs[0]);
  const mean = stats.mean(xs.map(x => x.mean)), se = Math.sqrt(xs.reduce((s, x) => s + x.se * x.se, 0)) / xs.length;
  const chi2 = xs.reduce((s, x) => s + ((x.mean - mean) / x.se) ** 2, 0), z = zOf(mean, se, exact), reliable = xs.every(x => x.reliable);
  return { seeds: xs.length, mean, se, exact, z: finite(z), reliable, chi2, dof: xs.length - 1, pass: reliable && Math.abs(z) <= Z_PASS,
    perSeed: xs.map(x => ({ mean: x.mean, se: x.se, tauSweeps: x.tauSweeps, nEff: x.nEff, z: x.z })) };
}

// Binder cumulant U = 1 - <m^4> / (3 <m^2>^2), reweighted from the simulation temperature T0 to nearby T
// (Ferrenberg and Swendsen, Phys. Rev. Lett. 61, 2635, 1988): weights exp(-(1/T - 1/T0) E_total).
function binderAt(d, idx, T) {
  // Energies are shifted by their mean, so the exponent stays within a few units over the trusted range.
  const db = 1 / T - 1 / d.T0;
  let w = 0, w2 = 0, a2 = 0, a4 = 0;
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k], x = Math.exp(-db * (d.E[i] - d.Emean));
    w += x; w2 += x * x; a2 += x * d.m2[i]; a4 += x * d.m4[i];
  }
  return { U: 1 - (a4 / w) / (3 * (a2 / w) ** 2), weightFraction: w * w / w2 / idx.length };
}
// The root of f nearest T0 inside the trusted range [lo, hi]. When f has no root there, the root of its chord
// through the two range ends is returned and flagged as extrapolated: the Binder curves are close to linear
// across the scaling window, and the bootstrap carries that estimator too, so its spread shows the cost.
function solve(f, lo, hi) {
  const grid = 24, T0 = (lo + hi) / 2, flo = f(lo);
  let best = null, fa = flo;
  for (let k = 1; k <= grid; k++) {
    const a = lo + (hi - lo) * (k - 1) / grid, b = lo + (hi - lo) * k / grid, fb = f(b);
    if (fa === 0 || fa * fb < 0) {
      let x = a, y = b, fx = fa;
      for (let it = 0; it < 40; it++) { const mid = (x + y) / 2, fm = f(mid); if (fx * fm <= 0) y = mid; else { x = mid; fx = fm; } }
      const T = (x + y) / 2;
      if (best === null || Math.abs(T - T0) < Math.abs(best - T0)) best = T;
    }
    fa = fb;
  }
  if (best !== null) return { T: best, extrapolated: false };
  const fhi = fa;
  return fhi === flo ? null : { T: lo - flo * (hi - lo) / (fhi - flo), extrapolated: true };
}
// Model-free: where U_L1(T) = U_L2(T). Fixed point: where U_L(T) = U*, the universal value at T_c on the
// periodic square, which assumes the Ising universality class and a torus but no knowledge of T_c.
const crossing = (d1, i1, d2, i2, lo, hi) => solve(T => binderAt(d1, i1, T).U - binderAt(d2, i2, T).U, lo, hi);
const fixedPoint = (d, i, lo, hi) => solve(T => binderAt(d, i, T).U - U_STAR, lo, hi);
const U_STAR = 0.61069;
// An estimate whose bootstrap standard error exceeds this (0.2% of T_c) is reported but called inconclusive.
const CONCLUSIVE_SE = 0.005;
// Circular moving-block resampling, the scheme of stats.blockBootstrap, applied jointly to the (m, E) pairs.
function resample(n, b, rng) {
  const out = new Array(n);
  for (let k = 0; k < n;) { const start = Math.floor(rng() * n); for (let j = 0; j < b && k < n; j++) out[k++] = (start + j) % n; }
  return out;
}
function analyzeBinder(binderRuns) {
  const T0 = PLAN.binder.T0, sizes = [...new Set(binderRuns.map(r => r.L))].sort((a, b) => a - b), data = {};
  for (const L of sizes) {
    // Seeds of one size are pooled; each seed keeps its own index range so blocks never straddle two chains.
    const m2 = [], m4 = [], E = [], parts = [];
    for (const r of binderRuns.filter(r => r.L === L)) {
      const keep = r.sim.series.sweep.map((s, i) => s > r.burn ? i : -1).filter(i => i >= 0), start = m2.length;
      for (const i of keep) { const m = r.sim.series.m[i]; m2.push(m * m); m4.push(m ** 4); E.push(r.sim.series.e[i] * L * L); }
      const sq = keep.map(i => r.sim.series.m[i] ** 2), t = stats.tauInt(sq), h = Math.floor(sq.length / 2);
      // Equilibration check: <m^2> over the first and second halves of the kept samples, with tau_int errors.
      const a = stats.seriesMean(sq.slice(0, h)), b = stats.seriesMean(sq.slice(h));
      parts.push({ start, n: keep.length, tau: t.tau, reliable: t.reliable, every: r.every, seed: r.seed,
        halves: { first: a.mean, firstSe: a.se, second: b.mean, secondSe: b.se, z: (a.mean - b.mean) / Math.hypot(a.se, b.se) } });
    }
    const all = m2.map((_, i) => i), sdE = Math.sqrt(stats.variance(E));
    const tauSweeps = parts.map(p => p.tau * p.every);
    data[L] = { L, T0, m2, m4, E, Emean: stats.mean(E), parts, sdE, range: T0 * T0 / sdE, direct: 0, tauSweeps };
    data[L].direct = binderAt(data[L], all, T0).U;
  }
  // Reweighting is trusted over |1/T - 1/T0| <= 1 / sd(E_total) of the largest lattice (one histogram width).
  const range = Math.min(...sizes.map(L => data[L].range)), lo = T0 - range, hi = T0 + range;
  const pairs = [];
  for (let a = 0; a < sizes.length; a++) for (let b = a + 1; b < sizes.length; b++) pairs.push([sizes[a], sizes[b]]);
  const idx = L => data[L].parts.flatMap(p => Array.from({ length: p.n }, (_, i) => p.start + i));
  const est = pairs.map(([p, q]) => crossing(data[p], idx(p), data[q], idx(q), lo, hi));
  const fp = sizes.map(L => fixedPoint(data[L], idx(L), lo, hi));
  const rng = stats.seeded('ising-science/binder-bootstrap'), reps = PLAN.binder.reps;
  const draws = pairs.map(() => []), fpDraws = sizes.map(() => []), pairReps = [], fpReps = [];
  const extrapolated = pairs.map(() => 0), fpExtrapolated = sizes.map(() => 0);
  for (let r = 0; r < reps; r++) {
    const ix = {};
    for (const L of sizes) ix[L] = data[L].parts.flatMap(p => {
      const b = Math.max(1, Math.round(Math.max(2 * p.tau, Math.cbrt(p.n))));
      return resample(p.n, b, rng).map(i => p.start + i);
    });
    const c = pairs.map(([p, q]) => crossing(data[p], ix[p], data[q], ix[q], lo, hi));
    c.forEach((v, k) => { if (v) { draws[k].push(v.T); if (v.extrapolated) extrapolated[k]++; } });
    if (c.every(Boolean)) pairReps.push(c.map(v => v.T));
    const f = sizes.map(L => fixedPoint(data[L], ix[L], lo, hi));
    f.forEach((v, k) => { if (v) { fpDraws[k].push(v.T); if (v.extrapolated) fpExtrapolated[k]++; } });
    if (f.every(Boolean)) fpReps.push(f.map(v => v.T));
  }
  // Several pairs or sizes are combined with inverse-variance weights fixed from their own bootstrap spreads;
  // the same weights are applied inside every draw, so the combined spread keeps the correlations.
  // A size whose tau_int is not reliable (run shorter than 50 tau_int) has a block length, and so an error bar,
  // that may be too small; it is reported but gets zero weight, and so does every pair that uses it.
  const reliable = L => data[L].parts.every(p => p.reliable);
  const weights = (ds, ok) => { const w = ds.map((d, k) => ok[k] && d.length > 1 ? 1 / stats.variance(d) : 0), t = w.reduce((a, b) => a + b, 0); return t > 0 ? w.map(x => x / t) : null; };
  const wPair = weights(draws, pairs.map(([p, q]) => reliable(p) && reliable(q))), wFp = weights(fpDraws, sizes.map(reliable));
  const dot = (w, xs) => xs.reduce((a, x, k) => a + (w[k] ? w[k] * x : 0), 0);
  const combined = wPair ? pairReps.map(xs => dot(wPair, xs)) : [], fpCombined = wFp ? fpReps.map(xs => dot(wFp, xs)) : [];
  // The bootstrap standard error is the z denominator. With chord extrapolation the draws can be heavy-tailed,
  // so the half-width of the central 68% is reported beside it.
  const summary = (xs, point, extrap) => {
    const s = xs.slice().sort((a, b) => a - b), q = f => s[Math.min(s.length - 1, Math.max(0, Math.round(f * (s.length - 1))))];
    const se = xs.length > 1 ? stats.sd(xs) : NaN, z = point === null ? null : zOf(point, se, TC), conclusive = point !== null && xs.length >= 0.95 * reps && se <= CONCLUSIVE_SE;
    return { estimate: point, se, halfWidth68: (q(0.84) - q(0.16)) / 2, lo95: q(0.025), hi95: q(0.975), draws: xs.length,
      extrapolatedDraws: extrap, z: finite(z), conclusive, pass: conclusive ? Math.abs(z) <= Z_PASS : null };
  };
  const pairRows = pairs.map(([p, q], k) => {
    const c = est[k], u = c && !c.extrapolated ? binderAt(data[p], idx(p), c.T) : null;
    return Object.assign({ sizes: [p, q], extrapolated: c ? c.extrapolated : null, binderAtCrossing: u && u.U,
      weightFractionAtCrossing: u && u.weightFraction }, summary(draws[k], c && c.T, extrapolated[k]));
  });
  const mean = (xs, w) => w && xs.every(Boolean) ? dot(w, xs.map(v => v.T)) : null;
  return {
    T0, exact: TC, reweightRange: [lo, hi], reps, conclusiveSe: CONCLUSIVE_SE,
    sizes: sizes.map((L, k) => ({ L, samples: data[L].m2.length, seeds: data[L].parts.map(p => p.seed), tauM2Sweeps: data[L].tauSweeps,
      tauReliable: data[L].parts.map(p => p.reliable), m2Halves: data[L].parts.map(p => p.halves), binderAtT0: data[L].direct, sdEnergyTotal: data[L].sdE,
      binderAtT0Se: stats.sd(sizesBootstrapU(data[L], L, reps)),
      curve: [-1, -0.5, 0, 0.5, 1].map(f => { const T = T0 + f * range; return { T, U: binderAt(data[L], idx(L), T).U }; }),
      fixedPoint: Object.assign({ extrapolated: fp[k] ? fp[k].extrapolated : null }, summary(fpDraws[k], fp[k] && fp[k].T, fpExtrapolated[k])) })),
    crossing: { method: 'model-free: U_L1(T) = U_L2(T); pairs combined with inverse-variance weights, bootstrapped jointly', weights: wPair, pairs: pairRows,
      combined: summary(combined, mean(est, wPair), null) },
    fixedPoint: { method: 'U_L(T) = U* with U* = ' + U_STAR + ' (assumes the Ising universality class on the periodic square); sizes combined with inverse-variance weights',
      weights: wFp,
      reference: 'Kamieniarz and Bloete, J. Phys. A 26, 201 (1993), <m^2>^2/<m^4> = 0.856216 at T_c on the periodic square; Salas and Sokal, J. Stat. Phys. 98, 551 (2000)',
      combined: summary(fpCombined, mean(fp, wFp), null) },
  };
}
// Block-bootstrap standard error of U at T0 for one size (the same scheme as above, its own seeded stream).
function sizesBootstrapU(d, L, reps) {
  const rng = stats.seeded('ising-science/binder-u/' + L), out = [];
  for (let r = 0; r < reps; r++) {
    const ix = d.parts.flatMap(p => resample(p.n, Math.max(1, Math.round(Math.max(2 * p.tau, Math.cbrt(p.n)))), rng).map(i => p.start + i));
    out.push(binderAt(d, ix, d.T0).U);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ */
/* Print                                                                                            */
/* ------------------------------------------------------------------------------------------------ */
// Minimal readers for the uncompressed .npz (a stored zip) and the .npy inside it.
function unzipStored(buf) {
  const out = {};
  for (let p = 0; p + 30 <= buf.length && buf.readUInt32LE(p) === 0x04034b50;) {
    const method = buf.readUInt16LE(p + 8), size = buf.readUInt32LE(p + 18), nameLen = buf.readUInt16LE(p + 26), extra = buf.readUInt16LE(p + 28);
    assert.equal(method, 0, 'npz members are stored, not deflated');
    const name = buf.toString('utf8', p + 30, p + 30 + nameLen), start = p + 30 + nameLen + extra;
    out[name] = buf.subarray(start, start + size); p = start + size;
  }
  return out;
}
function readNpy(buf) {
  assert.equal(buf.toString('latin1', 1, 6), 'NUMPY');
  const major = buf[6], hl = major === 1 ? buf.readUInt16LE(8) : buf.readUInt32LE(8), off = major === 1 ? 10 : 12;
  const header = buf.toString('latin1', off, off + hl), shape = header.match(/'shape':\s*\(([^)]*)\)/)[1].split(',').map(s => s.trim()).filter(Boolean).map(Number);
  return { descr: header.match(/'descr':\s*'([^']+)'/)[1], shape, data: buf.subarray(off + hl) };
}
// In the page: decode a PNG blob and compare every pixel with the spin of the cell under its center.
const PIXEL_CHECK = async ({ url, W, H, spins, shift }) => {
  const blob = await (await fetch(url)).blob(), bmp = await createImageBitmap(blob), w = bmp.width, h = bmp.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0); bmp.close();
  const px = ctx.getImageData(0, 0, w, h).data, ink = { '1': new Map(), '-1': new Map() };
  let ambiguous = 0, checked = 0;
  const cellOf = (i, n, cells) => { const u = (i + 0.5) / n * cells, f = u - Math.floor(u); return (f < 1e-3 || f > 1 - 1e-3) ? -1 : Math.floor(u); };
  const cols = Array.from({ length: w }, (_, i) => cellOf(i, w, W)), rows = Array.from({ length: h }, (_, i) => cellOf(i, h, H));
  for (let y = 0; y < h; y++) {
    const cy = rows[y]; if (cy < 0) { ambiguous += w; continue; }
    for (let x = 0; x < w; x++) {
      const cx = cols[x]; if (cx < 0) { ambiguous++; continue; }
      const s = spins[((cy + shift) % H) * W + (cx + shift) % W] === '1' ? '1' : '-1', k = 4 * (y * w + x);
      const key = px[k] + ',' + px[k + 1] + ',' + px[k + 2];
      ink[s].set(key, (ink[s].get(key) || 0) + 1); checked++;
    }
  }
  const top = m => [...m.entries()].sort((a, b) => b[1] - a[1]);
  const up = top(ink['1']), down = top(ink['-1']), upInk = up[0] && up[0][0], downInk = down[0] && down[0][0];
  const wrong = checked - (up[0] ? up[0][1] : 0) - (down[0] ? down[0][1] : 0);
  return { width: w, height: h, bytes: blob.size, checked, ambiguous, upInk, downInk, distinctInks: upInk !== downInk,
    wrongPixels: wrong + (upInk === downInk ? checked : 0) };
};

// Random streams. On the shared stream (recipes before v3) every seed reads a window of one hash sequence,
// tick = tick0 + 2 sweep + parity with tick0 = makeRng(seed + '/ising/tick').int(0, 1e6), so two seeds with the
// same tick0 draw the same numbers. From a cold start (the same initial state) such a pair must run identical
// chains on the shared stream, which shows the check can see the overlap, and independent chains on the keyed
// stream of a v3 recipe: at T = 3, well above T_c, independent chains agree on about half the sites.
const STREAM_SWEEPS = 300;
async function streamCheck(browser) {
  const byTick = new Map();
  let pair = null;
  for (let k = 0; k < 200000 && !pair; k++) {
    const seed = 'ising-science/stream/' + k, t = makeRng(seed + '/ising/tick').int(0, 1e6);
    if (byTick.has(t)) pair = { seeds: [byTick.get(t), seed], tick0: t }; else byTick.set(t, seed);
  }
  assert(pair, 'no two seeds share a tick0');
  const { page, errors } = await openStudio(browser, studioCopy());
  const params = { grid: 128, aspect: '1:1', T: 3, h: 0, hMode: 'uniform', init: 'cold', running: false, warmup: 0, steps: 1 };
  const out = { seeds: pair.seeds, tick0: pair.tick0, L: 128, T: 3, sweeps: STREAM_SWEEPS };
  for (const v of [2, 3]) {
    const spins = [], streams = [], ticks = [];
    for (const seed of pair.seeds) {
      const state = await loadRecipe(page, seed, params, v);
      streams.push(state.stream);
      ticks.push((await page.evaluate(() => isingAudit.info())).tick0);
      await page.evaluate(n => isingAudit.run(n, n), STREAM_SWEEPS);
      spins.push((await page.evaluate(() => isingAudit.spins())).spins);
    }
    let same = 0;
    for (let i = 0; i < spins[0].length; i++) if (spins[0][i] === spins[1][i]) same++;
    out['v' + v] = { streams, tick0: ticks, agreement: same / spins[0].length };
  }
  assert.deepEqual(errors, [], 'page errors in the stream check');
  out.sharedOverlapSeen = out.v2.streams.every(x => x === 'shared') && out.v2.tick0[0] === out.v2.tick0[1] && out.v2.agreement === 1;
  out.keyedIndependent = out.v3.streams.every(x => x === 'keyed') && Math.abs(out.v3.agreement - 0.5) < 0.05;
  out.pass = out.sharedOverlapSeen && out.keyedIndependent;
  await page.close();
  return out;
}

async function printEvidence(browser) {
  const t0 = Date.now(), { page, errors } = await openStudio(browser, studioCopy(null)), P = PLAN.print;
  const run = { seed: allocate('print', 'print', P.sweeps).seed };
  const params = Object.assign({}, measureParams(P.grid, 2.27, 'hot'), { view: 'spins', pixelate: true });
  await loadRecipe(page, run.seed, params);
  await page.evaluate(n => isingAudit.run(n, 4), P.sweeps);
  const recipe = await page.evaluate(() => JSON.stringify(Studio.getRecipe('ising')));
  const before = await page.evaluate(() => isingAudit.spins());
  // 1. The module's own PNG at 8 in x 300 ppi: every pixel against the spin under it, then a displaced control.
  const url = await page.evaluate(async () => URL.createObjectURL(await Studio.auditInstances().ising.inst.exportPNG(2400, 2400)));
  const module = await page.evaluate(PIXEL_CHECK, { url, W: before.W, H: before.H, spins: before.spins, shift: 0 });
  const displaced = await page.evaluate(PIXEL_CHECK, { url, W: before.W, H: before.H, spins: before.spins, shift: 1 });
  // 2. Studio.exportData(): the npz must hold exactly these spins, top row first, with matching metadata.
  const b64 = await page.evaluate(async () => { const b = new Uint8Array(await (await Studio.exportData('ising')).arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return btoa(s); });
  const members = unzipStored(Buffer.from(b64, 'base64')), npy = readNpy(members['spins.npy']), meta = JSON.parse(members['meta.json'].toString('utf8'));
  const exported = Array.from(new Int8Array(npy.data.buffer, npy.data.byteOffset, npy.data.length), v => v === 1 ? '1' : '0').join('');
  const series = readNpy(members['abs_m_series.npy']), exportedSeries = Array.from(new Float64Array(series.data.buffer.slice(series.data.byteOffset, series.data.byteOffset + series.data.length)));
  const data = { descr: npy.descr, shape: npy.shape, identical: exported === before.spins,
    seriesIdentical: JSON.stringify(exportedSeries) === JSON.stringify(before.series), metaGrid: meta.grid && meta.grid.grid, metaSweeps: meta.grid && meta.grid.sweeps,
    stateExported: meta.stateExported };
  // 3. The shell's print path at 8 in and 300 ppi, pressed like a user: the sheet's cell centers against the spins.
  const sized = await page.evaluate(() => {
    const i = document.querySelector('#export-inches'), d = document.querySelector('#export-dpi');
    if (![...i.options].some(o => o.value === '8') || ![...d.options].some(o => o.value === '300')) return false;
    i.value = '8'; i.dispatchEvent(new Event('change', { bubbles: true })); d.value = '300'; d.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#btn-export').click(); return true;
  });
  assert(sized, 'print size controls must offer 8 in at 300 ppi');
  await page.waitForFunction(() => { const img = document.querySelector('#export-img'), n = document.querySelector('#export-note');
    return (n && n.classList.contains('err')) || (img && !img.hidden && img.getAttribute('src')); }, null, { timeout: 300000, polling: 500 });
  const sheet = await page.evaluate(async ({ W, H, spins }) => {
    const img = document.querySelector('#export-img'), note = document.querySelector('#export-note').textContent;
    const blob = await (await fetch(img.getAttribute('src'))).blob(), bmp = await createImageBitmap(blob), w = bmp.width, h = bmp.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0); bmp.close();
    const px = ctx.getImageData(0, 0, w, h).data, lum = (x, y) => { const k = 4 * (y * w + x); return 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]; };
    // Cell centers only: the shell renders at twice the size and averages down, which blends the cell edges.
    const up = [], down = [];
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const v = lum(Math.floor((cx + 0.5) * w / W), Math.floor((cy + 0.5) * h / H));
      (spins[cy * W + cx] === '1' ? up : down).push(v);
    }
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length, mu = mean(up), md = mean(down), cut = (mu + md) / 2;
    const wrong = up.filter(v => (v > cut) !== (mu > cut)).length + down.filter(v => (v > cut) !== (md > cut)).length;
    return { width: w, height: h, bytes: blob.size, note: note.slice(0, 160), cellsChecked: up.length + down.length, wrongCells: wrong,
      upLuminance: mu, downLuminance: md };
  }, { W: before.W, H: before.H, spins: before.spins });
  await page.evaluate(() => document.querySelector('#export-close') && document.querySelector('#export-close').click());
  const after = await page.evaluate(() => isingAudit.spins()), recipeAfter = await page.evaluate(() => JSON.stringify(Studio.getRecipe('ising')));
  const preserved = after.spins === before.spins && after.sweeps === before.sweeps && JSON.stringify(after.series) === JSON.stringify(before.series) && recipe === recipeAfter;
  await page.close();
  const result = {
    seed: run.seed, recipe: JSON.parse(recipe), grid: [before.W, before.H], sweeps: before.sweeps, spinSha256: sha(before.spins),
    modulePNG: module, displacedControl: { wrongPixels: displaced.wrongPixels, checked: displaced.checked, detected: displaced.wrongPixels > 0.1 * displaced.checked },
    exportData: data, shellSheet: sheet, statePreserved: preserved, pageErrors: errors, seconds: (Date.now() - t0) / 1000,
  };
  result.pass = module.wrongPixels === 0 && module.distinctInks && module.width === 2400 && result.displacedControl.detected &&
    data.identical && data.seriesIdentical && data.descr === '|i1' && JSON.stringify(data.shape) === JSON.stringify([before.H, before.W]) &&
    data.metaSweeps === before.sweeps && sheet.width === 2400 && sheet.height === 2400 && sheet.wrongCells === 0 && preserved && errors.length === 0;
  return result;
}

/* ------------------------------------------------------------------------------------------------ */
/* Main                                                                                             */
/* ------------------------------------------------------------------------------------------------ */
async function main() {
  const started = Date.now(), log = (...a) => console.log('[' + ((Date.now() - started) / 1000).toFixed(0).padStart(4) + ' s]', ...a);
  const exact = exactChecks();
  log('exact: u(T_c) = ' + exact.uAtTc + ' (error ' + exact.uAtTcError.toExponential(1) + '); Onsager forms and AGM agree');
  const runs = planRuns();
  log(PLAN.mode + ' mode: ' + runs.length + ' runs, ' + runs.reduce((s, r) => s + r.sweeps, 0) + ' sweeps; random windows ' +
    runs.filter(r => r.scope === 'global').length + ' globally disjoint, ' + runs.filter(r => r.scope === 'group').length + ' disjoint within group');
  if (process.argv.includes('--plan')) { for (const r of runs) console.log(r.label, r.sweeps, r.seed, r.tick0, r.scope); return; }
  const browser = await chromium.launch({ args: BROWSER_ARGS }), pages = {};
  let environment, printResult, streamResult;
  const loaded = LOAD_SERIES ? JSON.parse(fs.readFileSync(LOAD_SERIES, 'utf8')) : null;
  try {
    for (const run of runs.slice().sort((a, b) => (a.mutant || '').localeCompare(b.mutant || '') || a.L - b.L)) {
      if (loaded) {
        const hit = loaded.find(x => x.label === run.label && x.seed === run.seed);
        assert(hit, 'no saved series for ' + run.label);
        run.sim = hit.sim; if (!environment) environment = run.sim.info;
        continue;
      }
      const key = run.mutant || 'tab';
      if (!pages[key]) pages[key] = await openStudio(browser, studioCopy(run.mutant));
      run.sim = await simulate(pages[key].page, run);
      if (!environment) environment = run.sim.info;
      log(run.label + ': ' + run.sweeps + ' sweeps in ' + run.sim.seconds.toFixed(0) + ' s (seed ' + run.seed + ', tick0 ' + run.tick0 + ')');
    }
    if (SAVE_SERIES) fs.writeFileSync(SAVE_SERIES, JSON.stringify(runs.map(r => ({ label: r.label, seed: r.seed, sim: r.sim }))));
    printResult = await printEvidence(browser);
    log('print: ' + (printResult.pass ? 'PASS' : 'FAIL') + ' in ' + printResult.seconds.toFixed(0) + ' s');
    streamResult = await streamCheck(browser);
    log('streams: seeds ' + streamResult.seeds.join(' and ') + ' share tick0 ' + streamResult.tick0 + '; site agreement ' +
      streamResult.v2.agreement.toFixed(4) + ' on the shared stream (v2), ' + streamResult.v3.agreement.toFixed(4) + ' on the keyed stream (v3): ' + (streamResult.pass ? 'PASS' : 'FAIL'));
    for (const [k, p] of Object.entries(pages)) assert.deepEqual(p.errors, [], 'page errors in ' + k);
  } finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }

  for (const r of runs) if (r.kind !== 'binder') r.analysis = analyzeSeries(r.sim, r);
  const groupBy = kind => {
    const out = new Map();
    for (const r of runs.filter(r => r.kind === kind)) { const k = r.L + '|' + r.T + '|' + (r.mutant || ''); if (!out.has(k)) out.set(k, []); out.get(k).push(r); }
    return [...out.values()];
  };
  const row = (rs, withM) => {
    const r0 = rs[0], fsz = finiteSize(r0.T, r0.L), qualifies = fsz.bound <= QUALIFY;
    const out = { L: r0.L, T: r0.T, init: r0.init, burn: r0.burn, sweeps: r0.sweeps - r0.burn, every: r0.every,
      seeds: rs.map(r => ({ seed: r.seed, tick0: r.tick0, windowScope: r.scope, seconds: r.sim.seconds })),
      finiteSize: { xi: fsz.xi, sigma: fsz.sigma, bound: fsz.bound, qualifies },
      energy: pool(rs.map(r => r.analysis), 'energy', onsagerU(r0.T)), tabSeries: rs.map(r => r.analysis.tabSeries) };
    if (withM) out.magnetization = pool(rs.map(r => r.analysis), 'absM', yangM(r0.T));
    return out;
  };
  const below = groupBy('below').map(rs => row(rs, true)), above = groupBy('above').map(rs => row(rs, false));
  const controls = groupBy('control').map(rs => {
    const r = row(rs, rs[0].T < TC);
    return { mutant: rs[0].mutant, description: MUTANTS[rs[0].mutant].join('  ->  '), ...r };
  });
  const binder = analyzeBinder(runs.filter(r => r.kind === 'binder'));

  // Verdicts. A test counts only at temperatures whose finite-size bound qualifies.
  const tests = [];
  for (const r of below.filter(r => r.finiteSize.qualifies)) tests.push(['Yang |m| L' + r.L + ' T' + r.T, r.magnetization.pass], ['Onsager u L' + r.L + ' T' + r.T, r.energy.pass]);
  for (const r of above.filter(r => r.finiteSize.qualifies)) tests.push(['Onsager u L' + r.L + ' T' + r.T, r.energy.pass]);
  const tabSeriesOk = [...below, ...above].every(r => r.tabSeries.every(t => t.mismatched === 0 && t.matchedOurs > 0));
  tests.push(['tab |m| series equals the read-back', tabSeriesOk]);
  const controlFailures = controls.flatMap(c => [c.energy, c.magnetization].filter(Boolean).map(t => ({ mutant: c.mutant, T: c.T, detected: !t.pass })));
  const controlsOk = controlFailures.every(c => c.detected);
  // A conclusive T_c estimate that disagrees with Onsager fails the run; an inconclusive one is reported as such.
  for (const [name, t] of [['Binder crossing T_c', binder.crossing.combined], ['Binder fixed-point T_c', binder.fixedPoint.combined]]) if (t.conclusive) tests.push([name, t.pass]);
  tests.push(['seeds with overlapping shared windows run independent chains on the keyed stream', streamResult.pass]);
  const numericalPass = tests.every(t => t[1]) && controlsOk;
  const verdict = t => t.conclusive ? (t.pass ? 'consistent with Onsager' : 'disagrees with Onsager') :
    t.estimate === null ? 'inconclusive (no size or pair with a reliable tau_int)' : 'inconclusive (bootstrap se ' + t.se.toPrecision(2) + ' > ' + CONCLUSIVE_SE + ')';
  const summary = {
    numericalPass, controlsDetected: controlsOk, binderCrossing: verdict(binder.crossing.combined), binderFixedPoint: verdict(binder.fixedPoint.combined), printPass: printResult.pass,
    failed: tests.filter(t => !t[1]).map(t => t[0]),
    nonQualifying: [...below, ...above].filter(r => !r.finiteSize.qualifies).map(r => 'L' + r.L + ' T' + r.T + ' (bound ' + r.finiteSize.bound.toExponential(1) + ')'),
  };
  const commit = (() => { try { return execSync('git rev-parse HEAD', { cwd: root }).toString().trim(); } catch (e) { return null; } })();
  const result = {
    date: new Date().toISOString().slice(0, 10), mode: PLAN.mode, plan: PLAN, commit,
    seriesSource: LOAD_SERIES ? 'reloaded from ' + path.basename(LOAD_SERIES) + ' (chains not re-run)' : 'simulated in this run',
    sourceSha256: sha(source), engineSha256: sha(engine), statsSha256: sha(statsSource),
    scope: 'Actual ISING_STEP checkerboard Metropolis in the real studio (periodic square lattice, h = 0, float32 spins), ' +
      'against Yang M(T), Onsager u(T) and Onsager T_c by Binder crossings; wrong-rule controls; module PNG, shell print and exportData state checks.',
    criteria: { zPass: Z_PASS, reliability: 'tau_int from stats.seriesMean with n >= 50 tau_int', finiteSizeQualify: QUALIFY },
    exact, below, above, controls, controlFailures, binder, streams: streamResult, print: printResult, summary,
    environment: Object.assign({ node: process.version, chromium: browser.version(), platform: process.platform, cpus: os.cpus().length,
      browserArgs: BROWSER_ARGS }, environment ? { renderer: environment.renderer, texType: environment.texType } : {}),
    wallSeconds: (Date.now() - started) / 1000,
    passed: numericalPass && printResult.pass,
  };
  for (const r of below) log('below L' + r.L + ' T' + r.T + ': |m| ' + fmt(r.magnetization) + '  u ' + fmt(r.energy) + (r.finiteSize.qualifies ? '' : '  (finite-size bound ' + r.finiteSize.bound.toExponential(1) + ', informational)'));
  for (const r of above) log('above L' + r.L + ' T' + r.T + ': u ' + fmt(r.energy));
  for (const c of controls) log('control ' + c.mutant + ' T' + c.T + ': ' + (c.magnetization ? '|m| ' + fmt(c.magnetization) + '  ' : '') + 'u ' + fmt(c.energy));
  const tc = t => t.estimate === null ? 'none' : t.estimate.toFixed(5) + ' +/- ' + t.se.toFixed(5) + ' (68% half-width ' + t.halfWidth68.toFixed(5) + ', z ' + (typeof t.z === 'number' ? t.z.toFixed(2) : t.z) + (t.extrapolatedDraws ? ', chord in ' + t.extrapolatedDraws + '/' + t.draws + ' draws' : '') + ')';
  for (const s of binder.sizes) log('Binder L' + s.L + ': U(T0) ' + s.binderAtT0.toFixed(4) + ' +/- ' + s.binderAtT0Se.toFixed(4) + ', tau_int(m^2) ' + s.tauM2Sweeps.map(t => t.toFixed(0)).join('/') + ' sweeps, halves z ' + s.m2Halves.map(h => h.z.toFixed(2)).join('/') + '; U = U* at T = ' + tc(s.fixedPoint));
  for (const p of binder.crossing.pairs) log('Binder crossing ' + p.sizes.join('/') + ': T = ' + tc(p) + (p.extrapolated ? ', point estimate by chord' : ''));
  log('T_c = ' + TC.toFixed(5) + '; crossing estimate ' + tc(binder.crossing.combined) + '; fixed-point estimate ' + tc(binder.fixedPoint.combined));
  log('summary ' + JSON.stringify(summary));
  if (WRITE) fs.writeFileSync(path.join(root, 'validation/results/ising-science.json'), JSON.stringify(result, null, 1) + '\n');
  console.log((result.passed ? 'PASS' : 'FAIL') + ' ising science (' + PLAN.mode + ' mode, ' + result.wallSeconds.toFixed(0) + ' s)');
  if (!result.passed) process.exitCode = 1;
}
const fmt = t => t.mean.toFixed(5) + ' +/- ' + t.se.toExponential(1) + ' vs ' + t.exact.toFixed(5) + ' (z ' + (typeof t.z === 'number' ? t.z.toFixed(2) : t.z) + (t.reliable ? '' : ', tau unreliable') + ') ' + (t.pass ? 'pass' : 'FAIL');
main().catch(e => { console.error(e); process.exitCode = 1; });
