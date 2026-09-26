#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""Checks of Section 4 of the manuscript (paper/minimal-winding.tex): the winding of self-similar three-vortex
collapse in the alpha-models, Lemmas 5 and 6, Theorem 2 and Corollary 2, with a scan below alpha = -1 and
Badin and Barry's SQG interval. Run from any folder: python3 code/verify_alpha_winding.py
Model: dz_j/dt = (i/2pi) sum_k G_k (z_j - z_k) |z_j - z_k|^(-2 beta), beta = 1 + alpha/2 (alpha = 0 Euler, 1 SQG).
P = |Im kappa| / (2 |Re kappa|), where dz_j/dt = kappa (z_j - z_c)."""
import os
import random
import mpmath as mm
import sympy as sp

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "verify_alpha_winding.txt")

def velocities(G, z, al):
    return [1j / (2 * mm.pi) * sum(G[k] * (z[j] - z[k]) * abs(z[j] - z[k]) ** (-al - 2) for k in range(3) if k != j)
            for j in range(3)]

def kappa_and_residual(G, z, al):
    zc = sum(a * b for a, b in zip(G, z)) / sum(G)
    v = velocities(G, z, al)
    ks = [v[j] / (z[j] - zc) for j in range(3)]
    return ks[0], max(abs(k - ks[0]) for k in ks) / abs(ks[0])

def S_formula(z, be):
    r = [abs(z[1] - z[2]), abs(z[2] - z[0]), abs(z[0] - z[1])]          # r_i opposite vertex i
    return sum(r[i] ** 2 * mm.coth(be * mm.log(r[(i + 2) % 3] / r[(i + 1) % 3])) for i in range(3))

def area(z):
    return abs(((z[1] - z[0]).conjugate() * (z[2] - z[0])).imag) / 2

def circulations(z, be):
    """Lemma 5: G_i = r_i^2 / (f_j - f_k), f = r^(-2 beta), (i, j, k) cyclic."""
    r = [abs(z[1] - z[2]), abs(z[2] - z[0]), abs(z[0] - z[1])]
    f = [x ** (-2 * be) for x in r]
    return [r[i] ** 2 / (f[(i + 1) % 3] - f[(i + 2) % 3]) for i in range(3)]

out = []
fails = []                                       # the checks that failed; the program exits with an error if any
def say(s):
    print(s); out.append(s)

# 1. Lemma 5 and Lemma 6 against Biot-Savart on random scalene triangles.
mm.mp.dps = 40; random.seed(1); worst_ss = worst_P = 0; n = 0
for t in range(700):
    al = mm.mpf(random.choice([0, 0.3, 1, 1.7, 3])); be = 1 + al / 2
    z = [mm.mpc(0), mm.mpc(1), mm.mpc(mm.mpf(random.uniform(-1, 2)), mm.mpf(random.uniform(0.05, 1.5)))]
    r = sorted([abs(z[1] - z[2]), abs(z[2] - z[0]), abs(z[0] - z[1])])
    if r[1] - r[0] < 1e-6 or r[2] - r[1] < 1e-6: continue
    G = circulations(z, be); k, res = kappa_and_residual(G, z, al)
    P = abs(k.imag) / (2 * abs(k.real)); worst_ss = max(worst_ss, res)
    worst_P = max(worst_P, abs(P - abs(S_formula(z, be)) / (8 * area(z))) / P); n += 1
say(f"[1] {n} random scalene triangles, alpha in {{0, 0.3, 1, 1.7, 3}}: Lemma 5 circulations are self-similar "
    f"(kappa spread <= {mm.nstr(worst_ss, 2)}); P = |S|/(8 Area) to {mm.nstr(worst_P, 2)} relative")
if not (worst_ss < 1e-30 and worst_P < 1e-30): fails.append(1)

# 2. The exact identities of the proof.
x, rho, m, b = sp.symbols('x rho m beta', positive=True)
g = 12 * x / (12 + 6 * x - x ** 2) - sp.log(1 + x)
d1 = sp.simplify(sp.diff(g, x) - x ** 3 * (24 - x) / ((12 + 6 * x - x ** 2) ** 2 * (1 + x)))
Lam = b * m + 2 / m + rho - rho ** 2 * m / 6
d2 = sp.simplify(sp.expand(Lam ** 2 - (1 + 2 * b) * (4 - (m - rho) ** 2)
                           - (((1 + b) * m - 2 / m - rho) ** 2 + (rho ** 2 / 3) * (1 + 6 * b - b * m ** 2 - rho * m + rho ** 2 * m ** 2 / 12))))
D = ((1 + b) * m - 2) ** 2 + (1 + 6 * b - b * m ** 2 - m) / 3                  # case m >= 2 of step (iii)
Pc = (b * m ** 2 + 2) / (2 * b * m * sp.sqrt(4 - m ** 2)); ms = sp.sqrt(2 / (1 + b))
d3 = sp.simplify(sp.diff(Pc, m).subs(m, ms)); d4 = sp.simplify(Pc.subs(m, ms) - sp.sqrt(1 + 2 * b) / (2 * b))
say(f"[2] g'(x) identity residual {d1}; identity residual {d2}; case m >= 2: D(2) = {sp.expand(D.subs(m, 2))}, "
    f"D'(2) = {sp.expand(sp.diff(D, m).subs(m, 2))}, D'' = {sp.expand(sp.diff(D, m, 2))} (all > 0 for beta >= 1/2); "
    f"limit P_0'(m*) = {d3}, P_0(m*) - B = {d4}")
if not (d1 == 0 and d2 == 0 and d3 == 0 and d4 == 0): fails.append(2)

# 3. The chain S >= rho m + rho^2 coth b > (rho/beta) Lam, Lam/(4 beta sin psi) > B, at precision scaled to rho^(2 beta).
random.seed(5); bad = 0; n = 0; margin = mm.inf
for t in range(20000):
    b0 = random.choice([0.5 + 1e-3 * random.random(), 0.5 + 0.05 * random.random(), 0.75, 1, 1.25, 1.5, 2, 3, 6, 20]) * (1 + 0.02 * random.random())
    lr = -random.random() * 8 if random.random() < .5 else float(mm.log10(random.random() + 1e-300))
    mm.mp.dps = int(40 + 2.4 * b0 * abs(lr))
    be = mm.mpf(b0); r = mm.mpf(10) ** mm.mpf(lr); mx = mm.mpf(random.random()) * (2 + r); cp = (r - mx) / 2
    if abs(cp) >= 1 or r >= 1: continue
    X = r ** (2 * be); Y = (1 + r * mx) ** be; bh = be / 2 * mm.log(1 + r * mx)
    S = (1 + r * mx) * (1 + X) / (1 - X) + r ** 2 * mm.coth(bh) - (Y + X) / (Y - X)
    L = be * mx + 2 / mx + r - r ** 2 * mx / 6; B = mm.sqrt(1 + 2 * be) / (2 * be); s = mm.sqrt(1 - cp ** 2)
    ok = S >= r * mx + r ** 2 * mm.coth(bh) > (r / be) * L and L > 0 and L / (4 * be * s) > B and S / (4 * r * s) > B
    bad += not ok; n += 1; margin = min(margin, (S / (4 * r * s) - B) / B)
say(f"[3] proof chain at {n} random points (beta from just above 1/2 to 20, rho down to 1e-8): {bad} violations; smallest (P - B)/B = {mm.nstr(margin, 3)}")
if bad or not margin > 0: fails.append(3)

# 4. Sharpness: configurations near the limit, built from Lemma 5 and checked by Biot-Savart.
mm.mp.dps = 60
for al in [0, 0.5, 1, 2]:
    al = mm.mpf(al); be = 1 + al / 2; B = mm.sqrt(1 + 2 * be) / (2 * be)
    for r in [mm.mpf('1e-3'), mm.mpf('1e-6')]:
        m = mm.sqrt(2 / (1 + be)); cp = (r - m) / 2
        z = [mm.mpc(0), mm.mpc(1), r * mm.expj(mm.acos(cp))]
        G = circulations(z, be); k, res = kappa_and_residual(G, z, al)
        if k.real > 0:
            z = [c.conjugate() for c in z]; G = circulations(z, be); k, res = kappa_and_residual(G, z, al)
        P = abs(k.imag) / (2 * abs(k.real))
        if not (k.real < 0 and res < 1e-30 and 0 < P - B < 1e-5): fails.append(4)
        say(f"[4] alpha = {mm.nstr(al, 2)}, rho = {mm.nstr(r, 1)}: Re kappa < 0 {k.real < 0}, spread {mm.nstr(res, 2)}, "
            f"P - B = {mm.nstr(P - B, 4)}, G = ({', '.join(mm.nstr(x / G[1], 4) for x in G)})")

# 5. Table of the bound.
mm.mp.dps = 20
for al in [0, 0.5, 1, 1.5, 2]:
    al = mm.mpf(al); B = mm.sqrt(3 + al) / (2 + al)
    say(f"[5] alpha = {mm.nstr(al, 2)}: B = {mm.nstr(B, 10)}, path ratio sqrt(1+4B^2) = {mm.nstr(mm.sqrt(1 + 4 * B ** 2), 10)}, "
        f"spiral angle arctan(2B) = {mm.nstr(mm.degrees(mm.atan(2 * B)), 6)} deg, |omega_0| t_c bound 2B/(2+alpha) = {mm.nstr(2 * B / (2 + al), 10)}")
open(OUT, 'w').write('\n'.join(out) + '\n')

# 6. alpha <= -1 (proved in Remark 4; this is a numerical check): minimize P - B with precision growing with |log rho|.
from scipy.optimize import minimize
def P_minus_B(al, lr, m):
    mm.mp.dps = int(40 + 3 * abs(lr))
    be = 1 + mm.mpf(al) / 2; r = mm.mpf(10) ** mm.mpf(lr); m = mm.mpf(m)
    if not (0 < m < 2 + r) or r >= 1: return 1.0
    X = r ** (2 * be); Y = (1 + r * m) ** be; bh = be / 2 * mm.log(1 + r * m)
    S = (1 + r * m) * (1 + X) / (1 - X) + r ** 2 * mm.coth(bh) - (Y + X) / (Y - X)
    return float(abs(S) / (4 * r * mm.sqrt(1 - ((r - m) / 2) ** 2)) - mm.sqrt(1 + 2 * be) / (2 * be))
for al in [-1.0, -1.2, -1.5, -1.8]:
    best = min(((P_minus_B(al, lr, m), lr, m) for lr in [x / 4 for x in range(-40, 0)] for m in [0.05 + 0.1 * k for k in range(19)]))
    r = minimize(lambda v: P_minus_B(al, v[0], v[1]), [best[1], best[2]], method='Nelder-Mead', options={'xatol': 1e-10, 'fatol': 1e-40})
    if not r.fun > 0: fails.append(6)
    say(f"[6] alpha = {al}: minimum of P - B found = {r.fun:.3e} ({'positive' if r.fun > 0 else 'NEGATIVE'}) at rho = 1e{r.x[0]:.1f}, m = {r.x[1]:.6f}")
open(OUT, 'w').write('\n'.join(out) + '\n')

# 7. Lemma 5 at SQG against Badin-Barry, Phys. Rev. E 98 (2018) 023110, Lemma 1 and Eq. (93): circulations (1, -G, 1)
#    collapse self-similarly exactly for 0.387464... < G < 1/2, and at G = 0.49 the side ratio is 0.751484. The grid
#    gives the interval; the side ratio is solved at G = 0.49 exactly, at 30 digits, from the nearest grid point.
import numpy as np
from scipy.optimize import brentq
def circ_f(r1, r2, r3, be=1.5):
    r = [r1, r2, r3]; f = [x ** (-2 * be) for x in r]
    return [r[i] ** 2 / (f[(i + 1) % 3] - f[(i + 2) % 3]) for i in range(3)]
pairs = []
with np.errstate(divide='ignore', invalid='ignore'):
    for r1 in np.linspace(0.005, 0.9995, 3000):      # r2 = |z3 - z1| = 1 joins the two equal circulations
        F = lambda r3: (lambda G: (G[0] - G[2]) / (abs(G[0]) + abs(G[2])))(circ_f(r1, 1.0, r3))
        grid = np.linspace(1 - r1 + 1e-12, 1 + r1 - 1e-12, 600); v = [F(x) for x in grid]
        for i in range(len(grid) - 1):
            if np.isfinite(v[i]) and np.isfinite(v[i + 1]) and np.sign(v[i]) != np.sign(v[i + 1]):
                try: r3 = brentq(F, grid[i], grid[i + 1], xtol=1e-15)
                except ValueError: continue
                if abs(F(r3)) < 1e-9:
                    G = circ_f(r1, 1.0, r3); pairs.append((-G[1] / G[0], r1, r3))
g = [p[0] for p in pairs]; o = min(pairs, key=lambda p: abs(p[0] - 0.49))
import mpmath as mpm
with mpm.workdps(30):
    def eqs(r1, r3):
        G = circ_f(r1, mpm.mpf(1), r3, be=mpm.mpf(3) / 2)
        return [G[0] - G[2], -G[1] - mpm.mpf(49) / 100 * G[0]]
    s1, s3 = mpm.findroot(eqs, (mpm.mpf(o[1]), mpm.mpf(o[2])))
    res = max(abs(e) for e in eqs(s1, s3)); ratio = min(s1 / s3, s3 / s1)
if not (abs(min(g) - 0.387464) < 1e-3 and abs(max(g) - 0.5) < 1e-3 and res < mpm.mpf(10) ** -25
        and abs(ratio - mpm.mpf('0.751484')) < 5e-7): fails.append(7)
say(f"[7] SQG, two equal circulations: {len(pairs)} collapsing triangles, -G2/G1 from {min(g):.6f} to {max(g):.6f} "
    f"(Badin-Barry: 0.387464... to 1/2); at G = 0.49 exactly the side ratio is {mpm.nstr(ratio, 10)} (Badin-Barry: 0.751484; "
    f"residual {mpm.nstr(res, 2)})")
open(OUT, 'w').write('\n'.join(out) + '\n')
if fails:
    raise SystemExit(f'FAILED: checks {fails}')
