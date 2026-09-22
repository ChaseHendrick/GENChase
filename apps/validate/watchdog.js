// This guard stays outside paused compute groups and remembers detached browser groups.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {apply,collect}=require('./process-tree');
const server=Number(process.argv[2]),group=Number(process.argv[3]),dir=process.argv[4];
if(!Number.isSafeInteger(server)||server<=1||!Number.isSafeInteger(group)||group<=1||!dir)process.exit(1);
function alive(pid){try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}}
function tick(){
 let groups=[{pid:group}];try{groups=collect(group,path.join(dir,'process-groups.json'));}catch{}
 if(!alive(server)||process.ppid!==server||!alive(-group)){
  apply(groups,'SIGCONT');apply(groups,'SIGKILL');process.exit(0);
 }
 try{const value=JSON.parse(fs.readFileSync(path.join(dir,'process-control.json'),'utf8')).signal;if(['SIGSTOP','SIGCONT','SIGTERM','SIGKILL'].includes(value))apply(groups,value);}catch{}
}
setInterval(tick,200);tick();
