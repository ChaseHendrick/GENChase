import sys
import numpy as np
from flint import acb
from taylor import *
g=sys.argv[1] if len(sys.argv)>1 else '1'
I = Integrator(gval=g, order=40, prec=128, frac=0.3)
x0 = [acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')]
D1=[0, 0.5, 0.5+0.4j, 1+0.9j, 0.5+1.4j, 0.9j, 0.5+0.4j, 0.5, 0]
D2=[0, 0.5, 0.5-0.4j, -0.9j, 0.5-1.4j, 1-0.9j, 0.5-0.4j, 0.5, 0]
np.set_printoptions(precision=2, suppress=True, linewidth=200)
for D in (D1,D2):
    x,X=x0,identity()
    for turn in range(3):
        x,X = I.path(D, x, X)
    M=np.array([[complex(v.mid()) for v in r] for r in X])
    print([complex(v.mid()) for v in x]); print(M); print(np.linalg.eigvals(M))
