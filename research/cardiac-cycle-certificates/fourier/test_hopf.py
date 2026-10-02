"""Acceptance tests and negative controls for hopf.py (the Hopf gap). Each test can fail.

Run (machine shared; about 20 minutes, --fast about 8):
  PYTHONPATH=<python-flint 0.9.0> nice timeout 3000 python3 test_hopf.py [--fast]     (or pytest)

Infrastructure
  * Jet (truncated Taylor series): exp, log, sqrt, reciprocal, integer powers against closed-form Taylor
    coefficients; enclosure on a ball (random points of the input ball give coefficients inside the output balls).
  * field_jet: [t] = D f v (arbmodel.f_and_df), 2 [t^2] = D^2 f[v, v] (branch.Hess); field_jet_dual's [t].d = D^2 f[v, .];
    curve_point ('hess', 'dual_tau') against field_jet_dual and Hess at the same point.
  * lyap1 on the four systems with known l1 of papers/hh-dynamics (two planar, two coupled four-dimensional, both
    signs); the mutated routines ('sign': +2 in the middle term; 'no2iw': (-A)^-1) must miss the known value.
Theorem A
  * Lemma K refuses a polydisc that does not contain the equilibrium (centre shifted, radii kept).
  * At G_H: the 16 other Gershgorin discs lie in Re < 0, d Re lambda / dg < 0, l1 < 0 (and omega l1 near Erhardt's
    -2.6838). Negative controls: "l1 > 0" (the wrong sign assumed) is refused by the enclosure; the interval G_H shifted
    by 1e-9 to the right does not contain the crossing (Re lambda < 0 at its left end, so the left-side sign
    condition of the cover fails), and shifted to the left Re lambda > 0 at its right end.
Theorem B (needs the run data, fourier/data/hopf/)
  * Pieces 0 (fast mode) or 0, 13, 30 and the last one (full mode) are recomputed from their stored centres, weights
    and r_*, with their groups' covers rebuilt from the logged centres: the cover digests equal the logged ones, and
    Y0, Z1, Z2, r_existence, r_uniqueness equal the logged exact values (pieces 0 to 30 were made before the program
    logged its own hash, so this ties them to the current program text).
  * Negative controls on that piece: the parameter interval widened threefold about its centre must fail; dropping the
    curve terms (delta Y1, delta^2 Y2 / 2, delta Zc) changes Y0 and Z1; dropping the Cauchy (third-derivative) terms
    changes Z2; a centre computed at a wrong eps (shifted by the piece width) must fail; a piece outside its cover is
    refused.
  * Float cross-checks: an independent float estimate of ||A d^2/dxi^2 F|| and of ||A d/dxi DF|| (float Galerkin
    matrices, more nodes) lies below the rigorous Y2 and Zc and above a tenth of them.
  * Gluing: every consecutive pair of logged pieces re-glues in Arb; with r_hi replaced by r_lo, or with a piece glued
    to a non-adjacent one, the check fails.
Corollary B(a) (needs theoremA.json)
  * The identification at eps = 0 passes; negative controls: the default (not enlarged) equilibrium polydisc misses
    c*(0)'s enclosure; without the recorded polydiscs of the left intervals the identification is refused.
Lemma D and the gluing (Part C)
  * At least one G_Ks point proof is identified with the eps-branch. Negative controls: the same profile claimed at a
    G_Ks shifted by 1e-5, a point radius of 1/64, a point centre that does not match its digest, an eps-branch cut
    before the point's eps: all refused.
  * If a gluing point is recorded: it is re-derived (on the G_Ks branch by branch.point_on_branch, on the eps-branch by
    Lemma D); G_Ks pieces that do not contain its g are refused.
Sign and widening controls asked for in the brief: a sign-flipped l1 (the 'sign' mutation and "l1 > 0" refused), a
perturbed equilibrium (the shifted Lemma K polydisc), a widened eps range (the threefold piece) all fail.
"""
import json
import math
import os
import random
import sys
import time
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_v, "1")

import numpy as np  # noqa: E402
from flint import acb, acb_mat, arb, ctx  # noqa: E402

import arbmodel as am  # noqa: E402
import hopf as H  # noqa: E402

FAST = "--fast" in sys.argv
RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)
    return ok


# ------------------------------------------------------------------------------------------------ infrastructure
def test_jet_closed_forms():
    with am.precision(128):
        a, b = acb("0.7", "0.2"), acb("0.3", "-0.1")
        x = H.Jet([a, b, acb(0), acb(0), acb(0)])
        L = 5
        # exp(a + b t) = e^a sum (b t)^k / k!
        e = x.exp()
        ok = all((e.c[k] - a.exp() * b ** k / math.factorial(k)).abs_upper() < 1e-35 for k in range(L))
        # log(a + b t) = log a + sum (-1)^{k+1} (b/a)^k / k
        lg = x.log()
        ok &= (lg.c[0] - a.log()).abs_upper() < 1e-35
        ok &= all((lg.c[k] - (-1) ** (k + 1) * (b / a) ** k / k).abs_upper() < 1e-35 for k in range(1, L))
        # sqrt: binomial(1/2, k) a^{1/2 - k} b^k
        sq = x.sqrt()

        def binom_half(k):
            r = arb(1)
            for i in range(k):
                r = r * (arb(1) / 2 - i) / (i + 1)
            return r
        ok &= all((sq.c[k] - binom_half(k) * a.sqrt() / a ** k * b ** k).abs_upper() < 1e-35 for k in range(L))
        # 1/(a + b t) = sum (-b)^k / a^{k+1};  (a + b t)^3; (a + b t)^-2
        rc = x.recip()
        ok &= all((rc.c[k] - (-b) ** k / a ** (k + 1)).abs_upper() < 1e-35 for k in range(L))
        p3 = x ** 3
        ok &= all((p3.c[k] - math.comb(3, k) * a ** (3 - k) * b ** k).abs_upper() < 1e-35 for k in range(4))
        pm2 = x ** -2
        ok &= all((pm2.c[k] - (k + 1) * (-b) ** k / a ** (k + 2)).abs_upper() < 1e-33 for k in range(L))
    return check("Jet: exp, log, sqrt, reciprocal and integer powers match closed-form Taylor coefficients", ok)


def test_jet_enclosure():
    rng = random.Random(1)
    with am.precision(128):
        A0 = acb(arb("0.6", "0.05"), arb("0.1", "0.05"))
        B0 = acb(arb("0.2", "0.05"), arb("-0.3", "0.05"))
        J = H.Jet([A0, B0, acb(0), acb(0)])
        out = ((J.exp() + J * J.log()) / (J * J + 3) + 2).sqrt()
        ok = True
        for _ in range(20):
            a = acb(0.6 + rng.uniform(-0.05, 0.05), 0.1 + rng.uniform(-0.05, 0.05))
            b = acb(0.2 + rng.uniform(-0.05, 0.05), -0.3 + rng.uniform(-0.05, 0.05))
            Jp = H.Jet([a, b, acb(0), acb(0)])
            op = ((Jp.exp() + Jp * Jp.log()) / (Jp * Jp + 3) + 2).sqrt()
            ok &= all(out.c[k].contains(op.c[k]) for k in range(4))
    return check("Jet: a ball evaluation contains the point evaluations at random points of the ball", ok)


def _test_point():
    fh = H.FloatHopf()
    x = [acb(float(v)) for v in fh.x]
    v = [acb(float(np.real(z)), float(np.imag(z))) for z in fh.V[:, fh.ic]]
    return fh, x, v


def test_field_jet(fh, x, v):
    import branch as br
    with am.precision(192):
        prm = am.params(192, g_Ks=acb(fh.g))
        jt = H.field_jet(x, v, 3, acb(fh.g), 0, prec=192)
        F, J = am.f_and_df(x, prm, prec=192)
        Jv = J * H.colvec(v)
        ok1 = all(jt[k][1].overlaps(Jv[k, 0]) for k in range(H.DIM))
        Fh, Hh = br.f_and_hess(x, prm, prec=192)
        ok2 = True
        for k in range(H.DIM):
            s = acb(0)
            for (j, l), val in Hh[k].items():
                s += val * v[j] * v[l] * (1 if j == l else 2)
            ok2 &= (2 * jt[k][2]).overlaps(s)
        jd = H.field_jet_dual(x, v, 3, acb(fh.g), prec=192)
        ok3 = True
        for k in range(H.DIM):
            for jj in range(H.DIM):
                s = acb(0)
                for l in range(H.DIM):
                    key = (jj, l) if jj <= l else (l, jj)
                    s += Hh[k].get(key, acb(0)) * v[l]
                ok3 &= jd[k][1].d.get(jj, acb(0)).overlaps(s)
        # curve_point 'hess' at b(t) = x + t v, w(t) = v: [t^0].g = D f, [t^0].h[(j,19)] = D^2 f[e_j, v]
        hp = H.curve_point([[x[k], v[k]] for k in range(H.DIM)], [[v[k]] for k in range(H.DIM)],
                           [acb(fh.g)], 2, "hess", 192)
        ok4 = all(hp[k].c[0].g.get(j, acb(0)).overlaps(J[k, j]) for k in range(H.DIM) for j in range(H.DIM))
        ok4 &= all(hp[k].c[0].h.get((j, 19), acb(0)).overlaps(jd[k][1].d.get(j, acb(0)))
                   for k in range(H.DIM) for j in range(H.DIM))
        dt = H.curve_point([[x[k], v[k]] for k in range(H.DIM)], [[v[k]] for k in range(H.DIM)],
                           [acb(fh.g)], 3, "dual_tau", 192)
        ok5 = all(dt[k].c[0].d.get(19, acb(0)).overlaps(Jv[k, 0]) for k in range(H.DIM))
        ok5 &= all(dt[k].c[1].d.get(19, acb(0)).overlaps(
                   sum((jd[k][1].d.get(j, acb(0)) * v[j] for j in range(H.DIM)), acb(0))) for k in range(H.DIM))
    check("field_jet: [t] = D f v and 2 [t^2] = D^2 f[v, v] (f_and_df, Hess)", ok1 and ok2)
    check("field_jet_dual: [t].d = D^2 f[v, .] (Hess)", ok3)
    check("curve_point: 'hess' and 'dual_tau' coefficients agree with D f, D^2 f[., v]", ok4 and ok5)


# ---- lyap1 on systems with known l1 (papers/hh-dynamics, certify_equilibria_hopf.py C0)
def _R(p, q):
    return arb(p) / q


SQ2 = None


def _along(v, n):
    return [H.Jet([acb(0), v[j], acb(0), acb(0)]) for j in range(n)]


def _planar_case(om, P, Q):
    def poly(c, u, v):
        out = H.Jet([acb(0)] * 4)
        for (i, j), cc in c.items():
            out = out + (u ** i) * (v ** j) * cc
        return out

    def F(vec):
        u, v, x3, x4 = _along(vec, 4)
        res = [v * (-om) + poly(P, u, v), u * om + poly(Q, u, v), -x3, x4 * (-2)]
        return [r.c for r in res]
    A = acb_mat([[0, -om, 0, 0], [om, 0, 0, 0], [0, 0, -1, 0], [0, 0, 0, -2]])
    Puu, Puv, Pvv = 2 * P[(2, 0)], P[(1, 1)], 2 * P[(0, 2)]
    Quu, Quv, Qvv = 2 * Q[(2, 0)], Q[(1, 1)], 2 * Q[(0, 2)]
    known = (6 * P[(3, 0)] + 2 * P[(1, 2)] + 2 * Q[(2, 1)] + 6 * Q[(0, 3)]) / (8 * om) \
        + (Puv * (Puu + Pvv) - Quv * (Quu + Qvv) - Puu * Quu + Pvv * Qvv) / (8 * om ** 2)
    return A, F, known


def _coupled_case(om, sg, a, b_, c_, d, e, f):
    def F(vec):
        x1, x2, x3, x4 = _along(vec, 4)
        r2 = x1 * x1 + x2 * x2
        res = [x2 * (-om) + x1 * r2 * sg + x1 * x3 * c_ + x1 * x4 * f,
               x1 * om + x2 * r2 * sg + x2 * x3 * c_ - x2 * x4 * f,
               x3 * (-a) + r2 * b_, x4 * (-e) + (x1 * x1 - x2 * x2) * d]
        return [r.c for r in res]
    A = acb_mat([[0, -om, 0, 0], [om, 0, 0, 0], [0, 0, -a, 0], [0, 0, 0, -e]])
    known = 2 / om * (sg + b_ * c_ / a + d * e * f / (2 * (e ** 2 + 4 * om ** 2)))
    return A, F, known


def _pc(vals):
    keys = [(2, 0), (1, 1), (0, 2), (3, 0), (2, 1), (1, 2), (0, 3)]
    return {k: _R(*v) for k, v in zip(keys, vals)}


def test_lyap1():
    with am.precision(256):
        sq2 = arb(2).sqrt()
        Q0 = [acb(1) / sq2, acb(0, -1) / sq2, acb(0), acb(0)]
        W0 = [acb(1) / sq2, acb(0, 1) / sq2, acb(0), acb(0)]
        tests = [
            ("planar, omega = 1", arb(1),
             _planar_case(arb(1), _pc([(1, 2), (-1, 3), (1, 4), (-1, 5), (1, 7), (-1, 2), (1, 3)]),
                          _pc([(-1, 4), (1, 5), (2, 3), (1, 9), (-1, 6), (1, 11), (1, 8)]))),
            ("planar, omega = 3/2", _R(3, 2),
             _planar_case(_R(3, 2), _pc([(-2, 3), (1, 2), (1, 5), (1, 4), (-1, 3), (2, 7), (-1, 2)]),
                          _pc([(1, 3), (-1, 4), (-1, 2), (1, 5), (1, 6), (-1, 3), (-1, 7)]))),
            ("coupled, omega = 1", arb(1),
             _coupled_case(arb(1), _R(-1, 10), arb(2), _R(1, 3), _R(1, 2), _R(3, 2), _R(1, 2), arb(1))),
            ("coupled, omega = 3/2", _R(3, 2),
             _coupled_case(_R(3, 2), _R(-1, 5), arb(2), _R(1, 3), _R(1, 2), _R(3, 2), _R(1, 2), arb(1))),
        ]
        signs = set()
        for name, om, (A, F, known) in tests:
            val = H.lyap1(A, F, om, Q0, W0)
            diff = val - known
            signs.add(1 if known > 0 else (-1 if known < 0 else 0))
            check(f"lyap1 reproduces the known l1 of the {name} test system",
                  diff.contains(0) and diff.rad() < arb("1e-60") and (known > 0 or known < 0),
                  f"known {float(known.mid()):.12f}")
        check("the four test systems have l1 of both signs", signs == {1, -1})
        A, F, known = tests[2][2]
        for variant in ("sign", "no2iw"):
            val = H.lyap1(A, F, arb(1), Q0, W0, variant=variant)
            check(f"negative control: the mutated l1 routine ({variant}) misses the known l1",
                  not (val - known).contains(0), f"mutated {float(val.mid()):.6f}")


# ------------------------------------------------------------------------------------------------ Theorem A
def test_lemma_K_negative(fh):
    with am.precision(192):
        G = H._ball_interval("0.0279", "0.0279")
        xf = H.float_equilibrium(0.0279, fh.x)
        eq = H.equilibrium_on(G, xf)
        ok_pos = eq["kappa"] < 1
        # shift the centre by 100 radii in V, keep the radii: the test must fail
        prm = am.params(192, g_Ks=G)
        xt = [acb(float(v)) for v in xf]
        xt[0] = xt[0] + 100 * eq["r"][0]
        Fc, Jc = am.f_and_df(xt, prm, prec=192)
        X = [acb(xt[i].real + eq["r"][i] * arb(0, 1), eq["r"][i] * arb(0, 1)) for i in range(H.DIM)]
        _, JX = am.f_and_df(X, prm, prec=192)
        ok, kappa, worst = H.contraction_test(Fc, JX, eq["C"], eq["r"])
    check("Lemma K: the equilibrium polydisc at g = 0.0279 passes", ok_pos)
    check("negative control: Lemma K refuses a polydisc shifted off the equilibrium", not ok, f"worst {float(worst):.2e}")


def test_theorem_A_core(fh):
    """G_H from the record (or recomputed), spectrum, transversality, l1 and the controls."""
    path = os.path.join(H.DATA, "theoremA.json")
    if os.path.exists(path):
        with open(path) as fh_:
            rec = json.load(fh_)
        ga, gb = Fraction(rec["gH_interval"][0]), Fraction(rec["gH_interval"][1])
    else:
        gH = H.refine_gH(fh, log=lambda s: None)
        ga, gb = gH - Fraction(1, 10 ** 13), gH + Fraction(1, 10 ** 13)
    famH = H.jacobian_family(ga, gb, fh)
    spH = H.spectrum_on(famH)
    dl, p = H.dlambda_dg(famH, spH)
    cov = dict(famH=famH, spH=spH, p=p, gH_interval=[str(ga), str(gb)])
    L = H.lyapunov_at_hopf(cov)
    om = spH["lam"].imag
    check("Theorem A at G_H: the 16 other Gershgorin discs lie in Re < 0", spH["others_max_re"] < 0,
          f"right end {float(spH['others_max_re']):.4e}")
    check("Theorem A at G_H: d Re lambda / dg < 0", dl.real < 0, f"{float(dl.real.mid()):.6f}")
    check("Theorem A at G_H: l1 < 0", L["l1"] < 0, f"l1 {float(L['l1'].mid()):.6f}, omega l1 "
          f"{float((L['l1'] * om).mid()):.6f}")
    check("omega l1 agrees with Erhardt's -2.6838 to the printed digits",
          abs(float((L["l1"] * om).mid()) + 2.6838) < 1e-4)
    check("negative control: the wrong sign l1 > 0 is refused by the enclosure", not (L["l1"] > 0))
    # G_H shifted by 1e-9: no crossing inside
    sh = Fraction(1, 10 ** 9)
    lam_a = H.spectrum_on(H.jacobian_family(ga + sh, ga + sh, fh))["lam"]
    lam_b = H.spectrum_on(H.jacobian_family(gb - sh, gb - sh, fh))["lam"]
    check("negative control: G_H shifted right by 1e-9 fails the left-side sign (Re lambda < 0 at its left end)",
          lam_a.real < 0 and not (lam_a.real > 0))
    check("negative control: G_H shifted left by 1e-9 fails the right-side sign (Re lambda > 0 at its right end)",
          lam_b.real > 0 and not (lam_b.real < 0))
    return rec if os.path.exists(path) else None


# ------------------------------------------------------------------------------------------------ Theorem B
def _logs():
    pieces = [r for r in H._read_jsonl(os.path.join(H.DATA, "pieces.jsonl")) if r.get("type") == "piece"]
    covers = {r["id"]: r for r in H._read_jsonl(os.path.join(H.DATA, "covers.jsonl")) if r.get("type") == "cover"}
    return pieces, covers


def _rebuild_cover(crec):
    cs = [H.Centre.from_record(c) for c in crec["centres"]]
    pcs = [(C, Fraction(a), Fraction(b)) for C, (a, b, _) in zip(cs, crec["pieces"])]
    return H.EpsCover(pcs, crec["T"], [crec["R"]] * H.DIM, crec["G_R"], rho2=crec["rho2"], max_evals=1500,
                      log=lambda s: None)


def _recompute(p, covers):
    """Re-prove a logged piece from its stored centre, weights and r_* with its group's cover rebuilt from the logged
    centres (current program text); returns (cover digest ok, blocks, result, settings)."""
    crec = covers[p["cover"]]
    cov = _rebuild_cover(crec)
    C = H.Centre.from_record(p["centre"])
    st = dict(M=int(p["settings"]["M"]), nsub_xi=int(p["settings"]["nsub_xi"]),
              nsub_s=int(p["settings"]["nsub_s"]), rho0=p["settings"]["rho0"])
    bl = H.piece_blocks(C, Fraction(p["e_lo"]), Fraction(p["e_hi"]), cov, settings=st, log=lambda s: None)
    rs = str(H.hex_fraction(p["r_star"]))             # the exact r_* the run used (up of its decimal choice)
    res = H.assemble(bl, p["eta"], rs, log=lambda s: None)
    return cov.digest[:16] == p["cover"], bl, res, st, cov, C, rs


def test_piece_recompute_and_controls():
    pieces, covers = _logs()
    if not pieces:
        check("Theorem B data present", False, "no pieces logged")
        return
    # pieces made by the earlier runs (no code hash logged) and the last one: re-proved bit for bit by this program
    idxs = [0] if FAST else sorted({0, 13, 30, len(pieces) - 1} & set(range(len(pieces))))
    p0 = pieces[0]
    crec = covers[p0["cover"]]
    first = _recompute(p0, covers)
    _, bl, res, st, cov, C, rs = first
    a, b = Fraction(p0["e_lo"]), Fraction(p0["e_hi"])
    for i in idxs:
        p = pieces[i]
        dig_ok, _, res_i, _, _, _, _ = first if i == 0 else _recompute(p, covers)
        same = all(res_i[k]["hex"] == p["result"][k]["hex"] for k in ("Y0", "Z1", "Z2", "r_existence", "r_uniqueness"))
        check(f"piece {i} recomputed (cover digest reproduced: {dig_ok}): Y0, Z1, Z2, r_existence, r_uniqueness equal "
              f"the logged exact values", dig_ok and same)
    # mutations
    r1 = H.assemble(bl, p0["eta"], rs, log=lambda s: None, _mutate=("drop_curve",))
    check("mutation drop_curve changes Y0 and Z1 (the parameter-width terms are live)",
          r1["Y0"]["hex"] != res["Y0"]["hex"] and r1["Z1"]["hex"] != res["Z1"]["hex"])
    r2 = H.assemble(bl, p0["eta"], rs, log=lambda s: None, _mutate=("drop_cauchy",))
    check("mutation drop_cauchy changes Z2 (the third-derivative terms are live)", r2["Z2"]["hex"] != res["Z2"]["hex"])
    if FAST:
        return
    # widened threefold about the centre (same centre line, weights, r_*; cover rebuilt over the wider range)
    ec = (a + b) / 2
    w3a, w3b = max(Fraction(0), ec - 3 * (b - a) / 2), ec + 3 * (b - a) / 2
    try:
        cov3 = H.EpsCover([(C, w3a, w3b)], crec["T"], [crec["R"]] * H.DIM, crec["G_R"], rho2=crec["rho2"],
                          max_evals=1500, log=lambda s: None)
        bl3 = H.piece_blocks(C, w3a, w3b, cov3, settings=st, log=lambda s: None)
        H.assemble(bl3, p0["eta"], rs, log=lambda s: None)
        failed = False
    except H.ProofFailure:
        failed = True
    check("negative control: the piece widened threefold about its centre fails", failed)
    # a centre computed at a wrong eps (shifted by one piece width)
    fh = H.FloatHopf()
    FE = H.FloatEps(C.K)
    u = FE.initial(fh)
    e_wrong = float(b + (b - a) / 2)
    u, _ = FE.newton(u, e_wrong)
    Cw = FE.to_centre(u, FE.tangent(u, e_wrong))
    try:
        covw = H.EpsCover([(Cw, a, b)], crec["T"], [crec["R"]] * H.DIM, crec["G_R"], rho2=crec["rho2"],
                          max_evals=1500, log=lambda s: None)
        blw = H.piece_blocks(Cw, a, b, covw, settings=st, log=lambda s: None)
        H.assemble(blw, p0["eta"], rs, log=lambda s: None)
        failed = False
    except H.ProofFailure:
        failed = True
    check("negative control: a centre computed at a wrong eps (shifted by 1.5 piece widths) fails", failed)
    # a piece outside its cover
    try:
        H.piece_blocks(C, a, Fraction(crec["T"]) + 1, cov, settings=st, log=lambda s: None)
        refused = False
    except (H.ProofFailure, ValueError):
        refused = True
    check("a piece reaching beyond the cover's family is refused", refused)
    # float cross-check of Y2 and Zc (independent: float Galerkin matrices with 4x nodes)
    _float_crosscheck(C, a, b, bl, p0["eta"])


def _float_crosscheck(C, a, b, bl, eta):
    FE = H.FloatEps(C.K, Mc=192)
    u = FE.from_centre(C)
    tt = np.zeros_like(u)
    K = C.K
    tt[0], tt[1] = float(C.tom.mid()), float(C.tg.mid())
    tt[2:2 + H.DIM] = [float(v.mid()) for v in C.tc]
    for k in range(H.DIM):
        for t, m in enumerate(FE.ms):
            z = C.tw[k][K + m]
            tt[2 + H.DIM + 2 * K * k + t] = complex(float(z.real.mid()), float(z.imag.mid()))
    ec = float((a + b) / 2)
    G0 = FE.galerkin(u, ec)
    A = np.linalg.inv(G0)
    nu = math.exp(float(Fraction(bl["settings"]["rho0"])))
    lay = FE.lay
    E = np.array([float(Fraction(e)) for e in eta])
    wv = np.array([nu ** abs(m) for m in lay.mode])
    comp = np.array(lay.comp)

    def vnorm(v):
        out = np.zeros(H.NC)
        for i in range(lay.n):
            out[comp[i]] += abs(v[i]) * wv[i]
        return (out / E).max()

    def onorm(Bm):
        Bw = np.abs(Bm) * wv[:, None] / wv[None, :]
        out = np.zeros((H.NC, H.NC))
        for c in range(H.NC):
            cs = Bw[comp == c].sum(axis=0)
            for cp in range(H.NC):
                out[c, cp] = cs[comp == cp].max()
        return ((out @ E) / E).max()
    h = float(b - a) / 4
    Fp, F0, Fm = FE.residual(u + h * tt, ec + h), FE.residual(u, ec), FE.residual(u - h * tt, ec - h)
    y2f = vnorm(A @ ((Fp - 2 * F0 + Fm) / h ** 2))
    zcf = onorm(A @ ((FE.galerkin(u + h * tt, ec + h) - FE.galerkin(u - h * tt, ec - h)) / (2 * h)))
    y2r = float(H.amax_list([H.up(bl["Y2"][c] / H._arb_q(eta[c])) for c in range(H.NC)]))
    zcr = float(H.amax_list(H._rows_of(bl["Zc_ff"], bl["Zc_ft"], bl["TZ"], bl["TcZ"], bl["TgZ"],
                                       [H._arb_q(e) for e in eta])))
    check("float cross-check: rigorous Y2 >= float ||A d^2F/dxi^2|| >= Y2 / 30", y2r >= y2f >= y2r / 30,
          f"float {y2f:.3e}, rigorous {y2r:.3e}")
    check("float cross-check: rigorous Zc >= float ||A d DF/dxi|| >= Zc / 30", zcr >= zcf >= zcr / 30,
          f"float {zcf:.3e}, rigorous {zcr:.3e}")


def test_gluing_logged():
    pieces, _ = _logs()
    if len(pieces) < 3:
        check("gluing data present", False, f"{len(pieces)} pieces")
        return
    with am.precision(192):
        nu = H._arb_q(pieces[0]["settings"]["rho0"]).exp()
    states = [H._piece_state(r) for r in pieces]
    ok = True
    for i in range(1, len(states)):
        okg, _ = H.glue(states[i - 1], states[i], nu)
        ok &= okg
    check(f"all {len(states) - 1} consecutive gluings re-derived in Arb", ok)
    bad = dict(states[1])
    bad["r_hi"] = states[1]["r_lo"]
    okb, _ = H.glue(states[0], bad, nu)
    check("negative control: gluing with r_hi replaced by r_lo fails", not okb)
    okn, _ = H.glue(states[0], states[2], nu)
    check("negative control: gluing two non-adjacent pieces fails", not okn)


# ------------------------------------------------------------------------------------------------ Corollary B(a)
def test_identification():
    pieces, _ = _logs()
    pA = os.path.join(H.DATA, "theoremA.json")
    if not (pieces and os.path.exists(pA)):
        check("identification data present (pieces and theoremA.json)", False)
        return
    with open(pA) as fh_:
        thA = json.load(fh_)
    rec = H.identification_at_eps0(pieces[0], thA, log=lambda s: None)
    check("Corollary B(a): g*(0) in W, Theorem A intervals with recorded polydiscs cover it, c*(0) and those "
          "polydiscs lie in one Lemma K polydisc P", rec.get("ok") is True, f"kappa {rec.get('P_kappa')}")
    # negative control: P with its default radii (not enlarged to the sets it must contain) misses c*(0)
    st_ = H._piece_state(pieces[0])
    _, gB, cB, _, _ = H.ball_of_piece_at(st_, Fraction(0))
    ga, gb = Fraction(rec["g_interval"][0]), Fraction(rec["g_interval"][1])
    eq = H.equilibrium_on(H._ball_interval(ga, gb), H.float_equilibrium(float((ga + gb) / 2)))
    inside = all(bool((cB[i] - eq["xt"][i]).abs_upper() <= eq["r"][i]) for i in range(H.DIM))
    check("negative control: the default polydisc (radii not enlarged) does not contain c*(0)'s enclosure", not inside)
    # negative control: Theorem A's record without the polydiscs near G_H cannot identify
    thB = dict(thA, cover_left=[{k: v for k, v in iv.items() if k != "polydisc"} for iv in thA["cover_left"]])
    rec2 = H.identification_at_eps0(pieces[0], thB, log=lambda s: None)
    check("negative control: without the left intervals' polydiscs the identification is refused", rec2.get("ok") is False)


# ------------------------------------------------------------------------------------------------ Lemma D, gluing
def test_bridge():
    pieces, _ = _logs()
    states = [H._piece_state(r) for r in pieces]
    with am.precision(256):
        nu8 = H._arb_q(pieces[0]["settings"]["rho0"]).exp()
    pts, cents = H.gks_points()
    on = []
    for pt in pts:
        c = cents.get((pt["source"], pt["g"]))
        if c is None:
            continue
        d = H.point_in_eps_branch(pt["rec"], c, states, nu8)
        if d["ok"]:
            on.append((pt, c, d))
    check("Lemma D: at least one branch.py point proof is identified with the eps-branch", bool(on),
          f"g = {[p['g'] for p, _, _ in on]}")
    if not on:
        return
    pt, cent, d = on[-1]
    # negative control: the same profile claimed at a G_Ks shifted by 1e-5 is not the bridge orbit
    bad = dict(pt["rec"], g_lo=str(Fraction(pt["g"]) + Fraction(1, 10 ** 5)), g_hi=str(Fraction(pt["g"]) + Fraction(1, 10 ** 5)))
    d2 = H.point_in_eps_branch(bad, cent, states, nu8)
    check("negative control: Lemma D refuses the point's profile at G_Ks shifted by 1e-5", d2["ok"] is False)
    # negative control: a large point radius (1/64) is refused
    big = dict(pt["rec"], r_existence={"hex": "0x1p-6"})
    d3 = H.point_in_eps_branch(big, cent, states, nu8)
    check("negative control: Lemma D refuses a point radius of 1/64", d3["ok"] is False)
    # negative control: a corrupted centre fails the digest check
    cbad = json.loads(json.dumps(cent))
    cbad["a"][0][1][0] = "0x1p-3"
    try:
        H.point_in_eps_branch(pt["rec"], cbad, states, nu8)
        refused = False
    except ValueError:
        refused = True
    check("negative control: a point centre that does not match its digest is refused", refused)
    # negative control: an eps-branch truncated before the point's eps does not contain it
    cut = [s_ for s_ in states if s_["e_hi"] < Fraction(d["eps_enclosure"][0])]
    d4 = H.point_in_eps_branch(pt["rec"], cent, cut, nu8)
    check("negative control: Lemma D refuses when the eps-branch stops before the point's eps", d4["ok"] is False)
    # the gluing record, if any
    pg = os.path.join(H.DATA, "gluing_gks.json")
    if os.path.exists(pg):
        with open(pg) as fh_:
            gl = json.load(fh_)
        if gl.get("glue_points"):
            gp = gl["glue_points"][0]
            gs, src = gp["g"], gp["source"]
            ptg = next(p for p in pts if p["g"] == gs and p["source"] == src)
            cg = cents[(src, gs)]
            recs, centres, _ = H.gks_branch_snapshot(log=lambda s: None)
            ok = H.point_on_gks_branch(ptg, cg, recs, centres)["ok"]
            dg = H.point_in_eps_branch(ptg["rec"], cg, states, nu8)["ok"]
            check(f"gluing re-derived at g = {gs}: the point is on the G_Ks branch and on the eps-branch", ok and dg)
            far = [p_ for p_ in recs if Fraction(p_["g_hi"]) < Fraction(gs)][-3:]
            ok2 = H.point_on_gks_branch(ptg, cg, far, centres)["ok"]
            check("negative control: G_Ks pieces not containing the point's g are refused", ok2 is False)


def main():
    t0 = time.time()
    test_jet_closed_forms()
    test_jet_enclosure()
    fh, x, v = _test_point()
    test_field_jet(fh, x, v)
    test_lyap1()
    test_lemma_K_negative(fh)
    test_theorem_A_core(fh)
    test_piece_recompute_and_controls()
    test_gluing_logged()
    test_identification()
    test_bridge()
    n_fail = sum(1 for _, ok, _ in RESULTS if not ok)
    print(f"{len(RESULTS)} checks, {n_fail} failed, {time.time() - t0:.0f} s")
    return 1 if n_fail else 0


if __name__ == "__main__":
    sys.exit(main())
