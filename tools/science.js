// node tools/science.js [--write]: validate records and render the coverage report.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const catalog = JSON.parse(read('techniques.json')).techniques;
const records = JSON.parse(read('validation/techniques.json'));
const statuses = ['unvalidated', 'partially validated', 'validated within stated limits'];
const assert = (ok, why) => { if (!ok) throw Error(why); };
const hasText = s => typeof s === 'string' && !!s.trim();
const description = s => hasText(s) && !/^(?:tbd|todo|unknown|unspecified|n\/a|none|all)$/i.test(s.trim());
const validFile = f => {
  if (!hasText(f) || path.isAbsolute(f) || f.includes('\\') || f.split('/').some(s => !s || s === '.' || s === '..')) return false;
  try {
    const file = path.join(root, f), relative = path.relative(fs.realpathSync(root), fs.realpathSync(file));
    return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative) && fs.statSync(file).isFile();
  } catch { return false; }
};
const validResults = f => {
  if (!validFile(f) || !f.startsWith('validation/results/') || !f.endsWith('.json')) return false;
  try {
    const result = JSON.parse(read(f));
    return result !== null && typeof result === 'object' && !Array.isArray(result) && Object.keys(result).length > 0;
  } catch { return false; }
};
const validDate = s => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const date = new Date(s + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s && s <= new Date().toISOString().slice(0, 10);
};
// These harnesses check construction, runtime, images or state preservation, not a numerical claim.
const nonNumericalTests = new Set([
  'build', 'check', 'export', 'index', 'lint', 'maintenance-check', 'pde-print-state',
  'plate', 'preset', 'recipe', 'science', 'sharp', 'shot', 'ui', 'zoom', 'verify', 'verify-check', 'wave-print-state',
  'surfaces-print', 'plasma-print', 'shallow-print', 'nonreciprocal-print', 'maxwell-print-state', 'molecular-print', 'eight-print-state', 'maxwell-search', 'maxwell-search-check', 'maxwell-boundary', 'molecular-memory', 'maxwell-robust', 'schrodinger-disorder', 'cahn-scaling'
].map(name => fs.existsSync(path.join(root, 'tools', name + '.js')) ? fs.realpathSync(path.join(root, 'tools', name + '.js')) : path.join(root, 'tools', name + '.js')));
try {
  assert(Array.isArray(records), 'Expected validation record array');
  const ids = new Set();
  for (const r of records) {
    assert(!ids.has(r.id), 'Duplicate validation id: ' + r.id); ids.add(r.id);
    const m = catalog.find(m => m.id === r.id);
    assert(m, 'Unknown technique: ' + r.id);
    assert(statuses.includes(r.status), 'Invalid status: ' + r.id);
    assert(validFile(r.source), 'Missing source: ' + r.id);
    assert([...read(r.source).matchAll(/\bid\s*:\s*['"]([^'"]+)['"]/g)].some(match => match[1] === r.id), 'Source/id mismatch: ' + r.id);
    assert(crypto.createHash('sha256').update(read(r.source)).digest('hex') === r.sourceSha256, 'Source changed; review validation record: ' + r.id);
    assert(r.reference === m.credit && r.equation === m.equation, 'Catalog reference drift: ' + r.id);
    for (const key of ['limitations', 'remaining']) assert(Array.isArray(r[key]) && r[key].length && r[key].every(hasText), 'Missing ' + key + ': ' + r.id);
    for (const kind of ['numerical', 'print']) {
      assert(Array.isArray(r[kind]), 'Missing evidence list: ' + r.id);
      for (const e of r[kind]) {
        assert(validFile(e.test), 'Missing evidence test: ' + r.id);
        for (const k of ['scope', 'criteria', 'limitations']) assert(hasText(e[k]), 'Missing evidence ' + k + ': ' + r.id);
        if (kind === 'numerical') {
          assert(!nonNumericalTests.has(fs.realpathSync(path.join(root, e.test))), 'Runtime, export and inventory checks are not numerical evidence: ' + r.id);
          for (const k of ['benchmark', 'failureControl', 'command']) assert(description(e[k]), 'Missing numerical evidence ' + k + ': ' + r.id);
          assert(validResults(e.results), 'Numerical evidence requires a JSON result artifact in validation/results/: ' + r.id);
        }
      }
    }
    if (r.status !== 'unvalidated') assert(r.numerical.length, 'Status requires numerical evidence: ' + r.id);
    if (r.status === 'validated within stated limits') {
      assert(r.print.length && r.domain && typeof r.domain === 'object' && !Array.isArray(r.domain) && ['parameters', 'conditions', 'resolution', 'precision'].every(k => description(r.domain[k])), 'Full status requires print evidence and a stated parameter/condition/resolution/precision domain: ' + r.id);
      assert(validDate(r.reviewed), 'Full status requires a real, nonfuture review date: ' + r.id);
      assert(validResults(r.results), 'Full status requires a JSON result artifact in validation/results/: ' + r.id);
    }
  }
  assert(catalog.every(m => ids.has(m.id)), 'Missing technique validation records');
  const counts = statuses.map(s => `${records.filter(r => r.status === s).length} ${s}`).join('; ');
  const safe = s => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const rows = records.map(r => `| [${r.id}](${r.source}) | ${r.status} | ${r.numerical.map(e => '[' + path.basename(e.test) + '](' + e.test + ')').join(', ') || 'None registered'} | ${r.print.length ? 'Limited evidence recorded' : 'Not scientifically validated'} |`).join('\n');
  const report = `# Scientific validation coverage\n\n> [!IMPORTANT]\n> These are evidence labels, not certification that every simulation matches its paper.\n> ${counts}.\n\nGenerated by \`node tools/science.js --write\` from [records](validation/techniques.json).\nRead the [validation contract](validation/README.md) for acceptance rules and audit priorities.\n\nA passing inventory check verifies coverage, source fingerprints and required evidence fields.\nIt does not run the recorded commands or judge their scientific adequacy. Numerical tests must\nalso run successfully and receive scientific review; fingerprints do not validate mathematics.\nRuntime, determinism and print sharpness checks are separate from scientific accuracy.\n${records.some(r => r.status === 'validated within stated limits') ? 'Complete labels apply only within each record\'s reviewed domain.' : 'No technique currently has complete registered numerical-and-print validation.'}\n\n| Technique / source | Scientific status | Numerical test | Print accuracy |\n|---|---|---|---|\n${rows}\n\n## Recorded limitations\n\n${records.filter(r => r.numerical.length).map(r => '### ' + r.id + '\n\n' + r.limitations.map(s => '- ' + safe(s)).join('\n') + '\n').join('\n')}\nThe remaining records retain each catalog equation and reference as a review target. They do not\nclaim those descriptions have been checked against the primary paper. Full parameter, precision,\nboundary-condition, convergence and print-state reviews remain outstanding where recorded.\n`;
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'VALIDATION.md'), report);
  else assert(read('VALIDATION.md') === report, 'VALIDATION.md is stale; run node tools/science.js --write');
  console.log('Coverage records OK: ' + counts);
} catch (e) { console.error(e.message); process.exitCode = 1; }
