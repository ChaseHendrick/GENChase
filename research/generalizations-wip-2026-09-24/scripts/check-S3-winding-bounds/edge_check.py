"""Edge checks: (i) the equilateral zero-impulse chord triangle on the sphere is a relative
equilibrium (chords constant), so it is a zero-impulse, non-collinear shape that never collapses;
(ii) contrast: winding of an individual vortex's azimuth about the collision point p per unit
ln chord^2, versus the pole azimuth psi used in the claim (to make the definition explicit)."""
import mpmath as mp, random
import static_check as S
mp.mp.dps = 50
random.seed(7)
for mu in [mp.mpf('0.5'), mp.mpf(1), mp.mpf('0.01')]:
    G = [mp.mpf(1), mu, -mu/(1+mu)]
    Z = [mp.mpc(0), mp.mpc(1), mp.mpc(mp.mpf(1)/2, mp.sqrt(3)/2)]
    L = sum(G[i]*G[j]*abs(Z[i]-Z[j])**2 for i in range(3) for j in range(i+1, 3))
    for beta in [mp.mpf('0.3'), mp.mpf('1.2'), mp.mpf('2.5')]:
        D = S.build(G, Z, beta, mp.mpf(1))
        X = D['X']; V = S.sphere_vel(X, G, mp.mpf(1))
        rates = []
        for (i, j) in [(0, 1), (0, 2), (1, 2)]:
            d = S.sub(X[i], X[j]); rates.append(2*S.dot(d, S.sub(V[i], V[j])))
        speed = max(S.nrm(v) for v in V)
        print('equilateral mu=%s beta=%s: impulse L=%s, planar Re k=%s, max |d l^2/dt| = %s (vortex speed %s), |p|-1 = %s'
              % (mp.nstr(mu, 3), mp.nstr(beta, 3), mp.nstr(L, 3), mp.nstr(D['kpl'].real, 3), mp.nstr(max(abs(r) for r in rates), 3), mp.nstr(speed, 5), mp.nstr(abs(S.nrm(D['p'])-1), 3)))

print()
print('individual-vortex azimuth about p per unit ln chord^2 vs pole psi (minimizing-like shape, mu=0.01)')
mu = mp.mpf('0.01'); G = [mp.mpf(1), mu, -mu/(1+mu)]
r = mp.sqrt(1+mu+mu**2)/(1+mu)
# near-minimizing shape on the small-P arc (from planar_floor: th in (0, th0))
import planar_floor as PF
Pm, thm = PF.arc_min(mu, mp.mpf(0), mp.acos((mp.mpf(1)/2 - mu/(1+mu))/r))
Z = [mp.mpc(0), mp.mpc(1), mu/(1+mu)+r*mp.expj(thm)]
for beta in [mp.mpf('0.01'), mp.mpf('0.3'), mp.mpf('0.8'), mp.mpf('1.2'), mp.mpf('1.5')]:
    D = S.build(G, Z, beta, mp.mpf(1)); X = D['X']; p = D['p']; V = S.sphere_vel(X, G, mp.mpf(1))
    d = S.sub(X[0], X[1]); lnl2dot = 2*S.dot(d, S.sub(V[0], V[1]))/S.dot(d, d)
    row = []
    for i in range(3):
        w = S.sub(X[i], p); ph = p
        az = S.dot(V[i], S.cross(ph, w))/(S.dot(w, w)-S.dot(w, ph)**2)
        row.append(mp.nstr(abs(az/lnl2dot), 8))
    out = S.analyse(G, D, beta, mp.mpf(1))
    print('beta=%-5s pole m1=%s  floor P0 sec(beta)=%s  vortex azimuth windings %s' % (mp.nstr(beta, 3), mp.nstr(out['m1'], 8), mp.nstr(D['P0']/mp.cos(beta), 8), row))
