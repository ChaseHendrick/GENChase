'use strict';
// Execute maintained CPU calculations without rendering. Hooks are injected into
// the source read from disk; no duplicate implementation is used as the subject.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Expected one hook: ' + before);
  return source.replace(before, after);
}
function load(id, {names = '', capture = '', mutate = s => s} = {}) {
  const original = fs.readFileSync(path.join(root, 'src/modules', id + '.js'), 'utf8');
  const hooks = {};
  let module;
  const Studio = {util: {TAU: 2 * Math.PI, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), makeRng: () => () => .5}, PALETTES: {}, register: m => {module = m;}};
  let source = mutate(original);
  if (names) source = replaceOnce(source, '  Studio.register({', '  Object.assign(hooks, {' + names + '});\n  Studio.register({');
  if (capture) {
    source = replaceOnce(source, "        buf = document.createElement('canvas');", '        hooks.sample = {' + capture + '}; return;\n        buf = document.createElement(\'canvas\');');
    source = replaceOnce(source, '      return {\n        aspect(s)', '      hooks.compute = compute;\n      return {\n        aspect(s)');
  }
  new Function('Studio', 'hooks', source)(Studio, hooks);
  return {hooks, sourceSha256: crypto.createHash('sha256').update(original).digest('hex'),
    compute(state) {
      module.create({canvas: {getContext: () => ({})}, getState: () => ({...module.defaults, ...state})});
      hooks.compute();
      return hooks.sample;
    }};
}
module.exports = {load, replaceOnce, root};
