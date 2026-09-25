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
"""Lemma 1, Theorem 3 and Corollary 3 of the manuscript (paper/collapse-without-rotation.tex): translating clusters
of every size, one weak cluster beside a strong vortex, and the sharpness of sqrt(3)/2 for every number of weak
vortices.

A translating cluster: circulations g_k (nonzero, zero sum) at zeta_k with w_k = sum_{l != k} g_l/(zeta_k - zeta_l) = 1
for every k; nondegenerate when the complex Jacobian of (w_1, ..., w_{m-1}) on sum zeta = 0 is invertible. Its
function R(z) = sum_k g_k/(z - zeta_k) - 1 vanishes at the stagnation points of the frame moving with it.

Sections:
  1. EXACT (sympy): the starting clusters of Lemma 1. The pair g = (1, -1) at (-1/2, 1/2) and the triangle
     g = (1, 1, -2) at (omega, omega^2, 1) translate with w = 1 and are nondegenerate; R has the simple zeros
     +- i sqrt3/2, and for the triangle the numerator of R is -(z^3 + 3z + 2), with discriminant -216, and does not
     vanish at the cube roots of unity.
  2. NUMERICAL (binary64): the induction step of Lemma 1, run from the triangle to m = 5, 7, 9, 11, 13, 15: two vortices
     +-eps are placed at two simple zeros of R and eps is continued to 0.1; each result translates, is
     nondegenerate, and has only simple zeros of R. Illustration, not part of the proof.
  3. NUMERICAL (40 digits): the family of Theorem 3 at y0 = sqrt3/2 for each of these clusters, at
     gamma = 1e-2 .. 1e-5: Newton's method on the regularized system, then the original Biot-Savart velocities of all
     m + 1 vortices checked against kappa (z - z_c); Re kappa < 0 (collapse); P - sqrt3/2 = O(gamma), with
     (P - sqrt3/2)/gamma converging (its change falls about tenfold per decade of gamma).
  4. Negative controls: the simplicity test finds a double zero; a perturbed cluster does not translate; the family
     at y0 = 1 tends to P(0) = 7/8, not sqrt3/2; a pair of equal signs does not translate.

Needs numpy, sympy and mpmath (code/requirements.txt). Run: python3 code/verify_sharpness_all_n.py. Prints every
check and exits with status 1 if any fails; its output is data/verify-sharpness-all-n.txt. About a minute.
"""
import os
import sys
import warnings

import mpmath as mp
import numpy as np
import sympy as sp

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), 'data')
OUT, FAILED, N = [], [], [0]
warnings.filterwarnings('ignore')


def say(s=''):
    print(s)
    OUT.append(s)


def check(name, ok, detail=''):
    N[0] += 1
    say(('OK    ' if ok else 'FAIL  ') + name + (('   [' + str(detail) + ']') if detail else ''))
    if not ok:
        FAILED.append(name)


# ------------------------------------------------------------------------------------------ 1. exact starting clusters
say('1. The starting clusters of Lemma 1 (exact)')
z = sp.symbols('z')
om = sp.Rational(-1, 2) + sp.sqrt(3)*sp.I/2


def exact_cluster(g, zeta):
    m = len(g)
    w = [sp.nsimplify(sp.simplify(sum(g[l]/(zeta[k] - zeta[l]) for l in range(m) if l != k))) for k in range(m)]
    # nondegeneracy: complex Jacobian of (w_1..w_{m-1}) in (zeta_1..zeta_{m-1}), zeta_m = -sum
    xs = sp.symbols('x0:%d' % (m - 1))
    zs = list(xs) + [-sum(xs)]
    wsym = [sum(g[l]/(zs[k] - zs[l]) for l in range(m) if l != k) for k in range(m - 1)]
    J = sp.Matrix([[sp.diff(wsym[k], xs[j]) for j in range(m - 1)] for k in range(m - 1)])
    detJ = sp.simplify(J.subs(dict(zip(xs, zeta[:m - 1]))).det())
    num = sp.expand(sum(g[k]*sp.prod([z - zeta[l] for l in range(m) if l != k]) for k in range(m))
                    - sp.prod([z - zeta[l] for l in range(m)]))
    num = sp.Poly(sp.simplify(num), z)
    return w, detJ, num


w2, det2, num2 = exact_cluster([1, -1], [sp.Rational(-1, 2), sp.Rational(1, 2)])
check('pair g = (1, -1) at (-1/2, 1/2): w_1 = w_2 = 1, nondegenerate', all(sp.simplify(v - 1) == 0 for v in w2) and det2 != 0,
      'det %s' % det2)
roots2 = sp.solve(num2.as_expr(), z)
check('pair: R has the simple zeros +- i sqrt3/2', sorted([sp.simplify(r) for r in roots2], key=str) ==
      sorted([sp.sqrt(3)*sp.I/2, -sp.sqrt(3)*sp.I/2], key=str) and sp.discriminant(num2.as_expr(), z) != 0,
      'zeros %s' % roots2)
tri = [om, sp.expand(om**2), sp.Integer(1)]
w3, det3, num3 = exact_cluster([1, 1, -2], tri)
check('triangle g = (1, 1, -2) at (omega, omega^2, 1): w_1 = w_2 = w_3 = 1, nondegenerate',
      all(sp.simplify(v - 1) == 0 for v in w3) and sp.simplify(det3) != 0, 'det %s' % sp.nsimplify(det3))
check('triangle: the numerator of R is -(z^3 + 3z + 2)', sp.expand(num3.as_expr() + z**3 + 3*z + 2) == 0,
      str(num3.as_expr()))
disc = sp.discriminant(z**3 + 3*z + 2, z)
check('triangle: its discriminant is -216 (three simple zeros)', disc == -216, disc)
check('triangle: z^3 + 3z + 2 does not vanish at the cube roots of unity (they are the vortices)',
      all(sp.simplify((r**3 + 3*r + 2)) != 0 for r in tri))

# ------------------------------------------------------------------------------------------ 2. the induction, binary64
say('\n2. The induction step of Lemma 1 from the triangle to m = 15 (binary64; illustration)')


def wfield(zv, g):
    d = zv[:, None] - zv[None, :]
    np.fill_diagonal(d, 1)
    q = g[None, :]/d
    np.fill_diagonal(q, 0)
    return q.sum(1)


def tre_solve(zv, g):
    """Newton on w_k = 1 (k != 0) with z_0 held; returns (z, max|w - 1|, smallest/largest singular value)."""
    zv = zv.astype(complex).copy()
    n = len(zv)
    for _ in range(60):
        d = zv[:, None] - zv[None, :]
        np.fill_diagonal(d, 1)
        J = g[None, :]/d**2
        np.fill_diagonal(J, 0)
        J = J - np.diag(J.sum(1))
        Jr = J[1:, 1:]
        step = np.linalg.solve(Jr, -(wfield(zv, g)[1:] - 1))
        zv[1:] += step
        if np.max(np.abs(step)) < 1e-15:
            break
    sv = np.linalg.svd(Jr, compute_uv=False)
    return zv, np.max(np.abs(wfield(zv, g) - 1)), sv.min()/sv.max()


def stagnation(zv, g):
    num = -np.poly(zv).astype(complex)
    for l in range(len(zv)):
        num = np.polyadd(num, g[l]*np.poly(np.delete(zv, l)))
    r = np.roots(num)
    return r, np.abs(np.polyval(np.polyder(num), r))/np.max(np.abs(num))


w3n = np.exp(2j*np.pi/3)
g = np.array([1., 1., -2.])
zv = np.array([w3n, w3n**2, 1.0])
clusters = {}
for m in (5, 7, 9, 11, 13, 15):
    r, simp = stagnation(zv, g)
    idx = [i for i in np.argsort(-simp) if simp[i] > 1e-6][:5]
    best = None
    for a in range(len(idx)):
        for b in range(a + 1, len(idx)):
            zz = np.concatenate([zv, [r[idx[a]], r[idx[b]]]])
            gg = np.concatenate([g, [1e-4, -1e-4]])
            ok = True
            for e in np.geomspace(1e-4, 0.1, 25):
                gg[-2:] = [e, -e]
                try:
                    zz, res, cond = tre_solve(zz, gg)
                except np.linalg.LinAlgError:
                    ok = False
                    break
                if not np.isfinite(res) or res > 1e-10 or cond < 1e-9:
                    ok = False
                    break
            if ok:
                dmin = min(abs(zz[i] - zz[j]) for i in range(len(zz)) for j in range(i))
                if best is None or cond*dmin > best[0]:
                    best = (cond*dmin, zz.copy(), gg.copy(), res, cond, dmin)
    if best is None:
        check('m = %d: a translating cluster grown from m = %d' % (m, m - 2), False)
        break
    _, zv, g, res, cond, dmin = best
    r, simp = stagnation(zv, g)
    clusters[m] = (zv.copy(), g.copy())
    check('m = %d: translates (max|w - 1| < 1e-12), nondegenerate (singular value ratio > 1e-3), circulations nonzero '
          'with zero sum, all %d zeros of R simple' % (m, m),
          res < 1e-12 and cond > 1e-3 and np.min(np.abs(g)) > 0.05 and abs(g.sum()) < 1e-14 and np.all(simp > 1e-6),
          'residual %.1e, ratio %.2e, min separation %.3f, min |R\' zero| %.2e' % (res, cond, dmin, simp.min()))

# ------------------------------------------------------------------------------------------ 3. the families, 40 digits
say('\n3. The family of Theorem 3 at y0 = sqrt3/2 for each grown cluster (40 digits; numerical)')
mp.mp.dps = 40
SQ3_2 = mp.sqrt(3)/2


def family(zc_np, g_np, y0, gammas):
    m = len(zc_np)
    G = [mp.mpf(float(x)) for x in g_np]
    q0 = mp.mpc(mp.mpf(1)/2, y0)

    def wk(zs, k):
        return sum(G[l]/(zs[k] - zs[l]) for l in range(m) if l != k)
    zs = [mp.mpc(c.real, c.imag) for c in (zc_np - zc_np.mean())]
    for _ in range(20):                      # refine the cluster at 40 digits, centred
        f = mp.matrix([wk(zs, k) - 1 for k in range(m - 1)])
        J = mp.matrix(m - 1, m - 1)
        for k in range(m - 1):
            def dpart(l):
                if l == k:
                    return -sum(G[q]/(zs[k] - zs[q])**2 for q in range(m) if q != k)
                return G[l]/(zs[k] - zs[l])**2
            for j in range(m - 1):
                J[k, j] = dpart(j) - dpart(m - 1)
        dz = mp.lu_solve(J, -f)
        for j in range(m - 1):
            zs[j] += dz[j]
        zs[m - 1] = -sum(zs[:m - 1])
        if mp.norm(dz) < mp.mpf('1e-38'):
            break

    def unpack(x):
        zz = [mp.mpc(x[2*k], x[2*k + 1]) for k in range(m - 1)]
        zz.append(-sum(zz))
        return zz, mp.mpc(x[2*m - 2], x[2*m - 1]), x[2*m]

    def F(x, gam):
        zz, Lam, nu = unpack(x)
        gt = G[:-1] + [G[-1] + gam*nu]
        D = sum(gt[k]*zz[k] for k in range(m))
        S = sum(v**2 for v in gt)
        zc = gam**2*(nu + D)/(1 + gam**2*nu)
        out = []
        for k in range(m - 1):
            E = 1/(1 + gam*zz[k]) + sum(gt[l]/(zz[k] - zz[l]) for l in range(m) if l != k) \
                - Lam*mp.conj(1 + gam*zz[k] - zc)
            out += [E.real, E.imag]
        E0 = nu - sum(gt[k]*zz[k]/(1 + gam*zz[k]) for k in range(m)) - Lam*(nu*(1 - mp.conj(zc)) + mp.conj(D))
        return out + [E0.real, E0.imag, mp.im(-2*D/S) - y0]
    S0 = sum(v**2 for v in G)
    x = []
    for c in zs[:-1]:
        c = q0*c
        x += [c.real, c.imag]
    L0 = 1 + 1/q0
    x = mp.matrix(x + [L0.real, L0.imag, S0/2])
    res0 = max(abs(v) for v in F(x, 0))
    rows = []
    for gam in gammas:
        gam = mp.mpf(gam)
        for _ in range(25):
            f = mp.matrix(F(x, gam))
            n = len(x)
            J = mp.matrix(n, n)
            h = mp.mpf('1e-22')
            for j in range(n):
                xp = x.copy()
                xp[j] += h
                fp = mp.matrix(F(xp, gam))
                for i in range(n):
                    J[i, j] = (fp[i] - f[i])/h
            dx = mp.lu_solve(J, -f)
            x = x + dx
            if mp.norm(dx) < mp.mpf('1e-32'):
                break
        res = max(abs(v) for v in F(x, gam))
        zz, Lam, nu = unpack(x)
        gt = G[:-1] + [G[-1] + gam*nu]
        Z = [mp.mpc(0)] + [1 + gam*c for c in zz]
        Gm = [mp.mpf(1)] + [gam*v for v in gt]
        zc = sum(a*b for a, b in zip(Gm, Z))/sum(Gm)
        vel = [mp.conj(sum(Gm[k]/(Z[j] - Z[k]) for k in range(len(Z)) if k != j)/(2j*mp.pi)) for j in range(len(Z))]
        kap = [vel[j]/(Z[j] - zc) for j in range(len(Z))]
        spread = max(abs(k - kap[1]) for k in kap)/abs(kap[1])
        P = abs(mp.im(kap[1]))/(2*abs(mp.re(kap[1])))
        rows.append((gam, res, spread, mp.re(kap[1]), P))
    return res0, rows


GAMMAS = ['1e-2', '1e-3', '1e-4', '1e-5']
for m, (zc_np, g_np) in clusters.items():
    res0, rows = family(zc_np, g_np, SQ3_2, GAMMAS)
    slopes = [(P - SQ3_2)/gam for gam, _, _, _, P in rows]
    say('      m = %d, g = (%s): (P - sqrt3/2)/gamma = %s' % (m, ', '.join('%.4g' % v for v in g_np),
                                                             ', '.join(mp.nstr(v, 7) for v in slopes)))
    check('m = %d: the gamma = 0 point solves the regularized system; every family member solves it (residual < 1e-30) '
          'and satisfies the Biot-Savart equations of all %d vortices (relative spread of kappa < 1e-30) with '
          'Re kappa < 0' % (m, m + 1),
          res0 < 1e-30 and all(r_[1] < 1e-30 and r_[2] < 1e-30 and r_[3] < 0 for r_ in rows),
          'max residual %s, max spread %s' % (mp.nstr(max(r_[1] for r_ in rows), 2), mp.nstr(max(r_[2] for r_ in rows), 2)))
    d1, d2 = abs(slopes[1] - slopes[2]), abs(slopes[2] - slopes[3])
    check('m = %d: P - sqrt3/2 = O(gamma), P -> sqrt3/2: (P - sqrt3/2)/gamma converges, its change falling about '
          'tenfold per decade of gamma' % m, 6 < d1/d2 < 16 and abs(slopes[-1]) < 10,
          'changes %s, %s' % (mp.nstr(d1, 3), mp.nstr(d2, 3)))

# ------------------------------------------------------------------------------------------ 4. controls
say('\n4. Negative controls')
num_dbl = np.poly([1.0, 1.0, -2.0])
rd = np.roots(num_dbl)
simp_d = np.abs(np.polyval(np.polyder(num_dbl), rd))/np.max(np.abs(num_dbl))
check('control: the simplicity test flags the double zero of (z - 1)^2 (z + 2)', np.sum(simp_d < 1e-6) == 2,
      '|N\'| at the zeros %s' % np.round(simp_d, 8))
zp, gp = clusters[5]
zbad = zp.copy()
zbad[2] += 0.05
check('control: a cluster moved by 0.05 no longer translates (max|w - 1| > 1e-3)',
      np.max(np.abs(wfield(zbad, gp) - 1)) > 1e-3, '%.2e' % np.max(np.abs(wfield(zbad, gp) - 1)))
res0, rows = family(zp, gp, mp.mpf(1), ['1e-3', '1e-4'])
check('control: with y0 = 1 the five-vortex family tends to P(0) = (1 + 3/4)/2 = 7/8, not sqrt3/2',
      abs(rows[-1][4] - mp.mpf(7)/8) < 1e-3 and abs(rows[-1][4] - SQ3_2) > 1e-3, mp.nstr(rows[-1][4], 8))
wsame = wfield(np.array([-0.5 + 0j, 0.5 + 0j]), np.array([1.0, 1.0]))
check('control: a pair of equal signs does not translate (w_1 = -w_2), as (I1) with a nonzero total requires',
      abs(wsame[0] + wsame[1]) < 1e-15 and abs(wsame[0] - wsame[1]) > 1, 'w = %s' % np.round(wsame, 6))

say('\n%d checks, %d failed' % (N[0], len(FAILED)))
os.makedirs(DATA, exist_ok=True)
with open(os.path.join(DATA, 'verify-sharpness-all-n.txt'), 'w') as fh:
    fh.write('\n'.join(OUT) + '\n')
sys.exit(1 if FAILED else 0)
