'use strict';
// Exercise the production status formatter without computing a new trace ensemble.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { replaceOnce } = require('./science-harness');

const source = fs.readFileSync(path.join(__dirname, '../src/modules/sle.js'), 'utf8');
function statuses(text) {
  const hooks = {};
  let module;
  const Studio = { util: {}, PALETTES: {}, register: value => { module = value; } };
  const hooked = replaceOnce(text, '      function status(extra) {',
    '      hooks.status = status;\n      function status(extra) {');
  new Function('Studio', 'hooks', hooked)(Studio, hooks);
  return [
    { kappa: 6, mode: 'single', phase: 'self-touching' },
    { kappa: 8, mode: 'single', phase: 'space filling' },
    { kappa: 12, mode: 'single', phase: 'space filling' },
    { kappa: 12, mode: 'sweep', phase: 'one driving path' },
  ].map(({ phase, ...values }) => {
    const state = { ...module.defaults, ...values, N: 300 };
    let html = '';
    module.create({ canvas: { getContext: () => ({}) }, getState: () => state, setStatus: value => { html = value; } });
    hooks.status();
    assert(html.includes(phase), 'phase for ' + JSON.stringify(values));
    assert(html.includes('coarse trace, not resolved to dimension min(2, 1+κ/8)'),
      'the dimension disclosure must stay bounded at 2, including kappa 12');
    return html;
  });
}

assert.equal(statuses(source).length, 4);
const unbounded = source.replace('min(2, 1+κ/8)', '1+κ/8');
assert.notEqual(unbounded, source, 'the negative control must change the disclosure');
assert.throws(() => statuses(unbounded), /dimension disclosure must stay bounded/);
console.log('SLE status OK: kappa 6, 8 and 12, sweep, and an unbounded-dimension negative control');
