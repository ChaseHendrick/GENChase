"""Stage E: computer-assisted existence and local uniqueness of the rotating 1-wave of the N-cell ring (Arb).

Status: computed; awaiting adversarial review. Nothing written by this program is "verified" until a second
reading has checked the argument below against the code.

0. Problem
----------
Scaled variables z = x / sigma (sigma_i = 2^SCALE_EXP[i], model/scales.txt, exact). f = arbmodel.f is Erhardt's
18-state TP06 endocardial field in these variables, with the model's decimals enclosed exactly (fourier/arbmodel.py).
The ring of N cells is dz_j/dt = f(z_j) + c E (z_{j-1} - 2 z_j + z_{j+1}), indices mod N, c = N^2 D, D = 1/64000 per
ms, E = projection on the V component (component 0); this is arbmodel.ring_field (the coupling is linear and acts on V
only, so it is the same in scaled and physical V). N = 1 is the uncoupled cell.

We look for z_j(t) = phi(omega t + 2 pi j / N), phi: R -> R^18 2 pi periodic, omega > 0. Then
    dz_j/dt = omega phi'(theta_j),   z_{j +- 1}(t) = phi(theta_j +- 2 pi / N),   theta_j = omega t + 2 pi j / N,
so z solves the ring iff omega phi'(theta) = f(phi(theta)) + c E (phi(theta - 2pi/N) - 2 phi(theta) + phi(theta + 2pi/N))
for all theta. With phi = sum_m a_m e^{i m theta} the coupling acts on mode m as c (e^{-2 pi i m/N} - 2 + e^{2 pi i m/N})
= -4 c sin^2(pi m / N) = -d_m (arbmodel.damping(m, N=N); d_m = 0 for N = 1). Unknowns x = (omega, a), a = (a_m)_{m in Z},
a_m in C^18, and
    F_ph(x) = sum_m a_{m,V} - s / sigma_V,                         s = the double nearest 0.2 (as proofs/verify.cpp)
    F_m(x)  = i omega m a_m - g_m(a) + d_m E a_m,   m in Z,          g(a) = f o phi_a,  g_m = its Fourier coefficients.

1. Spaces and norms
-------------------
nu = e^{rho0} (rho0 an exact dyadic; nu is used as an Arb ball containing e^{rho0}). l^1_nu = {(b_m) : ||b||_nu =
sum_m |b_m| nu^|m| < inf}, a Banach algebra under convolution (||b * c||_nu <= ||b||_nu ||c||_nu since nu^|m| <=
nu^|m-n| nu^|n|). X = C x (l^1_nu)^18 with ||x|| = max(|omega| / eta_om, max_k ||a_k||_nu / eta_k), eta > 0 fixed
weights (default 1). For a linear B on X with blocks B_{cc'} (c, c' in {om, 0..17}):
    ||B|| <= max_c (1 / eta_c) sum_{c'} eta_{c'} ||B_{cc'}||,  ||B_{cc'}||_{l^1_nu -> l^1_nu} = sup_{m'} sum_m |B(m, m')| nu^{|m|} / nu^{|m'|}
(the column sup; om counts as a component with the single mode 0). Standard: ||(Bx)_c|| <= sum_{c'} ||B_{cc'}|| ||x_{c'}||
<= sum_{c'} ||B_{cc'}|| eta_{c'} ||x||. Every such bound below is evaluated in Arb from entrywise |.| upper bounds.

2. The centre and the operator A
--------------------------------
xbar = (omega_bar, abar): exact dyadic numbers from fourier/data/centre_N{N}_K{K}.json (centre.py, untrusted), abar_m = 0
for |m| > K, abar_{-m} = conj(abar_m), omega_bar real.
J(theta) = Df(phibar(theta)) = sum_n J_n e^{i n theta} (18 x 18). DF(xbar) y, for y = (y_om, y_a):
    phase:   sum_m y_{m,V}
    row m:   i y_om m abar_m + i omega_bar m y_m - sum_n J_n y_{m-n} + d_m E y_m.
A is block diagonal with respect to (modes |m| <= K plus omega) and (each mode |m| > K):
  * A_fin: an exact complex matrix of size n = 1 + 18 (2K+1), the double-precision inverse of the midpoint of the
    Galerkin matrix J_fin (the restriction of DF(xbar) to rows phase, |m| <= K and columns omega, |m'| <= K);
  * A_m = (i omega_bar m I - J0hat + d_m E)^{-1} for |m| > K, with J0hat the exact real midpoint matrix of the
    enclosure of J_0. A_m exists for every |m| > K: for K < |m| <= m_max it is computed by Arb inversion of a point
    matrix (Arb raises if the ball matrix is not certainly invertible), beyond m_max by the Neumann bound of section 4.
    A_{-m} = conj(A_m) (J0hat real, d_{-m} = d_m), so only m > 0 is computed.
A is injective: A_m are inverses, and A_fin is invertible because ||I - A_fin J_fin|| <= Z1 < 1 (the compression
P (I - A DF(xbar)) P to the finite modes equals I - A_fin J_fin, and ||P|| = 1 in X).

3. Theorem used (Newton-Kantorovich / radii polynomial)
------------------------------------------------------
T(x) = x - A F(x). For r <= r_* (r_* < min_k R_k / eta_k, R the polydisc radii of section 6) T is defined and C^1 on
the closed ball B_r(xbar) of X (section 6: g is analytic there; the term A (i omega m a_m) is a bounded bilinear map
because sup_{|m|>K} |m| |A_m| is finite, section 4; A(d_m E a_m) and the phase are bounded linear). Suppose
    ||A F(xbar)|| <= Y0,   ||I - A DF(xbar)|| <= Z1,   ||A (DF(x) - DF(xbar))|| <= Z2 ||x - xbar|| on B_{r_*}(xbar).
Then ||DT(x)|| <= Z1 + Z2 ||x - xbar||, and for x in B_r(xbar):
    ||T(x) - xbar|| <= ||T(xbar) - xbar|| + ||int_0^1 DT(xbar + t (x - xbar)) (x - xbar) dt|| <= Y0 + Z1 r + Z2 r^2 / 2.
If p(r) := Y0 + (Z1 - 1) r + Z2 r^2 / 2 < 0 and Z1 + Z2 r < 1, T maps B_r(xbar) into itself and is a contraction
there (mean value inequality on the convex ball, constant Z1 + Z2 r), so T has exactly one fixed point in B_r(xbar);
fixed points of T are exactly the zeros of F (A injective). Both inequalities are checked in Arb at exact dyadic r.

4. Tail of A (rigorous over all |m| > K)
----------------------------------------
For K < m <= m_max: A_m from Arb (point matrix, exact d_m from arbmodel.damping); entrywise |A_m|, |m A_m| and
|A_m J'_n| (J'_n = J_n for n != 0, J'_0 = J_0 - J0hat, J_n balls) are bounded directly.
For m > m_max, y = omega_bar m >= Y := omega_bar (m_max + 1): with B0 = J0hat - d_m E, A_m = (i y)^{-1} sum_k (B0/(i y))^k,
and entrywise |B0| <= G0 := |J0hat| + dmax E, dmax >= every d_m (dmax = 4 c). With G = G0 / Y and theta = ||G||_inf < 1:
    |A_m| <= (1/y) sum_k (G0/y)^k <= (1/Y) S_G,   |m A_m| = (y / omega_bar) |A_m| <= (1/omega_bar) S_G,
    S_G := I + G + G^2 + theta^3 / (1 - theta) * ones   (each entry of sum_{k>=3} G^k is <= its row sum <= theta^3/(1-theta)),
and |A_m J'_n| <= |A_m| |J'_n|. m_max is the least integer with theta <= theta_target (setting). The sup bounds
Abar0 = sup_{|m|>K} |A_m|, Abar1 = sup |m A_m|, C_n = sup |A_m J'_n| are entrywise maxima over both ranges. Negative m:
A_{-m} = conj(A_m), so |A_{-m}| = |A_m| and |A_{-m} J'_n| = |A_m conj(J'_n)|, bounded by an explicit product with the
conjugated enclosure. For |n| <= n_explicit the products A_m J'_n (m and -m) are formed explicitly for K < m <= m_max;
for n_explicit < |n| <= K' the bound C_n = Abar0 |J'_n| (entrywise, |A_m J'_n| <= |A_m| |J'_n| <= Abar0 |J'_n|) is used.

5. Y0 and Z1
------------
Fourier data (fourier_eval.py, Lemmas 1-3 there): g_m enclosures for |m| <= K' (K' = 2K + L) from an M-node DFT at
Pg bits with the aliasing bound and strip sup S_g on |Im theta| <= rho; J_n enclosures for |n| <= K' likewise with the
strip sup S_J (entrywise, 324 components); beyond K': |g_{k,m}| <= S_{g,k} e^{-rho |m|}, |J_{n,jk}| <= S_{J,jk} e^{-rho |n|}.
q := nu e^{-rho} < 1, sum_{|n| > K'} (nu e^{-rho})^{|n|} = 2 q^{K'+1} / (1 - q).

Y0. F(xbar) has finite part (phase, |m| <= K): computed in Arb (enclosures of g_m); A F(xbar) finite = A_fin F_fin.
Tail rows m (|m| > K): F_m(xbar) = -g_m (abar_m = 0 there), so (A F)_m = -A_m g_m: for K < |m| <= K' with the
computed A_m (or Abar0 |g_m| if m > m_max) and the g_m enclosure; for |m| > K', |A_m g_m| <= Abar0 S_g e^{-rho |m|},
summed in closed form.
Y0 = max_c (1/eta_c) (||(A F)_c, finite||_nu + ||(A F)_c, tail||_nu).

Z1. B := I - A DF(xbar). Columns of B indexed by (k, m'):
  * finite rows (phase / |m| <= K), finite columns: I - A_fin J_fin, an Arb matrix product (prec P_mat);
  * finite rows, tail columns (|m'| > K): -A_fin w^{(k,m')}, w^{(k,m')} = (phase: delta_{kV}; row (j,m): -J_{m-m',jk})
    (the phase functional sums over all m, and the convolution reaches across). For K < |m'| <= K + L, |m - m'| <= K'
    and the J enclosures are used (exact product A_fin w). For |m'| >= K + L + 1, |J_{m-m',jk}| <= S_{J,jk} e^{-rho |m - m'|}
    and |m - m'| = |m'| - sgn(m') m (|m| <= K < |m'|), so |A_fin w| <= |A_fin| wbar(m') entrywise, and the weighted column
    sum of |A_fin| wbar(m') divided by nu^{|m'|} is a sum of terms each proportional to nu^{-|m'|} (phase entry) or
    (e^{-rho} / nu)^{|m'|}: decreasing in |m'|. So its value at |m'| = K + L + 1 bounds the sup over all |m'| >= K + L + 1.
  * tail rows m (|m| > K), all columns: since A_m (i omega_bar m - J0hat + d_m E) = I,
        (B y)_m = A_m [ (J_0 - J0hat) y_m + sum_{n != 0} J_n y_{m-n} ] = sum_n A_m J'_n y_{m-n},
    (y_om does not enter: i y_om m abar_m = 0 for |m| > K) and, using nu^{|m|} <= nu^{|m-n|} nu^{|n|},
        ||(B y)_c, tail||_nu <= sum_k T_{ck} ||y_k||,   T := sum_{|n| <= K'} C_n nu^{|n|} + Abar0 S_J 2 q^{K'+1} / (1 - q).
  For each output component c and input component c', the column sup over m' of finite rows plus tail rows is at most
  max(finite-rows sup over finite columns, finite-rows sup over tail columns) + T_{cc'}.
  Z1 = max_c (1/eta_c) sum_{c'} eta_{c'} (that bound).

6. Z2 by a polydisc majorant
----------------------------
Radii R_k > 0 (exact). M_k >= sup |f_k(phibar(theta) + w)| over |Im theta| <= rho2, |w_j| <= R_j: strip_sup of f over the
trigonometric polynomial whose constant coefficient a_{0,j} is replaced by the complex box of half-width R_j around it
(the box contains the disc |w_j| <= R_j, so phibar(theta) + w lies in that family for every such w). A finite cover
also certifies that f is holomorphic on an open set containing the compact set {phibar(theta) + w} (fourier_eval Lemma 1
and the contract on F), and the set of evaluation points is invariant under w -> conj w, theta -> conj theta.
(i) Cauchy: c_alpha(theta) := d^alpha f_k(phibar(theta)) / alpha! is holomorphic near the strip, 2 pi periodic and
    |c_alpha(theta)| <= M_k R^{-alpha} (Cauchy's inequality on the closed polydisc, for each theta in the strip).
(ii) Strip to l^1_nu: by fourier_eval Lemma 2, |[c_alpha]_m| <= M_k R^{-alpha} e^{-rho2 |m|}, hence
    ||c_alpha||_nu <= M_k R^{-alpha} Q2,   Q2 = sum_m (nu e^{-rho2})^{|m|} = (1 + q2) / (1 - q2),  q2 = nu e^{-rho2} < 1.
(iii) For h in (l^1_nu)^18 with ||h_j||_nu < R_j: g_k(abar + h) = sum_alpha c_alpha h^alpha in l^1_nu (h^alpha a
    convolution power). The series converges absolutely in the Banach algebra (by (ii) it is dominated by
    Phi_k(t) := M_k Q2 prod_j (1 - t_j / R_j)^{-1} at t_j = ||h_j||_nu); for real theta, |h_j(theta)| <= ||h_j||_nu < R_j, so the
    Taylor series of f_k at phibar(theta) converges to f_k(phibar(theta) + h(theta)); l^1_nu convergence is uniform
    convergence, so the two functions, and their Fourier coefficients, agree. Hence a -> g(a) is analytic on that
    polydisc-ball and its derivatives are majorized termwise by those of Phi_k (all majorant coefficients >= 0):
        ||D^2 g_k(abar + h)[u, v]||_nu <= sum_{j,l} d_j d_l Phi_k(||h||) ||u_j|| ||v_l||.
(iv) For x = xbar + delta in B_r (|delta_om| <= eta_om r, ||delta a_k|| <= eta_k r) and ||y|| <= 1:
        (DF(x) - DF(xbar)) y = i m (y_om delta a_m + delta_om y_m) - (Dg(abar + delta a) - Dg(abar)) y_a.
    First term: b := y_om delta a + delta_om y_a has ||b_k|| <= 2 eta_om eta_k r; ||A (i m b)||_c <= sum_k (N1 + Abar1)_{ck}
    ||b_k||, N1 = block norms of A_fin diag(i m) (finite part), Abar1 = sup_{|m|>K} |m A_m| (tail rows).
    Second term: = int_0^1 D^2 g(abar + t delta a)[delta a, y_a] dt, and by (iii) and monotonicity of d_j d_l Phi_k,
        ||.||_k <= r W_k(r),  W_k(r) = sum_{j,l} eta_j eta_l d_j d_l Phi_k(eta r) = M_k Q2 P(r) [ (sum_j s_j)^2 + sum_j s_j^2 ],
        s_j = eta_j / (R_j - eta_j r),  P(r) = prod_j R_j / (R_j - eta_j r)
    (d_j P = P / (R_j - t_j), d_l d_j P = P / ((R_j - t_j)(R_l - t_l)) for j != l and 2 P / (R_j - t_j)^2 for j = l). Then
    ||A w||_c <= sum_k (N0 + Abar0)_{ck} ||w_k||, N0 = block norms of A_fin on the a-columns (no phase input).
    Z2 := max_c (1/eta_c) sum_k [ 2 eta_om eta_k (N1 + Abar1)_{ck} + (N0 + Abar0)_{ck} W_k(r_*) ]   (W increasing in r).
    For the omega output row (c = om) only the finite parts N0, N1 enter (A has no tail in that row).

7. Real solution, period, wave number
-------------------------------------
kappa(omega, a) := (conj omega, (conj a_{-m})_m) is an isometry of X and kappa(xbar) = xbar. F(kappa x) = kappa'(F(x)) with
kappa'(F_ph, (F_m)) = (conj F_ph, (conj F_{-m})): f has real coefficients and is built from +, -, *, /, exp and
principal-branch log/sqrt whose arguments have Re > 0 on the domain certified in section 6 (arbmodel guards), so
f(conj z) = conj f(z) there; phi_{kappa a}(theta) = conj phi_a(theta) for real theta, hence g_m(kappa a) = conj g_{-m}(a);
d_{-m} = d_m is real and s / sigma_V is real. So kappa maps zeros of F in B_r(xbar) to zeros in B_r(xbar); by uniqueness
the zero x* = kappa x*: omega* is real and phi* is real-valued. Since a* in (l^1_nu)^18 and i omega* m a*_m =
g_m - d_m E a*_m is in l^1_nu, phi* is C^1 (indeed analytic on |Im theta| < rho0) and solves the profile equation
pointwise; omega* >= omega_bar - eta_om r > 0, so z_j(t) = phi*(omega* t + 2 pi j / N) is a real T-periodic solution of
the ring, T = 2 pi / omega*. |a*_{1,V} - abar_{1,V}| <= eta_V r / nu; the program checks |abar_{1,V}| > eta_V r / nu,
so a*_{1,V} != 0. A function with minimal period 2 pi / k (k >= 2) has a_m = 0 unless k | m; hence phi* is nonconstant
with minimal period 2 pi, each z_j has minimal period T, the solution is not synchronous for N >= 2 (that would make
phi* 2 pi / N periodic), and it is a 1-wave: z_j(t) = z_0(t + j T / N); if also z_j(t) = z_0(t + j k T / N) for all j with
k != 1 mod N, z_0 would have period (k - 1) T / N mod T, contradicting minimality.

8. What is trusted
------------------
python-flint 0.9.0 (Arb), fourier/arbmodel.py with the generated fourier/tp06_18d_arb.py (exact decimals), the strip
cover, DFT and Cauchy lemmas of fourier/fourier_eval.py, and this file. The centre (centre.py) and A_fin (numpy
double inverse) are untrusted inputs: they are exact numbers chosen by an untrusted program; their quality only
affects whether the inequalities hold.
"""
import argparse
import hashlib
import json
import math
import os
import platform
import sys
import time
from decimal import ROUND_CEILING, ROUND_FLOOR, Decimal, getcontext
from fractions import Fraction

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import flint  # noqa: E402
from flint import acb, acb_mat, arb, arb_mat, ctx, fmpq  # noqa: E402

import arbmodel as am  # noqa: E402
import centre as ct  # noqa: E402
import fourier_eval as fe  # noqa: E402

DIM = 18
IV = 0
RESULTS = os.path.join(ROOT, "results")


class ProofFailure(RuntimeError):
    """An inequality of the theorem could not be certified (the claim is NOT proved)."""


DEFAULTS = dict(
    rho0="1/4",            # nu = e^{rho0}
    rho="3/2",             # strip of the Fourier enclosures of g and J (Lemmas 1-3 of fourier_eval)
    rho2="1",              # strip of the polydisc majorant (Z2); needs rho2 > rho0
    R="1/1024",            # polydisc radius R_k (all components; scaled variables)
    L=16,                  # K' = 2K + L
    M=192,                 # DFT nodes
    prec_g=256,            # bits for g_m enclosures and Y0
    prec_J=128,            # bits for J_n enclosures
    prec_mat=128,          # bits for the Galerkin products
    theta_target="1/2",    # Neumann ratio defining m_max
    n_explicit=12,         # |n| <= n_explicit: |A_m J'_n| bounded by explicit products, else by Abar0 |J'_n|
    r_star="1e-12",        # Z2 validity radius (decimal; converted to an exact dyadic upper value)
    strip_nx=32,
    strip_rtol=3.0,
    strip_max_evals=8000,  # budget only affects how tight S is (leaves left unresolved make S looser, never wrong)
    eta=None,              # component weights (19 values: omega, then 18 components); None = all 1
)


# ------------------------------------------------------------------------------------------------ helpers
def _q(s):
    """Exact arb from a rational string 'p/q' or a dyadic decimal; refuses inexact values."""
    fr = Fraction(s)
    v = arb(fmpq(fr.numerator, fr.denominator))
    return v


def _exact_dyadic_param(s, name):
    v = _q(s)
    if not v.is_exact():
        raise ValueError(f"{name} = {s} must be an exact dyadic number")
    return v


def up(x):
    """Exact upper endpoint of a real ball (an arb with zero radius)."""
    u = x.upper()
    assert u.is_exact()
    return u


def lo(x):
    v = x.lower()
    assert v.is_exact()
    return v


def amax(a, b):
    return a if a > b else (b if b > a else up(a.union(b)))


def to_fraction(x):
    if not x.is_exact():
        raise ValueError("not exact")
    if x.is_zero():
        return Fraction(0)
    man, exp = x.man_exp()
    man, exp = int(man), int(exp)
    return Fraction(man) * (Fraction(2) ** exp)


def dec(x, direction, digits=25):
    """Decimal string rounded outward (direction 'up' or 'down') of an exact arb."""
    fr = to_fraction(x)
    getcontext().prec = digits + 10
    if fr == 0:
        return "0"
    d = Decimal(fr.numerator) / Decimal(fr.denominator)   # correctly rounded to prec digits; fix below
    q = Decimal(10) ** (d.adjusted() - digits + 1)
    v = d.quantize(q, rounding=ROUND_CEILING if direction == "up" else ROUND_FLOOR)
    fv = Fraction(v)
    # Decimal division above is rounded; enforce outwardness exactly.
    while (direction == "up" and fv < fr) or (direction == "down" and fv > fr):
        v = v + q if direction == "up" else v - q
        fv = Fraction(v)
    return str(v)


def bound_rec(x, direction="up"):
    """Record of a rigorous bound: exact hex dyadic plus an outward-rounded decimal."""
    e = up(x) if direction == "up" else lo(x)
    return {"hex": ct.dyadic_to_text(e), "dec": dec(e, direction), "approx": float(e)}


def sha256(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


class Clock:
    def __init__(self, log):
        self.t0 = time.time()
        self.last = self.t0
        self.marks = {}
        self.log = log

    def mark(self, name):
        t = time.time()
        self.marks[name] = round(t - self.last, 2)
        self.log(f"  [{name}: {t - self.last:.1f} s]")
        self.last = t


# ------------------------------------------------------------------------------------------------ the proof
def prove_centre(N, K, om_bar, A, *, N_damping=None, settings=None, log=print, centre_file=None, label=None):
    """Run the Stage E inequalities for the exact centre (om_bar, A). Returns a result dict; raises ProofFailure if an
    inequality cannot be certified. N_damping (default N) selects the damping symbol (for the negative control).
    There is deliberately no way to pass strip bounds in: every S is recomputed here from the centre."""
    st = dict(DEFAULTS)
    st.update(settings or {})
    Nd = N if N_damping is None else N_damping
    clk = Clock(log)
    lay = ct.Layout(K)
    n = lay.n
    Kp = 2 * K + int(st["L"])
    Mn = int(st["M"])
    if not Kp < Mn:
        raise ValueError("need K' < M")
    Pg, PJ, PM = int(st["prec_g"]), int(st["prec_J"]), int(st["prec_mat"])
    eta = st["eta"] or ["1"] * (DIM + 1)
    if len(eta) != DIM + 1:
        raise ValueError("eta needs 19 entries (omega first)")

    old_prec = ctx.prec
    ctx.prec = Pg
    try:
        rho0 = _exact_dyadic_param(st["rho0"], "rho0")
        rho = _exact_dyadic_param(st["rho"], "rho")
        rho2 = _exact_dyadic_param(st["rho2"], "rho2")
        Rk = _exact_dyadic_param(st["R"], "R")
        ETA = [_exact_dyadic_param(e, "eta") for e in eta]       # ETA[0] = omega, ETA[1 + k] = component k
        if not rho2 > rho0 or not rho > rho0:
            raise ValueError("need rho, rho2 > rho0")
        nu = rho0.exp()
        q = nu * (-rho).exp()
        q2 = nu * (-rho2).exp()
        if not (q < 1 and q2 < 1):
            raise ProofFailure("nu e^{-rho} or nu e^{-rho2} not < 1")
        Q2 = (1 + q2) / (1 - q2)
        tailK = 2 * q ** (Kp + 1) / (1 - q)                     # sum_{|n| > K'} q^{|n|}
        nupow = [nu ** j for j in range(Kp + 2 * K + 4)]
        om_bar = arb(om_bar)
        if not (om_bar.is_exact() and om_bar > 0):
            raise ValueError("omega_bar must be an exact positive number")
        # symmetry of the centre (section 7)
        for i in range(DIM):
            if not A[i][K].imag.is_zero():
                raise ValueError("a_0 not real")
            for m in range(1, K + 1):
                if not (A[i][K + m].real == A[i][K - m].real and (A[i][K + m].imag + A[i][K - m].imag).is_zero()):
                    raise ValueError("centre not conjugation symmetric")
                if not (A[i][K + m].real.is_exact() and A[i][K + m].imag.is_exact()):
                    raise ValueError("centre coefficients must be exact")
    finally:
        ctx.prec = old_prec

    phi = fe.TrigPoly(A)
    prm53 = am.params(53)
    prmJ = am.params(PJ)
    prmG = am.params(Pg)
    f53 = lambda z: am.f(z, prm53, prec=53)  # noqa: E731
    fG = lambda z: am.f(z, prmG, prec=Pg)  # noqa: E731

    def J53(z):
        return _flat(am.f_and_df(z, prm53, prec=53)[1])

    def JJ(z):
        return _flat(am.f_and_df(z, prmJ, prec=PJ)[1])

    skw = dict(nx=int(st["strip_nx"]), rtol=float(st["strip_rtol"]), max_evals=int(st["strip_max_evals"]))

    # ---- strip sups (always recomputed) and Fourier enclosures
    log(f"N = {N} (damping N = {Nd}), K = {K}, K' = {Kp}, M = {Mn}, rho0 = {st['rho0']}, rho = {st['rho']}, "
        f"rho2 = {st['rho2']}, R = {st['R']}")
    strip_g = fe.strip_sup(f53, phi, rho, **skw)
    log(f"  strip sup of f o phibar: max S = {float(strip_g.S_max()):.3e} ({strip_g.n_evals} boxes)")
    clk.mark("strip_g")
    strip_J = fe.strip_sup(J53, phi, rho, **dict(skw, rtol=max(skw["rtol"], 10.0), atol=1.0))
    log(f"  strip sup of Df o phibar: max S = {float(strip_J.S_max()):.3e} ({strip_J.n_evals} boxes)")
    clk.mark("strip_J")
    with fe.precision(Pg):
        A_infl = [row[:] for row in A]
        for i in range(DIM):
            A_infl[i][K] = acb(A[i][K].real + Rk * arb(0, 1), Rk * arb(0, 1))   # box of half-width >= R_k
    phi_infl = fe.TrigPoly(A_infl)
    strip_P = fe.strip_sup(f53, phi_infl, rho2, **skw)
    log(f"  polydisc sup (R = {st['R']}, rho2 = {st['rho2']}): max M = {float(strip_P.S_max()):.3e} "
        f"({strip_P.n_evals} boxes)")
    clk.mark("strip_polydisc")
    for s in (strip_g, strip_J, strip_P):
        if not s.full_strip:
            raise ProofFailure("a strip cover is not the full strip")

    enc_g = fe.fourier_coefficients(fG, phi, rho, Mn, Kp, S=strip_g, prec=Pg)
    clk.mark("dft_g")
    enc_J = fe.fourier_coefficients(JJ, phi, rho, Mn, Kp, S=strip_J, prec=PJ)
    clk.mark("dft_J")

    def Jn(nn):
        return [[enc_J.c[DIM * r + c][nn + Kp] for c in range(DIM)] for r in range(DIM)]

    J = {nn: Jn(nn) for nn in range(-Kp, Kp + 1)}
    SJ = [[enc_J.S[DIM * r + c] for c in range(DIM)] for r in range(DIM)]
    Sg = enc_g.S

    # ---- Galerkin matrix J_fin and A_fin
    ctx.prec = PM
    try:
        dm = {m: am.damping(m, N=Nd, prec=Pg) for m in range(-(Kp + 2 * K + 2), Kp + 2 * K + 3)}
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
                    Jfin[r, r] += dm[m]
        clk.mark("build_Jfin")
        Jmid = np.array([[complex(float(v.real.mid()), float(v.imag.mid())) for v in row]
                         for row in _rows(Jfin, n)])
        Ainv = np.linalg.inv(Jmid)
        Afin = acb_mat([[acb(complex(v)) for v in row] for row in Ainv])
        clk.mark("A_fin")
        Bfin = _identity(n) - Afin * Jfin
        clk.mark("product A_fin J_fin")
    finally:
        ctx.prec = old_prec

    ctx.prec = Pg
    try:
        # weights per (component, mode)
        comp_of = [None] + [k for k in range(DIM) for _ in range(lay.L)]          # None = omega / phase
        mode_of = [0] + [m for _ in range(DIM) for m in range(-K, K + 1)]
        WROW = _weight_rows(lay, nupow)            # arb_mat (19 x n): row c = nu^{|m|} on the entries of component c

        # ---- Z1 finite rows x finite columns
        Babs = _abs_mat(Bfin)
        colsum = WROW * Babs                       # (19 x n): weighted column sums per output component
        Z1_ff = _block_colsup(colsum, comp_of, mode_of, nupow)      # 19 x 19 nested lists of arb
        clk.mark("Z1 finite")

        # ---- |A_fin| and the N0 / N1 block norms (Z2) ------------------------------------------------------
        Aabs = _abs_mat(Afin)
        colA = WROW * Aabs
        N0 = _block_colsup(colA, comp_of, mode_of, nupow)            # column omega here = the phase input
        N1 = _block_colsup(colA, comp_of, mode_of, nupow, scale_by_mode=True)

        # ---- finite rows x tail columns
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
        AWabs = _abs_mat(AW)
        colW = WROW * AWabs
        Z1_ft = [[arb(0)] * (DIM + 1) for _ in range(DIM + 1)]
        for t, (k, mp) in enumerate(cols_exact):
            for c in range(DIM + 1):
                v = up(colW[c, t] / nupow[abs(mp)])
                Z1_ft[c][1 + k] = amax(Z1_ft[c][1 + k], v)
        # majorant columns at |m'| = K + L + 1 (valid for all larger |m'|, see section 5)
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
                v = up(colWb[c, t] / nupow[abs(mp)])
                Z1_ft[c][1 + k] = amax(Z1_ft[c][1 + k], v)
        clk.mark("Z1 finite x tail")

        # ---- tail resolvents -------------------------------------------------------------------------------
        J0hat = acb_mat([[acb(J[0][r][c].real.mid()) for c in range(DIM)] for r in range(DIM)])
        Jp = {}
        for nn in range(-Kp, Kp + 1):
            Jp[nn] = acb_mat([[J[nn][r][c] - (J0hat[r, c] if nn == 0 else 0) for c in range(DIM)]
                              for r in range(DIM)])
        with fe.precision(PM):
            tail = _tail_bounds(K, Kp, om_bar, J0hat, Jp, dm, Nd, st, nupow, log)
        clk.mark("tail resolvents")
        Abar0, Abar1, Cn = tail["Abar0"], tail["Abar1"], tail["C"]

        # T_{ck} = sum_n C_n nu^{|n|} + Abar0 S_J tailK
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

        # ---- Z1 assembly ----------------------------------------------------------------------------------
        Z1_rows = []
        for c in range(DIM + 1):
            s = arb(0)
            for cp in range(DIM + 1):
                b = amax(Z1_ff[c][cp], Z1_ft[c][cp])
                if c >= 1 and cp >= 1:
                    b = b + T[c - 1][cp - 1]
                s += ETA[cp] * b
            Z1_rows.append(up(s / ETA[c]))
        Z1 = Z1_rows[0]
        for v in Z1_rows[1:]:
            Z1 = amax(Z1, v)
        log(f"  Z1 = {float(Z1):.6e}  (finite x finite max {float(max(max(r) for r in _f(Z1_ff))):.3e}, "
            f"finite x tail max {float(max(max(r) for r in _f(Z1_ft))):.3e}, tail rows max row "
            f"{max(sum(float(x) for x in row) for row in T):.3e})")
        clk.mark("Z1")

        # ---- Y0 -----------------------------------------------------------------------------------------
        Ffin = acb_mat(n, 1)
        s = acb(0)
        for m in range(-K, K + 1):
            s += A[IV][m + K]
        Ffin[0, 0] = s - acb(ct.level_exact())
        for i in range(DIM):
            for m in range(-K, K + 1):
                v = acb(0, m) * om_bar * A[i][m + K] - enc_g.c[i][m + Kp]
                if i == IV:
                    v += dm[m] * A[i][m + K]
                Ffin[lay.idx(i, m), 0] = v
        AF = Afin * Ffin
        Y0c = [arb(0)] * (DIM + 1)
        for r in range(n):
            c = 0 if comp_of[r] is None else 1 + comp_of[r]
            Y0c[c] = Y0c[c] + AF[r, 0].abs_upper() * nupow[abs(mode_of[r])]
        Y0_fin_max = max(float(v) for v in Y0c)
        Ab0 = arb_mat(Abar0)
        for m in range(K + 1, Kp + 1):                    # K < |m| <= K'
            Am = tail["A_explicit"].get(m)
            for sgn in (1, -1):
                mm = sgn * m
                gv = acb_mat([[enc_g.c[k][mm + Kp]] for k in range(DIM)])
                if Am is not None:                        # A_{-m} = conj(A_m)
                    v = (Am if sgn == 1 else Am.conjugate()) * gv
                    vals = [v[c, 0].abs_upper() for c in range(DIM)]
                else:                                     # m > m_max: |A_m g_m| <= Abar0 |g_m|
                    v = Ab0 * arb_mat([[gv[k, 0].abs_upper()] for k in range(DIM)])
                    vals = [up(v[c, 0]) for c in range(DIM)]
                for c in range(DIM):
                    Y0c[1 + c] = Y0c[1 + c] + vals[c] * nupow[m]
        for c in range(DIM):
            s = arb(0)
            for k in range(DIM):
                s += Abar0[c][k] * Sg[k]
            Y0c[1 + c] = Y0c[1 + c] + s * tailK
        Y0 = arb(0)
        for c in range(DIM + 1):
            Y0 = amax(Y0, up(Y0c[c] / ETA[c]))
        log(f"  Y0 = {float(Y0):.6e}  (finite part max {Y0_fin_max:.3e})")
        clk.mark("Y0")

        # ---- Z2 -----------------------------------------------------------------------------------------
        Mk = strip_P.S
        r_star = up(arb(st["r_star"]) if not isinstance(st["r_star"], arb) else st["r_star"])
        for k in range(DIM):
            if not ETA[1 + k] * r_star < Rk:
                raise ProofFailure("r_* too large for the polydisc radius")
        sj = [ETA[1 + j] / (Rk - ETA[1 + j] * r_star) for j in range(DIM)]
        P = arb(1)
        for j in range(DIM):
            P *= Rk / (Rk - ETA[1 + j] * r_star)
        ssum = sum(sj, arb(0))
        ssq = sum((x * x for x in sj), arb(0))
        Wk = [up(Mk[k] * Q2 * P * (ssum * ssum + ssq)) for k in range(DIM)]
        Z2_rows = []
        for c in range(DIM + 1):
            s = arb(0)
            for k in range(DIM):
                n1 = N1[c][1 + k] + (Abar1[c - 1][k] if c >= 1 else 0)
                n0 = N0[c][1 + k] + (Abar0[c - 1][k] if c >= 1 else 0)
                s += 2 * ETA[0] * ETA[1 + k] * n1 + n0 * Wk[k]
            Z2_rows.append(up(s / ETA[c]))
        Z2 = Z2_rows[0]
        for v in Z2_rows[1:]:
            Z2 = amax(Z2, v)
        log(f"  Z2 = {float(Z2):.6e} (valid for r <= r_* = {float(r_star):.3e}); max M_k = {float(strip_P.S_max()):.3e}")
        clk.mark("Z2")

        # ---- radii polynomial ---------------------------------------------------------------------------
        res = _radii(Y0, Z1, Z2, r_star)
        if res is None:
            raise ProofFailure(f"radii polynomial not negative: Y0 = {float(Y0):.3e}, Z1 = {float(Z1):.6f}, "
                               f"Z2 = {float(Z2):.3e}, r_* = {float(r_star):.3e}")
        r_lo, r_hi = res
        log(f"  p(r) < 0 and Z1 + Z2 r < 1 certified at r_lo = {float(r_lo):.4e} and r_hi = {float(r_hi):.4e}")

        # ---- corollaries ---------------------------------------------------------------------------------
        dom = ETA[0] * r_lo
        om_ball = om_bar + up(dom) * arb(0, 1)            # contains [om_bar - dom, om_bar + dom]
        if not om_ball > 0:
            raise ProofFailure("omega not certainly positive")
        Tball = 2 * arb.pi() / om_ball
        a1V = A[IV][K + 1]
        a1_margin = a1V.abs_lower() - ETA[1 + IV] * r_lo / nu
        if not a1_margin > 0:
            raise ProofFailure("|abar_{1,V}| > eta_V r / nu not certified")
        log(f"  T in [{dec(lo(Tball), 'down', 20)}, {dec(up(Tball), 'up', 20)}] ms; |a_1V| margin {float(a1_margin):.3e}")
        clk.mark("corollaries")

        out = dict(
            N=N, N_damping=Nd, K=K, Kprime=Kp, M=Mn, label=label,
            omega_bar=ct.dyadic_to_text(om_bar),
            T_ms={"lower": bound_rec(Tball, "down"), "upper": bound_rec(Tball, "up")},
            omega={"lower": bound_rec(om_ball, "down"), "upper": bound_rec(om_ball, "up")},
            Y0=bound_rec(Y0), Z1=bound_rec(Z1), Z2=bound_rec(Z2), r_star=bound_rec(r_star),
            r_existence=bound_rec(r_lo), r_uniqueness=bound_rec(r_hi),
            p_at_r_existence=bound_rec(Y0 + (Z1 - 1) * r_lo + Z2 * r_lo * r_lo / 2),
            p_at_r_uniqueness=bound_rec(Y0 + (Z1 - 1) * r_hi + Z2 * r_hi * r_hi / 2),
            contraction_at_r_uniqueness=bound_rec(Z1 + Z2 * r_hi),
            abs_a1V_lower=bound_rec(a1V.abs_lower(), "down"), a1V_margin=bound_rec(a1_margin, "down"),
            Z1_by_output_component=[float(v) for v in Z1_rows],
            Y0_by_output_component=[float(up(v)) for v in Y0c],
            Z2_by_output_component=[float(v) for v in Z2_rows],
            tail=dict(m_max=tail["m_max"], theta=float(up(tail["theta"])),
                      Abar0_max=float(max(max(r) for r in _f(Abar0))),
                      Abar1_max=float(max(max(r) for r in _f(Abar1))),
                      T_max_row_sum=max(sum(float(x) for x in row) for row in T)),
            strips=dict(
                g=_strip_rec(strip_g), J=_strip_rec(strip_J), polydisc=_strip_rec(strip_P),
                S_source_g=enc_g.S_source, S_source_J=enc_J.S_source),
            settings={k: (v if not isinstance(v, arb) else str(v)) for k, v in st.items()},
            timings_s=clk.marks, wall_s=round(time.time() - clk.t0, 2),
        )
    finally:
        ctx.prec = old_prec
    return out


# ------------------------------------------------------------------------------------------------ pieces
def _f(M):
    return [[float(x) for x in row] for row in M]


def _flat(Jm):
    return [Jm[i, j] for i in range(DIM) for j in range(DIM)]


def _rows(M, n):
    return M.tolist()


def _identity(n):
    I = acb_mat(n, n)
    for i in range(n):
        I[i, i] = acb(1)
    return I


def _abs_mat(M):
    """arb_mat of exact upper bounds |M_ij|."""
    rows = M.tolist()
    return arb_mat([[v.abs_upper() for v in row] for row in rows])


def _weight_rows(lay, nupow):
    """(19 x n) arb_mat: row 0 picks the omega/phase entry (weight 1), row 1 + k has nu^{|m|} on (k, m)."""
    K = lay.K
    W = arb_mat(DIM + 1, lay.n)
    W[0, 0] = arb(1)
    for k in range(DIM):
        for m in range(-K, K + 1):
            W[1 + k, lay.idx(k, m)] = up(nupow[abs(m)])
    return W


def _block_colsup(colsum, comp_of, mode_of, nupow, scale_by_mode=False):
    """B[c][c'] = max over columns j of input component c' of colsum[c, j] / nu^{|m_j|} (times |m_j| if asked)."""
    nr = colsum.nrows()
    ncol = colsum.ncols()
    B = [[arb(0)] * (DIM + 1) for _ in range(nr)]
    for j in range(ncol):
        cp = 0 if comp_of[j] is None else 1 + comp_of[j]
        m = mode_of[j]
        for c in range(nr):
            v = colsum[c, j] / nupow[abs(m)]
            if scale_by_mode:
                v = v * abs(m)
            B[c][cp] = amax(B[c][cp], up(v))
    return B


def _tail_bounds(K, Kp, om_bar, J0hat, Jp, dm, Nd, st, nupow, log):
    """Section 4: entrywise sup bounds of |A_m|, |m A_m| and |A_m J'_n| over all |m| > K."""
    I = _identity(DIM)
    E = acb_mat(DIM, DIM)
    E[IV, IV] = acb(1)
    c = am.coupling(N=Nd) if Nd > 1 else acb(0)
    dmax = up((4 * c).real) if Nd > 1 else arb(0)
    absJ0 = _abs_mat(J0hat)
    G0 = arb_mat([[absJ0[r, k] + (dmax if (r == IV and k == IV) else 0) for k in range(DIM)] for r in range(DIM)])
    rowmax = arb(0)
    for r in range(DIM):
        rowmax = amax(rowmax, up(sum((G0[r, k] for k in range(DIM)), arb(0))))
    theta_t = _q(st["theta_target"])
    # least m_max with Y = om_bar (m_max + 1) >= rowmax / theta_t
    m_max = max(K + 1, int(math.ceil(float(rowmax / theta_t / om_bar))) + 1)
    while not (om_bar * (m_max + 1) * theta_t >= rowmax):
        m_max += 1
    Y = om_bar * (m_max + 1)
    G = arb_mat([[G0[r, k] / Y for k in range(DIM)] for r in range(DIM)])
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
    absJp = {nn: _abs_mat(M) for nn, M in Jp.items()}
    C = {}
    for nn in Jp:                                   # Neumann range m > m_max: |A_m J'_n| <= |A_m| |J'_n|
        P = arb_mat(SG) * absJp[nn]
        C[nn] = [[up(P[r, k] / Y) for k in range(DIM)] for r in range(DIM)]
    log(f"  tail: Neumann for m > m_max = {m_max} (theta = {float(theta):.3f}); explicit inverses for {K} < m <= {m_max}")
    A_explicit = {}
    Jconj = {nn: Jp[nn].conjugate() for nn in Jp if abs(nn) <= n_ex}
    for m in range(K + 1, m_max + 1):
        Mm = I * acb(0, m) * om_bar - J0hat
        Mm[IV, IV] += dm[m] if m in dm else am.damping(m, N=Nd, prec=ctx.prec)
        try:
            Am = Mm.inv()
        except ZeroDivisionError:
            raise ProofFailure(f"A_m not certainly invertible at m = {m}")
        if m <= Kp:
            A_explicit[m] = Am
        Aa = _abs_mat(Am)                           # |A_{-m}| = |conj A_m| = |A_m|
        for r in range(DIM):
            for k in range(DIM):
                Abar0[r][k] = amax(Abar0[r][k], Aa[r, k])
                Abar1[r][k] = amax(Abar1[r][k], up(Aa[r, k] * m))
        # explicit products for |n| <= n_ex, for m and for -m: |A_{-m} J'_n| = |conj(A_m) J'_n| = |A_m conj(J'_n)|
        for nn in Jconj:
            for Pm in (Am * Jp[nn], Am * Jconj[nn]):
                Pa = _abs_mat(Pm)
                Cn = C[nn]
                for r in range(DIM):
                    for k in range(DIM):
                        if Pa[r, k] > Cn[r][k]:
                            Cn[r][k] = up(Pa[r, k])
    # n_ex < |n| <= K': |A_m J'_n| <= Abar0 |J'_n| for every |m| > K (Abar0 is now the sup over all |m| > K)
    Ab = arb_mat(Abar0)
    for nn in Jp:
        if abs(nn) > n_ex:
            P = Ab * absJp[nn]
            Cn = C[nn]
            for r in range(DIM):
                for k in range(DIM):
                    Cn[r][k] = amax(Cn[r][k], up(P[r, k]))
    return dict(Abar0=Abar0, Abar1=Abar1, C=C, m_max=m_max, theta=theta, A_explicit=A_explicit)


def _radii(Y0, Z1, Z2, r_star):
    """Exact dyadic r_lo <= r_hi <= r_* with p(r) < 0 and Z1 + Z2 r < 1 both certified in Arb at r_lo and at r_hi
    (floats only propose the two radii). Returns None if r_lo fails."""
    y, z1, z2 = float(up(Y0)), float(up(Z1)), float(up(Z2))
    if not z1 < 1 or not z2 > 0:
        return None
    a, b = z2 / 2, 1 - z1
    disc = b * b - 4 * a * y
    if disc <= 0:
        return None
    s = math.sqrt(disc)
    r1 = 2 * y / (b + s)                      # small root of a r^2 - b r + y
    r2 = (b + s) / (2 * a)                    # large root
    if not r1 > 0:
        return None

    def ok(r):
        p = Y0 + (Z1 - 1) * r + Z2 * r * r / 2
        return bool(p < 0 and Z1 + Z2 * r < 1 and r <= r_star and r > 0)

    rl = arb(r1 * (1 + 2.0 ** -20))
    if not ok(rl):
        return None
    rh = arb(min(r2 * (1 - 2.0 ** -20), float(r_star)))
    if rh > r_star:
        rh = r_star
    if not ok(rh):
        rh = rl
    return rl, rh


def _strip_rec(s):
    return dict(S_max=float(s.S_max()), n_evals=s.n_evals, n_leaves=s.n_leaves, n_nonfinite_evals=s.n_nonfinite_evals,
                n_unresolved=s.n_unresolved, full_strip=s.full_strip, rho=str(s.rho), prec=s.prec,
                params=s.params, seconds=round(s.seconds, 2), phi_digest=s.phi_digest,
                S_over_L_max=max(s.ratio()))


# ------------------------------------------------------------------------------------------------ driver
SOURCES = ["fourier/existence.py", "fourier/centre.py", "fourier/arbmodel.py", "fourier/fourier_eval.py",
           "fourier/tp06_18d_arb.py", "model/tp06_18d.py", "model/scales.txt"]


def prove(N, K=32, settings=None, log=print, write=True):
    path = ct.centre_path(N, K)
    Nf, Kf, om, A, rec = ct.load(path)
    if (Nf, Kf) != (N, K):
        raise ValueError("centre file does not match N, K")
    res = prove_centre(N, K, om, A, settings=settings, log=log, centre_file=path)
    res.update(
        status="computed; awaiting adversarial review",
        theorem=theorem_text(N),
        centre_file=os.path.relpath(path, ROOT), centre_sha256=sha256(path),
        sources_sha256={p: sha256(os.path.join(ROOT, p)) for p in SOURCES},
        python_flint=flint.__version__, FLINT=flint.__FLINT_VERSION__, python=platform.python_version(),
        machine=platform.machine(), date=time.strftime("%Y-%m-%d"),
        comparison=comparisons(N, res),
    )
    if write:
        os.makedirs(RESULTS, exist_ok=True)
        out = os.path.join(RESULTS, f"fourier-existence-N{N}.json")
        with open(out, "w") as fh:
            json.dump(res, fh, indent=1)
            fh.write("\n")
        log(f"  wrote {out}")
    return res


def theorem_text(N):
    ring = "the single cell (N = 1)" if N == 1 else f"the ring of N = {N} cells (c = N^2 / 64000 per ms)"
    return (f"For {ring} of Erhardt's 18-state TP06 endocardial model at G_Ks = 0.0275, there are omega* > 0 and a real "
            "2 pi periodic phi*, analytic on |Im theta| < rho0, such that z_j(t) = phi*(omega* t + 2 pi j / N) solves "
            "the ring ODE and phi*_V(0) = s (s the double nearest 0.2 mV); (omega*, Fourier coefficients of phi*) is "
            "the only zero of F in the ball of radius r_uniqueness about the centre in X = C x (l^1_nu)^18 (norm in "
            "the module docstring) and lies within r_existence of it; T = 2 pi / omega* lies in T_ms; phi* has minimal "
            "period 2 pi (a*_{1,V} != 0), so the solution has minimal period T"
            + (", is not synchronous, and is a rotating 1-wave." if N > 1 else "."))


def comparisons(N, res):
    """Interval overlaps with the other pipeline / CAPD records (consistency checks, not part of the proof)."""
    lo_ = Fraction(res["T_ms"]["lower"]["dec"])
    hi_ = Fraction(res["T_ms"]["upper"]["dec"])
    refs = {1: [("other pipeline", "53.58551856", "53.58552012")],
            8: [("other pipeline", "53.58795907", "53.58798288")],
            16: [("other pipeline", "53.58805554", "53.58808267")]}
    out = []
    for name, a, b in refs.get(N, []):
        A_, B_ = Fraction(a), Fraction(b)
        out.append(dict(reference=name, interval=[a, b], overlaps=bool(lo_ <= B_ and A_ <= hi_),
                        inside=bool(A_ <= lo_ and hi_ <= B_)))
    if N == 1:
        capd = os.path.join(RESULTS, "cell-gks0.0275.json")
        if os.path.exists(capd):
            with open(capd) as fh:
                pe = json.load(fh)["verifier"]["period_exact"]
            A_, B_ = Fraction(float.fromhex(pe[0])), Fraction(float.fromhex(pe[1]))
            out.append(dict(reference="results/cell-gks0.0275.json (CAPD, verified)", interval=pe,
                            overlaps=bool(lo_ <= B_ and A_ <= hi_), inside=bool(A_ <= lo_ and hi_ <= B_)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--N", default="1,8,16,32,64")
    ap.add_argument("--K", type=int, default=32)
    a = ap.parse_args()
    for N in [int(v) for v in a.N.split(",")]:
        try:
            res = prove(N, a.K)
            print(f"N = {N}: PROVED (pending review): T in [{res['T_ms']['lower']['dec']}, "
                  f"{res['T_ms']['upper']['dec']}], r = {res['r_existence']['approx']:.3e}, wall {res['wall_s']} s")
        except ProofFailure as e:
            print(f"N = {N}: FAILED: {e}")


if __name__ == "__main__":
    main()
