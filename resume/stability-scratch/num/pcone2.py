import numpy as np, sys
from scipy.optimize import minimize
from ev import S, Df, E, A0, K
from cone import Mof, Dg
xs = np.concatenate([np.linspace(-3, 1.5, 3000), np.linspace(1.5, 30, 1500)])
Ys = S(xs).T
Js = np.array([Df(y) for y in Ys])
def Hmin(lam, w, sub=1):
    M, ev = Mof(lam, w); Mi = np.linalg.inv(M)
    A = M[None] @ (Js[::sub] + lam*E) @ Mi[None]
    H = Dg[None] @ A + np.conj(np.transpose(A, (0,2,1))) @ Dg[None]
    # normalise by the size of the diagonal so the margin is scale free
    e = np.linalg.eigvalsh(H).min(axis=1)
    k = np.argmin(e)
    return e[k], xs[::sub][k]
def best(lam, starts):
    bestv = (-1e18, None)
    for x0 in starts:
        f = lambda lw: -Hmin(lam, np.exp(np.concatenate([[0.0], lw])), sub=7)[0]
        r = minimize(f, x0, method='Nelder-Mead', options={'maxiter': 1500, 'xatol':1e-4, 'fatol':1e-6})
        w = np.exp(np.concatenate([[0.0], r.x]))
        v = Hmin(lam, w)
        if v[0] > bestv[0]: bestv = (v[0], (w, v[1]))
    return bestv
starts = [np.log(np.array(s, float)) for s in ([1.2, 400, 100, 70.], [1, 1e4, 1e3, 1e2], [1, 1e3, 1e4, 1e3], [1, 100, 100, 100], [1, 1e5, 1e4, 1e3])]
for s in sys.argv[1:]:
    lam = complex(s)
    v, (w, where) = best(lam, starts)
    print(lam, 'min eig %.4g at xi=%.3f' % (v, where), 'w', np.array2string(w, precision=3), flush=True)
