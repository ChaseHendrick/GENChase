'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const C=require('../src/modules/flow-matching');
const engine=fs.readFileSync(require.resolve('../src/shared/engine.js'),'utf8');
const rngFactory=new Function(engine.slice(engine.indexOf('  function makeRng'),engine.indexOf('  function makeNoise'))+';return makeRng;')();
const endpoint=(z,m,n)=>{const p=C.trajectory(...z,m,n);return [p[p.length-2],p[p.length-1]];};
const model={means:[[1.3,-.7]],sigma:.24},z=[.8,-1.2],exact=[1.3+.24*z[0],-.7+.24*z[1]];
const refinement=[16,32,64].map(n=>({steps:n,error:Math.hypot(...endpoint(z,model,n).map((v,j)=>v-exact[j]))}));
assert(refinement[0].error/refinement[1].error>10);assert(refinement[1].error/refinement[2].error>10);assert(refinement[2].error<1e-6);
const mixture=C.modelFor({layout:'spiral',modes:5,radius:2.2,sigma:.3,turn:15});
let residual=0,wrong=0;const h=1e-5;
for(const t of [.1,.3,.6,.9])for(const x of [-1.1,.2,1.3])for(const y of [-.7,.4]){
 const flux=(xx,yy,axis)=>C.density(xx,yy,t,mixture)*C.velocity(xx,yy,t,mixture)[axis];
 const dp=(C.density(x,y,t+h,mixture)-C.density(x,y,t-h,mixture))/(2*h);
 const div=(flux(x+h,y,0)-flux(x-h,y,0)+flux(x,y+h,1)-flux(x,y-h,1))/(2*h);
 residual=Math.max(residual,Math.abs(dp+div));wrong=Math.max(wrong,Math.abs(dp-div));
}
assert(residual<1e-7);assert(wrong>.01,'Sign-flipped velocity must fail continuity');
const points=[[-2,.7],[.3,-1.5],[1.8,1],[-.3,-.4]];
const gaps=[32,64,128].map(n=>{let sum=0;for(const p of points){const a=endpoint(p,mixture,n),b=endpoint(p,mixture,2*n);sum+=Math.hypot(a[0]-b[0],a[1]-b[1]);}return {steps:n,gap:sum/points.length};});
assert(gaps[0].gap/gaps[1].gap>8);assert(gaps[1].gap/gaps[2].gap>8);
const expected=[0,0,0,0,0];for(const [x,y]of mixture.means){expected[0]+=x/5;expected[1]+=y/5;expected[2]+=(x*x+mixture.sigma**2)/5;expected[3]+=(y*y+mixture.sigma**2)/5;expected[4]+=x*y/5;}
const samples=2048,seeds=8,rows=[],untransported=[];
for(let s=0;s<seeds;s++){
 const rng=rngFactory('flow-moments/'+s),mom=[0,0,0,0,0],raw=[0,0,0,0,0];
 for(let i=0;i<samples;i++){const p=C.normalPair(rng),[x,y]=endpoint(p,mixture,128);[p[0],p[1],p[0]*p[0],p[1]*p[1],p[0]*p[1]].forEach((v,j)=>raw[j]+=v/samples);[x,y,x*x,y*y,x*y].forEach((v,j)=>mom[j]+=v/samples);}
 rows.push(mom);untransported.push(raw);
}
const summarize=rows=>expected.map((target,j)=>{const mean=rows.reduce((sum,r)=>sum+r[j],0)/seeds,se=Math.sqrt(rows.reduce((sum,r)=>sum+(r[j]-mean)**2,0)/(seeds*(seeds-1)));return {moment:['x','y','x2','y2','xy'][j],target,mean,standardErrorAcrossSeeds:se,z:Math.abs(mean-target)/se};});
const moments=summarize(rows),negativeMoments=summarize(untransported);
assert(moments.every(m=>m.z<6),'Independent-seed moments exceed six standard errors');
assert(!negativeMoments.every(m=>m.z<6),'Untransported standard Gaussian must fail the same moment predicate');
const result={scope:'Analytic Gaussian-mixture marginal flow: exact single-Gaussian trajectories, RK4 step refinement, finite-difference continuity residual, and 8 independent seeds of2048 particles compared with closed-form target moments. Not neural training or image-generator quality.',refinement,residual,signFlippedResidual:wrong,gaps,moments,negativeMoments,seeds,samplesPerSeed:samples,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../src/modules/flow-matching'))).digest('hex'),limitations:'Finite selected paths and one mixture, not all parameter values. Six-standard-error bound is a conservative diagnostic, not a simultaneous confidence certificate.',passed:true};
if(process.argv.includes('--write'))fs.writeFileSync('validation/results/flow-matching-science.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
