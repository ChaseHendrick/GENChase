// Negative controls for the generated-source workflow, isolated from the working tree.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-build-'));
const root=path.resolve(__dirname,'..');
try {
  for(const dir of ['tools','src/modules','src/shared','src/styles'])fs.mkdirSync(path.join(tmp,dir),{recursive:true});
  fs.copyFileSync(path.join(__dirname,'build.js'),path.join(tmp,'tools/build.js'));
  const put=(p,s)=>fs.writeFileSync(path.join(tmp,p),s);
  const run=(...args)=>cp.spawnSync(process.execPath,['tools/build.js',...args],{cwd:tmp,encoding:'utf8'});
  const template='<script>{{include:modules/example.js}}</script>\n';
  put('src/studio.html',template);put('src/modules/example.js','const x = 1;\n');
  assert.equal(run().status,0);assert.equal(run('--check').status,0);
  assert.equal(fs.readFileSync(path.join(tmp,'studio.html'),'utf8'),'<script>const x = 1;\n</script>\n');
  put('studio.html','stale');assert.notEqual(run('--check').status,0);
  put('src/studio.html',template+template);assert.notEqual(run().status,0);
  put('src/studio.html',template);put('src/modules/orphan.js','');assert.notEqual(run().status,0);
  fs.unlinkSync(path.join(tmp,'src/modules/orphan.js'));
  put('src/studio.html','{{include:../LICENSE}}');assert.notEqual(run().status,0);
  put('src/studio.html',template);fs.unlinkSync(path.join(tmp,'src/modules/example.js'));assert.notEqual(run().status,0);
  // Validate science inventory negative controls using a minimal catalog and one real record.
  fs.copyFileSync(path.join(__dirname,'science.js'),path.join(tmp,'tools/science.js'));
  fs.mkdirSync(path.join(tmp,'validation'));
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
  records([record]);fs.appendFileSync(path.join(tmp,record.source),'\n// changed');assert.notEqual(science().status,0);
  console.log('PASS: build parity and stale/duplicate/missing/path/orphan controls; missing/duplicate/unsupported/source-drift validation controls.');
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
