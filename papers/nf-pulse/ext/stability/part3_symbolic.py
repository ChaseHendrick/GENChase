#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""EXACT (symbolic, SymPy): the algebra of Part 3 of Theorem S (REPORT.md, Section 5).

Checked identities, with U, V, Q, P, S, sigma and every vector component arbitrary functions of xi:
 a. The eigenvalue problem L(p, q) = lam (p, q), with r = w * (S'(U) p) written as r - r'' = S'(U) p and z = r', is
    phi' = A(xi, lam) phi for phi = (p, q, r, z), with the matrix A of Section 2.
 b. dA/dlam = diag(-kappa, -kappa, 0, 0): constant in xi and lam.
 c. phi0 = (U', V', Q', P') solves phi0' = A(xi, 0) phi0 whenever (U, V, Q, P) solves the wave ODE
    U' = kappa (-U - V + Q), V' = eps kappa U, Q' = P, P' = Q - S(U).
 d. A generalized eigenvector, L P1 = P0 with P0 = (U', V') and P1 = (p1, q1), is in ODE form
    phi1' = A(xi, 0) phi1 + (dA/dlam) phi0.
 e. If psi' = -A(xi, 0)^T psi and phi1' = A(xi, 0) phi1 + (dA/dlam) phi0, then (psi^T phi1)' = psi^T (dA/dlam) phi0.
 f. If psi_l' = -A(xi, 0)^T psi_l - (dA/dlam)^T psi, then (psi_l^T phi0)' = -psi^T (dA/dlam) phi0.
    (e and f are the two halves of the derivative of D(lam) = psi^+(xi, lam)^T phi^-(xi, lam) at lam = 0.)
 g. (dA/dlam) phi0 = (-kappa U', -kappa V', 0, 0), so the obstruction integral is -kappa int (psi_1 U' + psi_2 V').

Not checked here (analysis, written in Section 5): that bounded or decaying solutions correspond to L^2 functions,
the vanishing of the boundary terms at +-infinity, and that psi0 decays at both ends when D(0) = 0.
"""
import sys
import sympy as sp

xi, lam, kappa, eps = sp.symbols('xi lambda kappa epsilon')
c = 1 / kappa
fns = lambda names: [sp.Function(n)(xi) for n in names]
U, V, Q, P, Sp_ = fns(['U', 'V', 'Q', 'P', 'Sprime'])
S = sp.Function('S')
e1 = sp.Matrix([1, 0, 0, 0])
e4 = sp.Matrix([0, 0, 0, 1])
Ac = sp.Matrix([[-kappa * (lam + 1), -kappa, kappa, 0], [eps * kappa, -kappa * lam, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]])
A = Ac + (-Sp_) * e4 * e1.T                      # sigma = -S'(U)
A0 = A.subs(lam, 0)
Al = A.diff(lam)
results = []


def check(label, expr):
    ok = sp.simplify(expr) == sp.zeros(*expr.shape) if hasattr(expr, 'shape') else sp.simplify(expr) == 0
    results.append((label, ok))
    print(('OK    ' if ok else 'FAIL  ') + label, flush=True)


# a. eigenvalue problem -> ODE
p, q, r, z = fns(['p', 'q', 'r', 'z'])
phi = sp.Matrix([p, q, r, z])
# L(p, q) = lam (p, q):  -c p' - p - q + r = lam p,  -c q' + eps p = lam q;  r' = z,  z' = r - S'(U) p
sol = {p.diff(xi): sp.solve(sp.Eq(-c * p.diff(xi) - p - q + r, lam * p), p.diff(xi))[0],
       q.diff(xi): sp.solve(sp.Eq(-c * q.diff(xi) + eps * p, lam * q), q.diff(xi))[0],
       r.diff(xi): z, z.diff(xi): r - Sp_ * p}
check('a. L(p, q) = lam (p, q) is phi\' = A(xi, lam) phi', phi.diff(xi).subs(sol) - A * phi)

# b. dA/dlam
check('b. dA/dlam = diag(-kappa, -kappa, 0, 0)', Al - sp.diag(-kappa, -kappa, 0, 0))

# c. the derivative of the wave solves the variational equation (S'(U) = d S(U)/dU)
wave = {U.diff(xi): kappa * (-U - V + Q), V.diff(xi): eps * kappa * U, Q.diff(xi): P, P.diff(xi): Q - S(U)}
phi0 = sp.Matrix([kappa * (-U - V + Q), eps * kappa * U, P, Q - S(U)])      # (U', V', Q', P') on the wave ODE
lhs = phi0.diff(xi).subs(wave)
rhs = A0.subs(Sp_, S(U).diff(U)) * phi0
check("c. (U', V', Q', P') solves phi' = A(xi, 0) phi on the wave ODE", sp.simplify(lhs - rhs.subs(wave)))

# d. generalized eigenvector in ODE form
p0, q0 = fns(['p0', 'q0'])
p1, q1, r1, z1 = fns(['p1', 'q1', 'r1', 'z1'])
r0, z0 = fns(['r0', 'z0'])
phi1 = sp.Matrix([p1, q1, r1, z1])
ph0 = sp.Matrix([p0, q0, r0, z0])
# L(p1, q1) = (p0, q0):  -c p1' - p1 - q1 + r1 = p0,  -c q1' + eps p1 = q0;  r1' = z1,  z1' = r1 - S'(U) p1
sol1 = {p1.diff(xi): sp.solve(sp.Eq(-c * p1.diff(xi) - p1 - q1 + r1, p0), p1.diff(xi))[0],
        q1.diff(xi): sp.solve(sp.Eq(-c * q1.diff(xi) + eps * p1, q0), q1.diff(xi))[0],
        r1.diff(xi): z1, z1.diff(xi): r1 - Sp_ * p1}
check("d. L P1 = P0 is phi1' = A(xi, 0) phi1 + (dA/dlam) phi0", phi1.diff(xi).subs(sol1) - (A0 * phi1 + Al * ph0))

# e. and f. the integration identities
psi = sp.Matrix(fns(['s1', 's2', 's3', 's4']))
psl = sp.Matrix(fns(['t1', 't2', 't3', 't4']))
d_phi1 = A0 * phi1 + Al * ph0
d_phi0 = A0 * ph0
d_psi = -A0.T * psi
d_psl = -A0.T * psl - Al.T * psi
e_expr = (d_psi.T * phi1 + psi.T * d_phi1 - psi.T * Al * ph0)[0]
f_expr = (d_psl.T * ph0 + psl.T * d_phi0 + psi.T * Al * ph0)[0]
check("e. (psi^T phi1)' = psi^T (dA/dlam) phi0", sp.expand(e_expr))
check("f. (psi_l^T phi0)' = -psi^T (dA/dlam) phi0", sp.expand(f_expr))

# g. the obstruction integrand
Up, Vp, Qp, Pp = fns(['Up', 'Vp', 'Qp', 'Pp'])
check('g. (dA/dlam) phi0 = (-kappa U\', -kappa V\', 0, 0)', Al * sp.Matrix([Up, Vp, Qp, Pp]) - sp.Matrix([-kappa * Up, -kappa * Vp, 0, 0]))

# negative control: a wrong adjoint (psi' = +A^T psi) must fail identity e
bad = (A0.T * psi).T * phi1 + psi.T * d_phi1 - psi.T * Al * ph0
neg = sp.expand(bad[0]) != 0
results.append(('negative control: psi\' = +A^T psi breaks e', neg))
print(('OK    ' if neg else 'FAIL  ') + "negative control: psi' = +A^T psi breaks identity e", flush=True)

# negative control: the wrong sign of sigma (sigma = +S'(U)) must break identity c
bad_c = sp.simplify(lhs - (A0.subs(Sp_, -S(U).diff(U)) * phi0).subs(wave))
neg_c = bad_c != sp.zeros(4, 1)
results.append(("negative control: sigma = +S'(U) breaks c", neg_c))
print(('OK    ' if neg_c else 'FAIL  ') + "negative control: sigma = +S'(U) breaks identity c", flush=True)

allok = all(ok for _, ok in results)
print('PART 3 ALGEBRA: CHECKED' if allok else 'PART 3 ALGEBRA: FAILED')
sys.exit(0 if allok else 1)
