'use strict';
const fs = require('node:fs'), path = require('node:path');
const MODES = {
  fast: ['Fast development checks', 'npm', ['test']],
  inventory: ['Science inventory', 'node', ['tools/science.js']],
  witnesses: ['Harvest all module measurements', 'node', ['apps/validate/harvest.js', '--all']],
  witness: ['Harvest one module measurement', 'node', ['apps/validate/harvest.js']],
  numerical: ['All registered numerical checks', 'node', ['tools/verify.js', '--all']],
  all: ['All registered numerical and print checks', 'node', ['tools/verify.js', '--print', '--all']],
  technique: ['One technique: numerical and print', 'node', ['tools/verify.js', '--print']],
  plate: ['One technique: runtime and determinism', 'node', ['tools/check.js']],
  print: ['One technique: 8-inch, 300 ppi export', 'node', ['tools/export.js']],
  full: ['Full development and registered science checks', 'npm', ['run', 'test:all']],
};
const EXPERIMENTS = {
  'maxwell-search': ['Maxwell design search', 'tools/maxwell-search.js'],
  'maxwell-robust': ['Maxwell robustness experiment', 'tools/maxwell-robust.js'],
  'molecular-memory': ['Molecular preparation experiment', 'tools/molecular-memory.js'],
  'cahn-scaling': ['Cahn coarsening experiment', 'tools/cahn-scaling.js'],
};
function ids(root) { return JSON.parse(fs.readFileSync(path.join(root, 'techniques.json'), 'utf8')).techniques.map(t => t.id); }
function command(root, input) {
  if (!input || Object.keys(input).some(k => !['workspace', 'mode', 'id', 'slug', 'n', 'samples', 'grid', 'steps', 'power', 'machineSlug', 'shareAutomatically'].includes(k))) throw Error('Unsupported job settings.');
  if (input.shareAutomatically !== undefined && typeof input.shareAutomatically !== 'boolean') throw Error('Automatic sharing must be on or off.');
  const machineSlug = input.machineSlug || 'm1pro';
  if (typeof machineSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(machineSlug) || machineSlug.length > 32) throw Error('Use a pseudonymous machine slug of lowercase letters, numbers and single hyphens, up to 32 characters.');
  input = { ...input, machineSlug };
  if (input.workspace === 'validate') {
    const mode = input.mode || 'all', choice = MODES[mode];
    if (!choice) throw Error('Choose an official validation mode.');
    const args = choice[2].slice();
    if (['technique', 'plate', 'print', 'witness'].includes(mode)) {
      if (!ids(root).includes(input.id)) throw Error('Choose a technique from the catalog.');
      args.push(input.id);
      if (mode === 'plate') args.push('12000');
      if (mode === 'print') args.push('8', '300');
    }
    return { title: choice[0], executable: choice[1] === 'node' ? process.execPath : 'npm', args, display: choice[1] + ' ' + args.join(' '), input: { ...input, mode } };
  }
  if (input.workspace !== 'contribute') throw Error('Choose Check simulations or Run experiments.');
  if (input.mode === 'metal') {
    const grid = Number(input.grid || 128), steps = Number(input.steps || 1000);
    if (![32,64,128,192,256].includes(grid) || !Number.isInteger(steps) || steps < 1 || steps > 100000000) throw Error('Choose a supported Metal grid and a positive step budget up to 100,000,000.');
    const args = ['apps/validate/native.js', '--grid', String(grid), '--steps', String(steps)];
    return { title: 'Apple GPU periodic wave workload', executable: process.execPath, args, display: 'node ' + args.join(' '), input: { ...input, grid, steps } };
  }
  if (EXPERIMENTS[input.mode]) {
    const [title, script] = EXPERIMENTS[input.mode];
    return { title, executable: process.execPath, args: [script], display: 'node ' + script, input };
  }
  if (input.mode !== 'derive') throw Error('Choose a supported exploration job.');
  const slug = input.slug || 'polygon-candidate', n = Number(input.n || 5), samples = Number(input.samples || 10000);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64) throw Error('Slug must use lowercase letters, numbers and single hyphens, up to 64 characters.');
  if (!Number.isInteger(n) || n < 2 || n > 5) throw Error('Polygon order must be 2 through 5, matching the existing plate.');
  if (!Number.isInteger(samples) || samples < 100 || samples > 5000000) throw Error('Sweep samples must be 100 through 5,000,000.');
  const args = ['apps/validate/contribute.js', '--n', String(n), '--samples', String(samples), '--slug', slug];
  return { title: 'Derive a two-polygon candidate', executable: process.execPath, args, display: 'node ' + args.join(' '), input: { ...input, n, samples, slug } };
}
module.exports = { MODES, EXPERIMENTS, ids, command };
