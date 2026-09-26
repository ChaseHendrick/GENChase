# blk_common.py -- shared definitions for the isolating block and the whole-interval integrator
# (review/lead/reimpl/block).  Not run on its own.
#
# Written from the model equations only.  Reuses review/lead/reimpl/common.py and vi_integrate.py
# (the earlier independent reimplementation); nothing from papers/nf-pulse/code, data, or
# review/lead/code, review/lead/math was read.
#
# Contents
#  * block_matrix(): the exact dyadic eigenvector matrix T_blk (columns: unstable, slow, fast,
#    fastest eigenvector of the linearisation at kappa_m, each scaled to U-component exactly 1,
#    other entries rounded to multiples of 2^-60) and its EXACT rational inverse.
#  * A_exact(s, kap): T_blk^{-1} J(s, kap) T_blk as an exact rational matrix, J(s,kap) the Jacobian
#    with S'(U) replaced by s.  J is affine in (s, kap).
#  * advance8(): one validated step of the "centre + first-order kappa term + remainder" integrator:
#    for every kappa in [kap0 - w, kap0 + w] the true solution satisfies
#        |x_kappa(t) - y(t) - (kappa - kap0) d(t)| <= z(t)   componentwise,
#    where y(t), d(t) are exact centres (d approximates dx/dkappa).  See BLOCK.md, section 3.
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))          # review/lead/reimpl
from flint import arb, fmpq, fmpq_mat, arb_mat, arb_series, ctx
import vi_integrate as VI                            # sets ctx.prec = 320, ctx.cap = 200
from common import BETA, THETA, EPS, C1, C2, consts, Sp_arb

A_, S0, s0 = VI.A, VI.S0, VI.s
beta = arb(BETA); eps = arb(EPS)
N = VI.N
S2MAX = fmpq(39)          # |S''| <= beta^2 / (6 sqrt 3) = 38.49... < 39 for every u

def dy(x, bits=60):
    """round an arb to an exact dyadic multiple of 2^-bits"""
    return fmpq(int((x.mid() * 2**bits).floor().unique_fmpz()), 2**bits)

def block_matrix(kap_m):
    """Exact T_blk (fmpq_mat) and its exact inverse, from eigenvectors at kap_m (an arb)."""
    lams, _ = VI.eigen_setup(kap_m)          # four certified real eigenvalue enclosures
    cols = []
    for l in lams:
        v = [arb(1), eps * kap_m / l, -s0 / (l**2 - 1), -s0 * l / (l**2 - 1)]
        cols.append([fmpq(1)] + [dy(x) for x in v[1:]])
    T = fmpq_mat([[cols[j][i] for j in range(4)] for i in range(4)])
    return T, T.inv(), lams

def J_exact(s, kap):
    e = EPS
    return fmpq_mat([[-kap, -kap, kap, 0], [e * kap, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])

def A_exact(T, Ti, s, kap):
    return Ti * J_exact(s, kap) * T

def kappa_range():
    """exact rational end points of kappa = 1/c for c in [c1, c2]"""
    return 1 / C2, 1 / C1

# ---------------------------------------------------------------- the whole-interval integrator
ser = VI.ser

def Sp_series(u, n):
    """S'(u) = beta S (1 - S) as a series, S = S0 + D(u)."""
    Sv = VI.D_series(u, n) + S0
    return Sv * (1 - Sv) * beta

def rhs8(Y, Dd, kap, n):
    """f(p) and the variational right-hand side Df(p) q + F1(p) for series p = Y, q = Dd."""
    YU, YV, YQ, YP = Y
    qU, qV, qQ, qP = Dd
    fx = [(YQ - YU - YV) * kap, YU * (eps * kap), YP, YQ - VI.D_series(YU, n)]
    sp = Sp_series(YU, n)
    fd = [(qQ - qU - qV) * kap + (YQ - YU - YV), qU * (eps * kap) + YU * eps, qP, qQ - sp * qU]
    return fx, fd

def taylor8(y, d, kap, n):
    Y = [ser([v], n + 1) for v in y]
    Dd = [ser([v], n + 1) for v in d]
    for _ in range(n + 1):
        fx, fd = rhs8(Y, Dd, kap, n + 1)
        Y = [ser([y[i]] + fx[i].integral().coeffs()[1:], n + 1) for i in range(4)]
        Dd = [ser([d[i]] + fd[i].integral().coeffs()[1:], n + 1) for i in range(4)]
    pad = lambda S: [arb(c.mid()) for c in (S.coeffs() + [arb(0)] * (n + 1))[: n + 1]]
    return [pad(S) for S in Y], [pad(S) for S in Dd]

def defect8(pc, qc, h, kap, n):
    """rigorous sup_{[0,h]} of |p' - f(p)| and |q' - Df(p) q - F1(p)| (Lagrange remainder on the ball [0,h])."""
    P0 = [ser(pc[i], n + 1) for i in range(4)]
    Q0 = [ser(qc[i], n + 1) for i in range(4)]
    fx0, fd0 = rhs8(P0, Q0, kap, n + 1)
    tau = arb(h / 2, h / 2 * (1 + fmpq(1, 2**20)))
    Pt = [VI.shift_series(pc[i], tau, n) for i in range(4)]
    Qt = [VI.shift_series(qc[i], tau, n) for i in range(4)]
    fxt, fdt = rhs8(Pt, Qt, kap, n + 1)
    hb = arb(h)
    out = []
    for cc, F0, Ft in ((pc, fx0, fxt), (qc, fd0, fdt)):
        rho = []
        for i in range(4):
            fc = F0[i].coeffs() + [arb(0)] * (n + 1)
            tot = arb(0)
            for k in range(n):
                tot += abs((k + 1) * cc[i][k + 1] - fc[k]) * hb**k
            fN = (Ft[i].coeffs() + [arb(0)] * (n + 1))[n]
            tot += abs(fN) * hb**n
            rho.append(arb(tot.upper()))
        out.append(rho)
    return out[0], out[1]

def advance8(y, d, z, kap0, w, hmax=fmpq(1, 2), hcap=None):
    """One validated step.  kap0: exact fmpq centre; w: exact fmpq half width of the kappa set.
    Returns y1, d1, z1, h, tube, where tube (4 arb) encloses x_kappa(t) for all t in the step and
    all kappa in the set."""
    kap = arb(kap0)
    kball = arb(kap0, w) if w > 0 else kap
    wb = arb(w)
    pc, qc = taylor8(y, d, kap, N)
    scale = max(abs(float(v.mid())) for v in y) + 1e-300
    dscale = max(abs(float(v.mid())) for v in d) + 1e-300
    cN = max(max(abs(float(pc[i][k].mid())) for i in range(4)) for k in (N - 1, N)) + 1e-300
    dN = max(max(abs(float(qc[i][k].mid())) for i in range(4)) for k in (N - 1, N)) + 1e-300
    hf = min((VI.TOL * scale / cN) ** (1.0 / N), (VI.TOL * dscale / dN) ** (1.0 / N) if max(abs(float(v.mid())) for v in d) > 0 else 1e9) * 0.7
    h = fmpq(int(min(hf, float(hmax)) * 2**20), 2**20)
    if h == 0:
        h = fmpq(1, 2**20)
    if hcap is not None and h >= hcap - fmpq(1, 2**20):
        h = hcap
    for _ in range(30):
        rx, rd = defect8(pc, qc, h, kap, N)
        okx = max(float(r.mid()) for r in rx) <= 16 * VI.TOL * scale
        okd = max(float(r.mid()) for r in rd) <= 16 * VI.TOL * dscale or dscale < 1e-290
        if okx and okd:
            break
        h = h / 2
    tau = arb(h / 2, h / 2 * (1 + fmpq(1, 2**20)))
    hullp = [VI.horner(pc[i], tau) for i in range(4)]
    hullq = [VI.horner(qc[i], tau) for i in range(4)]
    # second-order kappa terms: w^2 |F1(q)| + e_4 S2MAX (w q_U)^2 / 2
    F1q = [hullq[2] - hullq[0] - hullq[1], eps * hullq[0], arb(0), arb(0)]
    rho = [rx[i] + wb * rd[i] + wb**2 * abs(F1q[i]) for i in range(4)]
    rho[3] = rho[3] + arb(S2MAX) * (wb * abs(hullq[0]))**2 / 2
    rho = [arb(r.upper()) for r in rho]
    # centre tube: p + Delta kappa q over the step
    cen = [hullp[i] + arb(0, (wb * abs(hullq[i])).upper()) for i in range(4)]
    g = [z[i] + arb(h) * rho[i] for i in range(4)]
    eta = [arb((4 * gi + arb(fmpq(1, 2**400))).upper()) for gi in g]
    ok = False
    for _ in range(8):
        Utube = cen[0] + arb(0, eta[0])
        spmax = arb(Sp_arb(Utube).upper())
        M = VI.metzler(kball, spmax)
        Mp = VI.clip(M)
        EMp = (Mp * arb(h)).exp()
        Z = EMp * VI.vec(g)
        if all(Z[i, 0] < eta[i] for i in range(4)):
            ok = True; break
        eta = [arb((2 * Z[i, 0]).upper()) for i in range(4)]
    if not ok:
        raise RuntimeError("a priori bootstrap failed")
    EM = (M * arb(h)).exp()
    zn = EM * VI.vec(z) + arb(h) * (EMp * VI.vec(rho))
    ph = [VI.horner(pc[i], arb(h)) for i in range(4)]
    qh = [VI.horner(qc[i], arb(h)) for i in range(4)]
    y1 = [arb(v.mid()) for v in ph]
    d1 = [arb(v.mid()) for v in qh]
    z1 = [arb((zn[i, 0] + ph[i].rad() + wb * qh[i].rad()).upper()) for i in range(4)]
    tube = [cen[i] + arb(0, eta[i]) for i in range(4)]
    return y1, d1, z1, h, tube

def kappa_set(clo, chi, pad=fmpq(1, 2**310)):
    """exact dyadic centre kap0 and half width w with [kap0 - w, kap0 + w] containing [1/chi, 1/clo]."""
    klo, khi = 1 / chi, 1 / clo
    m = (klo + khi) / 2
    kap0 = fmpq(int((m * 2**300).floor()), 2**300)       # exact at prec 320
    w = max(khi - kap0, kap0 - klo) + pad
    return kap0, w

def start(clo, chi, log=print):
    """Start set on the a>0 (U-increasing) branch of the unstable manifold, valid for every
    c in [clo, chi]: the cone lemma of vi_integrate.start_set, checked with kappa as one ball."""
    kap0, w = kappa_set(clo, chi)
    kb = arb(kap0, w)
    y0, z0, lams, T, Ti = VI.start_set(kb, log)
    d0 = [arb(0)] * 4
    return y0, d0, z0, kap0, w

def to_block(Tib, y, d, z, w):
    """block coordinates (a, b1, b2, b3) enclosing Ti (y + Delta kappa d + [-z, z]) for all |Delta kappa| <= w."""
    Y = VI.vec(y); Dv = VI.vec(d); Z = VI.vec([arb(0, zi) for zi in z])
    zc = Tib * Y + arb(0, w) * (Tib * Dv) + Tib * Z if w > 0 else Tib * Y + Tib * Z
    return [zc[i, 0] for i in range(4)]

def tube_block(Tib, tube):
    zc = Tib * VI.vec(tube)
    return [zc[i, 0] for i in range(4)]

def bnorm_upper(zb):
    """an arb ball whose every element is >= |b|_2 for all b in the enclosure (use as an upper bound)"""
    return (sum(arb(abs(zb[i]).upper())**2 for i in range(1, 4))).sqrt()

# ---------------------------------------------------------------- start set for a kappa SET
# The start set of vi_integrate.start_set uses one eigenvector matrix for every kappa; over a kappa
# set of width 1e-25 its off-diagonal defect is ~1e-25, which forces the cone slope L >= 1e-24 and
# an initial error far too large for the long run.  Here the coordinates move with kappa:
#     y = T(kappa) z,   T(kappa) = T0 + (kappa - kap0) T1,
# T0, T1 exact dyadics (T1 = a numerical kappa-derivative of the eigenvector matrix).  The matrix
# Lt(kappa) = T(kappa)^{-1} J(kappa) T(kappa) is enclosed by the mean-value form
#     Lt(kappa) in Lt(kap0) + [-w, w] * dLt/dkappa(kappa set),
# which keeps the cancellation; its off-diagonal part is then O(w^2 + w * rounding) ~ 1e-50.
def _eigcols(kap):
    lams, _ = VI.eigen_setup(kap)
    cols = []
    for l in lams:
        cols.append([arb(1), eps * kap / l, -s0 / (l**2 - 1), -s0 * l / (l**2 - 1)])
    return cols

def moving_frame(kap0, bits=300):
    k0 = arb(kap0)
    c0 = _eigcols(k0)
    ep = fmpq(1, 2**100)
    cp = _eigcols(arb(kap0 + ep)); cm = _eigcols(arb(kap0 - ep))
    T0 = [[dy(c0[j][i], bits) for j in range(4)] for i in range(4)]
    T1 = [[dy((cp[j][i] - cm[j][i]) / (2 * arb(ep)), bits) for j in range(4)] for i in range(4)]
    return T0, T1

def start_kappa_set(clo, chi, log=print, Lexp=150, rbexp=315, dexp=166):
    """Cone-lemma start set (REIMPL.md section 3b, conditions C1, C2, C3) in the moving frame,
    valid for every kappa in [kap0 - w, kap0 + w] containing [1/chi, 1/clo].
    Returns y0, d0, z0, kap0, w with |x_kappa(0) - y0 - (kappa - kap0) d0| <= z0 for the point
    x_kappa(0) of the a>0 branch of W^u(kappa) with a = delta = 2^-dexp."""
    kap0, w = kappa_set(clo, chi)
    T0, T1 = moving_frame(kap0)
    T0m = arb_mat([[arb(x) for x in row] for row in T0]); T1m = arb_mat([[arb(x) for x in row] for row in T1])
    def Jm(k):
        return arb_mat([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s0, 0, 1, 0]])
    J1 = arb_mat([[-1, -1, 1, 0], [eps, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])     # dJ/dkappa
    # Lt at kap0
    Ti0 = T0m.inv()
    Lt0 = Ti0 * Jm(arb(kap0)) * T0m
    # dLt/dkappa over the whole set
    kb = arb(kap0, w)
    Tb = T0m + (kb - arb(kap0)) * T1m
    Tib = Tb.inv()
    dLt = Tib * (J1 * Tb + Jm(kb) * T1m) - Tib * T1m * Tib * Jm(kb) * Tb
    Lt = Lt0 + arb(0, w) * dLt
    nu_a = arb(Lt[0, 0].lower())
    nu_s = max(arb(Lt[i, i].upper()) for i in range(1, 4))
    eta = max(arb(abs(Lt[i, j]).upper()) for i in range(4) for j in range(4) if i != j)
    CU = sum(abs(Tb[0, j]) for j in range(4))
    L = arb(fmpq(1, 2**Lexp)); rb = arb(fmpq(1, 2**rbexp)); ra = rb / L
    Ub = CU * (ra + rb)
    uball = arb(0, Ub.upper())
    Sv = 1 / (1 + (-beta * (uball - arb(THETA))).exp())
    S2 = arb(abs(beta**2 * Sv * (1 - Sv) * (1 - 2 * Sv)).upper())
    gam = max(abs(Tib[i, 3]) for i in range(4)) * S2 * CU**2 / 2
    C1ok = eta * (1 + 2 * L + 3 * L**2) + gam * (1 + L)**3 * ra < L * (nu_a - nu_s)
    C2ok = nu_s + eta / L + 2 * eta + gam * (1 + 1 / L)**2 * rb < 0
    Aok = nu_a - 3 * eta * L - gam * (1 + L)**2 * ra > 0
    log(f"  moving-frame cone lemma over the kappa set: nu_a={nu_a.str(12)} nu_s={nu_s.str(12)} offdiag<={eta.str(3)} gamma<={gam.str(5)}")
    log(f"  L=2^-{Lexp} r_b=2^-{rbexp} r_a={ra.str(5)}; C1 {bool(C1ok)}, C2 {bool(C2ok)}, a'>0 {bool(Aok)}")
    if not (C1ok and C2ok and Aok):
        raise AssertionError("cone lemma conditions fail")
    delta = fmpq(1, 2**dexp)
    assert arb(delta) <= ra
    y0 = [arb(T0[i][0] * delta) for i in range(4)]
    d0 = [arb(T1[i][0] * delta) for i in range(4)]
    z0 = [arb((sum(abs(Tb[i, j]) for j in range(1, 4)) * L * arb(delta)
               + y0[i].rad() + arb(w) * d0[i].rad()).upper()) for i in range(4)]
    y0 = [arb(v.mid()) for v in y0]; d0 = [arb(v.mid()) for v in d0]   # exact centres
    return y0, d0, z0, kap0, w
