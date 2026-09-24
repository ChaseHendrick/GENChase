"""Integrate the sphere equations from a self-similar configuration through the great-circle
state to near collapse (and backward to near the burst), and compare with the closed forms:
   d(t) = n.p = d0 - ahat t                      (cosine of oriented angular circumradius)
   psi  = psi0 + (bhat/ahat) [ln tan(beta/2) - ln tan(beta0/2)],  cos beta = d
   chord ratios constant, p = J/S fixed, all vortices -> p at d -> +-1.
Usage: python3 integrate_check.py mu theta d0 dfinal [direction]
"""
import sys, time
import mpmath as mp
from sphere_core import *
from taylor_int import step, evalser, evalder

mp.mp.dps = 45
mu = mp.mpf(sys.argv[1]); th = mp.mpf(sys.argv[2]); d0 = mp.mpf(sys.argv[3]); dfin = mp.mpf(sys.argv[4])
direction = int(sys.argv[5]) if len(sys.argv) > 5 else 1
G = [mp.mpf(1), mu, -mu/(1+mu)]
Z = gotoda_positions(mu, th)
ks, zc = planar_kappa(Z, G)
kap = ks[2]
Oc = circumcenter(*Z); rpl = abs(Z[0]-Oc)
ahat = kap.real*rpl**2; bhat = kap.imag*rpl**2
P0 = abs(bhat)/(2*abs(ahat))
print('mu', mu, 'theta', th, 'ahat', mp.nstr(ahat, 20), 'bhat', mp.nstr(bhat, 20), 'P0', mp.nstr(P0, 25))
X, p, n0, rho0, _ = place_on_sphere(Z, zc, d0, 0)
X = [[x[0], x[1], x[2]] for x in X]
S = sum(G)
def l2(X):
    return [sum((X[i][t]-X[j][t])**2 for t in range(3)) for (i, j) in [(0, 1), (0, 2), (1, 2)]]
L0 = l2(X)
def orient_n(X):
    Xm = [mp.matrix(x) for x in X]
    nn, _ = oriented_normal(Xm)
    return nn
sgn = 1 if dot(orient_n(X), n0) > 0 else -1
def azim(nn):
    return mp.atan2(nn[1], nn[0])
psi_prev = azim(sgn*orient_n(X)); psi_unw = psi_prev
beta0 = mp.acos(d0)
t = mp.mpf(0)
tol = mp.mpf(10)**(-42)
N = 36
maxerr = {'d': 0, 'psi': 0, 'ratio': 0, 'J': 0, 'unit': 0}
rows = []
t0 = time.time()
nsteps = 0
while True:
    xs, h = step(X, G, N, tol)
    h = h*direction
    Xn = evalser(xs, h)
    # predicted d at new time
    nn = sgn*orient_n(Xn)
    dn = nn[2]
    if (direction > 0 and dn > dfin) or (direction < 0 and dn < dfin):
        # shorten the step to land near dfin using the linear law (only to choose h)
        hh = (d0 - ahat*t - dfin)/ahat
        Xn = evalser(xs, hh); h = hh
        nn = sgn*orient_n(Xn); dn = nn[2]
        last = True
    else:
        last = False
    t += h; X = Xn; nsteps += 1
    # unwrap psi
    ps = azim(nn)
    dps = ps - psi_prev
    while dps > mp.pi: dps -= 2*mp.pi
    while dps < -mp.pi: dps += 2*mp.pi
    psi_unw += dps; psi_prev = ps
    # compare
    dpred = d0 - ahat*t
    beta = mp.acos(dn)
    psipred = (bhat/ahat)*(mp.log(mp.tan(beta/2)) - mp.log(mp.tan(beta0/2)))
    L = l2(X)
    ratio_err = max(abs(L[1]/L[0] - L0[1]/L0[0]), abs(L[2]/L[0] - L0[2]/L0[0]))
    J = [sum(G[i]*X[i][k] for i in range(3))/S for k in range(3)]
    Jerr = mp.sqrt((J[0])**2 + (J[1])**2 + (J[2]-1)**2)
    uerr = max(abs(sum(X[i][k]**2 for k in range(3)) - 1) for i in range(3))
    for key, val in [('d', abs(dn-dpred)), ('psi', abs(psi_unw-psipred)), ('ratio', ratio_err), ('J', Jerr), ('unit', uerr)]:
        if val > maxerr[key]: maxerr[key] = val
    maxdist = max(mp.sqrt(sum((X[i][k]-p[k])**2 for k in range(3))) for i in range(3))
    rows.append((t, dn, psi_unw, maxdist))
    if last:
        break
print('steps', nsteps, 'time %.1fs' % (time.time()-t0))
print('final t', mp.nstr(t, 25), ' predicted t to reach dfin', mp.nstr((d0-dfin)/ahat, 25))
print('final d', mp.nstr(rows[-1][1], 20), 'final psi', mp.nstr(rows[-1][2], 25), 'max dist to p', mp.nstr(rows[-1][3], 10))
for k, v in maxerr.items():
    print('max err', k, mp.nstr(v, 5))
# print a few rows
for r in rows[:: max(1, len(rows)//12)]:
    print('t=%s d=%s psi=%s maxdist=%s' % (mp.nstr(r[0], 12), mp.nstr(r[1], 12), mp.nstr(r[2], 12), mp.nstr(r[3], 6)))
