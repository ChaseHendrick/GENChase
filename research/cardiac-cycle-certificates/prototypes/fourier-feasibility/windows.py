import sys, numpy as np
from fsolve import jac_scaled, dk_of, SIG
M = 64
def hill(N, KH):
    d = np.load(f'orbit_N{N}_M{M}.npz'); Z, T = d['Z'], float(d['T'])
    J = jac_scaled(Z); Jh = np.fft.fft(J, axis=0) / M
    ks = np.arange(-KH, KH + 1); n = 18 * len(ks)
    H = np.zeros((n, n), complex)
    for a_, k in enumerate(ks):
        for b_, j in enumerate(ks):
            if abs(k - j) < M // 2: H[18*a_:18*a_+18, 18*b_:18*b_+18] = Jh[(k - j) % M]
        H[18*a_:18*a_+18, 18*a_:18*a_+18] -= 2j * np.pi * k / T * np.eye(18)
        H[18*a_, 18*a_] -= dk_of(N, k)
    ev, V = np.linalg.eig(H)
    return ev, V, 2 * np.pi / T, ks
for N, KH in ((0, 20), (0, 30), (8, 30), (64, 30)):
    ev, V, w1, ks = hill(N, KH)
    line = []
    for m in range(0, 13):
        sel = ev[np.abs(ev.imag / w1 - m) < 0.5]
        sel = np.sort(sel.real)[::-1]
        line.append(f'm={m}: ' + ','.join(f'{x:.3e}' for x in sel[:3]))
    print(f'N={N} KH={KH}:'); print('   ' + '\n   '.join(line))
    # eigenvector condition of the critical eigenvalue (window 1) and of the trivial one
    if KH == 30:
        evl, VL = np.linalg.eig(hill(N, KH)[0:0] or None) if False else (None, None)
