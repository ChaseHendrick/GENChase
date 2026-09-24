'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { ART_MODES, TITLES: ART_TITLES, normalizeArtInput, artArgs } = require('./art-tabs');
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
  if (!input || Object.keys(input).some(k => !['workspace', 'mode', 'id', 'slug', 'n', 'samples', 'grid', 'steps', 'alpha', 'start', 'power', 'machineSlug', 'shareAutomatically', 'recipe', 'parents', 'vary', 'keep', 'inches', 'ppi', 'budget', 'generations'].includes(k))) throw Error('Unsupported job settings.');
  // Settings only the art jobs read. Any other job would store them and ignore them, which misleads.
  const artOnly = ['recipe', 'parents', 'vary', 'keep', 'inches', 'ppi', 'budget', 'generations'].filter(k => input[k] !== undefined && input[k] !== null && input[k] !== '');
  if (!ART_MODES.includes(input.mode) && artOnly.length) throw Error(artOnly.join(', ') + (artOnly.length > 1 ? ' apply' : ' applies') + ' only to art jobs.');
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
  if (input.mode === 'vortex-collapse' || input.mode === 'vortex-grow') {
    // Open problems on minimal winding: alpha-model family, N vortices, a block of deterministic seeds. Growth
    // continues the deepest recorded family one vortex at a time up to N, running the seed block at every step.
    const grow = input.mode === 'vortex-grow', alpha = Number(input.alpha ?? 0), n = Number(input.n ?? (grow ? 12 : 5)), samples = Number(input.samples ?? (grow ? 10 : 50));
    const start = input.start === undefined || input.start === '' ? crypto.randomInt(0, 2 ** 31 - 1e6) : Number(input.start);
    if (!Number.isFinite(alpha) || alpha <= -2 || alpha > 3 || Math.round(alpha * 1000) !== alpha * 1000) throw Error('Kernel exponent alpha must lie in (-2, 3], with at most three decimals.');
    if (!Number.isInteger(n) || n < (grow ? 5 : 3) || n > (grow ? 64 : 16)) throw Error(grow ? 'Growth target must be 5 through 64 vortices.' : 'Vortex count must be 3 through 16.');
    if (!Number.isInteger(samples) || samples < 1 || samples > 100000) throw Error('Seeds per job must be 1 through 100,000.');
    if (!Number.isInteger(start) || start < 0 || start + samples > 2 ** 31) throw Error('Seed block start must be a non-negative integer below 2^31.');
    const args = ['tools/vortex-collapse-search.js', ...(grow ? ['--grow'] : []), '--alpha', String(alpha), '--n', String(n), '--start', String(start), '--count', String(samples)];
    return { title: grow ? 'Vortex collapse: grow the deepest family' : 'Vortex collapse: least winding search', executable: process.execPath, args, display: 'node ' + args.join(' '), input: { ...input, alpha, n, samples, start } };
  }
  if (ART_MODES.includes(input.mode)) {
    // Render studio recipes through the shell's own recipe and print path. The seed block of a hunt is drawn
    // here, like the vortex block, so Resume and Restart reuse it.
    const { workspace, power, machineSlug: slug, shareAutomatically, ...art } = input;
    const normalized = normalizeArtInput(art, ids(root)), args = artArgs(normalized);
    return { title: ART_TITLES[input.mode], executable: process.execPath, args, display: 'node ' + args.join(' '), input: { ...input, ...normalized } };
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
