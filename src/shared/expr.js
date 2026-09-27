/* The shared expression language. Formulas a person types into the studio travel inside shareable
   URL hashes, so user text is never executed as code: no eval, no Function constructor, no string
   timers and no string-built scripts. A tokenizer and a recursive-descent parser turn the text into
   a syntax tree; compile() turns that tree into nested closures, and toGLSL() writes the same tree
   as GLSL built only from whitelisted tokens. tools/expr-check.js tests all three, and tools/lint.js
   fails any call to eval or the Function constructor in src/.

   Grammar, loosest binding first:
     expr    := term (('+' | '-') term)*
     term    := unary (('*' | '/') unary)*
     unary   := '-' unary | power
     power   := primary ('^' unary)?        right-associative: 2^3^2 = 2^9, and -x^2 = -(x^2)
     primary := number | name | function '(' expr (',' expr)* ')' | '(' expr ')'
   Numbers are decimal with an optional exponent (1e-3, .5, 2.). Names are the caller's variables and
   parameters, the constants pi and e, and the functions in FUNCTIONS; any other name is an error, and
   the names constructor, __proto__ and prototype are always errors. Only ASCII letters, digits, _ . +
   - * / ^ ( ) , space and tab are accepted. Text is at most 256 characters and nests at most 32 deep.
   Every error carries a message and a 0-based character position, so the UI can point at it.

   Complex mode (parseComplex, compileComplex, checkComplex, toGLSLComplex) reads the same grammar with
   the same tokenizer, limits, errors and reserved names, over complex numbers. Its constants are i, pi
   and e, and its functions are sin cos tan sinh cosh tanh exp log sqrt conj re im abs arg (one
   argument) and pow (two); re, im, abs and arg return a complex number with zero imaginary part. The
   real-only functions (atan2, min, floor and the rest) are refused by name, and i, pi, e and the
   function names may not be caller names. Branches are the principal ones:
     arg z   in (-pi, pi]; the cut is the negative real axis, and a point on it takes +pi (a signed zero
             imaginary part counts as +0, so log(-1) = i pi and sqrt(-4) = 2i);
     log z   = ln|z| + i arg z;   log 0 = -infinity + 0i;
     sqrt z  = the root with Re >= 0 (Im >= 0 on the cut);
     pow(z, w) and z^w = exp(w log z), with 0^0 = 1, 0^w = 0 for Re w > 0 and NaN for other w != 0;
     z^n and pow(z, n) for a literal integer n from 0 to 32 are n repeated multiplications (z^0 = 1),
             which is exact for integer powers and has no branch;
     a / 0 is NaN (the point at infinity is not a value here).
   tan and tanh use (sin 2x + i sinh 2y) / (cos 2x + cosh 2y) and its mirror, and return +-i (tan) or
   +-1 (tanh) once the imaginary (real) part passes 20, where the difference is below double rounding.
   compileComplex(text, { vars, params }) -> fn(env, out?), where env is a flat array of the variables
   and then the parameters as [re0, im0, re1, im1, ...]; it returns [re, im] (in out when given).
   toGLSLComplex writes the tree over vec2 using the helper functions in COMPLEX_GLSL, a fixed prelude a
   shader must include once. The GPU evaluates in 32-bit floats and may take either side of a cut. */
(function (root) {
  'use strict';

  const MAX_LENGTH = 256, MAX_DEPTH = 32, MAX_NAME = 32;
  const RESERVED = new Set(['constructor', '__proto__', 'prototype']);
  // name -> [arity, implementation, GLSL name]. Lookups go through a Map, never through an object
  // indexed by user text.
  const FUNCTIONS = new Map([
    ['sin', [1, Math.sin, 'sin']], ['cos', [1, Math.cos, 'cos']], ['tan', [1, Math.tan, 'tan']],
    ['asin', [1, Math.asin, 'asin']], ['acos', [1, Math.acos, 'acos']], ['atan', [1, Math.atan, 'atan']],
    ['atan2', [2, Math.atan2, 'atan']],
    ['sinh', [1, Math.sinh, 'sinh']], ['cosh', [1, Math.cosh, 'cosh']], ['tanh', [1, Math.tanh, 'tanh']],
    ['exp', [1, Math.exp, 'exp']], ['log', [1, Math.log, 'log']], ['sqrt', [1, Math.sqrt, 'sqrt']],
    ['abs', [1, Math.abs, 'abs']], ['min', [2, Math.min, 'min']], ['max', [2, Math.max, 'max']],
    ['pow', [2, Math.pow, 'pow']], ['floor', [1, Math.floor, 'floor']], ['sign', [1, Math.sign, 'sign']],
  ]);
  const CONSTANTS = new Map([['pi', Math.PI], ['e', Math.E]]);
  const pow = Math.pow;
  const GLSL_NAMES = new Set([...FUNCTIONS.values()].map(f => f[2]));
  const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

  class ExprError extends Error {
    constructor(message, pos) { super(message); this.name = 'ExprError'; this.pos = pos; }
  }
  function fail(message, pos) { throw new ExprError(message, pos); }

  // A character or name as the message shows it: printable ASCII in quotes, anything else as U+XXXX,
  // so a right-to-left override or a zero-width space in the input cannot rearrange the message.
  function show(text, i) {
    const cp = text.codePointAt(i);
    if (cp >= 0x21 && cp <= 0x7e) return '"' + String.fromCharCode(cp) + '"';
    return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
  }
  const quote = name => '"' + (name.length > 24 ? name.slice(0, 24) + '...' : name) + '"';
  const isDigit = c => c >= 48 && c <= 57;
  const isStart = c => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
  const isPart = c => isStart(c) || isDigit(c);
  const SYMBOLS = '+-*/^(),';

  function tokenize(text) {
    if (typeof text !== 'string') fail('expected text', 0);
    if (text.length > MAX_LENGTH) fail('longer than ' + MAX_LENGTH + ' characters', MAX_LENGTH);
    const out = [];
    let i = 0;
    while (i < text.length) {
      const c = text.charCodeAt(i), start = i;
      if (c === 32 || c === 9) { i++; continue; }
      if (isDigit(c) || (c === 46 && isDigit(text.charCodeAt(i + 1)))) {
        while (isDigit(text.charCodeAt(i))) i++;
        if (text.charCodeAt(i) === 46) { i++; while (isDigit(text.charCodeAt(i))) i++; }
        const ex = text.charCodeAt(i);
        if (ex === 101 || ex === 69) {
          let j = i + 1;
          if (text[j] === '+' || text[j] === '-') j++;
          if (!isDigit(text.charCodeAt(j))) fail('malformed number: an exponent needs digits', i);
          i = j;
          while (isDigit(text.charCodeAt(i))) i++;
        }
        const after = text.charCodeAt(i);
        if (after === 46) fail('malformed number', i);
        if (isPart(after)) fail('put * between a number and a name', i);
        const v = Number(text.slice(start, i));
        if (!Number.isFinite(v)) fail('number out of range', start);
        out.push({ t: 'num', v, pos: start });
      } else if (isStart(c)) {
        while (isPart(text.charCodeAt(i))) i++;
        const name = text.slice(start, i);
        if (name.length > MAX_NAME) fail('name longer than ' + MAX_NAME + ' characters', start);
        out.push({ t: 'name', v: name, pos: start });
      } else if (c < 128 && SYMBOLS.indexOf(text[i]) >= 0) {
        out.push({ t: text[i], pos: start });
        i++;
      } else fail('unexpected character ' + show(text, i), start);
    }
    out.push({ t: 'end', pos: text.length });
    return out;
  }

  // The caller's names, in environment order: variables first, then parameters.
  function nameTable(spec, lang) {
    const L = lang || REAL;
    const list = [].concat((spec && spec.vars) || [], (spec && spec.params) || []);
    const map = new Map();
    list.forEach((n, i) => {
      if (typeof n !== 'string' || !NAME_RE.test(n) || n.length > MAX_NAME || RESERVED.has(n) ||
        L.functions.has(n) || L.constants.has(n) || (L.realOnly && L.realOnly.has(n)) || map.has(n)) throw new TypeError('invalid whitelist name: ' + String(n));
      map.set(n, i);
    });
    return map;
  }

  const made = new WeakSet();          // syntax trees this file built; nothing else is compiled
  // A language: its function and constant tables and the set of trees its parser built. Complex mode
  // (below) is the second one; the real language is the one every existing caller uses.
  const REAL = { functions: FUNCTIONS, constants: CONSTANTS, made, realOnly: null };
  function freeze(node) {
    if (node.a) freeze(node.a);
    if (node.b) freeze(node.b);
    if (node.args) { node.args.forEach(freeze); Object.freeze(node.args); }
    return Object.freeze(node);
  }
  const describe = tok => tok.t === 'num' ? 'number' : tok.t === 'name' ? 'name ' + quote(tok.v) : tok.t === 'end' ? 'end' : '"' + tok.t + '"';

  function parse(text, spec) { return parseIn(REAL, text, spec); }
  function parseIn(L, text, spec) {
    const FN = L.functions, CONST = L.constants;
    const names = nameTable(spec, L);
    const toks = tokenize(text);
    if (toks.length === 1) fail('empty', 0);
    const allowed = [...names.keys()];
    let k = 0, depth = 0;
    const peek = () => toks[k];
    const enter = pos => { if (++depth > MAX_DEPTH) fail('nested more than ' + MAX_DEPTH + ' deep', pos); };
    function expr() {
      let left = term();
      while (peek().t === '+' || peek().t === '-') {
        const op = toks[k++];
        left = { type: 'bin', op: op.t, a: left, b: term(), pos: op.pos };
      }
      return left;
    }
    function term() {
      let left = unary();
      while (peek().t === '*' || peek().t === '/') {
        const op = toks[k++];
        left = { type: 'bin', op: op.t, a: left, b: unary(), pos: op.pos };
      }
      return left;
    }
    function unary() {
      const tok = peek();
      if (tok.t !== '-') return power();
      k++; enter(tok.pos);
      const a = unary();
      depth--;
      return { type: 'neg', a, pos: tok.pos };
    }
    function power() {
      const base = primary(), tok = peek();
      if (tok.t !== '^') return base;
      k++; enter(tok.pos);
      const b = unary();
      depth--;
      return { type: 'bin', op: '^', a: base, b, pos: tok.pos };
    }
    function close(open) {
      const tok = peek();
      if (tok.t === ')') { k++; depth--; return; }
      fail(tok.t === 'end' ? 'missing ")" for the "(" at column ' + (open.pos + 1) : 'expected an operator or ")", found ' + describe(tok), tok.pos);
    }
    function primary() {
      const tok = toks[k++];
      if (tok.t === 'num') return { type: 'num', v: tok.v, pos: tok.pos };
      if (tok.t === '(') {
        enter(tok.pos);
        const inner = expr();
        close(tok);
        return inner;
      }
      if (tok.t === 'name') {
        const name = tok.v;
        if (RESERVED.has(name)) fail(quote(name) + ' is a reserved name', tok.pos);
        if (FN.has(name)) {
          const arity = FN.get(name)[0];
          const open = peek();
          if (open.t !== '(') fail(name + ' is a function: write ' + name + '(...)', tok.pos);
          k++; enter(open.pos);
          const args = [expr()];
          while (peek().t === ',') { k++; args.push(expr()); }
          close(open);
          if (args.length !== arity) fail(name + ' takes ' + arity + (arity === 1 ? ' argument' : ' arguments'), tok.pos);
          return { type: 'call', name, args, pos: tok.pos };
        }
        if (L.realOnly && L.realOnly.has(name)) fail(quote(name) + ' is not available for complex numbers', tok.pos);
        const known = CONST.has(name) || names.has(name);
        if (!known) fail('unknown name ' + quote(name) + (allowed.length ? '; use ' + allowed.join(', ') : ''), tok.pos);
        if (peek().t === '(') fail(quote(name) + ' is not a function', tok.pos);
        if (CONST.has(name)) return { type: 'const', name, v: CONST.get(name), pos: tok.pos };
        return { type: 'var', name, index: names.get(name), pos: tok.pos };
      }
      if (tok.t === 'end') fail('ends too early', tok.pos);
      fail('unexpected ' + describe(tok), tok.pos);
    }
    const ast = expr();
    if (peek().t !== 'end') fail('expected an operator, found ' + describe(peek()), peek().pos);
    L.made.add(freeze(ast));
    return ast;
  }

  // A tree this file built, or text to parse. Anything else, including a look-alike object, is
  // refused by the tokenizer as "expected text".
  function treeOf(source, spec, lang) {
    const L = lang || REAL;
    if (source && typeof source === 'object' && L.made.has(source)) return source;
    return parseIn(L, source, spec);
  }

  /* ---- evaluation: the tree becomes nested closures over an environment array ---- */
  function build(node) {
    switch (node.type) {
      case 'num': case 'const': { const v = node.v; return () => v; }
      case 'var': { const i = node.index; return env => env[i]; }
      case 'neg': { const a = build(node.a); return env => -a(env); }
      case 'bin': {
        const a = build(node.a), b = build(node.b);
        switch (node.op) {
          case '+': return env => a(env) + b(env);
          case '-': return env => a(env) - b(env);
          case '*': return env => a(env) * b(env);
          case '/': return env => a(env) / b(env);
          case '^': return env => pow(a(env), b(env));
        }
        break;
      }
      case 'call': {
        const f = FUNCTIONS.get(node.name)[1];
        const a = build(node.args[0]);
        if (node.args.length === 1) return env => f(a(env));
        const b = build(node.args[1]);
        return env => f(a(env), b(env));
      }
    }
    throw new TypeError('malformed tree');
  }
  // compile(text, { vars, params }) -> fn(env), where env holds the variables and then the parameters
  // in the order the spec lists them. Throws ExprError on bad text.
  function compile(source, spec) { return build(treeOf(source, spec)); }

  // null when the text is a valid formula for this spec, otherwise { message, pos }.
  function check(text, spec) {
    try { parse(text, spec); return null; }
    catch (err) {
      if (err instanceof ExprError) return { message: err.message, pos: err.pos };
      throw err;
    }
  }

  /* ---- GLSL ---- */
  // Shortest decimal that round-trips the double, always written as a GLSL float literal.
  function glslFloat(v, pos) {
    if (!Number.isFinite(Math.fround(v))) fail('number out of range for GLSL', pos);
    const s = String(v);
    return /[.e]/.test(s) ? s : s + '.0';
  }
  function emit(node, rename) {
    switch (node.type) {
      case 'num': case 'const': return glslFloat(node.v, node.pos);
      case 'var': return rename.has(node.name) ? rename.get(node.name) : node.name;
      case 'neg': return '(-' + emit(node.a, rename) + ')';
      case 'bin':
        if (node.op === '^') return 'pow(' + emit(node.a, rename) + ', ' + emit(node.b, rename) + ')';
        return '(' + emit(node.a, rename) + ' ' + node.op + ' ' + emit(node.b, rename) + ')';
      case 'call': return FUNCTIONS.get(node.name)[2] + '(' + node.args.map(n => emit(n, rename)).join(', ') + ')';
    }
    throw new TypeError('malformed tree');
  }
  const GLSL_TOKEN = /\s*(?:(\d+\.\d*(?:e[+-]?\d+)?|\d+e[+-]?\d+)|([A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw]{1,4})?)|([-+*/(),]))/y;
  // toGLSL(text or tree, spec, { rename: { x: 'p.x' } }) -> a GLSL expression string. Every operation
  // is parenthesized, ^ becomes pow() and atan2(y, x) becomes atan(y, x). The output is re-scanned and
  // refused unless every token is a float literal, an operator, a GLSL function from the whitelist or
  // one of the caller's names.
  function toGLSL(source, spec, opts) {
    const names = nameTable(spec);
    const tree = treeOf(source, spec);
    const rename = new Map();
    const given = opts && opts.rename;
    if (given) {
      for (const key of Object.keys(given)) {
        if (!names.has(key)) throw new TypeError('rename names an unknown variable: ' + key);
        const to = given[key];
        if (typeof to !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*(\.[xyzw]{1,4})?$/.test(to) || /^gl_/.test(to)) throw new TypeError('invalid GLSL name for ' + key);
        rename.set(key, to);
      }
    }
    const out = emit(tree, rename);
    const idents = new Set([...GLSL_NAMES, ...names.keys(), ...rename.values()]);
    GLSL_TOKEN.lastIndex = 0;
    let at = 0;
    while (at < out.length) {
      GLSL_TOKEN.lastIndex = at;
      const m = GLSL_TOKEN.exec(out);
      if (!m || (m[2] && !idents.has(m[2]))) throw new Error('GLSL emitter produced a token outside the whitelist at ' + at);
      at = GLSL_TOKEN.lastIndex;
    }
    return out;
  }

  /* ==== complex mode ==== */
  // Every helper writes its result into o, a Float64Array(2) the caller owns, reading the operands
  // first so that o may alias one of them, and returns o.
  const hypot = Math.hypot;
  const argOf = (x, y) => Math.atan2(y + 0, x);     // y + 0 turns -0 into +0: arg is in (-pi, pi]
  const put = (o, re, im) => { o[0] = re; o[1] = im; return o; };
  const cMul = (o, a, b) => put(o, a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]);
  // Scaled by the larger part of the divisor so that neither |b|^2 nor a * conj(b) overflows early.
  function cDiv(o, a, b) {
    const s = Math.max(Math.abs(b[0]), Math.abs(b[1]));
    const pr = a[0] / s, pi_ = a[1] / s, qr = b[0] / s, qi = b[1] / s, d = qr * qr + qi * qi;
    return put(o, (pr * qr + pi_ * qi) / d, (pi_ * qr - pr * qi) / d);
  }
  function cExp(o, a) {
    const m = Math.exp(a[0]);
    return a[1] === 0 ? put(o, m, 0) : put(o, m * Math.cos(a[1]), m * Math.sin(a[1]));
  }
  const cLog = (o, a) => put(o, Math.log(hypot(a[0], a[1])), argOf(a[0], a[1]));
  const cSin = (o, a) => put(o, Math.sin(a[0]) * Math.cosh(a[1]), Math.cos(a[0]) * Math.sinh(a[1]));
  const cCos = (o, a) => put(o, Math.cos(a[0]) * Math.cosh(a[1]), -Math.sin(a[0]) * Math.sinh(a[1]));
  const cSinh = (o, a) => put(o, Math.sinh(a[0]) * Math.cos(a[1]), Math.cosh(a[0]) * Math.sin(a[1]));
  const cCosh = (o, a) => put(o, Math.cosh(a[0]) * Math.cos(a[1]), Math.sinh(a[0]) * Math.sin(a[1]));
  function cTan(o, a) {
    const x = a[0], y = a[1];
    if (Math.abs(y) > 20) return put(o, 0, Math.sign(y));
    const d = Math.cos(2 * x) + Math.cosh(2 * y);
    return put(o, Math.sin(2 * x) / d, Math.sinh(2 * y) / d);
  }
  function cTanh(o, a) {
    const x = a[0], y = a[1];
    if (Math.abs(x) > 20) return put(o, Math.sign(x), 0);
    const d = Math.cosh(2 * x) + Math.cos(2 * y);
    return put(o, Math.sinh(2 * x) / d, Math.sin(2 * y) / d);
  }
  // The principal root without cancellation: t = sqrt((|z| + |x|) / 2) is the larger part.
  function cSqrt(o, a) {
    const x = a[0], y = a[1], r = hypot(x, y);
    if (r === 0) return put(o, 0, 0);
    const t = Math.sqrt(0.5 * (r + Math.abs(x)));
    return x >= 0 ? put(o, t, 0.5 * y / t) : put(o, 0.5 * Math.abs(y) / t, y < 0 ? -t : t);
  }
  function cPow(o, a, b) {
    if (a[0] === 0 && a[1] === 0) {
      if (b[0] === 0 && b[1] === 0) return put(o, 1, 0);
      return b[0] > 0 ? put(o, 0, 0) : put(o, NaN, NaN);
    }
    const lr = Math.log(hypot(a[0], a[1])), li = argOf(a[0], a[1]);
    return cExp(o, put(o, b[0] * lr - b[1] * li, b[0] * li + b[1] * lr));
  }
  // n repeated multiplications, starting from 1: z^0 = 1 for every z.
  function cPowi(o, a, n) {
    const x = a[0], y = a[1];
    let re = 1, im = 0;
    for (let k = 0; k < n; k++) { const t = re * x - im * y; im = re * y + im * x; re = t; }
    return put(o, re, im);
  }
  const MAX_INT_POW = 32;
  // The exponent of z^n or pow(z, n) when it is a literal integer 0..32, otherwise null.
  const intPower = node => node.type === 'num' && Number.isInteger(node.v) && node.v >= 0 && node.v <= MAX_INT_POW ? node.v : null;

  // name -> [arity, implementation (o, a[, b]) -> o, GLSL helper in COMPLEX_GLSL]
  const CFUNCTIONS = new Map([
    ['sin', [1, cSin, 'csin']], ['cos', [1, cCos, 'ccos']], ['tan', [1, cTan, 'ctan']],
    ['sinh', [1, cSinh, 'csinh']], ['cosh', [1, cCosh, 'ccosh']], ['tanh', [1, cTanh, 'ctanh']],
    ['exp', [1, cExp, 'cexp']], ['log', [1, cLog, 'clog']], ['sqrt', [1, cSqrt, 'csqrt']],
    ['conj', [1, (o, a) => put(o, a[0], -a[1]), 'conj']],
    ['re', [1, (o, a) => put(o, a[0], 0), 'cre']], ['im', [1, (o, a) => put(o, a[1], 0), 'cim']],
    ['abs', [1, (o, a) => put(o, hypot(a[0], a[1]), 0), 'cabs']], ['arg', [1, (o, a) => put(o, argOf(a[0], a[1]), 0), 'carg']],
    ['pow', [2, cPow, 'cpow']],
  ]);
  const CCONSTANTS = new Map([['i', Object.freeze([0, 1])], ['pi', Object.freeze([Math.PI, 0])], ['e', Object.freeze([Math.E, 0])]]);
  const REAL_ONLY = new Set([...FUNCTIONS.keys()].filter(n => !CFUNCTIONS.has(n)));
  const COMPLEX = { functions: CFUNCTIONS, constants: CCONSTANTS, made: new WeakSet(), realOnly: REAL_ONLY };

  // Each node owns a two-slot buffer and a closure that fills it and returns it; a parent reads its
  // children's buffers and writes only its own, so one compiled function allocates nothing per call.
  function buildC(node) {
    const o = new Float64Array(2);
    switch (node.type) {
      case 'num': o[0] = node.v; return () => o;
      case 'const': o[0] = node.v[0]; o[1] = node.v[1]; return () => o;
      case 'var': { const k = 2 * node.index; return env => put(o, env[k], env[k + 1]); }
      case 'neg': { const a = buildC(node.a); return env => { const A = a(env); return put(o, -A[0], -A[1]); }; }
      case 'bin': {
        const a = buildC(node.a);
        if (node.op === '^') {
          const n = intPower(node.b);
          if (n !== null) return env => cPowi(o, a(env), n);
          const b = buildC(node.b);
          return env => { const A = a(env); return cPow(o, A, b(env)); };
        }
        const b = buildC(node.b);
        switch (node.op) {
          case '+': return env => { const A = a(env), B = b(env); return put(o, A[0] + B[0], A[1] + B[1]); };
          case '-': return env => { const A = a(env), B = b(env); return put(o, A[0] - B[0], A[1] - B[1]); };
          case '*': return env => { const A = a(env); return cMul(o, A, b(env)); };
          case '/': return env => { const A = a(env); return cDiv(o, A, b(env)); };
        }
        break;
      }
      case 'call': {
        const f = CFUNCTIONS.get(node.name)[1];
        const a = buildC(node.args[0]);
        if (node.args.length === 1) return env => f(o, a(env));
        if (node.name === 'pow') { const n = intPower(node.args[1]); if (n !== null) return env => cPowi(o, a(env), n); }
        const b = buildC(node.args[1]);
        return env => { const A = a(env); return f(o, A, b(env)); };
      }
    }
    throw new TypeError('malformed tree');
  }
  function parseComplex(text, spec) { return parseIn(COMPLEX, text, spec); }
  // compileComplex(text or tree, { vars, params }) -> fn(env, out?) returning [re, im]; env is the flat
  // array [re0, im0, re1, im1, ...] of the variables and then the parameters in spec order.
  function compileComplex(source, spec) {
    const root = buildC(treeOf(source, spec, COMPLEX));
    return (env, out) => {
      const r = root(env);
      if (!out) return [r[0], r[1]];
      out[0] = r[0]; out[1] = r[1];
      return out;
    };
  }

  // The helpers toGLSLComplex writes, over vec2 = (re, im). A shader includes this once, before the
  // function that holds the expression. Principal branches as above; atan(0, 0) and a division by zero
  // are left to the GPU.
  const COMPLEX_GLSL = `vec2 cmul(vec2 a, vec2 b){ return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cdiv(vec2 a, vec2 b){ float s = max(abs(b.x), abs(b.y)); vec2 p = a / s, q = b / s; return vec2(p.x * q.x + p.y * q.y, p.y * q.x - p.x * q.y) / dot(q, q); }
vec2 cexp(vec2 z){ float m = exp(z.x); return z.y == 0.0 ? vec2(m, 0.0) : m * vec2(cos(z.y), sin(z.y)); }
vec2 clog(vec2 z){ return vec2(log(length(z)), atan(z.y, z.x)); }
vec2 csin(vec2 z){ return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y)); }
vec2 ccos(vec2 z){ return vec2(cos(z.x) * cosh(z.y), -sin(z.x) * sinh(z.y)); }
vec2 csinh(vec2 z){ return vec2(sinh(z.x) * cos(z.y), cosh(z.x) * sin(z.y)); }
vec2 ccosh(vec2 z){ return vec2(cosh(z.x) * cos(z.y), sinh(z.x) * sin(z.y)); }
vec2 ctan(vec2 z){ if (abs(z.y) > 20.0) return vec2(0.0, sign(z.y)); float d = cos(2.0 * z.x) + cosh(2.0 * z.y); return vec2(sin(2.0 * z.x), sinh(2.0 * z.y)) / d; }
vec2 ctanh(vec2 z){ if (abs(z.x) > 20.0) return vec2(sign(z.x), 0.0); float d = cosh(2.0 * z.x) + cos(2.0 * z.y); return vec2(sinh(2.0 * z.x), sin(2.0 * z.y)) / d; }
vec2 csqrt(vec2 z){ float r = length(z); if (r == 0.0) return vec2(0.0); float t = sqrt(0.5 * (r + abs(z.x))); return z.x >= 0.0 ? vec2(t, 0.5 * z.y / t) : vec2(0.5 * abs(z.y) / t, z.y < 0.0 ? -t : t); }
vec2 cpow(vec2 z, vec2 w){ if (z.x == 0.0 && z.y == 0.0) return (w.x == 0.0 && w.y == 0.0) ? vec2(1.0, 0.0) : (w.x > 0.0 ? vec2(0.0) : vec2(uintBitsToFloat(0x7fc00000u))); vec2 l = clog(z); return cexp(vec2(w.x * l.x - w.y * l.y, w.x * l.y + w.y * l.x)); }
vec2 cpowi(vec2 z, float n){ vec2 r = vec2(1.0, 0.0); for (int k = 0; k < ${MAX_INT_POW}; k++) { if (float(k) >= n) break; r = cmul(r, z); } return r; }
vec2 conj(vec2 z){ return vec2(z.x, -z.y); }
vec2 cre(vec2 z){ return vec2(z.x, 0.0); }
vec2 cim(vec2 z){ return vec2(z.y, 0.0); }
vec2 cabs(vec2 z){ return vec2(length(z), 0.0); }
vec2 carg(vec2 z){ return vec2(atan(z.y, z.x), 0.0); }
`;
  const CGLSL_NAMES = new Set(['vec2', 'cmul', 'cdiv', 'cpowi', ...[...CFUNCTIONS.values()].map(f => f[2])]);
  function emitC(node, rename) {
    switch (node.type) {
      case 'num': return 'vec2(' + glslFloat(node.v, node.pos) + ', 0.0)';
      case 'const': return 'vec2(' + glslFloat(node.v[0], node.pos) + ', ' + glslFloat(node.v[1], node.pos) + ')';
      case 'var': return rename.has(node.name) ? rename.get(node.name) : node.name;
      case 'neg': return '(-' + emitC(node.a, rename) + ')';
      case 'bin': {
        const a = emitC(node.a, rename);
        if (node.op === '^') {
          const n = intPower(node.b);
          return n !== null ? 'cpowi(' + a + ', ' + glslFloat(n, node.b.pos) + ')' : 'cpow(' + a + ', ' + emitC(node.b, rename) + ')';
        }
        const b = emitC(node.b, rename);
        if (node.op === '*') return 'cmul(' + a + ', ' + b + ')';
        if (node.op === '/') return 'cdiv(' + a + ', ' + b + ')';
        return '(' + a + ' ' + node.op + ' ' + b + ')';
      }
      case 'call': {
        if (node.name === 'pow') {
          const n = intPower(node.args[1]);
          if (n !== null) return 'cpowi(' + emitC(node.args[0], rename) + ', ' + glslFloat(n, node.args[1].pos) + ')';
        }
        return CFUNCTIONS.get(node.name)[2] + '(' + node.args.map(n => emitC(n, rename)).join(', ') + ')';
      }
    }
    throw new TypeError('malformed tree');
  }
  const CGLSL_TOKEN = /\s*(?:(\d+\.\d*(?:e[+-]?\d+)?|\d+e[+-]?\d+)|([A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw]{1,4})?)|([-+(),]))/y;
  // toGLSLComplex(text or tree, spec, { rename: { c: 'u_c' } }) -> a GLSL vec2 expression. Numbers become
  // vec2(v, 0.0), i becomes vec2(0.0, 1.0), + and - stay vector operators, and everything else calls a
  // COMPLEX_GLSL helper. The output is re-scanned and refused unless every token is a float literal,
  // + - ( ) or a comma, vec2, a helper from COMPLEX_GLSL or one of the caller's names.
  function toGLSLComplex(source, spec, opts) {
    const names = nameTable(spec, COMPLEX);
    const tree = treeOf(source, spec, COMPLEX);
    const rename = new Map();
    const given = opts && opts.rename;
    if (given) {
      for (const key of Object.keys(given)) {
        if (!names.has(key)) throw new TypeError('rename names an unknown variable: ' + key);
        const to = given[key];
        if (typeof to !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*(\.[xyzw]{1,4})?$/.test(to) || /^gl_/.test(to) || CGLSL_NAMES.has(to)) throw new TypeError('invalid GLSL name for ' + key);
        rename.set(key, to);
      }
    }
    const out = emitC(tree, rename);
    const idents = new Set([...CGLSL_NAMES, ...names.keys(), ...rename.values()]);
    let at = 0;
    while (at < out.length) {
      CGLSL_TOKEN.lastIndex = at;
      const m = CGLSL_TOKEN.exec(out);
      if (!m || (m[2] && !idents.has(m[2]))) throw new Error('GLSL emitter produced a token outside the whitelist at ' + at);
      at = CGLSL_TOKEN.lastIndex;
    }
    return out;
  }
  // null when the text is a valid complex formula for this spec, otherwise { message, pos }. With
  // { glsl: true } it also refuses text the GPU could not take (a literal outside the float range).
  function checkComplex(text, spec, opts) {
    try {
      const tree = parseComplex(text, spec);
      if (opts && opts.glsl) toGLSLComplex(tree, spec);
      return null;
    } catch (err) {
      if (err instanceof ExprError) return { message: err.message, pos: err.pos };
      throw err;
    }
  }

  const api = Object.freeze({
    parse, compile, check, toGLSL, tokenize, ExprError,
    FUNCTIONS: Object.freeze([...FUNCTIONS.keys()]),
    CONSTANTS: Object.freeze([...CONSTANTS.keys()]),
    LIMITS: Object.freeze({ maxLength: MAX_LENGTH, maxDepth: MAX_DEPTH, maxName: MAX_NAME }),
    parseComplex, compileComplex, checkComplex, toGLSLComplex, COMPLEX_GLSL,
    COMPLEX_FUNCTIONS: Object.freeze([...CFUNCTIONS.keys()]),
    COMPLEX_CONSTANTS: Object.freeze([...CCONSTANTS.keys()]),
    COMPLEX_LIMITS: Object.freeze({ maxIntPower: MAX_INT_POW }),
  });
  root.GenChaseExpr = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
