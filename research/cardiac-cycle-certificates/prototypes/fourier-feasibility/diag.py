"""Diagnostics (untrusted, floating point) for a Gershgorin-type stability certificate of the Hill block H_0.
Usage: python3 diag.py N Kextra
"""
import math, sys, time
import numpy as np
import scipy.linalg as sl
import rw_fourier as r

N = int(sys.argv[1]); KE = int(sys.argv[2]) if len(sys.argv) > 2 else 16
L = 33
Z, om = r.single_cell_samples(L)
c = N * N * r.D
Z, om, res, _ = r.solve_rw(Z, om, N, L, c)
T = 2 * math.pi / om
Jt = r.jac_cs(Z)
An = np.fft.fft(Jt, axis=0) / L
kf = np.fft.fftfreq(L, 1.0 / L).astype(int)
print("N", N, "T", T)
print("max|A_n| by n:", " ".join(f"{n}:{np.abs(An[kf == n][0]).max():.1e}" for n in range(0, 12)))
A0 = An[kf == 0][0].real
w, W = np.linalg.eig(A0)
print("A_0 eigenvalues (sorted by Re):", np.array2string(np.sort_complex(w), precision=3, max_line_width=200))
print(f"cond(eigvecs A_0) = {np.linalg.cond(W):.2e}")
M = N // 2 + KE
H, Amap = r.hill_spectrum(Z, om, N, c, M)
t0 = time.time()
ev, VL, VR = sl.eig(H, left=True, right=True)
print(f"eig with vectors: {time.time() - t0:.1f}s, size {H.shape[0]}")
# eigenvalue condition numbers
s = np.abs(np.sum(VL.conj() * VR, axis=0)) / (np.linalg.norm(VL, axis=0) * np.linalg.norm(VR, axis=0))
kappa = 1 / s
half = om * N / 2
sel = np.where(np.abs(ev.imag) <= half)[0]
order = sel[np.argsort(-ev[sel].real)]
print("leading eigenvalues in strip with condition numbers:")
for i in order[:10]:
    print(f"   {ev[i].real:+.6e} {ev[i].imag:+.6e}i  kappa = {kappa[i]:.2e}")
print(f"max kappa over strip eigenvalues with Re > -1e-3: {kappa[sel][ev[sel].real > -1e-3].max():.2e}; overall max {kappa.max():.2e}")
# Gershgorin in eigen-coordinates (floating point estimate): R = X^{-1} H X - diag(ev)
X = VR
t0 = time.time()
Y = np.linalg.inv(X)
Rm = Y @ H @ X - np.diag(ev)
rad = np.abs(Rm).sum(axis=1) - np.abs(np.diag(Rm))
print(f"cond(X) = {np.linalg.cond(X):.2e}; float Gershgorin radii: max over strip eigenvalues with Re>-1e-3: "
      f"{rad[sel][ev[sel].real > -1e-3].max():.2e} ({time.time() - t0:.1f}s)")
# tail coupling of each finite eigenvector: mass of right eigenvector in the outermost blocks, and coupling to tail
nb = 2 * M + 1
blockmass = np.array([[np.linalg.norm(X[18 * b:18 * b + 18, i]) for b in range(nb)] for i in range(X.shape[1])])
ylm = np.array([[np.linalg.norm(Y[i, 18 * b:18 * b + 18]) for b in range(nb)] for i in range(X.shape[1])])
edge = 4
near = sel[ev[sel].real > -1e-3]
print(f"near-axis eigenvectors: max right-vector mass in outer {edge} blocks {blockmass[near][:, :edge].max():.1e}/{blockmass[near][:, -edge:].max():.1e}; "
      f"left rows: {ylm[near][:, :edge].max():.1e}/{ylm[near][:, -edge:].max():.1e}")
# tail block Gershgorin: tail blocks diag = -i om m + eig(A_0 + c lam_m E); off-diagonal coupling sum_n!=0 |W^-1 A_n W|
offsum = 0
for n in Amap:
    if n != 0:
        offsum += np.abs(np.linalg.solve(W, Amap[n] @ W)).sum(axis=1).max()
print(f"tail Gershgorin radius estimate (A_0 eigenbasis, row sums over n != 0): {offsum:.2e}; gap available om*KE = {om * KE:.2e}")
