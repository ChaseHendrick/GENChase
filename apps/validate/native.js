'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'), source=path.join(__dirname,'metal-wave.swift');
function build() {
  if(process.platform!=='darwin'||process.arch!=='arm64')throw Error('Native Metal jobs require Apple Silicon macOS.');
  const hash=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),dir=path.join(__dirname,'.runs/native');fs.mkdirSync(dir,{recursive:true});
  const binary=path.join(dir,'metal-wave-'+hash.slice(0,16));
  if(!fs.existsSync(binary)){
    const out=cp.spawnSync('/usr/bin/xcrun',['swiftc','-O','-module-cache-path',path.join(dir,'module-cache'),source,'-o',binary],{encoding:'utf8',timeout:180000,maxBuffer:2e6});
    if(out.status!==0)throw Error('Apple command-line tools could not compile the backend: '+(out.stderr||out.error?.message));
  }
  return {binary,hash};
}
function telemetry(binary) {
  const r=cp.spawnSync(binary,['--telemetry'],{encoding:'utf8',timeout:3000});
  if(r.status!==0)return {thermal:'unknown',onBattery:null};
  try{return JSON.parse(r.stdout);}catch{return {thermal:'unknown',onBattery:null};}
}
function main(args=process.argv.slice(2)){
  const {binary,hash}=build(),dir=process.env.GENCHASE_JOB_DIR||path.join(__dirname,'.runs/manual-metal');fs.mkdirSync(dir,{recursive:true});
  const verify=cp.spawnSync(binary,['--verify','--checkpoint',path.join(dir,'verification-checkpoint'),'--signature',hash],{encoding:'utf8',maxBuffer:2e6});
  process.stdout.write(verify.stdout||'');process.stderr.write(verify.stderr||'');
  if(verify.status!==0)throw Error('Native GPU verification failed. Workload will not start.');
  const report=JSON.parse(verify.stdout.trim().split('\n').at(-1));
  fs.writeFileSync(path.join(dir,'metal-verification.json'),JSON.stringify({...report,sourceSha256:hash,platform:process.platform,arch:process.arch,node:process.version,recorded:new Date().toISOString()},null,2)+'\n');
  if(args.includes('--verify-only'))return;
  const checkpoint=path.join(dir,'metal-checkpoint'),resume=fs.existsSync(path.join(checkpoint,'checkpoint.json'));
  const child=cp.spawn(binary,[...args,'--checkpoint',checkpoint,'--signature',hash,...(resume?['--resume']:[])],{cwd:root,stdio:'inherit'});
  child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});
}
module.exports={build,telemetry};
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
