"""Guckenheimer and Oliva's boxes R1, R2 (their Table 2.1) tested, by sampling, for the covering relations
their Figure 2.2 illustrates. NUMERICAL. Their current and leak: I = 7.8617827403, E_l = 10.599; section
u = 4.5 with u increasing (where their p1, p2 lie). Each box is the trilinear image of [-1, 1]^3 through its
eight vertices, ordered as in the table: (v1, v2) differ in the unstable direction xi, (v1, v3) in the strong
stable direction zeta, (v1, v5) in the weak stable direction eta.   python3 gocheck.py -> ../data/gocheck.json"""
import json
import numpy as np
import pmap

I_GO, EL_GO = 7.8617827403, 10.599
R1 = np.array([[0.08510711565266, 0.37702513977759, 0.43770368051793], [0.08511751929147, 0.37708261653418, 0.43799786108786],
               [0.08506722811171, 0.37702247883827, 0.43770500525944], [0.08507763175053, 0.37707995559486, 0.43799918582936],
               [0.08506795096894, 0.37673045670586, 0.43526697935397], [0.08507180274587, 0.37675541738823, 0.43543828382985],
               [0.08502806342799, 0.37672779576653, 0.43526830409547], [0.08503191520493, 0.37675275644891, 0.43543960857136]])
R2 = np.array([[0.08500054963158, 0.37635307899354, 0.43231650435083], [0.08500126298925, 0.37635224747250, 0.43225555564349],
               [0.08499057463645, 0.37635239912448, 0.43231667147632], [0.08499128799412, 0.37635156760344, 0.43225572276897],
               [0.08500090973955, 0.37635423427118, 0.43231211561955], [0.08500146426647, 0.37635361157621, 0.43226513798843],
               [0.08499093474442, 0.37635355440212, 0.43231228274504], [0.08499148927134, 0.37635293170715, 0.43226530511391]])
# vertex k <-> signs (xi, eta, zeta)
SG = [(+1, +1, -1), (-1, +1, -1), (+1, +1, +1), (-1, +1, +1), (+1, -1, -1), (-1, -1, -1), (+1, -1, +1), (-1, -1, +1)]


def tri(V, p):
    xi, eta, zeta = p
    return sum(V[k] * (1 + s[0] * xi) * (1 + s[1] * eta) * (1 + s[2] * zeta) / 8 for k, s in enumerate(SG))


def tri_inv(V, x, p0=(0.0, 0.0, 0.0)):
    """Inverse of the trilinear chart by Newton from the affine guess; far from the box (|affine coordinate|
    > 3) the affine coordinates are returned, which is enough to decide on which side of the box a point is."""
    c = tri(V, (0.0, 0.0, 0.0))
    Ea = np.column_stack([(tri(V, e) - tri(V, -np.array(e))) / 2 for e in ((1.0, 0, 0), (0, 1.0, 0), (0, 0, 1.0))])
    p = np.linalg.solve(Ea, x - c)
    if np.abs(p).max() > 3:
        return p
    for _ in range(40):
        F = tri(V, p) - x
        Jm = np.zeros((3, 3))
        for i in range(3):
            dp = np.zeros(3)
            dp[i] = 1e-6
            Jm[:, i] = (tri(V, p + dp) - tri(V, p - dp)) / 2e-6
        try:
            dq = np.linalg.solve(Jm, -F)
        except np.linalg.LinAlgError:
            return np.linalg.solve(Ea, x - c)
        p = p + dq
        if np.abs(p).max() > 10:
            return np.linalg.solve(Ea, x - c)
        if np.abs(dq).max() < 1e-13:
            break
    return p


def img(x):
    x1, T, _, _, umax, umin = pmap.P(x, I_GO, 4.5, var=False, EL=EL_GO, direction=+1)
    return x1, umax


if __name__ == '__main__':
    out = {}
    boxes = {'R1': R1, 'R2': R2}
    for ni, Vi in boxes.items():
        faces = {}
        for side in (-1, 1):
            pts = [(side, e, z) for e in np.linspace(-1, 1, 41) for z in (-1, 0, 1)]
            faces[side] = [img(tri(Vi, p)) for p in pts]
        grid = [img(tri(Vi, (a, b, 0.0))) for a in np.linspace(-1, 1, 81) for b in np.linspace(-1, 1, 41)]
        for nj, Vj in boxes.items():
            fl = np.array([tri_inv(Vj, x) for x, _ in faces[-1]])
            fr = np.array([tri_inv(Vj, x) for x, _ in faces[1]])
            g = np.array([tri_inv(Vj, x) for x, _ in grid])
            inside = np.abs(g[:, 0]) <= 1
            viol = inside & ((np.abs(g[:, 1]) >= 1) | (np.abs(g[:, 2]) >= 1))
            r = {'left_face_xi': [float(fl[:, 0].min()), float(fl[:, 0].max())],
                 'right_face_xi': [float(fr[:, 0].min()), float(fr[:, 0].max())],
                 'eta_where_|xi|<=1': [float(g[inside, 1].min()), float(g[inside, 1].max())] if inside.any() else None,
                 'zeta_where_|xi|<=1': [float(g[inside, 2].min()), float(g[inside, 2].max())] if inside.any() else None,
                 'points_with_|xi|<=1': int(inside.sum()), 'entry_set_violations': int(viol.sum()),
                 'fraction_of_box_that_fires': float(np.mean([u > 40 for _, u in grid]))}
            opp = (r['left_face_xi'][1] < -1 and r['right_face_xi'][0] > 1) or (r['left_face_xi'][0] > 1 and r['right_face_xi'][1] < -1)
            r['exit_faces_opposite'] = bool(opp)
            r['covers_sampled'] = bool(opp and r['entry_set_violations'] == 0 and inside.any())
            out['%s => %s' % (ni, nj)] = r
            print(ni, '=>', nj, json.dumps(r), flush=True)
    # The part of R1 that maps into R2 is a sliver of width ~1e-12 along xi next to the zero z3 of lap 3 (slope
    # ~2.6e7); on each line (eta, zeta) of R1 locate the preimage of R2's centre plane xi_R2 = 0 by bisection
    # on the lap where xi_R2 of the image changes sign across R2, then sample the sliver.
    from scipy.optimize import brentq
    sl = []
    for eta in np.linspace(-1, 1, 21):
        for zeta in (-1.0, 0.0, 1.0):
            g = lambda a: tri_inv(R2, img(tri(R1, (a, eta, zeta)))[0])
            aa = np.linspace(-1, 1, 4001)
            vals = np.array([g(a) for a in aa])
            k = np.where((np.sign(vals[1:, 0]) != np.sign(vals[:-1, 0])) & (np.abs(vals[1:, 1]) < 50) & (np.abs(vals[:-1, 1]) < 50))[0]
            for i in k:
                # refine the sliver and sample through it
                lo, hi = aa[i], aa[i + 1]
                ss = np.linspace(lo, hi, 2001)
                vv = np.array([g(a) for a in ss])
                ins = np.abs(vv[:, 0]) <= 1
                sl.append({'eta': float(eta), 'zeta': float(zeta), 'xi_interval': [float(lo), float(hi)],
                           'n_inside_|xi_R2|<=1': int(ins.sum()),
                           'eta_R2_inside': [float(vv[ins, 1].min()), float(vv[ins, 1].max())] if ins.any() else None,
                           'xi_R2_at_ends': [float(vv[0, 0]), float(vv[-1, 0])]})
    out['R1 => R2 sliver scan'] = sl
    print('R1 => R2 sliver scan:', len(sl), 'crossings; with points inside R2 xi-range:',
          sum(1 for q in sl if q['n_inside_|xi_R2|<=1'] > 0), flush=True)
    for q in sl[:12]:
        print('  ', q, flush=True)
    json.dump(out, open('../data/gocheck.json', 'w'), indent=1)
