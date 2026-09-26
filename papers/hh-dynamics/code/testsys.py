"""Test vector fields with exactly known solutions, in the same series interface as hh_arb.HH.

HopfZ:  x' = x - w y - x (x^2+y^2),  y' = w x + y - y (x^2+y^2),  z' = a z
        polar: r' = r (1 - r^2), theta' = w; r(t) = r0 / sqrt(r0^2 + (1 - r0^2) e^{-2t}).
        Section y = 0 with y' > 0 (i.e. x > 0): return time 2 pi / w, the circle r = 1 is a
        periodic orbit with multipliers exp(-4 pi / w) (radial) and exp(2 pi a / w) (z).
Quad:   x' = q x^2,  x(t) = x0 / (1 - q x0 t).
PsiDecay: u' = -Psi(u), Psi(u) = u/(e^u - 1);  Ein(u(t)) = Ein(u0) - t with
        Ein(u) = int_0^u (e^s - 1)/s ds = u 2F2(1,1;2,2;u).  The solution passes through the
        removable singularity u = 0 of u/(e^u - 1).
"""
from flint import arb, arb_mat
from hh_arb import E_taylor, recip_series, _fac_list


def _conv(a, b, k):
    s = a[0] * b[k]
    for i in range(1, k + 1):
        s += a[i] * b[k - i]
    return s


class HopfZ:
    dim = 3
    names = ('x', 'y', 'z')

    def __init__(self, a, w=1, wrong=0):
        self.a = arb(a)
        self.w = arb(w)
        self.wrong = arb(wrong)          # negative control: adds wrong * x^2 to x'

    def series(self, x0, N, jac=False):
        x = [x0[0]]; y = [x0[1]]; z = [x0[2]]
        xx = []; yy = []; xy = []; r2 = []; xr2 = []; yr2 = []
        xs = [list(x0)]
        Dfs = []
        for k in range(N):
            xx.append(_conv(x, x, k)); yy.append(_conv(y, y, k)); xy.append(_conv(x, y, k))
            r2.append(xx[k] + yy[k])
            xr2.append(_conv(x, r2, k)); yr2.append(_conv(y, r2, k))
            fx = x[k] - self.w * y[k] - xr2[k] + self.wrong * xx[k]
            fy = self.w * x[k] + y[k] - yr2[k]
            fz = self.a * z[k]
            if jac:
                A = arb_mat(3, 3)
                one = 1 if k == 0 else 0
                A[0, 0] = one - r2[k] - 2 * xx[k] + 2 * self.wrong * x[k]
                A[0, 1] = -2 * xy[k] - (self.w if k == 0 else 0)
                A[1, 0] = -2 * xy[k] + (self.w if k == 0 else 0)
                A[1, 1] = one - r2[k] - 2 * yy[k]
                A[2, 2] = self.a if k == 0 else arb(0)
                Dfs.append(A)
            k1 = k + 1
            x.append(fx / k1); y.append(fy / k1); z.append(fz / k1)
            xs.append([x[k1], y[k1], z[k1]])
        return xs, Dfs

    def f(self, x):
        return self.series(x, 1)[0][1]

    def Df(self, x):
        return self.series(x, 1, jac=True)[1][0]


class TwistZ:
    """x' = x - y w - x r^2,  y' = x w + y - y r^2,  z' = a z,  w = 1 + b r^2  (r^2 = x^2 + y^2).

    Polar form: r' = r (1 - r^2), theta' = 1 + b r^2, so the return time to {y = 0, y' > 0} depends on
    the starting radius when b != 0:  theta(t) = t + (b/2) ln(r0^2 e^{2t} + 1 - r0^2),  and the first
    return time T(r0) solves theta(T) = 2 pi.  The return point is P(r0, z0) = (r(T), z0 e^{a T}) with
    r(t) = r0 / sqrt(r0^2 + (1 - r0^2) e^{-2t}).  Because T varies across a box of starting points and
    z moves at the section (z' = a z != 0), a Poincare map that dropped the projection onto the section
    (in the point or in the derivative) gives a wrong answer here.
    """
    dim = 3
    names = ('x', 'y', 'z')

    def __init__(self, a, b):
        self.a = arb(a)
        self.b = arb(b)

    def series(self, x0, N, jac=False):
        x = [x0[0]]; y = [x0[1]]; z = [x0[2]]
        xx = []; yy = []; xy = []; r2 = []; xr2 = []; yr2 = []
        xs = [list(x0)]
        Dfs = []
        b = self.b
        for k in range(N):
            xx.append(_conv(x, x, k)); yy.append(_conv(y, y, k)); xy.append(_conv(x, y, k))
            r2.append(xx[k] + yy[k])
            xr2.append(_conv(x, r2, k)); yr2.append(_conv(y, r2, k))
            fx = x[k] - y[k] - b * yr2[k] - xr2[k]
            fy = x[k] + b * xr2[k] + y[k] - yr2[k]
            fz = self.a * z[k]
            if jac:
                A = arb_mat(3, 3)
                one = 1 if k == 0 else 0
                A[0, 0] = one - 2 * b * xy[k] - r2[k] - 2 * xx[k]
                A[0, 1] = -one - b * (r2[k] + 2 * yy[k]) - 2 * xy[k]
                A[1, 0] = one + b * (r2[k] + 2 * xx[k]) - 2 * xy[k]
                A[1, 1] = one + 2 * b * xy[k] - r2[k] - 2 * yy[k]
                A[2, 2] = self.a if k == 0 else arb(0)
                Dfs.append(A)
            k1 = k + 1
            x.append(fx / k1); y.append(fy / k1); z.append(fz / k1)
            xs.append([x[k1], y[k1], z[k1]])
        return xs, Dfs

    def f(self, x):
        return self.series(x, 1)[0][1]

    def exact_return(self, r0, z0, prec_digits=40):
        """Rigorous enclosures of T(r0), P(r0, z0) and DP(r0, z0) (arb): T is located by float Newton
        and then enclosed by a sign change of the increasing function theta(T) - 2 pi, checked in arb."""
        import math
        r0 = arb(r0); z0 = arb(z0)
        a, b = self.a, self.b
        two_pi = 2 * arb.pi()

        def g(T):
            return T + b / 2 * (r0 * r0 * (2 * T).exp() + 1 - r0 * r0).log() - two_pi
        Tf = 2 * math.pi / (1 + float(b.mid()))
        for _ in range(60):
            Ta = arb(Tf)
            D = r0 * r0 * (2 * Ta).exp() + 1 - r0 * r0
            gp = 1 + b * r0 * r0 * (2 * Ta).exp() / D
            Tf = Tf - float((g(Ta) / gp).mid())
        eps = 1e-12
        lo, hi = arb(Tf - eps), arb(Tf + eps)
        if not ((g(lo) < 0) and (g(hi) > 0)):
            raise RuntimeError('return time not enclosed')
        # theta is strictly increasing in T (theta' = 1 + b r^2 > 0 for b > -1), so the root is unique
        T = lo.union(hi)
        e2 = (-2 * T).exp()
        Q = r0 * r0 + (1 - r0 * r0) * e2
        rT = r0 / Q.sqrt()
        zT = z0 * (a * T).exp()
        D = r0 * r0 * (2 * T).exp() + 1 - r0 * r0
        gT = 1 + b * r0 * r0 * (2 * T).exp() / D
        gr = b * r0 * ((2 * T).exp() - 1) / D
        Tp = -gr / gT                                   # dT/dr0
        drdr0 = e2 / Q ** arb(1.5)                      # d r(T; r0) / d r0 at fixed T
        drdT = r0 * (1 - r0 * r0) * e2 / Q ** arb(1.5)  # d r(T; r0) / d T
        DP = [[drdr0 + drdT * Tp, arb(0)], [z0 * a * (a * T).exp() * Tp, (a * T).exp()]]
        return T, (rT, zT), DP


class Quad:
    dim = 1
    names = ('x',)

    def __init__(self, q=1):
        self.q = arb(q)

    def series(self, x0, N, jac=False):
        x = [x0[0]]
        xs = [[x0[0]]]
        Dfs = []
        for k in range(N):
            fx = self.q * _conv(x, x, k)
            if jac:
                A = arb_mat(1, 1)
                A[0, 0] = 2 * self.q * x[k]
                Dfs.append(A)
            x.append(fx / (k + 1))
            xs.append([x[k + 1]])
        return xs, Dfs

    def f(self, x):
        return self.series(x, 1)[0][1]


class PsiDecay:
    """u' = -Psi(u) using the same composition machinery as the HH rate functions."""
    dim = 1
    names = ('u',)

    def __init__(self, sign=-1):
        self.sign = arb(sign)
        self.facs = _fac_list(80)

    def series(self, x0, N, jac=False):
        u0 = x0[0]
        deg = N if jac else max(N - 1, 0)
        q = recip_series(E_taylor(u0, deg, self.facs))       # Psi(u0 + D) = sum q_j D^j
        dq = [q[j + 1] * (j + 1) for j in range(deg)] if jac else None
        u = [u0]
        P = {}
        xs = [[u0]]
        Dfs = []
        for k in range(N):
            if k >= 1:
                P[(1, k)] = u[k]
                for j in range(2, k + 1):
                    s = u[1] * P[(j - 1, k - 1)]
                    for i in range(2, k - j + 2):
                        s += u[i] * P[(j - 1, k - i)]
                    P[(j, k)] = s

            def comp(r):
                if k == 0:
                    return r[0]
                s = r[1] * P[(1, k)]
                for j in range(2, k + 1):
                    s += r[j] * P[(j, k)]
                return s
            fu = self.sign * comp(q)
            if jac:
                A = arb_mat(1, 1)
                A[0, 0] = self.sign * comp(dq)
                Dfs.append(A)
            u.append(fu / (k + 1))
            xs.append([u[k + 1]])
        return xs, Dfs

    def f(self, x):
        return self.series(x, 1)[0][1]


def Ein(u):
    """Ein(u) = u 2F2(1,1;2,2;u), rigorous (arb)."""
    return u * u.hypgeom([1, 1], [2, 2])
