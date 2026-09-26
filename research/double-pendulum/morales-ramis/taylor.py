"""Complex-time Taylor integrator (numerical, high precision) for the double pendulum and its
variational equation, built on python-flint acb_series. Ball radii are carried along but the
Taylor truncation error is NOT bounded here: this module is numerical. See rigorous.py."""
import math
from flint import acb, acb_series, arb, ctx
from field import make_numeric


def horner(coeffs, z):
    r = acb(0)
    for c in reversed(coeffs):
        r = r * z + c
    return r


class Integrator:
    def __init__(self, gval=1, order=60, prec=256, frac=0.25, strip=True):
        self.strip = strip
        ctx.prec = prec
        ctx.cap = max(ctx.cap, order + 8)
        self.fj, _ = make_numeric(acb(gval))
        self.N = order
        self.frac = frac
        self.nsteps = 0

    def series(self, x0, X0, var=True):
        """Taylor coefficients (lists) of x(t0 + tau) and Xi(t0 + tau), Xi(t0) = X0."""
        N = self.N
        x = [acb_series([c], prec=1) for c in x0]
        X = [[acb_series([X0[i][j]], prec=1) for j in range(4)] for i in range(4)] if var else None
        for k in range(1, N):
            L = k + 1
            xs = [acb_series(s.coeffs(), prec=L) for s in x]
            f, A = self.fj(xs)
            if var:
                Xs = [[acb_series(X[i][j].coeffs(), prec=L) for j in range(4)] for i in range(4)]
                AX = [[sum((A[i][m] * Xs[m][j] for m in range(4)), acb_series([0], prec=L))
                       for j in range(4)] for i in range(4)]
                X = [[X0[i][j] + AX[i][j].integral() for j in range(4)] for i in range(4)]
            x = [x0[i] + (f[i] if isinstance(f[i], acb_series) else acb_series([f[i]], prec=L)).integral()
                 for i in range(4)]
        xc = [_pad(s.coeffs()[:N], N) for s in x]
        Xc = [[_pad(X[i][j].coeffs()[:N], N) for j in range(4)] for i in range(4)] if var else None
        return xc, Xc

    def radius(self, xc):
        N = self.N
        r = float('inf')
        for c in xc:
            for k in (N - 1, N - 2, N - 3):
                a = abs(complex(c[k].mid()))
                if a > 0:
                    r = min(r, a ** (-1.0 / k))
        return r

    def segment(self, t0, t1, x, X, var=True, hmax=0.1, log=None):
        """Integrate from t0 to t1 along the straight segment (complex times as python complex
        or acb). Returns x, X at t1."""
        t0 = acb(t0); t1 = acb(t1)
        total = t1 - t0
        L = abs(complex(total.mid()))
        u = total / L if L > 0 else acb(1)
        s = 0.0
        tcur = t0
        while s < L * (1 - 1e-15):
            xc, Xc = self.series(x, X, var)
            r = self.radius(xc)
            h = min(self.frac * r, hmax, L - s)
            last = not (L - s > h * (1 + 1e-12))
            dt = (t1 - tcur) if last else u * arb(h)
            x = [horner(c, dt) for c in xc]
            if var:
                X = [[horner(Xc[i][j], dt) for j in range(4)] for i in range(4)]
            if self.strip:
                x = [v.mid() for v in x]
                if var:
                    X = [[v.mid() for v in row] for row in X]
            tcur = t1 if last else tcur + dt
            s = L if last else s + h
            self.nsteps += 1
            if log is not None:
                log.append((complex(tcur.mid()), r, [complex(v.mid()) for v in x]))
        return x, X

    def path(self, pts, x, X, var=True, hmax=0.1, log=None):
        for a, b in zip(pts[:-1], pts[1:]):
            x, X = self.segment(a, b, x, X, var, hmax, log)
        return x, X


def _pad(c, N):
    c = list(c)
    return c + [acb(0)] * (N - len(c))


def identity():
    return [[acb(1 if i == j else 0) for j in range(4)] for i in range(4)]


def energy(x, g=1):
    a1, a2, v1, v2 = x
    return v1 * v1 + v1 * v2 * (a1 - a2).cos() + v2 * v2 / 2 - 2 * g * a1.cos() - g * a2.cos()
