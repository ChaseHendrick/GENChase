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
"""Computer-assisted existence proof driver for the fast travelling pulse.

usage: python3 prove_pulse.py {interval|c1|c2} [T_enter]

 interval : integrate the box containing {(P_c(1/4), 1/c) : c in [c1, c2]} from xi = 0 to xi = T_enter
            and check that the enclosure lies in the interior of the block B.
 c1 / c2  : integrate the thin orbit from P_c(1/4) to T_enter, check it is in int B there, continue
            while checking that the whole path (step ranges) stays in int B, until the enclosure lies in
            K- (for c1) or K+ (for c2).

The block B = {|y1| <= r, |y'|_2 <= rho}, y = T (x - x*), and its certificate come from block.py.
Everything printed as PASS is a rigorous (ball-arithmetic) statement.
"""
import sys, time, json, math, os
from flint import arb, arb_mat, ctx, fmpq
ctx.prec = int(os.environ.get('NF_PREC', '256'))
import nfcore as nf, certify_rest as cr, manifold as mf, lohner as lo, block as bl

DU = arb(os.environ.get('NF_DU', bl.DU_PROOF))              # U-range half width of the block
R_OVER_RHO = arb(os.environ.get('NF_R_OVER_RHO', bl.R_OVER_RHO_PROOF))


def block_data():
    T, Tinv = bl.setup()
    kappa = (1 / cr.C1).union(1 / cr.C2)
    nf.require(kappa.contains(1 / cr.C1) and kappa.contains(1 / cr.C2), 'block kappa ball does not cover 1/c1 and 1/c2')
    ok, info = bl.check(T, Tinv, (-DU, DU), kappa)
    nf.require(ok, 'block conditions (C) and (E) fail: %s' % info)
    rho, r, ur = bl.proof_block(T, Tinv, DU, R_OVER_RHO)
    info['rho'] = rho.str(10)
    info['r'] = r.str(10)
    info['U_range'] = ur.str(10)
    return T, Tinv, rho, r, info


def T6(T):
    """6 x 6 extension acting on (U,V,Q,P,Y,kappa) -> y (4 rows)."""
    M = arb_mat(4, 6)
    for i in range(4):
        for j in range(4):
            M[i, j] = T[i, j]
    return M


def ynorm2_upper(yp):
    return sum((arb(v.abs_upper()) ** 2 for v in yp), arb(0)).sqrt()


def in_int_B(y, rho, r):
    return bool(arb(y[0].abs_upper()) < r) and bool(ynorm2_upper(y[1:]) < rho)


def in_K(y, sign):
    """K+ : y1 > |y'|;  K- : -y1 > |y'|  (strictly, for the whole enclosure)."""
    v = y[0] if sign > 0 else -y[0]
    return bool(arb(v.lower()) > ynorm2_upper(y[1:]))


def step_range_y(Xh, W, h, order, T, xstar):
    """Enclosure of y(t) = T (x(t) - x*) for all t in [0, h] and all x0 in the box Xh:
       x(t) in sum_{k<=p} x_k(Xh) t^k + [0, h^{p+1}] x_{p+1}(W)."""
    vals = lo.taylor_vals(Xh, order)
    valsW = lo.taylor_vals(W, order + 1)
    hint = lo.ball(0, h)                  # h >= the step length; a larger h only enlarges the enclosure
    rem = [valsW[i][order + 1] * lo.ball(0, arb(h) ** (order + 1)) for i in range(4)]
    # polynomial coefficients of y(t)
    ycoef = []
    for a in range(4):
        co = []
        for k in range(order + 1):
            s = sum((T[a, i] * vals[i][k] for i in range(4)), arb(0))
            if k == 0:
                s = s - sum((T[a, i] * xstar[i] for i in range(4)), arb(0))
            co.append(s)
        ycoef.append(co)
    yr = [nf.horner(ycoef[a], hint) + sum((T[a, i] * rem[i] for i in range(4)), arb(0)) for a in range(4)]
    return yr


def main(which, T_enter):
    ctx.prec = int(os.environ.get('NF_PREC', '256'))    # (imports above reset it to 256)
    t_start = time.time()
    T, Tinv, rho, r, binfo = block_data()
    xstar = nf.rest_state()
    s = nf.dS(arb(0))
    expect = None
    if which == 'interval':
        cc = cr.C1.union(cr.C2)
        nf.require(cc.contains(cr.C1) and cc.contains(cr.C2), 'interval run does not cover c1 and c2')
    elif which == 'c1':
        cc = cr.C1; expect = cr.SIDE_C1
    elif which == 'c2':
        cc = cr.C2; expect = cr.SIDE_C2
    else:
        # negative control:  custom:<numerator>:<exp10>:<expected sign>  -> c = numerator / 10^exp10
        _, num, ex, sg = which.split(':')
        cc = arb(fmpq(int(num), 10 ** int(ex))); expect = int(sg)
    kappa = 1 / cc
    co = cr.charpoly_coeffs(kappa, s, nf.EPS)
    lam = cr.refine(co, arb('0.5'), arb('1.2'))
    sigma = arb(mf.SIGMA)              # fixed exact-rational scaling, the one manifold.py validates
    ok, a, rr, minfo = mf.validate(kappa, lam, sigma, 80)
    nf.require(ok, 'unstable manifold not validated: %s' % minfo)
    x0 = mf.evaluate(a, rr, arb(fmpq(1, 4)))
    X = lo.LohnerSet.from_box(x0 + [kappa])
    T6m = T6(T)
    log = {'which': which, 'prec': ctx.prec, 'c': cc.str(40), 'block': binfo, 'manifold': {k: minfo[k] for k in ('rho', 'r', 'ok')},
           'x0_radius': [float(v.rad()) for v in x0], 'events': []}
    print(which, 'block', binfo, flush=True)
    print(which, 'manifold validated, x0 radii', log['x0_radius'], flush=True)
    order = int(os.environ.get('NF_ORDER', '30'))
    tol = float(os.environ.get('NF_TOL', '1e-45'))
    state = {'phase': 'approach', 'maxU': None, 'steps': 0}

    def cb(tp, t, Xn, W):
        state['steps'] += 1
        hx = Xn.hull()
        if any(abs(float(v.mid())) > 5 for v in hx[:5]):
            state['phase'] = 'escaped_far_from_pulse'
            return True
        u = hx[0]
        state['maxU'] = u if state['maxU'] is None else state['maxU'].max(u)
        if state['steps'] % 25 == 0:
            y = Xn.affine_image_hull(T6m, xstar + [arb(0), arb(0)])
            print('%s t=%.3f steps=%d maxrad=%.2e y1=%s |y\'|<=%.3e  (%.0fs)' % (
                which, float(t.mid()), state['steps'], max(float(v.rad()) for v in hx[:5]),
                y[0].str(5), float(ynorm2_upper(y[1:]).mid()), time.time() - t_start), flush=True)
        if state['phase'] == 'inside':
            # whole step range must stay in int B
            h = arb((t - tp).upper())          # an upper bound of the step length (exact here)
            yr = step_range_y(state['prevhull'], W, h, order, T, xstar)
            if not in_int_B(yr, rho, r):
                state['phase'] = 'left_B_unverified'
                return True
            y = Xn.affine_image_hull(T6m, xstar + [arb(0), arb(0)])
            sign = expect
            if in_K(y, sign):
                state['phase'] = 'in_K'
                state['t_K'] = t
                state['y_K'] = y
                return True
            if in_K(y, -sign):
                state['phase'] = 'wrong_cone'
                return True
        state['prevhull'] = Xn.hull()
        return False

    # phase 1: 0 -> T_enter
    X, t, ns = lo.integrate(X, T_enter, order=order, tol=tol, hmax=0.25, callback=cb)
    if state['phase'] == 'escaped_far_from_pulse':
        log['verdict'] = 'FAIL'
        log['reason'] = 'orbit left |x|<5 at xi=%s before T_enter' % t.str(6)
        json.dump(log, open('../data/proof_%s%s.json' % (which.replace(':', '_'), os.environ.get('NF_TAG', '')), 'w'), indent=1)
        print(which, 'VERDICT FAIL:', log['reason'], flush=True)
        return
    nf.require(bool(t == arb(T_enter)), 'phase 1 did not end at T_enter')
    y = X.affine_image_hull(T6m, xstar + [arb(0), arb(0)])
    hx = X.hull()
    inB = in_int_B(y, rho, r)
    log['T_enter'] = T_enter
    log['y_at_T'] = [v.str(10) for v in y]
    log['y_at_T_radii'] = [float(v.rad()) for v in y]
    log['|y\'|_at_T'] = ynorm2_upper(y[1:]).str(10)
    log['x_at_T'] = [v.str(15) for v in hx]
    log['maxrad_at_T'] = max(float(v.rad()) for v in hx[:5])
    log['in_int_B_at_T'] = inB
    log['maxU_upper_phase1'] = state['maxU'].str(10)
    print(which, 'AT T=%s: in int B: %s ; y=%s ; |y\'|<=%s (rho=%s, r=%s)' % (
        T_enter, inB, [v.str(6) for v in y], ynorm2_upper(y[1:]).str(6), rho.str(6), r.str(6)), flush=True)
    if which == 'interval' or not inB:
        log['verdict'] = 'PASS' if inB else 'FAIL'
        log['time_s'] = round(time.time() - t_start)
        json.dump(log, open('../data/proof_%s%s.json' % (which.replace(':', '_'), os.environ.get('NF_TAG', '')), 'w'), indent=1)
        print(which, 'VERDICT', log['verdict'], flush=True)
        return
    # phase 2: continue inside B until the cone is reached
    state['phase'] = 'inside'
    state['prevhull'] = X.hull()
    X, t2, ns2 = lo.integrate(X, T_enter + 40, order=order, tol=tol, hmax=0.125, callback=cb, t0=float(t.mid()))
    log['phase2'] = state['phase']
    if state['phase'] == 'in_K':
        log['t_K'] = state['t_K'].str(10)
        log['y_at_tK'] = [v.str(10) for v in state['y_K']]
        log['y_at_tK_radii'] = [float(v.rad()) for v in state['y_K']]
        log['|y\'|_at_tK'] = ynorm2_upper(state['y_K'][1:]).str(10)
    log['verdict'] = 'PASS' if state['phase'] == 'in_K' else 'FAIL'
    log['time_s'] = round(time.time() - t_start)
    json.dump(log, open('../data/proof_%s%s.json' % (which.replace(':', '_'), os.environ.get('NF_TAG', '')), 'w'), indent=1)
    print(which, 'phase2:', state['phase'], log.get('t_K'), log.get('y_at_tK'), 'VERDICT', log['verdict'], flush=True)


if __name__ == '__main__':
    which = sys.argv[1]
    T_enter = int(sys.argv[2]) if len(sys.argv) > 2 else 53
    main(which, T_enter)
