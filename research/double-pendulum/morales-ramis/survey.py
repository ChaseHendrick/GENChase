"""Numerical survey of the complex-time singularities of a particular solution (double precision
transport, Taylor coefficients from flint): location (Domb-Sykes), branching order (number of turns
of a small circle after which x returns), and the variational monodromy after that many turns."""
import sys, json, cmath
import numpy as np
from flint import acb, ctx
from fast import Fast, y0
from taylor import Integrator

def nearest(I, x, p):
    xc, _ = I.series([acb(complex(v)) for v in x], None, var=False)
    ests = []
    for comp in range(4):
        c = np.array([complex(v.mid()) for v in xc[comp]])
        ks = np.arange(I.N // 2, I.N)
        rat = c[ks - 1] / c[ks]
        A = np.vstack([np.ones(len(ks)), 1.0 / ks]).T.astype(complex)
        coef, *_ = np.linalg.lstsq(A, rat, rcond=None)
        ests.append(coef[0])
    tau = np.median(np.real(ests)) + 1j * np.median(np.imag(ests))
    return p + tau, np.std(ests)

def circle(c, r, start_angle, turns=1, n=24):
    return [c + r * cmath.exp(1j * (start_angle + 2 * np.pi * k / n)) for k in range(n * turns + 1)]

def analyse(F, I, x_at_p, p, maxturn=8):
    """approach the nearest singularity from p, then loop around it."""
    x = x_at_p
    ts, spread = nearest(I, x, p)
    for _ in range(3):
        d = abs(ts - p)
        if d < 0.06:
            break
        q = ts + (p - ts) * 0.05 / d
        y = F.path([p, q], np.array(x, complex), var=False); x, p = y, q
        ts, spread = nearest(I, x, p)
    r = abs(ts - p); ang = cmath.phase(p - ts)
    y = y0(x); res = None
    for k in range(1, maxturn + 1):
        y = F.path(circle(ts, r, ang), y)
        gap = np.abs(y[:4] - x).max()
        if gap < 1e-8:
            M = y[4:].reshape(4, 4)
            res = dict(turns=k, gap=gap, monodromy_minus_I=float(np.abs(M - np.eye(4)).max()))
            break
    return dict(t_star=[ts.real, ts.imag], spread=float(spread), r=r, D=complex(2 - cmath.cos(x[0] - x[1])**2).__repr__(),
                closed=res)

if __name__ == '__main__':
    g = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
    x0 = np.array([0.1, -0.3, 0.2, 0.4], complex)
    F = Fast(g, rtol=1e-12, atol=1e-14)
    I = Integrator(gval=str(g), order=40, prec=128)
    found = []
    for re in np.arange(-1.0, 2.01, 0.25):
        xr = F.path([0, re], x0, var=False) if re != 0 else x0
        prev = re; xcur = xr
        for im in np.arange(0.25, 2.51, 0.25):
            p = re + 1j * im
            try:
                xcur = F.path([prev, p], xcur, var=False); prev = p
            except Exception as e:
                break
            ts, spread = nearest(I, xcur, p)
            if abs(ts - p) > 0.6 or spread > 0.05:
                continue
            if any(abs(ts - complex(*f['t_star'])) < 0.02 for f in found):
                continue
            try:
                info = analyse(F, I, xcur, p)
            except Exception as e:
                info = dict(t_star=[ts.real, ts.imag], error=str(e))
            info['from'] = [p.real, p.imag]
            if any(abs(complex(*info['t_star']) - complex(*f['t_star'])) < 0.02 for f in found):
                continue
            found.append(info); print(json.dumps(info), flush=True)
