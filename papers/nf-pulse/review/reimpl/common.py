# common.py -- shared model definitions for the independent reimplementation (review/reimpl).
# Written from the equations only; nothing here is taken from papers/nf-pulse/code/.
# Model: Pinto-Ermentrout field, beta=20, theta=1/4, eps=1/10, gamma=0, w=e^{-|x|}/2.
# Wave ODE (xi = x + c t, kappa = 1/c, Q = w*S(U), P = Q'):
#   U' = kappa (Q - U - V),  V' = eps kappa U,  Q' = P,  P' = Q - S(U).
# We work in deviation coordinates y = x - rest, rest = (0, S0, S0, 0), S0 = S(0), and write
#   S(U) - S0 = D(U) = A (1 - e^{-beta U}) / ((1 + A)(1 + A e^{-beta U})),  A = e^{beta theta},
# which keeps full relative accuracy for tiny U (needed near rest).
# Not run on its own.
from flint import arb, fmpq, ctx

BETA = fmpq(20)
THETA = fmpq(1, 4)
EPS = fmpq(1, 10)
C1 = fmpq(11027477097341592491478677, 10**25)
C2 = C1 + fmpq(1, 10**25)

def consts():
    """Model constants as arb balls at the current precision."""
    A = arb(BETA * THETA).exp()            # e^5
    S0 = 1 / (1 + A)                       # S(0)
    s = arb(BETA) * S0 * (1 - S0)          # S'(0)
    return A, S0, s

def S_arb(u):
    return 1 / (1 + (-arb(BETA) * (u - arb(THETA))).exp())

def Sp_arb(u):
    """S'(u) = beta S (1-S), evaluated with a formula that is tight for interval u:
    S' = beta / (e^{z/2} + e^{-z/2})^2 with z = beta(u - theta); cosh is even and increasing in |z|."""
    z = arb(BETA) * (u - arb(THETA))
    # enclose |z| range, then use monotonicity of 1/(4 cosh^2(z/2)) in |z|
    lo = z.abs_lower(); hi = z.abs_upper()
    f = lambda t: arb(BETA) / (4 * (t / 2).cosh() ** 2)
    return f(arb(hi)).union(f(arb(lo)))
