"""Local nature of the singularity near 0.7107 + 0.6464i (numerical, double precision):
sample x on circles |t - t*| = rho over three turns and read off the Puiseux coefficients
x = sum_m c_m (t - t*)^(m/3) by FFT in the angle. A pure algebraic branch point of order 3
(no logarithm) shows as: closure after 3 turns, c_m independent of rho, no m < -1 terms."""
import cmath, numpy as np
from fast import Fast

F = Fast(1.0, rtol=1e-13, atol=1e-15)
x0 = np.array([0.1, -0.3, 0.2, 0.4], complex)

def samples(ts, rho, n=96):
    p = ts - 0.1 * ts / abs(ts)
    x = F.path([0, p, ts - rho * ts / abs(ts)], x0, var=False)
    th0 = cmath.phase(-ts)
    out = [x]
    for k in range(3 * n):
        a = ts + rho * cmath.exp(1j * (th0 + 2 * np.pi * k / n))
        b = ts + rho * cmath.exp(1j * (th0 + 2 * np.pi * (k + 1) / n))
        # arc approximated by 4 chords
        pts = [ts + rho * cmath.exp(1j * (th0 + 2 * np.pi * (k + j / 4) / n)) for j in range(5)]
        x = F.path(pts, x, var=False)
        out.append(x)
    return np.array(out[:-1]), out[-1], th0

def coeffs(ts, rho, n=96):
    S, last, th0 = samples(ts, rho, n)
    m = np.fft.fftfreq(3 * n, 1.0 / (3 * n))       # e^{i m theta / 3}
    A = np.fft.fft(S, axis=0) / (3 * n)
    # sample k at theta = th0 + 2 pi k / n = th0 + 2 pi (3k)/(3n): fft index gives e^{-2 pi i m k/(3n)}
    # so coefficient of e^{i m (theta)/3} = A[m] * e^{-i m th0/3}, and c_m = that / rho^{m/3}
    C = {}
    for mi in range(-6, 10):
        idx = mi % (3 * n)
        C[mi] = A[idx] * np.exp(-1j * mi * th0 / 3) / rho ** (mi / 3.0)
    return C, np.abs(last - S[0]).max()

ts = 0.7108248 + 0.6464719j
for it in range(4):
    C, gap = coeffs(ts, 0.03)
    # v ~ c_{-1} tau^{-1/3}; a center error delta adds (delta/3) c_{-1} tau^{-4/3}
    delta = 3 * C[-4][2] / C[-1][2]
    print('iter', it, 't* =', ts, ' closure after 3 turns', '%.1e' % gap, ' correction', delta)
    ts = ts + delta
for rho in (0.03, 0.015):
    C, gap = coeffs(ts, rho)
    print('rho', rho, 'closure %.1e' % gap)
    for mi in range(-5, 7):
        print('  m=%+d  ' % mi + '  '.join('%10.3e' % abs(C[mi][j]) for j in range(4)))
x = C[0]; print('x(t*) =', x, ' cos(a1-a2)^2 =', np.cos(x[0] - x[1]) ** 2)
