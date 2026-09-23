'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{history}=require('./lib/fput-reference');
const root=path.resolve(__dirname,'..');
async function main(){
 const source=fs.readFileSync(path.join(root,'src/modules/fput.js'),'utf8'),portable=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');assert(portable.includes(source));
 const injected=source.replace('      return {\n        aspect','      return {\n        auditRead(){return {W,H,field:Array.from(field),metric,extra,drift,elapsed,linearPeriod};},\n        aspect');assert.notEqual(injected,source);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fput-review-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,portable.replace(source,injected).replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const page=await browser.newPage(),errors=[],cases=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#fput/review');await page.evaluate(()=>Studio.ready);
 const fixtures=[{alpha:.22,periods:140},{alpha:0,periods:80},{alpha:.38,periods:160},{alpha:.18,periods:200},{alpha:.2,periods:120,dt:.03},{alpha:.42,periods:220},{alpha:0,periods:40}];
 for(let i=0;i<fixtures.length;i++){
  const params={dt:.05,...fixtures[i],grid:[48,96,128][i%3],aspect:['1:1','4:5','16:9'][i%3],view:i%2?'log':'int',exposure:1},seed='fput-field-'+i;
  await page.evaluate(({params,seed})=>location.hash='fput/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{params,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed,seed);
  const actual=await page.evaluate(()=>Studio.auditInstances().fput.inst.auditRead()),ref=history(actual.W,actual.H,params.alpha,params.periods,.0125),coarse=history(actual.W,actual.H,params.alpha,params.periods,.025);let fieldError=0,refinement=0,wrong=0;
  for(let j=0;j<ref.field.length;j++){fieldError=Math.max(fieldError,Math.abs(ref.field[j]-actual.field[j]));refinement=Math.max(refinement,Math.abs(ref.field[j]-coarse.field[j]));wrong=Math.max(wrong,Math.abs(ref.field[(j+1)%ref.field.length]-actual.field[j]));}assert(fieldError<2e-5&&refinement<1e-8&&wrong>.01,JSON.stringify({i,fieldError,refinement,wrong}));
  const diagnostics={finalEnergyError:Math.abs(actual.metric-ref.metric),minimumEnergyError:Math.abs(actual.extra-ref.extra),sampledTotalEnergyDrift:actual.drift,referenceEnergyDrift:ref.drift};assert(diagnostics.finalEnergyError<2e-5&&diagnostics.minimumEnergyError<2e-5&&actual.drift<2e-5);assert(Math.abs(actual.linearPeriod-ref.period)<1e-10&&actual.elapsed===params.periods);
  const before=await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances().fput.inst.auditRead()})),dims=[[2400,2400],[1920,2400],[2400,1350]][i%3],float=new Float32Array(ref.field);
  const print=await page.evaluate(PRINT,{W:actual.W,H:actual.H,w:dims[0],h:dims[1],encoded:Buffer.from(float.buffer).toString('base64')});assert.equal(before,await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances().fput.inst.auditRead()})));
  cases.push({seed,params,grid:[actual.W,actual.H],fieldError,referenceRefinement:refinement,displacedFieldError:wrong,diagnostics,print,statePreserved:true});console.log('PASS '+seed);
 }
 assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),scope:'Finite fixed-end alpha-chain histories and harmonic mode-energy diagnostics with independent RK4, reference refinement, every native PNG channel and state preservation.',cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/fput-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS FPUT complete finite review');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
const PRINT=async({W,H,w,h,encoded})=>{
 const e=Studio.auditInstances().fput,s=e.state,field=new Float32Array(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)).buffer),blob=await e.inst.exportPNG(w,h),url=URL.createObjectURL(blob),image=new Image();image.src=url;await image.decode();if(image.width!==w||image.height!==h)throw Error('Wrong print dimensions');
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(image,0,0);const actual=ctx.getImageData(0,0,w,h).data;URL.revokeObjectURL(url);
 const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4,srgb=x=>255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055),clamp=x=>Math.max(0,Math.min(1,x));
 const stops=[s.bg,...s.palette].map(hex=>{let p=hex.slice(1);if(p.length===3)p=[...p].map(x=>x+x).join('');return[0,2,4].map(i=>linear(parseInt(p.slice(i,i+2),16)/255));});
 let lo=Infinity,hi=-Infinity;for(const v of field){lo=Math.min(lo,v);hi=Math.max(hi,v);}const small=document.createElement('canvas');small.width=W;small.height=H;const sc=small.getContext('2d'),im=sc.createImageData(W,H);
 for(let j=0;j<field.length;j++){let t=(field[j]-lo)/(hi-lo||1);if(s.view==='log')t=Math.log(1.001+9*t)/Math.log(10);const p=clamp(t*s.exposure)*(stops.length-1),k=Math.min(stops.length-2,Math.floor(p)),f=p-k;for(let c=0;c<3;c++)im.data[4*j+c]=srgb(stops[k][c]*(1-f)+stops[k+1][c]*f);im.data[4*j+3]=255;}
 sc.putImageData(im,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,w,h);const expected=ctx.getImageData(0,0,w,h).data;let max=0,wrong=0,first=null;
 for(let j=0;j<actual.length;j++){const d=Math.abs(actual[j]-expected[j]);max=Math.max(max,d);if(d>1&&!first)first={channel:j,actual:actual[j],expected:expected[j]};if(Math.abs(actual[j]-expected[(j+4*Math.ceil(w/W))%expected.length])>1)wrong++;}if(max>1||wrong<100)throw Error(JSON.stringify({max,wrong,first}));
 return{width:w,height:h,channelsCompared:actual.length,maxChannelError:max,shiftedPrintMismatches:wrong,params:JSON.parse(JSON.stringify(s))};
};
main().catch(e=>{console.error(e);process.exitCode=1;});
