"""High-order Taylor-series integrator for three point vortices on the unit sphere.
Series recurrences are exact (products and a quotient), so the only error is truncation,
which is controlled by the step rule h = safety * (tol/|a_N|)^(1/N).
Vector field (unit sphere):  dx_i/dt = (1/2pi) sum_j Gamma_j (x_j x x_i)/|x_i - x_j|^2.
The denominator is |x_i - x_j|^2 itself (not 2 - 2 x_i.x_j), so no use is made of |x| = 1.
"""
import mpmath as mp

def _cross(u, v):
    return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]

def taylor_coeffs(X0, G, N):
    n = len(X0)
    two_pi = 2*mp.pi
    # xs[i][k] = k-th Taylor coefficient (3-list) of x_i
    xs = [[list(X0[i])] for i in range(n)]
    pairs = [(i, j) for i in range(n) for j in range(i+1, n)]
    q = {pr: [] for pr in pairs}    # |x_i-x_j|^2 series
    c = {pr: [] for pr in pairs}    # x_j x x_i series (3-lists)
    g = {pr: [] for pr in pairs}    # c/q series
    for k in range(N):
        for (i, j) in pairs:
            # q[k]
            qk = mp.mpf(0)
            ck = [mp.mpf(0)]*3
            for m in range(k+1):
                dm = [xs[i][m][t]-xs[j][m][t] for t in range(3)]
                dkm = [xs[i][k-m][t]-xs[j][k-m][t] for t in range(3)]
                qk += dm[0]*dkm[0]+dm[1]*dkm[1]+dm[2]*dkm[2]
                cr = _cross(xs[j][m], xs[i][k-m])
                ck = [ck[t]+cr[t] for t in range(3)]
            q[(i, j)].append(qk)
            c[(i, j)].append(ck)
            gk = list(ck)
            for m in range(1, k+1):
                gk = [gk[t] - q[(i, j)][m]*g[(i, j)][k-m][t] for t in range(3)]
            gk = [gk[t]/q[(i, j)][0] for t in range(3)]
            g[(i, j)].append(gk)
        for i in range(n):
            f = [mp.mpf(0)]*3
            for j in range(n):
                if j == i:
                    continue
                if i < j:
                    gg = g[(i, j)][k]; sg = 1
                else:
                    gg = g[(j, i)][k]; sg = -1   # x_j x x_i = -(x_i x x_j)
                f = [f[t] + sg*G[j]*gg[t] for t in range(3)]
            xs[i].append([f[t]/(two_pi*(k+1)) for t in range(3)])
    return xs

def step(X0, G, N, tol, safety=mp.mpf('0.5'), hmax=None):
    xs = taylor_coeffs(X0, G, N)
    n = len(X0)
    aN = max(max(abs(xs[i][N][t]) for t in range(3)) for i in range(n))
    aN1 = max(max(abs(xs[i][N-1][t]) for t in range(3)) for i in range(n))
    h1 = (tol/aN)**(mp.mpf(1)/N) if aN > 0 else mp.inf
    h2 = (tol/aN1)**(mp.mpf(1)/(N-1)) if aN1 > 0 else mp.inf
    h = safety*min(h1, h2)
    if hmax is not None:
        h = min(h, hmax)
    return xs, h

def evalser(xs, h):
    out = []
    for xi in xs:
        v = [mp.mpf(0)]*3
        for k in range(len(xi)-1, -1, -1):
            v = [v[t]*h + xi[k][t] for t in range(3)]
        out.append(v)
    return out

def evalder(xs, h):
    out = []
    for xi in xs:
        v = [mp.mpf(0)]*3
        for k in range(len(xi)-1, 0, -1):
            v = [v[t]*h + k*xi[k][t] for t in range(3)]
        out.append(v)
    return out
