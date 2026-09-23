'use strict';
// Actual grains.js (Cundall-Strack disks) run headless with the engine makeRng and util, against analytic
// contact mechanics and independent static-equilibrium and status-line recomputations.
// node tools/grains-science.js [--write]
//
// The subject is the module source read from disk. Read-only hooks expose derive, makeSim and network, the
// integrator's force arrays and springs, and the instance's state; failure controls are single-line mutations
// of the same source. No second implementation of the contact law is used as the subject.
//
// Pre-registration. CRITERIA below were written on 2026-09-23 before any benchmark in this file was run. Before
// writing it, one exploratory run settled the seven presets through the production path and printed their
// status lines (steps, KE, contacts, Z, strongest-10% share), and measured the overlaps of the starting
// lattice; nothing else was looked at. The Z bands were written from isostatic counting before that run, but the
// run displayed Z, so the Z check is a consistency check against isostatic bounds, not a blind prediction.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const original = fs.readFileSync(path.join(root, 'src/modules/grains.js'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
// The engine's own util (makeRng with its discarded draws, ramps, luminance, svgBlob) and palettes.
const utilSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  const util = {'));
const util = new Function('const TAU=2*Math.PI;' + utilSource + 'return { TAU, makeRng, clamp, lerp, luminance, makeRamp, rgbToHex, hexToRgb, svgDoc, svgBlob };')();
const PALETTES = new Function(shared.slice(shared.indexOf('  const PALETTES = {'), shared.indexOf('  function generatePalette(')) + 'return PALETTES;')();

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Expected one hook: ' + before);
  return source.replace(before, after);
}
for (const c of ['const KE_TOL = 2e-7;', 'const KE_REST = 1e-3;', 'const SAFETY = 35;', 'const KT_KN = 0.8;']) assert(original.includes(c), 'grains.js constant changed: ' + c);
const KE_TOL = 2e-7, KE_REST = 1e-3, KT_KN = 0.8;

const API = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
// Read-only hooks: the module's own functions and a copy of its state. Nothing here changes the physics.
function hookSource(source) {
  source = replaceOnce(source, '  Studio.register({', '  Object.assign(hooks, { derive, makeSim, network });\n  Studio.register({');
  source = replaceOnce(source, '    sim.stepOnce = step;', '    sim.stepOnce = step;\n    sim.audit = { fx, fy, tq, wxi, im, iI, forces, rebuild: buildPairs, springs: () => ({ np, pi_, pj_, pxi }) };');
  return replaceOnce(source, API, `        auditBuilding() { return building; },
        auditFinish() { finishNow(); },
        auditLive() { return sim; },
        auditSnapshot() {
          const sp = sim.audit.springs();
          return {
            x: sim.x.slice(), y: sim.y.slice(), vx: sim.vx.slice(), vy: sim.vy.slice(), om: sim.om.slice(), r: sim.r.slice(), m: sim.m.slice(),
            N: sim.N, periodic: sim.periodic, ke: sim.ke, step: sim.step, lidOn: sim.lidOn, lidY: sim.lidY, lidVy: sim.lidVy, top: sim.top(),
            phase, budget, building, D: Object.assign({}, D), wxi: sim.audit.wxi.slice(),
            pairs: { np: sp.np, pi: Array.from(sp.pi_.subarray(0, sp.np)), pj: Array.from(sp.pj_.subarray(0, sp.np)), pxi: Array.from(sp.pxi.subarray(0, sp.np)) },
            net: net && { nc: net.nc, mean: net.mean, fHi: net.fHi, top10: net.top10, Z: net.Z, back: net.back, ci: net.ci.slice(), cj: net.cj.slice(), cf: net.cf.slice(), cdx: net.cdx.slice(), cdy: net.cdy.slice(), load: Array.from(net.load), load95: net.load95 },
            settings: JSON.stringify(host.getState()),
          };
        },
${API}`);
}
function load(mutate = s => s) {
  let module; const hooks = {};
  const source = hookSource(mutate(original));
  new Function('Studio', 'hooks', source)({ util, PALETTES, register: m => { module = m; } }, hooks);
  return { module, hooks };
}
function noopContext() {
  const own = { getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} };
  return new Proxy(own, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
}
function presetState(mod, name, seed) {
  const pre = mod.presets[name];
  assert(pre, 'no preset ' + name);
  return { ...mod.defaults, ...pre.p, palette: pre.palette.colors.slice(), bg: pre.palette.bg, seed: seed || mod.defaults.seed };
}
// The production settle: regenerate() starts the chunked build, then the export path's finishNow() completes it.
function settle(L, state) {
  const s = { ...L.module.defaults, ...state };
  L.module.sanitize(s);
  const status = [];
  const api = L.module.create({ canvas: { width: 8, height: 8, getContext: () => noopContext() }, getState: () => s, setStatus: h => status.push(h),
    isActive: () => false, reducedMotion: () => true, requestRepaint() {}, fault(m) { throw Error(m); } });
  api.regenerate();
  api.auditFinish();
  const snap = api.auditSnapshot();
  return { s, api, snap, status: status[status.length - 1] || '' };
}
// The same settle left to its own setTimeout chunks, the path a viewer who does not export sees.
function settleChunked(L, state) {
  const s = { ...L.module.defaults, ...state };
  L.module.sanitize(s);
  const api = L.module.create({ canvas: { width: 8, height: 8, getContext: () => noopContext() }, getState: () => s, setStatus() {},
    isActive: () => false, reducedMotion: () => true, requestRepaint() {}, fault(m) { throw Error(m); } });
  api.regenerate();
  return new Promise(resolve => (function poll() { if (api.auditBuilding()) setTimeout(poll, 5); else resolve(api.auditSnapshot()); })());
}

/* ---------------- independent references ---------------- */

// Linear spring-dashpot with the no-tension clamp F_n >= 0 (grains.js lines 258-259). The force vanishes at
// omega_d t_c = pi - 2 asin(zeta), before the overlap closes, so e = exp(-zeta omega0 t_c)
// (T. Schwager and T. Poschel, Granular Matter 9, 465 (2007)). Allowing tension gives the textbook
// e = exp(-pi zeta / sqrt(1 - zeta^2)) and t_c = pi / omega_d instead.
function clampedCollision(zeta, omega0) {
  const s = Math.sqrt(1 - zeta * zeta), wd = omega0 * s, tc = (Math.PI - 2 * Math.asin(zeta)) / wd;
  return { e: Math.exp(-zeta * omega0 * tc), tc, overlapTime: tc + 2 * zeta / omega0 };
}
function tensileCollision(zeta, omega0) {
  const s = Math.sqrt(1 - zeta * zeta);
  return { e: Math.exp(-Math.PI * zeta / s), tc: Math.PI / (omega0 * s) };
}
// A disk sliding on a floor under kinetic friction mu m g with the module's background drag c on both velocity
// and spin: u = v + omega r obeys u' = -3 mu g - c u (the 3 is 1 + m r^2 / I with I = m r^2 / 2).
function slideToRoll(v0, mu, g, c) {
  const tStar = Math.log(1 + c * v0 / (3 * mu * g)) / c;
  const v = t => t <= tStar ? (v0 + mu * g / c) * Math.exp(-c * t) - mu * g / c : v(tStar) * Math.exp(-c * (t - tStar));
  const x = t => t <= tStar ? (v0 + mu * g / c) * (1 - Math.exp(-c * t)) / c - mu * g * t / c : x(tStar) + v(tStar) * (1 - Math.exp(-c * (t - tStar))) / c;
  return { tStar, v, x, vRoll: v(tStar) };
}
// From rest under a constant drive a with drag c: v = (a / c)(1 - e^-ct), x = (a / c)(t - (1 - e^-ct) / c).
const driven = (a, c, t) => (a / c) * (t - (1 - Math.exp(-c * t)) / c);

// Every overlapping pair by brute force, with the periodic wrap the module uses.
function contactsOf(st, kn) {
  const out = [];
  for (let i = 0; i < st.N; i++) for (let j = i + 1; j < st.N; j++) {
    let dx = st.x[j] - st.x[i];
    if (st.periodic) { if (dx > 0.5) dx -= 1; else if (dx < -0.5) dx += 1; }
    const dy = st.y[j] - st.y[i], d2 = dx * dx + dy * dy, sum = st.r[i] + st.r[j];
    if (d2 >= sum * sum || d2 === 0) continue;
    out.push({ i, j, dx, dy, d: Math.sqrt(d2), f: kn * (sum - Math.sqrt(d2)) });
  }
  return out;
}
// Wall overlaps as a list: which wall, the normal readout k_n d, and the stored tangential spring.
function wallContactsOf(st, kn) {
  const out = [];
  for (let i = 0; i < st.N; i++) {
    const push = (slot, d, nx, ny) => { if (d > 0) out.push({ i, slot, d, nx, ny, fn: kn * d, xi: st.wxi[i * 4 + slot] }); };
    push(0, st.r[i] - st.y[i], 0, 1);
    if (!st.periodic) { push(1, st.r[i] - st.x[i], 1, 0); push(2, st.r[i] - (1 - st.x[i]), -1, 0); }
    if (st.lidOn) push(3, st.r[i] - (st.lidY - st.y[i]), 0, -1);
  }
  return out;
}
// The status-line quantities rebuilt from positions: contacts, mean force, strongest-tenth share, the 99th
// percentile colour reference, per-grain loads and Z over the backbone after stripping grains with fewer than
// two contacts, repeated to convergence with no cap on the number of passes.
function networkOf(st, kn) {
  const cs = contactsOf(st, kn), ws = wallContactsOf(st, kn), N = st.N;
  const load = new Float64Array(N), wallDeg = new Int32Array(N);
  for (const c of cs) { load[c.i] += c.f; load[c.j] += c.f; }
  for (const w of ws) { load[w.i] += w.fn; wallDeg[w.i]++; }
  const f = cs.map(c => c.f), nc = f.length, total = f.reduce((a, b) => a + b, 0);
  const desc = f.slice().sort((a, b) => b - a), nt = Math.max(1, Math.round(0.1 * nc));
  let top = 0; for (let k = 0; k < nt; k++) top += desc[k];
  const alive = new Uint8Array(N).fill(1);
  let passes = 0, deg;
  for (;;) {
    deg = new Int32Array(N);
    for (const c of cs) if (alive[c.i] && alive[c.j]) { deg[c.i]++; deg[c.j]++; }
    let cut = 0;
    for (let i = 0; i < N; i++) if (alive[i] && deg[i] + wallDeg[i] < 2) { alive[i] = 0; cut++; }
    passes++;
    if (!cut) break;
  }
  let back = 0, bc = 0;
  for (let i = 0; i < N; i++) if (alive[i]) { back++; bc += deg[i] + wallDeg[i]; }
  const asc = Array.from(load).sort((a, b) => a - b);
  return { cs, ws, nc, mean: nc ? total / nc : 1, top10: total > 0 ? top / total : 0, fHi: nc ? Math.max(desc[Math.floor(0.01 * (nc - 1))], 1e-30) : 1,
    Z: back ? bc / back : 0, back, passes, load, load95: Math.max(asc[Math.floor(0.95 * (N - 1))], 1e-30) };
}

/* ---------------- acceptance criteria, fixed before the first run ---------------- */
const CRITERIA = {
  collision: {
    finestRelError: 5e-3,          // e and t_c at h/64 against the clamped analytic collision, every case
    refinementFactor: 10,          // |err_e(h/64)| <= max(|err_e(h)| / 10, 1e-3)
    refinementFloor: 1e-3,
    productionRelErrorE: 0.10,     // e at the production step, damping <= 0.5 (the presets use 0.3 to 0.45)
    productionDampingMax: 0.5,
    tensileSeparation: 10,         // at h/64 and zeta >= 0.2, the tensile formula is off by > 10x the clamped error
    hardnessInvariance: 1e-9,      // e at hardness 800 and 12000 equals e at 4000, same step count
  },
  slide: { displacementRel: 1e-2, tStarRel: 0.02, tStarSteps: 2, elasticSlipFactor: 2.05 },
  incline: { displacementRel: 1e-2, slipRel: 0.03, elasticSlipFactor: 2.05 },
  oblique: { impulseRatioRel: 0.02, slipChangeRel: 0.02 },
  statics: {
    verticalRel: 1e-2,             // |sum wall F_y - W| / floor load
    horizontalRel: 1e-2,           // |sum wall F_x| / floor load
    dashpotShare: 1e-2,            // sum |F_n(full) - k_n delta| / sum k_n delta over every contact
    atRest: KE_REST,               // the module's own threshold for the status line
    readoutRel: 1e-12,             // mean, top10, load95, loads against the independent rebuild; Z and contact set exact
    janssenWallShareMin: 0.05,     // column preset: side-wall friction carries more than 5% of the weight
  },
  coordination: { seeds: 4, frictionless: [3.8, 4.6], mu04: [3.0, 4.0], mu08: [2.8, 3.6], separationSE: 3 },
};

/* ---------------- A. normal collisions ---------------- */
// A unit simulation: the production makeSim with a hand-built D, gravity and drag off (g = 0), radii and
// velocities set through the hooks, and the pair list rebuilt by the module's own buildPairs.
function unitSim(L, base, { geom, damp, mu, h, g, radii }) {
  const s = { geom, damp, mu, dt: h, seed: 'grains-science/unit' };
  const D = { ...base, n: radii.length, p: 0, g };
  const sim = L.hooks.makeSim(s, D);
  radii.forEach((R, i) => { sim.r[i] = R; sim.m[i] = Math.PI * R * R; sim.audit.im[i] = 1 / sim.m[i]; sim.audit.iI[i] = 1 / (0.5 * sim.m[i] * R * R); });
  sim.vx.fill(0); sim.vy.fill(0); sim.om.fill(0); sim.audit.wxi.fill(0);
  return sim;
}
function collide(L, base, { R1, R2, wall, zeta, h, v0 = 0.01 }) {
  const sim = unitSim(L, base, { geom: 'periodic', damp: zeta, mu: 0.4, h, g: 0, radii: wall ? [R1] : [R1, R2] });
  let vnOf, omega0;
  if (wall) {
    sim.x[0] = 0.5; sim.y[0] = R1; sim.vy[0] = -v0;
    vnOf = () => sim.vy[0];
    omega0 = Math.sqrt(base.kn / sim.m[0]);
  } else {
    const m1 = sim.m[0], m2 = sim.m[1];
    sim.x[0] = 0.5 - R1; sim.x[1] = 0.5 + R2; sim.y[0] = sim.y[1] = 0.5;
    sim.vx[0] = v0 * m2 / (m1 + m2); sim.vx[1] = -v0 * m1 / (m1 + m2);
    vnOf = () => -(sim.vx[0] - sim.vx[1]);           // n points from grain 1 to grain 0, i.e. -x
    omega0 = Math.sqrt(base.kn * (m1 + m2) / (m1 * m2));
  }
  sim.audit.rebuild();
  const vBefore = vnOf();
  let forceSteps = 0, overlapSteps = 0, touched = false, k = 0;
  const gap = () => wall ? sim.y[0] - R1 : (sim.x[1] - sim.x[0]) - R1 - R2;
  for (; k < 5e6; k++) {
    const a = [sim.vx[0], sim.vy[0], sim.vx[wall ? 0 : 1]];
    sim.stepOnce();
    if (sim.vx[0] !== a[0] || sim.vy[0] !== a[1] || sim.vx[wall ? 0 : 1] !== a[2]) forceSteps++;
    if (gap() < 0) { overlapSteps++; touched = true; } else if (touched) break;
  }
  const e = vnOf() / -vBefore, ref = clampedCollision(zeta, omega0), tens = tensileCollision(zeta, omega0);
  return { e, tc: forceSteps * h, overlapTime: overlapSteps * h, forceSteps, omega0h: omega0 * h, eRef: ref.e, tcRef: ref.tc, overlapRef: ref.overlapTime,
    eTensile: tens.e, tcTensile: tens.tc, eRelError: e / ref.e - 1, tcRelError: forceSteps * h / ref.tc - 1, eTensileRelError: e / tens.e - 1, spin: Math.abs(sim.om[0]) };
}
function collisionStudy(L, base, h0, zetas, levels) {
  const cases = [];
  const shapes = [['pair r0-r0', base.r0, base.r0, false], ['pair rmin-rmin', base.rmin, base.rmin, false], ['pair rmin-rmax', base.rmin, base.rmax, false], ['floor r0', base.r0, 0, true]];
  for (const [shape, R1, R2, wall] of shapes) for (const zeta of zetas) {
    const rows = levels.map(k => ({ refine: 2 ** k, ...collide(L, base, { R1, R2, wall, zeta, h: h0 / 2 ** k }) }));
    cases.push({ shape, zeta, rows });
  }
  return cases;
}
function judgeCollisions(cases) {
  const C = CRITERIA.collision, misses = [];
  for (const c of cases) {
    const p = c.rows[0], f = c.rows[c.rows.length - 1];
    c.finestPass = Math.abs(f.eRelError) < C.finestRelError && Math.abs(f.tcRelError) < C.finestRelError;
    c.refinementPass = Math.abs(f.eRelError) <= Math.max(Math.abs(p.eRelError) / C.refinementFactor, C.refinementFloor);
    c.productionChecked = c.zeta <= C.productionDampingMax;
    c.productionPass = !c.productionChecked || Math.abs(p.eRelError) < C.productionRelErrorE;
    c.tensileChecked = c.zeta >= 0.2;
    c.tensileRejected = !c.tensileChecked || Math.abs(f.eTensileRelError) > C.tensileSeparation * Math.abs(f.eRelError);
    const fits = [];
    for (let i = 1; i < c.rows.length; i++) fits.push(Math.log2(Math.abs(c.rows[i - 1].eRelError) / Math.abs(c.rows[i].eRelError)));
    c.observedOrders = fits;
    for (const k of ['finestPass', 'refinementPass', 'productionPass', 'tensileRejected']) if (!c[k]) misses.push(c.shape + ' zeta ' + c.zeta + ': ' + k);
  }
  return misses;
}

/* ---------------- B. sliding to rolling on the floor ---------------- */
function slide(L, base, { mu, zeta = 0.35, v0 = 0.05, h }) {
  const sim = unitSim(L, base, { geom: 'periodic', damp: zeta, mu, h, g: base.g, radii: [base.r0] });
  const R = base.r0, m = sim.m[0], c = 0.5 * zeta * Math.sqrt(base.g / base.r0), ref = slideToRoll(v0, mu, base.g, c);
  sim.x[0] = 0.5; sim.y[0] = R - m * base.g / base.kn; sim.vx[0] = v0;
  sim.audit.rebuild();
  const T1 = ref.tStar, T2 = 2 * ref.tStar, n1 = Math.round(T1 / h), n2 = Math.round(T2 / h), n15 = Math.round(1.5 * T1 / h);
  // Rolling means no sustained slip: over the late window [1.5 t*, 2 t*] the contact may only move within the
  // elastic range of the tangential spring, |xi| <= mu F_n / k_t, so by at most twice that.
  let x = 0, s = 0, tStarSteps = null, sLate = null, maxElastic = 0, x1 = null;
  for (let k = 0; k < n2; k++) {
    const u = sim.vx[0] + sim.om[0] * R;                 // slip of the contact point, the negative of the module's v_t
    if (tStarSteps === null && u <= 0) tStarSteps = k;
    if (k === n15) sLate = s;
    if (sLate !== null) maxElastic = Math.max(maxElastic, Math.abs(s - sLate));
    const xb = sim.x[0];
    sim.stepOnce();
    let dx = sim.x[0] - xb; if (dx < -0.5) dx += 1;       // unwrap the periodic box
    x += dx; s += u * h;
    if (k + 1 === n1) x1 = x;
  }
  const xiCap = mu * m * base.g / (KT_KN * base.kn);
  const tStar = tStarSteps === null ? null : tStarSteps * h;
  return { mu, zeta, v0, h, drag: c, steps: n2, tStar, tStarRef: ref.tStar, x1, x1Ref: ref.x(n1 * h), x2: x, x2Ref: ref.x(n2 * h),
    vRollRef: ref.vRoll, vRollRatio: ref.vRoll / v0, lateSlip: maxElastic, elasticLimit: 2 * xiCap,
    x1RelError: x1 / ref.x(n1 * h) - 1, x2RelError: x / ref.x(n2 * h) - 1 };
}
function judgeSlide(r) {
  const C = CRITERIA.slide;
  r.pass = Math.abs(r.x1RelError) < C.displacementRel && Math.abs(r.x2RelError) < C.displacementRel && r.tStar !== null &&
    Math.abs(r.tStar - r.tStarRef) <= C.tStarRel * r.tStarRef + C.tStarSteps * r.h && r.lateSlip <= C.elasticSlipFactor / 2 * r.elasticLimit;
  return r.pass;
}

/* ---------------- C. a disk on an incline: rolls below tan(theta) = 3 mu, slips above ---------------- */
// The floor is tilted by adding the body force m g sin(theta) along x and scaling the vertical weight by cos(theta)
// on the gravity line of forces(); the contact law, wall routine and integrator are untouched.
const tilted = s => replaceOnce(s, '        fy[i] = -m[i] * g - drag * m[i] * vy[i];', '        fy[i] = -m[i] * g * hooks.tilt.c - drag * m[i] * vy[i]; fx[i] += m[i] * g * hooks.tilt.s;');
function incline(L, base, { mu, q, zeta = 0.35, T = 0.5, h }) {
  const th = Math.atan(3 * mu * q), sn = Math.sin(th), cs = Math.cos(th);
  L.hooks.tilt = { s: sn, c: cs };
  const sim = unitSim(L, base, { geom: 'periodic', damp: zeta, mu, h, g: base.g, radii: [base.r0] });
  const R = base.r0, m = sim.m[0], g = base.g, c = 0.5 * zeta * Math.sqrt(g / base.r0);
  sim.x[0] = 0.5; sim.y[0] = R - m * g * cs / base.kn;
  sim.audit.rebuild();
  const n = Math.round(T / h), half = Math.round(n / 2);
  let x = 0, s = 0, sHalf = 0, maxLate = 0;
  for (let k = 0; k < n; k++) {
    const u = sim.vx[0] + sim.om[0] * R, xb = sim.x[0];
    sim.stepOnce();
    let dx = sim.x[0] - xb; if (dx < -0.5) dx += 1;
    x += dx; s += u * h;
    if (k + 1 === half) sHalf = s;
    if (k + 1 > half) maxLate = Math.max(maxLate, Math.abs(s - sHalf));
  }
  const t = n * h, rolls = q < 1;
  const a = rolls ? (2 / 3) * g * sn : g * (sn - mu * cs), A = g * (sn - 3 * mu * cs);
  const xRef = driven(a, c, t), sRef = rolls ? 0 : driven(A, c, t);
  return { mu, q, thetaDeg: th * 180 / Math.PI, tanTheta: Math.tan(th), h, steps: n, rolls, x, xRef, xRelError: x / xRef - 1, slip: s, slipRef: sRef,
    slipRelError: rolls ? null : s / sRef - 1, lateSlip: maxLate, elasticLimit: 2 * mu * m * g * cs / (KT_KN * base.kn) };
}
function judgeIncline(r) {
  const C = CRITERIA.incline;
  r.pass = Math.abs(r.xRelError) < C.displacementRel && (r.rolls ? r.lateSlip <= C.elasticSlipFactor / 2 * r.elasticLimit : Math.abs(r.slipRelError) < C.slipRel);
  return r.pass;
}

/* ---------------- D. oblique grain-grain collision in gross sliding ---------------- */
// Impulse theory for two disks with Coulomb friction that slides throughout: J_t = mu J_n and the relative
// tangential slip at the contact changes by 3 J_t / m_eff (translation plus the spin of both disks).
function oblique(L, base, { mu = 0.4, zeta = 0.35, vn = 0.01, ut = 0.05, h }) {
  const R = base.r0;
  const sim = unitSim(L, base, { geom: 'periodic', damp: zeta, mu, h, g: 0, radii: [R, R] });
  const m = sim.m[0];
  sim.x[0] = 0.5 - R; sim.x[1] = 0.5 + R; sim.y[0] = sim.y[1] = 0.5;
  sim.vx[0] = vn / 2; sim.vx[1] = -vn / 2; sim.vy[0] = ut / 2; sim.vy[1] = -ut / 2;
  sim.audit.rebuild();
  // Fixed pre-collision frame: n0 from grain 1 to grain 0 (-x), t0 = n0 turned a quarter turn (0, -1).
  const slip = () => -(sim.vy[0] - sim.vy[1]) - R * (sim.om[0] + sim.om[1]);
  const u0 = slip(), p0 = [m * sim.vx[0], m * sim.vy[0]];
  let touched = false, k = 0, maxAngle = 0;
  for (; k < 5e6; k++) {
    sim.stepOnce();
    const dx = sim.x[1] - sim.x[0], dy = sim.y[1] - sim.y[0];
    maxAngle = Math.max(maxAngle, Math.abs(Math.atan2(dy, dx)));
    if (Math.hypot(dx, dy) < 2 * R) touched = true; else if (touched) break;
  }
  const J = [m * sim.vx[0] - p0[0], m * sim.vy[0] - p0[1]];
  const Jn = -J[0], Jt = -J[1], mEff = m / 2;
  const du = slip() - u0, duRef = 3 * Jt / mEff;
  return { mu, zeta, vn, ut, h, steps: k, lineOfCentresRotation: maxAngle, Jn, Jt, impulseRatio: Math.abs(Jt / Jn), impulseRatioRelError: Math.abs(Jt / Jn) / mu - 1,
    slipBefore: u0, slipAfter: slip(), slipChange: du, slipChangeRef: duRef, slipChangeRelError: du / duRef - 1, stillSliding: Math.sign(slip()) === Math.sign(u0),
    spins: [sim.om[0], sim.om[1]] };
}
function judgeOblique(r) {
  const C = CRITERIA.oblique;
  r.pass = Math.abs(r.impulseRatioRelError) < C.impulseRatioRel && Math.abs(r.slipChangeRelError) < C.slipChangeRel && r.stillSliding;
  return r.pass;
}

/* ---------------- E. the settled presets: statics and the status line ---------------- */
function statics(run, L) {
  const st = run.snap, D = st.D, kn = D.kn, kt = KT_KN * kn, g = D.g, damp = run.s.damp;
  const nw = networkOf(st, kn);
  let W = 0; for (let i = 0; i < st.N; i++) W += Math.PI * st.r[i] * st.r[i] * g;
  // Boundary forces: normal readout k_n d along n plus the stored tangential spring -k_t xi along t = (-n_y, n_x).
  let Fx = 0, Fy = 0, floor = 0, lid = 0, sideFriction = 0;
  for (const w of nw.ws) {
    const ft = -kt * w.xi, tx = -w.ny, ty = w.nx;
    Fx += w.fn * w.nx + ft * tx; Fy += w.fn * w.ny + ft * ty;
    if (w.slot === 0) floor += w.fn;
    if (w.slot === 3) lid += w.fn;
    if (w.slot === 1 || w.slot === 2) sideFriction += ft * ty;
  }
  // The dashpot term the readout leaves out, at the settled velocities, for every grain and wall contact.
  let dash = 0, readout = 0;
  for (const c of nw.cs) {
    const nx = -c.dx / c.d, ny = -c.dy / c.d, vn = (st.vx[c.i] - st.vx[c.j]) * nx + (st.vy[c.i] - st.vy[c.j]) * ny;
    const mEff = st.m[c.i] * st.m[c.j] / (st.m[c.i] + st.m[c.j]), full = Math.max(0, c.f - 2 * damp * Math.sqrt(mEff * kn) * vn);
    dash += Math.abs(full - c.f); readout += c.f;
  }
  for (const w of nw.ws) {
    const wv = w.slot === 3 ? st.lidVy : 0, vn = st.vx[w.i] * w.nx + (st.vy[w.i] - wv) * w.ny;
    const full = Math.max(0, w.fn - 2 * damp * Math.sqrt(st.m[w.i] * kn) * vn);
    dash += Math.abs(full - w.fn); readout += w.fn;
  }
  // Per-grain residual: the module's own forces() at the settled state (springs saved and restored), which is m a.
  const sim = run.api.auditLive(), sp = sim.audit.springs(), savedP = sp.pxi.slice(), savedW = sim.audit.wxi.slice();
  sim.audit.forces();
  const res = []; for (let i = 0; i < st.N; i++) res.push(Math.hypot(sim.audit.fx[i], sim.audit.fy[i]) / (st.m[i] * g));
  sp.pxi.set(savedP); sim.audit.wxi.set(savedW);
  res.sort((a, b) => a - b);
  // The module's network against the brute-force rebuild.
  const key = (i, j) => i * st.N + j, mod = new Map(st.net.ci.map((i, k) => [key(i, st.net.cj[k]), st.net.cf[k]]));
  let missing = 0, extra = 0, forceErr = 0;
  const seen = new Set();
  for (const c of nw.cs) { const f = mod.get(key(c.i, c.j)); seen.add(key(c.i, c.j)); if (f === undefined) missing++; else forceErr = Math.max(forceErr, Math.abs(f - c.f) / c.f); }
  for (const k of mod.keys()) if (!seen.has(k)) extra++;
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
  let loadErr = 0; for (let i = 0; i < st.N; i++) loadErr = Math.max(loadErr, rel(st.net.load[i], nw.load[i]));
  const readoutCheck = { contactsModule: st.net.nc, contactsBruteForce: nw.nc, missing, extra, forceRelError: forceErr, meanRelError: rel(st.net.mean, nw.mean),
    top10RelError: rel(st.net.top10, nw.top10), fHiRelError: rel(st.net.fHi, nw.fHi), load95RelError: rel(st.net.load95, nw.load95), loadRelError: loadErr,
    ZModule: st.net.Z, ZBruteForce: nw.Z, backboneModule: st.net.back, backboneBruteForce: nw.back, strippingPasses: nw.passes };
  const C = CRITERIA.statics;
  readoutCheck.pass = missing === 0 && extra === 0 && readoutCheck.ZModule === readoutCheck.ZBruteForce && readoutCheck.backboneModule === readoutCheck.backboneBruteForce &&
    ['forceRelError', 'meanRelError', 'top10RelError', 'fHiRelError', 'load95RelError', 'loadRelError'].every(k => readoutCheck[k] <= C.readoutRel);
  const out = {
    grains: st.N, steps: st.step, budget: st.budget, ke: st.ke, reachedKeTol: st.ke < KE_TOL, atRest: st.ke < KE_REST, top: st.top,
    weight: W, floorLoad: floor, lidLoad: lid, sideWallFrictionShare: sideFriction / W,
    verticalResidual: Math.abs(Fy - W) / floor, horizontalResidual: Math.abs(Fx) / floor,
    dashpotShare: dash / readout,
    perGrainResidual: { median: res[Math.floor(0.5 * (res.length - 1))], p95: res[Math.floor(0.95 * (res.length - 1))], max: res[res.length - 1] },
    contacts: nw.nc, Z: nw.Z, top10: nw.top10, meanForceOverGrainWeight: nw.mean / (D.m0 * g),
    readout: readoutCheck, statusLine: run.status.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
  out.staticPass = out.verticalResidual < C.verticalRel && out.horizontalResidual < C.horizontalRel && out.dashpotShare < C.dashpotShare && out.atRest;
  out.pass = out.staticPass && readoutCheck.pass;
  return out;
}
const words = (a, b) => { if (a.length !== b.length) return Infinity; let d = 0; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) d++; return d; };
const stateDiff = (a, b) => ['x', 'y', 'vx', 'vy', 'om', 'r', 'wxi'].reduce((n, k) => n + words(a[k], b[k]), 0) + words(a.pairs.pxi, b.pairs.pxi) +
  (a.step !== b.step || a.ke !== b.ke || a.lidY !== b.lidY ? 1 : 0);
const stateHash = st => sha(JSON.stringify(['x', 'y', 'vx', 'vy', 'om', 'r'].map(k => Array.from(st[k]))));

// How the settle starts: overlaps in the starting lattice and the speed they launch, over the first 400 steps.
function preparation(L, state) {
  const s = { ...L.module.defaults, ...state };
  L.module.sanitize(s);
  const D = L.hooks.derive(s), sim = L.hooks.makeSim(s, D);
  const st = { x: sim.x, y: sim.y, r: sim.r, N: sim.N, periodic: sim.periodic };
  const ov = contactsOf(st, 1).map(c => c.f);
  let vMax = 0, topMax = 0;
  for (let k = 0; k < 400; k++) { sim.stepOnce(); topMax = Math.max(topMax, sim.top()); for (let i = 0; i < sim.N; i++) vMax = Math.max(vMax, Math.hypot(sim.vx[i], sim.vy[i])); }
  return { overlappingPairs: ov.length, grains: sim.N, maxOverlapOverR0: ov.length ? Math.max(...ov) / D.r0 : 0, kickScale: 0.7 * Math.sqrt(D.g * D.r0),
    maxSpeed400: vMax, maxSpeedOverKick: vMax / (0.7 * Math.sqrt(D.g * D.r0)), maxTop400: topMax };
}

const PRESETS = ['pour', 'photo', 'strong', 'arch', 'slip', 'disks', 'column'];
module.exports = { load, settle, settleChunked, presetState, contactsOf, networkOf, stateDiff, stateHash, util, PALETTES, replaceOnce, PRESETS, original, shared, sha };

if (require.main === module) (async () => {
  const t0 = Date.now();
  const L = load();
  const defaults = { ...L.module.defaults }; L.module.sanitize(defaults);
  const base = L.hooks.derive(defaults), h0 = defaults.dt;
  assert.equal(h0, base.dt);
  const misses = [];

  // A. Normal collisions against the clamped analytic law, refined from the production step to h/64.
  const zetas = [0.05, 0.2, 0.35, 0.5, 0.75, 0.9], levels = [0, 1, 2, 3, 4, 5, 6];
  const collisions = collisionStudy(L, base, h0, zetas, levels);
  misses.push(...judgeCollisions(collisions));
  // The production step is derived from the stiffness, so a harder or softer grain takes the same number of
  // steps per contact and restitutes identically.
  const hardness = [800, 4000, 12000].map(hard => {
    const st = { ...L.module.defaults, hard }; L.module.sanitize(st);
    const b = L.hooks.derive(st), r = collide(L, b, { R1: b.r0, R2: b.r0, wall: false, zeta: 0.35, h: st.dt });
    return { hard, dt: st.dt, kn: b.kn, e: r.e, forceSteps: r.forceSteps, omega0h: r.omega0h };
  });
  const hardnessPass = hardness.every(r => Math.abs(r.e / hardness[1].e - 1) < CRITERIA.collision.hardnessInvariance && r.forceSteps === hardness[1].forceSteps);
  if (!hardnessPass) misses.push('hardness invariance');
  console.error('collisions done', ((Date.now() - t0) / 1000).toFixed(1) + 's');

  // B. Sliding to rolling, C. incline threshold, D. oblique gross sliding, all at the production step.
  const slides = [0.1, 0.4, 0.8].map(mu => slide(L, base, { mu, h: h0 }));
  slides.forEach(r => { if (!judgeSlide(r)) misses.push('slide mu ' + r.mu); });
  const LT = load(tilted);
  const inclines = [];
  for (const mu of [0.2, 0.4, 0.8]) for (const q of [0.8, 0.95, 1.05, 1.25]) inclines.push(incline(LT, base, { mu, q, h: h0 }));
  inclines.forEach(r => { if (!judgeIncline(r)) misses.push('incline mu ' + r.mu + ' q ' + r.q); });
  // Tangential speed 0.1 mu: more than twice the 3 mu (1 + e) v_n needed to slide throughout, small enough that the
  // line of centres turns by about 0.012 mu rad during contact.
  const obliques = [0.2, 0.4, 0.8].map(mu => oblique(L, base, { mu, ut: 0.1 * mu, h: h0 }));
  obliques.forEach(r => { if (!judgeOblique(r)) misses.push('oblique mu ' + r.mu); });
  console.error('friction done', ((Date.now() - t0) / 1000).toFixed(1) + 's');

  // E. The seven presets at the default seed through the production settle, plus the pour geometry without
  // friction, where the floor alone must carry the weight.
  const fixtures = [];
  for (const name of PRESETS) {
    const state = presetState(L.module, name), run = settle(L, state);
    const again = settle(L, state);
    const row = { name, seed: state.seed, n: run.s.n, poly: run.s.poly, geom: run.s.geom, press: run.s.press, hard: run.s.hard, damp: run.s.damp, mu: run.s.mu, grav: run.s.grav, aspect: run.s.aspect,
      dt: run.s.dt, stateSha256: stateHash(run.snap), repeatIdentical: stateDiff(run.snap, again.snap) === 0, ...statics(run, L) };
    if (!row.pass) misses.push('statics ' + name + (row.staticPass ? '' : ' (static)') + (row.readout.pass ? '' : ' (readout)'));
    if (!row.repeatIdentical) misses.push('repeat ' + name);
    fixtures.push(row);
    console.error(name, row.steps, row.ke.toExponential(2), 'vert', row.verticalResidual.toExponential(2), 'dash', row.dashpotShare.toExponential(2), 'Z', row.Z.toFixed(3), ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  const frictionless = (() => {
    const state = { ...presetState(L.module, 'pour'), mu: 0 }, run = settle(L, state);
    const row = { name: 'pour, friction 0', seed: state.seed, mu: 0, ...statics(run, L) };
    row.pass = row.pass && row.sideWallFrictionShare === 0;
    if (!row.pass) misses.push('statics pour mu 0');
    return row;
  })();
  const column = fixtures.find(f => f.name === 'column');
  const janssenPass = column.sideWallFrictionShare > CRITERIA.statics.janssenWallShareMin;
  if (!janssenPass) misses.push('janssen column');
  // The module says a chunked build and a blocking one produce the same packing step for step.
  const chunked = await settleChunked(L, presetState(L.module, 'pour'));
  const blocking = settle(L, presetState(L.module, 'pour')).snap;
  const chunkedIdentical = stateDiff(chunked, blocking) === 0;
  if (!chunkedIdentical) misses.push('chunked build differs');
  console.error('presets done', ((Date.now() - t0) / 1000).toFixed(1) + 's');

  // F. Coordination against friction at the pour geometry over independent seeds.
  const coordination = [];
  for (const mu of [0, 0.4, 0.8]) {
    const Zs = [];
    for (let k = 0; k < CRITERIA.coordination.seeds; k++) {
      const run = settle(L, { ...presetState(L.module, 'pour', 'grains-science/z/' + mu + '/' + k), mu });
      const st = statics(run, L);
      Zs.push({ seed: run.s.seed, Z: st.Z, ke: st.ke, atRest: st.atRest, verticalResidual: st.verticalResidual, dashpotShare: st.dashpotShare, readoutPass: st.readout.pass, staticPass: st.staticPass });
    }
    const z = Zs.map(r => r.Z), mean = z.reduce((a, b) => a + b) / z.length, sd = Math.sqrt(z.reduce((a, b) => a + (b - mean) ** 2, 0) / (z.length - 1));
    coordination.push({ mu, runs: Zs, mean, sd, se: sd / Math.sqrt(z.length) });
  }
  const [z0, z4, z8] = coordination, sep = (a, b) => (a.mean - b.mean) / Math.hypot(a.se, b.se), CZ = CRITERIA.coordination;
  const inBand = (v, b) => v >= b[0] && v <= b[1];
  const coordinationResult = { frictionlessInBand: inBand(z0.mean, CZ.frictionless), mu04InBand: inBand(z4.mean, CZ.mu04), mu08InBand: inBand(z8.mean, CZ.mu08),
    separation0to04: sep(z0, z4), separation04to08: sep(z4, z8) };
  coordinationResult.pass = coordinationResult.frictionlessInBand && coordinationResult.mu04InBand && coordinationResult.mu08InBand &&
    coordinationResult.separation0to04 > CZ.separationSE && coordinationResult.separation04to08 > CZ.separationSE;
  for (const k of ['frictionlessInBand', 'mu04InBand', 'mu08InBand']) if (!coordinationResult[k]) misses.push('coordination ' + k);
  if (!(coordinationResult.separation0to04 > CZ.separationSE)) misses.push('coordination separation 0 to 0.4');
  if (!(coordinationResult.separation04to08 > CZ.separationSE)) misses.push('coordination separation 0.4 to 0.8');
  coordination.forEach(c => c.runs.forEach(r => { if (!r.readoutPass) misses.push('readout Z seed ' + r.seed); }));
  console.error('coordination done', ((Date.now() - t0) / 1000).toFixed(1) + 's');

  const prep = PRESETS.map(name => ({ name, ...preparation(L, presetState(L.module, name)) }));

  // Failure controls. Each must be rejected by the same predicate that accepts the production code.
  const r0pair = (LL, zeta = 0.35) => collide(LL, base, { R1: base.r0, R2: base.r0, wall: false, zeta, h: h0 / 64 });
  const push = 'can only push.\n      let fn = kn * delta - gamma * vn;\n      if (fn < 0) fn = 0;';
  const flipped = r0pair(load(s => replaceOnce(s, push, 'can only push.\n      let fn = kn * delta + gamma * vn;\n      if (fn < 0) fn = 0;')));
  const tension = r0pair(load(s => replaceOnce(s, push, 'can only push.\n      let fn = kn * delta - gamma * vn;')));
  // Wall friction switched off inside wall(), judged against the mu = 0.4 prediction.
  const wallCap = '      const lim = mu * fn;\n      if (ft > lim) { ft = lim; xi = -ft / D.kt; }\n      else if (ft < -lim) { ft = -lim; xi = -ft / D.kt; }\n      wxi[k] = xi;';
  const noWallFriction = s => replaceOnce(s, wallCap, wallCap.replace('mu * fn', '0 * fn'));
  const noFriction = slide(load(noWallFriction), base, { mu: 0.4, h: h0 });
  const wallTorque = slide(load(s => replaceOnce(s, '\n      tq[i] -= r[i] * ft;\n    }', '\n      tq[i] += r[i] * ft;\n    }')), base, { mu: 0.4, h: h0 });
  const inclineNoFriction = incline(load(s => noWallFriction(tilted(s))), base, { mu: 0.4, q: 0.8, h: h0 });
  const pairTorque = oblique(load(s => replaceOnce(s, 'tq[j] -= r[j] * ft;', 'tq[j] += r[j] * ft;')), base, { mu: 0.4, ut: 0.04, h: h0 });
  const truncatedRun = settle(load(s => replaceOnce(s, 'kt: KT_KN * kn, period, dt, budget };', 'kt: KT_KN * kn, period, dt, budget: Math.round(0.05 * budget) };')), presetState(L.module, 'pour'));
  const truncated = statics(truncatedRun, L);
  const meanMassRun = settle(load(s => replaceOnce(s, '        fy[i] = -m[i] * g - drag * m[i] * vy[i];', '        fy[i] = -D.m0 * g - drag * m[i] * vy[i];')), presetState(L.module, 'pour'));
  const meanMass = statics(meanMassRun, L);
  const staleRun = settle(load(s => replaceOnce(s, '      if (stale()) buildPairs();', '      if (false) buildPairs();')), presetState(L.module, 'pour'));
  const stale = statics(staleRun, L);
  const failureControls = {
    dashpotSignFlipped: { e: flipped.e, eRef: flipped.eRef, eRelError: flipped.eRelError, rejected: !(Math.abs(flipped.eRelError) < CRITERIA.collision.finestRelError) },
    tensionAllowed: { e: tension.e, eRef: tension.eRef, eTensile: tension.eTensile, eRelError: tension.eRelError, eTensileRelError: tension.eTensileRelError,
      rejected: !(Math.abs(tension.eRelError) < CRITERIA.collision.finestRelError) },
    wallFrictionOff: { x1RelError: noFriction.x1RelError, x2RelError: noFriction.x2RelError, tStar: noFriction.tStar, rejected: !judgeSlide({ ...noFriction }) },
    wallTorqueSignFlipped: { tStar: wallTorque.tStar, x2RelError: wallTorque.x2RelError, rejected: !judgeSlide({ ...wallTorque }) },
    inclineFrictionOff: { q: 0.8, lateSlip: inclineNoFriction.lateSlip, elasticLimit: inclineNoFriction.elasticLimit, xRelError: inclineNoFriction.xRelError, rejected: !judgeIncline({ ...inclineNoFriction }) },
    pairTorqueSignFlipped: { slipChangeRelError: pairTorque.slipChangeRelError, rejected: !judgeOblique({ ...pairTorque }) },
    settleTruncated: { steps: truncated.steps, ke: truncated.ke, atRest: truncated.atRest, verticalResidual: truncated.verticalResidual, dashpotShare: truncated.dashpotShare, rejected: !truncated.staticPass },
    gravityOnMeanMass: { verticalResidual: meanMass.verticalResidual, dashpotShare: meanMass.dashpotShare, rejected: !meanMass.staticPass },
    verletNeverRebuilt: { missing: stale.readout.missing, extra: stale.readout.extra, rejected: !stale.readout.pass },
  };
  for (const [k, v] of Object.entries(failureControls)) assert(v.rejected, 'failure control escaped: ' + k + ' ' + JSON.stringify(v));
  console.error('controls done', ((Date.now() - t0) / 1000).toFixed(1) + 's');

  const result = {
    pass: misses.length === 0, misses,
    source: 'src/modules/grains.js', sourceSha256: sha(original), engineSha256: sha(shared), harnessSha256: sha(fs.readFileSync(__filename)),
    command: 'node tools/grains-science.js --write',
    scope: 'Actual grains.js (derive, makeSim, forces, contact, wall, step, network and the instance settle) run headless in Node with the engine util and makeRng. ' +
      'Binary normal collisions (r0-r0, rmin-rmin and rmin-rmax pairs and a disk on the floor) at damping 0.05 to 0.9, refined from the production step to 1/64 of it; hardness 800, 4000, 12000; ' +
      'a disk sliding into rolling on the floor (friction 0.1, 0.4, 0.8); a disk on an incline at tan(theta)/3mu = 0.8, 0.95, 1.05, 1.25 (friction 0.2, 0.4, 0.8); an oblique grain-grain collision in gross sliding; ' +
      'the seven presets at seed cundall-1979 through the production settle, plus the pour geometry without friction; coordination at the pour geometry for friction 0, 0.4 and 0.8 over four seeds.',
    criteria: CRITERIA,
    parameters: { defaultState: { n: defaults.n, poly: defaults.poly, hard: defaults.hard, damp: defaults.damp, mu: defaults.mu, grav: defaults.grav }, r0: base.r0, rmin: base.rmin, rmax: base.rmax, kn: base.kn, productionDt: h0, contactPeriodMin: base.period },
    collisions, hardness, hardnessPass, slides, inclines, obliques, fixtures, frictionless, janssen: { columnSideWallFrictionShare: column.sideWallFrictionShare, pass: janssenPass },
    chunkedIdentical, coordination, coordinationResult, preparation: prep, failureControls,
    limitations: [
      'Contact-law benchmarks isolate one or two disks with gravity or drag switched off through D; the packings are checked for static equilibrium and bookkeeping, not for their force distribution.',
      'The static load balance follows from Newton\'s third law once the packing is at rest; it certifies that the plate\'s network is a static one, not the statistics of force chains.',
      'Seven presets at one seed and four seeds per friction value for Z; no all-parameter, Radjai force-distribution, Janssen-constant or experimental claim.',
    ],
    environment: { node: process.version, platform: process.platform },
    seconds: (Date.now() - t0) / 1000,
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/grains-science.json'), JSON.stringify(result, null, 2) + '\n');
  const brief = {
    pass: result.pass, misses,
    collisions: collisions.map(c => [c.shape, c.zeta, +c.rows[0].eRelError.toFixed(4), +c.rows[6].eRelError.toFixed(5), +c.rows[6].tcRelError.toFixed(5), c.finestPass, c.refinementPass, c.productionPass, c.tensileRejected]),
    hardness: hardness.map(r => [r.hard, r.e, r.forceSteps]),
    slides: slides.map(r => [r.mu, +r.x1RelError.toFixed(5), +r.x2RelError.toFixed(5), r.tStar, r.tStarRef, r.lateSlip, r.elasticLimit, r.pass]),
    inclines: inclines.map(r => [r.mu, r.q, +r.xRelError.toFixed(5), r.slipRelError === null ? null : +r.slipRelError.toFixed(4), r.lateSlip, r.elasticLimit, r.pass]),
    obliques: obliques.map(r => [r.mu, r.impulseRatioRelError, r.slipChangeRelError, r.lineOfCentresRotation, r.pass]),
    fixtures: fixtures.map(f => [f.name, f.steps, f.ke, f.verticalResidual, f.horizontalResidual, f.dashpotShare, f.perGrainResidual.p95, f.Z, f.top10, f.sideWallFrictionShare, f.readout.pass, f.pass]),
    frictionless: [frictionless.verticalResidual, frictionless.dashpotShare, frictionless.Z, frictionless.pass],
    chunkedIdentical, coordination: coordination.map(c => [c.mu, c.mean, c.sd, c.se]), coordinationResult, preparation: prep, failureControls, seconds: result.seconds,
  };
  console.log(JSON.stringify(brief, null, 1));
  if (!result.pass) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
