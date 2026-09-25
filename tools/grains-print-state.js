'use strict';
// Actual grains exportPNG/exportSVG print path for the seven presets: the browser settle tied word for word to
// the Node production settle in tools/grains-science.js, the state preserved across every export, an export
// pressed mid-settle landing on the settled packing, exact print dimensions, and every SVG circle and contact
// line against an independent brute-force contact rebuild. Print evidence, not a numerical claim.
// Setup: npm install --no-save --package-lock=false playwright@1.56.1
// node tools/grains-print-state.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const G = require('./grains-science.js');

const root = path.resolve(__dirname, '..');
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
function printSize(aspect) {
  const a = ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

// Read-only hooks before the aspect line of the returned API and on the simulation object, plus one deliberate
// post-export mutation for the failure control.
const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
let source = G.replaceOnce(G.original, '    sim.stepOnce = step;', '    sim.stepOnce = step;\n    sim.audit = { wxi, springs: () => ({ np, pi_, pj_, pxi }) };');
source = G.replaceOnce(source, marker, `        auditBuilding() { return building; },
        auditSnapshot() {
          const sp = sim.audit.springs();
          return {
            x: sim.x.slice(), y: sim.y.slice(), vx: sim.vx.slice(), vy: sim.vy.slice(), om: sim.om.slice(), r: sim.r.slice(), m: sim.m.slice(),
            wxi: sim.audit.wxi.slice(), pxi: sp.pxi.slice(0, sp.np), pi: sp.pi_.slice(0, sp.np), pj: sp.pj_.slice(0, sp.np),
            N: sim.N, periodic: sim.periodic, ke: sim.ke, step: sim.step, lidOn: sim.lidOn, lidY: sim.lidY, lidVy: sim.lidVy, top: sim.top(),
            phase, budget, building, D: Object.assign({}, D),
            net: net && { nc: net.nc, mean: net.mean, fHi: net.fHi, top10: net.top10, Z: net.Z, back: net.back, load95: net.load95,
              ci: Float64Array.from(net.ci), cj: Float64Array.from(net.cj), cf: Float64Array.from(net.cf), cdx: Float64Array.from(net.cdx), cdy: Float64Array.from(net.cdy), load: Float64Array.from(net.load) },
            settings: JSON.stringify(host.getState()),
          };
        },
        auditMutate() { sim.x[0] += 1e-3; net.cf[0] *= 2; },
        auditInitial() { const s0 = host.getState(), sim0 = makeSim(s0, derive(s0)); return { x: sim0.x.slice(), y: sim0.y.slice(), vx: sim0.vx.slice(), vy: sim0.vy.slice(), r: sim0.r.slice() }; },
${marker}`);
// Node replay hook: start makeSim from the initial velocities the browser drew, and nothing else changed.
const anchor = '    /* ---- neighbor finding: a uniform grid hash feeding a Verlet list ----';
const withInitialVelocities = s => G.replaceOnce(s, anchor, '    if (hooks.initialV) { vx.set(hooks.initialV.vx); vy.set(hooks.initialV.vy); }\n' + anchor);

// The plate geometry exportSVG promises, rebuilt from positions: frame, circle per grain, and a line per contact
// carrying at least thresh times the mean force, with the periodic-seam duplicate.
const rr = v => Math.round(v * 100) / 100, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function expectedGeometry(st, s, W, H) {
  let t = 0; for (let i = 0; i < st.N; i++) { const v = st.y[i] + st.r[i]; if (v > t) t = v; }
  const top = Math.max(t, 1e-6), mg = s.margin, sc = Math.min(W * (1 - 2 * mg) / 1, H * (1 - 2 * mg) / top);
  const ox = (W - 1 * sc) / 2, oy = (H - top * sc) / 2, rpx = st.D.r0 * sc;
  const X = i => ox + st.x[i] * sc, Y = i => oy + (top - st.y[i]) * sc;
  const circles = [], lines = [];
  if (s.view === 'grains' || s.view === 'both') for (let i = 0; i < st.N; i++) circles.push([rr(X(i)), rr(Y(i)), rr(st.r[i] * sc)]);
  if (s.view === 'chains' || s.view === 'both') {
    const cs = G.contactsOf(st, st.D.kn), mean = cs.length ? cs.reduce((a, c) => a + c.f, 0) / cs.length : 1, cut = s.thresh * mean;
    for (const c of cs) {
      if (c.f < cut) continue;
      const wd = rr(clamp(s.weight * 0.22 * rpx * Math.pow(c.f / mean, s.wexp), 0.35, 1.4 * rpx));
      const x1 = X(c.i), y1 = Y(c.i), dx = c.dx * sc, dy = -c.dy * sc;
      lines.push([rr(x1), rr(y1), rr(x1 + dx), rr(y1 + dy), wd]);
      const x2 = X(c.j);
      if (Math.abs(x1 + dx - x2) > 0.5 * sc) lines.push([rr(x2), rr(Y(c.j)), rr(x2 - dx), rr(Y(c.j) - dy), wd]);
    }
  }
  return { circles, lines, sc, top };
}
function parseSvg(text) {
  const tag = /<svg\b[^>]*>/.exec(text);
  assert(tag, 'SVG has no root element');
  const attr = (s, name) => { const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(s); return m ? m[1] : null; };
  return {
    width: Number(attr(tag[0], 'width')), height: Number(attr(tag[0], 'height')), viewBox: attr(tag[0], 'viewBox'),
    circles: [...text.matchAll(/<circle\b([^>]*?)\/>/g)].map(m => ['cx', 'cy', 'r'].map(k => Number(attr(m[1], k)))),
    lines: [...text.matchAll(/<line\b([^>]*?)\/>/g)].map(m => ['x1', 'y1', 'x2', 'y2', 'stroke-width'].map(k => Number(attr(m[1], k)))),
  };
}
// Circles compared in grain order; lines compared as multisets keyed by their four endpoints, since the module
// draws them in pair-list order and the rebuild in index order.
function compareGeometry(parsed, exp) {
  let coordMismatch = 0, maxAbsError = 0, widthMismatch = 0, maxWidthError = 0;
  const shapeMismatch = parsed.circles.length !== exp.circles.length || parsed.lines.length !== exp.lines.length;
  for (let i = 0; i < Math.min(parsed.circles.length, exp.circles.length); i++) for (let k = 0; k < 3; k++) {
    const e = Math.abs(parsed.circles[i][k] - exp.circles[i][k]);
    if (!(e === 0)) coordMismatch++;
    maxAbsError = Number.isFinite(e) ? Math.max(maxAbsError, e) : Infinity;
  }
  const key = l => l.slice(0, 4).join(','), bag = new Map();
  for (const l of exp.lines) { const k = key(l); if (!bag.has(k)) bag.set(k, []); bag.get(k).push(l[4]); }
  let unmatched = 0;
  for (const l of parsed.lines) {
    const k = key(l), list = bag.get(k);
    if (!list || !list.length) { unmatched++; continue; }
    const w = list.shift(), e = Math.abs(l[4] - w);
    if (!(e === 0)) widthMismatch++;
    maxWidthError = Number.isFinite(e) ? Math.max(maxWidthError, e) : Infinity;
  }
  coordMismatch += unmatched;
  return { circles: parsed.circles.length, lines: parsed.lines.length, expectedCircles: exp.circles.length, expectedLines: exp.lines.length,
    shapeMismatch, coordMismatch, unmatchedLines: unmatched, maxAbsError, widthMismatch, maxWidthError };
}
const acceptSvg = (r, dims) => r.width === dims.width && r.height === dims.height && r.viewBox === '0 0 ' + dims.width + ' ' + dims.height &&
  r.parseOk && !r.geometry.shapeMismatch && r.geometry.coordMismatch === 0 && r.geometry.maxAbsError === 0 && r.geometry.maxWidthError <= 0.01 && r.statePreserved;

const f64 = b64 => { const u = Buffer.from(b64, 'base64'); return new Float64Array(u.buffer, u.byteOffset, u.byteLength / 8); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const chromiumVersion = browser.version();
  const L = G.load(), LV = G.load(withInitialVelocities), rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#grains/grains-print-state');
      await page.evaluate(source);
      for (const name of G.PRESETS) {
        const state = G.presetState(L.module, name);
        const dims = printSize(state.aspect);
        const b = await page.evaluate(async ({ name, seed, dims }) => {
          const mod = Studio.modules.grains, pre = mod.presets[name];
          const state = { ...mod.defaults, ...pre.p, palette: pre.palette.colors.slice(), bg: pre.palette.bg, seed };
          mod.sanitize(state);
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = Math.round(480 * dims.height / dims.width);
          const instance = mod.create({ canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); } });
          if (typeof instance.auditSnapshot !== 'function') throw Error('audit hooks missing: the page did not keep the hooked module');
          async function grow() {
            instance.regenerate();
            const t0 = performance.now();
            while (instance.auditBuilding()) {
              if (performance.now() - t0 > 300000) throw Error('grains settle did not finish');
              await new Promise(r => setTimeout(r, 10));
            }
            return instance.auditSnapshot();
          }
          const ARR = ['x', 'y', 'vx', 'vy', 'om', 'r', 'm', 'wxi', 'pxi', 'pi', 'pj'], NET = ['ci', 'cj', 'cf', 'cdx', 'cdy', 'load'];
          const SCAL = ['N', 'periodic', 'ke', 'step', 'lidOn', 'lidY', 'lidVy', 'top', 'phase', 'budget', 'building'];
          const NETSCAL = ['nc', 'mean', 'fHi', 'top10', 'Z', 'back', 'load95'];
          const words = (a, c) => { if (!a || !c || a.length !== c.length) return Infinity; let d = 0; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], c[i])) d++; return d; };
          function compare(a, c) {
            const out = { changedWords: 0, netWords: 0, scalarsChanged: SCAL.filter(k => !Object.is(a[k], c[k])),
              netScalarsChanged: NETSCAL.filter(k => !Object.is(a.net[k], c.net[k])), settingsChanged: a.settings !== c.settings };
            for (const k of ARR) out.changedWords += words(a[k], c[k]);
            for (const k of NET) out.netWords += words(a.net[k], c.net[k]);
            return out;
          }
          const preserved = d => d.changedWords === 0 && d.netWords === 0 && !d.scalarsChanged.length && !d.netScalarsChanged.length && !d.settingsChanged;
          const lumOf = hex => { const v = parseInt(hex.slice(1), 16); return 0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255); };
          function luminance(bitmap) {
            const c = document.createElement('canvas');
            c.width = bitmap.width; c.height = bitmap.height;
            const g = c.getContext('2d', { willReadFrequently: true });
            g.drawImage(bitmap, 0, 0);
            const px = g.getImageData(0, 0, c.width, c.height).data, Lbg = lumOf(state.bg);
            let lo = 255, hi = 0, finite = 0, ink = 0;
            for (let i = 0; i < px.length; i += 4) {
              const L = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
              if (Number.isFinite(L)) { finite++; if (L < lo) lo = L; if (L > hi) hi = L; if (Math.abs(L - Lbg) > 16) ink++; }
            }
            return { spread: hi - lo, min: lo, max: hi, finite, samples: px.length / 4, inkFraction: ink / (px.length / 4) };
          }
          const dimensionsMatch = r => r.width === dims.width && r.height === dims.height;
          const acceptPng = r => dimensionsMatch(r) && r.type === 'image/png' && r.bytes > 1000 && r.nonblank && preserved(r.state);
          async function png(w, h, afterExport, before = instance.auditSnapshot()) {
            const blob = await instance.exportPNG(w, h);
            if (afterExport) afterExport();
            const diff = compare(before, instance.auditSnapshot());
            const bitmap = await createImageBitmap(blob);
            const lum = luminance(bitmap);
            const r = { requested: [w, h], width: bitmap.width, height: bitmap.height, bytes: blob.size, type: blob.type, luminance: lum,
              nonblank: lum.spread > 12 && lum.inkFraction > 0.001 && lum.finite === lum.samples, state: diff };
            bitmap.close();
            r.dimensionsMatch = dimensionsMatch(r); r.statePreserved = preserved(diff); r.accepted = acceptPng(r);
            return r;
          }
          function b64(ta) {
            const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
            let s = '';
            for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
            return btoa(s);
          }

          // The settle left to its own chunks, then a second regenerate exported at once, mid-settle: the export
          // path must finish the settle and land on the same packing.
          const first = await grow();
          instance.regenerate();
          const midBuilding = instance.auditBuilding();
          const midPng = await png(dims.width, dims.height, null, first);
          const second = instance.auditSnapshot();
          const replay = compare(first, second);

          const pngRow = await png(dims.width, dims.height);
          const narrow = await png(dims.width - 1, dims.height);
          const beforeSvg = instance.auditSnapshot();
          let svgText = null, svgError = null, parseOk = null;
          try {
            const out = instance.exportSVG(dims.width, dims.height);
            svgText = typeof out === 'string' ? out : await out.text();
            const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
            parseOk = !doc.querySelector('parsererror') && doc.documentElement.nodeName === 'svg';
          } catch (e) { svgError = String(e && e.message); }
          const svgState = compare(beforeSvg, instance.auditSnapshot());
          const allExports = compare(first, instance.auditSnapshot());
          const mutated = await png(dims.width, dims.height, () => instance.auditMutate());
          const pal = Object.keys(Studio.PALETTES).find(k => Studio.PALETTES[k] === pre.palette) || null;
          const snap = {}, initial = {}, init = instance.auditInitial();
          for (const k of ['x', 'y', 'vx', 'vy', 'om', 'r', 'm', 'wxi', 'pxi']) snap[k] = b64(Float64Array.from(first[k]));
          for (const k of ['ci', 'cj', 'cf', 'load']) snap['net_' + k] = b64(Float64Array.from(first.net[k]));
          for (const k of ['x', 'y', 'vx', 'vy', 'r']) initial[k] = b64(Float64Array.from(init[k]));
          return {
            state: { n: state.n, poly: state.poly, geom: state.geom, press: state.press, hard: state.hard, damp: state.damp, mu: state.mu, grav: state.grav,
              view: state.view, wexp: state.wexp, weight: state.weight, thresh: state.thresh, shift: state.shift, margin: state.margin, grain: state.grain,
              aspect: state.aspect, palette: pal, bg: state.bg, seed: state.seed, dt: state.dt },
            snap, initial, scalars: { N: first.N, periodic: first.periodic, ke: first.ke, step: first.step, lidOn: first.lidOn, lidY: first.lidY, lidVy: first.lidVy, D: first.D,
              budget: first.budget, top: first.top, net: Object.fromEntries(NETSCAL.map(k => [k, first.net[k]])) },
            settings: first.settings, midBuilding, midPng, replay: { ...replay, identical: preserved(replay) },
            png: pngRow, narrow, mutated, allExportsPreserved: preserved(allExports), allExports,
            svg: { text: svgText, error: svgError, parseOk, state: svgState, statePreserved: preserved(svgState) },
          };
        }, { name, seed: state.seed, dims });

        // Node against the browser. The engine's rng.gauss draws the initial kicks through Math.cos, which differs by
        // one ulp between this Node and this Chromium for some arguments, and the settle is chaotic, so the same seed
        // settles to a different packing in each. Record that, then replay the production settle in Node from the
        // initial velocities the browser drew: that must reproduce the browser packing word for word.
        const snap = Object.fromEntries(Object.entries(b.snap).map(([k, v]) => [k, f64(v)]));
        const initial = Object.fromEntries(Object.entries(b.initial).map(([k, v]) => [k, f64(v)]));
        const count = (a, c) => { if (a.length !== c.length) return Infinity; let d = 0; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], c[i])) d++; return d; };
        const sN = { ...L.module.defaults, ...state }; L.module.sanitize(sN);
        const nodeInit = L.hooks.makeSim(sN, L.hooks.derive(sN));
        let maxRel = 0; for (const k of ['vx', 'vy']) for (let i = 0; i < initial[k].length; i++) if (!Object.is(initial[k][i], nodeInit[k][i])) maxRel = Math.max(maxRel, Math.abs(initial[k][i] - nodeInit[k][i]) / Math.abs(nodeInit[k][i]));
        const initialState = { positionsAndRadiiDiffering: count(initial.x, nodeInit.x) + count(initial.y, nodeInit.y) + count(initial.r, nodeInit.r),
          velocityWordsDiffering: count(initial.vx, nodeInit.vx) + count(initial.vy, nodeInit.vy), velocityWords: 2 * initial.vx.length, maxRelativeVelocityDifference: maxRel };
        const compareTo = node => {
          const out = Object.fromEntries(['x', 'y', 'vx', 'vy', 'om', 'r', 'wxi'].map(k => [k, count(snap[k], node[k])]));
          out.pxi = count(snap.pxi, Float64Array.from(node.pairs.pxi)); out.step = b.scalars.step === node.step; out.ke = b.scalars.ke === node.ke;
          out.identical = Object.values(out).every(v => v === 0 || v === true);
          return out;
        };
        const plain = G.settle(L, state).snap, plainCompare = compareTo(plain);
        LV.hooks.initialV = { vx: initial.vx, vy: initial.vy };
        const nodeMatch = compareTo(G.settle(LV, state).snap);
        const engineDifference = { initialState, nodeSteps: plain.step, browserSteps: b.scalars.step, nodeKe: plain.ke, browserKe: b.scalars.ke,
          positionWordsDiffering: plainCompare.x + plainCompare.y, sameSeedSamePacking: plainCompare.identical };

        const st = { ...snap, N: b.scalars.N, periodic: b.scalars.periodic, lidOn: b.scalars.lidOn, lidY: b.scalars.lidY, lidVy: b.scalars.lidVy, D: b.scalars.D,
          ke: b.scalars.ke, step: b.scalars.step, budget: b.scalars.budget, top: b.scalars.top,
          net: { ...b.scalars.net, ci: Array.from(snap.net_ci), cj: Array.from(snap.net_cj), cf: Array.from(snap.net_cf), load: Array.from(snap.net_load) } };
        // The pre-registered static checks of tools/grains-science.js, applied to the packing this print shows.
        const statics = G.staticsOfState(st, b.state.damp);
        const exp = expectedGeometry(st, b.state, dims.width, dims.height);
        const parsed = b.svg.text ? parseSvg(b.svg.text) : { width: null, height: null, viewBox: null, circles: [], lines: [] };
        const svg = { width: parsed.width, height: parsed.height, viewBox: parsed.viewBox, bytes: b.svg.text ? Buffer.byteLength(b.svg.text) : 0, parseOk: b.svg.parseOk,
          error: b.svg.error, geometry: compareGeometry(parsed, exp), state: b.svg.state, statePreserved: b.svg.statePreserved, sha256: b.svg.text ? sha(b.svg.text) : null };
        svg.accepted = acceptSvg(svg, dims);
        // Failure control: the expected plate rebuilt with one drawn grain moved by 0.1 r0.
        const cs = G.contactsOf(st, st.D.kn), meanF = cs.reduce((a, c) => a + c.f, 0) / cs.length;
        const drawn = cs.find(c => c.f >= b.state.thresh * meanF), k = drawn ? drawn.i : 0;
        const moved = { ...st, x: Float64Array.from(st.x) }; moved.x[k] += 0.1 * st.D.r0;
        const shifted = { ...svg, geometry: compareGeometry(parsed, expectedGeometry(moved, b.state, dims.width, dims.height)) };
        const row = {
          // Presets with a top load are printed and checked, but lie outside the validated domain: their lid carries no
          // load at the end of the settle (tools/grains-science.js, lid).
          fixture: name, inValidatedDomain: b.state.press === 0, ...b.state, requested: [dims.width, dims.height],
          grains: b.scalars.N, steps: b.scalars.step, ke: b.scalars.ke, contacts: b.scalars.net.nc, Z: b.scalars.net.Z, top10: b.scalars.net.top10,
          stateSha256: G.stateHash({ x: snap.x, y: snap.y, vx: snap.vx, vy: snap.vy, om: snap.om, r: snap.r }), settingsSha256: sha(b.settings),
          nodeMatch, engineDifference,
          statics: { verticalResidual: statics.verticalResidual, horizontalResidual: statics.horizontalResidual, dashpotShare: statics.dashpotShare, atRest: statics.atRest,
            reachedKeTol: statics.reachedKeTol, sideWallFrictionShare: statics.sideWallFrictionShare, Z: statics.Z, top10: statics.top10, readout: statics.readout, staticPass: statics.staticPass, pass: statics.pass },
          replay: b.replay, midSettleExport: { buildingWhenExported: b.midBuilding, width: b.midPng.width, height: b.midPng.height, landsOnSettledPacking: b.midPng.statePreserved },
          png: b.png, allExportsPreserved: b.allExportsPreserved, allExports: b.allExports, svg,
          failureControls: {
            narrowPng: { requested: b.narrow.requested, width: b.narrow.width, height: b.narrow.height, dimensionsMatch: b.narrow.dimensionsMatch, nonblank: b.narrow.nonblank, statePreserved: b.narrow.statePreserved, rejected: !b.narrow.accepted },
            mutationAfterExport: { changedWords: b.mutated.state.changedWords, netWords: b.mutated.state.netWords, dimensionsMatch: b.mutated.dimensionsMatch, nonblank: b.mutated.nonblank, statePreserved: b.mutated.statePreserved, rejected: !b.mutated.accepted },
            svgShiftedGrain: { grain: k, coordMismatch: shifted.geometry.coordMismatch, maxAbsError: shifted.geometry.maxAbsError, rejected: !acceptSvg(shifted, dims) },
          },
        };
        console.error(name, JSON.stringify({ steps: row.steps, node: nodeMatch.identical, plainNode: [plain.step, plainCompare.identical], init: initialState, statics: [statics.verticalResidual, statics.dashpotShare, statics.pass],
          replay: b.replay.identical, png: [b.png.width, b.png.height, b.png.accepted],
          svg: [svg.geometry.circles, svg.geometry.lines, svg.geometry.coordMismatch, svg.geometry.widthMismatch, svg.accepted] }));
        rows.push(row);
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    const tag = row.fixture;
    assert(row.nodeMatch.identical, tag + ': Node replay from the browser initial velocities differs from the browser settle ' + JSON.stringify(row.nodeMatch));
    assert.equal(row.engineDifference.initialState.positionsAndRadiiDiffering, 0, tag + ': initial positions or radii differ between Node and Chromium');
    assert(row.statics.pass, tag + ': browser packing fails the static checks ' + JSON.stringify(row.statics));
    assert(row.replay.identical, tag + ': regenerate is not deterministic ' + JSON.stringify(row.replay));
    assert(row.midSettleExport.buildingWhenExported && row.midSettleExport.landsOnSettledPacking, tag + ': mid-settle export ' + JSON.stringify(row.midSettleExport));
    assert(row.png.accepted, tag + ': PNG rejected ' + JSON.stringify(row.png));
    assert.deepEqual([row.png.width, row.png.height], row.requested);
    assert(row.allExportsPreserved, tag + ': exports changed the state ' + JSON.stringify(row.allExports));
    assert(row.svg.accepted, tag + ': SVG rejected ' + JSON.stringify(row.svg));
    const expectCircles = row.view === 'chains' ? 0 : row.grains;
    assert.equal(row.svg.geometry.circles, expectCircles);
    if (row.view !== 'grains') assert(row.svg.geometry.lines > 0, tag + ': no contact lines');
    const nw = row.failureControls.narrowPng;
    assert(nw.rejected && !nw.dimensionsMatch && nw.width === row.requested[0] - 1 && nw.statePreserved && nw.nonblank, tag + ': narrow PNG ' + JSON.stringify(nw));
    const m = row.failureControls.mutationAfterExport;
    assert(m.rejected && !m.statePreserved && m.changedWords === 1 && m.netWords === 1 && m.dimensionsMatch && m.nonblank, tag + ': mutation ' + JSON.stringify(m));
    assert(row.failureControls.svgShiftedGrain.rejected && row.failureControls.svgShiftedGrain.coordMismatch > 0, tag + ': shifted grain ' + JSON.stringify(row.failureControls.svgShiftedGrain));
  }

  const result = {
    pass: true,
    source: 'src/modules/grains.js', sourceSha256: sha(G.original), engineSha256: sha(G.shared),
    harnessSha256: sha(fs.readFileSync(__filename)), scienceHarness: 'tools/grains-science.js', scienceHarnessSha256: sha(fs.readFileSync(path.join(__dirname, 'grains-science.js'))),
    command: 'node tools/grains-print-state.js --write',
    setup: 'npm install --no-save --package-lock=false playwright@1.56.1',
    scope: 'Actual grains.js in dist/studio.html (Chromium, SwiftShader) for the seven presets pour, photo, strong, arch, slip, disks and column at seed cundall-1979 with each preset\'s own paint settings and palette. ' +
      'The browser settle (positions, velocities, spins, radii, wall and pair springs, step count, kinetic energy) is compared word for word with the Node production settle of tools/grains-science.js started from the initial velocities the browser drew, the Node settle from its own draws is recorded, and the pre-registered static checks of tools/grains-science.js are applied to the browser packing; regenerate is repeated with an export pressed while it is still settling. ' +
      'exportPNG at 2400 px on the longest edge (2400x2400, 1920x2400, 2400x1920, 2400x1600) and exportSVG at the same size, with the full state and drawn network compared before and after; every SVG circle and contact line compared with a brute-force contact rebuild from the settled positions.',
    criteria: 'Initial positions and radii identical in Node and Chromium; the Node production settle from the browser\'s initial velocities identical to the browser settle in every word; the browser packing passes the static checks of tools/grains-science.js (vertical and horizontal wall balance within 1% of the floor load, dashpot share of the normal forces below 1%, kinetic energy below the module\'s at-rest threshold, network readout equal to a brute-force rebuild); regenerate with a mid-settle export identical to the chunked settle; exact requested PNG dimensions, image/png over 1000 bytes, luminance spread over 12/255 with more than 0.1% of pixels off the background; ' +
      'zero changed state, spring or drawn-network words, scalars or settings across every export; SVG exactly the requested size and viewBox, one circle per grain in the grains and both views, and the multiset of contact lines equal to the rebuild (every contact with force at least thresh times the mean, plus periodic-seam duplicates) with every centre, radius and endpoint equal to round2 of the frame transform with zero error and stroke widths within 0.01. ' +
      'Failure controls: a PNG 1 px narrower, a post-export change to one position and one drawn force, and the expected plate rebuilt with one drawn grain moved by 0.1 r0 must each be rejected by the same predicate.',
    validatedDomainFixtures: rows.filter(r => r.inValidatedDomain).map(r => r.fixture),
    outsideValidatedDomain: rows.filter(r => !r.inValidatedDomain).map(r => r.fixture),
    rows,
    limitations: [
      'Print-path state, dimensions and SVG geometry for seven presets at one seed, one browser build and a software renderer; not every control, aspect, seed, palette or hardware.',
      'The presets with a top load (' + rows.filter(r => !r.inValidatedDomain).map(r => r.fixture).join(', ') + ') pass every print check here but lie outside the validated domain: their lid carries no load at the end of the settle (tools/grains-science.js, lid).',
      'The same seed settles to a different packing in Node ' + process.version + ' and Chromium ' + chromiumVersion + ': the engine rng.gauss draws the initial kicks through Math.cos, which differs by one ulp for some arguments between the two, and the settle amplifies it. Each engine reprints its own packing exactly; the packing is not portable across JavaScript engines.',
      'Colours are not checked: the contrast-ordered ramp and the force-to-colour bins are not compared with an independent ramp, and PNG pixels are not compared shape by shape with the SVG.',
      'No claim beyond the numerical evidence in tools/grains-science.js about the forces drawn; the SVG check certifies that the drawn lines are the settled contacts at the documented widths.',
    ],
    environment: { node: process.version, chromium: chromiumVersion, platform: process.platform, playwright: require('playwright/package.json').version },
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/grains-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ pass: true, rows: rows.map(r => ({ fixture: r.fixture, view: r.view, aspect: r.aspect, png: [r.png.width, r.png.height], node: r.nodeMatch.identical,
    engine: { init: r.engineDifference.initialState, steps: [r.engineDifference.nodeSteps, r.engineDifference.browserSteps] },
    statics: [r.statics.verticalResidual, r.statics.horizontalResidual, r.statics.dashpotShare, r.statics.pass],
    svg: { circles: r.svg.geometry.circles, lines: r.svg.geometry.lines, coordMismatch: r.svg.geometry.coordMismatch, widthMismatch: r.svg.geometry.widthMismatch, maxWidthError: r.svg.geometry.maxWidthError },
    controls: Object.fromEntries(Object.entries(r.failureControls).map(([k, v]) => [k, v.rejected])) })), environment: result.environment }, null, 1));
})().catch(error => { console.error(error); process.exitCode = 1; });
