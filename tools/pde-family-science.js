// Actual maintained PDE shaders against independent float64 discrete references.
// node tools/pde-family-science.js [--write]
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/modules/pde.js'),'utf8');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function rhs(f,p) {
  const {W,H,id,bc}=p, n=W*H, out=new Float64Array(n), L=new Float64Array(n), mu=new Float64Array(n);
  const index=(x,y)=>{const wrap=(v,N)=>bc==='noflux'?Math.max(0,Math.min(N-1,v)):(v+N)%N;return wrap(y,H)*W+wrap(x,W);};
  const lap=(v,x,y,nine=false)=>{
    const c=v[index(x,y)],axis=v[index(x+1,y)]+v[index(x-1,y)]+v[index(x,y+1)]+v[index(x,y-1)];
    if(!nine)return axis-4*c;
    return (4*axis+v[index(x+1,y+1)]+v[index(x-1,y+1)]+v[index(x+1,y-1)]+v[index(x-1,y-1)]-20*c)/6;
  };
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)L[y*W+x]=lap(f,x,y,id==='pfc');
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const j=y*W+x,u=f[j],gx=(f[index(x+1,y)]-f[index(x-1,y)])/2,gy=(f[index(x,y+1)]-f[index(x,y-1)])/2;
    if(id==='pfc')mu[j]=(p.r+p.k0**4)*u+2*p.k0**2*L[j]+lap(L,x,y,true)+u**3;
    else if(id==='amb'||id==='ohta')mu[j]=u**3-u-p.eps**2*L[j]+(id==='amb'?p.lambda*(gx*gx+gy*gy):0);
    else if(id==='swift')out[j]=p.r*u-p.k0**4*u-2*p.k0**2*L[j]-lap(L,x,y)+p.g*u*u-p.cub*u**3;
    else if(id==='ks')out[j]=-p.nu*lap(L,x,y)-L[j]-.5*p.alpha*(gx*gx+gy*gy);
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const j=y*W+x;
    if(id==='pfc')out[j]=p.M*lap(mu,x,y,true);
    else if(id==='ohta'||id==='amb'){
      let diffusion=lap(mu,x,y),active=0;
      if(id==='ohta'&&p.deg){diffusion=0;const mobility=c=>Math.max(1-c*c,0);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const k=index(x+dx,y+dy);diffusion+=(mobility(f[j])+mobility(f[k]))*.5*(mu[k]-mu[j]);}}
      if(id==='amb')for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const k=index(x+dx,y+dy);active+=.5*(L[j]+L[k])*(f[k]-f[j]);}
      out[j]=p.M*diffusion-(id==='ohta'?p.sigma*(f[j]-p.mean):p.zeta*active);
    }
  }
  return out;
}
const plus=(a,b,h)=>Float64Array.from(a,(v,i)=>v+h*b[i]);
function integrate(f,p,dt,steps,method='euler'){
  f=Float64Array.from(f);
  for(let n=0;n<steps;n++){
    const a=rhs(f,p);
    if(method==='euler')f=plus(f,a,dt);
    else{const b=rhs(plus(f,a,dt/2),p),c=rhs(plus(f,b,dt/2),p),d=rhs(plus(f,c,dt),p);f=Float64Array.from(f,(v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);}
  }
  return f;
}
function diff(a,b){let max=0,sum=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];max=Math.max(max,Math.abs(d));sum+=d*d;}return{max,rms:Math.sqrt(sum/a.length)};}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const params=id=>({id,W:16,H:12,bc:'periodic',M:.7,eps:1.1,sigma:.12,mean:.2,deg:false,lambda:.8,zeta:-1.2,r:id==='pfc'?-.25:.3,k0:.7,g:.45,cub:1.1,nu:1.1,alpha:.9});
function field(p){return Float32Array.from({length:p.W*p.H},(_,j)=>{const x=j%p.W,y=Math.floor(j/p.W);return .2+.15*Math.cos(2*Math.PI*(2*x/p.W+y/p.H))+.07*Math.sin(2*Math.PI*(3*x/p.W-2*y/p.H));});}
(async()=>{
 const browser=await chromium.launch({args:glArgs()});
 try{
  const page=await browser.newPage();await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound/pde-family-science');
  await page.evaluate(source.slice(0,source.indexOf('  Studio.register({'))+'\nwindow.pdeAudit={MU_CH,STEP_CH,STEP_OK,MU_AMB,STEP_AMB,MU_SH,STEP_SH,MU_KS,STEP_KS,MU_PFC,MID_PFC,STEP_PFC,chMaxDt,shMaxDt,ksMaxDt,pfcMaxDt};\n})();');
  await page.evaluate(require('./lib/pde-gpu-harness'));
  const gpu=(p,f,dt,steps,mutant)=>page.evaluate(arg=>window.runPde(arg),{p,initial:Array.from(f),dt,steps,mutant});
  const rows=[],temporal=[],controls=[];
  for(const id of['pfc','swift','ks','ohta','amb']){
   for(const bc of['periodic','noflux'])for(const deg of(id==='ohta'?[false,true]:[false])){
    const p={...params(id),bc,deg},f=field(p);p.mean=mean(f);const dt=.003,steps=24;
    const actual=await gpu(p,f,dt,steps),reference=integrate(f,p,dt,steps),error=diff(actual.out,reference),massDrift=mean(actual.out)-mean(f);
    assert(error.max<3e-6,id+' independent stencil disagreement');assert(!actual.flagged,id+' valid fixture flagged');
    if(['pfc','ohta','amb'].includes(id))assert(Math.abs(massDrift)<1e-7,id+' conservation failed');
    const mutant=await gpu(p,f,dt,1,'sign'),controlError=diff(mutant.out,integrate(f,p,dt,1)).max;assert(controlError>1e-5,id+' sign control missed');
    rows.push({id,boundary:bc,degenerate:deg,grid:[p.W,p.H],dt,steps,error,massDrift,signControlError:controlError});
   }
   const p=params(id),f=field(p);p.mean=mean(f);const T=.24,ref=integrate(f,p,.00025,960,'rk4'),refFine=integrate(f,p,.000125,1920,'rk4');
   const sensitivity=diff(ref,refFine);assert(sensitivity.max<1e-10,id+' RK4 reference sensitivity');
   const levels=[];for(const dt of[.012,.006,.003]){const a=await gpu(p,f,dt,Math.round(T/dt));assert(!a.flagged);levels.push({dt,steps:Math.round(T/dt),error:diff(a.out,refFine)});}
   const orders=levels.slice(1).map((r,i)=>Math.log2(levels[i].error.rms/r.error.rms));assert(orders.every(v=>v>.85&&v<1.2),id+' Euler convergence');
   temporal.push({id,grid:[p.W,p.H],elapsed:T,reference:'independent float64 RK4 at dt=0.000125',referenceSensitivity:sensitivity,levels,orders});
   process.stderr.write(id+' stencil and fixed-time checks passed\n');
  }
  // This high-frequency oblique mode distinguishes the old mixed stencil from a consistent Δ9.
  {const p={...params('pfc'),W:32,H:32},f=Float32Array.from({length:1024},(_,j)=>.2+.1*Math.cos(2*Math.PI*(11*(j%32)/32+9*Math.floor(j/32)/32))),dt=.003;
   const a=await gpu(p,f,dt,1),b=await gpu(p,f,dt,1,'mixed-pfc'),ref=integrate(f,p,dt,1),correct=diff(a.out,ref).max,wrong=diff(b.out,ref).max;
   assert(correct<2e-7&&wrong>1e-3,'PFC mixed-stencil control');controls.push({name:'PFC historical mixed stencil',correctError:correct,wrongError:wrong});}
  // Constant KS height may exceed the old visual clamp; its derivatives vanish exactly.
  {const p=params('ks'),f=new Float32Array(p.W*p.H).fill(-9),a=await gpu(p,f,.01,16),b=await gpu(p,f,.01,1,'clip-ks');assert(diff(a.out,f).max===0);assert(diff(b.out,f).max===1);controls.push({name:'KS constant height -9 is stationary',correctError:0,oldClippingError:1});}
  // Ohta's zero mode follows a known exact Euler recurrence for an intentionally offset target.
  {const p={...params('ohta'),mean:.2},f=new Float32Array(p.W*p.H).fill(.4),dt=.01,steps=40,target=p.mean+(f[0]-p.mean)*(1-dt*p.sigma)**steps;
   const a=await gpu(p,f,dt,steps),b=await gpu(p,f,dt,steps,'wrong-mean'),err=Math.abs(mean(a.out)-target),wrong=Math.abs(mean(b.out)-target);assert(err<4e-7&&wrong>1e-3);controls.push({name:'Ohta uniform zero-mode relaxation',exactEulerTarget:target,correctError:err,wrongTargetError:wrong});}
  // Analytic lattice Fourier decay, infinitesimal around zero; nonlinearity is O(amplitude²).
  const modes=[];
  for(const id of['pfc','swift','ks','ohta','amb']){
    const p={...params(id),W:32,H:24,mean:0,g:0,lambda:0,zeta:0},mx=7,my=5,ax=2*Math.PI*mx/p.W,ay=2*Math.PI*my/p.H;
    const q=id==='pfc'?(20-8*(Math.cos(ax)+Math.cos(ay))-4*Math.cos(ax)*Math.cos(ay))/6:4-2*Math.cos(ax)-2*Math.cos(ay);
    const rate=id==='pfc'?-p.M*q*(p.r+(p.k0*p.k0-q)**2):id==='swift'?p.r-(p.k0*p.k0-q)**2:id==='ks'?q-p.nu*q*q:p.M*q*(1-p.eps*p.eps*q)-(id==='ohta'?p.sigma:0);
    const amp=1e-4,dt=.001,steps=80,f=Float32Array.from({length:p.W*p.H},(_,j)=>amp*Math.cos(ax*(j%p.W)+ay*Math.floor(j/p.W))),a=await gpu(p,f,dt,steps),factor=(1+dt*rate)**steps;
    const expected=Array.from(f,v=>v*factor),error=diff(a.out,expected).max;assert(error<5e-9,id+' analytic discrete mode');modes.push({id,grid:[p.W,p.H],wave:[mx,my],q,rate,dt,steps,error});
  }
  const ceilings=await page.evaluate(()=>{const S=window.pdeAudit;return{pfcHigh:S.pfcMaxDt(2,.2,.45),pfcHalfMobility:S.pfcMaxDt(1,.2,.45),shHigh:S.shMaxDt(-.4,.35,1.2,2),ch:S.chMaxDt(2.5,2.4),ks:S.ksMaxDt(2.4)};});
  assert(ceilings.pfcHigh>0&&ceilings.pfcHigh<.005);assert.equal(ceilings.pfcHalfMobility,2*ceilings.pfcHigh);assert(ceilings.shHigh<.02);
  // A high-amplitude grid-scale perturbation checks the ceiling in the range
  // actually monitored by the solver. The obsolete dt=.08 control amplifies it.
  const pfcStability=[];
  for(const M of [.2,1,2]) {
    const p={...params('pfc'),W:32,H:32,M,r:.2,k0:.45};
    const dt=await page.evaluate(p=>window.pdeAudit.pfcMaxDt(p.M,p.r,p.k0),p);
    const f=Float32Array.from({length:1024},(_,j)=>2.7+.01*((j%32+Math.floor(j/32))%2?1:-1));
    const a=await gpu(p,f,dt,16),b=await gpu(p,f,.08,1);
    const amplitude=v=>Math.abs(v.reduce((sum,u,j)=>sum+u*((j%32+Math.floor(j/32))%2?1:-1),0)/v.length);
    const finalAmplitude=amplitude(a.out),wrongAmplitude=amplitude(b.out);
    assert(!a.flagged&&finalAmplitude<2e-5,'PFC ceiling did not damp high mode');
    assert(wrongAmplitude>.01,'Historical dt did not expose mode amplification');
    pfcStability.push({M,dt,steps:16,initialAmplitude:amplitude(f),finalAmplitude,historicalDt:.08,historicalAmplitude:wrongAmplitude,historicalFlagged:b.flagged});
  }
  const report={schema:1,date:new Date().toISOString().slice(0,10),source:{path:'src/modules/pde.js',sha256:hash(source)},harness:{path:'tools/pde-family-science.js',sha256:hash(fs.readFileSync(__filename))},backend:await browser.version(),scope:'Noise-free, unit-cell finite lattice. Independent Euler stencil, RK4 fixed-grid time refinement and analytic Fourier modes; no continuum convergence, phase diagram, thermal noise or global stability validation.',criteria:{stencilMax:3e-6,conservedMean:1e-7,signControlMin:1e-5,eulerOrder:[.85,1.2],referenceSensitivityMax:1e-10,analyticModeMax:5e-9},rows,temporal,modes,controls,ceilings,pfcStability,passed:true};
  if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/pde-family-science.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
