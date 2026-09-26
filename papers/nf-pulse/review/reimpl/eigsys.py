"""Eigen-coordinate form of the wave ODE at a POINT speed c (ball of radius ~2^-prec).

x = rest + V z, V = [v_u, v_1, v_2, v_3] (eigenvectors with U-component 1), so
    z' = Lambda z + w N(U),   U = z_0 + z_1 + z_2 + z_3,   w = V^{-1} e_4,
    N(U) = -(S(U) - S(0) - S'(0) U),
since the vector field equals J (x - rest) + e_4 N(U) exactly (the only nonlinearity is S in the P row).
The balls for Lambda, V, w contain the exact eigen-decomposition, so ball evaluations are rigorous.
"""
from flint import arb, arb_mat, ctx
import nfmodel as M

def refine_root(cf, lo, hi, iters):
    pa = M.peval(cf, lo); sa = 1 if pa > 0 else -1
    assert (pa > 0) or (pa < 0)
    pb = M.peval(cf, hi); assert (pb > 0 and sa < 0) or (pb < 0 and sa > 0)
    for _ in range(iters):
        m = arb(((lo+hi)/2).mid())
        pm = M.peval(cf, m)
        if pm > 0: sm = 1
        elif pm < 0: sm = -1
        else: break
        if sm == sa: lo = m
        else: hi = m
    return lo.union(hi)

class EigSystem:
    def __init__(self, c, p=None):
        self.p = p or M.params()
        p = self.p
        self.c = c; self.k = k = 1/c
        cf = M.charpoly_coeffs(k, p)
        br = [('0.5', '1.2'), ('-1.3', '-1.0'), ('-0.7', '-0.4'), ('-0.2', '-0.05')]
        # order: unstable first, then stable (fast, middle, slow)
        self.lam = [refine_root(cf, arb(a), arb(b), ctx.prec + 20) for a, b in br]
        cols = [M.eigvec(l, k, p) for l in self.lam]
        self.V = arb_mat([[cols[j][i] for j in range(4)] for i in range(4)])
        self.W = self.V.inv()
        self.w = [self.W[i, 3] for i in range(4)]
        self.S0 = M.S(arb(0), p); self.s = M.slope0(p)
        self.rest = M.rest(p)
        self.beta = p['beta']; self.theta = p['theta']

    def to_x(self, z):
        return [self.rest[i] + sum((self.V[i, j]*z[j] for j in range(4)), arb(0)) for i in range(4)]

    def to_z(self, x):
        d = [x[i]-self.rest[i] for i in range(4)]
        return [sum((self.W[i, j]*d[j] for j in range(4)), arb(0)) for i in range(4)]

    def taylor(self, z0, N):
        """Taylor coefficients z[i][n], n = 0..N, of the solution through z0 (balls enclose all points of z0).

        The nonlinearity N(U) = -(S(U) - S0 - s U) is O(U^2) near rest; evaluating it as a difference of O(U)
        balls would double the radius (dependency).  So the U_m-linear part of the m-th coefficient of S(U) is
        split off exactly:  Y_m = S'(U_0) U_m + Yhat_m,  and  S'(U_0) - s  is enclosed by the mean-value form
        S''(hull(0, U_0)) U_0.  N_0 = N(U_0) is enclosed by the mean-value form N(mid) + N'(.)(U_0 - mid), with
        N'(u) = -(S'(u) - s) enclosed as -S''(hull(0,u)) u, intersected with the direct evaluation.  Every
        formula is an identity, so the result encloses the exact coefficients for every point of the ball."""
        lam, w, beta = self.lam, self.w, self.beta
        z = [[z0[i]] for i in range(4)]
        U0 = z0[0]+z0[1]+z0[2]+z0[3]
        U = [U0]
        E0 = (-beta*(U0-self.theta)).exp()
        Y0 = 1/(1+E0)
        E = [E0]; Y = [Y0]
        def S2(u):   # S''(u) = beta^2 Y (1-Y)(1-2Y)
            y = 1/(1+(-beta*(u-self.theta)).exp())
            return beta*beta*y*(1-y)*(1-2*y)
        dS1 = S2(U0.union(arb(0)))*U0                      # encloses S'(U0) - s (mean value form)
        dS1 = dS1.intersection(beta*Y0*(1-Y0) - self.s)   # and the direct form; both are enclosures
        um = arb(U0.mid())
        Nm = -(1/(1+(-beta*(um-self.theta)).exp()) - self.S0 - self.s*um)
        hul = U0.union(um).union(arb(0))
        dN = -(S2(hul)*U0.union(um))       # encloses N'(u) = -(S'(u)-s) = -S''(xi) u for u in hull(U0, mid)
        N0 = Nm + dN*(U0 - um)
        Nd = -(Y0 - self.S0 - self.s*U0)
        N0 = N0.intersection(Nd)
        Nn = [N0]
        for n in range(N):
            for i in range(4):
                z[i].append((lam[i]*z[i][n] + w[i]*Nn[n])/(n+1))
            m = n+1
            Um = z[0][m]+z[1][m]+z[2][m]+z[3][m]
            U.append(Um)
            acc = arb(0)
            for j in range(1, m):
                acc += j*U[j]*E[m-j]
            Ehat = -beta*acc/m
            E.append(Ehat - beta*E0*Um)
            acc = arb(0)
            for j in range(1, m):
                acc += E[j]*Y[m-j]
            Yhat = -Y0*(Ehat*Y0 + acc)
            Y.append((dS1 + self.s)*Um + Yhat)
            Nn.append(-(dS1*Um + Yhat))
        return z

    def taylor_var(self, z0, N):
        """Taylor coefficients (n = 0..N-1) of the fundamental matrix Phi of the variational equation
        Phi' = Df(z(t)) Phi, Phi(0) = I, along the solution through z0 (ball: encloses every point of z0).
        Phi[n][i][j] = d z_i^[n] / d z0_j, so sum_n h^n Phi[n] is the Jacobian of the Taylor polynomial."""
        lam, w, beta = self.lam, self.w, self.beta
        zc = self.taylor(z0, N)
        U = [zc[0][n]+zc[1][n]+zc[2][n]+zc[3][n] for n in range(N+1)]
        # rebuild Y series (same recursion) to get S'(U(t)) = beta Y (1 - Y)
        U0 = U[0]
        E0 = (-beta*(U0-self.theta)).exp(); Y0 = 1/(1+E0)
        E = [E0]; Y = [Y0]
        for m in range(1, N):
            acc = arb(0)
            for j in range(1, m+1):
                acc += j*U[j]*E[m-j]
            E.append(-beta*acc/m)
            acc = arb(0)
            for j in range(1, m+1):
                acc += E[j]*Y[m-j]
            Y.append(-acc*Y0)
        def S2(u):
            y = 1/(1+(-beta*(u-self.theta)).exp())
            return beta*beta*y*(1-y)*(1-2*y)
        dS1 = (S2(U0.union(arb(0)))*U0).intersection(beta*Y0*(1-Y0) - self.s)
        Np = [-dS1]                         # N'(U(t)) series: N' = -(S'(U) - s)
        for n in range(1, N):
            acc = arb(0)
            for a in range(0, n+1):
                acc += Y[a]*Y[n-a]
            Np.append(-beta*(Y[n] - acc))
        Phi = [[[arb(1) if i == j else arb(0) for j in range(4)] for i in range(4)]]
        PU = [[arb(1)]*4]                   # column sums of Phi (U-row of V is all ones)
        for n in range(N-1):
            G = []
            for j in range(4):
                acc = arb(0)
                for a in range(0, n+1):
                    acc += Np[a]*PU[n-a][j]
                G.append(acc)
            nxt = [[(lam[i]*Phi[n][i][j] + w[i]*G[j])/(n+1) for j in range(4)] for i in range(4)]
            Phi.append(nxt)
            PU.append([nxt[0][j]+nxt[1][j]+nxt[2][j]+nxt[3][j] for j in range(4)])
        return Phi
