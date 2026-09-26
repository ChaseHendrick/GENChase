# Samples points and pairs of the block B actually used by prove_pulse.py (r = 4 rho) and checks, with the nonlinear 4D field in floating point (evidence, not proof), dL/dt > 0, the entrance inequality on {|y'| = rho, L <= 0}, and the matrix conditions (C), (E) on a grid of s; run: python3 block_points_check.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'code'))
import numpy as np
import prove_pulse as pp, block as bl, certify_rest as cr
T, Tinv, rho, r, info = pp.block_data()
print('block used by the proof: rho =', info['rho'], ' r =', info['r'], ' U-range bound =', info['U_range'])
Tf = np.array([[float(T[i, j].mid()) for j in range(4)] for i in range(4)])
Tif = np.linalg.inv(Tf)
rho, r = float(rho.mid()), float(r.mid())
D = np.diag([1., -1, -1, -1]); M = Tf.T @ D @ Tf
S = lambda u: 1 / (1 + np.exp(-20 * (u - 0.25)))
S0 = S(0.0); xs = np.array([0, S0, S0, 0])
eps = 0.1
kap = [1 / 1.1027477097341592491478678, 1 / 1.1027477097341592491478677]
def F(x, k):
    U, V, Q, P = x
    return np.array([k * (Q - U - V), eps * k * U, P, Q - S(U)])
rng = np.random.default_rng(7)
def sample_B(n):
    y1 = rng.uniform(-r, r, n)
    d = rng.normal(size=(n, 3)); d /= np.linalg.norm(d, axis=1)[:, None]
    rad = rho * rng.uniform(0, 1, n) ** (1 / 3)
    return np.column_stack([y1, d * rad[:, None]])
n = 200000
Y = sample_B(n); X = xs + Y @ Tif.T
print('max |U| over samples of B:', np.abs(X[:, 0]).max(), '(must be < 0.05)')
worst = np.inf
for k in kap:
    for i in range(n):
        z = Y[i]; dL = 2 * z @ D @ (Tf @ F(X[i], k))
        worst = min(worst, dL / (z @ z))
print('(C) with x2 = x*: min over samples of (dL/dt)/|y|^2 =', worst, '(must be > 0)')
# pairs x1, x2 in B (cone condition for differences, used nowhere in the argument but claimed by the docstring)
Y2 = sample_B(n); X2 = xs + Y2 @ Tif.T
worst2 = np.inf
for i in range(0, n, 4):
    z = Y[i] - Y2[i]; dz = Tf @ (F(X[i], kap[0]) - F(X2[i], kap[0]))
    worst2 = min(worst2, 2 * z @ D @ dz / (z @ z))
print('(C) for pairs: min (dL/dt)/|y1-y2|^2 =', worst2)
# entrance face |y'| = rho with |y1| <= rho
y1 = rng.uniform(-rho, rho, n); d = rng.normal(size=(n, 3)); d /= np.linalg.norm(d, axis=1)[:, None]
Ye = np.column_stack([y1, d * rho]); Xe = xs + Ye @ Tif.T
worst3 = -np.inf
for k in kap:
    for i in range(n):
        yd = Tf @ F(Xe[i], k)
        worst3 = max(worst3, 2 * Ye[i][1:] @ yd[1:] / rho ** 2)
print('(E): max over samples of (d|y\'|^2/dt)/rho^2 on the entrance face =', worst3, '(must be < 0)')
# matrix conditions on a grid of s between smin and smax (convexity sanity)
smin, smax = 20 * S(-0.05) * (1 - S(-0.05)), 20 * S(0.05) * (1 - S(0.05))
mins, es = [], []
for s in np.linspace(smin, smax, 201):
    for k in kap:
        A = np.array([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])
        At = Tf @ A @ Tif; H = D @ At + At.T @ D
        mins.append(np.linalg.eigvalsh(H).min())
        S22 = (At[1:, 1:] + At[1:, 1:].T) / 2
        es.append(np.linalg.eigvalsh(S22).max() + np.linalg.norm(At[1:, 0]))
print('min eig H over s-grid:', min(mins), ' at ends:', mins[0], mins[-1])
print('max of lam_max(sym At22) + |At21| over s-grid:', max(es))
