"""Passive tracers in an exact self-similar collapse.
In xi = (x - z_c)/(lambda e^{i phi}) and s = int dt/lambda^2 the tracer flow is autonomous:
dxi/ds = W(xi) = V(xi) - kappa xi, V = velocity field of the t = 0 configuration.
Zeros of W: exact self-similar tracers. Enumerated as roots of the degree N^2+1 polynomial from
xi = rt(r(xi)), r(xi) = sum c_k/(xi - xi_k), c_k = G_k/(2 pi i conj(kappa)), then filtered.
Index of a zero: sign(|kappa|^2 - |F'(xi)|^2), F(xi) = (1/(2 pi i)) sum G_k/(xi - xi_k)."""
import mpmath as mp
import itertools, sys
mp.mp.dps = 50

def config(mu, th):
    from core import gammas, positions, kappa_bs
    G = gammas(mu); z = positions(mu, th)
    k, spread = kappa_bs(G, z)
    return G, z, k, spread

def stagnation(G, z, k):
    N = len(z)
    c = [g/(2j*mp.pi*mp.conj(k)) for g in G]
    # r(x) = A(x)/B(x); rt(y) = At(y)/Bt(y) with conjugated data
    x = mp.mpf  # placeholder
    # build polynomials with coefficient lists (highest first) using mp.polyroots-friendly representation
    def pmul(p, q):
        out = [mp.mpc(0)]*(len(p)+len(q)-1)
        for i, a in enumerate(p):
            for j, b in enumerate(q):
                out[i+j] += a*b
        return out
    def padd(p, q):
        n = max(len(p), len(q)); p = [0]*(n-len(p))+p; q = [0]*(n-len(q))+q
        return [a+b for a, b in zip(p, q)]
    def pscale(p, s): return [a*s for a in p]
    B = [mp.mpc(1)]
    for zk in z: B = pmul(B, [1, -zk])
    A = [mp.mpc(0)]
    for kk in range(N):
        term = [mp.mpc(c[kk])]
        for jj in range(N):
            if jj != kk: term = pmul(term, [1, -z[jj]])
        A = padd(A, term)
    # rt(y) = sum conj(c_k)/(y - conj(z_k)); substitute y = A/B: rt = sum conj(c_k) B / (A - conj(z_k) B)
    # equation x = rt(r(x)):  x * prod_k (A - conj(z_k) B) = B * sum_k conj(c_k) prod_{j != k} (A - conj(z_j) B)
    D = [(padd(A, pscale(B, -mp.conj(zk)))) for zk in z]
    lhs = [mp.mpc(1), mp.mpc(0)]
    for d in D: lhs = pmul(lhs, d)
    rhs = [mp.mpc(0)]
    for kk in range(N):
        t = pscale(B, mp.conj(c[kk]))
        for jj in range(N):
            if jj != kk: t = pmul(t, D[jj])
        rhs = padd(rhs, t)
    poly = padd(lhs, pscale(rhs, -1))
    while abs(poly[0]) < mp.mpf(10)**(-mp.mp.dps+8): poly = poly[1:]
    roots = mp.polyroots(poly, maxsteps=500, extraprec=200)
    zeros = []
    for x0 in roots:
        F = sum(g/(2j*mp.pi*(x0-zk)) for g, zk in zip(G, z))
        Wc = F - mp.conj(k)*mp.conj(x0)       # conj(W) = F - conj(k) conj(x)
        if abs(Wc) < mp.mpf(10)**(-mp.mp.dps+12) and min(abs(x0-zk) for zk in z) > mp.mpf(10)**(-mp.mp.dps//3):
            Fp = sum(-g/(2j*mp.pi*(x0-zk)**2) for g, zk in zip(G, z))
            ind = 1 if abs(Fp) < abs(k) else -1
            zeros.append((x0, ind, abs(Fp)/abs(k)))
    return len(poly)-1, roots, zeros

if __name__ == '__main__':
    from core import theta0, P_of
    import random
    random.seed(1)
    rows = []
    for mu in ['1', '0.5', '0.2', '0.05', '0.8']:
        m = mp.mpf(mu); t0 = theta0(m)
        ths = [t0*mp.mpf(f) for f in ['0.1', '0.5', '0.9']] + [mp.pi + (mp.pi - t0)*mp.mpf(f) for f in ['0.1', '0.5', '0.9']]
        for th in ths:
            G, z, k, sp = config(m, th)
            deg, roots, zeros = stagnation(G, z, k)
            isum = sum(i for _, i, _ in zeros)
            nsad = sum(1 for _, i, _ in zeros if i < 0); nsrc = sum(1 for _, i, _ in zeros if i > 0)
            print('mu=%s th=%.4f P=%.4f deg=%d zeros=%d saddles=%d sources=%d index-sum=%d  min| |F\'|/|k| - 1 |=%.2e' % (
                mu, float(th), float(P_of(k)), deg, len(zeros), nsad, nsrc, isum, float(min(abs(r-1) for _, _, r in zeros))), flush=True)
