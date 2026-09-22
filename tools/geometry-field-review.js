'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function circleReference(depth,limit){
 // Solve Descartes' quadratic and complex center equation for the fourth tangent circle.
 const seed=[{k:-1,bx:0,by:0,g:0},{k:2,bx:-1,by:0,g:0},{k:2,bx:1,by:0,g:0},{k:3,bx:0,by:2,g:0}],out=seed.slice(),queue=[[seed,0]],seen=new Set(seed.map(c=>[c.k,c.bx,c.by].join('/')));
 const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
 for(let cursor=0;cursor<queue.length;cursor++){const [q,level]=queue[cursor];if(level>=depth)continue;
 for(let omit=0;omit<4;omit++){const old=q[omit],others=q.filter((_,i)=>i!==omit),sum=others.reduce((v,c)=>v+c.k,0),disc=others[0].k*others[1].k+others[1].k*others[2].k+others[0].k*others[2].k;
 const ks=[sum+2*Math.sqrt(Math.max(0,disc)),sum-2*Math.sqrt(Math.max(0,disc))].map(Math.round),centerSum=others.reduce((v,c)=>[v[0]+c.bx,v[1]+c.by],[0,0]);let z=[0,0];
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const p=mul([others[i].bx,others[i].by],[others[j].bx,others[j].by]);z=[z[0]+p[0],z[1]+p[1]];}
 const norm=Math.hypot(...z),sx=Math.sqrt(Math.max(0,(norm+z[0])/2)),sy=(z[1]<0?-1:1)*Math.sqrt(Math.max(0,(norm-z[0])/2));
 for(const k of new Set(ks))for(const sign of [-1,1]){if(k<=0||k>limit)continue;const c={k,bx:Math.round(centerSum[0]+sign*2*sx),by:Math.round(centerSum[1]+sign*2*sy),g:level+1},key=[c.k,c.bx,c.by].join('/');if(seen.has(key))continue;
 const valid=others.every(v=>Math.abs(Math.hypot(c.bx/c.k-v.bx/v.k,c.by/c.k-v.by/v.k)-(v.k<0?1/Math.abs(v.k)-1/c.k:1/v.k+1/c.k))<1e-10);if(!valid)continue;
 assert(out.length<2000,'Reference exceeded declared cap');seen.add(key);out.push(c);const next=q.slice();next[omit]=c;queue.push([next,level+1]);
 }
 }}return out.map(c=>({...c,x:c.bx/c.k,y:c.by/c.k,r:1/Math.abs(c.k)}));
}
function hopfReference(W,H,s){
 const field=new Float32Array(W*H);let inverseError=0;
 const splat=(x,y,weight)=>{const ix=Math.floor(x),iy=Math.floor(y);if(ix<0||iy<0||ix>=W-1||iy>=H-1)return;for(let j=iy;j<=iy+1;j++)for(let i=ix;i<=ix+1;i++)field[j*W+i]+=weight*(1-Math.abs(x-i))*(1-Math.abs(y-j));};
 for(let f=0;f<s.fibres;f++){const theta=Math.PI*(f+.5)/s.fibres,phi=(f*2.399+s.twist)%(2*Math.PI);for(let k=0;k<180;k++){
 const t=2*Math.PI*k/180,z1=[Math.cos(theta/2)*Math.cos(t),Math.cos(theta/2)*Math.sin(t)],z2=[Math.sin(theta/2)*Math.cos(t+phi),Math.sin(theta/2)*Math.sin(t+phi)],p=[z1[0],z1[1],z2[0]].map(x=>x/(1-z2[1]));
 const rr=p.reduce((n,x)=>n+x*x,0),q=[2*p[0]/(1+rr),2*p[1]/(1+rr),2*p[2]/(1+rr),(rr-1)/(1+rr)],base=[2*(q[0]*q[2]+q[1]*q[3]),2*(q[1]*q[2]-q[0]*q[3]),q[0]**2+q[1]**2-q[2]**2-q[3]**2];inverseError=Math.max(inverseError,...base.map((v,i)=>Math.abs(v-[Math.sin(theta)*Math.cos(phi),-Math.sin(theta)*Math.sin(phi),Math.cos(theta)][i])));
 const x=(.5+.28*p[0])*W,y=(.5+.28*p[1])*H,weight=s.kind==='tori'?.35+.7*Math.sin(theta)**2:.7;for(const [dx,dy,factor] of [[0,0,1],[1,0,.5],[0,1,.5],[-1,0,.5],[0,-1,.5]])splat(x+dx,y+dy,weight*factor);
 }}for(let i=0;i<field.length;i++)field[i]=Math.log1p(field[i]);assert(inverseError<1e-12);return {field,inverseError};
}
function apollonianReference(W,H,s){
 const R=.48*Math.min(W,H),circles=circleReference(s.depth,R/.6),field=new Float32Array(W*H);
 // Independent full-image distance classification rather than production bounding-box loops.
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){let value=0;for(const c of circles){const distance=Math.hypot(x+.5-W/2-R*c.x,y+.5-H/2-R*c.y),radius=R*c.r;if(c.k<0){if(distance<=radius&&distance>radius-1.2)value=Math.max(value,Math.fround(.4));continue;}if(distance>radius)continue;let v=s.kind==='fill'?1:s.kind==='k'?Math.log1p(c.k):.2+.8*c.g/s.depth;if(distance>radius-1.1)v+=.35;value=Math.max(value,Math.fround(v));}field[y*W+x]=value;}
 return {field,circles,unfilled:1-circles.filter(c=>c.k>0).reduce((n,c)=>n+c.r*c.r,0)};
}
function seriesValue(x,phase,s,count=s.terms){
 // Complex-angle powering avoids production's growing b^n*pi*x arguments.
 let z=[Math.cos(Math.PI*x),Math.sin(Math.PI*x)],sum=0;
 for(let n=0;n<count;n++){sum+=s.a**n*(z[0]*Math.cos(phase[n])-z[1]*Math.sin(phase[n]));let next=[1,0];for(let k=0;k<s.b;k++)next=[next[0]*z[0]-next[1]*z[1],next[0]*z[1]+next[1]*z[0]];z=next;}return sum;
}
function weierstrassReference(W,H,s,phase){
 const field=new Float32Array(W*H);let periodError=0,tailViolation=0;
 for(let i=0;i<101;i++){const x=-1+2*i/100;periodError=Math.max(periodError,Math.abs(seriesValue(x,phase,s)-seriesValue(x+2,phase,s)));const tail=Math.abs(seriesValue(x,phase,s)-seriesValue(x,phase,s,s.terms-2));tailViolation=Math.max(tailViolation,tail-s.a**(s.terms-2)*(1-s.a**2)/(1-s.a));}assert(periodError<1e-10&&tailViolation<1e-12);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const xx=2*x/(W-1)-1,yy=2*y/(H-1)-1,v=seriesValue(xx,phase,s,s.kind==='rough'?1+Math.floor(s.terms*y/H):s.terms);field[y*W+x]=s.kind==='field'?v+seriesValue(yy,phase,s):Math.exp(-(s.kind==='rough'?80:90)*(yy-(.5-.28*v))**2);}
 let r1=0,r10=0;for(let k=4;k<W-4;k+=3){const x=2*k/W-1;r1+=Math.abs(seriesValue(x+2/W,phase,s)-seriesValue(x,phase,s))/(2/W);r10+=Math.abs(seriesValue(x+20/W,phase,s)-seriesValue(x,phase,s))/(20/W);}return {field,periodError,tailViolation,incrementRatio:r1/r10};
}
async function main(){
 const kernel=JSON.parse(execFileSync(process.execPath,[path.join(root,'tools/geometry-science.js')],{encoding:'utf8'})),sources={},cases=[];let html=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');
 for(const id of ['hopf','apollonian','weierstrass']){const source=fs.readFileSync(path.join(root,'src/modules/'+id+'.js'),'utf8');assert(html.includes(source));sources[id]=sha(source);let injected=source.replace('let W = 0,','let auditPh;\n      let W = 0,').replace('        function W1(x) {','        auditPh=Array.from(ph);\n        function W1(x) {');injected=injected.replace('      return {\n        aspect','      return {\n        auditRead(){return {W,H,field:Array.from(field),metric,extra,phase:auditPh};},\n        aspect');assert.notEqual(source,injected);html=html.replace(source,injected);}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'geometry-field-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,html.replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#three-vortex-bound/geometry-fields');await page.evaluate(()=>Studio.ready);await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');await page.selectOption('#print-smoothing','off',{force:true});await page.locator('#btn-colophon-edit').click();await page.locator('#colo-enabled').uncheck();await page.locator('#colo-close').click();
 const fixtures={hopf:[{fibres:12,twist:.1,kind:'fibres'},{fibres:36,twist:.35,kind:'fibres'},{fibres:48,twist:.7,kind:'tori'}],apollonian:[{depth:3,kind:'gen'},{depth:5,kind:'k'},{depth:7,kind:'fill'}],weierstrass:[{a:.35,b:3,terms:6,kind:'field'},{a:.5,b:5,terms:4,kind:'graph'},{a:.65,b:3,terms:5,kind:'rough'}]};
 for(const [id,rows] of Object.entries(fixtures))for(let i=0;i<rows.length;i++){
 const params={...rows[i],grid:i===1?192:128,aspect:['1:1','4:5','16:9'][i],view:i===2?'log':'int',exposure:1},seed='geometry-field-'+id+'-'+i;await page.evaluate(({id,params,seed})=>location.hash=id+'/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{id,params,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed,seed);
 const actual=await page.evaluate(id=>Studio.auditInstances()[id].inst.auditRead(),id),ref=id==='hopf'?hopfReference(actual.W,actual.H,params):id==='apollonian'?apollonianReference(actual.W,actual.H,params):weierstrassReference(actual.W,actual.H,params,actual.phase);
 let fieldError=0,mutatedError=0;for(let j=0;j<ref.field.length;j++){fieldError=Math.max(fieldError,Math.abs(ref.field[j]-actual.field[j]));mutatedError=Math.max(mutatedError,Math.abs(ref.field[(j+1)%ref.field.length]-actual.field[j]));}assert(fieldError<2e-6,JSON.stringify({id,fieldError}));assert(mutatedError>.01,'Displaced full field must fail');
 if(id==='hopf')assert(Math.abs(actual.metric-1)<.001,'Displayed link magnitude must agree with one');
 if(id==='apollonian'){assert.equal(actual.extra,ref.circles.length);assert(Math.abs(actual.metric-ref.unfilled)<1e-12);}if(id==='weierstrass')assert(Math.abs(actual.metric-ref.incrementRatio)<1e-9);
 const before=await page.evaluate(id=>JSON.stringify({recipe:Studio.getRecipe(),field:Studio.auditInstances()[id].inst.auditRead()}),id);await page.locator('#btn-export').click();await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);
 const print=await page.evaluate(PRINT_REFERENCE,{id,expected:Array.from(ref.field),W:actual.W,H:actual.H});assert.equal(Math.max(print.width,print.height),2400);assert.equal(before,await page.evaluate(id=>JSON.stringify({recipe:Studio.getRecipe(),field:Studio.auditInstances()[id].inst.auditRead()}),id));
 cases.push({id,seed,grid:[actual.W,actual.H],fieldError,displacedFieldError:mutatedError,metric:actual.metric,inverseError:ref.inverseError,periodError:ref.periodError,tailViolation:ref.tailViolation,circles:ref.circles?.length,unfilled:ref.unfilled,incrementRatio:ref.incrementRatio,fieldSha256:sha(JSON.stringify(actual.field)),print,statePreserved:true});console.log('PASS '+seed);await page.locator('#export-close').click();
 }
 assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),scope:'Nine enumerated complete Hopf, Apollonian and finite Weierstrass fields and actual prints; no infinite-series or arbitrary-parameter claim.',sourceSha256:sources,engineSha256:sha(fs.readFileSync(path.join(root,'src/shared/engine.js'))),geometry:kernel,cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/geometry-field-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS nine geometry fields and prints');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}

const PRINT_REFERENCE=async ({id,expected,W,H})=>{
    const e=Studio.auditInstances()[id],s=e.state,img=document.querySelector('#export-img');await img.decode();const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0);const rgba=g.getImageData(0,0,w,h).data;
    const toLinear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,toSrgb=v=>255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
    const stops=[s.bg,...s.palette].map(hex=>{let h=hex.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return [0,2,4].map(i=>toLinear(parseInt(h.slice(i,i+2),16)/255));});
    const lo=Math.min(...expected),hi=Math.max(...expected),native=new Uint8ClampedArray(W*H*4);
    for(let i=0;i<expected.length;i++){let t=(expected[i]-lo)/(hi-lo||1);if(s.view==='log')t=Math.log(1.001+9*Math.max(0,t))/Math.log(10);t=Math.min(1,Math.max(0,t*s.exposure))*(stops.length-1);const k=Math.min(stops.length-2,Math.floor(t)),u=t-k;for(let ch=0;ch<3;ch++)native[4*i+ch]=toSrgb((1-u)*stops[k][ch]+u*stops[k+1][ch]);native[4*i+3]=255;}
    let maxChannelError=0,wrongPixels=0,checked=0,firstMismatch=null;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=4*(y*w+x),j=4*(Math.min(H-1,Math.ceil((y+.5)*H/h-1e-10)-1)*W+Math.min(W-1,Math.ceil((x+.5)*W/w-1e-10)-1)),bad=(j+4)%(W*H*4);let wrong=false;for(let ch=0;ch<4;ch++){maxChannelError=Math.max(maxChannelError,Math.abs(rgba[i+ch]-native[j+ch]));if(!firstMismatch&&Math.abs(rgba[i+ch]-native[j+ch])>1)firstMismatch={x,y,ch,actual:rgba[i+ch],expected:native[j+ch],source:j/4,W,H,w,h};if(Math.abs(rgba[i+ch]-native[bad+ch])>1)wrong=true;checked++;}if(wrong)wrongPixels++;}
    if(maxChannelError>1||wrongPixels<100)throw Error(JSON.stringify({maxChannelError,wrongPixels,firstMismatch}));
    return {width:w,height:h,channelsChecked:checked,maxChannelError,shiftedCellFailurePixels:wrongPixels,params:JSON.parse(JSON.stringify(s))};
   };
main().catch(e=>{console.error(e);process.exitCode=1;});
