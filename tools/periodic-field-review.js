'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),PRINT_REFERENCE=require('./lib/field-print-reference'),TAU=2*Math.PI;
// Sum-to-product form, independent of the module's three products.
const nodal=(x,y,z)=>(Math.sin(x+y)+Math.sin(x-y)+Math.sin(y+z)+Math.sin(y-z)+Math.sin(z+x)+Math.sin(z-x))/2;
function curvature(p,h){
 const F=q=>nodal(...q),f=F(p),shift=(i,d)=>p.map((x,j)=>x+(j===i?d:0)),g=[],H=[[],[],[]];
 for(let i=0;i<3;i++){g[i]=(F(shift(i,h))-F(shift(i,-h)))/(2*h);H[i][i]=(F(shift(i,h))-2*f+F(shift(i,-h)))/(h*h);for(let j=0;j<i;j++){let m=0;for(const a of [-1,1])for(const b of [-1,1])m+=a*b*F(p.map((x,k)=>x+(k===i?a*h:0)+(k===j?b*h:0)));H[i][j]=H[j][i]=m/(4*h*h);}}
 const norm=Math.hypot(...g);let contraction=0;for(let i=0;i<3;i++)for(let j=0;j<3;j++)contraction+=g[i]*H[i][j]*g[j];
 return (H[0][0]+H[1][1]+H[2][2]-contraction/(norm*norm))/(2*norm);
}
function rotation(omega,K,n){let lift=.17;const step=x=>x+omega-K/TAU*Math.sin(TAU*x);for(let j=0;j<20;j++)lift=step(lift);const start=lift;for(let j=0;j<n;j++)lift=step(lift);return (lift-start)/n;}
function kernels(){
 const hooks={};for(const [id,name] of [['gyroid','nodalMeanCurvature'],['devil','circleRotation']]){
  const src=fs.readFileSync(path.join(root,'src/modules/'+id+'.js'),'utf8');new Function('Studio','hooks',src.replace('  Studio.register({','  hooks.'+name+'='+name+';\n  Studio.register({'))({util:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))},PALETTES:{},register(){}},hooks);
 }
 const curvatures=[];for(const p of [[.3,.7,1.2],[1,2,3],[.2,1.7,2.6],[1.1,.4,2.3]]){
  const exact=hooks.nodalMeanCurvature(...p),errors=[.02,.01,.005].map(h=>Math.abs(curvature(p,h)-exact)),orders=errors.slice(1).map((e,i)=>Math.log2(errors[i]/e));assert(errors[2]<2e-5&&orders.every(p=>p>1.8&&p<2.2));
  const wrong=curvature(p,.005)*2;assert(Math.abs(wrong-exact)>1e-3);curvatures.push({point:p,meanCurvature:exact,errors,orders,missingHalfError:Math.abs(wrong-exact)});
 }
 let periodError=0;for(let i=0;i<31;i++){const p=[i*.17,i*.29,i*.31];for(let j=0;j<3;j++)periodError=Math.max(periodError,Math.abs(nodal(...p)-nodal(...p.map((v,k)=>v+(k===j?TAU:0)))));}assert(periodError<1e-13);
 // A root on F=0 with nonzero H disproves the old exact-minimality claim.
 let lo=-2,hi=0;assert(nodal(.3,.5,lo)*nodal(.3,.5,hi)<0);for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(nodal(.3,.5,lo)*nodal(.3,.5,mid)<=0)hi=mid;else lo=mid;}const rootPoint=[.3,.5,(lo+hi)/2],nonminimal=hooks.nodalMeanCurvature(...rootPoint);assert(Math.abs(nonminimal)>.001);
 const rotations=[];for(const K of [0,.55,.95])for(const omega of [0,.31,.5,(Math.sqrt(5)-1)/2,1]){
  const reference=rotation(omega,K,65536),rows=[];
  for(const n of [40,120,240]){const actual=hooks.circleRotation(omega,K,n),independent=rotation(omega,K,n),error=Math.abs(actual-independent),finiteError=Math.abs(actual-reference);assert(error<1e-10);assert(finiteError<1/n+1/65536+1e-10);if(K===0)assert(Math.abs(actual-omega)<1e-13);rows.push({iterations:n,actual,independentError:error,finiteTimeError:finiteError,bound:1/n+1/65536});}
  rotations.push({K,omega,longReference:reference,rows});
 }
 const decimal=JSON.parse(execFileSync('python3',[path.join(root,'tools/circle-precision.py')],{encoding:'utf8'}));
 for(const row of decimal.rows){row.actual=hooks.circleRotation(row.x/127,2.1*row.y/127,30);row.error=Math.abs(row.actual-Number(row.rotation[2]));assert(row.error<1e-4);}
 const wrongDrive=Math.abs(hooks.circleRotation(.3,0,240)-.4);assert(wrongDrive>.09);
 return {curvatures,periodError,zeroLevelCounterexample:{point:rootPoint,F:nodal(...rootPoint),H:nonminimal},rotations,decimal,wrongDriveError:wrongDrive};
}
function reference(id,W,H,s){
 const field=new Float32Array(W*H);let metric=0,extra=0,near=0,total=0;
 if(id==='gyroid'){
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=[s.scale*TAU*x/W,s.scale*TAU*y/H,s.z0],F=nodal(...p);field[y*W+x]=s.kind==='field'?F:s.kind==='abs'?Math.abs(F):Math.exp(-18*(F-s.iso)**2);if(Math.abs(F-s.iso)<.08){metric+=Math.abs(curvature(p,.0005));extra++;}}metric/=Math.max(1,extra);
 }else{
  extra=s.K;
  if(s.kind==='orbit'){assert.equal(s.K,0);for(let i=0;i<W*H;i++){const phase=(.2+(i+1)*(Math.sqrt(5)-1)/2)%1;field[Math.floor(i/(2*W))%H*W+Math.floor(phase*W)]++;}metric=null;}
  else if(s.kind==='stair'){
   for(let x=0;x<W;x++){const rho=rotation(x/(W-1),s.K,s.iters);total++;if(Math.abs(rho-.5)<.02)near++;for(let y=0;y<H;y++){const height=1-y/(H-1);field[y*W+x]=Math.abs(height-rho)<.012?1:height<rho?rho:.05;}}metric=near/total;
  }else{
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){const K=2.1*y/(H-1),rho=rotation(x/(W-1),K,Math.max(30,s.iters>>1));field[y*W+x]=rho;if(Math.abs(K-s.K)<.05){total++;if(Math.abs(rho-.5)<.02)near++;}}metric=total?near/total:null;
  }
 }
 return {field,metric,extra};
}
async function main(){
 const kernelResults=kernels(),sources={},cases=[];let html=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');
 for(const id of ['gyroid','devil']){const src=fs.readFileSync(path.join(root,'src/modules/'+id+'.js'),'utf8');assert(html.includes(src));sources[id]=sha(src);const injected=src.replace('      return {\n        aspect',`      return {\n        auditRead(){return {W,H,field:Array.from(field),metric,extra};},\n        aspect`);assert.notEqual(src,injected);html=html.replace(src,injected);}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'periodic-field-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,html.replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#three-vortex-bound/periodic-fields');await page.evaluate(()=>Studio.ready);await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');await page.selectOption('#print-smoothing','off',{force:true});await page.locator('#btn-colophon-edit').click();await page.locator('#colo-enabled').uncheck();await page.locator('#colo-close').click();
 const fixtures={gyroid:[{z0:.6,scale:2.6,iso:0,kind:'level'},{z0:.8,scale:2.2,iso:0,kind:'field'},{z0:2.2,scale:2.8,iso:.3,kind:'abs'},{z0:1.2,scale:3,iso:.3,kind:'level'}],devil:[{K:0,iters:80,kind:'stair'},{K:.55,iters:120,kind:'stair'},{K:.95,iters:240,kind:'stair'},{K:1,iters:40,kind:'tongues'},{K:0,iters:80,kind:'orbit'}]};
 for(const [id,rows] of Object.entries(fixtures))for(let i=0;i<rows.length;i++){
  const params={...rows[i],grid:[128,192,224][i%3],aspect:['1:1','4:5','16:9'][i%3],view:i%2?'log':'int',exposure:[.75,1,1.3][i%3]},seed='periodic-field-'+id+'-'+i;
  await page.evaluate(({id,params,seed})=>location.hash=id+'/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{id,params,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed,seed);
  const actual=await page.evaluate(id=>Studio.auditInstances()[id].inst.auditRead(),id),ref=reference(id,actual.W,actual.H,params);let error=0,wrong=0,worst=0;
  for(let j=0;j<ref.field.length;j++){if(Math.abs(ref.field[j]-actual.field[j])>error){error=Math.abs(ref.field[j]-actual.field[j]);worst=j;}wrong=Math.max(wrong,Math.abs(ref.field[(j+1)%ref.field.length]-actual.field[j]));}assert(error<(id==='devil'&&params.kind==='tongues'?1e-4:2e-6),JSON.stringify({id,error,worst,actual:actual.field[worst],reference:ref.field[worst],W:actual.W,H:actual.H}));assert(wrong>.01);
  const diagnosticError=Math.abs((ref.metric??0)-(actual.metric??0));assert(diagnosticError<2e-6,JSON.stringify({id,diagnosticError}));assert.equal(ref.extra,actual.extra);
  const before=await page.evaluate(id=>JSON.stringify({recipe:Studio.getRecipe(),field:Studio.auditInstances()[id].inst.auditRead()}),id);await page.locator('#btn-export').click();await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);
  const print=await page.evaluate(PRINT_REFERENCE,{id,expected:Array.from(ref.field),W:actual.W,H:actual.H});assert.equal(Math.max(print.width,print.height),2400);assert.equal(before,await page.evaluate(id=>JSON.stringify({recipe:Studio.getRecipe(),field:Studio.auditInstances()[id].inst.auditRead()}),id));
  cases.push({id,seed,params,grid:[actual.W,actual.H],fieldError:error,displacedFieldError:wrong,diagnosticError,diagnostic:{metric:actual.metric,extra:actual.extra,totalEnergy:actual.totalEnergy},fieldSha256:sha(JSON.stringify(actual.field)),print,statePreserved:true});console.log('PASS '+seed);await page.locator('#export-close').click();
 }
 assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),scope:'Nine enumerated gyroid nodal-approximation and finite circle-map fields, diagnostics and actual PNG prints; no exact-minimality or infinite-time locking claim.',sourceSha256:sources,engineSha256:sha(fs.readFileSync(path.join(root,'src/shared/engine.js'))),kernels:kernelResults,cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/periodic-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS all periodic fields and prints');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
