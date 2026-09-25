'use strict';
// node tools/three-vortex-custom-check.js
// Formula check of the three-vortex-bound tab's Custom configuration mode. It evaluates the block between
// "custom:begin" and "custom:end" in src/modules/three-vortex-bound.js on its own and checks it against an
// independent complex Biot-Savart sum and against the formulas of papers/minimal-winding (the positions of
// its parametrization, the rates of its Lemma 3 and P(θ) of its Eq. (10)). Two mutations of the block, a
// flipped kernel sign and P without its factor 2, must each be caught. Then the whole module runs headless
// against stub helpers, to show the Custom status line builds. This is a regression test in binary64, not
// an independent high-precision validation.
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/three-vortex-bound.js'), 'utf8');
const a = source.indexOf('// custom:begin'), b = source.indexOf('// custom:end');
assert(a > 0 && b > a, 'custom block markers');
const block = source.slice(a, b);
const load = text => vm.runInNewContext('const TWOPI = 2 * Math.PI, SQRT2 = Math.SQRT2;\n' + text +
  '\n({ bsVel, analyzeCustom, projectCollapse, customPaths, SQRT3_2 })');

// complex helpers for the independent sums
const C = (re, im) => ({ re, im: im || 0 });
const add = (p, q) => C(p.re + q.re, p.im + q.im), sub = (p, q) => C(p.re - q.re, p.im - q.im);
const mul = (p, q) => C(p.re * q.re - p.im * q.im, p.re * q.im + p.im * q.re);
const div = (p, q) => { const d = q.re * q.re + q.im * q.im; return C((p.re * q.re + p.im * q.im) / d, (p.im * q.re - p.re * q.im) / d); };
const conj = p => C(p.re, -p.im), abs = p => Math.hypot(p.re, p.im), expi = t => C(Math.cos(t), Math.sin(t));
// Eq. (1): conj(dz_j/dt) = (1/2πi) Σ_k Γ_k/(z_j − z_k)
function biotSavart(g, z) {
  return z.map((zj, j) => {
    let s = C(0);
    for (let k = 0; k < 3; k++) if (k !== j) s = add(s, div(C(g[k]), sub(zj, z[k])));
    return conj(div(s, C(0, 2 * Math.PI)));
  });
}
// Eq. (6): the positions of the paper's parametrization, circulations (1, μ, −μ/(1+μ)).
function paperConfig(mu, th) {
  const R = 1 + mu + mu * mu, sR = Math.sqrt(R), e = expi(-th), q = (1 + mu) * (1 + mu);
  const z1 = div(mul(C(mu), add(C(1), mul(C(sR), e))), C(q)), z2 = div(sub(C(mu), mul(C(sR), e)), C(q));
  return { g: [1, mu, -mu / (1 + mu)], z: [z1, z2, C(1)].map(p => [p.re, p.im]) };
}
// Lemma 3 and Eq. (10)
function paperKappa(mu, th) {
  const R = 1 + mu + mu * mu, sR = Math.sqrt(R), e = expi(th);
  const num = add(C(sR), mul(C(1 - mu), e)), den = mul(sub(C(sR), mul(C(mu), e)), add(C(sR), e));
  return mul(C(0, (1 + mu) ** 3 / (2 * Math.PI * sR)), div(num, den));
}
function paperP(mu, th) {
  const R = 1 + mu + mu * mu, sR = Math.sqrt(R), Cc = sR * Math.cos(th);
  const N = 2 * (1 + mu * mu) * R + (1 - mu) * (2 + mu + 2 * mu * mu) * Cc - 2 * mu * Cc * Cc, M = 1 - mu + 2 * Cc;
  return N / (2 * mu * sR * M * Math.sin(th));
}
const theta0 = mu => Math.acos((mu - 1) / (2 * Math.sqrt(1 + mu + mu * mu)));
let seed = 12345;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };

function run(mod) {
  const out = { velocity: 0, kappa: 0, P: 0, spread: 0, cases: 0, projected: 0, projMaxSpread: 0, projMinP: Infinity };
  for (let n = 0; n < 300; n++) {
    const g = [0, 1, 2].map(() => (rnd() * 2 - 1) * 3), z = [0, 1, 2].map(() => [rnd() * 4 - 2, rnd() * 4 - 2]);
    const v = mod.bsVel(g, z), ref = biotSavart(g, z.map(p => C(p[0], p[1])));
    for (let i = 0; i < 3; i++) out.velocity = Math.max(out.velocity, Math.hypot(v[i][0] - ref[i].re, v[i][1] - ref[i].im) / abs(ref[i]));
  }
  for (const mu of [0.05, 0.2, 0.5, 0.8, 1, 1.7]) {
    const t0 = theta0(mu);
    for (let k = 1; k < 40; k++) {
      for (const [th, collapse] of [[t0 * k / 40, true], [Math.PI + (Math.PI - t0) * k / 40, true], [-t0 * k / 40, false], [t0 + (Math.PI - t0) * k / 40, false]]) {
        const { g, z } = paperConfig(mu, th), an = mod.analyzeCustom(g, z), kap = paperKappa(mu, th);
        out.cases++;
        assert(an.hOk && an.LOk, 'conditions hold on the paper family');
        out.spread = Math.max(out.spread, an.spread);
        out.kappa = Math.max(out.kappa, Math.hypot(an.kappa[0] - kap.re, an.kappa[1] - kap.im) / abs(kap));
        assert.equal(an.outcome, collapse ? 'collapse' : 'expand', 'outcome at mu ' + mu + ' theta ' + th);
        if (collapse) out.P = Math.max(out.P, Math.abs(an.P / paperP(mu, th) - 1));
      }
    }
  }
  // Proposition 4, μ = 1/2: the two arc minima
  for (const [cth, sign, want] of [[-0.9243893679, -1, 1.0647059762712043], [0.6739838839, 1, 2.2038550160361327]]) {
    const { g, z } = paperConfig(0.5, sign * Math.acos(cth)), an = mod.analyzeCustom(g, z);
    out.P = Math.max(out.P, Math.abs(an.P / want - 1));
  }
  for (let n = 0; n < 300; n++) {
    const g = [0, 1, 2].map(() => (rnd() * 2 - 1) * 3), z = [0, 1, 2].map(() => [rnd() * 4 - 2, rnd() * 4 - 2]);
    const pr = mod.projectCollapse(g, z), an = mod.analyzeCustom(pr.g, pr.z);
    assert.equal(an.outcome, 'collapse', 'projection collapses');
    out.projected++;
    out.projMaxSpread = Math.max(out.projMaxSpread, an.spread, Math.abs(an.hRel), Math.abs(an.LRel));
    out.projMinP = Math.min(out.projMinP, an.P);
    assert(an.P > mod.SQRT3_2);
    const again = mod.projectCollapse(pr.g, pr.z);
    assert(Math.abs(again.mu - pr.mu) < 1e-12 && Math.abs(again.theta - pr.theta) < 1e-9, 'projection is idempotent');
  }
  assert(out.velocity < 1e-12, 'velocity ' + out.velocity);
  assert(out.kappa < 1e-10, 'kappa ' + out.kappa);
  assert(out.P < 1e-10, 'P ' + out.P);
  assert(out.spread < 1e-10 && out.projMaxSpread < 1e-9, 'spread');
  return out;
}

const good = run(load(block));

// Failure controls: each mutation must break the run.
const mutate = (from, to) => { assert(block.includes(from)); return block.replace(from, to); };
const caught = text => { try { run(load(text)); return false; } catch (e) { return true; } };
const controls = {
  kernelSign: caught(mutate('out[i][0] -= c * dy;\n      out[i][1] += c * dx;', 'out[i][0] += c * dy;\n      out[i][1] -= c * dx;')),
  missingFactor2: caught(mutate('out.P = Math.abs(ki) / (-2 * kr);', 'out.P = Math.abs(ki) / (-kr);')),
};
assert(controls.kernelSign && controls.missingFactor2, 'failure controls ' + JSON.stringify(controls));

// The whole module, headless: register it against stubs and build the Custom status line.
const stats = require(path.join(root, 'src/shared/stats.js'));
const noop = new Proxy(function () {}, { get: () => noop, apply: () => noop, set: () => true });
let def = null;
const Studio = { util: { clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)), stats, inkFor: () => '#888888', svgEsc: String, svgDoc: (w, h, bg, body) => body },
  PALETTES: new Proxy({}, { get: () => ({ bg: '#000000', colors: ['#ffffff'] }) }), register: d => { def = d; } };
vm.runInNewContext(source, { Studio, Math, Float64Array, Number, Object, Array, isFinite, Infinity, NaN });
const recipes = {
  default: Object.assign({}, def.defaults, { kind: 'custom' }),
  projected: Object.assign({}, def.defaults, { kind: 'custom', project: true }),
  preset: Object.assign({}, def.defaults, def.presets.custom.p),
  coincide: Object.assign({}, def.defaults, { kind: 'custom', x2: -0.5 }),
  octant: Object.assign({}, def.defaults),
};
// The status line as plain text, for the assertions below: every character outside a tag. A character
// scan, not a regex replace, so no tag can survive the way a single-pass replace lets one through.
const textOf = h => { let out = '', inTag = false; for (const ch of h) { if (ch === '<') inTag = true; else if (ch === '>') inTag = false; else if (!inTag) out += ch; } return out; };
const status = {};
for (const [name, st] of Object.entries(recipes)) {
  def.sanitize(st);
  let html = '';
  const inst = def.create({ canvas: { width: 64, height: 64, getContext: () => noop }, getState: () => st, setStatus: x => { html = x; }, reducedMotion: () => true, isActive: () => false });
  inst.regenerate();
  assert(html && !/NaN|undefined<\/b>|unavailable/.test(html.replace('L <b>undefined</b>', '')), name + ': ' + html);
  status[name] = textOf(html);
}
assert(/RK4 to t/.test(status.default) && /ΔH/.test(status.default), status.default);
assert(/collapse · κ/.test(status.projected) && /sharp bound P (>|&gt;) √3\/2/.test(status.projected), status.projected);
assert(/P = \|ω₀\| t_c 1\.064705976/.test(status.preset), status.preset);
assert(/coincide/.test(status.coincide) && /octant lock/.test(status.octant));
console.log('THREE-VORTEX CUSTOM OK: ' + JSON.stringify({ velocityRel: good.velocity, kappaRel: good.kappa, PRel: good.P, familySpread: good.spread,
  familyCases: good.cases, projected: good.projected, projectedMaxResidual: good.projMaxSpread, projectedMinP: good.projMinP, controls, status }));
