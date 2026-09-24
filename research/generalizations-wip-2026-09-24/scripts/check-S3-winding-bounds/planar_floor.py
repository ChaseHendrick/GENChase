"""Own recomputation of the planar floor P_-(mu) (needed for the transferred spherical bounds),
from direct planar Biot-Savart, and of the spherical floors quoted in the claim.
Shapes: z1=0, z2=1, z3 = mu/(1+mu) + r e^{i th}, th in (0, pi) minus the equilateral th0;
each shape is reflected, if needed, into its collapsing orientation (reflection keeps |Im k|, flips Re k).
"""
import mpmath as mp
import static_check as S

mp.mp.dps = 40

def P_of(mu, th):
    G = [mp.mpf(1), mu, -mu/(1+mu)]
    r = mp.sqrt(1+mu+mu**2)/(1+mu)
    Z = [mp.mpc(0), mp.mpc(1), mu/(1+mu)+r*mp.expj(th)]
    k, zc, spread = S.planar_data(Z, G)
    return abs(k.imag)/(2*abs(k.real))

def arc_min(mu, lo, hi):
    # golden-section on a coarse grid then refine with findroot on the derivative
    N = 400
    best = None
    for i in range(1, N):
        th = lo + (hi-lo)*i/N
        v = P_of(mu, th)
        if best is None or v < best[0]:
            best = (v, th)
    a, b = best[1]-(hi-lo)/N, best[1]+(hi-lo)/N
    gr = (mp.sqrt(5)-1)/2
    c, d = b-gr*(b-a), a+gr*(b-a)
    fc, fd = P_of(mu, c), P_of(mu, d)
    for _ in range(170):
        if fc < fd:
            b, d, fd = d, c, fc
            c = b-gr*(b-a); fc = P_of(mu, c)
        else:
            a, c, fc = c, d, fd
            d = a+gr*(b-a); fd = P_of(mu, d)
    th = (a+b)/2
    return P_of(mu, th), th

if __name__ == '__main__':
    print('mu            P on arc (0,th0)        P on arc (th0,pi)       min           min - sqrt3/2')
    prev = None
    for mu in ['1e-8', '1e-6', '1e-4', '1e-3', '0.01', '0.05', '0.1', '0.2', '0.3', '0.5', '0.7', '0.9', '1']:
        mu = mp.mpf(mu)
        r = mp.sqrt(1+mu+mu**2)/(1+mu)
        th0 = mp.acos((mp.mpf(1)/2 - mu/(1+mu))/r)
        m1, t1 = arc_min(mu, mp.mpf(0), th0)
        m2, t2 = arc_min(mu, th0, mp.pi)
        m = min(m1, m2)
        mono = '' if prev is None else ('incr' if m > prev else 'NOT INCREASING')
        prev = m
        print('%-8s %s %s %s %s %s' % (mp.nstr(mu, 3), mp.nstr(m1, 18), mp.nstr(m2, 18), mp.nstr(m, 18), mp.nstr(m-mp.sqrt(3)/2, 6), mono))
    print('sqrt2 =', mp.nstr(mp.sqrt(2), 18), ' paper P_-(1/2) = 1.0647059762712043, P_+(1/2) = 2.2038550160')
    # spherical floors at beta = 30 deg
    b = mp.radians(30)
    print('beta=30deg: rho/R = sin =', mp.nstr(mp.sin(b), 20))
    print('  floor (1) = (sqrt3/2)/cos b      =', mp.nstr((mp.sqrt(3)/2)/mp.cos(b), 20))
    print('  floor (2) = sqrt3/(1+cos b)      =', mp.nstr(mp.sqrt(3)/(1+mp.cos(b)), 20), ' = 4 sqrt3 - 6 =', mp.nstr(4*mp.sqrt(3)-6, 20))
    print('  floor (3) = sqrt3/2              =', mp.nstr(mp.sqrt(3)/2, 20))
