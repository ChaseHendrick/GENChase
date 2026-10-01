"""Mode-fixed (hybrid) integration of a ring of N baseline TP06 cells with nearest-neighbour voltage coupling.

Within a segment the h/j branch of every cell is frozen (lo mask), so the vector field is analytic; a single
event function g = min_i s_i (V_i + 40) (s_i = -1 for cells on the V < -40 branch, +1 otherwise) stops the
integration exactly when some cell crosses V = -40 mV, its branch is switched, and integration restarts.  This is
the numerical counterpart of the piecewise-smooth flow a rigorous proof must treat with saltation matrices.
Stimuli are piecewise constant and also split segments.  Layout: y = Y.ravel(), Y of shape (19, N).
"""
import numpy as np
from scipy.integrate import solve_ivp
from scipy.sparse import lil_matrix
import tp06_19d as M

SCALE = np.array([100, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1e-4, 1, 1e-4, 10, 100], dtype=float)


class Ring:
    def __init__(self, N, c, p, weights=None):
        self.N, self.c, self.p = N, float(c), p
        self.w = np.ones(N) if weights is None else np.asarray(weights, float)  # edge i joins cell i and i+1 (mod N)
        self.nfev = 0

    def coupling(self, V):
        if self.N == 1:
            return 0.0
        w, wm = self.w, np.roll(self.w, 1)
        if V.ndim == 1:
            return self.c * (w * (np.roll(V, -1) - V) + wm * (np.roll(V, 1) - V))
        return self.c * (w[:, None] * (np.roll(V, -1, axis=0) - V) + wm[:, None] * (np.roll(V, 1, axis=0) - V))

    def rhs(self, t, y, lo, istim):
        self.nfev += 1
        N = self.N
        if y.ndim == 1:
            Y = y.reshape(19, N)
            return M.field(Y, self.p, i_stim=istim, coupling=self.coupling(Y[0]), lo=lo).ravel()
        k = y.shape[1]
        Y = y.reshape(19, N, k)
        return M.field(Y, self.p, i_stim=istim[:, None], coupling=self.coupling(Y[0]), lo=lo[:, None]).reshape(19 * N, k)

    def sparsity(self):
        N = self.N
        S = lil_matrix((19 * N, 19 * N), dtype=int)
        for i in range(N):
            for a in range(19):
                for b in range(19):
                    S[a * N + i, b * N + i] = 1
            if N > 1:
                S[i, (i + 1) % N] = 1
                S[i, (i - 1) % N] = 1
        return S.tocsr()

    def atol(self, rtol):
        return np.repeat(SCALE * rtol, self.N)


def run(ring, y0, t0, t1, pulses=(), rtol=1e-8, method="Radau", record=False, max_step=np.inf,
        weight_schedule=(), first_step=None, lo0=None, stop=None):
    """Integrate from t0 to t1.  pulses: list of (ta, tb, istim array (N,)).  weight_schedule: list of
    (t_switch, weights) applied at t_switch.  lo0: initial branch mask (default V < -40).  stop(event) -> bool ends
    the integration at the first crossing event (time, cell, direction) for which it is true (out["stopped"]).
    Returns dict with final state, crossing events and optional record."""
    N = ring.N
    y = np.array(y0, float).ravel()
    t = float(t0)
    lo = (y[:N] < -40) if lo0 is None else np.array(lo0, bool)
    stopped = False
    breaks = sorted({t1} | {ta for ta, tb, _ in pulses if t0 < ta < t1} | {tb for ta, tb, _ in pulses if t0 < tb < t1}
                    | {ts for ts, _ in weight_schedule if t0 < ts < t1})
    events = []  # (time, cell, +1 up / -1 down)
    rec_t, rec_y = [], []
    jac_sp = ring.sparsity() if (N > 1 and method in ("BDF", "Radau")) else None
    atol = ring.atol(rtol)
    w_init = ring.w.copy()
    sched = sorted(weight_schedule, key=lambda e: e[0])
    for tb in breaks:
        ring.w = w_init
        for ts, w in sched:
            if ts <= t + 1e-12:
                ring.w = np.asarray(w, float)
        while t < tb:
            istim = np.zeros(N)
            for ta, tz, I in pulses:
                if ta <= t < tz:
                    istim = istim + np.asarray(I, float)
            s = np.where(lo, -1.0, 1.0)

            def g(tt, yy, *_a, s=s):
                return np.min(s * (yy[:N] + 40.0))
            g.terminal = True
            g.direction = -1
            kw = dict(method=method, rtol=rtol, atol=atol, events=[g], max_step=max_step,
                      vectorized=(method in ("BDF", "Radau")))
            if jac_sp is not None:
                kw["jac_sparsity"] = jac_sp
            if first_step is not None:
                kw["first_step"] = first_step
            sol = solve_ivp(ring.rhs, (t, tb), y, args=(lo.copy(), istim), **kw)
            if sol.status < 0:
                raise RuntimeError(sol.message)
            if record:
                rec_t.append(sol.t[:-1]); rec_y.append(sol.y[:, :-1])
            y = sol.y[:, -1].copy()
            t = sol.t[-1]
            if sol.status == 1:  # event: find which cell crossed (smallest s_i (V_i + 40))
                vals = s * (y[:N] + 40.0)
                i = int(np.argmin(vals))
                lo[i] = not lo[i]
                events.append((t, i, +1 if not lo[i] else -1))
                if stop is not None and stop(events[-1]):
                    stopped = True
                    break
        if stopped:
            break
    if record:
        rec_t.append(np.array([t])); rec_y.append(y[:, None])
    out = dict(t=t, y=y, lo=lo, events=events, stopped=stopped)
    if record:
        out["rec_t"] = np.concatenate(rec_t)
        out["rec_y"] = np.concatenate(rec_y, axis=1)
    return out
