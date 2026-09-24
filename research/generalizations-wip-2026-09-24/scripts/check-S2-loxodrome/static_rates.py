"""Static 50-digit check of the instantaneous laws behind S2:
   d(cos beta)/dt = |ahat|/R^2,  dpsi/dt = bhat/(R^2 sin^2 beta)  (sign to be reported),
   tan(angle to meridian) = sin(beta)|dpsi/dbeta| = 2 P0,
   chord ratios stationary, p = J/S fixed and on the sphere, motion a similarity about p.
Configurations built by my own construction (side lengths with L = 0, both orientations).
"""
import random
import mpmath as mp
from mycore import *

mp.mp.dps = 50
random.seed(20260924)

Gs = []
for mu in ['0.01', '0.1', '0.5', '1', '3']:
    m = mp.mpf(mu)
    Gs.append(('mu=' + mu, [mp.mpf(1), m, -m/(1+m)]))
Gs.append(('(-10,-15,6)', [mp.mpf(-10), mp.mpf(-15), mp.mpf(6)]))
Gs.append(('(1,-0.3,3/7)', [mp.mpf(1), mp.mpf('-0.3'), mp.mpf(3)/7]))

worst = {}
def upd(k, v):
    v = abs(v)
    if k not in worst or v > worst[k]:
        worst[k] = v

count = 0
signs = set()
for name, G in Gs:
    M = G[0]*G[1] + G[0]*G[2] + G[1]*G[2]
    upd('M=sum GiGj', M)
    S = sum(G)
    nshape = 0
    tries = 0
    while nshape < 6 and tries < 2000:
        tries += 1
        l13 = mp.mpf(random.uniform(0.05, 3)); l23 = mp.mpf(random.uniform(0.05, 3))
        orient = 1 if nshape % 2 == 0 else -1
        Z = planar_shape(G, l13, l23, orient)
        if Z is None:
            continue
        pd = planar_data(Z, G)
        if abs(pd['ahat']) < mp.mpf('1e-6'):
            continue
        nshape += 1
        upd('planar self-sim spread', pd['spread'])
        upd('planar L', pd['L'])
        upd('zc on circumcircle', pd['zc_on_circle'])
        ahat, bhat = pd['ahat'], pd['bhat']
        P0 = abs(bhat)/(2*abs(ahat))
        area = ((Z[1]-Z[0])*mp.conj(Z[2]-Z[0])).imag * -1  # Im(conj(a) b) sign = orientation
        for R in [mp.mpf(1), mp.mpf('2.5')]:
            for b in [mp.mpf('1e-4'), mp.mpf('0.03'), mp.mpf('0.7'), mp.pi/2, mp.mpf('2.2'), mp.pi - mp.mpf('0.02'), mp.pi - mp.mpf('1e-4')]:
                for psi in [mp.mpf(0), mp.mpf('1.3'), mp.mpf('-2.9')]:
                    X, n = place(Z, G, R, b, psi)
                    p = [mp.mpf(0), mp.mpf(0), R]
                    count += 1
                    for x in X:
                        upd('|x|-R', nrm(x) - R)
                    J = scl(1/S, add(add(scl(G[0], X[0]), scl(G[1], X[1])), scl(G[2], X[2])))
                    upd('J/S - p', nrm(sub(J, p))/R)
                    V = sphere_vel(X, G, R)
                    for x, v in zip(X, V):
                        upd('x.v', dot(x, v)/(R*nrm(v)))
                    no, nd = orient_normal_and_rate(X, V)
                    # orientation normal equals +-n
                    sgn_or = 1 if dot(no, n) > 0 else -1
                    upd('orient normal = +-n', nrm(sub(no, scl(sgn_or, n))))
                    sa = 1 if ahat < 0 else -1          # sign(-ahat)
                    nc = scl(sa*sgn_or, no); ncd = scl(sa*sgn_or, nd)   # = sign(-ahat) n, n the normal that views the chord triangle as Z
                    cb = nc[2]; sb = mp.sqrt(nc[0]**2 + nc[1]**2)
                    rate_cos = ncd[2]
                    upd('dcos/dt - |ahat|/R^2  (rel)', (rate_cos - abs(ahat)/R**2)/(abs(ahat)/R**2))
                    # azimuth rate of nc about e3
                    ez = [mp.mpf(0), mp.mpf(0), mp.mpf(1)]
                    psid = dot(cross(ez, nc), ncd)/(sb**2)
                    pred = bhat/(R**2*sb**2)
                    upd('dpsi/dt - bhat/(R^2 sin^2 b) (rel)', (psid - pred)/pred)
                    signs.add((mp.sign(psid) == mp.sign(bhat)))
                    # loxodrome angle: tan alpha = sin(beta)|dpsi/dbeta|, dbeta/dt = -rate_cos/sin(beta)
                    betad = -rate_cos/sb
                    tanal = sb*abs(psid/betad)
                    upd('tan(angle to meridian) - 2P0 (rel)', (tanal - 2*P0)/(2*P0))
                    # chord ratios stationary
                    rates = []
                    for (i, j) in [(0, 1), (0, 2), (1, 2)]:
                        dx = sub(X[i], X[j]); dv = sub(V[i], V[j])
                        rates.append(2*dot(dx, dv)/dot(dx, dx))
                    # expected common log-rate: d ln rho^2/dt = 2 d ahat/(rho^2) in unit-sphere time / R^2
                    dval = dot(no, p)/R
                    rho2 = 1 - dval**2
                    exp_rate = 2*dval*ahat/(rho2*R**2) * (1 if sgn_or == (1 if area > 0 else -1) else -1)
                    scale = abs(ahat)/R**2
                    upd('chord log-rate spread', (max(rates) - min(rates))/scale)
                    # similarity fit about p: v = s w + Om x w, w = x - p; 9 eqs, 4 unknowns
                    rows = []; rhs = []
                    for x, v in zip(X, V):
                        w = sub(x, p)
                        Mx = [[w[0], 0, w[2], -w[1]], [w[1], -w[2], 0, w[0]], [w[2], w[1], -w[0], 0]]
                        for k in range(3):
                            rows.append(Mx[k]); rhs.append(v[k])
                    A = mp.matrix(rows); bb = mp.matrix(rhs)
                    sol = mp.lu_solve(A.T*A, A.T*bb)
                    res = A*sol - bb
                    upd('similarity-about-p residual', mp.sqrt(sum(res[k]**2 for k in range(9)))/mp.sqrt(sum(bb[k]**2 for k in range(9))))
                    Om = [sol[1], sol[2], sol[3]]
                    upd('Om.phat - psidot (rel)', (Om[2] - psid)/psid)
print('configurations', count)
print('orientation normal sign relative to placement normal equals sign of planar area: checked via n_c choice')
print('psi-rate sign equals sign(bhat) in all cases (azimuth right-handed about p):', signs)
for k, v in worst.items():
    print('%-42s %s' % (k, mp.nstr(v, 5)))
