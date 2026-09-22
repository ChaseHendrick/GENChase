// Negative controls for the generated-source workflow, isolated from the working tree.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-build-'));
const root=path.resolve(__dirname,'..');
try {
  for(const dir of ['tools','src/modules','src/shared','src/styles','validation'])fs.mkdirSync(path.join(tmp,dir),{recursive:true});
  fs.copyFileSync(path.join(__dirname,'build.js'),path.join(tmp,'tools/build.js'));
  fs.copyFileSync(path.join(__dirname,'registry.js'),path.join(tmp,'tools/registry.js'));
  const put=(p,s)=>fs.writeFileSync(path.join(tmp,p),s);
  const run=(...args)=>cp.spawnSync(process.execPath,['tools/build.js',...args],{cwd:tmp,encoding:'utf8'});
  const moduleInclude='<script>{{include:modules/example.js}}</script>\n';
  const template='<style>{{include:styles/studio.css}}</style>\n<script>{{include:shared/engine.js}}</script>\n'+moduleInclude+'<script>{{include:shared/boot.js}}</script>\n';
  const example="Studio.register({id:'example',name:'Example',familiarity:'rare',defaults:{seed:'fixture'}});\n";
  put('validation/techniques.json','[]');
  put('src/studio.html',template);put('src/modules/example.js',example);
  put('src/shared/engine.js','// fixture shell\n');put('src/shared/boot.js','Studio.boot();');put('src/styles/studio.css','body {}');
  assert.equal(run().status,0);assert.equal(run('--check').status,0);
  assert.equal(fs.readFileSync(path.join(tmp,'dist/studio.html'),'utf8'),'<style>body {}</style>\n<script>// fixture shell\n</script>\n<script>'+example+'</script>\n<script>Studio.boot();</script>\n');
  const folder=fs.readFileSync(path.join(tmp,'index.html'),'utf8');
  assert.match(folder, /href="\.\/src\/styles\/studio.css"/);
  assert.match(folder, /src="\.\/src\/shared\/engine.js"/);
  assert.match(folder, /Studio.boot\(\{manifest: "\.\/src\/module-manifest.json"\}\)/);
  assert.ok(!folder.includes('Studio.register'));
  const manifest=JSON.parse(fs.readFileSync(path.join(tmp,'src/module-manifest.json'),'utf8'));
  assert.equal(manifest.techniques.length,1);assert.equal(manifest.techniques[0].source,'src/modules/example.js');
  for(const file of ['index.html','dist/studio.html','src/module-manifest.json','src/science-reports.json']){
    put(file,'stale');assert.notEqual(run('--check').status,0);assert.equal(run().status,0);
  }
  put('src/studio.html',template+moduleInclude);assert.notEqual(run().status,0);
  put('src/studio.html',template);put('src/modules/_template.js','not executable: template');assert.equal(run().status,0);
  put('src/modules/example.js',example+example);assert.notEqual(run().status,0);
  put('src/modules/example.js',example+"Studio.register({id:'sibling',name:'Sibling'});\n");assert.equal(run().status,0);
  const family=JSON.parse(fs.readFileSync(path.join(tmp,'src/module-manifest.json'),'utf8')).techniques;
  assert.equal(family.length,2);assert.equal(family[0].source,family[1].source);
  put('src/modules/example.js','// no registrations');assert.notEqual(run().status,0);
  put('src/modules/example.js',example);
  put('src/studio.html',template);put('src/modules/orphan.js','');assert.notEqual(run().status,0);
  fs.unlinkSync(path.join(tmp,'src/modules/orphan.js'));
  put('src/studio.html','{{include:../LICENSE}}');assert.notEqual(run().status,0);
  put('src/studio.html',template);put('src/modules/example.js',example+'// {{include:modules/nested.js}}');assert.notEqual(run().status,0);
  put('src/studio.html',template);fs.unlinkSync(path.join(tmp,'src/modules/example.js'));assert.notEqual(run().status,0);
  // Validate science inventory negative controls using a minimal catalog and one real record.
  fs.copyFileSync(path.join(__dirname,'science.js'),path.join(tmp,'tools/science.js'));
  fs.mkdirSync(path.join(tmp,'validation'),{recursive:true});
  const record=JSON.parse(fs.readFileSync(path.join(root,'validation/techniques.json'),'utf8')).find(r=>r.status==='unvalidated');
  const module=JSON.parse(fs.readFileSync(path.join(root,'techniques.json'),'utf8')).techniques.find(r=>r.id===record.id);
  fs.copyFileSync(path.join(root,record.source),path.join(tmp,record.source));
  put('techniques.json',JSON.stringify({techniques:[module]}));
  const records=rows=>put('validation/techniques.json',JSON.stringify(rows));
  const science=()=>cp.spawnSync(process.execPath,['tools/science.js','--write'],{cwd:tmp,encoding:'utf8'});
  records([record]);assert.equal(science().status,0);
  records([]);assert.notEqual(science().status,0);
  records([record,record]);assert.notEqual(science().status,0);
  records([{...record,status:'validated within stated limits'}]);assert.notEqual(science().status,0);
  // Metadata fixtures exercise the evidence gate. They are not scientific results.
  fs.mkdirSync(path.join(tmp,'validation/results'));
  put('tools/benchmark.js','throw Error("Fixture: the inventory must not execute this test");');
  put('validation/results/fixture.json',JSON.stringify({fixture:true,error:1e-8}));
  const evidence={test:'tools/benchmark.js',scope:'One deterministic fixture',criteria:'Absolute error < 1e-6',limitations:'Metadata fixture only',benchmark:'Independent analytic reference for this fixture',failureControl:'Wrong update sign exceeds the tolerance',command:'node tools/benchmark.js',results:'validation/results/fixture.json'};
  const partial={...record,status:'partially validated',numerical:[evidence]};
  const expect=(candidate,passes,reason)=>{
    records([candidate]);const result=science();
    assert.equal(result.status===0,passes,reason+': '+result.stderr);
  };
  expect(partial,true,'Complete partial-evidence metadata is accepted without running its command');
  for(const key of ['benchmark','failureControl','command','results']){
    expect({...partial,numerical:[{...evidence,[key]:undefined}]},false,'Missing '+key);
    expect({...partial,numerical:[{...evidence,[key]:'  '}]},false,'Blank '+key);
  }
  for(const name of ['check','export','recipe','pde-print-state','lint']){
    put('tools/'+name+'.js','// Runtime/export fixture');
    expect({...partial,numerical:[{...evidence,test:'tools/'+name+'.js'}]},false,'Non-numerical harness '+name);
  }
  for(const test of ['tools','../escape.js','tools/../tools/benchmark.js'])expect({...partial,numerical:[{...evidence,test}]},false,'Non-file or noncanonical test path');
  put('validation/results/empty.json','{}');put('validation/results/list.json','[]');put('validation/results/broken.json','{');
  for(const results of ['validation/results','tools/benchmark.js','validation/results/missing.json','validation/results/empty.json','validation/results/list.json','validation/results/broken.json'])expect({...partial,numerical:[{...evidence,results}]},false,'Invalid result artifact '+results);
  const full={...partial,status:'validated within stated limits',print:[{test:'tools/export.js',scope:'Declared print fixture',criteria:'Declared scientific rendering comparison',limitations:'Fixture domain only'}],domain:{parameters:'Amplitude 0.2, duration 1',conditions:'Periodic, unforced initial state',resolution:'64 and 128 cells at fixed physical length',precision:'IEEE float32'},reviewed:'2026-01-01',results:evidence.results};
  expect(full,true,'Complete full-evidence metadata');
  for(const domain of ['unspecified',{},[],{...full.domain,parameters:'TBD'},{...full.domain,precision:'  '}])expect({...full,domain},false,'Missing or placeholder reviewed domain');
  for(const reviewed of ['2026-02-30','2026-13-01','9999-01-01','2026-1-1',''])expect({...full,reviewed},false,'Invalid or future review date');
  expect({...full,results:'tools/benchmark.js'},false,'Unstructured full result artifact');
  expect({...full,print:[]},false,'Full status without print evidence');
  records([record]);fs.appendFileSync(path.join(tmp,record.source),'\n// changed');assert.notEqual(science().status,0);
  console.log('PASS: folder/portable/manifest parity, family mappings, template exclusion and stale/duplicate/missing/path/orphan controls; coverage/source drift, numerical evidence, smoke-test rejection, result artifacts and reviewed-domain/date controls.');
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
