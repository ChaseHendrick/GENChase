# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Linear (spectral) instability of the relative equilibria certified by certify_classes.py.

In a frame rotating with the relative equilibrium, the linearized vortex equations are
d(dx)/dt = c * d/dy (grad f . d),  d(dy)/dt = -c * d/dx (grad f . d)  for a constant c > 0, i.e. the
matrix c J H with J = [[0, I], [-I, 0]] and H the Hessian of f in the ordering (x_0..x_7, y_0..y_7).
For each class we enclose every eigenvalue of J H, for every H in the Hessian enclosure over the
Krawczyk box, with Arb's rigorous multiple-eigenvalue routine; an enclosure lying strictly in
Re > 0 proves an exponentially growing mode (spectral instability). The constant c does not change
signs of real parts.
"""
import json, os, sys
import numpy as np
from flint import arb, acb, acb_mat
import ball
from certify_classes import certify, N, HERE

classes = json.load(open(os.path.join(HERE, 'data/survey-N8.json')))


def box_hessian(zc):
    z = np.array([complex(a, b) for a, b in zc])
    p = int(np.argmax(np.abs(z)))
    z = z * np.exp(-1j * np.angle(z[p]))
    u = ball.newton_refine(list(z.real) + [z[k].imag for k in range(N) if k != p], N, p)
    ok, X, K = ball.krawczyk(u, 1e-40, N, p)
    assert ok
    x, y = ball.full_xy(X, N, p)
    return ball.hess_full(x, y)


def jh(H):
    n = 2 * N
    M = acb_mat(n, n)
    for i in range(N):
        for j in range(n):
            M[i, j] = acb(H[N + i][j])        # rows 0..N-1: + d/dy
            M[N + i, j] = acb(-H[i][j])       # rows N..2N-1: - d/dx
    return M


def eigenpair_krawczyk(M, lam0, v0, rad=1e-30):
    """Krawczyk test for (M - lam) v = 0 with the normalization v[j0] = 1, over complex balls.
    Unknowns w = (lam, v without j0). Proves, for every matrix in the ball matrix M, a unique eigenpair
    in the box; returns the enclosure of lam or None."""
    n = M.nrows()
    j0 = int(np.argmax(np.abs(v0)))
    v0 = v0 / v0[j0]
    idx = [k for k in range(n) if k != j0]
    def C(zv):
        return acb(ball.exact(zv.real), ball.exact(zv.imag))
    # refine the centre with a few Newton steps on midpoints
    lam = C(lam0); v = [C(c) for c in v0]; v[j0] = acb(1)
    def F(lam, v):
        return [sum((M[i, k] * v[k] for k in range(n)), acb(0)) - lam * v[i] for i in range(n)]
    def Jac(lam, v):
        J = acb_mat(n, n)
        for i in range(n):
            J[i, 0] = -v[i]
            for c, k in enumerate(idx):
                J[i, c + 1] = M[i, k] - (lam if i == k else 0)
        return J
    for _ in range(8):
        Fv = acb_mat([[f.mid()] for f in F(lam, v)])
        d = Jac(lam, v).mid().solve(Fv)
        lam = (lam - d[0, 0]).mid()
        for c, k in enumerate(idx):
            v[k] = (v[k] - d[c + 1, 0]).mid()
    w = [lam] + [v[k] for k in idx]
    r = acb(arb(0, rad), arb(0, rad))
    X = [wi + r for wi in w]
    lamX = X[0]; vX = list(v); 
    for c, k in enumerate(idx):
        vX[k] = X[c + 1]
    Fc = acb_mat([[f] for f in F(lam, v)])
    J = Jac(lamX, vX)
    Y = J.mid().inv().mid()
    Id = acb_mat(n, n)
    for k in range(n):
        Id[k, k] = acb(1)
    dX = acb_mat([[X[k] - w[k]] for k in range(n)])
    K = acb_mat([[wi] for wi in w]) - Y * Fc + (Id - Y * J) * dX
    ok = all(X[k].real.contains_interior(K[k, 0].real) and X[k].imag.contains_interior(K[k, 0].imag) for k in range(n))
    # realness: every entry of M is real, so conj(lam, v) is an eigenpair too; if conj(K) lies inside X,
    # uniqueness of the zero in X forces lam = conj(lam)
    real = ok and all(X[k].real.contains(K[k, 0].real) and X[k].imag.contains(-K[k, 0].imag) for k in range(n))
    real = real and all(M[i, j].imag.contains(0) and M[i, j].imag.rad() == 0 for i in range(n) for j in range(n))
    eigenpair_krawczyk.real = bool(real)
    return K[0, 0] if ok else None


def spectrum_counts(H):
    M = jh(H)
    A = np.array([[complex(float(M[i, j].real.mid()), float(M[i, j].imag.mid())) for j in range(16)] for i in range(16)])
    w, V = np.linalg.eig(A)
    k = int(np.argmax(w.real))
    lam = eigenpair_krawczyk(M, w[k], V[:, k])
    return lam


if __name__ == '__main__':
    out = []
    for i, c in enumerate(classes):
        H = box_hessian(c['z'])
        lam = spectrum_counts(H)
        unstable = lam is not None and lam.real > 0
        rec = dict(label=f'class {i + 1}', index=c['index'], eigenvalue=None if lam is None else lam.str(15),
                   unstable=bool(unstable), real=bool(lam is not None and eigenpair_krawczyk.real))
        out.append(rec)
        print(f"class {i + 1:2d} index {c['index']}: eigenvalue of largest real part {rec['eigenvalue']}  "
              f"certified unstable: {unstable}, real: {rec['real']}")
    json.dump(out, open(os.path.join(HERE, 'data/stability-N8.json'), 'w'), indent=1)
    # the minimum (class 1) must receive no instability certificate; every other class must
    good = (not out[0]['unstable']) and all(r['unstable'] and r['real'] for r in out[1:])
    print('stability checks:', 'PASS' if good else 'FAIL')
    sys.exit(0 if good else 1)
