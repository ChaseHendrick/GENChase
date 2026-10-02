"""Propose the coordinate frame and radii on the conserved-charge leaf for `ap_proof verify` (untrusted; ap_proof
checks everything rigorously). The algorithm is proofs/frame.py's (ordered real Schur form, slow eigenvectors in
real 1x1 / 2x2 blocks, fast Schur vectors, Perron radii), applied to the leaf-restricted shift-map Jacobian.

Coordinates. ap_proof uses scaled variables z = x / 2^SCALE_EXP (cell-major). The leaf coordinates u are all z except
z_0 (V_0, fixed on the section) and z_18 (K_i of cell 0, fixed by the total charge: K_0 = (Q0 - R(u)) / 2^7).
Input Jacobian: the floating-point shift-map Jacobian of rotwave.ShiftMap in its coordinates (hybrid.SCALE, state-major,
all states but V_0), e.g. the central-difference matrices of jac_fd.py. It is converted to z, restricted to the leaf by
the chain rule DG = pi DP Diota, and the frame is built for DG.

Frame file (read by ap_proof): "N coupling Q0hex", u (n hex), At (n x n hex, row-major), nb, then "size radius" per block.
Usage: python3 frame_leaf.py --N 16 --c 0.035 --state STATE --jac J.npy [J2.npy ...] --out frame.txt
       [--rho0 1e-9] [--slow 1e-6] [--diag diag.txt --safety 1.5]
STATE: a json with "x" (physical, state-major, as results/orbit_N16_c0.035_section_state.json) or an .npy of it.
"""
import argparse, json
import numpy as np
import scipy.linalg as sl
from common import M, SCALE_EXP, to_capd
from hybrid import SCALE


def leaf_jacobian(x, N, J_hyb):
    """x physical state-major (19N); J_hyb (19N-1)^2 in rotwave coordinates -> DG on the leaf (n = 19N-2), scaled z."""
    dim = 19 * N
    # free coordinate i of rotwave = state-major index i+1 = (a, k) -> capd index 19k + a; factor z = u * SCALE[a] / 2^e[a]
    cap_of_free = []
    fac = []
    for i in range(dim - 1):
        a, k = divmod(i + 1, N)
        cap_of_free.append(19 * k + a)
        fac.append(SCALE[a] / 2.0 ** SCALE_EXP[a])
    fac = np.array(fac)
    # DP in capd free coordinates (all capd indices except 0), ordered by capd index
    order = np.argsort(cap_of_free)            # position in capd-free order -> rotwave free index
    Jz = (fac[:, None] * J_hyb / fac[None, :])[np.ix_(order, order)]
    cap_sorted = np.array(cap_of_free)[order]  # = 1..dim-1
    assert np.array_equal(cap_sorted, np.arange(1, dim))
    # leaf: drop capd index 18 (position 17 in the free list)
    Y = np.asarray(x, float).reshape(19, N)
    gphys = M.charge_grad(Y, M.params("author"))          # dQ/dx, (19, N)
    gz = np.array([gphys[a, k] * 2.0 ** SCALE_EXP[a] for k in range(N) for a in range(19)])  # dQ/dz, capd order
    leaf = [c for c in range(1, dim) if c != 18]
    pos = {c: c - 1 for c in range(1, dim)}
    Diota = np.zeros((dim - 1, dim - 2))
    for j, c in enumerate(leaf):
        Diota[pos[c], j] = 1.0
        Diota[pos[18], j] = -gz[c] / gz[18]
    DG = Jz[[pos[c] for c in leaf], :] @ Diota
    return DG


def build_frame(u, B, slow):
    n = len(u)
    s = np.maximum(np.abs(u), 1e-6)
    Bs = np.diag(1 / s) @ B @ np.diag(s)
    Tm, Q, k = sl.schur(Bs, output="real", sort=lambda re, im: np.hypot(re, im) >= slow)
    T11 = Tm[:k, :k]
    w, Yv = np.linalg.eig(T11)
    o = np.argsort(-np.abs(w)); w = w[o]; Yv = Yv[:, o]
    cols, blocks, used = [], [], np.zeros(len(w), bool)
    for i in range(len(w)):
        if used[i]:
            continue
        if abs(w[i].imag) > 1e-12 * max(1.0, abs(w[i])):
            j = min((jj for jj in range(len(w)) if not used[jj] and jj != i), key=lambda jj: abs(w[jj] - np.conj(w[i])))
            used[i] = used[j] = True
            v = Yv[:, i] if w[i].imag > 0 else Yv[:, j]
            v = v / np.linalg.norm(v)
            cols += [v.real, v.imag]; blocks.append(2)
        else:
            used[i] = True
            v = Yv[:, i].real
            cols.append(v / np.linalg.norm(v)); blocks.append(1)
    W1 = Q[:, :k] @ np.array(cols).T if cols else np.zeros((n, 0))
    T22 = Tm[k:, k:]
    i = 0
    while i < n - k:
        if i + 1 < n - k and abs(T22[i + 1, i]) > 1e-14 * max(1e-300, np.abs(T22).max()):
            blocks.append(2); i += 2
        else:
            blocks.append(1); i += 1
    W = np.hstack([W1, Q[:, k:]])
    return np.diag(s) @ W, blocks, W, Bs, s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--N", type=int, required=True); ap.add_argument("--c", required=True)
    ap.add_argument("--state", required=True); ap.add_argument("--jac", nargs="+", required=True)
    ap.add_argument("--out", required=True); ap.add_argument("--rho0", type=float, default=1e-9)
    ap.add_argument("--slow", type=float, default=1e-6); ap.add_argument("--floor", type=float, default=1e-13)
    ap.add_argument("--diag"); ap.add_argument("--safety", type=float, default=1.5)
    a = ap.parse_args()
    N = a.N
    x = np.array(json.load(open(a.state))["x"], float) if a.state.endswith(".json") else np.load(a.state)
    assert x[0] == -40.0, "state not on the section V_0 = -40"
    J = np.hstack([np.load(f) for f in a.jac])
    z = to_capd(x, N)
    u = np.array([z[c] for c in range(1, 19 * N) if c != 18])
    Q0 = float(np.sum(M.charge(x.reshape(19, N), M.params("author"))))
    DG = leaf_jacobian(x, N, J)
    At, blocks, W, Bs, s = build_frame(u, DG, a.slow)
    nb = len(blocks)
    idx, p = [], 0
    for b in blocks:
        idx.append(list(range(p, p + b))); p += b
    if a.diag:
        D = open(a.diag).read().split("\n")
        assert int(D[0]) == nb
        g0 = np.array(list(map(float, D[1].split())))
        Mn = np.array([list(map(float, D[2 + i].split())) for i in range(nb)])
    else:
        Mt = np.linalg.solve(W, Bs @ W)
        Mn = np.array([[np.linalg.norm(Mt[np.ix_(idx[bi], idx[bj])], 2) for bj in range(nb)] for bi in range(nb)])
        g0 = np.full(nb, 1e-15)
    Mf = Mn + a.floor
    rho = np.ones(nb)
    for _ in range(20000):
        r2 = Mf @ rho; r2 /= r2.max()
        if np.allclose(r2, rho, rtol=1e-13, atol=0):
            rho = r2; break
        rho = r2
    q = max((Mf @ rho) / rho)
    if a.diag:
        delta = 0.5 * g0 + 1e-3 * g0.max()
        rho = np.linalg.solve(np.eye(nb) - Mf, g0 + delta) * a.safety
    else:
        rho = np.maximum(rho, 1e-6) * a.rho0
    with open(a.out, "w") as f:
        f.write("%d %s %s\n" % (N, a.c, Q0.hex()))
        f.write(" ".join(float(v).hex() for v in u) + "\n")
        for i in range(len(u)):
            f.write(" ".join(float(v).hex() for v in At[i]) + "\n")
        f.write("%d\n" % nb)
        for b, r in zip(blocks, rho):
            f.write("%d %s\n" % (b, float(r).hex()))
    ev = np.linalg.eigvals(DG)
    print(json.dumps(dict(N=N, leaf_dim=len(u), blocks=nb, predicted_q=float(q), spectral_radius_DG=float(np.abs(ev).max()),
                          radii=[float(rho.min()), float(rho.max())], Q0=Q0)))


if __name__ == "__main__":
    main()
