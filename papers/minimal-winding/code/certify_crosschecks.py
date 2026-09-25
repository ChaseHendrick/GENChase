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
"""Two non-rigorous cross-checks for certify_collapses.py, which guard against coding errors in the
formulas that the proofs evaluate (they are not part of any proof):

  * selftest: the ball AD (certify_ball_ad.F_T, certify_alpha_model.E_T) against an independent mpmath
    implementation in complex arithmetic: values, Jacobians by central differences (step 1e-30 at
    110 digits), Hessians by differences of the AD gradients, and a spot check that the enclosure of F
    over a ball contains the mpmath values at random points of the ball.
  * independent: a separate implementation of the Biot-Savart laws exactly as the manuscripts write
    them (complex arithmetic, no real and imaginary splitting, no automatic differentiation, no gauge
    formulas), evaluated at the midpoint of each certified enclosure: kappa_j = (dz_j/dt)/(z_j - z_c)
    for every vortex, their spread, Re kappa (collapse iff < 0) and P = |Im kappa|/(2|Re kappa|).

    Euler:          conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k)
    alpha-models:   dz_j/dt = (i/(2 pi)) sum_{k != j} Gamma_k (z_j - z_k) |z_j - z_k|^(-alpha-2)
"""
import random
import mpmath as mp
from flint import arb
import certify_ball_ad as V
import certify_alpha_model as AM


def _m(a):
    """an arb midpoint as an mpmath number (at the current mpmath precision)"""
    return mp.mpf(a.mid().str(105, radius=False))


def mp_F(v, N):
    x = [v[0]] + [v[2*k - 1] for k in range(1, N)]
    y = [mp.mpf(0)] + [v[2*k] for k in range(1, N)]
    G = [mp.mpf(1)] + [v[2*N - 2 + k] for k in range(1, N)]
    lam = mp.mpc(2*v[3*N - 2], -1)
    z = [mp.mpc(a, b) for a, b in zip(x, y)]
    out = [sum(G[k]/(z[j] - z[k]) for k in range(N) if k != j) - lam*mp.conj(z[j]) for j in range(N)]
    return [f.real for f in out] + [f.imag for f in out]


def mp_E(v, N, alpha, c):
    """c = None: P free, 2 pi kappa = -1 + 2 i v[3N - 2]"""
    z = [mp.mpc(v[0], 0)] + [mp.mpc(v[2*k - 1], v[2*k]) for k in range(1, N)]
    G = [mp.mpf(1)] + [v[2*N - 2 + k] for k in range(1, N)]
    k2 = c if c is not None else mp.mpc(-1, 2*v[3*N - 2])
    out = [1j*sum(G[k]*(z[j] - z[k])*abs(z[j] - z[k])**(-alpha - 2) for k in range(N) if k != j) - k2*z[j]
           for j in range(N)]
    return [f.real for f in out] + [f.imag for f in out]


def _diff_check(ad_fun, mp_fun, v_mp, free, m, hessian, rnd, ball_rad=None):
    """max |AD - mp| for values, gradients and (optionally) Hessians; ball containment failures."""
    v_arb = [arb(mp.nstr(a, 105)).mid() for a in v_mp]
    v_mp = [_m(a) for a in v_arb]
    Ts = ad_fun(v_arb, free, 2 if hessian else 1)
    Fm = mp_fun(v_mp)
    e0 = max(abs(_m(Ts[r].v) - Fm[r]) for r in range(m))
    h = mp.mpf(10)**-30
    e1 = mp.mpf(0)
    e2 = mp.mpf(0)
    for c, i in enumerate(free):
        vp = list(v_mp)
        vm = list(v_mp)
        vp[i] += h
        vm[i] -= h
        Fp = mp_fun(vp)
        Fq = mp_fun(vm)
        for r in range(m):
            e1 = max(e1, abs((Fp[r] - Fq[r])/(2*h) - _m(Ts[r].g[c, 0])))
        if hessian:
            # column c of each Hessian: central difference of the AD gradients (checked above)
            Tp = ad_fun([arb(mp.nstr(a, 105)).mid() for a in vp], free, 1)
            Tq = ad_fun([arb(mp.nstr(a, 105)).mid() for a in vm], free, 1)
            for r in range(m):
                for c2 in range(len(free)):
                    fd = (_m(Tp[r].g[c2, 0]) - _m(Tq[r].g[c2, 0]))/(2*h)
                    e2 = max(e2, abs(fd - _m(Ts[r].H[c2, c])))
    bad = 0
    if ball_rad is not None:
        ball = list(v_arb)
        for i in free:
            ball[i] = arb(v_arb[i], arb(ball_rad))
        Tb = ad_fun(ball, free, 2 if hessian else 1)
        for trial in range(20):
            vpt = list(v_mp)
            for i in free:
                vpt[i] = v_mp[i] + mp.mpf(rnd.uniform(-1, 1))*mp.mpf(ball_rad)
            Fp = mp_fun(vpt)
            for r in range(m):
                if not Tb[r].v.contains(arb(mp.nstr(Fp[r], 100))):
                    bad += 1
    return e0, e1, e2, bad


def selftest(check, starts, alpha_starts=()):
    """starts: {N: full vector as decimal strings} (Euler); alpha_starts: [(label, N, alpha, strings)]
    (alpha-model with P free)."""
    mp.mp.dps = 110
    for N in sorted(starts):
        v_mp = [mp.mpf(s) for s in starts[N]]
        rnd = random.Random(N)
        n = 3*N - 1
        free = sorted(rnd.sample(range(n), n - rnd.randint(0, N - 1)))
        e0, e1, e2, bad = _diff_check(lambda v, fr, o: V.F_T(v, fr, N, order=o), lambda v: mp_F(v, N),
                                      v_mp, free, 2*N, True, rnd, ball_rad='1e-3')
        check('Euler N = %d, %d free variables: F, Jacobian and Hessians of the ball AD agree with mpmath; the'
              ' enclosure over a 1e-3 ball contains F at 20 random points' % (N, len(free)),
              e0 < mp.mpf(10)**-80 and e1 < mp.mpf(10)**-25 and e2 < mp.mpf(10)**-25 and bad == 0,
              '|F| %s, |J| %s, |H| %s, containment failures %d' % (mp.nstr(e0, 3), mp.nstr(e1, 3), mp.nstr(e2, 3), bad))
    for (N, alpha) in ((5, 2), (4, 1), (6, 2)):
        rnd = random.Random(100 + N)
        n = 3*N - 2
        v_mp = [mp.mpf(rnd.uniform(-2, 2)) for _ in range(n)]
        free = sorted(rnd.sample(range(n), 2*N))
        e0, e1, _, _ = _diff_check(lambda v, fr, o: AM.E_T(v, fr, N, alpha, arb(-1), order=o),
                                   lambda v: mp_E(v, N, alpha, -1), v_mp, free, 2*N, False, rnd)
        check('alpha-model, kappa real, N = %d, alpha = %d: E and its Jacobian agree with mpmath at a random point'
              % (N, alpha), e0 < mp.mpf(10)**-70 and e1 < mp.mpf(10)**-25,
              '|E| %s, |J| %s' % (mp.nstr(e0, 3), mp.nstr(e1, 3)))
    for label, N, alpha, strings in alpha_starts:
        rnd = random.Random(200 + N + alpha)
        v_mp = [mp.mpf(s) for s in strings]
        n = 3*N - 1
        free = sorted(rnd.sample(range(n), n - rnd.randint(0, N - 1)))
        e0, e1, e2, bad = _diff_check(lambda v, fr, o: AM.E_T(v, fr, N, alpha, None, order=o),
                                      lambda v: mp_E(v, N, alpha, None), v_mp, free, 2*N, True, rnd, ball_rad='1e-3')
        check('alpha-model, P free, %s: E, Jacobian and Hessians agree with mpmath; ball enclosure contains'
              ' 20 random points' % label,
              e0 < mp.mpf(10)**-70 and e1 < mp.mpf(10)**-25 and e2 < mp.mpf(10)**-25 and bad == 0,
              '|E| %s, |J| %s, |H| %s, containment failures %d' % (mp.nstr(e0, 3), mp.nstr(e1, 3), mp.nstr(e2, 3), bad))


def kappas(z, G, law, alpha=0):
    N = len(z)
    zc = sum(g*w for g, w in zip(G, z))/sum(G)
    ks = []
    for j in range(N):
        if law == 'euler':
            v = mp.conj(sum(G[k]/(z[j] - z[k]) for k in range(N) if k != j)/(2*mp.pi*1j))
        else:
            v = 1j/(2*mp.pi)*sum(G[k]*(z[j] - z[k])*abs(z[j] - z[k])**(-alpha - 2) for k in range(N) if k != j)
        ks.append(v/(z[j] - zc))
    return ks, zc


def config_of(full, N):
    """(z, G) at the midpoint of a certified enclosure, full in the layout of certify_ball_ad"""
    x = [full[0]] + [full[2*k - 1] for k in range(1, N)]
    y = [arb(0)] + [full[2*k] for k in range(1, N)]
    G = [arb(1)] + [full[2*N - 2 + k] for k in range(1, N)]
    return [mp.mpc(_m(a), _m(b)) for a, b in zip(x, y)], [_m(g) for g in G]


def independent(check, label, full, N, law, alpha=0, P_cert=None, rotating=True):
    """Biot-Savart re-check of one certified point (full: arb balls)."""
    mp.mp.dps = 80
    z, G = config_of(full, N)
    ks, zc = kappas(z, G, law, alpha)
    k = ks[0]
    spread = max(abs(q - k) for q in ks)/abs(k)
    P = abs(k.imag)/(2*abs(k.real))
    if rotating:
        dP = abs(P - _m(P_cert))
        check('%s: all %d kappa_j agree, Re kappa < 0 (collapse), z_c = 0 and P agrees with the enclosure' % (label, N),
              spread < mp.mpf('1e-60') and k.real < 0 and abs(zc) < mp.mpf('1e-60') and dP < mp.mpf('1e-60'),
              'spread %s, Re kappa = %s, |z_c| = %s, P = %s, |P - P_cert| = %s'
              % (mp.nstr(spread, 2), mp.nstr(k.real, 8), mp.nstr(abs(zc), 2), mp.nstr(P, 25), mp.nstr(dP, 2)))
    else:
        check('%s: all %d kappa_j agree, 2 pi kappa = -1 (real: no rotation, collapse), z_c = 0' % (label, N),
              spread < mp.mpf('1e-60') and abs(2*mp.pi*k + 1) < mp.mpf('1e-60') and abs(zc) < mp.mpf('1e-60'),
              'spread %s, 2 pi kappa = %s, |Im kappa|/|kappa| = %s, |z_c| = %s'
              % (mp.nstr(spread, 2), mp.nstr(2*mp.pi*k, 12), mp.nstr(abs(k.imag)/abs(k), 2), mp.nstr(abs(zc), 2)))
