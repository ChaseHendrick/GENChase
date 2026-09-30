'use strict';
// Bounded exception to the generic non-flat image check. A clean periodic ring has
// plane-wave right eigenvectors and uniform site probability. No other flat plate qualifies.
function uniformSkinEvidence(sample) {
  const reject = reason => ({ accepted: false, reason });
  const s = sample?.state || {}, d = sample?.data || {}, paint = sample?.paint || {};
  if (s.id !== 'skin' || s.grid !== 96 || s.g !== 0.08 || s.disorder !== 0 ||
      s.bc !== 'periodic' || s.solver !== 'right' || s.rows !== 'modes' || s.view !== 'modes')
    return reject('outside the checked clean periodic Skin recipe');
  const aspect = { '1:1': 1, '4:5': 1.25, '5:4': .8, '3:2': 2 / 3, '16:9': 9 / 16 }[s.aspect] || 1;
  const sites = s.grid, modes = Math.min(Math.max(32, Math.round(sites * aspect)), sites);
  if (!Array.isArray(d.shape) || d.shape.length !== 2 || d.shape[0] !== modes || d.shape[1] !== sites ||
      !Array.isArray(d.values) || d.values.length !== modes * sites)
    return reject('probability shape or row cap differs from the recipe');
  const g = d.geometry || {};
  if (g.sites !== sites || g.modes !== modes || g.boundary !== s.bc || g.solver !== s.solver ||
      g.rowMode !== s.rows || g.g !== s.g || g.disorder !== s.disorder)
    return reject('exported geometry does not match the active recipe');
  let maxDeviation = 0, maxNormalizationError = 0, measuredWeight = 0;
  const cut = Math.max(2, Math.floor(.9 * sites));
  for (let row = 0; row < modes; row++) {
    let total = 0;
    for (let site = 0; site < sites; site++) {
      const value = d.values[row * sites + site];
      if (!Number.isFinite(value) || value < 0) return reject('nonfinite or negative probability');
      maxDeviation = Math.max(maxDeviation, Math.abs(value - 1 / sites));
      total += value; if (site >= cut) measuredWeight += value / modes;
    }
    maxNormalizationError = Math.max(maxNormalizationError, Math.abs(total - 1));
  }
  if (maxDeviation > 1e-6 || maxNormalizationError > 1e-6)
    return reject('probability does not match normalized plane waves');
  const expectedWeight = (sites - cut) / sites;
  if (!Number.isFinite(d.skinWeight) || Math.abs(d.skinWeight - expectedWeight) > 1e-6 ||
      Math.abs(d.skinWeight - measuredWeight) > 1e-6)
    return reject('skin weight disagrees with exported probability');
  if (!(paint.width > 0 && paint.height > 0) || paint.visibleCanvases !== 1 ||
      paint.pixels !== paint.width * paint.height || paint.opaquePixels !== paint.pixels ||
      paint.expectedColorPixels !== paint.pixels || !Array.isArray(paint.expectedRgb) ||
      paint.expectedRgb.length !== 3 || !paint.expectedRgb.some(value => value > 0))
    return reject('canvas is missing, cleared, transparent, or differs from the expected painted color');
  return { accepted: true, reason: 'clean periodic plane-wave density and painted canvas checked',
    sites, modes, maxDeviation, maxNormalizationError, skinWeight: d.skinWeight, expectedWeight };
}
async function readUniformSkinSample(page) {
  return page.evaluate(async () => {
    const recipe = Studio.getRecipe();
    if (recipe.id !== 'skin') return { state: recipe };
    const state = { ...Studio.modules.skin.defaults, ...recipe };
    const F = GenChaseDataFormats;
    const members = F.readZip(new Uint8Array(await (await Studio.exportData('skin')).arrayBuffer()));
    const meta = JSON.parse(new TextDecoder().decode(members['meta.json']));
    if (!meta.stateExported || !members['probability.npy']) return { state };
    const array = F.readNpy(members['probability.npy']);
    const canvases = [...document.querySelectorAll('canvas.art')].filter(c => c.offsetParent !== null);
    const canvas = canvases[0];
    const sample = { state, data: { shape: array.shape, values: Array.from(array.data), skinWeight: meta.grid?.skinWeight, geometry: meta.grid } };
    if (!canvas) return sample;
    const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const expectedRgb = Array.from(new Uint8ClampedArray(Studio.util.makeRamp(state.palette, state.bg)(0)));
    let opaquePixels = 0, expectedColorPixels = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] === 255) opaquePixels++;
      if (expectedRgb.every((value, k) => rgba[i + k] === value)) expectedColorPixels++;
    }
    sample.paint = { width: canvas.width, height: canvas.height, visibleCanvases: canvases.length,
      pixels: rgba.length / 4, opaquePixels, expectedColorPixels, expectedRgb };
    return sample;
  });
}
async function checkUniformSkin(page) {
  try { return uniformSkinEvidence(await readUniformSkinSample(page)); }
  catch (error) { return { accepted: false, reason: 'uniform density check failed: ' + error.message }; }
}
module.exports = { uniformSkinEvidence, readUniformSkinSample, checkUniformSkin };
