"""Exact Arb model of Erhardt's 18-state TP06 endocardial cell, for the Fourier/Hill route (component 1).

This is infrastructure for the space-time Fourier proofs of the ring's rotating waves. It proves nothing by itself.

What is here
------------
* ``tp06_18d_arb.py`` (beside this file) is GENERATED from the reference translation ``model/tp06_18d.py`` by
  ``generate()`` below, using Python's ``tokenize``. Only NUMBER tokens change, in place:
    - a literal containing '.', 'e' or 'E' becomes ``_D('<literal>')``, a ball containing that exact decimal
      (built from the exact rational with ``fractions.Fraction`` and ``arb_set_fmpq``);
    - an integer literal becomes ``_I(<literal>)``, the exact integer as a ball;
    - an integer literal directly after ``**`` stays a Python int (an exact integer power).
  Every other token, the expression structure (MATLAB precedence as already encoded in the reference) and the
  namespace ``M`` (exp, log, sqrt) are the reference's own, so ``diff model/tp06_18d.py fourier/tp06_18d_arb.py``
  shows the header and the numbers only. The file is saved in the repository for review; this module executes it
  only after checking that it is byte-identical to a fresh generation from the reference, so a stale or hand-edited
  copy stops the program.
* ``f(z)``: the vector field in the scaled variables z = x / 2^e (``model/scales.txt``, as in model/tp06_capd.hpp),
  evaluated in acb (complex balls) at a configurable precision (default 128 bits). Scaling by 2^e is exact.
  An acb argument with a radius gives an enclosure of f over that complex box (Arb's interval extension).
* ``f_and_df(z)``: f and its 18x18 Jacobian Df(z) in the scaled variables by forward-mode dual numbers over acb
  (class ``Dual``); optionally also the derivatives with respect to named parameters (``wrt=("g_Ks",)``).
* ``params()``: the physical parameters (g_Kr ... K_i) as balls of the reference's decimals; any of them, in particular
  g_Ks, may be overridden by a decimal string, an exact rational, a ball, or a pair (lo, hi) giving an interval.
* the ring coupling as in the CAPD model: ``ring_field`` adds, to cell j's dV/dt, c (V_{j-1} - 2 V_j + V_{j+1}) by
  passing i_stim = Cm c (V_{j-1} - 2 V_j + V_{j+1}) to the reference's i_stim argument (the same expression as
  model/tp06_capd.hpp's iExtra); ``coupling(N)`` = c = N^2 D with D = 1/64000 per ms; and, for the Fourier problem,
  ``damping(m, N=..)`` or ``damping(m, eps=..)``, the exact multiplier d_m >= 0 with which the coupling acts on the
  V component of Fourier mode m of a rotating wave x_j(t) = phi(t + j T/N):
      c (e^{-2 pi i m/N} - 2 + e^{2 pi i m/N}) = -4 c sin^2(pi m/N) = -d_m,
  and, with eps = 1/N^2, d_m = 4 pi^2 D m^2 sinc(pi m sqrt(eps))^2, entire in eps, with d_m(0) = D (2 pi m)^2 for the
  continuum cable. The coupling is linear, so d_m is the same in the scaled variable z_V.

Rigor
-----
Every operation is Arb ball arithmetic, which returns a ball containing the exact result for every point of the
input balls. The decimals of the model are enclosed, never rounded to doubles. ``log`` and ``sqrt`` use the principal
branch and raise ``DomainError`` unless the argument's real part is certainly positive (there the principal branch
is analytic and agrees with the real function on the physiological domain); a division by a ball containing zero
gives a non-finite ball in Arb, and every public function raises ``DomainError`` on a non-finite result. So an
evaluation outside the model's domain stops instead of passing silently. A Dual derivative is the exact derivative
formula evaluated in ball arithmetic, hence an enclosure of the derivative over the input box.

Precision. At 128 bits the balls along the N = 1 orbit have relative radius below 1e-28 for f and 1e-33 for Df. At
53 bits they are about 4e-6 for the m rate (m sits within about 1e-10 of m_inf there, so m_inf - m cancels) and up to
2e-11 for the h and j rows of Df, where the reference's (1 - u) cancels (u is within 1e-80 of 1 near V = 0; the CAPD
model rewrites it, this translation keeps the reference's form). Residuals and Jacobians should therefore be
evaluated at 128 bits or more.

Trust base: python-flint 0.9.0 (FLINT/Arb 3.6.0): the import checks the version strings, and the tests check the
installed files against the distribution's RECORD hashes and, given the wheel, the wheel's SHA-256 in FLINT_PIN.
Also Python's tokenize, ast and fractions, and this file. The import refuses another python-flint version unless
ARBMODEL_ALLOW_OTHER_FLINT=1. Tests: fourier/test_arbmodel.py.

Usage:  python3 arbmodel.py --generate   (rewrite tp06_18d_arb.py from the reference; review the diff)
        python3 arbmodel.py --check      (freshness of the generated file, versions, one evaluation)
"""
import ast
import contextlib
import hashlib
import io
import os
import re
import sys
import tokenize
from fractions import Fraction

import flint
from flint import acb, acb_mat, arb, ctx, fmpq, fmpz

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REFERENCE = os.path.join(ROOT, "model", "tp06_18d.py")
SCALES_FILE = os.path.join(ROOT, "model", "scales.txt")
GENERATED = os.path.join(HERE, "tp06_18d_arb.py")

# SHA-256 of model/tp06_18d.py when this module was written (2026-10-01). A change to the reference must be reviewed,
# this constant updated and the generated file regenerated; the tests check it.
REFERENCE_SHA256 = "76f7466a81d9498dd2d9b8d139f2c48667b7e33fad2c35a5eb61ab62f00620b9"

FLINT_PIN = {
    "python-flint": "0.9.0",
    "FLINT": "3.6.0",
    "wheel": "python_flint-0.9.0-cp310-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl",
    "wheel_sha256": "376b88cacd30612479e839ffdba887599d3f9c8c0e214852bf80bb2b194e4d76",
    "install": "pip install python-flint==0.9.0 (then check the wheel's SHA-256 against wheel_sha256)",
}

DEFAULT_PREC = 128          # bits; every public function takes prec=None meaning this value
D_RING = Fraction(1, 64000)  # ring diffusion D per ms; the coupling is c = N^2 D (README, "What this is")
DIM = 18


def flint_versions():
    return {"python-flint": flint.__version__, "FLINT": flint.__FLINT_VERSION__}


def check_flint():
    v = flint_versions()
    if (v["python-flint"], v["FLINT"]) != (FLINT_PIN["python-flint"], FLINT_PIN["FLINT"]):
        raise RuntimeError(f"python-flint {v} is not the pinned {FLINT_PIN['python-flint']} / FLINT {FLINT_PIN['FLINT']}"
                           " (set ARBMODEL_ALLOW_OTHER_FLINT=1 to run anyway; results are then outside the pinned trust base)")


if os.environ.get("ARBMODEL_ALLOW_OTHER_FLINT") != "1":
    check_flint()


class DomainError(ArithmeticError):
    """An evaluation left the model's domain (log/sqrt argument not certainly in Re > 0, or a non-finite ball)."""


@contextlib.contextmanager
def precision(bits=None):
    """Run the body at `bits` of working precision (None: DEFAULT_PREC), restoring the previous value afterwards."""
    old = ctx.prec
    ctx.prec = int(DEFAULT_PREC if bits is None else bits)
    try:
        yield
    finally:
        ctx.prec = old


# ---------------------------------------------------------------------------------------------------------------
# Exact decimals and conversions
# ---------------------------------------------------------------------------------------------------------------
_DECIMAL_RE = re.compile(r"(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?")
_INTEGER_RE = re.compile(r"0|[1-9]\d*")


def decimal_value(text):
    """The exact rational value of a decimal literal such as '0.0153', '3.1e5' or '6.948e-6'."""
    if not _DECIMAL_RE.fullmatch(text):
        raise ValueError(f"not a plain decimal literal: {text!r}")
    return Fraction(text)


def _ball_of_fraction(q):
    """A ball containing the rational q (exact when q is dyadic and fits the precision)."""
    return acb(arb(fmpq(fmpz(q.numerator), fmpz(q.denominator))))


_DEC_CACHE = {}


def _D(text):
    """Ball containing the exact decimal `text`, at the current working precision (cached per precision)."""
    key = (text, ctx.prec)
    v = _DEC_CACHE.get(key)
    if v is None:
        v = _ball_of_fraction(decimal_value(text))
        _DEC_CACHE[key] = v
    return v


def _I(n):
    """The exact integer n as a complex ball."""
    if type(n) is not int:
        raise TypeError(f"_I expects an int literal, got {type(n).__name__}")
    return acb(n)


def to_ball(v):
    """Convert v to an acb ball containing it. Accepted: acb, arb, int, fmpz, fmpq, Fraction, a decimal string
    (enclosed exactly), a float or complex (its exact binary value), or a pair (lo, hi) of real values (the interval
    hull, used for parameter intervals)."""
    if isinstance(v, acb):
        return v
    if isinstance(v, arb):
        return acb(v)
    if isinstance(v, bool):
        raise TypeError("bool is not a number here")
    if isinstance(v, (int, fmpz)):
        return acb(v)
    if isinstance(v, fmpq):
        return acb(arb(v))
    if isinstance(v, Fraction):
        return _ball_of_fraction(v)
    if isinstance(v, str):
        return _ball_of_fraction(decimal_value(v.strip()))
    if isinstance(v, (float, complex)):
        return acb(v)  # binary64 values are exact in arb
    if isinstance(v, tuple) and len(v) == 2:
        lo, hi = to_ball(v[0]), to_ball(v[1])
        if not (lo.imag.is_zero() and hi.imag.is_zero()):
            raise ValueError("an interval (lo, hi) must be real")
        return acb(lo.real.union(hi.real))
    if hasattr(v, "dtype") and getattr(v, "shape", None) == ():  # numpy scalar
        return to_ball(v.item())
    raise TypeError(f"cannot convert {type(v).__name__} to a ball")


def _finite(values, what):
    for i, v in enumerate(values):
        if not v.is_finite():
            raise DomainError(f"{what}: component {i} is not finite ({v}); the evaluation left the model's domain")
    return values


# ---------------------------------------------------------------------------------------------------------------
# Generation of tp06_18d_arb.py from the reference
# ---------------------------------------------------------------------------------------------------------------
_HEADER = """\
# GENERATED by fourier/arbmodel.py from model/tp06_18d.py (SHA-256 {sha}).
# Do not edit by hand: run `python3 fourier/arbmodel.py --generate` and review the diff against the reference.
#
# The only change from the reference is to its NUMBER tokens, in place, one token at a time:
#   a literal containing '.', 'e' or 'E'  ->  _D('<literal>'), a complex ball containing that exact decimal;
#   any other integer literal             ->  _I(<literal>), the exact integer as a complex ball;
#   an integer literal right after '**'   ->  unchanged (an exact Python int exponent).
# _D and _I are supplied by arbmodel.py, which executes this file only after checking that it equals a fresh
# generation from the reference. Every other token, comment and line break below is the reference's own.

"""


def number_replacement(text, prev_op):
    """The generator's rule for one NUMBER token; prev_op is the previous significant token's string."""
    if _INTEGER_RE.fullmatch(text):
        return text if prev_op == "**" else f"_I({text})"
    if _DECIMAL_RE.fullmatch(text):
        return f"_D('{text}')"
    raise ValueError(f"unsupported numeric literal {text!r} (hex, octal, underscore and imaginary literals are refused)")


_SKIP = (tokenize.NL, tokenize.NEWLINE, tokenize.COMMENT, tokenize.INDENT, tokenize.DEDENT, tokenize.ENCODING,
         tokenize.ENDMARKER)


def generate(reference_text=None):
    """Return the text of tp06_18d_arb.py generated from the reference source (default: model/tp06_18d.py)."""
    if reference_text is None:
        with open(REFERENCE, encoding="utf-8") as fh:
            reference_text = fh.read()
    sha = hashlib.sha256(reference_text.encode("utf-8")).hexdigest()
    lines = reference_text.splitlines(keepends=True)
    edits = {}
    prev = None
    for tok in tokenize.generate_tokens(io.StringIO(reference_text).readline):
        if tok.type == tokenize.NUMBER:
            (r0, c0), (r1, c1) = tok.start, tok.end
            if r0 != r1:
                raise ValueError("multi-line number token")
            new = number_replacement(tok.string, prev.string if prev is not None and prev.type == tokenize.OP else None)
            if new != tok.string:
                edits.setdefault(r0 - 1, []).append((c0, c1, new))
        if tok.type not in _SKIP:
            prev = tok
    for i, ed in edits.items():
        line = lines[i]
        for c0, c1, new in sorted(ed, reverse=True):
            line = line[:c0] + new + line[c1:]
        lines[i] = line
    return _HEADER.format(sha=sha) + "".join(lines)


def load_generated(text, filename="<generated>"):
    """Execute a generated module text with _D and _I bound; returns its namespace. Used directly only by the tests
    (mutation controls); the model itself goes through model()."""
    ns = {"__name__": "tp06_18d_arb", "__file__": filename, "_D": _D, "_I": _I}
    with precision(None):
        exec(compile(text, filename, "exec"), ns)
    return ns


_MODEL = None


def model():
    """The namespace of the saved generated file, after checking it equals a fresh generation from the reference."""
    global _MODEL
    if _MODEL is None:
        if not os.path.exists(GENERATED):
            raise RuntimeError(f"{GENERATED} is missing; run `python3 arbmodel.py --generate`")
        with open(GENERATED, encoding="utf-8") as fh:
            text = fh.read()
        if text != generate():
            raise RuntimeError(f"{GENERATED} is not a fresh generation from {REFERENCE}; regenerate and review the diff")
        _MODEL = load_generated(text, GENERATED)
    return _MODEL


# ---------------------------------------------------------------------------------------------------------------
# Parameters and scales
# ---------------------------------------------------------------------------------------------------------------
def _param_decimals(reference_text):
    tree = ast.parse(reference_text)
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name) \
                and node.targets[0].id == "PARAMS":
            call = node.value
            if not (isinstance(call, ast.Call) and isinstance(call.func, ast.Name) and call.func.id == "dict"
                    and not call.args):
                raise ValueError("PARAMS is not a dict(...) call of keywords")
            out = {}
            for kw in call.keywords:
                if not (isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, (int, float))):
                    raise ValueError(f"PARAMS[{kw.arg}] is not a numeric literal")
                out[kw.arg] = ast.get_source_segment(reference_text, kw.value)
            return out
    raise ValueError("no PARAMS assignment in the reference")


with open(REFERENCE, encoding="utf-8") as _fh:
    PARAM_DECIMALS = _param_decimals(_fh.read())  # {'g_Kr': '0.0153', ..., 'K_i': '138.3'}, literal text
PARAM_NAMES = tuple(PARAM_DECIMALS)


def params(prec=None, **overrides):
    """The physical parameters as balls of the reference's decimals; overrides as in to_ball (e.g. g_Ks="0.0276",
    g_Ks=("0.0275", "0.0276") for an interval, or an arb/acb ball). Build them at least at the evaluation precision."""
    with precision(prec):
        p = {k: _D(v) for k, v in PARAM_DECIMALS.items()}
        for k, v in overrides.items():
            if k not in p:
                raise KeyError(f"unknown parameter {k}; known: {PARAM_NAMES}")
            p[k] = to_ball(v)
    return p


def _read_scales(path=SCALES_FILE):
    rows = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            s = line.strip()
            if s and not s.startswith("#"):
                rows.append([int(t) for t in s.split()])
    if len(rows) != 1 or len(rows[0]) != DIM:
        raise ValueError(f"{path}: expected one row of {DIM} integers")
    return tuple(rows[0])


SCALE_EXP = _read_scales()  # z_i = x_i / 2^SCALE_EXP[i]


def _pow2(e):
    return acb(2 ** e) if e >= 0 else acb(arb(fmpq(1, 2 ** (-e))))  # exact at any precision


SIG = tuple(_pow2(e) for e in SCALE_EXP)     # exact powers of two
ISIG = tuple(_pow2(-e) for e in SCALE_EXP)


# ---------------------------------------------------------------------------------------------------------------
# Forward-mode dual numbers over acb
# ---------------------------------------------------------------------------------------------------------------
def _as_acb(x):
    if isinstance(x, acb):
        return x
    if isinstance(x, (arb, int, fmpz, fmpq)) and not isinstance(x, bool):
        return acb(x)
    raise TypeError(f"Dual arithmetic with {type(x).__name__} is refused (no float may enter unexamined)")


def _scale(d, s):
    return {k: s * x for k, x in d.items()}


def _merge(d1, d2):
    if not d1:
        return d2
    if not d2:
        return d1
    r = dict(d1)
    for k, x in d2.items():
        r[k] = r[k] + x if k in r else x
    return r


def _require_right_half_plane(a, name):
    if not (a.real > 0):
        raise DomainError(f"{name}: argument {a} is not certainly in Re > 0")


class Dual:
    """v + sum_k d[k] e_k: a value (acb ball) and a sparse gradient {index: acb ball}. Dicts are never mutated after
    construction, so they may be shared. Only exact scalars (acb, arb, int, fmpz, fmpq) mix with a Dual."""
    __slots__ = ("v", "d")

    def __init__(self, v, d=None):
        self.v = _as_acb(v)
        self.d = {} if d is None else d

    def __repr__(self):
        return f"Dual({self.v}, {self.d})"

    def __add__(self, o):
        if isinstance(o, Dual):
            return Dual(self.v + o.v, _merge(self.d, o.d))
        return Dual(self.v + _as_acb(o), self.d)

    __radd__ = __add__

    def __neg__(self):
        return Dual(-self.v, {k: -x for k, x in self.d.items()})

    def __pos__(self):
        return self

    def __sub__(self, o):
        if isinstance(o, Dual):
            return Dual(self.v - o.v, _merge(self.d, {k: -x for k, x in o.d.items()}))
        return Dual(self.v - _as_acb(o), self.d)

    def __rsub__(self, o):
        return Dual(_as_acb(o) - self.v, {k: -x for k, x in self.d.items()})

    def __mul__(self, o):
        if isinstance(o, Dual):
            return Dual(self.v * o.v, _merge(_scale(self.d, o.v), _scale(o.d, self.v)))
        s = _as_acb(o)
        return Dual(self.v * s, _scale(self.d, s))

    __rmul__ = __mul__

    def __truediv__(self, o):
        if isinstance(o, Dual):
            q = self.v / o.v
            return Dual(q, _merge({k: x / o.v for k, x in self.d.items()}, _scale(o.d, -q / o.v)))
        s = _as_acb(o)
        return Dual(self.v / s, {k: x / s for k, x in self.d.items()})

    def __rtruediv__(self, o):
        q = _as_acb(o) / self.v
        return Dual(q, _scale(self.d, -q / self.v))

    def __pow__(self, n):
        if type(n) is not int:
            raise TypeError("Dual ** n needs an int exponent")
        if n == 0:
            return Dual(acb(1))
        if n == 1:
            return self
        p = self.v ** (n - 1)
        return Dual(self.v ** n, _scale(self.d, n * p))

    def exp(self):
        e = self.v.exp()
        return Dual(e, _scale(self.d, e))

    def log(self):
        _require_right_half_plane(self.v, "log")
        return Dual(self.v.log(), {k: x / self.v for k, x in self.d.items()})

    def sqrt(self):
        _require_right_half_plane(self.v, "sqrt")
        s = self.v.sqrt()
        return Dual(s, _scale(self.d, 1 / (2 * s)))


class ACBMath:
    """The namespace M of the reference, bound to acb (and Dual) functions. log and sqrt: principal branch, guarded."""

    @staticmethod
    def exp(a):
        return a.exp() if isinstance(a, Dual) else to_ball(a).exp()

    @staticmethod
    def log(a):
        if isinstance(a, Dual):
            return a.log()
        a = to_ball(a)
        _require_right_half_plane(a, "log")
        return a.log()

    @staticmethod
    def sqrt(a):
        if isinstance(a, Dual):
            return a.sqrt()
        a = to_ball(a)
        _require_right_half_plane(a, "sqrt")
        return a.sqrt()


M = ACBMath


# ---------------------------------------------------------------------------------------------------------------
# The vector field
# ---------------------------------------------------------------------------------------------------------------
def _states(z):
    if len(z) != DIM:
        raise ValueError(f"expected {DIM} components, got {len(z)}")
    return [to_ball(v) for v in z]


def field_phys(x, prm=None, i_stim=0, prec=None, mdl=None):
    """dx/dt in physical units (mV/ms, mM/ms) at the physical state x, as 18 acb balls."""
    with precision(prec):
        fn = (mdl or model())["field"]
        y = fn(_states(x), prm or params(ctx.prec), M, to_ball(i_stim))
        return _finite([to_ball(v) for v in y], "field_phys")


def f(z, prm=None, i_stim=0, prec=None, mdl=None):
    """dz/dt in the scaled variables z = x / 2^e, as 18 acb balls. i_stim is the reference's stimulus current."""
    with precision(prec):
        fn = (mdl or model())["field"]
        x = [zi * s for zi, s in zip(_states(z), SIG)]
        y = fn(x, prm or params(ctx.prec), M, to_ball(i_stim))
        return _finite([to_ball(v) * s for v, s in zip(y, ISIG)], "f")


def f_and_df(z, prm=None, i_stim=0, prec=None, wrt=(), mdl=None):
    """(f, J) in the scaled variables: f as 18 acb balls and J = Df(z) as an 18x18 acb_mat, both by one forward-mode
    pass with dual numbers. With wrt=("g_Ks", ...) also returns P, the 18 x len(wrt) acb_mat of df/dp (scaled rows)."""
    with precision(prec):
        fn = (mdl or model())["field"]
        p = dict(prm or params(ctx.prec))
        for j, name in enumerate(wrt):
            if name not in p:
                raise KeyError(name)
            p[name] = Dual(to_ball(p[name]), {DIM + j: acb(1)})
        x = [Dual(zi * s, {k: s}) for k, (zi, s) in enumerate(zip(_states(z), SIG))]
        y = fn(x, p, M, to_ball(i_stim))
        F = []
        J = acb_mat(DIM, DIM)
        P = acb_mat(DIM, len(wrt)) if wrt else None
        for i, yi in enumerate(y):
            v, d = (yi.v, yi.d) if isinstance(yi, Dual) else (to_ball(yi), {})
            F.append(v * ISIG[i])
            for k, dk in d.items():
                if k < DIM:
                    J[i, k] = dk * ISIG[i]
                else:
                    P[i, k - DIM] = dk * ISIG[i]
        _finite(F, "f_and_df value")
        _finite([J[i, k] for i in range(DIM) for k in range(DIM)], "f_and_df Jacobian")
        if wrt:
            _finite([P[i, k] for i in range(DIM) for k in range(len(wrt))], "f_and_df parameter derivative")
            return F, J, P
        return F, J


def df(z, prm=None, i_stim=0, prec=None, mdl=None):
    """The 18x18 Jacobian Df(z) in the scaled variables (acb_mat)."""
    return f_and_df(z, prm, i_stim, prec, mdl=mdl)[1]


# ---------------------------------------------------------------------------------------------------------------
# Ring coupling and the Fourier damping symbol
# ---------------------------------------------------------------------------------------------------------------
def coupling(N=None, eps=None, D=D_RING, prec=None):
    """The ring coupling c = N^2 D (or D / eps with eps = 1/N^2 > 0) as an acb ball."""
    if (N is None) == (eps is None):
        raise ValueError("give exactly one of N, eps")
    with precision(prec):
        Db = to_ball(D)
        if N is not None:
            if type(N) is not int or N < 1:
                raise ValueError("N must be a positive int")
            return Db * (N * N)
        e = to_ball(eps)
        if not (e.real > 0 and e.imag.is_zero()):
            raise ValueError("coupling(eps=..) needs eps certainly > 0")
        return Db / e


def ring_field(zs, c, prm=None, prec=None, mdl=None):
    """Vector field of a ring of len(zs) cells in the scaled variables, as in model/tp06_capd.hpp ringField<N>: cell k
    gets i_stim = Cm c (V_{k-1} - 2 V_k + V_{k+1}) (indices mod N), so dV_k/dt gains c (V_{k-1} - 2 V_k + V_{k+1});
    a single cell (N = 1) is uncoupled. Returns a list of N lists of 18 acb balls."""
    N = len(zs)
    with precision(prec):
        fn = (mdl or model())["field"]
        p = prm or params(ctx.prec)
        cb = to_ball(c)
        xs = [[zi * s for zi, s in zip(_states(z), SIG)] for z in zs]
        out = []
        for k in range(N):
            if N == 1:
                istim = acb(0)
            else:
                Vl, V, Vr = xs[(k + N - 1) % N][0], xs[k][0], xs[(k + 1) % N][0]
                istim = p["Cm"] * cb * (Vl - 2 * V + Vr)
            y = fn(xs[k], p, M, istim)
            out.append(_finite([to_ball(v) * s for v, s in zip(y, ISIG)], f"ring_field cell {k}"))
        return out


def damping(m, N=None, eps=None, D=D_RING, prec=None):
    """d_m >= 0 (an acb ball, real): the rotating-wave coupling c e1 (phi_V(th - 2pi/N) - 2 phi_V(th) + phi_V(th + 2pi/N))
    acts on Fourier mode m (phi = sum_m a_m e^{i m th}) as multiplication of the V component by -d_m.
    From N:   d_m = 4 c sin^2(pi m/N), c = N^2 D (sin(pi m/N) from the exact rational m/N).
    From eps: d_m = 4 pi^2 D m^2 sinc(pi m sqrt(eps))^2 for eps >= 0 (a rational, a ball or an interval (lo, hi));
              this equals the N form at eps = 1/N^2, is entire in eps, and gives the cable's D (2 pi m)^2 at eps = 0."""
    if type(m) is not int:
        raise TypeError("m must be an int")
    with precision(prec):
        Db = to_ball(D).real
        if (N is None) == (eps is None):
            raise ValueError("give exactly one of N, eps")
        if N is not None:
            if type(N) is not int or N < 1:
                raise ValueError("N must be a positive int")
            s = arb.sin_pi_fmpq(fmpq(m, N))
            return acb(4 * Db * (N * N) * s * s)
        e = to_ball(eps)
        if isinstance(eps, tuple):  # an interval [lo, hi]: check the endpoints (the hull's ball may dip below 0)
            ok = all(to_ball(b).real >= 0 for b in eps)
        else:
            ok = e.real >= 0
        if not (ok and e.imag.is_zero()):
            raise ValueError("eps must be certainly real and >= 0")
        y = arb.pi() * m * e.real.nonnegative_part().sqrt()  # eps >= 0, so clipping the ball at 0 loses nothing
        sc = y.sinc()
        return acb(4 * arb.pi() ** 2 * Db * (m * m) * sc * sc)


# ---------------------------------------------------------------------------------------------------------------
def _main(argv):
    if "--generate" in argv:
        text = generate()
        with open(GENERATED, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"wrote {GENERATED} ({len(text)} bytes) from {REFERENCE}")
        return 0
    if "--check" in argv:
        with open(REFERENCE, "rb") as fh:
            sha = hashlib.sha256(fh.read()).hexdigest()
        print("versions", flint_versions(), "pinned", FLINT_PIN["python-flint"], FLINT_PIN["FLINT"])
        print("reference sha256", sha, "pinned" if sha == REFERENCE_SHA256 else "DIFFERS FROM PIN")
        model()
        print("generated file is fresh")
        print("parameters", PARAM_DECIMALS)
        print("scale exponents", SCALE_EXP)
        x = [0.2, 0.9768524835792948, 0.024741495516535338, 0.5917893263491758, 0.9964058470986472,
             4.095848903987073e-09, 4.1066743240574905e-09, 0.748897594492505, 0.052896449561713646,
             0.33437292014030084, 0.46501264704764994, 0.003555812567324667, 0.035429656289937016,
             0.36968547042408867, 0.0009478783592908003, 3.188603404050898, 0.1395309372387298, 9.532224323811514]
        y = field_phys(x)
        print("dV/dt at a state near the orbit's section (mV/ms):", y[0].real.str(20, radius=True))
        return 0 if sha == REFERENCE_SHA256 else 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
