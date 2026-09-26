"""Guckenheimer and Oliva's conjecture that no threshold function exists (their p. 111), tested numerically at
J*: along segments of initial conditions, does "fires an action potential" alternate with "returns to rest" at
finer and finer scales? NUMERICAL (float64, DOP853, rtol 1e-14).

Fate of an initial state: AP if u exceeds U_AP = 50 (G&O's cutoff v = -50) before it enters the rest ball
|u - u_eq| < 0.5, |gates - gates_eq| < 0.005 (inside the basin of the stable rest state: the nearest invariant
object, the unstable orbit A, stays more than 6 mV from it); REST if it enters the ball first; UNDECIDED if
neither happens within TMAX ms.

Two measurements on each segment:
  1. switch counts: the number of AP/REST changes among N equally spaced points, for N = 10^2 ... 10^k, and in
     nested zooms around a switch;
  2. the uncertainty exponent (McDonald, Grebogi, Ott and Yorke, Physica D 17 (1985) 125-153): the fraction
     f(eps) of random points whose fate differs from that of a point eps away; f ~ eps^alpha with alpha = 1 for a
     smooth threshold and alpha < 1 for a fractal one (box dimension of the boundary on the segment 1 - alpha).

    python3 threshold.py rest       # segment: depolarize from rest by du, gates at rest
    python3 threshold.py section    # segment: a line c2 = const across N_A and N_B on the section
"""
import sys
import json
import numpy as np
import hhc
import orbits

U_AP, TMAX, CHUNK = 50.0, 1000.0, 4.0
AP, REST, UNDEC = 1, 0, -1


def fate(y0, J, eq, tmax=TMAX):
    y = np.asarray(y0, float).copy()
    t = 0.0
    while t < tmax:
        y, umax, umin, _ = hhc.run(y, J, CHUNK)
        t += CHUNK
        if umax > U_AP:
            return AP, t
        if abs(y[0] - eq[0]) < 0.5 and np.abs(y[1:] - eq[1:]).max() < 0.005:
            return REST, t
    return UNDEC, t


def fates(Y, J, eq):
    return np.array([fate(y, J, eq)[0] for y in Y])


def switches(f):
    g = f[f != UNDEC]
    return int(np.sum(g[1:] != g[:-1]))


def uncertainty(seg, J, eq, eps_list, n, rng):
    """seg(s) -> initial state for s in [0, 1]; returns f(eps) with its binomial standard error."""
    out = []
    for eps in eps_list:
        s = rng.uniform(0, 1 - eps, n)
        a = fates([seg(v) for v in s], J, eq)
        b = fates([seg(v + eps) for v in s], J, eq)
        ok = (a != UNDEC) & (b != UNDEC)
        k = int(np.sum(a[ok] != b[ok]))
        m = int(ok.sum())
        p = k / m
        out.append({'eps': eps, 'n': m, 'uncertain': k, 'f': p, 'se': np.sqrt(max(p * (1 - p), 1.0 / m) / m)})
        print('  eps=%.1e  uncertain %d of %d  f=%.3e' % (eps, k, m, p), flush=True)
    return out


def fit_alpha(unc, rng, nboot=2000):
    """Slope of log f against log eps (points with at least 5 uncertain pairs), with a parametric bootstrap
    over the binomial counts (seeded)."""
    pts = [u for u in unc if u['uncertain'] >= 5]
    le = np.log([u['eps'] for u in pts])
    lf = np.log([u['f'] for u in pts])
    alpha = np.polyfit(le, lf, 1)[0]
    boots = []
    for _ in range(nboot):
        kk = [rng.binomial(u['n'], u['f']) for u in pts]
        if min(kk) == 0:
            continue
        boots.append(np.polyfit(le, np.log(np.array(kk) / np.array([u['n'] for u in pts])), 1)[0])
    return alpha, float(np.std(boots)), len(pts)


def refine(seg, J, eq, s0, f0, K=10, depth=9, min_width=2e-15):
    """Box counting of the fate boundary on the segment. Start from the sample points s0 with fates f0;
    every interval whose end fates differ (AP vs REST) is split into K parts and its interior points are
    computed; the switch intervals of the next level are those whose ends differ. Returns, per level, the
    interval width and the number of switch intervals. A smooth threshold gives 1 at every level; a Cantor-like
    boundary gives counts that grow like width^(-d)."""
    ints = [(s0[i], s0[i + 1], f0[i], f0[i + 1]) for i in range(len(s0) - 1)
            if f0[i] != UNDEC and f0[i + 1] != UNDEC and f0[i] != f0[i + 1]]
    width = s0[1] - s0[0]
    rows = [{'level': 0, 'width': width, 'switch_intervals': len(ints)}]
    print('  level 0 width %.3e: %d switch intervals' % (width, len(ints)), flush=True)
    for lev in range(1, depth + 1):
        width /= K
        if width < min_width:
            break
        new, und = [], 0
        for a, b, fa, fb in ints:
            ss = np.linspace(a, b, K + 1)
            ff = [fa] + [fate(seg(v), J, eq)[0] for v in ss[1:-1]] + [fb]
            und += sum(1 for x in ff if x == UNDEC)
            for k in range(K):
                if ff[k] != UNDEC and ff[k + 1] != UNDEC and ff[k] != ff[k + 1]:
                    new.append((ss[k], ss[k + 1], ff[k], ff[k + 1]))
        ints = new
        rows.append({'level': lev, 'width': width, 'switch_intervals': len(ints), 'undecided': und})
        print('  level %d width %.3e: %d switch intervals (%d undecided)' % (lev, width, len(ints), und), flush=True)
        if len(ints) > 20000:
            break
    return rows


def box_dimension(rows):
    """Least-squares slope of log N against log(1/width) over the levels with N >= 4 (a descriptive number:
    the counts come from one segment, so no error bar is claimed; the level-to-level ratios are reported)."""
    r = [x for x in rows if x['switch_intervals'] >= 4]
    if len(r) < 3:
        return None
    x = np.log([1 / q['width'] for q in r])
    y = np.log([q['switch_intervals'] for q in r])
    return float(np.polyfit(x, y, 1)[0])


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'rest'
    J = orbits.j_ours(7.8617827403)
    eq = hhc.equilibrium(J)
    rng = np.random.default_rng(20260926)
    res = {'J': J, 'EL': hhc.EL0, 'U_AP': U_AP, 'TMAX': TMAX, 'segment': which}
    if which == 'rest':
        # first locate the threshold du* for a jump from rest, by bisection
        f = lambda du: fate(eq + np.array([du, 0, 0, 0]), J, eq)[0]
        lo, hi = 0.0, 40.0
        assert f(lo) == REST and f(hi) == AP
        for _ in range(60):
            m = 0.5 * (lo + hi)
            if f(m) == AP:
                hi = m
            else:
                lo = m
        res['du_star_bisection'] = [lo, hi]
        print('bisection threshold du* in [%.15f, %.15f]' % (lo, hi), flush=True)
        # scan a window around it at increasing resolution
        W = 1e-2
        seg = lambda s: eq + np.array([lo - W / 2 + W * s, 0, 0, 0])
    else:
        import horseshoe as hs
        d = json.load(open('../data/horseshoe_Jgo.json'))
        S = hs.Setup(J)
        c2 = -2.0e-3
        z = S.zeros(c2)
        res['line'] = {'c2': c2, 'zeros': z[0], 'firing_boundary': z[1]}
        a, b = -0.2 * S.scale, z[1] + 0.2 * S.scale
        seg = lambda s: np.r_[4.5, S.x_of(np.array([a + (b - a) * s, c2, 0.0]))]
        res['line']['c1_range'] = [a, b]
        print('section line c2=%g, c1 in [%.4e, %.4e], zeros %s, boundary %.6e' % (c2, a, b, z[0], z[1]), flush=True)
    counts = []
    for N in (100, 1000, 10000):
        s = np.linspace(0, 1, N + 1)
        f = fates([seg(v) for v in s], J, eq)
        counts.append({'N': N, 'switches': switches(f), 'AP': int(np.sum(f == AP)), 'REST': int(np.sum(f == REST)),
                       'UNDEC': int(np.sum(f == UNDEC))})
        print('N=%d: %s' % (N, counts[-1]), flush=True)
    res['uniform_counts'] = counts
    res['refine'] = refine(seg, J, eq, s, f, K=10, depth=int(sys.argv[2]) if len(sys.argv) > 2 else 10)
    res['box_dimension_descriptive'] = box_dimension(res['refine'])
    print('box-counting slope (descriptive): %s' % res['box_dimension_descriptive'], flush=True)
    # uncertainty exponent on the smallest window that holds all level-1 switch intervals
    sw = [q for q in res['refine'] if q['level'] == 1]
    lo_s, hi_s = 0.0, 1.0
    s1 = np.linspace(0, 1, 10001)
    f1 = f
    k = np.where((f1[1:] != f1[:-1]) & (f1[1:] != UNDEC) & (f1[:-1] != UNDEC))[0]
    if len(k):
        lo_s, hi_s = s1[max(k.min() - 1, 0)], s1[min(k.max() + 2, len(s1) - 1)]
    sub = lambda v: seg(lo_s + (hi_s - lo_s) * v)
    res['uncertainty_window'] = [lo_s, hi_s]
    eps = [10.0 ** (-k) for k in range(1, 10)]
    unc = uncertainty(sub, J, eq, eps, 1000, rng)
    res['uncertainty'] = unc
    try:
        alpha, se, npts = fit_alpha(unc, rng)
        res['alpha'] = {'value': alpha, 'bootstrap_sd': se, 'points_used': npts,
                        'method': 'slope of log f(eps) on log eps; parametric binomial bootstrap (seeded) over the counts'}
        print('alpha = %.3f +/- %.3f (%d points)' % (alpha, se, npts), flush=True)
    except Exception as e:
        res['alpha'] = {'error': str(e)}
    json.dump(res, open('../data/threshold_%s.json' % which, 'w'), indent=1)
