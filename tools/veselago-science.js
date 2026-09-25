'use strict';
// Veselago negative-index slab: the actual src/modules/veselago.js rays against an independent Snell trace.
// The production module runs headless through tools/science-harness.js with read-only hooks that record each
// ray's launch angle, segment start, slope and end vertex, every dropped ray, the captured field and peak, and
// the status line. The reference below is written from scratch: vector Snell refraction at the two faces
// (tangential wavevector continuity, n1 sin θ1 = n2 sin θ2, energy leaving the interface), line-plane and
// line-axis intersections, and the closed-form crossing depths of a flat slab. At n = -1 perfect refocusing is
// a geometric identity, so those checks are regression checks, not predictions.
// node tools/veselago-science.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { load, replaceOnce, root } = require('./science-harness');

// ---------------------------------------------------------------------------------------------------------
// Acceptance criteria, fixed before the first run.
const CRITERIA = {
  geometryTolPx: 1e-9,          // entry, exit and end vertices; axis crossings of both slab and exit lines; layout
  focusPeakTolPx: 2.5,          // n = -1: module brightest point behind the slab vs the analytic image slab0 + 2L - d
  focusWindow: { minBehindFacePx: 5, minFromEndPx: 3 }, // n = -1 metric domain: L - d >= 5 and image <= W - 5
  aberrationPeakMarginPx: 2.5,  // n != -1: peak inside [nearest crossing - 2.5, farthest crossing + 2.5]
  minColumnCoverage: 0.7,       // each drawn ray segment inks at least 70% of its eligible columns (1/1.25 = 0.8 minus discreteness)
  strayInk: 0,                  // lit cells farther than half a cell (Chebyshev) from every independently traced ray
  controlRejectPx: 1,           // a failure control is detected when some vertex or crossing is off by more than 1 px
};

const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
const FAN = 0.9; // full launch fan in radians, rays at (r / (N - 1) - 0.5) * FAN

// ---------------------------------------------------------------------------------------------------------
// Independent reference.

// Plate layout: the drawing convention, not physics. Checked separately against the module's captured values.
function layout(cfg) {
  const W = cfg.grid, H = Math.max(48, Math.round(cfg.grid * (ASPECTS[cfg.aspect] || 1)));
  const xs = W * 0.12 + cfg.src * 0.15;
  const face0 = xs + cfg.src, face1 = face0 + cfg.L;
  return { W, H, xs, ys: H / 2, face0, face1, xEnd: W - 2 };
}
const launchAngle = (r, N) => (r / Math.max(1, N - 1) - 0.5) * FAN;

// Snell refraction of unit direction u at a plane with unit normal m pointing into medium 2. The tangential
// component scales by n1/n2, so a negative n2 reverses it and the refracted ray lies on the same side of the
// normal as the incident ray; the normal component stays positive because energy leaves the interface.
// Returns null when no propagating transmitted ray exists (total reflection).
function refract(u, m, n1, n2) {
  const cosI = u[0] * m[0] + u[1] * m[1];
  const tx = (u[0] - cosI * m[0]) * (n1 / n2), ty = (u[1] - cosI * m[1]) * (n1 / n2);
  const t2 = tx * tx + ty * ty;
  if (t2 > 1) return null;
  const c = Math.sqrt(1 - t2);
  return [tx + c * m[0], ty + c * m[1]];
}
const atX = (P, v, X) => { const s = (X - P[0]) / v[0]; return [X, P[1] + s * v[1]]; };
const axisX = (P, v, ys) => (v[1] === 0 ? NaN : P[0] + (ys - P[1]) / v[1] * v[0]);

function snellTrace(cfg) {
  const g = layout(cfg), N = cfg.rays | 0, normal = [1, 0], rays = [];
  for (let r = 0; r < N; r++) {
    const th = launchAngle(r, N), u = [Math.cos(th), Math.sin(th)];
    const P0 = [g.xs, g.ys], P1 = atX(P0, u, g.face0);
    const v = refract(u, normal, 1, cfg.n);
    if (!v) { rays.push({ r, th, tir: true }); continue; }
    const P2 = atX(P1, v, g.face1);
    const w = refract(v, normal, cfg.n, 1);
    const P3 = atX(P2, w, g.xEnd);
    rays.push({
      r, th, tir: false, u, v, w, P0, P1, P2, P3,
      innerLineX: axisX(P1, v, g.ys), outerLineX: axisX(P2, w, g.ys),
      segs: [
        { xa: P0[0], xb: P1[0], ya: P0[1], k: u[1] / u[0] },
        { xa: P1[0], xb: P2[0], ya: P1[1], k: v[1] / v[0] },
        { xa: P2[0], xb: P3[0], ya: P2[1], k: w[1] / w[0] },
      ],
    });
  }
  return { g, rays };
}

// Closed-form outer crossing of a flat slab, measured past the back face: sin θ2 = sin θ / |n|, the ray reaches
// the axis a distance L |tan θ2| / |tan θ| - d behind the slab. Real when positive and n < 0.
function closedFormOuter(theta, n, L, d) {
  const s = Math.abs(Math.sin(theta)) / Math.abs(n);
  if (s > 1) return null;
  const tan2 = s / Math.sqrt(1 - s * s), tan1 = Math.abs(Math.tan(theta));
  return { behindFace: L * tan2 / tan1 - d, innerDepth: d * tan1 / tan2 };
}

// Every lit cell must lie within half a cell (Chebyshev) of an independently traced ray segment, and every
// segment must ink most of the columns it crosses on the plate. Coverage counts a column as inked when any
// lit cell lies in the ray's half-cell tube there.
function inkCheck(field, W, H, rays) {
  const EPS = 1e-7, allowed = new Uint8Array(W * H);
  let segmentsChecked = 0, minCoverage = 1, lowCoverage = 0;
  for (const ray of rays) {
    if (ray.tir) continue;
    for (const s of ray.segs) {
      if (!(s.xb > s.xa)) continue;
      let eligible = 0, hit = 0;
      const c0 = Math.max(0, Math.ceil(s.xa - 0.5 - EPS)), c1 = Math.min(W - 1, Math.floor(s.xb + 0.5 + EPS));
      for (let xi = c0; xi <= c1; xi++) {
        const lo = Math.max(s.xa, xi - 0.5) - EPS, hi = Math.min(s.xb, xi + 0.5) + EPS;
        if (hi < lo) continue;
        const yA = s.ya + s.k * (lo - s.xa), yB = s.ya + s.k * (hi - s.xa);
        const ymin = Math.min(yA, yB), ymax = Math.max(yA, yB);
        const r0 = Math.max(0, Math.ceil(ymin - 0.5 - EPS)), r1 = Math.min(H - 1, Math.floor(ymax + 0.5 + EPS));
        let any = false;
        for (let yi = r0; yi <= r1; yi++) { allowed[yi * W + xi] = 1; if (field[yi * W + xi] > 0) any = true; }
        if (xi - 0.5 >= s.xa && xi + 0.5 <= s.xb && ymin >= 0 && ymax <= H - 1) { eligible++; if (any) hit++; }
      }
      if (eligible >= 4) {
        segmentsChecked++;
        const f = hit / eligible;
        if (f < minCoverage) minCoverage = f;
        if (f < CRITERIA.minColumnCoverage) lowCoverage++;
      }
    }
  }
  let lit = 0, stray = 0, firstStray = null;
  for (let i = 0; i < field.length; i++) if (field[i] > 0) {
    lit++;
    if (!allowed[i]) { stray++; if (!firstStray) firstStray = [i % W, Math.floor(i / W), field[i]]; }
  }
  return { lit, stray, firstStray, segmentsChecked, minCoverage, lowCoverage };
}

// ---------------------------------------------------------------------------------------------------------
// The production module, with read-only hooks.
function hookSource(s) {
  s = replaceOnce(s, '          if (Math.abs(s2) > 1) continue;',
    '          if (Math.abs(s2) > 1) { if (hooks.drop) hooks.drop(r, th, s2); continue; }');
  s = replaceOnce(s, '          let px = x0, py = yS;',
    '          let px = x0, py = yS;\n          if (hooks.ray) hooks.ray(r, th, th2, px, py);');
  s = replaceOnce(s, '            const k = tdy[seg] / Math.max(0.05, tdx[seg]);',
    '            const k = tdy[seg] / Math.max(0.05, tdx[seg]);\n            if (hooks.seg) hooks.seg(r, seg, px, py, xEnd, k, steps);');
  s = replaceOnce(s, '            px = xEnd;', '            px = xEnd;\n            if (hooks.vertex) hooks.vertex(r, seg, px, py);');
  // The status line reads only the label here. Its measured-against-reference span goes through the shared
  // stats harness, which the headless loader does not provide, so that span is replaced by plain text.
  s = replaceOnce(s, '      function status() {\n',
    '      hooks.status = () => status();\n      function status() {\n');
  s = replaceOnce(s, '          ? U.stats.compare({', '          ? (o => \'<span>\' + o.label + \' <b>\' + f3(o.measured) + \'</b></span>\')({');
  s = replaceOnce(s, "        host.setStatus('<span>n <b>'", "        (hooks.setStatus || host.setStatus)('<span>n <b>'");
  return s;
}
const CAPTURE = 'field,W,H,metric,extra,peakX,peakI,x0,slab0,slab1,yS';
function loadModule(mutate = s => s) {
  return load('veselago', { names: 'sanitize,SCHEMA,DEFAULTS,PRESETS', capture: CAPTURE, mutate: s => mutate(hookSource(s)) });
}

function runModule(mod, cfg) {
  const rays = new Map(), drops = [];
  mod.hooks.ray = (r, th, th2, px, py) => rays.set(r, { r, th, th2, start: [px, py], segs: [], vertices: [] });
  mod.hooks.seg = (r, seg, px, py, xEnd, k, steps) => rays.get(r).segs.push({ seg, px, py, xEnd, k, steps });
  mod.hooks.vertex = (r, seg, px, py) => rays.get(r).vertices.push([px, py]);
  mod.hooks.drop = (r, th, s2) => drops.push({ r, th, s2 });
  const sample = mod.compute({ n: cfg.n, L: cfg.L, src: cfg.src, rays: cfg.rays, grid: cfg.grid, aspect: cfg.aspect });
  let statusHtml = null;
  mod.hooks.setStatus = h => { statusHtml = h; };
  mod.hooks.status();
  mod.hooks.setStatus = null;
  const label = /Veselago focus/.test(statusHtml) ? 'Veselago focus' : /shifted/.test(statusHtml) ? 'shifted' : null;
  return { ...sample, rays, drops, statusHtml, label };
}

// Line-axis intersection of the module's drawn segment, from its own start vertex and slope.
const moduleAxisX = (P, k, ys) => (k === 0 ? NaN : P[0] + (ys - P[1]) / k);

function compareRays(m, ref) {
  const g = ref.g, out = { rays: 0, dropped: 0, dropMismatch: 0, maxVertexErr: 0, maxCrossErr: 0, maxLayoutErr: 0,
    maxAngleErr: 0, nonfinite: 0, missing: 0 };
  const upd = (key, e) => { if (!Number.isFinite(e)) { out.nonfinite++; out[key] = Infinity; } else if (e > out[key]) out[key] = e; };
  upd('maxLayoutErr', Math.abs(m.x0 - g.xs)); upd('maxLayoutErr', Math.abs(m.slab0 - g.face0));
  upd('maxLayoutErr', Math.abs(m.slab1 - g.face1)); upd('maxLayoutErr', Math.abs(m.yS - g.ys));
  if (m.W !== g.W || m.H !== g.H) out.maxLayoutErr = Infinity;
  const dropped = new Set(m.drops.map(d => d.r));
  for (const R of ref.rays) {
    const mr = m.rays.get(R.r);
    if (R.tir !== dropped.has(R.r)) { out.dropMismatch++; continue; }
    if (R.tir) { out.dropped++; if (mr) out.dropMismatch++; continue; }
    if (!mr || mr.vertices.length !== 3 || mr.segs.length !== 3) { out.missing++; continue; }
    out.rays++;
    upd('maxAngleErr', Math.abs(mr.th - R.th));
    upd('maxVertexErr', Math.abs(mr.start[0] - R.P0[0])); upd('maxVertexErr', Math.abs(mr.start[1] - R.P0[1]));
    [R.P1, R.P2, R.P3].forEach((P, i) => {
      upd('maxVertexErr', Math.abs(mr.vertices[i][0] - P[0]));
      upd('maxVertexErr', Math.abs(mr.vertices[i][1] - P[1]));
    });
    if (Math.abs(R.th) > 1e-12) {
      upd('maxCrossErr', Math.abs(moduleAxisX(mr.vertices[0], mr.segs[1].k, m.yS) - R.innerLineX));
      upd('maxCrossErr', Math.abs(moduleAxisX(mr.vertices[1], mr.segs[2].k, m.yS) - R.outerLineX));
    }
  }
  out.pass = out.dropMismatch === 0 && out.missing === 0 && out.nonfinite === 0 && out.maxAngleErr === 0 &&
    out.maxLayoutErr <= CRITERIA.geometryTolPx && out.maxVertexErr <= CRITERIA.geometryTolPx && out.maxCrossErr <= CRITERIA.geometryTolPx;
  return out;
}

// Real axis crossings of the independent trace: inside the slab and behind it.
function crossings(ref) {
  const g = ref.g, inner = [], outer = [];
  for (const R of ref.rays) {
    if (R.tir || Math.abs(R.th) < 1e-12) continue;
    if (R.innerLineX > g.face0 && R.innerLineX < g.face1) inner.push(R.innerLineX);
    if (R.outerLineX > g.face1) outer.push(R.outerLineX);
  }
  return { inner, outer };
}
// Where the independent rays meet the axis behind the slab, relative to the module's search window (x > back face + 2, up to W - 2).
function imageKind(ref, X) {
  const g = ref.g, nonTir = ref.rays.filter(R => !R.tir && Math.abs(R.th) > 1e-12).length;
  if (X.outer.length === 0) return 'noRealImageBehindSlab';
  const inWindow = X.outer.filter(x => x > g.face1 + 2 && x <= g.xEnd).length;
  return inWindow === nonTir ? 'imageInWindow' : 'crossingsPartlyOutsideWindow';
}
const spread = a => (a.length ? Math.max(...a) - Math.min(...a) : null);
const within = (a, lo, hi) => a.length > 0 && a.every(x => x >= lo && x <= hi);

// ---------------------------------------------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const nSteps = () => { const a = []; for (let i = 0; i <= 36; i++) a.push(Math.round((-2.2 + 0.05 * i) * 100) / 100); return a; };
const r6 = v => (v === null || v === undefined || !Number.isFinite(v) ? v : Math.round(v * 1e6) / 1e6);
const sci = v => (v === null || v === undefined || !Number.isFinite(v) ? v : Number(v.toPrecision(3)));

function main() {
  const t0 = performance.now();
  const mod = loadModule();
  const H = mod.hooks;

  // Schema and sanitize: the ranges this review claims to cover.
  const schema = Object.fromEntries(H.SCHEMA.filter(f => f.type === 'range').map(f => [f.key, [f.min, f.max, f.step]]));
  const gridsAfterSanitize = [96, 112, 128, 144, 160, 176, 192, 208, 224].map(gv => { const s = { grid: gv }; H.sanitize(s); return [gv, s.grid]; });
  const aspectOptions = H.SCHEMA.find(f => f.key === 'aspect').options.map(o => o[0]);

  // 1. Whole-domain sweep: slider n values, thickness, source distance, ray count, grid and aspect.
  const sweepAxes = { n: nSteps(), L: [20, 36, 48, 64, 80], src: [8, 16, 24, 36, 50], rays: [12, 28, 48, 64], grid: [128, 144, 192, 224], aspect: aspectOptions };
  const sweep = { configs: 0, inDomain: 0, rays: 0, dropped: 0, maxVertexErr: 0, maxCrossErr: 0, maxLayoutErr: 0, dropMismatch: 0,
    missing: 0, nonfinite: 0, failedGeometry: 0, stray: 0, lit: 0, segmentsChecked: 0, minCoverage: 1, lowCoverage: 0,
    labelRuleViolations: 0, tirConfigs: 0 };
  // Status label against the independent image, measured over the in-domain sweep (no acceptance criterion: the label is not validated).
  const labelSweep = { imageInWindow: { configs: 0, labelledFocus: 0 }, crossingsPartlyOutsideWindow: { configs: 0, labelledFocus: 0 },
    noRealImageBehindSlab: { configs: 0, labelledFocus: 0 }, labelledFocusNoImageExample: null };
  const offPlate = { configs: 0, grids: {}, withStray: 0, strayCells: 0, maxVertexErr: 0, example: null };
  const sweepTime = performance.now();
  for (const n of sweepAxes.n) for (const L of sweepAxes.L) for (const src of sweepAxes.src) for (const rays of sweepAxes.rays)
    for (const grid of sweepAxes.grid) for (const aspect of sweepAxes.aspect) {
      const cfg = { n, L, src, rays, grid, aspect };
      const m = runModule(mod, cfg), ref = snellTrace(cfg), c = compareRays(m, ref), ink = inkCheck(m.field, m.W, m.H, ref.rays);
      sweep.configs++;
      if ((Math.abs(m.metric) < 0.12) !== (m.label === 'Veselago focus')) sweep.labelRuleViolations++;
      if (ref.g.face1 > ref.g.xEnd) {
        // Declared outside the domain: the slab's back face lies beyond the last drawn column.
        offPlate.configs++; offPlate.grids[grid] = (offPlate.grids[grid] || 0) + 1; offPlate.maxVertexErr = Math.max(offPlate.maxVertexErr, c.maxVertexErr);
        if (ink.stray) { offPlate.withStray++; offPlate.strayCells += ink.stray; if (!offPlate.example) offPlate.example = { ...cfg, W: m.W, H: m.H, face1: r6(ref.g.face1), xEnd: ref.g.xEnd, stray: ink.stray, firstStray: ink.firstStray }; }
        continue;
      }
      sweep.inDomain++;
      {
        const X = crossings(ref), kind = imageKind(ref, X), row = labelSweep[kind];
        row.configs++;
        if (m.label === 'Veselago focus') {
          row.labelledFocus++;
          if (kind === 'noRealImageBehindSlab' && !labelSweep.labelledFocusNoImageExample) labelSweep.labelledFocusNoImageExample = { ...cfg, metric: r6(m.metric) };
        }
      }
      sweep.rays += c.rays; sweep.dropped += c.dropped; if (c.dropped) sweep.tirConfigs++;
      sweep.dropMismatch += c.dropMismatch; sweep.missing += c.missing; sweep.nonfinite += c.nonfinite;
      sweep.maxVertexErr = Math.max(sweep.maxVertexErr, c.maxVertexErr); sweep.maxCrossErr = Math.max(sweep.maxCrossErr, c.maxCrossErr);
      sweep.maxLayoutErr = Math.max(sweep.maxLayoutErr, c.maxLayoutErr);
      if (!c.pass) sweep.failedGeometry++;
      sweep.stray += ink.stray; sweep.lit += ink.lit; sweep.segmentsChecked += ink.segmentsChecked;
      sweep.minCoverage = Math.min(sweep.minCoverage, ink.minCoverage); sweep.lowCoverage += ink.lowCoverage;
    }
  sweep.seconds = Math.round((performance.now() - sweepTime) / 100) / 10;
  sweep.pass = sweep.failedGeometry === 0 && sweep.stray === CRITERIA.strayInk && sweep.lowCoverage === 0 && sweep.labelRuleViolations === 0;

  // 2. Continuous values a URL hash can carry, between the slider steps, away from the grazing band n > -0.44.
  const rnd = mulberry32(19680509), cont = { configs: 0, rays: 0, maxVertexErr: 0, maxCrossErr: 0, failedGeometry: 0, stray: 0, lowCoverage: 0, skippedOffPlate: 0 };
  for (let i = 0; i < 3000; i++) {
    const cfg = { n: -2.2 + rnd() * (2.2 - 0.44), L: 20 + rnd() * 60, src: 8 + rnd() * 42, rays: 12 + 2 * Math.floor(rnd() * 27),
      grid: 128 + 16 * Math.floor(rnd() * 7), aspect: aspectOptions[Math.floor(rnd() * aspectOptions.length)] };
    const ref = snellTrace(cfg);
    if (ref.g.face1 > ref.g.xEnd) { cont.skippedOffPlate++; continue; }
    const m = runModule(mod, cfg), c = compareRays(m, ref), ink = inkCheck(m.field, m.W, m.H, ref.rays);
    cont.configs++; cont.rays += c.rays;
    cont.maxVertexErr = Math.max(cont.maxVertexErr, c.maxVertexErr); cont.maxCrossErr = Math.max(cont.maxCrossErr, c.maxCrossErr);
    if (!c.pass) cont.failedGeometry++;
    cont.stray += ink.stray; cont.lowCoverage += ink.lowCoverage;
  }
  cont.pass = cont.failedGeometry === 0 && cont.stray === 0 && cont.lowCoverage === 0;

  // 3. Named index fixtures at the default slab: per-ray comparison, crossings, paraxial image and aberration.
  const base = { L: 48, src: 24, rays: 28, grid: 192, aspect: '1:1' };
  const fixtures = [-1, -0.8, -1.2, -1.5, -2.2, -0.4, 1.5].map(n => {
    const cfg = { ...base, n }, m = runModule(mod, cfg), ref = snellTrace(cfg), c = compareRays(m, ref), X = crossings(ref);
    const g = ref.g, perRay = [];
    let closedFormErr = 0;
    for (const R of ref.rays) {
      if (R.tir || R.th <= 0) continue; // the fan is symmetric; list the upper half
      const mr = m.rays.get(R.r), cf = n < 0 ? closedFormOuter(R.th, n, cfg.L, cfg.src) : null;
      const mOuter = moduleAxisX(mr.vertices[1], mr.segs[2].k, m.yS), mInner = moduleAxisX(mr.vertices[0], mr.segs[1].k, m.yS);
      if (cf) closedFormErr = Math.max(closedFormErr, Math.abs(mOuter - (g.face1 + cf.behindFace)), Math.abs(mInner - (g.face0 + cf.innerDepth)));
      perRay.push({ theta: r6(R.th), entryY: r6(mr.vertices[0][1] - g.ys), exitY: r6(mr.vertices[1][1] - g.ys),
        innerDepth: r6(mInner - g.face0), outerBehindFace: r6(mOuter - g.face1),
        closedFormOuterBehindFace: cf ? r6(cf.behindFace) : null });
    }
    const paraxialBehindFace = n < 0 ? cfg.L / Math.abs(n) - cfg.src : null;
    const outerBehind = X.outer.map(x => x - g.face1);
    const innermost = perRay.length ? perRay[0] : null, marginal = perRay.length ? perRay[perRay.length - 1] : null;
    const sMin = Math.sin(Math.abs(launchAngle(base.rays / 2, base.rays)));
    const thirdOrderBound = n < 0 ? (cfg.L / Math.abs(n)) * sMin * sMin * Math.abs(1 / (n * n) - 1) : null;
    const paraxialGap = n < 0 && innermost && innermost.outerBehindFace !== null ? Math.abs(innermost.outerBehindFace - paraxialBehindFace) : null;
    const allReal = X.outer.length === c.rays && c.rays > 0;
    const winLo = g.face1 + 2, winHi = g.xEnd;
    const allInWindow = allReal && within(X.outer, winLo, winHi);
    const peakInCaustic = allInWindow ? (m.peakX >= Math.min(...X.outer) - CRITERIA.aberrationPeakMarginPx && m.peakX <= Math.max(...X.outer) + CRITERIA.aberrationPeakMarginPx) : null;
    return {
      n, cfg, compare: c, dropped: m.drops.length, closedFormMaxErr: sci(closedFormErr),
      paraxialImageBehindFace: r6(paraxialBehindFace), innermostBehindFace: innermost ? innermost.outerBehindFace : null,
      marginalBehindFace: marginal ? marginal.outerBehindFace : null, paraxialGap: sci(paraxialGap), thirdOrderBound: sci(thirdOrderBound),
      paraxialWithinBound: paraxialGap === null ? null : paraxialGap <= thirdOrderBound,
      raysCrossingInside: X.inner.length, raysCrossingBehind: X.outer.length, outerSpreadPx: r6(spread(outerBehind)),
      aberrationSign: outerBehind.length > 1 ? Math.sign((marginal.outerBehindFace) - (innermost.outerBehindFace)) : null,
      peakX: r6(m.peakX), peakBehindFace: r6(m.peakX - g.face1), metric: r6(m.metric), label: m.label,
      allCrossingsInWindow: allInWindow, peakInCaustic, perRay,
    };
  });
  const fixturesPass = fixtures.every(f => f.compare.pass && (f.n > 0 || f.n === -1 || (f.closedFormMaxErr <= CRITERIA.geometryTolPx && f.paraxialWithinBound !== false))) &&
    fixtures.filter(f => f.n < 0 && f.n !== -1 && f.raysCrossingBehind > 1).every(f => f.aberrationSign === Math.sign(1 / (f.n * f.n) - 1)) &&
    fixtures.filter(f => f.peakInCaustic !== null).every(f => f.peakInCaustic);

  // 4. n = -1 analytic images: inside at slab0 + d, behind at slab0 + 2L - d. Regression check (identity).
  const identity = { configs: 0, rays: 0, maxInnerErr: 0, maxOuterErr: 0, virtualConfigs: 0, virtualRaysCrossingBehind: 0 };
  const metricRows = [];
  const metricAgg = { configs: 0, maxPeakErrEvenH: 0, maxPeakErrOddH: 0, evenH: 0, oddH: 0, fails: 0, peakIMismatch: 0, labelFocus: 0, maxAbsMetric: 0, formulaErr: 0 };
  for (const L of [20, 28, 36, 48, 64, 80]) for (const src of [8, 12, 16, 20, 24, 30, 36, 44, 50]) for (const grid of [128, 144, 160, 176, 192, 208, 224])
    for (const aspect of aspectOptions) for (const rays of [12, 28, 64]) {
      const cfg = { n: -1, L, src, rays, grid, aspect }, ref = snellTrace(cfg), g = ref.g;
      if (g.face1 > g.xEnd) continue;
      const m = runModule(mod, cfg);
      identity.configs++;
      if (src < L) {
        for (const R of ref.rays) {
          if (Math.abs(R.th) < 1e-12) continue;
          const mr = m.rays.get(R.r);
          identity.rays++;
          identity.maxInnerErr = Math.max(identity.maxInnerErr, Math.abs(moduleAxisX(mr.vertices[0], mr.segs[1].k, m.yS) - (g.face0 + src)));
          identity.maxOuterErr = Math.max(identity.maxOuterErr, Math.abs(moduleAxisX(mr.vertices[1], mr.segs[2].k, m.yS) - (g.face0 + 2 * L - src)));
        }
      } else if (src > L) {
        identity.virtualConfigs++;
        identity.virtualRaysCrossingBehind += crossings(ref).outer.length;
      }
      // Metric domain: a real image at least 5 px behind the slab and 3 px before the last drawn column.
      const xf = g.face0 + 2 * L - src;
      metricAgg.formulaErr = Math.max(metricAgg.formulaErr, Math.abs(m.metric - (m.peakX - xf) / Math.max(1, m.W)));
      if (L - src >= CRITERIA.focusWindow.minBehindFacePx && xf <= g.xEnd - CRITERIA.focusWindow.minFromEndPx) {
        metricAgg.configs++;
        const err = Math.abs(m.peakX - xf), odd = m.H % 2 === 1;
        if (odd) { metricAgg.oddH++; metricAgg.maxPeakErrOddH = Math.max(metricAgg.maxPeakErrOddH, err); }
        else { metricAgg.evenH++; metricAgg.maxPeakErrEvenH = Math.max(metricAgg.maxPeakErrEvenH, err); }
        if (err > CRITERIA.focusPeakTolPx) { metricAgg.fails++; if (metricRows.length < 20) metricRows.push({ ...cfg, H: m.H, peakX: r6(m.peakX), image: r6(xf), err: r6(err) }); }
        // Independent brightest cell in (a superset of) the module's search window.
        let vmax = 0;
        for (let yi = 0; yi < m.H; yi++) {
          if (!(Math.abs(yi - m.yS) < 0.2 * m.H + 0.5)) continue;
          for (let xi = Math.ceil(g.face1 + 1.5); xi < m.W; xi++) vmax = Math.max(vmax, m.field[yi * m.W + xi]);
        }
        if (m.peakI !== vmax) metricAgg.peakIMismatch++;
        if (m.label === 'Veselago focus') metricAgg.labelFocus++;
        metricAgg.maxAbsMetric = Math.max(metricAgg.maxAbsMetric, Math.abs(m.metric));
      }
    }
  identity.pass = identity.maxInnerErr <= CRITERIA.geometryTolPx && identity.maxOuterErr <= CRITERIA.geometryTolPx && identity.virtualRaysCrossingBehind === 0;
  metricAgg.pass = metricAgg.fails === 0 && metricAgg.peakIMismatch === 0 && metricAgg.formulaErr <= 1e-12;

  // 5. Total reflection: rays whose transmitted ray does not exist are skipped by the module (veselago.js:79).
  const tir = [];
  for (const n of nSteps()) for (const rays of [12, 28, 48, 64]) {
    const cfg = { ...base, n, rays }, m = runModule(mod, cfg), ref = snellTrace(cfg);
    const expected = ref.rays.filter(R => R.tir).map(R => R.r), got = m.drops.map(d => d.r);
    if (expected.length || got.length) tir.push({ n, rays, dropped: got.length, expectedTir: expected.length,
      same: JSON.stringify(expected) === JSON.stringify(got), smallestDroppedAngle: got.length ? r6(Math.min(...m.drops.map(d => Math.abs(d.th)))) : null });
  }
  const criticalAngle = Math.asin(0.4);
  const tirSummary = { sliderValuesWithDrops: [...new Set(tir.map(t => t.n))], rows: tir, criticalAngleAtMinus040: r6(criticalAngle),
    fanHalfAngle: FAN / 2, tirThresholdIndex: r6(Math.sin(FAN / 2)), allMatch: tir.every(t => t.same) };

  // 6. Grazing band reachable only through a URL hash: -sin(0.45) < n < -0.4 lets cos θ2 fall under the 0.05 slope clamp (veselago.js:88).
  const clampN = -Math.sin(FAN / 2) / 0.9993, clampCfg = { ...base, n: clampN };
  const clampRun = runModule(mod, clampCfg), clampRef = snellTrace(clampCfg), clampCmp = compareRays(clampRun, clampRef);
  let clampedRays = 0;
  for (const mr of clampRun.rays.values()) if (Math.abs(Math.cos(mr.th2)) < 0.05) clampedRays++;
  const clampSlider = [];
  for (const n of nSteps()) for (let rays = 12; rays <= 64; rays++) {
    for (let r = 0; r < rays; r++) {
      const s2 = Math.sin(launchAngle(r, rays)) / n;
      if (Math.abs(s2) <= 1 && Math.sqrt(1 - s2 * s2) < 0.05) clampSlider.push({ n, rays, r });
    }
  }
  const grazing = { n: r6(clampN), clampedRays, maxVertexErrPx: r6(clampCmp.maxVertexErr), maxCrossErrPx: r6(clampCmp.maxCrossErr),
    clampedRaysAtSliderIndices: clampSlider.length, tirBandLow: r6(-Math.sin(FAN / 2)) }; // every slider n, every ray count 12..64

  // 7. Status label: 12% of the plate width around 2L - d, over the slider n at the default slab and grid.
  const labelRows = nSteps().concat([1]).map(n => {
    const cfg = { ...base, n }, m = runModule(mod, cfg), ref = snellTrace(cfg), X = crossings(ref), g = ref.g;
    const nonTir = ref.rays.filter(R => !R.tir && Math.abs(R.th) > 1e-12).length;
    const kind = imageKind(ref, X);
    const paraxial = n < 0 ? g.face1 + cfg.L / Math.abs(n) - cfg.src : null;
    return { n, metric: r6(m.metric), label: m.label, image: kind, paraxialImageMinus2LminusD: paraxial === null ? null : r6(paraxial - (g.face0 + 2 * cfg.L - cfg.src)),
      raysCrossingBehind: X.outer.length, rays: nonTir };
  });
  const labelSummary = {
    toleranceFractionOfWidth: 0.12, tolerancePxAtGrid192: r6(0.12 * 192),
    sliderValues: labelRows.filter(r => r.n < 0).length,
    labelledFocus: labelRows.filter(r => r.n < 0 && r.label === 'Veselago focus').length,
    labelledFocusWithoutRealImage: labelRows.filter(r => r.n < 0 && r.label === 'Veselago focus' && r.image === 'noRealImageBehindSlab').map(r => r.n),
    labelledFocusCrossingsPartlyOutsideWindow: labelRows.filter(r => r.n < 0 && r.label === 'Veselago focus' && r.image === 'crossingsPartlyOutsideWindow').map(r => r.n),
    labelledFocusImageInWindow: labelRows.filter(r => r.n < 0 && r.label === 'Veselago focus' && r.image === 'imageInWindow').map(r => r.n),
    labelledShifted: labelRows.filter(r => r.n < 0 && r.label === 'shifted').map(r => r.n),
    wholeSweep: labelSweep,
    positiveIndexPlusOne: labelRows.find(r => r.n === 1),
    rows: labelRows,
  };

  // 8. Failure controls.
  const controls = {};
  // n = +1: an ordinary medium matched to vacuum. No ray reaches the axis after the source, so the n = -1 image
  // predicate (every ray crossing at slab0 + 2L - d within tolerance) must reject it.
  {
    const cfg = { ...base, n: 1 }, m = runModule(mod, cfg), ref = snellTrace(cfg), c = compareRays(m, ref), X = crossings(ref), g = ref.g;
    const xf = g.face0 + 2 * cfg.L - cfg.src;
    let moduleBehind = 0;
    for (const mr of m.rays.values()) { const x = moduleAxisX(mr.vertices[1], mr.segs[2].k, m.yS); if (x > g.face1) moduleBehind++; }
    const focusAccepted = X.outer.length === c.rays && X.outer.every(x => Math.abs(x - xf) <= CRITERIA.geometryTolPx);
    controls.positiveIndexOne = { n: 1, traceMatchesReference: c.pass, raysCrossingBehindReference: X.outer.length, raysCrossingBehindModule: moduleBehind,
      peakErrorPx: r6(Math.abs(m.peakX - xf)), peakPredicateAccepted: Math.abs(m.peakX - xf) <= CRITERIA.focusPeakTolPx,
      focusPredicateAccepted: focusAccepted, rejected: !focusAccepted && Math.abs(m.peakX - xf) > CRITERIA.focusPeakTolPx, label: m.label, metric: r6(m.metric) };
  }
  // Wrong-sign refraction: the module refracts as a positive index |n| (s2 = sin θ / |n|).
  const mutants = {
    wrongSign: s => replaceOnce(s, 'const s2 = (1 / nS) * s1;', 'const s2 = -(1 / nS) * s1;'),
    invertedRatio: s => replaceOnce(s, 'const s2 = (1 / nS) * s1;', 'const s2 = nS * s1;'),
    exitKeepsSlabAngle: s => replaceOnce(s, 'const tdy = [s1, Math.sin(th2), s1];', 'const tdy = [s1, Math.sin(th2), Math.sin(th2)];'),
  };
  for (const [name, mutate] of Object.entries(mutants)) {
    const bad = loadModule(mutate), rows = [];
    for (const n of [-1, -0.8, -1.2, -1.5]) {
      const cfg = { ...base, n }, m = runModule(bad, cfg), ref = snellTrace(cfg), c = compareRays(m, ref);
      const g = ref.g, xf = g.face0 + 2 * cfg.L - cfg.src;
      let behind = 0;
      for (const mr of m.rays.values()) { const x = moduleAxisX(mr.vertices[1], mr.segs[2].k, m.yS); if (Math.abs(x - xf) <= CRITERIA.geometryTolPx) behind++; }
      rows.push({ n, maxVertexErrPx: r6(c.maxVertexErr), maxCrossErrPx: sci(c.maxCrossErr), geometryAccepted: c.pass,
        detected: !c.pass && Math.max(c.maxVertexErr, c.maxCrossErr) > CRITERIA.controlRejectPx, raysAtAnalyticImage: behind });
    }
    controls[name] = { rows, rejectedAtEveryN: rows.every(r => r.detected), rejectedAtMinusOne: rows.find(r => r.n === -1).detected };
  }
  // Metric discrimination: the n = -1.2 preset measured against the n = -1 image must fail the 2.5 px predicate.
  {
    const cfg = { ...base, n: -1.2 }, m = runModule(mod, cfg), g = snellTrace(cfg).g, xf = g.face0 + 2 * cfg.L - cfg.src;
    controls.metricAtMinus12 = { peakErrorPx: r6(Math.abs(m.peakX - xf)), rejected: Math.abs(m.peakX - xf) > CRITERIA.focusPeakTolPx, label: m.label, metric: r6(m.metric) };
  }
  const controlsPass = controls.positiveIndexOne.rejected && controls.positiveIndexOne.traceMatchesReference &&
    controls.wrongSign.rejectedAtEveryN && controls.exitKeepsSlabAngle.rejectedAtEveryN &&
    controls.invertedRatio.rows.filter(r => r.n !== -1).every(r => r.detected) && controls.metricAtMinus12.rejected;

  // 9. Presets and the print-state fixtures (the print harness re-uses this list).
  const presets = Object.entries(H.PRESETS).map(([name, p]) => {
    const cfg = { ...H.DEFAULTS, ...p.p }, m = runModule(mod, cfg), ref = snellTrace(cfg), c = compareRays(m, ref), ink = inkCheck(m.field, m.W, m.H, ref.rays);
    return { name, n: cfg.n, L: cfg.L, src: cfg.src, rays: cfg.rays, grid: cfg.grid, aspect: cfg.aspect, geometry: c.pass, maxVertexErr: sci(c.maxVertexErr),
      stray: ink.stray, minCoverage: r6(ink.minCoverage), metric: r6(m.metric), label: m.label, peakBehindFace: r6(m.peakX - ref.g.face1) };
  });
  const printFixtures = PRINT_FIXTURES.map(f => {
    const cfg = { ...H.DEFAULTS, ...f.p }, m = runModule(mod, cfg), ref = snellTrace(cfg), c = compareRays(m, ref), ink = inkCheck(m.field, m.W, m.H, ref.rays);
    return { name: f.name, cfg, cells: [m.W, m.H], geometry: c.pass, maxVertexErr: sci(c.maxVertexErr), dropped: c.dropped, stray: ink.stray,
      minCoverage: r6(ink.minCoverage), faceBeforeEnd: ref.g.face1 <= ref.g.xEnd };
  });

  const pass = sweep.pass && cont.pass && fixturesPass && identity.pass && metricAgg.pass && tirSummary.allMatch && controlsPass &&
    presets.every(p => p.geometry && p.stray === 0) && printFixtures.every(p => p.geometry && p.stray === 0 && p.faceBeforeEnd);

  const result = {
    pass,
    source: 'src/modules/veselago.js',
    sourceSha256: mod.sourceSha256,
    harnessSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    command: 'node tools/veselago-science.js --write',
    criteria: CRITERIA,
    schema: { ranges: schema, aspects: aspectOptions, gridsAfterSanitize },
    sweep: { axes: sweepAxes, ...sweep, maxVertexErr: sci(sweep.maxVertexErr), maxCrossErr: sci(sweep.maxCrossErr), maxLayoutErr: sci(sweep.maxLayoutErr), minCoverage: r6(sweep.minCoverage) },
    continuous: { seed: 19680509, ...cont, maxVertexErr: sci(cont.maxVertexErr), maxCrossErr: sci(cont.maxCrossErr) },
    outOfDomainBackFaceOffPlate: { ...offPlate, maxVertexErr: sci(offPlate.maxVertexErr) },
    fixtures,
    minusOneIdentity: { ...identity, maxInnerErr: sci(identity.maxInnerErr), maxOuterErr: sci(identity.maxOuterErr) },
    minusOneMetric: { ...metricAgg, maxPeakErrEvenH: r6(metricAgg.maxPeakErrEvenH), maxPeakErrOddH: r6(metricAgg.maxPeakErrOddH), maxAbsMetric: r6(metricAgg.maxAbsMetric), formulaErr: sci(metricAgg.formulaErr), failures: metricRows },
    totalReflection: tirSummary,
    grazingSlopeClamp: grazing,
    statusLabel: labelSummary,
    failureControls: controls,
    presets,
    printFixtures,
    limitations: [
      'Geometric rays only: no wave optics, no evanescent-wave amplification (Pendry), no absorption, dispersion or finite-aperture diffraction; the plate is not a metamaterial simulation.',
      'Transmitted rays only. No Fresnel reflection is drawn at either face. A ray with no transmitted ray (|sin θ| > |n|) is skipped entirely at veselago.js:79, including its incident segment from the source; the plate and status line do not say so.',
      'n = -1 refocusing at slab0 + d and slab0 + 2L - d is a geometric identity of the flat slab; it is recorded as a regression check, not a prediction.',
      'The status label compares |Δx|/W with 0.12 (veselago.js:152). It is not a focus classifier: it reports "Veselago focus" for slabs with no real image behind them and cannot tell n = -1 from nearby n.',
      'Configurations whose back face lies beyond the last drawn column (grid 128 or 144 with a thick slab and a distant source) draw a backward exit stub; they are outside this domain.',
      'Hash-only indices between -sin(0.45) and -0.4 reach the 0.05 slope clamp at veselago.js:88 for near-grazing rays; outside this domain.',
    ],
    environment: { node: process.version, platform: process.platform },
    seconds: Math.round((performance.now() - t0) / 100) / 10,
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/veselago-science.json'), JSON.stringify(result, null, 2) + '\n');
  const brief = { pass, sweep: result.sweep, continuous: result.continuous, outOfDomain: result.outOfDomainBackFaceOffPlate,
    identity: result.minusOneIdentity, metric: result.minusOneMetric, tir: { values: tirSummary.sliderValuesWithDrops, allMatch: tirSummary.allMatch },
    grazing, label: { ...labelSummary, rows: undefined }, controls,
    fixtures: fixtures.map(f => ({ n: f.n, pass: f.compare.pass, err: sci(f.compare.maxVertexErr), cross: sci(f.compare.maxCrossErr), cf: f.closedFormMaxErr,
      par: f.paraxialImageBehindFace, inner: f.innermostBehindFace, marg: f.marginalBehindFace, spread: f.outerSpreadPx, gap: f.paraxialGap, bound: f.thirdOrderBound,
      sign: f.aberrationSign, peak: f.peakBehindFace, caustic: f.peakInCaustic, label: f.label, metric: f.metric, dropped: f.dropped })),
    presets, printFixtures, seconds: result.seconds };
  console.log(JSON.stringify(brief, null, 1));
  if (!pass) process.exitCode = 1;
}

// Print fixtures: the six presets over the defaults, plus a 16:9 plate with the axis on a cell boundary
// (odd height), a 4:5 plate at n = -1.5 and a 5:4 plate at n = -0.4 where total reflection removes rays.
const PRINT_FIXTURES = [
  { name: 'perfect', preset: 'perfect' },
  { name: 'shallow', preset: 'shallow' },
  { name: 'deep', preset: 'deep' },
  { name: 'n12', preset: 'n12' },
  { name: 'many', preset: 'many' },
  { name: 'log', preset: 'log' },
  { name: 'wide', p: { aspect: '16:9', grid: 144, n: -1, L: 40, src: 20 } },
  { name: 'portrait', p: { aspect: '4:5', grid: 224, n: -1.5, L: 60, src: 18, rays: 36 } },
  { name: 'tir', p: { aspect: '5:4', grid: 160, n: -0.4, L: 30, src: 12, rays: 64 } },
];
{
  // Resolve preset fixtures from the module itself so the lists cannot drift.
  const probe = load('veselago', { names: 'PRESETS' });
  for (const f of PRINT_FIXTURES) if (f.preset) {
    const p = probe.hooks.PRESETS[f.preset];
    assert(p, 'veselago.js has no preset ' + f.preset);
    f.p = { ...p.p };
  }
}

module.exports = { CRITERIA, ASPECTS, layout, launchAngle, refract, snellTrace, closedFormOuter, inkCheck, crossings, loadModule, runModule, compareRays, PRINT_FIXTURES };
if (require.main === module) main();
