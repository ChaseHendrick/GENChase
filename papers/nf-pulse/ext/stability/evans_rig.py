#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""RIGOROUS enclosures of the Evans function D(lam) of the fast pulse, for lam in a complex ball, in ball arithmetic.

Eigenvalue ODE (see evans_num.py):  phi' = A(xi, lam) phi,  A = A_c(lam) + sigma(xi) e4 e1^T,
    A_c = [[-k(lam+1), -k, k, 0], [eps k, -k lam, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]],   sigma = -S'(U) = -beta Y (1 - Y).
A_inf = A_c - s e4 e1^T.  nu = the eigenvalue of A_inf with Re nu > 0 (unique for Re lam > -delta0); nu_j the others,
v_j = (1, eps k/(nu_j + k lam), -s/(nu_j^2 - 1), -s nu_j/(nu_j^2 - 1)),  w_j = (1, -k/(nu_j + k lam), k nu_j/(nu_j^2 - 1),
k/(nu_j^2 - 1)) (right and left eigenvectors), V = [v_j], V^-1 = rows w_j^T/(w_j^T v_j).  v = v_u, w = w_u/(w_u^T v_u).
    D(lam) = psi^+(xi)^T phi^-(xi),  phi^- ~ e^{nu xi} v (xi -> -inf),  psi^+ ~ e^{-nu xi} w (xi -> +inf),  psi' = -A^T psi.
Pieces (each an enclosure valid for every lam in the ball and every pulse of the class of pulse_enclosure.py):
 1. nu_j by a complex Krawczyk test on the characteristic polynomial; Re nu_u > 0 > Re nu_j, four disjoint balls.
 2. Left tail (xi <= XI_MINUS): with g = S'(U) - s, G_L = int_{-inf}^{XI_MINUS} |g| <= S2 C_U t_- / lam_lo, and
    phi^- e^{-nu xi} = v + om,  |om_i| <= K_i4 G_L |v1| (1 + K14 G_L e^{K14 G_L}),  K_ij = sum_l |V_il| |V^-1_lj|
    (bounds sup_{t >= 0} |(e^{(A_inf - nu) t})_ij| because Re(nu_l - nu) <= 0; Gronwall on the Volterra equation).
 3. xi in [XI_MINUS, T_FAR]: phi~ = e^{-nu xi} phi^- solves phi~' = (A - nu) phi~; each step's transition matrix is
    enclosed by its Taylor polynomial (pulse Taylor coefficients on the recorded node box) plus a Lagrange remainder
    (pulse coefficients on the recorded a priori enclosure W, matrix a priori bound e^{N h} by Gronwall), and phi~ is
    propagated in Lohner's form phi~ = pbar + B r with B unitary (Gram-Schmidt of midpoints).
 4. Right tail (xi >= T_FAR): the pulse stays in the block B with L <= 0, so |y'| decays at rate m (block margin),
    |U| <= K_U |y'|, G_R <= S2 K_U eta0 / m, and psi^+ e^{nu xi} = w + om~, |om~_i| <= K_1i G_R |w4| (1 + K14 G_R e^{K14 G_R}).
 5. D = (w + om~)^T phi~(T_FAR).
"""
import os, sys, math, pickle, json, time
import _paths
from flint import arb, acb, acb_mat, arb_mat, ctx, fmpq
PREC = int(os.environ.get('NF_EVANS_PREC', '128'))
ctx.prec = PREC
import nfcore as nf, certify_rest as cr
ctx.prec = PREC

EORDER = int(os.environ.get('NF_EVANS_ORDER', '32'))
HMAX = float(os.environ.get('NF_EVANS_HMAX', '0.25'))


def deser(t):
    m, e, rm, re = t
    return arb(m) * arb(2) ** e + arb(0, arb(rm) * arb(2) ** re)


def aup(x):
    """upper bound of |x| (arb or acb) as an exact arb."""
    return arb(x.abs_upper())


def cball(z, r):
    """complex ball (rectangle) containing the disk |lam - z| <= r."""
    return acb(arb(z.real, r), arb(z.imag, r))


# ------------------------------------------------------------------ load the pulse records once (inherited by forks)
DATA = None


def load(path=None):
    global DATA
    ctx.prec = PREC
    d = pickle.load(open(path or (_paths.DATA + '/pulse_records.pkl'), 'rb'))
    recs = [(deser(a), deser(b), [deser(v) for v in hu], [deser(v) for v in W]) for a, b, hu, W in d['recs']]
    beta = arb(20)
    # merge consecutive records into steps of length <= HMAX, as long as the Taylor coefficients of sigma on the
    # merged a priori enclosure stay tame (a fat W makes the interval recursion blow up; then records are kept apart)
    steps = []
    i = 0

    def tame(sig, h):
        base = arb(1).max(aup(sig[0]))
        return all(bool(aup(sj) * arb(h) ** j <= 4 * base) for j, sj in enumerate(sig))
    while i < len(recs):
        t0, h, hull, W = recs[i]
        Yn = nf.taylor(hull[:5], hull[5], EORDER)[4]
        sig_W = conv_sigma(nf.taylor(W[:5], W[5], EORDER + 1)[4], beta)
        j = i + 1
        while j < len(recs) and float((h + recs[j][1]).mid()) <= HMAX + 1e-12:
            h2 = h + recs[j][1]
            W2 = [a.union(b) for a, b in zip(W, recs[j][3])]
            s2 = conv_sigma(nf.taylor(W2[:5], W2[5], EORDER + 1)[4], beta)
            if not tame(s2, h2):
                break
            h, W, sig_W = h2, W2, s2
            j += 1
        steps.append((t0, h, conv_sigma(Yn, beta), sig_W, hull, W))
        i = j
    info = d['info']
    # decay rate of |y'| for xi >= T_FAR.  The pulse stays in the block B of block.py with L = y1^2 - |y'|^2 <= 0
    # (L increases along orbits in B and tends to 0), and |U| <= K_U |y'| <= K_U eta0 there.  In the smaller block
    # |U| <= u_s the certified entrance margin (block.check, same T) gives d|y'|/dxi <= -m |y'|.
    import block as bl
    Tb, Tbinv = bl.setup()
    Ti = [[deser(v) for v in row] for row in d['Tinv']]
    K_U = aup(Ti[0][0]) + arb((Ti[0][1] ** 2 + Ti[0][2] ** 2 + Ti[0][3] ** 2).sqrt().upper())
    u_s = arb((K_U * deser(d['eta0'])).upper()) * 2
    kap_all = (1 / cr.C1).union(1 / cr.C2)
    ok_s, binfo_s = bl.check(Tb, Tbinv, (-u_s, u_s), kap_all)
    assert ok_s, binfo_s
    mrate_s = -max(arb(m) for m in binfo_s['entrance_margins(<0 needed)'])
    marg = [arb(m) for m in info['block']['entrance_margins(<0 needed)']]
    mrate_B = -(marg[0].max(marg[1]))
    assert mrate_B > 0 and mrate_s > 0
    info['small_block'] = {'u_s': u_s.str(10), 'margins': binfo_s['entrance_margins(<0 needed)'], 'cone_pd': binfo_s['cone_pd']}
    DATA = {'mrate': arb(mrate_s.lower()),'steps': steps, 'kappa': deser(d['kappa']), 'lam_u': deser(d['lam']), 'C_U': deser(d['C_U']),
            'eta0': deser(d['eta0']), 'Tinv': [[deser(v) for v in row] for row in d['Tinv']], 'info': info}
    return DATA


def conv_sigma(Y, beta):
    out = []
    for k in range(len(Y)):
        yy = sum((Y[j] * Y[k - j] for j in range(k + 1)), arb(0))
        out.append(-beta * (Y[k] - yy))
    return out


# ------------------------------------------------------------------ rest-state eigenstructure
def charpoly(nu, lam, k, s, eps):
    return (nu * nu - 1) * ((nu + k * (lam + 1)) * (nu + k * lam) + eps * k * k) + s * k * (nu + k * lam)


def dcharpoly(nu, lam, k, s, eps):
    a = (nu + k * (lam + 1)) * (nu + k * lam) + eps * k * k
    da = 2 * nu + k * (2 * lam + 1)
    return 2 * nu * a + (nu * nu - 1) * da + s * k


def dlam_charpoly(nu, lam, k, s, eps):
    return (nu * nu - 1) * k * (2 * nu + k * (2 * lam + 1)) + s * k * k


def d2charpoly(nu, lam, k, s, eps):
    a = (nu + k * (lam + 1)) * (nu + k * lam) + eps * k * k
    da = 2 * nu + k * (2 * lam + 1)
    return 2 * a + 4 * nu * da + 2 * (nu * nu - 1)


def dnulam_charpoly(nu, lam, k, s, eps):
    da = 2 * nu + k * (2 * lam + 1)
    return 2 * nu * k * da + 2 * k * (nu * nu - 1)


def krawczyk(z0, lam, k, s, eps, r0=None):
    """Ball X around z0 containing exactly one root of charpoly(., lam') for every lam' in the ball lam (complex
    Krawczyk test, K(X) in the interior of X; the radius is grown from the size of the Newton correction)."""
    z0 = acb(z0.real.mid(), z0.imag.mid())
    lc = acb(lam.real.mid(), lam.imag.mid())
    dz = dcharpoly(z0, lc, k, s, eps)
    Yinv = 1 / acb(dz.real.mid(), dz.imag.mid())
    # centred form in lam: p(z0, l) in p(z0, lc) + p_lam(z0, lam) (lam - lc)
    f0 = Yinv * (charpoly(z0, lc, k, s, eps) + dlam_charpoly(z0, lam, k, s, eps) * (lam - lc))
    r = arb(aup(f0).mid()) * 2 + arb(2) ** (-ctx.prec // 2)
    for _ in range(200):
        X = cball(z0, r)
        # centred form of p_nu on X x lam
        dpX = dcharpoly(z0, lc, k, s, eps) + d2charpoly(X, lam, k, s, eps) * (X - z0) + dnulam_charpoly(X, lam, k, s, eps) * (lam - lc)
        K = z0 - f0 + (1 - Yinv * dpX) * (X - z0)
        if X.contains_interior(K):
            return K
        r = r * arb('1.25')
        if r > 1:
            break
    raise ArithmeticError('Krawczyk failed at lam=%s' % lam)


def ref_roots(lam, k, s):
    import numpy as np
    lc = complex(float(lam.real.mid()), float(lam.imag.mid()))
    kf, sf = float(k.mid()), float(s.mid())
    a = np.poly1d([1, kf * (2 * lc + 1), kf * kf * lc * (lc + 1) + 0.1 * kf * kf])
    p = np.polymul(np.poly1d([1, 0, -1]), a) + np.poly1d([sf * kf, sf * kf * kf * lc])
    return sorted(np.roots(p.coeffs), key=lambda z: -z.real)


def eigen(lam, k, s, eps, depth=0, ref=None):
    """eigenstructure of A_inf on the ball lam; on failure the ball is split into four quarters (up to depth 7) and
    the hulls of the results are returned (K-constants are computed from these hulls, hence valid on all of lam)."""
    if ref is None:
        ref = ref_roots(lam, k, s)
    try:
        return eigen1(lam, k, s, eps, ref)
    except ArithmeticError:
        if depth >= 7:
            raise
    rr, ri = lam.real.rad(), lam.imag.rad()
    cr_, ci = lam.real.mid(), lam.imag.mid()
    res = None
    for sr in (-1, 1):
        for si in (-1, 1):
            sub = acb(arb(cr_) + sr * arb(rr) / 2 + arb(0, arb(rr) / 2), arb(ci) + si * arb(ri) / 2 + arb(0, arb(ri) / 2))
            r = eigen(sub, k, s, eps, depth + 1, ref)
            if res is None:
                res = r
            else:
                nus = [a.union(b) for a, b in zip(res[0], r[0])]
                V = [[a.union(b) for a, b in zip(ra, rb)] for ra, rb in zip(res[1], r[1])]
                Wr = [[a.union(b) for a, b in zip(ra, rb)] for ra, rb in zip(res[2], r[2])]
                res = (nus, V, Wr, res[3] and r[3])
    return res


def eigen1(lam, k, s, eps, ref=None):
    import numpy as np
    lc = complex(float(lam.real.mid()), float(lam.imag.mid()))
    kf, sf, ef = float(k.mid()), float(s.mid()), float(eps.mid())
    a = np.poly1d([1, kf * (2 * lc + 1), kf * kf * lc * (lc + 1) + ef * kf * kf])
    p = np.polymul(np.poly1d([1, 0, -1]), a) + np.poly1d([sf * kf, sf * kf * kf * lc])
    rts = sorted(np.roots(p.coeffs), key=lambda z: -z.real)
    if ref is not None:          # keep the labelling of the parent ball (match by distance)
        rts = [min(rts, key=lambda z: abs(z - r0)) for r0 in ref]
        assert len(set(rts)) == 4
    rad_lam = max(float(lam.real.rad()), float(lam.imag.rad()))
    nus = [krawczyk(acb(z.real, z.imag), lam, k, s, eps) for z in rts]
    ok = bool(nus[0].real > 0) and all(bool(n.real < 0) for n in nus[1:])
    for i in range(4):
        for j in range(i + 1, 4):
            ok &= not nus[i].overlaps(nus[j])
    V = [[None] * 4 for _ in range(4)]
    Wr = [[None] * 4 for _ in range(4)]
    for j, nu in enumerate(nus):
        vj = [acb(1), eps * k / (nu + k * lam), -s / (nu * nu - 1), -s * nu / (nu * nu - 1)]
        wj = [acb(1), -k / (nu + k * lam), k * nu / (nu * nu - 1), k / (nu * nu - 1)]
        dj = sum((wj[i] * vj[i] for i in range(4)), acb(0))
        for i in range(4):
            V[i][j] = vj[i]
            Wr[j][i] = wj[i] / dj
    for row in V + Wr:
        for x in row:
            if not (x.real.is_finite() and x.imag.is_finite()) or max(float(x.real.rad()), float(x.imag.rad())) > 0.05 * (1 + float(aup(x).mid())):
                raise ArithmeticError('eigenvector enclosure too wide')
    return nus, V, Wr, ok


# ------------------------------------------------------------------ one step: enclosure of the transition matrix
def eye4():
    return acb_mat([[1 if i == j else 0 for j in range(4)] for i in range(4)])


def zero4():
    return acb_mat(4, 4)


def add_row4(Mt, row):
    """Mt + e4 row^T."""
    return acb_mat([[Mt[i, c] + (row[c] if i == 3 else 0) for c in range(4)] for i in range(4)])


def conv_row(P, sig, kk):
    return [sum((P[kk - j][0, c] * sig[j] for j in range(kk + 1)), acb(0)) for c in range(4)]


def horner_mat(P, hA):
    S = P[-1]
    for Pk in reversed(P[:-1]):
        S = S * acb(hA) + Pk
    return S


def mat_bound(M):
    return max((sum((aup(M[i, j]) for j in range(4)), arb(0)) for i in range(4)), key=lambda x: float(x.mid()))


def step_matrices(M, Ml, sig_n, sig_W, h, order, deriv=True):
    """Enclosures over [0, h] of the transition matrix Phi of Phi' = (M + sigma e4 e1^T) Phi and (if deriv) of its
    lam-derivative Phi_l, Phi_l' = (M + sigma e4 e1^T) Phi_l + Ml Phi, Phi_l(0) = 0 (Ml = dM/dlam).
    Taylor polynomial at the node plus Lagrange remainder of the joint system on the a priori enclosures
    |Phi_ij(t)| <= e^{N t},  |Phi_l,ij(t)| <= t N_l e^{N t}  (Gronwall, N >= ||M + sigma e4 e1^T||_inf on W)."""
    hA = arb(h)
    P = [eye4()]
    Q = [zero4()]
    for kk in range(order):
        P.append(add_row4(M * P[kk], conv_row(P, sig_n, kk)) * acb(fmpq(1, kk + 1)))
        if deriv:
            Q.append(add_row4(Ml * P[kk] + M * Q[kk], conv_row(Q, sig_n, kk)) * acb(fmpq(1, kk + 1)))
    Phi = horner_mat(P, hA)
    Phil = horner_mat(Q, hA) if deriv else None
    # remainder
    Mw = add_row4(M, [sig_W[0], 0, 0, 0])
    N = mat_bound(Mw)
    R = arb(((N * hA).exp()).upper())
    WP = acb_mat([[acb(arb(0, R), arb(0, R)) for j in range(4)] for i in range(4)])
    PW = [WP]
    if deriv:
        Rl = arb((hA * mat_bound(Ml) * (N * hA).exp()).upper())
        WQ = acb_mat([[acb(arb(0, Rl), arb(0, Rl)) for j in range(4)] for i in range(4)])
        QW = [WQ]
    for kk in range(order + 1):
        PW.append(add_row4(M * PW[kk], conv_row(PW, sig_W, kk)) * acb(fmpq(1, kk + 1)))
        if deriv:
            QW.append(add_row4(Ml * PW[kk] + M * QW[kk], conv_row(QW, sig_W, kk)) * acb(fmpq(1, kk + 1)))
    fac = acb(hA ** (order + 1))
    rem = PW[order + 1] * fac
    remsz = max(float(aup(rem[a, b]).mid()) for a in range(4) for b in range(4))
    Phi = Phi + rem
    if deriv:
        reml = QW[order + 1] * fac
        remsz = max(remsz, max(float(aup(reml[a, b]).mid()) for a in range(4) for b in range(4)))
        Phil = Phil + reml
    return Phi, Phil, remsz


SUBCACHE = {}
PHI_TOL = float(os.environ.get('NF_EVANS_PHITOL', '1e-24'))
PULSE_P = 36


def subnode_sigmas(n_st, st, m):
    """sigma Taylor coefficients at the m sub-nodes of step n_st (sub-node boxes from the pulse Taylor polynomial at the
    node box plus its Lagrange remainder on W, as in prove_pulse.step_range_y)."""
    key = (n_st, m)
    if key in SUBCACHE:
        return SUBCACHE[key]
    t0, h, sig_n, sig_W, hull, W = st
    beta = arb(20)
    xk = nf.taylor(hull[:5], hull[5], PULSE_P)
    xW = nf.taylor(W[:5], W[5], PULSE_P + 1)
    hs = h / m
    out = [sig_n]
    for i in range(1, m):
        tau = hs * i
        box = [nf.horner(xk[c], tau) + xW[c][PULSE_P + 1] * tau ** (PULSE_P + 1) for c in range(5)]
        out.append(conv_sigma(nf.taylor(box, hull[5], EORDER)[4], beta))
    SUBCACHE[key] = (hs, out)
    return SUBCACHE[key]


def substeps(n_st, st, Mc, M, Ml, order, deriv):
    """[(Phi at the centre, Phi on the ball, Phi_lam on the ball)] for the step, subdivided (2, 4, ... 32 parts) until
    every remainder is below PHI_TOL."""
    t0, h, sig_n, sig_W, hull, W = st
    m = 1
    while True:
        if m == 1:
            parts = [(h, sig_n)]
        else:
            hs, sigs = subnode_sigmas(n_st, st, m)
            parts = [(hs, sg) for sg in sigs]
        out = []
        for hh, sg in parts:
            Pc, _, r1 = step_matrices(Mc, None, sg, sig_W, hh, order, deriv=False)
            if deriv:
                Pb, Pl, r2 = step_matrices(M, Ml, sg, sig_W, hh, order, deriv=True)
            else:
                Pb, Pl, r2 = Pc, None, 0.0
            if max(r1, r2) >= PHI_TOL and m < 32:
                break
            out.append((Pc, Pb, Pl))
        else:
            return out
        m *= 2


def gram_schmidt(A):
    n = A.nrows()
    cols = [[acb(A[i, j].real.mid(), A[i, j].imag.mid()) for i in range(n)] for j in range(n)]
    Q = []
    for c in cols:
        v = list(c)
        for _ in range(2):
            for q in Q:
                dot = sum((q[i].conjugate() * v[i] for i in range(n)), acb(0))
                v = [acb((v[i] - dot * q[i]).real.mid(), (v[i] - dot * q[i]).imag.mid()) for i in range(n)]
        nrm = sum((abs(vi) ** 2 for vi in v), arb(0)).sqrt()
        v = [acb((vi / nrm).real.mid(), (vi / nrm).imag.mid()) for vi in v]
        Q.append(v)
    return acb_mat([[Q[j][i] for j in range(n)] for i in range(n)])


def midv(x):
    return acb(x.real.mid(), x.imag.mid())


def matvec(M, v):
    return [sum((M[i, j] * v[j] for j in range(4)), acb(0)) for i in range(4)]


def tails(lam, k, s, eps, beta):
    """rest eigenstructure on the ball lam and the tail constants; returns None if the eigenstructure test fails."""
    Dd = DATA
    nus, V, Vi, ok_eig = eigen(lam, k, s, eps)
    if not ok_eig:
        return None
    nu = nus[0]
    v = [V[i][0] for i in range(4)]
    w = [Vi[0][i] for i in range(4)]
    K = [[sum((aup(V[i][l]) * aup(Vi[l][j]) for l in range(4)), arb(0)) for j in range(4)] for i in range(4)]
    K14 = K[0][3]

    def S2(ub):
        u = arb(0, ub)
        Su = nf.S(u)
        return aup(beta * beta * Su * (1 - Su) * (1 - 2 * Su))
    info = Dd['info']
    xi_minus = arb(info['xi_minus'])
    lam_lo = arb(Dd['lam_u'].lower())
    t_minus = arb(((Dd['lam_u'] * xi_minus).exp() / 4).upper())
    C_U = Dd['C_U']
    GL = S2(C_U * t_minus) * C_U * t_minus / lam_lo
    eL = K14 * GL * (K14 * GL).exp()
    om = [arb(0, (K[i][3] * GL * aup(v[0]) * (1 + eL)).upper()) for i in range(4)]
    Ti = Dd['Tinv']
    K_U = aup(Ti[0][0]) + arb((Ti[0][1] ** 2 + Ti[0][2] ** 2 + Ti[0][3] ** 2).sqrt().upper())
    eta0 = Dd['eta0']
    mrate = Dd['mrate']
    GR = S2(K_U * eta0) * K_U * eta0 / mrate
    eR = K14 * GR * (K14 * GR).exp()
    omt = [arb(0, (K[0][i] * GR * aup(w[3]) * (1 + eR)).upper()) for i in range(4)]
    return {'nu': nu, 'v': v, 'w': w, 'om': om, 'omt': omt, 'K14': K14, 'GL': GL, 'GR': GR, 'm': mrate}


def evans(lam, order=EORDER, detail=False):
    """lam: acb ball (a square, centre lc, half-width rho).  Returns (Dc, Dl, info) with
        D(l) in Dc + Dl (l - lc)  for every l in the ball  (Dc, Dl acb enclosures),
    or (None, None, info) if a test fails."""
    ctx.prec = PREC
    Dd = DATA
    k = Dd['kappa']
    eps = arb(fmpq(1, 10))
    beta = arb(20)
    s = nf.dS(arb(0))
    lc = midv(lam)
    deriv = not (lam.real.rad() == 0 and lam.imag.rad() == 0)
    tb = tails(lam, k, s, eps, beta)
    tc = tails(lc, k, s, eps, beta)
    if tb is None or tc is None:
        return None, None, {'fail': 'eigenstructure'}
    nu_b, nu_c = tb['nu'], tc['nu']
    assert nu_b.overlaps(nu_c)
    # dnu/dlam on the ball: -p_lam / p_nu
    p_nu = dcharpoly(nu_b, lam, k, s, eps)
    p_lam = dlam_charpoly(nu_b, lam, k, s, eps)
    dnu = -p_lam / p_nu

    def Amat(l, nu):
        return acb_mat([[-k * (l + 1) - nu, -k, k, 0], [eps * k, -k * l - nu, 0, 0], [0, 0, -nu, 1], [0, 0, 1, -nu]])
    # the ODE is shifted by the fixed number nu_c = nu(lc) (a thin ball), not by nu(lam): phi^ = e^{-nu_c xi} phi.
    # Then D(lam) = f(lam) (w + om~)^T Phi^(T_FAR, XI_MINUS) (v + om),  f(lam) = exp(-(nu(lam) - nu_c)(T_FAR - XI_MINUS)).
    Mc = Amat(lc, nu_c)
    M = Amat(lam, nu_c)
    Ml = acb_mat([[-k, 0, 0, 0], [0, -k, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    # initial vector: v(lam) + om on the ball (its lam-dependence is carried in r, first order in rho)
    dl = lam - lc                                     # the ball of lam - lc
    # initial vector v(lam) + om:  v(lam) in v(lc) + v'(lam-ball) (lam - lc);  C0 = mid v', the rest goes to r
    vc = tc['v']
    if deriv:
        nu = nu_b
        e1 = nu + k * lam
        e2 = nu * nu - 1
        vp = [acb(0), -eps * k * (dnu + k) / (e1 * e1), 2 * s * nu * dnu / (e2 * e2), s * dnu * (nu * nu + 1) / (e2 * e2)]
    else:
        vp = [acb(0)] * 4
    C = [midv(x) for x in vp]
    pbar = [midv(x) for x in vc]
    Bm = eye4()
    rv = [(vc[i] - pbar[i]) + (vp[i] - C[i]) * dl + acb(tb['om'][i], tb['om'][i]) for i in range(4)]
    for n_st, st in enumerate(Dd['steps']):
        for (Pc, Pb, Pl) in substeps(n_st, st, Mc, M, Ml, order, deriv):
            y = matvec(Pc, pbar)                          # Phi(lc) pbar
            pnew = [midv(yi) for yi in y]
            if deriv:
                G = [a + b for a, b in zip(matvec(Pl, pbar), matvec(Pb, C))]   # d/dlam part, on the ball
                Cn = [midv(g) for g in G]
            else:
                G = [acb(0)] * 4
                Cn = [acb(0)] * 4
            Cb = Pb * Bm
            mC = acb_mat([[midv(Cb[i, j]) for j in range(4)] for i in range(4)])
            keys = []
            for j in range(4):
                cn = sum((abs(mC[i, j]) ** 2 for i in range(4)), arb(0)).sqrt()
                keys.append(float(cn.mid()) * (float(aup(rv[j]).mid()) + 1e-300))
            oc = sorted(range(4), key=lambda j: -keys[j])
            Bn = gram_schmidt(acb_mat([[mC[i, j] for j in oc] for i in range(4)]))
            Bi = Bn.inv()
            err = [(y[i] - pnew[i]) + (G[i] - Cn[i]) * dl for i in range(4)]
            t1 = matvec(Bi, err)
            t2 = matvec(Bi * Cb, rv)
            rv = [t1[i] + t2[i] for i in range(4)]
            pbar, C, Bm = pnew, Cn, Bn
            if detail and n_st % 40 == 0:
                print('   inj: y-width %.2e  (G-C)dl %.2e  |G| width %.2e  Bi*Cb*rv %.2e' % (max(float(aup(y[i]-pnew[i]).mid()) for i in range(4)), max(float(aup((G[i]-Cn[i])*dl).mid()) for i in range(4)), max(max(float(g.real.rad()),float(g.imag.rad())) for g in G), max(float(aup(x).mid()) for x in t2)))
            if detail and n_st % 40 == 0:
                print('  xi=%.2f |pbar|=%.3e |C|=%.3e |rv|=%.3e |t1|=%.3e wPb=%.2e wPl=%.2e' % (float(st[0].mid()), max(float(aup(x).mid()) for x in pbar),
                      max(float(aup(x).mid()) for x in C), max(float(aup(x).mid()) for x in rv), max(float(aup(x).mid()) for x in t1),
                      max(float(Pb[a, b].rad()) for a in range(4) for b in range(4)), max(float(Pl[a, b].rad()) if Pl is not None else 0 for a in range(4) for b in range(4))), flush=True)
    phiT0 = [pbar[i] + sum((Bm[i, j] * rv[j] for j in range(4)), acb(0)) for i in range(4)]
    wR = [tb['w'][i] + acb(tb['omt'][i], tb['omt'][i]) for i in range(4)]
    Dc = sum((wR[i] * phiT0[i] for i in range(4)), acb(0))
    Dl = sum((wR[i] * C[i] for i in range(4)), acb(0))
    Lspan = arb(DATA['info']['T_far']) - arb(DATA['info']['xi_minus'])
    f_ball = (-(nu_b - nu_c) * Lspan).exp()
    D_ball = f_ball * (Dc + Dl * dl)
    out = {'nu': nu_b.str(10), 'K14': tb['K14'].str(5), 'G_L': tb['GL'].str(5), 'G_R': tb['GR'].str(5),
           'm': tb['m'].str(6), 'Dc': Dc.str(12), 'Dl': Dl.str(8),
           'Dc_rad': max(float(Dc.real.rad()), float(Dc.imag.rad())), 'D_ball': D_ball.str(8)}
    out['nu_c'] = nu_c
    out['Lspan'] = Lspan
    out['f_ball'] = f_ball
    out['D_ball_obj'] = D_ball
    return Dc, Dl, out


def D_at(lam_pt, Dc, Dl, lc, out):
    """enclosure of D at a thin point lam_pt of the ball: f(lam_pt) (Dc + Dl (lam_pt - lc)); nu(lam_pt) by Krawczyk."""
    k = DATA['kappa']
    s = nf.dS(arb(0))
    eps = arb(fmpq(1, 10))
    nu = krawczyk(acb(complex(ref_roots(lam_pt, k, s)[0]).real, complex(ref_roots(lam_pt, k, s)[0]).imag), lam_pt, k, s, eps)
    f = (-(nu - out['nu_c']) * out['Lspan']).exp()
    return f * (Dc + Dl * (lam_pt - lc))


if __name__ == '__main__':
    load()
    print('steps', len(DATA['steps']))
    for z, r in [((0, 0), 0), ((0.5, 0), 0), ((-0.05, 0), 0), ((0, 1), 0), ((-0.05, 0.01), 0.005), ((0.5, 3), 0.005)]:
        t = time.time()
        lam = acb(arb(z[0], r), arb(z[1], r))
        Dc, Dl, info = evans(lam)
        print(z, r, {k: v for k, v in info.items() if isinstance(v, (str, float))}, '%.1fs' % (time.time() - t), flush=True)
