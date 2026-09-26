# Figures of the note, from the outputs in ../out/.  Writes paper/figures/fig{1,2,3}.pdf.
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from common import OUT, ROOT, NUS, ELLS
from tails import variants, IND

FIG = os.path.join(ROOT, 'paper', 'figures')
os.makedirs(FIG, exist_ok=True)
# categorical slots 1-4 of the validated reference palette (light mode), fixed order; markers as a second channel
# (validated: adjacent pairs in the order 0.5, 0.75, 1, 1.5, 2.5 pass; yellow/orange are separated by marker shape)
COL = {0.5: '#2a78d6', 0.75: '#4a3aa7', 1.0: '#eb6834', 1.5: '#1baf7a', 2.0: '#eda100', 2.5: '#eda100'}
MRK = {0.5: 'o', 0.75: 'v', 1.0: 's', 1.5: '^', 2.0: 'D', 2.5: 'D'}
INK, INK2, GRID = '#0b0b0b', '#52514e', '#d9d8d4'
plt.rcParams.update({'font.size': 8.5, 'axes.edgecolor': INK2, 'axes.labelcolor': INK, 'xtick.color': INK2,
                     'ytick.color': INK2, 'axes.linewidth': 0.6, 'lines.linewidth': 1.4, 'legend.frameon': False,
                     'pdf.fonttype': 42, 'axes.spines.top': False, 'axes.spines.right': False})


def style(ax):
    ax.grid(True, color=GRID, lw=0.4)
    ax.set_axisbelow(True)


W = json.load(open(f'{OUT}/matern_window.json'))
FN = json.load(open(f'{OUT}/matern_finiteN.json'))['res']


def by(rows, d, nu, key):
    sets = sorted({r['set'] for r in rows if r['d'] == d})
    arr = np.array([[next(r[key] for r in rows if r['set'] == s and r['nu'] == nu and r['ell'] == c) for c in ELLS]
                    for s in sets])
    return sets, arr


def fmt(v):
    return ('%.4f' % v).rstrip('0').rstrip('.')


def panel_matern(ax, rows, d, key, title, ylab):
    x = np.array(ELLS)
    for nu in NUS:
        sets, A = by(rows, d, nu, key)
        ax.fill_between(x, A.min(0), A.max(0), color=COL[nu], alpha=0.18, lw=0)
        ax.plot(x, np.median(A, 0), color=COL[nu], marker=MRK[nu], ms=4, label=f'$\\nu = {nu:g}$  ($\\alpha_\\infty = {fmt(1+2*nu/d)}$)')
        ax.plot([x[-1] * 1.35], [1 + 2 * nu / d], marker='<', color=COL[nu], ms=5, clip_on=False)
    ax.axhline(1 + 2 / d, color=INK, lw=1.0, ls='--', label=f'bound $1 + 2/d = {fmt(1 + 2/d)}$')
    ax.set_xscale('log', base=2)
    ax.set_xticks(x); ax.set_xticklabels(['1/8', '1/4', '1/2', '1', '2', '4', '8'])
    ax.set_xlim(x[0] / 1.2, x[-1] * 1.45)
    ax.set_xlabel('tuning length scale $\\ell$ / median stimulus distance')
    ax.set_ylabel(ylab); ax.set_title(title, fontsize=9, color=INK)
    style(ax)


# Figure 1: window exponents of Matern codes on the real stimulus coordinates
fig, axs = plt.subplots(1, 2, figsize=(7.2, 2.75), sharey=False)
panel_matern(axs[0], W, 8, 'w11_500', '8D stimulus sets (6 recordings)', 'window exponent, ranks 11-500')
panel_matern(axs[1], W, 4, 'w11_500', '4D stimulus sets (4 recordings)', 'window exponent, ranks 11-500')
axs[0].set_ylim(0.1, 3.75); axs[1].set_ylim(0.5, 4.0)
axs[0].legend(loc='upper left', fontsize=6.8); axs[1].legend(loc='upper left', fontsize=6.8)
fig.tight_layout(); fig.savefig(f'{FIG}/fig1.pdf'); plt.close(fig)

# Figure 2: d = 1
C = json.load(open(f'{OUT}/circle_d1.json'))
fig, axs = plt.subplots(1, 2, figsize=(7.2, 2.65))
ax = axs[0]
for nu in (0.5, 1.0, 1.5, 2.0):
    rr = [r for r in C['rows'] if r['nu'] == nu]
    kap = [r['kappa'] for r in rr]
    ax.plot(kap, [r['w_sampled'] for r in rr], color=COL[nu], marker=MRK[nu], ms=4, label=f'$\\nu = {nu:g}$ ($\\alpha_\\infty = {1+2*nu:g}$)')
    ax.plot(kap, [r['w_operator'] for r in rr], color=COL[nu], ls=':', lw=1.2)
    ax.plot([kap[0] / 1.5], [1 + 2 * nu], marker='>', color=COL[nu], ms=5, clip_on=False)
ax.axhline(3, color=INK, lw=1.0, ls='--')
ax.text(16, 3, 'bound 3  ', va='bottom', ha='right', fontsize=8)
ax.set_xscale('log', base=2); ax.set_xticks(kap); ax.set_xticklabels([f'{k:g}' for k in kap])
ax.set_xlim(kap[0] / 1.6, kap[-1] * 1.2)
ax.set_xlabel('bandwidth $\\kappa$ (tuning width $\\sim 2\\pi/\\kappa$)')
ax.set_ylabel('window exponent, ranks 5-30')
ax.set_title('32 directions (solid) and no sampling (dotted)', fontsize=9)
ax.legend(fontsize=7, loc='upper right'); style(ax)
ax = axs[1]
k = np.arange(1, 2 ** 17 + 1, dtype=float)
kap, nu_h = 1.0, 1.5
base = (1 + (k / kap) ** 2) ** -(nu_h + 0.5)
for a, col, lab in ((2.0, COL[0.5], 'tail $n^{-2}$ (not differentiable)'), (5.0, COL[1.5], 'tail $n^{-5}$ (differentiable)')):
    c = base.copy(); m = k > 1000; c[m] = base[999] * (k[m] / 1000) ** -a
    op = np.repeat(c, 2)
    ax.loglog(np.arange(1, len(op) + 1), op, color=col, lw=1.3, label=f'operator, {lab}')
    mu = np.array(C['prop1'][f'nu{nu_h}_kappa{kap}_a{a}']['mu'])
    ax.loglog(np.arange(1, 32), mu, ls='none', marker='o' if a == 2 else 'x', color=col, ms=7 if a == 2 else 4,
              mfc='none' if a == 2 else col, label=f'32 directions, {lab.split(" (")[0]}')
ax.axvspan(5, 30, color=GRID, alpha=0.5, lw=0)
ax.text(12, 3e-1 * 30, 'ranks 5-30', ha='center', va='bottom', fontsize=7, color=INK2)
ax.set_xlabel('rank $n$'); ax.set_ylabel('eigenvalue')
ax.set_title(f'Two codes, one sampled spectrum (window {C["prop1"]["nu1.5_kappa1.0_a2.0"]["w"]:.2f})', fontsize=9)
ax.set_ylim(1e-13, 1e2); ax.legend(fontsize=6.5, loc='lower left'); style(ax)
fig.tight_layout(); fig.savefig(f'{FIG}/fig2.pdf'); plt.close(fig)

# Figure 3: MEME alpha2 under far-tail changes
M = json.load(open(f'{OUT}/meme.json'))
fig, axs = plt.subplots(1, 2, figsize=(7.2, 2.65), gridspec_kw={'width_ratios': [1, 1.15]})
ax = axs[0]
V = variants(1.25)
show = [('base', INK, 'base: BPL 0.5 / 1.25'), ('tail500_0.8', COL[0.5], 'beyond 500: 0.8'),
        ('tail500_1.0', COL[1.0], 'beyond 500: 1.0'), ('tail500_2.0', COL[1.5], 'beyond 500: 2.0'),
        ('tail500_3.0', COL[2.5], 'beyond 500: 3.0')]
for name, col, lab in show:
    lam = V[name]; ok = lam > 0
    ax.loglog(IND[ok], lam[ok], color=col, lw=1.6 if name == 'base' else 1.1, label=lab, zorder=3 if name == 'base' else 2)
lam = V['rank2800']
ax.loglog([2800], [lam[2799]], ls='none', marker='|', ms=9, mew=1.5, color=INK, label='zero beyond rank 2800')
ax.axvspan(11, 500, color=GRID, alpha=0.5, lw=0)
ax.text(75, 1.5e2, 'ranks 11-500', ha='center', va='center', fontsize=7, color=INK2)
ax.set_xlabel('rank $n$'); ax.set_ylabel('signal eigenvalue'); ax.set_ylim(1e-5, 800)
ax.set_title('Spectra that agree up to rank 500', fontsize=9); ax.legend(fontsize=6.5, loc='lower left'); style(ax)
ax = axs[1]
names = ['base', 'tail500_0.8', 'tail500_1.0', 'tail500_2.0', 'tail500_3.0', 'rank2800']
labels = ['base', 'exp. 0.8', 'exp. 1.0', 'exp. 2.0', 'exp. 3.0', 'zero\n> 2800']
y = np.arange(len(names))[::-1]
SIM = M['sim']['diag']
b = SIM['base']['mean']
for yi, nm in zip(y, names):
    s = SIM[nm]; v = np.array(s['alpha2'])
    ax.plot([np.percentile(v, 2.5), np.percentile(v, 97.5)], [yi, yi], color=COL[1.0], lw=1.2)
    ax.plot(s['mean'], yi, 's', color=COL[1.0], ms=5, label='simulated: mean, 2.5-97.5%' if nm == 'base' else None)
    ax.plot(s['exact_alpha2'], yi + 0.22, 'o', color=COL[0.5], ms=4, mfc='none', label='exact moments' if nm == 'base' else None)
ax.axvline(1.25, color=INK, lw=1.0, ls='--')
ax.set_yticks(y); ax.set_yticklabels(labels); ax.set_ylim(-0.6, len(names) + 0.9)
ax.set_ylabel('change beyond rank 500'); ax.set_xlabel('MEME tail exponent $\\alpha_2$')
ax.set_title('$\\alpha_2$ (tail exponent 1.25 up to rank 500; 20 data sets)', fontsize=9)
ax.legend(fontsize=6.5, loc='upper center', ncol=2, handletextpad=0.3, columnspacing=0.8); style(ax)
fig.tight_layout(); fig.savefig(f'{FIG}/fig3.pdf'); plt.close(fig)

print('figures written to', FIG)
