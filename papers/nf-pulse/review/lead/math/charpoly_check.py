# Checks the characteristic polynomials of the 4D and 5D rest linearisations (exact rationals) and counts eigenvalues numerically over c; run: python3 charpoly_check.py
import random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'code'))
from flint import fmpq, fmpq_mat
import numpy as np

def A4(k, s, e):
    return [[-k, -k, k, 0], [e * k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]]

def A5(k, s, e):   # same as certify_rest.jac5
    return [[-k, -k, k, 0, 0], [e * k, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 1, 0, -1], [-s * k, -s * k, s * k, 0, 0]]

def p(l, k, s, e):
    return (l * l + k * l + e * k * k) * (l * l - 1) + s * k * l

def det_lI_minus(A, l):
    n = len(A)
    M = fmpq_mat(n, n, [ (l if i == j else 0) - fmpq(A[i][j]) for i in range(n) for j in range(n)])
    return M.det()

random.seed(1)
bad = 0
for _ in range(400):
    l, k, s, e = [fmpq(random.randint(-50, 50), random.randint(1, 30)) for _ in range(4)]
    if det_lI_minus(A4(k, s, e), l) != p(l, k, s, e): bad += 1
    if det_lI_minus(A5(k, s, e), l) != l * p(l, k, s, e): bad += 1
print('exact rational identity checks, 400 random points each: mismatches =', bad)
print('  det(lI - A4) = p(l);  det(lI - A5) = l p(l)  (the fifth variable adds the eigenvalue 0)')

# 5D line of equilibria (0, a, a, 0, a): check F = 0 exactly for the 5D field at arbitrary a
import nfcore as nf
from flint import arb
for a in ('0.3', '0.9', '-2'):
    x = [arb(0), arb(a), arb(a), arb(0), arb(a)]
    f = nf.vfield(x, arb('0.9'))
    print('  5D field at (0,a,a,0,a), a=%s:' % a, [str(v) for v in f])

# numerical (not rigorous) count of eigenvalues with Re > 0 of A4 for c from 0.01 to 100
s0 = 20 * (1 / (1 + np.exp(5))) * (1 - 1 / (1 + np.exp(5)))
cnt = set(); cplx = []
for c in np.geomspace(0.01, 100, 2000):
    k = 1 / c
    w = np.linalg.eigvals(np.array(A4(k, s0, 0.1), dtype=float))
    cnt.add((int(np.sum(w.real > 0)), int(np.sum(w.real < 0))))
    if np.max(np.abs(w.imag)) > 1e-12: cplx.append(c)
print('numerical (#Re>0, #Re<0) over c in [0.01, 100]:', cnt)
print('complex eigenvalues occur for c in', (min(cplx), max(cplx)) if cplx else 'none', '(numerical)')
