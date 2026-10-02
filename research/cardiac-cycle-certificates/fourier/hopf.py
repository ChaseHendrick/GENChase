"""Closing the Hopf gap: the certified G_Ks branch of the single cell is the branch born at the Hopf point (Arb).

Status: source admission check passed; complete numerical acceptance pending. The reading
(reviews/hopf-bridge-review-2026-10-02.md) is an in-project reading by an AI agent session; no outside review has taken
place. The source fixes passed an in-project check; final numerical evidence must still satisfy collect. The complete proofs are in
fourier/LEMMAS-hopf.md; this docstring is the map from those lemmas to the code.

Model: Erhardt's 18-state TP06 endocardial cell, f(z; g) = arbmodel.f with g_Ks = g, scaled variables z = x / sigma.
G_Ks enters only through i_Ks = g Xs^2 (V - E_Ks) in dV/dt, so f(z; g) = f(z; g0) + (g - g0) f1(z) (branch.py (0.1)).

Part A (Hopf point; LEMMAS-hopf.md, Section A)
----------------------------------------------
A1  equilibrium branch: for every g in each sub-interval G of the window W, a contraction test on a polydisc X around
    a float equilibrium (Lemma K) gives exactly one equilibrium x_e(g) in X; x_e is real analytic in g (IFT).
A2  spectrum: A(g) = D_z f(x_e(g); g). With S = V D (V float eigenvectors at the float Hopf point, D a diagonal
    scaling), Gershgorin discs of S^-1 A S (Lemma G, proved; as hh-dynamics Lemma lem:gersh) show for every g in W: two
    disjoint discs D1 (upper half plane) and D2 that are disjoint from the 16 other discs, which lie in Re < 0. A
    contraction test for the eigenpair (Lemma K on (lambda, v), v_k = 1) encloses the eigenvalue lambda(g) in D1, and
    the conjugate ball is disjoint from every disc but D2 (so conj lambda(g), an eigenvalue since A(g) is real and in
    some disc by Lemma G(a), is the one in D2). So the spectrum is {lambda(g), conj lambda(g)} and 16 eigenvalues with
    negative real part, lambda(g) simple.
A3  crossing: Re lambda(g) > 0 on the sub-intervals left of a tiny interval G_H = [g_a, g_b], < 0 right of it, and
    d Re lambda / dg < 0 on G_H (dlambda/dg = <p, A'(g) q> / <p, q>, A'(g) = D^2 f[x_e'(g), .] + D_z f1,
    x_e' = -A^-1 f1, enclosed in Arb): exactly one g_H in W with Re lambda(g_H) = 0, and g_H in G_H.
A4  first Lyapunov coefficient l1 at (x_e(g_H), g_H) by Kuznetsov's formula (as hh-dynamics eq. (l1)), with the second
    and third derivatives from truncated Taylor series along complex directions (class Jet, exact recurrences in Arb)
    and polarization, in physical coordinates with <q, q> = 1 (Erhardt's MATCONT convention, for comparison only; the
    sign does not depend on the normalization). The routine is tested on systems with known l1 (test_hopf.py).
Conclusion (cited theorem, Kuznetsov's Andronov-Hopf theorem as stated in hh-dynamics, Theorem thm:kuz): with
l1 < 0 and mu' < 0, for g < g_H near g_H there is a unique small cycle near x_e(g_H), and it is orbitally
asymptotically stable; for g >= g_H near g_H there is none near x_e(g_H).

Part B (quantitative bridge; LEMMAS-hopf.md, Part B): the blown-up radii polynomial in the amplitude eps, see the
comment block above class Lay; run() proves pieces [e_lo, e_hi] from eps = 0 upward and glues each to the previous one
(Lemma B4); identification_at_eps0 shows that the zero at eps = 0 is the Hopf point of Part A (Corollary B(a)).
reprove_all (`hopf.py --reprove-all [--workers W]`) re-proves every logged piece with the current program text and
stores complete fresh exact proof results and historical equality diagnostics (data/hopf/reprove_final.jsonl, with the program SHA-256 taken at
import); collect reports which pieces have a matching re-proof by the current program.

Part C (gluing; LEMMAS-hopf.md, Part C): point_in_eps_branch (Lemma D) shows that the orbit of a K = 32 point proof
of branch.py at G_Ks = g_s is the bridge orbit at eps_s = 2 a_{1,V}; branch.point_on_branch shows that it is the G_Ks
branch orbit at g_s (bridge_checks, on a validated snapshot of the append-only branch logs). gks_point_proofs makes
such point proofs with branch.py's functions, logged under data/hopf/.

Part S (stability; LEMMAS-hopf.md, Part S): only pointwise (Stage S at the point proofs identified by Lemma D) and,
qualitatively, for small amplitude (cited Hopf theorem). Not uniform on the bridge.
"""
import argparse
import hashlib
import json
import math
import os
import platform
import sys
import time
from fractions import Fraction

for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_v, "1")

import numpy as np  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "model"))

# Pin every scientific dependency before any lazy branch/stability import can occur.
SOURCES = ["fourier/hopf.py", "fourier/test_hopf.py", "fourier/LEMMAS-hopf.md", "fourier/arbmodel.py",
           "fourier/tp06_18d_arb.py", "fourier/fourier_eval.py", "fourier/existence.py", "fourier/branch.py",
           "fourier/stability.py", "fourier/centre.py", "model/tp06_18d.py", "model/scales.txt"]

def _sha(path):
    with open(path, "rb") as fh_:
        return hashlib.sha256(fh_.read()).hexdigest()

SOURCE_SHA256 = {s_: _sha(os.path.join(ROOT, s_)) for s_ in SOURCES}
CODE_SHA256 = SOURCE_SHA256["fourier/hopf.py"]

def _assert_sources_current():
    if any(_sha(os.path.join(ROOT, s_)) != digest for s_, digest in SOURCE_SHA256.items()):
        raise ProofFailure("scientific sources changed after import; restart before proving or collecting")


import flint  # noqa: E402
from flint import acb, acb_mat, arb, arb_mat, ctx, fmpq, fmpz  # noqa: E402

import arbmodel as am  # noqa: E402
import existence as ex  # noqa: E402
import fourier_eval as fe  # noqa: E402

DIM = 18
IV = 0                      # V
IXS = 3                     # Xs
INA = 17                    # Na_i
RESULTS = os.path.join(ROOT, "results")
DATA = os.environ.get("HOPF_DATA", os.path.join(HERE, "data", "hopf"))
G_ERHARDT = "0.027907858929580"     # Erhardt, Front. Phys. 13 (2025) 1569121, Table 2 (not used in any bound)
L1_ERHARDT = "-2.6838"              # ibid., numerical first Lyapunov coefficient (not used in any bound)
WINDOW = ("0.02789", "0.02792")     # the window W of Theorem A (contains Erhardt's value)

ProofFailure = ex.ProofFailure
up, lo, amax, bound_rec, dec = ex.up, ex.lo, ex.amax, ex.bound_rec, ex.dec
I1 = acb(0, 1)


def _arb_q(s):
    fr = Fraction(s)
    return arb(fmpq(fr.numerator, fr.denominator))


def _ball_interval(a, b):
    """acb (real) ball containing the closed interval [a, b] of exact rationals given as strings or Fractions."""
    return acb(_arb_q(a).union(_arb_q(b)))


def _chk(v, what="value"):
    if not v.is_finite():
        raise am.DomainError(f"non-finite {what}: {v}")
    return v


# =================================================================================================================
# Truncated Taylor series (directional derivatives of any order) over acb
# =================================================================================================================
class Jet:
    """sum_{k < L} c_k t^k with acb coefficients. Every operation is the exact recurrence for the Taylor coefficients
    of the composite, evaluated in ball arithmetic, so the coefficients enclose the Taylor coefficients of the composite
    at every point of the input balls. Only exact scalars (acb, arb, int, fmpz, fmpq) mix with a Jet; log and sqrt
    require the constant term certainly in Re > 0 (principal branch, holomorphic there) and every coefficient is
    checked finite."""
    __slots__ = ("c",)

    def __init__(self, c):
        self.c = [_chk_coef(x if isinstance(x, (acb, am.Dual, _hess_cls())) else _scalar(x)) for x in c]

    @property
    def L(self):
        return len(self.c)

    def _lift(self, o):
        if isinstance(o, Jet):
            if o.L != self.L:
                raise ValueError("Jet lengths differ")
            return o
        return Jet([_scalar(o)] + [acb(0)] * (self.L - 1))

    def __add__(self, o):
        o = self._lift(o)
        return Jet([a + b for a, b in zip(self.c, o.c)])

    __radd__ = __add__

    def __neg__(self):
        return Jet([-a for a in self.c])

    def __pos__(self):
        return self

    def __sub__(self, o):
        return self + (-self._lift(o))

    def __rsub__(self, o):
        return self._lift(o) + (-self)

    def __mul__(self, o):
        if not isinstance(o, Jet):
            s = _scalar(o)
            return Jet([a * s for a in self.c])
        o = self._lift(o)
        L = self.L
        return Jet([sum((self.c[i] * o.c[k - i] for i in range(k + 1)), acb(0)) for k in range(L)])

    __rmul__ = __mul__

    def recip(self):
        b = self.c
        r0 = 1 / b[0]
        _chk_coef(r0)
        r = [r0]
        for k in range(1, self.L):
            r.append(-sum((b[i] * r[k - i] for i in range(1, k + 1)), acb(0)) * r0)
        return Jet(r)

    def __truediv__(self, o):
        if isinstance(o, Jet):
            return self * o.recip()
        s = 1 / _scalar(o)
        _chk_coef(s)
        return self * s

    def __rtruediv__(self, o):
        return self.recip() * _scalar(o)

    def __pow__(self, n):
        if type(n) is not int:
            raise TypeError("Jet ** n needs an int exponent")
        if n < 0:
            return (self ** (-n)).recip()
        r = Jet([acb(1)] + [acb(0)] * (self.L - 1))
        for _ in range(n):
            r = r * self
        return r

    def exp(self):
        a = self.c
        e = [a[0].exp()]
        for k in range(1, self.L):
            e.append(sum((i * a[i] * e[k - i] for i in range(1, k + 1)), acb(0)) / k)
        return Jet(e)

    def log(self):
        a = self.c
        if not (_val(a[0]).real > 0):
            raise am.DomainError(f"log: constant term {_val(a[0])} not certainly in Re > 0")
        l = [a[0].log()]
        for k in range(1, self.L):
            s = sum((i * l[i] * a[k - i] for i in range(1, k)), acb(0))
            l.append((a[k] - s / k) / a[0])
        return Jet(l)

    def sqrt(self):
        a = self.c
        if not (_val(a[0]).real > 0):
            raise am.DomainError(f"sqrt: constant term {_val(a[0])} not certainly in Re > 0")
        s = [a[0].sqrt()]
        for k in range(1, self.L):
            t = sum((s[i] * s[k - i] for i in range(1, k)), acb(0))
            s.append((a[k] - t) / (2 * s[0]))
        return Jet(s)


def _hess_cls():
    import branch as br
    return br.Hess


def _val(x):
    return x if isinstance(x, acb) else x.v


def _chk_coef(x):
    """Finiteness of a Jet coefficient: an acb ball, an arbmodel.Dual (value and every gradient entry) or a
    branch.Hess (value, gradient and Hessian entries)."""
    if isinstance(x, acb):
        return _chk(x, "Jet coefficient")
    if isinstance(x, am.Dual):
        _chk(x.v, "Jet coefficient")
        for v in x.d.values():
            _chk(v, "Jet coefficient gradient")
        return x
    if isinstance(x, _hess_cls()):
        _chk(x.v, "Jet coefficient")
        for v in x.g.values():
            _chk(v, "Jet coefficient gradient")
        for v in x.h.values():
            _chk(v, "Jet coefficient Hessian")
        return x
    raise TypeError(f"Jet coefficient of type {type(x).__name__}")


def _scalar(x):
    if isinstance(x, (acb, am.Dual, _hess_cls())):
        return x
    if isinstance(x, bool):
        raise TypeError("bool")
    if isinstance(x, (arb, int, fmpz, fmpq)):
        return acb(x)
    raise TypeError(f"Jet arithmetic with {type(x).__name__} is refused (no float may enter unexamined)")


class JetMath:
    @staticmethod
    def exp(a):
        return a.exp() if isinstance(a, Jet) else _chk(am.to_ball(a).exp())

    @staticmethod
    def log(a):
        if isinstance(a, Jet):
            return a.log()
        a = am.to_ball(a)
        if not (a.real > 0):
            raise am.DomainError("log argument not certainly in Re > 0")
        return _chk(a.log())

    @staticmethod
    def sqrt(a):
        if isinstance(a, Jet):
            return a.sqrt()
        a = am.to_ball(a)
        if not (a.real > 0):
            raise am.DomainError("sqrt argument not certainly in Re > 0")
        return _chk(a.sqrt())


def field_jet(x0, v, L, g, dg=0, physical=False, prec=128):
    """Taylor coefficients (k < L) in t of f(x0 + t v; g + t dg), as a list of 18 lists of acb.
    physical=False: x0, v and the output in the scaled variables z; True: physical units. g, dg: balls/decimals."""
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(am.params(prec))
        gb = am.to_ball(g)
        p["g_Ks"] = Jet([gb, am.to_ball(dg)] + [acb(0)] * (L - 2)) if L >= 2 else Jet([gb])
        xs = []
        for k in range(DIM):
            s = acb(1) if physical else am.SIG[k]
            xs.append(Jet([am.to_ball(x0[k]) * s, am.to_ball(v[k]) * s] + [acb(0)] * (L - 2)))
        y = fn(xs, p, JetMath, acb(0))
        out = []
        for k, yk in enumerate(y):
            s = acb(1) if physical else am.ISIG[k]
            yk = yk if isinstance(yk, Jet) else Jet([am.to_ball(yk)] + [acb(0)] * (L - 1))
            out.append([_chk(c * s, "field_jet coefficient") for c in yk.c])
    return out


# =================================================================================================================
# Small linear-algebra helpers (Arb)
# =================================================================================================================
def mat_from_np(Mf):
    return acb_mat([[acb(complex(v)) for v in row] for row in np.asarray(Mf)])


def np_from_mat(M):
    return np.array([[complex(float(v.real.mid()), float(v.imag.mid())) for v in row] for row in M.tolist()])


def colvec(v):
    return acb_mat([[x] for x in v])


def vlist(M):
    return [M[i, 0] for i in range(M.nrows())]


def amax_list(vals):
    out = arb(0)
    for v in vals:
        out = amax(out, v)
    return out


# =================================================================================================================
# A1. Equilibria over a g interval (Lemma K: a contraction on a polydisc)
# =================================================================================================================
def float_equilibrium(g, x0=None):
    """Untrusted float equilibrium in scaled variables (numpy, complex-step Jacobian of the reference model)."""
    import branch as br
    if x0 is None:
        with open(os.path.join(RESULTS, "numerics-hopf-orbit.json")) as fh:
            d = json.load(fh)
        x0 = np.array(list(d["equilibrium_at_0.029"].values())) / (2.0 ** np.array(am.SCALE_EXP, dtype=float))
    x = np.array(x0, dtype=float)
    for _ in range(40):
        F = br.fs(x[:, None], float(g))[:, 0]
        J = br.jac_f(x[:, None], float(g))[0]
        dx = np.linalg.solve(J, -F)
        x = x + dx
        if np.abs(dx).max() < 1e-16:
            break
    return x


def contraction_test(Fc, Jbox, C, r, centre_pert=None):
    """Lemma K. Fc: list of balls containing F(x~) (for every parameter of the family); Jbox: acb_mat containing
    DF(z) for every z in the polydisc P = {|z_i - x~_i| <= r_i} (and every parameter); C: exact matrix; r: list of exact
    positive radii. Certifies (1) |(I - C DF)| weighted row sums < 1 (contraction in the weighted max norm
    ||y|| = max |y_i| / r_i) and (2) |-C F(x~)|_i + sum_j |(I - C DF)_ij| r_j <= r_i. Returns (ok, kappa, slack)."""
    n = len(r)
    M = ex._identity(n) - C * Jbox
    CF = C * colvec(Fc)
    kappa = arb(0)
    ok = True
    worst = arb(0)
    for i in range(n):
        s = arb(0)
        for j in range(n):
            s += M[i, j].abs_upper() * r[j]
        k_i = up(s / r[i])
        kappa = amax(kappa, k_i)
        tot = CF[i, 0].abs_upper() + s
        if not tot <= r[i]:
            ok = False
        worst = amax(worst, up(tot / r[i]))
    return ok and bool(kappa < 1), kappa, worst


def equilibrium_on(G, xf, prec=192, rfac="1e-45", rmin=None):
    """Lemma K for f(.; g) on the polydisc P around the exact double vector xf, for every g in the ball G.
    rmin (optional, floats): lower bounds for the radii (used to make P contain given sets).
    Returns dict(X=list of acb balls containing x_e(g) for all g in G (the polydisc), xf, r, kappa)."""
    with am.precision(prec):
        prm = am.params(prec, g_Ks=G)
        xt = [acb(float(v)) for v in xf]
        Fc, Jc = am.f_and_df(xt, prm, prec=prec)
        Jm = np_from_mat(Jc)
        C = mat_from_np(np.linalg.inv(Jm.real))
        # radii: |C F| times a factor, at least rfac relative
        CF = C * colvec(Fc)
        r = []
        for i in range(DIM):
            v = float(CF[i, 0].abs_upper()) * 4 + float(Fraction(rfac)) * max(abs(float(xf[i])), 1e-3)
            if rmin is not None:
                v = max(v, float(rmin[i]))
            r.append(arb(v))
        X = [acb(xt[i].real + r[i] * arb(0, 1), r[i] * arb(0, 1)) for i in range(DIM)]
        _, JX = am.f_and_df(X, prm, prec=prec)
        ok, kappa, worst = contraction_test(Fc, JX, C, r)
        if not ok:
            raise ProofFailure(f"equilibrium contraction test failed on G = {G} (kappa {float(kappa):.3e}, "
                               f"worst {float(worst):.3e})")
        # the zero lies in x~ + (polydisc); real by uniqueness (the polydisc is conjugation invariant, f real)
        Xr = [acb(xt[i].real + r[i] * arb(0, 1)) for i in range(DIM)]
    return dict(X=Xr, Xc=X, r=r, kappa=kappa, C=C, xt=[v.real for v in xt])


# =================================================================================================================
# A2. Eigenpair enclosure and Gershgorin separation
# =================================================================================================================
def eigpair_on(A, lam0, v0, k, r_lam="1e-45", r_v="1e-45"):
    """Lemma K for G(lambda, v) = (A - lambda I) v, v_k = 1, unknowns y = (lambda, v_j (j != k)), on a polydisc around
    the exact (lam0, v0) (v0[k] = 1), for every matrix in the ball matrix A. Returns (lam ball, v balls, radii)."""
    n = DIM
    idx = [j for j in range(n) if j != k]
    yt = [acb(complex(lam0))] + [acb(complex(v0[j])) for j in idx]

    def unpack(y):
        lam = y[0]
        v = [None] * n
        v[k] = acb(1)
        for t, j in enumerate(idx):
            v[j] = y[1 + t]
        return lam, v

    def G(y):
        lam, v = unpack(y)
        Av = A * colvec(v)
        return [Av[i, 0] - lam * v[i] for i in range(n)]

    def DG(y):
        lam, v = unpack(y)
        J = acb_mat(n, n)
        for i in range(n):
            J[i, 0] = -v[i]
            for t, j in enumerate(idx):
                J[i, 1 + t] = A[i, j] - (lam if i == j else 0)
        return J

    Jm = np_from_mat(DG(yt))
    C = mat_from_np(np.linalg.inv(Jm))
    Fc = G(yt)
    CF = C * colvec(Fc)
    r = [arb(max(float(CF[i, 0].abs_upper()) * 4, float(Fraction(r_lam if i == 0 else r_v)))) for i in range(n)]
    Y = [acb(yt[i].real + r[i] * arb(0, 1), yt[i].imag + r[i] * arb(0, 1)) for i in range(n)]
    ok, kappa, worst = contraction_test(Fc, DG(Y), C, r)
    if not ok:
        raise ProofFailure(f"eigenpair contraction test failed (kappa {float(kappa):.3e}, worst {float(worst):.3e})")
    lam, v = unpack(Y)
    return lam, v, r


def gershgorin(A, S, Sinv):
    """Lemma G: centres c_i and radii R_i (exact upper bounds) of the discs of S^-1 A S for every A in the ball A:
    c_i = mid of the diagonal entry, R_i = |diag - c_i| (upper) + sum_{j != i} |entry| (upper)."""
    M = Sinv * A * S
    n = M.nrows()
    out = []
    for i in range(n):
        d = M[i, i]
        c = acb(d.real.mid(), d.imag.mid())
        R = (d - c).abs_upper()
        for j in range(n):
            if j != i:
                R = R + M[i, j].abs_upper()
        out.append((c, up(R)))
    return out


def _discs_disjoint(d1, d2):
    (c1, R1), (c2, R2) = d1, d2
    return bool((c1 - c2).abs_lower() > R1 + R2)


class FloatHopf:
    """Untrusted float data at the float Hopf point: g, x, omega, eigenvector matrix V (columns), index of the
    critical eigenvalue (Im > 0) and of its conjugate."""

    def __init__(self):
        import branch as br
        from scipy.optimize import brentq

        def crit(g):
            x = float_equilibrium(g)
            J = br.jac_f(x[:, None], g)[0]
            ev = np.linalg.eigvals(J)
            ev = ev[np.argsort(-ev.real)]
            return ev[0].real, x, J
        g = brentq(lambda gg: crit(gg)[0], 0.0278, 0.0280, xtol=1e-17)
        _, x, J = crit(g)
        ev, V = np.linalg.eig(J)
        ic = int(np.argmax(np.where(np.abs(ev.real) < 1e-4, ev.imag, -np.inf)))
        jc = int(np.argmin(np.abs(ev - np.conj(ev[ic]))))
        self.g, self.x, self.J, self.ev, self.V, self.ic, self.jc = g, x, J, ev, V, ic, jc
        self.omega = float(ev[ic].imag)


def spectrum_on(fam, prec=192):
    """fam: a jacobian_family dict (fam["A"] contains A(g) for every g of its interval). With S the (untrusted) float
    eigenvector matrix of mid(A(g_c)) with unit columns: for every such g, the Gershgorin discs of S^-1 A S (Lemma G)
    give two disjoint discs D1 (Im > 0) and D2 for the critical pair, disjoint from the 16 other discs, which lie in
    Re < 0; the eigenpair contraction (Lemma K) encloses lambda(g) inside D1, and the conjugate ball conj(L) is disjoint
    from every disc but D2, so conj(lambda(g)) (an eigenvalue, in some disc by Lemma G(a)) is the eigenvalue in D2
    (review 2026-10-02, GAP 1).
    Returns the eigenvalue ball, the eigenvector enclosure (v_k = 1), the largest right end of the 16 other discs, and
    the discs."""
    with am.precision(prec):
        A = fam["A"]
        Am = np_from_mat(fam["Ac"])
        ev, V = np.linalg.eig(Am)
        ic = int(np.argmax(np.where(np.abs(ev.real) < 2e-3, ev.imag, -np.inf)))
        jc = int(np.argmin(np.abs(ev - np.conj(ev[ic]))))
        if ic == jc or not ev[ic].imag > 0.05:
            raise ProofFailure("float eigen data: critical pair not found")
        V = V / np.linalg.norm(V, axis=0)[None, :]
        S = mat_from_np(V)
        Sinv = S.inv()
        discs = gershgorin(A, S, Sinv)
        others = [i for i in range(DIM) if i not in (ic, jc)]
        if not _discs_disjoint(discs[ic], discs[jc]):
            raise ProofFailure("pair discs D1, D2 not disjoint")
        for i in others:
            for p in (ic, jc):
                if not _discs_disjoint(discs[i], discs[p]):
                    raise ProofFailure(f"disc {i} meets a pair disc")
        maxre, maxabsim = None, None
        for i in others:
            c, R = discs[i]
            right = up(c.real + R)
            if not right < 0:
                raise ProofFailure(f"disc {i} reaches Re >= 0 (right end {float(right):.3e})")
            maxre = right if maxre is None else amax(maxre, right)
            absim = up(c.imag.abs_upper() + R)
            maxabsim = absim if maxabsim is None else amax(maxabsim, absim)
        v0 = V[:, ic]
        k = int(np.argmax(np.abs(v0)))
        v0 = v0 / v0[k]
        lam, v, _ = eigpair_on(A, ev[ic], v0, k)
        # lam (a ball containing an eigenvalue lambda*) is disjoint from every disc but D1, so lambda* lies in D1
        lc = acb(lam.real.mid(), lam.imag.mid())
        lr = up((lam - lc).abs_upper())
        for i in range(DIM):
            if i != ic and not _discs_disjoint((lc, lr), discs[i]):
                raise ProofFailure(f"eigenvalue enclosure meets disc {i}")
        if not lam.imag > 0:
            raise ProofFailure("Im lambda not certainly positive")
        # A(g) is real, so conj(lambda*) is an eigenvalue too, and it lies in the ball conj(lam). That ball is certified
        # disjoint from every disc but D2; every eigenvalue lies in some disc (Lemma G(a)), so conj(lambda*) lies in D2,
        # which holds exactly one eigenvalue (Lemma G(b)): the spectrum is lambda*, conj(lambda*) and the 16 eigenvalues
        # of the other discs (review 2026-10-02, GAP 1). The stronger inclusion |conj(lc) - c_D2| + lr <= R_D2 is only
        # reported (conj_ball_inside_D2): it fails on degenerate intervals (a single g), where R_D2 is of the size of
        # the float error of S and smaller than the eigenpair radius lr, although conj(lambda*) is in D2 there too.
        c2, R2 = discs[jc]
        for i in range(DIM):
            if i != jc and not _discs_disjoint((lc.conjugate(), lr), discs[i]):
                raise ProofFailure(f"conjugate eigenvalue enclosure meets disc {i}")
        inside = bool((lc.conjugate() - c2).abs_upper() + lr <= R2)
    return dict(lam=lam, v=v, k=k, others_max_re=maxre, others_abs_im=maxabsim, discs=discs, ic=ic, jc=jc, conj_ball_inside_D2=inside,
                lam_radius=lr)


def gershgorin_scaling(fh):
    """Untrusted: a diagonal scaling of the eigenvector columns (unit columns)."""
    return 1.0 / np.linalg.norm(fh.V, axis=0)


def _hess_dir(X, prm_g, dX, dg, prec):
    """Hess (branch.Hess, second-order duals) of f at the box X with g = prm_g['g_Ks'] (a ball), variables z_0..z_17
    and a 19th variable t along the direction (dX, dg): returns (F, Jz, Mt) with Jz = D_z f, Mt[k][j] = the mixed
    derivative d^2 f_k / dz_j dt = (D^2_z f [dX] + dg D_z f1)_kj, all enclosed over the box (scaled variables)."""
    import branch as br
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(prm_g)
        T = DIM
        p["g_Ks"] = br.Hess(am.to_ball(p["g_Ks"]), {T: am.to_ball(dg)})
        x = [br.Hess(am.to_ball(X[k]) * am.SIG[k], {k: am.SIG[k], T: am.to_ball(dX[k]) * am.SIG[k]}) for k in range(DIM)]
        y = fn(x, p, br.HessMath, acb(0))
        F, Jz, Mt = [], acb_mat(DIM, DIM), acb_mat(DIM, DIM)
        zero = acb(0)
        for k, yk in enumerate(y):
            yk = br._lift(yk) if not isinstance(yk, br.Hess) else yk
            F.append(yk.v * am.ISIG[k])
            for j in range(DIM):
                Jz[k, j] = yk.g.get(j, zero) * am.ISIG[k]
                Mt[k, j] = yk.h.get((j, T), zero) * am.ISIG[k]
    return F, Jz, Mt


def f1_at(X, prec):
    """f1 = df/dg (exact: f is affine in g) at the box X, scaled, as 18 balls (dual number in g)."""
    with am.precision(prec):
        F, J, P = am.f_and_df(X, am.params(prec), prec=prec, wrt=("g_Ks",))
    return [P[k, 0] for k in range(DIM)]


def jacobian_family(a, b, fh, prec=192):
    """For every g in [a, b] (exact decimals): A(g) = D_z f(x_e(g); g) lies in the ball matrix
    A_c + [-delta, delta] A'(box), the mean value form in g (Lemma A1): A_c encloses A(g_c) at the midpoint g_c (point
    equilibrium enclosure), A'(box) encloses dA/dg = D_z^2 f[x_e'] + D_z f1 over (X_G, G), x_e' = -A^-1 f1 over the
    box. Returns dict(A=ball matrix, eq_c, eq_G, dxe=enclosure of x_e' over G, Aprime)."""
    fa, fb = Fraction(a), Fraction(b)
    gc = (fa + fb) / 2
    delta = (fb - fa) / 2
    with am.precision(prec):
        Gc = am.to_ball(gc)
        G = _ball_interval(fa, fb)
        xf = float_equilibrium(float(gc), fh.x)
        eq_c = equilibrium_on(Gc, xf, prec=prec)
        eq_G = equilibrium_on(G, xf, prec=prec)
        # Lemma A1 needs the midpoint equilibrium (unique in X_c) to be the branch of X_G at g_c: X_c in X_G (same
        # centre xf, so radii suffice); then it is the unique zero of f(.; g_c) in X_G.
        if not all(bool(eq_c["r"][i] <= eq_G["r"][i]) for i in range(DIM)):
            raise ProofFailure("midpoint polydisc X_c not inside X_G")
        prm_c = am.params(prec, g_Ks=Gc)
        prm_G = am.params(prec, g_Ks=G)
        _, Ac = am.f_and_df(eq_c["X"], prm_c, prec=prec)
        _, AG = am.f_and_df(eq_G["X"], prm_G, prec=prec)
        f1G = f1_at(eq_G["X"], prec)
        dxe = AG.solve(colvec([-v for v in f1G]))
        dxe = vlist(dxe)
        _, _, Ap = _hess_dir(eq_G["X"], prm_G, dxe, acb(1), prec)
        dball = acb(arb(0, 1) * _arb_q(delta))
        A = Ac + Ap * dball
    return dict(A=A, Ac=Ac, Aprime=Ap, eq_c=eq_c, eq_G=eq_G, dxe=dxe, gc=gc, delta=delta)


# =================================================================================================================
# A3. The crossing: sign of Re lambda on a cover of the window, transversality on the tiny interval G_H
# =================================================================================================================
def _point_re_lambda(g, fh, prec=192):
    fam = jacobian_family(g, g, fh, prec)
    sp = spectrum_on(fam, prec)
    return sp["lam"]


def refine_gH(fh, prec=192, iters=6, log=print):
    """Untrusted: secant iteration on Re lambda(g) with Arb point evaluations; returns a Fraction near g_H."""
    g0 = Fraction(fh.g).limit_denominator(10 ** 18)
    g1 = g0 + Fraction(1, 10 ** 12)
    r0 = float(_point_re_lambda(g0, fh, prec).real.mid())
    r1 = float(_point_re_lambda(g1, fh, prec).real.mid())
    for _ in range(iters):
        if r1 == r0:
            break
        g2 = g1 - Fraction(r1) * (g1 - g0) / Fraction(r1 - r0)
        g2 = g2.limit_denominator(10 ** 22)
        g0, r0 = g1, r1
        g1 = g2
        r1 = float(_point_re_lambda(g1, fh, prec).real.mid())
        log(f"  secant: g = {float(g1):.17g}, Re lambda = {r1:.3e}")
        if abs(r1) < 1e-26:
            break
    return g1


def left_eig(A, lam0, k=None):
    """Eigenpair contraction for A^T (left eigenvector p^T A = lambda p^T), from float data of mid(A)."""
    At = A.transpose()
    Am = np_from_mat(At)
    ev, V = np.linalg.eig(Am)
    i = int(np.argmin(np.abs(ev - complex(lam0))))
    v0 = V[:, i]
    k = int(np.argmax(np.abs(v0))) if k is None else k
    v0 = v0 / v0[k]
    return eigpair_on(At, ev[i], v0, k)


def dlambda_dg(fam, sp):
    """d lambda / dg = p^T A'(g) q / (p^T q) for every g of the family's interval (Lemma A3): q = sp's right eigenvector
    enclosure, p the left one from the contraction for A^T, A' = fam['Aprime'] (encloses dA/dg over the interval)."""
    A = fam["A"]
    q = sp["v"]
    lam_l, p, _ = left_eig(A, complex(float(sp["lam"].real.mid()), float(sp["lam"].imag.mid())))
    # lam_l(A) is an eigenvalue of A (that of A^T); its ball must be disjoint from every Gershgorin disc but D1, so it
    # lies in D1, which holds exactly one eigenvalue (Lemma G(b)): lam_l(A) = lambda(A) and p(A) is its left eigenvector.
    # (An overlap of the two eigenvalue balls alone would not identify them.)
    lc = acb(lam_l.real.mid(), lam_l.imag.mid())
    lr = up((lam_l - lc).abs_upper())
    for i in range(DIM):
        if i != sp["ic"] and not _discs_disjoint((lc, lr), sp["discs"][i]):
            raise ProofFailure(f"left eigenvalue enclosure meets disc {i}")
    pq = sum((p[i] * q[i] for i in range(DIM)), acb(0))
    Apq = fam["Aprime"] * colvec(q)
    num = sum((p[i] * Apq[i, 0] for i in range(DIM)), acb(0))
    return num / pq, p


def polydisc_record(eq):
    """Exact record of an equilibrium polydisc (centre doubles, radii) as '<sign>0x<hex>p<exp>' texts."""
    return dict(centre=[_dyadic_text(v) for v in eq["xt"]], radius=[_dyadic_text(v) for v in eq["r"]])


def polydisc_from_record(rec):
    return [_dyadic_from_text(t) for t in rec["centre"]], [_dyadic_from_text(t) for t in rec["radius"]]


def cover_window(fh, gH, W=WINDOW, h="1e-13", w_far="1e-7", prec=192, log=print, logfile=None, band="1e-6"):
    """Theorem A (crossing part): a cover of W by closed intervals, on each of which (spectrum_on) the 16 other
    eigenvalues have Re < 0 and lambda(g) is enclosed, with Re lambda > 0 left of G_H = [gH - h, gH + h], Re lambda < 0
    right of it, and Re d lambda/dg < 0 on G_H. Intervals are adjacent (shared exact endpoints) and cover W."""
    gH = Fraction(gH)
    hh = Fraction(h)
    ga, gb = gH - hh, gH + hh
    Wa, Wb = Fraction(W[0]), Fraction(W[1])
    if not (Wa < ga and gb < Wb):
        raise ValueError("G_H not inside W")
    wf = Fraction(w_far)
    band = Fraction(band)                   # intervals meeting [gH - band, gH + band] record their polydisc
    pieces = []
    stats = dict(n=0, max_others_re=None, max_others_abs_im=None, min_im=None, max_im=None)

    def run(a, b, sign):
        fam = jacobian_family(a, b, fh, prec)
        sp = spectrum_on(fam, prec)
        re = sp["lam"].real
        okay = (re > 0) if sign > 0 else (re < 0)
        return okay, fam, sp

    def side(start, stop, direction):
        # direction +1: from G_H's right end to Wb with sign < 0; -1: from G_H's left end to Wa with sign > 0
        sign = -1 if direction > 0 else +1
        out = []
        pos = start
        w = 2 * hh
        while (pos < stop) if direction > 0 else (pos > stop):
            w_try = min(w, wf)
            nxt = pos + direction * w_try
            if (direction > 0 and nxt > stop) or (direction < 0 and nxt < stop):
                nxt = stop
            a, b = (pos, nxt) if direction > 0 else (nxt, pos)
            try:
                okay, fam, sp = run(a, b, sign)
            except ProofFailure:
                okay = False
            if not okay:
                w = w_try / 4
                if w < hh / 1024:
                    raise ProofFailure(f"cannot decide the sign of Re lambda near [{float(a)}, {float(b)}]")
                continue
            item = dict(a=str(a), b=str(b), re_lam=[dec(lo(sp["lam"].real), "down", 6), dec(up(sp["lam"].real), "up", 6)],
                        others_max_re=float(sp["others_max_re"]),
                        others_max_re_bound=bound_rec(sp["others_max_re"]),
                        others_abs_im_bound=bound_rec(sp["others_abs_im"]), lambda_imag=_ball_rec(sp["lam"].imag))
            if a <= gH + band and b >= gH - band:
                item["polydisc"] = polydisc_record(fam["eq_G"])
            out.append(item)
            stats["n"] += 1
            if stats["n"] % 25 == 0:
                log(f"  window cover: {stats['n']} intervals, now at [{float(a):.12f}, {float(b):.12f}], "
                    f"{time.time() - t0:.0f} s")
            stats["max_others_re"] = sp["others_max_re"] if stats["max_others_re"] is None else amax(stats["max_others_re"], sp["others_max_re"])
            stats["max_others_abs_im"] = amax(stats["max_others_abs_im"], sp["others_abs_im"])
            im_lo, im_hi = lo(sp["lam"].imag), up(sp["lam"].imag)
            stats["min_im"] = im_lo if stats["min_im"] is None or im_lo < stats["min_im"] else stats["min_im"]
            stats["max_im"] = im_hi if stats["max_im"] is None or im_hi > stats["max_im"] else stats["max_im"]
            pos = nxt
            w = w_try * 2
        return out

    t0 = time.time()
    famH = jacobian_family(ga, gb, fh, prec)
    spH = spectrum_on(famH, prec)
    dl, p = dlambda_dg(famH, spH)
    if not dl.real < 0:
        raise ProofFailure(f"transversality not certified: d Re lambda / dg in {dl.real}")
    # G_H is an interval of the cover too: its 16 other discs and Im lambda enter the statistics (until 2026-10-02 the
    # statistics covered only the left and right intervals)
    stats.update(max_others_re=spH["others_max_re"], max_others_abs_im=spH["others_abs_im"],
                 min_im=lo(spH["lam"].imag), max_im=up(spH["lam"].imag))
    right = side(gb, Wb, +1)
    left = side(ga, Wa, -1)
    if not stats["min_im"] > stats["max_others_abs_im"]:
        raise ProofFailure("critical/stable imaginary separation fails on full Theorem A cover")
    log(f"  window cover: {len(left)} intervals left of G_H, {len(right)} right, {time.time() - t0:.1f} s")
    return dict(gH_interval=[str(ga), str(gb)], famH=famH, spH=spH, dlam=dl, p=p, left=left, right=right,
                stats=stats, seconds=round(time.time() - t0, 1), polydisc_H=polydisc_record(famH["eq_G"]),
                others_max_re_H=float(spH["others_max_re"]),
                others_max_re_H_bound=bound_rec(spH["others_max_re"]),
                others_abs_im_H_bound=bound_rec(spH["others_abs_im"]))


# =================================================================================================================
# A4. First Lyapunov coefficient (Kuznetsov's formula as in hh-dynamics, eq. (l1))
# =================================================================================================================
def lyap1(A, F, om, q, w, variant=None):
    """l1 = Re( <p, C(q,q,qb)> - 2 <p, B(q, A^-1 B(q,qb))> + <p, B(qb, (2 i om - A)^-1 B(q,q))> ) / (2 om), with
    A q = i om q, A^T p = -i om p, <p, q> = conj(p)^T q = 1; here w = conj(p), so <p, v> = w^T v (the routine of
    papers/hh-dynamics/code/certify_equilibria_hopf.py, with series given as lists of coefficients). F(v): the 18
    (or n) coefficient lists of f(x0 + t v) (length >= 4), so B(v, v) = 2 [t^2] and C(v, v, v) = 6 [t^3]; B and C at
    different arguments by polarization. variant 'sign' / 'no2iw': mutations for the negative controls only."""
    n = len(q)

    def Bq(v):
        return [2 * s[2] for s in F(v)]

    def Cq(v):
        return [6 * s[3] for s in F(v)]

    def B2(a, bb):
        P = Bq([a[j] + bb[j] for j in range(n)])
        M = Bq([a[j] - bb[j] for j in range(n)])
        return [(P[j] - M[j]) / 4 for j in range(n)]

    qb = [x.conjugate() for x in q]
    P3 = Cq([q[j] + qb[j] for j in range(n)])
    M3 = Cq([q[j] - qb[j] for j in range(n)])
    C3 = Cq(qb)
    Cqqqb = [(P3[j] - M3[j] - 2 * C3[j]) / 6 for j in range(n)]
    s1 = A.solve(colvec(B2(q, qb)))
    M2 = acb_mat([[((2 * I1 * acb(om)) if (r == c and variant != 'no2iw') else acb(0)) - A[r, c] for c in range(n)]
                  for r in range(n)])
    s2 = M2.solve(colvec(Bq(q)))
    t1 = sum((w[j] * Cqqqb[j] for j in range(n)), acb(0))
    t2 = sum((w[j] * y for j, y in enumerate(B2(q, vlist(s1)))), acb(0))
    t3 = sum((w[j] * y for j, y in enumerate(B2(qb, vlist(s2)))), acb(0))
    coef = 2 if variant == 'sign' else -2
    return (t1 + coef * t2 + t3).real / (2 * arb(om))


def lyapunov_at_hopf(cov, prec=192):
    """l1 at (x_e(g_H), g_H) in physical coordinates with <q, q> = 1 (Euclidean, physical units) and <p, q> = 1.
    Inputs from cover_window: the equilibrium enclosure over G_H, A over G_H, the eigenvector enclosures, and
    omega in Im lambda over G_H (at g_H, lambda = i omega exactly)."""
    famH, spH = cov["famH"], cov["spH"]
    with am.precision(prec):
        X = famH["eq_G"]["X"]
        G = _ball_interval(Fraction(cov["gH_interval"][0]), Fraction(cov["gH_interval"][1]))
        sig = [am.SIG[i] for i in range(DIM)]
        Xp = [X[i] * sig[i] for i in range(DIM)]
        Asc = famH["A"]
        Ap = acb_mat([[Asc[i, j] * sig[i] / sig[j] for j in range(DIM)] for i in range(DIM)])
        q = [spH["v"][i] * sig[i] for i in range(DIM)]
        nq = sum(((x * x.conjugate()).real for x in q), arb(0)).sqrt()
        q = [x / nq for x in q]
        pl = [cov["p"][i] / sig[i] for i in range(DIM)]          # left eigenvector: p_l^T A = lambda p_l^T
        s = sum((pl[i] * q[i] for i in range(DIM)), acb(0))
        w = [x / s for x in pl]                                   # w = conj(p), w^T q = 1
        om = spH["lam"].imag
        lam = spH["lam"]

        def F(v):
            return field_jet(Xp, v, 4, G, 0, physical=True, prec=prec)
        l1 = lyap1(Ap, F, om, q, w)
        # scaled-coordinate value with <q, q> = 1 in z (another normalization; same sign)
        qs = list(spH["v"])
        nqs = sum(((x * x.conjugate()).real for x in qs), arb(0)).sqrt()
        qs = [x / nqs for x in qs]
        ss = sum((cov["p"][i] * qs[i] for i in range(DIM)), acb(0))
        ws = [x / ss for x in cov["p"]]

        def Fs(v):
            return field_jet(X, v, 4, G, 0, physical=False, prec=prec)
        l1s = lyap1(Asc, Fs, om, qs, ws)
    return dict(l1=l1, l1_scaled=l1s, omega=om, lam=lam)


def field_jet_dual(x0, u, L, g, prec=128):
    """Taylor coefficients (k < L) in t of f(z + t u; g') with first-order dual numbers in the 19 variables
    (z_0..z_17, g') at z = x0 (scaled), g' = g: a list of 18 lists of arbmodel.Dual (value, gradient dict with keys
    0..17 for z and 18 for g). So [t^0].d[j] = D_z f, [t^1].d[j] = D^2 f[u, e_j], [t^2].d[j] = (1/2) D^3 f[u, u, e_j],
    [t^0].d[18] = f1, [t^1].d[18] = D f1 [u], [t^2].d[18] = (1/2) D^2 f1 [u, u] (all at x0, enclosed over the balls)."""
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(am.params(prec))
        p["g_Ks"] = Jet([am.Dual(am.to_ball(g), {DIM: acb(1)})] + [acb(0)] * (L - 1))
        xs = []
        for k in range(DIM):
            s_ = am.SIG[k]
            xs.append(Jet([am.Dual(am.to_ball(x0[k]) * s_, {k: s_}), am.to_ball(u[k]) * s_] + [acb(0)] * (L - 2)))
        y = fn(xs, p, JetMath, acb(0))
        out = []
        for k, yk in enumerate(y):
            s_ = am.ISIG[k]
            yk = yk if isinstance(yk, Jet) else Jet([am.to_ball(yk)] + [acb(0)] * (L - 1))
            row = []
            for cf in yk.c:
                if isinstance(cf, am.Dual):
                    row.append(am.Dual(cf.v * s_, {kk: vv * s_ for kk, vv in cf.d.items()}))
                else:
                    row.append(am.Dual(cf * s_, {}))
            out.append(row)
    return out


def model_on_jets(xs, gj, prec):
    """Evaluate the model (scaled variables) on input Jets xs (18) and the parameter Jet gj; returns 18 output Jets in
    the scaled variables (outputs multiplied by 2^-e_k exactly)."""
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(am.params(prec))
        p["g_Ks"] = gj
        y = fn([Jet([c * am.SIG[k] for c in xk.c]) for k, xk in enumerate(xs)], p, JetMath, acb(0))
        L = xs[0].L
        out = []
        for k, yk in enumerate(y):
            yk = yk if isinstance(yk, Jet) else Jet([am.to_ball(yk)] + [acb(0)] * (L - 1))
            out.append(Jet([c * am.ISIG[k] for c in yk.c]))
    return out


def curve_point(bt, wt, gt, L, kind, prec):
    """Jets along the centre curve. bt: 18 lists of t-coefficients of the base point b(t); wt: 18 lists of t-coefficients
    of the direction w(t) (or None); gt: t-coefficients of g(t). kind: 'acb' (plain values), 'dual_tau' (first-order dual
    in tau along w(t): x = b(t) + tau w(t)), 'hess' (second-order duals in z_0..z_17, g (18) and tau (19))."""
    H_ = _hess_cls()
    pad = lambda lst: (list(lst) + [acb(0)] * L)[:L]  # noqa: E731  (truncation drops t^k, k >= L: exact for [t^k], k < L)
    xs = []
    for k in range(DIM):
        b = pad(bt[k])
        w = pad(wt[k]) if wt is not None else [acb(0)] * L
        if kind == "acb":
            xs.append(Jet(b))
        elif kind == "dual_tau":
            xs.append(Jet([am.Dual(b[i], {19: w[i]} if not w[i].is_zero() else {}) for i in range(L)]))
        elif kind == "hess":
            cs = []
            for i in range(L):
                g = {}
                if i == 0:
                    g[k] = acb(1)
                if not w[i].is_zero():
                    g[19] = w[i]
                cs.append(H_(b[i], g))
            xs.append(Jet(cs))
        else:
            raise ValueError(kind)
    gl = pad(gt)
    if kind == "hess":
        gj = Jet([H_(gl[0], {18: acb(1)})] + [H_(c) for c in gl[1:]])
    elif kind == "dual_tau":
        gj = Jet([am.Dual(c) for c in gl])
    else:
        gj = Jet(gl)
    return model_on_jets(xs, gj, prec)


# #################################################################################################################
# Part B. The blown-up radii polynomial along a centre curve (LEMMAS-hopf.md, Section B)
# #################################################################################################################
#
# Unknowns x = (omega, g, c, w): omega, g in C, c in C^18, w = (w_m)_{m != 0}, w_m in C^18, ||w_k||_nu =
# sum_{m != 0} |w_{k,m}| nu^|m|. Norm ||x|| = max(|omega|/eta_om, |g|/eta_g, max_k |c_k|/eta_ck, max_k ||w_k||/eta_wk).
# Q(c, u, eps; g) = int_0^1 D_z f(c + s eps u; g) u ds, so eps Q = f(c + eps u) - f(c).
#     N+ = w_{V,1} - 1/2,  N- = w_{V,-1} - 1/2,
#     E_0 = f(c; g) + eps [Q(c, w(.), eps; g)]_0          (= [f(c + eps w(.); g)]_0),
#     E_m = i m omega w_m - [Q(c, w(.), eps; g)]_m,  m != 0.
# DF(x; eps) y, with J = D_z f(c + eps w), Kc = int_0^1 D^2 f(c + s eps w)[w, .] ds, kg = int_0^1 D f1(c + s eps w)[w] ds:
#     E_0 row: [J]_0 y_c + eps [J y_w]_0 + [f1(c + eps w)]_0 y_g
#     E_m row: i m y_om w_m + i m omega y_{w,m} - [J y_w]_m - [Kc]_m y_c - [kg]_m y_g.
# On a piece [e_lo, e_hi] (e_c the midpoint, delta the half width) the centre moves along the line
# xbar(xi) = xbar_c + (xi - e_c) tbar (tbar: an exact float tangent with tbar_{w,V,+-1} = 0). For every xi in the piece:
#     ||A F(xbar(xi); xi)|| <= Y0p + delta Y1 + delta^2 / 2 Y2,     ||I - A DF(xbar(xi); xi)|| <= Z1c + delta Zc,
# Y0p, Z1c at the point e_c, Y1 = ||A d/dxi F|| at e_c, Y2 >= sup ||A d^2/dxi^2 F||, Zc >= sup ||A d/dxi DF|| (Lemma B2),
# and Z2 by the polydisc family (Lemma B3). Pieces are glued at shared endpoints by ball inclusion (Lemma B4).

NC = 2 + 2 * DIM         # norm components: 0 omega, 1 g, 2 + k c_k, 20 + k w_k
CC, CW = 2, 2 + DIM


class Lay:
    """Finite layout of unknowns (and, identically, of residual rows): 0 omega (row N+), 1 g (row N-), 2 + k c_k
    (row E_0k), then w_{k,m} (row E_{k,m}) for k = 0..17 and m = -K..-1, 1..K."""

    def __init__(self, K):
        self.K = K
        self.n = 2 + DIM + 2 * DIM * K
        self.comp = [0, 1] + [CC + k for k in range(DIM)]
        self.mode = [0, 0] + [0] * DIM
        for k in range(DIM):
            for m in self.modes():
                self.comp.append(CW + k)
                self.mode.append(m)

    def modes(self):
        return list(range(-self.K, 0)) + list(range(1, self.K + 1))

    def w(self, k, m):
        K = self.K
        p = m + K if m < 0 else m + K - 1
        return 2 + DIM + 2 * K * k + p


def _ex(v):
    """exact arb from a double / Fraction / exact arb"""
    if isinstance(v, arb):
        if not v.is_exact():
            raise ValueError("not exact")
        return v
    if isinstance(v, Fraction):
        a = arb(fmpq(v.numerator, v.denominator))
        if not a.is_exact():
            raise ValueError("not dyadic")
        return a
    return arb(float(v))


def _sym_rows(rows, K, what):
    out = [[acb(x) for x in row] for row in rows]
    for k in range(DIM):
        if len(out[k]) != 2 * K + 1 or not out[k][K].is_zero():
            raise ValueError(f"{what} needs 2K+1 entries with a zero mode 0")
        for m in range(1, K + 1):
            a, b = out[k][K + m], out[k][K - m]
            if not (a.real.is_exact() and a.imag.is_exact() and a.real == b.real and (a.imag + b.imag).is_zero()):
                raise ValueError(f"{what} not exact and conjugation symmetric")
    return out


class Centre:
    """Exact centre (omega, g, c, w) at eps = e_c and exact tangent (tom, tg, tc, tw); w[k][m + K] acb, mode 0 zero,
    conjugation symmetric, w_{V,1} = 1/2 exactly; tw likewise with tw_{V,+-1} = 0 exactly."""

    def __init__(self, om, g, c, w, tom, tg, tc, tw, K):
        self.K = K
        self.om, self.g = _ex(om), _ex(g)
        self.c = [_ex(v) for v in c]
        self.w = _sym_rows(w, K, "w")
        self.tom, self.tg = _ex(tom), _ex(tg)
        self.tc = [_ex(v) for v in tc]
        self.tw = _sym_rows(tw, K, "tw")
        if not (self.w[IV][K + 1].real == arb(fmpq(1, 2)) and self.w[IV][K + 1].imag.is_zero()):
            raise ValueError("w_{V,1} must be exactly 1/2")
        if not self.tw[IV][K + 1].is_zero():
            raise ValueError("tw_{V,1} must be exactly 0")
        if not self.om > 0:
            raise ValueError("omega_bar must be positive")

    def trig(self):
        return fe.TrigPoly(self.w)

    def trig36(self):
        return fe.TrigPoly(self.w + self.tw)

    def to_record(self):
        t = _dyadic_text
        K = self.K

        def rows(W):
            return [[[t(W[k][K + m].real), t(W[k][K + m].imag)] for m in range(1, K + 1)] for k in range(DIM)]
        return dict(K=K, omega=t(self.om), g=t(self.g), c=[t(v) for v in self.c], w=rows(self.w),
                    t_omega=t(self.tom), t_g=t(self.tg), t_c=[t(v) for v in self.tc], t_w=rows(self.tw))

    @staticmethod
    def from_record(r):
        K = r["K"]
        d = _dyadic_from_text

        def rows(R):
            out = []
            for k in range(DIM):
                row = [acb(0)] * (2 * K + 1)
                for m in range(1, K + 1):
                    re, im = d(R[k][m - 1][0]), d(R[k][m - 1][1])
                    row[K + m] = acb(re, im)
                    row[K - m] = acb(re, -im)
                out.append(row)
            return out
        return Centre(d(r["omega"]), d(r["g"]), [d(s) for s in r["c"]], rows(r["w"]),
                      d(r["t_omega"]), d(r["t_g"]), [d(s) for s in r["t_c"]], rows(r["t_w"]), K)

    def digest(self):
        return hashlib.sha256(json.dumps(self.to_record(), sort_keys=True).encode()).hexdigest()


def curve_at(C, e_c, xi, prec=256):
    """xbar(xi) = xbar_c + (xi - e_c) tbar as balls (omega, g, c (18), w (18 x (2K+1)))."""
    with am.precision(prec):
        d = _arb_q(Fraction(xi) - Fraction(e_c))
        K = C.K
        om = C.om + d * C.tom
        g = C.g + d * C.tg
        c = [C.c[k] + d * C.tc[k] for k in range(DIM)]
        w = [[C.w[k][t] + d * C.tw[k][t] for t in range(2 * K + 1)] for k in range(DIM)]
    return om, g, c, w


def _dyadic_text(x):
    import centre as ct
    return ct.dyadic_to_text(x)


def _dyadic_from_text(s):
    import centre as ct
    return ct.text_to_dyadic(s)


# ------------------------------------------------------------------------------------------------ float (untrusted)
class FloatEps:
    """Untrusted float Galerkin-Newton for the blown-up problem at a given eps > 0 (complex layout of Lay)."""

    def __init__(self, K, Mc=96):
        self.K, self.Mc = K, Mc
        self.lay = Lay(K)
        th = 2 * np.pi * np.arange(Mc) / Mc
        self.ms = np.array(self.lay.modes())
        self.E = np.exp(1j * np.outer(self.ms, th))           # (2K) x Mc
        self.allm = np.arange(-(2 * K + 2), 2 * K + 3)
        self.Eall = np.exp(-1j * np.outer(self.allm, th)) / Mc  # DFT rows

    def unpack(self, u):
        lay, K = self.lay, self.K
        om, g = u[0], u[1]
        c = u[2:2 + DIM]
        w = u[2 + DIM:].reshape(DIM, 2 * K)
        return om, g, c, w

    def pack(self, om, g, c, w):
        return np.concatenate([[om, g], c, w.reshape(-1)]).astype(complex)

    def dft(self, X):              # X: (..., Mc) -> dict m -> (...)
        Y = X @ self.Eall.T
        return {int(m): Y[..., i] for i, m in enumerate(self.allm)}

    def data(self, u, e):
        import branch as br
        om, g, c, w = self.unpack(u)
        c = c.real
        g = float(g.real)
        phi = c[:, None] + e * np.real(w @ self.E)
        h = br.fs(phi, g)
        Jn = br.jac_f(phi, g)                                   # Mc x 18 x 18
        hc = br.fs(c[:, None], g)[:, 0]
        Jc = br.jac_f(c[:, None], g)[0]
        f1 = br.f1_f(phi)
        f1c = br.f1_f(c[:, None])[:, 0]
        Q = (h - hc[:, None]) / e
        Kc = (Jn - Jc[None]) / e
        kg = (f1 - f1c[:, None]) / e
        return dict(hc=hc, Q=self.dft(Q), J=self.dft(np.transpose(Jn, (1, 2, 0))),
                    Kc=self.dft(np.transpose(Kc, (1, 2, 0))), f1=self.dft(f1), kg=self.dft(kg))

    def residual(self, u, e, d=None):
        d = d or self.data(u, e)
        lay, K = self.lay, self.K
        om, g, c, w = self.unpack(u)
        R = np.zeros(lay.n, complex)
        R[0] = w[IV, lay.w(IV, 1) - lay.w(IV, -K)] - 0.5
        R[1] = w[IV, lay.w(IV, -1) - lay.w(IV, -K)] - 0.5
        R[2:2 + DIM] = d["hc"] + e * d["Q"][0]
        for k in range(DIM):
            for t, m in enumerate(self.ms):
                R[lay.w(k, m)] = 1j * m * om * w[k, t] - d["Q"][int(m)][k]
        return R

    def galerkin(self, u, e, d=None):
        d = d or self.data(u, e)
        lay, K = self.lay, self.K
        om, g, c, w = self.unpack(u)
        G = np.zeros((lay.n, lay.n), complex)
        G[0, lay.w(IV, 1)] = 1
        G[1, lay.w(IV, -1)] = 1
        for k in range(DIM):
            r = 2 + k
            G[r, 1] = d["f1"][0][k]
            G[r, 2:2 + DIM] = d["J"][0][k]
            for j in range(DIM):
                for mp in self.ms:
                    G[r, lay.w(j, mp)] = e * d["J"][int(-mp)][k, j]
        for k in range(DIM):
            for t, m in enumerate(self.ms):
                r = lay.w(k, m)
                G[r, 0] = 1j * m * w[k, t]
                G[r, 1] = -d["kg"][int(m)][k]
                G[r, 2:2 + DIM] = -d["Kc"][int(m)][k]
                for j in range(DIM):
                    for mp in self.ms:
                        G[r, lay.w(j, mp)] = -d["J"][int(m - mp)][k, j]
                G[r, r] += 1j * m * om
        return G

    def symmetrize(self, u):
        lay, K = self.lay, self.K
        om, g, c, w = self.unpack(u)
        w = w.copy()
        for t, m in enumerate(self.ms):
            if m > 0:
                tm = list(self.ms).index(-m)
                avg = 0.5 * (w[:, t] + np.conj(w[:, tm]))
                w[:, t] = avg
                w[:, tm] = np.conj(avg)
        return self.pack(om.real, g.real, c.real, w)

    def newton(self, u, e, iters=12, tol=1e-14):
        nr = math.inf
        for _ in range(iters):
            d = self.data(u, e)
            R = self.residual(u, e, d)
            nr = float(np.abs(R).max())
            if nr < tol:
                break
            G = self.galerkin(u, e, d)
            u = self.symmetrize(u - np.linalg.solve(G, R))
        return u, nr

    def initial(self, fh):
        """eps -> 0 limit: the Hopf equilibrium and eigenvector, normalized w_{V,1} = 1/2."""
        lay, K = self.lay, self.K
        J = fh.J
        ev, V = np.linalg.eig(J)
        i = int(np.argmin(np.abs(ev - 1j * fh.omega)))
        v = V[:, i] / V[IV, i] * 0.5
        w = np.zeros((DIM, 2 * K), complex)
        w[:, list(self.ms).index(1)] = v
        w[:, list(self.ms).index(-1)] = np.conj(v)
        return self.pack(fh.omega, fh.g, fh.x, w)

    def tangent(self, u, e, h=1e-6):
        """Untrusted float tangent du/deps at the solution u (central difference of Newton solutions)."""
        up_, _ = self.newton(u, e + h)
        um_, _ = self.newton(u, e - h)
        return (up_ - um_) / (2 * h)

    def to_centre(self, u, t):
        """Exact centre from u and tangent t: doubles, exact symmetry, w_{V,+-1} = 1/2, tw_{V,+-1} = 0 exactly."""
        lay, K = self.lay, self.K
        om, g, c, w = self.unpack(self.symmetrize(u))
        tom, tg, tc, tw = self.unpack(self.symmetrize(t))

        def rows(W, fix):
            out = []
            for k in range(DIM):
                row = [acb(0)] * (2 * K + 1)
                for m in range(1, K + 1):
                    z = complex(W[k, list(self.ms).index(m)])
                    if k == IV and m == 1:
                        z = fix
                    row[K + m] = acb(z.real, z.imag)
                    row[K - m] = acb(z.real, -z.imag)
                out.append(row)
            return out
        return Centre(float(om.real), float(g.real), [float(v) for v in c.real], rows(w, 0.5 + 0j),
                      float(tom.real), float(tg.real), [float(v) for v in tc.real], rows(tw, 0j), K)

    def from_centre(self, C):
        """Float vector of an exact centre, padded with zeros (or truncated) to this K (untrusted start for Newton)."""
        K = self.K
        w = np.zeros((DIM, 2 * K), complex)
        for k in range(DIM):
            for t, m in enumerate(self.ms):
                if abs(m) > C.K:
                    continue
                z = C.w[k][C.K + m]
                w[k, t] = complex(float(z.real.mid()), float(z.imag.mid()))
        return self.pack(float(C.om.mid()), float(C.g.mid()), [float(v.mid()) for v in C.c], w)


# ------------------------------------------------------------------------------------------------ Lemma B3 data
NH = DIM * (DIM + 1) // 2
HP = [(j, l) for j in range(DIM) for l in range(j, DIM)]
HPI = {p: i for i, p in enumerate(HP)}


def hess19(z, prm, prec=53):
    """Black box for the cover: Hess (branch.Hess) of f in the 19 variables (z_0..z_17, g), at the box z (scaled)
    with g = prm['g_Ks'] (a ball). Output: f (18), D_z f (324, row-major), D_z^2 f (18 x 171, pairs j <= l),
    f1 = d f / dg (18), D_z f1 (324). Every entry is enclosed over the box; finite output certifies the domain."""
    import branch as br
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(prm)
        p["g_Ks"] = br.Hess(am.to_ball(p["g_Ks"]), {DIM: acb(1)})
        x = [br.Hess(am.to_ball(zi) * s, {k: s}) for k, (zi, s) in enumerate(zip(z, am.SIG))]
        y = fn(x, p, br.HessMath, acb(0))
        zero = acb(0)
        F, Jz, Hz, f1, Jg = [], [], [], [], []
        for k, yk in enumerate(y):
            yk = br._lift(yk) if not isinstance(yk, br.Hess) else yk
            s = am.ISIG[k]
            F.append(yk.v * s)
            Jz.extend(yk.g.get(j, zero) * s for j in range(DIM))
            Hz.extend(yk.h.get(pp, zero) * s for pp in HP)
            f1.append(yk.g.get(DIM, zero) * s)
            Jg.extend(yk.h.get((j, DIM), zero) * s for j in range(DIM))
    return F + Jz + Hz + f1 + Jg


def _curve_boxes(C, e_lo, e_hi):
    """Balls containing c(xi), g(xi) and w(xi)_m for xi in [e_lo, e_hi] (e_c the midpoint): centre +- delta |tangent|."""
    ec = (Fraction(e_lo) + Fraction(e_hi)) / 2
    dl = up(_arb_q((Fraction(e_hi) - Fraction(e_lo)) / 2))
    K = C.K
    c = [C.c[k] + dl * C.tc[k].abs_upper() * arb(0, 1) for k in range(DIM)]
    g = C.g + dl * C.tg.abs_upper() * arb(0, 1)
    wabs = [[up(C.w[k][K + m].abs_upper() + dl * C.tw[k][K + m].abs_upper()) for m in range(1, K + 1)]
            for k in range(DIM)]
    return ec, dl, c, g, wabs


class EpsCover:
    """Lemma B3 data for a group of pieces (C, e_lo, e_hi): the family Phi = {c + sigma w(theta) + zeta : (c, w) on a
    piece's centre curve, |sigma| <= T, |zeta_i| <= R_i}, theta in the closed strip |Im theta| <= rho2, g in the complex
    disc of radius G_R about the hull of the curves' g, realised as ONE trigonometric polynomial with ball coefficients:
    mode 0 = hull of the curves' c + the complex box of half-width R_i; mode m != 0 = the complex box of half-width
    T max (|w_{k,m}| + delta |tw_{k,m}|) about 0 (it contains sigma w(xi)_{k,m} for |sigma| <= T). A full strip cover
    (fourier_eval Lemma 1) of hess19 gives exact upper bounds MJ_kj >= sup |D_z f|, MH_kjl >= sup |D_z^2 f|,
    MF1_k >= sup |f1|, MG_kj >= sup |D_z f1| over the family, and certifies that f(.; g) is holomorphic on a
    neighbourhood of it for every g in the disc."""

    def __init__(self, pieces, T, R, G_R, rho2="1", nx=16, rtol=1.0, max_evals=1500, log=print):
        C0 = pieces[0][0]
        K = C0.K
        self.K = K
        self.T = _arb_q(T)
        self.T_text = str(T)
        self.R = [_arb_q(r) for r in R]
        self.R_text = [str(r) for r in R]
        self.G_R = _arb_q(G_R)
        self.G_R_text = str(G_R)
        self.rho2 = _arb_q(rho2)
        self.rho2_text = str(rho2)
        if not (self.T.is_exact() and self.rho2.is_exact() and all(r.is_exact() for r in self.R) and self.G_R.is_exact()):
            raise ValueError("T, R, G_R, rho2 must be exact dyadics")
        t0 = time.time()
        old = ctx.prec
        ctx.prec = 128
        try:
            chull, ghull, wmax = None, None, None
            for (C, a, b) in pieces:
                if C.K != K:
                    raise ValueError("pieces with different K")
                _, _, cb, gb, wabs = _curve_boxes(C, a, b)
                chull = cb if chull is None else [x.union(y) for x, y in zip(chull, cb)]
                ghull = gb if ghull is None else ghull.union(gb)
                wmax = wabs if wmax is None else [[amax(x, y) for x, y in zip(r1, r2)] for r1, r2 in zip(wmax, wabs)]
            coeffs = [[None] * (2 * K + 1) for _ in range(DIM)]
            for k in range(DIM):
                coeffs[k][K] = acb(chull[k] + self.R[k] * arb(0, 1), self.R[k] * arb(0, 1))
                for m in range(1, K + 1):
                    rad = up(self.T * wmax[k][m - 1])
                    coeffs[k][K + m] = acb(arb(0, rad), arb(0, rad))
                    coeffs[k][K - m] = acb(arb(0, rad), arb(0, rad))
            self.g_ball = acb(ghull + self.G_R * arb(0, 1), self.G_R * arb(0, 1))
        finally:
            ctx.prec = old
        self.coeffs = coeffs
        for (C, a, b) in pieces:
            if not self.contains(C, a, b):
                raise ProofFailure("internal: a piece is not in the cover family")
        phi = fe.TrigPoly(coeffs)
        prm = am.params(53)
        prm["g_Ks"] = self.g_ball
        fn = lambda z: hess19(z, prm, 53)  # noqa: E731
        sp = fe.strip_sup(fn, phi, self.rho2, nx=nx, rtol=rtol, atol=0.0, max_evals=max_evals)
        if not sp.full_strip:
            raise ProofFailure("cover is not the full strip")
        S = sp.S
        o = 0
        self.Mf = S[o:o + DIM]
        o += DIM
        self.MJ = [[S[o + DIM * k + j] for j in range(DIM)] for k in range(DIM)]
        o += DIM * DIM
        self.MH = [[S[o + NH * k + p] for p in range(NH)] for k in range(DIM)]
        o += DIM * NH
        self.MF1 = S[o:o + DIM]
        o += DIM
        self.MG = [[S[o + DIM * k + j] for j in range(DIM)] for k in range(DIM)]
        self.strip = sp
        self.digest = phi.digest()
        self.seconds = time.time() - t0
        log(f"  cover: T = {T}, {len(pieces)} piece(s), {sp.n_evals} boxes, {self.seconds:.1f} s; max_k sum MH = "
            f"{max(float(sum(r, arb(0))) for r in self.MH):.3e}")

    def H(self, k, j, l):
        return self.MH[k][HPI[(j, l) if j <= l else (l, j)]]

    def contains(self, C, e_lo, e_hi):
        """The piece's centre curve lies in the family: c(xi) in the mode-0 box shrunk by R, T (|w_m| + delta |tw_m|)
        <= the box half-width, g(xi) in the g disc, and e_hi <= T."""
        K = self.K
        if C.K != K or not _arb_q(e_hi) <= self.T:
            return False
        _, _, cb, gb, wabs = _curve_boxes(C, e_lo, e_hi)
        for k in range(DIM):
            box = self.coeffs[k][K]
            inner = acb(box.real.mid() + (box.real.rad() - self.R[k]) * arb(0, 1))
            if not inner.real.contains(cb[k]):
                return False
            for m in range(1, K + 1):
                if not up(self.T * wabs[k][m - 1]) <= self.coeffs[k][K + m].real.rad():
                    return False
        gin = self.g_ball.real.mid() + (self.g_ball.real.rad() - self.G_R) * arb(0, 1)
        return bool(gin.contains(gb))

    def record(self):
        return dict(T=self.T_text, R=self.R_text, G_R=self.G_R_text, rho2=self.rho2_text, digest=self.digest,
                    n_evals=self.strip.n_evals, n_leaves=self.strip.n_leaves, n_unresolved=self.strip.n_unresolved,
                    full_strip=self.strip.full_strip, seconds=round(self.seconds, 1),
                    MH_row_sums=[float(sum(r, arb(0))) for r in self.MH],
                    MJ_row_sums=[float(sum(r, arb(0))) for r in self.MJ])


# ------------------------------------------------------------------------------------------------ the proof on a piece
PIECE_DEFAULTS = dict(rho0="1/8", L=8, M=64, prec_Q=192, prec_J=128, prec_mat=128, theta_target="1/2",
                      n_explicit=12, nsub_xi=4, nsub_s=4, box_nx=16, box_max_evals=400)


def _node_rows(phi, M, prec):
    with fe.precision(prec):
        roots = [fe._root_of_unity(r, M) for r in range(M)]
        rows = [[roots[(m * j) % M] for m in range(-phi.K, phi.K + 1)] for j in range(M)]
        return phi.eval_rows(rows)


def _enclose(nodes_vals, S, rho, M, Kp, prec):
    """fourier_eval Lemma 3 / Theorem: coefficient balls |k| <= K' from node values and sup bounds S (exact arbs)."""
    C_hat = fe.aliased_dft(nodes_vals, Kp, prec=prec)
    return fe.enclose_coefficients(C_hat, S, rho, M, Kp, prec=prec)


def _hull(a, b):
    return acb(a.real.union(b.real), a.imag.union(b.imag))


def _hull_list(A_, B_):
    return list(B_) if A_ is None else [_hull(x, y) for x, y in zip(A_, B_)]


def _box_sup(fn, phi, rho, st):
    """Strip sup (fourier_eval Lemma 1) of a black box, accepting the first finite cover (the bounds feed only aliasing
    and Cauchy tails); raises ProofFailure if the cover is not the full strip."""
    sp = fe.strip_sup(fn, phi, rho, nx=int(st["box_nx"]), rtol=1e30, atol=0.0, max_evals=int(st["box_max_evals"]))
    if not sp.full_strip:
        raise ProofFailure("strip cover of a curve function is not the full strip")
    return sp


class _CurveFns:
    """The node functions along the centre curve (LEMMAS-hopf.md, Lemma B2). For a node value z36 = (u, v) =
    (w(theta), tw(theta)) and balls Xi (for xi), S (for s):
      point (xi = e_c exactly):  phi(t) = cbar + t tc + (e_c + t)(u + t v), g(t) = gbar + t tg;
          Y1: [t] of f(phi(t); g(t)) and [t] of Q(t) = (f(phi(t)) - f(cbar(t))) / (e_c + t)
      curve (xi in Xi, d = xi - e_c): cbar(xi) = cbar + d tc, W0 = u + d v, g(xi) = gbar + d tg,
          b(s, t) = cbar(xi) + s xi W0 + t (tc + s (W0 + xi v)) + t^2 s v,  w(t) = W0 + t v,  g(t) = g(xi) + t tg:
          Y2: 2 [t^2] f(b(1, t)) and 2 [t^2] D f(b(s, t)) w(t)   (dual number in tau along w(t))
          Zc: [t^0], [t^1] of D_z f(b(1, t)), [t^1] of f1(b(1, t)), [t^1] of D^2 f(b(s,t))[w(t), .] and of
              D f1(b(s,t))[w(t)]   (second-order duals in z, g, tau)."""

    def __init__(self, C, e_lo, e_hi, prec):
        self.C, self.prec = C, prec
        self.elo, self.ehi = Fraction(e_lo), Fraction(e_hi)
        self.ec = (self.elo + self.ehi) / 2
        self.ecB = _arb_q(self.ec)
        self.cbar = [acb(v) for v in C.c]
        self.tc = [acb(v) for v in C.tc]
        self.gbar, self.tg = acb(C.g), acb(C.tg)
        with am.precision(prec):
            # f(cbar(t); g(t)) does not depend on theta: once
            bt = [[self.cbar[k], self.tc[k]] for k in range(DIM)]
            self.F0 = curve_point(bt, None, [self.gbar, self.tg], 2, "acb", prec)

    def y1(self, z):
        u, v = z[:DIM], z[DIM:]
        ec = self.ecB
        bt = [[self.cbar[k] + ec * u[k], self.tc[k] + u[k] + ec * v[k], v[k]] for k in range(DIM)]
        F1 = curve_point(bt, None, [self.gbar, self.tg], 2, "acb", self.prec)
        den = Jet([acb(ec), acb(1)])
        out = [F1[k].c[1] for k in range(DIM)]
        for k in range(DIM):
            q = (F1[k] - self.F0[k]) / den
            out.append(q.c[1])
        return out

    def _base(self, z, Xi):
        u, v = z[:DIM], z[DIM:]
        d = Xi - self.ecB
        cx = [self.cbar[k] + d * self.tc[k] for k in range(DIM)]
        W0 = [u[k] + d * v[k] for k in range(DIM)]
        gx = self.gbar + d * self.tg
        return u, v, cx, W0, gx

    def _bt(self, cx, W0, v, Xi, s):
        return [[cx[k] + s * Xi * W0[k], self.tc[k] + s * (W0[k] + Xi * v[k]), s * v[k]] for k in range(DIM)]

    def y2(self, z, Xi, Ss):
        u, v, cx, W0, gx = self._base(z, Xi)
        wt = [[W0[k], v[k]] for k in range(DIM)]
        J1 = curve_point(self._bt(cx, W0, v, Xi, acb(1)), wt, [gx, self.tg], 3, "dual_tau", self.prec)
        out = [2 * J1[k].c[2].v for k in range(DIM)]
        acc = None
        for S_ in Ss:
            Js = curve_point(self._bt(cx, W0, v, Xi, S_), wt, [gx, self.tg], 3, "dual_tau", self.prec)
            acc = _hull_list(acc, [2 * Js[k].c[2].d.get(19, acb(0)) for k in range(DIM)])
        return out + acc

    def zc(self, z, Xi, Ss):
        u, v, cx, W0, gx = self._base(z, Xi)
        wt = [[W0[k], v[k]] for k in range(DIM)]
        zero = acb(0)
        H1 = curve_point(self._bt(cx, W0, v, Xi, acb(1)), wt, [gx, self.tg], 2, "hess", self.prec)
        J = [H1[k].c[0].g.get(j, zero) for k in range(DIM) for j in range(DIM)]
        Jp = [H1[k].c[1].g.get(j, zero) for k in range(DIM) for j in range(DIM)]
        f1p = [H1[k].c[1].g.get(DIM, zero) for k in range(DIM)]
        acc = None
        for S_ in Ss:
            Hs = curve_point(self._bt(cx, W0, v, Xi, S_), wt, [gx, self.tg], 2, "hess", self.prec)
            vals = [Hs[k].c[1].h.get((j, 19), zero) for k in range(DIM) for j in range(DIM)]
            vals += [Hs[k].c[1].h.get((DIM, 19), zero) for k in range(DIM)]
            acc = _hull_list(acc, vals)
        return J + Jp + f1p + acc


def _wsup(C, dl, rho2):
    """W_l >= sup_{|Im theta| <= rho2, xi in the piece} |w(xi)_l(theta)| = sum_m (|w_{l,m}| + delta |tw_{l,m}|) e^{rho2 |m|}."""
    K = C.K
    out = []
    for l in range(DIM):
        s = arb(0)
        for m in range(1, K + 1):
            s += 2 * (C.w[l][K + m].abs_upper() + dl * C.tw[l][K + m].abs_upper()) * (rho2 * m).exp()
        out.append(up(s))
    return out


def piece_blocks(C, e_lo, e_hi, cov, *, settings=None, log=print, label=None):
    """Every weight-free rigorous ingredient of the radii polynomial on the piece [e_lo, e_hi] (exact decimals or
    Fractions) for the exact centre C (at the midpoint e_c) and tangent, with the strip sups of the point data from the
    cover cov (Lemma B3). LEMMAS-hopf.md, Lemma B2, states the bounds assembled here."""
    st = dict(PIECE_DEFAULTS)
    st.update(settings or {})
    marks = {}
    t0 = time.time()
    tl = [t0]

    def mark(name):
        t = time.time()
        marks[name] = round(t - tl[0], 1)
        tl[0] = t
    K = C.K
    lay = Lay(K)
    n = lay.n
    Kp = 2 * K + int(st["L"])
    Mn = int(st["M"])
    if not Kp < Mn:
        raise ValueError("need K' < M")
    PQ, PM = int(st["prec_Q"]), int(st["prec_mat"])
    elo, ehi = Fraction(e_lo), Fraction(e_hi)
    if not (0 <= elo < ehi):
        raise ValueError("need 0 <= e_lo < e_hi")
    ec = (elo + ehi) / 2
    if not cov.contains(C, elo, ehi):
        raise ProofFailure("piece not in the cover family")
    old = ctx.prec
    ctx.prec = PQ
    try:
        rho0 = _arb_q(st["rho0"])
        rho2 = cov.rho2
        nu = rho0.exp()
        q = nu * (-rho2).exp()
        if not (rho2 > rho0 and q < 1):
            raise ProofFailure("need rho2 > rho0 and nu e^{-rho2} < 1")
        Q2 = (1 + q) / (1 - q)
        tailK = 2 * q ** (Kp + 1) / (1 - q)
        nupow = [nu ** j for j in range(Kp + 2 * K + 4)]
        ecb = _arb_q(ec)
        delta = up(_arb_q((ehi - elo) / 2))
        ehiB = _arb_q(ehi)
        Tm = cov.T - ehiB                              # T - e_hi > 0
        if not Tm > 0:
            raise ProofFailure("T - e_hi not positive")
        Wl = _wsup(C, delta, rho2)
        MJ, MF1 = cov.MJ, cov.MF1
        # strip sups (Lemma B3 (b)) of the point-data functions of the centre at e_c
        HW = [[up(sum((cov.H(k, j, l) * Wl[l] for l in range(DIM)), arb(0))) for j in range(DIM)] for k in range(DIM)]
        GW = [up(sum((cov.MG[k][l] * Wl[l] for l in range(DIM)), arb(0))) for k in range(DIM)]
        S_Q = [up(sum((MJ[k][j] * Wl[j] for j in range(DIM)), arb(0))) for k in range(DIM)]
        S_J = [[MJ[k][j] for j in range(DIM)] for k in range(DIM)]
        S_Kc = HW
        S_f1 = list(MF1)
        S_kg = GW
    finally:
        ctx.prec = old

    phi = C.trig()
    cbar = [acb(v) for v in C.c]
    # ---- point data at e_c: Q, J, Kc, f1, kg at the M nodes (one dual evaluation per node)
    prmQ = am.params(PQ, g_Ks=acb(C.g))
    with am.precision(PQ):
        f0, J0c, P0 = am.f_and_df(cbar, prmQ, prec=PQ, wrt=("g_Ks",))
        nodes = _node_rows(phi, Mn, PQ)
        vals = []
        for z in nodes:
            x = [cbar[k] + ecb * z[k] for k in range(DIM)]
            fx, Jx, Px = am.f_and_df(x, prmQ, prec=PQ, wrt=("g_Ks",))
            Qv = [(fx[k] - f0[k]) / ecb for k in range(DIM)]
            Jv = [Jx[k, j] for k in range(DIM) for j in range(DIM)]
            Kv = [(Jx[k, j] - J0c[k, j]) / ecb for k in range(DIM) for j in range(DIM)]
            f1v = [Px[k, 0] for k in range(DIM)]
            kgv = [(Px[k, 0] - P0[k, 0]) / ecb for k in range(DIM)]
            vals.append(Qv + Jv + Kv + f1v + kgv)
        S_all = S_Q + [S_J[k][j] for k in range(DIM) for j in range(DIM)] + \
            [S_Kc[k][j] for k in range(DIM) for j in range(DIM)] + S_f1 + S_kg
        enc = _enclose(vals, S_all, rho2, Mn, Kp, PQ)
    mark("point data")
    o = 0
    encQ = enc[o:o + DIM]
    o += DIM
    encJ = enc[o:o + DIM * DIM]
    o += DIM * DIM
    encK = enc[o:o + DIM * DIM]
    o += DIM * DIM
    encf1 = enc[o:o + DIM]
    o += DIM
    enckg = enc[o:o + DIM]

    def M_(enc_, nn):
        return [[enc_[DIM * k + j][nn + Kp] for j in range(DIM)] for k in range(DIM)]
    J = {nn: M_(encJ, nn) for nn in range(-Kp, Kp + 1)}

    # ---- Galerkin matrix at e_c and A_fin
    ctx.prec = PM
    try:
        D = acb_mat(n, n)
        D[0, lay.w(IV, 1)] = acb(1)
        D[1, lay.w(IV, -1)] = acb(1)
        for k in range(DIM):
            r = CC + k
            D[r, 1] = encf1[k][Kp]
            for j in range(DIM):
                D[r, CC + j] = J[0][k][j]
                for mp in lay.modes():
                    D[r, lay.w(j, mp)] = ecb * J[-mp][k][j]
        for m in lay.modes():
            Km = M_(encK, m)
            for k in range(DIM):
                r = lay.w(k, m)
                D[r, 0] = acb(0, m) * C.w[k][K + m]
                D[r, 1] = -enckg[k][m + Kp]
                for j in range(DIM):
                    D[r, CC + j] = -Km[k][j]
                    for mp in lay.modes():
                        D[r, lay.w(j, mp)] = -J[m - mp][k][j]
                D[r, r] += acb(0, m) * acb(C.om)
        Dm = np_from_mat(D)
        Afin = mat_from_np(np.linalg.inv(Dm))
        Bff = ex._identity(n) - Afin * D
    finally:
        ctx.prec = old
    mark("galerkin")

    ctx.prec = PQ
    try:
        WR = arb_mat(NC, n)
        for i in range(n):
            WR[lay.comp[i], i] = up(nupow[abs(lay.mode[i])])

        def colsup(Mabs, scale_by_mode=False):
            """B[c][c'] = max over columns j of component c' of (row-weighted column sum over the rows of c) / nu^|m_j|."""
            cs = WR * Mabs
            B = [[arb(0)] * NC for _ in range(NC)]
            for j in range(n):
                cp, m = lay.comp[j], lay.mode[j]
                for c in range(NC):
                    v = cs[c, j] / nupow[abs(m)]
                    if scale_by_mode:
                        v = v * abs(m)
                    B[c][cp] = amax(B[c][cp], up(v))
            return B
        Z1_ff = colsup(ex._abs_mat(Bff))
        Aabs = ex._abs_mat(Afin)
        NA = colsup(Aabs)             # residual input blocks: 0 N+, 1 N-, 2 + k E_0k, 20 + k E_k
        NA1 = colsup(Aabs, scale_by_mode=True)
        Lw = int(st["L"])
        cols = [(j, mp) for j in range(DIM) for mp in list(range(K + 1, K + Lw + 1)) + list(range(-K - Lw, -K))]
        mb = K + Lw + 1
        colsb = [(j, sg * mb) for j in range(DIM) for sg in (1, -1)]
        er = (-rho2).exp()

        def finite_tail(colfun, majorant):
            """Finite rows x tail columns (w_{j,m'}, |m'| > K): explicit for K < |m'| <= K + L (colfun(j, m') -> list
            of n balls), the majorant columns at |m'| = K + L + 1 (majorant(j, m') -> list of n exact upper bounds,
            each proportional to e^{-rho2 |m'|} times a constant: the weighted sum / nu^|m'| decreases in |m'|)."""
            Wm = acb_mat(n, len(cols))
            for t, (j, mp) in enumerate(cols):
                col = colfun(j, mp)
                for i in range(n):
                    if col[i] is not None:
                        Wm[i, t] = col[i]
            with fe.precision(PM):
                AW = Afin * Wm
            cW = WR * ex._abs_mat(AW)
            out = [[arb(0)] * DIM for _ in range(NC)]
            for t, (j, mp) in enumerate(cols):
                for c in range(NC):
                    out[c][j] = amax(out[c][j], up(cW[c, t] / nupow[abs(mp)]))
            Wb = arb_mat(n, len(colsb))
            for t, (j, mp) in enumerate(colsb):
                col = majorant(j, mp)
                for i in range(n):
                    if col[i] is not None:
                        Wb[i, t] = col[i]
            cWb = WR * (Aabs * Wb)
            for t, (j, mp) in enumerate(colsb):
                for c in range(NC):
                    out[c][j] = amax(out[c][j], up(cWb[c, t] / nupow[abs(mp)]))
            return out

        def col_J(j, mp):
            col = [None] * n
            for k in range(DIM):
                col[CC + k] = ecb * J[-mp][k][j]
                for m in lay.modes():
                    col[lay.w(k, m)] = -J[m - mp][k][j]
            return col

        def maj_J(j, mp):
            col = [None] * n
            for k in range(DIM):
                col[CC + k] = up(ecb * S_J[k][j] * er ** abs(mp))
                for m in lay.modes():
                    col[lay.w(k, m)] = up(S_J[k][j] * er ** abs(m - mp))
            return col
        Z1_ft = finite_tail(col_J, maj_J)
        mark("Z1 finite")
        # ---- tail resolvents A_m = (i m om - J0hat)^-1, |m| > K (existence._tail_bounds with N = 1: no damping)
        J0hat = acb_mat([[acb(J[0][k][j].real.mid()) for j in range(DIM)] for k in range(DIM)])
        Jp = {nn: acb_mat([[J[nn][k][j] - (J0hat[k, j] if nn == 0 else 0) for j in range(DIM)] for k in range(DIM)])
              for nn in range(-Kp, Kp + 1)}
        stt = dict(theta_target=st["theta_target"], n_explicit=st["n_explicit"])
        with fe.precision(PM):
            tail = ex._tail_bounds(K, Kp, C.om, J0hat, Jp, {}, 1, stt, nupow, lambda s: None)
        Abar0, Abar1, Cn, Aex = tail["Abar0"], tail["Abar1"], tail["C"], tail["A_explicit"]
        Ab0 = arb_mat(Abar0)

        def conv_tail(enc_, S_):
            """sum_j Abar0_cj (sum_{|n| <= K'} |G_{n,jk}| nu^|n| + S_jk tailK): tail rows of a convolution by G."""
            out = [[arb(0)] * DIM for _ in range(DIM)]
            for k in range(DIM):
                for j in range(DIM):
                    s_ = sum((enc_[DIM * j + k][nn + Kp].abs_upper() * nupow[abs(nn)] for nn in range(-Kp, Kp + 1)),
                             arb(0)) + S_[j][k] * tailK
                    for c in range(DIM):
                        out[c][k] = out[c][k] + Abar0[c][j] * s_
            return [[up(v) for v in row] for row in out]

        def col_tail(encM, encv, SM, Sv):
            """Tail rows of a c-column (matrix coefficients encM_m) and a g-column (vector encv_m)."""
            Tc_ = [[arb(0)] * DIM for _ in range(DIM)]
            Tg_ = [arb(0)] * DIM
            for m in range(K + 1, Kp + 1):
                Am = Aex.get(m)
                for sgn in (1, -1):
                    mm = sgn * m
                    Km = acb_mat(M_(encM, mm))
                    kgm = colvec([encv[k][mm + Kp] for k in range(DIM)])
                    if Am is not None:
                        Asg = Am if sgn == 1 else Am.conjugate()
                        PK = ex._abs_mat(Asg * Km)
                        Pg_ = Asg * kgm
                        pg = [Pg_[c, 0].abs_upper() for c in range(DIM)]
                    else:
                        PK = Ab0 * ex._abs_mat(Km)
                        v_ = Ab0 * arb_mat([[kgm[k, 0].abs_upper()] for k in range(DIM)])
                        pg = [up(v_[c, 0]) for c in range(DIM)]
                    for c in range(DIM):
                        Tg_[c] = up(Tg_[c] + pg[c] * nupow[m])
                        for k in range(DIM):
                            Tc_[c][k] = up(Tc_[c][k] + PK[c, k] * nupow[m])
            for c in range(DIM):
                Tg_[c] = up(Tg_[c] + sum((Abar0[c][j] * Sv[j] for j in range(DIM)), arb(0)) * tailK)
                for k in range(DIM):
                    Tc_[c][k] = up(Tc_[c][k] + sum((Abar0[c][j] * SM[j][k] for j in range(DIM)), arb(0)) * tailK)
            return Tc_, Tg_

        T = [[arb(0)] * DIM for _ in range(DIM)]
        for nn, Cm in Cn.items():
            w_ = up(nupow[abs(nn)])
            for c in range(DIM):
                for k in range(DIM):
                    T[c][k] = T[c][k] + Cm[c][k] * w_
        for c in range(DIM):
            for k in range(DIM):
                s_ = sum((Abar0[c][j] * S_J[j][k] for j in range(DIM)), arb(0))
                T[c][k] = up(T[c][k] + s_ * tailK)
        Tc, Tg = col_tail(encK, enckg, S_Kc, S_kg)
        mark("tail")

        def apply_A(fin_vec, tail_vals, S_tail):
            """Weighted component norms of A r for the residual r with finite part fin_vec (n x 1), tail entries
            tail_vals[mm] (18 balls, K < |mm| <= K') and |r_{k,m}| <= S_tail[k] e^{-rho2 |m|} for |m| > K'."""
            AF = Afin * fin_vec
            out = [arb(0)] * NC
            for i in range(n):
                out[lay.comp[i]] = out[lay.comp[i]] + AF[i, 0].abs_upper() * nupow[abs(lay.mode[i])]
            for m in range(K + 1, Kp + 1):
                Am = Aex.get(m)
                for sgn in (1, -1):
                    mm = sgn * m
                    gv = colvec(tail_vals[mm])
                    if Am is not None:
                        v_ = (Am if sgn == 1 else Am.conjugate()) * gv
                        vals_ = [v_[c, 0].abs_upper() for c in range(DIM)]
                    else:
                        v_ = Ab0 * arb_mat([[gv[k, 0].abs_upper()] for k in range(DIM)])
                        vals_ = [up(v_[c, 0]) for c in range(DIM)]
                    for c in range(DIM):
                        out[CW + c] = out[CW + c] + vals_[c] * nupow[m]
            for c in range(DIM):
                out[CW + c] = out[CW + c] + sum((Abar0[c][k] * S_tail[k] for k in range(DIM)), arb(0)) * tailK
            return [up(v) for v in out]
        tail_modes = list(range(K + 1, Kp + 1)) + list(range(-Kp, -K))

        # ---- Y0p = ||A F(xbar_c; e_c)||
        Ffin = acb_mat(n, 1)
        Ffin[0, 0] = C.w[IV][K + 1] - acb(fmpq(1, 2))
        Ffin[1, 0] = C.w[IV][K - 1] - acb(fmpq(1, 2))
        for k in range(DIM):
            Ffin[CC + k, 0] = f0[k] + ecb * encQ[k][Kp]
            for m in lay.modes():
                Ffin[lay.w(k, m), 0] = acb(0, m) * acb(C.om) * C.w[k][K + m] - encQ[k][m + Kp]
        Y0p = apply_A(Ffin, {mm: [-encQ[k][mm + Kp] for k in range(DIM)] for mm in tail_modes}, S_Q)
        mark("Y0")

        # ---- curve data (Lemma B2 (a), (b))
        cf = _CurveFns(C, elo, ehi, PQ)
        phi36 = C.trig36()
        nodes36 = _node_rows(phi36, Mn, PQ)
        nxi, ns = int(st["nsub_xi"]), int(st["nsub_s"])
        subs_xi = [_ball_interval(elo + (ehi - elo) * Fraction(i, nxi), elo + (ehi - elo) * Fraction(i + 1, nxi))
                   for i in range(nxi)]
        subs_s = [_ball_interval(Fraction(i, ns), Fraction(i + 1, ns)) for i in range(ns)]
        XiB = _ball_interval(elo, ehi)
        S01 = [_ball_interval(0, 1)]
        with am.precision(PQ):
            # Y1 at the point e_c
            sp1 = _box_sup(lambda z: cf.y1(z), phi36, rho2, st)
            v1 = [cf.y1(z) for z in nodes36]
            enc1 = _enclose(v1, sp1.S, rho2, Mn, Kp, PQ)
            mark("Y1 data")
            sp2 = _box_sup(lambda z: cf.y2(z, XiB, S01), phi36, rho2, st)
            v2 = []
            for z in nodes36:
                acc = None
                for Xi in subs_xi:
                    acc = _hull_list(acc, cf.y2(z, Xi, subs_s))
                v2.append(acc)
            enc2 = _enclose(v2, sp2.S, rho2, Mn, Kp, PQ)
            mark("Y2 data")
            sp3 = _box_sup(lambda z: cf.zc(z, XiB, S01), phi36, rho2, st)
            v3 = []
            for z in nodes36:
                acc = None
                for Xi in subs_xi:
                    acc = _hull_list(acc, cf.zc(z, Xi, subs_s))
                v3.append(acc)
            enc3 = _enclose(v3, sp3.S, rho2, Mn, Kp, PQ)
            mark("Zc data")
        # Y1
        F1 = acb_mat(n, 1)
        for k in range(DIM):
            F1[CC + k, 0] = enc1[k][Kp]
            for m in lay.modes():
                F1[lay.w(k, m), 0] = acb(0, m) * (acb(C.tom) * C.w[k][K + m] + acb(C.om) * C.tw[k][K + m]) \
                    - enc1[DIM + k][m + Kp]
        Y1 = apply_A(F1, {mm: [-enc1[DIM + k][mm + Kp] for k in range(DIM)] for mm in tail_modes}, sp1.S[DIM:])
        # Y2 (sup over the piece)
        F2 = acb_mat(n, 1)
        for k in range(DIM):
            F2[CC + k, 0] = enc2[k][Kp]
            for m in lay.modes():
                F2[lay.w(k, m), 0] = 2 * acb(0, m) * acb(C.tom) * C.tw[k][K + m] - enc2[DIM + k][m + Kp]
        Y2 = apply_A(F2, {mm: [-enc2[DIM + k][mm + Kp] for k in range(DIM)] for mm in tail_modes}, sp2.S[DIM:])
        # Zc: A d/dxi DF(xbar(xi); xi), finite part by an exact product with A_fin
        o = 0
        eJ = enc3[o:o + DIM * DIM]
        o += DIM * DIM
        eJp = enc3[o:o + DIM * DIM]
        o += DIM * DIM
        ef1p = enc3[o:o + DIM]
        o += DIM
        eKcp = enc3[o:o + DIM * DIM]
        o += DIM * DIM
        ekgp = enc3[o:o + DIM]
        S3 = sp3.S
        S_Jx = [[S3[DIM * k + j] for j in range(DIM)] for k in range(DIM)]
        S_Jp = [[S3[DIM * DIM + DIM * k + j] for j in range(DIM)] for k in range(DIM)]
        S_Kcp = [[S3[2 * DIM * DIM + DIM + DIM * k + j] for j in range(DIM)] for k in range(DIM)]
        S_kgp = [S3[3 * DIM * DIM + DIM + k] for k in range(DIM)]
        Dp = acb_mat(n, n)
        Jp0 = M_(eJp, 0)
        for k in range(DIM):
            r = CC + k
            Dp[r, 1] = ef1p[k][Kp]
            for j in range(DIM):
                Dp[r, CC + j] = Jp0[k][j]
            for mp in lay.modes():
                A1, A2 = M_(eJ, -mp), M_(eJp, -mp)
                for j in range(DIM):
                    Dp[r, lay.w(j, mp)] = A1[k][j] + XiB * A2[k][j]
        for m in lay.modes():
            dK = M_(eKcp, m)
            for k in range(DIM):
                r = lay.w(k, m)
                Dp[r, 0] = acb(0, m) * C.tw[k][K + m]
                Dp[r, 1] = -ekgp[k][m + Kp]
                for j in range(DIM):
                    Dp[r, CC + j] = -dK[k][j]
            for mp in lay.modes():
                A2 = M_(eJp, m - mp)
                for k in range(DIM):
                    r = lay.w(k, m)
                    for j in range(DIM):
                        Dp[r, lay.w(j, mp)] = -A2[k][j]
            for k in range(DIM):
                r = lay.w(k, m)
                Dp[r, r] += acb(0, m) * acb(C.tom)
        with fe.precision(PM):
            PZ = Afin * Dp
        Zc_ff = colsup(ex._abs_mat(PZ))

        def col_Jc(j, mp):
            col = [None] * n
            A1, A2 = M_(eJ, -mp), M_(eJp, -mp)
            for k in range(DIM):
                col[CC + k] = A1[k][j] + XiB * A2[k][j]
                for m in lay.modes():
                    col[lay.w(k, m)] = -M_(eJp, m - mp)[k][j]
            return col

        def maj_Jc(j, mp):
            col = [None] * n
            for k in range(DIM):
                col[CC + k] = up((S_Jx[k][j] + ehiB * S_Jp[k][j]) * er ** abs(mp))
                for m in lay.modes():
                    col[lay.w(k, m)] = up(S_Jp[k][j] * er ** abs(m - mp))
            return col
        Zc_ft = finite_tail(col_Jc, maj_Jc)
        TZ = conv_tail(eJp, S_Jp)
        tom_abs = C.tom.abs_upper()
        TZ = [[up(TZ[c][k] + Abar1[c][k] * tom_abs) for k in range(DIM)] for c in range(DIM)]
        TcZ, TgZ = col_tail(eKcp, ekgp, S_Kcp, S_kgp)
        mark("Zc blocks")
    finally:
        ctx.prec = old
    return dict(C=C, K=K, Kp=Kp, M=Mn, e_lo=str(elo), e_hi=str(ehi), e_c=str(ec), delta=delta, ehiB=ehiB, Tm=Tm,
                nu=nu, Q2=Q2, rho2=rho2, Wl=Wl, HW=HW, GW=GW, Z1_ff=Z1_ff, Z1_ft=Z1_ft, T=T, Tc=Tc, Tg=Tg, NA=NA,
                NA1=NA1, Abar0=Abar0, Abar1=Abar1, Y0p=Y0p, Y1=Y1, Y2=Y2, Zc_ff=Zc_ff, Zc_ft=Zc_ft, TZ=TZ, TcZ=TcZ,
                TgZ=TgZ, cov=cov, label=label, settings=st,
                tail=dict(m_max=tail["m_max"], theta=float(up(tail["theta"]))), timings_s=marks,
                wall_s=round(time.time() - t0, 1), box_evals=[sp1.n_evals, sp2.n_evals, sp3.n_evals])


def _rows_of(bl_ff, bl_ft, Tw, Tc_, Tg_, E, drop_tail=False):
    """(1/eta_c) sum_c' eta_c' B[c][c'] for the block bound B = finite x finite (with finite x tail for w inputs,
    max of the two) + tail rows (T: w -> w, Tc: c -> w, Tg: g -> w)."""
    out = []
    for c in range(NC):
        tl = c >= CW and not drop_tail
        s_ = E[0] * bl_ff[c][0] + E[1] * (bl_ff[c][1] + (Tg_[c - CW] if tl else 0))
        for k in range(DIM):
            s_ += E[CC + k] * (bl_ff[c][CC + k] + (Tc_[c - CW][k] if tl else 0))
            s_ += E[CW + k] * (amax(bl_ff[c][CW + k], bl_ft[c][k]) + (Tw[c - CW][k] if tl else 0))
        out.append(up(s_ / E[c]))
    return out


def assemble(bl, eta, r_star, *, log=print, _mutate=()):
    """The radii polynomial on the piece with weights eta (38 exact dyadics: omega, g, c_0..c_17, w_0..w_17) and the
    Z2 validity radius r_star (LEMMAS-hopf.md, Lemmas B2, B3). Raises ProofFailure (with .diag) if an inequality is not
    certified. _mutate (tests only): 'drop_curve' omits delta Y1, delta^2/2 Y2 and delta Zc (the parameter width);
    'drop_cauchy' omits the 1/(T - e_hi) terms of Z2; 'drop_tail' omits the tail-row blocks."""
    mut = frozenset(_mutate)
    if mut - {"drop_curve", "drop_cauchy", "drop_tail"}:
        raise ValueError(f"unknown mutation {sorted(mut)}")
    if len(eta) != NC:
        raise ValueError(f"eta needs {NC} entries")
    cov = bl["cov"]
    old = ctx.prec
    ctx.prec = int(bl["settings"]["prec_Q"])
    try:
        E = [_arb_q(e) for e in eta]
        for e in E:
            if not (e.is_exact() and e > 0):
                raise ValueError("eta must be exact positive dyadics")
        rs = up(_arb_q(r_star))
        e_om, e_g = E[0], E[1]
        ec = [E[CC + k] for k in range(DIM)]
        ew = [E[CW + k] for k in range(DIM)]
        Q2, ehi, Tm = bl["Q2"], bl["ehiB"], bl["Tm"]
        delta = arb(0) if "drop_curve" in mut else bl["delta"]
        dt = "drop_tail" in mut
        NA, NA1, Ab0, Ab1 = bl["NA"], bl["NA1"], bl["Abar0"], bl["Abar1"]
        Z1c_rows = _rows_of(bl["Z1_ff"], bl["Z1_ft"], bl["T"], bl["Tc"], bl["Tg"], E, dt)
        Zc_rows = _rows_of(bl["Zc_ff"], bl["Zc_ft"], bl["TZ"], bl["TcZ"], bl["TgZ"], E, dt)
        Z1_rows = [up(Z1c_rows[c] + delta * Zc_rows[c]) for c in range(NC)]
        Z1 = amax_list(Z1_rows)
        Y0_rows = [up((bl["Y0p"][c] + delta * bl["Y1"][c] + delta * delta / 2 * bl["Y2"][c]) / E[c]) for c in range(NC)]
        Y0 = amax_list(Y0_rows)

        def through_A(v0, vE, v1):
            rows = []
            for c in range(NC):
                s = arb(0)
                for k in range(DIM):
                    s += NA[c][CC + k] * v0[k]
                    s += (NA[c][CW + k] + (Ab0[c - CW][k] if c >= CW else 0)) * vE[k]
                    s += (NA1[c][CW + k] + (Ab1[c - CW][k] if c >= CW else 0)) * v1[k]
                rows.append(up(s / E[c]))
            return rows
        # ---- Z2 (Lemma B3)
        tau = [ec[l] + ehi * ew[l] for l in range(DIM)]
        P = arb(1)
        for l in range(DIM):
            t = tau[l] * rs
            if not t < cov.R[l]:
                raise ProofFailure(f"tau_{l} r_* is not < R_{l}")
            P = P * cov.R[l] / (cov.R[l] - t)
        if not e_g * rs <= cov.G_R:
            raise ProofFailure("eta_g r_* exceeds the cover's g radius")
        P = up(P)
        cauchy = arb(0) if "drop_cauchy" in mut else 1 / Tm
        aJ = [[up(Q2 * P * (sum((cov.H(k, j, l) * tau[l] for l in range(DIM)), arb(0)) + cov.MG[k][j] * e_g))
               for j in range(DIM)] for k in range(DIM)]
        W0, WE = [], []
        for k in range(DIM):
            mgt = sum((cov.MG[k][l] * tau[l] for l in range(DIM)), arb(0))
            mgw = sum((cov.MG[k][l] * ew[l] for l in range(DIM)), arb(0))
            W0.append(up(sum((aJ[k][j] * (ec[j] + ehi * ew[j]) for j in range(DIM)), arb(0)) + e_g * Q2 * P * mgt))
            s = sum((aJ[k][j] * ew[j] for j in range(DIM)), arb(0))
            for j in range(DIM):
                hw = sum((cov.H(k, j, l) * ew[l] for l in range(DIM)), arb(0))
                s += (Q2 * P * hw + aJ[k][j] * cauchy) * ec[j]
            s += e_g * Q2 * P * (mgw + mgt * cauchy)
            WE.append(up(s))
        v1 = [up(2 * e_om * ew[k]) for k in range(DIM)]
        Z2_rows = through_A(W0, WE, v1)
        Z2 = amax_list(Z2_rows)
        diag = dict(Y0=float(Y0), Z1=float(Z1), Z2=float(Z2), Z1c=float(amax_list(Z1c_rows)),
                    Zc=float(amax_list(Zc_rows)), Y0p=float(amax_list([up(bl["Y0p"][c] / E[c]) for c in range(NC)])),
                    Y1=float(amax_list([up(bl["Y1"][c] / E[c]) for c in range(NC)])),
                    Y2=float(amax_list([up(bl["Y2"][c] / E[c]) for c in range(NC)])), P=float(P),
                    r_star=float(rs), delta=float(bl["delta"]))
        res = ex._radii(Y0, Z1, Z2, rs)
        if res is None:
            err = ProofFailure(f"radii polynomial not negative on [{bl['e_lo']}, {bl['e_hi']}]: Y0 = {float(Y0):.3e}, "
                               f"Z1 = {float(Z1):.4f}, Z2 = {float(Z2):.3e}, r_* = {float(rs):.3e}")
            err.diag = diag
            raise err
        r_lo, r_hi = res
        C = bl["C"]
        # enclosures over the piece: omega(xi), g(xi) on the centre line plus the existence radius
        dl = bl["delta"]
        om_ball = C.om + up(dl * C.tom.abs_upper() + e_om * r_lo) * arb(0, 1)
        g_ball = C.g + up(dl * C.tg.abs_upper() + e_g * r_lo) * arb(0, 1)
        if not om_ball > 0:
            raise ProofFailure("omega not certainly positive")
        Tball = 2 * arb.pi() / om_ball
        log(f"  [{float(Fraction(bl['e_lo'])):.6f}, {float(Fraction(bl['e_hi'])):.6f}]: Y0 = {float(Y0):.3e} "
            f"(p {diag['Y0p']:.1e}, Y1 {diag['Y1']:.1e}, Y2 {diag['Y2']:.2e}), Z1 = {float(Z1):.4f} "
            f"(c {diag['Z1c']:.3f}, curve {diag['Zc']:.2f}), Z2 = {float(Z2):.3e}, r = [{float(r_lo):.3e}, {float(r_hi):.3e}]")
        out = dict(e_lo=bl["e_lo"], e_hi=bl["e_hi"], e_c=bl["e_c"], label=bl["label"], K=bl["K"], Kprime=bl["Kp"],
                   M=bl["M"], centre_sha256=C.digest(), cover=cov.digest, eta=[str(e) for e in eta],
                   r_star=bound_rec(rs), Y0=bound_rec(Y0), Z1=bound_rec(Z1), Z2=bound_rec(Z2),
                   r_existence=bound_rec(r_lo), r_uniqueness=bound_rec(r_hi),
                   p_at_r_existence=bound_rec(Y0 + (Z1 - 1) * r_lo + Z2 * r_lo * r_lo / 2),
                   p_at_r_uniqueness=bound_rec(Y0 + (Z1 - 1) * r_hi + Z2 * r_hi * r_hi / 2),
                   contraction_at_r_uniqueness=bound_rec(Z1 + Z2 * r_hi),
                   g={"lower": bound_rec(lo(g_ball), "down"), "upper": bound_rec(up(g_ball), "up")},
                   omega={"lower": bound_rec(lo(om_ball), "down"), "upper": bound_rec(up(om_ball), "up")},
                   T_ms={"lower": bound_rec(lo(Tball), "down"), "upper": bound_rec(up(Tball), "up")},
                   diag=diag, tail=bl["tail"], timings_s=bl["timings_s"], wall_s=bl["wall_s"],
                   box_evals=bl["box_evals"])
        if mut:
            out["MUTATED"] = sorted(mut)
        out["_obj"] = dict(C=C, E=E, r_lo=r_lo, r_hi=r_hi, nu=bl["nu"])
    finally:
        ctx.prec = old
    return out


# ------------------------------------------------------------------------------------------------ float weight search
def _fl(M):
    return np.array([[float(x) for x in row] for row in M])


class BlocksFloat:
    """Float images of the weight-free blocks (for choosing eta and r_*; never a bound)."""

    def __init__(self, bl):
        cov = bl["cov"]

        def blk(ff, ft, Tw, Tc_, Tg_):
            B = _fl(ff)
            B[:, CW:] = np.maximum(B[:, CW:], _fl(ft))
            B[CW:, CW:] += _fl(Tw)
            B[CW:, CC:CW] += _fl(Tc_)
            B[CW:, 1] += np.array([float(v) for v in Tg_])
            return B
        self.B = blk(bl["Z1_ff"], bl["Z1_ft"], bl["T"], bl["Tc"], bl["Tg"])
        self.Bc = blk(bl["Zc_ff"], bl["Zc_ft"], bl["TZ"], bl["TcZ"], bl["TgZ"])
        NA, NA1 = _fl(bl["NA"]), _fl(bl["NA1"])
        Ab0, Ab1 = _fl(bl["Abar0"]), _fl(bl["Abar1"])
        self.Y0p = np.array([float(v) for v in bl["Y0p"]])
        self.Y1 = np.array([float(v) for v in bl["Y1"]])
        self.Y2 = np.array([float(v) for v in bl["Y2"]])
        self.MH = np.zeros((DIM, DIM, DIM))
        for k in range(DIM):
            for p_, (j, l) in enumerate(HP):
                self.MH[k, j, l] = self.MH[k, l, j] = float(cov.MH[k][p_])
        self.MG = _fl(cov.MG)
        self.R = np.array([float(r) for r in cov.R])
        self.GR = float(cov.G_R)
        self.Q2, self.ehi, self.Tm, self.delta = float(bl["Q2"]), float(bl["ehiB"]), float(bl["Tm"]), float(bl["delta"])
        NAt = NA.copy()
        NAt[CW:, CW:] += Ab0
        self.NA0 = NA[:, CC:CW]
        self.NAE = NAt[:, CW:]
        NA1t = NA1.copy()
        NA1t[CW:, CW:] += Ab1
        self.NA1E = NA1t[:, CW:]

    def evaluate(self, eta, rstar, delta=None):
        delta = self.delta if delta is None else delta
        ec, ew, eg, eom = eta[CC:CW], eta[CW:], eta[1], eta[0]
        Z1 = np.max((self.B @ eta) / eta + delta * (self.Bc @ eta) / eta)
        Y0 = np.max((self.Y0p + delta * self.Y1 + delta ** 2 / 2 * self.Y2) / eta)
        tau = ec + self.ehi * ew
        if not (np.all(tau * rstar < self.R) and eg * rstar <= self.GR):
            return dict(Y0=Y0, Z1=Z1, Z2=np.inf)
        P = np.prod(self.R / (self.R - tau * rstar))
        aJ = self.Q2 * P * (np.einsum("kjl,l->kj", self.MH, tau) + self.MG * eg)
        W0 = aJ @ (ec + self.ehi * ew) + eg * self.Q2 * P * (self.MG @ tau)
        hw = np.einsum("kjl,l->kj", self.MH, ew)
        WE = aJ @ ew + (self.Q2 * P * hw + aJ / self.Tm) @ ec + eg * self.Q2 * P * (self.MG @ ew + (self.MG @ tau) / self.Tm)
        Z2 = np.max((self.NA0 @ W0 + self.NAE @ WE + self.NA1E @ (2 * eom * ew)) / eta)
        return dict(Y0=Y0, Z1=Z1, Z2=Z2, P=P)

    def ok(self, eta, rstar, delta=None, margin=1.05):
        d = self.evaluate(eta, rstar, delta)
        if not (d["Z1"] < 1 and np.isfinite(d["Z2"])):
            return False
        disc = (1 - d["Z1"]) ** 2 - 2 * d["Y0"] * d["Z2"] * margin
        if disc <= 0:
            return False
        r1 = 2 * d["Y0"] * margin / ((1 - d["Z1"]) + math.sqrt(disc))
        return r1 < rstar

    def admissible(self, eta, rstar):
        lo_, hi_ = 0.0, 0.2
        for _ in range(30):
            mid = 0.5 * (lo_ + hi_)
            lo_, hi_ = (mid, hi_) if self.ok(eta, rstar, mid) else (lo_, mid)
        return lo_

    def search(self, eta0, rstar, iters=600, seed=0):
        rng = np.random.default_rng(seed)
        eta = np.array(eta0, float)
        best = self.admissible(eta, rstar)
        for _ in range(iters):
            c = rng.integers(NC)
            e2 = eta.copy()
            e2[c] *= math.exp(rng.normal() * 0.8)
            v = self.admissible(e2, rstar)
            if v > best:
                best, eta = v, e2
        return eta / eta.max(), best


# =================================================================================================================
# Lemma B4: gluing consecutive pieces at a shared endpoint
# =================================================================================================================
def centre_distance(Ca, eca, Cb, ecb, xi, Eb, nu, prec=256):
    """Exact upper bound of ||xbar_a(xi) - xbar_b(xi)|| in the weights Eb (38 exact arbs), modes weighted by nu^|m|."""
    with am.precision(prec):
        oa, ga, ca, wa = curve_at(Ca, eca, xi, prec)
        ob, gb, cb, wb = curve_at(Cb, ecb, xi, prec)
        Ka, Kb = Ca.K, Cb.K
        Km = max(Ka, Kb)
        vals = [(oa - ob).abs_upper() / Eb[0], (ga - gb).abs_upper() / Eb[1]]
        for k in range(DIM):
            vals.append((ca[k] - cb[k]).abs_upper() / Eb[CC + k])
        for k in range(DIM):
            s = arb(0)
            for m in range(1, Km + 1):
                for sg in (1, -1):
                    a = wa[k][Ka + sg * m] if m <= Ka else acb(0)
                    b = wb[k][Kb + sg * m] if m <= Kb else acb(0)
                    s += (a - b).abs_upper() * nu ** m
            vals.append(s / Eb[CW + k])
        return up(amax_list(vals))


def glue(pa, pb, nu):
    """Lemma B4 at xi = e_hi(a) = e_lo(b): the existence ball of piece a at xi lies in piece b's uniqueness ball:
    ||xbar_a(xi) - xbar_b(xi)||_{eta_b} + r_lo(a) max_c eta_c(a) / eta_c(b) <= r_hi(b). pa, pb: dicts with C, e_lo,
    e_hi (Fractions), E (38 exact arbs), r_lo, r_hi (exact arbs). Returns (ok, slack)."""
    xi = pa["e_hi"]
    if xi != pb["e_lo"]:
        return False, None
    eca = (pa["e_lo"] + pa["e_hi"]) / 2
    ecb = (pb["e_lo"] + pb["e_hi"]) / 2
    d = centre_distance(pa["C"], eca, pb["C"], ecb, xi, pb["E"], nu)
    ratio = amax_list([up(pa["E"][c] / pb["E"][c]) for c in range(NC)])
    lhs = d + pa["r_lo"] * ratio
    return bool(lhs <= pb["r_hi"]), float(pb["r_hi"] - lhs)


# =================================================================================================================
# Driver for Part B (resumable; every proven piece is appended to data/hopf/pieces.jsonl)
# =================================================================================================================
RUN_SETTINGS = dict(K=8, M=48, nsub_xi=2, nsub_s=2, rho0="1/8", rho2="3/4", R="1/256", G_R="1/4096",
                    T_margin="1/40", n_group=4)


def _append(path, rec):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a") as fh:
        fh.write(json.dumps(rec, sort_keys=True) + "\n")
        fh.flush()
        os.fsync(fh.fileno())


def _read_jsonl(path):
    out = []
    if not os.path.exists(path):
        return out
    with open(path) as fh:
        lines = fh.read().split("\n")
    for i, line in enumerate(lines):
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            if i >= len(lines) - 2:          # a process killed while appending: drop the last partial line
                break
            raise
    return out


def _read_final_jsonl(path):
    """Final evidence is strict: no malformed complete record or nonempty partial tail can be silently skipped."""
    if not os.path.exists(path):
        return []
    with open(path, "rb") as fh_:
        raw = fh_.read()
    if raw[raw.rfind(b"\n") + 1:].strip():
        raise ProofFailure(f"incomplete final evidence line: {path}")
    out = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except (ValueError, UnicodeDecodeError) as exc:
            raise ProofFailure(f"malformed final evidence line: {path}") from exc
        if not isinstance(item, dict):
            raise ProofFailure(f"nonobject final evidence line: {path}")
        out.append(item)
    return out


def _dyadic_eta(eta, bits=20):
    out = []
    for x in eta:
        v = max(1, round(float(x) * 2 ** bits))
        out.append(str(Fraction(v, 2 ** bits)))
    return out


def _ceil_dyadic(x, den=64):
    return Fraction(math.ceil(float(x) * den), den)


def _hexval(rec):
    import centre as ct
    return ct.text_to_dyadic(rec["hex"]) if "hex" in rec else _arb_q(rec)


def hex_fraction(rec):
    """The exact rational (as a Fraction) of a bound record's '<sign>0x<hex>p<exp>' text."""
    t = rec["hex"].strip()
    neg = t.startswith("-")
    h, e = t.lstrip("-")[2:].split("p")
    v = Fraction(int(h, 16)) * Fraction(2) ** int(e)
    return -v if neg else v


def _piece_state(rec):
    """Exact data of a logged piece for gluing."""
    C = Centre.from_record(rec["centre"])
    E = [_arb_q(e) for e in rec["eta"]]
    return dict(C=C, e_lo=Fraction(rec["e_lo"]), e_hi=Fraction(rec["e_hi"]), E=E,
                r_lo=_hexval(rec["result"]["r_existence"]), r_hi=_hexval(rec["result"]["r_uniqueness"]))


def run(e_stop="0.2", budget_s=3300, width0="0.002", log=print, data=DATA, g_stop=None, K=None, M=None):
    """Prove pieces [e_i, e_{i+1}] from e = 0 upward until e_stop, the time budget, or (g_stop) a piece whose g
    enclosure lies below g_stop; resumes from data/pieces.jsonl. Every piece is glued to the previous one (Lemma B4)
    before it is logged."""
    t_start = time.time()
    rs_ = dict(RUN_SETTINGS)
    if K is not None:                      # a larger Galerkin size for new pieces (gluing compares any two K)
        rs_["K"] = int(K)
    if M is not None:
        rs_["M"] = int(M)
    K = int(rs_["K"])
    st = dict(M=int(rs_["M"]), nsub_xi=int(rs_["nsub_xi"]), nsub_s=int(rs_["nsub_s"]), rho0=rs_["rho0"])
    nu_f = math.exp(float(Fraction(rs_["rho0"])))
    with am.precision(192):
        nu = _arb_q(rs_["rho0"]).exp()
    ppath = os.path.join(data, "pieces.jsonl")
    cpath = os.path.join(data, "covers.jsonl")
    done = [r for r in _read_jsonl(ppath) if r.get("type") == "piece"]
    fh = FloatHopf()
    FE = FloatEps(K)
    u = FE.initial(fh)
    e_cur = Fraction(0)
    prev = None
    eta_prev = None
    width = Fraction(width0)
    if done:
        last = done[-1]
        e_cur = Fraction(last["e_hi"])
        prev = _piece_state(last)
        eta_prev = np.array([float(Fraction(e)) for e in last["eta"]])
        width = Fraction(last["e_hi"]) - Fraction(last["e_lo"])
        u = FE.from_centre(prev["C"])
        log(f"resuming after {len(done)} pieces at e = {float(e_cur):.6f}")
    stop = Fraction(e_stop)
    lay = FE.lay

    def comps(v):
        out = np.zeros(NC)
        for i in range(lay.n):
            out[lay.comp[i]] += abs(v[i]) * nu_f ** abs(lay.mode[i])
        return out
    n_fail = 0
    gs = Fraction(g_stop) if g_stop is not None else None

    def below_g_stop():
        return gs is not None and bool(done) and hex_fraction(done[-1]["result"]["g"]["upper"]) < gs
    while e_cur < stop and time.time() - t_start < budget_s and not below_g_stop():
        # ---- a group of pieces with the current width
        group = []
        a = e_cur
        uu = u
        for i in range(int(rs_["n_group"])):
            if a >= stop:
                break
            b = min(a + width, stop)
            ec = (a + b) / 2
            uu, nr = FE.newton(uu, float(ec))
            tt = FE.tangent(uu, float(ec))
            C = FE.to_centre(uu, tt)
            group.append((C, a, b, uu, tt))
            a = b
        e_top = group[-1][2]
        cov = None
        for mfac in (1, 2, 4):                     # smaller T if the family is too large for a finite cover
            T = _ceil_dyadic(e_top + Fraction(rs_["T_margin"]) / mfac, 256)
            try:
                cov = EpsCover([(C, a_, b_) for (C, a_, b_, _, _) in group], str(T), [rs_["R"]] * DIM, rs_["G_R"],
                               rho2=rs_["rho2"], max_evals=1500, log=log)
                break
            except (ProofFailure, fe.StripCoverError) as e:
                log(f"  cover failed at T = {T} ({str(e)[:80]})")
        if cov is None:
            log("  cover failed; halving the width")
            width /= 2
            continue
        cid = cov.digest[:16]
        _append(cpath, dict(type="cover", id=cid, T=str(T), R=rs_["R"], G_R=rs_["G_R"], rho2=rs_["rho2"],
                            pieces=[[str(a_), str(b_), C.digest()] for (C, a_, b_, _, _) in group],
                            centres=[C.to_record() for (C, _, _, _, _) in group],
                            record=cov.record()))
        ok_all = True
        for (C, a_, b_, uu, tt) in group:
            if time.time() - t_start > budget_s or below_g_stop():
                ok_all = False
                break
            t0 = time.time()
            bl = piece_blocks(C, a_, b_, cov, settings=st, log=log)
            BF = BlocksFloat(bl)
            eta0 = eta_prev if eta_prev is not None else np.maximum(comps(tt) / comps(tt).max(), 1e-3)
            best = None
            for rsv in (1e-4, 3e-4, 1e-3):
                e2, adm = BF.search(eta0, rsv, iters=150 if eta_prev is not None else 400)
                if best is None or adm > best[0]:
                    best = (adm, rsv, e2)
            adm, rsv, e2 = best
            # candidates: the searched weights, the previous piece's weights (ratio 1 in the gluing), their geometric
            # mean; for each, r_* and its double and half. The first that passes and glues is taken.
            cands = [e2]
            if eta_prev is not None:
                cands += [eta_prev, np.sqrt(e2 * eta_prev)]
            res = gl = cur = None
            eta_s = None
            for ee in cands:
                eta_try = _dyadic_eta(ee)
                for rs_try in (rsv, 2 * rsv, rsv / 2):
                    try:
                        r_ = assemble(bl, eta_try, str(Fraction(rs_try).limit_denominator(1 << 30)), log=log)
                    except ProofFailure as e:
                        log(f"  assemble failed at r_* = {rs_try:.1e}: {e}")
                        continue
                    obj = r_.pop("_obj")
                    c_ = dict(C=C, e_lo=Fraction(a_), e_hi=Fraction(b_), E=obj["E"], r_lo=obj["r_lo"], r_hi=obj["r_hi"])
                    if prev is not None:
                        okg, slack = glue(prev, c_, nu)
                        if not okg:
                            log(f"  gluing failed at e = {float(a_):.6f} (slack {slack:.3e})")
                            continue
                        gl = dict(ok=okg, slack=slack)
                    elif Fraction(a_) != 0:
                        raise RuntimeError("first piece must start at 0")
                    res, cur, eta_s, e2 = r_, c_, eta_try, ee
                    break
                if res is not None:
                    break
            if res is None:
                ok_all = False
                break
            rec = dict(type="piece", idx=len(done), e_lo=str(a_), e_hi=str(b_), centre=C.to_record(), eta=eta_s,
                       r_star=res["r_star"], cover=cid, result=res, glue_prev=gl, predicted_admissible=adm,
                       seconds=round(time.time() - t0, 1), settings=dict(rs_), code_sha256=CODE_SHA256)
            _append(ppath, rec)
            done.append(rec)
            prev = cur
            eta_prev = e2
            u = uu
            e_cur = Fraction(b_)
            log(f"piece {len(done) - 1}: [{float(a_):.6f}, {float(b_):.6f}] ok, g in [{res['g']['lower']['dec'][:16]}, "
                f"{res['g']['upper']['dec'][:16]}], {time.time() - t0:.0f} s, predicted admissible half-width {adm:.2e}")
            # adapt the width to the predicted admissible half-width
            target = Fraction(min(2 * adm * 0.5, float(width) * 1.5)).limit_denominator(10 ** 6)
            target = Fraction(round(float(target) * 1e6), 10 ** 6)
            if target > 0:
                width_next = target
            else:
                width_next = width
        if ok_all:
            width = width_next
            n_fail = 0
        else:
            width = width / 2
            n_fail += 1
            if n_fail > 6:
                log("too many failures; stopping")
                break
    log(f"stopped at e = {float(e_cur):.6f} after {time.time() - t_start:.0f} s, {len(done)} pieces")
    return done


# =================================================================================================================
# Re-proof of the logged pieces with the current program (review 2026-10-02, GAP 2)
# =================================================================================================================
REPROVE_LOG = "reprove_final.jsonl"
THEOREM_A_LOG = "theoremA_final.json"
EXPECTED_PIECES = 68
EXPECTED_EPS_END = Fraction(6427, 50000)
REPROVE_KEYS = ("Y0", "Z1", "Z2", "r_existence", "r_uniqueness", "r_star", "p_at_r_existence", "p_at_r_uniqueness",
                "contraction_at_r_uniqueness")


def piece_lines(data=DATA):
    """{idx: (piece record, SHA-256 of its line in pieces.jsonl)} for the complete piece lines of the log."""
    out = {}
    path = os.path.join(data, "pieces.jsonl")
    if not os.path.exists(path):
        return out
    with open(path, "rb") as fh_:
        raw = fh_.read()
    if raw[raw.rfind(b"\n") + 1:].strip():
        raise ProofFailure("pieces.jsonl has an incomplete final line")
    for line in raw[:raw.rfind(b"\n") + 1].split(b"\n"):
        if not line.strip():
            continue
        rec = json.loads(line)
        if rec.get("type") == "piece":
            idx = rec["idx"]
            if type(idx) is not int or idx in out:
                raise ProofFailure(f"invalid or duplicated piece index: {idx}")
            out[idx] = (rec, hashlib.sha256(line).hexdigest())
    return out


def _exact_input(value):
    if isinstance(value, (float, bool)):
        raise ProofFailure("proof setting must be an exact integer or rational text")
    return Fraction(value)


def cover_records(data=DATA):
    out = {}
    for rec in _read_final_jsonl(os.path.join(data, "covers.jsonl")):
        if rec.get("type") == "cover":
            if rec["id"] in out:
                raise ProofFailure(f"duplicated cover id: {rec['id']}")
            out[rec["id"]] = rec
    return out


def _record_digest(rec):
    return hashlib.sha256(json.dumps(rec, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def validate_piece_inputs(lines, covers):
    """The reviewed bridge has exactly 68 distinct, consecutive, nondegenerate pieces covering [0, 6427/50000]."""
    if sorted(lines) != list(range(EXPECTED_PIECES)):
        raise ProofFailure("expected exactly piece indices 0 through 67")
    end = Fraction(0)
    for idx, (rec, _) in sorted(lines.items()):
        a, b = _exact_input(rec["e_lo"]), _exact_input(rec["e_hi"])
        if a != end or not a < b:
            raise ProofFailure(f"piece {idx}: gap, overlap or degenerate interval")
        end = b
        C, st, lg = Centre.from_record(rec["centre"]), rec["settings"], rec["result"]
        if set(st) != set(RUN_SETTINGS):
            raise ProofFailure(f"piece {idx}: unknown or missing settings")
        cov = covers.get(rec["cover"])
        if cov is None:
            raise ProofFailure(f"piece {idx}: missing cover")
        for key in ("K", "M", "nsub_xi", "nsub_s", "n_group"):
            if type(st[key]) is not int or st[key] <= 0:
                raise ProofFailure(f"piece {idx}: nonexact integer setting {key}")
        for key in ("rho0", "rho2", "R", "G_R", "T_margin"):
            if _exact_input(st[key]) <= 0:
                raise ProofFailure(f"piece {idx}: nonpositive setting {key}")
        if st["K"] != C.K or any(_exact_input(st[k]) != _exact_input(cov[k]) for k in ("rho2", "R", "G_R")):
            raise ProofFailure(f"piece {idx}: centre/cover settings mismatch")
        if _exact_input(st["rho0"]) != Fraction(1, 8):
            raise ProofFailure(f"piece {idx}: bridge pieces must share rho0=1/8")
        if len(rec["eta"]) != NC or any(_exact_input(x) <= 0 for x in rec["eta"]):
            raise ProofFailure(f"piece {idx}: invalid exact weights")
        if [str(_exact_input(x)) for x in lg["eta"]] != [str(_exact_input(x)) for x in rec["eta"]]:
            raise ProofFailure(f"piece {idx}: logged result weights mismatch")
        if lg["K"] != C.K or lg["M"] != st["M"] or _exact_input(lg["e_lo"]) != a or _exact_input(lg["e_hi"]) != b:
            raise ProofFailure(f"piece {idx}: result metadata mismatch")
        if hex_fraction(rec["r_star"]) != hex_fraction(lg["r_star"]):
            raise ProofFailure(f"piece {idx}: exact r_star mismatch")
        for key in REPROVE_KEYS:
            hex_fraction(lg[key])
        for key in ("g", "omega", "T_ms"):
            lower, upper = (hex_fraction(lg[key][side]) for side in ("lower", "upper"))
            if lower > upper or (key != "g" and lower <= 0):
                raise ProofFailure(f"piece {idx}: invalid exact {key} enclosure")
    if end != EXPECTED_EPS_END:
        raise ProofFailure("bridge does not end at eps=6427/50000")


def _exact_values(res):
    out = {k: res[k]["hex"] for k in REPROVE_KEYS}
    out.update({f"{q}_{side}": res[q][side]["hex"] for q in ("g", "omega", "T_ms") for side in ("lower", "upper")})
    return out


def rebuild_cover(crec):
    """The Lemma B3 cover of a logged group, rebuilt from the logged centres with the logged T, R, G_R, rho2 (and the
    run's max_evals); its digest must equal the logged one."""
    cs = [Centre.from_record(c) for c in crec["centres"]]
    if len(cs) != len(crec["pieces"]) or not cs:
        raise ProofFailure("cover centre/piece count mismatch")
    for key in ("T", "R", "G_R", "rho2"):
        if _exact_input(crec[key]) <= 0:
            raise ProofFailure(f"cover has invalid exact {key}")
    pcs = [(C, _exact_input(a), _exact_input(b)) for C, (a, b, _) in zip(cs, crec["pieces"])]
    return EpsCover(pcs, crec["T"], [crec["R"]] * DIM, crec["G_R"], rho2=crec["rho2"], max_evals=1500,
                    log=lambda s: None)


def reproof_compare(rec, res, cover_digest, centre_digest):
    """Compare a re-proof (assemble's result res, the rebuilt cover's digest, the centre's digest) with a logged piece
    record: exact equality of the REPROVE_KEYS and of the g and omega enclosures (hex dyadics), and the digests."""
    lg = rec["result"]
    eq = {k: res[k]["hex"] == lg[k]["hex"] for k in REPROVE_KEYS}
    for q in ("g", "omega", "T_ms"):
        for side in ("lower", "upper"):
            eq[f"{q}_{side}"] = res[q][side]["hex"] == lg[q][side]["hex"]
    out = dict(cover_digest_reproduced=bool(cover_digest[:16] == rec["cover"] and cover_digest == lg["cover"]),
               centre_digest_ok=bool(centre_digest == lg["centre_sha256"] == res["centre_sha256"]), equal=eq,
               values=_exact_values(res))
    out["match"] = bool(out["cover_digest_reproduced"] and out["centre_digest_ok"] and all(eq.values()))
    return out


def reprove_piece(rec, crec, cov=None, line_sha=None):
    """Re-prove one logged piece with the current program: its group's cover rebuilt from the logged centres (or the
    given one), piece_blocks for its stored centre line and settings, assemble with its stored weights and exact r_*.
    Compares the cover digest, the centre digest and the exact values REPROVE_KEYS and the g and omega enclosures
    with the log. Returns (record for reprove_final.jsonl, objects for the tests)."""
    _assert_sources_current()
    t0 = time.time()
    out = dict(type="reprove", idx=rec["idx"], e_lo=rec["e_lo"], e_hi=rec["e_hi"], piece_line_sha256=line_sha,
               cover=rec["cover"], logged_code_sha256=rec.get("code_sha256"), code_sha256=CODE_SHA256,
               date=time.strftime("%Y-%m-%d"), python_flint=flint.__version__,
               sources_sha256=dict(SOURCE_SHA256), cover_record_sha256=_record_digest(crec))
    obj = None
    try:
        if cov is None:
            cov = rebuild_cover(crec)
        C = Centre.from_record(rec["centre"])
        for key in ("M", "nsub_xi", "nsub_s"):
            if type(rec["settings"][key]) is not int:
                raise ProofFailure(f"nonexact proof setting {key}")
        _exact_input(rec["settings"]["rho0"])
        st = {key: rec["settings"][key] for key in ("M", "nsub_xi", "nsub_s", "rho0")}
        st = dict(PIECE_DEFAULTS, **st)
        out["effective_settings"] = st
        bl = piece_blocks(C, Fraction(rec["e_lo"]), Fraction(rec["e_hi"]), cov, settings=st, log=lambda s: None)
        rs = str(hex_fraction(rec["r_star"]))            # the exact r_* the run used (up of its decimal choice)
        res = assemble(bl, rec["eta"], rs, log=lambda s: None)
        out.update(reproof_compare(rec, res, cov.digest, C.digest()))
        out["historical_match"] = out["match"]
        out["result"] = {k: v for k, v in res.items() if k != "_obj"}
        out["certified"] = _result_certified(out["result"], rec, {rec["cover"]: crec})
        if not out["certified"]:
            out["error"] = "fresh exact result failed its acceptance inequalities"
        obj = dict(bl=bl, res=res, st=st, cov=cov, C=C, rs=rs)
    except Exception as e:  # noqa: BLE001  (any failure is recorded as a failed re-proof, never as a match)
        out.update(match=False, error=f"{type(e).__name__}: {str(e)[:300]}")
    _assert_sources_current()
    out["seconds"] = round(time.time() - t0, 1)
    return out, obj


def _reprove_group(args):
    """Worker: re-prove the given pieces of one cover group (the cover is rebuilt once)."""
    crec, items = args
    try:
        cov = rebuild_cover(crec)
    except Exception as e:  # noqa: BLE001  (recorded as failed re-proofs)
        return [dict(type="reprove", idx=rec["idx"], e_lo=rec["e_lo"], e_hi=rec["e_hi"], piece_line_sha256=sha,
                     cover=rec["cover"], code_sha256=CODE_SHA256, sources_sha256=dict(SOURCE_SHA256),
                     date=time.strftime("%Y-%m-%d"), match=False,
                     error=f"cover rebuild: {type(e).__name__}: {str(e)[:300]}") for rec, sha in items]
    return [reprove_piece(rec, crec, cov=cov, line_sha=sha)[0] for rec, sha in items]


def _ranges(idxs):
    """'0-3, 7, 9-12' for a sorted list of integers."""
    out, run_ = [], []
    for i in idxs:
        if run_ and i == run_[-1] + 1:
            run_.append(i)
        else:
            if run_:
                out.append(str(run_[0]) if len(run_) == 1 else f"{run_[0]}-{run_[-1]}")
            run_ = [i]
    if run_:
        out.append(str(run_[0]) if len(run_) == 1 else f"{run_[0]}-{run_[-1]}")
    return ", ".join(out)


def reprove_all(pieces=None, workers=1, budget_s=6000, log=print, data=DATA, out_path=None):
    """Re-prove every logged eps piece (or the listed indices) with the current program text and append one record per
    piece to data/hopf/reprove_final.jsonl (or out_path): the exact Y0, Z1, Z2, radii (REPROVE_KEYS) and the g and omega
    enclosures compared with pieces.jsonl, the cover and centre digests, the SHA-256 of the piece's log line and the
    program SHA-256 taken when this process imported hopf.py (CODE_SHA256). Resumable: a piece that already has a
    matching record for the same log line and the same program hash is skipped. workers > 1 re-proves cover groups in
    parallel processes (one cover rebuild per group); the parent alone writes the log. Stops starting new groups when
    the time budget is spent. Returns the records written."""
    _assert_sources_current()
    if type(workers) is not int or workers < 1 or budget_s <= 0:
        raise ValueError("positive workers and budget required")
    out_path = out_path or os.path.join(data, REPROVE_LOG)
    lines = piece_lines(data)
    covers = cover_records(data)
    validate_piece_inputs(lines, covers)
    want = sorted(lines) if pieces is None else sorted(int(i) for i in pieces)
    if len(want) != len(set(want)):
        raise ValueError("duplicated requested piece indices")
    missing = [i for i in want if i not in lines]
    if missing:
        raise ValueError(f"pieces not in the log: {missing}")
    current = _current_reproofs(lines, covers, out_path)
    todo = [i for i in want if i not in current or not _reproof_matches(current[i], lines[i][0], covers)]
    log(f"reprove: program sha256 {CODE_SHA256[:16]}, {len(want)} piece(s) asked, {len(want) - len(todo)} already "
        f"re-proved with this program, {len(todo)} to do, {workers} worker(s), log {out_path}")
    groups = {}
    for i in todo:
        rec, sha = lines[i]
        groups.setdefault(rec["cover"], []).append((rec, sha))
    jobs = [(covers[cid], items) for cid, items in groups.items()]
    t0 = time.time()
    written = []

    def take(recs_):
        for r in recs_:
            _append(out_path, r)
            written.append(r)
            log(f"  piece {r['idx']}: {'CERTIFIED' if r.get('certified') else 'FAILED ' + str(r.get('error'))}; "
                f"historical equality {r.get('historical_match', False)}"
                f" ({r.get('seconds', 0)} s, {time.time() - t0:.0f} s total)")
    if workers <= 1:
        for job in jobs:
            if time.time() - t0 > budget_s:
                log("reprove: time budget spent; stopping")
                break
            take(_reprove_group(job))
    else:
        import multiprocessing as mp
        pool = mp.get_context("fork").Pool(int(workers))
        try:
            for recs_ in pool.imap_unordered(_reprove_group, jobs):
                take(recs_)
                if time.time() - t0 > budget_s:
                    log("reprove: time budget spent; stopping (unfinished groups are re-proved on the next call)")
                    break
        finally:
            pool.terminate()
            pool.join()
    st = reprove_status(data, out_path)
    log(f"reprove: {st['n_reproved_with_current_program']} of {st['n_pieces']} pieces re-proved with this program, "
        f"mismatched: {st['mismatched'] or 'none'}, not yet re-proved: {st['not_reproved'] or 'none'}")
    return written


def _current_reproofs(lines, covers, out_path):
    cur = {}
    for r in _read_final_jsonl(out_path):
        if r.get("type") != "reprove":
            raise ProofFailure("unexpected final reproof record type")
        i = r.get("idx")
        if (r.get("type") == "reprove" and type(i) is int and i in lines and r.get("sources_sha256") == SOURCE_SHA256
                and r.get("code_sha256") == CODE_SHA256 and r.get("piece_line_sha256") == lines[i][1]):
            cur[i] = r  # latest attempt wins, including a failed attempt
    return cur


def _result_certified(result, piece, covers):
    """Check complete fresh exact proof output, never approximate fields or historical equality."""
    try:
        if "MUTATED" in result or "_obj" in result:
            return False
        meta = ("e_lo", "e_hi", "e_c", "K", "Kprime", "M", "centre_sha256", "cover")
        if _record_digest({k: result[k] for k in meta}) != _record_digest({k: piece["result"][k] for k in meta}):
            return False
        if _record_digest(result["eta"]) != _record_digest(piece["eta"]):
            return False
        values = {k: hex_fraction(result[k]) for k in REPROVE_KEYS}
        y, z1, z2 = (values[k] for k in ("Y0", "Z1", "Z2"))
        rl, rh, rs = (values[k] for k in ("r_existence", "r_uniqueness", "r_star"))
        if not (y >= 0 and 0 <= z1 < 1 and z2 >= 0 and 0 < rl <= rh <= rs == hex_fraction(piece["r_star"])):
            return False
        for radius, key in ((rl, "p_at_r_existence"), (rh, "p_at_r_uniqueness")):
            if not y + (z1-1)*radius + z2*radius*radius/2 <= values[key] < 0:
                return False
        if not z1 + z2*rh <= values["contraction_at_r_uniqueness"] < 1:
            return False
        for q in ("g", "omega", "T_ms"):
            a, b = (hex_fraction(result[q][side]) for side in ("lower", "upper"))
            if not a <= b or (q != "g" and a <= 0):
                return False
        return True
    except (KeyError, TypeError, ValueError):
        return False


def _reproof_matches(r, piece, covers):
    try:
        st = dict(PIECE_DEFAULTS, **{k: piece["settings"][k] for k in ("M", "nsub_xi", "nsub_s", "rho0")})
        result = r["result"]
        return (r.get("certified") is True and r.get("centre_digest_ok") is True and r.get("cover_digest_reproduced") is True
                and _result_certified(result, piece, covers) and r.get("values") == _exact_values(result)
                and r.get("cover") == piece["cover"] and r.get("e_lo") == piece["e_lo"] and r.get("e_hi") == piece["e_hi"]
                and r.get("cover_record_sha256") == _record_digest(covers[piece["cover"]])
                and _record_digest(r.get("effective_settings")) == _record_digest(st)
                and r.get("python_flint") == flint.__version__)
    except (KeyError, TypeError, ValueError):
        return False


def final_pieces(data=DATA):
    """Only complete current-source reproof bounds may feed any final gluing or theorem."""
    status = reprove_status(data)
    if not status["all_pieces_reproved_with_current_program"]:
        raise ProofFailure(f"incomplete current-source re-proof coverage: {status}")
    lines, covers = piece_lines(data), cover_records(data)
    current = _current_reproofs(lines, covers, os.path.join(data, REPROVE_LOG))
    if any(i not in current or not _reproof_matches(current[i], lines[i][0], covers) for i in lines):
        raise ProofFailure("final reproof snapshot changed or fails its exact acceptance gate")
    return [dict(lines[i][0], result=current[i]["result"]) for i in sorted(lines)]


def reprove_status(data=DATA, out_path=None):
    """Exact 68-piece coverage; only fully matched evidence pinned to all imported sources can count."""
    _assert_sources_current()
    out_path = out_path or os.path.join(data, REPROVE_LOG)
    lines, covers = piece_lines(data), cover_records(data)
    validate_piece_inputs(lines, covers)
    recs = _read_final_jsonl(out_path)
    cur = _current_reproofs(lines, covers, out_path)
    matched = sorted(i for i, r in cur.items() if _reproof_matches(r, lines[i][0], covers))
    bad = sorted(set(cur) - set(matched))
    rest = sorted(set(lines) - set(cur))
    return dict(log=os.path.relpath(out_path, ROOT), program_sha256=CODE_SHA256, sources_sha256=dict(SOURCE_SHA256),
                n_pieces=len(lines), n_reproved_with_current_program=len(matched), mismatched=_ranges(bad),
                not_reproved=_ranges(rest), n_records=len(recs),
                n_records_other_program=sum(1 for r in recs if r.get("sources_sha256") != SOURCE_SHA256),
                all_pieces_reproved_with_current_program=len(matched) == EXPECTED_PIECES)


# =================================================================================================================
# Theorem A driver
# =================================================================================================================
def _exact_decimal(fr):
    """The exact decimal expansion of a Fraction whose denominator is 2^a 5^b (raises otherwise)."""
    fr = Fraction(fr)
    d, n = fr.denominator, 0
    while d % 10 == 0:
        d //= 10
        n += 1
    while d % 2 == 0 or d % 5 == 0:
        d = d // 2 if d % 2 == 0 else d // 5
        n += 1
    if d != 1:
        raise ValueError("not a finite decimal")
    v = abs(fr) * 10 ** n
    if v.denominator != 1:
        raise ValueError("internal: not a finite decimal")
    s_ = str(v.numerator).rjust(n + 1, "0")
    out = s_[:len(s_) - n] + ("." + s_[len(s_) - n:] if n else "")
    if Fraction(out) != abs(fr):
        raise ValueError("internal: decimal conversion")
    return ("-" if fr < 0 else "") + out


def _ball_rec(x):
    """lower/upper decimal records of a real ball"""
    return {"lower": bound_rec(lo(x), "down"), "upper": bound_rec(up(x), "up")}


def theorem_A(log=print, data=DATA, prec=192):
    """Part A: the Hopf point in the window W. Writes data/hopf/theoremA_final.json and returns the record (with the exact
    objects under '_obj')."""
    _assert_sources_current()
    t0 = time.time()
    fh = FloatHopf()
    gH0 = refine_gH(fh, prec=prec, log=log)
    gH = Fraction(round(gH0 * 10 ** 22), 10 ** 22)          # a 22-digit decimal near the zero (untrusted choice)
    cov = cover_window(fh, gH, prec=prec, log=log)
    L = lyapunov_at_hopf(cov, prec=prec)
    famH, spH = cov["famH"], cov["spH"]
    if not L["l1"] < 0:
        raise ProofFailure("l1 < 0 not certified")
    om = spH["lam"].imag
    eqX = famH["eq_G"]["X"]
    rec = dict(
        window=list(WINDOW), gH_interval=cov["gH_interval"],
        gH_interval_decimal=[_exact_decimal(Fraction(cov["gH_interval"][0])),
                             _exact_decimal(Fraction(cov["gH_interval"][1]))],
        n_intervals=dict(left=len(cov["left"]), right=len(cov["right"])),
        others_max_re_upper=bound_rec(cov["stats"]["max_others_re"]), gH_others_max_re=cov["others_max_re_H"],
        gH_others_max_re_bound=cov["others_max_re_H_bound"],
        others_abs_im_upper=bound_rec(cov["stats"]["max_others_abs_im"]),
        gH_others_abs_im_bound=cov["others_abs_im_H_bound"],
        lambda_imag_range=[dec(cov["stats"]["min_im"], "down", 12), dec(cov["stats"]["max_im"], "up", 12)],
        omega_H=_ball_rec(om), dRe_lambda_dg=_ball_rec(cov["dlam"].real), dIm_lambda_dg=_ball_rec(cov["dlam"].imag),
        l1_kuznetsov_physical=_ball_rec(L["l1"]), l1_times_omega_physical=_ball_rec(L["l1"] * om),
        l1_scaled_variables=_ball_rec(L["l1_scaled"]),
        equilibrium_at_gH_scaled=[[dec(lo(x.real), "down", 20), dec(up(x.real), "up", 20)] for x in eqX],
        equilibrium_radius_max=float(max(float(x.real.rad()) for x in eqX)),
        erhardt=dict(g_H=G_ERHARDT, l1=L1_ERHARDT, note="Erhardt's MATCONT value; MATCONT's first Lyapunov "
                     "coefficient equals omega times Kuznetsov's l1 in the normalisation <q, q> = 1 (physical units)"),
        polydisc_GH=cov["polydisc_H"], dRe_lambda_dg_interval="G_H",
        cover_left=cov["left"], cover_right=cov["right"], seconds=round(time.time() - t0, 1),
        code_sha256=CODE_SHA256, sources_sha256=dict(SOURCE_SHA256), precision=prec)
    _assert_sources_current()
    if not check_theoremA_cover(rec)["ok"]:
        raise ProofFailure("new Theorem A cover fails exact structural checks")
    os.makedirs(data, exist_ok=True)
    with open(os.path.join(data, THEOREM_A_LOG), "w") as fh_:
        json.dump(rec, fh_, indent=1)
    log(f"Theorem A: g_H in [{rec['gH_interval_decimal'][0]}, {rec['gH_interval_decimal'][1]}], omega_H = "
        f"{float(om.mid()):.12f}, dRe/dg = {float(cov['dlam'].real.mid()):.6f}, l1 = {float(L['l1'].mid()):.6f} "
        f"(times omega {float((L['l1'] * om).mid()):.6f}), others Re <= {float(cov['stats']['max_others_re']):.4e}, "
        f"{rec['seconds']} s")
    rec["_obj"] = dict(cov=cov, L=L, fh=fh)
    return rec


def check_theoremA_cover(thA):
    """Structural checks of the Theorem A record (review 2026-10-02, GAP 3), in exact rationals: the window is W; G_H
    lies inside W; the cover_left intervals, G_H and the cover_right intervals, sorted, are non-degenerate, adjacent
    (shared exact end points, so no gap and no overlap) and run from W's left end to its right end, with G_H between the
    two sides; their counts are those recorded; every left interval has Re lambda > 0 (lower end of the recorded
    enclosure) and every right one Re lambda < 0 (upper end); every interval's others_max_re (and G_H's, required)
    is < 0 and the largest equals the recorded others_max_re_upper, which is < 0; d Re lambda / dg < 0 and l1 < 0 (upper
    ends) and omega_H > 0 (lower end). These re-check the bookkeeping of one theorem_A run; the per-interval inequalities
    are decided in that run (spectrum_on). Returns a dict of named booleans with ok = all of them."""
    Wa, Wb = Fraction(WINDOW[0]), Fraction(WINDOW[1])
    ga, gb = _exact_input(thA["gH_interval"][0]), _exact_input(thA["gH_interval"][1])
    left = sorted(thA["cover_left"], key=lambda iv: _exact_input(iv["a"]))
    right = sorted(thA["cover_right"], key=lambda iv: _exact_input(iv["a"]))
    chain = [(_exact_input(iv["a"]), _exact_input(iv["b"])) for iv in left] + [(ga, gb)] + \
        [(_exact_input(iv["a"]), _exact_input(iv["b"])) for iv in right]
    breaks = [i for i, (u, v) in enumerate(zip(chain, chain[1:])) if u[1] != v[0]]
    exact_schema = ("gH_others_max_re_bound" in thA and "gH_others_abs_im_bound" in thA and
                    all("others_max_re_bound" in iv and "lambda_imag" in iv and "others_abs_im_bound" in iv
                        for iv in left + right))
    try:
        others = ([hex_fraction(iv["others_max_re_bound"]) for iv in left + right] +
                  [hex_fraction(thA["gH_others_max_re_bound"])]) if exact_schema else []
        imag = [(hex_fraction(iv["lambda_imag"]["lower"]), hex_fraction(iv["lambda_imag"]["upper"]))
                for iv in left + right] + [(hex_fraction(thA["omega_H"]["lower"]), hex_fraction(thA["omega_H"]["upper"]))]
        absims = [hex_fraction(iv["others_abs_im_bound"]) for iv in left + right] + [hex_fraction(thA["gH_others_abs_im_bound"])]
        absim_upper = hex_fraction(thA["others_abs_im_upper"])
        upper = hex_fraction(thA["others_max_re_upper"])
        intervals_ordered = all(hex_fraction(thA[k]["lower"]) <= hex_fraction(thA[k]["upper"])
                                for k in ("omega_H", "dRe_lambda_dg", "l1_kuznetsov_physical"))
    except (KeyError, TypeError, ValueError):
        exact_schema, others, imag, upper, intervals_ordered = False, [], [], Fraction(0), False
        absims, absim_upper = [], Fraction(0)
    out = dict(
        window_is_W=list(thA["window"]) == list(WINDOW),
        gH_inside_W=Wa < ga < gb < Wb,
        nondegenerate=all(a < b for a, b in chain),
        adjacent=not breaks,
        n_breaks=len(breaks),
        covers_W=chain[0][0] == Wa and chain[-1][1] == Wb,
        gH_between_sides=(not left or _exact_input(left[-1]["b"]) == ga) and (not right or _exact_input(right[0]["a"]) == gb),
        counts_as_recorded=(len(left), len(right)) == (thA["n_intervals"]["left"], thA["n_intervals"]["right"]),
        re_lam_ordered=all(_exact_input(iv["re_lam"][0]) <= _exact_input(iv["re_lam"][1]) for iv in left + right),
        left_re_lambda_positive=all(_exact_input(iv["re_lam"][0]) > 0 for iv in left),
        right_re_lambda_negative=all(_exact_input(iv["re_lam"][1]) < 0 for iv in right),
        exact_proof_bounds_present=exact_schema,
        enclosures_ordered=intervals_ordered,
        others_negative=bool(others) and all(v < 0 for v in others) and upper < 0,
        others_max_is_recorded_upper=bool(others) and max(others) == upper,
        stable_imag_exact_aggregate=bool(absims) and all(x >= 0 for x in absims) and max(absims) == absim_upper,
        critical_stable_separation=bool(imag) and min(a for a, b in imag) > absim_upper,
        positive_imag_on_entire_cover=bool(imag) and all(0 < a <= b for a, b in imag),
        imag_summary_encloses_cover=bool(imag) and _exact_input(thA["lambda_imag_range"][0]) <= min(a for a, b in imag)
                                  and max(b for a, b in imag) <= _exact_input(thA["lambda_imag_range"][1]),
        transversal=hex_fraction(thA["dRe_lambda_dg"]["upper"]) < 0,
        l1_negative=hex_fraction(thA["l1_kuznetsov_physical"]["upper"]) < 0,
        omega_positive=hex_fraction(thA["omega_H"]["lower"]) > 0,
        n_left=len(left), n_right=len(right), n_polydiscs=sum(1 for iv in left + right if "polydisc" in iv),
        others_max_re=float(max(others)) if others else None,
        others_include_gH="gH_others_max_re_bound" in thA)
    out["ok"] = all(v for k, v in out.items() if isinstance(v, bool))
    return out


# =================================================================================================================
# Corollary B(a): identification at eps = 0;  Part C: gluing to the G_Ks branch
# =================================================================================================================
def ball_of_piece_at(st_, xi):
    """Enclosures (balls) of omega*, g*, c*_k, and of ||w*_k - wbar_k(xi)|| bounds, for the zero of a logged piece at xi:
    the centre line at xi plus eta r_lo."""
    C = st_["C"]
    ec = (st_["e_lo"] + st_["e_hi"]) / 2
    om, g, c, w = curve_at(C, ec, xi)
    E, r = st_["E"], st_["r_lo"]
    omB = om + up(E[0] * r) * arb(0, 1)
    gB = g + up(E[1] * r) * arb(0, 1)
    cB = [c[k] + up(E[CC + k] * r) * arb(0, 1) for k in range(DIM)]
    return omB, gB, cB, w, [up(E[CW + k] * r) for k in range(DIM)]


def identification_at_eps0(first_piece_rec, thA, prec=192, log=print):
    """Corollary B(a): x*(0) is the Hopf point of Theorem A. Checks (all in Arb, exact comparisons):
    (i) the enclosure [ga, gb] of g*(0) (rounded outward to decimals) lies in W and is covered by Theorem A intervals
    whose equilibrium polydiscs X_G are recorded in thA (adjacent, exact endpoints);
    (ii) Lemma K on ONE polydisc P over [ga, gb] (radii chosen to contain the sets below);
    (iii) the enclosure of c*(0) lies in P, and so does the real segment of every recorded X_G of an interval meeting
    [ga, gb]. Then for every g in [ga, gb] the unique equilibrium in P is Theorem A's equilibrium of every interval
    containing g (uniqueness in P), and c*(0) is it at g = g*(0). Returns a record (ok = all checks)."""
    import centre as ct
    st_ = _piece_state(first_piece_rec)
    if st_["e_lo"] != 0:
        raise ValueError("not the first piece")
    omB, gB, cB, _, _ = ball_of_piece_at(st_, Fraction(0))
    ga = Fraction(dec(lo(gB), "down", 25))
    gb = Fraction(dec(up(gB), "up", 25))
    in_W = Fraction(WINDOW[0]) < ga and gb < Fraction(WINDOW[1])
    ivs = [dict(a=thA["gH_interval"][0], b=thA["gH_interval"][1], polydisc=thA["polydisc_GH"])]
    ivs += [iv for iv in thA["cover_left"] + thA["cover_right"]]
    meet = sorted([iv for iv in ivs if Fraction(iv["a"]) <= gb and Fraction(iv["b"]) >= ga],
                  key=lambda iv: Fraction(iv["a"]))
    contiguous = all(Fraction(u["b"]) == Fraction(v["a"]) for u, v in zip(meet, meet[1:]))
    covered = bool(meet) and contiguous and Fraction(meet[0]["a"]) <= ga and Fraction(meet[-1]["b"]) >= gb
    have_pd = all("polydisc" in iv for iv in meet)
    out = dict(g_star_0={"lower": dec(lo(gB), "down", 20), "upper": dec(up(gB), "up", 20)},
               omega_star_0={"lower": dec(lo(omB), "down", 20), "upper": dec(up(omB), "up", 20)},
               g_interval=[str(ga), str(gb)], g_in_window=in_W, n_theoremA_intervals_meeting=len(meet),
               intervals_cover=covered, polydiscs_recorded=have_pd, omega_positive=bool(omB > 0))
    if not (in_W and covered and have_pd):
        out["ok"] = False
        log(f"identification at eps = 0: preconditions fail {out}")
        return out
    with am.precision(prec):
        xf = float_equilibrium(float((ga + gb) / 2))
        pds = [polydisc_from_record(iv["polydisc"]) for iv in meet]
        rmin = []
        for i in range(DIM):
            v = up((cB[i] - arb(float(xf[i]))).abs_upper())
            for (xc, rr) in pds:
                v = amax(v, up((xc[i] - arb(float(xf[i]))).abs_upper() + rr[i]))
            rmin.append(float(v) * 1.01 + 1e-300)
        eq = equilibrium_on(_ball_interval(ga, gb), xf, prec=prec, rmin=rmin)
        xP, rP = eq["xt"], eq["r"]
        c_in = all(bool((cB[i] - xP[i]).abs_upper() <= rP[i]) for i in range(DIM))
        pd_in = all(bool((xc[i] - xP[i]).abs_upper() + rr[i] <= rP[i]) for (xc, rr) in pds for i in range(DIM))
    out.update(c_in_P=c_in, theoremA_polydiscs_in_P=pd_in, P_kappa=float(eq["kappa"]),
               P_radius_max=float(max(float(r) for r in rP)), c_radius_max=float(max(float(x.rad()) for x in cB)),
               P=polydisc_record(eq), ok=bool(c_in and pd_in and omB > 0))
    log(f"identification at eps = 0: g*(0) in [{float(ga):.12f}, {float(gb):.12f}] (in W: {in_W}; {len(meet)} "
        f"Theorem A intervals), c*(0) in P: {c_in}, Theorem A polydiscs in P: {pd_in}, kappa {float(eq['kappa']):.2e}")
    return out


# -----------------------------------------------------------------------------------------------------------------
# Lemma D: a point proof of the G_Ks problem (branch.py) identified with the eps-branch; Part C: the gluing
# -----------------------------------------------------------------------------------------------------------------
BRANCH_DIR = os.path.join(HERE, "data", "branch")


def _exact_fraction(x):
    """Fraction of an exact arb."""
    if not x.is_exact():
        raise ValueError("not exact")
    m, e = x.mid().man_exp()
    return Fraction(int(m)) * Fraction(2) ** int(e)


def curve_at_ball(C, e_c, X, prec=256):
    """xbar(xi) for every xi in the real ball X: balls (omega, g, c (18), w (18 x (2K+1)))."""
    with am.precision(prec):
        d = X - _arb_q(Fraction(e_c))
        K = C.K
        om = C.om + d * C.tom
        g = C.g + d * C.tg
        c = [C.c[k] + d * C.tc[k] for k in range(DIM)]
        w = [[C.w[k][t] + d * C.tw[k][t] for t in range(2 * K + 1)] for k in range(DIM)]
    return om, g, c, w


def point_in_eps_branch(pt_rec, pt_centre, states, nu_eps, prec=256):
    """Lemma D (LEMMAS-hopf.md). pt_rec: a branch.py proof record with g_lo = g_hi = g_s (a 'point'), pt_centre its
    centre record (digest checked); states: the eps-branch pieces (_piece_state), norm nu_eps = e^{rho0}.
    (1) eps_s := 2 a*_{1,V} (real: phase condition and realness) lies in the ball E = 2 (abar_{1,V} +- eta_V r / nu_P).
    (2) For every eps-piece meeting E, with X = E n [e_lo, e_hi]: the bound, for every eps in X, of
        ||y_s - xbar(eps)||_{eta(piece)},  y_s = (omega*, g_s, a*_0, (a*_m / eps)_{m != 0}),
        computed from the point's centre plus its radius (||a*_k - abar_k||_{nu_eps} <= ||a*_k - abar_k||_{nu_P}
        <= eta_k r since nu_eps <= nu_P), is <= r_hi(piece).
    (3) The pieces checked cover E.
    Then y_s is the zero x*(eps_s) of the eps-branch: the point's orbit is the bridge orbit at eps = eps_s.
    Returns a record."""
    import branch as br
    if pt_rec["g_lo"] != pt_rec["g_hi"]:
        raise ValueError("not a point proof")
    gs = Fraction(pt_rec["g_lo"])
    o = br.obj_from_record(pt_rec, pt_centre)              # checks the centre's SHA-256 against the record
    om_s, A, ETA, nuP, r = o["om_bar"], o["A"], o["ETA"], o["nu"], o["r_lo"]
    Ks = (len(A[0]) - 1) // 2
    with am.precision(prec):
        if not nu_eps <= nuP:
            raise ValueError("the eps-branch norm must be the weaker one (nu_eps <= nu_P)")
        a1 = A[IV][Ks + 1]
        if not a1.imag.is_zero():
            raise ProofFailure("point centre: Im abar_{1,V} is not exactly 0")
        rad = up(ETA[1 + IV] * r / nuP)
        E = 2 * (a1.real + rad * arb(0, 1))
        Elo, Ehi = _exact_fraction(lo(E)), _exact_fraction(up(E))
        out = dict(g=str(gs), eps_enclosure=[dec(lo(E), "down", 20), dec(up(E), "up", 20)],
                   point_centre_sha256=pt_rec["centre_sha256"], point_r_existence=float(r), checks=[])
        if not Elo > 0:
            out["ok"] = False
            return out
        covered = []
        ok_all = True
        for st_ in states:
            a_, b_ = st_["e_lo"], st_["e_hi"]
            if b_ < Elo or a_ > Ehi:
                continue
            xa, xb = max(a_, Elo), min(b_, Ehi)
            X = _ball_interval(xa, xb).real
            C = st_["C"]
            Ew, rhi = st_["E"], st_["r_hi"]
            om, g, c, w = curve_at_ball(C, (a_ + b_) / 2, X, prec)
            Kw = C.K
            vals = [up(((om_s - om).abs_upper() + ETA[0] * r) / Ew[0]),
                    up((_arb_q(gs) - g).abs_upper() / Ew[1])]
            Xlo = lo(X)
            for k in range(DIM):
                vals.append(up(((A[k][Ks] - c[k]).abs_upper() + ETA[1 + k] * r) / Ew[CC + k]))
            for k in range(DIM):
                sm = arb(0)
                for m in range(1, max(Ks, Kw) + 1):
                    for sg in (1, -1):
                        a = A[k][Ks + sg * m] / X if m <= Ks else acb(0)
                        b = w[k][Kw + sg * m] if m <= Kw else acb(0)
                        sm += (a - b).abs_upper() * nu_eps ** m
                vals.append(up((sm + ETA[1 + k] * r / Xlo) / Ew[CW + k]))
            lhs = amax_list(vals)
            ok = bool(lhs <= rhi)
            ok_all = ok_all and ok
            covered.append((xa, xb))
            out["checks"].append(dict(eps_piece=[str(a_), str(b_)], lhs=float(lhs), r_uniqueness=float(rhi),
                                      slack=float(rhi - lhs), ok=ok))
        covered.sort()
        cov_ok = bool(covered) and covered[0][0] <= Elo and covered[-1][1] >= Ehi and \
            all(u[1] >= v[0] for u, v in zip(covered, covered[1:]))
    out.update(eps_covered=cov_ok, ok=bool(ok_all and cov_ok))
    return out


def _complete_lines(path):
    """The complete (newline-terminated) lines of an append-only log, with their count and SHA-256."""
    with open(path, "rb") as fh_:
        raw = fh_.read()
    cut = raw.rfind(b"\n") + 1
    body = raw[:cut]
    return body, body.count(b"\n"), hashlib.sha256(body).hexdigest()


def gks_branch_snapshot(log=print, tmpdir=None):
    """Validate immutable snapshots of the complete FINAL branch log/centres and bind its collected theorem record."""
    import branch as br
    _assert_sources_current()
    runpath, cpath = br.RUN_LOG.format(K=12), br.CENTRES.format(K=12)
    rr, runhash = br.snapshot_jsonl(runpath)
    cc, centrehash = br.snapshot_jsonl(cpath)
    pieces, groups, centres = br.validate_final(12, records=rr, centre_records=cc)
    # The final manifest/source validation precedes every gluing re-derivation.
    pieces, groups, centres = br.validate_logs(12, reglue=True, repair=False, records=rr, centre_records=cc, log=log)
    recordpath = os.path.join(RESULTS, "fourier-branch-gks.json")
    with open(recordpath, "rb") as fh_:
        record_bytes = fh_.read()
    record = json.loads(record_bytes)
    record_hash = hashlib.sha256(record_bytes).hexdigest()
    if (record.get("program_sha256") != br.PROGRAM_SHA256 or record.get("sources_sha256") != br.SOURCES_SHA256
            or record.get("run_log_sha256") != runhash or record.get("centres_sha256") != centrehash
            or record.get("run_log") != os.path.relpath(runpath, ROOT)
            or record.get("n_pieces") != 712 or record.get("connected_pieces") != 712
            or record.get("g_covered") != br.EXPECTED_FINAL_RANGE):
        raise ProofFailure("Hopf gluing requires the complete current-source FINAL branch record")
    recs = [p["rec"] for p in pieces]
    info = dict(run_log=os.path.relpath(runpath, ROOT), run_log_sha256=runhash, centres_sha256=centrehash,
                branch_record=os.path.relpath(recordpath, ROOT), branch_record_sha256=record_hash,
                branch_program_sha256=br.PROGRAM_SHA256, branch_sources_sha256=dict(br.SOURCES_SHA256),
                n_pieces=len(recs), n_groups=len(groups), g_lo=recs[0]["g_lo"],
                g_hi=str(max(Fraction(p["g_hi"]) for p in recs)), consecutive_gluings_rederived=len(recs)-1)
    _assert_sources_current()
    return recs, centres, info


def gks_point_proofs(gs, stability=True, log=print, data=DATA, K=32, step="5/100000"):
    """branch.py's pointwise proof (its Theorem B1 with g_lo = g_hi = g_s, K = 32, weights 1, POINT_SETTINGS) and,
    if asked, Stage S (branch.stability_point), at the exact decimals gs: the computation of branch.stability_points,
    logged to data/hopf/gks_points.jsonl and data/hopf/gks_points_centres_K32.jsonl (the branch logs are not touched).
    The float continuation from Stage E's centre goes in steps of at most `step` (untrusted)."""
    import branch as br
    ppath = os.path.join(data, "gks_points.jsonl")
    cpath = os.path.join(data, "gks_points_centres_K32.jsonl")
    trk = br.FloatTrack(K)
    out = []
    for g in sorted(Fraction(x) for x in gs):
        t0 = time.time()
        while trk.g + Fraction(step) < g:
            trk.at(trk.g + Fraction(step))
        trk.at(g)
        omb, A, hist = br.refine_centre(trk.om, trk.a, br._dstr(g), prec=256, log=log)
        _append(cpath, br.centre_record(br._dstr(g), omb, A, hist))
        fp = br.FloatPoint(float(omb), br.centre_float(A), float(g), need_hess=False)
        lead = fp.leading_nontrivial()[0]
        delta_s = f"{0.85 * abs(lead):.3e}"
        hb = br.HessBound([(omb, A)], br._dstr(g), br._dstr(g), ["1/4096"] * DIM, "1", None, log=log)
        rec = dict(type="point", g=br._dstr(g), K=K, delta_requested=delta_s, float_leading_exponent=lead,
                   centre_refinement=hist, made_by="hopf.gks_point_proofs (branch.py functions)",
                   code_sha256=CODE_SHA256)
        try:
            pp = br.prove_piece(omb, A, br._dstr(g), br._dstr(g), eta=["1"] * (DIM + 1), r_star="1/1099511627776",
                                hess=hb, log=log, settings=br.POINT_SETTINGS)
            rec.update(ok_existence=True, rec=br._public(pp))
            if stability:
                st = br.stability_point(pp, delta_s, log=log)
                rec.update(ok=True, stability=st)
            else:
                rec.update(ok=False, stability="not run")
        except Exception as e:  # noqa: BLE001  (recorded as a failure, never as a proof)
            rec.update(ok=False, why=f"{type(e).__name__}: {e}")
        rec["wall"] = round(time.time() - t0, 1)
        _append(ppath, rec)
        log(f"G_Ks point g = {br._dstr(g)}: existence {rec.get('ok_existence', False)}, Stage S "
            f"{rec.get('ok') if stability else 'not run'} ({rec['wall']} s)")
        out.append(rec)
    return out


def gks_points(data=DATA):
    """The point proofs (K = 32) of branch.py's log and of gks_point_proofs, with their centres:
    (list of point records with a 'source' field, centres by (source, g))."""
    pts, cents = [], {}
    for src, pf, cf in (("branch", os.path.join(BRANCH_DIR, "points_K12.jsonl"),
                         os.path.join(BRANCH_DIR, "points_centres_K32.jsonl")),
                        ("hopf", os.path.join(data, "gks_points.jsonl"),
                         os.path.join(data, "gks_points_centres_K32.jsonl"))):
        for r in _read_final_jsonl(pf):
            if r.get("type") == "point" and r.get("ok_existence") and r.get("rec"):
                pts.append(dict(r, source=src))
        for r in _read_final_jsonl(cf):
            cents[(src, r["g"])] = r
    return pts, cents


def point_on_gks_branch(pt, cent, recs, centres):
    """branch.point_on_branch for every G_Ks piece containing the point's g (the first that passes is reported)."""
    import branch as br
    g = Fraction(pt["g"])
    res = []
    for p in recs:
        if Fraction(p["g_lo"]) <= g <= Fraction(p["g_hi"]):
            pc = centres[br._dstr(Fraction(p["centre_g"]))]
            r_ = br.point_on_branch(pt, cent, p, pc)
            res.append(r_)
            if r_["ok"]:
                return dict(ok=True, piece=r_["piece"], piece_label=r_["piece_label"], lhs=r_["lhs"]["approx"],
                            r_uniqueness_piece=r_["r_uniqueness_piece"]["approx"])
    return dict(ok=False, tried=[dict(piece=r_.get("piece"), ok=r_["ok"]) for r_ in res])


def bridge_checks(log=print, data=DATA, prec=256, write=True):
    """Part C and the stability points: for every branch.py point proof (g_s), Lemma D against the eps-branch, and
    (gluing) branch.point_on_branch against the G_Ks branch. Writes data/hopf/gluing_gks_final.json when write=True and returns it."""
    _assert_sources_current()
    lines, covers = piece_lines(data), cover_records(data)
    validate_piece_inputs(lines, covers)
    pieces = final_pieces(data)
    states = [_piece_state(r) for r in pieces]
    with am.precision(prec):
        nu_eps = _arb_q(pieces[0]["settings"]["rho0"]).exp()
    recs, centres, info = gks_branch_snapshot(log=log)
    pts, cents = gks_points(data)
    shas = {}
    for pth in (os.path.join(BRANCH_DIR, "points_K12.jsonl"), os.path.join(BRANCH_DIR, "points_centres_K32.jsonl"),
                os.path.join(data, "gks_points.jsonl"), os.path.join(data, "gks_points_centres_K32.jsonl")):
        if os.path.exists(pth):                # append-only logs: the complete lines read here, their count and hash
            _, n_, sha_ = _complete_lines(pth)
            shas[os.path.relpath(pth, ROOT)] = dict(lines=n_, sha256_of_these_lines=sha_)
    out = dict(gks_branch_snapshot=info, points=[], eps_branch=dict(n_pieces=len(pieces), eps_end=pieces[-1]["e_hi"]),
               point_logs_sha256=shas, sources_sha256=dict(SOURCE_SHA256),
               eps_piece_log_sha256=_sha(os.path.join(data, "pieces.jsonl")))
    for pt in sorted(pts, key=lambda r: Fraction(r["g"])):
        cent = cents.get((pt["source"], pt["g"]))
        if cent is None:
            continue
        d = point_in_eps_branch(pt["rec"], cent, states, nu_eps, prec)
        on = point_on_gks_branch(pt, cent, recs, centres)
        st = pt.get("stability") if pt.get("ok") else None
        item = dict(g=pt["g"], source=pt["source"], on_eps_branch=d["ok"], lemma_D=d, on_gks_branch=on["ok"], gks_check=on,
                    stage_S_ok=bool(pt.get("ok")),
                    multiplier_bound_full_period=(st or {}).get("multiplier_bound_full_period"),
                    delta=(st or {}).get("delta"))
        out["points"].append(item)
        log(f"  point g = {pt['g']}: on the eps-branch {d['ok']} (eps in {d['eps_enclosure']}), on the G_Ks branch "
            f"{on['ok']}, Stage S {bool(pt.get('ok'))}")
    glue_pts = [p for p in out["points"] if p["on_eps_branch"] and p["on_gks_branch"]]
    out["glue_points"] = [dict(g=p["g"], source=p["source"]) for p in glue_pts]
    out["ok"] = bool(glue_pts)
    out["stable_bridge_points"] = [dict(g=p["g"], source=p["source"]) for p in out["points"]
                                   if p["on_eps_branch"] and p["stage_S_ok"]]
    _assert_sources_current()
    if write:
        with open(os.path.join(data, "gluing_gks_final.json"), "w") as fh_:
            json.dump(out, fh_, indent=1, default=str)
    return out


# =================================================================================================================
# collect: the record results/fourier-hopf.json
# =================================================================================================================
def collect(write=True, log=print, data=DATA):
    """Re-derive the eps-chain from the logs (every gluing in Arb, adjacency, covers, centre digests), the structure of
    Theorem A's cover (check_theoremA_cover: adjacency, coverage of W, signs, others_max_re), the identification at
    eps = 0 (Corollary B(a)), read the bridge checks (bridge_checks: Lemma D and the gluing to the G_Ks branch), report
    which pieces have a matching re-proof by the current program (reprove_status, data/hopf/reprove_final.jsonl), and write
    results/fourier-hopf.json."""
    _assert_sources_current()
    lines, covers = piece_lines(data), cover_records(data)
    validate_piece_inputs(lines, covers)
    pieces = [lines[i][0] for i in sorted(lines)]
    pA = os.path.join(data, THEOREM_A_LOG)
    if not os.path.exists(pA):
        raise RuntimeError("theoremA_final.json missing: run --theorem-a first")
    with open(pA) as fh_:
        thA = json.load(fh_)
    thA_checks = check_theoremA_cover(thA)
    if not thA_checks["ok"]:
        raise ProofFailure(f"Theorem A record fails its structural checks: "
                           f"{[k for k, v in thA_checks.items() if v is False]}")
    if thA.get("code_sha256") != CODE_SHA256 or thA.get("sources_sha256") != SOURCE_SHA256:
        raise ProofFailure("stale Theorem A evidence; rerun --theorem-a with current scientific sources")
    reproof = reprove_status(data)
    pieces = final_pieces(data)
    with am.precision(192):
        nu = _arb_q(pieces[0]["settings"]["rho0"]).exp()
    states = [_piece_state(r) for r in pieces]
    if states[0]["e_lo"] != 0:
        raise ProofFailure("the first piece does not start at eps = 0")
    glued = []
    for i in range(1, len(states)):
        if states[i]["e_lo"] != states[i - 1]["e_hi"]:
            raise ProofFailure(f"pieces {i - 1} and {i} are not adjacent")
        okg, slack = glue(states[i - 1], states[i], nu)
        if not okg:
            raise ProofFailure(f"gluing {i - 1} -> {i} fails")
        glued.append(slack)
    for r in pieces:
        if r["cover"] not in covers:
            raise ProofFailure(f"piece {r['idx']}: cover {r['cover']} not logged")
        if Centre.from_record(r["centre"]).digest() != r["result"]["centre_sha256"]:
            raise ProofFailure(f"piece {r['idx']}: centre digest mismatch")
        if not covers[r["cover"]]["record"]["digest"].startswith(r["cover"]) or \
                r["result"]["cover"] != covers[r["cover"]]["record"]["digest"]:
            raise ProofFailure(f"piece {r['idx']}: cover digest mismatch")
        # the logged radii-polynomial inequalities (exact upper bounds): 0 < r_lo <= r_hi <= r_*, p(r_lo) < 0,
        # p(r_hi) < 0, Z1 + Z2 r_hi < 1. r_lo = r_hi is allowed (existence._radii's fallback): Theorem B's continuity
        # argument uses the smaller root r_1 < r_lo of p, which exists because p(r_lo) < 0 strictly.
        rl_, rh_ = hex_fraction(r["result"]["r_existence"]), hex_fraction(r["result"]["r_uniqueness"])
        if not (0 < rl_ <= rh_ <= hex_fraction(r["result"]["r_star"])):
            raise ProofFailure(f"piece {r['idx']}: radii not ordered 0 < r_existence <= r_uniqueness <= r_*")
        if not (hex_fraction(r["result"]["p_at_r_existence"]) < 0 and hex_fraction(r["result"]["p_at_r_uniqueness"]) < 0
                and hex_fraction(r["result"]["contraction_at_r_uniqueness"]) < 1):
            raise ProofFailure(f"piece {r['idx']}: logged radii-polynomial inequalities do not hold")
    ident = identification_at_eps0(pieces[0], thA, log=log)
    if ident.get("ok") is not True:
        raise ProofFailure("fresh-bound eps=0 identification was not certified")
    gHa, gHb = Fraction(thA["gH_interval"][0]), Fraction(thA["gH_interval"][1])
    first_below = None
    for r in pieces:
        if hex_fraction(r["result"]["g"]["upper"]) < gHa:
            first_below = r["e_lo"]
            break
    below_after = first_below is not None and all(hex_fraction(r["result"]["g"]["upper"]) < gHa for r in pieces
                                                  if Fraction(r["e_lo"]) >= Fraction(first_below))
    eps_end = Fraction(pieces[-1]["e_hi"])
    with am.precision(256):
        _, g_end_ball, _, _, _ = ball_of_piece_at(states[-1], eps_end)
        g_end_hi = up(g_end_ball)
        g_end_lo = lo(g_end_ball)
    bridge_g_low = dec(g_end_hi, "up", 20)
    # Re-derive the bridge against the complete final branch, rather than trusting saved success flags.
    gl = bridge_checks(log=log, data=data, write=False)
    if not gl.get("ok"):
        raise ProofFailure("gluing to the final G_Ks branch was not certified")
    closed = bool(gl and gl.get("ok") and not gl.get("stale") and ident.get("ok"))
    gks_hi = Fraction(gl["gks_branch_snapshot"]["g_hi"]) if gl else None
    summary = [dict(idx=r["idx"], eps=[r["e_lo"], r["e_hi"]], g=[r["result"]["g"]["lower"]["dec"][:18],
                                                                  r["result"]["g"]["upper"]["dec"][:18]],
                    T_ms=[r["result"]["T_ms"]["lower"]["dec"][:14], r["result"]["T_ms"]["upper"]["dec"][:14]],
                    r_existence=r["result"]["r_existence"]["approx"], r_uniqueness=r["result"]["r_uniqueness"]["approx"],
                    Y0=r["result"]["Y0"]["approx"], Z1=r["result"]["Z1"]["approx"], Z2=r["result"]["Z2"]["approx"],
                    contraction=r["result"]["contraction_at_r_uniqueness"]["approx"],
                    cover=r["cover"], centre_sha256=r["result"]["centre_sha256"],
                    glue_slack=r["glue_prev"]["slack"] if r.get("glue_prev") else None,
                    code_sha256=r.get("code_sha256")) for r in pieces]
    theorem_B = (f"For every eps in [0, {eps_end}] the blown-up problem F(.; eps) = 0 (LEMMAS-hopf.md, B0) has a zero "
                 f"x*(eps) = (omega*, g*, c*, w*), unique in the ball B_r_hi(xbar(eps)) of the piece containing eps, real, "
                 f"continuous in eps. For eps > 0, z(t) = c*(eps) + eps w*(eps)(omega*(eps) t) is a periodic orbit of the "
                 f"single cell at G_Ks = g*(eps), of minimal period 2 pi / omega*(eps), whose first V Fourier coefficient "
                 f"(scaled variables, phase with Im a_1V = 0) is eps/2; distinct eps give distinct orbits. x*(0) is the "
                 f"Hopf point of Theorem A (g*(0) = g_H). By continuity, every G_Ks in [{bridge_g_low}, g_H) is g*(eps) "
                 f"for some eps in (0, {eps_end}], so the cell has a periodic orbit on the bridge at every such G_Ks.")
    glue_point, theorem_C = None, None
    if closed:
        gp = next(p for p in gl["points"] if p["on_eps_branch"] and p["on_gks_branch"])
        ck = [c for c in gp["lemma_D"]["checks"] if c["ok"]]
        glue_point = dict(g=gp["g"], source=gp["source"], eps_enclosure=gp["lemma_D"]["eps_enclosure"],
                          lemma_D_eps_pieces=[c["eps_piece"] for c in ck],
                          lemma_D_lhs_max=max(c["lhs"] for c in ck), lemma_D_r_uniqueness_min=min(c["r_uniqueness"] for c in ck),
                          gks_piece=gp["gks_check"]["piece"], gks_piece_label=gp["gks_check"]["piece_label"],
                          gks_lhs=gp["gks_check"]["lhs"], gks_r_uniqueness=gp["gks_check"]["r_uniqueness_piece"],
                          stage_S_ok=gp["stage_S_ok"], multiplier_bound_full_period=gp["multiplier_bound_full_period"])
        theorem_C = (f"Theorem C (LEMMAS-hopf.md): the K = 32 point proof at G_Ks = {gp['g']} ({gp['source']} log) is the "
                     f"bridge orbit at eps_s in {gp['lemma_D']['eps_enclosure']} (Lemma D) and the G_Ks-branch orbit of "
                     f"piece {gp['gks_check']['piece_label']} (branch.point_on_branch, on the validated snapshot of the "
                     f"branch logs recorded under bridge_checks.gks_branch_snapshot). So the G_Ks branch on "
                     f"[0.027499735464, {gp['g']}] and the eps-branch on [0, eps_s] form one continuous curve of real "
                     f"periodic orbits of the single cell from the Stage E orbit at G_Ks = 0.0275 to the Hopf point "
                     f"(x_e(g_H), g_H) of Theorem A, and for every G_Ks in [0.027499735464, g_H) the cell has a periodic "
                     f"orbit on this curve (G_Ks branch up to {gp['g']}, intermediate value theorem for g* on [0, eps_s] "
                     f"above it).")
    rec = dict(
        what="Rec 2, Hopf bridge: the single-cell periodic orbit is certified from the end of the G_Ks branch "
             "(branch.py) to the supercritical Hopf point g_H of Theorem A (Erhardt's numerical value lies about "
             "1.5e-8 above it) by a blown-up radii polynomial in the amplitude eps (fourier/hopf.py, LEMMAS-hopf.md)",
        status="source admission check passed; complete numerical acceptance pending",
        review=("reviews/hopf-bridge-review-2026-10-02.md: an in-project adversarial reading by an AI agent session "
                "(no UNSOUND finding); its fixes are mapped in reviews/hopf-bridge-fixes-2026-10-02.md; source admission "
                "check passed, complete numerical acceptance pending"),
        not_claimed=("No outside review has taken place. Stability is NOT proved uniformly on the bridge: only "
                     "(a) for small amplitude, qualitatively (cited Hopf theorem, no explicit range), and (b) at the "
                     "G_Ks values listed under stability_points (Stage S point proofs identified with the bridge by "
                     "Lemma D). Monotonicity of g*(eps) in eps is not certified."),
        theorem_A=("Theorem A (LEMMAS-hopf.md): in W = [0.02789, 0.02792], on every interval of the recorded cover, "
                   "the equilibrium in the interval's polydisc has a simple pair lambda, conj lambda and 16 eigenvalues "
                   "with real part <= others_max_re_upper < 0; Re lambda > 0 left of G_H and < 0 right of it; on G_H "
                   "(width 2e-13) d Re lambda/dg < 0 and there is exactly one g_H with Re lambda(g_H) = 0; at g_H, "
                   "l1 < 0 (enclosure in the record)."),
        theorem_A_record={k: v for k, v in thA.items() if k not in ("cover_left", "cover_right", "polydisc_GH")},
        theorem_A_cover_checks=thA_checks,
        theorem_A_record_by_current_program=thA.get("code_sha256") == CODE_SHA256,
        theorem_B=theorem_B,
        pieces_reproved=reproof,
        eps_covered=["0", str(eps_end)], n_pieces=len(pieces),
        g_star_at_eps_end={"lower": dec(g_end_lo, "down", 20), "upper": dec(g_end_hi, "up", 20)},
        bridge_g_covered=[bridge_g_low, "g_H"],
        first_eps_with_g_certified_below_gH=first_below, certified_below_gH_from_there_on=below_after,
        identification_at_eps0=ident,
        gluing_eps_pieces=dict(n=len(glued), min_slack=min(glued) if glued else None),
        Z1_max=max(r["result"]["Z1"]["approx"] for r in pieces), Z2_max=max(r["result"]["Z2"]["approx"] for r in pieces),
        contraction_max=max(r["result"]["contraction_at_r_uniqueness"]["approx"] for r in pieces),
        T_ms_range=[min(r["result"]["T_ms"]["lower"]["dec"][:14] for r in pieces),
                    max(r["result"]["T_ms"]["upper"]["dec"][:14] for r in pieces)],
        bridge_checks=gl,
        theorem_C=theorem_C,
        glue_point=glue_point,
        hopf_gap_closed=closed,
        gap=(None if closed else dict(bridge_g_low=bridge_g_low, gks_branch_g_hi=(str(gks_hi) if gks_hi else None),
                                      note="glued only through a branch.py point proof whose g lies in both ranges")),
        stability_points=([dict(g=p["g"], source=p["source"], eps=p["lemma_D"]["eps_enclosure"],
                                multiplier_bound_full_period=p["multiplier_bound_full_period"])
                           for p in gl["points"] if p["on_eps_branch"] and p["stage_S_ok"]] if gl else []),
        pieces=summary,
        covers=[dict(id=k, T=v["T"], R=v["R"], G_R=v["G_R"], rho2=v["rho2"], n_evals=v["record"]["n_evals"])
                for k, v in covers.items()],
        sources_sha256=dict(SOURCE_SHA256),
        data_sha256={os.path.basename(p_): _sha(p_) for p_ in (os.path.join(data, f) for f in
                     ("pieces.jsonl", "covers.jsonl", THEOREM_A_LOG, "gluing_gks_final.json", "gks_points.jsonl",
                      "gks_points_centres_K32.jsonl", REPROVE_LOG)) if os.path.exists(p_)},
        python_flint=flint.__version__, FLINT=flint.__FLINT_VERSION__, python=platform.python_version(),
        machine=platform.machine(), date=time.strftime("%Y-%m-%d"),
        total_piece_seconds=round(sum(r.get("seconds", 0) for r in pieces), 1))
    _assert_sources_current()
    if write:
        with open(os.path.join(RESULTS, "fourier-hopf.json"), "w") as fh_:
            json.dump(rec, fh_, indent=1)
    log(f"collect: eps in [0, {float(eps_end):.6f}], {len(pieces)} pieces, bridge covers G_Ks in [{bridge_g_low}, g_H); "
        f"identification at 0: {ident.get('ok')}; glued to the G_Ks branch: {closed}; Theorem A cover checks: "
        f"{thA_checks['ok']} ({thA_checks['n_left']} + 1 + {thA_checks['n_right']} intervals, {thA_checks['n_breaks']} "
        f"breaks); pieces re-proved with this program: {reproof['n_reproved_with_current_program']} of "
        f"{reproof['n_pieces']} (not yet: {reproof['not_reproved'] or 'none'}; mismatched: "
        f"{reproof['mismatched'] or 'none'})")
    return rec


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--theorem-a", action="store_true")
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--e-stop", default="0.2")
    ap.add_argument("--g-stop", default=None, help="stop once a piece's g enclosure lies below this value")
    ap.add_argument("--budget", type=float, default=3300)
    ap.add_argument("--K", type=int, default=None, help="Galerkin size of new eps pieces (default RUN_SETTINGS)")
    ap.add_argument("--M", type=int, default=None, help="DFT nodes of new eps pieces (default RUN_SETTINGS)")
    ap.add_argument("--gks-points", default=None, help="comma-separated exact decimals: K = 32 G_Ks point proofs")
    ap.add_argument("--no-stability", action="store_true", help="with --gks-points: existence only (no Stage S)")
    ap.add_argument("--bridge", action="store_true", help="Lemma D for the branch.py point proofs and the gluing")
    ap.add_argument("--reprove-all", action="store_true",
                    help="re-prove every logged eps piece with the current program; log data/hopf/reprove_final.jsonl")
    ap.add_argument("--reprove-pieces", default=None, help="comma-separated piece indices: re-prove only these")
    ap.add_argument("--reprove-log", default=None, help="log path for the re-proofs (default data/hopf/reprove_final.jsonl)")
    ap.add_argument("--workers", type=int, default=1, help="with --reprove-all/--reprove-pieces: parallel processes")
    ap.add_argument("--collect", action="store_true")
    a = ap.parse_args()
    if a.theorem_a:
        theorem_A()
    if a.run:
        run(e_stop=a.e_stop, budget_s=a.budget, g_stop=a.g_stop, K=a.K, M=a.M)
    if a.reprove_all or a.reprove_pieces:
        sel = None if a.reprove_all else [int(x) for x in a.reprove_pieces.split(",") if x.strip()]
        reprove_all(pieces=sel, workers=a.workers, budget_s=a.budget, out_path=a.reprove_log)
    if a.gks_points:
        gks_point_proofs([x.strip() for x in a.gks_points.split(",") if x.strip()], stability=not a.no_stability)
    if a.bridge:
        bridge_checks()
    if a.collect:
        collect()
    return 0


if __name__ == "__main__":
    sys.exit(main())
