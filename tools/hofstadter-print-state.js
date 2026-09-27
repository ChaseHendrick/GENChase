// Print-path evidence for the Hofstadter plate. The Chern view's buffer is the painted
// plate: every pixel is checked against the module field, and every recorded gap integer
// is checked against the TKNN t_r from tools/hofstadter-science.js. A wrong gap index
// must repaint the buffer. Exporting does not change the field.
//
// Setup: npm install --no-save playwright (Chromium). One browser.
//   node tools/hofstadter-print-state.js [--write]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { glArgs } = require('./lib/gl-args');
const { tknn } = require('./hofstadter-science.js');

const root = path.resolve(__dirname, '..');
const original = fs.readFileSync(path.join(root, 'src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js'), 'utf8');

function once(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw Error(label + ': expected 1 occurrence, found ' + n);
  return needle;
}
let source = original;
source = source.replace(
  once(source, '      let dens, chern, BW=0, BH=0, nEV=0;', 'dens declaration'),
  '      let dens, chern, BW=0, BH=0, nEV=0, hits=[];'
);
source = source.replace(
  once(source, '        dens = new Float32Array(W*H); chern = new Float32Array(W*H);\n        nEV = 0;', 'rebuild reset'),
  '        dens = new Float32Array(W*H); chern = new Float32Array(W*H);\n        nEV = 0; hits = [];'
);
source = source.replace(
  once(source, '              chern[iy*W+ix] += C;', 'chern accumulate'),
  '              chern[iy*W+ix] += C; hits.push({p:p,q:q,r:r,E:E,C:C,ix:ix,iy:iy});'
);
source = source.replace(
  once(source, "        regenerate(){\n          const s=host.getState();\n          host.setStatus('<span>diagonalizing Harper matrices…</span>');", 'regenerate'),
  `        audit(){ return { hits, dens: Array.from(dens), chern: Array.from(chern), BW, BH, nEV }; },
        auditMutate(i, v){ chern[i] = v; },
        regenerate(){
          const s=host.getState();
          host.setStatus('<span>diagonalizing Harper matrices…</span>');`
);

const FIXTURES = [
  { name: 'chern Q=8', p: { Q: 8, view: 'chern', grain: 0 }, palette: 'thermal' },
  { name: 'chern Q=12', p: { Q: 12, view: 'chern', grain: 0 }, palette: 'thermal' },
  { name: 'chern preset', preset: 'chern', p: { grain: 0 } },
  { name: 'density Q=12', p: { Q: 12, view: 'density', grain: 0 }, palette: 'xray' },
];

function sameCount(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

(async () => {
  const browser = await chromium.launch({ args: glArgs() });
  const failures = [];
  const rows = [];
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#hofstadter/hofstadter-print');
    await page.evaluate(s => { eval(s); }, source);
    for (const fx of FIXTURES) {
      const row = await page.evaluate(async (fx) => {
        const mod = Studio.modules.hofstadter;
        const pal = Studio.PALETTES[fx.palette || (fx.preset && mod.presets[fx.preset].palette && 'thermal') || mod.defaultPalette];
        const presetPal = fx.preset ? mod.presets[fx.preset].palette : null;
        const colors = presetPal ? presetPal.colors.slice() : pal.colors.slice();
        const bg = presetPal ? presetPal.bg : pal.bg;
        const state = Object.assign({}, mod.defaults, fx.preset ? mod.presets[fx.preset].p : {}, fx.p || {}, { palette: colors, bg, seed: 'hofstadter-1976', grain: 0 });
        mod.sanitize(state);
        const canvas = document.createElement('canvas');
        canvas.width = 480; canvas.height = 480;
        const inst = mod.create({
          canvas, getState: () => state, setStatus() {}, isActive: () => false,
          reducedMotion: () => true, requestRepaint() {}, fault(m) { throw Error(m); },
        });
        inst.regenerate();
        const snap = inst.audit();
        const decode = async (blob) => {
          const bitmap = await createImageBitmap(blob);
          const c = document.createElement('canvas');
          c.width = bitmap.width; c.height = bitmap.height;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(bitmap, 0, 0);
          const px = g.getImageData(0, 0, c.width, c.height).data;
          bitmap.close();
          return { width: c.width, height: c.height, px, bytes: blob.size, type: blob.type };
        };
        const expectPaint = () => {
          const lut = Studio.util.makeRampLUT(state.palette, state.bg, 256);
          const rgb = Studio.util.hexToRgb(state.bg);
          const out = new Uint8ClampedArray(snap.BW * snap.BH * 4);
          for (let i = 0, o = 0; i < snap.dens.length; i++, o += 4) {
            if (snap.dens[i] <= 0) { out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; out[o + 3] = 255; continue; }
            const t = Studio.util.clamp(snap.chern[i] / snap.dens[i] / 8 + 0.5, 0, 1);
            const li = (t * 255 | 0) * 3;
            out[o] = lut[li]; out[o + 1] = lut[li + 1]; out[o + 2] = lut[li + 2]; out[o + 3] = 255;
          }
          return out;
        };
        const small = await decode(await inst.exportPNG(snap.BW, snap.BH));
        const afterSmall = inst.audit();
        let paintMismatch = 0;
        if (state.view === 'chern') {
          const want = expectPaint();
          if (want.length === small.px.length) {
            for (let i = 0; i < want.length; i++) if (want[i] !== small.px[i]) paintMismatch++;
          } else paintMismatch = -1;
        }
        const sheet = await decode(await inst.exportPNG(2400, 2400));
        const afterSheet = inst.audit();
        const again = await decode(await inst.exportPNG(2400, 2400));
        let sheetDrift = 0;
        for (let i = 0; i < sheet.px.length; i += 97) if (sheet.px[i] !== again.px[i]) sheetDrift++;
        // Full byte compare is heavy; compare every pixel on the chern Q=8 sheet only via a checksum.
        let checksumDrift = 0;
        if (sheet.px.length === again.px.length) {
          for (let i = 0; i < sheet.px.length; i++) if (sheet.px[i] !== again.px[i]) checksumDrift++;
        } else checksumDrift = -1;
        const bgRgb = Studio.util.hexToRgb(state.bg);
        let ink = 0, lo = 255, hi = 0;
        for (let i = 0; i < small.px.length; i += 4) {
          const L = 0.2126 * small.px[i] + 0.7152 * small.px[i + 1] + 0.0722 * small.px[i + 2];
          if (L < lo) lo = L; if (L > hi) hi = L;
          if (Math.abs(small.px[i] - bgRgb[0]) + Math.abs(small.px[i + 1] - bgRgb[1]) + Math.abs(small.px[i + 2] - bgRgb[2]) > 0) ink++;
        }
        let mutated = null;
        if (state.view === 'chern') {
          const before = small.px;
          let idx = -1;
          for (let i = 0; i < snap.dens.length; i++) if (snap.dens[i] > 0) { idx = i; break; }
          inst.auditMutate(idx, snap.chern[idx] + 5);
          const moved = await decode(await inst.exportPNG(snap.BW, snap.BH));
          let diff = 0;
          for (let i = 0; i < before.length; i++) if (before[i] !== moved.px[i]) diff++;
          mutated = { index: idx, changedChannels: diff };
          inst.auditMutate(idx, snap.chern[idx]);
        }
        return {
          name: fx.name,
          Q: state.Q, view: state.view,
          cells: [snap.BW, snap.BH],
          hits: snap.hits,
          nEV: snap.nEV,
          fieldChangedByExport: afterSmall.nEV !== snap.nEV
            || afterSmall.dens.some((v, i) => v !== snap.dens[i])
            || afterSmall.chern.some((v, i) => v !== snap.chern[i])
            || afterSheet.dens.some((v, i) => v !== snap.dens[i])
            || afterSheet.chern.some((v, i) => v !== snap.chern[i]),
          buffer: { width: small.width, height: small.height, bytes: small.bytes, type: small.type, paintMismatch, ink, spread: hi - lo },
          sheet: { width: sheet.width, height: sheet.height, bytes: sheet.bytes, type: sheet.type, pixelDrift: checksumDrift },
          mutated,
        };
      }, fx);
      const colorErrors = [];
      let matched = 0, wrongWouldFail = 0;
      if (row.view === 'chern') {
        for (const h of row.hits) {
          const t = tknn(h.p, h.q, h.r);
          if (h.C !== t) colorErrors.push(h.p + '/' + h.q + ' r=' + h.r + ' painted ' + h.C + ' t_r ' + t);
          else matched++;
          if (tknn(h.p, h.q, h.r + 1) !== t) wrongWouldFail++;
        }
      }
      const problems = [];
      if (row.hits.length !== row.nEV) problems.push('hit count ' + row.hits.length + ' != nEV ' + row.nEV);
      if (row.fieldChangedByExport) problems.push('export changed the field');
      if (row.view === 'chern' && row.buffer.paintMismatch !== 0) problems.push('paint mismatch ' + row.buffer.paintMismatch);
      if (row.view === 'chern' && colorErrors.length) problems.push(colorErrors.slice(0, 3).join('; '));
      if (row.view === 'chern' && wrongWouldFail === 0) problems.push('wrong gap index never differed');
      if (row.buffer.width !== row.cells[0] || row.buffer.height !== row.cells[1]) problems.push('buffer size');
      if (row.sheet.width !== 2400 || row.sheet.height !== 2400) problems.push('sheet size');
      if (row.sheet.type !== 'image/png' || row.sheet.bytes < 1000) problems.push('sheet bytes');
      if (row.sheet.pixelDrift !== 0) problems.push('sheet not deterministic');
      if (!(row.buffer.spread > 8) || !(row.buffer.ink > 10)) problems.push('blank plate');
      if (row.mutated && !(row.mutated.changedChannels > 0)) problems.push('mutating a Chern sample did not change the export');
      const summary = {
        name: row.name, Q: row.Q, view: row.view, nEV: row.nEV,
        colorsMatched: matched, wrongIndexDistinct: wrongWouldFail, colorErrors: colorErrors.length,
        paintMismatch: row.buffer.paintMismatch, ink: row.buffer.ink, spread: row.buffer.spread,
        sheet: row.sheet, mutated: row.mutated, problems,
      };
      rows.push(summary);
      if (problems.length) failures.push(row.name + ': ' + problems.join('; '));
      console.log(row.name, problems.length ? 'FAIL ' + problems.join('; ') : 'OK', 'nEV', row.nEV, 'colors', matched, 'wrong-index distinct', wrongWouldFail, 'paint', row.buffer.paintMismatch);
    }
  } finally {
    await browser.close();
  }
  const out = {
    tool: 'tools/hofstadter-print-state.js',
    reviewed: '2026-09-27',
    chromium: browser.version(),
    node: process.version,
    rows,
    failures,
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/hofstadter-print-state.json'), JSON.stringify(out, null, 2) + '\n');
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else console.log('Hofstadter print state OK');
})().catch(err => { console.error(err); process.exitCode = 1; });
