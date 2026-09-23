// Fast distribution checks. These are packaging regressions, not scientific validation.
// node tools/folder-check.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const index = read('index.html');
const manifest = JSON.parse(read('src/module-manifest.json'));
const catalog = JSON.parse(read('techniques.json'));
assert.ok(Array.isArray(manifest.techniques) && manifest.techniques.length, 'Manifest needs techniques');
const ids = manifest.techniques.map(m => m.id);
assert.equal(new Set(ids).size, ids.length, 'Manifest IDs must be unique');
assert.deepEqual([...ids].sort(), catalog.techniques.map(m => m.id).sort(), 'Manifest must contain every catalog technique');
assert.ok(!index.includes('{{include:'), 'Index contains an unexpanded build directive');
assert.ok(!/Studio\.register\s*\(/.test(index), 'Index must not embed simulation registrations');
const scripts = [...index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)];
assert.ok(scripts.some(m => /src\s*=/.test(m[1])), 'Index must load the shared engine externally');
assert.ok(scripts.every(m => !/src\/modules\//.test(m[1])), 'Index must load modules lazily');
const executable = scripts.filter(m => !/\btype\s*=\s*["'](?:application\/ld\+json|text\/plain)["']/i.test(m[1]));
assert.ok(executable.reduce((sum, m) => sum + m[2].length, 0) < 4096, 'Index contains more than a small inline bootstrap');
for (const entry of manifest.techniques) {
  assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Unsafe technique ID');
  assert.match(entry.source, /^src\/modules\/[a-z0-9-]+\.js$/, 'Module sources must be local canonical paths');
  const file = path.resolve(root, entry.source);
  assert.ok(file.startsWith(root + path.sep), 'Module path escapes repository');
  assert.ok(fs.statSync(file).isFile(), 'Missing module source: ' + entry.source);
  assert.ok(entry.name, 'Missing module display name: ' + entry.id);
}
const portable = read('dist/studio.html');
assert.ok(portable.includes('Studio.register('), 'Portable studio must embed its modules');
assert.ok(!portable.includes('{{include:'), 'Portable studio contains an unexpanded build directive');
assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(portable), 'Portable studio must not require external scripts');
assert.ok(Buffer.byteLength(index) < Buffer.byteLength(portable) / 4, 'Index should be substantially smaller than portable studio');
console.log('FOLDER PACKAGING OK: ' + ids.length + ' techniques in ' + new Set(manifest.techniques.map(m => m.source)).size + ' local source files; thin index and portable studio');

assert.deepEqual(JSON.parse(read('src/science-reports.json')),JSON.parse(read('validation/techniques.json')),'Science reports must match the validation inventory');
