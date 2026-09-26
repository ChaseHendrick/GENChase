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
"""Computer-assisted existence proof driver for the fast travelling pulse of Faye's model.
Adapted from papers/nf-pulse/code/prove_pulse.py (same argument; the model, manifold and block modules differ).

usage: FAYE_EPS=1/20 python3 prove_pulse.py {interval|c1|c2|custom:<num>:<exp10>:<sign>} [T_enter]

 interval : integrate the box containing {(P_c(THETA0), 1/c) : c in [c1, c2]} from xi = 0 to xi = T_enter
            and check that the enclosure lies in the interior of the block B.
 c1 / c2  : integrate the thin orbit from P_c(THETA0) to T_enter, check it is in int B there, continue
            while checking that the whole path (step ranges) stays in int B, until the enclosure lies in
            the cone K(SIDE_C1) (for c1) or K(SIDE_C2) (for c2).

The block B = {|y1| <= r, |y'|_2 <= rho}, y = T (x - x*), and its certificate come from block.py.
Everything printed as PASS is a rigorous (ball-arithmetic) statement.
"""
import sys, time, json, math, os
from flint import arb, arb_mat, ctx, fmpq
import config as cf
ctx.prec = int(os.environ.get('NF_PREC', cf.get()['prec']))
import fcore as nf, certify_rest as cr, manifold as mf, lohner as lo, block as bl

THETA0 = fmpq(*[int(t) for t in os.environ.get('NF_THETA0', cf.get()['theta0']).split('/')])   # manifold parameter of the start point
SIGMA = fmpq(*[int(t) for t in cf.get()['sigma'].split('/')])                    # manifold scaling (exact)
NMAN = int(os.environ.get('NF_NMAN', cf.get()['nman']))                                          # manifold order


def block_data():
    kappa = (1 / cr.C1).union(1 / cr.C2)
    ok, info, T, Tinv, r, rho = bl.block_for(nf.eps_txt(), kappa)
    assert ok, info
    info['rho'] = rho.str(10)
    info['r'] = r.str(10)
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
    hint = lo.ball(0, h)
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
    ctx.prec = int(os.environ.get('NF_PREC', cf.get()['prec']))    # (imports above may reset it)
    t_start = time.time()
    T, Tinv, rho, r, binfo = block_data()
    xstar = nf.rest_state()
    expect = None
    if which == 'interval':
        cc = cr.C1.union(cr.C2)
    elif which == 'c1':
        cc = cr.C1; expect = cr.SIDE_C1
    elif which == 'c2':
        cc = cr.C2; expect = cr.SIDE_C2
    else:
        # negative control:  custom:<numerator>:<exp10>:<expected sign>  -> c = numerator / 10^exp10
        _, num, ex, sg = which.split(':')
        cc = arb(fmpq(int(num), 10 ** int(ex))); expect = int(sg)
    kappa = 1 / cc
    mu = mf.unstable_eig(kappa)
    sigma = arb(SIGMA)                 # fixed in config.py: the same family P_c(theta0) in all runs
    ok, a, rr, minfo = mf.validate(kappa, mu, sigma, NMAN)
    assert ok, minfo
    x0 = mf.evaluate(a, rr, arb(THETA0))
    X = lo.LohnerSet.from_box(x0 + [kappa])
    T6m = T6(T)
    log = {'which': which, 'prec': ctx.prec, 'c': cc.str(40), 'block': binfo, 'manifold': {k: minfo[k] for k in ('sigma', 'tail_r', 'ok')}, 'theta0': str(THETA0), 'params': nf.PARAMS_TXT(),
           'x0_radius': [float(v.rad()) for v in x0], 'events': []}
    print(which, 'block', binfo, flush=True)
    print(which, 'manifold validated, x0 radii', log['x0_radius'], flush=True)
    order = int(os.environ.get('NF_ORDER', cf.get()['order']))
    tol = float(os.environ.get('NF_TOL', cf.get()['tol']))
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
            h = float((t - tp).mid())
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
        json.dump(log, open('../data/proof_eps%s_%s%s.json' % (nf.eps_txt().replace('/', '_'), which.replace(':', '_'), os.environ.get('NF_TAG', '')), 'w'), indent=1)
        print(which, 'VERDICT FAIL:', log['reason'], flush=True)
        return
    assert float(t.mid()) == float(T_enter)
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
    # enclosure of the largest u over the step end points of phase 1; its lower end is a rigorous lower bound
    # for sup u along every orbit of the set (its upper end is not an upper bound for sup u between steps)
    log['max_u_at_step_ends_phase1'] = state['maxU'].str(10)
    log['sup_u_lower_bound'] = arb(state['maxU'].lower()).str(10)
    print(which, 'AT T=%s: in int B: %s ; y=%s ; |y\'|<=%s (rho=%s, r=%s)' % (
        T_enter, inB, [v.str(6) for v in y], ynorm2_upper(y[1:]).str(6), rho.str(6), r.str(6)), flush=True)
    if which == 'interval' or not inB:
        log['verdict'] = 'PASS' if inB else 'FAIL'
        log['time_s'] = round(time.time() - t_start)
        json.dump(log, open('../data/proof_eps%s_%s%s.json' % (nf.eps_txt().replace('/', '_'), which.replace(':', '_'), os.environ.get('NF_TAG', '')), 'w'), indent=1)
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
    json.dump(log, open('../data/proof_eps%s_%s%s.json' % (nf.eps_txt().replace('/', '_'), which.replace(':', '_'), os.environ.get('NF_TAG', '')), 'w'), indent=1)
    print(which, 'phase2:', state['phase'], log.get('t_K'), log.get('y_at_tK'), 'VERDICT', log['verdict'], flush=True)


if __name__ == '__main__':
    which = sys.argv[1]
    T_enter = float(sys.argv[2]) if len(sys.argv) > 2 else cf.get()['T_enter']
    main(which, T_enter)
