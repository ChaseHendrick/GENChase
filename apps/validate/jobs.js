'use strict';
const { energyCounter, energyBetween, parseTimes, jobCompute, describe } = require('./compute');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process'), crypto = require('node:crypto');
const { StringDecoder } = require('node:string_decoder');
const { command } = require('./commands');
const { browserSetup, requiresBrowser } = require('./setup');
const { Power, settings } = require('./power');
const { redact, sanitize } = require('./privacy');
const { hardwareCard } = require('./hardware');
const processTree=require('./process-tree');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function git(root, args) {
  const r = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw Error('Git metadata unavailable: ' + (r.stderr || r.error?.message || 'unknown error'));
  return r.stdout.trim();
}
function files(root) {
  const names = git(root, ['ls-files', '-co', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  const out = {};
  for (const name of new Set(names)) {
    if (name.startsWith('apps/validate/.runs/') || name.startsWith('run/validator/')) continue;
    const p = path.join(root, name);
    if (fs.existsSync(p) && fs.lstatSync(p).isFile()) out[name] = digest(fs.readFileSync(p));
  }
  return out;
}
function save(file, object) { fs.writeFileSync(file + '.tmp', JSON.stringify(object, null, 2) + '\n', { mode: 0o600 }); fs.renameSync(file + '.tmp', file); }
function logTail(file, maximum=200000) {
  const fd=fs.openSync(file,'r');
  try {
    const size=fs.fstatSync(fd).size, start=Math.max(0,size-maximum), buffer=Buffer.alloc(Math.min(size,maximum));
    const length=fs.readSync(fd,buffer,0,buffer.length,start);
    let text=buffer.subarray(0,length).toString('utf8');
    if(start) { const newline=text.indexOf('\n'); text=newline<0?text.slice(-8000):text.slice(newline+1); }
    return text.split('\n').slice(-800).map(line=>line.slice(-8000));
  } finally { fs.closeSync(fd); }
}
class Jobs {
  constructor(root, data = path.join(root, 'apps/validate/.runs')) {
    this.privacy = {root};
    this.root = root; this.data = data; this.current = null; this.child = null; this.lastInput = null; this.tail = [];
    fs.mkdirSync(data, { recursive: true, mode: 0o700 });
    const previous = fs.readdirSync(data).filter(n => /^\d{4}-.*-[0-9a-f]{8}$/.test(n)).sort().at(-1);
    if (previous) {
      try {
        this.current = JSON.parse(fs.readFileSync(path.join(data, previous, 'job.json')));
        this.lastInput = this.current.input;
        this.tail = logTail(path.join(data, previous, 'job.log'));
        if (['running', 'stopping'].includes(this.current.status)) {
          this.current.status = 'failed'; this.current.interrupted=true; this.current.reason = 'Server was interrupted. The worker watchdog stops orphaned computation.';
          this.current.ended = new Date().toISOString(); this.current.exitCode = null;
          this.evidence(); this.packet();
        }
      } catch { this.current = null; }
    }
  }
  misses() {
    const dir=path.join(this.root,'run/validator/misses');
    if(!fs.existsSync(dir))return [];
    return fs.readdirSync(dir).filter(file=>/^[a-f0-9]{40,64}-[a-z0-9-]+\.json$/.test(file)).sort().reverse().map(file=>{
      try { const value=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));return sanitize({...value,file},this.privacy); } catch { return {file,kind:'unreadable',reason:'Miss record could not be read.'}; }
    });
  }
  state() {
    const job = this.current;
    return { misses:this.misses(), status: job?.status || 'idle', resumeAvailable: this.resumeAvailable(), job, log: this.tail.join('\n'),
      elapsed: job ? Math.max(0, ((job.ended ? Date.parse(job.ended) : Date.now()) - Date.parse(job.started)) / 1000) : 0 };
  }
  active() { return this.child !== null; }
  append(text) {
    if (!this.current || !text) return;
    this.pending += text;
    let at;
    while ((at = this.pending.indexOf('\n')) >= 0) {
      const raw=this.pending.slice(0,at); this.pending=this.pending.slice(at+1);
      const line=this.droppingLongLine?'[Oversized log line omitted]':redact(raw.replace(/\r/g,''),this.privacy);
      this.droppingLongLine=false;
      try { fs.appendFileSync(path.join(this.data,this.current.id,'job.log'),line+'\n'); }
      catch(e) { this.current.reason=redact('Cannot save log: '+e.message,this.privacy);this.stop();return; }
      this.tail.push(line.slice(-8000));this.tail=this.tail.slice(-800);this.current.lastLine=line.slice(-2000);this.progress(line);
    }
    // Avoid unlimited memory when a process prints binary data or no line breaks.
    if(this.pending.length>1024*1024) { this.pending='';this.droppingLongLine=true; }
  }
  progress(line) {
    const j = this.current;
    const count = /^(\d+) distinct registered test\(s\):$/.exec(line);
    if (count) { j.planned = Number(count[1]); j.progress = null; j.runningTest = null; }
    if (/^Running tools\//.test(line) && j.planned) {
      const done = j.runningTest ? (j.progress?.done || 0) + 1 : 0;
      j.runningTest = line.slice(8); j.now = j.runningTest; j.progress = { done, total: j.planned };
    }
    if (/^INCOMPLETE: .* registered test\(s\) passed/.test(line)) { j.incomplete = true; j.progress = { done: j.planned, total: j.planned }; }
    if (/^Resumed tools\//.test(line) && j.planned) { j.progress = { done: (j.progress?.done || 0) + 1, total: j.planned }; j.now = line; }
    if (line.startsWith('{')) { try { const p=JSON.parse(line); if(p.type==='progress' && Number.isInteger(p.done) && Number.isInteger(p.total) && p.done>=0 && p.done<=p.total){j.progress={done:p.done,total:p.total,unit:'steps'};j.now='Apple GPU wave step '+p.done;} } catch {} }
    if (line.startsWith('GENCHASE_HARVEST ')) {
      try { const p=JSON.parse(line.slice(17));if(Number.isInteger(p.done)&&Number.isInteger(p.total)&&p.done>=0&&p.done<=p.total){j.progress={done:p.done,total:p.total,unit:'modules'};j.now=p.id+': '+p.status;} } catch {}
    }
    if (line.startsWith('GENCHASE_PROGRESS ')) {
      try { const p = JSON.parse(line.slice(18)); if (['derive', 'check', 'search'].includes(p.stage)) { j.stage = p.stage; j.now = p.message || p.stage; }
        if (p.unit === 'seeds' && Number.isInteger(p.done) && Number.isInteger(p.total) && p.done >= 0 && p.done <= p.total) j.progress = { done: p.done, total: p.total, unit: 'seeds' }; } catch { /* Ordinary log text is never executable. */ }
    }
  }
  start(input, resumeFrom = null) {
    if (this.active()) throw Error('One job is already running. Stop it before starting another.');
    const spec = command(this.root, input);
    if (requiresBrowser(this.root, spec.input)) { const setup=browserSetup(this.root); if(!setup.ready) throw Error(setup.message); }
    spec.input.power = settings(input.power);
    const before = files(this.root), commit = git(this.root, ['rev-parse', 'HEAD']);
    const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(4).toString('hex');
    const dir = path.join(this.data, id); fs.mkdirSync(dir, { mode: 0o700 });
    const macOS = process.platform === 'darwin' ? cp.spawnSync('/usr/bin/sw_vers', ['-productVersion'], { encoding: 'utf8' }).stdout?.trim() : null;
    this.current = { id, input: spec.input, title: spec.title, command: spec.display, status: 'running', started: new Date().toISOString(), ended: null,
      pid: null, exitCode: null, commit, dirtyAtStart: git(this.root, ['status', '--porcelain']), node: process.version,
      platform: process.platform, arch: process.arch, release: os.release(), macOS, now: spec.title, progress: null, filesWritten: [] };
    this.before = before; this.lastInput = spec.input; this.tail = []; this.pending = ''; this.droppingLongLine=false; this.stopping = false;
    fs.writeFileSync(path.join(dir, 'job.log'), '', { mode: 0o600 });
    save(path.join(dir, 'source-before.json'), before);
    for (const name of Object.keys(before)) {
      const dest = path.join(dir, 'source', name); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(this.root, name), dest);
    }
    if (resumeFrom) for (const name of ['verify-checkpoint.json','derive-checkpoint.json','vortex-checkpoint.json','metal-checkpoint']) {
      const from = path.join(this.data, resumeFrom, name); if (fs.existsSync(from)) fs.cpSync(from, path.join(dir, name), { recursive: true });
    }
    this.current.resumedFrom = resumeFrom;
    this.power = new Power(this, spec.input.power);
    this.energyStart = energyCounter(); this.startedAt = Date.now();
    this.child = cp.spawn(process.execPath, [path.join(__dirname, 'worker.js')], {
      cwd: this.root, detached: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GENCHASE_JOB_SPEC: JSON.stringify({ ...spec, root: this.root }), GENCHASE_JOB_DIR: dir, GENCHASE_JOB_COMMIT: commit, GENCHASE_MACHINE_SLUG: spec.input.machineSlug || 'm1pro', GENCHASE_CHECKPOINT_ROOT: this.root, GENCHASE_VERIFY_CHECKPOINT: path.join(dir, 'verify-checkpoint.json') },
    });
    const child = this.child; this.current.pid = child.pid || null;
    if(child.pid) {
      this.guard=cp.spawn(process.execPath,[path.join(__dirname,'watchdog.js'),String(process.pid),String(child.pid),dir],{detached:true,stdio:'ignore'});
      this.guard.on('error',e=>{this.append('Cleanup guard failed: '+e.message+'\n');this.stop();});
    }
    this.power.start();
    save(path.join(dir, 'job.json'), sanitize(this.current,this.privacy));
    for (const stream of [child.stdout, child.stderr]) {
      const decoder = new StringDecoder('utf8');
      stream.on('data', chunk => this.append(decoder.write(chunk)));
      stream.on('end', () => this.append(decoder.end()));
    }
    child.on('error', e => this.append('Launch failed: ' + e.message + '\n'));
    // Exit can precede close when a grandchild holds an inherited log pipe.
    child.on('exit', () => {
      this.power?.stop(); this.kill('SIGCONT'); this.kill('SIGTERM');
      clearTimeout(this.killTimer);
      this.killTimer=setTimeout(()=>this.kill('SIGKILL'),3000);
    });
    child.on('close', (code, signal) => {
      // Once the leader has exited, surviving descendants cannot be useful work.
      this.kill('SIGCONT'); this.kill('SIGKILL'); this.finish(code, signal);
    });
    return this.state();
  }
  kill(signal) { if(this.child?.pid) {
    try { const dir=path.join(this.data,this.current.id);save(path.join(dir,'process-control.json'),{signal});processTree.signal(this.child.pid,dir,signal); }
    catch(e) { if(e.code!=='ESRCH')this.current.reason=redact(e.message,this.privacy); }
  } }
  stop() {
    if (!this.active() || this.stopping) return;
    this.power?.stop(); this.stopping = true; this.current.status = 'stopping'; this.current.now = 'Stopping the complete process group';
    this.kill('SIGTERM');
    this.killTimer = setTimeout(() => this.kill('SIGKILL'), 3000);
  }
  updatePower(input) {
    const prefs=settings(input);
    if(!this.current)throw Error('Start a job before changing its power settings.');
    this.current.input.power=prefs; this.lastInput=this.current.input;
    this.power?.update(prefs);
    save(path.join(this.data,this.current.id,'job.json'),sanitize(this.current,this.privacy));
    return this.state();
  }
  async resume() {
    if (this.active()) throw Error('Stop the current job before resuming its checkpoint.');
    if (!this.current || !this.resumeAvailable()) throw Error('This job has no supported checkpoint. Use Restart to run it from the beginning.');
    return this.start(this.lastInput, this.current.id);
  }
  resumeAvailable() {
    if (!this.current) return false;
    const dir = path.join(this.data, this.current.id);
    return ['verify-checkpoint.json','derive-checkpoint.json','vortex-checkpoint.json','metal-checkpoint/checkpoint.json'].some(name=>fs.existsSync(path.join(dir,name)));
  }
  async restart() {
    const input = this.lastInput; if (!input) throw Error('Start a job before restarting.');
    this.stop(); await this.wait(); return this.start(input);
  }
  wait() { return new Promise(resolve => { if (!this.active()) return resolve(); const timer = setInterval(() => { if (!this.active()) { clearInterval(timer); resolve(); } }, 50); }); }
  finish(code, signal) {
    this.power?.stop(); clearTimeout(this.killTimer); clearTimeout(this.stopTimer);
    this.guard?.kill(); this.guard=null;
    if (this.pending || this.droppingLongLine) this.append('\n');
    const j = this.current; j.exitCode = code; j.signal = signal; j.ended = new Date().toISOString();
    try { const dir = path.join(this.data, j.id), f = path.join(dir, 'cpu-times.txt');
      j.compute = jobCompute(fs.existsSync(f) ? parseTimes(fs.readFileSync(f, 'utf8')) : null, (Date.now() - this.startedAt) / 1000, energyBetween(this.energyStart, energyCounter()) ?? undefined);
    } catch (e) { j.compute = { recorded: false, note: 'Compute accounting failed: ' + e.message }; }
    j.status = !this.stopping && code === 0 ? 'complete' : 'failed';
    j.reason ||= this.stopping ? 'Stopped by user.' : j.incomplete ? 'Registered checks finished, but requested evidence is missing.' : code === 0 ? 'Command completed. Read its scope and limitations.' : 'Command failed. See the log.';
    if (j.status === 'complete' && j.progress && j.runningTest) j.progress.done = j.progress.total;
    try {
      const after = files(this.root);
      j.filesWritten = Object.entries(after).filter(([name, hash]) => this.before[name] !== hash).map(([name, sha256]) => ({ path: name, sha256 }));
      j.filesRemoved = Object.keys(this.before).filter(name => !after[name]);
      j.sourceChangedDuringJob = Object.keys(this.before).some(name => this.before[name] !== after[name]);
    } catch (e) { j.reason += ' File inventory failed: ' + e.message; }
    this.evidence();
    this.child = null; this.packet();
    try {
      const dir = path.join(this.data, j.id);
      for (const f of j.filesWritten || []) {
        const dest = path.join(dir, 'outputs', f.path); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(this.root, f.path), dest);
      }
      // Freeze every miss for this commit with the run, including scientific misses.
      const misses = path.join(this.root, 'run/validator/misses');
      if (fs.existsSync(misses)) for (const name of fs.readdirSync(misses).filter(n => n.startsWith(j.commit + '-') && n.endsWith('.json'))) {
        const value = JSON.parse(fs.readFileSync(path.join(misses, name), 'utf8'));
        fs.mkdirSync(path.join(dir, 'misses'), {recursive:true});
        save(path.join(dir, 'misses', name), sanitize(value, this.privacy));
      }
      const archive = path.join(this.data, j.id + '.tar.gz');
      const metadata=process.platform==='darwin'?['--uid','0','--gid','0','--uname','','--gname','','--no-xattrs','--no-acls','--no-fflags']:['--owner=0','--group=0','--numeric-owner','--no-xattrs','--no-acls'];
      const result = cp.spawnSync('tar', [...metadata,'-czf', archive, '-C', dir, '.'], { encoding: 'utf8', timeout: 120000,env:{...process.env,COPYFILE_DISABLE:'1'} });
      if (result.status !== 0) throw Error(result.stderr || result.error?.message || 'archive failed');
      fs.renameSync(archive, path.join(dir, 'result-bundle.tar.gz')); j.artifacts.push('result-bundle.tar.gz');
      save(path.join(dir, 'job.json'), sanitize(j,this.privacy));
    } catch(e) { j.reason += ' Bundle failed: ' + e.message; save(path.join(this.data, j.id, 'job.json'), sanitize(j,this.privacy)); }
    this.onFinished?.(j);
  }
  evidence() {
    const j=this.current;
    j.reason=redact(j.reason,this.privacy);
    const dir=path.join(this.data,j.id);let harvest={};
    try { harvest=JSON.parse(fs.readFileSync(path.join(dir,'harvest-report.json'),'utf8')); } catch {}
    try {
      j.hardware=hardwareCard({machineSlug:j.input.machineSlug||'m1pro',commit:j.commit,command:j.command,exitCode:j.exitCode,elapsedSeconds:Math.max(0,(Date.parse(j.ended)-Date.parse(j.started))/1000),browserVersions:harvest.browserVersions||{},webglRenderer:harvest.webglRenderer||null},this.privacy);
      save(path.join(dir,'hardware.json'),j.hardware);
    } catch(e) {j.reason+=' Hardware card failed: '+redact(e.message,this.privacy);}
    if(j.status!=='complete') {
      const miss={format:1,kind:j.incomplete?'incomplete-evidence':j.interrupted?'interrupted-run':this.stopping?'stopped-run':'command-failure',status:j.status,jobId:j.id,commit:j.commit,id:['technique','plate','print','witness'].includes(j.input.mode)?j.input.id:'validator',recipeHash:null,expected:'Command completes with exit code 0; this is an execution check, not a scientific claim.',got:{exitCode:j.exitCode,signal:j.signal||null,reason:j.reason},reason:j.reason,command:j.command,hardwareCard:j.hardware||null,recorded:j.ended};
      const missed=path.join(this.root,'run/validator/misses');fs.mkdirSync(missed,{recursive:true});
      save(path.join(missed,j.commit+'-validator-'+j.id.toLowerCase()+'.json'),sanitize(miss,this.privacy));
      save(path.join(dir,'miss.json'),sanitize(miss,this.privacy));
    }
  }
  packet() {
    const j = this.current, dir = path.join(this.data, j.id);
    j.artifacts = [...fs.readdirSync(dir).filter(n => !n.endsWith('.tmp')), 'job.json', 'paste-packet.md'].filter((v, i, a) => a.indexOf(v) === i);
    save(path.join(dir, 'job.json'), sanitize(j,this.privacy));
    const text = ['# GENChase local job', '', 'Machine evidence, not scientific certification. A candidate is not a discovery.', '',
      'Commit: ' + j.commit, 'Command: ' + j.command, 'Status: ' + j.status, 'Exit code: ' + j.exitCode,
      'Reason: ' + j.reason, 'Started: ' + j.started, 'Ended: ' + j.ended,
      'Environment: ' + JSON.stringify({ node: j.node, platform: j.platform, arch: j.arch, macOS: j.macOS }),
      'Dirty at start: ' + (j.dirtyAtStart || 'no'), 'Existing source changed during job: ' + !!j.sourceChangedDuringJob,
      'Compute: ' + describe(j.compute),
      '', '## Files written or changed (observed, including concurrent edits)', ...(j.filesWritten || []).map(f => '- ' + f.path + ' (' + f.sha256 + ')'),
      '', '## Job artifacts', ...j.artifacts.map(n => '- apps/validate/.runs/' + j.id + '/' + n),
      '', '## Last 80 log lines', '', ...this.tail.slice(-80).map(line => '    ' + line), ''].join('\n');
    fs.writeFileSync(path.join(dir, 'paste-packet.md'), redact(text,this.privacy), { mode: 0o600 });
  }
}
module.exports = { Jobs, save, git, files, logTail };
