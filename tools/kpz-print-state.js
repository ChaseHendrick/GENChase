'use strict';
// Actual kpz exportPNG/exportSVG print path: the browser build tied to the Node replay, the state preserved
// across export, exact print dimensions, and every Interfaces-view SVG vertex against column heights recorded
// during an independent Node deposition. Print evidence, not a numerical claim about the growth exponent.
// Setup: npm install --no-save --package-lock=false playwright@1.56.1
// node tools/kpz-print-state.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const { replay, makeRng, PRESETS } = require('./kpz-production.js');

const root = path.resolve(__dirname, '..');
const original = fs.readFileSync(path.join(root, 'src/modules/kpz.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const bytes = ta => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength);
const SEED = 'kardar-1986';
const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
function printSize(aspect) {
  const a = ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

// Read-only hooks before the aspect line of the returned API: a full copy of the scientific state, the build
// flag to wait on, and a deliberate mutation for the failure control.
const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
assert.equal(original.split(marker).length, 2, 'Expected one kpz export API marker');
const source = original.replace(marker, `        auditSnapshot() {
          return {
            cell: cell ? cell.slice() : null, h: h ? h.slice() : null, widths: widths.map(p => p.slice()),
            betaFit, pointsUsed, wFinal, nPart, target, W, H, radial, building,
            perim: perim ? perim.length : null, nPerim, snaps: snaps ? snaps.length : null,
            settings: JSON.stringify(host.getState()),
          };
        },
        auditBuilding() { return building; },
        auditMutate(i) { cell[i] = cell[i] + 1; h[0] = h[0] + 1; },
${marker}`);

// The interface schedule the Interfaces view promises: k = 1..n, n = max(2, lines), T = max(1, floor(frac nPart)).
function interfaceTimes(nPart, lines, logTime) {
  const n = Math.max(2, lines), Ts = [];
  for (let k = 1; k <= n; k++) {
    const frac = logTime ? Math.pow(nPart, k / n) / nPart : k / n;
    Ts.push(Math.max(1, Math.floor(frac * nPart)));
  }
  return Ts;
}

// Independent column deposition, one particle at a time, stopped at the particle count the module reports
// (so it needs none of the block or stopping logic) and recording every column height after exactly T
// deposited particles. It also counts any deposit that does not raise its column, which would break the
// reconstruction of an interface from the deposit. A run that reaches the lattice top first is incomplete.
function depositWithSnapshots(state, nFinal, Ts) {
  const W = state.cols, H = Math.max(64, Math.round(W * (ASPECTS[state.aspect] || 1))), top = H - 2;
  const rng = makeRng(state.seed + '/kpz'), cell = new Int32Array(W * H), h = new Int32Array(W);
  const want = new Map();
  Ts.forEach((T, i) => { if (!want.has(T)) want.set(T, []); want.get(T).push(i); });
  const heights = new Array(Ts.length);
  const L = x => (x === 0 ? W - 1 : x - 1), R = x => (x === W - 1 ? 0 : x + 1);
  let n = 0, draws = 0, rejected = 0, notRaised = 0, aboveLattice = 0, reachedTop = false;
  while (n < nFinal) {
    const x = Math.floor(rng() * W); draws++;
    let col = x, y;
    if (state.model === 'random') y = h[x] + 1;
    else if (state.model === 'ballistic') y = Math.max(h[x] + 1, h[L(x)], h[R(x)]);
    else if (state.model === 'relax') {
      if (h[L(x)] < h[col]) col = L(x);
      if (h[R(x)] < h[col]) col = R(x);
      y = h[col] + 1;
    } else if (state.model === 'rsos') {
      y = h[x] + 1;
      if (y - h[L(x)] > 1 || y - h[R(x)] > 1) { rejected++; continue; }
    } else throw Error('not a column model: ' + state.model);
    if (state.model !== 'relax' && y > top) { reachedTop = true; break; }
    if (y >= H) aboveLattice++;
    if (y <= h[col]) notRaised++;
    if (y < H) cell[y * W + col] = n + 1;
    n++; h[col] = y;
    if (want.has(n)) for (const i of want.get(n)) heights[i] = h.slice();
  }
  return { cell, h, heights, W, H, draws, rejected, notRaised, aboveLattice, reachedTop, complete: n === nFinal };
}

// In the actual deposit, the particle numbers in every column must rise with height. That is the property that
// makes "highest cell with number <= T" equal to the column height at time T.
function columnOrderViolations(cell, W, H) {
  let bad = 0;
  for (let x = 0; x < W; x++) {
    let last = 0;
    for (let y = 0; y < H; y++) {
      const v = cell[y * W + x];
      if (v > 0) { if (v <= last) bad++; last = v; }
    }
  }
  return bad;
}

const round2 = v => Math.round(v * 100) / 100;
function expectedPolylines(heights, W, H, w, hgt, margin) {
  const ox = w * margin, oy = hgt * margin, pw = w * (1 - 2 * margin), ph = hgt * (1 - 2 * margin);
  return heights.map(hT => Array.from(hT, (y, x) => [round2(ox + pw * (x + 0.5) / W), round2(oy + ph * (1 - (y + 0.5) / H))]));
}
function parseSvg(text) {
  const tag = /<svg\b[^>]*>/.exec(text);
  assert(tag, 'SVG has no root element');
  const attr = (s, name) => { const m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(s); return m ? m[1] : null; };
  const polylines = [...text.matchAll(/<polyline\b([^>]*?)\/>/g)].map(m => ({
    stroke: attr(m[1], 'stroke'),
    points: (attr(m[1], 'points') || '').trim().split(/\s+/).filter(Boolean).map(p => p.split(',').map(Number)),
  }));
  return { width: Number(attr(tag[0], 'width')), height: Number(attr(tag[0], 'height')), viewBox: attr(tag[0], 'viewBox'), polylines };
}
function compareVertices(parsed, expected) {
  let vertices = 0, mismatches = 0, maxAbsError = 0, shapeMismatch = parsed.polylines.length !== expected.length;
  expected.forEach((line, k) => {
    const got = parsed.polylines[k] ? parsed.polylines[k].points : [];
    if (got.length !== line.length) shapeMismatch = true;
    for (let i = 0; i < Math.min(got.length, line.length); i++) {
      vertices++;
      if (got[i].length !== 2) { shapeMismatch = true; continue; }
      for (let j = 0; j < 2; j++) {
        const e = Math.abs(got[i][j] - line[i][j]);
        if (!(e === 0)) mismatches++;
        maxAbsError = Number.isFinite(e) ? Math.max(maxAbsError, e) : Infinity;
      }
    }
  });
  return { polylines: parsed.polylines.length, verticesCompared: vertices, coordinatesCompared: 2 * vertices, mismatches, maxAbsError, shapeMismatch };
}
const acceptSvg = (r, dims, n, W) => r.width === dims.width && r.height === dims.height && r.viewBox === '0 0 ' + dims.width + ' ' + dims.height &&
  r.parseOk && r.domPolylines === n && r.vertices.polylines === n && !r.vertices.shapeMismatch && r.vertices.verticesCompared === n * W &&
  r.vertices.mismatches === 0 && r.vertices.maxAbsError === 0 && r.statePreserved;

const widthError = (a, b) => a.length !== b.length ? Infinity : Math.max(0, ...a.map((p, i) => Math.max(Math.abs(p[0] - b[i][0]), Math.abs(p[1] - b[i][1]))));
const countDiff = (a, b) => { if (a.length !== b.length) return Infinity; let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };
const heightDecreases = heights => {
  let d = 0;
  for (let k = 1; k < heights.length; k++) for (let x = 0; x < heights[k].length; x++) if (heights[k][x] < heights[k - 1][x]) d++;
  return d;
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const chromiumVersion = browser.version();
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#kpz/kpz-print-state');
      await page.evaluate(source);
      for (const name of Object.keys(PRESETS)) {
        const preset = await page.evaluate(name => Studio.modules.kpz.presets[name] && Studio.modules.kpz.presets[name].p, name);
        assert(preset, 'kpz.js has no preset ' + name);
        const aspect = preset.aspect || '1:1', dims = printSize(aspect);
        const b = await page.evaluate(async ({ name, seed, dims }) => {
          const mod = Studio.modules.kpz, pre = mod.presets[name];
          const state = { ...mod.defaults, ...pre.p, palette: pre.palette.colors.slice(), bg: pre.palette.bg, seed };
          mod.sanitize(state);
          const instanceAspect = dims.height / dims.width;
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = Math.round(480 * instanceAspect);
          const instance = mod.create({
            canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
          });
          async function grow() {
            instance.regenerate();
            const t0 = performance.now();
            while (instance.auditBuilding()) {
              if (performance.now() - t0 > 300000) throw Error('kpz build did not finish');
              await new Promise(r => setTimeout(r, 10));
            }
            return instance.auditSnapshot();
          }
          const words = (x, y) => { if (!x || !y || x.length !== y.length) return Infinity; let d = 0; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) d++; return d; };
          function compare(a, c) {
            const wa = a.widths.flat(), wc = c.widths.flat();
            return {
              cellWordsChanged: words(a.cell, c.cell), heightWordsChanged: words(a.h, c.h),
              widthValuesChanged: wa.length !== wc.length ? Infinity : wa.filter((v, i) => !Object.is(v, wc[i])).length,
              betaFitChanged: !Object.is(a.betaFit, c.betaFit),
              scalarsChanged: ['nPart', 'target', 'W', 'H', 'wFinal', 'pointsUsed', 'radial', 'building', 'perim', 'nPerim', 'snaps'].filter(k => !Object.is(a[k], c[k])),
              settingsChanged: a.settings !== c.settings,
            };
          }
          const preserved = c => c.cellWordsChanged === 0 && c.heightWordsChanged === 0 && c.widthValuesChanged === 0 &&
            !c.betaFitChanged && c.scalarsChanged.length === 0 && !c.settingsChanged;
          const lumOf = hex => { const v = parseInt(hex.slice(1), 16); return 0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255); };
          function luminance(bitmap) {
            // Every pixel of the print, not a reduced copy.
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
          async function png(w, hgt, afterExport) {
            const before = instance.auditSnapshot();
            const blob = await instance.exportPNG(w, hgt);
            if (afterExport) afterExport(before);
            const diff = compare(before, instance.auditSnapshot());
            const bitmap = await createImageBitmap(blob);
            const lum = luminance(bitmap);
            const r = { requested: [w, hgt], width: bitmap.width, height: bitmap.height, bytes: blob.size, type: blob.type,
              luminance: lum, nonblank: lum.spread > 12 && lum.inkFraction > 0.001 && lum.finite === lum.samples, state: diff };
            bitmap.close();
            r.dimensionsMatch = dimensionsMatch(r);
            r.statePreserved = preserved(diff);
            r.accepted = acceptPng(r);
            return r;
          }
          function b64(ta) {
            const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
            let s = '';
            for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
            return btoa(s);
          }

          const first = await grow();
          const again = await grow();
          const replayState = compare(first, again);

          const pngRow = await png(dims.width, dims.height);
          const narrow = await png(dims.width - 1, dims.height);

          const beforeSvg = instance.auditSnapshot();
          let svgText = null, svgError = null, parseOk = null, domPolylines = null;
          try {
            const out = instance.exportSVG(dims.width, dims.height);
            svgText = typeof out === 'string' ? out : await out.text();
            const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
            parseOk = !doc.querySelector('parsererror') && doc.documentElement.nodeName === 'svg';
            domPolylines = doc.querySelectorAll('polyline').length;
          } catch (e) { svgError = String(e && e.message); }
          const svgState = compare(beforeSvg, instance.auditSnapshot());
          const exportsState = compare(first, instance.auditSnapshot());

          // Failure control: a real export followed by a one-word change to the deposit and to column 0.
          const mutateAt = first.h[first.W >> 1] * first.W + (first.W >> 1);
          const mutated = await png(dims.width, dims.height, () => instance.auditMutate(mutateAt));

          // The interface schedule as the page's own Math.pow evaluates it, to compare with Node's.
          const n = Math.max(2, state.lines), pageTs = [];
          for (let k = 1; k <= n; k++) pageTs.push(Math.max(1, Math.floor((state.logTime ? Math.pow(first.nPart, k / n) / first.nPart : k / n) * first.nPart)));

          const pal = Object.keys(Studio.PALETTES).find(k => Studio.PALETTES[k] === pre.palette) || null;
          return {
            state: { model: state.model, cols: state.cols, fill: state.fill, aspect: state.aspect, view: state.view, bands: state.bands,
              lines: state.lines, lw: state.lw, logTime: state.logTime, void: state.void, margin: state.margin, grain: state.grain,
              shift: state.shift, palette: pal, bg: state.bg, seed: state.seed },
            settings: first.settings,
            snap: { cellB64: b64(first.cell), h: Array.from(first.h), widths: first.widths, betaFit: first.betaFit, pointsUsed: first.pointsUsed,
              wFinal: first.wFinal, nPart: first.nPart, W: first.W, H: first.H, radial: first.radial },
            deterministicReplay: { ...replayState, identical: preserved(replayState) },
            png: pngRow, narrow, mutated, mutateAt,
            svg: { text: svgText, error: svgError, parseOk, domPolylines, state: svgState, statePreserved: preserved(svgState) },
            allExportsPreserved: preserved(exportsState), exportsState, pageTs,
          };
        }, { name, seed: SEED, dims });

        // Node: the fixture is the preset the production harness replays, at the default seed.
        const st = b.state, ref = PRESETS[name];
        for (const k of ['model', 'cols', 'fill', 'aspect']) assert.equal(st[k], ref[k], name + ' preset ' + k + ' differs from tools/kpz-production.js');
        assert.equal(st.seed, SEED);
        const u8 = new Uint8Array(Buffer.from(b.snap.cellB64, 'base64'));
        const cell = new Int32Array(u8.buffer), h = Int32Array.from(b.snap.h);
        const r = replay({ ...ref, seed: SEED });
        const replayCmp = {
          cells: [b.snap.W, b.snap.H], replayCells: [r.W, r.H],
          cellWordsDiffering: countDiff(cell, r.cell), heightsDiffering: countDiff(h, r.h),
          widthSamples: b.snap.widths.length, widthSampleError: widthError(b.snap.widths, r.widths),
          betaError: b.snap.betaFit === null || r.beta === null ? null : Math.abs(b.snap.betaFit - r.beta),
          wFinalError: Math.abs(b.snap.wFinal - r.wFinal), particlesDiffer: b.snap.nPart !== r.nPart, pointsUsedDiffer: b.snap.pointsUsed !== r.pointsUsed,
          particlesAboveLattice: r.outside,
        };
        replayCmp.exact = replayCmp.cells[0] === r.W && replayCmp.cells[1] === r.H && replayCmp.cellWordsDiffering === 0 && replayCmp.heightsDiffering === 0 &&
          replayCmp.widthSampleError < 1e-12 && replayCmp.betaError !== null && replayCmp.betaError < 1e-12 && replayCmp.wFinalError < 1e-12 &&
          !replayCmp.particlesDiffer && !replayCmp.pointsUsedDiffer && r.outside === 0;
        const snapshot = {
          cellSha256: sha(bytes(cell)), replayCellSha256: sha(bytes(r.cell)), hSha256: sha(bytes(h)), widthsSha256: sha(JSON.stringify(b.snap.widths)),
          settingsSha256: sha(b.settings), betaFit: b.snap.betaFit, nPart: b.snap.nPart, W: b.snap.W, H: b.snap.H,
        };

        // Node: independent deposition with the column heights recorded at the interface times.
        const Ts = interfaceTimes(b.snap.nPart, st.lines, st.logTime);
        const d = depositWithSnapshots({ ...ref, seed: SEED }, b.snap.nPart, Ts);
        const monotone = {
          deposits: b.snap.nPart, draws: d.draws, rejected: d.rejected, complete: d.complete,
          depositsNotRaisingColumn: d.notRaised, productionColumnOrderViolations: columnOrderViolations(cell, b.snap.W, b.snap.H),
          interfaceHeightDecreases: d.complete ? heightDecreases(d.heights) : null, aboveLattice: d.aboveLattice,
          depositMatchesProduction: countDiff(d.cell, cell) === 0 && countDiff(d.h, h) === 0,
          lastInterfaceIsFinalHeight: d.complete && countDiff(d.heights[d.heights.length - 1], h) === 0,
        };
        monotone.ok = d.complete && monotone.depositsNotRaisingColumn === 0 && monotone.productionColumnOrderViolations === 0 &&
          monotone.interfaceHeightDecreases === 0 && monotone.aboveLattice === 0 && monotone.depositMatchesProduction && monotone.lastInterfaceIsFinalHeight;

        const row = {
          fixture: name, ...st, requested: [dims.width, dims.height],
          cells: [b.snap.W, b.snap.H], particles: b.snap.nPart, betaFit: b.snap.betaFit, pointsUsed: b.snap.pointsUsed, wFinal: b.snap.wFinal,
          snapshot, replay: replayCmp, deterministicReplay: b.deterministicReplay, monotone,
          png: b.png, allExportsPreserved: b.allExportsPreserved, exportsState: b.exportsState,
        };

        const n = Math.max(2, st.lines);
        if (st.view === 'rings') {
          assert.equal(b.svg.error, null, 'rings exportSVG threw: ' + b.svg.error);
          assert.deepEqual(b.pageTs, Ts, 'interface schedule differs between the page and Node');
          const parsed = parseSvg(b.svg.text);
          // Without a complete independent deposition there are no expected heights, and nothing is accepted.
          const heights = d.complete ? d.heights : d.heights.map(() => new Int32Array(0));
          const svg = { width: parsed.width, height: parsed.height, viewBox: parsed.viewBox, bytes: Buffer.byteLength(b.svg.text),
            parseOk: b.svg.parseOk, domPolylines: b.svg.domPolylines, interfaceTimes: Ts,
            vertices: compareVertices(parsed, expectedPolylines(heights, b.snap.W, b.snap.H, dims.width, dims.height, st.margin)),
            state: b.svg.state, statePreserved: b.svg.statePreserved };
          svg.accepted = acceptSvg(svg, dims, n, b.snap.W);
          // Failure control: one interface drawn one cell higher than the deposit had it.
          const shiftK = n >> 1;
          const shifted = { ...svg, vertices: compareVertices(parsed, expectedPolylines(heights.map((hT, k) => (k === shiftK ? hT.map(y => y + 1) : hT)),
            b.snap.W, b.snap.H, dims.width, dims.height, st.margin)) };
          row.svg = svg;
          row.svgShiftControl = { polyline: shiftK, T: Ts[shiftK], mismatches: shifted.vertices.mismatches, maxAbsError: shifted.vertices.maxAbsError, rejected: !acceptSvg(shifted, dims, n, b.snap.W) };
        } else {
          row.svg = { throws: b.svg.error !== null, error: b.svg.error, state: b.svg.state, statePreserved: b.svg.statePreserved };
        }
        row.failureControls = {
          narrowPng: { requested: b.narrow.requested, width: b.narrow.width, height: b.narrow.height, dimensionsMatch: b.narrow.dimensionsMatch,
            nonblank: b.narrow.nonblank, statePreserved: b.narrow.statePreserved, rejected: !b.narrow.accepted },
          mutationAfterExport: { index: b.mutateAt, cellWordsChanged: b.mutated.state.cellWordsChanged, heightWordsChanged: b.mutated.state.heightWordsChanged,
            dimensionsMatch: b.mutated.dimensionsMatch, nonblank: b.mutated.nonblank, statePreserved: b.mutated.statePreserved, rejected: !b.mutated.accepted },
          ...(row.svgShiftControl ? { svgShiftedInterface: row.svgShiftControl } : {}),
        };
        delete row.svgShiftControl;
        console.error(name, JSON.stringify({ cells: row.cells, particles: row.particles, betaFit: row.betaFit, exact: replayCmp.exact, png: [b.png.width, b.png.height, b.png.accepted],
          svg: row.svg.vertices ? [row.svg.vertices.verticesCompared, row.svg.vertices.maxAbsError, row.svg.accepted] : row.svg.error }));
        rows.push(row);
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    const tag = row.fixture;
    assert(row.replay.exact, tag + ': browser build differs from the Node replay ' + JSON.stringify(row.replay));
    assert.equal(row.snapshot.cellSha256, row.snapshot.replayCellSha256, tag + ': cell hash');
    assert(row.deterministicReplay.identical, tag + ': regenerate is not deterministic');
    assert(row.monotone.ok, tag + ': deposition order ' + JSON.stringify(row.monotone));
    assert(row.png.accepted, tag + ': PNG rejected ' + JSON.stringify(row.png));
    assert.deepEqual([row.png.width, row.png.height], row.requested);
    assert(row.allExportsPreserved, tag + ': exports changed the state ' + JSON.stringify(row.exportsState));
    // Each control must be rejected by the one predicate it targets, with every other check still passing.
    const nw = row.failureControls.narrowPng;
    assert(nw.rejected && !nw.dimensionsMatch && nw.width === row.requested[0] - 1 && nw.height === row.requested[1], tag + ': narrow PNG escaped ' + JSON.stringify(nw));
    assert(nw.statePreserved && nw.nonblank, tag + ': narrow export failed for another reason ' + JSON.stringify(nw));
    const m = row.failureControls.mutationAfterExport;
    assert(m.rejected && !m.statePreserved && m.cellWordsChanged === 1 && m.heightWordsChanged === 1, tag + ': mutation escaped ' + JSON.stringify(m));
    assert(m.dimensionsMatch && m.nonblank, tag + ': mutated export failed for another reason ' + JSON.stringify(m));
    if (row.view === 'rings') {
      assert(row.svg.accepted, tag + ': SVG rejected ' + JSON.stringify({ ...row.svg, interfaceTimes: undefined }));
      assert.equal(row.svg.vertices.verticesCompared, Math.max(2, row.lines) * row.cells[0]);
      const c = row.failureControls.svgShiftedInterface;
      assert(c.rejected && c.mismatches === row.cells[0], tag + ': shifted interface escaped ' + JSON.stringify(c));
    } else {
      assert(row.svg.throws && row.svg.error === 'raster view', tag + ': raster view exported SVG ' + JSON.stringify(row.svg));
      assert(row.svg.statePreserved, tag + ': failed SVG export changed the state');
    }
  }
  assert(rows.some(r => r.view === 'rings'), 'no Interfaces fixture');

  const result = {
    pass: true,
    source: 'src/modules/kpz.js',
    sourceSha256: sha(original),
    engineSha256: sha(engine),
    harnessSha256: sha(fs.readFileSync(__filename)),
    replayHarness: 'tools/kpz-production.js',
    replayHarnessSha256: sha(fs.readFileSync(path.join(__dirname, 'kpz-production.js'))),
    command: 'node tools/kpz-print-state.js --write',
    setup: 'npm install --no-save --package-lock=false playwright@1.56.1',
    scope: 'Actual kpz.js in dist/studio.html (Chromium, SwiftShader) for the six column presets kpz, ew, rd, rsos, rings and wide at seed kardar-1986 with each preset\'s own paint settings and palette. ' +
      'The browser build (cell, column heights, width samples, fitted exponent, particle count, lattice) is compared with the independent Node replay in tools/kpz-production.js. ' +
      'exportPNG at 2400 px on the longest edge (2400x2400; 2400x1350 for 16:9) with the full state compared before and after; exportSVG of the Interfaces view (rings) with every polyline vertex compared against column heights recorded during an independent Node deposition at the interface times; ' +
      'exportSVG refused for the strata and both views. Eden is excluded.',
    criteria: 'Cell words, column heights, particle count and lattice identical to the Node replay and width samples, final width and fitted exponent within 1e-12; regenerate identical; ' +
      'exact requested PNG dimensions, image/png over 1000 bytes, luminance spread over 12/255 with more than 0.1% of pixels off the background; zero changed cell, height or width words, fitted exponent, scalars or settings across every export; ' +
      'Interfaces SVG exactly 2400x2400 with max(2, lines) polylines of one vertex per column, every vertex equal to round2(ox + pw (x + 0.5)/W), round2(oy + ph (1 - (h_T[x] + 0.5)/H)) with zero error; ' +
      'no deposit that fails to raise its column, particle numbers rising with height in every production column, and interface heights nondecreasing in T; exportSVG throws "raster view" for strata and both. ' +
      'Failure controls: a PNG requested 1 px narrower, a post-export change to one cell and to h[0], and one interface shifted by one cell must each be rejected by the same predicate.',
    rows,
    limitations: [
      'Print-path state, dimensions and SVG vertex geometry for six presets at one seed, one browser build and a software renderer; not every aspect, lattice width, fill, palette, seed or hardware.',
      'The raster strata and the lines drawn over them in the both view are checked for dimensions, nonblank output and state preservation only; PNG pixels are not compared cell by cell with the lattice and colour is not calibrated.',
      'The vertex check covers the ballistic Interfaces preset only; the lines drawn over the strata in the both view are raster and are not compared vertex by vertex.',
      'An interface reconstructed from the deposit is exact only while every deposit raises its column inside the lattice, which holds at all six presets. The relaxation rule has no top check, so a thin lattice near full fill can deposit above the last row (recorded in tools/kpz-production.js); that setting is outside this domain.',
      'No claim about the growth exponent; see tools/kpz-production.js and tools/kpz-science.js for the numerical evidence. Eden is excluded.',
    ],
    environment: { node: process.version, chromium: chromiumVersion, platform: process.platform, playwright: require('playwright/package.json').version },
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/kpz-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({
    pass: true,
    rows: rows.map(r => ({ fixture: r.fixture, view: r.view, cells: r.cells, particles: r.particles, betaFit: r.betaFit, replayExact: r.replay.exact,
      png: [r.png.width, r.png.height], statePreserved: r.allExportsPreserved,
      svg: r.svg.vertices ? { vertices: r.svg.vertices.verticesCompared, maxAbsError: r.svg.vertices.maxAbsError } : r.svg.error,
      controls: Object.fromEntries(Object.entries(r.failureControls).map(([k, v]) => [k, v.rejected])) })),
    environment: result.environment,
  }, null, 1));
})().catch(error => { console.error(error); process.exitCode = 1; });
