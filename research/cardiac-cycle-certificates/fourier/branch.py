"""Rec 2: a certified branch of the single-cell periodic orbit over G_Ks intervals toward Erhardt's Hopf point (Arb).

Status: computed; awaiting adversarial review. Nothing written by this program is "verified" until a second reading
has checked the argument below against the code. Section numbers "E.n" refer to the docstring of existence.py
(Stage E), whose machinery is reused here; what differs from Stage E is stated in full.

0. Problem
----------
Single cell (N = 1), scaled variables z = x / sigma, f(z; g) = arbmodel.f with g_Ks = g. G_Ks enters the reference
model only through i_Ks = g_Ks Xs^2 (V - E_Ks) in dV/dt (model/tp06_18d.py, lines 49 and 97), so
    f(z; g) = f(z; g0) + (g - g0) f1(z),    f1 = df/dg (nonzero only in the V row), for all g, g0.        (0.1)
For a closed parameter interval G = [g_lo, g_hi] (exact decimals) we look, for every g in G, for omega > 0 and a
2 pi periodic phi with omega phi' = f(phi; g). Unknowns x = (omega, a), a = (a_m)_{m in Z}, a_m in C^18, and
    F_ph(x)   = a_{1,V} - a_{-1,V}                     (phase condition, see below)
    F_m(x; g) = i omega m a_m - g_m(a; g),   g(a; g) = f(phi_a; g), g_m its Fourier coefficients.
Phase condition. Stage E fixes the phase by V(0) = s = 0.2 mV. Along the branch the orbit's V range shrinks toward
the equilibrium; it no longer reaches 0.2 mV for G_Ks above about 0.02771 (float continuation, section 9), and the
level condition degenerates before that (||A|| grows by 2.5 between 0.0275 and 0.0277). The functional used here is
C-linear and vanishes on real profiles exactly when Im a_{1,V} = 0: theta = 0 is where the first V harmonic is at its
maximum. It is non-degenerate as long as a_{1,V} != 0, which section 7 proves on every piece. The period does not
depend on the phase condition, so periods are directly comparable with Stage E and the CAPD record.

1. Spaces and norms: as E.1, X = C x (l^1_nu)^18, ||x|| = max(|omega| / eta_om, max_k ||a_k||_nu / eta_k), with exact
dyadic weights eta chosen per piece (floating-point optimisation, section 8; only their exactness matters).

2. Centre and A: as E.2, with the centre xbar = (omega_bar, abar) computed (untrusted, section 8) at an exact decimal
g_c in G (the midpoint), exactly symmetric (abar_{-m} = conj abar_m, a_0 real) and with Im abar_{1,V} = 0 exactly, so
F_ph(xbar) = 0. The Galerkin matrix J_fin is the Stage E one with the phase row replaced by the functional above
(entries +1 at (V, 1) and -1 at (V, -1)); its J_n entries are enclosures over ALL g in G (section 3). A_fin is the
double inverse of its midpoint, A_m (|m| > K) the Stage E tail inverses built from J0hat, the exact midpoint of the
enclosure [J_0] (which now also contains the g-width). A does not depend on g.

3. Uniform bounds (Theorem B1)
------------------------------
The parameter enters every model evaluation as an Arb ball containing [g_lo, g_hi] (arbmodel.params(g_Ks=(lo, hi)),
the interval hull of the two exact decimals). Every Arb evaluation of f, Df or D^2 f on a box therefore contains the
values for every point of the box and EVERY g in G. Consequently:
  * the strip sups S_g, S_J (fourier_eval Lemma 1) bound sup over the strip and over g in G; the DFT enclosures
    (Lemma 3, Theorem 4) of g_m and J_n contain the true coefficients for every g in G (for each fixed g, f(.; g)
    o phibar is holomorphic near the strip with the same S, so the aliasing bound holds for each g);
  * Y0 (E.5, finite part plus tails, with the phase row as above) bounds sup_{g in G} ||A F(xbar; g)||;
  * Z1 (E.5) bounds sup_{g in G} ||I - A DF(xbar; g)||: the finite block I - A_fin J_fin is formed with the interval
    J_fin; the tail rows use A_m (i omega_bar m - J0hat) = I and J'_0 = [J_0] - J0hat, which contains J_0(g) - J0hat
    for every g; the finite-rows x tail-columns block uses [J_n] or the strip majorant, which hold for every g. The
    phase functional does not touch modes |m'| > K (K >= 1), so its tail-column entries are 0 (Stage E has 1 there).
  * Z2 (section 4) holds for every g in G.
For each fixed g in G define T_g(x) = x - A F(x; g). As in E.3: if p(r) = Y0 + (Z1 - 1) r + Z2 r^2 / 2 < 0 and
Z1 + Z2 r < 1 at r = r_lo, and at r = r_hi <= r_* (both certified in Arb, existence._radii), then for every g in G,
T_g maps B_{r_lo}(xbar) into itself, is a (Z1 + Z2 r_hi)-contraction on B_{r_hi}(xbar), and F(.; g) has exactly one
zero x*(g) in B_{r_hi}(xbar), which lies in B_{r_lo}(xbar).

4. Z2 from second derivatives (Lemma B2; replaces E.6)
-----------------------------------------------------
Stage E bounds D^2 g by Cauchy's inequality on an 18-dimensional polydisc of radius R = 2^-10, which costs a factor
(18 / R)^2 and gives Z2 = 6.4e10: then the radii polynomial needs Y0 < 5e-12, and since the parameter width makes
Y0 about ||dx/dg|| (g_hi - g_lo) / 2 with ||dx/dg|| about 1.8e3 (eta = 1), pieces would be 6e-15 wide. Here the
derivative of Dg is bounded through the Hessian of f itself:
  Data. Radii R_i > 0 (exact dyadics) and a closed strip |Im theta| <= rho2, rho2 > rho0. A trigonometric polynomial
  family Phi (TrigPoly with ball coefficients) that contains phibar, with the constant coefficient of component i
  inflated by the complex box of half-width R_i (so Phi(theta) contains phibar(theta) + w for |w_i| <= R_i). An Arb
  evaluation of f and of its Hessian H_{kjl} = d^2 f_k / dz_j dz_l by second-order forward-mode dual numbers (class
  Hess below; every intermediate is checked finite and every log/sqrt argument is certified in Re > 0, so a finite
  result certifies that every intermediate of the expression is holomorphic there; contract of fourier_eval) over a
  full cover of the strip rectangle (fourier_eval.strip_sup, Lemma 1), with g the parameter interval of the group.
  Result: MH_{kjl} >= sup |H_{kjl}(phibar(theta) + w; g)| over |Im theta| <= rho2, |w_i| <= R_i, g in G, and f(.; g)
  holomorphic on an open set U containing that compact set, for each g in G.
  Claim. For a in (l^1_nu)^18 with t_i := ||a_i - abar_i||_nu < R_i, and each g in G:
    (a) g(a; g) and each composite J_{kj} o phi_a, H_{kjl} o phi_a lie in l^1_nu, and
        ||H_{kjl} o phi_a||_nu <= MH_{kjl} Q2 P(t),  Q2 = (1 + q2) / (1 - q2), q2 = nu e^{-rho2}, P(t) = prod_i R_i / (R_i - t_i);
    (b) a -> J_{kj} o phi_a is Frechet differentiable into l^1_nu with derivative h -> sum_l (H_{kjl} o phi_a) * h_l
        (* the convolution product), and Dg(a; g) y = ([sum_j (J_{kj} o phi_a) * y_j])_k.
  Proof. As E.6 (iii), applied to the holomorphic functions H_{kjl}(.; g) and J_{kj}(.; g) instead of f_k: for theta in
  the strip, w -> H_{kjl}(phibar(theta) + w) is holomorphic on a neighbourhood of the closed polydisc |w_i| <= R_i, so its
  Taylor coefficients c_alpha(theta) satisfy |c_alpha(theta)| <= MH R^{-alpha} (Cauchy), are holomorphic and 2 pi
  periodic near the strip, so (fourier_eval Lemma 2) ||c_alpha||_nu <= MH R^{-alpha} Q2; with h = a - abar,
  sum_alpha c_alpha h^alpha converges absolutely in the Banach algebra l^1_nu (dominated by MH Q2 prod (1 - t_i/R_i)^{-1})
  and, for real theta (|h_i(theta)| <= t_i < R_i), pointwise to H_{kjl}(phi_a(theta)); uniform convergence identifies
  the l^1_nu sum with the composite. This gives (a). For (b), the same power series for J_{kj} is an analytic map of h
  on the polydisc-ball, differentiated termwise; its derivative in direction h_l is the series of d_l J_{kj} = H_{kjl},
  i.e. (H_{kjl} o phi_a) * h_l. The formula for Dg is the same statement one order lower (series of f_k). QED.
  Z2. For x = xbar + delta in B_{r*}(xbar) (||delta a_l|| <= eta_l r, |delta_om| <= eta_om r), ||y|| <= 1, every g in G:
    (DF(x; g) - DF(xbar; g)) y = i m (y_om delta a + delta_om y_a) - (Dg(abar + delta a; g) - Dg(abar; g)) y_a.
  The first term is bounded exactly as in E.6 (iv) (N1 + Abar1). For the second, by (b) and the mean value
  inequality in l^1_nu along the segment abar + s delta a (which stays in the polydisc-ball since eta_l r* < R_l),
    ||[(Dg(abar + delta a) - Dg(abar)) y_a]_k||_nu <= sum_{j,l} sup_s ||H_{kjl} o phi_{abar + s delta a}||_nu ||delta a_l|| ||y_j||
                                               <= r W_k,   W_k := Q2 P(eta r*) sum_{j,l} eta_j eta_l MH_{kjl}.
  So, with N0, N1, Abar0, Abar1 as in E.6,
    Z2 := max_c (1/eta_c) sum_k [ 2 eta_om eta_k (N1 + Abar1)_{ck} + (N0 + Abar0)_{ck} W_k ],
  the same formula as Stage E with W_k replaced. R_i only needs to exceed eta_i r*, so it can be small, and MH is then
  close to the Hessian along the orbit (the float estimate at g = 0.0275 gives Z2 about 200 with optimised eta).
  The polydisc cover is computed once per group of pieces, for a family Phi whose coefficient balls contain every
  centre of the group (checked with acb.contains) and with g the hull of the group's intervals.

5. Continuity in g and gluing (Theorem B3)
------------------------------------------
On a piece G: by (0.1), F(x; g) - F(x; g') = (g - g') F1(x), F1(x) = (0, (-[f1 o phi_a]_m)_m), and f1 = (f(.; g_hi) -
f(.; g_lo)) / (g_hi - g_lo) is holomorphic on the same domain U, so by the argument of Lemma B2(a) (one order lower)
sup_{x in B_{r_hi}} ||A F1(x)|| =: L < inf (A is bounded on X: A_fin is a matrix and sup_{|m|>K} |A_m| <= Abar0).
Hence ||T_g(x) - T_g'(x)|| <= L |g - g'| uniformly on the ball, and with kappa = Z1 + Z2 r_hi < 1,
    ||x*(g) - x*(g')|| = ||T_g(x*(g)) - T_g'(x*(g'))|| <= L |g - g'| + kappa ||x*(g) - x*(g')||,
so g -> x*(g) is Lipschitz on G (uniform contraction principle); in particular omega*(g) and T(g) = 2 pi / omega*(g)
are continuous. (By the implicit function theorem x* is even real analytic in g, not used.)
Gluing. Pieces P_i = [lo_i, hi_i] with lo_{i+1} < hi_i (an overlap interval O_i = [lo_{i+1}, hi_i]). The program checks,
in Arb, that the existence ball of piece i lies inside the uniqueness ball of piece i+1:
    ||xbar_i - xbar_{i+1}||_{eta(i+1)} + r_lo(i) max_c (eta_c(i) / eta_c(i+1)) <= r_hi(i+1)
(the norm of the exact difference of the two centres, in the weights of piece i+1; the max converts piece i's norm).
Then for every g in O_i, x*_i(g) is a zero of F(.; g) in the uniqueness ball of piece i+1, so x*_i(g) = x*_{i+1}(g).
The map g -> x*(g), defined piecewise, is therefore single valued and continuous on the union [lo_1, hi_last]: one
connected curve of real periodic orbits.

6. Stability along the branch (pointwise only)
----------------------------------------------
fourier/stability.py (Stage S) certifies, for one zero x* with a radius r = ||x* - xbar||, that every nontrivial
Floquet multiplier has modulus <= e^{-delta T}. It accepts an input dictionary, so it is run here with J enclosures
taken over the parameter interval; but its perturbation term eps (Lemma 4.1 of LEMMAS-stability.md: Cauchy, M_k / R
times (P - 1), linear in r / R) must be far below the margin delta (about 4e-5), while on a piece r_lo is
||dx/dg|| (g_hi - g_lo) / 2, about 1e-3 in these units: the uniform run cannot close (recorded per group as an
attempt). What is run instead: at selected exact points g_s, a point proof (this program with g_lo = g_hi = g_s,
which is Stage E's theorem at g_s with the Fourier phase condition and the Hessian Z2), whose r_lo is at the level of
the Galerkin truncation, then Stage S with that r and delta chosen per point from the float leading exponent. These
give stability at those points only. What uniform stability on a piece would need: an eps for the Hill operator that
is of the size of the true variation of J along the piece (about |H| ||dx/dg|| |g - g_c|, already 0.1 for 1e-6
wide pieces) is still 2e3 times the margin, so either pieces about 1e-10 wide, or a perturbation bound for the
critical Floquet exponents that uses the structure (the exponent moves by d mu/dg |g - g_c|, small) rather than the
norm of the perturbation.

7. Real solution, period, phase (as E.7, with the new phase functional)
----------------------------------------------------------------------
kappa(omega, a) = (conj omega, (conj a_{-m})_m) is an isometry of X, kappa(xbar) = xbar, and F(kappa x; g) =
kappa'(F(x; g)) with kappa'(F_ph, (F_m)) = (-conj F_ph, (conj F_{-m})) (F_ph(kappa x) = conj a_{-1,V} - conj a_{1,V}); g is
real, so the E.7 argument (f(conj z; g) = conj f(z; g) pointwise on the certified domain) holds for each g in G.
Hence x*(g) = kappa x*(g) by uniqueness: omega* real, phi* real, and Im a*_{1,V} = 0. The program checks
|abar_{1,V}| > eta_V r_lo / nu, so a*_{1,V} != 0 for every g in G: phi* has minimal period 2 pi and the solution
z(t) = phi*(omega* t) has minimal period T = 2 pi / omega*, with T in [2 pi / (omega_bar + eta_om r_lo),
2 pi / (omega_bar - eta_om r_lo)] for every g in G.

8. Untrusted inputs
-------------------
Centres (float Galerkin-Newton with the Fourier phase, continuation in g, then an Arb chord refinement at the exact
decimal g_c, aliasing ignored), A_fin, the weights eta, r_*, R_i and the piece boundaries are chosen by floating-point
code; they are exact numbers whose quality only decides whether the inequalities hold.

9. Float exploration (non-rigorous, `explore`)
-----------------------------------------------
Galerkin-Newton continuation in g with the Fourier phase, Hill-matrix Floquet exponents, ||A||, ||dx/dg|| and the
predicted admissible half-width (1 - Z1)^2 / (2 Z2 ||dx/dg||) from float block norms and Hessians. It locates the
branch; it is not part of any proof.

Trusted: python-flint 0.9.0 (Arb); fourier/arbmodel.py and the generated tp06_18d_arb.py; fourier_eval.py (Lemmas
1-3); the functions of existence.py called here (_tail_bounds, _block_colsup, _weight_rows, _abs_mat, _identity,
_radii, amax, up, lo, the Stage E docstring sections reused above); this file (Hess, prove_piece, glue).
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

import flint  # noqa: E402
from flint import acb, acb_mat, arb, arb_mat, ctx, fmpq  # noqa: E402

import arbmodel as am  # noqa: E402
import centre as ct  # noqa: E402
import existence as ex  # noqa: E402
import fourier_eval as fe  # noqa: E402
from tp06_18d import PARAMS, field as float_field  # noqa: E402

DIM = 18
IV = 0
RESULTS = os.path.join(ROOT, "results")
DATA = os.environ.get("BRANCH_DATA", os.path.join(HERE, "data", "branch"))
G_HOPF = Fraction("0.027907858929580")      # Erhardt's first Hopf point (not used in any bound)
G_STAGE_E = "0.0275"

ProofFailure = ex.ProofFailure
up, lo, amax, bound_rec, dec = ex.up, ex.lo, ex.amax, ex.bound_rec, ex.dec

DEFAULTS = dict(
    rho0="1/4", rho="3/2", rho2="1",
    L=16, M=128, prec_g=128, prec_J=128, prec_mat=128,
    theta_target="1/2", n_explicit=12,
    strip_nx=32, strip_rtol=3.0, strip_max_evals=4000,
    hess_nx=16, hess_rtol=1.0, hess_max_evals=1500,
)


# =================================================================================================================
# Float (untrusted) tools: model, Galerkin-Newton with the Fourier phase, continuation, Floquet, width estimates
# =================================================================================================================
SIGf = ct.SIG
NU_F = math.exp(0.25)


def fs(Z, g):
    p = dict(PARAMS)
    p["g_Ks"] = float(g)
    return np.array(float_field(list(Z * SIGf[:, None]), p, ct._NPM)) / SIGf[:, None]


def jac_f(Z, g):
    J = np.empty((Z.shape[1], DIM, DIM))
    for k in range(DIM):
        Zc = Z.astype(complex)
        Zc[k] += 1e-30j
        J[:, :, k] = (fs(Zc, g).imag / 1e-30).T
    return J


def f1_f(Z):
    """d f / d g_Ks (float; f is affine in g_Ks, (0.1))."""
    with np.errstate(all="ignore"):
        return (fs(Z, 1.0) - fs(Z, 0.0))


def residual_f(om, a, g, Mc):
    lay = ct.Layout((a.shape[1] - 1) // 2)
    K = lay.K
    gg = ct.dft(fs(ct.phi_samples(a, Mc), g).astype(complex), K)
    R = np.empty(lay.n, complex)
    R[0] = a[IV, K + 1] - a[IV, K - 1]
    for t, m in enumerate(range(-K, K + 1)):
        R[lay.rows_of_mode(m)] = 1j * om * m * a[:, t] - gg[:, t]
    return R


def galerkin_f(om, a, g, Mc):
    K = (a.shape[1] - 1) // 2
    lay = ct.Layout(K)
    Jh = np.fft.fft(jac_f(ct.phi_samples(a, Mc), g), axis=0) / Mc
    Jn = {n: Jh[n % Mc] for n in range(-2 * K, 2 * K + 1)}
    G = ct.galerkin_matrix(om, a, Jn, 1)
    G[0, :] = 0
    G[0, lay.idx(IV, 1)] = 1
    G[0, lay.idx(IV, -1)] = -1
    return G, Jn


def dFdg_f(a, Mc):
    lay = ct.Layout((a.shape[1] - 1) // 2)
    K = lay.K
    c = ct.dft(f1_f(ct.phi_samples(a, Mc)).astype(complex), K)
    v = np.zeros(lay.n, complex)
    for t, m in enumerate(range(-K, K + 1)):
        v[lay.rows_of_mode(m)] = -c[:, t]
    return v


def fourier_phase(a):
    """Shift theta so that a_{1,V} is real positive."""
    K = (a.shape[1] - 1) // 2
    th0 = -np.angle(a[IV, K + 1])
    return a * np.exp(1j * np.arange(-K, K + 1) * th0)[None, :]


def newton_f(om, a, g, Mc, iters=20, tol=1e-13):
    lay = ct.Layout((a.shape[1] - 1) // 2)
    nr = math.inf
    for _ in range(iters):
        R = residual_f(om, a, g, Mc)
        nr = float(np.abs(R).max())
        if nr < tol:
            break
        G, _ = galerkin_f(om, a, g, Mc)
        du = np.linalg.solve(G, -R)
        dom, da = ct.unpack(lay, du)
        om, a = ct.symmetrize(om + dom, a + da)
    return om, a, nr


def stage_e_seed(K):
    """The Stage E N = 1 centre (K = 32), truncated to K and shifted to the Fourier phase (float)."""
    _, K0, omb, A, _ = ct.load(ct.centre_path(1, 32))
    a = np.array([[complex(float(A[i][m].real), float(A[i][m].imag)) for m in range(2 * K0 + 1)] for i in range(DIM)])
    a = a[:, K0 - K:K0 + K + 1]
    return float(omb), fourier_phase(a)


def floquet_f(om, Jn, K):
    """Hill-matrix eigenvalues (exponents per ms) with |Im| < om / 2, sorted by real part (trivial one included)."""
    L = 2 * K + 1
    H = np.zeros((DIM * L, DIM * L), complex)
    for i, m in enumerate(range(-K, K + 1)):
        for j, m2 in enumerate(range(-K, K + 1)):
            H[DIM * i:DIM * i + DIM, DIM * j:DIM * j + DIM] = Jn[m - m2]
        H[DIM * i:DIM * i + DIM, DIM * i:DIM * i + DIM] -= 1j * om * m * np.eye(DIM)
    ev = np.linalg.eigvals(H)
    sel = ev[np.abs(ev.imag) < 0.5 * om]
    return sel[np.argsort(-sel.real)]


def _weights_f(lay):
    K = lay.K
    w = np.ones(lay.n)
    comp = np.zeros(lay.n, int)
    mode = np.zeros(lay.n)
    for i in range(DIM):
        sl = slice(1 + i * lay.L, 1 + (i + 1) * lay.L)
        w[sl] = NU_F ** np.abs(np.arange(-K, K + 1))
        comp[sl] = i + 1
        mode[sl] = np.arange(-K, K + 1)
    return w, comp, mode


def blocks_f(lay, B, scale=None):
    w, comp, _ = _weights_f(lay)
    Bw = np.abs(B) * w[:, None] / w[None, :]
    if scale is not None:
        Bw = Bw * scale[None, :]
    out = np.zeros((DIM + 1, DIM + 1))
    for c in range(DIM + 1):
        cs = Bw[comp == c].sum(axis=0)
        for cp in range(DIM + 1):
            out[c, cp] = cs[comp == cp].max()
    return out


def hessian_sup_f(a, g, n=256):
    """max over orbit samples of |H_kjl| (float, central differences of the complex-step Jacobian)."""
    Z = ct.phi_samples(a, n)
    H = np.zeros((DIM, DIM, DIM))
    for l in range(DIM):
        h = 1e-6
        Zp, Zm = Z.copy(), Z.copy()
        Zp[l] += h
        Zm[l] -= h
        with np.errstate(all="ignore"):
            d = (jac_f(Zp, g) - jac_f(Zm, g)) / (2 * h)
        H[:, :, l] = np.nan_to_num(np.abs(d)).max(axis=0)
    return H


class FloatPoint:
    """Float data at one g (untrusted): solution, tangent, block norms, Hessian, Floquet exponents."""

    def __init__(self, om, a, g, Mc=None, need_hess=True):
        K = (a.shape[1] - 1) // 2
        self.K, self.g = K, g
        Mc = Mc or (4 * K + 64)
        self.om, self.a, self.res = newton_f(om, a, g, Mc)
        self.lay = lay = ct.Layout(K)
        G, Jn = galerkin_f(self.om, self.a, g, Mc)
        self.Ai = np.linalg.inv(G)
        self.x1 = -self.Ai @ dFdg_f(self.a, Mc)
        w, comp, mode = _weights_f(lay)
        x1c = np.zeros(DIM + 1)
        x1c[0] = abs(self.x1[0])
        for i in range(DIM):
            sl = slice(1 + i * lay.L, 1 + (i + 1) * lay.L)
            x1c[1 + i] = np.sum(np.abs(self.x1[sl]) * w[sl])
        self.x1c = x1c
        self.N0 = blocks_f(lay, self.Ai)
        self.N1 = blocks_f(lay, self.Ai, np.abs(mode))
        self.B1 = blocks_f(lay, np.eye(lay.n) - self.Ai @ G)
        self.H = hessian_sup_f(self.a, g) if need_hess else None
        self.fl = floquet_f(self.om, Jn, K)
        Zs = ct.phi_samples(self.a, 512)
        V = Zs[IV] * SIGf[IV]
        self.Vmin, self.Vmax = float(V.min()), float(V.max())

    @property
    def T(self):
        return 2 * math.pi / self.om

    def leading_nontrivial(self):
        """Largest real part among Hill eigenvalues after removing the one closest to 0 (the trivial exponent)."""
        ev = list(self.fl)
        j = int(np.argmin(np.abs(ev)))
        ev.pop(j)
        return max(e.real for e in ev), ev

    def evaluate_eta(self, eta, rho2=1.5, tail_Z1=0.0):
        Q2 = (1 + NU_F * math.exp(-rho2)) / (1 - NU_F * math.exp(-rho2))
        Z1 = max((self.B1[c] * eta).sum() / eta[c] for c in range(DIM + 1)) + tail_Z1
        hk = np.array([np.einsum("jl,j,l->", self.H[k], eta[1:], eta[1:]) for k in range(DIM)])
        Z2 = max(sum(2 * eta[0] * eta[1 + k] * self.N1[c, 1 + k] + self.N0[c, 1 + k] * Q2 * hk[k]
                     for k in range(DIM)) / eta[c] for c in range(DIM + 1))
        y1 = max(self.x1c / eta)
        dmax = (1 - Z1) ** 2 / (2 * y1 * Z2) if Z1 < 1 else 0.0
        return dict(Z1=Z1, Z2=Z2, y1=y1, half_width=dmax)

    def optimise_eta(self, iters=3000, seed=0):
        """Random coordinate search on log eta maximising the predicted admissible half-width (float)."""
        rng = np.random.default_rng(seed)
        eta = self.x1c / self.x1c.max()
        eta = np.maximum(eta, 1e-6)
        best = self.evaluate_eta(eta)["half_width"]
        for _ in range(iters):
            c = rng.integers(DIM + 1)
            e2 = eta.copy()
            e2[c] *= math.exp(rng.normal() * 0.7)
            v = self.evaluate_eta(e2)["half_width"]
            if v > best:
                best, eta = v, e2
        return eta / eta.max()


def explore(gs, K=16, log=print):
    """Float continuation along gs (increasing) from the Stage E centre; returns a list of dicts (non-rigorous)."""
    om, a = stage_e_seed(K)
    out = []
    prev = None
    for g in gs:
        if prev is not None:
            dom, da = ct.unpack(prev.lay, prev.x1 * (g - prev.g))
            om, a = ct.symmetrize(prev.om + dom.real, prev.a + da)
        fp = FloatPoint(om, a, g)
        lead, ev = fp.leading_nontrivial()
        eta = fp.optimise_eta(iters=1500)
        est = fp.evaluate_eta(eta)
        d = dict(g=g, T_ms=fp.T, newton_residual=fp.res, V_min_mV=fp.Vmin, V_max_mV=fp.Vmax,
                 V_amplitude_mV=fp.Vmax - fp.Vmin, a1V_abs=float(abs(fp.a[IV, K + 1])),
                 dT_dg=float(-2 * math.pi / fp.om ** 2 * fp.x1[0].real),
                 norm_A_eta1=float(fp.N0.sum(axis=1).max()), norm_dxdg_eta1=float(fp.x1c.max()),
                 leading_nontrivial_exponent=lead,
                 exponents_top=[[float(e.real), float(e.imag)] for e in sorted(ev, key=lambda e: -e.real)[:6]],
                 predicted_half_width_eta_opt=est["half_width"], predicted_Z2_eta_opt=est["Z2"],
                 predicted_half_width_eta1=fp.evaluate_eta(np.ones(DIM + 1))["half_width"])
        log(json.dumps({k: (round(v, 12) if isinstance(v, float) else v) for k, v in d.items()
                        if k != "exponents_top"}))
        out.append(d)
        prev = fp
        om, a = fp.om, fp.a
    return out


# =================================================================================================================
# Exact numbers
# =================================================================================================================
def frac_of(x):
    if isinstance(x, Fraction):
        return x
    if isinstance(x, arb):
        return ex.to_fraction(x)
    return Fraction(x)


def dyadic_eta(eta_float, bits=12):
    """Exact dyadic weights (strings 'p/2^bits') from floats; only exactness matters (section 8)."""
    out = []
    for v in eta_float:
        n = max(1, int(round(float(v) * 2 ** bits)))
        out.append(f"{n}/{2 ** bits}")
    return out


def params_for(g_lo, g_hi, prec):
    """Model parameters with g_Ks a ball containing [g_lo, g_hi] (exact rationals or decimal strings)."""
    lo_, hi_ = Fraction(g_lo), Fraction(g_hi)
    if lo_ > hi_:
        raise ValueError("g_lo > g_hi")
    return am.params(prec, g_Ks=(lo_, hi_) if lo_ != hi_ else lo_)


# =================================================================================================================
# Arb centre (untrusted refinement at an exact decimal g)
# =================================================================================================================
def to_exact_centre(om, a, prec=256):
    """Exact symmetric centre with Im a_{1,V} = 0 exactly."""
    a = a.copy()
    K = (a.shape[1] - 1) // 2
    a[IV, K + 1] = a[IV, K + 1].real
    a[IV, K - 1] = a[IV, K - 1].real
    omb, A = ct.to_exact(om, a, prec)
    return omb, A


def residual_arb(om, A, g, Mc, prec):
    K = (len(A[0]) - 1) // 2
    lay = ct.Layout(K)
    prm = params_for(g, g, prec)
    f = lambda z: am.f(z, prm, prec=prec)  # noqa: E731
    phi = fe.TrigPoly(A)
    G = fe.node_values(f, phi, Mc, prec=prec)
    C = fe.aliased_dft(G, K, prec=prec)
    old = ctx.prec
    ctx.prec = prec
    try:
        R = [None] * lay.n
        R[0] = A[IV][K + 1] - A[IV][K - 1]
        for m in range(-K, K + 1):
            for i in range(DIM):
                R[lay.idx(i, m)] = acb(0, m) * om * A[i][m + K] - C[i][m + K]
    finally:
        ctx.prec = old
    return R


def refine_centre(om, a, g, prec=192, iters=6, tol=1e-40, log=print):
    """Float Newton at float(g), then an Arb chord refinement at the exact decimal g. Returns (om, A) exact."""
    K = (a.shape[1] - 1) // 2
    lay = ct.Layout(K)
    Mc = 4 * K + 64
    om, a, nr = newton_f(om, a, float(Fraction(g)), Mc)
    G, _ = galerkin_f(om, a, float(Fraction(g)), Mc)
    from scipy.linalg import lu_factor, lu_solve
    lu = lu_factor(G)
    omb, A = to_exact_centre(om, a, prec)
    hist = []
    for _ in range(iters):
        R = residual_arb(omb, A, g, Mc, prec)
        mx = max(float(r.abs_upper()) for r in R)
        hist.append(mx)
        if mx < tol:
            break
        Rd = np.array([complex(float(r.real.mid()), float(r.imag.mid())) for r in R])
        du = lu_solve(lu, -Rd)
        dom, da = ct.unpack(lay, du)
        old = ctx.prec
        ctx.prec = prec
        try:
            omb = (omb + arb(float(np.real(dom)))).mid()
            for i in range(DIM):
                A[i][K] = acb((A[i][K].real + arb(float(np.real(da[i, K])))).mid())
                for m in range(1, K + 1):
                    v = 0.5 * (da[i, K + m] + np.conj(da[i, K - m]))
                    w = A[i][K + m] + acb(complex(v))
                    re, im = w.real.mid(), w.imag.mid()
                    if i == IV and m == 1:
                        im = arb(0)
                    A[i][K + m] = acb(re, im)
                    A[i][K - m] = acb(re, -im)
        finally:
            ctx.prec = old
    log(f"    centre at g = {g}: float residual {nr:.1e}, Arb residual history {[f'{h:.1e}' for h in hist]}")
    return omb, A, hist


def centre_float(A):
    K = (len(A[0]) - 1) // 2
    return np.array([[complex(float(A[i][m].real), float(A[i][m].imag)) for m in range(2 * K + 1)]
                     for i in range(DIM)])


def centre_record(g, om, A, hist):
    K = (len(A[0]) - 1) // 2
    return dict(g=str(g), K=K, omega=ct.dyadic_to_text(om),
                a=[[[ct.dyadic_to_text(A[i][K + m].real), ct.dyadic_to_text(A[i][K + m].imag)] for m in range(K + 1)]
                   for i in range(DIM)], refinement_residual_history=hist,
                status="untrusted numerical centre (Fourier phase Im a_{1,V} = 0), exact dyadics")


def centre_from_record(rec):
    K = int(rec["K"])
    om = ct.text_to_dyadic(rec["omega"])
    A = [[None] * (2 * K + 1) for _ in range(DIM)]
    old = ctx.prec
    ctx.prec = 1024
    try:
        for i in range(DIM):
            for m in range(K + 1):
                re, im = (ct.text_to_dyadic(t) for t in rec["a"][i][m])
                A[i][K + m] = acb(re, im)
                A[i][K - m] = acb(re, -im)
    finally:
        ctx.prec = old
    return om, A


def centre_digest(om, A):
    h = hashlib.sha256(ct.dyadic_to_text(om).encode())
    for row in A:
        for c in row:
            h.update((ct.dyadic_to_text(c.real) + ct.dyadic_to_text(c.imag)).encode())
    return h.hexdigest()


# =================================================================================================================
# Second-order forward-mode dual numbers over acb (Lemma B2's Hessian enclosures)
# =================================================================================================================
class HessDomainError(ArithmeticError):
    pass


def _lift(x):
    if isinstance(x, Hess):
        return x
    if isinstance(x, bool):
        raise TypeError("bool")
    if isinstance(x, acb):
        return Hess(x)
    if isinstance(x, (arb, int, flint.fmpz, fmpq)):
        return Hess(acb(x))
    raise TypeError(f"Hess arithmetic with {type(x).__name__} is refused (no float may enter unexamined)")


def _chk(v):
    if not v.is_finite():
        raise HessDomainError(f"non-finite intermediate {v}")
    return v


class Hess:
    """v + sum_i g[i] e_i + (1/2) sum_{i,j} H_ij e_i e_j, with h[(i, j)] = H_ij for i <= j (symmetric). Every operation is
    the exact second-order chain rule evaluated in acb ball arithmetic, so v, g, h enclose the value, gradient and
    Hessian of the composite at every point of the input box. Every new value is checked finite (else
    HessDomainError): a finite result certifies every intermediate (fourier_eval's contract, made strict)."""
    __slots__ = ("v", "g", "h")

    def __init__(self, v, g=None, h=None):
        self.v = _chk(v)
        self.g = g if g is not None else {}
        self.h = h if h is not None else {}

    # -- linear operations
    def __add__(self, o):
        o = _lift(o)
        g = dict(self.g)
        for k, x in o.g.items():
            g[k] = g[k] + x if k in g else x
        h = dict(self.h)
        for k, x in o.h.items():
            h[k] = h[k] + x if k in h else x
        return Hess(self.v + o.v, g, h)

    __radd__ = __add__

    def __neg__(self):
        return Hess(-self.v, {k: -x for k, x in self.g.items()}, {k: -x for k, x in self.h.items()})

    def __pos__(self):
        return self

    def __sub__(self, o):
        return self + (-_lift(o))

    def __rsub__(self, o):
        return _lift(o) + (-self)

    def _scale(self, s):
        return Hess(self.v * s, {k: x * s for k, x in self.g.items()}, {k: x * s for k, x in self.h.items()})

    # -- products
    def __mul__(self, o):
        if not isinstance(o, Hess):
            return self._scale(_lift(o).v)
        a, b = self, o
        g = {k: x * b.v for k, x in a.g.items()}
        for k, x in b.g.items():
            g[k] = g[k] + x * a.v if k in g else x * a.v
        h = {k: x * b.v for k, x in a.h.items()}
        for k, x in b.h.items():
            h[k] = h[k] + x * a.v if k in h else x * a.v
        for i, ai in a.g.items():
            for j, bj in b.g.items():
                key = (i, j) if i <= j else (j, i)
                t = ai * bj
                if i == j:
                    t = 2 * t
                h[key] = h[key] + t if key in h else t
        return Hess(a.v * b.v, g, h)

    __rmul__ = __mul__

    def _unary(self, v, d1, d2):
        _chk(d1)
        _chk(d2)
        g = {k: d1 * x for k, x in self.g.items()}
        h = {k: d1 * x for k, x in self.h.items()}
        items = list(self.g.items())
        for p, (i, gi) in enumerate(items):
            for (j, gj) in items[p:]:
                key = (i, j) if i <= j else (j, i)
                t = d2 * gi * gj
                h[key] = h[key] + t if key in h else t
        return Hess(v, g, h)

    def reciprocal(self):
        r = 1 / self.v
        _chk(r)
        return self._unary(r, -r * r, 2 * r * r * r)

    def __truediv__(self, o):
        if isinstance(o, Hess):
            return self * o.reciprocal()
        s = _lift(o).v
        r = 1 / s
        _chk(r)
        return self._scale(r)

    def __rtruediv__(self, o):
        return _lift(o) * self.reciprocal()

    def __pow__(self, n):
        if type(n) is not int:
            raise TypeError("Hess ** n needs an int exponent")
        if n == 0:
            return Hess(acb(1))
        if n == 1:
            return self
        v = self.v
        return self._unary(v ** n, n * v ** (n - 1), n * (n - 1) * (v ** (n - 2) if n >= 2 else acb(1)))

    def exp(self):
        e = self.v.exp()
        return self._unary(e, e, e)

    def log(self):
        if not (self.v.real > 0):
            raise HessDomainError(f"log argument {self.v} not certainly in Re > 0")
        r = 1 / self.v
        return self._unary(self.v.log(), r, -r * r)

    def sqrt(self):
        if not (self.v.real > 0):
            raise HessDomainError(f"sqrt argument {self.v} not certainly in Re > 0")
        s = self.v.sqrt()
        return self._unary(s, 1 / (2 * s), -1 / (4 * s * self.v))


class HessMath:
    @staticmethod
    def exp(a):
        return a.exp() if isinstance(a, Hess) else _chk(am.to_ball(a).exp())

    @staticmethod
    def log(a):
        if isinstance(a, Hess):
            return a.log()
        a = am.to_ball(a)
        if not (a.real > 0):
            raise HessDomainError("log argument not certainly in Re > 0")
        return _chk(a.log())

    @staticmethod
    def sqrt(a):
        if isinstance(a, Hess):
            return a.sqrt()
        a = am.to_ball(a)
        if not (a.real > 0):
            raise HessDomainError("sqrt argument not certainly in Re > 0")
        return _chk(a.sqrt())


HPAIRS = [(j, l) for j in range(DIM) for l in range(j, DIM)]        # 171 pairs, j <= l


def f_and_hess(z, prm, prec=53):
    """(f, H) in the scaled variables: f as 18 acb, H[k][(j, l)] (j <= l) = d^2 f_k / dz_j dz_l, as dicts (missing
    entries are exact zeros). Raises HessDomainError / DomainError outside the certified domain."""
    with am.precision(prec):
        fn = am.model()["field"]
        x = [Hess(am.to_ball(zi) * s, {k: s}) for k, (zi, s) in enumerate(zip(z, am.SIG))]
        y = fn(x, prm, HessMath, acb(0))
        F, H = [], []
        for k, yk in enumerate(y):
            yk = _lift(yk) if not isinstance(yk, Hess) else yk
            F.append(yk.v * am.ISIG[k])
            H.append({key: v * am.ISIG[k] for key, v in yk.h.items()})
    return F, H


def dgJ_flat(z, prm, prec=53):
    """Black box: the 324 entries d/dg (Df)_{kj} = d^2 f_k / dz_j dg_Ks (row-major), by Hess with g_Ks as a 19th variable
    (its ball, e.g. an interval, is the base point; the derivative is enclosed over that ball)."""
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(prm)
        p["g_Ks"] = Hess(am.to_ball(p["g_Ks"]), {DIM: acb(1)})
        x = [Hess(am.to_ball(zi) * s, {k: s}) for k, (zi, s) in enumerate(zip(z, am.SIG))]
        y = fn(x, p, HessMath, acb(0))
        out = []
        zero = acb(0)
        for k, yk in enumerate(y):
            yk = _lift(yk) if not isinstance(yk, Hess) else yk
            for j in range(DIM):
                out.append(yk.h.get((j, DIM), zero) * am.ISIG[k])
    return out


def hess_flat(z, prm, prec=53):
    """Black box for fourier_eval.strip_sup: the 18 values of f, then the 18 x 171 Hessian entries (k, j <= l)."""
    F, H = f_and_hess(z, prm, prec)
    out = list(F)
    zero = acb(0)
    for k in range(DIM):
        hk = H[k]
        out.extend(hk.get(p, zero) for p in HPAIRS)
    return out


# =================================================================================================================
# Hessian bound for a group of pieces (Lemma B2 data)
# =================================================================================================================
class HessBound:
    """MH[k][(j,l)] (exact upper bounds), radii R (exact), rho2, the g hull [g_lo, g_hi], and the coefficient hull."""

    def __init__(self, centres, g_lo, g_hi, R, rho2, settings, log=print):
        st = dict(DEFAULTS)
        st.update(settings or {})
        K = (len(centres[0][1][0]) - 1) // 2
        self.K, self.g_lo, self.g_hi = K, str(g_lo), str(g_hi)
        self.rho2 = ex._exact_dyadic_param(rho2, "rho2")
        self.R = [ex._exact_dyadic_param(r, "R") for r in R]
        self.R_text = list(R)
        t0 = time.time()
        old = ctx.prec
        ctx.prec = 256
        try:
            hull = [[None] * (2 * K + 1) for _ in range(DIM)]
            for i in range(DIM):
                for t in range(2 * K + 1):
                    re = centres[0][1][i][t].real
                    imv = centres[0][1][i][t].imag
                    for _, Ac in centres[1:]:
                        re = re.union(Ac[i][t].real)
                        imv = imv.union(Ac[i][t].imag)
                    hull[i][t] = acb(re, imv)
            self.hull = [row[:] for row in hull]
            for i in range(DIM):
                hull[i][K] = acb(hull[i][K].real + self.R[i] * arb(0, 1), hull[i][K].imag + self.R[i] * arb(0, 1))
        finally:
            ctx.prec = old
        for om, Ac in centres:
            if not self.contains_centre(Ac):
                raise ProofFailure("a centre is not inside the hull (internal error)")
        phi = fe.TrigPoly(hull)
        prm = params_for(g_lo, g_hi, 53)
        fn = lambda z: hess_flat(z, prm, 53)  # noqa: E731
        sp = fe.strip_sup(fn, phi, self.rho2, nx=int(st["hess_nx"]), rtol=float(st["hess_rtol"]),
                          atol=0.0, max_evals=int(st["hess_max_evals"]))
        if not sp.full_strip:
            raise ProofFailure("Hessian cover is not the full strip")
        self.strip = sp
        S = sp.S
        self.Mf = S[:DIM]
        self.MH = [[S[DIM + k * len(HPAIRS) + p] for p in range(len(HPAIRS))] for k in range(DIM)]
        self.seconds = time.time() - t0
        self.digest = phi.digest()
        log(f"  Hessian cover over g in [{g_lo}, {g_hi}], {len(centres)} centres: {sp.n_evals} boxes, "
            f"{self.seconds:.1f} s; max_k sum_jl MH = {max(float(sum(r, arb(0))) for r in self.MH):.3e}")

    def contains_centre(self, A):
        for i in range(DIM):
            for t in range(2 * self.K + 1):
                if not self.hull[i][t].contains(A[i][t]):
                    return False
        return True

    def W(self, ETA, r_star, Q2):
        """W_k = Q2 P(eta r*) sum_{j,l} eta_j eta_l MH_kjl (ordered pairs: off-diagonal entries count twice)."""
        P = arb(1)
        for i in range(DIM):
            t = ETA[1 + i] * r_star
            if not t < self.R[i]:
                raise ProofFailure(f"eta_{i} r_* is not < R_{i}")
            P = P * self.R[i] / (self.R[i] - t)
        out = []
        for k in range(DIM):
            s = arb(0)
            for p, (j, l) in enumerate(HPAIRS):
                w = ETA[1 + j] * ETA[1 + l] * self.MH[k][p]
                s += w if j == l else 2 * w
            out.append(up(Q2 * P * s))
        return out, up(P)

    def record(self):
        return dict(g_hull=[self.g_lo, self.g_hi], R=self.R_text, rho2=str(self.rho2.mid()),
                    n_evals=self.strip.n_evals, n_leaves=self.strip.n_leaves, n_unresolved=self.strip.n_unresolved,
                    full_strip=self.strip.full_strip, seconds=round(self.seconds, 1), phi_digest=self.digest,
                    MH_row_sums=[float(sum(r, arb(0))) for r in self.MH], Mf=[float(v) for v in self.Mf])


# =================================================================================================================
# The proof on one piece (Theorem B1 with Lemma B2), in two stages: weight-free blocks, then assembly
# =================================================================================================================
def piece_blocks(om_bar, A, g_lo, g_hi, *, settings=None, log=print, label=None):
    """Every eta-independent rigorous ingredient of Theorem B1 on [g_lo, g_hi] for the exact centre (om_bar, A):
    block norms (Arb, exact upper bounds) of I - A DF over all g (Z1 blocks), of A_fin and A_fin diag(|m|) and the
    tail sups (Z2), and the residual split by the mean value theorem in g (section 3):
        A F(xbar; g) = A F(xbar; g_c) + (g - g_c) int_0^1 A d_gF(xbar; g_c + t (g - g_c)) dt,
    with d_gF(xbar; xi) = (0, (-[d_g f(phibar; xi)]_m)_m) enclosed over xi in G, so
        sup_g ||(A F(xbar; g))_c|| <= Y0p_c + delta Y0g_c,   delta = max(g_hi - g_c, g_c - g_lo).
    (Evaluating F(xbar; g) directly with the interval g gives the same kind of bound but adds |A| |rad| without the
    cancellation inside A d_gF, about 30 times larger here.)"""
    st = dict(DEFAULTS)
    st.update(settings or {})
    clk = ex.Clock(log)
    K = (len(A[0]) - 1) // 2
    lay = ct.Layout(K)
    n = lay.n
    Kp = 2 * K + int(st["L"])
    Mn = int(st["M"])
    if not Kp < Mn:
        raise ValueError("need K' < M")
    Pg, PJ, PM = int(st["prec_g"]), int(st["prec_J"]), int(st["prec_mat"])
    glo, ghi = Fraction(g_lo), Fraction(g_hi)
    if not glo <= ghi:
        raise ValueError("empty piece")
    gc = (glo + ghi) / 2
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
        if not A[IV][K + 1].imag.is_zero():
            raise ValueError("centre violates the phase condition Im a_{1,V} = 0")
        delta = arb(fmpq((max(ghi - gc, gc - glo)).numerator, (max(ghi - gc, gc - glo)).denominator))
        delta = up(delta)
    finally:
        ctx.prec = old_prec

    phi = fe.TrigPoly(A)
    prm53_G, prmJ_G, prmG_G = (params_for(glo, ghi, p) for p in (53, PJ, Pg))   # g in G (interval)
    prm53_c, prmG_c = params_for(gc, gc, 53), params_for(gc, gc, Pg)            # g = g_c (point)
    f53c = lambda z: am.f(z, prm53_c, prec=53)  # noqa: E731
    fGc = lambda z: am.f(z, prmG_c, prec=Pg)  # noqa: E731
    prmJ_c = params_for(gc, gc, PJ)
    J53 = lambda z: ex._flat(am.f_and_df(z, prm53_c, prec=53)[1])  # noqa: E731
    JJ = lambda z: ex._flat(am.f_and_df(z, prmJ_c, prec=PJ)[1])  # noqa: E731
    D53 = lambda z: dgJ_flat(z, prm53_G, 53)  # noqa: E731
    DJ = lambda z: dgJ_flat(z, prmJ_G, PJ)  # noqa: E731

    def d1_53(z):
        P = am.f_and_df(z, prm53_G, prec=53, wrt=("g_Ks",))[2]
        return [P[i, 0] for i in range(DIM)]

    def d1_G(z):
        P = am.f_and_df(z, prmG_G, prec=Pg, wrt=("g_Ks",))[2]
        return [P[i, 0] for i in range(DIM)]

    skw = dict(nx=int(st["strip_nx"]), rtol=float(st["strip_rtol"]), max_evals=int(st["strip_max_evals"]))
    log(f"piece [{g_lo}, {g_hi}] (g_c = {gc}): K = {K}, K' = {Kp}, M = {Mn}")
    strip_g = fe.strip_sup(f53c, phi, rho, **skw)
    strip_J = fe.strip_sup(J53, phi, rho, **dict(skw, rtol=max(skw["rtol"], 10.0), atol=1.0))
    strip_d = fe.strip_sup(d1_53, phi, rho, **skw)
    strip_D = fe.strip_sup(D53, phi, rho, **dict(skw, rtol=max(skw["rtol"], 10.0), atol=1e-3))
    for s in (strip_g, strip_J, strip_d, strip_D):
        if not s.full_strip:
            raise ProofFailure("a strip cover is not the full strip")
    clk.mark("strips")
    enc_g = fe.fourier_coefficients(fGc, phi, rho, Mn, Kp, S=strip_g, prec=Pg)
    enc_d = fe.fourier_coefficients(d1_G, phi, rho, Mn, Kp, S=strip_d, prec=Pg)
    enc_J = fe.fourier_coefficients(JJ, phi, rho, Mn, Kp, S=strip_J, prec=PJ)
    enc_D = fe.fourier_coefficients(DJ, phi, rho, Mn, Kp, S=strip_D, prec=PJ)
    if any(e.S_source != "strip" for e in (enc_g, enc_d, enc_J, enc_D)):
        raise ProofFailure("Fourier enclosure without a checked strip bound")
    clk.mark("dft")
    J = {nn: [[enc_J.c[DIM * r + c][nn + Kp] for c in range(DIM)] for r in range(DIM)] for nn in range(-Kp, Kp + 1)}
    SJ = [[enc_J.S[DIM * r + c] for c in range(DIM)] for r in range(DIM)]
    D1 = {nn: [[enc_D.c[DIM * r + c][nn + Kp] for c in range(DIM)] for r in range(DIM)] for nn in range(-Kp, Kp + 1)}
    SD = [[enc_D.S[DIM * r + c] for c in range(DIM)] for r in range(DIM)]

    ctx.prec = PM
    try:
        Dfin = acb_mat(n, n)          # d_g DF(xbar; xi) on the finite modes (no phase / omega entries)
        for i in range(DIM):
            for m in range(-K, K + 1):
                r = lay.idx(i, m)
                for k in range(DIM):
                    base = 1 + k * lay.L + K
                    for m2 in range(-K, K + 1):
                        Dfin[r, base + m2] = -D1[m - m2][i][k]
        Jfin = acb_mat(n, n)
        Jfin[0, lay.idx(IV, 1)] = acb(1)
        Jfin[0, lay.idx(IV, -1)] = acb(-1)
        for i in range(DIM):
            for m in range(-K, K + 1):
                r = lay.idx(i, m)
                Jfin[r, 0] = acb(0, m) * A[i][m + K]
                for k in range(DIM):
                    base = 1 + k * lay.L + K
                    for m2 in range(-K, K + 1):
                        Jfin[r, base + m2] = -J[m - m2][i][k]
                Jfin[r, r] += acb(0, m) * om_bar
        Jmid = np.array([[complex(float(v.real.mid()), float(v.imag.mid())) for v in row] for row in Jfin.tolist()])
        Ainv = np.linalg.inv(Jmid)
        Afin = acb_mat([[acb(complex(v)) for v in row] for row in Ainv])
        Bfin = ex._identity(n) - Afin * Jfin
        ADfin = Afin * Dfin
    finally:
        ctx.prec = old_prec
    clk.mark("A_fin, I - A_fin J_fin, A_fin D_fin")

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

        # finite rows x tail columns (the phase functional has no entry on |m'| > K): for the convolution operator
        # with coefficients C (J at g_c, or D1 over G) and entrywise strip majorant SC (Stage E section 5)
        Lw = int(st["L"])
        cols_exact = [(k, mp) for k in range(DIM) for mp in list(range(K + 1, K + Lw + 1)) + list(range(-K - Lw, -K))]
        mb = K + Lw + 1
        cols_b = [(k, s * mb) for k in range(DIM) for s in (1, -1)]
        erho = (-rho).exp()

        def finite_tail(C, SC):
            Wm = acb_mat(n, len(cols_exact))
            for t, (k, mp) in enumerate(cols_exact):
                for j in range(DIM):
                    for m in range(-K, K + 1):
                        Wm[lay.idx(j, m), t] = -C[m - mp][j][k]
            with fe.precision(PM):
                AW = Afin * Wm
            colW = WROW * ex._abs_mat(AW)
            out = [[arb(0)] * (DIM + 1) for _ in range(DIM + 1)]
            for t, (k, mp) in enumerate(cols_exact):
                for c in range(DIM + 1):
                    out[c][1 + k] = amax(out[c][1 + k], up(colW[c, t] / nupow[abs(mp)]))
            Wb = arb_mat(n, len(cols_b))
            for t, (k, mp) in enumerate(cols_b):
                for j in range(DIM):
                    for m in range(-K, K + 1):
                        Wb[lay.idx(j, m), t] = up(SC[j][k] * erho ** abs(m - mp))
            colWb = WROW * (Aabs * Wb)
            for t, (k, mp) in enumerate(cols_b):
                for c in range(DIM + 1):
                    out[c][1 + k] = amax(out[c][1 + k], up(colWb[c, t] / nupow[abs(mp)]))
            return out

        Z1_ft = finite_tail(J, SJ)
        Zg_ff = ex._block_colsup(WROW * ex._abs_mat(ADfin), comp_of, mode_of, nupow)
        Zg_ft = finite_tail(D1, SD)
        clk.mark("Z1 finite x tail")

        J0hat = acb_mat([[acb(J[0][r][c].real.mid()) for c in range(DIM)] for r in range(DIM)])
        Jp = {nn: acb_mat([[J[nn][r][c] - (J0hat[r, c] if nn == 0 else 0) for c in range(DIM)] for r in range(DIM)])
              for nn in range(-Kp, Kp + 1)}
        with fe.precision(PM):
            tail = ex._tail_bounds(K, Kp, om_bar, J0hat, Jp, {}, 1, st, nupow, lambda *a, **k: None)
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
        # Z1 blocks B1[c][c'] (c, c' = 0 omega/phase, 1 + k components)
        B1 = [[None] * (DIM + 1) for _ in range(DIM + 1)]
        for c in range(DIM + 1):
            for cp in range(DIM + 1):
                b = amax(Z1_ff[c][cp], Z1_ft[c][cp])
                if c >= 1 and cp >= 1:
                    b = up(b + T[c - 1][cp - 1])
                B1[c][cp] = b
        # tail rows of A d_gDF: (A d_gDF y)_m = -A_m sum_n D1_n y_{m-n}, |A_m D1_n| <= Abar0 |D1_n| (entrywise)
        Ab0m = arb_mat(Abar0)
        Tg = [[arb(0)] * DIM for _ in range(DIM)]
        for nn in range(-Kp, Kp + 1):
            P = Ab0m * arb_mat([[D1[nn][r][c].abs_upper() for c in range(DIM)] for r in range(DIM)])
            w = up(nupow[abs(nn)])
            for c in range(DIM):
                for k in range(DIM):
                    Tg[c][k] = Tg[c][k] + P[c, k] * w
        P = Ab0m * arb_mat(SD)
        for c in range(DIM):
            for k in range(DIM):
                Tg[c][k] = up(Tg[c][k] + P[c, k] * tailK)
        B1g = [[None] * (DIM + 1) for _ in range(DIM + 1)]
        for c in range(DIM + 1):
            for cp in range(DIM + 1):
                b = amax(Zg_ff[c][cp], Zg_ft[c][cp])
                if c >= 1 and cp >= 1:
                    b = up(b + Tg[c - 1][cp - 1])
                B1g[c][cp] = b
        clk.mark("tail")

        # residual parts: at g_c, and the g-derivative over G
        def y0_parts(coef, S, with_phase_and_omega):
            Ffin = acb_mat(n, 1)
            if with_phase_and_omega:
                Ffin[0, 0] = A[IV][K + 1] - A[IV][K - 1]
            for i in range(DIM):
                for m in range(-K, K + 1):
                    v = -coef[i][m + Kp]
                    if with_phase_and_omega:
                        v += acb(0, m) * om_bar * A[i][m + K]
                    Ffin[lay.idx(i, m), 0] = v
            AF = Afin * Ffin
            Yc = [arb(0)] * (DIM + 1)
            for r in range(n):
                c = 0 if comp_of[r] is None else 1 + comp_of[r]
                Yc[c] = Yc[c] + AF[r, 0].abs_upper() * nupow[abs(mode_of[r])]
            Ab0 = arb_mat(Abar0)
            for m in range(K + 1, Kp + 1):
                Am = tail["A_explicit"].get(m)
                for sgn in (1, -1):
                    gv = acb_mat([[coef[k][sgn * m + Kp]] for k in range(DIM)])
                    if Am is not None:
                        v = (Am if sgn == 1 else Am.conjugate()) * gv
                        vals = [v[c, 0].abs_upper() for c in range(DIM)]
                    else:
                        v = Ab0 * arb_mat([[gv[k, 0].abs_upper()] for k in range(DIM)])
                        vals = [up(v[c, 0]) for c in range(DIM)]
                    for c in range(DIM):
                        Yc[1 + c] = Yc[1 + c] + vals[c] * nupow[m]
            for c in range(DIM):
                s = arb(0)
                for k in range(DIM):
                    s += Abar0[c][k] * S[k]
                Yc[1 + c] = Yc[1 + c] + s * tailK
            return [up(v) for v in Yc]

        Y0p = y0_parts(enc_g.c, enc_g.S, True)
        Y0g = y0_parts(enc_d.c, enc_d.S, False)
        clk.mark("Y0 parts")
    finally:
        ctx.prec = old_prec
    return dict(g_lo=str(g_lo), g_hi=str(g_hi), g_c=str(gc), K=K, Kp=Kp, M=Mn, settings=st, label=label,
                om_bar=om_bar, A=A, nu=nu, rho0=rho0, rho=rho, delta=delta, B1=B1, B1g=B1g, N0=N0, N1=N1, Abar0=Abar0,
                Abar1=Abar1, Y0p=Y0p, Y0g=Y0g, J=J, SJ=SJ, tail=dict(m_max=tail["m_max"], theta=float(up(tail["theta"]))),
                strips=dict(g=ex._strip_rec(strip_g), J=ex._strip_rec(strip_J), dg_f=ex._strip_rec(strip_d),
                            dg_J=ex._strip_rec(strip_D)),
                timings_s=clk.marks, wall_s=round(time.time() - clk.t0, 2))


def assemble(bl, eta, r_star, hess, *, log=print, _mutate=()):
    """Theorem B1: Y0, Z1, Z2 with the weights eta (19 exact dyadic strings, omega first), the radii polynomial and the
    corollaries of section 7. Raises ProofFailure (with .diag) if an inequality is not certified. _mutate (tests
    only): "drop_g_width" omits delta Y0g (the parameter-width contribution); "no_hess_check" skips the checks that
    the Hessian cover contains this centre and g range."""
    mut = frozenset(_mutate)
    if mut - {"drop_g_width", "no_hess_check"}:
        raise ValueError(f"unknown mutation {sorted(mut)}")
    if len(eta) != DIM + 1:
        raise ValueError("eta needs 19 entries")
    if "no_hess_check" not in mut:
        if not (Fraction(hess.g_lo) <= Fraction(bl["g_lo"]) and Fraction(bl["g_hi"]) <= Fraction(hess.g_hi)):
            raise ProofFailure("Hessian bound does not cover the piece's g range")
        if not hess.contains_centre(bl["A"]):
            raise ProofFailure("centre not inside the Hessian cover's coefficient hull")
    st = bl["settings"]
    K = bl["K"]
    old_prec = ctx.prec
    ctx.prec = int(st["prec_g"])
    try:
        ETA = [ex._exact_dyadic_param(e, "eta") for e in eta]
        r_star = up(r_star if isinstance(r_star, arb) else ex._exact_dyadic_param(r_star, "r_star"))
        nu, rho0, rho2 = bl["nu"], bl["rho0"], hess.rho2
        if not rho2 > rho0:
            raise ValueError("need rho2 > rho0")
        q2 = nu * (-rho2).exp()
        if not q2 < 1:
            raise ProofFailure("nu e^{-rho2} not < 1")
        Q2 = (1 + q2) / (1 - q2)
        B1, B1g, N0, N1, Abar0, Abar1 = bl["B1"], bl["B1g"], bl["N0"], bl["N1"], bl["Abar0"], bl["Abar1"]
        dl = arb(0) if "drop_g_width" in mut else bl["delta"]
        Z1_rows = []
        for c in range(DIM + 1):
            s = arb(0)
            for cp in range(DIM + 1):
                s += ETA[cp] * (B1[c][cp] + dl * B1g[c][cp])
            Z1_rows.append(up(s / ETA[c]))
        Z1 = Z1_rows[0]
        for v in Z1_rows[1:]:
            Z1 = amax(Z1, v)
        Y0c = [up(bl["Y0p"][c] + dl * bl["Y0g"][c]) for c in range(DIM + 1)]
        Y0 = arb(0)
        for c in range(DIM + 1):
            Y0 = amax(Y0, up(Y0c[c] / ETA[c]))
        Wk, Pfac = hess.W(ETA, r_star, Q2)
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
        diag = dict(Y0=float(Y0), Z1=float(Z1), Z2=float(Z2), Y0_by_comp=[float(v) for v in Y0c],
                    Z1_by_comp=[float(v) for v in Z1_rows], Z2_by_comp=[float(v) for v in Z2_rows],
                    W=[float(v) for v in Wk], P=float(Pfac), r_star=float(r_star),
                    disc=float(((1 - Z1) ** 2 - 2 * Y0 * Z2).mid()))
        log(f"  [{bl['g_lo']}, {bl['g_hi']}]: Y0 = {float(Y0):.4e}, Z1 = {float(Z1):.4e}, Z2 = {float(Z2):.4e}, "
            f"r_* = {float(r_star):.3e}, P = {float(Pfac):.3f}")
        res = ex._radii(Y0, Z1, Z2, r_star)
        if res is None:
            err = ProofFailure(f"radii polynomial not negative on [{bl['g_lo']}, {bl['g_hi']}]: Y0 = {float(Y0):.3e}, "
                               f"Z1 = {float(Z1):.4f}, Z2 = {float(Z2):.3e}, r_* = {float(r_star):.3e}")
            err.diag = diag
            raise err
        r_lo, r_hi = res
        om_bar = bl["om_bar"]
        om_ball = om_bar + up(ETA[0] * r_lo) * arb(0, 1)
        if not om_ball > 0:
            raise ProofFailure("omega not certainly positive")
        Tball = 2 * arb.pi() / om_ball
        a1V = bl["A"][IV][K + 1]
        a1_margin = a1V.abs_lower() - ETA[1 + IV] * r_lo / nu
        if not a1_margin > 0:
            raise ProofFailure("|abar_{1,V}| > eta_V r / nu not certified")
        out = dict(
            g_lo=bl["g_lo"], g_hi=bl["g_hi"], centre_g=bl["g_c"], label=bl["label"], K=K, Kprime=bl["Kp"], M=bl["M"],
            omega_bar=ct.dyadic_to_text(om_bar), centre_sha256=centre_digest(om_bar, bl["A"]),
            T_ms={"lower": bound_rec(Tball, "down"), "upper": bound_rec(Tball, "up")},
            omega={"lower": bound_rec(om_ball, "down"), "upper": bound_rec(om_ball, "up")},
            Y0=bound_rec(Y0), Z1=bound_rec(Z1), Z2=bound_rec(Z2), r_star=bound_rec(r_star),
            r_existence=bound_rec(r_lo), r_uniqueness=bound_rec(r_hi),
            p_at_r_existence=bound_rec(Y0 + (Z1 - 1) * r_lo + Z2 * r_lo * r_lo / 2),
            p_at_r_uniqueness=bound_rec(Y0 + (Z1 - 1) * r_hi + Z2 * r_hi * r_hi / 2),
            contraction_at_r_uniqueness=bound_rec(Z1 + Z2 * r_hi),
            parameter_half_width=bound_rec(bl["delta"]),
            Y0_point_max=float(max(bl["Y0p"][c] / ETA[c] for c in range(DIM + 1))),
            Y0_g_derivative_max=float(max(bl["Y0g"][c] / ETA[c] for c in range(DIM + 1))),
            a1V_margin=bound_rec(a1_margin, "down"), eta=list(eta), polydisc_P=float(Pfac),
            hessian_cover=hess.digest, tail=bl["tail"], strips=bl["strips"], diag=diag,
            settings=dict(bl["settings"]), timings_s=bl["timings_s"], wall_s=bl["wall_s"])
        if mut:
            out["MUTATED"] = sorted(mut)
        out["_obj"] = dict(om_bar=om_bar, A=bl["A"], ETA=ETA, r_lo=r_lo, r_hi=r_hi, J=bl["J"], SJ=bl["SJ"],
                           Kp=bl["Kp"], om_lo=lo(om_ball), om_hi=up(om_ball), rho0=rho0, rho=bl["rho"], rho2=rho2,
                           nu=nu)
    finally:
        ctx.prec = old_prec
    return out


def prove_piece(om_bar, A, g_lo, g_hi, *, eta, r_star, hess, settings=None, log=print, label=None, _mutate=()):
    bl = piece_blocks(om_bar, A, g_lo, g_hi, settings=settings, log=log, label=label)
    return assemble(bl, eta, r_star, hess, log=log, _mutate=_mutate)


# -- choosing eta and r_* from the rigorous blocks (floating point; only the choice, never a bound)
def _blocks_float(bl, MH_rows=None):
    f = lambda M: np.array([[float(x) for x in row] for row in M])  # noqa: E731
    B1 = f(bl["B1"])
    N0 = f(bl["N0"])
    N1 = f(bl["N1"])
    Ab0 = f(bl["Abar0"])
    Ab1 = f(bl["Abar1"])
    N0t, N1t = N0.copy(), N1.copy()
    N0t[1:, 1:] += Ab0
    N1t[1:, 1:] += Ab1
    B1 = B1 + float(bl["delta"]) * f(bl["B1g"])
    return dict(B1=B1, N0=N0t[:, 1:], N1=N1t[:, 1:], Y0p=np.array([float(v) for v in bl["Y0p"]]),
                Y0g=np.array([float(v) for v in bl["Y0g"]]), delta=float(bl["delta"]))


def choose_eta(bl, MHf, rho2=1.0, r_frac=0.35, Rfac=32, iters=4000, seed=1, eta0=None):
    """Float search for eta maximising the admissible parameter half-width
        delta_adm = ((1 - Z1)^2 / (2 Z2) - Y0p) / Y0g     (per weighted component, worst case),
    with MHf[k] the 18 x 18 (float) Hessian sup estimates (or the rigorous cover's entries) and P(eta r*) for
    R_i = Rfac eta_i r*. Returns (eta float array normalised to max 1, prediction dict)."""
    d = _blocks_float(bl)
    Q2 = (1 + NU_F * math.exp(-rho2)) / (1 - NU_F * math.exp(-rho2))
    P = (1 - 1.0 / Rfac) ** (-DIM)

    def ev(eta):
        Z1 = max((d["B1"][c] * eta).sum() / eta[c] for c in range(DIM + 1))
        hk = np.array([eta[1:] @ MHf[k] @ eta[1:] for k in range(DIM)]) * Q2 * P
        Z2 = max((2 * eta[0] * eta[1:] * d["N1"][c] + d["N0"][c] * hk).sum() / eta[c] for c in range(DIM + 1))
        if Z1 >= 1:
            return -1.0, Z1, Z2
        cap = (1 - Z1) ** 2 / (2 * Z2)
        # worst component: need (Y0p_c + delta Y0g_c) / eta_c <= cap
        adm = min(((cap * eta[c] - d["Y0p"][c]) / d["Y0g"][c]) if d["Y0g"][c] > 0 else math.inf
                  for c in range(DIM + 1))
        return adm, Z1, Z2

    rng = np.random.default_rng(seed)
    eta = np.ones(DIM + 1) if eta0 is None else np.array(eta0, float)
    best = ev(eta)[0]
    for _ in range(iters):
        c = rng.integers(DIM + 1)
        e2 = eta.copy()
        e2[c] *= math.exp(rng.normal() * 0.8)
        v = ev(e2)[0]
        if v > best:
            best, eta = v, e2
    eta = eta / eta.max()
    adm, Z1, Z2 = ev(eta)
    return eta, dict(delta_admissible=adm, Z1=Z1, Z2=Z2, r_star=r_frac * (1 - Z1) / Z2 if Z1 < 1 else 0.0)


def MH_float(hess):
    """The rigorous cover's entries as an 18 x 18 x 18 float array (symmetric in the last two indices)."""
    out = np.zeros((DIM, DIM, DIM))
    for k in range(DIM):
        for p, (j, l) in enumerate(HPAIRS):
            v = float(hess.MH[k][p])
            out[k, j, l] = out[k, l, j] = v
    return out


# =================================================================================================================
# Gluing (Theorem B3)
# =================================================================================================================
def centre_distance(oA, AA, oB, AB, ETA_B, nu, prec=256):
    """Exact upper bound of ||xbar_A - xbar_B|| in the weights ETA_B (both centres with the same K)."""
    K = (len(AA[0]) - 1) // 2
    if (len(AB[0]) - 1) // 2 != K:
        raise ValueError("centres must have the same K")
    old = ctx.prec
    ctx.prec = prec
    try:
        best = up((oA - oB).abs_upper() / ETA_B[0])
        for i in range(DIM):
            s = arb(0)
            for m in range(-K, K + 1):
                s += (AA[i][m + K] - AB[i][m + K]).abs_upper() * nu ** abs(m)
            best = amax(best, up(s / ETA_B[1 + i]))
    finally:
        ctx.prec = old
    return best


def glue(pa, pb):
    """Check that piece a's existence ball lies in piece b's uniqueness ball and that the pieces overlap in g.
    Returns a record; 'glued' is True only if both hold (certified in Arb)."""
    oa, ob = pa["_obj"], pb["_obj"]
    overlap = Fraction(pb["g_lo"]) <= Fraction(pa["g_hi"]) and Fraction(pa["g_lo"]) <= Fraction(pb["g_hi"])
    d = centre_distance(oa["om_bar"], oa["A"], ob["om_bar"], ob["A"], ob["ETA"], ob["nu"])
    conv = arb(0)
    for ea, eb in zip(oa["ETA"], ob["ETA"]):
        conv = amax(conv, up(ea / eb))
    lhs = up(d + oa["r_lo"] * conv)
    ok = bool(overlap and lhs <= ob["r_hi"])
    return dict(pieces=[[pa["g_lo"], pa["g_hi"]], [pb["g_lo"], pb["g_hi"]]],
                overlap=[str(max(Fraction(pa["g_lo"]), Fraction(pb["g_lo"]))),
                         str(min(Fraction(pa["g_hi"]), Fraction(pb["g_hi"])))] if overlap else None,
                centre_distance=bound_rec(d), norm_conversion=float(conv),
                lhs=bound_rec(lhs), r_uniqueness_b=bound_rec(ob["r_hi"]), glued=ok)


# =================================================================================================================
# Stability (pointwise, Stage S)
# =================================================================================================================
def stability_point(pp, delta, log=print, R_cauchy="1/1024"):
    """Run Stage S (stability.certify, N = 1) on the point proof pp (g_lo = g_hi). The Cauchy polydisc sups M_k with a
    single radius R (Lemma 4.1 of LEMMAS-stability.md) are computed here as existence.py does."""
    import stability as sb
    o = pp["_obj"]
    st = dict(DEFAULTS)
    st.update(pp["settings"])
    A = o["A"]
    K = (len(A[0]) - 1) // 2
    Rk = ex._exact_dyadic_param(R_cauchy, "R")
    with fe.precision(int(st["prec_g"])):
        A_infl = [row[:] for row in A]
        for i in range(DIM):
            A_infl[i][K] = acb(A[i][K].real + Rk * arb(0, 1), Rk * arb(0, 1))
    phi_infl = fe.TrigPoly(A_infl)
    prm53 = params_for(pp["g_lo"], pp["g_hi"], 53)
    f53 = lambda z: am.f(z, prm53, prec=53)  # noqa: E731
    strip_P = fe.strip_sup(f53, phi_infl, o["rho2"], nx=int(st["strip_nx"]), rtol=float(st["strip_rtol"]),
                           max_evals=int(st["strip_max_evals"]))
    if not strip_P.full_strip:
        raise ProofFailure("polydisc cover not full")
    rec_like = dict(r_existence=pp["r_existence"])
    inp = dict(rec=rec_like, rec_sha256=hashlib.sha256(json.dumps(_public(pp), sort_keys=True).encode()).hexdigest(),
               om_bar=o["om_bar"], A=A, K=K, Kp=o["Kp"], M=pp["M"], settings=pp["settings"],
               rho0=o["rho0"], rho=o["rho"], rho2=o["rho2"], R=Rk, ETA=o["ETA"], om_lo=o["om_lo"], om_hi=o["om_hi"],
               r=o["r_lo"], J=o["J"], SJ=o["SJ"], Mk=list(strip_P.S))
    res = sb.certify(1, inp=inp, settings=dict(delta=str(delta)), log=log, K=K)
    keep = ["delta", "delta_exact", "multiplier_bound_full_period", "T_lo", "dist_min", "count_in_Omega",
            "float_leading_nontrivial_window_eigenvalue", "eps_max", "theta_T", "SC_worst_ratio", "wall_s",
            "eigenvalue_in_Omega"]
    return {k: res.get(k) for k in keep}


def _public(d):
    return {k: v for k, v in d.items() if not k.startswith("_")}


def sha256(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


SOURCES = ["fourier/branch.py", "fourier/existence.py", "fourier/centre.py", "fourier/arbmodel.py",
           "fourier/fourier_eval.py", "fourier/tp06_18d_arb.py", "fourier/stability.py", "model/tp06_18d.py",
           "model/scales.txt"]


# =================================================================================================================
# Driver: adaptive pieces in groups (one Hessian cover and one weight vector per group), worker processes per group
# =================================================================================================================
EXPLORE_GRID = ([round(0.0275 + 2.5e-5 * i, 7) for i in range(15)] +
                [round(0.02785 + 1e-5 * i, 7) for i in range(1, 6)] + [0.027905])
RUN_LOG = os.path.join(DATA, "run_K{K}.jsonl")
CENTRES = os.path.join(DATA, "centres_K{K}.jsonl")
GRID = Fraction(1, 10 ** 12)          # piece endpoints are multiples of 1e-12 (exact decimals)


def _dec_round(x, down=True):
    q = Fraction(x) / GRID
    n = q.numerator // q.denominator if down else -((-q.numerator) // q.denominator)
    return n * GRID


def _dstr(fr):
    """Exact decimal string of a Fraction whose denominator is 2^a 5^b."""
    fr = Fraction(fr)
    d, a2, a5 = fr.denominator, 0, 0
    while d % 2 == 0:
        d //= 2
        a2 += 1
    while d % 5 == 0:
        d //= 5
        a5 += 1
    if d != 1:
        raise ValueError(f"{fr} is not a decimal")
    k = max(a2, a5)
    n = abs(fr.numerator) * (10 ** k // fr.denominator)
    s = str(n).rjust(k + 1, "0")
    out = (s[:-k] + "." + s[-k:]).rstrip("0").rstrip(".") if k else s
    assert Fraction(out) == abs(fr)
    return ("-" if fr < 0 else "") + out


def _float_halfwidth_table(K):
    path = os.path.join(DATA, f"float_branch_K{K}.json")
    with open(path) as fh:
        pts = json.load(fh)["points"]
    gs = np.array([p["g"] for p in pts])
    hw = np.array([p["predicted_half_width_eta_opt"] for p in pts])
    return lambda g: float(np.exp(np.interp(float(g), gs, np.log(hw))))


def _append(path, rec):
    with open(path, "a") as fh:
        fh.write(json.dumps(rec) + "\n")


def _read_jsonl(path):
    if not os.path.exists(path):
        return []
    with open(path) as fh:
        return [json.loads(l) for l in fh if l.strip()]


class FloatTrack:
    """Float continuation state (untrusted): (g, omega, a, x1) with the tangent x1 = dx/dg."""

    def __init__(self, K, g=None, om=None, a=None):
        self.K = K
        self.Mc = 4 * K + 64
        self.lay = ct.Layout(K)
        if om is None:
            om, a = stage_e_seed(K)
            g = Fraction(G_STAGE_E)
        self.g, self.om, self.a, self.x1 = Fraction(g), om, a, None
        self._solve(self.g)

    def _solve(self, g):
        om, a, nr = newton_f(self.om, self.a, float(g), self.Mc)
        if not nr < 1e-11:
            raise RuntimeError(f"float Newton failed at g = {g} (|R| = {nr:.2e})")
        G, _ = galerkin_f(om, a, float(g), self.Mc)
        self.x1 = -np.linalg.solve(G, dFdg_f(a, self.Mc))
        self.g, self.om, self.a = Fraction(g), om, a

    def at(self, g):
        dom, da = ct.unpack(self.lay, self.x1 * float(Fraction(g) - self.g))
        self.om, self.a = ct.symmetrize(self.om + dom.real, self.a + da)
        self._solve(g)
        return to_exact_centre(self.om, self.a, 128)


def _worker_init(state):
    global _W
    _W = state


def _piece_job(job):
    """Worker: blocks and assembly of one piece (or a point proof with stability). Returns a JSON-able dict."""
    import traceback
    hb, eta, rstar = _W["hess"][job["hess"]], _W["eta"], _W["rstar"]
    om, A = centre_from_record(job["centre"])
    t0 = time.time()
    try:
        if job["kind"] == "piece":
            res = prove_piece(om, A, job["g_lo"], job["g_hi"], eta=eta, r_star=rstar, hess=hb, log=lambda *a, **k: None,
                              label=job["label"])
            return dict(ok=True, rec=_public(res), wall=time.time() - t0)
        pp = prove_piece(om, A, job["g_lo"], job["g_hi"], eta=eta, r_star=rstar, hess=hb, log=lambda *a, **k: None,
                         label=job["label"])
        st = stability_point(pp, job["delta"], log=lambda *a, **k: None)
        return dict(ok=True, rec=_public(pp), stability=st, wall=time.time() - t0)
    except ProofFailure as e:
        return dict(ok=False, why=str(e), diag=getattr(e, "diag", None), wall=time.time() - t0)
    except Exception as e:  # noqa: BLE001  (recorded, never counted as a proof)
        return dict(ok=False, why=f"{type(e).__name__}: {e}", trace=traceback.format_exc()[-2000:], wall=time.time() - t0)


def run(K=16, g_stop="0.02790", n_per_group=8, workers=2, budget_s=3300, factor0=0.2, log=print):
    """Adaptive branch run, resumable from the run log. Each group: centres (float continuation), blocks of the first
    piece, weights eta (float search on the rigorous blocks), r_*, radii R, one Hessian cover, then all pieces (and one
    point proof with Stage S) in worker processes; failed pieces are split and retried with their own cover."""
    import multiprocessing as mp
    T0 = time.time()
    runlog, cpath = RUN_LOG.format(K=K), CENTRES.format(K=K)
    os.makedirs(DATA, exist_ok=True)
    hwf = _float_halfwidth_table(K)
    recs = _read_jsonl(runlog)
    centres = {r["g"]: r for r in _read_jsonl(cpath)}
    pieces = [r for r in recs if r["type"] == "piece"]
    groups = [r for r in recs if r["type"] == "group"]
    if pieces:
        last = max(pieces, key=lambda r: Fraction(r["rec"]["g_hi"]))
        c = centres[last["rec"]["centre_g"]]
        om, A = centre_from_record(c)
        trk = FloatTrack(K, Fraction(c["g"]), float(om), centre_float(A))
        next_lo = Fraction(last["rec"]["g_hi"]) - Fraction(groups[-1]["overlap_frac"]) * \
            (Fraction(last["rec"]["g_hi"]) - Fraction(last["rec"]["g_lo"]))
        next_lo = _dec_round(next_lo, down=True)
        factor = groups[-1]["factor_next"]
        eta_prev = np.array([float(Fraction(e)) for e in groups[-1]["eta"]])
        MH_prev = np.array(groups[-1]["MH_float"])
        first = False
    else:
        trk = FloatTrack(K)
        factor, eta_prev, MH_prev, first, next_lo = factor0, None, None, True, None
    ovl = Fraction(1, 10)
    gid = len(groups)
    while Fraction(next_lo or 0) < Fraction(g_stop) and time.time() - T0 < budget_s:
        tg = time.time()
        # ---- plan the group's pieces
        plan = []
        lo_ = next_lo
        for j in range(n_per_group):
            if first and j == 0:
                gc = Fraction(G_STAGE_E)
                hw = _dec_round(factor * hwf(gc), down=True)
                lo_ = gc - hw
                hi_ = gc + hw
            else:
                hw = _dec_round(factor * hwf(lo_), down=True)
                hi_ = lo_ + 2 * hw
                gc = (lo_ + hi_) / 2
            if hw <= 0:
                raise RuntimeError("planned width rounds to 0")
            plan.append(dict(g_lo=lo_, g_hi=hi_, g_c=gc))
            lo_ = _dec_round(hi_ - ovl * (hi_ - lo_), down=True)
            if hi_ >= Fraction(g_stop):
                break
        for p in plan:
            om, A = trk.at(p["g_c"])
            crec = centre_record(_dstr(p["g_c"]), om, A, [])
            centres[crec["g"]] = crec
            _append(cpath, crec)
            p["centre"] = crec
        # ---- weights and radii from the first piece's rigorous blocks
        om0, A0 = centre_from_record(plan[0]["centre"])
        bl0 = piece_blocks(om0, A0, _dstr(plan[0]["g_lo"]), _dstr(plan[0]["g_hi"]), log=lambda *a, **k: None)
        if MH_prev is None:
            fp = FloatPoint(trk.om, trk.a, float(plan[0]["g_c"]))
            MH_est = 2.5 * fp.H
        else:
            MH_est = MH_prev
        eta_f, pred = choose_eta(bl0, MH_est, eta0=eta_prev)
        if eta_prev is not None:
            keep = choose_eta(bl0, MH_est, iters=0, eta0=eta_prev)[1]
            if keep["delta_admissible"] > 0.9 * pred["delta_admissible"]:
                eta_f, pred = eta_prev / eta_prev.max(), keep
        eta = dyadic_eta(eta_f, bits=20)
        rs = 0.9 * pred["r_star"] / 0.35 if pred["r_star"] > 0 else 1e-9
        rstar = f"{max(1, int(rs * 2 ** 60))}/{2 ** 60}"
        Rs = [f"{max(1, int(32 * float(Fraction(eta[1 + i])) * rs * 2 ** 60))}/{2 ** 60}" for i in range(DIM)]
        hb = HessBound([centre_from_record(p["centre"]) for p in plan], _dstr(plan[0]["g_lo"]),
                       _dstr(plan[-1]["g_hi"]), Rs, "1", None, log=lambda *a, **k: None)
        # ---- all pieces and one point proof (+ Stage S) in workers
        fp0 = FloatPoint(*(lambda c: (float(c[0]), centre_float(c[1])))(centre_from_record(plan[0]["centre"])),
                         float(plan[0]["g_c"]), need_hess=False)
        lead = fp0.leading_nontrivial()[0]
        delta_s = f"{0.85 * abs(lead):.3e}"
        jobs = [dict(kind="piece", hess=0, g_lo=_dstr(p["g_lo"]), g_hi=_dstr(p["g_hi"]), centre=p["centre"],
                     label=f"G{gid}P{j}") for j, p in enumerate(plan)]
        jobs.append(dict(kind="point", hess=0, g_lo=_dstr(plan[0]["g_c"]), g_hi=_dstr(plan[0]["g_c"]),
                         centre=plan[0]["centre"], label=f"G{gid}point", delta=delta_s))
        state = dict(hess={0: hb}, eta=eta, rstar=rstar)
        ctxp = mp.get_context("fork")
        with ctxp.Pool(workers, initializer=_worker_init, initargs=(state,)) as pool:
            outs = pool.map(_piece_job, jobs, chunksize=1)
        # ---- failures: split once, with a cover of their own
        done = []
        for j, (job, o) in enumerate(zip(jobs[:-1], outs[:-1])):
            if o["ok"]:
                done.append((job, o))
                continue
            log(f"  piece {job['label']} [{job['g_lo']}, {job['g_hi']}] FAILED: {o['why'][:160]}; splitting")
            _append(runlog, dict(type="failure", group=gid, job={k: v for k, v in job.items() if k != "centre"},
                                 why=o["why"], diag=o.get("diag")))
            lo1, hi2 = Fraction(job["g_lo"]), Fraction(job["g_hi"])
            w = hi2 - lo1
            mid = (lo1 + hi2) / 2
            subs = [(lo1, _dec_round(mid + w / 20, down=False)), (_dec_round(mid - w / 20, down=True), hi2)]
            sub_plan = []
            for a_, b_ in subs:
                gc = (a_ + b_) / 2
                om, A = trk_at_any(K, centres, gc)
                crec = centre_record(_dstr(gc), om, A, [])
                centres[crec["g"]] = crec
                _append(cpath, crec)
                sub_plan.append(dict(kind="piece", hess=1, g_lo=_dstr(a_), g_hi=_dstr(b_), centre=crec,
                                     label=job["label"] + "s" + str(len(sub_plan))))
            hb2 = HessBound([centre_from_record(p["centre"]) for p in sub_plan], sub_plan[0]["g_lo"],
                            sub_plan[-1]["g_hi"], Rs, "1", None, log=lambda *a, **k: None)
            state2 = dict(hess={1: hb2}, eta=eta, rstar=rstar)
            with ctxp.Pool(workers, initializer=_worker_init, initargs=(state2,)) as pool:
                outs2 = pool.map(_piece_job, sub_plan, chunksize=1)
            for sj, so in zip(sub_plan, outs2):
                if not so["ok"]:
                    _append(runlog, dict(type="failure", group=gid, job={k: v for k, v in sj.items() if k != "centre"},
                                         why=so["why"], diag=so.get("diag")))
                    raise RuntimeError(f"piece {sj['label']} failed after splitting: {so['why'][:200]}")
                so["hess_record"] = hb2.record()
                done.append((sj, so))
        done.sort(key=lambda t: Fraction(t[0]["g_lo"]))
        for job, o in done:
            _append(runlog, dict(type="piece", group=gid, rec=o["rec"], wall=o["wall"],
                                 hess_record=o.get("hess_record")))
        pt = outs[-1]
        _append(runlog, dict(type="point", group=gid, ok=pt["ok"], g=jobs[-1]["g_lo"], delta_requested=delta_s,
                             float_leading_exponent=lead, rec=pt.get("rec"), stability=pt.get("stability"),
                             why=pt.get("why"), wall=pt["wall"]))
        # ---- adapt the width factor to the achieved Y0 / cap
        us = []
        for job, o in done:
            dg = o["rec"]["diag"]
            cap = (1 - dg["Z1"]) ** 2 / (2 * dg["Z2"])
            us.append(dg["Y0"] / cap)
        umax = max(us)
        fails = sum(1 for o in outs[:-1] if not o["ok"])
        factor_next = factor * min(1.4, max(0.6, 0.55 / umax)) * (0.8 if fails else 1.0)
        MHf = MH_float(hb)
        _append(runlog, dict(type="group", group=gid, g_lo=_dstr(plan[0]["g_lo"]), g_hi=_dstr(plan[-1]["g_hi"]),
                             n_pieces=len(done), failures=fails, eta=eta, r_star=rstar, R=Rs,
                             hess=hb.record(), MH_float=MHf.tolist(), factor=factor, factor_next=factor_next,
                             overlap_frac=str(ovl), Y0_over_cap=us, predicted=pred, wall_s=round(time.time() - tg, 1)))
        log(f"group {gid}: [{_dstr(plan[0]['g_lo'])}, {_dstr(plan[-1]['g_hi'])}] {len(done)} pieces, {fails} split, "
            f"Y0/cap max {umax:.2f}, factor {factor:.3f} -> {factor_next:.3f}, point stability "
            f"{'ok' if pt['ok'] else 'FAILED: ' + str(pt.get('why'))[:120]}, {time.time() - tg:.0f} s")
        factor, eta_prev, MH_prev, first = factor_next, np.array([float(Fraction(e)) for e in eta]), MHf, False
        lastp = done[-1][0]
        next_lo = _dec_round(Fraction(lastp["g_hi"]) - ovl * (Fraction(lastp["g_hi"]) - Fraction(lastp["g_lo"])), True)
        gid += 1
        if Fraction(lastp["g_hi"]) >= Fraction(g_stop):
            break
    return gid


def trk_at_any(K, centres, gc):
    """Float centre at gc from the nearest stored centre (untrusted)."""
    best = min(centres.values(), key=lambda c: abs(Fraction(c["g"]) - gc))
    om, A = centre_from_record(best)
    trk = FloatTrack(K, Fraction(best["g"]), float(om), centre_float(A))
    return trk.at(gc)


def obj_from_record(rec, centre):
    """Exact data for gluing from a piece record and its centre record."""
    om, A = centre_from_record(centre)
    if centre_digest(om, A) != rec["centre_sha256"]:
        raise ValueError("centre does not match the piece record")
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


def collect(K=16, write=True, log=print):
    """Re-check gluing in Arb from the stored exact data and write results/fourier-branch-gks.json."""
    runlog, cpath = RUN_LOG.format(K=K), CENTRES.format(K=K)
    recs = _read_jsonl(runlog)
    centres = {r["g"]: r for r in _read_jsonl(cpath)}
    pieces = sorted([r for r in recs if r["type"] == "piece"], key=lambda r: Fraction(r["rec"]["g_lo"]))
    groups = [r for r in recs if r["type"] == "group"]
    points = [r for r in recs if r["type"] == "point"]
    fails = [r for r in recs if r["type"] == "failure"]
    glue_recs = []
    connected_to = None
    for i in range(len(pieces) - 1):
        pa, pb = pieces[i]["rec"], pieces[i + 1]["rec"]
        oa = obj_from_record(pa, centres[pa["centre_g"]])
        ob = obj_from_record(pb, centres[pb["centre_g"]])
        g = glue(dict(pa, _obj=oa), dict(pb, _obj=ob))
        glue_recs.append(g)
        if not g["glued"] and connected_to is None:
            connected_to = i
    n_conn = len(pieces) if connected_to is None else connected_to + 1
    lo_all, hi_all = pieces[0]["rec"]["g_lo"], pieces[n_conn - 1]["rec"]["g_hi"]
    table = []
    for r in pieces:
        p = r["rec"]
        table.append(dict(g=[p["g_lo"], p["g_hi"]], g_centre=p["centre_g"],
                          T_ms=[p["T_ms"]["lower"]["dec"], p["T_ms"]["upper"]["dec"]],
                          r_existence=p["r_existence"], r_uniqueness=p["r_uniqueness"], Y0=p["Y0"], Z1=p["Z1"],
                          Z2=p["Z2"], r_star=p["r_star"], contraction=p["contraction_at_r_uniqueness"]["approx"],
                          Y0_over_cap=p["diag"]["Y0"] / ((1 - p["diag"]["Z1"]) ** 2 / (2 * p["diag"]["Z2"])),
                          eta=p["eta"], centre_sha256=p["centre_sha256"], hessian_cover=p["hessian_cover"],
                          label=p["label"], wall_s=r["wall"]))
    stab = []
    for r in points:
        d = dict(g=r["g"], ok=r["ok"], delta_requested=r["delta_requested"],
                 float_leading_exponent=r["float_leading_exponent"], wall_s=r["wall"], uniform=False,
                 note="pointwise: Stage S at this single g only (section 6)")
        if r["ok"]:
            s = r["stability"]
            d.update(delta=s["delta"], multiplier_bound_full_period=s["multiplier_bound_full_period"],
                     dist_min=s["dist_min"], eps_max=s["eps_max"], point_T_ms=r["rec"]["T_ms"],
                     point_r_existence=r["rec"]["r_existence"])
        else:
            d["why"] = r.get("why")
        stab.append(d)
    # comparisons
    with open(os.path.join(RESULTS, "fourier-existence-N1.json")) as fh:
        se = json.load(fh)
    cmp_ = []
    for r in pieces:
        p = r["rec"]
        if Fraction(p["g_lo"]) <= Fraction(G_STAGE_E) <= Fraction(p["g_hi"]):
            a_, b_ = Fraction(p["T_ms"]["lower"]["dec"]), Fraction(p["T_ms"]["upper"]["dec"])
            A_, B_ = Fraction(se["T_ms"]["lower"]["dec"]), Fraction(se["T_ms"]["upper"]["dec"])
            cmp_.append(dict(piece=[p["g_lo"], p["g_hi"]], stage_E_T_ms=[se["T_ms"]["lower"]["dec"],
                                                                         se["T_ms"]["upper"]["dec"]],
                             overlaps=bool(a_ <= B_ and A_ <= b_), stage_E_inside=bool(a_ <= A_ and B_ <= b_)))
    out = dict(
        what="Rec 2: certified branch of the single-cell periodic orbit of Erhardt's 18-state TP06 endocardial model "
             "over G_Ks intervals toward the first Hopf point (fourier/branch.py)",
        status="computed; awaiting adversarial review",
        theorem=theorem_text(lo_all, hi_all),
        g_covered=[lo_all, hi_all], connected_pieces=n_conn, n_pieces=len(pieces),
        largest_g_reached=hi_all, hopf_point_erhardt=str(G_HOPF),
        distance_to_hopf=float(G_HOPF - Fraction(hi_all)),
        pieces=table, gluing=glue_recs, stability=stab, stability_uniform=False,
        stability_note=("Stage S was run at one exact g per group (pointwise). Uniform stability on a piece is NOT "
                        "claimed: see fourier/branch.py section 6 for what it would need."),
        comparison_stage_E=cmp_, failures_split=len(fails),
        groups=[{k: v for k, v in g.items() if k != "MH_float"} for g in groups],
        settings=dict(DEFAULTS, K=K),
        sources_sha256={p: sha256(os.path.join(ROOT, p)) for p in SOURCES},
        run_log=os.path.relpath(runlog, ROOT), run_log_sha256=sha256(runlog),
        centres_file=os.path.relpath(cpath, ROOT), centres_sha256=sha256(cpath),
        python_flint=flint.__version__, FLINT=flint.__FLINT_VERSION__, python=platform.python_version(),
        machine=platform.machine(), date=time.strftime("%Y-%m-%d"),
        total_piece_wall_s=round(sum(r["wall"] for r in pieces), 1))
    if write:
        path = os.path.join(RESULTS, "fourier-branch-gks.json")
        with open(path, "w") as fh:
            json.dump(out, fh, indent=1)
            fh.write("\n")
        log(f"wrote {path}: {len(pieces)} pieces, connected [{lo_all}, {hi_all}]")
    return out


def theorem_text(lo_, hi_):
    return (f"For Erhardt's 18-state TP06 endocardial cell (single cell) and every G_Ks in [{lo_}, {hi_}] there are "
            "omega*(G_Ks) > 0 and a real 2 pi periodic phi*(.; G_Ks), analytic on |Im theta| < 1/4, with "
            "omega* phi*' = f(phi*; G_Ks) and Im of the first Fourier coefficient of phi*_V equal to 0, such that, on "
            "each piece listed, (omega*, Fourier coefficients of phi*) is the only zero of F(.; G_Ks) in the piece's "
            "uniqueness ball about its centre (X = C x (l^1_nu)^18, nu = e^{1/4}, the piece's weights) and lies in its "
            "existence ball; z(t) = phi*(omega* t) is a periodic orbit of minimal period T = 2 pi / omega* with T in the "
            "piece's T_ms enclosure for every G_Ks of the piece; G_Ks -> (omega*, phi*) is continuous on the whole "
            "interval (Lipschitz on each piece, pieces glued by ball inclusion on their overlaps), so the orbits form "
            "one continuous branch. Stability is certified only at the listed points (pointwise, Stage S).")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--explore", action="store_true")
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--collect", action="store_true")
    ap.add_argument("--K", type=int, default=16)
    ap.add_argument("--g-stop", default="0.02790")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--per-group", type=int, default=8)
    ap.add_argument("--budget", type=float, default=3300)
    a = ap.parse_args()
    if a.explore:
        out = explore(EXPLORE_GRID, K=a.K)
        path = os.path.join(DATA, f"float_branch_K{a.K}.json")
        with open(path, "w") as fh:
            json.dump(dict(what="float (NON-RIGOROUS) continuation of the single-cell branch with the Fourier phase "
                                "condition; Hill-matrix Floquet exponents; predicted admissible half-widths",
                           K=a.K, points=out), fh, indent=1)
        print("wrote", path)
    if a.run:
        run(K=a.K, g_stop=a.g_stop, n_per_group=a.per_group, workers=a.workers, budget_s=a.budget)
    if a.collect:
        collect(K=a.K)


if __name__ == "__main__":
    main()
