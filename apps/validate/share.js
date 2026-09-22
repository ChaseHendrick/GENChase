'use strict';
// Optional network boundary. Computation never needs GitHub or credentials.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const { sanitize, redact } = require('./privacy');
const TARGET = 'SharpMeow/GENChase';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function gh(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn('gh', ['api', '--hostname', 'github.com', '--method', method, endpoint, ...(body ? ['--input', '-'] : [])], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, GH_PROMPT_DISABLED: '1' } });
    let output = '', errors = '', length = 0;
    const timer = setTimeout(() => child.kill(), 60000);
    child.stdout.on('data', b => { length += b.length; if (length > 16 * 1024 * 1024) child.kill(); else output += b; });
    child.stderr.on('data', b => { errors = (errors + b).slice(-4096); });
    child.stdin.on('error', () => {});
    child.on('error', () => { clearTimeout(timer); reject(Error('Install GitHub CLI and run gh auth login --hostname github.com first.')); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) { const error = Error('GitHub request failed. Check gh auth status, connection and repository access, then retry.'); error.status = Number(errors.match(/HTTP (\d{3})/)?.[1]) || 0; return reject(error); }
      try { resolve(output.trim() ? JSON.parse(output) : {}); } catch { reject(Error('Invalid GitHub response. Retry the submission.')); }
    });
    child.stdin.end(body ? JSON.stringify(body) : undefined);
  });
}
function folder(data, id) {
  if (!/^\d{4}-\d\d-\d\dT[0-9TZ.-]+-[a-f0-9]{8}$/.test(id || '')) throw Error('Invalid job ID.');
  const dir = path.join(data, id);
  if (fs.lstatSync(dir).isSymbolicLink() || path.dirname(fs.realpathSync(dir)) !== fs.realpathSync(data)) throw Error('Job outside result folder.');
  return dir;
}
function pack(root, data, id) {
  const dir = folder(data, id), files = []; let total = 0;
  function add(name) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) return;
    const rel = path.relative(fs.realpathSync(dir), fs.realpathSync(file));
    if (rel.startsWith('..') || path.isAbsolute(rel) || fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile()) throw Error('Unsafe result file: ' + name);
    if (fs.statSync(file).size > 8 * 1024 * 1024) throw Error('Result exceeds 8 MB: ' + name + '. Use the downloadable bundle for this run.');
    const raw = fs.readFileSync(file, 'utf8');
    const content = name.endsWith('.json') ? JSON.stringify(sanitize(JSON.parse(raw), { root }), null, 2) + '\n' : redact(raw, { root });
    total += Buffer.byteLength(content);
    if (total > 20 * 1024 * 1024 || files.length >= 500) throw Error('Submission exceeds 20 MB or 500 files. Use the downloadable bundle for this run.');
    files.push({ name, content, bytes: Buffer.byteLength(content), sha256: sha(content) });
  }
  const job = JSON.parse(fs.readFileSync(path.join(dir, 'job.json'), 'utf8'));
  if (!['complete', 'failed'].includes(job.status) || !job.ended) throw Error('Wait for the job to finish before sharing.');
  // Allowlisted reports only. Never source snapshots, archives, arbitrary changed files or credentials.
  for (const name of ['job.json', 'hardware.json', 'witnesses.json', 'harvest-report.json', 'miss.json', 'verify-checkpoint.json', 'source-before.json', 'job.log', 'paste-packet.md']) add(name);
  function walk(relative) {
    const base = path.join(dir, relative); if (!fs.existsSync(base)) return;
    if (fs.lstatSync(base).isSymbolicLink()) throw Error('Symlink in evidence folder.');
    for (const entry of fs.readdirSync(base, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw Error('Symlink in evidence folder.');
      const name = relative + '/' + entry.name;
      if (entry.isDirectory()) walk(name); else if (entry.isFile() && entry.name.endsWith('.json')) add(name);
    }
  }
  walk('outputs/validation/results'); walk('misses');
  if (!files.some(f => f.name === 'hardware.json')) throw Error('Hardware evidence missing; repair the run before sharing.');
  const manifest = {schemaVersion:1, job:id, sourceCommit:job.commit, status:job.status, exitCode:job.exitCode, sourceSnapshotIncluded:false, files:files.map(({name,bytes,sha256})=>({name,bytes,sha256}))};
  const content=JSON.stringify(manifest,null,2)+'\n'; files.push({name:'manifest.json',content,bytes:Buffer.byteLength(content),sha256:sha(content)}); total+=Buffer.byteLength(content);
  const digest = sha(JSON.stringify(files.map(({ name, sha256 }) => ({ name, sha256 }))));
  return { job, files, bytes: total, digest, target: TARGET };
}
class Shares {
  constructor(root, data, request = gh) { this.root = root; this.data = data; this.request = request; this.pending = new Map(); }
  state(id) { try { const s = JSON.parse(fs.readFileSync(path.join(folder(this.data, id), 'submission.json'))); if (s.status === 'uploading' && !this.pending.has(id)) return { ...s, status: 'interrupted', message: 'Upload interrupted. Retry to recover the existing submission.' }; return s; } catch { return { status: 'not-shared' }; } }
  read(id, name) { const file=pack(this.root,this.data,id).files.find(f=>f.name===name); if(!file)throw Error('File is not included in this submission.'); return {name:file.name,content:file.content}; }
  preview(id) { const p = pack(this.root, this.data, id); return { target: p.target, digest: p.digest, bytes: p.bytes, status: p.job.status, files: p.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })) }; }
  save(id, value) { const file = path.join(folder(this.data, id), 'submission.json'); fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2), { mode: 0o600 }); fs.renameSync(file + '.tmp', file); }
  start(id, digest) {
    if (this.pending.has(id)) return this.state(id);
    const p = pack(this.root, this.data, id);
    if (digest !== p.digest) throw Error('Results changed. Review the file list again before sharing.');
    const old = this.state(id);
    if (old.status === 'shared' && old.digest === digest) return old;
    this.save(id, { status: 'uploading', digest, message: 'Connecting to GitHub...' });
    const task = this.upload(id, p).catch(e => this.save(id, { status: 'failed', digest, message: redact(e.message, {root:this.root}) })).finally(() => this.pending.delete(id));
    this.pending.set(id, task); return this.state(id);
  }
  async wait() { await Promise.all([...this.pending.values()]); }
  async upload(id, p) {
    const api = this.request, user = await api('GET', 'user');
    if (!/^[a-zA-Z0-9-]+$/.test(user.login)) throw Error('Invalid GitHub account.');
    const repo = user.login.toLowerCase() === 'sharpmeow' ? TARGET : user.login + '/GENChase';
    const progress = message => this.save(id, { status: 'uploading', digest:p.digest, message });
    if (repo !== TARGET) {
      let fork;
      try { fork = await api('GET', 'repos/' + repo); } catch(e) { if(e.status !== 404) throw e; fork = await api('POST', 'repos/' + TARGET + '/forks', {}); }
      if (fork.full_name?.toLowerCase() !== repo.toLowerCase() || (!fork.fork) || (fork.parent && fork.parent.full_name !== TARGET)) throw Error('Your GENChase repository must be a fork of SharpMeow/GENChase.');
    }
    const branch = 'evidence/' + id + '-' + p.digest.slice(0, 12);
    const query = 'repos/' + TARGET + '/pulls?state=all&head=' + encodeURIComponent(user.login + ':' + branch);
    const finish = pr => {
      if (!new RegExp('^https://github.com/SharpMeow/GENChase/pull/[0-9]+$').test(pr.html_url)) throw Error('Invalid submission URL.');
      this.save(id, { status:'shared', digest:p.digest, url:pr.html_url, message:'Submitted for review. Scientific labels are unchanged.' });
    };
    const existing = await api('GET', query); if (existing.length) return finish(existing[0]);
    progress('Uploading evidence files, including failures...');
    let ref;
    try { ref = await api('GET', 'repos/' + repo + '/git/ref/heads/' + branch); } catch(e) { if(e.status !== 404) throw e; }
    if (!ref) {
      const baseRepo = await api('GET', 'repos/' + TARGET);
      const base = await api('GET', 'repos/' + TARGET + '/commits/' + encodeURIComponent(baseRepo.default_branch));
      const tree = await api('POST', 'repos/' + repo + '/git/trees', { base_tree:base.commit.tree.sha, tree:p.files.map(f => ({path:'validation/submissions/' + id + '/' + f.name, mode:'100644', type:'blob', content:f.content})) });
      const commit = await api('POST', 'repos/' + repo + '/git/commits', { message:'Record local validation evidence ' + id, tree:tree.sha, parents:[base.sha], author:{name:'Chaos',email:'326338179+SharpMeow@users.noreply.github.com'} });
      await api('POST', 'repos/' + repo + '/git/refs', { ref:'refs/heads/' + branch, sha:commit.sha });
    }
    progress('Opening the evidence review...');
    const baseRepo = await api('GET', 'repos/' + TARGET);
    const pr = await api('POST', 'repos/' + TARGET + '/pulls', { title:'Validation evidence: ' + id, head:user.login + ':' + branch, base:baseRepo.default_branch, body:'Local run submitted by @' + user.login + '.\n\nStatus: ' + p.job.status + '; exit: ' + p.job.exitCode + '.\nSource: ' + p.job.commit + '.\nEvidence digest: ' + p.digest + '.\n\nIncludes recorded failures, missing evidence, hardware and available numerical data. No validation status or originality claim is promoted. Files and stated limits require review.' });
    finish(pr);
  }
}
module.exports = { Shares, pack, gh };
