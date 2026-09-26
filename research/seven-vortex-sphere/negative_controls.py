"""Negative and positive controls for the local test.

A. Perturbed energies, run through the SAME rigorous pipeline (local_certificate.main):
   A1  F - beta |xi(w)|^4 for beta above the quartic constant (0.2, 0.11): must FAIL at R1, and a
       float evaluation must show the point is genuinely not a local minimum;
   A2  the same with beta below it (0.05, 0.09): must still PASS;
   A3  F + eps xi_1(w)^3: must FAIL at E3 (and a float evaluation shows descent);
   A4  F - 10 (c_1 . w)^2 along a complement direction: must FAIL at E2.
B. Other critical configurations of 7 points (float numerics, labelled numerical): the equatorial
   heptagon (D7h), the 1:6 configuration (C6v), the 1:3:3 configuration (C3v) must be rejected
   (negative Hessian eigenvalue); the octahedron plus one point is not critical at all.
   The bipyramid itself shows exactly 3 + 2 zero eigenvalues.
"""
import itertools
import math
from fractions import Fraction as Qf

import numpy as np
from scipy.optimize import minimize

import local_certificate as LC
import model
from kfield import K

results = {}


def xi_forms(Ncol):
    """xi_a(w) = (N_a . w) / (N_a . N_a) as exact linear polynomials over the 11 chart variables."""
    forms = []
    for a in range(2):
        nn = LC.dot(Ncol[a], Ncol[a])
        f = {}
        for i in range(model.NV):
            c = Ncol[a][i] / nn
            if not c.is_zero():
                e = [0] * model.NV
                e[i] = 1
                f[tuple(e)] = c
        forms.append(f)
    return forms


def pmul(p, q):
    return model.pmul(p, q)


def run_pert(name, P, expect_ok):
    r = LC.main(out=None, perturb=P, quiet=True)
    ok = r.get("ok", False)
    verdict = "as expected" if ok == expect_ok else "UNEXPECTED"
    print("  %-38s certificate %s (%s)  -> %s" % (name, "PASSES" if ok else "fails", r.get("reason", "proved"), verdict))
    results[name] = (ok, expect_ok)
    return r


def float_poly(P, w):
    return sum(float(c) * np.prod([w[i] ** e for i, e in enumerate(m)]) for m, c in P.items())


def main():
    base = LC.main(out=None, quiet=True)
    assert base["ok"]
    Ncol, Ccol = base["_internal"]["Ncol"], base["_internal"]["Ccol"]
    x1, x2 = xi_forms(Ncol)
    xsq = model.padd(pmul(x1, x1), pmul(x2, x2))
    quart = pmul(xsq, xsq)
    print("A. perturbed energies through the rigorous pipeline")
    for beta, expect in ((Qf(1, 5), False), (Qf(11, 100), False), (Qf(9, 100), True), (Qf(1, 20), True)):
        P = model.pscale(quart, K(-beta))
        r = run_pert("F - %s |xi|^4" % beta, P, expect)
        if not expect:
            # genuine descent: along w = N xi + C eta*(xi) at |xi| = 0.05 (float, eta* from the exact data)
            Nf = np.array([[float(x) for x in col] for col in Ncol]).T
            vals = []
            for t in np.linspace(0, 2 * math.pi, 13)[:-1]:
                xi = 0.05 * np.array([math.cos(t), math.sin(t)])
                # minimise over eta numerically (float): the reduced energy along the kernel
                Cf = np.array([[float(x) for x in col] for col in Ccol]).T
                f = lambda eta: model.evaluate_float(Nf @ xi + Cf @ eta) + float_poly(P, Nf @ xi + Cf @ eta)
                res = minimize(f, np.zeros(9), method="BFGS", options={"gtol": 1e-13})
                vals.append(res.fun - model.evaluate_float(np.zeros(11)))
            print("      float check: min over eta of F_pert(N xi + C eta) - F(0) at |xi| = 0.05: max %.3e (all < 0: %s)"
                  % (max(vals), all(v < 0 for v in vals)))
    P = model.pscale(pmul(x1, pmul(x1, x1)), K(Qf(1, 1000)))
    run_pert("F + 0.001 xi_1^3", P, False)
    Nf = np.array([[float(x) for x in col] for col in Ncol]).T
    for s in (-0.002, -0.001):
        print("      float check: F_pert(N (s,0)) - F(0) at s = %g: %.3e (negative = descent)"
              % (s, model.evaluate_float(Nf @ np.array([s, 0])) + float_poly(P, Nf @ np.array([s, 0]))
                 - model.evaluate_float(np.zeros(11))))
    c1 = {}
    for i in range(model.NV):
        if not Ccol[0][i].is_zero():
            e = [0] * model.NV
            e[i] = 1
            c1[tuple(e)] = Ccol[0][i]
    run_pert("F - 10 (c_1 . w)^2", model.pscale(pmul(c1, c1), K(-10)), False)

    print("B. other critical configurations of 7 points (float numerics)")
    for name, X, expect_min in configurations():
        info = hessian_test(X)
        print("  %-30s E = %.8f  |grad| = %.1e  min eig = %+.4f  #zero = %d  -> %s"
              % (name, info["E"], info["grad"], info["mineig"], info["nzero"], info["verdict"]))
        results[name] = info["verdict"]
    bad = [k for k, v in results.items() if (isinstance(v, tuple) and v[0] != v[1])]
    print("controls behaving unexpectedly:", bad or "none")
    return not bad


# ---------------------------------------------------------------- float Riemannian Hessian test
def energy(X):
    return -sum(math.log(np.linalg.norm(X[i] - X[j])) for i, j in itertools.combinations(range(len(X)), 2))


def grad_hess(X):
    n = len(X)
    g = np.zeros((n, 3))
    Hm = np.zeros((3 * n, 3 * n))
    for i, j in itertools.combinations(range(n), 2):
        d = X[i] - X[j]
        r2 = d @ d
        gi = -d / r2
        g[i] += gi
        g[j] -= gi
        B = -(np.eye(3) * r2 - 2 * np.outer(d, d)) / r2 ** 2
        for a, b, sgn in ((i, i, 1), (j, j, 1), (i, j, -1), (j, i, -1)):
            Hm[3 * a:3 * a + 3, 3 * b:3 * b + 3] += sgn * B
    P = np.zeros((3 * n, 3 * n))
    for i in range(n):
        P[3 * i:3 * i + 3, 3 * i:3 * i + 3] = np.eye(3) - np.outer(X[i], X[i])
    rg = np.concatenate([P[3 * i:3 * i + 3, 3 * i:3 * i + 3] @ g[i] for i in range(n)])
    Hr = P @ Hm @ P
    for i in range(n):
        Hr[3 * i:3 * i + 3, 3 * i:3 * i + 3] -= (X[i] @ g[i]) * (np.eye(3) - np.outer(X[i], X[i]))
    # restrict to the tangent space (orthonormal basis)
    basis = []
    for i in range(n):
        u, s_, vt = np.linalg.svd(np.eye(3) - np.outer(X[i], X[i]))
        for k in range(2):
            v = np.zeros(3 * n)
            v[3 * i:3 * i + 3] = u[:, k]
            basis.append(v)
    Bm = np.array(basis).T
    return np.linalg.norm(rg), Bm.T @ Hr @ Bm


def hessian_test(X):
    gn, Ht = grad_hess(X)
    ev = np.linalg.eigvalsh(Ht)
    nzero = int(np.sum(np.abs(ev) < 1e-7))
    if gn > 1e-9:
        verdict = "not critical (rejected)"
    elif ev[0] < -1e-7:
        verdict = "saddle (rejected)"
    elif nzero > 3:
        verdict = "degenerate: needs the higher-order test"
    else:
        verdict = "nondegenerate minimum"
    return dict(E=energy(X), grad=gn, mineig=ev[0], nzero=nzero, verdict=verdict)


def ring(n, z, phase=0.0):
    r = math.sqrt(1 - z * z)
    return [np.array([r * math.cos(phase + 2 * math.pi * k / n), r * math.sin(phase + 2 * math.pi * k / n), z]) for k in range(n)]


def configurations():
    N = np.array([0, 0, 1.0])
    S = np.array([0, 0, -1.0])
    out = [("pentagonal bipyramid (D5h)", np.array([N, S] + ring(5, 0.0)), True),
           ("equatorial heptagon (D7h)", np.array(ring(7, 0.0)), False)]
    # symmetric critical points, located by high-precision root finding of the symmetric gradient
    import mpmath as mp
    mp.mp.dps = 40

    def ringm(n, z, phase=0):
        r = mp.sqrt(1 - z * z)
        return [(r * mp.cos(phase + 2 * mp.pi * k / n), r * mp.sin(phase + 2 * mp.pi * k / n), z) for k in range(n)]

    def Em(P):
        return -sum(mp.log(mp.sqrt(sum((a - b) ** 2 for a, b in zip(P[i], P[j]))))
                    for i, j in itertools.combinations(range(len(P)), 2))

    Nm = (mp.mpf(0), mp.mpf(0), mp.mpf(1))
    h = mp.findroot(lambda h: mp.diff(lambda x: Em([Nm] + ringm(6, x)), h), mp.mpf("-0.3"))
    out.append(("1:6 pole + hexagon (C6v)", np.array([N] + ring(6, float(h))), False))
    g133 = lambda a, b: Em([Nm] + ringm(3, a) + ringm(3, b, mp.pi / 3))
    a0, b0 = minimize(lambda p: energy(np.array([N] + ring(3, p[0]) + ring(3, p[1], math.pi / 3))), [0.2, -0.6],
                      method="Nelder-Mead", options={"xatol": 1e-12, "fatol": 1e-15, "maxiter": 20000}).x
    sol = mp.findroot([lambda a, b: mp.diff(g133, (a, b), (1, 0)), lambda a, b: mp.diff(g133, (a, b), (0, 1))],
                      (mp.mpf(a0), mp.mpf(b0)))
    out.append(("1:3:3 (C3v)", np.array([N] + ring(3, float(sol[0])) + ring(3, float(sol[1]), math.pi / 3)), False))
    octa = [np.array(v, float) for v in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))]
    extra = np.array([1, 1, 1.0]) / math.sqrt(3)
    out.append(("octahedron + one point", np.array(octa + [extra]), False))
    return out


if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)
