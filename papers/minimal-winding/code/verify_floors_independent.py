#!/usr/bin/env python3
"""Independent validation of the P* and F_n collapse floors (2026-09-23).

Nothing here reuses Gotoda's rate formulas or the repo's JS checks. Each floor is
recomputed from the raw point-vortex velocities (2π Biot–Savart kernel):

    conj(dz_j/dt) = (1 / 2πi) Σ_{k≠j} Γ_k / (z_j − z_k).

A configuration collapses self-similarly iff every vortex moves as
dz_j/dt = κ (z_j − z_c) for one complex κ, where z_c is the centre of vorticity.
Then |z|² shrinks linearly and the product "initial rotation rate × collapse
time" is ω0·t_c = |Im κ| / (−2 Re κ) (requires Re κ < 0).

Part 1: all similarity classes of triangles with Γ = (1, 1/2, −1/3) and angular
impulse L = 0, minimum of ω0·t_c over the whole collapsing family.
Part 2: two concentric regular n-gons (strength x_n at radius 1, strength −1 at
radius √x_n, relative rotation θ), minimum over θ, for n = 2..8.
Part 1b: both orientation branches, and their limit √2 as μ → 1.
Part 3: exact algebra (sympy) for the stated closed forms, on both collapsing arcs.
Part 4: direct time integration of the three-vortex ODE at the minimizer.

Requires: mpmath, sympy.   Run: python3 code/verify_floors_independent.py [--json out.json]
"""
import json
import sys

import mpmath as mp
import sympy as sp

mp.mp.dps = 60
TAU = 2 * mp.pi
results = {}


def velocities(zs, gs):
    """dz_j/dt for point vortices with the 2π kernel."""
    out = []
    for j, zj in enumerate(zs):
        s = mp.mpc(0)
        for k, zk in enumerate(zs):
            if k != j:
                s += gs[k] / (zj - zk)
        out.append(mp.conj(s / (TAU * 1j)))
    return out


def kappa_spread(zs, gs):
    """κ for each vortex about the centre of vorticity; returns (κ_mean, max spread)."""
    G = sum(gs)
    zc = sum(g * z for g, z in zip(gs, zs)) / G
    ks = [u / (z - zc) for u, z in zip(velocities(zs, gs), zs)]
    km = sum(ks) / len(ks)
    return km, max(abs(k - km) for k in ks)


def product(km):
    return abs(km.imag) / (-2 * km.real)


# ---------------------------------------------------------------- Part 1: P*
g3 = [mp.mpf(1), mp.mpf(1) / 2, -mp.mpf(1) / 3]
# z1 = 0, z2 = 1, z3 = w.  L = Γ1Γ2·1 + Γ1Γ3|w|² + Γ2Γ3|w−1|² = 0 is a circle in w.
# 1/2 − |w|²/3 − |w−1|²/6 = 0  ⇔  |w|² − (1/3)(2Re w) ... solve: 3 − 2|w|² − |w−1|² = 0
# ⇔ 3|w|² − 2 Re w − 2 = 0 ⇔ |w − 1/3|² = 7/9.   Centre 1/3, radius √7/3.
wc, wr = mp.mpf(1) / 3, mp.sqrt(7) / 3


def tri(phi):
    return [mp.mpc(0), mp.mpc(1), wc + wr * mp.expj(phi)]


def L_of(zs, gs):
    return sum(gs[i] * gs[j] * abs(zs[i] - zs[j]) ** 2 for i in range(3) for j in range(i + 1, 3))


def P_phi(phi):
    km, _ = kappa_spread(tri(phi), g3)
    return product(km) if km.real < 0 else mp.inf


# scan the whole circle: self-similarity residual, L residual, collapsing arcs
N = 4000
worst_spread, worst_L, samples = mp.mpf(0), mp.mpf(0), []
for i in range(N):
    phi = TAU * (i + mp.mpf(1) / 2) / N
    zs = tri(phi)
    km, spr = kappa_spread(zs, g3)
    worst_spread = max(worst_spread, spr / abs(km))
    worst_L = max(worst_L, abs(L_of(zs, g3)))
    samples.append((phi, product(km) if km.real < 0 else mp.inf))
finite = [(p, v) for p, v in samples if v != mp.inf]
phi0, v0 = min(finite, key=lambda t: t[1])
# refine the minimum: dP/dφ = 0
phistar = mp.findroot(lambda p: mp.diff(P_phi, p), phi0)
Pmin_indep = P_phi(phistar)
Pstar_closed = mp.sqrt(mp.mpf(605) / 324 + 7 * mp.sqrt(5201) / 162 *
                       mp.cos(mp.acos(245351 * mp.sqrt(5201) / mp.mpf(5201) ** 2) / 3))
sextic = lambda x: 8748 * x**6 - 49005 * x**4 + 27794 * x**2 + 18723
local_minima = sum(1 for i in range(N) if samples[i][1] != mp.inf
                   and samples[i][1] < samples[i - 1][1] and samples[i][1] < samples[(i + 1) % N][1])

# Gotoda-arc formula P(θ) at its own θ*, and at Gotoda's positions via raw Biot–Savart
def P_gotoda(th):
    s7 = mp.sqrt(7)
    return (14 * mp.sin(th) ** 2 + 6 * s7 * mp.cos(th) + 21) / (2 * (14 * mp.cos(th) + s7) * mp.sin(th))


def gotoda_positions(th):
    G1, G2, R = mp.mpf(1), mp.mpf(1) / 2, mp.mpf(7) / 4
    f = G1 * G2 / (G1 + G2) ** 2
    e = mp.expj(-th)
    return [f * (1 + mp.sqrt(R) / G1 * e), f * (1 - mp.sqrt(R) / G2 * e), mp.mpc(1)]


arc_err = mp.mpf(0)
th0 = mp.acos(-mp.sqrt(7) / 14)
for i in range(1, 400):
    th = th0 * i / 400
    km, _ = kappa_spread(gotoda_positions(th), g3)
    arc_err = max(arc_err, abs(product(km) - P_gotoda(th)) / P_gotoda(th))
arcA_err, arcA_all_collapse = mp.mpf(0), True
for i in range(1, 400):        # second collapsing arc: π < θ < 2π − θ0
    th = mp.pi + (mp.pi - th0) * i / 400
    km, _ = kappa_spread(gotoda_positions(th), g3)
    arcA_all_collapse = arcA_all_collapse and km.real < 0
    arcA_err = max(arcA_err, abs(product(km) - P_gotoda(th)) / P_gotoda(th))
# the quotient an earlier campaign note built from Gotoda (3.3)-B, versus raw Biot–Savart
Q33 = lambda t: (56 * mp.cos(t) ** 2 - 10 * mp.sqrt(7) * mp.cos(t) - 133) / (8 * (14 * mp.cos(t) + mp.sqrt(7)) * mp.sin(t))
q33_cmp = []
for t in ('0.4', '0.8', '1.2'):
    km, _ = kappa_spread(gotoda_positions(mp.mpf(t)), g3)
    q33_cmp.append({'theta': t, 'rawBiotSavart': mp.nstr(product(km), 12), 'quotient33': mp.nstr(abs(Q33(mp.mpf(t))), 12)})
q33_min = min(abs(Q33(th0 * i / 2000)) for i in range(1, 2000))
thstar = mp.findroot(lambda t: mp.diff(P_gotoda, t), mp.mpf('0.83'))

branch_minima, branch_raw = [], []
for i in range(N):
    if samples[i][1] != mp.inf and samples[i][1] < samples[i - 1][1] and samples[i][1] < samples[(i + 1) % N][1]:
        p = mp.findroot(lambda t: mp.diff(P_phi, t), samples[i][0])
        zs = tri(p)
        orient = 'counterclockwise' if ((zs[1] - zs[0]) * mp.conj(zs[2] - zs[0])).imag < 0 else 'clockwise'
        branch_minima.append({'phiDeg': mp.nstr(p * 180 / mp.pi, 15), 'orientation123': orient, 'minimum': mp.nstr(P_phi(p), 40)})
        branch_raw.append(P_phi(p))
X = 245351 * mp.sqrt(5201) / mp.mpf(5201) ** 2
Pmin_closed = mp.sqrt(mp.mpf(605) / 324 + 7 * mp.sqrt(5201) / 162 * mp.cos(mp.acos(X) / 3 - 2 * mp.pi / 3))
thA = 2 * mp.pi - mp.acos(mp.sqrt(7) * mp.mpf('-0.349386340300794394073391946872'))
thA = mp.findroot(lambda t: mp.diff(P_gotoda, t), thA)
kmA, _ = kappa_spread(gotoda_positions(thA), g3)

results['Pstar'] = {
    'branchMinima': branch_minima,
    'secondBranchClosedForm': mp.nstr(Pmin_closed, 40),
    'secondBranchSexticResidual': mp.nstr(abs(sextic(Pmin_closed)), 5),
    'secondBranchGotodaTheta': mp.nstr(thA, 30), 'secondBranchGotodaThetaDeg': mp.nstr(thA * 180 / mp.pi, 15),
    'secondBranchCosTheta': mp.nstr(mp.cos(thA), 30),
    'secondBranchPformula': mp.nstr(P_gotoda(thA), 40),
    'secondBranchRawBiotSavart': mp.nstr(product(kmA), 40), 'secondBranchCollapses': bool(kmA.real < 0),
    'arcA_deg': [180, mp.nstr((2 * mp.pi - th0) * 180 / mp.pi, 15)],
    'selfSimilarityResidualMaxRel': float(worst_spread),
    'angularImpulseResidualMax': float(worst_L),
    'collapsingSamples': len(finite), 'totalSamples': N, 'localMinimaOnCircle': local_minima,
    'independentMinimum': mp.nstr(Pmin_indep, 40),
    'closedForm': mp.nstr(Pstar_closed, 40),
    'absDifference': mp.nstr(abs(Pmin_indep - Pstar_closed), 5),
    'sexticResidualAtClosedForm': mp.nstr(abs(sextic(Pstar_closed)), 5),
    'gotodaFormulaVsRawBiotSavartMaxRel': float(arc_err),
    'secondArcFormulaVsRawBiotSavartMaxRel': float(arcA_err),
    'gotoda33QuotientVsRaw': q33_cmp, 'gotoda33QuotientSampledMin': mp.nstr(q33_min, 8), 'secondArcAllCollapsing': bool(arcA_all_collapse),
    'gotodaThetaStar': mp.nstr(thstar, 30), 'gotodaCosThetaStar': mp.nstr(mp.cos(thstar), 30),
    'gotodaPAtThetaStar': mp.nstr(P_gotoda(thstar), 40),
    'branchMinimaVsClosedFormsAbsDiff': [mp.nstr(abs(min(branch_raw) - Pmin_closed), 5),
                                         mp.nstr(abs(max(branch_raw) - Pstar_closed), 5)],
}

# ------------------------------------------- Part 1b: both branches vs mu
def branch_minima_mu(mu):
    g = [mp.mpf(1), mp.mpf(mu), -mp.mpf(mu) / (1 + mp.mpf(mu))]
    a = g[0] * g[2] + g[1] * g[2]; b = g[1] * g[2]; c0 = g[0] * g[1] + g[1] * g[2]
    cx = b / a; r = mp.sqrt(cx ** 2 - c0 / a)
    def P(phi):
        km, _ = kappa_spread([mp.mpc(0), mp.mpc(1), cx + r * mp.expj(phi)], g)
        return product(km) if km.real < 0 else mp.inf
    M = 720; vals = [(TAU * (i + mp.mpf(1) / 2) / M, P(TAU * (i + mp.mpf(1) / 2) / M)) for i in range(M)]
    mins = []
    for i in range(M):
        if vals[i][1] != mp.inf and vals[i][1] < vals[i - 1][1] and vals[i][1] < vals[(i + 1) % M][1]:
            p = mp.findroot(lambda t: mp.diff(P, t), vals[i][0]); mins.append(P(p))
    return [mp.nstr(v, 20) for v in sorted(mins)]


results['branchesVsMu'] = {mu: branch_minima_mu(mp.mpf(mu)) for mu in ['0.5', '2', '0.9', '0.99', '0.999', '1']}
results['branchesVsMu']['sqrt2'] = mp.nstr(mp.sqrt(2), 20)

# ------------------------------------------------------------- Part 2: F_n
def golden(f, a, b, it=220):
    g = (mp.sqrt(5) - 1) / 2
    c, d = b - g * (b - a), a + g * (b - a)
    for _ in range(it):
        if f(c) < f(d):
            b = d
        else:
            a = c
        c, d = b - g * (b - a), a + g * (b - a)
    return (a + b) / 2


def rings(n, th):
    x = mp.mpf(n) / (n - 1) + mp.sqrt((mp.mpf(n) / (n - 1)) ** 2 - 1)
    zs, gs = [], []
    for k in range(n):
        a = TAU * k / n
        zs.append(mp.expj(a)); gs.append(x)
        zs.append(mp.sqrt(x) * mp.expj(a + th)); gs.append(mp.mpf(-1))
    return zs, gs


def Fn_formula(n):
    K = (n - 1) * mp.sinh((n + 2) / mp.mpf(2) * mp.acosh(mp.mpf(n) / (n - 1)))
    return mp.sqrt(K ** 2 - (2 * n - 1)) / (2 * n)


fn = {}
for n in range(2, 9):
    worst, curve_err = mp.mpf(0), mp.mpf(0)
    def Pn(th, n=n):
        km, _ = kappa_spread(*rings(n, th))
        return product(km) if km.real < 0 else mp.inf
    grid = [mp.pi / n * (i + mp.mpf(1) / 2) / 800 for i in range(800)]
    vals = []
    for th in grid:
        km, spr = kappa_spread(*rings(n, th))
        worst = max(worst, spr / abs(km))
        vals.append(product(km) if km.real < 0 else mp.inf)
    ths = golden(Pn, mp.pi / n * mp.mpf('0.001'), mp.pi / n * mp.mpf('0.999'))
    Kn = (n - 1) * mp.sinh((n + 2) / mp.mpf(2) * mp.acosh(mp.mpf(n) / (n - 1)))
    general = max(abs(vals[i] - (Kn - mp.sqrt(2 * n - 1) * mp.cos(n * grid[i])) / (2 * n * mp.sin(n * grid[i])))
                  / vals[i] for i in range(0, len(grid), 20))
    entry = {'generalProductFormulaMaxRel': float(general),
             'selfSimilarityResidualMaxRel': float(worst), 'allCollapsing': all(v != mp.inf for v in vals),
             'independentMinimum': mp.nstr(Pn(ths), 35), 'formula': mp.nstr(Fn_formula(n), 35),
             'absDifference': mp.nstr(abs(Pn(ths) - Fn_formula(n)), 5),
             'cosNThetaStar': mp.nstr(mp.cos(n * ths), 30)}
    if n == 5:
        for th in grid[::20]:
            closed = (127 * mp.sqrt(2) - 24 * mp.cos(5 * th)) / (80 * mp.sin(5 * th))
            curve_err = max(curve_err, abs(Pn(th) - closed) / closed)
        entry['pentagonCurveVsClosedMaxRel'] = float(curve_err)
        entry['closedF5'] = mp.nstr(mp.sqrt(31682) / 80, 35)
        entry['closedCos5ThetaStar'] = mp.nstr(12 * mp.sqrt(2) / 127, 30)
    fn[n] = entry
known = {2: 3 * mp.sqrt(5) / 4, 3: mp.sqrt(29) / 3, 4: mp.sqrt(322) / 9, 5: mp.sqrt(31682) / 80}
for n, v in known.items():
    fn[n]['statedRadical'] = mp.nstr(v, 35)
    fn[n]['radicalVsIndependent'] = mp.nstr(abs(v - mp.mpf(fn[n]['independentMinimum'])), 5)
results['Fn'] = fn

# ---------------------------------------------------------- Part 3: exact
c, th, x, q, u = sp.symbols('c theta x q u', real=True)
s7 = sp.sqrt(7)
Pth = (14 * sp.sin(th) ** 2 + 6 * s7 * sp.cos(th) + 21) / (2 * (14 * sp.cos(th) + s7) * sp.sin(th))
num = sp.numer(sp.together(sp.diff(Pth, th)))
num_c = sp.expand(sp.simplify(num.subs(sp.sin(th) ** 2, 1 - sp.cos(th) ** 2)).subs(sp.cos(th), c))
cubic_stated = 196 * c ** 3 + 224 * s7 * c ** 2 + 14 * c - 128 * s7
ratio = sp.simplify(sp.factor(num_c) / cubic_stated)
# rational form via c = √7·u: √7(1372u³ + 1568u² + 14u − 128)
cubic_u = sp.Poly(1372 * u ** 3 + 1568 * u ** 2 + 14 * u - 128, u)
lo, hi = sp.Rational(-1, 14), 1 / s7          # c ∈ (−√7/14, 1)  ⇔  u ∈ (−1/14, 1/√7)
roots_u = sp.real_roots(cubic_u)
in_arc = [r for r in roots_u if sp.N(r, 50) > sp.N(lo, 50) and sp.N(r, 50) < sp.N(hi, 50)]
# endpoint limits (P → +∞ at both ends): numerator positive at both ends
N_end0 = (14 * 0 + 6 * s7 * 1 + 21)
N_end1 = sp.nsimplify(14 * (1 - sp.Rational(7, 196)) + 6 * s7 * (-s7 / 14) + 21)
# sextic: resultant elimination done independently
Pc = sp.symbols('P', positive=True)
Ncc, D0 = 35 - 14 * c ** 2 + 6 * s7 * c, 2 * (14 * c + s7)
rel = sp.expand(Pc ** 2 * D0 ** 2 * (1 - c ** 2) - Ncc ** 2)
r7 = sp.symbols('r7')
res = sp.resultant(sp.expand(cubic_stated.subs(s7, r7)), sp.expand(rel.subs(s7, r7)), c)
res2 = sp.resultant(sp.expand(res), r7 ** 2 - 7, r7)
fac = sp.factor_list(sp.Poly(res2, Pc))
sext = sp.Poly(8748 * x ** 6 - 49005 * x ** 4 + 27794 * x ** 2 + 18723, x)
cub = sp.Poly(8748 * q ** 3 - 49005 * q ** 2 + 27794 * q + 18723, q)
# F5 exact
K5 = sp.Rational(4, 2) * (sp.Integer(2) ** sp.Rational(7, 2) - sp.Integer(2) ** sp.Rational(-7, 2))
F5 = sp.sqrt(K5 ** 2 - 9) / 10
a_, b_ = 127 * sp.sqrt(2), sp.Integer(24)
loA, hiA = -1 / s7, sp.Rational(-1, 14)       # c ∈ (−1, −√7/14) with sin θ < 0  ⇔  u ∈ (−1/√7, −1/14)
in_arcA = [r for r in roots_u if sp.N(r, 50) > sp.N(loA, 50) and sp.N(r, 50) < sp.N(hiA, 50)]
N_arcA_start = sp.nsimplify(6 * s7 * (-1) + 21)   # numerator at θ → π⁺ (c → −1, s → 0⁻)
results['exact'] = {
    'rootsInsideSecondArc': len(in_arcA), 'numeratorAtSecondArcStart': str(N_arcA_start),
    'numeratorAtSecondArcStartPositive': bool(N_arcA_start > 0),
    'criticalCubicMatchesDerivative': str(ratio),
    'realRootsOfRationalCubicU': [str(sp.N(r, 30)) for r in roots_u],
    'rootsInsideCollapsingArc': len(in_arc),
    'numeratorAtTheta0': str(N_end0), 'numeratorAtArcEnd': str(N_end1),
    'resultantFactors': [(str(f.as_expr()), m) for f, m in fac[1]],
    'sexticIrreducibleOverQ': sext.is_irreducible, 'cubicIrreducibleOverQ': cub.is_irreducible,
    'cubicDiscriminantPositive': bool(sp.discriminant(cub) > 0),
    'sexticIrreducibleOverQsqrt7': len(sp.factor_list(sext.as_expr(), extension=s7)[1]) == 1,
    'K5': str(sp.nsimplify(K5)), 'K5equals127sqrt2over8': sp.simplify(K5 - 127 * sp.sqrt(2) / 8) == 0,
    'F5equalsSqrt31682over80': sp.simplify(F5 - sp.sqrt(31682) / 80) == 0,
    'boundSqrtA2minusB2over80': str(sp.simplify(sp.sqrt(a_ ** 2 - b_ ** 2) / 80)),
    'minimizerCos': str(sp.nsimplify(b_ / a_)),
}

# ------------------------------------- Part 3b: exact rates (Lemma 1) and ring condition
thS = sp.symbols('thetaS', real=True)
gS = [sp.Integer(1), sp.Rational(1, 2), sp.Rational(-1, 3)]
eS = sp.cos(thS) - sp.I * sp.sin(thS)
zS = [sp.Rational(2, 9) * (1 + sp.sqrt(7) / 2 * eS), sp.Rational(2, 9) * (1 - sp.sqrt(7) * eS), sp.Integer(1)]
zcS = sum(g * z for g, z in zip(gS, zS)) / sum(gS)
def velS(j):
    return sp.conjugate(sum(gS[k] / (zS[j] - zS[k]) for k in range(3) if k != j) / (2 * sp.pi * sp.I))
kS = [velS(j) / (zS[j] - zcS) for j in range(3)]
cS, sS = sp.cos(thS), sp.sin(thS)
DS = 28 * sS ** 2 + 5 * sp.sqrt(7) * cS + 16
kappa_claim = (-27 * (14 * cS + sp.sqrt(7)) * sS + sp.I * 27 * (14 * sS ** 2 + 6 * sp.sqrt(7) * cS + 21)) / (28 * sp.pi * DS)
wS = (zS[2] - zS[0]) / (zS[1] - zS[0])
LS = sum(gS[i] * gS[j] * (zS[i] - zS[j]) * sp.conjugate(zS[i] - zS[j]) for i in range(3) for j in range(i + 1, 3))
nS, xS, wwS = sp.symbols('n x w')
ring = sp.factor(sp.simplify(xS * (nS - 1) / 2 - nS / (1 - wwS) - (-(nS - 1) / (2 * xS) - nS * wwS / (1 - wwS))))
results['symbolic'] = {
    'lemma1AllKappasEqualClaim': all(sp.simplify(sp.expand_complex(k - kappa_claim)) == 0 for k in kS),
    'shapeRatioIsCircle': sp.simplify(sp.expand_complex(wS - (sp.Rational(1, 3) - sp.sqrt(7) / 3 * (cS + sp.I * sS)))) == 0,
    'angularImpulseZero': sp.simplify(sp.expand_complex(LS)) == 0,
    'ringSelfSimilarityCondition': str(ring),
}

# ------------------------------------- Part 3c: certified root identification at mu = 1/2
cS2 = sp.symbols('cS2')
Ccub = 196 * cS2**3 + 224 * sp.sqrt(7) * cS2**2 + 14 * cS2 - 128 * sp.sqrt(7)
signs = {v: int(sp.sign(sp.nsimplify(Ccub.subs(cS2, sp.Rational(v))))) for v in ('0.67', '0.68', '-0.93', '-0.92')}
iv = mp.iv
iv.dps = 30
def P2_interval(lo, hi):
    cc = iv.mpf([lo, hi]); s7 = iv.sqrt(7)
    Nn = 35 + 6 * s7 * cc - 14 * cc**2
    return Nn**2 / (4 * (14 * cc + s7)**2 * (1 - cc**2))
encB, encA = P2_interval('0.67', '0.68'), P2_interval('-0.93', '-0.92')
qroots = [r for r in sp.Poly(8748 * sp.Symbol('q')**3 - 49005 * sp.Symbol('q')**2 + 27794 * sp.Symbol('q') + 18723).nroots(n=30)]
inside = lambda e: [float(r) for r in qroots if float(e.a) <= float(r) <= float(e.b)]
results['certified'] = {
    'criticalCubicSigns': signs,
    'signChangeOnArcPlus': signs['0.67'] * signs['0.68'] < 0,
    'signChangeOnArcMinus': signs['-0.93'] * signs['-0.92'] < 0,
    'P2EnclosureArcPlus': [float(encB.a), float(encB.b)],
    'P2EnclosureArcMinus': [float(encA.a), float(encA.b)],
    'rootsInsideArcPlus': inside(encB), 'rootsInsideArcMinus': inside(encA),
}

# ------------------------------------------------ Part 4: time integration
def rhs(t, y):
    zs = [mp.mpc(y[2 * i], y[2 * i + 1]) for i in range(3)]
    us = velocities(zs, g3)
    return [v for uz in us for v in (uz.real, uz.imag)]


mp.mp.dps = 30
zs0 = tri(phistar)
G = sum(g3); zc = sum(g * z for g, z in zip(g3, zs0)) / G
km, _ = kappa_spread(zs0, g3)
tc_pred = abs(zs0[0] - zc) ** 2 / (-2 * km.real * abs(zs0[0] - zc) ** 2)   # r² = r0²(1 + 2 Re κ t)
y0 = [v for z in zs0 for v in (z.real, z.imag)]
sol = mp.odefun(rhs, 0, y0)
checks = []
for frac in (mp.mpf('0.25'), mp.mpf('0.5'), mp.mpf('0.75'), mp.mpf('0.9')):
    t = frac * tc_pred
    y = sol(t)
    zs = [mp.mpc(y[2 * i], y[2 * i + 1]) for i in range(3)]
    size2 = abs(zs[1] - zs[0]) ** 2
    expected = abs(zs0[1] - zs0[0]) ** 2 * (1 + 2 * km.real * t)
    lam2 = 1 + 2 * km.real * t
    phi_pred = -km.imag * tc_pred * mp.log(lam2)
    r2err = max(abs(abs(zs[j] - zc) ** 2 - abs(zs0[j] - zc) ** 2 * lam2) / (abs(zs0[j] - zc) ** 2 * lam2) for j in range(3))
    phierr = max(abs(mp.arg((zs[j] - zc) / (zs0[j] - zc) * mp.expj(-phi_pred))) for j in range(3))
    checks.append({'fractionOfTc': float(frac), 'relErrSize2': float(abs(size2 - expected) / expected),
                   'relErrDistanceToCollisionPoint2AllVortices': float(r2err),
                   'rotationAngleErrAllVortices': float(phierr)})
results['timeIntegration'] = {'predictedTc': mp.nstr(tc_pred, 20), 'omega0': mp.nstr(abs(km.imag), 20),
                              'omega0TimesTc': mp.nstr(abs(km.imag) * tc_pred, 20), 'checks': checks}

out = json.dumps(results, indent=1, default=str)
if '--json' in sys.argv:
    open(sys.argv[sys.argv.index('--json') + 1], 'w').write(out + '\n')
print(out)
