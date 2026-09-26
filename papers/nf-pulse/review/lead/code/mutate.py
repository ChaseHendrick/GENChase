#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Mutation harness for the nf-pulse certificate chain (code review, 2026-09-26).
#
# HOW TO RUN (from anywhere; never runs anything inside the repository tree):
#
#     python3 papers/nf-pulse/review/lead/code/mutate.py <scratch_dir> [mutation_id ...]
#
# For each mutation it copies papers/nf-pulse (without __pycache__ and without review/) to
# <scratch_dir>/<mutation_id>/, applies ONE patch by exact string replacement (each old string must occur
# exactly once, or the mutation is reported as BADPATCH), runs `sh code/run_all.sh` in the copy with a
# 900 s timeout, and records which of the 15 checks print FAIL.  The table is printed and written to
# <scratch_dir>/mutation_results.txt.  With no ids given, every mutation runs, sequentially (run_all.sh
# itself uses up to 3 processes).  Expected total time: 10 to 20 minutes on 4 shared cores.
#
# Column "should" is the outcome a sound test suite must give:
#   fail   : the mutation breaks soundness or the claim, so at least one check must FAIL;
#   either : the mutation keeps the proof sound (only a weaker enclosure), so pass or fail are both fine;
#   pass   : the proof must still pass.
# A row with should = fail and no failing check is a hole in the test suite.
#
# SECOND MODE:   python3 mutate.py --stress <scratch_dir> [mutation_id ...]
# runs review/lead/code/lohner_stress.py (a low-order integrator test against mpmath, not part of run_all.sh)
# on each mutated copy instead of run_all.sh, for the integrator mutations (default: STRESS_IDS), and
# writes <scratch_dir>/stress_results.txt.  20 s to 2 min per mutation on shared cores.
import os, re, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', '..'))       # papers/nf-pulse

LABELS = ['R', 'R-neg', 'M-c1', 'M-c2', 'M-int', 'M-neg', 'B', 'B-neg', 'B-iv', 'J',
          'P-int', 'P-c1', 'P-c2', 'N-same', 'N-far']

# (id, should, description, [(file, old, new), ...], extra environment)
MUTATIONS = [
    ('m00_none', 'pass', 'no mutation (baseline)', [], {}),
    # (1) Taylor remainder
    ('m01_drop_remainder', 'fail', 'lohner.step: Lagrange remainder set to 0',
     [('code/lohner.py',
       'Rem = [valsW[i][order + 1] * hA ** (order + 1) for i in range(5)] + [arb(0)]',
       'Rem = [arb(0)] * 6')], {}),
    ('m01b_remainder_on_Xh', 'fail', 'lohner.step: remainder coefficient evaluated on [X] instead of the a priori set W',
     [('code/lohner.py', '    valsW = taylor_vals(W, order + 1)\n    Rem',
       '    valsW = taylor_vals(Xh, order + 1)\n    Rem')], {}),
    ('m01c_path_remainder_dropped', 'fail', 'prove_pulse.step_range_y: remainder of the between-steps path bound dropped',
     [('code/prove_pulse.py', "rem = [valsW[i][order + 1] * lo.ball(0, arb(h) ** (order + 1)) for i in range(4)]",
       "rem = [arb(0) for i in range(4)]")], {}),
    # (2) a priori enclosure
    ('m02_apriori_accept_all', 'fail', 'lohner.rough_enclosure: accept the first candidate W without the Picard test',
     [('code/lohner.py', 'if hull_contains_interior(W, cand[:5]) and W[5].contains(cand[5]):', 'if True:')], {}),
    ('m02b_apriori_lower_only', 'fail', 'lohner.hull_contains_interior: only the lower ends are compared',
     [('code/lohner.py', 'if not (o.lower() < i.lower() and i.upper() < o.upper()):', 'if not (o.lower() < i.lower()):')], {}),
    # (3) QR
    ('m03a_B_identity', 'either', 'lohner.step: B\' = identity (no QR), rigorous inverse kept (sound, only wrapping)',
     [('code/lohner.py', '    B2 = qr_orth(P)\n',
       '    B2 = arb_mat([[1 if i == j else 0 for j in range(n)] for i in range(n)])\n')], {}),
    ('m03b_Binv_transpose', 'fail', 'lohner.step: B\'^{-1} replaced by the transpose (float Q assumed orthogonal)',
     [('code/lohner.py', '    B2inv = B2.inv()\n', '    B2inv = B2.transpose()\n')], {}),
    ('m03c_B_nonorth_rig_inv', 'either', 'lohner.step: B\' = mid(J B) itself, not orthogonalised; rigorous inverse (parallelepiped method, sound)',
     [('code/lohner.py', '    B2 = qr_orth(P)\n', '    B2 = P\n')], {}),
    ('m03d_Binv_midpoint', 'fail', 'lohner.step: B\'^{-1} replaced by the midpoint of its enclosure (radius dropped)',
     [('code/lohner.py', '    B2inv = B2.inv()\n', '    B2inv = mid_mat(B2.inv())\n')], {}),
    ('m03e_Binv_perturbed', 'fail', 'lohner.step: B\'^{-1} replaced by a matrix that is not the inverse (Q^T times 1.001)',
     [('code/lohner.py', '    B2inv = B2.inv()\n', "    B2inv = B2.transpose() * arb('1.001')\n")], {}),
    # (4) block condition (C)
    ('m04_cone_always_pd', 'fail', 'block.interval_pd: leading minors only need > -1 (cone condition C weakened)',
     [('code/block.py', 'if not (sub.det() > 0):', 'if not (sub.det() > -1):')], {}),
    ('m04b_cone_ignored', 'fail', 'block.check: result of the cone test (C) ignored',
     [('code/block.py', '        okC &= pd\n', '        okC &= True\n')], {}),
    # (5) entrance condition (E)
    ('m05_entrance_weak', 'fail', 'block.check: entrance margin needs only < 1 instead of < 0',
     [('code/block.py', 'okE &= bool(e < 0)', 'okE &= bool(e < 1)')], {}),
    ('m05b_entrance_no_offdiag', 'fail', 'block.check: ||At_21|| dropped from the entrance bound',
     [('code/block.py', '        e = gmax + fro\n', '        e = gmax\n')], {}),
    # (6) cone test
    ('m06_flip_in_K', 'fail', 'prove_pulse.in_K: K+ and K- swapped',
     [('code/prove_pulse.py', 'v = y[0] if sign > 0 else -y[0]', 'v = -y[0] if sign > 0 else y[0]')], {}),
    ('m06b_flip_sides', 'fail', 'certify_rest: expected sides of c1 and c2 swapped',
     [('code/certify_rest.py', 'SIDE_C1, SIDE_C2 = -1, +1', 'SIDE_C1, SIDE_C2 = +1, -1')], {}),
    ('m06c_in_K_nonstrict_abs', 'fail', 'prove_pulse.in_K: |y1| > |y\'| accepted for either sign',
     [('code/prove_pulse.py', 'v = y[0] if sign > 0 else -y[0]', 'v = abs(y[0])')], {}),
    # (7) bracket
    ('m07_c2_below_c1', 'fail', 'certify_rest: c2 = c1 - 1e-25 (both ends below c*)',
     [('code/certify_rest.py', 'C2 = arb(fmpq(11027477097341592491478678, 10**25))',
       'C2 = arb(fmpq(11027477097341592491478676, 10**25))')], {}),
    ('m07b_both_above', 'fail', 'certify_rest: c1 = c1 + 1e-25 (c1 = c2, both above c*)',
     [('code/certify_rest.py', 'C1 = arb(fmpq(11027477097341592491478677, 10**25))',
       'C1 = arb(fmpq(11027477097341592491478678, 10**25))')], {}),
    # (8) parameter perturbations
    ('m08_eps_plus_1e-20', 'fail', 'nfcore: eps = 1/10 + 1e-20 (moves c* by far more than the bracket width 1e-25)',
     [('code/nfcore.py', '_EPS = fmpq(1, 10) ', '_EPS = fmpq(1, 10) + fmpq(1, 10**20) ')], {}),
    ('m08b_theta_plus_1e-20', 'fail', 'nfcore: theta = 1/4 + 1e-20',
     [('code/nfcore.py', '_THETA = fmpq(1, 4) ', '_THETA = fmpq(1, 4) + fmpq(1, 10**20) ')], {}),
    ('m08c_beta_plus_1e-20', 'fail', 'nfcore: beta = 20 + 1e-20',
     [('code/nfcore.py', '_BETA = fmpq(20) ', '_BETA = fmpq(20) + fmpq(1, 10**20) ')], {}),
    ('m08d_eps_plus_1e-30', 'pass', 'nfcore: eps = 1/10 + 1e-30 (c* moves by ~1e-30, inside the bracket margins 3.6e-26 / 6.4e-26)',
     [('code/nfcore.py', '_EPS = fmpq(1, 10) ', '_EPS = fmpq(1, 10) + fmpq(1, 10**30) ')], {}),
    # kappa width
    ('m09_kappa_point', 'fail', 'prove_pulse: initial Lohner set carries only mid(kappa) (speed width dropped)',
     [('code/prove_pulse.py', 'X = lo.LohnerSet.from_box(x0 + [kappa])', 'X = lo.LohnerSet.from_box(x0 + [arb(kappa.mid())])')], {}),
    ('m10_no_dkappa_column', 'fail', 'lohner.taylor_jet: d/dkappa terms of the Jacobian dropped',
     [('code/lohner.py', '        gd[5] = gd[5] + w                              # d/dkappa of kappa*w\n', ''),
      ('code/lohner.py', '        gvv[5] = gvv[5] + eps * (U[k] - gam * V[k])\n', '')], {}),
    # manifold
    ('m11_manifold_no_tail', 'fail', 'manifold.evaluate: tail bound r_i |t|^(N+1) dropped',
     [('code/manifold.py', '        out.append(val + arb(0, err.upper()))', '        out.append(val)')], {}),
    ('m11b_manifold_accept', 'fail', 'manifold.validate: tail inequality G0 + Z(r) < rho not checked',
     [('code/manifold.py', '        if lhs < rho:', '        if True:')], {}),
    ('m11c_zbound_small', 'fail', 'manifold.zbound: K_i divided by 10^6',
     [('code/manifold.py', '    return [abs_up(zU), abs_up(zV), abs_up(zQ), abs_up(zP), abs_up(zY)]',
       "    return [abs_up(zU) / 10**6, abs_up(zV) / 10**6, abs_up(zQ) / 10**6, abs_up(zP) / 10**6, abs_up(zY) / 10**6]")], {}),
    # path, block size
    ('m12_T_enter_30', 'either', 'run_all.sh: integrate only to xi = 30 (proof should fail, soundly)',
     [('code/run_all.sh', 'NF_TAG=_final python3 prove_pulse.py $w 53', 'NF_TAG=_final python3 prove_pulse.py $w 30')], {}),
    ('m13_no_path_check', 'fail', 'prove_pulse: between-steps path check in phase 2 removed',
     [('code/prove_pulse.py', '            if not in_int_B(yr, rho, r):', '            if False:')], {}),
    ('m14_int_B_weak', 'fail', 'prove_pulse.in_int_B: |y\'| < 2 rho accepted',
     [('code/prove_pulse.py', 'bool(ynorm2_upper(y[1:]) < rho)', 'bool(ynorm2_upper(y[1:]) < 2 * rho)')], {}),
    ('m14b_no_urange_shrink', 'fail', 'prove_pulse.block_data: rho not shrunk until the U-range of B lies in |U| <= DU',
     [('code/prove_pulse.py', '    while not (bl.u_range(Tinv, rho * R_OVER_RHO, rho) < DU):', '    while False:')], {}),
    # the independent re-check and the Jacobian test
    ('m15_iv_recheck_fails', 'fail', 'block_check_iv: entrance bound must be < -1 (forces "FAILED")',
     [('code/block_check_iv.py', 'ok &= pd and ent < 0', 'ok &= pd and ent < -1')], {}),
    ('m16_jet_wrong', 'fail', 'lohner.taylor_jet: gradient of Y*Y multiplied by 3 instead of 2 (wrong Jacobian)',
     [('code/lohner.py', 'g_yy = [2 * v for v in g_yy]', 'g_yy = [3 * v for v in g_yy]')], {}),
    # asserts under python -O
    ('m17a_DU_0.15', 'fail', 'prove_pulse: block half width DU = 0.15 (block conditions fail; assert must stop the run)',
     [('code/prove_pulse.py', "os.environ.get('NF_DU', '0.05')", "os.environ.get('NF_DU', '0.15')")], {}),
    ('m17b_DU_0.15_python_O', 'fail', 'as m17a, run with PYTHONOPTIMIZE=1 (asserts stripped)',
     [('code/prove_pulse.py', "os.environ.get('NF_DU', '0.05')", "os.environ.get('NF_DU', '0.15')")], {'PYTHONOPTIMIZE': '1'}),
    # unmodified code, environment only (prove_pulse.py reads NF_DU, NF_R_OVER_RHO, NF_PREC, NF_ORDER, NF_TOL)
    ('m18_env_DU_python_O', 'fail', 'NO code change; environment NF_DU=0.15 PYTHONOPTIMIZE=1',
     [], {'PYTHONOPTIMIZE': '1', 'NF_DU': '0.15'}),
    ('m19_env_r_below_rho', 'fail', 'NO code change; environment NF_R_OVER_RHO=0.5 (block with r < rho; block.py requires r > rho)',
     [], {'NF_R_OVER_RHO': '0.5'}),
]


STRESS_IDS = ['m00_none', 'm01_drop_remainder', 'm01b_remainder_on_Xh', 'm02_apriori_accept_all',
              'm02b_apriori_lower_only', 'm03a_B_identity', 'm03b_Binv_transpose', 'm03c_B_nonorth_rig_inv',
              'm03d_Binv_midpoint', 'm03e_Binv_perturbed', 'm10_no_dkappa_column', 'm16_jet_wrong']


def stress(scratch, want):
    rows = []
    for mid, should, desc, patches, envx in MUTATIONS:
        if mid not in (want or STRESS_IDS):
            continue
        dst = os.path.join(scratch, 'stress_' + mid)
        copy_tree(dst)
        bad = apply(dst, patches)
        if bad:
            rows.append('%-28s %-6s %s' % (mid, should, bad))
            continue
        try:
            p = subprocess.run([sys.executable, os.path.join(HERE, 'lohner_stress.py'), os.path.join(dst, 'code')],
                               capture_output=True, text=True, timeout=900)
            out = p.stdout + p.stderr
        except subprocess.TimeoutExpired:
            out = 'TIMEOUT'
        if 'STRESS PASS' in out:
            res = 'STRESS PASS'
        elif 'STRESS FAIL' in out:
            bad_lines = [l.split(' contained')[0] for l in out.splitlines() if 'contained: False' in l]
            res = 'STRESS FAIL (first miss: %s)' % (bad_lines[0] if bad_lines else '?')
        else:
            res = 'CRASH: ' + (out.strip().splitlines() or ['?'])[-1][:90]
        verdict = res
        if should == 'fail' and res == 'STRESS PASS':
            verdict = 'NOT CAUGHT by stress'
        rows.append('%-28s %-6s %s' % (mid, should, verdict))
        print(rows[-1], flush=True)
    txt = 'nf-pulse integrator mutations against review/lead/code/lohner_stress.py\n\n' + '\n'.join(rows) + '\n'
    open(os.path.join(scratch, 'stress_results.txt'), 'w').write(txt)
    print(txt)


def copy_tree(dst):
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(SRC, dst, ignore=shutil.ignore_patterns('__pycache__', 'review'))


def apply(dst, patches):
    for f, old, new in patches:
        p = os.path.join(dst, f)
        s = open(p).read()
        n = s.count(old)
        if n != 1:
            return 'BADPATCH %s: old string found %d times' % (f, n)
        open(p, 'w').write(s.replace(old, new))
    return None


def run(dst, env_extra):
    env = dict(os.environ)
    env.update(env_extra)
    t0 = time.time()
    try:
        out = subprocess.run(['sh', 'code/run_all.sh'], cwd=dst, env=env, capture_output=True, text=True,
                             timeout=900).stdout
    except subprocess.TimeoutExpired:
        return None, time.time() - t0
    return out, time.time() - t0


def verdicts(dst):
    """one-line reasons from the proof logs (for the table notes)."""
    notes = []
    for f in ('final_interval.log', 'final_c1.log', 'final_c2.log', 'negctrl_samebracket.log', 'run_all_jacobian.log'):
        p = os.path.join(dst, 'data', 'logs', f)
        if not os.path.exists(p):
            continue
        lines = open(p).read().strip().splitlines()
        last = lines[-1] if lines else ''
        if f == 'run_all_jacobian.log':
            m = [l for l in lines if l.startswith('max |J_AD')]
            last = m[0].split('(')[0] if m else last
        elif 'Error' in last or 'assert' in last.lower():
            last = 'crash: ' + last
        elif 'phase2:' in last:
            last = last.split('phase2:')[1].split()[0] + ' ' + last[last.index('VERDICT'):]
        notes.append('%s: %s' % (f.replace('.log', ''), last[:110]))
    return notes


def main():
    if sys.argv[1] == '--stress':
        return stress(os.path.abspath(sys.argv[2]), set(sys.argv[3:]))
    scratch = os.path.abspath(sys.argv[1])
    want = set(sys.argv[2:])
    if scratch.startswith(os.path.normpath(os.path.join(SRC, '..', '..'))):
        sys.exit('refusing to run inside the repository tree')
    os.makedirs(scratch, exist_ok=True)
    rows = []
    for mid, should, desc, patches, envx in MUTATIONS:
        if want and mid not in want:
            continue
        dst = os.path.join(scratch, mid)
        copy_tree(dst)
        bad = apply(dst, patches)
        if bad:
            rows.append((mid, should, desc, bad, [], []))
            print(mid, bad, flush=True)
            continue
        out, dt = run(dst, envx)
        if out is None:
            rows.append((mid, should, desc, 'TIMEOUT', [], []))
            continue
        res = re.findall(r'^(OK|FAIL)\s', out, re.M)
        failed = [LABELS[i] for i, r in enumerate(res) if r == 'FAIL']
        if len(res) != 15:
            failed.append('(%d check lines)' % len(res))
        verdict = 'caught' if failed else 'all 15 OK'
        if should == 'fail' and not failed:
            verdict = 'NOT CAUGHT'
        if should == 'pass' and failed:
            verdict = 'SPURIOUS FAIL'
        rows.append((mid, should, desc, verdict, failed, verdicts(dst)))
        print('%-28s %-6s %-12s %5.0fs  failed: %s' % (mid, should, verdict, dt, ' '.join(failed) or '-'), flush=True)
    lines = ['nf-pulse mutation results (run_all.sh, 15 checks), generated by review/lead/code/mutate.py', '']
    lines.append('%-28s %-6s %-12s %s' % ('mutation', 'should', 'result', 'failing checks'))
    for mid, should, desc, verdict, failed, notes in rows:
        lines.append('%-28s %-6s %-12s %s' % (mid, should, verdict, ' '.join(failed) or '-'))
        lines.append('    ' + desc)
        for n in notes:
            lines.append('      ' + n)
    txt = '\n'.join(lines) + '\n'
    open(os.path.join(scratch, 'mutation_results.txt'), 'w').write(txt)
    print(txt)


if __name__ == '__main__':
    main()
