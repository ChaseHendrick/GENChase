"""Periodic orbits of the return map for every itinerary in {A, B}^n (n <= NMAX), by multiple-shooting Newton
on the section u = 4.5 (u increasing), seeded at the fixed points A and B. For each orbit: the residual
max_k |P(x_k) - x_{k+1}|, the multipliers of the n-th return, and whether each point lies in the h-set its
symbol names (xi, eta in [-1, 1]). NUMERICAL (float64, DOP853 at rtol 1e-14)."""
import itertools
import numpy as np
import pmap
import horseshoe as hs

SEC, DIR = hs.SEC, hs.DIR


def primitive_codes(n):
    out = []
    for t in itertools.product('AB', repeat=n):
        s = ''.join(t)
        if any(s == s[k:] + s[:k] for k in range(1, n) if n % k == 0):
            continue                     # a power of a shorter word
        if min(s[k:] + s[:k] for k in range(n)) != s:
            continue                     # keep one rotation per cycle
        out.append(s)
    return out


def shoot(S, code, tol=1e-15, maxit=40):
    n = len(code)
    X = np.array([S.A if ch == 'A' else S.B for ch in code], float)
    for it in range(maxit):
        F = np.zeros(3 * n)
        M = np.zeros((3 * n, 3 * n))
        for k in range(n):
            x1, T, DP, _, _, _ = pmap.P(X[k], S.J, SEC, direction=DIR)
            F[3 * k:3 * k + 3] = x1 - X[(k + 1) % n]
            M[3 * k:3 * k + 3, 3 * k:3 * k + 3] = DP
            M[3 * k:3 * k + 3, 3 * ((k + 1) % n):3 * ((k + 1) % n) + 3] -= np.eye(3)
        dX = np.linalg.solve(M, -F).reshape(n, 3)
        X = X + dX
        if np.abs(dX).max() < tol:
            break
    res, Ts, Mon = [], [], np.eye(3)
    for k in range(n):
        x1, T, DP, _, umax, umin = pmap.P(X[k], S.J, SEC, direction=DIR)
        res.append(np.abs(x1 - X[(k + 1) % n]).max())
        Ts.append(T)
        Mon = DP @ Mon
    mu = np.linalg.eigvals(Mon)
    mu = mu[np.argsort(-np.abs(mu))]
    return X, max(res), sum(Ts), mu, it


def locate(NA, NB, S, X, code):
    ok = True
    loc = []
    for x, ch in zip(X, code):
        c = S.c_of(x)
        N = NA if ch == 'A' else NB
        xi, eta, zeta = N.inv(c)
        loc.append((xi, eta, zeta))
        ok &= abs(xi) <= 1 and abs(eta) <= 1 and abs(zeta) <= 1
    return ok, loc
