# sanity_conv.py -- Task 4 (NON-RIGOROUS): plug the computed pulse back into the integral equation.
# Computes the orbit at a speed c (default: the claimed 1.10274770973415924914786773574662, override
# with the first argument) with the mpmath Taylor integrator of shoot_mp.py, then evaluates the
# convolution (w * S(U))(xi) = S0 + (w * D(U))(xi), w = e^{-|x|}/2, by exact recursions for the two
# one-sided exponential integrals and 24-point Gauss-Legendre quadrature on every Taylor step, and
# compares it with Q from the ODE (and its derivative with P).  Tails: before the start the orbit is
# on the linear unstable manifold (U ~ U(0) e^{lam xi}); after the stop it is taken on the slow stable
# direction (U ~ U_end e^{lam_s (xi - xi_end)}), both with D ~ S'(0) U.
# Run:   python3 sanity_conv.py [c]        (a few seconds)
import sys, math
import numpy as np
sys.argv = [sys.argv[0], "70", "40", "24", "-8"] + sys.argv[1:]
import shoot_mp as SM
from mpmath import mp, mpf

c = mpf(sys.argv[5]) if len(sys.argv) > 5 else mpf('1.10274770973415924914786773574662')
kap, lam, y, tail = SM.start_point(c)
_, lam_s = SM.eig(kap)
S0 = float(SM.S0); s1 = float(SM.s1)
def D(u):
    return 1.0 / (1.0 + math.exp(5.0) * np.exp(-20.0 * u)) - S0

steps = []; t = mpf(0); passed = False; Umax = 0.0
while True:
    cs = SM.taylor(y, kap, SM.NT)
    scale = max(abs(v) for v in y) + mpf(10) ** (-120)
    cn = max(max(abs(cs[i][SM.NT]), abs(cs[i][SM.NT - 1])) for i in range(4)) + mpf(10) ** (-160)
    h = min((SM.TOL * scale / cn) ** (mpf(1) / SM.NT) * mpf('0.8'), mpf(1) / 2)
    steps.append((float(t), float(h), [[float(x) for x in cs[i]] for i in range(4)]))
    y = [SM.horner(cs[i], h) for i in range(4)]
    t += h
    Umax = max(Umax, float(y[0]))
    if y[0] > 0.5: passed = True
    # stop while the orbit still shadows the pulse: before any growth away from rest after the pulse
    if passed and abs(y[0]) > 1: break
    if t > 300: break
t_esc = float(t)
t_stop = t_esc - 30.0
steps = [st for st in steps if st[0] + st[1] <= t_stop]
print(f"c = {mp.nstr(c, 34)}; orbit escapes at t = {t_esc:.2f}; comparison uses t <= {steps[-1][0]+steps[-1][1]:.2f}")
xg, wg = np.polynomial.legendre.leggauss(24)
nodes = [st[0] for st in steps] + [steps[-1][0] + steps[-1][1]]
def ev(coef, dt):
    return np.polyval(coef[::-1], dt)
# max U over the part that shadows the pulse: dense sampling of the Taylor polynomials
best = max(((st[0] + tt, ev(st[2][0], tt)) for st in steps for tt in np.linspace(0, st[1], 41)), key=lambda z: z[1])
print(f"max U along the pulse (dense sampling, float) = {best[1]:.12f} at xi = {best[0]:.4f}")

# forward recursion for L(xi) = int_{-inf}^{xi} e^{-(xi - eta)} D(U(eta)) d eta / 2
U0 = steps[0][2][0][0]
Lv = [s1 * U0 / (2 * (1 + float(lam)))]
Rparts = []
for (t0, h, cs) in steps:
    eta = t0 + (xg + 1) * h / 2
    Dv = D(ev(cs[0], eta - t0))
    wl = wg * h / 2 * np.exp(-(t0 + h - eta)) * Dv / 2
    wr = wg * h / 2 * np.exp(-(eta - t0)) * Dv / 2
    Lv.append(math.exp(-h) * Lv[-1] + wl.sum())
    Rparts.append((h, wr.sum()))
Uend = sum(steps[-1][2][0][k] * steps[-1][1] ** k for k in range(len(steps[-1][2][0])))
Rv = [s1 * Uend / (2 * (1 - float(lam_s)))]
for (h, part) in reversed(Rparts):
    Rv.append(math.exp(-h) * Rv[-1] + part)
Rv = Rv[::-1]
errQ = []; errP = []
for j, (t0, h, cs) in enumerate(steps):
    Qode = cs[2][0]; Pode = cs[3][0]
    Qc = Lv[j] + Rv[j]; Pc = Rv[j] - Lv[j]
    errQ.append((t0, abs(Qode - Qc))); errP.append((t0, abs(Pode - Pc)))
mid = [e for (tt, e) in errQ if 5 <= tt <= t_stop - 25]
midP = [e for (tt, e) in errP if 5 <= tt <= t_stop - 25]
print(f"|Q_ode - (w*S(U) - S0)|: max over interior nodes = {max(mid):.2e}, over all nodes = {max(e for _, e in errQ):.2e}")
print(f"|P_ode - d/dxi (w*S(U))|: max over interior nodes = {max(midP):.2e}")
print(f"max |Q - S0| along the orbit = {max(abs(st[2][2][0]) for st in steps):.4f}")
