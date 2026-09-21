// Legacy staging adapter: update canonical source, then assemble. Never patch generated HTML.
// node tools/inline.js <block.js> [sectionCount]
const path = require('node:path'), fs = require('node:fs'), cp = require('node:child_process');
const [file, n] = process.argv.slice(2);
if (!file) throw Error('usage: node tools/inline.js <block.js> [sectionCount]');
const root = path.resolve(__dirname, '..');
let body = fs.readFileSync(path.resolve(file), 'utf8');
if (n) {
  const tmp = path.join(__dirname, 'dist', 'inline-' + path.basename(file));
  fs.mkdirSync(path.dirname(tmp), {recursive:true});
  cp.execFileSync(process.execPath,[path.join(__dirname,'slice.js'),file,n,tmp]);
  body = fs.readFileSync(tmp,'utf8');
}
const marker = body.match(/\/\* modules\/([a-z0-9-]+\.js) \*\//);
if (!marker) throw Error('Expected modules/<name>.js marker');
const name = 'modules/' + marker[1];
fs.writeFileSync(path.join(root,'src',name),'\n'+body.trim()+'\n');
const template = path.join(root,'src/studio.html');
let src=fs.readFileSync(template,'utf8');
const token='{{include:'+name+'}}';
if (!src.includes(token)) {
  const boot='<script>{{include:shared/boot.js}}</script>';
  if(!src.includes(boot)) throw Error('Missing boot include');
  src=src.replace(boot,'<script>'+token+'</script>\n'+boot);
  fs.writeFileSync(template,src);
}
require('./build.js').build();
console.log('Updated '+name+'. Review validation fingerprints before committing.');
