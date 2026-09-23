// Independent Float64 SSH spectrum/edge harness. node tools/ssh-science.js [--write]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { runScience } = require('./lib/ssh-reference');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/ssh.js'), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const result = runScience(sourceSha256);
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/ssh-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
