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
"""Plot the two arc minima of P = |omega_0| t_c against the circulation ratio mu (Figure 1),
and two minimizing configurations with their spiral paths into the collision point (Figure 2).

Circulations (1, mu, -mu/(1+mu)); the squared minima are the two positive roots of
the cubic Q(mu, y) of Theorem 1 in the paper. Writes ../paper/figures/minimal-winding.svg
(for the Typst paper) and minimal-winding.pdf (for the LaTeX version), and likewise
minimal-winding-paths.svg and minimal-winding-paths.pdf.
"""
import math, os
import mpmath as mp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, FancyArrowPatch

mp.mp.dps = 30


def arc_minima(mu):
    mu = mp.mpf(mu)
    u = mu + 1 + 1 / mu
    coeffs = [1728 * (u + 1) ** 2,
              -144 * (u + 1) * (8 * u ** 3 - 9 * u - 9),
              -4 * (16 * u ** 6 - 288 * u ** 4 - 288 * u ** 3 - 81 * u ** 2 - 162 * u - 81),
              3 * (4 * u ** 3 - 3 * u - 3) ** 2]
    ys = sorted(mp.re(r) for r in mp.polyroots(coeffs, maxsteps=200, extraprec=60) if abs(mp.im(r)) < mp.mpf(10) ** -20)
    pos = [y for y in ys if y > 0]
    return float(mp.sqrt(pos[0])), float(mp.sqrt(pos[-1]))


mus = [0.004 * k for k in range(1, 250)] + [0.999]
lo, hi = zip(*(arc_minima(m) for m in mus))
mus.append(1.0); lo = list(lo) + [math.sqrt(2)]; hi = list(hi) + [math.sqrt(2)]

plt.rcParams.update({'font.family': 'serif', 'font.serif': ['cmr10'], 'mathtext.fontset': 'cm',
                     'axes.formatter.use_mathtext': True, 'font.size': 10, 'svg.fonttype': 'path'})
fig, ax = plt.subplots(figsize=(5.2, 3.1))
ax.plot(mus, hi, color='0.45', lw=1.3, label=r'minimum on $\mathcal{A}_+$')
ax.plot(mus, lo, color='black', lw=1.6, label=r'minimum on $\mathcal{A}_-$ (least $P$)')
ax.axhline(math.sqrt(3) / 2, color='black', lw=0.6, ls=(0, (4, 3)))
ax.axhline(math.sqrt(2), color='black', lw=0.6, ls=(0, (1, 2)))
ax.text(0.62, math.sqrt(3) / 2 - 0.17, r'$\sqrt{3}/2$', fontsize=10)
ax.text(0.03, math.sqrt(2) + 0.06, r'$\sqrt{2}$', fontsize=10)
ax.plot([0.5, 0.5], [lo[124], hi[124]], 'o', color='black', ms=3)
ax.set_xlim(0, 1.0); ax.set_ylim(0.6, 4.0)
ax.set_xlabel(r'circulation ratio $\mu$'); ax.set_ylabel(r'$P = |\omega_0|\, t_c$')
ax.legend(frameon=False, loc='upper right')
fig.tight_layout()
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paper', 'figures', 'minimal-winding.svg')
fig.savefig(out, metadata={'Date': None})
fig.savefig(out[:-4] + '.pdf', metadata={'CreationDate': None, 'ModDate': None})
print('wrote', out, 'and .pdf,', 'check mu=0.5:', lo[124], hi[124], 'at mu=', mus[124])


# ---------------------------------------------------------------------------------------------- Figure 2
def minimizer_lower_arc(mu):
    """The minimizing configuration on A_- (Theorem 1(a)): the root of G, Eq. (eq:K), in (-sqrt R, (mu - 1)/2),
    the positions of Eq. (eq:pos), and P from Eq. (eq:Ptheta), checked against the Biot-Savart velocities."""
    mu = mp.mpf(mu); R = 1 + mu + mu ** 2; sR = mp.sqrt(R)
    G = lambda C: (4 * (1 - mu) * C ** 3 + 4 * (2 * mu ** 2 - mu + 2) * C ** 2 + 2 * (1 - mu) ** 3 * C
                   - (2 * mu ** 4 + 7 * mu ** 3 + 6 * mu ** 2 + 7 * mu + 2))
    C = mp.findroot(G, (-sR + mp.mpf(10) ** -25, (mu - 1) / 2), solver='illinois')
    th = 2 * mp.pi - mp.acos(C / sR)                      # sin(theta) < 0: the arc A_-
    N = 2 * (1 + mu ** 2) * R + (1 - mu) * (2 + mu + 2 * mu ** 2) * C - 2 * mu * C ** 2
    M = 1 - mu + 2 * C
    P = N / (2 * mu * sR * M * mp.sin(th))
    e = mp.expj(-th)
    z = [mu * (1 + sR * e) / (1 + mu) ** 2, (mu - sR * e) / (1 + mu) ** 2, mp.mpc(1)]
    Gam = [mp.mpf(1), mu, -mu / (1 + mu)]
    # every quotient zdot_j/z_j equals kappa = (-1/2 + iP)/t_c, so z_j(t) = z_j(0)(1 - t/t_c)^(1/2 - iP)
    q = [mp.conj(sum(Gam[k] / (z[j] - z[k]) for k in range(3) if k != j) / (2j * mp.pi)) / z[j] for j in range(3)]
    assert max(abs(qq - q[0]) for qq in q) < mp.mpf(10) ** -25 and q[0].real < 0
    assert abs(q[0].imag / (-2 * q[0].real) - P) < mp.mpf(10) ** -25
    assert abs(float(P) - arc_minima(mu)[0]) < 1e-12        # P_-(mu)^2 is the smaller positive root of Q(mu, .)
    return float(P), [complex(zz) for zz in z]


def spiral(z0, P, shrink=100.0, m=1200):
    """z(t) = z0 (1 - t/t_c)^(1/2 - iP), from t = 0 until |z| = |z0|/shrink."""
    pts = []
    for i in range(m + 1):
        lam = shrink ** (-i / m)                          # lam = (1 - t/t_c)^(1/2)
        pts.append(z0 * lam * complex(math.cos(2 * P * math.log(1 / lam)), math.sin(2 * P * math.log(1 / lam))))
    return [w.real for w in pts], [w.imag for w in pts]


cases = [(0.5, r'(a) $\mu = 1/2$', [r'$\Gamma_1 = 1$', r'$\Gamma_2 = 1/2$', r'$\Gamma_3 = -1/3$'],
          [(0.02, 0.21, 'left'), (0.80, -0.33, 'left'), (1.05, -0.07, 'left')]),
         (0.05, r'(b) $\mu = 0.05$', [r'$\Gamma_1 = 1$', r'$\Gamma_2 = 0.05$', r'$\Gamma_3 = -1/21$'],
          [(0.0, -0.17, 'center'), (0.93, -0.15, 'left'), (1.05, 0.08, 'left')])]
styles = [dict(color='black', lw=0.9), dict(color='0.55', lw=0.9), dict(color='black', lw=0.9, ls=(0, (3.5, 2)))]
fig, axes = plt.subplots(1, 2, figsize=(6.4, 2.9))
for ax, (mu, title, labels, where) in zip(axes, cases):
    P, z = minimizer_lower_arc(mu)
    for zj, st in zip(z, styles):
        ax.plot(*spiral(zj, P), **st, zorder=2)
    tri = z + [z[0]]
    ax.plot([w.real for w in tri], [w.imag for w in tri], color='0.6', lw=0.6, zorder=1)
    for j, zj in enumerate(z):                            # filled: positive circulation; open: negative
        ax.plot(zj.real, zj.imag, 'o', ms=4.2, mec='black', mew=0.8, mfc='black' if j < 2 else 'white', zorder=4)
        ax.text(where[j][0], where[j][1], labels[j], fontsize=8.5, ha=where[j][2], va='center')
    ax.plot(0, 0, '+', color='black', ms=9, mew=0.7, zorder=5)      # the collision point
    ang = math.degrees(math.atan(2 * P)); L = math.sqrt(1 + 4 * P * P)
    ax.set_title(title + r',  $P = %.4f\ldots$' % P, fontsize=9.5)
    # vortex 3: the segment r0 to the collision point, its initial velocity, and the angle arctan 2P between them
    z3 = z[2]
    ax.plot([0, z3.real], [0, z3.imag], color='black', lw=0.6, ls=(0, (1, 1.5)), zorder=1)
    ax.text(0.55, -0.075, r'$r_0$', fontsize=9, ha='center', va='center')
    vdir = complex(-0.5, P) / abs(complex(-0.5, P))            # direction of (1/2 - iP)(-z3)
    ax.add_patch(FancyArrowPatch((z3.real, z3.imag), (z3.real + 0.36 * vdir.real, z3.imag + 0.36 * vdir.imag),
                                 arrowstyle='-|>', mutation_scale=7, lw=0.8, color='black', zorder=5))
    ax.add_patch(Arc((z3.real, z3.imag), 0.34, 0.34, theta1=180 - ang, theta2=180, lw=0.6, color='black'))
    ax.text(1.02, 0.30, r'$\arctan 2P$' + '\n' + r'$= %.1f^\circ > 60^\circ$' % ang, fontsize=8.5, ha='left', va='center',
            linespacing=1.4)
    ax.text(0.02, 0.58, r'path length $r_0\sqrt{1 + 4P^2} = %s\,r_0 > 2r_0$' % (('%.2f' if mu == 0.5 else '%.3f') % L),
            fontsize=8.5, ha='left', va='bottom')
    ax.set_aspect('equal'); ax.set_xlim(-0.62, 1.45); ax.set_ylim(-0.42, 0.78); ax.axis('off')
    print('Figure 2, mu = %s: P = %.13f, arctan 2P = %.2f degrees, path length %.4f r0' % (mu, P, ang, L))
fig.tight_layout(w_pad=0.5)
out2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paper', 'figures', 'minimal-winding-paths.svg')
fig.savefig(out2, metadata={'Date': None}, bbox_inches='tight', pad_inches=0.02)
fig.savefig(out2[:-4] + '.pdf', metadata={'CreationDate': None, 'ModDate': None}, bbox_inches='tight', pad_inches=0.02)
print('wrote', out2, 'and .pdf')
