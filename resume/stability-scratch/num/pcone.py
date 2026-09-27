import numpy as np, sys
from scipy.optimize import minimize
from ev import S, Df, E, A0, K
from cone import Mof, Dg
xs = np.linspace(-3, 30, 6001)
Ys = S(xs).T
def margin_path(lam, w, Ys=Ys):
    M, ev = Mof(lam, w); Mi = np.linalg.inv(M)
    worst, where = 1e9, None
    for x, y in zip(xs, Ys):
        A = M @ (Df(y) + lam*E) @ Mi
        e = np.linalg.eigvalsh(Dg @ A + A.conj().T @ Dg).min()
        if e < worst: worst, where = e, x
    return worst, where
def best(lam, x0):
    f = lambda lw: -margin_path(lam, np.exp(np.concatenate([[0.0], lw])), Ys[::10])[0]
    r = minimize(f, x0, method='Nelder-Mead', options={'maxiter': 500})
    w = np.exp(np.concatenate([[0.0], r.x]))
    return margin_path(lam, w), w
x0 = np.log(np.array([1.2, 400, 100, 70.]))
for s in sys.argv[1:]:
    lam = complex(s)
    (m, where), w = best(lam, x0)
    print(lam, 'margin %.3f at xi=%.3f' % (m, where), 'w', np.round(w, 2), flush=True)
