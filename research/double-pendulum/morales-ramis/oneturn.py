import sys, numpy as np, mpmath as mp
from flint import acb
from taylor import *
g = sys.argv[1] if len(sys.argv) > 1 else '1'
I = Integrator(gval=g, order=int(sys.argv[2]) if len(sys.argv)>2 else 50, prec=192, frac=0.25)
x0 = [acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')]
D1 = [0, 0.5, 0.5+0.4j, 1+0.9j, 0.5+1.4j, 0.9j, 0.5+0.4j, 0.5, 0]
x, X = I.path(D1, x0, identity())
M = np.array([[complex(v.mid()) for v in r] for r in X])
np.set_printoptions(precision=6, suppress=True, linewidth=200)
print('x after 1 turn', [complex(v.mid()) for v in x])
print('M one turn\n', M); print('eig', np.linalg.eigvals(M))
x2, X2 = I.path(D1, x, X); x3, X3 = I.path(D1, x2, X2)
M3 = np.array([[complex(v.mid()) for v in r] for r in X3])
print('x after 3 turns - x0', [complex((a - b).mid()) for a, b in zip(x3, x0)])
print('||M3 - I|| =', np.abs(M3 - np.eye(4)).max(), ' ||M^3 - I|| =', np.abs(np.linalg.matrix_power(M, 3) - np.eye(4)).max())
print('steps', I.nsteps)
