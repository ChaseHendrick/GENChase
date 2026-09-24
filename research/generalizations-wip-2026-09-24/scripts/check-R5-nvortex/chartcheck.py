"""Cross-check the reduced Hessian by moving along random tangent directions and projecting back onto the manifold."""
import sys, json, random
import mpmath as mp
from kkt_mp import residual, jacobian, normalize, free_indices, kkt_refine, reduced_hessian
fn = sys.argv[1]; dps = int(sys.argv[2])
d = json.load(open(fn)); mp.mp.dps = dps
G = [mp.mpf(g) for g in d['G']]; z = [mp.mpc(mp.mpf(a), mp.mpf(b)) for a, b in d['z']]
N = len(G)
X, j0, j1 = normalize(G, z, dps)
X, lam, _ = kkt_refine(X, N, j0, j1, dps=dps, iters=3, verbose=False)
fr = free_indices(N, j0, j1); nf = len(fr)
J = jacobian(X, N); Jf = mp.matrix([[J[i][a] for a in fr] for i in range(2 * N)])
U, S, V = mp.svd_r(Jf, full_matrices=True)
rank = 2 * N
Z = [[V[rank + c, a] for a in range(nf)] for c in range(nf - rank)]
# Lagrangian Hessian via same routine (eigen decomposition not needed; recompute quadratic form by FD of gradient)
def f2(Xc): return Xc[3 * N + 1] ** 2 / 4
def project(Xc):
    Xc = list(Xc)
    for it in range(8):
        R = residual(Xc, N)
        if max(abs(r) for r in R) < mp.mpf(10) ** (-(dps - 5)): break
        Jc = jacobian(Xc, N); Jm = mp.matrix([[Jc[i][a] for a in fr] for i in range(2 * N)])
        y = mp.lu_solve(Jm * Jm.T, mp.matrix(R)); dd = Jm.T * y
        for a in range(nf): Xc[fr[a]] -= dd[a]
    return Xc
random.seed(5)
s = mp.mpf(10) ** (-(dps // 5))
print('N', N, 'P', mp.nstr(abs(X[3 * N + 1]) / 2, 20), 'step', mp.nstr(s, 3))
for trial in range(6):
    c = [mp.mpf(random.gauss(0, 1)) for _ in range(nf - rank)]
    nrm = mp.sqrt(mp.fsum(x * x for x in c)); c = [x / nrm for x in c]
    t = [mp.fsum(c[k] * Z[k][a] for k in range(nf - rank)) for a in range(nf)]
    vals = []
    for sg in (1, -1):
        Xs = list(X)
        for a in range(nf): Xs[fr[a]] += sg * s * t[a]
        Xs = project(Xs)
        vals.append(f2(Xs))
    sec = (vals[0] + vals[1] - 2 * f2(X)) / s ** 2
    print('  dir', trial, 'second derivative of P^2 along manifold curve = %s ;  P^2(+s)-P^2(0)=%s, P^2(-s)-P^2(0)=%s' % (mp.nstr(sec, 8), mp.nstr(vals[0] - f2(X), 4), mp.nstr(vals[1] - f2(X), 4)))
ev, sv, rk, st = reduced_hessian(X, lam, N, j0, j1)
print('  reduced Hessian eigen range [%s, %s] (second derivative must lie in this range)' % (mp.nstr(ev[0], 6), mp.nstr(ev[-1], 6)))
