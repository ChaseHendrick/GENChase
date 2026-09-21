// Independent PDE-residual and asymptotic tests for maintained analytic wave maps.
'use strict';
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function load(id, names){
 const source=fs.readFileSync(path.join(root,'src/modules/'+id+'.js'),'utf8'), hooks={};
 const Studio={util:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}, PALETTES:new Proxy({}, {get:()=>({})}), register(){}};
 new Function('Studio','hooks',source.replace('  Studio.register({','  Object.assign(hooks, {'+names.join(',')+'});\n  Studio.register({'))(Studio,hooks);
 return {source,hooks};
}
const rogue=load('rogue',['waveValue','peakReference']), kdv=load('soliton',['kdvValue','kdvWindow']);
function nlsResidual(f,x,t,h,dispersion=.5){
 const p=f(x,t),xp=f(x+h,t),xm=f(x-h,t),tp=f(x,t+h),tm=f(x,t-h), amp=p[0]**2+p[1]**2;
 const re=-(tp[1]-tm[1])/(2*h)+dispersion*(xp[0]-2*p[0]+xm[0])/(h*h)+amp*p[0];
 const im=(tp[0]-tm[0])/(2*h)+dispersion*(xp[1]-2*p[1]+xm[1])/(h*h)+amp*p[1];
 return Math.hypot(re,im);
}
const nls=[];
for(const kind of ['peregrine','akhmediev','km']) for(const a of [.12,.25,.42]) {
 const f=(x,t)=>rogue.hooks.waveValue(kind,a,x,t), errors=[];
 for(const h of [.004,.002,.001]) {
  let max=0;
  for(const x of [-2.3,-.9,-.31,0,.23,1.17,2.8]) for(const t of [-1.3,-.37,0,.19,.71,1.8]) max=Math.max(max,nlsResidual(f,x,t,h));
  errors.push(max);
 }
 assert(errors[2]<.003,kind+' residual '+errors);
 const orders=[Math.log2(errors[0]/errors[1]),Math.log2(errors[1]/errors[2])];
 assert(orders.every(x=>x>1.9&&x<2.1));
 const z=f(0,0), peak=z[0]**2+z[1]**2, expected=kind==='peregrine'?9:(1+2*Math.sqrt(kind==='km'?1+2*a:2*a))**2;
 assert(Math.abs(peak-expected)<1e-12);
 let periodError=0;
 if(kind!=='peregrine'){
  const lam=Math.sqrt(kind==='km'?1+2*a:2*a), period=kind==='km'?2*Math.PI/(lam*2*Math.sqrt(lam*lam-1)):Math.PI/Math.sqrt(1-lam*lam);
  const z0=f(.42,.29),z1=f(kind==='km'?.42:.42+period,kind==='km'?.29+period:.29);
  periodError=Math.abs(z0[0]**2+z0[1]**2-z1[0]**2-z1[1]**2);assert(periodError<1e-11);
 }
 nls.push({kind,a,steps:[.004,.002,.001],maximumAbsoluteResidual:errors,observedOrders:orders,peakIntensity:peak,analyticPeak:expected,periodIntensityError:periodError});
}
const wrongNormalization=nlsResidual((x,t)=>rogue.hooks.waveValue('peregrine',.25,x,t),.23,.19,.001,1);
assert(wrongNormalization>.1);
function kdvResidual(f,nu,x,t,h){
 const u=f(x,t),xx=[-2,-1,0,1,2].map(k=>f(x+k*h,t));
 const ux=(xx[0]-8*xx[1]+8*xx[3]-xx[4])/(12*h);
 const uxxx=(-xx[0]+2*xx[1]-2*xx[3]+xx[4])/(2*h**3);
 const ut=(f(x,t+h)-f(x,t-h))/(2*h);
 return Math.abs(nu*(ut+6*u*ux+nu*nu*uxxx));
}
function peak(f,lo,hi){
 for(let i=0;i<90;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(f(a)<f(b))lo=a;else hi=b;}return .5*(lo+hi);
}
const solitons=[];
for(const [c1,c2,nu] of [[1.7,.65,.22],[1.1,1.05,.4],[2.4,.2,.08],[.4,1.8,.6]]){
 const f=(x,t)=>kdv.hooks.kdvValue(c1,c2,nu,x,t),errors=[];
 for(const scale of [.008,.004,.002]){
  let max=0;
  for(const x of [-3,-1,-.31,0,.29,.97,2.4])for(const t of [-2.7,-.43,0,.31,1.9]) max=Math.max(max,kdvResidual(f,nu,x*nu,t*nu,scale*nu));
  errors.push(max);
 }
 assert(errors[2]<.001);const orders=[Math.log2(errors[0]/errors[1]),Math.log2(errors[1]/errors[2])];assert(orders.every(v=>v>1.85&&v<2.15));
 const fast=Math.max(c1,c2),slow=Math.min(c1,c2),kf=Math.sqrt(fast)/nu,ks=Math.sqrt(slow)/nu,A=((kf-ks)/(kf+ks))**2;
 const T=45*nu/((fast-slow)*Math.sqrt(slow)), before=peak(x=>f(x,-T),-fast*T-2/kf,-fast*T+2/kf),after=peak(x=>f(x,T),fast*T-Math.log(A)/kf-2/kf,fast*T-Math.log(A)/kf+2/kf);
 const measuredShift=(after-fast*T)-(before+fast*T),expectedShift=-Math.log(A)/kf;
 assert(Math.abs(measuredShift-expectedShift)<2e-6*nu);
 const massRows=[];
 for(const t of [-3*nu,0,3*nu]) {
  const lo=-60*nu/Math.sqrt(slow)+slow*t,hi=60*nu/Math.sqrt(slow)+fast*t,n=20000,dx=(hi-lo)/n;
  let mass=0;for(let i=0;i<=n;i++)mass+=f(lo+i*dx,t)*dx*(i===0||i===n?.5:1);
  const exact=2*nu*(Math.sqrt(c1)+Math.sqrt(c2));assert(Math.abs(mass-exact)<1e-10);massRows.push({time:t,mass,wholeLineReference:exact});
 }
 solitons.push({c1,c2,nu,maximumScaledResidual:errors,observedOrders:orders,measuredFastPhaseShift:measuredShift,analyticFastPhaseShift:expectedShift,massRows});
}
const nu=.3,c1=1.7,c2=.65;
const additive=(x,t)=>c1/2/Math.cosh(Math.sqrt(c1)*(x-c1*t)/(2*nu))**2+c2/2/Math.cosh(Math.sqrt(c2)*(x-c2*t)/(2*nu))**2;
const missingInteraction=kdvResidual(additive,nu,.27*nu,.31*nu,.001*nu);assert(missingInteraction>.1);
const equal=kdv.hooks.kdvValue(1,1,.3,0,0);assert(Math.abs(equal-.5)<1e-14);
const result={scope:'Analytic maps, sampled equation residuals, periods, mass and asymptotic phase shifts. Not independent time integration, physical ocean accuracy or full print validation.',sourceSha256:Object.fromEntries([['rogue',rogue],['soliton',kdv]].map(([id,a])=>[id,crypto.createHash('sha256').update(a.source).digest('hex')])),nls,solitons,controls:{wrongNlsDispersionResidual:wrongNormalization,additivePulsesResidual:missingInteraction,equalSpeedSinglePeak:equal}};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/analytic-wave-science.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
