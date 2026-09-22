// Shared navigation, layout and caption zoom checks in Chromium and WebKit.
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{chromium,webkit}=require('playwright');
(async()=>{
 const name=process.env.BROWSER||'chromium';assert(['chromium','webkit'].includes(name));
 const browser=await ({chromium,webkit}[name]).launch(name==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});
 try{
  for(const width of [1512,1280,1024,768,390]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../dist/studio.html')+'#reuleaux/navigation',{waitUntil:'domcontentloaded'});await page.evaluate(()=>Studio.ready);
   const layout=await page.evaluate(()=>{const bar=document.querySelector('.bar'),p=document.querySelector('#preset'),r=p.getBoundingClientRect(),center=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{barOverflow:bar.scrollWidth>bar.clientWidth+1,presetVisible:center===p,bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,tabsOverflow:document.getElementById('tabs').scrollWidth>document.getElementById('tabs').clientWidth+1};});
   assert(!layout.barOverflow&&!layout.bodyOverflow&&!layout.tabsOverflow&&layout.presetVisible,JSON.stringify({name,width,layout}));
   await page.click('#browse-modules');await page.waitForSelector('#module-browser[open]');await page.locator('[data-filter="query"]').fill('reuleaux');
   assert.equal(await page.locator('.module-card').count(),1);await page.locator('.module-star').click();assert.equal(await page.locator('.module-star').getAttribute('aria-pressed'),'true');
   await page.locator('[data-filter="query"]').fill('');await page.selectOption('[data-filter="favorites"]','yes');assert.equal(await page.locator('.module-card').count(),1);
   await page.selectOption('[data-filter="favorites"]','');await page.selectOption('[data-filter="sort"]','newest');
   const years=await page.locator('.module-card').evaluateAll(cards=>cards.map(c=>{const m=c.querySelector('p').textContent.match(/\b(1\d{3}|20\d{2})\b/);return m?+m[0]:null;}));
   const listed=years.filter(x=>x!==null);assert(listed.every((v,i)=>!i||v<=listed[i-1]),'reference years descend');
   const dialogRecipe=await page.evaluate(()=>JSON.stringify(Studio.getRecipe()));
   await page.locator('.module-open').first().focus();await page.keyboard.press('s');await page.keyboard.press('e');await page.keyboard.press('f');
   assert.equal(await page.evaluate(()=>JSON.stringify(Studio.getRecipe())),dialogRecipe,'shortcuts cannot change art behind a modal');
   assert.equal(await page.locator('#module-browser[open]').count(),1);
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'browse-modules');
   await page.click('#btn-colophon-edit');await page.check('#colo-enabled');await page.click('#colo-close');
   await page.waitForTimeout(200);
   const before=await page.evaluate(()=>{const line=document.querySelector('#colo-preview [data-part]'),a=line.getBoundingClientRect(),c=document.querySelector('canvas.art:not([hidden])').getBoundingClientRect();return {textHeight:a.height,artWidth:c.width,recipe:JSON.stringify(Studio.getRecipe())};});
   await page.click('#view-plus');await page.click('#view-plus');
   const zoom=await page.evaluate(()=>({textHeight:document.querySelector('#colo-preview [data-part]').getBoundingClientRect().height,artWidth:document.querySelector('canvas.art:not([hidden])').getBoundingClientRect().width,recipe:JSON.stringify(Studio.getRecipe())}));
   assert(Math.abs(zoom.textHeight/before.textHeight-1.5625)<.02,'caption grows with artwork');assert(Math.abs(zoom.artWidth/before.artWidth-1.5625)<.02);assert.equal(zoom.recipe,before.recipe);
   await page.click('#view-fit');
   const status=await page.evaluate(()=>{const s=document.querySelector('#status').getBoundingClientRect(),v=document.querySelector('#art-viewport').getBoundingClientRect(),r=document.querySelector('.stage-readout').getBoundingClientRect();return {statusTop:s.top,viewportBottom:v.bottom,readoutTop:r.top};});
   assert(status.statusTop>=status.viewportBottom-1&&status.readoutTop>=status.viewportBottom-1,'measurements have separate layout space');
   if(width===1280||width===390)await page.screenshot({path:'/tmp/genchase-'+name+'-'+width+'.png'});
   await page.emulateMedia({reducedMotion:'reduce'});await page.click('#browse-modules');assert.equal(await page.locator('#module-browser').evaluate(e=>getComputedStyle(e).animationName),'none');
   assert.deepEqual(errors,[]);await page.close();console.log('PASS',name,width,'navigation, layout, caption zoom, measurement separation and reduced motion');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
