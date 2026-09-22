'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const viewport of [{width:390,height:844},{width:740,height:720},{width:1024,height:768}]){
  const p=await b.newPage({viewport,hasTouch:true,isMobile:true});await p.goto('file://'+path.resolve(__dirname,'../dist/studio.html')+'#three-vortex-bound/art-only');await p.evaluate(()=>Studio.ready);
  await p.locator('#btn-colophon-edit').click();await p.locator('#colo-enabled').check();await p.locator('#colo-close').click();
  const recipe=await p.evaluate(()=>JSON.stringify(Studio.getRecipe()));
  await p.locator('#btn-art-only').tap();await p.waitForTimeout(2300);
  assert.equal(await p.locator('.app.focus-quiet').count(),1);
  for(const selector of ['.bar','.side','.status','.witness','.viewpad','#btn-science-report','#colo-preview'])assert.equal(await p.locator(selector).first().isVisible(),false,selector+' hidden');
  assert.equal(await p.locator('#btn-exit-focus').evaluate(el=>getComputedStyle(el).opacity),'0');
  await p.touchscreen.tap(viewport.width/2,viewport.height/2);await p.locator('#btn-exit-focus').tap();
  assert.equal(await p.locator('.app.focus').count(),0);assert.equal(await p.locator('#colo-preview').isVisible(),true);
  assert.equal(await p.evaluate(()=>JSON.stringify(Studio.getRecipe())),recipe,'art-only tap does not change recipe');
  await p.locator('#btn-art-only').tap();await p.keyboard.press('Escape');assert.equal(await p.locator('.app.focus').count(),0);
  await p.close();
 }
 console.log('Art-only: touch reveal/exit, keyboard exit and caption restoration passed on phone/fold/tablet layouts.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
