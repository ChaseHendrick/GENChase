"""Cross-check of the CAPD comoving field (comoving19.hpp, via comoving_field) against tw_model.py. Test, not a proof.

Points: random states around the standard TP06 state with V spread over [-90, 45] mV and W over [-60, 350] mV/ms,
kappa in {0.8, 2.3, 4.1}, both h/j branches, the GHK factor as the quotient (|V - 15| > 0.5 mV) and as the degree-24
window polynomial (|V - 15| < 8 mV). Passes if every Python value lies in the C++ enclosure widened by 1e-12 relative
(the Python model is floating point), and the first integral H agrees likewise.
Negative control: the same comparison with the C++ field evaluated at kappa * (1 + 1e-6) must FAIL (Python value
outside the widened enclosure) at almost every point, so the check can detect a wrong kappa factor.
Window-row test (added 2026-10-02, review finding 4): at degree K = 2 and |V - 15| between 1 and 40 mV (|zeta| up to 3),
the C++ quotient field minus the C++ window field must equal (A_W, A_C) R(zeta) in the rows W and Ca_ss (A from
comoving19::windowRows, R = g - p_2 computed with mpmath) and vanish in every other row; the Python field with the GHK
factor replaced by p_2 must lie in the C++ window enclosure. Negative controls: A_W without its factor kappa, and A_C
doubled, must fail.
Writes results/check_comoving_field.json.
Usage: python3 check_comoving_field.py COMOVING_FIELD_BINARY WORKDIR
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tw_model as TM  # noqa: E402

binary, work = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
rng = np.random.default_rng(20261002)
pts = []
for kappa in ("0.8", "2.3", "4.1"):
    for low in (0, 1):
        for poly in (0, 1):
            for _ in range(25):
                y = np.concatenate([TM.M.Y0 * (1 + 0.05 * rng.standard_normal(19)), [rng.uniform(-60, 350)]])
                if poly:
                    y[0] = 15 + rng.uniform(-8, 8)
                else:
                    v = rng.uniform(-90, 45)
                    y[0] = v if abs(v - 15) > 0.5 else v + 1.0
                if low and y[0] > -40:
                    pass  # the branch formulas are evaluated off their side too (both are finite); compared as formulas
                pts.append((kappa, low, poly, y))


def run(kfac, tag):
    pf = os.path.join(work, "points_%s.txt" % tag)
    of = os.path.join(work, "out_%s.txt" % tag)
    with open(pf, "w") as f:
        for kappa, low, poly, y in pts:
            ks = ("%.10g" % (float(kappa) * kfac)) if kfac != 1.0 else kappa
            z = y / TM.SIGMA
            f.write("%s %d %d 24 %s\n" % (ks, low, poly, " ".join(float(v).hex() for v in z)))
    subprocess.run([binary, pf, of], check=True, timeout=600)
    rows = [[float.fromhex(t) for t in ln.split()] for ln in open(of)]
    inside_all, worst_rel, n_out = True, 0.0, 0
    for (kappa, low, poly, y), r in zip(pts, rows):
        F = np.array(r[:40]).reshape(20, 2) * TM.SIGMA[:, None]
        Hc = np.array(r[40:42])
        fp = TM.field(y, float(kappa), bool(low))
        hp = TM.H(y, float(kappa))
        lo = F[:, 0] - 1e-12 * np.abs(fp) - 1e-300
        hi = F[:, 1] + 1e-12 * np.abs(fp) + 1e-300
        ins = bool(np.all((fp >= lo) & (fp <= hi)) and Hc[0] - 1e-12 * abs(hp) <= hp <= Hc[1] + 1e-12 * abs(hp))
        inside_all &= ins
        n_out += not ins
        mid = 0.5 * (F[:, 0] + F[:, 1])
        worst_rel = max(worst_rel, float(np.max(np.abs(mid - fp) / np.maximum(np.abs(fp), 1e-12))))
    return dict(points=len(pts), python_inside_all=inside_all, points_outside=n_out, max_rel_difference_midpoint=worst_rel)


def window_rows_test():
    import mpmath as mp
    mp.mp.prec = 200
    RTF = 8314.472 * 310.0 / 96485.3415
    rng2 = np.random.default_rng(20261003)
    wp = []
    for kappa in ("0.8", "2.3", "4.1"):
        for low in (0, 1):
            for _ in range(25):
                y = np.concatenate([TM.M.Y0 * (1 + 0.05 * rng2.standard_normal(19)), [rng2.uniform(-60, 350)]])
                d = rng2.uniform(1.0, 40.0) * rng2.choice([-1.0, 1.0])
                y[0] = 15.0 + d
                y[7], y[8], y[9], y[10] = rng2.uniform(0.2, 1.0, 4)   # d, f, f2, fCass away from 0 so that i_CaL matters
                wp.append((kappa, low, y))
    outs = {}
    for poly in (0, 1):
        pf = os.path.join(work, "wpoints_%d.txt" % poly)
        of = os.path.join(work, "wout_%d.txt" % poly)
        with open(pf, "w") as f:
            for kappa, low, y in wp:
                f.write("%s %d %d 2 %s\n" % (kappa, low, poly, " ".join(float(v).hex() for v in (y / TM.SIGMA))))
        subprocess.run([binary, pf, of], check=True, timeout=600)
        outs[poly] = [[float.fromhex(t) for t in ln.split()] for ln in open(of)]
    # Python window field: replace the GHK factor 1/exprel(z) by p_2(z) = 1 - z/2 + z^2/12
    orig = TM.M.exprel
    TM.M.exprel = lambda z: 1.0 / (1.0 - z / 2.0 + z * z / 12.0)
    try:
        pyw = [TM.field(y, float(k), bool(lo)) for k, lo, y in wp]
    finally:
        TM.M.exprel = orig
    ok_rows, ok_py, neg_k, neg_c, worst = True, True, 0, 0, 0.0
    for idx, (kappa, low, y) in enumerate(wp):
        Fq = np.array(outs[0][idx][:40]).reshape(20, 2)
        Fw = np.array(outs[1][idx][:40]).reshape(20, 2)
        A = np.array(outs[1][idx][42:46]).reshape(2, 2)
        z = mp.mpf(2) * (mp.mpf(y[0]) - 15) / mp.mpf(RTF)
        R = float(z / (mp.exp(z) - 1) - (1 - z / 2 + z * z / 12))
        dlo, dhi = Fq[:, 0] - Fw[:, 1], Fq[:, 1] - Fw[:, 0]          # enclosure of (quotient - window), scaled
        expect = np.zeros(20)
        expect[TM.IW] = 0.5 * (A[0, 0] + A[0, 1]) * R
        expect[16] = 0.5 * (A[1, 0] + A[1, 1]) * R
        tol = 1e-10 * np.maximum(np.abs(expect), np.abs(dhi) + np.abs(dlo)) + 1e-300
        inside = (expect >= dlo - tol) & (expect <= dhi + tol)
        ok_rows &= bool(np.all(inside))
        nz = np.abs(expect) > 0
        worst = max(worst, float(np.max(np.abs(0.5 * (dlo + dhi) - expect)[nz] / np.abs(expect[nz]))))
        # negative controls: A_W without kappa (only meaningful for kappa != 1), A_C doubled
        e2 = expect.copy(); e2[TM.IW] = expect[TM.IW] / float(kappa)
        neg_k += not bool(np.all((e2 >= dlo - tol) & (e2 <= dhi + tol)))
        e3 = expect.copy(); e3[16] = 2 * expect[16]
        neg_c += not bool(np.all((e3 >= dlo - tol) & (e3 <= dhi + tol)))
        pw = pyw[idx] / TM.SIGMA
        lo_, hi_ = Fw[:, 0] - 1e-12 * np.abs(pw) - 1e-300, Fw[:, 1] + 1e-12 * np.abs(pw) + 1e-300
        ok_py &= bool(np.all((pw >= lo_) & (pw <= hi_)))
    n = len(wp)
    return dict(points=n, degree=2, V_minus_15_range_mV=[1.0, 40.0], rows_match=ok_rows, python_window_field_inside=ok_py,
                max_rel_difference_W_and_Ca_ss_rows=worst,
                negative_control_A_W_without_kappa_failures=neg_k, negative_control_A_C_doubled_failures=neg_c,
                passed=bool(ok_rows and ok_py and neg_k >= 0.9 * n and neg_c >= 0.9 * n))


NEG = "negative_control_kappa_times_1_plus_1e-6"
res = {"note": "Floating-point cross-check of comoving19.hpp against tw_model.py; test, not a proof.",
       "check": run(1.0, "check"), NEG: run(1 + 1e-6, "neg"), "window_rows_test": window_rows_test()}
res["passed"] = bool(res["check"]["python_inside_all"] and res[NEG]["points_outside"] > 0.9 * len(pts)
                     and res["window_rows_test"]["passed"])
os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
json.dump(res, open(os.path.join(HERE, "results", "check_comoving_field.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
sys.exit(0 if res["passed"] else 1)
