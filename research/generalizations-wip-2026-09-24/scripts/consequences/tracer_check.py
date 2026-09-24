"""Check that a tracer placed at a zero of W moves exactly self-similarly with the vortices:
integrate vortices + tracer with the full Biot-Savart law (mpmath odefun, 30 digits) and compare
x(t) with lambda(t) e^{i phi(t)} xi*, lambda^2 = 1 - t/t_c, phi = -Im(k) t_c ln(1 - t/t_c)."""
from tracers import *
from core import gammas, positions, kappa_bs, P_of, theta0
mp.mp.dps = 30
for mu, th in [(mp.mpf(1), mp.pi+mp.acos(mp.mpf(1)/3)/2), (mp.mpf('0.5'), mp.mpf('3.5329573213217826977'))]:
    G, z, k, sp = config(mu, th)
    deg, roots, zeros = stagnation(G, z, k)
    tc = -1/(2*k.real)
    for (xs, ind, r) in zeros:
        def F(t, y):
            zz = [mp.mpc(y[0], y[1]), mp.mpc(y[2], y[3]), mp.mpc(y[4], y[5])]
            x = mp.mpc(y[6], y[7])
            out = []
            for j in range(3):
                s = sum(G[kk]/(zz[j]-zz[kk]) for kk in range(3) if kk != j)
                v = mp.conj(s/(2j*mp.pi)); out += [v.real, v.imag]
            s = sum(G[kk]/(x-zz[kk]) for kk in range(3))
            v = mp.conj(s/(2j*mp.pi)); out += [v.real, v.imag]
            return out
        y0 = []
        for zz in z: y0 += [zz.real, zz.imag]
        y0 += [xs.real, xs.imag]
        sol = mp.odefun(F, 0, y0)
        worst = 0
        for f in ['0.3', '0.6', '0.9']:
            t = tc*mp.mpf(f)
            y = sol(t)
            lam2 = 1 - t/tc
            rot = mp.expj(-k.imag*tc*mp.log(1-t/tc))
            pred = mp.sqrt(lam2)*rot*xs
            x = mp.mpc(y[6], y[7])
            zpred = mp.sqrt(lam2)*rot*z[2]
            worst = max(worst, abs(x-pred)/abs(pred), abs(mp.mpc(y[4], y[5])-zpred)/abs(zpred))
        print('mu=%s P=%s xi*=%s index=%+d  max rel. deviation from self-similar (tracer & vortex 3) up to 0.9 t_c: %s  | path angle arctan(2P)=%s deg' % (
            mp.nstr(mu, 3), mp.nstr(P_of(k), 10), mp.nstr(xs, 8), ind, mp.nstr(worst, 3), mp.nstr(mp.degrees(mp.atan(2*P_of(k))), 8)), flush=True)
