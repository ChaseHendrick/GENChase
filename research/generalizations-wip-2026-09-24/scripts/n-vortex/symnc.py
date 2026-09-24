"""k-fold symmetric configurations with a central vortex of free circulation g0 (may be 0) at the origin
and k copies of an m-vortex arm.  Normalization: g_1 = -1 (first arm vortex).  kappa = -1 + i b."""
import numpy as np, json, sys
def unpack(x, m):
    g0 = x[0]; g = np.concatenate([[-1.0], x[1:m]]); p = x[m:2*m] + 1j*x[2*m:3*m]
    return g0, g, p
def resid(x, m, k, b, fix_g0=None):
    g0, g, p = unpack(x, m)
    if fix_g0 is not None: g0 = fix_g0
    ck = -1 - 1j*b
    F = g0/p + g*(k-1)/(2*p) - 2j*np.pi*ck*np.conj(p)
    pk = p**k
    for i in range(m):
        for j in range(m):
            if j != i:
                F[i] += g[j]*k*p[i]**(k-1)/(pk[i]-pk[j])
    return np.concatenate([F.real, F.imag])
def numjac(f, x, h=1e-7):
    r0 = f(x); J = np.zeros((len(r0), len(x)))
    for i in range(len(x)):
        e = np.zeros_like(x); e[i] = h
        J[:, i] = (f(x+e) - f(x-e))/(2*h)
    return J
def lm(f, x, iters=200, tol=1e-26):
    lam = 1e-3; r = f(x); fv = r @ r
    for it in range(iters):
        J = numjac(f, x); g = J.T @ r; H = J.T @ J
        ok = False
        for _ in range(50):
            dx = -np.linalg.solve(H + lam*np.diag(np.diag(H) + 1e-12), g)
            xn = x + dx; rn = f(xn); fn = rn @ rn
            if np.isfinite(fn) and fn < fv:
                x, r, fv = xn, rn, fn; lam = max(lam/3, 1e-15); ok = True; break
            lam *= 4
        if not ok or fv < tol: break
    return x, fv
def descend(x, m, k, b, h0=0.05, hmin=1e-8):
    h = h0
    for it in range(3000):
        if h < hmin: return x, b, 'stalled'
        bn = b - h
        xn, fv = lm(lambda y: resid(y, m, k, bn), x.copy(), iters=40)
        if fv < 1e-24 and np.linalg.norm(xn - x) < 0.3*np.linalg.norm(x):
            x, b = xn, bn; h = min(1.5*h, 0.2)
            g0, g, p = unpack(x, m)
            allp = np.concatenate([p*np.exp(2j*np.pi*l/k) for l in range(k)] + [[0]])
            dmin = min(abs(allp[i]-allp[j]) for i in range(len(allp)) for j in range(i+1, len(allp)))
            if dmin/np.max(abs(p)) < 1e-3 or np.min(abs(g)) < 1e-5 or np.max(abs(g)) > 1e5:
                return x, b, 'degenerate'
        else:
            h /= 2
    return x, b, 'maxit'
