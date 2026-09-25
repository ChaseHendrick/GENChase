'use strict';
const { glArgs } = require('./lib/gl-args');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {model,error}=require('./lib/pde-reference'),printReference=require('./lib/pde-print-reference'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
async function main(){
 const source=fs.readFileSync(path.join(root,'src/modules/pde.js'),'utf8'),original=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');assert(original.includes(source));
 const injection=`auditRead(){if(texType!=='rgba32f')throw Error('Float32 required');const read=t=>{const a=new Float32Array(gw*gh*4);gl.bindFramebuffer(gl.FRAMEBUFFER,t.fbo);gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,a);gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(gl.getError()!==gl.NO_ERROR)throw Error('Readback failed');return Array.from({length:gw*gh},(_,i)=>a[4*i]);};return {W:gw,H:gh,stepCount,guardMessage,field:read(C.read),chem:read(midT||muT)};},auditAdvance(n){step(n);render();},`;
 const modified=source.replace('        fieldCells()',injection+'\n        fieldCells()');assert.notEqual(source,modified);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pde-review-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,original.replace(source,modified).replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const browser=await chromium.launch({args:glArgs()}),cases=[];
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#three-vortex-bound/pde-review');await page.evaluate(()=>Studio.ready);
  await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');await page.selectOption('#print-smoothing','off',{force:true});await page.locator('#btn-colophon-edit').click();await page.locator('#colo-enabled').uncheck();await page.locator('#colo-close').click();
  const states={cahn:[{init:'bands',amp:.12,c0:0,eps:1.1,M:1,deg:false},{init:'drops',amp:.12,c0:-.25,eps:1.3,M:.7,deg:true}],ohta:[{init:'bands',amp:.14,c0:.15,eps:1.05,M:1,sigma:.06,deg:false},{init:'drops',amp:.14,c0:-.3,eps:1.2,M:.7,sigma:.12,deg:true}],amb:[{init:'quench',amp:.2,c0:-.4,eps:1.1,M:1,lambda:1,zeta:-4},{init:'drops',amp:.12,c0:-.45,eps:1.3,M:.7,lambda:2,zeta:-2}],swift:[{init:'roll',r:.3,k0:.62,g:0,cub:1},{init:'target',r:.25,k0:.58,g:.7,cub:1}],ks:[{init:'front',nu:1,alpha:1},{init:'bump',nu:1.4,alpha:.9}],pfc:[{init:'stripe',r:-.35,psi0:.02,k0:.68,M:.35,amp:.55},{init:'seed',r:-.25,psi0:.28,k0:.72,M:.35,amp:.55}]};
  for(const [id,fixtures]of Object.entries(states))for(let k=0;k<fixtures.length;k++){
   const seed='pde-field-'+id+'-'+k,params={...fixtures[k],bc:k?'noflux':'periodic',aspect:k?'4:5':'1:1',grid:128,warmup:0,running:false,noise:0,grain:0,dt:.01,view:'field',exposure:1,gamma:1,contrast:1};
   await page.evaluate(({id,seed,params})=>location.hash=id+'/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{id,seed,params});await page.waitForFunction(({id,seed})=>Studio.getRecipe()?.seed===seed&&Studio.auditInstances()[id]?.inst.auditRead().stepCount===0,{id,seed});
   console.log('START '+seed);
   const initial=await page.evaluate(id=>({snapshot:Studio.auditInstances()[id].inst.auditRead(),state:JSON.parse(JSON.stringify(Studio.auditInstances()[id].state))}),id),{W,H,field:f}=initial.snapshot,p={...initial.state,id,W,H,mean:f.reduce((a,b)=>a+b,0)/f.length},ref=model(p),T=2;
   const euler=ref.evolve(f,.01,200,'euler'),coarse=ref.evolve(f,.005,400),fine=ref.evolve(f,.0025,800),sensitivity=error(coarse,fine);assert(sensitivity.max<1e-6,id+' RK4 sensitivity '+JSON.stringify(sensitivity));
   const levels=[];let actual;
   for(const dt of[.01,.005,.0025]){
    await page.evaluate(({id,dt})=>{const e=Studio.auditInstances()[id];e.state.dt=dt;e.mod.sanitize(e.state);if(e.state.dt!==dt)throw Error('Requested refinement was clamped');e.inst.regenerate();},{id,dt});
    for(let left=Math.round(T/dt);left>0;left-=40)await page.evaluate(({id,n})=>Studio.auditInstances()[id].inst.auditAdvance(n),{id,n:Math.min(40,left)});
    const a=await page.evaluate(id=>Studio.auditInstances()[id].inst.auditRead(),id);assert.equal(a.guardMessage,'',id+' guard');assert.equal(a.stepCount,Math.round(T/dt));
    const diff=error(a.field,fine);assert(diff.max<.025,id+' trajectory error '+JSON.stringify(diff));levels.push({dt,steps:a.stepCount,error:diff});if(dt===.01){actual=a;assert(error(a.field,euler).max<1e-5,id+' discrete field mismatch');}
   }
   const orders=levels.slice(1).map((x,i)=>Math.log2(levels[i].error.rms/x.error.rms));assert(orders.every(x=>x>.8&&x<1.25),id+' full-field time orders '+orders);
   const wrong=ref.evolve(f,.01,100,'euler'),control=error(actual.field,wrong);assert(control.max>1e-4,id+' wrong time not detected');
   // Restore the reviewed 200-step field through the actual instance, then export every view.
   await page.evaluate(({id})=>{const e=Studio.auditInstances()[id];e.state.dt=.01;e.inst.regenerate();},{id});for(let i=0;i<5;i++)await page.evaluate(id=>Studio.auditInstances()[id].inst.auditAdvance(40),id);
   const chemical=ref.chemistry(euler).mu,chemError=error(actual.chem,chemical);assert(chemError.max<2e-5,id+' chemical field mismatch');
   const views=k?(id==='swift'||id==='ks'?['shade','orient']:id==='pfc'?['shade','mu','orient']:['shade','mu']):['field','abs','grad'],prints=[];
   for(const view of views){
    await page.evaluate(({id,view})=>{const e=Studio.auditInstances()[id];e.state.view=view;e.inst.repaint();},{id,view});
    const before=await page.evaluate(id=>JSON.stringify({state:Studio.auditInstances()[id].state,snapshot:Studio.auditInstances()[id].inst.auditRead()}),id);
    await page.locator('#btn-export').click();await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);
    const blobURL=await page.locator('#export-img').getAttribute('src'),print=await page.evaluate(printReference,{id,field:Array.from(euler),chem:Array.from(chemical),W,H,viewIndex:{field:0,abs:1,grad:2,shade:3,mu:4,orient:5}[view],blobURL});assert.equal(Math.max(print.width,print.height),2400);
    assert.equal(before,await page.evaluate(id=>JSON.stringify({state:Studio.auditInstances()[id].state,snapshot:Studio.auditInstances()[id].inst.auditRead()}),id));prints.push({view,...print,statePreserved:true});await page.locator('#export-close').click();console.log('PASS '+seed+' '+view);
   }
   cases.push({id,seed,parameters:initial.state,grid:[W,H],physicalTime:T,initialSha256:sha(JSON.stringify(f)),finalSha256:sha(JSON.stringify(actual.field)),discreteError:error(actual.field,euler),referenceSensitivity:sensitivity,temporalLevels:levels,orders,wrongTimeError:control,chemicalError:chemError,meanDrift:actual.field.reduce((a,b)=>a+b,0)/f.length-p.mean,prints});
  }
  assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),scope:'Twelve complete noise-free finite lattice trajectories at time 2 and every available view, with independent float64 reference and actual print comparisons. Not a long-time phase-diagram, stochastic or universal hardware certification.',sourceSha256:sha(source),engineSha256:sha(fs.readFileSync(path.join(root,'src/shared/engine.js'))),environment:{node:process.version,chromium:browser.version(),platform:process.platform,backend:'SwiftShader RGBA32F'},cases,passed:true};
  if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/pde-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS complete PDE fields and prints');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
