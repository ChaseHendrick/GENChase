/* Child recipes for art-evolve. Node tests call child() with synthetic modules; the art runner injects this
   file into the studio page and hands it the engine's own makeRng, the tab's surprise() and palettes.
   Values come only from the parent or from the module's own surprise draws for the same model selector.
   Numerical and structural keys never move, and the engine's sanitizers still run on every child. That is
   not a guarantee of physical validity: joint constraints between keys are not checked, so every child is
   an unvalidated recipe. */
(function (root) {
  'use strict';
  const FIXED = ['running', 'steps', 'warmup', 'grid', 'aspect', 'dt', 'bc', 'lap'];
  const SELECTORS = ['model', 'tmodel', 'system', 'mode'];
  const META = ['seed', 'palette', 'bg', 'v'];
  // Weights reseed 0.35, repalette 0.15, nudge 0.40, renormalized: the 0.10 whole-surprise jump is not offered yet.
  function operatorFor(u) { const x = u * 0.9; return x < 0.35 ? 'reseed' : x < 0.5 ? 'repalette' : 'nudge'; }
  const pick = (rng, list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  function decimals(x) {
    const s = String(x), e = s.indexOf('e-');
    if (e >= 0) return Number(s.slice(e + 2)) + ((s.slice(0, e).split('.')[1] || '').length);
    return (s.split('.')[1] || '').length;
  }
  function snap(f, v) {
    const step = Number(f.step) > 0 ? Number(f.step) : 0;
    let out = step ? f.min + Math.round((v - f.min) / step) * step : v;
    out = Number(out.toFixed(Math.min(15, Math.max(decimals(step), decimals(f.min)))));
    return Math.min(f.max, Math.max(f.min, out));
  }
  function seedText(rng) { let s = 'e-'; for (let i = 0; i < 8; i++) s += Math.floor(rng() * 36).toString(36); return s; }
  function allowedKeys(schema) { return new Set(schema.filter(f => f.type !== 'action').map(f => f.key).concat(META)); }
  function unknownKeys(payload, schema) { const ok = allowedKeys(schema); return Object.keys(payload).filter(k => !ok.has(k)); }
  function paletteDraw(rng, api) {
    const pal = rng() < 0.5 ? api.generatePalette(rng) : api.PALETTES[pick(rng, Object.keys(api.PALETTES).sort())];
    return { palette: pal.colors.slice(), bg: pal.bg };
  }
  function nudge(rng, prefix, P, api, byKey) {
    if (typeof api.surprise !== 'function') return null;
    let D = null;
    for (let t = 0; t < 20 && !D; t++) {
      const d = api.surprise(api.makeRng(prefix + '/nudge/' + t), JSON.parse(JSON.stringify(P))) || {};
      if (SELECTORS.every(k => !(k in d) || !byKey[k] || d[k] === P[k])) D = d;
    }
    if (!D) return null;
    const keys = Object.keys(D).filter(k => {
      const f = byKey[k];
      if (!f || f.type === 'action' || FIXED.includes(k) || SELECTORS.includes(k) || META.includes(k)) return false;
      if (typeof f.dimUnless === 'function' && !f.dimUnless(P)) return false;
      if (f.type === 'range') return Number.isFinite(Number(D[k])) && Number.isFinite(Number(P[k]));
      if (f.type === 'seg') return f.options.some(o => o[0] === D[k]);
      return f.type === 'toggle' && typeof D[k] === 'boolean';
    }).sort();
    const proposals = [];
    for (const k of keys) {
      const f = byKey[k];
      const v = f.type === 'range' ? snap(f, Number(P[k]) + (0.25 + 0.75 * rng()) * (Number(D[k]) - Number(P[k]))) : D[k];
      if (JSON.stringify(v) !== JSON.stringify(P[k])) proposals.push([k, v]);
    }
    if (!proposals.length) return null;
    const count = Math.min(proposals.length, rng() < 0.5 ? 1 : 2), changes = {};
    while (Object.keys(changes).length < count) { const [k, v] = pick(rng, proposals.filter(([key]) => !(key in changes))); changes[k] = v; }
    return changes;
  }
  // parent: { payload: recipe diff without id (as Studio.getRecipe returns it), state: the full sanitized state }.
  // Child j of generation g from parent P uses makeRng(digest + '/evolve/' + g + '/' + j), digest = sha256(P's hash).
  function child({ parent, generation, index, digest, api }) {
    const prefix = digest + '/evolve/' + generation + '/' + index, rng = api.makeRng(prefix);
    const byKey = Object.fromEntries(api.schema.map(f => [f.key, f])), P = parent.state;
    let operator = operatorFor(rng()), changes = null;
    const requested = operator;
    if (operator === 'nudge') { changes = nudge(rng, prefix, P, api, byKey); if (!changes) operator = 'repalette'; }
    if (operator === 'repalette') { if (api.palette) changes = paletteDraw(rng, api); else operator = 'reseed'; }
    if (operator === 'reseed') changes = { seed: seedText(rng) };
    const payload = { ...parent.payload, ...changes };
    payload.running = false; payload.warmup = P.warmup;
    for (const k of FIXED) if (k !== 'running' && k !== 'warmup') { if (k in parent.payload) payload[k] = parent.payload[k]; else delete payload[k]; }
    return { operator, requested, changed: Object.keys(changes).sort(), payload };
  }
  const api = { FIXED, SELECTORS, META, operatorFor, snap, seedText, allowedKeys, unknownKeys, child };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GenChaseArtEvolve = api;
})(typeof window === 'undefined' ? globalThis : window);
