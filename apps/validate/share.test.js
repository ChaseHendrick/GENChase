'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
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
 if(url.endsWith('/git/blobs'))return {sha:crypto.createHash('sha1').update(Buffer.from(body.content,'base64')).digest('hex')};
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

// A minimal JPEG with the segments Chromium's canvas encoder writes: JFIF, an ICC profile, tables, one frame, one scan.
function jpeg(extra=[],w=320,h=320){const seg=(m,b)=>Buffer.concat([Buffer.from([0xFF,m,(b.length+2)>>8,(b.length+2)&255]),b]);
 return Buffer.concat([Buffer.from([0xFF,0xD8]),seg(0xE0,Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0','latin1')),seg(0xE2,Buffer.from('ICC_PROFILE\0\x01\x01','latin1')),...extra,
  seg(0xDB,Buffer.alloc(65)),seg(0xC0,Buffer.from([8,h>>8,h&255,w>>8,w&255,1,1,0x11,0])),seg(0xC4,Buffer.alloc(20)),seg(0xDA,Buffer.from([1,1,0,0,63,0])),Buffer.from([1,2,0xFF,0,3,0xFF,0xD9])]);}
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function artFixture(t,{thumb=jpeg(),seed='h-1',thumbs=['thumbs/c-0001.jpg'],input={workspace:'contribute',mode:'art-hunt',id:'turing'},shareInput=undefined,parentHash=null}={}){
 const f=fixture(t);fs.writeFileSync(path.join(f.dir,'job.json'),JSON.stringify({id,status:'complete',ended:'2026-09-24',exitCode:0,commit:'a'.repeat(40),input}));
 fs.writeFileSync(path.join(f.dir,'browser-report.json'),JSON.stringify({browserVersions:{chromium:'141.0.7390.37'},webglRenderer:'SwiftShader'}));
 const art=path.join(f.dir,'art');for(const d of ['thumbs','prints'])fs.mkdirSync(path.join(art,d),{recursive:true});
 const hash='#turing/'+encodeURIComponent(seed)+'/'+b64({v:2,grid:128,running:false,warmup:300,seed});
 fs.writeFileSync(path.join(art,'thumbs/c-0001.jpg'),thumb);fs.writeFileSync(path.join(art,'thumbs/c-0002.jpg'),jpeg());
 fs.writeFileSync(path.join(art,'share.json'),JSON.stringify({schemaVersion:1,kind:'genchase-art',mode:'art-hunt',id:'turing',input:shareInput,thumbs,records:[{rank:1,index:0,hash,seed,parentHash,steps:300,class:'ok',metrics:{entropy:4.5},thumb:thumbs[0]||null,thumbSha256:crypto.createHash('sha256').update(thumb).digest('hex'),validated:false}]}));
 for(const name of ['candidates.json','checkpoint.json'])fs.writeFileSync(path.join(art,name),'{"secret":"CANDIDATES"}');
 fs.writeFileSync(path.join(art,'gallery.html'),'<p>GALLERY</p>');fs.writeFileSync(path.join(art,'prints/c-0001.png'),'PRINT');
 return {...f,thumb,hash};
}
test('art results share share.json and listed thumbnails byte for byte, never prints, gallery or checkpoint',async t=>{
 const f=artFixture(t),p=pack(f.root,f.data,id),names=p.files.map(x=>x.name);
 for(const name of ['art/share.json','art/thumbs/c-0001.jpg','browser-report.json','manifest.json'])assert(names.includes(name),name);
 for(const bad of ['art/candidates.json','art/checkpoint.json','art/gallery.html','art/prints/c-0001.png','art/thumbs/c-0002.jpg'])assert(!names.includes(bad),bad);
 assert(!JSON.stringify(p.files.filter(x=>!x.binary)).includes('CANDIDATES'));
 const image=p.files.find(x=>x.name==='art/thumbs/c-0001.jpg');assert.equal(image.binary,true);assert.equal(Buffer.from(image.base64,'base64').compare(f.thumb),0);
 const manifest=JSON.parse(p.files.find(x=>x.name==='manifest.json').content).files.find(x=>x.name==='art/thumbs/c-0001.jpg');
 assert.deepEqual(manifest,{name:'art/thumbs/c-0001.jpg',bytes:f.thumb.length,sha256:crypto.createHash('sha256').update(f.thumb).digest('hex'),binary:true},'raw-byte hash and length');
 const m=mock(),s=new Shares(f.root,f.data,m.request);assert.match(s.read(id,'art/thumbs/c-0001.jpg').content,/^JPEG thumbnail, 320 × 320 px/);
 s.start(id,s.preview(id).digest);await s.wait();assert.equal(s.state(id).status,'shared');
 const blob=m.calls.find(c=>c.url.endsWith('/git/blobs'));assert.deepEqual(blob.body,{content:f.thumb.toString('base64'),encoding:'base64'});
 const tree=m.calls.find(c=>c.url.endsWith('/git/trees')).body.tree,entry=tree.find(x=>x.path.endsWith('art/thumbs/c-0001.jpg'));
 assert.equal(entry.content,undefined);assert.match(entry.sha,/^[0-9a-f]{40}$/);assert(tree.find(x=>x.path.endsWith('art/share.json')).content.includes(f.hash));
 const pr=m.calls.find(c=>c.method==='POST'&&c.url.endsWith('/pulls')).body;assert.equal(pr.title,'Art results: turing (art-hunt) '+id);assert.match(pr.body,/not a measure of beauty and not scientific evidence/);assert(!/validated within/.test(pr.body));
 assert.match(m.calls.find(c=>c.url.endsWith('/git/commits')).body.message,/^Record local art results /);
});
test('thumbnails with metadata, private-looking recipes and unlisted paths are refused before upload',t=>{
 const seg=(m,b)=>Buffer.concat([Buffer.from([0xFF,m,(b.length+2)>>8,(b.length+2)&255]),b]);
 for(const [thumb,why] of [[jpeg([seg(0xE1,Buffer.from('Exif\0\0GPS'))]),/not allowed/],[jpeg([seg(0xFE,Buffer.from('made by someone'))]),/not allowed/],[jpeg([],321,10),/exceed/]]){const g=artFixture(t,{thumb});assert.throws(()=>pack(g.root,g.data,id),why);}
 let f=artFixture(t,{seed:'me@example.com'});assert.throws(()=>pack(f.root,f.data,id),/looks private/);
 // A hash keeps its seed percent-encoded and its settings in base64url, where plain redaction sees nothing.
 // The share decodes them and fails closed wherever the recipe is written: job.json, share.json and records.
 const hidden='#turing/me%40example.com',hiddenPayload='#turing/x/'+b64({v:2,seed:'x',bg:'/Users/someone/private'});
 for(const [opts,where] of [[{input:{workspace:'contribute',mode:'art-deep',id:'turing',recipe:hidden}},/job\.json/],[{input:{workspace:'contribute',mode:'art-evolve',id:'turing',parents:['#turing/a',hiddenPayload]}},/job\.json/],
  [{shareInput:{mode:'art-hunt',id:'turing',recipe:hidden}},/share\.json \(its input\)/],[{parentHash:hiddenPayload},/parentHash of record 1/]]){
  f=artFixture(t,opts);assert.throws(()=>pack(f.root,f.data,id),where,JSON.stringify(opts).slice(0,100));assert.throws(()=>pack(f.root,f.data,id),/Nothing was shared/);
 }
 f=artFixture(t,{input:{workspace:'contribute',mode:'art-hunt',id:'turing',recipe:'#turing/base/'+b64({grid:128,warmup:300})},parentHash:'#turing/h-2'});assert.doesNotThrow(()=>pack(f.root,f.data,id),'an ordinary recipe still shares');
 for(const thumbs of [['../job.json'],['prints/c-0001.png'],Array.from({length:13},(_,i)=>'thumbs/c-'+String(i).padStart(4,'0')+'.jpg')]){f=artFixture(t,{thumbs});assert.throws(()=>pack(f.root,f.data,id),/cannot be shared/);}
 f=artFixture(t,{thumbs:['thumbs/c-0009.jpg']});assert.throws(()=>pack(f.root,f.data,id),/missing/);
});
