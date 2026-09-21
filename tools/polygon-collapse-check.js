// node tools/polygon-collapse-check.js [studio.html]
// Direct all-pairs velocities, sharp minima and independently integrated trajectories for two n-gons.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const src = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'studio.html'), 'utf8');
const marker = '/* modules/double-triangle-bound.js */';
assert(src.includes(marker));
let body = src.slice(src.indexOf(marker)); body = body.slice(0, body.indexOf('</script>'));
const exposed = 'globalThis.check = { family, strengths, place, velocity, measure, closed, compute, defaults, sanitize };';
function load(source) {
  const sandbox = { Studio: { util: { clamp: (x,a,b) => Math.max(a,Math.min(b,x)) }, PALETTES: {}, register() {} } };
  vm.runInNewContext(source.replace('  Studio.register({', exposed+'\n  Studio.register({'), sandbox);
  return sandbox.check;
}
const mod = load(body), rows = [];
let count = 0, maxRelative = 0, maxCoefficient = 0;
for (let n = 2; n <= 20; n++) {
  const f=mod.family(n);
  let largestResidual=0;
  for(let j=1;j<600;j++) {
    const alpha=j*Math.PI/600, theta=alpha/n*180/Math.PI;
    const z=mod.place(theta,false,0,n), m=mod.measure(z), R=f.x**(n/2);
    const D=1+R*R-2*R*Math.cos(alpha);
    // Unreduced ring sum, deliberately not the module's hyperbolic K_n.
    const A=-n*R*Math.sin(alpha)/(2*Math.PI*D);
    const B=((n-1)*f.x*(1+R*R-2*R*Math.cos(alpha))/2 + n*(R*Math.cos(alpha)-1))/(2*Math.PI*D);
    const value=(f.K-f.d*Math.cos(alpha))/(2*n*Math.sin(alpha));
    maxRelative=Math.max(maxRelative,Math.abs(m.product/value-1));
    maxCoefficient=Math.max(maxCoefficient,Math.abs(m.A-A),Math.abs(m.B-B));
    largestResidual=Math.max(largestResidual,m.residual);
    assert(m.A<0 && m.B>0 && m.product>=f.floor-1e-10);
    assert(m.residual<2e-12 && Math.abs(m.inertia)<2e-12);
    count++;
  }
  const minimum=mod.measure(mod.place(f.opt,false,0,n));
  assert(Math.abs(minimum.product/f.floor-1)<2e-12);
  const shift=mod.place(f.opt,false,73,n).map(p=>[0.4*p[0]+1.3,0.4*p[1]-2.1]);
  assert(Math.abs(mod.measure(shift).product/f.floor-1)<2e-12);
  const expanded=mod.measure(mod.place(-f.opt,false,0,n));
  assert(expanded.tc<0);
  rows.push({n,minimum:f.floor,thetaDegrees:f.opt,largestResidual});
}
assert(maxRelative<1e-10 && maxCoefficient<1e-11);
assert(Math.abs(mod.family(2).floor-3*Math.sqrt(5)/4)<1e-13);
assert(Math.abs(mod.family(3).floor-Math.sqrt(29)/3)<1e-13);
assert(Math.abs(mod.family(4).floor-Math.sqrt(322)/9)<1e-13);
assert(Math.abs(Math.cos(4*mod.family(4).opt*Math.PI/180)-9/55)<1e-14);
const trajectories=[];
for(let n=2;n<=5;n++) {
  const f=mod.family(n);
  for(const theta of [12/n,f.opt,168/n]) {
    const result=mod.compute({...mod.defaults,n,theta,kind:'family'});
    assert(Number.isFinite(result.exactError) && result.exactError<2e-5,'trajectory agrees, n='+n+' theta='+theta+' error='+result.exactError);
    assert(result.exactError <= Math.max(1e-9,result.odeError*5),'error estimate tracks analytic error');
    trajectories.push({n,theta,exactError:result.exactError,stepEstimate:result.odeError,shapeError:result.shapeError});
  }
  const broken=mod.compute({...mod.defaults,n,kind:'broken',theta:f.opt});
  assert(broken.m.residual>0.01 && broken.shapeError>0.01,'control misses n='+n);
  const sanitized={...mod.defaults,n,kind:'family',theta:84}; mod.sanitize(sanitized);
  assert(sanitized.theta<=168/n);
}
const faulty=load(body.replace('vx -= f * dy;', 'vx -= 1.01 * f * dy;'));
const bad=faulty.measure(faulty.place(faulty.family(4).opt,false,0,4));
assert(bad.residual>1e-5 || Math.abs(bad.product/mod.family(4).floor-1)>1e-5);
console.log(JSON.stringify({angles:count,maxRelative,maxCoefficient,rows,trajectories,controls:'displaced vortex, anisotropic kernel, expanding orientation',passed:true},null,2));
