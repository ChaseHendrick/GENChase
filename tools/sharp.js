// node tools/sharp.js <id> [inches=8] [dpi=300] [settleMs=9000]
// Measures how much real detail a technique's print export actually carries.
//
// export.js proves a sheet comes out and is not blank. It says nothing about whether the sheet is
// sharp, and a plate can pass every check in this repository while being a few hundred simulation
// cells smeared across two thousand pixels. At README scale that reads as blurry; on paper at
// twenty-four inches it reads as a mistake. This is the check that catches it.
//
// Two numbers, because one is not enough. A plate is sharp if it has hard edges OR fine texture, and
// soft only if it has neither:
//
//   edge    the 99th percentile of the one-pixel difference, over the plate's own contrast. Geometry
//           drawn as marks scores above one whatever the rest of the plate is doing. A Penrose tiling
//           is mostly the flat insides of tiles, so any average-based measure calls it blurry; this
//           does not, because its tile edges are still hard steps.
//   acuity  mad(1) / mad(16): how much of the average detail survives at the pixel scale. A magnified
//           field has none, and its mad values double with every doubling of d, which is the signature
//           of a smooth ramp with nothing under it.
//
// Soft means edge below 0.8 AND acuity below 0.15. That is a field a few hundred cells across smeared
// over two thousand pixels, and on paper at twenty-four inches it reads as a mistake.
const path = require('path');
const { chromium } = require('playwright');

const NOISE = [/willReadFrequently/, /ERR_CERT_AUTHORITY_INVALID/, /ServiceWorkerRegistration/, /GL Driver Message.*Performance/];

(async () => {
  const id = process.argv[2];
  const inches = +(process.argv[3] || 8);
  const dpi = +(process.argv[4] || 300);
  const settle = +(process.argv[5] || 9000);
  if (!id) { console.error('usage: node tools/sharp.js <id> [inches] [dpi] [settleMs]'); process.exit(1); }

  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('console', () => {});
  // An id with a slash in it is taken as a whole hash, so a tab can be measured at a chosen grid
  // rather than only at its default.
  const hash = id.includes('/') ? id : id + '/sharp-' + id;
  await p.goto('file://' + studio + '#' + hash, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(2500);

  await p.evaluate(([inches, dpi]) => {
    const i = document.querySelector('#export-inches'), d = document.querySelector('#export-dpi');
    if (i) { i.value = String(inches); i.dispatchEvent(new Event('change', { bubbles: true })); }
    if (d) { d.value = String(dpi); d.dispatchEvent(new Event('change', { bubbles: true })); }
    // the colophon pads the sheet with a white margin, which would dominate the measurement
    const c = document.querySelector('#export-colophon');
    if (c && c.checked) { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }
  }, [inches, dpi]);
  await p.waitForTimeout(settle);

  await p.evaluate(() => {
    const img = document.querySelector('#export-img');
    if (img) { img.removeAttribute('src'); img.hidden = true; }
    const n = document.querySelector('#export-note');
    if (n) n.classList.remove('err');
    document.querySelector('#btn-export').click();
  });

  let state = 'timeout';
  try {
    state = await p.waitForFunction(() => {
      const img = document.querySelector('#export-img');
      const n = document.querySelector('#export-note');
      if (n && n.classList.contains('err')) return 'err';
      if (img && !img.hidden && img.getAttribute('src')) return 'ok';
      return false;
    }, null, { timeout: 240000, polling: 500 }).then(h => h.jsonValue());
  } catch (e) { state = 'timeout'; }

  if (state !== 'ok') {
    console.log(JSON.stringify({ id, state }));
    await b.close();
    return;
  }

  const res = await p.evaluate(async () => {
    const img = document.querySelector('#export-img');
    const url = img.getAttribute('src');
    const im = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
    const W = im.naturalWidth, H = im.naturalHeight;
    // A central crop, at native pixels: measuring a downscaled copy would answer a question about the
    // downscaler instead of about the plate.
    const S = Math.min(1100, W, H);
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, Math.floor((W - S) / 2), Math.floor((H - S) / 2), S, S, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data;
    const L = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    const diffs = k => {
      const out = [];
      for (let y = 0; y < S; y += 2) for (let x = 0; x + k < S; x += 2) out.push(Math.abs(L[y * S + x + k] - L[y * S + x]));
      for (let y = 0; y + k < S; y += 2) for (let x = 0; x < S; x += 2) out.push(Math.abs(L[(y + k) * S + x] - L[y * S + x]));
      return out;
    };
    const m = {};
    let edgeP99 = 0;
    for (const k of [1, 2, 4, 8, 16, 32]) {
      const a = diffs(k);
      let acc = 0; for (const v of a) acc += v;
      m['d' + k] = +(acc / Math.max(1, a.length)).toFixed(3);
      if (k === 1) { a.sort((x, y2) => x - y2); edgeP99 = a[Math.floor(0.99 * (a.length - 1))] || 0; }
    }
    let mean = 0; for (let i = 0; i < L.length; i++) mean += L[i]; mean /= L.length;
    let sd = 0; for (let i = 0; i < L.length; i++) sd += (L[i] - mean) * (L[i] - mean);
    sd = Math.sqrt(sd / L.length);
    return { W, H, sd: +sd.toFixed(2), mad: m, edgeP99: +edgeP99.toFixed(2), note: ((document.querySelector('#export-note') || {}).textContent || '').slice(0, 200) };
  }).catch(e => ({ err: String(e && e.message || e) }));

  if (res.err) { console.log(JSON.stringify({ id, err: res.err })); await b.close(); return; }
  // Edge acutance, not average detail. Averaging over the whole plate answers a question about how much
  // of it is flat: a Penrose tiling is mostly the insides of tiles, where neighboring pixels are
  // identical, so it scores as badly as a blurred field while having perfectly hard edges. What separates
  // the two is whether the plate has any hard edges at all, so this takes the 99th percentile of the
  // one-pixel difference against the plate's own contrast. Crisp geometry comes out near or above one.
  const edge = res.sd > 0.5 ? res.edgeP99 / res.sd : 0;
  const acuity = res.mad.d16 > 0.01 ? res.mad.d1 / res.mad.d16 : 0;
  const verdict = (edge >= 0.8 || acuity >= 0.15) ? 'sharp' : (edge >= 0.5 || acuity >= 0.10) ? 'ok' : 'SOFT';
  console.log(JSON.stringify({
    id: id.split('/')[0], size: res.W + 'x' + res.H, contrast: res.sd,
    edge: +edge.toFixed(2), acuity: +acuity.toFixed(3), verdict, mad: res.mad,
    grid: /field is (\d+) × (\d+)/.exec(res.note) ? RegExp.$1 + 'x' + RegExp.$2 : null,
  }));
  await b.close();
})();
