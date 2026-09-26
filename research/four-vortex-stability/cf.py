"""First-order centred forms in one parameter t over T = [-h, h] (python-flint arb/acb).

A CF number represents a function f(t, w) of the parameter t in T and of auxiliary variables
w ranging over a fixed box (the Krawczyk box).  It carries three balls:
    c  encloses f(0, w)          for all w,
    v  encloses f(t, w)          for all t in T, all w,
    d  encloses df/dt (t, w)     for all t in T, all w.
By the mean value theorem f(t, w) is in c + d*T, so the best enclosure of the range is
    best = (c + d*T) intersected with v.
Every operation below maps enclosures to enclosures (product rule, quotient rule, chain rule
for sqrt and log evaluated on best()), so the three invariants propagate.  Comparisons and
divisions use best().  This is ordinary interval arithmetic applied to the pair (value,
derivative) plus the mean value theorem; it removes the first-order dependency on t that
makes naive interval evaluation useless here.
"""
from flint import arb, acb


def _isnum(x):
    return isinstance(x, (int, float, arb, acb))


def _meet(a, b):
    if isinstance(a, acb) or isinstance(b, acb):
        a, b = acb(a), acb(b)
        re = a.real.intersection(b.real)
        im = a.imag.intersection(b.imag)
        return acb(re, im)
    return arb(a).intersection(arb(b))


class CF:
    __slots__ = ('c', 'v', 'd')
    T = arb(0)  # set by set_T

    @classmethod
    def set_T(cls, h):
        cls.T = arb(0, h)

    def __init__(self, c, v=None, d=None):
        self.c = c
        self.v = c if v is None else v
        self.d = (arb(0) if not isinstance(c, acb) else acb(0)) if d is None else d

    @staticmethod
    def const(x):
        return CF(x, x, arb(0) if not isinstance(x, acb) else acb(0))

    def best(self):
        return _meet(self.c + self.d * CF.T, self.v)

    def mid(self):
        return self.c.mid()

    # arithmetic -------------------------------------------------------------
    def _l(self, o):
        return o if isinstance(o, CF) else CF.const(o if not isinstance(o, (int, float)) else arb(o))

    def __add__(self, o):
        if not isinstance(o, CF) and not _isnum(o):
            return NotImplemented
        o = self._l(o)
        return CF(self.c + o.c, self.best() + o.best(), self.d + o.d)

    __radd__ = __add__

    def __neg__(self):
        return CF(-self.c, -self.v, -self.d)

    def __sub__(self, o):
        if not isinstance(o, CF) and not _isnum(o):
            return NotImplemented
        return self + (-self._l(o))

    def __rsub__(self, o):
        if not isinstance(o, CF) and not _isnum(o):
            return NotImplemented
        return self._l(o) - self

    def __mul__(self, o):
        if not isinstance(o, CF) and not _isnum(o):
            return NotImplemented
        if _isnum(o):
            o = arb(o) if isinstance(o, (int, float)) else o
            return CF(self.c * o, self.v * o, self.d * o)
        a, b = self.best(), o.best()
        return CF(self.c * o.c, a * b, self.d * b + a * o.d)

    __rmul__ = __mul__

    def __truediv__(self, o):
        if not isinstance(o, CF) and not _isnum(o):
            return NotImplemented
        if _isnum(o):
            o = arb(o) if isinstance(o, (int, float)) else o
            return CF(self.c / o, self.v / o, self.d / o)
        a, b = self.best(), o.best()
        return CF(self.c / o.c, a / b, (self.d * b - a * o.d) / (b * b))

    def __rtruediv__(self, o):
        if not isinstance(o, CF) and not _isnum(o):
            return NotImplemented
        return self._l(o) / self

    def sqrt(self):
        b = self.best()
        s = b.sqrt()
        return CF(self.c.sqrt(), s, self.d / (2 * s))

    def log(self):
        b = self.best()
        return CF(self.c.log(), b.log(), self.d / b)

    def __abs__(self):
        if self > 0:
            return self
        if self < 0:
            return -self
        raise ValueError('abs: sign not certified')

    # comparisons on the best enclosure (real only) --------------------------
    def __gt__(self, o):
        o = o.best() if isinstance(o, CF) else o
        return self.best() > o

    def __lt__(self, o):
        o = o.best() if isinstance(o, CF) else o
        return self.best() < o

    @property
    def real(self):
        return CF(self.c.real, self.v.real, self.d.real)

    @property
    def imag(self):
        return CF(self.c.imag, self.v.imag, self.d.imag)

    def contains(self, x):
        return self.best().contains(x)

    def rad(self):
        return self.best().rad()

    def __repr__(self):
        return 'CF(%s)' % self.best()


def cplx(x, y=0):
    """Complex CF from real CF / numbers."""
    if not isinstance(x, CF) and not isinstance(y, CF):
        return CF.const(acb(x, y))
    x = x if isinstance(x, CF) else CF.const(arb(x))
    y = y if isinstance(y, CF) else CF.const(arb(y))
    return CF(acb(x.c, y.c), acb(x.best(), y.best()), acb(x.d, y.d))


class CF2:
    """Second-order centred form in t over T = [-h, h]:
        c0 encloses f(0), c1 encloses f'(0), d2 encloses f''(t) for all t in T (and all w),
        v  encloses f(t) for all t in T.
    Range: f(t) in c0 + c1 t + d2 t^2/2 (Taylor with Lagrange remainder), intersected with v.
    First derivative over T: f'(t) in c1 + d2 t.
    Second derivatives of products and compositions use the exact second-order chain and
    product rules evaluated on these enclosures."""
    __slots__ = ('c0', 'c1', 'd2', 'v')
    T = arb(0)
    T2h = arb(0)  # t^2/2 over T, i.e. [0, h^2/2]

    @classmethod
    def set_T(cls, h):
        cls.T = arb(0, h)
        cls.T2h = arb(h * h / 4, h * h / 4)

    def __init__(self, c0, c1=None, d2=None, v=None):
        z = arb(0) if not isinstance(c0, acb) else acb(0)
        self.c0 = c0
        self.c1 = z if c1 is None else c1
        self.d2 = z if d2 is None else d2
        self.v = (c0 + self.c1 * CF2.T + self.d2 * CF2.T2h) if v is None else v

    @staticmethod
    def const(x):
        z = arb(0) if not isinstance(x, acb) else acb(0)
        return CF2(x, z, z, x)

    def best(self):
        return _meet(self.c0 + self.c1 * CF2.T + self.d2 * CF2.T2h, self.v)

    def dbest(self):
        return self.c1 + self.d2 * CF2.T

    def mid(self):
        return self.c0.mid()

    def _l(self, o):
        return o if isinstance(o, CF2) else CF2.const(o if not isinstance(o, (int, float)) else arb(o))

    def __add__(self, o):
        if not isinstance(o, CF2) and not _isnum(o):
            return NotImplemented
        o = self._l(o)
        return CF2(self.c0 + o.c0, self.c1 + o.c1, self.d2 + o.d2, self.best() + o.best())

    __radd__ = __add__

    def __neg__(self):
        return CF2(-self.c0, -self.c1, -self.d2, -self.v)

    def __sub__(self, o):
        if not isinstance(o, CF2) and not _isnum(o):
            return NotImplemented
        return self + (-self._l(o))

    def __rsub__(self, o):
        if not isinstance(o, CF2) and not _isnum(o):
            return NotImplemented
        return self._l(o) - self

    def __mul__(self, o):
        if not isinstance(o, CF2) and not _isnum(o):
            return NotImplemented
        if _isnum(o):
            o = arb(o) if isinstance(o, (int, float)) else o
            return CF2(self.c0 * o, self.c1 * o, self.d2 * o, self.v * o)
        a, b = self.best(), o.best()
        da, db = self.dbest(), o.dbest()
        return CF2(self.c0 * o.c0, self.c0 * o.c1 + self.c1 * o.c0,
                   self.d2 * b + 2 * da * db + a * o.d2, a * b)

    __rmul__ = __mul__

    def _compose(self, f0, f1, f2, fv):
        """phi(self) given phi, phi', phi'' as functions of a ball."""
        b, db = self.best(), self.dbest()
        return CF2(f0(self.c0), f1(self.c0) * self.c1, f2(b) * db * db + f1(b) * self.d2, f0(b))

    def recip(self):
        return self._compose(lambda x: 1 / x, lambda x: -1 / (x * x), lambda x: 2 / (x * x * x), None)

    def __truediv__(self, o):
        if not isinstance(o, CF2) and not _isnum(o):
            return NotImplemented
        if _isnum(o):
            o = arb(o) if isinstance(o, (int, float)) else o
            return CF2(self.c0 / o, self.c1 / o, self.d2 / o, self.v / o)
        return self * o.recip()

    def __rtruediv__(self, o):
        if not isinstance(o, CF2) and not _isnum(o):
            return NotImplemented
        return self._l(o) * self.recip()

    def sqrt(self):
        return self._compose(lambda x: x.sqrt(), lambda x: 1 / (2 * x.sqrt()),
                             lambda x: -1 / (4 * x * x.sqrt()), None)

    def log(self):
        return self._compose(lambda x: x.log(), lambda x: 1 / x, lambda x: -1 / (x * x), None)

    def __abs__(self):
        if self > 0:
            return self
        if self < 0:
            return -self
        raise ValueError('abs: sign not certified')

    def __gt__(self, o):
        o = o.best() if isinstance(o, CF2) else o
        return self.best() > o

    def __lt__(self, o):
        o = o.best() if isinstance(o, CF2) else o
        return self.best() < o

    @property
    def real(self):
        return CF2(self.c0.real, self.c1.real, self.d2.real, self.v.real)

    @property
    def imag(self):
        return CF2(self.c0.imag, self.c1.imag, self.d2.imag, self.v.imag)

    def contains(self, x):
        return self.best().contains(x)

    def rad(self):
        return self.best().rad()

    def __repr__(self):
        return 'CF2(%s)' % self.best()


def cplx2(x, y=0):
    if not isinstance(x, CF2) and not isinstance(y, CF2):
        return CF2.const(acb(x, y))
    x = x if isinstance(x, CF2) else CF2.const(arb(x))
    y = y if isinstance(y, CF2) else CF2.const(arb(y))
    return CF2(acb(x.c0, y.c0), acb(x.c1, y.c1), acb(x.d2, y.d2), acb(x.best(), y.best()))
