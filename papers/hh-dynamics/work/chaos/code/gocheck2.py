"""Arc analysis of the covering relations for boxes given by charts (G&O's R1, R2 and our N_A, N_B).
For lines of the source box (eta, zeta fixed, xi from -1 to 1) the image is a curve; follow it with adaptive
refinement (a segment is split until consecutive image points are within 0.02 target chart units, or the
segment is shorter than 1e-13 in xi), and classify each arc of the image that lies in the target's slab
|xi'| <= 1: CROSS (enters through one exit face and leaves through the other with |eta'| < 1 all along),
OUTSIDE (|eta'| > 1 all along), or HITS-ENTRY (eta' crosses +-1 inside the slab: the image meets the
target's entry set, which the Zgliczynski-Gidea covering relation, and Moser's condition 2 that G&O cite, forbid).
NUMERICAL.   python3 gocheck2.py go|ours   -> ../data/gocheck2_<which>.json"""
import sys
import json
import numpy as np
import pmap
import gocheck as g


def follow(f, lo=-1.0, hi=1.0, n0=2001, tol=0.02, hmin=1e-13, cap=400000):
    s = list(np.linspace(lo, hi, n0))
    v = [f(x) for x in s]
    i = 0
    while i < len(s) - 1 and len(s) < cap:
        a, b = v[i], v[i + 1]
        near = min(abs(a[0]), abs(b[0])) < 3 or (a[0] * b[0] < 0)
        if near and np.abs(a[:2] - b[:2]).max() > tol and s[i + 1] - s[i] > hmin:
            m = 0.5 * (s[i] + s[i + 1])
            s.insert(i + 1, m)
            v.insert(i + 1, f(m))
            continue
        i += 1
    return np.array(s), np.array(v)


def arcs(s, v):
    ins = np.abs(v[:, 0]) <= 1
    out = []
    i = 0
    while i < len(s):
        if not ins[i]:
            i += 1
            continue
        j = i
        while j + 1 < len(s) and ins[j + 1]:
            j += 1
        seg = v[i:j + 1]
        e = seg[:, 1]
        if np.all(np.abs(e) < 1):
            kind = 'CROSS' if (i > 0 and j + 1 < len(s) and np.sign(v[i - 1, 0]) != np.sign(v[j + 1, 0])) else 'INSIDE-TURN'
        elif np.all(np.abs(e) > 1):
            kind = 'OUTSIDE'
        else:
            kind = 'HITS-ENTRY'
        out.append({'kind': kind, 'xi_src': [float(s[i]), float(s[j])], 'eta_img': [float(e.min()), float(e.max())],
                    'points': int(j - i + 1)})
        i = j + 1
    return out


if __name__ == '__main__':
    which = sys.argv[1]
    if which == 'go':
        boxes = {'R1': g.R1, 'R2': g.R2}
        src = lambda V, xi, eta, zeta: g.tri(V, (xi, eta, zeta))
        tgt = lambda V, x: g.tri_inv(V, x)
        image = lambda x: g.img(x)[0]
    else:
        import orbits
        import horseshoe as hs
        J = orbits.j_ours(7.8617827403)
        S = hs.Setup(J)
        d = json.load(open('../data/horseshoe_Jgo.json'))
        boxes = {h['name']: hs.HSet(h['name'], h['z_coeffs_in_s'], h['w_coeffs_in_s'], h['c2_range'][0],
                                    h['c2_range'][1], h['r3']) for h in d['hsets']}
        src = lambda N, xi, eta, zeta: S.x_of(N.chart(xi, eta, zeta))
        tgt = lambda N, x: np.array(N.inv(S.c_of(x)))
        image = lambda x: pmap.P(x, J, 4.5, var=False, direction=+1)[0]
    res = {}
    for ni, Vi in boxes.items():
        for nj, Vj in boxes.items():
            rows = []
            for eta in (-0.95, -0.5, 0.0, 0.5, 0.95):
                for zeta in (-1.0, 0.0, 1.0):
                    f = lambda xi: tgt(Vj, image(src(Vi, xi, eta, zeta)))
                    s, v = follow(f)
                    a = arcs(s, v)
                    rows.append({'eta': eta, 'zeta': zeta, 'samples': len(s), 'arcs': a,
                                 'image_xi_at_ends': [float(v[0, 0]), float(v[-1, 0])]})
                    print(ni, '=>', nj, 'eta=%+.2f zeta=%+.0f' % (eta, zeta), 'samples', len(s),
                          [(q['kind'], np.round(q['eta_img'], 3).tolist()) for q in a], flush=True)
            kinds = [q['kind'] for r in rows for q in r['arcs']]
            res['%s => %s' % (ni, nj)] = {'lines': rows, 'n_CROSS': kinds.count('CROSS'),
                                          'n_HITS_ENTRY': kinds.count('HITS-ENTRY'),
                                          'n_INSIDE_TURN': kinds.count('INSIDE-TURN'),
                                          'n_OUTSIDE': kinds.count('OUTSIDE')}
            print('  summary', ni, '=>', nj, {k: v for k, v in res['%s => %s' % (ni, nj)].items() if k != 'lines'}, flush=True)
    json.dump(res, open('../data/gocheck2_%s.json' % which, 'w'), indent=1)
