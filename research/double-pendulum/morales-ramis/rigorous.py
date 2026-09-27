"""Validated complex-time integration of the double pendulum (Salnikov's Lagrangian, g = 1) and of its
variational equation, in ball arithmetic (python-flint / Arb).

The integrator actually used is RigDisk (mean-value form with disk radii, see its docstring).
Propagating the balls naively through the Taylor recursion (first attempt) and keeping errors as
complex rectangles (second attempt) both lost all accuracy near the branch point (rectangles grow by
up to sqrt(2) per complex multiplication); both were removed.

One step from t_n (exact or ball time) with state ball x_n and fundamental-matrix ball Xi_n:

  1. A priori enclosure. Pick rho > 0 and a componentwise radius beta. Let B be the box
     x_n + [-beta, beta] + i[-beta, beta]. Evaluate F on B in ball arithmetic: |F_i| <= K_i on B.
     If rho K_i < beta_i for all i, then for every start point xi in x_n the solution exists on the
     closed disk |tau| <= rho and stays in xi + disk(rho K) inside B (along each ray tau = s u,
     |x(s u) - xi| <= s K while x stays in B, so x cannot reach the boundary of B before s = rho;
     F is analytic on B because the ball evaluation of 1/D there is finite).
     With alpha >= max_i sum_j |A_ij| on B (A = DF), every column xi of the fundamental matrix
     satisfies |xi(tau)|_inf <= |xi_n|_inf exp(alpha |tau|) (Gronwall on rays), hence
     |xi(tau) - xi_n|_inf <= |xi_n|_inf (exp(alpha rho) - 1) on the disk.
  2. Taylor coefficients of order < N of x and Xi at t_n, in ball arithmetic (truncated Picard
     iteration with Arb power series; coefficient k is an exact polynomial expression of the
     lower ones, so the balls enclose the true coefficients for every start in the balls).
  3. Cauchy estimate on the disk of radius rho: the remainder at dt with |dt| <= qq rho is at most
     M qq^N / (1 - qq), with M = rho K_i for x_i and M = |xi_n| (exp(alpha rho) - 1) for Xi.

All enclosure checks are arb comparisons, which return True only when they are certain. Step sizes
and radii are chosen from floating-point heuristics; that affects efficiency, not validity.
"""
import sys, time
from flint import acb, arb, acb_series, ctx
from field import make_numeric
from taylor import Integrator, horner


def box(z, beta):
    """acb box containing the ball z enlarged by beta (arb, exact) in real and imaginary parts"""
    return acb(z.real + arb(0, 1) * beta, z.imag + arb(0, 1) * beta)


def err(e):
    """acb ball centred at 0 containing the closed disk of radius e (e an arb upper bound)"""
    r = arb(0, 1) * e
    return acb(r, r)


class Rig:
    """Common part: Taylor coefficients (Integrator.series, ball arithmetic) and the a priori
    enclosure of step 1. The stepping is done by RigDisk below."""

    def __init__(self, g='1', N=30, prec=128, q=0.25):
        self.I = Integrator(gval=g, order=N, prec=prec, frac=0.3, strip=False)
        self.fj = self.I.fj
        self.N, self.q = N, q
        self.nsteps = 0
        self.maxtail = arb(0)

    def apriori(self, x, rho):
        rho = arb(rho)
        f0, _ = self.fj(x)
        beta = [2 * rho * abs(acb(v)).upper() + arb('1e-20') for v in f0]
        for _ in range(12):
            B = [box(x[i], beta[i]) for i in range(4)]
            try:
                f, A = self.fj(B)
            except Exception:
                return None
            K = [abs(acb(v)).upper() for v in f]
            if not all(k.is_finite() for k in K):
                return None
            if all(rho * K[i] < beta[i] for i in range(4)):
                alpha = arb(0)
                for i in range(4):
                    alpha = alpha.max(sum((abs(acb(A[i][j])).upper() for j in range(4)), arb(0)))
                alpha = alpha.upper()
                if not alpha.is_finite():
                    return None
                return K, alpha
            beta = [2 * rho * K[i] + arb('1e-20') for i in range(4)]
        return None


def matmul(A, B):
    return [[sum((A[i][k] * B[k][j] for k in range(4)), acb(0)) for j in range(4)] for i in range(4)]


def matvec(A, v):
    return [sum((A[i][k] * v[k] for k in range(4)), acb(0)) for i in range(4)]


def up(z):
    """certified upper bound (exact arb) of |z| for an acb ball z"""
    return abs(z).upper()


class RigDisk(Rig):
    """Mean-value form with disk radii. Errors are kept as disk radii (real upper bounds), never as complex
    rectangles, so that repeated complex multiplications do not inflate them by sqrt(2):
      x in xh + disk(s_i) componentwise;  Xi in Xh + disk(E_ij) entrywise.
    Update:  s'_i = |phi_i - xh'_i| + sum_j |J_ij| s_j,
             Xi' = J Xi  in  Jh Xh + disk(|Jh Xh - Xh'| + |Jh| E + dJ (|Xh| + E)),
    with Jh = mid(J), dJ_ij = |J_ij - Jh_ij|, all absolute values rounded up."""

    def step_disk(self, xh, s, Xh, E, tcur, t1, u, hmax):
        full = [xh[i] + err(s[i]) for i in range(4)]
        xm = [v.mid() for v in xh]
        xc, _ = self.I.series(xm, None, var=False)
        r = self.I.radius(xc)
        rho = min(r / 2, hmax / self.q)
        while True:
            ab = self.apriori(full, rho)
            if ab is not None and ab[1] * arb(rho) < 1:
                break
            rho /= 2
            if rho < 1e-12:
                raise RuntimeError('a priori enclosure failed at t = %s, max s = %s' % (tcur, max(float(v.mid()) for v in s)))
        K, alpha = ab
        rem = abs(t1 - tcur)
        h = self.q * rho
        last = bool(rem.upper() < arb(h) * arb('1.000001'))
        dt = (t1 - tcur) if last else u * arb(h)
        qq = (abs(dt).upper() / arb(rho)).upper()
        assert qq < 1
        fac = qq ** self.N / (1 - qq)
        xc, _ = self.I.series(xh, None, var=False)
        phi = []
        for i in range(4):
            tail = (arb(rho) * K[i] * fac).upper()
            self.maxtail = self.maxtail.max(tail).upper()
            phi.append(horner(xc[i], dt) + err(tail))
        from taylor import identity
        _, Jc = self.I.series(full, identity(), var=True)
        jtail = (((alpha * arb(rho)).exp() - 1) * fac).upper()
        J = [[horner(Jc[i][j], dt) + err(jtail) for j in range(4)] for i in range(4)]
        xh_new = [v.mid() for v in phi]
        s_new = [(up(phi[i] - xh_new[i]) + sum((up(J[i][j]) * s[j] for j in range(4)), arb(0))).upper()
                 for i in range(4)]
        Jh = [[J[i][j].mid() for j in range(4)] for i in range(4)]
        dJ = [[up(J[i][j] - Jh[i][j]) for j in range(4)] for i in range(4)]
        P = matmul(Jh, Xh)
        Xh_new = [[P[i][j].mid() for j in range(4)] for i in range(4)]
        E_new = [[(up(P[i][j] - Xh_new[i][j])
                   + sum((up(Jh[i][k]) * E[k][j] + dJ[i][k] * (up(Xh[k][j]) + E[k][j]) for k in range(4)), arb(0))).upper()
                  for j in range(4)] for i in range(4)]
        tnew = t1 if last else tcur + dt
        self.nsteps += 1
        return xh_new, s_new, Xh_new, E_new, tnew, last

    def path_disk(self, pts, xh, s, Xh, E, hmax=0.05, verbose=False):
        for a, b in zip(pts[:-1], pts[1:]):
            t = time.time()
            u = (b - a) / abs(b - a)
            tcur = a
            while True:
                xh, s, Xh, E, tcur, last = self.step_disk(xh, s, Xh, E, tcur, b, u, hmax)
                if last:
                    break
            if verbose:
                print('  segment %s -> %s: steps %d, max s %.2e, max E %.2e (%.0f s)' % (
                    complex(a.mid()), complex(b.mid()), self.nsteps, max(float(v.mid()) for v in s),
                    max(float(e.mid()) for row in E for e in row), time.time() - t), flush=True)
        return xh, s, Xh, E
