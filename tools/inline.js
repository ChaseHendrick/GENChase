// node tools/inline.js <block.js> <n>
// Inlines the shared preamble plus the first n sections of a block into studio.html as one <script>
// immediately before <script>Studio.boot();</script>. If a <script> for the same block (matched by its
// first-line `/* modules/<name>.js */` comment) is already inlined, it is replaced in place. Used to land
// a block one tab per commit.
const path = require('path'), fs = require('fs'), cp = require('child_process');
const [file, n] = process.argv.slice(2);
if (!file || !n) { console.error('usage: node tools/inline.js <block.js> <n>'); process.exit(1); }
const tmp = path.join(__dirname, 'dist', 'inline-' + path.basename(file));
fs.mkdirSync(path.dirname(tmp), { recursive: true });
const out = cp.execFileSync('node', [path.join(__dirname, 'slice.js'), file, n, tmp], { encoding: 'utf8' }).trim();
const body = fs.readFileSync(tmp, 'utf8').replace(/\n?$/, '\n');
const head = body.split('\n')[0];
const studioPath = path.resolve(__dirname, '..', 'studio.html');
let src = fs.readFileSync(studioPath, 'utf8');
const block = '<script>\n' + body + '</script>\n';
const at = src.indexOf('<script>\n' + head + '\n');
if (at >= 0) {
  const end = src.indexOf('</script>\n', at) + '</script>\n'.length;
  src = src.slice(0, at) + block + src.slice(end);
  console.log('replaced existing block:', out);
} else {
  const boot = src.lastIndexOf('<script>Studio.boot();</script>');
  src = src.slice(0, boot) + block + src.slice(boot);
  console.log('inserted new block:', out);
}
fs.writeFileSync(studioPath, src);
