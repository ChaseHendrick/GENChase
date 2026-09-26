"""Task 1: non-rigorous numerics (float64 / scipy, mpmath) for the space-clamped HH equations."""
import json, time
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq
import mpmath as mp
import hh_float as HF
from hh_float import f, jac, gate_inf, I_ss, equilibrium, EL_HH
import shoot_float as SF


def zero_current_EL(dps=40):
    mp.mp.dps = dps
    u = mp.mpf(0)
    psi = lambda x: mp.mpf(1) if x == 0 else x / mp.expm1(x)
    an = mp.mpf('0.1') * psi(mp.mpf(1)); bn = mp.mpf('0.125')
    am = psi(mp.mpf('2.5')); bm = mp.mpf(4)
    ah = mp.mpf('0.07'); bh = 1 / (mp.exp(3) + 1)
    mi, ni, hi = am / (am + bm), an / (an + bn), ah / (ah + bh)
    return (120 * mi ** 3 * hi * (0 - 115) + 36 * ni ** 4 * (0 + 12)) / mp.mpf('0.3')


def hurwitz(J, EL=EL_HH):
    x = equilibrium(J, EL)
    A = jac(x, J, EL)
    a = np.poly(A)          # [1, a1, a2, a3, a4]
    a1, a2, a3, a4 = a[1:]
    return a1, a2, a3, a4, (a1 * a2 - a3) * a3 - a1 ** 2 * a4


def hopf_points(EL=EL_HH):
    # parametrise the equilibrium branch by u: J = I_ss(u)
    us = np.linspace(0.01, 60, 6000)
    D3 = []
    for u in us:
        J = I_ss(u, EL)
        D3.append(hurwitz(J, EL)[4])
    D3 = np.array(D3)
    out = []
    for i in range(len(us) - 1):
        if D3[i] * D3[i + 1] < 0:
            ur = brentq(lambda u: hurwitz(I_ss(u, EL), EL)[4], us[i], us[i + 1], xtol=1e-14)
            J = I_ss(ur, EL)
            ev = np.linalg.eigvals(jac(equilibrium(J, EL), J, EL))
            ev = ev[np.argsort(-ev.real)]
            out.append((J, ur, ev[0], ev[1]))
    return out


def stable_orbit(J, c=20.0, EL=EL_HH):
    x0 = equilibrium(J, EL) + np.array([15.0, 0, 0, 0])
    ev = lambda t, x, J, EL: x[0] - c
    ev.direction = 1
    sol = solve_ivp(f, [0, 200], x0, args=(J, EL), method='DOP853', rtol=1e-11, atol=1e-13, events=ev)
    z = sol.y_events[0][-1][1:]
    z, T, DP, V = SF.newton(z, J, c, EL)
    return z, T, DP


def unstable_orbit(J, c=5.0, EL=EL_HH, log=print, horizon=80.0, t_settle=15.0):
    """Separatrix bisection between rest and firing, then Newton on the section u = c
    (c = None: the level u = u_eq(J) of the equilibrium)."""
    xe = equilibrium(J, EL)
    if c is None:
        c = float(xe[0])

    def fires(d):
        s = solve_ivp(f, [0, horizon], xe + np.array([d, 0, 0, 0]), args=(J, EL), method='DOP853',
                      rtol=1e-12, atol=1e-14)
        return s.y[0].max() > 50
    lo, hi = 0.0, 15.0
    assert (not fires(lo)) and fires(hi)
    for i in range(55):
        mid = 0.5 * (lo + hi)
        if fires(mid):
            hi = mid
        else:
            lo = mid
    ev = lambda t, x, J, EL: x[0] - c
    ev.direction = 1
    s2 = solve_ivp(f, [0, horizon], xe + np.array([lo, 0, 0, 0]), args=(J, EL), method='DOP853',
                   rtol=1e-12, atol=1e-14, events=ev)
    te = s2.t_events[0]; ye = s2.y_events[0]
    k = np.where(te > t_settle)[0][0]
    z, T, DP, V = SF.newton(ye[k][1:], J, c, EL)
    return z, T, DP, lo


def orbit_profile(x0, T, J, EL=EL_HH):
    sol = solve_ivp(f, [0, T], x0, args=(J, EL), method='DOP853', rtol=1e-12, atol=1e-14, dense_output=True)
    ts = np.linspace(0, T, 40001)
    X = sol.sol(ts)
    return X[0].min(), X[0].max()


def fold_of_cycles(c=6.0, EL=EL_HH, log=print):
    """Along the branch of cycles parametrised by the period T, find where the nontrivial multiplier
    equals 1 (the fold / saddle-node of limit cycles)."""
    J = 6.27
    x0 = equilibrium(J, EL) + np.array([15, 0, 0, 0])
    ev = lambda t, x, J, EL: x[0] - c
    ev.direction = 1
    sol = solve_ivp(f, [0, 200], x0, args=(J, EL), method='DOP853', rtol=1e-11, atol=1e-13, events=ev)
    z, T0, DP, V = SF.newton(sol.y_events[0][-1][1:], J, c, EL)

    def solve_at(Tfix, z0, J0):
        z, J, T, DP = SF.solve_fixed_period(z0, J0, c, Tfix, EL)
        mu = np.linalg.eigvals(DP)
        m = mu[np.argmin(np.abs(mu - 1))].real
        return m - 1.0, J, z
    samples, branch = [], []
    zc, Jc = z, J
    for Tf in (19.6, 19.75, 19.85, 19.95, 20.05):
        g, Jc, zc = solve_at(Tf, zc, Jc)
        samples.append((Tf, Jc, g))
        branch.append((Tf, zc.copy(), Jc))
    i = [k for k in range(len(samples) - 1) if samples[k][2] < 0 <= samples[k + 1][2]][0]
    Ta, za, Ja = branch[i]
    Tb = branch[i + 1][0]
    Tstar = brentq(lambda T: solve_at(T, za, Ja)[0], Ta, Tb, xtol=1e-7)
    g, Jstar, zstar = solve_at(Tstar, za, Ja)
    return Jstar, Tstar, samples


def unstable_branch_to_hopf(EL=EL_HH, Js=(8.5, 9.0, 9.5, 9.7, 9.75)):
    """An unstable orbit at several J below the first Hopf point (bisection between rest and spike each time,
    section at the level u = u_eq(J))."""
    out = []
    for Jn in Js:
        ue = float(equilibrium(Jn, EL)[0])
        zn, T, DP, _ = unstable_orbit(Jn, None, EL, horizon=150.0 if Jn < 9.6 else 400.0,
                                      t_settle=30.0 if Jn < 9.6 else 100.0)
        umin, umax = orbit_profile(np.array([ue, *zn]), T, Jn, EL)
        mu = np.linalg.eigvals(DP)
        out.append((Jn, T, umin, umax, mu[np.argmax(np.abs(mu))].real))
    return out


def run(log=print, J=8.0):
    res = {}
    t0 = time.time()
    E0 = zero_current_EL()
    log('  zero-current leak potential E_l* (I_ion = 0 at u = 0, J = 0) = %s' % mp.nstr(E0, 25))
    res['EL_zero_current'] = mp.nstr(E0, 30)
    # uniqueness of equilibria: I_ss increasing
    us = np.linspace(-12, 250, 262001)
    Iss = I_ss(us)
    d = np.diff(Iss)
    log('  I_ss(u) strictly increasing on a grid of [-12, 250] (step 1e-3): %s (min increment %.3e);'
        ' I_ss(-12) = %.4f, I_ss(250) = %.1f' % (bool((d > 0).all()), d.min(), Iss[0], Iss[-1]))
    log('    for u <= -12 every current term is negative, for u >= 115 every term is >= 0 and the leak'
        ' exceeds 31, so each J in [0, I_ss(250)] has exactly one equilibrium (numerically)')
    u_rest = brentq(lambda u: I_ss(u), -12, 50, xtol=1e-15)
    log('  rest state at J = 0: u = %.6e mV' % u_rest)
    E0f = float(E0)
    ELs = [('10.613', 10.613), ('E_l*', E0f), ('10.599', 10.599), ('10.59', 10.59), ('10.62', 10.62)]
    res['hopf_by_EL'] = {}
    for nm, ELv in ELs:
        hpE = hopf_points(ELv)
        res['hopf_by_EL'][nm] = [(float(a), float(b)) for a, b, _, _ in hpE]
        for (Jh, uh, l1, l2) in hpE:
            log('  E_l = %-7s (%.10f): Hopf point J = %.6f, u_eq = %.6f, eigenvalues %.1e +- %.6fi '
                '(2pi/omega = %.4f ms)' % (nm, ELv, Jh, uh, l1.real, abs(l1.imag), 2 * np.pi / abs(l1.imag)))
        if nm == '10.613':
            hp = hpE
    log('    (the Hopf currents depend on E_l; a result at J = 8 is stated with its E_l)')
    res['hopf'] = [(float(a), float(b)) for a, b, _, _ in hp]
    xe = equilibrium(J)
    ev = np.linalg.eigvals(jac(xe, J))
    log('  J = %g: equilibrium %s, eigenvalues %s' % (J, np.array2string(xe, precision=10),
                                                     np.array2string(ev, precision=6)))
    res['eq'] = xe.tolist()
    zs, Ts, DPs = stable_orbit(J)
    mus = np.linalg.eigvals(DPs)
    umin, umax = orbit_profile(np.array([20.0, *zs]), Ts, J)
    log('  stable orbit (section u = 20, u increasing): z = (m,n,h) = %s, period %.12f ms, u in [%.4f, %.4f],'
        ' multipliers %s' % (np.array2string(zs, precision=14), Ts, umin, umax, np.array2string(mus, precision=6)))
    res['stable'] = {'c': 20.0, 'z': zs.tolist(), 'T': Ts, 'mu': [complex(m).real for m in mus]}
    zu, Tu, DPu, dsep = unstable_orbit(J)
    muu = np.linalg.eigvals(DPu)
    umin, umax = orbit_profile(np.array([5.0, *zu]), Tu, J)
    log('  an unstable orbit (candidate located by bisecting perturbations of the rest state between return to '
        'rest and a spike, delta u = %.12f; section u = 5, u increasing): z = %s, '
        'period %.12f ms, u in [%.4f, %.4f], multipliers %s' % (dsep, np.array2string(zu, precision=14), Tu,
                                                               umin, umax, np.array2string(muu, precision=6)))
    res['unstable'] = {'c': 5.0, 'z': zu.tolist(), 'T': Tu, 'mu': [complex(m).real for m in muu]}
    res['fold_by_EL'] = {}
    for nm, ELv in ELs[:2]:
        Jf_, Tf_, samples = fold_of_cycles(EL=ELv)
        res['fold_by_EL'][nm] = (Jf_, Tf_)
        log('  E_l = %-7s: fold of limit cycles (nontrivial multiplier = 1 along the branch parametrised by the'
            ' period): J_LPC = %.6f, period %.4f ms' % (nm, Jf_, Tf_))
        for Tq, Jq, g in samples:
            log('    branch: T = %.4f  J = %.8f  multiplier-1 = %+.4f' % (Tq, Jq, g))
        if nm == '10.613':
            Jf, Tf = Jf_, Tf_
    res['fold'] = (Jf, Tf)
    br = unstable_branch_to_hopf()
    for Jn, T, a, b, m in br:
        log('  unstable branch towards the Hopf point: J = %.2f, period %.4f, u in [%.4f, %.4f] (amplitude'
            ' %.4f), unstable multiplier %.4f' % (Jn, T, a, b, b - a, m))
    log('    this unstable orbit shrinks towards the equilibrium as J -> %.4f from below and has a multiplier > 1:'
        ' the first Hopf bifurcation is subcritical (numerical evidence here; proved by l1 > 0 in'
        ' papers/hh-dynamics/code/certify_equilibria_hopf.py)' % hp[0][0])
    res['unstable_branch'] = br
    for nm in res['fold_by_EL']:
        log('  E_l = %-7s: bistability window (numerical) %.4f < J < %.4f' % (
            nm, res['fold_by_EL'][nm][0], res['hopf_by_EL'][nm][0][0]))
    log('  numerics time %.1fs' % (time.time() - t0))
    return res


if __name__ == '__main__':
    r = run()
    json.dump(r, open('numerics.json', 'w'), indent=1, default=str)
