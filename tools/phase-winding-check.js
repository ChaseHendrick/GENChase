// node tools/phase-winding-check.js [--write]
// Also run by expr-check.js in CI. --write refreshes validation/results/phase-winding.json.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../src/shared/expr.js');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/dynamics.js'), 'utf8');
const start = source.indexOf('  const WIND_N =');
const end = source.indexOf('  const PAL_PHASE', start);
assert(start >= 0 && end > start, 'production winding routine must be found');
const code = source.slice(start, end);
function load(text = code) {
  return vm.runInNewContext('const PI = Math.PI, TAU = 2 * PI;\n' + text + '\nwindingNumber');
}
const rational = '(z^2 - 1)*(z - 2 - i)^2/(z^2 + 2 + 2*i)';
const cases = [
  { name: 'default plate', f: rational, cx: 1, cy: 0.5, r: 1.5, expected: 3 },
  { name: 'circle through double zero', f: rational, cx: 0.5, cy: 0.2, r: 1.7, expected: null },
  // These have analytic count 0, but resolved samples cross the conservative magnitude floor.
  { name: 'double zero just outside', f: rational, cx: 0.5, cy: 0.98, r: 1.5, expected: null, analyticCount: 0 },
  { name: 'isolated double zero outside', f: '(z-1)^2', cx: 0, cy: 0.01, r: 1, expected: null, analyticCount: 0 },
  { name: 'fast positive winding', f: 'pow(z,4096)', cx: 0, cy: 0, r: 1, expected: 4096 },
  { name: 'fast negative winding', f: '1/pow(z,4096)', cx: 0, cy: 0, r: 1, expected: -4096 },
  { name: 'double zero inside', f: '(z-1)^2', cx: 0.01, cy: 0, r: 1, expected: 2 },
  { name: 'double pole outside', f: '1/(z-1)^2', cx: 0, cy: 0.01, r: 1, expected: null, analyticCount: 0 },
  { name: 'resolvable double zero outside', f: '(z-1)^2', cx: 0, cy: 0.02, r: 1, expected: 0 },
  { name: 'resolvable double pole outside', f: '1/(z-1)^2', cx: 0, cy: 0.02, r: 1, expected: 0 },
  { name: 'zero on circle', f: 'z-1', cx: 0, cy: 0, r: 1, expected: null },
  { name: 'pole on circle', f: '1/(z-1)', cx: 0, cy: 0, r: 1, expected: null },
  { name: 'branch cut crossing', f: 'sqrt(z)', cx: 0, cy: 0, r: 1, expected: null },
  { name: 'constant function', f: '2+i', cx: 0, cy: 0, r: 1, expected: 0 },
];
function evaluate(winding, c) {
  const F = E.compileComplex(c.f, { vars: ['z'], params: ['a', 'b'] });
  return winding(F, { ccx: c.cx, ccy: c.cy, cr: c.r, aRe: 1, aIm: 0, bRe: 0, bIm: 1 });
}
function run() {
  const winding = load();
  const results = cases.map(c => ({ ...c, actual: evaluate(winding, c) }));
  for (const c of results) console.log(c.name + ': ' + c.actual.n + (c.actual.why ? ' (' + c.actual.why + ')' : ''));
  for (const c of results) {
    assert(c.actual.n === c.expected, c.name + ': expected ' + c.expected + ', got ' + c.actual.n);
    assert.equal(!!c.actual.why, c.expected === null, c.name + ' refusal reason');
  }
  // Remove exactly the new criterion: the historical wrapped-phase-only algorithm must fail.
  const guard = ' && Math.max(a0.speed, a1.speed) * (t1 - t0) <= PI / 2';
  assert(code.includes(guard), 'negative control must remove the derivative guard');
  const mutant = load(code.replace(guard, ''));
  const misses = cases.filter(c => evaluate(mutant, c).n !== c.expected).map(c => c.name);
  assert(misses.includes('circle through double zero') && misses.includes('fast positive winding'), 'wrapped-phase-only control must miss boundary and fast winding');
  const budgetCode = code.replace('WIND_BUDGET = 400000', 'WIND_BUDGET = 30');
  assert.notEqual(budgetCode, code);
  const budget = evaluate(load(budgetCode), cases[0]);
  assert.equal(budget.n, null);
  assert.equal(budget.why, 'budget');
  assert.equal(budget.evals, 30, 'derivative probes count toward the evaluation budget');
  const depthCode = code.replace('WIND_DEPTH = 24', 'WIND_DEPTH = 0');
  assert.notEqual(depthCode, code);
  const depth = evaluate(load(depthCode), cases.find(c => c.name === 'fast positive winding'));
  assert.equal(depth.n, null);
  assert.equal(depth.why, 'fast');
  // Execute the actual status formatter with a refused production result. No count or verdict.
  const statusStart = source.indexOf('      function status(s)', end);
  const statusEnd = source.indexOf('      function draw()', statusStart);
  assert(statusStart > end && statusEnd > statusStart);
  let status;
  vm.runInNewContext(code + '\n' + source.slice(statusStart, statusEnd) + '\nstatus({ccx: 0, ccy: 0, cr: 1, zoom: 0});', {
    witness: () => results[1].actual,
    host: { setStatus: text => { status = text; }, canvas: { width: 800, height: 800 } },
    U: { escapeHtml: text => text }, fText: () => rational, cplx: () => '0', f2: n => n.toFixed(2),
  });
  assert(status.includes('<b>not counted</b>') && status.includes('too close to a zero or pole'));
  assert(!/<b>[+-]?\d|agreement|disagreement|sigma|σ/.test(status), 'refused status prints no numerical verdict');
  console.log('PHASE WINDING OK: ' + cases.length + ' cases; wrapped-phase-only mutant caught in ' + misses.length + '; budget, depth and refused status checked');
  return { cases: results, failureControl: { removed: 'endpoint logarithmic derivative guard', misses }, budget, depth, refusedStatus: status };
}
if (require.main === module) {
  const results = run();
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/phase-winding.json'), JSON.stringify(results, null, 2) + '\n');
}
module.exports = { run };
