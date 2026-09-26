"""The tabs' Monte Carlo means (validation/results/*-science.json) against the exact finite-n values.
z = (Monte Carlo mean - exact) / (standard error of the Monte Carlo mean over independent seeds).
The exact value has no sampling error (floating-point error about 1e-12), so the error bar is the
Monte Carlo one alone. Also: the studio's own extrapolated limits, recomputed from the exact values
with the tools' model q_inf + A n^(-2/3) + B n^(-1) at the same orders, to show the bias of that model."""
import json
import numpy as np

ROOT = '../../validation/results/'


def main():
    out = {}
    az = {r['n']: r['polarFraction'] for r in json.load(open('data/aztec_exact.json'))['rows']}
    A = json.load(open(ROOT + 'aztec-science.json'))['arctic']['polarFraction']['summary']
    rows = []
    print('Aztec polar fraction')
    print(' order seeds   Monte Carlo            exact            z     (MC - (1-pi/4)) n^2/3   (exact - (1-pi/4)) n^2/3')
    for r in A:
        n = r['order']; e = az[n]; z = (r['mean'] - e) / r['se']
        rows.append({'order': n, 'seeds': r['seeds'], 'mc': r['mean'], 'se': r['se'], 'exact': e, 'z': z})
        print(' %5d %5d   %.5f +/- %.5f   %.6f   %+5.2f        %.3f                   %.4f' % (n, r['seeds'], r['mean'], r['se'], e, z,
              (r['mean'] - (1 - np.pi / 4)) * n ** (2 / 3), (e - (1 - np.pi / 4)) * n ** (2 / 3)))
    zs = np.array([x['z'] for x in rows])
    print('  chi-square %.2f on %d; mean z %+.2f' % ((zs ** 2).sum(), len(zs), zs.mean()))
    out['aztec'] = {'rows': rows, 'chiSquare': float((zs ** 2).sum()), 'dof': len(zs)}
    L = json.load(open(ROOT + 'lozenge-science.json'))['limitShape']['shapes']
    reg = {r['size']: r['freeFraction'] for r in json.load(open('data/hexagon_exact_regular.json'))['rows']}
    skw = {r['size']: r['freeFraction'] for r in json.load(open('data/hexagon_exact_skew.json'))['rows']}
    rows = []
    print('\nLozenge free fraction')
    print(' box           seeds   Monte Carlo            exact            z')
    for s in L:
        a, b, c = s['box']
        e = reg[a] if a == b == c else skw[a // 3]
        assert a == b == c or (a // 3) * 5 == b and (a // 3) * 6 == c
        m, se = s['freeArea']['mean'], s['freeArea']['se']
        z = (m - e) / se
        rows.append({'box': [a, b, c], 'seeds': s['seeds'], 'mc': m, 'se': se, 'exact': e, 'z': z})
        print(' %-12s %5d   %.5f +/- %.5f   %.6f   %+5.2f' % ('x'.join(map(str, (a, b, c))), s['seeds'], m, se, e, z))
    zs = np.array([x['z'] for x in rows])
    print('  chi-square %.2f on %d; mean z %+.2f' % ((zs ** 2).sum(), len(zs), zs.mean()))
    out['lozenge'] = {'rows': rows, 'chiSquare': float((zs ** 2).sum()), 'dof': len(zs)}
    # the tools' extrapolation model applied to the exact values
    def three(ns, qs):
        X = np.column_stack([np.ones(len(ns)), np.array(ns, float) ** (-2 / 3), np.array(ns, float) ** -1.0])
        return np.linalg.lstsq(X, np.array(qs), rcond=None)[0]
    ns = [r['order'] for r in A]
    b = three(ns, [az[n] for n in ns])
    print('\nThe tools\' model q_inf + A n^-2/3 + B n^-1 on the exact values:')
    print('  Aztec orders 40-320: q_inf = %.5f (limit %.5f), A = %.3f (true constant 1.575)' % (b[0], 1 - np.pi / 4, b[1]))
    ns2 = [12, 16, 20, 24, 32, 40, 48]
    b2 = three(ns2, [reg[n] for n in ns2])
    print('  regular hexagon sides 12-48: q_inf = %.5f (limit %.5f), A = %.3f (true constant -0.874)' % (b2[0], np.pi / (2 * np.sqrt(3)), b2[1]))
    ks = [4, 5, 6, 8]
    b3 = three(ks, [skw[k] for k in ks])
    print('  3:5:6 k = 4-8: q_inf = %.5f (limit %.5f), A = %.3f (true constant -0.340)' % (b3[0], 0.8850434659350882, b3[1]))
    out['toolModelOnExact'] = {'aztec': b.tolist(), 'regular': b2.tolist(), 'skew': b3.tolist()}
    json.dump(out, open('data/compare.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
