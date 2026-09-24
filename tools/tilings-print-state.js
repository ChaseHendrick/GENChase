'use strict';
// Actual tilings exportPNG / exportSVG print path in dist/studio.html (Chromium): the browser model tied
// bit for bit to the Node model that tools/tilings-science.js validates, the scientific state preserved
// across export, exact print dimensions, nonblank and deterministic rasters, and every SVG polygon vertex,
// line-work edge, inflation-level segment and arc endpoint compared against geometry computed in Node
// from that Node model. Print evidence, not a numerical claim.
// Setup: npm install --no-save --package-lock=false playwright@1.56.1
// node tools/tilings-print-state.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const G = require('./tilings-geometry.js');

const root = G.root;
const original = fs.readFileSync(path.join(root, 'src/modules/tilings.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8');
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const SEED = 'penrose-1974';
const TOL = 0.005 + 1e-9; // SVG coordinates are printed with two decimals
const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
function printSize(aspect) {
  const a = ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

// Read-only hooks before the aspect line of the returned API, plus a deliberate mutation for the control.
const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
assert.equal(original.split(marker).length, 2, 'Expected one tilings export API marker');
const source = original.replace(marker, `        auditSnapshot() {
          if (!model) throw Error('no model');
          const t = model.tiles;
          const b64 = ta => { const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
          return {
            n: t.n, used: t._used, xy: b64(t.xy.subarray(0, t._used)), off: b64(t.off.subarray(0, t.n)), nv: b64(t.nv.subarray(0, t.n)),
            type: b64(t.type.subarray(0, t.n)), cls: b64(t.cls.subarray(0, t.n)), anc: b64(t.anc.subarray(0, t.n)), flip: b64(t.flip.subarray(0, t.n)),
            levelSegs: model.levelSegs.map(b64), edges: model.edges ? b64(model.edges) : null,
            hx: model.hx, hy: model.hy, depth: model.depth, levels: model.levels, mode: model.mode, rect: JSON.stringify(model.rect),
            settings: JSON.stringify(host.getState()),
          };
        },
        auditMutate() { model.tiles.xy[0] += 0.5; model.tiles.type[0] ^= 1; },
${marker}`);

/* ---------------- expected SVG geometry, computed in Node ---------------- */
// Mitred offset by intersecting the two offset edge lines, with the module's clamp (at most 0.42
// area/perimeter) and its fallback to the raw polygon when a corner is too sharp. `side` +1 moves every
// edge toward the tile interior (a true inset, what "Gap inset (grout)" names); -1 moves it outward.
function insetExpected(px, py, d, side) {
  const n = px.length;
  let per = 0, area = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; per += Math.hypot(px[j] - px[i], py[j] - py[i]); area += px[i] * py[j] - px[j] * py[i]; }
  const dd = Math.min(d, 0.42 * Math.abs(area) / per), sgn = (area > 0 ? 1 : -1) * side, out = [];
  for (let i = 0; i < n; i++) {
    const h = (i + n - 1) % n, j = (i + 1) % n;
    const u = [px[i] - px[h], py[i] - py[h]], w = [px[j] - px[i], py[j] - py[i]], lu = Math.hypot(...u), lw = Math.hypot(...w);
    const nu = [-sgn * u[1] / lu, sgn * u[0] / lu], nw = [-sgn * w[1] / lw, sgn * w[0] / lw];
    if (1 + nu[0] * nw[0] + nu[1] * nw[1] < 0.12) return null;
    // line 1: through P_h + dd nu with direction u; line 2: through P_i + dd nw with direction w
    const a = [px[h] + dd * nu[0], py[h] + dd * nu[1]], b = [px[i] + dd * nw[0], py[i] + dd * nw[1]];
    const den = u[0] * w[1] - u[1] * w[0], t = ((b[0] - a[0]) * w[1] - (b[1] - a[1]) * w[0]) / den;
    out.push([a[0] + t * u[0], a[1] + t * u[1]]);
  }
  return out;
}
function expectedSvg(model, s, hooks, W, H, side) {
  const sc = Math.max(W / (2 * model.hx), H / (2 * model.hy)), ox = W / 2, oy = H / 2;
  const scr = (x, y) => [ox + x * sc, oy - y * sc];
  const polys = G.polygonsOf(model.tiles), doInset = s.inset > 0.0005;
  const drawn = polys.map(P => {
    const pts = P.pts.map(q => scr(q[0], q[1]));
    if (!doInset) return pts;
    return insetExpected(pts.map(p => p[0]), pts.map(p => p[1]), s.inset * sc, side) || pts;
  });
  const out = { W, H, fills: s.fill !== 'none' ? drawn : [], outlines: [], linework: null, levels: [], arcs: [[], []] };
  if (s.strokeWidth > 0.001) {
    if (s.linework && !doInset) {
      const snap = new G.Snap(1e-7), seen = new Set(), segs = [], r = model.rect;
      for (const P of polys) for (let k = 0; k < P.pts.length; k++) {
        const a = P.pts[k], b = P.pts[(k + 1) % P.pts.length];
        if (Math.min(a[0], b[0]) > r.x1 || Math.max(a[0], b[0]) < r.x0 || Math.min(a[1], b[1]) > r.y1 || Math.max(a[1], b[1]) < r.y0) continue;
        const ia = snap.id(a[0], a[1]), ib = snap.id(b[0], b[1]), key = Math.min(ia, ib) + ',' + Math.max(ia, ib);
        if (seen.has(key)) continue;
        seen.add(key); segs.push([scr(a[0], a[1]), scr(b[0], b[1])]);
      }
      out.linework = segs;
    } else out.outlines = drawn;
  }
  if (s.levels > 0 && model.levelSegs.length) {
    const nl = Math.min(s.levels, model.levelSegs.length);
    for (let k = nl - 1; k >= 0; k--) {
      const e = model.levelSegs[k], segs = [];
      for (let i = 0; i < e.length; i += 4) segs.push([scr(e[i], e[i + 1]), scr(e[i + 2], e[i + 3])]);
      out.levels.push(segs);
    }
  }
  const spec = hooks.ARCS[model.mode];
  if (s.arcs && spec) {
    for (const P of polys) {
      const sp = spec[P.type], fl = P.flip, p = P.pts.map(q => scr(q[0], q[1]));
      for (let a = 0; a < 2; a++) {
        const idx = sp.c[a], r = sp.r[fl ? 1 - a : a] * sc, fam = sp.f[fl ? 1 - a : a];
        const toward = q => { const dx = q[0] - p[idx][0], dy = q[1] - p[idx][1], L = Math.hypot(dx, dy); return [p[idx][0] + r * dx / L, p[idx][1] + r * dy / L]; };
        out.arcs[fam].push({ from: toward(p[(idx + 1) % 4]), to: toward(p[(idx + 3) % 4]), r });
      }
    }
  }
  return out;
}

/* ---------------- SVG parsing and comparison ---------------- */
function parseSvg(text) {
  const tag = /<svg\b[^>]*>/.exec(text);
  assert(tag, 'SVG has no root element');
  const attr = (s, name) => { const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(s); return m ? m[1] : null; };
  const polygons = [...text.matchAll(/<polygon\b([^>]*?)\/>/g)].map(m => ({
    fill: attr(m[1], 'fill'), stroke: attr(m[1], 'stroke'),
    points: (attr(m[1], 'points') || '').trim().split(/\s+/).filter(Boolean).map(p => p.split(',').map(Number)),
  }));
  const paths = [...text.matchAll(/<path\b([^>]*?)\/>/g)].map(m => ({ d: attr(m[1], 'd') || '', cap: attr(m[1], 'stroke-linecap'), width: Number(attr(m[1], 'stroke-width')) }));
  return { width: Number(attr(tag[0], 'width')), height: Number(attr(tag[0], 'height')), viewBox: attr(tag[0], 'viewBox'), polygons, paths };
}
const segmentsOf = d => [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)/g)].map(m => [[+m[1], +m[2]], [+m[3], +m[4]]]);
const arcsOf = d => [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)A(-?[\d.]+) (-?[\d.]+) 0 0 0 (-?[\d.]+) (-?[\d.]+)/g)].map(m => ({ from: [+m[1], +m[2]], r: +m[3], r2: +m[4], to: [+m[5], +m[6]] }));
function comparePolys(got, want) {
  let vertices = 0, maxAbsError = 0, shapeMismatch = got.length !== want.length;
  for (let i = 0; i < Math.min(got.length, want.length); i++) {
    const g = got[i].points, w = want[i];
    if (g.length !== w.length) { shapeMismatch = true; continue; }
    for (let k = 0; k < w.length; k++) { vertices++; maxAbsError = Math.max(maxAbsError, Math.abs(g[k][0] - w[k][0]), Math.abs(g[k][1] - w[k][1])); }
  }
  return { polygons: got.length, expected: want.length, verticesCompared: vertices, maxAbsError, shapeMismatch, accepted: !shapeMismatch && maxAbsError <= TOL };
}
function compareOrderedSegments(got, want) {
  let maxAbsError = 0;
  const n = Math.min(got.length, want.length);
  for (let i = 0; i < n; i++) for (let e = 0; e < 2; e++) for (let c = 0; c < 2; c++) maxAbsError = Math.max(maxAbsError, Math.abs(got[i][e][c] - want[i][e][c]));
  return { segments: got.length, expected: want.length, maxAbsError, accepted: got.length === want.length && maxAbsError <= TOL };
}
// Line work is compared as a set: each printed segment must be one expected edge, each edge printed once.
function compareSegmentSet(got, want) {
  const cell = 1, grid = new Map(), pts = [];
  const add = p => { const id = pts.length; pts.push(p); const k = Math.floor(p[0] / cell) + ',' + Math.floor(p[1] / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(id); return id; };
  const idOfWant = new Map();
  const key = p => p[0].toFixed(9) + ',' + p[1].toFixed(9);
  for (const s of want) for (const p of s) if (!idOfWant.has(key(p))) idOfWant.set(key(p), add(p));
  const near = p => {
    const ix = Math.floor(p[0] / cell), iy = Math.floor(p[1] / cell); let best = -1, bd = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const id of grid.get((ix + dx) + ',' + (iy + dy)) || []) { const d = Math.max(Math.abs(pts[id][0] - p[0]), Math.abs(pts[id][1] - p[1])); if (d < bd) { bd = d; best = id; } }
    return { id: best, d: bd };
  };
  const wantKeys = new Map();
  for (const s of want) { const a = idOfWant.get(key(s[0])), b = idOfWant.get(key(s[1])); wantKeys.set(Math.min(a, b) + ',' + Math.max(a, b), 0); }
  let unmatched = 0, maxAbsError = 0;
  for (const s of got) {
    const a = near(s[0]), b = near(s[1]);
    maxAbsError = Math.max(maxAbsError, a.d, b.d);
    const k = Math.min(a.id, b.id) + ',' + Math.max(a.id, b.id);
    if (a.d > TOL || b.d > TOL || !wantKeys.has(k)) { unmatched++; continue; }
    wantKeys.set(k, wantKeys.get(k) + 1);
  }
  let missing = 0, repeated = 0;
  for (const n of wantKeys.values()) { if (n === 0) missing++; if (n > 1) repeated++; }
  return { segments: got.length, expected: want.length, unmatched, missing, repeated, maxAbsError, accepted: !unmatched && !missing && !repeated && got.length === want.length && maxAbsError <= TOL };
}
function compareArcs(got, want) {
  let maxAbsError = 0;
  const n = Math.min(got.length, want.length);
  for (let i = 0; i < n; i++) {
    const g = got[i], w = want[i];
    maxAbsError = Math.max(maxAbsError, Math.abs(g.r - w.r), Math.abs(g.r2 - w.r), ...[0, 1].map(c => Math.abs(g.from[c] - w.from[c])), ...[0, 1].map(c => Math.abs(g.to[c] - w.to[c])));
  }
  return { arcs: got.length, expected: want.length, maxAbsError, accepted: got.length === want.length && maxAbsError <= TOL };
}
function compareSvg(parsed, exp, dims) {
  const fills = parsed.polygons.filter(p => p.stroke === 'none'), outlines = parsed.polygons.filter(p => p.fill === 'none');
  const arcPaths = parsed.paths.filter(p => p.cap === 'butt'), linePaths = parsed.paths.filter(p => p.cap !== 'butt');
  const r = {
    width: parsed.width, height: parsed.height, viewBox: parsed.viewBox,
    fills: comparePolys(fills, exp.fills), outlines: comparePolys(outlines, exp.outlines),
    linework: exp.linework ? compareSegmentSet(segmentsOf(linePaths[0] ? linePaths[0].d : ''), exp.linework) : { expected: 0, segments: 0, accepted: true },
    levels: exp.levels.map((segs, i) => compareOrderedSegments(segmentsOf(linePaths[(exp.linework ? 1 : 0) + i] ? linePaths[(exp.linework ? 1 : 0) + i].d : ''), segs)),
    // one butt-capped path per nonempty arc family, family 0 first
    arcs: [0, 1].filter(f => exp.arcs[f].length).map((f, i) => ({ family: f, ...compareArcs(arcsOf(arcPaths[i] ? arcPaths[i].d : ''), exp.arcs[f]) })),
    pathCount: parsed.paths.length, expectedPathCount: (exp.linework ? 1 : 0) + exp.levels.length + (exp.arcs[0].length ? 1 : 0) + (exp.arcs[1].length ? 1 : 0),
  };
  r.accepted = r.width === dims.width && r.height === dims.height && r.viewBox === '0 0 ' + dims.width + ' ' + dims.height &&
    r.fills.accepted && r.outlines.accepted && r.linework.accepted && r.levels.every(l => l.accepted) && r.arcs.every(a => a.accepted) && r.pathCount === r.expectedPathCount;
  return r;
}

/* ---------------- fixtures ---------------- */
function fixtureList(hooks) {
  const list = ['rhombs', 'arcs', 'kitedart', 'ammann', 'inflation', 'linedrawing', 'dodeca', 'kilnfloor'].map(name => ({ name, preset: name, overlay: {} }));
  // The rhombs preset with the grout offset switched off: filled tiles drawn exactly, page covered once.
  list.push({ name: 'rhombs-inset-0', preset: 'rhombs', overlay: { inset: 0 } });
  // Two sweep recipes from tools/tilings-science.js with rotation, pan and non-square aspects, default paint.
  const sci = require('./tilings-science.js').fixtures(hooks);
  for (const name of ['sweep-p3-3', 'sweep-d12-4']) { const f = sci.find(x => x.name === name); list.push({ name, preset: null, overlay: { mode: f.state.mode, depth: f.state.depth, rotation: f.state.rotation, aspect: f.state.aspect, zoom: f.state.zoom, panx: f.state.panx, pany: f.state.pany }, seed: f.state.seed }); }
  return list;
}

// The transcendental values the Penrose build draws on: the sun wheel's cos/sin and powers of φ.
function libm() {
  const out = {}, PHI = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < 10; i++) for (const [tag, a] of [['(2i-1)', (2 * i - 1) * Math.PI / 10], ['(2i+1)', (2 * i + 1) * Math.PI / 10]]) { out['cos ' + tag + 'pi/10 i=' + i] = Math.cos(a); out['sin ' + tag + 'pi/10 i=' + i] = Math.sin(a); }
  for (let k = 0; k < 16; k++) out['phi^' + k] = Math.pow(PHI, k);
  return out;
}

(async () => {
  assert(html.includes(original), 'dist/studio.html does not contain the current src/modules/tilings.js; run node tools/build.js');
  const L = G.loadTilings(), hooks = L.hooks;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const chromiumVersion = browser.version();
  const rows = [];
  let libmProbe = null;
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#tilings/tilings-print-state');
      await page.evaluate(() => Studio.ready);
      await page.evaluate(source);
      const web = await page.evaluate('(' + libm.toString() + ')()'), mine = libm();
      libmProbe = { compared: Object.keys(mine).length, differing: Object.keys(mine).filter(k => !Object.is(mine[k], web[k])).map(k => ({ value: k, node: mine[k], chromium: web[k] })) };
      for (const fx of fixtureList(hooks)) {
        const seed = fx.seed || SEED;
        const b = await page.evaluate(async ({ fx, seed }) => {
          const mod = Studio.modules.tilings, pre = fx.preset ? mod.presets[fx.preset] : null;
          const pal = pre ? pre.palette : Studio.PALETTES[mod.defaultPalette];
          const state = { ...mod.defaults, ...(pre ? pre.p : {}), ...fx.overlay, palette: pal.colors.slice(), bg: pal.bg, seed };
          const aspect = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 }[state.aspect] || 1;
          const dims = aspect >= 1 ? { width: Math.round(2400 / aspect), height: 2400 } : { width: 2400, height: Math.round(2400 * aspect) };
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = Math.round(480 * aspect);
          const instance = mod.create({ canvas, getState: () => state, setStatus() {}, isActive: () => false, reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); } });
          instance.regenerate();
          const first = instance.auditSnapshot();
          instance.regenerate();
          const again = instance.auditSnapshot();
          const same = (a, c) => JSON.stringify(a) === JSON.stringify(c);
          const lumOf = hex => { const v = parseInt(hex.slice(1), 16); return 0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255); };
          async function raster(blob) {
            const bitmap = await createImageBitmap(blob);
            const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
            const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bitmap, 0, 0);
            const px = g.getImageData(0, 0, c.width, c.height).data, Lbg = lumOf(state.bg);
            let lo = 255, hi = 0, finite = 0, ink = 0;
            for (let i = 0; i < px.length; i += 4) { const Lm = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; if (Number.isFinite(Lm)) { finite++; if (Lm < lo) lo = Lm; if (Lm > hi) hi = Lm; if (Math.abs(Lm - Lbg) > 16) ink++; } }
            const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', px.buffer))).map(x => x.toString(16).padStart(2, '0')).join('');
            const out = { width: bitmap.width, height: bitmap.height, spread: hi - lo, inkFraction: ink / (px.length / 4), finite: finite === px.length / 4, pixelSha256: digest };
            bitmap.close();
            return out;
          }
          const dimsOk = r => r.width === dims.width && r.height === dims.height;
          const acceptPng = r => dimsOk(r) && r.type === 'image/png' && r.bytes > 1000 && r.nonblank && r.statePreserved;
          async function png(w, h, after) {
            const before = instance.auditSnapshot();
            const blob = await instance.exportPNG(w, h);
            if (after) after();
            const ras = await raster(blob);
            const r = { requested: [w, h], ...ras, bytes: blob.size, type: blob.type, statePreserved: same(before, instance.auditSnapshot()) };
            r.nonblank = r.spread > 12 && r.inkFraction > 0.001 && r.finite;
            r.dimensionsMatch = dimsOk(r);
            r.accepted = acceptPng(r);
            return r;
          }
          const p1 = await png(dims.width, dims.height);
          const p2 = await png(dims.width, dims.height);
          const narrow = await png(dims.width - 1, dims.height);
          const beforeSvg = instance.auditSnapshot();
          const svgBlob = instance.exportSVG(dims.width, dims.height);
          const svgText = typeof svgBlob === 'string' ? svgBlob : await svgBlob.text();
          const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
          const svgParse = { ok: !doc.querySelector('parsererror') && doc.documentElement.nodeName === 'svg', polygons: doc.querySelectorAll('polygon').length, paths: doc.querySelectorAll('path').length };
          const svgStatePreserved = same(beforeSvg, instance.auditSnapshot());
          const allExportsPreserved = same(first, instance.auditSnapshot());
          const mutated = await png(dims.width, dims.height, () => instance.auditMutate());
          return { state, dims, first, replayIdentical: same(first, again), p1, p2, narrow, mutated, svgText, svgParse, svgStatePreserved, allExportsPreserved };
        }, { fx, seed });

        // Node: the same recipe through the actual module loaded from disk.
        const s = b.state, M = hooks.buildModel(s);
        const dec = (x, T) => { const buf = Buffer.from(x, 'base64'); return new T(buf.buffer, buf.byteOffset, buf.byteLength / T.BYTES_PER_ELEMENT); };
        const bx = dec(b.first.xy, Float64Array);
        let wordsDiffer = 0, maxDiff = 0;
        const nx = M.tiles.xy.subarray(0, M.tiles._used);
        if (bx.length !== nx.length) wordsDiffer = Infinity;
        else for (let i = 0; i < nx.length; i++) if (!Object.is(nx[i], bx[i])) { wordsDiffer++; maxDiff = Math.max(maxDiff, Math.abs(nx[i] - bx[i])); }
        const intsSame = ['off', 'nv', 'type', 'cls', 'anc', 'flip'].every(k => {
          const T = { off: Int32Array, nv: Uint8Array, type: Uint8Array, cls: Uint8Array, anc: Int32Array, flip: Uint8Array }[k];
          const a = dec(b.first[k], T), n = M.tiles[k].subarray(0, M.tiles.n);
          return a.length === n.length && a.every((v, i) => v === n[i]);
        });
        let segWords = 0, segMax = 0, segShape = b.first.levelSegs.length !== M.levelSegs.length;
        b.first.levelSegs.forEach((x, i) => {
          const a = dec(x, Float64Array), n = M.levelSegs[i];
          if (!n || a.length !== n.length) { segShape = true; return; }
          for (let j = 0; j < n.length; j++) if (!Object.is(a[j], n[j])) { segWords++; segMax = Math.max(segMax, Math.abs(a[j] - n[j])); }
        });
        const browserEqualsNode = { tiles: [b.first.n, M.tiles.n], xyWordsDiffering: wordsDiffer, maxAbsDifference: maxDiff, integersIdentical: intsSame,
          levelSegmentWordsDiffering: segWords, levelSegmentMaxAbsDifference: segMax, levelSegmentShapeMismatch: segShape, hxhy: b.first.hx === M.hx && b.first.hy === M.hy, depth: b.first.depth === M.depth };
        // Criterion as fixed: word-identical. Recorded miss where the engines' libm differ (see libmProbe).
        browserEqualsNode.exact = b.first.n === M.tiles.n && wordsDiffer === 0 && intsSame && !segShape && segWords === 0 && browserEqualsNode.hxhy && browserEqualsNode.depth;
        browserEqualsNode.sameStructureWithin1e12 = b.first.n === M.tiles.n && b.first.used === M.tiles._used && intsSame && !segShape && maxDiff <= 1e-12 && segMax <= 1e-12 && browserEqualsNode.hxhy && browserEqualsNode.depth;

        // Both the Node model and the browser's own model must pass the numerical tiling predicates.
        const view = { x0: -M.hx, x1: M.hx, y0: -M.hy, y1: M.hy };
        const tilingOf = tiles => {
          const polys = G.polygonsOf(tiles), chain = G.chainCheck(polys, { unit: 1, view }), shapes = G.shapeCheck(s.mode, polys);
          const r = { tiles: polys.length, viewCoveredOnce: chain.viewCoveredOnce, tJunctions: chain.tJunctions, repeated: chain.repeatedDirectedSubEdges, viewAreaRelativeError: chain.viewAreaRelativeError, shapesUnmatched: shapes.unmatched, labelMismatch: shapes.labelMismatch };
          r.ok = chain.viewCoveredOnce && !chain.tJunctions && !chain.repeatedDirectedSubEdges && chain.viewAreaRelativeError <= 1e-9 && !shapes.unmatched && !shapes.labelMismatch;
          return r;
        };
        const nodeModelTiling = tilingOf(M.tiles);
        const bt = { n: b.first.n, xy: bx, off: dec(b.first.off, Int32Array), nv: dec(b.first.nv, Uint8Array), type: dec(b.first.type, Uint8Array), flip: dec(b.first.flip, Uint8Array) };
        const browserModelTiling = tilingOf(bt);

        // Criterion as fixed: polygons are the tiles inset (moved inward) by the grout distance. Where it
        // misses, the same comparison against the outward offset shows what the module actually prints.
        const parsed = parseSvg(b.svgText);
        const expIn = expectedSvg(M, s, hooks, b.dims.width, b.dims.height, +1), expOut = expectedSvg(M, s, hooks, b.dims.width, b.dims.height, -1);
        const inward = compareSvg(parsed, expIn, b.dims), outward = compareSvg(parsed, expOut, b.dims);
        const exp = inward.accepted ? expIn : expOut;
        const svg = inward.accepted ? inward : outward;
        svg.insetCriterionAsFixed = { inset: s.inset, accepted: inward.accepted, fillsMaxAbsError: inward.fills.maxAbsError, outlinesMaxAbsError: inward.outlines.maxAbsError };
        svg.matchedOffset = s.inset > 0.0005 ? (inward.accepted ? 'inward' : outward.accepted ? 'outward' : 'neither') : 'none';
        svg.bytes = Buffer.byteLength(b.svgText); svg.parse = b.svgParse; svg.statePreserved = b.svgStatePreserved;
        svg.accepted = svg.accepted && b.svgParse.ok && b.svgStatePreserved;
        // Page coverage of the printed fill polygons: exactly 1 for a tiling drawn without an offset, below 1
        // with grout, above 1 where offset tiles overlap their neighbours.
        const fillPolys = parsed.polygons.filter(p => p.stroke === 'none');
        svg.fillCoverageOfPage = fillPolys.length ? fillPolys.reduce((a, p) => a + Math.abs(G.clipArea(p.points, { x0: 0, x1: b.dims.width, y0: 0, y1: b.dims.height })), 0) / (b.dims.width * b.dims.height) : null;
        // Failure control: one expected vertex moved by 0.02 px must be rejected by the same comparison.
        const shifted = JSON.parse(JSON.stringify(exp));
        const target = shifted.fills.length ? shifted.fills : shifted.outlines.length ? shifted.outlines : null;
        let shiftControl;
        if (target) { target[target.length >> 1][0][0] += 0.02; const r = compareSvg(parsed, shifted, b.dims); shiftControl = { what: 'one polygon vertex moved 0.02 px', rejected: !r.accepted, maxAbsError: Math.max(r.fills.maxAbsError || 0, r.outlines.maxAbsError || 0) }; }
        else { shifted.linework[shifted.linework.length >> 1][0][0] += 0.02; const r = compareSvg(parsed, shifted, b.dims); shiftControl = { what: 'one line-work endpoint moved 0.02 px', rejected: !r.accepted, unmatched: r.linework.unmatched }; }

        const strip = r => { const o = { ...r }; delete o.pixelSha256; return o; };
        const row = {
          fixture: fx.name, preset: fx.preset, seed, requested: [b.dims.width, b.dims.height],
          state: { mode: s.mode, depth: s.depth, zoom: s.zoom, rotation: s.rotation, panx: s.panx, pany: s.pany, aspect: s.aspect, fill: s.fill, inset: s.inset, strokeWidth: s.strokeWidth, linework: s.linework, levels: s.levels, arcs: s.arcs, jitter: s.jitter, grain: s.grain, bg: s.bg },
          tiles: M.tiles.n, depthRendered: M.depth, levelsDeflated: M.levels,
          settingsSha256: sha(b.first.settings), xySha256: sha(Buffer.from(b.first.xy, 'base64')),
          browserEqualsNode, nodeModelTiling, browserModelTiling, deterministicReplay: b.replayIdentical,
          png: strip(b.p1), pngRepeatIdenticalPixels: b.p1.pixelSha256 === b.p2.pixelSha256, pixelSha256: b.p1.pixelSha256,
          allExportsPreserved: b.allExportsPreserved,
          svg,
          failureControls: {
            narrowPng: { requested: b.narrow.requested, width: b.narrow.width, height: b.narrow.height, dimensionsMatch: b.narrow.dimensionsMatch, nonblank: b.narrow.nonblank, statePreserved: b.narrow.statePreserved, rejected: !b.narrow.accepted },
            mutationAfterExport: { dimensionsMatch: b.mutated.dimensionsMatch, nonblank: b.mutated.nonblank, statePreserved: b.mutated.statePreserved, rejected: !b.mutated.accepted },
            svgShift: shiftControl,
          },
        };
        rows.push(row);
        console.error(fx.name, JSON.stringify({ tiles: row.tiles, node: browserEqualsNode.exact, png: [b.p1.width, b.p1.height, b.p1.accepted], svg: [svg.fills.verticesCompared, svg.outlines.verticesCompared, svg.linework.segments, svg.levels.map(l => l.segments), svg.arcs.map(a => a.arcs), svg.accepted] }));
      }
    } finally { await page.close(); }
    assert.deepEqual(errors, [], 'page errors: ' + errors.join('; '));
  } finally { await browser.close(); }

  for (const row of rows) {
    const t = row.fixture;
    assert(row.browserEqualsNode.exact || row.browserEqualsNode.sameStructureWithin1e12, t + ': browser model differs from Node ' + JSON.stringify(row.browserEqualsNode));
    assert(row.nodeModelTiling.ok, t + ': Node model fails the tiling predicates ' + JSON.stringify(row.nodeModelTiling));
    assert(row.browserModelTiling.ok, t + ': browser model fails the tiling predicates ' + JSON.stringify(row.browserModelTiling));
    assert(row.deterministicReplay, t + ': regenerate is not deterministic');
    assert(row.png.accepted, t + ': PNG rejected ' + JSON.stringify(row.png));
    assert.deepEqual([row.png.width, row.png.height], row.requested);
    assert(row.pngRepeatIdenticalPixels, t + ': repeated export changed pixels');
    assert(row.allExportsPreserved, t + ': exports changed the state');
    assert(row.svg.accepted, t + ': SVG rejected ' + JSON.stringify(row.svg));
    if (row.state.inset <= 0.0005 && row.state.fill !== 'none') assert(Math.abs(row.svg.fillCoverageOfPage - 1) < 1e-4, t + ': unoffset fills do not cover the page once');
    const nw = row.failureControls.narrowPng;
    assert(nw.rejected && !nw.dimensionsMatch && nw.width === row.requested[0] - 1 && nw.statePreserved && nw.nonblank, t + ': narrow control ' + JSON.stringify(nw));
    const m = row.failureControls.mutationAfterExport;
    assert(m.rejected && !m.statePreserved && m.dimensionsMatch && m.nonblank, t + ': mutation control ' + JSON.stringify(m));
    assert(row.failureControls.svgShift.rejected, t + ': SVG shift control escaped');
  }

  assert(rows.every(r => r.browserEqualsNode.exact) || (libmProbe && libmProbe.differing.length), 'models differ although no libm value differs');
  const misses = rows.filter(r => !r.svg.insetCriterionAsFixed.accepted).map(r => ({ fixture: r.fixture, inset: r.state.inset, matchedOffset: r.svg.matchedOffset, fillCoverageOfPage: r.svg.fillCoverageOfPage, inwardMaxAbsError: Math.max(r.svg.insetCriterionAsFixed.fillsMaxAbsError || 0, r.svg.insetCriterionAsFixed.outlinesMaxAbsError || 0) }));
  const result = {
    pass: true,
    misses: {
      insetDirection: {
        criterion: 'Fill and outline polygons equal the tiles inset (moved inward) by the grout distance, within 0.005 px.',
        cause: 'src/modules/tilings.js:626 insetPoly offsets along the left normals (-uy, ux); the y flip at print (py = oy - y sc) makes every tile clockwise in page coordinates, so the offset moves outward. Every recipe with inset > 0 prints tiles enlarged by the inset distance, overlapping their neighbours instead of leaving grout.',
        fixtures: misses,
      },
      browserNodeWordIdentity: {
        criterion: 'Browser and Node models identical word for word.',
        cause: 'The two JavaScript engines round some sun-wheel sin/cos values differently (libmProbe); the deflation carries the last-bit difference into descendant vertices. Integer tile data are identical, coordinates agree within 1e-12, and the browser model passes the tiling predicates itself.',
        libmProbe,
        fixtures: rows.filter(r => !r.browserEqualsNode.exact).map(r => ({ fixture: r.fixture, xyWordsDiffering: r.browserEqualsNode.xyWordsDiffering, maxAbsDifference: r.browserEqualsNode.maxAbsDifference, levelSegmentWordsDiffering: r.browserEqualsNode.levelSegmentWordsDiffering, levelSegmentMaxAbsDifference: r.browserEqualsNode.levelSegmentMaxAbsDifference })),
      },
    },
    source: 'src/modules/tilings.js',
    sourceSha256: sha(original),
    engineSha256: sha(engine),
    harnessSha256: sha(fs.readFileSync(__filename)),
    geometrySha256: sha(fs.readFileSync(path.join(__dirname, 'tilings-geometry.js'))),
    command: 'node tools/tilings-print-state.js --write',
    setup: 'npm install --no-save --package-lock=false playwright@1.56.1',
    scope: 'Actual tilings.js in dist/studio.html (Chromium, SwiftShader) for the eight Penrose P3/P2, Ammann-Beenker and dodecagonal presets at seed ' + SEED + ' with their own paint settings and palettes, and two rotated, panned, non-square sweep recipes from tools/tilings-science.js. ' +
      'The browser model (every Float64 vertex word, tile types, orientation classes, ancestors, flip flags and inflation-level segments) is compared with the Node model that tools/tilings-science.js validates. exportPNG at 2400 px on the longest edge with the complete model compared before and after, a second export compared pixel for pixel; exportSVG with every fill and outline polygon vertex (mitred inset recomputed by line intersection), every line-work edge as a set, every inflation-level segment and every arc endpoint and radius compared with geometry computed in Node.',
    criteria: 'Browser and Node models identical word for word; regenerate identical; exact requested PNG dimensions, image/png over 1000 bytes, luminance spread over 12/255, more than 0.1% of pixels off the background, all pixels finite; repeated export pixel-identical; zero changed model words or settings across every export; SVG exactly the requested size and viewBox, one fill polygon per tile (and one outline per tile where drawn), every coordinate within 0.005 px (half the printed 0.01 px) of the Node geometry, line work equal to the set of distinct tile edges meeting the cull rectangle, each once, level and arc paths complete. ' +
      'Failure controls: a PNG requested 1 px narrower, a post-export change to one vertex word and one tile type, and one expected SVG vertex moved 0.02 px must each be rejected by the same predicate. ' +
      'Where the engines round a sun-wheel sin/cos differently, word identity misses (misses.browserNodeWordIdentity) and is replaced by identical integer data, coordinates within 1e-12 and the browser model passing the tiling predicates itself. ' +
      'For inset > 0 the polygons were required to be inward insets; that criterion misses (misses.insetDirection) and the rows record the outward offset the module prints, which the SVG then matches within the same 0.005 px.',
    rows,
    limitations: [
      'Ten recipes at one seed each (eight presets, two sweep recipes), one Chromium build and a software renderer; not every seed, control, palette, aspect or hardware.',
      'PNG output is checked for dimensions, nonblank content, determinism and preserved state, not pixel by pixel against the geometry; colour, jitter and grain are presentation and not calibrated.',
      'The arcs preset prints exactly the decoration the module specifies; the P3 thin-rhomb arc specification itself is defective (see validation/TILINGS.md), so its arcs are print-faithful but not a valid Penrose matching decoration.',
      'Hat and spectre prints are not covered.',
    ],
    environment: { node: process.version, chromium: chromiumVersion, platform: process.platform, playwright: require('playwright/package.json').version },
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/tilings-print-state.json'), JSON.stringify(result, null, 1) + '\n');
  console.log(JSON.stringify({ pass: true, rows: rows.map(r => ({ fixture: r.fixture, tiles: r.tiles, png: [r.png.width, r.png.height], svg: { fills: r.svg.fills.verticesCompared, outlines: r.svg.outlines.verticesCompared, linework: r.svg.linework.segments, levels: r.svg.levels.map(l => l.segments), arcs: r.svg.arcs.map(a => a.arcs), maxAbsError: Math.max(r.svg.fills.maxAbsError || 0, r.svg.outlines.maxAbsError || 0, r.svg.linework.maxAbsError || 0, ...r.svg.levels.map(l => l.maxAbsError), ...r.svg.arcs.map(a => a.maxAbsError || 0)) } })), environment: result.environment }, null, 1));
})().catch(error => { console.error(error); process.exitCode = 1; });
