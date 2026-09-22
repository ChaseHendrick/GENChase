// Observe process identity without collecting usernames, hostnames or command arguments.
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
function snapshot(){
 const result=cp.spawnSync('ps',['-axo','pid=,ppid=,pgid=,lstart='],{encoding:'utf8',timeout:3000,maxBuffer:4e6});
 if(result.status!==0)throw Error('Cannot inspect validator process descendants.');
 return result.stdout.split('\n').flatMap(line=>{const m=/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line);return m?[{pid:+m[1],parent:+m[2],group:+m[3],started:m[4]}]:[];});
}
function collect(leader,file,rows=snapshot()){
 const byId=new Map(rows.map(row=>[row.pid,row]));let previous=[];
 try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 const owned=new Set([leader]);
 for(const old of Array.isArray(previous)?previous:[]){
  if(!Number.isInteger(old.pid)||old.pid<=1)continue;
  for(const member of Array.isArray(old.members)?old.members:[{pid:old.pid,started:old.started}])if(byId.get(member.pid)?.started===member.started&&byId.get(member.pid)?.group===old.pid)owned.add(member.pid);
 }
 let changed=true;
 while(changed){changed=false;for(const row of rows)if(owned.has(row.parent)&&!owned.has(row.pid)){owned.add(row.pid);changed=true;}}
 const groups=new Map();
 for(const old of Array.isArray(previous)?previous:[]){
  if(!Number.isInteger(old.pid)||old.pid<=1)continue;
  const members=Array.isArray(old.members)?old.members:[{pid:old.pid,started:old.started}];
  if(members.some(member=>byId.get(member.pid)?.started===member.started&&byId.get(member.pid)?.group===old.pid))groups.set(old.pid,old);
 }
 for(const row of rows)if(owned.has(row.pid)&&owned.has(row.group)){const head=byId.get(row.group);if(head&&head.pid>1)groups.set(head.pid,{pid:head.pid,started:head.started});}
 const records=[...groups.values()].map(group=>({...group,members:rows.filter(row=>row.group===group.pid).map(row=>({pid:row.pid,started:row.started}))}));
 // Per-writer temporary names avoid races between the server and its guard.
 const temporary=file+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,JSON.stringify(records));fs.renameSync(temporary,file);
 return records;
}
function signal(leader,dir,value){
 const file=path.join(dir,'process-groups.json');let groups;
 try{groups=collect(leader,file);}catch{groups=[{pid:leader}];}
 apply(groups,value);
}
function apply(groups,value){
 for(const group of groups)try{process.kill(-group.pid,value);}catch(e){if(e.code!=='ESRCH')throw e;}
}
module.exports={snapshot,collect,signal,apply};
