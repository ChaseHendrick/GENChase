from dparb import *
import dparb
from flint import arb, arb_mat
PI = arb.pi()
def lift(t2v, p2v, E=arb(0)):
    cc = t2v.cos(); sn = t2v.sin(); D = 1 + sn*sn
    w = 2*(E+2+cc) - p2v*p2v
    assert w > 0
    return cc*p2v + (D*w).sqrt()
def dlift(t2v, p2v, E=arb(0)):
    c = t2v.cos(); s = t2v.sin(); D = 1 + s*s
    w = 2*(E+2+c) - p2v*p2v; r = (D*w).sqrt()
    # d/dt2 [c p2 + sqrt(D w)] = -s p2 + (D' w + D w')/(2r), D' = 2 s c, w' = -2 s ; d/dp2 = c + D(-2p2)/(2r)
    return -s*p2v + (2*s*c*w + D*(-2*s))/(2*r), c + D*(-2*p2v)/(2*r)
def Hf(x):
    t1,t2,p1,p2 = x[:4]; c=(t1-t2).cos(); D=2-c*c
    return (p1*p1+2*p2*p2-2*c*p1*p2)/(2*D) - 2*t1.cos() - t2.cos()
def ftilde(z, nret=1, shift=1, E=arb(0), h=0.006, deriv=False):
    t2v, p2v = z
    x0 = [arb(0), t2v, lift(t2v, p2v, E), p2v]
    if deriv:
        x0 = x0 + [arb(1) if i == j else arb(0) for i in range(4) for j in range(4)]
    xc, T = return_map(x0, nret, h=h)
    out = (xc[1] + 2*PI*shift*nret, xc[3])
    if not deriv:
        return out, T, xc
    V = [[xc[4 + 4*i + j] for j in range(4)] for i in range(4)]
    F = field(xc[:4])
    DP = [[V[i][j] - F[i]*V[0][j]/F[0] for j in range(4)] for i in range(4)]
    a, b = dlift(t2v, p2v, E)
    L = [[arb(0),arb(0)],[arb(1),arb(0)],[a,b],[arb(0),arb(1)]]
    Df = [[sum((DP[r][k]*L[k][j] for k in range(4)), arb(0)) for j in range(2)] for r in (1,3)]
    return out, T, xc, Df
