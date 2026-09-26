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
"""Per-eps settings of the proof runs.  Nothing here is assumed true: the bracket comes from numerical shooting
and the block shape from a floating-point search, and the rigorous programs check both.

bracket   : (c1, c2) as exact decimal strings, and the cones the orbits at c1 and c2 are expected to enter;
            c_far is a speed far from the pulse speed for a negative control.
block     : frame = eigenbasis of DF at (a_ref, s_ref) and speed c_ref (floats, stored exactly as dyadics),
            weights d, ratio r/rho (block.py).
prec      : working precision in bits;  order, tol: Taylor order and local tolerance of the Lohner integrator;
theta0    : manifold parameter of the start point;  sigma: manifold scaling (exact; the same point family P_c(theta0)
            is used in all three runs);  nman: manifold order;  T_enter: time of the block check.
"""
import os
from flint import fmpq

CONFIG = {
    '1/20': {
        # c* = 0.24718262765166962699064340876911105905212... (shoot_hp.py and shoot_ms.py, numerical)
        'c1': '0.2471826276516696269906434087', 'c2': '0.2471826276516696269906434088', 'side_c1': -1, 'side_c2': +1,
        'c_far': '0.2471',
        'block': {'c_ref': 0.24718262765, 'a_ref': None, 's_ref': None, 'd': [159.0, 10.0, 150.0, 340.0], 'r_over_rho': 1.17},
        'prec': 256, 'order': 30, 'tol': 1e-45, 'theta0': '1/2', 'sigma': '1/11', 'nman': 80, 'T_enter': 12.5,
    },
    '1/50': {
        # c* = 0.31231557100606361009170708921699756697107963698354368981859851707144226616775784846187111256428865... (shoot_ms.py, numerical)
        'c1': '0.3123155710060636100917070892169975669710796369835436898185985170714422661677578484618711',
        'c2': '0.3123155710060636100917070892169975669710796369835436898185985170714422661677578484618712', 'side_c1': -1, 'side_c2': +1,
        'c_far': '0.3123',
        'block': {'c_ref': 0.3123156, 'a_ref': 0.307321, 's_ref': 0.0172063, 'd': [105.977, 7.84445, 96.502, 48.5248], 'r_over_rho': 1.0001},
        'prec': 600, 'order': 70, 'tol': 1e-140, 'theta0': '1/4', 'sigma': '1/10', 'nman': 120, 'T_enter': 30.0,
    },
    '1/100': {
        # Faye's value.  c* = 0.33151630733686543662573053487945922527257930151000810257949238200216593880377692864180314705429641544...
        # (shoot_ms.py 720 0.33151 0.33152 160 80, numerical)
        'c1': '0.331516307336865436625730534879459225272579301510008102579492382002165938803776928641803147054296415442903177208307894457102622838035779556072008', 'c2': '0.331516307336865436625730534879459225272579301510008102579492382002165938803776928641803147054296415442903177208307894457102622838035779556072009', 'side_c1': -1, 'side_c2': +1,
        'c_far': '0.3315',
        'block': {'c_ref': 0.3315163, 'a_ref': 0.301217, 's_ref': 0.0167288, 'd': [186.698, 12.2472, 148.731, 64.0335], 'r_over_rho': 1.04785},
        'prec': 900, 'order': 120, 'tol': 1e-240, 'theta0': '1/8', 'sigma': '1/9', 'nman': 200, 'T_enter': 74.0,
    },
}


def get(eps_txt=None):
    import fcore as fc
    return CONFIG[fc.eps_txt() if eps_txt is None else eps_txt]


def dec(s):
    """Exact rational from a decimal string."""
    ip, _, fp = s.partition('.')
    return fmpq(int(ip + fp), 10 ** len(fp))
