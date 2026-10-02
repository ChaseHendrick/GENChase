"""Rigorous Fourier coefficients of g(theta) = f(phi(theta)) for a trigonometric polynomial phi (Arb ball arithmetic).

Component 2 of the Fourier / Hill route (design D of the 2026-10-01 design panel). Everything that this module calls
a bound is computed in Arb balls (python-flint 0.9.0) from the mathematics written below; nothing is estimated in
floating point. Floats appear only in the order in which boxes are refined, which does not affect any bound.

Setting and notation
--------------------
phi(theta) = sum_{|m| <= K} a_m e^{i m theta}, a_m in C^n, given as Arb complex balls (a family of trigonometric
polynomials: every statement below holds for every phi whose coefficients lie in the balls). f: U -> C^p is
holomorphic on an open set U in C^n and is given only as a black box F (see "Contract on F"). The composite
g = f o phi is 2 pi periodic, and its Fourier coefficients are

    c_k = (1 / 2 pi) int_0^{2 pi} g(theta) e^{-i k theta} d theta.

The closed strip is Sigma_rho = {theta in C : |Im theta| <= rho}, rho > 0 exactly representable.

Contract on F (the black box)
-----------------------------
F takes a list of n acb balls X = (X_1, ..., X_n) and returns p acb balls Y, or raises ArithmeticError. It is an
admissible inclusion function of the holomorphic f: U -> C^p if, whenever F(X) returns balls that are all finite,
then X is contained in U and f(z) lies in Y (componentwise) for every z in X. A function written with acb
+, -, *, integer powers, exp, and division, plus the guarded log and sqrt of this module, satisfies the contract
with U = {z : every divisor is nonzero and every log or sqrt argument avoids (-inf, 0]} and f the composite
(principal branches), by induction over the expression: each intermediate ball contains the intermediate value
for every z in X; Arb returns a non-finite ball for a quotient whose divisor ball contains 0 (checked on this
build by test_fourier_eval.test_primitives), and the guarded log and sqrt raise unless the argument ball avoids
(-inf, 0], where the principal branches are holomorphic. Arb's own acb log does NOT signal a ball that crosses
the cut (it returns a finite ball enclosing both sides), which is why the guards exist. Non-integer powers, abs,
max, comparisons on balls, and conversions to float are not allowed inside F.

1. Strip sup (Lemma 1)
----------------------
The rectangle R = [0, 2 pi] x [-rho, rho] (in Re theta, Im theta) is split into an initial grid and refined by
bisection. Every box is a closed rectangle [2 pi xl, 2 pi xr] x [rho yl, rho yr] with exact rationals xl, xr, yl, yr
(fmpq), so the leaves of the bisection tree tile R exactly: a split at the exact rational midpoint replaces a
rectangle by two closed rectangles whose union is that rectangle. The ball Theta_B used for box B is
acb(union(2 pi xl, 2 pi xr), union(rho yl, rho yr)) with each endpoint an Arb ball containing the exact endpoint;
arb union returns a ball containing both balls, hence (a ball being an interval) their convex hull, hence B.
On Theta_B the code computes w = exp(i Theta_B), w^{-1} = exp(-i Theta_B), the powers w^m by repeated ball
multiplication, Phi_B = sum_m a_m w^m (acb_mat product), and Y_B = F(Phi_B). By the inclusion property of each
step, phi(theta) is in Phi_B and g(theta) is in Y_B for every theta in B.

Lemma 1. If every leaf gives finite balls, then phi(R) is in U, g extends holomorphically to an open
neighbourhood of Sigma_rho, and sup_{Sigma_rho} |g_i| <= S_i := max over leaves of abs_upper(Y_{B,i}).
Proof. Each theta in R lies in some leaf B, so phi(theta) is in Phi_B, which lies in U by the contract. phi is
2 pi periodic, so phi(Sigma_rho) = phi(R) is in U; U is open and phi is continuous, so phi^{-1}(U) is an open set
containing Sigma_rho, on which g = f o phi is holomorphic. |g_i(theta)| <= abs_upper(Y_{B,i}) <= S_i. QED.

The whole rectangle is covered, not only its two edges. On the edges alone a sup can be finite while a pole or
branch point sits strictly inside the strip (g = 1/(b - cos theta) with rho > arccosh b); then g is not
holomorphic on the strip and the Cauchy estimate below is false. The interior boxes certify holomorphy; the sup
itself would follow from the edges by the maximum principle once holomorphy is known.

Centred (mean-value) form, optional. If a derivative black box DF is supplied (DF(X) returns (Y, J) with the same
contract for Y and, when finite, Df(z) in J for every z in X; component 1's arbmodel.f_and_df is one, by forward-mode
dual numbers in ball arithmetic), each box also gets the bound
    g_i(theta) in G_i(theta_c) + (sum_j J_ij(Phi_B) Phi'_j(B)) * (Theta_B - theta_c),   theta in B,
where theta_c is the exact centre of B, G(theta_c) = F(Phi(theta_c)) and Phi'_B = sum_m i m a_m w^m. Proof: Y_B finite
gives holomorphy of g near B (Lemma 1); the segment from theta_c to theta lies in the convex B, so
g(theta) - g(theta_c) = (theta - theta_c) int_0^1 g'(theta_c + t (theta - theta_c)) dt, and
g'(s) = Df(phi(s)) phi'(s) lies in the convex ball J(Phi_B) Phi'_B for every s in B, hence so does the average.
The box bound used is the smaller of abs_upper of this and of Y_B (both are upper bounds of |g_i| on B). The naive
Y_B carries the dependency of f's formula over the whole box (in the cardiac model, (m_inf(V) - m) / tau_m cancels to
1e-5 of its terms); the centred form's width is about |g'| times the box size.

Adaptive refinement: every box is also evaluated at its centre (a thin ball), and L_i, the largest abs_lower of
these values (and of the box balls), is a rigorous lower bound for sup_R |g_i|. A leaf B is refined while it is
non-finite, or while its bound exceeds max((1 + rtol) L_i, atol) for some i. Refinement stops at a budget; leaves
then accepted only make S looser, never wrong. A non-finite leaf that cannot be refined further stops the
computation with StripCoverError: holomorphy on the strip is then not certified.

2. Cauchy estimate (Lemma 2)
----------------------------
Lemma 2. If g is holomorphic on an open set containing Sigma_rho, 2 pi periodic and |g| <= S on Sigma_rho, then
|c_m| <= S e^{-rho |m|} for every integer m.
Proof. For m > 0, integrate g(theta) e^{-i m theta} over the boundary of the rectangle with corners 0, 2 pi,
2 pi - i rho, -i rho. By Cauchy's theorem the integral is 0; the two vertical sides cancel by periodicity. So
c_m = (1 / 2 pi) int_0^{2 pi} g(x - i rho) e^{-i m (x - i rho)} dx and |e^{-i m (x - i rho)}| = e^{-m rho}, hence
|c_m| <= S e^{-m rho}. For m < 0 shift to Im theta = +rho; m = 0 is |c_0| <= sup_R |g| <= S. QED.

3. Aliased DFT (Lemma 3)
------------------------
With nodes theta_j = 2 pi j / M (j = 0..M-1), c_hat_k = (1/M) sum_j g(theta_j) e^{-i k theta_j}.
Lemma 3. Under Lemma 2's hypotheses and |k| < M,
    |c_hat_k - c_k| <= E_k := S (e^{-rho (M - k)} + e^{-rho (M + k)}) / (1 - e^{-rho M}).
Proof. sum_m |c_m| <= S sum_m e^{-rho |m|} < infinity, so the Fourier series of g converges absolutely and
uniformly to the continuous function g (a continuous function whose Fourier series converges uniformly equals its
sum, by uniqueness of Fourier coefficients). Substituting, and using (1/M) sum_j e^{i (m - k) theta_j} = 1 if
m = k mod M and 0 otherwise, c_hat_k = sum_{l in Z} c_{k + l M}, so c_hat_k - c_k = sum_{l != 0} c_{k + l M}.
For l >= 1, k + l M >= k + M > 0, so |c_{k + l M}| <= S e^{-rho (k + l M)} and
sum_{l >= 1} = S e^{-rho (M + k)} sum_{j >= 0} e^{-rho M j} = S e^{-rho (M + k)} / (1 - e^{-rho M}).
For l <= -1, write l = -j with j >= 1: k - j M <= k - M < 0, so |k + l M| = j M - k and
sum_{j >= 1} S e^{-rho (j M - k)} = S e^{-rho (M - k)} / (1 - e^{-rho M}). Add the two. QED.
E_k is even in k. The code computes E_k in Arb from the arb S (an exact upper bound) and exact rho, M, k.

4. Enclosure of c_k (Theorem)
-----------------------------
The node values are Arb balls: e^{i m theta_j} = e^{i pi q} with q = 2 (m j mod M) / M an exact rational, computed
by arb.sin_cos_pi_fmpq; Phi_j = sum_m a_m e^{i m theta_j}; G_j = F(Phi_j), which must be finite. Then
C_hat_k = (1/M) sum_j G_j e^{-i k theta_j} (acb_mat product) is a ball containing c_hat_k. The returned ball is
C_k = C_hat_k + E_k * Q, Q = acb([-1, 1], [-1, 1]) (radius exactly 1 in each part). Every complex w with
|w| <= E_k has w / E_k in the closed unit disc, which lies in the unit square, so w is in E_k * Q.

Theorem. Let the strip cover of Lemma 1 succeed with bounds S_i. For every phi in the coefficient balls, every
component i and every |k| <= K' (K' < M): c_{i,k}[f o phi] lies in the returned ball C_{i,k}, and for every m,
|c_{i,m}| <= S_i e^{-rho |m|} (in particular for |m| > K', the tail).

5. Weighted tail (for the radii polynomial)
-------------------------------------------
For 0 < nu with q = nu e^{-rho} < 1: sum_{|m| > K'} |c_m| nu^{|m|} <= 2 S sum_{m > K'} q^m = 2 S q^{K'+1} / (1 - q).

Constants: no constant in this file is estimated. Lemma 3's E_k and the tail sums are evaluated in Arb from S, rho,
M, k, K', nu; S is an exact Arb number rounded up by acb.abs_upper.
"""
from __future__ import annotations

import hashlib
import heapq
import math
import time
from contextlib import contextmanager
from dataclasses import dataclass, field as dc_field
from types import SimpleNamespace
from typing import Callable, List, Optional, Sequence

from flint import acb, acb_mat, arb, ctx, fmpq

__all__ = [
    "DomainError", "StripCoverError", "guarded_log", "guarded_sqrt", "guarded_exp", "GUARDED_ACB_MATH",
    "TrigPoly", "StripSup", "sup_over_rectangles", "strip_sup", "node_values", "aliased_dft", "alias_bound",
    "enclose_coefficients", "tail_bound", "tail_l1", "FourierEnclosure", "fourier_coefficients", "precision",
]


# ---------------------------------------------------------------------------------------------------------------
# Guarded elementary functions (see "Contract on F")
# ---------------------------------------------------------------------------------------------------------------
class DomainError(ArithmeticError):
    """A ball met a singular set (branch cut or pole) of a guarded function: holomorphy is not certified there."""


class StripCoverError(ArithmeticError):
    """The strip cover could not certify that f o phi is holomorphic and finite on the whole closed strip."""


def _as_acb(z) -> acb:
    return z if isinstance(z, acb) else acb(z)


def _avoids_nonpositive_axis(z: acb) -> bool:
    """True only if the closed ball z certainly does not meet (-inf, 0] (Arb comparisons are certain-or-False).

    A rectangle avoids (-inf, 0] if its real part is certainly > 0, or its imaginary part certainly excludes 0
    (then it misses the whole real axis)."""
    return bool(z.real > 0 or z.imag > 0 or z.imag < 0)


def guarded_log(z) -> acb:
    """Principal log, holomorphic on C minus (-inf, 0]; raises DomainError unless the ball avoids that set."""
    z = _as_acb(z)
    if not z.is_finite() or not _avoids_nonpositive_axis(z):
        raise DomainError("log argument ball meets (-inf, 0]")
    return z.log()


def guarded_sqrt(z) -> acb:
    """Principal sqrt, holomorphic on C minus (-inf, 0]; raises DomainError unless the ball avoids that set."""
    z = _as_acb(z)
    if not z.is_finite() or not _avoids_nonpositive_axis(z):
        raise DomainError("sqrt argument ball meets (-inf, 0]")
    return z.sqrt()


def guarded_exp(z) -> acb:
    """exp is entire; the only guard is finiteness of the input."""
    z = _as_acb(z)
    if not z.is_finite():
        raise DomainError("exp of a non-finite ball")
    return z.exp()


# Namespace for formula code written against M.exp / M.log / M.sqrt (as model/tp06_18d.py is).
GUARDED_ACB_MATH = SimpleNamespace(exp=guarded_exp, log=guarded_log, sqrt=guarded_sqrt)


@contextmanager
def precision(bits: Optional[int]):
    """Temporarily set the Arb working precision (bits); None leaves it unchanged."""
    old = ctx.prec
    if bits is not None:
        ctx.prec = int(bits)
    try:
        yield
    finally:
        ctx.prec = old


def _exact_positive(x, name: str) -> arb:
    a = x if isinstance(x, arb) else arb(x)
    if not a.is_exact():
        raise ValueError(f"{name} must be exactly representable (a float or a dyadic string), got {x!r}")
    if not a > 0:
        raise ValueError(f"{name} must be > 0")
    return a


# ---------------------------------------------------------------------------------------------------------------
# Trigonometric polynomial with ball coefficients
# ---------------------------------------------------------------------------------------------------------------
class TrigPoly:
    """phi(theta) = sum_{m=-K..K} a_m e^{i m theta} in C^n; coeffs[i][m + K] = a_{i,m} (anything acb accepts)."""

    def __init__(self, coeffs: Sequence[Sequence]):
        rows = [list(r) for r in coeffs]
        if not rows:
            raise ValueError("phi needs at least one component")
        L = len(rows[0])
        if L % 2 != 1 or any(len(r) != L for r in rows):
            raise ValueError("each component needs 2K+1 coefficients (index m + K)")
        self.n = len(rows)
        self.K = (L - 1) // 2
        self.coeffs = [[_as_acb(c) for c in r] for r in rows]
        C = acb_mat(L, self.n)
        for i, r in enumerate(self.coeffs):
            for t, c in enumerate(r):
                C[t, i] = c
        self._C = C  # (2K+1) x n
        Cd = acb_mat(L, self.n)  # coefficients of phi' = sum i m a_m e^{i m theta} (exact up to 256 + 6 bits)
        with precision(max(ctx.prec, 256)):
            for i, r in enumerate(self.coeffs):
                for t, c in enumerate(r):
                    Cd[t, i] = c * acb(0, t - self.K)
        self._Cd = Cd

    def coeff(self, i: int, m: int) -> acb:
        return self.coeffs[i][m + self.K] if abs(m) <= self.K else acb(0)

    def digest(self) -> str:
        """SHA-256 of the exact coefficient balls (midpoint and radius mantissa/exponent pairs): ties a StripSup to
        the phi it was computed for, so that fourier_coefficients can refuse a bound made for another phi."""
        h = hashlib.sha256(f"{self.n} {self.K}".encode())
        for r in self.coeffs:
            for c in r:
                for part in (c.real, c.imag):
                    h.update(repr((part.mid().man_exp(), part.rad().man_exp())).encode())
        return h.hexdigest()

    def powers(self, theta: acb) -> List[acb]:
        """[e^{i m theta} for m = -K..K] as balls containing the values for every theta in the ball theta."""
        K = self.K
        w = acb(-theta.imag, theta.real).exp()      # e^{i theta}, i theta = -Im + i Re
        wi = acb(theta.imag, -theta.real).exp()     # e^{-i theta}
        pw = [None] * (2 * K + 1)
        pw[K] = acb(1)
        for m in range(1, K + 1):
            pw[K + m] = pw[K + m - 1] * w
            pw[K - m] = pw[K - m + 1] * wi
        return pw

    def eval_rows(self, rows: List[List[acb]], derivative: bool = False) -> List[List[acb]]:
        """rows[b] = [e^{i m theta_b}]_{m=-K..K}; returns phi(theta_b) (or phi'(theta_b)) for each b."""
        if not rows:
            return []
        P = acb_mat(rows)
        Q = P * (self._Cd if derivative else self._C)
        return [[Q[b, i] for i in range(self.n)] for b in range(len(rows))]

    def eval(self, theta) -> List[acb]:
        return self.eval_rows([self.powers(_as_acb(theta))])[0]


# ---------------------------------------------------------------------------------------------------------------
# 1. Strip sup by a 2-D box cover
# ---------------------------------------------------------------------------------------------------------------
@dataclass
class StripSup:
    """Result of a cover. S[i] (exact arb) bounds sup |g_i| over the covered set; L[i] <= that sup."""
    S: List[arb]
    L: List[arb]
    rho: arb
    full_strip: bool                 # True iff the cover is the whole rectangle [0, 2pi] x [-rho, rho]
    n_evals: int
    n_leaves: int
    n_nonfinite_evals: int
    n_unresolved: int                # leaves kept at min_width or at budget without meeting rtol (S looser only)
    min_leaf_width: float
    seconds: float
    prec: int
    params: dict = dc_field(default_factory=dict)
    leaves: Optional[list] = None    # [(xl, xr, yl, yr)] exact rationals, only with keep_leaves=True
    phi_digest: str = ""             # TrigPoly.digest() of the phi the cover was computed for

    def S_max(self) -> arb:
        out = self.S[0]
        for s in self.S[1:]:
            if s > out:
                out = s
        return out

    def ratio(self) -> List[float]:
        """S_i / L_i (floats, diagnostic only): how far the cover's bound is from a proven lower bound."""
        out = []
        for s, l in zip(self.S, self.L):
            lf = float(l.mid())
            out.append(float(s.mid()) / lf if lf > 0 else math.inf)
        return out


_CATCH = (ArithmeticError, ValueError)


def _theta_ball(lo: fmpq, hi: fmpq, scale: arb) -> arb:
    """Ball containing [scale lo, scale hi] (the union of two balls contains their convex hull)."""
    return (scale * arb(lo)).union(scale * arb(hi))


def _call(F, z):
    """F(z) as a list of finite acb balls, or (None, reason)."""
    try:
        Y = list(F(z))
    except _CATCH as e:  # contract: an exception means "not certified here"
        return None, f"{type(e).__name__}: {e}"
    if not all(isinstance(y, acb) and y.is_finite() for y in Y):
        return None, "F returned a non-finite ball"
    return Y, ""


def _evaluate_boxes(f, df, phi: "TrigPoly", boxes, two_pi: arb, rho_a: arb):
    """For each box (xl, xr, yl, yr): (u, l, reason) with u[i] an exact upper bound of |g_i| on the box (None if not
    certified) and l[i] a lower bound of sup_box |g_i|. Section 1 of the module docstring."""
    rows_b, rows_c, thetas, centres = [], [], [], []
    for (xl, xr, yl, yr) in boxes:
        th = acb(_theta_ball(xl, xr, two_pi), _theta_ball(yl, yr, rho_a))
        tc = acb(two_pi * arb((xl + xr) / 2), rho_a * arb((yl + yr) / 2))
        thetas.append(th)
        centres.append(tc)
        rows_b.append(phi.powers(th))
        rows_c.append(phi.powers(tc))
    vals_b = phi.eval_rows(rows_b)
    vals_c = phi.eval_rows(rows_c)
    ders_b = phi.eval_rows(rows_b, derivative=True) if df is not None else [None] * len(boxes)
    out = []
    for th, tc, zb, zc, dz in zip(thetas, centres, vals_b, vals_c, ders_b):
        if not all(v.is_finite() for v in zb):
            out.append((None, None, "phi ball not finite"))
            continue
        Yc, why = _call(f, zc)
        if Yc is None:
            out.append((None, None, "at the centre: " + why))
            continue
        if df is None:
            Yb, why = _call(f, zb)
            J = None
        else:
            try:
                Yb, J = df(zb)
                Yb = list(Yb)
            except _CATCH as e:
                Yb, why = None, f"{type(e).__name__}: {e}"
            if Yb is not None and not all(isinstance(y, acb) and y.is_finite() for y in Yb):
                Yb, why = None, "DF returned a non-finite value ball"
        if Yb is None:
            out.append((None, None, why))
            continue
        if len(Yb) != len(Yc):
            raise ValueError("F and DF disagree on the number of components")
        u = [y.abs_upper() for y in Yb]
        if J is not None:
            if not isinstance(J, acb_mat):
                J = acb_mat([list(r) for r in J])
            if J.nrows() != len(Yb) or J.ncols() != phi.n:
                raise ValueError("DF's Jacobian has the wrong shape")
            Gp = J * acb_mat([[v] for v in dz])            # g'(B) enclosure, p x 1
            d = th - tc                                     # contains theta - theta_c for theta in B
            for i in range(len(Yb)):
                gi = Gp[i, 0]
                if not gi.is_finite():
                    continue
                cen = Yc[i] + gi * d
                # Both cen and Yb[i] contain g_i(theta) for every theta in B, so they must meet. Disjoint balls prove
                # that F or DF breaks its contract (e.g. a wrong derivative); refuse rather than use either.
                if not cen.overlaps(Yb[i]):
                    raise ValueError(f"centred and naive enclosures of component {i} are disjoint on a box: "
                                     "DF is not a valid derivative enclosure of F")
                ui = cen.abs_upper()
                if ui < u[i]:
                    u[i] = ui
        l = [a if a > b else b for a, b in ((yc.abs_lower(), yb.abs_lower()) for yc, yb in zip(Yc, Yb))]
        out.append((u, l, ""))
    return out


def sup_over_rectangles(f: Callable, phi: "TrigPoly", rho, rects, *, df: Optional[Callable] = None,
                        rtol: float = 1.0, atol: float = 0.0, nx: Optional[int] = None, max_evals: int = 200000,
                        min_width: float = 2.0 ** -24, batch: int = 64, prec: int = 53,
                        keep_leaves: bool = False) -> StripSup:
    """Rigorous upper bounds for sup |f_i(phi(theta))| over a union of closed rectangles.

    rects: list of (xl, xr, yl, yr), rationals with Re theta in [2 pi xl, 2 pi xr] and Im theta in [rho yl, rho yr]
    (degenerate rectangles, e.g. yl == yr, are allowed). Only strip_sup's full rectangle certifies Lemma 1; other
    covers exist for diagnostics and for the negative controls in the tests. See the module docstring, section 1.
    df (optional): derivative black box z -> (f(z) balls, Jacobian acb_mat p x n) for the centred form.
    rtol, atol, nx, max_evals, min_width and batch steer the refinement and affect only how tight S is (and the
    cost), never its validity. nx is the number of initial boxes per period in Re theta (default max(16, 4K)).
    One box evaluation costs two calls (F at the centre, and F or DF on the box).
    """
    t0 = time.time()
    with precision(prec):
        rho_a = _exact_positive(rho, "rho")
        rho_f = float(rho_a.mid())
        two_pi = 2 * arb.pi()
        nx = nx or max(16, 4 * phi.K)
        boxes = []
        for (xl, xr, yl, yr) in rects:
            xl, xr, yl, yr = fmpq(xl), fmpq(xr), fmpq(yl), fmpq(yr)
            if xr < xl or yr < yl:
                raise ValueError("empty rectangle")
            wx = float(xr - xl) * 2 * math.pi
            wy = float(yr - yl) * rho_f
            kx = max(1, math.ceil(nx * float(xr - xl)))
            ky = max(1, math.ceil(wy / (wx / kx))) if (wy > 0 and wx > 0) else 1
            for a in range(kx):
                for b in range(ky):
                    boxes.append((xl + (xr - xl) * fmpq(a, kx), xl + (xr - xl) * fmpq(a + 1, kx),
                                  yl + (yr - yl) * fmpq(b, ky), yl + (yr - yl) * fmpq(b + 1, ky)))

        st = SimpleNamespace(L=None, n_evals=0, n_bad=0, last_err="", counter=0)
        heap = []          # (-priority, counter, box, u); u None marks a non-finite box
        accepted = []      # (box, u, unresolved_flag)

        def width(box):
            xl, xr, yl, yr = box
            return max(float(xr - xl) * 2 * math.pi, float(yr - yl) * rho_f)

        def priority(u):
            """0 if the box meets the tolerance, else how far it is above it (inf for non-finite)."""
            if u is None or st.L is None:
                return math.inf
            worst = 0.0
            for i, ui in enumerate(u):
                uf = float(ui.mid())
                thr = max((1.0 + rtol) * float(st.L[i].mid()), atol)
                if uf > thr:
                    worst = max(worst, uf / thr if thr > 0 else math.inf)
            return worst

        def evaluate(bx):
            res = _evaluate_boxes(f, df, phi, bx, two_pi, rho_a)
            st.n_evals += len(bx)
            for (u, l, why) in res:
                if u is None:
                    st.n_bad += 1
                    st.last_err = why
                    continue
                if st.L is not None and len(l) != len(st.L):
                    raise ValueError("F returned a varying number of components")
                st.L = l if st.L is None else [b if b > a else a for a, b in zip(st.L, l)]
            return res

        def file(bx, res):
            for box, (u, l, why) in zip(bx, res):
                st.counter += 1
                pr = priority(u)
                if pr > 0:
                    heapq.heappush(heap, (-pr, st.counter, box, u))
                else:
                    accepted.append((box, u, False))

        first = []
        for s in range(0, len(boxes), batch):
            chunk = boxes[s:s + batch]
            first.append((chunk, evaluate(chunk)))
        for chunk, res in first:      # file only after L has seen the whole initial grid
            file(chunk, res)

        while heap and st.n_evals < max_evals:
            take = []
            while heap and len(take) < batch:
                _, _, box, u = heapq.heappop(heap)
                if priority(u) <= 0:   # L only grows, so a stale entry may now meet the tolerance
                    accepted.append((box, u, False))
                    continue
                if width(box) < min_width:
                    if u is None:
                        raise StripCoverError(
                            f"non-finite box at minimum width {min_width:g}: {box} ({st.last_err}); "
                            f"f o phi is not certified holomorphic on the cover at rho = {rho}")
                    accepted.append((box, u, True))
                    continue
                take.append(box)
            if not take:
                continue
            kids = []
            for (xl, xr, yl, yr) in take:
                if float(xr - xl) * 2 * math.pi >= float(yr - yl) * rho_f:
                    xm = (xl + xr) / 2
                    kids += [(xl, xm, yl, yr), (xm, xr, yl, yr)]
                else:
                    ym = (yl + yr) / 2
                    kids += [(xl, xr, yl, ym), (xl, xr, ym, yr)]
            file(kids, evaluate(kids))

        for (_, _, box, u) in heap:   # budget exhausted: what is left are leaves, and all must be finite
            if u is None:
                raise StripCoverError(f"budget of {max_evals} box evaluations exhausted with non-finite boxes left "
                                      f"(e.g. {box}: {st.last_err}); holomorphy is not certified")
            accepted.append((box, u, True))
        if st.L is None:
            raise StripCoverError("no box could be evaluated")

        p = len(st.L)
        S = [arb(0)] * p
        minw = math.inf
        unresolved = 0
        for box, u, flag in accepted:
            unresolved += int(flag)
            minw = min(minw, width(box))
            for i in range(p):
                if u[i] > S[i]:
                    S[i] = u[i]
        full = (len(rects) == 1 and tuple(fmpq(v) for v in rects[0]) == (fmpq(0), fmpq(1), fmpq(-1), fmpq(1)))
        return StripSup(S=S, L=st.L, rho=rho_a, full_strip=full, n_evals=st.n_evals, n_leaves=len(accepted),
                        n_nonfinite_evals=st.n_bad, n_unresolved=unresolved, min_leaf_width=minw,
                        seconds=time.time() - t0, prec=prec,
                        params=dict(rtol=rtol, atol=atol, nx=nx, max_evals=max_evals, min_width=min_width,
                                    centred=df is not None),
                        leaves=[b for b, _, _ in accepted] if keep_leaves else None, phi_digest=phi.digest())


def strip_sup(f: Callable, phi: "TrigPoly", rho, **kw) -> StripSup:
    """Lemma 1: rigorous S_i >= sup_{|Im theta| <= rho} |f_i(phi(theta))| and a certificate of holomorphy there.

    Covers the whole rectangle [0, 2 pi] x [-rho, rho] (periodicity gives the strip). Raises StripCoverError if
    some box stays non-finite (a singularity of f o phi in or near the strip). Keywords as sup_over_rectangles,
    in particular df= for the centred form."""
    return sup_over_rectangles(f, phi, rho, [(0, 1, -1, 1)], **kw)


# ---------------------------------------------------------------------------------------------------------------
# 2-4. Node values, aliased DFT, aliasing bound, enclosure
# ---------------------------------------------------------------------------------------------------------------
def _root_of_unity(num: int, M: int) -> acb:
    """e^{2 pi i num / M} as a ball, from the exact rational q = 2 (num mod M) / M via sin_cos_pi_fmpq."""
    s, c = arb.sin_cos_pi_fmpq(fmpq(2 * (num % M), M))
    return acb(c, s)


def node_values(f: Callable, phi: TrigPoly, M: int, *, prec: int = 128) -> List[List[acb]]:
    """G[j] = F(phi(theta_j)), theta_j = 2 pi j / M; balls containing g(theta_j). Raises if any is non-finite."""
    if M < 1:
        raise ValueError("M must be >= 1")
    K = phi.K
    with precision(prec):
        roots = [_root_of_unity(r, M) for r in range(M)]
        rows = [[roots[(m * j) % M] for m in range(-K, K + 1)] for j in range(M)]
        vals = phi.eval_rows(rows)
        G = []
        for j, z in enumerate(vals):
            try:
                Y = list(f(z))
            except _CATCH as e:
                raise StripCoverError(f"F failed at node {j}: {type(e).__name__}: {e}") from e
            if not all(isinstance(y, acb) and y.is_finite() for y in Y):
                raise StripCoverError(f"F returned a non-finite ball at node {j}")
            G.append(Y)
    return G


def aliased_dft(G: List[List[acb]], Kp: int, *, prec: int = 128) -> List[List[acb]]:
    """C_hat[i][k + Kp] contains c_hat_k = (1/M) sum_j g_i(theta_j) e^{-i k theta_j}, M = len(G), |k| <= Kp."""
    M = len(G)
    if Kp < 0 or Kp >= M:
        raise ValueError(f"need 0 <= K' < M (got K'={Kp}, M={M})")
    p = len(G[0])
    with precision(prec):
        roots = [_root_of_unity(r, M) for r in range(M)]
        W = acb_mat([[roots[(-k * j) % M] for j in range(M)] for k in range(-Kp, Kp + 1)])
        Gm = acb_mat(G)
        Ch = W * Gm
        invM = arb(fmpq(1, M))
        return [[Ch[t, i] * invM for t in range(2 * Kp + 1)] for i in range(p)]


def alias_bound(S, rho, M: int, k: int) -> arb:
    """Lemma 3: E_k = S (e^{-rho (M - k)} + e^{-rho (M + k)}) / (1 - e^{-rho M}), |k| < M, as an Arb ball."""
    if abs(k) >= M:
        raise ValueError("Lemma 3 needs |k| < M")
    S = S if isinstance(S, arb) else arb(S)
    r = rho if isinstance(rho, arb) else arb(rho)
    return S * ((-r * (M - k)).exp() + (-r * (M + k)).exp()) / (1 - (-r * M).exp())


def _unit_square() -> acb:
    return acb(arb(0, 1), arb(0, 1))


def enclose_coefficients(C_hat: List[List[acb]], S: Sequence, rho, M: int, Kp: int, *,
                         prec: int = 128) -> List[List[acb]]:
    """C[i][k + Kp] = C_hat[i][k + Kp] + E_{i,k} * Q (section 4), with E_{i,k} = alias_bound(S_i, rho, M, k).

    M must be the number of nodes used for C_hat (the tests mutate it to show what a wrong M does)."""
    with precision(prec):
        rho_a = _exact_positive(rho, "rho")
        Q = _unit_square()
        out = []
        for i, row in enumerate(C_hat):
            Si = S[i] if isinstance(S[i], arb) else arb(S[i])
            out.append([row[k + Kp] + alias_bound(Si, rho_a, M, k) * Q for k in range(-Kp, Kp + 1)])
        return out


def tail_bound(S, rho, m: int) -> arb:
    """Lemma 2: |c_m| <= S e^{-rho |m|} (an Arb ball whose upper end is the bound)."""
    S = S if isinstance(S, arb) else arb(S)
    r = rho if isinstance(rho, arb) else arb(rho)
    return S * (-r * abs(m)).exp()


def tail_l1(S, rho, Kp: int, nu=1) -> arb:
    """Section 5: sum_{|m| > K'} S e^{-rho |m|} nu^{|m|} = 2 S q^{K'+1} / (1 - q), q = nu e^{-rho} < 1."""
    S = S if isinstance(S, arb) else arb(S)
    r = rho if isinstance(rho, arb) else arb(rho)
    q = arb(nu) * (-r).exp()
    if not q < 1:
        raise ValueError("weighted tail needs nu e^{-rho} < 1")
    return 2 * S * q ** (Kp + 1) / (1 - q)


@dataclass
class FourierEnclosure:
    """c[i][k + Kp] contains c_{i,k}[f o phi] for |k| <= Kp; |c_{i,m}| <= S[i] e^{-rho |m|} for all m."""
    c: List[List[acb]]
    S: List[arb]
    rho: arb
    M: int
    Kp: int
    strip: Optional[StripSup]
    seconds: float
    prec: int
    S_source: str = "computed"       # "computed" or "strip" (checked); "raw" = caller-supplied, unchecked (tests)

    def coeff(self, i: int, k: int) -> acb:
        if abs(k) > self.Kp:
            raise IndexError("outside the computed range; use tail_bound")
        return self.c[i][k + self.Kp]

    def tail_bound(self, i: int, m: int) -> arb:
        return tail_bound(self.S[i], self.rho, m)

    def tail_l1(self, i: int, nu=1) -> arb:
        return tail_l1(self.S[i], self.rho, self.Kp, nu)

    def alias_bound(self, i: int, k: int) -> arb:
        return alias_bound(self.S[i], self.rho, self.M, k)


def fourier_coefficients(f: Callable, phi: TrigPoly, rho, M: int, Kp: int, *, S: Optional[Sequence] = None,
                         prec: int = 128, strip_kw: Optional[dict] = None) -> FourierEnclosure:
    """The Theorem of section 4: balls for c_{i,k}[f o phi], |k| <= K' < M, plus the Cauchy tail.

    If S is None the strip bound is computed by strip_sup. S may be a StripSup from an earlier cover: it is then
    checked to be a full-strip cover (not edges only) at exactly this rho and for exactly this phi (TrigPoly.digest);
    that f is the same black box remains the caller's responsibility. A plain sequence of bounds is NOT checked at
    all and is meant only for the tests and their negative controls; the enclosure records S_source = "raw" then.
    """
    t0 = time.time()
    if not (0 <= Kp < M):
        raise ValueError("need 0 <= K' < M")
    strip = None
    source = "computed"
    if S is None:
        strip = strip_sup(f, phi, rho, **(strip_kw or {}))
        S = strip.S
    elif isinstance(S, StripSup):
        strip, source = S, "strip"
        with precision(prec):
            rho_chk = _exact_positive(rho, "rho")
        if not strip.full_strip:
            raise ValueError("the StripSup is not a full-strip cover")
        if not (strip.rho.is_exact() and rho_chk.is_exact() and strip.rho == rho_chk):
            raise ValueError("the StripSup was computed at a different rho")
        if strip.phi_digest != phi.digest():
            raise ValueError("the StripSup was computed for a different phi")
        S = strip.S
    else:
        source = "raw"
    with precision(prec):
        rho_a = _exact_positive(rho, "rho")
        S = [s if isinstance(s, arb) else arb(s) for s in S]
    G = node_values(f, phi, M, prec=prec)
    C_hat = aliased_dft(G, Kp, prec=prec)
    if len(C_hat) != len(S):
        raise ValueError("S has the wrong number of components")
    c = enclose_coefficients(C_hat, S, rho_a, M, Kp, prec=prec)
    return FourierEnclosure(c=c, S=S, rho=rho_a, M=M, Kp=Kp, strip=strip, seconds=time.time() - t0, prec=prec,
                            S_source=source)
