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
"""Computer-assisted proofs, in interval (ball) arithmetic, about the self-similar collapse of four or
more point vortices, where the three-vortex bound P > sqrt(3)/2 of the manuscript (Corollary 1 of
paper/minimal-winding.tex) no longer holds, with controls on three vortices, where it does.

Euler law, Eq. (bs) of the manuscript: conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k). A
self-similar collapse about z_c = 0 is a configuration with w_j := sum_{k != j} Gamma_k/(z_j - z_k) =
lam conj(z_j) for every j and Im lam < 0. Then z_j(t) = f(t) z_j(0) with |f|^2 = 1 + (Im lam/pi) t, every
vortex runs on a logarithmic spiral into 0 at t_c = pi/|Im lam|, and P = |Re lam|/(2|Im lam|) = |omega_0| t_c.
Gauge: Gamma_1 = 1, z_1 real, lam = 2P - i (Im lam = -1 exactly). At a solution, sum_j Gamma_j w_j = 0 and
sum_j Gamma_j z_j w_j = S := sum_{j<k} Gamma_j Gamma_k identically, so sum_j Gamma_j z_j = 0, S = 0 and
I := sum_j Gamma_j |z_j|^2 = 0 exactly; the program checks that their enclosures contain 0.

What is proved. Each statement below is a theorem once the program prints OK for its checks, provided
Arb, python-flint and this code are correct; the numbers are those of the parts of the output.
  2. Existence, N = 4, 5, 6: with N - 1 coordinates fixed at printed rationals, the 2N real collapse
     equations have exactly one solution in a box of radius 1e-4; on it every Gamma_j != 0,
     sum Gamma_j != 0, the vortices are distinct and none is at the collision point, and P lies in the
     printed 50-digit interval, below sqrt(3)/2. So self-similar collapses with P < sqrt(3)/2 exist.
  3. Strict local minima P_4, P_5, P_6 of P on the collapse set, modulo rotation, dilation and positive
     circulation scaling: Krawczyk proves a unique solution of the Lagrange system (F = 0,
     J^T mu = e_P) in a box; on it J_U is invertible, so the collapse set is a smooth (N-1)-dimensional
     graph over the chart, and the reduced Hessian Z^T (Hess L) Z is positive definite (Sylvester),
     so the KKT point is a strict local minimum. The tangent eigenvalues are certified by inertia counts.
     Two negative controls check that the same machinery rejects a box that misses the solution and
     rejects the same point as a minimum of -P.
  4. The N = 4 minimum as the alpha-winding text prints it (section "More than three vortices", Section 5
     of the draft "A sharp winding bound for the self-similar collapse of three point vortices in the
     alpha-models"), in its normalization Gamma_1 = 1 on the strong vortex, z_c = 0, kappa = -1 + i b,
     so P = b/2: the printed values of b, P_4, Gamma and z agree with the certified enclosure to their
     last digit, and in those coordinates the Hessian of the Lagrangian of P on the tangent space has
     eigenvalues 1.106, 6.289 and 9.377 (certified enclosures; for the objective b = 2P they double).
  5. The four-vortex minima of the alpha-models quoted in the same section, P_4 = 0.5499151189... for
     alpha = 1 (SQG) and P_4 = 0.4116738600... for alpha = 2, are strict local minima of P on the
     alpha-model collapse set, below the three-vortex bounds 2/3 and sqrt(5)/4 (the same method,
     with the alpha-model equations and P free).
  6. alpha = 2, N = 11: a self-similar collapse without rotation (kappa real, P = 0) exists. Nine
     circulations are fixed at 8-decimal rationals and the other 22 unknowns are unique in a box of
     radius 1e-6. The certified configuration is the mirror image z -> conj(z) of the stored binary64
     point, which expands under the alpha-model law dz_j/dt = (i/2 pi) sum_k Gamma_k (z_j - z_k)/|z_j - z_k|^4.
  7. Controls on three vortices, where P > sqrt(3)/2 is a theorem: the pipelines certify the
     mu = 1/2 arc minimizer above sqrt(3)/2, and they reproduce the closed-form arc minima
     P_-(1/2) = 1.0647059762712043373549862489081020717... and P_-(1/20) = 0.8691128740608046655681...
     (Theorem 1) to about 1e-94.
What is not proved. Global minimality: nothing here says that the certified local minima are the global
minima of P over N-vortex collapses, how many local minima there are, or what the infimum over all N
is. The self-test (1), the independent Biot-Savart re-check (8) and the searches (C), (D), (E) of 7 are
floating-point or high-precision numerics, not proofs; failing to find a root is not a proof that none
exists (on three vortices the theorem is).

What must be trusted: FLINT/Arb (ball arithmetic with rigorous error bounds; F. Johansson, IEEE Trans.
Comput. 66 (2017) 1281-1292), reached through python-flint 0.9.0 at 320 bits, and the certify_*.py files
of this folder. The parts a proof rests on are the automatic differentiation class T, F_T and krawczyk
in certify_ball_ad.py; side_checks, solve_square, kkt_fun, reduced_hessian, pencil_eigs and kkt in
certify_pipeline.py; E_T and side_checks in certify_alpha_model.py; P_closed_form in
certify_controls.py; and the checks of this file. Floating point (binary64, mpmath, and Arb midpoints
without error bounds) is used only to produce candidate points, the preconditioners Y, the charts and
the bracketing values of the eigenvalue enclosures. A poor choice there can make a certification fail,
never make it succeed wrongly.

Method. Krawczyk test: K(X) = x~ - Y F(x~) + (I - Y F'(X))(X - x~) with F'(X) an interval enclosure of
the Jacobian over the whole box (forward-mode automatic differentiation over Arb balls) and Y a floating
approximate inverse; K(X) in int(X) proves a unique zero in X and every matrix in F'(X) nonsingular
(R. Krawczyk, Computing 4 (1969) 187-201; R. E. Moore, SIAM J. Numer. Anal. 14 (1977) 611-615;
A. Neumaier, Interval Methods for Systems of Equations (1990), Ch. 5; S. M. Rump, Acta Numerica 19
(2010) 287-449). Parameters that are not dyadic (1/20, 2 pi) enter as tiny balls; each conclusion then
holds for every parameter in the ball, the exact value included.

Inputs, in data/certify-inputs/ (starting points only; nothing is trusted from them): kkt_N4.json,
kkt_N5.json, kkt_N6.json (numerical minimizers at 90 digits), alpha1-n4-start.json and
alpha2-n4-start.json (binary64 minimizers of a multistart search), vortex-grow-a2-n11-s0-c12.json
(binary64 output of a multistart search).

Run: python3 code/certify_collapses.py [--no-controls] (input paths are relative to this file). Needs
python-flint, mpmath and numpy (code/requirements.txt). Prints every check and the certified enclosures;
exits with status 1 if any check fails. About a minute on one core, almost all of it the floating-point
searches (C), (D), (E) of part 7, which run by default; --no-controls skips part 7 and the run then
takes a few seconds.
"""
import json
import os
import sys
import time

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
DATA = os.path.join(os.path.dirname(HERE), 'data', 'certify-inputs')

import numpy as np
import mpmath as mp
import flint
from flint import arb, arb_mat, fmpq
import certify_ball_ad as V
import certify_pipeline as PL
import certify_alpha_model as AM
import certify_crosschecks as XC

FAILED = []
COUNT = [0]
SUMMARY = []


def check(name, ok, detail=''):
    COUNT[0] += 1
    print(('OK    ' if ok else 'FAIL  ') + name + (('   [' + detail + ']') if detail else ''))
    if not ok:
        FAILED.append(name)


def show(msg):
    print('      ' + msg)


def prefix_ok(x, printed):
    """every printed digit of the positive decimal `printed` is a correct leading digit of every point
    of the ball x (printed <= x < printed + one unit in the last printed place)"""
    d = len(printed.split('.')[1])
    lo = arb(fmpq(int(printed.replace('.', '')), 10**d))
    return bool(x > lo and x < lo + arb(fmpq(1, 10**d)))


def rounded_ok(x, printed):
    """the ball x lies within half a unit in the last place of the decimal `printed`"""
    d = len(printed.split('.')[1]) if '.' in printed else 0
    return bool((x - arb(printed)).abs_upper() <= arb(fmpq(1, 2*10**d)))


def load(name):
    with open(os.path.join(DATA, name)) as f:
        return json.load(f)


def print_enclosures(enc):
    for nm, a in enc:
        show('%-4s %s' % (nm, a.str(30, radius=True)))


def alpha_start(cfg, alpha):
    """A binary64 alpha-model configuration -> starting point in the gauge of certify_alpha_model:
    centred at z_c, mirrored (z -> conj(z), which maps kappa to -conj(kappa)) if it expands under
    the alpha-model law, scaled so that Re(2 pi kappa) = -1 and rotated so that z_1 is real. mpmath, non-rigorous.
    Returns (z, G, kappa of the stored configuration, mirrored, t) with 2 pi kappa = -1 + 2 i t."""
    mp.mp.dps = 40
    N = len(cfg['G'])
    z = [mp.mpc(mp.mpf(repr(a)), mp.mpf(repr(b))) for a, b in cfg['z']]
    G = [mp.mpf(repr(g)) for g in cfg['G']]
    G = [g/G[0] for g in G]

    def vel(zz):
        return [1j/(2*mp.pi)*sum(G[k]*(zz[j] - zz[k])*abs(zz[j] - zz[k])**(-alpha - 2) for k in range(N) if k != j)
                for j in range(N)]
    zc = sum(g*w for g, w in zip(G, z))/sum(G)
    z = [w - zc for w in z]
    kap0 = sum(v/w for v, w in zip(vel(z), z))/N
    kap = kap0
    mirrored = kap0.real > 0
    if mirrored:
        z = [mp.conj(w) for w in z]
        kap = -mp.conj(kap0)
    scale = (-2*mp.pi*kap.real)**(mp.mpf(1)/(alpha + 2))     # kappa scales as s^-(alpha+2) under z -> s z
    rot = mp.conj(z[0])/abs(z[0])
    z = [w*rot*scale for w in z]
    return z, G, kap0, mirrored, kap.imag/(-2*kap.real)


def alpha_full(z, G, t=None):
    full = [V.A(mp.nstr(z[0].real, 35))]
    for k in range(1, len(z)):
        full += [V.A(mp.nstr(z[k].real, 35)), V.A(mp.nstr(z[k].imag, 35))]
    full += [V.A(mp.nstr(g, 35)) for g in G[1:]]
    return full + ([V.A(mp.nstr(t, 35))] if t is not None else [])


T0 = time.time()
ARGS = sys.argv[1:]
if any(a not in ('--controls', '--no-controls') for a in ARGS):
    sys.exit('usage: python3 certify_collapses.py [--controls | --no-controls]   (the controls run by default)')
controls = '--no-controls' not in ARGS
print('Certified self-similar point-vortex collapses (python %s, python-flint %s, mpmath %s, numpy %s; Arb at %d bits)'
      % (sys.version.split()[0], flint.__version__, mp.__version__, np.__version__, V.PREC))
STARTS = {N: V.load_start(os.path.join(DATA, 'kkt_N%d.json' % N))[1] for N in (4, 5, 6)}
ALPHA4_STARTS = {}
for alpha in (1, 2):
    d = load('alpha%d-n4-start.json' % alpha)
    ALPHA4_STARTS[alpha] = alpha_start(d['minimum']['config'], alpha)

# ============================================================================ 1. self-test
print()
print('1. Self-test of the ball automatic differentiation against mpmath (non-rigorous guard against coding errors)')
XC.selftest(check, STARTS, [('N = 4, alpha = %d' % a, 4, a, [q.str(40, radius=False) for q in alpha_full(z, G, t)])
                            for a, (z, G, _, _, t) in sorted(ALPHA4_STARTS.items())])

# ============================================================================ 2. existence
print()
print('2. Existence: self-similar collapses of N = 4, 5, 6 vortices with P < sqrt(3)/2 (Krawczyk, rational chart)')
EXIST = {}
for N in (4, 5, 6):
    model = PL.EulerModel(N)
    vstar = [V.A(s) for s in STARTS[N]]
    chart = PL.CHART[N]
    fixed = [PL.rat(vstar[model.names.index(c)], 6) for c in chart]
    print('   N = %d: fixed %s' % (N, ', '.join('%s = %s' % (c, q) for c, q in zip(chart, fixed))))
    r = PL.existence(model, vstar, chart, fixed)
    check('N = %d: the %d real collapse equations have exactly one solution in the box of radius 1e-%s'
          % (N, 2*N, r.get('rmax')), r['ok'] and r.get('rmax') is not None,
          'Newton residual %s; at radius 1e-40 ||I - Y J(X)|| <= %s, ||Y F(x~)|| <= %s'
          % (r['newton_residual'].str(3, radius=False), r['contraction'].str(3, radius=False), r['step'].str(3, radius=False)))
    if not r['ok']:
        continue
    sc = r['side']
    bad = model.genuine(sc, below=False)
    check('N = %d: on the box every Gamma_j != 0, sum Gamma_j != 0, the z_j are distinct and nonzero, each w_j/conj(z_j)'
          ' contains 2P - i, and sum Gamma_j z_j, S, I contain 0' % N, not bad,
          'sum Gamma %s, min |z_j - z_k| >= %s, min |z_j| >= %s%s'
          % (sc['sum_Gamma'], sc['min_pair_distance_lower_bound'], sc['min_abs_z_lower_bound'],
             ('; failed: ' + ', '.join(bad)) if bad else ''))
    show('P in %s' % sc['P_decimal'])
    check('N = %d: P < sqrt(3)/2' % N, sc['P_below_sqrt3_over_2'])
    show('enclosures of the unknowns:')
    print_enclosures(r['enclosure'])
    EXIST[N] = r
    SUMMARY.append(('N = %d collapse at rational chart values, P' % N, sc['P_decimal']))

# ============================================================================ 3. strict local minima
print()
print('3. Strict local minima P_4, P_5, P_6 of P on the collapse set (Krawczyk on the Lagrange system, reduced Hessian)')
KKT = {}
for N in (4, 5, 6):
    model = PL.EulerModel(N)
    vstar = [V.A(s) for s in STARTS[N]]
    r = PL.kkt(model, vstar, list(range(3*N - 1)), PL.CHART[N])
    check('N = %d: the Lagrange system (%d unknowns: v and mu) has exactly one solution in the box of radius 1e-%s'
          % (N, r['unknowns'], r.get('rmax')), r['ok'] and r.get('rmax') is not None,
          'Newton residual %s; at radius 1e-40 ||I - Y J(X)|| <= %s'
          % (r['newton_residual'].str(3, radius=False), r['contraction'].str(3, radius=False)))
    if not r['ok']:
        continue
    tight = r['second_order'][0]
    check('N = %d: J_U invertible (chart %s) and every leading minor of the reduced Hessian positive: a strict local'
          ' minimum' % (N, ', '.join(PL.CHART[N])), tight['J_U_invertible'] and tight['PD'],
          'minors ' + ', '.join('[%.4g, %.4g]' % (float(x.lower()), float(x.upper())) for x in tight.get('minors', [])))
    eigs = tight.get('eigs', [])
    check('N = %d: eigenvalues of the reduced Hessian in an orthonormal tangent basis, each enclosure certified by an'
          ' inertia count' % N, bool(eigs) and all(ok for _, _, ok in eigs),
          '  '.join('[%s, %s]' % (lo.str(8, radius=False), hi.str(8, radius=False)) for lo, hi, _ in eigs))
    wide = [s for s in r['second_order'] if s['box'] == 'box']
    check('N = %d: the reduced Hessian is positive definite at every (v, mu) in the box of radius 1e-%s about the KKT point'
          % (N, wide[0]['k'] if wide else '?'), bool(wide) and wide[0]['PD'],
          ('minors ' + ', '.join('[%.4g, %.4g]' % (float(x.lower()), float(x.upper())) for x in wide[0]['minors'])) if wide else '')
    sc = r['side']
    bad = model.genuine(sc, below=False)
    check('N = %d: the side conditions of a genuine collapse hold on the KKT box' % N, not bad,
          'sum Gamma %s, min |z_j - z_k| >= %s, min |z_j| >= %s%s'
          % (sc['sum_Gamma'], sc['min_pair_distance_lower_bound'], sc['min_abs_z_lower_bound'],
             ('; failed: ' + ', '.join(bad)) if bad else ''))
    show('P_%d in %s' % (N, sc['P_decimal']))
    check('P_%d < sqrt(3)/2' % N, sc['P_below_sqrt3_over_2'])
    show('multipliers mu: ' + ', '.join(a.str(20, radius=True) for a in r['mu']))
    show('enclosures:')
    print_enclosures(r['enclosure'])
    KKT[N] = r
    SUMMARY.append(('P_%d, strict local minimum' % N, sc['P_decimal']))
    SUMMARY.append(('   tangent eigenvalues', '  '.join('[%s, %s]' % (lo.str(8, radius=False), hi.str(8, radius=False)) for lo, hi, _ in eigs)))

if 4 in EXIST and 4 in KKT:
    # negative controls: the same machinery must reject what is false
    model = PL.EulerModel(4)
    U = EXIST[4]['U']
    base = EXIST[4]['full']

    def fun_e(u, want_jac):
        Ts = model.eqs(PL.full_from(base, U, u), U)
        return [t.v for t in Ts], (V.jac_of(Ts) if want_jac else None)
    xt = [a.mid() for a in EXIST[4]['K']]
    xt[U.index(model.iP)] = (xt[U.index(model.iP)] + arb('1e-6')).mid()
    check('negative control: Krawczyk rejects the box of radius 1e-40 about the N = 4 existence point with P moved by 1e-6',
          not V.krawczyk(fun_e, xt, arb('1e-40'))[0])
    rneg = PL.kkt(model, [V.A(q) for q in STARTS[4]], list(range(11)), PL.CHART[4], ow=-1, radii_scan=False)
    check('negative control: for the objective -P the Lagrange system certifies the same point (multipliers -mu), and the'
          ' second-order test rejects it as a minimum of -P', rneg['ok'] and rneg['full'][10].overlaps(KKT[4]['full'][10])
          and not rneg['second_order'][0]['PD'],
          'leading minors ' + ', '.join('[%.4g, %.4g]' % (float(q.lower()), float(q.upper()))
                                         for q in rneg['second_order'][0].get('minors', [])))

# ============================================================================ 4. N = 4, alpha-winding normalization
print()
print('4. The N = 4 minimum in the normalization of the alpha-winding text, section "More than three vortices"'
      ' (Gamma_1 = 1 on the strong vortex, z_c = 0, kappa = -1 + i b, P = b/2)')
PAPER4 = None
if 4 in KKT:
    N = 4
    x, y, G, P = V.unpack_full(KKT[4]['full'], N)
    order = [1, 2, 0, 3]                       # the manuscript's vortices 1..4 (strong vortex first)
    s = order[0]
    pi = arb.pi()
    rr = (x[s]**2 + y[s]**2).sqrt()
    cr, ci = x[s]/rr, -y[s]/rr                 # conj(z_s)/|z_s|
    scl = 1/(2*pi*G[s]).sqrt()                 # Gamma -> Gamma/Gamma_s, z -> scl z: kappa = (-1 + 2iP)/(2 pi Gamma_s scl^2) = -1 + 2iP
    Gp = [G[i]/G[s] for i in order]
    zp = [((x[i]*cr - y[i]*ci)*scl, (x[i]*ci + y[i]*cr)*scl) for i in order]
    b = 2*P
    show('b   = %s' % b.str(45, radius=True))
    check('b = 1.5957935677597269615... as printed (every printed digit correct)', prefix_ok(b, '1.5957935677597269615'))
    check('P_4 = 0.79789678387986348076760587182... as printed (every printed digit correct)',
          prefix_ok(P, '0.79789678387986348076760587182'))
    paper_G = ['1', '0.1673914318538', '0.1041331880362', '-0.2272513003829']
    paper_z = [('0.0166495669172', '0'), ('-0.2191226402232', '-0.3290676220068'),
               ('-0.1579874300122', '-0.2864759934272'), ('-0.1605333843048', '-0.3736601672808')]
    agree = True
    for j in range(N):
        show('Gamma_%d = %s' % (j + 1, Gp[j].str(25, radius=True)))
        show('z_%d     = %s + i %s' % (j + 1, zp[j][0].str(25, radius=True), zp[j][1].str(25, radius=True)))
        agree &= rounded_ok(Gp[j], paper_G[j]) and rounded_ok(zp[j][0], paper_z[j][0]) and rounded_ok(zp[j][1], paper_z[j][1])
    check('the printed 13-digit Gamma and z agree with the certified enclosure to half a unit in the last digit', agree)
    vp = [zp[0][0].mid()]
    for j in range(1, N):
        vp += [zp[j][0].mid(), zp[j][1].mid()]
    vp += [g.mid() for g in Gp[1:]] + [b.mid()]
    model = PL.EulerModel(N, lam=(2*pi, 1))    # lam = 2 pi (b - i): kappa = -1 + i b; the last coordinate is b
    chart = ['x4', 'G3', 'G4']
    r = PL.kkt(model, vp, list(range(3*N - 1)), chart, ow=arb(1)/2)     # objective P = b/2
    check('in these coordinates (positions, circulations, b) the Lagrange system of min P has exactly one solution in'
          ' the box of radius 1e-%s' % r.get('rmax'), r['ok'] and r.get('rmax') is not None,
          '||I - Y J(X)|| <= %s' % r['contraction'].str(3, radius=False))
    if r['ok']:
        tight = r['second_order'][0]
        sc = r['side']
        check('   a strict local minimum (J_U invertible, reduced Hessian positive definite, genuine collapse on the box)',
              tight['J_U_invertible'] and tight['PD'] and not model.genuine(sc, below=True))
        check('   its P = b/2 is the P_4 of part 3', sc['P_ball'].overlaps(P), 'P in %s' % sc['P_decimal'])
        eigs = tight['eigs']
        expect = ['1.106', '6.289', '9.377']
        check('   the Hessian of the Lagrangian of P on the tangent space has eigenvalues 1.106, 6.289, 9.377 (as printed,'
              ' to the last digit)', len(eigs) == 3 and all(ok and lo > arb(e) - arb('0.0005') and hi < arb(e) + arb('0.0005')
                                                            for (lo, hi, ok), e in zip(eigs, expect)),
              '  '.join('[%s, %s]' % (lo.str(8, radius=False), hi.str(8, radius=False)) for lo, hi, _ in eigs))
        show('(for the objective b = 2P the multipliers and the Hessian of the Lagrangian double, and so do the eigenvalues)')
        PAPER4 = (r, b)
        SUMMARY.append(('N = 4, alpha-winding normalization, b', b.str(40, radius=True)))
        SUMMARY.append(('   tangent eigenvalues for P',
                        '  '.join('[%s, %s]' % (lo.str(8, radius=False), hi.str(8, radius=False)) for lo, hi, _ in eigs)))

# ============================================================================ 5. alpha-model four-vortex minima
print()
print('5. The four-vortex minima of the alpha-models quoted in the same section (alpha = 1, SQG, and alpha = 2):'
      ' strict local minima of P, with P free in the alpha-model equations')
ALPHA4 = {}
for alpha, printed, bound, chart in ((1, '0.5499151189', '2/3', ['x2', 'G2', 'G3']),
                                     (2, '0.4116738600', 'sqrt(5)/4', ['x3', 'G2', 'G4'])):
    z, G, kap0, mirrored, t = ALPHA4_STARTS[alpha]
    N = len(G)
    print('   alpha = %d: the stored binary64 minimum has kappa = %s under the alpha-model law: it %s'
          % (alpha, mp.nstr(kap0, 8), 'expands; its mirror image z -> conj(z) collapses and is certified' if mirrored
             else 'collapses'))
    model = AM.AlphaModel(N, alpha)
    r = PL.kkt(model, alpha_full(z, G, t), list(range(3*N - 1)), chart, ow=1 if t > 0 else -1)
    check('alpha = %d, N = 4: the Lagrange system of min P (%d unknowns) has exactly one solution in the box of radius 1e-%s'
          % (alpha, r['unknowns'], r.get('rmax')), r['ok'] and r.get('rmax') is not None,
          'Newton residual %s; at radius 1e-40 ||I - Y J(X)|| <= %s'
          % (r['newton_residual'].str(3, radius=False), r['contraction'].str(3, radius=False)))
    if not r['ok']:
        continue
    tight = r['second_order'][0]
    check('alpha = %d: J_U invertible (chart %s) and every leading minor of the reduced Hessian positive: a strict local'
          ' minimum' % (alpha, ', '.join(chart)), tight['J_U_invertible'] and tight['PD'],
          'minors ' + ', '.join('[%.4g, %.4g]' % (float(q.lower()), float(q.upper())) for q in tight.get('minors', [])))
    eigs = tight.get('eigs', [])
    check('alpha = %d: eigenvalues of the reduced Hessian in an orthonormal tangent basis, each certified by an inertia count'
          % alpha, bool(eigs) and all(ok for _, _, ok in eigs),
          '  '.join('[%s, %s]' % (lo.str(8, radius=False), hi.str(8, radius=False)) for lo, hi, _ in eigs))
    wide = [q for q in r['second_order'] if q['box'] == 'box']
    check('alpha = %d: the reduced Hessian is positive definite at every (v, mu) in the box of radius 1e-%s about the KKT'
          ' point' % (alpha, wide[0]['k'] if wide else '?'), bool(wide) and wide[0]['PD'])
    sc = r['side']
    bad = model.genuine(sc, below=False)
    check('alpha = %d: on the box every Gamma_j != 0, sum Gamma_j != 0, the z_j distinct and nonzero, each 2 pi v_j/z_j'
          ' contains 2 pi kappa = -1 + 2 i P, and sum Gamma_j z_j, I, E = sum Gamma_j Gamma_k r_jk^-alpha contain 0' % alpha,
          not bad, 'sum Gamma %s, min |z_j - z_k| >= %s, min |z_j| >= %s%s'
          % (sc['sum_Gamma'], sc['min_pair_distance_lower_bound'], sc['min_abs_z_lower_bound'],
             ('; failed: ' + ', '.join(bad)) if bad else ''))
    Pb = abs(r['full'][model.iP])
    show('P_4 in %s' % PL.dec(Pb, 50))
    check('alpha = %d: P_4 = %s... as printed (every printed digit correct)' % (alpha, printed), prefix_ok(Pb, printed))
    check('alpha = %d: P_4 < %s, the three-vortex bound sqrt(3 + alpha)/(2 + alpha)' % (alpha, bound),
          sc['P_below_three_vortex_bound'])
    Gs = [arb(1)] + list(r['full'][2*N - 1:3*N - 2])
    js = max(range(N), key=lambda j: abs(Gs[j].mid()))
    rel = [Gs[j]/Gs[js] for j in range(N)]
    show('circulations relative to the strongest: ' + ', '.join(q.str(10, radius=False) for q in rel))
    check('alpha = %d: one strong and three weak vortices (|Gamma_j| < |Gamma_strong|/4 for the other three)' % alpha,
          all(abs(rel[j]) < arb(1)/4 for j in range(N) if j != js))
    show('multipliers mu: ' + ', '.join(q.str(20, radius=True) for q in r['mu']))
    show('enclosures (P is the signed winding t, 2 pi kappa = -1 + 2 i t):')
    print_enclosures(r['enclosure'])
    ALPHA4[alpha] = (r['full'], Pb)
    SUMMARY.append(('alpha = %d, P_4, strict local minimum' % alpha, PL.dec(Pb, 50)))
    SUMMARY.append(('   tangent eigenvalues', '  '.join('[%s, %s]' % (lo.str(8, radius=False), hi.str(8, radius=False))
                                                      for lo, hi, _ in eigs)))

# ============================================================================ 6. alpha = 2, N = 11
print()
print('6. alpha = 2, N = 11: a self-similar collapse without rotation (kappa real, P = 0)')
d = load('vortex-grow-a2-n11-s0-c12.json')
alpha = int(d['alpha'])
z, G, kap0, mirrored, _ = alpha_start(d['minima'][0]['config'], alpha)
N = len(G)
show('the stored binary64 configuration has kappa = %s under the alpha-model law: it %s'
     % (mp.nstr(kap0, 8), 'EXPANDS' if mirrored else 'collapses'))
if mirrored:
    show('its mirror image z -> conj(z) has kappa -> -conj(kappa) and collapses; that is what is certified')
c = arb(-1)
nm = AM.names(N)
n = 3*N - 2
m = 2*N
x = alpha_full(z, G)
allfree = list(range(n))
for it in range(40):                             # minimum-norm Newton on the 22 x 31 system (non-rigorous)
    Ts = AM.E_T(x, allfree, N, alpha, c)
    J = V.mid_mat(V.jac_of(Ts))
    res = max(abs(t.v.mid()) for t in Ts)
    if res < arb(10)**-92:
        break
    lamv = (J*J.transpose()).solve(arb_mat(m, 1, [t.v.mid() for t in Ts]))
    dx = J.transpose()*lamv
    x = [(x[i] - dx[i, 0]).mid() for i in range(n)]
Jf = np.array([[float(J[i, j]) for j in range(n)] for i in range(m)])
S = [nm.index('G%d' % k) for k in range(2, N)]   # chart: Gamma_2..Gamma_10 (chosen once by pivoted QR in binary64)
U = [i for i in range(n) if i not in S]
show('minimum-norm Newton: residual %s; singular values of the %d x %d Jacobian from %.3g to %.3g; smallest of J_U %.3g'
     % (res.str(3, radius=False), m, n, np.linalg.svd(Jf, compute_uv=False)[0], np.linalg.svd(Jf, compute_uv=False)[-1],
        np.linalg.svd(Jf[:, U], compute_uv=False)[-1]))
fixed = [PL.rat(x[i], 8) for i in S]
base = list(x)
for i, q in zip(S, fixed):
    base[i] = arb(q)
show('fixed: ' + ', '.join('%s = %s' % (nm[i], q) for i, q in zip(S, fixed)))


class _A2:
    names = nm

    @staticmethod
    def eqs(full, free, order=1):
        return AM.E_T(full, free, N, alpha, c, order=order)


r = PL.solve_square(_A2, base, U, [x[i] for i in U])
check('alpha = 2, N = 11: the 22 real equations 2 pi v_j = -z_j (kappa = -1/(2 pi), real) have exactly one solution'
      ' in the box of radius 1e-%s in the 22 unknowns (21 coordinates and Gamma_11)' % r.get('rmax'),
      r['ok'] and r.get('rmax') is not None,
      'Newton residual %s; at radius 1e-40 ||I - Y J(X)|| <= %s'
      % (r['newton_residual'].str(3, radius=False), r['contraction'].str(3, radius=False)))
A2N11 = None
if r['ok']:
    sc = AM.side_checks(N, r['full'], alpha, c)
    bad = [k for k in AM.GENUINE if not sc[k]]
    check('alpha = 2, N = 11: on the box every Gamma_j != 0, sum Gamma_j != 0, the z_j distinct and nonzero, each'
          ' 2 pi v_j/z_j contains -1, and sum Gamma_j z_j, I, E = sum Gamma_j Gamma_k r_jk^-2 contain 0', not bad,
          'sum Gamma %s, min |z_j - z_k| >= %s, %s <= |z_j| <= %s%s'
          % (sc['sum_Gamma'], sc['min_pair_distance_lower_bound'], sc['min_abs_z_lower_bound'], sc['max_abs_z_upper_bound'],
             ('; failed: ' + ', '.join(bad)) if bad else ''))
    show('so every vortex runs straight into 0: |b|^4 = 1 - 2t/pi, arg b constant, collapse at t_c = pi/2; the 22 x 22'
         ' Jacobian is invertible, so by the implicit function theorem these collapses form a 9-parameter family'
         ' (modulo symmetries) near this point')
    show('enclosures of the unknowns:')
    print_enclosures([(nm[i], r['K'][p]) for p, i in enumerate(U)])
    A2N11 = r['full']
    SUMMARY.append(('alpha = 2, N = 11, kappa real', 'non-rotating collapse certified; Gamma_11 in %s'
                    % r['K'][U.index(nm.index('G11'))].str(20, radius=True)))

# ============================================================================ 7. controls
print()
print('7. Controls on three vortices, where P > sqrt(3)/2 is a theorem ((A), (B) are proofs; (C), (D), (E) are numerical)')
if controls:
    import certify_controls
    for k_, v_ in certify_controls.run(check, log=print).items():
        SUMMARY.append(('N = 3 control: %s' % k_, v_.str(40, radius=True)))
else:
    show('skipped (--no-controls)')

# ============================================================================ 8. independent re-check
print()
print('8. Independent re-check of every certified point with separate Biot-Savart code at 80 digits (non-rigorous)')
for N in (4, 5, 6):
    if N in EXIST:
        XC.independent(check, 'existence, N = %d' % N, EXIST[N]['full'], N, 'euler', P_cert=EXIST[N]['side']['P_ball'])
    if N in KKT:
        XC.independent(check, 'minimum P_%d' % N, KKT[N]['full'], N, 'euler', P_cert=KKT[N]['side']['P_ball'])
if PAPER4 is not None:
    mp.mp.dps = 80
    zz, GG = XC.config_of(PAPER4[0]['full'], 4)
    ks, zc = XC.kappas(zz, GG, 'euler')
    bm = XC._m(PAPER4[1])
    dev = max(abs(q - mp.mpc(-1, bm)) for q in ks)
    check('alpha-winding normalization, N = 4: every kappa_j = -1 + i b', dev < mp.mpf('1e-60') and abs(zc) < mp.mpf('1e-60'),
          'max |kappa_j - (-1 + i b)| = %s, |z_c| = %s' % (mp.nstr(dev, 2), mp.nstr(abs(zc), 2)))
for alpha, (full, Pb) in sorted(ALPHA4.items()):
    XC.independent(check, 'alpha = %d, minimum P_4' % alpha, full, 4, 'alpha', alpha=alpha, P_cert=Pb)
if A2N11 is not None:
    XC.independent(check, 'alpha = 2, N = 11', A2N11, 11, 'alpha', alpha=2, rotating=False)

# ============================================================================ summary
print()
print('Summary of the certified enclosures')
for k_, v_ in SUMMARY:
    print('  %-52s %s' % (k_, v_))
print()
print('%d checks, run time %.0f s%s' % (COUNT[0], time.time() - T0, '' if controls else ' (controls skipped)'))
if FAILED:
    print('%d check(s) FAILED:' % len(FAILED))
    for f in FAILED:
        print('  ' + f)
    sys.exit(1)
print('all checks passed')
