// node tools/check.js <id> [waitMs=8000]
// Full check for one tab: default plate, every preset, the same hash loaded twice, and a tab switch away and back.
// Set STUDIO=path/to/studio.html to check a test copy built with tools/inject.js.
const path = require('path');
const { chromium } = require('playwright');

const NOISE = [/willReadFrequently/, /ERR_CERT_AUTHORITY_INVALID/, /ServiceWorkerRegistration/];
const b64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function measure(p) {
  return p.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent !== null && c.width > 100);
    const c = cs[0]; if (!c) return { err: 'no visible canvas', visibleCanvases: cs.length };
    const t = document.createElement('canvas'); t.width = 200; t.height = Math.max(1, Math.round(200 * c.height / c.width));
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, t.width, t.height);
    const d = g.getImageData(0, 0, t.width, t.height).data, L = [];
    let h = 2166136261;
    for (let i = 0; i < d.length; i += 4) { L.push(Math.round(.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2])); h ^= d[i]; h = Math.imul(h, 16777619); h ^= d[i + 1]; h = Math.imul(h, 16777619); }
    L.sort((a, b) => a - b); const q = f => L[Math.floor(f * (L.length - 1))];
    const st = document.querySelector('#status');
    return { canvas: c.width + 'x' + c.height, visibleCanvases: cs.length, fp: (h >>> 0).toString(16),
      lum: { p01: q(.01), p10: q(.1), p50: q(.5), p90: q(.9), p99: q(.99) },
      status: st ? st.innerText.replace(/\s+/g, ' ').slice(0, 200) : null };
  });
}
const flat = m => !m.lum || (m.lum.p99 - m.lum.p01) < 12;

(async () => {
  const id = process.argv[2], wait = +(process.argv[3] || 8000);
  if (!id) { console.error('usage: node tools/check.js <id> [waitMs]'); process.exit(1); }
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const url = 'file://' + studio;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const fails = [];
  const errs = [];
  const open = async hash => {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
    p.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.some(r => r.test(t))) errs.push(m.type() + ': ' + t); });
    p.on('pageerror', e => { if (!NOISE.some(r => r.test(e.message))) errs.push('pageerror: ' + e.message); });
    await p.goto(url + '#' + hash);
    return p;
  };

  // 1. default plate with a fixed seed
  const seed = 'check-' + id;
  const p = await open(id + '/' + seed);
  await p.waitForTimeout(wait);
  const def = await measure(p);
  console.log('default', JSON.stringify(def));
  if (def.err) fails.push('default: ' + def.err);
  else if (flat(def)) fails.push('default plate is flat');

  // 2. every preset
  const presets = await p.evaluate(() => [...document.querySelectorAll('#preset option')].map(o => o.value).filter(Boolean));
  for (const key of presets) {
    await p.evaluate(k => { const s = document.querySelector('#preset'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true })); }, key);
    await p.waitForTimeout(wait);
    const m = await measure(p);
    console.log('preset ' + key, JSON.stringify(m));
    if (m.err) fails.push('preset ' + key + ': ' + m.err);
    else if (flat(m)) fails.push('preset ' + key + ' is flat');
  }
  if (!presets.length) fails.push('no presets registered');

  // 3. same hash twice must give the same plate (running:false so living fields stop after warm-up)
  const still = id + '/' + seed + '/' + b64url({ running: false });
  const a1 = await open(still); await a1.waitForTimeout(wait); const m1 = await measure(a1); await a1.close();
  const a2 = await open(still); await a2.waitForTimeout(wait); const m2 = await measure(a2);
  console.log('determinism', JSON.stringify({ first: m1.fp, second: m2.fp, same: m1.fp === m2.fp }));
  if (m1.fp !== m2.fp) fails.push('same hash loaded twice gave different plates');

  // 4. switch to another tab and back: exactly one visible canvas
  const other = await a2.evaluate(me => { const t = [...document.querySelectorAll('button.tab[data-id]')].find(x => x.dataset.id !== me); return t ? t.dataset.id : null; }, id);
  if (other) {
    await a2.evaluate(o => document.querySelector('button.tab[data-id="' + o + '"]').click(), other);
    await a2.waitForTimeout(1200);
    await a2.evaluate(o => document.querySelector('button.tab[data-id="' + o + '"]').click(), id);
    await a2.waitForTimeout(1200);
    const m3 = await measure(a2);
    console.log('tabswitch', JSON.stringify({ via: other, visibleCanvases: m3.visibleCanvases, lum: m3.lum }));
    if (m3.visibleCanvases !== 1) fails.push('after tab switch, visible canvases = ' + m3.visibleCanvases);
    if (m3.err || flat(m3)) fails.push('plate flat or missing after tab switch');
  }
  await a2.close(); await p.close();
  await b.close();

  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('console errors:\n  ' + uniq.join('\n  ')); fails.push(uniq.length + ' console error(s)'); }
  console.log(fails.length ? 'FAIL ' + id + ': ' + fails.join('; ') : 'PASS ' + id);
  process.exit(fails.length ? 1 : 0);
})();
