# Figures after the check's fixes (PNG, 200 dpi, work/fig2_*.png). Validated three-slot palette (blue, orange, aqua),
# marker shape as a second channel, neutral text.
import json, os, glob, numpy as np, pandas as pd
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
import cx
BLUE, ORANGE, AQUA = '#2a78d6', '#eb6834', '#1baf7a'
INK, INK2, GRID, SURF = '#0b0b0b', '#52514e', '#e4e3df', '#fcfcfb'
plt.rcParams.update({'font.size': 9, 'axes.edgecolor': GRID, 'axes.labelcolor': INK2, 'xtick.color': INK2, 'ytick.color': INK2,
                     'axes.facecolor': SURF, 'figure.facecolor': SURF, 'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': 0.8,
                     'axes.spines.top': False, 'axes.spines.right': False, 'legend.frameon': False, 'text.color': INK})
W = cx.W
LBL = {'N0': 'own pool\n(stage 1)', 'N0p': 'own pool\n+ position', 'N1': 'cell totals\nfixed', 'N2': 'cell totals\n+ soma dist.\n+ depth pairs',
       'N3': 'cell totals\n+ soma dist.\n+ own laminar\nprofile'}

# 1. main data: statistic under each null, conservative bootstrap interval (thick) and conditional +/-1.96 SD (thin)
T = pd.read_csv(f'{W}/table_pw.csv'); Zc = json.load(open(f'{W}/condz_main.json'))
ORDER = ['N0', 'N0p', 'N1', 'N2', 'N3']
fig, ax = plt.subplots(figsize=(7.4, 3.8))
for k, (fam, meas, col, mk, name) in enumerate([('dt', 'sil', BLUE, 'o', 'digital-twin signal correlation'), ('iv', 'viv', ORANGE, 's', 'in vivo signal correlation')]):
    for i, c in enumerate(ORDER):
        r = T[(T.family == fam) & (T['null'] == c) & (T.measure == meas) & (T.scope == 'all')]
        if not len(r) or pd.isna(r.iloc[0].se): continue
        r = r.iloc[0]; x = i + (k - 0.5) * 0.26
        ax.plot([x, x], [r.pct_lo, r.pct_hi], color=col, lw=2.2, solid_capstyle='round')
        z = Zc.get(f'{fam}|{c}|{meas}')
        if z: ax.plot([x + 0.07, x + 0.07], [r.estimate - 1.96 * z['null_sd'], r.estimate + 1.96 * z['null_sd']], color=col, lw=0.9, alpha=0.8)
        ax.plot([x], [r.estimate], mk, color=col, ms=6.5, mec=SURF, mew=1.5, label=name if i == 0 else None)
        ax.annotate(f'{r.estimate:+.4f}', (x, r.estimate), xytext=(-5 if k == 0 else 9, 0), textcoords='offset points', ha='right' if k == 0 else 'left', va='center', fontsize=6.8, color=INK2)
ax.axhline(0, color=INK2, lw=0.8)
ax.set_xticks(range(len(ORDER))); ax.set_xticklabels([LBL[c] for c in ORDER], fontsize=7.5); ax.set_xlim(-0.75, len(ORDER) - 0.35)
ax.set_ylabel('excess (test statistic)')
ax.set_title('Excess under each null: thick = 95% two-way bootstrap (conservative), thin = +/-1.96 SD of the null draws', fontsize=8.5, loc='left')
ax.legend(loc='upper right', fontsize=7.5)
fig.tight_layout(); fig.savefig(f'{W}/fig2_excess_by_null.png', dpi=200); plt.close(fig)

# 2. absorption curve
C = pd.read_csv(f'{W}/calib_summary.csv'); G = C[C.scen.str.startswith('G')].sort_values('gamma')
real = json.load(open(f'{W}/point_real.json'))
fig, ax = plt.subplots(figsize=(5.6, 4.0))
mx = float(G.oracle.max()) * 1.08
ax.plot([0, mx], [0, mx], color=INK2, lw=0.8)
for k, (c, col, mk, nm) in enumerate([('N0', BLUE, 'o', 'own pool (stage 1)'), ('N1', ORANGE, 's', 'cell totals fixed (N1)'), ('N3', AQUA, 'D', 'N1 + soma dist. + own laminar profile (N3)')]):
    ax.errorbar(G.oracle, G[c], xerr=1.96 * G.oracle_se, yerr=1.96 * G[c + '_se'], fmt=mk + '-', color=col, ms=5.5, lw=1.4, mec=SURF, mew=1.2, label=nm)
for c, col, ls in [('N0', BLUE, ':'), ('N1', ORANGE, '--'), ('N3', AQUA, '--')]:
    y = real[f'dt:{c}']['summary']['sil:all']; ax.axhline(y, color=col, lw=0.9, ls=ls)
    ax.annotate(f'real {c} {y:+.4f}', (0.0005, y), xytext=(0, 3), textcoords='offset points', fontsize=6.8, color=INK2)
for _, r in G.iterrows():
    ax.annotate(f'gamma {r.gamma:g}', (r.oracle, r.N1), xytext=(4, -9), textcoords='offset points', fontsize=6.5, color=INK2)
ax.set_xlabel('oracle excess (against the true pairwise model)')
ax.set_ylabel('excess recovered by each null')
ax.set_title('Injected anchor rule on the real design (20 datasets per point)', fontsize=8.5, loc='left')
ax.legend(fontsize=7, loc='upper left', bbox_to_anchor=(0.0, 0.93))
fig.tight_layout(); fig.savefig(f'{W}/fig2_absorption.png', dpi=200); plt.close(fig)

# 3. negative controls (no rule): mean excess and the conditional test's spread
N = C[C.scen.isin(['G0', 'O', 'L', 'OL'])].set_index('scen').reindex(['G0', 'O', 'L', 'OL']).dropna(how='all').reset_index()
SL = {'G0': 'in family\n(heterog. + laminar)', 'O': 'multi-synapse\noverdispersion', 'L': 'axon-specific\nlaminar pref.', 'OL': 'both'}
fig, axs = plt.subplots(1, 2, figsize=(8.4, 3.3))
for k, (c, col, mk, nm) in enumerate([('N0', BLUE, 'o', 'N0'), ('N1', ORANGE, 's', 'N1'), ('N3', AQUA, 'D', 'N3')]):
    x = np.arange(len(N)) + (k - 1) * 0.22
    axs[0].errorbar(x, N[c], yerr=1.96 * N[c + '_se'], fmt=mk, color=col, ms=5.5, lw=1.4, mec=SURF, mew=1.2, label=nm)
    if c != 'N0':
        axs[1].plot(x, N[c + '_sd_across'] / N[c + '_csd'], mk, color=col, ms=6, mec=SURF, mew=1.2, label=nm)
for ax in axs:
    ax.set_xticks(range(len(N))); ax.set_xticklabels([SL[s] for s in N.scen], fontsize=7)
axs[0].axhline(0, color=INK2, lw=0.8); axs[0].set_ylabel('mean excess, no rule (+/- 1.96 SE)'); axs[0].legend(fontsize=7)
axs[0].set_title('Bias with no cohort rule', fontsize=8.5, loc='left')
axs[1].axhline(1, color=INK2, lw=0.8); axs[1].set_ylabel('SD across datasets / SD of null draws'); axs[1].legend(fontsize=7)
axs[1].set_title('Conditional test: >1 means anti-conservative', fontsize=8.5, loc='left')
fig.tight_layout(); fig.savefig(f'{W}/fig2_negative_controls.png', dpi=200); plt.close(fig)

# 4. bootstrap and conditional SE against the across-dataset SD on the synthetic super-population
rows = []
if os.path.exists(f'{W}/coverage.csv'):
    V = pd.read_csv(f'{W}/coverage.csv'); V = V[V.scope == 'all']
    for _, r in V.iterrows(): rows.append({'scen': r.scenario, 'null': 'N2', 'boot_ratio': r.se_ratio, 'cond_ratio': np.nan})
for f in sorted(glob.glob(f'{W}/cover2_*.jsonl')):
    R = [json.loads(l) for l in open(f)]
    if len(R) < 5: continue
    sc = R[0]['scen']
    for c in ['N1', 'N3']:
        sd = np.std([r[f'pt|{c}'] for r in R], ddof=1)
        rows.append({'scen': sc, 'null': c, 'boot_ratio': np.mean([np.std(r['boot'][c], ddof=1) for r in R]) / sd,
                     'cond_ratio': np.mean([r[f'csd|{c}'] for r in R]) / sd, 'n': len(R)})
if rows:
    Q = pd.DataFrame(rows); Q.to_csv(f'{W}/se_ratios.csv', index=False)
    fig, ax = plt.subplots(figsize=(6.4, 3.2))
    labs = [f'{r.scen}\n{r["null"]}' for _, r in Q.iterrows()]; x = np.arange(len(Q))
    ax.plot(x - 0.08, Q.boot_ratio, 'o', color=BLUE, ms=6.5, mec=SURF, mew=1.2, label='two-way bootstrap SE')
    ax.plot(x + 0.08, Q.cond_ratio, 's', color=ORANGE, ms=6.5, mec=SURF, mew=1.2, label='SD of the null draws')
    ax.axhline(1, color=INK2, lw=0.8); ax.set_xticks(x); ax.set_xticklabels(labs, fontsize=7)
    ax.set_ylabel('SE / actual SD across datasets'); ax.legend(fontsize=7)
    ax.set_title('Synthetic super-population: >1 conservative, <1 anti-conservative', fontsize=8.5, loc='left')
    fig.tight_layout(); fig.savefig(f'{W}/fig2_se_calibration.png', dpi=200); plt.close(fig)

# 5. held-out against the recomputed-Ding reference
if os.path.exists(f'{W}/heldout_result.json'):
    H = pd.DataFrame(json.load(open(f'{W}/heldout_result.json'))['table'])
    fig, axs = plt.subplots(1, 2, figsize=(8.6, 3.5), sharey=True)
    for ax, (fam, meas, title) in zip(axs, [('dt', 'sil', 'digital-twin measure'), ('iv', 'viv', 'in vivo measure')]):
        for k, (tag, col, mk, nm) in enumerate([('ding1822', BLUE, 'o', "reference: Ding's 148 axons, v1822 co-travel"), ('new1822', ORANGE, 's', 'held-out: 625 new axons')]):
            for j, c in enumerate(['N1', 'N3']):
                for i, sc in enumerate(['all'] + cx.PROJ):
                    r = H[(H.data == tag) & (H.family == fam) & (H['null'] == c) & (H.measure == meas) & (H.scope == sc)]
                    if not len(r) or pd.isna(r.iloc[0].get('se_boot', np.nan)): continue
                    r = r.iloc[0]; xx = i * 2.2 + j * 1.0 + (k - 0.5) * 0.35
                    ax.errorbar([xx], [r.estimate], yerr=[[r.estimate - r.pct_lo], [r.pct_hi - r.estimate]], fmt=mk, color=col, ms=5,
                                lw=1.4, mec=SURF, mew=1.1, alpha=1.0 if c == 'N1' else 0.55, label=nm if (i == 0 and j == 0) else None)
        ax.axhline(0, color=INK2, lw=0.8)
        ax.set_xticks([i * 2.2 + 0.5 for i in range(5)]); ax.set_xticklabels(['pooled'] + [p.replace('_', '->') for p in cx.PROJ], fontsize=7.5)
        ax.set_title(f'{title} (left of each pair N1, right N3)', fontsize=8.5, loc='left')
    axs[0].set_ylabel('excess, 95% two-way bootstrap'); axs[0].legend(fontsize=7, loc='upper left')
    fig.tight_layout(); fig.savefig(f'{W}/fig2_heldout.png', dpi=200); plt.close(fig)
print('figures written')
