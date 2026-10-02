"""Chord/Broyden Newton for the rotating-wave fixed point of the shift map, using a dense FD Jacobian (jac_fd.py)
and the bordered system [[DP - I, g], [g^T, 0]] that fixes the conserved total charge.  Resumable.
Usage: python3 newton_dense.py N c start.npz J_a.npy J_b.npy out.npz iters [rtol]"""
import sys, json, time
import numpy as np
import tp06_19d as M
from rotwave import ShiftMap

N, c, src, ja, jb, dst, iters = (int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5],
                                 sys.argv[6], int(sys.argv[7]))
rtol = float(sys.argv[8]) if len(sys.argv) > 8 else 1e-12
d = np.load(src, allow_pickle=True)
u, q0 = d["u"], float(d["q0"])
A = np.hstack([np.load(ja), np.load(jb)]) - np.eye(len(u)) if "A" not in d else d["A"]
hist = list(d["hist"]) if "hist" in d else []
sm = ShiftMap(N, c, M.params("author"), rtol=rtol, method="Radau")
n = len(u)
Pu, tau, ev = sm.P(u)
F = Pu - u
t0 = time.time()
for it in range(iters):
    x = sm.full(u)
    g = sm.gQ(x)
    B = np.zeros((n + 1, n + 1)); B[:n, :n] = A; B[:n, n] = g; B[n, :n] = g
    rhs = np.concatenate([-F, [q0 - sm.Q(x)]])
    z = np.linalg.solve(B, rhs)
    s = z[:n]
    un = u + s
    Pn, taun, evn = sm.P(un)
    Fn = Pn - un
    A = A + np.outer((Fn - F) - A @ s, s) / (s @ s)  # good Broyden update
    rec = dict(it=len(hist), resid=float(np.linalg.norm(F)), resid_new=float(np.linalg.norm(Fn)),
               step=float(np.linalg.norm(s)), mu=float(z[n]), tau=taun, T=N * taun, dQ=float(q0 - sm.Q(sm.full(un))),
               n_events=len(evn), secs=round(time.time() - t0, 1))
    print(json.dumps(rec), flush=True)
    hist.append(rec)
    u, F = un, Fn
    np.savez(dst, u=u, q0=q0, A=A, hist=np.array(hist, dtype=object), tau=taun, N=N, c=c, rtol=rtol)
    if np.linalg.norm(F) < 1e-11:
        break
