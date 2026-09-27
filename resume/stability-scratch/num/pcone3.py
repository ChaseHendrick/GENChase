import numpy as np, sys
from scipy.optimize import minimize
from ev import S, Df, E, A0, K
Dg = np.diag([1, -1, -1, -1, -1.])
xs = np.concatenate([np.linspace(-3, 1.5, 3000), np.linspace(1.5, 30, 1500)])
Ys = S(xs).T
Js = np.array([Df(y) for y in Ys])
a0 = A0[1,0]/K
def coords(lam, w):
    R = np.sqrt(K*K/4 + K*(lam + a0))
    nup, num = K/2 + R, K/2 - R
    # z+ = (w - num p)/(nup - num), z- = (nup p - w)/(nup - num)
    T = np.zeros((5,5), complex)
    T[0,0], T[0,1] = -num/(2*R), 1/(2*R)
    T[1,0], T[1,1] = nup/(2*R), -1/(2*R)
    T[2,2] = T[3,3] = T[4,4] = 1
    return np.diag(w) @ T
def Hmin(lam, w, sub=1):
    M = coords(lam, w); Mi = np.linalg.inv(M)
    A = M[None] @ (Js[::sub] + lam*E) @ Mi[None]
    H = Dg[None] @ A + np.conj(np.transpose(A, (0,2,1))) @ Dg[None]
    e = np.linalg.eigvalsh(H).min(axis=1); k = np.argmin(e)
    return e[k], xs[::sub][k]
def best(lam, starts):
    bestv = (-1e18, None)
    for x0 in starts:
        f = lambda lw: -Hmin(lam, np.exp(np.concatenate([[0.0], lw])), sub=7)[0]
        r = minimize(f, x0, method='Nelder-Mead', options={'maxiter': 2000, 'xatol':1e-4, 'fatol':1e-6})
        w = np.exp(np.concatenate([[0.0], r.x])); v = Hmin(lam, w)
        if v[0] > bestv[0]: bestv = (v[0], (w, v[1]))
    return bestv
starts = [np.log(np.array(s, float)) for s in ([1, 1e-2, 1e-2, 1e-2], [1, 1e-3, 1e-3, 1e-4], [1, 1e-1, 1e-2, 1e-2], [1,1,1,1])]
for s in sys.argv[1:]:
    lam = complex(s)
    v, (w, where) = best(lam, starts)
    print(lam, 'min eig %.4g at xi=%.3f' % (v, where), 'w', np.array2string(w, precision=4), flush=True)
