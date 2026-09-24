// Observed order of accuracy of the pde and rdx GPU solvers against their formal order.
//
//   node tools/pde-order.js                  quick (a few minutes): cahn and turing, dt ladder dt0..dt0/8 with three
//                                            seeds, grids N, 2N, 4N, manufactured solutions, failure controls, and a
//                                            float32 floor probe carried to dt0/128
//   node tools/pde-order.js --full           every tab of src/modules/pde.js and src/modules/rdx.js, dt0..dt0/16,
//                                            three seeds on every ladder, a fourth grid on the rdx ladders
//   node tools/pde-order.js --tab ks         one tab (repeatable); quick depth unless --full is also given
//   node tools/pde-order.js --write          merge the tabs just run into validation/results/pde-order.json
//   ORDER_ONLY=time,space,mms,floor,ceiling  run only those sections (a debugging aid)
//
// Run node tools/build.js first; Playwright's Chromium with SwiftShader as in the other science tools.
// validation/PDE-ORDER.md reports the results and their limits.
//
// What runs. dist/studio.html is loaded and src/modules/pde.js and src/modules/rdx.js are evaluated in the page
// with four test-only edits, never written back: Studio.register is routed into a table (so nothing is
// re-registered), the spec each registration hands to pdeCreate or rdxCreate is recorded, the grid-size rule
// accepts an exact height (the studio forces H >= 64), and each instance gains auditUpload(field) and
// auditAdvance(n), which call the instance's own upload() and step(). Every number below therefore comes from
// the module's own instance: its shaders, its uniform mapping (spec.stepUniforms and friends), its step loop and,
// for pde, its numerical guard; the field is read back through the instance's own exportData(). Mutants and
// manufactured-solution sources edit a copy of the shader text in the page. Noise is off throughout.
//
// Ladders.
//   time   Same smooth initial field (a seeded sum of low Fourier modes), same grid (the tab's own lattice,
//          32 x 32 cells), fixed physical time T = n0 dt0, with dt0 the step the studio itself takes at the
//          default recipe (the default dt after the module's own ceiling) and dt0/2, dt0/4, ... Errors: successive
//          differences |u(dt_k) - u(dt_k+1)| (self-convergence, the primary measure), and the true error of the
//          time discretization against an independent Float64 RK4 integration of the same semi-discrete system
//          (pde: tools/lib/pde-reference.js; rdx: the Float64 lattice below), at a quarter and an eighth of the
//          finest step to show the reference has converged.
//   space  Same smooth field defined in physical coordinates on a fixed physical domain, grids N, 2N, 4N, fixed T.
//          pde stencils use unit cell spacing, so a spacing h is imposed by scaling the tab's own coefficients
//          (TABS[id].scale); rdx exposes it directly as `scale` (cells per length unit), with the tab's own
//          lattice as the middle grid. Steps: pde dt proportional to h^4 on every level (each level at the same
//          fraction of its explicit bound; the O(dt) time error is then O(h^4)); rdx one dt for all levels (half
//          of the finest level's bound and of the module's own dtMax, so the O(dt) error is common). Errors:
//          successive differences, fine grid restricted to the coarse one (pde vertex-centered: injection; rdx
//          cell-centered: 2 x 2 average). pfc and vegetation also record alternate ladders (spaceAlt; spaceSeam, spaceUpwind): see TABS.
//   mms    Manufactured solutions for cahn (pde) and turing (rdx, Schnakenberg): a source term S = u*_t - F(u*)
//          is added in a copy of the step shader, with its spatial factors computed here in Float64 and uploaded
//          as textures, and the error against the exact u*(x, T) is measured (true error, not self-convergence).
//
// Float32 floor. Each GPU run on the time and space ladders is repeated in Float64 with the same discrete
// update (same scheme, same dt, same grid). R = max |GPU - Float64 twin| is the rounding error that run carries.
// Rule: a successive difference d_k is on the floor, and excluded from the fit, when d_k < 10 (R_k + R_k+1);
// a true error e_k is excluded when e_k < 10 R_k. Rounding is then at most a tenth of what is fitted.
//
// Orders. Pairwise orders p_k = log(d_k / d_k+1) / log 2 between consecutive accepted points; the fitted order is
// the least-squares slope of log2 d against log2 dt (or log2 h) over accepted points. The observed order of a
// ladder is the mean of the fitted orders over seeds; its spread is half the range of every accepted pairwise
// order along the ladders of all seeds, and the seed-to-seed spread is the standard deviation of the per-seed
// fitted orders (src/shared/stats.js ensemble). A ladder passes when |observed - formal| <= 0.25.
//
// Explicit stability bound. For each run the (pi, pi) grid mode is linearized, frozen at the corners of the field
// envelope widened by 10%, through the Float64 twin of the actual update on a 2 x 2 periodic lattice; the bound is
// the largest dt at which no decaying eigenvalue is amplified (for a scalar forward Euler row, dt < 2/|lambda| as
// AGENTS.md states). Every dt used is checked against it.
//
// Failure controls. clock: the step shader's dt is doubled (the update applied twice per recorded step), run at
// dt/2 for twice the steps so each update is still dt. It keeps first-order self-convergence, so the true-error
// checks (RK4 reference, manufactured solution) must fail it. weight: the Laplacian center weight is changed
// (-4 to -3.9, or -20 to -19.9 for the 9-point stencils), an inconsistent stencil that the spatial ladder and the
// manufactured solution must fail. A missed control sets a nonzero exit code; a ladder outside the band does not,
// because a mismatch is a finding to report.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), os = require('node:os');
const stats = require('../src/shared/stats.js');
const pdeRef = require('./lib/pde-reference.js');

const root = path.resolve(__dirname, '..');
const OUT = 'validation/results/pde-order.json';
const SOURCES = ['src/modules/pde.js', 'src/modules/rdx.js', 'tools/lib/pde-reference.js'];
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
// Hashes taken when the run starts, so the report names the code that produced its numbers.
const TOOL_SHA = sha(fs.readFileSync(__filename)), SOURCE_SHA = Object.fromEntries(SOURCES.map(p => [p, sha(fs.readFileSync(path.join(root, p)))]));
const TAU = 2 * Math.PI;
const FLOOR_FACTOR = 10, BAND = 0.25;
// ORDER_ONLY=time,space,mms,floor,ceiling limits a run to those sections (a debugging aid; --write still merges by tab).
const ONLY = (process.env.ORDER_ONLY || '').split(',').filter(Boolean), want = k => !ONLY.length || ONLY.includes(k);

// ---------------------------------------------------------------- arguments
function parseArgs(argv) {
  const o = { full: false, write: false, tabs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--full') o.full = true;
    else if (a === '--write') o.write = true;
    else if (a === '--tab') o.tabs.push(argv[++i]);
    else throw new Error('Unknown argument ' + a + '; usage: node tools/pde-order.js [--full] [--write] [--tab <id>]');
  }
  return o;
}

// ---------------------------------------------------------------- tabs
// fam: module family. integrator: what the step shader implements, read from the shader text.
// time.n0: steps at dt0 on the time ladder. space: physical domain, grids, T. init: channels (base, amp).
// SCALE (pde only): how a cell spacing h is imposed through the tab's own coefficients on its unit-cell stencils.
//   A unit stencil applied to a field sampled at spacing h returns h^2 times the physical Laplacian (h^1 for the
//   central gradient, h^4 for lap(lap)), so each coefficient is divided by the power of h its operator carries.
//   Where a coefficient is hard-wired to 1 in the shader (swift, ks), the whole right-hand side is multiplied by
//   h^p and the shader step is dt/h^p, which is the same update. pfc also stores psi scaled by h^2 so that its
//   fixed cubic term keeps its weight. Every factor is a power of two, so the scaling is exact in float32.
const EPS_NOTE = 'unit-cell stencils; spacing imposed by coefficient scaling';
const TABS = {
  cahn: {
    fam: 'pde', integrator: 'forward Euler: mu = c^3 - c - eps^2 lap c from the old field, then c += dt M lap mu',
    formal: { time: 1, space: 2 }, spaceNote: '5-point Laplacian applied twice',
    init: [{ base: 0, amp: 0.4 }], time: { n0: 32 }, space: { L: 16, N: [16, 32, 64], T: 0.5 },
    scale: (s, h) => ({ state: { eps: s.eps / h, M: s.M / (h * h) }, dtScale: 1, fieldScale: 1 }),
    ref: s => ({ eps: s.eps, M: s.M, deg: !!s.deg }),
  },
  ohta: {
    fam: 'pde', integrator: 'forward Euler: as cahn plus -sigma (c - m) in the same explicit update',
    formal: { time: 1, space: 2 }, spaceNote: '5-point Laplacian applied twice',
    init: [{ base: 0, amp: 0.4 }], time: { n0: 32 }, space: { L: 16, N: [16, 32, 64], T: 0.5 },
    scale: (s, h) => ({ state: { eps: s.eps / h, M: s.M / (h * h) }, dtScale: 1, fieldScale: 1 }),
    ref: (s, mean) => ({ eps: s.eps, M: s.M, deg: !!s.deg, sigma: s.sigma, mean }),
  },
  amb: {
    fam: 'pde', integrator: 'forward Euler: mu (with lambda |grad phi|^2) and lap phi from the old field, then phi += dt (M lap mu - zeta div J)',
    formal: { time: 1, space: 2 }, spaceNote: '5-point Laplacian, central gradient, face-centered zeta flux',
    init: [{ base: -0.4, amp: 0.35 }], time: { n0: 32 }, space: { L: 16, N: [16, 32, 64], T: 0.5 },
    scale: (s, h) => ({ state: { eps: s.eps / h, M: s.M / (h * h), lambda: s.lambda / (h * h), zeta: s.zeta / h ** 4 }, dtScale: 1, fieldScale: 1 }),
    ref: s => ({ eps: s.eps, M: s.M, lambda: s.lambda, zeta: s.zeta }),
  },
  swift: {
    fam: 'pde', integrator: 'forward Euler: lap u and lap lap u from the old field, then u += dt (r u - (k0^2 + lap)^2 u + g u^2 - b u^3)',
    formal: { time: 1, space: 2 }, spaceNote: '5-point Laplacian applied twice',
    init: [{ base: 0, amp: 0.4 }], time: { n0: 32 }, space: { L: 16, N: [16, 32, 64], T: 0.5 },
    scale: (s, h) => ({ state: { r: s.r * h ** 4, k0: s.k0 * h, g: s.g * h ** 4, cub: s.cub * h ** 4 }, dtScale: 1 / h ** 4, fieldScale: 1 }),
    ref: s => ({ r: s.r, k0: s.k0, g: s.g, cub: s.cub }),
  },
  ks: {
    fam: 'pde', integrator: 'forward Euler: lap u and lap lap u from the old field, then u += dt (-nu lap^2 u - lap u - alpha/2 |grad u|^2)',
    formal: { time: 1, space: 2 }, spaceNote: '5-point Laplacian applied twice, central gradient',
    init: [{ base: 0, amp: 0.6 }], time: { n0: 32 }, space: { L: 16, N: [16, 32, 64], T: 0.5 },
    scale: (s, h) => ({ state: { nu: s.nu / (h * h) }, dtScale: 1 / (h * h), fieldScale: 1 }),
    ref: s => ({ nu: s.nu, alpha: s.alpha }),
  },
  pfc: {
    fam: 'pde', integrator: 'forward Euler: L9 psi, mu = [r + (k0^2 + L9)^2] psi + psi^3 from the old field, then psi += dt M L9 mu',
    formal: { time: 1, space: 2 }, spaceNote: '9-point (Mehrstellen) Laplacian applied three times',
    init: [{ base: 0.28, amp: 0.45 }], time: { n0: 64, maxSum: 6, minSum: 4 },
    // Three nested 9-point Laplacians amplify float32 rounding by about h^-6: at h = 1/4 the rounding a run carries
    // reaches the spatial difference, so the order is measured at h = 2, 1, 1/2 and the finer ladder is recorded.
    space: { L: 32, N: [16, 32, 64], T: 2 },
    spaceAlt: { L: 16, N: [16, 32, 64], T: 0.1, p: 6, seeds: 1, note: 'h = 1, 1/2, 1/4 as for the other pde tabs, steps proportional to h^-6: float32 floor at the finest level' },
    scale: (s, h) => ({ state: { r: s.r * h ** 4, k0: s.k0 * h, M: s.M / h ** 6 }, dtScale: 1, fieldScale: h * h }),
    ref: s => ({ r: s.r, k0: s.k0, M: s.M }),
  },
  excitable: {
    fam: 'rdx', integrator: 'forward Euler on both species (Barkley at the default recipe), then clamp',
    formal: { time: 1, space: 2 }, spaceNote: '5-point Laplacian at the default recipe',
    init: [{ base: 0.3, amp: 0.25 }, { base: 0.2, amp: 0.1 }], time: { n0: 16 }, space: { N: [16, 32, 64, 128], n0: 16 },
  },
  turing: {
    fam: 'rdx', integrator: 'semi-implicit Euler: gain explicit, each linear loss implicit, x\' = (x + dt gain)/(1 + dt loss), species updated from the old field',
    formal: { time: 1, space: 2 }, spaceNote: '9-point (Mehrstellen) Laplacian at the default recipe',
    init: [{ base: 1, amp: 0.5 }, { base: 0.9, amp: 0.4 }], time: { n0: 64 }, space: { N: [16, 32, 64, 128], n0: 32 },
  },
  cyclic: {
    fam: 'rdx', integrator: 'forward Euler on the three species, then clamp',
    formal: { time: 1, space: 2 }, spaceNote: '5-point Laplacian at the default recipe',
    init: [{ base: 0.3125, amp: 0.15 }, { base: 0.3125, amp: 0.15 }, { base: 0.3125, amp: 0.15 }], time: { n0: 32 }, space: { N: [16, 32, 64, 128], n0: 32 },
  },
  chemotaxis: {
    fam: 'rdx', integrator: 'forward Euler, conservative face fluxes chi(mean of two cells) times the face difference of v, then clamp',
    formal: { time: 1, space: 2 }, spaceNote: '9-point Laplacian, face-centered chemotactic flux',
    init: [{ base: 1, amp: 0.4 }, { base: 5, amp: 1.5 }], time: { n0: 32 }, space: { N: [16, 32, 64, 128], n0: 32 },
  },
  vegetation: {
    fam: 'rdx', integrator: 'semi-implicit Euler: water loss (1 + n^2) and plant mortality implicit, upwind water advection explicit',
    formal: { time: 1, space: 1 }, spaceNote: 'first-order upwind water advection (5-point Laplacian is order 2); the advection sets the formal order 1',
    init: [{ base: 0.6, amp: 0.2 }, { base: 0.9, amp: 0.4 }], time: { n0: 32 },
    // Two properties of the default recipe keep its lattice out of the asymptotic range: the rainfall ramp
    // a (1 + agrad (2y - 1)) jumps across the periodic seam in y (a forced internal layer), and the upwind numerical
    // diffusion v h/2 = 20 is twenty times D_w. The order is measured with uniform rainfall on finer lattices over a
    // shorter time; the default recipe on the ladder the other tabs use is recorded alongside (spaceAlt).
    // The two other alternates change one factor each: the default rainfall gradient on the fine ladder (seam),
    // and uniform rainfall on the tab-lattice ladder (numerical diffusion alone).
    space: { N: [32, 64, 128, 256], n0: 8, maxSum: 2, state: { agrad: 0 } },
    spaceAlt: [
      { label: 'spaceAlt', N: [16, 32, 64], n0: 32, seeds: 1, note: 'default recipe (agrad 0.6, rainfall discontinuous across the periodic seam) on the ladder the other rdx tabs use' },
      { label: 'spaceSeam', N: [32, 64, 128], n0: 8, maxSum: 2, seeds: 3, note: 'the fine ladder with the default rainfall gradient agrad 0.6: isolates the seam' },
      { label: 'spaceUpwind', N: [16, 32, 64], n0: 32, seeds: 3, state: { agrad: 0 }, note: 'the tab-lattice ladder with uniform rainfall: isolates the upwind numerical diffusion' },
    ],
  },
};
const PDE_IDS = ['cahn', 'ohta', 'amb', 'swift', 'ks', 'pfc'], RDX_IDS = ['excitable', 'turing', 'cyclic', 'chemotaxis', 'vegetation'];
const QUICK = ['cahn', 'turing'];
const MMS_TABS = ['cahn', 'turing'];

// ---------------------------------------------------------------- page instrumentation
function instrument(file, fam) {
  let src = fs.readFileSync(path.join(root, file), 'utf8');
  const factory = fam + 'Create';
  const anchors = ['function ' + factory + '(spec) {', 'H = Math.max(64, Math.round(n * ar))', '        fieldCells()'];
  for (const a of anchors) if (!src.includes(a)) throw new Error(file + ': anchor not found (' + a + '); update tools/pde-order.js');
  src = src.replace(/Studio\.register\(/g, 'window.__ordReg(');
  // Record only the spec the module registration builds: later calls pass mutated copies of it.
  src = src.replace(anchors[0], anchors[0] + ` if (!window.__ordSpec['${fam}/' + spec.id]) window.__ordSpec['${fam}/' + spec.id] = spec; window.__ordFactory['${fam}'] = ${factory};`);
  src = src.split(anchors[1]).join('H = s.__orderH || Math.max(64, Math.round(n * ar))');
  // The audit hooks mirror regenerate() for the upload (pde: reference mean for ohta, chemical potential refresh)
  // and call the instance's own step(). pde's step() returns false when its numerical guard rejects a batch.
  const hooks = fam === 'pde'
    ? `        auditUpload(data) { const s = host.getState(); ensureGrid(s); upload(C.read, data); stepCount = 0; guardMessage = '';
          reactionMean = 0; for (let i = 0; i < data.length; i += 4) reactionMean += data[i]; reactionMean /= gw * gh;
          refreshChem(s); return [gw, gh, reactionMean]; },
        auditAdvance(n) { return step(n) ? host.getState().dt : null; },
        auditGuard() { return guardMessage; },
`
    : `        auditUpload(data) { const s = host.getState(); ensureGrid(s); upload(C.read, data); stepCount = 0; return [gw, gh, 0]; },
        auditAdvance(n) { step(n); return dtEff; },
        auditGuard() { return ''; },
`;
  return src.replace(anchors[2], hooks + anchors[2]);
}

// Runs in the page. One instance per (tab, variant), reused across levels; exportData() is the read-back.
function pageRuntime() {
  const G = Studio.gl, instances = new Map();
  const mainPart = (src, fn) => { const at = src.lastIndexOf('void main(){'); if (at < 0) throw new Error('no main()'); return src.slice(0, at) + fn(src.slice(at)); };
  function mutate(spec, mutations) {
    const out = Object.assign({}, spec);
    for (const m of mutations || []) {
      let hits = 0;
      for (const k of m.keys) {
        if (!out[k]) continue;
        const edit = s => { const n = s.split(m.from).length - 1; hits += n; return s.split(m.from).join(m.to); };
        out[k] = m.main ? mainPart(out[k], edit) : edit(out[k]);
      }
      if (!hits) throw new Error('mutation anchor not found: ' + m.from + ' in ' + m.keys.map(k => String(out[k]).slice(-300)).join(' | '));
    }
    return out;
  }
  window.orderInfo = () => {
    const gl = document.createElement('canvas').getContext('webgl2'), e = gl.getExtension('WEBGL_debug_renderer_info');
    const out = { renderer: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: e ? gl.getParameter(e.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION), floatRenderTargets: !!gl.getExtension('EXT_color_buffer_float') };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return out;
  };
  // The studio's own step at the default recipe: the module's sanitizer (pde) or its dtMax clamp (rdx).
  window.orderDefaults = key => {
    const [fam, id] = key.split('/'), def = window.__ordDefs[id], spec = window.__ordSpec[key];
    const s = JSON.parse(JSON.stringify(def.defaults));
    if (def.sanitize) def.sanitize(s);
    const dt0 = fam === 'rdx' ? Math.min(s.dt, spec.dtMax(s)) : s.dt;
    return { defaults: JSON.parse(JSON.stringify(def.defaults)), sanitized: s, dt0 };
  };
  window.orderDtMax = (key, state) => { const spec = window.__ordSpec[key]; return spec.dtMax ? spec.dtMax(state) : null; };
  window.orderRun = async ({ key, variant, mutations, uniforms, textures, state, W, H, init, steps }) => {
    const [fam, id] = key.split('/'), ik = key + '|' + variant;
    let rec = instances.get(ik);
    if (!rec) {
      const spec = mutate(window.__ordSpec[key], mutations);
      const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8;
      rec = { canvas, state: null, extra: {} };
      const own = spec.stepUniforms;
      spec.stepUniforms = s => Object.assign(own(s), rec.extra);
      rec.inst = window.__ordFactory[fam](spec)({ canvas, getState: () => rec.state, setStatus() {}, setWitness() {}, reducedMotion: () => true, isActive: () => false, fault(m) { throw new Error(m); }, requestRepaint() {} });
      if (!rec.inst.auditUpload) throw new Error(key + ' instance did not start (WebGL2 or shader failure)');
      instances.set(ik, rec);
    }
    rec.state = Object.assign({}, window.__ordDefs[id].defaults, state, { grid: W, __orderH: H, aspect: '1:1', noise: 0, running: false, warmup: 0, palette: ['#000000', '#ffffff'], bg: '#000000' });
    const gl = rec.canvas.getContext('webgl2'), made = [];
    rec.extra = Object.assign({}, uniforms || {});
    for (const [name, data] of Object.entries(textures || {})) {
      const t = new G.Target(gl, W, H, { type: 'rgba32f', filter: 'nearest', wrap: 'repeat', data: new Float32Array(data) });
      made.push(t); rec.extra[name] = t;
    }
    const t0 = performance.now();
    const up = rec.inst.auditUpload(new Float32Array(init));
    if (up[0] !== W || up[1] !== H) throw new Error('grid ' + up[0] + 'x' + up[1] + ' instead of ' + W + 'x' + H);
    let left = steps, dtUsed = null, ok = true;
    while (left > 0) {
      const n = Math.min(400, left), r = rec.inst.auditAdvance(n);
      if (r === null) { ok = false; break; }
      dtUsed = r; left -= n;
    }
    const data = await rec.inst.exportData();
    const arr = data.arrays.species || data.arrays.field, nch = arr.shape.length === 3 ? arr.shape[2] : 1;
    // exportData rows run top to bottom; flip back to the upload order (texture row 0 first).
    const out = new Array(W * H * nch);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < nch; c++) out[(y * W + x) * nch + c] = arr.data[((H - 1 - y) * W + x) * nch + c];
    for (const t of made) t.dispose();
    return { field: out, nch, dtUsed, ok, guard: rec.inst.auditGuard(), mean: up[2], ms: performance.now() - t0 };
  };
  window.orderDispose = prefix => {
    for (const [k, rec] of instances) if (k.startsWith(prefix)) { rec.canvas.getContext('webgl2').getExtension('WEBGL_lose_context')?.loseContext(); instances.delete(k); }
  };
}

// ---------------------------------------------------------------- Float64 rdx lattice (independent of the shader)
// Transcribed from the model equations and the scheme each shader comment documents (see validation/RDX.md):
// gain explicit, loss implicit where the shader divides by (1 + dt loss), 5- or 9-point Laplacian times c^2,
// conservative chemotactic face fluxes, upwind water advection, rainfall at the cell center in y.
function rdxLattice(id, s, W, H) {
  const n = W * H, c = Number(s.scale) || 1, c2 = c * c, nine = Number(s.lap) === 9;
  const idx = (x, y) => (((y % H) + H) % H) * W + (((x % W) + W) % W);
  const nb = {};
  for (const [k, dx, dy] of [['e', 1, 0], ['w', -1, 0], ['n', 0, 1], ['s', 0, -1], ['ne', 1, 1], ['nw', -1, 1], ['se', 1, -1], ['sw', -1, -1]]) {
    nb[k] = new Int32Array(n); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) nb[k][y * W + x] = idx(x + dx, y + dy);
  }
  const ns = id === 'cyclic' ? 3 : 2;
  const lap = (f, ch, i) => {
    const axis = f[nb.e[i] * 4 + ch] + f[nb.w[i] * 4 + ch] + f[nb.n[i] * 4 + ch] + f[nb.s[i] * 4 + ch], cc = f[i * 4 + ch];
    if (!nine) return (axis - 4 * cc) * c2;
    const corner = f[nb.ne[i] * 4 + ch] + f[nb.nw[i] * 4 + ch] + f[nb.se[i] * 4 + ch] + f[nb.sw[i] * 4 + ch];
    return (4 * axis + corner - 20 * cc) / 6 * c2;
  };
  const chi = q => s.chi * q / (1 + q * q);
  // gain[k] and loss[k] per species: x_t = gain - loss x (loss taken implicitly by the scheme where nonzero).
  function terms(f, i, y, gain, loss) {
    const u = f[i * 4], v = f[i * 4 + 1], w = f[i * 4 + 2];
    loss[0] = loss[1] = loss[2] = 0;
    if (id === 'excitable' && s.model !== 'fhn') {
      gain[0] = lap(f, 0, i) + u * (1 - u) * (u - (v + s.b) / s.a) / s.eps; gain[1] = s.D * lap(f, 1, i) + u - v;
    } else if (id === 'excitable') {
      gain[0] = lap(f, 0, i) + u - u * u * u - v; gain[1] = s.fD * lap(f, 1, i) + s.feps * (u - s.fa * v - s.fb);
    } else if (id === 'turing') {
      const m = s.tmodel, Lu = lap(f, 0, i), Lv = lap(f, 1, i);
      if (m === 'schnak') { gain[0] = Lu + s.sa + u * u * v; loss[0] = 1; gain[1] = s.D * Lv + s.sb; loss[1] = u * u; }
      else if (m === 'bruss') { gain[0] = Lu + s.ba + u * u * v; loss[0] = s.bb + 1; gain[1] = s.D * Lv + s.bb * u; loss[1] = u * u; }
      else if (m === 'gm') { const vv = Math.max(v, 1e-3); gain[0] = Lu + s.ga + u * u / (vv * (1 + s.gK * u * u)); loss[0] = s.gb; gain[1] = s.D * Lv + u * u; loss[1] = s.gc; }
      else { const hh = 1 / (1 + u * u); gain[0] = Lu + s.la; loss[0] = 1 + 4 * v * hh; gain[1] = s.lsig * (s.D * Lv + s.lb * u); loss[1] = s.lsig * s.lb * u * hh; }
    } else if (id === 'cyclic') {
      gain[0] = s.D * lap(f, 0, i) + u * (1 - u - s.a * v - s.b * w);
      gain[1] = s.D * lap(f, 1, i) + v * (1 - v - s.a * w - s.b * u);
      gain[2] = s.D * lap(f, 2, i) + w * (1 - w - s.a * u - s.b * v);
    } else if (id === 'chemotaxis') {
      const ue = f[nb.e[i] * 4], uw = f[nb.w[i] * 4], un = f[nb.n[i] * 4], us = f[nb.s[i] * 4];
      const ve = f[nb.e[i] * 4 + 1], vw = f[nb.w[i] * 4 + 1], vn = f[nb.n[i] * 4 + 1], vs = f[nb.s[i] * 4 + 1];
      const div = (chi(0.5 * (u + ue)) * (ve - v) - chi(0.5 * (u + uw)) * (v - vw) + chi(0.5 * (u + un)) * (vn - v) - chi(0.5 * (u + us)) * (v - vs)) * c2;
      gain[0] = lap(f, 0, i) - div + u * (1 - u); gain[1] = s.D * lap(f, 1, i) + u - s.a * v;
    } else if (id === 'vegetation') {
      const a = s.a * (1 + s.agrad * (2 * (y + 0.5) / H - 1)), wx = (f[nb.e[i] * 4] - u) * c;
      gain[0] = a + s.slope * wx + s.Dw * lap(f, 0, i); loss[0] = 1 + v * v;
      gain[1] = u * v * v + s.Dn * lap(f, 1, i); loss[1] = s.m;
    } else throw new Error('rdx lattice: unknown tab ' + id);
  }
  const clampOf = id === 'excitable' ? (s.model !== 'fhn' ? [[0, 1], [0, 2]] : [[-3, 3], [-3, 3]])
    : id === 'turing' || id === 'vegetation' ? [[0, 40], [0, 40]] : id === 'cyclic' ? [[0, 2], [0, 2], [0, 2]] : [[0, 60], [0, 200]];
  const g = [0, 0, 0], l = [0, 0, 0];
  // One step of the discrete scheme, as the shader takes it (clamps included unless disabled).
  function step(f, dt, noClamp) {
    const out = new Float64Array(f.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; terms(f, i, y, g, l);
      for (let k = 0; k < ns; k++) {
        let v = l[k] ? (f[i * 4 + k] + dt * g[k]) / (1 + dt * l[k]) : f[i * 4 + k] + dt * g[k];
        if (!noClamp) v = Math.min(clampOf[k][1], Math.max(clampOf[k][0], v));
        out[i * 4 + k] = v;
      }
      out[i * 4 + 3] = 1;
    }
    return out;
  }
  // The semi-discrete right-hand side, gain - loss x, for the RK4 reference.
  function rhs(f) {
    const out = new Float64Array(f.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; terms(f, i, y, g, l);
      for (let k = 0; k < ns; k++) out[i * 4 + k] = g[k] - l[k] * f[i * 4 + k];
    }
    return out;
  }
  function euler(init, dt, steps) { let f = Float64Array.from(init); for (let k = 0; k < steps; k++) f = step(f, dt); return f; }
  function rk4(init, dt, steps) {
    let f = Float64Array.from(init);
    const add = (a, b, h) => { const o = new Float64Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] + h * b[i]; return o; };
    for (let k = 0; k < steps; k++) {
      const k1 = rhs(f), k2 = rhs(add(f, k1, dt / 2)), k3 = rhs(add(f, k2, dt / 2)), k4 = rhs(add(f, k3, dt));
      for (let i = 0; i < f.length; i++) f[i] += dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6;
    }
    return f;
  }
  return { ns, step, euler, rk4 };
}

// ---------------------------------------------------------------- explicit stability bound
// The (pi, pi) mode on a 2 x 2 periodic lattice is the grid-scale mode of both stencils (5-point symbol -8,
// 9-point -16/3; central gradients vanish on it). Its one-step amplification matrix is built by finite
// differences of the Float64 twin of the actual update about a uniform state, and the bound is the largest dt
// with spectral radius <= 1, found by bisection. For a scalar explicit row this is dt < 2/|lambda|.
// Spectral radius of the one-step map A at step dt, from the eigenvalues nu of B = (A - I)/dt, which are O(1)
// and well separated where those of A crowd around 1: rho = max |1 + dt nu|. 1 x 1 and 2 x 2 in closed form;
// 3 x 3 through a real root of the characteristic cubic (bisection) and the deflated quadratic.
function specRadius(A, dt) {
  const n = A.length, B = A.map((r, i) => r.map((v, j) => (v - (i === j ? 1 : 0)) / dt));
  const quad = (b, c) => { const disc = b * b / 4 - c; return disc >= 0 ? [[-b / 2 + Math.sqrt(disc), 0], [-b / 2 - Math.sqrt(disc), 0]] : [[-b / 2, Math.sqrt(-disc)], [-b / 2, -Math.sqrt(-disc)]]; };
  let nus;
  if (n === 1) nus = [[B[0][0], 0]];
  else if (n === 2) nus = quad(-(B[0][0] + B[1][1]), B[0][0] * B[1][1] - B[0][1] * B[1][0]);
  else {
    const tr = B[0][0] + B[1][1] + B[2][2], m2 = (i, j) => B[i][i] * B[j][j] - B[i][j] * B[j][i];
    const det = B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) - B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) + B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
    const c1 = -tr, c2 = m2(0, 1) + m2(0, 2) + m2(1, 2), c3 = -det, p = x => ((x + c1) * x + c2) * x + c3;
    let lo = -(1 + Math.abs(c1) + Math.abs(c2) + Math.abs(c3)), hi = -lo;
    for (let i = 0; i < 300; i++) { const mid = (lo + hi) / 2; if (p(mid) < 0) lo = mid; else hi = mid; }
    const r = (lo + hi) / 2;
    nus = [[r, 0]].concat(quad(c1 + r, c2 + r * (c1 + r)));
  }
  // Only decaying eigenvalues constrain an explicit step; a mode the frozen linearization grows sets no bound.
  return Math.max(0, ...nus.filter(([re]) => re < 0).map(([re, im]) => Math.hypot(1 + dt * re, dt * im)));
}
function amplification(stepFn, base, ns, dt) {
  const d = 1e-6, A = [];
  const mk = (k, sign) => { const f = new Float64Array(16); for (let i = 0; i < 4; i++) { for (let c = 0; c < ns; c++) f[i * 4 + c] = base[c]; f[i * 4 + 3] = 1; } if (k >= 0) for (let i = 0; i < 4; i++) f[i * 4 + k] += sign * d * ((i % 2) ^ (i >> 1) ? -1 : 1); return f; };
  const chk = i => ((i % 2) ^ (i >> 1)) ? -1 : 1;
  for (let k = 0; k < ns; k++) {
    const p = stepFn(mk(k, 1), dt), q = stepFn(mk(k, -1), dt), row = [];
    for (let c = 0; c < ns; c++) { let a = 0; for (let i = 0; i < 4; i++) a += chk(i) * (p[i * 4 + c] - q[i * 4 + c]); row.push(a / (4 * 2 * d)); }
    A.push(row);
  }
  return A[0].map((_, i) => A.map(r => r[i])); // columns were perturbations; transpose to rows = outputs
}
// Eigenvalues with a positive real part (a grid mode the frozen linearization grows) are left out by specRadius.
function stabilityBound(stepFn, states, ns) {
  let bound = Infinity;
  for (const base of states) {
    const ok = dt => specRadius(amplification(stepFn, base, ns, dt), dt) <= 1 + 1e-9;
    if (!ok(1e-6)) return NaN;
    let lo = 1e-6, hi = 2e-6;
    while (ok(hi) && hi < 1e3) { lo = hi; hi *= 2; }
    if (hi >= 1e3) continue;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
    bound = Math.min(bound, lo);
  }
  return bound;
}
function envelopeStates(init, ns) {
  const n = init.length / 4, lo = Array(ns).fill(Infinity), hi = Array(ns).fill(-Infinity);
  for (let i = 0; i < n; i++) for (let c = 0; c < ns; c++) { lo[c] = Math.min(lo[c], init[i * 4 + c]); hi[c] = Math.max(hi[c], init[i * 4 + c]); }
  // every corner of the envelope, widened by 10%
  const out = [];
  for (let m = 0; m < (1 << ns); m++) out.push(Array.from({ length: ns }, (_, c) => { const w = 0.1 * (hi[c] - lo[c]); return (m >> c) & 1 ? hi[c] + w : lo[c] - w; }));
  return out;
}

// ---------------------------------------------------------------- fields, norms, orders
function pickModes(rng, maxSum, count, minSum = 1) {
  const all = [];
  for (let mx = -maxSum; mx <= maxSum; mx++) for (let my = 0; my <= maxSum; my++) {
    if (Math.abs(mx) + my < minSum || Math.abs(mx) + my > maxSum || (my === 0 && mx < 0)) continue;
    all.push([mx, my]);
  }
  const out = [];
  while (out.length < Math.min(count, all.length)) { const m = all.splice(Math.floor(rng() * all.length), 1)[0]; out.push({ mx: m[0], my: m[1], a: 0.5 + 0.5 * rng(), p: TAU * rng() }); }
  const norm = out.reduce((s, m) => s + m.a, 0);
  for (const m of out) m.a /= norm;
  return out;
}
const modeValue = (modes, x, y, Lx, Ly) => modes.reduce((s, m) => s + m.a * Math.cos(TAU * (m.mx * x / Lx + m.my * y / Ly) + m.p), 0);
// Initial field on a W x H grid: pde vertex-centered x = i h, rdx cell-centered x = (i + 1/2) h.
function buildInit(tab, seed, W, H, L, family, maxSum, minSum = 1) {
  const rng = stats.seeded('pde-order/' + seed), T = TABS[tab], h = L / W, off = family === 'rdx' ? 0.5 : 0;
  const modes = T.init.map(() => pickModes(rng, maxSum, 5, minSum));
  const f = new Float64Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    T.init.forEach((ch, k) => { f[i + k] = ch.base + ch.amp * modeValue(modes[k], (x + off) * h, (y + off) * h, L, L); });
    f[i + 3] = 1;
  }
  return { f: Float64Array.from(f, v => Math.fround(v)), modes };
}
function diff(a, b, nch, stride) {
  let mx = 0, ss = 0, n = 0;
  for (let i = 0; i < a.length / stride; i++) for (let c = 0; c < nch; c++) { const d = a[i * stride + c] - b[i * stride + c]; if (!Number.isFinite(d)) return { max: Infinity, rms: Infinity }; mx = Math.max(mx, Math.abs(d)); ss += d * d; n++; }
  return { max: mx, rms: Math.sqrt(ss / n) };
}
// Restrict a fine field (2W x 2H, nch channels, packed) to the coarse grid.
function restrict(fine, W, H, nch, family) {
  const out = new Float64Array(W * H * nch), FW = 2 * W;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < nch; c++) {
    const at = (xx, yy) => fine[(yy * FW + xx) * nch + c];
    out[(y * W + x) * nch + c] = family === 'pde' ? at(2 * x, 2 * y) : 0.25 * (at(2 * x, 2 * y) + at(2 * x + 1, 2 * y) + at(2 * x, 2 * y + 1) + at(2 * x + 1, 2 * y + 1));
  }
  return out;
}
const pack = (f4, nch) => { const n = f4.length / 4, out = new Float64Array(n * nch); for (let i = 0; i < n; i++) for (let c = 0; c < nch; c++) out[i * nch + c] = f4[i * 4 + c]; return out; };
const r4 = v => Number(v.toPrecision(4));
// Orders from a ladder of errors against a ladder of step sizes, with the floor rule applied.
function orders(sizes, errs, floors) {
  const accepted = errs.map((e, k) => Number.isFinite(e) && e > 0 && !(floors && e < FLOOR_FACTOR * floors[k]));
  const pairwise = [];
  for (let k = 0; k + 1 < errs.length; k++) if (accepted[k] && accepted[k + 1]) pairwise.push(Math.log(errs[k] / errs[k + 1]) / Math.log(sizes[k] / sizes[k + 1]));
  const xs = [], ys = [];
  errs.forEach((e, k) => { if (accepted[k]) { xs.push(Math.log2(sizes[k])); ys.push(Math.log2(e)); } });
  const fitted = xs.length >= 2 ? stats.ols(xs, ys).slope : NaN;
  return { accepted, pairwise, fitted, onFloor: accepted.filter(a => !a).length };
}
function summarize(runs, formal) {
  const fits = runs.map(r => r.fitted).filter(Number.isFinite), pw = runs.flatMap(r => r.pairwise).filter(Number.isFinite);
  if (!fits.length) return { observed: null, halfRange: null, seed: null, pass: false, formal, note: 'no two accepted points' };
  const e = stats.ensemble(fits), lo = Math.min(...pw), hi = Math.max(...pw);
  const last = runs.map(r => r.pairwise[r.pairwise.length - 1]).filter(Number.isFinite);
  return { observed: e.mean, finestPairwise: last.length ? stats.mean(last) : null, pairwiseRange: pw.length ? [lo, hi] : null, halfRange: pw.length ? (hi - lo) / 2 : null,
    seed: { mean: e.mean, sd: fits.length > 1 ? e.sd : null, n: e.n, min: e.min, max: e.max }, formal, pass: Math.abs(e.mean - formal) <= BAND };
}

// ---------------------------------------------------------------- harness
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const tabs = opts.tabs.length ? opts.tabs : opts.full ? PDE_IDS.concat(RDX_IDS) : QUICK;
  for (const t of tabs) if (!TABS[t]) throw new Error('Unknown tab ' + t + '; one of ' + Object.keys(TABS).join(', '));
  const depth = opts.full ? { levels: 5, seedsTime: 3, seedsSpace: { pde: 3, rdx: 3 } } : { levels: 4, seedsTime: 3, seedsSpace: { pde: 1, rdx: 3 } };
  const studio = path.join(root, 'dist/studio.html');
  if (!fs.existsSync(studio)) throw new Error('dist/studio.html is missing; run node tools/build.js');
  const { chromium } = require('playwright');
  const started = Date.now();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { tabs: {}, mms: {}, checks: [] };
  const log = m => process.stderr.write(m + '\n');
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + studio + '#three-vortex-bound/pde-order');
    await page.evaluate(() => { window.__ordDefs = {}; window.__ordSpec = {}; window.__ordFactory = {}; window.__ordReg = d => { window.__ordDefs[d.id] = d; }; });
    await page.evaluate(instrument('src/modules/pde.js', 'pde'));
    await page.evaluate(instrument('src/modules/rdx.js', 'rdx'));
    await page.evaluate(pageRuntime);
    const specs = await page.evaluate(() => Object.keys(window.__ordSpec).sort().join(','));
    if (specs !== 'pde/amb,pde/cahn,pde/ks,pde/ohta,pde/pfc,pde/swift,rdx/chemotaxis,rdx/cyclic,rdx/excitable,rdx/turing,rdx/vegetation') throw new Error('Captured specs: ' + specs);
    report.environment = Object.assign(await page.evaluate(() => window.orderInfo()), { browser: 'Chromium ' + browser.version(), node: process.version, platform: process.platform + ' ' + os.release(), cpus: os.cpus().length, precision: 'rgba32f render targets' });
    if (!report.environment.floatRenderTargets) throw new Error('This benchmark requires float32 render targets');
    const run = arg => page.evaluate(a => window.orderRun(a), Object.assign({}, arg, { init: Array.from(arg.init), textures: arg.textures ? Object.fromEntries(Object.entries(arg.textures).map(([k, v]) => [k, Array.from(v)])) : undefined }));

    for (const tab of tabs) {
      const T = TABS[tab], key = T.fam + '/' + tab, tabStart = Date.now();
      const info = await page.evaluate(k => window.orderDefaults(k), key);
      const base = Object.assign({}, info.defaults, { noise: 0 });
      const ns = T.init.length, out = { family: T.fam, integrator: T.integrator, formal: T.formal, spaceStencil: T.spaceNote, dt0: info.dt0, defaultDt: info.defaults.dt };
      report.tabs[tab] = out;
      log(tab + ': dt0 ' + info.dt0 + (info.dt0 !== info.defaults.dt ? ' (default ' + info.defaults.dt + ' clamped by the module ceiling)' : ''));

      // Float64 twin and RK4 reference for this tab at a given state and grid.
      const lattice = (state, W, H, mean) => {
        if (T.fam === 'rdx') { const L = rdxLattice(tab, state, W, H); return { euler: L.euler, rk4: L.rk4, step: (f, dt) => L.step(f, dt, true) }; }
        const m = pdeRef.model(Object.assign({ W, H, id: tab, bc: 'periodic' }, T.ref(state, mean)));
        const to1 = f4 => Float64Array.from({ length: W * H }, (_, i) => f4[i * 4]), to4 = f1 => { const o = new Float64Array(W * H * 4); for (let i = 0; i < W * H; i++) { o[i * 4] = f1[i]; o[i * 4 + 3] = 1; } return o; };
        return { euler: (f, dt, n) => to4(m.evolve(to1(f), dt, n, 'euler')), rk4: (f, dt, n) => to4(m.evolve(to1(f), dt, n, 'rk4')), step: (f, dt) => to4(m.evolve(to1(f), dt, 1, 'euler')) };
      };
      const bound = (state, W, H, init, mean) => {
        const small = T.fam === 'rdx' ? rdxLattice(tab, Object.assign({}, state), 2, 2) : null;
        const stepFn = T.fam === 'rdx' ? (f, dt) => small.step(f, dt, true) : (f, dt) => { const m = pdeRef.model(Object.assign({ W: 2, H: 2, id: tab, bc: 'periodic' }, T.ref(state, mean))); const o = m.evolve(Float64Array.from({ length: 4 }, (_, i) => f[i * 4]), dt, 1, 'euler'); const r = new Float64Array(16); for (let i = 0; i < 4; i++) { r[i * 4] = o[i]; r[i * 4 + 3] = 1; } return r; };
        return stabilityBound(stepFn, envelopeStates(init, ns), ns);
      };

      // ===================== time ladder =====================
      if (want('time')) {
        const W = 32, H = 32, L = T.fam === 'pde' ? 32 : 32 / (Number(base.scale) || 1), dt0 = info.dt0, n0 = T.time.n0;
        const dts = Array.from({ length: depth.levels }, (_, k) => dt0 / 2 ** k), steps = dts.map((_, k) => n0 * 2 ** k), Tphys = n0 * dt0;
        const seeds = [], ctl = { clock: [] };
        for (let si = 0; si < depth.seedsTime; si++) {
          const seed = tab + '/time/' + (si + 1), { f: init } = buildInit(tab, seed, W, H, L, T.fam, T.time.maxSum || 4, T.time.minSum || 1);
          const gpu = [], twins = [];
          let mean = 0; for (let i = 0; i < W * H; i++) mean += init[i * 4]; mean /= W * H;
          const lat = lattice(base, W, H, mean);
          const eb = bound(base, W, H, init, mean);
          if (!(dt0 < eb)) throw new Error(tab + ': dt0 ' + dt0 + ' is not inside the explicit bound ' + eb);
          for (let k = 0; k < dts.length; k++) {
            const r = await run({ key, variant: 'base', state: Object.assign({}, base, { dt: dts[k] }), W, H, init, steps: steps[k] });
            if (!r.ok) throw new Error(tab + ' time ladder: the numerical guard stopped dt ' + dts[k]);
            if (Math.abs(r.dtUsed - dts[k]) > 0) throw new Error(tab + ': the instance used dt ' + r.dtUsed + ' instead of ' + dts[k]);
            gpu.push(r.field); twins.push(pack(lat.euler(init, dts[k], steps[k]), ns));
          }
          // RK4 reference at a quarter of the finest step, and at half of that to show it has converged.
          const nRef = steps[steps.length - 1] * 4, ref = pack(lat.rk4(init, Tphys / nRef, nRef), ns), ref2 = pack(lat.rk4(init, Tphys / (2 * nRef), 2 * nRef), ns);
          const R = gpu.map((g, k) => diff(g, twins[k], ns, ns).max);
          const d = gpu.slice(0, -1).map((g, k) => diff(g, gpu[k + 1], ns, ns));
          const e = gpu.map(g => diff(g, ref2, ns, ns));
          const self = orders(dts.slice(0, -1), d.map(x => x.max), R.slice(0, -1).map((r, k) => r + R[k + 1]));
          const tru = orders(dts, e.map(x => x.max), R);
          let range = [Infinity, -Infinity]; for (const g of gpu) for (const v of g) { range[0] = Math.min(range[0], v); range[1] = Math.max(range[1], v); }
          seeds.push({ seed, T: Tphys, dt: dts, steps, stabilityBound: eb, dt0OverBound: dt0 / eb, fieldRange: range.map(r4),
            successiveMax: d.map(x => x.max), successiveRms: d.map(x => x.rms), rounding: R, trueMax: e.map(x => x.max), trueRms: e.map(x => x.rms),
            referenceSensitivity: diff(ref, ref2, ns, ns).max, self, true: tru });
          // failure control: dt doubled inside the step shader, i.e. the update applied twice per recorded step.
          // It is run at dt/2 for twice the steps: the recorded time is still T and each update is still dt,
          // inside the same bound, but the field reaches 2T.
          if (si === 0) {
            const clock = [];
            for (let k = 0; k < dts.length; k++) {
              const r = await run({ key, variant: 'clock', mutations: [{ keys: ['stepFS'], from: 'u_dt', to: '(2.0 * u_dt)', main: true }], state: Object.assign({}, base, { dt: dts[k] / 2 }), W, H, init, steps: 2 * steps[k] });
              clock.push(r.ok ? r.field : null);
            }
            const ce = clock.map(g => g ? diff(g, ref2, ns, ns).max : Infinity), cd = clock.slice(0, -1).map((g, k) => g && clock[k + 1] ? diff(g, clock[k + 1], ns, ns).max : Infinity);
            const ct = orders(dts, ce, null), cs = orders(dts.slice(0, -1), cd, null);
            ctl.clock = { mutant: 'u_dt -> (2.0 * u_dt) in the step shader main(); run at dt/2 for 2n steps (recorded time T, field time 2T)', trueMax: ce, successiveMax: cd, trueOrder: ct.fitted, selfOrder: cs.fitted,
              detected: !(Math.abs(ct.fitted - 1) <= BAND && ce[ce.length - 1] < 10 * e[e.length - 1].max), selfConvergenceDetects: !(Math.abs(cs.fitted - 1) <= BAND) };
          }
          log('  time seed ' + (si + 1) + ': self ' + self.pairwise.map(p => p.toFixed(3)).join(' ') + ' | true ' + tru.pairwise.map(p => p.toFixed(3)).join(' ') + ' | floor points ' + self.onFloor + '/' + tru.onFloor + ' | d ' + d.map(x => x.max.toExponential(2)).join(' ') + ' | e ' + e.map(x => x.max.toExponential(2)).join(' ') + ' | R ' + R.map(x => x.toExponential(2)).join(' '));
        }
        out.time = { grid: [W, H], domain: L, n0, T: Tphys, dt: dts, seeds, self: summarize(seeds.map(s => s.self), T.formal.time), true: summarize(seeds.map(s => s.true), T.formal.time), controls: ctl };
        report.checks.push({ tab, ladder: 'time, successive differences', observed: out.time.self.observed, formal: T.formal.time, pass: out.time.self.pass });
        report.checks.push({ tab, ladder: 'time, true error against Float64 RK4', observed: out.time.true.observed, formal: T.formal.time, pass: out.time.true.pass });
        report.checks.push({ tab, ladder: 'time control: clock doubled', detected: ctl.clock.detected, selfConvergenceDetects: ctl.clock.selfConvergenceDetects });
      }

      // ===================== space ladder =====================
      if (want('space')) for (const [label, SP] of [['space', T.space]].concat([].concat(T.spaceAlt || []).map(a => [a.label || 'spaceAlt', a]))) {
        const fam = T.fam, Ns = SP.N.slice(0, fam === 'rdx' && opts.full ? 4 : 3), nL = Ns.length, main = label === 'space';
        const c0 = Number(base.scale) || 1, L = fam === 'pde' ? SP.L : 32 / c0;
        const hs = Ns.map(N => L / N);
        const stateAt = (k, dtPhys) => {
          const b0 = Object.assign({}, base, SP.state || {});
          if (fam === 'rdx') return { state: Object.assign({}, b0, { scale: Ns[k] / L, dt: dtPhys }), fieldScale: 1, dtScale: 1 };
          const sc = T.scale(b0, hs[k]);
          return { state: Object.assign({}, b0, sc.state, { dt: dtPhys * sc.dtScale }), fieldScale: sc.fieldScale, dtScale: sc.dtScale };
        };
        // Steps per level. pde: dt proportional to h^p (p = 4, or 6 for pfc, the order of the stiffest term), so every
        // level runs at the same fraction of its own explicit bound and the time error, O(dt) = O(h^p), is negligible
        // against the O(h^2) spatial error; one dt shared by all levels would leave the coarse levels taking increments
        // so far below ulp(u) that float32 rounding of the increments dominates them. rdx: one dt for every level, half
        // the smaller of the finest level's bound and the module's own dtMax, so the O(dt) time error is common to all.
        const Tphys = fam === 'pde' ? SP.T : SP.n0 * info.dt0;
        const seeds = [], ctl = {};
        for (let si = 0; si < (SP.seeds || depth.seedsSpace[fam]); si++) {
          const seed = tab + '/space/' + (si + 1);
          const inits = Ns.map((N, k) => { const b = buildInit(tab, seed, N, N, L, fam, SP.maxSum || (fam === 'pde' ? 2 : 3)).f; const fsc = stateAt(k, 1).fieldScale; if (fsc !== 1) for (let i = 0; i < b.length; i += 4) b[i] *= fsc; return b; });
          const meanOf = f => { let m = 0; for (let i = 0; i < f.length; i += 4) m += f[i]; return m / (f.length / 4); };
          const bounds = [];
          for (let k = 0; k < nL; k++) { const st = stateAt(k, 1); bounds.push(bound(st.state, Ns[k], Ns[k], inits[k], meanOf(inits[k])) / st.dtScale); }
          let nSteps;
          if (fam === 'pde') {
            const r = 2 ** (SP.p || 4), unit = r ** (nL - 1), nFine = Math.ceil(Tphys / (0.5 * bounds[nL - 1]) / unit) * unit;
            nSteps = Ns.map((_, k) => nFine / r ** (nL - 1 - k));
          } else {
            const dtMaxFine = await page.evaluate(([k, s]) => window.orderDtMax(k, s), [key, stateAt(nL - 1, 1).state]);
            const n = Math.ceil(Tphys / (0.5 * Math.min(bounds[nL - 1], dtMaxFine)));
            nSteps = Ns.map(() => n);
          }
          const dts = nSteps.map(n => Tphys / n);
          dts.forEach((dt, k) => { if (!(dt <= 0.8 * bounds[k])) throw new Error(tab + ' space ladder: dt ' + dt + ' exceeds 0.8 of the bound ' + bounds[k] + ' at N = ' + Ns[k]); });
          const gpu = [], R = [];
          for (let k = 0; k < nL; k++) {
            const st = stateAt(k, dts[k]), N = Ns[k];
            const r = await run({ key, variant: 'base', state: st.state, W: N, H: N, init: inits[k], steps: nSteps[k] });
            if (!r.ok) throw new Error(tab + ' space ladder: the numerical guard stopped N = ' + N);
            if (fam === 'rdx' && Math.abs(r.dtUsed - st.state.dt) > 0) throw new Error(tab + ': the instance clamped dt');
            const g = Float64Array.from(r.field, v => v / st.fieldScale);
            const twin = pack(lattice(st.state, N, N, r.mean).euler(inits[k], st.state.dt, nSteps[k]), ns).map(v => v / st.fieldScale);
            gpu.push(g); R.push(diff(g, twin, ns, ns).max);
          }
          const d = gpu.slice(0, -1).map((g, k) => diff(g, restrict(gpu[k + 1], Ns[k], Ns[k], ns, fam), ns, ns));
          const self = orders(hs.slice(0, -1), d.map(x => x.max), R.slice(0, -1).map((r, k) => r + R[k + 1]));
          seeds.push({ seed, T: Tphys, dt: dts, steps: nSteps, stabilityBound: bounds, dtOverBound: dts.map((dt, k) => dt / bounds[k]), successiveMax: d.map(x => x.max), successiveRms: d.map(x => x.rms), rounding: R, self });
          log('  ' + label + ' seed ' + (si + 1) + ': steps ' + nSteps.join('/') + ' | d ' + d.map(x => x.max.toExponential(2)).join(' ') + ' | pairwise ' + self.pairwise.map(p => p.toFixed(3)).join(' ') + ' | floor ' + self.onFloor + ' | R ' + R.map(x => x.toExponential(2)).join(' '));
          if (si === 0 && main) {
            // failure control: an inconsistent Laplacian center weight in every shader of the tab
            const mut = fam === 'pde'
              ? (tab === 'pfc' ? { keys: ['muFS', 'stepFS', 'midFS'], from: '- 20.0 * c) / 6.0;', to: '- 19.9 * c) / 6.0;' } : { keys: ['muFS', 'stepFS', 'midFS'], from: '- 4.0 * texture(t, uv).r;', to: '- 3.9 * texture(t, uv).r;' })
              : (Number(base.lap) === 9 ? { keys: ['stepFS'], from: '- 20.0 * c) / 6.0 * u_c2;', to: '- 19.9 * c) / 6.0 * u_c2;' } : { keys: ['stepFS'], from: 'return (n + s + e + w - 4.0 * c) * u_c2;', to: 'return (n + s + e + w - 3.9 * c) * u_c2;' });
            const mg = [];
            for (let k = 0; k < nL; k++) {
              const st = stateAt(k, dts[k]), N = Ns[k];
              const r = await run({ key, variant: 'weight', mutations: [mut], state: st.state, W: N, H: N, init: inits[k], steps: nSteps[k] });
              mg.push(r.ok ? Float64Array.from(r.field, v => v / st.fieldScale) : null);
            }
            const md = mg.slice(0, -1).map((g, k) => g && mg[k + 1] ? diff(g, restrict(mg[k + 1], Ns[k], Ns[k], ns, fam), ns, ns).max : Infinity);
            const mo = orders(hs.slice(0, -1), md, null);
            ctl.weight = { mutant: mut.from.trim() + ' -> ' + mut.to.trim(), successiveMax: md, order: mo.fitted, pairwise: mo.pairwise, guardStopped: mg.some(g => !g), detected: !(Math.abs(mo.fitted - T.formal.space) <= BAND) };
          }
        }
        out[label] = { method: fam === 'pde' ? EPS_NOTE + '; vertex-centered, injection; steps per level proportional to h^-' + (SP.p || 4) : 'the tab\'s own scale parameter (cells per length unit); cell-centered, 2 x 2 average restriction; one dt for all levels',
          domain: L, grids: Ns, h: hs, T: Tphys, state: SP.state || null, note: SP.note || null, seeds, self: summarize(seeds.map(s => s.self), T.formal.space), controls: ctl };
        if (main) {
          report.checks.push({ tab, ladder: 'space, successive differences', observed: out.space.self.observed, formal: T.formal.space, pass: out.space.self.pass });
          report.checks.push({ tab, ladder: 'space control: center weight', detected: ctl.weight.detected });
        }
      }

      // ===================== manufactured solution =====================
      if (want('mms') && MMS_TABS.includes(tab)) out.mms = report.mms[tab] = await manufactured(tab, T, base, info, run, lattice, bound, log);
      if (out.mms) {
        report.checks.push({ tab, ladder: 'manufactured solution, true error', observed: out.mms.order, formal: out.mms.formal, pass: out.mms.pass });
        for (const [k, c] of Object.entries(out.mms.controls)) report.checks.push({ tab, ladder: 'manufactured-solution control: ' + k, detected: c.detected });
      }
      // ===================== float32 floor probe (time ladder carried to dt0/128) =====================
      if (want('floor') && tab === 'cahn') out.floorProbe = await floorProbe(tab, T, base, info, run, lattice, log);
      // ===================== step ceiling against the combined explicit bound (vegetation) =====================
      if (want('ceiling') && tab === 'vegetation') out.ceiling = await ceilingCheck(tab, base, run, key, page, log);

      await page.evaluate(p => window.orderDispose(p), key + '|');
      out.seconds = Math.round((Date.now() - tabStart) / 1000);
      out.mode = opts.full ? 'full' : 'quick';
      out.toolSha256 = TOOL_SHA;
      out.date = new Date().toISOString().slice(0, 10);
      log(tab + ' done in ' + out.seconds + ' s');
    }
    if (errors.length) throw new Error('page errors: ' + errors.join('; '));
  } finally { await browser.close(); }
  report.seconds = Math.round((Date.now() - started) / 1000);
  report.mode = opts.full ? 'full' : 'quick';
  printTable(report);
  if (opts.write) writeReport(report, tabs);
  const failed = report.checks.filter(c => 'pass' in c && !c.pass), missed = report.checks.filter(c => 'detected' in c && !c.detected);
  if (failed.length) process.stderr.write('\n' + failed.length + ' ladder(s) outside |observed - formal| <= ' + BAND + '; see the table and validation/PDE-ORDER.md. A mismatch is a finding, not a harness error.\n');
  // A failure control that is not detected means the harness cannot see a wrong integrator: that is an error.
  if (missed.length) { process.stderr.write(missed.length + ' failure control(s) MISSED\n'); process.exitCode = 1; }
}

// Manufactured solutions. The spatial factors of the source are computed here in Float64 at the grid points and
// uploaded as textures; the shader adds S(x, t_n) with t_n = n dt recovered from the instance's own u_step.
async function manufactured(tab, T, base, info, run, lattice, bound, log) {
  const fam = T.fam, rng = stats.seeded('pde-order/mms/' + tab);
  if (tab === 'cahn') {
    // u* = m + a(t) phi(x, y), a(t) = A (1 + beta t), phi a normalized sum of three low modes on L = 16.
    const L = 16, Ns = [16, 32, 64], m0 = 0.1, A = 0.35, beta = 0.6, Tphys = 0.5, eps = base.eps, M = base.M;
    const modes = pickModes(rng, 2, 3);
    const fields = N => {
      const h = L / N, G1 = new Float64Array(N * N * 4), G2 = new Float64Array(N * N * 4), phi = new Float64Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const X = x * h, Y = y * h; let p = 0, px = 0, py = 0, lp = 0, bp = 0;
        for (const md of modes) { const kx = TAU * md.mx / L, ky = TAU * md.my / L, K = kx * kx + ky * ky, th = kx * X + ky * Y + md.p; p += md.a * Math.cos(th); px -= md.a * kx * Math.sin(th); py -= md.a * ky * Math.sin(th); lp -= md.a * K * Math.cos(th); bp += md.a * K * K * Math.cos(th); }
        const g2 = px * px + py * py, i = (y * N + x) * 4;
        G1[i] = p; G1[i + 1] = lp; G1[i + 2] = 2 * p * lp + 2 * g2; G1[i + 3] = 3 * p * p * lp + 6 * p * g2; G2[i] = bp; phi[y * N + x] = p;
      }
      return { G1, G2, phi };
    };
    const decl = `uniform sampler2D u_mmsG1, u_mmsG2; uniform float u_mmsA, u_mmsBeta, u_mmsM0, u_mmsMob, u_mmsEps2;
float mmsSource(){
  float t = floor(u_step / 1.17 + 0.5) * u_dt;
  float a = u_mmsA * (1.0 + u_mmsBeta * t), at = u_mmsA * u_mmsBeta;
  vec4 g = texture(u_mmsG1, v_uv); float bi = texture(u_mmsG2, v_uv).r;
  float lapMu = 3.0 * u_mmsM0 * u_mmsM0 * a * g.y + 3.0 * u_mmsM0 * a * a * g.z + a * a * a * g.w - a * g.y - u_mmsEps2 * a * bi;
  return at * g.x - u_mmsMob * lapMu;
}
void main(){`;
    const mms = [{ keys: ['stepFS'], from: 'void main(){', to: decl }, { keys: ['stepFS'], from: 'c += u_dt * (diffusion + n);', to: 'c += u_dt * (diffusion + n + mmsSource());' }];
    const variants = { base: [], clock: [{ keys: ['stepFS'], from: 'u_dt', to: '(2.0 * u_dt)', main: true }], weight: [{ keys: ['muFS', 'stepFS'], from: '- 4.0 * texture(t, uv).r;', to: '- 3.9 * texture(t, uv).r;' }] };
    const hs = Ns.map(N => L / N), fin = TABS.cahn.scale(base, hs[2]).state;
    const finInit = (() => { const f = fields(Ns[2]), o = new Float64Array(Ns[2] * Ns[2] * 4); for (let i = 0; i < f.phi.length; i++) { o[i * 4] = m0 + A * f.phi[i]; o[i * 4 + 3] = 1; } return o; })();
    // steps per level proportional to h^-4, as on the space ladder: every level at the same fraction of its bound
    const eb = bound(Object.assign({}, base, fin), Ns[2], Ns[2], finInit, m0);
    const nFine = Math.ceil(Tphys / (0.5 * eb) / 256) * 256, nSteps = [nFine / 256, nFine / 16, nFine], dts = nSteps.map(n => Tphys / n);
    const res = {};
    for (const [name, extra] of Object.entries(variants)) {
      const errs = [];
      for (let k = 0; k < Ns.length; k++) {
        const N = Ns[k], f = fields(N), init = new Float64Array(N * N * 4), sc = TABS.cahn.scale(base, hs[k]).state;
        for (let i = 0; i < N * N; i++) { init[i * 4] = Math.fround(m0 + A * f.phi[i]); init[i * 4 + 3] = 1; }
        const r = await run({ key: 'pde/cahn', variant: 'mms-' + name, mutations: mms.concat(extra), state: Object.assign({}, base, sc, { dt: name === 'clock' ? dts[k] / 2 : dts[k] }),
          uniforms: { u_mmsA: A, u_mmsBeta: beta, u_mmsM0: m0, u_mmsMob: M, u_mmsEps2: eps * eps }, textures: { u_mmsG1: f.G1, u_mmsG2: f.G2 }, W: N, H: N, init, steps: name === 'clock' ? 2 * nSteps[k] : nSteps[k] });
        const aT = A * (1 + beta * Tphys);
        if (!r.ok) { errs.push(Infinity); continue; }
        let e = 0; for (let i = 0; i < N * N; i++) e = Math.max(e, Math.abs(r.field[i] - (m0 + aT * f.phi[i])));
        errs.push(e);
      }
      res[name] = { errors: errs, ...orders(hs, errs, null) };
      log('  mms ' + name + ': ' + errs.map(e => e.toExponential(3)).join(' ') + ' | pairwise ' + res[name].pairwise.map(p => p.toFixed(3)).join(' '));
    }
    // The clock mutant is run for twice the steps at dt/2 so that it reaches the same recorded time n dt as the
    // unmutated run while its (doubled) update stays inside the same bound: its field sits at physical time 2 T.
    const finestBase = res.base.errors[res.base.errors.length - 1];
    return summarizeMms('cahn', 'u* = m + A (1 + beta t) phi(x, y), phi = three modes with |mx| + |my| <= 2 on a 16 x 16 periodic domain; continuum source S = u*_t - M lap mu(u*) added to the explicit update',
      { L, grids: Ns, h: hs, T: Tphys, dt: dts, steps: nSteps, stabilityBoundFinest: eb, m0, A, beta, modes }, res, 2, finestBase, 'steps per level proportional to h^-4 (each level at the same fraction of its explicit bound), so the O(dt) time error is O(h^4) and the error is spatial');
  }
  if (tab === 'turing') {
    // Schnakenberg: u* = u0 + a(t) phi, v* = v0 + b(t) psi about the uniform state (u0, v0) = (a + b, b/(a + b)^2).
    const c0 = Number(base.scale) || 1, Ns = [16, 32, 64], L = 32 / c0, sa = base.sa, sb = base.sb, Dv = base.D;
    const u0 = sa + sb, v0 = sb / (u0 * u0), A = 0.3, B = 0.15, beta = 0.8, Tphys = 32 * info.dt0;
    const pm = pickModes(rng, 3, 3), qm = pickModes(rng, 3, 3);
    const fields = N => {
      const h = L / N, G1 = new Float64Array(N * N * 4), G2 = new Float64Array(N * N * 4), phi = new Float64Array(N * N), psi = new Float64Array(N * N);
      const ev = (ms, X, Y) => { let p = 0, lp = 0; for (const md of ms) { const kx = TAU * md.mx / L, ky = TAU * md.my / L, th = kx * X + ky * Y + md.p; p += md.a * Math.cos(th); lp -= md.a * (kx * kx + ky * ky) * Math.cos(th); } return [p, lp]; };
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const X = (x + 0.5) * h, Y = (y + 0.5) * h, [p, lp] = ev(pm, X, Y), [q, lq] = ev(qm, X, Y), i = (y * N + x) * 4;
        G1[i] = p; G1[i + 1] = lp; G1[i + 2] = q; G1[i + 3] = lq; G2[i] = p * q; G2[i + 1] = p * p; G2[i + 2] = p * p * q;
        phi[y * N + x] = p; psi[y * N + x] = q;
      }
      return { G1, G2, phi, psi };
    };
    const decl = `uniform sampler2D u_mmsG1, u_mmsG2; uniform float u_mmsA, u_mmsB, u_mmsBeta, u_mmsU0, u_mmsV0, u_mmsSa, u_mmsSb, u_mmsDv;
vec2 mmsSource(){
  float t = floor(u_step / 1.17 + 0.5) * u_dt;
  float ea = u_mmsA * (1.0 + u_mmsBeta * t), eat = u_mmsA * u_mmsBeta;
  float eb = u_mmsB * (1.0 - u_mmsBeta * t), ebt = -u_mmsB * u_mmsBeta;
  vec4 g = texture(u_mmsG1, v_uv), q = texture(u_mmsG2, v_uv);
  float u0 = u_mmsU0, v0 = u_mmsV0;
  float uuv = u0 * u0 * v0 + u0 * u0 * eb * g.z + 2.0 * u0 * v0 * ea * g.x + 2.0 * u0 * ea * eb * q.x + v0 * ea * ea * q.y + ea * ea * eb * q.z;
  return vec2(eat * g.x - ea * g.y - u_mmsSa + (u0 + ea * g.x) - uuv, ebt * g.z - u_mmsDv * eb * g.w - u_mmsSb + uuv);
}
void main(){`;
    const mms = [{ keys: ['stepFS'], from: 'void main(){', to: decl },
      { keys: ['stepFS'], from: 'un = (u + u_dt * (L.r + a + u * u * v)) / (1.0 + u_dt);', to: 'vec2 mms = mmsSource(); un = (u + u_dt * (L.r + a + u * u * v + mms.x)) / (1.0 + u_dt);' },
      { keys: ['stepFS'], from: 'vn = (v + u_dt * (u_D * L.g + b)) / (1.0 + u_dt * u * u);', to: 'vn = (v + u_dt * (u_D * L.g + b + mms.y)) / (1.0 + u_dt * u * u);' }];
    const variants = { base: [], clock: [{ keys: ['stepFS'], from: 'u_dt', to: '(2.0 * u_dt)', main: true }], weight: [{ keys: ['stepFS'], from: '- 20.0 * c) / 6.0 * u_c2;', to: '- 19.9 * c) / 6.0 * u_c2;' }] };
    const hs = Ns.map(N => L / N);
    const fin = Object.assign({}, base, { scale: Ns[2] / L });
    const finF = fields(Ns[2]), finInit = new Float64Array(Ns[2] * Ns[2] * 4);
    for (let i = 0; i < Ns[2] * Ns[2]; i++) { finInit[i * 4] = u0 + A * finF.phi[i]; finInit[i * 4 + 1] = v0 + B * finF.psi[i]; finInit[i * 4 + 3] = 1; }
    const eb = bound(fin, 2, 2, finInit, 0);
    const nSteps = Math.ceil(Tphys / (0.5 * eb)), dt = Tphys / nSteps;
    const res = {};
    for (const [name, extra] of Object.entries(variants)) {
      const errs = [];
      for (let k = 0; k < Ns.length; k++) {
        const N = Ns[k], f = fields(N), init = new Float64Array(N * N * 4);
        for (let i = 0; i < N * N; i++) { init[i * 4] = Math.fround(u0 + A * f.phi[i]); init[i * 4 + 1] = Math.fround(v0 + B * f.psi[i]); init[i * 4 + 3] = 1; }
        const r = await run({ key: 'rdx/turing', variant: 'mms-' + name, mutations: mms.concat(extra), state: Object.assign({}, base, { scale: N / L, dt: name === 'clock' ? dt / 2 : dt }),
          uniforms: { u_mmsA: A, u_mmsB: B, u_mmsBeta: beta, u_mmsU0: u0, u_mmsV0: v0, u_mmsSa: sa, u_mmsSb: sb, u_mmsDv: Dv }, textures: { u_mmsG1: f.G1, u_mmsG2: f.G2 }, W: N, H: N, init, steps: name === 'clock' ? 2 * nSteps : nSteps });
        const aT = A * (1 + beta * Tphys), bT = B * (1 - beta * Tphys);
        let e = 0; for (let i = 0; i < N * N; i++) e = Math.max(e, Math.abs(r.field[i * 2] - (u0 + aT * f.phi[i])), Math.abs(r.field[i * 2 + 1] - (v0 + bT * f.psi[i])));
        errs.push(Number.isFinite(e) ? e : Infinity);
      }
      res[name] = { errors: errs, ...orders(hs, errs, null) };
      log('  mms ' + name + ': ' + errs.map(e => e.toExponential(3)).join(' ') + ' | pairwise ' + res[name].pairwise.map(p => p.toFixed(3)).join(' '));
    }
    const finestBase = res.base.errors[res.base.errors.length - 1];
    return summarizeMms('turing', 'Schnakenberg, u* = u0 + A (1 + beta t) phi, v* = v0 + B (1 - beta t) psi, three modes each with |mx| + |my| <= 3; continuum sources added to the explicit gains of the semi-implicit update',
      { L, grids: Ns, scale: Ns.map(N => N / L), h: hs, T: Tphys, dt, steps: nSteps, stabilityBoundFinest: eb, u0, v0, A, B, beta, phiModes: pm, psiModes: qm }, res, 2, finestBase, 'one dt on every grid (half the explicit bound of the finest), so the error is spatial plus a common O(dt) part');
  }
  return null;
}
function summarizeMms(tab, solution, setup, res, formal, finestBase, note) {
  const b = res.base, pass = Math.abs(b.fitted - formal) <= BAND;
  const controls = {};
  for (const name of ['clock', 'weight']) {
    const c = res[name], ok = Number.isFinite(c.fitted) && Math.abs(c.fitted - formal) <= BAND && c.errors[c.errors.length - 1] < 10 * finestBase;
    controls[name] = { errors: c.errors, order: c.fitted, pairwise: c.pairwise, detected: !ok };
  }
  return { solution, setup, errors: b.errors, pairwise: b.pairwise, order: b.fitted, formal, halfRange: b.pairwise.length > 1 ? (Math.max(...b.pairwise) - Math.min(...b.pairwise)) / 2 : null,
    note, pass, controls };
}

// vegetation's dtMax is the minimum of a diffusion limit and an advection limit taken separately, but forward Euler
// on the water row at the grid mode needs them combined, dt (Q D_w c^2 + 2 v c - loss) < 2. For water diffusion
// settings inside the UI range, compare the module's own ceiling with the computed bound, and run the actual
// instance at that ceiling from a smooth field carrying a 1e-6 water checkerboard. The presets are checked too.
async function ceilingCheck(tab, base, run, key, page, log) {
  const N = 32, envelope = [[0.2, 0], [0.2, 2.5], [1.5, 0], [1.5, 2.5]], chk = (x, y) => ((x + y) % 2 ? 1 : -1);
  const boundOf = st => { const L = rdxLattice(tab, st, 2, 2); return stabilityBound((f, dt) => L.step(f, dt, true), envelope, 2); };
  const rows = [];
  for (const Dw of [1, 5, 10, 20]) {
    const st = Object.assign({}, base, { Dw }), dtMax = await page.evaluate(([k, x]) => window.orderDtMax(k, x), [key, st]), bnd = boundOf(st);
    const init = new Float64Array(N * N * 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4; init[i] = Math.fround(0.6 + 0.05 * Math.cos(TAU * x / N) + 1e-6 * chk(x, y)); init[i + 1] = 0.9; init[i + 3] = 1; }
    const amp = [];
    for (const steps of [0, 20, 40]) {
      const r = await run({ key, variant: 'ceiling', state: Object.assign({}, st, { dt: dtMax }), W: N, H: N, init, steps });
      let a = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) a += r.field[(y * N + x) * 2] * chk(x, y);
      amp.push(Math.abs(a / (N * N)));
    }
    rows.push({ Dw, slope: st.slope, scale: st.scale, lap: st.lap, moduleDtMax: dtMax, explicitBound: bnd, ratio: dtMax / bnd, checkerboardAfter0_20_40: amp, grows: amp[1] > 1e-5 || amp[2] > 1e-5 });
    log('  ceiling Dw ' + Dw + ': dtMax ' + dtMax.toFixed(4) + ' bound ' + bnd.toFixed(4) + ' | checkerboard ' + amp.map(v => v.toExponential(2)).join(' '));
  }
  const presets = await page.evaluate(id => JSON.parse(JSON.stringify(window.__ordDefs[id].presets)), tab), pres = [];
  for (const [name, pr] of Object.entries(presets)) {
    const st = Object.assign({}, base, pr.p), dtMax = await page.evaluate(([k, x]) => window.orderDtMax(k, x), [key, st]), eff = Math.min(st.dt, dtMax), bnd = boundOf(st);
    pres.push({ preset: name, effectiveDt: eff, explicitBound: bnd, ratio: eff / bnd });
  }
  return { rule: 'module ceiling = min(diffusion limit, advection limit, mortality limit, 0.25); explicit bound from the Float64 twin at the (pi, pi) mode over water 0.2 to 1.5 and plants 0 to 2.5', envelope, settings: rows, presets: pres };
}

// The time ladder carried until float32 rounding dominates, to show the floor rule acting.
async function floorProbe(tab, T, base, info, run, lattice, log) {
  const W = 32, H = 32, L = 32, dt0 = info.dt0, n0 = 16, levels = 8, ns = 1;
  const { f: init } = buildInit(tab, tab + '/floor', W, H, L, T.fam, 4);
  const dts = Array.from({ length: levels }, (_, k) => dt0 / 2 ** k), steps = dts.map((_, k) => n0 * 2 ** k), Tphys = n0 * dt0;
  let mean = 0; for (let i = 0; i < W * H; i++) mean += init[i * 4]; mean /= W * H;
  const lat = lattice(base, W, H, mean), gpu = [], R = [];
  for (let k = 0; k < levels; k++) {
    const r = await run({ key: T.fam + '/' + tab, variant: 'base', state: Object.assign({}, base, { dt: dts[k] }), W, H, init, steps: steps[k] });
    gpu.push(r.field); R.push(diff(r.field, pack(lat.euler(init, dts[k], steps[k]), ns), ns, ns).max);
  }
  const d = gpu.slice(0, -1).map((g, k) => diff(g, gpu[k + 1], ns, ns).max);
  const floors = R.slice(0, -1).map((r, k) => r + R[k + 1]);
  const withRule = orders(dts.slice(0, -1), d, floors), noRule = orders(dts.slice(0, -1), d, null);
  log('  floor probe: d ' + d.map(x => x.toExponential(2)).join(' ') + ' | R ' + R.map(x => x.toExponential(2)).join(' '));
  return { T: Tphys, dt: dts, steps, successiveMax: d, rounding: R, onFloor: withRule.accepted.map(a => !a), pairwiseAll: noRule.pairwise, fittedAll: noRule.fitted, pairwiseAccepted: withRule.pairwise, fittedAccepted: withRule.fitted };
}

function printTable(report) {
  const f = (v, d = 2) => v == null || !Number.isFinite(v) ? 'n/a' : v.toFixed(d);
  const lines = ['', 'tab         ladder        formal  observed  +/- (half range)  finest pair  seed sd  pass', ''];
  for (const [tab, t] of Object.entries(report.tabs)) {
    const alts = Object.keys(t).filter(k => /^space./.test(k) && t[k] && t[k].self).map(k => [k, t[k].self]);
    for (const [name, s] of [['time', t.time && t.time.self], ['time*', t.time && t.time.true], ['space', t.space && t.space.self]].concat(alts)) {
      if (!s) continue;
      lines.push(tab.padEnd(12) + name.padEnd(14) + String(s.formal).padEnd(8) + f(s.observed, 3).padEnd(10) + f(s.halfRange, 3).padEnd(18) + f(s.finestPairwise, 3).padEnd(13) + f(s.seed && s.seed.sd, 3).padEnd(9) + (/^space./.test(name) ? 'recorded' : s.pass ? 'yes' : 'NO'));
    }
    if (t.mms) lines.push(tab.padEnd(12) + 'mms'.padEnd(14) + String(t.mms.formal).padEnd(8) + f(t.mms.order, 3).padEnd(10) + f(t.mms.halfRange, 3).padEnd(18) + f(t.mms.pairwise[t.mms.pairwise.length - 1], 3).padEnd(13) + '-'.padEnd(9) + (t.mms.pass ? 'yes' : 'NO'));
    if (t.ceiling) for (const c of t.ceiling.settings) lines.push(tab.padEnd(12) + ('ceiling Dw ' + c.Dw).padEnd(14) + 'dtMax ' + f(c.moduleDtMax, 4) + ', bound ' + f(c.explicitBound, 4) + ', ratio ' + f(c.ratio) + (c.grows ? ', checkerboard grows' : ', checkerboard decays'));
    if (t.floorProbe) lines.push(tab.padEnd(12) + 'floor'.padEnd(14) + '1'.padEnd(8) + f(t.floorProbe.fittedAccepted, 3).padEnd(10) + ('all points ' + f(t.floorProbe.fittedAll, 3)).padEnd(31) + '-'.padEnd(9) + 'probe');
  }
  lines.push('', 'time = successive differences, time* = true error against Float64 RK4 of the same semi-discrete system');
  const controls = report.checks.filter(c => 'detected' in c).map(c => c.tab + ' ' + c.ladder + ': ' + (c.detected ? 'detected' : 'MISSED') + (c.selfConvergenceDetects === false ? ' (self-convergence alone does not see it)' : ''));
  lines.push('', 'failure controls:', ...controls.map(c => '  ' + c), '', 'run time ' + report.seconds + ' s, renderer ' + report.environment.renderer);
  console.log(lines.join('\n'));
}

function writeReport(report, tabs) {
  const file = path.join(root, OUT), sources = SOURCE_SHA;
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { prev = null; }
  const same = prev && prev.sources && Object.entries(sources).every(([k, v]) => prev.sources[k] === v);
  const merged = { schema: 1, date: new Date().toISOString().slice(0, 10), tool: { path: 'tools/pde-order.js', sha256: TOOL_SHA }, sources,
    command: 'node tools/pde-order.js [--full] [--tab <id>] --write',
    rules: {
      floor: 'a successive difference d_k is on the float32 floor, and excluded, when d_k < ' + FLOOR_FACTOR + ' (R_k + R_k+1), R the max difference between the GPU run and its Float64 twin (same discrete update, same dt and grid); a true error e_k is excluded when e_k < ' + FLOOR_FACTOR + ' R_k',
      orders: 'pairwise p_k = log(d_k/d_k+1)/log(step ratio) between accepted neighbors; fitted = least-squares slope of log2 d on log2 step over accepted points; observed = mean over seeds of the fitted order',
      spread: 'halfRange = half the range of all accepted pairwise orders over the ladders of all seeds; seed.sd = standard deviation of the per-seed fitted orders',
      pass: '|observed - formal| <= ' + BAND,
      norm: 'maximum absolute difference over all cells and species (rms recorded alongside)',
      stability: 'largest dt at which no decaying eigenvalue of the one-step map of the (pi, pi) grid mode is amplified, the map linearized at the corners of the field envelope widened by 10% through the Float64 twin of the update on a 2 x 2 periodic lattice (dt < 2/|lambda| for a scalar forward Euler row)',
    },
    environment: report.environment,
    tabs: same ? Object.assign({}, prev.tabs) : {}, mms: same ? Object.assign({}, prev.mms) : {} };
  for (const t of tabs) { merged.tabs[t] = report.tabs[t]; if (report.mms[t]) merged.mms[t] = report.mms[t]; }
  merged.runs = (same && prev.runs ? prev.runs : []).concat([{ date: merged.date, mode: report.mode, tabs, seconds: report.seconds, renderer: report.environment.renderer, toolSha256: TOOL_SHA }]);
  const allChecks = [];
  for (const [tab, t] of Object.entries(merged.tabs)) {
    if (t.time) allChecks.push({ tab, ladder: 'time, successive differences', observed: t.time.self.observed, formal: t.formal.time, pass: t.time.self.pass, mode: t.mode },
      { tab, ladder: 'time, true error against Float64 RK4', observed: t.time.true.observed, formal: t.formal.time, pass: t.time.true.pass, mode: t.mode },
      { tab, ladder: 'time control: clock doubled', detected: t.time.controls.clock.detected, selfConvergenceDetects: t.time.controls.clock.selfConvergenceDetects, mode: t.mode });
    if (t.space) allChecks.push({ tab, ladder: 'space, successive differences', observed: t.space.self.observed, formal: t.formal.space, pass: t.space.self.pass, mode: t.mode },
      { tab, ladder: 'space control: center weight', detected: t.space.controls.weight.detected, mode: t.mode });
    if (t.mms) { allChecks.push({ tab, ladder: 'manufactured solution, true error', observed: t.mms.order, formal: t.mms.formal, pass: t.mms.pass, mode: t.mode });
      for (const [k, c] of Object.entries(t.mms.controls)) allChecks.push({ tab, ladder: 'manufactured-solution control: ' + k, detected: c.detected, mode: t.mode }); }
  }
  merged.checks = allChecks;
  const roundDeep = v => Array.isArray(v) ? v.map(roundDeep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDeep(x)])) : typeof v === 'number' && Number.isFinite(v) && !Number.isInteger(v) ? Number(v.toPrecision(6)) : v;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(roundDeep(merged), null, 1) + '\n');
  process.stderr.write('wrote ' + OUT + '\n');
}

if (require.main === module) main().catch(e => { console.error(e && e.stack || e); process.exitCode = 1; });
module.exports = { TABS, rdxLattice, stabilityBound, orders, instrument, pageRuntime };
