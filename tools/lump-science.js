'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {load, replaceOnce, root} = require('./science-harness');
const moduleUnderTest = load('lump', {names: 'uAt,KINDS'});
// Independently differentiate the displayed field. Do not call pdeResidual,
// tau1 or the module's reported peak/centre to establish the PDE residual.
function residual(api, kind, h) {
  let square = 0, count = 0;
  for (const x of [-.8, .3, 1.1]) for (const y of [-.6, .4]) for (const t of [-.13, .21]) {
    const u = (dx = 0, dy = 0, dt = 0) => api.uAt(kind, x + dx, y + dy, t + dt);
    const c = u(), xp = u(h), xm = u(-h);
    const ux = (xp - xm) / (2 * h), uxx = (xp - 2 * c + xm) / h**2;
    const uxxxx = (u(2*h) - 4*xp + 6*c - 4*xm + u(-2*h)) / h**4;
    const uyy = (u(0,h) - 2*c + u(0,-h)) / h**2;
    const uxt = (u(h,0,h) - u(-h,0,h) - u(h,0,-h) + u(-h,0,-h)) / (4*h*h);
    const terms = [uxt, 6*(ux*ux + c*uxx), uxxxx, -3*uyy];
    const relative = terms.reduce((a,b) => a+b, 0) / Math.max(1, ...terms.map(Math.abs));
    square += relative**2; count++;
  }
  return Math.sqrt(square/count);
}
const cases = ['one', 'oblique', 'tight'].map(kind => {
  const rows = [.04, .02, .01].map(h => ({h, normalizedRms: residual(moduleUnderTest.hooks, kind, h)}));
  assert(rows[2].normalizedRms < .01, JSON.stringify({kind,rows}));
  const ratio = rows[0].normalizedRms / rows[2].normalizedRms;
  assert(ratio > 12 && ratio < 20, JSON.stringify({kind,ratio}));
  return {kind, rows, ratio};
});
const wrong = load('lump', {names: 'uAt', mutate: s => replaceOnce(s,
  '3 * (L.a * L.a - L.b * L.b) * t', '3.3 * (L.a * L.a - L.b * L.b) * t')});
const failureResidual = residual(wrong.hooks, 'one', .01);
assert(failureResidual > .02);
const result = {sourceSha256: moduleUnderTest.sourceSha256, cases, failureResidual, pass: true,
  limitations: ['Only three single-lump presets at twelve points each; finite differences are evidence, not proof.',
    'Products of single-lump tau functions are excluded. They do not generally solve the nonlinear KP-I equation.',
    'No print, displayed residual, peak-search or interaction accuracy claim.']};
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/lump-science.json'), JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
