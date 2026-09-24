# Direct second-order test without using the Lagrangian Hessian: move along tangent directions,
# project back onto the constraint manifold by min-norm Newton, and compare b - b0 with t^2.
import json
from mpmath import mp, mpf, matrix, lu_solve, svd_r, nstr, rand, sqrt
import model
mp.dps = 60
N = 4
F = model.lambdas(N, 'mpmath')
d = json.load(open('kkt_mp_120.json'))
x0 = [mpf(s) for s in d['x']]
nv, nc = 3 * N, 2 * N + 1
C = lambda x: matrix(F['C'](*x))
J = lambda x: matrix(F['J'](*x))
U, S, V = svd_r(J(x0), full_matrices=True)
Zb = [[V[nc + k, i] for i in range(nv)] for k in range(nv - nc)]
b0 = x0[-1]

def project(x):
    for it in range(60):
        c = C(x)
        r = max(abs(v) for v in c)
        if r < mpf(10) ** (-55):
            return x, r
        Jm = J(x)
        dx = Jm.T * lu_solve(Jm * Jm.T, c)
        x = [x[i] - dx[i] for i in range(nv)]
    return x, r

mp.dps = 60
import random
random.seed(7)
worst = None
rows = []
for trial in range(40):
    w = [random.gauss(0, 1) for _ in range(nv - nc)]
    nrm = sum(t * t for t in w) ** 0.5
    w = [t / nrm for t in w]
    dirv = [sum(w[k] * Zb[k][i] for k in range(nv - nc)) for i in range(nv)]
    ratios = []
    for t in [mpf('1e-2'), mpf('1e-3'), mpf('1e-4'), mpf('-1e-4'), mpf('-1e-2')]:
        x, r = project([x0[i] + t * dirv[i] for i in range(nv)])
        ratios.append((b0 - b0 + x[-1] - b0) / t ** 2)
    rows.append([float(q) for q in ratios])
    mn = min(ratios)
    worst = mn if worst is None or mn < worst else worst
    print(trial, [nstr(q, 6) for q in ratios], flush=True)
print('min over trials of (b - b0)/t^2 =', nstr(worst, 8))
