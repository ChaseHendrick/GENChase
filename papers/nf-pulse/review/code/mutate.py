#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Mutation driver for the nf-pulse certificate chain (code review, 2026-09-26).

For each mutation: copy papers/nf-pulse (code/ and data/ only) to <scratch>/mut/<name>/nf-pulse, apply ONE
textual edit (each `old` must occur exactly once in its file), run code/run_all.sh in the copy and record
which of the 15 checks print FAIL.  The real folder is never touched.

The only edit made to every copy, the baseline included, is in run_all.sh: the three proof runs are made
sequential instead of parallel (`& done; wait` -> `; done`) to keep CPU use at one core.  That changes
scheduling only.

usage: python3 mutate.py [name ...]      (no names: all mutations)
Writes results.json and results.md next to this file.
"""
import json, os, re, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.abspath(os.path.join(HERE, '..', '..'))                 # papers/nf-pulse
SCRATCH = os.environ.get('MUT_DIR', '/tmp/claude-0/-home-user-GENChase/6b4e32ba-2c25-5f83-9afb-b1a263f75129/scratchpad/mut')

SERIAL = ('for w in interval c1 c2; do NF_TAG=_final python3 prove_pulse.py $w 53 > $L/final_$w.log 2>&1 & done; wait',
          'for w in interval c1 c2; do NF_TAG=_final python3 prove_pulse.py $w 53 > $L/final_$w.log 2>&1 ; done')

# (name, file, old, new, what it tests)
MUTATIONS = [
    ('baseline', None, None, None, 'no change'),
    # ---------------------------------------------------------------- lohner.py
    ('M01_no_lagrange_remainder', 'lohner.py',
     'Rem = [valsW[i][order + 1] * hA ** (order + 1) for i in range(5)] + [arb(0)]',
     'Rem = [arb(0) for i in range(5)] + [arb(0)]',
     'drop the Lagrange remainder of the Lohner step'),
    ('M02a_picard_accept_unchecked', 'lohner.py',
     '    for _ in range(max_tries):\n        F = vf(W)',
     '    return W\n    for _ in range(max_tries):\n        F = vf(W)',
     'a priori enclosure accepted without the Picard test'),
    ('M02b_picard_F_at_X_not_W', 'lohner.py',
     '        F = vf(W)\n',
     '        F = vf(list(Xh))\n',
     'Picard test with F evaluated on the initial box instead of the candidate W'),
    ('M02c_picard_no_inflation_tiny_W', 'lohner.py',
     '    W0 = [poly_on_interval(vals[i], hint) for i in range(5)] + [Xh[5]]\n    W = []\n    for w in W0:\n        rad = arb(w.rad()) * arb(\'0.2\') + arb(2) ** (-ctx.prec // 2)\n        W.append(w + ball(-rad, rad))',
     '    W0 = [poly_on_interval(vals[i], hint) for i in range(5)] + [Xh[5]]\n    return [arb(w.mid()) for w in W0[:5]] + [Xh[5]]\n    W = []',
     'a priori enclosure replaced by the midpoint of the Taylor guess, no test'),
    ('M03a_Binv_transpose', 'lohner.py',
     '    B2inv = B2.inv()',
     '    B2inv = B2.transpose()',
     'B^{-1} replaced by B^T (assumes exact orthogonality)'),
    ('M03b_no_QR_parallelepiped', 'lohner.py',
     '    B2 = qr_orth(P)',
     '    B2 = P',
     'no QR: B = mid(J B) itself, inverse still rigorous (sound by design)'),
    ('M03c_no_QR_and_transpose', 'lohner.py',
     '    B2 = qr_orth(P)\n    B2inv = B2.inv()',
     '    B2 = P\n    B2inv = B2.transpose()',
     'non-orthogonal B with B^T as inverse'),
    ('M03d_B_fixed_identity_inverse', 'lohner.py',
     '    B2inv = B2.inv()',
     '    B2inv = arb_mat(N, N)\n    for _i in range(N):\n        B2inv[_i, _i] = 1',
     'B^{-1} replaced by the identity'),
    ('M04_drop_dkappa_jacobian', 'lohner.py',
     '        gd[5] = gd[5] + w                              # d/dkappa of kappa*w',
     '        pass',
     'drop the d/dkappa term of U\' in the Jacobian (kappa column)'),
    ('M05_drop_dkappa_V', 'lohner.py',
     "        gvv[5] = gvv[5] + eps * (U[k] - gam * V[k])",
     "        pass",
     'drop the d/dkappa term of V\' in the Jacobian'),
    ('M06_jacobian_at_xbar_not_hull', 'lohner.py',
     '    vals, grads = taylor_jet(Xh, order)',
     '    vals, grads = taylor_jet(X.xbar, order)',
     'mean-value Jacobian evaluated at the point xbar instead of over the hull'),
    ('M07_remainder_at_point', 'lohner.py',
     '    valsW = taylor_vals(W, order + 1)\n    Rem',
     '    valsW = taylor_vals(X.xbar, order + 1)\n    Rem',
     'Lagrange remainder coefficient evaluated at xbar instead of over W'),
    ('M08_drop_C_residual', 'lohner.py',
     '    lin = matvec(JC - C2, X.R0)',
     '    lin = [arb(0)] * N',
     'drop the (J C - mid(J C)) R0 term'),
    ('M09_hull_interior_always', 'lohner.py',
     '        if not (o.lower() < i.lower() and i.upper() < o.upper()):\n            return False',
     '        pass',
     'hull_contains_interior always True (Picard test vacuous)'),
    # ---------------------------------------------------------------- block.py
    ('M10_cone_C_always', 'block.py',
     '        okC &= pd',
     '        okC &= True',
     'condition (C) not enforced'),
    ('M11_cone_C_only_one_s', 'block.py',
     '    for s in (smin, smax):\n        At = T',
     '    for s in (smin,):\n        At = T',
     '(C) and (E) checked at s = smin only'),
    ('M12_entrance_E_always', 'block.py',
     '        okE &= bool(e < 0)',
     '        okE &= True',
     'condition (E) not enforced'),
    ('M13_entrance_E_weakened', 'block.py',
     '        e = gmax + fro',
     '        e = gmax',
     '(E) without the off-diagonal ||A21|| term'),
    ('M14_block_urange_x3', 'prove_pulse.py',
     '    while not (bl.u_range(Tinv, rho * R_OVER_RHO, rho) < DU):',
     '    while not (bl.u_range(Tinv, rho * R_OVER_RHO, rho) < 3 * DU):',
     'block B allowed a U-range three times the one (C),(E) were certified on'),
    ('M15_block_DU_check_wider_s', 'prove_pulse.py',
     "DU = arb(os.environ.get('NF_DU', '0.05'))",
     "DU = arb(os.environ.get('NF_DU', '0.15'))",
     'block with |U| <= 0.15 (S\' > 1 inside), should be refused'),
    # ---------------------------------------------------------------- prove_pulse.py
    ('M16_flip_cone_sides', 'certify_rest.py',
     '    SIDE_C1, SIDE_C2 = -1, +1 ',
     '    SIDE_C1, SIDE_C2 = +1, -1 ',
     'expected cones swapped (K+ for c1, K- for c2)'),
    ('M17_in_K_nonstrict_upper', 'prove_pulse.py',
     '    return bool(arb(v.lower()) > ynorm2_upper(y[1:]))',
     '    return bool(arb(v.upper()) > arb(ynorm2_upper(y[1:]).lower()))',
     'cone test on the most favourable point of the enclosure'),
    ('M18_skip_between_steps_check', 'prove_pulse.py',
     '            if not in_int_B(yr, rho, r):',
     '            if False:',
     'phase 2 path check (between grid points) removed'),
    ('M19_between_steps_no_remainder', 'prove_pulse.py',
     "    rem = [valsW[i][order + 1] * lo.ball(0, arb(h) ** (order + 1)) for i in range(4)]",
     "    rem = [arb(0) for i in range(4)]",
     'phase 2 path enclosure without its remainder'),
    ('M20_in_int_B_rho_x2', 'prove_pulse.py',
     '    return bool(arb(y[0].abs_upper()) < r) and bool(ynorm2_upper(y[1:]) < rho)',
     '    return bool(arb(y[0].abs_upper()) < r) and bool(ynorm2_upper(y[1:]) < 2 * rho)',
     'interior-of-B test with rho doubled'),
    ('M21_in_int_B_rho_x0p8', 'prove_pulse.py',
     '    return bool(arb(y[0].abs_upper()) < r) and bool(ynorm2_upper(y[1:]) < rho)',
     '    return bool(arb(y[0].abs_upper()) < r) and bool(ynorm2_upper(y[1:]) < rho * arb(\'0.8\'))',
     'interior-of-B test with rho x 0.8 (stricter; should fail if margin is thin)'),
    # ---------------------------------------------------------------- speeds and parameters
    ('M22_c2_eq_c1_plus_1e-26', 'certify_rest.py',
     '    C2 = arb(fmpq(11027477097341592491478678, 10**25))',
     '    C2 = arb(fmpq(110274770973415924914786771, 10**26))',
     'c2 = c1 + 1e-26, below c* (both ends on the K- side)'),
    ('M23_c2_eq_c1_plus_3e-26', 'certify_rest.py',
     '    C2 = arb(fmpq(11027477097341592491478678, 10**25))',
     '    C2 = arb(fmpq(110274770973415924914786773, 10**26))',
     'c2 = c1 + 3e-26, just below the numerical c* = c1 + 3.6e-26'),
    ('M24_c1_eq_c1_plus_4e-26', 'certify_rest.py',
     '    C1 = arb(fmpq(11027477097341592491478677, 10**25))',
     '    C1 = arb(fmpq(110274770973415924914786774, 10**26))',
     'c1 moved just above c* (both ends on the K+ side)'),
    ('M25_theta_plus_1e-20', 'nfcore.py',
     '_THETA = fmpq(1, 4)',
     '_THETA = fmpq(1, 4) + fmpq(1, 10**20)',
     'theta perturbed by 1e-20 in nfcore only'),
    ('M26_eps_plus_1e-20', 'nfcore.py',
     '_EPS = fmpq(1, 10)',
     '_EPS = fmpq(1, 10) + fmpq(1, 10**20)',
     'eps perturbed by 1e-20 in nfcore only'),
    ('M27_beta_plus_1e-20', 'nfcore.py',
     '_BETA = fmpq(20)',
     '_BETA = fmpq(20) + fmpq(1, 10**20)',
     'beta perturbed by 1e-20 in nfcore only'),
    ('M28_both_c_plus_1e-20', 'certify_rest.py',
     '    C1 = arb(fmpq(11027477097341592491478677, 10**25))',
     '    C1 = arb(fmpq(11027477097341592491478677 + 10**5, 10**25))',
     'c1 moved up by 1e-20 (c1 > c2 then)'),
    ('M29_eps_float_0p1', 'nfcore.py',
     '_EPS = fmpq(1, 10)',
     '_EPS = fmpq(*(0.1).as_integer_ratio())',
     'eps from the double 0.1 (= 0.1 + 5.55e-18)'),
    # ---------------------------------------------------------------- manifold.py
    ('M30_manifold_no_tail', 'manifold.py',
     '        out.append(val + arb(0, err.upper()))',
     '        out.append(val)',
     'unstable manifold tail bound dropped at evaluation'),
    ('M31_manifold_validate_always', 'manifold.py',
     '        if lhs < rho:',
     '        if True:',
     'tail fixed-point inequality not enforced'),
    ('M32_manifold_wrong_eigvec', 'certify_rest.py',
     "    return [arb(1), eps * kappa / lam, -s / (lam * lam - 1), -s * lam / (lam * lam - 1), s]",
     "    return [arb(1), eps * kappa / lam, -s / (lam * lam - 1) * arb('1.001'), -s * lam / (lam * lam - 1), s]",
     'eigenvector perturbed by 1e-3 in one component'),
    ('M33_manifold_t_1', 'prove_pulse.py',
     '    x0 = mf.evaluate(a, rr, arb(fmpq(1, 4)))',
     '    x0 = mf.evaluate(a, rr, arb(fmpq(3, 2)))',
     'manifold evaluated at t = 3/2, outside the validated |t| <= 1'),
    # ---------------------------------------------------------------- block_check_iv / run_all
    ('M34_iv_check_fails', 'block_check_iv.py',
     '        ok &= pd and ent < 0',
     '        ok &= pd and ent < -1',
     'independent block re-check made to FAIL (does run_all notice?)'),
    ('M35_iv_crash_after_print', 'block_check_iv.py',
     "    print('dU', dU, 'cone PD",
     "    print('dU', dU, 'cone PD",
     'placeholder (unused)'),
    ('M36_rest_s_ge_1_theta', 'certify_rest.py',
     '    ok_s = bool(s < 1)',
     '    ok_s = True',
     'R2 s < 1 not enforced'),
    ('M37_jacobian_test_broken', 'lohner.py',
     "        gQ.append([v / kp1 for v in gP[k]])",
     "        gQ.append([v / kp1 * 2 for v in gP[k]])",
     'wrong Jacobian (dQ row doubled): caught by test J? by the proof?'),
    ('M38_negctrl_wrong_field', 'nfcore.py',
     "        P.append((Q[k] - Y[k]) / kp1)",
     "        P.append((Q[k] - Y[k] * arb('1.0000000001')) / kp1)",
     'Taylor recursion inconsistent with vfield (P\' = Q - 1.0000000001 Y)'),
]
MUTATIONS = [m for m in MUTATIONS if m[0] != 'M35_iv_crash_after_print']


def run(name, fname, old, new):
    root = os.path.join(SCRATCH, name)
    dst = os.path.join(root, 'nf-pulse')
    if os.path.exists(root):
        shutil.rmtree(root)
    os.makedirs(root)
    for sub in ('code', 'data'):
        shutil.copytree(os.path.join(SRC, sub), os.path.join(dst, sub),
                        ignore=shutil.ignore_patterns('__pycache__', 'logs'))
    ra = os.path.join(dst, 'code', 'run_all.sh')
    txt = open(ra).read()
    assert txt.count(SERIAL[0]) == 1
    open(ra, 'w').write(txt.replace(SERIAL[0], SERIAL[1]))
    if fname:
        p = os.path.join(dst, 'code', fname)
        t = open(p).read()
        n = t.count(old)
        assert n == 1, (name, fname, n)
        open(p, 'w').write(t.replace(old, new))
    t0 = time.time()
    r = subprocess.run(['sh', ra], capture_output=True, text=True, timeout=1800)
    lines = r.stdout.splitlines()
    fails = [l[6:] for l in lines if l.startswith('FAIL  ')]
    oks = [l for l in lines if l.startswith('OK    ')]
    return {'name': name, 'rc': r.returncode, 'n_ok': len(oks), 'fails': fails,
            'time_s': round(time.time() - t0, 1), 'stdout': r.stdout}


def short(label):
    return label.split(':')[0] + ':' + label.split(':', 1)[1][:48] if ':' in label else label


if __name__ == '__main__':
    want = sys.argv[1:]
    out_json = os.path.join(HERE, 'results.json')
    results = json.load(open(out_json)) if os.path.exists(out_json) else {}
    for name, fname, old, new, what in MUTATIONS:
        if want and name not in want:
            continue
        res = run(name, fname, old, new)
        res['what'] = what; res['file'] = fname
        results[name] = res
        print('%-34s rc=%d ok=%2d fails=%s (%.0fs)' % (name, res['rc'], res['n_ok'], [short(f) for f in res['fails']], res['time_s']), flush=True)
        json.dump(results, open(out_json, 'w'), indent=1)
    # markdown table
    rows = ['| Mutation | File | What | run_all exit | Checks that fail |', '|---|---|---|---|---|']
    order = [m[0] for m in MUTATIONS]
    for name in order:
        if name not in results:
            continue
        r = results[name]
        f = '; '.join(x.split(':')[0] + ' ' + x.split(':', 1)[1].strip()[:60] for x in r['fails']) or '**none (all 15 pass)**'
        rows.append('| %s | %s | %s | %d | %s |' % (name, r.get('file') or '', r['what'], r['rc'], f))
    open(os.path.join(HERE, 'results.md'), 'w').write('\n'.join(rows) + '\n')
