'use strict';
const R=ResearchNotebook,$=id=>document.getElementById(id),key='genchase-research-notebook-v1';
let data={version:1,question:'',sources:[]},editing=-1,storageFailed=false;
try { const saved=localStorage.getItem(key);if(saved)data=R.validate(JSON.parse(saved)); } catch { storageFailed=true; }
function save(){
  data.question=$('question').value;
  try{localStorage.setItem(key,JSON.stringify(data));storageFailed=false;}catch{storageFailed=true;}
  $('save-status').textContent=storageFailed?'Browser storage is unavailable. Download JSON to keep your notes.':'Saved in this browser.';
  $('prompt').value='';$('copy-prompt').disabled=true;$('copy-status').textContent='';
}
function links(){
  $('providers').replaceChildren(...R.providers.map(p=>{const a=document.createElement('a');a.className='provider';a.href=R.searchURL(p,$('question').value);a.target='_blank';a.rel='noopener noreferrer';const kind=document.createElement('small'),name=document.createElement('strong'),description=document.createElement('span');kind.textContent=p.kind;name.textContent=p.name+' ↗';description.textContent=p.description;a.append(kind,name,description);return a;}));
}
function resetForm(){editing=-1;$('source-form').reset();$('save-source').textContent='Add source';$('cancel-edit').hidden=true;}
function render(){
  $('count').textContent=data.sources.length+(data.sources.length===1?' source':' sources');$('empty').hidden=data.sources.length>0;
  $('sources').replaceChildren(...data.sources.map((s,i)=>{
    const card=document.createElement('article');card.className='source';const title=document.createElement('h3'),link=document.createElement('a'),read=document.createElement('p'),notes=document.createElement('p'),actions=document.createElement('div'),edit=document.createElement('button'),remove=document.createElement('button');
    title.textContent=s.title;link.textContent=s.url;link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';read.className='small';read.textContent='Read: '+({unread:'Not read yet',abstract:'Abstract only','full-text':'Full text'}[s.read]);notes.textContent=s.notes;actions.className='actions';edit.textContent='Edit';edit.setAttribute('aria-label','Edit '+s.title);remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+s.title);
    edit.onclick=()=>{editing=i;for(const id of ['title','url','read','notes'])$(id).value=s[id];$('save-source').textContent='Save changes';$('cancel-edit').hidden=false;$('title').focus();};
    remove.onclick=()=>{data.sources.splice(i,1);resetForm();save();render();};actions.append(edit,remove);card.append(title,link,read,notes,actions);return card;
  }));
}
$('question').value=data.question;links();render();
$('save-status').textContent=storageFailed?'Saved notes could not be loaded. Import a backup or download JSON to keep new notes.':'Notes stay in this browser. Download JSON for a backup.';
$('question').oninput=()=>{save();links();};
$('source-form').onsubmit=e=>{e.preventDefault();try{
  const source={title:$('title').value.trim(),url:R.sourceURL($('url').value),read:$('read').value,notes:$('notes').value};if(!source.title)throw Error('Enter a paper title.');
  const next={...data,sources:data.sources.slice()};if(editing<0)next.sources.push(source);else next.sources[editing]=source;data=R.validate(next);resetForm();save();render();$('error').textContent='';
}catch(err){$('error').textContent=err.message;}};
$('cancel-edit').onclick=resetForm;
$('make-prompt').onclick=()=>{data.question=$('question').value;$('prompt').value=R.prompt(data);$('copy-prompt').disabled=false;$('prompt').focus();};
$('copy-prompt').onclick=async()=>{try{await navigator.clipboard.writeText($('prompt').value);$('copy-status').textContent='Prompt copied. You choose where to paste it.';}catch{$('prompt').focus();$('prompt').select();$('copy-status').textContent='Clipboard unavailable. The prompt is selected so you can copy it manually.';}};
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-json').onclick=()=>download('genchase-research-notebook.json',JSON.stringify(data,null,2)+'\n','application/json');
$('export-md').onclick=()=>download('genchase-research-notebook.md',R.markdown(data),'text/markdown');
$('import').onchange=async()=>{try{
  const file=$('import').files[0];if(!file)return;if(file.size>3000000)throw Error('Notebook must be smaller than 3 MB.');
  const incoming=R.validate(JSON.parse(await file.text()));
  const sources=data.sources.slice();for(const source of incoming.sources)if(!sources.some(s=>JSON.stringify(s)===JSON.stringify(source)))sources.push(source);
  const question=data.question||incoming.question;data=R.validate({version:1,question,sources});$('question').value=question;resetForm();save();links();render();$('error').textContent='';
  $('save-status').textContent=(storageFailed?'Imported in memory only; download a backup.':'Imported and saved in this browser.')+(incoming.question&&incoming.question!==question?' Existing question kept; the imported file has a different question.':'');
}catch(err){$('error').textContent='Import failed: '+err.message;}finally{$('import').value='';}};
