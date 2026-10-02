import numpy as np
from fsolve import jac_scaled, dk_of, SIG, f_scaled
M = 64
for N in (1, 0):
    d = np.load(f'orbit_N{N}_M{M}.npz'); Z, T = d['Z'], float(d['T']); w = 1 / T
    J = jac_scaled(Z); Jh = np.fft.fft(J, axis=0) / M; Abar = Jh[0].real
    for nu in (1.0, 1.5):
        S = sum(np.abs(Jh[m]) * nu ** abs(m if m < M // 2 else m - M) for m in range(1, M))   # sum_{m != 0} |J_m| nu^|m|
        out = []
        for K in (20, 40, 80, 160):
            worst = 0; kw = None
            for k in list(range(K + 1, 4 * K)) + [10 * K, 100 * K]:
                R = np.linalg.inv(2j * np.pi * k * w * np.eye(18) + dk_of(N, k) * np.diag([1.0] + [0] * 17) - Abar)
                v = np.abs(R) @ S
                z = v.max()
                if z > worst: worst, kw = z, k
            out.append(f'K={K}: max_k>K || |R_k| S ||_inf = {worst:.3f} (at k={kw})')
        print(f'N={N} nu={nu}:', '; '.join(out))
    # second-derivative sizes (scaled vars) along the orbit, by complex step on the Jacobian
    h = 1e-6
    Q = np.zeros(18)
    for jv in range(18):
        Zp = Z.copy(); Zp[jv] += h; Zm = Z.copy(); Zm[jv] -= h
        dJ = (jac_scaled(Zp) - jac_scaled(Zm)) / (2 * h)    # (M,18,18): d/dz_jv of J[i,l]
        Q += np.abs(dJ).sum(axis=2).max(axis=0)
    print(f'N={N}: Q_i = sup_s sum_jl |d2 f_i/dz_j dz_l| (scaled):', ' '.join(f'{q:.1e}' for q in Q))
