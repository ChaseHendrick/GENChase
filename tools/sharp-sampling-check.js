// The even-offset sampler scored a nearest-neighbor mosaic as featureless.
// node tools/sharp-sampling-check.js
// A pure node check: no browser, no export. The old sampler is the negative control.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const S = 64;
const BLOCK = 4;
const LO = 0;
const HI = 200;

// Constant inside each even block, and a jump of HI - LO across every block edge.
function plate() {
  const L = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
      L[y * S + x] = ((bx + by) & 1) ? HI : LO;
    }
  }
  return L;
}

// Horizontal then vertical absolute differences. stride 2 is the retired sampler.
function diffs(L, k, stride) {
  const out = [];
  for (let y = 0; y < S; y += stride) for (let x = 0; x + k < S; x += stride) out.push(Math.abs(L[y * S + x + k] - L[y * S + x]));
  for (let y = 0; y + k < S; y += stride) for (let x = 0; x < S; x += stride) out.push(Math.abs(L[(y + k) * S + x] - L[y * S + x]));
  return out;
}

// Same percentile tools/sharp.js uses for the one-pixel edge.
function p99(a) {
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.floor(0.99 * (s.length - 1))] || 0;
}

const L = plate();
const oldK1 = diffs(L, 1, 2);
assert.ok(oldK1.length > 0, 'the even-offset sampler must still measure something');
assert.ok(oldK1.every(v => v === 0), 'stride 2 on even blocks must miss every one-pixel edge');

const newK1 = diffs(L, 1, 1);
const edge = p99(newK1);
assert.ok(edge > 100, 'stride 1 k=1 99th percentile must be essentially the full jump, got ' + edge);

const src = fs.readFileSync(path.join(__dirname, 'sharp.js'), 'utf8');
const at = src.indexOf('const diffs = k => {');
const end = src.indexOf('return out;', at);
const close = src.indexOf('\n    };', end);
assert.ok(at >= 0 && end > at && close > end, 'tools/sharp.js must keep diffs()');
const body = src.slice(at, end);
const loops = body.match(/for \([^)]*\)/g) || [];
assert.equal(loops.length, 4, 'diffs() keeps a horizontal pair of loops and a vertical pair');
for (const loop of loops) {
  assert.match(loop, /\+= 1\b/, 'live diffs loops must step by 1: ' + loop);
  assert.doesNotMatch(loop, /\+= 2\b/, 'live diffs loops must not step by 2: ' + loop);
}
assert.equal((body.match(/\+= 2/g) || []).length, 0, 'an even stride must not return inside diffs()');

// Run the live function, not only the copy above. A restored even stride fails the percentile too.
const live = new Function('L', 'S', src.slice(at, close + '\n    };'.length) + '\nreturn diffs;')(L, S);
const liveK1 = live(1);
assert.deepEqual(liveK1, newK1, 'tools/sharp.js diffs() must match the stride-1 sampler');
const liveEdge = p99(liveK1);
assert.ok(liveEdge > 100, 'live k=1 99th percentile must be essentially the full jump, got ' + liveEdge);

console.log(JSON.stringify({
  oldStride2: { k1count: oldK1.length, k1max: Math.max(...oldK1), k1p99: p99(oldK1) },
  newStride1: { k1count: liveK1.length, k1max: Math.max(...liveK1), k1p99: liveEdge },
}));
console.log('PASS sharp-sampling-check: even-offset k=1 is all zero; stride 1 sees the block edge');
