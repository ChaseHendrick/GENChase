"""Task 1: Salnikov's computation at high precision (numerical; truncation error not bounded).
g = 1 (the only value among those tried for which his loops close), x0 = (0.1, -0.3, 0.2, 0.4) as
(a1, a2, a1', a2'), loops = the diamonds of his Fig. 2 (read from the EPS), each traversed 3 times,
base point t = 0, Xi(0) = I.  Usage: python3 reproduce.py [order] [frac] [mode: vel|mom]"""
import sys, time
import numpy as np
from flint import acb, ctx
from taylor import Integrator, identity, energy

N = int(sys.argv[1]) if len(sys.argv) > 1 else 60
frac = float(sys.argv[2]) if len(sys.argv) > 2 else 0.2
mode = sys.argv[3] if len(sys.argv) > 3 else 'vel'
I = Integrator(gval='1', order=N, prec=256, frac=frac)
q1, q2, w1, w2 = acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')
if mode == 'mom':
    c = (q1 - q2).cos(); d = 2 - c * c
    x0 = [q1, q2, (w1 - c * w2) / d, (2 * w2 - c * w1) / d]
else:
    x0 = [q1, q2, w1, w2]
T = lambda s: acb(*[x for x in s.split(',')])  # exact decimal vertices
D1 = [T('0,0'), T('0.5,0'), T('0.5,0.4'), T('1,0.9'), T('0.5,1.4'), T('0,0.9'), T('0.5,0.4'), T('0.5,0'), T('0,0')]
D2 = [T('0,0'), T('0.5,0'), T('0.5,-0.4'), T('0,-0.9'), T('0.5,-1.4'), T('1,-0.9'), T('0.5,-0.4'), T('0.5,0'), T('0,0')]
out = {}
for name, D in (('gamma1', D1), ('gamma2', D2)):
    x, X = x0, identity(); t = time.time()
    for k in range(3):
        x, X = I.path(D, x, X)
        gap = max(abs(complex((a - b).mid())) for a, b in zip(x, x0))
        print('%s turn %d: max|x - x0| = %.3e' % (name, k + 1, gap), flush=True)
    M = np.array([[complex(v.mid()) for v in r] for r in X])
    out[name] = M
    print('%s: max|M - I| = %.3e   energy drift %.3e   (%.0f s, %d steps so far)' % (
        name, np.abs(M - np.eye(4)).max(), abs(complex((energy(x) - energy(x0)).mid())), time.time() - t, I.nsteps), flush=True)
    print('   M[0,0] =', X[0][0])
np.save('reproduce_%s_%s.npy' % (mode, N), np.array([out['gamma1'], out['gamma2']]))
