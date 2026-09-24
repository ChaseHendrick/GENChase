# Direct time integration: check collapse time, winding and path length relations for the alpha model.
import numpy as np, mpmath as mp
from scipy.integrate import solve_ivp
from bs import analyse, positions
mp.mp.dps = 30
def run(alpha, r1, r2, r3):
    a = mp.mpf(alpha); be = 1 + a/2
    out = analyse(mp.mpf(r1), mp.mpf(r2), mp.mpf(r3), a)
    z = positions(mp.mpf(r1), mp.mpf(r2), mp.mpf(r3))
    if mp.re(out['kap']) > 0 or True:
        # analyse mirrors if needed; recompute orientation consistently
        from bs import vel
        v = vel(z, out['G'], a); kap = (v[1]-v[0])/(z[1]-z[0])
        if mp.re(kap) > 0: z = [mp.conj(w) for w in z]
        v = vel(z, out['G'], a); kap = (v[1]-v[0])/(z[1]-z[0])
    zs = z[0] - v[0]/kap
    G = np.array([float(g) for g in out['G']]); al = float(alpha)
    z0 = np.array([complex(w - zs) for w in z])   # collision point at origin
    P = float(out['P']); tc_pred = float(-1/(2*be*mp.re(kap))); w0 = float(mp.im(kap))
    def f(t, y):
        zz = y[:3] + 1j*y[3:6]
        vv = np.zeros(3, complex)
        for j in range(3):
            for k in range(3):
                if k != j:
                    d = zz[j]-zz[k]; vv[j] += 1j*G[k]*d*abs(d)**(-(2+al))
        sp = np.abs(vv)
        return np.concatenate([vv.real, vv.imag, sp])
    tend = tc_pred*(1-1e-9)
    y0 = np.concatenate([z0.real, z0.imag, np.zeros(3)])
    sol = solve_ivp(f, [0, tend], y0, method='DOP853', rtol=1e-13, atol=1e-22, dense_output=False)
    zz = sol.y[:3,-1] + 1j*sol.y[3:6,-1]
    s = np.abs(zz)/np.abs(z0)
    # shape drift: ratio z_j(t)/z_j(0) should be the same complex number for all j
    g = zz/z0
    drift = np.max(np.abs(g - g[0]))/np.abs(g[0])
    s_pred = (1 - tend/tc_pred)**(1/(2*float(be)))
    arcs = sol.y[6:9,-1]
    arc_pred = np.abs(z0)*np.sqrt(1+4*P**2)*(1 - s_pred)
    print('alpha', alpha, 'P=%.10f' % P, '|w0| tc_pred=%.10f  P/beta=%.10f' % (abs(w0)*tc_pred, P/float(be)))
    print('   shape drift at end %.2e ; s end %.6e vs predicted %.6e' % (drift, s[0], s_pred))
    print('   arc length / (r0 sqrt(1+4P^2)(1-s)) =', arcs/arc_pred)
    th = np.angle(g[0]); nturn_pred = float(mp.im(kap)/mp.re(kap))*np.log(s_pred)
    # unwrap angle: integrate along solution
    Z0 = sol.y[0] + 1j*sol.y[3]
    ang = np.unwrap(np.angle(Z0/z0[0]))
    print('   total rotation %.8f rad vs predicted (Im k/Re k) ln s = %.8f ; nfev %d' % (ang[-1], nturn_pred, sol.nfev))
for alpha, sides in [(1, (1.25, 0.4, 1.0)), (0.5, (1.1, 0.2, 1.0)), (2, (1.3, 0.6, 1.0)), (-0.5, (1.2, 0.3, 1.0)), (0, (1.2, 0.3, 1.0))]:
    run(alpha, *sides)
