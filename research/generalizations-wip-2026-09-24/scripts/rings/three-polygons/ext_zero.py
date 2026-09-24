#!/usr/bin/env python3
"""
ext_zero.py -- the b3-free extension surface contains stationary (absolute-equilibrium, Omega = 0) configurations.
Near such a point S0 the map (surface coordinates) -> Omega is a local diffeomorphism onto a neighbourhood of 0 if its
Jacobian is nonsingular; then every value of arg(Omega), hence every P in [0, inf), is attained, including P = 0
(Re Omega = 0: collapse along fixed rays, no rotation).
Steps: (1) S0 at 60 digits; (2) Jacobian of Omega/G3 in (r, gamma) at S0; (3) explicit P = 0 members (det = 0 and
Re Omega = 0) at several distances from S0; (4) direct Biot-Savart certificate over all 3n+1 vortices at 60 digits,
and a double-precision ODE integration showing radial collapse (arg z_j constant).
usage: python3 ext_zero.py n r0 beta0 gamma0
"""
import sys
import json
import numpy as np
import mpmath as mp
from scipy.integrate import solve_ivp
from ext_refine import build, config, biot_savart

mp.mp.dps = 60
I = mp.mpc(0, 1)
RES = []


def check(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + ((' :: ' + str(info)) if info != '' else ''), flush=True)


n = int(sys.argv[1]); r0, b0, g0 = [mp.mpf(a) for a in sys.argv[2:5]]
F = build(n)


def normvec(r, b, g):
    v = F['vec'](r, b, g)
    return [v[i] / v[5] for i in range(6)]          # G3 = 1


# (1) stationary point: det = 0, Re Omega = 0, Im Omega = 0
eqs = lambda r, b, g: [F['det'](r, b, g), normvec(r, b, g)[0], normvec(r, b, g)[1]]
S = mp.findroot(eqs, (r0, b0, g0), tol=mp.mpf(10)**(-55), maxsteps=100)
rS, bS, gS = S[0], S[1], S[2]
vS = normvec(rS, bS, gS)
print('S0: r = %s, beta = %s, gamma = %s, gamma - beta/2 = %s' % (mp.nstr(rS, 40), mp.nstr(bS, 40), mp.nstr(gS, 40), mp.nstr(gS - bS / 2, 5)))
print('    (G0, G1, G2, G3) = %s' % ', '.join(mp.nstr(x, 30) for x in vS[2:]))
pos, gam, _ = config(n, rS, bS, gS, vS)
M = len(pos)
vel = [mp.conj(mp.fsum(gam[k] / (pos[j] - pos[k]) for k in range(M) if k != j) / (2 * mp.pi * I)) for j in range(M)]
vmax = max(abs(v) for v in vel)
scale = max(abs(g) for g in gam) / (2 * mp.pi * min(abs(pos[i] - pos[j]) for i in range(M) for j in range(M) if i != j))
check('1 S0 is a stationary configuration: every vortex velocity < 1e-50 x (typical velocity scale) by direct Biot-Savart',
      vmax / scale < mp.mpf('1e-50'), 'max|v| = %s, scale = %s' % (mp.nstr(vmax, 3), mp.nstr(scale, 5)))
dmin = min(abs(pos[i] - pos[j]) for i in range(M) for j in range(M) if i != j)
print('    min vortex separation = %s ; G1 - G2 = %s' % (mp.nstr(dmin, 10), mp.nstr(vS[3] - vS[4], 5)))


# (2) Jacobian of Omega/G3 along the surface, coordinates (r, gamma), beta(r, gamma) from det = 0
def beta_of(r, g, bguess):
    return mp.findroot(lambda b: F['det'](r, b, g), bguess, tol=mp.mpf(10)**(-58))


def Om(r, g):
    b = beta_of(r, g, bS)
    v = normvec(r, b, g)
    return v[0], v[1]


J = mp.matrix(2, 2)
for j, (dr, dg) in enumerate(((1, 0), (0, 1))):
    for i in range(2):
        J[i, j] = mp.diff(lambda t: Om(rS + dr * t, gS + dg * t)[i], 0)
detJ = mp.det(J)
print('    Jacobian d(Re Omega, Im Omega)/d(r, gamma) at S0 =', [[mp.nstr(J[i, j], 12) for j in range(2)] for i in range(2)], ' det =', mp.nstr(detJ, 12))
print('    (Im Omega has zero gradient at S0: it is odd under the reflection symmetry of the gamma = beta/2, G1 = G2 curve and'
      ' its first-order coefficient vanishes too; Re Omega has nonzero gradient.)')
check('2 Re Omega has nonzero gradient at S0, so {Re Omega = 0} is a smooth curve on the surface through S0', abs(J[0, 0]) + abs(J[0, 1]) > mp.mpf('1e-3'))

# (3)+(4) explicit P = 0 members along the curve Re Omega = 0 through S0; direct certificate
out = []
slope = -J[0, 0] / J[0, 1]                      # d gamma / d r along Re Omega = 0
prev = (bS, gS)
for dr in ('0.002', '0.005', '0.01', '0.02', '0.05', '0.1', '-0.002', '-0.005', '-0.01', '-0.02', '-0.05', '-0.1'):
    dr = mp.mpf(dr)
    r = rS + dr
    if dr * (prev[1] - gS) < 0 or abs(dr) == mp.mpf('0.002'):
        prev = (bS, gS)
    gguess = prev[1] + slope * (dr - (0 if prev == (bS, gS) else 0)) if prev == (bS, gS) else prev[1]
    eq2 = lambda b, g: [F['det'](r, b, g), normvec(r, b, g)[0]]
    try:
        X = mp.findroot(eq2, (beta_of(r, gguess, prev[0]), gguess), tol=mp.mpf(10)**(-55), maxsteps=100)
    except Exception as ex:
        print('    dr = %s: no convergence (%s)' % (mp.nstr(dr, 3), ex))
        continue
    b, g = X[0], X[1]
    prev = (b, g)
    v = normvec(r, b, g)
    pos, gam, _ = config(n, r, b, g, v)
    bsr = biot_savart(pos, gam)
    k = bsr['kappa']
    if k.real > 0:
        gam = [-x for x in gam]
        bsr = biot_savart(pos, gam)
        k = bsr['kappa']
    M = len(pos)
    dmin = min(abs(pos[i] - pos[j]) for i in range(M) for j in range(M) if i != j)
    P = abs(k.imag) / (2 * abs(k.real))
    print('    dr = %+.3f: r = %s, beta = %s, gamma = %s, gamma - beta/2 = %s, Im Omega/G3 = %s'
          % (float(dr), mp.nstr(r, 20), mp.nstr(b, 20), mp.nstr(g, 20), mp.nstr(g - b / 2, 6), mp.nstr(v[1], 6)))
    print('        Gamma0..3 = %s ; min separation = %s' % (', '.join(mp.nstr(gam[0 if j == 0 else 1 + (j - 1) * n], 20) for j in range(4)), mp.nstr(dmin, 8)))
    print('        Biot-Savart: kappa = %s ; spread = %s ; |v(0)| = %s ; L = %s ; sum GiGj = %s ; P = %s'
          % (mp.nstr(k, 25), mp.nstr(bsr['spread'], 3), mp.nstr(bsr['v0'], 3), mp.nstr(bsr['L'], 3), mp.nstr(bsr['pairs'], 3), mp.nstr(P, 5)))
    ok = bsr['spread'] < mp.mpf('1e-50') and abs(k.imag) < mp.mpf('1e-50') * abs(k.real) and k.real < 0 and dmin > mp.mpf('1e-3') \
        and abs(k.real) > mp.mpf('1e-12')
    check('3 dr = %+.3f: non-rotating collapse (Im kappa = 0, Re kappa < 0) certified by Biot-Savart over all %d vortices' % (float(dr), M), ok,
          'Im kappa/Re kappa = %s, Re kappa = %s' % (mp.nstr(k.imag / k.real, 3), mp.nstr(k.real, 5)))
    out.append(dict(r=mp.nstr(r, 55), beta=mp.nstr(b, 55), gamma=mp.nstr(g, 55), G=[mp.nstr(gam[0 if j == 0 else 1 + (j - 1) * n], 55) for j in range(4)],
                    kappa=mp.nstr(k, 40), spread=mp.nstr(bsr['spread'], 3), P=mp.nstr(P, 5), dmin=mp.nstr(dmin, 10)))
    if dr == mp.mpf('0.05'):
        z0 = np.array([complex(p) for p in pos]); gg = np.array([float(x) for x in gam])
        a_ = float(k.real); tc = -1 / (2 * a_)

        def rhs(t, y):
            z = y[0::2] + 1j * y[1::2]
            dd = z[:, None] - z[None, :]
            np.fill_diagonal(dd, 1)
            w = gg[None, :] / dd
            np.fill_diagonal(w, 0)
            zd = np.conj(w.sum(axis=1) / (2j * np.pi))
            o = np.empty_like(y); o[0::2], o[1::2] = zd.real, zd.imag
            return o
        y0 = np.empty(2 * len(z0)); y0[0::2], y0[1::2] = z0.real, z0.imag
        ts = np.linspace(0, 0.9 * tc, 7)
        sol = solve_ivp(rhs, (0, ts[-1]), y0, t_eval=ts, method='DOP853', rtol=1e-13, atol=1e-16)
        zt = sol.y[0::2, -1] + 1j * sol.y[1::2, -1]
        far = np.abs(z0) > 1e-9
        dang = np.max(np.abs(np.angle(zt[far] / z0[far])))
        ratio = np.abs(zt[far]) / np.abs(z0[far])
        print('        ODE to 0.9 t_c (t_c = %.6f): max |change of arg z_j| = %.2e rad ; |z_j(t)|/|z_j(0)| in [%.10f, %.10f] vs sqrt(0.1) = %.10f'
              % (tc, dang, ratio.min(), ratio.max(), np.sqrt(0.1)))
        check('4 ODE (double precision): vortices move along fixed rays (arg change < 1e-6) and shrink by sqrt(1 - t/t_c)',
              dang < 1e-6 and abs(ratio.min() - np.sqrt(0.1)) < 1e-6 and abs(ratio.max() - np.sqrt(0.1)) < 1e-6)
json.dump(dict(S0=dict(r=mp.nstr(rS, 55), beta=mp.nstr(bS, 55), gamma=mp.nstr(gS, 55), G=[mp.nstr(x, 55) for x in vS[2:]]),
               detJ=mp.nstr(detJ, 15), P0_members=out), open('ext_zero_n%d.json' % n, 'w'), indent=1)
nf = sum(1 for _, ok in RES if not ok)
print('checks: %d, failed: %d' % (len(RES), nf))
