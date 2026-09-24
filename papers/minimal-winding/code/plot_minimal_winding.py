#!/usr/bin/env python3
"""Plot the two arc minima of P = |omega_0| t_c against the circulation ratio mu.

Circulations (1, mu, -mu/(1+mu)); the squared minima are the two positive roots of
the cubic Q(mu, y) of Theorem 1 in the paper. Writes ../paper/figures/minimal-winding.svg
(for the Typst paper) and minimal-winding.pdf (for the LaTeX version).
"""
import math, os
import mpmath as mp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

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
