"""Computer-assisted proof: the pentagonal bipyramid is a strict local minimum, modulo
rotations, of the logarithmic energy of 7 points on the unit sphere.

Exact part (arithmetic in K = Q(sin 2pi/5), no rounding anywhere):
  E1  the gradient of the reduced energy F at the bipyramid is 0;
  E2  the Hessian H has rank 9; kernel basis N (11 x 2) with H N = 0; complement C (11 x 9)
      spanning range(H), C^T N = 0;  A = C^T H C is positive definite, A - lam0 I > 0 (exact LDL);
  E3  the cubic F3(N xi) vanishes identically;
  E4  eta*(xi) = -A^{-1} b(xi), b_a(xi) = D F3(N xi)[C e_a];  effective quartic
      q(xi) = F4(N xi) - 1/2 b(xi)^T A^{-1} b(xi), exact coefficients.
Rigorous-enclosure part (Arb ball arithmetic):
  R1  q(u) >= kappa0 for all unit u (interval subdivision of the circle);
  R2  along every ray xi = r u, the reduced function phi_u(r) = F(N r u + C eta*(r u)) - F(0) has
      Taylor coefficients 0,0,0,0,q(u) (exact identity) and enclosures of a_5..a_J (Arb power
      series over arcs of u), plus a Cauchy tail bound; hence F(w(xi)) - F(0) >= kappa1 |xi|^4;
  R3  similarly the gradient g1(xi) = C^T grad F(w(xi)) satisfies |g1(xi)| <= gamma |xi|^3;
  R4  on the box B containing every w = N xi + C(eta*(xi) + zeta), |xi| <= rho1, |zeta| <= rho2,
      lambda_min(C^T Hess F(w) C) >= mu > 0 (interval Hessian, Weyl bound, Arb LDL).
Conclusion: with G(xi, zeta) = F(N xi + C(eta*(xi) + zeta)) - F(0),
      G >= (mu/4) |zeta|^2 + (kappa1 - gamma^2 rho1^2 / mu) |xi|^4   on |xi|<=rho1, |zeta|<=rho2,
and the right side is > 0 unless xi = zeta = 0.

Usage:  python3 local_certificate.py            writes certificate.json
"""
import json
import math
import sys
import time
from fractions import Fraction as Qf

import flint
import numpy as np

import model
from kfield import K

arb = flint.arb
arb_series = flint.arb_series
PREC = 200
flint.ctx.prec = PREC


def A_(x):
    if isinstance(x, K):
        return x.arb()
    if isinstance(x, Qf):
        return arb(x.numerator) / x.denominator
    return arb(x)


def ipow(x, e):
    """Integer power by repeated multiplication (arb's ** returns nan for balls containing 0)."""
    r = arb(1)
    for _ in range(e):
        r = r * x
    return r


class CertificationError(Exception):
    pass


def require(cond, msg):
    """A proof step: never an assert (asserts vanish under python -O)."""
    if not cond:
        raise CertificationError(msg)


def up(x):
    require(x.is_finite(), "non-finite ball where an upper bound is needed")
    return arb(x.upper())


def umax(*xs):
    """Largest of several upper bounds.  Each ball is first replaced by its (exact) upper endpoint, so
    the comparison is always decidable and a nan can never be silently dropped (referee issue D1/D2)."""
    ups = [up(x) for x in xs]
    best = ups[0]
    for u in ups[1:]:
        if u > best:
            best = u
    return best


def lo(x):
    return arb(x.lower())


# ---------------------------------------------------------------- exact linear algebra over K
def rref(M):
    M = [row[:] for row in M]
    rows, cols = len(M), len(M[0])
    piv = []
    r = 0
    for c in range(cols):
        p = next((i for i in range(r, rows) if not M[i][c].is_zero()), None)
        if p is None:
            continue
        M[r], M[p] = M[p], M[r]
        inv = M[r][c].inv()
        M[r] = [x * inv for x in M[r]]
        for i in range(rows):
            if i != r and not M[i][c].is_zero():
                f = M[i][c]
                M[i] = [x - f * y for x, y in zip(M[i], M[r])]
        piv.append(c)
        r += 1
        if r == rows:
            break
    return M, piv


def inverse(M):
    n = len(M)
    aug = [M[i][:] + [K(1 if i == j else 0) for j in range(n)] for i in range(n)]
    R, piv = rref(aug)
    require(piv[:n] == list(range(n)), "singular")
    return [row[n:] for row in R]


def ldl_positive(M):
    """Exact LDL^T over K.  Positive definite iff every pivot is > 0."""
    n = len(M)
    A = [row[:] for row in M]
    pivots = []
    for k in range(n):
        d = A[k][k]
        pivots.append(d)
        if d.sign() <= 0:
            return pivots, False
        dinv = d.inv()
        for i in range(k + 1, n):
            f = A[i][k] * dinv
            if f.is_zero():
                continue
            for j in range(k + 1, n):
                A[i][j] = A[i][j] - f * A[k][j]
    return pivots, True


def arb_ldl_positive(M):
    """LDL^T in ball arithmetic; True only if every pivot is certainly > 0 (then M > 0)."""
    n = len(M)
    A = [row[:] for row in M]
    for k in range(n):
        d = A[k][k]
        if not d > 0:
            return False
        for i in range(k + 1, n):
            f = A[i][k] / d
            for j in range(k + 1, n):
                A[i][j] = A[i][j] - f * A[k][j]
    return True


def dot(u, v):
    return sum((a * b for a, b in zip(u, v)), K(0))


def gram_schmidt(vs):
    """Exact Gram-Schmidt over K; each vector then scaled by a rational close to 1/norm."""
    out = []
    for v in vs:
        w = v[:]
        for u in out:
            f = dot(w, u) / dot(u, u)
            w = [a - f * b for a, b in zip(w, u)]
        nrm = float(dot(w, w)) ** 0.5
        sc = Qf(round(10 ** 6 / nrm), 10 ** 6)
        out.append([a * sc for a in w])
    return out


# ---------------------------------------------------------------- polynomial helpers
def deriv(p, i):
    out = {}
    for m, c in p.items():
        if m[i]:
            mm = list(m)
            mm[i] -= 1
            out[tuple(mm)] = c * m[i]
    return out


def subst(p, forms, nnew):
    """Substitute w_i = forms[i] (polynomials over nnew variables) into p, exactly."""
    zero = tuple([0] * nnew)
    cache = {}

    def mul(a, b):
        r = {}
        for m1, x in a.items():
            for m2, y in b.items():
                m = tuple(s + t for s, t in zip(m1, m2))
                r[m] = r.get(m, K(0)) + x * y
        return {m: c for m, c in r.items() if not c.is_zero()}

    def power(i, e):
        if (i, e) not in cache:
            cache[(i, e)] = {zero: K(1)} if e == 0 else mul(power(i, e - 1), forms[i])
        return cache[(i, e)]

    out = {}
    for m, c in p.items():
        term = {zero: c}
        for i, e in enumerate(m):
            if e:
                term = mul(term, power(i, e))
        for mm, a in term.items():
            out[mm] = out.get(mm, K(0)) + a
    return {m: c for m, c in out.items() if not c.is_zero()}


_dcache = {}


def deriv_arb(P, i):
    key = (id(P), i)
    if key in _dcache and _dcache[key][0] is P:
        return _dcache[key][1]
    out = {}
    for m, c in P.items():
        if m[i]:
            mm = list(m)
            mm[i] -= 1
            out[tuple(mm)] = c * m[i]
    _dcache[key] = (P, out)
    return out


def ev_arb(P, box):
    v = arb(0)
    for m, a in P.items():
        t = a
        for i, e in enumerate(m):
            if e:
                t = t * ipow(box[i], e)
        v += t
    return v


def ev2(p, c, s):
    v = arb(0)
    for m, a in p.items():
        v += A_(a) * ipow(c, m[0]) * ipow(s, m[1])
    return v


# ---------------------------------------------------------------- the certificate
def main(out="certificate.json", J=16, perturb=None, quiet=False):
    """perturb: optional exact polynomial (dict over the 11 chart variables, K coefficients, all
    terms of degree >= 3) added to F.  Used for the negative / positive controls."""
    log = (lambda *a: None) if quiet else print
    tstart = time.time()
    n = model.NV
    F, T = model.taylor(4)
    if perturb:
        for m, c in perturb.items():
            assert sum(m) >= 2
            F[m] = F.get(m, K(0)) + c
            if F[m].is_zero():
                del F[m]
    Fk = {k: model.homog(F, k) for k in range(0, 5)}
    assert not Fk[0]
    res = {"ok": False}
    # E1
    if Fk[1]:
        log("gradient not zero: not a critical point")
        res["reason"] = "gradient"
        return res
    log("[E1] gradient of F at the bipyramid is exactly 0")
    # E2
    H = [[K(0)] * n for _ in range(n)]
    for m, c in Fk[2].items():
        i, j = [i for i, e in enumerate(m) for _ in range(e)]
        if i == j:
            H[i][i] = 2 * c
        else:
            H[i][j] = c
            H[j][i] = c
    R, piv = rref(H)
    free = [j for j in range(n) if j not in piv]
    log("[E2] Hessian rank %d, kernel dimension %d" % (len(piv), len(free)))
    if len(free) != 2:
        res["reason"] = "kernel dimension %d" % len(free)
        return res
    Nraw = []
    for f in free:
        v = [K(0)] * n
        v[f] = K(1)
        for r, p in enumerate(piv):
            v[p] = -R[r][f]
        Nraw.append(v)
    Craw = [[H[i][p] for i in range(n)] for p in piv]
    Ncol = gram_schmidt(Nraw)
    Ccol = gram_schmidt(Craw)
    N = [[Ncol[a][i] for a in range(2)] for i in range(n)]
    Cm = [[Ccol[a][i] for a in range(9)] for i in range(n)]
    for i in range(n):
        for a in range(2):
            require(sum((H[i][j] * N[j][a] for j in range(n)), K(0)).is_zero(), "H N != 0")
    for a in range(2):
        for b_ in range(9):
            require(dot(Ncol[a], Ccol[b_]).is_zero(), "C^T N != 0")
    HC = [[sum((H[i][j] * Ccol[b_][j] for j in range(n)), K(0)) for i in range(n)] for b_ in range(9)]
    Am = [[dot(Ccol[a], HC[b_]) for b_ in range(9)] for a in range(9)]
    pivots, pd = ldl_positive(Am)
    if not pd:
        log("[E2] Hessian on the complement is not positive definite: saddle")
        res["reason"] = "Hessian indefinite"
        return res
    eig = np.linalg.eigvalsh(np.array([[float(x) for x in r] for r in Am]))
    lo_l, hi_l = Qf(0), Qf(int(eig[0] * 10 ** 6) + 1, 10 ** 6)
    for _ in range(20):
        mid = (lo_l + hi_l) / 2
        _, ok = ldl_positive([[Am[i][j] - (K(mid) if i == j else K(0)) for j in range(9)] for i in range(9)])
        lo_l, hi_l = (mid, hi_l) if ok else (lo_l, mid)
    lam0 = lo_l
    log("[E2] H N = 0 and C^T N = 0 exactly; A = C^T H C > %.6f I by exact LDL (numerical min eig %.6f)"
        % (float(lam0), eig[0]))
    # E3
    formsN = []
    for i in range(n):
        f = {}
        if not N[i][0].is_zero():
            f[(1, 0)] = N[i][0]
        if not N[i][1].is_zero():
            f[(0, 1)] = N[i][1]
        formsN.append(f)
    F3N = subst(Fk[3], formsN, 2)
    res["_internal"] = {"Ncol": Ncol, "Ccol": Ccol}
    if F3N:
        log("[E3] cubic on the kernel is not zero: not a local minimum")
        res["reason"] = "cubic on kernel"
        return res
    log("[E3] cubic F3(N xi) vanishes identically")
    # E4
    dF3 = [subst(deriv(Fk[3], i), formsN, 2) for i in range(n)]
    bvec = []
    for a in range(9):
        acc = {}
        for i in range(n):
            if Cm[i][a].is_zero():
                continue
            for m, c in dF3[i].items():
                acc[m] = acc.get(m, K(0)) + Cm[i][a] * c
        bvec.append({m: c for m, c in acc.items() if not c.is_zero()})
    Ainv = inverse(Am)
    etastar = []   # eta*_a(xi) = - sum_b Ainv[a][b] b_b(xi)
    for a in range(9):
        acc = {}
        for b_ in range(9):
            for m, c in bvec[b_].items():
                acc[m] = acc.get(m, K(0)) - Ainv[a][b_] * c
        etastar.append({m: c for m, c in acc.items() if not c.is_zero()})
    q = subst(Fk[4], formsN, 2)
    for a in range(9):
        for m1, x in bvec[a].items():
            for m2, y in etastar[a].items():
                m = (m1[0] + m2[0], m1[1] + m2[1])
                q[m] = q.get(m, K(0)) + Qf(1, 2) * x * y   # -1/2 b^T A^-1 b = +1/2 b . eta*
    q = {m: c for m, c in q.items() if not c.is_zero()}
    log("[E4] effective quartic q(xi):", {m: round(float(c), 9) for m, c in sorted(q.items())})

    # ------------------------------------------------ R1: q(xi) >= kappa0 |xi|^4, exactly
    samples = [float(ev2(q, arb(math.cos(t)), arb(math.sin(t))).mid()) for t in np.linspace(0, 2 * math.pi, 721)]
    if min(samples) <= 0:
        log("[R1] effective quartic is not positive definite (min %.4g): the test fails" % min(samples))
        res.update(reason="quartic not positive definite", q_min=min(samples))
        res["_internal"]["q"] = q
        return res
    if any(m[0] % 2 or m[1] % 2 for m in q):
        res["reason"] = "quartic has odd terms; exact positivity test not implemented"
        return res
    # q - kappa0 (xi1^2 + xi2^2)^2 = alpha X^2 + beta X Y + gamma Y^2 with X = xi1^2, Y = xi2^2 >= 0
    kappa0q = Qf(int(min(samples) * 0.999 * 10 ** 6), 10 ** 6)
    al = q.get((4, 0), K(0)) - kappa0q
    be = q.get((2, 2), K(0)) - 2 * kappa0q
    ga = q.get((0, 4), K(0)) - kappa0q
    okq = al.sign() >= 0 and ga.sign() >= 0 and (be.sign() >= 0 or (4 * al * ga - be * be).sign() >= 0)
    if not okq:
        res["reason"] = "R1 failed"
        return res
    kappa0 = A_(kappa0q)
    # is q exactly |N xi|^4 / 10 ?  (N has orthogonal columns with squared norms g1, g2)
    g1, g2 = dot(Ncol[0], Ncol[0]), dot(Ncol[1], Ncol[1])
    exact_tenth = (q.get((4, 0), K(0)) == g1 * g1 / 10 and q.get((0, 4), K(0)) == g2 * g2 / 10
                   and q.get((2, 2), K(0)) == 2 * g1 * g2 / 10 and len(q) == 3)
    log("[R1] q(xi) >= %s |xi|^4, exactly (coefficient test in K); identity q(xi) = |N xi|^4/10 holds exactly: %s"
        % (kappa0q, exact_tenth))
    n_arcs = 96
    pi = arb.pi()
    arcs = [(2 * pi * k / n_arcs, 2 * pi * (k + 1) / n_arcs) for k in range(n_arcs)]

    # ------------------------------------------------ ball-arithmetic data
    NA = [[A_(N[i][a]) for a in range(2)] for i in range(n)]
    CA = [[A_(Cm[i][a]) for a in range(9)] for i in range(n)]
    terms = [(A_(c), A_(Q0), {m: A_(v) for m, v in P.items()}, tag) for c, Q0, P, tag in T]
    pert = {m: A_(v) for m, v in (perturb or {}).items()}

    def ser_poly(P, ws, prec):
        out = arb_series([0], prec=prec)
        for m, a in P.items():
            t = arb_series([a], prec=prec)
            for i, e in enumerate(m):
                for _ in range(e):
                    t = t * ws[i]
            out = out + t
        return out

    hmax = arb(0)
    for a, b in arcs:
        t = arb((a + b) / 2, ((b - a) / 2).upper() * 1.000001)   # covers [a, b]
        e = [ev2(etastar[k], t.cos(), t.sin()) for k in range(9)]
        hmax = umax(hmax, up(sum((ipow(up(abs(x)), 2) for x in e), arb(0)).sqrt()))
    nrowN = [up((ipow(NA[i][0], 2) + ipow(NA[i][1], 2)).sqrt()) for i in range(n)]
    nrowC = [up(sum((ipow(CA[i][a], 2) for a in range(9)), arb(0)).sqrt()) for i in range(n)]
    log("      |eta*(xi)| <= %.5f |xi|^2" % float(hmax.mid()))

    def polydisc_M(omega):
        """Bounds, over complex w with |w_i| <= omega_i, of |F(w) - F(0)| and of |d_i F(w)|."""
        M = arb(0)
        Mg = [arb(0)] * n
        for c, Q0, P, tag in terms:
            pm = ev_arb({m: abs(a) for m, a in P.items()}, omega)
            if not pm < 1:
                return None, None
            M += abs(c) * (-(1 - pm).log())     # |log(1+P)| <= -log(1-|P|)
            for i in range(n):
                dP = deriv_arb(P, i)
                if dP:
                    s = ev_arb({m: abs(a) for m, a in dP.items()}, omega)
                    Mg[i] = Mg[i] + abs(c) * s / (1 - pm)   # |dP/(1+P)|
        if pert:
            M += ev_arb({m: abs(a) for m, a in pert.items()}, omega)
            for i in range(n):
                dP = deriv_arb(pert, i)
                if dP:
                    Mg[i] = Mg[i] + ev_arb({m: abs(a) for m, a in dP.items()}, omega)
        return up(M), [up(x) for x in Mg]

    # ------------------------------------------------ R2, R3: series along rays, per arc
    def dpoly2(p, var):
        out = {}
        for m, c in p.items():
            if m[var]:
                mm = list(m)
                mm[var] -= 1
                out[tuple(mm)] = c * m[var]
        return out

    detastar = [(dpoly2(e, 0), dpoly2(e, 1)) for e in etastar]

    def ray_series(t, want_derivative):
        """Series in r of phi_u(r) and of C^T grad F(w(r u)), u = (cos t, sin t).  If
        want_derivative, return instead the t-derivatives of all coefficients (dual numbers)."""
        cu, su = t.cos(), t.sin()
        e = [ev2(etastar[k], cu, su) for k in range(9)]
        lin = [NA[i][0] * cu + NA[i][1] * su for i in range(n)]
        quad = [sum((CA[i][k] * e[k] for k in range(9)), arb(0)) for i in range(n)]
        ws = [arb_series([0, lin[i], quad[i]], prec=J + 1) for i in range(n)]
        if want_derivative:
            de = [ev2(detastar[k][0], cu, su) * (-su) + ev2(detastar[k][1], cu, su) * cu for k in range(9)]
            dlin = [-NA[i][0] * su + NA[i][1] * cu for i in range(n)]
            dquad = [sum((CA[i][k] * de[k] for k in range(9)), arb(0)) for i in range(n)]
            dws = [arb_series([0, dlin[i], dquad[i]], prec=J + 1) for i in range(n)]
        else:
            dws = [arb_series([0], prec=J + 1)] * n
        Z = arb_series([0], prec=J + 1)

        def spoly(P):
            v, d = Z, Z
            for m, a in P.items():
                tv, td = arb_series([a], prec=J + 1), Z
                for i, e_ in enumerate(m):
                    for _ in range(e_):
                        tv, td = tv * ws[i], td * ws[i] + tv * dws[i]
                v, d = v + tv, d + td
            return v, d

        phi, dphi = Z, Z
        grads = [(Z, Z) for _ in range(n)]
        allterms = [(c, P, True) for c, Q0, P, tag in terms] + ([(arb(1), pert, False)] if pert else [])
        for c, P, is_log in allterms:
            Pv, Pd = spoly(P)
            if is_log:
                onep = 1 + Pv
                inv = 1 / onep
                phi, dphi = phi + c * onep.log(), dphi + c * Pd * inv
                invd = -Pd * inv * inv
            else:
                phi, dphi = phi + Pv, dphi + Pd
            for i in range(n):
                dP = deriv_arb(P, i)
                if dP:
                    gv, gd = spoly(dP)
                    if is_log:
                        grads[i] = (grads[i][0] + c * gv * inv, grads[i][1] + c * (gd * inv + gv * invd))
                    else:
                        grads[i] = (grads[i][0] + gv, grads[i][1] + gd)
        which = 1 if want_derivative else 0
        ph = (dphi if want_derivative else phi).coeffs() + [arb(0)] * (J + 1)
        gco = []
        for k in range(9):
            gk = [arb(0)] * (J + 1)
            for i in range(n):
                cs = grads[i][which].coeffs()
                for j in range(min(J + 1, len(cs))):
                    gk[j] = gk[j] + CA[i][k] * cs[j]
            gco.append(gk)
        return ph[:J + 1], gco

    arc_series = []
    for a, b in arcs:
        t0 = arb(((a + b) / 2).mid())                           # exact expansion point (a dyadic)
        hw = umax(abs(t0 - a), abs(b - t0))                  # [a, b] is inside [t0 - hw, t0 + hw]
        co_m, g_m = ray_series(t0, False)                        # coefficients at t0
        co_d, g_d = ray_series(arb(t0, hw), True)                # t-derivatives over the whole arc
        span = arb(0, hw)
        co = [co_m[j] + co_d[j] * span for j in range(J + 1)]    # mean value theorem in t
        gco = [[g_m[k][j] + g_d[k][j] * span for j in range(J + 1)] for k in range(9)]
        tt = arb(t0, hw)
        arc_series.append((co, gco, ev2(q, tt.cos(), tt.sin()), co_m, g_m, ev2(q, t0.cos(), t0.sin())))
    checks = {"phi_0_to_3": arb(0), "phi_4_minus_q": arb(0), "g_0_to_2": arb(0)}
    for _, _, _, co, gco, qv in arc_series:     # sanity checks at thin midpoints
        for j in range(4):
            require(0 in co[j], "enclosure of a_%d does not contain 0" % j)
            checks["phi_0_to_3"] = umax(checks["phi_0_to_3"], abs(co[j]))
        require(0 in co[4] - qv, "enclosure of a_4 does not contain q(u)")
        checks["phi_4_minus_q"] = umax(checks["phi_4_minus_q"], abs(co[4] - qv))
        for gk in gco:
            for j in range(3):
                require(0 in gk[j], "enclosure of g_%d does not contain 0" % j)
                checks["g_0_to_2"] = umax(checks["g_0_to_2"], abs(gk[j]))
    # the identities a_0..a_3 = 0, a_4 = q, g_0..g_2 = 0 are used from the exact algebra; the enclosures
    # computed independently from the log terms must agree to high precision (referee issue D3)
    for k in checks:
        require(checks[k] < arb("1e-50"), "consistency check %s failed: %s" % (k, checks[k]))

    def ray_bounds(rho1, Rr):
        omega = [nrowN[i] * Rr + nrowC[i] * hmax * ipow(Rr, 2) for i in range(n)]
        M, Mg = polydisc_M(omega)
        if M is None:
            return None
        geo = ipow(rho1 / Rr, J + 1) / (1 - rho1 / Rr)
        tailF = M * geo
        tailG = [sum((abs(CA[i][k]) * Mg[i] for i in range(n)), arb(0)) * geo for k in range(9)]
        worst_phi, worst_g = arb(0), arb(0)
        for co, gco, qv, _, _, _ in arc_series:
            s = arb(0)
            for j in range(5, J + 1):
                s += abs(co[j]) * ipow(rho1, j - 4)
            worst_phi = umax(worst_phi, s)
            gsq = arb(0)
            for k in range(9):
                sa = arb(0)
                for j in range(3, J + 1):
                    sa += abs(gco[k][j]) * ipow(rho1, j - 3)
                sa += tailG[k] / ipow(rho1, 3)
                sa = up(sa)                  # nonnegative upper bound before squaring (referee D1)
                gsq += sa * sa
            worst_g = umax(worst_g, gsq.sqrt())
        kappa1 = lo(kappa0 - worst_phi - tailF / ipow(rho1, 4))
        return dict(kappa1=kappa1, gamma=worst_g, M=M, tailF=tailF)

    # ------------------------------------------------ R4: interval Hessian on the box
    lamA = A_(lam0)
    # |C|_2^2 = lambda_max(C^T C) <= 1 + |C^T C - I|_F   (C^T C exact in K)
    CtC_dev = arb(0)
    for a_ in range(9):
        for b_ in range(9):
            v = A_(dot(Ccol[a_], Ccol[b_]) - (1 if a_ == b_ else 0))
            CtC_dev += v * v
    C2 = up(1 + CtC_dev.sqrt())
    absC = [[abs(CA[i][a]) for a in range(9)] for i in range(n)]

    def hess_box(beta):
        """lambda_min(C^T Hess F(w) C) >= lam0 - |C^T (Hess F(w) - H) C|_F on the box |w_i| <= beta_i,
        with |d_ij F(w) - d_ij F(0)| <= sum_k sup_box |d_ijk F| beta_k (mean value theorem).
        For f = log(1+P), P quadratic:  f_ijk = -(P_ij P_k + P_ik P_j + P_jk P_i)/(1+P)^2 + 2 P_i P_j P_k/(1+P)^3."""
        box = [arb(0, x) for x in beta]
        Dm = [[arb(0)] * n for _ in range(n)]
        for c, Q0, P, tag in terms:
            inv = 1 / (1 + ev_arb(P, box))
            if not inv.is_finite():
                return None
            inv2, inv3 = inv * inv, inv * inv * inv
            d1 = [ev_arb(deriv_arb(P, i), box) for i in range(n)]
            d2 = [[ev_arb(deriv_arb(deriv_arb(P, i), j), box) for j in range(n)] for i in range(n)]
            vars_ = [i for i in range(n) if deriv_arb(P, i)]
            for i in vars_:
                for j in vars_:
                    acc = arb(0)
                    for k in vars_:
                        f3 = -(d2[i][j] * d1[k] + d2[i][k] * d1[j] + d2[j][k] * d1[i]) * inv2 \
                             + 2 * d1[i] * d1[j] * d1[k] * inv3
                        acc += abs(f3) * beta[k]
                    Dm[i][j] = Dm[i][j] + abs(c) * acc
        if pert:
            for i in range(n):
                for j in range(n):
                    for k in range(n):
                        d3 = deriv_arb(deriv_arb(deriv_arb(pert, i), j), k)
                        if d3:
                            Dm[i][j] = Dm[i][j] + abs(ev_arb(d3, box)) * beta[k]
        Dm = [[up(x) for x in row] for row in Dm]
        # |C^T Delta C|_2 <= |C|_2^2 |Delta|_2 <= |C|_2^2 |Dm|_2, and |Dm|_2 <= min(Frobenius, max row sum)
        fro = up(sum((x * x for row in Dm for x in row), arb(0)).sqrt())
        rows = max(up(sum(row, arb(0))) for row in Dm)
        dn = fro if fro < rows else rows
        return lo(lamA - C2 * dn)

    best = None
    for Rr in [arb(x) / 100 for x in (4, 6, 8, 10, 12, 15)]:
        for rho1 in [arb(x) / 1000 for x in (1, 2, 4, 6, 8, 10, 13, 16, 20, 25, 30, 40)]:
            if not rho1 < Rr * arb("0.9"):
                continue
            rb = ray_bounds(rho1, Rr)
            if rb is None or not rb["kappa1"] > 0:
                continue
            if best is None or float(rho1.mid()) > best[0]:
                best = (float(rho1.mid()), rho1, Rr, rb)
    if best is None:
        log("[R2/R3] no admissible radius")
        res["reason"] = "rays"
        return res
    _, rho1, Rr, rb = best
    log("[R2] enclosures (each must contain 0): |a_0..a_3| <= %.1e, |a_4 - q(u)| <= %.1e, |g_0..g_2| <= %.1e"
        % tuple(float(checks[k].mid()) for k in ("phi_0_to_3", "phi_4_minus_q", "g_0_to_2")))
    # the chart ball is limited by |xi| <= fx |w| and |zeta| <= fe |w| + h fx^2 |w|^2 (see below)
    Mfull = [N[i] + Cm[i] for i in range(n)]
    Minv = inverse(Mfull)
    fx = up(sum((ipow(A_(Minv[a][i]), 2) for a in range(2) for i in range(n)), arb(0)).sqrt())
    fe = up(sum((ipow(A_(Minv[a][i]), 2) for a in range(2, n) for i in range(n)), arb(0)).sqrt())

    def ball_radius(r1, r2):
        a_, b_, c_ = float((hmax * fx * fx).mid()), float(fe.mid()), -float(r2.mid())
        root = (-b_ + math.sqrt(b_ * b_ - 4 * a_ * c_)) / (2 * a_)
        return min(float((r1 / fx).mid()), root)

    found = None
    grid1 = [arb(x) / 10000 for x in (2, 3, 5, 7, 10, 15, 20, 30, 40, 50, 60, 80, 100, 130, 160, 200, 300, 400)]
    grid2 = [arb(x) / 100000 for x in (2, 5, 10, 20, 30, 50, 70, 100, 150, 200, 300, 400, 500, 700, 1000, 1500, 2000, 3000)]
    for r1 in grid1:
        if not r1 <= rho1:
            continue
        rbx = ray_bounds(r1, Rr)
        if rbx is None or not rbx["kappa1"] > 0:
            continue
        for rho2 in grid2:
            if found is not None and ball_radius(r1, rho2) <= found[6]:
                continue
            beta = [up(nrowN[i] * r1 + nrowC[i] * (hmax * ipow(r1, 2) + rho2)) for i in range(n)]
            mu = hess_box(beta)
            if mu is None or not mu > 0:
                continue
            final_x = lo(rbx["kappa1"] - ipow(rbx["gamma"], 2) * ipow(r1, 2) / mu)
            if final_x > 0:
                found = (r1, rho2, mu, rbx, final_x, beta, ball_radius(r1, rho2))
    if not found:
        log("[R4] no admissible box")
        res["reason"] = "hessian box"
        return res
    rho1, rho2, mu, rb, final_x, beta, _ = found
    log("[R2] phi_u(r) >= %.6f r^4 for 0 <= r <= %s  (Cauchy radius %s, M = %.3f, J = %d)"
        % (float(rb["kappa1"].mid()), rho1, Rr, float(rb["M"].mid()), J))
    log("[R3] |g1(xi)| <= %.5f |xi|^3 for |xi| <= %s" % (float(rb["gamma"].mid()), rho1))
    log("[R4] lambda_min(C^T Hess F(w) C) >= %.5f for |w_i| <= beta_i (max beta_i %.4f)"
        % (float(mu.mid()), max(float(b.mid()) for b in beta)))
    final_z = lo(mu / 4)
    log("PROVED: for |xi| <= %s and |zeta| <= %s:  F - F(0) >= %.5f |zeta|^2 + %.5f |xi|^4"
        % (rho1, rho2, float(final_z.mid()), float(final_x.mid())))
    a_, b_, c_ = float((hmax * fx * fx).mid()), float(fe.mid()), -float(rho2.mid())
    root = (-b_ + math.sqrt(b_ * b_ - 4 * a_ * c_)) / (2 * a_)
    rw = arb(float("%.3g" % (min(float((rho1 / fx).mid()), root) * 0.99)))
    require(up(fx * rw) <= rho1 and up(fe * rw + hmax * ipow(fx * rw, 2)) <= rho2, "chart ball not in domain")
    log("PROVED: every chart point w != 0 with |w|_2 <= %s has F(w) > F(0)" % rw)
    res = {
        "ok": True,
        "kernel_free_coordinates": [model.NAMES[j] for j in free],
        "N": [[str(x) for x in row] for row in N],
        "C": [[str(x) for x in row] for row in Cm],
        "lambda0_exact_lower_bound_of_A": str(lam0),
        "A_eigenvalues_numerical": [float(x) for x in eig],
        "quartic_q": {"%d,%d" % m: {"K_coeffs": [str(x) for x in c.c], "float": float(c)} for m, c in sorted(q.items())},
        "kappa0": str(kappa0), "q_equals_tenth_of_N_xi_to_the_4_exactly": exact_tenth, "kappa1": str(rb["kappa1"]),
        "gamma": str(rb["gamma"]), "mu": str(mu), "h": str(hmax),
        "rho_xi": str(rho1), "rho_zeta": str(rho2), "cauchy_R": str(Rr), "J": J,
        "tail_M": str(rb["M"]),
        "lower_bound_coeff_zeta2": str(final_z), "lower_bound_coeff_xi4": str(final_x),
        "chart_ball_radius": str(rw),
        "Minv_blocks_frobenius": [str(fx), str(fe)],
        "enclosure_checks": {k: str(v) for k, v in checks.items()},
        "seconds": round(time.time() - tstart, 1),
    }
    if out:
        with open(out, "w") as fh:
            json.dump(res, fh, indent=1)
        log("wrote %s (%.0fs)" % (out, time.time() - tstart))
    res["_internal"] = {"Ncol": Ncol, "Ccol": Ccol, "q": q}
    return res


if __name__ == "__main__":
    r = main()
    # for the unperturbed energy the exact identity q = |N xi|^4 / 10 must hold (Proposition 4)
    require(r.get("q_equals_tenth_of_N_xi_to_the_4_exactly") is True, "exact identity q = |N xi|^4/10 failed")
    sys.exit(0 if r.get("ok") else 1)
