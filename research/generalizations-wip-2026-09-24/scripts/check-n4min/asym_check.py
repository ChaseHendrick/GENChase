# Check the weak-cluster asymptotic relation on small-eps self-similar configurations:
# with C = cluster centroid, sigma = net weak circulation, D = sum Gamma_k (z_k - C), d = D/(sigma*C) rotated/scaled
# so that C -> 1, q = 1/conj(d) should satisfy |q + 1| -> 1 and 2 pi kappa |C|^2 (rotated frame) -> -i (q - 1).
import json
import numpy as np
from hier import *

def analyse(v, eps):
    u = T(v, eps)
    G = np.concatenate([[1.0], u[:3]]); z = u[3:11].reshape(4, 2) @ np.array([1, 1j]); b = u[11]
    zc = (G * z).sum() / G.sum(); z = z - zc
    C = z[1:].mean(); sig = G[1:].sum(); D = (G[1:] * (z[1:] - C)).sum()
    rot = abs(C) / C
    d = D / sig * rot / abs(C)
    q = 1 / np.conj(d)
    x_pred = -1j * (q - 1)
    x_true = 2 * np.pi * (-1 + 1j * b) * abs(C) ** 2
    phi = np.angle(q + 1)
    P_formula = (2 - np.cos(phi)) / (-2 * np.sin(phi))
    return abs(q + 1), x_pred, x_true, P_formula, abs(b) / 2, sig, (G[1:] ** 2).sum() / 2

d0 = json.load(open('kkt_mp_120.json'))
u0 = np.array([float(s) for s in d0['x']])
v, eps = from_u(u0)
v, lam, res, ok = kkt_newton(v, eps)
print('branch through the minimizer (local minima of P at fixed eps):')
for e in [0.3008, 0.1, 0.03, 0.01, 0.004]:
    while eps > e * 1.0001:
        eps = max(eps * 0.97, e); v, lam, res, ok = kkt_newton(v, eps)
    a = analyse(v, eps)
    print(' eps %.4f |q+1| %.6f  x_pred %s x_true %s  P_formula %.6f  P %.6f  sigma %.3e  sum G^2/2 %.3e' % (
        eps, a[0], np.round(a[1], 5), np.round(a[2], 5), a[3], a[4], a[5], a[6]))
