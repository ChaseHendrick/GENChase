"""Rotating-wave (Z_N-reduced) shooting for AP reentry in a ring of N identical TP06 cells.

Section S_0 = {V_0 = -40 mV, V_0 increasing}.  Shift map P(x) = sigma^{-1}(phi_tau(x)), where tau(x) is the time of
the first upward crossing of V_1 = -40 and sigma^{-1} relabels cell k+1 as cell k.  A fixed point of P is a discrete
rotating wave x_{k+1}(t) = x_k(t - tau) with rotation period T = N tau; the Floquet multipliers of the full orbit
are mu^N for the eigenvalues mu of DP (the shift map is an N-th root of the full return map).
Coordinates on S_0: all 19N states except V_0, scaled by hybrid.SCALE.  The conserved total charge sum_k q_k makes
1 an eigenvalue of DP; Newton uses the bordered system [[DP - I, g], [g^T, 0]] with g the scaled charge gradient.
"""
import json, time
import numpy as np
from scipy.sparse.linalg import LinearOperator, gmres, eigs
import tp06_19d as M
from hybrid import Ring, run, SCALE


class ShiftMap:
    def __init__(self, N, c, p, rtol=1e-10, method="Radau", tmax=400.0):
        self.N, self.c, self.p, self.rtol, self.method, self.tmax = N, c, p, rtol, method, tmax
        self.ring = Ring(N, c, p)
        self.sc = np.repeat(SCALE, N)          # scale of each full coordinate (layout k*N + i)
        self.nev = 0

    # coordinates ----------------------------------------------------------------------------------------------
    def full(self, u):
        x = np.empty(19 * self.N)
        x[0] = -40.0
        x[1:] = u * self.sc[1:]
        return x

    def red(self, x):
        return x[1:] / self.sc[1:]

    def Q(self, x):
        return float(np.sum(M.charge(x.reshape(19, self.N), self.p)))

    def gQ(self, x):
        g = M.charge_grad(x.reshape(19, self.N), self.p).ravel() * self.sc
        return g[1:]

    # the map ----------------------------------------------------------------------------------------------------
    def flow_to_next(self, x, record=False):
        N = self.N
        lo0 = x[:N] < -40
        lo0[0] = False
        o = run(self.ring, x, 0.0, self.tmax, rtol=self.rtol, method=self.method, lo0=lo0, record=record,
                stop=lambda e: e[1] == 1 % N and e[2] == 1)
        self.nev += 1
        if not o["stopped"]:
            raise RuntimeError("cell 1 did not activate within tmax")
        return o

    def P(self, u):
        o = self.flow_to_next(self.full(u))
        y = o["y"].reshape(19, self.N).copy()
        y[0, 1] = -40.0
        y = np.roll(y, -1, axis=1).ravel()
        return self.red(y), o["t"], o["events"]

    def DPv(self, u, v, h=1e-5, Pu=None):
        nv = np.linalg.norm(v)
        if nv == 0:
            return np.zeros_like(v)
        w = v / nv
        if Pu is None:  # central difference
            a = self.P(u + h * w)[0]; b = self.P(u - h * w)[0]
            return (a - b) / (2 * h) * nv
        a = self.P(u + h * w)[0]
        return (a - Pu) / h * nv


def newton(sm, u, q0=None, steps=6, tol=1e-9, gmres_tol=1e-8, h=1e-5, central=True, log=print, maxiter=60):
    x = sm.full(u)
    q0 = sm.Q(x) if q0 is None else q0
    hist = []
    for it in range(steps):
        t0 = time.time()
        Pu, tau, ev = sm.P(u)
        F = Pu - u
        x = sm.full(u)
        rq = q0 - sm.Q(x)
        g = sm.gQ(x)
        nF = float(np.linalg.norm(F))
        rec = dict(it=it, resid=nF, resid_inf=float(np.abs(F).max()), tau=tau, T=sm.N * tau, dq=rq,
                   n_events=len(ev))
        log(json.dumps(rec)); hist.append(rec)
        if nF < tol:
            break
        n = len(u)

        def mv(z):
            v, mu = z[:n], z[n]
            Jv = sm.DPv(u, v, h=h, Pu=None if central else Pu) - v
            return np.concatenate([Jv + g * mu, [g @ v]])
        A = LinearOperator((n + 1, n + 1), matvec=mv, dtype=float)
        rhs = np.concatenate([-F, [rq]])
        nev0 = sm.nev
        z, info = gmres(A, rhs, rtol=gmres_tol, restart=maxiter, maxiter=1)
        d = z[:n]
        log(json.dumps(dict(gmres_info=int(info), map_evals=sm.nev - nev0, step_norm=float(np.linalg.norm(d)),
                            mu=float(z[n]), secs=round(time.time() - t0, 1))))
        # simple damping: accept full step unless the residual grows
        lam = 1.0
        for _ in range(4):
            un = u + lam * d
            try:
                Fn = sm.P(un)[0] - un
                if np.linalg.norm(Fn) < nF or lam < 0.2:
                    break
            except RuntimeError:
                pass
            lam *= 0.5
        u = un
    return u, hist


def multipliers(sm, u, k=12, h=1e-5):
    """Leading eigenvalues of DP (matrix-free Arnoldi with central differences)."""
    n = len(u)
    A = LinearOperator((n, n), matvec=lambda v: sm.DPv(u, v, h=h), dtype=float)
    vals, vecs = eigs(A, k=k, which="LM", ncv=min(n - 1, max(2 * k + 1, 30)), tol=1e-7)
    order = np.argsort(-np.abs(vals))
    return vals[order], vecs[:, order]
