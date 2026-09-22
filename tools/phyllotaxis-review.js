'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sourceFile='src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js',sha=x=>crypto.createHash('sha256').update(x).digest('hex'),TAU=2*Math.PI;
function numerical(s,actual){
 let radialError=0,maxObjectiveGap=0,wrongGrowthError=0,wrongAngleGap=0;const rows=[];
 for(let k=0;k<actual.pts.length;k++){
  const p=actual.pts[k],radius=s.r0*s.growth**(s.N-1-k);radialError=Math.max(radialError,Math.abs(Math.hypot(p.x,p.y)-radius));wrongGrowthError=Math.max(wrongGrowthError,Math.abs(Math.hypot(p.x,p.y)-s.r0));assert.equal(p.age,k);
  if(!k)continue;
  const previous=actual.pts.slice(0,k).map((q,j)=>({r:s.r0*s.growth**(k-j),theta:q.th})),energy=theta=>previous.reduce((sum,p)=>sum+1/(s.r0*s.r0+p.r*p.r-2*s.r0*p.r*Math.cos(theta-p.theta)+s.lam*s.lam),0);
  // Independent exhaustive fine angular scan followed by bounded golden-section minimization.
  const n=1440;let best=0,minimum=Infinity;for(let j=0;j<n;j++){const e=energy(TAU*j/n);if(e<minimum){minimum=e;best=j;}}
  let lo=TAU*(best-1)/n,hi=TAU*(best+1)/n;for(let j=0;j<48;j++){const a=hi-(hi-lo)/1.618033988749895,b=lo+(hi-lo)/1.618033988749895;if(energy(a)<energy(b))hi=b;else lo=a;}
  minimum=energy((lo+hi)/2);const observed=energy(p.th),gap=(observed-minimum)/Math.max(1,Math.abs(minimum));maxObjectiveGap=Math.max(maxObjectiveGap,gap);wrongAngleGap=Math.max(wrongAngleGap,(energy(p.th+.2)-minimum)/Math.max(1,Math.abs(minimum)));rows.push({step:k,relativeObjectiveGap:gap,refinedAngle:(lo+hi)/2,actualAngle:p.th});
 }
 const div=actual.pts.slice(1).map((p,j)=>Math.abs(Math.atan2(Math.sin(p.th-actual.pts[j].th),Math.cos(p.th-actual.pts[j].th)))*180/Math.PI),tail=div.slice(Math.floor(div.length*.4)),mean=tail.reduce((a,b)=>a+b,0)/tail.length;
 assert(radialError<1e-11&&maxObjectiveGap<2e-7&&wrongGrowthError>.01&&wrongAngleGap>1e-4,JSON.stringify({radialError,maxObjectiveGap,wrongGrowthError,wrongAngleGap}));assert(Math.abs(mean-actual.mean)<1e-10);
 return {radialError,maxObjectiveGap,wrongGrowthError,wrongAngleGap,meanDivergence:mean,insertionRows:rows};
}
async function main(){
 const source=fs.readFileSync(path.join(root,sourceFile),'utf8'),start=source.indexOf('  /* ==================== Douady'),end=source.indexOf('  /* ==================== Indra',start),segment=source.slice(start,end),injected=segment.replace('        aspect(){ return 1; },','        auditRead(){return {pts,divs,stepCount,mean:meanDiv()};},\n        aspect(){ return 1; },');assert.notEqual(injected,segment);
 let html=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');assert(html.includes(source));html=html.replace(source,source.slice(0,start)+injected+source.slice(end)).replace('generatePalette, register, boot,','generatePalette, register, auditInstances:()=>instances, boot,');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'phyllotaxis-review-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,html);const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const page=await browser.newPage(),cases=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#phyllotaxis/review');await page.evaluate(()=>Studio.ready);
 const fixtures=[{N:40,lam:.08,growth:1.04,r0:.04,view:'dots'},{N:80,lam:.14,growth:1.024,r0:.06,view:'para'},{N:120,lam:.11,growth:1.03,r0:.04,view:'voronoi'}];
 for(let i=0;i<fixtures.length;i++){
  const params={...fixtures[i],grain:0,size:1.1,running:false},seed='phyllotaxis-review-'+i;
  await page.evaluate(({params,seed})=>location.hash='phyllotaxis/'+seed+'/'+btoa(JSON.stringify({...params,v:2})),{params,seed});await page.waitForFunction(seed=>Studio.getRecipe()?.seed===seed,seed);
  const actual=await page.evaluate(()=>Studio.auditInstances().phyllotaxis.inst.auditRead()),checks=numerical(params,actual),before=await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances().phyllotaxis.inst.auditRead()}));
  const print=await page.evaluate(PRINT,{params,angles:actual.pts.map(p=>p.th),w:2400,h:2400});assert.equal(before,await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances().phyllotaxis.inst.auditRead()})));
  cases.push({seed,params,numerical:checks,print,statePreserved:true});console.log('PASS '+seed);
 }
 assert.deepEqual(errors,[]);const result={date:new Date().toISOString().slice(0,10),sourceSha256:sha(source),componentSha256:sha(segment),scope:'Three finite greedy inhibitory-growth recipes; every insertion independently minimized, all printed circles/links or raster cells checked. No biological or golden-angle universality claim.',cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/phyllotaxis-review.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS phyllotaxis review');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
const PRINT=async({params,angles,w,h})=>{
 const e=Studio.auditInstances().phyllotaxis,s=e.state,blob=await e.inst.exportPNG(w,h),bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(bitmap,0,0);bitmap.close();const actual=ctx.getImageData(0,0,w,h).data;
 const points=angles.map((a,i)=>{const r=params.r0*params.growth**(params.N-1-i),scale=.46*Math.min(w,h)/Math.max(params.r0*params.growth**(params.N-1),1e-3);return {x:w/2+scale*r*Math.cos(a),y:h/2+scale*r*Math.sin(a),radius:params.size*Math.min(w,h)/220*(.7+.6*i/params.N)};});
 const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4,srgb=x=>255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055),stops=s.palette.map(hex=>{let v=hex.slice(1);if(v.length===3)v=[...v].map(c=>c+c).join('');return [0,2,4].map(i=>linear(parseInt(v.slice(i,i+2),16)/255));}),lut=[];
 for(let i=0;i<256;i++){const t=i/255*(stops.length-1),j=Math.min(stops.length-2,Math.floor(t)),q=t-j;lut.push(Array.from(new Uint8ClampedArray(stops[j].map((v,k)=>srgb(v*(1-q)+stops[j+1][k]*q)))));}
 const color=t=>'rgb('+lut[Math.floor(t*255)].join(',')+')',neighbors=points.map((p,i)=>{let best=-1,d=Infinity;for(let j=0;j<points.length;j++)if(j!==i){const v=(p.x-points[j].x)**2+(p.y-points[j].y)**2;if(v<d){d=v;best=j;}}return best;});
 ctx.fillStyle=s.bg;ctx.fillRect(0,0,w,h);
 if(params.view==='voronoi'){
  const img=ctx.createImageData(w,h);for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){let nearest=0,distance=Infinity;for(let j=0;j<points.length;j++){const d=Math.hypot(x-points[j].x,y-points[j].y);if(d<distance){distance=d;nearest=j;}}const rgb=lut[Math.floor(nearest/points.length*255)];for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const k=((y+dy)*w+x+dx)*4;for(let c=0;c<3;c++)img.data[k+c]=rgb[c];img.data[k+3]=255;}}ctx.putImageData(img,0,0);
 }else{
  if(params.view==='para'){ctx.lineWidth=Math.max(.6,Math.min(w,h)/900);for(let i=0;i<points.length;i++){const p=points[i],q=points[neighbors[i]];ctx.strokeStyle=color(i/points.length);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}
  for(let i=0;i<points.length;i++){const p=points[i];ctx.fillStyle=color(i/(points.length-1));ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,2*Math.PI);ctx.fill();}
 }
 const expected=ctx.getImageData(0,0,w,h).data;let max=0,mean=0,wrong=0,first=null;for(let i=0;i<actual.length;i++){const d=Math.abs(actual[i]-expected[i]);max=Math.max(max,d);mean+=d;if(d>1&&!first)first={channel:i,actual:actual[i],reference:expected[i]};if(Math.abs(actual[i]-expected[(i+4)%actual.length])>1)wrong++;}mean/=actual.length;if(max>1||wrong<100)throw Error(JSON.stringify({max,mean,wrong,first}));
 const svgBlob=await e.inst.exportSVG(w,h);let coordinates=0,svgError=0;
 if(params.view==='voronoi'){if(svgBlob!==null)throw Error('Voronoi must use its raster export, not substitute dots');}
 else{
  const doc=new DOMParser().parseFromString(await svgBlob.text(),'image/svg+xml'),circles=[...doc.querySelectorAll('circle')],lines=[...doc.querySelectorAll('line')];if(circles.length!==points.length||lines.length!==(params.view==='para'?points.length:0))throw Error('Missing vector marks');
  for(let i=0;i<points.length;i++){const p=points[i],c=circles[i];for(const [key,value]of [['cx',p.x],['cy',p.y],['r',p.radius]]){svgError=Math.max(svgError,Math.abs(+c.getAttribute(key)-value));coordinates++;}if(c.getAttribute('fill')!==color(i/(points.length-1)))throw Error('Circle color changed');
   if(lines.length){const q=points[neighbors[i]],l=lines[i];for(const [key,value]of [['x1',p.x],['y1',p.y],['x2',q.x],['y2',q.y]]){svgError=Math.max(svgError,Math.abs(+l.getAttribute(key)-value));coordinates++;}if(l.getAttribute('stroke')!==color(i/points.length))throw Error('Link color changed');}
  }if(svgError>.00501)throw Error('Vector geometry changed '+svgError);
 }
 return {width:w,height:h,rgbaChannelsChecked:actual.length,maxChannelError:max,meanChannelError:mean,displacedChannelMismatches:wrong,svgCoordinatesChecked:coordinates,svgMaxError:svgError,vectorAvailable:svgBlob!==null,params:JSON.parse(JSON.stringify(s))};
};
main().catch(e=>{console.error(e);process.exitCode=1;});
