# Hierarchical (weak-cluster) scan: Gamma = (1, eps a2, eps a3, eps a4) with |a| = 1,
# z1 = eps*y, z_{2,3,4} = C + eps*w_{2,3,4}, w4 = -(w2 + w3), gauge Im C = 0.
# For each eps, minimize b on the self-similar-collapse manifold (KKT Newton, FD Hessian),
# by continuation from the claimed minimizer and from random multi-starts.
import sys, json
import numpy as np
from scipy.optimize import minimize
from nv import Model, biot_savart_check

m = Model(4)

def T(v, eps):
    a = v[0:3]; y = v[3] + 1j * v[4]; C = v[5] + 0j; w2 = v[6] + 1j * v[7]; w3 = v[8] + 1j * v[9]
    b = v[10]
    w4 = -(w2 + w3)
    z = np.array([eps * y, C + eps * w2, C + eps * w3, C + eps * w4])
    u = np.concatenate([eps * a, np.column_stack([z.real, z.imag]).ravel(), [b]])
    return u

def dT(eps):
    # u = M v (linear)
    M = np.zeros((12, 11))
    M[0:3, 0:3] = eps * np.eye(3)
    M[3, 3] = eps; M[4, 4] = eps
    # z2 = C + eps w2 ; z3 = C + eps w3 ; z4 = C - eps(w2+w3); C real (v5)
    for k in (1, 2, 3):
        M[3 + 2 * k, 5] = 1.0
    M[5, 6] = eps; M[6, 7] = eps
    M[7, 8] = eps; M[8, 9] = eps
    M[9, 6] = -eps; M[10, 7] = -eps; M[9, 8] = -eps; M[10, 9] = -eps
    M[11, 10] = 1.0
    return M

def cons(v, eps):
    u = T(v, eps)
    r = m.res(u)[:8]   # E_j re (0..3), im (4..7); drop generic gauge
    E = r[0:4] + 1j * r[4:8]
    out = [E[0] / eps, E[1], (E[2] - E[1]) / eps, (E[3] - E[1]) / eps]
    c = np.array([q for e in out for q in (e.real, e.imag)])
    return np.concatenate([c, [v[0] ** 2 + v[1] ** 2 + v[2] ** 2 - 1.0]])

def jcons(v, eps):
    u = T(v, eps)
    Ju = m.jac(u)[:8] @ dT(eps)
    JE = Ju[0:4] + 1j * Ju[4:8]
    rows = [JE[0] / eps, JE[1], (JE[2] - JE[1]) / eps, (JE[3] - JE[1]) / eps]
    Jr = []
    for r in rows:
        Jr.append(r.real); Jr.append(r.imag)
    last = np.zeros(11); last[0:3] = 2 * v[0:3]
    Jr.append(last)
    return np.array(Jr)

def kkt_newton(v, eps, maxit=60, tol=1e-12):
    n = len(v)
    eb = np.zeros(n); eb[-1] = np.sign(v[-1])  # minimize |b|
    J = jcons(v, eps)
    lam = np.linalg.lstsq(J.T, -eb, rcond=None)[0]
    for it in range(maxit):
        c = cons(v, eps); J = jcons(v, eps)
        g = eb + J.T @ lam
        res = max(np.abs(c).max(), np.abs(g).max())
        if res < tol:
            return v, lam, res, True
        h = 1e-6
        H = np.zeros((n, n))
        for i in range(n):
            e = np.zeros(n); e[i] = h
            H[:, i] = ((jcons(v + e, eps) - jcons(v - e, eps)).T @ lam) / (2 * h)
        H = 0.5 * (H + H.T)
        K = np.block([[H, J.T], [J, np.zeros((len(c), len(c)))]])
        try:
            d = np.linalg.solve(K, -np.concatenate([g, c]))
        except np.linalg.LinAlgError:
            return v, lam, res, False
        t = 1.0
        if np.abs(d[:n]).max() > 0.2:
            t = 0.2 / np.abs(d[:n]).max()
        v = v + t * d[:n]; lam = lam + t * d[n:]
    return v, lam, res, False

def reduced_hess_min(v, lam, eps):
    n = len(v); J = jcons(v, eps)
    h = 1e-6; H = np.zeros((n, n))
    for i in range(n):
        e = np.zeros(n); e[i] = h
        H[:, i] = ((jcons(v + e, eps) - jcons(v - e, eps)).T @ lam) / (2 * h)
    H = 0.5 * (H + H.T)
    U, S, Vt = np.linalg.svd(J)
    Z = Vt[len(S):].T
    return np.linalg.eigvalsh(Z.T @ H @ Z), S

def from_u(u):
    # convert a raw configuration (Gamma_1 = 1 at index 0) to hierarchical variables
    G = np.concatenate([[1.0], u[:3]]); xy = u[3:11].reshape(4, 2); z = xy[:, 0] + 1j * xy[:, 1]; b = u[11]
    eps = np.linalg.norm(G[1:])
    C = z[1:].mean()
    rot = np.conj(C) / abs(C)
    z = z * rot; C = abs(C)
    w = (z[1:] - C) / eps
    v = np.array([*(G[1:] / eps), (z[0] / eps).real, (z[0] / eps).imag, C, w[0].real, w[0].imag, w[1].real, w[1].imag, b])
    return v, eps
