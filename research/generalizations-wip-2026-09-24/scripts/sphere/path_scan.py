"""Scan: min over (mu, theta on both collapsing arcs, vortex j, d0 in [0,1)) of
path_j / geodesic_j, where path_j = (W_j |khat| / |ahat|) E(phi0 | m_j), m_j = K_j^2/|khat|^2,
phi0 = arccos d0, W_j = 2|sin(sig_j/2)|, geodesic_j = 2 arcsin(W_j sin(phi0)/2).
(Closed form; the speed formula was checked against Biot-Savart in check_independent.py.)
"""
import mpmath as mp
from pathlength import shape_data
mp.mp.dps = 20

def ratios(mu, th, d0s):
    ah, bh, sig = shape_data(mu, th)
    kk = abs(mp.mpc(ah, bh))
    P = abs(bh)/(2*abs(ah))
    res = []
    for j, s in enumerate(sig):
        sh, ch = mp.sin(s/2), mp.cos(s/2)
        W = 2*abs(sh)
        if W < mp.mpf('1e-12'):
            continue
        K = bh*sh + ah*ch
        m = (K/kk)**2
        for d0 in d0s:
            phi0 = mp.acos(d0)
            path = W*kk/abs(ah)*mp.ellipe(phi0, m)
            g = 2*mp.asin(W*mp.sin(phi0)/2)
            res.append((path/g, j, d0, P))
    return res

best = (mp.inf, None)
d0s = [mp.mpf(k)/40 for k in range(0, 40)] + [mp.mpf('0.99'), mp.mpf('0.999')]
rows = []
for mu in [mp.mpf(k)/20 for k in range(1, 21)]:
    R = 1+mu+mu**2
    th0 = mp.acos((mu-1)/(2*mp.sqrt(R)))
    arcs = {'A+': (mp.mpf(0), th0), 'A-': (mp.pi, 2*mp.pi-th0)}
    for name, (lo, hi) in arcs.items():
        mloc = (mp.inf, None)
        for k in range(1, 60):
            th = lo + (hi-lo)*k/60
            for r in ratios(mu, th, d0s):
                if r[0] < mloc[0]:
                    mloc = (r[0], (mu, name, th, r[1], r[2], r[3]))
        rows.append(mloc)
        if mloc[0] < best[0]:
            best = mloc
        mu_, nm, th, j, d0, P = mloc[1]
        print('mu %.2f %s  min path/geo %s at theta=%s j=%d d0=%s (P0=%s, planar sqrt(1+4P^2)=%s)' % (
            float(mu), nm, mp.nstr(mloc[0], 10), mp.nstr(th, 6), j+1, mp.nstr(d0, 4), mp.nstr(P, 6), mp.nstr(mp.sqrt(1+4*P**2), 8)))
print('overall', best)
