"""High-precision trajectory check with mpmath.odefun (Taylor series with extra precision;
a different method from the explorer's AD Taylor integrator). Compares cos(beta), psi and
chord ratios with the closed forms along a trajectory that crosses the great-circle state."""
import sys, time
import mpmath as mp
from mycore import *

dps = int(sys.argv[1]) if len(sys.argv) > 1 else 30
mp.mp.dps = dps
mu = mp.mpf(sys.argv[2]) if len(sys.argv) > 2 else mp.mpf(1)
b0 = mp.mpf(sys.argv[3]) if len(sys.argv) > 3 else mp.mpf('2.0')
cend = mp.mpf(sys.argv[4]) if len(sys.argv) > 4 else mp.mpf('0.9')
orient = int(sys.argv[5]) if len(sys.argv) > 5 else 1
G = [mp.mpf(1), mu, -mu/(1+mu)]
R = mp.mpf(1)
Z = planar_shape(G, mp.mpf('1.2'), mp.mpf('0.85'), orient)
pd = planar_data(Z, G)
ahat, bhat = pd['ahat'], pd['bhat']
print('mu', mu, 'ahat', mp.nstr(ahat, 25), 'bhat', mp.nstr(bhat, 25), 'P0', mp.nstr(abs(bhat)/(2*abs(ahat)), 25), 'self-sim spread', mp.nstr(pd['spread'], 3))
X0, n = place(Z, G, R, b0, mp.mpf(0))
sa = 1 if ahat < 0 else -1
nc0 = scl(sa, n)
cb0 = nc0[2]
beta0 = mp.acos(cb0)
S = sum(G)
def F(t, y):
    X = [y[0:3], y[3:6], y[6:9]]
    V = sphere_vel(X, G, R)
    return V[0] + V[1] + V[2]
y0 = X0[0] + X0[1] + X0[2]
t0 = time.time()
sol = mp.odefun(F, 0, y0)
T = (cend - cb0)/abs(ahat)
N = 24
maxc = 0; maxpsi = 0; maxr = 0; maxJ = 0
psi_prev = mp.atan2(nc0[1], nc0[0]); psi_unw = psi_prev; psi_start = psi_unw
def l2(X):
    return [dot(sub(X[0], X[1]), sub(X[0], X[1])), dot(sub(X[0], X[2]), sub(X[0], X[2])), dot(sub(X[1], X[2]), sub(X[1], X[2]))]
L0 = l2(X0)
N = 300
beta_end = mp.acos(cend)
u0 = mp.log(mp.tan(beta0/2)); u1 = mp.log(mp.tan(beta_end/2))
for k in range(1, N+1):
    uk = u0 + (u1 - u0)*k/N                      # sample uniformly in ln tan(beta/2) so psi unwraps
    bk = 2*mp.atan(mp.exp(uk))
    t = (mp.cos(bk) - cb0)/abs(ahat)
    y = sol(t)
    X = [y[0:3], y[3:6], y[6:9]]
    Nn = cross(sub(X[1], X[0]), sub(X[2], X[0]))
    no = scl(1/nrm(Nn), Nn)
    s_or = 1 if dot(no, n) > 0 else -1  # only valid at start; track by continuity below
    if k == 1:
        s_or0 = s_or
    nc = scl(sa*s_or0, no)
    cb = nc[2]
    beta = mp.acos(cb)
    ps = mp.atan2(nc[1], nc[0])
    dps_ = ps - psi_prev
    while dps_ > mp.pi: dps_ -= 2*mp.pi
    while dps_ < -mp.pi: dps_ += 2*mp.pi
    psi_unw += dps_; psi_prev = ps
    cpred = cb0 + abs(ahat)*t
    psipred = psi_start - (bhat/abs(ahat))*(mp.log(mp.tan(beta/2)) - mp.log(mp.tan(beta0/2)))
    L = l2(X)
    rr = max(abs(L[1]/L[0] - L0[1]/L0[0]), abs(L[2]/L[0] - L0[2]/L0[0]))
    J = scl(1/S, add(add(scl(G[0], X[0]), scl(G[1], X[1])), scl(G[2], X[2])))
    maxc = max(maxc, abs(cb - cpred)); maxpsi = max(maxpsi, abs(psi_unw - psipred)); maxr = max(maxr, rr)
    maxJ = max(maxJ, nrm(sub(J, [0, 0, 1])))
    if k % 50 == 0:
        print('t=%s cos(beta)=%s psi=%s  err cos %s  err psi %s' % (mp.nstr(t, 10), mp.nstr(cb, 12), mp.nstr(psi_unw, 15), mp.nstr(abs(cb-cpred), 3), mp.nstr(abs(psi_unw-psipred), 3)))
print('dps', dps, 'elapsed %.1fs' % (time.time() - t0))
print('max err cos(beta)', mp.nstr(maxc, 5), ' max err psi', mp.nstr(maxpsi, 5), ' max chord-ratio drift', mp.nstr(maxr, 5), ' max |J/S-p|', mp.nstr(maxJ, 5))
