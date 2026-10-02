"""Acceptance tests and negative controls for alln.py (Stage E for every N >= 8 and the cable). Each test can fail.

Run (machine shared; about 15 minutes):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 3000 python3 test_alln.py      (or pytest)

They read the run data written by `alln.py --run` (fourier/data/alln/pieces.jsonl, failures.jsonl), the controls
written by `alln.py --controls` (controls.jsonl) and the record results/fourier-existence-alln.json written by
`alln.py --collect`, and recompute what they check.

Infrastructure
  * d_m from the series S(w)^2 overlaps arbmodel.damping at points and on intervals; the closed form and the series
    for S, S' agree on w > 1; ddamping(m, a, b) contains float derivatives sampled on [a, b] and meets the exact
    difference quotient (d_m(b) - d_m(a)) / (b - a) (mean value theorem); it excludes d'_m of a distant parameter.
  * Lemma T: for a real J0hat (the piece's), the bounds of tail_bounds_eps dominate |M^{-1}| and m |M^{-1}| for point
    matrices M = i omega_bar m - J0hat + d E at random m > K with d = d_m(eps), eps random in the piece (m <= m_max),
    and with ANY d >= 0 including 0 and 1e6 (m > m_max).
Acceptance
  * The pieces containing eps = 0 (the cable), 1/4096, 1/1024, 1/256 and 1/64 are re-proved from their stored centres,
    weights, r_* and radii: the Hessian cover's digest and Y0, Z1, Z2, r_existence, r_uniqueness and the T bounds equal
    the logged exact hex values; the centre is reproduced by the deterministic float Newton (same digest).
  * Stage E identification: for N = 8, 16, 32, 64 the per-N Stage E existence ball lies in the uniqueness ball of the
    piece containing 1/N^2 (re-derived in Arb) and the Stage E T enclosure lies inside the piece's.
  * collect() (no write) re-derives every gluing inequality and the piece order; the chain starts at 0, reaches
    1/64, and has no missing piece; consecutive T enclosures intersect, T decreases with eps along the chain, and
    float periods (an independent Galerkin-Newton, K = 16) at sampled piece centres lie in the enclosures.
  * Float cross-checks of the eps terms: the float finite block of A_fin diag(d'_m(e_c)) E is at most B1g and at least
    half of it; the float ||A_fin w(e_c)|| is at most Y0g and at least half of it (so a B1g or Y0g that is zero or too
    small fails).
Negative controls
  * Dropping the eps-derivative terms (drop_g_width) is detected (controls.jsonl, recomputed here on the piece
    containing 1/64): the float norm of A_fin F(xbar; eps) at an endpoint exceeds 10 times the mutated Y0, is 10 times
    the same norm at the centre parameter, and stays below the certified Y0.
  * A piece [0, w] widened beyond what closes fails (controls.jsonl; [0, 1] is re-run here).
  * Gluing a piece with a distant piece, or with r_uniqueness replaced by r_existence, fails; a Stage E centre of
    another N is not in the piece's uniqueness ball; a non-increasing piece order is refused; dd_m set to 0 (mutation
    no_dd) lowers Y0 and Z1.
  * Logs: a truncated final line is dropped (kept in .truncated); a corrupted middle line is refused; the plan with a
    failed piece replaces it by two overlapping halves, with strictly increasing endpoints.
"""
import json
import math
import os
import random
import shutil
import sys
import tempfile
import time
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_v, "1")

import numpy as np  # noqa: E402
from flint import acb, acb_mat, arb, ctx  # noqa: E402

import alln  # noqa: E402
import arbmodel as am  # noqa: E402
import branch as br  # noqa: E402
import centre as ct  # noqa: E402
import existence as ex  # noqa: E402
from alln import DIM, IV, ProofFailure  # noqa: E402

QUIET = lambda *a, **k: None  # noqa: E731
_CACHE = {}


def _lines():
    if "lines" not in _CACHE:
        L = alln._read_log(alln.PIECES_LOG, False)
        L.sort(key=lambda r: (Fraction(r["rec"]["eps_lo"]), Fraction(r["rec"]["eps_hi"])))
        _CACHE["lines"] = L
    return _CACHE["lines"]


def _record():
    with open(os.path.join(alln.RESULTS, "fourier-existence-alln.json")) as fh:
        return json.load(fh)


def _containing(e):
    e = Fraction(e)
    for r in _lines():
        if Fraction(r["rec"]["eps_lo"]) <= e <= Fraction(r["rec"]["eps_hi"]):
            return r
    raise AssertionError(f"no piece contains {e}")


def _reproved(e):
    key = ("reprove", str(Fraction(e)))
    if key not in _CACHE:
        _CACHE[key] = alln.reprove(_containing(e))
    return _CACHE[key]


# ------------------------------------------------------------------------------------------------ infrastructure
def test_damping_series():
    F = Fraction
    for m in (1, 2, 5, 8, 12, 17, 40):
        for a, b in ((0, 0), (F(1, 64), F(1, 64)), (0, F(1, 4096)), (F(63, 4096), F(1, 64)), (F(1, 300), F(1, 290))):
            ds = alln.damping_from_series(m, a, b, prec=128)
            da = am.damping(m, eps=(a, b) if a != b else a, prec=128).real
            assert ds.overlaps(da), (m, a, b)
            dd = alln.ddamping(m, a, b, prec=128)
            for e in np.linspace(float(a), float(b), 41):
                v = alln.dd_float(m, float(e))
                assert float(dd.lower()) - 1e-9 * (1 + abs(v)) <= v <= float(dd.upper()) + 1e-9 * (1 + abs(v)), \
                    (m, a, b, e, v, dd)
            if a != b:      # mean value theorem: the exact difference quotient meets the derivative enclosure
                q = (am.damping(m, eps=b, prec=256).real - am.damping(m, eps=a, prec=256).real) / am.to_ball(Fraction(b - a)).real
                assert q.overlaps(dd), (m, a, b, q, dd)
    for w in (arb(2), arb(30), arb("1.5") + arb(0, 0.01)):        # closed form and series agree for w > 1
        S1, dS1 = alln._S_dS(w)
        S2, dS2 = alln.sinc_sqrt_and_derivative(w)
        assert S1.overlaps(S2) and dS1.overlaps(dS2)
    far = alln.ddamping(12, F(1, 64), F(1, 64))              # d'_12(1/64) = -0.256 excludes d'_12(0) = -42.08
    assert not far.contains(arb(alln.dd_float(12, 0.0)))


def test_lemma_T():
    line = _containing(0)
    om, A = alln.centre_from_text(line["centre"])
    K = (len(A[0]) - 1) // 2
    a = np.array([[complex(float(A[i][m].real), float(A[i][m].imag)) for m in range(2 * K + 1)] for i in range(DIM)])
    J0 = ct.jacobian_coeffs(a, 4 * K + 64, 0)[0].real
    J0hat = acb_mat([[acb(float(J0[r, c])) for c in range(DIM)] for r in range(DIM)])
    Jp = {0: acb_mat(DIM, DIM)}
    st = dict(alln.DEFAULTS, n_explicit=0)
    lo_, hi_ = Fraction(line["rec"]["eps_lo"]), Fraction(line["rec"]["eps_hi"])
    with alln.fe.precision(64):
        tb = alln.tail_bounds_eps(K, K + 4, om, J0hat, Jp, lo_, hi_, st, log=QUIET)
    m_max = tb["m_max"]
    rng = random.Random(7)
    I = ex._identity(DIM)
    ctx_old = ctx.prec
    ctx.prec = 128
    try:
        cases = [(m, None) for m in rng.sample(range(K + 1, m_max + 1), 25)]
        cases += [(m, d) for m in rng.sample(range(m_max + 1, 5000), 15) for d in (0.0, 1e6, rng.uniform(0, 1e3))]
        for m, d in cases:
            if d is None:
                e = lo_ + (hi_ - lo_) * Fraction(rng.randint(0, 1000), 1000)
                db = am.damping(m, eps=e, prec=128)
            else:
                db = acb(d)
            M = I * acb(0, 1) * (om * m) - J0hat
            M[IV, IV] += db
            Ai = M.inv()
            for r in range(DIM):
                for c in range(DIM):
                    v = Ai[r, c].abs_upper()
                    assert v <= tb["Abar0"][r][c], (m, d, r, c)
                    assert v * m <= tb["Abar1"][r][c], (m, d, r, c)
    finally:
        ctx.prec = ctx_old


# ------------------------------------------------------------------------------------------------ acceptance
def test_reprove_bit_for_bit():
    seen = set()
    for e in ("0", "1/4096", "1/1024", "1/256", "1/64"):
        line = _containing(e)
        key = (line["rec"]["eps_lo"], line["rec"]["eps_hi"])
        if key in seen:
            continue
        seen.add(key)
        rec = line["rec"]
        rec2, digest, _ = _reproved(e)
        assert digest == rec["hessian_cover"], f"Hessian cover digest differs on {key}"
        for k in ("Y0", "Z1", "Z2", "r_existence", "r_uniqueness"):
            assert rec2[k]["hex"] == rec[k]["hex"], (key, k)
        for side in ("lower", "upper"):
            assert rec2["T_ms"][side]["hex"] == rec["T_ms"][side]["hex"], (key, side)
        om, A, _ = alln.float_centre(Fraction(rec["eps_c"]), rec["K"])
        assert br.centre_digest(om, A) == rec["centre_sha256"], f"centre not reproduced on {key}"


def test_stage_E_identification():
    rec = _record()
    got = {i["N"]: i for i in rec["stage_E_inclusion"]}
    for N in (8, 16, 32, 64):
        i = got[N]
        assert i["ok"] and i["T_overlaps"] and i["stage_E_T_inside"], i
        line = _containing(Fraction(1, N * N))
        j = alln.stage_e_inclusion(N, line["rec"], line["centre"])
        assert j["ok"] and j["T_overlaps"], j
    # negative: the N = 16 Stage E centre is not the wave of the piece containing 1/64
    line = _containing(Fraction(1, 64))
    op = alln.obj_of(line["rec"], line["centre"])
    _, _, om16, A16, _ = ct.load(ct.centre_path(16, 32))
    d = br.centre_distance(om16, A16, op["om_bar"], op["A"], op["ETA"], op["nu"])
    assert d > op["r_hi"], "a Stage E centre of another N lies in the piece's uniqueness ball"


def test_cover_gluing_and_periods():
    out = alln.collect(write=False, log=QUIET)
    assert out["complete_cover_of_0_to_1_64"] and not out["missing_plan_pieces"]
    assert out["eps_covered"][0] == "0" and Fraction(out["eps_covered"][1]) >= Fraction(1, 64)
    assert out["n_glued_chain"] == out["n_pieces"] and all(g["glued"] for g in out["gluing"])
    P = out["pieces"]
    for a, b in zip(P, P[1:]):
        al, ah = Fraction(a["T_ms"][0]), Fraction(a["T_ms"][1])
        bl_, bh = Fraction(b["T_ms"][0]), Fraction(b["T_ms"][1])
        assert al <= bh and bl_ <= ah, "consecutive T enclosures are disjoint"
    mids = [(Fraction(p["T_ms"][0]) + Fraction(p["T_ms"][1])) / 2 for p in P]
    assert all(x > y for x, y in zip(mids, mids[1:])), "T does not decrease with eps along the chain"
    om, a = alln.float_seed(16)
    for p in P[:: max(1, len(P) // 6)] + [P[-1]]:
        e = (Fraction(p["eps"][0]) + Fraction(p["eps"][1])) / 2
        om2, a2, nr = alln.newton_f(om, a, float(e), 4 * 16 + 64)
        T = 2 * math.pi / om2
        assert float(Fraction(p["T_ms"][0])) <= T <= float(Fraction(p["T_ms"][1])), (p["eps"], T, p["T_ms"])


def test_eps_terms_float_crosscheck():
    rec2, _, bl = _reproved("1/64")
    rec = _containing("1/64")["rec"]
    om, A = bl["om_bar"], bl["A"]
    K = (len(A[0]) - 1) // 2
    lay = ct.Layout(K)
    a = np.array([[complex(float(A[i][m].real), float(A[i][m].imag)) for m in range(2 * K + 1)] for i in range(DIM)])
    ec = float(Fraction(rec["eps_c"]))
    G, _ = alln.galerkin_f(float(om), a, ec, 8 * (4 * K + 64))
    Ai = np.linalg.inv(G)
    Dd = np.zeros(lay.n)
    for m in range(-K, K + 1):
        Dd[lay.idx(IV, m)] = alln.dd_float(m, ec)
    Bf = br.blocks_f(lay, Ai @ np.diag(Dd))
    Bg = np.array([[float(x) for x in row] for row in bl["B1g"]])
    assert np.all(Bf[:, 1 + IV] <= Bg[:, 1 + IV] * (1 + 1e-6)) and np.all(Bf[:, 1 + IV] >= 0.5 * Bg[:, 1 + IV]), \
        (Bf[:, 1 + IV], Bg[:, 1 + IV])
    w = np.zeros(lay.n, complex)
    for m in range(-K, K + 1):
        w[lay.idx(IV, m)] = alln.dd_float(m, ec) * a[IV, m + K]
    v = Ai @ w
    wts, comp, _ = br._weights_f(lay)
    est = [abs(v[0])] + [float(np.sum(np.abs(v[comp == c + 1]) * wts[comp == c + 1])) for c in range(DIM)]
    Y0g = [float(x) for x in bl["Y0g"]]
    for c in range(DIM + 1):
        assert est[c] <= Y0g[c] * (1 + 1e-6) + 1e-300 and est[c] >= 0.5 * Y0g[c], (c, est[c], Y0g[c])


# ------------------------------------------------------------------------------------------------ negative controls
def test_negative_drop_eps_derivative():
    C = [c for c in alln._read_log(alln.CONTROLS_LOG, False) if c["type"] == "control_drop_eps_derivative"]
    assert C and all(c["detected"] and c["correct_bound_holds"] for c in C), C
    line = _containing("1/64")
    rec = line["rec"]
    rec2, _, bl = _reproved("1/64")
    om, A = alln.centre_from_text(line["centre"])
    hb = br.HessBound([(om, A)], alln.G_KS, alln.G_KS, line["extras"]["R"], "1", None, log=QUIET)
    bad = alln.finish(bl, rec["eta"], line["extras"]["r_star_text"], hb, log=QUIET, _mutate=("drop_g_width",))
    ends = [alln.float_residual_norm(rec, line["centre"], e) for e in (rec["eps_lo"], rec["eps_hi"])]
    cen = alln.float_residual_norm(rec, line["centre"], rec["eps_c"])
    assert max(ends) > 10 * bad["Y0"]["approx"], (ends, bad["Y0"]["approx"])
    assert cen < max(ends) / 10, (cen, ends)
    assert max(ends) <= rec["Y0"]["approx"], (ends, rec["Y0"]["approx"])
    bl0 = alln.piece_blocks(om, A, Fraction(rec["eps_lo"]), Fraction(rec["eps_hi"]), log=QUIET, _mutate=("no_dd",))
    mut = alln.finish(bl0, rec["eta"], line["extras"]["r_star_text"], hb, log=QUIET)
    assert mut["Y0"]["approx"] < rec["Y0"]["approx"] and mut["Z1"]["approx"] < rec["Z1"]["approx"]


def test_negative_widened_piece():
    C = [c for c in alln._read_log(alln.CONTROLS_LOG, False) if c["type"] == "control_widened"]
    assert any(c["failed"] for c in C), C
    MHf = alln.float_hessian_estimate(12)
    w = Fraction(1)
    om, A, _ = alln.float_centre(w / 2, 12)
    try:
        alln.prove_piece(om, A, Fraction(0), w, MHf, log=QUIET)
    except ProofFailure:
        return
    raise AssertionError("the piece [0, 1] was proved")


def test_negative_gluing_and_order():
    L = _lines()
    a, b = L[0], L[1]
    assert alln.glue_eps(a["rec"], a["centre"], b["rec"], b["centre"])["glued"]
    rb = dict(b["rec"], r_uniqueness=b["rec"]["r_existence"])
    assert not alln.glue_eps(a["rec"], a["centre"], rb, b["centre"])["glued"]
    z = L[-1]
    assert not alln.glue_eps(a["rec"], a["centre"], z["rec"], z["centre"])["glued"]
    recs = [dict(g_lo=r["rec"]["eps_lo"], g_hi=r["rec"]["eps_hi"], label=r["rec"]["label"],
                 r_existence=r["rec"]["r_existence"], r_uniqueness=r["rec"]["r_uniqueness"]) for r in L[:5]]
    br.check_piece_order(recs)
    bad = recs[:2] + [dict(recs[2], g_hi=recs[1]["g_hi"])] + recs[3:]
    try:
        br.check_piece_order(bad)
    except RuntimeError:
        return
    raise AssertionError("a non-increasing piece order was accepted")


def test_log_tools():
    plan = alln.base_plan("1/4096", "1/8")
    assert plan[0][0] == 0 and plan[-1][1] >= Fraction(1, 64)
    assert all(a[0] < b[0] < a[1] < b[1] for a, b in zip(plan, plan[1:]))
    f = [dict(eps_lo=str(plan[3][0]), eps_hi=str(plan[3][1]))]
    p2 = alln.current_plan("1/4096", "1/8", f)
    assert plan[3] not in p2 and len(p2) == len(plan) + 1
    assert all(a[0] < b[0] < a[1] < b[1] for a, b in zip(p2, p2[1:]))
    d = tempfile.mkdtemp()
    try:
        path = os.path.join(d, "x.jsonl")
        with open(path, "w") as fh:
            fh.write(json.dumps({"a": 1}) + "\n" + json.dumps({"a": 2}) + "\n" + '{"a": 3, "tru')
        assert [r["a"] for r in alln._read_log(path, True)] == [1, 2] and os.path.exists(path + ".truncated")
        with open(path, "w") as fh:
            fh.write('{"a": 1}\n{"bro\n{"a": 3}\n')
        try:
            alln._read_log(path, True)
        except RuntimeError:
            pass
        else:
            raise AssertionError("a corrupted middle line was accepted")
    finally:
        shutil.rmtree(d)


TESTS = [test_damping_series, test_log_tools, test_lemma_T, test_reprove_bit_for_bit, test_stage_E_identification,
         test_cover_gluing_and_periods, test_eps_terms_float_crosscheck, test_negative_drop_eps_derivative,
         test_negative_gluing_and_order, test_negative_widened_piece]

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
