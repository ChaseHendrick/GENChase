// Regression for the science harness: removing a measured O(tau) correction must fail.
// node tools/cattaneo-relaxation-check.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const filename = path.join(__dirname, 'cattaneo-science.js');
const source = fs.readFileSync(filename, 'utf8');
const marker = 'const cpu = cpuPart();';
assert.equal(source.split(marker).length, 2, 'one CPU measurement hook');
async function run(tau) {
  const processStub = { argv: ['node', filename, '--cpu-only'], exitCode: 0 };
  let result;
  // Change only the measured rate, leaving roots() and every analytic reference intact.
  // At tau=0.001 this still passes the looser 0.1% slow-root check, so that check cannot
  // stand in for the O(tau) test. The other two rows exercise the entire tested range.
  const instrumented = tau === null ? source : source.replace(marker, marker + `
    cpu.relaxation.find(r => r.tau === ${tau}).slowRootMeasured =
      -0.002 * 4 * 512 ** 2 * Math.sin(2 * Math.PI / 512) ** 2;`);
  await vm.runInNewContext(instrumented, {
    require: createRequire(filename), __dirname, process: processStub,
    console: { log: value => { if (value.startsWith('{')) result = JSON.parse(value); }, error: () => {} },
  }, { filename, timeout: 30000 });
  assert.ok(result, 'science harness returned its measurements');
  return { result, exitCode: processStub.exitCode };
}
(async () => {
  const good = await run(null);
  assert.equal(good.exitCode, 0, 'unmodified twin must pass');
  for (const tau of [0.001, 0.003, 0.01]) {
    const bad = await run(tau);
    assert.equal(bad.exitCode, 1, `missing measured correction must fail at tau=${tau}`);
    assert.ok(bad.result.failures.some(f => f.startsWith('O(τ) correction at τ ' + tau + ':')),
      `the O(tau) criterion itself must reject tau=${tau}`);
    if (tau === 0.001) assert.equal(bad.result.failures.length, 1, 'smallest tau fails only the O(tau) check');
  }
  console.log('PASS cattaneo-relaxation-check: measured correction removed at all three tested tau values');
})().catch(error => { console.error(error); process.exitCode = 1; });
