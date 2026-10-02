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
  * Tail (W1, W2 of the 2026-10-02 review): for every m in (K, m_max] at both endpoints of the cable piece, the point
    inverse A_m(eps) (256 bits) lies in one of the sub-enclosures and under Abar0, Abar1; |A_m(eps) J'_n| <= C_n for
    point inverses, m of both signs and n on both sides of n_explicit.
Negative controls
  * The mutation tail_at_centre (d_m(e_c) instead of its range over the piece) is detected by the per-m check.
  * B1g (W3): the float finite eps block at the endpoints is at most delta B1g and at least half of it; the drop_B1g
    mutation lowers each Z1 component by at least half the float contribution (detected row by row).
  * Dropping the eps-derivative terms (drop_g_width) is detected (controls.jsonl, recomputed here on the piece
    containing 1/64): the float norm of A_fin F(xbar; eps) at an endpoint exceeds 10 times the mutated Y0, is 10 times
    the same norm at the centre parameter, and stays below the certified Y0.
  * A piece [0, w] widened beyond what closes fails at the radii polynomial, not through an exception (controls.jsonl;
    [0, 1/16], the narrowest failing width recorded, is re-run here and its message names the eps range).
  * Gluing a piece with a distant piece, or with r_uniqueness replaced by r_existence, fails; the Stage E inclusion
    refuses an N with 1/N^2 outside the piece; with omega shifted to (1 + 1e-3) eta_om r_hi from the piece's centre it
    fails and with (1 - 1e-3) eta_om r_hi it passes (tests the weighting of the omega component); a
    non-increasing piece order is refused; dd_m set to 0 (mutation no_dd) lowers Y0 and Z1.
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
    # negatives: 1/N^2 outside the piece is refused; a Stage E centre with omega shifted by 1e-2 is not in the ball.
    # (The N = 16 centre DOES lie in the uniqueness ball of the piece containing 1/64; that is no contradiction,
    # uniqueness is about zeros of F(.; eps) at one eps, and the N = 16 wave is a zero at eps = 1/256 only.)
    line = _containing(Fraction(1, 64))
    assert not alln.stage_e_inclusion(16, line["rec"], line["centre"])["ok"]
    op = alln.obj_of(line["rec"], line["centre"])
    _, _, om8, A8, _ = ct.load(ct.centre_path(8, 32))
    with open(os.path.join(alln.RESULTS, "fourier-existence-N8.json")) as fh:
        rE = ct.text_to_dyadic(json.load(fh)["r_existence"]["hex"])
    conv = arb(0)
    for eb in op["ETA"]:
        conv = ex.amax(conv, ex.up(1 / eb))

    def lhs_with_shift(s_):
        d = br.centre_distance(om8 + s_, A8, op["om_bar"], op["A"], op["ETA"], op["nu"])
        return ex.up(d + rE * conv)
    old = ctx.prec
    ctx.prec = 256
    try:
        assert lhs_with_shift(arb(0)) <= op["r_hi"]
        diff = om8 - op["om_bar"]                                    # exact
        sgn = 1 if diff >= 0 else -1
        lim = op["ETA"][0] * op["r_hi"]                              # eta_om r_hi (exact)
        s_fail = (sgn * ((1 + arb("0.001")) * lim + abs(diff))).mid()
        s_pass = (sgn * ((1 - arb("0.001")) * lim - abs(diff))).mid()
        assert not lhs_with_shift(s_fail) <= op["r_hi"], "omega shift just above eta_om r_hi passed"
        assert lhs_with_shift(s_pass) <= op["r_hi"], "omega shift just below eta_om r_hi failed"
    finally:
        ctx.prec = old


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


def _piece_tail(e, mutate=()):
    """tail_bounds_eps on the piece containing e with the piece's own J0hat and J'_n (from its blocks), keeping the
    sub-enclosures for every m <= m_max."""
    key = ("tail", str(Fraction(e)), tuple(mutate))
    if key not in _CACHE:
        rec2, _, bl = _reproved(e)
        J, K, Kp = bl["J"], bl["K"], bl["Kp"]
        J0hat = acb_mat([[acb(J[0][r][c].real.mid()) for c in range(DIM)] for r in range(DIM)])
        Jp = {nn: acb_mat([[J[nn][r][c] - (J0hat[r, c] if nn == 0 else 0) for c in range(DIM)] for r in range(DIM)])
              for nn in range(-Kp, Kp + 1)}
        st = dict(alln.DEFAULTS)
        with alln.fe.precision(int(st["prec_mat"])):
            tb = alln.tail_bounds_eps(K, Kp, bl["om_bar"], J0hat, Jp, bl["e_lo"], bl["e_hi"], st, log=QUIET,
                                      _mutate=mutate, _keep_all=True)
        _CACHE[key] = (tb, J0hat, Jp, bl)
    return _CACHE[key]


def _point_inverse(om, J0hat, m, eps):
    I = ex._identity(DIM)
    M = I * acb(0, 1) * (om * m) - J0hat
    M[IV, IV] += am.damping(m, eps=Fraction(eps), prec=256)
    return M.inv()


def _violations(tb, J0hat, om, K, eps_list):
    """(m, eps) with the point inverse A_m(eps) outside every sub-enclosure, or |A_m| above Abar0 / m |A_m| above
    Abar1 somewhere, for every m in (K, m_max]."""
    bad = []
    for m in range(K + 1, tb["m_max"] + 1):
        for e in eps_list:
            Ai = _point_inverse(om, J0hat, m, e)
            inside = any(all(S[r, c].contains(Ai[r, c]) for r in range(DIM) for c in range(DIM))
                         for S in tb["A_explicit"][m])
            sup_ok = all(Ai[r, c].abs_upper() <= tb["Abar0"][r][c] and Ai[r, c].abs_upper() * m <= tb["Abar1"][r][c]
                         for r in range(DIM) for c in range(DIM))
            if not (inside and sup_ok):
                bad.append((m, str(e), inside, sup_ok))
    return bad


def test_tail_enclosures_and_mutation():
    """W1: at both endpoints of the cable piece, for EVERY m in (K, m_max], the point inverse A_m(eps) (256 bits) lies
    in one of the sub-enclosures and under the sups; with the mutation tail_at_centre (d_m(e_c) only) this fails."""
    old = ctx.prec
    ctx.prec = 256
    try:
        tb, J0hat, Jp, bl = _piece_tail("0")
        ends = [bl["e_lo"], bl["e_hi"]]
        assert _violations(tb, J0hat, bl["om_bar"], bl["K"], ends) == []
        tbm, _, _, _ = _piece_tail("0", mutate=("tail_at_centre",))
        badm = _violations(tbm, J0hat, bl["om_bar"], bl["K"], ends)
        assert len(badm) > 0, "the tail_at_centre mutation is not detected"
    finally:
        ctx.prec = old


def test_tail_products_C_n():
    """W2: |A_m(eps) J'_n| <= C_n entrywise for point inverses at both endpoints, m of both signs (A_{-m} = conj A_m),
    and n with |n| <= n_explicit and |n| > n_explicit, J'_n a POINT of its enclosure (midpoint and box corners). A ball
    J'_n is not used: Arb's complex box product inflates the radius beyond the disc bound |A| |J'_n| that C_n uses, so
    abs_upper of a ball product is not a value of |A_m J'_n| (first version of this test; e.g. m = n = 13 at eps = 0,
    where J'_13 is a pure-radius ball of about 1e-19).)"""
    old = ctx.prec
    ctx.prec = 256
    try:
        tb, J0hat, Jp, bl = _piece_tail("0")
        K, Kp = bl["K"], bl["Kp"]
        n_ex = int(alln.DEFAULTS["n_explicit"])
        ns = [0, 1, -1, 5, -7, n_ex, -n_ex, n_ex + 1, -(n_ex + 3), Kp, -Kp]
        ms = [K + 1, K + 2, 20, 57, 150, tb["m_max"], tb["m_max"] + 1, 3 * tb["m_max"]]
        for e in (bl["e_lo"], bl["e_hi"]):
            for m in ms:
                Am = _point_inverse(bl["om_bar"], J0hat, m, e)
                for sgn in (1, -1):
                    A_ = Am if sgn == 1 else Am.conjugate()
                    for nn in ns:
                        pts = []
                        for sr, si in ((0, 0), (1, 1), (-1, 1), (1, -1)):   # midpoint and corners of the J'_n boxes
                            pts.append(acb_mat([[acb(Jp[nn][r, c].real.mid() + sr * Jp[nn][r, c].real.rad(),
                                                     Jp[nn][r, c].imag.mid() + si * Jp[nn][r, c].imag.rad())
                                                 for c in range(DIM)] for r in range(DIM)]))
                        for Jx in pts:
                            P = A_ * Jx
                            for r in range(DIM):
                                for c in range(DIM):
                                    assert P[r, c].abs_upper() <= tb["C"][nn][r][c], (e, sgn * m, nn, r, c)
    finally:
        ctx.prec = old


def test_B1g_endpoints_and_drop_B1g():
    """W3: the finite block's eps contribution A_fin (J_fin(eps) - J_fin(e_c)) at both endpoints (float, Delta exact in
    float from d_m(eps) - d_m(e_c)) is at most delta B1g block by block and at least half of it at one endpoint; per
    output component, the drop_B1g mutation lowers Z1_c by at least half the float weighted contribution (so dropping
    delta B1g is detected row by row even though, at these piece widths, it moves Z1 only in the fifth digit and the
    radii polynomial would still close: what covers B1g is this blockwise cross-check)."""
    for e in ("0", "1/64"):
        line = _containing(e)
        rec = line["rec"]
        rec2, _, bl = _reproved(e)
        om, A = bl["om_bar"], bl["A"]
        K = (len(A[0]) - 1) // 2
        lay = ct.Layout(K)
        a = np.array([[complex(float(A[i][m].real), float(A[i][m].imag)) for m in range(2 * K + 1)] for i in range(DIM)])
        ec = float(Fraction(rec["eps_c"]))
        G, _ = alln.galerkin_f(float(om), a, ec, 8 * (4 * K + 64))
        Ai = np.linalg.inv(G)
        delta = float(Fraction(rec["eps_half_width"]))
        Bg = np.array([[float(x) for x in row] for row in bl["B1g"]]) * delta
        eta = np.array([float(Fraction(x)) for x in rec["eta"]])
        best = np.zeros(DIM + 1)
        for ee in (rec["eps_lo"], rec["eps_hi"]):
            Dl = np.zeros(lay.n)
            for m in range(-K, K + 1):
                Dl[lay.idx(IV, m)] = alln.d_float(m, float(Fraction(ee))) - alln.d_float(m, ec)
            Bf = br.blocks_f(lay, Ai @ np.diag(Dl))
            assert np.all(Bf <= Bg * (1 + 1e-6) + 1e-300), (ee, float(np.max(Bf - Bg)))
            best = np.maximum(best, Bf[:, 1 + IV])
        assert np.all(best >= 0.5 * Bg[:, 1 + IV]), (best, Bg[:, 1 + IV])
        hb = br.HessBound([(om, A)], alln.G_KS, alln.G_KS, line["extras"]["R"], "1", None, log=QUIET)
        mut = alln.finish(bl, rec["eta"], line["extras"]["r_star_text"], hb, log=QUIET, _mutate=("drop_B1g",))
        good, bad = rec["diag"]["Z1_by_comp"], mut["diag"]["Z1_by_comp"]
        for c in range(DIM + 1):
            contrib = eta[1 + IV] * best[c] / eta[c]
            assert good[c] - bad[c] >= 0.5 * contrib * (1 - 1e-9) - 1e-15, (e, c, good[c], bad[c], contrib)
        assert mut["Y0"]["hex"] == rec["Y0"]["hex"]


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
    assert all("radii polynomial not negative" in c["why"] for c in C if c["failed"]), "a widened piece failed otherwise"
    MHf = alln.float_hessian_estimate(12)
    w = Fraction(1, 16)                      # the narrowest recorded failing width (Z1 = 1.27, from the eps terms)
    om, A, _ = alln.float_centre(w / 2, 12)
    try:
        alln.prove_piece(om, A, Fraction(0), w, MHf, log=QUIET)
    except ProofFailure as e:
        assert "radii polynomial not negative" in str(e) and "eps in [0, 1/16]" in str(e), str(e)
        return
    raise AssertionError("the piece [0, 1/16] was proved")


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
         test_cover_gluing_and_periods, test_eps_terms_float_crosscheck, test_tail_enclosures_and_mutation,
         test_tail_products_C_n, test_B1g_endpoints_and_drop_B1g, test_negative_drop_eps_derivative,
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
