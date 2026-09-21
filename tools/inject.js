// node tools/inject.js <block.js> [<block2.js> ...] <out.html>
// Builds a test copy of studio.html with the given module block(s) inlined as <script> tags
// immediately before <script>Studio.boot();</script>. Used to test a block in isolation
// before it is inlined into studio.html for real.
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2);
if (args.length < 2) { console.error('usage: node tools/inject.js <block.js> [...] <out.html>'); process.exit(1); }
const out = args.pop();
let src = fs.readFileSync(path.resolve(__dirname, '..', 'studio.html'), 'utf8');
const marker = '<script>Studio.boot();</script>';
for (const f of args) {
  const body = fs.readFileSync(path.resolve(f), 'utf8');
  const head = body.match(/\/\* modules\/[a-z0-9-]+\.js \*\//);
  if (!head) throw Error('Missing module marker: ' + f);
  const start = src.indexOf('<script>\n' + head[0]);
  if (start >= 0) {
    const end = src.indexOf('</script>', start);
    if (end < 0) throw Error('Unclosed existing script');
    src = src.slice(0,start) + src.slice(end + '</script>'.length);
  }
}
const at = src.lastIndexOf(marker);
if (at < 0) { console.error('boot marker not found'); process.exit(1); }
const blocks = args.map(f => '<script>\n' + fs.readFileSync(path.resolve(f), 'utf8').replace(/\n?$/, '\n') + '</script>\n').join('');
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(path.resolve(out), src.slice(0, at) + blocks + src.slice(at));
console.log('wrote', out, '(' + args.length + ' block' + (args.length === 1 ? '' : 's') + ')');
