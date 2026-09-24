# Multi-start global search for min |b| (P = |b|/2) over N-vortex self-similar collapses. Own code.
import sys, json, time
import numpy as np
from scipy.optimize import minimize
from nv import Model, biot_savart_check

N = int(sys.argv[1]); seed = int(sys.argv[2]); nstart = int(sys.argv[3])
gmax = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
m = Model(N)
rng = np.random.default_rng(seed)
out = []
t0 = time.time()
for s in range(nstart):
    u = np.empty(3 * N)
    u[:N - 1] = rng.uniform(-gmax, gmax, N - 1)
    r = np.sqrt(rng.uniform(0, 1, N)) * 0.6
    th = rng.uniform(0, 2 * np.pi, N)
    u[N - 1:3 * N - 1] = np.column_stack([r * np.cos(th), r * np.sin(th)]).ravel()
    u[-1] = rng.uniform(-5, 5)
    try:
        u, nr, ok = m.project(u)
    except Exception:
        out.append({'start': s, 'status': 'err0'}); continue
    if not ok:
        out.append({'start': s, 'status': 'noproj'}); continue
    b_init = u[-1]
    try:
        res = minimize(lambda v: v[-1] ** 2, u, jac=lambda v: np.eye(3 * N)[-1] * 2 * v[-1],
                       constraints=[{'type': 'eq', 'fun': m.res, 'jac': m.jac}], method='SLSQP',
                       options={'maxiter': 2000, 'ftol': 1e-14})
    except Exception as e:
        out.append({'start': s, 'status': 'err'}); continue
    v = res.x
    try:
        v2, nr2, ok2 = m.project(v, tol=1e-11)
    except Exception:
        out.append({'start': s, 'status': 'err2'}); continue
    G, z, b, Gt, zc = m.summary(v2)
    D = np.abs(z[:, None] - z[None, :]) + np.eye(N) * 1e9
    ks = biot_savart_check(G, z)
    spread = np.abs(ks - ks.mean()).max() / abs(ks.mean())
    out.append({'start': s, 'status': 'ok' if (res.success and ok2) else 'nc', 'b_init': float(b_init),
                'b': float(b), 'P': float(abs(b) / 2), 'G': G.tolist(), 'z': [[q.real, q.imag] for q in z],
                'dmin': float(D.min()), 'spread': float(spread), 'kappa': [ks.mean().real, ks.mean().imag],
                'res': float(np.abs(m.res(v2)).max()), 'nit': int(res.nit)})
json.dump(out, open('gs_N%d_s%d.json' % (N, seed), 'w'))
Ps = sorted(o['P'] for o in out if o['status'] == 'ok' and o['spread'] < 1e-8)
print('N', N, 'seed', seed, 'ok', len(Ps), 'of', nstart, 'time', round(time.time() - t0, 1))
print('lowest P:', [round(p, 10) for p in Ps[:10]])
