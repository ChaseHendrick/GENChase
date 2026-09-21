// node tools/build.js [--check]
// Deterministic, dependency-free assembly. Source order and whitespace are explicit.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function outputs() {
  const seen = new Set();
  const template = fs.readFileSync(path.join(root, 'src/studio.html'), 'utf8');
  const licensed = template.replace('{{licenses}}', () => ['LICENSE', 'NOTICE', 'OUTPUT-RIGHTS.md', 'licenses/Geist-OFL.txt', 'licenses/GeistMono-OFL.txt', 'licenses/InstrumentSerif-OFL.txt'].map(file => file + '\n' + fs.readFileSync(path.join(root, file), 'utf8').replace(/[ \t]+$/gm, '')).join('\n\n'));
  const bodies = new Map();
  const result = licensed.replace(/\{\{include:([^}]+)\}\}/g, (_, name) => {
    if (!/^(modules|shared|styles)\/[a-z0-9-]+\.(js|css)$/.test(name)) throw Error('Invalid source path: ' + name);
    if (seen.has(name)) throw Error('Duplicate source: ' + name);
    seen.add(name);
    const body = fs.readFileSync(path.join(root, 'src', name), 'utf8');
    if (body.includes('{{include:')) throw Error('Nested include: ' + name);
    bodies.set(name, body);
    return body;
  });
  for (const dir of ['modules', 'shared', 'styles']) {
    for (const file of fs.readdirSync(path.join(root, 'src', dir))) {
      if (dir === 'modules' && file === '_template.js') continue;
      if (/\.(js|css)$/.test(file) && !seen.has(dir + '/' + file)) throw Error('Unassembled source: ' + dir + '/' + file);
    }
  }
  if (result.includes('{{include:')) throw Error('Unresolved include');
  const folder = licensed.replace(/<(script|style)>\{\{include:([^}]+)\}\}<\/\1>/g, (_, tag, name) => {
    if (!bodies.has(name)) throw Error('Unresolved folder source: ' + name);
    if (name.startsWith('modules/')) return '';
    if (name === 'shared/boot.js') return '<script>Studio.boot({manifest: "./src/module-manifest.json"});</script>';
    if (tag === 'style' && name.startsWith('styles/')) return '<link rel="stylesheet" href="./src/' + name + '">';
    if (tag === 'script' && name.startsWith('shared/')) return '<script src="./src/' + name + '"></script>';
    throw Error('Unsupported folder include: ' + name);
  });
  if (folder.includes('{{include:')) throw Error('Unresolved folder include');
  const manifest = require('./registry.js').metadata(root, [...seen].filter(name => name.startsWith('modules/')));
  const portable = result.replace('href="VALIDATION.md"', 'href="../VALIDATION.md"');
  return { 'index.html': folder, 'dist/studio.html': portable, 'src/module-manifest.json': JSON.stringify({ techniques: manifest.techniques }, null, 2) + '\n' };
}
function assemble() { return outputs()['dist/studio.html']; }
function build(check = false) {
  const generated = outputs();
  for (const [name, output] of Object.entries(generated)) {
    const file = path.join(root, name);
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) throw Error(name + ' is stale. Run node tools/build.js. Edit src/, not generated files.');
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, output);
    }
  }
  return generated['dist/studio.html'];
}
if (require.main === module) {
  try { build(process.argv.includes('--check')); console.log('Studio assembly OK'); }
  catch (err) { console.error(err.message); process.exitCode = 1; }
}
module.exports = { assemble, build, outputs };
