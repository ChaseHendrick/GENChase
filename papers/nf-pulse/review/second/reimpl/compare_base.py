"""Task 4 (NUMERICAL cross-check, written after reading the base code): run my own mpmath integrator from the
base code's starting point P_c(1/4) (base manifold.py: a_1 = sigma v with sigma = 1/7 and v normalized to U = 1,
so P_c(t) = K(t/7) in my parametrization, i.e. K(1/28)), and compare with the base enclosures in
data/proof_{c1,c2}_final.json. Also computes the xi offset between the two conventions.
Reads base DATA files only (block T matrix and results); imports none of the base code."""
import json
import sys
sys.argv = [sys.argv[0], "45"]
import shoot_mp as M
import mpmath
from mpmath import mp, mpf

BASE = "/home/user/GENChase/papers/nf-pulse/data/"
T = json.load(open(BASE + "block_certificate.json"))["T"]
out = {}
for lab, cstr in (("c1", "1.1027477097341592491478677"), ("c2", "1.1027477097341592491478678")):
    c = mpf(cstr); k = 1 / c
    A, lam, v, w, roots = M.rest_linear(c)
    _, _, _, K = M.manifold_point(c)
    rest = [mpf(0), M.S0, M.S0, mpf(0)]
    # theta at which the unstable coordinate l_u.(K(theta)-rest) equals 1e-3 (approximately my start a = delta)
    Kf = lambda th: [sum(K[n][i] * th ** n for n in range(len(K))) for i in range(4)]
    ath = lambda th: sum(w[i] * Kf(th)[i] for i in range(4))
    th0 = mpmath.findroot(lambda th: ath(th) - mpf("1e-3"), mpf("1e-3"))
    offset = mpmath.log((mpf(1) / 28) / th0) / lam
    x = Kf(mpf(1) / 28)
    x = [x[0], x[1] + M.S0, x[2] + M.S0, x[3]]
    base = json.load(open(BASE + f"proof_{lab}_final.json"))

    def integrate(x, t0, t1):
        t = t0
        while t < t1:
            xn, h = M.tstep(x, k)
            if t + h >= t1:
                co = M.taylor(x, k, M.NT)
                return [M.horner(co[i], t1 - t) for i in range(4)]
            x, t = xn, t + h
        return x

    x53 = integrate(x, mpf(0), mpf(53))
    from flint import arb
    inside53 = [bool(arb(base["x_at_T"][i]).contains(arb(mpmath.nstr(x53[i], 30)))) for i in range(4)]
    tK = mpf(base["t_K"])
    xK = integrate(x53, mpf(53), tK)
    y = [sum(mpf(T[a][i]) * (xK[i] - rest[i]) for i in range(4)) for a in range(4)]
    insideK = [bool(arb(base["y_at_tK"][a]).contains(arb(mpmath.nstr(y[a], 30)))) for a in range(4)]
    ynorm = mpmath.sqrt(sum(yy ** 2 for yy in y[1:]))
    out[lab] = dict(theta_for_a_1em3=mpmath.nstr(th0, 20), xi_offset_mine_minus_base=mpmath.nstr(offset, 15),
                    x_at_53_mine=[mpmath.nstr(v, 15) for v in x53], x_at_53_base=base["x_at_T"][:4],
                    contained_53=inside53, tK_base=base["t_K"], y_at_tK_mine=[mpmath.nstr(v, 12) for v in y],
                    y_at_tK_base=base["y_at_tK"], contained_tK=insideK,
                    cone=("K+" if y[0] > ynorm else "K-" if -y[0] > ynorm else "neither"),
                    Tu_dot_v=mpmath.nstr(sum(mpf(T[0][i]) * v[i] for i in range(4)), 10))
    print(json.dumps(out[lab], indent=1)); sys.stdout.flush()
json.dump(out, open("compare_base.json", "w"), indent=1)
