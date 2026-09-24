"""
High-precision refinement and certification of a local minimum of P = |w0| t_c over
self-similar N-vortex configurations.

Unknowns (gauge fixed):  G_2..G_N (G_1 = 1), u_1..u_N, v_2..v_N  (w_j = u_j + i v_j, v_1 = 0),
b with kappa = -1 + i b  (P = |b|/2), multipliers mu_j = lr_j + i li_j.
F_j = sum_k G_k/(w_j - w_k) - 2 pi i conj(kappa) conj(w_j)       [self-similarity, z_c = 0 forced]
Phi = Re sum_j conj(mu_j) F_j.   KKT: F = 0, dPhi/dx = 0, dPhi/db = 1.

Independent check: Biot-Savart velocities from scratch, z_c from circulations, q_j = zdot_j/(z_j - z_c).
Usage: python3 mpcert.py input.json dps out.json     (input: {"G": [...], "w": [[re,im],...], "b": b})
"""
import mpmath as mp, json, sys

def unpack(y, N):
    G = [mp.mpf(1)] + [y[i] for i in range(N-1)]
    o = N-1
    u = [y[o+i] for i in range(N)]; o += N
    v = [mp.mpf(0)] + [y[o+i] for i in range(N-1)]; o += N-1
    b = y[o]; o += 1
    mu = [mp.mpc(y[o+i], y[o+N+i]) for i in range(N)]
    w = [mp.mpc(u[i], v[i]) for i in range(N)]
    return G, w, b, mu

def F_of(G, w, b):
    N = len(G)
    ck = mp.mpc(-1, -b)            # conj(kappa)
    c = 2j*mp.pi*ck
    return [mp.fsum(G[k]/(w[j]-w[k]) for k in range(N) if k != j) - c*mp.conj(w[j]) for j in range(N)]

def kkt(y, N):
    G, w, b, mu = unpack(y, N)
    F = F_of(G, w, b)
    ck = mp.mpc(-1, -b); c = 2j*mp.pi*ck
    res = [f.real for f in F] + [f.imag for f in F]
    cm = [mp.conj(m) for m in mu]
    # dPhi/dG_k, k >= 2
    for k in range(1, N):
        res.append(mp.re(mp.fsum(cm[j]/(w[j]-w[k]) for j in range(N) if j != k)))
    # holomorphic A_jk and antiholomorphic B_jk = -c delta_jk
    def dPhi_dw(k):
        s = mp.mpc(0)
        for j in range(N):
            if j == k:
                A = -mp.fsum(G[m]/(w[j]-w[m])**2 for m in range(N) if m != j)
            else:
                A = G[k]/(w[j]-w[k])**2
            s += cm[j]*A
        return s        # sum_j conj(mu_j) A_jk
    for k in range(N):
        sA = dPhi_dw(k); sB = cm[k]*(-c)
        res.append(mp.re(sA + sB))                  # d/du_k
    for k in range(1, N):
        sA = dPhi_dw(k); sB = cm[k]*(-c)
        res.append(mp.re(1j*(sA - sB)))             # d/dv_k
    res.append(mp.re(mp.fsum(cm[j]*(-2*mp.pi*mp.conj(w[j])) for j in range(N))) - 1)
    return res

def numjac(fun, y, h):
    r0 = fun(y)
    J = mp.matrix(len(r0), len(y))
    for i in range(len(y)):
        yp = list(y); ym = list(y)
        yp[i] += h; ym[i] -= h
        rp = fun(yp); rm = fun(ym)
        for a in range(len(r0)):
            J[a, i] = (rp[a]-rm[a])/(2*h)
    return J

def newton(fun, y, h, tol, maxit=40, verbose=True):
    for it in range(maxit):
        r = fun(y)
        nr = max(abs(t) for t in r)
        if verbose: print('  it', it, 'res', mp.nstr(nr, 5), flush=True)
        if nr < tol: break
        J = numjac(fun, y, h)
        dy = mp.lu_solve(J, mp.matrix([-t for t in r]))
        y = [y[i] + dy[i] for i in range(len(y))]
    return y, nr

def biot_savart_check(G, z):
    """independent: velocities from conj(zdot_j) = (1/(2 pi i)) sum G_k/(z_j - z_k)."""
    N = len(G)
    Gt = mp.fsum(G); zc = mp.fsum(G[j]*z[j] for j in range(N))/Gt
    vel = [mp.conj(mp.fsum(G[k]/(z[j]-z[k]) for k in range(N) if k != j)/(2j*mp.pi)) for j in range(N)]
    rmax = max(abs(z[j]-zc) for j in range(N))
    far = [j for j in range(N) if abs(z[j]-zc) > mp.mpf(10)**(-mp.mp.dps//2)*rmax]
    jref = max(range(N), key=lambda j: abs(z[j]-zc))
    kap = vel[jref]/(z[jref]-zc)
    spread = max(abs(vel[j]/(z[j]-zc) - kap) for j in far)/abs(kap)
    near = [j for j in range(N) if j not in far]
    center_speed = max([abs(vel[j]) for j in near] or [mp.mpf(0)])
    s2 = mp.fsum(G[i]*G[j] for i in range(N) for j in range(i+1, N))
    L = mp.fsum(G[j]*abs(z[j]-zc)**2 for j in range(N))
    P = abs(kap.imag)/(-2*kap.real)
    return dict(kappa=kap, spread=spread, s2=s2, L=L, P=P, Gt=Gt, zc=zc, center_speed=center_speed, ncenter=len(near))

def run(inp, dps, out=None, verbose=True):
    mp.mp.dps = dps
    G0 = inp['G']; w0 = inp['w']; b0 = inp['b']
    N = len(G0)
    # normalize: G_1 = 1 via scaling, v_1 = 0 via rotation, z_c = 0
    G0 = [mp.mpf(g) for g in G0]
    w0 = [mp.mpc(a, bb) for a, bb in w0]
    Gt = mp.fsum(G0); zc = mp.fsum(G0[j]*w0[j] for j in range(N))/Gt
    w0 = [z - zc for z in w0]
    if Gt < 0:   # time-reversal + reflection symmetry keeps P: G -> -G, w -> conj(w), b -> -b is not needed for P; require Gt>0 normalisation
        pass
    # vortex 0 := farthest vortex from z_c with positive circulation (fixes the rotation gauge robustly)
    cand = [j for j in range(N) if G0[j] > 0]
    j0 = max(cand, key=lambda j: abs(w0[j]))
    perm = [j0] + [j for j in range(N) if j != j0]
    G0 = [G0[j] for j in perm]; w0 = [w0[j] for j in perm]
    g1 = G0[0]
    # scaling G by 1/g1 scales kappa by 1/g1: keep |Re kappa| = 1 by scaling w by 1/sqrt|g1|... sign issues: require g1 > 0
    assert g1 > 0
    s = 1/mp.sqrt(g1)
    G0 = [g/g1 for g in G0]; w0 = [z*s for z in w0]
    rot = mp.exp(-1j*mp.arg(w0[0])); w0 = [z*rot for z in w0]
    # initial multipliers: least squares
    y = G0[1:] + [z.real for z in w0] + [z.imag for z in w0[1:]] + [mp.mpf(b0)]
    # solve F=0 first (underdetermined -> fix b and use Gauss-Newton minimum norm)
    nx = len(y)
    def Fonly(yy):
        G = [mp.mpf(1)] + yy[:N-1]
        o = N-1; u = yy[o:o+N]; o += N; v = [mp.mpf(0)] + yy[o:o+N-1]; o += N-1; b = yy[o]
        w = [mp.mpc(u[i], v[i]) for i in range(N)]
        F = F_of(G, w, b)
        return [f.real for f in F] + [f.imag for f in F]
    # initial mu by least squares on stationarity equations
    h = mp.mpf(10)**(-(dps//2))
    Jf = numjac(Fonly, y, h)          # 2N x (3N-1)
    # want mu with Jx^T lam = 0, Jb^T lam = 1 -> least squares
    A = Jf.T                          # (3N-1) x 2N
    rhs = mp.matrix([0]*(nx-1) + [1])
    lam = mp.lu_solve(A.T*A, A.T*rhs)
    y = y + [lam[i] for i in range(2*N)]
    y, nr = newton(lambda yy: kkt(yy, N), y, h, mp.mpf(10)**(-(dps-15)), verbose=verbose)
    G, w, b, mu = unpack(y, N)
    chk = biot_savart_check(G, w)
    # second-order check: tangent space = null(J_x), Hessian of -Phi on it
    xpart = y[:3*N-2]
    def Fx(xx):
        return Fonly(list(xx) + [b])
    Jx = numjac(Fx, xpart, h)          # 2N x (3N-2)
    def gradPhi(xx):
        yy = list(xx) + [b] + y[3*N-1:]
        r = kkt(yy, N)
        return r[2*N:2*N+3*N-2]
    H = numjac(gradPhi, xpart, h)       # d^2 Phi / dx^2
    # null space of Jx via SVD
    U, S, V = mp.svd_r(Jx, full_matrices=True)
    sv = [S[i] for i in range(len(S))]
    nnull = (3*N-2) - sum(1 for s_ in sv if s_ > mp.mpf(10)**(-(dps//3)))
    # rows of V corresponding to smallest singular values: V is (3N-2)x(3N-2); take last nnull rows
    Z = mp.matrix(3*N-2, nnull)
    for c in range(nnull):
        for r in range(3*N-2):
            Z[r, c] = V[3*N-2-nnull+c, r]
    Hr = Z.T*(-H)*Z
    Hr = (Hr + Hr.T)/2
    ev = mp.eigsy(Hr)[0]
    res = dict(N=N, dps=dps, kkt_res=mp.nstr(nr, 5), P=mp.nstr(chk['P'], dps-10),
               b=mp.nstr(b, dps-10),
               kappa=[mp.nstr(chk['kappa'].real, 40), mp.nstr(chk['kappa'].imag, 40)],
               selfsim_spread=mp.nstr(chk['spread'], 5), center_speed=mp.nstr(chk['center_speed'],5), ncenter=chk['ncenter'], sum_GiGj=mp.nstr(chk['s2'], 5),
               L=mp.nstr(chk['L'], 5), Gtot=mp.nstr(chk['Gt'], 30), zc=mp.nstr(abs(chk['zc']), 5),
               collapse=bool(chk['kappa'].real < 0),
               G=[mp.nstr(g, 40) for g in G], w=[[mp.nstr(z.real, 40), mp.nstr(z.imag, 40)] for z in w],
               sing_vals_Jx=[mp.nstr(s_, 5) for s_ in sv], tangent_dim=nnull,
               hess_eigs=[mp.nstr(e, 8) for e in ev])
    if out:
        json.dump(res, open(out, 'w'), indent=1)
    return res

if __name__ == '__main__':
    inp = json.load(open(sys.argv[1])); dps = int(sys.argv[2])
    out = sys.argv[3] if len(sys.argv) > 3 else None
    r = run(inp, dps, out)
    for k, v in r.items():
        print(k, v)
