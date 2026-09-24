# Direct time integration of the Biot-Savart ODE from the refined minimizer (mpmath Taylor ODE, 30 digits).
import json
from mpmath import mp, mpf, mpc, pi, odefun, sqrt, atan, arg, log, nstr
mp.dps = 30
d = json.load(open('kkt_mp_120.json'))
x = [mpf(s) for s in d['x']]
G = [mpf(1)] + x[0:3]
z0 = [mpc(x[3 + 2 * k], x[4 + 2 * k]) for k in range(4)]
b = x[-1]; P = b / 2; tc = mpf(1) / 2
Gt = sum(G); zc = sum(g * z for g, z in zip(G, z0)) / Gt
def rhs(t, y):
    z = [mpc(y[2 * k], y[2 * k + 1]) for k in range(4)]
    out = []
    for j in range(4):
        s = sum(G[k] / (z[j] - z[k]) for k in range(4) if k != j)
        v = (s / (2j * pi)).conjugate()
        out += [v.real, v.imag]
    return out
y0 = []
for z in z0: y0 += [z.real, z.imag]
f = odefun(rhs, 0, y0, tol=mpf(10) ** -28, degree=30)
worst_r = 0; worst_ang = 0
for frac in ['0.1', '0.3', '0.5', '0.7', '0.9']:
    t = mpf(frac) * tc
    y = f(t)
    lam2 = 1 - t / tc
    for k in range(4):
        z = mpc(y[2 * k], y[2 * k + 1]) - zc
        w0 = z0[k] - zc
        er = abs(abs(z) ** 2 / (lam2 * abs(w0) ** 2) - 1)
        # predicted rotation angle: phi = -P ln(lambda^2) (omega0 > 0)
        dphi = arg(z / w0) - (-P * log(lam2))
        dphi = (dphi + pi) % (2 * pi) - pi
        worst_r = max(worst_r, er); worst_ang = max(worst_ang, abs(dphi))
    print('t/tc', frac, 'max rel err |z-zc|^2', nstr(worst_r, 3), 'max angle err', nstr(worst_ang, 3), flush=True)
