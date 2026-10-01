"""Acceptance tests and negative controls for branch.py (rec 2: the certified G_Ks branch). Each test can fail.

Run (machine shared; about 10 minutes):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 1800 python3 test_branch.py      (or pytest)

They read the run data written by `branch.py --run` (fourier/data/branch/run_K12.jsonl, centres_K12.jsonl) and the
record results/fourier-branch-gks.json written by `branch.py --collect`, and recompute what they check.

Infrastructure
  * Hess (second-order dual numbers): the Hessian of f agrees with central differences of the forward-mode Jacobian
    (arbmodel.f_and_df) at 256 bits; d(Df)/dg and df/dg agree with differences in g and with f_and_df(wrt=g_Ks); a
    box evaluation contains the point evaluations at random points of the box (enclosure property).
Acceptance
  * The piece containing G_Ks = 0.0275 is recomputed from its stored centre, weights and radii: it is proved again,
    with the same bounds, and its T enclosure overlaps Stage E's N = 1 enclosure (results/fourier-existence-N1.json)
    and the CAPD record (results/cell-gks0.0275.json).
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
  * A piece whose g range or centre is not covered by the Hessian cover is refused.
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
def test_acceptance_piece_containing_stage_E_point():
    p = _first_piece()
    om, A, rec, grp = _piece_inputs(p)
    hb = _cover_for(om, A, rec["g_lo"], rec["g_hi"], grp)
    res = br.prove_piece(om, A, rec["g_lo"], rec["g_hi"], eta=rec["eta"], r_star=grp["r_star"], hess=hb, log=QUIET)
    for key in ("Y0", "Z1"):
        assert res[key]["hex"] == rec[key]["hex"], key                 # the same rigorous bound, reproduced
    # Z2 depends on the cover (here rebuilt around this one centre: at most the group's value)
    assert Fraction(res["Z2"]["dec"]) <= Fraction(rec["Z2"]["dec"]) * Fraction(101, 100)
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
        pieces, groups, _ = br.validate_logs(K_RUN, log=QUIET)
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
        # (3) a tampered piece (radius of uniqueness shrunk) breaks the re-derived gluing
        recs = [json.loads(l) for l in keep]
        ip = [i for i, r in enumerate(recs) if r["type"] == "piece"][1]
        recs[ip]["rec"]["r_uniqueness"]["hex"] = "0x1p-80"
        with open(run, "w") as fh:
            fh.write("".join(json.dumps(r) + "\n" for r in recs))
        try:
            br.validate_logs(K_RUN, log=QUIET)
        except RuntimeError as e:
            assert "glue" in str(e)
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


TESTS = [test_decimal_strings, test_hessian_matches_jacobian_differences, test_parameter_derivatives,
         test_hess_box_encloses_points, test_acceptance_piece_containing_stage_E_point,
         test_period_enclosures_consistent, test_gluing_rederived, test_negative_centre_at_wrong_g,
         test_negative_drop_parameter_width_detected, test_negative_cover_must_contain_piece, test_negative_gluing,
         test_stability_points_recorded, test_every_piece_has_a_stability_statement,
         test_point_membership_and_negative_controls, test_log_validation_and_repair,
         test_uniform_attempt_recorded_and_fails]

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
