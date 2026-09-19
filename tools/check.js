// node tools/check.js <id> [waitMs=8000]
// Full check for one tab: default plate, every preset, the same hash loaded twice, and a tab switch away and back.
// Set STUDIO=path/to/studio.html to check a test copy built with tools/inject.js.
const path = require('path');
const { chromium } = require('playwright');

// Environment noise under file:// and swiftshader, not defects in the page.
const NOISE = [/willReadFrequently/, /ERR_CERT_AUTHORITY_INVALID/, /ServiceWorkerRegistration/, /GL Driver Message.*Performance/];
const b64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function measure(p) {
  return p.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent !== null && c.width > 100);
    const c = cs[0]; if (!c) return { err: 'no visible canvas', visibleCanvases: cs.length };
    const st = document.querySelector('#status');
    const status = st ? st.innerText.replace(/\s+/g, ' ').slice(0, 200) : null;
    // The status line is rendered by the technique and lags its state: the shell applies the hash
    // immediately but the text is not rewritten until the technique next reports. The seed field is
    // updated synchronously, so that is what says which plate this actually is.
    const seedField = (document.querySelector('#seed') || {}).value || null;

    // Grid-scale checkerboard test. When an explicit integrator goes unstable the field fills with the Nyquist
    // mode; shrunk to a thumbnail that averages into a plausible plate, which is how such a bug survives review.
    // Point-sampling at simulation-cell centres and correlating neighbours catches it: a checkerboard correlates
    // near -1, a smooth field near +1, an uncorrelated field near 0. Catmull-Rom is interpolating, so sampling at
    // cell centres returns the true cell values even through the display pass.
    let nyq = null;
    const gm = /grid\s+(\d+)\s*[x\u00d7]\s*(\d+)/i.exec(status || '');
    if (gm) {
      const gw = +gm[1], gh = +gm[2];
      if (gw >= 8 && gh >= 8 && c.width >= gw * 2) {
        const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
        const fg = f.getContext('2d', { willReadFrequently: true }); fg.drawImage(c, 0, 0);
        const d = fg.getImageData(0, 0, c.width, c.height).data;
        const L = new Float64Array(gw * gh);
        for (let j2 = 0; j2 < gh; j2++) for (let i2 = 0; i2 < gw; i2++) {
          const x = Math.min(c.width - 1, Math.floor((i2 + 0.5) * c.width / gw));
          const y = Math.min(c.height - 1, Math.floor((j2 + 0.5) * c.height / gh));
          const o = (y * c.width + x) * 4;
          L[j2 * gw + i2] = 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2];
        }
        let mean = 0; for (let k = 0; k < L.length; k++) mean += L[k]; mean /= L.length;
        let varr = 0; for (let k = 0; k < L.length; k++) { const v = L[k] - mean; varr += v * v; }
        varr /= L.length;
        if (varr >= 1) {
          let cov = 0, n = 0;
          for (let j2 = 0; j2 < gh; j2++) for (let i2 = 0; i2 < gw; i2++) {
            const a = L[j2 * gw + i2] - mean;
            if (i2 + 1 < gw) { cov += a * (L[j2 * gw + i2 + 1] - mean); n++; }
            if (j2 + 1 < gh) { cov += a * (L[(j2 + 1) * gw + i2] - mean); n++; }
          }
          nyq = Math.round(((cov / n) / varr) * 1000) / 1000;
        }
      }
    }

    const t = document.createElement('canvas'); t.width = 200; t.height = Math.max(1, Math.round(200 * c.height / c.width));
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, t.width, t.height);
    const d2 = g.getImageData(0, 0, t.width, t.height).data, L2 = [];
    let h = 2166136261;
    for (let i = 0; i < d2.length; i += 4) { L2.push(Math.round(.2126 * d2[i] + .7152 * d2[i + 1] + .0722 * d2[i + 2])); h ^= d2[i]; h = Math.imul(h, 16777619); h ^= d2[i + 1]; h = Math.imul(h, 16777619); }
    const sorted = L2.slice().sort((a, b) => a - b); const q = f2 => sorted[Math.floor(f2 * (sorted.length - 1))];
    const p50 = q(.5);
    // ink: the fraction of pixels that depart from the modal level. A line drawing is mostly background,
    // so percentile spread alone calls it blank; this counts the marks instead.
    let ink = 0; for (let i = 0; i < L2.length; i++) if (Math.abs(L2[i] - p50) > 10) ink++;
    return { canvas: c.width + 'x' + c.height, visibleCanvases: cs.length, fp: (h >>> 0).toString(16), nyq, seedField,
      lum: { p01: q(.01), p10: q(.1), p50: p50, p90: q(.9), p99: q(.99), min: sorted[0], max: sorted[sorted.length - 1], ink: +(ink / L2.length).toFixed(4) },
      status };
  });
}
// Alive either as a broad tonal field (percentile spread) or as marks on a ground (range plus enough ink).
const flat = m => !m.lum || ((m.lum.p99 - m.lum.p01) < 12 && !((m.lum.max - m.lum.min) >= 40 && m.lum.ink >= 0.004));
// Strongly negative neighbour correlation at the grid scale means the plate is the integrator blowing up, not a pattern.
const NYQ = -0.35;
const checker = m => m.nyq !== null && m.nyq !== undefined && m.nyq < NYQ;

// Wait up to maxMs, but stop early once the plate is non-flat and has settled: a still plate whose fingerprint
// stopped changing, or a living plate whose step count has passed its warm-up. Cuts a full run roughly in half.
async function settle(p, maxMs, seed) {
  const t0 = Date.now(); let last = '', same = 0;
  while (Date.now() - t0 < Math.max(2500, maxMs)) {
    await p.waitForTimeout(700);
    if (Date.now() - t0 < 2500) continue;
    const m = await measure(p);
    if (m.err || flat(m)) { last = m.fp || ''; same = 0; continue; }
    // The studio paints a random plate while it boots and only then applies the hash, so a plate
    // that is non-flat is not necessarily the plate that was asked for.
    if (seed && m.seedField && m.seedField !== seed) { last = ''; same = 0; continue; }
    // A status the technique has not rewritten yet carries no grid, which silently disables the
    // checkerboard detector. Wait for the technique to report before calling the plate settled.
    if (seed && m.status && m.status.indexOf(seed) < 0) { last = ''; same = 0; continue; }
    same = m.fp === last ? same + 1 : 0; last = m.fp;
    if (same >= 2) return;                                   // still, or paused
    const st = m.status || '';
    const step = (st.match(/(?:step|sweep|iteration|iter|grains|particles)\s+([\d,]+)/) || [])[1];
    const warm = await p.evaluate(() => { try { const id = location.hash.slice(1).split('/')[0]; const s = JSON.parse(localStorage.getItem('genchase.v1.' + id) || '{}'); return Number(s.warmup) || 0; } catch (e) { return 0; } });
    if (step && warm && Number(step.replace(/,/g, '')) >= warm) return;   // living plate past its warm-up
  }
}

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
    // Normalise the layout before the shell boots. file:// pages share one localStorage, so the
    // timeline strip fills up as the run proceeds and changes the stage height, which changes the
    // canvas size, which changes every pixel. Two loads of one recipe were being compared at
    // different canvas sizes and reported as non-determinism. Ising is byte-identical across three
    // loads on a clean profile; it was the strip growing between them.
    await p.addInitScript(() => {
      try {
        localStorage.removeItem('genchase.v1.history');
        localStorage.setItem('genchase.v1.timeline', '0');
      } catch (e) { /* a profile that refuses storage is already normalised */ }
    });
    p.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.some(r => r.test(t))) errs.push(m.type() + ': ' + t); });
    p.on('pageerror', e => { if (!NOISE.some(r => r.test(e.message))) errs.push('pageerror: ' + e.message); });
    // a 1 MB single file whose first module starts computing on load: give it time under a loaded machine
    await p.goto(url + '#' + hash, { waitUntil: 'domcontentloaded', timeout: 90000 });
    // The studio paints a random plate while it boots and applies the hash immediately after. On a
    // cold JIT that handover can take longer than a settle budget, and measuring before it lands
    // reads the boot plate instead of the requested one: a false determinism failure, and a status
    // with no grid in it, which silently disables the checkerboard detector. Wait for the seed the
    // hash asked for before anything else looks at the page.
    const want = decodeURIComponent((hash.split('/')[1] || ''));
    if (want) {
      try {
        await p.waitForFunction(s2 => { const el = document.querySelector('#seed'); return !!el && el.value === s2; },
                                want, { timeout: 60000, polling: 250 });
      } catch (e) { errs.push('the studio never applied the seed "' + want + '" from the hash'); }
    }
    return p;
  };

  // 1. default plate with a fixed seed
  const seed = 'check-' + id;
  const p = await open(id + '/' + seed);
  // A living technique whose structure takes thousands of steps to appear cannot be judged at the few
  // hundred a software renderer manages inside a settle budget. Physarum's storm preset reads as a
  // near-uniform haze at step 300 and is a field of rippling voids by step 2,800. Say so next to the
  // numbers rather than leaving a low reading to be misread as a dead plate.
  const progressNote = (m, target) => {
    const st = (m.status || '').match(/(?:step|sweep|iteration|iter|grains|particles)\s+([\d,]+)/);
    if (!st || !target) return '';
    const at = Number(st[1].replace(/,/g, ''));
    return at < target * 0.5 ? ' judged early: step ' + at.toLocaleString() + ' of ' + target.toLocaleString() : '';
  };
  const runTarget = await p.evaluate(() => {
    try {
      const st = JSON.parse(localStorage.getItem('genchase.v1.' + location.hash.slice(1).split('/')[0]) || '{}');
      return Number(st.stopAfter) || Number(st.warmup) || 0;
    } catch (e) { return 0; }
  });

  await settle(p, wait, seed);
  const def = await measure(p);
  console.log('default', JSON.stringify(def) + progressNote(def, runTarget));
  if (def.err) fails.push('default: ' + def.err);
  else if (flat(def)) fails.push('default plate is flat');
  else if (checker(def)) fails.push('default plate is the grid-scale checkerboard (neighbour correlation ' + def.nyq + '): the integrator is unstable');

  // Capture the full recipe of the default plate before the preset loop mutates the persisted state.
  // The determinism check used to load "id/seed/{running:false}", which pins only that one key and
  // takes every other parameter from localStorage. By then the preset loop had rewritten it, so the
  // two loads could legitimately be different plates and the test was measuring the wrong thing.
  const fullRecipe = await p.evaluate(() => {
    document.querySelector('#btn-settings').click();
    const raw = (document.querySelector('#settings-text') || {}).value || '';
    document.querySelector('#settings-close').click();
    try { return JSON.parse(raw); } catch (e) { return null; }
  });

  // 2. every preset
  const presets = await p.evaluate(() => [...document.querySelectorAll('#preset option')].map(o => o.value).filter(Boolean));
  for (const key of presets) {
    await p.evaluate(k => { const s = document.querySelector('#preset'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true })); }, key);
    await settle(p, wait, seed);
    const m = await measure(p);
    console.log('preset ' + key, JSON.stringify(m) + progressNote(m, runTarget));
    if (m.err) fails.push('preset ' + key + ': ' + m.err);
    else if (flat(m)) fails.push('preset ' + key + ' is flat');
    else if (checker(m)) fails.push('preset ' + key + ' is the grid-scale checkerboard (neighbour correlation ' + m.nyq + ')');
  }
  if (!presets.length) fails.push('no presets registered');

  // 3. same hash twice must give the same plate (running:false so living fields stop after warm-up)
  const stillRecipe = fullRecipe ? Object.assign({}, fullRecipe, { running: false }) : { running: false };
  const still = id + '/' + seed + '/' + b64url(stillRecipe);
  if (!fullRecipe) console.log('determinism: could not read the settings JSON, falling back to a partial recipe');
  // Determinism gets its own, larger budget. It is a pass/fail claim about the product rather than a
  // look at a picture, and a plate that is still inside its warm-up when the budget runs out gives two
  // captures at different points, which says nothing either way. Raising the default grids to 512 made
  // that the normal case on a software renderer: every load reported a different step and the check
  // quietly stopped running while still printing PASS. A check that can silently not run is worse than
  // no check, so this waits for real stillness and then insists on an answer below.
  const detWait = Math.max(wait, Number(process.env.DET_WAIT) || 150000);
  // Close the page the presets ran on before comparing. Every file:// page shares one localStorage, so
  // leaving it open leaves a second writer racing the two loads below: it can add a timeline entry
  // between them, the strip appears, the stage loses two pixels and the plate is drawn at a different
  // size. That is what 725x725 against 727x727 was, and clearing history in the init script could not
  // fix it because the other page wrote again afterwards. Nothing below needs this page.
  await p.close();
  const a1 = await open(still); await settle(a1, detWait, seed); const m1 = await measure(a1); await a1.close();
  const a2 = await open(still); await settle(a2, detWait, seed); const m2 = await measure(a2);
  // A living plate with no pause key keeps stepping on a wall-clock budget, so two loads are only comparable at the
  // same step count. Report that case as not comparable rather than as a failure; a plate that pauses must match.
  const stepOf = m => { const s = ((m.status || '').match(/(?:step|sweep|iteration|iter|grains|particles)\s+([\d,]+)/) || [])[1]; return s ? Number(s.replace(/,/g, '')) : null; };
  const pausable = await a2.evaluate(() => { try { return Object.prototype.hasOwnProperty.call(JSON.parse(localStorage.getItem('genchase.v1.' + location.hash.slice(1).split('/')[0]) || '{}'), 'running'); } catch (e) { return false; } });
  const s1 = stepOf(m1), s2 = stepOf(m2);
  // Two captures at different step counts (a chunked computation still running, or a living plate with no pause key)
  // say nothing about determinism; two captures at the same step count must match exactly.
  // Two captures say something about determinism only when we know they were taken at the same point
  // in the computation. A plate reporting no step count gives no way to know that, so a difference
  // there is not evidence of anything. This read the other way round and failed such plates.
  // Equal canvas size as well: the plate is resolution-independent by design, so the same recipe
  // drawn at a different size is legitimately different pixels and says nothing about determinism.
  const comparable = m1.fp === m2.fp || (m1.canvas === m2.canvas && s1 !== null && s2 !== null && s1 === s2);
  console.log('determinism', JSON.stringify({ first: m1.fp, second: m2.fp, same: m1.fp === m2.fp, steps: [s1, s2], canvas: [m1.canvas, m2.canvas], pausable }));
  // Two loads drawn at different canvas sizes are legitimately different pixels: the plate is
  // resolution-independent by design, and a scrollbar appearing on one load is enough to move the
  // size by two pixels. That case keeps its excuse and must not reach the warm-up failure below.
  const sizeMismatch = m1.canvas !== m2.canvas;
  if (m1.fp !== m2.fp && sizeMismatch) console.log('determinism not comparable: drawn at ' + m1.canvas + ' and ' + m2.canvas);
  if (m1.fp !== m2.fp && comparable) fails.push('same hash loaded twice gave different plates');
  // A plate that can be paused was loaded with running:false, so within the budget above it must reach
  // a still state and the two loads must then match. If it did not, the check did not run, and that is
  // a failure of this harness or of the plate rather than something to note and pass over. A plate with
  // no pause key genuinely cannot be compared this way and keeps its excuse.
  else if (m1.fp !== m2.fp && pausable && !sizeMismatch) fails.push('determinism never became comparable within ' + Math.round(detWait / 1000) + ' s: captured at steps ' + s1 + ' and ' + s2 + ', still inside its warm-up. Raise DET_WAIT or lower the plate\'s warm-up.');
  else if (m1.fp !== m2.fp) console.log('determinism not comparable: captured at steps ' + s1 + ' and ' + s2 + ' (living plate without a pause key)');

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
  await a2.close();   // p was already closed before the determinism loads
  await b.close();

  const uniq = [...new Set(errs)];
  if (uniq.length) { console.log('console errors:\n  ' + uniq.join('\n  ')); fails.push(uniq.length + ' console error(s)'); }
  console.log(fails.length ? 'FAIL ' + id + ': ' + fails.join('; ') : 'PASS ' + id);
  process.exit(fails.length ? 1 : 0);
})();
