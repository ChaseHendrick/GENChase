// Checks the maintained BSS construction against the independent peakon ODE.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/modules/peakon.js'),'utf8');
function load(change=s=>s){
 const hooks={}, marker='  Studio.register({';
 assert.equal(source.split(marker).length,2);
 const Studio={util:{},PALETTES:{},register(){}};
 new Function('Studio','hooks',change(source).replace(marker,'  Object.assign(hooks,{peakonsAt,uOf,KINDS});\n'+marker))(Studio,hooks);
 return hooks;
}
const actual=load();
function residual(api,speeds,t,sep,h){
 const p=api.peakonsAt(speeds,t,sep),lo=api.peakonsAt(speeds,t-h,sep),hi=api.peakonsAt(speeds,t+h,sep);
 let error=0;
 for(let i=0;i<p.N;i++){
  let dx=0,dm=0;
  for(let j=0;j<p.N;j++){
   const d=p.x[i]-p.x[j], term=p.m[j]*Math.exp(-Math.abs(d));
   dx+=term;dm+=p.m[i]*term*Math.sign(d);
  }
  error=Math.max(error,Math.abs((hi.x[i]-lo.x[i])/(2*h)-dx),Math.abs((hi.m[i]-lo.m[i])/(2*h)-dm));
 }
 return error;
}
const cases=[];
for(const [kind,{c}] of Object.entries(actual.KINDS))for(const sep of [-1.2,0,1.2]){
 const errors=[.02,.01,.005].map(h=>Math.max(...[-3,-.7,.4,2.8].map(t=>residual(actual,c,t,sep,h))));
 assert(errors[2]<2e-4);
 // A single peakon has linear position and constant mass, so roundoff dominates.
 if(c.length>1)assert(errors[0]/errors[2]>12 && errors[0]/errors[2]<20);
 const values=[-3,-.7,.4,2.8].map(t=>{
  const p=actual.peakonsAt(c,t,sep);let H=0;
  for(let i=0;i<p.N;i++)for(let j=0;j<p.N;j++)H+=p.m[i]*p.m[j]*Math.exp(-Math.abs(p.x[i]-p.x[j]));
  assert([...p.m].every(v=>v>0));
  for(let i=1;i<p.N;i++)assert(p.x[i]>p.x[i-1]);
  return {t,mass:[...p.m].reduce((a,b)=>a+b,0),H};
 });
 const massError=Math.max(...values.map(v=>Math.abs(v.mass-c.reduce((a,b)=>a+b,0))));
 const energyDrift=Math.max(...values.map(v=>Math.abs(v.H-values[0].H)));
 assert(massError<1e-10&&energyDrift<1e-9);
 cases.push({kind,sep,errors,massError,energyDrift});
}
let singleError=0;
for(const c of [.58,1.25,2.4])for(const t of [-3,0,2]){
 const p=actual.peakonsAt([c],t,0);
 for(const x of [-4,-.2,1,5])singleError=Math.max(singleError,Math.abs(actual.uOf(p,x)-c*Math.exp(-Math.abs(x-c*t))));
}
assert(singleError<1e-13);
const wrong=load(s=>s.replace('sep * k + c * t','sep * k + 1.17 * c * t'));
const wrongSpeedResidual=residual(wrong,[1.85,.95],.4,0,.005);
assert(wrongSpeedResidual>.1);
const result={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),scope:'Positive one-to-four peakons, sampled times and separations; BSS output against distributional particle ODE, mass and Hamiltonian. No weak-solution proof or print audit.',cases,singleError,wrongSpeedResidual,pass:true};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/peakon-science.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
