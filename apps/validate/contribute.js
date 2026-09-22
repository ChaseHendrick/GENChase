// A bounded local search adapter. It infers coefficients from velocities, not a model API.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const { literature, restrained } = require('./literature');
const { git, save } = require('./jobs');
const { seal, intact } = require('./checkpoint');
const root = path.resolve(__dirname, '../..');
function options(args) {
  const out = { n: 5, samples: 10000, slug: 'polygon-candidate' };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.slice(2); if (!['n', 'samples', 'slug'].includes(key) || !args[i + 1]) throw Error('Use --n, --samples and --slug.');
    out[key] = key === 'slug' ? args[i + 1] : Number(args[i + 1]);
  }
  require('./commands').command(root, { workspace: 'contribute', mode: 'derive', ...out }); return out;
}
function load() {
  const source = fs.readFileSync(path.join(root, 'src/modules/double-triangle-bound.js'), 'utf8');
  const context = { Studio: { util: { clamp: (x, a, b) => Math.max(a, Math.min(b, x)) }, PALETTES: {}, register() {} } };
  vm.runInNewContext(source.replace('  Studio.register({', 'globalThis.probe={place,measure,closed};\n  Studio.register({'), context);
  return { ...context.probe, sourceSha256: crypto.createHash('sha256').update(source).digest('hex') };
}
function random(seed) { let x = seed >>> 0; const next = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; next.state = () => x >>> 0; return next; }
function sweep({ n, samples }, probe = load()) {
  const measured = phase => probe.measure(probe.place(phase / n * 180 / Math.PI, false, 0, n));
  // Fit f(phase) sin(phase) = A - B cos(phase) at two interior points.
  const p = Math.PI / 3, q = 2 * Math.PI / 3;
  const y1 = measured(p).product * Math.sin(p), y2 = measured(q).product * Math.sin(q);
  const B = (y2 - y1) / (Math.cos(p) - Math.cos(q)), A = y1 + B * Math.cos(p);
  if (!(Number.isFinite(A) && A > Math.abs(B))) throw Error('Coefficient fit has no finite interior minimum.');
  const fitted = phase => (A - B * Math.cos(phase)) / Math.sin(phase);
  const checkpointFile = process.env.GENCHASE_JOB_DIR && path.join(process.env.GENCHASE_JOB_DIR, 'derive-checkpoint.json');
  const signature = crypto.createHash('sha256').update(fs.readFileSync(__filename)).update(probe.sourceSha256).update(JSON.stringify({n,samples})).digest('hex');
  let saved = null;
  if (checkpointFile && fs.existsSync(checkpointFile)) {
    try {
      const old=JSON.parse(fs.readFileSync(checkpointFile));
      if(intact(old)&&old.signature===signature&&Number.isInteger(old.done)&&old.done>=0&&old.done<=samples&&Number.isInteger(old.rng)&&old.rng>0&&old.rng<=0xffffffff&&['maxRelativeError','maxResidual','knownFormulaError'].every(k=>Number.isFinite(old[k])&&old[k]>=0))saved=old;
      else console.log('Sweep checkpoint changed or damaged; restarting held-out angles.');
    } catch { console.log('Sweep checkpoint could not be read; restarting held-out angles.'); }
  }
  const rng = random(saved?.rng ?? (0x514f0000 + n));
  let maxRelativeError = saved?.maxRelativeError || 0, maxResidual = saved?.maxResidual || 0, knownFormulaError = saved?.knownFormulaError || 0;
  for (let i = saved?.done || 0; i < samples; i++) {
    const phase = (.07 + .86 * rng()) * Math.PI, m = measured(phase), predicted = fitted(phase);
    maxRelativeError = Math.max(maxRelativeError, Math.abs(m.product / predicted - 1));
    maxResidual = Math.max(maxResidual, m.residual);
    knownFormulaError = Math.max(knownFormulaError, Math.abs(predicted / probe.closed(phase / n * 180 / Math.PI, n) - 1));
    if (![m.product, m.residual].every(Number.isFinite)) throw Error('Nonfinite sweep measurement.');
    if (checkpointFile && ((i + 1) % 10000 === 0 || i + 1 === samples)) save(checkpointFile, seal({ signature, done: i + 1, rng: rng.state(), maxRelativeError, maxResidual, knownFormulaError }));
    if (i && i % 100000 === 0) console.log('Swept ' + i + '/' + samples + ' held-out angles.');
  }
  const phaseMinimum = Math.acos(B / A), minimum = Math.sqrt(A * A - B * B);
  const measuredMinimum = measured(phaseMinimum).product;
  const broken = probe.measure(probe.place(phaseMinimum / n * 180 / Math.PI, true, 0, n));
  const badFormulaRelativeError = Math.abs(measuredMinimum / (minimum * 1.01) - 1);
  const passed = maxRelativeError < 1e-10 && maxResidual < 1e-10 && Math.abs(measuredMinimum / minimum - 1) < 1e-10 && broken.residual > 1e-3 && badFormulaRelativeError > 1e-3;
  return { passed, A, B, minimum, measuredMinimum, phaseMinimum, maxRelativeError, maxResidual, knownFormulaError,
    samples, seed: 0x514f0000 + n, tolerance: 1e-10, brokenResidual: broken.residual, badFormulaRelativeError,
    sourceSha256: probe.sourceSha256, method: 'Two fitted coefficients, independent seeded hold-out angles, direct Biot-Savart measurements. Numerical candidate; fitted coefficients are not an exact symbolic proof.' };
}
async function plate(n, seed) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    // Block external network. The portable studio and its fonts are local.
    await page.route(/^https?:\/\//, route => route.abort());
    const results = [];
    for (const kind of ['minimum', 'broken']) {
      const recipe = Buffer.from(JSON.stringify({ v: 2, n, kind, running: false })).toString('base64url');
      await page.goto('about:blank');
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#double-triangle-bound/' + seed + '-' + kind + '/' + recipe, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!Studio.getWitness(), null, { timeout: 90000 });
      const w = await page.evaluate(() => ({ witness: Studio.getWitness(), status: document.getElementById('status').textContent, recipe: Studio.getRecipe(), parameters: { ...Studio.modules['double-triangle-bound'].defaults, ...Studio.getRecipe() } }));
      if (w.parameters.n !== n || w.parameters.kind !== kind || w.witness.valid !== (kind === 'minimum')) throw Error('Seeded plate witness failed for ' + kind);
      results.push(w);
    }
    if (errors.length) throw Error(errors.join('\n'));
    return results;
  } finally { await browser.close(); }
}
async function main() {
  const opt = options(process.argv.slice(2)), commit = process.env.GENCHASE_JOB_COMMIT || git(root, ['rev-parse', 'HEAD']);
  // Read the ledger before any derivation; stage three performs the full local comparison.
  fs.readFileSync(path.join(root, 'RESEARCH.md'), 'utf8');
  const progress = (stage, message) => console.log('GENCHASE_PROGRESS ' + JSON.stringify({ stage, message }));
  let numericResult, plateResult = [], failure = null;
  try {
    progress('derive', 'Inferring coefficients and checking held-out angles in the existing polygon family');
    numericResult = sweep(opt); if (!numericResult.passed) throw Error('Candidate missed the numerical acceptance limits.');
    progress('check', 'Checking the seeded studio plate and its Broken control');
    plateResult = await plate(opt.n, 'candidate-' + opt.slug);
  } catch (e) { failure = e.message; console.error('Candidate check failed: ' + failure); }
  const statement = numericResult ? `For the existing ${opt.n}-gon pair, inferred P(theta) = (${numericResult.A} - ${numericResult.B} cos(${opt.n} theta))/sin(${opt.n} theta), with candidate lower bound ${numericResult.minimum}. Coefficients are numerical, not an exact symbolic proof.` : 'No mathematical statement established because derivation failed.';
  const candidate = { statement, family: 'Classical two regular polygon vortex collapse', priority: 'unconfirmed',
    domain: { n: opt.n, sampledPhase: '[0.07 pi, 0.93 pi]', precision: 'JavaScript binary64', geometry: 'Existing two-ring family and circulations; no collision endpoint or arbitrary geometry claim.' },
    numericResult: numericResult || { passed: false }, plateResult, checkPassed: !failure, failure,
    missCondition: 'Relative fit or similarity residual at least 1e-10, nonfinite values, failed seeded plate, or failure of a deliberately wrong formula/off-family control.',
    reproduceCommand: 'node apps/validate/contribute.js --n ' + opt.n + ' --samples ' + opt.samples + ' --slug ' + opt.slug,
    commit, created: new Date().toISOString() };
  progress('search', 'Comparing repository sources and drafting external search queries');
  try { candidate.literature = literature(root, opt.n); }
  catch (e) { candidate.literature = { classification: 'search incomplete', priority: 'unconfirmed', error: e.message, queries: [] }; failure ||= e.message; candidate.checkPassed = false; candidate.failure = failure; }
  if (numericResult && numericResult.knownFormulaError >= 1e-10 && candidate.literature.classification === 'matches known source') {
    candidate.literature.classification = 'search incomplete'; candidate.literature.limitation += ' Numerical equivalence to the recorded formula was not established.';
  }
  const directory = path.join(root, 'identities/candidates'); fs.mkdirSync(directory, { recursive: true });
  const basename = candidate.created.slice(0, 10) + '-' + opt.slug + '-' + crypto.randomBytes(4).toString('hex');
  const cleaned = JSON.parse(restrained(JSON.stringify(candidate)));
  // Never overwrite a candidate or promote it into IDENTITIES.md.
  fs.writeFileSync(path.join(directory, basename + '.json'), JSON.stringify(cleaned, null, 2) + '\n', { flag: 'wx' });
  const markdown = ['# Candidate: ' + opt.slug, '', '**Priority: unconfirmed.** A candidate is not a discovery.', '', cleaned.statement,
    '', 'Check passed: ' + cleaned.checkPassed, 'Failure: ' + (cleaned.failure || 'none'), 'Family: ' + cleaned.family,
    'Domain: ' + JSON.stringify(cleaned.domain), 'Numeric result: ' + JSON.stringify(cleaned.numericResult),
    'Miss condition: ' + cleaned.missCondition, 'Commit: ' + commit, 'Reproduce: `' + cleaned.reproduceCommand + '`',
    '', '## Offline literature comparison', cleaned.literature.classification, cleaned.literature.limitation || cleaned.literature.error,
    '', '## Exact queries for a separate human search', ...cleaned.literature.queries.map(q => '- ' + q),
    '', 'Full source hashes, match locations and seeded plate results are in the adjacent JSON. Only a human may promote a reviewed statement.', ''].join('\n');
  fs.writeFileSync(path.join(directory, basename + '.md'), markdown, { flag: 'wx' });
  const draft = ['# RESEARCH.md draft, ' + candidate.created.slice(0, 10), '', 'Offline-only comparison for ' + opt.slug + '.',
    'Classification: ' + cleaned.literature.classification + '. Priority: unconfirmed.',
    'Candidate: identities/candidates/' + basename + '.json', 'No online search was run. Queries for later review:',
    ...cleaned.literature.queries.map(q => '- ' + q), ''].join('\n');
  fs.writeFileSync(path.join(directory, basename + '-research-draft.md'), draft, { flag: 'wx' });
  if (process.env.GENCHASE_JOB_DIR) {
    save(path.join(process.env.GENCHASE_JOB_DIR, 'candidate.json'), cleaned);
    fs.writeFileSync(path.join(process.env.GENCHASE_JOB_DIR, 'research-draft.md'), draft);
  }
  console.log('Candidate saved: identities/candidates/' + basename + '.json');
  console.log('Offline classification: ' + cleaned.literature.classification + '. Priority: unconfirmed.');
  if (failure) process.exitCode = 1;
}
module.exports = { options, sweep, plate, main };
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
