// node tools/preset.js <id> <presetKey> [waitMs=12000] [outName]
// Applies one preset and measures the plate, like shot.js but through the Presets menu. STUDIO selects the file.
const { glArgs } = require('./lib/gl-args');
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const id = process.argv[2], key = process.argv[3], wait = +(process.argv[4] || 12000), out = process.argv[5] || (id + '-' + key);
  if (!id || !key) { console.error('usage: node tools/preset.js <id> <presetKey> [waitMs] [outName]'); process.exit(1); }
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'dist', 'studio.html');
  const dir = path.join(__dirname, 'shots'); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ args: [...glArgs(), '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('pageerror', e => { if (!/ServiceWorker/.test(e.message)) errs.push(e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/CERT|ServiceWorker/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + studio + '#' + id + '/preset-' + id, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(1200);
  const ok = await p.evaluate(k => { const s = document.querySelector('#preset'); if (![...s.options].some(o => o.value === k)) return false; s.value = k; s.dispatchEvent(new Event('change', { bubbles: true })); return true; }, key);
  if (!ok) { console.log('no such preset'); await b.close(); process.exit(1); }
  await p.waitForTimeout(wait);
  const info = await p.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].find(c => c.offsetParent !== null && c.width > 100); if (!c) return { err: 'no visible canvas' };
    const t = document.createElement('canvas'); t.width = 200; t.height = Math.max(1, Math.round(200 * c.height / c.width));
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, t.width, t.height);
    const d = g.getImageData(0, 0, t.width, t.height).data, L = [];
    for (let i = 0; i < d.length; i += 4) L.push(Math.round(.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]));
    L.sort((a, b) => a - b); const q = f => L[Math.floor(f * (L.length - 1))];
    return { lum: { p01: q(.01), p10: q(.1), p50: q(.5), p90: q(.9), p99: q(.99) }, status: (document.querySelector('#status') || {}).innerText, png: t.toDataURL() };
  });
  if (info.png) { fs.writeFileSync(path.join(dir, out + '-canvas.png'), Buffer.from(info.png.split(',')[1], 'base64')); delete info.png; }
  console.log(JSON.stringify(info));
  if (errs.length) console.log('errors: ' + [...new Set(errs)].join(' | '));
  await b.close();
})();
