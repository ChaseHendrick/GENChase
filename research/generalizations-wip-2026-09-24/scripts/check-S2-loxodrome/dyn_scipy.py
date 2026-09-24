"""Global dynamic check in double precision with scipy DOP853 (independent integrator).
Start from a self-similar configuration at angle b0 (placement normal n at angle b0 from p),
integrate forward to near collapse and backward to near the burst, and compare with
   cos beta = 1 - |ahat| (t_c - t)/R^2,   psi = -(bhat/|ahat|) ln tan(beta/2) + C,
   burst and collapse at the same point p, lifetime 2 R^2/|ahat|.
"""
import sys
import numpy as np
import mpmath as mp
from scipy.integrate import solve_ivp
from mycore import planar_shape, planar_data, place

mp.mp.dps = 30

def rhs_factory(G, R):
    G = np.array(G, dtype=float)
    def f(t, y):
        X = y.reshape(3, 3)
        V = np.zeros((3, 3))
        for i in range(3):
            for j in range(3):
                if j != i:
                    d = X[i] - X[j]
                    V[i] += G[j]*np.cross(X[j], X[i])/d.dot(d)
        return (V/(2*np.pi*R)).ravel()
    return f

def run(name, G, l13, l23, orient, R, b0):
    Gm = [mp.mpf(g) for g in G]
    Z = planar_shape(Gm, mp.mpf(l13), mp.mpf(l23), orient)
    pd = planar_data(Z, Gm)
    ahat, bhat = float(pd['ahat']), float(pd['bhat'])
    P0 = abs(bhat)/(2*abs(ahat))
    Xm, n = place(Z, Gm, mp.mpf(R), mp.mpf(b0), mp.mpf(0))
    y0 = np.array([[float(c) for c in x] for x in Xm]).ravel()
    nplace = np.array([float(c) for c in n])
    sa = 1.0 if ahat < 0 else -1.0
    p = np.array([0, 0, R], dtype=float)
    S = sum(G)
    f = rhs_factory(G, R)
    # sign relating the orientation normal to the placement normal
    X0 = y0.reshape(3, 3)
    N0 = np.cross(X0[1]-X0[0], X0[2]-X0[0]); s_or = np.sign(N0.dot(nplace))
    cb0 = sa*np.cos(b0)                     # cos beta at t = 0
    tc = R**2*(1 - cb0)/abs(ahat)           # predicted time to collapse
    tb = -R**2*(1 + cb0)/abs(ahat)          # predicted burst time (negative)
    out = []
    for direction, tend in [(1, tc*(1 - 1e-7) ), (-1, tb*(1 - 1e-7))]:
        # stop well before the singular time: remaining time fraction chosen so rho/R ~ 1e-3
        frac = 1 - 5e-7*R**2/abs(tend)*0 - (1e-6 if direction > 0 else 1e-6)
        tstop = (tc - R**2*1e-6/abs(ahat)) if direction > 0 else (tb + R**2*1e-6/abs(ahat))
        sol = solve_ivp(f, (0, tstop), y0, method='DOP853', rtol=1e-13, atol=1e-15, dense_output=False,
                        t_eval=(np.concatenate([[0.0], (tc - tc*np.geomspace(1, (tc - tstop)/tc, 6001))[1:]]) if direction > 0 else np.concatenate([[0.0], (tb - tb*np.geomspace(1, (tb - tstop)/tb, 6001))[1:]])))
        ts = sol.t; Y = sol.y.T
        errc = 0; errpsi = 0; errJ = 0; errratio = 0
        psi_prev = None; psi_unw = 0
        L0 = None
        for k in range(len(ts)):
            X = Y[k].reshape(3, 3)
            N = np.cross(X[1]-X[0], X[2]-X[0]); no = N/np.linalg.norm(N)
            nc = sa*s_or*no
            cb = nc[2]; beta = np.arctan2(np.hypot(nc[0], nc[1]), nc[2])
            ps = np.arctan2(nc[1], nc[0])
            if psi_prev is None:
                psi_unw = ps
            else:
                dps = (ps - psi_prev + np.pi) % (2*np.pi) - np.pi
                psi_unw += dps
            psi_prev = ps
            if k == 0:
                psi0 = psi_unw; C = psi0 + (bhat/abs(ahat))*np.log(np.tan(beta/2))
            cpred = 1 - abs(ahat)*(tc - ts[k])/R**2
            errc = max(errc, abs(cb - cpred))
            psipred = -(bhat/abs(ahat))*np.log(np.tan(beta/2)) + C
            errpsi = max(errpsi, abs(psi_unw - psipred)/max(1, abs(psi_unw - psi0)))
            J = (G[0]*X[0] + G[1]*X[1] + G[2]*X[2])/S
            errJ = max(errJ, np.linalg.norm(J - p)/R)
            L = np.array([np.sum((X[0]-X[1])**2), np.sum((X[0]-X[2])**2), np.sum((X[1]-X[2])**2)])
            if L0 is None: L0 = L/L[0]
            errratio = max(errratio, np.max(np.abs(L/L[0] - L0)))
        maxdist = max(np.linalg.norm(Y[-1].reshape(3, 3)[i] - p) for i in range(3))/R
        out.append((direction, ts[-1], cb, beta, psi_unw - psi0, errc, errpsi, errJ, errratio, maxdist, sol.status))
    print('%s  R=%g b0=%g orient=%d ahat=%.6g bhat=%.6g P0=%.6g  predicted lifetime 2R^2/|ahat| = %.10g' % (name, R, b0, orient, ahat, bhat, P0, 2*R**2/abs(ahat)))
    for o in out:
        print('   dir %+d  t_end=%.10g  cos(beta)_end=%.12f  beta_end=%.3e  total dpsi=%.6f  max|cos err|=%.2e  max psi err(rel)=%.2e  |J/S-p|=%.1e  ratio err=%.1e  max|x_i-p|/R=%.3e status=%d' % o)
    print('   integrated span (t_end fwd - t_end bwd) = %.10g ; + 2e-6 R^2/|ahat| = %.10g' % (out[0][1] - out[1][1], out[0][1] - out[1][1] + 2e-6*R**2/abs(ahat)))

cases = [
    ('mu=0.5', [1, 0.5, -0.5/1.5], 1.0, 0.8, 1, 1.0, 2.0),
    ('mu=0.5', [1, 0.5, -0.5/1.5], 1.0, 0.8, -1, 1.0, 0.4),
    ('mu=1', [1, 1, -0.5], 1.3, 0.9, 1, 1.0, 1.0),
    ('mu=0.05', [1, 0.05, -0.05/1.05], 0.9, 0.3, -1, 1.0, 2.8),
    ('(-10,-15,6)', [-10, -15, 6], 1.1, 0.7, 1, 2.5, 1.2),
    ('(1,-0.3,3/7)', [1, -0.3, 3/7], 1.0, 1.5, -1, 0.7, 2.0),
]
for c in cases:
    Gm = [mp.mpf(g) for g in c[1]]
    if planar_shape(Gm, mp.mpf(c[2]), mp.mpf(c[3]), c[4]) is None:
        print('skip (not a triangle)', c); continue
    run(*c)
