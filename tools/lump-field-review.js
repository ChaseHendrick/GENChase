'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
// Reference coordinates and parameters are declared here, not read from the module.
const families={one:[[0,1,0,0]],two:[[0,1.05,-2.4,0],[0,.85,2.4,.4]],three:[[0,1,-2.6,-1.4],[.15,.9,.2,1.6],[-.1,1.1,2.4,-.4]],collide:[[.35,1,-2.8,0],[-.35,1,2.8,0]],oblique:[[.55,.95,0,0]],tight:[[0,1.65,0,0]]};
function value(kind,x,y,t){let out=0;for(const [a,b,x0,y0] of families[kind]){const q=x-x0+a*(y-y0)+3*(a*a-b*b)*t,r=y-y0+6*a*t,D=q*q+b*b*r*r+b**-2;out+=2*(2/D-(2*q/D)**2);}return out;}
function fieldReference(s,W,H){const out=new Float32Array(W*H),L=10/s.zoom;for(let y=0;y<H;y++)for(let x=0;x<W;x++)out[y*W+x]=value(s.kind,(2*x+1-W)*L/W,(H-2*y-1)*L/W,s.t);return out;}
function diagnostics(s){
 const points=[[0,0],[.8,.4],[-.6,-.35],...families[s.kind].map(([a,b,x,y])=>[x+3*(a*a+b*b)*s.t,y-6*a*s.t])];
 const rms=h=>Math.sqrt(points.reduce((sum,[x,y])=>{const u=(dx=0,dy=0,dt=0)=>value(s.kind,x+dx,y+dy,s.t+dt),c=u(),xp=u(h),xm=u(-h),ux=(xp-xm)/(2*h),xx=(xp-2*c+xm)/h**2;const terms=[(u(h,0,h)-u(-h,0,h)-u(h,0,-h)+u(-h,0,-h))/(4*h*h),6*(ux*ux+c*xx),(u(2*h)-4*xp+6*c-4*xm+u(-2*h))/h**4,-3*(u(0,h)-2*c+u(0,-h))/h**2];return sum+(terms.reduce((a,b)=>a+b,0)/Math.max(1,...terms.map(Math.abs)))**2;},0)/points.length);
 return {rms:rms(.01),sensitivity:Math.abs(rms(.02)-rms(.01))};
}
async function main(){
 const source=fs.readFileSync(path.join(root,'src/modules/lump.js'),'utf8'),algebra=JSON.parse(execFileSync(process.env.PYTHON||'python3',[path.join(__dirname,'lump-algebra.py')],{encoding:'utf8'})),kernel=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'lump-science.js')],{encoding:'utf8'}));
 const injected=source.replace('      return {\n        aspect','      return {\n        auditTick:tick,\n        auditRead(){return {W,H,field:Array.from(field),metric,extra,residualChange,kindLabel};},\n        aspect'),portable=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');assert(portable.includes(source));assert.notEqual(injected,source);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lump-review-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,portable.replace(source,injected).replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const page=await browser.newPage(),errors=[],cases=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#lump/review');await page.evaluate(()=>Studio.ready);
 const fixtures=[{kind:'one',t:0,zoom:1.05,view:'field'},{kind:'two',t:-.4,zoom:.85,view:'log'},{kind:'three',t:.1,zoom:.75,view:'shade'},{kind:'collide',t:-1.6,zoom:.8,view:'field'},{kind:'collide',t:1.6,zoom:.8,view:'log'},{kind:'oblique',t:.4,zoom:1,view:'field'},{kind:'tight',t:0,zoom:1.35,view:'shade'}];
 for(let i=0;i<fixtures.length;i++){
  const params={...fixtures[i],grid:[128,192,256][i%3],aspect:['1:1','4:5','16:9'][i%3],exposure:[.8,1,1.2][i%3],running:false},seed='lump-field-'+i;
  await page.evaluate(({params,seed})=>location.hash='lump/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{params,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed,seed);
  const actual=await page.evaluate(()=>Studio.auditInstances().lump.inst.auditRead()),ref=fieldReference(params,actual.W,actual.H),diagnostic=diagnostics(params);let fieldError=0,wrong=0,peak=-Infinity;
  for(let j=0;j<ref.length;j++){fieldError=Math.max(fieldError,Math.abs(ref[j]-actual.field[j]));wrong=Math.max(wrong,Math.abs(ref[(j+1)%ref.length]-actual.field[j]));peak=Math.max(peak,ref[j]);}assert(fieldError<1e-6&&wrong>.001,JSON.stringify({i,fieldError,wrong}));
  assert(Math.abs(actual.extra-peak)<1e-6);assert(Math.abs(actual.metric-diagnostic.rms)<2e-6);assert(Math.abs(actual.residualChange-diagnostic.sensitivity)<2e-6);
  if(families[params.kind].length>1){assert(actual.kindLabel.includes('not a KP-I solution'));assert(actual.metric>.001,'The displayed sum must not receive a zero residual');}else{assert(actual.kindLabel.includes('single exact'));assert(actual.metric<.01);}
  const dims=[[2400,2400],[1920,2400],[2400,1350]][i%3],expected=fieldReference(params,...dims),before=await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances().lump.inst.auditRead()}));
  const print=await page.evaluate(PRINT,{W:dims[0],H:dims[1],encoded:Buffer.from(expected.buffer).toString('base64')});assert.equal(before,await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances().lump.inst.auditRead()})));
  cases.push({seed,params,fieldError,displacedFieldError:wrong,diagnostic:{residual:actual.metric,stepSensitivity:actual.residualChange,visiblePeak:actual.extra,label:actual.kindLabel},print,statePreserved:true});console.log('PASS '+seed);
 }
 const animation=await page.evaluate(()=>{const e=Studio.auditInstances().lump,prior=JSON.parse(JSON.stringify(e.state)),raf=window.requestAnimationFrame;try{window.requestAnimationFrame=()=>0;e.state.running=true;e.state.t=3.999;e.inst.auditTick(1000);const wrapped=e.state.t;e.inst.auditTick(1050);return {wrapped,next:e.state.t};}finally{window.requestAnimationFrame=raf;Object.assign(e.state,prior);e.inst.regenerate();}});
 assert(Math.abs(animation.wrapped-(-3.9946))<1e-10);assert(Math.abs(animation.next-animation.wrapped-.02)<1e-10);assert.deepEqual(errors,[]);
 const result={date:new Date().toISOString().slice(0,10),sourceSha256:sha(source),scope:'Nine exact rational single-lump parameter families; seven finite fields, honest superposition diagnostics, all display modes and actual native PNG exports.',algebra,kernel,cases,animation,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/lump-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS lump complete finite review');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
const PRINT=async ({W,H,encoded})=>{
 const entry=Studio.auditInstances().lump,s=entry.state,bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),field=new Float32Array(bytes.buffer),blob=await entry.inst.exportPNG(W,H),url=URL.createObjectURL(blob),img=new Image();img.src=url;await img.decode();if(img.width!==W||img.height!==H)throw Error('Print dimensions changed');
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0);const actual=ctx.getImageData(0,0,W,H).data;URL.revokeObjectURL(url);
 const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,srgb=v=>255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055),clamp=x=>Math.max(0,Math.min(1,x)),stops=[s.bg,...s.palette].map(hex=>{let h=hex.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return [0,2,4].map(i=>linear(parseInt(h.slice(i,i+2),16)/255));});
 let lo=Infinity,hi=-Infinity;for(const v of field){lo=Math.min(lo,v);hi=Math.max(hi,v);}const span=hi-lo||1,native=new Uint8ClampedArray(W*H*4);
 for(let j=0;j<field.length;j++){
  const x=j%W,y=Math.floor(j/W);let t=(field[j]-lo)/span;
  if(s.view==='log')t=Math.log(1.001+12*t)/Math.log(13);
  else if(s.view==='shade'){const gx=field[j-(x>0?1:0)]-field[j+(x<W-1?1:0)],gy=field[j-(y>0?W:0)]-field[j+(y<H-1?W:0)];t=clamp(.35*t+.65*(.5+.5*(.6*gx+.8*gy)/(2.2*span+1e-6)));}
  const p=clamp(t*s.exposure)*(stops.length-1),k=Math.min(stops.length-2,Math.floor(p)),f=p-k;
  for(let ch=0;ch<3;ch++)native[4*j+ch]=srgb(stops[k][ch]+f*(stops[k+1][ch]-stops[k][ch]));native[4*j+3]=255;
 }
 let max=0,wrong=0,first=null;for(let j=0;j<actual.length;j++){const e=Math.abs(actual[j]-native[j]);max=Math.max(max,e);if(e>1&&!first)first={channel:j,actual:actual[j],expected:native[j]};if(Math.abs(actual[j]-native[(j+4)%native.length])>1)wrong++;}if(max>1||wrong<100)throw Error(JSON.stringify({max,wrong,first}));
 return {width:W,height:H,channelsCompared:actual.length,maxChannelError:max,displacedChannelMismatches:wrong,params:JSON.parse(JSON.stringify(s))};
};
main().catch(e=>{console.error(e);process.exitCode=1;});
