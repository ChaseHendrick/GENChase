"""Fit the exact finite-n values: y(n) = (q(n) - q_inf) n^(2/3) = C + sum_p d_p n^(-p/3).

The exact values carry a floating-point error near 1e-12, so the uncertainty of a fitted C is the
model's, not the data's. Three families of powers p are fitted, over every window n >= n_min:
  M1  p = 1, 2, 3, 4, 5            (integer powers of n^(-1/3) only)
  M2  p = 1, 2, 5/2, 3, 4          (adds n^(-5/6))
  M3  p = 1, 2, 5/2, 3, 7/2, 4     (adds n^(-7/6))
The half-integer powers are an empirical choice: M1 drifts with the window and M2/M3 do not. A possible
origin (about sqrt(n) crossover lines near the tangency points, each off by O(1)) is disputed by the
adversarial check, which estimates O(n^(2/3)) there; see REPORT.md.
The estimate is the median of M3 over the windows; its uncertainty is the larger of the half range of
M3 over the windows and the distance between the M3 and M2 medians. d1 (the n^(-1) term of q, which
carries the O(n) term of the area) is fitted with C fixed at the prediction, in M3.
"""
import json
import numpy as np
import mpmath as mp
import constants as K

MODELS = {'M1': [1, 2, 3, 4, 5], 'M2': [1, 2, 2.5, 3, 4], 'M3': [1, 2, 2.5, 3, 3.5, 4]}


def load(path, key, sizekey):
    rows = json.load(open(path))['rows']
    return np.array([r[sizekey] for r in rows], float), np.array([r[key] for r in rows], float)


def fit(n, y, powers, nmin, C=None):
    m = n >= nmin
    x = n[m] ** (-1 / 3)
    cols = [x ** p for p in powers]
    if C is None:
        X = np.column_stack([np.ones_like(x)] + cols)
        b = np.linalg.lstsq(X, y[m], rcond=None)[0]
        return b[0], b[1:], float(np.max(np.abs(y[m] - X @ b))), int(m.sum())
    X = np.column_stack(cols)
    b = np.linalg.lstsq(X, y[m] - C, rcond=None)[0]
    return C, b, float(np.max(np.abs(y[m] - C - X @ b))), int(m.sum())


def study(label, n, q, qinf, Cpred, nmins, cells=None):
    y = (q - qinf) * n ** (2 / 3)
    res = {'label': label, 'predictedC': Cpred, 'sizes': [int(v) for v in n], 'models': {}}
    print('\n%s: predicted C = %.10f; sizes %d to %d' % (label, Cpred, n.min(), n.max()))
    for name, pw in MODELS.items():
        rows = []
        for nm in nmins:
            if (n >= nm).sum() < len(pw) + 4:
                continue
            C, d, r, k = fit(n, y, pw, nm)
            Cf, df, rf, _ = fit(n, y, pw, nm, C=Cpred)
            rows.append({'nmin': nm, 'points': k, 'C': C, 'd1': d[0], 'maxResid': r, 'd1FixedC': df[0], 'maxResidFixedC': rf})
        res['models'][name] = rows
        print('  %s p = %s' % (name, pw))
        for w in rows:
            print('     n >= %4d (%2d sizes): C = %.7f  resid %.1e | C fixed: d1 = %+.5f  resid %.1e' % (w['nmin'], w['points'], w['C'], w['maxResid'], w['d1FixedC'], w['maxResidFixedC']))
    m3 = np.array([w['C'] for w in res['models']['M3']])
    m2 = np.array([w['C'] for w in res['models']['M2']])
    est = float(np.median(m3))
    unc = float(max((m3.max() - m3.min()) / 2, abs(np.median(m3) - np.median(m2))))
    d1 = np.array([w['d1FixedC'] for w in res['models']['M3']])
    res['estimate'] = {'C': est, 'uncertainty': unc, 'differenceFromPredicted': est - Cpred, 'inUncertainties': (est - Cpred) / unc,
                       'd1': float(np.median(d1)), 'd1HalfRange': float((d1.max() - d1.min()) / 2)}
    print('  estimate C = %.6f +/- %.6f (M3 median; uncertainty = max(M3 half range, |M3 - M2|)); predicted %.6f; difference %+.1e = %+.2f uncertainties; d1 = %.4f +/- %.4f'
          % (est, unc, Cpred, est - Cpred, (est - Cpred) / unc, np.median(d1), (d1.max() - d1.min()) / 2))
    return res


if __name__ == '__main__':
    out = {}
    az = K.aztec_constant()
    n, q = load('data/aztec_exact.json', 'polarFraction', 'n')
    out['aztec'] = study('Aztec polar fraction', n, q, 1 - np.pi / 4, float(az['C']), [64, 96, 128, 192, 256, 384])
    for fam, box, lim, nm in [('regular', (1, 1, 1), np.pi / (2 * np.sqrt(3)), [16, 24, 32, 48, 64, 96]),
                              ('skew', (3, 5, 6), 0.8850434659350882, [4, 5, 6, 8, 10, 12])]:
        n, q = load('data/hexagon_exact_%s.json' % fam, 'freeFraction', 'size')
        hc = K.hexagon_constant(*[mp.mpf(x) for x in box])
        out[fam] = study('%s hexagon free fraction' % fam, n, q, lim, float(hc['C']), nm)
    json.dump(out, open('data/fits.json', 'w'), indent=1, default=float)
