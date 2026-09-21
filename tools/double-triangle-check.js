// node tools/double-triangle-check.js
// Exercise the actual studio module, independently check its velocities and full trajectories,
// and deliberately damage the geometry/kernel to prove that its checks can miss.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const src = fs.readFileSync(require('node:path').join(__dirname, '..', 'dist', 'studio.html'), 'utf8');
const marker = '/* modules/double-triangle-bound.js */';
let body = src.slice(src.indexOf(marker));
assert(src.includes(marker), 'double-triangle module is in studio.html');
body = body.slice(0, body.indexOf('</script>'));
const exposed = 'globalThis.check = { place, velocity, measure, closed, compute, step, OPT, PHI, FLOOR, defaults, sanitize };';
function load(source) {
  const sandbox = { Studio: { util: { clamp: (x,a,b) => Math.max(a, Math.min(b,x)) }, PALETTES: {}, register() {} } };
  vm.runInNewContext(source.replace('  Studio.register({', exposed + '\n  Studio.register({'), sandbox);
  return sandbox.check;
}
const mod = load(body), rad = Math.PI / 180;
let formulaMax = 0, velocityMax = 0, similarityMax = 0;
const R = mod.PHI ** 3;
for (let j = 1; j < 1200; j++) {
  const theta = j * 60 / 1200, z = mod.place(theta, false), m = mod.measure(z);
  const phase = 3 * theta * rad, D = 1 + R * R - 2 * R * Math.cos(phase);
  const A = -3 * R * Math.sin(phase) / (2 * Math.PI * D);
  const B = R * (11 - Math.sqrt(5) * Math.cos(phase)) / (2 * Math.PI * D);
  formulaMax = Math.max(formulaMax, Math.abs(m.product / mod.closed(theta) - 1));
  similarityMax = Math.max(similarityMax, m.residual);
  velocityMax = Math.max(velocityMax, Math.abs(m.A - A), Math.abs(m.B - B));
  assert(m.A < 0 && m.B > 0 && m.product >= mod.FLOOR - 1e-11);
  assert(m.residual < 1e-12);
  assert(Math.abs(m.inertia) < 1e-12);
}
assert(formulaMax < 1e-11 && velocityMax < 1e-12);
const atMin = mod.measure(mod.place(mod.OPT, false));
assert(Math.abs(atMin.product - mod.FLOOR) < 1e-13);
assert(Math.abs(mod.closed(30) - 11 / 6) < 1e-13);
for (const theta of [4, mod.OPT, 30, 56]) {
  for (const size of [0.2, 1, 5]) {
    const rotation = 73, shift = [2.3, -1.7];
    const z = mod.place(theta, false, rotation).map(p => [size*p[0]+shift[0], size*p[1]+shift[1]]);
    const m = mod.measure(z);
    assert(Math.abs(m.product / mod.closed(theta) - 1) < 1e-11, 'scale, rotation and translation invariance');
  }
}
const trajectories = [];
for (const theta of [4, mod.OPT, 30, 56]) {
  const result = mod.compute({...mod.defaults, kind:'family', theta});
  assert(result.exactError < 1e-5 && result.shapeError < 1e-5);
  assert(result.exactError <= Math.max(1e-10, result.odeError * 5), 'step-halving estimate tracks the analytic error');
  trajectories.push({theta, exactError:result.exactError, stepEstimate:result.odeError, shapeError:result.shapeError});
}
const broken = mod.compute({...mod.defaults, kind:'broken'});
assert(broken.m.residual > 0.01 && broken.shapeError > 0.01 && broken.formulaError > 0.001);
for (const ratio of [0.5, 1, 2]) {
  // Incorrect ring radii break similarity even with the correct fixed circulations.
  const z = mod.place(mod.OPT, false);
  for(let k=0;k<3;k++) z[k] = z[k].map(x=>x*Math.sqrt(ratio)/mod.PHI);
  assert(mod.measure(z).residual > 0.01);
}
const faulty = load(body.replace('vx -= f * dy;', 'vx -= 1.01 * f * dy;'));
const bad = faulty.measure(faulty.place(mod.OPT, false));
assert(Math.abs(bad.product / mod.FLOOR - 1) > 1e-5 || bad.residual > 1e-5, 'anisotropic kernel error is detected');
const reverse = mod.measure(mod.place(-mod.OPT, false));
assert(reverse.tc < 0, 'reflected orientation expands and is excluded');
console.log(JSON.stringify({angles:1199, formulaMax, velocityMax, similarityMax, minimum:mod.FLOOR, thetaDegrees:mod.OPT, trajectories, broken:{velocityResidual:broken.m.residual,shapeError:broken.shapeError,formulaError:broken.formulaError}, mutationDetected:true},null,2));
