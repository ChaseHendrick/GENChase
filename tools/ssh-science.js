// Independent Float64 SSH spectrum/edge harness. node tools/ssh-science.js [--write]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { runScience } = require('./lib/ssh-reference');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/ssh.js'), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
// The studio's solver, evaluated from the maintained source as tools/surfaces-science.js does, so the
// comparison runs the exact functions the plate runs.
function studioApi(text) {
  const marker = '  Studio.register({';
  if (!text.includes(marker)) throw new Error('src/modules/ssh.js no longer has the registration this harness hooks');
  const palettes = new Proxy({}, { get: () => ({ colors: ['#000000'], bg: '#000000' }) });
  const context = { Studio: { util: {}, PALETTES: palettes, register() {} } };
  vm.runInNewContext(text.replace(marker, '  globalThis.api = { spectrum, midGap, verdict, PRESETS, DEFAULTS };\n' + marker), context);
  return context.api;
}
const result = runScience(sourceSha256, studioApi(source));
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/ssh-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
