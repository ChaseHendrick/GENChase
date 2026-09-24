// Headless access to the same local job lifecycle, lock, power controls and artifacts.
'use strict';
const { createServer } = require('./server');
const { MODES, EXPERIMENTS } = require('./commands');
const { ART_MODES } = require('./art-tabs');
const { redact } = require('./privacy');
const { describe } = require('./compute');
const HELP = `GENChase headless volunteer runner

  npm run validator:headless -- --mode inventory --machine m1pro
  npm run validator:headless -- --mode witnesses --machine m1pro
  npm run validator:headless -- --mode metal --grid 128 --steps 10000
  npm run validator:headless -- --mode vortex-collapse --alpha 1 --n 6 --samples 200
  npm run validator:headless -- --mode vortex-grow --alpha 0 --n 24 --samples 10 --threads 4
  npm run validator:headless -- --mode vortex-threshold --alpha 1 --n 16 --to 3
  npm run validator:headless -- --mode art-hunt --id turing --samples 24 --keep 6
  npm run validator:headless -- --mode art-deep --recipe '#cahn/cahn-1958' --steps 2000 --inches 20
  npm run validator:headless -- --mode art-evolve --parent '#turing/h-1a' --samples 12
  npm run validator:headless -- --resume

--mode       ${Object.keys(MODES).join(', ')}, metal, derive, vortex-collapse, vortex-grow, vortex-threshold, ${ART_MODES.join(', ')}, ${Object.keys(EXPERIMENTS).join(', ')}
--machine    Pseudonymous slug, default m1pro. Do not use your name.
--id         Catalog ID for one-module modes
--power      light, balanced (default), maximum
--grid       Metal grid: 32, 64, 128, 192 or 256
--steps      Metal step budget; art-deep simulation steps (the recipe's warmup, at most the tab's own maximum)
--n          Polygon order 2 through 5; vortex count 3 through 16 for vortex-collapse; target 5 through 128 for vortex-grow
--samples    Candidate sweep size; seeds per vortex-collapse job or per vortex-grow step
--alpha      Vortex kernel exponent in (-2, 3]: 0 Euler, 1 surface quasi-geostrophic
--start      First seed of a vortex-collapse block; random if omitted
--threads    Worker threads for vortex jobs, up to your logical cores; results do not depend on it
--to         End alpha for vortex-threshold: follow the recorded minimum at --alpha, --n until it stops rotating
--slug       Candidate file slug
--recipe     Art: a studio recipe hash (#id/seed/payload); required for art-deep, the base of an art-hunt
--parent     Art: a parent recipe hash for art-evolve; repeat for up to 6 parents of one tab
--vary       Art hunt: seed (the only choice in this release)
--keep       Art: prints kept for the best candidates, 0 to 24 (default 6)
--inches     Art: print long edge in inches (default 8; 20 for art-deep)
--ppi        Art: 300, 360, 450 or 600 (default 300)
--budget     Art: active minutes; a hunt stops starting candidates, a deep render refuses to start
--generations  Art evolve: generations per job (1 in this release)
--allow-battery  Continue on battery; thermal protection stays enabled
--no-thermal-pause  Disable thermal pausing when you explicitly choose to run without it
--share      Publicly submit this run and its failures through authenticated GitHub CLI
--resume     Resume the latest checkpoint with its saved settings

No browser UI or model tokens. Scientific checks may launch a headless browser.
Keep this terminal open. Ctrl+C stops the entire job. Files stay local until you upload them.
See apps/validate/HEADLESS.md for setup and contribution instructions.
`;
function parse(args) {
  const input = { workspace: 'validate', mode: 'all', machineSlug: 'm1pro', power: { mode: 'balanced', pauseOnBattery: true, thermalPause: true } };
  let resume = false, explicitWorkspace = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--help') return { help: true };
    if (flag === '--no-thermal-pause') { input.power.thermalPause = false; continue; }
    if (flag === '--share') { input.shareAutomatically = true; continue; }
    if (flag === '--resume') { resume = true; continue; }
    if (flag === '--allow-battery') { input.power.pauseOnBattery = false; continue; }
    const key = { '--mode': 'mode', '--machine': 'machineSlug', '--id': 'id', '--workspace': 'workspace', '--grid': 'grid', '--steps': 'steps', '--n': 'n', '--samples': 'samples', '--slug': 'slug', '--alpha': 'alpha', '--start': 'start', '--threads': 'threads', '--to': 'to', '--power': 'power',
      '--recipe': 'recipe', '--parent': 'parents', '--vary': 'vary', '--keep': 'keep', '--inches': 'inches', '--ppi': 'ppi', '--budget': 'budget', '--generations': 'generations' }[flag];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw Error('Unknown or missing option: ' + flag);
    const value = args[++i];
    if (key === 'power') input.power.mode = value;
    else if (key === 'parents') (input.parents ||= []).push(value);
    else input[key] = ['grid', 'steps', 'n', 'samples', 'alpha', 'start', 'threads', 'to', 'keep', 'inches', 'ppi', 'budget', 'generations'].includes(key) ? Number(value) : value;
    if (key === 'workspace') explicitWorkspace = true;
  }
  if (resume && args.length !== 1) throw Error('--resume uses saved settings and must be used alone.');
  if (!explicitWorkspace && (['metal', 'derive', 'vortex-collapse', 'vortex-grow', 'vortex-threshold', ...ART_MODES].includes(input.mode) || EXPERIMENTS[input.mode])) input.workspace = 'contribute';
  return { input, resume };
}
async function main(args = process.argv.slice(2)) {
  const options = parse(args); if (options.help) { console.log(HELP); return 0; }
  const app = createServer({ port: 0 }); let timer, interrupted = false;
  const stop = () => { interrupted = true; app.jobs.stop(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    await app.listen();
    if (options.resume) await app.jobs.resume(); else app.jobs.start(options.input);
    console.log('Running locally: ' + app.jobs.current.command + '\nKeep this terminal open. Ctrl+C stops the job.');
    let previous = '';
    const show = () => {
      const state = app.jobs.state(), p = state.job?.progress;
      const line = [state.status, state.job?.now, p ? p.done + '/' + p.total + ' ' + (p.unit || 'checks') : '', state.job?.power?.reason || ''].filter(Boolean).join(' | ');
      if (line !== previous) { console.log(redact(line)); previous = line; }
    };
    show(); timer = setInterval(show, 1000); await app.jobs.wait(); show();
    const job = app.jobs.current;
    console.log('Exit: ' + job.exitCode + '. Result folder: ~/GENChase/apps/validate/.runs/' + job.id + '/');
    console.log('Compute: ' + describe(job.compute) + '.');
    await app.shares.wait();
    const submission = app.shares.state(job.id);
    console.log(submission.status === 'not-shared' ? 'Files remain local. Use --share to submit directly.' : 'Sharing: ' + submission.status + ' ' + (submission.url || submission.message));
    if (job.input.shareAutomatically && submission.status !== 'shared') return 1;
    return interrupted ? 130 : job.exitCode ?? 1;
  } finally { clearInterval(timer); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); await app.close(); }
}
module.exports = { parse, main };
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(e => { console.error(redact(e.message)); process.exitCode = 1; });
