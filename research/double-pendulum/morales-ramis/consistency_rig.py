"""Rigorous (ball arithmetic) version of the first necessary condition for the reading g = 1,
x = (a1, a2, a1', a2'): every matrix M whose entries round to Salnikov's printed ones (each real and
imaginary part within 0.005 of the printed value; 0.000005 for the entries printed with more digits)
has |M f(x0) - f(x0)| and |dE(x0) M - dE(x0)| bounded away from 0, so none of them fixes the orbit
tangent or preserves the energy differential, as the monodromy of a loop closed on the phase curve must."""
from flint import acb, arb, ctx
from salnikov_printed import M1, M2
from field import make_numeric
ctx.prec = 128
fj, _ = make_numeric(acb(1))
x0 = [acb('0.1'), acb('-0.3'), acb('0.2'), acb('0.4')]
f, _ = fj(x0)
f = [acb(v) for v in f]
a1, a2, v1, v2 = x0
c = (a1 - a2).cos(); s = (a1 - a2).sin()
# E = v1^2 + v1 v2 c + v2^2/2 - 2 cos a1 - cos a2
dE = [v1 * v2 * (-s) + 2 * a1.sin(), v1 * v2 * s + a2.sin(), 2 * v1 + v2 * c, v1 * c + v2]

def part(w):
    t = repr(float(w))
    d = max(len(t.split('.')[1]) if '.' in t else 0, 2)      # printed with at least 2 decimals
    return arb(t) + arb(0, 0.5 * 10.0 ** (-d))


def ball(z):
    return acb(part(z.real), part(z.imag))


for name, M in (('M1', M1), ('M2', M2)):
    B = [[ball(M[i, j]) for j in range(4)] for i in range(4)]
    Mf = [sum((B[i][j] * f[j] for j in range(4)), acb(0)) - f[i] for i in range(4)]
    EM = [sum((dE[i] * B[i][j] for i in range(4)), acb(0)) - dE[j] for j in range(4)]
    lf = max(abs(v).lower() for v in Mf); le = max(abs(v).lower() for v in EM)
    print('%s: certified  max_i |(M f - f)_i| >= %s,  max_j |(dE M - dE)_j| >= %s' % (name, lf, le))
    print('    while |f(x0)|_max = %s, |dE(x0)|_max = %s' % (max(abs(v).upper() for v in f), max(abs(v).upper() for v in dE)))
