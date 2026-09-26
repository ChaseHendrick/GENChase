#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Computer-assisted proof of the fast pulse for every recovery rate eps in a subinterval E = [e_lo, e_hi].

usage: python3 chain.py <e_lo> <e_hi> <q0> <s1> <dk> [--tag TAG] [--swap] [--seg L]

  e_lo, e_hi   the subinterval, exact decimals (read as rationals)
  q0, s1, dk   the speed window: for eps = e_m + w eps0 (e_m the midpoint, w the half width, |eps0| <= 1),
               kappa = 1/c ranges over q0 + s1 eps0 + dk zeta0, |zeta0| <= 1 (q0, s1, dk are read as
               decimals and rounded to exact dyadic numbers; the certificate records the exact values)
  --swap       negative control: exchange the two ends of the speed window (must FAIL)

What is checked, in ball arithmetic (python-flint / Arb) for ALL eps in E at once:
 R  s = S'(0) < 1; kappa > 0 and eps > 0 on the whole box, so (Descartes and the imaginary axis, see
    ../../code/certify_rest.py) the rest state has one unstable and three stable eigenvalues; the unstable
    eigenvalue is enclosed for all (eps, kappa) in the box and is simple.
 M  the unstable manifold of ../../code/manifold.py is validated (tail bound) for all (eps, kappa) in the box.
 B  the isolating block of ../../code/block.py (cone and entrance conditions) holds for all (eps, kappa) in
    the box; its coordinates are computed at the centre of the box.
 C  a chain of covering relations (Zgliczynski-Gidea type, one unstable direction) along the pulse:
      stage 0: the curve zeta0 -> (P(1/4; eps, kappa(eps0, zeta0)), kappa) is mapped by the flow over
               [0, t_1] into the slab of the h-set N_1(eps), and its two ends to opposite sides of it;
      stage i: N_i(eps) is mapped over [t_i, t_{i+1}] into the slab of N_{i+1}(eps), its two u-faces
               to opposite sides;
      final:   N_m(eps) is mapped over [t_m, T] into the interior of the block, its two u-faces into the
               cones K- and K+ inside the block.
    N_i(eps) = { z_i + eps0 d_i + M_i (u, s) : |u| <= 1, |s_j| <= 1 } in (U, V, Q, P, kappa), with Y = S(U).
    The sets are chosen by the program from the enclosures; every inclusion is then checked rigorously.
Consequence (see REPORT.md): for each eps in E there is kappa in the window whose orbit leaves rest along the
unstable manifold and tends to rest: a travelling pulse with speed c = 1/kappa.
"""
import sys, os, json, time, math, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', 'code'))
import numpy as np
from flint import arb, arb_mat, ctx, fmpq
import nfcore as nf, certify_rest as cr, manifold as mf, block as bl
import lohner7 as L7
import pulse_num as pn
import manifold_ad as ad

PREC = int(os.environ.get('NF_PREC', '128'))
ORDER = int(os.environ.get('NF_ORDER', '20'))
TOL = float(os.environ.get('NF_TOL', '1e-32'))
SIGMA = fmpq(1, 7)                 # manifold scaling, as in ../../code/prove_pulse.py
T0 = fmpq(1, 4)                    # manifold parameter of the initial point
NMAN = 80                          # manifold order
DU = arb('0.05')                   # block U half width, as in the original proof
R_OVER_RHO = arb(4)
PHASE = int(os.environ.get('NF_PHASE', '1'))           # 1: rescale time to follow the pulse phase in eps
MARGIN = float(os.environ.get('NF_MARGIN', '1e-3'))   # relative slack of the slab
EDGE_KEEP = float(os.environ.get('NF_EDGE_KEEP', '0.98'))   # new u-size as a fraction of the face image
P5 = [0, 1, 2, 3, 5]               # (U, V, Q, P, kappa) inside the 7-state (U, V, Q, P, Y, kappa, eps)


def rat(s):
    return fmpq(*[int(x) for x in s.split('/')]) if '/' in s else fmpq(int(round(float(s) * 10 ** 12)), 10 ** 12) \
        if 'e' in s.lower() else _dec(s)


def _dec(s):
    neg = s.startswith('-')
    s = s.lstrip('-')
    if '.' in s:
        a, b = s.split('.')
        q = fmpq(int(a or '0') * 10 ** len(b) + int(b or '0'), 10 ** len(b))
    else:
        q = fmpq(int(s))
    return -q if neg else q


def dyadic(x):
    """nearest float as an exact arb (dyadic)."""
    return arb(float(x))


def ub(x):
    return arb(x.abs_upper())


def fl(x):
    return float(x.mid())


def ball(r):
    r = ub(arb(r))
    return arb(0, r.upper()) if hasattr(r, 'upper') else arb(0, r)


def rball(r):
    """ball [-r, r] for an arb r >= 0 (upper bound used)."""
    return arb(0).union(arb(r.upper())).union(arb(-r.upper()))


class Box:
    pass


# ---------------------------------------------------------------- rest state, manifold, block
def setup(e_lo, e_hi, q0, s1, dk):
    E = arb(e_lo).union(arb(e_hi))
    e_m = arb((e_lo + e_hi) / 2)
    w2 = arb((e_hi - e_lo) / 2)
    K_all = q0 + s1 * rball(arb(1)) + dk * rball(arb(1))
    rep = {}
    s = nf.dS(arb(0))
    rep['s=S\'(0)'] = s.str(20)
    assert s < 1, 'S\'(0) < 1 fails'
    assert E > 0 and K_all > 0, 'eps and kappa must be positive on the box'
    rep['kappa_box'] = K_all.str(20)
    rep['eps_box'] = E.str(20)
    co = cr.charpoly_coeffs(K_all, s, E)
    lam = cr.refine(co, arb('0.3'), arb('1.5'))          # certified end signs: the unique positive root
    assert lam > 0
    rep['lambda_u'] = lam.str(15)
    # manifold tail over the whole box
    nf._EPS = E
    ok, a, rr, minfo = mf.validate(K_all, lam, arb(SIGMA), NMAN)
    assert ok, minfo
    rep['manifold'] = {k: minfo[k] for k in ('rho', 'r', 'ok')}
    # block: coordinates from the eigenvectors at the centre, conditions over the whole box
    km = fl(q0)
    em = fl(e_m)
    s0 = fl(s)
    Af = np.array([[-km, -km, km, 0], [em * km, 0, 0, 0], [0, 0, 0, 1], [-s0, 0, 1, 0]])
    wv, V = np.linalg.eig(Af)
    assert np.all(np.abs(wv.imag) < 1e-12)
    idx = np.argsort(-wv.real)
    V = V[:, idx].real
    Tf = np.diag((1, 0.5, 0.25, 0.25)) @ np.linalg.inv(V)
    TB = bl.exact_matrix(Tf)
    TBinv = TB.inv()
    okb, binfo = bl.check(TB, TBinv, (-DU, DU), K_all)
    assert okb, binfo
    rho = arb(1)
    while not (bl.u_range(TBinv, rho * R_OVER_RHO, rho) < DU):
        rho = rho * arb('0.95')
    rho = arb(rho.mid())
    r = rho * R_OVER_RHO
    binfo['rho'] = rho.str(10); binfo['r'] = r.str(10)
    binfo['U_range'] = bl.u_range(TBinv, r, rho).str(10)
    binfo['T'] = Tf.tolist()
    rep['block'] = binfo
    return dict(E=E, e_m=e_m, w2=w2, K_all=K_all, lam=lam, s=s, rr=rr, TB=TB, rho=rho, r=r, rep=rep)


# ---------------------------------------------------------------- initial set on the unstable manifold
def initial_sets(S, q0, s1, dk):
    E, e_m, w2, K_all, lam, s, rr = S['E'], S['e_m'], S['w2'], S['K_all'], S['lam'], S['s'], S['rr']
    t0 = arb(T0)
    sig = arb(SIGMA)
    # centre
    co_c = cr.charpoly_coeffs(q0, s, e_m)
    lam_c = cr.refine(co_c, arb('0.3'), arb('1.5'))
    Pc = ad.point(e_m, q0, lam_c, sig, NMAN, t0)
    # gradient over the whole box
    Pb = ad.point(E, K_all, lam, sig, NMAN, t0)
    tail = [ri * t0 ** (NMAN + 1) for ri in rr]
    # x(eps0, zeta0) = P(e_m + w2 eps0, q0 + s1 eps0 + dk zeta0):
    #   in P(centre) + J_eps (w2 eps0) + J_kap (s1 eps0 + dk zeta0) + tail, J over the box (mean value theorem)
    C = arb_mat(7, 2)
    xbar = []
    R = []
    for i in range(5):
        je, jk = Pb[i].g
        ce = je * w2 + jk * s1            # column eps0 (exact coefficient enclosure)
        cz = jk * dk                      # column zeta0
        C[i, 0] = arb(ce.mid()); C[i, 1] = arb(cz.mid())
        xb = arb(Pc[i].v.mid())
        xbar.append(xb)
        err = (Pc[i].v - xb) + (ce - C[i, 0]) * rball(arb(1)) + (cz - C[i, 1]) * rball(arb(1)) + rball(ub(tail[i]))
        R.append(err)
    xbar.append(q0); C[5, 0] = s1; C[5, 1] = dk; R.append(arb(0))
    xbar.append(arb(e_m.mid())); C[6, 0] = arb(w2.mid()); C[6, 1] = arb(0)
    R.append((e_m - arb(e_m.mid())) + (w2 - arb(w2.mid())) * rball(arb(1)))
    B = arb_mat(7, 7)
    for i in range(7):
        B[i, i] = 1
    full = L7.LohnerSet(xbar, C, [rball(arb(1))] * 2, B, R)
    edges = {}
    for sg in (-1, 1):
        xb = [xbar[i] + sg * C[i, 1] for i in range(7)]
        Ce = arb_mat(7, 1)
        for i in range(7):
            Ce[i, 0] = C[i, 0]
        edges[sg] = L7.LohnerSet(xb, Ce, [rball(arb(1))], B, list(R))
    return full, edges, {'u_col': 1, 'eps_col': 0, 's_cols': []}


# ---------------------------------------------------------------- h-sets
def coord_map(Minv, c5, d5, S):
    """5 x 7 matrix A and shift so that A (z - shift) = Minv (z5 - c5 - eps0 d5), eps0 = (eps - e_m)/w2."""
    A = arb_mat(5, 7)
    for i in range(5):
        for j, jj in enumerate(P5):
            A[i, jj] = Minv[i, j]
        A[i, 6] = -sum((Minv[i, j] * d5[j] for j in range(5)), arb(0)) / S['w2']
    shift = [c5[0], c5[1], c5[2], c5[3], arb(0), c5[4], S['e_m']]
    return A, shift


def design(X, Xe, cols, S, a_fac, c5, d5):
    """Choose N_{i+1} from the enclosure X of the image of N_i (and of its faces Xe[-1], Xe[+1]).
    c5, d5: centre and eps-shift (per unit eps0) of the new h-set, from the numerical pulse (pulse_num)."""
    C = X.C
    v = np.array([fl(C[i, cols['u_col']]) for i in P5])
    v = v / np.linalg.norm(v)
    # basis: v (the image of the u-direction, kappa component included), the pure kappa direction, and
    # three x-directions orthogonal to the x-part of v.  The x-part of v is the direction in which a
    # perturbation at fixed kappa grows; it must not lie in the slab directions.
    vx = v[:4] / np.linalg.norm(v[:4])
    cand = [np.array([fl(C[i, j]) for i in range(4)]) for j in cols['s_cols']]
    Bm = X.B
    for j in range(7):
        cand.append(np.array([fl(Bm[i, j]) for i in range(4)]) * max(fl(ub(X.R[j])), 1e-300))
    cand.sort(key=lambda x: -np.linalg.norm(x))
    xb = [vx]
    for cvec in cand + [np.eye(4)[k] for k in range(4)]:
        w = cvec.copy()
        for _ in range(2):
            for q in xb:
                w = w - np.dot(w, q) * q
        n = np.linalg.norm(w)
        if n > 1e-6 * max(np.linalg.norm(cvec), 1e-300) and n > 0:
            xb.append(w / n)
        if len(xb) == 4:
            break
    basis = [v, np.array([0, 0, 0, 0, 1.0])] + [np.append(q, 0.0) for q in xb[1:]]
    Mt = np.array(basis).T                          # 5 x 5, columns v, q1..q4
    Mta = bl.exact_matrix(Mt)
    Mtinv = Mta.inv()
    A, shift = coord_map(Mtinv, c5, d5, S)
    img = X.affine_image_hull(A, shift)
    b = [float(ub(img[j]).mid()) * (1 + MARGIN) + 1e-40 for j in range(1, 5)]
    ep = Xe[1].affine_image_hull(A, shift)[0]
    em = Xe[-1].affine_image_hull(A, shift)[0]
    edge = min(fl(arb(ep.lower())), -fl(arb(em.upper())))
    if not edge > 0:
        return None, {'fail': 'faces not on opposite sides', 'u+': ep.str(5), 'u-': em.str(5)}
    a = min(EDGE_KEEP * edge, a_fac * max(b))
    M = Mt @ np.diag([a] + b)
    return {'c5': c5, 'd5': d5, 'M': M, 'a': a, 'b': b, 'edge_growth': edge}, None


def verify_cover(X, Xe, H, S):
    """Rigorous: image of the whole set in the slab of H, faces beyond u = -1 and u = +1."""
    Ma = bl.exact_matrix(H['M'])
    Minv = Ma.inv()
    A, shift = coord_map(Minv, H['c5'], H['d5'], S)
    img = X.affine_image_hull(A, shift)
    slab = all(ub(img[j]) < 1 for j in range(1, 5))
    up = Xe[1].affine_image_hull(A, shift)[0]
    um = Xe[-1].affine_image_hull(A, shift)[0]
    ok = slab and bool(up > 1) and bool(um < -1)
    info = {'s_max': max(fl(ub(img[j])) for j in range(1, 5)), 'u_plus_face_lower': fl(arb(up.lower())),
            'u_minus_face_upper': fl(arb(um.upper())), 'slab': slab, 'ok': ok}
    return ok, info


def hset_lohner(H, S):
    """Lohner sets of N(eps) x E: full (params u, s1..s4, eps0) and the two u-faces."""
    Mx = H['M']
    c5, d5 = H['c5'], H['d5']
    Cm = arb_mat(7, 6)
    rowsP5 = {jj: j for j, jj in enumerate(P5)}
    for jj, j in rowsP5.items():
        for k in range(5):
            Cm[jj, k] = arb(float(Mx[j, k]))
        Cm[jj, 5] = d5[j]
    Uc = c5[0]
    Yc = nf.S(Uc)
    dSc = nf.dS(Uc)
    # Y row: S(U) = S(Uc) + S'(Uc) dU + S''(xi)/2 dU^2
    dUmax = sum((ub(Cm[0, k]) for k in range(6)), arb(0))
    Urange = Uc + rball(dUmax)
    beta = arb(nf._BETA)
    Sr = nf.S(Urange)
    S2 = beta * beta * Sr * (1 - Sr) * (1 - 2 * Sr)
    for k in range(6):
        v = dSc * Cm[0, k]
        Cm[4, k] = arb(v.mid())
    Yerr = (Yc - arb(Yc.mid())) + sum(((dSc * Cm[0, k] - Cm[4, k]) * rball(arb(1)) for k in range(6)), arb(0)) \
        + rball(ub(S2) * dUmax * dUmax / 2)
    for k in range(5):
        Cm[6, k] = arb(0)
    Cm[6, 5] = arb(S['w2'].mid())
    xbar = [c5[0], c5[1], c5[2], c5[3], arb(Yc.mid()), c5[4], arb(S['e_m'].mid())]
    R = [arb(0)] * 7
    R[4] = Yerr
    R[6] = (S['e_m'] - xbar[6]) + (S['w2'] - Cm[6, 5]) * rball(arb(1))
    B = arb_mat(7, 7)
    for i in range(7):
        B[i, i] = 1
    full = L7.LohnerSet(xbar, Cm, [rball(arb(1))] * 6, B, R)
    edges = {}
    for sg in (-1, 1):
        xb = [xbar[i] + sg * Cm[i, 0] for i in range(7)]
        Ce = arb_mat(7, 5)
        for i in range(7):
            for k in range(5):
                Ce[i, k] = Cm[i, k + 1]
        edges[sg] = L7.LohnerSet(xb, Ce, [rball(arb(1))] * 5, B, list(R))
    return full, edges, {'u_col': 0, 's_cols': [1, 2, 3, 4], 'eps_col': 5}


# ---------------------------------------------------------------- block entry
def yimage(X, S):
    TB = S['TB']
    A = arb_mat(4, 7)
    for i in range(4):
        for j in range(4):
            A[i, j] = TB[i, j]
    xs = nf.rest_state()
    return X.affine_image_hull(A, [xs[0], xs[1], xs[2], xs[3], arb(0), arb(0), arb(0)])


def ynorm(yp):
    return sum((ub(v) ** 2 for v in yp), arb(0)).sqrt()


def in_int_B(y, S):
    return bool(ub(y[0]) < S['r']) and bool(ynorm(y[1:]) < S['rho'])


def in_K(y, sign):
    v = y[0] if sign > 0 else -y[0]
    return bool(arb(v.lower()) > ynorm(y[1:]))


def block_entry(X, Xe, S):
    y = yimage(X, S)
    yp, ym = yimage(Xe[1], S), yimage(Xe[-1], S)
    full_in = in_int_B(y, S)
    side = None
    if in_int_B(yp, S) and in_int_B(ym, S):
        if in_K(yp, 1) and in_K(ym, -1):
            side = '+face->K+, -face->K-'
        elif in_K(yp, -1) and in_K(ym, 1):
            side = '+face->K-, -face->K+'
    info = {'full_in_int_B': full_in, 'y1': y[0].str(5), '|y\'|': fl(ynorm(y[1:])), 'faces': side,
            'y1_plus_face': yp[0].str(5), 'y1_minus_face': ym[0].str(5)}
    return full_in and side is not None, info


# ---------------------------------------------------------------- driver
def run(e_lo, e_hi, kap_c, dkap, dk, seg=1.0, tmax=200.0, t_block_min=8.0, a_fac=10.0, swap=False, verbose=True):
    """e_lo, e_hi: fmpq.  kap_c: numerical kappa*(e_m) (arb), dkap: numerical kappa*'(e_m) (arb), dk: half width
    of the kappa window (float).  The window is kappa = q0 + s1 eps0 + dk zeta0 with q0 = kap_c, s1 = dkap w."""
    ctx.prec = PREC
    t_start = time.time()
    e_m_q = (e_lo + e_hi) / 2
    w2q = (e_hi - e_lo) / 2
    q0 = kap_c                                   # exact (a 256-bit dyadic)
    s1 = dyadic(float((dkap * arb(w2q)).mid()))
    dkd = dyadic(dk)
    if swap:          # negative control: reverse the speed window (its two ends exchange sides)
        dkd = -dkd
    S = setup(e_lo, e_hi, q0, s1, dkd)
    cert = {'eps': [str(e_lo), str(e_hi)], 'q0': q0.str(40, radius=False), 's1': s1.str(30, radius=False),
            'dk': dkd.str(30, radius=False), 'kappa_window': 'kappa = q0 + s1 eps0 + dk zeta0, eps = e_m + w eps0',
            'prec': PREC, 'order': ORDER, 'tol': TOL, 'seg': seg, 'swap': swap,
            'setup': S['rep'], 'stages': []}
    X, Xe, cols = initial_sets(S, q0, s1, dkd)
    tr = pn.Tracker(e_m_q, kap_c)
    t = 0.0
    em_d = float(S['e_m'].mid())      # r(eps) = 1 + b (eps - em_d), b chosen per segment
    w2f = fl(S['w2'])
    b_rho, alpha_prev = 0.0, 0.0
    verdict = 'FAIL'
    reason = ''
    while True:
        t1 = t + seg
        try:
            Xn, _, _ = L7.integrate(X, t, t1, order=ORDER, tol=TOL, rho=(b_rho, em_d))
            Xen = {sg: L7.integrate(Xe[sg], t, t1, order=ORDER, tol=TOL, rho=(b_rho, em_d))[0] for sg in (-1, 1)}
        except Exception as ex:
            reason = 'integration failed on [%g, %g]: %r' % (t, t1, ex)
            break
        tr.advance(t1, (b_rho, em_d))
        ctx.prec = PREC
        st = {'s': t1, 'rho_b': b_rho, 'rho_em': em_d}
        if t1 >= t_block_min:
            okB, binfo = block_entry(Xn, Xen, S)
            st['block'] = binfo
            if okB:
                cert['stages'].append(st)
                verdict = 'PASS'
                cert['T'] = t1
                break
        c5 = [arb(tr.x[i].mid()) for i in P5]
        ctx.prec = pn.NPREC                      # the pulse-family tangent is a difference of two large vectors
        d5 = [arb((arb(w2q) * (tr.tan[0][i] + dkap * tr.tan[1][i])).mid()) for i in P5]
        ctx.prec = PREC
        H, err = design(Xn, Xen, cols, S, a_fac, c5, d5)
        if H is None:
            st['design'] = err
            cert['stages'].append(st)
            reason = 'covering fails at s=%g: %s' % (t1, err)
            break
        okc, cinfo = verify_cover(Xn, Xen, H, S)
        st['cover'] = cinfo
        st['a'] = H['a']; st['b'] = H['b']; st['edge_growth'] = H['edge_growth']
        st['c5'] = [v.str(40, radius=False) for v in H['c5']]
        st['d5'] = [v.str(30, radius=False) for v in H['d5']]
        st['M'] = H['M'].tolist()
        st['|d5|'] = math.sqrt(sum(fl(v) ** 2 for v in H['d5'][:4]))
        cert['stages'].append(st)
        if verbose:
            print('s=%5.1f |d|=%.2e a=%.2e b=%s edge=%.2e smax=%.4f ok=%s  (%.0fs)' % (
                t1, st['|d5|'], H['a'], ' '.join('%.1e' % x for x in H['b']), H['edge_growth'], cinfo['s_max'], okc,
                time.time() - t_start), flush=True)
        if not okc:
            reason = 'covering not verified at s=%g' % t1
            break
        if t1 >= tmax:
            reason = 'no block entry before s=%g' % tmax
            break
        # time rescaling for the next segment: cancel the eps-phase drift (a choice, not part of the checks)
        cx = [fl(v) for v in H['c5']]
        F = np.array([cx[4] * (cx[2] - cx[0] - cx[1]), em_d * cx[4] * cx[0], cx[3], cx[2] - fl(nf.S(arb(cx[0])))])
        alpha = float(np.dot([fl(v) for v in H['d5'][:4]], F) / np.dot(F, F))
        drift = alpha - alpha_prev - b_rho * w2f * seg
        b_rho = -(alpha + drift) / (w2f * seg) if PHASE else 0.0
        b_rho = float(np.clip(b_rho, -0.25 / w2f, 0.25 / w2f))
        alpha_prev = alpha
        st['phase_alpha'] = alpha
        X, Xe, cols = hset_lohner(H, S)
        t = t1
    cert['verdict'] = verdict
    cert['reason'] = reason
    cert['time_s'] = round(time.time() - t_start, 1)
    return cert


def pulse_data(e_lo, e_hi, c_guess, t_pre=None):
    """numerical kappa*(e_m) and kappa*'(e_m) (pulse_num; not part of the proof)."""
    e_m = (e_lo + e_hi) / 2
    kap, wdt = pn.kstar(e_m, c_guess)
    tr = pn.Tracker(e_m, kap)
    l = pn.left_unstable(float(e_m.p) / float(e_m.q), float(kap.mid()))
    T = 20.0
    while True:
        tr.advance(T, (0, 0))
        big = max(abs(float(v.mid())) for v in tr.tan[1][:4])
        if big > 1e36 or T >= 160:
            break
        T += 5.0
    ctx.prec = pn.NPREC
    dkap = tr.dkdeps(l)
    ctx.prec = PREC
    return kap, dkap, {'kappa*': kap.str(45), 'c*': (1 / kap).str(40), 'bisection_width_c': wdt,
                       "kappa*'": dkap.str(30), 'T_tangent': T}


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('e_lo'); ap.add_argument('e_hi'); ap.add_argument('c_guess', type=float)
    ap.add_argument('--dk', type=float, default=None, help='half width of the kappa window (default: 2 w)')
    ap.add_argument('--seg', type=float, default=1.0)
    ap.add_argument('--afac', type=float, default=10.0)
    ap.add_argument('--swap', action='store_true')
    ap.add_argument('--out', default=None)
    A = ap.parse_args()
    e_lo, e_hi = _dec(A.e_lo), _dec(A.e_hi)
    t0 = time.time()
    kap, dkap, pinfo = pulse_data(e_lo, e_hi, A.c_guess)
    print('numerical pulse data', pinfo, '%.0fs' % (time.time() - t0), flush=True)
    dk = A.dk if A.dk is not None else 2 * float((e_hi - e_lo).p) / float((e_hi - e_lo).q)
    cert = run(e_lo, e_hi, kap, dkap, dk, seg=A.seg, a_fac=A.afac, swap=A.swap)
    cert['numerical_pulse'] = pinfo
    print('VERDICT', cert['verdict'], cert['reason'], 'T=%s' % cert.get('T'), '%.0fs' % cert['time_s'])
    if A.out:
        json.dump(cert, open(A.out, 'w'), indent=1)
