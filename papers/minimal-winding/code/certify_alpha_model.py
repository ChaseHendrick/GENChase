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
"""Point vortices of the alpha-models, for certify_collapses.py:

    dz_j/dt = (i/2 pi) sum_{k != j} Gamma_k (z_j - z_k) |z_j - z_k|^(-alpha-2)      (the alpha-model
    law of the alpha-winding text; alpha = 0 is Euler, alpha = 1 is SQG).

A self-similar motion with z_c = 0 has dz_j/dt = kappa z_j; it collapses iff Re kappa < 0, and its
winding is P = |Im kappa|/(2|Re kappa|). Gauge: Gamma_1 = 1, z_1 real, and
  * kappa real (no rotation, P = 0): 2 pi kappa = c, an exact real constant (c = -1: collapse);
    full vector (3N - 2): [x1, x2, y2, ..., xN, yN, Gamma_2, ..., Gamma_N];
  * P free: 2 pi kappa = -1 + 2 i t, t the signed winding (P = |t|); full vector (3N - 1): the same
    followed by t, the layout of the Euler equations in certify_ball_ad.
Equations (2N real): E_j = i sum_k Gamma_k d_jk m_jk^(-(alpha+2)/2) - 2 pi kappa z_j = 0 with
d_jk = z_j - z_k, m_jk = |d_jk|^2.
"""
from flint import arb
import certify_ball_ad as V
from certify_ball_ad import T


def names(N, withP=False):
    nm = ['x1']
    for k in range(2, N + 1):
        nm += ['x%d' % k, 'y%d' % k]
    return nm + ['G%d' % k for k in range(2, N + 1)] + (['P'] if withP else [])


def unpack(vals, N):
    x = [vals[0]] + [vals[2*k - 1] for k in range(1, N)]
    y = [arb(0)] + [vals[2*k] for k in range(1, N)]
    G = [arb(1)] + [vals[2*N - 2 + k] for k in range(1, N)]
    return x, y, G


def E_T(full, free, N, alpha, c=None, order=1):
    """The 2N equations as T numbers. c = None: P free (full[3N - 2] = t, 2 pi kappa = -1 + 2 i t);
    otherwise 2 pi kappa = c (real)."""
    T.n = len(free)
    T.order = order
    vals = [T(v) for v in full]
    for pos, i in enumerate(free):
        vals[i] = T.var(full[i], pos)
    x, y, G = unpack(vals, N)
    x = [t if isinstance(t, T) else T(t) for t in x]
    y = [t if isinstance(t, T) else T(t) for t in y]
    G = [t if isinstance(t, T) else T(t) for t in G]
    p = -(arb(alpha) + 2)/2
    Re = [T(arb(0)) for _ in range(N)]
    Im = [T(arb(0)) for _ in range(N)]
    for j in range(N):
        for k in range(j + 1, N):
            a = x[j] - x[k]
            b = y[j] - y[k]
            q = (a*a + b*b).pw(p)
            aq = a*q
            bq = b*q
            # i (a + i b) q = -b q + i a q; for the pair (k, j) the sign flips
            Re[j] = Re[j] - G[k]*bq
            Im[j] = Im[j] + G[k]*aq
            Re[k] = Re[k] + G[j]*bq
            Im[k] = Im[k] - G[j]*aq
    if c is not None:
        return [Re[j] - x[j]*c for j in range(N)] + [Im[j] - y[j]*c for j in range(N)]
    t = vals[3*N - 2]
    # (-1 + 2 i t)(x + i y) = (-x - 2 t y) + i (2 t x - y)
    return ([Re[j] + x[j] + t*y[j]*2 for j in range(N)]
            + [Im[j] - t*x[j]*2 + y[j] for j in range(N)])


def side_checks(N, full, alpha, c=None):
    """Rigorous side conditions on a box (full: arb balls). c = None: P free (t = full[3N - 2])."""
    x, y, G = unpack(full, N)
    if c is None:
        t = full[3*N - 2]
        kr, ki = arb(-1), 2*t                   # 2 pi kappa = kr + i ki
    else:
        t = None
        kr, ki = c, arb(0)
    out = {}
    out['all_Gamma_nonzero'] = all((g > 0) or (g < 0) for g in G)
    Gt = sum(G, arb(0))
    out['sum_Gamma'] = Gt.str(20, radius=True)
    out['sum_Gamma_nonzero'] = bool(Gt > 0 or Gt < 0)
    d2 = [((x[j] - x[k])**2 + (y[j] - y[k])**2) for j in range(N) for k in range(j + 1, N)]
    out['pairwise_distances_positive'] = all(d > 0 for d in d2)
    out['min_pair_distance_lower_bound'] = arb(min(d.lower() for d in d2)).sqrt().lower().str(10, radius=False)
    r2 = [x[j]**2 + y[j]**2 for j in range(N)]
    out['no_vortex_at_collision_point'] = all(r > 0 for r in r2)
    out['min_abs_z_lower_bound'] = arb(min(r.lower() for r in r2)).sqrt().lower().str(10, radius=False)
    out['max_abs_z_upper_bound'] = arb(max(r.upper() for r in r2)).sqrt().upper().str(10, radius=False)
    Mx = sum((G[j]*x[j] for j in range(N)), arb(0))
    My = sum((G[j]*y[j] for j in range(N)), arb(0))
    out['sum_Gamma_z_contains_0'] = bool(Mx.contains(0) and My.contains(0))
    I = sum((G[j]*r2[j] for j in range(N)), arb(0))
    p = -arb(alpha)/2
    E = sum((G[j]*G[k]*((x[j] - x[k])**2 + (y[j] - y[k])**2)**p for j in range(N) for k in range(j + 1, N)), arb(0))
    out['I_enclosure'] = I.str(5, radius=True)
    out['I_contains_0'] = bool(I.contains(0))
    out['E_enclosure'] = E.str(5, radius=True)
    out['E_contains_0'] = bool(E.contains(0))
    if t is None:
        out['two_pi_kappa'] = '%s (exact, gauge; kappa real, %s)' % (c.str(5), 'collapse' if c < 0 else 'expansion')
    else:
        out['P'] = abs(t).str(60, radius=True)
        B = (3 + arb(alpha)).sqrt()/(2 + arb(alpha))
        out['P_below_three_vortex_bound'] = bool(abs(t) < B)
    # each ratio 2 pi v_j / z_j must enclose 2 pi kappa
    q = -(arb(alpha) + 2)/2
    ok = True
    for j in range(N):
        vr = arb(0)
        vi = arb(0)
        for k in range(N):
            if k == j:
                continue
            a = x[j] - x[k]
            b = y[j] - y[k]
            w = (a*a + b*b)**q
            vr -= G[k]*b*w
            vi += G[k]*a*w
        rr = (vr*x[j] + vi*y[j])/r2[j]
        ri = (vi*x[j] - vr*y[j])/r2[j]
        ok &= bool(rr.overlaps(kr) and ri.overlaps(ki))
    out['all_ratios_v_over_z_enclose_kappa'] = ok
    return out


GENUINE = ['all_Gamma_nonzero', 'sum_Gamma_nonzero', 'pairwise_distances_positive', 'no_vortex_at_collision_point',
           'sum_Gamma_z_contains_0', 'I_contains_0', 'E_contains_0', 'all_ratios_v_over_z_enclose_kappa']


class AlphaModel:
    """The alpha-model with P free (c = None), in the interface of certify_pipeline."""

    def __init__(self, N, alpha):
        self.N = N
        self.alpha = alpha
        self.names = names(N, withP=True)
        self.iP = V.idx_P(N)

    def eqs(self, full, free, order=1):
        return E_T(full, free, self.N, self.alpha, None, order=order)

    def side(self, full):
        return side_checks(self.N, full, self.alpha)

    def genuine(self, sc, below=True):
        keys = GENUINE + (['P_below_three_vortex_bound'] if below else [])
        return [k for k in keys if not sc[k]]
