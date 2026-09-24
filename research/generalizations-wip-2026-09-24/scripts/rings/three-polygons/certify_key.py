#!/usr/bin/env python3
"""
certify_key.py -- independent certification of the key configurations by a direct Biot-Savart sum over ALL vortices
at 50 digits (no reduction formulas used in the check), plus a double-precision integration of the full ODE up to
0.95 t_c compared with the self-similar solution z0 f(t) (DK (10)).
Configurations are rebuilt from (n, r, phi2, psi3, Gamma) only; each is put in the collapsing orientation
(Gamma -> -Gamma if needed, which leaves P unchanged).
"""
import json
import sys
import numpy as np
import mpmath as mp
from scipy.integrate import solve_ivp

mp.mp.dps = 50
I = mp.mpc(0, 1)
RES = []


def check(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + ((' :: ' + str(info)) if info != '' else ''), flush=True)


def build(n, r, phi2, psi3, G0, G1, G2, G3):
    eps = mp.expj(2 * mp.pi / n)
    pos = [mp.mpc(0)] + [eps**k for k in range(n)] + [mp.expj(phi2) * eps**k for k in range(n)] + [r * mp.expj(psi3) * eps**k for k in range(n)]
    gam = [G0] + [G1] * n + [G2] * n + [G3] * n
    return pos, gam


def bs(pos, gam):
    M = len(pos)
    vel = [mp.conj(mp.fsum(gam[k] / (pos[j] - pos[k]) for k in range(M) if k != j) / (2 * mp.pi * I)) for j in range(M)]
    far = [j for j in range(M) if abs(pos[j]) > mp.mpf('1e-40')]
    k0 = vel[far[0]] / pos[far[0]]
    res = max(abs(vel[j] - k0 * pos[j]) for j in range(M)) / max(abs(v) for v in vel)
    L = mp.fsum(gam[j] * abs(pos[j])**2 for j in range(M)) / mp.fsum(abs(gam[j]) * abs(pos[j])**2 for j in range(M))
    S = mp.fsum(gam[i] * gam[j] for i in range(M) for j in range(i + 1, M)) / mp.fsum(abs(gam[i] * gam[j]) for i in range(M) for j in range(i + 1, M))
    return k0, res, L, S


def rhs(t, y, g):
    z = y[0::2] + 1j * y[1::2]
    d = z[:, None] - z[None, :]
    np.fill_diagonal(d, 1)
    w = g[None, :] / d
    np.fill_diagonal(w, 0)
    zd = np.conj(w.sum(axis=1) / (2j * np.pi))
    out = np.empty_like(y)
    out[0::2], out[1::2] = zd.real, zd.imag
    return out


def dyn(pos, gam, kappa, frac=0.95):
    a, b = float(kappa.real), float(kappa.imag)
    tc = -1 / (2 * a)
    z0 = np.array([complex(p) for p in pos]); g = np.array([float(x) for x in gam])
    y0 = np.empty(2 * len(z0)); y0[0::2], y0[1::2] = z0.real, z0.imag
    ts = np.linspace(0, frac * tc, 9)
    sol = solve_ivp(rhs, (0, ts[-1]), y0, t_eval=ts, args=(g,), method='DOP853', rtol=1e-13, atol=1e-16)
    err = 0.0
    errs = []
    for i, t in enumerate(ts):
        f = np.sqrt(2 * a * t + 1) * np.exp(1j * b / (2 * a) * np.log(2 * a * t + 1))   # z = z0 f, f* fdot = kappa
        zt = sol.y[0::2, i] + 1j * sol.y[1::2, i]
        err = max(err, np.max(np.abs(zt - z0 * f)) / np.max(np.abs(z0 * f)))
        errs.append(err)
    return tc, errs


fam = json.load(open('family_out.json'))
cases = []
# Table 1 (Fig. 1a), DK R1 = 2 scale, exact rationals
cases.append(('DK Table 1 / Fig. 1a (n = 2, r = 2/3)', 2, mp.mpf(2) / 3, mp.acos(mp.mpf(13) / 18) / 2, mp.mpf(0),
              [mp.mpf(6383) / 2250, mp.mpf(14) / 15, -mp.mpf(62) / 45, mp.mpf(1)], mp.mpf(12433) / (1240 * mp.sqrt(155))))
for n in (2, 3, 4):
    d = fam['n%d' % n]
    r = mp.mpf(d['rstar']); q = r**n; G3 = mp.mpf(1)                 # DK (57), (58) at 50 digits for this r
    cb = (r**2 * (1 + q**2) - 2 * q) / (2 * q * (r**2 - 1))
    G1 = -G3 * r**2 * ((n + 1) * q + n - 1) / (2 * (q - 1))
    G2 = G3 * r**2 * ((n - 1) * q + n + 1) / (2 * (q - 1))
    G0 = ((n - 1) * G3**2 * r**4 - 2 * (G1 + n * G3) * G3 * r**2 + (n - 1) * G3**2 - 2 * G1**2) / (2 * G3 * (r**2 - 1))
    cases.append(('DK family minimizer n = %d' % n, n, r, mp.acos(cb) / n, mp.mpf(0), [G0, G1, G2, G3], mp.mpf(d['Pmin'])))
for n in (2, 3, 4):
    d = json.load(open('ext_min_n%d.json' % n))
    G = [mp.mpf(x) for x in d['G']]
    cases.append(('extension (b3 free) minimizer n = %d' % n, n, mp.mpf(d['r']), mp.mpf(d['phi2']), mp.mpf(d['psi3']), G, mp.mpf(d['P_reduced'])))

out = []
for (lab, n, r, phi2, psi3, G, Pclaim) in cases:
    pos, gam = build(n, r, phi2, psi3, *G)
    k, res, L, S = bs(pos, gam)
    if k.real > 0:                               # time reversal: Gamma -> -Gamma, kappa -> -kappa
        gam = [-x for x in gam]
        k, res, L, S = bs(pos, gam)
    P = abs(k.imag) / (-2 * k.real)
    tc, errs = dyn(pos, gam, k)
    err = errs[-1]
    print('\n%s: %d vortices' % (lab, len(pos)))
    print('  r = %s, phi2 = %s, psi3 = %s' % (mp.nstr(r, 25), mp.nstr(phi2, 25), mp.nstr(psi3, 25)))
    print('  Gamma0..3 = %s' % ', '.join(mp.nstr(gam[0 if j == 0 else 1 + (j - 1) * n], 22) for j in range(4)))
    print('  kappa = %s ; t_c = %s ; max_j |zdot_j - kappa z_j|/max|zdot| = %s ; L/sum|..| = %s ; sum GiGj/sum|..| = %s'
          % (mp.nstr(k, 25), mp.nstr(-1 / (2 * k.real), 15), mp.nstr(res, 3), mp.nstr(L, 3), mp.nstr(S, 3)))
    print('  P (Biot-Savart) = %s ; claimed %s ; |diff| = %s' % (mp.nstr(P, 40), mp.nstr(Pclaim, 40), mp.nstr(abs(P - Pclaim), 3)))
    print('  ODE (DOP853, double, all vortices) vs z0 f(t): max rel dev up to 0.475 t_c = %.2e, up to 0.95 t_c = %.2e'
          ' (growth = instability of the self-similar orbit amplifying rounding)' % (errs[4], err))
    check(lab + ': static certificate (Biot-Savart residual < 1e-45, L = 0, sum GiGj = 0, P to 1e-40)',
          res < mp.mpf('1e-45') and abs(P - Pclaim) < mp.mpf('1e-40') and abs(L) < mp.mpf('1e-45') and abs(S) < mp.mpf('1e-45'))
    check(lab + ': double-precision ODE follows z0 f(t) to 1e-5 up to 0.95 t_c', err < 1e-5, '%.1e' % err)
    out.append(dict(case=lab, N=len(pos), P=mp.nstr(P, 45), kappa=mp.nstr(k, 30), residual=mp.nstr(res, 3), ode_dev='%.2e' % err))
json.dump(out, open('certify_key_out.json', 'w'), indent=1)
nf = sum(1 for _, ok in RES if not ok)
print('\nchecks: %d, failed: %d' % (len(RES), nf))
sys.exit(1 if nf else 0)
