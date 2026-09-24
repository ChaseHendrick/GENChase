'use strict';
const { glArgs } = require('./lib/gl-args');
const assert = require('node:assert/strict'), path = require('node:path');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({args:glArgs()});
 try {
  for (const width of [1280,390,320]) {
   const page = await browser.newPage({viewport:{width,height:800},hasTouch:width<600,isMobile:width<600}), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../dist/studio.html')+'#three-vortex-bound/caption');
   await page.evaluate(()=>Studio.ready);
   await page.evaluate(async()=>{
    Studio.register({id:'caption-fixture',name:'Caption fixture',equation:'x'.repeat(240),palette:true,
     defaults:{value:1.234567891234},schema:[{key:'value',type:'range',min:0,max:2,step:.000001}],
     create(host){const draw=()=>{const c=host.canvas,x=c.getContext('2d');x.fillStyle='#ff00ff';x.fillRect(0,0,c.width,c.height);};return {aspect:()=>.5,regenerate:draw,resize:draw,pause(){},exportPNG:async(w,h)=>{await new Promise(r=>setTimeout(r,800));const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#ff00ff';x.fillRect(0,0,w,h);return Studio.util.toBlob(c);}};}});
    location.hash='caption-fixture/'+ 's'.repeat(200);
   });
   await page.waitForFunction(()=>Studio.getRecipe()?.id==='caption-fixture');
   const recipe=await page.evaluate(()=>JSON.stringify(Studio.getRecipe()));
   await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');
   await page.locator('#btn-colophon-edit').click();
   await page.locator('#colo-enabled').check();
   await page.locator('#expert-print').check();
   for(const mode of ['light','maximum','balanced']){await page.selectOption('#compute-mode',mode);assert.equal(await page.evaluate(()=>Studio.getComputeBudget().mode),mode);}
   await page.selectOption('#compute-mode','maximum');
   if(width===390)await page.screenshot({path:'/tmp/genchase-caption-mobile.png'});
   for (const pos of ['left','right','top','bottom']) {
    await page.selectOption('#colo-position',pos);
    await page.locator('#colo-close').click();
    const geometry=await page.evaluate(()=>{
     const cap=document.querySelector('#colo-preview'),sheet=document.querySelector('#sheet'),art=sheet.querySelector('canvas:not([hidden])');
     const a=art.getBoundingClientRect(),s=sheet.getBoundingClientRect();
     const rows=[...cap.children].map(r=>{const b=r.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};});
     return {a:{left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height},s:{left:s.left,right:s.right,top:s.top,bottom:s.bottom},rows,visible:getComputedStyle(cap).display!=='none'};
    });
    assert(geometry.visible);assert(Math.abs(geometry.a.height/geometry.a.width-.5)<.002);
    for(const r of geometry.rows){assert(r.left>=geometry.s.left-1&&r.right<=geometry.s.right+1,'text inside sheet');assert(r.top>=geometry.s.top-1&&r.bottom<=geometry.s.bottom+1,'text vertical bounds');
     assert(pos==='left'?r.right<=geometry.a.left+1:pos==='right'?r.left>=geometry.a.right-1:pos==='top'?r.bottom<=geometry.a.top+1:r.top>=geometry.a.bottom-1,'caption on chosen side');}
    await page.locator('#btn-export').click();
    assert.equal(await page.locator('#export-colo-edit').isDisabled(),true,'editing locked during export');
    await page.waitForFunction(()=>!document.querySelector('#export-img').hidden && !Studio.exportJob);
    assert.equal(await page.locator('#export-quality').isVisible(),true,'pre-download print report');
    const quality=await page.locator('#export-quality').getAttribute('data-report');assert.equal(JSON.parse(quality).scientificValidation,false);
    const pixels=await page.evaluate(async()=>{
     const img=document.querySelector('#export-img');await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let minX=c.width,minY=c.height,maxX=0,maxY=0;
     for(let y=0;y<c.height;y++)for(let i=0;i<c.width;i++){const k=(y*c.width+i)*4;if(d[k]>245&&d[k+1]<10&&d[k+2]>245){minX=Math.min(minX,i);maxX=Math.max(maxX,i);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
     return {minX,maxX,minY,maxY,w:c.width,h:c.height};
    });
    assert(Math.abs((pixels.maxY-pixels.minY)/(pixels.maxX-pixels.minX)-.5)<.005,'export aspect');
    if(pos==='left')assert(pixels.minX>pixels.w*.25);if(pos==='right')assert(pixels.maxX<pixels.w*.75);
    if(width===1280&&pos==='bottom')for(const ext of ['pdf','tiff']){
     const pending=page.waitForEvent('download');await page.locator('#export-'+ext).click();const download=await pending;
     const data=require('node:fs').readFileSync(await download.path());
     assert(ext==='pdf'?data.subarray(0,5).toString()==='%PDF-':data.subarray(0,4).equals(Buffer.from([73,73,42,0])),'real print download');
    }
    await page.locator('#export-close').click();await page.locator('#btn-colophon-edit').click();
   }
   for(const key of ['title','equation','seed','parameters','palette','print','date']){
    await page.locator('#colo-part-'+key).uncheck();assert.equal(await page.locator('#colo-preview [data-part="'+key+'"]').count(),0);
   }
   await page.locator('#colo-restore').click();
   assert.equal(await page.locator('#colo-part-date').isChecked(),true);
   await page.locator('#colo-part-seed').uncheck();await page.selectOption('#colo-position','right');
   const mobile=await page.evaluate(()=>{const card=document.querySelector('#modal-colophon .card'),r=card.getBoundingClientRect();return {left:r.left,right:r.right,overflow:card.scrollWidth>card.clientWidth+1,close:document.querySelector('#colo-close').getBoundingClientRect().height};});
   assert(mobile.left>=0&&mobile.right<=width&&!mobile.overflow&&mobile.close>=44,'mobile editor bounds');
   await page.locator('#printer-preset-name').fill('Studio printer');await page.locator('#printer-preset-save').click();
   await page.selectOption('#colo-position','left');await page.locator('#printer-preset-load').click();
   assert.equal(await page.locator('#colo-position').inputValue(),'right');
   await page.locator('#colo-close').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-colophon-edit');
   assert.equal(await page.evaluate(()=>JSON.stringify(Studio.getRecipe())),recipe,'caption does not alter recipe');
   await page.reload();await page.evaluate(()=>Studio.ready);await page.locator('#btn-colophon-edit').click();
   assert.equal(await page.locator('#colo-position').inputValue(),'right');assert.equal(await page.locator('#colo-part-seed').isChecked(),false);
   assert.equal(await page.locator('#expert-print').isChecked(),true);assert.equal(await page.locator('#compute-mode').inputValue(),'maximum');
   assert.equal(await page.locator('#printer-preset-list option').count(),1);
   if(width===390){
    for(const viewport of [{width:360,height:780},{width:740,height:720},{width:768,height:1024},{width:1024,height:768},{width:1180,height:820},{width:390,height:800}]){
     await page.setViewportSize(viewport);
     await page.locator('#colo-close').scrollIntoViewIfNeeded();
     const rect=await page.locator('#modal-colophon .card').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=viewport.width+1,'fold/tablet dialog width');
     assert.equal(await page.locator('#expert-print').isChecked(),true,'advanced mode survives folding');
     await page.locator('#colo-close').click();
     await page.waitForTimeout(150);
     assert.equal(await page.locator('#btn-colophon-edit').isVisible(),true);assert.equal(await page.locator('#btn-science-report').isVisible(),true);
     const bounds=await page.locator('#sheet').boundingBox();assert(bounds.width>0&&bounds.x>=-1&&bounds.x+bounds.width<=viewport.width+1,'fold/tablet sheet fits');
     await page.locator('#btn-colophon-edit').click();
    }
   }
   await page.locator('#printer-preset-delete').click();assert.equal(await page.locator('#printer-preset-list option').count(),0);
   assert.deepEqual(errors,[]);await page.close();console.log('Caption checks passed at '+width+' px');
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
