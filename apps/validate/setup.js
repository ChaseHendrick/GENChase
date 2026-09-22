'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
function browserSetup(root){
  try{const req=createRequire(path.join(root,'package.json')),pw=req('playwright');
    if(!fs.existsSync(pw.chromium.executablePath()))return {ready:false,message:'Chromium is not installed. In this checkout, run: npx playwright install chromium',command:'npx playwright install chromium'};
    return {ready:true,message:'Playwright and Chromium are installed. Browser checks are available.'};
  }catch{return {ready:false,message:'Playwright is not installed in this checkout. Run: npm install --no-save --package-lock=false playwright@1.58.2, then npx playwright install chromium',command:'npm install --no-save --package-lock=false playwright@1.58.2 && npx playwright install chromium'};}
}
function requiresBrowser(root,input){
  if(input.workspace==='validate'){
    if(['fast','inventory'].includes(input.mode))return false;
    if(input.mode==='technique'){
      const record=JSON.parse(fs.readFileSync(path.join(root,'validation/techniques.json'),'utf8')).find(r=>r.id===input.id);
      return [...(record?.numerical||[]),...(record?.print||[])].some(e=>/playwright/.test(fs.readFileSync(path.join(root,e.test),'utf8')));
    }
    return true;
  }
  return input.mode!=='metal';
}
module.exports={browserSetup,requiresBrowser};
