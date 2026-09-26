# vi_integrate.py -- Task 2: rigorous shooting at the two end speeds c1 and c2, with an integrator
# written for this review (not a C0-Lohner / Picard-a-priori scheme).
#
# Run:   python3 vi_integrate.py            (both ends; about 2-4 minutes each on one core)
#        python3 vi_integrate.py c1         (one end)
#        python3 vi_integrate.py c1+35 c1+36 (speeds c1 + K*1e-27: bracket c* more tightly; ~25 s each)
#        python3 vi_integrate.py lo hi      (controls at c = 1.1027477 and 1.1027478)
# Output: a log every few time units and a final verdict line per end.
#
# METHOD (all enclosures in python-flint arb ball arithmetic, prec 320 bits):
#  (a) Start. Eigen-coordinates y = T (a, b) at rest, T an exact dyadic approximation of the
#      eigenvector matrix, T^{-1} and L~ = T^{-1} J T enclosed in arb.  A LINEAR cone lemma
#      (proved in REIMPL.md, conditions C1, C2 checked here in arb) shows that the local unstable
#      set in Omega = {|a| <= r_a, |b|_inf <= r_b} lies in {|b| <= L |a|}, and that its a>0 branch
#      contains a point with a = delta for every 0 < delta <= r_a.  We start from the set
#      {a = delta, |b_i| <= L delta}.
#  (b) Step. At an exact centre y_n with a componentwise error bound z_n (|x_true - y_n| <= z_n):
#      1. p(t): a degree-N Taylor polynomial at y_n (Picard iteration on truncated power series;
#         NOT trusted: its coefficients are rounded to exact dyadics and treated as an arbitrary
#         polynomial).
#      2. Defect rho >= sup_{0<=t<=h} |p'(t) - f(p(t))|, rigorously: the Taylor coefficients of the
#         residual r at t = 0 below order N, plus the Lagrange term h^N |r^{(N)}(tau)/N!| with the
#         N-th coefficient of the residual's expansion computed at the BALL tau = [0, h].
#      3. Error e = x - p satisfies e' = A(t) e - r, A(t) in Df(tube).  Hence D+|e| <= M|e| + rho with
#         M the Metzler majorant of Df over the tube, and by the comparison theorem for
#         quasimonotone linear systems |e(t)| <= e^{Mt} z_n + int_0^t e^{M(t-s)} rho ds.
#         A priori: with M+ = M with its diagonal clipped at 0, sup_t |e| <= e^{M+ h}(z_n + h rho).
#         The tube radius eta is accepted only if that bound is < eta (continuity argument).
#      4. z_{n+1} = e^{Mh} z_n + h e^{M+ h} rho + radius of the ball p(h); y_{n+1} = midpoint of p(h).
#  (c) Decision: integrate until U leaves [-1, 1] with an enclosure of fixed sign.
# Independent of papers/nf-pulse/code/ (not read).
import sys, time, math
from flint import arb, fmpq, ctx, arb_mat, arb_series
from common import BETA, THETA, EPS, C1, C2, consts, Sp_arb

PREC = 320
ctx.prec = PREC
ctx.cap = 200               # arb_series truncation length (default 10 would silently cut the series)
N = 48                    # Taylor order
TOL = 2.0 ** -170         # target relative local defect (about 1e-51)
HMAX = fmpq(1, 2)

A, S0, s = consts()
beta = arb(BETA); eps = arb(EPS)

def ser(cs, n):
    return arb_series(list(cs)[:n], prec=n)

def D_series(u, n):
    """Series of D(u) = S(u) - S0 for a series u (length n), relative-accurate for small u."""
    uc = u.coeffs() + [arb(0)] * (n - len(u.coeffs()))
    E = (-beta * u).exp()
    ec = E.coeffs() + [arb(0)] * (n - len(E.coeffs()))
    om = [-(-beta * uc[0]).expm1()] + [-ec[k] for k in range(1, n)]   # 1 - E
    num = ser(om, n) * A
    den = (ser(ec, n) * A + 1) * (1 + A)
    return num / den

def f_series(Y, kap, n):
    YU, YV, YQ, YP = Y
    return [(YQ - YU - YV) * kap, YU * (eps * kap), YP, YQ - D_series(YU, n)]

def taylor_poly(y, kap, n):
    """Degree n Taylor polynomial at the point y (numerical; rounded to exact dyadics)."""
    Y = [ser([yi], n + 1) for yi in y]
    for _ in range(n + 1):
        F = f_series(Y, kap, n + 1)
        Y = [ser([y[i]] + F[i].integral().coeffs()[1:], n + 1) for i in range(4)]
    return [[arb(c.mid()) for c in (Yi.coeffs() + [arb(0)] * (n + 1))[: n + 1]] for Yi in Y]

def horner(pc, t):
    r = arb(0)
    for c in reversed(pc):
        r = r * t + c
    return r

def shift_series(pc, tau, n):
    """p(tau + s) as a series in s of length n+1 (tau may be a ball)."""
    acc = ser([arb(0)], n + 1)
    lin = ser([tau, arb(1)], n + 1)
    for c in reversed(pc):
        acc = acc * lin + c
    return acc

def defect(pc, h, kap, n):
    # low coefficients at t = 0
    P0 = [ser(pc[i], n + 1) for i in range(4)]
    F0 = f_series(P0, kap, n + 1)
    rho = []
    tau = arb(h / 2, h / 2 * (1 + fmpq(1, 2**20)))
    Pt = [shift_series(pc[i], tau, n) for i in range(4)]
    Ft = f_series(Pt, kap, n + 1)
    hb = arb(h)
    for i in range(4):
        fc = F0[i].coeffs() + [arb(0)] * (n + 1)
        tot = arb(0)
        for k in range(n):
            rk = (k + 1) * pc[i][k + 1] - fc[k]
            tot += abs(rk) * hb**k
        fN = (Ft[i].coeffs() + [arb(0)] * (n + 1))[n]
        tot += abs(fN) * hb**n
        rho.append(arb(tot.upper()))
    return rho

def expm(M):
    return M.exp()

def metzler(kap, spmax):
    kl = arb(kap.lower()); ku = arb(kap.upper())
    return arb_mat([[-kl, ku, ku, 0], [eps * ku, 0, 0, 0], [0, 0, 0, 1], [spmax, 0, 1, 0]])

def clip(M):
    """M+ : the Metzler majorant with its diagonal replaced by 0 (all diagonal entries of M are <= 0)."""
    return arb_mat([[M[i, j] if i != j else arb(0) for j in range(4)] for i in range(4)])

def vec(v):
    return arb_mat([[x] for x in v])

def eigen_setup(kap):
    co = [-eps * kap**2, kap * (s - 1), eps * kap**2 - 1, kap, arb(1)]
    def p(l):
        r = arb(0)
        for cc in reversed(co): r = r * l + cc
        return r
    def refine(a, b, n=300):
        sa = p(arb(a)) > 0
        for _ in range(n):
            m = (a + b) / 2; v = p(arb(m))
            if v > 0 or v < 0:
                if (v > 0) == sa: a = m
                else: b = m
            else: break
        return arb(a).union(arb(b))
    lams = [refine(fmpq(1, 2), fmpq(3, 2)), refine(fmpq(-1, 4), fmpq(-1, 20)),
            refine(fmpq(-3, 4), fmpq(-1, 4)), refine(fmpq(-2), fmpq(-1))]
    cols = []
    for l in lams:
        v = [arb(1), eps * kap / l, -s / (l**2 - 1), -s * l / (l**2 - 1)]
        cols.append([arb(x.mid()) for x in v])
    T = arb_mat([[cols[j][i] for j in range(4)] for i in range(4)])
    return lams, T

def start_set(kap, log):
    lams, T = eigen_setup(kap)
    Ti = T.inv()
    J = arb_mat([[-kap, -kap, kap, 0], [eps * kap, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])
    Lt = Ti * J * T
    nu_a = arb(Lt[0, 0].lower())
    nu_s = max(arb(Lt[i, i].upper()) for i in range(1, 4))
    eta = max(arb(abs(Lt[i, j]).upper()) for i in range(4) for j in range(4) if i != j)
    CU = sum(abs(T[0, j]) for j in range(4))
    L = arb(fmpq(1, 2**150))
    rb = arb(fmpq(1, 2**315))
    ra = rb / L
    Ub = CU * (ra + rb)
    uball = arb(0, Ub.upper())
    Sv = 1 / (1 + (-beta * (uball - arb(THETA))).exp())
    S2 = arb(abs(beta**2 * Sv * (1 - Sv) * (1 - 2 * Sv)).upper())
    gam = max(abs(Ti[i, 3]) for i in range(4)) * S2 * CU**2 / 2
    C1ok = eta * (1 + 2 * L + 3 * L**2) + gam * (1 + L)**3 * ra < L * (nu_a - nu_s)
    C2ok = nu_s + eta / L + 2 * eta + gam * (1 + 1 / L)**2 * rb < 0
    Aok = nu_a - 3 * eta * L - gam * (1 + L)**2 * ra > 0
    log(f"  cone lemma: nu_a={nu_a.str(12)} nu_s={nu_s.str(12)} offdiag<={eta.str(3)} gamma<={gam.str(5)}")
    log(f"  L=2^-150 r_b=2^-315 r_a={ra.str(5)}; C1 {bool(C1ok)}, C2 {bool(C2ok)}, a'>0 {bool(Aok)}")
    assert C1ok and C2ok and Aok
    delta = arb(fmpq(1, 2**166))
    assert delta <= ra
    y0 = [T[i, 0] * delta for i in range(4)]
    z0 = [arb((sum(abs(T[i, j]) for j in range(1, 4)) * L * delta + y0[i].rad()).upper()) for i in range(4)]
    y0 = [arb(y.mid()) for y in y0]
    return y0, z0, lams, T, Ti

def advance(y, z, kap, hcap=None):
    """One validated step from the exact centre y with componentwise error bound z.
    Returns (y_new, z_new, h, enclosure of U over the step).  hcap: optional upper limit on h
    (an exact fmpq); if the chosen h is within 2^-20 of it, the step lands exactly on hcap."""
    pc = taylor_poly(y, kap, N)
    scale = max(abs(float(yi.mid())) for yi in y) + 1e-300
    cN = max(max(abs(float(pc[i][k].mid())) for i in range(4)) for k in (N - 1, N)) + 1e-300
    h = min((TOL * scale / cN) ** (1.0 / N) * 0.7, float(HMAX))
    h = fmpq(int(h * 2**20), 2**20)
    if hcap is not None and h >= hcap - fmpq(1, 2**20):
        h = hcap
    # accept the step only if the RIGOROUS defect bound meets the tolerance; else halve h
    for _ in range(30):
        rho = defect(pc, h, kap, N)
        if max(float(r.mid()) for r in rho) <= 16 * TOL * scale:
            break
        h = h / 2
    # tube and a priori bound (bootstrap on the tube radius eta)
    tau = arb(h / 2, h / 2 * (1 + fmpq(1, 2**20)))
    hull = [horner(pc[i], tau) for i in range(4)]
    g = [z[i] + arb(h) * rho[i] for i in range(4)]
    eta = [arb((4 * gi + arb(fmpq(1, 2**400))).upper()) for gi in g]
    ok = False
    for _ in range(8):
        Utube = hull[0] + arb(0, eta[0])
        spmax = arb(Sp_arb(Utube).upper())
        M = metzler(kap, spmax)
        Mp = clip(M)
        EMp = expm(Mp * arb(h))
        Z = EMp * vec(g)
        if all(Z[i, 0] < eta[i] for i in range(4)):
            ok = True; break
        eta = [arb((2 * Z[i, 0]).upper()) for i in range(4)]
    assert ok, "a priori bootstrap failed"
    EM = expm(M * arb(h))
    znew = EM * vec(z) + arb(h) * (EMp * vec(rho))
    ph = [horner(pc[i], arb(h)) for i in range(4)]
    ynew = [arb(v.mid()) for v in ph]
    znew = [arb((znew[i, 0] + ph[i].rad()).upper()) for i in range(4)]
    return ynew, znew, h, hull[0] + arb(0, eta[0])

def run(cname, c, tmax=260, verbose=True):
    lines = []
    def log(m):
        lines.append(m)
        if verbose: print(m, flush=True)
    kap = 1 / arb(c)
    log(f"== {cname}: c = {c}  kappa = {kap.str(30, radius=True)}")
    y, z, lams, T, Ti = start_set(kap, log)
    log(f"  start: delta = 2^-166 along the unstable eigenvector, initial error <= {max(zz for zz in z).str(3)}")
    t = fmpq(0); nstep = 0; t0 = time.time(); nextlog = 0
    Umax = arb(-10); worst_rel = 0.0; nhalf_tot = [0]
    while t < tmax:
        y, z, h, Utube = advance(y, z, kap)
        Umax = Umax.union(Utube) if nstep else Utube
        t += h; nstep += 1
        rel = max(float(z[i].mid()) for i in range(4)) / (max(abs(float(v.mid())) for v in y) + 1e-300)
        worst_rel = max(worst_rel, rel)
        if float(t) >= nextlog:
            log(f"  t={float(t):7.2f} steps={nstep:5d} h={float(h):.3f}  U={float(y[0].mid()): .6e} "
                f"V-S0={float(y[1].mid()): .4e} Q-S0={float(y[2].mid()): .4e} P={float(y[3].mid()): .4e} "
                f"maxerr={max(float(zz.mid()) for zz in z):.2e} rel={rel:.1e}  [{time.time()-t0:.0f}s]")
            nextlog += 5
        U = arb(y[0], z[0])
        if abs(float(y[0].mid())) > 1:
            if U > 0: verdict = "+ (U -> +infinity side)"
            elif U < 0: verdict = "- (U -> -infinity side)"
            else: verdict = "UNDETERMINED"
            # unstable eigen-coordinate relative to rest
            yb = vec([arb(y[i], z[i]) for i in range(4)])
            a = (Ti * yb)[0, 0]
            log(f"  STOP t={float(t):.3f}: U in {U.str(15, radius=True)}; Q-S0 in {arb(y[2], z[2]).str(15, radius=True)}")
            log(f"  unstable eigen-coordinate a = {a.str(10, radius=True)}")
            log(f"  max U enclosure over all steps (upper) = {Umax.upper().str(12)}; worst relative width {worst_rel:.2e}")
            log(f"  VERDICT {cname}: leaves {verdict}   steps={nstep}  time {time.time()-t0:.0f}s")
            return verdict, lines
    log(f"  VERDICT {cname}: no decision before t={tmax}")
    return None, lines

if __name__ == "__main__":
    which = sys.argv[1:] or ["c1", "c2"]
    res = {}
    for w in which:
        named = {"c1": C1, "c2": C2, "lo": fmpq(11027477, 10**7), "hi": fmpq(11027478, 10**7)}
        if w in named:
            c = named[w]
        else:   # form c1+K  meaning c1 + K * 10^-27  (K integer, may be negative)
            c = C1 + fmpq(int(w[3:]), 10**27)
        res[w] = run(w, c)[0]
    print("SUMMARY:", res)
