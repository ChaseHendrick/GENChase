"""High-precision Taylor-series integrator for the Hodgkin-Huxley equations (python-flint arb_series, 256 bits),
used as an independent check of the float64 periodic points and to measure the Taylor-coefficient decay that
sets the step and order of a rigorous integrator. The Taylor polynomial of each step is computed by Picard
iteration on power series; the truncation error is controlled by the size of the last coefficients. Ball radii
are carried but the remainder is NOT enclosed: this is a high-precision numerical method, not a proof.

    python3 taylor_hp.py            # re-checks A, B (G&O's current) and G&O's p1, p2; writes ../data/taylor_hp.txt
"""
import sys
import numpy as np
from flint import arb, arb_series, ctx

ctx.prec = 256
ctx.cap = 64          # python-flint truncates series at ctx.cap terms (default 8)
HMAX, TRUNC = 2.0, 1e-45
EL = None


def el_exact():
    import mpmath as mp
    import hhc
    return arb(mp.nstr(hhc.el_zero_current(60), 55))


def psi_s(x):
    return x / (x.exp() - 1)


def field_s(u, m, n, h, J, EL, L):
    one = arb_series([1], prec=L)
    am = psi_s((25 - u) / 10)
    bm = (u * arb(-1) / 18).exp() * 4
    an = psi_s((10 - u) / 10) / 10
    bn = (u * arb(-1) / 80).exp() / 8
    ah = (u * arb(-1) / 20).exp() * arb('0.07')
    bh = (((30 - u) / 10).exp() + 1).inv()
    du = -(m * m * m * h * (u - 115) * 120) - (n * n * n * n * (u + 12) * 36) - (u - EL) * arb('0.3') + J
    return [du, am * (one - m) - bm * m, an * (one - n) - bn * n, ah * (one - h) - bh * h]


def taylor(y, J, EL, p):
    """Taylor coefficients (orders 0..p) of the solution through y."""
    X = [arb_series([c], prec=p + 1) for c in y]
    for _ in range(p + 1):
        F = field_s(*X, J, EL, p + 1)
        X = [arb_series([y[i]], prec=p + 1) + F[i].integral() for i in range(4)]
    return [x.coeffs() + [arb(0)] * (p + 1 - len(x.coeffs())) for x in X]


def peval(c, t):
    s = arb(0)
    for a in reversed(c):
        s = s * t + a
    return s


def radius_estimate(C, p):
    """Root-test estimate of the radius of convergence from the last quarter of the coefficients."""
    rs = []
    for i in range(4):
        for k in range(3 * p // 4, p + 1):
            a = abs(float(C[i][k].mid()))
            if a > 0:
                rs.append(a ** (-1.0 / k))
    return min(rs) if rs else np.inf


def to_section(y0, J, EL, sec=4.5, direction=+1, p=36, tol=arb('1e-60'), stats=None):
    """Integrate to the next crossing of u = sec in the given direction; returns (y, t)."""
    y = [arb(c) for c in y0]
    t = arb(0)
    first = True
    while True:
        C = taylor(y, J, EL, p)
        rho = radius_estimate(C, p)
        h = arb(min(HMAX, rho / 4.0))
        # the last coefficient times h^p is the truncation-size proxy; shrink h until tiny
        while max(abs(float(C[i][p].mid())) for i in range(4)) * float(h.mid()) ** p > TRUNC:
            h = h / 2
        if stats is not None:
            stats.append((float(t.mid()), float(h.mid()), rho))
        g0 = (y[0] - sec) * direction
        y1 = [peval(C[i], h) for i in range(4)]
        g1 = (y1[0] - sec) * direction
        if (not first) and float(g0.mid()) < 0 <= float(g1.mid()):
            # Newton on the step length s for u(s) = sec
            du = [C[0][k] * k for k in range(1, p + 1)]
            s = h * float((g0 / (g0 - g1)).mid())
            for _ in range(60):
                val = peval(C[0], s) - sec
                ds = val / peval(du, s)
                s = s - ds
                if abs(float(ds.mid())) < 1e-70:
                    break
            s = arb(s.mid())
            return [arb(peval(C[i], s).mid()) for i in range(4)], t + s
        y = [arb(v.mid()) for v in y1]
        t = t + h
        first = first and float(g1.mid()) < 0 if False else False


def check(label, x, J, EL, out, k=1):
    y0 = [arb(4.5)] + [arb(repr(float(v))) if isinstance(v, float) else arb(v) for v in x]
    stats = []
    y1, T = y0, arb(0)
    for _ in range(k):
        y1, t1 = to_section(y1, J, EL, stats=stats)
        T = T + t1
    d = [float((y1[i + 1] - y0[i + 1]).mid()) for i in range(3)]
    hs = [s[1] for s in stats]
    rhos = [s[2] for s in stats]
    line = ('%s: |P(x) - x| = %.3e (components %s), T = %s, steps %d, h in [%.3g, %.3g], radius estimate in [%.3g, %.3g]'
            % (label, max(abs(v) for v in d), ['%.2e' % v for v in d], T.mid().str(20), len(stats), min(hs), max(hs),
               min(rhos), max(rhos)))
    print(line, flush=True)
    out.append(line)
    return y1, T


if __name__ == '__main__':
    import json
    EL = el_exact()
    out = ['High-precision Taylor check (python-flint arb_series, 256 bits, order 36, Picard coefficients, step min(2, radius/4) with last-term size below 1e-45).',
           'Section u = 4.5, u increasing. NUMERICAL: the remainder is controlled by the last coefficient, not enclosed.']
    d = json.load(open('../data/horseshoe_Jgo.json'))
    Jgo = arb(repr(d['J']))
    check('A at J = %r (E_l exact)' % d['J'], d['A'], Jgo, EL, out)
    check('B at J = %r (E_l exact)' % d['J'], d['B'], Jgo, EL, out)
    for p in d['periodic']:
        if p['code'] == 'AB':
            y, T = check('AB (two returns), first point', p['x0'], Jgo, EL, out, k=2)
    # G&O's printed points, at their current and E_l = 10.599
    p1 = ['0.08508337639787', '0.37698374610906', '0.43727279295129']
    p2 = ['0.08499590453730', '0.37635277095981', '0.43229451177364']
    check("G&O p1 as printed, I = 7.8617827403, E_l = 10.599", [arb(v) for v in p1], arb('7.8617827403'), arb('10.599'), out)
    check("G&O p2 as printed, I = 7.8617827403, E_l = 10.599", [arb(v) for v in p2], arb('7.8617827403'), arb('10.599'), out)
    open('../data/taylor_hp.txt', 'w').write('\n'.join(out) + '\n')
