"""Side check: does a single vortex's own azimuth about p obey the transferred floor (sqrt3/2) sec(beta)?
(Not claimed by S3, whose psi is the circumcircle-pole azimuth; this documents the scope.)"""
import mpmath as mp
import static_check as S, planar_floor as PF
mp.mp.dps = 50
for mus in ['1e-3', '1e-4']:
    mu = mp.mpf(mus); G = [mp.mpf(1), mu, -mu/(1+mu)]
    r = mp.sqrt(1+mu+mu**2)/(1+mu)
    Pm, thm = PF.arc_min(mu, mp.mpf(0), mp.acos((mp.mpf(1)/2 - mu/(1+mu))/r))
    Z = [mp.mpc(0), mp.mpc(1), mu/(1+mu)+r*mp.expj(thm)]
    for beta in [mp.mpf('0.3'), mp.mpf('0.8'), mp.mpf('1.2')]:
        D = S.build(G, Z, beta, mp.mpf(1)); X = D['X']; p = D['p']; V = S.sphere_vel(X, G, mp.mpf(1))
        d = S.sub(X[0], X[1]); lnl2dot = 2*S.dot(d, S.sub(V[0], V[1]))/S.dot(d, d)
        ws = []
        for i in range(3):
            w = S.sub(X[i], p)
            az = S.dot(V[i], S.cross(p, w))/(S.dot(w, w)-S.dot(w, p)**2)
            ws.append(abs(az/lnl2dot))
        floor = (mp.sqrt(3)/2)/mp.cos(beta)
        print('mu=%s beta=%s P0=%s pole=%s floor=%s vortex1=%s  (vortex1-floor)/floor=%s' % (mus, mp.nstr(beta,3), mp.nstr(D['P0'],12), mp.nstr(D['P0']/mp.cos(beta),12), mp.nstr(floor,12), mp.nstr(ws[0],12), mp.nstr((ws[0]-floor)/floor,4)))
