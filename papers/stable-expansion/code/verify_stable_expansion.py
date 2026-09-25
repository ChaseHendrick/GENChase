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
"""Computer-assisted proof of the theorem of paper/stable-expansion.tex: a self-similarly expanding configuration of
four point vortices, and one of five, that are linearly stable modulo their symmetries.

Euler law conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k). A self-similar motion about 0 has
dz_j/dt = kappa z_j. In the gauge of certify_ball_ad.py (Gamma_1 = 1, z_1 real, w_j = lam conj(z_j) with
lam = 2P - i) a solution collapses with 2 pi kappa = -1 + i b, b = 2P. In similarity variables z = rho(t) zeta,
d tau = rho^-2 dt, the collapse is a zero of E(zeta) = 2 pi V(zeta) + (1 - i b) zeta, whose real 2N x 2N Jacobian is
    DE = [[A_r + I, A_i + b I], [A_i - b I, -A_r + I]],
    A_jk = i Gamma_k/conj(z_j - z_k)^2 (k != j),  A_jj = -sum_{k != j} A_jk,
acting on (Re dzeta, Im dzeta). Negating every circulation reverses time: the same shape then expands, and the
Jacobian of its similarity dynamics is -DE. A mode with eigenvalue k of DE therefore decays in the expansion like
(size)^(-k). Lemma 1 of the paper: the spectrum of DE contains 0, 0, 2, 2, 1 + i b and 1 - i b (rotation, the
one-parameter family at fixed circulations, scaling and its partner, translations), and the rest comes in pairs
k, 2 - k. For N = 4 the remaining pair is k, 2 - k with c = k(2 - k) = 3 + 3 b^2 - tr(A conj A), so every exponent
beyond the symmetric ones has positive real part iff c > 0; c > 1 means the pair is 1 +- i sqrt(c - 1).

Sections:
  1. Existence: the four-vortex collapse with x4 = 8/25, Gamma_2 = 5/2, Gamma_3 = 1/9 fixed, by Newton and the
     Krawczyk test in ball arithmetic (FLINT/Arb through python-flint); its side conditions; Gamma_4 = -4/5.
  2. Lemma 1 on the certified box: the invariant vectors of the symmetries (exact identities, checked to contain 0),
     the tangent v of the family from the implicit function theorem (DE v = b' i zeta, v independent of i zeta),
     b != 0, and consistency of the trace with the sum of the known exponents.
  3. The stability number c: its enclosure, c > 1, and the pair 1 +- i omega; a second enclosure of c from
     tr((DE - I)^2).
  3b. Five vortices (x2 = 3/5, Gamma = (1, -3/7, -7/8, 9/7, 47/35)): existence, Lemma 1, and the four remaining
     exponents from u = (k - 1)^2, the roots of u^2 - s u + p with s and p from tr((DE - I)^2) and tr((DE - I)^4).
  4. Controls: a four-vortex collapse whose reversal is unstable (c < 0, certified); a three-vortex collapse, where
     2N - 6 = 0 and the trace must equal that of the six symmetric exponents.
  5. Illustration in binary64 (not part of the proof): the eigenvalues at the midpoint, and direct integration of
     the expanding configuration, perturbed and not, and of the unstable control.

Needs python-flint, numpy and scipy (code/requirements.txt). Run: python3 code/verify_stable_expansion.py. Prints
every check and exits with status 1 if any fails; its output is data/verify-stable-expansion.txt.
"""
import json
import os
import sys

import numpy as np
from flint import arb, acb, fmpq, arb_mat
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import certify_ball_ad as V  # noqa: E402
import certify_pipeline as CP  # noqa: E402

DATA = os.path.join(os.path.dirname(HERE), 'data')
OUT, FAILED, NCHK = [], [], [0]


def say(s=''):
    print(s)
    OUT.append(s)


def check(name, ok, detail=''):
    NCHK[0] += 1
    say(('OK    ' if ok else 'FAIL  ') + name + (('   [' + str(detail) + ']') if detail else ''))
    if not ok:
        FAILED.append(name)


def load(name):
    return json.load(open(os.path.join(DATA, name)))


def vstar_of(cfg):
    z = [complex(*p) for p in cfg['z']]
    v = [arb(z[0].real)]
    for k in range(1, len(z)):
        v += [arb(z[k].real), arb(z[k].imag)]
    return v + [arb(g) for g in cfg['G'][1:]] + [arb(cfg['P'])]


def certify(cfg, chart, fixed):
    N = len(cfg['z'])
    model = CP.EulerModel(N)
    r = CP.existence(model, vstar_of(cfg), chart, fixed)
    return model, r


def balls(full, N, names):
    x, y, G, P = V.unpack_full(full, N)
    z = [acb(x[j], y[j]) for j in range(N)]
    return z, [arb(g) for g in G], P


def A_mat(z, G):
    N = len(z)
    A = [[acb(0)]*N for _ in range(N)]
    for j in range(N):
        for k in range(N):
            if k != j:
                d = (z[j] - z[k]).conjugate()
                A[j][k] = acb(0, 1)*G[k]/(d*d)
        A[j][j] = -sum((A[j][k] for k in range(N) if k != j), acb(0))
    return A


def DE_mat(z, G, b):
    """Real 2N x 2N Jacobian of E at zeta, as a list of lists of arb."""
    N = len(z)
    A = A_mat(z, G)
    M = [[arb(0)]*(2*N) for _ in range(2*N)]
    for j in range(N):
        for k in range(N):
            ar, ai = A[j][k].real, A[j][k].imag
            M[j][k] = ar + (1 if j == k else 0)
            M[j][N + k] = ai + (b if j == k else 0)
            M[N + j][k] = ai - (b if j == k else 0)
            M[N + j][N + k] = -ar + (1 if j == k else 0)
    return M


def matvec(M, v):
    return [sum((M[i][j]*v[j] for j in range(len(v))), arb(0)) for i in range(len(M))]


def contains0(vec):
    return all(x.contains(0) for x in vec)


def tr_power(M, p):
    n = len(M)
    P_ = [row[:] for row in M]
    for _ in range(p - 1):
        P_ = [[sum((P_[i][k]*M[k][j] for k in range(n)), arb(0)) for j in range(n)] for i in range(n)]
    return sum((P_[i][i] for i in range(n)), arb(0))


def as_real(vec_c):
    return [c.real for c in vec_c] + [c.imag for c in vec_c]


# ------------------------------------------------------------------------------------------------ 1. existence
say('1. The four-vortex collapse (existence, Krawczyk)')
N = 4
cfg = load('start-four.json')
model, r = certify(cfg, ['x4', 'G2', 'G3'], [fmpq(8, 25), fmpq(5, 2), fmpq(1, 9)])
check('Krawczyk: a unique zero in the box, with x4 = 8/25, Gamma_2 = 5/2, Gamma_3 = 1/9 fixed',
      r['ok'], 'contraction %s, unique within 1e-%s' % (r.get('contraction', arb(0)).str(3), r.get('rmax')))
if not r['ok']:
    sys.exit(1)
full = r['full']
names = model.names
for nm, v in r['enclosure']:
    say('      %-3s %s' % (nm, v.str(15, radius=True)))
sc = r['side']
for key in CP.GENUINE:
    check('side condition ' + key, bool(sc[key]))
G4 = full[names.index('G4')]
check('Gamma_4 = -4/5 (forced by sum_{j<k} Gamma_j Gamma_k = 0 with Gamma = (1, 5/2, 1/9, Gamma_4))',
      G4.contains(arb(-4)/5) and G4.rad() < 1e-30, G4.str(20, radius=True))
z, G, P = balls(full, N, names)
b = 2*P
check('P > sqrt(3)/2 and b = 2P != 0 (so 1 +- i b differs from 0 and 2)', bool(P > CP.SQRT3_2), P.str(25, radius=True))

# ------------------------------------------------------------------------------------------------ 2. Lemma 1
say('\n2. Lemma 1 on the certified box')
M = DE_mat(z, G, b)
zeta = as_real(z)
izeta = as_real([acb(0, 1)*c for c in z])
one = [arb(1)]*N + [arb(0)]*N
ione = [arb(0)]*N + [arb(1)]*N
check('rotation: DE (i zeta) contains 0 (eigenvalue 0)', contains0(matvec(M, izeta)))
Mz = matvec(M, zeta)
target = [2*(zeta[i] + b*izeta[i]*(-1)) for i in range(2*N)]     # 2 (1 - i b) zeta = 2 zeta - 2 b (i zeta)
check('scaling: DE zeta - 2 (1 - i b) zeta contains 0 (with the rotation, eigenvalues 2 and 0)',
      contains0([Mz[i] - target[i] for i in range(2*N)]))
M1, Mi1 = matvec(M, one), matvec(M, ione)
check('translation: DE 1 = 1 - b (i 1) and DE (i 1) = (i 1) + b 1 (eigenvalues 1 +- i b)',
      contains0([M1[i] - (one[i] - b*ione[i]) for i in range(2*N)]) and contains0([Mi1[i] - (ione[i] + b*one[i]) for i in range(2*N)]))
# the family at fixed circulations: tangent from J_U v_U = -J_x4 (implicit function theorem on the box)
U = r['U']
ix4 = names.index('x4')
Ts = model.eqs(full, U + [ix4], order=1)
J = V.jac_of(Ts)
JU = arb_mat([[J[i, j] for j in range(len(U))] for i in range(2*N)])
Jx = arb_mat([[-J[i, len(U)]] for i in range(2*N)])
vU = JU.solve(Jx)
dv = {names[U[p]]: vU[p, 0] for p in range(len(U))}
dv['x4'] = arb(1)
dx = [dv['x1']] + [dv['x%d' % k] for k in range(2, N + 1)]
dy = [arb(0)] + [dv['y%d' % k] for k in range(2, N + 1)]
vfam = dx + dy
check('the family keeps the circulations: d Gamma_4/d x4 contains 0', dv['G4'].contains(0), dv['G4'].str(5, radius=True))
db = 2*dv['P']
Mv = matvec(M, vfam)
check('the family tangent v satisfies DE v = b\' (i zeta) (so DE^2 v = 0: a second vector at eigenvalue 0)',
      contains0([Mv[i] - db*izeta[i] for i in range(2*N)]), 'b\' = %s' % db.str(8, radius=True))
check('v is independent of i zeta: Im v_1 = 0 while Im(i zeta_1) = x_1 != 0, and v has x4-component 1',
      bool(full[names.index('x1')] != 0) and not full[names.index('x1')].contains(0))
trM = sum((M[i][i] for i in range(2*N)), arb(0))
check('trace consistency: tr DE = 2N = 8 = 0 + 0 + 2 + 2 + (1 + i b) + (1 - i b) + k + (2 - k)',
      trM.contains(8), trM.str(10, radius=True))

# ------------------------------------------------------------------------------------------------ 3. stability number
say('\n3. The stability number c = k(2 - k) of the remaining pair')
A = A_mat(z, G)
tr = sum((A[j][k]*A[k][j].conjugate() for j in range(N) for k in range(N)), acb(0))
c = 3 + 3*b*b - tr.real
check('Im tr(A conj A) contains 0 (the trace of DE^2 is real)', tr.imag.contains(0))
check('c = 3 + 3 b^2 - tr(A conj A) > 1, so the pair is 1 +- i omega with omega = sqrt(c - 1) real',
      bool(c > 1), c.str(15, radius=True))
omega = (c - 1).sqrt()
say('      omega = %s' % omega.str(15, radius=True))
B = [[M[i][j] - (1 if i == j else 0) for j in range(2*N)] for i in range(2*N)]
t2 = tr_power(B, 2)
u = (t2 - 4 + 2*b*b)/2          # (k - 1)^2 for the remaining pair
check('second enclosure: (k - 1)^2 = (tr (DE - I)^2 - 4 + 2 b^2)/2 = 1 - c', (u - (1 - c)).contains(0), u.str(12, radius=True))
c_float = float(c.mid())

# ------------------------------------------------------------------------------------------------ 3b. five vortices
say('\n3b. Five vortices: existence, Lemma 1 and the four remaining exponents')
cfg5 = load('start-five.json')
m5, r5 = certify(cfg5, ['x2', 'G2', 'G3', 'G4'], [fmpq(3, 5), fmpq(-3, 7), fmpq(-7, 8), fmpq(9, 7)])
check('Krawczyk: a unique zero in the box, with x2 = 3/5, Gamma_2 = -3/7, Gamma_3 = -7/8, Gamma_4 = 9/7 fixed',
      r5['ok'], 'unique within 1e-%s' % r5.get('rmax'))
if r5['ok']:
    for key in CP.GENUINE:
        check('five vortices: side condition ' + key, bool(r5['side'][key]))
    f5 = r5['full']
    n5 = m5.names
    G5 = f5[n5.index('G5')]
    check('five vortices: Gamma_5 = 47/35 (forced by sum_{j<k} Gamma_j Gamma_k = 0)', G5.contains(arb(47)/35), G5.str(20, radius=True))
    z5, Gb5, P5 = balls(f5, 5, n5)
    b5 = 2*P5
    check('five vortices: P > 0, so b != 0', bool(P5 > 0), P5.str(25, radius=True))
    M5 = DE_mat(z5, Gb5, b5)
    zeta5 = as_real(z5)
    izeta5 = as_real([acb(0, 1)*c_ for c_ in z5])
    one5, ione5 = [arb(1)]*5 + [arb(0)]*5, [arb(0)]*5 + [arb(1)]*5
    Mz5, M15, Mi15 = matvec(M5, zeta5), matvec(M5, one5), matvec(M5, ione5)
    check('five vortices: rotation, scaling and translation vectors as in Lemma 1 (exact identities contain 0)',
          contains0(matvec(M5, izeta5)) and contains0([Mz5[i] - 2*(zeta5[i] - b5*izeta5[i]) for i in range(10)])
          and contains0([M15[i] - (one5[i] - b5*ione5[i]) for i in range(10)])
          and contains0([Mi15[i] - (ione5[i] + b5*one5[i]) for i in range(10)]))
    U5 = r5['U']
    ix2 = n5.index('x2')
    J5 = V.jac_of(m5.eqs(f5, U5 + [ix2], order=1))
    vU5 = arb_mat([[J5[i, j] for j in range(len(U5))] for i in range(10)]).solve(arb_mat([[-J5[i, len(U5)]] for i in range(10)]))
    d5 = {n5[U5[q]]: vU5[q, 0] for q in range(len(U5))}
    d5['x2'] = arb(1)
    v5 = [d5['x1']] + [d5['x%d' % k] for k in range(2, 6)] + [arb(0)] + [d5['y%d' % k] for k in range(2, 6)]
    Mv5 = matvec(M5, v5)
    check('five vortices: the family tangent keeps the circulations and satisfies DE v = b\' (i zeta), v independent of i zeta',
          d5['G5'].contains(0) and contains0([Mv5[i] - 2*d5['P']*izeta5[i] for i in range(10)])
          and not f5[n5.index('x1')].contains(0))
    B5 = [[M5[i][j] - (1 if i == j else 0) for j in range(10)] for i in range(10)]
    t2, t4 = tr_power(B5, 2), tr_power(B5, 4)
    s5 = (t2 - 4 + 2*b5*b5)/2                 # u1 + u2, u = (k - 1)^2 over the two remaining pairs
    q5 = (t4 - 4 - 2*b5**4)/2                 # u1^2 + u2^2
    p5 = (s5*s5 - q5)/2
    disc = s5*s5 - 4*p5
    check('five vortices: the discriminant of u^2 - s u + p is positive, so u1 < u2 are real', bool(disc > 0), disc.str(10, radius=True))
    u1, u2 = (s5 - disc.sqrt())/2, (s5 + disc.sqrt())/2
    check('five vortices: u2 < 0 < 1, so the four remaining exponents are 1 +- i sqrt(-u1) and 1 +- i sqrt(-u2): '
          'real part 1', bool(u2 < 0), 'u1 = %s, u2 = %s' % (u1.str(10, radius=True), u2.str(10, radius=True)))
    say('      exponents 1 +- i %s and 1 +- i %s' % ((-u1).sqrt().str(10, radius=True), (-u2).sqrt().str(10, radius=True)))

# ------------------------------------------------------------------------------------------------ 4. controls
say('\n4. Controls')
ctl = load('starts-controls.json')
cu = ctl['unstable4']
G2q = fmpq(*[int(t) for t in ('%.6f' % cu['G'][1]).replace('.', '').lstrip('-').split()][:1], 1) if False else None
g2 = fmpq(round(cu['G'][1]*1000), 1000)
g3 = fmpq(round(cu['G'][2]*1000), 1000)
x4 = fmpq(round(cu['z'][3][0]*1000), 1000)
m2, r2 = certify(cu, ['x4', 'G2', 'G3'], [x4, g2, g3])
check('unstable control: Krawczyk certifies a four-vortex collapse with x4 = %s, Gamma_2 = %s, Gamma_3 = %s' % (x4, g2, g3), r2['ok'])
if r2['ok']:
    z2, Gc2, P2 = balls(r2['full'], 4, m2.names)
    A2 = A_mat(z2, Gc2)
    tr2 = sum((A2[j][k]*A2[k][j].conjugate() for j in range(4) for k in range(4)), acb(0))
    c2 = 3 + 12*P2*P2 - tr2.real
    check('unstable control: c < 0, so a real pair k < 0 < 2 < 2 - k and the reversed expansion is unstable',
          bool(c2 < 0), c2.str(10, radius=True))
c3 = ctl['three']
m3, r3 = certify(c3, ['G2', 'x2'], [fmpq(round(c3['G'][1]*1000), 1000), fmpq(round(c3['z'][1][0]*1000), 1000)])
check('three-vortex control: Krawczyk certifies a collapse', r3['ok'])
if r3['ok']:
    z3, G3c, P3 = balls(r3['full'], 3, m3.names)
    M3 = DE_mat(z3, G3c, 2*P3)
    B3 = [[M3[i][j] - (1 if i == j else 0) for j in range(6)] for i in range(6)]
    t23 = tr_power(B3, 2)
    check('three-vortex control: 2N - 6 = 0, and tr (DE - I)^2 = 4 - 2 b^2, the six symmetric exponents alone',
          (t23 - 4 + 8*P3*P3).contains(0), (t23 - 4 + 8*P3*P3).str(5, radius=True))

# ------------------------------------------------------------------------------------------------ 5. illustration
say('\n5. Illustration in binary64 (not part of the proof)')
zf = np.array([complex(float(q.real.mid()), float(q.imag.mid())) for q in z])
Gf = np.array([float(g.mid()) for g in G])
bf = float(b.mid())
Mf = np.array([[float(x.mid()) for x in row] for row in M])
ev = np.sort_complex(np.linalg.eigvals(Mf))
say('      eigenvalues of DE: ' + ', '.join('%.6f%+.6fi' % (e.real, e.imag) for e in ev))
known = [0, 0, 2, 2, 1 + 1j*bf, 1 - 1j*bf, 1 + 1j*np.sqrt(c_float - 1), 1 - 1j*np.sqrt(c_float - 1)]
# The double eigenvalues 0 and 2 are defective (Lemma 1: a Jordan block from the family), and rounding splits a
# defective double eigenvalue by about sqrt(machine epsilon) ~ 1e-8, so the tolerance is 1e-6, not 1e-8.
dev = max(abs(e - kv) for e, kv in zip(sorted(ev, key=lambda e: (round(e.real, 3), e.imag)),
                                        sorted(known, key=lambda e: (round(complex(e).real, 3), complex(e).imag))))
check('binary64: the eigenvalues match {0, 0, 2, 2, 1 +- i b, 1 +- i omega} one to one within 1e-6 '
      '(defective double eigenvalues split by about 1e-8)', dev < 1e-6, '%.1e' % dev)


def rhs_of(Gs):
    def rhs(t, y):
        n = len(Gs)
        q = y[:n] + 1j*y[n:]
        d = q[:, None] - q[None, :]
        np.fill_diagonal(d, 1)
        v = (1j/(2*np.pi))*(Gs[None, :]*d/np.abs(d)**2)
        np.fill_diagonal(v, 0)
        v = v.sum(1)
        return np.concatenate([v.real, v.imag])
    return rhs


def shape_dev(q, ref, Gs):
    q = q - (Gs*q).sum()/Gs.sum()
    ref = ref - (Gs*ref).sum()/Gs.sum()
    a = np.vdot(ref, q)/np.vdot(ref, ref)
    return np.linalg.norm(q - a*ref)/np.linalg.norm(q), abs(a)


def run(zs, Gs, eps, seed, tmax):
    rng = np.random.default_rng(seed)
    q0 = zs + eps*(rng.normal(size=len(zs)) + 1j*rng.normal(size=len(zs)))
    ts = np.geomspace(1e-2, tmax, 8)
    s = solve_ivp(rhs_of(Gs), (0, tmax), np.concatenate([q0.real, q0.imag]), t_eval=ts, method='DOP853',
                  rtol=1e-12, atol=1e-14)
    return [(s.t[k],) + shape_dev(s.y[:len(zs), k] + 1j*s.y[len(zs):, k], zs, Gs) for k in range(len(s.t))]


rows = run(zf, -Gf, 0.0, 0, 1e5)
say('      expanding (circulations negated), unperturbed: ' + '; '.join('size x%.3g dev %.1e' % (r_[2], r_[1]) for r_ in rows[::2]))
check('binary64: unperturbed expansion keeps its shape to 1e-10 while it grows over 100-fold',
      max(r_[1] for r_ in rows) < 1e-10 and rows[-1][2] > 100)
rows = run(zf, -Gf, 1e-5, 3, 1e5)
say('      expanding, perturbed 1e-5: ' + '; '.join('size x%.3g dev %.1e' % (r_[2], r_[1]) for r_ in rows[::2]))
check('binary64: a 1e-5 perturbation stays below 1e-3 while the size grows 56-fold (it settles on a nearby '
      'member of the family, a neutral direction, instead of growing)', max(r_[1] for r_ in rows) < 1e-3)
if r2['ok']:
    zu = np.array([complex(float(q.real.mid()), float(q.imag.mid())) for q in z2])
    Gu = np.array([float(g.mid()) for g in Gc2])
    rows = run(zu, -Gu, 1e-8, 3, 1e3)
    say('      unstable control expanding, perturbed 1e-8: ' + '; '.join('size x%.3g dev %.1e' % (r_[2], r_[1]) for r_ in rows[::2]))
    check('binary64: in the unstable control a 1e-8 perturbation grows by at least 100 while the size grows',
          max(r_[1] for r_ in rows) > 1e-6)

say('\n%d checks, %d failed' % (NCHK[0], len(FAILED)))
with open(os.path.join(DATA, 'verify-stable-expansion.txt'), 'w') as fh:
    fh.write('\n'.join(OUT) + '\n')
sys.exit(1 if FAILED else 0)
