"""Relative equilibrium families, as (circulations as a function of m, float initial guess).

Group I collinear family of Menezes and Roberts (SIADS 2018, arXiv:1704.08647), circulations
(1, 1, 1, m), linearly stable for -1 < m < m* ~ -0.8564 (their Theorem 3.9).  In our Jacobi
gauge (u1 = z2 - z1 = 1) the branch used is the one with vortex 4 (circulation m) at an end of
the line next to vortex 3, ordering (4 3 1 2); the other five orderings of Group I are
relabellings and reflections of it and give identical frequencies (checked in survey output).
The float table is produced by continuation from m = -0.9 and only supplies starting points;
every certified statement comes from the Krawczyk enclosure in certify.py.
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


class ThreeEqualCollinear:
    name = 'three-collinear'
    free = (0, 2)   # collinear: y-components are exactly 0 (see certify.krawczyk)
    table_file = os.path.join(HERE, 'data', 'groupI_table.json')

    def G(self, m):
        one = m * 0 + 1
        return (one, one, one, m)

    def _table(self):
        if not hasattr(self, '_tab'):
            if not os.path.exists(self.table_file):
                build_table(self)
            self._tab = json.load(open(self.table_file))
        return self._tab

    def guess(self, m):
        tab = self._table()
        best = min(tab, key=lambda r: abs(r[0] - m))
        return best[1]


class PairsRhombusA:
    """Rhombus A of Hampton-Roberts-Santoprete, circulations (1, 1, m, m): vortices 1, 2 at
    (-1/2, 0), (1/2, 0), vortices 3, 4 at (0, +-y).  Used only as a control (definite case,
    already proved by Ohsawa)."""
    name = 'rhombusA'

    def G(self, m):
        one = m * 0 + 1
        return (one, one, m, m)

    def guess(self, m):
        # u1 = z2 - z1 = 1, u2 = z3 - c12 = i y, u3 = z4 - c123 = -i y (1 + m/(2+m))
        y2 = (3 * (1 - m) + (9 * (1 - m) ** 2 + 4 * m) ** 0.5) / 2  # (r34/r12)^2 = alpha, r34 = 2y
        y = y2 ** 0.5 / 2
        return [0.0, y, 0.0, -y - m * y / (2 + m)]


class ThreeEqualKite:
    """Convex kite, circulations (1, 1, 1, m), m < 0 small: vortices 1, 2 (unit) symmetric about
    the axis, vortex 3 (unit) and vortex 4 (m) on the axis on opposite sides of the segment 12
    (at m = -0.05: z = (-0.5, -0.314), (0.5, -0.314), (0, 0.582), (0, -0.917)).  In the Jacobi
    gauge u1 = z2 - z1 = 1 the kite has x2 = x3 = 0.  The reflection (x, y) -> (-x, y) combined
    with the exchange of vortices 1 and 2 (equal circulations) maps (x2, y2, x3, y3) to
    (-x2, y2, -x3, y3) and leaves Ht invariant, so the x-components of F are odd in (x2, x3) and
    vanish on x2 = x3 = 0; free = (1, 3) (see certify2.krawczyk)."""
    name = 'three-kite'
    free = (1, 3)
    table_file = os.path.join(HERE, 'data', 'kite_table.json')

    def G(self, m):
        one = m * 0 + 1
        return (one, one, one, m)

    _table = ThreeEqualCollinear._table
    guess = ThreeEqualCollinear.guess


def build_kite_table(fam):
    from certify import float_newton
    v = float_newton(fam.G(-0.05), [0.0, 0.8955900709506817, 0.0, -0.9021074993456245])
    out = [(-0.05, list(v))]
    for direction in (np.linspace(-0.05, -1e-6, 3000), np.linspace(-0.05, -0.1338, 3000)):
        vv = v
        for m in direction[1:]:
            try:
                vv = float_newton(fam.G(m), vv)
            except Exception:
                break
            out.append((float(m), [float(x) for x in vv]))
    out.sort()
    json.dump(out, open(fam.table_file, 'w'))


def build_table(fam):
    if fam.name == 'three-kite':
        return build_kite_table(fam)
    from certify import float_newton
    from survey import reduced_quadratic
    import random
    G = fam.G(-0.9)
    rng = random.Random(3)
    while True:
        try:
            v = float_newton(G, [rng.uniform(-3, 3), 0, rng.uniform(-3, 3), 0])
        except Exception:
            continue
        if not np.all(np.isfinite(v)):
            continue
        S, ev, g = reduced_quadratic(G, list(v))
        if abs(max(ev.imag) - 1.6592) < 1e-3:
            break
    out = [(-0.9, list(v))]
    for direction in (np.linspace(-0.9, -0.99999, 20000), np.linspace(-0.9, -0.8, 1000)):
        vv = v
        for m in direction[1:]:
            try:
                vv = float_newton(fam.G(m), vv)
            except Exception:
                break
            if not np.all(np.isfinite(vv)):
                break
            out.append((float(m), [float(x) for x in vv]))
    out.sort()
    json.dump(out, open(fam.table_file, 'w'))


FAMS = {'three-collinear': ThreeEqualCollinear, 'three-kite': ThreeEqualKite, 'rhombusA': PairsRhombusA}


def get(name):
    return FAMS[name]()
