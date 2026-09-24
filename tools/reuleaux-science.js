// node tools/reuleaux-science.js [--write]
// Independent geometry and every-cell checks, then the real 8 in / 300 ppi PNG path.
// Requires Playwright Chromium. See validation/REULEAUX.md for the finite review domain.
'use strict';
const { glArgs } = require('./lib/gl-args');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/reuleaux.js'), 'utf8');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const hooks = {};
new Function('Studio', 'hooks', source.replace('  Studio.register({', '  Object.assign(hooks,{reuleauxBoundary,supportWidth});\n  Studio.register({'))(
  { util: {}, PALETTES: {}, register() {} }, hooks);

// Extremizing a linear functional over an intersection of disks: the maximum is
// at a disk's smooth support point if feasible, or at one of the three corners.
// This does not call or copy the production arc sampler.
function exactSupport(R, angle) {
  const u = [Math.cos(angle), Math.sin(angle)];
  const centers = [[0, -R / Math.sqrt(3)], [R / 2, R / Math.sqrt(12)], [-R / 2, R / Math.sqrt(12)]];
  const candidates = centers.slice();
  for (const c of centers) {
    const p = [c[0] + R * u[0], c[1] + R * u[1]];
    if (centers.every(v => (p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2 <= R * R * (1 + 1e-14))) candidates.push(p);
  }
  return Math.max(...candidates.map(p => p[0] * u[0] + p[1] * u[1]));
}
function geometry() {
  const results = [];
  for (const R of [1, 24, 44, 48, 52, 64, 80]) {
    const points = hooks.reuleauxBoundary(R, 720);
    let maxExactError = 0, maxDeficit = 0, maxOvershoot = 0;
    for (let i = 0; i < 997; i++) {
      const t = 2 * Math.PI * (i + .137) / 997;
      const exact = exactSupport(R, t) + exactSupport(R, t + Math.PI);
      maxExactError = Math.max(maxExactError, Math.abs(exact - R));
      const measured = hooks.supportWidth(points, t);
      maxDeficit = Math.max(maxDeficit, exact - measured);
      maxOvershoot = Math.max(maxOvershoot, measured - exact);
    }
    const bound = 2 * R * (1 - Math.cos(Math.PI / (6 * 720)));
    assert(maxExactError < 1e-12 * R && maxOvershoot < 1e-12 * R);
    assert(maxDeficit <= bound + 1e-12 * R);
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      area += (a[0] * b[1] - a[1] * b[0]) / 2;
    }
    const exactArea = (Math.PI - Math.sqrt(3)) * R * R / 2;
    // Three circular segments omitted by the inscribed chords.
    const delta = Math.PI / (3 * 720);
    const exactPolygonDeficit = 3 * 720 * R * R * (delta - Math.sin(delta)) / 2;
    assert(Math.abs(exactArea - area - exactPolygonDeficit) < 1e-11 * R * R);
    results.push({ R, directions: 997, maxExactError, maxDeficit, maxOvershoot, chordBound: bound,
      polygonArea: area, exactArea, exactPolygonDeficit });
  }
  const bad = [[0, -1 / Math.sqrt(3)], [.5, 1 / Math.sqrt(12)], [-.5, 1 / Math.sqrt(12)]];
  const straightTriangleError = Math.max(...Array.from({ length: 91 }, (_, i) => Math.abs(hooks.supportWidth(bad, i * Math.PI / 91) - 1)));
  assert(straightTriangleError > .1);
  return { results, straightTriangleError };
}

// Executed in the browser against the real module's private field. The only
// instrumentation is a read-only accessor, absent from shipped builds.
function inspectField() {
  const e = Studio.auditInstances().reuleaux, s = e.state, a = e.inst.auditRead();
  const { W, H, field } = a, expected = new Float32Array(W * H);
  let minMembershipMargin = Infinity, roseRoundingMargin = Infinity, roundingSensitivePoints = 0, shiftedFromExactCircle = 0;
  const check = (ok, message) => { if (!ok) throw Error(message); };
  if (s.kind === 'width') {
    // Independent discrete support: project only each arc's closest angular
    // grid point plus its endpoints, rather than sampling the whole boundary.
    const centers = [[0, -s.R / Math.sqrt(3)], [s.R / 2, s.R / Math.sqrt(12)], [-s.R / 2, s.R / Math.sqrt(12)]];
    const starts = [Math.PI / 3, Math.PI, -Math.PI / 3], step = Math.PI / (3 * 720);
    const support = t => {
      let best = -Infinity;
      for (let k = 0; k < 3; k++) {
        const indices = new Set([0, 720]);
        for (let wrap = -2; wrap <= 2; wrap++) {
          const j = Math.round((t + wrap * 2 * Math.PI - starts[k]) / step);
          indices.add(Math.max(0, Math.min(720, j)));
        }
        for (const j of indices) {
          const angle = starts[k] + j * step;
          const value = centers[k][0] * Math.cos(t) + centers[k][1] * Math.sin(t) + s.R * Math.cos(angle - t);
          best = Math.max(best, value);
        }
      }
      return best;
    };
    const radius = .35 * Math.min(W, H);
    const perturbation = radius * 2 * (1 - Math.cos(Math.PI / (6 * 720)));
    for (let i = 0; i < 180; i++) {
      const t = (i + .137) * Math.PI / 180;
      for (const sign of [-1, 1]) {
        const x = W / 2 + sign * radius * Math.cos(t), y = H / 2 + sign * radius * Math.sin(t);
        const margin = Math.min(.5 - Math.abs(x - Math.round(x)), .5 - Math.abs(y - Math.round(y)));
        roseRoundingMargin = Math.min(roseRoundingMargin, margin);
        if (margin <= perturbation) roundingSensitivePoints++;
        const width = support(t) + support(t + Math.PI);
        check(width <= s.R * (1 + 1e-12) && s.R - width <= s.R * perturbation / radius + 1e-12 * s.R, 'independent discrete support bound');
        const sampledRadius = radius * width / s.R;
        const sx = W / 2 + sign * sampledRadius * Math.cos(t), sy = H / 2 + sign * sampledRadius * Math.sin(t);
        if (Math.round(sx) !== Math.round(x) || Math.round(sy) !== Math.round(y)) shiftedFromExactCircle++;
        check(Math.abs(sx - x) <= perturbation + 1e-10 && Math.abs(sy - y) <= perturbation + 1e-10, 'rose displacement bound');
        expected[Math.round(sy) * W + Math.round(sx)] += 2;
      }
    }
  } else {
    const frames = s.kind === 'shape' ? 1 : s.frames;
    // Express each cell in the unrotated body's coordinates, independently of
    // production's rotated vertices and Math.hypot membership test.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x + .5 - W / 2, py = y + .5 - H / 2;
      for (let f = 0; f < frames; f++) {
        const t = f * 2 * Math.PI / (3 * frames), c = Math.cos(t), q = Math.sin(t);
        const X = c * px + q * py, Y = -q * px + c * py;
        const squared = [X * X + (Y + s.R / Math.sqrt(3)) ** 2,
          (X - s.R / 2) ** 2 + (Y - s.R / Math.sqrt(12)) ** 2,
          (X + s.R / 2) ** 2 + (Y - s.R / Math.sqrt(12)) ** 2];
        minMembershipMargin = Math.min(minMembershipMargin, Math.abs(Math.max(...squared) - s.R * s.R));
        if (squared.every(d => d <= s.R * s.R)) expected[y * W + x] += s.kind === 'shape' ? 1 : .35;
      }
    }
    check(minMembershipMargin > 1e-9, 'ambiguous cell on floating-point boundary');
  }
  let mismatches = 0;
  for (let i = 0; i < field.length; i++) if (field[i] !== expected[i]) mismatches++;
  check(mismatches === 0, 'independent finite-field mismatch: ' + mismatches);
  // The comparison must also reject a one-cell corruption.
  const original = expected[0]; expected[0] += 1;
  check(field[0] !== expected[0], 'one-cell corruption control not detected'); expected[0] = original;
  const witness = Studio.getWitness();
  check(witness?.valid === true && witness.measured === a.mean && witness.expected === s.R, 'witness does not match measured boundary');
  check(document.querySelector('#status').textContent.includes('deficit'), 'sampling error hidden in rounding');
  const mayCrop = s.kind !== 'width' && s.R / Math.sqrt(3) > Math.min(W, H) / 2;
  check(document.querySelector('#status').textContent.includes('may be cropped') === mayCrop, 'cropping notice');
  return { W, H, cells: field.length, mismatches, minMembershipMargin: Number.isFinite(minMembershipMargin) ? minMembershipMargin : null,
    roseRoundingMargin: Number.isFinite(roseRoundingMargin) ? roseRoundingMargin : null,
    roundingSensitivePoints, shiftedFromExactCircle, measuredMean: a.mean, expectedWidth: s.R, witnessTolerance: witness.tol, mayCrop, oneCellCorruptionDetected: true };
}

async function main() {
  const numeric = geometry();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-reuleaux-'));
  const portable = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8');
  assert(portable.includes(source), 'build first: portable module differs from maintained source');
  const instrumented = source.replace('      return {\n        aspect',
    '      return {\n        auditRead() { return { W, H, field: Array.from(field), mean: extra, pixels: Array.from(img.data) }; },\n        aspect');
  assert.notEqual(instrumented, source);
  const file = path.join(temp, 'studio.html'); fs.writeFileSync(file, portable.replace(source, instrumented).replace('generatePalette, register, boot,', 'generatePalette, register, auditInstances: () => instances, boot,'));
  const browser = await chromium.launch({ args: glArgs() });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + file + '#reuleaux/review'); await page.evaluate(() => Studio.ready);
    const fixtures = await page.evaluate(() => {
      const mod = Studio.auditInstances().reuleaux.mod, palette = Studio.PALETTES.kiln;
      const base = { ...mod.defaults, ...{ palette: palette.colors, bg: palette.bg } };
      const result = [{ name: 'default', params: base }];
      for (const [name, p] of Object.entries(mod.presets)) result.push({ name, params: { ...base, ...p.p, palette: p.palette.colors, bg: p.palette.bg } });
      for (const [name, p] of [
        ['small-square', { grid: 128, R: 24, frames: 8, kind: 'shape', exposure: .4 }],
        ['cropped-wide', { grid: 128, R: 80, frames: 48, aspect: '16:9', exposure: 2.2 }],
        ['large-portrait', { grid: 224, R: 80, frames: 48, aspect: '4:5', view: 'log' }],
        ['landscape', { grid: 224, R: 24, frames: 8, aspect: '5:4' }],
        ['small-rose', { grid: 128, R: 24, kind: 'width', aspect: '16:9' }],
        ['large-rose', { grid: 224, R: 80, kind: 'width', aspect: '4:5', view: 'log' }]
      ]) result.push({ name, params: { ...base, ...p } });
      return result;
    });
    await page.selectOption('#export-inches', '8'); await page.selectOption('#export-dpi', '300');
    await page.locator('#btn-colophon-edit').click(); await page.locator('#colo-enabled').uncheck(); await page.locator('#colo-close').click();
    const cases = [];
    for (const fixture of fixtures) {
      await page.evaluate(f => { location.hash = 'reuleaux/review-' + f.name + '/' + btoa(JSON.stringify({ ...f.params, v: 2 })); }, fixture);
      await page.waitForFunction(name => Studio.getRecipe()?.seed === 'review-' + name, fixture.name);
      assert.deepEqual(await page.evaluate(keys => Object.fromEntries(keys.map(k => [k, Studio.auditInstances().reuleaux.state[k]])), Object.keys(fixture.params)), fixture.params, 'recipe applies requested fixture');
      const numerical = await page.evaluate(inspectField);
      const before = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), field: Studio.auditInstances().reuleaux.inst.auditRead().field, witness: Studio.getWitness() }));
      await page.locator('#btn-export').click();
      await page.waitForFunction(() => !document.querySelector('#export-img').hidden && !Studio.exportJob);
      const print = await page.evaluate(async () => {
        const img = document.querySelector('#export-img'); await img.decode();
        const a = Studio.auditInstances().reuleaux.inst.auditRead();
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        const pixels = g.getImageData(0, 0, c.width, c.height).data;
        // All native cell centers must reach the sheet unchanged. This samples
        // the interior of each enlarged cell, not resampling its edges.
        let mismatches = 0;
        for (let y = 0; y < a.H; y++) for (let x = 0; x < a.W; x++) {
          const px = Math.floor((x + .5) * c.width / a.W), py = Math.floor((y + .5) * c.height / a.H);
          for (let k = 0; k < 4; k++) if (pixels[(py * c.width + px) * 4 + k] !== a.pixels[(y * a.W + x) * 4 + k]) mismatches++;
        }
        // A one-cell displaced print must fail this same center comparison.
        let shiftedMismatches = 0;
        for (let y = 0; y < a.H; y++) for (let x = 1; x < a.W; x++) {
          const px = Math.floor((x + .5) * c.width / a.W), py = Math.floor((y + .5) * c.height / a.H);
          if (pixels[(py * c.width + px) * 4] !== a.pixels[(y * a.W + x - 1) * 4]) shiftedMismatches++;
        }
        return { width: c.width, height: c.height, nativeWidth: a.W, nativeHeight: a.H,
          comparedCells: a.W * a.H, channelMismatches: mismatches, shiftedPrintMismatches: shiftedMismatches };
      });
      assert.equal(Math.max(print.width, print.height), 2400);
      assert.equal(print.channelMismatches, 0, fixture.name + ' printed field');
      assert(print.shiftedPrintMismatches > 0, 'displaced print failure control');
      const after = await page.evaluate(() => JSON.stringify({ recipe: Studio.getRecipe(), field: Studio.auditInstances().reuleaux.inst.auditRead().field, witness: Studio.getWitness() }));
      assert.equal(after, before, fixture.name + ' export mutates science');
      cases.push({ ...fixture, numerical, print, exportPreservesState: true });
      console.log('PASS', fixture.name, numerical.cells, 'cells;', print.width + 'x' + print.height, 'print');
      await page.locator('#export-close').click();
    }
    const missingDiskControl = await page.evaluate(({ source, instrumented, params }) => {
      const state = { ...params, kind: 'shape', seed: 'negative-control' };
      const make = text => {
        let mod;
        new Function('Studio', text)({ util: Studio.util, PALETTES: Studio.PALETTES, register: m => { mod = m; } });
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 192;
        const instance = mod.create({ canvas, getState: () => state, setStatus() {}, setWitness() {} });
        instance.regenerate(); return instance.auditRead().field;
      };
      const marker = 'return d0 <= R && d1 <= R && d2 <= R;';
      if (!source.includes(marker)) throw Error('missing-disk mutation marker moved');
      const good = make(instrumented), bad = make(instrumented.replace(marker, 'return d0 <= R && d1 <= R;'));
      return good.reduce((n, value, i) => n + (value !== bad[i] ? 1 : 0), 0);
    }, { source, instrumented, params: fixtures.find(f => f.name === 'shape').params });
    assert(missingDiskControl > 0, 'omitting the third disk must fail the field oracle');
    assert.deepEqual(errors, []);
    const result = { scope: 'Finite listed recipes only; exact continuous geometry, sampled boundary, native field and caption-free PNG cell-center preservation. No rolling physics, pixel-edge exact-width, arbitrary settings or printer calibration claim.',
      sourceSha256: sha(source), engineSha256: sha(fs.readFileSync(path.join(root, 'src/shared/engine.js'))),
      environment: { node: process.version, chromium: browser.version(), platform: process.platform },
      geometry: numeric, missingDiskMutationChangedCells: missingDiskControl, cases, pageErrors: errors };
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/reuleaux-science.json'), JSON.stringify(result, null, 2) + '\n');
    console.log('PASS Reuleaux independent geometry, ' + cases.length + ' field/print cases and negative controls.');
  } finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
