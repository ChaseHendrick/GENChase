// node tools/build.js [--check]
// Deterministic, dependency-free assembly. Source order and whitespace are explicit.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function assemble() {
  const seen = new Set();
  const template = fs.readFileSync(path.join(root, 'src/studio.html'), 'utf8');
  const licensed = template.replace('{{licenses}}', () => ['LICENSE', 'NOTICE', 'OUTPUT-RIGHTS.md', 'licenses/Geist-OFL.txt', 'licenses/GeistMono-OFL.txt', 'licenses/InstrumentSerif-OFL.txt'].map(file => file + '\n' + fs.readFileSync(path.join(root, file), 'utf8').replace(/[ \t]+$/gm, '')).join('\n\n'));
  const result = licensed.replace(/\{\{include:([^}]+)\}\}/g, (_, name) => {
    if (!/^(modules|shared|styles)\/[a-z0-9-]+\.(js|css)$/.test(name)) throw Error('Invalid source path: ' + name);
    if (seen.has(name)) throw Error('Duplicate source: ' + name);
    seen.add(name);
    const body = fs.readFileSync(path.join(root, 'src', name), 'utf8');
    if (body.includes('{{include:')) throw Error('Nested include: ' + name);
    return body;
  });
  for (const dir of ['modules', 'shared', 'styles']) {
    for (const file of fs.readdirSync(path.join(root, 'src', dir))) {
      if (/\.(js|css)$/.test(file) && !seen.has(dir + '/' + file)) throw Error('Unassembled source: ' + dir + '/' + file);
    }
  }
  if (result.includes('{{include:')) throw Error('Unresolved include');
  return result;
}
function build(check = false) {
  const output = assemble(), file = path.join(root, 'studio.html');
  if (check) {
    if (fs.readFileSync(file, 'utf8') !== output) throw Error('studio.html is stale. Run node tools/build.js. Edit src/, not studio.html.');
  } else fs.writeFileSync(file, output);
  return output;
}
if (require.main === module) {
  try { build(process.argv.includes('--check')); console.log('Studio assembly OK'); }
  catch (err) { console.error(err.message); process.exitCode = 1; }
}
module.exports = { assemble, build };
