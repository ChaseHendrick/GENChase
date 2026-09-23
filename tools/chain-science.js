'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {load,replaceOnce,root}=require('./science-harness'),{history,linear}=require('./lib/fput-reference');
const chain=load('fput',{capture:'q,v,W,H,field,metric,extra,drift,elapsed,linearPeriod,nInner,dt'});
const maxDiff=(a,b)=>{let m=0;for(let i=0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m;},cases=[];
for(const grid of [48,96,128])for(const alpha of [0,.22,.42]){
 const time=120,ref=alpha===0?linear(grid,time):history(grid,grid,alpha,time,.0125).z;
 const referenceDifference=alpha===0?0:maxDiff(ref,history(grid,grid,alpha,time,.025).z);assert(referenceDifference<1e-8);
 const rows=[.1,.05,.025].map(dt=>{const r=chain.compute({grid,aspect:'1:1',alpha,dt,periods:time});assert(Math.abs(r.H*r.nInner*r.dt-time)<1e-10);assert.equal(r.q[0],0);assert.equal(r.q[grid-1],0);assert.equal(r.v[0],0);assert.equal(r.v[grid-1],0);return{requestedStep:dt,actualStep:r.dt,error:maxDiff([...r.q,...r.v],ref),energyDrift:r.drift,metric:r.metric};});
 const order=Math.log(rows[0].error/rows[2].error)/Math.log(rows[0].actualStep/rows[2].actualStep);assert(rows[2].error<2e-5&&order>1.9&&order<2.1,JSON.stringify({grid,alpha,rows,order}));assert(rows.every(r=>r.energyDrift<2e-5));if(alpha===0)assert(rows.every(r=>Math.abs(r.metric-1)<2e-5));cases.push({grid,alpha,time,rows,order,referenceDifference});
}
const wrong=load('fput',{capture:'q,v',mutate:s=>replaceOnce(s,'(q[i + 1] - 2 * q[i] + q[i - 1]) + a','1.1 * (q[i + 1] - 2 * q[i] + q[i - 1]) + a')});
const incorrect=wrong.compute({grid:48,aspect:'1:1',alpha:0,dt:.025,periods:120}),failureError=maxDiff([...incorrect.q,...incorrect.v],linear(48,120));assert(failureError>.02);
const p40=chain.compute({periods:40}),p220=chain.compute({periods:220}),durationDifference=maxDiff(p40.q,p220.q);assert(durationDifference>.1);
const result={sourceSha256:chain.sourceSha256,cases,failureError,durationDifference,pass:true,limitations:['Fixed-end alpha-chain at enumerated finite times and amplitudes. No long-time recurrence, equilibrium or physical experiment claim.','Sites change the finite chain, not a fixed-domain continuum discretization.']};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/chain-science.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
