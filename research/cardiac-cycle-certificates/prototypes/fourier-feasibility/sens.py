import numpy as np
from fsolve import jac_scaled, dk_of, SIG
M = 64
L = {}
for N in (8, 16, 32, 64, 0):
    d = np.load(f'orbit_N{N}_M{M}.npz'); L[N] = (np.fft.fft(d['Z'], axis=1) / M, float(d['T']))
# align phases: all have V(s=0) = 0.2, so coefficients are directly comparable
def nrm(a, nu=1.0):
    k = np.fft.fftfreq(M, 1.0 / M); return (np.abs(a) * nu ** np.abs(k)).sum(axis=1).max()
for N in (8, 16, 32, 64):
    eps = 1.0 / N ** 2
    da = L[N][0] - L[0][0]
    print(f'N={N:3d} eps={eps:.3e}: ||x(N)-x(inf)||_l1 (scaled, max comp) = {nrm(da):.3e}, per unit eps {nrm(da)/eps:.3e}; T(N)-T(inf) = {L[N][1]-L[0][1]:+.4e}')
# second difference: x(eps) - linear interpolation between eps=0 and eps(8)
e8 = 1/64.
for N in (16, 32):
    e = 1.0 / N ** 2
    lin = L[0][0] + (L[8][0] - L[0][0]) * e / e8
    print(f'nonlinearity at N={N}: ||x - linear interp||_l1 = {nrm(L[N][0]-lin):.3e}')
d = np.load(f'orbit_N0_M{M}.npz'); Z, T = d['Z'], float(d['T']); w1 = 2*np.pi/T
J = jac_scaled(Z); Jh = np.fft.fft(J, axis=0) / M; Abar = Jh[0].real
S = sum(np.abs(Jh[m]) for m in range(1, M))
E = np.zeros((18, 18)); E[0, 0] = 1
print('structured tail product sup over Re z in [-1e-5, 1e-2], |Im z| >= B w1, d in [0, inf):')
for B in (2, 3, 4, 6, 8, 12):
    worst = 0
    for y in np.concatenate([np.linspace(B * w1, B * w1 + 3 * w1, 61), np.geomspace(B * w1 + 3 * w1, 1e3, 60)]):
        for x in (-1e-5, 0.0, 1e-3, 1e-2):
            for dd in (0, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100, 1e4, 1e8):
                for sgn in (1, -1):
                    R = np.linalg.inv((x + 1j * sgn * y) * np.eye(18) + dd * E - Abar)
                    worst = max(worst, (np.abs(R) @ S).max())
    print(f'   B={B}: {worst:.3f}')
for dd in (0, 1e-3, 1e-2, 0.1, 1, 10, 100, 1e4):
    e = np.linalg.eigvals(Abar - dd * E); e = e[np.argsort(-e.real)]
    print(f'eig(Abar - {dd:g} E) top:', ' '.join(f'{z.real:.3e}{z.imag:+.3e}j' for z in e[:5]))
ec = np.linalg.eigvals(Abar[1:, 1:]); ec = ec[np.argsort(-ec.real)]
print('clamped (V removed) eig top:', ' '.join(f'{z.real:.3e}{z.imag:+.3e}j' for z in ec[:4]))
