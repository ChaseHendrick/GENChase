"""A C^0/C^1 Lohner-type Taylor integrator and Poincare map in python-flint arb.

Set representation (doubleton, Zgliczynski 2002, "C^1 Lohner algorithm", Found. Comput. Math. 2):

    x = xbar + C r0 + B r,

xbar an exact point, C and B exact point matrices, r0 a fixed interval vector and r an interval
vector.  The derivative of the flow with respect to the initial condition is kept as

    V = Vbar + BV RV            (column-wise Lohner representation of a set of matrices).

One step of size h (Taylor order p):

 1. X = hull(xbar + C r0 + B r).
 2. Taylor coefficients x_k(xbar) (thin point), x_k(X) and the coefficients A_k(X) of the
    variational equation V' = Df(x(t)) V, V(0) = I, by automatic differentiation (A_k(X) encloses
    D_x x_k over X).
 3. A priori (rough) enclosure Y of phi([0,h], X) by the high-order test
        sum_{k<=p} x_k(X) [0,h]^k + [0,h^{p+1}] x_{p+1}(Y)  subset of  int Y
    (Corliss and Rihm 1996; a continuation argument on the Lagrange form of the Taylor remainder).
    In C^1 mode also YV, an enclosure of D phi_s(x0), s in [0,h], by
        sum_{k<=p} A_k(X) [0,h]^k + [0,h^{p+1}] A_{p+1}(Y) YV  subset of  int YV,
    which holds because d^{k}/ds^{k} D phi_s(x0) / k! = A_k(phi_s(x0)) D phi_s(x0).
 4. phi_s(x0) in Phi(xbar, s) + x_{p+1}(Y) s^{p+1} + M(s)(x0 - xbar),  M(s) = sum_k A_k(X) s^k,
    D phi_s(x0) in N(s) = M(s) + A_{p+1}(Y) YV s^{p+1}, for every 0 <= s <= h.
 5. Lohner update with QR (column-pivoted by the widths of r) to control wrapping.

All inclusions are verified with ball arithmetic; the floating-point QR only chooses the
coordinate frame B, whose inverse is enclosed rigorously by arb_mat.inv().
"""
import math
import numpy as np
from flint import arb, arb_mat, ctx


# ------------------------------------------------------------------ small helpers ---------
def col(vals):
    return arb_mat(len(vals), 1, list(vals))


def colvals(M):
    return [M[i, 0] for i in range(M.nrows())]


def ident(d):
    M = arb_mat(d, d)
    for i in range(d):
        M[i, i] = arb(1)
    return M


def to_np(M):
    return np.array([[float(M[i, j].mid()) for j in range(M.ncols())] for i in range(M.nrows())])


def from_np(A):
    A = np.atleast_2d(np.asarray(A, dtype=float))
    return arb_mat([[float(v) for v in row] for row in A])


def zero_to(x):
    """Ball containing [0, x] for a nonnegative ball x."""
    return arb(0).union(x)


def rad(x):
    return float(x.rad())


def width_col(M):
    return np.array([2 * float(M[i, 0].rad()) for i in range(M.nrows())])


def mat_contains_interior(Y, Z):
    for i in range(Y.nrows()):
        for j in range(Y.ncols()):
            if not Y[i, j].contains_interior(Z[i, j]):
                return False
    return True


def inflate(x, rel, absol):
    """Enlarge a ball: radius -> radius*(1+rel) + absol*max(1,|mid|)."""
    r = float(x.rad()) * rel + absol * max(1.0, abs(float(x.mid())))
    return x + arb(0, r)


def inflate_mat(M, rel, absol):
    out = arb_mat(M.nrows(), M.ncols())
    for i in range(M.nrows()):
        for j in range(M.ncols()):
            out[i, j] = inflate(M[i, j], rel, absol)
    return out


def horner_vec(coeffs, s):
    """sum_k coeffs[k] s^k for column vectors (arb_mat) and an arb s."""
    P = coeffs[-1]
    for k in range(len(coeffs) - 2, -1, -1):
        P = P * s + coeffs[k]
    return P


def taylor_A(Dfs, N, d):
    """Coefficients A_0..A_N of the solution of V' = Df(x(t)) V, V(0)=I, from Df_0..Df_{N-1}."""
    A = [ident(d)]
    for k in range(N):
        S = Dfs[0] * A[k]
        for i in range(1, k + 1):
            S = S + Dfs[i] * A[k - i]
        A.append(S * (arb(1) / (k + 1)))
    return A


def qr_frame(Amid, widths):
    """Orthogonal frame from a column-pivoted QR of Amid * diag(widths)."""
    d = Amid.shape[0]
    w = np.where(widths > 0, widths, 0.0)
    norms = np.linalg.norm(Amid, axis=0) * w
    perm = np.argsort(-norms, kind='stable')
    Q, _ = np.linalg.qr(Amid[:, perm])
    return Q


class EnclosureFailure(RuntimeError):
    pass


def apriori_ok(system, Ybase, Y, Ip1, p, jac=False):
    """High-order a priori enclosure test.

    Ybase = sum_{k<=p} x_k(X) [0,h]^k (an interval vector), Y a candidate box, Ip1 = [0, h^{p+1}].
    If Ybase + Ip1 * x_{p+1}(Y) lies in the interior of Y then phi([0,h], X) is contained in Y.
    Returns (ok, x-series over Y, Df-series over Y, the tested vector).
    """
    try:
        xs_Y_l, Df_Y = system.series(colvals(Y), p + 1, jac=jac)
    except ZeroDivisionError:
        return False, None, None, Y
    cand = Ybase + col(xs_Y_l[p + 1]) * Ip1
    ok = all(Y[i, 0].contains_interior(cand[i, 0]) for i in range(Y.nrows()))
    for i in range(Y.nrows()):
        if not cand[i, 0].is_finite():
            ok = False
    return ok, xs_Y_l, Df_Y, cand


def ybase(xs_X, h, p):
    """sum_{k<=p} x_k(X) [0,h]^k."""
    hk = arb(1)
    Yb = xs_X[0]
    for k in range(1, p + 1):
        hk = hk * h
        Yb = Yb + xs_X[k] * zero_to(hk)
    return Yb


# ------------------------------------------------------------------ sets ------------------
class LSet:
    def __init__(self, t, xbar, C, r0, B, r, Vbar=None, BV=None, RV=None):
        self.t = t
        self.xbar, self.C, self.r0, self.B, self.r = xbar, C, r0, B, r
        self.Vbar, self.BV, self.RV = Vbar, BV, RV

    @property
    def d(self):
        return self.xbar.nrows()

    def hull(self):
        return self.xbar + self.C * self.r0 + self.B * self.r

    def Vhull(self):
        return self.Vbar + self.BV * self.RV

    @staticmethod
    def from_box(t, center, C, r0, C1=False):
        """x = center + C r0 with an exact center (list of floats/arb) and exact C (numpy)."""
        xbar = col([arb(v) for v in center])
        for i in range(xbar.nrows()):
            if xbar[i, 0].rad() != 0:
                raise ValueError('center must be exact')
        d = xbar.nrows()
        Cm = from_np(C)
        r0m = col(r0)
        B = ident(d)
        r = arb_mat(d, 1)
        if C1:
            return LSet(arb(t), xbar, Cm, r0m, B, r, ident(d), ident(d), arb_mat(d, d))
        return LSet(arb(t), xbar, Cm, r0m, B, r)


class StepData:
    """Everything needed to enclose phi_s and D phi_s for 0 <= s <= h from one step."""

    def __init__(self, S, p, xs_bar, A_X, rem_coeff, Y, h, AY=None, YV=None, fY=None):
        self.S, self.p, self.xs_bar, self.A_X = S, p, xs_bar, A_X
        self.rem_coeff, self.Y, self.h, self.AY, self.YV, self.fY = rem_coeff, Y, h, AY, YV, fY

    def M(self, s):
        return horner_vec(self.A_X, s)

    def affine(self, s):
        """phi_s(x0) in a + G0 r0 + G1 r for all x0 in the set (0 <= s <= h)."""
        a = horner_vec(self.xs_bar, s) + self.rem_coeff * s ** (self.p + 1)
        M = self.M(s)
        return a, M * self.S.C, M * self.S.B, M

    def enclose(self, s):
        a, G0, G1, _ = self.affine(s)
        return a + G0 * self.S.r0 + G1 * self.S.r

    def N(self, s, M=None):
        if M is None:
            M = self.M(s)
        return M + self.AY * self.YV * s ** (self.p + 1)


# ------------------------------------------------------------------ integrator ------------
class Integrator:
    def __init__(self, system, order=20, tol=1e-20, hmax=1.0, C1=False, scale=None,
                 tol_rem=None, rem_rel=0.0, remainder_factor=1.0, skip_rough_check=False,
                 verbose=False, project=False):
        self.sys = system
        self.p = order
        self.tol = tol
        self.tol_rem = tol_rem if tol_rem is not None else tol * 1e3
        self.rem_rel = rem_rel
        # C^1 mode, optional (off by default): propagate W_t = Pi_t D phi_t with
        # Pi_t = I - f(x_t) l^T / (l . f(x_t)) instead of D phi_t (see advance()); this does not change
        # the derivative of any Poincare map.  Measured on HH it does NOT tighten the enclosures (the
        # width of f over the set enters Pi without a factor h), so it is not used for the proofs.
        self.project = project
        self.hmax = hmax
        self.C1 = C1
        self.scale = scale
        self.verbose = verbose
        # the two knobs below exist ONLY for negative-control tests; the default values are the
        # rigorous ones.  remainder_factor < 1 scales the Lagrange remainder down (unsound) and
        # skip_rough_check skips the a priori enclosure test (unsound).
        self.remainder_factor = remainder_factor
        self.skip_rough_check = skip_rough_check
        self.stats = {'steps': 0, 'rough_retries': 0, 'h_halvings': 0, 'rem_shrinks': 0}

    def _scale(self, x, i):
        return self.scale[i] if self.scale is not None else max(1.0, abs(float(x.mid())))

    def rem_worst(self, sd, prep, h, rel=None):
        """Largest remainder bound relative to the accepted tolerance (<= 1 means accept).

        The tolerance per component is max(tol_rem * scale, rem_rel * width of the set): a
        remainder far below the width of the set being propagated costs nothing.
        """
        hp = arb(h) ** (self.p + 1)
        worst = 0.0
        X = prep['X']
        rel = self.rem_rel if rel is None else rel
        for i in range(sd.S.d):
            R = sd.rem_coeff[i, 0] * hp
            rr = float(R.rad()) + abs(float(R.mid()))
            tol_i = max(self.tol_rem * self._scale(X[i, 0], i), rel * 2 * float(X[i, 0].rad()))
            worst = max(worst, rr / tol_i)
        return worst

    def enclose_controlled(self, S, prep, h):
        """enclose() with step-size control on the rigorous remainder bound; returns (sd, h)."""
        if getattr(self, 'h_last', None) is not None:
            h = min(h, 1.3 * self.h_last)
        for tries in range(12):
            try:
                sd = self.enclose(S, prep, arb(h))
            except EnclosureFailure:
                h *= 0.5
                self.stats['h_halvings'] += 1
                continue
            worst = self.rem_worst(sd, prep, h)
            if worst <= 1.0:
                self.h_last = h
                return sd, h
            self.stats['rem_shrinks'] += 1
            h *= min(0.9, 0.95 * (1.0 / worst) ** (1.0 / (self.p + 1)))
        raise EnclosureFailure('step size control failed')

    # -- phase 1: Taylor data that does not depend on h
    def prepare(self, S):
        X = S.hull()
        xl = colvals(X)
        xs_bar_l, _ = self.sys.series(colvals(S.xbar), self.p)
        xs_X_l, Df_X = self.sys.series(xl, self.p, jac=True)
        A_X = taylor_A(Df_X, self.p, S.d)
        xs_bar = [col(v) for v in xs_bar_l]
        xs_X = [col(v) for v in xs_X_l]
        return {'X': X, 'xs_bar': xs_bar, 'xs_X': xs_X, 'A_X': A_X, 'xs_bar_l': xs_bar_l}

    def suggest_h(self, prep):
        xs = prep['xs_bar_l']
        p = self.p
        d = len(xs[0])
        h = self.hmax
        for i in range(d):
            sc = self.scale[i] if self.scale is not None else max(1.0, abs(float(xs[0][i].mid())))
            for k in (p - 1, p):
                c = abs(float(xs[k][i].mid())) + float(xs[k][i].rad())
                if c > 0:
                    h = min(h, (self.tol * sc / c) ** (1.0 / k))
        return 0.9 * h

    # -- phase 2: rough enclosure and remainder for a given h
    def enclose(self, S, prep, h):
        p = self.p
        d = S.d
        hk = [arb(1)]
        for k in range(1, p + 2):
            hk.append(hk[-1] * h)
        I = [arb(1)] + [zero_to(hk[k]) for k in range(1, p + 2)]
        xs_X = prep['xs_X']
        Ybase = xs_X[0]
        for k in range(1, p + 1):
            Ybase = Ybase + xs_X[k] * I[k]
        if self.skip_rough_check:
            Y = Ybase
            xs_Y_l, Df_Y = self.sys.series(colvals(Y), p + 1, jac=self.C1)
        else:
            Y = col([inflate(Ybase[i, 0], 0.05, 1e-14) for i in range(d)])
            ok = False
            for attempt in range(3):
                ok, xs_Y_l, Df_Y, cand = apriori_ok(self.sys, Ybase, Y, I[p + 1], p, self.C1)
                if ok:
                    break
                self.stats['rough_retries'] += 1
                Y = col([inflate(Y[i, 0].union(cand[i, 0]), 1.0, 1e-12) for i in range(d)])
            if not ok:
                raise EnclosureFailure('a priori enclosure not verified')
        rem_coeff = col(xs_Y_l[p + 1])
        if self.remainder_factor != 1.0:
            rem_coeff = rem_coeff * arb(self.remainder_factor)
        fY = col(xs_Y_l[1])
        AY = YV = None
        if self.C1:
            A_Y = taylor_A(Df_Y, p + 1, d)
            AY = A_Y[p + 1]
            A_X = prep['A_X']
            YVb = A_X[0]
            for k in range(1, p + 1):
                YVb = YVb + A_X[k] * I[k]
            YV = inflate_mat(YVb, 0.05, 1e-14)
            ok = False
            for attempt in range(6):
                cand = YVb + AY * YV * I[p + 1]
                if mat_contains_interior(YV, cand):
                    ok = True
                    break
                self.stats['rough_retries'] += 1
                U = arb_mat(d, d)
                for i in range(d):
                    for j in range(d):
                        U[i, j] = inflate(YV[i, j].union(cand[i, j]), 1.0, 1e-12)
                YV = U
            if not ok:
                raise EnclosureFailure('a priori enclosure of the variational equation not verified')
        return StepData(S, p, prep['xs_bar'], prep['A_X'], rem_coeff, Y, h, AY, YV, fY)

    # -- phase 3: Lohner update to time s (0 < s <= h)
    def advance(self, sd, s):
        S = sd.S
        a, G0, G1, M = sd.affine(s)
        Mbar = M.mid()
        H = S.C * S.r0 + S.B * S.r
        MC = Mbar * S.C
        Cn = MC.mid()
        A = Mbar * S.B
        Z = a + (M - Mbar) * H + (MC - Cn) * S.r0
        xbar_n = Z.mid()
        z = Z - xbar_n
        Q = qr_frame(to_np(A), width_col(S.r))
        Bn = from_np(Q)
        Binv = Bn.inv()
        rn = (Binv * A) * S.r + Binv * z
        Vbar_n = BVn = RVn = None
        if self.C1:
            Nm = sd.N(s, M)
            if self.project:
                # Projected variational equation.  For every x0,
                #   Pi(x_{t+s}) D phi_s(x_t) f(x_t) = Pi(x_{t+s}) f(x_{t+s}) = 0,
                # hence Pi_T D phi_T = Pi_T D phi_{T<-t} Pi_t D phi_t for any such projections, and the
                # derivative of a Poincare map, Pi(P) D phi_tau, is unchanged when D phi is replaced by
                # W_t = Pi_t D phi_t.  W stays of the size of the transverse dynamics, whereas D phi
                # carries the (large) time-shift component along f, whose interval enclosure does not
                # cancel.  Pi is evaluated with f over the hull at time t+s, which contains x_{t+s}(x0).
                Xn = xbar_n + Cn * S.r0 + Bn * rn
                fX = col(self.sys.f(colvals(Xn)))
                d = S.d
                sc = [self._scale(Xn[i, 0], i) for i in range(d)]
                ell = [float(fX[i, 0].mid()) / sc[i] ** 2 for i in range(d)]
                den = arb(0)
                for i in range(d):
                    den = den + arb(ell[i]) * fX[i, 0]
                if (den > 0) or (den < 0):
                    Pi = ident(d)
                    for i in range(d):
                        for j in range(d):
                            if ell[j] != 0.0:
                                Pi[i, j] = Pi[i, j] - fX[i, 0] * arb(ell[j]) / den
                    Nm = Pi * Nm
            Nbar = Nm.mid()
            Vh = S.Vhull()
            ZV = Nbar * S.Vbar + (Nm - Nbar) * Vh
            Vbar_n = ZV.mid()
            zV = ZV - Vbar_n
            AV = Nbar * S.BV
            wr = np.array([max(2 * float(S.RV[i, j].rad()) for j in range(S.d)) for i in range(S.d)])
            QV = qr_frame(to_np(AV), wr)
            BVn = from_np(QV)
            BVinv = BVn.inv()
            RVn = (BVinv * AV) * S.RV + BVinv * zV
        return LSet(S.t + s, xbar_n, Cn, S.r0, Bn, rn, Vbar_n, BVn, RVn)

    def step(self, S, h=None):
        prep = self.prepare(S)
        if h is None:
            h = self.suggest_h(prep)
        sd, h = self.enclose_controlled(S, prep, h)
        self.stats['steps'] += 1
        return self.advance(sd, arb(h)), sd

    def integrate(self, S, T):
        """Integrate the set S to the absolute time T (float); the last step is shortened."""
        T = arb(T)
        while True:
            remaining = T - S.t
            if not (remaining > 0):
                break
            prep = self.prepare(S)
            h = self.suggest_h(prep)
            sd, h = self.enclose_controlled(S, prep, h)
            last = False
            if remaining.upper() <= arb(h):
                last = True
                hb = remaining
            else:
                hb = arb(h)
            S = self.advance(sd, hb)
            self.stats['steps'] += 1
            if last:
                break
        return S


# ------------------------------------------------------------------ Poincare map ----------
class PoincareFailure(RuntimeError):
    pass


def _poly_root(coeffs, c, h):
    """Float root in [0, h] where sum coeffs[k] s^k - c changes sign from < 0 to >= 0, or None."""
    pc = np.array(coeffs[::-1], dtype=float)
    pc[-1] -= c
    g = lambda s: np.polyval(pc, s)
    ss = np.linspace(0.0, h, 65)
    vals = g(ss)
    for i in range(64):
        if vals[i] < 0 <= vals[i + 1]:
            lo, hi = ss[i], ss[i + 1]
            for _ in range(200):
                mid = 0.5 * (lo + hi)
                if g(mid) < 0:
                    lo = mid
                else:
                    hi = mid
                if hi - lo <= 1e-17 * max(1.0, hi):
                    break
            return 0.5 * (lo + hi)
    return None


class Section:
    """The hyperplane {x[idx] = c}, crossed in the direction sgn * x[idx]' > 0 (sgn = +1 or -1)."""

    def __init__(self, idx, c, sgn=1):
        self.idx, self.c, self.sgn = idx, float(c), int(sgn)
        self.cc = arb(c)

    def g(self, v):
        """Signed distance sgn*(v - c) for a ball v."""
        return (v - self.cc) if self.sgn > 0 else (self.cc - v)

    def gdot(self, fv):
        return fv if self.sgn > 0 else -fv

    def __repr__(self):
        return 'Section(x[%d] = %g, %s)' % (self.idx, self.c, 'increasing' if self.sgn > 0 else 'decreasing')


class _Monitor:
    """Bookkeeping that proves a section is NOT crossed in its direction during a run."""

    def __init__(self, sec, X0):
        self.sec = sec
        g0 = sec.g(X0[sec.idx, 0])
        self.phase = 'departing' if g0.contains(0) else 'free'

    def check(self, sd, X_start, X_end):
        sec = self.sec
        gY = sec.g(sd.Y[sec.idx, 0])
        gd = sec.gdot(sd.fY[sec.idx, 0])
        if self.phase == 'departing':
            if not (gd > 0):
                return False
            if sec.g(X_end[sec.idx, 0]) > 0:
                self.phase = 'free'
            return True
        if not gY.contains(0):
            return True
        if gd < 0:
            return True
        if gd > 0 and sec.g(X_start[sec.idx, 0]) > 0:
            return True
        return False


class SectionMismatch(PoincareFailure):
    """The initial set does not lie exactly on the section it is declared to start on."""


def check_on_section(S, sec):
    """Raise SectionMismatch unless every point of the set S has x[sec.idx] equal to sec.c exactly.

    The section level must be an exact number and the section coordinate of the hull of S must be the
    same exact number (radius 0).  A first-return map whose initial set lies on u = 20 while the crossing
    is detected on u = 19.999 is a map between two different sections, and a fixed point of it is not a
    periodic orbit; this check makes that mistake impossible rather than merely unlikely.
    """
    x = S.hull()[sec.idx, 0]
    if not (sec.cc.rad() == 0 and x.rad() == 0 and x == sec.cc):
        raise SectionMismatch('initial set is not on the section %r: x[%d] = %s, level %s'
                              % (sec, sec.idx, x.str(20, radius=True), sec.cc.str(20, radius=True)))


def poincare(integ, S, sec, c=None, monitors=(), tmax=200.0, maxsteps=100000, log=None, start_on=None):
    """First hit of the section `sec` (a Section, or an index with c given: x[idx] = c increasing).

    The initial set must lie exactly on a section: on `sec` itself (a first-return map, the default) or
    on `start_on` (a section-to-section map); otherwise SectionMismatch is raised before integrating.

    Encloses, for every x0 in the set S, the hitting time tau(x0), the hitting point
    P(x0) = phi(tau(x0), x0) and, in C^1 mode, (I - f(P) e_idx^T / f_idx(P)) D phi_tau(x0).

    First-hit certification: every step whose a priori enclosure Y meets the section has
    sgn*f_idx of one sign on Y; a step with sgn*f_idx < 0 is a pass in the other direction;
    the only step with sgn*f_idx > 0 on a Y meeting the section is the final crossing step (or a
    departure step while the set still lies on the section).  Every Section in `monitors` is
    certified not to be crossed in its own direction before the hit (used to prove that a
    composition of section-to-section maps is a first return).
    """
    if not isinstance(sec, Section):
        sec = Section(sec, c, 1)
    check_on_section(S, sec if start_on is None else start_on)
    idx = sec.idx
    d = S.d
    X0 = S.hull()
    g0 = sec.g(X0[idx, 0])
    phase = 'departing' if g0.contains(0) else 'free'
    mons = [_Monitor(m, X0) for m in monitors]
    nsteps = 0
    passes = 0
    # extremes[i] = [outer_min, outer_max, inner_max_of_lower, inner_min_of_upper]:
    # every trajectory from S stays in [outer_min, outer_max] up to the hit, and attains values
    # >= inner_max_of_lower and <= inner_min_of_upper (at step times).
    extremes = [[None, None, None, None] for _ in range(d)]

    def note(X, Y=None):
        for i in range(d):
            e = extremes[i]
            lo, hi = X[i, 0].lower(), X[i, 0].upper()
            e[2] = lo if e[2] is None else (lo if lo > e[2] else e[2])
            e[3] = hi if e[3] is None else (hi if hi < e[3] else e[3])
            src = Y if Y is not None else X
            lo, hi = src[i, 0].lower(), src[i, 0].upper()
            e[0] = lo if e[0] is None else (lo if lo < e[0] else e[0])
            e[1] = hi if e[1] is None else (hi if hi > e[1] else e[1])

    def monitors_ok(sd, X_start, X_end):
        for m in mons:
            if not m.check(sd, X_start, X_end):
                raise PoincareFailure('monitored section %r may be crossed' % (m.sec,))

    while True:
        if float(S.t.mid()) > tmax or nsteps > maxsteps:
            raise PoincareFailure('no hit before tmax')
        prep = integ.prepare(S)
        Xs = prep['X']
        h = integ.suggest_h(prep)
        committed = False
        for attempt in range(12):
            try:
                sd, h = integ.enclose_controlled(S, prep, h)
            except EnclosureFailure:
                raise PoincareFailure('enclosure failed')
            gY = sec.g(sd.Y[idx, 0])
            gd = sec.gdot(sd.fY[idx, 0])
            meets = gY.contains(0)
            if phase == 'departing':
                if not (gd > 0):
                    raise PoincareFailure('departure not transversal')
                S_new = integ.advance(sd, arb(h))
                if sec.g(S_new.hull()[idx, 0]) > 0:
                    phase = 'free'
                committed = True
                break
            if (not meets) or (gd < 0) or (gd > 0 and sec.g(Xs[idx, 0]) > 0):
                S_new = integ.advance(sd, arb(h))
                if meets and gd < 0:
                    passes += 1
                committed = True
                break
            if gd > 0:
                # candidate hitting step
                if not (sec.g(Xs[idx, 0]) < 0):
                    raise PoincareFailure('set straddles the section at the start of the hitting step')
                coeffs = [sec.sgn * float(v[idx, 0].mid()) for v in sd.xs_bar]
                sm = _poly_root(coeffs, sec.sgn * sec.c, h)
                if sm is None:
                    S_new = integ.advance(sd, arb(h))
                    if sec.g(S_new.hull()[idx, 0]) < 0:
                        committed = True
                        break
                    h *= 0.5
                    continue
                win = _crossing_window(sd, sec, sm, h)
                if win[0] == 'window':
                    monitors_ok(sd, Xs, sd.Y)
                    res = _crossing(integ, sd, sec, sm, win[1], win[2])
                    if res is None:
                        raise PoincareFailure('crossing enclosure failed (transversality on the window)')
                    note(res['P'], sd.Y)
                    res.update(passes=passes, steps=nsteps + 1, extremes=extremes, section=sec)
                    return res
                if win[0] == 'approach':
                    h_app = win[1]
                    ok_app = False
                    for _k in range(6):
                        sd2 = integ.enclose(S, prep, arb(h_app))
                        g2 = sec.g(sd2.Y[idx, 0])
                        if g2.contains(0) and not (sec.gdot(sd2.fY[idx, 0]) > 0):
                            raise PoincareFailure('ambiguous approach')
                        S_try = integ.advance(sd2, arb(h_app))
                        if sec.g(S_try.hull()[idx, 0]) < 0:
                            ok_app = True
                            break
                        h_app *= 0.5
                    if ok_app:
                        sd, S_new, h = sd2, S_try, h_app
                        committed = True
                        break
                    raise PoincareFailure('approach failed')
                # the crossing window is longer than the step: try longer steps (the remainder is
                # still checked, against a tolerance relative to the width of the set)
                h2 = h
                for _k in range(4):
                    h2 *= 1.6
                    try:
                        sd2 = integ.enclose(S, prep, arb(h2))
                    except EnclosureFailure:
                        break
                    if integ.rem_worst(sd2, prep, h2, rel=1e-6) > 1.0:
                        break
                    if not (sec.gdot(sd2.fY[idx, 0]) > 0):
                        break
                    coeffs2 = [sec.sgn * float(v[idx, 0].mid()) for v in sd2.xs_bar]
                    sm2 = _poly_root(coeffs2, sec.sgn * sec.c, h2)
                    if sm2 is None:
                        continue
                    win2 = _crossing_window(sd2, sec, sm2, h2)
                    if win2[0] == 'window':
                        monitors_ok(sd2, Xs, sd2.Y)
                        res = _crossing(integ, sd2, sec, sm2, win2[1], win2[2])
                        if res is None:
                            raise PoincareFailure('crossing enclosure failed')
                        note(res['P'], sd2.Y)
                        res.update(passes=passes, steps=nsteps + 1, extremes=extremes, section=sec)
                        return res
                raise PoincareFailure('crossing window does not fit in one Taylor step (%s)' % (win,))
            # sign of the crossing speed undetermined on Y: shorten the step
            h *= 0.5
            integ.stats['h_halvings'] += 1
        if not committed:
            if log is not None:
                log('    unresolved: phase=%s t=%s Y=%s fY=%s X=%s' % (
                    phase, S.t, sd.Y[idx, 0], sd.fY[idx, 0], Xs[idx, 0]))
            raise PoincareFailure('could not resolve the section in a step')
        Xe = S_new.hull()
        monitors_ok(sd, Xs, Xe)
        note(Xe, sd.Y)
        S = S_new
        nsteps += 1
        integ.stats['steps'] += 1
        if log is not None and nsteps % 100 == 0:
            log('    step %d  t=%.6f  h=%.3e' % (nsteps, float(S.t.mid()), h))


def _g_at(sd, sec, s):
    S = sd.S
    a, G0, G1, _ = sd.affine(arb(s))
    return sec.g((a + G0 * S.r0 + G1 * S.r)[sec.idx, 0])


def _crossing_window(sd, sec, sm, h):
    """Find 0 <= slo < shi < h with g < 0 at slo and g > 0 at shi for the whole set.

    Returns ('window', slo, shi), ('approach', h_app) when the window does not fit in [0, h) but
    the whole set can first be moved closer, or ('extend', None).
    """
    fi_lo = float(sec.gdot(sd.fY[sec.idx, 0]).lower())
    gm = _g_at(sd, sec, sm)
    spread = abs(float(gm.mid())) + float(gm.rad())
    delta = 1.2 * spread / fi_lo + 2.0 ** (8 - ctx.prec) * max(1.0, sm)
    for _ in range(40):
        slo, shi = max(sm - delta, 0.0), sm + delta
        if shi >= h:
            if sm - 2 * delta > 0:
                return ('approach', sm - 2 * delta)
            return ('extend', None)
        ok_lo = (slo == 0.0) or (_g_at(sd, sec, slo) < 0)
        if ok_lo and (_g_at(sd, sec, shi) > 0):
            return ('window', slo, shi)
        delta *= 2.0
    return ('extend', None)


def _crossing(integ, sd, sec, sm, slo, shi):
    """Enclose the crossing inside the step: time, point and derivative of the hitting map.

    For every x0 in the set, g(phi_s(x0)) < 0 at s = slo, > 0 at s = shi and d/ds g > 0 on the a
    priori enclosure of the whole step, so the hitting time s*(x0) is unique in T = [slo, shi].
    With xi on the orbit arc between sm and s*,
        P_j = phi_j(sm) - f_j(xi_j)/f_idx(xi) (phi_idx(sm) - c),  tau = sm - (phi_idx(sm) - c)/f_idx(xi),
    evaluated on the affine (Lohner) form of phi(sm) so that the time shift and the displacement
    along the flow cancel to first order instead of being added as intervals.
    """
    S = sd.S
    d = S.d
    idx = sec.idx
    cc = sec.cc
    T = arb(slo).union(arb(shi))
    YT = sd.enclose(T)
    fYT = col(integ.sys.f(colvals(YT)))
    fu = fYT[idx, 0]
    if not (sec.gdot(fu) > 0):
        return None
    a, G0, G1, Mm = sd.affine(arb(sm))
    Q = [fYT[j, 0] / fu for j in range(d)]
    Pa = arb_mat(d, 1)
    PG0 = arb_mat(d, S.r0.nrows())
    PG1 = arb_mat(d, d)
    for j in range(d):
        if j == idx:
            continue
        Pa[j, 0] = a[j, 0] - Q[j] * (a[idx, 0] - cc)
        for l in range(S.r0.nrows()):
            PG0[j, l] = G0[j, l] - Q[j] * G0[idx, l]
        for l in range(d):
            PG1[j, l] = G1[j, l] - Q[j] * G1[idx, l]
    P = Pa + PG0 * S.r0 + PG1 * S.r
    P[idx, 0] = cc
    # intersect with the direct enclosure of the state on the window (both are valid)
    for j in range(d):
        if j != idx:
            P[j, 0] = P[j, 0].intersection(YT[j, 0])
    uvar = (a[idx, 0] - cc) + (G0 * S.r0)[idx, 0] + (G1 * S.r)[idx, 0]
    tau = S.t + arb(sm) - uvar / fu
    tau = tau.intersection(S.t + T)
    fP = col(integ.sys.f(colvals(P)))
    out = {'P': P, 'tau': tau, 'T_window': (slo, shi), 'fP': fP}
    if integ.C1:
        NT = sd.N(T)
        Dphi = NT * S.Vbar + (NT * S.BV) * S.RV
        fpi = fP[idx, 0]
        if not (sec.gdot(fpi) > 0):
            return None
        Proj = ident(d)
        for j in range(d):
            Proj[j, idx] = Proj[j, idx] - fP[j, 0] / fpi
        out['Dphi'] = Dphi
        out['DP'] = Proj * Dphi
    return out
