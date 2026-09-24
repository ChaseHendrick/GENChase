/* Print-sharpness and tonal proxies for art candidates. Node tests call the pure functions; the art
   runner injects this file into the studio page, where measureExport() reads the real export. These
   numbers order candidates within one job. They are not a measure of beauty and not scientific evidence. */
(function (root) {
  'use strict';
  const KS = [1, 2, 4, 8, 16, 32];
  const NYQ_LIMIT = -0.35;                   // tools/check.js: below this the plate is the grid-scale checkerboard
  const CLASS_RANK = { sharp: 2, ok: 1, soft: 0 };
  const round = (v, d) => v === null || !Number.isFinite(v) ? null : Number(v.toFixed(d));

  function luminance(rgba) {
    const n = rgba.length >> 2, L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2];
    return L;
  }
  function moments(L) {
    let mean = 0; for (let i = 0; i < L.length; i++) mean += L[i]; mean /= Math.max(1, L.length);
    let v = 0; for (let i = 0; i < L.length; i++) v += (L[i] - mean) * (L[i] - mean);
    return { mean, sd: Math.sqrt(v / Math.max(1, L.length)) };
  }
  // Mean |L(x+k) - L(x)| over horizontal and vertical pairs, at every pixel offset. tools/sharp.js samples
  // even offsets only, so an image enlarged by even nearest-neighbour blocks never shows a block edge there.
  function madCurve(L, w, h) {
    const out = {};
    for (const k of KS) {
      let acc = 0, n = 0;
      for (let y = 0; y < h; y++) { const r = y * w; for (let x = 0; x + k < w; x++) { acc += Math.abs(L[r + x + k] - L[r + x]); n++; } }
      for (let y = 0; y + k < h; y++) { const r = y * w, s = (y + k) * w; for (let x = 0; x < w; x++) { acc += Math.abs(L[s + x] - L[r + x]); n++; } }
      out[k] = n ? acc / n : 0;
    }
    return out;
  }
  function edgeP99(L, w, h) {
    const n = Math.max(0, (w - 1) * h) + Math.max(0, w * (h - 1));
    if (!n) return 0;
    const d = new Float32Array(n); let j = 0;
    for (let y = 0; y < h; y++) { const r = y * w; for (let x = 0; x + 1 < w; x++) d[j++] = Math.abs(L[r + x + 1] - L[r + x]); }
    for (let y = 0; y + 1 < h; y++) { const r = y * w, s = r + w; for (let x = 0; x < w; x++) d[j++] = Math.abs(L[s + x] - L[r + x]); }
    d.sort();
    return d[Math.floor(0.99 * (n - 1))];
  }
  function sortedCopy(L) { return Float32Array.from(L).sort(); }
  const pick = (s, f) => s[Math.floor(f * (s.length - 1))];
  // Percentile spread and ink: the fraction of pixels more than ten levels from the median (tools/check.js).
  function tonal(L) {
    if (!L.length) return { spread: 0, ink: 0 };
    const s = sortedCopy(L), p50 = pick(s, 0.5);
    let ink = 0; for (let i = 0; i < L.length; i++) if (Math.abs(L[i] - p50) > 10) ink++;
    return { spread: pick(s, 0.99) - pick(s, 0.01), ink: ink / L.length };
  }
  // Shannon entropy of the 64-bin luminance histogram, in bits (0 for a constant image, at most 6).
  function entropy(L) {
    if (!L.length) return 0;
    const bins = new Float64Array(64);
    for (let i = 0; i < L.length; i++) bins[Math.max(0, Math.min(63, Math.floor(L[i] / 4)))]++;
    let e = 0; for (const c of bins) if (c) { const p = c / L.length; e -= p * Math.log2(p); }
    return e;
  }
  // The smallest pixel offset at which half the large-scale (32 px) variation is already present.
  function featurePx(mad) {
    const ref = mad[32]; if (!(ref > 0)) return null;
    for (const k of KS) if (mad[k] >= 0.5 * ref) return k;
    return null;
  }
  // Neighbour correlation of luminance sampled at simulation-cell centres (tools/check.js). Near -1 is the
  // Nyquist checkerboard of an unstable explicit integrator; null when the field is too flat to say.
  function nyq(cells, gw, gh) {
    if (!(gw >= 2 && gh >= 2) || cells.length < gw * gh) return null;
    let mean = 0; for (let k = 0; k < gw * gh; k++) mean += cells[k]; mean /= gw * gh;
    let varr = 0; for (let k = 0; k < gw * gh; k++) { const v = cells[k] - mean; varr += v * v; }
    varr /= gw * gh;
    if (varr < 1) return null;
    let cov = 0, n = 0;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const a = cells[j * gw + i] - mean;
      if (i + 1 < gw) { cov += a * (cells[j * gw + i + 1] - mean); n++; }
      if (j + 1 < gh) { cov += a * (cells[(j + 1) * gw + i] - mean); n++; }
    }
    return Math.round(((cov / n) / varr) * 1000) / 1000;
  }
  // The 200 px thumbnail summary tools/check.js uses to call a plate flat.
  function flatSummary(L) {
    const R = Float32Array.from(L, v => Math.round(v)), s = sortedCopy(R), p50 = pick(s, 0.5);
    let ink = 0; for (let i = 0; i < R.length; i++) if (Math.abs(R[i] - p50) > 10) ink++;
    return { p01: pick(s, 0.01), p50, p99: pick(s, 0.99), min: s[0], max: s[s.length - 1], ink: round(ink / Math.max(1, R.length), 4) };
  }
  const isFlat = f => !f || ((f.p99 - f.p01) < 12 && !((f.max - f.min) >= 40 && f.ink >= 0.004));
  const isChecker = v => v !== null && v !== undefined && v < NYQ_LIMIT;
  // tools/sharp.js verdict thresholds: some hard edge is required before the acuity term can pass a plate.
  function classify(edge, acuity) {
    if (edge < 0.15) return 'soft';
    if (edge >= 0.8 || acuity >= 0.15) return 'sharp';
    if (edge >= 0.5 || acuity >= 0.10) return 'ok';
    return 'soft';
  }
  function edgeOf(L, w, h) { const { sd } = moments(L); return sd > 0.5 ? edgeP99(L, w, h) / sd : 0; }
  // The two numbers the ranking and the informative test use, rounded as metrics() rounds them.
  function rankingMetrics(L, w, h) { return { entropy: round(entropy(L), 4), edge: round(edgeOf(L, w, h), 4) }; }
  // Sample standard deviation (n - 1); null below two values.
  function sampleSd(values) {
    const v = values.filter(Number.isFinite); if (v.length < 2) return null;
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return Math.sqrt(v.reduce((a, x) => a + (x - m) * (x - m), 0) / (v.length - 1));
  }
  function metrics(L, w, h) {
    const { sd } = moments(L), mad = madCurve(L, w, h), p99 = edgeP99(L, w, h), t = tonal(L);
    const edge = sd > 0.5 ? p99 / sd : 0, acuity = mad[16] > 0.01 ? mad[1] / mad[16] : 0;
    const out = { contrast: round(sd, 3), edge: round(edge, 4), acuity: round(acuity, 4), spread: round(t.spread, 3), ink: round(t.ink, 4),
      entropy: round(entropy(L), 4), featurePx: featurePx(mad), mad: {}, class: classify(edge, acuity), sampling: 'all', cropPx: w + 'x' + h };
    for (const k of KS) out.mad[k] = round(mad[k], 4);
    return out;
  }
  // Total and deterministic: class (sharp, ok, soft), then entropy, both descending, then candidate index.
  function compare(a, b) {
    const ca = CLASS_RANK[a.metrics.class] ?? -1, cb = CLASS_RANK[b.metrics.class] ?? -1;
    if (ca !== cb) return cb - ca;
    const ea = a.metrics.entropy ?? -1, eb = b.metrics.entropy ?? -1;
    if (ea !== eb) return eb - ea;
    return a.index - b.index;
  }

  // Browser only: decode the studio's export sheet and measure it at native pixels.
  async function measureExport(img, opts) {
    const im = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('the export does not decode')); i.src = img.getAttribute('src'); });
    const W = im.naturalWidth, H = im.naturalHeight, S = Math.min(opts.crop || 1024, W, H);
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; };
    const [cc, cg] = canvas(S, S);
    cg.drawImage(im, Math.floor((W - S) / 2), Math.floor((H - S) / 2), S, S, 0, 0, S, S);
    const L = luminance(cg.getImageData(0, 0, S, S).data);
    const m = metrics(L, S, S);
    // Sampling error of the ranking numbers: the same measurement on the four corner crops of the same size.
    // The central crop is one draw from these positions, so their spread is its crop-position error. The
    // crops overlap on a small sheet, so this is a lower bound on the error.
    let sampling = null;
    if (W > S || H > S) {
      const entropyAt = [m.entropy], edgeAt = [m.edge];
      for (const [x, y] of [[0, 0], [W - S, 0], [0, H - S], [W - S, H - S]]) {
        cg.clearRect(0, 0, S, S); cg.drawImage(im, x, y, S, S, 0, 0, S, S);
        const q = rankingMetrics(luminance(cg.getImageData(0, 0, S, S).data), S, S);
        entropyAt.push(q.entropy); edgeAt.push(q.edge);
      }
      sampling = { crops: 'centre and four corners, ' + S + ' px', entropy: entropyAt, edge: edgeAt, entropySd: round(sampleSd(entropyAt), 4), edgeSd: round(sampleSd(edgeAt), 4) };
    }
    const tw = 200, th = Math.max(1, Math.round(200 * H / W)), [tc, tg] = canvas(tw, th);
    tg.drawImage(im, 0, 0, tw, th);
    const flat = flatSummary(luminance(tg.getImageData(0, 0, tw, th).data));
    let n = null;
    const gw = opts.gw, gh = opts.gh;
    if (gw >= 8 && gh >= 8 && W >= gw * 2) {
      const cells = new Float32Array(gw * gh), [sc, sg] = canvas(W, 1);
      for (let j = 0; j < gh; j++) {
        const y = Math.min(H - 1, Math.floor((j + 0.5) * H / gh));
        sg.clearRect(0, 0, W, 1); sg.drawImage(im, 0, y, W, 1, 0, 0, W, 1);
        const row = sg.getImageData(0, 0, W, 1).data;
        for (let i = 0; i < gw; i++) { const o = Math.min(W - 1, Math.floor((i + 0.5) * W / gw)) * 4; cells[j * gw + i] = 0.2126 * row[o] + 0.7152 * row[o + 1] + 0.0722 * row[o + 2]; }
      }
      n = nyq(cells, gw, gh);
      sc.width = sc.height = 0;
    }
    const bytes = Uint8Array.from(L, v => Math.round(v));
    const lumSha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    const long = opts.thumb || 320, qw = W >= H ? long : Math.max(1, Math.round(long * W / H)), qh = W >= H ? Math.max(1, Math.round(long * H / W)) : long;
    const [qc, qg] = canvas(qw, qh); qg.imageSmoothingQuality = 'high'; qg.drawImage(im, 0, 0, qw, qh);
    let blob = null, quality = 0;
    for (const q of [0.85, 0.75, 0.65, 0.5, 0.35]) {
      blob = await new Promise(r => qc.toBlob(r, 'image/jpeg', q)); quality = q;
      if (blob && blob.size <= (opts.maxBytes || 65536)) break;
    }
    const thumb = blob ? await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = reject; r.readAsDataURL(blob); }) : null;
    cc.width = cc.height = tc.width = tc.height = qc.width = qc.height = 0; im.src = '';
    return { width: W, height: H, metrics: m, sampling, flat, flatGate: isFlat(flat), nyq: n, lumSha256, thumb, thumbQuality: quality };
  }

  const api = { KS, NYQ_LIMIT, CLASS_RANK, luminance, moments, madCurve, edgeP99, tonal, entropy, featurePx, nyq, flatSummary, isFlat, isChecker, classify, metrics, edgeOf, rankingMetrics, sampleSd, compare, measureExport };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GenChaseArtScore = api;
})(typeof window === 'undefined' ? globalThis : window);
