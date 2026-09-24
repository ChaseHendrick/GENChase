'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {load,replaceOnce,root}=require('./science-harness');
const moduleUnderTest=load('tennis',{names:'tennisStep',capture:'w1,w2,w3,metric'});
const cases=[];
for(const I2 of [1.05,1.4,1.7])for(const T of [20,60,120]){
  const eps=.02, initial=[eps,1,.4*eps], I=[1,I2,2];
  const energy=w=>w.reduce((s,v,i)=>s+.5*I[i]*v*v,0);
  const angularMomentumSquared=w=>w.reduce((s,v,i)=>s+(I[i]*v)**2,0);
  const r=moduleUnderTest.compute({I2,T,eps,grid:160,aspect:'4:5'}), final=[r.w1,r.w2,r.w3];
  const finite=final.every(Number.isFinite);
  const energyRelativeDrift=finite?Math.abs(energy(final)/energy(initial)-1):null;
  const momentumRelativeDrift=finite?Math.abs(angularMomentumSquared(final)/angularMomentumSquared(initial)-1):null;
  const ref=reference(I2,T,16000),coarse=reference(I2,T,8000);
  const referenceChange=Math.max(...ref.map((v,i)=>Math.abs(v-coarse[i])));
  const productionStateError=Math.max(...final.map((v,i)=>Math.abs(v-ref[i])));
  assert(referenceChange<1e-9);assert(productionStateError<1e-6);
  cases.push({I2,T,finite,energyRelativeDrift,momentumRelativeDrift,referenceChange,productionStateError,
    withinTolerance:finite&&energyRelativeDrift<1e-7&&momentumRelativeDrift<1e-7});
}
assert.equal(cases.length,9);
assert(cases.every(r=>r.withinTolerance));
// Independently evolve body angular momentum L' = L cross (I^-1 L),
// instead of production's component-wise angular-velocity equations.
function reference(I2, time, n) {
  const I=[1,I2,2],h=time/n;
  let L=[.02,I2,.016];
  const rate=l=>{
    const w=l.map((v,i)=>v/I[i]);
    return [l[1]*w[2]-l[2]*w[1],l[2]*w[0]-l[0]*w[2],l[0]*w[1]-l[1]*w[0]];
  };
  for(let j=0;j<n;j++){
    const a=rate(L),b=rate(L.map((v,i)=>v+h*a[i]/2)),c=rate(L.map((v,i)=>v+h*b[i]/2)),d=rate(L.map((v,i)=>v+h*c[i]));
    L=L.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
  }
  return L.map((v,i)=>v/I[i]);
}
const difference=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const trajectories=[];
for(const I2 of [1.05,1.4,1.7]){
  const ref=reference(I2,20,8000),referenceChange=difference(ref,reference(I2,20,4000));
  assert(referenceChange<1e-10);
  const rows=[100,200,400].map(n=>{
    let w=[.02,1,.008];
    for(let i=0;i<n;i++)w=moduleUnderTest.hooks.tennisStep(w,20/n,I2);
    return {n,error:difference(w,ref)};
  });
  const ratio=rows[0].error/rows[2].error;
  assert(rows[2].error<1e-7);assert(ratio>200&&ratio<320);
  trajectories.push({I2,referenceChange,rows,ratio});
}
const historical=load('tennis',{capture:'w1,w2,w3',mutate:s=>replaceOnce(s,
  '[w1, w2, w3] = tennisStep([w1, w2, w3], dt, I2);',
  'const a1=(I2-2)*w2*w3,a2=w3*w1/I2,a3=(1-I2)*w1*w2/2; w1+=dt*a1;w2+=dt*a2;w3+=dt*a3;')});
const old=historical.compute({I2:1.4,T:60,eps:.02,grid:160,aspect:'4:5'});
const historicalEnergyDrift=Math.abs((old.w1**2+1.4*old.w2**2+2*old.w3**2)/(.02**2+1.4+2*.008**2)-1);
assert(historicalEnergyDrift>.04);
// The four tennis-print-state fixtures, at their own tilt, duration and aspect.
// The reference samples L at every plate row and rebuilds the whole field and flip count.
const fieldModule=load('tennis',{capture:'w1,w2,w3,metric,field,W,H'});
function referenceRows(I2,eps,T,H,m){
  const I=[1,I2,2],h=T/H/m,rows=[];
  let L=[eps,I2,.8*eps];
  const rate=l=>{
    const w=l.map((v,i)=>v/I[i]);
    return [l[1]*w[2]-l[2]*w[1],l[2]*w[0]-l[0]*w[2],l[0]*w[1]-l[1]*w[0]];
  };
  for(let y=0;y<H;y++){
    for(let j=0;j<m;j++){
      const a=rate(L),b=rate(L.map((v,i)=>v+h*a[i]/2)),c=rate(L.map((v,i)=>v+h*b[i]/2)),d=rate(L.map((v,i)=>v+h*c[i]));
      L=L.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
    }
    rows.push(L.map((v,i)=>v/I[i]));
  }
  return rows;
}
function fieldFromRows(rows,W){
  const f=new Float32Array(W*rows.length);
  rows.forEach(([w1,w2,w3],y)=>{for(let x=0;x<W;x++){const u=x/Math.max(1,W-1);
    f[y*W+x]=w2*(.4+.6*u)+.35*w1*Math.sin(u*Math.PI)+.25*w3*Math.cos(u*Math.PI*2);}});
  return f;
}
const signChanges=rows=>{let n=0;for(let y=1;y<rows.length;y++)if(rows[y-1][1]*rows[y][1]<0)n++;return n+(rows[0][1]<0?1:0);};
const fieldError=(a,b)=>{let e=0;for(let i=0;i<a.length;i++)e=Math.max(e,Math.abs(a[i]-b[i]));return e;};
const printFixtures=[{name:'flip',I2:1.4,eps:.02,T:70,aspect:'4:5'},{name:'stable1',I2:1.05,eps:.01,T:50,aspect:'4:5'},
  {name:'log',I2:1.45,eps:.02,T:60,aspect:'4:5'},{name:'square',I2:1.4,eps:.02,T:60,aspect:'1:1'}].map(f=>{
  const r=fieldModule.compute({...f,grid:160}),I=[1,f.I2,2],initial=[f.eps,1,.4*f.eps],final=[r.w1,r.w2,r.w3];
  const energy=w=>w.reduce((s,v,i)=>s+.5*I[i]*v*v,0),momentum=w=>w.reduce((s,v,i)=>s+(I[i]*v)**2,0);
  const rows=referenceRows(f.I2,f.eps,f.T,r.H,64),coarse=referenceRows(f.I2,f.eps,f.T,r.H,32);
  const referenceChange=Math.max(...rows.map((w,y)=>difference(w,coarse[y])));
  const flips=signChanges(rows),minAbsOmega2=Math.min(...rows.map(w=>Math.abs(w[1])));
  const productionStateError=difference(final,rows[rows.length-1]);
  const fieldMaxError=fieldError(r.field,fieldFromRows(rows,r.W));
  const perturbed=referenceRows(f.I2*1.01,f.eps,f.T,r.H,64);
  const inertiaControlFieldError=fieldError(r.field,fieldFromRows(perturbed,r.W));
  const row={...f,cells:[r.W,r.H],flips:r.metric,referenceFlips:flips,minAbsOmega2,referenceChange,productionStateError,fieldMaxError,
    energyRelativeDrift:Math.abs(energy(final)/energy(initial)-1),momentumRelativeDrift:Math.abs(momentum(final)/momentum(initial)-1),
    inertiaControlFieldError,inertiaControlDetected:inertiaControlFieldError>1e-3};
  assert(referenceChange<1e-9);assert(productionStateError<1e-6);assert(fieldMaxError<2e-6);
  assert.equal(r.metric,flips);assert(minAbsOmega2>1e-4);
  assert(row.energyRelativeDrift<1e-7&&row.momentumRelativeDrift<1e-7);assert(row.inertiaControlDetected);
  return row;
});
const eulerModule=load('tennis',{capture:'metric,field,W,H',mutate:s=>replaceOnce(s,
  '[w1, w2, w3] = tennisStep([w1, w2, w3], dt, I2);',
  'const a1=(I2-2)*w2*w3,a2=w3*w1/I2,a3=(1-I2)*w1*w2/2; w1+=dt*a1;w2+=dt*a2;w3+=dt*a3;')});
const eulerFieldErrors=printFixtures.map(f=>{
  const r=eulerModule.compute({I2:f.I2,eps:f.eps,T:f.T,aspect:f.aspect,grid:160});
  return fieldError(r.field,fieldFromRows(referenceRows(f.I2,f.eps,f.T,r.H,64),r.W));
});
assert(eulerFieldErrors.every(e=>e>1e-3));
const result={sourceSha256:moduleUnderTest.sourceSha256,cases,
  trajectories,historicalEnergyDrift,printFixtures,eulerFieldErrors,sciencePass:true,
  criteria:'Nine production fixtures conserve energy and squared angular momentum within 1e-7 and match reference states within 1e-6; three helper trajectories converge at fourth order with finest error below 1e-7. The four print fixtures match an independently sampled reference field word for word within 2e-6, with identical flip counts, and reject a 1% inertia error and the old Euler update.',
  limitations:['Finite parameter fixtures and durations only; no all-control, exact flip-time or print accuracy claim.',
    'RK4 is not exactly symplectic. Finite-time conservation does not establish indefinite energy preservation.']};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/rigid-body-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
