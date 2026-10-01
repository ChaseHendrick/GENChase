"""Stage S: computer-assisted exclusion of Floquet spectrum for the rotating 1-wave of the N-cell ring (Arb).

Status: computed; awaiting adversarial review. Nothing written by this program is "verified": it inherits the status
of the Stage E record it reads (fourier/existence.py), and the lemmas it implements (fourier/LEMMAS-stability.md) await
a second independent reading.

What this file checks
---------------------
It implements the certificate of Theorem 3 of fourier/LEMMAS-stability.md, conditions (C0) to (C5), with route A of
Lemma 3.4 (weighted power-of-two cell coordinates S) for the tail and the Schur-complement form (SC) of Lemma 3.5 for
the small gain, and then states Theorem 4. Section and lemma numbers below refer to that file. Every inequality of the
certificate is decided in Arb ball arithmetic (python-flint 0.9.0) at `prec` bits (default 128, everywhere, so in
particular on the near-axis rows and columns, as checklist item 6 requires). Floating point (numpy / LAPACK / scipy)
only CHOOSES exact numbers (S, U_r, Lambda_r, V, Lambda, a, b, R_0); their quality decides whether the inequalities
hold, never whether a passed inequality is true.

Inputs (checklist "Inputs from Stage E", item C0)
  * The Stage E record results/fourier-existence-N{N}.json: omega_lo, omega_hi (exact hex), r := r_existence (exact
    hex; NOT r_uniqueness, section 4.1), the weights eta (settings), rho0, rho, rho2, R, K', M, the precisions and the
    strip-cover parameters. The record's centre_sha256 must match the centre file.
  * The enclosures [J_n] (|n| <= K'), the entrywise strip bound S_J on |Im theta| <= rho, and the polydisc bounds M_k
    (|Im theta| <= rho2, |w_j| <= R_j) are recomputed here by the same calls to fourier_eval as existence.py makes
    (strip_sup / fourier_coefficients with Stage E's settings), because existence.py does not return them. They are
    rigorous by themselves (fourier_eval Lemmas 1-3); as a consistency check their S_max and the trigonometric
    polynomial digests must equal the values in the Stage E record, else the run fails.

Steps (checklist section 5 of the lemma file)
  1. N, c = N^2 / 64000, [d_m] = arbmodel.damping(m, N) (exact sin of a rational), E = e_V e_V^T.
  2. t_j = eta_j r < R_j asserted. eps_{kl} = (M_k / R_l) [(1 - t_l / R_l)^{-1} prod_j (1 - t_j / R_j)^{-1} - 1]
     (Lemma 4.1), rho_e = min(rho0, rho2). Cell coordinates S = diag(2^{e_l}) (exact; e chosen in floating point to
     make the tail bound small). In S-coordinates every 18 x 18 matrix M becomes S^{-1} M S, entries M_kl 2^{e_l - e_k}
     (exact). [A_n] := [J_n] + ball(0, eps e^{-rho_e |n|}) for |n| <= n_A := K', and for |n| > K' the entrywise
     tail form ball(0, S_J e^{-rho |n|} + eps e^{-rho_e |n|}) (both bounds hold for every n, section 4.1). The tail form
     of Lemma 3.7: ||A_n||_{1->1} <= s1 q1^|n| + s2 q2^|n|, s1 = ||S_J||, q1 = e^{-rho}, s2 = ||eps||, q2 = e^{-rho_e};
     Gtail(k) = 2 sum_i s_i q_i^k / (1 - q_i).
  3. alpha^up = sum_{|n| <= n_A} ||[A_n]|| + Gtail(n_A + 1) + 4c (Lemma 1.0, in S-coordinates; a similarity does not
     change spec H_0), R_0 = the least power of two > alpha^up.
  4. delta: the requested decimal rounded UP to a dyadic with denominator 2^60 (a certificate for a larger delta
     implies the one for the requested value). b = -a = an exact double near omega_bar (N/2 + 1/4). Checked in Arb:
     delta > 0, a < 0 < b, b - a >= omega_hi N, b < omega_lo N, -a < omega_lo N (C1).
  5. Tail, route A of Lemma 3.4 (C2), for r = 0..floor(N/2): X_r = A0c - [d_r] E with A0c the exact real midpoint of
     [A_0]; U_r exact complex (floating-point eigenvectors of X_r, with near-coincident eigenvalues grouped into an
     orthonormal basis of their span, columns scaled to unit 1-norm), Lambda_r exact (diagonal of U_r^{-1} X_r U_r in
     floating point); [U_r^{-1}] by Arb inversion; Fr = [U_r^{-1}] X_r U_r - Lambda_r; kappa_r = ||U_r|| ||[U_r^{-1}]||;
     g_0 = omega_lo (K_e + 1) - h, h = max(|a|, |b|), eta > 0 exact; gamma_r = min_l max(-delta - eta - Re lambda_rl,
     g_0 - eta - |Im lambda_rl|); check gamma_r > ||Fr||; rho_T = max_r kappa_r / (gamma_r - ||Fr||).
  6. Window W = {|m| <= K_e}, n_W = 18 (2 K_e + 1). [H_WW] (S-coordinates): blocks [A_{w-w'}], diagonal blocks
     [A_0] - i [omega] w I - [d_w] E with [omega] the ball [omega_lo, omega_hi]. V, Lambda: LAPACK eigenvectors /
     eigenvalues of the floating-point midpoint (unscaled), V transformed to S-coordinates and each column scaled to
     unit 1-norm (exact doubles). Vi: the floating-point inverse of V (exact doubles).
     V^{-1} and Fm are bounded as follows (the bounds the lemmas use are fm_j and beta, upper bounds of weighted column
     sums of Fm and of V^{-1}; they are obtained without forming an inverse of the big matrix in Arb):
       C := I - Vi V (Arb), q_C := ||C||_zeta < 1 checked. Then Vi V = I - C is invertible, so V is invertible
       ((C3)), and V^{-1} = (I - C)^{-1} Vi with ||(I - C)^{-1}||_zeta <= 1 / (1 - q_C) (Neumann).
       Fm = V^{-1} H_WW V - Lambda = V^{-1} (H_WW V - V Lambda) = (I - C)^{-1} Y, Y := Vi (H_WW V - V Lambda).
       Since Vi V = I - C, Y = Vi H_WW V - Lambda + C Lambda exactly, so with Wm := Vi [H_WW] V - Lambda (Arb; a ball
       containing the value for every matrix in [H_WW], in particular the true one),
       ||Y e_j||_zeta <= ||Wm e_j||_zeta + |lambda_j| ||C e_j||_zeta and ||Fm e_j||_zeta <= ||Y e_j||_zeta / (1 - q_C);
       fm_j := (||Wm e_j||_zeta + |lambda_j| ||C e_j||_zeta) / ((1 - q_C) zeta_j).
       beta_{(w,l)} = ||V^{-1} e_{(w,l)}||_zeta <= ||Vi e_{(w,l)}||_zeta / (1 - q_C).
     All three products ([H_WW] V, Vi ([H_WW] V), Vi V) are Arb matrix products at `prec` bits; column sums of
     absolute values use exact upper bounds (acb.abs_upper) summed in Arb.
  7. dist_j: exact distance from lambda_j (an exact double) to the boundary of Omega = (-delta, R_0) x (a, b), a lower
     bound in Arb (the coordinates are exact rationals); dist_j > 0 for every j (C3); the count of lambda_j in Omega,
     by exact rational comparisons, must be 1 (C5).
  8. Couplings (Lemma 3.7, S-coordinates): t_w = sum_{|n| <= n_A, |w + n| > K_e} ||[A_n]|| + Gtail(n_A + 1);
     r_j = zeta_T sum_{(w,l)} t_w |V_{(w,l),j}|; b_m for K_e < |m| <= K_e + n_c from the entrywise |[A_{w-m}]|
     (tail form where |w - m| > n_A); the far bound (beta_max / zeta_T) Gtail(n_c + 1) / 2 for |m| > K_e + n_c
     (valid because the tail form holds for every n); bhat = max of these; sigma_off = sum_{0 < |n| <= n_A} ||[A_n]||
     + Gtail(n_A + 1); theta_c = sigma_off + ||[A_0] - A0c||; theta_T = theta_c rho_T.
  9. (C4) by (SC): theta_T < 1 and fm_j + bhat rho_T r_j / ((1 - theta_T) zeta_j) < dist_j for every j. (SG) is also
     evaluated and recorded, but not required.
 10. The record: delta, the certified bounds e^{-delta T_lo} (full period, T_lo = 2 pi / omega_hi) and e^{-delta tau_lo}
     (tau_lo = T_lo / N), rounded upward from Arb, every constant above, the hashes of inputs and program.
Then Theorem 3 gives (G) and Theorem 4 the multiplier statements.

Not part of the certificate (sanity and diagnostics): the residual of the trivial eigenvector P* = (i m abar_m) under
[H_WW] (a dropped or wrong coefficient shows up there; failing it stops the run), the floating-point leading
exponents, and the weights.

Test-only hooks (`controls`, never used by the driver; recorded in the output when used): damping_sign = -1
(anti-diffusion), drop = [n, ...] (coefficients A_{+-n} set to zero in the proof data and, unless drop_proof_only,
in the floating-point data that choose V, U_r, S), omega_lo (replaces Stage E's
omega_lo), Ke (absolute window), skip_sanity.
"""
import argparse
import hashlib
import json
import math
import os
import platform
import resource
import sys
import time
from fractions import Fraction

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import flint  # noqa: E402
from flint import acb, acb_mat, arb, arb_mat, ctx, fmpq  # noqa: E402

import arbmodel as am  # noqa: E402
import centre as ct  # noqa: E402
import existence as ex  # noqa: E402
import fourier_eval as fe  # noqa: E402

DIM = 18
IV = 0
RESULTS = os.path.join(ROOT, "results")


class ProofFailure(RuntimeError):
    """An inequality of the Stage S certificate could not be certified (the claim is NOT proved)."""


class InputMismatch(RuntimeError):
    """The recomputed Stage E inputs do not match the Stage E record, or a sanity check failed."""


DEFAULTS = dict(
    delta="5e-6",            # requested; rounded up to a dyadic with denominator 2^60
    Ke_offset=16,            # K_e = floor(N/2) + Ke_offset
    n_c=24,                  # explicit b_m for K_e < |m| <= K_e + n_c
    prec=128,                # bits for every Arb computation of the certificate
    eta_tail="1/1048576",    # eta > 0 of Lemma 3.4 (exact)
    S_exps=None,             # cell coordinates S = diag(2^e); None = floating-point search (recorded)
    zeta="ones",             # window weights zeta_j (and zeta_T = 1)
    cluster_tols=[0.0, 1e-3, 3e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2],
    sanity_tol="1e-6",       # trivial-eigenvector residual (relative, S-coordinates); a sanity check only
)


# ------------------------------------------------------------------------------------------------ small helpers
up, lo, amax, bound_rec = ex.up, ex.lo, ex.amax, ex.bound_rec


def frac(x):
    """Exact Fraction of an exact arb or a float."""
    if isinstance(x, arb):
        return ex.to_fraction(x)
    return Fraction(x)


def arb_of_fraction(fr):
    v = arb(fmpq(fr.numerator, fr.denominator))
    return v


def dyadic_up(text, bits=60):
    """Least k / 2^bits >= the decimal or rational `text` (an exact arb) and the Fraction."""
    fr = Fraction(text)
    k = -((-fr.numerator * 2 ** bits) // fr.denominator)
    d = Fraction(k, 2 ** bits)
    v = arb_of_fraction(d)
    assert v.is_exact() and frac(v) == d >= fr
    return v, d


def colsum_max(absM):
    """Upper bound of max_j sum_i absM[i, j] (an arb_mat of nonnegative exact upper bounds): ||.||_{1->1}."""
    n = absM.nrows()
    ones = arb_mat(1, n, [arb(1)] * n)
    cs = ones * absM
    out = arb(0)
    for j in range(absM.ncols()):
        out = amax(out, up(cs[0, j]))
    return out


def abs_mat(M):
    return arb_mat([[v.abs_upper() for v in row] for row in M.tolist()])


def colsums_abs(M, weights, chunk=64):
    """Upper bounds of sum_i weights[i] |M[i, j]| for every column j (weights: nonnegative exact arbs), by row
    chunks (exact upper bounds |M_ij| from acb.abs_upper, summed by Arb matrix products)."""
    n, m = M.nrows(), M.ncols()
    acc = arb_mat(1, m)
    for i0 in range(0, n, chunk):
        i1 = min(n, i0 + chunk)
        blk = arb_mat([[M[i, j].abs_upper() for j in range(m)] for i in range(i0, i1)])
        acc = acc + arb_mat(1, i1 - i0, list(weights[i0:i1])) * blk
    return [up(acc[0, j]) for j in range(m)]


def sha256(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def maxrss_mb():
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0


# ------------------------------------------------------------------------------------------------ Stage E inputs
def stage_e_inputs(N, K=32, log=print):
    """Read the Stage E record and the centre; recompute [J_n], S_J and M_k exactly as existence.py does."""
    rpath = os.path.join(RESULTS, f"fourier-existence-N{N}.json")
    with open(rpath) as fh:
        rec = json.load(fh)
    if rec["N"] != N or rec["K"] != K:
        raise InputMismatch("Stage E record does not match N, K")
    cpath = os.path.join(ROOT, rec["centre_file"])
    if sha256(cpath) != rec["centre_sha256"]:
        raise InputMismatch("centre file SHA-256 differs from the Stage E record")
    Nf, Kf, om_bar, A, _ = ct.load(cpath)
    if (Nf, Kf) != (N, K) or ct.dyadic_to_text(om_bar) != rec["omega_bar"]:
        raise InputMismatch("centre does not match the record")
    st = dict(ex.DEFAULTS)
    st.update(rec["settings"])
    eta = st["eta"] or ["1"] * (DIM + 1)
    Kp, Mn, Pg, PJ = int(rec["Kprime"]), int(rec["M"]), int(st["prec_g"]), int(st["prec_J"])
    if Kp != 2 * K + int(st["L"]) or Mn != int(st["M"]):
        raise InputMismatch("K' or M inconsistent with the record settings")

    old = ctx.prec
    ctx.prec = Pg
    try:
        rho0 = ex._exact_dyadic_param(st["rho0"], "rho0")
        rho = ex._exact_dyadic_param(st["rho"], "rho")
        rho2 = ex._exact_dyadic_param(st["rho2"], "rho2")
        Rk = ex._exact_dyadic_param(st["R"], "R")
        ETA = [ex._exact_dyadic_param(e, "eta") for e in eta]
        om_lo = ct.text_to_dyadic(rec["omega"]["lower"]["hex"])
        om_hi = ct.text_to_dyadic(rec["omega"]["upper"]["hex"])
        r_ex = ct.text_to_dyadic(rec["r_existence"]["hex"])
    finally:
        ctx.prec = old
    if not (om_lo > 0 and om_lo <= om_bar and om_bar <= om_hi):
        raise InputMismatch("omega_bar is not inside [omega_lo, omega_hi]")

    # the same calls as existence.prove_centre (strip_J, strip_polydisc, dft_J)
    phi = fe.TrigPoly(A)
    prm53 = am.params(53)
    prmJ = am.params(PJ)
    f53 = lambda z: am.f(z, prm53, prec=53)  # noqa: E731
    J53 = lambda z: ex._flat(am.f_and_df(z, prm53, prec=53)[1])  # noqa: E731
    JJ = lambda z: ex._flat(am.f_and_df(z, prmJ, prec=PJ)[1])  # noqa: E731
    skw = dict(nx=int(st["strip_nx"]), rtol=float(st["strip_rtol"]), max_evals=int(st["strip_max_evals"]))
    t0 = time.time()
    strip_J = fe.strip_sup(J53, phi, rho, **dict(skw, rtol=max(skw["rtol"], 10.0), atol=1.0))
    with fe.precision(Pg):
        A_infl = [row[:] for row in A]
        for i in range(DIM):
            A_infl[i][K] = acb(A[i][K].real + Rk * arb(0, 1), Rk * arb(0, 1))
    phi_infl = fe.TrigPoly(A_infl)
    strip_P = fe.strip_sup(f53, phi_infl, rho2, **skw)
    for s in (strip_J, strip_P):
        if not s.full_strip:
            raise ProofFailure("a strip cover is not the full strip")
    enc_J = fe.fourier_coefficients(JJ, phi, rho, Mn, Kp, S=strip_J, prec=PJ)
    if enc_J.S_source != "strip":
        raise ProofFailure("J enclosure without a checked strip bound")
    # consistency with the record (the bounds are rigorous by themselves; this guards against a different input)
    for name, s in (("J", strip_J), ("polydisc", strip_P)):
        rs = rec["strips"][name]
        if float(s.S_max()) != rs["S_max"] or s.phi_digest != rs["phi_digest"]:
            raise InputMismatch(f"recomputed strip '{name}' differs from the Stage E record")
    log(f"  Stage E inputs recomputed ({time.time() - t0:.1f} s): max S_J = {float(strip_J.S_max()):.4e}, "
        f"max M_k = {float(strip_P.S_max()):.4e} (equal to the record)")
    J = {n: [[enc_J.c[DIM * r + c][n + Kp] for c in range(DIM)] for r in range(DIM)] for n in range(-Kp, Kp + 1)}
    SJ = [[enc_J.S[DIM * r + c] for c in range(DIM)] for r in range(DIM)]
    srcs = ["fourier/stability.py"] + ex.SOURCES
    cur = {p: sha256(os.path.join(ROOT, p)) for p in srcs}
    stage_e_match = {p: (cur[p] == rec["sources_sha256"].get(p)) for p in ex.SOURCES}
    return dict(rec=rec, rec_path=rpath, centre_path=cpath, om_bar=om_bar, A=A, K=K, Kp=Kp, M=Mn, settings=st,
                rho0=rho0, rho=rho, rho2=rho2, R=Rk, ETA=ETA, om_lo=om_lo, om_hi=om_hi, r=r_ex, J=J, SJ=SJ,
                Mk=list(strip_P.S), sources=cur, stage_e_sources_match=stage_e_match)


# ------------------------------------------------------------------------------------------------ floating-point choices
def _n1(M):
    return np.abs(M).sum(0).max()


def _kappa_cols(U, s):
    """min over column scalings D of ||S^{-1} U D||_1 ||D^{-1} U^{-1} S||_1 (closed form: D = 1 / column norms)."""
    Us = U / s[:, None]
    W = np.linalg.inv(U) * s[None, :]
    return (np.abs(W) * np.abs(Us).sum(0)[:, None]).sum(0).max()


def choose_U(X, tol):
    """Floating-point choice for route A: eigenvectors of X (S-coordinates), clusters of eigenvalues closer than tol
    replaced by an orthonormal basis of their span; columns scaled to unit 1-norm. Returns U, diag, ||F||, kappa."""
    lam, U = np.linalg.eig(X)
    n = len(lam)
    used = [False] * n
    groups = []
    for i in np.argsort(lam.real, kind="stable"):
        if used[i]:
            continue
        g = [i]
        used[i] = True
        changed = True
        while changed:
            changed = False
            for j in range(n):
                if not used[j] and min(abs(lam[j] - lam[k]) for k in g) < tol:
                    g.append(j)
                    used[j] = True
                    changed = True
        groups.append(g)
    Ub = np.zeros((n, n), complex)
    c = 0
    for g in groups:
        if len(g) == 1:
            Ub[:, c] = U[:, g[0]]
        else:
            Q, _ = np.linalg.qr(U[:, g])
            Ub[:, c:c + len(g)] = Q
        c += len(g)
    Ub = Ub / np.abs(Ub).sum(0)[None, :]
    Ui = np.linalg.inv(Ub)
    T = Ui @ X @ Ub
    d = np.diag(T).copy()
    return Ub, d, _n1(T - np.diag(d)), _n1(Ub) * _n1(Ui)


def _gamma_float(lam, g0, delta):
    return min(max(-delta - l.real, g0 - abs(l.imag)) for l in lam)


def best_U(X, g0, delta, tols):
    best = None
    for tol in tols:
        U, d, F, k = choose_U(X, tol)
        g = _gamma_float(d, g0, delta)
        rt = k / (g - F) if g > F else math.inf
        if best is None or rt < best[0]:
            best = (rt, tol, U, d)
    return best


def search_S(Jmid, Xs, g0, delta, tols, log=print, budget_s=600):
    """Floating-point search of e (S = diag 2^e, e_0 = 0) minimizing sigma_off(S) max_r rho_r(S) (route A).
    Continuous minimization of the S-weighted condition number of the eigenvectors of X_0 (row and column
    scalings), rounding, then an integer coordinate search. Untrusted: only its result is used, as exact data."""
    from scipy.optimize import minimize
    lam, U = np.linalg.eig(Xs[0])
    Ui = np.linalg.inv(U)
    g = lambda x: math.log(_n1(np.exp(x[:18])[:, None] * U * np.exp(x[18:])[None, :]) *  # noqa: E731
                           _n1(np.exp(-x[18:])[:, None] * Ui * np.exp(-x[:18])[None, :]))
    best = None
    for i in range(3):
        r = minimize(g, 0.1 * np.random.default_rng(i).normal(size=36), method="Powell", options={"maxiter": 40000})
        if best is None or r.fun < best.fun:
            best = r
    e = -best.x[:18] / math.log(2)
    e = np.round(e - e[0]).astype(int)

    def theta(e):
        s = 2.0 ** e
        so = sum(_n1(Jmid[n] * s[None, :] / s[:, None]) for n in Jmid if n != 0)
        w = 0.0
        for X in Xs:
            w = max(w, best_U(X * s[None, :] / s[:, None], g0, delta, tols)[0])
        return so * w

    cur = theta(e)
    t0 = time.time()
    improved = True
    while improved and time.time() - t0 < budget_s:
        improved = False
        for i in range(1, DIM):
            for stp in (1, -1, 2, -2):
                e2 = e.copy()
                e2[i] += stp
                v = theta(e2)
                if v < cur * 0.999:
                    e, cur = e2, v
                    improved = True
    log(f"  S search: floating-point theta_T estimate {cur:.4f}, e = {e.tolist()} ({time.time() - t0:.1f} s local)")
    return [int(v) for v in e]


# ------------------------------------------------------------------------------------------------ the certificate
def certify(N, inp=None, settings=None, controls=None, log=print, K=32):
    st = dict(DEFAULTS)
    st.update(settings or {})
    controls = dict(controls or {})
    T0 = time.time()
    marks = {}

    def mark(name, t=[T0]):
        now = time.time()
        marks[name] = round(now - t[0], 2)
        log(f"  [{name}: {now - t[0]:.1f} s, maxrss {maxrss_mb():.0f} MB]")
        t[0] = now

    if inp is None:
        inp = stage_e_inputs(N, K, log=log)
    mark("stage E inputs")
    prec = int(st["prec"])
    old = ctx.prec
    ctx.prec = prec
    try:
        out = _certify(N, inp, st, controls, log, mark, prec)
    finally:
        ctx.prec = old
    out["timings_s"] = marks
    out["wall_s"] = round(time.time() - T0, 2)
    out["maxrss_MB"] = round(maxrss_mb(), 1)
    return out


def _certify(N, inp, st, controls, log, mark, prec):
    Kp = inp["Kp"]
    nA = Kp
    hN = N // 2
    Ke = int(controls.get("Ke", hN + int(st["Ke_offset"])))
    n_c = int(st["n_c"])
    if not n_c >= 1:
        raise ValueError("n_c >= 1")
    nW = DIM * (2 * Ke + 1)
    nmax = 2 * Ke + n_c
    sgn = int(controls.get("damping_sign", 1))
    drop = set(int(v) for v in controls.get("drop", []))
    E = acb_mat(DIM, DIM)
    E[IV, IV] = acb(1)

    # ---- 1. constants
    c4 = up((4 * am.coupling(N=N)).real)                      # 4c (upper)
    dm = {m: am.damping(m, N=N, prec=prec) * sgn for m in range(-(Ke + n_c + 2), Ke + n_c + 3)}

    # ---- 2. coefficients
    rho, rho0, rho2, Rk = inp["rho"], inp["rho0"], inp["rho2"], inp["R"]
    rho_e = rho0 if rho0 < rho2 else rho2
    r_ex = inp["r"]
    t = [up(inp["ETA"][1 + j] * r_ex) for j in range(DIM)]
    for j in range(DIM):
        if not t[j] < Rk:
            raise ProofFailure(f"t_{j} = eta_j r_existence is not < R_{j} (Lemma 4.1 void)")
    P = arb(1)
    for j in range(DIM):
        P = P / (1 - t[j] / Rk)
    eps = [[up(inp["Mk"][k] / Rk * (P / (1 - t[l] / Rk) - 1)) for l in range(DIM)] for k in range(DIM)]

    om_lo = inp["om_lo"] if "omega_lo" not in controls else arb(controls["omega_lo"])
    om_hi = inp["om_hi"]
    if not (om_lo.is_exact() and om_lo > 0 and om_lo <= om_hi):
        raise ProofFailure("omega_lo must be exact, > 0 and <= omega_hi (C0)")
    om_ball = om_lo.union(om_hi)
    omf = float(inp["om_bar"])

    # floating-point data for the choices (midpoints; never used in a bound)
    Jmid = {n: np.array([[complex(float(inp["J"][n][r][c].real.mid()), float(inp["J"][n][r][c].imag.mid()))
                          for c in range(DIM)] for r in range(DIM)]) for n in range(-Kp, Kp + 1)}
    for n in (drop if not controls.get("drop_proof_only") else ()):
        Jmid[n] = np.zeros((DIM, DIM), complex)
        Jmid[-n] = np.zeros((DIM, DIM), complex)
    a0c_unscaled = [[inp["J"][0][r][c].real.mid() for c in range(DIM)] for r in range(DIM)]   # exact (A0c)
    dmf = lambda m: sgn * ct.damping_float(m, N)  # noqa: E731

    # ---- 4. geometry (needed by the S search)
    delta, delta_fr = dyadic_up(st["delta"])
    eta_t = ex._exact_dyadic_param(st["eta_tail"], "eta_tail")
    b = arb(omf * (N / 2 + 0.25))                             # an exact double near omega_bar (N/2 + 1/4)
    a = -b
    h = b
    g0 = om_lo * (Ke + 1) - h
    log(f"N = {N}: K_e = {Ke} (n_W = {nW}), n_c = {n_c}, delta = {float(delta):.6e} (dyadic >= {st['delta']}), "
        f"b = -a = {float(b):.6f}, prec = {prec}" + (f", CONTROLS {controls}" if controls else ""))

    # ---- choose S (floating point)
    delf = float(delta)
    g0f = float(g0.mid())
    Xs_f = [np.array([[float(a0c_unscaled[r][c]) for c in range(DIM)] for r in range(DIM)]) for _ in range(hN + 1)]
    for rr in range(hN + 1):
        Xs_f[rr][IV, IV] -= dmf(rr)
    if st["S_exps"] is None:
        e = search_S({n: Jmid[n] for n in range(-min(Kp, 60), min(Kp, 60) + 1)}, Xs_f, g0f, delf,
                     st["cluster_tols"], log=log)
    else:
        e = [int(v) for v in st["S_exps"]]
    if len(e) != DIM:
        raise ValueError("S needs 18 exponents")
    sf = 2.0 ** np.array(e, dtype=float)
    mark("choose S")

    def two(k):
        return arb(2) ** k if k >= 0 else arb(fmpq(1, 2 ** (-k)))
    scl = [[two(e[c] - e[r]) for c in range(DIM)] for r in range(DIM)]      # (S^{-1} M S)_{rc} = M_rc 2^{e_c - e_r}

    Q = acb(arb(0, 1), arb(0, 1))                                             # contains the closed unit disc
    erho, erhoe = (-rho).exp(), (-rho_e).exp()
    epsS = [[up(eps[r][c] * scl[r][c]) for c in range(DIM)] for r in range(DIM)]
    SJS = [[up(inp["SJ"][r][c] * scl[r][c]) for c in range(DIM)] for r in range(DIM)]
    s1 = colsum_max(arb_mat(SJS))
    s2 = colsum_max(arb_mat(epsS))
    q1, q2 = erho, erhoe

    def Gtail(k):
        return up(2 * (s1 * q1 ** k / (1 - q1) + s2 * q2 ** k / (1 - q2)))

    AS, absA, nrm = {}, {}, {}
    nlist = max(nmax, nA)
    for n in range(-nlist, nlist + 1):
        if abs(n) in drop:
            M = acb_mat(DIM, DIM)
        elif abs(n) <= nA:
            en = erhoe ** abs(n)
            M = acb_mat([[(inp["J"][n][r][c] + Q * up(eps[r][c] * en)) * scl[r][c] for c in range(DIM)]
                         for r in range(DIM)])
        else:
            e1, e2 = erho ** abs(n), erhoe ** abs(n)
            M = acb_mat([[Q * up((inp["SJ"][r][c] * e1 + eps[r][c] * e2) * scl[r][c]) for c in range(DIM)]
                         for r in range(DIM)])
        AS[n] = M
        absA[n] = abs_mat(M)
        nrm[n] = colsum_max(absA[n])
    A0c = arb_mat([[a0c_unscaled[r][c] * scl[r][c] for c in range(DIM)] for r in range(DIM)])   # exact
    for r in range(DIM):
        for c in range(DIM):
            assert A0c[r, c].is_exact()
    dA0 = colsum_max(arb_mat([[(AS[0][r, c] - A0c[r, c]).abs_upper() for c in range(DIM)] for r in range(DIM)]))
    sigma_off = arb(0)
    for n in range(-nA, nA + 1):
        if n != 0:
            sigma_off += nrm[n]
    sigma_off = up(sigma_off + Gtail(nA + 1))
    theta_c = up(sigma_off + dA0)
    mark("coefficients")

    # ---- 3. alpha and R_0 (C1)
    alpha = up(sigma_off + nrm[0] + c4)
    R0 = arb(1)
    while not R0 > alpha:
        R0 = R0 * 2
    # ---- 4. (C1)
    c1 = dict(delta_pos=bool(delta > 0), a_neg=bool(a < 0), b_pos=bool(b > 0),
              height=bool(b - a >= om_hi * N), b_below=bool(b < om_lo * N), a_above=bool(-a < om_lo * N),
              R0=bool(R0 > alpha))
    if not all(c1.values()):
        raise ProofFailure(f"(C1) geometry fails: {c1}")
    if not g0 > 0:
        raise ProofFailure("g_0 = omega_lo (K_e + 1) - h is not > 0 (window too small)")

    # ---- 5. tail, route A (C2)
    tail = []
    rho_T = arb(0)
    for rr in range(hN + 1):
        X = acb_mat([[acb(A0c[i, j]) - (dm[rr] if (i == IV and j == IV) else 0) for j in range(DIM)]
                     for i in range(DIM)])
        Xf = Xs_f[rr] * sf[None, :] / sf[:, None]
        rt_f, tol, Uf, df = best_U(Xf, float(g0.mid()) - float(eta_t), delf + float(eta_t), st["cluster_tols"])
        U = acb_mat([[acb(complex(v)) for v in row] for row in Uf])
        try:
            Ui = U.inv()
        except ZeroDivisionError:
            raise ProofFailure(f"U_{rr} not certainly invertible")
        Lr = [acb(complex(v)) for v in df]
        F = Ui * X * U
        for l in range(DIM):
            F[l, l] -= Lr[l]
        Fn = colsum_max(abs_mat(F))
        kap = up(colsum_max(abs_mat(U)) * colsum_max(abs_mat(Ui)))
        gam = None
        for l in range(DIM):
            x1 = lo(-delta - eta_t - Lr[l].real)
            x2 = lo(g0 - eta_t - abs(Lr[l].imag))
            v = x1 if x1 > x2 else x2
            gam = v if gam is None or v < gam else gam
        if not gam > Fn:
            raise ProofFailure(f"route A: gamma_{rr} = {float(gam):.4e} is not > ||F_{rr}|| = {float(Fn):.4e}")
        rho_r = up(kap / (gam - Fn))
        rho_T = amax(rho_T, rho_r)
        tail.append(dict(r=rr, cluster_tol=tol, kappa=float(kap), F_norm=float(Fn), gamma=float(gam),
                         rho=float(rho_r), d_r=float(dm[rr].real.mid())))
    theta_T = up(theta_c * rho_T)
    log(f"  tail (route A): rho_T = {float(rho_T):.4f}, sigma_off = {float(sigma_off):.4f}, "
        f"||A_0 - A0c|| = {float(dA0):.3e}, theta_T = {float(theta_T):.4f}, max kappa_r = "
        f"{max(x['kappa'] for x in tail):.2f}")
    if not theta_T < 1:
        raise ProofFailure(f"theta_T = theta_c rho_T = {float(theta_T):.4f} is not < 1 (tail)")
    mark("tail route A")

    # ---- 6. window: choices
    ms = list(range(-Ke, Ke + 1))
    Hf = np.zeros((nW, nW), complex)
    for i, m in enumerate(ms):
        for k, mp in enumerate(ms):
            if abs(m - mp) <= Kp:
                Hf[DIM * i:DIM * i + DIM, DIM * k:DIM * k + DIM] = Jmid[m - mp]
        Hf[DIM * i:DIM * i + DIM, DIM * i:DIM * i + DIM] += -1j * omf * m * np.eye(DIM)
        Hf[DIM * i + IV, DIM * i + IV] -= dmf(m)
    lam, Vf = np.linalg.eig(Hf)
    del Hf
    Ss = np.tile(sf, len(ms))
    Vf = Vf / Ss[:, None]
    Vf = Vf / np.abs(Vf).sum(0)[None, :]
    Vif = np.linalg.inv(Vf)
    mark("window eig (LAPACK)")

    # ---- 7. distances and count (C3), (C5); decided before the Arb window products (they do not depend on them)
    dF, R0F, aF, bF = delta_fr, frac(R0), frac(a), frac(b)
    dist, inside = [], []
    for z in lam:
        x, y = Fraction(float(z.real)), Fraction(float(z.imag))
        ins = (-dF < x < R0F) and (aF < y < bF)
        inside.append(ins)
        if ins:
            d = min(x + dF, R0F - x, y - aF, bF - y)
            dist.append(lo(arb_of_fraction(d)))
        else:
            dx = max(-dF - x, Fraction(0), x - R0F)
            dy = max(aF - y, Fraction(0), y - bF)
            d2 = dx * dx + dy * dy
            dist.append(lo(arb_of_fraction(d2).sqrt()) if d2 > 0 else arb(0))
    count = sum(inside)
    nonpos = [j for j in range(nW) if not dist[j] > 0]
    if nonpos:
        raise ProofFailure(f"(C3) dist_j = 0 for {len(nonpos)} window eigenvalues (on Gamma)")
    in_list = [complex(lam[j]) for j in range(nW) if inside[j]]
    if count != 1:
        raise ProofFailure(f"(C5) count of window eigenvalues in Omega is {count}, not 1: {in_list[:6]}")
    mark("distances, count")

    zeta = np.ones(nW)
    if st["zeta"] != "ones":
        raise ValueError("only zeta = 'ones' is implemented")
    zT = arb(1)

    # ---- 6. window: Arb
    AS_l = {n: AS[n].tolist() for n in range(-2 * Ke, 2 * Ke + 1)}
    Hb_rows = []
    for i, m in enumerate(ms):
        diag = AS[0] + acb_mat([[(acb(0, -m) * om_ball if r == c else acb(0)) - (dm[m] if r == c == IV else 0)
                                 for c in range(DIM)] for r in range(DIM)])
        dl = diag.tolist()
        blocks = [(dl if k == i else AS_l[m - mp]) for k, mp in enumerate(ms)]
        for r in range(DIM):
            row = []
            for bl in blocks:
                row.extend(bl[r])
            Hb_rows.append(row)
    Hb = acb_mat(Hb_rows)
    del Hb_rows, AS_l
    Vb = acb_mat([[acb(complex(v)) for v in row] for row in Vf])
    mark("build [H_WW]")

    # sanity (not part of the certificate): trivial eigenvector
    Pst = acb_mat(nW, 1)
    for i, m in enumerate(ms):
        if abs(m) <= inp["K"]:
            for r in range(DIM):
                Pst[DIM * i + r, 0] = acb(0, m) * inp["A"][r][m + inp["K"]] * two(-e[r])
    res = Hb * Pst
    nres = sum((res[j, 0].abs_upper() for j in range(nW)), arb(0))
    nP = sum((Pst[j, 0].abs_lower() for j in range(nW)), arb(0))
    sanity = float(nres / nP)
    log(f"  sanity: ||[H_WW] P*||_1 / ||P*||_1 = {sanity:.3e} (P* = window part of phibar'; tolerance "
        f"{st['sanity_tol']})")
    if not controls.get("skip_sanity") and not sanity < float(st["sanity_tol"]):
        raise InputMismatch(f"trivial-eigenvector residual {sanity:.3e} too large: the coefficients are not those "
                            "of the linearization at the centre")

    HV = Hb * Vb
    del Hb
    mark("[H_WW] V")
    Vib = acb_mat([[acb(complex(v)) for v in row] for row in Vif])
    Wm = Vib * HV                       # Vi [H_WW] V; Y = Vi ([H_WW] V - V Lambda) = Wm - Lambda + C Lambda
    del HV
    lamb = [acb(complex(v)) for v in lam]
    for j in range(nW):
        Wm[j, j] -= lamb[j]
    mark("Vi [H_WW] V - Lambda")
    Cm = Vib * Vb
    for i in range(nW):
        Cm[i, i] -= 1                   # Cm = Vi V - I = -C (same absolute values)
    ones = [arb(1)] * nW                # zeta = ones
    csC = colsums_abs(Cm, ones)
    del Cm
    qC = arb(0)
    for j in range(nW):
        qC = amax(qC, csC[j])
    if not qC < 1:
        raise ProofFailure(f"||I - Vi V|| = {float(qC):.3e} is not < 1 (V not certified invertible)")
    mark("C = I - Vi V")
    csW = colsums_abs(Wm, ones)
    del Wm
    inv1q = 1 / (1 - qC)
    # ||Y e_j|| <= ||(Wm - Lambda) e_j|| + |lambda_j| ||C e_j||  (Y = Vi Rres, Rres = [H_WW] V - V Lambda)
    fm = [up((csW[j] + lamb[j].abs_upper() * csC[j]) * inv1q) for j in range(nW)]
    csVi = colsums_abs(Vib, ones)
    del Vib
    beta = [up(csVi[c] * inv1q) for c in range(nW)]
    beta_max = arb(0)
    for v in beta:
        beta_max = amax(beta_max, v)
    mark("fm, beta")

    # ---- 8. couplings
    tw = []
    G_nA = Gtail(nA + 1)
    for w in ms:
        s_ = arb(0)
        for n in range(-nA, nA + 1):
            if abs(w + n) > Ke:
                s_ += nrm[n]
        tw.append(up(s_ + G_nA))
    rv = colsums_abs(Vb, [tw[i] for i in range(len(ms)) for _ in range(DIM)])
    del Vb
    r_j = [up(zT * rv[j]) for j in range(nW)]
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
    far = up(beta_max / zT * Gtail(n_c + 1) / 2)
    bhat = far
    for v in bms.values():
        bhat = amax(bhat, v)
    mark("couplings")

    # ---- 9. (SC) and (SG)
    fac = up(bhat * rho_T / (1 - theta_T))
    ratio = []
    sc_ok = True
    sg_win = True
    for j in range(nW):
        lhs = fm[j] + fac * r_j[j] / arb(float(zeta[j]))
        if not lhs < dist[j]:
            sc_ok = False
        if not fm[j] + r_j[j] < dist[j]:
            sg_win = False
        ratio.append(float(up(lhs / dist[j])))
    sg_tail_val = up((bhat + theta_c) * rho_T)
    sg_ok = bool(sg_win and sg_tail_val < 1)
    worst = int(np.argmax(ratio))
    near = [j for j in range(nW) if lam[j].real > -1e-3 and abs(lam[j].imag) <= float(b) + 2 * omf]
    near.sort(key=lambda j: -lam[j].real)
    log(f"  window: q_C = {float(qC):.3e}, max fm_j = {max(float(v) for v in fm):.3e}, bhat = {float(bhat):.4e} "
        f"(far bound {float(far):.2e}), max r_j = {max(float(v) for v in r_j):.3e}")
    log(f"  (SC): worst ratio {ratio[worst]:.4e} at lambda = {complex(lam[worst]):.6g}; near-axis worst "
        f"{max(ratio[j] for j in near):.4e}; (SG) {'holds' if sg_ok else 'does not hold'} "
        f"(tail value {float(sg_tail_val):.3f})")
    if not sc_ok:
        bad = [j for j in range(nW) if ratio[j] >= 1]
        raise ProofFailure(f"(SC) fails for {len(bad)} window columns, e.g. lambda = {complex(lam[bad[0]])}")
    mark("small gain")

    # ---- 10. conclusions
    Tlo = lo(2 * arb.pi() / om_hi)
    mult_T = up((-delta * Tlo).exp())
    mult_tau = up((-delta * Tlo / N).exp())
    trivial = in_list[0]
    nontriv = [j for j in range(nW) if not inside[j] and lam[j].imag >= float(a) and lam[j].imag < float(a) +
               omf * N and abs(lam[j].imag) < (Ke - 4) * omf]
    lead = max(nontriv, key=lambda j: lam[j].real) if nontriv else None
    near_tab = [dict(lam_re=float(lam[j].real), lam_im=float(lam[j].imag), dist=float(dist[j]),
                     fm=float(fm[j]), r=float(r_j[j]), ratio=ratio[j]) for j in near[:12]]
    out = dict(
        N=N, K_centre=inp["K"], Kprime=Kp, K_e=Ke, n_W=nW, n_c=n_c, n_A=nA, prec=prec,
        delta_requested=st["delta"], delta=bound_rec(delta), delta_exact=f"{delta_fr.numerator}/{delta_fr.denominator}",
        route_tail="A (weighted power-of-two cell coordinates S, Lemma 3.4(b))", small_gain="SC (Lemma 3.5)",
        SG_also_holds=sg_ok, S_exponents=e, zeta="all 1, zeta_T = 1", eta_tail=st["eta_tail"],
        geometry=dict(a=bound_rec(a, "down"), b=bound_rec(b), R0=bound_rec(R0), h=bound_rec(h),
                      g0=bound_rec(g0, "down"), C1=c1),
        omega_lo=bound_rec(om_lo, "down"), omega_hi=bound_rec(om_hi),
        r_existence=inp["rec"]["r_existence"], t_lt_R=True, rho_e=str(rho_e.mid()),
        eps_max=float(max(max(row) for row in eps)), eps_1norm_S=bound_rec(s2), SJ_1norm_S=bound_rec(s1),
        alpha_up=bound_rec(alpha), sigma_off=bound_rec(sigma_off), A0_minus_A0c=bound_rec(dA0),
        theta_c=bound_rec(theta_c), rho_T=bound_rec(rho_T), theta_T=bound_rec(theta_T), tail_by_residue=tail,
        q_C=bound_rec(qC), fm_max=max(float(v) for v in fm), beta_max=bound_rec(beta_max), bhat=bound_rec(bhat),
        b_m_far_bound=bound_rec(far), b_m_max_listed=max(float(v) for v in bms.values()),
        r_max=max(float(v) for v in r_j), dist_min=min(float(v) for v in dist),
        count_in_Omega=count, eigenvalue_in_Omega=[trivial.real, trivial.imag],
        SC_worst_ratio=ratio[worst], SC_worst_lambda=[float(lam[worst].real), float(lam[worst].imag)],
        SC_worst_ratio_near_axis=max(ratio[j] for j in near) if near else None,
        SG_tail_value=float(sg_tail_val), near_axis_columns=near_tab,
        sanity_trivial_eigenvector_residual=sanity,
        float_leading_nontrivial_window_eigenvalue=([float(lam[lead].real), float(lam[lead].imag)]
                                                    if lead is not None else None),
        T_lo=bound_rec(arb(Tlo), "down"),
        multiplier_bound_full_period=bound_rec(mult_T), multiplier_bound_reduced_map=bound_rec(mult_tau),
        controls=controls or None,
    )
    log(f"  CERTIFIED (pending review): nontrivial multipliers |rho| < e^(-delta T) <= {float(mult_T):.9f}; "
        f"reduced map spectral radius < {float(mult_tau):.9f}")
    return out


# ------------------------------------------------------------------------------------------------ driver
def theorem_text(N, res):
    mt = res["multiplier_bound_full_period"]["dec"]
    mtau = res["multiplier_bound_reduced_map"]["dec"]
    d = res["delta"]["dec"]
    ring = "the single cell (N = 1)" if N == 1 else f"the ring of N = {N} cells (c = N^2 / 64000 per ms)"
    return (f"Conditional on the Stage E theorem of results/fourier-existence-N{N}.json (a real rotating wave "
            f"x_j(t) = phi(omega t + 2 pi j / N) of {ring}, period T = 2 pi / omega; status: awaiting adversarial "
            f"review) and on the lemmas of fourier/LEMMAS-stability.md: with delta = {d} per ms (exact dyadic, "
            f"recorded), every eigenvalue mu of the Hill operator H_0 with Re mu >= -delta lies in i omega N Z and is "
            f"algebraically simple (Theorem 3). Hence (Theorem 4): the monodromy Y(T) has the Floquet multiplier 1 "
            f"algebraically simple, and all other {18 * N - 1} Floquet multipliers have modulus < e^(-delta T) <= "
            f"{mt}; the shift-reduced map M_tau = Q^(-1) Y(tau), tau = T / N, has the eigenvalue 1 algebraically "
            f"simple and all other eigenvalues of modulus < e^(-delta tau) <= {mtau} (so does the derivative of every "
            f"section map of Corollary 1.3, without the eigenvalue 1: spectral radius < {mtau}); the orbit is "
            f"locally exponentially orbitally stable with asymptotic phase.")


def run(N, delta=None, settings=None, write=True, log=print):
    st = dict(settings or {})
    if delta is not None:
        st["delta"] = delta
    res = certify(N, settings=st, log=log)
    inp_rec = os.path.join(RESULTS, f"fourier-existence-N{N}.json")
    with open(inp_rec) as fh:
        rec = json.load(fh)
    srcs = ["fourier/stability.py"] + ex.SOURCES
    cur = {p: sha256(os.path.join(ROOT, p)) for p in srcs}
    res.update(
        status="computed; awaiting adversarial review",
        stage_e_status=rec.get("status"),
        theorem=theorem_text(N, res),
        stage_e_record=os.path.relpath(inp_rec, ROOT), stage_e_record_sha256=sha256(inp_rec),
        centre_file=rec["centre_file"], centre_sha256=sha256(os.path.join(ROOT, rec["centre_file"])),
        sources_sha256=cur,
        stage_e_sources_match={p: cur[p] == rec["sources_sha256"].get(p) for p in ex.SOURCES},
        python_flint=flint.__version__, FLINT=flint.__FLINT_VERSION__, numpy=np.__version__,
        python=platform.python_version(), machine=platform.machine(), date=time.strftime("%Y-%m-%d"),
        settings={k: v for k, v in dict(DEFAULTS, **st).items()},
    )
    if write:
        os.makedirs(RESULTS, exist_ok=True)
        out = os.path.join(RESULTS, f"fourier-stability-N{N}.json")
        with open(out, "w") as fh:
            json.dump(res, fh, indent=1)
            fh.write("\n")
        log(f"  wrote {out}")
    return res


DELTA_DEFAULT = {1: "4e-5", 8: "5e-6", 16: "5e-6", 32: "5e-6", 64: "5e-6"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--N", default="1,8,16,32,64")
    ap.add_argument("--delta", default=None, help="decimal per ms (default: 4e-5 for N = 1, else 5e-6)")
    ap.add_argument("--Ke-offset", type=int, default=None)
    ap.add_argument("--no-write", action="store_true")
    a = ap.parse_args()
    for N in [int(v) for v in a.N.split(",")]:
        st = {}
        if a.Ke_offset is not None:
            st["Ke_offset"] = a.Ke_offset
        d = a.delta or DELTA_DEFAULT.get(N, "5e-6")
        try:
            res = run(N, d, st, write=not a.no_write)
            print(f"N = {N}: CERTIFIED (pending review), delta = {res['delta']['dec']}, wall {res['wall_s']} s, "
                  f"maxrss {res['maxrss_MB']} MB")
        except (ProofFailure, InputMismatch) as e:
            print(f"N = {N}: FAILED: {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
