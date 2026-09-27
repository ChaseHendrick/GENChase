#!/usr/bin/env python3
"""NUMERICAL ONLY (float64, scipy; no error control, not used in any proof): the small periodic orbits below the
supercritical Hopf point J_H2 at E_l = 10.613, as a check of the size of the first Lyapunov coefficient there.

Theorem 2 of the manuscript proves l1 < 0 at J_H2 and encloses the normal-form factor
16 |q_u|^2 Re(d lambda/dJ)/(omega l1), the predicted limit of (peak-to-peak u)^2/(J_H2 - J) as J -> J_H2 from below
(data/certify_equilibria_hopf.txt).  For J = J_H2 - delta this program
  1. integrates from a perturbation of the (unstable) equilibrium for 4000 ms, which ends near an attracting cycle,
  2. refines the cycle by Newton's method on the Poincare map to {u = u*(J), du/dt > 0} (shoot_float.newton),
  3. integrates one period from the refined point and records the period, the peak-to-peak amplitude of u and the
     nontrivial Floquet multipliers,
and prints the ratio (peak-to-peak u)^2/delta.

Output: ../data/numerics_h2.txt.
"""
import os
import re
import sys
import time

import numpy as np
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hh_float as HF      # noqa: E402
import shoot_float as SF   # noqa: E402

OUT = os.path.join(HERE, '..', 'data', 'numerics_h2.txt')
HOPF = open(os.path.join(HERE, '..', 'data', 'certify_equilibria_hopf.txt')).read()
EL = 10.613
DELTAS = (1.0, 0.5, 0.25)

lines = []


def log(s=''):
    print(s, flush=True)
    lines.append(s)


def main():
    t0 = time.time()
    m = re.search(r'J_H2 for E_l = 10\.613 \(Hodgkin and Huxley\): \[([0-9.]+), ([0-9.]+)\]', HOPF)
    JH2 = float(m.group(1))
    m = re.search(r'16 \|q_u\|\^2 Re\(d lambda/dJ\)/\(omega l1\) in \[([0-9.]+), ([0-9.]+)\]\n\s+\(the normal-form '
                  r'prediction of \(peak-to-peak u amplitude\)\^2 / \|J - J_H2\|', HOPF)
    pred = float(m.group(1))
    log('NUMERICAL ONLY: small periodic orbits below the supercritical Hopf point J_H2, E_l = %g' % EL)
    log('  (float64, scipy DOP853 at rtol 1e-10 for the transient, shoot_float at rtol 1e-12; not used in any proof)')
    log('  J_H2 = %.12f (data/certify_equilibria_hopf.txt); predicted limit of (peak-to-peak u)^2/(J_H2 - J): %.6f'
        % (JH2, pred))
    for d in DELTAS:
        J = JH2 - d
        xe = HF.equilibrium(J, EL)
        ev = np.linalg.eigvals(HF.jac(xe, J, EL))
        y0 = xe.copy()
        y0[0] += 0.5 * np.sqrt(pred * d)
        cross = lambda t, y, J, EL: y[0] - xe[0]
        cross.direction = 1
        sol = solve_ivp(HF.f, [0, 4000.0], y0, args=(J, EL), method='DOP853', rtol=1e-10, atol=1e-12, events=cross)
        z0 = sol.y_events[0][-1][1:]
        tail = sol.t > 3900.0
        p2p_tail = sol.y[0][tail].max() - sol.y[0][tail].min()
        z, T, DP, V = SF.newton(z0, J, xe[0], EL=EL)
        P = SF.poincare(z, J, xe[0], EL)[0]
        mu = np.linalg.eigvals(DP)
        x0 = np.concatenate([[xe[0]], z])
        one = solve_ivp(HF.f, [0, T], x0, args=(J, EL), method='DOP853', rtol=1e-12, atol=1e-14, dense_output=True)
        ts = np.linspace(0, T, 200001)
        us = one.sol(ts)[0]
        p2p = us.max() - us.min()
        log('')
        log('  J_H2 - J = %.2f (J = %.6f): equilibrium u* = %.6f, largest real part of an eigenvalue %.3e'
            % (d, J, xe[0], ev.real.max()))
        log('    after 4000 ms from u* + %.3f: peak-to-peak u over the last 100 ms %.6f mV' % (y0[0] - xe[0], p2p_tail))
        log('    Newton on {u = u*, du/dt > 0}: |P(z) - z| = %.1e, period %.6f ms, nontrivial multipliers %s'
            % (np.abs(P - z).max(), T, ', '.join('%.6f' % abs(x) for x in sorted(mu, key=abs, reverse=True))))
        log('    peak-to-peak u %.6f mV, u in [%.6f, %.6f]; (peak-to-peak u)^2/(J_H2 - J) = %.4f'
            % (p2p, us.min(), us.max(), p2p ** 2 / d))
    log('')
    log('  run time %.1f s' % (time.time() - t0))
    with open(OUT, 'w') as f:
        f.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
