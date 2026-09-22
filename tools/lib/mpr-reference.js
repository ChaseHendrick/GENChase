'use strict';
// Independent fifth-order Dormand-Prince integration of recorded MPR preparations.
// Uses no production time-step, forcing or plotting code. Pulse events are split.
module.exports=function reference(p,initialR,initialV,times,maxStep){
 const A=[[],[1/5],[3/40,9/40],[44/45,-56/15,32/9],[19372/6561,-25360/2187,64448/6561,-212/729],[9017/3168,-355/33,46732/5247,49/176,-5103/18656]],C=[0,1/5,3/10,4/5,8/9,1],B=[35/384,0,500/1113,125/192,-2187/6784,11/84],n=initialR.length,R=new Float64Array(n*times.length),V=new Float64Array(R.length),a=new Float64Array(6),b=new Float64Array(6);
 for(let cell=0;cell<n;cell++){
  let r=initialR[cell],v=initialV[cell],time=0;R[cell]=r;V[cell]=v;
  for(let sample=1;sample<times.length;sample++){
   while(time<times[sample]-1e-13){
    let end=times[sample];if(p.drive==='pulse')for(const event of [.25*p.duration,.6*p.duration])if(event>time+1e-12)end=Math.min(end,event);
    const h=Math.min(maxStep,end-time),pulse=p.drive==='pulse'&&(time+h/2>=.25*p.duration&&time+h/2<.6*p.duration)?p.amplitude:0;
    for(let stage=0;stage<6;stage++){
     let rr=r,vv=v;for(let k=0;k<stage;k++){rr+=h*A[stage][k]*a[k];vv+=h*A[stage][k]*b[k];}
     const current=p.drive==='sine'?p.amplitude*Math.sin(2*Math.PI*p.frequency*(time+C[stage]*h)):pulse;
     a[stage]=p.delta/Math.PI+2*rr*vv;b[stage]=vv*vv+p.eta+p.J*rr+current-(Math.PI*rr)**2;
    }
    for(let k=0;k<6;k++){r+=h*B[k]*a[k];v+=h*B[k]*b[k];}time+=h;
   }
   time=times[sample];R[sample*n+cell]=r;V[sample*n+cell]=v;
  }
 }
 return {r:R,v:V};
};
