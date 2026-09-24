'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { parseTimes, energyBetween, energyCounter, jobCompute } = require('./compute');
test('POSIX times output parses in bash and dash formats', () => {
  assert.deepEqual(parseTimes('0m0.001s 0m0.000s\n1m2.500s 0m0.250s\n'), { userSeconds: 62.5, systemSeconds: 0.25, cpuSeconds: 62.75 });
  assert.equal(parseTimes('0m0.000000s 0m0.000000s\n0m0.390000s 0m0.030000s').cpuSeconds.toFixed(2), '0.42');
  for (const bad of ['', 'garbage', '0m0.1s\n', '0m0.1s 0m0.1s\nx y']) assert.equal(parseTimes(bad), null);
});
test('energy counter reads RAPL zones and survives one wrap', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-rapl-'));
  try {
    for (const [zone, uj] of [['intel-rapl:0', 900], ['intel-rapl:1', 10]]) { fs.mkdirSync(path.join(dir, zone)); fs.writeFileSync(path.join(dir, zone, 'energy_uj'), String(uj)); fs.writeFileSync(path.join(dir, zone, 'max_energy_range_uj'), zone.endsWith('0') ? '1000' : '5000'); }
    fs.mkdirSync(path.join(dir, 'intel-rapl:0:0')); // subzones are inside the package count and must be skipped
    const a = energyCounter(dir); fs.writeFileSync(path.join(dir, 'intel-rapl:0', 'energy_uj'), '100'); fs.writeFileSync(path.join(dir, 'intel-rapl:1', 'energy_uj'), '4010');
    assert(Math.abs(energyBetween(a, energyCounter(dir)) - 0.0042) < 1e-15);
    assert.equal(energyCounter(path.join(dir, 'missing')), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('job compute labels estimates and missing CPU time honestly', () => {
  const c = jobCompute({ userSeconds: 3, systemSeconds: 1, cpuSeconds: 4 }, 8);
  assert.equal(c.utilization, 0.5); assert.match(c.energy.method, /^estimate/); assert(c.energy.wattHoursHigh > c.energy.wattHoursLow);
  assert.match(jobCompute({ userSeconds: 1, systemSeconds: 0, cpuSeconds: 1 }, 2, 7200).energy.method, /^measured/);
  assert.equal(jobCompute(null, 5).recorded, false);
});
