// Chromium print of the Babinet Arago plate.
// The sheet is the painted field. The on-axis identity is the preserved metric, not a bright pixel.
// At the defaults the spot is narrower than a cell, and this check must say so.
//   node tools/arago-print-state.js [--write]
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');

const EMBER = ['#3F3A36', '#8C2F0D', '#F25C05', '#F2A20C', '#FFF3D6'];
const EMBER_BG = '#121110';
const FIXTURES = [
  { name: 'default', grid: 160, aspect: '1:1', radius: 26, z: 0.7, k: 1.35, propagator: 'babinet', view: 'log', exposure: 1.05, poisson: true },
  { name: 'low-fresnel', grid: 96, aspect: '1:1', radius: 10, z: 2.2, k: 0.5, propagator: 'babinet', view: 'log', exposure: 1.05, poisson: true },
  { name: 'legacy', grid: 160, aspect: '1:1', radius: 26, z: 0.7, k: 1.35, propagator: 'pre7', view: 'log', exposure: 1.05, poisson: false },
];

(async () => {
  const root = path.resolve(__dirname, '..');
  const original = fs.readFileSync(path.join(root, 'src/modules/arago.js'), 'utf8');
  const marker = '        async exportPNG(w, h) {';
  assert.equal(original.split(marker).length, 2, 'Expected one arago exportPNG marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!field) throw Error('no field');
          let nonfinite = 0, nearest = Infinity, center = null, inside = 0, insideMax = 0;
          const cx = W / 2, cy = H / 2;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const v = field[y * W + x];
            if (!Number.isFinite(v)) nonfinite++;
            const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
            if (r < nearest) { nearest = r; center = v; }
            if (r < spot) { inside++; if (v > insideMax) insideMax = v; }
          }
          return {
            words: Array.from(new Uint32Array(field.buffer, field.byteOffset, field.length)),
            values: Array.from(field),
            metric, F, spot, which, W, H, nonfinite, nearest, center, inside, insideMax,
            settings: JSON.stringify(host.getState()),
          };
        },
        auditMutate() {
          if (!field) throw Error('no field');
          field[0] = (field[0] || 0) + 1;
          metric = (metric || 0) + 1;
        },
${marker}`);

  function printSize(aspect) {
    const a = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 }[aspect] || 1;
    return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
  }

  const browser = await chromium.launch({ args: glArgs() });
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#arago/arago-print-state');
      await page.evaluate(source);
      for (const fixture of FIXTURES) {
        rows.push(await page.evaluate(async ({ fixture, colors, bg, dims }) => {
          const hexToRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
          const srgbToLinear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          const linearToSrgb = v => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055);
          const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
          function rampOf(palette, background) {
            const stops = [background].concat(palette).map(hexToRgb);
            const n = stops.length;
            const lin = stops.map(c => [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2])]);
            return t => {
              t = clamp(t, 0, 1) * (n - 1);
              const i = Math.min(n - 2, Math.floor(t)), f = t - i;
              return [0, 1, 2].map(ch => linearToSrgb(lin[i][ch] + (lin[i + 1][ch] - lin[i][ch]) * f));
            };
          }
          function paintOf(values, W, H, exposure, logv, ramp) {
            const data = new Uint8ClampedArray(W * H * 4);
            const raw = new Float64Array(values.length);
            let lo = Infinity, hi = -Infinity;
            for (let i = 0; i < values.length; i++) {
              raw[i] = logv ? Math.log(1e-9 + values[i]) : values[i];
              if (raw[i] < lo) lo = raw[i];
              if (raw[i] > hi) hi = raw[i];
            }
            const span = (hi - lo) || 1;
            for (let i = 0; i < values.length; i++) {
              const t = clamp(((raw[i] - lo) / span) * exposure, 0, 1);
              const c = ramp(Number.isFinite(t) ? t : 0);
              const o = i * 4;
              data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
            }
            return data;
          }
          function scaleNearest(data, W, H, w, h) {
            const src = document.createElement('canvas');
            src.width = W; src.height = H;
            src.getContext('2d').putImageData(new ImageData(data, W, H), 0, 0);
            const dst = document.createElement('canvas');
            dst.width = w; dst.height = h;
            const g = dst.getContext('2d', { willReadFrequently: true });
            g.imageSmoothingEnabled = false;
            g.drawImage(src, 0, 0, w, h);
            return g.getImageData(0, 0, w, h).data;
          }
          function channelDelta(a, b) {
            let channels = 0, max = 0;
            for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) {
              channels++;
              max = Math.max(max, Math.abs(a[i] - b[i]));
            }
            return { channels, max };
          }
          function compare(a, b) {
            if (a.words.length !== b.words.length) throw Error('field length changed');
            let changedWords = 0;
            for (let i = 0; i < a.words.length; i++) if (a.words[i] !== b.words[i]) changedWords++;
            return {
              changedWords, words: a.words.length, nonfinite: a.nonfinite + b.nonfinite,
              scalarsChanged: a.metric !== b.metric || a.F !== b.F || a.spot !== b.spot || a.which !== b.which || a.W !== b.W || a.H !== b.H,
              settingsChanged: a.settings !== b.settings,
            };
          }

          const mod = Studio.modules.arago;
          const state = {
            ...mod.defaults, ...fixture, running: false,
            seed: 'arago-print/' + fixture.name,
            palette: colors, bg,
          };
          mod.sanitize(state);
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = 480;
          const instance = mod.create({
            canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
          });
          instance.regenerate();
          const first = instance.auditSnapshot();
          instance.regenerate();
          const replay = compare(first, instance.auditSnapshot());
          if (replay.changedWords || replay.scalarsChanged) throw Error('Deterministic replay failed');

          const before = instance.auditSnapshot();
          const painted = paintOf(before.values, before.W, before.H, state.exposure, state.view === 'log', rampOf(colors, bg));
          const expected = scaleNearest(painted, before.W, before.H, dims.width, dims.height);
          const blob = await instance.exportPNG(dims.width, dims.height);
          const bitmap = await createImageBitmap(blob);
          const read = document.createElement('canvas');
          read.width = bitmap.width; read.height = bitmap.height;
          const rg = read.getContext('2d', { willReadFrequently: true });
          rg.drawImage(bitmap, 0, 0);
          const got = rg.getImageData(0, 0, bitmap.width, bitmap.height).data;
          const pixels = channelDelta(got, expected);
          const png = {
            width: bitmap.width, height: bitmap.height, bytes: blob.size,
            state: compare(before, instance.auditSnapshot()),
            pixels,
            metric: before.metric, F: before.F, spot: before.spot, which: before.which,
            center: before.center, nearest: before.nearest, inside: before.inside, insideMax: before.insideMax,
            cells: [before.W, before.H],
          };
          bitmap.close();

          function preserved(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 1000 &&
              r.state.changedWords === 0 && r.state.nonfinite === 0 && !r.state.scalarsChanged &&
              !r.state.settingsChanged && r.pixels.channels === 0;
          }
          function poisson(r) {
            return preserved(r) && r.which === 'babinet' && Math.abs(r.metric - 1) <= 0.01;
          }
          if (!preserved(png)) throw Error('Export changed the Arago field: ' + JSON.stringify({
            fixture: fixture.name, changed: png.state.changedWords, pixels: png.pixels, metric: png.metric,
          }));
          if (fixture.poisson && !poisson(png)) throw Error('Babinet print missed I(0)/I_open: ' + png.metric);
          if (!fixture.poisson && poisson(png)) throw Error('Legacy cutoff passed the Poisson predicate');
          const narrow = { ...png, width: dims.width - 1 };
          if (preserved(narrow)) throw Error('Wrong PNG dimensions escaped');

          const preMut = instance.auditSnapshot();
          const blob2 = await instance.exportPNG(dims.width, dims.height);
          instance.auditMutate();
          const bitmap2 = await createImageBitmap(blob2);
          const mutated = {
            width: bitmap2.width, height: bitmap2.height, bytes: blob2.size,
            state: compare(preMut, instance.auditSnapshot()),
            pixels, metric: before.metric, which: before.which,
          };
          bitmap2.close();
          if (preserved(mutated) || mutated.state.changedWords === 0) throw Error('Field mutation escaped');

          return {
            fixture: fixture.name,
            propagator: png.which,
            cells: png.cells,
            requested: [dims.width, dims.height],
            metric: png.metric,
            F: png.F,
            spot: png.spot,
            center: png.center,
            nearest: png.nearest,
            inside: png.inside,
            insideMax: png.insideMax,
            png: { width: png.width, height: png.height, bytes: png.bytes, changedWords: png.state.changedWords },
            pixels: png.pixels,
            poisson: poisson(png),
            failureControls: {
              wrongPngDimensionsRejected: !preserved(narrow),
              mutatingExportRejected: !preserved(mutated),
              changedWords: mutated.state.changedWords,
            },
          };
        }, { fixture, colors: EMBER, bg: EMBER_BG, dims: printSize(fixture.aspect) }));
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  const byName = name => rows.find(r => r.fixture === name);
  const def = byName('default'), low = byName('low-fresnel'), legacy = byName('legacy');
  for (const row of rows) {
    assert.equal(row.png.changedWords, 0, row.fixture);
    assert.equal(row.pixels.channels, 0, row.fixture);
    assert.equal(row.failureControls.mutatingExportRejected, true, row.fixture);
    assert(row.failureControls.changedWords > 0, row.fixture);
  }
  assert(def.poisson && Math.abs(def.metric - 1) <= 0.01, def.metric);
  assert(def.spot < 0.1 && def.inside === 0, 'default spot should miss every cell: ' + def.spot);
  assert(def.center < 0.05, 'default center cell should not be the axis sample: ' + def.center);
  assert(def.center < def.metric - 0.5, 'default pixels must not be reported as I(0)');
  assert(low.poisson && low.spot > 1 && low.inside > 0, JSON.stringify(low));
  assert(low.insideMax < 0.5, 'the cell inside the ring is not the on-axis sample: ' + low.insideMax);
  assert(!legacy.poisson && legacy.metric > 1.5, 'legacy metric ' + legacy.metric);
  assert(legacy.propagator === 'pre7');

  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    source: 'src/modules/arago.js',
    sourceSha256: hash(original),
    harnessSha256: hash(fs.readFileSync(__filename)),
    command: 'node tools/arago-print-state.js --write',
    scope: 'Chromium exportPNG at 8 in and 300 ppi for the default Babinet plate, the low-Fresnel corner, and the pre-v7 cutoff of the default plate.',
    criteria: 'Zero changed field words and zero PNG channel differences against an independent paint of the field. Babinet metric within 0.01 of 1. The default spot is narrower than a cell, so the center pixel is not that metric. The pre-v7 cutoff fails the same Poisson predicate. A narrow PNG and a post-export mutation are rejected.',
    rows,
    limitations: 'State preservation and the on-axis metric. The default sheet does not resolve the spot. Not a vector diffraction result, not every slider, not calibrated color.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/arago-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(rows.map(r => ({
    fixture: r.fixture, propagator: r.propagator, cells: r.cells, metric: r.metric, F: r.F, spot: r.spot,
    center: r.center, inside: r.inside, insideMax: r.insideMax, pixels: r.pixels, png: r.png, poisson: r.poisson,
    failureControls: r.failureControls,
  })), null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
