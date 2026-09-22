'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),PRINT_REFERENCE=require('./lib/field-print-reference');
function reference(id,W,H,s){
 const field=new Float32Array(W*H);let maximum=0,mass=0,energy=0,outside=0;
 const beta=s.beta,alpha=Math.sqrt(1-beta*beta),breather=(x,t)=>4*Math.atan2(beta*Math.sin(alpha*t),alpha*Math.cosh(beta*x));
 const slow=Math.min(s.c1,s.c2),fast=Math.max(s.c1,s.c2),equal=fast-slow<1e-10,halfSpan=18*s.nu/Math.sqrt(slow),halfTime=equal?8*s.nu/slow**1.5:14*s.nu/(Math.sqrt(slow)*(fast-slow));
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  let value;
  if(id==='rogue'){
   const X=s.span*(x/(W-1)-.5),T=s.t0+s.span*(y/(H-1)-.5);
   // Gauge-invariant intensity: no production complex rotation or function calls.
   if(s.kind==='peregrine'){const d=1+4*(X*X+T*T);value=((d-4)**2+64*T*T)/(d*d);}
   else if(s.kind==='akhmediev'){const l=Math.sqrt(2*s.a),k=2*Math.sqrt(1-2*s.a),c=Math.cosh(l*k*T),d=c-l*Math.cos(k*X);value=((2*(1-l*l)*c-d)**2+(l*k*Math.sinh(l*k*T))**2)/(d*d);}
   else {const l=Math.sqrt(1+2*s.a),b=2*Math.sqrt(2*s.a),z=l*b*T,d=l*Math.cosh(b*X)-Math.cos(z);value=((2*(l*l-1)*Math.cos(z)-d)**2+(l*b*Math.sin(z))**2)/(d*d);}
   maximum=Math.max(maximum,value);
  }else if(id==='soliton'){
   const t=halfTime*(2*y/(H-1)-1),X=halfSpan*(2*x/(W-1)-1)+(s.c1+s.c2)*t/2,k1=Math.sqrt(s.c1)/s.nu,k2=Math.sqrt(s.c2)/s.nu;
   if(equal)value=s.c1/2/Math.cosh(k1*(X-s.c1*t)/2)**2;
   else {const e1=Math.exp(k1*(X-s.c1*t)),e2=Math.exp(k2*(X-s.c2*t)),cross=((k1-k2)/(k1+k2))**2*e1*e2,tau=1+e1+e2+cross,dx=k1*e1+k2*e2+(k1+k2)*cross,dxx=k1*k1*e1+k2*k2*e2+(k1+k2)**2*cross;value=2*s.nu*s.nu*(dxx/tau-(dx/tau)**2);}
   if(y===(H>>1))mass+=value*2*halfSpan/(W-1)*(x===0||x===W-1?.5:1);
  }else{
   const X=s.span*(x/(W-1)-.5),T=s.t0+s.span*(y/(H-1)-.5);value=breather(X,T);
   if(y===(H>>1)){
    const h=2e-5,ut=(breather(X,T+h)-breather(X,T-h))/(2*h),ux=(breather(X+h,T)-breather(X-h,T))/(2*h),e=((ut*ut+ux*ux)/2+1-Math.cos(value))*s.span/(W-1)*(x===0||x===W-1?.5:1);
    energy+=e;if(Math.abs(X)>3/beta)outside+=e;
   }
  }
  assert(Number.isFinite(value));field[y*W+x]=value;
 }
 return {field,maximum,mass,energy,outsideFraction:outside/energy};
}
async function main(){
 const kernels={analytic:JSON.parse(execFileSync(process.execPath,[path.join(root,'tools/analytic-wave-science.js')],{encoding:'utf8'})),breather:JSON.parse(execFileSync(process.execPath,[path.join(root,'tools/breather-science.js')],{encoding:'utf8'}))},sources={},cases=[];let html=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');
 for(const id of ['rogue','soliton','breather']){const src=fs.readFileSync(path.join(root,'src/modules/'+id+'.js'),'utf8');assert(html.includes(src));sources[id]=sha(src);const injected=src.replace('      return {\n        aspect',`      return {\n        auditRead(){return {W,H,field:Array.from(field),metric,extra${id==='breather'?',totalEnergy':''}};},\n        aspect`);assert.notEqual(src,injected);html=html.replace(src,injected);}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'analytic-field-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,html.replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#three-vortex-bound/analytic-fields');await page.evaluate(()=>Studio.ready);await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');await page.selectOption('#print-smoothing','off',{force:true});await page.locator('#btn-colophon-edit').click();await page.locator('#colo-enabled').uncheck();await page.locator('#colo-close').click();
 const fixtures={rogue:['peregrine','akhmediev','km'].flatMap(kind=>[.12,.25,.42].map((a,i)=>({kind,a,span:[6,10,16][i],t0:[-1,0,2][i]}))),soliton:[[1.7,.65,.22],[1.1,1.05,.4],[2.4,.2,.08],[.4,1.8,.6],[1,1,.3]].map(([c1,c2,nu])=>({c1,c2,nu})),breather:[{beta:.2,t0:0,span:24},{beta:.45,t0:2,span:18},{beta:.75,t0:-3,span:12}]};
 for(const [id,rows] of Object.entries(fixtures))for(let i=0;i<rows.length;i++){
  const params={...rows[i],grid:[128,192,224][i%3],aspect:['1:1','4:5','16:9'][i%3],view:i%2?'log':'int',exposure:[.75,1,1.3][i%3]},seed='analytic-field-'+id+'-'+i;
  await page.evaluate(({id,params,seed})=>location.hash=id+'/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{id,params,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed,seed);
  const actual=await page.evaluate(id=>Studio.auditInstances()[id].inst.auditRead(),id),ref=reference(id,actual.W,actual.H,params);let error=0,wrong=0;
  for(let j=0;j<ref.field.length;j++){error=Math.max(error,Math.abs(ref.field[j]-actual.field[j]));wrong=Math.max(wrong,Math.abs(ref.field[(j+1)%ref.field.length]-actual.field[j]));}assert(error<2e-6,JSON.stringify({id,error}));assert(wrong>.01);
  const diagnosticError=id==='rogue'?Math.abs(ref.maximum-actual.extra):id==='soliton'?Math.abs(ref.mass-actual.extra):Math.max(Math.abs(ref.energy-actual.totalEnergy),Math.abs(ref.outsideFraction-actual.metric));assert(diagnosticError<1e-7,JSON.stringify({id,diagnosticError}));
  const before=await page.evaluate(id=>JSON.stringify({recipe:Studio.getRecipe(),field:Studio.auditInstances()[id].inst.auditRead()}),id);await page.locator('#btn-export').click();await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);
  const print=await page.evaluate(PRINT_REFERENCE,{id,expected:Array.from(ref.field),W:actual.W,H:actual.H});assert.equal(Math.max(print.width,print.height),2400);assert.equal(before,await page.evaluate(id=>JSON.stringify({recipe:Studio.getRecipe(),field:Studio.auditInstances()[id].inst.auditRead()}),id));
  cases.push({id,seed,params,grid:[actual.W,actual.H],fieldError:error,displacedFieldError:wrong,diagnosticError,diagnostic:{metric:actual.metric,extra:actual.extra,totalEnergy:actual.totalEnergy},fieldSha256:sha(JSON.stringify(actual.field)),print,statePreserved:true});console.log('PASS '+seed);await page.locator('#export-close').click();
 }
 assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),scope:'17 enumerated analytic wave fields, sampled diagnostics and actual engine PNG prints; finite analytic sampling, not time integration or physical validation.',sourceSha256:sources,engineSha256:sha(fs.readFileSync(path.join(root,'src/shared/engine.js'))),kernels,cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/analytic-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS all analytic fields and prints');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
