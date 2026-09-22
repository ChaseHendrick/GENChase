/* Optional raster presentation filter. Never changes a solver, witness or recipe. */
(function(root) {
  'use strict';
  const modes = ['off', 'gentle', 'soft'];
  function settings(mode, width, height, field, vector) {
    mode = modes.includes(mode) ? mode : 'off';
    const applied = mode !== 'off' && !vector;
    const cells = Array.isArray(field) && field.length >= 2 && field.every(n => Number.isFinite(n) && n > 0);
    const cellPixels = cells ? Math.min(width / field[0], height / field[1]) : 1;
    const radius = applied ? Math.max(mode === 'soft' ? 2 : 1, Math.min(8, Math.round(cellPixels * (mode === 'soft' ? .3 : .15)))) : 0;
    return {requested:mode, applied, algorithm:applied ? 'premultiplied-srgb-box-v1' : null, radiusPixels:radius,
      reason:vector ? 'Vector artwork keeps its original rasterization and SVG.' : mode === 'off' ? 'Original raster output.' : 'Appearance only; may blur fine detail. No new simulation detail or scientific validation.'};
  }

  // Separable box average with replicated edge pixels. Input is a strip including vertical
  // halo rows. RGB is premultiplied while filtering so transparent colors do not form fringes.
  function filterStrip(data, width, height, radius, firstRow, rows) {
    const span = radius * 2 + 1, horizontal = new Float32Array(data.length);
    for (let y = 0; y < height; y++) {
      const sums = [0, 0, 0, 0];
      const add = (x, sign) => {
        const i = (y * width + Math.max(0, Math.min(width - 1, x))) * 4, a = data[i + 3];
        for (let k = 0; k < 3; k++) sums[k] += sign * data[i + k] * a;
        sums[3] += sign * a;
      };
      for (let x = -radius; x <= radius; x++) add(x, 1);
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        for (let k = 0; k < 4; k++) horizontal[i + k] = sums[k] / span;
        add(x - radius, -1); add(x + radius + 1, 1);
      }
    }
    const out = new Uint8ClampedArray(width * rows * 4);
    for (let x = 0; x < width; x++) {
      const sums = [0, 0, 0, 0];
      const add = (y, sign) => {
        const i = (Math.max(0, Math.min(height - 1, y)) * width + x) * 4;
        for (let k = 0; k < 4; k++) sums[k] += sign * horizontal[i + k];
      };
      for (let y = firstRow - radius; y <= firstRow + radius; y++) add(y, 1);
      for (let y = 0; y < rows; y++) {
        const i = (y * width + x) * 4, alpha = sums[3];
        for (let k = 0; k < 3; k++) out[i + k] = alpha > 0 ? sums[k] / alpha : 0;
        out[i + 3] = alpha / span;
        add(firstRow + y - radius, -1); add(firstRow + y + radius + 1, 1);
      }
    }
    return out;
  }

  async function smooth(blob, plan, job) {
    if (!plan.applied) return blob;
    const check = () => { if (job?.abort) throw new Error('cancelled'); };
    check();
    const url = URL.createObjectURL(blob), output = document.createElement('canvas'), strip = document.createElement('canvas');
    let im;
    try {
      im = await new Promise((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Cannot read the raster for smoothing')); image.src = url;
      });
      check();
      const w = im.naturalWidth, h = im.naturalHeight, radius = plan.radiusPixels;
      if (w * h > 48e6) throw new Error('Raster smoothing supports up to 48 million pixels. Turn smoothing off or lower the export resolution');
      output.width = w; output.height = h; strip.width = w;
      const cx = output.getContext('2d'), sx = strip.getContext('2d', {willReadFrequently:true});
      // Bound temporary filter arrays to small strips, not a full-size floating-point image.
      const rows = Math.max(1, Math.min(64, Math.floor(2e6 / (w * 16))));
      for (let y = 0; y < h; y += rows) {
        check();
        const count = Math.min(rows, h - y), top = Math.max(0, y - radius), bottom = Math.min(h, y + count + radius);
        strip.height = bottom - top;
        sx.drawImage(im, 0, top, w, strip.height, 0, 0, w, strip.height);
        const source = sx.getImageData(0, 0, w, strip.height);
        const data = filterStrip(source.data, w, strip.height, radius, y - top, count);
        cx.putImageData(new ImageData(data, w, count), 0, y);
        job?.progress('Smoothing raster edges: ' + Math.round((y + count) / h * 100) + '%. Cancel stops it.');
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      check();
      const result = await new Promise((resolve, reject) => output.toBlob(b => b ? resolve(b) : reject(new Error('Cannot encode smoothed raster')), 'image/png'));
      check(); return result;
    } finally {
      URL.revokeObjectURL(url); if (im) im.src = ''; output.width = output.height = strip.width = strip.height = 0;
    }
  }
  const api = {modes, settings, filterStrip, smooth};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GenChasePrintSmoothing = api;
})(typeof window === 'undefined' ? globalThis : window);
