'use strict';
// Regression coverage for render-history-independent exposure, not model validation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/modules/physarum3d.js'), 'utf8');
const marker = '      return {\n        aspect(s)';
assert.equal(source.split(marker).length, 2, 'Expected one instance hook');
function instance() {
  let module;
  const hooks = {};
  const Studio = {util: {TAU: Math.PI * 2}, gl: {GLSL: {}}, PALETTES: {}, register: m => { module = m; }};
  const injected = source.replace(marker,
    '      hooks.measure = trail => { sim = {trail}; return measureRef(); };\n' + marker);
  new Function('Studio', 'hooks', injected)(Studio, hooks);
  module.create({canvas: {}});
  return hooks;
}
const target = Float32Array.from({length: 100}, (_, i) => i + 1);
for (const history of [[], [1000], [1000, 500, 300], Array(30).fill(1000)]) {
  const m = instance();
  for (const scale of history) m.measure(Float32Array.from(target, v => v * scale));
  assert.equal(m.measure(target), 100, 'Exposure must depend only on the current field');
  assert.equal(m.measure(target), 100, 'Repainting must not change exposure');
  assert.equal(m.measure(new Float32Array(100)), 1e-6, 'Empty volume must not inherit old exposure');
}
console.log('PHYSARUM3D DISPLAY OK: current-field exposure is independent of preview history');
