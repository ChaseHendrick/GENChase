// Replay/data-contract controls; numerical controls run in maxwell-search.js itself.
const assert = require('node:assert/strict');
const { SETTINGS, layouts, validateCandidate, parseArgs } = require('./maxwell-search');
const designs = layouts();
assert.equal(designs.length, 24);
assert.deepEqual(designs, layouts(), 'Seeded designs changed within one run');
assert.equal(new Set(designs.map(row => row.sites.join(','))).size, 24);
const candidate = { format: 'genchase-maxwell-candidate-v1', sourceSha256: 'test-revision', settings: structuredClone(SETTINGS), geometry: designs[2] };
for (const geometry of designs) validateCandidate({ ...candidate, geometry }, 'test-revision');
for (const change of [
  value => { value.geometry.sites[1] = value.geometry.sites[0]; },
  value => { value.geometry.sites[0] = -1; },
  value => { value.geometry.sites.pop(); },
  value => { value.settings.sampleTimes[0] += .01; },
  value => { value.settings.source.phase += .1; },
  value => { value.sourceSha256 = 'different-source'; },
]) { const broken = structuredClone(candidate); change(broken); assert.throws(() => validateCandidate(broken, 'test-revision')); }
assert.deepEqual(parseArgs(['--replay', 'saved.json', '--grid', '256', '--half-step']), { grid: 256, halfStep: true, replay: 'saved.json' });
for (const args of [[], ['--grid', '256'], ['--replay'], ['--replay', 'saved.json', '--grid', '2048'], ['--unknown']]) {
  if (!args.length) assert.deepEqual(parseArgs(args), { grid: 128, halfStep: false });
  else assert.throws(() => parseArgs(args));
}
console.log('PASS: deterministic fixed-material candidates, altered replay settings/source rejection, and bounded CLI options. These are data-contract checks, not scientific validation.');
