'use strict';
const assert=require('node:assert/strict');
function neighbor(i,d,W,H,wrap){const moves=[[1,0],[-1,0],[0,1],[0,-1]],x=i%W+moves[d][0],y=Math.floor(i/W)+moves[d][1];return wrap?((y+H)%H)*W+(x+W)%W:x<0||y<0||x>=W||y>=H?-1:y*W+x;}
// Explicit chronological path deletion, independent of production last-exit arrows.
function reference(W,H,root,wrap,rng){
 const tree=new Set([root]),par=new Array(W*H).fill(-1);let walks=0;
 for(let start=0;start<W*H;start++)if(!tree.has(start)){
  let path=[start];const position=new Map([[start,0]]);
  while(!tree.has(path.at(-1))){const u=path.at(-1);let v;do{v=neighbor(u,Math.floor(rng()*4),W,H,wrap);}while(v<0);walks++;
   if(position.has(v)){const k=position.get(v);for(const cell of path.slice(k+1))position.delete(cell);path=path.slice(0,k+1);}else{position.set(v,path.length);path.push(v);}
  }
  for(let j=0;j<path.length-1;j++){tree.add(path[j]);par[path[j]]=path[j+1];}
 }
 return {par,walks};
}
function inspect(par,W,H,root,wrap){
 assert.equal(par[root],-1);const adjacency=Array.from({length:W*H},()=>[]),edges=[];
 for(let i=0;i<par.length;i++)if(i!==root){const j=par[i];assert(Number.isInteger(j)&&j>=0&&j<par.length&&j!==i);assert([0,1,2,3].some(d=>neighbor(i,d,W,H,wrap)===j));adjacency[i].push(j);adjacency[j].push(i);edges.push([Math.min(i,j),Math.max(i,j)].join(':'));}
 assert.equal(new Set(edges).size,W*H-1);const depth=new Array(W*H).fill(-1),queue=[root];depth[root]=0;
 for(let j=0;j<queue.length;j++)for(const v of adjacency[queue[j]])if(depth[v]<0){depth[v]=depth[queue[j]]+1;queue.push(v);}
 assert.equal(queue.length,W*H);return{depth,maxDepth:Math.max(...depth),edges:edges.sort(),adjacency};
}
function enumerate(W,H,wrap){
 const edges=[];for(let i=0;i<W*H;i++)for(let d=0;d<4;d++){const j=neighbor(i,d,W,H,wrap);if(j>i&&!edges.some(([a,b])=>a===i&&b===j))edges.push([i,j]);}
 const counts=new Map(),marginals=new Array(edges.length).fill(0),n=W*H;
 function visit(at,chosen){if(chosen.length===n-1){const sets=Array.from({length:n},(_,i)=>i),find=x=>sets[x]===x?x:sets[x]=find(sets[x]);for(const k of chosen){const[a,b]=edges[k],u=find(a),v=find(b);if(u===v)return;sets[u]=v;}const key=chosen.map(k=>edges[k].join(':')).sort().join('|');counts.set(key,0);for(const k of chosen)marginals[k]++;return;}
  if(edges.length-at<n-1-chosen.length)return;for(let k=at;k<edges.length;k++)visit(k+1,[...chosen,k]);}
 visit(0,[]);return{edges,counts,marginals:marginals.map(v=>v/counts.size)};
}
const hex=h=>{h=h.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));},rgb=c=>'#'+c.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');
const lin=x=>(x/=255)<=.04045?x/12.92:((x+.055)/1.055)**2.4,srgb=x=>255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055),mix=(a,b,t)=>rgb(hex(a).map((v,i)=>srgb((1-t)*lin(v)+t*lin(hex(b)[i])))),lum=h=>hex(h).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
function geometry(s,par,W,H,root,w,h){
 const {depth,maxDepth,adjacency}=inspect(par,W,H,root,s.topo==='torus'),ink=lum(s.bg)>128?'#141008':'#F5F0E8',P=s.palette.slice(s.shift%s.palette.length).concat(s.palette.slice(0,s.shift%s.palette.length)).map(v=>{for(let k=0;k<8&&Math.abs(lum(v)-lum(s.bg))<30;k++)v=mix(v,ink,.16);return v;}),ramp=t=>{const a=t*(P.length-1),i=Math.min(P.length-2,Math.floor(a));return mix(P[i],P[i+1],a-i);};
 const cell=Math.min(w*(1-2*s.margin)/W,h*(1-2*s.margin)/H),ox=(w-cell*W)/2,oy=(h-cell*H)/2,lw=Math.max(.35,s.weight*cell*.2),groups=[],dots=[],segment=(x,y,a,b)=>[ox+x*cell,oy+y*cell,ox+a*cell,oy+b*cell];
 const edge=i=>{const j=par[i],x=i%W+.5,y=Math.floor(i/W)+.5,a=j%W+.5,b=Math.floor(j/W)+.5;let dx=a-x,dy=b-y;
  if(Math.abs(dx)<=1&&Math.abs(dy)<=1)return segment(x,y,a,b);if(Math.abs(dx)>1)dx=dx>0?-1:1;if(Math.abs(dy)>1)dy=dy>0?-1:1;return [...segment(x,y,x+dx/2,y+dy/2),...segment(a,b,a-dx/2,b-dy/2)];};
 const all=()=>par.flatMap((_,i)=>i===root?[]:edge(i));let path=[];const corners=[0,W-1,(H-1)*W,W*H-1],distance=i=>Math.abs(i%W-root%W)+Math.abs(Math.floor(i/W)-Math.floor(root/W));let start=corners[0];for(const v of corners)if(distance(v)>distance(start))start=v;for(let v=start;v!==root;v=par[v])path.push(v);path.push(root);
 if(s.view==='maze'){
  const seg=[],wall=(x,y,d)=>d===0?segment(x+1,y,x+1,y+1):d===1?segment(x,y,x,y+1):d===2?segment(x,y+1,x+1,y+1):segment(x,y,x+1,y);
  for(let i=0;i<par.length;i++)for(let d=0;d<4;d++){const x=i%W,y=Math.floor(i/W),plain=neighbor(i,d,W,H,false),j=neighbor(i,d,W,H,s.topo==='torus');if(j<0||(!adjacency[i].includes(j)&&(d===0||d===2||plain<0)))seg.push(...wall(x,y,d));}
  groups.push({color:P[0],width:Math.max(.35,s.weight*cell*.16),cap:'square',seg});
 }else if(s.view==='branch'){
  const buckets=Array.from({length:48},()=>[]);for(let i=0;i<par.length;i++)if(i!==root){const t=depth[i]/(maxDepth+1)*s.cycles,k=Math.floor((t-Math.floor(t))*48);buckets[k].push(...edge(i));}buckets.forEach((seg,k)=>{if(seg.length)groups.push({color:ramp((k+.5)/48),width:lw,cap:'round',seg});});
 }else if(s.view==='path'){
  if(s.dim>.02)groups.push({color:mix(s.bg,ink,s.dim),width:lw*.8,cap:'round',seg:all()});const L=path.length-1,M=Math.min(48,L),buckets=Array.from({length:M},()=>[]);path.slice(0,-1).forEach((v,j)=>buckets[Math.floor(j/L*M)].push(...edge(v)));buckets.forEach((seg,k)=>{if(seg.length)groups.push({color:ramp(1-(k+.5)/M),width:lw*2.4,cap:'round',seg});});if(s.mark)dots.push({x:ox+(start%W+.5)*cell,y:oy+(Math.floor(start/W)+.5)*cell,r:Math.max(lw*1.6,cell*.7),color:ramp(1)});
 }else groups.push({color:P[0],width:lw,cap:'round',seg:all()});
 if(s.mark&&s.view!=='maze')dots.push({x:ox+(root%W+.5)*cell,y:oy+(Math.floor(root/W)+.5)*cell,r:Math.max(lw*1.8,cell*.8),color:ink});return{groups,dots,path,depth,maxDepth};
}
module.exports={neighbor,reference,inspect,enumerate,geometry};
