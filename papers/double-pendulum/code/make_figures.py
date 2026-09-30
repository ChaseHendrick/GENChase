"""Plot stored proof inputs/outputs, without integration or new proof claims.
Run: python3 code/make_figures.py (from the companion root, or any directory).
Dependencies: requirements-figures.txt. Never changes the certified data.
"""
from pathlib import Path
import hashlib
import json
import re
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FIG = ROOT / 'paper' / 'figures'
FIG.mkdir(exist_ok=True)
config = ROOT / 'configs' / 'horseshoe_E0.cfg'
report = ROOT / 'data' / 'E0.txt'
text = report.read_text()
assert 'RESULT: ALL CHECKS PASSED' in text
sets = {}
for line in config.read_text().splitlines():
    fields = line.split()
    if fields and fields[0] == 'set':
        sets[fields[1]] = [float(v) for v in fields[2:]]
assert len(sets) == 23 and 'M9' in sets
# The exact printed endpoints, not rounded numbers transcribed from the manuscript.
rows = re.findall(r'piece x in \[([^\]]+)\].*?image t2 \[([^\]]+)\], p2 \[([^\]]+)\], dp2/dt2 in \[([^\]]+)\]', text)
assert len(rows) == 2
boxes = []
for segment, theta, momentum, slope in rows:
    box = {k: [float(v.strip()) for v in values.split(',')]
           for k, values in [('segment', segment), ('theta2', theta), ('p2', momentum), ('slope', slope)]}
    assert box['theta2'][0] < 0 < box['theta2'][1]
    assert box['slope'][0] < box['slope'][1] < 0
    boxes.append(box)

plt.rcParams.update({'font.size': 9, 'axes.titlesize': 9, 'legend.fontsize': 8,
                     'pdf.fonttype': 42, 'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.linewidth': .6, 'savefig.facecolor': 'white'})
fig, axes = plt.subplots(1, 2, figsize=(6.5, 3.65), layout='constrained')
ax = axes[0]
named_markers = {'M7': 's', 'M8': '^', 'M9': 'o', 'M10': 'v', 'M11': 'D'}
for name, (theta, momentum, *_) in sets.items():
    wrapped = (theta + np.pi) % (2 * np.pi) - np.pi
    if name == 'N':
        ax.plot(wrapped, momentum, marker='*', color='#222222', ms=9, zorder=4,
                linestyle='None', label='$N$')
    elif name in named_markers:
        ax.plot(wrapped, momentum, marker=named_markers[name], color='#2166ac', ms=4,
                linestyle='None', label=name)
    else:
        ax.plot(wrapped, momentum, marker='o', color='#2166ac', ms=4, linestyle='None')
ax.axvline(0, color='#777', lw=.7, ls='--', zorder=0)
ax.set(xlabel=r'$\theta_2$ mod $2\pi$ (rad)', ylabel=r'$p_2$ (dimensionless)',
       title='(a) Stored h-set centres, $E=0$', xlim=(-.65, .65), ylim=(-1.75, 1.08))
ax.set_xticks([-.5, 0, .5])

ax = axes[1]
for i, box in enumerate(boxes):
    x0, x1 = np.array(box['theta2']) * 1e5
    y0, y1 = (np.array(box['p2']) - .82215) * 1e4
    color = ['#2166ac', '#b35806'][i]
    ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, facecolor=color, alpha=.13, edgecolor='none'))
    ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, facecolor='none', edgecolor=color, lw=1.2,
                           linestyle=['-', '--'][i], label=f'Candidate piece {i+1}'))
ax.axvline(0, color='#222', lw=.8)
ax.set(xlim=(-10, 10), ylim=(-1.3, 1.55), xlabel=r'$\theta_2 / 10^{-5}$ (rad)',
       ylabel=r'$(p_2-0.82215)/10^{-4}$', title='(b) Certified image enclosures')
ha, la = axes[0].get_legend_handles_labels()
hb, lb = axes[1].get_legend_handles_labels()
fig.legend(ha + hb, la + lb, loc='outside upper center', ncol=4, fontsize=7.5,
           columnspacing=1.4, handlelength=1.8, frameon=False)
for ax in axes:
    ax.grid(color='#ddd', lw=.4)
    ax.set_axisbelow(True)
fig.savefig(FIG / 'section-enclosures.pdf', metadata={'CreationDate': None, 'ModDate': None})
plt.close(fig)
manifest = {'description': 'Display of stored design centres and certified image enclosures; not a new computation of the proof.',
            'inputs': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in (config, report, Path(__file__).resolve())},
            'candidateBoxes': boxes, 'coordinateConvention': 'angles reduced to [-pi, pi) only in panel a; momenta and energy in m=l=g=1 units',
            'matplotlib': matplotlib.__version__, 'numpy': np.__version__}
(FIG / 'section-enclosures-sources.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Wrote section-enclosures.pdf and its source manifest')
