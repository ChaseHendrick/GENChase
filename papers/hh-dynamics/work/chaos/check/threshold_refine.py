"""Bisect the switch locations of the N = 10^5 run to 1e-12 mV with GBS; then check the fates just either
side (u* -+ 1e-8 mV) with scipy Radau (rtol 1e-12, atol 1e-14) as a second integrator. NUMERICAL."""
import json
import numpy as np
from scipy.integrate import solve_ivp
import hhk, hsets

d = json.load(open('threshold_100000_1e-13.json'))
J = hsets.J; g0 = np.array(d['gates']); eq = np.array(d['eq'])


def fate_gbs(u, rtol=1e-13):
    f, t = hhk.fates(np.array([[u, *g0]]), J, hhk.EL, eq, rtol, rtol * 1e-2, 0.25, 1000.0, 50.0)
    return int(f[0])


def fate_radau(u):
    def rhs(t, y):
        o = np.empty(4); hhk.f(y, J, hhk.EL, o); return o
    def jf(t, y):
        M = np.empty((4, 4)); hhk.jac(y, M); return M
    def ap(t, y): return y[0] - 50.0
    ap.terminal = True
    def rest(t, y): return max(abs(y[0] - eq[0]) / 0.5, np.abs(y[1:] - eq[1:]).max() / 0.005) - 1.0
    rest.terminal = True
    s = solve_ivp(rhs, (0, 1000), np.r_[u, g0], method='Radau', rtol=1e-12, atol=1e-14, jac=jf, events=[ap, rest])
    if len(s.t_events[0]):
        return 1
    if len(s.t_events[1]):
        return 0
    return -1


rows = []
for lo, hi, flo, fhi in d['switch_u']:
    a, b = lo, hi
    for _ in range(60):
        m = 0.5 * (a + b)
        if fate_gbs(m) == flo:
            a = m
        else:
            b = m
        if b - a < 1e-12:
            break
    us = 0.5 * (a + b)
    fr = (fate_radau(us - 1e-8), fate_radau(us + 1e-8))
    fg = (fate_gbs(us - 1e-8), fate_gbs(us + 1e-8))
    fg11 = (fate_gbs(us - 1e-8, 1e-11), fate_gbs(us + 1e-8, 1e-11))
    rows.append(dict(u_star=us, width=b - a, fates_expected=(flo, fhi), gbs=fg, gbs_rtol1e11=fg11, radau=fr))
    print(rows[-1], flush=True)
json.dump(rows, open('threshold_refine.json', 'w'), indent=1)
