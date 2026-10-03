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

Group units (section "Group units" below; LEMMAS-stability.md section 11). prove_group_uniform certifies a whole group of
branch pieces (one interval in g, about 12 pieces wide) in one certificate: the orbit is located about a QUADRATIC path
xbar + d xbar_1 + (d^2/2) xbar_2 by a Newton-Kantorovich step about the moving point of the path (Lemma 11.1, with Z1
bounded along the path to second order, Lemma 11.2), identified with the branch orbit through every piece's uniqueness
ball (Lemma 11.3), and the Hill coefficients carry an explicit d^2 term (Lemma 11.4); the window keeps the affine
comparison operator (Lemma 11.5), and Theorem 11.6 is the conclusion on the unit. The jets along the path come from a
truncated Taylor arithmetic (Jet, DJet; Lemma 11.0').
A unit may also be a run of consecutive pieces of a group (part = (i0, i1), label G<gid>[i0:i1]); section 11 is
stated for any such run, and the whole group is the run of all its pieces.

Driver and record. Every unit record carries the SHA-256 of this file and of the program files it imports, taken when
the process imported them (PROGRAM_SHA256, SOURCES_SHA256; worker processes are forked after import), and the settings
it used. Units are appended to the log LOG (stability_uniform_K12_final.jsonl); the earlier log LOG_LEGACY
(stability_uniform_K12.jsonl, units of earlier versions of this file, some without a program hash) is kept as history
and is read by nothing here. run_groups (--groups) tries the group unit of every group with a piece not yet covered
by a unit of THIS program; when a whole-group unit fails it tries the two halves of the group, and a half that fails
falls back to piece units (run, --run). collect() (--collect) copies the complete lines of the branch logs and of LOG,
validates and hashes the copies together, checks every piece it claims against the Theorem B record
results/fourier-branch-gks.json (same label, g range, centre, centre digest, weights and r_uniqueness, inside the
record's connected range) and against the unit that covers it (centre digest, g range, r_uniqueness used), uses only
units made by this program, and writes results/fourier-branch-stability-uniform.json.

Trusted: python-flint 0.9.0 (Arb); fourier/arbmodel.py, tp06_18d_arb.py, fourier_eval.py (Lemmas 1-3); branch.py
(Theorem B: piece_blocks, assemble, HessBound, Hess); the imported helpers of stability.py and existence.py; this file.
"""
import argparse
import hashlib
import json
import math
import os
import platform
import shutil
import sys
import tempfile
import time
from fractions import Fraction

# One BLAS thread, set before numpy is imported: A_fin is a float inverse, and a multithreaded LAPACK changes its last
# bits, hence the last bits of the (equally rigorous) bounds; prove_piece_uniform requires Theorem B's Y0 and Z1 to be
# reproduced bit for bit, which needs the run's single-threaded inverse.
_NUMPY_PREIMPORTED = "numpy" in sys.modules
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "BLIS_NUM_THREADS"):
    os.environ[_v] = "1"

_PREIMPORT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PREIMPORT_FILES = ['fourier/branch_stability.py', 'fourier/branch.py', 'fourier/stability.py', 'fourier/existence.py', 'fourier/centre.py', 'fourier/arbmodel.py', 'fourier/fourier_eval.py', 'fourier/tp06_18d_arb.py', 'model/tp06_18d.py', 'model/scales.txt']
_PREIMPORT_SOURCES = {}
for _path in _PREIMPORT_FILES:
    with open(os.path.join(_PREIMPORT_ROOT, _path), "rb") as _source_fh:
        _PREIMPORT_SOURCES[_path] = hashlib.sha256(_source_fh.read()).hexdigest()

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
# The log of the units used by collect(): written by the final rerun of every unit with one version of this file.
LOG = os.path.join(DATA, "stability_uniform_K{K}_final.jsonl")
# History only (units of earlier versions of this file, three of them without a program hash): read by nothing here.
LOG_LEGACY = os.path.join(DATA, "stability_uniform_K{K}.jsonl")
up, lo, amax, bound_rec = ex.up, ex.lo, ex.amax, ex.bound_rec
QUIET = lambda *a, **k: None  # noqa: E731
# The program files (this file first) and the documents that state what they prove (hashed in the record, not run).
SOURCES = ["fourier/branch_stability.py", "fourier/branch.py", "fourier/stability.py", "fourier/existence.py",
           "fourier/centre.py", "fourier/arbmodel.py", "fourier/fourier_eval.py", "fourier/tp06_18d_arb.py",
           "model/tp06_18d.py", "model/scales.txt"]
DOCUMENTS = ["fourier/LEMMAS-stability.md", "fourier/test_branch_stability.py"]
# The hashes of this file and of the program files AS IMPORTED (the modules above are imported before this line, and
# worker processes are forked after import), so that a unit record never carries the hash of a later edit than the code
# that computed it. A unit is used by collect() only if both equal those of the process that collects.
with open(os.path.abspath(__file__), "rb") as _fh:
    PROGRAM_SHA256 = hashlib.sha256(_fh.read()).hexdigest()
SOURCES_SHA256 = {_p: br.sha256(os.path.join(ROOT, _p)) for _p in SOURCES}
if SOURCES_SHA256 != _PREIMPORT_SOURCES:
    raise RuntimeError("proof sources changed during import")
if SOURCES_SHA256["fourier/branch_stability.py"] != PROGRAM_SHA256:
    raise RuntimeError("branch_stability.py changed while it was being imported")


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
    strip_nx_new=16,         # initial grid of the three new strip covers (32 in Theorem B)
    strip_rtol_new=1000.0,   # their refinement tolerance: S only needs to be finite (aliasing e^{-rho (M - K')} and
                             # the Cauchy tail q^{K'+1} make any finite S negligible here)
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
        _LOGS[key] = br.validate_final(K)
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
    quad = "C2c" in U                                       # group unit (section 11 of the lemmas): d^2 terms
    drop2 = bool(controls.get("drop_d2_terms"))             # test hook (group units): omit the d^2 terms (mutation)
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
    if quad:                                                # omega*(g) in om_bar + d om1 + d^2 om2half + ball
        om2h_abs = arb(0) if (drop or drop2) else U["om2half"].abs_upper()
        om_lo = lo(om_bar - hU * om1.abs_upper() - hU * hU * om2h_abs - rho_om)
        om_hi = up(om_bar + hU * om1.abs_upper() + hU * hU * om2h_abs + rho_om)
    else:
        om_lo = lo(om_bar - hU * om1.abs_upper() - rho_om)
        om_hi = up(om_bar + hU * om1.abs_upper() + rho_om)
    if not (om_lo > 0 and om_lo <= om_hi):
        raise ProofFailure("omega_lo must be > 0 (C0)")
    omf = float(om_bar)
    J0, J1c, rad1, SJ0, SJ1 = U["J0"], U["J1c"], U["rad1"], U["SJ0"], U["SJ1"]
    if quad:
        h2U = arb(0) if drop2 else hU * hU
        C2c, rad2, SC2 = U["C2c"], U["rad2"], U["SC2"]
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
    if quad:
        SJS = [[up((SJ0[r][c] + hU * SJ1[r][c] + h2U * SC2[r][c]) * scl[r][c]) for c in range(DIM)] for r in range(DIM)]
    else:
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
        if abs(n) <= nA and quad:
            en = erhoe ** abs(n)
            rad = [[up(hU * rad1[n][r][c] + h2U * rad2[n][r][c] + epsW[r][c] * en) for c in range(DIM)]
                   for r in range(DIM)]
            RAD[n] = rad
            M = acb_mat([[(J0[n][r][c] + Q * up(hU * J1c[n][r][c].abs_upper() + h2U * C2c[n][r][c].abs_upper() +
                                                 rad[r][c])) * scl[r][c] for c in range(DIM)] for r in range(DIM)])
        elif abs(n) <= nA:
            en = erhoe ** abs(n)
            rad = [[up(hU * rad1[n][r][c] + epsW[r][c] * en) for c in range(DIM)] for r in range(DIM)]
            RAD[n] = rad
            M = acb_mat([[(J0[n][r][c] + Q * up(hU * J1c[n][r][c].abs_upper() + rad[r][c])) * scl[r][c]
                          for c in range(DIM)] for r in range(DIM)])
        elif quad:
            e1, e2 = erho ** abs(n), erhoe ** abs(n)
            M = acb_mat([[Q * up(((SJ0[r][c] + hU * SJ1[r][c] + h2U * SC2[r][c]) * e1 + epsW[r][c] * e2) * scl[r][c])
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
    H2 = None
    if quad and not (drop or drop2):                        # the exact d^2 window: C2c and -i om2half m
        AS2 = {n: [[C2c[n][r][c] * scl[r][c] for c in range(DIM)] for r in range(DIM)] for n in range(-2 * Ke, 2 * Ke + 1)}
        om2h = U["om2half"]

        def d2(m):
            return [[AS2[0][r][c] + ((acb(0, -m) * om2h) if r == c else 0) for c in range(DIM)] for r in range(DIM)]
        H2 = acb_mat(window(lambda n: AS2[n], d2))

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
    nVi1 = sb.colsum_max(sb.abs_mat(Vi1))
    if H2 is not None:
        # group unit: H(d) = H0 + d H1 + d^2 H2 + E with V(d), Vi(d) affine, so
        # W2 = Vi1 (H1 V0 + H0 V1) + Vi0 (H1 V1 + H2 V0), W3 = Vi1 (H1 V1 + H2 V0) + Vi0 H2 V1, W4 = Vi1 H2 V1
        P20, P21 = H2 * V0, H2 * V1
        Q2 = P11 + P20
        W2 = Vi1 * S1 + Vi0 * Q2
        csW2 = sb.colsums_abs(W2, ones)
        del W2, S1
        csQ2 = sb.colsums_abs(Q2, ones)
        csV0P21 = sb.colsums_abs(Vi0 * P21, ones)
        csW3 = [up(nVi1 * csQ2[j] + csV0P21[j]) for j in range(nW)]
        csW4 = [up(nVi1 * v) for v in sb.colsums_abs(P21, ones)]
        del Q2, P20, P21, P11, P10, P01
    else:
        W2 = Vi1 * S1 + Vi0 * P11
        csW2 = sb.colsums_abs(W2, ones)
        del W2, S1
        # the d^3 and d^2 terms below are bounded through norms (h^3, h^2 small): ||Vi1 X e_j|| <= ||Vi1||_{1->1} ||X e_j||
        csP11 = sb.colsums_abs(P11, ones)
        csW3 = [up(nVi1 * v) for v in csP11]
        csW4 = None
        del P11, P10, P01
    Cm0 = Vi0 * V0
    for i in range(nW):
        Cm0[i, i] -= 1
    csC0 = sb.colsums_abs(Cm0, ones)
    del Cm0
    csC1 = sb.colsums_abs(Vi0 * V1 + Vi1 * V0, ones)
    csC2 = [up(nVi1 * v) for v in sb.colsums_abs(V1, ones)]
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
    if csW4 is not None:
        h4 = h2 * h2
        wj = [up(csW0[j] + hU * csW1[j] + h2 * csW2[j] + h3 * csW3[j] + h4 * csW4[j] + csT[0, j]) for j in range(nW)]
    else:
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
                               h3W3=float(h3 * csW3[j]), ball=float(csT[0, j]), fm=float(fm[j]), r=float(r_j[j]),
                               **({"h4W4": float(h2 * h2 * csW4[j])} if csW4 is not None else {}))
                          for j in crit],
        sanity_trivial_eigenvector_residual=sanity, tail_by_residue=tail,
        multiplier_bound_full_period=bound_rec(mult_T), controls=controls or None,
        **({"quadratic_in_d": True} if quad else {}))
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
    skw["nx"] = int(st["strip_nx_new"])
    skw["rtol"] = float(st["strip_rtol_new"])      # refine only where needed for finiteness (S looser, see DEFAULTS)
    sG1 = fe.strip_sup(lambda z: taylor_flat(z, prm53, D0, 1, 53), Phi, rho, **skw)
    sG2 = fe.strip_sup(lambda z: taylor_flat(z, prm53, Dh, 2, 53), Phi, rho, **skw)
    sJ1 = fe.strip_sup(lambda z: j1_flat(z, prm53, Dh, 53), Phi, rho, **dict(skw, atol=1e-3))
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
        centre_sha256=rec["centre_sha256"], eta=rec["eta"], rho0=rec["settings"]["rho0"], uniform=True, ok=True,
        branch_piece_sha256=br.record_digest(rec),
        settings=st, program_sha256=PROGRAM_SHA256, sources_sha256=SOURCES_SHA256,
        threads_pinned_before_numpy=not _NUMPY_PREIMPORTED,
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
# Group units: Theorem C for a whole group of branch pieces in one certificate (LEMMAS-stability.md section 11)
# =================================================================================================================
# A piece unit (prove_piece_uniform) locates x*(g) to second order about an AFFINE centre and treats everything of
# second order in d = g - g_c as a ball; that ball grows like h^2 and is already about a third of the (SC) margin on a
# piece (half-width 2.6e-7). A group is about 12 pieces wide, so a group unit goes one order further: the orbit is
# located about a QUADRATIC centre xtilde(g) = xbar + d xbar_1 + (d^2 / 2) xbar_2 (third-order remainder), the
# Newton-Kantorovich step is taken about the moving centre xtilde(g) itself (Lemma 11.1: Z1 is bounded along the
# path, Lemma 11.2, not through Z2 times the distance travelled, as Lemma 10.1 does; that product is given in
# LEMMAS-stability.md 11.8, item 2), and the Hill coefficients carry an explicit d^2 term (Lemma 11.4). The comparison
# operator of the window stays affine in d (Lemma 11.5: Lemma 10.3 with the d^2 window H2 added to the expansion).
# Everything new is evaluated with the truncated Taylor arithmetic below (Lemma 11.0').

def _const(o):
    """An exact or ball constant as acb (floats and bools are refused, as in branch.Hess)."""
    if isinstance(o, bool):
        raise TypeError("bool")
    if isinstance(o, acb):
        return o
    if isinstance(o, (arb, int, flint.fmpz, fmpq)):
        return acb(o)
    raise TypeError(f"Jet arithmetic with {type(o).__name__} is refused (no float may enter unexamined)")


class Jet:
    """c[0] + c[1] t + ... + c[P] t^P (truncated at degree P), t = xi - xi0, acb coefficients. Each operation applies
    the exact recurrence for the Taylor coefficients of the composite in ball arithmetic (inclusion monotone), so if the
    input coefficients enclose the Taylor coefficients of the inputs at xi0 for every xi0 in a set X (here X = [-h, h],
    or the single point 0), every output coefficient encloses the corresponding Taylor coefficient of the composite at
    every xi0 in X (Lemma 11.0'). The input balls are built from the ball D (_dball, contains [-h, h]) and D2
    (_sq_ball, contains [0, h^2]); they enclose the inputs' coefficients for xi0 in [-h, h], which is all that is used.
    Every coefficient is checked finite (branch._chk); a reciprocal needs a finite 1 / c[0] (c[0] free of 0), log and
    sqrt need Re c[0] > 0 certified; so a finite result certifies that every intermediate is holomorphic on a
    neighbourhood of the input box (the contract of fourier_eval, made strict as in branch.Hess)."""
    __slots__ = ("c",)

    def __init__(self, c):
        self.c = [br._chk(v) for v in c]

    @property
    def P(self):
        return len(self.c) - 1

    def _lift(self, o):
        if isinstance(o, Jet):
            if len(o.c) != len(self.c):
                raise ValueError("jet degrees differ")
            return o
        return Jet([_const(o)] + [acb(0)] * self.P)

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
            s = _const(o)
            return Jet([a * s for a in self.c])
        if len(o.c) != len(self.c):
            raise ValueError("jet degrees differ")
        a, b = self.c, o.c
        out = []
        for k in range(len(a)):
            s = acb(0)
            for i in range(k + 1):
                s += a[i] * b[k - i]
            out.append(s)
        return Jet(out)

    __rmul__ = __mul__

    def reciprocal(self):
        a = self.c
        r0 = br._chk(1 / a[0])
        r = [r0]
        for k in range(1, len(a)):
            s = acb(0)
            for j in range(1, k + 1):
                s += a[j] * r[k - j]
            r.append(br._chk(-s * r0))
        return Jet(r)

    def __truediv__(self, o):
        if isinstance(o, Jet):
            return self * o.reciprocal()
        r = br._chk(1 / _const(o))
        return Jet([a * r for a in self.c])

    def __rtruediv__(self, o):
        return self._lift(o) * self.reciprocal()

    def __pow__(self, n):
        if type(n) is not int:
            raise TypeError("Jet ** n needs an int exponent")
        if n == 0:
            return self._lift(1)
        if n < 0:
            return (self ** (-n)).reciprocal()
        out = self
        for _ in range(n - 1):
            out = out * self
        return out

    def exp(self):
        a = self.c
        e = [br._chk(a[0].exp())]
        for k in range(1, len(a)):                      # k e_k = sum_{j=1}^k j a_j e_{k-j}
            s = acb(0)
            for j in range(1, k + 1):
                s += j * a[j] * e[k - j]
            e.append(br._chk(s / k))
        return Jet(e)

    def log(self):
        a = self.c
        if not (a[0].real > 0):
            raise br.HessDomainError(f"log argument {a[0]} not certainly in Re > 0")
        r0 = br._chk(1 / a[0])
        out = [br._chk(a[0].log())]
        for k in range(1, len(a)):                      # k a_0 l_k = k a_k - sum_{j=1}^{k-1} j l_j a_{k-j}
            s = acb(0)
            for j in range(1, k):
                s += j * out[j] * a[k - j]
            out.append(br._chk((a[k] - s / k) * r0))
        return Jet(out)

    def sqrt(self):
        a = self.c
        if not (a[0].real > 0):
            raise br.HessDomainError(f"sqrt argument {a[0]} not certainly in Re > 0")
        s0 = br._chk(a[0].sqrt())
        inv = br._chk(1 / (2 * s0))
        out = [s0]
        for k in range(1, len(a)):                      # 2 s_0 s_k = a_k - sum_{j=1}^{k-1} s_j s_{k-j}
            t = acb(0)
            for j in range(1, k):
                t += out[j] * out[k - j]
            out.append(br._chk((a[k] - t) * inv))
        return Jet(out)


class DJet:
    """(v, g): v a Jet in xi (the value) and g = {l: Jet} the derivatives in the state directions l (first order in the
    states, degree P in xi). Sums, products and the chain rule are exact at first order in the states:
    (u w)' = u w' + u' w and phi(u)' = phi'(u) u', with phi'(u) itself a Jet."""
    __slots__ = ("v", "g")

    def __init__(self, v, g=None):
        self.v = v
        self.g = g if g is not None else {}

    def _lift(self, o):
        if isinstance(o, DJet):
            return o
        if isinstance(o, Jet):
            raise TypeError("mixed Jet and DJet")
        return DJet(self.v._lift(o), {})

    def __add__(self, o):
        o = self._lift(o)
        g = dict(self.g)
        for k, x in o.g.items():
            g[k] = g[k] + x if k in g else x
        return DJet(self.v + o.v, g)

    __radd__ = __add__

    def __neg__(self):
        return DJet(-self.v, {k: -x for k, x in self.g.items()})

    def __pos__(self):
        return self

    def __sub__(self, o):
        return self + (-self._lift(o))

    def __rsub__(self, o):
        return self._lift(o) + (-self)

    def __mul__(self, o):
        if not isinstance(o, DJet):
            if isinstance(o, Jet):
                raise TypeError("mixed Jet and DJet")
            s = _const(o)
            return DJet(self.v * s, {k: x * s for k, x in self.g.items()})
        g = {k: x * o.v for k, x in self.g.items()}
        for k, x in o.g.items():
            g[k] = g[k] + self.v * x if k in g else self.v * x
        return DJet(self.v * o.v, g)

    __rmul__ = __mul__

    def _unary(self, fv, dv):
        return DJet(fv, {k: dv * x for k, x in self.g.items()})

    def reciprocal(self):
        r = self.v.reciprocal()
        return self._unary(r, -(r * r))

    def __truediv__(self, o):
        if isinstance(o, DJet):
            return self * o.reciprocal()
        r = br._chk(1 / _const(o))
        return self * r

    def __rtruediv__(self, o):
        return self._lift(o) * self.reciprocal()

    def __pow__(self, n):
        if type(n) is not int:
            raise TypeError("DJet ** n needs an int exponent")
        if n == 0:
            return self._lift(1)
        if n == 1:
            return self
        vn1 = self.v ** (n - 1)
        return self._unary(vn1 * self.v, vn1 * n)

    def exp(self):
        e = self.v.exp()
        return self._unary(e, e)

    def log(self):
        lv = self.v.log()                                  # certifies Re v > 0
        return self._unary(lv, self.v.reciprocal())

    def sqrt(self):
        s = self.v.sqrt()                                  # certifies Re v > 0
        return self._unary(s, s.reciprocal() * fmpq(1, 2))


class JetMath:
    @staticmethod
    def exp(a):
        return a.exp() if isinstance(a, (Jet, DJet)) else br.HessMath.exp(a)

    @staticmethod
    def log(a):
        return a.log() if isinstance(a, (Jet, DJet)) else br.HessMath.log(a)

    @staticmethod
    def sqrt(a):
        return a.sqrt() if isinstance(a, (Jet, DJet)) else br.HessMath.sqrt(a)


def _sq_ball(h):
    """A real ball containing [0, h^2] (h an exact Fraction), or the exact 0."""
    if h == 0:
        return acb(0)
    hb = arb(fmpq(h.numerator, h.denominator))
    h2 = (hb * hb).upper()
    return acb((h2 * arb(0, 1) + h2) / 2)


def _path_coeffs(zz, i, D, D2, P):
    """Balls enclosing the Taylor coefficients at xi0 of xi -> z_i + xi z1_i + (xi^2 / 2) z2_i,
    [z + D z1 + (D2 / 2) z2, z1 + D z2, z2 / 2, 0, ...] truncated at degree P, for every xi0 with xi0 in D and xi0^2 in
    D2. With D = _dball(h) and D2 = _sq_ball(h) that holds for every xi0 in [-h, h] (D contains [-h, h], D2 contains
    [0, h^2]); D may be slightly wider than [-h, h] (mag rounding of its radius), and its extra rim is not used."""
    z, z1, z2 = am.to_ball(zz[i]), am.to_ball(zz[DIM + i]), am.to_ball(zz[2 * DIM + i])
    c = [z + D * z1 + D2 * z2 / 2, z1 + D * z2, z2 / 2] + [acb(0)] * max(0, P - 2)
    return c[:P + 1]


def gjet_flat(zz, prm, D, D2, P, ps, prec=53):
    """Black box on the 54 inputs (phibar, phi_1, phi_2)(theta): the Taylor coefficients of order p in ps (p <= P) of
    G_k(xi) = f_k(phibar + xi phi_1 + (xi^2/2) phi_2; g_c + xi) at every base point xi0 in [-h, h] (D = _dball(h),
    D2 = _sq_ball(h); see _path_coeffs), as a flat list
    [coefficient p of G_k for p in ps for k]. (With D = 0 and P = 3: the derivatives of order 1, 2, 3 at 0 divided by
    1!, 2!, 3!; with D the box [-h, h] and P = 4: the fourth derivative divided by 4! at every point of the box.)"""
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(prm)
        p["g_Ks"] = Jet([am.to_ball(prm["g_Ks"]) + D, acb(1)] + [acb(0)] * (P - 1))
        x = [Jet([v * s for v in _path_coeffs(zz, i, D, D2, P)]) for i, s in enumerate(am.SIG)]
        y = fn(x, p, JetMath, acb(0))
        out = []
        for pp in ps:
            for k, yk in enumerate(y):
                yk = yk if isinstance(yk, Jet) else x[0]._lift(yk)
                out.append(br._chk(yk.c[pp] * am.ISIG[k]))
    return out


def djet_flat(zz, prm, D, D2, P, ps, prec=53):
    """Black box: the entries (row-major, k then l) of the Taylor coefficients of order p in ps of
    xi -> (Df)_{kl}(phibar + xi phi_1 + (xi^2/2) phi_2; g_c + xi) at every base point xi0 in [-h, h] (as gjet_flat), as
    [coefficient p of (Df)_{kl} for p in ps for k for l]. (With D = 0, p = 1: J1(theta; 0); with D the box, p = 1 and
    2: J1(theta; xi) and J2(theta; xi) / 2 for every xi in [-h, h].)"""
    with am.precision(prec):
        fn = am.model()["field"]
        p = dict(prm)
        z0 = [acb(0)] * (P + 1)
        p["g_Ks"] = DJet(Jet([am.to_ball(prm["g_Ks"]) + D, acb(1)] + [acb(0)] * (P - 1)), {})
        x = []
        for i, s in enumerate(am.SIG):
            seed = list(z0)
            seed[0] = s
            x.append(DJet(Jet([v * s for v in _path_coeffs(zz, i, D, D2, P)]), {i: Jet(seed)}))
        y = fn(x, p, JetMath, acb(0))
        out = []
        for pp in ps:
            for k, yk in enumerate(y):
                yk = yk if isinstance(yk, DJet) else x[0]._lift(yk)
                for l in range(DIM):
                    gl = yk.g.get(l)
                    out.append(br._chk(gl.c[pp] * am.ISIG[k]) if gl is not None else acb(0))
    return out


# -- untrusted inputs ---------------------------------------------------------------------------------------------
def predictor(om, A, gc, h):
    """Untrusted (only their quality matters): (om1, A1), the float Galerkin tangent at g_c (tangent()), and
    (om2, A2) ~ d^2 x / dg^2 at g_c, the central difference (x1(g_c + s) - x1(g_c - s)) / (2 s), s = h / 2, of the float
    tangents at float Newton solutions; conjugation symmetric, Im of the (V, +-1) coefficients exactly 0, exact
    doubles (so F_ph(xbar_1) = F_ph(xbar_2) = 0 exactly)."""
    K = (len(A[0]) - 1) // 2
    lay = ct.Layout(K)
    om1b, A1 = tangent(om, A, gc)
    Mc = 8 * (4 * K + 64)
    a0, a1 = br.centre_float(A), br.centre_float(A1)
    s = float(h) / 2
    x1s = []
    for sg in (1, -1):
        gs = float(Fraction(gc)) + sg * s
        om_s, a_s, nr = br.newton_f(float(om) + sg * s * float(om1b), a0 + sg * s * a1, gs, Mc, iters=30, tol=1e-14)
        if not nr < 1e-11:
            raise RuntimeError(f"float Newton failed at g_c {'+' if sg > 0 else '-'} h/2 (|R| = {nr:.2e})")
        G, _ = br.galerkin_f(om_s, a_s, gs, Mc)
        x1s.append(-np.linalg.solve(G, br.dFdg_f(a_s, Mc)))
    om2, a2 = ct.unpack(lay, (x1s[0] - x1s[1]) / (2 * s))
    om2, a2 = ct.symmetrize(om2, a2)
    a2[IV, K + 1] = a2[IV, K + 1].real
    a2[IV, K - 1] = a2[IV, K - 1].real
    om2b, A2 = ct.to_exact(om2, a2, 128)
    return om1b, A1, om2b, A2


def path_ball(om, A, om1, A1, om2, A2, h, prec=256):
    """Coefficient balls containing xtilde(xi) = xbar + xi xbar_1 + (xi^2 / 2) xbar_2 for every xi in [-h, h]."""
    K = (len(A[0]) - 1) // 2
    old = ctx.prec
    ctx.prec = prec
    try:
        D, D2 = _dball(h), _sq_ball(h)
        omb = (om + D * om1 + D2 * om2 / 2).real
        Ab = [[A[i][t] + D * A1[i][t] + D2 * A2[i][t] / 2 for t in range(2 * K + 1)] for i in range(DIM)]
    finally:
        ctx.prec = old
    return omb, Ab


def unit_label(gid, part=None):
    """G<gid> for a whole-group unit; G<gid>[i0:i1] for the unit of the group's pieces i0 .. i1 - 1 (sorted by g_lo)."""
    return f"G{gid}" if part is None else f"G{gid}[{int(part[0])}:{int(part[1])}]"


def group_data(gid, K=12, part=None):
    """The group's pieces (sorted, covering [g_lo, g_hi] with consecutive overlaps, checked), restricted to the
    consecutive run part = (i0, i1) (pieces i0 .. i1 - 1 in the order of g_lo) when part is given, and the centre of the
    piece of that run whose centre g is nearest the run's midpoint (digest checked). The returned interval
    [g_lo, g_hi] is that of the run (the whole group's when part is None)."""
    pieces, groups, centres = _logs(K)
    grp = groups[gid]
    if grp["group"] != gid:
        raise ValueError("group numbering")
    plist = sorted([p["rec"] for p in pieces if p["group"] == gid], key=lambda r: Fraction(r["g_lo"]))
    if not plist:
        raise KeyError(f"no pieces in group {gid}")
    glo, ghi = Fraction(plist[0]["g_lo"]), Fraction(plist[-1]["g_hi"])
    if not (glo == Fraction(grp["g_lo"]) and ghi == Fraction(grp["g_hi"])):
        raise ValueError(f"group {gid}: pieces do not span the group's recorded range")
    for a, b in zip(plist, plist[1:]):
        if not Fraction(b["g_lo"]) <= Fraction(a["g_hi"]):
            raise ValueError(f"group {gid}: pieces {a['label']}, {b['label']} leave a gap")
    if part is not None:
        i0, i1 = int(part[0]), int(part[1])
        if not 0 <= i0 < i1 <= len(plist):
            raise ValueError(f"group {gid}: part {part} is not a nonempty run of its {len(plist)} pieces")
        plist = plist[i0:i1]
        glo, ghi = Fraction(plist[0]["g_lo"]), Fraction(plist[-1]["g_hi"])
        grp = dict(grp, g_lo=br._dstr(glo), g_hi=br._dstr(ghi))
    for r in plist:                     # every piece P_i lies in I (Lemma 11.3 uses x0(g), defined for g in I)
        if not (glo <= Fraction(r["g_lo"]) < Fraction(r["g_hi"]) <= ghi):
            raise ValueError(f"group {gid}: piece {r['label']} is not inside the unit's interval")
    mid = (glo + ghi) / 2
    crec = min(plist, key=lambda r: (abs(Fraction(r["centre_g"]) - mid), Fraction(r["centre_g"])))
    om, A = br.centre_from_record(centres[br._dstr(Fraction(crec["centre_g"]))])
    if br.centre_digest(om, A) != crec["centre_sha256"]:
        raise ValueError("centre digest mismatch")
    if any(r["settings"] != crec["settings"] or r["eta"] != crec["eta"] for r in plist):
        raise ValueError(f"group {gid}: pieces with different settings or weights")
    return grp, plist, crec, om, A, centres


# -- Lemma 11.2: the moving-centre Z1 -----------------------------------------------------------------------------
def operator_blocks(bl, Jm, SJm, om_d, Acol, parts=False):
    """Block bounds B[c][c'] (exact upper bounds) of ||A E||_block for every operator E of the form
    (E y)_ph = 0, (E y)_m = i m om_d y_{a,m} + i m Acol_m y_om - [Jm * y_a]_m, with om_d a real ball, Acol coefficient
    balls with modes |m| <= K, and Jm a convolution whose coefficients lie in the balls Jm[n] for |n| <= K' and obey
    |Jm_n| <= SJm e^{-rho |n|} for every n (Lemma 11.2: B' for E = D'(0) with (J1pt, om_1, abar_1), and B'' for E = E(d)
    with ([C2box], om_2 / 2, abar_2 / 2)). Three parts as B1g of branch.piece_blocks: finite x finite |A_fin E_fin|,
    finite rows x tail columns (convolution only; strip majorant), tail rows Abar0 sum_n |Jm_n| nu^|n| + Abar0 SJm tailK
    + |om_d| Abar1 (Acol has no entries beyond K). With parts=True also returns the three parts
    dict(ff=B_ff, ft=B_ft, tail=T) (T indexed by the state components), for the tests that compare each part with an
    independent evaluation."""
    st = bl["settings"]
    K, Kp = bl["K"], bl["_Kp"]
    lay = ct.Layout(K)
    n = lay.n
    PM, Pg = int(st["prec_mat"]), int(st["prec_g"])
    nupow, tailK, Afin, Abar0, Abar1 = bl["_nupow"], bl["_tailK"], bl["_Afin"], bl["Abar0"], bl["Abar1"]
    rho = bl["rho"]
    J1box, SJ1box = Jm, SJm
    old = ctx.prec
    ctx.prec = PM
    try:
        om1x = om_d
        Dfin = acb_mat(n, n)
        for i in range(DIM):
            for m in range(-K, K + 1):
                r = lay.idx(i, m)
                Dfin[r, 0] = acb(0, m) * Acol[i][m + K]
                for k in range(DIM):
                    base = 1 + k * lay.L + K
                    for m2 in range(-K, K + 1):
                        Dfin[r, base + m2] = -J1box[m - m2][i][k]
                Dfin[r, r] += acb(0, m) * om1x
        ADfin = Afin * Dfin
        om1x_abs = up(om1x.abs_upper())
    finally:
        ctx.prec = old
    ctx.prec = Pg
    try:
        comp_of = [None] + [k for k in range(DIM) for _ in range(lay.L)]
        mode_of = [0] + [m for _ in range(DIM) for m in range(-K, K + 1)]
        WROW = ex._weight_rows(lay, nupow)
        B_ff = ex._block_colsup(WROW * ex._abs_mat(ADfin), comp_of, mode_of, nupow)
        Arows = Afin.tolist()
        Aabs_rows = ex._abs_mat(Afin).tolist()
        Lw = int(st["L"])
        cols_exact = [(k, mp) for k in range(DIM) for mp in list(range(K + 1, K + Lw + 1)) + list(range(-K - Lw, -K))]
        mb = K + Lw + 1
        cols_b = [(k, s * mb) for k in range(DIM) for s in (1, -1)]
        erho = (-rho).exp()
        ridx = [lay.idx(j, m) for j in range(DIM) for m in range(-K, K + 1)]
        Wm = acb_mat(len(ridx), len(cols_exact))
        for t, (k, mp) in enumerate(cols_exact):
            for j in range(DIM):
                for mi, m in enumerate(range(-K, K + 1)):
                    Wm[j * lay.L + mi, t] = -J1box[m - mp][j][k]
        AS = acb_mat([[row[c] for c in ridx] for row in Arows])
        with fe.precision(PM):
            AW = AS * Wm
        colW = WROW * ex._abs_mat(AW)
        B_ft = [[arb(0)] * (DIM + 1) for _ in range(DIM + 1)]
        for t, (k, mp) in enumerate(cols_exact):
            for c in range(DIM + 1):
                B_ft[c][1 + k] = amax(B_ft[c][1 + k], up(colW[c, t] / nupow[abs(mp)]))
        Wb = arb_mat(len(ridx), len(cols_b))
        for t, (k, mp) in enumerate(cols_b):
            for j in range(DIM):
                for mi, m in enumerate(range(-K, K + 1)):
                    Wb[j * lay.L + mi, t] = up(SJ1box[j][k] * erho ** abs(m - mp))
        AabsS = arb_mat([[row[c] for c in ridx] for row in Aabs_rows])
        colWb = WROW * (AabsS * Wb)
        for t, (k, mp) in enumerate(cols_b):
            for c in range(DIM + 1):
                B_ft[c][1 + k] = amax(B_ft[c][1 + k], up(colWb[c, t] / nupow[abs(mp)]))
        Ab0m = arb_mat(Abar0)
        T = [[arb(0)] * DIM for _ in range(DIM)]
        for nn in range(-Kp, Kp + 1):
            Pm = Ab0m * arb_mat([[J1box[nn][r][c].abs_upper() for c in range(DIM)] for r in range(DIM)])
            w = up(nupow[abs(nn)])
            for c in range(DIM):
                for k in range(DIM):
                    T[c][k] = T[c][k] + Pm[c, k] * w
        Pm = Ab0m * arb_mat(SJ1box)
        for c in range(DIM):
            for k in range(DIM):
                T[c][k] = up(T[c][k] + Pm[c, k] * tailK + om1x_abs * Abar1[c][k])
        B = [[None] * (DIM + 1) for _ in range(DIM + 1)]
        for c in range(DIM + 1):
            for cp in range(DIM + 1):
                b = amax(B_ff[c][cp], B_ft[c][cp])
                if c >= 1 and cp >= 1:
                    b = up(b + T[c - 1][cp - 1])
                B[c][cp] = b
        if parts:
            return B, dict(ff=B_ff, ft=B_ft, tail=T)
        return B
    finally:
        ctx.prec = old


def _z1_rows(B1, Bp, Bpp, h, ETA):
    """max_c (1/eta_c) sum_c' eta_c' (B1_cc' + h B'_cc' + h^2 B''_cc') (B' = B'' = None: B1 alone)."""
    best = arb(0)
    for c in range(DIM + 1):
        s = arb(0)
        for cp in range(DIM + 1):
            s += ETA[cp] * (B1[c][cp] + ((h * Bp[c][cp] + h * h * Bpp[c][cp]) if Bp is not None else 0))
        best = amax(best, up(s / ETA[c]))
    return best


def _z2(bl, ETA, r_star, hb):
    """Lemma B2 / E.6 with this unit's Hessian cover: Z2 = max_c (1/eta_c) sum_k [2 eta_om eta_k (N1 + Abar1)_ck +
    (N0 + Abar0)_ck W_k], valid about every centre whose coefficients lie in the cover's hull."""
    nu, rho2 = bl["nu"], hb.rho2
    q2 = nu * (-rho2).exp()
    if not q2 < 1:
        raise ProofFailure("nu e^{-rho2} not < 1")
    Q2 = (1 + q2) / (1 - q2)
    N0, N1, Abar0, Abar1 = bl["N0"], bl["N1"], bl["Abar0"], bl["Abar1"]
    Wk, Pfac = hb.W(ETA, r_star, Q2)
    best = arb(0)
    for c in range(DIM + 1):
        s = arb(0)
        for k in range(DIM):
            n1 = N1[c][1 + k] + (Abar1[c - 1][k] if c >= 1 else 0)
            n0 = N0[c][1 + k] + (Abar0[c - 1][k] if c >= 1 else 0)
            s += 2 * ETA[0] * ETA[1 + k] * n1 + n0 * Wk[k]
        best = amax(best, up(s / ETA[c]))
    return best, Pfac


def _poly_norm(cs, D, ETA, nu, K):
    """Upper bound, over every d in the real ball D, of ||c0 + d c1 + d^2 c2|| in the weights ETA, for coefficient
    triples cs = (omega part (w0, w1, w2), state parts [(A0, A1, A2)]) (exact balls; K modes)."""
    (w0, w1, w2), comps = cs
    D2 = D * D
    best = up((w0 + D * w1 + D2 * w2).abs_upper() / ETA[0])
    for i in range(DIM):
        A0_, A1_, A2_ = comps[i]
        s = arb(0)
        for t in range(2 * K + 1):
            s += (A0_[t] + D * A1_[t] + D2 * A2_[t]).abs_upper() * nu ** abs(t - K)
        best = amax(best, up(s / ETA[1 + i]))
    return best


def lemma_11_1(Yparts, hU, ETA, Z1G, Z2, r_star, margin, mut=()):
    """Lemma 11.1: Y' = max_c (sum_k h^k Y_k,c) / eta_c from the per-component parts Y_0 (= Y0p), ..., Y_4, and an exact
    rho with rho <= r_*, kappa = Z1_Gamma + Z2 rho < 1 and Y' <= (1 - kappa) rho. Returns (Y', rho, kappa) or raises
    ProofFailure. mut (tests only): 'drop_third_order' omits h^3 Y_3 + h^4 Y_4."""
    Yk = list(Yparts)
    if "drop_third_order" in mut:
        Yk[3] = Yk[4] = [arb(0)] * (DIM + 1)
    Yc = [up(sum((hU ** k * Yk[k][c] for k in range(1, 5)), Yk[0][c])) for c in range(DIM + 1)]
    Yp = arb(0)
    for c in range(DIM + 1):
        Yp = amax(Yp, up(Yc[c] / ETA[c]))
    if not Z1G < 1:
        raise ProofFailure(f"Z1 along the path = {float(Z1G):.4f} is not < 1 (Lemma 11.1)")
    rho_x = arb(float(up(Yp / (1 - Z1G))) * (1 + float(Fraction(margin))) * 1.0000001)
    for _ in range(8):
        kappa = up(Z1G + Z2 * rho_x)
        if kappa < 1 and Yp <= (1 - kappa) * rho_x:
            break
        rho_x = arb(float(rho_x) * 1.5)
    else:
        raise ProofFailure("Lemma 11.1: no admissible rho")
    kappa = up(Z1G + Z2 * rho_x)
    if not (kappa < 1 and Yp <= (1 - kappa) * rho_x):
        raise ProofFailure("Lemma 11.1 inequality not certified")
    if not rho_x <= r_star:
        raise ProofFailure(f"rho = {float(rho_x):.3e} > r_* = {float(r_star):.3e} (Z2 not valid there)")
    return Yp, rho_x, kappa


def identify(plist, centres, crec, gc, path, ETA, rho_x, nu, K, r_hi_scale=None):
    """Lemma 11.3 for every piece of the group: sup_{g in P_i} ||xtilde(g) - xbar_i||_{eta(i)} + rho max_c eta_c / eta_c(i)
    <= r_hi(i), the sup bounded by evaluating the path's coefficients with d an Arb ball containing the piece's d range
    (the union of the balls of its two exact ends). r_hi(i) is the piece's logged r_uniqueness (exact hex), recorded
    with the piece's g range and centre digest so that collect() can check them against the branch record. Returns the
    per-piece records or raises ProofFailure. r_hi_scale (tests only) multiplies every r_hi."""
    om, A, om1, A1, om2, A2 = path
    out = []
    old = ctx.prec
    ctx.prec = 256
    try:
        for r in plist:
            oi = br.obj_from_record(r, centres[br._dstr(Fraction(r["centre_g"]))])
            if r["settings"]["rho0"] != crec["settings"]["rho0"]:
                raise ProofFailure("different nu")
            r_hi = oi["r_hi"] if r_hi_scale is None else oi["r_hi"] * r_hi_scale
            dlo, dhi = Fraction(r["g_lo"]) - gc, Fraction(r["g_hi"]) - gc
            Dp = acb(arb(fmpq(dlo.numerator, dlo.denominator)).union(arb(fmpq(dhi.numerator, dhi.denominator))))
            cs = ((om - oi["om_bar"], om1, om2 / 2),
                  [([A[i][t] - oi["A"][i][t] for t in range(2 * K + 1)], A1[i], [v / 2 for v in A2[i]])
                   for i in range(DIM)])
            dist = _poly_norm(cs, Dp, oi["ETA"], nu, K)
            conv = arb(0)
            for ea, eb in zip(ETA, oi["ETA"]):
                conv = amax(conv, up(ea / eb))
            lhs = up(dist + rho_x * conv)
            ok = bool(lhs <= r_hi)
            out.append(dict(label=r["label"], g=[r["g_lo"], r["g_hi"]], centre_sha256=r["centre_sha256"],
                            lhs=float(lhs), lhs_bound=bound_rec(lhs), r_uniqueness=float(r_hi),
                            r_uniqueness_logged=r["r_uniqueness"] if r_hi_scale is None else None, ok=ok))
            if not ok:
                raise ProofFailure(f"identification with piece {r['label']} fails (uniqueness): "
                                   f"{float(lhs):.3e} > r_hi = {float(r_hi):.3e}")
    finally:
        ctx.prec = old
    return out


GROUP_DEFAULTS = dict(
    r_star="1/1048576",       # radius of this unit's Z2 ball (2^-20); rho must be <= r_*; R_i = R_factor eta_i r_*
    R_factor=256,
    rho_margin="1/64",
)


def prove_group_uniform(gid, settings=None, K=12, log=print, controls=None, _mutate=(), _widen=1, part=None):
    """Theorem 11.6 on the whole group gid (section 11 of the lemmas), or, with part = (i0, i1), on the run of its
    consecutive pieces i0 .. i1 - 1 (sorted by g_lo; the unit's interval is then the union of those pieces). _widen
    (tests only) multiplies h (and the d-range of every enclosure) by an integer factor: the certificate must then be
    refused. _mutate (tests only): 'drop_third_order' drops h^3 Y3 + h^4 Y4 from Y'; 'drop_moving_centre' drops
    h B' + h^2 B'' from Z1."""
    st = dict(DEFAULTS)
    st.update(GROUP_DEFAULTS)
    st.update(settings or {})
    mut = frozenset(_mutate)
    if mut - {"drop_third_order", "drop_moving_centre"}:
        raise ValueError(f"unknown mutation {sorted(mut)}")
    t0 = time.time()
    marks = {}

    def mark(name, t=[t0]):
        now = time.time()
        marks[name] = round(now - t[0], 1)
        t[0] = now
    grp, plist, crec, om, A, centres = group_data(gid, K, part)
    ulabel = unit_label(gid, part)
    gc = Fraction(crec["centre_g"])
    glo, ghi = Fraction(grp["g_lo"]), Fraction(grp["g_hi"])
    hF = max(ghi - gc, gc - glo) * int(_widen)
    bst = dict(br.DEFAULTS)
    bst.update(crec["settings"])
    # 1. Theorem B blocks at the POINT g_c (A, B1, N0, N1, Abar0, Abar1, Y0p, [J0_n], S_J0)
    bl = br.piece_blocks(om, A, crec["centre_g"], crec["centre_g"], settings=crec["settings"], log=QUIET,
                         label=ulabel)
    mark("piece_blocks")
    # 2. untrusted predictor
    om1, A1, om2, A2 = predictor(om, A, gc, hF)
    for Ax in (A1, A2):
        if not (Ax[IV][K + 1] - Ax[IV][K - 1]).is_zero():
            raise ProofFailure("F_ph of a predictor coefficient is not exactly 0")
    mark("predictor")
    ETA = [ex._exact_dyadic_param(v, "eta") for v in crec["eta"]]
    old = ctx.prec
    ctx.prec = 256
    try:
        r_star = ex._exact_dyadic_param(st["r_star"], "r_star")
        Rs = []
        for i in range(DIM):
            v = Fraction(crec["eta"][1 + i]) * Fraction(st["r_star"]) * int(st["R_factor"])
            Rs.append(f"{v.numerator}/{v.denominator}")
    finally:
        ctx.prec = old
    # 3. Hessian cover of the path family (hull of xtilde(xi), |xi| <= h, inflated by R) over g in [g_lo, g_hi]
    omb, Ab = path_ball(om, A, om1, A1, om2, A2, hF)
    hb = br.HessBound([(om, A), (omb, Ab)], br._dstr(gc - hF), br._dstr(gc + hF), Rs, "1", None, log=QUIET)
    if not hb.contains_centre(A):
        raise ProofFailure("centre not inside the Hessian cover's hull")
    mark("Hessian cover")
    # 4. jets along the path: strip covers and Fourier enclosures
    Pg, PJ, Mn, Kp = int(bst["prec_g"]), int(bst["prec_J"]), int(bst["M"]), bl["Kp"]
    rho = bl["rho"]
    D0, Dh, Dh2 = acb(0), _dball(hF), _sq_ball(hF)
    Phi = fe.TrigPoly([row[:] for row in A] + [row[:] for row in A1] + [row[:] for row in A2])
    prm53, prmG, prmJ = (br.params_for(gc, gc, p) for p in (53, Pg, PJ))
    skw = dict(nx=int(st["strip_nx_new"]), rtol=float(st["strip_rtol_new"]), max_evals=int(st["strip_max_evals"]))
    fG_pt = lambda z, pr=prm53, pc=53: gjet_flat(z, pr, D0, D0, 3, (1, 2, 3), pc)  # noqa: E731
    fG_box = lambda z, pr=prm53, pc=53: gjet_flat(z, pr, Dh, Dh2, 4, (4,), pc)  # noqa: E731
    fJ_pt = lambda z, pr=prm53, pc=53: djet_flat(z, pr, D0, D0, 1, (1,), pc)  # noqa: E731
    fJ_box = lambda z, pr=prm53, pc=53: djet_flat(z, pr, Dh, Dh2, 2, (1, 2), pc)  # noqa: E731
    sG_pt = fe.strip_sup(fG_pt, Phi, rho, **skw)
    sG_box = fe.strip_sup(fG_box, Phi, rho, **skw)
    sJ_pt = fe.strip_sup(fJ_pt, Phi, rho, **dict(skw, atol=1e-3))
    sJ_box = fe.strip_sup(fJ_box, Phi, rho, **dict(skw, atol=1e-3))
    for s_ in (sG_pt, sG_box, sJ_pt, sJ_box):
        if not s_.full_strip:
            raise ProofFailure("a strip cover is not the full strip")
    mark("strips")
    eG_pt = fe.fourier_coefficients(lambda z: fG_pt(z, prmG, Pg), Phi, rho, Mn, Kp, S=sG_pt, prec=Pg)
    eG_box = fe.fourier_coefficients(lambda z: fG_box(z, prmG, Pg), Phi, rho, Mn, Kp, S=sG_box, prec=Pg)
    eJ_pt = fe.fourier_coefficients(lambda z: fJ_pt(z, prmJ, PJ), Phi, rho, Mn, Kp, S=sJ_pt, prec=PJ)
    eJ_box = fe.fourier_coefficients(lambda z: fJ_box(z, prmJ, PJ), Phi, rho, Mn, Kp, S=sJ_box, prec=PJ)
    if any(x.S_source != "strip" for x in (eG_pt, eG_box, eJ_pt, eJ_box)):
        raise ProofFailure("Fourier enclosure without a checked strip bound")
    mark("dft")
    NN = DIM * DIM

    def mats(enc, off):
        C = {nn: [[enc.c[off + DIM * r + c][nn + Kp] for c in range(DIM)] for r in range(DIM)] for nn in range(-Kp, Kp + 1)}
        S = [[enc.S[off + DIM * r + c] for c in range(DIM)] for r in range(DIM)]
        return C, S
    J1pt, SJ1 = mats(eJ_pt, 0)
    J1box, SJ1box = mats(eJ_box, 0)
    C2box, SC2 = mats(eJ_box, NN)
    # 5. Lemma 11.2: Z1 along the path, Z2 about every point of the path
    old = ctx.prec
    ctx.prec = 256
    try:
        hU = up(arb(fmpq(hF.numerator, hF.denominator)))
    finally:
        ctx.prec = old
    old = ctx.prec
    ctx.prec = int(bst["prec_g"])
    try:
        Bp, Bp_parts = operator_blocks(bl, J1pt, SJ1, acb(om1), A1, parts=True)              # D'(0)
        Bpp, Bpp_parts = operator_blocks(bl, C2box, SC2, acb(om2) / 2, [[v / 2 for v in row] for row in A2],
                                         parts=True)                                       # E(d) (ball)
        Z1c = _z1_rows(bl["B1"], None, None, hU, ETA)
        Z1G = Z1c if "drop_moving_centre" in mut else _z1_rows(bl["B1"], Bp, Bpp, hU, ETA)
        Z2, Pfac = _z2(bl, ETA, r_star, hb)
    finally:
        ctx.prec = old
    # A is injective because Z1_point < 1 (E.2); Z1_G >= Z1_point term by term (B', B'' >= 0) and lemma_11_1 needs
    # Z1_G < 1, so this check is implied, but it is the hypothesis section 11.0 states, so it is checked as stated.
    if not Z1c < 1:
        raise ProofFailure(f"Z1 at the point g_c = {float(Z1c):.4f} is not < 1 (A not shown injective)")
    mark("Z1, Z2")
    # 6. Lemma 11.1: Y' and rho
    old = ctx.prec
    ctx.prec = int(bst["prec_g"])
    try:
        om_bar = bl["om_bar"]
        lin = {1: [], 2: [], 3: [], 4: []}
        for i in range(DIM):
            l1, l2, l3, l4 = [], [], [], []
            for m in range(-K, K + 1):
                t = m + K
                im = acb(0, m)
                l1.append(im * (om_bar * A1[i][t] + om1 * A[i][t]))
                l2.append(im * (om_bar * A2[i][t] / 2 + om1 * A1[i][t] + om2 * A[i][t] / 2))
                l3.append(im * (om1 * A2[i][t] + om2 * A1[i][t]) / 2)
                l4.append(im * om2 * A2[i][t] / 4)
            lin[1].append(l1)
            lin[2].append(l2)
            lin[3].append(l3)
            lin[4].append(l4)
        cp_ = [[eG_pt.c[q * DIM + k] for k in range(DIM)] for q in range(3)]     # c1, c2, c3 at xi = 0
        Sp_ = [[eG_pt.S[q * DIM + k] for k in range(DIM)] for q in range(3)]
        Y1 = _y_parts(bl, cp_[0], Sp_[0], lin[1], arb(1))
        Y2 = _y_parts(bl, cp_[1], Sp_[1], lin[2], arb(1))
        Y3 = _y_parts(bl, cp_[2], Sp_[2], lin[3], arb(1))
        Y4 = _y_parts(bl, eG_box.c, eG_box.S, lin[4], arb(1))                       # c4 over the xi box
        Y0p = bl["Y0p"]
        Yp, rho_x, kappa = lemma_11_1([Y0p, Y1, Y2, Y3, Y4], hU, ETA, Z1G, Z2, r_star, st["rho_margin"], mut)
    finally:
        ctx.prec = old
    mark("Lemma 11.1")
    log(f"  {ulabel}: h = {float(hU):.4e}, Z1 point {float(Z1c):.4f}, Z1 path {float(Z1G):.4f}, Z2 {float(Z2):.3e}, "
        f"Y' = {float(Yp):.3e} (Y0p {max(float(Y0p[c] / ETA[c]) for c in range(DIM + 1)):.2e}, h Y1 "
        f"{max(float(hU * Y1[c] / ETA[c]) for c in range(DIM + 1)):.2e}, h^2 Y2 "
        f"{max(float(hU ** 2 * Y2[c] / ETA[c]) for c in range(DIM + 1)):.2e}, h^3 Y3 "
        f"{max(float(hU ** 3 * Y3[c] / ETA[c]) for c in range(DIM + 1)):.2e}, h^4 Y4 "
        f"{max(float(hU ** 4 * Y4[c] / ETA[c]) for c in range(DIM + 1)):.2e}), rho = {float(rho_x):.3e}, "
        f"kappa = {float(kappa):.4f}")
    # 7. identification with the branch, piece by piece (x*(g) of Theorem B is the zero found, for g in each piece)
    ident = identify(plist, centres, crec, gc, (om, A, om1, A1, om2, A2), ETA, rho_x, bl["nu"], K)
    mark("identification")
    # 8. Lemma 11.4 data: eps_W from this unit's Hessian cover, the d^0, d^1, d^2 Hill coefficients
    t = [up(ETA[1 + j] * rho_x) for j in range(DIM)]
    for j in range(DIM):
        if not t[j] < hb.R[j]:
            raise ProofFailure(f"t_{j} = eta_j rho is not < R_{j}")
    pidx = {pr: i for i, pr in enumerate(br.HPAIRS)}
    epsW = [[None] * DIM for _ in range(DIM)]
    for k in range(DIM):
        for l in range(DIM):
            s = arb(0)
            for j in range(DIM):
                s += hb.MH[k][pidx[(min(l, j), max(l, j))]] * t[j]
            epsW[k][l] = up(s)

    def split(Cd):
        cen, rad = {}, {}
        for nn in range(-Kp, Kp + 1):
            cen[nn] = [[None] * DIM for _ in range(DIM)]
            rad[nn] = [[None] * DIM for _ in range(DIM)]
            for r in range(DIM):
                for c in range(DIM):
                    v = Cd[nn][r][c]
                    mid = acb(v.real.mid(), v.imag.mid())
                    cen[nn][r][c] = mid
                    rad[nn][r][c] = (v - mid).abs_upper()
        return cen, rad
    J1c, rad1 = split(J1pt)
    C2c, rad2 = split(C2box)
    old = ctx.prec
    ctx.prec = 128
    try:
        rho_om = up(ETA[0] * rho_x)
        om2half = (om2 / 2).mid() if isinstance(om2, arb) else arb(om2) / 2
    finally:
        ctx.prec = old
    U = dict(K=K, Kp=Kp, A=A, om_bar=bl["om_bar"], om1=om1, rho_om=rho_om, h=hU, J0=bl["J"], SJ0=bl["SJ"],
             J1c=J1c, rad1=rad1, SJ1=SJ1, epsW=epsW, rho=rho, rho0=bl["rho0"], rho2=hb.rho2,
             C2c=C2c, rad2=rad2, SC2=SC2, om2half=om2half)
    cert = certify_uniform(U, settings=st, controls=controls, log=log)
    mark("certificate")
    out = dict(
        type="group_unit", group=gid, label=ulabel, part=None if part is None else [int(part[0]), int(part[1])],
        g=[grp["g_lo"], grp["g_hi"]], g_centre=crec["centre_g"],
        centre_piece=crec["label"], centre_sha256=crec["centre_sha256"],
        pieces=[r["label"] for r in plist], piece_centre_sha256={r["label"]: r["centre_sha256"] for r in plist},
        branch_piece_sha256={r["label"]: br.record_digest(r) for r in plist},
        piece_g={r["label"]: [r["g_lo"], r["g_hi"]] for r in plist}, eta=crec["eta"], rho0=crec["settings"]["rho0"],
        half_width=bound_rec(hU), uniform=True, ok=True, settings=st,
        program_sha256=PROGRAM_SHA256, sources_sha256=SOURCES_SHA256,
        threads_pinned_before_numpy=not _NUMPY_PREIMPORTED,
        delta=cert["delta"], delta_requested=st["delta"], multiplier_bound_full_period=cert["multiplier_bound_full_period"],
        T_lo=cert["T_lo"],
        existence=dict(Z1_point=bound_rec(Z1c), Z1_path=bound_rec(Z1G), Z2=bound_rec(Z2), polydisc_P=float(Pfac),
                       r_star=st["r_star"], rho=bound_rec(rho_x), Yprime=bound_rec(Yp), kappa=bound_rec(kappa),
                       Y0p_max=float(max(Y0p[c] / ETA[c] for c in range(DIM + 1))),
                       hY1_max=float(max(hU * Y1[c] / ETA[c] for c in range(DIM + 1))),
                       h2Y2_max=float(max(hU ** 2 * Y2[c] / ETA[c] for c in range(DIM + 1))),
                       h3Y3_max=float(max(hU ** 3 * Y3[c] / ETA[c] for c in range(DIM + 1))),
                       h4Y4_max=float(max(hU ** 4 * Y4[c] / ETA[c] for c in range(DIM + 1))),
                       hessian_cover=hb.record(), identification=ident),
        predictor=dict(omega1=ct.dyadic_to_text(om1), omega2=ct.dyadic_to_text(om2), sha256=hashlib.sha256(
            "".join(ct.dyadic_to_text(Ax[i][m].real) + ct.dyadic_to_text(Ax[i][m].imag)
                    for Ax in (A1, A2) for i in range(DIM) for m in range(2 * K + 1)).encode()).hexdigest()),
        eps_W_max=float(max(max(r) for r in epsW)),
        strips=dict(G_pt=ex._strip_rec(sG_pt), G_box=ex._strip_rec(sG_box), J_pt=ex._strip_rec(sJ_pt),
                    J_box=ex._strip_rec(sJ_box)),
        certificate={k: v for k, v in cert.items() if k != "internals"}, timings_s=marks,
        wall_s=round(time.time() - t0, 1))
    if controls and controls.get("dump"):
        out["_internals"] = cert.get("internals")
        out["_ctx"] = dict(bl=bl, om=om, A=A, om1=om1, A1=A1, om2=om2, A2=A2, ETA=ETA, U=U, settings=st, grp=grp,
                           plist=plist, crec=crec, rho_x=rho_x, hF=hF, hU=hU, Z1c=Z1c, Z1G=Z1G, Z2=Z2, Yp=Yp,
                           r_star=r_star, hb=hb, Yparts=[bl["Y0p"], Y1, Y2, Y3, Y4], Bp=Bp, Bpp=Bpp,
                           Bp_parts=Bp_parts, Bpp_parts=Bpp_parts, centres=centres, gc=gc)
    if mut or _widen != 1:
        out["MUTATED"] = sorted(mut) + ([f"widen x{_widen}"] if _widen != 1 else [])
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


def _current_unit(r):
    return (r.get("ok") is True and r.get("uniform") is True and not r.get("MUTATED")
            and r.get("program_sha256") == PROGRAM_SHA256 and r.get("sources_sha256") == SOURCES_SHA256
            and isinstance(r.get("settings"), dict))


def _piece_unit_matches(unit, rec):
    return (unit is not None and _current_unit(unit) and unit.get("label") == rec["label"]
            and unit.get("centre_sha256") == rec["centre_sha256"]
            and unit.get("g") == [rec["g_lo"], rec["g_hi"]]
            and unit.get("eta") == rec["eta"] and unit.get("rho0") == rec["settings"]["rho0"]
            and unit.get("branch_piece_sha256") == br.record_digest(rec)
            and unit.get("existence", {}).get("r_uniqueness_logged") == rec["r_uniqueness"])


def _units_from_records(records, kind):
    out = {}
    for r in records:
        if r.get("type") == kind and _current_unit(r):
            out[r["label"]] = r
    return out


def done_labels(K=12):
    path = LOG.format(K=K)
    return _units_from_records(br.snapshot_jsonl(path)[0] if os.path.exists(path) else [], "unit")


ATTEMPTS = (dict(delta="3e-5", Ke_offset=12), dict(delta="3e-5", Ke_offset=16, strip_nx_new=32),
            dict(delta="2.5e-5", Ke_offset=16, strip_nx_new=32), dict(delta="2e-5", Ke_offset=16, strip_nx_new=32))


def run(labels=None, K=12, workers=2, attempts=ATTEMPTS, budget_s=3500, log=print):
    """Prove the listed pieces (default: every logged piece not yet done), trying the settings in order (the first
    that closes is kept; untrusted choices). Appends each result (or failure) to the log at once."""
    import multiprocessing as mp
    T0 = time.time()
    path = LOG.format(K=K)
    if os.path.exists(path):
        br.snapshot_jsonl(path)
    pieces, _, _ = br.validate_final(K)
    have = done_labels(K)
    todo = [p["rec"]["label"] for p in pieces if not _piece_unit_matches(have.get(p["rec"]["label"]), p["rec"])]
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
                                          trace=res.get("trace"), wall=res.get("wall"),
                                          program_sha256=PROGRAM_SHA256, sources_sha256=SOURCES_SHA256))
                    log(f"  {l}: failed at delta {pending[l][0]}: {res['why'][:200]}")
                    rest = pending[l][1:]
                    if rest:
                        nxt[l] = rest
                if time.time() - T0 > budget_s:
                    break
            pending = nxt if time.time() - T0 < budget_s else {**nxt, **{}}
    return done_labels(K)


def done_groups(K=12):
    """Certified group units by unit label (G<gid> for a whole group, G<gid>[i0:i1] for a run of its pieces; the last
    one logged for a label wins; all are valid)."""
    path = LOG.format(K=K)
    return _units_from_records(br.snapshot_jsonl(path)[0] if os.path.exists(path) else [], "group_unit")


def _covering_group_unit(rec, gid, hg):
    """A certified group unit (whole group preferred, then runs in label order) of group gid that lists the piece rec
    with the same centre digest, or None."""
    def matches(x):
        if not (_current_unit(x) and x.get("group") == gid and rec["label"] in x.get("pieces", [])
                and x.get("piece_centre_sha256", {}).get(rec["label"]) == rec["centre_sha256"]
                and x.get("piece_g", {}).get(rec["label"]) == [rec["g_lo"], rec["g_hi"]]
                and x.get("branch_piece_sha256", {}).get(rec["label"]) == br.record_digest(rec)):
            return False
        interval = x.get("g", [])
        if len(interval) != 2 or not (Fraction(interval[0]) <= Fraction(rec["g_lo"])
                                      and Fraction(rec["g_hi"]) <= Fraction(interval[1])):
            return False
        ident = [i for i in x.get("existence", {}).get("identification", []) if i.get("label") == rec["label"]]
        return (len(ident) == 1 and ident[0].get("ok") is True
                and ident[0].get("g") == [rec["g_lo"], rec["g_hi"]]
                and ident[0].get("centre_sha256") == rec["centre_sha256"]
                and ident[0].get("r_uniqueness_logged") == rec["r_uniqueness"])
    cands = [x for x in hg.values() if matches(x)]
    cands.sort(key=lambda x: (x.get("part") is not None, x["label"]))
    return cands[0] if cands else None


def _halves(n):
    """The two runs (0, n // 2), (n // 2, n) of a group of n >= 2 pieces."""
    return [(0, n // 2), (n // 2, n)] if n >= 2 else []


def _gjob(args):
    gid, part, settings = args
    t0 = time.time()
    try:
        return dict(gid=gid, part=part, ok=True, rec=prove_group_uniform(gid, settings=settings, log=QUIET, part=part))
    except FAILURES as e:
        return dict(gid=gid, part=part, ok=False, why=f"{type(e).__name__}: {e}", wall=round(time.time() - t0, 1),
                    settings=settings)
    except Exception as e:  # noqa: BLE001  (recorded, never a proof)
        import traceback
        return dict(gid=gid, part=part, ok=False, why=f"{type(e).__name__}: {e}", trace=traceback.format_exc()[-1500:],
                    wall=round(time.time() - t0, 1), settings=settings)


GROUP_ATTEMPTS = (dict(delta="3e-5"),)


def group_coverage(K=12):
    """(pieces, groups, uncovered): a piece is covered by a certified piece unit with its centre digest, or by a certified
    group unit of its group (whole or a run of its pieces) that lists it with the same centre digest."""
    pieces, groups, _ = br.validate_final(K)
    hp, hg = done_labels(K), done_groups(K)
    unc = {}
    for p in pieces:
        r = p["rec"]
        u = hp.get(r["label"])
        if _piece_unit_matches(u, r):
            continue
        if _covering_group_unit(r, p["group"], hg) is not None:
            continue
        unc.setdefault(p["group"], []).append(r["label"])
    return pieces, groups, unc


def _next_group_units(gid, labels, uncovered, failed):
    """Pure fallback plan: whole group, then failed halves' piece slices; absent legacy part means whole group."""
    if (gid, None) not in failed:
        return [(gid, None)], []
    out, fallback = [], []
    for part in _halves(len(labels)):
        if not set(labels[part[0]:part[1]]) & set(uncovered):
            continue
        (fallback if (gid, part) in failed else out).append((gid, part))
    if not out and len(labels) < 2 and uncovered:
        fallback.append((gid, None))
    return out, fallback


def run_groups(gids=None, K=12, workers=1, attempts=GROUP_ATTEMPTS, budget_s=3300, fallback=True, log=print):
    """Group units (prove_group_uniform) for every logged group with an uncovered piece, in order of g, at most
    `workers` at a time; each result (or failure) is appended to the log at once. A group whose whole-group unit fails
    under every attempt is split into two halves (runs of consecutive pieces, prove_group_uniform(part=...)); a half
    that fails falls back to piece units for its uncovered pieces (run(), the piece driver), if fallback. Failures
    already in the log are not retried."""
    import multiprocessing as mp
    T0 = time.time()
    path = LOG.format(K=K)
    if os.path.exists(path):
        br.snapshot_jsonl(path)
    pieces, groups, unc = group_coverage(K)
    npieces = {}
    plabels = {}
    for p in sorted(pieces, key=lambda q: Fraction(q["rec"]["g_lo"])):
        npieces[p["group"]] = npieces.get(p["group"], 0) + 1
        plabels.setdefault(p["group"], []).append(p["rec"]["label"])
    failed = set()
    for r in br._read_jsonl_tolerant(path):
        if (r.get("type") == "group_failure" and r.get("program_sha256") == PROGRAM_SHA256
                and r.get("sources_sha256") == SOURCES_SHA256):
            pt = r.get("part")
            failed.add((r["group"], None if pt is None else (int(pt[0]), int(pt[1]))))
    todo = [g["group"] for g in groups if g["group"] in unc and (gids is None or g["group"] in set(gids))]
    log(f"group units: {len(groups)} groups logged, {len(todo)} with uncovered pieces, workers {workers}")
    to_pieces = []                                          # (gid, part) whose pieces fall back to piece units

    def units_for(gid):
        """The units still to try for group gid: the whole group, else its halves with uncovered pieces."""
        out, fallback_units = _next_group_units(gid, plabels[gid], unc.get(gid, []), failed)
        to_pieces.extend(fallback_units)
        return out
    queue = [(gid, pt, list(attempts)) for g0 in todo for gid, pt in units_for(g0)]
    with mp.get_context("fork").Pool(workers, maxtasksperchild=2) as pool:
        running = {}
        while (queue or running) and time.time() - T0 < budget_s:
            while queue and len(running) < workers and time.time() - T0 < budget_s:
                gid, pt, ds = queue.pop(0)
                running[(gid, pt)] = (pool.apply_async(_gjob, ((gid, pt, dict(ds[0])),)), ds)
            done = [key for key, (ar, _) in running.items() if ar.ready()]
            if not done:
                time.sleep(2)
                continue
            for key in done:
                gid, pt = key
                ar, ds = running.pop(key)
                res = ar.get()
                lab = unit_label(gid, pt)
                if res["ok"]:
                    br._append(path, res["rec"])
                    c = res["rec"]["certificate"]
                    log(f"  {lab}: CERTIFIED uniformly over [{res['rec']['g'][0]}, {res['rec']['g'][1]}] "
                        f"({len(res['rec']['pieces'])} pieces), delta {res['rec']['delta_requested']}, (SC) worst "
                        f"{c['SC_worst_ratio']:.3e}, rho {res['rec']['existence']['rho']['approx']:.2e}, "
                        f"Z1 path {res['rec']['existence']['Z1_path']['approx']:.3f}, {res['rec']['wall_s']} s")
                else:
                    br._append(path, dict(type="group_failure", group=gid, label=lab,
                                          part=None if pt is None else [pt[0], pt[1]], why=res["why"],
                                          settings=res.get("settings"), trace=res.get("trace"), wall=res.get("wall"),
                                          program_sha256=PROGRAM_SHA256, sources_sha256=SOURCES_SHA256))
                    log(f"  {lab}: group unit failed ({ds[0]}): {res['why'][:200]}")
                    if ds[1:]:
                        queue.insert(0, (gid, pt, ds[1:]))
                    elif pt is None:
                        failed.add((gid, None))
                        queue[0:0] = [(gid, h, list(attempts)) for _, h in units_for(gid)]
                    else:
                        failed.add((gid, pt))
                        to_pieces.append((gid, pt))
    left = budget_s - (time.time() - T0)
    if fallback and to_pieces and left > 300:
        _, _, unc = group_coverage(K)
        labels = []
        for gid, pt in sorted(to_pieces, key=lambda t: (t[0], -1 if t[1] is None else t[1][0])):
            run_labels = plabels[gid] if pt is None else plabels[gid][pt[0]:pt[1]]
            labels += [l for l in run_labels if l in set(unc.get(gid, [])) and l not in labels]
        if labels:
            log(f"falling back to piece units for {[unit_label(g, p) for g, p in to_pieces]} ({len(labels)} pieces)")
            run(labels=labels, K=K, workers=workers, budget_s=left, log=log)
    return done_groups(K)


SOURCES = ["fourier/branch_stability.py", "fourier/branch.py", "fourier/stability.py", "fourier/existence.py",
           "fourier/centre.py", "fourier/arbmodel.py", "fourier/fourier_eval.py", "fourier/tp06_18d_arb.py",
           "model/tp06_18d.py", "model/scales.txt"]


RECORD = os.path.join(RESULTS, "fourier-branch-stability-uniform.json")


def _covered_runs(rows):
    runs, cur = [], None
    for r in rows:
        if r["uniform"]:
            if cur is None:
                cur = [r["g"][0], r["g"][1], 1]
            elif Fraction(r["g"][0]) <= Fraction(cur[1]):
                cur[1] = max(cur[1], r["g"][1], key=Fraction)
                cur[2] += 1
            else:
                runs.append(cur)
                cur = [r["g"][0], r["g"][1], 1]
        elif cur is not None:
            runs.append(cur)
            cur = None
    if cur is not None:
        runs.append(cur)
    return runs


def _check_theorem_b(theorem_b, pieces, branch_hash, centre_hash):
    if (theorem_b.get("run_log_sha256") != branch_hash or theorem_b.get("centres_sha256") != centre_hash
            or theorem_b.get("program_sha256") != br.PROGRAM_SHA256
            or theorem_b.get("sources_sha256") != br.SOURCES_SHA256
            or theorem_b.get("n_pieces") != len(pieces) or theorem_b.get("connected_pieces") != len(pieces)
            or len(theorem_b.get("gluing", [])) != len(pieces) - 1
            or not all(g.get("glued") is True for g in theorem_b.get("gluing", []))):
        raise ProofFailure("Theorem B record does not match the complete final branch snapshot")
    bt = {r["label"]: r for r in theorem_b["pieces"]}
    if len(bt) != len(pieces):
        raise ProofFailure("Theorem B duplicate or missing piece")
    for p in pieces:
        r = p["rec"]
        expected = dict(label=r["label"], g=[r["g_lo"], r["g_hi"]], g_centre=r["centre_g"],
                        centre_sha256=r["centre_sha256"], eta=r["eta"], r_uniqueness=r["r_uniqueness"])
        if any(bt.get(r["label"], {}).get(k) != v for k, v in expected.items()):
            raise ProofFailure(f"Theorem B piece mismatch: {r['label']}")
        if not (Fraction(theorem_b["g_covered"][0]) <= Fraction(r["g_lo"])
                and Fraction(r["g_hi"]) <= Fraction(theorem_b["g_covered"][1])):
            raise ProofFailure("piece outside Theorem B connected range")


def collect(K=12, write=True, log=print):
    """The Theorem C record: every piece of the branch record with the unit that covers it (a piece unit, or a group
    unit of its group: the whole group or a run of its pieces), the maximal intervals covered, the group units and the
    failures. Centre digests are matched
    against the branch logs; nothing is taken from a unit whose centre digest does not match."""
    branch_records, branch_hash = br.snapshot_jsonl(br.RUN_LOG.format(K=K))
    centre_records, centre_hash = br.snapshot_jsonl(br.CENTRES.format(K=K))
    pieces, groups, _ = br.validate_final(K, records=branch_records, centre_records=centre_records)
    with open(os.path.join(RESULTS, "fourier-branch-gks.json"), "rb") as fh:
        theorem_b_bytes = fh.read()
    theorem_b = json.loads(theorem_b_bytes)
    theorem_b_hash = hashlib.sha256(theorem_b_bytes).hexdigest()
    _check_theorem_b(theorem_b, pieces, branch_hash, centre_hash)
    allr, stability_hash = br.snapshot_jsonl(LOG.format(K=K))
    hp, hg = _units_from_records(allr, "unit"), _units_from_records(allr, "group_unit")
    fails = [r for r in allr if r.get("type") in ("failure", "group_failure")]
    rows = []
    for p in pieces:
        r = p["rec"]
        u = hp.get(r["label"])
        if not _piece_unit_matches(u, r):
            u = None
        gu = _covering_group_unit(r, p["group"], hg)
        cov = gu if gu is not None else u          # report the group unit when there is one (both are valid)
        rows.append(dict(label=r["label"], group=p["group"], g=[r["g_lo"], r["g_hi"]], uniform=cov is not None,
                         unit=None if cov is None else (cov["label"] if cov is gu else r["label"]),
                         unit_kind=None if cov is None else ("group" if cov is gu else "piece"),
                         also_piece_unit=bool(u is not None and cov is gu),
                         delta=cov["delta"] if cov else None, delta_requested=cov["delta_requested"] if cov else None,
                         multiplier_bound_full_period=cov["multiplier_bound_full_period"] if cov else None,
                         rho=cov["existence"]["rho"]["approx"] if cov else None,
                         SC_worst_ratio=cov["certificate"]["SC_worst_ratio"] if cov else None,
                         theta_T=cov["certificate"]["theta_T"]["approx"] if cov else None,
                         program_sha256=cov.get("program_sha256") if cov else None))
    covered = [r for r in rows if r["uniform"]]
    if len(covered) != len(rows):
        raise ProofFailure(f"final stability incomplete: {len(covered)} of {len(rows)} pieces")
    runs = _covered_runs(rows)
    used = {}
    for r in covered:
        used.setdefault((r["unit_kind"], r["unit"]), r)
    units_used = [hg[lab] if kind == "group" else hp[lab] for kind, lab in used]
    worst = max((Fraction(x["multiplier_bound_full_period"]["dec"]) for x in units_used), default=None)
    prog = {}
    for x in units_used:
        key = x.get("program_sha256") or "not recorded (early version of branch_stability.py)"
        prog[key] = prog.get(key, 0) + 1
    gunits = []
    for x in sorted(hg.values(), key=lambda v: (v["group"], -1 if v.get("part") is None else v["part"][0])):
        gunits.append(dict(group=x["group"], label=x["label"], part=x.get("part"), g=x["g"],
                           half_width=x["half_width"]["approx"],
                           pieces=x["pieces"], centre_piece=x["centre_piece"], delta_requested=x["delta_requested"],
                           multiplier_bound_full_period=x["multiplier_bound_full_period"]["approx"],
                           rho=x["existence"]["rho"]["approx"], Z1_path=x["existence"]["Z1_path"]["approx"],
                           Z1_point=x["existence"]["Z1_point"]["approx"], Z2=x["existence"]["Z2"]["approx"],
                           kappa=x["existence"]["kappa"]["approx"],
                           identification_worst_ratio=max(i["lhs"] / i["r_uniqueness"]
                                                          for i in x["existence"]["identification"]),
                           SC_worst_ratio=x["certificate"]["SC_worst_ratio"],
                           critical_ratios=[c["ratio"] for c in x["certificate"]["critical_columns"]],
                           theta_T=x["certificate"]["theta_T"]["approx"], wall_s=x["wall_s"],
                           program_sha256=x.get("program_sha256")))
    n_piece_units = len(hp)
    out = dict(
        what="Theorem C: linear stability of the single-cell periodic orbit uniformly in G_Ks on the rec 2 branch, "
             "certified on whole groups of pieces (group units) and on single pieces (piece units) "
             "(fourier/branch_stability.py; lemmas: fourier/LEMMAS-stability.md sections 10 and 11)",
        status="computed; awaiting adversarial review",
        theorem=theorem_text(runs, worst),
        n_pieces_branch=len(rows), n_pieces_uniform=len(covered),
        n_group_units=len(hg), n_group_units_used=sum(1 for kind, _ in used if kind == "group"),
        n_piece_units=n_piece_units, n_piece_units_used=sum(1 for kind, _ in used if kind == "piece"),
        n_units_used=len(units_used),
        intervals_uniform=[dict(g=[a, b], n_pieces=n) for a, b, n in runs],
        uncovered_pieces=[r["label"] for r in rows if not r["uniform"]],
        worst_multiplier_bound=None if worst is None else _float_up(worst),
        worst_multiplier_bound_exact=None if worst is None else str(worst),
        delta_requested_values=sorted({x["delta_requested"] for x in units_used}),
        programs_of_units_used=prog,
        group_units=gunits, pieces=rows,
        failures=[{k: v for k, v in f.items() if k != "trace"} for f in fails],
        settings_by_unit={x["label"]: x["settings"] for x in units_used},
        sources_sha256=SOURCES_SHA256,
        documents_sha256={p: br.sha256(os.path.join(ROOT, p)) for p in DOCUMENTS},
        theorem_B_sha256=theorem_b_hash,
        log=os.path.relpath(LOG.format(K=K), ROOT), log_sha256=stability_hash,
        branch_run_log_sha256=branch_hash, branch_centres_sha256=centre_hash,
        python_flint=flint.__version__, FLINT=flint.__FLINT_VERSION__, python=platform.python_version(),
        numpy=np.__version__, machine=platform.machine(), date=time.strftime("%Y-%m-%d"),
        total_wall_s=round(sum(x["wall_s"] for x in units_used), 1))
    if write:
        with open(RECORD, "w") as fh:
            json.dump(out, fh, indent=1)
            fh.write("\n")
        log(f"wrote {RECORD}: {len(covered)} of {len(rows)} pieces uniform ({len(hg)} group units, "
            f"{n_piece_units} piece units in the log)")
    return out


def _float_up(value):
    f = float(value)
    return math.nextafter(f, math.inf) if Fraction.from_float(f) < value else f


def _decimal_up(value, digits=9):
    q = Fraction(value) * 10 ** digits
    n = -(-q.numerator // q.denominator)
    return f"{n // 10 ** digits}.{n % 10 ** digits:0{digits}d}"


def theorem_text(runs, worst):
    if not runs:
        return "No piece certified."
    iv = "; ".join(f"[{a}, {b}]" for a, b, _ in runs)
    return ("Conditional on Theorem B (results/fourier-branch-gks.json: for every G_Ks in each listed piece the branch "
            "orbit x*(G_Ks) exists, is unique in the piece's ball and has minimal period T) and on the lemmas of "
            "fourier/LEMMAS-stability.md (sections 1 to 4, 10 and 11): for EVERY G_Ks in " + iv + " (a union of "
            "branch pieces, each covered by a certified unit: a group unit of its group, for the whole group or a run "
            "of its consecutive pieces, or a piece unit), the "
            "single-cell periodic orbit x*(G_Ks) of Erhardt's 18-state TP06 endocardial model has the Floquet "
            "multiplier 1 algebraically simple and its other 17 Floquet multipliers of modulus < e^(-delta T_lo) with "
            "the unit's delta and T_lo (worst full-period nontrivial multiplier bound over the units: "
            f"{_decimal_up(worst) if worst is not None else 'n/a'}); hence it is locally exponentially orbitally stable "
            "with asymptotic phase (Theorem 4(iii)). The bound holds uniformly on each unit's interval, not only at "
            "sampled values of G_Ks.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--collect", action="store_true")
    ap.add_argument("--labels", default="")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--budget", type=float, default=3500)
    ap.add_argument("--groups", action="store_true", help="group units for every group with an uncovered piece")
    ap.add_argument("--gids", default="", help="comma-separated group ids for --groups (default: all)")
    ap.add_argument("--no-fallback", action="store_true", help="with --groups: do not fall back to piece units")
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
    if a.groups:
        run_groups(gids=[int(v) for v in a.gids.split(",") if v] or None, workers=a.workers, budget_s=a.budget,
                   fallback=not a.no_fallback)
    if a.run:
        run(labels=[l for l in a.labels.split(",") if l] or None, workers=a.workers, budget_s=a.budget)
    if a.collect:
        collect()


if __name__ == "__main__":
    main()
