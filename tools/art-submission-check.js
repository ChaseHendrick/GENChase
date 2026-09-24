// node tools/art-submission-check.js --base <sha> | <changed file>... | --dir validation/submissions/<job>/art
// Structural check of shared art results before a person reviews them. It runs from the base branch in the
// volunteer-results workflow, so the catalog, the schemas and these rules come from this file's own checkout,
// never from the pull request under review. It checks that:
//   - art/ holds only share.json and the thumbnails share.json lists, at most 12, as plain small JPEGs;
//   - share.json has the expected shape, at most 200 records and 1 MB;
//   - every recipe hash decodes, names a tab in techniques.json and in ART_TABS, and carries only that
//     tab's schema keys plus seed, palette, bg and v;
//   - every recipe is paused (running false) with its recorded step count equal to its warmup;
//   - every thumbnail matches its recorded hash, and every record says validated: false.
// It does not compare pixels: renderers differ, and a recipe reprints its own plate.
// With --base it lists the pull request's changes itself (git diff -z, every change type, no rename
// pairing), so no file name is ever split or quoted by a shell. A changed path under validation/submissions/
// whose job folder is not a job ID (apps/validate/share.js names every folder that way) fails the check.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const tabs = require('../apps/validate/art-tabs');
const TRUSTED = path.resolve(__dirname, '..');
const CLASSES = ['sharp', 'ok', 'soft'];

function listFiles(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const name = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isSymbolicLink()) out.push({ name, symlink: true });
    else if (entry.isDirectory()) out.push(...listFiles(dir, name));
    else out.push({ name });
  }
  return out;
}
function context(root = TRUSTED) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'techniques.json'), 'utf8')).techniques.map(t => t.id);
  return { catalog, schemas: tabs.loadSchemas(root, Object.keys(tabs.ART_TABS)) };
}
function checkFolder(artDir, ctx = context()) {
  const errors = [], fail = message => errors.push(message);
  const files = listFiles(artDir);
  for (const f of files) if (f.symlink) fail(f.name + ' is a symbolic link');
  const share = path.join(artDir, 'share.json');
  if (!fs.existsSync(share)) { fail('share.json is missing'); return errors; }
  if (fs.statSync(share).size > tabs.LIMITS.shareBytes) fail('share.json exceeds 1 MB');
  let s;
  try { s = JSON.parse(fs.readFileSync(share, 'utf8')); } catch { fail('share.json is not JSON'); return errors; }
  if (!s || typeof s !== 'object' || s.schemaVersion !== 1 || s.kind !== 'genchase-art') { fail('share.json is not a genchase-art record, schema version 1'); return errors; }
  if (!tabs.ART_MODES.includes(s.mode)) fail('unknown mode ' + JSON.stringify(s.mode));
  if (!ctx.catalog.includes(s.id) || !Object.hasOwn(tabs.ART_TABS, s.id)) { fail('tab ' + JSON.stringify(s.id) + ' is not an art tab in techniques.json'); return errors; }
  const schema = ctx.schemas[s.id];
  if (!Array.isArray(s.thumbs) || s.thumbs.length > tabs.LIMITS.thumbs || new Set(s.thumbs).size !== s.thumbs.length || s.thumbs.some(t => typeof t !== 'string' || !/^thumbs\/[a-z0-9-]{1,40}\.jpg$/.test(t)))
    fail('thumbs must list at most ' + tabs.LIMITS.thumbs + ' distinct thumbs/<name>.jpg files');
  const listed = new Set(Array.isArray(s.thumbs) ? s.thumbs : []);
  for (const f of files) if (!f.symlink && f.name !== 'share.json' && !listed.has(f.name)) fail(f.name + ' is not allowed under art/ (only share.json and the thumbnails it lists)');
  const shaOf = new Map();
  for (const t of listed) {
    const p = path.join(artDir, t);
    if (!fs.existsSync(p)) { fail(t + ' is listed but missing'); continue; }
    const bytes = fs.readFileSync(p);
    try { tabs.jpegInfo(bytes); } catch (e) { fail(t + ': ' + e.message); }
    shaOf.set(t, crypto.createHash('sha256').update(bytes).digest('hex'));
  }
  if (!Array.isArray(s.records) || s.records.length > tabs.LIMITS.shareRecords) { fail('records must be a list of at most ' + tabs.LIMITS.shareRecords); return errors; }
  s.records.forEach((r, i) => {
    const at = 'record ' + (i + 1) + ': ';
    if (!r || typeof r !== 'object') return fail(at + 'not an object');
    let parsed;
    try { parsed = tabs.parseRecipeHash(r.hash); } catch (e) { return fail(at + e.message); }
    if (parsed.id !== s.id) fail(at + 'recipe is for ' + parsed.id + ', not ' + s.id);
    const extra = tabs.unknownKeys(parsed.payload, schema.keys);
    if (extra.length) fail(at + 'recipe names keys outside the ' + s.id + ' schema: ' + extra.join(', '));
    if (parsed.payload.running !== false) fail(at + 'recipe must be paused (running false)');
    const warmup = parsed.payload.warmup ?? schema.defaults.warmup;
    if (!Number.isInteger(r.steps) || r.steps !== warmup) fail(at + 'steps ' + JSON.stringify(r.steps) + ' must equal the recipe warmup ' + warmup);
    if (r.seed !== parsed.seed) fail(at + 'seed does not match the recipe');
    if (r.validated !== false) fail(at + 'validated must be false');
    if (r.parentHash != null) { try { tabs.parseRecipeHash(r.parentHash); } catch (e) { fail(at + 'parent ' + e.message); } }
    if (r.class != null && !CLASSES.includes(r.class)) fail(at + 'unknown class ' + JSON.stringify(r.class));
    for (const [k, v] of Object.entries(r.metrics || {})) if (v !== null && !Number.isFinite(v)) fail(at + 'metric ' + k + ' is not a number');
    if (r.thumb != null) {
      if (!listed.has(r.thumb)) fail(at + 'thumbnail ' + r.thumb + ' is not listed');
      else if (shaOf.has(r.thumb) && shaOf.get(r.thumb) !== r.thumbSha256) fail(at + 'thumbnail hash does not match ' + r.thumb);
    }
  });
  for (const t of listed) if (!s.records?.some(r => r && r.thumb === t)) fail(t + ' belongs to no record');
  return errors;
}
// The job-ID rule of apps/validate/share.js folder().
const JOB_ID = /^\d{4}-\d\d-\d\dT[0-9TZ.-]+-[a-f0-9]{8}$/;
function changedPaths(base, cwd = process.cwd()) {
  if (!/^[0-9A-Za-z][0-9A-Za-z._/-]{0,199}$/.test(base || '')) throw Error('--base needs a commit, such as the pull request base SHA.');
  const r = cp.spawnSync('git', ['diff', '-z', '--name-only', '--no-renames', base + '...HEAD', '--', 'validation/submissions'], { cwd, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw Error('git diff failed: ' + String(r.stderr || r.error?.message || '').slice(0, 500));
  return r.stdout.toString('utf8').split('\0').filter(Boolean);
}
// Classify one changed path. Paths outside validation/submissions/ are ignored; inside it, a path must sit
// in a folder named by a job ID, and an art path gives the art folder to check.
function classify(file) {
  const m = /^(.*?)validation\/submissions\/(.*)$/s.exec(String(file).replace(/\\/g, '/'));
  if (!m) return { ignored: true };
  const [job, ...rest] = m[2].split('/');
  if (!job || !rest.length || !rest[0]) return { error: JSON.stringify(file) + ' is not inside a job folder' };
  if (!JOB_ID.test(job)) return { error: JSON.stringify(file) + ': the job folder ' + JSON.stringify(job) + ' is not a job ID' };
  if (rest[0] !== 'art') return { other: true };
  return { art: m[1] + 'validation/submissions/' + job + '/art', job: m[1] + 'validation/submissions/' + job };
}
function main(argv = process.argv.slice(2)) {
  const dirs = new Map(), problems = [];
  let base = null;
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir') { const d = path.resolve(argv[++i]); dirs.set(d, { dir: d, job: path.dirname(d), explicit: true }); continue; }
    if (argv[i] === '--base') { base = argv[++i]; continue; }
    files.push(argv[i]);
  }
  if (base !== null) files.push(...changedPaths(base));
  for (const file of files) {
    const c = classify(file);
    if (c.ignored) { console.log('Ignored (not under validation/submissions/): ' + JSON.stringify(file)); continue; }
    if (c.error) { problems.push(c.error); continue; }
    if (c.art) dirs.set(path.resolve(c.art), { dir: path.resolve(c.art), job: path.resolve(c.job) });
  }
  let bad = 0;
  if (problems.length) { bad++; console.log('FAIL changed paths'); for (const e of problems) console.log('  - ' + e); }
  if (!dirs.size) { console.log(bad ? 'No art result folders could be checked.' : 'No art result folders to check.'); return bad ? 1 : 0; }
  const ctx = context();
  const lstat = p => { try { return fs.lstatSync(p); } catch { return null; } };
  for (const { dir, job, explicit } of [...dirs.values()].sort((a, b) => a.dir.localeCompare(b.dir))) {
    const label = path.relative(process.cwd(), dir) || dir, st = lstat(dir), jobSt = lstat(job);
    let errors;
    if (!st) {
      // Only a folder named on the command line must exist; a change that removed a whole art folder
      // leaves nothing to check, and the deletion is in the diff for the reviewer.
      if (explicit) errors = ['the folder is missing'];
      else { console.log('REMOVED ' + label + ': the pull request deletes this art folder; nothing to check.'); continue; }
    } else if (st.isSymbolicLink() || !st.isDirectory() || (jobSt && jobSt.isSymbolicLink())) errors = ['art/ and its job folder must be plain folders, not links or files'];
    else errors = checkFolder(dir, ctx);
    if (errors.length) { bad++; console.log('FAIL ' + label); for (const e of errors) console.log('  - ' + e); }
    else console.log('PASS ' + label + ': structure, recipes, step counts and thumbnails are consistent. Pixels are not compared.');
  }
  return bad ? 1 : 0;
}
module.exports = { checkFolder, context, classify, changedPaths, main };
if (require.main === module) process.exitCode = main();
