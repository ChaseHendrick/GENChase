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
   Every error carries a message and a 0-based character position, so the UI can point at it. */
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
  function nameTable(spec) {
    const list = [].concat((spec && spec.vars) || [], (spec && spec.params) || []);
    const map = new Map();
    list.forEach((n, i) => {
      if (typeof n !== 'string' || !NAME_RE.test(n) || n.length > MAX_NAME || RESERVED.has(n) ||
        FUNCTIONS.has(n) || CONSTANTS.has(n) || map.has(n)) throw new TypeError('invalid whitelist name: ' + String(n));
      map.set(n, i);
    });
    return map;
  }

  const made = new WeakSet();          // syntax trees this file built; nothing else is compiled
  function freeze(node) {
    if (node.a) freeze(node.a);
    if (node.b) freeze(node.b);
    if (node.args) { node.args.forEach(freeze); Object.freeze(node.args); }
    return Object.freeze(node);
  }
  const describe = tok => tok.t === 'num' ? 'number' : tok.t === 'name' ? 'name ' + quote(tok.v) : tok.t === 'end' ? 'end' : '"' + tok.t + '"';

  function parse(text, spec) {
    const names = nameTable(spec);
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
        if (FUNCTIONS.has(name)) {
          const arity = FUNCTIONS.get(name)[0];
          const open = peek();
          if (open.t !== '(') fail(name + ' is a function: write ' + name + '(...)', tok.pos);
          k++; enter(open.pos);
          const args = [expr()];
          while (peek().t === ',') { k++; args.push(expr()); }
          close(open);
          if (args.length !== arity) fail(name + ' takes ' + arity + (arity === 1 ? ' argument' : ' arguments'), tok.pos);
          return { type: 'call', name, args, pos: tok.pos };
        }
        const known = CONSTANTS.has(name) || names.has(name);
        if (!known) fail('unknown name ' + quote(name) + (allowed.length ? '; use ' + allowed.join(', ') : ''), tok.pos);
        if (peek().t === '(') fail(quote(name) + ' is not a function', tok.pos);
        if (CONSTANTS.has(name)) return { type: 'const', name, v: CONSTANTS.get(name), pos: tok.pos };
        return { type: 'var', name, index: names.get(name), pos: tok.pos };
      }
      if (tok.t === 'end') fail('ends too early', tok.pos);
      fail('unexpected ' + describe(tok), tok.pos);
    }
    const ast = expr();
    if (peek().t !== 'end') fail('expected an operator, found ' + describe(peek()), peek().pos);
    made.add(freeze(ast));
    return ast;
  }

  // A tree this file built, or text to parse. Anything else, including a look-alike object, is
  // refused by the tokenizer as "expected text".
  function treeOf(source, spec) {
    if (source && typeof source === 'object' && made.has(source)) return source;
    return parse(source, spec);
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

  const api = Object.freeze({
    parse, compile, check, toGLSL, tokenize, ExprError,
    FUNCTIONS: Object.freeze([...FUNCTIONS.keys()]),
    CONSTANTS: Object.freeze([...CONSTANTS.keys()]),
    LIMITS: Object.freeze({ maxLength: MAX_LENGTH, maxDepth: MAX_DEPTH, maxName: MAX_NAME }),
  });
  root.GenChaseExpr = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
