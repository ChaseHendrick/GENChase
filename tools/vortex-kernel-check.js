'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/modules/vortex.js'),'utf8');
const start=source.indexOf('  function vortexSubsteps('),end=source.indexOf('  function surprise(',start);assert(start>0&&end>start);
const {step,substeps}=vm.runInNewContext(source.slice(start,end)+'\n({step:vortexAdvance,substeps:vortexSubsteps})');
const n=18,kap=.7,h=.02,flux=.14;
const r=Float64Array.from({length:n*n},(_,i)=>Math.sin(i*1.43)*.31),v=Float64Array.from({length:n*n},(_,i)=>Math.cos(i*.63)*.24);
function reference(r,v,flux){const out=[new Float64Array(n*n),new Float64Array(n*n)]; const local=i=>{const d=1+(r[i]*r[i]+v[i]*v[i])*Math.expm1(2*h),s=Math.sqrt(Math.exp(2*h)/d);return [r[i]*s,v[i]*s];};for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const i=y*n+x,a=local(i);out[0][i]=a[0];out[1][i]=a[1];for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){let b=[0,0];if(x+dx>0&&x+dx<n-1&&y+dy>0&&y+dy<n-1)b=local(i+dx+dy*n);const angle=dx*flux*(y-n/2),c=Math.cos(angle),s=Math.sin(angle);out[0][i]+=h/(kap*kap)*(c*b[0]-s*b[1]-a[0]);out[1][i]+=h/(kap*kap)*(s*b[0]+c*b[1]-a[1]);}}return out;}
const error=(a,b)=>Math.max(...a.flatMap((x,k)=>Array.from(x,(v,i)=>Math.abs(v-b[k][i]))));
const actual=step(r,v,n,n,flux,kap,h),expected=reference(r,v,flux),err=error(actual,expected);assert(err<1e-14);assert(error(actual,reference(r,v,-flux))>1e-3);
let maxAmp=0;for(let k=.5;k<=4;k+=.25){const dt=.12/substeps(k);assert(dt/(k*k)<=.2+1e-14);let a=r,b=v;for(let t=0;t<80;t++)[a,b]=step(a,b,n,n,flux,k,dt);for(let i=0;i<a.length;i++){assert(Number.isFinite(a[i])&&Number.isFinite(b[i]));maxAmp=Math.max(maxAmp,Math.hypot(a[i],b[i]));}}assert(maxAmp<=1+1e-12);
// Small-amplitude Dirichlet eigenmode: compare at equal physical time to its linear solution.
const eigen=4*Math.sin(Math.PI/(2*(n-1)))**2+4*Math.sin(2*Math.PI/(2*(n-1)))**2, T=.2;
const initial=Float64Array.from({length:n*n},(_,i)=>1e-6*Math.sin(Math.PI*(i%n)/(n-1))*Math.sin(2*Math.PI*Math.floor(i/n)/(n-1)));
let errors=[];for(const dt of [.02,.01,.005]){let a=initial,b=new Float64Array(n*n);for(let t=0;t<Math.round(T/dt);t++)[a,b]=step(a,b,n,n,0,1,dt);const target=Array.from(initial,x=>x*Math.exp((1-eigen)*T));errors.push(Math.max(...Array.from(a,(x,i)=>Math.abs(x-target[i]))));}assert(errors[0]/errors[1]>1.9&&errors[1]/errors[2]>1.9);
console.log('VORTEX KERNEL OK: '+JSON.stringify({stencilError:err,maxAmplitude:maxAmp,linearTimeErrors:errors,signFailureControl:true}));
