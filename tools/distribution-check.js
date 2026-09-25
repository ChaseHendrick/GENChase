'use strict';
const { glArgs } = require('./lib/gl-args');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
async function main(){
 const root=path.resolve(__dirname,'..'),zip=path.resolve(process.argv[2]||path.join(root,'tools/dist/release/GENChase-studio.zip')),dir=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-distribution-'));
 execFileSync('python3',['-c',`import zipfile,sys,pathlib
with zipfile.ZipFile(sys.argv[1]) as z:
 for n in z.namelist():
  p=pathlib.PurePosixPath(n)
  assert p.parts[0]=='GENChase' and '..' not in p.parts and not p.is_absolute()
  assert not any(x in n for x in ['/node_modules/','/.git/','/.runs/','/run/validator/'])
 assert z.testzip() is None
 z.extractall(sys.argv[2])`,zip,dir]);
 const home=path.join(dir,'GENChase'),meta=JSON.parse(fs.readFileSync(path.join(home,'VERSION.json')));assert(meta.version&&/^[a-f0-9]{40}$/.test(meta.commit));
 const browser=await chromium.launch({args:glArgs()});
 try{const page=await browser.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort();});
 await page.goto('file://'+path.join(home,'START-HERE.html'));
 const axe=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
 for(const width of[1280,768,390,320]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow '+width);await page.addScriptTag({content:axe});const report=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(report.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);}
 const missing=await page.evaluate(()=>[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));assert.deepEqual(missing,[]);
 await page.setViewportSize({width:1280,height:900});await Promise.all([page.waitForURL(u=>!/START-HERE\.html/.test(String(u))),page.getByRole('link',{name:'Make art now',exact:true}).click()]);await page.waitForFunction(()=>typeof Studio!=='undefined');await page.evaluate(()=>Studio.ready);await page.waitForFunction(()=>Studio.getRecipe()?.technique==='tilings'||Studio.getRecipe()?.id==='tilings');
 await page.selectOption('#export-inches','8');await page.selectOption('#export-dpi','300');await page.locator('#btn-colophon-edit').click();await page.locator('#colo-enabled').uncheck();await page.locator('#colo-close').click();await page.locator('#btn-export').click();await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);const dimensions=await page.locator('#export-img').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));assert.equal(Math.max(dimensions.width,dimensions.height),2400);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,version:meta.version,commit:meta.commit,archiveBytes:fs.statSync(zip).size,offlineArtAndExport:true,export:dimensions,viewports:[1280,768,390,320],automatedAccessibilityViolations:0,networkRequests:requests.length,browser:browser.version()},null,2));
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
