"""The Krawczyk steps of bnb.c and bnbA.c use hand-derived Jacobians.  A
wrong Jacobian could certify a box falsely, so check both, at random points,
against the exact derivatives computed by forward-mode automatic
differentiation in arb (rational arithmetic on the same doubles):
every C interval must contain the arb value.  Also check E itself.
Run from code/ after building:  python3 tests/test_jacobians.py"""
import os, random, subprocess, sys
from flint import arb, ctx
ctx.prec = 200
here = os.path.dirname(os.path.abspath(__file__))
code = os.path.dirname(here)


class Dual:
    def __init__(s, v, g):
        s.v, s.g = v, g
    def __add__(s, o):
        o = o if isinstance(o, Dual) else Dual(arb(o), [arb(0)] * len(s.g))
        return Dual(s.v + o.v, [a + b for a, b in zip(s.g, o.g)])
    __radd__ = __add__
    def __neg__(s):
        return Dual(-s.v, [-a for a in s.g])
    def __sub__(s, o):
        return s + (-o if isinstance(o, Dual) else -arb(o))
    def __rsub__(s, o):
        return (-s) + o
    def __mul__(s, o):
        o = o if isinstance(o, Dual) else Dual(arb(o), [arb(0)] * len(s.g))
        return Dual(s.v * o.v, [s.v * b + o.v * a for a, b in zip(s.g, o.g)])
    __rmul__ = __mul__
    def inv(s):
        return Dual(1 / s.v, [-a / (s.v * s.v) for a in s.g])
    def powr(s, e):
        return Dual(s.v ** e, [e * s.v ** (e - 1) * a for a in s.g])


def cinv(a, b):  # 1/(a+ib) = (a - ib)/(a^2+b^2)
    d = (a * a + b * b).inv()
    return a * d, -(b * d)


def E_bnb(v, N):
    """equations of bnb.c: G_j = sum 1/(z_j - z_k) - conj z_j, chart x_1 real"""
    D = len(v)
    z = [(v[0], v[0] * 0)] + [(v[2 * j - 1], v[2 * j]) for j in range(1, N - 1)]
    sr = sum((p[0] for p in z[1:]), z[0][0]); si = sum((p[1] for p in z[1:]), z[0][1])
    z.append((-sr, -si))
    G = []
    for j in range(N):
        gr, gi = -z[j][0], z[j][1]   # - conj(z_j)
        for k in range(N):
            if k != j:
                r, i = cinv(z[j][0] - z[k][0], z[j][1] - z[k][1])
                gr, gi = gr + r, gi + i
        G.append((gr, gi))
    E = []
    for j in range(1, N - 1):
        E += [G[j][0], G[j][1]]
    E.append(G[0][0])
    return E


def E_bnbA(v, N, A):
    z = [(v[0] * 0 + 1, v[0] * 0)] + [(v[2 * j - 2], v[2 * j - 1]) for j in range(1, N - 1)]
    sr = sum((p[0] for p in z[1:]), z[0][0]); si = sum((p[1] for p in z[1:]), z[0][1])
    z.append((-sr, -si))
    I = sum((x * x + y * y for x, y in z[1:]), z[0][0] * z[0][0] + z[0][1] * z[0][1])
    U = None; S = []
    for j in range(N):
        a_ = b_ = None
        for k in range(N):
            if k == j: continue
            a = z[j][0] - z[k][0]; b = z[j][1] - z[k][1]; d = a * a + b * b
            p = d.powr(-A / 2)
            a_ = a * p if a_ is None else a_ + a * p
            b_ = b * p if b_ is None else b_ + b * p
            if k > j:
                u = d.powr(1 - A / 2); U = u if U is None else U + u
        S.append((a_, b_))
    E = []
    for j in range(1, N - 1):
        E += [I * S[j][0] - U * z[j][0], I * S[j][1] - U * z[j][1]]
    return E


def check(exe, args, E_fun, D, rnd, trials=25):
    bad = 0
    for _ in range(trials):
        v = [rnd.uniform(-1.3, 1.3) for _ in range(D)]
        if exe.endswith('bnb'):
            v[0] = rnd.uniform(1.4, 2.8)
        out = subprocess.run([os.path.join(code, exe)] + args, env={'BNB_PT': ' '.join(x.hex() for x in v)},
                             capture_output=True, text=True).stdout.split('\n')
        if not out[0]:
            continue
        xs = [Dual(arb(x), [arb(1 if i == j else 0) for j in range(D)]) for i, x in enumerate(v)]
        E = E_fun(xs)
        for line in out:
            t = line.split()
            if not t: continue
            if t[0] == 'E':
                i = sum(1 for l in out[:out.index(line)] if l.startswith('E'))
                val, lo, hi = E[i].v, float.fromhex(t[1]), float.fromhex(t[2])
            else:
                i, j = int(t[1]), int(t[2]); val, lo, hi = E[i].g[j], float.fromhex(t[3]), float.fromhex(t[4])
            if not (val - arb(lo) >= 0 and arb(hi) - val >= 0):
                bad += 1
                print('MISMATCH', exe, args, line, val)
    return bad


rnd = random.Random(7)
bad = 0
for N in (3, 4, 5, 6):
    bad += check('bnb', [str(N), '1', '0', '1'], lambda x: E_bnb(x, N), 2 * N - 3, rnd)
    for A in ('2', '2.5', '3', '6.5', '7'):
        bad += check('bnbA', [str(N), A, '1', '0', '1'], lambda x: E_bnbA(x, N, arb(A)), 2 * N - 4, rnd)
print('Jacobian and equation checks: mismatches =', bad)
sys.exit(1 if bad else 0)
