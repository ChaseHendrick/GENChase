'use strict';
const assert = require('node:assert/strict');
const { uniformSkinEvidence } = require('./lib/check-uniform-skin');
const sample = () => ({ state: { id: 'skin', grid: 96, g: .08, disorder: 0, bc: 'periodic', solver: 'right', rows: 'modes', view: 'modes', aspect: '4:5' },
  data: { geometry: { sites: 96, modes: 96, boundary: 'periodic', solver: 'right', rowMode: 'modes', g: .08, disorder: 0 }, shape: [96, 96], values: Array(96 * 96).fill(Math.fround(1 / 96)), skinWeight: 10 / 96 },
  paint: { width: 16, height: 16, visibleCanvases: 1, pixels: 256, opaquePixels: 256, expectedColorPixels: 256, expectedRgb: [231,231,231] } });
assert.equal(uniformSkinEvidence(sample()).accepted, true);
const controls = {
  corruptDensity: s => { s.data.values[0] += .001; s.data.values[1] -= .001; },
  nan: s => { s.data.values[0] = NaN; },
  shape: s => { s.data.shape = [96,95]; },
  repeatedRows: s => { s.data.shape = [120,96]; s.data.values = Array(120*96).fill(1/96); },
  unnormalized: s => { s.data.values = s.data.values.map(v => v * 2); },
  wrongWeight: s => { s.data.skinWeight = .9; },
  transparentCanvas: s => { s.paint.opaquePixels = 0; },
  blackCanvas: s => { s.paint.expectedColorPixels = 0; },
  missingCanvas: s => { s.paint.visibleCanvases = 0; },
  partialPaint: s => { s.paint.expectedColorPixels--; },
  disorder: s => { s.state.disorder = .1; },
  openBoundary: s => { s.state.bc = 'open'; },
  oldSolver: s => { s.state.solver = 'gram'; },
  unrelatedModule: s => { s.state.id = 'potts'; },
};
for (const [name, corrupt] of Object.entries(controls)) { const s = sample(); corrupt(s); assert.equal(uniformSkinEvidence(s).accepted, false, name); }
console.log('PASS clean periodic Skin uniform classifier and ' + Object.keys(controls).length + ' rejection controls');
