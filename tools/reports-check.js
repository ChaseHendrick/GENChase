'use strict';
const { glArgs } = require('./lib/gl-args');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const records=JSON.parse(fs.readFileSync(path.join(root,'validation/techniques.json'),'utf8'));
let requests=0,failOnce=true;
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+name);
 if(name==='/src/science-reports.json'){requests++;if(failOnce){failOnce=false;res.writeHead(503).end();return;}}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:glArgs()});
 try{
  for(const portable of [false,true]){
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const url=portable?'file://'+path.join(root,'dist/studio.html'):'http://127.0.0.1:'+server.address().port+'/index.html';
   await page.goto(url+'#double-triangle-bound/report');await page.evaluate(()=>Studio.ready);
   if(!portable)assert.equal(requests,0,'no science fetch on first paint');
   await page.locator('#btn-science-report').click();
   if(!portable){await page.getByRole('button',{name:'Retry',exact:true}).click();}
   await page.waitForFunction(()=>document.querySelector('#science-content .science-status'));
   const expected=records.find(r=>r.id==='double-triangle-bound');
   assert.equal(await page.locator('.science-status').innerText(),expected.status);
   assert.match(await page.locator('#science-content').innerText(),/Known limits/);
   assert.equal(await page.locator('#science-content .science-evidence').count(),expected.numerical.length+expected.print.length);
   assert.equal((await page.locator('#science-content').innerText()).includes('No evidence is registered in this category'),!expected.numerical.length||!expected.print.length);
   const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download science report JSON'}).click();const download=await pending;
   const report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
   assert.deepEqual(report.record,expected);
   assert.equal(report.record.id,'double-triangle-bound');assert.equal(report.recipe.id,report.record.id);assert.equal(report.witness.moduleId,report.record.id);
   await page.locator('#science-close').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-science-report');
   await page.evaluate(()=>location.hash='three-vortex-bound/report');await page.waitForFunction(()=>Studio.getRecipe()?.id==='three-vortex-bound');
   await page.locator('#btn-science-report').click();await page.waitForFunction(()=>document.querySelector('#science-content .science-status'));
   assert.match(await page.locator('#science-content').innerText(),/No structured scientific measurement/);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Science reports: lazy fetch, failure/retry, portable data, evidence, unknown measurement, JSON and mobile focus passed.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
