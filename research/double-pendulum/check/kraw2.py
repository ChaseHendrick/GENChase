import time, sys
from common import *
from mvint import *
def inv2(M):
    d = M[0][0]*M[1][1]-M[0][1]*M[1][0]
    return [[M[1][1]/d, -M[0][1]/d], [-M[1][0]/d, M[0][0]/d]]
t0 = time.time()
def fmap_set(Z, nret=1, shift=1, verbose=False):
    X0 = [arb(0), Z[0], lift(Z[0], Z[1]), Z[1]]
    XP, VP, T = return_map_set(X0, nret, verbose=verbose)
    F = field(XP)
    DP = [[VP[i][j] - F[i]*VP[0][j]/F[0] for j in range(4)] for i in range(4)]
    a, b = dlift(Z[0], Z[1])
    L = [[arb(0),arb(0)],[arb(1),arb(0)],[a,b],[arb(0),arb(1)]]
    Df = [[sum((DP[r][k]*L[k][j] for k in range(4)), arb(0)) for j in range(2)] for r in (1,3)]
    return (XP[1] + 2*PI*shift*nret, XP[3]), Df, T, XP
# 1. Newton from a coarse independent guess, with the rigorous point derivative
p = [arb(0), arb('-1.46')]
for it in range(6):
    out, Df, T, XP = fmap_set(p)
    Fv = [out[0]-p[0], out[1]-p[1]]
    J = [[Df[0][0]-1, Df[0][1]], [Df[1][0], Df[1][1]-1]]
    Ci = inv2([[arb(x.mid()) for x in r] for r in J])
    p = [arb((p[0] - (Ci[0][0]*Fv[0]+Ci[0][1]*Fv[1])).mid()), arb((p[1] - (Ci[1][0]*Fv[0]+Ci[1][1]*Fv[1])).mid())]
    print('newton', it, 'residual', Fv[0].str(4, radius=True), Fv[1].str(4, radius=True), 'p2', p[1].str(25), '%.0fs' % (time.time()-t0), flush=True)
out, Df, T, XP = fmap_set(p)
Fp = [out[0]-p[0], out[1]-p[1]]
print('rigorous F(p*) =', Fp[0].str(5, radius=True), Fp[1].str(5, radius=True), 'T =', T.str(20, radius=True), flush=True)
print('rigorous Df(p*) =', [[x.str(12, radius=True) for x in r] for r in Df], flush=True)
r = arb(10)**-16
B = [p[0] + UNIT*r, p[1] + UNIT*r]
outB, DfB, TB, XPB = fmap_set(B, verbose=True)
DF = [[DfB[0][0]-1, DfB[0][1]], [DfB[1][0], DfB[1][1]-1]]
print('DF(B) =', [[x.str(10, radius=True) for x in rr] for rr in DF])
Cm = inv2([[arb(x.mid()) for x in row] for row in DF]); Cm = [[arb(x.mid()) for x in row] for row in Cm]
IC = [[(1 if i == j else 0) - (Cm[i][0]*DF[0][j] + Cm[i][1]*DF[1][j]) for j in range(2)] for i in range(2)]
K = [p[i] - (Cm[i][0]*Fp[0] + Cm[i][1]*Fp[1]) + IC[i][0]*UNIT*r + IC[i][1]*UNIT*r for i in range(2)]
print('B =', [b.str(25, radius=True) for b in B])
print('K =', [k.str(25, radius=True) for k in K])
print('K in int B:', all(inside(K[i], B[i]) for i in range(2)), ' G(K) in B:', inside(-K[0], B[0]))
tr = DfB[0][0] + DfB[1][1]; det = DfB[0][0]*DfB[1][1] - DfB[0][1]*DfB[1][0]
lam = tr/2 - (tr*tr/4 - det).sqrt()
print('trace over B', tr.str(12, radius=True), 'det over B', det.str(12, radius=True), 'lambda_u', lam.str(12, radius=True))
print('p2* inside CAPD K[1] = [-1.4623730924803009, -1.4623730924794167]:', p[1] > arb('-1.4623730924803009') and p[1] < arb('-1.4623730924794167'))
print('elapsed %.0fs' % (time.time()-t0))
