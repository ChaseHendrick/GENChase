"""Periodic travelling waves of the TP06 cable (comoving form, tw_model.py) by collocation. NUMERICAL, not a proof.

Unknowns: the wave profile over one period, split at the two -40 mV crossings into
  piece A: s in [0, T_A], from the upstroke crossing (V = -40, rising) to the repolarization crossing (V = -40,
           falling), with the h/j formulas of V >= -40;
  piece B: s in [T_A, T_A + T_B], back to the upstroke crossing, with the V < -40 formulas;
the piece lengths T_A, T_B, and an unfolding parameter mu added to K_i' (the comoving system has the first integral
H, so periodic orbits come in a family; mu = 0 on an exact periodic orbit since the integral of dH/ds = mu over a
period vanishes). Conditions: collocation (Radau IIA, 3 stages, order 5, L-stable, on a nonuniform mesh per piece),
continuity A(end) = B(start), B(end) = A(start), V_A(0) = -40, V_A(T_A) = -40, H(y_A(0)) = H0.
The switch points are mesh nodes, so no collocation interval contains the discontinuity of the h/j rates.
Variables are scaled, z = y / SIGMA (tw_model.SIGMA). Newton with a sparse direct solve (SuperLU).

Commands:
  python3 tw_bvp.py init SNAPSHOT.npz KAPPA OUT.npz [--M 600,600]
  python3 tw_bvp.py cont START.npz KAPPA_STOP OUT_DIR [--dk 0.02] [--max-steps 200] [--M ...]
  python3 tw_bvp.py mesh START.npz OUT.json --M-list 300,450,600,900   (mesh study at the start's kappa)
"""
import argparse, json, os, sys, time
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tw_model as TM  # noqa: E402

NS = TM.NS
SIG = TM.SIGMA
s6 = np.sqrt(6.0)
RC = np.array([(4 - s6) / 10, (4 + s6) / 10, 1.0])
RA = np.array([[(88 - 7 * s6) / 360, (296 - 169 * s6) / 1800, (-2 + 3 * s6) / 225],
               [(296 + 169 * s6) / 1800, (88 + 7 * s6) / 360, (-2 - 3 * s6) / 225],
               [(16 - s6) / 36, (16 + s6) / 36, 1.0 / 9]])
LO = {"A": False, "B": True}


class Layout:
    def __init__(self, MA, MB):
        self.M = {"A": MA, "B": MB}
        self.n_piece = {p: 20 * (m + 1) + 40 * m for p, m in self.M.items()}
        self.off = {"A": 0, "B": self.n_piece["A"]}
        self.iTA = self.n_piece["A"] + self.n_piece["B"]
        self.iTB, self.imu = self.iTA + 1, self.iTA + 2
        self.n = self.iTA + 3
        self.roff = {"A": 0, "B": 60 * MA}
        self.rcont = 60 * (MA + MB)

    def node_idx(self, p, j):  # (len(j), 20)
        j = np.atleast_1d(j)
        return self.off[p] + 20 * j[:, None] + np.arange(20)[None, :]

    def stage_idx(self, p, j, i):  # internal stage i in {0, 1}
        j = np.atleast_1d(j)
        return self.off[p] + 20 * (self.M[p] + 1) + 40 * j[:, None] + 20 * i + np.arange(20)[None, :]

    def nodes(self, x, p):
        m = self.M[p]
        return x[self.off[p]:self.off[p] + 20 * (m + 1)].reshape(m + 1, 20).T  # (20, m+1)

    def stages(self, x, p):  # (20, m, 3): internal stages and the right node
        m = self.M[p]
        st = x[self.off[p] + 20 * (m + 1):self.off[p] + self.n_piece[p]].reshape(m, 2, 20).transpose(2, 0, 1)
        nd = self.nodes(x, p)
        return np.concatenate([st, nd[:, 1:, None]], axis=2)


def fz(z, kappa, lo, mu):
    return TM.field(z * SIG[:, None], kappa, lo, mu) / SIG[:, None]


def jz(z, kappa, lo):
    J = TM.jac(z * SIG[:, None], kappa, lo)
    return J * SIG[None, :, None] / SIG[:, None, None]


def residual_jacobian(x, L, mesh, kappa, H0, want_jac=True):
    """mesh: dict p -> normalized node positions in [0, 1] (len M+1)."""
    TA, TB, mu = x[L.iTA], x[L.iTB], x[L.imu]
    Tp = {"A": TA, "B": TB}
    R = np.zeros(L.n)
    rows, cols, vals = [], [], []
    for p in ("A", "B"):
        m = L.M[p]
        h = np.diff(mesh[p])                      # (m,)
        Y = L.stages(x, p)                        # (20, m, 3)
        y0 = L.nodes(x, p)[:, :-1]                # (20, m)
        F = fz(Y.reshape(20, -1), kappa, LO[p], mu).reshape(20, m, 3)
        AF = np.einsum("ik,amk->ami", RA, F)      # (20, m, 3): sum_k a_ik F_k
        E = Y - y0[:, :, None] - (h * Tp[p])[None, :, None] * AF
        r0 = L.roff[p]
        # row of eq (j, i), component a: r0 + 60 j + 20 i + a
        R[r0:r0 + 60 * m] = E.transpose(1, 2, 0).reshape(-1)
        if not want_jac:
            continue
        J = jz(Y.reshape(20, -1), kappa, LO[p]).reshape(20, 20, m, 3)
        jj = np.arange(m)
        for i in range(3):
            rI = r0 + 60 * jj[:, None] + 20 * i + np.arange(20)[None, :]       # (m, 20)
            # -I for y_j
            cI = L.node_idx(p, jj)
            rows.append(rI.ravel()); cols.append(cI.ravel()); vals.append(-np.ones(rI.size))
            for k in range(3):
                blk = -(h * Tp[p])[:, None, None] * RA[i, k] * J[:, :, :, k].transpose(2, 0, 1)  # (m, 20, 20)
                if i == k:
                    blk = blk + np.eye(20)[None]
                cK = L.stage_idx(p, jj, k) if k < 2 else L.node_idx(p, jj + 1)
                # entry (j, a, b) = d E_{(j,i),a} / d Y_{(j,k),b}
                rows.append(np.repeat(rI, 20, axis=1).ravel())
                cols.append(np.broadcast_to(cK[:, None, :], (m, 20, 20)).ravel())
                vals.append(blk.ravel())
            # dT_p
            rows.append(rI.ravel()); cols.append(np.full(rI.size, L.iTA if p == "A" else L.iTB))
            vals.append((-(h[:, None]) * AF[:, :, i].T).ravel())
            # dmu: F has + mu e_K / sigma_K in component K
            dmu = np.zeros((m, 20)); dmu[:, TM.IK] = -h * Tp[p] * RC[i] / SIG[TM.IK]
            rows.append(rI.ravel()); cols.append(np.full(rI.size, L.imu)); vals.append(dmu.ravel())
    # continuity and conditions
    nA, nB = L.nodes(x, "A"), L.nodes(x, "B")
    rc = L.rcont
    R[rc:rc + 20] = nA[:, -1] - nB[:, 0]
    R[rc + 20:rc + 40] = nB[:, -1] - nA[:, 0]
    R[rc + 40] = nA[TM.IV, 0] + 40.0 / SIG[TM.IV]
    R[rc + 41] = nA[TM.IV, -1] + 40.0 / SIG[TM.IV]
    yA0 = nA[:, 0] * SIG
    R[rc + 42] = TM.H(yA0, kappa) - H0
    if not want_jac:
        return R, None
    a = np.arange(20)
    for (r, pc, jn, sgn) in ((rc, "A", L.M["A"], 1.0), (rc, "B", 0, -1.0), (rc + 20, "B", L.M["B"], 1.0), (rc + 20, "A", 0, -1.0)):
        rows.append(r + a); cols.append(L.node_idx(pc, jn).ravel()); vals.append(np.full(20, sgn))
    rows.append([rc + 40]); cols.append(L.node_idx("A", 0)[0, [TM.IV]]); vals.append([1.0])
    rows.append([rc + 41]); cols.append(L.node_idx("A", L.M["A"])[0, [TM.IV]]); vals.append([1.0])
    rows.append(np.full(20, rc + 42)); cols.append(L.node_idx("A", 0).ravel()); vals.append(TM.H_grad(yA0, kappa) * SIG)
    Jm = sp.csc_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(L.n, L.n))
    return R, Jm


def newton(x, L, mesh, kappa, H0, tol=1e-10, maxit=30, log=None):
    R, J = residual_jacobian(x, L, mesh, kappa, H0)
    nr = np.max(np.abs(R))
    hist = [nr]
    for it in range(maxit):
        dx = spla.spsolve(J, -R)
        if not np.all(np.isfinite(dx)):
            return x, False, hist
        lam = 1.0
        while True:
            xn = x + lam * dx
            Rn, _ = residual_jacobian(xn, L, mesh, kappa, H0, want_jac=False)
            nrn = np.max(np.abs(Rn)) if np.all(np.isfinite(Rn)) else np.inf
            if nrn < nr or lam < 1e-3:
                break
            lam *= 0.5
        x = xn
        step = lam * np.max(np.abs(dx))
        if log:
            log("  newton %d |R| %.3e -> %.3e  lam %.3g  |dx| %.3e" % (it, nr, nrn, lam, step))
        R, J = residual_jacobian(x, L, mesh, kappa, H0)
        nr = np.max(np.abs(R))
        hist.append(nr)
        if nr < tol and step < 1e-8:
            return x, True, hist
        if not np.isfinite(nr):
            return x, False, hist
    return x, nr < tol, hist


# ---------------------------------------------------------------------------------------------- profiles and meshes
def profile(x, L, mesh):
    """dense samples (s, y) over one period from all collocation points (s ascending), physical units"""
    TA, TB = x[L.iTA], x[L.iTB]
    S, Yv = [], []
    for p, s0, T in (("A", 0.0, TA), ("B", TA, TB)):
        sg = mesh[p]
        h = np.diff(sg)
        nd = L.nodes(x, p)
        st = L.stages(x, p)
        S.append(s0 + T * sg[:1]); Yv.append(nd[:, :1])
        for j in range(L.M[p]):
            S.append(s0 + T * (sg[j] + h[j] * RC)); Yv.append(st[:, j, :])
    S = np.concatenate(S)
    Yv = np.concatenate(Yv, axis=1) * SIG[:, None]
    return S, Yv


def equidistribute(s, y, kappa, lo, M, beta):
    """mesh of M intervals on [0, 1] equidistributing rho = sqrt(beta^2 + |dz/ds|^2) along samples (s, y)"""
    dz = TM.field(y, kappa, lo) / SIG[:, None]
    rho = np.sqrt(beta ** 2 + np.sum(dz ** 2, axis=0))
    cum = np.concatenate([[0.0], np.cumsum(0.5 * (rho[1:] + rho[:-1]) * np.diff(s))])
    targets = np.linspace(0, cum[-1], M + 1)
    sn = np.interp(targets, cum, s)
    sg = (sn - s[0]) / (s[-1] - s[0])
    sg[0], sg[-1] = 0.0, 1.0
    return sg


def build(sA, yA, sB, yB, kappa, MA, MB, beta, mu=0.0):
    """unknown vector from dense samples of the two pieces (s ascending within each piece, physical y)"""
    L = Layout(MA, MB)
    mesh = {"A": equidistribute(sA, yA, kappa, False, MA, beta), "B": equidistribute(sB, yB, kappa, True, MB, beta)}
    x = np.zeros(L.n)
    for p, s, y in (("A", sA, yA), ("B", sB, yB)):
        T = s[-1] - s[0]
        sg = mesh[p]
        interp = lambda q: np.array([np.interp(s[0] + T * q, s, y[a]) for a in range(20)]) / SIG[:, None]  # noqa: E731
        nd = interp(sg)
        x[L.off[p]:L.off[p] + 20 * (L.M[p] + 1)] = nd.T.ravel()
        h = np.diff(sg)
        for i in range(2):
            st = interp(sg[:-1] + h * RC[i])        # (20, m)
            idx = L.stage_idx(p, np.arange(L.M[p]), i)
            x[idx] = st.T
    x[L.iTA] = sA[-1] - sA[0]
    x[L.iTB] = sB[-1] - sB[0]
    x[L.imu] = mu
    return x, L, mesh


def split_pieces(S, Y):
    """split a dense periodic profile (starting at the upstroke crossing) at the downward -40 crossing"""
    V = Y[TM.IV]
    k = np.nonzero((V[:-1] >= -40) & (V[1:] < -40))[0]
    if len(k) != 1:
        raise ValueError("expected one downward -40 crossing, found %d" % len(k))
    k = k[0]
    # linear interpolation of the crossing
    t = (V[k] + 40) / (V[k] - V[k + 1])
    sd = S[k] + t * (S[k + 1] - S[k]); yd = Y[:, k] + t * (Y[:, k + 1] - Y[:, k])
    sA = np.concatenate([S[:k + 1], [sd]]); yA = np.concatenate([Y[:, :k + 1], yd[:, None]], axis=1)
    sB = np.concatenate([[sd], S[k + 1:]]); yB = np.concatenate([yd[:, None], Y[:, k + 1:]], axis=1)
    return sA, yA, sB, yB


def remesh(x, L, mesh, kappa, MA, MB, beta):
    S, Y = profile(x, L, mesh)
    TA = x[L.iTA]
    a = S <= TA + 1e-12
    sA, yA = S[a], Y[:, a]
    sB = np.concatenate([[TA], S[~a]]); yB = np.concatenate([yA[:, -1:], Y[:, ~a]], axis=1)
    # close the period: B ends where A starts
    sB = np.concatenate([sB, [x[L.iTA] + x[L.iTB]]]); yB = np.concatenate([yB, yA[:, :1]], axis=1)
    return build(sA, yA, sB, yB, kappa, MA, MB, beta, mu=x[L.imu])


def summary(x, L, mesh, kappa, H0):
    S, Y = profile(x, L, mesh)
    TA, TB = x[L.iTA], x[L.iTB]
    T = TA + TB
    V = Y[TM.IV]
    A = S <= TA
    c = TM.c_of(kappa)
    R, _ = residual_jacobian(x, L, mesh, kappa, H0, want_jac=False)
    return dict(kappa=kappa, c_mm_per_ms=c, T_ms=T, L_mm=c * T, T_A_ms=TA, T_B_ms=TB, mu=x[L.imu],
                residual_max=float(np.max(np.abs(R))), Vmax=float(V.max()), Vmin=float(V.min()),
                Wmax=float(Y[TM.IW].max()), Na_i_mean=float(np.mean(Y[17])), K_i_mean=float(np.mean(Y[18])),
                piece_A_V_min=float(V[A].min()), piece_B_V_max=float(V[~A].max()),
                pieces_on_their_side=bool(V[A].min() >= -40 - 1e-9 and V[~A].max() <= -40 + 1e-9),
                MA=L.M["A"], MB=L.M["B"])


def save(path, x, L, mesh, kappa, H0, beta, extra=None):
    np.savez(path, x=x, MA=L.M["A"], MB=L.M["B"], meshA=mesh["A"], meshB=mesh["B"], kappa=kappa, H0=H0, beta=beta,
             info=json.dumps(extra or {}))


def load(path):
    d = np.load(path)
    L = Layout(int(d["MA"]), int(d["MB"]))
    mesh = {"A": d["meshA"], "B": d["meshB"]}
    return d["x"].copy(), L, mesh, float(d["kappa"]), float(d["H0"]), float(d["beta"])


# ---------------------------------------------------------------------------------------------- commands
def cmd_init(a):
    d = np.load(a.snapshot)
    S, Y = d["s"], d["y"]
    sA, yA, sB, yB = split_pieces(S, Y)
    MA, MB = (int(v) for v in a.M.split(","))
    x, L, mesh = build(sA, yA, sB, yB, a.kappa, MA, MB, a.beta)
    H0 = TM.H0_REST if a.H0 is None else a.H0
    log = lambda m: print(m, flush=True)  # noqa: E731
    log("init: kappa %.6g c %.6g mm/ms, guess T %.4f ms, H(guess) %.6f, H0 %.6f" % (a.kappa, TM.c_of(a.kappa), x[L.iTA] + x[L.iTB],
                                                                                  TM.H(yA[:, 0], a.kappa), H0))
    for rnd in range(a.rounds):
        x, ok, hist = newton(x, L, mesh, a.kappa, H0, log=log, maxit=a.maxit)
        log("round %d: ok %s  %s" % (rnd, ok, json.dumps(summary(x, L, mesh, a.kappa, H0))))
        if not ok:
            break
        x, L, mesh = remesh(x, L, mesh, a.kappa, MA, MB, a.beta)
    x, ok, hist = newton(x, L, mesh, a.kappa, H0, log=log, maxit=a.maxit)
    s = summary(x, L, mesh, a.kappa, H0)
    log("final: ok %s %s" % (ok, json.dumps(s)))
    if ok:
        save(a.out, x, L, mesh, a.kappa, H0, a.beta, s)
    return 0 if ok else 1


def cmd_cont(a):
    x, L, mesh, kappa, H0, beta = load(a.start)
    MA, MB = L.M["A"], L.M["B"]
    os.makedirs(a.out_dir, exist_ok=True)
    rows_path = os.path.join(a.out_dir, "branch.jsonl")
    log = lambda m: print(m, flush=True)  # noqa: E731
    dk = a.dk if a.kappa_stop > kappa else -abs(a.dk)
    prev = None
    k = kappa
    for step in range(a.max_steps):
        if (dk > 0 and k >= a.kappa_stop) or (dk < 0 and k <= a.kappa_stop):
            break
        kn = k + dk
        xg = x if prev is None else x + (x - prev[0]) * (dk / (k - prev[1]))  # secant predictor
        t0 = time.time()
        xn, ok, hist = newton(xg.copy(), L, mesh, kn, H0, maxit=a.maxit)
        if not ok:
            log("step %d kappa %.6g failed (|R| %s); halving" % (step, kn, hist[-1]))
            dk *= 0.5
            if abs(dk) < a.dk_min:
                log("step too small; stop")
                break
            continue
        prev = (x, k)
        x, k = xn, kn
        if step % a.remesh_every == 0:
            x, L, mesh = remesh(x, L, mesh, k, MA, MB, beta)
            x, ok, hist = newton(x, L, mesh, k, H0, maxit=a.maxit)
            prev = None
            if not ok:
                log("remesh failed at %.6g" % k)
                break
        s = summary(x, L, mesh, k, H0)
        s.update(newton_its=len(hist) - 1, secs=round(time.time() - t0, 1))
        log(json.dumps(s))
        with open(rows_path, "a") as f:
            f.write(json.dumps(s) + "\n")
        save(os.path.join(a.out_dir, "sol_%.6f.npz" % k), x, L, mesh, k, H0, beta, s)
        if len(hist) <= 4 and abs(dk) < a.dk_max:
            dk *= 1.5
    return 0


def cmd_mesh(a):
    x0, L0, mesh0, kappa, H0, beta = load(a.start)
    out = []
    for Ms in a.M_list.split(";"):
        MA, MB = (int(v) for v in Ms.split(","))
        x, L, mesh = remesh(x0, L0, mesh0, kappa, MA, MB, beta)
        x, ok, hist = newton(x, L, mesh, kappa, H0, maxit=a.maxit)
        if ok:  # one remesh on the converged solution, then solve again
            x, L, mesh = remesh(x, L, mesh, kappa, MA, MB, beta)
            x, ok, hist = newton(x, L, mesh, kappa, H0, maxit=a.maxit)
        s = summary(x, L, mesh, kappa, H0)
        s["ok"] = bool(ok)
        print(json.dumps(s), flush=True)
        out.append(s)
    json.dump(dict(note="mesh study of the collocation solution (numerical, not a proof)", kappa=kappa, H0=H0, beta=beta, rows=out),
              open(a.out, "w"), indent=1)
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("init"); p.add_argument("snapshot"); p.add_argument("kappa", type=float); p.add_argument("out")
    p.add_argument("--M", default="600,600"); p.add_argument("--beta", type=float, default=0.3); p.add_argument("--H0", type=float)
    p.add_argument("--rounds", type=int, default=3); p.add_argument("--maxit", type=int, default=40)
    q = sub.add_parser("cont"); q.add_argument("start"); q.add_argument("kappa_stop", type=float); q.add_argument("out_dir")
    q.add_argument("--dk", type=float, default=0.02); q.add_argument("--dk-min", type=float, default=1e-5)
    q.add_argument("--dk-max", type=float, default=0.1); q.add_argument("--max-steps", type=int, default=200)
    q.add_argument("--maxit", type=int, default=25); q.add_argument("--remesh-every", type=int, default=5)
    r = sub.add_parser("mesh"); r.add_argument("start"); r.add_argument("out"); r.add_argument("--M-list", default="300,300;600,600")
    r.add_argument("--maxit", type=int, default=30)
    a = ap.parse_args()
    return dict(init=cmd_init, cont=cmd_cont, mesh=cmd_mesh)[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main() or 0)
