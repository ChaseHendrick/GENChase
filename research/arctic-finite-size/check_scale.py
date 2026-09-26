"""Check the edge scale sigma against the exact one-line law: at large n the variance of the extreme
particle should approach sigma^2 n^(2/3) Var(TW2) and its CDF F2 in the rescaled variable."""
import numpy as np, mpmath as mp
import kernels as KR, constants as C
from tw2 import F2
VAR = 0.81319479283296


def law_from_D(D):
    # D[t] = P(max < t); P(max = t) = D[t+1] - D[t]
    N = len(D) - 2
    p = np.diff(D)          # p[t] = D[t+1] - D[t] = P(max = t), t = 0..N
    return p


def report(label, diag, off, M, Epos, sig, n):
    lam = None
    Phi = KR.orthonormal_functions(diag, off)
    D = KR.top_gap_probabilities(Phi, M)
    p = law_from_D(D)
    x = np.arange(len(p))
    m1 = (p * x).sum(); v = (p * x * x).sum() - m1 ** 2
    s = sig * n ** (1 / 3)
    # Kolmogorov distance to F2 at the lattice points, with the half-site continuity shift
    ks = max(abs(D[t + 1] - F2((t + 0.5 - n * Epos) / s)) for t in range(len(p)) if abs(t - n * Epos) < 6 * s)
    print('%-34s n=%5d  sd/(sigma n^1/3 sdTW)=%.4f  (mean - nE)/(sigma n^1/3)=%.4f (TW mean -1.7711)  KS=%.4f'
          % (label, n, np.sqrt(v) / (s * np.sqrt(VAR)), (m1 - n * Epos) / s, ks))


if __name__ == '__main__':
    for n in [100, 400, 1600]:
        g = 0.3; r = int(round(g * n))
        E = 0.5 + np.sqrt(g * (1 - g)); sig = float(C.aztec_sigma(mp.mpf(g)))
        report('Krawtchouk, Aztec line gamma=0.3', *KR.krawtchouk_jacobi(n), r, E, sig, n)
    for n in [100, 400, 1600]:
        mu = 0.25; m = int(round(mu * n))
        # regular hexagon, F(n, n, n), line m: gamma = m + n - 1, holes L = m, alpha = beta = n - m
        f0, sig, Ep, gp = C.hex_line(mp.mpf(1), mp.mpf(1), mp.mpf(1), mp.mpf(mu))
        report('Hahn, regular hexagon line mu=0.25', *KR.hahn_jacobi(m + n - 1, n - m, n - m), m, float(Ep), float(sig), n)
    for n in [60, 240, 960]:
        a, b, c = 5 * n // 6 * 0 + (5 * n) // 6, 3 * n // 6, 6 * n // 6   # a >= b ordering for F(5,3,6)/6 scaled
        mu = 0.4; m = int(round(mu * n))
        A_, B_, C_ = mp.mpf(5) / 6, mp.mpf(3) / 6, mp.mpf(1)
        f0, sig, Ep, gp = C.hex_line(A_, B_, C_, mp.mpf(mu))
        import check_hahn_small as H
        al, be, gam, L = H.params(a, b, c, m)
        report('Hahn, 5:3:6 line mu=0.4', *KR.hahn_jacobi(gam, abs(a - m), abs(b - m)), L, float(Ep), float(sig), n)
