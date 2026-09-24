// Actual-module exportPNG state preservation for material-wave plates.
// Test-only instrumentation; does not change production modules.
// Setup: Playwright + Chromium per BUILDING.md.
// Run: node tools/material-wave-print-state.js --write
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

function instrumentChladni(source) {
  const marker = '      return {\n        aspect(s) { return aspectRatio(s); },';
  assert.equal(source.split(marker).length, 2, 'Expected one chladni export return hook');
  return source.replace(
    marker,
    `      return {
        auditSnapshot() {
          return {
            settings: JSON.stringify(host.getState()),
            phase,
            raf,
            chunkTimer,
            sand: sand ? { step: sand.step, count: sand.count, max: sand.max, words: sand.buf.length } : null,
          };
        },
        auditAdvance(delta) {
          stop();
          phase += delta;
          renderStatic();
        },
        aspect(s) { return aspectRatio(s); },`
  );
}

function instrumentGerstner(source) {
  const marker = '      return {\n        aspect(st) { return ASPECTS[st.aspect] || 1; },';
  assert.equal(source.split(marker).length, 2, 'Expected one gerstner export return hook');
  return source.replace(
    marker,
    `      return {
        auditSnapshot() {
          return {
            settings: JSON.stringify(host.getState()),
            metric: { orbit: metric.orbit, radLaw: metric.radLaw, rMean: metric.rMean, pressure: metric.pressure, rSurfOverA: metric.rSurfOverA },
            raf,
            trainsN,
          };
        },
        auditAdvance(delta) {
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          const s = host.getState();
          s.t = (Number(s.t) || 0) + delta;
          compute(); paint(); status();
        },
        aspect(st) { return ASPECTS[st.aspect] || 1; },`
  );
}

function instrumentHasimoto(source) {
  const marker = '      return {\n        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(source.split(marker).length, 2, 'Expected one hasimoto export return hook');
  return source.replace(
    marker,
    `      return {
        auditSnapshot() {
          let measDigest = null;
          if (meas && meas.crv) {
            const crv = meas.crv;
            let h = 2166136261;
            const stride = Math.max(1, (crv.n / 32) | 0);
            for (let i = 0; i < crv.n; i += stride) {
              h ^= Math.imul((Math.fround(crv.x[i]) * 1e6) | 0, 16777619);
              h ^= Math.imul((Math.fround(crv.y[i]) * 1e6) | 0, 16777619);
              h ^= Math.imul((Math.fround(crv.z[i]) * 1e6) | 0, 16777619);
            }
            measDigest = {
              t: crv.t,
              kRatio: meas.kRatio,
              cRatio: meas.cRatio,
              liaMean: meas.liaMean,
              tag: meas.tag,
              curveHash: (h >>> 0).toString(16),
            };
          }
          return { settings: JSON.stringify(host.getState()), raf, measDigest };
        },
        auditAdvance(delta) {
          stopLoop();
          const s = host.getState();
          s.t = ((Number(s.t) || 0) + delta);
          compute(); paint(); status();
        },
        aspect(s) { return ASPECTS[s.aspect] || 1; },`
  );
}

const fixtures = {
  chladni: {
    file: 'src/modules/chladni.js',
    instrument: instrumentChladni,
    cases: [
      { label: 'square-12-nodal', n1: 1, m1: 2, a1: 1, n2: 0, m2: 0, a2: 0, n3: 0, m3: 0, a3: 0, style: 'nodal', mode: 'plate', plate: 'square', symmetric: false, freq: 1, rotation: 0, zoom: 1, animate: false },
      { label: 'square-32-filled', n1: 3, m1: 2, a1: 1, n2: 0, m2: 0, a2: 0, n3: 0, m3: 0, a3: 0, style: 'filled', mode: 'plate', plate: 'square', symmetric: false, freq: 1, rotation: 0, zoom: 1, animate: false, signed: true },
      { label: 'square-45-contour', n1: 4, m1: 5, a1: 1, n2: 0, m2: 0, a2: 0, n3: 0, m3: 0, a3: 0, style: 'contour', mode: 'plate', plate: 'square', symmetric: false, freq: 1, rotation: 0, zoom: 1, animate: false },
    ],
    advance: 0.4,
  },
  gerstner: {
    file: 'src/modules/gerstner.js',
    instrument: instrumentGerstner,
    cases: [
      { label: 'single-022-slice', steep: 0.22, trains: '1', t: 0.1, view: 'slice', running: false, aspect: '1:1', depth: 0.5, rows: 8, nAlong: 12, columns: true },
      { label: 'single-054-slice', steep: 0.54, trains: '1', t: 0.37, view: 'slice', running: false, aspect: '1:1', depth: 0.5, rows: 8, nAlong: 12, columns: true },
      { label: 'single-086-woodcut', steep: 0.86, trains: '1', t: 0.61, view: 'woodcut', running: false, aspect: '1:1', depth: 0.44, rows: 8, nAlong: 13, columns: true },
    ],
    advance: 0.37,
  },
  hasimoto: {
    file: 'src/modules/hasimoto.js',
    instrument: instrumentHasimoto,
    cases: [
      { label: 'nu045-tau0-filament', nu: 0.45, tau0: 0, t: 0, view: 'filament', running: false, aspect: '1:1', zoom: 1, weight: 1 },
      { label: 'nu088-tau034-print', nu: 0.88, tau0: 0.34, t: 0.3, view: 'print', running: false, aspect: '1:1', zoom: 1, weight: 1 },
      { label: 'nu172-tau046-filament', nu: 1.72, tau0: 0.46, t: -0.4, view: 'filament', running: false, aspect: '1:1', zoom: 1, weight: 1 },
    ],
    advance: 0.41,
  },
};

(async () => {
  const browser = await chromium.launch({
    args: glArgs(),
  });
  const rows = [];
  try {
    for (const [id, spec] of Object.entries(fixtures)) {
      let source = fs.readFileSync(path.join(root, spec.file), 'utf8');
      source = spec.instrument(source);
      for (const fixture of spec.cases) {
        const page = await browser.newPage();
        try {
          await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/material-wave-print');
          await page.evaluate(source);
          rows.push(
            await page.evaluate(
              async ({ id, fixture, advance }) => {
                const mod = Studio.modules[id];
                if (!mod) throw Error('missing module ' + id);
                const pal = Studio.PALETTES[mod.defaultPalette] || null;
                const palette = pal
                  ? { colors: pal.colors, bg: pal.bg }
                  : typeof mod.defaultPalette === 'object'
                    ? mod.defaultPalette
                    : { colors: ['#D4B05A', '#C06E3A'], bg: '#0D0C0B' };
                const state = {
                  ...mod.defaults,
                  ...fixture,
                  running: false,
                  animate: false,
                  palette: palette.colors || mod.defaults.palette,
                  bg: palette.bg || mod.defaults.bg || '#111',
                  seed: 'material-wave-print',
                };
                delete state.label;
                if (typeof mod.sanitize === 'function') mod.sanitize(state);
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 800;
                const instance = mod.create({
                  canvas,
                  getState: () => state,
                  setStatus() {},
                  isActive: () => false,
                  reducedMotion: () => true,
                  requestRepaint() {},
                  fault(msg) {
                    throw Error(msg);
                  },
                });
                instance.regenerate();
                instance.pause();

                function compare(a, b) {
                  return {
                    settingsChanged: a.settings !== b.settings,
                    snapshotChanged: JSON.stringify(a) !== JSON.stringify(b),
                  };
                }
                function accept(result) {
                  return (
                    result.width === 2400 &&
                    result.height === 2400 &&
                    result.bytes > 1000 &&
                    !result.comparison.settingsChanged &&
                    !result.comparison.snapshotChanged
                  );
                }

                const initial = instance.auditSnapshot();
                const exports = [];
                for (const steps of [0, 1]) {
                  if (steps) instance.auditAdvance(advance);
                  const before = instance.auditSnapshot();
                  const blob = await instance.exportPNG(2400, 2400);
                  const bitmap = await createImageBitmap(blob);
                  const after = instance.auditSnapshot();
                  const result = {
                    steps: steps ? 1 : 0,
                    label: fixture.label,
                    time: JSON.parse(before.settings).t ?? before.phase ?? 0,
                    width: bitmap.width,
                    height: bitmap.height,
                    bytes: blob.size,
                    comparison: compare(before, after),
                  };
                  bitmap.close();
                  if (!accept(result)) throw Error('Export changed state or dimensions: ' + JSON.stringify(result));
                  exports.push(result);
                }

                const evolved = instance.auditSnapshot();
                if (!compare(initial, evolved).snapshotChanged) throw Error('Evolved fixture did not change scientific snapshot');

                const before = instance.auditSnapshot();
                const blob = await instance.exportPNG(2400, 2400);
                instance.auditAdvance(advance);
                const bitmap = await createImageBitmap(blob);
                const negative = {
                  width: bitmap.width,
                  height: bitmap.height,
                  bytes: blob.size,
                  comparison: compare(before, instance.auditSnapshot()),
                };
                bitmap.close();
                instance.pause();
                if (accept(negative) || !negative.comparison.snapshotChanged) {
                  throw Error('State-mutating export failure control escaped detection');
                }

                return {
                  id,
                  fixture: fixture.label,
                  precision: 'canvas2d',
                  exports,
                  failureControl: {
                    description: 'Export wrapper advances the actual scientific time/phase after producing the PNG',
                    rejected: !accept(negative),
                    snapshotChanged: negative.comparison.snapshotChanged,
                  },
                };
              },
              { id, fixture, advance: spec.advance }
            )
          );
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  for (const row of rows) {
    assert.equal(row.failureControl.rejected, true);
    assert.equal(row.failureControl.snapshotChanged, true);
    for (const exp of row.exports) {
      assert.equal(exp.width, 2400);
      assert.equal(exp.height, 2400);
      assert(exp.bytes > 1000);
      assert.equal(exp.comparison.settingsChanged, false);
      assert.equal(exp.comparison.snapshotChanged, false);
    }
  }

  const out = {
    scope:
      'Actual chladni/gerstner/hasimoto exportPNG to 2400x2400 (8 in at 300 ppi) on paused fixtures matching the material-wave numerical domain: square cosine modes (1,2)/(3,2)/(4,5) in nodal/filled/contour; single-train Gerstner steepness 0.22/0.54/0.86; Hasimoto (nu,tau0) pairs from the filament audit. Compares exact settings JSON plus local scientific locals (phase/metric/meas digest) before and after export; includes a deliberate post-export time/phase advance failure control.',
    limitations:
      'State preservation and output dimensions only. Not print color fidelity, sand/circular Chladni, two-train Gerstner, full Biot-Savart Hasimoto, running exports, other aspect ratios, or physical plate agreement. Canvas 2D SwiftShader path; no GPU float32 field buffers.',
    reviewed: new Date().toLocaleString('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).slice(0, 10),
    command: 'node tools/material-wave-print-state.js --write',
    rows,
  };
  const dest = path.join(root, 'validation/results/material-wave-print-state.json');
  if (process.argv.includes('--write')) {
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  }
  console.log(JSON.stringify(out, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});