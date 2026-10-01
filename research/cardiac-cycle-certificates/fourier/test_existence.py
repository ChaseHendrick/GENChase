"""Acceptance tests and negative controls for existence.py (Stage E). Each test can fail.

Run (machine shared; about 15 minutes):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 3000 python3 test_existence.py      (or pytest)

Acceptance
  * N = 1: the T enclosure lies inside the other pipeline's [53.58551856, 53.58552012] and inside the CAPD record
    results/cell-gks0.0275.json (period_exact); the proof also checks |a_{1,V}| > r.
  * N = 8, 16: the T enclosure overlaps [53.58795907, 53.58798288] and [53.58805554, 53.58808267].
Negative controls (each must make the proof FAIL with ProofFailure from the radii polynomial):
  * omega of the N = 64 centre perturbed by 1e-8 (the double nearest);
  * the N = 63 damping symbol used with the N = 64 centre;
  * mode m = +-3 of V dropped from the N = 64 centre.
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

from flint import acb, arb, ctx  # noqa: E402

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


if __name__ == "__main__":
    t0 = time.time()
    names = [n for n in sorted(globals()) if n.startswith("test_")]
    order = [n for n in names if "acceptance" not in n and "negative" not in n] + \
            [n for n in names if "acceptance" in n] + [n for n in names if "negative" in n]
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
