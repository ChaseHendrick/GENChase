// Independent differential identities for maintained analytic maps.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function load(id,names,mutate=s=>s){
 const source=fs.readFileSync(path.join(root,'src/modules/'+id+'.js'),'utf8'),hooks={};
 const Studio={util:{TAU:2*Math.PI,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),makeRng:()=>()=>.5},PALETTES:{},register(){}};
 const marker='  Studio.register({';assert.equal(source.split(marker).length,2);
 new Function('Studio','hooks',mutate(source).replace(marker,'  Object.assign(hooks,{'+names+'});\n'+marker))(Studio,hooks);
 return {hooks,sourceSha256:crypto.createHash('sha256').update(source).digest('hex')};
}
const norm=a=>Math.hypot(...a),sub=(a,b)=>a.map((v,i)=>v-b[i]),scale=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function differences(f,x,h){
 const lo=f(x-h),mid=f(x),hi=f(x+h);
 return {d1:scale(sub(hi,lo),.5/h),d2:hi.map((v,i)=>(v-2*mid[i]+lo[i])/(h*h))};
}
const H=load('hasimoto','posAt');
function filament(api,nu,tau,h){
 const f=(s,t)=>{const p=api.posAt(s,t,nu,tau);return [p.x,p.y,p.z];};
 let arc=0,curvature=0,flow=0;
 for(const s of [-1.1,.2,1.5])for(const t of [-.4,.3]){
  const {d1,d2}=differences(ss=>f(ss,t),s,h),dt=differences(tt=>f(s,tt),t,h).d1;
  arc=Math.max(arc,Math.abs(norm(d1)-1));
  curvature=Math.max(curvature,Math.abs(norm(cross(d1,d2))/norm(d1)**3-2*nu/Math.cosh(nu*(s-2*tau*t))));
  flow=Math.max(flow,norm(sub(dt,cross(d1,d2))));
 }
 return {arc,curvature,flow};
}
const hasimoto=[];
for(const [nu,tau] of [[.45,0],[.88,.34],[1.72,.46],[.64,1.32]]){
 const rows=[.02,.01,.005].map(h=>({h,...filament(H.hooks,nu,tau,h)}));
 for(const metric of ['arc','curvature','flow']){
  assert(rows[2][metric]<.002,JSON.stringify(rows));
  assert(rows[0][metric]/rows[2][metric]>12&&rows[0][metric]/rows[2][metric]<20,metric);
 }
 hasimoto.push({nu,tau,rows});
}
const badH=load('hasimoto','posAt',s=>s.replace('(nu * nu - tau0 * tau0) * t','1.2 * (nu * nu - tau0 * tau0) * t'));
const filamentFailure=filament(badH.hooks,.88,.34,.005).flow;assert(filamentFailure>.05);

const G=load('gerstner','stateAt,specFrom');
function material(api,steep,h,wrong=false){
 const spec=api.specFrom({steep,trains:'1',mix:.5,kRatio:.7,t:0});
 if(wrong)spec.omega*=1.2;
 const f=(a,b,t)=>{const p=api.stateAt(a,b,t,spec);return [p.x,p.z];};
 let jacobian=0,pressure=0;
 for(const a of [.07,.3,.8])for(const t of [.1,.37,.61]){
  for(const b of [0,-.1,-.3]){
   const da=differences(aa=>f(aa,b,t),a,h).d1,db=differences(bb=>f(a,bb,t),b,h).d1;
   const J=da[0]*db[1]-da[1]*db[0],target=1-spec.k**2*spec.A**2*Math.exp(2*spec.k*b);
   jacobian=Math.max(jacobian,Math.abs(J-target));assert(J>0);
   if(b===0){const acc=differences(tt=>f(a,b,tt),t,h).d2;
    pressure=Math.max(pressure,Math.abs(acc[0]*da[0]+(acc[1]+spec.g)*da[1])/spec.g);
   }
  }
 }
 return {jacobian,pressure};
}
const gerstner=[];
for(const steep of [.22,.54,.86]){
 const rows=[.004,.002,.001].map(h=>({h,...material(G.hooks,steep,h)}));
 for(const metric of ['jacobian','pressure']){
  assert(rows[2][metric]<.0001);assert(rows[0][metric]/rows[2][metric]>12&&rows[0][metric]/rows[2][metric]<20);
 }
 gerstner.push({steep,rows});
}
const dispersionFailure=material(G.hooks,.54,.001,true).pressure;assert(dispersionFailure>.1);

const C=load('chladni','makeField');
function membrane(api,n,m,h,wrong=false){
 const s={mode:'standing',plate:'square',rotation:0,zoom:1,freq:1,n1:n,m1:m,a1:1,a2:0,a3:0,symmetric:false,seed:'audit'};
 const f=api.makeField(s,0),lambda=Math.PI**2*(n*n+m*m)*(wrong?1.2:1);
 let residual=0,boundary=0;
 for(const x of [-.73,.13,.67])for(const y of [-.61,.24,.78]){
  const lap=(f(x+h,y)+f(x-h,y)+f(x,y+h)+f(x,y-h)-4*f(x,y))/(h*h);
  residual=Math.max(residual,Math.abs(lap+lambda*f(x,y))/lambda);
 }
 for(const v of [-.7,.2,.8])for(const edge of [-1,1])boundary=Math.max(boundary,Math.abs((f(edge+h,v)-f(edge-h,v))/(2*h)),Math.abs((f(v,edge+h)-f(v,edge-h))/(2*h)));
 return {residual,boundary};
}
const chladni=[];
for(const [n,m] of [[1,2],[3,2],[4,5]]){
 const rows=[.004,.002,.001].map(h=>({h,...membrane(C.hooks,n,m,h)}));
 assert(rows[2].residual<.0001&&rows[2].boundary<1e-10);
 assert(rows[0].residual/rows[2].residual>12&&rows[0].residual/rows[2].residual<20);
 chladni.push({n,m,rows});
}
const eigenvalueFailure=membrane(C.hooks,3,2,.001,true).residual;assert(eigenvalueFailure>.05);
const result={sourceSha256:{hasimoto:H.sourceSha256,gerstner:G.sourceSha256,chladni:C.sourceSha256},hasimoto,filamentFailure,gerstner,dispersionFailure,chladni,eigenvalueFailure,pass:true,limitations:['Finite analytic-map samples only; no renderer or print audit.','Gerstner covers one train only. Chladni covers integer square cosine modes only, not elastic plates or circular modes.','Hasimoto checks local-induction binormal flow, not full Biot-Savart hydrodynamics.']};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/material-wave-science.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
