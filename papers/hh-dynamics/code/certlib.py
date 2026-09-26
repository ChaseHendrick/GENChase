"""Certificates built on the Lohner integrator: Krawczyk on a Poincare section, Gershgorin bounds
on the multipliers, and the equilibrium (interval Newton + Routh-Hurwitz)."""
import numpy as np
from flint import arb, acb, arb_mat, acb_mat
from hh_lohner import (LSet, Integrator, poincare, col, colvals, ident, to_np, from_np)


# ------------------------------------------------------------------ section sets ----------
def section_set(d, sec, c, F, zbar, zrad, params, C1):
    """Initial set {x : x[sec] = c, x[F] in zbar +- zrad, x[p] in ball for (p, ball) in params}.

    zbar entries are floats (exact binary numbers); zrad floats (0 for a thin coordinate);
    params: list of (index, arb ball).
    """
    center = [arb(0)] * d
    center[sec] = arb(c)
    cols = []
    r0 = []
    for f, z, r in zip(F, zbar, zrad):
        center[f] = arb(z)
        if r > 0:
            e = np.zeros(d); e[f] = 1.0
            cols.append(e); r0.append(arb(0, r))
    for p, ball in params:
        mid = ball.mid()
        center[p] = mid
        e = np.zeros(d); e[p] = 1.0
        cols.append(e); r0.append(ball - mid)
    C = np.array(cols).T if cols else np.zeros((d, 0))
    return LSet.from_box(0.0, center, C, r0, C1=C1)


def poincare_on_section(system, sec, c, F, zbar, zrad, params, C1, order=20, tol_rem=1e-18,
                        scale=None, log=None):
    integ = Integrator(system, order=order, tol=tol_rem * 1e-3, tol_rem=tol_rem, hmax=2.0,
                       C1=C1, scale=scale)
    S = section_set(system.dim, sec, c, F, zbar, zrad, params, C1)
    res = poincare(integ, S, sec, c, log=log)
    res['stats'] = dict(integ.stats)
    return res


# ------------------------------------------------------------------ Krawczyk --------------
def krawczyk(Pzbar, DPZ, zbar, zrad):
    """Krawczyk operator for G(z) = P(z) - z on the box Z = zbar +- zrad.

    Pzbar: arb column (n x 1) enclosing P(zbar) (for every parameter value in the ball);
    DPZ:   arb matrix (n x n) enclosing DP(z) for every z in Z (and every parameter value).
    K = zbar - Cm (P(zbar) - zbar) + (I - Cm (DP(Z) - I)) (Z - zbar),  Cm = mid(DP - I)^{-1}.
    If K is contained in the interior of Z, G has exactly one zero in Z (Krawczyk 1969,
    Moore 1977, Rall 1980), for every parameter value in the ball.
    """
    n = len(zbar)
    A = to_np(DPZ) - np.eye(n)
    Cm = from_np(np.linalg.inv(A))
    I = ident(n)
    zb = col([arb(v) for v in zbar])
    dZ = col([arb(0, r) for r in zrad])
    K = zb - Cm * (Pzbar - zb) + (I - Cm * (DPZ - I)) * dZ
    Zbox = zb + dZ
    ok = all(Zbox[i, 0].contains_interior(K[i, 0]) for i in range(n))
    return ok, K, Zbox


# ------------------------------------------------------------------ multipliers -----------
def gershgorin_eigenbasis(DPZ):
    """Gershgorin discs of S^{-1} A S for every A in the interval matrix DPZ.

    S = numerical eigenvectors of mid(DPZ) (exact complex floats), S^{-1} enclosed rigorously.
    Returns a list of (center complex float, radius float upper bound), sorted by |center| desc.
    Every eigenvalue of every A in DPZ lies in the union of the discs; a union of k discs that
    is disjoint from the others contains exactly k eigenvalues (Gershgorin 1931).
    """
    n = DPZ.nrows()
    A = to_np(DPZ)
    w, V = np.linalg.eig(A)
    order = np.argsort(-np.abs(w))
    w = w[order]; V = V[:, order]
    for j in range(n):
        if abs(w[j].imag) < 1e-300:
            v = V[:, j]
            k = np.argmax(np.abs(v))
            v = v / v[k]
            V[:, j] = v.real
    S = acb_mat([[acb(float(V[i, j].real), float(V[i, j].imag)) for j in range(n)] for i in range(n)])
    Sinv = S.inv()
    M = Sinv * acb_mat(DPZ) * S
    discs = []
    for i in range(n):
        cen = M[i, i]
        cmid = complex(float(cen.real.mid()), float(cen.imag.mid()))
        R = abs(cen - acb(cmid.real, cmid.imag))
        for j in range(n):
            if j != i:
                R = R + abs(M[i, j])
        discs.append((cmid, float(R.upper()) * (1 + 1e-15) + 1e-300))
    return discs


def disc_modulus_bounds(disc):
    """Rigorous bounds on |z| for z in the disc: returns (lo, hi) as arb balls whose lower / upper
    endpoints are the bounds (compare with arb semantics, print with float())."""
    cen, R = disc
    m = abs(acb(cen.real, cen.imag))
    return (m - arb(R)).lower(), (m + arb(R)).upper()


def multiplier_test(DPZ, kind):
    """The multiplier verdict of the certificates, as one function so that the negative controls call it.

    DPZ encloses DP(z) for every z in the Krawczyk box (and every parameter value).  Every eigenvalue of
    every member lies in the union of the Gershgorin discs of gershgorin_eigenbasis(DPZ).
      kind = 'stable':   every disc lies in the open unit disc, so every nontrivial multiplier has |mu| < 1;
      kind = 'unstable': disc 1 lies outside the closed unit disc, is centred on the positive real axis,
                         and the other discs lie in the open unit disc.  Disc 1 is then disjoint from the
                         others, so it holds exactly one eigenvalue (Gershgorin), which is real because the
                         disc is symmetric about the real axis and DP is real, and > 1.
    Returns (verdict, discs, modulus bounds).
    """
    discs = gershgorin_eigenbasis(DPZ)
    mods = [disc_modulus_bounds(dc) for dc in discs]
    if kind == 'stable':
        okM = all(hi < 1 for lo, hi in mods)
    elif kind == 'unstable':
        okM = ((mods[0][0] > 1) and all(hi < 1 for lo, hi in mods[1:]) and discs[0][0].imag == 0.0
               and discs[0][0].real > 0)
    else:
        raise ValueError(kind)
    return okM, discs, mods


def infnorm_lower(M):
    """Rigorous lower bound (an exact arb) of max_i sum_j |A_ij|, valid for EVERY member A of M."""
    best = arb(0)
    for i in range(M.nrows()):
        acc = arb(0)
        for j in range(M.ncols()):
            acc = acc + abs(M[i, j]).lower()
        low = acc.lower()
        if low > best:
            best = low
    return best


def infnorm_upper(M):
    """Rigorous upper bound (an exact arb) of max_i sum_j |M_ij| over the interval matrix M."""
    best = arb(0)
    for i in range(M.nrows()):
        s = arb(0)
        for j in range(M.ncols()):
            s = s + abs(M[i, j])
        u = s.upper()
        if u > best:
            best = u
    return best


# ------------------------------------------------------------------ periodic orbit ----------
class CertificateFailure(RuntimeError):
    pass


def _sub(res, F, Fc):
    return arb_mat(len(F), len(Fc), [res['DP'][a, b] for a in F for b in Fc])


def certify_orbit(system, sec, zbar0, params, kind, log, order=20, tol_rem=1e-18, scale=None,
                  newton_iters=6, zrad_min=1e-15):
    """Krawczyk proof of a periodic orbit through the section `sec` and multiplier bounds.

    kind = 'stable': all nontrivial multipliers in the open unit disk;
    kind = 'unstable': exactly one multiplier (real) outside the closed unit disk, the others inside.
    """
    import time
    d = system.dim
    npar = [p for p, _ in params]
    F = [j for j in range(d) if j != sec.idx and j not in npar]
    n = len(F)

    def run(zb, zr, C1):
        integ = Integrator(system, order=order, tol=tol_rem * 1e-3, tol_rem=tol_rem, hmax=2.0,
                           C1=C1, scale=scale)
        S = section_set(d, sec.idx, sec.c, F, zb, zr, params, C1)
        t0 = time.time()
        res = poincare(integ, S, sec)
        res['time'] = time.time() - t0
        res['nsteps'] = integ.stats['steps']
        return res

    # 1. refine the candidate (Newton with the midpoints of thin C^1 runs; not part of the proof)
    zbar = np.array(zbar0, dtype=float)
    for it in range(newton_iters):
        r = run(list(zbar), [0.0] * n, True)
        Pm = np.array([float(r['P'][j, 0].mid()) for j in F])
        DPm = to_np(_sub(r, F, F))
        dz = np.linalg.solve(DPm - np.eye(n), -(Pm - zbar))
        log('    Newton %d: |P(z)-z| = %.3e, step %.3e (%.1fs)' % (it, np.abs(Pm - zbar).max(),
                                                               np.abs(dz).max(), r['time']))
        zbar = zbar + dz
        if np.abs(dz).max() < 1e-15 or (it >= 1 and np.abs(Pm - zbar + dz).max() < 1e-15):
            break
    zbar = [float(v) for v in zbar]
    # 2. P(zbar) for every parameter value
    r0 = run(zbar, [0.0] * n, False)
    Pz = col([r0['P'][j, 0] for j in F])
    log('    C^0 run: P(zbar) - zbar = %s, radius %.2e (%d steps, %.1fs)' % (
        np.array2string(np.array([float(Pz[i, 0].mid()) - zbar[i] for i in range(n)]), precision=3),
        max(float(Pz[i, 0].rad()) for i in range(n)), r0['steps'], r0['time']))
    Cm = np.linalg.inv(DPm - np.eye(n))
    defect = np.array([abs(float(Pz[i, 0].mid()) - zbar[i]) + float(Pz[i, 0].rad()) for i in range(n)])
    est = np.abs(Cm) @ defect
    zrad = [max(8 * e, zrad_min) for e in est]
    for attempt in range(4):
        r1 = run(zbar, zrad, True)
        DPZ = _sub(r1, F, F)
        okK, K, Z = krawczyk(Pz, DPZ, zbar, zrad)
        radDP = max(float(DPZ[i, j].rad()) for i in range(n) for j in range(n))
        log('    C^1 run over Z (radius %s): DP radius %.2e, return time %s (%d steps, %.1fs); Krawczyk K '
            'in int Z: %s' % (np.array2string(np.array(zrad), precision=2), radDP, r1['tau'].str(15, radius=True),
                              r1['steps'], r1['time'], okK))
        if okK:
            break
        zrad = [4 * z for z in zrad]
    if not okK:
        raise CertificateFailure('Krawczyk test failed')
    okM, discs, mods = multiplier_test(DPZ, kind)
    return {'ok': okK and okM, 'krawczyk': okK, 'multipliers_ok': okM, 'K': K, 'Z': Z, 'zbar': zbar,
            'zrad': zrad, 'DPZ': DPZ, 'discs': discs, 'mods': mods, 'tau': r1['tau'], 'Pz': Pz,
            'extremes': r1['extremes'], 'passes': r1['passes'], 'F': F, 'steps': r1['steps'],
            'DPfull': r1['DP']}


# ------------------------------------------------------------------ equilibrium -----------
def _steady(sysm, u):
    """(m_inf, n_inf, h_inf) and their u-derivatives at the ball u (interval evaluation)."""
    R = sysm.rate_coeffs(u, 1)
    out = []
    for a, s in (('am', 'sm'), ('an', 'sn'), ('ah', 'sh')):
        a0, a1 = R[a][0], R[a][1]
        s0, s1 = R[s][0], R[s][1]
        out.append((a0 / s0, (a1 * s0 - a0 * s1) / (s0 * s0)))
    return out


def I_ss(sysm, u, E):
    (mi, _), (ni, _), (hi, _) = _steady(sysm, u)
    return (sysm.gna * mi ** 3 * hi * (u - sysm.ena) + sysm.gk * ni ** 4 * (u - sysm.ek)
            + sysm.gl * (u - E))


def dI_ss(sysm, u):
    (mi, dmi), (ni, dni), (hi, dhi) = _steady(sysm, u)
    g = sysm.gna * (3 * mi ** 2 * dmi * hi + mi ** 3 * dhi) * (u - sysm.ena) + sysm.gna * mi ** 3 * hi
    g += sysm.gk * 4 * ni ** 3 * dni * (u - sysm.ek) + sysm.gk * ni ** 4
    return g + sysm.gl


def certify_equilibrium(J, E, u_guess, log):
    """Existence, uniqueness and asymptotic stability of the equilibrium for every E in the ball E.

    The equilibria are the points (u, m_inf(u), n_inf(u), h_inf(u)) with F(u) = I_ss(u) - J = 0, where
    I_ss(u) = 120 m_inf^3 h_inf (u - 115) + 36 n_inf^4 (u + 12) + 0.3 (u - E).

    Lemma (signs outside [-12, 115]).  For every real u the rates alpha_x(u), beta_x(u) are > 0 (Psi > 0 and
    exponentials are > 0), so x_inf(u) = alpha_x / (alpha_x + beta_x) lies in (0, 1).  Hence
      u >= 115:  I_Na >= 0, I_K > 0 and I_l >= 0.3 (115 - E), so F(u) >= 0.3 (115 - E) - J;
      u <= -12:  I_Na < 0, I_K <= 0 and I_l < 0 when E > -12, so F(u) < -J <= 0 when J >= 0.
    Both conclusions are decided below in ball arithmetic (0.3 (115 - E) - J > 0, E > -12, J >= 0) and
    printed; on [-12, 115] zeros are excluded by interval evaluation and a monotonicity argument.
    """
    from hh_arb import HH
    sysm = HH(J)
    Jb = sysm.J
    um = arb(u_guess)
    F = lambda u: I_ss(sysm, u, E) - Jb
    Fm = F(um)
    d0 = dI_ss(sysm, um)
    rho = 2.0 * (abs(float(Fm.mid())) + float(Fm.rad())) / float(d0.mid()) + 1e-12
    U = um + arb(0, rho)
    dU = dI_ss(sysm, U)
    N = um - Fm / dU
    okN = (dU > 0) and U.contains_interior(N)
    log('    interval Newton on F(u) = I_ss(u) - J: U = %s, F\'(U) = %s, N(U) = %s, N(U) in int U: %s'
        % (U.str(12, radius=True), dU.str(6, radius=True), N.str(12, radius=True), okN))
    if not okN:
        raise CertificateFailure('interval Newton for the equilibrium failed')
    U = N                                  # the zero lies in N(U) as well
    for it in range(4):                    # tighten: the zero stays in N(U) intersected with U
        um2 = U.mid()
        N2 = um2 - F(um2) / dI_ss(sysm, U)
        U = U.intersection(N2)
    log('    after 4 more interval Newton steps: u* in %s' % U.str(15, radius=True))
    # uniqueness on [-12, 115]; outside, the sign of I_ss - J is fixed (the lemma in the docstring)
    lo_bound = sysm.gl * (arb(115) - E) - Jb
    okHigh = lo_bound > 0
    okLow = (E > -12) and (Jb >= 0)
    okOut = okHigh and okLow
    log('    for u >= 115: I_Na, I_K >= 0 and I_l >= 0.3 (115 - E) so F >= 0.3 (115 - E) - J = %s > 0: %s'
        % (lo_bound.str(6, radius=True), okHigh))
    log('    for u <= -12: I_Na < 0, I_K <= 0, and I_l < 0 because E > -12 (E in %s: %s); J >= 0 (%s), so '
        'F < 0: %s' % (E.str(6, radius=True), E > -12, Jb >= 0, okLow))
    W = um + arb(0, 1.0)
    # F' > 0 on W, by subdivision
    npieces = 64
    wl, wh = float(W.lower().mid()), float(W.upper().mid())
    okW = True
    for k in range(npieces):
        a = wl + (wh - wl) * k / npieces
        b = wl + (wh - wl) * (k + 1) / npieces
        piece = arb(a).union(arb(b))
        if not (dI_ss(sysm, piece) > 0):
            okW = False
    okW = okW and (arb(wl) < U.lower()) and (U.upper() < arb(wh))
    log('    F\' > 0 on W = [%.6f, %.6f] (64 pieces) and U inside W: %s, so the zero in U is the only zero in W'
        % (wl, wh, okW))
    # exclusion of zeros on [-12, 115] minus W by bisection
    stack = [(-12.0, wl), (wh, 115.0)]
    nbox = 0
    okEx = True
    while stack:
        a, b = stack.pop()
        nbox += 1
        piece = arb(a).union(arb(b))
        v = F(piece)
        if v.contains(0):
            if b - a < 1e-6:
                okEx = False
                break
            m = 0.5 * (a + b)
            stack.append((a, m)); stack.append((m, b))
    log('    F has no zero on [-12, 115] outside W (%d interval evaluations): %s' % (nbox, okEx))
    if not (okOut and okW and okEx):
        raise CertificateFailure('uniqueness of the equilibrium not proved')
    # Jacobian enclosure at the equilibrium box
    st = _steady(sysm, U)
    X = [U, st[0][0], st[1][0], st[2][0], E]
    A5 = sysm.Df(X)
    A = arb_mat(4, 4, [A5[i, j] for i in range(4) for j in range(4)])
    cp = A.charpoly()
    co = [cp[i] for i in range(5)]           # a4 (constant), a3, a2, a1, 1
    a4, a3, a2, a1 = co[0], co[1], co[2], co[3]
    h2 = a1 * a2 - a3
    h3 = h2 * a3 - a1 * a1 * a4
    okRH = (a1 > 0) and (a3 > 0) and (a4 > 0) and (h2 > 0) and (h3 > 0)
    log('    characteristic polynomial s^4 + a1 s^3 + a2 s^2 + a3 s + a4 of the Jacobian (enclosed):')
    log('      a1 = %s, a2 = %s, a3 = %s, a4 = %s' % tuple(c.str(10, radius=True) for c in (a1, a2, a3, a4)))
    log('      Hurwitz: a1 > 0, a3 > 0, a4 > 0, a1 a2 - a3 = %s > 0, (a1 a2 - a3) a3 - a1^2 a4 = %s > 0: %s'
        % (h2.str(8, radius=True), h3.str(8, radius=True), okRH))
    discs = gershgorin_eigenbasis(A)
    return {'ok': okN and okRH, 'U': U, 'X': X, 'A': A, 'coeffs': (a1, a2, a3, a4), 'hurwitz': (h2, h3),
            'discs': discs}
