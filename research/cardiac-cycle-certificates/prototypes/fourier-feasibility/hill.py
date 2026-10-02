import sys, numpy as np
from fsolve import f_scaled, jac_scaled, dk_of, SIG
M = 64
KH = int(sys.argv[1]) if len(sys.argv) > 1 else 20
Ns = [int(a) for a in sys.argv[2:]] or [1, 8, 16, 64, 0]
for N in Ns:
    d = np.load(f'orbit_N{N}_M{M}.npz'); Z, T = d['Z'], float(d['T'])
    a = np.fft.fft(Z, axis=1) / M
    if N == Ns[0]:
        print('Fourier decay (scaled vars), max_i |a_k|, k=0..20, then per-component |a_1|:')
        print(' '.join(f'{np.max(np.abs(a[:, k])):.1e}' for k in range(21)))
        print('V-component |a_k|:', ' '.join(f'{abs(a[0, k])*SIG[0]:.1e}' for k in range(16)))
    J = jac_scaled(Z)                         # (M,18,18)
    Jh = np.fft.fft(J, axis=0) / M            # Jh[m] = coefficient of e^{2 pi i m s}
    Abar = Jh[0].real
    ks = np.arange(-KH, KH + 1); n = 18 * len(ks)
    H = np.zeros((n, n), complex)
    for a_, k in enumerate(ks):
        for b_, j in enumerate(ks):
            m = k - j
            if abs(m) < M // 2: H[18*a_:18*a_+18, 18*b_:18*b_+18] = Jh[m % M]
        H[18*a_:18*a_+18, 18*a_:18*a_+18] -= 2j * np.pi * k / T * np.eye(18)
        H[18*a_, 18*a_] -= dk_of(N, k)
    ev = np.linalg.eigvals(H)
    w1 = 2 * np.pi / T
    # keep eigenvalues whose imaginary part lies in the central part (away from truncation edge)
    sel = ev[np.abs(ev.imag) < (KH - 4) * w1]
    sel = sel[np.argsort(-sel.real)]
    print(f'N={N} T={T:.9f} KH={KH}: top real parts (Re, Im/w1):')
    print('   ' + '  '.join(f'({e.real:.3e},{e.imag/w1:+.3f})' for e in sel[:14]))
    if N == Ns[0]:
        eA = np.linalg.eigvals(Abar); eA = eA[np.argsort(-eA.real)]
        print('eig(Abar):', ' '.join(f'{e.real:.3e}{e.imag:+.3e}j' for e in eA))
        nrm = [np.max(np.abs(Jh[m])) for m in range(12)]
        print('max entry |J_m| (scaled):', ' '.join(f'{x:.1e}' for x in nrm))
