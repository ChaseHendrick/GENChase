// Runtime, cancellation and selected export checks; not scientific validation by themselves.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:1000,height:800}});
 await page.goto('file://'+path.join(root,'dist/studio.html')+'#direct-gravity');
 await page.waitForFunction(()=>document.querySelector('#status').innerText.includes('finished'));
 const r=await page.evaluate(async()=>{
  const def=Studio.modules['direct-gravity'],s={...def.defaults,seed:'stress-fixture',palette:['#f05a35','#69ccff'],bg:'#10131a',count:16384,steps:2,running:false};
  const c=document.createElement('canvas');c.width=900;c.height=900;
  let active=true,status='',budget={cpuSliceMs:8,cpuDelayMs:0};
  const mod=def.create({canvas:c,util:Studio.util,getState:()=>s,computeBudget:()=>budget,setStatus:v=>{status=v;},isActive:()=>active,reducedMotion:()=>false});
  mod.regenerate();const initial=mod.inspect();
  let ticks=0,maxGap=0,last=performance.now();
  const timer=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now;ticks++;},1);
  s.running=true;mod.live('running');
  await new Promise(r=>setTimeout(r,250));
  mod.pause();const pause=mod.inspect();
  await new Promise(r=>setTimeout(r,100)); const later=mod.inspect();
  const pausedStable=JSON.stringify(pause)===JSON.stringify(later);
  // Exporting while paused must preserve the committed snapshot and dimensions.
  const before=JSON.stringify(mod.inspect()),blob=await mod.exportPNG(1600,1000),bitmap=await createImageBitmap(blob),svg=mod.exportSVG(1600,1000);
  const exportStable=before===JSON.stringify(mod.inspect());
  s.count=128;s.steps=8;s.seed='small-fixture';mod.regenerate();mod.resume();
  while(!status.includes('finished')) await new Promise(r=>setTimeout(r,10));
  const fresh=mod.inspect();
  mod.regenerate();while(!status.includes('finished')) await new Promise(r=>setTimeout(r,10));
  const replay=mod.inspect();clearInterval(timer);mod.pause();
  let modesEqual=true;
  for(const mode of [{cpuSliceMs:2,cpuDelayMs:16},{cpuSliceMs:12,cpuDelayMs:0}]){
   budget=mode;mod.regenerate();mod.resume();while(!status.includes('finished'))await new Promise(r=>setTimeout(r,10));
   const value=mod.inspect();modesEqual=modesEqual&&JSON.stringify(value.x)===JSON.stringify(fresh.x)&&JSON.stringify(value.y)===JSON.stringify(fresh.y);mod.pause();
  }

  return {modesEqual,initialCount:initial.count,initialStep:initial.step,pauseStep:pause.step,pausedStable,exportStable,width:bitmap.width,height:bitmap.height,svgCircles:(svg.match(/<circle/g)||[]).length,ticks,maxGap,sliceMax:pause.sliceMax,replayEqual:JSON.stringify(fresh.x)===JSON.stringify(replay.x)&&JSON.stringify(fresh.y)===JSON.stringify(replay.y),replayStep:replay.step};
 });
 assert.equal(r.initialCount,16384);assert.equal(r.initialStep,0);assert(r.pausedStable&&r.exportStable&&r.replayEqual&&r.modesEqual);assert.equal(r.width,1600);assert.equal(r.height,1000);assert.equal(r.svgCircles,16384);assert(r.ticks>10);assert(r.sliceMax<50);assert.equal(r.replayStep,8);
 console.log(JSON.stringify(r,null,2));if(process.argv.includes('--write')) fs.writeFileSync(path.join(root,'validation/results/direct-gravity-browser.json'),JSON.stringify({...r,pass:true,limitations:['Maintained source in the generated portable build; Chromium software rendering on one host. UI responsiveness depends on hardware and OS scheduling.','One 16,384-body partial-force pause/export fixture and deterministic128-body replay, not a large-N accuracy or broad print certification.']},null,2)+'\n');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
