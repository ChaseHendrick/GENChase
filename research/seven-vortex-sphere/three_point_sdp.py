"""Numerical test: is the Cohn-Woo three-point bound, in the form used by Kryvonos, Liehr and
Taylor (arXiv:2609.22077, Section 4) for N = 8, sharp for N = 7 and the logarithmic energy?

NUMERICAL ONLY.  This solves a floating-point SDP.  A value of the bound below the
bipyramid energy (beyond solver tolerance) means the method in this form cannot prove global
optimality for N = 7; a value equal to it would be a candidate for an exact certificate.

Adaptation to N points (derived in REPORT.md): summing over the N(N-1)(N-2) ordered triples of
distinct indices,
   sum (H(u)+H(v)+H(t))/3 = 2(N-2) E_H(Y),
   Psi_Y R_k = 6 M_k(Y) with R_k = 6 S_k(u,v,t) + 6/(N-2) [S_k(u,u,1)+S_k(v,v,1)+S_k(t,t,1)]
                                   + delta_k0 * 6/((N-1)(N-2)) J,
so the identity
   (H(u)+H(v)+H(t))/3 - e / binom(N,2) = sum_k <F_k, R_k> + SOS on the triangle domain
gives 2(N-2)(E_H(Y) - e) >= 0.  For N = 8 this is exactly KLT (4.4)-(4.6).

Usage: python3 three_point_sdp.py [degree] [--gram]
"""
import itertools
import sys
from fractions import Fraction as Fr

import cvxpy as cp
import mpmath as mp
import numpy as np

mp.mp.dps = 60
NPTS = 7


# ---------------------------------------------------------------- polynomials in (u, v, t) as dicts
def padd(a, b, s=1):
    r = dict(a)
    for m, c in b.items():
        r[m] = r.get(m, 0) + s * c
    return {m: c for m, c in r.items() if c != 0}


def pmul(a, b):
    r = {}
    for m1, c1 in a.items():
        for m2, c2 in b.items():
            m = (m1[0] + m2[0], m1[1] + m2[1], m1[2] + m2[2])
            r[m] = r.get(m, 0) + c1 * c2
    return {m: c for m, c in r.items() if c != 0}


def pscale(a, s):
    return {m: c * s for m, c in a.items()}


U, V, T = {(1, 0, 0): Fr(1)}, {(0, 1, 0): Fr(1)}, {(0, 0, 1): Fr(1)}
ONE = {(0, 0, 0): Fr(1)}


def permute(p, perm):
    return {tuple(m[perm[i]] for i in range(3)): c for m, c in p.items()}


def sym(p):
    r = {}
    for perm in itertools.permutations(range(3)):
        r = padd(r, permute(p, perm))
    return pscale(r, Fr(1, 6))


def subst_uu1(p, which):
    """S(u,u,1)-type substitution: variables (x, x, 1) where x is u, v or t."""
    r = {}
    for (a, b, c), coef in p.items():
        e = [0, 0, 0]
        e[which] = a + b
        m = tuple(e)
        r[m] = r.get(m, 0) + coef
    return {m: c for m, c in r.items() if c != 0}


def Qk(kmax):
    Q = [ONE, padd(T, pmul(U, V), -1)]
    tuv = padd(T, pmul(U, V), -1)
    w = pmul(padd(ONE, pmul(U, U), -1), padd(ONE, pmul(V, V), -1))
    for k in range(2, kmax + 1):
        Q.append(padd(pscale(pmul(tuv, Q[k - 1]), 2), pmul(w, Q[k - 2]), -1))
    return Q


def hermite(nodes_conditions, deg):
    """Polynomial of degree <= deg with prescribed derivatives; nodes_conditions: list of (x, [f, f', ...])."""
    rows, rhs = [], []
    for x, vals in nodes_conditions:
        for j, v in enumerate(vals):
            row = []
            for p in range(deg + 1):
                row.append(mp.mpf(0) if p < j else mp.factorial(p) / mp.factorial(p - j) * mp.mpf(x) ** (p - j))
            rows.append(row)
            rhs.append(v)
    assert len(rows) == deg + 1
    return mp.lu_solve(mp.matrix(rows), mp.matrix(rhs))


def phi_derivs(x, m):
    """phi(t) = -1/2 log(2 - 2t): value and first m derivatives at x."""
    x = mp.mpf(x)
    out = [-mp.log(2 - 2 * x) / 2]
    for k in range(1, m + 1):
        out.append(mp.mpf(2) ** (k - 1) * mp.factorial(k - 1) * (2 - 2 * x) ** (-k))
    return out


def antiprism8():
    """N = 8 square antiprism X(a) of KLT (1.2), a = squared half-height, logarithmic energy.
    Returns (nodes, multiplicities, a0) with a0 the stationary height (found numerically)."""
    def nodes_of(a):
        r2 = mp.sqrt(2)
        return [a, 2 * a - 1, -a + (1 - a) / r2, -a - (1 - a) / r2]
    mult = [8, 4, 8, 8]

    def E(a):
        return sum(m * (-mp.log(2 - 2 * t) / 2) for t, m in zip(nodes_of(a), mult))
    a0 = mp.findroot(lambda a: mp.diff(E, a), 0.3)
    return nodes_of(a0), mult, a0


def run(deg=12, gram=False, verbose=True, npts=7, contact=2):
    global NPTS
    NPTS = npts
    if npts == 7:
        c72 = mp.cos(2 * mp.pi / 5)
        c144 = mp.cos(4 * mp.pi / 5)
        nodes = [mp.mpf(0), c72, c144]
        mult = [10, 5, 5]
        extra = [(-1, 1)]
    else:
        nodes, mult, a0 = antiprism8()
        extra = []
        if verbose:
            print("N = 8 antiprism, a0 = %s" % mp.nstr(a0, 12))
    n_at_m1 = deg + 1 - contact * len(nodes)
    assert n_at_m1 >= 1
    conds = [(mp.mpf(-1), phi_derivs(-1, n_at_m1 - 1))] + [(x, phi_derivs(x, contact - 1)) for x in nodes]
    hc = hermite(conds, deg)
    # check minorant numerically
    ts = np.linspace(-1, 0.999, 4001)
    gap = [float(phi_derivs(t, 0)[0] - mp.polyval(list(reversed(hc)), t)) for t in ts]
    allnodes = nodes + [mp.mpf(x) for x, _ in extra]
    allmult = mult + [m for _, m in extra]
    E_B = float(sum(m * phi_derivs(x, 0)[0] for x, m in zip(allnodes, allmult)))
    EH_B = float(sum(m * mp.polyval(list(reversed(hc)), x) for x, m in zip(allnodes, allmult)))
    if verbose:
        print("contact order %d at interior nodes; H degree %d (%d conditions at -1); min(phi - H) on grid %.3e; E(B) = %.10f, E_H(B) = %.10f"
              % (contact, deg, n_at_m1, min(gap), E_B, EH_B))
    Hpoly = {(p, 0, 0): float(hc[p]) for p in range(deg + 1)}
    L = {}
    for perm in [(0, 1, 2), (1, 0, 2), (2, 1, 0)]:
        L = padd(L, permute(Hpoly, perm))
    L = pscale(L, 1 / 3)   # (H(u)+H(v)+H(t))/3
    # monomial index
    monos = [(a, b, c) for a in range(deg + 1) for b in range(deg + 1 - a) for c in range(deg + 1 - a - b)]
    idx = {m: i for i, m in enumerate(monos)}
    nm = len(monos)
    import scipy.sparse as sp
    lin_terms = []   # (sparse nm x s^2 matrix, PSD variable)

    def add_block(entry_poly, size, var):
        rows, cols, vals = [], [], []
        for i in range(size):
            for j in range(size):
                for m, c in entry_poly(i, j).items():
                    rows.append(idx[m])
                    cols.append(i * size + j)
                    vals.append(float(c))
        Tm = sp.csr_matrix((vals, (rows, cols)), shape=(nm, size * size))
        lin_terms.append((Tm, var))

    Q = Qk(deg // 2)
    for k in range(0, deg // 2):
        size = deg // 2 + 1 - k
        F = cp.Variable((size, size), PSD=True)

        def Rentry(i, j, k=k):
            Sij = sym(pmul(pmul({(i, 0, 0): Fr(1)}, {(0, j, 0): Fr(1)}), Q[k]))
            Rij = pscale(Sij, 6)
            for w in range(3):
                Rij = padd(Rij, pscale(subst_uu1(Sij, w), Fr(6, NPTS - 2)))
            if k == 0:
                Rij = padd(Rij, pscale(ONE, Fr(6, (NPTS - 1) * (NPTS - 2))))
            return Rij
        add_block(Rentry, size, F)

    def sos_block(mult, d):
        basis = [(a, b, c) for a in range(d + 1) for b in range(d + 1 - a) for c in range(d + 1 - a - b)]
        X = cp.Variable((len(basis), len(basis)), PSD=True)
        add_block(lambda i, j: pmul(pmul({basis[i]: Fr(1)}, {basis[j]: Fr(1)}), mult), len(basis), X)
        return X
    sos_block(ONE, deg // 2)
    for x in (U, V, T):
        sos_block(padd(ONE, pmul(x, x), -1), (deg - 2) // 2)
    if gram:
        g = padd(padd(padd(padd(ONE, pscale(pmul(pmul(U, V), T), 2)), pmul(U, U), -1), pmul(V, V), -1), pmul(T, T), -1)
        sos_block(g, (deg - 3) // 2)
    e = cp.Variable()
    rhs = np.array([L.get(m, 0.0) for m in monos])
    e_col = np.zeros(nm)
    e_col[idx[(0, 0, 0)]] = 1.0 / (NPTS * (NPTS - 1) / 2)
    expr = sum(Tm @ cp.vec(X, order="C") for Tm, X in lin_terms) + e_col * e
    constraints = [expr == rhs]
    prob = cp.Problem(cp.Maximize(e), constraints)
    for solver in ("CLARABEL", "SCS"):
        try:
            prob.solve(solver=solver, verbose=False)
            break
        except Exception as ex:  # noqa
            if verbose:
                print("solver", solver, "failed:", ex)
    if verbose:
        print("status %s; three-point bound e* = %.8f; bipyramid E(B) = %.8f; gap %.3e"
              % (prob.status, e.value if e.value is not None else float("nan"), E_B,
                 (E_B - e.value) if e.value is not None else float("nan")))
    return prob.status, e.value, E_B


if __name__ == "__main__":
    deg = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 12
    npts = 8 if "--n8" in sys.argv else 7
    contact = 4 if "--contact4" in sys.argv else 2
    run(deg, gram="--gram" in sys.argv, npts=npts, contact=contact)
