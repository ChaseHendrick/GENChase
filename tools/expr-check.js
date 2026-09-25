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

console.log('EXPR OK: ' + checks + ' checks, ' + E.FUNCTIONS.length + ' functions, ' + CASES.length + ' precedence cases, ' +
  HOSTILE.length + ' hostile inputs refused, ' + GLSL.length + ' exact GLSL strings, ' + Object.keys(MUTANTS).length + ' precedence mutants caught');
