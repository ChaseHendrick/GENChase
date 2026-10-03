"""Isolated6-state prescribed-voltage SC prototype, copied from frozen point-Hill producer.

No physical phase assertion. Complete operator enclosures remain explicit premises.
Changes: DIM6, IV-1, diffusion0, full18 error supplied before projection, count0,
phase sanity omitted because this block is not the full orbit linearization.
The original stability.py is never modified.
"""
import math
import time
import stability as native
from stability import np, arb, acb, arb_mat, acb_mat, fmpq, Fraction, ctx, am, ct, ex
from stability import up, lo, amax, bound_rec, colsum_max, abs_mat, colsums_abs
from stability import dyadic_up, best_U, frac, arb_of_fraction, _n1
from stability import ProofFailure, InputMismatch
DIM, IV = 6, -1
NATIVE_SOURCE_SHA256 = "00fbb6e03537f8c455fa80dd1e5940401214c580ca87bc13de32b0a310bccd8b"

def search_S(Jmid, Xs, g0, delta, tols, log=print, max_sweeps=40):
    """Floating-point search of e (S = diag 2^e, e_0 = 0) minimizing sigma_off(S) max_r rho_r(S) (route A).
    Continuous minimization of the S-weighted condition number of the eigenvectors of X_0 (row and column
    scalings), rounding, then an integer coordinate search. Untrusted: only its result is used, as exact data."""
    from scipy.optimize import minimize
    lam, U = np.linalg.eig(Xs[0])
    Ui = np.linalg.inv(U)
    g = lambda x: math.log(_n1(np.exp(x[:DIM])[:, None] * U * np.exp(x[DIM:])[None, :]) *  # noqa: E731
                           _n1(np.exp(-x[DIM:])[:, None] * Ui * np.exp(-x[:DIM])[None, :]))
    best = None
    for i in range(3):
        r = minimize(g, 0.1 * np.random.default_rng(i).normal(size=2*DIM), method="Powell", options={"maxiter": 40000})
        if best is None or r.fun < best.fun:
            best = r
    e = -best.x[:DIM] / math.log(2)
    e = np.round(e - e[0]).astype(int)

    def theta(e):
        s = 2.0 ** e
        so = sum(_n1(Jmid[n] * s[None, :] / s[:, None]) for n in Jmid if n != 0)
        w = 0.0
        for X in Xs:
            w = max(w, best_U(X * s[None, :] / s[:, None], g0, delta, tols)[0])
        return so * w

    cur = theta(e)
    t0 = time.time()
    improved = True
    sweeps = 0
    while improved and sweeps < max_sweeps:          # deterministic (no wall-time limit)
        sweeps += 1
        improved = False
        for i in range(1, DIM):
            for stp in (1, -1, 2, -2):
                e2 = e.copy()
                e2[i] += stp
                v = theta(e2)
                if v < cur * 0.999:
                    e, cur = e2, v
                    improved = True
    log(f"  S search: floating-point theta_T estimate {cur:.4f}, e = {e.tolist()} ({time.time() - t0:.1f} s local)")
    return [int(v) for v in e]

def certify_gate(N, inp, st, controls, log, mark, prec):
    if N != 1 or controls:
        raise ValueError("prescribed-voltage gate requires N1 and no controls")
    Kp = inp["Kp"]
    nA = Kp
    hN = N // 2
    Ke = int(controls.get("Ke", hN + int(st["Ke_offset"])))
    n_c = int(st["n_c"])
    if not n_c >= 1:
        raise ValueError("n_c >= 1")
    nW = DIM * (2 * Ke + 1)
    nmax = 2 * Ke + n_c
    sgn = int(controls.get("damping_sign", 1))
    drop = set(int(v) for v in controls.get("drop", []))
    E = acb_mat(DIM, DIM)
    # No voltage coordinate or diffusion is present in this block.

    # ---- 1. constants
    c4 = arb(0) # prescribed-voltage block has no diffusion;                       # 4c (upper)
    dm = {m: acb(0) for m in range(-(Ke + n_c + 2), Ke + n_c + 3)}

    # ---- 2. coefficients
    rho, rho0, rho2, Rk = inp["rho"], inp["rho0"], inp["rho2"], inp["R"]
    rho_e = rho0 if rho0 < rho2 else rho2
    # Full18-variable Cauchy uncertainty was formed before6-block projection.
    r_ex = inp["r"]
    eps = inp["eps_direct"]

    om_lo = inp["om_lo"] if "omega_lo" not in controls else arb(controls["omega_lo"])
    om_hi = inp["om_hi"]
    if not (om_lo.is_exact() and om_lo > 0 and om_lo <= om_hi):
        raise ProofFailure("omega_lo must be exact, > 0 and <= omega_hi (C0)")
    om_ball = om_lo.union(om_hi)
    omf = float(inp["om_bar"])

    # floating-point data for the choices (midpoints; never used in a bound)
    Jmid = {n: np.array([[complex(float(inp["J"][n][r][c].real.mid()), float(inp["J"][n][r][c].imag.mid()))
                          for c in range(DIM)] for r in range(DIM)]) for n in range(-Kp, Kp + 1)}
    for n in (drop if not controls.get("drop_proof_only") else ()):
        Jmid[n] = np.zeros((DIM, DIM), complex)
        Jmid[-n] = np.zeros((DIM, DIM), complex)
    a0c_unscaled = [[inp["J"][0][r][c].real.mid() for c in range(DIM)] for r in range(DIM)]   # exact (A0c)
    dmf = lambda m: 0.0  # noqa: E731

    # ---- 4. geometry (needed by the S search)
    delta, delta_fr = dyadic_up(st["delta"])
    eta_t = ex._exact_dyadic_param(st["eta_tail"], "eta_tail")
    b = arb(omf * (N / 2 + 0.25))                             # an exact double near omega_bar (N/2 + 1/4)
    a = -b
    h = b
    g0 = om_lo * (Ke + 1) - h
    log(f"N = {N}: K_e = {Ke} (n_W = {nW}), n_c = {n_c}, delta = {float(delta):.6e} (dyadic >= {st['delta']}), "
        f"b = -a = {float(b):.6f}, prec = {prec}" + (f", CONTROLS {controls}" if controls else ""))

    # ---- choose S (floating point)
    delf = float(delta)
    g0f = float(g0.mid())
    Xs_f = [np.array([[float(a0c_unscaled[r][c]) for c in range(DIM)] for r in range(DIM)]) for _ in range(hN + 1)]
    for rr in range(hN + 1):
        Xs_f[rr][IV, IV] -= dmf(rr)
    if st["S_exps"] is None:
        e = search_S({n: Jmid[n] for n in range(-min(Kp, 60), min(Kp, 60) + 1)}, Xs_f, g0f, delf,
                     st["cluster_tols"], log=log)
    else:
        e = [int(v) for v in st["S_exps"]]
    if len(e) != DIM:
        raise ValueError("S needs 18 exponents")
    sf = 2.0 ** np.array(e, dtype=float)
    mark("choose S")

    def two(k):
        return arb(2) ** k if k >= 0 else arb(fmpq(1, 2 ** (-k)))
    scl = [[two(e[c] - e[r]) for c in range(DIM)] for r in range(DIM)]      # (S^{-1} M S)_{rc} = M_rc 2^{e_c - e_r}

    Q = acb(arb(0, 1), arb(0, 1))                                             # contains the closed unit disc
    erho, erhoe = (-rho).exp(), (-rho_e).exp()
    epsS = [[up(eps[r][c] * scl[r][c]) for c in range(DIM)] for r in range(DIM)]
    SJS = [[up(inp["SJ"][r][c] * scl[r][c]) for c in range(DIM)] for r in range(DIM)]
    s1 = colsum_max(arb_mat(SJS))
    s2 = colsum_max(arb_mat(epsS))
    q1, q2 = erho, erhoe

    def Gtail(k):
        return up(2 * (s1 * q1 ** k / (1 - q1) + s2 * q2 ** k / (1 - q2)))

    AS, absA, nrm = {}, {}, {}
    nlist = max(nmax, nA)
    for n in range(-nlist, nlist + 1):
        if abs(n) in drop:
            M = acb_mat(DIM, DIM)
        elif abs(n) <= nA:
            en = erhoe ** abs(n)
            M = acb_mat([[(inp["J"][n][r][c] + Q * up(eps[r][c] * en)) * scl[r][c] for c in range(DIM)]
                         for r in range(DIM)])
        else:
            e1, e2 = erho ** abs(n), erhoe ** abs(n)
            M = acb_mat([[Q * up((inp["SJ"][r][c] * e1 + eps[r][c] * e2) * scl[r][c]) for c in range(DIM)]
                         for r in range(DIM)])
        AS[n] = M
        absA[n] = abs_mat(M)
        nrm[n] = colsum_max(absA[n])
    A0c = arb_mat([[a0c_unscaled[r][c] * scl[r][c] for c in range(DIM)] for r in range(DIM)])   # exact
    for r in range(DIM):
        for c in range(DIM):
            assert A0c[r, c].is_exact()
    dA0 = colsum_max(arb_mat([[(AS[0][r, c] - A0c[r, c]).abs_upper() for c in range(DIM)] for r in range(DIM)]))
    sigma_off = arb(0)
    for n in range(-nA, nA + 1):
        if n != 0:
            sigma_off += nrm[n]
    sigma_off = up(sigma_off + Gtail(nA + 1))
    theta_c = up(sigma_off + dA0)
    mark("coefficients")

    # ---- 3. alpha and R_0 (C1)
    alpha = up(sigma_off + nrm[0] + c4)
    R0 = arb(1)
    while not R0 > alpha:
        R0 = R0 * 2
    # ---- 4. (C1)
    c1 = dict(delta_pos=bool(delta > 0), a_neg=bool(a < 0), b_pos=bool(b > 0),
              height=bool(b - a >= om_hi * N), b_below=bool(b < om_lo * N), a_above=bool(-a < om_lo * N),
              R0=bool(R0 > alpha))
    if not all(c1.values()):
        raise ProofFailure(f"(C1) geometry fails: {c1}")
    if not g0 > 0:
        raise ProofFailure("g_0 = omega_lo (K_e + 1) - h is not > 0 (window too small)")

    # ---- 5. tail, route A (C2)
    tail = []
    tail_X = []
    rho_T = arb(0)
    for rr in range(hN + 1):
        X = acb_mat([[acb(A0c[i, j]) - (dm[rr] if (i == IV and j == IV) else 0) for j in range(DIM)]
                     for i in range(DIM)])
        Xf = Xs_f[rr] * sf[None, :] / sf[:, None]
        rt_f, tol, Uf, df = best_U(Xf, float(g0.mid()) - float(eta_t), delf + float(eta_t), st["cluster_tols"])
        U = acb_mat([[acb(complex(v)) for v in row] for row in Uf])
        try:
            Ui = U.inv()
        except ZeroDivisionError:
            raise ProofFailure(f"U_{rr} not certainly invertible")
        Lr = [acb(complex(v)) for v in df]
        F = Ui * X * U
        for l in range(DIM):
            F[l, l] -= Lr[l]
        Fn = colsum_max(abs_mat(F))
        kap = up(colsum_max(abs_mat(U)) * colsum_max(abs_mat(Ui)))
        gam = None
        for l in range(DIM):
            x1 = lo(-delta - eta_t - Lr[l].real)
            x2 = lo(g0 - eta_t - abs(Lr[l].imag))
            v = x1 if x1 > x2 else x2
            gam = v if gam is None or v < gam else gam
        if not gam > Fn:
            raise ProofFailure(f"route A: gamma_{rr} = {float(gam):.4e} is not > ||F_{rr}|| = {float(Fn):.4e}")
        rho_r = up(kap / (gam - Fn))
        rho_T = amax(rho_T, rho_r)
        tail_X.append(Xf)
        tail.append(dict(r=rr, cluster_tol=tol, kappa=float(kap), F_norm=float(Fn), gamma=float(gam),
                         rho=float(rho_r), d_r=float(dm[rr].real.mid())))
    theta_T = up(theta_c * rho_T)
    log(f"  tail (route A): rho_T = {float(rho_T):.4f}, sigma_off = {float(sigma_off):.4f}, "
        f"||A_0 - A0c|| = {float(dA0):.3e}, theta_T = {float(theta_T):.4f}, max kappa_r = "
        f"{max(x['kappa'] for x in tail):.2f}")
    if not theta_T < 1:
        raise ProofFailure(f"theta_T = theta_c rho_T = {float(theta_T):.4f} is not < 1 (tail)")
    mark("tail route A")

    # ---- 6. window: choices
    ms = list(range(-Ke, Ke + 1))
    Hf = np.zeros((nW, nW), complex)
    for i, m in enumerate(ms):
        for k, mp in enumerate(ms):
            if abs(m - mp) <= Kp:
                Hf[DIM * i:DIM * i + DIM, DIM * k:DIM * k + DIM] = Jmid[m - mp]
        Hf[DIM * i:DIM * i + DIM, DIM * i:DIM * i + DIM] += -1j * omf * m * np.eye(DIM)
        Hf[DIM * i + IV, DIM * i + IV] -= dmf(m)
    Ss = np.tile(sf, len(ms))
    Hf = Hf * Ss[None, :] / Ss[:, None]                          # S-coordinates (exact power-of-two scaling)
    lam, Vf = np.linalg.eig(Hf)
    del Hf
    Vf = Vf / np.abs(Vf).sum(0)[None, :]
    if "lie_lead_re" in controls:                                # test hook: floating data that lie
        cand = [j for j in range(nW) if abs(lam[j].imag) < float(b) and abs(lam[j]) > 1e-9]
        cand.sort(key=lambda j: -lam[j].real)
        for j in cand[:2]:
            lam[j] = complex(float(controls["lie_lead_re"]), lam[j].imag)
    Vif = np.linalg.inv(Vf)
    mark("window eig (LAPACK)")

    # ---- 7. distances and count (C3), (C5); decided before the Arb window products (they do not depend on them)
    dF, R0F, aF, bF = delta_fr, frac(R0), frac(a), frac(b)
    dist, inside = [], []
    for z in lam:
        x, y = Fraction(float(z.real)), Fraction(float(z.imag))
        ins = (-dF < x < R0F) and (aF < y < bF)
        inside.append(ins)
        if ins:
            d = min(x + dF, R0F - x, y - aF, bF - y)
            dist.append(lo(arb_of_fraction(d)))
        else:
            dx = max(-dF - x, Fraction(0), x - R0F)
            dy = max(aF - y, Fraction(0), y - bF)
            d2 = dx * dx + dy * dy
            dist.append(lo(arb_of_fraction(d2).sqrt()) if d2 > 0 else arb(0))
    count = sum(inside)
    nonpos = [j for j in range(nW) if not dist[j] > 0]
    if nonpos:
        raise ProofFailure(f"(C3) dist_j = 0 for {len(nonpos)} window eigenvalues (on Gamma)")
    in_list = [complex(lam[j]) for j in range(nW) if inside[j]]
    if count != 0 and not controls.get("skip_count"):
        raise ProofFailure(f"(C5) count of window eigenvalues in Omega is {count}, not 0: {in_list[:6]}")
    mark("distances, count")

    zeta = np.ones(nW)
    if st["zeta"] != "ones":
        raise ValueError("only zeta = 'ones' is implemented")
    zT = arb(1)

    # ---- 6. window: Arb
    AS_l = {n: AS[n].tolist() for n in range(-2 * Ke, 2 * Ke + 1)}
    Hb_rows = []
    for i, m in enumerate(ms):
        diag = AS[0] + acb_mat([[(acb(0, -m) * om_ball if r == c else acb(0)) - (dm[m] if r == c == IV else 0)
                                 for c in range(DIM)] for r in range(DIM)])
        dl = diag.tolist()
        blocks = [(dl if k == i else AS_l[m - mp]) for k, mp in enumerate(ms)]
        for r in range(DIM):
            row = []
            for bl in blocks:
                row.extend(bl[r])
            Hb_rows.append(row)
    Hb = acb_mat(Hb_rows)
    del Hb_rows, AS_l
    Vb = acb_mat([[acb(complex(v)) for v in row] for row in Vf])
    mark("build [H_WW]")

    # There is no phase-kernel premise for a prescribed-voltage block.
    sanity = None

    HV = Hb * Vb
    del Hb
    mark("[H_WW] V")
    Vib = acb_mat([[acb(complex(v)) for v in row] for row in Vif])
    Wm = Vib * HV                       # Vi [H_WW] V; Y = Vi ([H_WW] V - V Lambda) = Wm - Lambda + C Lambda
    del HV
    lamb = [acb(complex(v)) for v in lam]
    for j in range(nW):
        Wm[j, j] -= lamb[j]
    mark("Vi [H_WW] V - Lambda")
    Cm = Vib * Vb
    for i in range(nW):
        Cm[i, i] -= 1                   # Cm = Vi V - I = -C (same absolute values)
    ones = [arb(1)] * nW                # zeta = ones
    csC = colsums_abs(Cm, ones)
    del Cm
    qC = arb(0)
    for j in range(nW):
        qC = amax(qC, csC[j])
    if not qC < 1:
        raise ProofFailure(f"||I - Vi V|| = {float(qC):.3e} is not < 1 (V not certified invertible)")
    mark("C = I - Vi V")
    csW = colsums_abs(Wm, ones)
    del Wm
    inv1q = 1 / (1 - qC)
    # ||Y e_j|| <= ||(Wm - Lambda) e_j|| + |lambda_j| ||C e_j||  (Y = Vi Rres, Rres = [H_WW] V - V Lambda)
    fm = [up((csW[j] + lamb[j].abs_upper() * csC[j]) * inv1q) for j in range(nW)]
    csVi = colsums_abs(Vib, ones)
    del Vib
    beta = [up(csVi[c] * inv1q) for c in range(nW)]
    beta_max = arb(0)
    for v in beta:
        beta_max = amax(beta_max, v)
    mark("fm, beta")

    # ---- 8. couplings
    tw = []
    G_nA = Gtail(nA + 1)
    for w in ms:
        s_ = arb(0)
        for n in range(-nA, nA + 1):
            if abs(w + n) > Ke:
                s_ += nrm[n]
        tw.append(up(s_ + G_nA))
    rv = colsums_abs(Vb, [tw[i] for i in range(len(ms)) for _ in range(DIM)])
    del Vb
    r_j = [up(zT * rv[j]) for j in range(nW)]
    bms = {}
    bvec = [arb_mat(1, DIM, beta[DIM * i:DIM * i + DIM]) for i in range(len(ms))]
    for m in list(range(Ke + 1, Ke + n_c + 1)) + list(range(-Ke - n_c, -Ke)):
        acc = arb_mat(1, DIM)
        for i, w in enumerate(ms):
            acc = acc + bvec[i] * absA[w - m]
        v = arb(0)
        for k in range(DIM):
            v = amax(v, up(acc[0, k]))
        bms[m] = up(v / zT)
    far = up(beta_max / zT * Gtail(n_c + 1) / 2)
    bhat = far
    for v in bms.values():
        bhat = amax(bhat, v)
    mark("couplings")

    # ---- 9. (SC) and (SG)
    fac = up(bhat * rho_T / (1 - theta_T))
    ratio = []
    sc_ok = True
    sg_win = True
    for j in range(nW):
        lhs = fm[j] + fac * r_j[j] / arb(float(zeta[j]))
        if not lhs < dist[j]:
            sc_ok = False
        if not fm[j] + r_j[j] < dist[j]:
            sg_win = False
        ratio.append(float(up(lhs / dist[j])))
    sg_tail_val = up((bhat + theta_c) * rho_T)
    sg_ok = bool(sg_win and sg_tail_val < 1)
    worst = int(np.argmax(ratio))
    near = [j for j in range(nW) if lam[j].real > -1e-3 and abs(lam[j].imag) <= float(b) + 2 * omf]
    near.sort(key=lambda j: -lam[j].real)
    log(f"  window: q_C = {float(qC):.3e}, max fm_j = {max(float(v) for v in fm):.3e}, bhat = {float(bhat):.4e} "
        f"(far bound {float(far):.2e}), max r_j = {max(float(v) for v in r_j):.3e}")
    log(f"  (SC): worst ratio {ratio[worst]:.4e} at lambda = {complex(lam[worst]):.6g}; near-axis worst "
        f"{max((ratio[j] for j in near), default=0):.4e}; (SG) {'holds' if sg_ok else 'does not hold'} "
        f"(tail value {float(sg_tail_val):.3f})")
    if not sc_ok:
        bad = [j for j in range(nW) if ratio[j] >= 1]
        raise ProofFailure(f"(SC) fails for {len(bad)} window columns, e.g. lambda = {complex(lam[bad[0]])}")
    mark("small gain")

    if count != 0:
        raise ProofFailure(f"(C5) count of window eigenvalues in Omega is {count}, not 0 (skip_count control)")

    # ---- 10. conclusions
    Tlo = lo(2 * arb.pi() / om_hi)
    mult_T = up((-delta * Tlo).exp())
    mult_tau = up((-delta * Tlo / N).exp())
    trivial = None
    nontriv = [j for j in range(nW) if not inside[j] and lam[j].imag >= float(a) and lam[j].imag < float(a) +
               omf * N and abs(lam[j].imag) < (Ke - 4) * omf]
    lead = max(nontriv, key=lambda j: lam[j].real) if nontriv else None
    near_tab = [dict(lam_re=float(lam[j].real), lam_im=float(lam[j].imag), dist=float(dist[j]),
                     fm=float(fm[j]), r=float(r_j[j]), ratio=ratio[j]) for j in near[:12]]
    out = dict(
        N=N, K_centre=inp["K"], Kprime=Kp, K_e=Ke, n_W=nW, n_c=n_c, n_A=nA, prec=prec,
        delta_requested=st["delta"], delta=bound_rec(delta), delta_exact=f"{delta_fr.numerator}/{delta_fr.denominator}",
        route_tail="A (weighted power-of-two cell coordinates S, Lemma 3.4(b))", small_gain="SC (Lemma 3.5)",
        SG_also_holds=sg_ok, S_exponents=e, zeta="all 1, zeta_T = 1", eta_tail=st["eta_tail"],
        geometry=dict(a=bound_rec(a, "down"), b=bound_rec(b), R0=bound_rec(R0), h=bound_rec(h),
                      g0=bound_rec(g0, "down"), C1=c1),
        omega_lo=bound_rec(om_lo, "down"), omega_hi=bound_rec(om_hi),
        r_existence=inp["rec"]["r_existence"], t_lt_R=True, rho_e=str(rho_e.mid()),
        eps_max=float(max(max(row) for row in eps)), eps_1norm_S=bound_rec(s2), SJ_1norm_S=bound_rec(s1),
        alpha_up=bound_rec(alpha), sigma_off=bound_rec(sigma_off), A0_minus_A0c=bound_rec(dA0),
        theta_c=bound_rec(theta_c), rho_T=bound_rec(rho_T), theta_T=bound_rec(theta_T), tail_by_residue=tail,
        q_C=bound_rec(qC), fm_max=max(float(v) for v in fm), beta_max=bound_rec(beta_max), bhat=bound_rec(bhat),
        b_m_far_bound=bound_rec(far), b_m_max_listed=max(float(v) for v in bms.values()),
        r_max=max(float(v) for v in r_j), dist_min=min(float(v) for v in dist),
        count_in_Omega=count, eigenvalue_in_Omega=None,
        SC_worst_ratio=ratio[worst], SC_worst_lambda=[float(lam[worst].real), float(lam[worst].imag)],
        SC_worst_ratio_near_axis=max(ratio[j] for j in near) if near else None,
        SG_tail_value=float(sg_tail_val), near_axis_columns=near_tab,
        sanity_trivial_eigenvector_residual=sanity,
        float_leading_nontrivial_window_eigenvalue=([float(lam[lead].real), float(lam[lead].imag)]
                                                    if lead is not None else None),
        T_lo=bound_rec(arb(Tlo), "down"),
        multiplier_bound_full_period=bound_rec(mult_T), multiplier_bound_reduced_map=bound_rec(mult_tau),
        controls=controls or None,
    )
    if controls.get("dump"):                                    # test hook: floating copies for independent checks
        out["internals"] = dict(e=e, Ke=Ke, Vf=Vf, lam=lam, fm=[float(v) for v in fm], r=[float(v) for v in r_j],
                                beta=[float(v) for v in beta], bms={m: float(v) for m, v in bms.items()},
                                far=float(far), sigma_off=float(sigma_off), rho_T=float(rho_T), tail_X=tail_X,
                                g0=float(g0.mid()), h=float(b), dist=[float(v) for v in dist])
    log(f"  CONDITIONAL GATE (pending replay): prescribed-voltage multipliers |rho| < e^(-delta T) <= {float(mult_T):.9f}; "
        f"reduced map spectral radius < {float(mult_tau):.9f}")
    return out
