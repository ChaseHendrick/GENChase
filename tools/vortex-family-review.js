// Independent point-vortex equations, full analytic trajectories and real print paths.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const defs=[
 {id:'three-vortex-bound',g:[1,1,-.5],minimum:Math.atan(1/Math.sqrt(2))*180/Math.PI,floor:Math.sqrt(2)},
 {id:'parallelogram-lock',g:[1,1,-2-Math.sqrt(3),-2-Math.sqrt(3)],minimum:Math.acos(.25)*90/Math.PI,floor:3*Math.sqrt(5)/4},
 {id:'quincunx-lock',g:[-1,-1,.5,.5,-.75],minimum:Math.acos(4/7)*90/Math.PI,floor:3*Math.sqrt(33)/16}
];
function initial(d,theta){const a=theta*Math.PI/180;if(d.g.length===3)return [[0,0],[1,0],[.5+Math.sqrt(3)/2*Math.cos(a),Math.sqrt(3)/2*Math.sin(a)]];const angle=d.g.length===4?-a:a,r=d.g.length===4?Math.sqrt(2+Math.sqrt(3))/2:1/Math.sqrt(8);const z=[[r*Math.cos(angle),r*Math.sin(angle)],[-r*Math.cos(angle),-r*Math.sin(angle)],[-.5,0],[.5,0]];if(d.g.length===5)z.push([0,0]);return z;}
function velocity(z,g){const v=z.map(()=>[0,0]);for(let i=0;i<z.length;i++)for(let j=i+1;j<z.length;j++){const dx=z[j][0]-z[i][0],dy=z[j][1]-z[i][1],den=2*Math.PI*(dx*dx+dy*dy);v[i][0]+=g[j]*dy/den;v[i][1]-=g[j]*dx/den;v[j][0]-=g[i]*dy/den;v[j][1]+=g[i]*dx/den;}return v;}
function reference(d,z){const sum=d.g.reduce((a,b)=>a+b,0),c=[0,1].map(k=>z.reduce((s,p,i)=>s+d.g[i]*p[k],0)/sum),v=velocity(z,d.g);let norm=0,dot=0,cross=0;for(let i=0;i<z.length;i++){const x=z[i][0]-c[0],y=z[i][1]-c[1];norm+=x*x+y*y;dot+=x*v[i][0]+y*v[i][1];cross+=x*v[i][1]-y*v[i][0];}const A=dot/norm,B=cross/norm,T=-1/(2*A);return {c,A,B,T,product:Math.abs(B*T),radius:Math.sqrt(norm/z.length),v};}
function exact(z,r,fraction){const u=1-fraction,angle=-r.B*r.T*Math.log(u),c=Math.cos(angle),s=Math.sin(angle);return z.map(p=>{const x=p[0]-r.c[0],y=p[1]-r.c[1];return [r.c[0]+Math.sqrt(u)*(c*x-s*y),r.c[1]+Math.sqrt(u)*(s*x+c*y)];});}
const error=(a,b)=>Math.max(...a.flatMap((p,i)=>p.map((v,k)=>Math.abs(v-b[i][k]))));
function formula(d,theta){const t=theta*Math.PI/180;if(d.g.length===3)return (2-Math.cos(t)**2)/Math.sin(2*t);return d.g.length===4?Math.sqrt(3)/4*(4-Math.cos(2*t))/Math.sin(2*t):3/16*(7-4*Math.cos(2*t))/Math.sin(2*t);}
function load(source){const b={Studio:{util:{clamp:(x,a,b)=>Math.max(a,Math.min(b,x))},PALETTES:{},register(){}}};vm.runInNewContext(source.replace('  Studio.register({','globalThis.audit={place,velOf,metricsOf,atExact,rk4Step,integrate,timeIndex,wtcClosed,DEFAULTS};\n  Studio.register({'),b);return b.audit;}
function numerical(d,source){const m=load(source),sweeps=[],refinements=[];let maxVelocityError=0,maxFormulaError=0,maxExactError=0,maxGeometryError=0;
 for(const theta of Array.from({length:149},(_,i)=>8+i*.5).concat(d.minimum)){
  const z=initial(d,theta),r=reference(d,z),prod=m.metricsOf(m.place(theta,false));assert(r.T>0);maxGeometryError=Math.max(maxGeometryError,error(z,m.place(theta,false)));maxVelocityError=Math.max(maxVelocityError,error(r.v,m.velOf(z)));maxFormulaError=Math.max(maxFormulaError,Math.abs(r.product/formula(d,theta)-1),Math.abs(m.wtcClosed(theta)/formula(d,theta)-1));assert(r.product>=d.floor-1e-11);
  for(const f of [0,.25,.5,.9,.92])maxExactError=Math.max(maxExactError,error(exact(z,r,f),m.atExact(prod,f))/r.radius);
  sweeps.push({theta,product:r.product,collapseTime:r.T});
 }
 assert(maxGeometryError<1e-14&&maxVelocityError<1e-12&&maxFormulaError<1e-11&&maxExactError<1e-10);
 for(const theta of [8,d.minimum,45,82]){const z0=initial(d,theta),r=reference(d,z0),errors=[];for(const steps of [64,128,256]){let z=z0;for(let k=0;k<steps;k++)z=m.rk4Step(z,.5*r.T/steps);errors.push(error(z,exact(z0,r,.5))/r.radius);}const orders=errors.slice(1).map((e,i)=>Math.log2(errors[i]/e));assert(errors[2]<2e-6,JSON.stringify({id:d.id,theta,errors}));assert(orders.every(x=>x>3.5&&x<4.5),JSON.stringify({id:d.id,theta,errors,orders}));refinements.push({theta,steps:[64,128,256],timeFraction:.5,errors,orders});}
 const z=initial(d,d.minimum),r=reference(d,z),bad=load(source.replace('out[i][0] += -c * dy;','out[i][0] += c * dy;'));
 assert(Math.abs(r.product-d.floor)<1e-12);
 assert(error(bad.velOf(z),r.v)>.01,'wrong-sign mutation must be detected');
 const off=m.place(d.minimum,true),offR=reference(d,off);let brokenResidual=0;off.forEach((p,i)=>{const x=p[0]-offR.c[0],y=p[1]-offR.c[1];brokenResidual=Math.max(brokenResidual,Math.hypot(offR.v[i][0]-offR.A*x+offR.B*y,offR.v[i][1]-offR.A*y-offR.B*x));});assert(brokenResidual>.001);
 const traj=m.integrate('family',d.minimum),timeCases=[0,.23,.5,.92].map(t=>({requested:t,actual:traj.tt[m.timeIndex(traj,t)]}));
 for(const row of timeCases)assert(Math.abs(row.requested-row.actual)<=.92/(2*(traj.n-1))+1e-14);
 const oldTimeAtEnd=traj.tt[Math.round(.92*(traj.n-1))];assert(Math.abs(oldTimeAtEnd-.92)>.07);
 return {timeCases,oldTimeAtEnd,angles:sweeps.length,maxGeometryError,maxVelocityError,maxFormulaError,maxExactError,minimum:{theta:d.minimum,expected:d.floor,observed:r.product},refinements,wrongSignDetected:true,brokenResidual};
}
async function main(){const results=[],fixtures=[];let portable=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8');
 for(const d of defs){const source=fs.readFileSync(path.join(root,'src/modules/'+d.id+'.js'),'utf8');assert(portable.includes(source));const numbers=numerical(d,source);results.push({id:d.id,sourceSha256:sha(source),numerical:numbers,cases:[]});
  const instrumented=source.replace('      return {\n        aspect','      return {\n        auditRead(){return traj;},\n        aspect');assert.notEqual(instrumented,source);portable=portable.replace(source,instrumented);
  for(const [tag,theta,view,aspect] of [['low',8,'spiral','1:1'],['minimum',d.minimum,'spiral','4:5'],['middle',45,'overlay','5:4'],['high',82,'polar','16:9']]){
   const z=initial(d,theta),ref=reference(d,z),count=d.g.length===3?720:640;
   const expected=Array.from({length:count},(_,k)=>exact(z,ref,.92*k/(count-1)));
   fixtures.push({id:d.id,name:d.id+'-'+tag,params:{kind:'family',theta,t:.92,view,aspect,running:false,zoom:1,panX:0,panY:0,weight:1,fade:0},expected,ref});
  }
 }
 if(process.argv.includes('--numeric')){console.log(JSON.stringify(results,null,2));return;}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vortex-review-')),file=path.join(dir,'studio.html');fs.writeFileSync(file,portable.replace('generatePalette, register, boot,','generatePalette, register, auditInstances: () => instances, boot,'));
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto('file://'+file+'#three-vortex-bound/review');await page.evaluate(()=>Studio.ready);
 await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');await page.locator('#btn-colophon-edit').click();await page.locator('#colo-enabled').uncheck();await page.locator('#colo-close').click();
 for(const f of fixtures){await page.evaluate(f=>{location.hash=f.id+'/'+f.name+'/'+btoa(JSON.stringify({...f.params,v:2}));},f);await page.waitForFunction(name=>Studio.getRecipe()?.seed===name,f.name);
 const state=await page.evaluate(id=>JSON.stringify({recipe:Studio.getRecipe(),trajectory:Studio.auditInstances()[id].inst.auditRead()}),f.id);
 await page.locator('#btn-export').click();await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);
 const print=await page.evaluate(async f=>{
  const e=Studio.auditInstances()[f.id],a=e.inst.auditRead(),img=document.querySelector('#export-img');await img.decode();const w=img.naturalWidth,h=img.naturalHeight;
  let trajectoryError=0;for(let k=0;k<a.n;k++)for(let i=0;i<a.px.length;i++)trajectoryError=Math.max(trajectoryError,Math.abs(a.px[i][k]-f.expected[k][i][0]),Math.abs(a.py[i][k]-f.expected[k][i][1]));if(trajectoryError/f.ref.radius>1e-10)throw Error('Independent trajectory mismatch');
  // The export's time control selects a sample index; the final sample represents 0.92 t_c.
  const rawPoints=f.expected[0].map((_,i)=>f.expected.map(z=>e.state.view==='polar'?[Math.atan2(z[i][1]-f.ref.c[1],z[i][0]-f.ref.c[0]),Math.log(Math.max(Math.hypot(z[i][0]-f.ref.c[0],z[i][1]-f.ref.c[1]),1e-6))]:z[i]));
  const points=f.id==='quincunx-lock'&&e.state.view==='polar'?rawPoints.slice(0,4):rawPoints;
  const all=points.flat(),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),dx=xmax-xmin||1,dy=ymax-ymin||1,scale=Math.min(w*.76/dx,h*.76/dy)*e.state.zoom;
  const map=p=>[w/2+(p[0]-(xmin+xmax)/2+e.state.panX*dx)*scale,h/2-(p[1]-(ymin+ymax)/2+e.state.panY*dy)*scale];
  const svg=e.inst.exportSVG(w,h),doc=new DOMParser().parseFromString(svg,'image/svg+xml'),paths=[...doc.querySelectorAll('path')];if(doc.querySelector('parsererror'))throw Error('Invalid SVG');
  const lists=[];if(e.state.view==='overlay'){for(let k=0;k<a.n;k+=Math.max(1,(a.n/18)|0)){const ring=a.px.length===3?[0,1,2]:[0,3,1,2];lists.push(ring.map(i=>map(points[i][k])));}}else{const cut=Math.round(e.state.t/.92*(a.n-1))+1;for(const p of points)lists.push(p.slice(0,cut).map(map));}
  if(paths.length!==lists.length)throw Error('Unexpected SVG path count');let svgMaxError=0,coordinates=0;
  for(let i=0;i<paths.length;i++){const actual=(paths[i].getAttribute('d').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number),expected=lists[i].flat();if(actual.length!==expected.length)throw Error('Missing trajectory vertices');actual.forEach((v,k)=>{svgMaxError=Math.max(svgMaxError,Math.abs(v-expected[k]));coordinates++;});}
  if(svgMaxError>.00501)throw Error('SVG point differs '+svgMaxError);
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0);const actual=g.getImageData(0,0,w,h).data;
  const u=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),im=new Image();im.src=u;await im.decode();g.fillStyle=e.state.bg;g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);const expected=g.getImageData(0,0,w,h).data;g.fillRect(0,0,w,h);g.drawImage(im,1,0,w,h);const shifted=g.getImageData(0,0,w,h).data;URL.revokeObjectURL(u);
  let mismatch=0,bad=0;for(let i=0;i<actual.length;i++){if(actual[i]!==expected[i])mismatch++;if(actual[i]!==shifted[i])bad++;}if(mismatch||!bad)throw Error('PNG equality or displacement control failed');
  return {width:w,height:h,trajectoryError,svgMaxError,coordinates,pngChannelMismatches:mismatch,displacedPrintMismatches:bad,params:{...e.state,palette:e.state.palette}};
 },f);
 assert.equal(Math.max(print.width,print.height),2400);assert.equal(await page.evaluate(id=>JSON.stringify({recipe:Studio.getRecipe(),trajectory:Studio.auditInstances()[id].inst.auditRead()}),f.id),state);
 results.find(r=>r.id===f.id).cases.push({name:f.name,...print,statePreserved:true});console.log('PASS '+f.name);await page.locator('#export-close').click();
 }
 assert.deepEqual(errors,[]);const report={date:new Date().toISOString().slice(0,10),scope:'Three classical point-vortex families; only the twelve enumerated field and print recipes. Analytic trajectories, not arbitrary off-family integrations or physical vortices.',results,engineSha256:sha(fs.readFileSync(path.join(root,'src/shared/engine.js'))),environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/vortex-family-review.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS vortex families, '+fixtures.length+' recipes');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
