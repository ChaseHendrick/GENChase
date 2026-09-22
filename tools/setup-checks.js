'use strict';
// Optional, explicit local setup. No dependency or browser download occurs during npm test.
const {spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..');
if(Number(process.versions.node.split('.')[0])<22){console.error('Scientific checks need Node.js 22 or newer.');process.exit(1);}
function run(command,args){const r=spawnSync(command,args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'&&command.endsWith('.cmd')});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
console.log('Installing optional test tools and Chromium into the local development environment.');
run(process.platform==='win32'?'npm.cmd':'npm',['install','--no-save','--package-lock=false','playwright@1.58.2','axe-core@4.10.3']);
run(process.execPath,[path.join(path.dirname(require.resolve('playwright',{paths:[root]})),'cli.js'),'install','chromium']);
console.log('\nReady. Run npm run validator, then open the local URL shown in the terminal.\nFast checks: npm test\nScientific plan: node tools/verify.js --list --print <module-id>\nUploads are optional and require GitHub CLI plus gh auth login.');
