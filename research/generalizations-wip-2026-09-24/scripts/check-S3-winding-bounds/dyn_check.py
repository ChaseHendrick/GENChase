"""Integrate the sphere Biot-Savart ODE through a whole burst -> great circle -> collapse
trajectory and compare with the closed forms implied by the claim:
   cos beta(t) = cos beta0 - K a t,         (a = Re kappa * r^2 of the planar chord shape, < 0)
   psi(t) - psi0 = (b/a) [ln tan(beta/2) - ln tan(beta0/2)]   (pole azimuth about p: loxodrome)
   chords l_ij(t) proportional to sin beta(t);  t_c = (1 - cos beta0)/(K |a|)
and measure (2) |omega|(t_c - t) against P0 sec^2(beta/2), with t_c taken from the fitted
(numerical) end of the trajectory rather than from the formula.
Double precision DOP853 (rtol 1e-13) for many cases, plus one mpmath Taylor integration at 30 digits.
"""
import numpy as np
import mpmath as mp
from scipy.integrate import solve_ivp
import random
import static_check as S

def rhs_np(t, y, G, R):
    X = y.reshape(3, 3)
    V = np.zeros_like(X)
    for i in range(3):
        for j in range(3):
            if i != j:
                d = X[i]-X[j]
                V[i] += G[j]*np.cross(X[j], X[i])/d.dot(d)
    return (V/(2*np.pi*R)).ravel()

def geom(X, p, sgn, R, e_a, e_b):
    N = np.cross(X[1]-X[0], X[2]-X[0]); n = sgn*N/np.linalg.norm(N)
    ph = p/R
    cb = n.dot(ph)
    psi = np.arctan2(n.dot(e_b), n.dot(e_a))
    l = [np.linalg.norm(X[0]-X[1]), np.linalg.norm(X[0]-X[2]), np.linalg.norm(X[1]-X[2])]
    return cb, psi, l

def run_case(mu, th, beta0, R, seed):
    random.seed(seed)
    mp.mp.dps = 30
    mu = mp.mpf(mu)
    G = [mp.mpf(1), mu, -mu/(1+mu)]
    r = mp.sqrt(1+mu+mu**2)/(1+mu)
    Z = [mp.mpc(0), mp.mpc(1), mu/(1+mu)+r*mp.expj(th)]
    D = S.build(G, Z, mp.mpf(beta0), mp.mpf(R))
    X0 = np.array([[float(c) for c in x] for x in D['X']])
    p = np.array([float(c) for c in D['p']]); n0 = np.array([float(c) for c in D['n']])
    N = np.cross(X0[1]-X0[0], X0[2]-X0[0]); sgn = 1.0 if N.dot(n0) > 0 else -1.0
    a, b, P0 = float(D['a']), float(D['b']), float(D['P0'])
    K = 1/R**2
    ph = p/R
    tmp = np.array([0.3, -0.7, 0.2]); e_a = tmp - tmp.dot(ph)*ph; e_a /= np.linalg.norm(e_a); e_b = np.cross(ph, e_a)
    tc_pred = (1-np.cos(beta0))/(K*abs(a))
    Gf = [float(g) for g in G]
    ts = np.unique(np.concatenate([np.linspace(0, tc_pred*0.99, 40001), tc_pred*(1-np.logspace(-2, -4, 20001))]))
    sol = solve_ivp(rhs_np, (0, ts[-1]), X0.ravel(), method='DOP853', t_eval=ts, rtol=1e-13, atol=1e-15, args=(Gf, R))
    cb0, psi0, l0 = geom(X0, p, sgn, R, e_a, e_b)
    errs = dict(cos=0, psi=0, chord=0, m2=0, m1=0, radius=0, int_omega_vs_psi=0)
    psi_prev = psi0; unwrap = 0.0
    cbs, psis, tt = [], [], []
    for k, t in enumerate(sol.t):
        X = sol.y[:, k].reshape(3, 3)
        errs['radius'] = max(errs['radius'], max(abs(np.linalg.norm(x)-R) for x in X))
        cb, psi, l = geom(X, p, sgn, R, e_a, e_b)
        d = psi - psi_prev
        if d > np.pi: unwrap -= 2*np.pi
        if d < -np.pi: unwrap += 2*np.pi
        psi_prev = psi
        psi_u = psi + unwrap
        cbs.append(cb); psis.append(psi_u); tt.append(t)
        beta = np.arccos(cb)
        errs['cos'] = max(errs['cos'], abs(cb - (np.cos(beta0) - K*a*t)))
        psi_pred = psi0 + (b/a)*(np.log(np.tan(beta/2)) - np.log(np.tan(beta0/2)))
        errs['psi'] = max(errs['psi'], abs(psi_u - psi_pred))
        for q in range(3):
            errs['chord'] = max(errs['chord'], abs(l[q]/l0[q] - np.sin(beta)/np.sin(beta0))/(np.sin(beta)/np.sin(beta0)))
    cbs = np.array(cbs); psis = np.array(psis); tt = np.array(tt)
    # numerical t_c: linear fit of cos beta, solve = 1
    A = np.vstack([np.ones_like(tt), tt]).T
    c0, c1 = np.linalg.lstsq(A, cbs, rcond=None)[0]
    tc_num = (1-c0)/c1
    # numerical omega by finite differences of psi, measure (2) and (1) over interior samples
    om = np.zeros(len(tt)); dl = np.zeros(len(tt))
    for k in range(len(tt)):
        X = sol.y[:, k].reshape(3, 3); V = rhs_np(0, sol.y[:, k], Gf, R).reshape(3, 3)
        N = np.cross(X[1]-X[0], X[2]-X[0]); Nd = np.cross(V[1]-V[0], X[2]-X[0]) + np.cross(X[1]-X[0], V[2]-V[0])
        nN = np.linalg.norm(N); nh = sgn*N/nN; nd = sgn*(Nd - (N/nN).dot(Nd)*(N/nN))/nN
        om[k] = nd.dot(np.cross(ph, nh))/(1-nh.dot(ph)**2)
        d = X[0]-X[1]; dl[k] = 2*d.dot(V[0]-V[1])/d.dot(d)
    # consistency of instantaneous omega with the integrated psi(t): psi(t_end)-psi(0) vs trapezoid of omega
    errs['int_omega_vs_psi'] = abs(np.trapezoid(om, tt) - (psis[-1]-psis[0]))/abs(psis[-1]-psis[0])
    for k in range(0, len(tt), 7):
        beta = np.arccos(cbs[k])
        if abs(np.cos(beta)) < 0.05:   # measure (1) singular near the great circle
            pass
        else:
            m1 = abs(om[k]/dl[k]); errs['m1'] = max(errs['m1'], abs(m1 - P0/abs(np.cos(beta)))/m1)
        m2 = abs(om[k])*(tc_num - tt[k]); errs['m2'] = max(errs['m2'], abs(m2 - P0/np.cos(beta/2)**2)/m2)
    return dict(P0=P0, tc_pred=tc_pred, tc_num=tc_num, beta_end=float(np.arccos(cbs[-1])), status=sol.status, **errs)

if __name__ == '__main__':
    cases = [(0.5, 0.7, 3.0, 1.0), (0.5, 4.0, 3.0, 2.0), (1.0, 0.4, 2.9, 1.0), (0.05, 1.3, 3.05, 0.6), (0.2, 5.0, 2.5, 1.5), (2.0, 2.2, 3.1, 1.0)]
    for i, c in enumerate(cases):
        out = run_case(*c, seed=100+i)
        print('mu=%s th=%s beta0=%s R=%s' % c)
        print('   P0=%.12f  tc_pred=%.12g tc_num=%.12g  rel %.2e  beta_end=%.3e status=%d' % (out['P0'], out['tc_pred'], out['tc_num'], abs(out['tc_num']/out['tc_pred']-1), out['beta_end'], out['status']))
        print('   max errs: cos %.2e  psi %.2e  chord-ratio %.2e  radius %.2e  m1 %.2e  m2 %.2e  int(omega)dt vs psi %.2e' % (out['cos'], out['psi'], out['chord'], out['radius'], out['m1'], out['m2'], out['int_omega_vs_psi']))
