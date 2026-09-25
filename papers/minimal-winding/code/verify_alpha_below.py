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
"""Checks of Remark 4 of the manuscript (paper/minimal-winding.tex): Theorem 2 for -2 < alpha <= -1.

Claim. For every -2 < alpha <= -1 (0 < beta <= 1/2, beta = 1 + alpha/2), every self-similar collapse of three
point vortices under dz_j/dt = (i/2pi) sum_k G_k (z_j - z_k)|z_j - z_k|^(-2 beta) has P > B = sqrt(1+2beta)/(2beta).
With the proof of Theorem 2 for alpha > -1, the bound holds for every alpha > -2.

Proof (notation of the paper's proof of Theorem 2: r2 = rho < r3 = 1 < r1, r1^2 = 1 + rho m, X = rho^(2beta),
Y = (1 + rho m)^beta, b = (beta/2) ln(1 + rho m), w = 2 sin psi = sqrt(4 - (m - rho)^2), P = S/(2 rho w)).
Let q = 1 + 6beta - beta m^2 - rho m + rho^2 m^2/12, the second bracket of the paper's identity (eq:id).
  Case A, q > 0: the right side of (eq:id) is > 0, so the paper's steps (i)-(iii) give P > B unchanged.
  Case B, q <= 0: then rho m >= 6 - 2 sqrt 6 (if m^2 <= 6, t = rho m has t - t^2/12 >= 1 + beta(6 - m^2) >= 1,
    so t >= 6 - 2 sqrt 6; if m^2 > 6, t > (m - 2) m > 6 - 2 sqrt 6 because m < 2 + rho).
    Step (i) without discarding a factor: S - rho m (1+X)/(1-X) - rho^2 coth b = 2X(Y-1)/((1-X)(Y-X)) >= 0,
    and (1+X)/(1-X) = coth(beta ln(1/rho)) > 1/(beta ln(1/rho)). So beta S/rho > m/ln(1/rho)
    = (rho m)/(rho ln(1/rho)) >= (6 - 2 sqrt 6) e, since rho ln(1/rho) <= 1/e. As w <= 2,
    P = S/(2 rho w) > (3 - sqrt 6) e/(2 beta) >= sqrt(1+2beta)/(2beta) = B whenever 1 + 2beta <= (15 - 6 sqrt 6) e^2,
    i.e. beta <= 0.6196..., which contains (0, 1/2].
Sharpness for every alpha > -2 is in the proof of Theorem 2: exactly
S - rho m - rho^2 coth b = 2X((1 + rho m) Y - 1 - rho m X)/((1-X)(Y-X)), which is O(X rho) for every beta > 0.

This program checks every step: [1] exact algebra (SymPy), with the identity of the sharpness argument;
[2] the constants, rigorously (Arb ball arithmetic); [3] an independent interval-arithmetic subdivision (Arb) of
case B over beta in [0, 1/2], rho in [0, 1], m in [0, 3]; [4] direct Biot-Savart at high precision (mpmath):
self-similarity, P against |S|/(8A), P > B, and each case's lower bound, on random triangles with alpha in (-2, -1);
[5] near-extremal collapses, P - B -> 0+ (sharpness); [6] negative controls that must fail and do.
Needs sympy, mpmath and python-flint (code/requirements.txt). Run from any folder: python3 code/verify_alpha_below.py
Prints every check and writes them to data/verify-alpha-below-2026-09-25.txt; exits with an error if any fails.
Runs in about 15 s."""
import os
import random
import sys
import time

import mpmath as mm
import sympy as sp
from flint import arb, ctx

T0 = time.time()
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "verify-alpha-below-2026-09-25.txt")
out, fails = [], []


def say(s):
    print(s, flush=True)
    out.append(s)


def check(ok, tag):
    if not ok:
        fails.append(tag)


# ---------------------------------------------------------------------------------------------------------------
# [1] Exact algebra.
be, rho, m, X, Y, cb, t, x = sp.symbols('beta rho m X Y c_b t x', positive=True)
Lam = be * m + 2 / m + rho - rho ** 2 * m / 6
q = 1 + 6 * be - be * m ** 2 - rho * m + rho ** 2 * m ** 2 / 12
d_id = sp.expand(Lam ** 2 - (1 + 2 * be) * (4 - (m - rho) ** 2) - (((1 + be) * m - 2 / m - rho) ** 2 + rho ** 2 / 3 * q))
S = (1 + rho * m) * (1 + X) / (1 - X) + rho ** 2 * cb - (Y + X) / (Y - X)             # cb stands for coth b
d_step1 = sp.simplify(S - rho * m * (1 + X) / (1 - X) - rho ** 2 * cb - 2 * X * (Y - 1) / ((1 - X) * (Y - X)))
u = sp.symbols('u', positive=True)                                                     # u = beta ln(1/rho), X = e^(-2u)
d_coth = sp.simplify(((1 + sp.exp(-2 * u)) / (1 - sp.exp(-2 * u))).rewrite(sp.exp) - sp.coth(u).rewrite(sp.exp))
g = 12 * x / (12 + 6 * x - x ** 2) - sp.log(1 + x)
d_log = sp.simplify(sp.diff(g, x) - x ** 3 * (24 - x) / ((12 + 6 * x - x ** 2) ** 2 * (1 + x)))
d_step2 = sp.simplify(sp.expand((2 * rho ** 2 / be) * (1 / (rho * m) + sp.Rational(1, 2) - rho * m / 12) - (rho / be) * (2 / m + rho - rho ** 2 * m / 6)))
roots = sp.solve(t ** 2 - 12 * t + 12, t)
c0 = 6 - 2 * sp.sqrt(6)
d_c0 = sp.simplify((sp.sqrt(6) - 2) * sp.sqrt(6) - c0)
# q <= 0 with m^2 <= 6 means t - t^2/12 >= 1 + beta (6 - m^2) >= 1 with t = rho m, i.e. t^2 - 12 t + 12 <= 0.
d_q = sp.expand(q - (1 + be * (6 - m ** 2) - (rho * m) + (rho * m) ** 2 / 12))
# rho ln(1/rho) <= 1/e on (0, 1): derivative ln(1/rho) - 1 vanishes only at 1/e, a maximum (second derivative -1/rho).
h = rho * sp.log(1 / rho)
d_h = (sp.simplify(sp.diff(h, rho).subs(rho, sp.exp(-1))), sp.simplify(h.subs(rho, sp.exp(-1)) - sp.exp(-1)),
       sp.simplify(sp.diff(h, rho, 2)))
beta_max = ((15 - 6 * sp.sqrt(6)) * sp.E ** 2 - 1) / 2
# Sharpness for every beta > 0 (proof of Theorem 2): S - rho m - rho^2 coth b = 2X((1 + rho m)Y - 1 - rho m X)/((1-X)(Y-X)),
# where (1 + rho m)Y - 1 = (1 + beta) m rho + O(rho^2) and rho^2 coth b = 2 rho/(beta m) + rho^2/beta + O(rho^3).
d_sharp = sp.simplify(S - rho * m - rho ** 2 * cb - 2 * X * ((1 + rho * m) * Y - 1 - rho * m * X) / ((1 - X) * (Y - X)))
d_num = sp.simplify(sp.series((1 + rho * m) ** (1 + be) - 1, rho, 0, 2).removeO() - (1 + be) * m * rho)
d_cb = sp.simplify(sp.series(rho ** 2 * sp.coth(be / 2 * sp.log(1 + rho * m)), rho, 0, 3).removeO() - (2 * rho / (be * m) + rho ** 2 / be))
say(f"[1] identity (eq:id) residual {d_id}; step (i) keeping the factor: S - rho m (1+X)/(1-X) - rho^2 coth b "
    f"- 2X(Y-1)/((1-X)(Y-X)) = {d_step1}; (1+X)/(1-X) - coth(beta ln 1/rho) = {d_coth}; log-inequality g' residual "
    f"{d_log}; step (ii) residual {d_step2}; roots of t^2 - 12t + 12: {roots}; (sqrt6-2)sqrt6 - (6-2sqrt6) = {d_c0}; "
    f"q - (1 + beta(6-m^2) - t + t^2/12) = {d_q}; rho ln(1/rho): h'(1/e) = {d_h[0]}, h(1/e) - 1/e = {d_h[1]}, "
    f"h'' = {d_h[2]}; case-B range beta <= ((15-6sqrt6)e^2 - 1)/2 = {sp.N(beta_max, 12)}")
say(f"[1] sharpness for every beta > 0: S - rho m - rho^2 coth b - 2X((1+rho m)Y - 1 - rho m X)/((1-X)(Y-X)) = {d_sharp}; "
    f"(1+rho m)^(1+beta) - 1 - (1+beta) m rho = O(rho^2): residual of the first-order term {d_num}; "
    f"rho^2 coth b - 2rho/(beta m) - rho^2/beta = O(rho^3): residual {d_cb}")
check(d_id == 0 and d_step1 == 0 and d_coth == 0 and d_log == 0 and d_step2 == 0 and d_c0 == 0 and d_q == 0
      and set(roots) == {6 - 2 * sp.sqrt(6), 6 + 2 * sp.sqrt(6)} and d_h[0] == 0 and d_h[1] == 0
      and d_sharp == 0 and d_num == 0 and d_cb == 0, 1)

# ---------------------------------------------------------------------------------------------------------------
# [2] The constants, in ball arithmetic (every comparison below is certain, not rounded).
ctx.prec = 200
e = arb.const_e()
C = (6 - 2 * arb(6).sqrt()) * e                                    # the case-B lower bound of m / ln(1/rho)
need = 2 * arb(2).sqrt()                                           # 2 sqrt(1 + 2 beta) at beta = 1/2
bmax = ((15 - 6 * arb(6).sqrt()) * e ** 2 - 1) / 2
ok2 = bool(C > need) and bool(bmax > arb(1) / 2)
say(f"[2] (6 - 2sqrt6) e = {C.str(15)} > 2 sqrt2 = {need.str(15)}: {bool(C > need)}; so case B gives P > B for "
    f"beta <= {bmax.str(12)}, which exceeds 1/2: {bool(bmax > arb(1) / 2)}")
check(ok2, 2)

# ---------------------------------------------------------------------------------------------------------------
# [3] Independent interval subdivision of case B. On every box of [0, 1/2] x [0, 1] x [0, 3] in (beta, rho, m) that
#     meets the domain 0 < rho < 1, 0 < m < 2 + rho, show q > 0 (case A) or m/ln(1/rho) > 2 sqrt(1 + 2 beta), which
#     with beta S/rho > m/ln(1/rho) and w <= 2 gives P > B. This re-proves case B without the algebra of [1].
ctx.prec = 80


def iv(a, b):
    return arb(a).union(arb(b))


def subdivide(BLO, BHI, thresh_scale=1, maxboxes=400000):
    stack = [(BLO, BHI, 0.0, 1.0, 0.0, 3.0)]
    n = nA = nB = 0
    while stack:
        b0, b1, r0, r1, m0, m1 = stack.pop()
        n += 1
        if n > maxboxes:
            return n, nA, nB, False
        if m0 >= 2 + r1:                                            # box outside the domain m < 2 + rho
            continue
        Bt, R, M = iv(b0, b1), iv(r0, r1), iv(m0, m1)
        qv = 1 + 6 * Bt - Bt * M ** 2 - R * M + R ** 2 * M ** 2 / 12
        if qv > 0:
            nA += 1
            continue
        if r0 > 0 and m0 > 0:
            lb = arb(m0) / (1 / arb(r0)).log()                     # m/ln(1/rho) increases in m and in rho
            if lb > thresh_scale * 2 * (1 + 2 * arb(b1)).sqrt():
                nB += 1
                continue
        w = [b1 - b0, (r1 - r0), (m1 - m0) / 3]                     # split the widest (m scaled to [0, 1])
        k = w.index(max(w))
        if max(w) < 2 ** -40:
            return n, nA, nB, False
        if k == 0:
            h = (b0 + b1) / 2; stack += [(b0, h, r0, r1, m0, m1), (h, b1, r0, r1, m0, m1)]
        elif k == 1:
            h = (r0 + r1) / 2; stack += [(b0, b1, r0, h, m0, m1), (b0, b1, h, r1, m0, m1)]
        else:
            h = (m0 + m1) / 2; stack += [(b0, b1, r0, r1, m0, h), (b0, b1, r0, r1, h, m1)]
    return n, nA, nB, True


n3, nA3, nB3, ok3 = subdivide(0.0, 0.5)
say(f"[3] Arb subdivision of beta in [0, 1/2], rho in [0, 1], m in [0, 3]: {n3} boxes, {nA3} with q > 0 (case A), "
    f"{nB3} with m/ln(1/rho) > 2 sqrt(1+2beta) (case B); {'all resolved' if ok3 else 'FAILED'}")
check(ok3, 3)

# ---------------------------------------------------------------------------------------------------------------
# [4] Direct Biot-Savart, independent of the formulas: random triangles, alpha in (-2, -1).


def velocities(G, z, al):
    return [1j / (2 * mm.pi) * sum(G[k] * (z[j] - z[k]) * abs(z[j] - z[k]) ** (-al - 2) for k in range(3) if k != j)
            for j in range(3)]


def kappa_spread(G, z, al):
    zc = sum(a * b for a, b in zip(G, z)) / sum(G)
    v = velocities(G, z, al)
    ks = [v[j] / (z[j] - zc) for j in range(3)]
    return ks[0], max(abs(k - ks[0]) for k in ks) / abs(ks[0])


def sides(z):
    return [abs(z[1] - z[2]), abs(z[2] - z[0]), abs(z[0] - z[1])]


def circulations(z, b):
    r = sides(z)
    f = [s ** (-2 * b) for s in r]
    return [r[i] ** 2 / (f[(i + 1) % 3] - f[(i + 2) % 3]) for i in range(3)]


def S_formula(z, b):
    r = sides(z)
    return sum(r[i] ** 2 * mm.coth(b * mm.log(r[(i + 2) % 3] / r[(i + 1) % 3])) for i in range(3))


def area(z):
    return abs(((z[1] - z[0]).conjugate() * (z[2] - z[0])).imag) / 2


def collapse(z, al):
    """Lemma 5 circulations; mirror the triangle if it expands. Returns z, G, kappa, spread, P."""
    b = 1 + al / 2
    G = circulations(z, b); k, sp_ = kappa_spread(G, z, al)
    if k.real > 0:
        z = [c.conjugate() for c in z]; G = circulations(z, b); k, sp_ = kappa_spread(G, z, al)
    return z, G, k, sp_, abs(k.imag) / (-2 * k.real)


def reduced(z):
    """Scale and order the sides as rho < 1 < r1, return (rho, m)."""
    r = sorted(sides(z))
    rho_, r1 = r[0] / r[1], r[2] / r[1]
    return rho_, (r1 ** 2 - 1) / rho_


def lower_bounds(rho_, m_, b):
    w = mm.sqrt(4 - (m_ - rho_) ** 2)
    qv = 1 + 6 * b - b * m_ ** 2 - rho_ * m_ + rho_ ** 2 * m_ ** 2 / 12
    L = b * m_ + 2 / m_ + rho_ - rho_ ** 2 * m_ / 6
    return qv > 0, L / (2 * b * w), m_ / (2 * b * w * mm.log(1 / rho_))


random.seed(20260925)
N = 1500; n = nA = nB = 0; worst_ss = worst_S = mm.mpf(0); worst_rel = mm.inf; bad = 0
for trial in range(N):
    al_f = -2 + random.uniform(1e-3, 1.0)                            # alpha in (-2, -1)
    mode = random.random()
    if mode < 0.35:                                                   # random vertices
        mm.mp.dps = 50
        al = mm.mpf(al_f)
        z = [mm.mpc(0), mm.mpc(1), mm.mpc(random.uniform(-1, 2), random.uniform(0.02, 1.5))]
    else:                                                             # (rho, m) with rho log-uniform down to 1e-300
        lr = -random.uniform(0, 300) if mode < 0.7 else -random.uniform(0, 1)
        mm.mp.dps = int(50 + 3 * abs(lr))
        al = mm.mpf(al_f)
        r_ = mm.mpf(10) ** mm.mpf(lr)
        m_ = mm.mpf(random.random()) * (2 + r_)
        cp = (r_ - m_) / 2
        if not (abs(cp) < 1 and m_ > 0 and r_ < 1):
            continue
        z = [mm.mpc(0), mm.mpc(1), r_ * mm.expj(mm.acos(cp))]
        # shuffle the labels and apply a random similarity, so the reduction to (rho, m) is exercised
        random.shuffle(z)
        a0 = mm.mpc(random.uniform(-3, 3), random.uniform(-3, 3)); s0 = mm.mpf(random.uniform(0.1, 10)) * mm.expj(random.uniform(0, 6.3))
        z = [a0 + s0 * c for c in z]
    r = sorted(sides(z))
    if (r[1] - r[0]) / r[1] < mm.mpf(10) ** (-mm.mp.dps // 3) or (r[2] - r[1]) / r[1] < mm.mpf(10) ** (-mm.mp.dps // 3):
        continue
    b = 1 + al / 2; B = mm.sqrt(1 + 2 * b) / (2 * b)
    z, G, k, spread, P = collapse(z, al)
    PS = abs(S_formula(z, b)) / (8 * area(z))
    rho_, m_ = reduced(z)
    inA, lbA, lbB = lower_bounds(rho_, m_, b)
    lb = lbA if inA else lbB
    ok = k.real < 0 and spread < mm.mpf(10) ** -30 and abs(P - PS) / P < mm.mpf(10) ** -30 and P > lb > B
    bad += not ok; n += 1; nA += inA; nB += (not inA)
    worst_ss = max(worst_ss, spread); worst_S = max(worst_S, abs(P - PS) / P); worst_rel = min(worst_rel, (P - B) / B)
say(f"[4] Biot-Savart on {n} random collapsing triangles with alpha in (-2, -1), rho down to 1e-300 "
    f"({nA} in case A, {nB} in case B): kappa spread <= {mm.nstr(worst_ss, 2)}, |P - |S|/(8A)|/P <= {mm.nstr(worst_S, 2)}, "
    f"P > (case lower bound) > B violated {bad} times; smallest (P - B)/B = {mm.nstr(worst_rel, 3)}")
check(bad == 0 and n > 1000 and nB > 20, 4)

# case B region densely: the true margin there is large, so case B is far from tight
mm.mp.dps = 40; worstB = mm.inf; nb = 0
for al_f in [-1.4751, -1.6, -1.8, -1.95, -1.999]:
    al = mm.mpf(al_f); b = 1 + al / 2; B = mm.sqrt(1 + 2 * b) / (2 * b)
    for i in range(1, 60):
        for j in range(1, 60):
            r_ = mm.mpf(i) / 60; m_ = (2 + r_) * mm.mpf(j) / 60
            if 1 + 6 * b - b * m_ ** 2 - r_ * m_ + r_ ** 2 * m_ ** 2 / 12 > 0:
                continue
            z = [mm.mpc(0), mm.mpc(1), r_ * mm.expj(mm.acos((r_ - m_) / 2))]
            z, G, k, spread, P = collapse(z, al); nb += 1
            worstB = min(worstB, P / B)
say(f"[4] case-B grid, {nb} Biot-Savart collapses at alpha in {{-1.4751, -1.6, -1.8, -1.95, -1.999}}: smallest P/B = {mm.nstr(worstB, 6)}")
check(worstB > 1, 4)

# ---------------------------------------------------------------------------------------------------------------
# [5] Sharpness: rho -> 0 at m = m* = sqrt(2/(1 + beta)); P - B -> 0+ (slowly, like rho^(2 beta), for small beta).
for al_f, lrs in [(-1.5, [-10, -40, -160]), (-1.8, [-40, -160, -640]), (-1.99, [-300, -1200, -4800])]:
    vals = []
    for lr in lrs:
        mm.mp.dps = int(60 + 1.2 * abs(lr))
        al = mm.mpf(al_f); b = 1 + al / 2; B = mm.sqrt(1 + 2 * b) / (2 * b)
        r_ = mm.mpf(10) ** lr; m_ = mm.sqrt(2 / (1 + b))
        z = [mm.mpc(0), mm.mpc(1), r_ * mm.expj(mm.acos((r_ - m_) / 2))]
        z, G, k, spread, P = collapse(z, al)
        vals.append((lr, P - B, spread))
    ok5 = all(v[1] > 0 and v[2] < mm.mpf(10) ** -30 for v in vals) and vals[0][1] > vals[1][1] > vals[2][1] and vals[-1][1] < 1e-3 * B
    say(f"[5] alpha = {al_f}: " + "; ".join(f"rho = 1e{lr}: P - B = {mm.nstr(d, 4)} (spread {mm.nstr(s, 1)})" for lr, d, s in vals))
    check(ok5, 5)

# ---------------------------------------------------------------------------------------------------------------
# [6] Negative controls (each must FAIL, i.e. the statement tested is false).
mm.mp.dps = 40
neg = []
# (a) Steps (i)-(iii) alone are not enough for small beta: at alpha = -1.7, rho = 0.99, m = 1.87, q <= 0 and
#     Lambda < sqrt(1+2beta) w, though the true P is far above B (case B covers it).
al = mm.mpf(-1.7); b = 1 + al / 2; r_ = mm.mpf('0.99'); m_ = mm.mpf('1.87'); B = mm.sqrt(1 + 2 * b) / (2 * b)
w = mm.sqrt(4 - (m_ - r_) ** 2); L = b * m_ + 2 / m_ + r_ - r_ ** 2 * m_ / 6
z, G, k, spread, P = collapse([mm.mpc(0), mm.mpc(1), r_ * mm.expj(mm.acos((r_ - m_) / 2))], al)
neg.append(("chain alone at alpha=-1.7, rho=0.99, m=1.87: Lambda > sqrt(1+2beta) w", L > mm.sqrt(1 + 2 * b) * w,
            f"Lambda - sqrt(1+2beta)w = {mm.nstr(L - mm.sqrt(1 + 2 * b) * w, 4)}, true P/B = {mm.nstr(P / B, 5)}"))
# (b) Case B's bound alone fails near the extremal limit (so case A is needed): rho = 1e-6, m = m*.
r_ = mm.mpf('1e-6'); m_ = mm.sqrt(2 / (1 + b)); w = mm.sqrt(4 - (m_ - r_) ** 2)
neg.append(("case-B bound at rho=1e-6, m=m*: m/ln(1/rho) > sqrt(1+2beta) w", m_ / mm.log(1 / r_) > mm.sqrt(1 + 2 * b) * w,
            f"{mm.nstr(m_ / mm.log(1 / r_), 4)} vs {mm.nstr(mm.sqrt(1 + 2 * b) * w, 4)}"))
# (c) The case-B constant does not reach beta = 0.7 (alpha = -0.6), where the paper's proof applies instead.
ctx.prec = 200
neg.append(("(3 - sqrt6) e > sqrt(1 + 2*0.7)", bool((3 - arb(6).sqrt()) * arb.const_e() > (1 + 2 * arb('0.7')).sqrt()),
            f"{((3 - arb(6).sqrt()) * arb.const_e()).str(8)} vs {((1 + 2 * arb('0.7')).sqrt()).str(8)}"))
# (d) The subdivision of [3] with the threshold raised by 10% (to 1.1 * 2 sqrt(1+2beta) > (6-2sqrt6)e near
#     beta = 1/2) must not resolve: the interval routine can fail.
ctx.prec = 80
nd, _, _, okd = subdivide(0.4, 0.5, thresh_scale=1.1, maxboxes=20000)
neg.append(("subdivision with threshold x1.1 resolves", okd, f"{nd} boxes, unresolved"))
# (e) Wrong circulations are not self-similar: perturb Lemma 5's G1 by 1e-6.
al = mm.mpf(-1.8); z = [mm.mpc(0), mm.mpc(1), mm.mpc('0.3', '0.5')]
z, G, k, spread, P = collapse(z, al); G2 = [G[0] * (1 + mm.mpf('1e-6')), G[1], G[2]]
k2, spread2 = kappa_spread(G2, z, al)
neg.append(("perturbed circulations self-similar (spread < 1e-30)", spread2 < mm.mpf(10) ** -30, f"spread {mm.nstr(spread2, 3)}"))
# (f) The bound cannot be raised: B + 1e-3 is beaten by a near-extremal collapse at alpha = -1.5.
mm.mp.dps = 100; al = mm.mpf(-1.5); b = 1 + al / 2; B = mm.sqrt(1 + 2 * b) / (2 * b); r_ = mm.mpf('1e-40'); m_ = mm.sqrt(2 / (1 + b))
z, G, k, spread, P = collapse([mm.mpc(0), mm.mpc(1), r_ * mm.expj(mm.acos((r_ - m_) / 2))], al)
neg.append(("P > B + 1e-3 at alpha=-1.5, rho=1e-40, m=m*", P > B + mm.mpf('1e-3'), f"P - B = {mm.nstr(P - B, 4)}"))
for name, val, info in neg:
    say(f"[6] negative control, must be False: {name}: {bool(val)} ({info})")
    check(not val, 6)

say(f"RESULT: {'PASS' if not fails else 'FAIL ' + str(sorted(set(fails)))}: Theorem 2 (P > sqrt(3+alpha)/(2+alpha), sharp) "
    f"holds for -2 < alpha <= -1, hence with the paper for every alpha > -2. Runtime {time.time() - T0:.0f} s "
    f"(Python {sys.version.split()[0]}, SymPy {sp.__version__}, mpmath {mm.__version__}, python-flint).")
open(OUT, "w").write("\n".join(out) + "\n")
if fails:
    raise SystemExit(f"FAILED checks: {sorted(set(fails))}")
