// Real detached Chromium cleanup, including server death while computation is paused.
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {Jobs}=require('../apps/validate/jobs');
const root=path.resolve(__dirname,'..'),power={mode:'maximum',pauseOnBattery:false,thermalPause:false};
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
async function until(fn){const end=Date.now()+15000;while(!fn()){if(Date.now()>end)throw Error('Timed out waiting for browser cleanup.');await new Promise(r=>setTimeout(r,50));}}
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'genchase-browser-process-')),fixture=path.join(temp,'fixture');let jobs,parent,browserPid;
 try {
  fs.mkdirSync(path.join(fixture,'tools'),{recursive:true});fs.writeFileSync(path.join(fixture,'techniques.json'),JSON.stringify({techniques:[{id:'fixture'}]}));
  fs.writeFileSync(path.join(fixture,'tools/science.js'),'const fs=require("fs");(async()=>{const browser=await require(' + JSON.stringify(require.resolve('playwright')) + ').chromium.launchServer({headless:true});fs.writeFileSync("browser.pid",String(browser.process().pid));setInterval(()=>{},1000);})().catch(e=>{console.error(e);process.exit(1)});');
  cp.execFileSync('git',['init','-q'],{cwd:fixture});cp.execFileSync('git',['add','.'],{cwd:fixture});cp.execFileSync('git',['-c','user.name=Chaos','-c','user.email=326338179+SharpMeow@users.noreply.github.com','commit','-qm','Create browser lifecycle fixture.'],{cwd:fixture});
  const data=path.join(temp,'stop-job');jobs=new Jobs(fixture,data);jobs.start({workspace:'validate',mode:'inventory',power});
  await until(()=>fs.existsSync(path.join(fixture,'browser.pid')));browserPid=+fs.readFileSync(path.join(fixture,'browser.pid'));
  assert(alive(browserPid));jobs.stop();await until(()=>!jobs.active());await until(()=>!alive(-browserPid));
  assert.equal(jobs.current.reason,'Stopped by user.');console.log('PASS Stop removes real detached Chromium process group');
  fs.unlinkSync(path.join(fixture,'browser.pid'));
  const crashData=path.join(temp,'crash-job');fs.mkdirSync(crashData);
  const script=`const {Jobs}=require(${JSON.stringify(path.join(root,'apps/validate/jobs.js'))});const fs=require('fs');const jobs=new Jobs(${JSON.stringify(fixture)},${JSON.stringify(crashData)});jobs.start({workspace:'validate',mode:'inventory',power:${JSON.stringify(power)}});fs.writeFileSync(${JSON.stringify(path.join(crashData,'group.pid'))},String(jobs.child.pid));setInterval(()=>{},1000);`;
  parent=cp.spawn(process.execPath,['-e',script],{stdio:'ignore'});
  await until(()=>fs.existsSync(path.join(fixture,'browser.pid')));browserPid=+fs.readFileSync(path.join(fixture,'browser.pid'));
  const group=+fs.readFileSync(path.join(crashData,'group.pid'));
  await until(()=>fs.readdirSync(crashData).filter(n=>n.startsWith('20')).some(n=>{try{return JSON.parse(fs.readFileSync(path.join(crashData,n,'process-groups.json'))).some(p=>p.pid===browserPid);}catch{return false;}}));
  process.kill(-group,'SIGSTOP');process.kill(-browserPid,'SIGSTOP');parent.kill('SIGKILL');
  await until(()=>!alive(-group)&&!alive(-browserPid));console.log('PASS dead-server guard removes paused worker and detached Chromium groups');
 } finally {jobs?.stop();if(jobs)await jobs.wait();parent?.kill('SIGKILL');if(browserPid&&alive(-browserPid))process.kill(-browserPid,'SIGKILL');fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
