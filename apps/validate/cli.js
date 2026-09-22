// Headless access to the same local job lifecycle, lock, power controls and artifacts.
'use strict';
const { createServer } = require('./server');
const { MODES, EXPERIMENTS } = require('./commands');
const { redact } = require('./privacy');
const HELP = `GENChase headless volunteer runner

  npm run validator:headless -- --mode inventory --machine m1pro
  npm run validator:headless -- --mode witnesses --machine m1pro
  npm run validator:headless -- --mode metal --grid 128 --steps 10000
  npm run validator:headless -- --resume

--mode       ${Object.keys(MODES).join(', ')}, metal, derive, ${Object.keys(EXPERIMENTS).join(', ')}
--machine    Pseudonymous slug, default m1pro. Do not use your name.
--id         Catalog ID for one-module modes
--power      light, balanced (default), maximum
--grid       Metal grid: 32, 64, 128, 192 or 256
--steps      Metal step budget
--n          Polygon order 2 through 5
--samples    Candidate sweep size
--slug       Candidate file slug
--allow-battery  Continue on battery; thermal protection stays enabled
--no-thermal-pause  Disable thermal pausing when you explicitly choose to run without it
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
    if (flag === '--resume') { resume = true; continue; }
    if (flag === '--allow-battery') { input.power.pauseOnBattery = false; continue; }
    const key = { '--mode': 'mode', '--machine': 'machineSlug', '--id': 'id', '--workspace': 'workspace', '--grid': 'grid', '--steps': 'steps', '--n': 'n', '--samples': 'samples', '--slug': 'slug', '--power': 'power' }[flag];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw Error('Unknown or missing option: ' + flag);
    const value = args[++i];
    if (key === 'power') input.power.mode = value;
    else input[key] = ['grid', 'steps', 'n', 'samples'].includes(key) ? Number(value) : value;
    if (key === 'workspace') explicitWorkspace = true;
  }
  if (resume && args.length !== 1) throw Error('--resume uses saved settings and must be used alone.');
  if (!explicitWorkspace && (['metal', 'derive'].includes(input.mode) || EXPERIMENTS[input.mode])) input.workspace = 'contribute';
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
    console.log('Review hardware.json, paste-packet.md and any misses before sharing. No files were uploaded.');
    return interrupted ? 130 : job.exitCode ?? 1;
  } finally { clearInterval(timer); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); await app.close(); }
}
module.exports = { parse, main };
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(e => { console.error(redact(e.message)); process.exitCode = 1; });
