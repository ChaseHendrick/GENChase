'use strict';
const $ = id => document.getElementById(id);
let config, workspace = 'validate', state = null, paused = false, busy = false, connected = false;
// Storage may be unavailable in a private or restricted browser session.
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* Session controls still work. */ } }
};
const fieldIds = ['mode', 'technique', 'slug', 'order', 'samples', 'gpu-grid', 'gpu-steps'];
const workspaceFields = {};
try { Object.assign(workspaceFields, JSON.parse(storage.get('genchase-validator-fields') || '{}')); } catch { /* Ignore damaged preferences. */ }
function remember() {
  workspaceFields[workspace] = Object.fromEntries(fieldIds.map(id => [id, $(id).value]));
  storage.set('genchase-validator-fields', JSON.stringify(workspaceFields));
}
function setText(id, value) { if ($(id).textContent !== value) $(id).textContent = value; }
let statsSignature = '', hardwareSignature = '', missesSignature = '', initializedPower = false;
function restorePower(value) {
  if (!value || typeof value !== 'object') return;
  if (['light', 'balanced', 'maximum'].includes(value.mode)) $('power-mode').value = value.mode;
  if (typeof value.pauseOnBattery === 'boolean') $('battery-pause').checked = value.pauseOnBattery;
  if (typeof value.thermalPause === 'boolean') $('thermal-pause').checked = value.thermalPause;
}
try { restorePower(JSON.parse(storage.get('genchase-validator-power') || 'null')); } catch { /* Keep safe defaults. */ }
$('machine-slug').value = storage.get('genchase-validator-machine') || 'm1pro';
$('machine-slug').onchange = () => storage.set('genchase-validator-machine', $('machine-slug').value);
async function api(url, body) {
  const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'X-Validator-Token': config?.token || '', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) throw Error((await response.json()).error || 'Request failed.');
  return response.json();
}
function modeFields() {
  const derive = workspace === 'contribute' && $('mode').value === 'derive';
  $('technique-field').hidden = workspace !== 'validate' || !['technique', 'plate', 'print', 'witness'].includes($('mode').value);
  for (const id of ['slug-field', 'order-field', 'samples-field']) $(id).hidden = !derive;
  for(const id of ['grid-field','steps-field'])$(id).hidden=workspace!=='contribute'||$('mode').value!=='metal';
  $('start').textContent = derive ? 'Derive candidate' : 'Start';
}
function choose(value) {
  if (config && $('mode').options.length) remember();
  workspace = value; storage.set('genchase-validator-workspace', value);
  $('validate-tab').setAttribute('aria-pressed', value === 'validate'); $('contribute-tab').setAttribute('aria-pressed', value === 'contribute');
  $('workspace-title').textContent = value === 'validate' ? 'Validate' : 'Contribute';
  $('workspace-description').textContent = value === 'validate' ? "Run the repository's official checks. Green means machine evidence, not scientific validation." : 'Contribute local computation. Candidates remain unconfirmed, even when every numerical check passes.';
  $('contribute-note').hidden = value !== 'contribute';
  const modes = value === 'validate' ? config.modes : { derive: ['Derive candidate: existing polygon family'], metal: ['Apple GPU wave: verify, compute and checkpoint'], ...config.experiments };
  $('mode').replaceChildren(...Object.entries(modes).map(([key, values]) => new Option(values[0], key)));
  $('mode').value = value === 'validate' ? 'all' : 'derive';
  const saved = workspaceFields[value];
  if (saved && typeof saved === 'object') for (const id of fieldIds) {
    const field = $(id), item = saved[id];
    if (typeof item === 'string' && (field.tagName !== 'SELECT' || [...field.options].some(option => option.value === item))) field.value = item;
  }
  modeFields();
  $('online-panel').hidden = true;
  remember();
}
function paint() {
  const j = state.job, active = ['running', 'stopping'].includes(state.status);
  if (!initializedPower) { if (active) restorePower(j?.power || j?.input.power); initializedPower = true; }
  const hasMisses = (state.misses || []).length > 0;
  setText('status', state.status === 'complete' && hasMisses ? 'Complete; recorded misses need review' : state.status[0].toUpperCase() + state.status.slice(1));
  $('status').dataset.state = state.status === 'complete' && hasMisses ? 'needs-review' : state.status;
  paintEvidence(j, state.misses || []);
  $('elapsed').textContent = Math.floor(state.elapsed / 3600) + 'h ' + Math.floor(state.elapsed / 60) % 60 + 'm ' + Math.floor(state.elapsed % 60) + 's';
  $('now').textContent = j?.now || 'Choose a job to begin.'; $('reason').textContent = j?.reason || '';
  $('start').disabled = busy || active || !connected; $('stop').disabled = busy || !connected || !active || state.status === 'stopping'; $('restart').disabled = busy || !connected || !j;
  $('resume').disabled=busy||!connected||active||!state.resumeAvailable;
  $('bundle').disabled=!j?.artifacts?.includes('result-bundle.tar.gz')||active;
  $('power-status').textContent=j?.power ? [j.power.reason||'Computing', 'Thermal: '+j.power.reading.thermal, 'Power: '+(j.power.reading.onBattery===true?'battery':j.power.reading.onBattery===false?'plugged in':'unknown')].join(' · ') : 'Power controls apply when a job starts.';
  $('packet').disabled = !j || active; $('download-log').disabled = !j; $('online').disabled = !j?.artifacts?.includes('candidate.json');
  $('stages').hidden = j?.input.mode !== 'derive';
  for (const li of document.querySelectorAll('[data-stage]')) li.classList.toggle('active', li.dataset.stage === j?.stage);
  if (j?.progress) { $('progress').max = j.progress.total; $('progress').value = j.progress.done; $('progress-label').textContent = j.progress.done + '/' + j.progress.total + (j.progress.unit === 'steps' ? ' GPU steps completed.' : j.progress.unit === 'samples' ? ' sweep samples completed.' : j.progress.unit === 'modules' ? ' modules inspected.' : ' registered checks finished.') + ' This is job progress, not scientific coverage.'; }
  else if (active) { $('progress').removeAttribute('value'); $('progress-label').textContent = j?.stage ? 'Stage: ' + j.stage + '. No estimated percentage.' : 'Working. Duration is unknown; see elapsed time and log.'; }
  else { $('progress').max = 1; $('progress').value = state.status === 'complete' ? 1 : 0; $('progress-label').textContent = j ? 'Job finished. Completion does not establish accuracy or originality.' : 'No job started.'; }
  const stats = j ? { Command: j.command, PID: j.pid ?? 'not assigned', 'Exit code': j.exitCode ?? 'not available', Commit: j.commit, Node: j.node, Platform: j.platform, Architecture: j.arch, macOS: j.macOS || 'not applicable', 'Last line': j.lastLine || '', 'Log folder': 'apps/validate/.runs/' + j.id } : {};
  const signature = JSON.stringify(stats);
  if (signature !== statsSignature) {
    statsSignature = signature;
    $('stats').replaceChildren(...Object.entries(stats).flatMap(([key, value]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = key; dd.textContent = value; return [dt, dd]; }));
  }
  if (!paused && $('log').textContent !== state.log) { $('log').textContent = state.log; if ($('autoscroll').checked) $('log').scrollTop = $('log').scrollHeight; }
}
async function action(name) {
  if (busy || !connected) return;
  if (name === 'start') {
    for (const input of document.querySelectorAll('.settings input, #machine-slug')) if (!input.closest('[hidden]') && !input.reportValidity()) return;
    remember();
    storage.set('genchase-validator-machine', $('machine-slug').value);
  }
  busy = true; $('error').textContent = ''; if (state) paint();
  try {
    const input = name === 'start' ? { workspace, machineSlug: $('machine-slug').value, mode: $('mode').value, power: powerSettings(), ...(workspace === 'validate' ? { id: $('technique').value } : $('mode').value === 'derive' ? { slug: $('slug').value, n: Number($('order').value), samples: Number($('samples').value) } : $('mode').value==='metal'?{grid:Number($('gpu-grid').value),steps:Number($('gpu-steps').value)}:{}) } : {};
    state = await api('/api/' + name, input);
  } catch (e) { $('error').textContent = e.message; }
  finally { busy = false; if (state) paint(); }
}
async function downloadResponse(response, name) {
  if (!response.ok) throw Error('This file is unavailable.');
  const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function artifact(name, download = true) {
  const response = await fetch('/api/artifact?job=' + encodeURIComponent(state.job.id) + '&name=' + encodeURIComponent(name), { headers: { 'X-Validator-Token': config.token } });
  if (!response.ok) throw Error('Artifact is unavailable.');
  if (!download) return response.json();
  return downloadResponse(response, name);
}
function paintEvidence(job, misses) {
  $('witness-download').disabled = !job?.artifacts?.includes('witnesses.json');
  $('hardware-download').disabled = !job?.artifacts?.includes('hardware.json');
  const card = job?.hardware || null, signature = JSON.stringify(card);
  $('hardware-card').hidden = !card;
  if (signature !== hardwareSignature) {
    hardwareSignature = signature;
    const labels = { machineSlug: 'Machine label', chipClass: 'Chip class', arch: 'Architecture', ramBucket: 'Memory range', osVersion: 'Operating system', nodeVersion: 'Node', browserVersions: 'Browser versions', webglRenderer: 'WebGL renderer', commit: 'Commit', command: 'Command', exitCode: 'Exit code', elapsedSeconds: 'Elapsed seconds' };
    $('hardware-fields').replaceChildren(...Object.entries(card || {}).filter(([key]) => labels[key]).flatMap(([key, value]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = labels[key];
      dd.textContent = value === null || value === undefined || (typeof value === 'object' && !Object.keys(value).length) ? 'Not recorded' : typeof value === 'object' ? JSON.stringify(value) : String(value);
      return [dt, dd];
    }));
  }
  setText('miss-summary', misses.length ? misses.length + ' recorded miss' + (misses.length === 1 ? '' : 'es') + ' need review. A completed job does not clear these findings.' : 'No miss packets recorded. This does not establish scientific validity.');
  $('miss-summary').dataset.state = misses.length ? 'needs-review' : 'empty';
  const missSignature = JSON.stringify(misses);
  if (missSignature === missesSignature) return;
  missesSignature = missSignature;
  $('miss-list').replaceChildren(...misses.map(miss => {
    const item = document.createElement('li'), title = document.createElement('strong'), details = document.createElement('p'), button = document.createElement('button');
    title.textContent = [miss.id || miss.kind || 'Recorded miss', miss.status].filter(Boolean).join(' · ');
    const text = value => typeof value === 'object' ? JSON.stringify(value) : String(value);
    details.textContent = [miss.reason, miss.expected !== undefined ? 'Expected: ' + text(miss.expected) : '', miss.got !== undefined ? 'Measured: ' + text(miss.got) : '', miss.recipeHash ? 'Recipe: ' + miss.recipeHash : '', miss.commit ? 'Commit: ' + miss.commit : ''].filter(Boolean).join(' · ');
    button.textContent = 'Download miss packet'; button.disabled = !miss.file;
    button.onclick = async () => {
      try { await downloadResponse(await fetch('/api/miss?file=' + encodeURIComponent(miss.file), { headers: { 'X-Validator-Token': config.token } }), miss.file); }
      catch (e) { $('error').textContent = e.message; }
    };
    item.append(title, details, button); return item;
  }));
}
$('witness-download').onclick = () => artifact('witnesses.json').catch(e => { $('error').textContent = e.message; });
$('hardware-download').onclick = () => artifact('hardware.json').catch(e => { $('error').textContent = e.message; });
for (const name of ['start', 'stop', 'restart', 'resume']) $(name).onclick = () => action(name);
for (const id of fieldIds) $(id).onchange = () => { modeFields(); remember(); };
$('validate-tab').onclick = () => choose('validate'); $('contribute-tab').onclick = $('contribute-link').onclick = () => choose('contribute');
$('pause-log').onclick = () => { paused = !paused; $('pause-log').textContent = paused ? 'Resume log' : 'Pause log'; $('pause-log').setAttribute('aria-pressed', String(paused)); if (state) paint(); };
$('copy-log').onclick = async () => {
  try {
    if (!navigator.clipboard?.writeText) throw Error('Clipboard access is unavailable. Select the log text to copy it, or download the full log.');
    await navigator.clipboard.writeText($('log').textContent);
    setText('copy-status', 'Visible log copied.');
  } catch { $('error').textContent = 'Clipboard access is unavailable. Select the log text to copy it, or download the full log.'; }
};
$('bundle').onclick=()=>artifact('result-bundle.tar.gz').catch(e=>{$('error').textContent=e.message;});
function powerSettings(){return {mode:$('power-mode').value,pauseOnBattery:$('battery-pause').checked,thermalPause:$('thermal-pause').checked};}
for (const id of ['power-mode', 'battery-pause', 'thermal-pause']) $(id).onchange = async () => {
  storage.set('genchase-validator-power', JSON.stringify(powerSettings()));
  if (state?.job && ['running', 'stopping'].includes(state.status)) {
    try { state = await api('/api/power', powerSettings()); paint(); }
    catch (e) { $('error').textContent = e.message; restorePower(state.job.power || state.job.input.power); }
  }
};
$('packet').onclick = () => artifact('paste-packet.md').catch(e => { $('error').textContent = e.message; });
$('download-log').onclick = () => artifact('job.log').catch(e => { $('error').textContent = e.message; });
$('online').onclick = async () => {
  try {
    const candidate = await artifact('candidate.json', false);
    $('queries').replaceChildren(...candidate.literature.queries.map(q => { const li = document.createElement('li'), a = document.createElement('a'); a.textContent = q; a.href = 'https://scholar.google.com/scholar?q=' + encodeURIComponent(q); a.target = '_blank'; a.rel = 'noopener noreferrer'; li.append(a); return li; }));
    $('online-panel').hidden = !$('online-panel').hidden;
  } catch (e) { $('error').textContent = e.message; }
};
(async () => {
  try {
    config = await api('/api/config'); $('technique').replaceChildren(...config.ids.map(id => new Option(id, id)));
    choose(storage.get('genchase-validator-workspace') === 'contribute' ? 'contribute' : 'validate');
    const poll = async () => { try { state = await api('/api/state'); connected = true; setText('connection', 'Connected locally'); paint(); } catch (e) { connected = false; setText('connection', 'Server unavailable. Reopen the server terminal.'); if (state) paint(); } finally { setTimeout(poll, 1000); } };
    await poll();
  } catch (e) { $('error').textContent = e.message; }
})();
