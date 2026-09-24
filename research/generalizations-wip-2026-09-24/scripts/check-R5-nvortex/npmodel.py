"""Vectorized float64 model: residual/Jacobian of self-similarity, same layout as kkt_mp.
X = [x(N), y(N), G(N), kr, ki]; R = [Re F, Im F], F_j = (i/2pi) sum_k G_k/conj(z_j-z_k) - kappa z_j.
"""
import numpy as np

C = 1j / (2 * np.pi)


def split(X, N):
    z = X[:N] + 1j * X[N:2 * N]
    G = X[2 * N:3 * N]
    kap = X[3 * N] + 1j * X[3 * N + 1]
    return z, G, kap


def residual(X, N):
    z, G, kap = split(X, N)
    D = np.conj(z[:, None] - z[None, :])
    np.fill_diagonal(D, 1.0)
    M = G[None, :] / D
    np.fill_diagonal(M, 0.0)
    F = C * M.sum(axis=1) - kap * z
    return np.concatenate([F.real, F.imag])


def jacobian(X, N):
    z, G, kap = split(X, N)
    D = np.conj(z[:, None] - z[None, :])
    np.fill_diagonal(D, 1.0)
    A = C * G[None, :] / D ** 2
    np.fill_diagonal(A, 0.0)
    B = C / D
    np.fill_diagonal(B, 0.0)
    diag = A.sum(axis=1)
    Jx = A.copy(); Jy = -1j * A.copy()
    Jx[np.arange(N), np.arange(N)] = -diag - kap
    Jy[np.arange(N), np.arange(N)] = 1j * diag - 1j * kap
    Jk = np.stack([-z, -1j * z], axis=1)
    Jc = np.concatenate([Jx, Jy, B, Jk], axis=1)
    return np.concatenate([Jc.real, Jc.imag], axis=0)


def free_idx(N, j0, j1):
    fixed = {3 * N, 2 * N + j0, N + j1}
    return np.array([i for i in range(3 * N + 2) if i not in fixed])


def diag(X, N):
    z, G, kap = split(X, N)
    Gt = G.sum()
    zc = (G * z).sum() / Gt
    r = z - zc
    D = np.conj(z[:, None] - z[None, :]); np.fill_diagonal(D, 1.0)
    M = G[None, :] / D; np.fill_diagonal(M, 0.0)
    v = C * M.sum(axis=1)
    k2 = (np.conj(r) * v).sum() / (abs(r) ** 2).sum()
    res = np.max(abs(v - k2 * r)) / np.max(abs(v))
    P = abs(k2.imag) / (-2 * k2.real) if k2.real < 0 else np.inf
    dd = abs(z[:, None] - z[None, :]) + np.eye(N) * 1e300
    return dict(P=P, kap=k2, res=res, Gmin_rel=np.min(abs(G)) / np.max(abs(G)),
                dmin_rel=dd.min() / np.max(abs(r)), rmax=np.max(abs(r)), zc=zc)
