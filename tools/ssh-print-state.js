'use strict';
// Actual ssh exportPNG in Chromium: the browser Float32 plate against an independent Jacobi reference plate,
// print pixels against the W x H buffer they are drawn from, and scientific state preserved across export.
// Not calibrated colour, printer behaviour or printed numerical resolution.
// node tools/ssh-print-state.js [--write]
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ref = require('./lib/ssh-reference');
const { referencePlate } = require('./lib/ssh-plate');

const root = path.resolve(__dirname, '..');
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
function printSize(aspect) {
  const a = ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

// Preset parameters restated here, so a preset that drifts in the module is caught rather than followed.
const PRESETS = {
  topo: { intra: 0.4, w: 1.2, bc: 'open', view: 'int' }, triv: { intra: 1.2, w: 0.4, bc: 'open', view: 'int' },
  ring: { intra: 0.4, w: 1.2, bc: 'periodic', view: 'int' }, edge: { intra: 0.2, w: 1.4, bc: 'open', view: 'int' },
  crit: { intra: 0.9, w: 0.95, bc: 'open', view: 'int' }, log: { intra: 0.35, w: 1.25, bc: 'open', view: 'log' },
};
const fixtures = [
  ...Object.keys(PRESETS).map(preset => ({ name: preset, preset, grid: 96, aspect: '4:5' })),
  ...['topo', 'ring'].flatMap(preset => ['1:1', '16:9'].map(aspect => ({ name: preset + ' ' + aspect, preset, grid: 96, aspect }))),
  { name: 'topo grid 160', preset: 'topo', grid: 160, aspect: '4:5' },
];

// The plate rule rebuilt from independent Jacobi eigenpairs (tools/lib/ssh-plate.js), shared with
// tools/ssh-production.js.
function against(b, R) {
  let fieldMaxError = 0;
  for (let i = 0; i < R.field.length; i++) fieldMaxError = Math.max(fieldMaxError, Math.abs(b.field[i] - R.field[i]));
  if (b.field.length !== R.field.length) fieldMaxError = Infinity;
  return { fieldMaxError, metricError: Math.abs(b.metric - R.metric), midEError: Math.abs(b.midE - R.midE) };
}

const LIMIT = { field: 1e-7, metric: 1e-9, midE: 1e-12, luminanceSpread: 12, bytes: 1000 };
const preserved = s => s.changedWords === 0 && s.nonfinite === 0 && s.bufPixelsChanged === 0 && !s.metricChanged &&
  !s.midEChanged && !s.extraChanged && !s.cellsChanged && !s.settingsChanged && !s.bufChanged;
// The one acceptance predicate every fixture and every failure control goes through, in named parts so a
// control can show which part rejected it.
const checks = {
  dimensions: r => r.export.width === r.requested[0] && r.export.height === r.requested[1] && r.export.bytes > LIMIT.bytes,
  nonblank: r => r.export.nonblank,
  preserved: r => preserved(r.export.state) && preserved(r.replay.sameInstance) && preserved(r.replay.freshInstance),
  reference: r => r.reference.fieldMaxError < LIMIT.field && r.reference.metricError < LIMIT.metric && r.reference.midEError < LIMIT.midE,
  pixels: r => {
    const [W, H] = r.cells, [w, h] = r.requested;
    return r.pixels.cellCentres.compared === W * H && r.pixels.cellCentres.mismatches === 0 &&
      r.pixels.fullRaster.compared === w * h && r.pixels.fullRaster.mismatches === 0 &&
      r.pixels.bufferFromField.compared === W * H && r.pixels.bufferFromField.mismatches === 0;
  },
  bundle: r => r.bundle.pngIdentical === true,
  // The fixture is only the preset's plate if the studio shell hands the module the preset's parameters.
  shellState: r => r.shell.matchesPreset === true,
};
const failed = r => Object.keys(checks).filter(k => !checks[k](r));
const accept = r => failed(r).length === 0;

// Runs in the page, once per fixture.
async function probe({ fixture, dims, minSpread }) {
  const ASPECT = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const mod = Studio.modules.ssh, bundled = window.__bundledSsh, preset = mod.presets[fixture.preset];
  const state = {
    ...mod.defaults, ...preset.p, grid: fixture.grid, aspect: fixture.aspect,
    seed: 'ssh-print-state/' + fixture.name, palette: preset.palette.colors.slice(), bg: preset.palette.bg,
  };
  mod.sanitize(state);
  const make = m => {
    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = Math.round(480 * (ASPECT[state.aspect] || 1));
    return m.create({
      canvas, getState: () => state, setStatus() {}, isActive: () => false,
      reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
    });
  };
  const hex = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  function compare(a, b) {
    if (a.field.length !== b.field.length || a.bufPixels.length !== b.bufPixels.length) throw Error('Field or buffer size changed');
    const x = new Uint32Array(a.field.buffer), y = new Uint32Array(b.field.buffer);
    let changedWords = 0, nonfinite = 0, bufPixelsChanged = 0;
    for (let i = 0; i < x.length; i++) {
      if (x[i] !== y[i]) changedWords++;
      if (!Number.isFinite(a.field[i]) || !Number.isFinite(b.field[i])) nonfinite++;
    }
    for (let i = 0; i < a.bufPixels.length; i += 4) {
      if (a.bufPixels[i] !== b.bufPixels[i] || a.bufPixels[i + 1] !== b.bufPixels[i + 1] || a.bufPixels[i + 2] !== b.bufPixels[i + 2] || a.bufPixels[i + 3] !== b.bufPixels[i + 3]) bufPixelsChanged++;
    }
    return {
      changedWords, nonfinite, words: x.length, bufPixelsChanged,
      metricChanged: a.metric !== b.metric, midEChanged: a.midE !== b.midE, extraChanged: a.extra !== b.extra,
      cellsChanged: JSON.stringify(a.cells) !== JSON.stringify(b.cells), settingsChanged: a.settings !== b.settings,
      bufChanged: JSON.stringify(a.buf) !== JSON.stringify(b.buf),
    };
  }
  async function decode(blob) {
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bitmap, 0, 0);
    bitmap.close();
    return { width: c.width, height: c.height, data: g.getImageData(0, 0, c.width, c.height).data };
  }
  function luminance(data) {
    let lo = 255, hi = 0, finite = 0;
    for (let i = 0; i < data.length; i += 4) {
      const L = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (Number.isFinite(L)) { finite++; if (L < lo) lo = L; if (L > hi) hi = L; }
    }
    return { min: lo, max: hi, spread: hi - lo, finite, samples: data.length / 4 };
  }
  const sameRgb = (a, i, b, j) => a[i] === b[j] && a[i + 1] === b[j + 1] && a[i + 2] === b[j + 2];

  const instance = make(mod);
  instance.regenerate();
  const first = instance.auditSnapshot(), [W, H] = first.cells, { width: w, height: h } = dims;
  const cells = instance.fieldCells();
  instance.regenerate();
  const sameInstance = compare(first, instance.auditSnapshot());
  const fresh = make(mod);
  fresh.regenerate();
  const freshInstance = compare(first, fresh.auditSnapshot());

  const before = instance.auditSnapshot();
  const blob = await instance.exportPNG(w, h);
  const after = instance.auditSnapshot();
  const png = await decode(blob);
  const lum = luminance(png.data);

  // exportPNG draws the W x H buffer at w x h with smoothing off: every print pixel is its cell's buffer pixel.
  const buf = before.bufPixels;
  let centreMismatches = 0, centreCompared = 0, rasterMismatches = 0, rasterCompared = 0;
  if (png.width === w && png.height === h) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = Math.floor((x + 0.5) * w / W), py = Math.floor((y + 0.5) * h / H);
      centreCompared++;
      if (!sameRgb(png.data, (py * w + px) * 4, buf, (y * W + x) * 4)) centreMismatches++;
    }
    for (let py = 0; py < h; py++) {
      const y = Math.floor((py + 0.5) * H / h);
      for (let px = 0; px < w; px++) {
        const x = Math.floor((px + 0.5) * W / w);
        rasterCompared++;
        if (!sameRgb(png.data, (py * w + px) * 4, buf, (y * W + x) * 4)) rasterMismatches++;
      }
    }
  }
  // The buffer is the palette ramp of the snapshot field: the paint rule re-applied with Studio.util.
  const U = Studio.util, ramp = U.makeRamp(state.palette, state.bg), exp = isFinite(state.exposure) && state.exposure > 0 ? state.exposure : 1;
  let lo = Infinity, hi = -Infinity;
  for (const v of before.field) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = (hi - lo) || 1, expected = new Uint8ClampedArray(W * H * 4);
  let fieldMismatches = 0;
  for (let i = 0; i < W * H; i++) {
    let t = (before.field[i] - lo) / span;
    if (state.view === 'log') t = Math.log(1.001 + 9 * Math.max(0, t)) / Math.log(10);
    t = U.clamp(t * exp, 0, 1);
    const c = ramp(isFinite(t) ? t : 0);
    expected[i * 4] = c[0]; expected[i * 4 + 1] = c[1]; expected[i * 4 + 2] = c[2]; expected[i * 4 + 3] = 255;
    if (!sameRgb(expected, i * 4, buf, i * 4) || buf[i * 4 + 3] !== 255) fieldMismatches++;
  }
  const distinct = new Set(new Uint32Array(before.field.slice().buffer)).size;

  // The module as shipped in dist/studio.html, before the audit copy replaced it, prints the same bytes.
  const shipped = make(bundled);
  shipped.regenerate();
  const pngSha256 = await hex(await blob.arrayBuffer()), bundleSha256 = await hex(await (await shipped.exportPNG(w, h)).arrayBuffer());

  // Failure control (a): a PNG requested one pixel narrower.
  const narrowBlob = await instance.exportPNG(w - 1, h), narrow = await decode(narrowBlob);
  // Failure control (b): state mutated after an export.
  const preMut = instance.auditSnapshot();
  await instance.exportPNG(w, h);
  instance.auditMutate();
  const mutated = compare(preMut, instance.auditSnapshot());

  return {
    state: JSON.parse(before.settings), cells: before.cells, fieldCells: cells, buf: before.buf,
    words: Array.from(new Uint32Array(before.field.slice().buffer)), metric: before.metric, midE: before.midE, extra: before.extra,
    distinctFieldWords: distinct, fieldRange: [lo, hi],
    replay: { sameInstance, freshInstance },
    export: {
      width: png.width, height: png.height, bytes: blob.size, pngSha256,
      luminance: lum, nonblank: lum.spread > minSpread && lum.finite === lum.samples, state: compare(before, after),
    },
    pixels: {
      cellCentres: { compared: centreCompared, mismatches: centreMismatches },
      fullRaster: { compared: rasterCompared, mismatches: rasterMismatches },
      bufferFromField: { compared: W * H, mismatches: fieldMismatches },
      bufferLuminance: luminance(buf),
    },
    bundle: { pngSha256: bundleSha256, pngIdentical: bundleSha256 === pngSha256 },
    narrow: { width: narrow.width, height: narrow.height, bytes: narrowBlob.size, luminance: luminance(narrow.data) },
    mutated,
  };
}

(async () => {
  const original = fs.readFileSync(path.join(root, 'src/modules/ssh.js'), 'utf8');
  const dist = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8');
  assert(dist.includes(original), 'dist/studio.html does not contain src/modules/ssh.js; run node tools/build.js');
  const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(original.split(marker).length, 2, 'Expected one ssh export API marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!field || !buf) throw Error('no field');
          return {
            field: field.slice(), metric, midE, extra, W, H, cells: [W, H],
            settings: JSON.stringify(host.getState()), buf: [buf.width, buf.height],
            bufPixels: buf.getContext('2d').getImageData(0, 0, buf.width, buf.height).data,
          };
        },
        auditMutate() {
          if (!field) throw Error('no field');
          field[0] = (field[0] || 0) + 1;
          metric = metric + 1;
        },
${marker}`);

  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const environment = { node: process.version, chromium: browser.version(), playwright: require('playwright/package.json').version, platform: `${process.platform} ${process.arch} ${os.release()}` };
  const measured = [], shell = {};
  let recipeVersion;
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    try {
      // Boot on another tab so the shell creates its ssh instance from the audit copy later, on demand.
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#reuleaux/ssh-print-state');
      await page.waitForFunction(() => { const el = document.querySelector('#seed'); return !!el && el.value === 'ssh-print-state'; }, null, { timeout: 60000, polling: 250 });
      await page.evaluate(() => { window.__bundledSsh = Studio.modules.ssh; });
      await page.evaluate(source);
      assert(await page.evaluate(() => Studio.modules.ssh !== window.__bundledSsh && !!window.__bundledSsh), 'Audit copy did not replace the bundled module');
      for (const fixture of fixtures) measured.push({ fixture, dims: printSize(fixture.aspect), m: await page.evaluate(probe, { fixture, dims: printSize(fixture.aspect), minSpread: LIMIT.luminanceSpread }) });

      // The real shell path: open the tab, pick each preset from the preset menu, and read the state the
      // shell hands the module through host.getState().
      await page.evaluate(() => {
        const mod = Studio.modules.ssh, create = mod.create;
        mod.create = function (host) { window.__sshHost = host; return create.call(this, host); };
        location.hash = '#ssh/ssh-print-state-shell';
      });
      await page.waitForFunction(() => !!window.__sshHost && document.querySelector('#seed').value === 'ssh-print-state-shell', null, { timeout: 60000, polling: 250 });
      recipeVersion = await page.evaluate(() => Studio.recipeVersion);
      for (const preset of Object.keys(PRESETS)) {
        shell[preset] = await page.evaluate(key => {
          const sel = document.querySelector('#preset'); sel.value = key; sel.dispatchEvent(new Event('change', { bubbles: true }));
          const s = window.__sshHost.getState();
          return { intra: s.intra, w: s.w, bc: s.bc, view: s.view, recipe: Studio.getRecipe('ssh') };
        }, preset);
        await page.waitForTimeout(300);
        shell[preset].status = await page.evaluate(() => document.querySelector('#status').innerText.replace(/\s+/g, ' ').trim());
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  const rows = [], failures = [];
  for (const { fixture, dims, m } of measured) {
    const p = PRESETS[fixture.preset], periodic = p.bc === 'periodic';
    for (const k of ['intra', 'w', 'bc', 'view']) assert.equal(m.state[k], p[k], fixture.name + ' preset ' + k);
    assert.equal(m.state.grid, fixture.grid); assert.equal(m.state.aspect, fixture.aspect);
    const [n, H] = m.cells, expectedH = Math.max(48, Math.round(fixture.grid * ASPECTS[fixture.aspect]));
    assert.deepEqual([n, H], [fixture.grid, expectedH], fixture.name + ' cells');
    assert.deepEqual(m.fieldCells, m.cells); assert.deepEqual(m.buf, m.cells);
    const bytes = Buffer.from(Uint32Array.from(m.words).buffer), browserPlate = { field: new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4), metric: m.metric, midE: m.midE };
    const R = referencePlate(ref.sshHamiltonian(n, p.intra, p.w, { periodic }), H, p.intra, p.w);
    // Failure control (c): v and w swapped. On a ring that swap is a one-site translation and leaves the
    // plate unchanged, so the ring also gets a reference whose closing bond is v instead of w.
    const swapped = against(browserPlate, referencePlate(ref.sshHamiltonian(n, p.w, p.intra, { periodic }), H, p.w, p.intra));
    let ringBond = null;
    if (periodic) {
      const Hm = ref.sshHamiltonian(n, p.intra, p.w, { periodic }); Hm[0][n - 1] = Hm[n - 1][0] = p.intra;
      ringBond = against(browserPlate, referencePlate(Hm, H, p.intra, p.w));
    }
    const row = {
      fixture: fixture.name, preset: fixture.preset, grid: fixture.grid, aspect: fixture.aspect, intra: p.intra, w: p.w, bc: p.bc, view: p.view,
      cells: m.cells, requested: [dims.width, dims.height], bufferSize: m.buf, fieldWords: m.words.length, fieldSha256: sha(bytes),
      distinctFieldWords: m.distinctFieldWords, fieldRange: m.fieldRange,
      metric: m.metric, midE: m.midE, extra: m.extra, settings: m.state,
      reference: against(browserPlate, R), replay: m.replay, export: m.export, pixels: m.pixels, bundle: m.bundle,
      shell: { ...shell[fixture.preset], matchesPreset: ['intra', 'w', 'bc', 'view'].every(k => shell[fixture.preset][k] === p[k]) },
    };
    // Each control is caught only if the predicate rejects it through the part the control targets.
    const control = (variant, part, extra) => ({ ...extra, failedChecks: failed(variant), rejected: !accept(variant) && !checks[part](variant) });
    row.failureControls = {
      narrowPng: control({ ...row, export: { ...row.export, width: m.narrow.width, height: m.narrow.height, bytes: m.narrow.bytes } }, 'dimensions',
        { requested: [dims.width - 1, dims.height], decoded: [m.narrow.width, m.narrow.height] }),
      postExportMutation: control({ ...row, export: { ...row.export, state: m.mutated } }, 'preserved',
        { changedWords: m.mutated.changedWords, metricChanged: m.mutated.metricChanged }),
      swappedHoppings: control({ ...row, reference: swapped }, 'reference', swapped),
    };
    if (ringBond) row.failureControls.wrongRingBond = control({ ...row, reference: ringBond }, 'reference', ringBond);
    row.failedChecks = failed(row);
    row.accepted = accept(row);
    rows.push(row);

    const why = [];
    for (const k of row.failedChecks) {
      if (k === 'nonblank') why.push(`blank print: luminance spread ${row.export.luminance.spread.toFixed(2)} (buffer ${row.pixels.bufferLuminance.spread.toFixed(2)}), ${row.distinctFieldWords} distinct field word(s) in the plate`);
      else if (k === 'reference') why.push('reference ' + JSON.stringify(row.reference));
      else if (k === 'pixels') why.push('pixels ' + JSON.stringify(row.pixels));
      else if (k === 'preserved') why.push('state ' + JSON.stringify({ export: row.export.state, replay: row.replay }));
      else if (k === 'shellState') why.push(`the shell hands the module ${JSON.stringify({ intra: row.shell.intra, w: row.shell.w, bc: row.shell.bc, view: row.shell.view })} for preset ${fixture.preset}, not ${JSON.stringify({ intra: p.intra, w: p.w, bc: p.bc, view: p.view })}`);
      else why.push(k + ' check failed');
    }
    const fc = row.failureControls;
    if (!fc.narrowPng.rejected) why.push('1 px narrower PNG not rejected by the dimension check');
    if (!fc.postExportMutation.rejected) why.push('post-export mutation not rejected by the preservation check');
    // Swapping v and w cannot change a ring plate (it is a one-site translation), so on a ring the
    // reference check must instead catch the wrong closing bond.
    if (periodic ? !fc.wrongRingBond.rejected : !fc.swappedHoppings.rejected) why.push('wrong reference plate not rejected by the reference check');
    if (why.length) failures.push(fixture.name + ': ' + why.join('; '));
  }

  // Root causes read from the measurements, stated only when the measurements show them.
  const diagnosis = [];
  if (rows.some(r => !r.shell.matchesPreset && r.shell.intra === recipeVersion && r.shell.intra !== r.intra)) {
    diagnosis.push(`The shell hands the module v = ${recipeVersion} for every preset whose v differs: that is Studio.recipeVersion. The shell sanitize writes the recipe version into state.v after clamping the schema, and the ssh schema also names its intra-cell hopping v, so the hopping is overwritten on every path through the shell sanitize (boot, preset, hash, surprise, reset, undo, settings); recipes carry v = ${recipeVersion} and never the hopping.`);
  }
  if (rows.some(r => !r.export.nonblank && r.distinctFieldWords === 1 && r.pixels.fullRaster.mismatches === 0)) {
    diagnosis.push('Blank prints come from plates with a single distinct Float32 word: on a ring every eigenmode has uniform |psi| (translation plus equal sublattice weight), so hi = lo, the paint span falls back to 1, t = 0 everywhere and every pixel is ramp(0), the background colour. The export reproduces that buffer exactly; the plate itself carries no contrast.');
  }
  const result = {
    pass: failures.length === 0,
    ...(failures.length ? { failures } : {}),
    ...(diagnosis.length ? { diagnosis } : {}),
    // How many fixtures pass each part of the predicate.
    checks: Object.fromEntries(Object.keys(checks).map(k => [k, rows.filter(r => checks[k](r)).length + '/' + rows.length])),
    source: 'src/modules/ssh.js',
    sourceSha256: sha(original),
    harnessSha256: sha(fs.readFileSync(__filename)),
    command: 'node tools/ssh-print-state.js --write',
    scope: 'Actual ssh exportPNG in Chromium at 2400 px on the longest edge for the six presets at grid 96 on 4:5 (1920x2400), topo and ring at grid 96 on 1:1 (2400x2400) and 16:9 (2400x1350), and topo at grid 160 on 4:5 (1920x2400). The module source is src/modules/ssh.js with audit hooks, evaluated over dist/studio.html; the unmodified bundled module prints byte-identical PNGs. The Float32 plate is compared with a reference plate rebuilt in Node from independent Jacobi eigenpairs (tools/lib/ssh-reference.js) with the same row and degenerate-cluster rule. Each preset is also picked from the real studio preset menu to read the state the shell hands the module.',
    criteria: 'Every plate field word within 1e-7 of the reference plate, end weight within 1e-9, mid-gap |E| within 1e-12; exact requested PNG dimensions, more than 1000 bytes and a decoded luminance spread above 12/255; every cell-centre print pixel and every print pixel equal in RGB to the buffer pixel of the cell it maps to under nearest-neighbour scaling; the buffer equal to the palette ramp of the snapshot field; zero changed or nonfinite field words, zero changed buffer pixels, and metric, mid-gap |E|, winding, cells, buffer size and settings unchanged across export and across same-instance and fresh-instance regenerate; the shipped bundled module prints byte-identical PNGs; the studio shell hands the module the preset v, w, bc and view when the preset is picked from its menu. One predicate rejects a PNG requested 1 px narrower, a post-export field[0] and metric mutation, and a reference plate with v and w swapped (on rings, where that swap is a translation, a reference whose closing bond is v instead of w).',
    rows,
    limitations: [
      'Print path and state preservation at the enumerated presets, grids and sheets on SwiftShader Chromium; not calibrated colour, ICC handling, printer output or other hardware.',
      'Printing magnifies a 96 or 160 site chain by 12 to 25 print pixels per cell; the extra pixels carry no additional resolved physics.',
      'The buffer check re-applies the module paint rule with Studio.util.makeRamp; it confirms the buffer is the current field, not that the palette ramp is perceptually uniform.',
      'Degenerate clusters are shown as mean densities; individual rows inside a cluster are not unique and are not claimed.',
    ],
    environment,
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/ssh-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({
    pass: result.pass, failures, diagnosis,
    rows: rows.map(r => ({
      fixture: r.fixture, cells: r.cells.join('x'), png: r.export.width + 'x' + r.export.height, metric: +r.metric.toFixed(6), midE: r.midE.toExponential(2),
      fieldMaxError: r.reference.fieldMaxError.toExponential(2), metricError: r.reference.metricError.toExponential(2),
      lumSpread: +r.export.luminance.spread.toFixed(1), preserved: preserved(r.export.state),
      centres: r.pixels.cellCentres.compared + '/' + r.pixels.cellCentres.mismatches, raster: r.pixels.fullRaster.compared + '/' + r.pixels.fullRaster.mismatches,
      bufferFromField: r.pixels.bufferFromField.mismatches, bundle: r.bundle.pngIdentical, accepted: r.accepted, failedChecks: r.failedChecks,
      controls: Object.fromEntries(Object.entries(r.failureControls).map(([k, c]) => [k, c.rejected + ' ' + c.failedChecks.join('+') + (c.fieldMaxError !== undefined ? ' ' + c.fieldMaxError.toExponential(2) : '')])),
    })),
    environment,
  }, null, 1));
  if (!result.pass) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
