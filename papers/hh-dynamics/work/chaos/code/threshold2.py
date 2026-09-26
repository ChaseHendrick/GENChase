"""G&O's "no threshold function" conjecture at J*, on the segments their definition uses: u varies, the
gates (m, n, h) are fixed. A threshold function v_t(m, n, h) requires that at fixed gates the fate be "no AP"
below one voltage and "AP" above it, so any non-monotone pattern (AP, rest, AP or rest, AP, rest) along
such a segment rules it out at those gates. NUMERICAL (float64, DOP853, rtol 1e-14).

Segments (s in [0, 1]):
  ugates : u = 4.5 + L (2 s - 1), L = 2e-3 mV, gates fixed at the section point (z1(c2), c2 = -2e-3) of N_A
           (moving u by 1 mV at fixed gates moves the section point by 0.016 in c1, so the segment crosses the
           laps of A, B and C)
  NA     : the section line c2 = -2e-3 across N_A only (c1 in z1 +- w_A)
  rest   : u = u_eq + du, gates at rest, du within 1e-6 mV of the threshold du* found by bisection

For N = 10^2 ... 10^6 equally spaced points: the fates, the number of switches, and the non-monotone patterns;
then box counts n(delta) of the cells of size delta that contain both fates, and a robustness check of the
fates at rtol 1e-12.    python3 threshold2.py SEGMENT NMAXEXP   -> ../data/threshold2_SEGMENT.json
"""
import sys
import json
import time
import numpy as np
from multiprocessing import Pool
import hhc
import orbits
import horseshoe as hs

U_AP, TMAX, CHUNK = 50.0, 1000.0, 4.0
AP, REST, UNDEC = 1, 0, -1
J = orbits.j_ours(7.8617827403)
EQ = hhc.equilibrium(J)
RTOL = 1e-14


def fate(y0):
    y = np.asarray(y0, float).copy()
    t = 0.0
    while t < TMAX:
        y, umax, umin, _ = hhc.run(y, J, CHUNK, rtol=RTOL, atol=RTOL * 1e-2)
        t += CHUNK
        if umax > U_AP:
            return AP
        if abs(y[0] - EQ[0]) < 0.5 and np.abs(y[1:] - EQ[1:]).max() < 0.005:
            return REST
    return UNDEC


def fate_loose(y0):
    global RTOL
    RTOL = 1e-12
    return fate(y0)


def make_segment(which):
    S = hs.Setup(J)
    c2 = -2.0e-3
    z, cb, _, _ = S.zeros(c2)
    info = {'c2': c2, 'zeros_c1': z, 'firing_boundary_c1': cb}
    if which == 'ugates':
        g0 = S.x_of(np.array([z[0], c2, 0.0]))
        L = 2e-3
        info.update({'gates': g0.tolist(), 'u_range': [4.5 - L, 4.5 + L]})
        return (lambda s: np.r_[4.5 + L * (2 * s - 1), g0]), info
    if which == 'NA':
        w = 2.5e-6
        info.update({'c1_range': [z[0] - w, z[0] + w]})
        return (lambda s: np.r_[4.5, S.x_of(np.array([z[0] - w + 2 * w * s, c2, 0.0]))]), info
    if which == 'rest':
        f = lambda du: fate(EQ + np.array([du, 0, 0, 0]))
        lo, hi = 0.0, 40.0
        for _ in range(60):
            m = 0.5 * (lo + hi)
            if f(m) == AP:
                hi = m
            else:
                lo = m
        W = 2e-6
        info.update({'du_star': [lo, hi], 'du_range': [lo - W / 2, lo + W / 2], 'gates': EQ[1:].tolist()})
        return (lambda s: EQ + np.array([lo - W / 2 + W * s, 0, 0, 0])), info
    raise ValueError(which)


def patterns(f):
    """Run-length encoding of the fates (AP = 'A', rest = 'R', undecided = '?')."""
    s = ''.join('A' if x == AP else ('R' if x == REST else '?') for x in f)
    runs = []
    for ch in s:
        if runs and runs[-1][0] == ch:
            runs[-1][1] += 1
        else:
            runs.append([ch, 1])
    return runs


if __name__ == '__main__':
    which = sys.argv[1]
    nexp = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    seg, info = make_segment(which)
    res = {'segment': which, 'J': J, 'EL': hhc.EL0, 'U_AP': U_AP, 'TMAX': TMAX, 'info': info, 'levels': []}
    t0 = time.time()
    with Pool(3) as pool:
        for e in range(2, nexp + 1):
            N = 10 ** e
            s = np.linspace(0, 1, N + 1)
            f = np.array(pool.map(fate, [seg(v) for v in s], chunksize=200))
            runs = patterns(f)
            sw = sum(1 for a, b in zip(f[1:], f[:-1]) if a != b and a != UNDEC and b != UNDEC)
            lev = {'N': N, 'switches': sw, 'AP': int(np.sum(f == AP)), 'REST': int(np.sum(f == REST)),
                   'UNDEC': int(np.sum(f == UNDEC)), 'runs': len(runs),
                   'shortest_runs': sorted(r[1] for r in runs)[:10],
                   'non_monotone': len(runs) > 2}
            res['levels'].append(lev)
            print('N=%d: %d switches, %d runs, AP %d REST %d undecided %d (%.0f s)' % (
                N, sw, len(runs), lev['AP'], lev['REST'], lev['UNDEC'], time.time() - t0), flush=True)
            last = (s, f)
        s, f = last
        # box counts on the finest sampling
        N = len(s) - 1
        bc = []
        for k in range(1, nexp + 1):
            m = 10 ** k
            if m > N:
                break
            step = N // m
            cnt = 0
            for i in range(m):
                blk = f[i * step:(i + 1) * step + 1]
                blk = blk[blk != UNDEC]
                if len(blk) and blk.min() != blk.max():
                    cnt += 1
            bc.append({'cells': m, 'delta': 1.0 / m, 'mixed_cells': cnt})
        res['box_counts'] = bc
        print('box counts:', [(b['cells'], b['mixed_cells']) for b in bc], flush=True)
        # robustness: fates at rtol 1e-12 on the points next to every switch of the finest level
        idx = sorted(set(j for i in range(N) if f[i] != f[i + 1] for j in (i, i + 1)))[:4000]
        g = np.array(pool.map(fate_loose, [seg(s[i]) for i in idx], chunksize=50))
        res['robustness'] = {'points_checked': len(idx), 'disagreements_rtol_1e-12': int(np.sum(g != f[idx]))}
        print('robustness:', res['robustness'], flush=True)
        res['finest_runs_head'] = patterns(f)[:200]
    json.dump(res, open('../data/threshold2_%s.json' % which, 'w'), indent=1)
