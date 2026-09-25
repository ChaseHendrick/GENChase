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
"""Remark 5 of the manuscript (paper/minimal-winding.tex): two equal circulations (1, -gamma, 1) in the alpha-models.
Run from any folder: python3 code/verify_alpha_equal_circulations.py

Law: dz_j/dt = (i/2pi) sum_k G_k (z_j - z_k)|z_j - z_k|^(-alpha-2); P = |Im kappa|/(2|Re kappa|).
Sides: r2 = 1 joins the two equal vortices, r1 and r3 are the other two. By Lemma 5 the self-similar family
satisfies r1^(-alpha) + r3^(-alpha) = r1^2 + r3^2.

  1. alpha = 2: the family is r1 r3 = r2^2 = 1, gamma = r2^2/(r1^2 + r3^2), and P^2 is the rational function of
     gamma in Remark 5 (exact, SymPy); its minimum and the minimal polynomial of the minimum; at gamma = 1/3 the
     triangle is collinear with sides phi, 1, 1/phi.
  2. alpha = 2: P from the Biot-Savart velocities against the formula at five values of gamma, 40 digits.
  3. SQG (alpha = 1): the lower end of the collapse interval of Badin and Barry is the root in (0, 1/2) of
     4 gamma^4 - 8 gamma^3 + gamma^2 - 2 gamma + 1, where the triangle is collinear (exact, SymPy).
The program exits with an error if any check fails; its output is data/verify_alpha_equal_circulations.txt."""
import os
import sympy as sp
import mpmath as mm

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "verify_alpha_equal_circulations.txt")
mm.mp.dps = 40
out, fails = [], []
def say(s): print(s); out.append(s)

# 1. alpha = 2: the family is r1 r3 = 1; with w = r1^2 + r3^2 = 1/gamma, P^2 is rational in w (and in gamma).
u, w, g, y = sp.symbols('u w gamma y', positive=True)
U = [u, sp.Integer(1), 1 / u]                                   # squared sides r1^2, r2^2, r3^2 with r1 r3 = 1
S = sum(U[i] * (U[(i + 2) % 3] ** 2 + U[(i + 1) % 3] ** 2) / (U[(i + 2) % 3] ** 2 - U[(i + 1) % 3] ** 2) for i in range(3))
A2 = (2 * (U[0] * U[1] + U[1] * U[2] + U[2] * U[0]) - (U[0] ** 2 + U[1] ** 2 + U[2] ** 2)) / 16   # squared area (Heron)
P2w = (w + 1) * (w ** 2 - 2 * w + 2) ** 2 / (4 * w ** 2 * (w ** 2 - 4) * (3 - w))
P2g = (1 + g) * (2 * g ** 2 - 2 * g + 1) ** 2 / (4 * (1 - 2 * g) * (1 + 2 * g) * (3 * g - 1))
f = [x ** -2 for x in U]; G = [U[i] / (f[(i + 1) % 3] - f[(i + 2) % 3]) for i in range(3)]
e1 = sp.simplify(S ** 2 / (64 * A2) - P2w.subs(w, u + 1 / u))
e2 = sp.simplify(-G[1] / G[0] - 1 / (u + 1 / u))
e3 = sp.simplify(P2w - P2g.subs(g, 1 / w))
e4 = sp.simplify(G[0] - G[2])                                   # the two circulations at the ends of r2 are equal
a, c = sp.symbols('a c', positive=True)                         # a = r1^2, c = r3^2: Lemma 5 with G1 = G3 at alpha = 2
e5 = sp.simplify((1 / a + 1 / c - a - c) - (a + c) * (1 - a * c) / (a * c))
say(f"[1] alpha = 2: P^2(u) - P^2(w = u + 1/u) = {e1}; -G2/G1 - 1/(u + 1/u) = {e2}; P^2(w) - P^2(gamma = 1/w) = {e3}; "
    f"G1 - G3 = {e4}; r1^-2 + r3^-2 - r1^2 - r3^2 - (r1^2 + r3^2)(1 - r1^2 r3^2)/(r1^2 r3^2) = {e5}, so the family is r1 r3 = 1")
if not (e1 == 0 and e2 == 0 and e3 == 0 and e4 == 0 and e5 == 0): fails.append(1)
d = sp.factor(sp.numer(sp.together(sp.diff(P2w, w))))
wr = [r for r in sp.Poly(4 * w ** 4 - 7 * w ** 3 - 8 * w ** 2 + 12, w).all_roots() if r.is_real and 2 < r < 3][0]
Pmin = sp.sqrt(P2w.subs(w, wr))
mp_min = sp.minimal_polynomial(Pmin, y)
say(f"[1] dP^2/dw numerator {d}; minimum at w = {sp.N(wr, 20)}, gamma = {sp.N(1 / wr, 20)}, P_min = {sp.N(Pmin, 30)}; "
    f"minimal polynomial of P_min: {mp_min}")
if not (sp.expand(mp_min - (27648 * y ** 8 - 29952 * y ** 6 - 3200 * y ** 4 - 1556 * y ** 2 - 125)) == 0
        and abs(sp.N(Pmin, 30) - sp.Float('1.1039451679', 30)) < 1e-10): fails.append(1)
# gamma = 1/3: w = 3, u = r1^2 = (3 + sqrt 5)/2 = phi^2, so r1 = phi, r3 = 1/phi and r1 = r2 + r3 (collinear).
phi = (1 + sp.sqrt(5)) / 2
uc = (3 + sp.sqrt(5)) / 2
col = [sp.simplify(uc - phi ** 2), sp.simplify(sp.sqrt(uc) - phi), sp.simplify(phi - 1 - 1 / phi), sp.simplify(uc + 1 / uc - 3)]
say(f"[1] gamma = 1/3: r1^2 = (3 + sqrt 5)/2 = phi^2 ({col[0]}), r1 - phi = {col[1]}, r1^2 + r3^2 - 1/gamma = {col[3]}, "
    f"r1 - r2 - r3 = phi - 1 - 1/phi = {col[2]}: collinear with sides phi, 1, 1/phi")
if any(c != 0 for c in col): fails.append(1)

# 2. Biot-Savart check of the alpha = 2 formula
def bs_P(G, z, al):
    zc = sum(a * b for a, b in zip(G, z)) / sum(G)
    v = [1j / (2 * mm.pi) * sum(G[k] * (z[j] - z[k]) * abs(z[j] - z[k]) ** (-al - 2) for k in range(3) if k != j) for j in range(3)]
    ks = [v[j] / (z[j] - zc) for j in range(3)]
    return abs(ks[0].imag) / (2 * abs(ks[0].real)), max(abs(k - ks[0]) for k in ks) / abs(ks[0])
worst = 0
for gv in ['0.34', '0.37', '0.40', '0.45', '0.49']:
    gv = mm.mpf(gv); wv = 1 / gv; uu = (wv + mm.sqrt(wv * wv - 4)) / 2; r1, r3 = mm.sqrt(uu), 1 / mm.sqrt(uu)
    x = (r3 ** 2 - r1 ** 2 + 1) / 2; z = [mm.mpc(0), mm.mpc(x, mm.sqrt(r3 ** 2 - x ** 2)), mm.mpc(1)]
    P, spread = bs_P([mm.mpf(1), -gv, mm.mpf(1)], z, 2)
    Pf = mm.sqrt((1 + gv) * (2 * gv ** 2 - 2 * gv + 1) ** 2 / (4 * (1 - 2 * gv) * (1 + 2 * gv) * (3 * gv - 1)))
    worst = max(worst, abs(P - Pf) / Pf, spread)
say(f"[2] alpha = 2, five values of gamma in (1/3, 1/2): Biot-Savart P equals the formula to {mm.nstr(worst, 3)} relative "
    f"(self-similarity spread included)")
if not worst < 1e-35: fails.append(2)

# 3. SQG (alpha = 1): the symmetric collapse interval (gamma*, 1/2) of Badin-Barry, with gamma* exact
x, gm = sp.symbols('x gm', positive=True)
q = sp.factor(sp.expand((1 / (1 + x) + 1 / x - ((1 + x) ** 2 + x ** 2)) * x * (1 + x)))
xr = [r for r in sp.Poly(-q, x).all_roots() if r.is_real and r > 0][0]
r = [1 + x, sp.Integer(1), x]; f = [t ** -3 for t in r]           # collinear: r1 = r2 + r3
G = [r[i] ** 2 / (f[(i + 1) % 3] - f[(i + 2) % 3]) for i in range(3)]
gstar = (-G[1] / G[0]).subs(x, xr)
mq = sp.minimal_polynomial(gstar, gm)
say(f"[3] SQG collinear endpoint: r1 = 1 + x, r3 = x with {q} = 0, x = {sp.N(xr, 20)}; gamma* = {sp.N(gstar, 30)}, "
    f"minimal polynomial {mq} (Badin-Barry, Chen-Liu: 0.387464)")
if not (sp.expand(mq - (4 * gm ** 4 - 8 * gm ** 3 + gm ** 2 - 2 * gm + 1)) == 0 and abs(sp.N(gstar, 20) - sp.Float('0.387464', 20)) < 1e-6):
    fails.append(3)
open(OUT, 'w').write('\n'.join(out) + '\n')
if fails:
    raise SystemExit(f'FAILED: checks {sorted(set(fails))}')
