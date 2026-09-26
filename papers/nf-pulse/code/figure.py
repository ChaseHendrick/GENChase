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
import json, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
d = json.load(open('../data/orbit_hp.json'))
tr = d['cstar']['traj']
t = np.array([p[0] for p in tr]); X = np.array([p[1] for p in tr])
m = t < 110
fig, ax = plt.subplots(1, 2, figsize=(10, 3.6))
for i, (lab, col) in enumerate((('U (activity u)', '#1f5fa8'), ('V (recovery v)', '#c0392b'), ('Q = w*S(U)', '#7f8c8d'))):
    ax[0].plot(t[m], X[m, i], label=lab, color=col, lw=1.4)
ax[0].axvspan(53, 110, color='#2ecc71', alpha=0.12, label='in block B (xi >= 53)')
ax[0].set_xlabel('xi = x + c t  (manifold point at xi = 0)'); ax[0].legend(fontsize=8, frameon=False)
ax[0].set_title('fast pulse, c = 1.10274770973...', fontsize=10)
u = np.linspace(-0.5, 1.0, 400); S = 1 / (1 + np.exp(-20 * (u - 0.25)))
ax[1].plot(u, S - u, color='#95a5a6', lw=1, label='v = S(u) - u (fast nullcline)')
ax[1].plot(X[m, 0], X[m, 1], color='#1f5fa8', lw=1.4, label='pulse (U, V)')
ax[1].plot([0], [1 / (1 + np.exp(5))], 'ko', ms=4, label='rest')
ax[1].set_xlabel('U'); ax[1].set_ylabel('V'); ax[1].legend(fontsize=8, frameon=False)
fig.tight_layout(); fig.savefig('../data/pulse_profile.png', dpi=130)
print('saved')
