"""The space-clamped Hodgkin-Huxley equations in ball arithmetic (FLINT/Arb through python-flint).

Model, in the modern sign convention: u = -V is the depolarization from rest in mV and J = -I the applied
depolarizing current in uA/cm^2 (Hodgkin and Huxley, J. Physiol. 117 (1952) 500-544, eqs. (12), (13), (20),
(21), (23), (24), (26) and Table 3, column 2; temperature 6.3 C, so no temperature factor):

    du/dt = J - 120 m^3 h (u - 115) - 36 n^4 (u + 12) - 0.3 (u - E_l)
    dx/dt = alpha_x(u) (1 - x) - beta_x(u) x          (x = m, n, h)

    alpha_n = 0.1 Psi((10 - u)/10),  beta_n = 0.125 exp(-u/80),
    alpha_m = Psi((25 - u)/10),      beta_m = 4 exp(-u/18),
    alpha_h = 0.07 exp(-u/20),       beta_h = 1/(exp((30 - u)/10) + 1),      Psi(x) = x/(e^x - 1), Psi(0) = 1.

Table 3 prints V_l = -10.613 mV, "exact value chosen to make the total ionic current zero at the resting
potential"; with the printed rate functions that value is 10.5989..., which Guckenheimer and Oliva (SIAM J. Appl.
Dyn. Syst. 1 (2002) 105-114) use as 10.599. E_l enters only through the constant 0.3 E_l, so everything here except
the values of J is independent of it, and J is computed for the whole ball EL_BALL, which contains both values.

Truncated power series (class TS) over complex balls carry derivatives: a quantity evaluated on u(t) = U + t with a
ball U has as coefficients enclosures, over U, of its Taylor coefficients, and a quantity evaluated on x0 + t v with
a complex direction v gives directional derivatives. Psi is never divided by a ball that contains 0: near 0 its
Taylor coefficients come from the Bernoulli series x/(e^x - 1) = sum B_n x^n/n! (radius 2 pi) with a rigorous tail.
"""
from flint import arb, acb, fmpq, ctx

ctx.prec = 256

GNA, GK, GL = arb(120), arb(36), arb(3) / 10
ENA, EK = arb(115), arb(-12)
EL_PRINTED = arb(10613) / 1000
EL_BALL = arb('[10.605 +/- 0.015]')          # [10.59, 10.62] contains 10.613 and 10.5989...
TWO_PI = 2 * arb.pi()

_BERN = []                                      # B_n / n! as exact rationals, n = 0, 1, ...


def _bern_over_fact(N):
    while len(_BERN) <= N:
        n = len(_BERN)
        f = fmpq(1)
        for k in range(2, n + 1):
            f *= k
        _BERN.append(fmpq.bernoulli(n) / f)
    return _BERN


class TS:
    """Truncated power series sum c_k t^k, k < L, with acb coefficients."""
    __slots__ = ('c',)

    def __init__(self, c):
        self.c = [acb(x) for x in c]

    @property
    def L(self):
        return len(self.c)

    @staticmethod
    def const(x, L):
        return TS([acb(x)] + [acb(0)] * (L - 1))

    def _lift(self, o):
        return o if isinstance(o, TS) else TS.const(o, self.L)

    def __add__(self, o):
        o = self._lift(o)
        return TS([a + b for a, b in zip(self.c, o.c)])
    __radd__ = __add__

    def __neg__(self):
        return TS([-a for a in self.c])

    def __sub__(self, o):
        return self + (-self._lift(o))

    def __rsub__(self, o):
        return self._lift(o) + (-self)

    def __mul__(self, o):
        if not isinstance(o, TS):
            return TS([a * o for a in self.c])
        L = self.L
        return TS([sum((self.c[i] * o.c[k - i] for i in range(k + 1)), acb(0)) for k in range(L)])
    __rmul__ = __mul__

    def __pow__(self, n):
        r = TS.const(1, self.L)
        for _ in range(n):
            r = r * self
        return r

    def shift(self):
        """The series without its constant term."""
        return TS([acb(0)] + self.c[1:])

    def compose(self, d):
        """sum_k d_k (self - self_0)^k: a function with Taylor coefficients d_k at self_0, applied to self."""
        s = self.shift()
        out, p = TS.const(0, self.L), TS.const(1, self.L)
        for k in range(self.L):
            out = out + p * d[k]
            p = p * s
        return out

    def recip(self):
        a0 = self.c[0]
        if a0.real.contains(0) and a0.imag.contains(0):
            raise ZeroDivisionError('series with a constant term that may vanish')
        inv = 1 / a0
        return self.compose([inv * (-inv) ** k for k in range(self.L)])

    def __truediv__(self, o):
        if isinstance(o, TS):
            return self * o.recip()
        return TS([a / o for a in self.c])

    def __rtruediv__(self, o):
        return self.recip() * o

    def exp(self):
        e0 = self.c[0].exp()
        f, d = acb(1), []
        for k in range(self.L):
            d.append(e0 / f)
            f *= k + 1
        return self.compose(d)

    def deriv(self):
        """d/dt, one term shorter."""
        return TS([self.c[k] * k for k in range(1, self.L)])

    def coeff(self, k):
        return self.c[k]


def psi_coeffs(x0, L, N=240):
    """Enclosures, over the real ball x0, of the Taylor coefficients Psi^(k)(x)/k!, k < L."""
    r = abs(x0).upper() if hasattr(abs(x0), 'upper') else x0.mid().abs() + x0.rad()
    r = arb(r)
    if r < 3:
        b = _bern_over_fact(N + 1)
        q = r / TWO_PI
        out = []
        for k in range(L):
            s, binom = arb(0), fmpq(1)
            xp = arb(1)
            for n in range(k, N + 1):
                if n > k:
                    binom = binom * n / (n - k)
                    xp = xp * x0
                s += arb(b[n] * binom) * xp
            # tail n > N: |B_n|/n! <= 4/(2 pi)^n, so a term is at most 4 C(n, k) r^(n-k) / (2 pi)^n; the ratio
            # of consecutive terms is at most rho = (N + 2)/(N + 2 - k) * q < 1.
            rho = arb(N + 2) / (N + 2 - k) * q
            if not rho < 1:
                raise ArithmeticError('Bernoulli tail does not converge')
            cN = arb(fmpq(1))
            for j in range(k):                              # C(N+1, k)
                cN = cN * (N + 1 - j) / (j + 1)
            first = 4 * cN * r ** (N + 1 - k) / TWO_PI ** (N + 1)
            s += arb(0, (first / (1 - rho)).upper())
            out.append(acb(s))
        return out
    if x0.contains(0):
        raise ArithmeticError('closed form of Psi used on a ball containing 0')
    t = TS([acb(x0), acb(1)] + [acb(0)] * (L - 2)) if L >= 2 else TS([acb(x0)])
    num = t
    den = TS.const(x0, L).exp() * TS([acb(0)] + [acb(1)] + [acb(0)] * (L - 2)).exp() - 1 if L >= 2 \
        else TS([acb(x0.exp() - 1)])
    return (num / den).c


def psi_ts(xts):
    """Psi applied to a series whose constant term is a real ball."""
    x0 = xts.c[0].real
    return xts.compose(psi_coeffs(x0, xts.L))


def rates(u):
    """alpha_m, beta_m, alpha_n, beta_n, alpha_h, beta_h as series, for a series u with a real constant term."""
    an = psi_ts((10 - u) / 10) * (arb(1) / 10)
    bn = (u * (-arb(1) / 80)).exp() * (arb(1) / 8)
    am = psi_ts((25 - u) / 10)
    bm = (u * (-arb(1) / 18)).exp() * 4
    ah = (u * (-arb(1) / 20)).exp() * (arb(7) / 100)
    bh = ((30 - u) / 10).exp().__add__(1).recip()
    return am, bm, an, bn, ah, bh


def field(x, J, EL):
    """The vector field on series x = (u, m, n, h)."""
    u, m, n, h = x
    am, bm, an, bn, ah, bh = rates(u)
    du = -(m ** 3 * h * (u - ENA) * GNA) - n ** 4 * (u - EK) * GK - (u - EL) * GL + J
    return [du, am * (1 - m) - bm * m, an * (1 - n) - bn * n, ah * (1 - h) - bh * h]


def branch(U, L, EL=EL_BALL):
    """Series in u (u = U + t) of the steady state along the equilibrium branch: returns a dict with the
    steady-state current Jss, the Jacobian entries, the characteristic polynomial coefficients a1..a4 and the
    Hurwitz determinants D2 = a1 a2 - a3, D3 = a1 a2 a3 - a3^2 - a1^2 a4. The rates are computed to length L + 1,
    so every returned series has length L."""
    u = TS([acb(U), acb(1)] + [acb(0)] * (L - 1))
    am, bm, an, bn, ah, bh = rates(u)
    out = {}
    km, kn, kh = am + bm, an + bn, ah + bh
    m, n, h = am / km, an / kn, ah / kh

    def cut(s):
        return TS(s.c[:L])
    # derivative of x_inf-type entries: a_x1 = (alpha' beta - alpha beta')/(alpha + beta)
    am1 = cut(am.deriv() * TS(bm.c[:L]) - TS(am.c[:L]) * bm.deriv()) / cut(km)
    an1 = cut(an.deriv() * TS(bn.c[:L]) - TS(an.c[:L]) * bn.deriv()) / cut(kn)
    ah1 = cut(ah.deriv() * TS(bh.c[:L]) - TS(ah.c[:L]) * bh.deriv()) / cut(kh)
    u, m, n, h, km, kn, kh = cut(u), cut(m), cut(n), cut(h), cut(km), cut(kn), cut(kh)
    Jss = m ** 3 * h * (u - ENA) * GNA + n ** 4 * (u - EK) * GK + (u - EL) * GL
    a11 = -(m ** 3 * h * GNA + n ** 4 * GK + GL)
    a1m = -(m ** 2 * h * (u - ENA) * (3 * GNA))
    a1n = -(n ** 3 * (u - EK) * (4 * GK))
    a1h = -(m ** 3 * (u - ENA) * GNA)
    cm, cn, ch = a1m * am1, a1n * an1, a1h * ah1
    e1 = km + kn + kh
    e2 = km * kn + km * kh + kn * kh
    e3 = km * kn * kh
    a1 = e1 - a11
    a2 = e2 - a11 * e1 - (cm + cn + ch)
    a3 = e3 - a11 * e2 - (cm * (kn + kh) + cn * (km + kh) + ch * (km + kn))
    a4 = -(a11 * e3) - (cm * kn * kh + cn * km * kh + ch * km * kn)
    out.update(u=u, m=m, n=n, h=h, km=km, kn=kn, kh=kh, Jss=Jss, a11=a11, a1m=a1m, a1n=a1n, a1h=a1h,
               am1=am1, an1=an1, ah1=ah1, a1=a1, a2=a2, a3=a3, a4=a4,
               D2=a1 * a2 - a3, D3=a1 * a2 * a3 - a3 * a3 - a1 * a1 * a4)
    return out


def re(x):
    """Real part of an acb (as arb)."""
    return x.real
