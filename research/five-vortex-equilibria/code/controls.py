"""Negative controls for the five-vortex proof.  Run from code/ after
building bnb (see ../REPORT.md).  Writes a summary to stdout.

C1  a box around a non-solution is excluded; a box around a solution is certified.
C2  mutated exclusion tests (bnb --mutate=1..4) must be detected downstream:
    the classification fails, finds a different count, or misses a known
    exact solution.
C3  a mutated Krawczyk operator (--mutate=5, contraction term dropped) must
    be rejected by the independent arb re-verification in classify.py.
C4  without the cluster identities (--no-cluster) the collision set cannot
    be excluded: the search leaves undecided boxes.
"""
import os, subprocess, sys, tempfile, math

HERE = os.path.dirname(os.path.abspath(__file__))
BNB = os.path.join(HERE, 'bnb')
PY = sys.executable


def run_search(extra, minw='1e-11', timeout=300, nw=4, env=None):
    tmp = tempfile.mkdtemp()
    procs, files = [], []
    for w in range(nw):
        f = os.path.join(tmp, f'w{w}.txt')
        files.append(f)
        procs.append(subprocess.Popen([BNB, '5', '4096', str(w), str(nw), minw, '--sym'] + extra,
                                      stdout=open(f, 'w'), stderr=subprocess.DEVNULL, env=env))
    timed_out = False
    for p in procs:
        try:
            p.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            p.kill()
    txt = ''.join(open(f).read() for f in files)
    return files, txt, timed_out


def classify(files):
    # the controls check that the mathematics catches each mutation, so they
    # switch off the one guard that refuses mutated runs by their metadata
    env = dict(os.environ, CONTROL_ALLOW_MUTATION='1')
    r = subprocess.run([PY, os.path.join(HERE, 'classify.py'), '5'] + files, capture_output=True, text=True, env=env)
    return r.returncode, r.stdout + r.stderr


def verdict(files, txt, timed_out):
    nunres = txt.count('UNRES')
    ncert = txt.count('CERT')
    if timed_out:
        return f'search did not finish (timeout); {ncert} CERT, {nunres} UNRES lines'
    if nunres:
        return f'search incomplete: {nunres} undecided boxes'
    code, out = classify(files)
    if code != 0:
        last = out.strip().split('\n')[-1]
        info = [l.strip() for l in out.split('\n') if l.startswith('exact ') or l.startswith('distinct solutions') or 'Krawczyk failed' in l]
        return f'classification failed ({ncert} certified boxes; ' + '; '.join(info) + f'): {last}'
    lines = [l for l in out.split('\n') if l.startswith('total labelled') or l.startswith('sum of') or l.startswith('classes') or l.startswith('Euler characteristic check')]
    return 'classification ran: ' + '; '.join(lines)


print('C1  box exclusion and certification on chosen boxes (bnb with BNB_ROOT)')
# the regular pentagon in the chart: x1 = sqrt(2), z2, z3, z4 = other vertices
s2 = math.sqrt(2)
pent = [s2]
for k in (2, 3, 4):  # sorted real parts: vertices 2,3 (Re < 0) then 1 more
    pass
import cmath
verts = [s2 * cmath.exp(2j * math.pi * k / 5) for k in range(5)]
others = sorted(verts[1:], key=lambda z: z.real)
if others[0].imag < 0:
    others = [z.conjugate() for z in others]
    others = sorted(others, key=lambda z: z.real)
pt = [s2] + [c for z in others[:3] for c in (z.real, z.imag)]
def box_env(center, h):
    return dict(os.environ, BNB_ROOT=' '.join(f'{c - h!r} {c + h!r}' for c in center))
for label, center in [('around the regular pentagon', pt),
                      ('around a non-solution (pentagon with x_1 moved by 0.05)', [pt[0] + 0.05] + pt[1:]),
                      ('around a non-solution (a random point)', [2.0, -1.0, 0.3, -0.2, -1.1, 0.4, 0.9])]:
    r = subprocess.run([BNB, '5', '1', '0', '1', '1e-11'], capture_output=True, text=True, env=box_env(center, 0.01))
    st = [l for l in r.stdout.split('\n') if l.startswith('STAT')][0]
    print(f'    {label}: {st}')

print('C2/C3  mutations')
for m, what in [(1, 'wrong inertia constant in T1'), (2, 'G_j shifted by 0.25 in T2'),
                (3, 'cluster constant |S|^2(|S|-1)/2 replaced by 0 in T3'),
                (4, 'mean-value test shifted by 0.25'), (5, 'Krawczyk operator without the contraction term')]:
    files, txt, to = run_search([f'--mutate={m}'], minw='1e-7', timeout=240)
    print(f'    mutate={m} ({what}): {verdict(files, txt, to)}')

print('C4  no cluster identities')
files, txt, to = run_search(['--no-cluster'], minw='1e-5', timeout=240)
print(f'    --no-cluster: {verdict(files, txt, to)}')

print('reference (unmutated)')
files, txt, to = run_search([], timeout=600)
print(f'    {verdict(files, txt, to)}')
