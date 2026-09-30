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
"""Vector numerical illustration from the committed orbit_hp.json, not a proof."""
from pathlib import Path
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT = Path(__file__).resolve().parents[1]
d = json.loads((ROOT / 'data' / 'orbit_hp.json').read_text())
tr = d['cstar']['traj']
t = np.array([p[0] for p in tr]); X = np.array([p[1] for p in tr])
assert np.isfinite(X).all() and np.isfinite(t).all() and np.all(np.diff(t) > 0)
m = t < 110
plt.rcParams.update({'font.size': 8.5, 'font.family': 'serif', 'mathtext.fontset': 'cm',
                     'pdf.fonttype': 42, 'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.linewidth': .6, 'legend.frameon': False})
fig, ax = plt.subplots(1, 2, figsize=(6.3, 3.45), constrained_layout=True)
for i, (lab, col, style) in enumerate((('$U$', '#2368a2', '-'), ('$V$', '#a54d00', '--'),
                                     ('$Q = w * S(U)$', '#555555', '-.'))):
    ax[0].plot(t[m], X[m, i], label=lab, color=col, ls=style, lw=1.4)
ax[0].axvspan(53, 110, color='#39734b', alpha=.10, label=r'block $B$: $\xi \geq 53$')
ax[0].set_xlabel(r'profile coordinate $\xi=x+ct$')
ax[0].set_ylabel('profile fields (model units)')
fig.legend(*ax[0].get_legend_handles_labels(), fontsize=7.8,
           loc='outside upper center', ncol=4, columnspacing=1.2, handlelength=1.8)
ax[0].set_title('(a) numerical fast-pulse profile', loc='left')
u = np.linspace(-.5, 1, 400); S = 1 / (1 + np.exp(-20 * (u - .25)))
ax[1].plot(u, S-u, color='#777777', ls=':', lw=1.2, label='$V=S(U)-U$')
ax[1].plot(X[m, 0], X[m, 1], color='#2368a2', lw=1.4, label='pulse $(U,V)$')
ax[1].plot([0], [1/(1+np.exp(5))], 'ko', ms=3.5, label='rest')
ax[1].set_xlabel('activity $U$ (model units)')
ax[1].set_ylabel('recovery $V$ (model units)')
ax[1].set_title('(b) projection in the $(U,V)$ plane', loc='left')
fig.legend(*ax[1].get_legend_handles_labels(), fontsize=7.5,
           loc='outside lower center', ncol=3, columnspacing=1.2, handlelength=1.8)
for a in ax:
    a.grid(color='#dededb', lw=.45); a.set_axisbelow(True)
(ROOT / 'paper' / 'figures').mkdir(exist_ok=True)
fig.savefig(ROOT / 'data' / 'pulse_profile.png', dpi=180)
fig.savefig(ROOT / 'paper' / 'figures' / 'pulse-profile.pdf', metadata={'CreationDate': None,
            'Title': 'Numerical fast pulse in the neural field', 'Author': 'Chase Hendrick'})
plt.close(fig)
print('Saved vector and raster illustrations from data/orbit_hp.json; %d stored samples.' % np.sum(m))
