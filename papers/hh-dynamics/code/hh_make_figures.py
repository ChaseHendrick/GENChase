#!/usr/bin/env python3
"""The figures of the manuscript, from the committed reports and float64 integration (about 10 s).

    python3 code/hh_make_figures.py        writes paper/figures/branch.pdf, orbits.pdf and period.pdf

NOT a proof: the curves are float64 evaluations and integrations (hh_float.py, scipy DOP853); the proved numbers
drawn on them (the Hopf points, the certified periods) are read from data/certify_equilibria_hopf.txt and
data/certify_bistability.txt.  The orbits of Figure 2 start from the section points of the high-precision
refinement (stage 6 of certify_bistability.py, E_l = 10.613), which lie inside the Krawczyk boxes of Theorem 5.
"""
import os
import re
import sys

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hh_float as HF                                            # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..'))
FIG = os.path.join(ROOT, 'paper', 'figures')
HOPF = open(os.path.join(ROOT, 'data', 'certify_equilibria_hopf.txt')).read()
BIST = open(os.path.join(ROOT, 'data', 'certify_bistability.txt')).read()

# three categorical slots of the reference palette (validated all-pairs), ink for text and guides
BLUE, ORANGE, AQUA = '#2a78d6', '#eb6834', '#1baf7a'
INK, MUTED, GRID = '#0b0b0b', '#52514e', '#d9d8d4'
plt.rcParams.update({'font.size': 8.5, 'axes.linewidth': 0.6, 'axes.edgecolor': MUTED, 'axes.labelcolor': INK,
                     'xtick.color': MUTED, 'ytick.color': MUTED, 'xtick.major.width': 0.6,
                     'ytick.major.width': 0.6, 'legend.frameon': False, 'pdf.fonttype': 42,
                     'font.family': 'serif', 'mathtext.fontset': 'cm'})
NUM = r'-?[0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?'


def mid(pat, text):
    m = re.search(pat, text)
    if not m:
        raise SystemExit('pattern not found: %s' % pat)
    return 0.5 * (float(m.group(1)) + float(m.group(2)))


def style(ax):
    ax.grid(True, color=GRID, linewidth=0.5)
    ax.set_axisbelow(True)
    for s in ('top', 'right'):
        ax.spines[s].set_visible(False)


# ------------------------------------------------------------------ Figure 1: the equilibrium branch
uH = [mid(r'u_H%d in \[(' % i + NUM + '), (' + NUM + r')\], radius', HOPF) for i in (1, 2)]
JH = [mid(r'J_H%d for E_l = 10\.613 \(Hodgkin and Huxley\): \[(' % i + NUM + '), (' + NUM + r')\]', HOPF)
      for i in (1, 2)]
us = np.concatenate([np.linspace(-0.5, 60, 6001)])
Js = HF.I_ss(us)
keep = (Js >= 0) & (Js <= 200)
us, Js = us[keep], Js[keep]
lead = np.array([np.linalg.eigvals(HF.jac(np.array([u, *HF.gate_inf(u)]), J)).real.max() for u, J in zip(us, Js)])
stable = lead < 0

fig, (a, b) = plt.subplots(1, 2, figsize=(6.3, 3.05), constrained_layout=True)
for seg_mask, ls, lab in ((stable, '-', 'asymptotically stable'), (~stable, '--', 'two eigenvalues in Re > 0')):
    y = np.where(seg_mask, us, np.nan)
    a.plot(Js, y, ls, color=BLUE, lw=1.6, label=lab)
    b.plot(Js, np.where(seg_mask, lead, np.nan), ls, color=BLUE, lw=1.6)
for k, (J, u, name) in enumerate(zip(JH, uH, ('H1, subcritical', 'H2, supercritical'))):
    fill = 'white' if k == 0 else ORANGE
    a.plot([J], [u], 'o', ms=5, mfc=fill, mec=ORANGE, mew=1.4, zorder=5, label=name)
    b.plot([J], [0], 'o', ms=5, mfc=fill, mec=ORANGE, mew=1.4, zorder=5)
a.axvline(8, color=AQUA, lw=1.0, label='$J = 8$')
b.axhline(0, color=MUTED, lw=0.6)
a.set_xlabel(r'applied current $J$ ($\mu$A/cm$^2$)')
a.set_ylabel(r'equilibrium $u^*$ (mV)')
b.set_xlabel(r'applied current $J$ ($\mu$A/cm$^2$)')
b.set_ylabel(r'$\max\,\mathrm{Re}\,\lambda$ (1/ms)')
fig.legend(*a.get_legend_handles_labels(), loc='outside upper center', ncol=2,
           fontsize=7.5, handlelength=2.2)
a.set_title('(a) the branch of equilibria', loc='left', fontsize=8.5, color=INK)
b.set_title('(b) the leading eigenvalues', loc='left', fontsize=8.5, color=INK)
for ax in (a, b):
    style(ax)
    ax.set_xlim(0, 200)
fig.savefig(os.path.join(FIG, 'branch.pdf'), metadata={'CreationDate': None})
plt.close(fig)

# ------------------------------------------------------------------ Figure 2: the two orbits at J = 8
s6 = BIST[BIST.index('STAGE 6 '):BIST.index('STAGE 7 ')]
pts = re.findall(r'  ([mnh]) = \[(' + NUM + r') \+/- ', s6)
assert len(pts) == 6
zs = np.array([float(v) for _, v in pts[:3]])
zu = np.array([float(v) for _, v in pts[3:]])
Ts = float(re.findall(r'return time from this point = \[(' + NUM + ')', s6)[0])
Tu = float(re.findall(r'return time from this point = \[(' + NUM + ')', s6)[1])
ueq = float(re.search(r'10\.613 \(Hodgkin-Huxley\): equilibrium u\* in \[(' + NUM + ')', BIST).group(1))


def orbit(u0, z, T, n=2):
    x0 = np.concatenate([[u0], z])
    t = np.linspace(0, n * T, 4000)
    sol = solve_ivp(HF.f, [0, n * T], x0, args=(8.0, 10.613), method='DOP853', rtol=1e-12, atol=1e-14, t_eval=t)
    assert sol.success and np.isfinite(sol.y).all(), sol.message
    return sol.t, sol.y


ts, ys = orbit(20.0, zs, Ts)
tu, yu = orbit(5.0, zu, Tu)
fig, (a, b) = plt.subplots(1, 2, figsize=(6.3, 3.15), constrained_layout=True)
a.plot(ts, ys[0], '-', color=BLUE, lw=1.4, label='stable orbit (spike train)')
a.plot(tu, yu[0], '--', color=ORANGE, lw=1.4, label='orbit of saddle type')
a.axhline(ueq, color=AQUA, lw=1.0, label='equilibrium')
a.set_xlabel('time $t$ (ms)')
a.set_ylabel('depolarization $u$ (mV)')
a.set_title('(a) two periods of each orbit', loc='left', fontsize=8.5, color=INK)
b.plot(ys[0], ys[3], '-', color=BLUE, lw=1.4)
b.plot(yu[0], yu[3], '--', color=ORANGE, lw=1.4)
xeq = np.array([ueq, *HF.gate_inf(ueq)])
b.plot([xeq[0]], [xeq[3]], 'o', ms=5, color=AQUA, zorder=5)
for c, col in ((20.0, BLUE), (5.0, ORANGE)):
    b.axvline(c, color=col, lw=0.6, ls=':', label='section $u = %g$ mV' % c)
ha, la = a.get_legend_handles_labels()
hb, lb = b.get_legend_handles_labels()
fig.legend(ha + hb, la + lb, loc='outside upper center', ncol=3,
           fontsize=7.5, handlelength=2.2)
b.set_xlabel('depolarization $u$ (mV)')
b.set_ylabel('sodium inactivation $h$')
b.set_title('(b) projection on the $(u, h)$ plane', loc='left', fontsize=8.5, color=INK)
for ax in (a, b):
    style(ax)
fig.savefig(os.path.join(FIG, 'orbits.pdf'), metadata={'CreationDate': None})
plt.close(fig)

# ------------------------------------------------------------------ Figure 3: certified periods; the l1 check
s4b = BIST[BIST.index('STAGE 4b '):BIST.index('STAGE 5 ')]
P = re.findall(r'E_l in \[([0-9.]+), ([0-9.]+)\]: P\(Z\) in int Z True, runs cover Z x piece True, sup\|\|DP\|\|_inf <= ([0-9.]+), '
               r'T in \[([0-9.]+), ([0-9.]+)\]', s4b)
assert len(P) == 60
s2 = BIST[BIST.index('STAGE 2 '):BIST.index('STAGE 3 ')]
br = re.findall(r'unstable branch towards the Hopf point: J = (' + NUM + r'), .*?\(amplitude (' + NUM + r')\)', s2)
assert len(br) == 5
slope = mid(r'16 \|q_u\|\^2 Re\(d lambda/dJ\)/\(omega l1\) in \[(' + NUM + '), (' + NUM + ')', HOPF)

fig, (a, b) = plt.subplots(1, 2, figsize=(6.3, 2.9), constrained_layout=True)
for lo_, hi_, _, tlo, thi in P:
    a.fill_between([float(lo_), float(hi_)], float(tlo), float(thi), color=BLUE, lw=0)
a.set_xlabel(r'leak potential $E_l$ (mV)')
a.set_ylabel(r'period $T$ (ms)')
a.set_title('(a) proved period enclosures, $J = 8$', loc='left', fontsize=8.5, color=INK)
sec = a.secondary_xaxis('top', functions=(lambda E: 8 + 0.3 * (E - 10.613), lambda J: 10.613 + (J - 8) / 0.3))
sec.set_xlabel(r'equivalent $J$ ($\mu$A/cm$^2$) at $E_l=10.613$', fontsize=7.5, color=MUTED)
sec.tick_params(labelsize=7, colors=MUTED)
d = np.array([JH[0] - float(J) for J, _ in br])
r = np.array([float(A) ** 2 for _, A in br]) / d
b.plot(d, r, 'o', ms=5, mfc='white', mec=BLUE, mew=1.4, label='computed unstable orbits')
b.plot([0, 1.3], [slope, slope], '-', color=ORANGE, lw=1.2, label=r'limit from $\ell_1$ (Hopf normal form)')
b.set_xlim(0, 1.3)
b.set_xlabel(r'$J_{H1} - J$ ($\mu$A/cm$^2$)')
b.set_ylabel(r'$A_u^2/(J_{H1}-J)$ (mV$^2$ cm$^2$/$\mu$A)')
fig.legend(*b.get_legend_handles_labels(), loc='outside lower center', ncol=2, fontsize=7.5)
b.set_title('(b) numerical check of $\\ell_1$', loc='left', fontsize=8.5, color=INK)
for ax in (a, b):
    style(ax)
fig.savefig(os.path.join(FIG, 'period.pdf'), metadata={'CreationDate': None})
plt.close(fig)
print('figures written to %s: branch.pdf, orbits.pdf, period.pdf' % os.path.relpath(FIG))
