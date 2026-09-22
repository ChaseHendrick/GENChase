'use strict';
// Independent complex-link solver, full production fields and real engine print data.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function reference(initial,W,H,p){
 let re=Float64Array.from(initial[0]),im=Float64Array.from(initial[1]);const count=Math.ceil(.12/(.2*p.kappa*p.kappa)),substeps=Math.max(1,count),dt=.12/substeps,weight=dt/(p.kappa*p.kappa);
 for(let step=0;step<p.relax*substeps;step++){
  const nr=new Float64Array(re.length),ni=new Float64Array(re.length),local=new Array(re.length);
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x,d=1+(re[i]**2+im[i]**2)*Math.expm1(2*dt),f=Math.exp(dt)/Math.sqrt(d);local[i]=[f*re[i],f*im[i]];}
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
   const i=y*W+x,a=local[i];nr[i]=a[0];ni[i]=a[1];
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const b=local[i+dx+dy*W]||[0,0],phase=dx*.08*p.B*(y-H/2),c=Math.cos(phase),s=Math.sin(phase);nr[i]+=weight*(c*b[0]-s*b[1]-a[0]);ni[i]+=weight*(s*b[0]+c*b[1]-a[1]);}
  }re=nr;im=ni;
 }
 return {re:Array.from(re),im:Array.from(im),density:Array.from(re,(v,i)=>Math.fround(v*v+im[i]*im[i])),substeps,dt};
}
async function main(){
 const source=fs.readFileSync(path.join(root,'src/modules/vortex.js'),'utf8'),kernel=execFileSync(process.execPath,[path.join(root,'tools/vortex-kernel-check.js')],{encoding:'utf8'}),kernelResult=JSON.parse(kernel.trim().split('VORTEX KERNEL OK: ')[1]);
 let injected=source.replace('let W = 0,','let auditInitial, auditFinal;\n      let W = 0,').replace('const flux = B * 0.08','auditInitial=[Array.from(re),Array.from(im)];\n        const flux = B * 0.08').replace('        for (let i = 0; i < N; i++) {','        auditFinal=[Array.from(re),Array.from(im)];\n        for (let i = 0; i < N; i++) {').replace('      return {\n        aspect','      return {\n        auditRead(){return {W,H,initial:auditInitial,final:auditFinal,field:Array.from(field),usedDt};},\n        aspect');
 assert(injected.includes('auditRead()'));const original=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');assert(original.includes(source));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vortex-field-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,original.replace(source,injected).replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch(),cases=[];
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#vortex/field-review');await page.evaluate(()=>Studio.ready);
  await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');await page.selectOption('#print-smoothing','off',{force:true});await page.locator('#btn-colophon-edit').click();await page.locator('#colo-enabled').uncheck();await page.locator('#colo-close').click();
  const fixtures=[{grid:96,aspect:'1:1',B:.4,kappa:.5,relax:30,view:'int',exposure:1},{grid:96,aspect:'4:5',B:3.2,kappa:4,relax:30,view:'log',exposure:.8},{grid:128,aspect:'5:4',B:1.4,kappa:1.6,relax:90,view:'int',exposure:1},{grid:96,aspect:'16:9',B:2.6,kappa:2.2,relax:120,view:'log',exposure:1.2}];
  for(let index=0;index<fixtures.length;index++){
   const p=fixtures[index],seed='vortex-field-review-'+index;await page.evaluate(({p,seed})=>location.hash='vortex/'+seed+'/'+btoa(JSON.stringify({...p,v:2})),{p,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed,seed);
   const a=await page.evaluate(()=>Studio.auditInstances().vortex.inst.auditRead()),expected=reference(a.initial,a.W,a.H,p);let complexError=0,fieldError=0,maxAmplitude=0;
   for(let i=0;i<a.field.length;i++){complexError=Math.max(complexError,Math.abs(a.final[0][i]-expected.re[i]),Math.abs(a.final[1][i]-expected.im[i]));fieldError=Math.max(fieldError,Math.abs(a.field[i]-expected.density[i]));maxAmplitude=Math.max(maxAmplitude,Math.hypot(...a.final.map(x=>x[i])));if(i<a.W||i>=a.W*(a.H-1)||i%a.W===0||i%a.W===a.W-1)assert.equal(a.field[i],0);}
   assert(complexError<1e-11);assert(fieldError<1e-7);assert(maxAmplitude<1+1e-12);assert.equal(a.usedDt,expected.dt);
   const before=await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),state:Studio.auditInstances().vortex.inst.auditRead()}));
   await page.locator('#btn-export').click();await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);
   const print=await page.evaluate(async ({expected,W,H})=>{
    const e=Studio.auditInstances().vortex,s=e.state,img=document.querySelector('#export-img');await img.decode();const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0);const rgba=g.getImageData(0,0,w,h).data;
    const toLinear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,toSrgb=v=>255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
    const stops=[s.bg,...s.palette].map(hex=>{let h=hex.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return [0,2,4].map(i=>toLinear(parseInt(h.slice(i,i+2),16)/255));});
    const lo=Math.min(...expected),hi=Math.max(...expected),native=new Uint8ClampedArray(W*H*4);
    for(let i=0;i<expected.length;i++){let t=(expected[i]-lo)/(hi-lo||1);if(s.view==='log')t=Math.log(1.001+9*Math.max(0,t))/Math.log(10);t=Math.min(1,Math.max(0,t*s.exposure))*(stops.length-1);const k=Math.min(stops.length-2,Math.floor(t)),u=t-k;for(let ch=0;ch<3;ch++)native[4*i+ch]=toSrgb((1-u)*stops[k][ch]+u*stops[k+1][ch]);native[4*i+3]=255;}
    let maxChannelError=0,wrongPixels=0,checked=0,firstMismatch=null;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=4*(y*w+x),j=4*(Math.min(H-1,Math.ceil((y+.5)*H/h-1e-10)-1)*W+Math.min(W-1,Math.ceil((x+.5)*W/w-1e-10)-1)),bad=(j+4)%(W*H*4);let wrong=false;for(let ch=0;ch<4;ch++){maxChannelError=Math.max(maxChannelError,Math.abs(rgba[i+ch]-native[j+ch]));if(!firstMismatch&&Math.abs(rgba[i+ch]-native[j+ch])>1)firstMismatch={x,y,ch,actual:rgba[i+ch],expected:native[j+ch],source:j/4,W,H,w,h};if(Math.abs(rgba[i+ch]-native[bad+ch])>1)wrong=true;checked++;}if(wrong)wrongPixels++;}
    if(maxChannelError>1||wrongPixels<100)throw Error(JSON.stringify({maxChannelError,wrongPixels,firstMismatch}));
    return {width:w,height:h,channelsChecked:checked,maxChannelError,shiftedCellFailurePixels:wrongPixels,params:JSON.parse(JSON.stringify(s))};
   },{expected:expected.density,W:a.W,H:a.H});
   assert.equal(Math.max(print.width,print.height),2400);assert.equal(before,await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),state:Studio.auditInstances().vortex.inst.auditRead()})));
   cases.push({seed,grid:[a.W,a.H],initialSha256:sha(JSON.stringify(a.initial)),finalSha256:sha(JSON.stringify(a.final)),complexError,fieldError,maxAmplitude,dt:expected.dt,substeps:expected.substeps,physicalTime:.12*p.relax,print,statePreserved:true});console.log('PASS '+seed);await page.locator('#export-close').click();
  }
  assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),scope:'Fixed-field unit-grid GL: four enumerated full fields and prints; no physical vortex-count or continuum claim.',sourceSha256:sha(source),engineSha256:sha(fs.readFileSync(path.join(root,'src/shared/engine.js'))),kernel:kernelResult,cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/vortex-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS full vortex fields and prints');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
