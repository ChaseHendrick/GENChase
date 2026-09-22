'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const spectra={one:[1.45],two:[1.85,.95],three:[2.15,1.35,.72],train:[1.9,1.42,1.05,.68],overtake:[2.55,.58],rest:[.28]};
function determinant(a){a=a.map(r=>r.slice());let det=1;for(let k=0;k<a.length;k++){let pivot=k;for(let i=k+1;i<a.length;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;if(pivot!==k){[a[k],a[pivot]]=[a[pivot],a[k]];det=-det;}const d=a[k][k];assert(Math.abs(d)>1e-16);det*=d;for(let i=k+1;i<a.length;i++){const f=a[i][k]/d;for(let j=k+1;j<a.length;j++)a[i][j]-=f*a[k][j];}}return det;}
function initial(c,sep){
 // Hankel moment determinants, independent of production's logarithmic subset expansion.
 const moment=k=>c.reduce((sum,v,i)=>sum+v**(-k)*Math.exp(sep*i),0),D=(k,a)=>k?determinant(Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>moment(a+i+j)))):1,n=c.length,out=new Array(2*n);
 for(let k=1;k<=n;k++){const d0=D(k,0),d2=D(k-1,2);out[n-k]=Math.log(d0/d2);out[2*n-k]=d0*d2/(D(k,1)*D(k-1,1));}return out;
}
function derivative(state){const n=state.length/2,out=new Array(2*n).fill(0);for(let i=0;i<n;i++)for(let j=0;j<n;j++){const d=state[i]-state[j],v=state[n+j]*Math.exp(-Math.abs(d));out[i]+=v;out[n+i]+=state[n+i]*v*Math.sign(d);}return out;}
function advance(state,interval,step=.004){const n=Math.max(1,Math.ceil(Math.abs(interval)/step)),h=interval/n;state=state.slice();for(let k=0;k<n;k++){const a=derivative(state),b=derivative(state.map((x,i)=>x+h*a[i]/2)),c=derivative(state.map((x,i)=>x+h*b[i]/2)),d=derivative(state.map((x,i)=>x+h*c[i]));state=state.map((x,i)=>x+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);}return state;}
function fieldReference(s,W,H,step=.004){
 const c=spectra[s.kind],zero=initial(c,s.sep),n=c.length,offset=(zero[0]+zero[n-1])/2,V=s.frame==='cm'?c.reduce((a,b)=>a+b,0)/n:0,L=14/s.zoom,T=9/s.zoom,field=new Float32Array(W*H);let state=zero,time=0;
 for(let y=H-1;y>=0;y--){const next=s.slice==='space'?s.t+(.5-(y+.5)/H)*2*T:s.t;state=advance(state,next-time,step);time=next;const centered=s.slice==='shot'?(state[0]+state[n-1])/2:offset+V*time;
  for(let x=0;x<W;x++){const X=((x+.5)/W-.5)*2*L;let u=0;for(let i=0;i<n;i++)u+=state[n+i]*Math.exp(-Math.abs(X-(state[i]-centered)));field[y*W+x]=u;}
 }return field;
}
function trajectoryReview(source){
 const hooks={};new Function('Studio','hooks',source.replace('  Studio.register({','  Object.assign(hooks,{peakonsAt});\n  Studio.register({'))({util:{},PALETTES:{},register(){}},hooks);
 const rows=[];
 for(const [kind,c] of Object.entries(spectra))for(const sep of [-1.2,0,1.2]){
  const zero=initial(c,sep),n=c.length,actualZero=hooks.peakonsAt(c,0,sep),initialError=Math.max(...zero.map((v,i)=>Math.abs(v-(i<n?actualZero.x[i]:actualZero.m[i-n]))));assert(initialError<2e-8,kind+' determinant error '+initialError);
  const refinements=[];for(const step of [.04,.02,.01]){let error=0;for(const sign of [-1,1]){let state=zero;for(let k=1;k<=24;k++){state=advance(state,sign*.5,step);const a=hooks.peakonsAt(c,sign*k*.5,sep);error=Math.max(error,...state.map((v,i)=>Math.abs(v-(i<n?a.x[i]:a.m[i-n]))));}}refinements.push(error);}
  assert(refinements[2]<2e-7,JSON.stringify({kind,sep,refinements}));if(c.length>1&&refinements[0]>1e-8)assert(refinements[2]<refinements[0]/8,'Refinement must improve despite determinant roundoff');
  const a=advance(zero,2,.01),wrong=hooks.peakonsAt(c,2.34,sep),bad=Math.max(...a.map((v,i)=>Math.abs(v-(i<n?wrong.x[i]:wrong.m[i-n]))));assert(bad>.05);
  rows.push({kind,sep,initialError,stepSizes:[.04,.02,.01],maximumTrajectoryErrors:refinements,wrongTimeError:bad});
 }return rows;
}
async function main(){
 const source=fs.readFileSync(path.join(root,'src/modules/peakon.js'),'utf8'),trajectories=trajectoryReview(source),kernel=JSON.parse(execFileSync(process.execPath,[path.join(root,'tools/peakon-science.js')],{encoding:'utf8'}));
 const injected=source.replace('      return {\n        aspect','      return {\n        auditRead(){return {W,H,field:Array.from(field),metric};},\n        aspect'),portable=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');assert(portable.includes(source));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peakon-review-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,portable.replace(source,injected).replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const page=await browser.newPage(),errors=[],cases=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#peakon/review');await page.evaluate(()=>Studio.ready);
 const fixtures=[{kind:'one',slice:'shot',frame:'lab',t:0,sep:0,zoom:1.55,view:'profile'},{kind:'two',slice:'space',frame:'cm',t:0,sep:0,zoom:.9,view:'field'},{kind:'three',slice:'shot',frame:'cm',t:-2.4,sep:.35,zoom:1.05,view:'shade'},{kind:'train',slice:'shot',frame:'lab',t:-4.2,sep:1.1,zoom:.95,view:'profile'},{kind:'overtake',slice:'space',frame:'cm',t:0,sep:0,zoom:.8,view:'log'},{kind:'rest',slice:'space',frame:'lab',t:0,sep:0,zoom:1.05,view:'field'}];
 for(let i=0;i<fixtures.length;i++){
  const params={...fixtures[i],grid:128,aspect:['1:1','4:5','16:9'][i%3],exposure:1,running:false},seed='peakon-field-'+i;
  await page.evaluate(({params,seed})=>location.hash='peakon/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{params,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed,seed);
  const actual=await page.evaluate(()=>Studio.auditInstances().peakon.inst.auditRead()),ref=fieldReference(params,actual.W,actual.H),finer=fieldReference(params,actual.W,actual.H,.002);let fieldError=0,refinement=0,wrong=0;
  for(let j=0;j<ref.length;j++){fieldError=Math.max(fieldError,Math.abs(ref[j]-actual.field[j]));refinement=Math.max(refinement,Math.abs(ref[j]-finer[j]));wrong=Math.max(wrong,Math.abs(ref[(j+1)%ref.length]-actual.field[j]));}assert(fieldError<2e-6&&refinement<2e-6&&wrong>.01,JSON.stringify({i,fieldError,refinement,wrong}));
  assert(Math.abs(actual.metric.vRatio-1)<1e-5);assert(Math.abs(actual.metric.cL-(1-Math.exp(-.008))/.008)<.001);assert(Math.abs(actual.metric.cR+(1-Math.exp(-.008))/.008)<.001);assert(Math.abs(actual.metric.hCons-1)<.03&&Math.abs(actual.metric.hRatio-1)<.03);
  const dims=[[2400,2400],[1920,2400],[2400,1350]][i%3],expected=fieldReference(params,...dims),before=await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances().peakon.inst.auditRead()}));
  const print=await page.evaluate(PRINT,{W:dims[0],H:dims[1],encoded:Buffer.from(expected.buffer).toString('base64')});assert.equal(before,await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances().peakon.inst.auditRead()})));
  cases.push({seed,params,fieldError,referenceRefinementError:refinement,displacedFieldError:wrong,diagnostic:actual.metric,print,statePreserved:true});console.log('PASS '+seed);
 }
 assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),sourceSha256:sha(source),scope:'Positive one-to-four peakons: independent Hankel initialization, particle-ODE integration, six finite fields, all four display modes and actual module PNGs.',trajectories,kernel,cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/peakon-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS peakon complete finite review');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
const PRINT=async ({W,H,encoded})=>{
 const entry=Studio.auditInstances().peakon,s=entry.state,bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),field=new Float32Array(bytes.buffer),blob=await entry.inst.exportPNG(W,H),url=URL.createObjectURL(blob),img=new Image();img.src=url;await img.decode();if(img.width!==W||img.height!==H)throw Error('Print dimensions changed');
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0);const actual=ctx.getImageData(0,0,W,H).data;URL.revokeObjectURL(url);
 const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,srgb=v=>255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055),clamp=x=>Math.max(0,Math.min(1,x)),stops=[s.bg,...s.palette].map(hex=>{let h=hex.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return [0,2,4].map(i=>linear(parseInt(h.slice(i,i+2),16)/255));});
 let lo=Infinity,hi=-Infinity;for(const v of field){lo=Math.min(lo,v);hi=Math.max(hi,v);}const span=hi-lo||1,native=new Uint8ClampedArray(W*H*4);
 for(let j=0;j<field.length;j++){
  const x=j%W,y=Math.floor(j/W);let t=(field[j]-lo)/span;
  if(s.view==='log')t=Math.log(1.001+18*t)/Math.log(19);
  else if(s.view==='shade'){
   const gx=field[j-(x>0?1:0)]-field[j+(x<W-1?1:0)],gy=field[j-(y>0?W:0)]-field[j+(y<H-1?W:0)];t=clamp(t*(.755+.475*(.55*gx+.85*gy)/(2.4*span+1e-6)));
  }else if(s.view==='profile'){
   const Y=1-(y+.5)/H,crest=.07+.86*field[j]/Math.max(hi,1e-9),q=clamp((Y-crest+2.2/H)/(3/H)),smooth=q*q*(3-2*q),fill=Y<=crest?.55+.45*Y/Math.max(crest,1e-6):0;
   t=clamp(Math.max(fill*(1-.35*smooth),Y>crest-3/H?.9*Math.exp(-.55*((Y-crest)*H)**2):0));if(Y<.03)t=Math.max(t,.18);
  }
  const p=clamp(t*s.exposure)*(stops.length-1),k=Math.min(stops.length-2,Math.floor(p)),f=p-k;
  for(let ch=0;ch<3;ch++)native[4*j+ch]=srgb(stops[k][ch]+f*(stops[k+1][ch]-stops[k][ch]));native[4*j+3]=255;
 }
 let max=0,wrong=0,first=null;for(let j=0;j<actual.length;j++){const e=Math.abs(actual[j]-native[j]);max=Math.max(max,e);if(e>1&&!first)first={channel:j,actual:actual[j],expected:native[j]};if(Math.abs(actual[j]-native[(j+4)%native.length])>1)wrong++;}if(max>1||wrong<100)throw Error(JSON.stringify({max,wrong,first}));
 return {width:W,height:H,channelsCompared:actual.length,maxChannelError:max,displacedChannelMismatches:wrong,params:JSON.parse(JSON.stringify(s))};
};
main().catch(e=>{console.error(e);process.exitCode=1;});
