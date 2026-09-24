// Actual eight exportPNG/exportSVG state preservation; not numerical accuracy or calibrated color.
// node tools/eight-print-state.js [--write]
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');

const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
function printSize(aspect) {
  const a = ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const original = fs.readFileSync(path.join(root, 'src/modules/eight.js'), 'utf8');
  const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(original.split(marker).length, 2, 'Expected one eight export API marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!traj) throw Error('no traj');
          return {
            n: traj.n,
            periods: traj.periods,
            E0: traj.E0, dE: traj.dE, eMax: traj.eMax,
            L0: traj.L0, L: traj.L, dq: traj.dq, dead: !!traj.dead,
            px: traj.px.map(a => a.slice()),
            py: traj.py.map(a => a.slice()),
            vx: traj.vx.map(a => a.slice()),
            vy: traj.vy.map(a => a.slice()),
            tt: traj.tt.slice(),
            phase,
            raf,
            settings: JSON.stringify(host.getState()),
          };
        },
        auditMutate() {
          if (!traj) throw Error('no traj');
          traj.px[0][0] = (traj.px[0][0] || 0) + 1e-3;
          phase = (phase || 0) + 0.17;
        },
${marker}`);

  const fixtures = [
    { name: 'world', aspect: '1:1', overlay: { kind: 'eight', periods: 1, view: 'world', zoom: 1.12, lift: 0.048, fade: 0.38, weight: 1.08 } },
    { name: 'braid', aspect: '4:5', overlay: { kind: 'eight', periods: 1, view: 'braid', zoom: 1.0, lift: 0.02, fade: 0.08, weight: 1.15 } },
    { name: 'shape', aspect: '1:1', overlay: { kind: 'eight', periods: 1, view: 'shape', zoom: 1.05, lift: 0, fade: 0.2, weight: 1.2 } },
    { name: 'broken', aspect: '1:1', overlay: { kind: 'broken', periods: 1, view: 'world', zoom: 0.58, lift: 0.04, fade: 0.15, weight: 0.95 } },
    { name: 'wreath', aspect: '16:9', overlay: { kind: 'eight', periods: 1, view: 'polar', zoom: 0.95, lift: 0.03, fade: 0.12, weight: 0.85 } },
  ];

  const browser = await chromium.launch({ args: glArgs() });
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#eight/eight-print-state');
      await page.evaluate(source);
      for (const fixture of fixtures) {
        rows.push(await page.evaluate(async ({ fixture, dims }) => {
          const mod = Studio.modules.eight;
          const pal = typeof mod.defaultPalette === 'object' && mod.defaultPalette
            ? mod.defaultPalette
            : (Studio.PALETTES[mod.defaultPalette] || { colors: ['#D4B05A', '#C06E3A', '#8A96A3'], bg: '#0D0C0B' });
          const state = {
            ...mod.defaults,
            ...fixture.overlay,
            aspect: fixture.aspect,
            running: false,
            seed: 'eight-print-state/' + fixture.name,
            palette: pal.colors,
            bg: pal.bg,
          };
          mod.sanitize(state);
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = Math.max(270, Math.round(480 * (({ '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 })[state.aspect] || 1)));
          const instance = mod.create({
            canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
          });
          instance.regenerate();

          function packWords(snap) {
            const arrays = [];
            for (const key of ['px', 'py', 'vx', 'vy']) for (const arr of snap[key]) arrays.push(arr);
            arrays.push(snap.tt);
            return arrays;
          }
          function compare(a, b) {
            const aa = packWords(a), bb = packWords(b);
            if (aa.length !== bb.length) throw Error('Array set changed');
            let changedWords = 0, nonfinite = 0, words = 0;
            for (let k = 0; k < aa.length; k++) {
              if (aa[k].length !== bb[k].length) throw Error('Trajectory length changed');
              const x = new Uint32Array(aa[k].buffer, aa[k].byteOffset, aa[k].byteLength / 4);
              const y = new Uint32Array(bb[k].buffer, bb[k].byteOffset, bb[k].byteLength / 4);
              for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) changedWords++;
              for (let i = 0; i < aa[k].length; i++) {
                if (!Number.isFinite(aa[k][i]) || !Number.isFinite(bb[k][i])) nonfinite++;
              }
              words += aa[k].length;
            }
            return {
              changedWords, nonfinite, words,
              phaseChanged: a.phase !== b.phase,
              rafChanged: a.raf !== b.raf,
              scalarsChanged: a.n !== b.n || a.periods !== b.periods || a.E0 !== b.E0 || a.dE !== b.dE ||
                a.eMax !== b.eMax || a.L0 !== b.L0 || a.L !== b.L || a.dq !== b.dq || a.dead !== b.dead,
              settingsChanged: a.settings !== b.settings,
            };
          }
          function acceptPng(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 1000 &&
              r.state.changedWords === 0 && r.state.nonfinite === 0 &&
              !r.state.phaseChanged && !r.state.rafChanged && !r.state.scalarsChanged &&
              !r.state.settingsChanged && r.nonblank;
          }
          function acceptSvg(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 200 &&
              r.paths > 0 && r.state.changedWords === 0 && r.state.nonfinite === 0 &&
              !r.state.phaseChanged && !r.state.rafChanged && !r.state.scalarsChanged &&
              !r.state.settingsChanged;
          }
          function luminanceSpread(bitmap) {
            const c = document.createElement('canvas');
            c.width = 320; c.height = Math.max(1, Math.round(320 * bitmap.height / bitmap.width));
            const g = c.getContext('2d', { willReadFrequently: true });
            g.imageSmoothingEnabled = false;
            g.drawImage(bitmap, 0, 0, c.width, c.height);
            const pixels = g.getImageData(0, 0, c.width, c.height).data;
            let lo = 255, hi = 0, finite = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const L = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
              if (Number.isFinite(L)) { finite++; if (L < lo) lo = L; if (L > hi) hi = L; }
            }
            return { spread: hi - lo, finite, samples: pixels.length / 4 };
          }
          function parseSvgSize(svg) {
            const wm = /width="(\d+(?:\.\d+)?)"/.exec(svg);
            const hm = /height="(\d+(?:\.\d+)?)"/.exec(svg);
            if (!wm || !hm) throw Error('SVG missing width/height');
            return { width: Number(wm[1]), height: Number(hm[1]), paths: (svg.match(/<path\b/g) || []).length, bytes: svg.length };
          }

          const first = instance.auditSnapshot();
          instance.regenerate();
          const replay = compare(first, instance.auditSnapshot());
          if (replay.changedWords || replay.scalarsChanged || replay.settingsChanged || replay.phaseChanged) {
            throw Error('Deterministic replay failed');
          }

          const beforePng = instance.auditSnapshot();
          const blob = await instance.exportPNG(dims.width, dims.height);
          const bitmap = await createImageBitmap(blob);
          const lum = luminanceSpread(bitmap);
          const png = {
            width: bitmap.width, height: bitmap.height, bytes: blob.size,
            L: beforePng.L, dE: beforePng.dE, dq: beforePng.dq, n: beforePng.n,
            state: compare(beforePng, instance.auditSnapshot()),
            nonblank: lum.spread > 12 && lum.finite === lum.samples,
            luminance: lum,
          };
          bitmap.close();
          if (!acceptPng(png)) throw Error('Export PNG changed eight state or dimensions: ' + JSON.stringify(png));

          const wrongPng = { ...png, width: dims.width - 1 };
          if (acceptPng(wrongPng)) throw Error('Wrong PNG dimensions escaped');

          const beforeSvg = instance.auditSnapshot();
          const svgText = instance.exportSVG(dims.width, dims.height);
          const svgSize = parseSvgSize(svgText);
          const svg = {
            ...svgSize,
            state: compare(beforeSvg, instance.auditSnapshot()),
          };
          if (!acceptSvg(svg)) throw Error('Export SVG changed eight state or dimensions: ' + JSON.stringify(svg));
          const wrongSvg = { ...svg, width: dims.width - 1 };
          if (acceptSvg(wrongSvg)) throw Error('Wrong SVG dimensions escaped');

          const preMut = instance.auditSnapshot();
          const blob2 = await instance.exportPNG(dims.width, dims.height);
          instance.auditMutate();
          const bitmap2 = await createImageBitmap(blob2);
          const lum2 = luminanceSpread(bitmap2);
          const mutated = {
            width: bitmap2.width, height: bitmap2.height, bytes: blob2.size,
            state: compare(preMut, instance.auditSnapshot()),
            nonblank: lum2.spread > 12 && lum2.finite === lum2.samples,
          };
          bitmap2.close();
          if (acceptPng(mutated) || mutated.state.changedWords === 0 || !mutated.state.phaseChanged) {
            throw Error('Mutating post-export state escaped detection');
          }

          return {
            fixture: fixture.name,
            kind: state.kind,
            view: state.view,
            n: beforePng.n,
            requested: [dims.width, dims.height],
            L: beforePng.L,
            dE: beforePng.dE,
            dq: beforePng.dq,
            png,
            svg,
            replayUnchanged: true,
            failureControls: {
              wrongPngDimensionsRejected: !acceptPng(wrongPng),
              wrongSvgDimensionsRejected: !acceptSvg(wrongSvg),
              mutatingExportRejected: !acceptPng(mutated),
              changedWords: mutated.state.changedWords,
              phaseChanged: mutated.state.phaseChanged,
            },
          };
        }, { fixture, dims: printSize(fixture.aspect) }));
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    assert.deepEqual([row.png.width, row.png.height], row.requested);
    assert.deepEqual([row.svg.width, row.svg.height], row.requested);
    assert.equal(row.png.state.changedWords, 0);
    assert.equal(row.svg.state.changedWords, 0);
    assert.equal(row.failureControls.wrongPngDimensionsRejected, true);
    assert.equal(row.failureControls.wrongSvgDimensionsRejected, true);
    assert.equal(row.failureControls.mutatingExportRejected, true);
    assert(row.png.nonblank);
    assert(row.svg.paths > 0);
  }
  const world = rows.find(r => r.fixture === 'world');
  const broken = rows.find(r => r.fixture === 'broken');
  assert(world && Math.abs(world.L) < 1e-8 && world.dq < 1e-5, 'world fixture should close with near-zero L');
  assert(broken && broken.dq > world.dq, 'broken fixture should miss the one-period return harder than world');

  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    source: 'src/modules/eight.js',
    sourceSha256: hash(original),
    harnessSha256: hash(fs.readFileSync(__filename)),
    command: 'node tools/eight-print-state.js --write',
    scope: 'Actual eight exportPNG and exportSVG at 2400 longest edge for world, braid, shape, broken and wreath fixtures (2400x2400, 1920x2400 and 2400x1350). Exact Float64 trajectory words, diagnostics (L, dE, dq), phase, raf and settings preserved; deterministic regenerate replay; nonblank reduced raster; SVG path geometry with exact width/height.',
    criteria: 'Zero changed/nonfinite trajectory words; scalars/phase/settings unchanged across PNG and SVG export; exact requested dimensions and nonempty PNG/SVG; luminance spread >12/255; wrong dimensions and deliberate post-export traj+phase mutation rejected; broken return distance exceeds world.',
    rows,
    limitations: 'State preservation and declared dimensions only. Does not establish long-time orbit accuracy, calibrated color, printed numerical resolution, SVG/PNG pixel agreement or coverage of every control/aspect/hardware.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/eight-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
