// Run the registered evidence for explicitly selected techniques, without shell commands.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), os = require('node:os');
const ROOT = path.resolve(__dirname, '..');
const STATUSES = ['unvalidated', 'partially validated', 'validated within stated limits'];
const USAGE = `Usage: node tools/verify.js [--list] [--print] <technique-id> ...
       node tools/verify.js [--list] [--print] --all

--list   Show the plan without executing checks or checking inventory freshness.
--print  Include registered print evidence as well as numerical evidence.
--all    Explicitly select every record, including techniques missing evidence.

Passing registered checks supports their stated scopes, not scientific certification.
See tools/VERIFY.md and BUILDING.md for setup and exit codes.`;

function parseArgs(args) {
  const options = { ids: [], list: false, print: false, all: false, help: false };
  for (const arg of args) {
    if (arg === '--list') options.list = true;
    else if (arg === '--print') options.print = true;
    else if (arg === '--all') options.all = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('-')) throw Error('Unknown option: ' + arg);
    else options.ids.push(arg);
  }
  if (!options.help && ((!options.all && !options.ids.length) || (options.all && options.ids.length))) {
    throw Error('Select technique IDs or --all; do not combine them.');
  }
  return options;
}

function nodeTest(root, name) {
  if (typeof name !== 'string' || !/^tools\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.js$/.test(name)) {
    throw Error('Unsupported test path: ' + JSON.stringify(name) + '. Expected a tools/*.js file.');
  }
  const toolsRoot = fs.realpathSync(path.join(root, 'tools'));
  const toolsRelative = path.relative(fs.realpathSync(root), toolsRoot);
  if (toolsRelative === '..' || toolsRelative.startsWith('..' + path.sep) || path.isAbsolute(toolsRelative)) {
    throw Error('The tools/ directory escapes the repository.');
  }
  const absolute = fs.realpathSync(path.join(root, name));
  const relative = path.relative(toolsRoot, absolute);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || !fs.statSync(absolute).isFile()) {
    throw Error('Test path escapes tools/ or is not a file: ' + name);
  }
  if (absolute === fs.realpathSync(path.join(root, 'tools/verify.js'))) throw Error('The evidence runner cannot run itself.');
  return absolute;
}

function createPlan(root, records, options) {
  if (!Array.isArray(records)) throw Error('Expected a validation record array.');
  const byId = new Map();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || byId.has(record.id)) throw Error('Missing or duplicate validation ID.');
    byId.set(record.id, record);
  }
  const ids = options.all ? [...byId.keys()] : [...new Set(options.ids)];
  const tests = new Map(), selected = [], gaps = [];
  for (const id of ids) {
    const record = byId.get(id);
    if (!record) throw Error('Unknown technique ID: ' + id);
    if (!STATUSES.includes(record.status)) throw Error('Unsupported scientific status: ' + id);
    selected.push({ id, status: record.status });
    for (const kind of options.print ? ['numerical', 'print'] : ['numerical']) {
      if (!Array.isArray(record[kind])) throw Error('Missing ' + kind + ' evidence list: ' + id);
      if (!record[kind].length) gaps.push({ id, kind });
      for (const evidence of record[kind]) {
        const absolute = nodeTest(root, evidence.test);
        if (!tests.has(absolute)) tests.set(absolute, { path: evidence.test, absolute, uses: [] });
        const uses = tests.get(absolute).uses, use = id + ' (' + kind + ')';
        if (!uses.includes(use)) uses.push(use);
        // evidence.command is documentation, never input to a shell or argument parser.
      }
    }
  }
  return { selected, tests: [...tests.values()], gaps };
}

function execute(root, script, args = []) {
  const result = cp.spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) { console.error('Could not start ' + path.basename(script) + ': ' + result.error.message); return 1; }
  if (result.signal) { console.error('Stopped by signal: ' + result.signal); return 128 + (os.constants.signals[result.signal] || 0); }
  return result.status === null ? 1 : result.status;
}

function main(args = process.argv.slice(2), root = ROOT) {
  let options, plan;
  try {
    options = parseArgs(args);
    if (options.help) { console.log(USAGE); return 0; }
    const records = JSON.parse(fs.readFileSync(path.join(root, 'validation/techniques.json'), 'utf8'));
    plan = createPlan(root, records, options);
  } catch (error) { console.error(error.message + '\n\n' + USAGE); return 2; }

  console.log('Selected scientific status (labels are unchanged by this runner):');
  for (const record of plan.selected) console.log('  ' + record.id + ': ' + record.status);
  for (const gap of plan.gaps) console.log('  MISSING ' + gap.kind + ' evidence: ' + gap.id);
  console.log(plan.tests.length + ' distinct registered test(s):');
  for (const test of plan.tests) console.log('  ' + test.path + ' — ' + test.uses.join(', '));
  if (!options.print) console.log('Print checks are excluded; add --print to include registered print evidence.');
  if (options.list) { console.log('Plan only. No checks ran; source/build/inventory freshness is unverified.'); return 0; }

  for (const [name, args] of [['tools/build.js', ['--check']], ['tools/science.js', []]]) {
    console.log('\nChecking consistency: ' + name);
    let script;
    try { script = nodeTest(root, name); }
    catch (error) { console.error(error.message); return 2; }
    const code = execute(root, script, args);
    if (code) { console.error('Consistency check failed; no registered evidence tests ran.'); return code; }
  }
  const resume = process.env.GENCHASE_VERIFY_CHECKPOINT && (!process.env.GENCHASE_CHECKPOINT_ROOT || path.resolve(root) === path.resolve(process.env.GENCHASE_CHECKPOINT_ROOT))
    ? require('../apps/validate/checkpoint').checkpoint(root, { ids: options.ids, all: options.all, print: options.print })
    : { has: () => false, mark() {} };
  for (const test of plan.tests) {
    if (resume.has(test.path)) { console.log('Resumed ' + test.path + ' (previously passed in the same source/environment context)'); continue; }
    console.log('\nRunning ' + test.path);
    const code = execute(root, test.absolute);
    if (code) {
      console.error('FAILED: ' + test.path + ' (exit ' + code + '). Remaining tests were not run.');
      console.error('For missing Playwright or Chromium, use the development setup in BUILDING.md: npm install --no-save playwright@1.49.1; npx playwright install chromium.');
      return code;
    }
    resume.mark(test.path);
  }
  if (plan.gaps.length) {
    console.log('\nINCOMPLETE: ' + plan.tests.length + ' registered test(s) passed, but ' + plan.gaps.length + ' requested evidence list(s) are missing.');
    return 2;
  }
  const incomplete = plan.selected.filter(record => record.status !== 'validated within stated limits').length;
  console.log('\nRegistered checks passed within their recorded scopes. ' + incomplete + ' selected technique(s) still lack full validation within stated limits.');
  console.log('No scientific status, result artifact, or originality claim was changed.');
  return 0;
}

module.exports = { parseArgs, createPlan, main };
if (require.main === module) process.exitCode = main();
