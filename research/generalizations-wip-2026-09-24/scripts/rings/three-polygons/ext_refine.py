#!/usr/bin/env python3
"""
ext_refine.py -- the b3-free extension of DK Sect. 4 (Gamma3 n-gon rotated by gamma/n against the Gamma1 n-gon).
Reduced system (derived by hand from E1..E3 of ext_scan.py; y = Im Omega / n; D3 = 1 - 2q cos g + q^2,
D32 = 1 - 2q cos(g - b) + q^2, q = r^n):
  I1:  y        =  G2 cot(b/2)/2 + G3 q sin g/D3
  I2:  y        = -G1 cot(b/2)/2 + G3 q sin(g - b)/D32
  I3:  r^2 y    = -G1 q sin g/D3 + G2 q sin(b - g)/D32
  R12: (G1-G2)/2 = n G3 [(1 - q cos g)/D3 - (1 - q cos(g - b))/D32]
  (1 - r^2) Re Omega = G1 (n-1)/2 + n G2/2 + n G3 (1 - q cos g)/D3 - G3 (n-1)/2 - n G1 q (q - cos g)/D3 - n G2 q (q - cos(b - g))/D32
  Gamma0 = Re Omega - G1 (n-1)/2 - n G2/2 - n G3 (1 - q cos g)/D3
Surface: det M4(r, b, g) = 0.  Null vector by cofactors of row 1 (a smooth extension off the surface).
P = |Re Omega|/(2 |Im Omega|).  Stationary points of P on the surface: Lagrange (grad P x grad det = 0, det = 0),
solved by mpmath findroot with exact SymPy derivatives.  Every result is certified by a direct Biot-Savart sum over
all 3n+1 vortices at 50 digits.
usage: python3 ext_refine.py n r0 b0 g0
"""
import sys
import json
import sympy as sp
import mpmath as mp

mp.mp.dps = 60
I = mp.mpc(0, 1)


def build(n):
    r, b, g = sp.symbols('r b g', real=True)
    q = r**n
    D3 = 1 - 2 * q * sp.cos(g) + q**2
    D32 = 1 - 2 * q * sp.cos(g - b) + q**2
    ct = sp.cos(b / 2) / sp.sin(b / 2)
    # unknown order (y, G1, G2, G3)
    M = sp.Matrix([
        [-1, 0, ct / 2, q * sp.sin(g) / D3],
        [-1, -ct / 2, 0, q * sp.sin(g - b) / D32],
        [-r**2, -q * sp.sin(g) / D3, q * sp.sin(b - g) / D32, 0],
        [0, sp.Rational(1, 2), -sp.Rational(1, 2), -n * ((1 - q * sp.cos(g)) / D3 - (1 - q * sp.cos(g - b)) / D32)],
    ])
    det = M.det(method='berkowitz')
    # null vector from cofactors of row 0: x_j = (-1)^j minor(0, j)
    cof = [(-1)**j * M.minor_submatrix(0, j).det(method='berkowitz') for j in range(4)]
    y, G1, G2, G3 = cof
    ReO = (G1 * sp.Rational(n - 1, 2) + n * G2 / 2 + n * G3 * (1 - q * sp.cos(g)) / D3 - G3 * sp.Rational(n - 1, 2)
           - n * G1 * q * (q - sp.cos(g)) / D3 - n * G2 * q * (q - sp.cos(b - g)) / D32) / (1 - r**2)
    ImO = n * y
    Psig = ReO / (2 * ImO)          # signed; P = |Psig|
    vars_ = (r, b, g)
    gradP = [sp.diff(Psig, v) for v in vars_]
    gradD = [sp.diff(det, v) for v in vars_]
    cross = [gradP[1] * gradD[2] - gradP[2] * gradD[1], gradP[2] * gradD[0] - gradP[0] * gradD[2], gradP[0] * gradD[1] - gradP[1] * gradD[0]]
    f = lambda ex: sp.lambdify(vars_, ex, modules='mpmath')
    G0 = ReO - G1 * sp.Rational(n - 1, 2) - n * G2 / 2 - n * G3 * (1 - q * sp.cos(g)) / D3
    return dict(det=f(det), Psig=f(Psig), cross=[f(c) for c in cross], vec=f(sp.Matrix([ReO, ImO, G0, G1, G2, G3])))


def config(n, r, b, g, vec):
    """positions and circulations: G0 at 0, G1 at eps^k, G2 at e^{i b/n} eps^k, G3 at r e^{i g/n} eps^k."""
    ReO, ImO, G0, G1, G2, G3 = [vec[i] for i in range(6)]
    eps = mp.expj(2 * mp.pi / n)
    pos = [mp.mpc(0)] + [eps**k for k in range(n)] + [mp.expj(b / n) * eps**k for k in range(n)] + [r * mp.expj(g / n) * eps**k for k in range(n)]
    gam = [G0] + [G1] * n + [G2] * n + [G3] * n
    return pos, gam, mp.mpc(ReO, ImO)


def biot_savart(pos, gam):
    M = len(pos)
    vel = [mp.conj(mp.fsum(gam[k] / (pos[j] - pos[k]) for k in range(M) if k != j) / (2 * mp.pi * I)) for j in range(M)]
    ks = [vel[j] / pos[j] for j in range(M) if abs(pos[j]) > mp.mpf('1e-40')]
    v0 = max([abs(vel[j]) for j in range(M) if abs(pos[j]) <= mp.mpf('1e-40')] + [mp.mpf(0)])
    k0 = ks[0]
    spread = max(abs(k - k0) for k in ks) / abs(k0)
    L = mp.fsum(gam[j] * abs(pos[j])**2 for j in range(M)) / mp.fsum(abs(gam[j]) * abs(pos[j])**2 for j in range(M))
    pairs = mp.fsum(gam[i] * gam[j] for i in range(M) for j in range(i + 1, M)) / mp.fsum(abs(gam[i] * gam[j]) for i in range(M) for j in range(i + 1, M))
    Gt = mp.fsum(gam)
    return dict(kappa=k0, spread=spread, v0=v0, L=L, pairs=pairs, Gt=Gt)


def refine(n, F, r0, b0, g0):
    eqs = lambda r, b, g: [F['det'](r, b, g), F['cross'][0](r, b, g), F['cross'][1](r, b, g)]
    try:
        sol = mp.findroot(eqs, (mp.mpf(r0), mp.mpf(b0), mp.mpf(g0)), tol=mp.mpf(10)**(-50), maxsteps=200)
    except ValueError:
        # fall back: use the other pair of cross components
        eqs2 = lambda r, b, g: [F['det'](r, b, g), F['cross'][1](r, b, g), F['cross'][2](r, b, g)]
        sol = mp.findroot(eqs2, (mp.mpf(r0), mp.mpf(b0), mp.mpf(g0)), tol=mp.mpf(10)**(-50), maxsteps=200)
    return [sol[i] for i in range(3)]


if __name__ == '__main__':
    n = int(sys.argv[1]); r0, b0, g0 = map(float, sys.argv[2:5])
    F = build(n)
    r, b, g = refine(n, F, r0, b0, g0)
    vec = F['vec'](r, b, g)
    vec = [vec[i] / vec[5] for i in range(6)]                # G3 = 1
    P = abs(vec[0]) / (2 * abs(vec[1]))
    pos, gam, Om_red = config(n, r, b, g, vec)
    bs = biot_savart(pos, gam)
    Om_bs = 2 * mp.pi * I * mp.conj(bs['kappa'])
    Pbs = abs(bs['kappa'].imag) / (2 * abs(bs['kappa'].real))
    # second-order check: sample P on the surface around the point (solve det for b at perturbed (r, g))
    worst = mp.inf
    for dr, dg in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)]:
        h = mp.mpf('1e-4')
        rr, gg = r + dr * h, g + dg * h
        bb = mp.findroot(lambda x: F['det'](rr, x, gg), b)
        worst = min(worst, abs(F['Psig'](rr, bb, gg)) - P)
    res = dict(n=n, r=mp.nstr(r, 50), beta=mp.nstr(b, 50), gamma=mp.nstr(g, 50), phi2=mp.nstr(b / n, 50), psi3=mp.nstr(g / n, 50),
               P_reduced=mp.nstr(P, 50), P_biot_savart=mp.nstr(Pbs, 50), G=[mp.nstr(x, 58) for x in vec[2:]],
               Omega_reduced=mp.nstr(mp.mpc(vec[0], vec[1]), 40), Omega_bs=mp.nstr(Om_bs, 40), kappa=mp.nstr(bs['kappa'], 40),
               spread=mp.nstr(bs['spread'], 3), v0=mp.nstr(bs['v0'], 3), L=mp.nstr(bs['L'], 3), pairs=mp.nstr(bs['pairs'], 3),
               Gtot=mp.nstr(bs['Gt'], 30), collapse=bool(bs['kappa'].real < 0), local_min_margin=mp.nstr(worst, 5))
    for k, v in res.items():
        print('%-18s %s' % (k, v))
    json.dump(res, open('ext_min_n%d.json' % n, 'w'), indent=1)
