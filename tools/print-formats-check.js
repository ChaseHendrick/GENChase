'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../src/shared/print-formats.js');
(async()=>{
 const dir=process.argv[2] || '/tmp/genchase-print-check';fs.mkdirSync(dir,{recursive:true});
 const w=300,h=150,rgb=new Uint8Array(w*h*3);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*3;rgb[i]=x%256;rgb[i+1]=y;rgb[i+2]=73;}
 for(const [name,blob] of [['plate.pdf',await GenChasePrintFormats.pdf(rgb,w,h,3,1.5)],['bleed.pdf',await GenChasePrintFormats.pdf(rgb,w,h,3,1.5,{bleedMm:3,cropMarks:true})],['plate.tif',GenChasePrintFormats.tiff(rgb,w,h,3,1.5)]])fs.writeFileSync(path.join(dir,name),Buffer.from(await blob.arrayBuffer()));
 for(const fn of [GenChasePrintFormats.pdf,GenChasePrintFormats.tiff]){
  await assert.rejects(async()=>fn(rgb,w,h,0,1));await assert.rejects(async()=>fn(rgb,9000,9000,3,1.5));
 }
 console.log('Print containers generated with invalid-size negative controls.');
})().catch(e=>{console.error(e);process.exitCode=1;});
