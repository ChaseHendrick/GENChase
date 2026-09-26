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
"""Check the forward-mode Jacobian of the Taylor map (lohner.taylor_jet) against central differences of
the Taylor map itself, including the derivative with respect to kappa = 1/c."""
from flint import arb, ctx
ctx.prec = 256
import lohner as lo, nfcore as nf
x = [arb('0.3'), arb('0.12'), arb('0.7'), arb('0.2'), nf.S(arb('0.3')), 1 / arb('1.1027')]
order, h = 30, arb('0.05')
def Phi(z):
    v = lo.taylor_vals(z, order)
    return [nf.horner(v[i][:order + 1], h) for i in range(5)] + [z[5]]
vals, grads = lo.taylor_jet(x, order)
J = [[nf.horner([grads[i][k][m] for k in range(order + 1)], h) for m in range(6)] for i in range(6)]
d = arb(10) ** -30
worst = 0
for m in range(6):
    xp = list(x); xm = list(x); xp[m] = x[m] + d; xm[m] = x[m] - d
    fp, fm = Phi(xp), Phi(xm)
    for i in range(6):
        fd = (fp[i] - fm[i]) / (2 * d)
        worst = max(worst, abs(float((fd - J[i][m]).mid())))
print('max |J_AD - J_FD| over 36 entries: %.2e  (FD truncation ~1e-60, so agreement to ~1e-50 means AD is right)' % worst)
print('JACOBIAN', 'PASS' if worst < 1e-45 else 'FAIL')
# the kappa column explicitly
print('dPhi/dkappa (AD):', [J[i][5].str(8) for i in range(5)])
