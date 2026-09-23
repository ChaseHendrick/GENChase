'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {command}=require('./commands'),{Jobs}=require('./jobs'),{createServer}=require('./server'),{reason,settings}=require('./power'),{checkpoint}=require('./checkpoint'),{sweep}=require('./contribute'),{literature,restrained}=require('./literature');
function fixture(script='console.log("FIXTURE completed");'){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-validator-test-'));fs.mkdirSync(path.join(root,'tools'));fs.writeFileSync(path.join(root,'tools/science.js'),script);fs.writeFileSync(path.join(root,'techniques.json'),JSON.stringify({techniques:[{id:'fixture'}]}));
 cp.execFileSync('git',['init','-q'],{cwd:root});cp.execFileSync('git',['add','.'],{cwd:root});cp.execFileSync('git',['-c','user.name=Chaos','-c','user.email=326338179+SharpMeow@users.noreply.github.com','commit','-qm','Create test fixture.'],{cwd:root});return root;
}
const jsString=v=>JSON.stringify(String(v)).replace(/[<>\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const power={mode:'maximum',pauseOnBattery:false,thermalPause:false};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,limit=12000){const start=Date.now();while(!fn()){if(Date.now()-start>limit)throw Error('Condition timed out');await sleep(30);}}
test('command allowlist rejects injection and defaults to full evidence',()=>{
 const root=fixture();try{
  assert.equal(command(root,{workspace:'validate'}).display,'node tools/verify.js --print --all');
  for(const input of [{workspace:'validate',mode:'plate',id:'fixture; touch /tmp/oops'},{workspace:'validate',mode:'shell'},{workspace:'validate',command:'whoami'},{workspace:'contribute',mode:'derive',slug:'../bad'},{workspace:'contribute',mode:'metal',grid:999}])assert.throws(()=>command(root,input));
  assert.equal(command(root,{workspace:'validate',mode:'plate',id:'fixture'}).args.at(-1),'12000');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('job persists log, actual exit code, source snapshot and portable bundle',async()=>{
 const root=fixture('console.log("FIXTURE began",process.env.GENCHASE_MACHINE_SLUG);require("fs").writeFileSync("result.txt","measured fixture");process.exitCode=2;');const data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-jobs-')),jobs=new Jobs(root,data);
 try{jobs.start({workspace:'validate',mode:'inventory',power,machineSlug:'lab-fixture'});await jobs.wait();assert.equal(jobs.current.status,'failed');assert.equal(jobs.current.exitCode,2);assert.match(jobs.tail.join('\n'),/FIXTURE began lab-fixture/);assert(jobs.current.filesWritten.some(x=>x.path==='result.txt'));const dir=path.join(data,jobs.current.id);assert.match(fs.readFileSync(path.join(dir,'paste-packet.md'),'utf8'),/FIXTURE began/);assert(fs.existsSync(path.join(dir,'result-bundle.tar.gz')));const list=cp.execFileSync('tar',['-tzf',path.join(dir,'result-bundle.tar.gz')],{encoding:'utf8'});assert.match(list,/source\/tools\/science.js/);assert.match(list,/outputs\/result.txt/);const unpack=require('node:zlib').gunzipSync(fs.readFileSync(path.join(dir,'result-bundle.tar.gz')));for(let at=0;at+512<=unpack.length;){const header=unpack.subarray(at,at+512);if(header.every(v=>v===0))break;assert.equal(header.subarray(265,297).toString().replace(/\0/g,''),'');assert.equal(header.subarray(297,329).toString().replace(/\0/g,''),'');assert.equal(parseInt(header.subarray(108,116).toString(),8),0);assert.equal(parseInt(header.subarray(116,124).toString(),8),0);const size=parseInt(header.subarray(124,136).toString(),8)||0;at+=512+Math.ceil(size/512)*512;}assert.equal(new Jobs(root,data).current.exitCode,2);
 }finally{jobs.stop();await jobs.wait();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(data,{recursive:true,force:true});}
});
test('Stop kills grandchildren and Restart permits only one process group',async()=>{
 const root=fixture('const cp=require("child_process"),fs=require("fs");const p=cp.spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});fs.writeFileSync("grandchild.pid",String(p.pid));setInterval(()=>{},1000);');const data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-jobs-')),jobs=new Jobs(root,data);
 try{jobs.start({workspace:'validate',mode:'inventory',power});assert.throws(()=>jobs.start({workspace:'validate',mode:'inventory'}),/already running/);await until(()=>fs.existsSync(path.join(root,'grandchild.pid')));const pid=Number(fs.readFileSync(path.join(root,'grandchild.pid')));jobs.stop();await jobs.wait();assert.equal(jobs.current.status,'failed');assert.equal(jobs.current.reason,'Stopped by user.');await until(()=>{try{process.kill(pid,0);return false;}catch{return true;}});fs.unlinkSync(path.join(root,'grandchild.pid'));await jobs.restart();await until(()=>fs.existsSync(path.join(root,'grandchild.pid')));jobs.stop();await jobs.wait();
 }finally{jobs.stop();await jobs.wait();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(data,{recursive:true,force:true});}
});
test('HTTP is loopback only with origin, token and artifact traversal checks',async()=>{
 const root=fixture(),data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-http-')),app=createServer({root,data,port:0});
 try{const address=await app.listen();assert.equal(address.address,'127.0.0.1');const url='http://127.0.0.1:'+address.port;
  assert.equal((await fetch(url+'/api/start',{method:'POST',body:'{}'})).status,403);
  assert.equal((await fetch(url+'/api/state',{headers:{Origin:'https://example.org','X-Validator-Token':app.token}})).status,403);
  const headers={'Content-Type':'application/json','X-Validator-Token':app.token};
  assert.equal((await fetch(url+'/api/start',{method:'POST',headers,body:JSON.stringify({workspace:'validate',mode:'inventory',power})})).status,200);await app.jobs.wait();
  assert.equal((await fetch(url+'/api/artifact?job=../../etc&name=passwd',{headers})).status,400);
  assert.equal((await fetch(url+'/api/state',{headers})).status,200);
  assert.throws(()=>createServer({root,data,port:0}),/already owns/);
 }finally{await app.close();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(data,{recursive:true,force:true});}
});
test('checkpoint skips only exact unchanged contexts',()=>{
 const root=fixture(),file=path.join(os.tmpdir(),'genchase-cp-'+process.pid+'.json');const saved=process.env.GENCHASE_CHECKPOINT_ROOT;delete process.env.GENCHASE_CHECKPOINT_ROOT;
 try{let c=checkpoint(root,{id:'fixture'},file);assert(!c.has('tools/science.js'));c.mark('tools/science.js');assert(checkpoint(root,{id:'fixture'},file).has('tools/science.js'));fs.appendFileSync(path.join(root,'tools/science.js'),'\n// changed');assert(!checkpoint(root,{id:'fixture'},file).has('tools/science.js'));assert(!checkpoint(root,{id:'different'},file).has('tools/science.js'));
 }finally{if(saved!==undefined)process.env.GENCHASE_CHECKPOINT_ROOT=saved;fs.rmSync(file,{force:true});fs.rmSync(root,{recursive:true,force:true});}
});
test('power policy responds to battery, heat, unavailable telemetry and duty',()=>{
 const p=settings({mode:'balanced'});assert.match(reason(p,{thermal:'critical',onBattery:false},0),/Thermal/);assert.match(reason(p,{thermal:'nominal',onBattery:true},0),/battery/);assert.match(reason(p,{thermal:'unknown'},0),/unavailable/);assert.equal(reason(p,{thermal:'nominal',onBattery:false},.25),null);assert.equal(reason(p,{thermal:'nominal',onBattery:false},.75),'Duty-cycle rest');assert.throws(()=>settings({mode:'invalid'}));
});
test('candidate recovery and literature search retain unconfirmed priority',()=>{
 const result=sweep({n:5,samples:200});assert(result.passed);assert(result.knownFormulaError<1e-10);assert(result.badFormulaRelativeError>.001);
 const root=path.resolve(__dirname,'../..'),review=literature(root,5);assert.equal(review.sources[0].file,'RESEARCH.md');assert.equal(review.classification,'matches known source');assert.equal(review.priority,'unconfirmed');assert(review.queries.length);assert(!restrained('new law; first discovery; never been theorized; novel: true').includes('first discovery'));
});
test('damaged checkpoints restart and bounded tails do not read an overnight log in full',()=>{
 const root=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-checkpoint-')),file=path.join(dir,'checkpoint.json');
 try {
  const c=checkpoint(root,{id:'fixture'},file);c.mark('tools/science.js');
  const old=JSON.parse(fs.readFileSync(file));old.completed.push('tools/never-run.js');fs.writeFileSync(file,JSON.stringify(old));
  assert(!checkpoint(root,{id:'fixture'},file).has('tools/never-run.js'));
  fs.writeFileSync(file,'{"format":');assert(!checkpoint(root,{id:'fixture'},file).has('tools/science.js'));
  const log=path.join(dir,'large.log'),fd=fs.openSync(log,'w');fs.writeSync(fd,'FIRST\n');fs.writeSync(fd,'\nLAST readable line\n',64*1024*1024);fs.closeSync(fd);
  const {logTail}=require('./jobs'),tail=logTail(log);assert(tail.join('\n').includes('LAST readable line'));assert(!tail.join('\n').includes('FIRST'));assert(tail.join('\n').length<=200000);
 }finally{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(dir,{recursive:true,force:true});}
});
test('sweep resumes identical data and rejects invalid or truncated checkpoint data',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-sweep-')),old=process.env.GENCHASE_JOB_DIR;process.env.GENCHASE_JOB_DIR=dir;
 try {
  const first=sweep({n:3,samples:200}),file=path.join(dir,'derive-checkpoint.json');assert.deepEqual(sweep({n:3,samples:200}),first);
  const {seal}=require('./checkpoint');const saved=JSON.parse(fs.readFileSync(file));delete saved.checksum;saved.done=201;fs.writeFileSync(file,JSON.stringify(seal(saved)));assert.deepEqual(sweep({n:3,samples:200}),first);
  fs.writeFileSync(file,'{');assert.deepEqual(sweep({n:3,samples:200}),first);
 }finally{if(old===undefined)delete process.env.GENCHASE_JOB_DIR;else process.env.GENCHASE_JOB_DIR=old;fs.rmSync(dir,{recursive:true,force:true});}
});
test('strict power preferences persist into restart and checkpoints only copy on resume',async()=>{
 for(const value of ['false',0,null])assert.throws(()=>settings({pauseOnBattery:value}),/booleans/);
 assert.throws(()=>settings({thermalPause:'true'}),/booleans/);
 const root=fixture('const fs=require("fs"),path=require("path");const f=path.join(process.env.GENCHASE_JOB_DIR,"verify-checkpoint.json");console.log(fs.existsSync(f)?"RESUMED":"FRESH");fs.writeFileSync(f,"{}");'),data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-resume-')),jobs=new Jobs(root,data);
 try {
  jobs.start({workspace:'validate',mode:'inventory',power});await jobs.wait();
  const updated={...power,mode:'light'};jobs.updatePower(updated);assert.deepEqual(new Jobs(root,data).lastInput.power,updated);
  const prior=jobs.current.id;await jobs.resume();await jobs.wait();assert.equal(jobs.current.resumedFrom,prior);assert.match(jobs.tail.join('\n'),/RESUMED/);assert.deepEqual(jobs.current.input.power,updated);
  await jobs.restart();await jobs.wait();assert.equal(jobs.current.resumedFrom,null);assert.match(jobs.tail.join('\n'),/FRESH/);
 }finally{jobs.stop();await jobs.wait();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(data,{recursive:true,force:true});}
});
test('normal completion cleans up a TERM-ignoring descendant holding the log pipe',async()=>{
 const descendant='process.on("SIGTERM",()=>{});console.log("READY");setInterval(()=>{},1000)';
 const root=fixture(`const cp=require("child_process"),fs=require("fs");const p=cp.spawn(process.execPath,["-e",${JSON.stringify(descendant)}],{stdio:["ignore","inherit","inherit"]});fs.writeFileSync("grandchild.pid",String(p.pid));p.unref();setTimeout(()=>process.exit(0),200);`),data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-orphan-')),jobs=new Jobs(root,data);
 try {jobs.start({workspace:'validate',mode:'inventory',power});await until(()=>!jobs.active());const pid=Number(fs.readFileSync(path.join(root,'grandchild.pid')));await until(()=>{try{process.kill(pid,0);return false;}catch{return true;}});assert.equal(jobs.current.exitCode,0);
 }finally{jobs.stop();await jobs.wait();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(data,{recursive:true,force:true});}
});
test('server death stops even a SIGSTOP-paused process group',async()=>{
 const root=fixture('require("fs").writeFileSync("running",String(process.pid));setInterval(()=>{},1000);'),data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-watchdog-'));
 const launcher=`const {Jobs}=require(${JSON.stringify(path.join(__dirname,'jobs.js'))});const jobs=new Jobs(${JSON.stringify(root)},${JSON.stringify(data)});jobs.start({workspace:'validate',mode:'inventory',power:${JSON.stringify(power)}});require('fs').writeFileSync(${JSON.stringify(path.join(data,'group.pid'))},String(jobs.child.pid));setInterval(()=>{},1000);`;
 const parent=cp.spawn(process.execPath,['-e',launcher],{stdio:'ignore'});let group;
 try {await until(()=>fs.existsSync(path.join(root,'running')));group=Number(fs.readFileSync(path.join(data,'group.pid')));process.kill(-group,'SIGSTOP');parent.kill('SIGKILL');await until(()=>{try{process.kill(-group,0);return false;}catch{return true;}},10000);const restored=new Jobs(root,data);assert.equal(restored.current.status,'failed');assert.equal(restored.misses()[0].kind,'interrupted-run');assert(restored.current.hardware);
 }finally{parent.kill('SIGKILL');if(group){try{process.kill(-group,'SIGKILL');}catch{}}fs.rmSync(root,{recursive:true,force:true});fs.rmSync(data,{recursive:true,force:true});}
});
test('finished jobs persist redacted logs, hardware cards and explicit execution misses',async()=>{
 const root=fixture('console.log("fixture");'),data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-private-'));
 fs.writeFileSync(path.join(root,'tools/science.js'),`process.stdout.write(${jsString(root+'/sensitive.js error somebody@example.com 192.168.1.2')} .slice(0,12));setTimeout(()=>{process.stdout.write(${jsString(root+'/sensitive.js error somebody@example.com 192.168.1.2')} .slice(12)+"\\n");process.exitCode=2;},20);`);
 const jobs=new Jobs(root,data);
 try {
  jobs.start({workspace:'validate',mode:'inventory',power});await jobs.wait();
  const dir=path.join(data,jobs.current.id),log=fs.readFileSync(path.join(dir,'job.log'),'utf8'),card=JSON.parse(fs.readFileSync(path.join(dir,'hardware.json'),'utf8'));
  assert(!log.includes(root));assert(!log.includes('somebody@example.com'));assert(!log.includes('192.168.1.2'));assert.match(log,/~\/GENChase\/sensitive.js/);
  assert.equal(card.machineSlug,'m1pro');assert.equal(card.exitCode,2);assert.equal(card.commit,jobs.current.commit);assert(card.elapsedSeconds>=0);
  const misses=jobs.state().misses;assert.equal(misses.length,1);assert.equal(misses[0].kind,'command-failure');assert.equal(misses[0].recipeHash,null);assert.match(misses[0].expected,/not a scientific claim/);assert.equal(misses[0].hardwareCard.exitCode,2);
  assert(Number.isFinite(new Jobs(root,data).state().elapsed));
 }finally{jobs.stop();await jobs.wait();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(data,{recursive:true,force:true});}
});

test('a second server cannot alter metadata for a live job',async()=>{
 const root=fixture('setInterval(()=>{},1000);'),data=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-lock-')),app=createServer({root,data,port:0});
 try {await app.listen();app.jobs.start({workspace:'validate',mode:'inventory',power});assert.throws(()=>createServer({root,data,port:0}),/already owns/);assert.equal(JSON.parse(fs.readFileSync(path.join(data,app.jobs.current.id,'job.json'))).status,'running');}
 finally {await app.close();fs.rmSync(root,{recursive:true,force:true});fs.rmSync(data,{recursive:true,force:true});}
});
test('detached groups retain verified child identity after their leader exits and reject reused PIDs',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-process-tree-')),file=path.join(dir,'groups.json'),{collect}=require('./process-tree');
 const leader={pid:10,parent:2,group:10,started:'root-start'},browser={pid:20,parent:10,group:20,started:'browser-start'},renderer={pid:21,parent:20,group:20,started:'renderer-start'};
 try {
  assert(collect(10,file,[leader,browser,renderer]).some(g=>g.pid===20));
  const orphan={...renderer,parent:1};assert(collect(10,file,[leader,orphan]).some(g=>g.pid===20));
  assert(!collect(10,file,[leader,{...orphan,started:'different-process-start'}]).some(g=>g.pid===20));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('checkpoint context changes when installed browser revision metadata changes',()=>{
 const root=fixture(),pkg=path.join(root,'node_modules/playwright-core'),file=path.join(os.tmpdir(),'genchase-browser-context-'+process.pid+'.json');
 try {
  fs.mkdirSync(pkg,{recursive:true});fs.writeFileSync(path.join(root,'.gitignore'),'node_modules/\n');fs.writeFileSync(path.join(pkg,'package.json'),JSON.stringify({name:'playwright-core',version:'1.2.3'}));fs.writeFileSync(path.join(pkg,'browsers.json'),JSON.stringify({browsers:[{name:'chromium',revision:'100'}]}));
  const c=checkpoint(root,{id:'fixture'},file);c.mark('tools/science.js');assert(checkpoint(root,{id:'fixture'},file).has('tools/science.js'));
  fs.writeFileSync(path.join(pkg,'browsers.json'),JSON.stringify({browsers:[{name:'chromium',revision:'101'}]}));assert(!checkpoint(root,{id:'fixture'},file).has('tools/science.js'));
 }finally{fs.rmSync(file,{force:true});fs.rmSync(root,{recursive:true,force:true});}
});
