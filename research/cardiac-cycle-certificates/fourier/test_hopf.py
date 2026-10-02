"""Acceptance tests and negative controls for hopf.py (the Hopf gap). Each test can fail.

Modes (run under nice with a timeout; the machine is shared):
  --fast                 quick mode: everything below except the re-proofs of pieces 13, 30, 40, 62 and the last
                         one, the piece-13 controls and the last piece's float checks (piece 0 is re-proved);
  (no flag)              full mode: re-proves pieces 0, 13, 30, 40, 62 and the last one (about 100 s each);
  --rerun-theorem-a      adds a rerun of hopf.theorem_A into a temporary directory (about 240 s) whose record must
                         equal fourier/data/hopf/theoremA.json in every field but the run time.
  PYTHONPATH=<python-flint 0.9.0> nice -n 10 timeout 2400 python3 test_hopf.py [--fast] [--rerun-theorem-a]
  The re-proof of ALL logged pieces is not a test: `python3 hopf.py --reprove-all --workers W` writes
  fourier/data/hopf/reprove.jsonl, and `hopf.py --collect` reports which pieces have a matching re-proof.

Infrastructure
  * Jet (truncated Taylor series): exp, log, sqrt, reciprocal, integer powers against closed-form Taylor
    coefficients; enclosure on a ball (random points of the input ball give coefficients inside the output balls).
  * field_jet: [t] = D f v (arbmodel.f_and_df), 2 [t^2] = D^2 f[v, v] (branch.Hess); field_jet_dual's [t].d = D^2 f[v, .];
    curve_point ('hess', 'dual_tau') against field_jet_dual and Hess at the same point.
  * lyap1 on the four systems with known l1 of papers/hh-dynamics (two planar, two coupled four-dimensional, both
    signs); the mutated routines ('sign': +2 in the middle term; 'no2iw': (-A)^-1) must miss the known value.
Theorem A
  * Lemma K refuses a polydisc that does not contain the equilibrium (centre shifted, radii kept).
  * At G_H: the 16 other Gershgorin discs lie in Re < 0, d Re lambda / dg < 0, l1 < 0 (and omega l1 agrees with
    Erhardt's -2.6838 to about four significant digits). The conjugate of the eigenvalue ball avoids every Gershgorin
    disc but D2 (the check added to spectrum_on for GAP 1 of the 2026-10-02 review); the same test with D1 exempted
    instead of D2 fails. Negative
    controls: "l1 > 0" (the wrong sign assumed) is refused by the enclosure; the interval G_H shifted by 1e-9 to the
    right does not contain the crossing (Re lambda < 0 at its left end, so the left-side sign condition of the cover
    fails), and shifted to the left Re lambda > 0 at its right end; dlambda_dg told that the critical disc is the
    conjugate's refuses the left eigenpair (it is identified with lambda only through D1).
  * The record theoremA.json was written by the current hopf.py (its code_sha256), and its cover passes
    hopf.check_theoremA_cover (adjacent intervals covering W with G_H between the sides, the recorded counts, the signs
    of Re lambda, others_max_re < 0 and equal to the recorded upper bound, transversality, l1 < 0); negative controls:
    a cover with one interval removed, with one sign flipped, or ending short of W is refused.
Theorem B (needs the run data, fourier/data/hopf/)
  * Pieces 0 (fast mode) or 0, 13, 30, 40, 62 and the last one (full mode) are re-proved by hopf.reprove_piece (the
    function of `hopf.py --reprove-all`) from their stored centres, weights and r_*, with their groups' covers rebuilt
    from the logged centres: the cover digests equal the logged ones, and Y0, Z1, Z2, the radii, p at the radii, the
    contraction factor and the g and omega enclosures equal the logged exact values (pieces 0 to 30 were made before
    the program logged its own hash, and the later runs logged hashes of earlier program texts; this ties a piece of
    each run, K = 8 and K = 12, to the current program text). The comparison refuses a log line whose Y0 differs in
    the last bit, and reprove_status counts a re-proof only for the current program hash and the current log line.
  * Negative controls: on piece 0, dropping the curve terms (delta Y1, delta^2 Y2 / 2, delta Zc) changes Y0 and Z1,
    dropping the Cauchy (third-derivative) terms changes Z2, and a piece reaching beyond its cover is refused; on piece
    13, a tight piece, the parameter interval widened threefold about its centre (cover rebuilt for it) must fail, and
    so must a centre line computed at a wrong eps (e_hi + (e_hi - e_lo)/2, one piece width above the midpoint), each
    with the message "radii polynomial not negative" (any other failure, such as a cover or domain error, fails the
    control). (On piece 0, which is far from tight, both are valid proofs; the controls were moved to piece 13 and
    the message check added on 2026-10-02.)
  * Float cross-checks (piece 0 in both modes, the last piece in full mode; float Galerkin matrices with 192 nodes,
    finite modes only): ||A d^2/dxi^2 F|| and ||A d/dxi DF|| lie below the rigorous Y2 and Zc and above a thirtieth of
    them; ||A d/dxi F|| at e_c (central difference along the tangent) lies below the rigorous Y1; and a lower estimate
    of Z2 (||A (DF(xbar + D) - DF(xbar))|| / r over random corner perturbations D of norm r = r_hi, then hill climbing)
    lies below the rigorous Z2. These are sanity checks, not proofs.
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
    Lemma D). Two controls on the G_Ks side: (a) the containment guard refuses the two pieces adjacent to the glue
    piece (they do not contain g); on those the ball inclusion alone would hold (found 2026-10-02), so the guard is
    needed; (b) with the guard bypassed (a copy of the piece record widened to contain g), the ball inclusion itself
    fails on the pieces three positions before and after the glue piece.
The record (results/fourier-hopf.json)
  * Every stored source and data SHA-256 equals the file on disk; the piece count, eps range and Theorem A enclosures
    are those of the logs; the status is the agreed one; the Theorem A cover checks are recorded as passed; the
    re-proof report equals hopf.reprove_status() now; a one-byte change in pieces.jsonl changes its hash.
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
RERUN_A = "--rerun-theorem-a" in sys.argv
STATUS = "computed; in-project adversarial review recorded, fixes applied, fix check pending"
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
    diff = abs(float((L["l1"] * om).mid()) + 2.6838)
    check("omega l1 agrees with Erhardt's -2.6838 to about four significant digits (difference below 1e-4)",
          diff < 1e-4, f"difference {diff:.2e}")
    check("negative control: the wrong sign l1 > 0 is refused by the enclosure", not (L["l1"] > 0))
    # GAP 1 (review 2026-10-02): the conjugate eigenvalue ball is disjoint from every Gershgorin disc but D2, so the
    # eigenvalue conj(lambda) (in some disc by Lemma G(a)) is the one in D2 (spectrum_on raises otherwise; re-evaluated
    # here). Negative control: the same test with D1 exempted instead of D2 fails, since conj(L) meets D2.
    lam = spH["lam"]
    lc = acb(lam.real.mid(), lam.imag.mid())
    lr = H.up((lam - lc).abs_upper())

    def avoids_all_but(j):
        return all(H._discs_disjoint((lc.conjugate(), lr), spH["discs"][i]) for i in range(H.DIM) if i != j)
    check("Theorem A at G_H: the conjugate of the eigenvalue ball avoids every Gershgorin disc but D2",
          avoids_all_but(spH["jc"]), f"inclusion in D2 (reported only): {spH['conj_ball_inside_D2']}")
    check("negative control: the conjugate of the eigenvalue ball does not avoid D2 (exempting D1 instead fails)",
          not avoids_all_but(spH["ic"]))
    # negative control: the left eigenpair must be identified with lambda through the Gershgorin disc D1; told that the
    # critical disc is D2 (the conjugate's), dlambda_dg must refuse (the left eigenvalue ball lies in D1)
    try:
        H.dlambda_dg(famH, dict(spH, ic=spH["jc"]))
        refused = False
    except H.ProofFailure:
        refused = True
    check("negative control: dlambda_dg refuses a left eigenvalue that is not in the critical disc", refused)
    # G_H shifted by 1e-9: no crossing inside
    sh = Fraction(1, 10 ** 9)
    lam_a = H.spectrum_on(H.jacobian_family(ga + sh, ga + sh, fh))["lam"]
    lam_b = H.spectrum_on(H.jacobian_family(gb - sh, gb - sh, fh))["lam"]
    check("negative control: G_H shifted right by 1e-9 fails the left-side sign (Re lambda < 0 at its left end)",
          lam_a.real < 0 and not (lam_a.real > 0))
    check("negative control: G_H shifted left by 1e-9 fails the right-side sign (Re lambda > 0 at its right end)",
          lam_b.real > 0 and not (lam_b.real < 0))
    return rec if os.path.exists(path) else None


def test_theorem_A_cover():
    """GAP 3 (review 2026-10-02): the structure of the recorded cover, and the record is the current program's."""
    import copy
    path = os.path.join(H.DATA, "theoremA.json")
    if not os.path.exists(path):
        check("theoremA.json present", False)
        return
    with open(path) as fh_:
        rec = json.load(fh_)
    check("theoremA.json was written by the current hopf.py (code_sha256)", rec.get("code_sha256") == H.CODE_SHA256,
          f"record {str(rec.get('code_sha256'))[:12]}, program {H.CODE_SHA256[:12]}")
    c = H.check_theoremA_cover(rec)
    check("Theorem A cover: adjacent intervals cover W with G_H between the sides, recorded counts, Re lambda > 0 left "
          "and < 0 right, others_max_re < 0 and equal to the recorded bound, transversality, l1 < 0, omega > 0",
          c["ok"], f"{c['n_left']} + 1 + {c['n_right']} intervals, {c['n_breaks']} breaks, max others_max_re "
          f"{c['others_max_re']:.6e}, G_H included: {c['others_include_gH']}")
    gap = copy.deepcopy(rec)
    gap["cover_left"].pop(len(gap["cover_left"]) // 2)
    gap["n_intervals"]["left"] -= 1
    c1 = H.check_theoremA_cover(gap)
    check("negative control: the cover with one left interval removed is refused (a gap)",
          c1["ok"] is False and c1["adjacent"] is False)
    flip = copy.deepcopy(rec)
    lo_, hi_ = flip["cover_right"][-1]["re_lam"]
    flip["cover_right"][-1]["re_lam"] = [lo_, "1E-30"]
    c2 = H.check_theoremA_cover(flip)
    check("negative control: one right interval with Re lambda not certainly negative is refused",
          c2["ok"] is False and c2["right_re_lambda_negative"] is False)
    short = copy.deepcopy(rec)
    last = max(short["cover_right"], key=lambda iv: Fraction(iv["a"]))
    last["b"] = str((Fraction(last["a"]) + Fraction(last["b"])) / 2)
    c3 = H.check_theoremA_cover(short)
    check("negative control: a cover ending short of W is refused", c3["ok"] is False and c3["covers_W"] is False)


def test_theorem_A_rerun():
    """--rerun-theorem-a: theorem_A into a temporary directory reproduces theoremA.json (all fields but the time)."""
    import tempfile
    path = os.path.join(H.DATA, "theoremA.json")
    with open(path) as fh_:
        rec = json.load(fh_)
    tmp = tempfile.mkdtemp(prefix="hopf-thA-")
    t0 = time.time()
    H.theorem_A(log=lambda s: None, data=tmp)
    with open(os.path.join(tmp, "theoremA.json")) as fh_:
        new = json.load(fh_)
    keys = sorted(set(rec) | set(new))
    diff = [k for k in keys if k != "seconds" and rec.get(k) != new.get(k)]
    check("theorem_A rerun reproduces theoremA.json in every field but the run time", not diff,
          f"differing fields {diff}, {time.time() - t0:.0f} s")


# ------------------------------------------------------------------------------------------------ Theorem B
def _logs():
    pieces = [r for r in H._read_jsonl(os.path.join(H.DATA, "pieces.jsonl")) if r.get("type") == "piece"]
    covers = {r["id"]: r for r in H._read_jsonl(os.path.join(H.DATA, "covers.jsonl")) if r.get("type") == "cover"}
    return pieces, covers


def _reprove(p, covers, lines):
    """Re-prove a logged piece with hopf.reprove_piece (the function of `hopf.py --reprove-all`): its group's cover
    rebuilt from the logged centres, its stored centre, weights and exact r_*, the current program text. Returns the
    re-proof record and the objects (blocks, result, settings, cover, centre, r_*)."""
    return H.reprove_piece(p, covers[p["cover"]], line_sha=lines[p["idx"]][1])


RADII_MSG = "radii polynomial not negative"


def _control_fails_by_radii(C, lo_, hi_, crec, st, eta, rs):
    """A negative control on a piece: cover rebuilt for (C, [lo_, hi_]) (T enlarged if the piece reaches past the
    logged one, as run() chooses it), piece_blocks, assemble. Returns (failed by the radii polynomial, what happened):
    any other failure (cover, domain, a different inequality) does not count as the intended failure."""
    T = Fraction(crec["T"])
    if hi_ + Fraction(1, 40) > T:
        T = H._ceil_dyadic(hi_ + Fraction(1, 40), 256)
    try:
        cov = H.EpsCover([(C, lo_, hi_)], str(T), [crec["R"]] * H.DIM, crec["G_R"], rho2=crec["rho2"], max_evals=1500,
                         log=lambda s: None)
        bl = H.piece_blocks(C, lo_, hi_, cov, settings=st, log=lambda s: None)
    except Exception as e:  # noqa: BLE001
        return False, f"failed before the radii polynomial: {type(e).__name__}: {str(e)[:120]}"
    try:
        r = H.assemble(bl, eta, rs, log=lambda s: None)
    except H.ProofFailure as e:
        d = getattr(e, "diag", {}) or {}
        return str(e).startswith(RADII_MSG), f"{str(e)[:60]}...; Y0 {d.get('Y0', float('nan')):.3e}"
    return False, f"PROVED (Y0 {r['Y0']['approx']:.3e}, Z1 {r['Z1']['approx']:.3f})"


def test_piece_recompute_and_controls():
    import tempfile
    pieces, covers = _logs()
    if not pieces:
        check("Theorem B data present", False, "no pieces logged")
        return
    lines = H.piece_lines()
    # pieces made by the earlier runs (no code hash logged) and the last one: re-proved bit for bit by this program
    # 0, 13, 30: made before the program logged its hash; 40, 62: the last pieces of the runs with logged hashes
    # bae43c6c3b (K = 8) and c656af84d2 (K = 12); the last piece: the final run
    idxs = [0] if FAST else sorted({0, 13, 30, 40, 62, len(pieces) - 1} & set(range(len(pieces))))
    p0 = pieces[0]
    done = {}
    for i in idxs:
        rr, obj = _reprove(pieces[i], covers, lines)
        done[i] = (rr, obj)
        check(f"piece {i} re-proved by hopf.reprove_piece (cover digest reproduced: {rr.get('cover_digest_reproduced')}):"
              f" Y0, Z1, Z2, radii, p, contraction, g and omega equal the logged exact values", rr.get("match") is True,
              rr.get("error") or ", ".join(k for k, v in rr.get("equal", {}).items() if not v))
    rr0, obj0 = done[0]
    if obj0 is None:
        return
    bl, res, rs = obj0["bl"], obj0["res"], obj0["rs"]
    # GAP 2 bookkeeping (review 2026-10-02): the comparison is exact, and reprove_status counts a re-proof only for the
    # current program hash and the current log line
    bad = json.loads(json.dumps(p0))
    man, ex_ = bad["result"]["Y0"]["hex"].split("p")
    bad["result"]["Y0"]["hex"] = man[:-1] + ("0" if man[-1] != "0" else "2") + "p" + ex_
    cmp_bad = H.reproof_compare(bad, res, obj0["cov"].digest, obj0["C"].digest())
    check("negative control: a logged Y0 changed in its last hex digit is not matched by the re-proof",
          cmp_bad["match"] is False and cmp_bad["equal"]["Y0"] is False and
          H.reproof_compare(p0, res, obj0["cov"].digest, obj0["C"].digest())["match"] is True)
    with tempfile.TemporaryDirectory() as tdir:
        lp = os.path.join(tdir, "reprove.jsonl")
        other = dict(rr0, code_sha256="0" * 64)
        stale = dict(rr0, piece_line_sha256="0" * 64)
        for r_ in (other, stale):
            H._append(lp, r_)
        s1 = H.reprove_status(out_path=lp)
        H._append(lp, rr0)
        s2 = H.reprove_status(out_path=lp)
        H._append(lp, dict(rr0, idx=1, piece_line_sha256=lines[1][1], match=False))
        s3 = H.reprove_status(out_path=lp)
    check("reprove_status: a re-proof counts only with the current program hash and the current log line; a failed one "
          "is reported as mismatched",
          s1["n_reproved_with_current_program"] == 0 and s2["n_reproved_with_current_program"] == 1 and
          s2["not_reproved"] == f"1-{len(pieces) - 1}" and s3["mismatched"] == "1" and
          not s3["all_pieces_reproved_with_current_program"], f"{s1['n_reproved_with_current_program']}, "
          f"{s2['n_reproved_with_current_program']}, mismatched {s3['mismatched']!r}")
    # mutations
    r1 = H.assemble(bl, p0["eta"], rs, log=lambda s: None, _mutate=("drop_curve",))
    check("mutation drop_curve changes Y0 and Z1 (the parameter-width terms are live)",
          r1["Y0"]["hex"] != res["Y0"]["hex"] and r1["Z1"]["hex"] != res["Z1"]["hex"])
    r2 = H.assemble(bl, p0["eta"], rs, log=lambda s: None, _mutate=("drop_cauchy",))
    check("mutation drop_cauchy changes Z2 (the third-derivative terms are live)", r2["Z2"]["hex"] != res["Z2"]["hex"])
    # float cross-checks on piece 0 (both modes)
    a0, b0 = Fraction(p0["e_lo"]), Fraction(p0["e_hi"])
    _float_crosscheck(obj0["C"], a0, b0, bl, p0["eta"], res, 0)
    # piece 0 (its own centre, cover and blocks): a piece reaching beyond its cover's family is refused
    C0, cov0, st0 = obj0["C"], obj0["cov"], obj0["st"]
    if not cov0.contains(C0, a0, b0):
        check("internal: piece 0 lies in its own cover", False)
    try:
        H.piece_blocks(C0, a0, Fraction(covers[p0["cover"]]["T"]) + 1, cov0, settings=st0, log=lambda s: None)
        refused = False
    except (H.ProofFailure, ValueError):
        refused = True
    check("a piece reaching beyond the cover's family is refused", refused)
    if FAST:
        return
    last = len(pieces) - 1
    rrL, objL = done[last]
    if objL is not None:
        pl = pieces[last]
        _float_crosscheck(objL["C"], Fraction(pl["e_lo"]), Fraction(pl["e_hi"]), objL["bl"], pl["eta"], objL["res"], last)
    # The widening and wrong-centre controls run on piece 13, a tight piece (half-width 3.4e-3 against a float
    # predicted admissible half-width of 4.1e-3; r_existence 5.5e-4 against r_* = 1e-3). On piece 0 both are valid
    # proofs (piece 0 is far from tight; found 2026-10-02). Each must fail BY the radii polynomial: in a 2026-10-02 run
    # (scratch script, same program), the threefold widening gave Y0 = 3.37e-3 and the wrong centre Y0 = 5.48e-3, both
    # against r_* = 1e-3.
    ic = 13
    rr13, obj13 = done[ic]
    if obj13 is None:
        check("piece 13 re-proved (needed for its controls)", False)
        return
    pc = pieces[ic]
    C, st, rs13 = obj13["C"], obj13["st"], obj13["rs"]
    crec = covers[pc["cover"]]
    a, b = Fraction(pc["e_lo"]), Fraction(pc["e_hi"])
    ec = (a + b) / 2
    ok3, why3 = _control_fails_by_radii(C, ec - 3 * (b - a) / 2, ec + 3 * (b - a) / 2, crec, st, pc["eta"], rs13)
    check(f"negative control: piece {ic} widened threefold about its centre fails by the radii polynomial", ok3, why3)
    # a centre line computed at a wrong eps: e_hi + (e_hi - e_lo)/2 (float Newton started from the piece's centre)
    FE = H.FloatEps(C.K)
    u = FE.from_centre(C)
    e_wrong = float(b + (b - a) / 2)
    u, _ = FE.newton(u, e_wrong)
    Cw = FE.to_centre(u, FE.tangent(u, e_wrong))
    okw, whyw = _control_fails_by_radii(Cw, a, b, crec, st, pc["eta"], rs13)
    check(f"negative control: piece {ic} with a centre line computed at eps = e_hi + (e_hi - e_lo)/2 fails by the radii "
          f"polynomial", okw, whyw)


def _float_crosscheck(C, a, b, bl, eta, res, idx, n_rand=16, n_climb=40):
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
    if idx == 0:          # the two-sided ratio test was calibrated on piece 0 only
        check("float cross-check (piece 0): rigorous Y2 >= float ||A d^2F/dxi^2|| >= Y2 / 30", y2r >= y2f >= y2r / 30,
              f"float {y2f:.3e}, rigorous {y2r:.3e}")
        check("float cross-check (piece 0): rigorous Zc >= float ||A d DF/dxi|| >= Zc / 30", zcr >= zcf >= zcr / 30,
              f"float {zcf:.3e}, rigorous {zcr:.3e}")
    else:
        check(f"float cross-check (piece {idx}): float ||A d^2F/dxi^2|| <= rigorous Y2 and float ||A d DF/dxi|| <= "
              f"rigorous Zc", y2f <= y2r and zcf <= zcr, f"Y2 float {y2f:.3e} / {y2r:.3e}, Zc float {zcf:.3e} / {zcr:.3e}")
    # WEAK TEST 2 (review 2026-10-02): Y1 (the derivative of the residual along the centre line at e_c, with the exact
    # division by e_c + t in the rigorous version) and Z2 (the only bound with third-derivative terms). Float values
    # are lower estimates (finite modes, sampled directions), so each must lie below the rigorous bound; they do not
    # show that the rigorous bound is large enough in every direction.
    h1 = min(1e-5, float(b - a) / 8)
    y1f = vnorm(A @ ((FE.residual(u + h1 * tt, ec + h1) - FE.residual(u - h1 * tt, ec - h1)) / (2 * h1)))
    y1r = float(H.amax_list([H.up(bl["Y1"][c] / H._arb_q(eta[c])) for c in range(H.NC)]))
    check(f"float cross-check (piece {idx}): float ||A dF/dxi|| at e_c <= rigorous Y1", y1f <= y1r,
          f"float {y1f:.3e}, rigorous {y1r:.3e}")
    rng = np.random.default_rng(1000 + idx)
    ms = list(FE.ms)

    def rand_delta(r):
        """conjugation-symmetric perturbation of weighted norm exactly r: every component at its full weight eta_c r
        (random signs), the w weight spread over the modes at random with random phases"""
        om_, g_ = rng.choice([-1, 1]) * E[0] * r, rng.choice([-1, 1]) * E[1] * r
        c_ = np.array([rng.choice([-1, 1]) * E[2 + k] * r for k in range(H.DIM)])
        w_ = np.zeros((H.DIM, 2 * K), complex)
        for k in range(H.DIM):
            wt = rng.dirichlet(np.ones(K))
            for mm in range(1, K + 1):
                z = E[2 + H.DIM + k] * r * wt[mm - 1] / (nu ** mm) / 2.0 * np.exp(1j * rng.uniform(0, 2 * np.pi))
                w_[k, ms.index(mm)], w_[k, ms.index(-mm)] = z, np.conj(z)
        return np.concatenate([[om_, g_], c_, w_.reshape(-1)]).astype(complex)
    r = float(res["r_uniqueness"]["approx"])
    z2f = 0.0
    for _ in range(n_rand):
        D = rand_delta(r)
        z2f = max(z2f, onorm(A @ (FE.galerkin(u + D, ec) - G0)) / r)
    D = rand_delta(r)
    cur = onorm(A @ (FE.galerkin(u + D, ec) - G0)) / r
    for _ in range(n_climb):
        D2 = D + 0.5 * rand_delta(r)
        D2 *= r / vnorm(D2)
        v = onorm(A @ (FE.galerkin(u + D2, ec) - G0)) / r
        if v > cur:
            cur, D = v, D2
    z2f = max(z2f, cur)
    z2r = float(res["Z2"]["approx"])
    check(f"float cross-check (piece {idx}): a float lower estimate of Z2 (random and hill-climbed perturbations of "
          f"norm r_hi) <= rigorous Z2", 0 < z2f <= z2r, f"float {z2f:.3e}, rigorous {z2r:.3e}")


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
            # WEAK TEST 3 (review 2026-10-02): the two parts of branch.point_on_branch are tested separately.
            import branch as br
            g_ = Fraction(gs)
            iG = next(i for i, p_ in enumerate(recs) if Fraction(p_["g_lo"]) <= g_ <= Fraction(p_["g_hi"])
                      and br.point_on_branch(ptg, cg, p_, centres[br._dstr(Fraction(p_["centre_g"]))])["ok"])

            def bypassed(p_):
                """the piece record widened to contain g: point_on_branch then decides by the ball inclusion alone"""
                wide = dict(p_, g_lo=str(min(Fraction(p_["g_lo"]), g_)), g_hi=str(max(Fraction(p_["g_hi"]), g_)))
                return br.point_on_branch(ptg, cg, wide, centres[br._dstr(Fraction(p_["centre_g"]))])
            # (a) the containment guard: the adjacent pieces do not contain g and are refused for that reason (on them
            # the inclusion alone holds, so the guard is needed)
            adj = [recs[j] for j in (iG - 1, iG + 1) if 0 <= j < len(recs)]
            adj = [p_ for p_ in adj if not Fraction(p_["g_lo"]) <= g_ <= Fraction(p_["g_hi"])]
            res_a = [br.point_on_branch(ptg, cg, p_, centres[br._dstr(Fraction(p_["centre_g"]))]) for p_ in adj]
            check("negative control: the containment guard refuses the adjacent G_Ks pieces, which do not contain g",
                  bool(adj) and all(r_["ok"] is False and r_.get("why") == "g not in piece" for r_ in res_a),
                  "inclusion alone on them: " + ", ".join(f"{p_['label']} {bypassed(p_)['ok']}" for p_ in adj))
            # (b) the ball inclusion: with the guard bypassed it fails three pieces before and after the glue piece
            far = [recs[j] for j in (iG - 3, iG + 3) if 0 <= j < len(recs)]
            res_b = [bypassed(p_) for p_ in far]
            check("negative control: with the guard bypassed, the ball inclusion fails on the G_Ks pieces three "
                  "positions before and after the glue piece", len(far) == 2 and all(r_["ok"] is False for r_ in res_b),
                  ", ".join(f"{p_['label']}: lhs {r_['lhs']['approx']:.3e} > r_hi {r_['r_uniqueness_piece']['approx']:.3e}"
                            for p_, r_ in zip(far, res_b)))


# ------------------------------------------------------------------------------------------------ the record
def test_record_hashes():
    """results/fourier-hopf.json: every stored source and data SHA-256 equals the file now on disk, the record's numbers
    are those of the logs (piece count, eps range, Theorem A enclosures), and a one-byte change is detected."""
    import hashlib
    import tempfile
    path = os.path.join(H.RESULTS, "fourier-hopf.json")
    if not os.path.exists(path):
        check("record results/fourier-hopf.json present", False)
        return
    with open(path) as fh_:
        rec = json.load(fh_)
    bad = [s_ for s_, h in rec["sources_sha256"].items() if H._sha(os.path.join(H.ROOT, s_)) != h]
    bad += [f for f, h in rec["data_sha256"].items() if H._sha(os.path.join(H.DATA, f)) != h]
    check("record: every stored source and data SHA-256 equals the file on disk", not bad, f"mismatch {bad}")
    pieces, _ = _logs()
    with open(os.path.join(H.DATA, "theoremA.json")) as fh_:
        thA = json.load(fh_)
    same = (rec["n_pieces"] == len(pieces) and rec["eps_covered"] == ["0", pieces[-1]["e_hi"]]
            and rec["theorem_A_record"]["l1_kuznetsov_physical"] == thA["l1_kuznetsov_physical"]
            and rec["theorem_A_record"]["gH_interval"] == thA["gH_interval"])
    check("record: piece count, eps range and Theorem A enclosures are those of the logs", same)
    check(f"record: status is '{STATUS}'", rec.get("status") == STATUS, f"{rec.get('status')!r}")
    check("record: the Theorem A cover checks are recorded as passed and equal check_theoremA_cover now",
          rec.get("theorem_A_cover_checks", {}).get("ok") is True and
          rec.get("theorem_A_cover_checks") == H.check_theoremA_cover(thA))
    st_now = H.reprove_status()
    check("record: the re-proof report equals hopf.reprove_status() now", rec.get("pieces_reproved") == st_now,
          f"{st_now['n_reproved_with_current_program']} of {st_now['n_pieces']} re-proved with this program "
          f"(not yet: {st_now['not_reproved'] or 'none'})")
    # negative control: a copy of pieces.jsonl with one byte changed has a different hash
    with open(os.path.join(H.DATA, "pieces.jsonl"), "rb") as fh_:
        raw = bytearray(fh_.read())
    raw[len(raw) // 2] ^= 1
    with tempfile.NamedTemporaryFile(delete=False) as tf:
        tf.write(bytes(raw))
    changed = H._sha(tf.name) != rec["data_sha256"]["pieces.jsonl"]
    os.unlink(tf.name)
    check("negative control: a one-byte change in pieces.jsonl changes its SHA-256", changed and
          hashlib.sha256(bytes(raw)).hexdigest() != rec["data_sha256"]["pieces.jsonl"])


def main():
    t0 = time.time()
    test_jet_closed_forms()
    test_jet_enclosure()
    fh, x, v = _test_point()
    test_field_jet(fh, x, v)
    test_lyap1()
    test_lemma_K_negative(fh)
    test_theorem_A_core(fh)
    test_theorem_A_cover()
    if RERUN_A:
        test_theorem_A_rerun()
    test_piece_recompute_and_controls()
    test_gluing_logged()
    test_identification()
    test_bridge()
    test_record_hashes()
    n_fail = sum(1 for _, ok, _ in RESULTS if not ok)
    print(f"{len(RESULTS)} checks, {n_fail} failed, {time.time() - t0:.0f} s")
    return 1 if n_fail else 0


if __name__ == "__main__":
    sys.exit(main())
