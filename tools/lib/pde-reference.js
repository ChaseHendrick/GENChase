'use strict';
// Independent Float64 conservative lattice reference. No production GLSL is evaluated here.
function model(p) {
 const {W,H,id,bc}=p,n=W*H,neighbors=Array.from({length:8},()=>new Int32Array(n)),dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
 const wrap=(x,N)=>bc==='noflux'?Math.max(0,Math.min(N-1,x)):(x+N)%N;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)dirs.forEach(([dx,dy],k)=>neighbors[k][y*W+x]=wrap(y+dy,H)*W+wrap(x+dx,W));
 const [E,A,N,S,NE,NW,SE,SW]=neighbors,lap=(f)=>{
  const out=new Float64Array(n);
  for(let i=0;i<n;i++)out[i]=id==='pfc'?(4*(f[E[i]]+f[A[i]]+f[N[i]]+f[S[i]])+f[NE[i]]+f[NW[i]]+f[SE[i]]+f[SW[i]]-20*f[i])/6:f[E[i]]+f[A[i]]+f[N[i]]+f[S[i]]-4*f[i];
  return out;
 };
 function chemistry(f) {
  const L=lap(f),LL=['pfc','swift','ks'].includes(id)?lap(L):null,mu=new Float64Array(n);
  for(let i=0;i<n;i++){
   const u=f[i],gx=(f[E[i]]-f[A[i]])/2,gy=(f[N[i]]-f[S[i]])/2;
   mu[i]=id==='pfc'?(p.r+p.k0**4)*u+2*p.k0**2*L[i]+LL[i]+u**3:['swift','ks'].includes(id)?L[i]:u**3-u-p.eps**2*L[i]+(id==='amb'?p.lambda*(gx*gx+gy*gy):0);
  }
  return {L,LL,mu};
 }
 function rhs(f) {
  const {L,LL,mu}=chemistry(f),out=lap(mu);
  for(let i=0;i<n;i++){
   const u=f[i],gx=(f[E[i]]-f[A[i]])/2,gy=(f[N[i]]-f[S[i]])/2;
   if(id==='swift')out[i]=(p.r-p.k0**4)*u-2*p.k0**2*L[i]-LL[i]+p.g*u*u-p.cub*u**3;
   else if(id==='ks')out[i]=-p.nu*LL[i]-L[i]-.5*p.alpha*(gx*gx+gy*gy);
   else{
    if((id==='cahn'||id==='ohta')&&p.deg){out[i]=0;for(const nb of[E,A,N,S]){const j=nb[i];out[i]+=.5*(Math.max(1-u*u,0)+Math.max(1-f[j]*f[j],0))*(mu[j]-mu[i]);}}
    out[i]*=p.M;
    if(id==='ohta')out[i]-=p.sigma*(u-p.mean);
    if(id==='amb')for(const nb of[E,A,N,S]){const j=nb[i];out[i]-=.5*p.zeta*(L[i]+L[j])*(f[j]-u);}
   }
  }
  return out;
 }
 function evolve(initial,dt,steps,method='rk4') {
  let f=Float64Array.from(initial);const plus=(a,b,s)=>Float64Array.from(a,(v,i)=>v+s*b[i]);
  for(let j=0;j<steps;j++){
   const a=rhs(f);if(method==='euler'){f=plus(f,a,dt);continue;}
   const b=rhs(plus(f,a,dt/2)),c=rhs(plus(f,b,dt/2)),d=rhs(plus(f,c,dt));
   f=Float64Array.from(f,(v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);
  }return f;
 }
 return {rhs,chemistry,evolve};
}
function error(a,b){let max=0,sum=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];max=Math.max(max,Math.abs(d));sum+=d*d;}return {max,rms:Math.sqrt(sum/a.length)};}
module.exports={model,error};
