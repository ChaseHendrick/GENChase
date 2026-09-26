"""Independent referee code: rigorous (ball arithmetic, python-flint/Arb) Taylor integrator for the planar double
pendulum with m1 = m2 = l1 = l2 = g = 1, derived here from the Hamiltonian, with rigorous detection of the n-th
upward crossing of t1 = 0 and the variational equation.  Written without reference to CAPD or prove.cpp.

H = (p1^2 + 2 p2^2 - 2 c p1 p2) / (2 D) - 2 cos t1 - cos t2,  c = cos(t1 - t2), D = 2 - c^2.

Step validation: rough enclosure Y by the Picard test X + [0,h] F(Y) subset of Y (closed boxes; Schauder plus
Lipschitz uniqueness), then x(h) in sum_{j<=N} c_j(X) h^j + c_{N+1}(Y) h^{N+1} (Lagrange remainder componentwise).
"""
import sympy as sp
from flint import arb, arb_series, ctx

PREC = 256
ctx.prec = PREC
NORD = 30

t1, t2, p1, p2 = sp.symbols('t1 t2 p1 p2', real=True)
c = sp.cos(t1 - t2)
Dd = 2 - c**2
H = (p1**2 + 2 * p2**2 - 2 * c * p1 * p2) / (2 * Dd) - 2 * sp.cos(t1) - sp.cos(t2)
X = [t1, t2, p1, p2]
Fsym = [sp.diff(H, p1), sp.diff(H, p2), -sp.diff(H, t1), -sp.diff(H, t2)]
Jsym = [[sp.diff(f, v) for v in X] for f in Fsym]
Vs = sp.symbols('v0:16')
Faug = list(Fsym) + [sum(Jsym[i][k] * Vs[4 * k + j] for k in range(4)) for i in range(4) for j in range(4)]



def _nopow(code):
    import re as _re
    code = _re.sub(r'(\w+)\*\*\(-2\)', r'(1/(\1*\1))', code)
    code = _re.sub(r'(\w+)\*\*3', r'(\1*\1*\1)', code)
    code = _re.sub(r'(\w+)\*\*2', r'(\1*\1)', code)
    assert '**' not in code, code
    return code

NS = {'sin': lambda z: z.sin(), 'cos': lambda z: z.cos()}
_repl, _red = sp.cse(Faug, optimizations='basic')


def _mk():
    src = ['def faug(t1, t2, p1, p2, ' + ', '.join(str(v) for v in Vs) + '):']
    pr = sp.printing.pycode
    for s, e in _repl:
        src.append('    %s = %s' % (s, sp.printing.str.sstr(e)))
    src.append('    return [' + ', '.join(sp.printing.str.sstr(e) for e in _red) + ']')
    code = '\n'.join(src)
    g = dict(NS)
    exec(_nopow(code), g)
    return g['faug']


faug_raw = _mk()
_repl4, _red4 = sp.cse(Fsym, optimizations='basic')


def _mk4():
    src = ['def f4(t1, t2, p1, p2):']
    for s, e in _repl4:
        src.append('    %s = %s' % (s, sp.printing.str.sstr(e)))
    src.append('    return [' + ', '.join(sp.printing.str.sstr(e) for e in _red4) + ']')
    g = dict(NS)
    exec(_nopow('\n'.join(src)), g)
    return g['f4']


f4_raw = _mk4()


def field(x):
    return f4_raw(*x) if len(x) == 4 else faug_raw(*x)


UNIT = arb(0, 1)   # [-1, 1]


def ivl(lo, hi):
    """a ball containing the real interval [lo, hi] (lo, hi arb or float; outward)."""
    lo = arb(lo).lower(); hi = arb(hi).upper()
    m = (lo + hi) / 2
    r = ((hi - lo) / 2).upper()
    return m + UNIT * r


def hull(a, b):
    lo = a.lower() if a.lower() < b.lower() else b.lower()
    hi = a.upper() if a.upper() > b.upper() else b.upper()
    return ivl(lo, hi)


def inside(a, b):
    """a strictly inside b"""
    return a.lower() > b.lower() and a.upper() < b.upper()


def taylor_coeffs(x0, N):
    """Taylor coefficients c_0..c_N of the solution through x0 (arb or ball vector)."""
    old = ctx.cap
    ctx.cap = N + 1
    n = len(x0)
    cs = [[arb(v)] for v in x0]
    for k in range(N):
        ser = [arb_series(cs[i]) for i in range(n)]
        F = field(ser)
        for i in range(n):
            ck = F[i].coeffs()
            val = ck[k] if len(ck) > k else arb(0)
            cs[i].append(val / (k + 1))
    ctx.cap = old
    return cs


def poly_eval(cs, t):
    out = []
    for ci in cs:
        s = arb(0)
        for a in reversed(ci):
            s = s * t + a
        out.append(s)
    return out


def rough(x0, h):
    n = len(x0)
    H = ivl(0, h)
    F0 = field([arb(v) for v in x0])
    Z = [x0[i] + H * F0[i] for i in range(n)]
    for tries in range(60):
        Zin = [Z[i] + UNIT * (0.2 * Z[i].rad() + 1e-3 * h) for i in range(n)]
        FZ = field(Zin)
        W = [x0[i] + H * FZ[i] for i in range(n)]
        if all(inside(W[i], Zin[i]) for i in range(n)):
            Y = W
            for _ in range(3):
                FY = field(Y)
                Y = [x0[i] + H * FY[i] for i in range(n)]
            return Y
        Z = [hull(Z[i], W[i]) for i in range(n)]
    raise RuntimeError('rough enclosure failed')


def step(x0, h, N=NORD):
    Y = rough(x0, h)
    cs = taylor_coeffs(x0, N)
    rem = taylor_coeffs(Y, N + 1)
    remN = [r[N + 1] for r in rem]
    hh = arb(h)
    xe = poly_eval(cs, hh)
    xe = [xe[i] + remN[i] * hh ** (N + 1) for i in range(len(x0))]
    return xe, Y, cs, remN


def enclose_at(cs, remN, T, N=NORD):
    """enclosure of x(tau), tau in the ball T subset of [0, h]."""
    xe = poly_eval(cs, T)
    return [xe[i] + remN[i] * T ** (N + 1) for i in range(len(cs))]


def return_map(x0, nret=1, h=0.04, verbose=False):
    """x0: arb vector with t1 = 0 exactly and dt1/dt > 0. Returns (x at the nret-th later upward crossing of t1=0,
    crossing time ball). Rigorous: every step's rough enclosure is checked; if it meets t1 = 0 the t1-velocity is
    required to have constant sign on it, so t1 is monotone on that step and crossings are counted exactly."""
    x = list(x0)
    t = arb(0)
    F0 = field(x)[0]
    assert x[0].contains(0) and F0 > 0
    sign = 0  # 0 at the start (on the section, moving up)
    count = 0
    first = True
    while True:
        hs = h
        while True:
            xe, Y, cs, remN = step(x, hs)
            y0 = Y[0]
            FY0 = field(Y)[0]
            ok = True
            if y0.contains(0):
                if not (FY0 > 0 or FY0 < 0):
                    ok = False
            if xe[0].contains(0):
                ok = False
            if ok:
                break
            hs = hs * 0.6
            if hs < 1e-6:
                raise RuntimeError('step size underflow at t=%s x=%s Y0=%s FY0=%s count=%d' % (t.str(8), [v.str(8) for v in x[:4]], y0.str(8), FY0.str(8), count))
        end_sign = 1 if xe[0] > 0 else -1
        if first:
            # started on the section going up; monotone check above guarantees no other crossing in this step
            # unless t1 comes back (then Y meets 0 with F0 of both signs, rejected).
            assert FY0 > 0 or not y0.contains(0)
            if end_sign < 0:
                raise RuntimeError('first step crossed back down; reduce h')
            first = False
        else:
            if y0.contains(0) and end_sign != sign:
                if sign < 0 and end_sign > 0:
                    count += 1
                    if count == nret:
                        # locate crossing time tau in [0, hs] by interval Newton
                        T = ivl(0, hs)
                        for it in range(200):
                            m = arb(T.mid())
                            g = enclose_at([cs[0]], [remN[0]], m)[0]
                            XT = enclose_at(cs, remN, T)
                            dg = field(XT)[0]
                            Nt = m - g / dg
                            lo = max(Nt.lower(), T.lower()); hi = min(Nt.upper(), T.upper())
                            if lo > hi:
                                raise RuntimeError('empty intersection in Newton')
                            Tn = ivl(lo, hi)
                            if Tn.rad() >= T.rad() * 0.999 and it > 5:
                                T = Tn
                                break
                            T = Tn
                        xc = enclose_at(cs, remN, T)
                        return xc, t + T
        x = xe
        sign = end_sign
        t = t + arb(hs)


def return_map_nr(x0, nret=1, h=0.02, N=30):
    """NON-rigorous high-precision version: Taylor order N, midpoints only, no remainder bound.
    Crossings detected by the sign of t1 at step ends (h small relative to the half-swing time)."""
    x = [arb(v.mid()) for v in x0]
    t = arb(0); count = 0; prev = 1
    while True:
        cs = taylor_coeffs(x, N)
        xe = [arb(v.mid()) for v in poly_eval(cs, arb(h))]
        s = 1 if xe[0].mid() > 0 else -1
        if prev < 0 and s > 0:
            count += 1
            if count == nret:
                tau = arb(h / 2)
                for it in range(60):
                    g = poly_eval([cs[0]], tau)[0]
                    dg = poly_eval([[cs[0][j] * j for j in range(1, len(cs[0]))]], tau)[0]
                    tau = arb((tau - g / dg).mid())
                return [arb(v.mid()) for v in poly_eval(cs, tau)], t + tau
        prev = s; x = xe; t = t + arb(h)
