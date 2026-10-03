"""Acceptance tests and negative controls for branch_stability.py (Theorem C). Each test can fail.

Run (machine shared; about 30 minutes, one process):
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

Group units (LEMMAS-stability.md section 11; group TEST_GROUP, default 6, proved from scratch with internal data kept)
  * Acceptance: certified; every piece of the group identified (Lemma 11.3); multiplier bound < 1; if the log holds
    this group's unit made with the same settings, rho, Z1 along the path, Z2, Y', theta_T and the multiplier bound
    are reproduced bit for bit.
  * Independent floating-point checks (separate float continuation from the Stage E centre, K = 16): the orbit lies
    within the certified rho of the quadratic path at the group's ends, its centre and the first and last piece
    centres (and that distance is a sizeable fraction of rho); on the critical columns the float column sums of
    Vi(d) H(g) V(d) - Lambda(d) at both ends are below the certified w_j; the float leading nontrivial exponent is
    below -delta; the moving-centre term h B' + h^2 B'' of Z1 dominates a float evaluation of the finite block of
    A_fin (DF(xtilde(g); g) - DF(xbar; g_c)) at both ends and is not vacuous.
  * Jet and DJet agree with branch.Hess (first and second order) and with central differences (third order of G,
    second of Df); a box base point encloses point base points.
  * Runs of consecutive pieces (part): the run's pieces, interval and centre are the right ones; bad runs are refused.
Negative controls (each must FAIL to certify, or be detected)
  * delta = 5e-5 above the leading exponent is refused.
  * The same group with its parameter interval widened threefold (same centre, weights, settings) is refused.
  * Dropping h^3 Y3 + h^4 Y4 from Y' (drop_third_order) is detected: the float distance exceeds the mutated rho.
  * Dropping the d^2 terms of the Hill coefficients and of omega (drop_d2_terms) is detected by the float window.
  * Dividing every piece's uniqueness radius by 16 makes the identification (Lemma 11.3) fail.
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
        logged = bs.done_labels().get(LABEL)
        if logged is None:
            raise AssertionError("final piece unit missing; run final stability before full acceptance tests")
        _C["p"] = bs.prove_piece_uniform(LABEL, settings=logged["settings"], controls={"dump": True}, log=QUIET)
    return _C["p"]


def _float_orbit(g, K=16):
    """Independent float orbit at g: continuation from the Stage E centre (not from the branch centre)."""
    trk = _C.setdefault("trk", br.FloatTrack(K))
    trk.at(Fraction(g))
    return trk.om, trk.a.copy()


def _hill_float(om, a, g, e, Ke, NS=512):
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
    assert logged is not None and logged["settings"] == p["settings"], "matching final piece required"
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
        H = _hill_float(omf, af, gend, e, p["certificate"]["K_e"])
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


# =================================================================================================================
# Group units (section 11 of LEMMAS-stability.md): one group proved from scratch with internal data kept
# =================================================================================================================
GID = int(os.environ.get("TEST_GROUP", "6"))


def _group():
    if "G" not in _C:
        _C["G"] = bs.prove_group_uniform(GID, controls={"dump": True}, log=QUIET)
    return _C["G"]


def _path_float(cx, g):
    d = float(Fraction(g) - cx["gc"])
    a = br.centre_float(cx["A"]) + d * br.centre_float(cx["A1"]) + 0.5 * d * d * br.centre_float(cx["A2"])
    om = float(cx["om"]) + d * float(cx["om1"]) + 0.5 * d * d * float(cx["om2"])
    return d, om, a


def _group_points():
    """Float orbits (separate float continuation from the Stage E centre, K = 16) at the group's ends, its centre and
    the centres of its first and last pieces; their distance from the path in the group's weights; Hill windows at the
    ends (cached)."""
    if "Gpts" in _C:
        return _C["Gpts"]
    G = _group()
    cx = G["_ctx"]
    eta = np.array([float(Fraction(v)) for v in cx["crec"]["eta"]])
    gs = [cx["grp"]["g_lo"], cx["plist"][0]["centre_g"], cx["crec"]["centre_g"], cx["plist"][-1]["centre_g"],
          cx["grp"]["g_hi"]]
    e = G["certificate"]["S_exponents"]
    Ke = G["certificate"]["K_e"]
    trk = br.FloatTrack(16)
    out = []
    for g in sorted(gs, key=Fraction):
        trk.at(Fraction(g))
        om, a = trk.om, trk.a.copy()
        d, omt, at = _path_float(cx, g)
        out.append(dict(g=g, d=d, dist=_dist_eta(om, a, omt, at, eta), om=om, a=a,
                        H=_hill_float(om, a, g, e, Ke) if g in (cx["grp"]["g_lo"], cx["grp"]["g_hi"]) else None))
    _C["Gpts"] = out
    return out


def test_group_acceptance():
    G = _group()
    assert G["ok"] and G["uniform"] and G["type"] == "group_unit" and G["part"] is None and G["label"] == f"G{GID}"
    cx = G["_ctx"]
    labels = [r["label"] for r in cx["plist"]]
    assert G["pieces"] == labels and len(labels) >= 2
    ident = G["existence"]["identification"]
    assert [i["label"] for i in ident] == labels
    assert all(i["ok"] and i["lhs"] <= i["r_uniqueness"] for i in ident)
    assert float(G["multiplier_bound_full_period"]["approx"]) < 1
    c = G["certificate"]
    assert c["count_in_Omega"] == 1 and c["theta_T"]["approx"] < 1 and c["SC_worst_ratio"] < 1
    assert c.get("quadratic_in_d") is True
    # the unit's interval is the union of its pieces, the group's recorded range, and h covers it
    assert Fraction(G["g"][0]) == Fraction(cx["plist"][0]["g_lo"]) == Fraction(cx["grp"]["g_lo"])
    assert Fraction(G["g"][1]) == Fraction(cx["plist"][-1]["g_hi"]) == Fraction(cx["grp"]["g_hi"])
    assert cx["hF"] >= max(Fraction(G["g"][1]) - cx["gc"], cx["gc"] - Fraction(G["g"][0]))
    assert float(cx["hU"]) >= float(cx["hF"])
    logged = bs.done_groups().get(f"G{GID}")
    if logged is not None and logged["settings"] == G["settings"]:
        for k in ("rho", "Z1_path", "Z2", "Yprime"):
            assert logged["existence"][k]["hex"] == G["existence"][k]["hex"], k
        assert logged["certificate"]["theta_T"]["hex"] == c["theta_T"]["hex"]
        assert logged["multiplier_bound_full_period"]["hex"] == G["multiplier_bound_full_period"]["hex"]
    else:
        print(f"  (no logged unit G{GID} with the same settings: bit-for-bit comparison skipped)")


def test_group_float_orbit_inside_ball():
    G = _group()
    rho = float(Fraction(G["existence"]["rho"]["dec"]))
    pts = _group_points()
    for p_ in pts:
        assert p_["dist"] <= rho, (p_["g"], p_["dist"], rho)
    assert max(p_["dist"] for p_ in pts) > 1e-2 * rho      # a meaningful fraction of rho, not noise


def test_group_negative_drop_third_order_detected():
    G = _group()
    cx = G["_ctx"]
    _, rho_mut, _ = bs.lemma_11_1(cx["Yparts"], cx["hU"], cx["ETA"], cx["Z1G"], cx["Z2"], cx["r_star"],
                                  cx["settings"]["rho_margin"], ("drop_third_order",))
    assert max(p_["dist"] for p_ in _group_points()) > float(rho_mut), "dropping Y3, Y4 was not detected"


def test_group_window_dominated():
    G = _group()
    I = G["_internals"]
    lam, L1, V0, V1, Vi0, Vi1, wj = I["lam"], I["L1"], I["V0"], I["V1"], I["Vi0"], I["Vi1"], I["wj"]
    delta = float(G["delta"]["approx"])
    n_checked = 0
    for p_ in _group_points():
        if p_["H"] is None:
            continue
        d = p_["d"]
        cs = np.abs((Vi0 + d * Vi1) @ p_["H"] @ (V0 + d * V1) - np.diag(lam + d * L1)).sum(0)
        for j in I["crit"]:
            assert cs[j] <= wj[j], (p_["g"], j, cs[j], wj[j])
        Jn = {n: np.fft.fft(br.jac_f(ct.phi_samples(p_["a"], 512), float(Fraction(p_["g"]))), axis=0)[n % 512] / 512
              for n in range(-64, 65)}
        evs = sorted(br.floquet_f(p_["om"], Jn, 16), key=lambda z: abs(z))[1:]
        assert max(z.real for z in evs) < -delta
        n_checked += 1
    assert n_checked == 2


def test_group_negative_drop_d2_terms_detected():
    G = _group()
    U = G["_ctx"]["U"]
    try:
        mut = bs.certify_uniform(U, settings=dict(G["settings"]), controls={"drop_d2_terms": True, "dump": True},
                                 log=QUIET)
        I = mut["internals"]
    except bs.FAILURES:
        return                                     # refused outright: also a detection
    lam, L1, V0, V1, Vi0, Vi1, wj = I["lam"], I["L1"], I["V0"], I["V1"], I["Vi0"], I["Vi1"], I["wj"]
    worst = 0.0
    for p_ in _group_points():
        if p_["H"] is None:
            continue
        d = p_["d"]
        cs = np.abs((Vi0 + d * Vi1) @ p_["H"] @ (V0 + d * V1) - np.diag(lam + d * L1)).sum(0)
        worst = max(worst, max(cs[j] / wj[j] for j in I["crit"]))
    assert worst > 1, f"dropping the d^2 terms was not detected (largest ratio true / mutated bound {worst:.3e})"


def test_group_Z1_path_term():
    """The moving-centre term of Z1 (h B' + h^2 B'') dominates an independent float evaluation of the finite block of
    A_fin (DF(xtilde(g); g) - DF(xbar; g_c)) at the group's ends (8 times the DFT nodes) and is not vacuous (the float
    value is a sizeable fraction of it), so a missing or zero term would fail."""
    G = _group()
    cx = G["_ctx"]
    bl, ETA, h = cx["bl"], cx["ETA"], cx["hU"]
    Bp, Bpp = cx["Bp"], cx["Bpp"]
    eta = np.array([float(v) for v in ETA])
    inc_rows = []
    for c in range(DIM + 1):
        inc_rows.append(sum(float(ETA[cp] * (h * Bp[c][cp] + h * h * Bpp[c][cp])) for cp in range(DIM + 1)) / eta[c])
    inc = max(inc_rows)
    K = bl["K"]
    lay = ct.Layout(K)
    Mc = 8 * (4 * K + 64)
    gc = cx["gc"]
    G0, _ = br.galerkin_f(float(cx["om"]), br.centre_float(cx["A"]), float(gc), Mc)
    Afin = np.array([[complex(float(v.real.mid()), float(v.imag.mid())) for v in row] for row in bl["_Afin"].tolist()])
    w, comp, _ = br._weights_f(lay)
    etav = np.array([eta[c] for c in comp])
    worst = 0.0
    for g in (cx["grp"]["g_lo"], cx["grp"]["g_hi"]):
        d, om, a = _path_float(cx, g)
        Gd, _ = br.galerkin_f(om, a, float(Fraction(g)), Mc)
        Bw = np.abs(Afin @ (Gd - G0)) * (w / etav)[:, None] / (w / etav)[None, :]
        val = 0.0
        for c in range(DIM + 1):
            cs = Bw[comp == c].sum(axis=0)
            val = max(val, sum(cs[comp == cp].max() for cp in range(DIM + 1)))
        worst = max(worst, val)
    print(f"  Z1 path term: certified {inc:.3e}, float finite block {worst:.3e}")
    assert worst <= inc, (worst, inc)
    assert worst > 0, "dropping the moving-centre term would go undetected"
    assert worst >= inc / 20, f"float {worst:.3e} is below 1/20 of the certified term {inc:.3e}"


def test_group_drop_moving_centre_hook_detected():
    original=_group()
    try:
        mutated=bs.prove_group_uniform(GID,_mutate=("drop_moving_centre",),controls={"dump":True},log=QUIET)
    except bs.FAILURES:
        return
    assert "drop_moving_centre" in mutated["MUTATED"]
    assert not bs._current_unit(mutated), "mutation must never enter coverage"
    assert mutated["existence"]["Z1_path"]["hex"] == mutated["existence"]["Z1_point"]["hex"]
    assert float(mutated["existence"]["Z1_path"]["approx"]) < float(original["existence"]["Z1_path"]["approx"])
    # The finite block oracle in this test has a nonzero path increment; the mutated increment is zero.
    test_group_Z1_path_term()


def test_group_negative_delta_above_exponent():
    G = _group()
    try:
        bs.certify_uniform(G["_ctx"]["U"], settings=dict(G["settings"], delta="5e-5"), log=QUIET)
    except bs.FAILURES as e:
        print(f"  delta 5e-5 refused: {type(e).__name__}: {str(e)[:160]}")
        return
    raise AssertionError("delta = 5e-5 (above the leading exponent 4.71e-5) was certified on a group")


def test_group_negative_identification():
    G = _group()
    cx = G["_ctx"]
    try:
        bs.identify(cx["plist"], cx["centres"], cx["crec"], cx["gc"],
                    (cx["om"], cx["A"], cx["om1"], cx["A1"], cx["om2"], cx["A2"]), cx["ETA"], cx["rho_x"],
                    cx["bl"]["nu"], cx["bl"]["K"], r_hi_scale=arb(2) ** -4)
    except bs.ProofFailure as e:
        assert "uniqueness" in str(e)
        return
    raise AssertionError("identification passed with every r_uniqueness divided by 16")


def test_group_negative_widened():
    """The same group, centre and weights with the parameter interval widened threefold must be refused."""
    try:
        bs.prove_group_uniform(GID, _widen=3, log=QUIET)
    except bs.FAILURES as e:
        print(f"  widened x3 refused: {type(e).__name__}: {str(e)[:160]}")
        return
    raise AssertionError("a threefold widened group interval was certified")


def test_group_parts():
    """Runs of consecutive pieces: the run's pieces are the right slice, its interval is their union, its centre is one of
    them, the two halves overlap (consecutive pieces overlap) and together give the whole group; bad runs are refused."""
    grp, plist, crec, _, _, _ = bs.group_data(GID)
    n = len(plist)
    halves = bs._halves(n)
    assert halves == [(0, n // 2), (n // 2, n)]
    got = []
    for pt in halves:
        g2, pl2, cr2, _, _, _ = bs.group_data(GID, part=pt)
        assert [r["label"] for r in pl2] == [r["label"] for r in plist[pt[0]:pt[1]]]
        assert Fraction(g2["g_lo"]) == Fraction(pl2[0]["g_lo"]) and Fraction(g2["g_hi"]) == Fraction(pl2[-1]["g_hi"])
        assert cr2["label"] in [r["label"] for r in pl2]
        got += [r["label"] for r in pl2]
    assert got == [r["label"] for r in plist]
    assert Fraction(bs.group_data(GID, part=halves[1])[0]["g_lo"]) <= Fraction(bs.group_data(GID, part=halves[0])[0]["g_hi"])
    assert bs.unit_label(GID, halves[0]) == f"G{GID}[0:{n // 2}]" and bs.unit_label(GID) == f"G{GID}"
    for bad in ((0, 0), (-1, 2), (0, n + 1), (3, 2)):
        try:
            bs.group_data(GID, part=bad)
        except ValueError:
            continue
        raise AssertionError(f"part {bad} was accepted")


def test_jets_against_hess_and_differences():
    """Jet / DJet against branch.Hess on an affine path (first and second derivatives) and against central differences
    (third derivative of G, second of Df) on the quadratic path, at a point of a branch profile."""
    from flint import acb as _acb, fmpq as _fmpq
    import arbmodel as am
    import fourier_eval as fe
    G = _group()
    cx = G["_ctx"]
    A, A1, A2 = cx["A"], cx["A1"], cx["A2"]
    zero = [[_acb(0)] * len(r) for r in A2]
    th = _acb(arb("0.3"))
    zz = fe.TrigPoly([r[:] for r in A] + [r[:] for r in A1] + [r[:] for r in A2]).eval(th)
    zz0 = fe.TrigPoly([r[:] for r in A] + [r[:] for r in A1] + zero).eval(th)
    prm = br.params_for(cx["gc"], cx["gc"], 53)
    D0 = _acb(0)
    g = bs.gjet_flat(zz0, prm, D0, D0, 2, (1, 2))
    h1, h2 = bs.taylor_flat(zz0, prm, D0, 1), bs.taylor_flat(zz0, prm, D0, 2)
    assert all(g[k].overlaps(h1[k]) and (2 * g[DIM + k]).overlaps(h2[k]) for k in range(DIM))
    dj = bs.djet_flat(zz0, prm, D0, D0, 1, (1,))
    j1 = bs.j1_flat(zz0, prm, D0)
    assert all(a.overlaps(b) for a, b in zip(dj, j1))
    eps = Fraction(1, 10 ** 7)

    def at(d, fn):
        Dd = _acb(arb(_fmpq(d.numerator, d.denominator)))
        return fn(Dd)
    with am.precision(128):
        cpp = at(eps, lambda Dd: bs.gjet_flat(zz, prm, Dd, Dd * Dd, 2, (2,), prec=128))
        cmm = at(-eps, lambda Dd: bs.gjet_flat(zz, prm, Dd, Dd * Dd, 2, (2,), prec=128))
        c3 = bs.gjet_flat(zz, prm, D0, D0, 3, (3,), prec=128)
        jp = at(eps, lambda Dd: bs.djet_flat(zz, prm, Dd, Dd * Dd, 1, (1,), prec=128))
        jm = at(-eps, lambda Dd: bs.djet_flat(zz, prm, Dd, Dd * Dd, 1, (1,), prec=128))
        jc2 = bs.djet_flat(zz, prm, D0, D0, 2, (2,), prec=128)
    e = float(eps)
    for k in range(DIM):
        fd = float(((cpp[k] - cmm[k]) / (2 * e) / 3).real.mid())
        assert abs(fd - float(c3[k].real.mid())) <= 1e-6 * (abs(fd) + 1e-12), k
    scale = max(abs(float(v.real.mid())) for v in jc2)
    for a, b, c in zip(jp, jm, jc2):
        fd = float(((a - b) / (2 * e) / 2).real.mid())
        assert abs(fd - float(c.real.mid())) <= 1e-6 * scale
    # a box base point encloses point base points
    hh = Fraction(29, 10 ** 7)
    cb = bs.gjet_flat(zz, prm, bs._dball(hh), bs._sq_ball(hh), 4, (4,))
    for d in (-hh, Fraction(0), hh / 3, hh):
        Dd = _acb(arb(_fmpq(d.numerator, d.denominator)))
        cpt = bs.gjet_flat(zz, prm, Dd, Dd * Dd, 4, (4,))
        assert all(b.contains(p_) for b, p_ in zip(cb, cpt)), d


def _historical_piece():
    return next(r["rec"] for r in br.snapshot_jsonl(br.LEGACY_RUN_LOG.format(K=12))[0] if r["type"] == "piece")


def test_unit_coverage_negative_controls():
    """Structural fixtures exercise the bookkeeping only; they never write a proof log or theorem result."""
    import copy
    r = _historical_piece()
    common = dict(ok=True, uniform=True, settings={"delta": "3e-5"}, program_sha256=bs.PROGRAM_SHA256,
                  sources_sha256=bs.SOURCES_SHA256)
    u = dict(common, type="unit", label=r["label"], g=[r["g_lo"], r["g_hi"]],
             centre_sha256=r["centre_sha256"], eta=r["eta"], rho0=r["settings"]["rho0"],
             branch_piece_sha256=br.record_digest(r), existence={"r_uniqueness_logged": r["r_uniqueness"]})
    assert bs._piece_unit_matches(u, r)
    for k, v in (("centre_sha256", "0"*64), ("g", [r["centre_g"], r["g_hi"]]),
                 ("program_sha256", "0"*64), ("sources_sha256", {}), ("settings", None),
                 ("branch_piece_sha256", "0"*64), ("MUTATED", ["drop_moving_centre"])):
        assert not bs._piece_unit_matches(dict(u, **{k:v}), r), k
    bad = copy.deepcopy(u); bad["existence"]["r_uniqueness_logged"] = {"hex": "0x1p-90"}
    assert not bs._piece_unit_matches(bad, r)
    ident = dict(label=r["label"], g=u["g"], centre_sha256=r["centre_sha256"],
                 r_uniqueness_logged=r["r_uniqueness"], ok=True)
    gu = dict(common, type="group_unit", group=0, label="G0", part=None, g=u["g"], pieces=[r["label"]],
              piece_g={r["label"]:u["g"]}, piece_centre_sha256={r["label"]:r["centre_sha256"]},
              branch_piece_sha256={r["label"]:br.record_digest(r)}, existence={"identification":[ident]})
    assert bs._covering_group_unit(r, 0, {"G0":gu}) is gu
    for k,v in (("group", 1), ("pieces", []), ("piece_g", {}), ("g", [r["centre_g"],r["g_hi"]]),
                ("piece_centre_sha256", {}), ("branch_piece_sha256", {}), ("existence", {"identification":[]})):
        assert bs._covering_group_unit(r, 0, {"G0":dict(gu, **{k:v})}) is None, k
    bad = copy.deepcopy(gu); bad["existence"]["identification"][0]["r_uniqueness_logged"] = {}
    assert bs._covering_group_unit(r, 0, {"G0":bad}) is None
    half = dict(gu, label="G0[0:1]", part=[0,1])
    assert bs._covering_group_unit(r, 0, {half["label"]:half}) is half
    rows = [dict(uniform=True,g=["0","1"]), dict(uniform=True,g=["2","3"]),
            dict(uniform=True,g=["2.5","4"]), dict(uniform=False,g=["3.5","5"])]
    assert bs._covered_runs(rows) == [["0","1",1],["2","4",2]]
    assert bs._decimal_up(Fraction(12345678901,10**10)) == "1.234567891"
    assert Fraction.from_float(bs._float_up(Fraction(1,10))) >= Fraction(1,10)


def test_group_fallback_plan():
    labels=[f"G0P{i}" for i in range(4)]
    assert bs._next_group_units(0,labels,labels,set()) == ([(0,None)],[])
    # Old failure rows lacking part refer to the whole group; the driver's source check keeps old code out.
    row={"group":0};part=row.get("part");failed={(row["group"],None if part is None else tuple(part))}
    assert bs._next_group_units(0,labels,labels,failed) == ([(0,(0,2)),(0,(2,4))],[])
    failed.add((0,(0,2)))
    assert bs._next_group_units(0,labels,labels,failed) == ([(0,(2,4))],[(0,(0,2))])
    failed.add((0,(2,4)))
    assert bs._next_group_units(0,labels,labels,failed) == ([],[(0,(0,2)),(0,(2,4))])
    assert bs._next_group_units(0,labels,labels[2:],failed) == ([],[(0,(2,4))])
    assert bs._next_group_units(0,labels[:1],labels[:1],{(0,None)}) == ([],[(0,None)])


def test_theorem_b_record_negative_controls():
    import copy
    r = _historical_piece()
    piece = dict(label=r["label"], g=[r["g_lo"], r["g_hi"]], g_centre=r["centre_g"],
                 centre_sha256=r["centre_sha256"], eta=r["eta"], r_uniqueness=r["r_uniqueness"])
    record = dict(run_log_sha256="run", centres_sha256="centre", program_sha256=br.PROGRAM_SHA256,
                  sources_sha256=br.SOURCES_SHA256, n_pieces=1, connected_pieces=1, gluing=[],
                  pieces=[piece], g_covered=piece["g"])
    bs._check_theorem_b(record,[{"rec":r}],"run","centre")
    for key,value in (("run_log_sha256","wrong"),("sources_sha256",{}),("connected_pieces",0),("pieces",[])):
        try:
            bs._check_theorem_b(dict(record, **{key:value}),[{"rec":r}],"run","centre")
        except bs.ProofFailure:
            continue
        raise AssertionError(f"Theorem B mismatch {key} admitted")
    for key,value in (("g",[r["centre_g"],r["g_hi"]]),("r_uniqueness",{}),("centre_sha256","wrong"),("eta",[])):
        bad=copy.deepcopy(record); bad["pieces"][0][key]=value
        try:
            bs._check_theorem_b(bad,[{"rec":r}],"run","centre")
        except bs.ProofFailure:
            continue
        raise AssertionError(f"Theorem B piece mismatch {key} admitted")


def test_poly_norm_weighted_quadratic_sup():
    from flint import acb, ctx
    old=ctx.prec; ctx.prec=256
    try:
        K=2; nu=arb(2); ETA=[arb(1)]*19
        comps=[([acb(0)]*5,[acb(0)]*5,[acb(0)]*5) for _ in range(18)]
        comps[0][0][4]=acb(1); comps[0][1][4]=acb(2); comps[0][2][4]=acb(3)
        D=acb(arb("0.1").union(arb("0.5")))
        bound=bs._poly_norm(((acb(0),acb(0),acb(0)),comps),D,ETA,nu,K)
        expected=arb(11) # (1 + 2*0.5 + 3*0.25)*2^2
        assert bound >= expected
        assert bound < 12
        for n in range(101):
            d=arb(n)/250+arb("0.1")
            exact=(1+2*d+3*d*d)*4
            assert bound >= exact
        no_quadratic=arb(8); at_centre=(1+2*arb("0.3")+3*arb("0.3")**2)*4
        assert no_quadratic < expected and at_centre < expected and expected/4 < expected
    finally:
        ctx.prec=old


def test_operator_blocks_each_part_and_second_order():
    """Independent sparse operator oracle isolates finite/finite, finite/tail and tail, and B'' alone."""
    from flint import acb, acb_mat, ctx
    old=ctx.prec; ctx.prec=128
    try:
        K=1; Kp=3; lay=ct.Layout(K); nu=arb(2); rho=arb(2)
        Afin=acb_mat(lay.n,lay.n)
        for i in range(lay.n): Afin[i,i]=1
        diag=[[arb(int(i==j)) for j in range(18)] for i in range(18)]
        bl=dict(K=K,_Kp=Kp,settings=dict(prec_mat=128,prec_g=128,L=1),rho=rho,
                _nupow=[nu**n for n in range(8)],_tailK=arb(0),_Afin=Afin,Abar0=diag,
                Abar1=[[v/2 for v in row] for row in diag])
        J={n:[[acb(0) for _ in range(18)] for _ in range(18)] for n in range(-Kp,Kp+1)}
        for n,value in ((-2,3),(0,1),(2,2)): J[n][0][0]=acb(value)
        S=[[arb(0) for _ in range(18)] for _ in range(18)];S[0][0]=arb(3)*arb(4).exp()
        Acol=[[acb(0)]*3 for _ in range(18)];Acol[0]=[acb(1),acb(0),acb(1)]
        B,parts=bs.operator_blocks(bl,J,S,acb(2),Acol,parts=True)
        # Direct column sums of the actual sparse convolution, in the exact mode weights.
        for mp in range(-6,7):
            value=sum(abs(float(J.get(m-mp,[[acb(0)]])[0][0].real)) * 2**abs(m)/2**abs(mp)
                      for m in range(-K,K+1) if m-mp in J)
            if abs(mp)>K:
                assert float(parts["ft"][1][1]) >= value
        assert parts["ft"][1][1] >= arb(3)/4
        # Finite block diagonal has the complex frequency derivative as well as the convolution.
        assert parts["ff"][1][1] >= (arb(1)**2+arb(2)**2).sqrt()
        # tail rows: sum_n |J_n| nu^|n| + |om_d| Abar1 = 1+3*4+2*4+1 = 22.
        assert parts["tail"][0][0] == arb(22)
        # B'' is independently computed with half the second derivatives; no h B' can mask it.
        B2,parts2=bs.operator_blocks(bl,J,S,acb(2),Acol,parts=True)
        assert parts2["tail"][0][0] == arb(22)
        assert B2[1][1] > 0
        zero=[[arb(0)]*19 for _ in range(19)];eta=[arb(1)]*19;h=arb("0.01")
        term=bs._z1_rows(zero,zero,B2,h,eta)
        assert term >= h*h*22 and bs._z1_rows(zero,None,None,h,eta)==0
    finally:
        ctx.prec=old


def test_complex_fourth_order_independent():
    """Fourth coefficient against 80-digit numerical differentiation of the original model, at complex theta.
    mpmath's differentiation does not use Jet or DJet recurrences.
    """
    import mpmath as mp
    from flint import acb, ctx
    import arbmodel as am
    import fourier_eval as fe
    rows=br.snapshot_jsonl(br.LEGACY_RUN_LOG.format(K=12))[0]
    r=next(x["rec"] for x in rows if x["type"]=="piece" and x["group"]==6)
    centres={c["g"]:c for c in br.snapshot_jsonl(br.CENTRES.format(K=12))[0]}
    om,A=br.centre_from_record(centres[r["centre_g"]])
    gc=Fraction(r["centre_g"]);h=Fraction(r["g_hi"])-gc
    om1,A1,om2,A2=bs.predictor(om,A,gc,h)
    old=ctx.prec;ctx.prec=256
    def mpc(x):
        re=ct.dyadic_to_text(x.real.mid());im=ct.dyadic_to_text(x.imag.mid())
        def number(text):
            q=br.frac_of(ct.text_to_dyadic(text));return mp.mpf(q.numerator)/q.denominator
        return mp.mpc(number(re),number(im))
    try:
        with mp.workdps(80):
            model={"_D":mp.mpf,"_I":mp.mpf}
            with open(os.path.join(HERE,"tp06_18d_arb.py")) as f:
                exec(compile(f.read(),"independent-mpmath-model","exec"),model)
            for theta in (acb(arb("0.3"),arb("0.2")),acb(arb("0.8"),arb("-0.2"))):
                zz=fe.TrigPoly([r[:] for r in A]+[r[:] for r in A1]+[r[:] for r in A2]).eval(theta)
                prm=br.params_for(gc,gc,256)
                got=bs.gjet_flat(zz,prm,acb(0),acb(0),4,(4,),prec=256)
                zm=[mpc(v) for v in zz];sig=[mpc(acb(v)) for v in am.SIG]
                pm={k:mpc(am.to_ball(v)) for k,v in prm.items()}
                def direct(d):
                    pp=dict(pm);pp["g_Ks"]+=d
                    x=[(zm[i]+d*zm[18+i]+d*d*zm[36+i]/2)*sig[i] for i in range(18)]
                    return model["field"](x,pp,mp,mp.mpf(0))
                for k,v in enumerate(got):
                    expected=mp.diff(lambda d:direct(d)[k]/sig[k],mp.mpf(0),4)/mp.factorial(4)
                    actual=mpc(v)
                    assert abs(actual-expected) <= mp.mpf("1e-45")*(1+abs(expected)), (theta,k,actual,expected)
    finally:
        ctx.prec=old


def test_half_unit_reproduced():
    """A half group is actually proved twice, with identical exact certificate fields."""
    _,pl,_,_,_,_=bs.group_data(GID)
    part=bs._halves(len(pl))[0]
    one=bs.prove_group_uniform(GID,part=part,log=QUIET)
    two=bs.prove_group_uniform(GID,part=part,settings=one["settings"],log=QUIET)
    assert one["ok"] and two["ok"] and one["part"]==two["part"]==list(part)
    for key in ("rho","Z1_path","Z2","Yprime"):
        assert one["existence"][key]["hex"]==two["existence"][key]["hex"],key
    assert one["certificate"]["theta_T"]["hex"]==two["certificate"]["theta_T"]["hex"]
    assert one["multiplier_bound_full_period"]["hex"]==two["multiplier_bound_full_period"]["hex"]


QUICK_TESTS=[test_group_fallback_plan,test_unit_coverage_negative_controls,test_theorem_b_record_negative_controls,
             test_poly_norm_weighted_quadratic_sup,test_operator_blocks_each_part_and_second_order,
             test_complex_fourth_order_independent]

PIECE_TESTS = [test_acceptance_piece, test_float_orbit_inside_certified_ball, test_float_window_dominated,
               test_negative_delta_above_exponent, test_negative_drop_g_terms_detected,
               test_negative_drop_second_order_detected, test_negative_lemma_10_1_identification]
GROUP_TESTS = [test_group_parts, test_group_acceptance, test_group_float_orbit_inside_ball,
               test_group_negative_drop_third_order_detected, test_group_window_dominated,
               test_group_negative_drop_d2_terms_detected, test_group_Z1_path_term,
               test_group_drop_moving_centre_hook_detected,test_group_negative_delta_above_exponent, test_group_negative_identification,
               test_jets_against_hess_and_differences, test_group_negative_widened, test_half_unit_reproduced]
TESTS = PIECE_TESTS + GROUP_TESTS

if __name__ == "__main__":
    sel = sys.argv[1] if len(sys.argv) > 1 else "all"           # all | piece | group
    run_list = {"all": TESTS + QUICK_TESTS, "piece": PIECE_TESTS, "group": GROUP_TESTS, "quick": QUICK_TESTS}[sel]
    failed = 0
    for t in run_list:
        t0 = time.time()
        try:
            t()
            print(f"PASS {t.__name__} ({time.time() - t0:.1f} s)", flush=True)
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"FAIL {t.__name__}: {type(e).__name__}: {e}", flush=True)
    print(f"{len(run_list) - failed}/{len(run_list)} passed")
    sys.exit(1 if failed else 0)
