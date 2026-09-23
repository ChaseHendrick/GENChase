'use strict';
// Independent bond-tension RK4 and analytic linear-chain reference.
function initial(n){const z=new Float64Array(2*n);for(let i=1;i<n-1;i++)z[i]=Math.sin(Math.PI*i/(n-1));return z;}
function rhs(z,a){const n=z.length/2,d=new Float64Array(2*n),b=new Float64Array(n-1);for(let i=0;i<n-1;i++){const r=z[i+1]-z[i];b[i]=r*(1+a*r);}for(let i=1;i<n-1;i++){d[i]=z[n+i];d[n+i]=b[i]-b[i-1];}return d;}
function advance(z,a,h){const stage=(d,k)=>z.map((x,i)=>x+k*d[i]),A=rhs(z,a),B=rhs(stage(A,h/2),a),C=rhs(stage(B,h/2),a),D=rhs(stage(C,h),a);return z.map((x,i)=>x+h*(A[i]+2*B[i]+2*C[i]+D[i])/6);}
function diagnostics(z,a){const n=z.length/2,omega=2*Math.sin(Math.PI/(2*(n-1)));let q=0,p=0,E=0;for(let i=1;i<n-1;i++){const s=Math.sin(Math.PI*i/(n-1));q+=z[i]*s;p+=z[n+i]*s;E+=z[n+i]**2/2;}for(let i=0;i<n-1;i++){const r=z[i+1]-z[i];E+=r*r/2+a*r**3/3;}return{mode:(p*p+omega*omega*q*q)/(n-1),total:E,period:2*Math.PI/omega};}
function history(n,H,a,time,step){let z=initial(n);const count=Math.ceil(time/H/step),dt=time/H/count,field=new Float64Array(n*H),zero=diagnostics(z,a);let min=1,drift=0,last=1;for(let y=0;y<H;y++){for(let k=0;k<count;k++)z=advance(z,a,dt);field.set(z.subarray(0,n),y*n);const d=diagnostics(z,a);last=d.mode/zero.mode;min=Math.min(min,last);drift=Math.max(drift,Math.abs(d.total/zero.total-1));}return{z,field,metric:last,extra:min,drift,period:zero.period};}
function linear(n,t){const omega=2*Math.sin(Math.PI/(2*(n-1))),z=initial(n);for(let i=1;i<n-1;i++){const A=z[i];z[i]=A*Math.cos(omega*t);z[n+i]=-A*omega*Math.sin(omega*t);}return z;}
module.exports={initial,rhs,history,linear,diagnostics};
