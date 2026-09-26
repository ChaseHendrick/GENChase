#!/usr/bin/env python3
"""Mutation catalogue for the nf-pulse proof code (audit, 2026-09-26).

Each mutation is a list of (file under code/, old text, new text).  apply(name, root) edits the copy at
root and raises if any old text is not found exactly once, so a mutation can never be a silent no-op.
Usage:  python3 mutations.py list            -> names
        python3 mutations.py apply NAME ROOT -> edit ROOT/code/*
"""
import sys, os

M = {
 # ---- lohner.py: remainder
 'lo_no_remainder': [('lohner.py',
    'Rem = [valsW[i][order + 1] * hA ** (order + 1) for i in range(5)] + [arb(0)]',
    'Rem = [arb(0) for i in range(5)] + [arb(0)]')],
 'lo_rem_at_xbar': [('lohner.py',
    'valsW = taylor_vals(W, order + 1)',
    'valsW = taylor_vals(X.xbar, order + 1)')],
 'lo_rem_order_p2': [('lohner.py',
    'valsW = taylor_vals(W, order + 1)\n    Rem = [valsW[i][order + 1] * hA ** (order + 1) for i in range(5)] + [arb(0)]',
    'valsW = taylor_vals(W, order + 2)\n    Rem = [valsW[i][order + 2] * hA ** (order + 2) for i in range(5)] + [arb(0)]')],
 # ---- lohner.py: a priori enclosure
 'lo_apriori_no_test': [('lohner.py',
    'if hull_contains_interior(W, cand[:5]) and W[5].contains(cand[5]):',
    'if True:')],
 'lo_apriori_W_is_X': [('lohner.py',
    '    for _ in range(max_tries):\n        F = vf(W)',
    '    return list(Xh)\n    for _ in range(max_tries):\n        F = vf(W)')],
 'lo_apriori_half_step': [('lohner.py',
    'cand = [Xh[i] + hint * F[i] for i in range(6)]',
    'cand = [Xh[i] + ball(0, h / 2) * F[i] for i in range(6)]')],
 # ---- lohner.py: QR / B
 'lo_B_identity': [('lohner.py',
    'B2 = qr_orth(P)',
    'B2 = arb_mat([[1 if i == j else 0 for j in range(n)] for i in range(n)])')],
 'lo_B_parallelepiped': [('lohner.py',
    'B2 = qr_orth(P)',
    'B2 = mid_mat(JB)')],
 'lo_Binv_transpose': [('lohner.py',
    'B2inv = B2.inv()',
    'B2inv = B2.transpose()')],
 'lo_B_perturbed_transpose': [('lohner.py',
    'B2 = qr_orth(P)\n    B2inv = B2.inv()',
    "B2 = qr_orth(P) + arb_mat([[arb('1e-3') * (((i * 7 + j * 3) % 5) - 2) for j in range(n)] for i in range(n)])\n"
    "    B2 = mid_mat(B2)\n    B2inv = B2.transpose()")],
 # ---- lohner.py: Jacobian / mean-value form
 'lo_jac_no_dkappa': [('lohner.py',
    'gd[5] = gd[5] + w ', 'gd[5] = gd[5] + 0 '),
    ('lohner.py', 'gvv[5] = gvv[5] + eps * (U[k] - gam * V[k])', 'gvv[5] = gvv[5]')],
 'lo_jac_wrong_yy': [('lohner.py',
    'g_yy = [2 * v for v in g_yy]', 'g_yy = [3 * v for v in g_yy]')],
 'lo_jac_at_xbar': [('lohner.py',
    'vals, grads = taylor_jet(Xh, order)', 'vals, grads = taylor_jet(X.xbar, order)')],
 'lo_drop_lin': [('lohner.py',
    'lin = matvec(JC - C2, X.R0)', 'lin = [arb(0)] * n')],
 'lo_drop_JB_R': [('lohner.py',
    'R2 = [t1[i] + t2[i] for i in range(n)]', 'R2 = [t1[i] for i in range(n)]')],
 # ---- prove_pulse.py: kappa, path, cones
 'pp_interval_kappa_point': [('prove_pulse.py',
    'cc = cr.C1.union(cr.C2)', 'cc = cr.C1')],
 'pp_block_kappa_point': [('prove_pulse.py',
    'kappa = (1 / cr.C1).union(1 / cr.C2)\n    ok, info = bl.check',
    'kappa = 1 / cr.C1\n    ok, info = bl.check')],
 'pp_skip_between_steps': [('prove_pulse.py',
    'if not in_int_B(yr, rho, r):', 'if False:')],
 'pp_steprange_no_rem': [('prove_pulse.py',
    'rem = [valsW[i][order + 1] * lo.ball(0, arb(h) ** (order + 1)) for i in range(4)]',
    'rem = [arb(0) for i in range(4)]')],
 'pp_inB_ignore_y1': [('prove_pulse.py',
    "return bool(arb(y[0].abs_upper()) < r) and bool(ynorm2_upper(y[1:]) < rho)",
    "return bool(ynorm2_upper(y[1:]) < rho)")],
 'pp_cone_flip': [('prove_pulse.py',
    'v = y[0] if sign > 0 else -y[0]', 'v = -y[0] if sign > 0 else y[0]')],
 'pp_cone_upper_bound': [('prove_pulse.py',
    'return bool(arb(v.lower()) > ynorm2_upper(y[1:]))',
    'return bool(arb(v.upper()) > arb(ynorm2_upper(y[1:]).lower()))')],
 'pp_cone_drop_norm': [('prove_pulse.py',
    'return bool(arb(v.lower()) > ynorm2_upper(y[1:]))',
    'return bool(arb(v.lower()) > 0)')],
 'cr_same_cone_minus': [('certify_rest.py',
    'SIDE_C1, SIDE_C2 = -1, +1 ', 'SIDE_C1, SIDE_C2 = -1, -1 ')],
 'cr_same_cone_plus': [('certify_rest.py',
    'SIDE_C1, SIDE_C2 = -1, +1 ', 'SIDE_C1, SIDE_C2 = +1, +1 ')],
 'cr_c2_equals_c1': [('certify_rest.py',
    'C2 = arb(fmpq(11027477097341592491478678, 10**25))',
    'C2 = arb(fmpq(11027477097341592491478677, 10**25))')],
 # ---- parameters
 'par_eps_plus_1e-20': [('nfcore.py', '_EPS = fmpq(1, 10) ', '_EPS = fmpq(1, 10) + fmpq(1, 10**20) ')],
 'par_eps_minus_1e-20': [('nfcore.py', '_EPS = fmpq(1, 10) ', '_EPS = fmpq(1, 10) - fmpq(1, 10**20) ')],
 'par_theta_plus_1e-20': [('nfcore.py', '_THETA = fmpq(1, 4) ', '_THETA = fmpq(1, 4) + fmpq(1, 10**20) ')],
 'par_beta_plus_1e-20': [('nfcore.py', '_BETA = fmpq(20) ', '_BETA = fmpq(20) + fmpq(1, 10**20) ')],
 'par_eps_float': [('nfcore.py', '_EPS = fmpq(1, 10) ', '_EPS = 0.1 ')],
 'par_c_plus_1e-20': [('certify_rest.py',
    'C1 = arb(fmpq(11027477097341592491478677, 10**25))',
    'C1 = arb(fmpq(11027477097341592491478677, 10**25) + fmpq(1, 10**20))'),
    ('certify_rest.py',
    'C2 = arb(fmpq(11027477097341592491478678, 10**25))',
    'C2 = arb(fmpq(11027477097341592491478678, 10**25) + fmpq(1, 10**20))')],
 'par_c_minus_1e-20': [('certify_rest.py',
    'C1 = arb(fmpq(11027477097341592491478677, 10**25))',
    'C1 = arb(fmpq(11027477097341592491478677, 10**25) - fmpq(1, 10**20))'),
    ('certify_rest.py',
    'C2 = arb(fmpq(11027477097341592491478678, 10**25))',
    'C2 = arb(fmpq(11027477097341592491478678, 10**25) - fmpq(1, 10**20))')],
 'par_c1_widen_1e-20': [('certify_rest.py',
    'C1 = arb(fmpq(11027477097341592491478677, 10**25))',
    'C1 = arb(fmpq(11027477097341592491478677, 10**25) - fmpq(1, 10**20))')],
 # ---- block
 'bl_C_always_true': [('block.py', 'if not (sub.det() > 0):', 'if False:')],
 'bl_E_always_true': [('block.py', 'okE &= bool(e < 0)', 'okE &= True')],
 'bl_one_s_endpoint': [('block.py', 'for s in (smin, smax):', 'for s in (smin,):')],
 'bl_urange_drop_rho': [('block.py',
    'return a * r + arb(b.upper()) * rho', 'return a * r')],
 'bl_iv_recheck_broken': [('block_check_iv.py',
    'eps = iv.mpf(1) / 10', 'eps = iv.mpf(10)')],
 # ---- manifold
 'mf_no_tail': [('manifold.py', 'out.append(val + arb(0, err.upper()))', 'out.append(val)')],
 'mf_K_tiny': [('manifold.py',
    'K = zbound(mu0, kappa, s, eps)', 'K = [k / 10**6 for k in zbound(mu0, kappa, s, eps)]')],
 'mf_G0_zero': [('manifold.py',
    '        G0 += abs_up(gco[n])', '        G0 += 0')],
 # ---- own: block centred on a wrong rest state (semantic error the harness cannot see)
 'pp_xstar_shift_1e-4': [('prove_pulse.py',
    '    xstar = nf.rest_state()\n',
    "    xstar = nf.rest_state(); xstar[1] = xstar[1] + arb('1e-4')\n")],
 'pp_xstar_shift_1e-3': [('prove_pulse.py',
    '    xstar = nf.rest_state()\n',
    "    xstar = nf.rest_state(); xstar[1] = xstar[1] + arb('1e-3')\n")],
}


def apply(name, root):
    for fn, old, new in M[name]:
        p = os.path.join(root, 'code', fn)
        src = open(p).read()
        n = src.count(old)
        if n != 1:
            raise SystemExit('mutation %s: pattern found %d times in %s: %r' % (name, n, fn, old))
        open(p, 'w').write(src.replace(old, new))


if __name__ == '__main__':
    if sys.argv[1] == 'list':
        print('\n'.join(M))
    else:
        apply(sys.argv[2], sys.argv[3])
