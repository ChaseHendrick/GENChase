"""Independent check (construction B): vortices placed directly on the sphere, x1, x2 random,
x3 moved around the circle {L = 0} on the sphere; no use of the planar parametrization.
Everything is measured from the spherical Biot-Savart velocities:
  p = J/S, |p| = 1; n = oriented unit normal of the chord plane; d = n.p;
  ddot = n'.p ; psidot = azimuthal rate of n about p ; chord rates.
Predictions use a planar Biot-Savart evaluation of the chord triangle in its own plane:
  kappa = common value of u_i/(x_i - p) (complex, orientation n), rho = circumradius,
  ahat = rho^2 Re kappa, bhat = rho^2 Im kappa, P0 = |bhat|/(2|ahat|).
Also checks the individual vortex azimuth rates and speeds against the closed forms.
"""
import random
import mpmath as mp
from sphere_core import *
mp.mp.dps = 50
random.seed(7)

def rand_unit():
    while True:
        v = [mp.mpf(random.gauss(0, 1)) for _ in range(3)]
        nv = mp.sqrt(sum(t*t for t in v))
        if nv > 0.1:
            return vec(*[t/nv for t in v])

worst = {}
def upd(k, v):
    worst[k] = max(worst.get(k, mp.mpf(0)), v)

count = 0
for trial in range(40):
    mu = mp.mpf(random.uniform(0.02, 1.0))
    G = [mp.mpf(1), mu, -mu/(1+mu)]
    S = sum(G)
    x1 = rand_unit()
    # x2 at random angular distance
    x2 = rand_unit()
    # L = G1G2 l12^2 + G3 (G1 l13^2 + G2 l23^2) = 0, with l^2 = 2 - 2 x.y:
    # G3 (G1 (2 - 2 x1.x3) + G2 (2 - 2 x2.x3)) = -G1 G2 l12^2
    # => (G1 x1 + G2 x2) . x3 = (G1 + G2) + G1 G2 l12^2/(2 G3) =: h
    l12sq = dot(x1-x2, x1-x2)
    m = G[0]*x1 + G[1]*x2
    h = (G[0]+G[1]) + G[0]*G[1]*l12sq/(2*G[2])
    mn = norm(m)
    if abs(h) >= mn:
        continue
    # circle: x3 = (h/|m|^2) m + r (cos t u + sin t v)
    mhat = m/mn
    u = cross(mhat, vec(1, 0, 0)); u = u/norm(u)
    v = cross(mhat, u)
    r = mp.sqrt(1 - (h/mn)**2)
    for tt in [mp.mpf(random.uniform(0, 6.283)) for _ in range(5)]:
        x3 = (h/mn)*mhat + r*(mp.cos(tt)*u + mp.sin(tt)*v)
        X = [x1, x2, x3]
        L = sum(G[i]*G[j]*dot(X[i]-X[j], X[i]-X[j]) for (i, j) in [(0, 1), (0, 2), (1, 2)])
        upd('L', abs(L))
        J = G[0]*x1 + G[1]*x2 + G[2]*x3
        p = J/S
        upd('|p|-1', abs(norm(p)-1))
        V = sphere_vel(X, G)
        n, nd = normal_rate(X, V)
        d = dot(n, p)
        upd('p in plane', abs(dot(n, x1) - d))
        # planar BS of the chord triangle in its own plane (orientation n)
        E1 = (x1 - dot(x1, n)*n); E1 = E1/norm(E1)
        E2 = cross(n, E1)
        Z = [mp.mpc(dot(x, E1), dot(x, E2)) for x in X]
        zc = mp.mpc(dot(p, E1), dot(p, E2))
        U = planar_vel(Z, G)
        ks = [U[i]/(Z[i]-zc) for i in range(3)]
        upd('planar ss', max(abs(ks[i]-ks[0]) for i in range(3))/abs(ks[0]))
        kap = ks[0]
        Oc = circumcenter(*Z); rho = abs(Z[0]-Oc)
        upd('rho^2+d^2-1', abs(rho**2 + d**2 - 1))
        ah = kap.real*rho**2; bh = kap.imag*rho**2
        # (1) ddot = -ahat
        upd('ddot', abs(dot(nd, p) + ah)/abs(mp.mpc(ah, bh)))
        # (2) psidot = bhat/rho^2
        pxn = cross(p, n)
        psid = dot(pxn, nd)/dot(pxn, pxn)
        upd('psidot', abs(psid - bh/rho**2)/abs(bh/rho**2))
        # (3) chord rates: d ln l^2/dt = 2 d ahat/rho^2 for each pair
        for (i, j) in [(0, 1), (0, 2), (1, 2)]:
            dl = X[i]-X[j]; dv = V[i]-V[j]
            rate = 2*dot(dl, dv)/dot(dl, dl)
            upd('chord rate', abs(rate - 2*d*ah/rho**2)/abs(2*ah/rho**2))
        # (4) individual azimuth rates and speeds, closed forms in the central angle sigma_j
        c = d*n
        a = (p - c)/rho
        bp = cross(n, a)
        for i in range(3):
            w = X[i] - c
            sig = mp.atan2(dot(w, bp), dot(w, a))   # central angle from p, orientation n
            # azimuth rate of x_i about p
            pxx = cross(p, X[i])
            phid = dot(pxx, V[i])/dot(pxx, pxx)
            sh, ch = mp.sin(sig/2), mp.cos(sig/2)
            phid_pred = bh/rho**2 - ah*sh*ch/(d**2*sh**2 + ch**2)
            upd('azimuth rate', abs(phid - phid_pred)/abs(bh/rho**2))
            K = bh*sh + ah*ch
            sp2 = 4*sh**2*(abs(mp.mpc(ah, bh))**2/rho**2 - K**2)
            upd('speed', abs(dot(V[i], V[i]) - sp2)/sp2)
        count += 1
print('configurations', count)
for k, v in worst.items():
    print('%-14s %s' % (k, mp.nstr(v, 5)))
