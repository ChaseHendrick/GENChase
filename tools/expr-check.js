// node tools/expr-check.js
// Checks the shared expression language (src/shared/expr.js): agreement with Math on seeded random
// points for every function and precedence case, a battery of hostile inputs that must all be refused,
// the GLSL emitter's exact output and round trip, and negative controls showing that a parser which
// got precedence wrong would fail this file. Runs in npm test; well under a second.
'use strict';
const assert = require('node:assert/strict');
const E = require('../src/shared/expr.js');
const { seeded } = require('../src/shared/stats.js');

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const SPEC = { vars: ['x', 'y'], params: ['a'] };
const same = (u, v) => (Number.isNaN(u) && Number.isNaN(v)) || u === v || Math.abs(u - v) <= 1e-12 * Math.max(1, Math.abs(v));

/* ---- 1. every function agrees with Math on seeded random points ---- */
const MATH = {
  sin: [Math.sin, -6, 6], cos: [Math.cos, -6, 6], tan: [Math.tan, -1.5, 1.5], asin: [Math.asin, -1, 1],
  acos: [Math.acos, -1, 1], atan: [Math.atan, -9, 9], atan2: [Math.atan2, -3, 3], sinh: [Math.sinh, -4, 4],
  cosh: [Math.cosh, -4, 4], tanh: [Math.tanh, -4, 4], exp: [Math.exp, -5, 5], log: [Math.log, 1e-3, 50],
  sqrt: [Math.sqrt, 0, 50], abs: [Math.abs, -5, 5], min: [Math.min, -5, 5], max: [Math.max, -5, 5],
  pow: [Math.pow, 0.1, 3], floor: [Math.floor, -5, 5], sign: [Math.sign, -5, 5],
};
assert.deepEqual([...E.FUNCTIONS].sort(), Object.keys(MATH).sort(), 'the test table covers exactly the whitelist');
const rng = seeded('expr-check');
const range = (lo, hi) => lo + (hi - lo) * rng();
for (const [name, [f, lo, hi]] of Object.entries(MATH)) {
  const fn = E.compile(f.length === 2 || name === 'min' || name === 'max' ? name + '(x, y)' : name + '(x)', SPEC);
  for (let i = 0; i < 200; i++) {
    const env = [range(lo, hi), range(lo, hi), 0];
    ok(Object.is(fn(env), name === 'min' || name === 'max' || f.length === 2 ? f(env[0], env[1]) : f(env[0])), name + ' at ' + env);
  }
}
ok(E.compile('pi + e', SPEC)([0, 0, 0]) === Math.PI + Math.E, 'constants');

/* ---- 2. precedence and associativity against hand-written JavaScript ---- */
const CASES = [
  ['x + y * a', (x, y, a) => x + y * a], ['x - y - a', (x, y, a) => (x - y) - a], ['x / y / a', (x, y, a) => (x / y) / a],
  ['x * y / a * x', (x, y, a) => ((x * y) / a) * x], ['x - y + a', (x, y, a) => (x - y) + a], ['x / y * a', (x, y, a) => (x / y) * a],
  ['-x^2', x => -Math.pow(x, 2)], ['x^y^a', (x, y, a) => Math.pow(x, Math.pow(y, a))], ['2^-x', x => Math.pow(2, -x)],
  ['-2^2', () => -4], ['2^3^2', () => 512], ['x - -y', (x, y) => x + y], ['(x + y) * a', (x, y, a) => (x + y) * a],
  ['x + y^2 * a', (x, y, a) => x + Math.pow(y, 2) * a], ['x * -y^a', (x, y, a) => x * -Math.pow(y, a)],
  ['-(x - y)^2', (x, y) => -Math.pow(x - y, 2)], ['a*x^2 + y/x - 3', (x, y, a) => a * x * x + y / x - 3],
  ['1e-3*x + .5*y - 2.', (x, y) => 0.001 * x + 0.5 * y - 2], ['sin(x)^2 + cos(x)^2', x => Math.pow(Math.sin(x), 2) + Math.pow(Math.cos(x), 2)],
  ['atan2(y, x) / pi', (x, y) => Math.atan2(y, x) / Math.PI], ['min(x, y) - max(x, a) * 2', (x, y, a) => Math.min(x, y) - Math.max(x, a) * 2],
  ['2 * x ^ 2 ^ -1', x => 2 * Math.pow(x, Math.pow(2, -1))], ['x / (y - a) ^ 2', (x, y, a) => x / Math.pow(y - a, 2)],
];
const POINTS = Array.from({ length: 60 }, () => [range(0.5, 2.5), range(0.5, 2.5), range(0.5, 2.5)]);
// Number of cases on which an evaluator (text, env) -> value disagrees with the JavaScript reference.
const mismatches = evaluate => CASES.filter(([text, js]) => POINTS.some(p => !same(evaluate(text, p), js(...p)))).length;
const real = (text, env) => E.compile(text, SPEC)(env);
ok(mismatches(real) === 0, 'the parser agrees with JavaScript on every precedence case');
checks += CASES.length * POINTS.length - 1;

/* ---- 3. negative controls: parsers that get precedence wrong must fail section 2 ---- */
// A precedence-climbing evaluator over the same tokens, with binding powers as parameters. The correct
// table must pass (so the harness can pass), and every mutant must fail (so it can fail).
const GLSL_ATAN = (u, v) => v === undefined ? Math.atan(u) : Math.atan2(u, v);
// bp: binding power per operator; neg: the power a unary minus claims for its operand; right: the
// right-associative operators. Also evaluates the emitted GLSL, where atan may take two arguments.
function climber(bp, neg, right) {
  return (text, env) => {
    const t = E.tokenize(text); let k = 0;
    const vars = { x: env[0], y: env[1], a: env[2], pi: Math.PI, e: Math.E };
    const apply = (op, l, r) => op === '+' ? l + r : op === '-' ? l - r : op === '*' ? l * r : op === '/' ? l / r : Math.pow(l, r);
    const prefix = () => {
      const tok = t[k++];
      if (tok.t === 'num') return tok.v;
      if (tok.t === '-') return -climb(neg);
      if (tok.t === '(') { const v = climb(0); k++; return v; }
      if (t[k].t !== '(') return vars[tok.v];
      k++; const args = [climb(0)];
      while (t[k].t === ',') { k++; args.push(climb(0)); }
      k++;
      return (tok.v === 'atan' ? GLSL_ATAN : MATH[tok.v][0])(...args);
    };
    const climb = min => {
      let left = prefix();
      for (;;) {
        const op = t[k].t, p = bp[op];
        if (p === undefined || p < min) return left;
        k++;
        left = apply(op, left, climb(right.has(op) ? p : p + 1));
      }
    };
    return climb(0);
  };
}
const RIGHT = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 }, CARET = new Set(['^']);
ok(mismatches(climber(RIGHT, 3, CARET)) === 0, 'control: a correct precedence climber passes section 2');
const MUTANTS = {
  'ignores precedence (flat, left to right)': climber({ '+': 1, '-': 1, '*': 1, '/': 1, '^': 1 }, 9, new Set()),
  'additive binds tighter than multiplicative': climber({ '+': 2, '-': 2, '*': 1, '/': 1, '^': 3 }, 3, CARET),
  '^ is left-associative': climber(RIGHT, 3, new Set()),
  'unary minus binds tighter than ^': climber(RIGHT, 4, CARET),
};
for (const [name, mutant] of Object.entries(MUTANTS)) {
  const miss = mismatches(mutant);
  ok(miss > 0, 'negative control not caught: ' + name);
  console.log('  mutant caught: ' + name + ' (' + miss + ' of ' + CASES.length + ' cases differ)');
}

/* ---- 4. hostile and malformed inputs are refused with a position ---- */
const HOSTILE = [
  '', '   ', 'alert(1)', 'x;y', '`x`', '${x}', '<img src=x onerror=alert(1)>', '</script><script>alert(1)</script>',
  'constructor', '__proto__', 'prototype', 'x.constructor', 'constructor.constructor("alert(1)")()', '__proto__(x)',
  'this', 'window', 'globalThis', 'Function', 'eval(x)', 'toString', 'valueOf', 'hasOwnProperty(x)', 'require(x)',
  'x["y"]', "'1'", '"1"', 'x=1', 'x==y', 'x&&y', 'x||y', '!x', '~x', 'x%2', 'x?y:a', 'x,y', '{}', '[x]', 'x\\u0061',
  '//x', '/*x*/', 'x\ny', 'x\u0000', 'x\ry', 'new x', 'x y', '2x', '2pi', '1e', '1e+', '1.2.3', '0x10', '1_000', '.', '1e999',
  '+x', 'x++y', 'x--', 'x^', '(x', 'x)', '()', 'sin', 'sin()', 'sin(x, y)', 'atan2(x)', 'pow(x)', 'min(x, y, a)', 'foo(x)',
  'x(y)', 'pi(x)', 'Sin(x)', 'X', 'z', 't',
  // Unicode lookalikes and invisible characters
  'ѕin(x)', 'х', '−x', '１', 'x​y', 'x +y', '‮x+y', 'x +y', 'x﹢y', 'а',
  'x' + '+x'.repeat(128), '('.repeat(33) + 'x' + ')'.repeat(33), '-'.repeat(33) + 'x', 'sin('.repeat(33) + 'x' + ')'.repeat(33),
  'x^'.repeat(33) + 'x', 'a'.repeat(33), 'x'.repeat(300),
  null, undefined, 42, {}, ['x'], { toString() { return 'x'; } },
];
for (const input of HOSTILE) {
  const err = E.check(input, SPEC);
  const len = typeof input === 'string' ? input.length : 0;
  ok(err && typeof err.message === 'string' && Number.isInteger(err.pos) && err.pos >= 0 && err.pos <= Math.max(len, 256),
    'hostile input accepted: ' + JSON.stringify(input));
  assert.throws(() => E.compile(input, SPEC), e => e instanceof E.ExprError); checks++;
}
// the limits admit exactly what they say
ok(E.check('x' + '+x'.repeat(127) + ' ', SPEC) === null, '256 characters is allowed');
ok(E.check('('.repeat(32) + 'x' + ')'.repeat(32), SPEC) === null, 'depth 32 is allowed');
ok(E.check('-'.repeat(32) + 'x', SPEC) === null, '32 unary minuses are allowed');
for (const [text, pos] of [['sin(x) + foo', 9], ['x;y', 1], ['(x', 2], ['1e', 1], ['x + −y', 4], ['2pi', 1], ['x y', 2]]) {
  ok(E.check(text, SPEC).pos === pos, 'error position for ' + JSON.stringify(text));
}
ok(/U\+202E/.test(E.check('‮x', SPEC).message), 'invisible characters are named by code point, not echoed');
for (const bad of ['__proto__', 'constructor', 'sin', 'pi', 'x y', '', 7]) {
  assert.throws(() => E.parse('x', { vars: [bad] }), TypeError); checks++;
}
assert.throws(() => E.compile({ type: 'var', index: 0 }, SPEC), E.ExprError); checks++;   // a forged tree is not compiled

/* ---- 5. GLSL: exact output, token whitelist, exact round trip ---- */
const GLSL = [
  ['x + y*a', '(x + (y * a))'], ['-x^2', '(-pow(x, 2.0))'], ['atan2(y, x)', 'atan(y, x)'], ['1e-3*x', '(0.001 * x)'],
  ['pi', '3.141592653589793'], ['2^3^2', 'pow(2.0, pow(3.0, 2.0))'], ['x - -y', '(x - (-y))'], ['1e30*x', '(1e+30 * x)'],
  ['sign(floor(x)) / max(a, 1)', '(sign(floor(x)) / max(a, 1.0))'],
];
for (const [text, want] of GLSL) ok(E.toGLSL(text, SPEC) === want, 'GLSL for ' + text + ': ' + E.toGLSL(text, SPEC));
ok(E.toGLSL('x*y', SPEC, { rename: { x: 'p.x', y: 'p.y' } }) === '(p.x * p.y)', 'GLSL rename');
for (const bad of [{ x: 'gl_FragColor' }, { x: 'x; discard' }, { z: 'q' }, { x: 'a b' }]) {
  assert.throws(() => E.toGLSL('x', SPEC, { rename: bad }), TypeError); checks++;
}
assert.throws(() => E.toGLSL('1e39', SPEC), E.ExprError); checks++;
const TOKEN = /\s*(\d+\.\d*(e[+-]?\d+)?|\d+e[+-]?\d+|[A-Za-z_]\w*|[-+*/(),])/y;
const GLSL_OK = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'sqrt', 'abs', 'min', 'max', 'pow', 'floor', 'sign', 'x', 'y', 'a']);
const glslEval = climber(RIGHT, 3, CARET);      // the GLSL is fully parenthesized, so precedence cannot matter
for (const [text] of CASES.concat(Object.keys(MATH).map(n => [n === 'min' || n === 'max' || MATH[n][0].length === 2 ? n + '(x, y)' : n + '(x)']))) {
  const g = E.toGLSL(text, SPEC);
  for (let at = 0; at < g.length;) {
    TOKEN.lastIndex = at;
    const m = TOKEN.exec(g);
    ok(m && (!/^[A-Za-z_]/.test(m[1]) || GLSL_OK.has(m[1])), 'GLSL token outside the whitelist in ' + g);
    at = TOKEN.lastIndex;
  }
  const fn = E.compile(text, SPEC);
  for (const p of POINTS.slice(0, 20)) ok(Object.is(glslEval(g, p), fn(p)), 'GLSL round trip for ' + text + ' at ' + p);
}

/* ==== complex mode ==== */
// An independent reference: complex numbers as [re, im] pairs, with the transcendental functions built
// from exp and log by their textbook identities (sin z = (e^iz - e^-iz) / 2i, sqrt z = exp(log z / 2),
// z^n = r^n e^(i n theta), ...), not from the real-part formulas src/shared/expr.js uses. Principal
// branches: arg in (-pi, pi].
const R = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], neg: a => [-a[0], -a[1]],
  mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
  div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
  exp: a => [Math.exp(a[0]) * Math.cos(a[1]), Math.exp(a[0]) * Math.sin(a[1])],
  log: a => [Math.log(Math.sqrt(a[0] * a[0] + a[1] * a[1])), Math.atan2(a[1], a[0])],
};
const I = [0, 1];
Object.assign(R, {
  sin: a => R.div(R.sub(R.exp(R.mul(I, a)), R.exp(R.neg(R.mul(I, a)))), [0, 2]),
  cos: a => R.mul(R.add(R.exp(R.mul(I, a)), R.exp(R.neg(R.mul(I, a)))), [0.5, 0]),
  sinh: a => R.mul(R.sub(R.exp(a), R.exp(R.neg(a))), [0.5, 0]),
  cosh: a => R.mul(R.add(R.exp(a), R.exp(R.neg(a))), [0.5, 0]),
  sqrt: a => a[0] === 0 && a[1] === 0 ? [0, 0] : R.exp(R.mul(R.log(a), [0.5, 0])),
  pow: (a, b) => a[0] === 0 && a[1] === 0 ? (b[0] === 0 && b[1] === 0 ? [1, 0] : b[0] > 0 ? [0, 0] : [NaN, NaN]) : R.exp(R.mul(b, R.log(a))),
  ipow: (a, n) => { const r = Math.pow(Math.hypot(a[0], a[1]), n), t = n * Math.atan2(a[1], a[0]); return [r * Math.cos(t), r * Math.sin(t)]; },
  conj: a => [a[0], -a[1]], re: a => [a[0], 0], im: a => [a[1], 0],
  abs: a => [Math.sqrt(a[0] * a[0] + a[1] * a[1]), 0], arg: a => [Math.atan2(a[1], a[0]), 0],
});
Object.assign(R, { tan: a => R.div(R.sin(a), R.cos(a)), tanh: a => R.div(R.sinh(a), R.cosh(a)) });
const CSPEC = { vars: ['z', 'w'], params: ['a'] };
const near = (u, v, tol) => {
  if (u.some(Number.isNaN) || v.some(Number.isNaN)) return u.every(Number.isNaN) && v.every(Number.isNaN);
  return Math.hypot(u[0] - v[0], u[1] - v[1]) <= (tol || 1e-9) * Math.max(1, Math.hypot(v[0], v[1]));
};
const crng = seeded('expr-check/complex');
const cpt = (lo, hi) => [lo + (hi - lo) * crng(), lo + (hi - lo) * crng()];
const envOf = (...zs) => zs.flat();

/* ---- 6. every complex function agrees with the reference on seeded points ---- */
// name -> [domain half-width, reference, arity]. The domains keep tan, tanh and the divisions away from
// poles, where two correct implementations may round apart by more than any fixed tolerance.
const CFUN = {
  sin: [3, R.sin], cos: [3, R.cos], tan: [1.4, R.tan], sinh: [3, R.sinh], cosh: [3, R.cosh], tanh: [1.4, R.tanh],
  exp: [5, R.exp], log: [4, R.log], sqrt: [4, R.sqrt], conj: [4, R.conj], re: [4, R.re], im: [4, R.im],
  abs: [4, R.abs], arg: [4, R.arg], pow: [2, R.pow, 2],
};
assert.deepEqual([...E.COMPLEX_FUNCTIONS].sort(), Object.keys(CFUN).sort(), 'the complex test table covers exactly the whitelist');
assert.deepEqual([...E.COMPLEX_CONSTANTS].sort(), ['e', 'i', 'pi'], 'complex constants');
const CPOINTS = {};
for (const [name, [h]] of Object.entries(CFUN)) CPOINTS[name] = Array.from({ length: 200 }, () => [cpt(-h, h), cpt(-h, h), cpt(-h, h)]);
// Number of functions on which an evaluator (name, [z, w]) -> [re, im] disagrees with the reference table.
const fnMismatches = (ref, evaluate) => Object.keys(CFUN).filter(name =>
  CPOINTS[name].some(([z, w]) => !near(evaluate(name, z, w), CFUN[name][2] === 2 ? ref[name](z, w) : ref[name](z)))).length;
const compiledFn = {};
for (const name of Object.keys(CFUN)) compiledFn[name] = E.compileComplex(CFUN[name][2] === 2 ? name + '(z, w)' : name + '(z)', CSPEC);
const viaCompile = (name, z, w) => compiledFn[name](envOf(z, w, [0, 0]));
const REF = Object.fromEntries(Object.entries(CFUN).map(([n, v]) => [n, v[1]]));
ok(fnMismatches(REF, viaCompile) === 0, 'every complex function agrees with the reference');
checks += Object.keys(CFUN).length * 200 - 1;
// out is filled in place and returned; without it a new pair is returned
{ const f = E.compileComplex('z*w', CSPEC), out = [9, 9];
  ok(f(envOf([1, 2], [3, 4], [0, 0]), out) === out && out[0] === -5 && out[1] === 10, 'compileComplex writes into out');
  ok(f(envOf([1, 2], [3, 4], [0, 0])) !== f(envOf([1, 2], [3, 4], [0, 0])), 'compileComplex returns a fresh pair without out'); }
// integer powers: n repeated multiplications against the polar reference r^n e^(i n theta)
for (let n = 0; n <= 32; n++) {
  const f = E.compileComplex('z^' + n, CSPEC), g = E.compileComplex('pow(z, ' + n + ')', CSPEC);
  for (let k = 0; k < 20; k++) {
    const z = cpt(-1.3, 1.3), e = envOf(z, [0, 0], [0, 0]);
    ok(near(f(e), R.ipow(z, n), 1e-11) && near(g(e), R.ipow(z, n), 1e-11), 'z^' + n + ' at ' + z);
  }
}
ok(near(E.compileComplex('z^0', CSPEC)([0, 0, 0, 0, 0, 0]), [1, 0], 0), '0^0 = 1 by repeated multiplication');
// the real axis: where the real language is defined and real, the complex language returns the same number
for (const [name, lo, hi] of [['sin', -6, 6], ['cos', -6, 6], ['tan', -1.5, 1.5], ['sinh', -4, 4], ['cosh', -4, 4], ['tanh', -4, 4],
  ['exp', -5, 5], ['log', 1e-3, 50], ['sqrt', 0, 50], ['abs', -5, 5]]) {
  const fr = E.compile(name + '(x)', SPEC), fc = E.compileComplex(name + '(z)', CSPEC);
  for (let k = 0; k < 50; k++) {
    const x = range(lo, hi), c = fc([x, 0, 0, 0, 0, 0]);
    ok(same(c[0], fr([x, 0, 0])) && c[1] === 0 || (Math.abs(c[0] - fr([x, 0, 0])) <= 1e-12 * Math.max(1, Math.abs(c[0])) && Math.abs(c[1]) <= 1e-15), 'real axis: ' + name + '(' + x + ')');
  }
}
// principal branches at named points, exactly as documented in src/shared/expr.js
const C0 = E.compileComplex.bind(null);
for (const [text, want, tol] of [
  ['log(-1)', [0, Math.PI], 0], ['arg(-1)', [Math.PI, 0], 0], ['arg(-1 - 0*i)', [Math.PI, 0], 0], ['sqrt(-4)', [0, 2], 0],
  ['sqrt(-4 - 0*i)', [0, 2], 0], ['sqrt(-4 - 1e-300*i)', [0, -2], 1e-15], ['log(0)', [-Infinity, 0], 0], ['sqrt(0)', [0, 0], 0],
  ['(-8)^(1/3)', [1, Math.sqrt(3)], 1e-15], ['i^i', [Math.exp(-Math.PI / 2), 0], 1e-15], ['exp(i*pi) + 1', [0, 0], 1e-15],
  ['pow(0, 0)', [0 + 1, 0], 0], ['pow(0, 2.5)', [0, 0], 0], ['0^(1 + i)', [0, 0], 0], ['0^i', [NaN, NaN], 0], ['0^(-1.5)', [NaN, NaN], 0],
  ['1/0', [NaN, NaN], 0], ['tan(30*i)', [0, 1], 0], ['tanh(-30)', [-1, 0], 0], ['abs(3 + 4*i)', [5, 0], 0], ['conj(1 + 2*i)', [1, -2], 0],
  ['re(1 + 2*i) + im(1 + 2*i)', [3, 0], 0], ['e', [Math.E, 0], 0], ['pi*i', [0, Math.PI], 0], ['exp(710 + 0*i)', [Infinity, 0], 0],
]) {
  const got = C0(text, CSPEC)([0, 0, 0, 0, 0, 0]);
  const hit = want.every(Number.isNaN) ? got.every(Number.isNaN)
    : (tol === 0 ? Object.is(got[0] + 0, want[0] + 0) && Object.is(got[1] + 0, want[1] + 0) : near(got, want, tol));
  ok(hit, 'branch or special value ' + text + ' = ' + got);
}

/* ---- 7. complex precedence against the reference ---- */
const CCASES = [
  ['z + w * a', (z, w, a) => R.add(z, R.mul(w, a))], ['z - w - a', (z, w, a) => R.sub(R.sub(z, w), a)],
  ['z / w / a', (z, w, a) => R.div(R.div(z, w), a)], ['z * w / a * z', (z, w, a) => R.mul(R.div(R.mul(z, w), a), z)],
  ['-z^2', z => R.neg(R.ipow(z, 2))], ['z^w^a', (z, w, a) => R.pow(z, R.pow(w, a))], ['2^-z', z => R.pow([2, 0], R.neg(z))],
  ['-2^2', () => [-4, 0]], ['z^2^3', z => R.pow(z, [8, 0])], ['z - -w', (z, w) => R.add(z, w)], ['(z + w) * a', (z, w, a) => R.mul(R.add(z, w), a)],
  ['z + w^2 * a', (z, w, a) => R.add(z, R.mul(R.ipow(w, 2), a))], ['z * -w^a', (z, w, a) => R.mul(z, R.neg(R.pow(w, a)))],
  ['i*z + conj(w)', (z, w) => R.add(R.mul(I, z), R.conj(w))], ['sin(z)^2 + cos(z)^2', () => [1, 0]],
  ['exp(i*pi*z) / (3 + w)', (z, w) => R.div(R.exp(R.mul(R.mul(I, [Math.PI, 0]), z)), R.add([3, 0], w))],
  ['sqrt(z)*sqrt(w) - sqrt(z*w)', (z, w) => R.sub(R.mul(R.sqrt(z), R.sqrt(w)), R.sqrt(R.mul(z, w)))],
  ['log(z) + log(w) - log(z*w)', (z, w) => R.sub(R.add(R.log(z), R.log(w)), R.log(R.mul(z, w)))],
  ['z^3 - 2*z^2*w + a', (z, w, a) => R.add(R.sub(R.ipow(z, 3), R.mul(R.mul([2, 0], R.ipow(z, 2)), w)), a)],
  ['re(z) + i*im(w) - abs(a)*arg(z)', (z, w, a) => R.sub(R.add(R.re(z), R.mul(I, R.im(w))), R.mul(R.abs(a), R.arg(z)))],
  ['pow(z, w) / z^0.5', (z, w) => R.div(R.pow(z, w), R.pow(z, [0.5, 0]))], ['e^z - exp(z)', () => [0, 0]],
  ['1/z - w/(z - a)', (z, w, a) => R.sub(R.div([1, 0], z), R.div(w, R.sub(z, a)))], ['z/w*a^2', (z, w, a) => R.mul(R.div(z, w), R.ipow(a, 2))],
];
const CPTS = Array.from({ length: 60 }, () => [cpt(-2.5, 2.5), cpt(-2.5, 2.5), cpt(-2.5, 2.5)]).filter(p => p.every(q => Math.hypot(q[0], q[1]) > 0.3));
const cMismatches = evaluate => CCASES.filter(([text, js]) => CPTS.some(p => !near(evaluate(text, p), js(...p), 1e-8))).length;
const complexEval = (text, p) => E.compileComplex(text, CSPEC)(envOf(...p));
ok(cMismatches(complexEval) === 0, 'the complex parser agrees with the reference on every precedence case');
checks += CCASES.length * CPTS.length - 1;

/* ---- 8. negative controls for the complex checks ---- */
// A complex precedence climber over the same tokens and the reference functions. The correct table
// passes section 7; every precedence mutant fails it.
const CREF_CALL = Object.assign({}, REF, { cpowi: (z, n) => R.ipow(z, n[0]) });
function cclimber(bp, neg, right) {
  return (text, env) => {
    const t = E.tokenize(text); let k = 0;
    const vars = { z: env[0], w: env[1], a: env[2], i: I, pi: [Math.PI, 0], e: [Math.E, 0] };
    const apply = (op, l, r) => op === '+' ? R.add(l, r) : op === '-' ? R.sub(l, r) : op === '*' ? R.mul(l, r) : op === '/' ? R.div(l, r) : R.pow(l, r);
    const prefix = () => {
      const tok = t[k++];
      if (tok.t === 'num') return [tok.v, 0];
      if (tok.t === '-') return R.neg(climb(neg));
      if (tok.t === '(') { const v = climb(0); k++; return v; }
      if (t[k].t !== '(') return vars[tok.v];
      k++; const args = [climb(0)];
      while (t[k].t === ',') { k++; args.push(climb(0)); }
      k++;
      return REF[tok.v](...args);
    };
    const climb = min => {
      let left = prefix();
      for (;;) {
        const op = t[k].t, p = bp[op];
        if (p === undefined || p < min) return left;
        k++;
        left = apply(op, left, climb(right.has(op) ? p : p + 1));
      }
    };
    return climb(0);
  };
}
ok(cMismatches(cclimber(RIGHT, 3, CARET)) === 0, 'control: a correct complex precedence climber passes section 7');
for (const [name, mutant] of Object.entries({
  'ignores precedence (flat, left to right)': cclimber({ '+': 1, '-': 1, '*': 1, '/': 1, '^': 1 }, 9, new Set()),
  'additive binds tighter than multiplicative': cclimber({ '+': 2, '-': 2, '*': 1, '/': 1, '^': 3 }, 3, CARET),
  '^ is left-associative': cclimber(RIGHT, 3, new Set()),
  'unary minus binds tighter than ^': cclimber(RIGHT, 4, CARET),
})) {
  const miss = cMismatches(mutant);
  ok(miss > 0, 'complex negative control not caught: ' + name);
  console.log('  complex mutant caught: ' + name + ' (' + miss + ' of ' + CCASES.length + ' cases differ)');
}
// Wrong implementations of single functions, as a buggy expr.js might have them. Each one must disagree
// with compileComplex somewhere on the section 6 points, which shows section 6 can fail.
const FN_MUTANTS = {
  'arg in [0, 2 pi) instead of (-pi, pi]': { log: a => { const l = R.log(a); return [l[0], l[1] < 0 ? l[1] + 2 * Math.PI : l[1]]; } },
  'sqrt on the other sheet': { sqrt: a => R.neg(R.sqrt(a)) },
  'sqrt with the cut on the positive real axis': { sqrt: a => { const s = R.sqrt(R.neg(a)); return R.mul([0, 1], s); } },
  'pow as exp(log(w) z)': { pow: (a, b) => R.exp(R.mul(a, R.log(b))) },
  'sin with a conjugated argument': { sin: a => R.sin(R.conj(a)) },
  'cos(z) as cosh(z)': { cos: R.cosh },
  'tanh as tan': { tanh: R.tan },
  'abs as |z|^2': { abs: a => [a[0] * a[0] + a[1] * a[1], 0] },
  'arg as atan(y / x)': { arg: a => [Math.atan(a[1] / a[0]), 0] },
  'im returning -Im': { im: a => [-a[1], 0] },
};
for (const [name, patch] of Object.entries(FN_MUTANTS)) {
  const miss = fnMismatches(Object.assign({}, REF, patch), viaCompile);
  ok(miss > 0, 'function mutant not caught: ' + name);
}
console.log('  complex function mutants caught: ' + Object.keys(FN_MUTANTS).length + ' of ' + Object.keys(FN_MUTANTS).length);

/* ---- 9. complex hostile inputs, names and limits ---- */
const CH_SPEC = { vars: ['x', 'y'], params: ['a'] };
const CHOSTILE = HOSTILE.concat([
  'i(x)', 'i=1', 'atan2(y, x)', 'atan(x)', 'asin(x)', 'acos(x)', 'min(x, y)', 'max(x, y)', 'floor(x)', 'sign(x)', 'conj', 'conj(x, y)',
  're()', 'pow(x)', 'pow(x, y, a)', 'x^i^', 'I', 'j', 'ix', 'xi', '2i', '3.i', 'i.x', 'arg', 'abs(x, y)', 'Re(x)', 'pi i',
]);
for (const input of CHOSTILE) {
  const err = E.checkComplex(input, CH_SPEC);
  const len = typeof input === 'string' ? input.length : 0;
  ok(err && typeof err.message === 'string' && Number.isInteger(err.pos) && err.pos >= 0 && err.pos <= Math.max(len, 256),
    'complex hostile input accepted: ' + JSON.stringify(input));
  assert.throws(() => E.compileComplex(input, CH_SPEC), e => e instanceof E.ExprError); checks++;
  assert.throws(() => E.toGLSLComplex(input, CH_SPEC), e => e instanceof E.ExprError); checks++;
}
ok(E.checkComplex('x' + '+x'.repeat(127) + ' ', CH_SPEC) === null, 'complex: 256 characters is allowed');
ok(E.checkComplex('('.repeat(32) + 'x' + ')'.repeat(32), CH_SPEC) === null, 'complex: depth 32 is allowed');
ok(E.checkComplex('-'.repeat(32) + 'x', CH_SPEC) === null, 'complex: 32 unary minuses are allowed');
for (const [text, pos] of [['sin(x) + atan(x)', 9], ['x + min(x, y)', 4], ['2i', 1], ['x^i^', 4], ['conj(x) + foo', 10], ['(x', 2]]) {
  ok(E.checkComplex(text, CH_SPEC).pos === pos, 'complex error position for ' + JSON.stringify(text));
}
ok(/not available for complex numbers/.test(E.checkComplex('atan2(y, x)', CH_SPEC).message), 'a real-only function is named as such');
ok(E.checkComplex('1e39*x', CH_SPEC) === null && E.checkComplex('1e39*x', CH_SPEC, { glsl: true }).pos === 0, 'a literal outside the float range is refused with { glsl: true }');
for (const bad of ['i', 'pi', 'e', 'conj', 're', 'arg', 'atan2', 'min', '__proto__', 'x y', '']) {
  assert.throws(() => E.parseComplex('1', { vars: [bad] }), TypeError); checks++;
}
assert.throws(() => E.compileComplex(E.parse('x', SPEC), SPEC), E.ExprError); checks++;          // a real tree is not a complex one
assert.throws(() => E.compile(E.parseComplex('x', CH_SPEC), CH_SPEC), E.ExprError); checks++;     // and the other way round
assert.throws(() => E.compileComplex({ type: 'var', index: 0 }, CH_SPEC), E.ExprError); checks++;
ok(E.check('i', { vars: ['i'] }) === null, 'the real language keeps i as an ordinary caller name');

/* ---- 10. complex GLSL: exact output, whitelist, prelude and round trip ---- */
const CGLSL = [
  ['z^2 + w', '(cpowi(z, 2.0) + w)'], ['z*z + w', '(cmul(z, z) + w)'], ['w*sin(z)', 'cmul(w, csin(z))'],
  ['exp(i*pi*z)', 'cexp(cmul(cmul(vec2(0.0, 1.0), vec2(3.141592653589793, 0.0)), z))'], ['z^w', 'cpow(z, w)'],
  ['-z^2', '(-cpowi(z, 2.0))'], ['1/z', 'cdiv(vec2(1.0, 0.0), z)'], ['conj(z) - re(z)', '(conj(z) - cre(z))'],
  ['pow(z, 3) + pow(z, 0.5)', '(cpowi(z, 3.0) + cpow(z, vec2(0.5, 0.0)))'], ['z^-1', 'cpow(z, (-vec2(1.0, 0.0)))'],
  ['abs(z)*arg(w) - im(z)', '(cmul(cabs(z), carg(w)) - cim(z))'], ['tan(z)/tanh(w)', 'cdiv(ctan(z), ctanh(w))'],
];
for (const [text, want] of CGLSL) ok(E.toGLSLComplex(text, CSPEC) === want, 'complex GLSL for ' + text + ': ' + E.toGLSLComplex(text, CSPEC));
ok(E.toGLSLComplex('z*a', CSPEC, { rename: { a: 'u_a' } }) === 'cmul(z, u_a)', 'complex GLSL rename');
for (const bad of [{ z: 'gl_FragColor' }, { z: 'z; discard' }, { q: 'q' }, { z: 'a b' }, { z: 'cmul' }, { z: 'vec2' }]) {
  assert.throws(() => E.toGLSLComplex('z', CSPEC, { rename: bad }), TypeError); checks++;
}
assert.throws(() => E.toGLSLComplex('1e39*z', CSPEC), E.ExprError); checks++;
// every helper the emitter can write is defined once in the prelude, and the prelude's braces balance
const HELPERS = ['cmul', 'cdiv', 'cexp', 'clog', 'csin', 'ccos', 'ctan', 'csinh', 'ccosh', 'ctanh', 'csqrt', 'cpow', 'cpowi', 'conj', 'cre', 'cim', 'cabs', 'carg'];
for (const h of HELPERS) ok(E.COMPLEX_GLSL.split('vec2 ' + h + '(').length === 2, 'the prelude defines ' + h + ' once');
ok(E.COMPLEX_GLSL.split('{').length === E.COMPLEX_GLSL.split('}').length && !/\beval\b|\bFunction\b/.test(E.COMPLEX_GLSL), 'prelude braces balance');
// Round trip: evaluate the emitted GLSL with the reference helpers and compare with compileComplex. The
// emitter parenthesizes everything, so this small reader needs no precedence.
const CTOKEN = /\s*(\d+\.\d*(?:e[+-]?\d+)?|\d+e[+-]?\d+|[A-Za-z_]\w*|[-+(),])/y;
const GL_OK = new Set(HELPERS.concat(['vec2', 'z', 'w', 'a']));
const HELPER_REF = {
  cmul: R.mul, cdiv: R.div, cexp: R.exp, clog: R.log, csin: R.sin, ccos: R.cos, ctan: R.tan, csinh: R.sinh, ccosh: R.cosh, ctanh: R.tanh,
  csqrt: R.sqrt, cpow: R.pow, cpowi: (z, n) => R.ipow(z, n), conj: R.conj, cre: R.re, cim: R.im, cabs: R.abs, carg: R.arg,
};
function glslComplexEval(g, env) {
  const t = [];
  for (let at = 0; at < g.length;) {
    CTOKEN.lastIndex = at;
    const m = CTOKEN.exec(g);
    ok(m && (!/^[A-Za-z_]/.test(m[1]) || GL_OK.has(m[1])), 'complex GLSL token outside the whitelist in ' + g);
    t.push(m[1]); at = CTOKEN.lastIndex;
  }
  let k = 0;
  const vars = { z: env.slice(0, 2), w: env.slice(2, 4), a: env.slice(4, 6) };
  const term = () => {
    const tok = t[k++];
    if (/^\d/.test(tok)) return Number(tok);
    if (tok === '(') {
      if (t[k] === '-') { k++; const v = term(); k++; return R.neg(v); }
      const l = term(), op = t[k++], r = term(); k++;
      return op === '+' ? R.add(l, r) : R.sub(l, r);
    }
    if (t[k] !== '(') return vars[tok];
    k++; const args = [term()];
    while (t[k] === ',') { k++; args.push(term()); }
    k++;
    return tok === 'vec2' ? args : HELPER_REF[tok](...args);
  };
  return term();
}
for (const [text] of CCASES.concat(CGLSL)) {
  const g = E.toGLSLComplex(text, CSPEC), fn = E.compileComplex(text, CSPEC);
  for (const p of CPTS.slice(0, 20)) ok(near(glslComplexEval(g, envOf(...p)), fn(envOf(...p)), 1e-8), 'complex GLSL round trip for ' + text + ' at ' + p);
}

console.log('EXPR OK: ' + checks + ' checks, ' + E.FUNCTIONS.length + ' functions, ' + CASES.length + ' precedence cases, ' +
  HOSTILE.length + ' hostile inputs refused, ' + GLSL.length + ' exact GLSL strings, ' + Object.keys(MUTANTS).length + ' precedence mutants caught');
console.log('COMPLEX OK: ' + E.COMPLEX_FUNCTIONS.length + ' functions against an independent reference, ' + CCASES.length + ' precedence cases, ' +
  CHOSTILE.length + ' hostile inputs refused, ' + CGLSL.length + ' exact GLSL strings, 4 precedence mutants and ' + Object.keys(FN_MUTANTS).length + ' function mutants caught');
