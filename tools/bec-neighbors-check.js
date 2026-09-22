'use strict';
// Exact diagnostic equivalence, not a scientific validation of vortex detection.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/modules/bec.js'), 'utf8');
const start = source.indexOf('  function nearestVortexNeighbors('), end = source.indexOf('  /* ---------- Vortex Lattice ---------- */');
assert(start > 0 && end > start);
const nearest = vm.runInNewContext(source.slice(start, end) + '\nnearestVortexNeighbors;');
const brute = points => points.map((p, i) => points.map((q, j) => [(q.x-p.x)**2 + (q.y-p.y)**2, j]).filter(([, j]) => j !== i).sort((a,b) => a[0]-b[0] || a[1]-b[1]).slice(0,6));
let seed = 47; const rand = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
const cases = [[], [{x:0,y:0}], Array.from({length:12},()=>({x:0,y:0})), Array.from({length:361},(_,i)=>({x:i%19,y:Math.floor(i/19)})), Array.from({length:700},()=>({x:rand(),y:rand()})), Array.from({length:120},(_,i)=>({x:Math.cos(i*Math.PI/60),y:Math.sin(i*Math.PI/60)}))];
for(const points of cases) assert.deepEqual(JSON.parse(JSON.stringify(nearest(points))), brute(points));
const points = Array.from({length:16384},()=>({x:rand(),y:rand()}));
const started = performance.now(), result = nearest(points), elapsed = performance.now()-started;
assert.equal(result.length,points.length); assert(result.every(x=>x.length===6));
for(const i of [0,123,4096,16383]) {
 const p=points[i], expected=points.map((q,j)=>[(q.x-p.x)**2+(q.y-p.y)**2,j]).filter(([,j])=>j!==i).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).slice(0,6);
 assert.deepEqual(JSON.parse(JSON.stringify(result[i])),expected);
}
console.log('BEC NEIGHBORS OK: exact brute-force agreement; 16,384-point spatial search '+elapsed.toFixed(1)+' ms');
