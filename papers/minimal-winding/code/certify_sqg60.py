#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""Computer-assisted proof, in ball arithmetic (FLINT/Arb through python-flint), that sixty point vortices of
the SQG model (alpha = 1) admit a self-similar collapse WITHOUT rotation (kappa real, P = 0).

Law (alpha-model, alpha = 1):  dz_j/dt = (i/2 pi) sum_{k != j} Gamma_k (z_j - z_k) |z_j - z_k|^(-3).
Gauge of certify_alpha_model.py: Gamma_1 = 1, z_1 real, z_c = 0 and 2 pi kappa = c = -1 exactly.
Unknowns: all positions (x_1, x_2, y_2, ..., x_60, y_60: 119 reals) and one circulation; the other 58
circulations are fixed at printed rationals. Equations: E_j = 2 pi v_j + z_j = 0 (real and imaginary
parts, 120 reals). Square 120 x 120 system, Krawczyk test with midpoint-inverse preconditioner.

If every check prints OK: for the printed rational circulations there is exactly one solution in the
printed box, and on the whole box every Gamma_j != 0, sum Gamma_j != 0, the z_j are pairwise distinct
and nonzero, so z_j(t) = (1 - 3 t/(2 pi))^(1/3) z_j(0): every vortex runs straight into the centre of
vorticity 0, collapsing at t_c = 2 pi/3 without rotating.

Reuses, unmodified, this folder's certify_ball_ad.py, certify_alpha_model.py, certify_pipeline.py and
certify_crosschecks.py. Non-rigorous parts (mpmath/binary64 refinement, chart choice, Newton) only
produce the candidate and cannot affect soundness.

Run: python3 code/certify_sqg60.py [path/to/collapse-sqg-n60-no-rotation.json] (paths are relative to
this file; the default input is data/collapse-sqg-n60-no-rotation.json). Needs python-flint, mpmath and
numpy (code/requirements.txt). Prints every check and the certified enclosures, writes the certificate to
data/sqg60-certificate.json, and exits with status 1 if any check fails. About a minute.
"""
import json
import os
import random
import sys
import time

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
DATA = os.path.join(os.path.dirname(HERE), 'data')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DATA, 'collapse-sqg-n60-no-rotation.json')

import numpy as np
import mpmath as mp
import flint
from flint import arb, arb_mat, fmpq
import certify_ball_ad as V
import certify_alpha_model as AM
import certify_pipeline as PL
import certify_crosschecks as XC

T0 = time.time()
FAILED = []
COUNT = [0]
ALPHA = 1
DIGITS = 12              # decimals of the fixed rational circulations


def check(name, ok, detail=''):
    COUNT[0] += 1
    print(('OK    ' if ok else 'FAIL  ') + name + (('   [' + detail + ']') if detail else ''), flush=True)
    if not ok:
        FAILED.append(name)


def show(msg):
    print('      ' + msg, flush=True)


def lap(label):
    show('[%s: %.1f s elapsed]' % (label, time.time() - T0))


print('SQG (alpha = 1), N = 60: certified self-similar collapse without rotation (python %s, python-flint %s,'
      ' mpmath %s, numpy %s; Arb at %d bits)' % (sys.version.split()[0], flint.__version__, mp.__version__,
                                                np.__version__, V.PREC))

# ============================================================================ 1. refinement (non-rigorous)
print()
print('1. Refinement of the stored binary64 point at 100 digits (mpmath residuals, non-rigorous)')
mp.mp.dps = 100
d = json.load(open(SRC))
assert int(d['alpha']) == ALPHA
N = len(d['G'])
n = 3*N - 2
m = 2*N
z = [mp.mpc(mp.mpf(a), mp.mpf(b)) for a, b in d['z']]
G = [mp.mpf(g) for g in d['G']]
G = [g/G[0] for g in G]


def vel(zz, GG):
    return [1j/(2*mp.pi)*mp.fsum(GG[k]*(zz[j] - zz[k])*abs(zz[j] - zz[k])**(-ALPHA - 2) for k in range(N) if k != j)
            for j in range(N)]


zc = mp.fsum(g*w for g, w in zip(G, z))/mp.fsum(G)
z = [w - zc for w in z]
kap0 = mp.fsum(v/w for v, w in zip(vel(z, G), z))/N
mirrored = kap0.real > 0
show('stored configuration, centred at z_c: mean kappa_j = %s under the paper\'s law: it %s'
     % (mp.nstr(kap0, 10), 'EXPANDS; its mirror image z -> conj(z) collapses and is certified' if mirrored
        else 'collapses; it is certified as stored (no mirror image needed)'))
kap = -mp.conj(kap0) if mirrored else kap0
if mirrored:
    z = [mp.conj(w) for w in z]
scale = (-2*mp.pi*kap.real)**(mp.mpf(1)/(ALPHA + 2))       # kappa scales as s^-(alpha+2) under z -> s z
rot = mp.conj(z[0])/abs(z[0])
z = [w*rot*scale for w in z]


def pack(z, G):
    v = [z[0].real]
    for k in range(1, N):
        v += [z[k].real, z[k].imag]
    return v + G[1:]


def unpack(v):
    return [mp.mpc(v[0], 0)] + [mp.mpc(v[2*k - 1], v[2*k]) for k in range(1, N)], [mp.mpf(1)] + list(v[2*N - 1:])


def E_mp(v, c=-1):
    """2 pi v_j - c z_j in complex arithmetic (independent of the ball AD)"""
    zz, GG = unpack(v)
    out = [1j*mp.fsum(GG[k]*(zz[j] - zz[k])*abs(zz[j] - zz[k])**(-ALPHA - 2) for k in range(N) if k != j) - c*zz[j]
           for j in range(N)]
    return [e.real for e in out] + [e.imag for e in out]


def J64(v):
    """binary64 Jacobian of E (analytic), for the Newton steps of the refinement and the chart choice only"""
    x = np.array([float(v[0])] + [float(v[2*k - 1]) for k in range(1, N)])
    y = np.array([0.0] + [float(v[2*k]) for k in range(1, N)])
    g = np.array([1.0] + [float(t) for t in v[2*N - 1:]])
    J = np.zeros((m, n))
    ix = lambda k: 0 if k == 0 else 2*k - 1
    iy = lambda k: None if k == 0 else 2*k
    ig = lambda k: None if k == 0 else 2*N - 2 + k
    p = -(ALPHA + 2)/2
    for j in range(N):
        for k in range(N):
            if k == j:
                continue
            a = x[j] - x[k]
            b = y[j] - y[k]
            mm = a*a + b*b
            q = mm**p
            dq = p*mm**(p - 1)
            dRe_da = -g[k]*b*dq*2*a
            dRe_db = -g[k]*(q + b*dq*2*b)
            dIm_da = g[k]*(q + a*dq*2*a)
            dIm_db = g[k]*a*dq*2*b
            for row, dda, ddb in ((j, dRe_da, dRe_db), (N + j, dIm_da, dIm_db)):
                J[row, ix(j)] += dda
                J[row, ix(k)] -= dda
                if iy(j) is not None:
                    J[row, iy(j)] += ddb
                if iy(k) is not None:
                    J[row, iy(k)] -= ddb
            if ig(k) is not None:
                J[j, ig(k)] += -b*q
                J[N + j, ig(k)] += a*q
    for j in range(N):
        J[j, ix(j)] += 1
        if iy(j) is not None:
            J[N + j, iy(j)] += 1
    return J


v = pack(z, G)
hist = []
for it in range(40):
    F = E_mp(v)
    res = max(abs(f) for f in F)
    hist.append(res)
    if res < mp.mpf(10)**-90:
        break
    Ff = np.array([float(f) for f in F])
    s = float(max(abs(Ff).max(), 1e-300))
    dx = np.linalg.lstsq(J64(v), Ff/s, rcond=None)[0]*s        # minimum-norm step on the 120 x 178 system
    v = [v[i] - mp.mpf(float(dx[i])) for i in range(n)]
show('Newton residuals max|2 pi v_j + z_j|: ' + ', '.join(mp.nstr(r, 2) for r in hist))
check('refinement: residual of the 120 equations below 1e-60 at 100 digits (non-rigorous)', hist[-1] < mp.mpf(10)**-60,
      'final %s after %d steps' % (mp.nstr(hist[-1], 3), len(hist) - 1))
lap('refinement')

# ============================================================================ 2. chart
print()
print('2. Chart: fix 58 circulations at %d-decimal rationals; unknowns: 119 position coordinates and one circulation'
      % DIGITS)
Jf = J64(v)
POS = list(range(2*N - 1))
best = None
for k in range(2, N + 1):
    U_ = POS + [2*N - 2 + (k - 1)]
    sv = np.linalg.svd(Jf[:, U_], compute_uv=False)
    if best is None or sv[-1] > best[0]:
        best = (sv[-1], sv[0], k)
kfree = best[2]
nm = AM.names(N)
U = POS + [nm.index('G%d' % kfree)]
S = [i for i in range(n) if i not in U]
sv_full = np.linalg.svd(Jf, compute_uv=False)
show('singular values of the full 120 x 178 Jacobian %.3g .. %.3g; best chart frees Gamma_%d: J_U has singular values'
     ' %.3g .. %.3g (condition %.3g) [binary64 choice; cannot affect soundness]'
     % (sv_full[0], sv_full[-1], kfree, best[1], best[0], best[1]/best[0]))
x = [V.A(mp.nstr(t, 95)) for t in v]
fixed = [PL.rat(x[i], DIGITS) for i in S]
base = list(x)
for i, q in zip(S, fixed):
    base[i] = arb(q)
show('fixed: Gamma_1 = 1 (gauge), ' + ', '.join('%s = %s' % (nm[i], q) for i, q in zip(S, fixed)))


class SQG60:
    names = nm

    @staticmethod
    def eqs(full, free, order=1):
        return AM.E_T(full, free, N, ALPHA, arb(-1), order=order)


def fun_of(model, base_, c_=None):
    def fun(u, want_jac):
        full = PL.full_from(base_, U, u)
        Ts = AM.E_T(full, U, N, ALPHA, c_ if c_ is not None else arb(-1), order=1)
        return [t.v for t in Ts], (V.jac_of(Ts) if want_jac else None)
    return fun


# the ball AD formulas against the independent mpmath law at N = 60 (non-rigorous guard against coding errors)
mp.mp.dps = 110
Ts = SQG60.eqs(x, U, 1)
Fm = E_mp([XC._m(a) for a in x])
e0 = max(abs(XC._m(Ts[r].v) - Fm[r]) for r in range(m))
rnd = random.Random(60)
cols = rnd.sample(range(len(U)), 6) + [U.index(nm.index('G%d' % kfree))]
h = mp.mpf(10)**-30
e1 = mp.mpf(0)
vm = [XC._m(a) for a in x]
for c_ in cols:
    vp = list(vm)
    vq = list(vm)
    vp[U[c_]] += h
    vq[U[c_]] -= h
    Fp = E_mp(vp)
    Fq = E_mp(vq)
    for r in range(m):
        e1 = max(e1, abs((Fp[r] - Fq[r])/(2*h) - XC._m(Ts[r].g[c_, 0])))
check('ball AD (certify_alpha_model.E_T) agrees with an independent mpmath evaluation of the law at N = 60: values and'
      ' 7 Jacobian columns (central differences, step 1e-30, 110 digits)', e0 < mp.mpf(10)**-80 and e1 < mp.mpf(10)**-25,
      '|E| %s, |J| %s' % (mp.nstr(e0, 3), mp.nstr(e1, 3)))
lap('chart')

# ============================================================================ 3. Krawczyk
print()
print('3. Newton (Arb midpoints) and the Krawczyk test on the square 120 x 120 system')
r = PL.solve_square(SQG60, base, U, [x[i] for i in U])
check('SQG, N = 60: the 120 real equations 2 pi v_j = -z_j (2 pi kappa = -1, real) have exactly one solution in the'
      ' box of radius 1e-%s about the Newton point, in the 120 unknowns (119 coordinates and Gamma_%d)'
      % (r.get('rmax'), kfree), r['ok'] and r.get('rmax') is not None,
      'Newton residual %s; at radius 1e-40: ||I - Y J(X)||_inf <= %s, ||Y E(x~)||_inf <= %s'
      % (r['newton_residual'].str(3, radius=False), r['contraction'].str(3, radius=False), r['step'].str(3, radius=False)))
lap('Krawczyk')
if not r['ok']:
    print('Krawczyk failed; stopping.')
    sys.exit(1)
K = r['K']
ut = [a.mid() for a in K]
rmax = r['rmax']
wmax = max(a.rad() for a in K)
show('tight enclosure: max radius of the 120 enclosures %s' % arb(wmax).str(3, radius=False))
_, _, _, info_r = V.krawczyk(fun_of(SQG60, base), ut, arb(10)**(-rmax))
show('at the uniqueness radius 1e-%d: ||I - Y J(X)||_inf <= %s' % (rmax, info_r['contraction'].str(3, radius=False)))

# ============================================================================ 4. side conditions
print()
print('4. Collapse conditions on the whole uniqueness box (radius 1e-%d) and on the tight enclosure' % rmax)
c = arb(-1)
Xbox = [arb(a, arb(10)**(-rmax)) for a in ut]
for label, full in (('tight enclosure', r['full']), ('uniqueness box', PL.full_from(base, U, Xbox))):
    sc = AM.side_checks(N, full, ALPHA, c)
    bad = [k for k in AM.GENUINE if not sc[k]]
    check('%s: every Gamma_j != 0, sum Gamma_j != 0, the z_j pairwise distinct and nonzero, each 2 pi v_j/z_j contains'
          ' -1 (kappa real), and sum Gamma_j z_j, I = sum Gamma_j |z_j|^2 (angular impulse), E = sum Gamma_j Gamma_k'
          ' r_jk^-1 contain 0' % label, not bad,
          'sum Gamma %s, min |z_j - z_k| >= %s, %s <= |z_j| <= %s, I %s, E %s%s'
          % (sc['sum_Gamma'], sc['min_pair_distance_lower_bound'], sc['min_abs_z_lower_bound'],
             sc['max_abs_z_upper_bound'], sc['I_enclosure'], sc['E_enclosure'],
             ('; failed: ' + ', '.join(bad)) if bad else ''))
Gs = [arb(1)] + [r['full'][2*N - 2 + k] for k in range(1, N)]
show('circulations: min |Gamma_j| >= %s, max |Gamma_j| <= %s; Gamma_%d in %s'
     % (arb(min(abs(g).lower() for g in Gs)).str(6, radius=False), arb(max(abs(g).upper() for g in Gs)).str(6, radius=False),
        kfree, K[U.index(nm.index('G%d' % kfree))].str(30, radius=True)))
show('so every vortex runs straight into 0: z_j(t) = (1 - 3t/(2 pi))^(1/3) z_j(0), collapse at t_c = 2 pi/3; the'
     ' 120 x 120 Jacobian is invertible on the box, so by the implicit function theorem these collapses form a'
     ' 58-parameter family (modulo symmetries) near this point')

# ============================================================================ 5. independent re-check
print()
print('5. Independent re-check of the certified midpoint with separate Biot-Savart code at 80 digits (non-rigorous)')
XC.independent(check, 'SQG, N = 60', r['full'], N, 'alpha', alpha=ALPHA, rotating=False)

# ============================================================================ 6. negative controls
print()
print('6. Negative controls (each must FAIL the test it is put to; a check is OK when the control fails)')


fun = fun_of(SQG60, base)
# (a) a wrong point: shift the candidate by 1e-10 in every unknown (random signs) and test the box of radius 1e-12 about
# it, which does not contain the certified zero (the zero is unique in the box of radius 1e-rmax)
rnd = random.Random(1)
wrong = [(a + arb(fmpq(rnd.choice((-1, 1)), 10**10))).mid() for a in ut]
ok_a, _, _, info_a = V.krawczyk(fun, wrong, arb('1e-12'))
check('control (a): a perturbed wrong point (every unknown shifted by 1e-10) fails Krawczyk in the box of radius 1e-12',
      not ok_a, '||Y E(x~)|| = %s, 1e-12 box' % info_a['step'].str(3, radius=False))
# (a') the same wrong point with Newton skipped but a box wide enough to contain the true zero must still be accepted
ok_a2, _, _, _ = V.krawczyk(fun, wrong, arb('1e-9'))
check('control (a\'): the same wrong point with a box of radius 1e-9, which contains the true zero, passes (the test'
      ' localizes, it does not merely fail away from the candidate)', ok_a2)
# (b) the mirror image z -> conj(z) of the certified point expands (2 pi kappa = +1): it must fail at 2 pi kappa = -1
mir = list(ut)
for k in range(1, N):
    mir[2*k] = -mir[2*k]
ok_b, _, _, info_b = V.krawczyk(fun, mir, arb('1e-20'))
Fb = fun_of(SQG60, base, arb(1))(mir, False)[0]
check('control (b): the mirror image z -> conj(z) (an expansion, 2 pi kappa = +1) fails Krawczyk at 2 pi kappa = -1,'
      ' while it solves the 2 pi kappa = +1 equations', (not ok_b) and max(abs(f).upper() for f in Fb) < arb('1e-60'),
      '||Y E(x~)|| = %s; residual at +1: %s' % (info_b['step'].str(3, radius=False),
                                               arb(max(abs(f).upper() for f in Fb)).str(3, radius=False)))
# (c) the ratio test is not vacuous: with a wrong kappa (2 pi kappa = -1.000001) the certified box must fail it
sc_c = AM.side_checks(N, r['full'], ALPHA, arb('-1.000001'))
check('control (c): the tight enclosure does not contain 2 pi kappa = -1.000001 in its ratios 2 pi v_j/z_j',
      not sc_c['all_ratios_v_over_z_enclose_kappa'])
# (d) a wrong circulation: change the fixed Gamma of the first chart coordinate by 1e-8 and keep the old candidate
base_d = list(base)
base_d[S[0]] = arb(fixed[0] + fmpq(1, 10**8))
ok_d, _, _, info_d = V.krawczyk(fun_of(SQG60, base_d), ut, arb('1e-15'))
check('control (d): with %s moved by 1e-8 the old candidate fails Krawczyk in the box of radius 1e-15' % nm[S[0]],
      not ok_d, '||Y E(x~)|| = %s' % info_d['step'].str(3, radius=False))

# ============================================================================ output
def qdec(q):
    """the exact decimal expansion of a rational with denominator dividing 10^DIGITS"""
    k = int(q*10**DIGITS)
    assert fmpq(k, 10**DIGITS) == q
    return ('-' if k < 0 else '') + '%d.%0*d' % (abs(k)//10**DIGITS, DIGITS, abs(k) % 10**DIGITS)


out = dict(
    statement='SQG (alpha = 1), N = 60: with Gamma_1 = 1 and the other fixed circulations at the listed rationals, the '
              'equations 2 pi v_j = -z_j (j = 1..60) have exactly one solution with (x_1, x_2, y_2, ..., x_60, y_60, '
              'Gamma_%d) in the box of the listed centre and radius 1e-%d (y_1 = 0).' % (kfree, rmax),
    law='dz_j/dt = (i/2 pi) sum_{k != j} Gamma_k (z_j - z_k) |z_j - z_k|^(-3)',
    source=os.path.relpath(SRC, os.path.dirname(HERE)), mirrored=bool(mirrored), prec_bits=V.PREC,
    free_circulation='G%d' % kfree, fixed={nm[i]: qdec(q) for i, q in zip(S, fixed)},
    uniqueness_radius='1e-%d' % rmax,
    centre={nm[i]: ut[p].str(60, radius=False) for p, i in enumerate(U)},
    enclosures={nm[i]: K[p].str(40, radius=True) for p, i in enumerate(U)},
    checks=COUNT[0], failed=FAILED, runtime_s=round(time.time() - T0, 1))
with open(os.path.join(DATA, 'sqg60-certificate.json'), 'w') as f:
    json.dump(out, f, indent=1)
print()
print('%d checks, run time %.0f s' % (COUNT[0], time.time() - T0))
if FAILED:
    print('%d check(s) FAILED:' % len(FAILED))
    for f_ in FAILED:
        print('  ' + f_)
    sys.exit(1)
print('all checks passed')
