// A static gallery page for one art job. Inline style and script only, relative image paths, and no
// network reference of any kind, so it opens from disk. Every string from a recipe is escaped.
'use strict';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 3) => v === null || v === undefined || !Number.isFinite(Number(v)) ? '' : String(Number(Number(v).toFixed(d)));
// A JSON island that cannot close its own script element.
const island = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function galleryHtml({ job, records, controls, counts, scoring, headline }) {
  const cards = records.filter(r => r.status !== 'failed' && r.thumb);
  const evolve = job.mode === 'art-evolve';
  const card = r => {
    const m = r.metrics || {};
    return '<li class="card" data-rank="' + esc(r.rank) + '" data-entropy="' + esc(m.entropy) + '" data-edge="' + esc(m.edge) + '" data-acuity="' + esc(m.acuity) +
      '" data-contrast="' + esc(m.contrast) + '" data-feature="' + esc(m.featurePx ?? '') + '" data-index="' + esc(r.index) + '">' +
      '<img src="' + esc(r.thumb) + '" alt="Candidate ' + esc(r.index) + ' thumbnail" width="160">' +
      '<p><b>#' + esc(r.rank) + '</b> ' + esc(m.class) + ' · entropy ' + esc(num(m.entropy)) + ' bits · edge ' + esc(num(m.edge)) + ' · acuity ' + esc(num(m.acuity)) +
      (r.operator ? ' · ' + esc(r.operator) : '') + (r.print ? ' · print kept' : '') + (r.status === 'rejected' ? ' · rejected: ' + esc(r.reason) : '') + (r.label ? ' · ' + esc(r.label) : '') + '</p>' +
      '<p class="muted">seed ' + esc(r.seed) + ' · ' + esc(r.steps) + ' steps · grid ' + esc((r.grid || []).join('×')) + (r.clamped && r.clamped.length ? ' · clamped: ' + esc(r.clamped.join(', ')) : '') + '</p>' +
      '<label>Recipe hash <input readonly value="' + esc(r.hash) + '"></label>' +
      '<p><a href="../../../../dist/studio.html' + esc(r.hash) + '">Open in the studio</a> (commit ' + esc(String(job.commit || 'unknown').slice(0, 12)) + ')</p>' +
      (evolve ? '<label class="pick"><input type="checkbox" class="parent" value="' + esc(r.hash) + '"> Use as a parent</label>' : '') + '</li>';
  };
  const reasons = Object.entries(counts.rejected || {}).map(([k, v]) => esc(k) + ' ' + esc(v)).join(', ') || 'none';
  const commandTool = evolve ? '<section><h2>Next generation</h2><p>Tick up to six parents. The command below runs one more generation on this computer.</p>' +
    '<textarea id="command" readonly rows="4" aria-label="Command for the next generation"></textarea></section>' : '';
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>GENChase art: ' + esc(job.id) + ' ' + esc(job.mode) + '</title><style>' +
    'body{font:15px/1.45 system-ui,sans-serif;margin:0 auto;max-width:1100px;padding:16px;background:#f6f4ef;color:#1b1b1b}' +
    'ol{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}' +
    '.card{background:#fff;border:1px solid #d8d4ca;border-radius:6px;padding:10px}.card img{width:100%;height:auto;image-rendering:auto}' +
    '.muted{color:#5b5850;font-size:13px}input[readonly],textarea{width:100%;box-sizing:border-box;font:12px ui-monospace,monospace}' +
    '.warn{background:#fff3cd;border:1px solid #d9b64c;padding:8px 10px;border-radius:6px}' +
    '@media (prefers-color-scheme: dark){body{background:#161614;color:#ecebe6}.card{background:#22211e;border-color:#3a3833}.muted{color:#b3b0a6}.warn{background:#3a3217;border-color:#7a6425}}' +
    '</style></head><body>' +
    '<h1>' + esc(job.mode) + ' · ' + esc(job.id) + '</h1>' +
    (headline ? '<p class="warn">' + esc(headline) + '</p>' : '') +
    '<p>' + esc(scoring.definition) + '</p><p class="muted">' + esc(scoring.limits) + '</p>' +
    (evolve ? '<p class="warn">Every child is an unvalidated recipe, not scientific evidence.</p>' : '') +
    '<p class="muted">' + esc(counts.candidates) + ' candidates: ' + esc(counts.scored) + ' scored, ' + esc(counts.failed) + ' failed; rejected: ' + reasons +
    '. Renderer: ' + esc(job.renderer) + '. Chromium ' + esc(job.chromium) + '. Print ' + esc(job.inches) + ' in at ' + esc(job.ppi) + ' ppi. Source commit ' + esc(job.commit || 'unknown') + '.</p>' +
    '<p class="muted">' + esc(job.reducedMotionNote) + '</p>' +
    '<p class="muted">Repeat controls: ' + esc(controls && controls.summary || 'not run') + '</p>' +
    '<label>Sort by <select id="sort"><option value="rank">rank</option><option value="entropy">entropy</option><option value="edge">edge</option><option value="acuity">acuity</option><option value="contrast">contrast</option><option value="feature">feature size</option><option value="index">candidate</option></select></label>' +
    commandTool + '<ol id="cards">' + cards.map(card).join('') + '</ol>' +
    '<script>const job=' + island({ id: job.id, inches: job.inches, ppi: job.ppi }) + ';' +
    'const list=document.getElementById("cards");' +
    'document.getElementById("sort").onchange=e=>{const k=e.target.value,asc=k==="rank"||k==="index"||k==="feature";' +
    'const items=[...list.children].sort((a,b)=>{const x=Number(a.dataset[k]),y=Number(b.dataset[k]);const d=(Number.isFinite(x)?x:1e9)-(Number.isFinite(y)?y:1e9);return (asc?d:-d)||Number(a.dataset.index)-Number(b.dataset.index);});list.replaceChildren(...items);};' +
    'const box=document.getElementById("command");' +
    'const quote=s=>"\'"+String(s).replace(/\'/g,"\'\\\\\'\'")+"\'";' +
    'function update(){if(!box)return;const picked=[...document.querySelectorAll(".parent:checked")].slice(0,6).map(i=>i.value);' +
    'box.value=picked.length?"npm run validator:headless -- --mode art-evolve --id "+job.id+" "+picked.map(p=>"--parent "+quote(p)).join(" ")+" --inches "+job.inches+" --ppi "+job.ppi:"Tick at least one parent.";}' +
    'for(const c of document.querySelectorAll(".parent"))c.onchange=update;update();' +
    '</script></body></html>\n';
}
module.exports = { galleryHtml, esc };
