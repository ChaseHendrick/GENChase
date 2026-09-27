import numpy as np, sys
from scipy.optimize import minimize
from cone import margin, W0, X, Mof, Df, E, Dg
Xs = X[:300]
def best(lam, x0=None):
    f = lambda lw: -margin(lam, np.exp(np.concatenate([[0.0], lw])), Xs)
    x0 = np.log(W0[1:]/W0[0]) if x0 is None else x0
    r = minimize(f, x0, method='Nelder-Mead', options={'maxiter': 400, 'xatol': 1e-3, 'fatol': 1e-4})
    return -r.fun, np.exp(np.concatenate([[0.0], r.x]))
if __name__ == '__main__':
    for s in sys.argv[1:]:
        lam = complex(s)
        m, w = best(lam)
        print(lam, 'margin %.4f' % m, 'weights', np.round(w, 3), 'eig', np.round(Mof(lam, w)[1], 3), flush=True)
