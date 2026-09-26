"""Independent reimplementation: shared model definitions (ball arithmetic, python-flint arb).

Written without reading papers/nf-pulse/code. Model (Pinto-Ermentrout travelling wave, gamma = 0):
    U' = kappa (Q - U - V),  V' = eps kappa U,  Q' = P,  P' = Q - S(U),
    S(u) = 1/(1 + exp(-beta (u - theta))),  beta = 20, theta = 1/4, eps = 1/10, kappa = 1/c.
State order: (U, V, Q, P).  Rest: (0, S(0), S(0), 0).
"""
from flint import arb, arb_mat, fmpq, ctx

PREC = 320
ctx.prec = PREC

BETA = arb(20)
THETA = arb(fmpq(1, 4))
EPS = arb(fmpq(1, 10))

C1_Q = fmpq(11027477097341592491478677, 10**25)
C2_Q = C1_Q + fmpq(1, 10**25)


def S(u):
    return 1 / (1 + (-BETA * (u - THETA)).exp())


def S0():
    return S(arb(0))


def s1():
    """S'(0) = beta S(0)(1 - S(0))."""
    y = S0()
    return BETA * y * (1 - y)


def kappa_of(cq):
    """kappa = 1/c as a ball; cq an fmpq (exact) or an arb."""
    return 1 / arb(cq) if isinstance(cq, fmpq) else 1 / cq


def jac_rest(kap):
    s = s1()
    return arb_mat([[-kap, -kap, kap, 0], [EPS * kap, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])


def charpoly_coeffs(kap):
    """p(l) = l^4 + k l^3 + (eps k^2 - 1) l^2 + k (s - 1) l - eps k^2 (derived by hand, checked
    against arb_mat.charpoly in certify_rest_reimpl.py)."""
    s = s1()
    return [-EPS * kap * kap, kap * (s - 1), EPS * kap * kap - 1, kap, arb(1)]


def peval(co, x):
    r = arb(0)
    for c in reversed(co):
        r = r * x + c
    return r


def eigvec(lam, kap):
    """Eigenvector of the linearization for eigenvalue lam, normalized to U-component 1:
    V = eps k / lam, Q = -s/(lam^2 - 1), P = lam Q."""
    s = s1()
    q = -s / (lam * lam - 1)
    return [arb(1), EPS * kap / lam, q, lam * q]


def exact_mid(x):
    """An exact dyadic number (radius 0) at the midpoint of a ball."""
    return x.mid()


def ub(x):
    """Rigorous upper bound of |x| as an exact arb."""
    return abs(x).upper() if hasattr(abs(x), 'upper') else x.abs_upper()


def taylor_coeffs(x0, kap, N):
    """Taylor coefficients (orders 0..N) of the solution through x0 = [U,V,Q,P] (balls).
    S(U(xi)) is expanded through Y' = beta Y (1 - Y) U', with Y_0 = S(U_0) evaluated directly,
    so Y is never a propagated state. Inclusion-monotone: valid for boxes."""
    U = [x0[0]]; V = [x0[1]]; Q = [x0[2]]; P = [x0[3]]
    Y = [S(x0[0])]
    W = [Y[0] - Y[0] * Y[0]]
    ek = EPS * kap
    for k in range(N):
        if k >= 1:
            acc = arb(0)
            for j in range(k):
                acc += W[j] * ((k - j) * U[k - j])
            Y.append(BETA * acc / k)
            w = Y[k]
            for i in range(k + 1):
                w -= Y[i] * Y[k - i]
            W.append(w)
        U.append(kap * (Q[k] - U[k] - V[k]) / (k + 1))
        V.append(ek * U[k] / (k + 1))
        Q.append(P[k] / (k + 1))
        P.append((Q[k] - Y[k]) / (k + 1))
    return [U, V, Q, P]
