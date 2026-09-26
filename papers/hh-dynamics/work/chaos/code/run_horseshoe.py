"""Build the h-sets N_A, N_B at a current J, test the four covering relations by dense sampling, and find
the periodic orbits of every itinerary up to length NMAX. NUMERICAL, NOT RIGOROUS.

    python3 run_horseshoe.py J [NMAX] [tag]       e.g.  python3 run_horseshoe.py go 8 Jgo

J = 'go' means Guckenheimer and Oliva's I = 7.8617827403 at E_l = 10.599, mapped to E_l = 10.5989209693917
(J + 0.3 E_l invariant). Writes ../data/horseshoe_<tag>.json.
"""
import sys
import json
import time
import numpy as np
import hhc
import orbits
import horseshoe as hs
import periodic as pr

C2LO, C2HI, WA, THETAB, R3 = -4.8e-3, 8e-4, 2.5e-6, 0.3, 1e-6


def auto_window(S, lo=-1.2e-2, hi=5e-3, step=2.5e-4, trim=0.08):
    """The c2 interval on which the three zeros z1 < z2 < z3 exist, trimmed by a fraction at each end."""
    good = []
    for c2 in np.arange(lo, hi + step / 2, step):
        try:
            z = S.zeros(c2)[0]
        except ValueError:
            z = []
        if len(z) >= 3:
            good.append(c2)
    if not good:
        raise ValueError('no three-lap window')
    a, b = min(good), max(good)
    r = b - a
    return a + trim * r, b - trim * r


def main(J, nmax, tag, dense=True, window=None):
    t0 = time.time()
    S = hs.Setup(J)
    global C2LO, C2HI
    if window == 'auto':
        C2LO, C2HI = auto_window(S)
        print('auto window c2 in [%.4e, %.4e]' % (C2LO, C2HI), flush=True)
    out = {'J': J, 'EL': hhc.EL0, 'section': 'u = 4.5, u increasing', 'coordinates':
           'x = (m, n, h) = A + E c; E columns = unit eigenvectors of DP(A) (unstable, weak stable, strong stable)',
           'A': S.A.tolist(), 'B': S.B.tolist(), 'E': S.E.tolist(),
           'A_residual': S.resA, 'B_residual': S.resB, 'T_A': S.TA, 'T_B': S.TB,
           'mu_A': [float(z.real) for z in S.muA], 'mu_B': [float(z.real) for z in S.muB],
           'B_in_c': S.c_of(S.B).tolist()}
    NA, NB, Z, fe = hs.fit_hsets(S, C2LO, C2HI, wA=WA, thetaB=THETAB, r3=R3, n=29, verbose=False)
    out['zero_curves'] = {'c2': Z[:, 0].tolist(), 'z1': Z[:, 1].tolist(), 'z2': Z[:, 2].tolist(),
                          'z3': Z[:, 3].tolist(), 'firing_boundary': Z[:, 4].tolist(), 'fit_error': list(fe)}
    out['hsets'] = [NA.describe(), NB.describe()]
    out['window'] = [C2LO, C2HI]
    print('h-sets fitted (%.0f s); fit errors %.1e %.1e' % (time.time() - t0, *fe), flush=True)
    kw = dict(nface=801, nxi=81, neta=321) if dense else dict(nface=201, nxi=41, neta=81)
    cov = {}
    for Ni in (NA, NB):
        r = hs.check_cover(S, Ni, [NA, NB], **kw)
        for k, v in r.items():
            cov[Ni.name + ' => ' + k] = {kk: (vv if not isinstance(vv, (list, tuple)) else [float(q) for q in vv])
                                         for kk, vv in v.items() if vv is not None}
            print('%s => %s: covers=%s  exit faces xi in %s | %s, image eta in %s, |zeta| <= %.3f' % (
                Ni.name, k, v['covers'], np.round(v['left_face_xi_range'], 2), np.round(v['right_face_xi_range'], 2),
                np.round(v['image_eta_range_all'], 4), v['image_zeta_absmax']), flush=True)
    out['covering_sampled'] = cov
    out['sampling'] = kw
    per = []
    for n in range(1, nmax + 1):
        for code in pr.primitive_codes(n):
            X, res, T, mu, it = pr.shoot(S, code, X0=pr.seeds(S, NA, NB, code))
            ok, loc = pr.locate(NA, NB, S, X, code)
            per.append({'code': code, 'residual': res, 'period_ms': T, 'mu': [complex(m).real for m in mu[:2]],
                        'in_hsets': bool(ok), 'x0': X[0].tolist(),
                        'xi_eta': [[float(a), float(b)] for a, b, _ in loc]})
        print('n=%d done (%d cycles so far, %.0f s)' % (n, len(per), time.time() - t0), flush=True)
    out['periodic'] = per
    out['periodic_summary'] = {'cycles': len(per), 'in_hsets': sum(p['in_hsets'] for p in per),
                               'max_residual': max(p['residual'] for p in per)}
    print(out['periodic_summary'])
    with open('../data/horseshoe_%s.json' % tag, 'w') as f:
        json.dump(out, f, indent=1)


if __name__ == '__main__':
    Jarg = sys.argv[1]
    J = orbits.j_ours(7.8617827403) if Jarg == 'go' else float(Jarg)
    nmax = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    tag = sys.argv[3] if len(sys.argv) > 3 else Jarg
    main(J, nmax, tag, dense=(len(sys.argv) <= 4 or sys.argv[4] != 'quick'),
         window=sys.argv[5] if len(sys.argv) > 5 else None)
