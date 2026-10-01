import sys, numpy as np
from fsolve import jac_scaled, dk_of
M = 64; B = 14
def band(N, m, Jh, T):
    # window m: lambda ~ i m w1; resonant indices k ~ -m +- 1; use indices k in [-m-B, -m+B]
    ks = np.arange(-m - B, -m + B + 1); n = 18 * len(ks)
    H = np.zeros((n, n), complex)
    for a_, k in enumerate(ks):
        for b_, j in enumerate(ks):
            if abs(k - j) < M // 2: H[18*a_:18*a_+18, 18*b_:18*b_+18] = Jh[(k - j) % M]
        H[18*a_:18*a_+18, 18*a_:18*a_+18] -= 2j * np.pi * k / T * np.eye(18)
        H[18*a_, 18*a_] -= dk_of(N, k)
    ev = np.linalg.eigvals(H); w1 = 2 * np.pi / T
    sel = ev[np.abs(ev.imag / w1 - m) < 0.5]
    return np.sort(sel.real)[::-1][:3]
for N, ms in ((64, [0, 1, 2, 4, 8, 12, 16, 20, 24, 28, 31, 32]), (128, [16, 32, 48, 64]), (0, [12, 16, 20, 30, 40, 60, 80, 120, 160, 240, 320, 640])):
    src = N if N in (64, 0) else 64
    d = np.load(f'orbit_N{src}_M{M}.npz'); Z, T = d['Z'], float(d['T'])
    J = jac_scaled(Z); Jh = np.fft.fft(J, axis=0) / M
    out = []
    for m in ms:
        r = band(N, m, Jh, T)
        out.append(f'm={m}: {r[0]:+.3e} ({r[1]:+.2e})')
    print(f'N={N} (orbit of N={src}):'); print('   ' + '\n   '.join(out))
