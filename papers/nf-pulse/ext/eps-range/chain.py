#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Computer-assisted proof of the fast pulse for every recovery rate eps in a subinterval E = [e_lo, e_hi].

usage: python3 chain.py <e_lo> <e_hi> <c_guess> [--dk DK] [--seg L] [--afac F] [--out FILE]
                        [--shift X] [--samecone S]          (the last two are negative controls)

  e_lo, e_hi   the subinterval, exact decimals (read as rationals)
  c_guess      a speed guess for the numerical bisection (pulse_num.kstar; not part of the proof)
  --dk DK      half width of the kappa window (kappa = 1/c), see below
  --shift X    negative control: move the kappa window by X*DK off the numerical pulse speed (must FAIL for |X| > 1)
  --samecone S negative control: require both u-faces to end in K+ (S = 1) or K- (S = -1) (must FAIL)

Notation.  eps = e_m + w eps0 with e_m, w the (exact, dyadic) rounded midpoint and half width of E; for eps in E,
|eps0| <= 1 + delta (delta covers the rounding, recorded as eps0_range).  The kappa window is
    kappa = q0 + s1 eps0 + dk zeta0,   |zeta0| <= 1,
with q0 ~ kappa*(e_m) and s1 ~ w kappa*'(e_m) from the numerical pulse (pulse_num); q0, s1, dk are exact dyadics.

What is checked, in ball arithmetic (python-flint / Arb), for ALL eps in E at once:
 R  s = S'(0) < 1; kappa > 0 and eps > 0 on the whole box, so (Descartes and the imaginary axis, see
    ../../code/certify_rest.py) the rest state has one unstable and three stable eigenvalues; the unstable
    eigenvalue is enclosed for all (eps, kappa) in the box.
 M  the unstable manifold of ../../code/manifold.py is validated (tail bound) for all (eps, kappa) in the box.
 B  the isolating block of ../../code/block.py (cone and entrance conditions) holds for all (eps, kappa) in
    the box; its coordinates are computed at the centre; its U-range is the first of BLOCK_DU that certifies.
 C  a chain of covering relations (one unstable direction) along the pulse, for the time-rescaled flow
    z' = r(eps) F(z), r = 1 + b_i (eps - e_m) on the i-th segment (the same orbits; lohner7.py):
      stage 0: the curve zeta0 -> (P(1/4; eps, kappa(eps0, zeta0)), kappa) is mapped over [0, s_1] into the
               slab of the h-set N_1(eps), its two ends (zeta0 = -1, +1) to opposite sides of it;
      stage i: N_i(eps) is mapped over [s_i, s_{i+1}] into the slab of N_{i+1}(eps), its two u-faces to
               opposite sides;
      final:   N_m(eps) is mapped over [s_m, T] into the interior of the block, its two u-faces into the
               cones K- and K+ inside the block (one each).
    N_i(eps) = { c_i + eps0 d_i + M_i (u, s) : |u| <= 1, |s_j| <= 1 } in (U, V, Q, P, kappa), Y = S(U); c_i, d_i,
    M_i are exact numbers chosen by the program (from the numerical pulse and the enclosures); every inclusion
    is then checked rigorously.  A segment that fails is retried with the set cut into k x k pieces (Multi).
Consequence (see REPORT.md): for each eps in E there is kappa in the window whose orbit leaves rest along the
unstable manifold (branch where U increases) and tends to rest: a travelling pulse with speed c = 1/kappa.
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
NSUB = int(os.environ.get('NF_NSUB', '12'))   # sub-boxes per side for the gradient of the initial point
BLOCK_DU = ('0.05', '0.04', '0.03', '0.025', '0.02', '0.015', '0.01')   # U half widths tried (0.05 as in the original)
BLOCK_D = ((1, 0.5, 0.25, 0.25), (1, 1, 1, 1), (1, 0.25, 0.25, 0.25), (1, 0.5, 0.5, 0.5), (1, 2, 1, 1))
R_OVER_RHO = arb(4)
PHASE = int(os.environ.get('NF_PHASE', '1'))           # 1: rescale time to follow the pulse phase in eps
SPLITS = tuple(int(x) for x in os.environ.get('NF_SPLITS', '1,2,4').split(','))   # subdivisions tried per segment
FLOWDIR = int(os.environ.get('NF_FLOWDIR', '1'))       # 1: the flow direction is a slab direction
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
    # eps = e_m + w2 eps0 with e_m, w2 exact dyadic numbers (the rounded midpoint and half width); for eps in E
    # the parameter eps0 lies in R0e = [-(1 + delta), 1 + delta], delta covering the rounding
    e_mq, w2q = arb((e_lo + e_hi) / 2), arb((e_hi - e_lo) / 2)
    e_m, w2 = arb(e_mq.mid()), arb(w2q.mid())
    delta = ub(((e_mq - e_m).abs_upper() + (w2q - w2).abs_upper()) / w2) + arb(2) ** -100
    R0e = rball(1 + delta)
    assert (e_m - w2 * (1 + delta)) < arb(e_lo) and (e_m + w2 * (1 + delta)) > arb(e_hi)
    # the eps0 of both ends of E lie in R0e, and also in the range covered after a split into k <= 4 pieces
    # (older certificates split with offsets that cover [-(1 + delta/k), 1 + delta/k] only; see REPORT.md)
    for e_end in (e_lo, e_hi):
        z = (arb(e_end) - e_m) / w2
        assert R0e.contains(z) and bool(abs(z) < 1 + delta / 4), 'eps0 range does not cover E'
    K_all = q0 + s1 * R0e + dk * rball(arb(1))
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
    nf._EPS = E                       # manifold.validate and block.check read eps through nfcore.params()
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
    Vinv = np.linalg.inv(V)
    okb = False
    assert nf.params()[2].contains(E) and E.contains(nf.params()[2])
    for du in BLOCK_DU:                       # the first (largest) U-range and scaling that certify
        for dsc in BLOCK_D:
            Tf = np.diag(dsc) @ Vinv
            TB = bl.exact_matrix(Tf)
            TBinv = TB.inv()
            DUa = arb(du)
            okb, binfo = bl.check(TB, TBinv, (-DUa, DUa), K_all)
            if okb:
                break
        if okb:
            break
    assert okb, binfo
    binfo['dU'] = du
    binfo['d'] = list(dsc)
    DU = DUa
    rho = arb(1)
    while not (bl.u_range(TBinv, rho * R_OVER_RHO, rho) < DU):
        rho = rho * arb('0.95')
    rho = arb(rho.mid())
    r = rho * R_OVER_RHO
    binfo['rho'] = rho.str(10); binfo['r'] = r.str(10)
    binfo['U_range'] = bl.u_range(TBinv, r, rho).str(10)
    binfo['T'] = Tf.tolist()
    rep['block'] = binfo
    rep['eps0_range'] = R0e.str(30)
    return dict(E=E, e_m=e_m, w2=w2, R0e=R0e, scl=1 + delta, K_all=K_all, lam=lam, s=s, rr=rr, TB=TB, rho=rho, r=r, rep=rep)


# ---------------------------------------------------------------- initial set on the unstable manifold
def initial_sets(S, q0, s1, dk):
    E, e_m, w2, K_all, lam, s, rr = S['E'], S['e_m'], S['w2'], S['K_all'], S['lam'], S['s'], S['rr']
    t0 = arb(T0)
    sig = arb(SIGMA)
    # centre
    co_c = cr.charpoly_coeffs(q0, s, e_m)
    lam_c = cr.refine(co_c, arb('0.3'), arb('1.5'))
    Pc = ad.point(e_m, q0, lam_c, sig, NMAN, t0)
    # gradient over the whole box, as the union of its enclosures over NSUB x NSUB sub-boxes of the
    # (eps0, zeta0) square (the eigenvalue ball enters 1/(lam^2 - 1) independently of kappa, so one
    # evaluation over the whole box overestimates the variation of the gradient by a large factor)
    Jb = None
    for ia in range(NSUB):
        for ib in range(NSUB):
            ea = arb(fmpq(2 * ia - NSUB, NSUB)).union(arb(fmpq(2 * ia + 2 - NSUB, NSUB)))
            zb = arb(fmpq(2 * ib - NSUB, NSUB)).union(arb(fmpq(2 * ib + 2 - NSUB, NSUB)))
            ea = ea * S['scl']                   # the sub-boxes cover R0e = [-(1 + delta), 1 + delta]
            Es = e_m + w2 * ea
            Ks = q0 + s1 * ea + dk * zb
            cos = cr.charpoly_coeffs(Ks, s, Es)
            lams = cr.refine(cos, arb('0.3'), arb('1.5'))
            Ps = ad.point(Es, Ks, lams, sig, NMAN, t0)
            g = [[p.g[0], p.g[1]] for p in Ps]
            Jb = g if Jb is None else [[Jb[i][j].union(g[i][j]) for j in range(2)] for i in range(5)]
    tail = [ri * t0 ** (NMAN + 1) for ri in rr]
    # x(eps0, zeta0) = P(e_m + w2 eps0, q0 + s1 eps0 + dk zeta0):
    #   in P(centre) + J_eps (w2 eps0) + J_kap (s1 eps0 + dk zeta0) + tail, J over the box (mean value theorem)
    C = arb_mat(7, 2)
    xbar = []
    R = []
    for i in range(5):
        je, jk = Jb[i]
        ce = je * w2 + jk * s1            # column eps0 (exact coefficient enclosure)
        cz = jk * dk                      # column zeta0
        C[i, 0] = arb(ce.mid()); C[i, 1] = arb(cz.mid())
        xb = arb(Pc[i].v.mid())
        xbar.append(xb)
        err = (Pc[i].v - xb) + (ce - C[i, 0]) * S['R0e'] + (cz - C[i, 1]) * rball(arb(1)) + rball(ub(tail[i]))
        R.append(err)
    xbar.append(q0); C[5, 0] = s1; C[5, 1] = dk; R.append(arb(0))
    xbar.append(e_m); C[6, 0] = w2; C[6, 1] = arb(0)          # exact: eps = e_m + w2 eps0
    R.append(arb(0))
    B = arb_mat(7, 7)
    for i in range(7):
        B[i, i] = 1
    full = L7.LohnerSet(xbar, C, [S['R0e'], rball(arb(1))], B, R)
    edges = {}
    for sg in (-1, 1):
        xb = [xbar[i] + sg * C[i, 1] for i in range(7)]
        Ce = arb_mat(7, 1)
        for i in range(7):
            Ce[i, 0] = C[i, 0]
        edges[sg] = L7.LohnerSet(xb, Ce, [S['R0e']], B, list(R))
    return full, edges, {'u_col': 1, 'eps_col': 0, 's_cols': [], 'face_eps_col': 0}


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


def design(X, Xe, cols, S, a_fac, c5, d5, free_a=False):
    """Choose N_{i+1} from the enclosure X of the image of N_i (and of its faces Xe[-1], Xe[+1]).
    c5, d5: centre and eps-shift (per unit eps0) of the new h-set, from the numerical pulse (pulse_num)."""
    C = X.C
    v = np.array([fl(C[i, cols['u_col']]) for i in P5])
    v = v / np.linalg.norm(v)
    # basis: v (the image of the u-direction, kappa component included), the pure kappa direction, and
    # three x-directions orthogonal to the x-part of v.  The x-part of v is the direction in which a
    # perturbation at fixed kappa grows; it must not lie in the slab directions.
    vx = v[:4] / np.linalg.norm(v[:4])
    # the vector field at the centre: a time shift moves along it, so it is kept as a slab direction of its own
    cx = [fl(z) for z in c5]
    Fx = np.array([cx[4] * (cx[2] - cx[0] - cx[1]), fl(S['e_m']) * cx[4] * cx[0], cx[3], cx[2] - fl(nf.S(arb(cx[0])))])
    Fo = Fx - np.dot(Fx, vx) * vx
    use_F = FLOWDIR and np.linalg.norm(Fo) > 0.05 * np.linalg.norm(Fx)
    cand = [np.array([fl(C[i, j]) for i in range(4)]) for j in cols['s_cols']]
    Bm = X.B
    for j in range(7):
        cand.append(np.array([fl(Bm[i, j]) for i in range(4)]) * max(fl(ub(X.R[j])), 1e-300))
    cand.sort(key=lambda x: -np.linalg.norm(x))
    xb = [vx] + ([Fo / np.linalg.norm(Fo)] if use_F else [])
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
    if use_F:
        basis = [v, np.array([0, 0, 0, 0, 1.0]), np.append(Fx, 0.0)] + [np.append(q, 0.0) for q in xb[2:]]
    else:
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
        Xp = Xe[1]
        AC, AB = A * Xp.C, A * Xp.B
        contrib = ['%.1e' % fl(ub(AC[0, j])) for j in range(AC.ncols())]
        rest = fl(ub(sum((AB[0, j] * Xp.R[j] for j in range(7)), arb(0))))
        centre = sum((A[0, j] * (Xp.xbar[j] - shift[j]) for j in range(7)), arb(0))
        return None, {'fail': 'faces not on opposite sides', 'u+': ep.str(5), 'u-': em.str(5),
                      'u+ centre': centre.str(5), 'u+ columns': contrib, 'u+ box part': '%.1e' % rest}
    # largest slab extent in (U,V,Q,P), the flow direction excluded (a time shift does not couple into u)
    bphys = max(b[j] * np.linalg.norm(Mt[:4, j + 1]) for j in range(4) if not (use_F and j == 1))
    a = EDGE_KEEP * edge if free_a else min(EDGE_KEEP * edge, a_fac * bphys / np.linalg.norm(Mt[:4, 0]))
    M = Mt @ np.diag([a] + b)
    return {'c5': c5, 'd5': d5, 'M': M, 'a': a, 'b': b, 'edge_growth': edge, 'cosFv': float(abs(np.dot(Fx, vx)) / np.linalg.norm(Fx)),
            'u_face_centre': 0.5 * (fl(ep) + fl(em))}, None


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
    dUmax = sum((ub(Cm[0, k]) for k in range(5)), arb(0)) + ub(Cm[0, 5]) * S['scl']
    Urange = Uc + rball(dUmax)
    beta = arb(nf._BETA)
    Sr = nf.S(Urange)
    S2 = beta * beta * Sr * (1 - Sr) * (1 - 2 * Sr)
    for k in range(6):
        v = dSc * Cm[0, k]
        Cm[4, k] = arb(v.mid())
    Yerr = (Yc - arb(Yc.mid())) + sum(((dSc * Cm[0, k] - Cm[4, k]) * rball(arb(1)) for k in range(5)), arb(0)) \
        + (dSc * Cm[0, 5] - Cm[4, 5]) * S['R0e'] \
        + rball(ub(S2) * dUmax * dUmax / 2)
    for k in range(5):
        Cm[6, k] = arb(0)
    Cm[6, 5] = S['w2']
    xbar = [c5[0], c5[1], c5[2], c5[3], arb(Yc.mid()), c5[4], S['e_m']]
    R = [arb(0)] * 7
    R[4] = Yerr
    B = arb_mat(7, 7)
    for i in range(7):
        B[i, i] = 1
    full = L7.LohnerSet(xbar, Cm, [rball(arb(1))] * 5 + [S['R0e']], B, R)
    edges = {}
    for sg in (-1, 1):
        xb = [xbar[i] + sg * Cm[i, 0] for i in range(7)]
        Ce = arb_mat(7, 5)
        for i in range(7):
            for k in range(5):
                Ce[i, k] = Cm[i, k + 1]
        edges[sg] = L7.LohnerSet(xb, Ce, [rball(arb(1))] * 4 + [S['R0e']], B, list(R))
    return full, edges, {'u_col': 0, 's_cols': [1, 2, 3, 4], 'eps_col': 5, 'face_eps_col': 4}



# ---------------------------------------------------------------- subdivision
class Multi:
    """A finite union of Lohner sets.  Hulls of affine images are unions of the pieces' hulls, so every
    inclusion checked for a Multi is checked for every piece.  Directions (C, B, R, xbar) are read from the
    first piece; they only serve to choose sets."""

    def __init__(self, pieces):
        self.pieces = pieces
        p = pieces[0]
        self.xbar, self.C, self.R0, self.B, self.R = p.xbar, p.C, p.R0, p.B, p.R

    def affine_image_hull(self, T, shift):
        out = None
        for p in self.pieces:
            h = p.affine_image_hull(T, shift)
            out = h if out is None else [a.union(b) for a, b in zip(out, h)]
        return out

    def hull(self):
        out = None
        for p in self.pieces:
            h = p.hull()
            out = h if out is None else [a.union(b) for a, b in zip(out, h)]
        return out


def split(X, splits):
    """Cover X = {xbar + C r0 + B r} (with B = I) by pieces: every listed column j of C is cut into k equal
    parts (k a power of 2, so the new columns are exact); r0_j in [-1, 1] is the union of the k intervals
    off_m + [-1/k, 1/k], off_m = (2m + 1 - k)/k.  Rounding of the shifted centre goes into the box R."""
    for i in range(7):
        for j in range(7):
            assert X.B[i, j] == (1 if i == j else 0)
    pieces = [X]
    for col, k in splits:
        new = []
        for P in pieces:
            rho0 = arb(P.R0[col].abs_upper())          # R0[col] = [-rho0, rho0]; pieces off_m rho0 + [-rho0/k, rho0/k]
            assert bool(P.R0[col].lower() >= -rho0) and k in (1, 2, 4, 8)
            # coverage: consecutive pieces touch and the outer ones reach -rho0 and rho0 (exact arithmetic)
            # in units of rho0 the pieces are (2m + 1 - k)/k + [-1/k, 1/k]: check exactly (rationals) that they
            # start at -1, end at 1 and touch; the rounding of the shifted centres goes into R below
            cq = [fmpq(2 * m + 1 - k, k) for m in range(k)]
            assert cq[0] - fmpq(1, k) == -1 and cq[-1] + fmpq(1, k) == 1
            assert all(cq[m] + fmpq(1, k) >= cq[m + 1] - fmpq(1, k) for m in range(k - 1))
            offs = [arb(q) * rho0 for q in cq]
            for m in range(k):
                off = offs[m]
                xb, R = [], list(P.R)
                for i in range(7):
                    v = P.xbar[i] + P.C[i, col] * off
                    xm = arb(v.mid())
                    xb.append(xm)
                    R[i] = R[i] + (v - xm)
                C = arb_mat(P.C.nrows(), P.C.ncols())
                for i in range(P.C.nrows()):
                    for j in range(P.C.ncols()):
                        C[i, j] = P.C[i, j] * arb(fmpq(1, k)) if j == col else P.C[i, j]
                new.append(L7.LohnerSet(xb, C, P.R0, P.B, R))
        pieces = new
    return pieces


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


NEG = {}
SAME_CONE = 0    # negative control: +1 / -1 demands BOTH faces in K+ / K- (must fail: the ends must separate)


def block_entry(X, Xe, S):
    y = yimage(X, S)
    yp, ym = yimage(Xe[1], S), yimage(Xe[-1], S)
    full_in = in_int_B(y, S)
    side = None
    if in_int_B(yp, S) and in_int_B(ym, S):
        if SAME_CONE:
            if in_K(yp, SAME_CONE) and in_K(ym, SAME_CONE):
                side = 'both faces in the same cone (negative control)'
        elif in_K(yp, 1) and in_K(ym, -1):
            side = '+face->K+, -face->K-'
        elif in_K(yp, -1) and in_K(ym, 1):
            side = '+face->K-, -face->K+'
    info = {'full_in_int_B': full_in, 'y1': y[0].str(5), '|y\'|': fl(ynorm(y[1:])), 'faces': side,
            'y1_plus_face': yp[0].str(5), 'y1_minus_face': ym[0].str(5)}
    return full_in and side is not None, info


# ---------------------------------------------------------------- driver
def run(e_lo, e_hi, kap_c, dkap, dk, seg=1.0, tmax=200.0, t_block_min=8.0, a_fac=10.0, shift=0.0, verbose=True):
    """e_lo, e_hi: fmpq.  kap_c: numerical kappa*(e_m) (arb), dkap: numerical kappa*'(e_m) (arb), dk: half width
    of the kappa window (float).  The window is kappa = q0 + s1 eps0 + dk zeta0 with q0 = kap_c, s1 = dkap w."""
    ctx.prec = PREC
    t_start = time.time()
    e_m_q = (e_lo + e_hi) / 2
    w2q = (e_hi - e_lo) / 2
    q0 = arb((kap_c + dyadic(shift * dk)).mid())  # exact (a dyadic); shift != 0: negative control (window off the pulse)
    s1 = dyadic(float((dkap * arb(w2q)).mid()))
    dkd = dyadic(dk)
    S = setup(e_lo, e_hi, q0, s1, dkd)
    exact = lambda x: '%d*2^%d' % x.man_exp()
    import hashlib
    code = {os.path.relpath(f, HERE): hashlib.sha256(open(f, 'rb').read()).hexdigest()[:16] for f in
            [os.path.join(HERE, n) for n in ('chain.py', 'lohner7.py', 'manifold_ad.py', 'pulse_num.py')] +
            [os.path.join(HERE, '..', '..', 'code', n) for n in ('nfcore.py', 'lohner.py', 'certify_rest.py', 'manifold.py', 'block.py', 'shoot_hp.py')]}
    cert = {'eps': [str(e_lo), str(e_hi)], 'e_m_exact': exact(S['e_m']), 'w_exact': exact(S['w2']),
            'q0_exact': exact(q0), 's1_exact': exact(s1), 'dk_exact': exact(dkd), 'q0': q0.str(40, radius=False), 's1': s1.str(30, radius=False),
            'dk': dkd.str(30, radius=False), 'kappa_window': 'kappa = q0 + s1 eps0 + dk zeta0, eps = e_m + w eps0',
            'code_sha256_16': code, 'prec': PREC, 'order': ORDER, 'tol': TOL, 'seg': seg, 'shift': shift, 'same_cone_control': SAME_CONE,
            'setup': S['rep'], 'stages': []}
    X, Xe, cols = initial_sets(S, q0, s1, dkd)
    NEG.update({'stages': 0, 'slab_refused': 0, 'face_refused': 0, 'block_refused': False})
    tr = pn.Tracker(e_m_q, kap_c)
    t = 0.0
    em_d = float(S['e_m'].mid())      # r(eps) = 1 + b (eps - em_d), b chosen per segment
    w2f = fl(S['w2'])
    b_rho, alpha_prev = 0.0, 0.0
    verdict = 'FAIL'
    reason = ''
    while True:
        t1 = t + seg
        # numerical pulse at the end of the segment (centre and eps-shift of the next h-set)
        tr.advance(t1, (b_rho, em_d))
        ctx.prec = PREC
        c5 = [arb(tr.x[i].mid()) for i in P5]
        ctx.prec = pn.NPREC                      # the pulse-family tangent is a difference of two large vectors
        d5 = [arb((arb(w2q) * (tr.tan[0][i] + dkap * tr.tan[1][i])).mid()) for i in P5]
        ctx.prec = PREC
        TBf = np.array(S['rep']['block']['T'])
        yc = TBf @ (np.array([fl(v) for v in c5[:4]]) - np.array([fl(v) for v in nf.rest_state()[:4]]))
        free_a = bool(np.linalg.norm(yc[1:]) < fl(S['rho']) and abs(yc[0]) < fl(S['r']) / 4)
        done = False
        for k in SPLITS:                         # retry a failing segment with the sets cut into k x k pieces
            st = {'s': t1, 'rho_b': b_rho, 'rho_em': em_d, 'split': k}
            try:
                P0 = split(X, [(cols['u_col'], k), (cols['eps_col'], k)]) if k > 1 else [X]
                Pe = {sg: (split(Xe[sg], [(cols['face_eps_col'], k)]) if k > 1 else [Xe[sg]]) for sg in (-1, 1)}
                Xn = Multi([L7.integrate(p, t, t1, order=ORDER, tol=TOL, rho=(b_rho, em_d))[0] for p in P0])
                Xen = {sg: Multi([L7.integrate(p, t, t1, order=ORDER, tol=TOL, rho=(b_rho, em_d))[0] for p in Pe[sg]])
                       for sg in (-1, 1)}
            except Exception as ex:
                import traceback
                reason = 'integration failed on [%g, %g]: %r %s' % (t, t1, ex, traceback.format_exc(limit=-2).replace(chr(10), ' | '))
                continue
            if t1 >= t_block_min:
                okB, binfo = block_entry(Xn, Xen, S)
                st['block'] = binfo
                if okB:
                    # negative control of block_entry: a block with rho a hundred times smaller is refused
                    S2 = dict(S); S2['rho'] = S['rho'] / 100
                    NEG['block_refused'] = not block_entry(Xn, Xen, S2)[0]
                    cert['stages'].append(st)
                    verdict = 'PASS'
                    cert['T'] = t1
                    done = True
                    break
            H, err = design(Xn, Xen, cols, S, a_fac, c5, d5, free_a)
            if H is None:
                st['design'] = err
                reason = 'covering fails at s=%g: %s' % (t1, err)
                continue
            okc, cinfo = verify_cover(Xn, Xen, H, S)
            st['cover'] = cinfo
            if okc:
                # negative controls of the rigorous checks themselves: a slab 2 per cent too thin and a u-size
                # 2 per cent beyond the face images must both be refused by verify_cover
                Hs = dict(H); Hs['M'] = H['M'] @ np.diag([1.0, 0.98, 0.98, 0.98, 0.98])
                Hf = dict(H); Hf['M'] = H['M'] @ np.diag([1.02 * H['edge_growth'] / H['a'], 1.0, 1.0, 1.0, 1.0])
                NEG['slab_refused'] += not verify_cover(Xn, Xen, Hs, S)[0]
                NEG['face_refused'] += not verify_cover(Xn, Xen, Hf, S)[0]
                NEG['stages'] += 1
                break
            reason = 'covering not verified at s=%g' % t1
        if done:
            break
        if 'cover' not in st or not st['cover']['ok']:
            cert['stages'].append(st)
            break
        reason = ''
        st['a'] = H['a']; st['b'] = H['b']; st['edge_growth'] = H['edge_growth']
        st['c5'] = [v.str(40, radius=False) for v in H['c5']]
        st['d5'] = [v.str(30, radius=False) for v in H['d5']]
        st['c5_exact'] = ['%d*2^%d' % v.man_exp() for v in H['c5']]
        st['d5_exact'] = ['%d*2^%d' % v.man_exp() for v in H['d5']]
        st['M'] = H['M'].tolist()
        st['|d5|'] = math.sqrt(sum(fl(v) ** 2 for v in H['d5'][:4]))
        cert['stages'].append(st)
        if verbose:
            print('s=%5.1f k=%d cos(F,v)=%.3f uoff=%.1e |d|=%.2e a=%.2e b=%s edge=%.2e smax=%.4f ok=%s  (%.0fs)' % (
                t1, st['split'], H['cosFv'], H['u_face_centre'], st['|d5|'], H['a'], ' '.join('%.1e' % x for x in H['b']), H['edge_growth'], cinfo['s_max'], okc,
                time.time() - t_start), flush=True)
        if t1 >= tmax:
            reason = 'no block entry before s=%g' % tmax
            break
        # time rescaling for the next segment: choose b so that the numerical pulse-family tangent has no
        # component along the flow at the end of the segment (a choice, not part of the checks)
        if PHASE:
            # rescaling by r = 1 + b (eps - e_m) moves the end point of the eps-tangent by exactly
            # b w seg F(end) (the flow carries F to F), so alpha(b) = alpha(0) + b w seg: one trial suffices
            tc = tr.copy()
            tc.advance(t1 + seg, (0.0, em_d), tol_bits=120)
            ctx.prec = pn.NPREC
            dd = [fl(arb(w2q) * (tc.tan[0][i] + dkap * tc.tan[1][i])) for i in range(4)]
            ctx.prec = PREC
            xx = [fl(v) for v in tc.x[:6]]
            Fv = np.array([xx[5] * (xx[2] - xx[0] - xx[1]), em_d * xx[5] * xx[0], xx[3], xx[2] - fl(nf.S(arb(xx[0])))])
            a0 = float(np.dot(dd, Fv) / np.dot(Fv, Fv))
            b_rho = -a0 / (w2f * seg)
            b_rho = float(np.clip(b_rho, -0.25 / w2f, 0.25 / w2f))
            st['phase_alpha_end0'] = a0
        X, Xe, cols = hset_lohner(H, S)
        t = t1
    cert['verdict'] = verdict
    cert['reason'] = reason
    cert['negative_checks'] = dict(NEG)
    if verdict == 'PASS' and not (NEG['slab_refused'] == NEG['stages'] == NEG['face_refused'] and NEG['block_refused']):
        cert['verdict'] = 'FAIL'
        cert['reason'] = 'a mutated check was not refused: %s' % NEG
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
    ap.add_argument('--shift', type=float, default=0.0, help='negative control: move the kappa window by shift*dk')
    ap.add_argument('--samecone', type=int, default=0, help='negative control: +1/-1 requires both faces in K+/K-')
    ap.add_argument('--out', default=None)
    A = ap.parse_args()
    e_lo, e_hi = _dec(A.e_lo), _dec(A.e_hi)
    t0 = time.time()
    cache_f = os.path.join(HERE, 'data', 'pulse_numerics.json')
    key = str((e_lo + e_hi) / 2)
    try:
        cache = json.load(open(cache_f))
    except Exception:
        cache = {}
    if key in cache:
        ctx.prec = pn.NPREC
        pinfo = cache[key]
        kap, dkap = arb(arb(pinfo['kappa*_80']).mid()), arb(arb(pinfo["kappa*'_60"]).mid())
        ctx.prec = PREC
        pinfo['from_cache'] = True
    else:
        kap, dkap, pinfo = pulse_data(e_lo, e_hi, A.c_guess)
        ctx.prec = pn.NPREC
        pinfo['kappa*_80'] = kap.str(80, radius=False)
        pinfo["kappa*'_60"] = dkap.str(60, radius=False)
        ctx.prec = PREC
        try:                                   # several runs may write at once: re-read, then replace atomically
            cache = json.load(open(cache_f))
        except Exception:
            cache = {}
        cache[key] = pinfo
        tmp = cache_f + '.%d' % os.getpid()
        json.dump(cache, open(tmp, 'w'), indent=1)
        os.replace(tmp, cache_f)
    print('numerical pulse data', pinfo, '%.0fs' % (time.time() - t0), flush=True)
    dk = A.dk if A.dk is not None else 2 * float((e_hi - e_lo).p) / float((e_hi - e_lo).q)
    SAME_CONE = A.samecone
    cert = run(e_lo, e_hi, kap, dkap, dk, seg=A.seg, a_fac=A.afac, shift=A.shift)
    cert['numerical_pulse'] = pinfo
    print('VERDICT', cert['verdict'], cert['reason'], 'T=%s' % cert.get('T'), '%.0fs' % cert['time_s'])
    if A.out:
        json.dump(cert, open(A.out, 'w'), indent=1)
