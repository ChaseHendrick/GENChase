#!/usr/bin/env python3
"""Mutation study of the certificate programs: does a deliberately broken ingredient stop the program?

A certificate can pass although a rigorous ingredient is missing when the true solution satisfies its inequalities
with a wide margin, so an end-to-end pass says little about the code by itself.  This program copies code/ (and the
data the programs read) into a scratch folder once per mutation, replaces one exact piece of source text by a wrong
one, runs the program the mutation belongs to, and records how the run ended:

  caught      the program stopped at a failed check (the check is named, with its kind: proof, control, selftest,
              consistency or crosscheck);
  exception   the program stopped with an exception (a stop, but not by a named check);
  passed      the program ran to its end and printed its results: the mutation was not detected;
  timeout     the run was stopped by the time limit.

Every unmutated program is run first (a baseline) and must pass; otherwise the study stops.  Each mutation's source
text must occur exactly once in its file.  A mutation marked 'weak' changes a term far below the enclosure radii and
is not expected to be caught; it is listed so that the study also shows what it cannot see.

The mutations are those of the in-project computation reading of 2026-09-27 (H1-H6, B1-B7, B13; its descriptions,
applied to the present code), and further ones for the checks added after it (S1, I1).  The bistability program is
run with --quick --no-ball --reuse-numerics (stage 1 without the mpmath references, stages 3 to 5 and 7, and the
floating-point candidates of stage 2 read from data/logs/numerics.json, which the full run writes); B1, a change of
the model, is run without --quick, so that stage 1 compares the flow with its mpmath references.  The identification
program is run with one worker process.  Nothing here is a step of a proof.

Output: ../data/mutation_study.txt (the scratch folders are deleted unless --keep is given).
Usage: python3 mutation_study.py [--workers N] [--only ID,ID,...] [--scratch DIR] [--keep] [--no-baseline]
  --no-baseline (a trial run) skips the baselines; the committed record is a run without it.
  N: runs in parallel (default 1); the study takes about an hour with N = 2 on a lightly loaded machine.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'data', 'mutation_study.txt')
PY = sys.executable

PROGRAMS = {
    'hopf': (['certify_equilibria_hopf.py'], 900),
    'bist': (['certify_bistability.py', '--quick', '--no-ball', '--reuse-numerics'], 5400),
    'bist-mp': (['certify_bistability.py', '--no-ball', '--reuse-numerics'], 5400),
    'ident': (['identify_stable_orbit.py', '--workers', '1'], 5400),
}

# (id, program, file, old text, new text, what the mutation breaks, expectation); old and new may be tuples of texts
# replaced together
MUTATIONS = [
    ('H1', 'hopf', 'hh_ball.py', 'bh = ((30 - u) / 10).exp()', 'bh = ((30.01 - u) / 10).exp()',
     'the model: beta_h with 30.01 in place of 30', 'caught'),
    ('H2', 'hopf', 'certify_equilibria_hopf.py', "+ 2 * g['a2'] * lam + g['a3']", "+ g['a2'] * lam + g['a3']",
     'the transversality formula of Theorem 2(d): a factor 2 dropped from dp/dlambda', 'caught'),
    ('H3', 'hopf', 'hh_ball.py', ('def psi_coeffs(x0, L, N=240):', 's += arb(0, (first / (1 - rho)).upper())'),
     ('def psi_coeffs(x0, L, N=12):', 's += 0'),
     'the Bernoulli series of Psi truncated at N = 12 instead of 240, and its tail bound dropped', 'caught'),
    ('H4', 'hopf', 'outward.py', 'return math.ceil(q) if up else math.floor(q)', 'return round(q)',
     'printed bounds rounded to nearest instead of outward', 'caught'),
    ('H5', 'hopf', 'hh_ball.py', 'a3 * a3 - a1 * a1 * a4)', 'a3 * a3 - a1 * a4)',
     'the Hurwitz determinant D3 with a1 a4 in place of a1^2 a4', 'caught'),
    ('H6', 'hopf', 'certify_equilibria_hopf.py', 'w = [x / nrm for x in w]', 'w = [x / nrm.conjugate() for x in w]',
     'the adjoint eigenvector normalized with the conjugate of <p, q>', 'caught'),
    ('B1', 'bist-mp', 'hh_arb.py', 'self.c007 = arb(7) / 100', 'self.c007 = arb(701) / 10000',
     'the model: alpha_h with 0.0701 in place of 0.07', 'caught'),
    ('B2', 'bist', 'hh_lohner.py', 'a = horner_vec(self.xs_bar, s) + self.rem_coeff * s ** (self.p + 1)',
     'a = horner_vec(self.xs_bar, s)', 'the Taylor remainder dropped from the step of the Lohner set', 'caught'),
    ('B3', 'bist', 'hh_lohner.py', 'Pa[j, 0] = a[j, 0] - Q[j] * (a[idx, 0] - cc)', 'Pa[j, 0] = a[j, 0]',
     'the projection of the centre onto the section dropped (a term of the order of the float root error, 1e-16)',
     'weak'),
    ('B3b', 'bist', 'hh_lohner.py', 'Q = [fYT[j, 0] / fu for j in range(d)]', 'Q = [arb(0) for j in range(d)]',
     'the projection quotients f_j/f_i of the section crossing set to 0', 'caught'),
    ('B4', 'bist', 'certlib.py', 'K = zb - Cm * (Pzbar - zb) + (I - Cm * (DPZ - I)) * dZ', 'K = zb - Cm * (Pzbar - zb)',
     'the Krawczyk operator reduced to a Newton step', 'caught'),
    ('B5', 'bist', 'certlib.py', 'R = R + abs(M[i, j])', 'R = R + 0 * abs(M[i, j])',
     'the off-diagonal terms dropped from the Gershgorin radii', 'caught'),
    ('B6', 'bist', 'certlib.py', 'r0.append(ball - mid)', 'r0.append(arb(0))',
     'the E_l interval dropped from the initial sets (E_l fixed at the midpoint of its ball)', 'caught'),
    ('B7', 'bist', 'certlib.py', '        r1 = run(zbar, zrad, True)', '        r1 = run(zbar, [z * 1e-3 for z in zrad], True)',
     'DP enclosed over a box 1000 times smaller than the Krawczyk box', 'caught'),
    ('B13', 'bist', 'ball_stable.py', 'ok = inside and (nrmb < kappa_max) and covers', 'ok = inside and covers',
     'the contraction bound of stage 4b no longer required', 'caught'),
    ('S1', 'bist', 'hh_lohner.py', 'if not (sec.cc.rad() == 0 and x.rad() == 0 and x == sec.cc):',
     'if False and not (sec.cc.rad() == 0 and x.rad() == 0 and x == sec.cc):',
     'the check that an initial set lies exactly on its section disabled', 'caught'),
    ('I1', 'ident', 'identify_stable_orbit.py',
     "return all(arb(r['zb'][i], r['zr'][i]).contains_interior(K[i, 0]) for i in range(3))",
     "return all(arb(r['zb'][i], 5 * r['zr'][i]).contains_interior(K[i, 0]) for i in range(3))",
     'the inclusion of K in the box of Theorem 4 tested against a box with five times its radii', 'caught'),
]

FAIL_RE = re.compile(r'(\[FAIL\].*|^FAIL  .*)', re.M)


def prepare(dest):
    shutil.copytree(HERE, os.path.join(dest, 'code'), ignore=shutil.ignore_patterns('__pycache__'))
    os.makedirs(os.path.join(dest, 'data', 'logs'))
    for fn in os.listdir(os.path.join(ROOT, 'data')):
        if fn.endswith('.txt'):
            shutil.copy(os.path.join(ROOT, 'data', fn), os.path.join(dest, 'data', fn))
    nj = os.path.join(ROOT, 'data', 'logs', 'numerics.json')
    if os.path.exists(nj):
        shutil.copy(nj, os.path.join(dest, 'data', 'logs', 'numerics.json'))


def run(prog, dest):
    args, limit = PROGRAMS[prog]
    t0 = time.time()
    env = dict(os.environ, OMP_NUM_THREADS='1')
    try:
        p = subprocess.run([PY] + args, cwd=os.path.join(dest, 'code'), capture_output=True, text=True, timeout=limit,
                           env=env)
    except subprocess.TimeoutExpired:
        return 'timeout', 'stopped after %d s' % limit, time.time() - t0
    out = p.stdout + '\n' + p.stderr
    if p.returncode == 0:
        return 'passed', 'the program ran to its end', time.time() - t0
    m = FAIL_RE.search(out)
    if m:
        line = m.group(1).strip()
        return 'caught', line[:300], time.time() - t0
    last = [ln for ln in out.strip().splitlines() if ln.strip()]
    exc = [ln for ln in last if 'Error' in ln or 'Exception' in ln or 'STOPPED' in ln]
    return 'exception', (exc[-1] if exc else (last[-1] if last else 'exit %d' % p.returncode))[:300], time.time() - t0


def one(item, scratch):
    mid, prog, fn, old, new = item[:5]
    dest = os.path.join(scratch, mid)
    prepare(dest)
    if old is not None:
        path = os.path.join(dest, 'code', fn)
        src = open(path).read()
        olds, news = (old, new) if isinstance(old, tuple) else ((old,), (new,))
        for o, n in zip(olds, news):
            if src.count(o) != 1:
                return mid, 'harness-error', 'the text to replace occurs %d times in %s' % (src.count(o), fn), 0.0
            src = src.replace(o, n)
        open(path, 'w').write(src)
    res = run(prog, dest)
    print('  %s: %s -- %s (%.0f s)' % (mid, res[0], res[1][:120], res[2]), flush=True)
    return (mid,) + res


def main():
    workers = int(sys.argv[sys.argv.index('--workers') + 1]) if '--workers' in sys.argv else 1
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    scratch = (sys.argv[sys.argv.index('--scratch') + 1] if '--scratch' in sys.argv
               else tempfile.mkdtemp(prefix='hh-mutations-'))
    os.makedirs(scratch, exist_ok=True)
    muts = [m for m in MUTATIONS if only is None or m[0] in only]
    progs = sorted({m[1] for m in muts})
    t0 = time.time()
    L = ['Mutation study of the certificate programs (code/mutation_study.py); not a step of any proof.',
         'Each mutation replaces one exact piece of source text in a copy of code/ and runs the program it belongs to.',
         'Programs: ' + '; '.join('%s = %s' % (k, ' '.join(PROGRAMS[k][0])) for k in progs) + '.',
         'Python %s, %d run(s) in parallel.' % (sys.version.split()[0], workers), '']
    print('\n'.join(L), flush=True)
    base = [] if '--no-baseline' in sys.argv else [('baseline-' + p, p, None, None, None) for p in progs]
    with ThreadPoolExecutor(workers) as ex:
        bres = list(ex.map(lambda it: one(it, scratch), base))
    L.append('Baselines (unmutated programs; each must pass):' + ('' if base else ' skipped (--no-baseline)'))
    for (mid, kind, det, sec) in bres:
        L.append('  %-16s %-8s %s (%.0f s)' % (mid, kind, det, sec))
    if any(r[1] != 'passed' for r in bres):
        L.append('')
        L.append('STUDY STOPPED: a baseline did not pass, so the mutation results would mean nothing.')
        open(OUT, 'w').write('\n'.join(L) + '\n')
        sys.exit(1)
    with ThreadPoolExecutor(workers) as ex:
        res = list(ex.map(lambda it: one(it, scratch), muts))
    L.append('')
    L.append('Mutations:')
    counts = {}
    ok_all = True
    for m, (mid, kind, det, sec) in zip(muts, res):
        L.append('  %s (%s, %s): %s' % (mid, m[1], m[2], m[5]))
        olds, news = (m[3], m[4]) if isinstance(m[3], tuple) else ((m[3],), (m[4],))
        for o, n in zip(olds, news):
            L.append('      replaced: %s' % o)
            L.append('      by:       %s' % n)
        L.append('      result:   %s -- %s (%.0f s)%s' % (kind, det, sec,
                                                          '' if m[6] == 'caught' else '  [marked weak]'))
        counts[kind] = counts.get(kind, 0) + 1
        if m[6] == 'caught' and kind not in ('caught', 'exception'):
            ok_all = False
        if kind == 'harness-error':
            ok_all = False
    strong = [m for m in muts if m[6] == 'caught']
    stopped = [r for m, r in zip(muts, res) if m[6] == 'caught' and r[1] in ('caught', 'exception')]
    by_check = [r for m, r in zip(muts, res) if m[6] == 'caught' and r[1] == 'caught']
    weak = [r for m, r in zip(muts, res) if m[6] != 'caught']
    L.append('')
    L.append('Summary: %d mutations; %d of the %d not marked weak stopped the program (%d at a failed check, %d by an '
             'exception); %d marked weak, of which %d passed.'
             % (len(muts), len(stopped), len(strong), len(by_check), len(stopped) - len(by_check), len(weak),
                sum(1 for r in weak if r[1] == 'passed')))
    L.append('Every mutation not marked weak was stopped: %s' % ok_all)
    L.append('Full list of mutations: %s' % (only is None and bool(base)))
    L.append('run time %.0f s' % (time.time() - t0))
    open(OUT, 'w').write('\n'.join(L) + '\n')
    print('\n'.join(L[-4:]))
    if '--keep' not in sys.argv:
        shutil.rmtree(scratch, ignore_errors=True)
    if not ok_all:
        sys.exit(1)


if __name__ == '__main__':
    main()
