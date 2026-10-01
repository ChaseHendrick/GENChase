import numpy as np
from windows import hill
from fsolve import SIG
for N in (32, 8, 0):
    KH = 20
    ev, V, w1, ks = hill(N, KH)
    d = np.load(f'orbit_N{N}_M64.npz'); T = float(d['T'])
    H = None
    # rebuild H to get left eigenvectors
    from fsolve import jac_scaled, dk_of
    Z = d['Z']; J = jac_scaled(Z); Jh = np.fft.fft(J, axis=0) / 64
    n = 18 * len(ks); H = np.zeros((n, n), complex)
    for a_, k in enumerate(ks):
        for b_, j in enumerate(ks):
            if abs(k - j) < 32: H[18*a_:18*a_+18, 18*b_:18*b_+18] = Jh[(k - j) % 64]
        H[18*a_:18*a_+18, 18*a_:18*a_+18] -= 2j * np.pi * k / T * np.eye(18)
        H[18*a_, 18*a_] -= dk_of(N, k)
    evL, VL = np.linalg.eig(H.T)
    print(f'N={N}: cond(V) = {np.linalg.cond(V):.2e}')
    for target in (0.0, None):
        if target is None:
            c = ev[np.abs(ev.imag / w1 - 1) < 0.5]; lam = c[np.argmax(c.real)]
        else:
            lam = ev[np.argmin(np.abs(ev))]
        i = np.argmin(np.abs(ev - lam)); j = np.argmin(np.abs(evL - lam))
        r = V[:, i].reshape(len(ks), 18); l = VL[:, j].reshape(len(ks), 18)
        nr = np.abs(r).sum(axis=0).max()            # max over components of l1 over modes
        nl = np.abs(l).max(axis=0).sum()            # dual: sum over components of max over modes
        kap = nr * nl / abs((l * r).sum())
        gap = np.sort(np.abs(ev - lam))[1]
        print(f'   lambda = {lam.real:+.4e}{lam.imag:+.4e}j  kappa (l1-modes x linf-components) = {kap:.2e}; distance to nearest other eigenvalue {gap:.2e}')
