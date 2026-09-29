'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium,webkit}=require('playwright'),{createServer}=require('../apps/validate/server');
(async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-research-')),app=createServer({data,port:0});let browser;
 try{
  const address=await app.listen(),origin='http://127.0.0.1:'+address.port;
  browser=await ({chromium,webkit}[process.env.BROWSER||'chromium']).launch();const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}return route.continue();});
  await page.goto(origin);await page.getByRole('link',{name:'Research notebook',exact:true}).click();await page.waitForSelector('.provider');
  assert.equal(await page.locator('.provider').count(),10);await page.fill('#question','Hopfield & recall?');
  assert.match(await page.locator('.provider').first().getAttribute('href'),/q=Hopfield\+%26\+recall%3F/);
  await page.fill('#title','<img src=x onerror=alert(1)>');await page.fill('#url','javascript:alert(1)');await page.click('#save-source');assert.match(await page.textContent('#error'),/http/);assert.equal(await page.locator('.source').count(),0);
  await page.fill('#url','10.1073/pnas.79.8.2554');await page.selectOption('#read','abstract');await page.fill('#notes','Only the abstract, no proof checked.');await page.click('#save-source');
  assert.equal(await page.locator('.source img').count(),0);assert.equal(await page.locator('.source').count(),1);
  await page.getByRole('button',{name:'Edit <img src=x onerror=alert(1)>',exact:true}).click();await page.fill('#title','Hopfield (1982)');await page.click('#save-source');
  await page.reload();assert.equal(await page.inputValue('#question'),'Hopfield & recall?');assert.equal(await page.locator('.source h3').textContent(),'Hopfield (1982)');
  await page.click('#make-prompt');assert.match(await page.inputValue('#prompt'),/Read: abstract/);assert.match(await page.inputValue('#prompt'),/no proof checked/);
  const download=page.waitForEvent('download');await page.click('#export-json');const file=await(await download).path();const saved=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(saved.sources.length,1);
  await page.getByRole('button',{name:'Remove Hopfield (1982)',exact:true}).click();await page.setInputFiles('#import',file);await page.waitForSelector('.source');assert.equal(await page.locator('.source').count(),1);
  await page.setInputFiles('#import',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":2}')});await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('Import failed'));assert.match(await page.textContent('#error'),/Import failed/);assert.equal(await page.locator('.source').count(),1);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);}
  if(process.env.RESEARCH_SCREENSHOT)await page.screenshot({path:process.env.RESEARCH_SCREENSHOT,fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('Research notebook: real browser edit/reload/import/export, unsafe links/text, mobile layout and zero unsolicited external requests PASS');
 }finally{await browser?.close();await app.close();fs.rmSync(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
