"""Independent implementation of the kappa-identity ingredients (my own code).

Biot-Savart: conj(dz_j/dt) = (1/(2 pi i)) sum_{k!=j} G_k/(z_j - z_k).
"""
import mpmath as mp


def velocities(G, z):
    N = len(z)
    out = []
    for j in range(N):
        acc = mp.mpc(0)
        for k in range(N):
            if k != j:
                acc += G[k] / (z[j] - z[k])
        out.append(mp.conj(acc / (2j * mp.pi)))
    return out


def center(G, z):
    Gt = mp.fsum(G)
    return mp.fsum([G[j] * z[j] for j in range(len(z))]) / Gt


def DE(w):
    N = len(w)
    D = mp.matrix(N, N)
    E = mp.matrix(N, N)
    for j in range(N):
        for k in range(N):
            if j != k:
                K = (w[j] + w[k]) / (w[j] - w[k])
                D[j, k] = mp.re(K)
                E[j, k] = mp.im(K)
    return D, E


def formula(G, z):
    """Returns (Re kappa, Im kappa) predicted by the claimed identity (general form with L),
    plus sigma, |v|^2, L, vEG."""
    N = len(z)
    zc = center(G, z)
    w = [zz - zc for zz in z]
    s = [abs(x) ** 2 for x in w]
    D, E = DE(w)
    A = mp.eye(N) + D
    v = mp.lu_solve(A, mp.matrix(s))
    sig = mp.fsum([v[j] for j in range(N)])
    vv = mp.fsum([v[j] ** 2 for j in range(N)])
    L = mp.fsum([G[j] * s[j] for j in range(N)])
    Gt = mp.fsum(G)
    EG = E * mp.matrix(G)
    vEG = mp.fsum([v[j] * EG[j] for j in range(N)])
    imk = (Gt * sig - L) / (4 * mp.pi * vv)
    rek = vEG / (4 * mp.pi * vv)
    return mp.mpc(rek, imk), dict(sigma=sig, vv=vv, L=L, vEG=vEG, Gt=Gt, v=v, s=s, w=w, D=D, E=E)


def direct_kappa(G, z):
    """kappa_j = zdot_j / w_j for each vortex with w_j != 0; returns list and the
    self-similarity residual max_j |zdot_j - kappa w_j| / max|zdot| using the kappa of
    the farthest vortex."""
    zc = center(G, z)
    w = [zz - zc for zz in z]
    u = velocities(G, z)
    jr = max(range(len(z)), key=lambda j: abs(w[j]))
    kap = u[jr] / w[jr]
    umax = max(abs(x) for x in u)
    res = max(abs(u[j] - kap * w[j]) for j in range(len(z))) / umax
    return kap, res, u, w
