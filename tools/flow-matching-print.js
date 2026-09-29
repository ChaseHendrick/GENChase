'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {glArgs}=require('./lib/gl-args'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({args:glArgs()}),rows=[];
 try{const page=await browser.newPage();await page.goto('file://'+path.resolve(__dirname,'../dist/studio.html')+'#flow-matching/print-check');await page.evaluate(()=>Studio.ready);
 for(const fixture of [{layout:'ring',modes:5,sigma:.24,time:1,trail:1},{layout:'spiral',modes:9,sigma:.2,time:.5,trail:.4},{layout:'line',modes:2,sigma:.3,time:1,trail:0}]){
 const row=await page.evaluate(async fixture=>{
  const mod=Studio.modules['flow-matching'],state={...mod.defaults,...fixture,count:200,steps:64,seed:'flow-print',palette:Studio.PALETTES.ember.colors,bg:Studio.PALETTES.ember.bg};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=600;let text='';const inst=mod.create({canvas,getState:()=>state,setStatus:s=>{text=s;},isActive:()=>true,reducedMotion:()=>true});inst.regenerate();
  const before=await inst.exportData(),words=new Float64Array(before.arrays.trajectories.data),recipe=JSON.stringify(state);
  const blob=await inst.exportPNG(2400,2400),bmp=await createImageBitmap(blob),copy=document.createElement('canvas');copy.width=copy.height=2400;const cx=copy.getContext('2d');cx.drawImage(bmp,0,0);const px=cx.getImageData(0,0,2400,2400).data;let lo=255,hi=0;for(let i=0;i<px.length;i+=4){const v=(px[i]+px[i+1]+px[i+2])/3;lo=Math.min(lo,v);hi=Math.max(hi,v);}bmp.close();
  const svg=await (await inst.exportSVG(2400,2400)).text(),doc=new DOMParser().parseFromString(svg,'image/svg+xml'),after=await inst.exportData();
  const same=a=>a.length===words.length&&a.every((v,i)=>Number.isFinite(v)&&v===words[i]);
  if(!same(after.arrays.trajectories.data)||JSON.stringify(state)!==recipe)throw Error('Export changed state');
  const wrong=new Float64Array(words);wrong[0]+=1;if(same(wrong))throw Error('Mutation escaped');
  const paths=doc.querySelectorAll('path').length,circles=doc.querySelectorAll('circle').length;
  if(paths!==(state.trail>0?state.count:0)||circles!==state.count)throw Error('SVG omitted marks');
  inst.regenerate();if(!same((await inst.exportData()).arrays.trajectories.data))throw Error('Replay differed');
  inst.regenerate();inst.pause();const pausedText=text;
  await new Promise(resolve=>setTimeout(resolve,40));if(text!==pausedText)throw Error('Paused build continued');
  let refused=false;try{await inst.exportData();}catch{refused=true;}if(!refused)throw Error('Partial paused export was accepted');
  inst.resume();if(!same((await inst.exportData()).arrays.trajectories.data))throw Error('Resume differed');
  inst.regenerate();inst.dispose();await new Promise(resolve=>setTimeout(resolve,20));
  let disposedRefused=false;try{await inst.exportData();}catch{disposedRefused=true;}if(!disposedRefused)throw Error('Disposed partial export was accepted');
  return {fixture,width:copy.width,height:copy.height,bytes:blob.size,luminanceRange:hi-lo,paths,circles,finiteWords:words.length,statePreserved:true,deterministicReplay:true,mutationRejected:true,pauseResumeAndDispose:true,status:text};
 },fixture);assert(row.bytes>1000&&row.luminanceRange>12);rows.push(row);
 }
 }finally{await browser.close();}
 const result={scope:'Actual module PNG/SVG exports at2400px for three static recipes; full Float64 trajectory preservation, replay, finite values and vector marks. tools/export.js separately exercises all six actual UI exports.',rows,passed:true,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../src/modules/flow-matching.js'))).digest('hex'),limitations:'Three recipes, one Chrome renderer, no calibrated-color or learned-model claim.'};
 if(process.argv.includes('--write'))fs.writeFileSync(path.resolve(__dirname,'../validation/results/flow-matching-print.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
