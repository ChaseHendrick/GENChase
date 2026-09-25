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
"""Figure 3 of the manuscript, paper/minimal-winding.tex.

(a) The bound B(alpha) = sqrt(3 + alpha)/(2 + alpha) of Theorem 2 with P = |S|/(8 Area) (Lemma 6) of random
    collapsing triangles, which lie above it. (b) The paths of the three vortices of one SQG collapse (alpha = 1),
    integrated from the alpha-model law (Section 2) with the circulations of Lemma 5.
Writes ../paper/figures/alpha-winding.svg (Typst) and alpha-winding.pdf (LaTeX). Seeded; runs in a few seconds.
"""
import math, os, random
import numpy as np
from scipy.integrate import solve_ivp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def P_of(r, beta):
    """Lemma 6: P = |S|/(8A), r = (r1, r2, r3) side lengths opposite the vertices."""
    S = sum(r[i] ** 2 / math.tanh(beta * math.log(r[(i + 2) % 3] / r[(i + 1) % 3])) for i in range(3))
    s = sum(r) / 2
    A = math.sqrt(max(s * (s - r[0]) * (s - r[1]) * (s - r[2]), 0.0))
    return abs(S) / (8 * A)


random.seed(7)
cloud_a, cloud_p, cloud_true = [], [], []
for alpha in np.linspace(0, 3, 61):
    beta = 1 + alpha / 2
    for _ in range(400):                          # sides rho < 1 < sqrt(1 + rho m), as in the proof; rho log-uniform
        rho = 10 ** random.uniform(-3, 0); m = random.uniform(0, 2 + rho)
        r = [math.sqrt(1 + rho * m), rho, 1.0]
        if min(abs(r[0] - r[1]), abs(r[1] - r[2]), abs(r[0] - r[2])) < 1e-6 or abs((rho - m) / 2) >= 1:
            continue
        cloud_a.append(alpha + random.uniform(-0.02, 0.02)); cloud_true.append(alpha); cloud_p.append(P_of(r, beta))
al = np.linspace(-0.85, 3, 400); B = np.sqrt(3 + al) / (2 + al)

# (b) one SQG collapse: sides rho, 1, sqrt(1 + rho m) with m = m*, circulations from Lemma 5
alpha, beta = 1.0, 1.5
rho = 0.45; m = math.sqrt(2 / (1 + beta)); psi = math.acos((rho - m) / 2)
z = np.array([0, 1, rho * np.exp(1j * psi)])
r = [abs(z[1] - z[2]), abs(z[2] - z[0]), abs(z[0] - z[1])]; f = [x ** (-2 * beta) for x in r]
G = np.array([r[i] ** 2 / (f[(i + 1) % 3] - f[(i + 2) % 3]) for i in range(3)])


def rhs(t, y):
    Z = y[:3] + 1j * y[3:]
    V = [1j / (2 * math.pi) * sum(G[k] * (Z[j] - Z[k]) * abs(Z[j] - Z[k]) ** (-2 * beta) for k in range(3) if k != j) for j in range(3)]
    return np.concatenate([np.real(V), np.imag(V)])


zc = (G @ z) / G.sum()
k0 = (rhs(0, np.concatenate([z.real, z.imag]))[0] + 1j * rhs(0, np.concatenate([z.real, z.imag]))[3]) / (z[0] - zc)
if k0.real > 0:                                   # take the collapsing orientation (Lemma 5)
    z = np.conj(z); zc = (G @ z) / G.sum()
    y0 = np.concatenate([z.real, z.imag]); k0 = (rhs(0, y0)[0] + 1j * rhs(0, y0)[3]) / (z[0] - zc)
tc = -1 / (2 * beta * k0.real); Pb = abs(k0.imag) / (2 * abs(k0.real))
sol = solve_ivp(rhs, [0, tc * (1 - 1e-6)], np.concatenate([z.real, z.imag]), method='DOP853', rtol=1e-11, atol=1e-13, dense_output=True)
ts = tc * (1 - np.geomspace(1, 1e-6, 3000))
Y = sol.sol(ts); Z = (Y[:3] + 1j * Y[3:]) - zc
scale = np.max(np.abs(Z[:, 0]))

plt.rcParams.update({'font.family': 'serif', 'font.serif': ['cmr10'], 'mathtext.fontset': 'cm',
                     'axes.formatter.use_mathtext': True, 'font.size': 10, 'svg.fonttype': 'path'})
fig, (ax, bx) = plt.subplots(1, 2, figsize=(6.4, 3.0), gridspec_kw={'width_ratios': [1.25, 1]})
ax.scatter(cloud_a, cloud_p, s=1.2, color='0.72', lw=0, rasterized=False)
ax.plot(al, B, color='black', lw=1.5)
ax.plot([0, 1], [math.sqrt(3) / 2, 2 / 3], 'o', color='black', ms=3)
ax.text(0.06, math.sqrt(3) / 2 - 0.2, r'$\sqrt{3}/2$', fontsize=9)
ax.text(1.03, 2 / 3 - 0.2, r'$2/3$ (SQG)', fontsize=9)
ax.set_xlim(-0.9, 3); ax.set_ylim(0, 3.2)
ax.set_xlabel(r'$\alpha$'); ax.set_ylabel(r'$P$')
ax.set_title(r'(a) $P > \sqrt{3+\alpha}\,/\,(2+\alpha)$', fontsize=10)
for j, (ls, c) in enumerate([('-', 'black'), ('-', '0.45'), ('--', 'black')]):
    bx.plot(Z[j].real / scale, Z[j].imag / scale, ls=ls, color=c, lw=1.0)
    bx.plot(Z[j, 0].real / scale, Z[j, 0].imag / scale, 'o', color=c, ms=3.5)
bx.plot(0, 0, '+', color='black', ms=7)
bx.set_aspect('equal'); bx.set_xticks([]); bx.set_yticks([])
bx.set_title(r'(b) SQG collapse, $P = %.3f$' % Pb, fontsize=10)
fig.tight_layout()
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paper', 'figures', 'alpha-winding.svg')
fig.savefig(out, metadata={'Date': None})
fig.savefig(out[:-4] + '.pdf', metadata={'CreationDate': None, 'ModDate': None})
below = sum(p < math.sqrt(3 + a) / (2 + a) for a, p in zip(cloud_true, cloud_p))
print('wrote', out, 'and .pdf;', len(cloud_p), 'sampled triangles,', below, 'below the bound; panel (b) P =', Pb, ', t_c =', tc)
