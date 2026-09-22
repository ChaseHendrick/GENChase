// Isolated UI/UX regression. No user jobs are started and no uploads are made.
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createServer}=require('../apps/validate/server');
(async()=>{const root=path.resolve(__dirname,'..'),data=fs.mkdtempSync(path.join(os.tmpdir(),'validator-ui-')),app=createServer({root,data,port:0});let browser;
try{const address=await app.listen();browser=await chromium.launch();const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const job={id:'2026-09-22T12-00-00-000Z-abcd1234',input:{workspace:'validate',mode:'inventory',shareAutomatically:false},command:'node tools/science.js',status:'complete',started:'2026-09-22T12:00:00Z',ended:'2026-09-22T12:00:01Z',commit:'a'.repeat(40),exitCode:0,artifacts:['hardware.json','result-bundle.tar.gz'],reason:'Command completed.'};
let state={status:'complete',job,elapsed:1,resumeAvailable:false,misses:[{kind:'command-failure',jobId:'previous-run',status:'failed',reason:'Missing browser from an earlier run'}],log:'fixture',submission:{status:'not-shared'}};
await page.route('**/api/state',r=>r.fulfill({json:state}));
await page.route('**/api/share-preview?*',r=>r.fulfill({json:{target:'SharpMeow/GENChase',digest:'abc',files:[{name:'manifest.json',bytes:100}]}}));
await page.route('**/api/share-file?*',r=>r.fulfill({json:{name:'manifest.json',content:'{"sourceSnapshotIncluded":false,"sha256":"fixture"}'}}));
await page.goto('http://127.0.0.1:'+address.port);await page.waitForFunction(()=>document.querySelector('#connection').textContent==='Connected locally');
assert.equal(await page.locator('#status').textContent(),'Run complete','Historical failures do not relabel the current run');
assert.equal(await page.locator('#share-auto').isChecked(),false);
await page.locator('#contribute-tab').click();assert.equal(await page.locator('#workspace-title').textContent(),'Run experiments');await page.locator('#validate-tab').click();
await page.selectOption('#mode','full');assert.match(await page.locator('#job-help').textContent(),/development checks first/);
await page.locator('#share-preview').click();await page.getByRole('button',{name:/manifest.json/}).click();await page.waitForFunction(()=>document.querySelector('#share-content').textContent.includes('sourceSnapshotIncluded'));
state={...state,status:'failed',job:{...job,status:'failed',incomplete:true,exitCode:2}};await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('coverage is incomplete'));
assert.equal(await page.locator('#status').getAttribute('data-state'),'needs-review');
await page.route('**/__axe.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')}));await page.addScriptTag({url:'http://127.0.0.1:'+address.port+'/__axe.js'});const reports=[];
for(const width of [1280,768,390,320]){await page.setViewportSize({width,height:900});
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,'Horizontal overflow at '+width);
const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],'Accessibility at '+width);reports.push({width,violations:result.violations.length,passes:result.passes.length});}
await page.locator('#mode').focus();assert.equal(await page.locator('#mode').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
state={...state,status:'running',job:{...job,id:'active-job',input:{...job.input,mode:'full'},status:'running',ended:null}};await page.waitForFunction(()=>document.querySelector('#mode').value==='full'&&document.querySelector('#mode').disabled);assert.equal(await page.locator('#restart').isDisabled(),true);assert.equal(await page.locator('#stop').isEnabled(),true);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,viewports:reports,navigation:true,sharingPreview:true,oldFailureDistinguished:true,incompleteDistinguished:true,pageErrors:errors},null,2));
}finally{await browser?.close();await app.close();fs.rmSync(data,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
