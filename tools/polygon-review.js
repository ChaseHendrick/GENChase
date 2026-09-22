// Complete review of the enumerated polygon recipes, including real PNG and SVG exports.
'use strict';
const fs=require('node:fs'), path=require('node:path'), os=require('node:os'), crypto=require('node:crypto'), assert=require('node:assert/strict'), cp=require('node:child_process');
const {chromium}=require('playwright');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'), source=fs.readFileSync(path.join(root,'src/modules/double-triangle-bound.js'),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function refinement(){let src=source,box={Studio:{util:{clamp:(x,a,b)=>Math.max(a,Math.min(b,x))},PALETTES:{},register(){}}};vm.runInNewContext(src.replace('  Studio.register({','globalThis.f={family,place,measure,trajectory};\n  Studio.register({'),box);const f=box.f;let rows=[];for(let n=2;n<=5;n++)for(const theta of [12/n,f.family(n).opt,168/n]){const z=f.place(theta,false,0,n),m=f.measure(z);let errors=[];for(const steps of [1,2,4]){let max=0;f.trajectory(z,m.tc,steps).forEach((a,k)=>{const q=-Math.log(.1)*k/600,sc=Math.exp(-q/2),c=Math.cos(m.product*q),s=Math.sin(m.product*q);a.forEach((p,i)=>max=Math.max(max,Math.hypot(p[0]-sc*(c*z[i][0]-s*z[i][1]),p[1]-sc*(s*z[i][0]+c*z[i][1]))));});errors.push(max);}rows.push({n,theta,errors,orders:errors.slice(1).map((v,i)=>Math.log2(errors[i]/v))});}for(const row of rows){assert(row.errors.every(e=>e<4e-5));if(row.theta>7)assert(row.orders.every(p=>p>3.8&&p<4.2));}return rows;}
async function main(){
  const refinementRows=refinement();
  const reference=JSON.parse(cp.execFileSync(process.execPath,[path.join(root,'tools/polygon-collapse-check.js')],{encoding:'utf8'}));
  const portable=fs.readFileSync(path.join(root,'dist/studio.html'),'utf8'); assert(portable.includes(source),'Build first');
  const instrumented=source.replace('      return {\n        aspect','      return {\n        auditRead() { return {data,time}; },\n        aspect'); assert.notEqual(instrumented,source);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'polygon-review-')), file=path.join(dir,'studio.html');
  fs.writeFileSync(file,portable.replace(source,instrumented).replace('generatePalette, register, boot,','generatePalette, register, auditInstances: () => instances, boot,'));
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const page=await browser.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.route(/^https?:/,r=>r.abort());
    await page.goto('file://'+file+'#double-triangle-bound/review'); await page.evaluate(()=>Studio.ready);
    await page.selectOption('#export-inches','8'); await page.selectOption('#export-dpi','300');
    await page.locator('#btn-colophon-edit').click(); await page.locator('#colo-enabled').uncheck(); await page.locator('#colo-close').click();
    const cases=[];
    for(let n=2;n<=5;n++)for(const [position,view,aspect] of [['low','spiral','1:1'],['minimum','triangles','4:5'],['high','spiral','16:9'],['minimum','bound','5:4']]){
      const name=n+'-'+position+'-'+view;
      await page.evaluate(({n,position,view,aspect,name})=>{
        const theta=position==='low'?12/n:168/n;
        location.hash='double-triangle-bound/'+name+'/'+btoa(JSON.stringify({v:2,n,kind:position==='minimum'?'minimum':'family',theta,view,aspect,time:.9,running:false,rotation:0,weight:1}));
      },{n,position,view,aspect,name});
      await page.waitForFunction(name=>Studio.getRecipe()?.seed===name,name);
      const numerical=await page.evaluate(()=>{
        const e=Studio.auditInstances()['double-triangle-bound'], {data}=e.inst.auditRead(),n=data.n,theta=data.theta*Math.PI/180;
        // Independent complex ring identity coefficients, not production measure/closed.
        const d=Math.sqrt(2*n-1),x=(n+d)/(n-1),R=x**(n/2),a=n*theta,D=1+R*R-2*R*Math.cos(a);
        const A=-n*R*Math.sin(a)/(2*Math.PI*D), B=((n-1)*x/2+n*(R*Math.cos(a)-1)/D)/(2*Math.PI), T=-1/(2*A);
        const product=B*T, initial=[];
        for(let ring=0;ring<2;ring++)for(let k=0;k<n;k++){const angle=2*Math.PI*k/n+(ring?0:theta),r=ring?1:Math.sqrt(x);initial.push([r*Math.cos(angle),r*Math.sin(angle)]);}
        let max=0, bad=0;
        data.path.forEach((z,k)=>{const q=-Math.log(.1)*k/(data.path.length-1),s=Math.exp(-q/2),c=Math.cos(product*q),sn=Math.sin(product*q);
          z.forEach((p,i)=>{const [u,v]=initial[i],expected=[s*(c*u-sn*v),s*(sn*u+c*v)];max=Math.max(max,Math.hypot(p[0]-expected[0],p[1]-expected[1]));bad=Math.max(bad,Math.hypot(p[0]+.01-expected[0],p[1]-expected[1]));});});
        if(max>4e-5||bad<.009)throw Error('Independent trajectory comparison failed '+max);
        if(Math.abs(data.m.product/product-1)>1e-11)throw Error('Product comparison failed');
        return {n,thetaDegrees:data.theta,points:data.path.length*2*n,maxCoordinateError:max,displacedCoordinateError:bad,product,collapseTime:T};
      });
      const before=await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances()['double-triangle-bound'].inst.auditRead(),witness:Studio.getWitness()}));
      await page.locator('#btn-export').click(); await page.waitForFunction(()=>!document.querySelector('#export-img').hidden&&!Studio.exportJob);
      const print=await page.evaluate(async()=>{
        const e=Studio.auditInstances()['double-triangle-bound'], a=e.inst.auditRead(), img=document.querySelector('#export-img');await img.decode();
        const w=img.naturalWidth,h=img.naturalHeight,svg=e.inst.exportSVG(w,h),doc=new DOMParser().parseFromString(svg,'image/svg+xml');
        if(doc.querySelector('parsererror'))throw Error('Invalid SVG');
        const paths=[...doc.querySelectorAll('path')];let max=0, compared=0;
        const extract=p=>(p.getAttribute('d').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number);
        if(e.state.view==='spiral'){
          for(let i=0;i<2*a.data.n;i++){const coordinates=extract(paths[i]);
            if(coordinates.length!==2*a.data.path.length)throw Error('SVG trajectory truncated');
            for(let k=0;k<a.data.path.length;k++){const p=a.data.path[k][i];
              const expected=[w/2+Math.min(w,h)*.245*(p[0]-a.data.m.c[0]),h/2-Math.min(w,h)*.245*(p[1]-a.data.m.c[1])];
              for(let j=0;j<2;j++){max=Math.max(max,Math.abs(coordinates[2*k+j]-expected[j]));compared++;}}
          }
        }else if(e.state.view==='triangles'){
          let index=0;
          for(let k=0;k<a.data.path.length;k+=32)for(let ring=0;ring<2;ring++){
            const points=extract(paths[index++]);if(points.length!==2*a.data.n)throw Error('Missing polygon vertices');
            for(let i=0;i<a.data.n;i++){const p=a.data.path[k][ring*a.data.n+i],expected=[w/2+Math.min(w,h)*.245*(p[0]-a.data.m.c[0]),h/2-Math.min(w,h)*.245*(p[1]-a.data.m.c[1])];
              for(let j=0;j<2;j++){max=Math.max(max,Math.abs(points[2*i+j]-expected[j]));compared++;}}
          }
        }else{
          // The curve has 261 sampled values. Reconstruct using independent ring coefficients.
          const curve=paths.map(extract).find(p=>p.length>400);if(!curve)throw Error('Missing bound curve');
          const n=a.data.n,d=Math.sqrt(2*n-1),x=(n+d)/(n-1),R=x**(n/2);
          const K=(n-1)*Math.sinh((n+2)*Math.log(x)/2),floor=Math.sqrt(K*K-d*d)/(2*n);
          for(let i=0;i<curve.length/2;i++){
            const degrees=12+.6*i,alpha=degrees*Math.PI/180,D=1+R*R-2*R*Math.cos(alpha);
            const A=-n*R*Math.sin(alpha)/(2*Math.PI*D),B=((n-1)*x/2+n*(R*Math.cos(alpha)-1)/D)/(2*Math.PI);
            const expected=[w*(.12+.76*degrees/180),h*(.84-.61*(-B/(2*A)-.8*floor)/(6.7*floor))];
            for(let j=0;j<2;j++){max=Math.max(max,Math.abs(curve[2*i+j]-expected[j]));compared++;}
          }
        }
        if(max>1e-7||!compared)throw Error('SVG coordinate mismatch '+max);
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const g=canvas.getContext('2d');g.drawImage(img,0,0);
        const pixels=g.getImageData(0,0,w,h).data;
        const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),direct=new Image();direct.src=url;await direct.decode();
        g.fillStyle=e.state.bg;g.fillRect(0,0,w,h);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(direct,0,0,w,h);const expected=g.getImageData(0,0,w,h).data;
        g.fillRect(0,0,w,h);g.drawImage(direct,1,0,w,h);const shifted=g.getImageData(0,0,w,h).data;URL.revokeObjectURL(url);
        let displacedMismatches=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==shifted[i])displacedMismatches++;
        if(!displacedMismatches)throw Error('Displaced SVG print control was not detected');
        let mismatch=0,foreground=0;for(let i=0;i<pixels.length;i++){if(pixels[i]!==expected[i])mismatch++;if(i%4!==3&&pixels[i]!==pixels[i%4])foreground++;}
        if(mismatch||!foreground)throw Error('PNG differs from validated SVG rasterization or is blank');
        return {width:w,height:h,svgCoordinatesCompared:compared,svgMaxError:max,pngChannelMismatches:mismatch,foregroundChannels:foreground,displacedPrintChannelMismatches:displacedMismatches};
      });
      assert.equal(Math.max(print.width,print.height),2400);
      assert.equal(await page.evaluate(()=>JSON.stringify({recipe:Studio.getRecipe(),science:Studio.auditInstances()['double-triangle-bound'].inst.auditRead(),witness:Studio.getWitness()})),before);
      cases.push({name,n,position,view,aspect,time:.9,numerical,print,statePreserved:true});console.log('PASS '+name);
      await page.locator('#export-close').click();
    }
    assert.deepEqual(errors,[]);
    const result={date:new Date().toISOString().slice(0,10),sourceSha256:sha(source),engineSha256:sha(fs.readFileSync(path.join(root,'src/shared/engine.js'))),scope:'Only the 16 enumerated recipes; mathematical point-vortex model and exported geometry, not physical fluids or arbitrary settings.',reference,refinement:refinementRows,cases,environment:{node:process.version,chromium:browser.version(),platform:process.platform},passed:true};
    if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'validation/results/polygon-review.json'),JSON.stringify(result,null,2)+'\n');
    console.log('PASS polygon numerical and print review: '+cases.length+' recipes');
  }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
