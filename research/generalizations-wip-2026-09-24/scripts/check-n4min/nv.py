# float64 analytic residual/Jacobian for the symmetric formulation (all N equations, generic rotation gauge).
# Unknowns u = [g_2..g_N, x_1, y_1, ..., x_N, y_N, b], Gamma_1 = 1, kappa = -1 + i b.
# E_j = sum_k G_k/(z_j - z_k) + (2 pi i - 2 pi b) conj(z_j) = 0 for all j (these imply sum G z = 0),
# gauge: Im(sum_j c_j z_j) = 0.
import numpy as np
TWO_PI = 2 * np.pi

class Model:
    def __init__(self, N, gauge=None, extra=None):
        self.N = N
        self.nv = 3 * N
        self.c = np.array(gauge if gauge is not None else [0.31, 0.77, -0.43, 0.59, 0.21, -0.66, 0.4, 0.13][:N])
        self.extra = extra  # optional list of (fun, jac) extra equality constraints

    def unpack(self, u):
        N = self.N
        G = np.concatenate([[1.0], u[:N - 1]])
        xy = u[N - 1:3 * N - 1].reshape(N, 2)
        z = xy[:, 0] + 1j * xy[:, 1]
        return G, z, u[-1]

    def res(self, u):
        N = self.N
        G, z, b = self.unpack(u)
        D = z[:, None] - z[None, :]
        np.fill_diagonal(D, 1.0)
        R = G[None, :] / D
        np.fill_diagonal(R, 0.0)
        E = R.sum(1) + (TWO_PI * 1j - TWO_PI * b) * np.conj(z)
        out = [E.real, E.imag, [np.imag(np.dot(self.c, z))]]
        if self.extra:
            out.append([f(u) for f, _ in self.extra])
        return np.concatenate(out)

    def jac(self, u):
        N = self.N
        G, z, b = self.unpack(u)
        D = z[:, None] - z[None, :]
        np.fill_diagonal(D, 1.0)
        inv = 1.0 / D
        np.fill_diagonal(inv, 0.0)
        Jc = np.zeros((N, 3 * N), dtype=complex)
        # d/d g_k, k = 2..N (index k-1 in G)
        for k in range(1, N):
            Jc[:, k - 1] = inv[:, k]
        A = G[None, :] * inv ** 2        # A[j,k] = G_k/(z_j - z_k)^2 (k != j)
        dz = A.copy()                     # dE_j/dz_k for k != j
        np.fill_diagonal(dz, -A.sum(1))   # dE_j/dz_j
        dzb = np.zeros((N, N), dtype=complex)
        np.fill_diagonal(dzb, TWO_PI * 1j - TWO_PI * b)
        dx = dz + dzb
        dy = 1j * (dz - dzb)
        for k in range(N):
            Jc[:, N - 1 + 2 * k] = dx[:, k]
            Jc[:, N - 1 + 2 * k + 1] = dy[:, k]
        Jc[:, -1] = -TWO_PI * np.conj(z)
        gaug = np.zeros(3 * N)
        for k in range(N):
            gaug[N - 1 + 2 * k + 1] = self.c[k]      # Im(c z) = c . y
        rows = [Jc.real, Jc.imag, gaug[None, :]]
        if self.extra:
            rows.append(np.array([j(u) for _, j in self.extra]))
        return np.vstack(rows)

    def project(self, u, tol=1e-12, maxit=80):
        lam = 1e-10
        r = self.res(u)
        nr = np.linalg.norm(r)
        for it in range(maxit):
            if nr < tol:
                return u, nr, True
            J = self.jac(u)
            # min-norm damped step
            M = J @ J.T
            step = J.T @ np.linalg.solve(M + lam * np.eye(len(r)), r)
            t = 1.0
            ok = False
            while t > 1e-6:
                un = u - t * step
                rn = self.res(un)
                nrn = np.linalg.norm(rn)
                if np.isfinite(nrn) and nrn < nr:
                    ok = True
                    break
                t *= 0.5
            if not ok:
                return u, nr, False
            u, r, nr = un, rn, nrn
        return u, nr, nr < tol

    def summary(self, u):
        G, z, b = self.unpack(u)
        Gt = G.sum()
        zc = (G * z).sum() / Gt
        return G, z, b, Gt, zc

def biot_savart_check(G, z):
    # independent velocity evaluation: returns kappa_j = zdot_j/(z_j - z_c)
    N = len(G)
    zc = (G * z).sum() / G.sum()
    ks = []
    for j in range(N):
        s = sum(G[k] / (z[j] - z[k]) for k in range(N) if k != j)
        zdot = np.conj(s / (2j * np.pi))
        ks.append(zdot / (z[j] - zc))
    return np.array(ks)
