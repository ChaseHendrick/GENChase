// Own the complete process group. A dead server must not leave an overnight job orphaned.
'use strict';
const { spawn } = require('node:child_process');
const parent = process.ppid;
const spec = JSON.parse(process.env.GENCHASE_JOB_SPEC);
delete process.env.GENCHASE_JOB_SPEC;
function terminateGroup() { try { process.kill(-process.pid, 'SIGKILL'); } catch { process.exit(1); } }
const watchdog = setInterval(() => {
  if (process.ppid !== parent) terminateGroup();
  try { process.kill(parent, 0); } catch { terminateGroup(); }
}, 1000);
// Run the command under POSIX sh so that `times` can report the CPU time of the command and every descendant it
// waited for. The arguments pass as positional parameters, never through shell parsing. Signals are caught with a
// no-op handler, which children reset to default, so the shell outlives the command and still exits with its status.
const timesFile = process.env.GENCHASE_JOB_DIR && require('node:path').join(process.env.GENCHASE_JOB_DIR, 'cpu-times.txt');
const script = 'trap : INT TERM HUP; "$0" "$@"; s=$?; times > "$GENCHASE_TIMES_FILE" 2>/dev/null; exit $s';
const child = timesFile && process.platform !== 'win32'
  ? spawn('/bin/sh', ['-c', script, spec.executable, ...spec.args], { cwd: spec.root, stdio: ['ignore', 'inherit', 'inherit'], shell: false, env: { ...process.env, GENCHASE_TIMES_FILE: timesFile } })
  : spawn(spec.executable, spec.args, { cwd: spec.root, stdio: ['ignore', 'inherit', 'inherit'], shell: false });
child.on('error', e => { console.error('Could not start job: ' + e.message); clearInterval(watchdog); process.exitCode = 1; });
child.on('exit', (code, signal) => { clearInterval(watchdog); process.exitCode = code === null ? 1 : code; if (signal) console.error('Child stopped by ' + signal); });
process.on('SIGTERM', () => { /* Group signal also reaches all descendants; server escalates after its grace period. */ });
