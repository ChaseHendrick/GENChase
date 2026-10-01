"""Acceptance tests and negative controls for existence.py (Stage E). Each test can fail.

Run (machine shared; about 15 minutes):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 3000 python3 test_existence.py      (or pytest)

Acceptance
  * N = 1: the T enclosure lies inside the other pipeline's [53.58551856, 53.58552012] and inside the CAPD record
    results/cell-gks0.0275.json (period_exact); the proof also checks |a_{1,V}| > r.
  * N = 8, 16: the T enclosure overlaps [53.58795907, 53.58798288] and [53.58805554, 53.58808267].
Residual-detection controls (labelled honestly: they show that Y0 sees a residual of size 1e-8 or more, and they
would fail for ANY correct proof, since the needed radius exceeds r_* = 1e-12; they say nothing about soundness):
  * omega of the N = 64 centre perturbed by 1e-8 (the double nearest);
  * the N = 63 damping symbol used with the N = 64 centre;
  * mode m = +-3 of V dropped from the N = 64 centre.
Within-uniqueness consistency controls (the referee's, at the scale of the claim; N = 1): perturb the centre by an exact
delta with r_existence << D = ||delta|| << r_uniqueness (omega + 2^-85; a_{+-32,5} + 2^-85, D = 2 nu^32 2^-85). Both
centres lie in each other's uniqueness ball, so they share the zero x*: the proof must fail or report
r' >= D - r_existence. Moreover Y0' >= (1 - Z1) D up to second order (A DF(xbar) = I - B, ||B|| <= Z1), so a Y0'
below that means a residual is missed.
Independent float estimate of ||I - A DF(xbar)|| (N = 1; the referee's z1float.py, re-implemented): J_n and g_m are
midpoints of separate Arb DFTs (512 nodes, |n| <= 241), A_fin = double inverse, A_m = double inverses; columns
|m'| <= 60, rows |m| <= 180. It is a truncation, hence (up to rounding) a LOWER estimate of each block, and it must
not exceed the certified block: per output component of Z1, the finite-rows x tail-columns block, the tail-row block
T, and Y0 per component.
Mutation tests (each deletes one contribution in existence.py through the test-only "_mutate" hook, which prove()
refuses): T (tail rows) and ft (finite rows x tail columns) are detected because the float estimate of that block
then exceeds the certified (deleted) block; Y0_tail is detected because the mutated Y0 falls below the float residual
estimate. SJ_tail (the Cauchy bounds S_J e^{-rho|n|} beyond K' and the majorant columns at |m'| = K+L+1) CANNOT be
detected this way: those terms are about 1e-11 or smaller (e^{-rho (L+1)} S_J for the columns, q^{K'+1} for the tail)
against Z1 = 0.2, below the resolution of any estimate here; the test only records how small the change is, and
their correctness rests on the written argument (docstring sections 5) and review.
Strip bounds are recomputed, never accepted: prove_centre has no parameter that could carry a strip bound, every
proof calls fourier_eval.strip_sup exactly three times (f o phibar, Df o phibar, f on the polydisc family) on the
centre's own trigonometric polynomial (checked by TrigPoly.digest), and the Fourier enclosures record S_source
"strip" (a checked StripSup), never "raw".
"""
import inspect
import os
import sys
import time
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from flint import acb, arb, ctx, fmpq  # noqa: E402

import centre as ct  # noqa: E402
import existence as ex  # noqa: E402
import fourier_eval as fe  # noqa: E402

QUIET = lambda *a, **k: None  # noqa: E731


def _T(res):
    return Fraction(res["T_ms"]["lower"]["dec"]), Fraction(res["T_ms"]["upper"]["dec"])


def _exact_T(res):
    """The exact hex bounds as Fractions (the decimal strings are outward roundings of these)."""
    lo = ex.to_fraction(ct.text_to_dyadic(res["T_ms"]["lower"]["hex"]))
    hi = ex.to_fraction(ct.text_to_dyadic(res["T_ms"]["upper"]["hex"]))
    return lo, hi


def _expect_failure(N, K, om, A, what, **kw):
    t0 = time.time()
    try:
        res = ex.prove_centre(N, K, om, A, log=QUIET, **kw)
    except ex.ProofFailure as e:
        msg = str(e)
        assert "radii polynomial" in msg, f"{what}: failed, but not at the radii polynomial: {msg}"
        print(f"  negative control '{what}' failed as required ({time.time() - t0:.0f} s): {msg}")
        return msg
    raise AssertionError(f"negative control '{what}' was PROVED (r = {res['r_existence']['approx']:.3e}); "
                         "the proof cannot see this perturbation")


# --------------------------------------------------------------------------------------------- cheap unit tests
def test_dyadic_text_roundtrip():
    old = ctx.prec
    ctx.prec = 300
    try:
        for v in (arb(0), arb(1), arb(-3) / 1024, arb("0.1").mid(), (arb(2).sqrt() * 1000).mid()):
            t = ct.dyadic_to_text(v)
            w = ct.text_to_dyadic(t)
            assert (w - v).is_zero(), (t, v, w)
    finally:
        ctx.prec = old


def test_outward_decimal():
    old = ctx.prec
    ctx.prec = 200
    try:
        for x in ((arb(1) / 3).mid(), -(arb(1) / 3).mid(), (arb(10) ** 30 / 7).mid(), arb(5) / 4):
            fx = ex.to_fraction(x)
            u, d = Fraction(ex.dec(x, "up", 10)), Fraction(ex.dec(x, "down", 10))
            assert d <= fx <= u and u - d <= abs(fx) * Fraction(1, 10 ** 8), (x, u, d)
    finally:
        ctx.prec = old


def test_radii_logic():
    ctx.prec = 128
    assert ex._radii(arb("1e-20"), arb("0.5"), arb("1e6"), arb("1e-10").upper()) is not None
    assert ex._radii(arb("1e-3"), arb("0.5"), arb("1e6"), arb("1e-10").upper()) is None      # discriminant < 0
    assert ex._radii(arb("1e-20"), arb("1.01"), arb("1"), arb("1e-10").upper()) is None      # Z1 >= 1


def test_level_is_verify_cpp_level():
    # proofs/verify.cpp: level = 0.2 / tp06::scaleOf(0), the double 0.2 times 2^2 (scale exponent -2), exact
    v = ct.level_exact()
    assert v.is_exact() and v == arb(0.2) * 4 and am_scale_V() == -2


def am_scale_V():
    import arbmodel as am
    return am.SCALE_EXP[0]


# --------------------------------------------------------------------------------------------- acceptance
def test_acceptance_N1_and_strip_bounds_recomputed():
    sig = inspect.signature(ex.prove_centre)
    for name in sig.parameters:
        assert not name.lower().startswith("s") or name == "settings", f"unexpected parameter {name}"
        assert "strip" not in name.lower() and name not in ("S", "S_g", "S_J", "M_k")
    for key in ex.DEFAULTS:
        assert key not in ("S", "S_g", "S_J", "M_k", "strip"), key

    calls = []
    orig = fe.strip_sup

    def spy(f, phi, rho, **kw):
        out = orig(f, phi, rho, **kw)
        calls.append((phi.digest(), str(rho), out))
        return out

    fe.strip_sup = spy
    try:
        res = ex.prove(1, write=False, log=QUIET)
    finally:
        fe.strip_sup = orig
    N, K, om, A, _ = ct.load(ct.centre_path(1, 32))
    phibar = fe.TrigPoly(A)
    assert len(calls) == 3, f"strip_sup called {len(calls)} times, expected 3"
    assert calls[0][0] == phibar.digest() and calls[1][0] == phibar.digest(), "strip bound for a different phi"
    assert calls[2][0] != phibar.digest(), "polydisc cover must use the inflated family"
    assert res["strips"]["S_source_g"] == "strip" and res["strips"]["S_source_J"] == "strip"
    for c in calls:
        s = c[2]
        assert s.full_strip and all(si >= li for si, li in zip(s.S, s.L) if li.is_finite())

    lo, hi = _exact_T(res)
    assert Fraction("53.58551856") <= lo and hi <= Fraction("53.58552012"), (float(lo), float(hi))
    import json
    with open(os.path.join(ex.RESULTS, "cell-gks0.0275.json")) as fh:
        pe = json.load(fh)["verifier"]["period_exact"]
    a, b = Fraction(float.fromhex(pe[0])), Fraction(float.fromhex(pe[1]))
    assert lo <= b and a <= hi, "N = 1 period does not overlap the CAPD record"
    assert a <= lo and hi <= b, "N = 1 period not inside the CAPD record"
    assert float(res["Z1"]["approx"]) < 1 and res["a1V_margin"]["approx"] > 0
    dl, dh = _T(res)
    assert dl <= lo and hi <= dh, "decimal bounds are not outward roundings of the exact bounds"
    print(f"  N = 1: T in [{res['T_ms']['lower']['dec']}, {res['T_ms']['upper']['dec']}], "
          f"r = {res['r_existence']['approx']:.3e}, Z1 = {res['Z1']['approx']:.4f}")


def _overlap(N, a, b):
    res = ex.prove(N, write=False, log=QUIET)
    lo, hi = _exact_T(res)
    assert lo <= Fraction(b) and Fraction(a) <= hi, f"N = {N}: T [{float(lo)}, {float(hi)}] misses [{a}, {b}]"
    print(f"  N = {N}: T in [{res['T_ms']['lower']['dec']}, {res['T_ms']['upper']['dec']}] overlaps [{a}, {b}]")


def test_acceptance_N8():
    _overlap(8, "53.58795907", "53.58798288")


def test_acceptance_N16():
    _overlap(16, "53.58805554", "53.58808267")


# --------------------------------------------------------------------------------------------- negative controls
def _centre64():
    return ct.load(ct.centre_path(64, 32))


def test_negative_omega_perturbed():
    N, K, om, A, _ = _centre64()
    ctx.prec = 512
    om2 = om + arb(1e-8)
    assert om2.is_exact()
    _expect_failure(N, K, om2, A, "omega + 1e-8")


def test_negative_damping_N63_with_N64_centre():
    N, K, om, A, _ = _centre64()
    _expect_failure(N, K, om, A, "N = 63 damping, N = 64 centre", N_damping=63)


def test_negative_mode_dropped():
    N, K, om, A, _ = _centre64()
    A2 = [row[:] for row in A]
    A2[0][K + 3] = acb(0)
    A2[0][K - 3] = acb(0)
    _expect_failure(N, K, om, A2, "V mode m = +-3 dropped")


# --------------------------------------------------------------------------------------------- float estimate
_CACHE = {}


def _float_blocks(N=1, Kc=60, Kr=180, M=512):
    """Untrusted double-precision estimate (see module docstring) of the Z1 blocks and of Y0 per component."""
    if ("blocks", N) in _CACHE:
        return _CACHE[("blocks", N)]
    import math
    import numpy as np
    import arbmodel as am
    DIM, IV = 18, 0
    _, K, om, A, _ = ct.load(ct.centre_path(N, 32))
    phi = fe.TrigPoly(A)
    prmJ, prmG = am.params(128), am.params(256)
    Kp = Kr + Kc + 1
    JJ = lambda z: am.f_and_df(z, prmJ, prec=128)[1].entries()  # noqa: E731
    encJ = fe.fourier_coefficients(JJ, phi, arb(1), M, Kp, S=[arb(0)] * 324, prec=128)   # midpoints only
    encg = fe.fourier_coefficients(lambda z: am.f(z, prmG, prec=256), phi, arb(1), M, Kr, S=[arb(0)] * 18, prec=256)
    cf_ = lambda b: complex(float(b.real.mid()), float(b.imag.mid()))  # noqa: E731
    Jn = np.array([[[cf_(encJ.c[DIM * r + c][n + Kp]) for c in range(DIM)] for r in range(DIM)]
                   for n in range(-Kp, Kp + 1)])                         # index n + Kp
    g = np.array([[cf_(encg.c[i][m + Kr]) for m in range(-Kr, Kr + 1)] for i in range(DIM)])
    omf = float(om)
    a = np.array([[cf_(c) for c in row] for row in A])
    lay = ct.Layout(K)
    Jd = {n: Jn[n + Kp] for n in range(-Kp, Kp + 1)}
    G = ct.galerkin_matrix(omf, a, Jd, N)
    Af = np.linalg.inv(G)
    nu = math.exp(0.25)
    J0 = np.real(Jd[0])
    tm = [m for m in range(-Kr, Kr + 1) if abs(m) > K]
    At = np.empty((len(tm), DIM, DIM), complex)
    for t, m in enumerate(tm):
        Mm = 1j * omf * m * np.eye(DIM) - J0
        Mm[IV, IV] += ct.damping_float(m, N)
        At[t] = np.linalg.inv(Mm)
    wt = np.array([nu ** abs(m) for m in tm])
    fin_w = np.array([1.0] + [nu ** abs(m) for _ in range(DIM) for m in range(-K, K + 1)])
    comp = np.array([0] + [1 + i for i in range(DIM) for _ in range(2 * K + 1)])

    def fin_norms(v):
        return np.bincount(comp, weights=np.abs(v) * fin_w, minlength=DIM + 1)

    rows = np.zeros((DIM + 1, DIM + 1))      # column sup of (finite + tail rows), per (c, c')
    ft = np.zeros((DIM + 1, DIM + 1))        # finite rows, tail columns
    T = np.zeros((DIM, DIM))                 # tail rows, all columns
    tm_arr = np.array(tm)
    for k in range(DIM):
        for mp in range(-Kc, Kc + 1):
            cfv = np.zeros(lay.n, complex)
            if k == IV:
                cfv[0] = 1
            for m in range(-K, K + 1):
                cfv[1 + np.arange(DIM) * lay.L + m + K] -= Jd[m - mp][:, k]
                if m == mp:
                    cfv[lay.idx(k, m)] += 1j * omf * m + (ct.damping_float(m, N) if k == IV else 0)
            v = Af @ cfv
            if abs(mp) <= K:
                v[lay.idx(k, mp)] -= 1
            fn = fin_norms(v) / nu ** abs(mp)
            W = -Jn[tm_arr - mp + Kp][:, :, k]                           # (len(tm), 18)
            if abs(mp) > K:
                t = tm.index(mp)
                W[t, k] += 1j * omf * mp + (ct.damping_float(mp, N) if k == IV else 0)
            U = np.einsum("tij,tj->ti", At, W)
            if abs(mp) > K:
                U[tm.index(mp), k] -= 1
            tn = (np.abs(U) * wt[:, None]).sum(axis=0) / nu ** abs(mp)   # per output component
            rows[:, 1 + k] = np.maximum(rows[:, 1 + k], fn + np.concatenate([[0.0], tn]))
            T[:, k] = np.maximum(T[:, k], tn)
            if abs(mp) > K:
                ft[:, 1 + k] = np.maximum(ft[:, 1 + k], fn)
    cfv = np.zeros(lay.n, complex)                                       # omega column
    for m in range(-K, K + 1):
        cfv[1 + np.arange(DIM) * lay.L + m + K] = 1j * m * a[:, m + K]
    v = Af @ cfv
    v[0] -= 1
    rows[:, 0] = fin_norms(v)
    # Y0 estimate, tail rows only: (A F)_m = -A_m g_m for |m| > K (abar_m = 0 there; no cancellation). The finite
    # part (about 1e-40) cannot be estimated in double: F_fin cancels to 1e-43 from terms of size 0.1.
    y0_tail = np.zeros(DIM + 1)
    for t, m in enumerate(tm):
        y0_tail[1:] += np.abs(At[t] @ g[:, m + Kr]) * wt[t]
    out = dict(rows=rows.sum(axis=1), ft=ft, T=T, y0=y0_tail, y0_tail=y0_tail)
    _CACHE[("blocks", N)] = out
    return out


def _certified_diag(N=1, mutate=()):
    key = ("diag", N, tuple(sorted(mutate)))
    if key not in _CACHE:
        _, K, om, A, _ = ct.load(ct.centre_path(N, 32))
        st = {"_diagnostics": True}
        if mutate:
            st["_mutate"] = tuple(mutate)
        _CACHE[key] = ex.prove_centre(N, K, om, A, settings=st, log=QUIET)
    return _CACHE[key]


def _le(est, cert, rel=1e-9, ab=1e-12):
    return est <= cert * (1 + rel) + ab


def test_float_estimate_below_certified():
    est = _float_blocks(1)
    res = _certified_diag(1)
    d = res["_diag"]
    z1c = res["Z1_by_output_component"]
    for c in range(19):
        assert _le(est["rows"][c], z1c[c]), f"Z1 component {c}: float estimate {est['rows'][c]} > certified {z1c[c]}"
        assert _le(est["y0"][c], d["Y0_total"][c], rel=1e-6, ab=1e-45), f"Y0 component {c}"
        for cp in range(19):
            assert _le(est["ft"][c][cp], d["Z1_ft"][c][cp]), f"ft block ({c}, {cp})"
    for c in range(18):
        for k in range(18):
            assert _le(est["T"][c][k], d["T"][c][k]), f"T block ({c}, {k}): {est['T'][c][k]} > {d['T'][c][k]}"
    print("  float estimate per Z1 component:", [round(float(x), 4) for x in est["rows"]])
    print("  certified Z1 per component:      ", [round(float(x), 4) for x in z1c])
    print(f"  max T block est {est['T'].max():.4f} / cert {max(max(r) for r in d['T']):.4f}; "
          f"max ft est {est['ft'].max():.4f} / cert {max(max(r) for r in d['Z1_ft']):.4f}; "
          f"Y0 est {est['y0'].max():.3e} / cert {res['Y0']['approx']:.3e}")


def test_mutation_T_detected():
    est = _float_blocks(1)
    d = _certified_diag(1, ("T",))
    assert max(max(r) for r in d["_diag"]["T"]) == 0
    worst = est["T"].max()
    assert worst > 1e-3, "float estimate of the tail-row block too small to detect its deletion"
    agg = [c for c in range(19) if est["rows"][c] > d["Z1_by_output_component"][c] * (1 + 1e-9)]
    print(f"  T deleted: float T block {worst:.4f} > certified 0 (detected); aggregate Z1 components exceeded: {agg}")


def test_mutation_ft_detected():
    est = _float_blocks(1)
    d = _certified_diag(1, ("ft",))
    cert = d["_diag"]["Z1_ft"]
    viol = [(c, cp) for c in range(19) for cp in range(19) if not _le(est["ft"][c][cp], cert[c][cp])]
    assert viol, "deleting the finite-rows x tail-columns block went undetected"
    agg = [c for c in range(19) if est["rows"][c] > d["Z1_by_output_component"][c] * (1 + 1e-9)]
    print(f"  ft deleted: {len(viol)} blocks exceed the certified (deleted) value, max est {est['ft'].max():.4f}; "
          f"aggregate Z1 components exceeded: {agg}")


def test_mutation_Y0_tail_detected():
    est = _float_blocks(1)
    d = _certified_diag(1, ("Y0_tail",))
    assert d["Y0"]["approx"] < est["y0"].max() / 10, (d["Y0"]["approx"], est["y0"].max())
    print(f"  Y0 tail deleted: certified Y0 {d['Y0']['approx']:.3e} < float residual estimate {est['y0'].max():.3e} "
          "(detected)")


def test_mutation_SJ_tail_not_detectable():
    """Documents (does not detect) the deletion of the S_J Cauchy-tail terms: the change in Z1 is far below any
    float estimate's resolution. This test fails if the change ever becomes resolvable (then a real detection test
    should replace it)."""
    base = _certified_diag(1)
    d = _certified_diag(1, ("SJ_tail",))
    change = base["Z1"]["approx"] - d["Z1"]["approx"]
    assert 0 <= change < 1e-9, change
    print(f"  S_J tail deleted: Z1 changes by {change:.3e} (not detectable by the float estimate; rests on review)")


# --------------------------------------------------------------------------------------------- within uniqueness
def _within_uniqueness(perturb, what):
    base = _certified_diag(1)
    r0 = Fraction(base["r_existence"]["dec"])
    z1 = Fraction(base["Z1"]["dec"])
    _, K, om, A, _ = ct.load(ct.centre_path(1, 32))
    om2, A2, D = perturb(om, [row[:] for row in A], K)
    try:
        res = ex.prove_centre(1, K, om2, A2, log=QUIET)
    except ex.ProofFailure as e:
        print(f"  {what}: proof failed ({e}); allowed")
        return
    r1 = Fraction(res["r_existence"]["dec"])
    y1 = Fraction(res["Y0"]["dec"])
    assert r1 >= D - r0, f"{what}: r' = {float(r1)} < D - r = {float(D - r0)}: contradicts uniqueness"
    assert y1 >= (1 - z1) * D * Fraction(999, 1000), f"{what}: Y0' = {float(y1)} < (1 - Z1) D = {float((1 - z1) * D)}"
    print(f"  {what}: D = {float(D):.4e}, Y0' = {float(y1):.4e}, r' = {float(r1):.4e} (r'/D = {float(r1 / D):.3f})")


def test_within_uniqueness_omega():
    def pert(om, A, K):
        ctx.prec = 512
        d = arb(2) ** -85
        return om + d, A, ex.to_fraction(d)
    _within_uniqueness(pert, "omega + 2^-85")


def test_within_uniqueness_a32_component5():
    def pert(om, A, K):
        ctx.prec = 512
        d = arb(2) ** -85
        A[5][K + 32] = A[5][K + 32] + d
        A[5][K - 32] = A[5][K - 32] + d          # keep the centre conjugation-symmetric
        nu = arb(fmpq(1, 4)).exp()
        D = ex.to_fraction(ex.lo(2 * nu ** 32 * d))          # ||delta||_nu = 2 nu^32 2^-85 (exact lower value)
        return om, A, D
    _within_uniqueness(pert, "a_{+-32,5} + 2^-85")


if __name__ == "__main__":
    t0 = time.time()
    names = [n for n in sorted(globals()) if n.startswith("test_")]
    only = sys.argv[1:]
    if only:
        names = [n for n in names if any(o in n for o in only)]
    heavy = ("acceptance", "negative", "float", "mutation", "within")
    order = [n for n in names if not any(h in n for h in heavy)] + \
            [n for n in names if any(h in n for h in heavy)]
    failed = 0
    for n in order:
        t1 = time.time()
        try:
            globals()[n]()
            print(f"PASS {n} ({time.time() - t1:.0f} s)")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"FAIL {n}: {type(e).__name__}: {e}")
    print(f"{len(order) - failed}/{len(order)} passed in {time.time() - t0:.0f} s")
    sys.exit(1 if failed else 0)
