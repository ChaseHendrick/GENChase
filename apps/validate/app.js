'use strict';
const $ = id => document.getElementById(id);
let config, workspace = 'validate', state = null, paused = false, busy = false, connected = false;
// Storage may be unavailable in a private or restricted browser session.
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* Session controls still work. */ } }
};
const fieldIds = ['mode', 'technique', 'slug', 'order', 'samples', 'gpu-grid', 'gpu-steps', 'vortex-alpha', 'vortex-n', 'vortex-seeds', 'vortex-start'];
const workspaceFields = {};
try { Object.assign(workspaceFields, JSON.parse(storage.get('genchase-validator-fields') || '{}')); } catch { /* Ignore damaged preferences. */ }
function remember() {
  workspaceFields[workspace] = Object.fromEntries(fieldIds.map(id => [id, $(id).value]));
  storage.set('genchase-validator-fields', JSON.stringify(workspaceFields));
}
function setText(id, value) { if ($(id).textContent !== value) $(id).textContent = value; }
let sharePreview = null, syncedJob = '';
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
  for(const id of ['vortex-alpha-field','vortex-n-field','vortex-seeds-field','vortex-start-field'])$(id).hidden=workspace!=='contribute'||$('mode').value!=='vortex-collapse';
  $('start').textContent = derive ? 'Explore candidate' : workspace === 'validate' ? 'Run checks' : 'Run experiment';
  const hints = {inventory:'Checks the evidence catalog and source fingerprints only. No simulation benchmarks run.',fast:'Runs development checks only. Numerical accuracy and browser rendering are excluded.',all:'Runs all registered numerical and print benchmarks. Missing benchmarks are reported as incomplete coverage.',full:'Runs development checks first, then all registered numerical and print benchmarks. Requires Playwright and Chromium.',numerical:'Runs registered numerical benchmarks. Print checks are excluded.',witnesses:'Collects the measurements exposed by all modules. A missing measurement remains unassessed.',witness:'Collects one module’s exposed measurement. This alone does not establish scientific accuracy.',plate:'Checks that a plate runs, draws and repeats from its seed. This is a runtime check.',print:'Exercises an 8-inch, 300 ppi export. Export success alone does not establish scientific accuracy.',technique:'Runs the chosen technique’s registered numerical and print evidence.',derive:'Explores an existing polygon family for candidate formulas. A fitted result is not proof of originality.','vortex-collapse':'Searches for self-similar vortex collapses with the least winding. Each minimum is certified to second order, checked against conservation laws and a separate time integration, and given its stability exponents. A certified local minimum is not a proof of a global minimum.',metal:'Runs a bounded native Apple GPU wave workload.'};
  setText('job-help', hints[$('mode').value] || 'Runs the selected bounded research experiment. Read its result limits.');
}
function choose(value) {
  if (config && $('mode').options.length) remember();
  workspace = value; storage.set('genchase-validator-workspace', value);
  $('validate-tab').setAttribute('aria-pressed', value === 'validate'); $('contribute-tab').setAttribute('aria-pressed', value === 'contribute');
  $('workspace-title').textContent = value === 'validate' ? 'Check simulations' : 'Run experiments';
  $('workspace-description').textContent = value === 'validate' ? "Compare existing simulations with registered benchmarks and check their exports. Each result names its tested scope." : 'Explore formula candidates, parameter searches and experimental GPU workloads. Candidate formulas still need review.';
  $('contribute-note').hidden = value !== 'contribute';
  const modes = value === 'validate' ? config.modes : { 'vortex-collapse': ['Open problem: least-winding vortex collapse'], derive: ['Derive candidate: existing polygon family'], metal: ['Apple GPU wave: verify, compute and checkpoint'], ...config.experiments };
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
  if (active && j && syncedJob !== j.id) {
    syncedJob=j.id;choose(j.input.workspace || 'validate');$('mode').value=j.input.mode;
    const fields=j.input.mode==='vortex-collapse'?{alpha:'vortex-alpha',n:'vortex-n',samples:'vortex-seeds',start:'vortex-start'}:{id:'technique',slug:'slug',n:'order',samples:'samples',grid:'gpu-grid',steps:'gpu-steps'};
    for(const [key,id] of Object.entries(fields))if(j.input[key]!==undefined)$(id).value=String(j.input[key]);
    $('machine-slug').value=j.input.machineSlug || 'm1pro';$('share-auto').checked=!!j.input.shareAutomatically;restorePower(j.power || j.input.power);modeFields();
  }
  for(const element of document.querySelectorAll('.settings input,.settings select,#machine-slug,#share-auto,#validate-tab,#contribute-tab'))element.disabled=active;
  if (!initializedPower) { if (active) restorePower(j?.power || j?.input.power); initializedPower = true; }
  const hasMisses = (state.misses || []).some(m=>m.jobId===j?.id || (!m.jobId && m.commit===j?.commit && m.recorded>=j?.started && m.recorded<=(j?.ended || new Date().toISOString())));
  const incomplete = !!j?.incomplete;
  setText('share-policy', j ? 'This run: automatic sharing '+(j.input.shareAutomatically?'enabled':'off')+'. Restart and resume retain this setting.' : 'Sharing is off unless you opt in.');
  setText('status', incomplete ? 'Checks finished; evidence coverage is incomplete' : state.status === 'complete' && hasMisses ? 'Run complete; findings need review' : state.status === 'complete' ? 'Run complete' : state.status === 'failed' ? 'Run failed' : state.status[0].toUpperCase() + state.status.slice(1));
  $('status').dataset.state = incomplete || (state.status === 'complete' && hasMisses) ? 'needs-review' : state.status;
  paintEvidence(j, state.misses || []);
  const submission = state.submission || {};
  const uploading = submission.status === 'uploading';
  $('share-preview').disabled = active || uploading || !j?.ended || !connected;
  $('share-submit').disabled = active || uploading || !connected || sharePreview?.job !== j?.id || !sharePreview;
  setText('share-status', submission.message || 'Nothing shared. Review the file list or enable automatic sharing before starting a run.');
  const url = submission.url;
  $('share-link').hidden = !/^https:\/\/github\.com\/SharpMeow\/GENChase\/pull\/[0-9]+$/.test(url || '');
  if (!$('share-link').hidden) $('share-link').href = url;
  $('share-submit').textContent = ['failed', 'interrupted'].includes(submission.status) ? 'Retry upload' : 'Upload and open review';
  $('elapsed').textContent = Math.floor(state.elapsed / 3600) + 'h ' + Math.floor(state.elapsed / 60) % 60 + 'm ' + Math.floor(state.elapsed % 60) + 's';
  $('now').textContent = j?.now || 'Choose a job to begin.'; $('reason').textContent = j?.reason || '';
  $('start').disabled = busy || active || !connected; $('stop').disabled = busy || !connected || !active || state.status === 'stopping'; $('restart').disabled = busy || !connected || !j || active;
  $('resume').disabled=busy||!connected||active||!state.resumeAvailable;
  $('bundle').disabled=!j?.artifacts?.includes('result-bundle.tar.gz')||active;
  $('power-status').textContent=j?.power ? [j.power.reason||'Computing', 'Thermal: '+j.power.reading.thermal, 'Power: '+(j.power.reading.onBattery===true?'battery':j.power.reading.onBattery===false?'plugged in':'unknown')].join(' · ') : 'Power controls apply when a job starts.';
  $('packet').disabled = !j || active; $('download-log').disabled = !j; $('online').disabled = !j?.artifacts?.includes('candidate.json');
  $('stages').hidden = j?.input.mode !== 'derive';
  for (const li of document.querySelectorAll('[data-stage]')) li.classList.toggle('active', li.dataset.stage === j?.stage);
  if (j?.progress) { $('progress').max = j.progress.total; $('progress').value = j.progress.done; $('progress-label').textContent = j.progress.done + '/' + j.progress.total + (j.progress.unit === 'steps' ? ' GPU steps completed.' : j.progress.unit === 'samples' ? ' sweep samples completed.' : j.progress.unit === 'seeds' ? ' seeds searched.' : j.progress.unit === 'modules' ? ' modules inspected.' : ' registered checks finished.') + ' This is job progress, not scientific coverage.'; }
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
    const input = name === 'start' ? { workspace, shareAutomatically: $('share-auto').checked, machineSlug: $('machine-slug').value, mode: $('mode').value, power: powerSettings(), ...(workspace === 'validate' ? (['technique','plate','print','witness'].includes($('mode').value) ? { id: $('technique').value } : {}) : $('mode').value === 'derive' ? { slug: $('slug').value, n: Number($('order').value), samples: Number($('samples').value) } : $('mode').value==='metal'?{grid:Number($('gpu-grid').value),steps:Number($('gpu-steps').value)}:$('mode').value==='vortex-collapse'?{alpha:Number($('vortex-alpha').value),n:Number($('vortex-n').value),samples:Number($('vortex-seeds').value),...($('vortex-start').value===''?{}:{start:Number($('vortex-start').value)})}:{}) } : {};
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
  setText('miss-summary', misses.length ? misses.length + ' saved finding' + (misses.length === 1 ? '' : 's') + ' across runs. Earlier findings stay visible after a later run succeeds.' : 'No miss packets recorded. This does not establish scientific validity.');
  $('miss-summary').dataset.state = misses.length ? 'needs-review' : 'empty';
  const missSignature = JSON.stringify(misses);
  if (missSignature === missesSignature) return;
  missesSignature = missSignature;
  $('miss-list').replaceChildren(...misses.map(miss => {
    const item = document.createElement('li'), title = document.createElement('strong'), details = document.createElement('p'), button = document.createElement('button');
    title.textContent = [miss.kind==='command-failure' ? 'Execution failure' : miss.id || miss.kind || 'Recorded miss', miss.status].filter(Boolean).join(' · ');
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
$('validate-tab').onclick = () => choose('validate'); $('contribute-tab').onclick = () => choose('contribute');
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
    config = await api('/api/config');setText('setup-status',config.setup?.message || '');$('setup-status').dataset.ready=String(config.setup?.ready===true); $('technique').replaceChildren(...config.ids.map(id => new Option(id, id)));
    choose(storage.get('genchase-validator-workspace') === 'contribute' ? 'contribute' : 'validate');
    const poll = async () => { try { state = await api('/api/state'); connected = true; setText('connection', 'Connected locally'); paint(); } catch (e) { connected = false; setText('connection', 'Server unavailable. Reopen the server terminal.'); if (state) paint(); } finally { setTimeout(poll, 1000); } };
    await poll();
  } catch (e) { $('error').textContent = e.message; }
})();

$('share-preview').onclick = async () => {
  try {
    const job = state.job.id, preview = await api('/api/share-preview?job=' + encodeURIComponent(job));
    sharePreview = {...preview, job};
    $('share-files').replaceChildren(...preview.files.map(f => { const li = document.createElement('li'); const button=document.createElement('button'); button.textContent = f.name + ' (' + f.bytes.toLocaleString() + ' bytes)'; button.onclick=async()=>{try{const data=await api('/api/share-file?job='+encodeURIComponent(job)+'&name='+encodeURIComponent(f.name));setText('share-content-name',data.name);setText('share-content',data.content);$('share-content-panel').hidden=false;$('share-content-panel').open=true;}catch(e){$('error').textContent=e.message;}};li.append(button);return li; }));
    paint();
  } catch(e) { $('error').textContent = e.message; }
};
$('share-submit').onclick = async () => {
  if (!sharePreview) return;
  $('share-submit').disabled = true;
  try { state.submission = await api('/api/share', {job:sharePreview.job, digest:sharePreview.digest}); paint(); }
  catch(e) { $('error').textContent = e.message; paint(); }
};
