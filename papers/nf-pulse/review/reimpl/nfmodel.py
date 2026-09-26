"""Shared model definitions for the rigorous scripts (python-flint arb).  Written from the equations only.

Wave ODE (xi = x + c t, kappa = 1/c):  U' = kappa (Q - U - V),  V' = eps kappa (U - gamma V),  Q' = P,  P' = Q - S(U).
Parameters are exact rationals turned into balls at the working precision.
"""
from flint import arb, arb_mat, ctx

def params():
    return dict(beta=arb(20), theta=arb(1)/4, eps=arb(1)/10, gamma=arb(0))

C1_STR = '1.1027477097341592491478677'
def c1():
    # decimal string -> ball containing the exact decimal
    return arb(C1_STR)
def c2():
    return arb(C1_STR) + arb(10)**-25
def c_interval():
    a, b = c1(), c2()
    return a.union(b)

def S(u, p):
    return 1/(1 + (-p['beta']*(u - p['theta'])).exp())

def rest(p):
    """gamma = 0: V' = 0 forces U = 0; U' = 0 gives V = Q; Q' = 0 gives P = 0; P' = 0 gives Q = S(0)."""
    S0 = S(arb(0), p)
    return [arb(0), S0, S0, arb(0)]

def slope0(p):
    S0 = S(arb(0), p)
    return p['beta']*S0*(1-S0)

def jacobian(k, p):
    s = slope0(p); e = p['eps']; g = p['gamma']
    return arb_mat([[-k, -k, k, 0], [e*k, -e*k*g, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])

def charpoly_coeffs(k, p):
    """(l^2 + k l + eps k^2)(l^2 - 1) + k s l  (gamma = 0), coefficients low -> high."""
    s = slope0(p); e = p['eps']
    return [-e*k*k, k*(s-1), e*k*k - 1, k, arb(1)]

def peval(cf, x):
    r = arb(0)
    for a in reversed(cf):
        r = r*x + a
    return r

def eigvec(lam, k, p):
    """Eigenvector of the rest Jacobian for eigenvalue lam (lam != 0, +-1): U = 1, V = eps k / lam,
    Q = -s/(lam^2-1), P = lam Q.  From lam V = eps k U, lam Q = P, lam P = Q - s U."""
    s = slope0(p); e = p['eps']
    Q = -s/(lam*lam-1)
    return [arb(1), e*k/lam, Q, lam*Q]
