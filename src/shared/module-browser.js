/* Shared catalog browser. Metadata only; opening this view never starts 130 simulations. */
(function () {
  'use strict';
  const ranks = { ubiquitous: 0, common: 1, occasional: 2, rare: 3, unseen: 4 };
  const groups = {
    'Waves and fields': 'reaction fluid cahn ohta amb swift ks pfc cgl nematic schrodinger convection turing cyclic chemotaxis vegetation excitable faraday lens timecrystal arago rogue aharonov anderson soliton ssh breather cloak airy veselago causticsea kp gerstner peakon photon crapper hasimoto lump plasma shallow nonreciprocal maxwell volume-wave',
    'Geometry and tilings': 'tilings aztec sle lozenge hyperbolic holomorphic ust rotor kakeya klein gyroid meissner weierstrass devil boy reuleaux apollonian knotlight surfaces',
    'Particles and dynamics': 'attractors swarm chirikov pendulum orbitals fput vortex purcell tennis loschmidt eight three-vortex-bound parallelogram-lock quincunx-lock double-triangle-bound molecular direct-gravity',
    'Growth and patterns': 'flow physarum growth dendrite snowflake lichtenberg pearls smectic hl phyllotaxis grains liesegang growdomain web film stealth track physarum3d',
    'Neuroscience and collective systems': 'life cppn chimera cyclicca percolation cortex rmt landscape kpz bec potts tonertu skyrmion ising sandpile xy spinice skin hodgkin-huxley neural-mass',
    'Quantum and optical structures': 'fractal chladni hofstadter scars caustics talbot lp aubry hopf exceptional kitaev thouless darkroom',
  };
  function topic(m) { return Object.keys(groups).find(k => groups[k].split(' ').includes(m.id)) || 'Other'; }
  function year(m) { const hit = (m.subtitle || '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/); return hit ? Number(hit[0]) : null; }
  function compare(mode) {
    return (a, b) => {
      const fallback = (a.name || a.id).localeCompare(b.name || b.id);
      if (mode === 'oldest' || mode === 'newest') {
        const x=year(a),y=year(b);if(x===null||y===null)return x===y?fallback:x===null?1:-1;
        return (mode==='oldest'?x-y:y-x)||fallback;
      }
      if (mode==='common'||mode==='rare') return (mode==='common'?1:-1)*((ranks[a.familiarity]??5)-(ranks[b.familiarity]??5))||fallback;
      return fallback;
    };
  }
  function mount({ modules, onSelect, loadRecords, statuses }) {
    const byId = Object.fromEntries(modules.map(m=>[m.id,m]));
    const tabs=document.getElementById('tabs'), sort=document.getElementById('module-sort');
    const orderTabs=()=>{for(const m of modules.slice().sort(compare(sort.value))){const b=tabs.querySelector('[data-id="'+m.id+'"]');if(b)tabs.appendChild(b);}};
    sort.addEventListener('change',orderTabs);orderTabs();
    const el=(tag,attrs={},text)=>{const e=document.createElement(tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
    let favorites=new Set();try{const saved=JSON.parse(localStorage.getItem('genchase-module-favorites')||'[]');if(Array.isArray(saved))favorites=new Set(saved.filter(id=>byId[id]));}catch{}
    const dialog=el('dialog',{class:'module-browser','aria-labelledby':'module-browser-title',id:'module-browser'}), header=el('header'), close=el('button',{class:'btn',type:'button'},'Close');
    header.append(el('h2',{id:'module-browser-title'},'Browse modules'),close);dialog.append(header);
    const controls=el('div',{class:'module-filters'}), fields={};
    const field=(key,title,values)=>{const label=el('label',{},title), input=values?el('select',{'data-filter':key}):el('input',{type:'search','data-filter':key,placeholder:'Name, equation, paper or keyword'});if(values)for(const [value,text]of values)input.append(new Option(text,value));label.append(input);controls.append(label);fields[key]=input;input.addEventListener(values?'change':'input',render);return input;};
    field('query','Search');
    field('sort','Sort',[['name','Name A to Z'],['oldest','Oldest reference year first'],['newest','Newest reference year first'],['common','Most common to rarest'],['rare','Rarest to most common']]);
    field('topic','Topic',[['','All topics'],...Object.keys(groups).map(k=>[k,k]),['Other','Other']]);
    field('seen','Familiarity',[['','Any familiarity'],['ubiquitous','Ubiquitous'],['common','Common'],['occasional','Occasional'],['rare','Rare'],['unseen','Almost unseen']]);
    field('era','Reference year',[['','Any date'],['early','Before 1900'],['modern','1900 to 1949'],['late','1950 to 1999'],['recent','2000 onward'],['unknown','Date not listed']]);
    field('science','Science evidence',[['','Any evidence status'],['unvalidated','Unvalidated'],['partially validated','Partially validated'],['validated within stated limits','Validated within stated limits']]);fields.science.disabled=!(statuses&&Object.keys(statuses).length);
    field('favorites','Saved choices',[['','All modules'],['yes','Favorites only']]);
    const reset=el('button',{type:'button',class:'btn'},'Clear filters');controls.append(reset);
    const count=el('p',{'aria-live':'polite',id:'module-browser-count'}), note=el('p',{class:'browser-note'},'Dates come from the listed reference year, not the date a module was added. Familiarity and topics are editorial categories. Science labels apply only to their recorded limits.'), results=el('div',{class:'module-results'});
    dialog.append(controls,count,note,results);document.body.append(dialog);
    // Statuses embedded at build time make the evidence filter work before the full inventory loads.
    let records=Object.assign({},statuses||{}),loadError='',opener=null;
    function render(){
      const bits=fields.query.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const selected=modules.filter(m=>{
        const text=[m.id,m.name,m.subtitle,m.equation,m.credit,m.blurb,topic(m)].join(' ').toLowerCase(), y=year(m), era=fields.era.value;
        return bits.every(b=>text.includes(b))&&(!fields.topic.value||topic(m)===fields.topic.value)&&(!fields.seen.value||m.familiarity===fields.seen.value)&&(!fields.science.value||records[m.id]===fields.science.value)&&(!fields.favorites.value||favorites.has(m.id))&&(!era||(era==='unknown'?y===null:y!==null&&(era==='early'?y<1900:era==='modern'?y>=1900&&y<1950:era==='late'?y>=1950&&y<2000:y>=2000)));
      }).sort(compare(fields.sort.value));
      count.textContent=selected.length+' of '+modules.length+' modules'+(loadError?' · '+loadError:'');
      const fragment=document.createDocumentFragment();
      for(const m of selected){
        const card=el('article',{class:'module-card','data-id':m.id}), open=el('button',{type:'button',class:'module-open'},m.name||m.id), star=el('button',{type:'button',class:'module-star','aria-label':'Favorite '+(m.name||m.id),'aria-pressed':String(favorites.has(m.id))},favorites.has(m.id)?'★':'☆');
        open.onclick=async()=>{dialog.close();await onSelect(m.id);document.getElementById('stage')?.focus();};
        star.onclick=()=>{if(favorites.has(m.id))favorites.delete(m.id);else favorites.add(m.id);try{localStorage.setItem('genchase-module-favorites',JSON.stringify([...favorites]));}catch{}star.setAttribute('aria-pressed',String(favorites.has(m.id)));star.textContent=favorites.has(m.id)?'★':'☆';if(fields.favorites.value)render();};
        card.append(open,star,el('p',{},m.subtitle||'Reference date not listed'),el('p',{},topic(m)+' · '+(records[m.id]||'Evidence status loading')));fragment.append(card);
      }
      results.replaceChildren(fragment);
    }
    reset.onclick=()=>{for(const [key,input]of Object.entries(fields))input.value=key==='sort'?'name':'';render();fields.query.focus();};
    close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>opener?.focus());
    // Native modal dialogs manage focus containment and Escape in Safari/Chromium.
    document.getElementById('browse-modules').onclick=async()=>{
      opener=document.getElementById('browse-modules');fields.query.value=document.getElementById('find').value;fields.sort.value=sort.value;render();dialog.showModal();fields.query.focus();
      try{for(const r of await loadRecords())records[r.id]=r.status;fields.science.disabled=false;loadError='';}catch{loadError='Evidence unavailable; reopen to retry';}render();
    };
  }
  const api={year,topic,compare,mount};
  if(typeof window!=='undefined')window.ModuleBrowser=api;
  if(typeof module!=='undefined')module.exports=api;
})();
