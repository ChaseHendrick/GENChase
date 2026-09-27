"""Locate the complex-time singularity of the particular solution near 0.5 + 0.9i (numerical):
Taylor coefficients at a nearby regular point, Domb-Sykes type fit of c_{k-1}/c_k."""
import sys
import numpy as np
from flint import acb
from taylor import Integrator, identity

def estimate(I, x, center):
    xc, _ = I.series(x, None, var=False)
    out = []
    for comp in range(4):
        c = np.array([complex(v.mid()) for v in xc[comp]])
        ks = np.arange(20, I.N)
        rat = c[ks - 1] / c[ks]            # ~ tau*(1 - (1+beta)/k)
        A = np.vstack([np.ones_like(ks, dtype=float), 1.0 / ks]).T
        coef, *_ = np.linalg.lstsq(A.astype(complex), rat, rcond=None)
        taus = coef[0]; beta = -coef[1] / taus - 1
        out.append((center + taus, beta))
    return out

if __name__ == '__main__':
    g = sys.argv[1] if len(sys.argv) > 1 else '1'
    I = Integrator(gval=g, order=70, prec=192, frac=0.3)
    x0 = [acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')]
    p = 0.5 + 0.9j
    for start in (0.0,):
        x = x0
        prev = 0
        for frac in (0.5, 0.7, 0.8, 0.85):
            q = p * frac
            x, _ = I.path([prev, q], x, None, var=False)
            prev = q
            for comp, (ts, beta) in enumerate(estimate(I, x, q)):
                print('from %s comp %d: t* = %.10f%+.10fi  beta = %.5f%+.5fi' % (q, comp, ts.real, ts.imag, beta.real, beta.imag))
