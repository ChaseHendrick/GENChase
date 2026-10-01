"""Ordinary (non-rigorous) numerics: depolarized equilibrium, Hopf point in g_Ks, and the cycle at g_Ks = 0.0275.

Checks the model translation against Erhardt, Front. Phys. 13 (2025) 1569121, Table 2 (first supercritical
Hopf of the 18-dim model at g_Ks = 0.027907858929580) and Table S1 (critical frequency 0.119341438353818 rad/ms),
and against the handoff's certified period [53.58551856, 53.58552012] ms at g_Ks = 0.0275.
Usage: python3 hopf_and_orbit.py  (about a minute)
"""
import json, math, os, sys
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq, fsolve

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "model"))
from tp06_18d import PARAMS, field, NAMES  # noqa: E402


def P(gks):
    p = dict(PARAMS); p["g_Ks"] = gks; return p


def F(x, p):
    return np.array(field(x, p))


def jac(x, p, h=1e-7):
    x = np.asarray(x, float); n = len(x); J = np.empty((n, n))
    for k in range(n):
        dx = h * max(1.0, abs(x[k])) if k == 0 else h * max(1e-6, abs(x[k]))
        a = x.copy(); b = x.copy(); a[k] += dx; b[k] -= dx
        J[:, k] = (F(a, p) - F(b, p)) / (2 * dx)
    return J


def gate_ss(V):
    """Gate values at their steady state for a given V, used for an initial guess."""
    e = math.exp
    return [1 / (1 + e((-26 - V) / 7)), 1 / (1 + e((V + 88) / 24)), 1 / (1 + e((-5 - V) / 14)),
            1 / (1 + e((-56.86 - V) / 9.03)) ** 2, 1 / (1 + e((V + 71.55) / 7.43)) ** 2,
            1 / (1 + e((V + 71.55) / 7.43)) ** 2, 1 / (1 + e((-8 - V) / 7.5)), 1 / (1 + e((V + 20) / 7)),
            0.67 / (1 + e((V + 35) / 7)) + 0.33]


def equilibrium(p, V0):
    g = gate_ss(V0)
    # [V, Xr1, Xr2, Xs, m, h, j, d, f, f2, fCass, s, r, Rp, Ca_i, Ca_sr, Ca_ss, Na_i]
    x0 = [V0, g[0], g[1], g[2], g[3], g[4], g[5], g[6], g[7], g[8], 0.5,
          1 / (1 + math.exp((V0 + 28) / 5)), 1 / (1 + math.exp((20 - V0) / 6)), 0.8, 3e-4, 3.5, 5e-4, 10.0]
    # relax toward the attractor first (the depolarized equilibrium is stable above the Hopf point)
    try:
        x0 = solve_ivp(lambda t, y: F(y, p), (0, 30000), x0, method="LSODA", rtol=1e-10, atol=1e-12).y[:, -1]
        sol, info, ier, msg = fsolve(lambda x: F(x, p), x0, xtol=1e-14, full_output=True, fprime=lambda x: jac(x, p))
    except ValueError:
        return None, False
    return sol, ier == 1 and np.max(np.abs(F(sol, p))) < 1e-10


def max_re(gks, xguess):
    p = P(gks)
    sol, info, ier, msg = fsolve(lambda x: F(x, p), xguess, xtol=1e-14, full_output=True, fprime=lambda x: jac(x, p))
    ev = np.linalg.eigvals(jac(sol, p))
    k = np.argmax(ev.real)
    return ev[k], sol


def main():
    out = {}
    # depolarized equilibrium near the Hopf point
    best = None
    for V0 in (-30, -20, -15, -10, -5, 0, 5, 10):
        sol, ok = equilibrium(P(0.029), V0)
        if ok:
            ev = np.linalg.eigvals(jac(sol, P(0.029)))
            best = (sol, ev) if best is None or sol[0] > best[0][0] - 1e-9 else best
            print(f"V0={V0:4}: equilibrium V={sol[0]:.6f} mV, max Re(eig)={max(ev.real):.3e}")
    xeq = best[0]
    out["equilibrium_at_0.029"] = dict(zip(NAMES, map(float, xeq)))
    # Hopf: max real part crosses zero between 0.027 and 0.029
    state = {"x": xeq}

    def g(gks):
        lam, sol = max_re(gks, state["x"]); state["x"] = sol; return lam.real
    gh = brentq(g, 0.0270, 0.0290, xtol=1e-15, rtol=1e-14)
    lam, xh = max_re(gh, state["x"])
    out["hopf_gKs"] = gh
    out["hopf_frequency_rad_per_ms"] = abs(lam.imag)
    print(f"Hopf at g_Ks = {gh:.15f} (Erhardt Table 2: 0.027907858929580); |Im| = {abs(lam.imag):.12f} rad/ms (Table S1: 0.119341438353818)")

    # the cycle at 0.0275: start near the unstable equilibrium, integrate to the attractor
    p = P(0.0275)
    lam, x275 = max_re(0.0275, xh)
    x = x275.copy(); x[0] += 0.5
    f = lambda t, y: F(y, p)
    sol = solve_ivp(f, (0, 20000), x, method="LSODA", rtol=1e-11, atol=1e-13)
    y = sol.y[:, -1]

    def ev(t, y):
        return y[0] - 0.2
    ev.direction = 1
    sol = solve_ivp(f, (0, 400), y, method="LSODA", rtol=1e-12, atol=1e-14, events=ev, dense_output=True)
    te = sol.t_events[0]; ye = sol.y_events[0]
    periods = np.diff(te)
    out["period_ms_last"] = float(periods[-1])
    out["section_point_V0.2"] = dict(zip(NAMES, map(float, ye[-1])))
    vs = sol.sol(np.linspace(te[-2], te[-1], 4001))[0]
    out["V_range_mV"] = [float(vs.min()), float(vs.max())]
    print(f"period at 0.0275: {periods[-3:]} ms (handoff certificate [53.58551856, 53.58552012]); V range {vs.min():.3f}..{vs.max():.3f} mV")

    # Floquet multipliers by finite-difference monodromy over one period
    T = periods[-1]; x0 = ye[-1]
    n = 18; Mono = np.empty((n, n))
    for k in range(n):
        h = 1e-6 * max(1e-3, abs(x0[k]))
        a = x0.copy(); b = x0.copy(); a[k] += h; b[k] -= h
        ya = solve_ivp(f, (0, T), a, method="LSODA", rtol=1e-12, atol=1e-15).y[:, -1]
        yb = solve_ivp(f, (0, T), b, method="LSODA", rtol=1e-12, atol=1e-15).y[:, -1]
        Mono[:, k] = (ya - yb) / (2 * h)
    mu = np.linalg.eigvals(Mono)
    mu = mu[np.argsort(-np.abs(mu))]
    out["floquet_moduli_sorted"] = [float(abs(m)) for m in mu]
    print("Floquet moduli:", np.array2string(np.abs(mu), precision=6))
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "results", "numerics-hopf-orbit.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
