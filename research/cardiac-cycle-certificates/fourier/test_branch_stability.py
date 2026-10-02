"""Acceptance tests and negative controls for branch_stability.py (Theorem C). Each test can fail.

Run (machine shared; about 15 minutes, one process):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 2400 python3 test_branch_stability.py      (or pytest)

One piece (G0P0, the piece containing G_Ks = 0.0275) is proved from scratch with internal data kept (dump); the other
tests reuse that computation.

Acceptance
  * The piece is certified uniformly; the recomputed Theorem B bounds Y0 and Z1 equal the logged hex values; the
    multiplier bound is < 1; if the run log holds this piece, its rho, theta_T and multiplier bound are reproduced bit
    for bit (same programs, single-threaded BLAS).
  * Independent floating-point check at both endpoints of the piece (orbit from a separate float continuation from
    the Stage E centre, K = 16, Hill window from 4 times more DFT nodes): (a) the true distance of the orbit from the
    affine centre, ||x*(g) - xbar - (g - g_c) xbar_1||, is below the certified rho (Lemma 10.1); (b) the column sums of
    Vi(d) H(g) V(d) - Lambda(d) on the critical columns are below the certified bound w_j (Lemma 10.3); (c) the float
    leading nontrivial exponent at the endpoints is below -delta.
Negative controls
  * delta above the true leading exponent (5e-5 > 4.71e-5) fails.
  * Dropping the g-terms (controls drop_g_terms: H(g) treated as H(g_c), omega fixed, no first-order correction) is
    DETECTED: the float column sum of V0^-1 H(g_end) V0 - Lambda0 on a critical column exceeds the mutated bound.
  * Dropping the second-order term Y2 of Lemma 10.1 (mutation drop_second_order) is detected: the float distance of
    (a) exceeds the mutated rho.
  * Lemma 10.1 refuses a uniqueness radius smaller than e + rho (identification with the branch would fail).
"""
import json
import math
import os
import sys
import time
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_v, "1")

import numpy as np  # noqa: E402
from flint import arb  # noqa: E402

import branch as br  # noqa: E402
import branch_stability as bs  # noqa: E402
import centre as ct  # noqa: E402

DIM, IV = 18, 0
LABEL = "G0P0"
QUIET = lambda *a, **k: None  # noqa: E731
_C = {}


def _piece():
    if "p" not in _C:
        _C["p"] = bs.prove_piece_uniform(LABEL, controls={"dump": True}, log=QUIET)
    return _C["p"]


def _float_orbit(g, K=16):
    """Independent float orbit at g: continuation from the Stage E centre (not from the branch centre)."""
    trk = _C.setdefault("trk", br.FloatTrack(K))
    trk.at(Fraction(g))
    return trk.om, trk.a.copy()


def _hill_float(om, a, g, e, Ke=16, NS=512):
    sf = 2.0 ** np.array(e, dtype=float)
    Z = ct.phi_samples(a, NS)
    J = br.jac_f(Z, float(g))
    Jh = np.fft.fft(J, axis=0) / NS
    Jn = {n: Jh[n % NS] for n in range(-2 * Ke, 2 * Ke + 1)}
    ms = list(range(-Ke, Ke + 1))
    nW = DIM * len(ms)
    H = np.zeros((nW, nW), complex)
    for i, m in enumerate(ms):
        for k, mp in enumerate(ms):
            H[DIM * i:DIM * i + DIM, DIM * k:DIM * k + DIM] = Jn[m - mp]
        H[DIM * i:DIM * i + DIM, DIM * i:DIM * i + DIM] += -1j * om * m * np.eye(DIM)
    Ss = np.tile(sf, len(ms))
    return H * Ss[None, :] / Ss[:, None]


def _pad(a, K):
    K0 = (a.shape[1] - 1) // 2
    out = np.zeros((DIM, 2 * K + 1), complex)
    out[:, K - K0:K + K0 + 1] = a
    return out


def _dist_eta(om, a, om_t, a_t, eta, nu=math.exp(0.25)):
    K = max((a.shape[1] - 1) // 2, (a_t.shape[1] - 1) // 2)
    a, a_t = _pad(a, K), _pad(a_t, K)
    w = nu ** np.abs(np.arange(-K, K + 1))
    return max([abs(om - om_t) / eta[0]] + [float(np.sum(np.abs(a[i] - a_t[i]) * w)) / eta[1 + i]
                                            for i in range(DIM)])


def test_acceptance_piece():
    p = _piece()
    assert p["ok"] and p["uniform"]
    assert all(p["existence"]["theorem_B_bounds_reproduced"].values())
    assert float(p["multiplier_bound_full_period"]["approx"]) < 1
    c = p["certificate"]
    assert c["count_in_Omega"] == 1 and c["theta_T"]["approx"] < 1 and c["SC_worst_ratio"] < 1
    logged = bs.done_labels().get(LABEL)
    if (logged is not None and logged["delta_requested"] == p["delta_requested"]
            and logged["certificate"]["K_e"] == c["K_e"]):
        assert logged["existence"]["rho"]["hex"] == p["existence"]["rho"]["hex"]
        assert logged["certificate"]["theta_T"]["hex"] == c["theta_T"]["hex"]
        assert logged["multiplier_bound_full_period"]["hex"] == p["multiplier_bound_full_period"]["hex"]


def _endpoint_data():
    """Float orbits and Hill windows at both endpoints (cached)."""
    if "ends" in _C:
        return _C["ends"]
    p = _piece()
    cx = p["_ctx"]
    rec, bl = cx["rec"], cx["bl"]
    gc = Fraction(rec["centre_g"])
    K = bl["K"]
    abar = br.centre_float(cx["A"])
    a1 = br.centre_float(cx["A1"])
    om, om1 = float(cx["om"]), float(cx["om1"])
    eta = np.array([float(Fraction(v)) for v in rec["eta"]])
    e = p["certificate"]["S_exponents"]
    out = []
    for gend in (rec["g_lo"], rec["g_hi"]):
        d = float(Fraction(gend) - gc)
        omf, af = _float_orbit(gend)
        dist = _dist_eta(omf, af, om + d * om1, abar + d * a1, eta)
        H = _hill_float(omf, af, gend, e)
        out.append(dict(g=gend, d=d, dist=dist, H=H, om=omf, a=af))
    _C["ends"] = out
    return out


def test_float_orbit_inside_certified_ball():
    p = _piece()
    rho = float(Fraction(p["existence"]["rho"]["dec"]))
    for end in _endpoint_data():
        assert end["dist"] <= rho, (end["g"], end["dist"], rho)
        assert end["dist"] > 1e-3 * rho        # the float distance is a meaningful fraction of rho (not noise)


def test_float_window_dominated():
    p = _piece()
    I = p["_internals"]
    lam, L1, V0, V1, Vi0, Vi1 = I["lam"], I["L1"], I["V0"], I["V1"], I["Vi0"], I["Vi1"]
    wj = I["wj"]
    delta = float(p["delta"]["approx"])
    for end in _endpoint_data():
        d = end["d"]
        V = V0 + d * V1
        Vi = Vi0 + d * Vi1
        Wm = Vi @ end["H"] @ V - np.diag(lam + d * L1)
        cs = np.abs(Wm).sum(0)
        for j in I["crit"]:
            assert cs[j] <= wj[j], (end["g"], j, cs[j], wj[j])
        ev = br.floquet_f(end["om"], {n: np.fft.fft(br.jac_f(ct.phi_samples(end["a"], 512), float(Fraction(end["g"]))),
                                                     axis=0)[n % 512] / 512 for n in range(-64, 65)}, 16)
        evs = sorted(ev, key=lambda z: abs(z))[1:]                          # drop the trivial exponent
        assert max(z.real for z in evs) < -delta, max(z.real for z in evs)


def test_negative_delta_above_exponent():
    p = _piece()
    U = p["_ctx"]["U"]
    try:
        bs.certify_uniform(U, settings=dict(delta="5e-5"), log=QUIET)
    except bs.FAILURES:
        return
    raise AssertionError("delta = 5e-5 (above the leading exponent 4.71e-5) was certified")


def test_negative_drop_g_terms_detected():
    p = _piece()
    U = p["_ctx"]["U"]
    try:
        mut = bs.certify_uniform(U, settings=dict(delta=p["delta_requested"]), controls={"drop_g_terms": True,
                                                                                       "dump": True}, log=QUIET)
        I = mut["internals"]
    except bs.FAILURES:
        return                                     # refused outright: also a detection
    lam, V0, Vi0, wj = I["lam"], I["V0"], I["Vi0"], I["wj"]
    worst = 0.0
    for end in _endpoint_data():
        cs = np.abs(Vi0 @ end["H"] @ V0 - np.diag(lam)).sum(0)
        worst = max(worst, max(cs[j] / wj[j] for j in I["crit"]))
    assert worst > 1, f"the mutation was not detected (largest ratio true / mutated bound {worst:.3e})"


def test_negative_drop_second_order_detected():
    p = _piece()
    cx = p["_ctx"]
    loc = bs.locate(cx["bl"], cx["om1"], cx["A1"], cx["eG1"], cx["eG2"], cx["ETA"], cx["Z1"], cx["Z2"], cx["r_star"],
                    cx["r_hi"], cx["settings"]["rho_margin"], _mutate=("drop_second_order",))
    rho_mut = float(loc["rho"])
    assert max(end["dist"] for end in _endpoint_data()) > rho_mut, "dropping Y2 was not detected"


def test_negative_lemma_10_1_identification():
    p = _piece()
    cx = p["_ctx"]
    try:
        bs.locate(cx["bl"], cx["om1"], cx["A1"], cx["eG1"], cx["eG2"], cx["ETA"], cx["Z1"], cx["Z2"], cx["r_star"],
                  arb(2) ** -20, cx["settings"]["rho_margin"])
    except bs.ProofFailure as e:
        assert "uniqueness" in str(e)
        return
    raise AssertionError("a uniqueness radius below e + rho was accepted")


TESTS = [test_acceptance_piece, test_float_orbit_inside_certified_ball, test_float_window_dominated,
         test_negative_delta_above_exponent, test_negative_drop_g_terms_detected,
         test_negative_drop_second_order_detected, test_negative_lemma_10_1_identification]

if __name__ == "__main__":
    failed = 0
    for t in TESTS:
        t0 = time.time()
        try:
            t()
            print(f"PASS {t.__name__} ({time.time() - t0:.1f} s)", flush=True)
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"FAIL {t.__name__}: {type(e).__name__}: {e}", flush=True)
    print(f"{len(TESTS) - failed}/{len(TESTS)} passed")
    sys.exit(1 if failed else 0)
