# Static checks of the reduction: sphere Biot-Savart at configurations built from planar shapes.
import mpmath as mp, random
from sphere_core import *
mp.mp.dps = 50
random.seed(1)
worst = {k: mp.mpf(0) for k in ['onS','pJ','ss','s','Omp','dd','psidot','zcirc']}
N = 0
for trial in range(60):
    mu = mp.mpf(random.uniform(0.02, 1.0))
    th = mp.mpf(random.uniform(0.01, 2*mp.pi-0.01))
    Z = gotoda_positions(mu, th)
    G = [mp.mpf(1), mu, -mu/(1+mu)]
    ks, zc = planar_kappa(Z, G)
    kap = ks[2]
    Oc = circumcenter(*Z); rpl = abs(Z[0]-Oc)
    worst['zcirc'] = max(worst['zcirc'], abs(abs(zc-Oc)-rpl)/rpl)
    ahat = kap.real*rpl**2; bhat = kap.imag*rpl**2
    for dval in [mp.mpf(random.uniform(-0.999, 0.999)) for _ in range(3)]:
        psi0 = mp.mpf(random.uniform(0, 6.28))
        X, p, n, rho, _ = place_on_sphere(Z, zc, dval, psi0)
        V = sphere_vel(X, G)
        S = sum(G)
        J = sum((g*x for g, x in zip(G[1:], X[1:])), G[0]*X[0])
        worst['onS'] = max(worst['onS'], max(abs(norm(x)-1) for x in X))
        worst['pJ'] = max(worst['pJ'], norm(J/S - p))
        s, Om, res = fit_similarity(X, V, p)
        worst['ss'] = max(worst['ss'], res)
        kr = kap*(rpl/rho)**2  # planar kappa at circumradius rho
        worst['s'] = max(worst['s'], abs(s - dval*kr.real)/abs(kr))
        worst['Omp'] = max(worst['Omp'], abs(dot(Om, p) - kr.imag)/abs(kr))
        # normal and its rate (orientation: sign so that n matches construction)
        nn, nd = normal_rate(X, V)
        sg = 1 if dot(nn, n) > 0 else -1
        nn = sg*nn; nd = sg*nd
        worst['dd'] = max(worst['dd'], abs(dot(nd, p) + ahat)/abs(ahat+1j*bhat))
        # azimuthal rate of n about p
        pxn = cross(p, nn)
        psidot = dot(cross(p, nn), nd)/dot(pxn, pxn)  # d(psi)/dt for rotation about p
        worst['psidot'] = max(worst['psidot'], abs(psidot - kr.imag)/abs(kr))
        N += 1
print('configs', N)
for k, v in worst.items():
    print(k, mp.nstr(v, 5))
