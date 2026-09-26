# Checks that the validated manifold point P(t) satisfies Y = S(U) (enclosure of Y - S(U) contains 0) for the kappa interval and sigma = 1/7; run: python3 surface_check.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'code'))
from flint import arb, ctx, fmpq
import nfcore as nf, certify_rest as cr, manifold as mf
ctx.prec = 256
s = nf.dS(arb(0))
for name, cc in (('c1', cr.C1), ('c2', cr.C2), ('interval', cr.C1.union(cr.C2))):
    kappa = 1 / cc
    lam = cr.refine(cr.charpoly_coeffs(kappa, s, nf.EPS), arb('0.5'), arb('1.2'))
    ok, a, r, info = mf.validate(kappa, lam, arb(fmpq(1, 7)), 80)
    for t in (fmpq(1, 4), fmpq(1, 2), fmpq(1, 1), fmpq(-1, 4)):
        x = mf.evaluate(a, r, arb(t))
        d = x[4] - nf.S(x[0])
        print('%-8s ok=%s t=%-5s U=%s  Y-S(U)=%s contains0=%s' % (name, ok, t, x[0].str(8), d.str(5), d.contains(0)))
    # coefficient-level check: the Y-series equals the series of S(U(t)) up to order 80
    # Y' = beta Y (1-Y) U' with Y(0) = S(0) determines Y from U; the recursion's Y must satisfy it.
    N = len(a) - 1
    Yc = [a[n][4] for n in range(N + 1)]; Uc = [a[n][0] for n in range(N + 1)]
    beta = nf.BETA
    worst = arb(0)
    for n in range(1, N + 1):   # n Y_n = beta * sum_{j} (Y(1-Y))_{n-j} * j U_j
        Z = [Yc[m] - sum((Yc[i] * Yc[m - i] for i in range(m + 1)), arb(0)) for m in range(n)]
        rhs = beta * sum((Z[n - j] * j * Uc[j] for j in range(1, n + 1)), arb(0))
        dres = n * Yc[n] - rhs
        worst = worst.max(arb(dres.abs_upper()))
        if not dres.contains(0):
            print('  coefficient', n, 'violates Y=S(U):', dres.str(5)); break
    print('  series identity n Y_n = beta sum (Y(1-Y))_{n-j} j U_j holds for n<=%d, max |residual| <= %s' % (N, worst.str(3)))
