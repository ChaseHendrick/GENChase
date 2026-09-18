// node tools/slice.js <block.js> <n> <out.js>
// Writes a copy of a block containing its shared preamble plus the first n tab sections
// (sections start at `  /* ---------- Name ---------- */` markers), closed with the block's IIFE trailer.
// node tools/slice.js <block.js> list     prints the section names.
// Used to inline a block one tab at a time so each tab gets its own commit.
const path = require('path'), fs = require('fs');
const [file, arg, out] = process.argv.slice(2);
if (!file || !arg) { console.error('usage: node tools/slice.js <block.js> <n|list> [out.js]'); process.exit(1); }
const lines = fs.readFileSync(path.resolve(file), 'utf8').split('\n');
const marks = [];
lines.forEach((l, i) => { const m = l.match(/^  \/\* -{6,} (.+?) -{6,} \*\/\s*$/); if (m) marks.push({ i, name: m[1] }); });
if (!marks.length) { console.error('no section markers found'); process.exit(1); }
let trailer = lines.length - 1;
while (trailer > 0 && lines[trailer].trim() === '') trailer--;
if (lines[trailer].trim() !== '})();') { console.error('block does not end with })();'); process.exit(1); }
if (arg === 'list') { marks.forEach((m, k) => console.log((k + 1) + '. ' + m.name + ' (line ' + (m.i + 1) + ')')); process.exit(0); }
const n = Math.max(1, Math.min(marks.length, +arg));
const end = n < marks.length ? marks[n].i : trailer;
const body = lines.slice(0, end).join('\n').replace(/\s+$/, '') + '\n' + lines.slice(trailer).join('\n');
fs.writeFileSync(path.resolve(out), body);
console.log('wrote', out, 'with', n, 'of', marks.length, 'sections:', marks.slice(0, n).map(m => m.name).join(', '));
