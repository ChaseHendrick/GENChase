'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function load(id,names,mutate=s=>s){
 const source=fs.readFileSync(path.join(root,'src/modules/'+id+'.js'),'utf8'),hooks={};
 const Studio={util:{TAU:2*Math.PI},PALETTES:{},register(){}};
 const marker='  Studio.register({';assert.equal(source.split(marker).length,2);
 new Function('Studio','hooks',mutate(source).replace(marker,'  Object.assign(hooks,{'+names+'});\n'+marker))(Studio,hooks);
 return {hooks,sourceSha256:crypto.createHash('sha256').update(source).digest('hex')};
}
const E=load('eight','initial,accel,yoshida4,PERIOD');
const flatten=s=>[...s.x,...s.y,...s.vx,...s.vy];
function rhs(z){
 const out=[...z.slice(6),0,0,0,0,0,0];
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(i!==j){
  const dx=z[j]-z[i],dy=z[j+3]-z[i+3],r=Math.hypot(dx,dy);
  out[i+6]+=dx/r**3;out[i+9]+=dy/r**3;
 }
 return out;
}
function reference(start,T,n){
 let z=start.slice();const h=T/n;
 for(let k=0;k<n;k++){
  const a=rhs(z),b=rhs(z.map((v,i)=>v+h*a[i]/2)),c=rhs(z.map((v,i)=>v+h*b[i]/2)),d=rhs(z.map((v,i)=>v+h*c[i]));
  z=z.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
 }
 return z;
}
const maxDiff=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
function run(api,T,n){
 const s=api.initial('eight'),ax=[],ay=[];api.accel(s.x,s.y,ax,ay);
 for(let i=0;i<n;i++)api.yoshida4(s,T/n,ax,ay);
 return flatten(s);
}
const initial=flatten(E.hooks.initial('eight')),T=1.5;
const ref=reference(initial,T,12000),ref2=reference(initial,T,24000),referenceDifference=maxDiff(ref,ref2);assert(referenceDifference<1e-10);
const rows=[100,200,400].map(n=>({n,error:maxDiff(run(E.hooks,T,n),ref2)}));
assert(rows[2].error<1e-7);assert(rows[0].error/rows[2].error>200&&rows[0].error/rows[2].error<320);
const returnError=maxDiff(run(E.hooks,E.hooks.PERIOD,9600),initial);assert(returnError<1e-6);
const wrong=load('eight','initial,accel,yoshida4',s=>s.replace('1 / (r2 * Math.sqrt(r2))','1.01 / (r2 * Math.sqrt(r2))'));
const forceFailure=maxDiff(run(wrong.hooks,T,400),ref2);assert(forceFailure>.001);
const P=load('photon','integrate,searchBc,searchRph');
const critical=P.hooks.searchBc(),radius=P.hooks.searchRph();
assert(Math.abs(critical-3*Math.sqrt(3))<1e-6);assert(Math.abs(radius-3)<1e-8);
const photons=[];
for(const b of [4.5,5,5.5,7,10]){
 const runs=[.02,.01,.005].map(h=>{const r=P.hooks.integrate(b,{h});return {h,captured:r.captured,rMin:r.rMin,defl:Number.isFinite(r.defl)?r.defl:null};});
 assert(runs.every(r=>r.captured===(b<3*Math.sqrt(3))));
 if(b>3*Math.sqrt(3)){
  // Turning radius is the outer root of r^3-b^2*r+2*b^2=0.
  let lo=3,hi=b;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(mid**3-b*b*mid+2*b*b>0)hi=mid;else lo=mid;}
  const target=(lo+hi)/2,error=Math.abs(runs[2].rMin-target);assert(error<.0002);
  photons.push({b,target,turningError:error,runs});
 }else photons.push({b,runs});
}
const badP=load('photon','searchBc',s=>s.replace('3 * M * u * u - u','3.3 * M * u * u - u'));
const photonFailure=Math.abs(badP.hooks.searchBc()-3*Math.sqrt(3));assert(photonFailure>.1);
const result={sourceSha256:{eight:E.sourceSha256,photon:P.sourceSha256},eight:{referenceDifference,rows,returnError,forceFailure},photon:{critical,radius,photons,photonFailure},pass:true,limitations:['Finite deterministic fixtures only; no chaotic long-time, all-control, print or experimental validation.','Photon capture checks use finite launch radius and integration cutoff. Deflection values are recorded but not certified by the turning-point benchmark.','Figure-eight reference independently expresses Newtonian forces and uses RK4; production uses Yoshida splitting.']};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/orbit-science.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
