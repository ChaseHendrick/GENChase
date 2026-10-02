"""Theorem C: linear stability of the certified G_Ks branch, uniformly in G_Ks on each branch piece (Arb).

Status: computed; awaiting adversarial review. Nothing written by this program is "verified". It is conditional on
Theorem B of fourier/branch.py (the branch pieces, their weights, radii and run log) and on the Stage S lemmas of
fourier/LEMMAS-stability.md, sections 1 to 4 and section 10 ("Uniformity in a parameter"), which this file implements.
stability.py is imported and NOT edited; the parts of its certificate that change are rewritten here, and the parts
that do not change are copied with the same names, so a reviewer can compare them line by line (see "Relation to
stability._certify" below).

Why the pointwise certificate cannot be fed a piece (diagnosis of the failed uniform attempt, theta_T = 9.7e12)
-------------------------------------------------------------------------------------------------------------
branch.uniform_stability_attempt gave Stage S the piece's existence radius r_lo (about 3.8e-4 in the piece's weights)
as the radius of the ball around the centre in which the orbit lies, with the polydisc radius R = 2^-10 and the
CAUCHY bound of Lemma 4.1: eps_kl = (M_k / R) [(1 - t_l / R)^-1 prod_j (1 - t_j / R)^-1 - 1], t_j = eta_j r_lo. Here t_V / R
is about 0.39 and the product over 18 components is several units, so eps_kl is about M_k / R, i.e. 10^3 to 10^5 in the
scaled variables, and the power-of-two cell coordinates of Stage S (exponents from -11 to 29) multiply entry (k, l) by
2^(e_l - e_k), up to 2^40. That is where 9.7e12 comes from: the tail test theta_T = (sigma_off + ||A_0 - A0c||) rho_T
sees the eps-ball of every coefficient. Two separate things are wrong with that input, and both are addressed here.
  (i) The Cauchy bound is first order in t only through the factor M_k / R^2: it is about 10^6 times the true size of
      Df(phi*) - Df(phibar), which is about |D^2 f| t. Section 10 replaces it by the Hessian bound of Lemma B2
      (eps_kl = sum_j MH_{k,(l,j)} t_j), which is sharp to first order.
  (ii) Even with the sharp bound, a ball of radius r_lo around a constant centre is first order in the width of the
      piece: the orbit really moves by ||dx/dg|| (g - g_c), about 3e-4 in these units, and the Hill coefficients by
      about 1.1e2 (g - g_c) in the 1-norm of the cell coordinates (floating-point measurement, scratch exp1), i.e.
      about 3e-5 on a piece. The near-axis margin is 7e-6 (the leading nontrivial exponent -4.71e-5 against
      delta = 4e-5), and the column sums of V^-1 dH/dg V on the two critical columns are about 4e2, so a certificate
      with the comparison operator of g_c alone needs half-widths below about 2e-8 (15 times smaller than the pieces).
Section 10 therefore (a) locates the orbit to SECOND order, x*(g) in a ball of radius rho ~ 1e-7 about the affine
centre xbar + (g - g_c) xbar_1, xbar_1 the (float, exact) tangent (Lemma 10.1), (b) writes the Hill coefficients as
J0_n + (g - g_c) J1c_n + (a ball that is second order) (Lemma 10.2), and (c) applies Theorem 3 at each g with a
comparison operator that depends on g affinely: V(g) = V0 + (g - g_c) V1, Lambda(g) = Lambda0 + (g - g_c) Lambda1 from
first-order eigen-perturbation theory, so the first-order part of V(g)^-1 H(g) V(g) - Lambda(g) cancels except on pairs
of nearly equal eigenvalues (Lemma 10.3). The column sums are bounded uniformly in g by a polynomial in |g - g_c| with
Arb coefficients.

What is computed for one piece P = [g_lo, g_hi] of the branch record (centre g_c, half-width h, weights eta)
-------------------------------------------------------------------------------------------------------------
 1. branch.piece_blocks at the stored centre (the same A, B1, B1g, Y0p as Theorem B), and branch.assemble with a
    Hessian cover (Lemma B2) of the family phibar + [-h, h] phibar_1 over the piece's g range with the group's radii R
    and r_*: Z1, Z2 for every g in P (Theorem B1). The recomputed Y0 and Z1 must equal the logged hex values (checked;
    a mismatch fails the piece), so the operator A is the one of Theorem B.
 2. xbar_1 = (omega_1, a_1): the Galerkin tangent -DF^-1 d_gF in floating point, made conjugation symmetric with
    Im a_{1,V} = 0 exactly (so F_ph(xbar_1) = 0 exactly), rounded to exact doubles. Untrusted; only its quality matters.
 3. Lemma 10.1 (Arb): Fourier enclosures of G1 = d/dd f(phibar + d phibar_1; g_c + d) at d = 0 and of
    G2 = d^2/dd^2 f(...) over d in [-h, h] (forward-mode dual numbers in d, class branch.Hess with one variable, strip
    sup and aliased DFT of fourier_eval on the 36-component trigonometric polynomial (phibar, phibar_1)); then
    Y' = max_c (Y0p_c + h Y1_c + h^2 Y2_c) / eta_c >= sup_g ||A F(xtilde(g); g)||, e = h ||xbar_1||, and an exact rho
    with kappa := Z1 + Z2 (e + rho) < 1, Y' <= (1 - kappa) rho, e + rho <= r_* and e + rho <= r_hi (logged).
 4. Lemma 10.2 (Arb): [J0_n] = Stage E-type enclosures of Df(phibar) at g_c (piece_blocks' J, K' = 2K + L), S_J0;
    [J1box_n], S_J1: enclosures of J1(theta; d) = d/dd Df(phibar + d phibar_1; g_c + d) for every d in [-h, h] (Hess with
    the 18 states and g as variables, base point the d-box); J1c_n := exact midpoints, rad1_n := |[J1box_n] - J1c_n|;
    eps_W,kl := sum_j MH_{k,(l,j)} t_j, t_j = eta_j rho < R_j (the Hessian cover of step 1, which contains the polydisc
    of radii R around every phibar + d phibar_1). For every g in P and every n:
        A_n(g) in [J0_n] + (g - g_c) J1c_n + ball(h rad1_n + eps_W e^{-rho_e |n|})          (|n| <= K'),
        |A_n(g)| <= (S_J0 + h S_J1) e^{-rho |n|} + eps_W e^{-rho_e |n|}                       (every n),
        omega*(g) in omega_bar + (g - g_c) omega_1 + ball(eta_om rho).
 5. Lemma 10.3 / Theorem 10.4 (certify_uniform): Theorem 3 of the lemma file at every g in P, with route A tail and the
    (SC) small gain, the tail quantities from the g-uniform balls of step 4 and the window from the affine expansion.

Relation to stability._certify
------------------------------
Steps 1 to 5 and 8 to 10 of certify_uniform below are those of stability._certify (same order, same names), with two
changes: (a) the coefficient balls are the g-uniform balls of step 4 (_certify builds them from [J_n] and the Cauchy
eps of Lemma 4.1), and omega_lo / omega_hi bound omega*(g) over the whole piece; (b) the window (steps 6, 7) uses the
affine data V(d), Vi(d), Lambda(d) and the polynomial bounds of Lemma 10.3. Everything else, including route A, the S
search, the distances and count, the couplings and (SC), is the same code.

Trusted: python-flint 0.9.0 (Arb); fourier/arbmodel.py, tp06_18d_arb.py, fourier_eval.py (Lemmas 1-3); branch.py
(Theorem B: piece_blocks, assemble, HessBound, Hess); the imported helpers of stability.py and existence.py; this file.
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

# One BLAS thread, set before numpy is imported: A_fin is a float inverse, and a multithreaded LAPACK changes its last
# bits, hence the last bits of the (equally rigorous) bounds; prove_piece_uniform requires Theorem B's Y0 and Z1 to be
# reproduced bit for bit, which needs the run's single-threaded inverse.
_NUMPY_PREIMPORTED = "numpy" in sys.modules
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "BLIS_NUM_THREADS"):
    os.environ[_v] = "1"

import numpy as np  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import flint  # noqa: E402
from flint import acb, acb_mat, arb, arb_mat, ctx, fmpq  # noqa: E402

import arbmodel as am  # noqa: E402
import branch as br  # noqa: E402
import centre as ct  # noqa: E402
import existence as ex  # noqa: E402
import fourier_eval as fe  # noqa: E402
import stability as sb  # noqa: E402

DIM = 18
IV = 0
RESULTS = os.path.join(ROOT, "results")
DATA = br.DATA
LOG = os.path.join(DATA, "stability_uniform_K{K}.jsonl")
up, lo, amax, bound_rec = ex.up, ex.lo, ex.amax, ex.bound_rec
QUIET = lambda *a, **k: None  # noqa: E731


class ProofFailure(RuntimeError):
    """An inequality of Theorem C could not be certified on this piece (nothing is claimed there)."""


FAILURES = (ProofFailure, br.ProofFailure, sb.ProofFailure, sb.InputMismatch)

DEFAULTS = dict(
    delta="3e-5",            # requested decay rate per ms (rounded up to a dyadic, as in stability.py)
    Ke_offset=12, n_c=24, prec=128,     # K_e = 12 (stability.py: 16): measured on G16P15, (SC) worst ratio 0.50 at
                                         # K_e = 12 against 0.48 at 16, certificate 43 s against 76 s
    eta_tail="1/1048576", S_exps=None, zeta="ones",
    cluster_tols=[0.0, 1e-3, 3e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2],
    sanity_tol="1e-6",
    tau="1e-3",              # eigenvalue pairs closer than tau are not separated by the first-order correction
    rho_margin="1/64",       # rho = (1 + rho_margin) Y' / (1 - Z1 - Z2 e), then rechecked in Arb
    strip_max_evals=1200,    # budget of the three new strip covers (their S only enters aliasing and the Cauchy
                             # tail beyond K', both negligible here; a smaller budget only loosens S, never a bound)
)


# =================================================================================================================
# Exact data from the branch record
# =================================================================================================================
_LOGS = {}


def _logs(K):
    key = (K, br.sha256(br.RUN_LOG.format(K=K)), br.sha256(br.CENTRES.format(K=K)))
    if key not in _LOGS:
        _LOGS.clear()
        _LOGS[key] = br.validate_logs(K, reglue=False, log=QUIET, repair=False)
    return _LOGS[key]


def piece_data(label, K=12):
    """The logged piece (record), its group, and its exact centre (digest checked)."""
    pieces, groups, centres = _logs(K)
    p = next((r for r in pieces if r["rec"]["label"] == label), None)
    if p is None:
        raise KeyError(f"no piece {label}")
    rec = p["rec"]
    grp = groups[p["group"]]
    om, A = br.centre_from_record(centres[br._dstr(Fraction(rec["centre_g"]))])
    if br.centre_digest(om, A) != rec["centre_sha256"]:
        raise ValueError("centre digest mismatch")
    return rec, grp, om, A


# =================================================================================================================
# Step 2: the tangent (untrusted, exact)
# =================================================================================================================
def tangent(om, A, g_c):
    """Float Galerkin tangent xbar_1 = -DF(xbar)^-1 d_gF(xbar) at g_c, symmetric, Im a1_{1,V} = 0, exact doubles."""
    K = (len(A[0]) - 1) // 2
    a = br.centre_float(A)
    Mc = 8 * (4 * K + 64)
    G, _ = br.galerkin_f(float(om), a, float(Fraction(g_c)), Mc)
    x1 = -np.linalg.solve(G, br.dFdg_f(a, Mc))
    lay = ct.Layout(K)
    om1, a1 = ct.unpack(lay, x1)
    om1, a1 = ct.symmetrize(om1, a1)
    a1[IV, K + 1] = a1[IV, K + 1].real
    a1[IV, K - 1] = a1[IV, K - 1].real
    om1b, A1 = ct.to_exact(om1, a1, 128)
    return om1b, A1


# =================================================================================================================
# Black boxes (fourier_eval contract) on the 36 inputs (phibar(theta), phibar_1(theta)); d = g - g_c
# =================================================================================================================
def _dball(h):
    """A real ball containing [-h, h] (h an exact Fraction), or the exact 0."""
    if h == 0:
        return acb(0)
    return acb(arb(0, arb(fmpq(h.numerator, h.denominator)).upper()))


def taylor_flat(zz, prm, D, which, prec=53):
    """which = 1: d/dd f(phibar + d phibar_1; g_c + d) at the base point D (D = 0 for G1);
       which = 2: d^2/dd^2 f(...) over the base point D (the box [-h, h] for G2).
    One dual variable d (branch.Hess); g_Ks = (g_c + D) + d e_0, z_i = zc_i + D z1_i + d z1_i. Raises outside the
    certified domain (Hess checks every intermediate)."""
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(prm)
        p["g_Ks"] = br.Hess(am.to_ball(prm["g_Ks"]) + D, {0: acb(1)})
        x = []
        for i in range(DIM):
            s = am.SIG[i]
            zc, z1 = am.to_ball(zz[i]), am.to_ball(zz[DIM + i])
            x.append(br.Hess((zc + D * z1) * s, {0: z1 * s}))
        y = fn(x, p, br.HessMath, acb(0))
        out = []
        for k, yk in enumerate(y):
            if not isinstance(yk, br.Hess):
                br._chk(am.to_ball(yk))
                out.append(acb(0))
                continue
            v = yk.g.get(0, acb(0)) if which == 1 else yk.h.get((0, 0), acb(0))
            out.append(br._chk(v * am.ISIG[k]))
    return out


def j1_flat(zz, prm, D, prec=53):
    """The 324 entries (row-major) of J1 = d/dd Df(phibar + d phibar_1; g_c + d) = sum_l D_l Df phibar_1,l + d_g Df,
    enclosed over the base point D (the box [-h, h]): branch.Hess with the 18 states and g_Ks as variables."""
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(prm)
        p["g_Ks"] = br.Hess(am.to_ball(prm["g_Ks"]) + D, {DIM: acb(1)})
        z1 = [am.to_ball(zz[DIM + i]) for i in range(DIM)]
        x = [br.Hess((am.to_ball(zz[i]) + D * z1[i]) * s, {i: s}) for i, s in enumerate(am.SIG)]
        y = fn(x, p, br.HessMath, acb(0))
        zero = acb(0)
        out = []
        for k, yk in enumerate(y):
            yk = br._lift(yk) if not isinstance(yk, br.Hess) else yk
            hk = yk.h
            for j in range(DIM):
                s = hk.get((j, DIM), zero)
                for l in range(DIM):
                    s = s + hk.get((min(j, l), max(j, l)), zero) * z1[l]
                out.append(br._chk(s * am.ISIG[k]))
    return out


# =================================================================================================================
# Step 3: Lemma 10.1 (second-order location of x*(g))
# =================================================================================================================
def _y_parts(bl, coef, S, lin, scale):
    """Per-component bounds of ||(A v)_c|| (c = 0 the omega/phase component, 1 + k the state components) for the
    vector v = (0, (lin_m - scale coef_m)_m) with lin_m given for |m| <= K (zero beyond) and coef the Fourier
    enclosure (|m| <= K') of a nonlinear term with strip bound S (|coef_m| <= S e^{-rho |m|} for all m). The same three
    parts as branch.piece_blocks.y0_parts (finite rows A_fin v_fin, explicit A_m on K < |m| <= K' (Abar0 beyond the
    explicit range), the Cauchy tail Abar0 scale S tailK beyond K'); only the linear term and the scale differ."""
    K, Kp = bl["K"], bl["_Kp"]
    lay = ct.Layout(K)
    n = lay.n
    nupow, tailK, Afin, Aexp, Abar0 = bl["_nupow"], bl["_tailK"], bl["_Afin"], bl["_A_explicit"], bl["Abar0"]
    comp_of = [None] + [k for k in range(DIM) for _ in range(lay.L)]
    mode_of = [0] + [m for _ in range(DIM) for m in range(-K, K + 1)]
    old = ctx.prec
    ctx.prec = int(bl["settings"]["prec_g"])
    try:
        sc = scale if isinstance(scale, arb) else arb(scale)
        Ffin = acb_mat(n, 1)
        for i in range(DIM):
            for m in range(-K, K + 1):
                Ffin[lay.idx(i, m), 0] = lin[i][m + K] - sc * coef[i][m + Kp]
        AF = Afin * Ffin
        Yc = [arb(0)] * (DIM + 1)
        for r in range(n):
            c = 0 if comp_of[r] is None else 1 + comp_of[r]
            Yc[c] = Yc[c] + AF[r, 0].abs_upper() * nupow[abs(mode_of[r])]
        Ab0 = arb_mat(Abar0)
        for m in range(K + 1, Kp + 1):
            Am = Aexp.get(m)
            for sgn in (1, -1):
                gv = acb_mat([[sc * coef[k][sgn * m + Kp]] for k in range(DIM)])
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
                s += Abar0[c][k] * sc * S[k]
            Yc[1 + c] = Yc[1 + c] + s * tailK
        return [up(v) for v in Yc]
    finally:
        ctx.prec = old


def x1_norm(om1, A1, ETA, nu):
    K = (len(A1[0]) - 1) // 2
    best = up(om1.abs_upper() / ETA[0]) if isinstance(om1, arb) else up(arb(om1).abs_upper() / ETA[0])
    for i in range(DIM):
        s = arb(0)
        for m in range(-K, K + 1):
            s += A1[i][m + K].abs_upper() * nu ** abs(m)
        best = amax(best, up(s / ETA[1 + i]))
    return best


def locate(bl, om1, A1, encG1, encG2, ETA, Z1, Z2, r_star, r_hi, margin, _mutate=()):
    """Lemma 10.1. Returns dict(rho, e, Yprime, kappa, Y-parts) or raises ProofFailure."""
    K = bl["K"]
    A, om_bar = bl["A"], bl["om_bar"]
    h = bl["delta"]                                          # exact upper bound of max |g - g_c| on the piece
    old = ctx.prec
    ctx.prec = int(bl["settings"]["prec_g"])
    try:
        if not (A1[IV][K + 1] - A1[IV][K - 1]).is_zero():
            raise ProofFailure("F_ph(xbar_1) is not exactly 0")
        lin1 = [[acb(0, m) * (om_bar * A1[i][m + K] + om1 * A[i][m + K]) for m in range(-K, K + 1)]
                for i in range(DIM)]
        lin2 = [[acb(0, m) * om1 * A1[i][m + K] for m in range(-K, K + 1)] for i in range(DIM)]
        Y1 = _y_parts(bl, encG1.c, encG1.S, lin1, arb(1))
        Y2 = _y_parts(bl, encG2.c, encG2.S, lin2, arb(fmpq(1, 2)))
        Y0p = bl["Y0p"]
        if "drop_second_order" in _mutate:
            Y2 = [arb(0)] * (DIM + 1)
        Yc = [up(Y0p[c] + h * Y1[c] + h * h * Y2[c]) for c in range(DIM + 1)]
        Yp = arb(0)
        for c in range(DIM + 1):
            Yp = amax(Yp, up(Yc[c] / ETA[c]))
        e = up(h * x1_norm(om1, A1, ETA, bl["nu"]))
        den = 1 - Z1 - Z2 * e
        if not den > 0:
            raise ProofFailure(f"Z1 + Z2 e = {float(Z1 + Z2 * e):.4f} is not < 1 (Lemma 10.1)")
        rho = arb(float(up(Yp / den)) * (1 + float(Fraction(margin))) * 1.0000001)
        for _ in range(8):                                    # exact dyadic rho; enlarge until the inequality holds
            kappa = up(Z1 + Z2 * (e + rho))
            if kappa < 1 and Yp <= (1 - kappa) * rho:
                break
            rho = arb(float(rho) * 1.5)
        else:
            raise ProofFailure("Lemma 10.1: no admissible rho")
        kappa = up(Z1 + Z2 * (e + rho))
        if not (kappa < 1 and Yp <= (1 - kappa) * rho):
            raise ProofFailure("Lemma 10.1 inequality not certified")
        if not (e + rho <= r_star):
            raise ProofFailure("e + rho > r_* (Z2 not valid there)")
        if not (e + rho <= r_hi):
            raise ProofFailure("e + rho > r_uniqueness of the piece (identification with the branch fails)")
        return dict(rho=rho, e=e, Yprime=Yp, kappa=kappa, Y1=Y1, Y2=Y2, Yc=Yc)
    finally:
        ctx.prec = old


# =================================================================================================================
# Step 5: the certificate (Theorem 3 at every g of the piece; Lemma 10.3)
# =================================================================================================================
def certify_uniform(U, settings=None, controls=None, log=print):
    st = dict(DEFAULTS)
    st.update(settings or {})
    controls = dict(controls or {})
    T0 = time.time()
    prec = int(st["prec"])
    old = ctx.prec
    ctx.prec = prec
    try:
        out = _certify_uniform(U, st, controls, log, prec)
    finally:
        ctx.prec = old
    out["wall_s"] = round(time.time() - T0, 2)
    return out


def _certify_uniform(U, st, controls, log, prec):
    N = 1
    Kp = U["Kp"]
    nA = Kp
    hN = N // 2
    Ke = int(controls.get("Ke", hN + int(st["Ke_offset"])))
    n_c = int(st["n_c"])
    nW = DIM * (2 * Ke + 1)
    nmax = 2 * Ke + n_c
    if not 2 * Ke <= Kp:
        raise ValueError("the window needs [J0_n], J1c_n for |n| <= 2 K_e <= K'")
    drop = bool(controls.get("drop_g_terms"))               # test hook: treat H(g) as H(g_c) (mutation)
    hU = arb(0) if drop else U["h"]                         # exact upper bound of |g - g_c|
    E = acb_mat(DIM, DIM)
    E[IV, IV] = acb(1)
    Q = acb(arb(0, 1), arb(0, 1))

    # ---- 1. constants
    c4 = up((4 * am.coupling(N=N)).real)
    dm = {m: am.damping(m, N=N, prec=prec) for m in range(-(Ke + n_c + 2), Ke + n_c + 3)}

    # ---- 2. coefficients for every g of the piece (Lemma 10.2)
    rho, rho0, rho2 = U["rho"], U["rho0"], U["rho2"]
    rho_e = rho0 if rho0 < rho2 else rho2
    epsW = U["epsW"]
    om_bar, om1 = U["om_bar"], U["om1"]
    rho_om = arb(0) if drop else U["rho_om"]
    om_lo = lo(om_bar - hU * om1.abs_upper() - rho_om)
    om_hi = up(om_bar + hU * om1.abs_upper() + rho_om)
    if not (om_lo > 0 and om_lo <= om_hi):
        raise ProofFailure("omega_lo must be > 0 (C0)")
    omf = float(om_bar)
    J0, J1c, rad1, SJ0, SJ1 = U["J0"], U["J1c"], U["rad1"], U["SJ0"], U["SJ1"]
    Jmid = {n: np.array([[complex(float(J0[n][r][c].real.mid()), float(J0[n][r][c].imag.mid()))
                          for c in range(DIM)] for r in range(DIM)]) for n in range(-Kp, Kp + 1)}
    J1f = {n: np.array([[complex(float(J1c[n][r][c].real), float(J1c[n][r][c].imag)) for c in range(DIM)]
                        for r in range(DIM)]) for n in range(-Kp, Kp + 1)}
    a0c_unscaled = [[J0[0][r][c].real.mid() for c in range(DIM)] for r in range(DIM)]     # exact (A0c)
    dmf = lambda m: ct.damping_float(m, N)  # noqa: E731

    # ---- 4. geometry
    delta, delta_fr = sb.dyadic_up(st["delta"])
    eta_t = ex._exact_dyadic_param(st["eta_tail"], "eta_tail")
    b = arb(omf * (N / 2 + 0.25))
    a = -b
    hrect = b
    g0 = om_lo * (Ke + 1) - hrect
    log(f"  certify_uniform: K_e = {Ke} (n_W = {nW}), delta = {float(delta):.6e}, h = {float(hU):.4e}, "
        f"omega in [{float(om_lo):.12f}, {float(om_hi):.12f}]" + (f", CONTROLS {controls}" if controls else ""))

    # ---- choose S (floating point), as stability._certify
    delf = float(delta)
    g0f = float(g0.mid())
    Xs_f = [np.array([[float(a0c_unscaled[r][c]) for c in range(DIM)] for r in range(DIM)]) for _ in range(hN + 1)]
    for rr in range(hN + 1):
        Xs_f[rr][IV, IV] -= dmf(rr)
    if st["S_exps"] is None:
        e = sb.search_S({n: Jmid[n] for n in range(-min(Kp, 60), min(Kp, 60) + 1)}, Xs_f, g0f, delf,
                        st["cluster_tols"], log=log)
    else:
        e = [int(v) for v in st["S_exps"]]
    sf = 2.0 ** np.array(e, dtype=float)

    def two(k):
        return arb(2) ** k if k >= 0 else arb(fmpq(1, 2 ** (-k)))
    scl = [[two(e[c] - e[r]) for c in range(DIM)] for r in range(DIM)]
    erho, erhoe = (-rho).exp(), (-rho_e).exp()
    epsS = [[up(epsW[r][c] * scl[r][c]) for c in range(DIM)] for r in range(DIM)]
    SJS = [[up((SJ0[r][c] + hU * SJ1[r][c]) * scl[r][c]) for c in range(DIM)] for r in range(DIM)]
    s1 = sb.colsum_max(arb_mat(SJS))
    s2 = sb.colsum_max(arb_mat(epsS))
    q1, q2 = erho, erhoe

    def Gtail(k):
        return up(2 * (s1 * q1 ** k / (1 - q1) + s2 * q2 ** k / (1 - q2)))

    # g-uniform balls [A_n]^U (tail, alpha, couplings) and, for the window, the affine data with the second-order ball
    AS, absA, nrm, RAD = {}, {}, {}, {}
    nlist = max(nmax, nA)
    for n in range(-nlist, nlist + 1):
        if abs(n) <= nA:
            en = erhoe ** abs(n)
            rad = [[up(hU * rad1[n][r][c] + epsW[r][c] * en) for c in range(DIM)] for r in range(DIM)]
            RAD[n] = rad
            M = acb_mat([[(J0[n][r][c] + Q * up(hU * J1c[n][r][c].abs_upper() + rad[r][c])) * scl[r][c]
                          for c in range(DIM)] for r in range(DIM)])
        else:
            e1, e2 = erho ** abs(n), erhoe ** abs(n)
            M = acb_mat([[Q * up(((SJ0[r][c] + hU * SJ1[r][c]) * e1 + epsW[r][c] * e2) * scl[r][c])
                          for c in range(DIM)] for r in range(DIM)])
        AS[n] = M
        absA[n] = sb.abs_mat(M)
        nrm[n] = sb.colsum_max(absA[n])
    A0c = arb_mat([[a0c_unscaled[r][c] * scl[r][c] for c in range(DIM)] for r in range(DIM)])
    dA0 = sb.colsum_max(arb_mat([[(AS[0][r, c] - A0c[r, c]).abs_upper() for c in range(DIM)] for r in range(DIM)]))
    sigma_off = arb(0)
    for n in range(-nA, nA + 1):
        if n != 0:
            sigma_off += nrm[n]
    sigma_off = up(sigma_off + Gtail(nA + 1))
    theta_c = up(sigma_off + dA0)

    # ---- 3. alpha and R_0 (C1)
    alpha = up(sigma_off + nrm[0] + c4)
    R0 = arb(1)
    while not R0 > alpha:
        R0 = R0 * 2
    c1 = dict(delta_pos=bool(delta > 0), a_neg=bool(a < 0), b_pos=bool(b > 0),
              height=bool(b - a >= om_hi * N), b_below=bool(b < om_lo * N), a_above=bool(-a < om_lo * N),
              R0=bool(R0 > alpha))
    if not all(c1.values()):
        raise ProofFailure(f"(C1) geometry fails: {c1}")
    if not g0 > 0:
        raise ProofFailure("g_0 = omega_lo (K_e + 1) - h is not > 0")

    # ---- 5. tail, route A (C2): stability._certify, step 5, verbatim apart from the names
    tail = []
    rho_T = arb(0)
    for rr in range(hN + 1):
        X = acb_mat([[acb(A0c[i, j]) - (dm[rr] if (i == IV and j == IV) else 0) for j in range(DIM)]
                     for i in range(DIM)])
        Xf = Xs_f[rr] * sf[None, :] / sf[:, None]
        rt_f, tol, Uf, df = sb.best_U(Xf, float(g0.mid()) - float(eta_t), delf + float(eta_t), st["cluster_tols"])
        Um = acb_mat([[acb(complex(v)) for v in row] for row in Uf])
        try:
            Ui = Um.inv()
        except ZeroDivisionError:
            raise ProofFailure(f"U_{rr} not certainly invertible")
        Lr = [acb(complex(v)) for v in df]
        F = Ui * X * Um
        for l in range(DIM):
            F[l, l] -= Lr[l]
        Fn = sb.colsum_max(sb.abs_mat(F))
        kap = up(sb.colsum_max(sb.abs_mat(Um)) * sb.colsum_max(sb.abs_mat(Ui)))
        gam = None
        for l in range(DIM):
            x1_ = lo(-delta - eta_t - Lr[l].real)
            x2_ = lo(g0 - eta_t - abs(Lr[l].imag))
            v = x1_ if x1_ > x2_ else x2_
            gam = v if gam is None or v < gam else gam
        if not gam > Fn:
            raise ProofFailure(f"route A: gamma_{rr} = {float(gam):.4e} is not > ||F_{rr}|| = {float(Fn):.4e}")
        rho_r = up(kap / (gam - Fn))
        rho_T = amax(rho_T, rho_r)
        tail.append(dict(r=rr, cluster_tol=tol, kappa=float(kap), F_norm=float(Fn), gamma=float(gam),
                         rho=float(rho_r)))
    theta_T = up(theta_c * rho_T)
    log(f"  tail (route A): rho_T = {float(rho_T):.4f}, sigma_off = {float(sigma_off):.4f}, "
        f"||A_0 - A0c|| = {float(dA0):.3e}, theta_T = {float(theta_T):.4f}")
    if not theta_T < 1:
        raise ProofFailure(f"theta_T = theta_c rho_T = {float(theta_T):.4f} is not < 1 (tail)")

    # ---- 6. window: floating-point choices (V0, Lambda0 at g_c; V1, Lambda1 by first-order perturbation theory)
    ms = list(range(-Ke, Ke + 1))
    Ss = np.tile(sf, len(ms))

    def hill_f(Jd, omv, with_damping):
        H = np.zeros((nW, nW), complex)
        for i, m in enumerate(ms):
            for k, mp in enumerate(ms):
                H[DIM * i:DIM * i + DIM, DIM * k:DIM * k + DIM] = Jd[m - mp]
            H[DIM * i:DIM * i + DIM, DIM * i:DIM * i + DIM] += -1j * omv * m * np.eye(DIM)
            if with_damping:
                H[DIM * i + IV, DIM * i + IV] -= dmf(m)
        return H * Ss[None, :] / Ss[:, None]
    H0f = hill_f(Jmid, omf, True)
    lam, V0f = np.linalg.eig(H0f)
    V0f = V0f / np.abs(V0f).sum(0)[None, :]
    Vi0f = np.linalg.inv(V0f)
    if drop:
        L1f = np.zeros(nW, complex)
        Xf_ = np.zeros((nW, nW), complex)
    else:
        H1f = hill_f(J1f, float(om1), False)
        M1 = Vi0f @ H1f @ V0f
        L1f = np.diag(M1).copy()
        gap = lam[None, :] - lam[:, None]                    # gap[i, j] = lambda_j - lambda_i
        tau = float(st["tau"])
        far = (np.abs(gap) > tau) & ~np.eye(nW, dtype=bool)
        Xf_ = np.where(far, M1 / np.where(far, gap, 1), 0)
        del H1f, M1, gap, far
    V1f = V0f @ Xf_
    Vi1f = -Xf_ @ Vi0f
    del H0f
    exact = lambda M: acb_mat([[acb(complex(v)) for v in row] for row in M])  # noqa: E731
    V0, V1, Vi0, Vi1 = exact(V0f), exact(V1f), exact(Vi0f), exact(Vi1f)
    lam0 = [acb(complex(v)) for v in lam]
    lam1 = [acb(complex(v)) for v in L1f]

    # ---- 7. distances and count (C3), (C5) at g_c; uniform lower bounds dist_j - h |lambda1_j|
    dF, R0F, aF, bF = delta_fr, sb.frac(R0), sb.frac(a), sb.frac(b)
    dist, inside = [], []
    for z in lam:
        x, y = Fraction(float(z.real)), Fraction(float(z.imag))
        ins = (-dF < x < R0F) and (aF < y < bF)
        inside.append(ins)
        if ins:
            d = min(x + dF, R0F - x, y - aF, bF - y)
            dist.append(lo(sb.arb_of_fraction(d)))
        else:
            dx = max(-dF - x, Fraction(0), x - R0F)
            dy = max(aF - y, Fraction(0), y - bF)
            d2 = dx * dx + dy * dy
            dist.append(lo(sb.arb_of_fraction(d2).sqrt()) if d2 > 0 else arb(0))
    distU = [lo(dist[j] - hU * lam1[j].abs_upper()) for j in range(nW)]
    count = sum(inside)
    nonpos = [j for j in range(nW) if not distU[j] > 0]
    if nonpos:
        raise ProofFailure(f"(C3) dist_j - h |lambda1_j| not > 0 for {len(nonpos)} window eigenvalues")
    in_list = [complex(lam[j]) for j in range(nW) if inside[j]]
    if count != 1:
        raise ProofFailure(f"(C5) count of window eigenvalues in Omega is {count}, not 1: {in_list[:6]}")

    # ---- 6. window: Arb. [H0] (g_c), H1 (exact), Rb (second-order ball radii and the omega remainder)
    def window(blocks_of, diag_of):
        rows = []
        for i, m in enumerate(ms):
            bl = [blocks_of(m - mp) if k != i else diag_of(m) for k, mp in enumerate(ms)]
            for r in range(DIM):
                row = []
                for B in bl:
                    row.extend(B[r])
                rows.append(row)
        return rows
    AS0 = {n: [[J0[n][r][c] * scl[r][c] for c in range(DIM)] for r in range(DIM)] for n in range(-2 * Ke, 2 * Ke + 1)}
    AS1 = {n: [[J1c[n][r][c] * scl[r][c] for c in range(DIM)] for r in range(DIM)] for n in range(-2 * Ke, 2 * Ke + 1)}

    def d0(m):
        return [[AS0[0][r][c] + ((acb(0, -m) * om_bar) if r == c else 0) - (dm[m] if r == c == IV else 0)
                 for c in range(DIM)] for r in range(DIM)]

    def d1(m):
        return [[AS1[0][r][c] + ((acb(0, -m) * om1) if r == c else 0) for c in range(DIM)] for r in range(DIM)]
    H0 = acb_mat(window(lambda n: AS0[n], d0))
    H1 = acb_mat(window(lambda n: AS1[n], d1))
    if drop:
        H1 = acb_mat(nW, nW)

    def rb_block(n):
        return [[up(RAD[n][r][c] * scl[r][c]) for c in range(DIM)] for r in range(DIM)]

    def rb_diag(m):
        B = rb_block(0)
        return [[up(B[r][c] + (abs(m) * rho_om if r == c else 0)) for c in range(DIM)] for r in range(DIM)]
    Rb = arb_mat(window(rb_block, rb_diag))

    # sanity (not part of the certificate): the trivial eigenvector of H(g_c) up to the centre's truncation
    K = U["K"]
    Pst = acb_mat(nW, 1)
    for i, m in enumerate(ms):
        if abs(m) <= K:
            for r in range(DIM):
                Pst[DIM * i + r, 0] = acb(0, m) * U["A"][r][m + K] * two(-e[r])
    res = H0 * Pst
    sanity = float(sum((res[j, 0].abs_upper() for j in range(nW)), arb(0)) /
                   sum((Pst[j, 0].abs_lower() for j in range(nW)), arb(0)))
    if not sanity < float(st["sanity_tol"]):
        raise sb.InputMismatch(f"trivial-eigenvector residual {sanity:.3e} too large")

    ones = [arb(1)] * nW
    P00, P01, P10, P11 = H0 * V0, H0 * V1, H1 * V0, H1 * V1
    W0 = Vi0 * P00
    for j in range(nW):
        W0[j, j] -= lam0[j]
    csW0 = sb.colsums_abs(W0, ones)
    del W0
    S1 = P10 + P01
    W1 = Vi1 * P00 + Vi0 * S1
    for j in range(nW):
        W1[j, j] -= lam1[j]
    csW1 = sb.colsums_abs(W1, ones)
    del W1, P00
    W2 = Vi1 * S1 + Vi0 * P11
    csW2 = sb.colsums_abs(W2, ones)
    del W2, S1
    W3 = Vi1 * P11
    csW3 = sb.colsums_abs(W3, ones)
    del W3, P11, P10, P01
    Cm0 = Vi0 * V0
    for i in range(nW):
        Cm0[i, i] -= 1
    csC0 = sb.colsums_abs(Cm0, ones)
    del Cm0
    csC1 = sb.colsums_abs(Vi0 * V1 + Vi1 * V0, ones)
    csC2 = sb.colsums_abs(Vi1 * V1, ones)
    AV = arb_mat([[up(V0[i, j].abs_upper() + hU * V1[i, j].abs_upper()) for j in range(nW)] for i in range(nW)])
    AVi = arb_mat([[up(Vi0[i, j].abs_upper() + hU * Vi1[i, j].abs_upper()) for j in range(nW)] for i in range(nW)])
    Tb = AVi * (Rb * AV)
    onesrow = arb_mat(1, nW, ones)
    csT = onesrow * Tb
    csAVi = onesrow * AVi
    del Tb
    h2, h3 = hU * hU, hU * hU * hU
    cj = [up(csC0[j] + hU * csC1[j] + h2 * csC2[j]) for j in range(nW)]
    qC = arb(0)
    for v in cj:
        qC = amax(qC, v)
    if not qC < 1:
        raise ProofFailure(f"sup_g ||I - Vi(g) V(g)|| = {float(qC):.3e} is not < 1")
    inv1q = 1 / (1 - qC)
    wj = [up(csW0[j] + hU * csW1[j] + h2 * csW2[j] + h3 * csW3[j] + csT[0, j]) for j in range(nW)]
    lamabs = [up(lam0[j].abs_upper() + hU * lam1[j].abs_upper()) for j in range(nW)]
    fm = [up((wj[j] + lamabs[j] * cj[j]) * inv1q) for j in range(nW)]
    beta = [up(csAVi[0, c] * inv1q) for c in range(nW)]
    beta_max = arb(0)
    for v in beta:
        beta_max = amax(beta_max, v)

    # ---- 8. couplings (stability._certify, step 8, with |V(g)| <= AV)
    zT = arb(1)
    tw = []
    G_nA = Gtail(nA + 1)
    for w in ms:
        s_ = arb(0)
        for n in range(-nA, nA + 1):
            if abs(w + n) > Ke:
                s_ += nrm[n]
        tw.append(up(s_ + G_nA))
    twrow = arb_mat(1, nW, [tw[i] for i in range(len(ms)) for _ in range(DIM)])
    rv = twrow * AV
    r_j = [up(zT * rv[0, j]) for j in range(nW)]
    bms = {}
    bvec = [arb_mat(1, DIM, beta[DIM * i:DIM * i + DIM]) for i in range(len(ms))]
    for m in list(range(Ke + 1, Ke + n_c + 1)) + list(range(-Ke - n_c, -Ke)):
        acc = arb_mat(1, DIM)
        for i, w in enumerate(ms):
            acc = acc + bvec[i] * absA[w - m]
        v = arb(0)
        for k in range(DIM):
            v = amax(v, up(acc[0, k]))
        bms[m] = up(v / zT)
    farb = up(beta_max / zT * Gtail(n_c + 1) / 2)
    bhat = farb
    for v in bms.values():
        bhat = amax(bhat, v)

    # ---- 9. (SC)
    fac = up(bhat * rho_T / (1 - theta_T))
    ratio = []
    sc_ok = True
    for j in range(nW):
        lhs = fm[j] + fac * r_j[j]
        if not lhs < distU[j]:
            sc_ok = False
        ratio.append(float(up(lhs / distU[j])))
    worst = int(np.argmax(ratio))
    near = [j for j in range(nW) if lam[j].real > -1e-3 and abs(lam[j].imag) <= float(b) + 2 * omf]
    near.sort(key=lambda j: -lam[j].real)
    crit = [j for j in range(nW) if abs(lam[j].imag) < 0.25 * omf and lam[j].real > -2 * delf - 1e-4]
    log(f"  window: q_C = {float(qC):.3e}, bhat = {float(bhat):.3e}, (SC) worst ratio {ratio[worst]:.4e} at "
        f"{complex(lam[worst]):.6g}; critical columns " +
        ", ".join(f"{complex(lam[j]):.3e}: ratio {ratio[j]:.3e} (W0 {float(csW0[j]):.1e}, h W1 "
                  f"{float(hU * csW1[j]):.1e}, h^2 W2 {float(h2 * csW2[j]):.1e}, ball {float(csT[0, j]):.1e})"
                  for j in crit))
    if not sc_ok:
        bad = [j for j in range(nW) if ratio[j] >= 1]
        raise ProofFailure(f"(SC) fails for {len(bad)} window columns, e.g. lambda = {complex(lam[bad[0]])} "
                           f"(ratio {ratio[bad[0]]:.3e})")

    # ---- 10. conclusions (valid for every g of the piece)
    Tlo = lo(2 * arb.pi() / om_hi)
    mult_T = up((-delta * Tlo).exp())
    out = dict(
        N=N, K_e=Ke, n_W=nW, n_c=n_c, n_A=nA, prec=prec, delta_requested=st["delta"], delta=bound_rec(delta),
        delta_exact=f"{delta_fr.numerator}/{delta_fr.denominator}",
        route_tail="A (Lemma 3.4(b))", small_gain="SC (Lemma 3.5)", S_exponents=e, tau=st["tau"],
        omega_lo=bound_rec(om_lo, "down"), omega_hi=bound_rec(om_hi), T_lo=bound_rec(arb(Tlo), "down"),
        sigma_off=bound_rec(sigma_off), A0_minus_A0c=bound_rec(dA0), rho_T=bound_rec(rho_T),
        theta_T=bound_rec(theta_T), eps_W_1norm_S=bound_rec(s2), q_C=bound_rec(qC), bhat=bound_rec(bhat),
        beta_max=bound_rec(beta_max), dist_min=min(float(v) for v in distU), count_in_Omega=count,
        SC_worst_ratio=ratio[worst], SC_worst_lambda=[float(lam[worst].real), float(lam[worst].imag)],
        SC_worst_ratio_near_axis=max(ratio[j] for j in near) if near else None,
        critical_columns=[dict(lam=[float(lam[j].real), float(lam[j].imag)], dist=float(distU[j]), ratio=ratio[j],
                               W0=float(csW0[j]), hW1=float(hU * csW1[j]), h2W2=float(h2 * csW2[j]),
                               h3W3=float(h3 * csW3[j]), ball=float(csT[0, j]), fm=float(fm[j]), r=float(r_j[j]))
                          for j in crit],
        sanity_trivial_eigenvector_residual=sanity, tail_by_residue=tail,
        multiplier_bound_full_period=bound_rec(mult_T), controls=controls or None)
    if controls.get("dump"):
        out["internals"] = dict(lam=lam, L1=L1f, V0=V0f, V1=V1f, Vi0=Vi0f, Vi1=Vi1f, e=e, Ke=Ke, crit=crit,
                                wj=[float(v) for v in wj], fm=[float(v) for v in fm], h=float(hU))
    return out


# =================================================================================================================
# One piece, end to end
# =================================================================================================================
def prove_piece_uniform(label, settings=None, K=12, log=print, controls=None, _mutate=()):
    st = dict(DEFAULTS)
    st.update(settings or {})
    t0 = time.time()
    marks = {}

    def mark(name, t=[t0]):
        now = time.time()
        marks[name] = round(now - t[0], 1)
        t[0] = now
    rec, grp, om, A = piece_data(label, K)
    bst = dict(br.DEFAULTS)
    bst.update(rec["settings"])
    bl = br.piece_blocks(om, A, rec["g_lo"], rec["g_hi"], settings=rec["settings"], log=QUIET, label=label)
    mark("piece_blocks")
    gc = Fraction(rec["centre_g"])
    if br._dstr(gc) != bl["g_c"]:
        raise ValueError("centre g mismatch")
    om1, A1 = tangent(om, A, gc)
    old = ctx.prec
    ctx.prec = 256
    try:
        hq = arb(fmpq((Fraction(rec["g_hi"]) - gc).numerator, (Fraction(rec["g_hi"]) - gc).denominator))
        hq2 = arb(fmpq((gc - Fraction(rec["g_lo"])).numerator, (gc - Fraction(rec["g_lo"])).denominator))
        ends = []
        for sgn, hh in ((-1, hq2), (1, hq)):
            ends.append((om + sgn * hh * om1, [[A[i][t] + sgn * hh * A1[i][t] for t in range(2 * K + 1)]
                                               for i in range(DIM)]))
    finally:
        ctx.prec = old
    hb = br.HessBound(ends, rec["g_lo"], rec["g_hi"], grp["R"], "1", None, log=QUIET)
    mark("Hessian cover")
    asm = br.assemble(bl, rec["eta"], grp["r_star"], hb, log=QUIET)
    same = {k: asm[k]["hex"] == rec[k]["hex"] for k in ("Y0", "Z1")}
    if not all(same.values()):
        raise ProofFailure(f"recomputed Theorem B bounds differ from the log: {same}")
    mark("assemble")
    Pg, PJ, Mn, Kp = int(bst["prec_g"]), int(bst["prec_J"]), int(bst["M"]), bl["Kp"]
    rho = bl["rho"]
    hF = max(Fraction(rec["g_hi"]) - gc, gc - Fraction(rec["g_lo"]))
    D0, Dh = acb(0), _dball(hF)
    Phi = fe.TrigPoly([row[:] for row in A] + [row[:] for row in A1])
    prm53, prmG, prmJ = (br.params_for(gc, gc, p) for p in (53, Pg, PJ))
    skw = dict(nx=int(bst["strip_nx"]), rtol=float(bst["strip_rtol"]), max_evals=int(st["strip_max_evals"]))
    sG1 = fe.strip_sup(lambda z: taylor_flat(z, prm53, D0, 1, 53), Phi, rho, **skw)
    sG2 = fe.strip_sup(lambda z: taylor_flat(z, prm53, Dh, 2, 53), Phi, rho, **skw)
    sJ1 = fe.strip_sup(lambda z: j1_flat(z, prm53, Dh, 53), Phi, rho, **dict(skw, rtol=max(skw["rtol"], 10.0),
                                                                              atol=1e-3))
    for s_ in (sG1, sG2, sJ1):
        if not s_.full_strip:
            raise ProofFailure("a strip cover is not the full strip")
    mark("strips")
    eG1 = fe.fourier_coefficients(lambda z: taylor_flat(z, prmG, D0, 1, Pg), Phi, rho, Mn, Kp, S=sG1, prec=Pg)
    eG2 = fe.fourier_coefficients(lambda z: taylor_flat(z, prmG, Dh, 2, Pg), Phi, rho, Mn, Kp, S=sG2, prec=Pg)
    eJ1 = fe.fourier_coefficients(lambda z: j1_flat(z, prmJ, Dh, PJ), Phi, rho, Mn, Kp, S=sJ1, prec=PJ)
    if any(x.S_source != "strip" for x in (eG1, eG2, eJ1)):
        raise ProofFailure("Fourier enclosure without a checked strip bound")
    mark("dft")
    ETA = [ex._exact_dyadic_param(v, "eta") for v in rec["eta"]]
    old = ctx.prec
    ctx.prec = 256
    try:
        Z1 = ct.text_to_dyadic(asm["Z1"]["hex"])
        Z2 = ct.text_to_dyadic(asm["Z2"]["hex"])
        r_star = ct.text_to_dyadic(asm["r_star"]["hex"])
        r_hi_log = ct.text_to_dyadic(rec["r_uniqueness"]["hex"])
    finally:
        ctx.prec = old
    loc = locate(bl, om1, A1, eG1, eG2, ETA, Z1, Z2, r_star, r_hi_log, st["rho_margin"], _mutate=_mutate)
    mark("Lemma 10.1")
    rho_x = loc["rho"]
    t = [up(ETA[1 + j] * rho_x) for j in range(DIM)]
    for j in range(DIM):
        if not t[j] < hb.R[j]:
            raise ProofFailure(f"t_{j} = eta_j rho is not < R_{j}")
    MH = hb.MH
    pidx = {pr: i for i, pr in enumerate(br.HPAIRS)}
    epsW = [[None] * DIM for _ in range(DIM)]
    for k in range(DIM):
        for l in range(DIM):
            s = arb(0)
            for j in range(DIM):
                s += MH[k][pidx[(min(l, j), max(l, j))]] * t[j]
            epsW[k][l] = up(s)
    J1c, rad1 = {}, {}
    for n in range(-Kp, Kp + 1):
        J1c[n] = [[None] * DIM for _ in range(DIM)]
        rad1[n] = [[None] * DIM for _ in range(DIM)]
        for r in range(DIM):
            for c in range(DIM):
                v = eJ1.c[DIM * r + c][n + Kp]
                mid = acb(v.real.mid(), v.imag.mid())
                J1c[n][r][c] = mid
                rad1[n][r][c] = (v - mid).abs_upper()
    SJ1 = [[eJ1.S[DIM * r + c] for c in range(DIM)] for r in range(DIM)]
    old = ctx.prec
    ctx.prec = 128
    try:
        rho_om = up(ETA[0] * rho_x)
        hU = up(arb(fmpq(hF.numerator, hF.denominator)))
    finally:
        ctx.prec = old
    U = dict(K=K, Kp=Kp, A=A, om_bar=bl["om_bar"], om1=om1, rho_om=rho_om, h=hU, J0=bl["J"], SJ0=bl["SJ"],
             J1c=J1c, rad1=rad1, SJ1=SJ1, epsW=epsW, rho=rho, rho0=bl["rho0"], rho2=hb.rho2)
    cert = certify_uniform(U, settings=st, controls=controls, log=log)
    mark("certificate")
    out = dict(
        type="unit", label=label, g=[rec["g_lo"], rec["g_hi"]], g_centre=rec["centre_g"],
        centre_sha256=rec["centre_sha256"], uniform=True, ok=True, settings=st,
        program_sha256=br.sha256(os.path.abspath(__file__)), threads_pinned_before_numpy=not _NUMPY_PREIMPORTED,
        delta=cert["delta"], delta_requested=st["delta"], multiplier_bound_full_period=cert["multiplier_bound_full_period"],
        T_lo=cert["T_lo"],
        existence=dict(theorem_B_bounds_reproduced=same, Z1=asm["Z1"], Z2_this_cover=asm["Z2"],
                       rho=bound_rec(rho_x), e=bound_rec(loc["e"]), Yprime=bound_rec(loc["Yprime"]),
                       kappa=bound_rec(loc["kappa"]), Y0p_max=float(max(bl["Y0p"][c] / ETA[c] for c in range(DIM + 1))),
                       Y1_max=float(max(loc["Y1"][c] / ETA[c] for c in range(DIM + 1))),
                       Y2_max=float(max(loc["Y2"][c] / ETA[c] for c in range(DIM + 1))),
                       r_uniqueness_logged=rec["r_uniqueness"], hessian_cover=hb.digest),
        tangent=dict(omega1=ct.dyadic_to_text(om1), sha256=hashlib.sha256(
            "".join(ct.dyadic_to_text(A1[i][m].real) + ct.dyadic_to_text(A1[i][m].imag)
                    for i in range(DIM) for m in range(2 * K + 1)).encode()).hexdigest()),
        eps_W_max=float(max(max(r) for r in epsW)), strips=dict(G1=ex._strip_rec(sG1), G2=ex._strip_rec(sG2),
                                                               J1=ex._strip_rec(sJ1)),
        certificate={k: v for k, v in cert.items() if k != "internals"}, timings_s=marks,
        wall_s=round(time.time() - t0, 1))
    if controls and controls.get("dump"):
        out["_internals"] = cert.get("internals")
        out["_ctx"] = dict(bl=bl, om1=om1, A1=A1, eG1=eG1, eG2=eG2, ETA=ETA, Z1=Z1, Z2=Z2, r_star=r_star,
                           r_hi=r_hi_log, U=U, settings=st, rec=rec, om=om, A=A, loc=loc)
    if _mutate:
        out["MUTATED"] = sorted(_mutate)
    return out


# =================================================================================================================
# Driver (resumable; every unit appended to the JSONL log as soon as it is done)
# =================================================================================================================
def _job(args):
    label, settings = args
    t0 = time.time()
    try:
        return dict(label=label, ok=True, rec=prove_piece_uniform(label, settings=settings, log=QUIET))
    except FAILURES as e:
        return dict(label=label, ok=False, why=f"{type(e).__name__}: {e}", wall=round(time.time() - t0, 1),
                    settings=settings)
    except Exception as e:  # noqa: BLE001  (recorded, never a proof)
        import traceback
        return dict(label=label, ok=False, why=f"{type(e).__name__}: {e}", trace=traceback.format_exc()[-1500:],
                    wall=round(time.time() - t0, 1), settings=settings)


def done_labels(K=12):
    out = {}
    for r in br._read_jsonl_tolerant(LOG.format(K=K)):
        if r.get("type") == "unit" and r.get("ok"):
            out[r["label"]] = r
    return out


ATTEMPTS = (dict(delta="3e-5", Ke_offset=12), dict(delta="3e-5", Ke_offset=16), dict(delta="2.5e-5", Ke_offset=16),
            dict(delta="2e-5", Ke_offset=16))


def run(labels=None, K=12, workers=2, attempts=ATTEMPTS, budget_s=3500, log=print):
    """Prove the listed pieces (default: every logged piece not yet done), trying the settings in order (the first
    that closes is kept; untrusted choices). Appends each result (or failure) to the log at once."""
    import multiprocessing as mp
    T0 = time.time()
    path = LOG.format(K=K)
    br._repair_jsonl(path, log)
    pieces, _, _ = br.validate_logs(K, reglue=False, log=QUIET, repair=False)
    have = done_labels(K)
    todo = [p["rec"]["label"] for p in pieces if p["rec"]["label"] not in have]
    if labels:
        todo = [l for l in todo if l in set(labels)]
    log(f"uniform stability: {len(have)} pieces done, {len(todo)} to do, workers {workers}")
    pending = {l: list(attempts) for l in todo}
    with mp.get_context("fork").Pool(workers, maxtasksperchild=4) as pool:
        while pending and time.time() - T0 < budget_s:
            batch = [(l, dict(ds[0])) for l, ds in pending.items()]
            nxt = {}
            for res in pool.imap_unordered(_job, batch):
                l = res["label"]
                if res["ok"]:
                    br._append(path, res["rec"])
                    log(f"  {l}: CERTIFIED uniformly, delta {res['rec']['delta_requested']}, "
                        f"(SC) worst {res['rec']['certificate']['SC_worst_ratio']:.3e}, "
                        f"rho {res['rec']['existence']['rho']['approx']:.2e}, {res['rec']['wall_s']} s")
                else:
                    br._append(path, dict(type="failure", label=l, why=res["why"], settings=res.get("settings"),
                                          trace=res.get("trace"), wall=res.get("wall")))
                    log(f"  {l}: failed at delta {pending[l][0]}: {res['why'][:200]}")
                    rest = pending[l][1:]
                    if rest:
                        nxt[l] = rest
                if time.time() - T0 > budget_s:
                    break
            pending = nxt if time.time() - T0 < budget_s else {**nxt, **{}}
    return done_labels(K)


SOURCES = ["fourier/branch_stability.py", "fourier/branch.py", "fourier/stability.py", "fourier/existence.py",
           "fourier/centre.py", "fourier/arbmodel.py", "fourier/fourier_eval.py", "fourier/tp06_18d_arb.py",
           "model/tp06_18d.py", "model/scales.txt"]


def collect(K=12, write=True, log=print):
    pieces, _, _ = br.validate_logs(K, reglue=False, log=QUIET, repair=False)
    have = done_labels(K)
    allr = br._read_jsonl_tolerant(LOG.format(K=K))
    fails = [r for r in allr if r.get("type") == "failure"]
    rows = []
    for p in pieces:
        r = p["rec"]
        u = have.get(r["label"])
        if u is not None and u["centre_sha256"] != r["centre_sha256"]:
            u = None
        rows.append(dict(label=r["label"], g=[r["g_lo"], r["g_hi"]], uniform=u is not None,
                         delta=u["delta"] if u else None, delta_requested=u["delta_requested"] if u else None,
                         multiplier_bound_full_period=u["multiplier_bound_full_period"] if u else None,
                         rho=u["existence"]["rho"]["approx"] if u else None,
                         SC_worst_ratio=u["certificate"]["SC_worst_ratio"] if u else None,
                         critical_ratios=[c["ratio"] for c in u["certificate"]["critical_columns"]] if u else None,
                         theta_T=u["certificate"]["theta_T"]["approx"] if u else None,
                         wall_s=u["wall_s"] if u else None))
    covered = [r for r in rows if r["uniform"]]
    # maximal runs of consecutive certified pieces (consecutive pieces overlap, so a run covers an interval)
    runs, cur = [], None
    for r in rows:
        if r["uniform"]:
            if cur is None:
                cur = [r["g"][0], r["g"][1], 1]
            else:
                cur[1] = max(cur[1], r["g"][1], key=Fraction)
                cur[2] += 1
        elif cur is not None:
            runs.append(cur)
            cur = None
    if cur is not None:
        runs.append(cur)
    worst = max((Fraction(r["multiplier_bound_full_period"]["dec"]) for r in covered), default=None)
    out = dict(
        what="Theorem C: linear stability of the single-cell periodic orbit uniformly in G_Ks on each certified "
             "piece of the rec 2 branch (fourier/branch_stability.py; lemmas: fourier/LEMMAS-stability.md section 10)",
        status="computed; awaiting adversarial review",
        theorem=theorem_text(runs, worst),
        n_pieces_branch=len(rows), n_pieces_uniform=len(covered),
        intervals_uniform=[dict(g=[a, b], n_pieces=n) for a, b, n in runs],
        worst_multiplier_bound=None if worst is None else float(worst),
        pieces=rows, failures=[{k: v for k, v in f.items() if k != "trace"} for f in fails],
        settings=dict(DEFAULTS), sources_sha256={p: br.sha256(os.path.join(ROOT, p)) for p in SOURCES},
        log=os.path.relpath(LOG.format(K=K), ROOT), log_sha256=br.sha256(LOG.format(K=K)),
        branch_run_log_sha256=br.sha256(br.RUN_LOG.format(K=K)), branch_centres_sha256=br.sha256(br.CENTRES.format(K=K)),
        python_flint=flint.__version__, FLINT=flint.__FLINT_VERSION__, python=platform.python_version(),
        numpy=np.__version__, machine=platform.machine(), date=time.strftime("%Y-%m-%d"),
        total_wall_s=round(sum(r["wall_s"] or 0 for r in rows), 1))
    if write:
        path = os.path.join(RESULTS, "fourier-branch-stability.json")
        with open(path, "w") as fh:
            json.dump(out, fh, indent=1)
            fh.write("\n")
        log(f"wrote {path}: {len(covered)} of {len(rows)} pieces uniform")
    return out


def theorem_text(runs, worst):
    if not runs:
        return "No piece certified."
    iv = "; ".join(f"[{a}, {b}]" for a, b, _ in runs)
    return ("Conditional on Theorem B (results/fourier-branch-gks.json: for every G_Ks in each listed piece the branch "
            "orbit x*(G_Ks) exists, is unique in the piece's ball and has minimal period T) and on the lemmas of "
            "fourier/LEMMAS-stability.md (sections 1 to 4 and 10): for EVERY G_Ks in " + iv + " (each a union of "
            "branch pieces certified one by one), the single-cell periodic orbit x*(G_Ks) of Erhardt's 18-state TP06 "
            "endocardial model has the Floquet multiplier 1 algebraically simple and its other 17 Floquet multipliers "
            "of modulus < e^(-delta T_lo) with the piece's delta and T_lo (worst over the pieces: "
            f"{'%.9f' % worst if worst is not None else 'n/a'}); hence it is locally exponentially orbitally stable "
            "with asymptotic phase (Theorem 4(iii)). The bound holds uniformly on each piece, not only at sampled "
            "values of G_Ks.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--collect", action="store_true")
    ap.add_argument("--labels", default="")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--budget", type=float, default=3500)
    ap.add_argument("--one", default="", help="prove one piece in this process and print the record")
    ap.add_argument("--delta", default=None)
    a = ap.parse_args()
    if a.one:
        st = {} if a.delta is None else dict(delta=a.delta)
        r = prove_piece_uniform(a.one, settings=st)
        c = r["certificate"]
        print(json.dumps(dict(label=r["label"], g=r["g"], delta=r["delta"]["approx"],
                              multiplier=r["multiplier_bound_full_period"]["approx"],
                              existence={k: (v["approx"] if isinstance(v, dict) and "approx" in v else v)
                                         for k, v in r["existence"].items()},
                              theta_T=c["theta_T"]["approx"], SC_worst=c["SC_worst_ratio"],
                              critical=c["critical_columns"], timings=r["timings_s"], wall=r["wall_s"]), indent=1))
    if a.run:
        run(labels=[l for l in a.labels.split(",") if l] or None, workers=a.workers, budget_s=a.budget)
    if a.collect:
        collect()


if __name__ == "__main__":
    main()
