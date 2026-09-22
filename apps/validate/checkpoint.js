// Restart registered evidence at test boundaries only, with exact source/context matching.
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),os=require('node:os'),moduleApi=require('node:module');
function runtimeMetadata(root) {
 const out={release:os.release()};
 const resolve=moduleApi.createRequire(path.join(root,'package.json'));
 for(const name of ['playwright/package.json','playwright-core/package.json','playwright-core/browsers.json']) {
  try { const file=resolve.resolve(name);out[name]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
  catch {
   // Some package export maps hide browsers.json even when the runtime is present.
   if(name.endsWith('/browsers.json'))try {const file=path.join(path.dirname(resolve.resolve('playwright-core/package.json')),'browsers.json');out[name]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}catch{out[name]=null;}
   else out[name]=null;
  }
 }
 return out;
}
function fingerprint(root,selection){
 const listing=cp.spawnSync('git',['ls-files','-co','--exclude-standard','-z'],{cwd:root,encoding:'utf8',maxBuffer:4e6});
 if(listing.status!==0)throw Error('Checkpoint needs a Git checkout.');
 const h=crypto.createHash('sha256');
 for(const name of listing.stdout.split('\0').filter(Boolean).sort()){
  if(name.startsWith('apps/validate/.runs/')||name.startsWith('run/validator/'))continue;
  const p=path.join(root,name);h.update(name+'\0');if(fs.existsSync(p)&&fs.lstatSync(p).isFile())h.update(fs.readFileSync(p));else h.update('MISSING');
 }
 h.update(JSON.stringify({selection,node:process.version,platform:process.platform,arch:process.arch,runtime:runtimeMetadata(root),NODE_PATH:process.env.NODE_PATH,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH}));
 return h.digest('hex');
}
function seal(value) { return {...value,checksum:crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')}; }
function intact(value) { if(!value || typeof value!=='object' || Array.isArray(value))return false; const {checksum,...payload}=value; return typeof checksum==='string' && seal(payload).checksum===checksum; }
function checkpoint(root,selection,file=process.env.GENCHASE_VERIFY_CHECKPOINT){
 if(!file || (process.env.GENCHASE_CHECKPOINT_ROOT && path.resolve(root)!==path.resolve(process.env.GENCHASE_CHECKPOINT_ROOT)))return {has:()=>false,mark(){}};
 const signature=fingerprint(root,selection);let state={format:1,signature,completed:[]};
 if(fs.existsSync(file)){
  try {
   const old=JSON.parse(fs.readFileSync(file,'utf8'));
   if(intact(old)&&old.format===1&&old.signature===signature&&Array.isArray(old.completed)&&old.completed.every(x=>typeof x==='string')&&new Set(old.completed).size===old.completed.length) { const {checksum,...payload}=old; state=payload; }
   else console.log('Checkpoint context changed or data is damaged; all registered checks will run again.');
  } catch { console.log('Checkpoint could not be read; all registered checks will run again.'); }
 }
 return {has:name=>state.completed.includes(name),mark(name){if(!state.completed.includes(name))state.completed.push(name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(seal(state),null,2)+'\n');fs.renameSync(file+'.tmp',file);}};
}
module.exports={fingerprint,checkpoint,seal,intact,runtimeMetadata};
