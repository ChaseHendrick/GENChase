// Geometry of maintained maps, independently checked by inverse projection,
// quadrature, circle distances and planar support extrema.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function load(id,names,change=x=>x){
 const source=fs.readFileSync(path.join(root,'src/modules/'+id+'.js'),'utf8'),hooks={};
 const Studio={util:{},PALETTES:new Proxy({},{get:()=>({})}),register(){}};
 new Function('Studio','hooks',change(source).replace('  Studio.register({','  Object.assign(hooks,{'+names.join(',')+'});\n  Studio.register({'))(Studio,hooks);
 return {source,hooks};
}
const H=load('hopf',['hopfPoint','fibre','gaussLink']),R=load('reuleaux',['reuleauxBoundary','supportWidth']),A=load('apollonian',['apollonianPacking']);
let baseError=0;
for(const theta of [.3,.8,1.5,2.4,2.9])for(const phi of [.1,1.4,3.1])for(let j=0;j<91;j++){
 const p=H.hooks.hopfPoint(theta,phi,j*2*Math.PI/91),r2=p.reduce((v,x)=>v+x*x,0),den=1+r2;
 const [a,b,c,d]=[2*p[0]/den,2*p[1]/den,2*p[2]/den,(r2-1)/den];
 const base=[2*(a*c+b*d),2*(b*c-a*d),a*a+b*b-c*c-d*d],expected=[Math.sin(theta)*Math.cos(phi),-Math.sin(theta)*Math.sin(phi),Math.cos(theta)];
 baseError=Math.max(baseError,...base.map((v,k)=>Math.abs(v-expected[k])));
}
assert(baseError<1e-13);
const links=[];
for(const params of [[.8,.2,2,1.5],[.5,2.4,2.6,.7],[1,.4,2.2,5.1]]){
 const values=[90,180,360].map(n=>H.hooks.gaussLink(H.hooks.fibre(params[0],params[1],n),H.hooks.fibre(params[2],params[3],n)));
 const errors=values.map(v=>Math.abs(Math.abs(v)-1)),orders=[Math.log2(errors[0]/errors[1]),Math.log2(errors[1]/errors[2])];
 assert(errors[2]<.0005);assert(orders.every(x=>x>1.7&&x<2.3));links.push({parameters:params,segments:[90,180,360],values,errors,orders});
}
const aa=H.hooks.fibre(.8,.2,180),bb=H.hooks.fibre(2,1.5,180),forward=H.hooks.gaussLink(aa,bb),reversed=H.hooks.gaussLink(aa,bb.slice().reverse());assert(Math.abs(forward+reversed)<1e-12);
const circle=Array.from({length:180},(_,i)=>[Math.cos(i*2*Math.PI/180),Math.sin(i*2*Math.PI/180),0]);
const unlinked=H.hooks.gaussLink(circle,circle.map(p=>[p[0]+4,p[1],p[2]+.4]));assert(Math.abs(unlinked)<1e-12);
const widths=[];
for(const n of [24,48,96,192,720]){
 const points=R.hooks.reuleauxBoundary(1,n),differences=Array.from({length:997},(_,i)=>1-R.hooks.supportWidth(points,2*Math.PI*(i+.137)/997));
 const max=Math.max(...differences),rms=Math.sqrt(differences.reduce((a,b)=>a+b*b,0)/differences.length),bound=2*(1-Math.cos(Math.PI/(6*n)));
 assert(max<bound+1e-14&&Math.min(...differences)>-1e-14);
 let area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=(p[0]*q[1]-q[0]*p[1])/2;}
 const exactArea=(Math.PI-Math.sqrt(3))/2,areaError=Math.abs(area-exactArea);assert(areaError<.002);
 widths.push({samplesPerArc:n,maximumWidthDeficit:max,rmsWidthDeficit:rms,rigorousChordBound:bound,polygonArea:area,analyticArea:exactArea,areaError});
}
for(let i=1;i<4;i++){const order=Math.log2(widths[i-1].rmsWidthDeficit/widths[i].rmsWidthDeficit);assert(order>1.95&&order<2.05);widths[i].observedWidthOrder=order;}
const vertices=[[0,-1/Math.sqrt(3)],[.5,1/(2*Math.sqrt(3))],[-.5,1/(2*Math.sqrt(3))]];
const wrongStraightWidth=Math.max(...Array.from({length:91},(_,i)=>Math.abs(R.hooks.supportWidth(vertices,i*Math.PI/91)-1)));assert(wrongStraightWidth>.1);
function inspectPacking(circles){
 let overlap=0,tangentMin=Infinity,integer=true;
 for(let i=0;i<circles.length;i++){
  const c=circles[i];integer=integer&&Number.isInteger(c.k)&&Number.isInteger(c.bx)&&Number.isInteger(c.by);
  if(c.k<0)continue;let tangent=0;
  for(let j=0;j<circles.length;j++)if(i!==j){const q=circles[j],distance=Math.hypot(c.x-q.x,c.y-q.y),target=q.k<0?q.r-c.r:q.r+c.r;
   const gap=q.k<0?target-distance:distance-target;overlap=Math.max(overlap,-gap);if(Math.abs(gap)<2e-12)tangent++;
  }
  tangentMin=Math.min(tangentMin,tangent);
 }
 return {maximumOverlap:overlap,minimumTangentNeighbors:tangentMin,integerCurvatureCenters:integer,unfilledArea:1-circles.filter(c=>c.k>0).reduce((v,c)=>v+c.r*c.r,0)};
}
const packings=[];
for(const depth of [3,5,7,10]){
 const p=A.hooks.apollonianPacking(depth,160),check=inspectPacking(p.circles);
 assert(check.maximumOverlap<1e-12&&check.minimumTangentNeighbors>=3&&check.integerCurvatureCenters);assert(check.unfilledArea>0&&check.unfilledArea<.25);
 packings.push({depth,count:p.circles.length,truncated:p.truncated,...check});
}
for(let i=1;i<packings.length;i++)assert(packings[i].unfilledArea<=packings[i-1].unfilledArea);
const bad=A.hooks.apollonianPacking(0,160).circles.map(c=>({...c}));bad[3]={k:8,x:0,y:7/8,r:1/8,bx:0,by:7,g:0};
const wrongSeed=inspectPacking(bad);assert(wrongSeed.minimumTangentNeighbors<3);
const result={scope:'Bounded geometric maps and sampled integral/support/packing checks; no global immersion proof or physical rolling model.',sourceSha256:Object.fromEntries([['hopf',H],['reuleaux',R],['apollonian',A]].map(([id,o])=>[id,crypto.createHash('sha256').update(o.source).digest('hex')])),hopf:{inverseProjectionBaseMaximumError:baseError,links,orientationReversalResidual:Math.abs(forward+reversed),unlinkedPairIntegral:unlinked},reuleaux:{widths,straightTriangleFailure:wrongStraightWidth},apollonian:{packings,incorrectHistoricalSeed:wrongSeed}};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/geometry-science.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
