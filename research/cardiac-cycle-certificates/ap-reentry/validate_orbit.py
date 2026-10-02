"""Checks on the converged rotating wave (newton_dense.py output):
 1. a full rotation as N successive shift maps (Radau, rtol 1e-12): closure ||R(u*) - u*|| and the N return times;
 2. one shift interval recorded densely: crossings of V = -40 and V = 15 (counts, dV/dt at crossings), time spent
    with |V - 15| < 0.5 mV, AP characteristics, stiffness (largest |eigenvalue| of each 19x19 cell Jacobian);
 3. independent check of the leading multiplier: central differences of the full return map R = P^N along the
    real and imaginary parts of the leading eigenvector of the FD Jacobian (2x2 restriction, eigenvalues).
Usage: python3 validate_orbit.py N c newton.npz J_a.npy J_b.npy out.json"""
import sys, json, time
import numpy as np
import tp06_19d as M
from rotwave import ShiftMap

N, c, src, ja, jb, dst = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
d = np.load(src, allow_pickle=True)
u = d["u"]
p = M.params("author")
sm = ShiftMap(N, c, p, rtol=1e-12, method="Radau")
out = dict(N=N, c=c)
t0 = time.time()

# 1. full rotation
v, taus = u.copy(), []
for k in range(N):
    v, tau, ev = sm.P(v)
    taus.append(tau)
out["return_times"] = taus
out["T_sum"] = float(np.sum(taus))
out["closure_scaled_norm"] = float(np.linalg.norm(v - u))
out["closure_scaled_max"] = float(np.abs(v - u).max())
print("full rotation: T = %.10f, closure %.3e, tau spread %.3e (%.0f s)" % (np.sum(taus), np.linalg.norm(v - u),
      max(taus) - min(taus), time.time() - t0), flush=True)

# 2. one shift recorded
o = sm.flow_to_next(sm.full(u), record=True)
rt, ry = o["rec_t"], o["rec_y"]
V = ry[:N]
dVdt_at = []
for te, i, dr in o["events"]:
    y = o["y"] if te == o["t"] else None
cross = {}
for lvl in (-40.0, 15.0):
    up = int(np.sum((V[:, :-1] < lvl) & (V[:, 1:] >= lvl))); dn = int(np.sum((V[:, :-1] >= lvl) & (V[:, 1:] < lvl)))
    cross[str(lvl)] = dict(up_per_shift=up, down_per_shift=dn, up_per_rotation=up * N, down_per_rotation=dn * N,
                           per_cell_per_rotation=(up * N + dn * N) / N)
out["crossings"] = cross
out["events_per_shift"] = [(float(te), int(i), int(dr)) for te, i, dr in o["events"]]
# dV/dt at the -40 events (from the vector field at the event states)
dv = []
for te, i, dr in o["events"]:
    k = int(np.argmin(np.abs(rt - te)))
    lo = ry[:N, k] < -40
    f = sm.ring.rhs(te, ry[:, k], lo, np.zeros(N))
    dv.append(dict(t=float(te), cell=int(i), dir=int(dr), dVdt=float(f[i])))
out["dVdt_at_m40_events"] = dv
# time with |V-15| < 0.5 in the shift interval (summed over cells), via step lengths
dt = np.diff(rt)
near = (np.abs(V[:, :-1] - 15) < 0.5)
out["time_cells_near_15mV_per_shift_ms"] = float((near * dt).sum())
out["Vmax"] = float(V.max()); out["Vmin"] = float(V.min())
# stiffness along the recorded shift: largest |eig| of the 19x19 cell Jacobian (central FD)
lam = []
idx = np.linspace(0, len(rt) - 1, 60).astype(int)
for k in idx:
    Y = ry[:, k].reshape(19, N)
    lo = Y[0] < -40
    Jc = np.zeros((N, 19, 19))
    for a in range(19):
        hh = 1e-7 * max(1.0, abs(Y[a]).max()) if a not in (14, 16) else 1e-10
        Yp = Y.copy(); Yp[a] += hh; Ym = Y.copy(); Ym[a] -= hh
        Jc[:, :, a] = ((M.field(Yp, p, lo=lo) - M.field(Ym, p, lo=lo)) / (2 * hh)).T
    lam.append(float(max(np.abs(np.linalg.eigvals(Jc[i])).max() for i in range(N))))
out["stiffness_max_abs_eig_per_ms"] = max(lam)
out["stiffness_min_over_samples"] = min(lam)
print("crossings", json.dumps(cross), "stiffness max %.1f /ms" % max(lam), flush=True)

# 3. leading multiplier via the full return map
J = np.hstack([np.load(ja), np.load(jb)])
ev, W = np.linalg.eig(J)
ich = int(np.argmin(np.abs(ev - 1)))
ev2 = ev.copy(); ev2[ich] = 0
k = int(np.argmax(np.abs(ev2)))
w = W[:, k]
basis = [w.real / np.linalg.norm(w.real), w.imag / np.linalg.norm(w.imag)] if abs(ev[k].imag) > 0 else [w.real / np.linalg.norm(w.real)]
B = np.array(basis).T
h = 1e-4


def R(z):
    for _ in range(N):
        z = sm.P(z)[0]
    return z


cols = []
for b in basis:
    cols.append((R(u + h * b) - R(u - h * b)) / (2 * h))
C = np.array(cols).T
small = np.linalg.lstsq(B, C, rcond=None)[0]
mu = np.linalg.eigvals(small)
out["leading_from_FD_jacobian"] = dict(shift=[float(ev[k].real), float(ev[k].imag)], full_abs=float(abs(ev[k]) ** N))
out["leading_from_full_return_map"] = dict(eigs=[[float(m.real), float(m.imag)] for m in mu],
                                           abs=[float(abs(m)) for m in mu],
                                           residual_outside_subspace=float(np.linalg.norm(C - B @ small) / np.linalg.norm(C)))
out["secs"] = round(time.time() - t0, 1)
json.dump(out, open(dst, "w"), indent=1)
print(json.dumps({k: out[k] for k in ("leading_from_FD_jacobian", "leading_from_full_return_map", "secs")}))
