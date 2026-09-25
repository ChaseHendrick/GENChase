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
"""The two certification pipelines of certify_collapses.py and the rigorous side conditions.

  * solve_square / existence: Newton, then Krawczyk, for 2N equations in 2N unknowns, the other
    coordinates held at exact rationals (or tiny balls around them). A success proves a unique zero in
    a box, for every value of the fixed parameters in their balls.
  * kkt: the Lagrange system of min P on {F = 0}, unknowns (v, mu), equations F(v) = 0 and
    J(v)^T mu = ow e_P, by Krawczyk; then the second-order test: on the box, J_U (the columns of the
    2N non-chart coordinates) is proved invertible, so the collapse set is locally the graph u = u(s)
    over the chart coordinates s, and the Hessian of p(s) = P(u(s), s) at the KKT point is
    Z^T (Hess L) Z with Z = [-J_U^{-1} J_S; I] and L = ow P - mu.F. All leading principal minors of an
    interval enclosure of it are proved positive (Sylvester), so p has a strict local minimum.

A model object supplies the equations: model.eqs(full, free, order) -> 2N T numbers, model.side(full)
-> dict of side conditions, model.genuine(sc, below) -> the side conditions that failed, model.names,
model.iP (the index of P). EulerModel is the Euler law; certify_alpha_model.AlphaModel the alpha-models.
"""
import numpy as np
from flint import arb, arb_mat, fmpq, fmpz
import certify_ball_ad as V

SQRT3_2 = arb(3).sqrt()/2

# Charts: the N - 1 coordinates that parametrize the collapse set near each minimizer. They were chosen
# once, in floating point, as coordinates with a well-conditioned complementary Jacobian block (all
# circulations but one, plus one position); the choice cannot affect soundness, only success.
CHART = {
    3: ['G2', 'x2'],
    4: ['x4', 'G2', 'G3'],
    5: ['x2', 'G2', 'G3', 'G4'],
    6: ['x1', 'G2', 'G4', 'G5', 'G6'],
}


def dec(x, d):
    """A rigorous decimal interval [a, b] with d digits after the point that contains the ball x."""
    s = fmpz(10)**d
    half = arb(1)/2

    def fl(t):      # an integer k <= every point of the ball t (rad(t) < 1/4 assumed)
        k = t.floor().unique_fmpz()
        if k is None:                 # t straddles an integer: floor(t - 1/2) is still a lower bound
            k = (t - half).floor().unique_fmpz()
        return k

    def ce(t):      # an integer k >= every point of the ball t
        k = t.ceil().unique_fmpz()
        if k is None:
            k = (t + half).ceil().unique_fmpz()
        return k
    lo = fl(x.lower()*s)
    hi = ce(x.upper()*s)

    def f(k):
        neg = k < 0
        q, r = divmod(int(abs(k)), int(s))
        return ('-' if neg else '') + '%d.%0*d' % (q, d, r)
    return '[%s, %s]' % (f(lo), f(hi))


def rat(x, d):
    """The rational with d decimals nearest to x (an exact choice of chart value)."""
    s = 10**d
    k = (arb(x)*s + arb(0.5)).floor().unique_fmpz()
    return fmpq(k, s)


def full_from(base, U, u):
    full = list(base)
    for pos, i in enumerate(U):
        full[i] = u[pos]
    return full


# ------------------------------------------------------------------------------------------------
#  the Euler model and its rigorous side conditions on a box
# ------------------------------------------------------------------------------------------------
def side_checks(N, full, lam=None):
    x, y, G, t = V.unpack_full(full, N)
    c, kk = lam if lam is not None else (arb(1), 2)
    P = t*kk/2                     # lam = c (k t - i)  ->  P = Re lam / (2 |Im lam|) = k t / 2
    out = {}
    out['all_Gamma_nonzero'] = all((g > 0) or (g < 0) for g in G)
    Gt = sum(G, arb(0))
    out['sum_Gamma'] = Gt.str(25, radius=True)
    out['sum_Gamma_nonzero'] = bool((Gt > 0) or (Gt < 0))
    d2 = []
    for j in range(N):
        for k in range(j + 1, N):
            d2.append((x[j] - x[k])**2 + (y[j] - y[k])**2)
    dmin = min(d.lower() for d in d2)
    out['min_pair_distance_lower_bound'] = arb(dmin).sqrt().lower().str(10, radius=False) if dmin > 0 else '0'
    out['pairwise_distances_positive'] = all(d > 0 for d in d2)
    r2 = [x[j]**2 + y[j]**2 for j in range(N)]
    out['min_abs_z_lower_bound'] = arb(min(r.lower() for r in r2)).sqrt().lower().str(10, radius=False)
    out['no_vortex_at_collision_point'] = all(r > 0 for r in r2)
    Mx = sum((G[j]*x[j] for j in range(N)), arb(0))
    My = sum((G[j]*y[j] for j in range(N)), arb(0))
    out['sum_Gamma_z_enclosure'] = '%s + i %s' % (Mx.str(5, radius=True), My.str(5, radius=True))
    out['sum_Gamma_z_contains_0'] = bool(Mx.contains(0) and My.contains(0))
    S = sum((G[j]*G[k] for j in range(N) for k in range(j + 1, N)), arb(0))
    I = sum((G[j]*r2[j] for j in range(N)), arb(0))
    out['S_pairs_enclosure'] = S.str(5, radius=True)
    out['S_contains_0'] = bool(S.contains(0))
    out['I_enclosure'] = I.str(5, radius=True)
    out['I_contains_0'] = bool(I.contains(0))
    out['Im_lambda'] = '-1 (exact, gauge)' if lam is None else '-c = %s (gauge)' % (-c).str(20, radius=True)
    out['P_ball'] = P
    out['P'] = P.str(60, radius=True)
    out['P_decimal'] = dec(P, 50)
    out['P_below_sqrt3_over_2'] = bool(P < SQRT3_2)
    out['P_above_sqrt3_over_2'] = bool(P > SQRT3_2)
    out['P_positive'] = bool(P > 0)
    # the ratio lam_j = w_j / conj(z_j) = w_j z_j/|z_j|^2 for each j; all must enclose lam
    ok = True
    for j in range(N):
        wr = arb(0)
        wi = arb(0)
        for k in range(N):
            if k == j:
                continue
            a = x[j] - x[k]
            b = y[j] - y[k]
            m = a*a + b*b
            wr += G[k]*a/m
            wi -= G[k]*b/m
        lr = (wr*x[j] - wi*y[j])/r2[j]
        li = (wr*y[j] + wi*x[j])/r2[j]
        ok &= bool(lr.overlaps(2*P*c) and li.overlaps(-c))
    out['lambda_j_contain_2P_minus_i'] = ok
    return out


GENUINE = ['all_Gamma_nonzero', 'sum_Gamma_nonzero', 'pairwise_distances_positive', 'no_vortex_at_collision_point',
           'sum_Gamma_z_contains_0', 'S_contains_0', 'I_contains_0', 'lambda_j_contain_2P_minus_i', 'P_positive']


class EulerModel:
    """conj(dz_j/dt) = (1/2 pi i) sum_{k != j} Gamma_k/(z_j - z_k); collapse: w_j = lam conj(z_j)."""

    def __init__(self, N, lam=None):
        self.N = N
        self.lam = lam
        self.names = V.names(N)
        self.iP = V.idx_P(N)

    def eqs(self, full, free, order=1):
        return V.F_T(full, free, self.N, order=order, lam=self.lam)

    def side(self, full):
        return side_checks(self.N, full, lam=self.lam)

    def genuine(self, sc, below=True):
        return [k for k in GENUINE + (['P_below_sqrt3_over_2'] if below else []) if not sc[k]]


# ------------------------------------------------------------------------------------------------
#  existence at fixed rational parameters
# ------------------------------------------------------------------------------------------------
def solve_square(model, base, U, u0, radii_scan=True):
    """Newton + Krawczyk for the 2N equations in the 2N unknowns U (the other entries of `base` fixed).
    Returns a dict: ok, newton_residual, contraction, step and, on success, K (tight enclosure of the
    unknowns), rmax (the zero is unique in the box of radius 10^-rmax) and full."""
    def fun(u, want_jac):
        Ts = model.eqs(full_from(base, U, u), U, order=1)
        return [t.v for t in Ts], (V.jac_of(Ts) if want_jac else None)
    ut, res = V.newton(fun, u0)
    ok, K, X, info = V.krawczyk(fun, ut, arb('1e-40'))
    out = dict(ok=bool(ok), newton_residual=res, contraction=info['contraction'], step=info['step'])
    if not ok:
        return out
    K = V.krawczyk_tighten(fun, K)
    rmax = None
    if radii_scan:
        for k in range(1, 41):
            if V.krawczyk(fun, ut, arb(10)**(-k))[0]:
                rmax = k
                break
    out.update(K=K, rmax=rmax, full=full_from(base, U, K))
    return out


def existence(model, vstar, chart_names, fixed_vals):
    """vstar: full vector near a solution; the chart coordinates are fixed at fixed_vals (fmpq); the
    other 2N coordinates (P among them) are the unknowns."""
    n = len(vstar)
    S = [model.names.index(s) for s in chart_names]
    U = [i for i in range(n) if i not in S]
    base = list(vstar)
    for i, q in zip(S, fixed_vals):
        base[i] = arb(q)
    r = solve_square(model, base, U, [vstar[i] for i in U])
    r['U'] = U
    if r['ok']:
        r['side'] = model.side(r['full'])
        r['enclosure'] = [(model.names[i], r['K'][p]) for p, i in enumerate(U)]
    return r


# ------------------------------------------------------------------------------------------------
#  the Lagrange (KKT) system for min P on {F = 0}, and the second-order test
# ------------------------------------------------------------------------------------------------
def kkt_fun(model, base, free, ow=1):
    n = len(free)
    m = 2*model.N
    pP = free.index(model.iP)

    def fun(w, want_jac):
        v = w[:n]
        mu = w[n:]
        Ts = model.eqs(full_from(base, free, v), free, order=2 if want_jac else 1)
        J = V.jac_of(Ts)
        Fv = [t.v for t in Ts]
        g = [sum((J[r, c]*mu[r] for r in range(m)), arb(0)) for c in range(n)]
        g[pP] = g[pP] - ow
        vals = Fv + g
        if not want_jac:
            return vals, None
        M = arb_mat(m + n, m + n)
        for r in range(m):
            for c in range(n):
                M[r, c] = J[r, c]
        Hphi = arb_mat(n, n)
        for r in range(m):
            if Ts[r].H is not None:
                Hphi = Hphi + Ts[r].H*mu[r]
        for i in range(n):
            for c in range(n):
                M[m + i, c] = Hphi[i, c]
            for r in range(m):
                M[m + i, n + r] = J[r, i]
        return vals, M
    return fun


def reduced_hessian(model, base, free, w, chart_idx):
    """An interval enclosure of the Hessian of p(s) = P(u(s), s) in the chart s = v[chart], for all
    (v, mu) in the box w, and the Gram matrix Z^T Z of the chart's tangent basis. Raises
    ZeroDivisionError if J_U is not provably invertible on the box."""
    n = len(free)
    m = 2*model.N
    v = w[:n]
    mu = w[n:]
    Ts = model.eqs(full_from(base, free, v), free, order=2)
    J = V.jac_of(Ts)
    HL = arb_mat(n, n)
    for r in range(m):
        HL = HL - Ts[r].H*mu[r]                       # Hessian of L = ow P - mu.F
    Sp = [free.index(i) for i in chart_idx]
    Up = [p for p in range(n) if p not in Sp]
    JU = arb_mat(m, len(Up))
    JS = arb_mat(m, len(Sp))
    for r in range(m):
        for a, p in enumerate(Up):
            JU[r, a] = J[r, p]
        for a, p in enumerate(Sp):
            JS[r, a] = J[r, p]
    Am = JU.solve(JS)                                 # succeeds only if every matrix in J_U is invertible
    d = len(Sp)
    Z = arb_mat(n, d)                                 # Z = [-J_U^{-1} J_S; I] in the (U, S) ordering
    for a, p in enumerate(Up):
        for b in range(d):
            Z[p, b] = -Am[a, b]
    for b, p in enumerate(Sp):
        Z[p, b] = arb(1)
    return V.sym(Z.transpose()*HL*Z), V.sym(Z.transpose()*Z)


def pencil_eigs(Hred, Gram):
    """Certified enclosures [lo, hi] of the eigenvalues of the pencil (Hred, Gram), i.e. of the reduced
    Hessian in an orthonormal basis of the tangent space: exactly i eigenvalues lie below lo and i + 1
    below hi, by Jacobi inertia counts of Hred - s Gram. The bracketing values come from floating point."""
    d = Hred.nrows()
    Hm = np.array([[float(Hred[i, j].mid()) for j in range(d)] for i in range(d)])
    Gm = np.array([[float(Gram[i, j].mid()) for j in range(d)] for i in range(d)])
    L = np.linalg.cholesky(Gm)
    Li = np.linalg.inv(L)
    th = np.sort(np.linalg.eigvalsh(Li @ Hm @ Li.T))
    encl = []
    for i, t in enumerate(th):
        for rel in (1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1):
            lo = arb(float(t) - rel*abs(float(t)))
            hi = arb(float(t) + rel*abs(float(t)))
            ok = (V.neg_count(Hred - Gram*lo) == i) and (V.neg_count(Hred - Gram*hi) == i + 1)
            if ok:
                break
        encl.append((lo, hi, ok))
    return encl


def kkt(model, vstar, free, chart_names, ow=1, mu0=None, radii_scan=True):
    """vstar: full vector near the minimizer; free: the indices that are unknowns (the rest fixed at
    vstar's values, which must be exact or balls around exact values). Returns a dict."""
    N = model.N
    n = len(free)
    m = 2*N
    base = list(vstar)
    fun = kkt_fun(model, base, free, ow=ow)
    v0 = [vstar[i] for i in free]
    if mu0 is None:
        J = V.mid_mat(V.jac_of(model.eqs(base, free, order=1)))
        eP = arb_mat(n, 1)
        eP[free.index(model.iP), 0] = arb(ow)
        mu = (J*J.transpose()).solve(J*eP)
        mu0 = [mu[i, 0].mid() for i in range(m)]
    wt, res = V.newton(fun, v0 + list(mu0))
    ok, K, X, info = V.krawczyk(fun, wt, arb('1e-40'))
    out = dict(ok=bool(ok), unknowns=n + m, newton_residual=res, contraction=info['contraction'])
    if not ok:
        return out
    K = V.krawczyk_tighten(fun, K)
    rmax = None
    if radii_scan:
        for k in range(1, 41):
            if V.krawczyk(fun, wt, arb(10)**(-k))[0]:
                rmax = k
                break
    full = full_from(base, free, K[:n])
    chart_idx = [model.names.index(c) for c in chart_names]
    # second-order test on the tight box (it contains the KKT point), and on the largest box of radius
    # 10^-k (k >= rmax, so inside the uniqueness box) on which Z^T (Hess L) Z is positive definite at
    # every (v, mu) of the box
    boxes = [('tight', None, K)]
    if rmax:
        for k in range(rmax, 41):
            bx = [arb(a.mid(), arb(10)**(-k)) for a in wt]
            try:
                Hred, _ = reduced_hessian(model, base, free, bx, chart_idx)
            except ZeroDivisionError:
                continue
            if all(x > 0 for x in V.leading_minors(Hred)):
                boxes.append(('box', k, bx))
                break
    so = []
    for label, k, box in boxes:
        rec = dict(box=label, k=k)
        try:
            Hred, Gram = reduced_hessian(model, base, free, box, chart_idx)
        except ZeroDivisionError:
            rec.update(J_U_invertible=False, PD=False)
            so.append(rec)
            continue
        D = V.leading_minors(Hred)
        rec.update(J_U_invertible=True, minors=D, PD=all(x > 0 for x in D))
        if label == 'tight':
            rec['eigs'] = pencil_eigs(Hred, Gram)
        so.append(rec)
    out.update(rmax=rmax, K=K, full=full, side=model.side(full), second_order=so, mu=K[n:],
               enclosure=[(model.names[i], K[p]) for p, i in enumerate(free)])
    return out
