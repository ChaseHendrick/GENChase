"""Try variants of Salnikov's setting: gravity g, and whether (0.1,-0.3,0.2,0.4) are velocities or momenta.
Prints closure of x after 1..3 turns of the diamond loop and the 3-turn monodromy."""
import sys, numpy as np
from flint import acb
from taylor import *
g = sys.argv[1]; mode = sys.argv[2]
I = Integrator(gval=g, order=40, prec=160, frac=0.2)
q1, q2, w1, w2 = acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')
if mode == 'mom':   # p = M v with M = [[2, c],[c, 1]]
    c = (q1 - q2).cos(); det = 2 - c * c
    v1 = (w1 - c * w2) / det; v2 = (2 * w2 - c * w1) / det
    x0 = [q1, q2, v1, v2]
else:
    x0 = [q1, q2, w1, w2]
np.set_printoptions(precision=3, suppress=True, linewidth=200)
for D in ([0, 0.5, 0.5+0.4j, 1+0.9j, 0.5+1.4j, 0.9j, 0.5+0.4j, 0.5, 0],
          [0, 0.5, 0.5-0.4j, -0.9j, 0.5-1.4j, 1-0.9j, 0.5-0.4j, 0.5, 0]):
    x, X = x0, identity()
    for k in range(3):
        x, X = I.path(D, x, X, hmax=0.05)
        print(g, mode, 'turn', k + 1, 'max|x-x0| =', max(abs(complex((a - b).mid())) for a, b in zip(x, x0)), flush=True)
    M = np.array([[complex(v.mid()) for v in r] for r in X])
    print(M); print('eig', np.linalg.eigvals(M), flush=True)
