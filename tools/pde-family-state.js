// Actual maintained instances: prepared presets, guard rollback and export preservation.
// node tools/pde-family-state.js [--write]
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),raw=fs.readFileSync(path.join(root,'src/modules/pde.js'),'utf8'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const marker='        fieldCells()';assert(raw.includes(marker));
const source=raw.replace(marker,`        auditAdvance(n) { return step(n); },
        auditUpload(data) { upload(C.read, data); refreshChem(host.getState()); },
        auditState() {
          const fields = {};
          for (const [name, target] of Object.entries({read:C.read,write:C.write,mu:muT,mid:midT,backup:backupT,guard:guardT})) {
            if (!target) continue;
            const bytes = name === 'guard';
            const values = bytes ? new Uint8Array(target.w*target.h*4) : new Float32Array(target.w*target.h*4);
            gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);
            gl.readPixels(0,0,target.w,target.h,gl.RGBA,bytes?gl.UNSIGNED_BYTE:gl.FLOAT,values);
            if(gl.getError()!==gl.NO_ERROR)throw Error('State readback failed');
            fields[name] = Array.from(bytes ? values : new Uint32Array(values.buffer));
          }
          return {fields,stepCount,guardMessage,reactionMean,meanV,absV,nOff,rampKey};
        },
${marker}`);
(async()=>{
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const rows=[],guards=[];
 try{
  for(const id of['cahn','ohta','amb','swift','ks','pfc']){
   const page=await browser.newPage();await page.goto('file://'+path.join(root,'studio.html')+'#three-vortex-bound/pde-family-state');await page.evaluate(source);
   const moduleRows=await page.evaluate(async id=>{
    const mod=Studio.modules[id],canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    let state,status='';const instance=mod.create({canvas,getState:()=>state,setStatus:s=>{status=s;},reducedMotion:()=>true,isActive:()=>false,fault:msg=>{throw Error(msg);}}),rows=[];
    for(const [key,preset]of [['default',null],...Object.entries(mod.presets)]){
      const pal=preset?.palette||Studio.PALETTES[mod.defaultPalette];
      state={...mod.defaults,...preset?.p,palette:pal.colors,bg:pal.bg,running:false};mod.sanitize(state);
      const warmup=state.warmup;state.warmup=0;instance.regenerate();instance.pause();
      let left=warmup;while(left>0){const n=Math.min(24,left);if(!instance.auditAdvance(n))break;left-=n;}
      const prepared=instance.auditState(),f=new Float32Array(Uint32Array.from(prepared.fields.read).buffer);let lo=Infinity,hi=-Infinity,nonfinite=0,mean=0;
      for(let i=0;i<f.length;i+=4){lo=Math.min(lo,f[i]);hi=Math.max(hi,f[i]);nonfinite+=!Number.isFinite(f[i]);mean+=f[i];}mean/=f.length/4;
      // Ensure the palette/ramp exists before snapshot; exports must preserve all numerical buffers.
      instance.repaint();const before=instance.auditState(),recipe=JSON.stringify(state),prints=[];
      for(const [w,h]of(key==='default'?[[2400,2400],[1200,900]]:[[800,800]])){
        const blob=await instance.exportPNG(w,h),bitmap=await createImageBitmap(blob),after=instance.auditState();
        if(JSON.stringify(before)!==JSON.stringify(after)||recipe!==JSON.stringify(state))throw Error(id+'/'+key+' export changed state');
        prints.push({width:bitmap.width,height:bitmap.height,bytes:blob.size,exactState:true});bitmap.close();
      }
      rows.push({id,preset:key,grid:instance.fieldCells(),requestedPreparation:warmup,completedSteps:prepared.stepCount,dt:state.dt,guard:prepared.guardMessage,range:[lo,hi],mean,initializedMean:prepared.reactionMean,nonfinite,prints});
    }
    instance.pause();return rows;
   },id);rows.push(...moduleRows);await page.close();process.stderr.write(id+' preparations and exports completed\n');
  }
  for(const legacy of[false,true]){
   const page=await browser.newPage();await page.goto('file://'+path.join(root,'studio.html')+'#three-vortex-bound/pde-guard');
   // This mutant disables batch rejection only; sticky flags still expose invalid intermediates.
   const tested=legacy?source.replace('        if (crossedGuard()) {','        if (false && crossedGuard()) {'):source;
   await page.evaluate(tested);
   guards.push(...await page.evaluate(legacy=>{
    const rows=[];
    for(const id of['cahn','ohta','amb','swift','ks','pfc']){
      const mod=Studio.modules[id],pal=Studio.PALETTES[mod.defaultPalette],N=96;
      const state={...mod.defaults,grid:N,warmup:0,running:false,noise:0,palette:pal.colors,bg:pal.bg};mod.sanitize(state);
      const canvas=document.createElement('canvas');canvas.width=N;canvas.height=N;let status='';
      const instance=mod.create({canvas,getState:()=>state,setStatus:s=>{status=s;},reducedMotion:()=>true,isActive:()=>false,fault:msg=>{throw Error(msg);}});instance.regenerate();instance.pause();
      const data=new Float32Array(N*N*4);for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=4*(y*N+x);data[k]=.3+.2*((x+y)%2?1:-1);data[k+3]=1;}instance.auditUpload(data);
      const before=instance.auditState();state.dt=1;const accepted=instance.auditAdvance(id==='ks'?6:3),after=instance.auditState();
      const unchanged=JSON.stringify(before.fields.read)===JSON.stringify(after.fields.read);
      rows.push({id,mode:legacy?'disabled-guard-control':'corrected',accepted,unchanged,steps:after.stepCount,guard:after.guardMessage,visible:status.includes('numerical guard')});instance.pause();
    }
    return rows;
   },legacy));await page.close();
  }
  const blockers=rows.filter(r=>r.guard||r.nonfinite||r.completedSteps!==r.requestedPreparation);
  for(const r of guards){if(r.mode==='corrected')assert(!r.accepted&&r.unchanged&&r.steps===0&&r.visible,r.id+' guard failed');else assert(r.accepted&&!r.unchanged&&r.steps>0,r.id+' disabled-guard control missed');}
  const report={schema:1,date:'2026-09-21',source:{path:'src/modules/pde.js',sha256:hash(raw)},harness:{path:'tools/pde-family-state.js',sha256:hash(fs.readFileSync(__filename))},backend:await browser.version(),scope:'Actual 512-cell default/preset preparations at sanitized dt, noise retained; exact all-buffer/recipe/counter export preservation. Guards injected at 96 cells. Preparation completion is a regression check, not proof of continuum phases.',rows,guards,blockers,passed:blockers.length===0};
  if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/pde-family-state.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  assert.equal(blockers.length,0,'Some shipped preparations hit a guard; retain failures and correct the unsafe setup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
