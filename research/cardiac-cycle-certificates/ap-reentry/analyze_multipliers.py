"""Eigenvalues of the FD Jacobian DP of the shift map at the converged rotating wave, Floquet multipliers mu^N of the
full reentry orbit, identification of the charge eigenvalue and the leading nontrivial modes (spatial Fourier index
from the eigenvector phase between neighbouring cells, dominant state components).
Usage: python3 analyze_multipliers.py N c newton.npz J_a.npy J_b.npy out.json"""
import sys, json
import numpy as np
import tp06_19d as M
from rotwave import ShiftMap

N, c, src, ja, jb, dst = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
d = np.load(src, allow_pickle=True)
u = d["u"]
J = np.hstack([np.load(ja), np.load(jb)])
n = len(u)
sm = ShiftMap(N, c, M.params("author"))
x = sm.full(u)
g = sm.gQ(x)
ev, W = np.linalg.eig(J)
o = np.argsort(-np.abs(ev)); ev = ev[o]; W = W[:, o]
# charge eigenvalue: left eigenvector g, so the right eigenvector with eigenvalue ~1 has g.w != 0
lev, LW = np.linalg.eig(J.T)
k1 = int(np.argmin(np.abs(lev - 1)))
cosang = abs(np.vdot(LW[:, k1], g)) / (np.linalg.norm(LW[:, k1]) * np.linalg.norm(g))
ich = int(np.argmin(np.abs(ev - 1)))
names = M.NAMES


def describe(w):
    full = np.concatenate([[0.0], w]).reshape(19, N)  # V_0 is fixed on the section
    amp = np.abs(full).sum(axis=1)
    top = [names[k] for k in np.argsort(-amp)[:4]]
    # spatial Fourier content of the dominant component
    k = int(np.argmax(amp))
    spec = np.abs(np.fft.fft(full[k]))
    return dict(top_states=top, dominant_fourier_index=int(np.argmax(spec[: N // 2 + 1])))


rows = []
for i in range(min(40, n)):
    if i == ich:
        continue
    rows.append(dict(i=i, re=float(ev[i].real), im=float(ev[i].imag), abs=float(abs(ev[i])),
                     full_abs=float(abs(ev[i]) ** N), full_dist_from_1=float(1 - abs(ev[i]) ** N), **describe(W[:, i])))
nontriv = np.delete(ev, ich)
out = dict(N=N, c=c, n_section=n, leaf_dim=n - 1, tau=float(d["tau"]), T=float(N * d["tau"]),
           charge_eigenvalue=[float(ev[ich].real), float(ev[ich].imag)],
           charge_left_eigvec_cos_with_gradQ=float(cosang),
           spectral_radius_shift_nontrivial=float(np.abs(nontriv).max()),
           spectral_radius_full_nontrivial=float(np.abs(nontriv).max() ** N),
           counts_full_abs_gt={str(t): int((np.abs(nontriv) ** N > t).sum()) for t in (0.999, 0.99, 0.9, 0.5, 0.1, 1e-3)},
           leading=rows[:24])
json.dump(out, open(dst, "w"), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != "leading"}, indent=1))
for r in rows[:24]:
    print("%3d  %+.9f %+.9fi  |mu|=%.9f  |mu|^N=%.7f  1-|mu|^N=%.2e  %s fourier %d" % (
        r["i"], r["re"], r["im"], r["abs"], r["full_abs"], r["full_dist_from_1"], ",".join(r["top_states"]),
        r["dominant_fourier_index"]))
