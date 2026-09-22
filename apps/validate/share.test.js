'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Shares,pack}=require('./share');
const id='2026-09-22T12-00-00-000Z-1234abcd';
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'share-test-')),data=path.join(root,'runs'),dir=path.join(data,id);fs.mkdirSync(dir,{recursive:true});t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(dir,'job.json'),JSON.stringify({id,status:'failed',ended:'2026-09-22',exitCode:2,commit:'a'.repeat(40)}));fs.writeFileSync(path.join(dir,'hardware.json'),'{}');fs.writeFileSync(path.join(dir,'miss.json'),JSON.stringify({got:1.234,expected:2,reason:'missing evidence'}));fs.writeFileSync(path.join(dir,'job.log'),'failed at '+root+'/tools/example.js');return {root,data,dir};}
function mock({failPull=false,user='volunteer'}={}){const calls=[],refs=new Map(),prs=[];let failure=failPull;return {calls,request:async(method,url,body)=>{
 calls.push({method,url,body});
 if(url==='user')return {login:user};
 if(url.includes('/pulls?'))return prs;
 if(url==='repos/'+user+'/GENChase'&&user!=='SharpMeow')return {full_name:user+'/GENChase',fork:true,parent:{full_name:'SharpMeow/GENChase'}};
 if(url==='repos/SharpMeow/GENChase')return {default_branch:'main'};
 if(url.includes('/git/ref/')){if(refs.has(url.split('/heads/')[1]))return {};const e=Error('missing');e.status=404;throw e;}
 if(url.endsWith('/commits/main'))return {sha:'base',commit:{tree:{sha:'base-tree'}}};
 if(url.endsWith('/git/trees'))return {sha:'tree'};
 if(url.endsWith('/git/commits'))return {sha:'commit'};
 if(url.endsWith('/git/refs')){refs.set(body.ref.replace('refs/heads/',''),true);return {};}
 if(url.endsWith('/pulls')){const pr={html_url:'https://github.com/SharpMeow/GENChase/pull/999'};prs.push(pr);if(failure){failure=false;throw Error('network interrupted after server accepted');}return pr;}
 throw Error('unexpected '+url);
 }};}
test('package includes failures and numeric data, redacts paths, excludes source and archives',t=>{
 const f=fixture(t);fs.mkdirSync(path.join(f.dir,'source'));fs.writeFileSync(path.join(f.dir,'source','secret.json'),'SECRET');fs.writeFileSync(path.join(f.dir,'result-bundle.tar.gz'),'SECRET');fs.mkdirSync(path.join(f.dir,'outputs/validation/results'),{recursive:true});fs.writeFileSync(path.join(f.dir,'outputs/validation/results/test.json'),'{"error":0.0000001}');
 const p=pack(f.root,f.data,id);assert(!JSON.stringify(p.files).includes('SECRET'));assert(!JSON.stringify(p.files).includes(f.root));assert(p.files.some(x=>x.name==='miss.json'));assert.equal(JSON.parse(p.files.find(x=>x.name==='miss.json').content).got,1.234);assert(p.files.some(x=>x.name.endsWith('test.json')));
});
test('reject active jobs, traversal, symlinks, malformed reports, oversize results and stale review',t=>{
 const f=fixture(t),s=new Shares(f.root,f.data);assert.throws(()=>pack(f.root,f.data,'../../etc'));
 fs.symlinkSync('/etc/hosts',path.join(f.dir,'witnesses.json'));assert.throws(()=>pack(f.root,f.data,id),/Unsafe/);fs.unlinkSync(path.join(f.dir,'witnesses.json'));
 const p=s.preview(id);fs.appendFileSync(path.join(f.dir,'job.log'),'changed');assert.throws(()=>s.start(id,p.digest),/changed/);
 fs.writeFileSync(path.join(f.dir,'witnesses.json'),'invalid');assert.throws(()=>s.preview(id));fs.unlinkSync(path.join(f.dir,'witnesses.json'));
 fs.writeFileSync(path.join(f.dir,'job.log'),'x'.repeat(8*1024*1024+1));assert.throws(()=>s.preview(id),/8 MB/);fs.writeFileSync(path.join(f.dir,'job.log'),'');
 fs.writeFileSync(path.join(f.dir,'job.json'),'{"status":"running"}');assert.throws(()=>s.preview(id),/finish/);
});
test('successful submission preserves failures, base tree, and avoids duplicates',async t=>{
 const f=fixture(t),m=mock(),s=new Shares(f.root,f.data,m.request),p=s.preview(id);s.start(id,p.digest);s.start(id,p.digest);await s.wait();assert.equal(s.state(id).status,'shared');const count=m.calls.length;s.start(id,p.digest);assert.equal(m.calls.length,count);
 const tree=m.calls.find(c=>c.url.endsWith('/git/trees')).body;assert.equal(tree.base_tree,'base-tree');assert(tree.tree.some(f=>f.path.endsWith('miss.json')));assert(m.calls.find(c=>c.url.endsWith('/pulls')).body.body.includes('exit: 2'));
});
test('ambiguous accepted PR creation recovers existing submission after restart',async t=>{
 const f=fixture(t),m=mock({failPull:true});let s=new Shares(f.root,f.data,m.request);const p=s.preview(id);s.start(id,p.digest);await s.wait();assert.equal(s.state(id).status,'failed');s=new Shares(f.root,f.data,m.request);s.start(id,p.digest);await s.wait();assert.equal(s.state(id).status,'shared');assert.equal(m.calls.filter(c=>c.method==='POST'&&c.url.endsWith('/pulls')).length,1);
});
test('missing credentials and unrelated forks cannot mutate remote state',async t=>{
 const f=fixture(t);let s=new Shares(f.root,f.data,async()=>{throw Error('Sign in first');});s.start(id,s.preview(id).digest);await s.wait();assert.equal(s.state(id).status,'failed');
 const calls=[];s=new Shares(f.root,f.data,async(m,u)=>{calls.push(m);return u==='user'?{login:'someone'}:{full_name:'someone/GENChase',fork:false};});s.start(id,s.preview(id).digest);await s.wait();assert.equal(s.state(id).status,'failed');assert(!calls.includes('POST'));
});
test('interrupted receipt offers retry and never reports success',t=>{const f=fixture(t),s=new Shares(f.root,f.data);s.save(id,{status:'uploading'});assert.equal(s.state(id).status,'interrupted');});
test('public submission endpoints require local session token and exact reviewed digest',async t=>{
 const {createServer}=require('./server');const f=fixture(t);fs.writeFileSync(path.join(f.root,'techniques.json'),'{"techniques":[]}');const m=mock(),app=createServer({root:f.root,data:f.data,port:0,shareRequest:m.request});
 try {const address=await app.listen(),url='http://127.0.0.1:'+address.port;
 assert.equal((await fetch(url+'/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 const headers={'X-Validator-Token':app.token,'Content-Type':'application/json'};
 assert.equal((await fetch(url+'/api/share',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'})).status,403);
 const preview=await (await fetch(url+'/api/share-preview?job='+id,{headers})).json();
 assert.equal((await fetch(url+'/api/share',{method:'POST',headers,body:JSON.stringify({job:id,digest:'wrong'})})).status,400);assert.equal(m.calls.length,0);
 assert.equal((await fetch(url+'/api/share',{method:'POST',headers,body:JSON.stringify({job:id,digest:preview.digest})})).status,200);await app.shares.wait();assert.equal(app.shares.state(id).status,'shared');
 }finally{await app.close();}
});
test('automatic sharing is per-run opt-in and completes after a failed job with misses',async t=>{
 const cp=require('node:child_process'),{createServer}=require('./server');const root=fs.mkdtempSync(path.join(os.tmpdir(),'share-auto-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'tools'));fs.writeFileSync(path.join(root,'tools/science.js'),'console.log("missing benchmark");process.exitCode=2;');fs.writeFileSync(path.join(root,'techniques.json'),'{"techniques":[]}');cp.execFileSync('git',['init','-q'],{cwd:root});cp.execFileSync('git',['add','.'],{cwd:root});cp.execFileSync('git',['-c','user.name=Chaos','-c','user.email=326338179+SharpMeow@users.noreply.github.com','commit','-qm','Fixture'],{cwd:root});
 const m=mock(),app=createServer({root,port:0,shareRequest:m.request}),input={workspace:'validate',mode:'inventory',power:{mode:'maximum',pauseOnBattery:false,thermalPause:false}};
 try {await app.listen();app.jobs.start(input);await app.jobs.wait();await app.shares.wait();assert.equal(m.calls.length,0);
 app.jobs.start({...input,shareAutomatically:true});await app.jobs.wait();await app.shares.wait();assert.equal(app.jobs.current.exitCode,2);assert.equal(app.shares.state(app.jobs.current.id).status,'shared');const tree=m.calls.find(c=>c.url.endsWith('/git/trees')).body.tree;assert(tree.some(x=>x.path.includes('/misses/')));assert(tree.some(x=>x.path.endsWith('/miss.json')));
 }finally{await app.close();}
});
