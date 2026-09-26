# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Mutation tests of the verification harness: each deliberate bug is applied to a temporary copy of
code/, and the copy's run_all.sh must then exit with a nonzero status. Prints one line per mutation."""
import os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUTATIONS = [
    ('M1 Hessian cross-term sign', 'ball.py', 'bxy = 2 * dx * dy / r4', 'bxy = -2 * dx * dy / r4'),
    ('M2 gauge drops x_p', 'ball.py', 'if k != N + p]', 'if k != p]'),
    ('M3 Gershgorin comparison', 'ball.py', 'if (c + R) < 0:', 'if (c - R) < 0:'),
    ('M4 chirality without conj', 'ball.py', 'm[2].conjugate() ** 3', 'm[2] ** 3'),
    ('M5 basin gamma s/D^3', 'certify_basin.py', 'g = s / (D - s) ** 3', 'g = s / D ** 3'),
    ('M6 containment not interior', 'ball.py', 'return bool(X.contains_interior(K))', 'return bool(X.contains(K))'),
    ('M7 basin without sqrt 2', 'certify_basin.py', 's = arb(2).sqrt() * arb(rho)', 's = arb(rho)'),
    ('M8 linearization sign', 'certify_stability.py', 'M[N + i, j] = acb(-H[i][j])', 'M[N + i, j] = acb(H[i][j])'),
    ('M9 basin y block dropped', 'certify_basin.py', 'M[N + a][N + b] -= sg * g', 'pass'),
    ('M10 f enclosure sign of log', 'ball.py', 's -= (dx * dx + dy * dy).log() / 2', 's += (dx * dx + dy * dy).log() / 2'),
]
allok = True
for name, fn, old, new in MUTATIONS:
    tmp = tempfile.mkdtemp()
    shutil.copytree(HERE, os.path.join(tmp, 'r'), ignore=shutil.ignore_patterns('bnb', '__pycache__'))
    path = os.path.join(tmp, 'r', 'code', fn)
    src = open(path).read()
    if old not in src:
        print(f'{name}: pattern not found (harness out of date)'); allok = False; continue
    open(path, 'w').write(src.replace(old, new))
    r = subprocess.run(['sh', os.path.join(tmp, 'r', 'run_all.sh')], capture_output=True, text=True)
    caught = r.returncode != 0
    allok &= caught
    print(f'{name}: {"caught" if caught else "SURVIVED"}')
    shutil.rmtree(tmp)
print('ALL MUTATIONS CAUGHT' if allok else 'SOME MUTATIONS SURVIVED')
sys.exit(0 if allok else 1)
