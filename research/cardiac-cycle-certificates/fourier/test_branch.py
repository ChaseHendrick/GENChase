"""Acceptance tests and negative controls for branch.py (rec 2: the certified G_Ks branch). Each test can fail.

Run (machine shared; about 10 minutes):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 1800 python3 test_branch.py      (or pytest)

They read the run data written by `branch.py --run` (fourier/data/branch/run_K12.jsonl, centres_K12.jsonl) and the
record results/fourier-branch-gks.json written by `branch.py --collect`, and recompute what they check.

Infrastructure
  * Hess (second-order dual numbers): the Hessian of f agrees with central differences of the forward-mode Jacobian
    (arbmodel.f_and_df) at 256 bits; d(Df)/dg and df/dg agree with differences in g and with f_and_df(wrt=g_Ks); a
    box evaluation contains the point evaluations at random points of the box (enclosure property).
  * Hess ** n for a negative exponent: value, gradient and Hessian against the closed forms (MINOR 1 of the rec 2
    review).
Acceptance
  * The piece containing G_Ks = 0.0275 is recomputed from its stored centre, weights and r_*, with its group's Hessian
    cover rebuilt from the group's centres (in g_lo order): the cover's digest equals the logged one, and Y0, Z1, Z2,
    r_existence and r_uniqueness equal the logged exact hex values. Its T enclosure overlaps Stage E's N = 1
    enclosure (results/fourier-existence-N1.json) and the CAPD record (results/cell-gks0.0275.json).
  * Period enclosures along the branch: consecutive pieces' T enclosures intersect (they share parameter values, so
    a disjoint pair would be a contradiction), their midpoints decrease with G_Ks, and at sampled pieces the float
    period (an independent Galerkin-Newton at the piece's centre parameter, K = 16) lies inside the enclosure.
  * collect() re-derives every gluing inequality in Arb from the stored exact data; all hold, the pieces cover one
    interval starting at or below 0.0275.
Negative controls
  * A centre computed at a wrong G_Ks (the centre of the piece shifted by four piece widths) must fail on the piece.
  * Dropping the parameter-width contribution (assemble(..., _mutate=("drop_g_width",))) is detected: an independent
    float estimate of ||A_fin F(xbar; g)|| (finite part, 8 times more DFT nodes, float A_fin) at the piece endpoints
    exceeds the mutated Y0, while staying below the certified Y0 (it is a lower estimate of a part of it).
  * The g-width term delta * B1g of Z1: an independent float computation of the finite block of A d_gDF (float
    Galerkin matrices with 8 times more DFT nodes, d_g G = G(g = 1) - G(g = 0) exactly because f is affine in g, float
    A_fin) is dominated block by block by the rigorous finite block, which in turn is at most B1g, and the float value
    is at least half the rigorous weighted norm (so a B1g that is too small, or zero, fails). The mutation drop_B1g
    (only delta * B1g omitted) changes Z1.
  * Widening the piece threefold about its centre (same centre, weights and r_*, cover rebuilt over the wider range)
    must fail; the piece itself passes with the same inputs (control). At 2x the proof passes legitimately (the run
    targets Y0 / cap of about 0.4), so 2x would not be a control.
  * A piece whose g range or centre is not covered by the Hessian cover is refused.
  * Piece order: a record whose pieces are not strictly increasing in both endpoints, or with r_lo = r_hi, is refused
    (needed by the non-consecutive overlap argument, branch.py section 5); gluing pieces with different rho0 is refused.
  * Gluing: replacing piece b's uniqueness radius by its existence radius, or gluing two pieces far apart, fails.
Stability and resume
  * Every piece carries a stability statement (pointwise at checked points, else none; never uniform); every
    point marked on the branch passed the ball-inclusion check, and the check fails for a shrunk uniqueness radius,
    for a point at another g, for another point's centre forced into the piece, and for a centre with a wrong digest.
  * Log validation: a truncated final line is dropped, a group's orphan pieces are moved out, a corrupted middle line,
    a tampered radius (gluing re-derived) and a centre digest mismatch are refused.
  * The uniform stability attempt is recorded and fails, as documented.
"""
import json
import os
import random
import sys
import time
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# Pin BLAS to one thread BEFORE numpy loads, as branch.py does: A_fin is a float inverse (untrusted, section 8), and a
# multithreaded LAPACK changes its last bits, which changes the (equally rigorous) bounds in their last bits too. The
# acceptance test compares exact hex bounds with the run's, so it must use the run's single-threaded float inverse.
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_v, "1")

import numpy as np  # noqa: E402
from flint import acb, arb, fmpq  # noqa: E402

import branch as br  # noqa: E402
from branch import DIM, IV, ProofFailure  # noqa: E402
import arbmodel as am  # noqa: E402
import centre as ct  # noqa: E402
import fourier_eval as fe  # noqa: E402

QUIET = lambda *a, **k: None  # noqa: E731
K_RUN = 12
_CACHE = {}


def _run_data():
    if "run" not in _CACHE:
        recs = br._read_jsonl(br.RUN_LOG.format(K=K_RUN))
        cen = {r["g"]: r for r in br._read_jsonl(br.CENTRES.format(K=K_RUN))}
        pieces = sorted([r for r in recs if r["type"] == "piece"], key=lambda r: Fraction(r["rec"]["g_lo"]))
        groups = {r["group"]: r for r in recs if r["type"] == "group"}
        _CACHE["run"] = (pieces, groups, cen, recs)
    return _CACHE["run"]


def _record():
    with open(os.path.join(br.RESULTS, "fourier-branch-gks.json")) as fh:
        return json.load(fh)


def _piece_inputs(p):
    """Centre, weights, r_*, and a Hessian cover rebuilt from the stored group (or extra-piece) record."""
    pieces, groups, cen, _ = _run_data()
    rec = p["rec"]
    om, A = br.centre_from_record(cen[br._dstr(Fraction(rec["centre_g"]))])
    grp = groups[p["group"]]
    return om, A, rec, grp


def _cover_for(om, A, g_lo, g_hi, grp):
    return br.HessBound([(om, A)], g_lo, g_hi, grp["R"], "1", None, log=QUIET)


def _first_piece():
    pieces, _, _, _ = _run_data()
    for p in pieces:
        if Fraction(p["rec"]["g_lo"]) <= Fraction(br.G_STAGE_E) <= Fraction(p["rec"]["g_hi"]):
            return p
    raise AssertionError("no piece contains 0.0275")


# ------------------------------------------------------------------------------------------------ infrastructure
def _orbit_point(seed=0):
    om, a = br.stage_e_seed(16)
    Z = ct.phi_samples(a, 16)
    return [acb(float(v)) for v in Z[:, seed % 16]]


def test_hessian_matches_jacobian_differences():
    z = _orbit_point(3)
    prm = br.params_for("0.0276", "0.0276", 256)
    F, H = br.f_and_hess(z, prm, 256)
    worst = 0.0
    with fe.precision(256):
        h = arb(2) ** -70
        for l in range(DIM):
            zp, zm = list(z), list(z)
            zp[l] += h
            zm[l] -= h
            Jp = am.f_and_df(zp, prm, prec=256)[1]
            Jm = am.f_and_df(zm, prm, prec=256)[1]
            for k in range(DIM):
                for j in range(DIM):
                    fd = (Jp[k, j] - Jm[k, j]) / (2 * h)
                    hv = H[k].get((min(j, l), max(j, l)), acb(0))
                    d = abs(float((fd - hv).real.mid()))
                    worst = max(worst, d / (abs(float(fd.real.mid())) + 1e-30))
        Fp = am.f(z, prm, prec=256)
        dF = max(abs(float((F[k] - Fp[k]).real.mid())) for k in range(DIM))
    assert worst < 1e-30, worst
    assert dF < 1e-60, dF


def test_parameter_derivatives():
    z = _orbit_point(5)
    g0 = Fraction("0.02765")
    prm = br.params_for(g0, g0, 256)
    D = br.dgJ_flat(z, prm, 256)
    d = br.dg_flat(z, prm, 256)
    P = am.f_and_df(z, prm, prec=256, wrt=("g_Ks",))[2]
    for i in range(DIM):
        assert abs(float((d[i] - P[i, 0]).real.mid())) <= 1e-60 * (1 + abs(float(P[i, 0].real.mid())))
    h = Fraction(1, 10 ** 15)
    with fe.precision(256):
        Jp = am.f_and_df(z, br.params_for(g0 + h, g0 + h, 256), prec=256)[1]
        Jm = am.f_and_df(z, br.params_for(g0 - h, g0 - h, 256), prec=256)[1]
        hb = arb(fmpq(1, 10 ** 15))
        for k in range(DIM):
            for j in range(DIM):
                fd = (Jp[k, j] - Jm[k, j]) / (2 * hb)
                assert abs(float((fd - D[DIM * k + j]).real.mid())) < 1e-20 * (1 + abs(float(fd.real.mid())))
    # g_Ks enters only the V row (structure used by piece_blocks' row restriction, checked there too)
    assert all(D[DIM * k + j].is_zero() for k in range(1, DIM) for j in range(DIM))


def test_hess_box_encloses_points():
    rng = random.Random(7)
    z0 = _orbit_point(9)
    rad = 1e-3
    box = [acb(arb(float(v.real.mid()), rad), arb(0, rad)) for v in z0]
    prm = br.params_for("0.0275", "0.0277", 53)
    Fb, Hb = br.f_and_hess(box, prm, 53)
    for _ in range(5):
        zp = [acb(float(v.real.mid()) + rng.uniform(-rad, rad), rng.uniform(-rad, rad)) for v in z0]
        g = Fraction(rng.randint(27500, 27700), 10 ** 6)
        Fp, Hp = br.f_and_hess(zp, br.params_for(g, g, 128), 128)
        for k in range(DIM):
            assert Fb[k].contains(Fp[k])
            for key, v in Hp[k].items():
                assert Hb[k].get(key, acb(0)).contains(v), (k, key)


def test_hess_pow_negative():
    x0 = acb(fmpq(3, 7))
    for n in (-1, -2, -3, 2, 3):
        x = br.Hess(x0, {0: acb(1)})
        y = x ** n
        with fe.precision(128):
            v, d1, d2 = x0 ** n, n * x0 ** (n - 1), n * (n - 1) * x0 ** (n - 2)
        assert y.v.overlaps(v) and y.g[0].overlaps(d1) and y.h[(0, 0)].overlaps(d2), n
        assert abs(float((y.h[(0, 0)] - d2).real.mid())) <= 1e-12 * abs(float(d2.real.mid())), n
    # a chain: (2 x + 1)^-2, Hessian 24 (2 x + 1)^-4 (in x)
    x = br.Hess(x0, {0: acb(1)})
    y = (2 * x + 1) ** -2
    exact = 24 * (2 * x0 + 1) ** -4
    assert abs(float((y.h[(0, 0)] - exact).real.mid())) <= 1e-12 * abs(float(exact.real.mid()))


def test_decimal_strings():
    for t in ["0.0275", "0.027500000001", "0.0000005", "27.5", "0.1234567890125"]:
        assert Fraction(br._dstr(Fraction(t))) == Fraction(t)
    try:
        br._dstr(Fraction(1, 3))
    except ValueError:
        pass
    else:
        raise AssertionError("1/3 accepted as a decimal")


# ------------------------------------------------------------------------------------------------ acceptance
def _group_cover(p):
    """The group's Hessian cover rebuilt as run() built it: the group's centres in g_lo order, the group's g range."""
    pieces, groups, cen, _ = _run_data()
    grp = groups[p["group"]]
    mine = sorted([q for q in pieces if q["group"] == p["group"] and q.get("hess_record") is None],
                  key=lambda q: Fraction(q["rec"]["g_lo"]))
    cs = [br.centre_from_record(cen[br._dstr(Fraction(q["rec"]["centre_g"]))]) for q in mine]
    hb = br.HessBound(cs, grp["g_lo"], grp["g_hi"], grp["R"], "1", None, log=QUIET)
    assert hb.digest == grp["hess"]["phi_digest"], "rebuilt group cover differs from the logged one"
    return hb


def test_acceptance_piece_containing_stage_E_point():
    p = _first_piece()
    om, A, rec, grp = _piece_inputs(p)
    hb = _group_cover(p)
    res = br.prove_piece(om, A, rec["g_lo"], rec["g_hi"], eta=rec["eta"], r_star=grp["r_star"], hess=hb, log=QUIET)
    for key in ("Y0", "Z1", "Z2", "r_existence", "r_uniqueness"):
        assert res[key]["hex"] == rec[key]["hex"], key                 # the same rigorous bound, bit for bit
    lo_, hi_ = Fraction(res["T_ms"]["lower"]["dec"]), Fraction(res["T_ms"]["upper"]["dec"])
    with open(os.path.join(br.RESULTS, "fourier-existence-N1.json")) as fh:
        se = json.load(fh)
    A_, B_ = Fraction(se["T_ms"]["lower"]["dec"]), Fraction(se["T_ms"]["upper"]["dec"])
    assert lo_ <= B_ and A_ <= hi_, "no overlap with Stage E"
    assert lo_ <= A_ and B_ <= hi_                                     # Stage E's point enclosure lies inside
    with open(os.path.join(br.RESULTS, "cell-gks0.0275.json")) as fh:
        pe = json.load(fh)["verifier"]["period_exact"]
    C_, D_ = Fraction(float.fromhex(pe[0])), Fraction(float.fromhex(pe[1]))
    assert lo_ <= D_ and C_ <= hi_, "no overlap with the CAPD record"


def test_period_enclosures_consistent():
    out = _record()
    rows = out["pieces"]
    for a, b in zip(rows, rows[1:]):
        alo, ahi = Fraction(a["T_ms"][0]), Fraction(a["T_ms"][1])
        blo, bhi = Fraction(b["T_ms"][0]), Fraction(b["T_ms"][1])
        assert blo <= ahi and alo <= bhi, (a["g"], b["g"])             # overlapping g: enclosures must meet
        assert (blo + bhi) / 2 < (alo + ahi) / 2, "period midpoints not decreasing"
    # float periods at sampled pieces (independent Galerkin-Newton, K = 16, Fourier phase)
    idx = sorted(set([0, len(rows) // 3, 2 * len(rows) // 3, len(rows) - 1]))
    trk = br.FloatTrack(16)
    for i in idx:
        g = Fraction(rows[i]["g_centre"])
        trk.at(g)
        T = 2 * np.pi / trk.om
        assert Fraction(rows[i]["T_ms"][0]) <= Fraction(T) <= Fraction(rows[i]["T_ms"][1]), (rows[i]["g"], T)


def test_gluing_rederived():
    out = br.collect(K=K_RUN, write=False, log=QUIET)
    assert out["n_pieces"] == out["connected_pieces"], "a gluing inequality failed"
    assert all(g["glued"] for g in out["gluing"])
    assert Fraction(out["g_covered"][0]) <= Fraction(br.G_STAGE_E)
    rec = _record()
    assert rec["g_covered"] == out["g_covered"]
    assert rec["status"] == "computed; awaiting adversarial review"


# ------------------------------------------------------------------------------------------------ negative controls
def test_negative_centre_at_wrong_g():
    p = _first_piece()
    om, A, rec, grp = _piece_inputs(p)
    w = Fraction(rec["g_hi"]) - Fraction(rec["g_lo"])
    trk = br.FloatTrack(K_RUN)
    omw, Aw = trk.at(Fraction(rec["centre_g"]) + 4 * w)
    hb = br.HessBound([(om, A), (omw, Aw)], rec["g_lo"], rec["g_hi"], grp["R"], "1", None, log=QUIET)
    try:
        br.prove_piece(omw, Aw, rec["g_lo"], rec["g_hi"], eta=rec["eta"], r_star=grp["r_star"], hess=hb, log=QUIET)
    except ProofFailure:
        return
    raise AssertionError("a centre computed at a wrong G_Ks passed")


def test_negative_drop_parameter_width_detected():
    p = _first_piece()
    om, A, rec, grp = _piece_inputs(p)
    hb = _cover_for(om, A, rec["g_lo"], rec["g_hi"], grp)
    bl = br.piece_blocks(om, A, rec["g_lo"], rec["g_hi"], log=QUIET)
    good = br.assemble(bl, rec["eta"], grp["r_star"], hb, log=QUIET)
    bad = br.assemble(bl, rec["eta"], grp["r_star"], hb, log=QUIET, _mutate=("drop_g_width",))
    Y0_bad, Y0_good = float(Fraction(bad["Y0"]["dec"])), float(Fraction(good["Y0"]["dec"]))
    # independent float estimate at the endpoints
    K = rec["K"]
    lay = ct.Layout(K)
    a = br.centre_float(A)
    omf = float(om)
    gc = float(Fraction(rec["centre_g"]))
    Mc = 8 * (4 * K + 64)
    G, _ = br.galerkin_f(omf, a, gc, Mc)
    Ai = np.linalg.inv(G)
    eta = np.array([float(Fraction(e)) for e in rec["eta"]])
    w, comp, _ = br._weights_f(lay)
    est = []
    for gend in (rec["g_lo"], rec["g_hi"]):
        R = br.residual_f(omf, a, float(Fraction(gend)), Mc)
        v = Ai @ R
        norms = [abs(v[0]) / eta[0]] + [float(np.sum(np.abs(v[comp == c + 1]) * w[comp == c + 1])) / eta[c + 1]
                                        for c in range(DIM)]
        est.append(max(norms))
    assert min(est) > 10 * Y0_bad, (est, Y0_bad)        # the mutation is detected
    assert max(est) <= Y0_good * 1.0001, (est, Y0_good)  # and the true bound is consistent with the estimate


def _bfloat(M):
    return np.array([[float(x) for x in row] for row in M])


def _wnorm(B, eta):
    return max(float((B[c] * eta).sum() / eta[c]) for c in range(DIM + 1))


def test_B1g_term_detected():
    p = _first_piece()
    om, A, rec, grp = _piece_inputs(p)
    hb = _cover_for(om, A, rec["g_lo"], rec["g_hi"], grp)
    bl = br.piece_blocks(om, A, rec["g_lo"], rec["g_hi"], log=QUIET)
    eta = np.array([float(Fraction(e)) for e in rec["eta"]])
    # independent float finite block of A d_gDF
    K = rec["K"]
    lay = ct.Layout(K)
    a = br.centre_float(A)
    omf = float(om)
    Mc = 8 * (4 * K + 64)
    Gc, _ = br.galerkin_f(omf, a, float(Fraction(rec["centre_g"])), Mc)
    G1, _ = br.galerkin_f(omf, a, 1.0, Mc)
    G0, _ = br.galerkin_f(omf, a, 0.0, Mc)
    Bf = br.blocks_f(lay, np.linalg.inv(Gc) @ (G1 - G0))
    Bff, Bg = _bfloat(bl["B1g_ff"]), _bfloat(bl["B1g"])
    assert np.all(Bf <= Bff * (1 + 1e-6) + 1e-300), float(np.max(Bf - Bff))
    assert np.all(Bff <= Bg), "B1g is not at least its finite block"
    est, rig, full = _wnorm(Bf, eta), _wnorm(Bff, eta), _wnorm(Bg, eta)
    assert est <= full and est >= 0.5 * rig > 0, (est, rig, full)
    good = br.assemble(bl, rec["eta"], grp["r_star"], hb, log=QUIET)
    bad = br.assemble(bl, rec["eta"], grp["r_star"], hb, log=QUIET, _mutate=("drop_B1g",))
    assert Fraction(bad["Z1"]["dec"]) < Fraction(good["Z1"]["dec"]), "dropping delta * B1g does not change Z1"
    assert bad["Y0"]["hex"] == good["Y0"]["hex"]


def test_negative_widened_piece():
    pieces, groups, cen, _ = _run_data()
    p = pieces[-1]
    om, A, rec, grp = _piece_inputs(p)
    gc = Fraction(rec["centre_g"])
    hw = max(Fraction(rec["g_hi"]) - gc, gc - Fraction(rec["g_lo"]))
    lo1, hi1 = br._dstr(gc - hw), br._dstr(gc + hw)
    res = br.prove_piece(om, A, lo1, hi1, eta=rec["eta"], r_star=grp["r_star"],
                         hess=_cover_for(om, A, lo1, hi1, grp), log=QUIET)            # control: passes
    assert Fraction(res["r_existence"]["dec"]) > 0
    lo3, hi3 = br._dstr(gc - 3 * hw), br._dstr(gc + 3 * hw)
    try:
        br.prove_piece(om, A, lo3, hi3, eta=rec["eta"], r_star=grp["r_star"],
                       hess=_cover_for(om, A, lo3, hi3, grp), log=QUIET)
    except ProofFailure:
        return
    raise AssertionError("a piece widened threefold about its centre was proved")


def test_negative_piece_order():
    pieces, _, _, _ = _run_data()
    recs = [p["rec"] for p in pieces[:6]]
    assert br.check_piece_order(recs) == 0
    nested = recs[:2] + [dict(recs[2], g_hi=recs[1]["g_hi"])] + recs[3:]           # g_hi not increasing
    eq = recs[:1] + [dict(recs[1], r_uniqueness=recs[1]["r_existence"])] + recs[2:]
    for bad in (nested, eq):
        try:
            br.check_piece_order(bad)
        except RuntimeError:
            continue
        raise AssertionError("a bad piece order or r_lo = r_hi was accepted")
    # a monotone record with one non-consecutive overlap (piece 2 meets piece 0) is accepted and counted
    lo2 = br._dstr((Fraction(recs[1]["g_lo"]) + Fraction(recs[0]["g_hi"])) / 2)
    assert br.check_piece_order(recs[:2] + [dict(recs[2], g_lo=lo2)] + recs[3:]) == 1


def test_negative_cover_must_contain_piece():
    p = _first_piece()
    om, A, rec, grp = _piece_inputs(p)
    hb = _cover_for(om, A, rec["g_lo"], rec["centre_g"], grp)          # covers only half of the g range
    try:
        br.prove_piece(om, A, rec["g_lo"], rec["g_hi"], eta=rec["eta"], r_star=grp["r_star"], hess=hb, log=QUIET)
    except ProofFailure as e:
        assert "g range" in str(e)
    else:
        raise AssertionError("a cover not containing the g range was accepted")
    trk = br.FloatTrack(K_RUN)
    om2, A2 = trk.at(Fraction(rec["g_hi"]) + 50 * (Fraction(rec["g_hi"]) - Fraction(rec["g_lo"])))
    hb2 = _cover_for(om2, A2, rec["g_lo"], rec["g_hi"], grp)          # a cover around another centre
    try:
        br.prove_piece(om, A, rec["g_lo"], rec["g_hi"], eta=rec["eta"], r_star=grp["r_star"], hess=hb2, log=QUIET)
    except ProofFailure as e:
        assert "hull" in str(e)
    else:
        raise AssertionError("a cover around another centre was accepted")


def test_negative_gluing():
    pieces, _, cen, _ = _run_data()
    pa, pb = pieces[0]["rec"], pieces[1]["rec"]
    oa = br.obj_from_record(pa, cen[br._dstr(Fraction(pa["centre_g"]))])
    ob = br.obj_from_record(pb, cen[br._dstr(Fraction(pb["centre_g"]))])
    assert br.glue(dict(pa, _obj=oa), dict(pb, _obj=ob))["glued"]
    ob2 = dict(ob, r_hi=ob["r_lo"])
    assert not br.glue(dict(pa, _obj=oa), dict(pb, _obj=ob2))["glued"]
    pb_nu = dict(pb, settings=dict(pb["settings"], rho0="1/8"))                     # another nu: refused
    assert not br.glue(dict(pa, _obj=oa), dict(pb_nu, _obj=ob))["glued"]
    pz = pieces[-1]["rec"]
    oz = br.obj_from_record(pz, cen[br._dstr(Fraction(pz["centre_g"]))])
    assert not br.glue(dict(pa, _obj=oa), dict(pz, _obj=oz))["glued"]


def test_stability_points_recorded():
    rec = _record()
    pts = rec["stability"]
    assert pts, "no pointwise stability run recorded"
    assert all(p["uniform"] is False for p in pts)
    assert rec["stability_uniform"] is False
    for p in pts:
        if p["ok"]:
            assert float(p["multiplier_bound_full_period"]["approx"]) < 1
            assert float(p["delta"]["approx"]) > 0


def test_every_piece_has_a_stability_statement():
    rec = _record()
    for row in rec["pieces"]:
        st = row["stability"]
        assert st["uniform"] is False and st["kind"] in ("pointwise", "none") and st["statement"], row["g"]
        if st["kind"] == "pointwise":
            for g in st["certified_at"]:
                assert Fraction(row["g"][0]) <= Fraction(g) <= Fraction(row["g"][1])
    on = [p for p in rec["stability"] if p["on_certified_branch"]]
    assert on, "no stability point checked to lie on the branch"
    for p in on:
        assert p["ok"] and p["branch_membership_check"]["ok"]
        chk = p["branch_membership_check"]
        assert Fraction(chk["lhs"]["dec"]) <= Fraction(chk["r_uniqueness_piece"]["dec"])
    covered = {g for row in rec["pieces"] for g in row["stability"]["certified_at"]}
    assert covered == {p["g"] for p in on}


def _point_inputs(g):
    pts = {r["g"]: r for r in br._read_jsonl(br.POINTS_LOG.format(K=K_RUN)) if r["type"] == "point" and r.get("ok")}
    pc = {r["g"]: r for r in br._read_jsonl(br.POINT_CENTRES)}
    return pts[g], pc[g]


def test_point_membership_and_negative_controls():
    pieces, _, cen, _ = _run_data()
    pt, pc = _point_inputs("0.0275")
    q = _first_piece()["rec"]
    qc = cen[br._dstr(Fraction(q["centre_g"]))]
    assert br.point_on_branch(pt, pc, q, qc)["ok"]
    # negative: the uniqueness radius of the piece replaced by a tiny one
    q_bad = dict(q, r_uniqueness=dict(q["r_uniqueness"], hex="0x1p-80"))
    assert not br.point_on_branch(pt, pc, q_bad, qc)["ok"]
    # negative: the point's orbit at another g (0.02755) claimed for a piece containing 0.0275 (g check)
    pt2, pc2 = _point_inputs("0.02755")
    assert not br.point_on_branch(pt2, pc2, q, qc)["ok"]
    # negative: g forced into the piece, but the centre is that of 0.02755: the ball inclusion must fail
    pt3 = dict(pt2, g=q["centre_g"])
    assert not br.point_on_branch(pt3, pc2, q, qc)["ok"]
    # negative: a point centre that does not match its proof record is refused
    try:
        br.point_on_branch(pt, pc2, q, qc)
    except ValueError:
        pass
    else:
        raise AssertionError("a point centre with the wrong digest was accepted")


def test_log_validation_and_repair():
    import shutil
    import tempfile
    src_run, src_cen = br.RUN_LOG.format(K=K_RUN), br.CENTRES.format(K=K_RUN)
    old = (br.RUN_LOG, br.CENTRES)
    tmp = tempfile.mkdtemp()
    try:
        br.RUN_LOG, br.CENTRES = os.path.join(tmp, "run_K{K}.jsonl"), os.path.join(tmp, "centres_K{K}.jsonl")
        run, cen = br.RUN_LOG.format(K=K_RUN), br.CENTRES.format(K=K_RUN)
        lines = [l for l in open(src_run).read().split("\n") if l.strip()]
        gi = max(i for i, l in enumerate(lines[:40]) if json.loads(l)["type"] == "group")     # end of an early group
        keep = lines[:gi + 1]
        nxt = [l for l in lines[gi + 1:] if json.loads(l)["type"] == "piece"][:3]               # next group's pieces
        shutil.copy(src_cen, cen)
        # (1) a truncated final line is dropped, orphan pieces (no group record) are moved out, the rest validates
        with open(run, "w") as fh:
            fh.write("\n".join(keep + nxt) + "\n" + nxt[0][:57])
        pieces, groups, _ = br.validate_logs(K_RUN, log=QUIET, repair=True)
        assert len(groups) == sum(1 for l in keep if json.loads(l)["type"] == "group")
        assert len(pieces) == sum(1 for l in keep if json.loads(l)["type"] == "piece")
        assert os.path.exists(run + ".truncated")
        assert len(br._read_jsonl(run.replace(".jsonl", ".orphans.jsonl"))) == 3
        # (2) a bad line in the middle is refused (never silently dropped)
        with open(run, "w") as fh:
            fh.write("\n".join(keep[:3] + ["{broken"] + keep[3:]) + "\n")
        try:
            br.validate_logs(K_RUN, log=QUIET)
        except RuntimeError:
            pass
        else:
            raise AssertionError("a corrupted middle line was accepted")
        # (3) a tampered piece: radius of uniqueness shrunk below the existence radius (refused by the piece-order
        # check), and shrunk to just above the existence radius (breaks the re-derived gluing)
        recs = [json.loads(l) for l in keep]
        ip = [i for i, r in enumerate(recs) if r["type"] == "piece"][1]
        r_lo_hex = recs[ip]["rec"]["r_existence"]["hex"]
        with fe.precision(1024):
            just_above = ct.dyadic_to_text(ct.text_to_dyadic(r_lo_hex) + arb(2) ** -400)
        for tamper, expect in (("0x1p-80", "r_existence"), (just_above, "glue")):
            recs[ip]["rec"]["r_uniqueness"]["hex"] = tamper
            with open(run, "w") as fh:
                fh.write("".join(json.dumps(r) + "\n" for r in recs))
            try:
                br.validate_logs(K_RUN, log=QUIET)
            except RuntimeError as e:
                assert expect in str(e), (expect, str(e))
            else:
                raise AssertionError("a tampered radius passed the resume check")
        # (4) a centre that does not match its piece's digest is refused
        recs = [json.loads(l) for l in keep]
        recs[ip]["rec"]["centre_sha256"] = "0" * 64
        with open(run, "w") as fh:
            fh.write("".join(json.dumps(r) + "\n" for r in recs))
        try:
            br.validate_logs(K_RUN, log=QUIET)
        except RuntimeError as e:
            assert "digest" in str(e)
        else:
            raise AssertionError("a centre digest mismatch passed the resume check")
    finally:
        br.RUN_LOG, br.CENTRES = old
        shutil.rmtree(tmp, ignore_errors=True)


def test_uniform_attempt_recorded_and_fails():
    rec = _record()
    ua = rec["stability_uniform_attempt"]
    assert ua and all(not a["ok"] for a in ua), "a uniform attempt is recorded and (as documented) fails"


def test_snapshot_immutability():
    import hashlib
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "log.jsonl")
        raw = b'{"x":1}\n{"x":2}\n'
        with open(path, "wb") as f:
            f.write(raw)
        rows, digest = br.snapshot_jsonl(path)
        assert rows == [{"x": 1}, {"x": 2}] and digest == hashlib.sha256(raw).hexdigest()
        with open(path, "ab") as f:
            f.write(b'{"x":')
        broken = open(path, "rb").read()
        try:
            br.snapshot_jsonl(path)
        except RuntimeError:
            pass
        else:
            raise AssertionError("incomplete immutable log admitted")
        assert open(path, "rb").read() == broken


def test_final_requires_every_source_bound_piece():
    manifest, historical, centres = br.reproof_manifest(K_RUN)
    assert manifest["n_pieces"] == 712
    try:
        br.validate_final(K_RUN, records=[manifest], centre_records=centres)
    except RuntimeError as e:
        assert "incomplete" in str(e)
    else:
        raise AssertionError("empty final reproof admitted")
    tampered = dict(manifest, sources_sha256={})
    try:
        br.validate_final(K_RUN, records=[tampered], centre_records=centres)
    except RuntimeError as e:
        assert "manifest" in str(e)
    else:
        raise AssertionError("changed source manifest admitted")
    # Resume validation is strict before workers start; the original input hash and source hash are indispensable.
    assert br.record_digest(historical[0]) != br.record_digest(dict(historical[0], tampered=True))


QUICK_TESTS = [test_decimal_strings, test_hess_pow_negative, test_hessian_matches_jacobian_differences,
               test_parameter_derivatives, test_hess_box_encloses_points, test_snapshot_immutability,
               test_final_requires_every_source_bound_piece]

TESTS = [test_decimal_strings, test_hess_pow_negative, test_hessian_matches_jacobian_differences,
         test_parameter_derivatives, test_hess_box_encloses_points, test_acceptance_piece_containing_stage_E_point,
         test_period_enclosures_consistent, test_gluing_rederived, test_negative_centre_at_wrong_g,
         test_negative_drop_parameter_width_detected, test_B1g_term_detected, test_negative_widened_piece,
         test_negative_piece_order, test_negative_cover_must_contain_piece, test_negative_gluing,
         test_stability_points_recorded, test_every_piece_has_a_stability_statement,
         test_point_membership_and_negative_controls, test_log_validation_and_repair,
         test_uniform_attempt_recorded_and_fails]

if __name__ == "__main__":
    failed = 0
    selected = QUICK_TESTS if len(sys.argv) > 1 and sys.argv[1] == "quick" else TESTS + QUICK_TESTS[-2:]
    for t in selected:
        t0 = time.time()
        try:
            t()
            print(f"PASS {t.__name__} ({time.time() - t0:.1f} s)", flush=True)
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"FAIL {t.__name__}: {type(e).__name__}: {e}", flush=True)
    print(f"{len(selected) - failed}/{len(selected)} passed")
    sys.exit(1 if failed else 0)
