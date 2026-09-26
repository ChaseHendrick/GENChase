"""Necessary conditions for a monodromy matrix of the variational equation along a loop that is
closed on the phase curve through x0 (variables (a1, a2, a1', a2')):
  (i)  M f(x0) = f(x0)      (the tangent to the orbit is transported to itself)
  (ii) dE(x0) M = dE(x0)    (the energy is a first integral)
Checked on Salnikov's printed matrices (2 decimals) and on ours. Numerical."""
import numpy as np, sympy as sp
from field import F, X, g, energy_expr
from salnikov_printed import M1, M2

x0 = {X[0]: sp.Rational(1, 10), X[1]: sp.Rational(-3, 10), X[2]: sp.Rational(2, 10), X[3]: sp.Rational(4, 10), g: 1}
f = np.array([complex(sp.N(e.subs(x0), 20)) for e in F])
dE = np.array([complex(sp.N(sp.diff(energy_expr(), v).subs(x0), 20)) for v in X])
print('f(x0) =', f.real, '\ndE(x0) =', dE.real)
for name, M in (('Salnikov M1', M1), ('Salnikov M2', M2)):
    a = M @ f - f; b = dE @ M - dE
    print('%s: |M f - f| = %.3f (|f| = %.3f),  |dE M - dE| = %.3f (|dE| = %.3f)' % (
        name, np.linalg.norm(a), np.linalg.norm(f), np.linalg.norm(b), np.linalg.norm(dE)))
    N = M - np.eye(4)
    u, sv, vh = np.linalg.svd(N)
    print('   M - I ~ rank one: s = %s; column direction u =' % np.round(sv, 3), np.round(u[:, 0], 3),
          ' row direction v =', np.round(vh[0], 3))
    print('   |v . f| / |f| = %.3f   (0 if M fixes f)' % (abs(vh[0] @ f) / np.linalg.norm(f)))
    print('   angle test: |dE . u| / |dE| = %.3f   (0 if M preserves dE)' % (abs(dE @ u[:, 0]) / np.linalg.norm(dE)))


def conditions(M, f, dE):
    u, sv, vh = np.linalg.svd(M - np.eye(4))
    return abs(vh[0] @ f) / np.linalg.norm(f), abs(dE @ u[:, 0]) / np.linalg.norm(dE)


if __name__ == '__main__':
    import itertools
    # other readings of the variables: every ordering of the four coordinates, g in {1, 9.81},
    # and canonical momenta (a1, a2, p1, p2) with H in place of E
    a1, a2, v1, v2 = X
    p1, p2 = sp.symbols('p1 p2')
    c = sp.cos(a1 - a2); Dd = 2 - c**2
    H = (p1**2 + 2*p2**2 - 2*c*p1*p2) / (2*Dd) - 2*g*sp.cos(a1) - g*sp.cos(a2)
    Y = [a1, a2, p1, p2]
    FH = [sp.diff(H, p1), sp.diff(H, p2), -sp.diff(H, a1), -sp.diff(H, a2)]
    best = []
    for gv in (1, sp.Rational(981, 100)):
        sub_v = {a1: sp.Rational(1, 10), a2: sp.Rational(-3, 10), v1: sp.Rational(2, 10), v2: sp.Rational(4, 10), g: gv}
        sub_p = {a1: sp.Rational(1, 10), a2: sp.Rational(-3, 10), p1: sp.Rational(2, 10), p2: sp.Rational(4, 10), g: gv}
        fv = np.array([complex(sp.N(e.subs(sub_v))) for e in F])
        dEv = np.array([complex(sp.N(sp.diff(energy_expr(), v).subs(sub_v))) for v in X])
        fp = np.array([complex(sp.N(e.subs(sub_p))) for e in FH])
        dHp = np.array([complex(sp.N(sp.diff(H, v).subs(sub_p))) for v in Y])
        for label, ff, dd in (('velocities', fv, dEv), ('momenta', fp, dHp)):
            for perm in itertools.permutations(range(4)):
                P = list(perm)
                a, b = conditions(M1, ff[P], dd[P])
                best.append((max(a, b), float(gv), label, perm, a, b))
    best.sort(key=lambda r: r[0])
    print('\nbest readings (smallest violation of the two necessary conditions; 0 = consistent):')
    for r in best[:5]:
        print('  g=%s %s ordering %s: |v.f|/|f| = %.3f, |dE.u|/|dE| = %.3f' % (r[1], r[2], r[3], r[4], r[5]))
