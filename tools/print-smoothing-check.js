'use strict';
const assert = require('node:assert/strict');
const {settings, filterStrip, smooth} = require('../src/shared/print-smoothing.js');

// Independent direct 2D average, including alpha and replicated boundaries.
function reference(data, w, h, r) {
  const out = new Uint8ClampedArray(data.length), area = (2*r+1)**2;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const sums=[0,0,0,0];
    for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) {
      const i=(Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx)))*4;
      for(let k=0;k<3;k++)sums[k]+=data[i+k]*data[i+3];sums[3]+=data[i+3];
    }
    const i=(y*w+x)*4;for(let k=0;k<3;k++)out[i+k]=sums[3]?sums[k]/sums[3]:0;out[i+3]=sums[3]/area;
  }
  return out;
}
(async()=>{
  for(const [w,h] of [[1,1],[1,9],[11,1],[17,23]]) for(const r of [1,2,8]) {
    const data=Uint8ClampedArray.from({length:w*h*4},(_,i)=>(i*137+53)%256), expected=reference(data,w,h,r);
    const output=new Uint8ClampedArray(data.length);
    for(let y=0;y<h;y+=3) {
      const top=Math.max(0,y-r),bottom=Math.min(h,y+3+r),count=Math.min(3,h-y);
      output.set(filterStrip(data.slice(top*w*4,bottom*w*4),w,bottom-top,r,y-top,count),y*w*4);
    }
    assert(output.every((v,i)=>Math.abs(v-expected[i])<=1),'strip seams, alpha or boundary mismatch');
  }
  const flat=Uint8ClampedArray.from({length:5*7*4},(_,i)=>[23,101,209,173][i%4]);
  assert.deepEqual(filterStrip(flat,5,7,2,0,7),flat,'flat colors stay unchanged');
  const fringe=new Uint8ClampedArray([255,0,0,0,0,255,0,255,255,0,0,0]);
  const result=filterStrip(fringe,3,1,1,0,1);
  for(let i=0;i<result.length;i+=4)assert.deepEqual([...result.slice(i,i+3)],[0,255,0],'transparent red cannot tint green');
  assert.equal(settings('soft',1000,1000,[10,10],false).radiusPixels,8);
  assert.equal(settings('gentle',1000,1000,null,false).radiusPixels,1);
  assert.equal(settings('bad',1000,1000,null,false).applied,false);
  const original={unchanged:true};
  assert.equal(await smooth(original,settings('off',1,1,null,false)),original,'off is an exact no-op');
  assert.equal(await smooth(original,settings('soft',1,1,null,true)),original,'vectors are untouched');
  await assert.rejects(smooth(original,settings('soft',1,1,null,false),{abort:true}),/cancelled/);
  console.log('Print smoothing: independent convolution, strip seams, boundaries, alpha, flat colors and no-op paths passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
