#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Point the unchanged fast-pulse programs (../../../code) at the slow pulse.

Importing this module (after slowparams, which sets eps, theta, beta) sets, in the imported certify_rest module,
the speed bracket [C1, C2] of the slow pulse, the reference speed C_REF used to choose block coordinates, and the
cones the orbits at C1 and C2 are expected to enter; when the stable eigenvalues of the rest state are not all real
it also replaces block.setup by a version that uses a real Jordan basis.  Nothing in ../../../code is modified.

The brackets come from the non-rigorous high-precision shooting of shoot_slow.py (see ../REPORT.md); the proof does
not depend on how they were found.  Smaller speeds fire a second time (orbit leaves rest along +v, cone K+), larger
speeds escape into Q < 0 without firing again (cone K-).
"""
import numpy as np
import slowparams as sp
from flint import arb, fmpq
import certify_rest as cr
import block as bl

# (eps as fmpq) -> (numerator of C1, power of ten, C_REF as float)
BRACKETS = {
    fmpq(1, 10): (3775319350688905765075606, 25, 0.37753193506889058),
    fmpq(3, 20): (4932988879736285669800062, 25, 0.49329888797362857),
}
key = sp.EPS
# Only the two recorded points are supported: block.setup (used when the stable eigenvalues are real) and
# float_matrix below hard-code beta = 20, theta = 1/4 (and block.setup eps = 1/10) in their choice of coordinates.
if sp.THETA != fmpq(1, 4) or sp.BETA != 20 or key not in BRACKETS:
    raise SystemExit('no slow-pulse bracket recorded for %s' % sp.TXT)
num, ex, cref = BRACKETS[key]
cr.C1 = arb(fmpq(num, 10 ** ex))
cr.C2 = arb(fmpq(num + 1, 10 ** ex))
cr.C_REF = cref
cr.SIDE_C1, cr.SIDE_C2 = +1, -1
C1_TXT = '%d/10^%d' % (num, ex)
C2_TXT = '%d/10^%d' % (num + 1, ex)

_EPSF = float(sp.EPS.p) / float(sp.EPS.q)


def float_matrix(c):
    k = 1 / c
    s0 = 20 * (1 / (1 + np.exp(5))) * (1 - 1 / (1 + np.exp(5)))
    return np.array([[-k, -k, k, 0], [_EPSF * k, 0, 0, 0], [0, 0, 0, 1], [-s0, 0, 1, 0]])


def setup_jordan(d=(1, 0.5, 0.125, 0.5)):
    """As block.setup, but the columns of V are a real Jordan basis: the unstable eigenvector, then for each real
    stable eigenvalue its eigenvector and for a complex pair the real and imaginary parts of one eigenvector,
    normalised so that its U-component is 1.  The weights d were chosen by a floating-point search over a small grid
    (the default weights of block.setup fail the entrance condition here).  Only the choice of coordinates changes;
    block.check certifies whatever T it is given."""
    Af = float_matrix(cr.C_REF)
    w, V = np.linalg.eig(Af)
    idx = list(np.argsort(-w.real))
    cols, used = [], set()
    for i in idx:
        if i in used:
            continue
        used.add(i)
        if abs(w[i].imag) < 1e-12:
            cols.append(V[:, i].real)
        else:
            j = [m for m in idx if m not in used and abs(w[m] - np.conj(w[i])) < 1e-9][0]
            used.add(j)
            vc = V[:, i] / V[0, i]
            cols += [vc.real, vc.imag]
    Vr = np.array(cols).T
    Tf = np.diag(d) @ np.linalg.inv(Vr)
    T = bl.exact_matrix(Tf)
    return T, T.inv()


COMPLEX_STABLE = bool(np.any(np.abs(np.linalg.eigvals(float_matrix(cref)).imag) > 1e-12))
if COMPLEX_STABLE:
    bl.setup = setup_jordan
