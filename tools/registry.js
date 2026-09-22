// Read registration metadata from maintained source without starting a browser.
// Only registrations run: renderers are never constructed by this build helper.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

function metadata(root, files, sources) {
  // The assembler already read these exact sources. Reuse its per-call snapshot, never a
  // process-wide cache: the next invocation must observe edits and newly added files.
  const readSource = file => sources && sources.has(file)
    ? sources.get(file) : fs.readFileSync(path.join(root, 'src', file), 'utf8');
  const modules = [], ids = new Set(), noop = () => {};
  const glsl = new Proxy({}, { get: () => '' });
  const gl = new Proxy({ GLSL: glsl }, { get: (obj, key) => obj[key] || noop });
  const util = new Proxy({ clamp: (x, a, b) => Math.max(a, Math.min(b, x)), hexToRgb: () => [0, 0, 0], makeRng: () => ({}) }, { get: (obj, key) => obj[key] || noop });
  const palettes = new Proxy({}, { get: () => ({ colors: ['#000000'], bg: '#000000' }) });
  const shell = readSource('shared/engine.js');
  const familiarity = {}, aliases = {};
  const familyBlock = /const FAMILIARITY = \{([\s\S]*?)\n  \};/.exec(shell);
  if (familyBlock) for (const m of familyBlock[1].matchAll(/^\s*'?([A-Za-z0-9_-]+)'?\s*:\s*'([^']+)'/gm)) familiarity[m[1]] = m[2];
  const aliasBlock = /const ALIAS = \{([^}]*)\}/.exec(shell);
  if (aliasBlock) for (const m of aliasBlock[1].matchAll(/['"]?([A-Za-z0-9_-]+)['"]?\s*:\s*'([^']+)'/g)) aliases[m[1]] = m[2];
  if (!files) files = [...fs.readFileSync(path.join(root, 'src/studio.html'), 'utf8').matchAll(/\{\{include:(modules\/[a-z0-9-]+\.js)\}\}/g)].map(m => m[1]);
  for (const file of files) {
    const source = readSource(file);
    const registered = [];
    const Studio = { util, gl, PALETTES: palettes, register: m => registered.push(m) };
    const context = { Studio, console, Math, Number, JSON, Date, Intl, performance: { now: () => 0 },
      Float32Array, Float64Array, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array, ArrayBuffer,
      setTimeout: noop, clearTimeout: noop, requestAnimationFrame: noop, document: {}, window: {} };
    new vm.Script(source, { filename: file }).runInNewContext(context, { timeout: 5000 });
    if (!registered.length) throw Error('Module registers no techniques: ' + file);
    for (const m of registered) {
      if (!/^[a-z0-9-]+$/.test(m.id || '')) throw Error('Invalid technique id in ' + file);
      if (ids.has(m.id)) throw Error('Duplicate technique id: ' + m.id);
      ids.add(m.id);
      const d = m.defaults || {};
      modules.push({
        id: m.id, source: 'src/' + file, name: m.name || m.id, tab: m.tab || '', subtitle: m.subtitle || '',
        equation: m.equation || '', credit: m.credit || '', blurb: m.blurb || '', order: typeof m.order === 'number' ? m.order : 999,
        seed: d.seed || '', presets: Object.keys(m.presets || {}), vectors: /exportSVG\s*\(/.test(String(m.create || '')),
        familiarity: m.familiarity || familiarity[m.id] || '', liveCapable: Object.prototype.hasOwnProperty.call(d, 'running'),
        runningDefault: !!d.running, headline: m.headline || '',
      });
    }
  }
  modules.sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));
  return { techniques: modules, aliases };
}

module.exports = { metadata };
