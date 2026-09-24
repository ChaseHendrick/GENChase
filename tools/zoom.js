// node tools/zoom.js <hash> <waitMs> <out> [presetKey]  -- saves the plate at full canvas pixels
const { glArgs } = require('./lib/gl-args');
const path=require('path'),fs=require('fs');const {chromium}=require('playwright');
(async()=>{const hash=process.argv[2],wait=+(process.argv[3]||9000),out=process.argv[4]||'zoom',pk=process.argv[5];
 const studio=process.env.STUDIO?path.resolve(process.env.STUDIO):path.resolve(__dirname,'..','dist','studio.html');
 const b=await chromium.launch({args:glArgs()});
 const p=await b.newPage({viewport:{width:1600,height:1200}});
 const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message);});
 await p.goto('file://'+studio+'#'+hash); await p.waitForTimeout(1500);
 if(pk){ const ok=await p.evaluate(k=>{const s=document.querySelector('#preset');if(![...s.options].some(o=>o.value===k))return false;s.value=k;s.dispatchEvent(new Event('change',{bubbles:true}));return true;},pk);
   if(!ok){console.log('no such preset');await b.close();process.exit(1);} }
 await p.waitForTimeout(wait);
 const r=await p.evaluate(()=>{const c=[...document.querySelectorAll('canvas')].find(c=>c.offsetParent!==null&&c.width>100);
  if(!c)return{err:'none'}; const t=document.createElement('canvas');t.width=c.width;t.height=c.height;
  t.getContext('2d').drawImage(c,0,0); return{size:c.width+'x'+c.height,status:(document.querySelector('#status')||{}).innerText,png:t.toDataURL()};});
 if(r.png){fs.writeFileSync(path.join(__dirname,'shots',out+'.png'),Buffer.from(r.png.split(',')[1],'base64'));delete r.png;}
 console.log(JSON.stringify(r)); console.log(errs.join('\n')||'ok'); await b.close();})();
