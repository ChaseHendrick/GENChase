"""Fit the exact finite-n values: y(n) = (q(n) - q_inf) n^(2/3) = C + sum_{j=1}^{J} d_j n^(-j/3).

The exact values carry a floating-point error near 1e-11, so the uncertainty is the model's: the
leading constant C is fitted free over every window n >= n_min and every truncation J, and the
reported error is the spread of the fits that are stable (the half range over the accepted grid).
d_1 is the next-order term: in absolute area it is the O(n) coefficient.
"""
import json
import sys
import numpy as np
import mpmath as mp
import constants as K


def load(path, key, sizekey):
    D = json.load(open(path))
    rows = D['rows']
    n = np.array([r[sizekey] for r in rows], float)
    q = np.array([r[key] for r in rows], float)
    return n, q


def fit(n, y, J, nmin, C=None):
    m = n >= nmin
    x = n[m] ** (-1 / 3)
    cols = [x ** j for j in range(1, J + 1)]
    if C is None:
        X = np.column_stack([np.ones_like(x)] + cols)
        beta, res, *_ = np.linalg.lstsq(X, y[m], rcond=None)
        resid = y[m] - X @ beta
        return beta, np.max(np.abs(resid)), int(m.sum())
    X = np.column_stack(cols)
    beta, *_ = np.linalg.lstsq(X, y[m] - C, rcond=None)
    resid = y[m] - C - X @ beta
    return np.concatenate([[C], beta]), np.max(np.abs(resid)), int(m.sum())


def study(label, n, q, qinf, Cpred, nmins, Js=(3, 4, 5)):
    y = (q - qinf) * n ** (2 / 3)
    out = {'label': label, 'predictedC': Cpred, 'fits': []}
    print('\n%s: predicted C = %.10f' % (label, Cpred))
    print('   J  n_min  points   C (free)        d1          max|resid|    d1 with C fixed')
    for J in Js:
        for nmin in nmins:
            if (n >= nmin).sum() < J + 3:
                continue
            b, r, k = fit(n, y, J, nmin)
            bf, rf, _ = fit(n, y, J, nmin, C=Cpred)
            out['fits'].append({'J': J, 'nmin': nmin, 'points': k, 'C': b[0], 'd': b[1:].tolist(), 'maxResid': r, 'd1FixedC': bf[1], 'maxResidFixedC': rf})
            print('  %2d %6d %6d   %.8f   %+.5f   %.1e      %+.5f (resid %.1e)' % (J, nmin, k, b[0], b[1], r, bf[1], rf))
    return out


def summarize(out, accept):
    Cs = np.array([f['C'] for f in out['fits'] if accept(f)])
    d1 = np.array([f['d1FixedC'] for f in out['fits'] if accept(f)])
    s = {'C_mid': float((Cs.max() + Cs.min()) / 2), 'C_halfRange': float((Cs.max() - Cs.min()) / 2), 'nFits': int(len(Cs)),
         'd1_mid': float((d1.max() + d1.min()) / 2), 'd1_halfRange': float((d1.max() - d1.min()) / 2)}
    s['sigmaFromPredicted'] = (s['C_mid'] - out['predictedC']) / s['C_halfRange'] if s['C_halfRange'] > 0 else None
    out['summary'] = s
    print('  accepted fits: C = %.6f +/- %.6f (half range of %d fits); predicted %.6f; difference %.2f half-ranges; d1 (C fixed) = %.4f +/- %.4f'
          % (s['C_mid'], s['C_halfRange'], s['nFits'], out['predictedC'], s['sigmaFromPredicted'] or 0, s['d1_mid'], s['d1_halfRange']))
    return out


if __name__ == '__main__':
    res = {}
    az = K.aztec_constant()
    n, q = load('data/aztec_exact.json', 'polarFraction', 'n')
    o = study('Aztec polar fraction', n, q, 1 - np.pi / 4, float(az['C']), [40, 64, 96, 128, 192, 256, 384])
    res['aztec'] = summarize(o, lambda f: f['J'] >= 4 and f['nmin'] >= 96 and f['points'] >= f['J'] + 4)
    for fam, box, lim in [('regular', (1, 1, 1), np.pi / (2 * np.sqrt(3))), ('skew', (3, 5, 6), 0.8850434659350882)]:
        try:
            n, q = load('data/hexagon_exact_%s.json' % fam, 'freeFraction', 'size')
        except FileNotFoundError:
            continue
        hc = K.hexagon_constant(*[mp.mpf(x) for x in box])
        nm = [12, 20, 32, 48, 64, 96, 128] if fam == 'regular' else [4, 6, 8, 12, 16, 24]
        o = study('%s hexagon free fraction' % fam, n, q, lim, float(hc['C']), nm)
        res[fam] = summarize(o, lambda f: f['J'] >= 4 and f['nmin'] >= (32 if fam == 'regular' else 8) and f['points'] >= f['J'] + 4)
    json.dump(res, open('data/fits.json', 'w'), indent=1, default=float)
