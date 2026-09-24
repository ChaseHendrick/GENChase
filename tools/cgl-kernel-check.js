'use strict';
const { glArgs } = require('./lib/gl-args');
// Actual maintained shader against exact semidiscrete plane waves. Bounded regression evidence only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js'),'utf8');
 const a=source.indexOf('  const CGL_HEAD ='),b=source.indexOf('  const CGL_DRAW =',a);assert(a>0&&b>a);
 const browser=await chromium.launch({args:glArgs()});
 try{
 const page=await browser.newPage();await page.goto('file://'+path.join(root,'dist/studio.html')+'#three-vortex-bound/cgl-audit');
 const result=await page.evaluate(code=>{
  const G=Studio.gl,{CGL_STEP,cglSubsteps}=new Function('G',code+'\nreturn {CGL_STEP,cglSubsteps};')(G),gl=G.createGL(document.createElement('canvas'));
  if(!gl.floatExt)throw Error('Float32 attachment required');
  const pass=new G.Pass(gl,CGL_STEP),bad=new G.Pass(gl,CGL_STEP.replace('L + u_alpha','L - u_alpha'));
  const rotationPass=new G.Pass(gl,CGL_STEP.slice(0,CGL_STEP.indexOf('void main(){'))+'void main(){outColor=vec4(cglUnitRotation(u_dt),0.0,1.0);}');
  const rotationTarget=new G.Target(gl,1,1,{type:'rgba32f'});let rotationError=0,unitLengthError=0;
  for(let k=0;k<=100;k++){const phase=-.25+k*.005;rotationPass.draw(rotationTarget,{u_dt:phase});const out=new Float32Array(4);gl.bindFramebuffer(gl.FRAMEBUFFER,rotationTarget.fbo);gl.readPixels(0,0,1,1,gl.RGBA,gl.FLOAT,out);rotationError=Math.max(rotationError,Math.abs(out[0]-Math.cos(phase)),Math.abs(out[1]-Math.sin(phase)));unitLengthError=Math.max(unitLengthError,Math.abs(Math.hypot(out[0],out[1])-1));}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);rotationTarget.dispose();
  const n=16,amp=.2;
  function run(dt,T,alpha,beta,m,wrong=false,subdivide=false){
   const p=new G.PingPong(gl,n,n,{type:'rgba32f',filter:'nearest',wrap:'repeat'}),f=new Float32Array(n*n*4);
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){const theta=2*Math.PI*m*(x+y)/n,i=4*(y*n+x);f[i]=amp*Math.cos(theta);f[i+1]=amp*Math.sin(theta);f[i+3]=1;}
   p.read.upload(f);const count=subdivide?cglSubsteps({dt,alpha,beta,lin:1}):1,h=dt/count;
   for(let i=0;i<Math.round(T/dt)*count;i++){(wrong?bad:pass).draw(p.write,{u_a:p.read,u_res:[n,n],u_dt:h,u_alpha:alpha,u_beta:beta,u_lin:1,u_noise:0,u_step:i,u_nOff:0});p.swap();}
   const out=new Float32Array(n*n*4);gl.bindFramebuffer(gl.FRAMEBUFFER,p.read.fbo);gl.readPixels(0,0,n,n,gl.RGBA,gl.FLOAT,out);gl.bindFramebuffer(gl.FRAMEBUFFER,null);p.dispose();
   const q=8*Math.sin(Math.PI*m/n)**2,growth=1-q,d=1+amp*amp*Math.expm1(2*growth*T)/growth,radius=amp*Math.sqrt(Math.exp(2*growth*T)/d),phase=-alpha*q*T-.5*beta*Math.log(d);
   let error=0,maxAmplitude=0;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=4*(y*n+x),theta=2*Math.PI*m*(x+y)/n+phase;error=Math.max(error,Math.abs(out[i]-radius*Math.cos(theta)),Math.abs(out[i+1]-radius*Math.sin(theta)));maxAmplitude=Math.max(maxAmplitude,Math.hypot(out[i],out[i+1]));if(!Number.isFinite(out[i])||!Number.isFinite(out[i+1]))throw Error('Nonfinite field');}
   return {error,maxAmplitude,substeps:count};
  }
  const refinement=[.02,.01,.005].map(h=>run(h,.2,2,-.5,1));
  const local=run(.02,.2,0,2,0),wrong=run(.005,.2,2,-.5,1,true);
  const nyquist=run(.12,.24,4,4,8,false,true),unsafe=run(.12,.24,4,4,8,false,false);
  let controls=0;for(let alpha=-4;alpha<=4;alpha+=.5)for(let beta=-4;beta<=4;beta+=1){const s={alpha,beta,lin:1.6,dt:.12},h=s.dt/cglSubsteps(s);if(h>0.8/(4*(1+alpha*alpha))+1e-14)throw Error('Unsafe substep');controls++;}
  return {refinement,local,wrong,nyquist,unsafe,controls,rotationError,unitLengthError};
 },source.slice(a,b));
 assert(result.rotationError<1e-7);assert(result.unitLengthError<1e-7);assert(result.local.error<3e-5);assert(result.refinement[0].error/result.refinement[1].error>1.7);assert(result.refinement[1].error/result.refinement[2].error>1.7);assert(result.refinement[2].error<1e-4);assert(result.wrong.error>1e-2);assert(result.nyquist.maxAmplitude<.2);assert(result.unsafe.maxAmplitude>.4);
 console.log('CGL KERNEL OK: '+JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
