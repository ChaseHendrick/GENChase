"""Truncated multivariate Taylor polynomials with a generic coefficient ring.

A TPS holds the Taylor coefficients, up to total degree DEG, of a function of NV
variables about a base point.  Coefficients may be Python floats (exploration) or
python-flint `arb` / `acb` balls (certification).  Every operation used here is a
finite algebraic operation on the coefficients, or a truncated series of log or of
(1 + x)^(1/2) whose tail is exactly zero after truncation (the argument has no
constant term), so ball coefficients enclose the exact Taylor coefficients of the
exact function whenever the inputs enclose theirs.
"""
from itertools import product
import math


class Ring:
    """Coefficient ring: constructors and the two transcendental functions needed."""

    def __init__(self, kind):
        self.kind = kind
        if kind == 'float':
            self.const = float
            self.log = math.log
            self.sqrt = math.sqrt
        elif kind == 'arb':
            from flint import arb
            self.const = lambda x: arb(x) if not isinstance(x, arb) else x
            self.log = lambda x: x.log()
            self.sqrt = lambda x: x.sqrt()
        elif kind == 'cf':
            from flint import arb
            from cf import CF
            self.const = lambda x: x if isinstance(x, CF) else CF.const(arb(x))
            self.log = lambda x: x.log()
            self.sqrt = lambda x: x.sqrt()
        elif kind == 'cf2':
            from flint import arb
            from cf import CF2
            self.const = lambda x: x if isinstance(x, CF2) else CF2.const(arb(x))
            self.log = lambda x: x.log()
            self.sqrt = lambda x: x.sqrt()
        else:
            raise ValueError(kind)
        self.zero = self.const(0)
        self.one = self.const(1)


class Space:
    """Monomial bookkeeping for NV variables up to total degree DEG."""

    def __init__(self, nv, deg):
        self.nv, self.deg = nv, deg
        mons = [e for e in product(range(deg + 1), repeat=nv) if sum(e) <= deg]
        mons.sort(key=lambda e: (sum(e), tuple(-x for x in e)))
        self.mons = mons
        self.index = {e: i for i, e in enumerate(mons)}
        self.n = len(mons)
        self.pairs = []
        for i, a in enumerate(mons):
            for j, b in enumerate(mons):
                if sum(a) + sum(b) <= deg:
                    self.pairs.append((i, j, self.index[tuple(x + y for x, y in zip(a, b))]))
        self.degree_of = [sum(e) for e in mons]


class TPS:
    __slots__ = ('sp', 'R', 'c')

    def __init__(self, sp, R, c=None):
        self.sp, self.R = sp, R
        self.c = c if c is not None else [R.zero] * sp.n

    @classmethod
    def const(cls, sp, R, v):
        t = cls(sp, R)
        t.c[0] = R.const(v) if not hasattr(v, 'mid') and not isinstance(v, float) else v
        return t

    @classmethod
    def var(cls, sp, R, k, base):
        t = cls(sp, R)
        t.c[0] = base
        e = [0] * sp.nv
        e[k] = 1
        t.c[sp.index[tuple(e)]] = R.one
        return t

    def _lift(self, o):
        if isinstance(o, TPS):
            return o
        t = TPS(self.sp, self.R)
        t.c[0] = o
        return t

    def __add__(self, o):
        o = self._lift(o)
        return TPS(self.sp, self.R, [a + b for a, b in zip(self.c, o.c)])

    __radd__ = __add__

    def __neg__(self):
        return TPS(self.sp, self.R, [-a for a in self.c])

    def __sub__(self, o):
        return self + (-self._lift(o))

    def __rsub__(self, o):
        return self._lift(o) - self

    def __mul__(self, o):
        if not isinstance(o, TPS):
            return TPS(self.sp, self.R, [a * o for a in self.c])
        out = [self.R.zero] * self.sp.n
        a, b = self.c, o.c
        for i, j, k in self.sp.pairs:
            out[k] = out[k] + a[i] * b[j]
        return TPS(self.sp, self.R, out)

    __rmul__ = __mul__

    def scale(self, s):
        return TPS(self.sp, self.R, [a * s for a in self.c])

    def tail(self):
        t = TPS(self.sp, self.R, list(self.c))
        t.c[0] = self.R.zero
        return t

    def _series(self, coeffs):
        """sum_k coeffs[k] * tail^k, k = 0..deg (exact after truncation)."""
        x = self.tail()
        out = TPS(self.sp, self.R)
        out.c[0] = coeffs[0]
        p = None
        for k in range(1, self.sp.deg + 1):
            p = x if p is None else p * x
            out = out + p.scale(coeffs[k])
        return out

    def log(self):
        f0 = self.c[0]
        inv = self.R.one / f0
        x = self.scale(inv)
        x.c[0] = self.R.zero
        # log(f0) + sum (-1)^(k+1) x^k / k
        coeffs = [self.R.log(f0)] + [self.R.const((-1) ** (k + 1)) / self.R.const(k)
                                     for k in range(1, self.sp.deg + 1)]
        out = TPS(self.sp, self.R)
        out.c[0] = coeffs[0]
        p = None
        for k in range(1, self.sp.deg + 1):
            p = x if p is None else p * x
            out = out + p.scale(coeffs[k])
        return out

    def sqrt(self):
        f0 = self.c[0]
        s0 = self.R.sqrt(f0)
        x = self.scale(self.R.one / f0)
        x.c[0] = self.R.zero
        # (1+x)^(1/2) = sum binom(1/2, k) x^k
        out = TPS(self.sp, self.R)
        out.c[0] = self.R.one
        p = None
        b = self.R.one
        for k in range(1, self.sp.deg + 1):
            b = b * (self.R.const(1) / self.R.const(2) - self.R.const(k - 1)) / self.R.const(k)
            p = x if p is None else p * x
            out = out + p.scale(b)
        return out.scale(s0)

    def part(self, d):
        """Homogeneous part of degree d as {exponent: coeff}."""
        return {e: self.c[i] for i, e in enumerate(self.sp.mons) if sum(e) == d}
