"""Path length of each vortex from a state with pole angle beta0 (d0 = cos beta0) to collapse,
compared with its initial chord and geodesic distance to the collision point p.
Closed form (proved from the velocity decomposition, checked in check_independent.py):
  |x_j'|^2 = W_j^2 (|khat|^2/rho^2 - K_j^2),  W_j = 2 sin(sig_j/2),
  K_j = bhat sin(sig_j/2) + ahat cos(sig_j/2),  rho^2 = 1 - d^2,  dd/dt = |ahat|.
Chord distance r_j = W_j rho0, geodesic g_j = 2 arcsin(r_j/2).
"""
import mpmath as mp
from sphere_core import *
mp.mp.dps = 40

def shape_data(mu, th):
    G = [mp.mpf(1), mu, -mu/(1+mu)]
    Z = gotoda_positions(mu, th)
    ks, zc = planar_kappa(Z, G)
    kap = ks[2]
    Oc = circumcenter(*Z); rpl = abs(Z[0]-Oc)
    ah = kap.real*rpl**2; bh = kap.imag*rpl**2
    # central angles from zc, measured at Oc, orientation of the plane (counterclockwise)
    sig = [mp.arg((z-Oc)/(zc-Oc)) % (2*mp.pi) for z in Z]
    return ah, bh, sig

def Pplanar(mu, th):
    ah, bh, _ = shape_data(mu, th)
    return abs(bh)/(2*abs(ah))

def minimize_Pminus(mu):
    # P_- lives on A_- = (pi, 2pi - theta0), cos theta0 = (mu-1)/(2 sqrt(R))
    R = 1+mu+mu**2
    th0 = mp.acos((mu-1)/(2*mp.sqrt(R)))
    lo, hi = mp.pi, 2*mp.pi - th0
    # golden section on P
    gr = (mp.sqrt(5)-1)/2
    a, b = lo+mp.mpf('1e-30'), hi-mp.mpf('1e-30')
    c = b - gr*(b-a); d = a + gr*(b-a)
    fc, fd = Pplanar(mu, c), Pplanar(mu, d)
    for _ in range(200):
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - gr*(b-a); fc = Pplanar(mu, c)
        else:
            a, c, fc = c, d, fd
            d = a + gr*(b-a); fd = Pplanar(mu, d)
    th = (a+b)/2
    return th, Pplanar(mu, th)

def path_ratio(ah, bh, sig, d0):
    kk = abs(mp.mpc(ah, bh))
    out = []
    for s in sig:
        sh, ch = mp.sin(s/2), mp.cos(s/2)
        W = 2*abs(sh)
        K = bh*sh + ah*ch
        # substitute d = cos(phi): dd = -sin(phi) dphi, 1-d^2 = sin^2 phi, removes endpoint singularity
        f = lambda ph: W*mp.sqrt(kk**2 - K**2*mp.sin(ph)**2)/abs(ah)
        phi0 = mp.acos(d0)
        path = mp.quad(f, [0, phi0])
        rho0 = mp.sqrt(1-d0**2)
        r = W*rho0
        g = 2*mp.asin(r/2)
        out.append((path/r, path/g, s))
    return out

if __name__ == '__main__':
    for mu in [mp.mpf(1), mp.mpf('0.5'), mp.mpf('0.1'), mp.mpf('0.01'), mp.mpf('0.001'), mp.mpf('1e-4'), mp.mpf('1e-6')]:
        th, P = minimize_Pminus(mu)
        ah, bh, sig = shape_data(mu, th)
        kk = abs(mp.mpc(ah, bh))
        planar_ratio = mp.sqrt(1+4*P**2)
        coeffs = []
        for s in sig:
            sh, ch = mp.sin(s/2), mp.cos(s/2)
            K = bh*sh + ah*ch
            coeffs.append(ch**2 - K**2/kk**2)
        print('mu', mp.nstr(mu, 6), 'theta*', mp.nstr(th, 15), 'P_-', mp.nstr(P, 15), 'sqrt(1+4P^2)-2', mp.nstr(planar_ratio-2, 6))
        print('    sig/pi', [mp.nstr(s/mp.pi, 8) for s in sig], ' c_j = cos^2(sig/2) - K^2/|k|^2:', [mp.nstr(c, 8) for c in coeffs])
        for d0 in [mp.mpf('0.999'), mp.mpf('0.99'), mp.mpf('0.9'), mp.mpf('0.5'), mp.mpf(0), mp.mpf('-0.5')]:
            pr = path_ratio(ah, bh, sig, d0)
            print('    d0 %6s  path/chord %s   path/geodesic %s' % (mp.nstr(d0, 4), [mp.nstr(t[0], 10) for t in pr], [mp.nstr(t[1], 10) for t in pr]))
