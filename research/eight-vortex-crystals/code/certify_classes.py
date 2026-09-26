# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Computer-assisted certificates for the relative equilibria of eight identical point vortices found by
survey.py. For each numerical class:

  1. existence and local uniqueness (in the rotation gauge y_p = 0) of an exact critical point of f in
     a box of radius RAD, by the Krawczyk test in ball arithmetic;
  2. nondegeneracy modulo rotation (every matrix of the interval Jacobian is nonsingular) and the
     Morse index (inertia of the reduced Hessian over the whole box, Gershgorin after a congruence);
  3. an enclosure of f; disjoint enclosures prove that the classes are pairwise non-congruent;
  4. the chirality invariant Q = Im(m_3^2 conj(m_2)^3) over the box: Q != 0 certifies that the
     configuration has no reflection symmetry and no rotation symmetry (so it and its mirror image are
     two different relative equilibria modulo rotations, scalings and relabelling).

Usage: python3 certify_classes.py [survey json] [out json]
"""
import json, sys, math
import numpy as np
import os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from flint import arb, ctx
import ball

N = 8
RAD = 1e-40

src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'data/survey-N8.json')
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'data/certificates-N8.json')
classes = json.load(open(src))


def certify(zc, label, rad=RAD, refine=True):
    z = np.array([complex(a, b) for a, b in zc])
    p = int(np.argmax(np.abs(z)))
    z = z * np.exp(-1j * np.angle(z[p]))            # vortex p on the positive real axis
    u0 = list(z.real) + [z[k].imag for k in range(N) if k != p]
    u = ball.newton_refine(u0, N, p) if refine else [ball.exact(v) for v in u0]
    ok, X, K = ball.krawczyk(u, rad, N, p)
    rec = dict(label=label, p=p, krawczyk=bool(ok))
    if not ok:
        return rec
    x, y = ball.full_xy(X, N, p)
    rec['xp_positive'] = bool(x[p] > 0)
    J = ball.DG(X, N, p)
    Jm = np.array([[float(J[i, j].mid()) for j in range(J.ncols())] for i in range(J.nrows())])
    w, Q = np.linalg.eigh((Jm + Jm.T) / 2)
    inert = ball.inertia_gershgorin(J, Q)
    rec['inertia'] = None if inert is None else dict(neg=inert[0], pos=inert[1])
    fv = ball.fval(x, y)
    rec['f_mid'] = fv.mid().str(30, radius=False)
    rec['f_lo'] = float(fv.lower()); rec['f_hi'] = float(fv.upper())
    rec['f_ball'] = fv.str(25)
    q = ball.chirality(x, y)
    rec['Q_ball'] = q.str(12)
    rec['Q_nonzero'] = bool(q > 0 or q < 0)
    I2 = sum((x[k] * x[k] + y[k] * y[k] for k in range(N)), arb(0))
    rec['sum_abs2_contains_28'] = bool(I2.contains(arb(28)))
    rec['z_mid'] = [[x[k].mid().str(70, radius=False), y[k].mid().str(70, radius=False)] for k in range(N)]
    rec['box_radius'] = rad
    rec['_f'] = fv
    return rec


if __name__ == '__main__':
    out = []
    for i, c in enumerate(classes):
        r = certify(c['z'], f'class {i + 1}')
        r['numerical_index'] = c['index']; r['numerical_symmetry_order'] = c['rot'] + c['refl']
        r['numerical_reflections'] = c['refl']
        out.append(r)
        print(f"{r['label']:>9}: krawczyk={r['krawczyk']} xp>0={r.get('xp_positive')} inertia={r.get('inertia')} "
              f"(numerical index {c['index']}) f={r.get('f_ball')} Q={r.get('Q_ball')} chiral={r.get('Q_nonzero')}")
    # pairwise distinct f enclosures
    fs = [r['_f'] for r in out]
    overl = [(i + 1, j + 1) for i in range(len(fs)) for j in range(i + 1, len(fs)) if fs[i].overlaps(fs[j])]
    allok = all(r['krawczyk'] and r['xp_positive'] and r['inertia'] and r['inertia']['neg'] == r['numerical_index']
                and r['inertia']['neg'] + r['inertia']['pos'] == 2 * N - 1 for r in out)
    print('all Krawczyk, positivity and index checks pass:', allok)
    print('overlapping f enclosures:', overl)
    # Euler characteristic sum with the NUMERICAL symmetry orders (a consistency check, not a proof)
    chi = sum((-1) ** r['inertia']['neg'] * 2 * math.factorial(N) // r['numerical_symmetry_order'] for r in out)
    print('Euler sum over the certified classes (numerical symmetry orders):', chi, 'target', math.factorial(N - 2))
    for r in out:
        del r['_f']
    # the minimum's enclosure must contain the closed form f* = 14 - 28 log 2 - (7/2) log 7
    fstar = 14 - 28 * arb(2).log() - arb(7) / 2 * arb(7).log()
    fcheck = fs[0].overlaps(fstar) and out[0]['inertia']['neg'] == 0
    print('class 1 f encloses the closed form f*:', fcheck)
    ok_all = allok and not overl and fcheck
    json.dump(dict(all_ok=allok, overlapping_f=overl, euler_sum=chi, classes=out), open(dst, 'w'), indent=1)
    sys.exit(0 if ok_all else 1)
