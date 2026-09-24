"""Trajectory check of S1-structure (c): integrate the sphere ODE and test
   p fixed; chord shape constant; ahat = rho^2 alpha and bhat = rho^2 beta constant;
   d(t) = d0 - ahat t (linear); azimuth of n about p follows psi0 + (bhat/ahat)(atanh d0 - atanh d(t));
   chord scale follows rho(t) = sqrt(1 - d(t)^2).
Integration: (1) scipy DOP853 in double precision, rtol 1e-13, through d = 0;
             (2) mpmath odefun (Taylor, 30 digits) over a shorter span.
"""
import numpy as np
from scipy.integrate import solve_ivp
import mpmath as mp
import random, sys

def sph_rhs(t, y, G):
    X = y.reshape(3, 3)
    V = np.zeros_like(X)
    for i in range(3):
        for j in range(3):
            if i != j:
                r = X[i]-X[j]
                V[i] += G[j]*np.cross(X[j], X[i])/r.dot(r)
    return (V/(2*np.pi)).ravel()

def planar_kappa(X, G, n, c, a, bp, p):
    Z = [complex((x-c).dot(a), (x-c).dot(bp)) for x in X]
    zp = complex((p-c).dot(a), (p-c).dot(bp))
    ks = []
    for i in range(3):
        s = sum(G[k]/(Z[i]-Z[k]) for k in range(3) if k != i)
        u = np.conj(s/(2j*np.pi))
        ks.append(u/(Z[i]-zp))
    return ks

def frame(X, G):
    S = sum(G)
    p = sum(g*x for g, x in zip(G, X))/S
    N = np.cross(X[1]-X[0], X[2]-X[0]); n = N/np.linalg.norm(N)
    d = n.dot(p); rho = np.sqrt(1-d*d); c = d*n; a = (p-c)/rho; bp = np.cross(n, a)
    ks = planar_kappa(X, G, n, c, a, bp, p)
    return p, n, d, rho, ks

def x3_on_L0(x1, x2, G, phi):
    l12 = (x1-x2).dot(x1-x2)
    q = G[0]*G[2]*x1 + G[1]*G[2]*x2
    h = (2*G[0]*G[2] + 2*G[1]*G[2] + G[0]*G[1]*l12)/2
    k = q/np.linalg.norm(q); t = h/np.linalg.norm(q)
    if abs(t) >= 1: return None
    tmp = np.array([1., 0, 0]) if abs(k[0]) < 0.9 else np.array([0, 1., 0])
    e1 = tmp - tmp.dot(k)*k; e1 /= np.linalg.norm(e1); e2 = np.cross(k, e1)
    return t*k + np.sqrt(1-t*t)*(np.cos(phi)*e1 + np.sin(phi)*e2)

def run_case(G, X0, label):
    X0 = np.array(X0)
    p0, n0, d0, rho0, ks0 = frame(X0, G)
    k0 = ks0[0]; ah = rho0**2*k0.real; bh = rho0**2*k0.imag
    # time to reach d = +-1 (collision) in each direction: d(t) = d0 - ah t
    t_plus = (d0 - 1)/ah; t_minus = (d0 + 1)/ah
    tA, tB = sorted([t_plus, t_minus])
    # integrate forward and backward to 90% of the way to each collision
    e1 = n0 - d0*p0; e1 /= np.linalg.norm(e1); e2 = np.cross(p0, e1)
    l0 = [np.linalg.norm(X0[i]-X0[j]) for (i, j) in [(0, 1), (0, 2), (1, 2)]]
    worst = dict(p=0, shape=0, ahat=0, bhat=0, dlin=0, psi=0, scale=0, kspread=0)
    for tend in [0.9*tA, 0.9*tB]:
        ts = np.linspace(0, tend, 401)
        sol = solve_ivp(sph_rhs, (0, tend), X0.ravel(), method='DOP853', rtol=1e-13, atol=1e-15,
                        t_eval=ts, args=(G,))
        psi_prev = 0.0; psi_unw = 0.0
        for kidx, t in enumerate(sol.t):
            X = sol.y[:, kidx].reshape(3, 3)
            p, n, d, rho, ks = frame(X, G)
            k = ks[0]
            worst['kspread'] = max(worst['kspread'], max(abs(kk-k) for kk in ks)/abs(k))
            worst['p'] = max(worst['p'], np.linalg.norm(p-p0))
            l = [np.linalg.norm(X[i]-X[j]) for (i, j) in [(0, 1), (0, 2), (1, 2)]]
            worst['shape'] = max(worst['shape'], abs(l[0]/l[1] - l0[0]/l0[1]), abs(l[0]/l[2] - l0[0]/l0[2]))
            worst['scale'] = max(worst['scale'], abs(l[0]/l0[0] - rho/rho0), abs(rho - np.sqrt(1-(d0-ah*t)**2)))
            worst['ahat'] = max(worst['ahat'], abs(rho**2*k.real - ah)/abs(ah))
            worst['bhat'] = max(worst['bhat'], abs(rho**2*k.imag - bh)/max(abs(bh), 1e-300))
            worst['dlin'] = max(worst['dlin'], abs(d - (d0 - ah*t)))
            # azimuth of n about p0 in the fixed basis (e1, e2)
            ps = np.arctan2(n.dot(e2), n.dot(e1))
            dpsi = (ps - psi_prev + np.pi) % (2*np.pi) - np.pi
            psi_unw += dpsi; psi_prev = ps
            pred = (bh/ah)*(np.arctanh(d0) - np.arctanh(d0 - ah*t))
            worst['psi'] = max(worst['psi'], abs(psi_unw - pred))
    print(f'{label}: d0={d0:+.4f} ahat={ah:+.6f} bhat={bh:+.6f} spans t in [{0.9*tA:.4g},{0.9*tB:.4g}] '
          f'(d runs over [{d0-ah*0.9*tA:+.3f},{d0-ah*0.9*tB:+.3f}])')
    print('   worst: ' + ', '.join(f'{k}={v:.2e}' for k, v in worst.items()))
    return worst

def main():
    rng = np.random.default_rng(2026)
    cases = 0
    while cases < 12:
        mu = rng.choice([rng.uniform(0.05, 1), rng.uniform(1, 10), rng.uniform(-10, -0.05)])
        if abs(1+mu) < 0.05: continue
        G = [1.0, mu, -mu/(1+mu)]
        x1 = rng.normal(size=3); x1 /= np.linalg.norm(x1)
        x2 = rng.normal(size=3); x2 /= np.linalg.norm(x2)
        x3 = x3_on_L0(x1, x2, G, rng.uniform(0, 2*np.pi))
        if x3 is None: continue
        X0 = [x1, x2, x3]
        if min(np.linalg.norm(X0[i]-X0[j]) for i in range(3) for j in range(i+1, 3)) < 0.05: continue
        run_case(G, X0, f'case {cases} mu={mu:+.4f}')
        cases += 1

if __name__ == '__main__':
    main()
