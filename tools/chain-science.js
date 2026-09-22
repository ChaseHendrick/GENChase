'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {load, replaceOnce, root} = require('./science-harness');
const chain = load('fput', {capture: 'q,v,W,H,metric,nInner,dt'});
const maxDiff = (a,b) => Math.max(...a.map((v,i) => Math.abs(v-b[i])));
function rhs(z, alpha) {
  const n=z.length/2, out=new Array(2*n).fill(0);
  // Different representation from production: assemble bond tensions first.
  const tension=Array.from({length:n-1},(_,i) => {const d=z[i+1]-z[i];return d+alpha*d*d;});
  for(let i=1;i<n-1;i++){out[i]=z[n+i];out[n+i]=tension[i]-tension[i-1];}
  return out;
}
function reference(n, alpha, time, steps) {
  let z=Array.from({length:2*n},(_,i) => i>0&&i<n-1?Math.sin(Math.PI*i/(n-1)):0);
  const h=time/steps;
  for(let j=0;j<steps;j++){
    const a=rhs(z,alpha),b=rhs(z.map((v,i)=>v+h*a[i]/2),alpha),c=rhs(z.map((v,i)=>v+h*b[i]/2),alpha),d=rhs(z.map((v,i)=>v+h*c[i]),alpha);
    z=z.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
  }
  return z;
}
const cases=[];
for(const grid of [48,96,128]) for(const alpha of [0,.22,.42]) {
  const time=grid*.35;
  let ref, referenceDifference=0;
  if(alpha===0){
    const omega=2*Math.sin(Math.PI/(2*(grid-1)));
    ref=Array.from({length:2*grid},(_,j)=>{
      const i=j%grid, amplitude=(i===0||i===grid-1)?0:Math.sin(Math.PI*i/(grid-1));
      return amplitude*(j<grid?Math.cos(omega*time):-omega*Math.sin(omega*time));
    });
  }else{
    ref=reference(grid,alpha,time,4000);
    referenceDifference=maxDiff(ref,reference(grid,alpha,time,2000));
    assert(referenceDifference<1e-9);
  }
  const rows=[.07,.035,.0175].map(dt=>{
    const r=chain.compute({grid,aspect:'1:1',alpha,dt});
    assert(Math.abs(r.H*r.nInner*dt-time)<1e-12);
    assert.equal(r.q[0],0);assert.equal(r.q[grid-1],0);
    return {dt,steps:r.H*r.nInner,error:maxDiff([...r.q,...r.v],ref)};
  });
  const ratio=rows[0].error/rows[2].error;
  assert(rows[2].error<.001);assert(ratio>3.5&&ratio<4.5);
  cases.push({grid,alpha,time,rows,ratio,referenceDifference});
}
const wrong=load('fput',{capture:'q,v',mutate:s=>replaceOnce(s,
  '(q[i + 1] - 2 * q[i] + q[i - 1]) + a', '1.1 * (q[i + 1] - 2 * q[i] + q[i - 1]) + a')});
const incorrect=wrong.compute({grid:48,aspect:'1:1',alpha:0,dt:.0175});
const failureError=maxDiff([...incorrect.q,...incorrect.v],reference(48,0,48*.35,4000));
assert(failureError>.02);
const p40=chain.compute({periods:40}), p220=chain.compute({periods:220});
const ignoredPeriods=maxDiff([...p40.q,...p40.v],[...p220.q,...p220.v]);
// Record diagnostic defects without making their continued presence a CI gate.
const diagnostic={periodsChangesState:ignoredPeriods>0,periodsStateDifference:ignoredPeriods,
  note:'The recorded metric is absolute first-mode displacement amplitude. It is not first-mode energy, which also needs the projected velocity.'};
const result={sourceSha256:chain.sourceSha256,cases,failureError,diagnostic,pass:true,
  limitations:['Only fixed-end displacement and velocity evolution at the stated finite times is supported.',
    'The smallest refinement step 0.0175 is injected through the test state, below the UI slider minimum 0.02.',
    'No nonlinear recurrence, energy diagnostic, periods control, equipartition, long-time or print claim.']};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/chain-science.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
