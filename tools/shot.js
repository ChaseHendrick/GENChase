// node tools/shot.js <hash, e.g. ising or "ising/my-seed"> [waitMs=6000] [outName]
// Set STUDIO=path/to/studio.html to shoot a different file (used for testing a single block in isolation).
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const hash = process.argv[2], wait = +(process.argv[3] || 6000);
  const out = process.argv[4] || hash.replace(/[^a-z0-9]+/gi, '_');
  const dir = path.join(__dirname, 'shots'); fs.mkdirSync(dir, { recursive: true });
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'dist', 'studio.html');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + studio + '#' + hash);
  await p.waitForTimeout(wait);
  await p.screenshot({ path: path.join(dir, out + '.png') });
  const info = await p.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent !== null && c.width > 100);
    const c = cs[0]; if (!c) return { err: 'no visible canvas' };
    const t = document.createElement('canvas'); t.width = 200; t.height = Math.round(200 * c.height / c.width);
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, t.width, t.height);
    const d = g.getImageData(0, 0, t.width, t.height).data, L = [];
    for (let i = 0; i < d.length; i += 4) L.push(Math.round(.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]));
    L.sort((a, b) => a - b); const q = f => L[Math.floor(f * (L.length - 1))];
    const st = document.querySelector('#status,.status,[id*=status]');
    return { canvas: c.width + 'x' + c.height, visibleCanvases: cs.length,
      lum: { p01: q(.01), p10: q(.1), p50: q(.5), p90: q(.9), p99: q(.99) },
      status: st ? st.innerText.replace(/\s+/g, ' ').slice(0, 300) : null, png: t.toDataURL() };
  });
  if (info.png) { fs.writeFileSync(path.join(dir, out + '-canvas.png'), Buffer.from(info.png.split(',')[1], 'base64')); delete info.png; }
  console.log(JSON.stringify(info));
  console.log(errs.length ? errs.join('\n') : 'no console errors');
  await b.close();
})();
