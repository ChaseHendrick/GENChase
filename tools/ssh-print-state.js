// SSH exportPNG keeps the eigenmode field. Not a new spectral check.
// node tools/ssh-print-state.js [--write]
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');

function printSize(aspect) {
  const a = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 }[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const original = fs.readFileSync(path.join(root, 'src/modules/ssh.js'), 'utf8');
  const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(original.split(marker).length, 2, 'Expected one ssh export API marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!field) throw Error('no field');
          return {
            field: field.slice(),
            endWeight: mid.endWeight, energy: mid.energy,
            cells: [W, H], settings: JSON.stringify(host.getState()),
          };
        },
        auditMutate() {
          field[0] = (field[0] || 0) + 1;
          mid.endWeight = (mid.endWeight || 0) + 1;
        },
${marker}`);
  const fixtures = [
    { name: 'topo', aspect: '4:5', overlay: { vIntra: 0.4, w: 1.2, bc: 'open' } },
    { name: 'triv', aspect: '4:5', overlay: { vIntra: 1.2, w: 0.4, bc: 'open' } },
  ];
  const browser = await chromium.launch({ args: glArgs() });
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#ssh/ssh-print-state');
      await page.evaluate(source);
      for (const fixture of fixtures) {
        const dims = printSize(fixture.aspect);
        rows.push(await page.evaluate(async ({ fixture, dims }) => {
          const mod = Studio.modules.ssh;
          const pal = Studio.PALETTES[mod.defaultPalette];
          const state = { ...mod.defaults, ...fixture.overlay, aspect: fixture.aspect, seed: 'ssh-print/' + fixture.name, palette: pal.colors, bg: pal.bg };
          mod.sanitize(state);
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = 600;
          const instance = mod.create({
            canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
          });
          instance.regenerate();
          const expectedH = Math.max(48, Math.round(state.grid * 1.25));
          const cells = instance.fieldCells();
          if (!cells || cells[0] !== state.grid || cells[1] !== expectedH) throw Error('Grid: ' + JSON.stringify(cells));
          function compare(a, b) {
            const x = new Uint32Array(a.field.buffer), y = new Uint32Array(b.field.buffer);
            let changedWords = 0, nonfinite = 0;
            for (let i = 0; i < a.field.length; i++) {
              if (x[i] !== y[i]) changedWords++;
              if (!Number.isFinite(a.field[i]) || !Number.isFinite(b.field[i])) nonfinite++;
            }
            return {
              changedWords, nonfinite,
              endChanged: a.endWeight !== b.endWeight, energyChanged: a.energy !== b.energy,
              cellsChanged: JSON.stringify(a.cells) !== JSON.stringify(b.cells),
              settingsChanged: a.settings !== b.settings,
            };
          }
          function accept(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 1000 &&
              r.state.changedWords === 0 && r.state.nonfinite === 0 &&
              !r.state.endChanged && !r.state.energyChanged && !r.state.cellsChanged &&
              !r.state.settingsChanged && r.nonblank;
          }
          const first = instance.auditSnapshot();
          instance.regenerate();
          const replay = compare(first, instance.auditSnapshot());
          if (replay.changedWords || replay.endChanged) throw Error('Deterministic replay failed');
          const before = instance.auditSnapshot();
          const blob = await instance.exportPNG(dims.width, dims.height);
          const bitmap = await createImageBitmap(blob);
          const c = document.createElement('canvas');
          c.width = 64; c.height = 64;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(bitmap, 0, 0, 64, 64);
          const px = g.getImageData(0, 0, 64, 64).data;
          let lo = 255, hi = 0;
          for (let i = 0; i < px.length; i += 4) {
            const L = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
            if (L < lo) lo = L; if (L > hi) hi = L;
          }
          const result = {
            width: bitmap.width, height: bitmap.height, bytes: blob.size,
            state: compare(before, instance.auditSnapshot()),
            nonblank: hi - lo > 12,
            endWeight: before.endWeight, energy: before.energy, cells: before.cells,
          };
          bitmap.close();
          if (!accept(result)) throw Error('Export changed SSH state: ' + JSON.stringify(result));
          const wrong = { ...result, width: dims.width - 1 };
          if (accept(wrong)) throw Error('Wrong dimensions escaped');
          const preMut = instance.auditSnapshot();
          const blob2 = await instance.exportPNG(dims.width, dims.height);
          instance.auditMutate();
          const bitmap2 = await createImageBitmap(blob2);
          bitmap2.close();
          const mutated = {
            width: dims.width, height: dims.height, bytes: blob2.size,
            state: compare(preMut, instance.auditSnapshot()),
            nonblank: true,
          };
          if (accept(mutated) || mutated.state.changedWords === 0 || !mutated.state.endChanged) throw Error('Mutation escaped');
          return {
            fixture: fixture.name, cells: before.cells, endWeight: before.endWeight, energy: before.energy,
            export: { width: result.width, height: result.height, bytes: result.bytes, changedWords: result.state.changedWords, nonblank: result.nonblank },
            failureControls: { wrongDimensionsRejected: !accept(wrong), mutatingExportRejected: !accept(mutated), changedWords: mutated.state.changedWords },
          };
        }, { fixture, dims }));
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    assert.deepEqual([row.export.width, row.export.height], [1920, 2400]);
    assert.equal(row.export.changedWords, 0);
    assert.equal(row.export.nonblank, true);
    assert.equal(row.failureControls.wrongDimensionsRejected, true);
    assert.equal(row.failureControls.mutatingExportRejected, true);
  }
  const topo = rows.find(r => r.fixture === 'topo');
  const triv = rows.find(r => r.fixture === 'triv');
  assert(topo.endWeight > 0.9, 'topological preset should be an edge mode');
  assert(topo.energy < 1e-8, 'topological mid-gap energy should be unresolved');
  assert(triv.endWeight < 0.05, 'trivial preset should not be an edge mode');
  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    date: '2026-09-27',
    source: 'src/modules/ssh.js',
    sourceSha256: hash(original),
    command: 'node tools/ssh-print-state.js --write',
    scope: 'Actual ssh exportPNG at 1920x2400 (8 in, 300 ppi, aspect 4:5) for the Topological and Trivial presets, grid 96. Float32 mode field, mid-gap end weight and energy, cells and settings preserved.',
    criteria: 'Zero changed field words. Exact 1920x2400 PNG larger than 1000 bytes. Luminance spread above 12/255. Wrong width and a post-export mutation of the field and the end weight are rejected. Topological end weight above 0.9 with mid-gap energy under 1e-8. Trivial end weight under 0.05.',
    rows,
    limitations: 'State preservation and the two preset end weights on the exported instance. Spectral agreement with the Jacobi reference is tools/ssh-science.js, not this file. No calibrated color.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/ssh-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
