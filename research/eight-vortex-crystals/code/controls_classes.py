# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Negative controls and mutation tests for certify_classes.py. Every line must print PASS."""
import json, copy
import numpy as np
import os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from flint import arb
import ball
from certify_classes import certify, N

cl = json.load(open(os.path.join(HERE, 'data/survey-N8.json')))
chiral = [c for c in cl if c['rot'] + c['refl'] == 1][0]
results = []

def check(name, cond):
    results.append(cond); print(('PASS' if cond else 'FAIL'), name)

# 1. a displaced centre (no refinement) must fail the Krawczyk test at radius 1e-40
z = np.array([complex(a, b) for a, b in chiral['z']]); z2 = z + 1e-6 * np.exp(1j * np.arange(N))
r = certify([[v.real, v.imag] for v in z2], 'displaced', refine=False)
check('displaced centre fails Krawczyk', not r['krawczyk'])
# 2. a random configuration (not a critical point), refined only by 0 iterations, fails
rng = np.random.default_rng(7); zr = rng.normal(size=N) + 1j * rng.normal(size=N)
r = certify([[v.real, v.imag] for v in zr], 'random', refine=False, rad=1e-3)
check('random configuration fails Krawczyk', not r['krawczyk'])
# 3. mirror image: Q changes sign, the class certifies with the same f and index
r1 = certify(chiral['z'], 'chiral')
r2 = certify([[a, -b] for a, b in chiral['z']], 'mirror')
check('mirror image certifies', r2['krawczyk'] and r2['inertia'] == r1['inertia'])
check('Q changes sign under reflection', r1['Q_ball'].startswith('[29270') and r2['Q_ball'].startswith('[-29270'))
# 4. a relabelled copy (permutation) gives the same Q and f
perm = np.random.default_rng(3).permutation(N)
r3 = certify([chiral['z'][k] for k in perm], 'permuted')
check('permutation leaves Q and f unchanged', r3['Q_ball'][:14] == r1['Q_ball'][:14] and r3['f_mid'] == r1['f_mid'])
# 5. symmetric classes are never certified chiral
sym = [certify(c['z'], 'sym') for c in cl if c['rot'] + c['refl'] > 1]
check('no symmetric class is certified chiral', not any(s['Q_nonzero'] for s in sym))
# 6. mutation: drop the confinement term from the gradient; the Krawczyk test must fail
orig = ball.grad_full
def bad_grad(x, y):
    gx, gy = orig(x, y); return [g - v for g, v in zip(gx, x)], [g - v for g, v in zip(gy, y)]
ball.grad_full = bad_grad
r = certify(chiral['z'], 'mutated gradient', refine=False)
check('mutated gradient fails Krawczyk', not r['krawczyk'])
ball.grad_full = orig
# 7. mutation: the Hessian with the opposite sign gives the opposite inertia (the test is not blind)
u = ball.newton_refine(list((z * np.exp(-1j * np.angle(z[0]))).real) + list((z * np.exp(-1j * np.angle(z[0]))).imag[1:]), N, 0)
J = ball.DG(u, N, 0); Jn = -1 * J
Jm = np.array([[float(J[i, j].mid()) for j in range(15)] for i in range(15)]); w, Q = np.linalg.eigh(Jm)
check('inertia of -H is (11, 4)', ball.inertia_gershgorin(Jn, Q) == (11, 4) and ball.inertia_gershgorin(J, Q) == (4, 11))
# 8. an inflated ball Hessian (radius 10) cannot be certified
Jw = J * 1
for i in range(15): Jw[i, i] = Jw[i, i] + arb(0, 10)
check('an uncertain Hessian returns no inertia', ball.inertia_gershgorin(Jw, Q) is None)
# 9. Gershgorin: a disc that straddles 0 with tight entries must give no inertia
from flint import arb_mat
A = arb_mat([[1, 0.01], [0.01, -0.001]])
check('a disc straddling 0 returns no inertia', ball.inertia_gershgorin(A, np.eye(2)) is None)
B = arb_mat([[1, 0.01], [0.01, -0.5]])
check('separated discs give inertia (1, 1)', ball.inertia_gershgorin(B, np.eye(2)) == (1, 1))
# 10. Krawczyk needs strict interior containment, not containment
check('touching the boundary is not strict containment', not ball.strictly_inside(arb(0.5, 0.5), arb(0.5, 0.5)))
check('strict containment is accepted', ball.strictly_inside(arb(0.5, 0.25), arb(0.5, 0.5)))
# 11. the Jacobian DG agrees with central differences of G at every class (catches a wrong Hessian formula)
worst = 0.0
for c in cl:
    zz = np.array([complex(a, b) for a, b in c['z']]); p = int(np.argmax(np.abs(zz))); zz = zz * np.exp(-1j * np.angle(zz[p]))
    u0 = list(zz.real) + [zz[k].imag for k in range(N) if k != p]
    J = ball.DG([ball.exact(v) for v in u0], N, p)
    h = 1e-6
    for k in range(len(u0)):
        up_ = list(u0); dn_ = list(u0); up_[k] += h; dn_[k] -= h
        gu = ball.G([ball.exact(v) for v in up_], N, p); gd = ball.G([ball.exact(v) for v in dn_], N, p)
        for i in range(len(u0)):
            fd = (float(gu[i].mid()) - float(gd[i].mid())) / (2 * h)
            worst = max(worst, abs(fd - float(J[i, k].mid())))
check(f'DG matches finite differences of G (max error {worst:.1e})', worst < 1e-6)
ok = all(results)
print('ALL PASS' if ok else 'SOME FAILED')
import sys
sys.exit(0 if ok else 1)
