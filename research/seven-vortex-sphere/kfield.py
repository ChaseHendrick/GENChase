"""Exact arithmetic in the real number field K = Q(s), s = sin(2 pi / 5).

s is the positive root of 16 x^4 - 20 x^2 + 5 = 0 lying near 0.951; it is
s = sqrt(10 + 2 sqrt 5) / 4.  The field contains sqrt 5 = 8 s^2 - 5 and
c = cos(2 pi / 5) = 2 s^2 - 3/2 = (sqrt 5 - 1) / 4.

An element is a tuple (a0, a1, a2, a3) of Fractions meaning a0 + a1 s + a2 s^2 + a3 s^3.
Signs and magnitudes are decided with rigorous ball arithmetic (Arb, through
python-flint), never with floating point.
"""
from fractions import Fraction as Q
import flint

flint.ctx.prec = 256

# s^4 = (5/4) s^2 - 5/16
_S4 = (Q(-5, 16), Q(0), Q(5, 4), Q(0))


def _arb_s():
    five = flint.arb(5)
    return (flint.arb(10) + 2 * five.sqrt()).sqrt() / 4


class K:
    __slots__ = ("c",)

    def __init__(self, *coeffs):
        if len(coeffs) == 1 and isinstance(coeffs[0], (tuple, list)):
            coeffs = tuple(coeffs[0])
        c = [Q(x) for x in coeffs] + [Q(0)] * (4 - len(coeffs))
        self.c = tuple(c[:4])

    # construction helpers
    @staticmethod
    def zero():
        return K(0)

    @staticmethod
    def one():
        return K(1)

    def is_zero(self):
        return all(x == 0 for x in self.c)

    def __add__(self, o):
        o = _k(o)
        return K(tuple(a + b for a, b in zip(self.c, o.c)))

    __radd__ = __add__

    def __neg__(self):
        return K(tuple(-a for a in self.c))

    def __sub__(self, o):
        return self + (-_k(o))

    def __rsub__(self, o):
        return _k(o) - self

    def __mul__(self, o):
        o = _k(o)
        prod = [Q(0)] * 7
        for i, a in enumerate(self.c):
            if a == 0:
                continue
            for j, b in enumerate(o.c):
                if b:
                    prod[i + j] += a * b
        # reduce degrees 6, 5, 4 using s^4 = (5/4)s^2 - 5/16
        for d in (6, 5, 4):
            t = prod[d]
            if t:
                prod[d] = Q(0)
                for k, r in enumerate(_S4):
                    if r:
                        prod[d - 4 + k] += t * r
        return K(tuple(prod[:4]))

    __rmul__ = __mul__

    def inv(self):
        # solve (self) * x = 1 as a 4x4 linear system over Q
        cols = []
        basis = [K(1), K(0, 1), K(0, 0, 1), K(0, 0, 0, 1)]
        for b in basis:
            cols.append((self * b).c)
        M = [[cols[j][i] for j in range(4)] + [Q(1 if i == 0 else 0)] for i in range(4)]
        for col in range(4):
            piv = next(r for r in range(col, 4) if M[r][col] != 0)
            M[col], M[piv] = M[piv], M[col]
            p = M[col][col]
            M[col] = [x / p for x in M[col]]
            for r in range(4):
                if r != col and M[r][col] != 0:
                    f = M[r][col]
                    M[r] = [x - f * y for x, y in zip(M[r], M[col])]
        return K(tuple(M[i][4] for i in range(4)))

    def __truediv__(self, o):
        return self * _k(o).inv()

    def __rtruediv__(self, o):
        return _k(o) * self.inv()

    def __eq__(self, o):
        return (self - _k(o)).is_zero()

    def __hash__(self):
        return hash(self.c)

    def arb(self):
        s = _arb_s()
        r = flint.arb(0)
        p = flint.arb(1)
        for a in self.c:
            r += flint.arb(a.numerator) / a.denominator * p
            p *= s
        return r

    def sign(self):
        """Exact sign: zero is decided exactly, nonzero by a rigorous enclosure."""
        if self.is_zero():
            return 0
        prec = 256
        while True:
            flint.ctx.prec = prec
            x = self.arb()
            flint.ctx.prec = 256
            if x > 0:
                return 1
            if x < 0:
                return -1
            prec *= 2  # a nonzero element of K is never 0, so this terminates

    def __float__(self):
        return float(self.arb().mid())

    def __repr__(self):
        return "K(%s)" % ", ".join(str(x) for x in self.c)


def _k(x):
    return x if isinstance(x, K) else K(x)


S = K(0, 1)
C1 = 2 * S * S - Q(3, 2)          # cos(2 pi/5)
SQRT5 = 8 * S * S - 5


def cos_sin(m):
    """Exact (cos, sin) of 2 pi m / 5 in K."""
    m %= 5
    c, s = K(1), K(0)
    for _ in range(m):
        c, s = c * C1 - s * S, s * C1 + c * S
    return c, s


if __name__ == "__main__":
    import math
    assert (SQRT5 * SQRT5) == K(5)
    for m in range(5):
        c, s = cos_sin(m)
        assert abs(float(c) - math.cos(2 * math.pi * m / 5)) < 1e-14
        assert abs(float(s) - math.sin(2 * math.pi * m / 5)) < 1e-14
    x = K(3, -1, 2, Q(1, 7))
    assert x * x.inv() == K(1)
    print("kfield self-test ok; c =", float(C1), " s =", float(S))
