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
"""The random sample of Section 4 of paper/stable-expansion.tex. NUMERICAL (binary64), not part of any proof.

A least-squares solver (scipy least_squares, trust-region reflective) from seeded random starts on the collapse equations
E = 2 pi V(zeta) + (1 - i b) zeta = 0 in the gauge z_1 real, Gamma_1 = 1; the circulations Gamma_2..Gamma_N and b are
unknowns. Solutions that nearly collide, have a nearly vanishing circulation or total circulation are discarded
(thresholds below). For each collapse the eigenvalues of DE are computed, the six of Lemma 1 (0, 0, 2, 2, 1 +- i b)
removed by nearest match, and the collapse counted (converged solutions are not checked for duplicates) when every remaining eigenvalue has positive real part (for N = 4,
equivalently c = 3 + 3 b^2 - tr(A conj A) > 0). The seeds and trial counts are those of the paper: N = 4, seed 11,
800 starts; N = 5, seeds 1 and 2, 700 starts each. About ten minutes. Output: data/survey-expansions.txt.
"""
import os
import sys

import numpy as np
from scipy.optimize import least_squares

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), 'data')
OUT = []


def say(s=''):
    print(s, flush=True)
    OUT.append(s)


def survey(N, seed, trials, dtol, gtol):
    rng = np.random.default_rng(seed)

    def V2pi(z, G):
        d = np.conj(z[:, None] - z[None, :])
        np.fill_diagonal(d, 1)
        w = 1j*G[None, :]/d
        np.fill_diagonal(w, 0)
        return w.sum(1)

    def unpack(u):
        z = np.concatenate([[u[0] + 0j], u[1:N] + 1j*u[N:2*N-1]])
        return z, np.concatenate([[1.0], u[2*N-1:3*N-2]]), u[3*N-2]

    def res(u):
        z, G, b = unpack(u)
        e = V2pi(z, G) + (1 - 1j*b)*z
        return np.concatenate([e.real, e.imag])

    n_all = n_stable = 0
    kinds = {'every remaining pair on Re k = 1': 0, 'a quadruple 1 +- x +- i y, 0 < x < 1': 0, 'a real pair 0 < k < 2': 0}
    for _ in range(trials):
        u0 = np.concatenate([rng.normal(size=2*N-1), rng.normal(size=N-1)*1.5, [rng.normal()*2]])
        s = least_squares(res, u0, xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=400)
        if np.max(np.abs(s.fun)) > 1e-11:
            continue
        z, G, b = unpack(s.x)
        dmin = min(abs(z[i] - z[j]) for i in range(N) for j in range(i))
        if dmin < dtol*abs(z).max() or abs(G).min() < gtol*abs(G).max() or abs(G.sum()) < 1e-3:
            continue
        d = np.conj(z[:, None] - z[None, :])
        np.fill_diagonal(d, 1)
        A = 1j*G[None, :]/d**2
        np.fill_diagonal(A, 0)
        A[np.diag_indices(N)] = -A.sum(1)
        I = np.eye(N)
        M = np.block([[A.real + I, A.imag + b*I], [A.imag - b*I, -A.real + I]])
        ev = list(np.linalg.eigvals(M))
        for sv in [0, 0, 2, 2, 1 + 1j*b, 1 - 1j*b]:
            ev.pop(int(np.argmin([abs(e - sv) for e in ev])))
        n_all += 1
        if min(e.real for e in ev) > 0:
            n_stable += 1
            real = [e for e in ev if abs(e.imag) < 1e-7]
            offline = [e for e in ev if abs(e.imag) >= 1e-7 and abs(e.real - 1) > 1e-6]
            if real:
                kinds['a real pair 0 < k < 2'] += 1
            elif offline:
                kinds['a quadruple 1 +- x +- i y, 0 < x < 1'] += 1
            else:
                kinds['every remaining pair on Re k = 1'] += 1
    say('N = %d, seed %d, %d starts: %d collapses, %d whose reversal is linearly stable' % (N, seed, trials, n_all, n_stable))
    for k_, v in kinds.items():
        say('      of those, %d with %s' % (v, k_))
    return n_all, n_stable, kinds


a4 = survey(4, 11, 800, 1e-2, 1e-2)
a5 = [survey(5, sd, 700, 3e-2, 2e-2) for sd in (1, 2)]
say('N = 4: %d of %d; N = 5: %d of %d' % (a4[1], a4[0], sum(x[1] for x in a5), sum(x[0] for x in a5)))
with open(os.path.join(DATA, 'survey-expansions.txt'), 'w') as fh:
    fh.write('\n'.join(OUT) + '\n')
