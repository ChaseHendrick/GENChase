import time
from flint import acb
from taylor import *
I = Integrator(order=40, prec=128, frac=0.3)
x0 = [acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')]
D=[0, 0.5, 0.5+0.4j, 1+0.9j, 0.5+1.4j, 0.9j, 0.5+0.4j, 0.5, 0]
x,X=x0,identity()
for turn in range(6):
    x,X = I.path(D, x, X)
    print(turn+1, [complex(v.mid()) for v in x], complex(energy(x).mid()))
