import numpy as np
from flint import acb
from taylor import Integrator
from locate import estimate
I = Integrator(gval='1', order=70, prec=192, frac=0.3)
x = [acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')]
ts = 0.71075+0.64662j
prev = 0
for d in (0.2, 0.1, 0.05, 0.02):
    q = ts * (1 - d/abs(ts))
    x, _ = I.path([prev, q], x, None, var=False); prev = q
    est = estimate(I, x, q)
    for comp, (t, b) in enumerate(est):
        print('d=%.2f comp %d t*=%.12f%+.12fi beta=%.5f%+.5fi' % (d, comp, t.real, t.imag, b.real, b.imag))
    a1, a2 = x[0], x[1]
    print('   x =', [complex(v.mid()) for v in x], ' D =', complex((2 - (a1 - a2).cos()**2).mid()))
