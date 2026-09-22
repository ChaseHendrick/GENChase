'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { Jobs } = require('./jobs');
const { Shares } = require('./share');
const { browserSetup } = require('./setup');
const { redact } = require('./privacy');
const { MODES, EXPERIMENTS, ids } = require('./commands');
const ROOT = path.resolve(__dirname, '../..');
function createServer({ root = ROOT, data, port = 8787, shareRequest } = {}) {
  if (process.platform === 'win32') throw Error('This runner requires POSIX process groups. macOS and Linux are supported.');
  data ||= path.join(root,'apps/validate/.runs');
  fs.mkdirSync(data,{recursive:true,mode:0o700});
  const token = crypto.randomBytes(32).toString('hex');
  const lock = path.join(data, 'server.lock');
  try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 }); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const pid = Number(fs.readFileSync(lock, 'utf8')); let alive = true;
    try { process.kill(pid, 0); } catch (err) { if (err.code === 'ESRCH') alive = false; }
    if (alive || !Number.isInteger(pid) || pid <= 0) throw Error('A validator server already owns this job folder. Open its existing URL.');
    fs.unlinkSync(lock); fs.writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 });
  }
  let jobs;
  try { jobs=new Jobs(root,data); } catch(e) { fs.unlinkSync(lock); throw e; }
  const shares = new Shares(root, data, shareRequest);
  jobs.onFinished = job => { if (job.input.shareAutomatically === true) { try { const preview = shares.preview(job.id); shares.start(job.id, preview.digest); } catch(e) { shares.save(job.id, {status:'failed', message:redact(e.message,{root})}); } } };
  const reply = (res, status, body, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    res.end(type === 'application/json' ? JSON.stringify(body) : body);
  };
  const server = http.createServer(async (req, res) => {
    try {
      if(closing)return reply(res,503,{error:'The local server is shutting down.'});
      const origin = 'http://127.0.0.1:' + server.address().port;
      if (req.headers.host !== '127.0.0.1:' + server.address().port || (req.headers.origin && req.headers.origin !== origin)) return reply(res, 403, { error: 'Loopback origin required.' });
      const url = new URL(req.url, origin);
      const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      if (req.method === 'GET' && assets[url.pathname]) {
        const [file, type] = assets[url.pathname]; return reply(res, 200, fs.readFileSync(path.join(__dirname, file), 'utf8'), type);
      }
      if (req.method === 'GET' && url.pathname === '/api/config') return reply(res, 200, { token, modes: MODES, experiments: EXPERIMENTS, ids: ids(root), setup: browserSetup(root) });
      if (req.headers['x-validator-token'] !== token) return reply(res, 403, { error: 'Open the local app before controlling jobs.' });
      if (req.method === 'GET' && url.pathname === '/api/state') return reply(res, 200, {...jobs.state(), submission: jobs.current ? shares.state(jobs.current.id) : null});
      if (req.method === 'GET' && url.pathname === '/api/share-file') return reply(res, 200, shares.read(url.searchParams.get('job'), url.searchParams.get('name')));
      if (req.method === 'GET' && url.pathname === '/api/share-preview') return reply(res, 200, shares.preview(url.searchParams.get('job')));
      if (req.method === 'GET' && url.pathname === '/api/miss') {
        const name=url.searchParams.get('file');
        if(!/^[a-f0-9]{40,64}-[a-z0-9-]+\.json$/.test(name||''))throw Error('Invalid miss selection.');
        const dir=path.join(root,'run/validator/misses'),file=path.join(dir,name);
        if(path.dirname(fs.realpathSync(file))!==fs.realpathSync(dir))throw Error('Miss outside result folder.');
        return reply(res,200,JSON.parse(fs.readFileSync(file,'utf8')));
      }
      if (req.method === 'GET' && url.pathname === '/api/artifact') {
        const id = url.searchParams.get('job'), name = url.searchParams.get('name');
        if (!/^\d{4}-.*-[0-9a-f]{8}$/.test(id || '') || !/^[a-z0-9][a-z0-9.-]*$/.test(name || '')) throw Error('Invalid artifact selection.');
        const file = path.join(jobs.data, id, name), relative = path.relative(fs.realpathSync(jobs.data), fs.realpathSync(file));
        if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(file).isFile()) throw Error('Artifact outside job folder.');
        // Downloads may be large. Stream them rather than buffering hours of logs.
        res.writeHead(200, { 'Content-Type': name.endsWith('.tar.gz') ? 'application/gzip' : 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + name + '"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        fs.createReadStream(file).pipe(res); return;
      }
      if (req.method !== 'POST') return reply(res, 404, { error: 'Not found.' });
      if (req.headers['content-type'] !== 'application/json') return reply(res, 415, { error: 'JSON required.' });
      let body = '';
      for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 8192) return reply(res, 413, { error: 'Request too large.' }); }
      const input = JSON.parse(body || '{}');
      if (url.pathname === '/api/share') return reply(res, 200, shares.start(input.job, input.digest));
      if (url.pathname === '/api/start') return reply(res, 200, jobs.start(input));
      if (url.pathname === '/api/stop') { jobs.stop(); return reply(res, 200, jobs.state()); }
      if (url.pathname === '/api/resume') return reply(res, 200, await jobs.resume());
      if (url.pathname === '/api/power') return reply(res,200,jobs.updatePower(input));
      if (url.pathname === '/api/restart') return reply(res, 200, await jobs.restart());
      return reply(res, 404, { error: 'Not found.' });
    } catch (e) { if (!res.headersSent) reply(res, 400, { error: redact(e.message,{root}) }); else res.destroy(); }
  });
  let closing = false;
  async function close() {
    if (closing) return; closing = true; jobs.stop(); await jobs.wait(); await shares.wait();
    await new Promise(resolve => server.close(resolve));
    if (fs.existsSync(lock) && fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock);
  }
  server.once('error', () => { if (fs.existsSync(lock) && fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock); });
  return { server, jobs, shares, token, close, listen: () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(server.address())); }) };
}
module.exports = { createServer };
if (require.main === module) {
  try {
    const app = createServer();
    app.listen().then(a => console.log('GENChase local validator: http://127.0.0.1:' + a.port + '\nNo model calls or tokens. Keep this terminal open; closing the browser does not stop jobs.')).catch(e => { console.error(e.message); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
