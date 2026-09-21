// node tools/export.js <id> [inches=8] [dpi=300] [settleMs=7000] [exportMs=180000]
// Drives the studio's own export path and checks what comes out.
//
// check.js primarily inspects the on-screen canvas. Export is a separate rendering path:
// some techniques evaluate geometry at print dimensions, while grid simulations render their
// existing finite-resolution state into more pixels. This checks the artifact, not paper accuracy.
//
// This presses the export button for the default plate and for every preset, waits for the sheet,
// then decodes the resulting blob and fails on: an export the studio reported as failed, a blob that
// will not decode, dimensions that do not match the requested print size, or a blank sheet. It goes
// through the real UI rather than reaching into the shell, so the print sizing, the supersampling
// and the vector RIP are all covered as the user meets them.
//
// Set STUDIO=path/to/studio.html to test a copy.
const path = require('path');
const { chromium } = require('playwright');

const NOISE = [/willReadFrequently/, /ERR_CERT_AUTHORITY_INVALID/, /ServiceWorkerRegistration/, /GL Driver Message.*Performance/];

// Same standard the plate harness uses: alive as a broad tonal field, or as marks on a ground.
// Downsampling a 2400 px line drawing to 400 px can collapse p99-p01 below 12 while the strokes
// are still there (linedrawing: p99-p01 = 11, ink = 0.012). Ink fraction is the marks-on-a-ground
// test and does not need a 40-level range after that downsample.
const blank = m => !m.lum || ((m.lum.p99 - m.lum.p01) < 12 && m.lum.ink < 0.004);

(async () => {
  const id = process.argv[2];
  const inches = +(process.argv[3] || 8);
  const dpi = +(process.argv[4] || 300);
  const settle = +(process.argv[5] || 7000);
  const exportMs = +(process.argv[6] || 180000);
  if (!id) { console.error('usage: node tools/export.js <id> [inches] [dpi] [settleMs] [exportMs]'); process.exit(1); }

  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !NOISE.some(r => r.test(t))) errs.push(t); });
  p.on('pageerror', e => { if (!NOISE.some(r => r.test(e.message))) errs.push('pageerror: ' + e.message); });
  await p.goto('file://' + studio + '#' + id + '/export-' + id, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(2500);

  // Print size is a user control, so set it the way a user would.
  const sized = await p.evaluate(([inches, dpi]) => {
    const i = document.querySelector('#export-inches'), d = document.querySelector('#export-dpi');
    if (!i || !d) return false;
    if (![...i.options].some(o => +o.value === inches) || ![...d.options].some(o => +o.value === dpi)) return false;
    i.value = String(inches); i.dispatchEvent(new Event('change', { bubbles: true }));
    d.value = String(dpi); d.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [inches, dpi]);
  if (!sized) { console.log('FAIL ' + id + ': the print size controls do not offer ' + inches + ' in at ' + dpi + ' ppi'); await b.close(); process.exit(1); }

  const fails = [];
  const presets = await p.evaluate(() => [...document.querySelectorAll('#preset option')].map(o => o.value).filter(Boolean));
  // The default plate, then each preset: a technique can export fine at its defaults and fail on the
  // preset that raises its grid or switches its view.
  const cases = [''].concat(presets);

  for (const key of cases) {
    const label = key || '(default)';
    if (key) {
      await p.evaluate(k => { const s = document.querySelector('#preset'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true })); }, key);
    }
    await p.waitForTimeout(settle);

    // A fixed delay is not completion: large particle presets can still be preparing
    // on CI. Comparing their evolving canvas with an earlier export is meaningless.
    try {
      await p.waitForFunction(() => !/preparing|warming up/i.test(document.querySelector('#status').textContent), null, {timeout: exportMs});
    } catch {
      fails.push(label + ': preparation did not finish before the export deadline');
      continue;
    }
    const ready = await p.evaluate(id => {
      const running = document.getElementById('p-' + id + '-running');
      if (running && (running.checked || running.getAttribute('aria-checked') === 'true')) running.click();
      return document.querySelector('#status').textContent;
    }, id);
    console.log('ready ' + label + ' ' + JSON.stringify(ready));

    await p.evaluate(() => {
      const img = document.querySelector('#export-img');
      if (img) { img.removeAttribute('src'); img.hidden = true; }
      const n = document.querySelector('#export-note');
      if (n) n.classList.remove('err');
      document.querySelector('#btn-export').click();
    });

    // The sheet is ready when the preview carries a blob URL; a failure sets .err on the note instead.
    let state = 'timeout';
    try {
      state = await p.waitForFunction(() => {
        const img = document.querySelector('#export-img');
        const n = document.querySelector('#export-note');
        if (n && n.classList.contains('err')) return 'err';
        if (img && !img.hidden && img.getAttribute('src')) return 'ok';
        return false;
      }, null, { timeout: exportMs, polling: 500 }).then(h => h.jsonValue());
    } catch (e) { state = 'timeout'; }

    if (state !== 'ok') {
      const note = await p.evaluate(() => (document.querySelector('#export-note') || {}).textContent || '');
      console.log('export ' + label + ' ' + JSON.stringify({ state, note: note.slice(0, 200) }));
      fails.push(label + ': export ' + (state === 'timeout' ? 'did not finish in ' + Math.round(exportMs / 1000) + 's' : 'failed') + (note ? ' — ' + note.slice(0, 140) : ''));
      await p.evaluate(() => { document.querySelector('#export-close').click(); });
      continue;
    }

    // Decode what the studio actually produced and measure it.
    const res = await p.evaluate(async () => {
      const img = document.querySelector('#export-img');
      const url = img.getAttribute('src');
      const blob = await (await fetch(url)).blob();
      const im = await new Promise((res2, rej) => { const i = new Image(); i.onload = () => res2(i); i.onerror = () => rej(new Error('the exported blob does not decode as an image')); i.src = url; });
      const w = im.naturalWidth, h = im.naturalHeight;
      const sw = Math.min(400, w), sh = Math.max(1, Math.round(sw * h / w));
      const c = document.createElement('canvas'); c.width = sw; c.height = sh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0, sw, sh);
      const d = g.getImageData(0, 0, sw, sh).data, L = [];
      for (let i = 0; i < d.length; i += 4) L.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      L.sort((a, b) => a - b);
      const q = f => L[Math.floor(f * (L.length - 1))];
      const p50 = q(0.5);
      let ink = 0; for (const v of L) if (Math.abs(v - p50) > 10) ink++;
      const svgBtn = document.querySelector('#export-svg');
      return { w, h, mb: +(blob.size / 1048576).toFixed(2), vector: !!(svgBtn && !svgBtn.hidden),
               note: (document.querySelector('#export-note') || {}).textContent.slice(0, 90),
               lum: { p01: Math.round(q(0.01)), p50: Math.round(p50), p99: Math.round(q(0.99)),
                      min: Math.round(L[0]), max: Math.round(L[L.length - 1]), ink: +(ink / L.length).toFixed(4) } };
    }).catch(e => ({ err: String(e && e.message || e) }));

    console.log('export ' + label + ' ' + JSON.stringify(res));

    if (res.err) { fails.push(label + ': ' + res.err); }
    else {
      // The studio clamps very large sheets on purpose and says so; accept its own arithmetic but
      // require that what came back is the size it claimed and is a real image.
      const claimed = /([\d,]+)\s*×\s*([\d,]+)\s*px/.exec(res.note || '');
      if (claimed) {
        const cw = +claimed[1].replace(/,/g, ''), ch = +claimed[2].replace(/,/g, '');
        if (res.w !== cw || res.h !== ch) fails.push(label + ': the sheet says ' + cw + '×' + ch + ' px but the file is ' + res.w + '×' + res.h);
      }
      const want = Math.round(inches * dpi);
      if (Math.max(res.w, res.h) < want * 0.5) fails.push(label + ': longest edge ' + Math.max(res.w, res.h) + ' px, far short of the ' + want + ' px asked for');
      if (blank(res)) fails.push(label + ' is blank at print size');

      // Vector RIP of a different picture than the plate is the class of bug Penrose shipped:
      // the canvas was a rhomb mosaic and the print was flat orange stars. Downsample both to
      // 300² and compare. Grain (a raster overlay the SVG does not emit) moves a few levels;
      // a different picture moves tens, and the dark-pixel fraction with it.
      if (res.vector) {
        const cmp = await p.evaluate(async () => {
          const art = [...document.querySelectorAll('canvas.art')].find(c => !c.hidden);
          const img = document.querySelector('#export-img');
          if (!art || !img || !art.width || !img.naturalWidth) return null;
          const N = 300;
          const sample = (src, sw, sh) => {
            const c = document.createElement('canvas'); c.width = N; c.height = N;
            const g = c.getContext('2d', { willReadFrequently: true });
            g.drawImage(src, 0, 0, sw, sh, 0, 0, N, N);
            return g.getImageData(0, 0, N, N).data;
          };
          const a = sample(art, art.width, art.height);
          const b = sample(img, img.naturalWidth, img.naturalHeight);
          let mad = 0, n = 0, darkA = 0, darkB = 0;
          for (let i = 0; i < a.length; i += 4) {
            const la = 0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2];
            const lb = 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];
            mad += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
            n++;
            if (la < 40) darkA++;
            if (lb < 40) darkB++;
          }
          return { mad: mad / (3 * n), darkA: darkA / n, darkB: darkB / n };
        }).catch(() => null);
        if (cmp) {
          const darkDiff = Math.abs(cmp.darkA - cmp.darkB);
          console.log('plate-vs-print ' + label + ' ' + JSON.stringify({ mad: +cmp.mad.toFixed(2), darkDiff: +darkDiff.toFixed(4) }));
          if (darkDiff > 0.14) fails.push(label + ': print ink coverage differs from the plate by ' + (darkDiff * 100).toFixed(1) + ' pp');
          else if (cmp.mad > 38) fails.push(label + ': plate and print differ by MAD ' + cmp.mad.toFixed(1));
        }
      }
    }
    await p.evaluate(() => { document.querySelector('#export-close').click(); });
  }

  await b.close();
  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('console errors:\n  ' + uniq.join('\n  ')); fails.push(uniq.length + ' console error(s)'); }
  console.log(fails.length ? 'FAIL ' + id + ': ' + fails.join('; ') : 'PASS ' + id + ' (' + cases.length + ' sheets at ' + inches + ' in, ' + dpi + ' ppi)');
  process.exit(fails.length ? 1 : 0);
})();
