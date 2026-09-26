# Independent rigorous (Arb) Krawczyk proof of the symmetric fixed point at E = 0, and its multiplier.
import time, sys
from common import *
def m2(A,B): return [[A[i][0]*B[0][j]+A[i][1]*B[1][j] for j in range(2)] for i in range(2)]
def inv2(M):
    d = M[0][0]*M[1][1]-M[0][1]*M[1][0]
    return [[M[1][1]/d, -M[0][1]/d], [-M[1][0]/d, M[0][0]/d]]
t0=time.time()
# numerical start independent of the config: coarse guess
p = [arb(0), arb('-1.46')]
Dfp = [[arb('-1.9043'),arb('5.2611')],[arb('0.49922'),arb('-1.9043')]]  # from the rigorous derivative at the config point, rounded
for it in range(4):
    out,T,xc = ftilde(p)
    Fv = [out[0]-p[0], out[1]-p[1]]
    J = [[Dfp[0][0]-1, Dfp[0][1]],[Dfp[1][0], Dfp[1][1]-1]]
    Ci = inv2(J)
    step_ = [Ci[0][0]*Fv[0]+Ci[0][1]*Fv[1], Ci[1][0]*Fv[0]+Ci[1][1]*Fv[1]]
    p = [arb((p[0]-step_[0]).mid()), arb((p[1]-step_[1]).mid())]
    print('newton', it, 'residual', [f.str(5) for f in Fv], 'p2 =', p[1].str(30), time.time()-t0, flush=True)
out,T,xc = ftilde(p)
Fp = [out[0]-p[0], out[1]-p[1]]
print('F(p*) =', Fp, 'return time', T, flush=True)
r = arb(10)**-20
B = [p[0] + UNIT*r, p[1] + UNIT*r]
out,T,xc,DfB = ftilde(B, deriv=True)
print('Df over B:', DfB, flush=True)
DF = [[DfB[0][0]-1, DfB[0][1]],[DfB[1][0], DfB[1][1]-1]]
Cm = inv2([[arb(x.mid()) for x in row] for row in DF]); Cm = [[arb(x.mid()) for x in row] for row in Cm]
IC = [[ (1 if i==j else 0) - (Cm[i][0]*DF[0][j]+Cm[i][1]*DF[1][j]) for j in range(2)] for i in range(2)]
K = [p[i] - (Cm[i][0]*Fp[0]+Cm[i][1]*Fp[1]) + (IC[i][0]*UNIT*r + IC[i][1]*UNIT*r) for i in range(2)]
ok = all(inside(K[i], B[i]) for i in range(2))
print('K =', K); print('K in int B:', ok)
print('G(K) in B:', inside(-K[0], B[0]))
tr = DfB[0][0]+DfB[1][1]; det = DfB[0][0]*DfB[1][1]-DfB[0][1]*DfB[1][0]
print('trace over B', tr, 'det over B', det)
disc = (tr*tr/4 - det)
lam = tr/2 - disc.sqrt()
print('eigenvalue', lam, '|lam| > 1:', abs(lam) > 1)
print('CAPD y_E enclosure [-1.4623730924803009, -1.4623730924794167] contains ours:', p[1] > arb('-1.4623730924803009') and p[1] < arb('-1.4623730924794167'))
print('elapsed', time.time()-t0)
