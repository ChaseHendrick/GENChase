"""Refined minimization of path/geodesic near the mu -> 0 corner (where the planar ratio -> 2)."""
import mpmath as mp
from pathlength import shape_data, minimize_Pminus
mp.mp.dps = 30

def ratio(mu, th, j, d0):
    ah, bh, sig = shape_data(mu, th)
    kk = abs(mp.mpc(ah, bh))
    s = sig[j]
    sh, ch = mp.sin(s/2), mp.cos(s/2)
    W = 2*abs(sh)
    K = bh*sh + ah*ch
    m = (K/kk)**2
    phi0 = mp.acos(d0)
    path = W*kk/abs(ah)*mp.ellipe(phi0, m)
    g = 2*mp.asin(W*mp.sin(phi0)/2)
    return path/g

def golden(f, a, b, it=80):
    gr = (mp.sqrt(5)-1)/2
    c = b - gr*(b-a); d = a + gr*(b-a)
    fc, fd = f(c), f(d)
    for _ in range(it):
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - gr*(b-a); fc = f(c)
        else:
            a, c, fc = c, d, fd
            d = a + gr*(b-a); fd = f(d)
    x = (a+b)/2
    return x, f(x)

for mu in [mp.mpf('0.2'), mp.mpf('0.1'), mp.mpf('0.05'), mp.mpf('0.02'), mp.mpf('0.01'), mp.mpf('0.001')]:
    thstar, Pm = minimize_Pminus(mu)
    R = 1+mu+mu**2
    th0 = mp.acos((mu-1)/(2*mp.sqrt(R)))
    lo, hi = mp.pi, 2*mp.pi-th0
    for j in [1, 2]:
        def inner(th):
            # min over d0 in (0, 1) by grid + golden
            best = min(((ratio(mu, th, j, mp.mpf(k)/50), mp.mpf(k)/50) for k in range(0, 50)), key=lambda t: t[0])
            k0 = best[1]
            a, b = max(mp.mpf(0), k0-mp.mpf(1)/50), min(mp.mpf('0.99999'), k0+mp.mpf(1)/50)
            x, fx = golden(lambda d0: ratio(mu, th, j, d0), a, b, 50)
            return fx, x
        # grid in theta around the arc
        cand = []
        for k in range(1, 40):
            th = lo + (hi-lo)*k/40
            cand.append((inner(th)[0], th))
        cand.sort(key=lambda t: t[0])
        th1 = cand[0][1]
        w = (hi-lo)/40
        thb, fb = golden(lambda th: inner(th)[0], max(lo+w/100, th1-w), min(hi-w/100, th1+w), 50)
        fb2, d0b = inner(thb)
        print('mu %s j=%d  min path/geo = %s at theta=%s d0=%s ; planar floor sqrt(1+4P_-^2)=%s (theta*=%s)' % (
            mp.nstr(mu, 4), j+1, mp.nstr(fb2, 15), mp.nstr(thb, 10), mp.nstr(d0b, 8), mp.nstr(mp.sqrt(1+4*Pm**2), 12), mp.nstr(thstar, 10)))
