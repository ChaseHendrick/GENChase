'use strict';
const { glArgs } = require('./lib/gl-args');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function reference(W,H,s){
 let re=new Float64Array(W*H),im=new Float64Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,r=Math.hypot(x/W-.5,y/H-.5),a=Math.atan2(y/H-.5,x/W-.5);let amp,phase;
 if(s.init==='wave'){amp=.7;phase=x*.22;}else if(s.init==='vortex'){amp=1-Math.exp(-18*r);phase=a;}else{amp=Math.min(1,r*8);phase=a+40*r;}re[i]=Math.fround(amp*Math.cos(phase));im[i]=Math.fround(amp*Math.sin(phase));}
 const count=Math.max(1,Math.ceil(s.dt/Math.min(.2/(1+s.alpha*s.alpha),.1/Math.max(.01,Math.abs(s.beta)*s.lin)))),h=s.dt/count;
 for(let step=0;step<s.warmup*count;step++){
  const local=new Array(W*H),nr=new Float64Array(W*H),ni=new Float64Array(W*H);
  for(let i=0;i<re.length;i++){const d=1+(re[i]**2+im[i]**2)*Math.expm1(2*s.lin*h)/s.lin,amp=Math.exp(s.lin*h)/Math.sqrt(d),angle=-s.beta*Math.log(d)/2;local[i]=[amp*(Math.cos(angle)*re[i]-Math.sin(angle)*im[i]),amp*(Math.sin(angle)*re[i]+Math.cos(angle)*im[i])];}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,a=local[i];let lr=0,li=0;for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const b=local[((y+dy+H)%H)*W+(x+dx+W)%W];lr+=b[0]-a[0];li+=b[1]-a[1];}nr[i]=a[0]+h*(lr-s.alpha*li);ni[i]=a[1]+h*(li+s.alpha*lr);}re=nr;im=ni;
 }return {re,im,count,h};
}
async function main(){
 const source=fs.readFileSync(path.join(root,'src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js'),'utf8');
 const kernelText=execFileSync(process.execPath,[path.join(root,'tools/cgl-kernel-check.js')],{encoding:'utf8'}),kernel=JSON.parse(kernelText.trim().split('CGL KERNEL OK: ')[1]);
 const getter=`auditRead(){const data=new Float32Array(gw*gh*4);gl.bindFramebuffer(gl.FRAMEBUFFER,A.read.fbo);gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,data);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {W:gw,H:gh,stepCount,texType,data:Array.from(data)};},`;
 const injected=source.replace('        fieldCells(){ return [gw,gh]; },',getter+'\n        fieldCells(){ return [gw,gh]; },');assert.notEqual(injected,source);
 const original=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');assert(original.includes(source));const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cgl-field-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,original.replace(source,injected).replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch({args:glArgs()}),cases=[];
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#three-vortex-bound/cgl-fields');await page.evaluate(()=>Studio.ready);
 await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');await page.selectOption('#print-smoothing','off',{force:true});await page.locator('#btn-colophon-edit').click();await page.locator('#colo-enabled').uncheck();await page.locator('#colo-close').click();
 const fixtures=[{alpha:2,beta:-.5,lin:1,init:'wave',view:'amp',aspect:'1:1'},{alpha:-2,beta:2,lin:1,init:'vortex',view:'real',aspect:'4:5'},{alpha:0,beta:1.4,lin:.2,init:'spiral',view:'amp',aspect:'5:4'},{alpha:4,beta:-4,lin:1.6,init:'vortex',view:'defects',aspect:'16:9'}];
 for(let index=0;index<fixtures.length;index++){
 const params={...fixtures[index],grid:128,noise:0,grain:0,running:false,warmup:50,dt:.02,steps:1,exposure:1,gamma:1,contrast:1},seed='cgl-field-review-'+index;
 await page.evaluate(({params,seed})=>location.hash='cgl/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{params,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed&&Studio.auditInstances().cgl?.inst.auditRead().stepCount===50,seed);
 const a=await page.evaluate(()=>Studio.auditInstances().cgl.inst.auditRead());assert.equal(a.texType,'rgba32f');const expected=reference(a.W,a.H,params);let error=0;
 for(let i=0;i<a.W*a.H;i++){error=Math.max(error,Math.abs(a.data[4*i]-expected.re[i]),Math.abs(a.data[4*i+1]-expected.im[i]));assert(Number.isFinite(a.data[4*i])&&Number.isFinite(a.data[4*i+1]));}assert(error<1e-4,'Independent field error '+error);
 const before=await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),field:Studio.auditInstances().cgl.inst.auditRead()}));await page.locator('#btn-export').click();await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);
 const print=await page.evaluate(async ({W,H,data})=>{
 const s=Studio.auditInstances().cgl.state,img=document.querySelector('#export-img');await img.decode();const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0);const rgba=g.getImageData(0,0,w,h).data;
 const clamp=x=>Math.max(0,Math.min(1,x)),linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4,srgb=x=>x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055;
 const hex=h=>{h=h.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);},bg=hex(s.bg),stops=[s.bg,...s.palette].map(x=>hex(x).map(linear)),lut=new Uint8ClampedArray(768);
 for(let i=0;i<256;i++){const v=i/255*(stops.length-1),k=Math.min(stops.length-2,Math.floor(v)),u=v-k;for(let ch=0;ch<3;ch++)lut[3*i+ch]=255*srgb((1-u)*stops[k][ch]+u*stops[k+1][ch]);}
 // Tensor-product cardinal cubic interpolation, expressed as basis polynomials.
 const weights=t=>[-t*(1-t)**2/2,1-2.5*t*t+1.5*t*t*t,t/2+2*t*t-1.5*t*t*t,-t*t*(1-t)/2];
 const xs=Array.from({length:w},(_,x)=>{const q=(x+.5)*W/w-.5,b=Math.floor(q);return {b,w:weights(q-b)};});
 let maxChannelError=0,displacedPixels=0,channelsChecked=0;
 for(let y=0;y<h;y++){const q=(h-y-.5)*H/h-.5,by=Math.floor(q),wy=weights(q-by);for(let x=0;x<w;x++){
  const ax=xs[x];let re=0,im=0;for(let j=0;j<4;j++)for(let i=0;i<4;i++){const k=4*(((by+j-1+H)%H)*W+(ax.b+i-1+W)%W),weight=wy[j]*ax.w[i];re+=data[k]*weight;im+=data[k+1]*weight;}
  const amp=Math.hypot(re,im);let t=s.view==='amp'?clamp(amp*.85):s.view==='real'?clamp(.5+.5*re):1-(()=>{const v=clamp(amp/.18);return v*v*(3-2*v);})();
  const tex=clamp(t)*256-.5,left=Math.floor(tex),f=tex-left,ia=Math.max(0,Math.min(255,left)),ib=Math.max(0,Math.min(255,left+1)),o=4*(y*w+x);let displaced=false;
  for(let ch=0;ch<3;ch++){let col=((1-f)*lut[3*ia+ch]+f*lut[3*ib+ch])/255;if(s.view==='defects')col=bg[ch]*(1-t)+col*t;col=clamp((Math.pow(clamp(col),s.gamma)*s.exposure-.5)*s.contrast+.5);const predicted=Math.round(255*col);maxChannelError=Math.max(maxChannelError,Math.abs(rgba[o+ch]-predicted));if(Math.abs(rgba[o+ch]-rgba[4*(y*w+(x+Math.ceil(w/W))%w)+ch])>2)displaced=true;channelsChecked++;}
  if(rgba[o+3]!==255)throw Error('Nonopaque export');if(displaced)displacedPixels++;
 }}
 if(maxChannelError>2||displacedPixels<100)throw Error(JSON.stringify({maxChannelError,displacedPixels}));return {width:w,height:h,maxChannelError,channelsChecked,displacedPixels,params:JSON.parse(JSON.stringify(s))};
 },a);
 assert.equal(Math.max(print.width,print.height),2400);assert.equal(before,await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),field:Studio.auditInstances().cgl.inst.auditRead()})));cases.push({seed,grid:[a.W,a.H],fieldSha256:sha(JSON.stringify(a.data)),maxComplexError:error,substeps:expected.count,substepDt:expected.h,physicalTime:params.dt*params.warmup,print,statePreserved:true});console.log('PASS '+seed);await page.locator('#export-close').click();
 }
 assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),scope:'Four complete deterministic noise-free CGL lattice fields and prints at physical time 1; no continuum or chaotic-statistics claim.',sourceSha256:sha(source),engineSha256:sha(fs.readFileSync(path.join(root,'src/shared/engine.js'))),kernel,cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform,backend:'SwiftShader RGBA32F'},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/cgl-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS full CGL fields and prints');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
