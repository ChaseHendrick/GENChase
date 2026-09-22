'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/modules/pde.js'),'utf8'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
async function main(){
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),rows=[];
 try{
 const page=await browser.newPage();await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound/pde-space');
 await page.evaluate(source.slice(0,source.indexOf('  Studio.register({'))+'\nwindow.pdeAudit={MU_CH,STEP_CH,STEP_OK,MU_AMB,STEP_AMB,MU_SH,STEP_SH,MU_KS,STEP_KS,MU_PFC,MID_PFC,STEP_PFC};\n})();');await page.evaluate(require('./lib/pde-gpu-harness'));
 const L=64,T=2,dt=.002,amplitude=1e-4,wave=[2,1],q=5*(2*Math.PI/L)**2;
 for(const id of['cahn','ohta','amb','swift','ks','pfc']){
  const physical={M:.7,eps:1.1,sigma:.005,mean:0,deg:false,lambda:.8,zeta:-1.2,r:id==='pfc'?-.25:.24,k0:.7,g:0,cub:1,nu:1.1,alpha:.9},p=physical;
  const rate=id==='pfc'?-p.M*q*(p.r+(p.k0*p.k0-q)**2):id==='swift'?p.r-(p.k0*p.k0-q)**2:id==='ks'?q-p.nu*q*q:p.M*q*(1-p.eps*p.eps*q)-(id==='ohta'?p.sigma:0),target=amplitude*Math.exp(T*rate),levels=[];
  for(const N of[16,32,64]){
   const h=L/N,params={...physical,id,W:N,H:N,bc:'periodic'};let timeScale=1,fieldScale=1;
   if(['cahn','ohta','amb'].includes(id)){params.M/=h*h;params.eps/=h;params.lambda/=h*h;params.zeta/=h**4;}
   else if(id==='swift'){timeScale=h**-4;params.r*=h**4;params.k0*=h;params.g*=h**4;params.cub*=h**4;}
   else if(id==='ks'){timeScale=h**-2;params.nu/=h*h;}
   else{timeScale=h**-6;fieldScale=h*h;params.r*=h**4;params.k0*=h;}
   const shape=Array.from({length:N*N},(_,j)=>Math.cos(2*Math.PI*(wave[0]*(j%N)+wave[1]*Math.floor(j/N))/N)),initial=shape.map(v=>Math.fround(amplitude*fieldScale*v));
   const result=await page.evaluate(arg=>window.runPde(arg),{p:params,initial,dt:dt*timeScale,steps:Math.round(T/dt)});assert(!result.flagged);
   const measured=2*result.out.reduce((a,v,j)=>a+v/fieldScale*shape[j],0)/(N*N),relativeAmplitudeError=Math.abs(measured/target-1);
   let residual=0;for(let j=0;j<N*N;j++)residual=Math.max(residual,Math.abs(result.out[j]/fieldScale-measured*shape[j]));assert(residual<2e-8,id+' nonlinear remainder');
   levels.push({grid:[N,N],spacing:h,shaderParameters:params,shaderDt:dt*timeScale,fieldScale,steps:Math.round(T/dt),measuredAmplitude:measured,relativeAmplitudeError,maxNonlinearRemainder:residual});
  }
  const orders=levels.slice(1).map((x,i)=>Math.log2(levels[i].relativeAmplitudeError/x.relativeAmplitudeError));assert(orders.every(x=>x>1.8&&x<2.2),id+' space orders '+JSON.stringify({orders,levels}));assert(levels[2].relativeAmplitudeError<2e-3,id+' finest spatial error');
  // Deliberately fail to rescale the stencil on the coarsest grid: this changes the physical problem.
  const N=16,initial=Array.from({length:N*N},(_,j)=>amplitude*Math.cos(2*Math.PI*(wave[0]*(j%N)+wave[1]*Math.floor(j/N))/N)),bad=await page.evaluate(arg=>window.runPde(arg),{p:{...physical,id,W:N,H:N,bc:'periodic'},initial,dt,steps:Math.round(T/dt)}),wrongAmplitude=2*bad.out.reduce((a,v,j)=>a+v*initial[j]/amplitude,0)/(N*N),wrongRelativeError=Math.abs(wrongAmplitude/target-1);assert(wrongRelativeError>10*levels[0].relativeAmplitudeError,id+' wrong domain control');
  rows.push({id,physicalParameters:physical,physicalDomain:[L,L],physicalTime:T,physicalDt:dt,initialAmplitude:amplitude,wave,continuumRate:rate,targetAmplitude:target,levels,orders,wrongUnscaledDomainError:wrongRelativeError});console.log('PASS '+id+' fixed-domain spatial refinement '+orders.map(x=>x.toFixed(3)).join(', '));
 }
 const report={date:new Date().toISOString().slice(0,10),scope:'Small-amplitude periodic Fourier mode at one fixed 64 by 64 physical domain and time 2, grids 16/32/64. Parameter and field rescalings account for the unit-cell production stencil. Nonlinear remainder bounded, no nonlinear sharp-interface spatial convergence claim.',sourceSha256:sha(source),environment:{node:process.version,chromium:browser.version(),backend:'SwiftShader RGBA32F'},rows,passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/pde-spatial-review.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS fixed physical domain PDE convergence');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
