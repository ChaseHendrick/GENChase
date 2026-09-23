'use strict';
// Actual veselago exportPNG print path in the browser build. For each fixture: the browser field word for word
// against the same module run headless in Node, deterministic regenerate, the scientific state unchanged by every
// export, exact print dimensions, a nonblank sheet, and every print pixel against the buffer cell it magnifies.
// The browser field is then checked against the independent Snell trace in tools/veselago-science.js: every lit
// cell lies on a traced ray, and at n = -1 the brightest cells sit at the analytic image. veselago has no
// exportSVG, so there are no vector vertices to compare; the raster is checked cell by cell instead.
// Print evidence, not a numerical claim beyond that trace.
// Setup: npm install --no-save --package-lock=false playwright@1.56.1
// node tools/veselago-print-state.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const V = require('./veselago-science.js');

const root = path.resolve(__dirname, '..');
const original = fs.readFileSync(path.join(root, 'src/modules/veselago.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const SEED = 'veselago-1968';
function printSize(aspect) {
  const a = V.ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

// Acceptance criteria, fixed before the first run.
const PRINT_CRITERIA = {
  pngMinBytes: 1000, luminanceSpread: 12, inkFraction: 0.001, inkLuminanceDelta: 16,
  pixelMismatches: 0,          // every print pixel equals the buffer cell containing its centre (either cell on an exact boundary)
  inkWithoutRay: 0,            // buffer cells off the zero-field colour whose field is zero
  strayInk: 0,                 // browser field cells off every independently traced ray
  brightestTolPx: [2.5, 0.5],  // n = -1 with the axis on a cell centre: every maximal cell within 2.5 px (x) and 0.5 px (y) of slab0 + 2L - d
};

// Read-only hooks before the aspect line of the returned API: a full copy of the scientific state, the paint
// buffer, and a deliberate mutation for the failure control.
const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
assert.equal(original.split(marker).length, 2, 'Expected one veselago export API marker');
const source = original.replace(marker, `        auditSnapshot() {
          if (!field) throw Error('no field');
          return { field: field.slice(), metric, extra, W, H, cells: [W, H], settings: JSON.stringify(host.getState()),
            buf: buf ? [buf.width, buf.height] : null };
        },
        auditBuffer() { return buf.getContext('2d').getImageData(0, 0, buf.width, buf.height).data.slice(); },
        auditMutate(i) { field[i] = field[i] + 1; metric = metric + 1; },
${marker}`);

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const chromiumVersion = browser.version();
  const nodeModule = V.loadModule();
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#veselago/veselago-print-state');
      await page.evaluate(source);
      for (const fx of V.PRINT_FIXTURES) {
        const aspect = fx.p.aspect || '1:1', dims = printSize(aspect);
        const b = await page.evaluate(async ({ fx, seed, dims, C }) => {
          const mod = Studio.modules.veselago;
          const pre = fx.preset ? mod.presets[fx.preset] : null;
          const pal = pre ? pre.palette : Studio.PALETTES[mod.defaultPalette];
          const make = sd => {
            const state = { ...mod.defaults, ...fx.p, palette: pal.colors.slice(), bg: pal.bg, seed: sd };
            mod.sanitize(state);
            const canvas = document.createElement('canvas');
            canvas.width = 480; canvas.height = Math.round(480 * dims.height / dims.width);
            const instance = mod.create({
              canvas, getState: () => state, setStatus() {}, isActive: () => false,
              reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
            });
            instance.regenerate();
            return { state, instance };
          };
          const { state, instance } = make(seed);
          const words = (x, y) => { if (!x || !y || x.length !== y.length) return Infinity; const a = new Uint32Array(x.buffer), c = new Uint32Array(y.buffer); let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) d++; return d; };
          function compare(a, c) {
            return { changedWords: words(a.field, c.field), metricChanged: !Object.is(a.metric, c.metric), extraChanged: !Object.is(a.extra, c.extra),
              cellsChanged: JSON.stringify(a.cells) !== JSON.stringify(c.cells), bufChanged: JSON.stringify(a.buf) !== JSON.stringify(c.buf),
              settingsChanged: a.settings !== c.settings };
          }
          const preserved = c => c.changedWords === 0 && !c.metricChanged && !c.extraChanged && !c.cellsChanged && !c.bufChanged && !c.settingsChanged;
          const lumOf = hex => { const v = parseInt(hex.slice(1), 16); return 0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255); };
          async function decode(blob) {
            const bitmap = await createImageBitmap(blob);
            const c = document.createElement('canvas');
            c.width = bitmap.width; c.height = bitmap.height;
            const g = c.getContext('2d', { willReadFrequently: true });
            g.drawImage(bitmap, 0, 0);
            const px = g.getImageData(0, 0, c.width, c.height).data;
            const out = { width: bitmap.width, height: bitmap.height, px };
            bitmap.close();
            return out;
          }
          function luminance(px) {
            // Every pixel of the print, not a reduced copy.
            const Lbg = lumOf(state.bg);
            let lo = 255, hi = 0, finite = 0, ink = 0;
            for (let i = 0; i < px.length; i += 4) {
              const L = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
              if (Number.isFinite(L)) { finite++; if (L < lo) lo = L; if (L > hi) hi = L; if (Math.abs(L - Lbg) > C.inkLuminanceDelta) ink++; }
            }
            return { spread: hi - lo, min: lo, max: hi, finite, samples: px.length / 4, inkFraction: ink / (px.length / 4) };
          }
          const dimensionsMatch = r => r.width === dims.width && r.height === dims.height;
          const acceptPng = r => dimensionsMatch(r) && r.type === 'image/png' && r.bytes > C.pngMinBytes && r.nonblank && preserved(r.state);
          async function png(w, h, afterExport) {
            const before = instance.auditSnapshot();
            const blob = await instance.exportPNG(w, h);
            if (afterExport) afterExport(before);
            const diff = compare(before, instance.auditSnapshot());
            const d = await decode(blob), lum = luminance(d.px);
            const r = { requested: [w, h], width: d.width, height: d.height, bytes: blob.size, type: blob.type, luminance: lum,
              nonblank: lum.spread > C.luminanceSpread && lum.inkFraction > C.inkFraction && lum.finite === lum.samples, state: diff };
            r.dimensionsMatch = dimensionsMatch(r); r.statePreserved = preserved(diff); r.accepted = acceptPng(r);
            return { r, px: d.px };
          }
          function b64(ta) {
            const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
            let s = '';
            for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
            return btoa(s);
          }

          const first = instance.auditSnapshot();
          const cells = instance.fieldCells();
          instance.regenerate();
          const replay = compare(first, instance.auditSnapshot());
          const other = make(seed + '/other').instance.auditSnapshot();
          const seedIndependent = words(first.field, other.field) === 0 && Object.is(first.metric, other.metric);

          // Buffer against field: one colour for every empty cell, and no colour off it where the field is empty.
          const W = first.W, H = first.H, f = first.field, buf = instance.auditBuffer();
          let hi = 0; for (let i = 0; i < f.length; i++) if (f[i] > hi) hi = f[i];
          const rgb = i => (buf[4 * i] << 16) | (buf[4 * i + 1] << 8) | buf[4 * i + 2];
          const zeroColors = new Set(), maxColors = new Set();
          for (let i = 0; i < f.length; i++) { if (f[i] === 0) zeroColors.add(rgb(i)); if (f[i] === hi) maxColors.add(rgb(i)); }
          const c0 = zeroColors.size === 1 ? [...zeroColors][0] : null, cMax = maxColors.size === 1 ? [...maxColors][0] : null;
          let inkWithoutRay = 0, faintLit = 0, lit = 0, maxCells = 0, maxColorCells = 0, opaque = 0;
          for (let i = 0; i < f.length; i++) {
            if (buf[4 * i + 3] === 255) opaque++;
            if (f[i] > 0) { lit++; if (rgb(i) === c0) faintLit++; } else if (rgb(i) !== c0) inkWithoutRay++;
            if (f[i] === hi) maxCells++;
            if (rgb(i) === cMax) maxColorCells++;
          }
          const bufferCheck = { zeroColorUnique: zeroColors.size === 1, maxColorUnique: maxColors.size === 1, inkWithoutRay, lit, faintLit,
            maxCells, maxColorCells, allOpaque: opaque === f.length };

          const main = await png(dims.width, dims.height);
          // Every print pixel against the buffer cell whose footprint contains its centre, computed in integers;
          // a centre exactly on a cell boundary may take either neighbour.
          const w = main.r.width, h = main.r.height, px = main.px;
          let mismatches = 0, tiesX = 0, tiesY = 0, alphaNot255 = 0, first_ = null;
          // Where a tie falls between two differently coloured cells, which one the renderer took.
          const tieChoice = { decisiveX: 0, higherCellX: 0, lowerCellX: 0, decisiveY: 0, higherCellY: 0, lowerCellY: 0 };
          const map = (X, n, N) => { const num = (2 * X + 1) * n, q = Math.floor(num / (2 * N)); return num % (2 * N) === 0 ? [q, q - 1] : [q]; };
          const xs = [], ys = [];
          for (let X = 0; X < w; X++) { xs.push(map(X, W, w)); if (xs[X].length > 1) tiesX++; }
          for (let Y = 0; Y < h; Y++) { ys.push(map(Y, H, h)); if (ys[Y].length > 1) tiesY++; }
          if (w === dims.width && h === dims.height) {
            for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
              const o = 4 * (Y * w + X);
              if (px[o + 3] !== 255) alphaNot255++;
              let ok = false;
              for (const cy of ys[Y]) for (const cx of xs[X]) {
                const q = 4 * (cy * W + cx);
                if (px[o] === buf[q] && px[o + 1] === buf[q + 1] && px[o + 2] === buf[q + 2]) ok = true;
              }
              if (!ok) { mismatches++; if (!first_) first_ = [X, Y, px[o], px[o + 1], px[o + 2]]; }
              const same = (cx, cy) => { const q = 4 * (cy * W + cx); return px[o] === buf[q] && px[o + 1] === buf[q + 1] && px[o + 2] === buf[q + 2]; };
              if (xs[X].length > 1 && ys[Y].length === 1) {
                const hiX = same(xs[X][0], ys[Y][0]), loX = same(xs[X][1], ys[Y][0]);
                if (hiX !== loX) { tieChoice.decisiveX++; if (hiX) tieChoice.higherCellX++; else tieChoice.lowerCellX++; }
              }
              if (ys[Y].length > 1 && xs[X].length === 1) {
                const hiY = same(xs[X][0], ys[Y][0]), loY = same(xs[X][0], ys[Y][1]);
                if (hiY !== loY) { tieChoice.decisiveY++; if (hiY) tieChoice.higherCellY++; else tieChoice.lowerCellY++; }
              }
            }
          } else mismatches = Infinity;
          main.r.pixels = { compared: w * h, mismatches, tiesX, tiesY, tieChoice, alphaNot255, firstMismatch: first_ };

          const narrow = (await png(dims.width - 1, dims.height)).r;
          // Failure control: a real export followed by a one-word change at the brightest cell and to the metric.
          let at = 0; for (let i = 0; i < f.length; i++) if (f[i] === hi) { at = i; break; }
          const mutated = (await png(dims.width, dims.height, () => instance.auditMutate(at))).r;
          instance.regenerate();
          const afterAll = compare(first, instance.auditSnapshot());

          return { state: { n: state.n, L: state.L, src: state.src, rays: state.rays, grid: state.grid, aspect: state.aspect, view: state.view,
              exposure: state.exposure, bg: state.bg, seed: state.seed },
            cells, W, H, metric: first.metric, extra: first.extra, settings: first.settings, fieldB64: b64(first.field),
            replay: { ...replay, identical: preserved(replay) }, seedIndependent, bufferCheck,
            png: main.r, narrow, mutated, mutateAt: at, regeneratedAfterMutation: preserved(afterAll) };
        }, { fx, seed: SEED, dims, C: PRINT_CRITERIA });

        // Node: the same module source run headless, and the independent Snell trace.
        const cfg = { n: b.state.n, L: b.state.L, src: b.state.src, rays: b.state.rays, grid: b.state.grid, aspect: b.state.aspect };
        const u8 = new Uint8Array(Buffer.from(b.fieldB64, 'base64')), field = new Float32Array(u8.buffer);
        const nodeRun = V.runModule(nodeModule, cfg);
        let differ = 0;
        const a32 = new Uint32Array(field.buffer), n32 = new Uint32Array(nodeRun.field.buffer);
        if (a32.length !== n32.length) differ = Infinity; else for (let i = 0; i < a32.length; i++) if (a32[i] !== n32[i]) differ++;
        const node = { fieldWordsDiffering: differ, metricIdentical: Object.is(nodeRun.metric, b.metric), cellsIdentical: nodeRun.W === b.W && nodeRun.H === b.H,
          fieldSha256: sha(Buffer.from(u8)), nodeFieldSha256: sha(Buffer.from(nodeRun.field.buffer)) };
        node.exact = node.fieldWordsDiffering === 0 && node.metricIdentical && node.cellsIdentical;
        const ref = V.snellTrace(cfg), ink = V.inkCheck(field, b.W, b.H, ref.rays), g = ref.g;
        let hi = 0; for (let i = 0; i < field.length; i++) if (field[i] > hi) hi = field[i];
        const maxCells = [];
        for (let i = 0; i < field.length; i++) if (field[i] === hi) maxCells.push([i % b.W, Math.floor(i / b.W)]);
        const xf = g.face0 + 2 * cfg.L - cfg.src;
        const brightest = { value: hi, cells: maxCells.length, analyticImage: [Math.round(xf * 1e6) / 1e6, g.ys],
          maxDx: Math.max(...maxCells.map(c => Math.abs(c[0] - xf))), maxDy: Math.max(...maxCells.map(c => Math.abs(c[1] - g.ys))),
          applies: cfg.n === -1 && b.H % 2 === 0 && cfg.L - cfg.src >= V.CRITERIA.focusWindow.minBehindFacePx && xf <= g.xEnd - V.CRITERIA.focusWindow.minFromEndPx };
        brightest.atImage = brightest.maxDx <= PRINT_CRITERIA.brightestTolPx[0] && brightest.maxDy <= PRINT_CRITERIA.brightestTolPx[1];
        const dropped = ref.rays.filter(R => R.tir).length;

        const p = b.png;
        const row = {
          fixture: fx.name, preset: fx.preset || null, ...b.state, requested: [dims.width, dims.height], cells: [b.W, b.H], metric: b.metric, extra: b.extra,
          raysDrawn: b.state.rays - dropped, raysDroppedTotalReflection: dropped,
          node, deterministicReplay: b.replay, seedIndependent: b.seedIndependent, buffer: b.bufferCheck,
          independentTrace: { stray: ink.stray, lit: ink.lit, segmentsChecked: ink.segmentsChecked, minCoverage: Math.round(ink.minCoverage * 1e6) / 1e6, lowCoverage: ink.lowCoverage },
          brightest,
          png: { width: p.width, height: p.height, bytes: p.bytes, type: p.type, luminance: p.luminance, nonblank: p.nonblank, state: p.state,
            statePreserved: p.statePreserved, dimensionsMatch: p.dimensionsMatch, accepted: p.accepted, pixels: p.pixels },
          regeneratedAfterMutation: b.regeneratedAfterMutation,
          failureControls: {
            narrowPng: { requested: b.narrow.requested, width: b.narrow.width, height: b.narrow.height, dimensionsMatch: b.narrow.dimensionsMatch,
              nonblank: b.narrow.nonblank, statePreserved: b.narrow.statePreserved, rejected: !b.narrow.accepted },
            mutationAfterExport: { index: b.mutateAt, changedWords: b.mutated.state.changedWords, metricChanged: b.mutated.state.metricChanged,
              dimensionsMatch: b.mutated.dimensionsMatch, nonblank: b.mutated.nonblank, statePreserved: b.mutated.statePreserved, rejected: !b.mutated.accepted },
          },
        };
        row.accepted = node.exact && b.replay.identical && p.accepted && p.pixels.mismatches === PRINT_CRITERIA.pixelMismatches && p.pixels.alphaNot255 === 0 &&
          b.bufferCheck.zeroColorUnique && b.bufferCheck.inkWithoutRay === PRINT_CRITERIA.inkWithoutRay && b.bufferCheck.allOpaque &&
          ink.stray === PRINT_CRITERIA.strayInk && ink.lowCoverage === 0 && (!brightest.applies || brightest.atImage);
        console.error(fx.name, JSON.stringify({ cells: row.cells, png: [p.width, p.height, p.accepted], pixels: p.pixels.mismatches, ties: [p.pixels.tiesX, p.pixels.tiesY],
          node: node.exact, stray: ink.stray, brightest: [brightest.applies, brightest.atImage, brightest.maxDx, brightest.maxDy], accepted: row.accepted }));
        rows.push(row);
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    const tag = row.fixture;
    assert(row.node.exact, tag + ': browser field differs from the Node run ' + JSON.stringify(row.node));
    assert(row.deterministicReplay.identical, tag + ': regenerate is not deterministic');
    assert(row.png.accepted, tag + ': PNG rejected ' + JSON.stringify(row.png));
    assert.deepEqual([row.png.width, row.png.height], row.requested);
    assert.equal(row.png.pixels.mismatches, 0, tag + ': print pixels differ from the buffer ' + JSON.stringify(row.png.pixels));
    assert(row.buffer.zeroColorUnique && row.buffer.inkWithoutRay === 0, tag + ': buffer ' + JSON.stringify(row.buffer));
    assert.equal(row.independentTrace.stray, 0, tag + ': ink off every traced ray');
    if (row.brightest.applies) assert(row.brightest.atImage, tag + ': brightest cells away from the analytic image ' + JSON.stringify(row.brightest));
    assert(row.regeneratedAfterMutation, tag + ': regenerate did not restore the state after the mutation control');
    const nw = row.failureControls.narrowPng;
    assert(nw.rejected && !nw.dimensionsMatch && nw.width === row.requested[0] - 1 && nw.height === row.requested[1], tag + ': narrow PNG escaped ' + JSON.stringify(nw));
    assert(nw.statePreserved && nw.nonblank, tag + ': narrow export failed for another reason ' + JSON.stringify(nw));
    const m = row.failureControls.mutationAfterExport;
    assert(m.rejected && !m.statePreserved && m.changedWords === 1 && m.metricChanged, tag + ': mutation escaped ' + JSON.stringify(m));
    assert(m.dimensionsMatch && m.nonblank, tag + ': mutated export failed for another reason ' + JSON.stringify(m));
    assert(row.accepted, tag + ': not accepted');
  }
  assert(rows.some(r => r.brightest.applies), 'no fixture checks the brightest cells against the analytic image');

  const result = {
    pass: true,
    source: 'src/modules/veselago.js',
    sourceSha256: sha(original),
    engineSha256: sha(engine),
    harnessSha256: sha(fs.readFileSync(__filename)),
    traceHarness: 'tools/veselago-science.js',
    traceHarnessSha256: sha(fs.readFileSync(path.join(__dirname, 'veselago-science.js'))),
    command: 'node tools/veselago-print-state.js --write',
    setup: 'npm install --no-save --package-lock=false playwright@1.56.1',
    scope: 'Actual veselago.js in dist/studio.html (Chromium, SwiftShader) at seed ' + SEED + ' for the six presets perfect, shallow, deep, n12, many and log at their own palettes, ' +
      'plus wide (16:9, grid 144, 144x81 cells, axis on a cell boundary), portrait (4:5, grid 224, n = -1.5) and tir (5:4, grid 160, n = -0.4, 6 of 64 rays removed by total reflection). ' +
      'exportPNG at 2400 px on the longest edge (2400x2400, 2400x1350, 1920x2400, 2400x1920) with every print pixel compared against the paint buffer; the browser field compared word for word with the module run headless in Node and checked against the independent Snell trace. veselago has no exportSVG.',
    criteria: 'Browser field words, metric and cells identical to the Node run; regenerate identical; exact requested PNG dimensions, image/png over 1000 bytes, luminance spread over 12/255 with more than 0.1% of pixels off the background; ' +
      'zero changed field words, metric, extra, cells, buffer size or settings across every export; every print pixel equal to the buffer cell containing its centre (either cell when the centre is exactly on a boundary), all opaque; ' +
      'one colour for every empty field cell and no other colour where the field is empty; zero lit cells off the independently traced rays and every ray segment inking at least 70% of its eligible columns; ' +
      'at n = -1 with the axis on a cell centre, every maximal cell within 2.5 px (x) and 0.5 px (y) of slab0 + 2L - d. Failure controls: a PNG 1 px narrower and a post-export change to one field word and the metric must each be rejected by the one predicate they target.',
    criteriaConstants: PRINT_CRITERIA,
    rows,
    limitations: [
      'Print-path state, dimensions and raster content for nine fixtures at one seed, one browser build and a software renderer; not every control, palette, exposure or hardware.',
      'The plate is a nearest-neighbour magnification of a 128-224 cell field; the print adds pixels, not resolved rays. Colour is not calibrated.',
      'The plate does not depend on the seed (the module creates a generator it never draws from); recorded per fixture.',
      'Lit cells whose weight maps to the empty-cell colour are counted, not hidden: faint single-ray cells can be indistinguishable from the background in the print.',
      'On the 16:9 fixture the axis falls on a cell boundary, the image splits over two rows and the brightest-cell check is not applied there.',
      'No claim about the status label; see tools/veselago-science.js.',
    ],
    environment: { node: process.version, chromium: chromiumVersion, platform: process.platform, playwright: require('playwright/package.json').version },
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/veselago-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({
    pass: true,
    rows: rows.map(r => ({ fixture: r.fixture, cells: r.cells, png: [r.png.width, r.png.height], pixels: r.png.pixels.compared, mismatches: r.png.pixels.mismatches,
      nodeExact: r.node.exact, stray: r.independentTrace.stray, brightest: r.brightest.applies ? [r.brightest.maxDx, r.brightest.maxDy] : null,
      faintLit: [r.buffer.faintLit, r.buffer.lit], seedIndependent: r.seedIndependent, dropped: r.raysDroppedTotalReflection,
      controls: Object.fromEntries(Object.entries(r.failureControls).map(([k, v]) => [k, v.rejected])) })),
    environment: result.environment,
  }, null, 1));
})().catch(error => { console.error(error); process.exitCode = 1; });
