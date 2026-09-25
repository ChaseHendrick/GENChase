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
"""Controls on three vortices for certify_collapses.py, where P > sqrt(3)/2 is a theorem (Corollary 1
of the manuscript) and the minimum on each collapsing arc is known in closed form (Theorem 1).

 (A) The existence pipeline at the mu = 1/2 arc minimizer certifies a collapse, and its P lies ABOVE
     sqrt(3)/2.
 (B) The KKT pipeline with Gamma_2 = mu held fixed (min P on one collapsing arc), mu = 1/2 and 1/20,
     certifies a strict local minimum whose enclosure contains the closed form P_-(mu) = sqrt(y_1(mu)),
     y_1 the least positive root of the cubic Q(mu, .) of Theorem 1(b), isolated by FLINT; for mu = 1/2
     also the root of 8748 xi^6 - 49005 xi^4 + 27794 xi^2 + 18723. This checks the whole second-order
     machinery against an independent exact answer.
 (C) With Gamma_2 free the infimum sqrt(3)/2 is not attained, so there is no KKT point: Newton on the
     Lagrange system diverges, and a projected descent of P runs to the boundary from above.
 (D) Asking for P < sqrt(3)/2 directly (P fixed at 17/20 or 4/5, Gamma_2 fixed): multistart
     Levenberg-Marquardt finds no nondegenerate root, while the same solver at P = 11/10 finds roots
     and the Krawczyk test certifies one.
 (E) alpha = 2, three vortices, kappa real (P = 0, excluded by P > sqrt(5)/4): no root.
(A) and (B) are proofs. (C), (D) and (E) are floating-point searches: failing to find a root is not a
proof that none exists (the theorem is); they show that the pipeline certifies where the answer is
known to be yes and finds nothing where it is known to be no.
"""
import numpy as np
import mpmath as mp
from flint import arb, arb_mat, fmpq, fmpz_poly, fmpq_poly
import certify_ball_ad as V
import certify_pipeline as PL

N = 3


def arc_minimizer(mu):
    """Eq. (pos) of the manuscript at the unique critical point on the arc A_- (Theorem 1(a)), in the
    gauge Gamma_1 = 1, z_1 real, lam = 2P - i. Non-rigorous (mpmath): only a starting point."""
    mu = mp.mpf(int(mu.p))/mp.mpf(int(mu.q))
    R = 1 + mu + mu**2
    sR = mp.sqrt(R)
    Gc = lambda C: (4*(1 - mu)*C**3 + 4*(2*mu**2 - mu + 2)*C**2 + 2*(1 - mu)**3*C
                    - (2*mu**4 + 7*mu**3 + 6*mu**2 + 7*mu + 2))
    C = mp.findroot(Gc, ((-sR)*(1 - mp.mpf('1e-30')), (mu - 1)/2), solver='anderson', verify=False)
    C = mp.findroot(Gc, C)
    th = 2*mp.pi - mp.acos(C/sR)                     # on A_-: sin(theta) < 0
    e = mp.expj(-th)
    z = [mu*(1 + sR*e)/(1 + mu)**2, (mu - sR*e)/(1 + mu)**2, mp.mpc(1)]
    G = [mp.mpf(1), mu, -mu/(1 + mu)]
    w = [sum(G[k]/(z[j] - z[k]) for k in range(3) if k != j) for j in range(3)]
    lam = w[0]/mp.conj(z[0])
    assert max(abs(w[j]/mp.conj(z[j]) - lam) for j in range(3)) < mp.mpf(10)**-40 and lam.imag < 0
    s = mp.sqrt(-lam.imag)
    z = [q*s for q in z]
    lam = lam/s**2
    rot = mp.conj(z[0])/abs(z[0])
    z = [q*rot for q in z]
    v = [z[0].real, z[1].real, z[1].imag, z[2].real, z[2].imag, G[1], G[2], lam.real/2]
    return [V.A(mp.nstr(a, 55)) for a in v]


def P_closed_form(mu):
    """sqrt of the least positive root of Q(mu, y) = mu^6 Qt(u, y), u = mu + 1 + 1/mu (Eq. (Q) of the
    manuscript), as a rigorous Arb enclosure (roots isolated by FLINT)."""
    u = mu + 1 + 1/mu
    c3 = 1728*(u + 1)**2
    c2 = -144*(u + 1)*(8*u**3 - 9*u - 9)
    c1 = -4*(16*u**6 - 288*u**4 - 288*u**3 - 81*u**2 - 162*u - 81)
    c0 = 3*(4*u**3 - 3*u - 3)**2
    q = fmpq_poly([c0, c1, c2, c3])
    num = q.numer() if hasattr(q, 'numer') else fmpz_poly([int(c*q.denom()) for c in q.coeffs()])
    roots = [r for r, _ in num.complex_roots() if r.imag.contains(0) and r.real > 0]
    y1 = min((r.real for r in roots), key=lambda a: a.mid())
    return y1.sqrt()


def F_np(u, G2, P):
    x1, x2, y2, x3, y3, G3 = u
    z = np.array([x1, x2 + 1j*y2, x3 + 1j*y3])
    G = np.array([1.0, G2, G3])
    lam = 2*P - 1j
    w = np.array([sum(G[k]/(z[j] - z[k]) for k in range(3) if k != j) for j in range(3)])
    F = w - lam*np.conj(z)
    return np.concatenate([F.real, F.imag]), z, G


def lm_generic(Fun, u, iters=250):
    """Levenberg-Marquardt with a forward-difference Jacobian; stops at residual 1e-13, or when the
    residual has not dropped by 1e-6 (relative) over 25 iterations (a floor)."""
    lamb = 1e-3
    f = Fun(u)
    r = np.linalg.norm(f)
    hist = [r]
    for it in range(iters):
        J = np.zeros((len(f), len(u)))
        h = 1e-7
        for c in range(len(u)):
            up = u.copy()
            up[c] += h
            J[:, c] = (Fun(up) - f)/h
        moved = False
        while lamb < 1e12:
            du = np.linalg.solve(J.T@J + lamb*np.diag(np.diag(J.T@J) + 1e-12), -J.T@f)
            fn = Fun(u + du)
            rn = np.linalg.norm(fn)
            if np.isfinite(rn) and rn < r:
                u = u + du
                f = fn
                r = rn
                lamb = max(lamb/3, 1e-12)
                moved = True
                break
            lamb *= 4
        hist.append(r)
        if not moved or r < 1e-13:
            break
        if it > 25 and r > (1 - 1e-6)*hist[-26]:
            break
    return u, r


def classify(z, G, r):
    """'root': residual < 1e-11 at a nondegenerate configuration; 'degenerate': the run ended at a
    shrinking or merging configuration (size < 0.05 or > 20, a pair closer than 1e-3 of the size, or a
    circulation below 1e-3), where the residual can go to 0 without a collapse (a scaled-down
    stationary configuration); 'floor': a nondegenerate configuration where the residual stalled."""
    scale = np.max(np.abs(z))
    d = min(abs(z[j] - z[k]) for j in range(3) for k in range(j + 1, 3))
    if scale < 0.05 or scale > 20 or d < 1e-3*scale or np.min(np.abs(G)) < 1e-3:
        return 'degenerate'
    return 'root' if r < 1e-11 else 'floor'


def run(check, log=print):
    """Runs (A)-(E); reports each result through check(name, ok, detail). Returns a dict of the
    certified enclosures for the summary."""
    mp.mp.dps = 60
    out = {}
    model = PL.EulerModel(N)
    names = model.names
    # ---------------------------------------------------------------- (A)
    log('  (A) existence pipeline at the mu = 1/2 arc minimizer (chart: G2 = 1/2 and x2 fixed)')
    v12 = arc_minimizer(fmpq(1, 2))
    fixed = [fmpq(1, 2), PL.rat(v12[names.index('x2')], 6)]
    r = PL.existence(model, v12, ['G2', 'x2'], fixed)
    check('(A) Krawczyk proves a unique three-vortex collapse at G2 = 1/2, x2 = %s, in the box of radius 1e-%s'
          % (fixed[1], r.get('rmax')), r['ok'] and r.get('rmax') is not None,
          'contraction %s' % r['contraction'].str(3, radius=False))
    if r['ok']:
        sc = r['side']
        bad = model.genuine(sc, below=False)
        check('(A) side conditions of a genuine collapse hold on the box', not bad, ', '.join(bad))
        log('      P in %s' % sc['P_decimal'])
        check('(A) its P is certified ABOVE sqrt(3)/2, as the theorem requires', sc['P_above_sqrt3_over_2'])
    # ---------------------------------------------------------------- (B)
    sextic = fmpz_poly([18723, 0, 27794, 0, -49005, 0, 8748])
    for mu in (fmpq(1, 2), fmpq(1, 20)):
        log('  (B) KKT system with Gamma_2 = %s held fixed (min P on the collapsing arc A_-)' % mu)
        v = arc_minimizer(mu)
        iG2 = V.idx_G(3, 2)
        v[iG2] = arb(mu)                                # exact for 1/2, a 1e-96 ball around 1/20
        free = [i for i in range(8) if i != iG2]
        # chart: the free coordinate with the best-conditioned J_U (floating-point choice)
        Ts = V.F_T(v, free, 3, order=1)
        J = np.array([[float(Ts[q].g[c, 0]) for c in range(len(free))] for q in range(6)])
        cands = [i for i in free if i != V.idx_P(3)]
        best = max(cands, key=lambda i: np.linalg.svd(np.delete(J, free.index(i), axis=1), compute_uv=False)[-1])
        chart = [names[best]]
        r = PL.kkt(model, v, free, chart)
        check('(B) mu = %s: Krawczyk proves a unique KKT point in the box of radius 1e-%s (%d unknowns)'
              % (mu, r.get('rmax'), r['unknowns']), r['ok'] and r.get('rmax') is not None,
              'contraction %s' % r['contraction'].str(3, radius=False))
        if not r['ok']:
            continue
        so = r['second_order'][0]
        check('(B) mu = %s: reduced Hessian positive definite (chart %s): a strict local minimum of P on the arc'
              % (mu, chart[0]), so['J_U_invertible'] and so['PD'],
              'eigenvalue %s' % ', '.join('[%s, %s]' % (lo.str(8, radius=False), hi.str(8, radius=False)) for lo, hi, _ in so['eigs']))
        Pexact = P_closed_form(mu)
        P = r['side']['P_ball']
        log('      closed form P_-(%s) = %s' % (mu, Pexact.str(50, radius=True)))
        log('      certified KKT P     = %s' % P.str(50, radius=True))
        check('(B) mu = %s: the certified minimum contains the closed form P_-(mu) = sqrt(y_1(mu))' % mu,
              P.overlaps(Pexact), '|difference| <= %s' % (P - Pexact).abs_upper().str(3, radius=False))
        if mu == fmpq(1, 2):
            r6 = [q for q, _ in sextic.complex_roots() if q.imag.contains(0) and q.real > 1 and q.real < 2][0].real
            check('(B) mu = 1/2: it contains the root %s of 8748 xi^6 - 49005 xi^4 + 27794 xi^2 + 18723'
                  % r6.str(40, radius=False), P.overlaps(r6))
        check('(B) mu = %s: the minimum is certified above sqrt(3)/2' % mu, r['side']['P_above_sqrt3_over_2'])
        out['P_-(%s)' % mu] = P
    # ---------------------------------------------------------------- (C)
    log('  (C) min P over the whole three-vortex collapse set (Gamma_2 free); the infimum sqrt(3)/2 is not attained')
    v = arc_minimizer(fmpq(1, 2))
    free = list(range(8))
    fun = PL.kkt_fun(model, list(v), free)
    Jm = V.mid_mat(V.jac_of(V.F_T(v, free, 3, order=1)))
    eP = arb_mat(8, 1)
    eP[V.idx_P(3), 0] = arb(1)
    mu0 = (Jm*Jm.transpose()).solve(Jm*eP)
    w = [a.mid() for a in v] + [mu0[i, 0].mid() for i in range(6)]
    f, _ = fun(w, False)
    log('      at the mu = 1/2 arc minimizer the Lagrange residual is %.3e (a minimum on the arc, not on the whole'
        ' set: dP/dGamma_2 != 0 there)' % float(max(abs(a.mid()) for a in f)))
    converged = False
    for it in range(40):
        f, M = fun(w, True)
        rr = max(abs(a.mid()) for a in f)
        if rr < arb(10)**-80:
            converged = True
            break
        try:
            dx = V.mid_mat(M).solve(arb_mat(14, 1, [a.mid() for a in f]))
        except ZeroDivisionError:
            break
        w = [(w[i] - dx[i, 0]).mid() for i in range(14)]
        if any(not a.is_finite() for a in w):
            break
    check('(C) numerical: Newton on the Lagrange system with Gamma_2 free does not converge from there',
          not converged, '%d steps, final residual %.2e' % (it, float(rr)))

    def Ff(v):
        z = np.array([v[0], v[1] + 1j*v[2], v[3] + 1j*v[4]])
        G = np.array([1.0, v[5], v[6]])
        lam = 2*v[7] - 1j
        w_ = np.array([sum(G[k]/(z[j] - z[k]) for k in range(3) if k != j) for j in range(3)])
        F = w_ - lam*np.conj(z)
        return np.concatenate([F.real, F.imag])

    def Jf(v, h=1e-7):
        f0 = Ff(v)
        return np.array([(Ff(v + h*np.eye(8)[c]) - f0)/h for c in range(8)]).T

    def sep_of(vv):
        z = np.array([vv[0], vv[1] + 1j*vv[2], vv[3] + 1j*vv[4]])
        return min(abs(z[j] - z[k]) for j in range(3) for k in range(j + 1, 3))/np.max(np.abs(z))

    def project(vn):
        for _ in range(30):
            F = Ff(vn)
            J = Jf(vn)
            if np.linalg.norm(F) < 1e-12:
                return vn, True
            vn = vn - J.T @ np.linalg.solve(J @ J.T, F)
        return vn, np.linalg.norm(Ff(vn)) < 1e-12
    vv = np.array([float(a) for a in v])
    hist = []
    t = 1e-2
    it = 0
    while it < 3000 and t > 1e-14 and sep_of(vv) > 2e-4:      # stops when binary64 can resolve no decrease
        J = Jf(vv)
        g = np.zeros(8)
        g[7] = 1.0
        d = g - J.T @ np.linalg.solve(J @ J.T, J @ g)            # tangent component of grad P
        te = min(t, 0.2*min(abs(vv[5]), abs(vv[6])))             # never step across Gamma = 0
        vn, okp = project(vv - te*d/np.linalg.norm(d))
        if okp and vn[7] < vv[7] and np.sign(vn[5]) == np.sign(vv[5]):   # accept only a decrease of P on F = 0
            if not hist or hist[-1][1] - vv[7] > 1e-3:
                hist.append((it, vv[7], vv[5], vv[6], sep_of(vv)))
            vv = vn
            it += 1
            t *= 1.5
        else:
            t *= 0.5
    hist.append((it, vv[7], vv[5], vv[6], sep_of(vv)))
    sel = sorted(set(list(range(0, len(hist), max(1, len(hist)//8))) + [len(hist) - 1]))
    for h in [hist[i] for i in sel]:
        log('      descent step %4d: P = %.10f  Gamma_2 = %.3e  Gamma_3 = %.3e  min separation/size = %.3e' % h)
    Plow = vv[7]
    check('(C) numerical: a monotone projected descent of P on the collapse set approaches sqrt(3)/2 from above as'
          ' Gamma_2, Gamma_3 -> 0 (the weak pair merges); no interior minimum',
          np.sqrt(3)/2 < Plow < np.sqrt(3)/2 + 1e-3 and abs(vv[5]) < 1e-2,
          'lowest P %.10f, sqrt(3)/2 = %.10f' % (Plow, np.sqrt(3)/2))
    # ---------------------------------------------------------------- (D)
    log('  (D) direct search for a three-vortex collapse with P fixed (Gamma_2 fixed); multistart Levenberg-Marquardt,'
        ' 300 starts each')
    rng = np.random.default_rng(3)
    for (G2, P) in [(0.5, 0.85), (0.5, 0.8), (0.05, 0.85), (1.0, 0.85), (0.5, 1.1)]:
        ngood = 0
        ndeg = 0
        best = None
        floors = []
        for s in range(300):
            u0 = np.concatenate([rng.standard_normal(5)*rng.choice([0.3, 1, 3]), [rng.standard_normal()]])
            u, rr = lm_generic(lambda q: F_np(q, G2, P)[0], u0)
            _, z, G = F_np(u, G2, P)
            kind = classify(z, G, rr)
            if kind == 'root':
                ngood += 1
                if best is None:
                    best = u
            elif kind == 'degenerate':
                ndeg += 1
            else:
                floors.append(rr)
        fl = np.array(floors) if floors else np.array([np.nan])
        detail = ('%d runs ended degenerate (shrinking or merging), smallest residual of the other %d runs %.2e'
                  % (ndeg, len(floors), np.nanmin(fl)))
        if P < np.sqrt(3)/2:
            check('(D) numerical: Gamma_2 = %s, P = %s < sqrt(3)/2: no nondegenerate root in 300 starts' % (G2, P),
                  ngood == 0, '%d roots; %s' % (ngood, detail))
            continue
        certified = False
        if best is not None:
            # certify with the same Krawczyk machinery: unknowns x1, x2, y2, x3, y3, G3; P and Gamma_2 exact
            Pq = fmpq(int(round(P*100)), 100)
            Gq = fmpq(int(round(G2*100)), 100)
            base = [V.A(repr(float(a))) for a in [best[0], best[1], best[2], best[3], best[4], G2, best[5], P]]
            base[V.idx_G(3, 2)] = arb(Gq)
            base[V.idx_P(3)] = arb(Pq)
            U = [0, 1, 2, 3, 4, V.idx_G(3, 3)]
            rs = PL.solve_square(model, base, U, [base[i] for i in U])
            certified = rs['ok'] and not model.genuine(model.side(rs['full']), below=False)
        check('(D) positive control: Gamma_2 = %s, P = %s > P_-(1/2): the same search finds roots, and Krawczyk'
              ' certifies one as a genuine collapse with P = 11/10 exactly' % (G2, P), ngood > 0 and certified,
              '%d roots; %s' % (ngood, detail))
    # ---------------------------------------------------------------- (E)
    log('  (E) alpha = 2, three vortices, kappa real (P = 0; excluded by P > sqrt(5)/4): multistart search, 600 starts')

    def E_np(u, G2):
        x1, x2, y2, x3, y3, G3 = u
        z = np.array([x1, x2 + 1j*y2, x3 + 1j*y3])
        G = np.array([1.0, G2, G3])
        v = np.array([1j*sum(G[k]*(z[j] - z[k])/abs(z[j] - z[k])**4 for k in range(3) if k != j) for j in range(3)])
        F = v + z                                       # 2 pi kappa = -1
        return np.concatenate([F.real, F.imag]), z, G
    cnt = 0
    ndeg = 0
    fl = []
    allr = []
    for G2 in (0.3, 0.5, 1.0, -0.4):
        for s in range(150):
            u = np.concatenate([rng.standard_normal(5)*rng.choice([0.3, 1, 3]), [rng.standard_normal()]])
            u, rr = lm_generic(lambda q: E_np(q, G2)[0], u)
            _, z, G = E_np(u, G2)
            kind = classify(z, G, rr)
            allr.append((rr, np.max(np.abs(z))))
            if kind == 'root':
                cnt += 1
            elif kind == 'degenerate':
                ndeg += 1
            else:
                fl.append(rr)
    rmin = min(allr)
    check('(E) numerical: alpha = 2, kappa real: no nondegenerate three-vortex root in 600 starts', cnt == 0,
          '%d roots; %d ended degenerate; smallest residual of the other %d runs %.2e; smallest of all runs %.2e (at size %.2e)'
          % (cnt, ndeg, len(fl), min(fl) if fl else float('nan'), rmin[0], rmin[1]))
    return out
