// Chromium print of square ice on a grid the plate will draw.
// Warm-up is zero, so the arrows are the seed, not a Monte Carlo sample.
// This is not the 2x2 Boltzmann comparison.
//   node tools/spinice-print-state.js [--write]
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');

const FIXTURES = [
  { name: 'ice', grid: 48, aspect: '1:1', init: 'ice', view: 'charge', J: 1.6, temp: 0.55, field: 0, warmup: 0, exposure: 1 },
  { name: 'pair', grid: 48, aspect: '1:1', init: 'pair', view: 'charge', J: 2.4, temp: 0.08, field: 0, warmup: 0, exposure: 1 },
];

(async () => {
  const root = path.resolve(__dirname, '..');
  const original = fs.readFileSync(path.join(root, 'src/modules/spinice.js'), 'utf8');
  const marker = `        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');`;
  assert.equal(original.split(marker).length, 2, 'Expected one spinice exportPNG');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!hx) throw Error('no arrows');
          let bad = 0;
          for (let i = 0; i < hx.length; i++) if (hx[i] !== 1 && hx[i] !== -1) bad++;
          for (let i = 0; i < hy.length; i++) if (hy[i] !== 1 && hy[i] !== -1) bad++;
          return {
            hx: Array.from(hx), hy: Array.from(hy), Q: Array.from(Q),
            W, H, iceFrac, rho, step, bad,
            settings: JSON.stringify(host.getState()),
          };
        },
        auditMutate() {
          if (!hx) throw Error('no arrows');
          hx[0] = -hx[0];
          charges();
        },
${marker}`);

  const browser = await chromium.launch({ args: glArgs() });
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#spinice/spinice-print-state');
      await page.evaluate(source);
      for (const fixture of FIXTURES) {
        rows.push(await page.evaluate(async ({ fixture, dims }) => {
          function arrowsOf(kind, W, H) {
            const hx = new Int8Array(W * H), hy = new Int8Array(W * H);
            if (kind === 'pair') {
              hx.fill(1); hy.fill(1);
              const y0 = H >> 1;
              for (let dy = -1; dy <= 1; dy++) {
                const y = (y0 + dy + H) % H;
                for (let x = (W / 6) | 0; x < ((5 * W / 6) | 0); x++) hx[y * W + x] *= -1;
              }
            } else {
              for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const odd = (x + y) & 1;
                hx[y * W + x] = odd ? 1 : -1;
                hy[y * W + x] = odd ? -1 : 1;
              }
            }
            return { hx, hy };
          }
          function chargesOf(hx, hy, W, H) {
            const Q = new Int8Array(W * H);
            let ice = 0, mon = 0;
            const iH = (x, y) => y * W + (x + W) % W;
            const iV = (x, y) => ((y + H) % H) * W + (x + W) % W;
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              const inn = (hx[iH(x - 1, y)] === 1 ? 1 : 0) + (hy[iV(x, y - 1)] === 1 ? 1 : 0)
                + (hx[iH(x, y)] === -1 ? 1 : 0) + (hy[iV(x, y)] === -1 ? 1 : 0);
              const q = inn - 2;
              Q[y * W + x] = q;
              if (q === 0) ice++;
              else if (q === 2 || q === -2) mon++;
            }
            return { Q, iceFrac: ice / (W * H), rho: mon / (W * H) };
          }
          function paintOf(Q, W, H, exposure, ramp) {
            const data = new Uint8ClampedArray(W * H * 4);
            for (let i = 0; i < Q.length; i++) {
              const t = Math.max(0, Math.min(1, 0.5 + 0.25 * Q[i] * exposure));
              const c = ramp(Number.isFinite(t) ? t : 0.5);
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
          function diffCount(a, b) {
            let n = 0;
            for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
            return n;
          }

          const mod = Studio.modules.spinice;
          const pal = Studio.PALETTES[mod.defaultPalette] || { colors: ['#0F1B2D', '#F4F6F7'], bg: '#0F1B2D' };
          const state = {
            ...mod.defaults, ...fixture, running: false,
            seed: 'spinice-print/' + fixture.name,
            palette: pal.colors, bg: pal.bg,
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
          const replay = instance.auditSnapshot();
          if (diffCount(first.hx, replay.hx) || diffCount(first.hy, replay.hy) || first.step !== replay.step) {
            throw Error('Deterministic replay failed');
          }
          const built = arrowsOf(state.init, first.W, first.H);
          const charge = chargesOf(built.hx, built.hy, first.W, first.H);
          const arrowDiff = diffCount(first.hx, built.hx) + diffCount(first.hy, built.hy);
          const chargeDiff = diffCount(first.Q, charge.Q);
          if (arrowDiff || chargeDiff || first.bad) throw Error('Arrows are not the seed: ' + arrowDiff + ' ' + chargeDiff);
          if (first.step !== 0) throw Error('Warm-up ran: ' + first.step);

          const ramp = Studio.util.makeRamp(state.palette, state.bg);
          const painted = paintOf(charge.Q, first.W, first.H, state.exposure, ramp);
          const expected = scaleNearest(painted, first.W, first.H, dims.width, dims.height);
          const before = instance.auditSnapshot();
          const blob = await instance.exportPNG(dims.width, dims.height);
          const after = instance.auditSnapshot();
          const bitmap = await createImageBitmap(blob);
          const read = document.createElement('canvas');
          read.width = bitmap.width; read.height = bitmap.height;
          const rg = read.getContext('2d', { willReadFrequently: true });
          rg.drawImage(bitmap, 0, 0);
          const got = rg.getImageData(0, 0, bitmap.width, bitmap.height).data;
          const pixels = channelDelta(got, expected);
          const bw = bitmap.width, bh = bitmap.height;
          bitmap.close();
          const changed = diffCount(before.hx, after.hx) + diffCount(before.hy, after.hy) + diffCount(before.Q, after.Q);
          if (changed || pixels.channels || bw !== dims.width || bh !== dims.height) {
            throw Error('Export changed the arrows or the sheet: ' + JSON.stringify({ changed, pixels, bw, bh }));
          }
          const narrowBlob = await instance.exportPNG(dims.width - 1, dims.height);
          const narrowMap = await createImageBitmap(narrowBlob);
          const narrowWidth = narrowMap.width;
          narrowMap.close();
          if (narrowWidth === dims.width) throw Error('A narrow export reported the full width');

          instance.auditMutate();
          const mutated = instance.auditSnapshot();
          const flipped = diffCount(before.hx, mutated.hx);
          if (!flipped) throw Error('Arrow mutation escaped');

          return {
            fixture: fixture.name,
            init: state.init,
            cells: [first.W, first.H],
            arrows: first.hx.length + first.hy.length,
            arrowDiff, chargeDiff,
            iceFrac: first.iceFrac,
            rho: first.rho,
            step: first.step,
            png: { width: dims.width, height: dims.height, bytes: blob.size, changedArrows: changed },
            pixels,
            failureControls: { wrongWidthWouldDiffer: true, flippedArrows: flipped },
          };
        }, { fixture, dims: { width: 2400, height: 2400 } }));
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  const ice = rows.find(r => r.fixture === 'ice');
  const pair = rows.find(r => r.fixture === 'pair');
  assert.equal(ice.iceFrac, 1, 'the ice seed should satisfy Q = 0 everywhere');
  assert.equal(ice.rho, 0);
  assert(pair.iceFrac < 1 && pair.iceFrac >= 0, 'the pair seed should break the ice rule: ' + pair.iceFrac);
  assert(pair.rho === 0, 'this band flips |Q| = 1 vertices, not the |Q| = 2 density: ' + pair.rho);
  for (const row of rows) {
    assert.equal(row.arrowDiff, 0);
    assert.equal(row.pixels.channels, 0);
    assert.equal(row.step, 0);
    assert(row.failureControls.flippedArrows > 0);
  }

  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    source: 'src/modules/spinice.js',
    sourceSha256: hash(original),
    harnessSha256: hash(fs.readFileSync(__filename)),
    command: 'node tools/spinice-print-state.js --write',
    scope: 'Chromium exportPNG at 2400x2400 of a 48x48 lattice, warm-up 0, running off. Ice-manifold seed and the monopole-pair seed, charge view.',
    criteria: 'Arrow words match an independent construction of the seed. Vertex charges match an independent two-in/two-out count. The PNG matches a nearest-neighbor paint of those charges, 0 channel differences. Export changes no arrow. Flipping one arrow after export is visible. The ice seed has ice fraction 1. The pair seed breaks that fraction. Its |Q| = 2 density stays 0: the band makes |Q| = 1 vertices, which this rho does not count.',
    rows,
    limitations: 'Two seeds at 48x48 with no Monte Carlo. Not the 2x2 Boltzmann comparison, not the status-line density, not a warm-up, not pyrochlore.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/spinice-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(rows, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
