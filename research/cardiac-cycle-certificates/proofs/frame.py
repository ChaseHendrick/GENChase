"""Propose the coordinate frame and radii for verify.cpp (untrusted; verify.cpp checks everything rigorously).

Free coordinates (all but V_0) are scaled by S = diag(max(|xhat_i|, 1e-6)). For B = S^{-1} DG S (DG from orbit_newton):
  * an ordered real Schur form B = Q T Q^T puts the slow eigenvalues (modulus >= SLOW) first;
  * slow directions: eigenvectors of T11 in real form (1x1 blocks, or 2x2 rotation-scalings for complex pairs),
    mapped back by Q1; they are well separated and well conditioned here;
  * fast directions: the remaining Schur vectors Q2 (orthonormal, stable even when the fast eigenvectors are nearly
    parallel), one block per 1x1 or 2x2 diagonal block of T22.
Radii: Perron vector of the predicted block-norm matrix (|W^{-1} B W| in block norms, plus a floor for interval
error), scaled so that the centre residual uses at most a fraction of the margin. With --diag, the block-norm
matrix and residuals measured by a previous verify run (VERIFY_DIAG) are used instead of the prediction.

Usage: python3 frame.py orbit.txt gKsLo gKsHi couplingNum couplingDen frame.txt [--diag diag.txt] [--rho0 1e-9]
"""
import argparse
import numpy as np
import scipy.linalg as sl

SLOW = 0.3


def block_norm(M, bi, bj):
    sub = M[np.ix_(bi, bj)]
    return np.linalg.norm(sub, 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("orbit"); ap.add_argument("glo"); ap.add_argument("ghi"); ap.add_argument("cn"); ap.add_argument("cd")
    ap.add_argument("dst"); ap.add_argument("--diag"); ap.add_argument("--rho0", type=float, default=1e-9)
    ap.add_argument("--floor", type=float, default=1e-13); ap.add_argument("--safety", type=float, default=1.5); ap.add_argument("--frame-from")
    a = ap.parse_args()
    L = open(a.orbit).read().split("\n")
    N = int(L[0].split()[0]); T = L[0].split()[1]
    dim = 18 * N; n = dim - 1
    x = np.array(list(map(float, L[1].split())))
    DG = np.array([list(map(float, L[2 + i].split())) for i in range(dim)])
    B = DG[1:, 1:]
    s = np.maximum(np.abs(x[1:]), 1e-6)

    if a.frame_from:  # reuse the frame (At, blocks) of an earlier frame file, only retune radii
        F = open(a.frame_from).read().split("\n")
        At = np.array([list(map(float, F[2 + i].split())) for i in range(n)])
        nb = int(F[2 + n]); blocks = [int(F[3 + n + b].split()[0]) for b in range(nb)]
        W = np.diag(1 / s) @ At
    else:
        Bs = np.diag(1 / s) @ B @ np.diag(s)
        Tm, Q, k = sl.schur(Bs, output="real", sort=lambda re, im: np.hypot(re, im) >= SLOW)
        T11 = Tm[:k, :k]
        w, Y = np.linalg.eig(T11)
        order = np.argsort(-np.abs(w)); w = w[order]; Y = Y[:, order]
        cols, blocks, used = [], [], np.zeros(len(w), bool)
        for i in range(len(w)):
            if used[i]:
                continue
            if abs(w[i].imag) > 1e-12 * max(1.0, abs(w[i])):
                j = min((jj for jj in range(len(w)) if not used[jj] and jj != i), key=lambda jj: abs(w[jj] - np.conj(w[i])))
                used[i] = used[j] = True
                v = Y[:, i] if w[i].imag > 0 else Y[:, j]
                v = v / np.linalg.norm(v)
                cols += [v.real, v.imag]; blocks.append(2)
            else:
                used[i] = True
                v = Y[:, i].real
                cols.append(v / np.linalg.norm(v)); blocks.append(1)
        W1 = Q[:, :k] @ np.array(cols).T
        # fast part: Schur vectors, blocks from the quasi-triangular T22
        T22 = Tm[k:, k:]
        i = 0
        while i < n - k:
            if i + 1 < n - k and abs(T22[i + 1, i]) > 1e-14 * max(1e-300, np.abs(T22).max()):
                blocks.append(2); i += 2
            else:
                blocks.append(1); i += 1
        W = np.hstack([W1, Q[:, k:]])
        At = np.diag(s) @ W

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
        Bs = np.diag(1 / s) @ B @ np.diag(s)
        Mt = np.linalg.solve(W, Bs @ W)
        Mn = np.array([[block_norm(Mt, idx[bi], idx[bj]) for bj in range(nb)] for bi in range(nb)])
        g0 = np.full(nb, 1e-15)
    Mf = Mn + a.floor
    # Perron vector by power iteration
    rho = np.ones(nb)
    for _ in range(20000):
        r2 = Mf @ rho
        r2 /= r2.max()
        if np.allclose(r2, rho, rtol=1e-13, atol=0):
            rho = r2; break
        rho = r2
    q = max((Mf @ rho) / rho)
    if q >= 1:
        raise SystemExit(f"Perron root of the block-norm matrix is {q:.9f} >= 1; no radii can work")
    if a.diag:
        # minimal radii for invariance: rho = (I - Mn)^{-1} (g0 + delta), so that Mn rho + g0 = rho - delta < rho;
        # the safety factor absorbs the growth of Mn with the box.
        delta = 0.5 * g0 + 1e-3 * g0.max()
        rho = np.linalg.solve(np.eye(nb) - Mf, g0 + delta) * a.safety
        if np.any(rho <= 0):
            raise SystemExit("negative radius from the linear solve")
    else:
        # first pass (no measured residuals yet): Perron shape, clamped to a ratio of 1e-6, largest radius rho0
        rho = np.maximum(rho, 1e-6) * a.rho0
    with open(a.dst, "w") as f:
        f.write(f"{N} {a.glo} {a.ghi} {a.cn} {a.cd}\n")
        f.write(" ".join(repr(float(v)) for v in x) + "\n")
        for i in range(n):
            f.write(" ".join(repr(float(v)) for v in At[i]) + "\n")
        f.write(f"{nb}\n")
        for b, r in zip(blocks, rho):
            f.write(f"{b} {float(r)!r}\n")
    print(f"N={N} dim={dim} blocks={nb} predicted q={q:.9f} radii {rho.min():.2e}..{rho.max():.2e} section time={T}")


if __name__ == "__main__":
    main()
