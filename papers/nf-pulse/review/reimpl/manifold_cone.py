"""RIGOROUS enclosure of the unstable-manifold point at a = delta (eigen-coordinates z = (a, b), b in R^3).

Lemma (quadratic cone; proof in REIMPL.md).  Let m >= sup|S''|/2, so |N(U)| <= m U^2 for all U, and
|U| <= |a| + 3 ||b||_inf (the U-row of V is (1,1,1,1)).  Let mu = min |stable eigenvalue|, lam = unstable
eigenvalue, wb = max_{i>=1} |w_i|, wa = |w_0|.  If for some K, r, rho > 0:
  (I)   (mu + 2 lam) K > m (1 + 3 K r)^2 (wb + 2 K r wa)
  (II)  mu > wb m (K^(-1/2) + 3 rho^(1/2))^2
  (III) K r^2 < rho
  (IV)  lam > wa m r (1 + 3 K r)^2
then the branch of W^u(rest) that leaves with a > 0 (U increasing) crosses {a = delta} for every
0 < delta <= r, and at its first crossing ||b||_inf <= K delta^2.
"""
from flint import arb, ctx
from eigsys import EigSystem

def check(sysm, K, r, rho):
    p = sysm.p
    m = p['beta']**2/(12*arb(3).sqrt())          # sup |S''|/2 = beta^2/(12 sqrt 3)
    lam = sysm.lam[0]; mu = min(abs(l).lower() for l in sysm.lam[1:]); mu = arb(mu)
    wa = abs(sysm.w[0]); wb = max(abs(x).upper() for x in sysm.w[1:]); wb = arb(wb)
    K, r, rho = arb(K), arb(r), arb(rho)
    I = (mu + 2*lam)*K - m*(1+3*K*r)**2*(wb + 2*K*r*wa)
    II = mu - wb*m*(1/K.sqrt() + 3*rho.sqrt())**2
    III = rho - K*r*r
    IV = lam - wa*m*r*(1+3*K*r)**2
    ok = all(x > 0 for x in (I, II, III, IV))
    return ok, dict(m=m.str(10), lam=lam.str(10), mu=mu.str(10), wa=wa.str(10), wb=wb.str(10),
                    I=I.str(6), II=II.str(6), III=III.str(6), IV=IV.str(6), K=str(K.mid()), r=str(r.mid()), rho=str(rho.mid()))

if __name__ == '__main__':
    import nfmodel as M
    ctx.prec = 300
    for name, c in (('c1', M.c1()), ('c2', M.c2())):
        s = EigSystem(c)
        print(name, [l.str(12) for l in s.lam], [x.str(8) for x in s.w])
        for K in ('200', '500', '1000', '2000', '5000'):
            ok, d = check(s, K, '1e-5', '1e-6')
            print(' K', K, ok, d)
