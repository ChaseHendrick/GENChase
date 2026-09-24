"""Test: is the spiral angle an angle in the shape plane w = (z3-z1)/(z2-z1)?
Compare arctan(2P) with the angle between grad H and the tangent of the zero-impulse circle."""
import mpmath as mp
from core import *

mp.mp.dps = 40

for mu in ['0.3', '0.5', '1']:
    G = gammas(mu)
    m = mp.mpf(mu)
    for i in range(1, 12):
        th = 2 * mp.pi * i / 12 + mp.mpf('0.05')
        z = positions(mu, th)
        k, sp = kappa_bs(G, z)
        w = (z[2] - z[0]) / (z[1] - z[0])
        # H(w) = -(1/4pi)[G1G3 ln|w|^2 + G2G3 ln|w-1|^2]; grad H = conj(h'), h' = -(1/2pi)[G1G3/w + G2G3/(w-1)]
        hp = -(G[0] * G[2] / w + G[1] * G[2] / (w - 1)) / (2 * mp.pi)
        gradH = mp.conj(hp)
        # l(w) = G1G2 + G1G3|w|^2 + G2G3|w-1|^2, grad l = 2*(G1G3 w + G2G3 (w-1))
        n = 2 * (G[0] * G[2] * w + G[1] * G[2] * (w - 1))
        ell = G[0] * G[1] + G[0] * G[2] * abs(w)**2 + G[1] * G[2] * abs(w - 1)**2
        t = 1j * n
        ang = mp.arg(gradH / t)
        # tan of angle between gradH and tangent
        tan_gt = abs(mp.tan(ang))
        P = abs(k.imag) / (2 * abs(k.real))
        print(f"mu={mu} th={mp.nstr(th,6)} ell={mp.nstr(ell,3)} 2P={mp.nstr(2*P,12)} tan(gradH,tangent)={mp.nstr(tan_gt,12)} ratio={mp.nstr(2*P/tan_gt,12)}")
