// Local discovery only. A source reference is a candidate for review, never evidence by itself.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),records=JSON.parse(fs.readFileSync(path.join(root,'validation/techniques.json')));
const scripts=fs.readdirSync(path.join(root,'tools')).filter(n=>n.endsWith('.js')).map(n=>({name:'tools/'+n,text:fs.readFileSync(path.join(root,'tools',n),'utf8')}));
const registered=new Set(records.flatMap(r=>[...r.numerical,...r.print].map(e=>e.test)));
const rows=records.filter(r=>r.status!=='validated within stated limits').map(r=>({id:r.id,source:r.source,status:r.status,missing:['numerical','print'].filter(k=>!r[k].length),registered:[...r.numerical,...r.print].map(e=>e.test),candidates:scripts.filter(s=>!registered.has(s.name)&&(s.text.includes(r.source)||s.text.includes("src/modules/'+"+r.id)||s.text.includes("src/modules/"+r.id+'.js'))).map(s=>s.name),remaining:r.remaining}));
const result={scope:'Source-reference discovery; candidates require independent-reference, tolerance, failure-control and print review before registration.',modules:records.length,incompleteModules:rows.length,missingEvidenceLists:rows.reduce((n,r)=>n+r.missing.length,0),rows};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/evidence-gap-discovery.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
