import sys, numpy as np
from fsolve import f_scaled, jac_scaled, dk_of, SIG
NAMES = ["V","Xr1","Xr2","Xs","m","h","j","d","f","f2","fCass","s","r","Rp","Ca_i","Ca_sr","Ca_ss","Na_i"]
M = 64; K = 20
for N in (1, 64, 0):
    d = np.load(f'orbit_N{N}_M{M}.npz'); Z, T = d['Z'], float(d['T']); w = 1 / T
    a = np.fft.fft(Z, axis=1) / M
    if N == 1:
        rel = np.abs(a[:, 1]) / np.abs(a[:, 0].real)
        o = np.argsort(-rel)
        print('relative k=1 amplitude 2|a1|/|a0| by component:', ', '.join(f'{NAMES[i]} {2*rel[i]:.3g}' for i in o[:8]))
    J = jac_scaled(Z); Jh = np.fft.fft(J, axis=0) / M
    ks = np.arange(-K, K + 1); nG = 18 * len(ks)
    A = np.zeros((nG + 1, nG + 1), complex)
    for p, k in enumerate(ks):
        for q, j in enumerate(ks):
            if abs(k - j) < M // 2: A[18*p:18*p+18, 18*q:18*q+18] = -Jh[(k - j) % M]
        A[18*p:18*p+18, 18*p:18*p+18] += 2j * np.pi * k * w * np.eye(18)
        A[18*p, 18*p] += dk_of(N, k)
        A[18*p:18*p+18, nG] = 2j * np.pi * k * a[:, k % M]
    for p, k in enumerate(ks): A[nG, 18*p] = 1.0   # phase: V(0) = sum_k a_{k,V}
    s = np.linalg.svd(A, compute_uv=False)
    print(f'N={N}: Galerkin K={K} size {nG+1}: sigma_max {s[0]:.3e} sigma_min {s[-1]:.3e} next {s[-2]:.3e} {s[-3]:.3e}  cond {s[0]/s[-1]:.2e}')
    Ainv = np.linalg.inv(A)
    for nu in (1.0, 1.5, 2.0):
        wts = np.concatenate([np.repeat(nu ** np.abs(ks), 18), [1.0]])
        # operator norm on weighted l1: max_j sum_i |B_ij| w_i / w_j
        B = np.abs(Ainv) * wts[:, None] / wts[None, :]
        print(f'   nu={nu}: ||A||_(l1_nu) = {B.sum(axis=0).max():.3e}   (column of max: {np.argmax(B.sum(axis=0))})')
    # true defect of the collocation solution (double): residual of the Galerkin equations at the solution
    F = f_scaled(Z); Fh = np.fft.fft(F, axis=1) / M
    R = np.array([2j*np.pi*k*w*a[:, k % M] - Fh[:, k % M] + (dk_of(N, k) * a[0, k % M]) * np.eye(18)[0] for k in ks])
    print(f'   max |Galerkin residual| (double) {np.abs(R).max():.2e};  Fh tail max |k|>=20: {np.abs(Fh[:, 20:44]).max():.1e}')
    if N == 1:
        Abar = Jh[0].real
        ev, VR = np.linalg.eig(Abar); evl, VL = np.linalg.eig(Abar.T)
        i = np.argmax(ev.real); il = np.argmin(np.abs(evl - ev[i]))
        r = VR[:, i]; l = VL[:, il]; l = l / (l @ r)
        print(f'   Hopf eigenvalue of Abar {ev[i]:.4e}; V-weight w = l_V r_V = {l[0]*r[0]:.4e}; eigvec cond(Abar) {np.linalg.cond(VR):.2e}')
