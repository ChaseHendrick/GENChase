#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Rigorous (ball arithmetic): the two orbits that bracket Hodgkin and Huxley's propagated action potential.

For K1 = 10.4383548 and K2 = 10.4383549 /ms at 18.5 C (speeds 18.73216 m/s to 5 digits), the branch of the unstable
manifold of rest that leaves the block of Lemma B through z1 = +r (the branch that fires) is integrated by the
Lohner integrator from the whole exit set of Lemma B. Claim: at K1 it reaches u < -60 mV with u' < 0 after the spike, at
K2 it reaches u > +150 mV with u' > 0. Negative control: at K1 the upward target is not certified. This is Hodgkin and Huxley's 1952 observation that the solution "diverges" in opposite
directions on the two sides of the speed, made rigorous. It is NOT a proof that the pulse exists: the closing
step (an isolating block at rest reached by the orbits of every K in between) is not done here.

Usage: python3 prove_bracket.py [r] [T]     (r: exit face of the block, default 1e-5; T = 18.5 or 6.3 C)
At 6.3 C the bracket is K1 = 4.5107697, K2 = 4.5107698 (12.31394 m/s).
"""
import sys
import time
import numpy as np
from flint import arb, arb_mat, ctx
import certify_rest_wave as C
import lohner_hh as L

ctx.prec = 128


def exit_set(B):
    """Lohner set for { y* + T^-1 (r e1 + z') : z' in the stable box }."""
    Ti, y, r = B['Ti'], B['y'], B['r']
    s2, s3, s5 = B['s']
    R0 = [C.ball(-s2, s2), C.ball(-s3, s3), C.ball(-s3, s3), C.ball(-s5, s5)]
    centre = [y[i] + Ti[i, 0] * r for i in range(5)]
    xbar = [arb(c.mid()) for c in centre]
    Cm = arb_mat([[arb(Ti[i, k + 1].mid()) for k in range(4)] for i in range(5)])
    Rr = [centre[i] - xbar[i] + sum(((Ti[i, k + 1] - Cm[i, k]) * R0[k] for k in range(4)), arb(0)) for i in range(5)]
    Bm = arb_mat([[1 if i == j else 0 for j in range(5)] for i in range(5)])
    return L.LSet(xbar, Cm, R0, Bm, Rr)


def run(K, phi, EL, B, target, p=20, tol=1e-32, tmax=12.0, log=100):
    F = L.Field(K, phi, EL)
    X = exit_set(B)
    info = {}

    def cb(tp, t, X, W):
        u = X.hull()[0]
        wid = max(float(arb(x.rad()).mid()) for x in X.hull())
        info['t'], info['u'], info['wid'] = t, u, wid
        info['umax'] = max(info.get('umax', -1e9), float(u.upper()))
        w = X.hull()[1]
        info['w'] = w
        # success: u past the target AND u' of the same sign, for every point of the set
        if target < 0 and u < target and w < 0:
            info['ok'] = True
            return True
        if target > 0 and u > target and w > 0:
            info['ok'] = True
            return True
        if float(u.rad()) > 20 or wid > 5000:
            info['ok'] = False
            return True
        return False
    t0 = time.time()
    X, t, ns = L.integrate(F, X, tmax, p=p, tol=tol, callback=cb, log=log)
    info['steps'], info['secs'] = ns, time.time() - t0
    info.setdefault('ok', False)
    return info


def main():
    r = float(sys.argv[1]) if len(sys.argv) > 1 else 1e-5
    T = float(sys.argv[2]) if len(sys.argv) > 2 else 18.5
    K1, K2 = (arb('10.4383548'), arb('10.4383549')) if T == 18.5 else (arb('4.5107697'), arb('4.5107698'))
    phi = C.phi_of(T)
    print('T = %s C' % T)
    y, EL = C.rest_state()
    Kb = K1.union(K2)
    sc = (r / 1e-4) ** 2
    B = C.lemma_B(Kb, phi, EL, r, (2e-9 * sc, 1e-7 * sc, 6e-9 * sc))
    print('Lemma B on the ball K in %s, r = %g: %s (stable box %s)' % (Kb.str(10), r, B['ok'],
          ', '.join(s.str(3) for s in B['s'])))
    if not B['ok']:
        return False
    ok = True
    runs = ((K1, -60, 'K1', True), (K2, 150, 'K2', True), (K1, 150, 'K1 (negative control)', False))
    for K, target, name, expect in runs:
        print('\n%s = %s: integrating the exit set until u %s %d mV' % (name, K.str(12), '<' if target < 0 else '>', target))
        info = run(K, phi, EL, B, target)
        print('  %s after %d steps (%.0f s): t = %s ms, u in %s, u\' in %s, max u upper bound at step ends %.4f, '
              'max radius %.2e' % ('PROVED' if info['ok'] else 'NOT PROVED', info['steps'], info['secs'],
                                   info['t'].str(8), info['u'].str(8), info['w'].str(5), info['umax'], info['wid']))
        if not expect:
            print('  negative control %s' % ('passed (the wrong escape is not certified)' if not info['ok'] else 'FAILED'))
        ok = ok and (info['ok'] == expect)
    print('\nALL CHECKS PASSED' if ok else '\nSOME CHECK FAILED')
    return ok


if __name__ == '__main__':
    sys.exit(0 if main() else 1)
