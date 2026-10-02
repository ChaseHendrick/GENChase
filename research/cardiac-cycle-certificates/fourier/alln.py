"""Stage E for every N: the rotating 1-wave for every integer N >= 8 and for the continuum cable, with eps = 1/N^2 (Arb).

Status: computed; awaiting adversarial review. Nothing written by this program is "verified" until a second reading
has checked the argument below against the code. "E.n" refers to section n of the docstring of existence.py (Stage E,
one N at a time) and "B.n" to section n of branch.py (the G_Ks branch), whose machinery is reused; what differs is
stated in full here.

0. Problem
----------
Scaled variables, f = arbmodel.f at G_Ks = 0.0275 (as Stage E). For eps >= 0 let
    d_m(eps) = 4 pi^2 D m^2 S(pi^2 m^2 eps)^2,   S(w) = sum_{k>=0} (-w)^k / (2k+1)!  (= sin(sqrt w) / sqrt w for w > 0),
D = 1/64000 per ms (arbmodel.damping(m, eps=...)). S is entire, so d_m is a real-analytic function of eps on R, even in
m, d_0 = 0 and d_m(eps) >= 0. At eps = 1/N^2, d_m = 4 N^2 D sin^2(pi m / N), the Stage E damping of the N-ring
(c = N^2 D); at eps = 0, d_m = D (2 pi m)^2. Unknowns x = (omega, a), a = (a_m)_{m in Z}, a_m in C^18:
    F_ph(x)      = sum_m a_{m,V} - s / sigma_V                         (Stage E's level phase: phi_V(0) = s, 0.2 mV)
    F_m(x; eps)  = i omega m a_m - g_m(a) + d_m(eps) E a_m,   g = f o phi_a.
For eps = 1/N^2 this is exactly Stage E's F for the N-ring. For eps = 0 it is the Fourier form of the travelling-wave
equation of the cable u_t = D u_xx e_V + f(u) on the unit ring x in R/Z with u(x, t) = phi(omega t + 2 pi x):
u_t = omega phi', u_xx = 4 pi^2 phi'', and 4 pi^2 D (i m)^2 = -d_m(0). For other eps in (0, 1/64] it is the profile
equation of the lattice with spacing h = sqrt(eps), omega phi' = f(phi) + (D / h^2) E (phi(. - 2 pi h) - 2 phi +
phi(. + 2 pi h)), which is a ring only when 1/h is an integer; the non-integer values serve only to connect the rings
to each other and to the cable.

1. Spaces: as E.1, X = C x (l^1_nu)^18, nu = e^{1/4}, ||x|| = max(|omega| / eta_om, max_k ||a_k||_nu / eta_k), with exact
dyadic weights eta chosen per piece (floating point, branch.choose_eta on the rigorous blocks; only exactness matters).

2. Operator A (depends on eps; that is allowed: the Newton-Kantorovich argument is made for each fixed eps)
------------------------------------------------------------------------------------------------------------
A piece is a closed interval P = [e_lo, e_hi] of exact dyadic rationals, 0 <= e_lo <= e_hi, centre e_c (exact), half
width delta = (e_hi - e_lo) / 2. The centre xbar = (omega_bar, abar) is an exact symmetric dyadic Galerkin solution at
e_c (untrusted float Newton, K modes). For eps in P:
  * A_fin: the double inverse of the midpoint of the Galerkin matrix J_fin(e_c) (Stage E's, with d_m(e_c)); fixed.
  * A_m(eps) = (i omega_bar m I - J0hat + d_m(eps) E)^{-1} for |m| > K, J0hat the exact real midpoint of [J_0] (E.2).
A(eps) is injective (A_fin by Z1 < 1 as E.2; each A_m(eps) is an inverse) and, being "block diagonal", A(eps) y = 0
implies y = 0 for every sequence y (finite part and each tail mode separately), so x is a fixed point of
T_eps(x) = x - A(eps) F(x; eps) iff F(x; eps) = 0 componentwise.
T_eps maps the ball into X also at eps = 0, where d_m grows like m^2: for |m| > K,
  T_eps(x)_m = a_m - A_m F_m = -A_m(eps) [ i (omega - omega_bar) m a_m + J0hat a_m - g_m(a) ]
(because A_m (i omega_bar m - J0hat + d_m E) = I), and sup_{|m|>K} |m A_m(eps)| is finite uniformly in eps (Lemma T).

3. Lemma T (tail resolvents, uniform in d >= 0, hence in eps)
--------------------------------------------------------------
Let y = omega_bar m with m > m_max, Y = omega_bar (m_max + 1), G = |J0hat| / Y (entrywise), theta = ||G||_inf < 1, and
S_G = I + G + G^2 + theta^3 / (1 - theta) * ones. Then for every real d >= 0, with M = i y I - J0hat + d E:
    |M^{-1}| <= S_G / Y   and   |m M^{-1}| <= S_G / omega_bar   (entrywise).
Proof. Write M = Dg - J0hat with Dg = diag(i y + d, i y, ..., i y). |i y + d| >= y, so |Dg^{-1}| <= I / y entrywise,
and ||Dg^{-1} J0hat||_inf <= ||J0hat||_inf / y <= theta < 1. Hence M^{-1} = sum_{k>=0} (Dg^{-1} J0hat)^k Dg^{-1} and
|M^{-1}| <= sum_k (|J0hat| / y)^k / y <= sum_k G^k / Y; each entry of G^k (k >= 3) is at most its row sum <= theta^k,
so sum_{k>=3} G^k <= theta^3 / (1 - theta) * ones. For m |M^{-1}|: m / y = 1 / omega_bar and (|J0hat| / y)^k <= G^k. QED.
Stage E's Neumann bound used dmax >= d_m, which does not exist at eps = 0; Lemma T needs none. m_max is the least
integer >= K + 1 with omega_bar (m_max + 1) theta_target >= ||J0hat||_inf, found by increasing a float guess, so it may
exceed the least such integer (harmless: theta is recomputed from the actual Y and certified < 1).
For K < m <= m_max the range of d_m over P is enclosed by arbmodel.damping(m, eps=(e_lo, e_hi)), giving an exact
interval [dlo, dhi] with dlo >= 0; it is cut into nsub sub-intervals (each a ball; the balls cover [dlo, dhi]) of
width about sub_frac * omega_bar m, and A_m is enclosed on each sub-ball by Arb inversion of the ball matrix (the
result contains the inverse of every point matrix in the ball; Arb raises if one may be singular). So for every
eps in P, A_m(eps) lies in one of the sub-enclosures, and every sup below (|A_m|, |m A_m|, |A_m J'_n|, |A_m g_m|) is
the maximum over the sub-enclosures. A_{-m}(eps) = conj A_m(eps) (J0hat and d real), as E.4.

4. Uniform bounds over P (mean value theorem in eps)
---------------------------------------------------
d_m is real differentiable on [0, inf), so for eps in P and each m, d_m(eps) - d_m(e_c) = (eps - e_c) dd_m with dd_m
in conv{d'_m(xi) : xi in P}, which lies in the ball DD_m = ddamping(m, e_lo, e_hi) (section 5).
  * Y0. abar_m = 0 for |m| > K, so F_m(xbar; eps) = -g_m there does not depend on eps, and the phase row does not
    either. On the finite rows F_fin(xbar; eps) = F_fin(xbar; e_c) + (eps - e_c) w, w_(V,m) = dd_m abar_{V,m} (other
    entries 0), w in the box W = (DD_m abar_{V,m})_m. Hence, per output component c,
        ||(A(eps) F(xbar; eps))_c|| <= Y0p_c + delta Y0g_c,
    Y0p_c: Stage E's E.5 computation at e_c for the finite rows (A_fin F_fin(e_c), F_fin with the level phase and
    d_m(e_c)), the tail rows K < |m| <= K' by the maximum of |A_m^{sub} g_m| over the sub-enclosures (Lemma T
    explicit range) or Abar0 |g_m| beyond m_max, and the Cauchy tail Abar0 S_g 2 q^{K'+1} / (1 - q) (Abar0 is the sup
    over all |m| > K AND all eps in P);
    Y0g_c: the weighted norm of the Arb product A_fin W (a ball containing A_fin w for every w in W).
  * Z1. B(eps) = I - A(eps) DF(xbar; eps).
      finite rows x finite columns: I - A_fin J_fin(eps) = [I - A_fin J_fin(e_c)] - A_fin Delta(eps), Delta =
        diag(d_m(eps) - d_m(e_c)) on the (V, m) entries, |Delta_m| <= delta |DD_m|. The first term gives the Stage E
        block Z1_ff; the second is bounded per block by delta B1g with B1g[c][V] = max_m (weighted column sum of
        |A_fin| over output component c in column (V, m)) / nu^{|m|} * |DD_m| and B1g = 0 on the other input blocks.
      finite rows x tail columns: the tail columns of DF(xbar; eps) restricted to the finite rows (phase entry and
        -J_{m-m'}) do not contain d (d acts on the diagonal (V, m'), a tail row): exactly Stage E's Z1_ft (E.5,
        including the level phase's entries on tail columns).
      tail rows: (B(eps) y)_m = sum_n A_m(eps) J'_n y_{m-n} (A_m(eps) inverts the d_m(eps) diagonal exactly), so
        Stage E's T = sum_{|n| <= K'} C_n nu^{|n|} + Abar0 S_J 2 q^{K'+1} / (1 - q) with C_n, Abar0 sups over |m| > K and
        eps in P (Lemma T).
    Z1 := max_c (1/eta_c) sum_c' eta_c' (B1_cc' + delta B1g_cc'), B1 = max(Z1_ff, Z1_ft) + T (as B.3).
  * Z2: DF(x; eps) - DF(xbar; eps) does not contain d_m (it cancels), so Lemma B2 (branch.py section 4: Hessian
    enclosures over a polydisc family by second-order dual numbers, branch.HessBound with G_Ks = 0.0275 fixed) gives
    Z2 with the eps-uniform N0, N1 (A_fin) and Abar0, Abar1 (Lemma T over P).
  With these, branch.assemble decides p(r_lo) < 0, Z1 + Z2 r_lo < 1, p(r_hi) < 0, Z1 + Z2 r_hi < 1 (r_hi <= r_*) in
  Arb (it is called with its G_Ks fields set to the fixed 0.0275 and its "parameter half width" set to the eps half
  width delta; its arithmetic is exactly Y0 = max_c (Y0p_c + delta Y0g_c) / eta_c and Z1 as above). Then for every eps
  in P, T_eps maps B_{r_lo}(xbar) into itself and is a kappa-contraction on B_{r_hi}(xbar), kappa = Z1 + Z2 r_hi < 1:
  F(.; eps) has exactly one zero x*(eps) in B_{r_hi}(xbar), and it lies in B_{r_lo}(xbar).
  Real solution, period, minimal period, wave number: E.7 verbatim for each eps (d_m(eps) is real and even in m), so
  omega*(eps) is real, phi* is real, analytic on |Im theta| < 1/4, T(eps) = 2 pi / omega*(eps) lies in the piece's
  T enclosure, and a*_{1,V} != 0 (assemble checks |abar_{1,V}| > eta_V r_lo / nu). At eps = 0 nothing more is needed
for a classical solution: a* is in (l^1_nu)^18, so phi* is analytic on |Im theta| < 1/4, and the V equation
(i omega* m + d_m(0)) a*_{m,V} = g_{m,V} holds mode by mode with |i omega* m + d_m(0)| >= max(omega* |m|, d_m(0)), so
phi*_V'' exists and the cable wave is a classical solution.

5. dd_m (rigorous derivative of d_m in eps)
-------------------------------------------
d_m(eps) = 4 pi^2 D m^2 S(w)^2 with w = pi^2 m^2 eps, so d'_m(eps) = 8 pi^4 D m^4 S(w) S'(w), S'(w) = sum_{k>=1}
(-1)^k k w^{k-1} / (2k+1)!. For w in a ball contained in [0, W]: the partial sums up to k < n are evaluated in Arb on
the ball; the remainders are bounded by t_n / (1 - q_n) and u_n / (1 - q'_n), where t_k = W^k / (2k+1)!,
t_{k+1} / t_k = W / ((2k+2)(2k+3)) <= q_n for k >= n, and u_k = k W^{k-1} / (2k+1)!, u_{k+1} / u_k = W / (2k (2k+3))
<= q'_n for k >= n (both ratios decrease in k); n is chosen with q_n, q'_n <= 1/2 and the remainders negligible.
test_alln checks S^2 against arbmodel.damping and dd_m against difference quotients.

6. Continuity in eps and gluing
-------------------------------
On a piece: for eps, eps' in P, x*(eps) and x*(eps') lie in B_{r_hi} where T_eps' is a kappa-contraction, so
    ||x*(eps') - x*(eps)|| <= ||T_eps'(x*(eps)) - T_eps(x*(eps))|| / (1 - kappa)
(uniform contraction principle; only the fixed point x = x*(eps) enters). eps' -> T_eps'(x) is continuous at eps for
fixed x: the finite part changes by A_fin diag(d_m(eps) - d_m(eps')) E a_m (finitely many continuous terms); the tail
part is -(A_m(eps') - A_m(eps)) v_m with the fixed sequence v_m = i (omega - omega_bar) m a_m + J0hat a_m - g_m(a),
termwise -> 0 (A_m(.) is continuous) and dominated by 2 Abar1 |omega - omega_bar| |a_m| + 2 Abar0 |J0hat a_m - g_m|,
which is summable in l^1_nu; dominated convergence. So eps -> x*(eps) is continuous on P (no Lipschitz constant
is claimed), and omega*(eps), T(eps) are continuous.
Gluing (as B.5): consecutive pieces overlap in eps (e_lo(b) <= e_hi(a)) and the program checks in Arb
    ||xbar_a - xbar_b||_{eta(b)} + r_lo(a) max_c (eta_c(a) / eta_c(b)) <= r_hi(b);
then for eps in the overlap x*_a(eps) is a zero of F(.; eps) in b's uniqueness ball, so x*_a(eps) = x*_b(eps).
Non-consecutive overlaps: collect() requires (branch.check_piece_order, refusing the record otherwise) that, in the
order of the lower ends, both endpoints increase strictly and every piece has r_lo < r_hi; then the argument of B.5
(a) agreement at eps0 = lo_j through the consecutive overlaps, (b) the agreement set is closed and open in the
interval P_i n P_j because r_lo(j) < r_hi(j) and x*_i is continuous) gives x*_i = x*_j on P_i n P_j. The pieces
therefore define one single-valued continuous map eps -> x*(eps) on the union of the glued chain.

7. Identification with the per-N Stage E records
------------------------------------------------
For N = 8, 16, 32, 64 (eps = 1/N^2): results/fourier-existence-N{N}.json proves a zero x_N of Stage E's F (the same
F as here at eps = 1/N^2: same damping values, same level phase, same nu = e^{1/4}) within r_E of its K = 32 centre
(weights 1). The program checks ||xbar_E - xbar_piece||_{eta(piece)} + r_E max_c (1 / eta_c(piece)) <= r_hi(piece) in
Arb (centres compared in l^1_nu with zero padding, branch.centre_distance), so x_N = x*(1/N^2): the per-N wave is the
member of this family, and its T record (width 1e-25) lies inside the piece's T enclosure.

8. Untrusted inputs
-------------------
Centres (float Galerkin-Newton at float(e_c), K = 12, rounded to exact symmetric dyadics; the level phase holds only to
rounding, which Y0 includes), A_fin, the weights eta, r_*, the polydisc radii R_i = 32 eta_i r_*, the piece endpoints,
the sub-interval counts. They are exact numbers chosen by floating-point code; their quality only decides whether the
inequalities hold.

9. Resume and logs (driver only; no bound depends on them)
-----------------------------------------------------------
fourier/data/alln/pieces.jsonl holds one line per certified piece (its full record, exact centre, weights, r_*,
radii and Hessian-cover record); failures.jsonl one line per failed attempt (the piece is then split in two
overlapping halves). The plan is deterministic (a fixed grid of pieces, failed ones replaced by their halves), so a
restart re-reads both files, drops an unparsable last line (a killed writer; kept in .truncated) and proves only the
pieces that are missing. collect() re-checks every centre's digest, re-derives every gluing inequality and the
Stage E inclusions in Arb from the stored exact data, and writes results/fourier-existence-alln.json.

Trusted: python-flint 0.9.0 (Arb); arbmodel.py with the generated tp06_18d_arb.py; fourier_eval.py (Lemmas 1-3); the
functions of existence.py (_identity, _abs_mat, _weight_rows, _block_colsup, _radii, amax, up, lo) and branch.py
(assemble, HessBound / Hess / Lemma B2, centre_distance) called here; this file (ddamping, tail_bounds_eps,
piece_blocks, glue_eps, stage_e_inclusion).
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

import flint  # noqa: E402
from flint import acb, acb_mat, arb, arb_mat, ctx, fmpq, fmpz  # noqa: E402

import arbmodel as am  # noqa: E402
import branch as br  # noqa: E402
import centre as ct  # noqa: E402
import existence as ex  # noqa: E402
import fourier_eval as fe  # noqa: E402

DIM = 18
IV = 0
G_KS = "0.0275"
E_END = Fraction(1, 64)                     # eps = 1/N^2 for N = 8
RESULTS = os.path.join(ROOT, "results")
DATA = os.environ.get("ALLN_DATA", os.path.join(HERE, "data", "alln"))
PIECES_LOG = os.path.join(DATA, "pieces.jsonl")
FAIL_LOG = os.path.join(DATA, "failures.jsonl")
CONTROLS_LOG = os.path.join(DATA, "controls.jsonl")
GRID = Fraction(1, 2 ** 40)                 # piece endpoints are multiples of 2^-40 (exact dyadics)
D_F = 1.0 / 64000.0

ProofFailure = ex.ProofFailure
up, lo, amax, bound_rec = ex.up, ex.lo, ex.amax, ex.bound_rec

DEFAULTS = dict(br.DEFAULTS)
DEFAULTS.update(K=12, sub_frac="1/4", strip_g_max_evals=1000)


# =================================================================================================================
# Float (untrusted): damping, Galerkin-Newton with the level phase, centres, Hessian estimate
# =================================================================================================================
def _S_float(w):
    if w < 1e-4:
        return 1 - w / 6 + w * w / 120 - w ** 3 / 5040, -1 / 6 + w / 60 - w * w / 1680
    s = math.sqrt(w)
    S = math.sin(s) / s
    return S, (math.cos(s) - S) / (2 * w)


def d_float(m, eps):
    S, _ = _S_float(math.pi ** 2 * m * m * eps)
    return 4 * math.pi ** 2 * D_F * m * m * S * S


def dd_float(m, eps):
    S, dS = _S_float(math.pi ** 2 * m * m * eps)
    return 8 * math.pi ** 4 * D_F * m ** 4 * S * dS


def residual_f(om, a, eps, Mc):
    K = (a.shape[1] - 1) // 2
    lay = ct.Layout(K)
    R = ct.residual_double(om, a, 1, Mc)          # N = 1: no damping; added here
    for m in range(-K, K + 1):
        R[lay.idx(IV, m)] += d_float(m, eps) * a[IV, m + K]
    return R


def galerkin_f(om, a, eps, Mc):
    K = (a.shape[1] - 1) // 2
    lay = ct.Layout(K)
    Jn = ct.jacobian_coeffs(a, Mc, 2 * K)
    G = ct.galerkin_matrix(om, a, Jn, 1)
    for m in range(-K, K + 1):
        G[lay.idx(IV, m), lay.idx(IV, m)] += d_float(m, eps)
    return G, Jn


def newton_f(om, a, eps, Mc, iters=20, tol=1e-13):
    lay = ct.Layout((a.shape[1] - 1) // 2)
    nr = math.inf
    for _ in range(iters):
        R = residual_f(om, a, eps, Mc)
        nr = float(np.abs(R).max())
        if nr < tol:
            break
        G, _ = galerkin_f(om, a, eps, Mc)
        du = np.linalg.solve(G, -R)
        dom, da = ct.unpack(lay, du)
        om, a = ct.symmetrize(om + dom, a + da)
    return om, a, nr


def float_seed(K):
    """The Stage E N = 8 centre (K = 32) truncated to K (float)."""
    _, K0, omb, A, _ = ct.load(ct.centre_path(8, 32))
    a = np.array([[complex(float(A[i][m].real), float(A[i][m].imag)) for m in range(2 * K0 + 1)] for i in range(DIM)])
    return float(omb), a[:, K0 - K:K0 + K + 1]


def float_centre(eps, K):
    """Exact symmetric dyadic centre (omega_bar, A) at eps (untrusted; deterministic from the Stage E N = 8 centre)."""
    om, a = float_seed(K)
    om, a, nr = newton_f(om, a, float(eps), 4 * K + 64)
    if not nr < 1e-11:
        raise RuntimeError(f"float Newton failed at eps = {eps} (|R| = {nr:.2e})")
    omb, A = ct.to_exact(om, a, 128)
    return omb, A, nr


def float_hessian_estimate(K):
    om, a = float_seed(K)
    om, a, _ = newton_f(om, a, 0.0, 4 * K + 64)
    return 2.5 * br.hessian_sup_f(a, float(G_KS))


# =================================================================================================================
# Rigorous derivative of d_m in eps (section 5)
# =================================================================================================================
def _fac(n):
    return arb(fmpz(math.factorial(n)))


def sinc_sqrt_and_derivative(w):
    """Balls containing S(w) and S'(w) for every w in the real ball w (which must lie in [0, inf)); section 5."""
    if not (w >= 0):
        raise ValueError("w must be certainly >= 0")
    W = up(w)
    n = 2
    while True:
        qn = W / ((2 * n + 2) * (2 * n + 3))
        qn2 = W / (2 * n * (2 * n + 3))
        tn = W ** n / _fac(2 * n + 1)
        un = n * W ** (n - 1) / _fac(2 * n + 1)
        if qn <= arb(0.5) and qn2 <= arb(0.5) and tn < arb(2) ** (-ctx.prec - 8) and un < arb(2) ** (-ctx.prec - 8):
            break
        n += 1
    # S(w) = sum_{k>=0} (-1)^k w^k / (2k+1)!, partial sum k = 0..n-1 (wk = w^k)
    S = arb(0)
    dS = arb(0)
    wk = arb(1)
    for k in range(n):
        term = wk / _fac(2 * k + 1)
        S += term if k % 2 == 0 else -term
        wk = wk * w
    # S'(w) = sum_{k>=1} (-1)^k k w^{k-1} / (2k+1)!, partial sum k = 1..n-1 (wk = w^{k-1})
    wk = arb(1)
    for k in range(1, n):
        term = k * wk / _fac(2 * k + 1)
        dS += term if k % 2 == 0 else -term
        wk = wk * w
    rS = up(tn / (1 - qn))
    rdS = up(un / (1 - qn2))
    return S + rS * arb(0, 1), dS + rdS * arb(0, 1)


def _S_dS(w):
    """S(w), S'(w) on a real ball w contained in [0, inf): the series (section 5) if w may be < 1, else the closed
    forms S = sin(s) / s, S' = (cos(s) - S) / (2 w), s = sqrt(w) (equal to the series for w > 0)."""
    if w > 1:
        s = w.sqrt()
        sn, cs = s.sin_cos()
        S = sn / s
        return S, (cs - S) / (2 * w)
    return sinc_sqrt_and_derivative(w)


DD_W_STEP = Fraction(1, 32)          # sub-interval width in w = pi^2 m^2 eps (tightness only)


def ddamping(m, e_lo, e_hi, prec=None):
    """A real ball containing d'_m(xi) = 8 pi^4 D m^4 S(w) S'(w), w = pi^2 m^2 xi, for every xi in [e_lo, e_hi]: the
    union over a cover of [e_lo, e_hi] by sub-intervals (exact rational endpoints) of the enclosure on each."""
    e_lo, e_hi = Fraction(e_lo), Fraction(e_hi)
    if not 0 <= e_lo <= e_hi:
        raise ValueError("need 0 <= e_lo <= e_hi")
    wspan = 10 * m * m * (e_hi - e_lo)                       # >= pi^2 m^2 (e_hi - e_lo)
    nsub = max(1, math.ceil(wspan / DD_W_STEP))
    with am.precision(prec):
        Db = am.to_ball(am.D_RING).real
        out = None
        for j in range(nsub):
            a = e_lo + (e_hi - e_lo) * Fraction(j, nsub)
            b = e_lo + (e_hi - e_lo) * Fraction(j + 1, nsub)
            e = am.to_ball((a, b) if a != b else a).real
            w = (arb.pi() ** 2 * (m * m) * e).nonnegative_part()   # w >= 0 exactly (e >= 0): clipping loses nothing
            S, dS = _S_dS(w)
            v = 8 * arb.pi() ** 4 * Db * (m ** 4) * S * dS
            out = v if out is None else out.union(v)
        return out


def damping_from_series(m, e_lo, e_hi, prec=None):
    """d_m over [e_lo, e_hi] from the same series (test cross-check against arbmodel.damping only)."""
    with am.precision(prec):
        e = am.to_ball((Fraction(e_lo), Fraction(e_hi))).real
        S, _ = sinc_sqrt_and_derivative((arb.pi() ** 2 * (m * m) * e).nonnegative_part())
        return 4 * arb.pi() ** 2 * am.to_ball(am.D_RING).real * (m * m) * S * S


# =================================================================================================================
# Lemma T: tail bounds uniform over eps in the piece
# =================================================================================================================
def _eps_arg(e_lo, e_hi):
    e_lo, e_hi = Fraction(e_lo), Fraction(e_hi)
    return e_lo if e_lo == e_hi else (e_lo, e_hi)


def tail_bounds_eps(K, Kp, om_bar, J0hat, Jp, e_lo, e_hi, st, log=print, _mutate=(), _keep_all=False):
    """Section 3: entrywise sups of |A_m(eps)|, |m A_m(eps)|, |A_m(eps) J'_n| over |m| > K and eps in [e_lo, e_hi];
    the sub-enclosures of A_m for K < m <= K' (Y0 tail). Test-only: _mutate "tail_at_centre" uses d_m(e_c) instead of
    the range over the piece; _keep_all keeps the sub-enclosures for every m <= m_max (no bound changes)."""
    I = ex._identity(DIM)
    absJ0 = ex._abs_mat(J0hat)
    rowmax = arb(0)
    for r in range(DIM):
        rowmax = amax(rowmax, up(sum((absJ0[r, k] for k in range(DIM)), arb(0))))
    theta_t = ex._q(st["theta_target"])
    m_max = max(K + 1, int(math.ceil(float(rowmax / theta_t / om_bar))) + 1)
    while not (om_bar * (m_max + 1) * theta_t >= rowmax):
        m_max += 1
    Y = om_bar * (m_max + 1)
    G = arb_mat([[absJ0[r, k] / Y for k in range(DIM)] for r in range(DIM)])
    theta = arb(0)
    for r in range(DIM):
        theta = amax(theta, up(sum((G[r, k] for k in range(DIM)), arb(0))))
    if not theta < 1:
        raise ProofFailure("Neumann ratio not < 1")
    G2 = G * G
    rem = up(theta ** 3 / (1 - theta))
    SG = arb_mat([[up(I[r, k].real + G[r, k] + G2[r, k] + rem) for k in range(DIM)] for r in range(DIM)])
    Abar0 = [[up(SG[r, k] / Y) for k in range(DIM)] for r in range(DIM)]
    Abar1 = [[up(SG[r, k] / om_bar) for k in range(DIM)] for r in range(DIM)]
    n_ex = int(st["n_explicit"])
    absJp = {nn: ex._abs_mat(M) for nn, M in Jp.items()}
    C = {}
    for nn in Jp:
        P = SG * absJp[nn]
        C[nn] = [[up(P[r, k] / Y) for k in range(DIM)] for r in range(DIM)]
    Jconj = {nn: Jp[nn].conjugate() for nn in Jp if abs(nn) <= n_ex}
    sub_frac = ex._q(st["sub_frac"])
    e_c = (Fraction(e_lo) + Fraction(e_hi)) / 2
    A_explicit = {}
    nsub_total = 0
    for m in range(K + 1, m_max + 1):
        y = om_bar * m
        if "tail_at_centre" in _mutate:
            dball = am.damping(m, eps=e_c, prec=ctx.prec).real            # MUTATION: centre value only
        else:
            dball = am.damping(m, eps=_eps_arg(e_lo, e_hi), prec=ctx.prec).real
        dlo = lo(dball)
        if dlo < 0:
            dlo = arb(0)                       # d_m >= 0 (S real): clipping the enclosure at 0 loses nothing
        dhi = up(dball)
        nsub = max(1, int(math.ceil(float((dhi - dlo) / (sub_frac * y)))))
        nsub_total += nsub
        pts = [dlo + (dhi - dlo) * fmpq(j, nsub) for j in range(nsub + 1)]
        subs = [pts[j].union(pts[j + 1]) for j in range(nsub)]           # balls; their union covers [dlo, dhi]
        Ams = []
        for sb in subs:
            Mm = I * acb(0, 1) * y - J0hat
            Mm[IV, IV] += acb(sb)
            try:
                Am = Mm.inv()
            except ZeroDivisionError:
                raise ProofFailure(f"A_m not certainly invertible at m = {m}")
            Ams.append(Am)
            Aa = ex._abs_mat(Am)
            for r in range(DIM):
                for k in range(DIM):
                    Abar0[r][k] = amax(Abar0[r][k], Aa[r, k])
                    Abar1[r][k] = amax(Abar1[r][k], up(Aa[r, k] * m))
            for nn in Jconj:
                for Pm in (Am * Jp[nn], Am * Jconj[nn]):
                    Pa = ex._abs_mat(Pm)
                    Cn = C[nn]
                    for r in range(DIM):
                        for k in range(DIM):
                            if Pa[r, k] > Cn[r][k]:
                                Cn[r][k] = up(Pa[r, k])
        if m <= Kp or _keep_all:
            A_explicit[m] = Ams
    Ab = arb_mat(Abar0)
    for nn in Jp:
        if abs(nn) > n_ex:
            P = Ab * absJp[nn]
            Cn = C[nn]
            for r in range(DIM):
                for k in range(DIM):
                    Cn[r][k] = amax(Cn[r][k], up(P[r, k]))
    log(f"  tail: Lemma T for m > m_max = {m_max} (theta = {float(theta):.3f}); {nsub_total} explicit sub-inversions")
    return dict(Abar0=Abar0, Abar1=Abar1, C=C, m_max=m_max, theta=theta, A_explicit=A_explicit,
                nsub_total=nsub_total)


# =================================================================================================================
# The eta-free blocks of one piece (section 4), in the format of branch.assemble
# =================================================================================================================
def piece_blocks(om_bar, A, e_lo, e_hi, *, settings=None, log=print, label=None, _mutate=()):
    st = dict(DEFAULTS)
    st.update(settings or {})
    mut = frozenset(_mutate)
    if mut - {"tail_at_centre", "no_dd"}:
        raise ValueError(f"unknown mutation {sorted(mut)}")
    clk = ex.Clock(log)
    K = (len(A[0]) - 1) // 2
    lay = ct.Layout(K)
    n = lay.n
    Kp = 2 * K + int(st["L"])
    Mn = int(st["M"])
    if not Kp < Mn:
        raise ValueError("need K' < M")
    Pg, PJ, PM = int(st["prec_g"]), int(st["prec_J"]), int(st["prec_mat"])
    elo, ehi = Fraction(e_lo), Fraction(e_hi)
    if not (0 <= elo <= ehi):
        raise ValueError("need 0 <= e_lo <= e_hi")
    for e in (elo, ehi):
        if e.denominator & (e.denominator - 1):
            raise ValueError("piece endpoints must be dyadic rationals")
    ec = (elo + ehi) / 2
    old_prec = ctx.prec
    ctx.prec = Pg
    try:
        rho0 = ex._exact_dyadic_param(st["rho0"], "rho0")
        rho = ex._exact_dyadic_param(st["rho"], "rho")
        if not rho > rho0:
            raise ValueError("need rho > rho0")
        nu = rho0.exp()
        q = nu * (-rho).exp()
        if not q < 1:
            raise ProofFailure("nu e^{-rho} not < 1")
        tailK = 2 * q ** (Kp + 1) / (1 - q)
        nupow = [nu ** j for j in range(Kp + 2 * K + 4)]
        om_bar = arb(om_bar)
        if not (om_bar.is_exact() and om_bar > 0):
            raise ValueError("omega_bar must be an exact positive number")
        for i in range(DIM):
            if not A[i][K].imag.is_zero():
                raise ValueError("a_0 not real")
            for m in range(1, K + 1):
                if not (A[i][K + m].real == A[i][K - m].real and (A[i][K + m].imag + A[i][K - m].imag).is_zero()):
                    raise ValueError("centre not conjugation symmetric")
                if not (A[i][K + m].real.is_exact() and A[i][K + m].imag.is_exact()):
                    raise ValueError("centre coefficients must be exact")
        delta = up(arb(fmpq((ehi - ec).numerator, (ehi - ec).denominator)))
        if not delta.is_exact() or ex.to_fraction(delta) != ehi - ec:
            raise ValueError("internal: delta not exact")
    finally:
        ctx.prec = old_prec

    phi = fe.TrigPoly(A)
    prm53, prmJ, prmG = am.params(53), am.params(PJ), am.params(Pg)
    f53 = lambda z: am.f(z, prm53, prec=53)  # noqa: E731
    fG = lambda z: am.f(z, prmG, prec=Pg)  # noqa: E731
    J53 = lambda z: ex._flat(am.f_and_df(z, prm53, prec=53)[1])  # noqa: E731
    JJ = lambda z: ex._flat(am.f_and_df(z, prmJ, prec=PJ)[1])  # noqa: E731
    skw = dict(nx=int(st["strip_nx"]), rtol=float(st["strip_rtol"]), max_evals=int(st["strip_max_evals"]))
    log(f"piece eps in [{elo}, {ehi}] (e_c = {ec}): K = {K}, K' = {Kp}, M = {Mn}")
    strip_g = fe.strip_sup(f53, phi, rho, **dict(skw, max_evals=min(skw["max_evals"], int(st["strip_g_max_evals"]))))
    strip_J = fe.strip_sup(J53, phi, rho, **dict(skw, rtol=max(skw["rtol"], 10.0), atol=1.0))
    for s in (strip_g, strip_J):
        if not s.full_strip:
            raise ProofFailure("a strip cover is not the full strip")
    clk.mark("strips")
    enc_g = fe.fourier_coefficients(fG, phi, rho, Mn, Kp, S=strip_g, prec=Pg)
    enc_J = fe.fourier_coefficients(JJ, phi, rho, Mn, Kp, S=strip_J, prec=PJ)
    if any(e.S_source != "strip" for e in (enc_g, enc_J)):
        raise ProofFailure("Fourier enclosure without a checked strip bound")
    clk.mark("dft")
    J = {nn: [[enc_J.c[DIM * r + c][nn + Kp] for c in range(DIM)] for r in range(DIM)] for nn in range(-Kp, Kp + 1)}
    SJ = [[enc_J.S[DIM * r + c] for c in range(DIM)] for r in range(DIM)]
    Sg = enc_g.S

    ctx.prec = PM
    try:
        dc = {m: am.damping(m, eps=ec, prec=Pg) for m in range(-K, K + 1)}          # d_m(e_c), finite modes
        DD = {m: (ddamping(m, elo, ehi, prec=Pg) if "no_dd" not in mut else arb(0)) for m in range(-K, K + 1)}
        Jfin = acb_mat(n, n)
        for m in range(-K, K + 1):
            Jfin[0, lay.idx(IV, m)] = acb(1)
        for i in range(DIM):
            for m in range(-K, K + 1):
                r = lay.idx(i, m)
                Jfin[r, 0] = acb(0, m) * A[i][m + K]
                for k in range(DIM):
                    base = 1 + k * lay.L + K
                    for m2 in range(-K, K + 1):
                        Jfin[r, base + m2] = -J[m - m2][i][k]
                Jfin[r, r] += acb(0, m) * om_bar
                if i == IV:
                    Jfin[r, r] += dc[m]
        Jmid = np.array([[complex(float(v.real.mid()), float(v.imag.mid())) for v in row] for row in Jfin.tolist()])
        Ainv = np.linalg.inv(Jmid)
        Afin = acb_mat([[acb(complex(v)) for v in row] for row in Ainv])
        Bfin = ex._identity(n) - Afin * Jfin
    finally:
        ctx.prec = old_prec
    clk.mark("A_fin, I - A_fin J_fin")

    ctx.prec = Pg
    try:
        comp_of = [None] + [k for k in range(DIM) for _ in range(lay.L)]
        mode_of = [0] + [m for _ in range(DIM) for m in range(-K, K + 1)]
        WROW = ex._weight_rows(lay, nupow)
        Z1_ff = ex._block_colsup(WROW * ex._abs_mat(Bfin), comp_of, mode_of, nupow)
        Aabs = ex._abs_mat(Afin)
        colA = WROW * Aabs
        N0 = ex._block_colsup(colA, comp_of, mode_of, nupow)
        N1 = ex._block_colsup(colA, comp_of, mode_of, nupow, scale_by_mode=True)

        # finite rows x tail columns (Stage E, E.5, with the level phase's entries on the tail columns)
        Lw = int(st["L"])
        cols_exact = [(k, mp) for k in range(DIM) for mp in list(range(K + 1, K + Lw + 1)) + list(range(-K - Lw, -K))]
        Wm = acb_mat(n, len(cols_exact))
        for t, (k, mp) in enumerate(cols_exact):
            if k == IV:
                Wm[0, t] = acb(1)
            for j in range(DIM):
                for m in range(-K, K + 1):
                    Wm[lay.idx(j, m), t] = -J[m - mp][j][k]
        with fe.precision(PM):
            AW = Afin * Wm
        colW = WROW * ex._abs_mat(AW)
        Z1_ft = [[arb(0)] * (DIM + 1) for _ in range(DIM + 1)]
        for t, (k, mp) in enumerate(cols_exact):
            for c in range(DIM + 1):
                Z1_ft[c][1 + k] = amax(Z1_ft[c][1 + k], up(colW[c, t] / nupow[abs(mp)]))
        mb = K + Lw + 1
        cols_b = [(k, s * mb) for k in range(DIM) for s in (1, -1)]
        Wb = arb_mat(n, len(cols_b))
        erho = (-rho).exp()
        for t, (k, mp) in enumerate(cols_b):
            if k == IV:
                Wb[0, t] = arb(1)
            for j in range(DIM):
                for m in range(-K, K + 1):
                    Wb[lay.idx(j, m), t] = up(SJ[j][k] * erho ** abs(m - mp))
        colWb = WROW * (Aabs * Wb)
        for t, (k, mp) in enumerate(cols_b):
            for c in range(DIM + 1):
                Z1_ft[c][1 + k] = amax(Z1_ft[c][1 + k], up(colWb[c, t] / nupow[abs(mp)]))
        clk.mark("Z1 finite")

        # tail (Lemma T, uniform over eps in the piece)
        J0hat = acb_mat([[acb(J[0][r][c].real.mid()) for c in range(DIM)] for r in range(DIM)])
        Jp = {nn: acb_mat([[J[nn][r][c] - (J0hat[r, c] if nn == 0 else 0) for c in range(DIM)] for r in range(DIM)])
              for nn in range(-Kp, Kp + 1)}
        with fe.precision(PM):
            tail = tail_bounds_eps(K, Kp, om_bar, J0hat, Jp, elo, ehi, st, log=log, _mutate=mut)
        Abar0, Abar1, Cn = tail["Abar0"], tail["Abar1"], tail["C"]
        T = [[arb(0)] * DIM for _ in range(DIM)]
        for nn, C in Cn.items():
            w = up(nupow[abs(nn)])
            for c in range(DIM):
                for k in range(DIM):
                    T[c][k] = T[c][k] + C[c][k] * w
        for c in range(DIM):
            for k in range(DIM):
                s = arb(0)
                for j in range(DIM):
                    s += Abar0[c][j] * SJ[j][k]
                T[c][k] = up(T[c][k] + s * tailK)
        clk.mark("tail")
        B1 = [[None] * (DIM + 1) for _ in range(DIM + 1)]
        for c in range(DIM + 1):
            for cp in range(DIM + 1):
                b = amax(Z1_ff[c][cp], Z1_ft[c][cp])
                if c >= 1 and cp >= 1:
                    b = up(b + T[c - 1][cp - 1])
                B1[c][cp] = b
        # eps part of Z1: |A_fin Delta| <= delta |A_fin| diag(|DD_m|) on the (V, m) columns
        B1g = [[arb(0)] * (DIM + 1) for _ in range(DIM + 1)]
        for c in range(DIM + 1):
            best = arb(0)
            for m in range(-K, K + 1):
                v = up(colA[c, lay.idx(IV, m)] / nupow[abs(m)] * DD[m].abs_upper())
                best = amax(best, v)
            B1g[c][1 + IV] = best

        # Y0: point part at e_c (finite rows) + eps-uniform tail rows; derivative part (finite rows)
        Ffin = acb_mat(n, 1)
        s = acb(0)
        for m in range(-K, K + 1):
            s += A[IV][m + K]
        Ffin[0, 0] = s - acb(ct.level_exact())
        for i in range(DIM):
            for m in range(-K, K + 1):
                v = acb(0, m) * om_bar * A[i][m + K] - enc_g.c[i][m + Kp]
                if i == IV:
                    v += dc[m] * A[i][m + K]
                Ffin[lay.idx(i, m), 0] = v
        AF = Afin * Ffin
        Y0p = [arb(0)] * (DIM + 1)
        for r in range(n):
            c = 0 if comp_of[r] is None else 1 + comp_of[r]
            Y0p[c] = Y0p[c] + AF[r, 0].abs_upper() * nupow[abs(mode_of[r])]
        Ab0 = arb_mat(Abar0)
        for m in range(K + 1, Kp + 1):
            Ams = tail["A_explicit"].get(m)
            for sgn in (1, -1):
                gv = acb_mat([[enc_g.c[k][sgn * m + Kp]] for k in range(DIM)])
                if Ams is not None:
                    vals = [arb(0)] * DIM
                    for Am in Ams:
                        v = (Am if sgn == 1 else Am.conjugate()) * gv
                        vals = [amax(vals[c], v[c, 0].abs_upper()) for c in range(DIM)]
                else:
                    v = Ab0 * arb_mat([[gv[k, 0].abs_upper()] for k in range(DIM)])
                    vals = [up(v[c, 0]) for c in range(DIM)]
                for c in range(DIM):
                    Y0p[1 + c] = Y0p[1 + c] + vals[c] * nupow[m]
        for c in range(DIM):
            s = arb(0)
            for k in range(DIM):
                s += Abar0[c][k] * Sg[k]
            Y0p[1 + c] = Y0p[1 + c] + s * tailK
        Y0p = [up(v) for v in Y0p]
        Wv = acb_mat(n, 1)
        for m in range(-K, K + 1):
            Wv[lay.idx(IV, m), 0] = acb(DD[m]) * A[IV][m + K]
        AWv = Afin * Wv
        Y0g = [arb(0)] * (DIM + 1)
        for r in range(n):
            c = 0 if comp_of[r] is None else 1 + comp_of[r]
            Y0g[c] = Y0g[c] + AWv[r, 0].abs_upper() * nupow[abs(mode_of[r])]
        Y0g = [up(v) for v in Y0g]
        clk.mark("Y0 parts")
    finally:
        ctx.prec = old_prec
    sts = {k: (str(v) if isinstance(v, (Fraction, arb)) else v) for k, v in st.items()}
    return dict(g_lo=G_KS, g_hi=G_KS, g_c=G_KS, K=K, Kp=Kp, M=Mn, settings=sts, label=label,
                om_bar=om_bar, A=A, nu=nu, rho0=rho0, rho=rho, delta=delta, B1=B1, B1g=B1g, N0=N0, N1=N1, Abar0=Abar0,
                Abar1=Abar1, Y0p=Y0p, Y0g=Y0g, J=J, SJ=SJ,
                tail=dict(m_max=tail["m_max"], theta=float(up(tail["theta"])), nsub_total=tail["nsub_total"]),
                strips=dict(g=ex._strip_rec(strip_g), J=ex._strip_rec(strip_J)),
                timings_s=clk.marks, wall_s=round(time.time() - clk.t0, 2),
                e_lo=elo, e_hi=ehi, e_c=ec, mutations=sorted(mut))


# =================================================================================================================
# One piece: blocks, weights (float search), Hessian cover (Lemma B2), branch.assemble
# =================================================================================================================
def _radii_text(eta, rs):
    rstar = f"{max(1, int(rs * 2 ** 60))}/{2 ** 60}"
    Rs = [f"{max(1, int(32 * float(Fraction(eta[1 + i])) * rs * 2 ** 60))}/{2 ** 60}" for i in range(DIM)]
    return rstar, Rs


def _choose(bl, MHf):
    eta_f, pred = br.choose_eta(bl, MHf, iters=3000)
    eta = br.dyadic_eta(eta_f, bits=20)
    rs = 0.9 * pred["r_star"] / 0.35 if pred["r_star"] > 0 else 1e-9
    rstar, Rs = _radii_text(eta, rs)
    return eta, rstar, Rs, pred


def finish(bl, eta, rstar, hb, *, log=print, _mutate=()):
    """branch.assemble on the eps blocks, and the record in eps terms (G_Ks fields replaced by the fixed G_Ks)."""
    try:
        out = br.assemble(bl, eta, rstar, hb, log=log, _mutate=_mutate)
    except ProofFailure as e:            # report the eps range (assemble's message names the fixed G_Ks range)
        err = ProofFailure(f"eps in [{_fs(bl['e_lo'])}, {_fs(bl['e_hi'])}]: {e}")
        err.diag = getattr(e, "diag", None)
        raise err from None
    for k in ("g_lo", "g_hi", "centre_g"):
        out.pop(k, None)
    out.update(G_Ks=G_KS, eps_lo=_fs(bl["e_lo"]), eps_hi=_fs(bl["e_hi"]), eps_c=_fs(bl["e_c"]),
               eps_half_width=_fs(bl["e_hi"] - bl["e_c"]))
    if bl.get("mutations"):
        out["MUTATED_BLOCKS"] = bl["mutations"]
    return out


def prove_piece(om, A, e_lo, e_hi, MHf, *, settings=None, log=print, label=None, _mutate_blocks=()):
    """Returns (record, extras, blocks). Untrusted choices, in order: weights eta and r_* from the float prediction
    (branch.choose_eta with the Hessian estimate MHf); if the inequalities fail, weights re-chosen with the rigorous
    cover's Hessian entries; if they hold but r_uniqueness < 2 r_existence (r_* above (1 - Z1) / Z2, so that
    existence._radii falls back to r_hi = r_lo, useless for gluing), r_* := 0.8 (1 - Z1) / Z2 from the rigorous Z1, Z2
    with the same weights, a new cover, and the assembly again. Raises ProofFailure (with .diag) if nothing closes."""
    bl = piece_blocks(om, A, e_lo, e_hi, settings=settings, log=log, label=label, _mutate=_mutate_blocks)
    tries = []
    eta, rstar, Rs, pred = _choose(bl, MHf)
    for attempt in range(4):
        hb = br.HessBound([(om, A)], G_KS, G_KS, Rs, "1", None, log=log)
        try:
            out = finish(bl, eta, rstar, hb, log=log)
        except ProofFailure as e:
            tries.append(dict(why=str(e), diag=getattr(e, "diag", None), r_star=rstar))
            eta, rstar, Rs, pred = _choose(bl, br.MH_float(hb))
            continue
        extras = dict(eta_prediction={k: float(v) for k, v in pred.items()}, r_star_text=rstar, R=Rs,
                      hess_record=hb.record(), attempt=attempt, earlier_attempts=tries)
        if out["r_uniqueness"]["approx"] >= 2 * out["r_existence"]["approx"]:
            return out, extras, bl
        d = out["diag"]
        tries.append(dict(why="r_uniqueness < 2 r_existence; r_* re-chosen from the rigorous Z1, Z2", r_star=rstar,
                          Z1=d["Z1"], Z2=d["Z2"]))
        rstar, Rs = _radii_text(eta, 0.8 * (1 - d["Z1"]) / d["Z2"])
    err = ProofFailure(f"piece [{e_lo}, {e_hi}] failed: {tries[-1]['why']}")
    err.diag = tries
    raise err


# =================================================================================================================
# Gluing and Stage E inclusion (sections 6, 7)
# =================================================================================================================
def obj_of(rec, centre):
    om, A = centre_from_text(centre)
    if br.centre_digest(om, A) != rec["centre_sha256"]:
        raise ValueError(f"centre does not match the piece record {rec.get('label')}")
    old = ctx.prec
    ctx.prec = 256
    try:
        ETA = [ex._exact_dyadic_param(e, "eta") for e in rec["eta"]]
        nu = ex._exact_dyadic_param(rec["settings"]["rho0"], "rho0").exp()
        r_lo = ct.text_to_dyadic(rec["r_existence"]["hex"])
        r_hi = ct.text_to_dyadic(rec["r_uniqueness"]["hex"])
    finally:
        ctx.prec = old
    return dict(om_bar=om, A=A, ETA=ETA, nu=nu, r_lo=r_lo, r_hi=r_hi)


def glue_eps(ra, ca, rb, cb):
    """Section 6: eps-overlap and ball inclusion (Arb). ra, rb piece records; ca, cb their centre texts."""
    oa, ob = obj_of(ra, ca), obj_of(rb, cb)
    if not ra["settings"]["rho0"] == rb["settings"]["rho0"]:
        raise ValueError("different nu")
    overlap = Fraction(rb["eps_lo"]) <= Fraction(ra["eps_hi"]) and Fraction(ra["eps_lo"]) <= Fraction(rb["eps_hi"])
    d = br.centre_distance(oa["om_bar"], oa["A"], ob["om_bar"], ob["A"], ob["ETA"], ob["nu"])
    conv = arb(0)
    for ea, eb in zip(oa["ETA"], ob["ETA"]):
        conv = amax(conv, up(ea / eb))
    lhs = up(d + oa["r_lo"] * conv)
    ok = bool(overlap and lhs <= ob["r_hi"])
    return dict(pieces=[[ra["eps_lo"], ra["eps_hi"]], [rb["eps_lo"], rb["eps_hi"]]],
                overlap=[str(max(Fraction(ra["eps_lo"]), Fraction(rb["eps_lo"]))),
                         str(min(Fraction(ra["eps_hi"]), Fraction(rb["eps_hi"])))] if overlap else None,
                centre_distance=bound_rec(d), norm_conversion=float(conv), lhs=bound_rec(lhs),
                r_uniqueness_b=bound_rec(ob["r_hi"]), glued=ok)


def stage_e_inclusion(N, rec, centre):
    """Section 7: is the Stage E zero for N the zero x*(1/N^2) of this piece? Also the T overlap."""
    e = Fraction(1, N * N)
    if not Fraction(rec["eps_lo"]) <= e <= Fraction(rec["eps_hi"]):
        return dict(N=N, ok=False, why="1/N^2 not in piece")
    path = os.path.join(RESULTS, f"fourier-existence-N{N}.json")
    with open(path) as fh:
        se = json.load(fh)
    cpath = os.path.join(ROOT, se["centre_file"])
    if ex.sha256(cpath) != se["centre_sha256"]:
        raise RuntimeError(f"Stage E centre file for N = {N} does not match its record")
    if se["settings"].get("eta") is not None or se["settings"]["rho0"] != rec["settings"]["rho0"]:
        raise RuntimeError("Stage E record with weights or another nu: the inclusion test does not apply")
    Nf, Kf, omE, AE, _ = ct.load(cpath)
    if Nf != N:
        raise RuntimeError("centre N mismatch")
    op = obj_of(rec, centre)
    old = ctx.prec
    ctx.prec = 256
    try:
        rE = ct.text_to_dyadic(se["r_existence"]["hex"])
        d = br.centre_distance(omE, AE, op["om_bar"], op["A"], op["ETA"], op["nu"])
        conv = arb(0)
        for eb in op["ETA"]:
            conv = amax(conv, up(1 / eb))
        lhs = up(d + rE * conv)
        ok = bool(lhs <= op["r_hi"])
    finally:
        ctx.prec = old
    a_, b_ = Fraction(rec["T_ms"]["lower"]["dec"]), Fraction(rec["T_ms"]["upper"]["dec"])
    A_, B_ = Fraction(se["T_ms"]["lower"]["dec"]), Fraction(se["T_ms"]["upper"]["dec"])
    return dict(N=N, eps=str(e), piece=[rec["eps_lo"], rec["eps_hi"]], piece_label=rec["label"], ok=ok,
                centre_distance=bound_rec(d), lhs=bound_rec(lhs), r_uniqueness_piece=rec["r_uniqueness"],
                stage_E_T_ms=[se["T_ms"]["lower"]["dec"], se["T_ms"]["upper"]["dec"]],
                piece_T_ms=[rec["T_ms"]["lower"]["dec"], rec["T_ms"]["upper"]["dec"]],
                T_overlaps=bool(a_ <= B_ and A_ <= b_), stage_E_T_inside=bool(a_ <= A_ and B_ <= b_),
                stage_E_record_sha256=ex.sha256(path))


# =================================================================================================================
# Centre text (exact) and logs
# =================================================================================================================
def centre_text(om, A):
    K = (len(A[0]) - 1) // 2
    return dict(K=K, omega=ct.dyadic_to_text(om),
                a=[[[ct.dyadic_to_text(A[i][K + m].real), ct.dyadic_to_text(A[i][K + m].imag)] for m in range(K + 1)]
                   for i in range(DIM)])


def centre_from_text(c):
    K = int(c["K"])
    om = ct.text_to_dyadic(c["omega"])
    A = [[None] * (2 * K + 1) for _ in range(DIM)]
    old = ctx.prec
    ctx.prec = 1024
    try:
        for i in range(DIM):
            for m in range(K + 1):
                re, im = (ct.text_to_dyadic(t) for t in c["a"][i][m])
                A[i][K + m] = acb(re, im)
                A[i][K - m] = acb(re, -im)
    finally:
        ctx.prec = old
    return om, A


def _fs(x):
    return str(Fraction(x))


def _append(path, rec):
    with open(path, "a") as fh:
        fh.write(json.dumps(rec) + "\n")
        fh.flush()
        os.fsync(fh.fileno())


def _read_log(path, repair):
    if repair:
        br._repair_jsonl(path)
    return br._read_jsonl_tolerant(path)


# =================================================================================================================
# Driver (sections 8, 9)
# =================================================================================================================
def _snap(x, down):
    q = Fraction(x) / GRID
    n = q.numerator // q.denominator if down else -((-q.numerator) // q.denominator)
    return n * GRID


def base_plan(width, overlap, e_end=E_END):
    """Deterministic grid of pieces [lo, lo + width] starting at 0, step width (1 - overlap), until hi >= e_end."""
    width, overlap = Fraction(width), Fraction(overlap)
    out = []
    lo_ = Fraction(0)
    while True:
        hi_ = lo_ + width
        out.append((lo_, hi_))
        if hi_ >= e_end:
            return out
        lo_ = _snap(hi_ - overlap * width, down=True)


def split(piece, overlap):
    lo_, hi_ = piece
    w = hi_ - lo_
    mid = (lo_ + hi_) / 2
    return [(lo_, _snap(mid + overlap * w / 2, down=False)), (_snap(mid - overlap * w / 2, down=True), hi_)]


def current_plan(width, overlap, fails, e_end=E_END):
    """Leaves of the plan: the base grid with every failed piece replaced (recursively) by its two halves."""
    overlap = Fraction(overlap)
    failed = {(Fraction(f["eps_lo"]), Fraction(f["eps_hi"])) for f in fails}
    out, stack = [], list(reversed(base_plan(width, overlap, e_end)))
    while stack:
        p = stack.pop()
        if p in failed:
            a, b = split(p, overlap)
            stack.extend([b, a])
        else:
            out.append(p)
    return out


def _job(job):
    """Worker: centre, blocks, weights, Hessian cover, assembly. Returns a JSON-able dict."""
    import traceback
    t0 = time.time()
    lo_, hi_ = Fraction(job["eps_lo"]), Fraction(job["eps_hi"])
    try:
        om, A, nr = float_centre((lo_ + hi_) / 2, int(job["K"]))
        rec, extras, _ = prove_piece(om, A, lo_, hi_, np.array(job["MHf"]), log=lambda *a, **k: None,
                                     label=job["label"], settings=dict(K=job["K"]))
        return dict(ok=True, rec=br._public(rec), centre=centre_text(om, A), newton_residual=nr, extras=extras,
                    wall=round(time.time() - t0, 1))
    except ProofFailure as e:
        return dict(ok=False, eps_lo=job["eps_lo"], eps_hi=job["eps_hi"], why=str(e), diag=getattr(e, "diag", None),
                    wall=round(time.time() - t0, 1))
    except Exception as e:  # noqa: BLE001  (recorded, never counted as a proof)
        return dict(ok=False, eps_lo=job["eps_lo"], eps_hi=job["eps_hi"], why=f"{type(e).__name__}: {e}",
                    trace=traceback.format_exc()[-2000:], wall=round(time.time() - t0, 1), crash=True)


def run(width="1/4096", overlap="1/8", K=12, workers=2, budget_s=3300, e_end=E_END, log=print):
    """Prove every missing leaf of the plan (resumable). Failed pieces are logged and split; the next run (or the
    loop here, while the budget lasts) proves their halves."""
    import multiprocessing as mp
    os.makedirs(DATA, exist_ok=True)
    T0 = time.time()
    MHf = float_hessian_estimate(K)
    while time.time() - T0 < budget_s:
        done = {(Fraction(r["rec"]["eps_lo"]), Fraction(r["rec"]["eps_hi"])) for r in _read_log(PIECES_LOG, True)}
        fails = _read_log(FAIL_LOG, True)
        plan = current_plan(width, overlap, [f for f in fails if not f.get("crash")], e_end)
        crashed = {(Fraction(f["eps_lo"]), Fraction(f["eps_hi"])) for f in fails if f.get("crash")}
        todo = [p for p in plan if p not in done and p not in crashed]
        if not todo:
            log(f"plan complete: {len(plan)} leaves, {len(done)} pieces logged")
            break
        log(f"{len(todo)} pieces to prove ({len(plan)} leaves, {len(done)} logged)")
        jobs = [dict(eps_lo=_fs(a), eps_hi=_fs(b), K=K, MHf=MHf.tolist(), label=f"E[{_fs(a)},{_fs(b)}]")
                for a, b in todo]
        nfail = 0
        with mp.get_context("fork").Pool(workers, maxtasksperchild=8) as pool:
            for o in pool.imap_unordered(_job, jobs, chunksize=1):
                if o["ok"]:
                    _append(PIECES_LOG, dict(type="piece", rec=o["rec"], centre=o["centre"], extras=o["extras"],
                                             newton_residual=o["newton_residual"], wall=o["wall"]))
                    r = o["rec"]
                    log(f"  certified [{r['eps_lo']}, {r['eps_hi']}]: Y0 {r['Y0']['approx']:.3e} Z1 "
                        f"{r['Z1']['approx']:.4f} Z2 {r['Z2']['approx']:.3e} r [{r['r_existence']['approx']:.2e}, "
                        f"{r['r_uniqueness']['approx']:.2e}] T [{r['T_ms']['lower']['dec'][:16]}, "
                        f"{r['T_ms']['upper']['dec'][:16]}] {o['wall']} s (total {time.time() - T0:.0f} s)", flush=True)
                else:
                    nfail += 1
                    _append(FAIL_LOG, {k: v for k, v in o.items() if k != "ok"})
                    log(f"  FAILED [{o['eps_lo']}, {o['eps_hi']}]: {o['why'][:200]}", flush=True)
                if time.time() - T0 > budget_s:
                    log("budget reached; stopping (the pool finishes running jobs)")
                    pool.terminate()
                    break
        if nfail == 0 and time.time() - T0 < budget_s:
            continue
    return


SOURCES = ["fourier/alln.py", "fourier/branch.py", "fourier/existence.py", "fourier/centre.py", "fourier/arbmodel.py",
           "fourier/fourier_eval.py", "fourier/tp06_18d_arb.py", "model/tp06_18d.py", "model/scales.txt"]


def collect(width="1/4096", overlap="1/8", e_end=E_END, write=True, log=print):
    """Re-check the logs in Arb (centre digests, gluing, Stage E inclusion) and write the result record."""
    recs = _read_log(PIECES_LOG, False)
    fails = _read_log(FAIL_LOG, False)
    byk = {}
    for r in recs:
        byk[(Fraction(r["rec"]["eps_lo"]), Fraction(r["rec"]["eps_hi"]))] = r
    plan = current_plan(width, overlap, [f for f in fails if not f.get("crash")], e_end)
    missing = [p for p in plan if p not in byk]
    chain = [byk[p] for p in plan if p in byk]
    chain.sort(key=lambda r: (Fraction(r["rec"]["eps_lo"]), Fraction(r["rec"]["eps_hi"])))
    for r in chain:                                   # digest check (obj_of raises on mismatch)
        obj_of(r["rec"], r["centre"])
    n_nonconsecutive = br.check_piece_order(           # section 6: strictly increasing endpoints, r_lo < r_hi
        [dict(g_lo=r["rec"]["eps_lo"], g_hi=r["rec"]["eps_hi"], label=r["rec"]["label"],
              r_existence=r["rec"]["r_existence"], r_uniqueness=r["rec"]["r_uniqueness"]) for r in chain])
    glues = []
    covered_hi = None
    if chain and Fraction(chain[0]["rec"]["eps_lo"]) == 0:
        covered_hi = Fraction(chain[0]["rec"]["eps_hi"])
        for a, b in zip(chain, chain[1:]):
            g = glue_eps(a["rec"], a["centre"], b["rec"], b["centre"])
            glues.append(g)
            if not g["glued"]:
                break
            covered_hi = max(covered_hi, Fraction(b["rec"]["eps_hi"]))
    n_glued = len([g for g in glues if g["glued"]]) + (1 if chain else 0)
    inclusions = []
    for N in (8, 16, 32, 64):
        e = Fraction(1, N * N)
        for r in chain[:n_glued]:
            if Fraction(r["rec"]["eps_lo"]) <= e <= Fraction(r["rec"]["eps_hi"]):
                inclusions.append(stage_e_inclusion(N, r["rec"], r["centre"]))
    cable = [r for r in chain[:1] if Fraction(r["rec"]["eps_lo"]) == 0]
    table = []
    for r in chain:
        p = r["rec"]
        table.append(dict(eps=[p["eps_lo"], p["eps_hi"]], eps_float=[float(Fraction(p["eps_lo"])),
                                                                      float(Fraction(p["eps_hi"]))],
                          N_range=_n_range(p), label=p["label"],
                          T_ms=[p["T_ms"]["lower"]["dec"], p["T_ms"]["upper"]["dec"]],
                          omega=[p["omega"]["lower"]["dec"], p["omega"]["upper"]["dec"]],
                          Y0=p["Y0"]["approx"], Z1=p["Z1"]["approx"], Z2=p["Z2"]["approx"],
                          r_existence=p["r_existence"], r_uniqueness=p["r_uniqueness"],
                          contraction=p["contraction_at_r_uniqueness"]["approx"],
                          Y0_point_max=p["Y0_point_max"], Y0_eps_derivative_max=p["Y0_g_derivative_max"],
                          tail=p["tail"], eta=p["eta"], centre_sha256=p["centre_sha256"],
                          hessian_cover=p["hessian_cover"], wall_s=r["wall"]))
    widths = [Fraction(p["rec"]["eps_hi"]) - Fraction(p["rec"]["eps_lo"]) for p in chain]
    complete = bool(covered_hi is not None and covered_hi >= e_end and not missing)
    out = dict(
        what="Stage E for every N: rotating 1-waves of the N-cell ring for every integer N >= 8 and the travelling wave of "
             "the continuum cable, as one continuous family in eps = 1/N^2 (fourier/alln.py)",
        status="computed; awaiting adversarial review",
        theorem=theorem_text(covered_hi if covered_hi is not None else Fraction(0), complete),
        eps_covered=[ "0", _fs(covered_hi)] if covered_hi is not None else None,
        eps_covered_float=[0.0, float(covered_hi)] if covered_hi is not None else None,
        complete_cover_of_0_to_1_64=complete, missing_plan_pieces=[[_fs(a), _fs(b)] for a, b in missing],
        n_pieces=len(chain), n_glued_chain=n_glued, non_consecutive_overlaps=n_nonconsecutive,
        piece_width_min=float(min(widths)) if widths else None, piece_width_max=float(max(widths)) if widths else None,
        plan=dict(width=str(width), overlap=str(overlap), grid="2^-40"),
        failures=[{k: v for k, v in f.items() if k not in ("diag", "trace")} for f in fails],
        pieces=table, gluing=glues, stage_E_inclusion=inclusions,
        cable_piece=table[0] if cable else None,
        controls=_read_log(CONTROLS_LOG, False),
        run_code=(json.load(open(os.path.join(DATA, "run_code.json"))) if os.path.exists(os.path.join(DATA, "run_code.json"))
                  else None),
        settings=dict(DEFAULTS),
        sources_sha256={p: ex.sha256(os.path.join(ROOT, p)) for p in SOURCES},
        pieces_log=os.path.relpath(PIECES_LOG, ROOT), pieces_log_sha256=ex.sha256(PIECES_LOG),
        failures_log=os.path.relpath(FAIL_LOG, ROOT),
        failures_log_sha256=ex.sha256(FAIL_LOG) if os.path.exists(FAIL_LOG) else None,
        python_flint=flint.__version__, FLINT=flint.__FLINT_VERSION__, python=platform.python_version(),
        machine=platform.machine(), date=time.strftime("%Y-%m-%d"),
        total_piece_wall_s=round(sum(r["wall"] for r in chain), 1))
    if write:
        path = os.path.join(RESULTS, "fourier-existence-alln.json")
        with open(path, "w") as fh:
            json.dump(out, fh, indent=1)
            fh.write("\n")
        log(f"wrote {path}: {len(chain)} pieces, glued chain covers [0, {float(covered_hi or 0):.6g}], "
            f"complete = {complete}")
    return out


def _n_range(p):
    """Integers N >= 8 with 1/N^2 in the piece (as [N_min, N_max], N_max = null for 'infinity' when eps_lo = 0)."""
    lo_, hi_ = Fraction(p["eps_lo"]), Fraction(p["eps_hi"])
    if hi_ <= 0:
        return None
    nmin = max(8, math.isqrt(int(math.floor(1 / hi_))) if hi_ < 1 else 1)
    while Fraction(1, nmin * nmin) > hi_:
        nmin += 1
    if lo_ == 0:
        return [nmin, None]
    nmax = math.isqrt(int(math.floor(1 / lo_)))
    while Fraction(1, (nmax + 1) ** 2) >= lo_:
        nmax += 1
    while nmax >= nmin and Fraction(1, nmax * nmax) < lo_:
        nmax -= 1
    return [nmin, nmax] if nmax >= nmin else []


def theorem_text(hi, complete):
    rng = f"[0, {_fs(hi)}]" + (" (which contains [0, 1/64])" if complete else " (NOT the whole of [0, 1/64])")
    return ("For Erhardt's 18-state TP06 endocardial model at G_Ks = 0.0275 and every eps in " + rng + ", there are "
            "omega*(eps) > 0 and a real 2 pi periodic phi*(.; eps), analytic on |Im theta| < 1/4, with phi*_V(0) = s "
            "(the double nearest 0.2 mV), solving omega phi' = f(phi) - L_eps phi, where L_eps acts on Fourier mode m as "
            "multiplication of the V component by d_m(eps) = 4 pi^2 D m^2 sinc(pi m sqrt(eps))^2, D = 1/64000 per ms. "
            "On each listed piece, (omega*, Fourier coefficients of phi*) is the only zero of F(.; eps) in the piece's "
            "uniqueness ball (X = C x (l^1_nu)^18, nu = e^{1/4}, the piece's weights) and lies in its existence ball; "
            "T(eps) = 2 pi / omega*(eps) lies in the piece's T enclosure; a*_{1,V} != 0, so phi* has minimal period "
            "2 pi; eps -> (omega*, phi*) is continuous (pieces glued by ball inclusion). Consequences: (i) for every "
            "integer N >= 8 with 1/N^2 in the range, z_j(t) = phi*(omega* t + 2 pi j / N; 1/N^2) is a rotating 1-wave "
            "of the N-cell ring (coupling c = N^2 D), of minimal period T(1/N^2), not synchronous; for N = 8, 16, 32, "
            "64 it is the Stage E wave (ball inclusion checked); (ii) at eps = 0, u(x, t) = phi*(omega* t + 2 pi x; 0) "
            "is a travelling wave (one wave around the unit ring per period T(0)) of the cable u_t = D u_xx e_V + f(u) "
            "on x in R/Z, a classical solution (phi*_V is analytic); (iii) as N -> infinity, phi*(.; 1/N^2) -> "
            "phi*(.; 0) in l^1_nu (uniformly on the strip |Im theta| < 1/4) and T(1/N^2) -> T(0). Stability is not "
            "claimed here.")


# =================================================================================================================
# Negative controls (recorded in controls.jsonl and in the result record)
# =================================================================================================================
def float_residual_norm(rec, centre, eps, K=None):
    """Float (untrusted, a check only) weighted norm of the finite part of A_fin F(xbar; eps) for the piece's A_fin
    (recomputed as the double inverse of the float Galerkin matrix at e_c) and weights: a lower estimate of
    ||A F(xbar; eps)||, used to show that a mutated Y0 is violated."""
    om, A = centre_from_text(centre)
    K = (len(A[0]) - 1) // 2
    a = np.array([[complex(float(A[i][m].real), float(A[i][m].imag)) for m in range(2 * K + 1)] for i in range(DIM)])
    omf = float(om)
    Mc = 4 * K + 64
    G, _ = galerkin_f(omf, a, float(Fraction(rec["eps_c"])), Mc)
    Ai = np.linalg.inv(G)
    R = residual_f(omf, a, float(Fraction(eps)), Mc)
    v = Ai @ R
    lay = ct.Layout(K)
    eta = [float(Fraction(e)) for e in rec["eta"]]
    nuf = math.exp(float(Fraction(rec["settings"]["rho0"])))
    best = abs(v[0]) / eta[0]
    for i in range(DIM):
        s = sum(abs(v[lay.idx(i, m)]) * nuf ** abs(m) for m in range(-K, K + 1))
        best = max(best, s / eta[1 + i])
    return best


def reprove(line, log=None, _mutate_blocks=(), _mutate=()):
    """Re-run a logged piece from its stored exact inputs (centre, weights, r_*, radii R): blocks, a new Hessian cover,
    assembly. Returns (record, cover digest). Used to check that the logged numbers are reproduced bit for bit."""
    log = log or (lambda *a, **k: None)
    rec, extras = line["rec"], line["extras"]
    om, A = centre_from_text(line["centre"])
    if br.centre_digest(om, A) != rec["centre_sha256"]:
        raise ValueError("centre digest mismatch")
    bl = piece_blocks(om, A, Fraction(rec["eps_lo"]), Fraction(rec["eps_hi"]), settings=dict(K=rec["K"]), log=log,
                      label=rec["label"], _mutate=_mutate_blocks)
    hb = br.HessBound([(om, A)], G_KS, G_KS, extras["R"], "1", None, log=log)
    return finish(bl, rec["eta"], extras["r_star_text"], hb, log=log, _mutate=_mutate), hb.digest, bl


def controls(piece_lo="0", piece_hi="1/4096", K=12, widen=("1/16", "1/8", "1/4", "1"), log=print):
    """(a) dropping the eps-derivative terms (assemble's drop_g_width) on a logged piece: the mutated Y0 is compared
    with a float residual at the piece's endpoints; (b) the piece [piece_lo, w] widened to each w in `widen` must
    fail. Appends to controls.jsonl."""
    MHf = float_hessian_estimate(K)
    lo_, hi_ = Fraction(piece_lo), Fraction(piece_hi)
    om, A, _ = float_centre((lo_ + hi_) / 2, K)
    rec, extras, bl = prove_piece(om, A, lo_, hi_, MHf, log=log, label="control-base", settings=dict(K=K))
    hb = br.HessBound([(om, A)], G_KS, G_KS, extras["R"], "1", None, log=log)
    mut = finish(bl, rec["eta"], extras["r_star_text"], hb, log=log, _mutate=("drop_g_width",))
    cen = centre_text(om, A)
    res_ends = {e: float_residual_norm(rec, cen, e) for e in (rec["eps_lo"], rec["eps_hi"])}
    res_centre = float_residual_norm(rec, cen, rec["eps_c"])
    worst = max(res_ends.values())
    out = dict(type="control_drop_eps_derivative", piece=[rec["eps_lo"], rec["eps_hi"]],
               Y0_correct=rec["Y0"]["approx"], Y0_mutated=mut["Y0"]["approx"], Z1_correct=rec["Z1"]["approx"],
               Z1_mutated=mut["Z1"]["approx"], float_residual_at_endpoints=res_ends,
               float_residual_at_centre=res_centre,
               detected=bool(worst > 10 * mut["Y0"]["approx"] and res_centre < worst / 10),
               correct_bound_holds=bool(worst <= rec["Y0"]["approx"]),
               note="mutation: delta * Y0g and delta * B1g omitted (branch.assemble _mutate drop_g_width); detected if "
                    "the float norm of A_fin F(xbar; eps) at an endpoint exceeds 10 times the mutated Y0 while the same "
                    "float norm at the centre parameter e_c is 10 times smaller (so the excess is the eps variation, "
                    "not float noise)")
    _append(CONTROLS_LOG, out)
    log(json.dumps(out))
    widen_controls(widen, K=K, MHf=MHf, log=log)


def widen_controls(widen, K=12, MHf=None, log=print):
    """Pieces [0, w] for each w in `widen`: recorded as failed (a negative control) or closed (how wide a piece can be)."""
    MHf = float_hessian_estimate(K) if MHf is None else MHf
    for w in widen:
        w = Fraction(w)
        om2, A2, _ = float_centre(w / 2, K)
        t0 = time.time()
        try:
            r2, _, _ = prove_piece(om2, A2, Fraction(0), w, MHf, log=log, label="control-widened", settings=dict(K=K))
            o = dict(type="control_widened", piece=["0", _fs(w)], failed=False, Y0=r2["Y0"]["approx"],
                     Z1=r2["Z1"]["approx"], Z2=r2["Z2"]["approx"], r_existence=r2["r_existence"]["approx"],
                     r_uniqueness=r2["r_uniqueness"]["approx"], T_ms=[r2["T_ms"]["lower"]["dec"], r2["T_ms"]["upper"]["dec"]],
                     note="the piece closed (not part of the cover; records how wide a single piece can be)")
        except ProofFailure as e:
            o = dict(type="control_widened", piece=["0", _fs(w)], failed=True, why=str(e)[:400],
                     diag=getattr(e, "diag", None))
        o["wall"] = round(time.time() - t0, 1)
        _append(CONTROLS_LOG, o)
        log(json.dumps({k: v for k, v in o.items() if k != "diag"}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--collect", action="store_true")
    ap.add_argument("--controls", action="store_true")
    ap.add_argument("--width", default="1/4096")
    ap.add_argument("--overlap", default="1/8")
    ap.add_argument("--K", type=int, default=12)
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--budget", type=float, default=3300)
    a = ap.parse_args()
    if a.run:
        run(width=a.width, overlap=a.overlap, K=a.K, workers=a.workers, budget_s=a.budget)
    if a.controls:
        controls(K=a.K)
    if a.collect:
        collect(width=a.width, overlap=a.overlap)


if __name__ == "__main__":
    main()
