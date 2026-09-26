import sys, cmath, numpy as np
from fast import Fast, y0
from survey import circle
F = Fast(1.0, rtol=1e-12, atol=1e-14)
x0 = np.array([0.1, -0.3, 0.2, 0.4], complex)
np.set_printoptions(precision=4, suppress=True, linewidth=200)
def probe(p, ts, r, turns=4):
    x = F.path([0, p.real, p], x0, var=False)
    q = ts + (p - ts) * r / abs(p - ts)
    x = F.path([p, q], x, var=False)
    y = y0(x)
    for k in range(turns):
        y = F.path(circle(ts, r, cmath.phase(q - ts), n=48), y)
        d = y[:4] - x
        print(' turn', k + 1, 'dx/(2pi) =', d[:2] / (2 * np.pi), 'dv =', d[2:])
        M = y[4:].reshape(4, 4)
        print('   eig M', np.linalg.eigvals(M))
for p, ts in ((-0.25+2.5j, -0.2753955+2.0292682j), (0.0+1.5j, 0.147958+2.008276j), (0.75+1.75j, 1.07635+2.15249j)):
    for r in (0.05, 0.02):
        print(ts, 'r', r); probe(p, ts, r)
