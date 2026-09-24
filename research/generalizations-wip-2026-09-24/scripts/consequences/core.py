"""Core numerics for the 'consequences' direction.

Conventions (paper): conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} G_k/(z_j - z_k),
Gamma = (1, mu, -mu/(1+mu)), 0 < mu <= 1, zero-impulse circle parametrized by theta
exactly as in eq. (pos) of the paper.

Shape variables: u = z2 - z1, w = (z3 - z1)/(z2 - z1).
With the rescaled time d tau = dt/|u|^2 the shape obeys the autonomous planar flow
dw/dtau = b(w) and d ln u/dtau = a(w), where a, b are evaluated at z = (0, 1, w).
"""
import mpmath as mp

mp.mp.dps = 40


def gammas(mu):
    mu = mp.mpf(mu)
    return [mp.mpf(1), mu, -mu / (1 + mu)]


def positions(mu, th):
    mu = mp.mpf(mu)
    R = 1 + mu + mu**2
    sR = mp.sqrt(R)
    e = mp.expj(-th)
    return [mu * (1 + sR * e) / (1 + mu)**2, (mu - sR * e) / (1 + mu)**2, mp.mpc(1)]


def velocities(G, z):
    n = len(z)
    out = []
    for j in range(n):
        s = mp.mpc(0)
        for k in range(n):
            if k != j:
                s += G[k] / (z[j] - z[k])
        out.append(mp.conj(s / (2j * mp.pi)))
    return out


def center(G, z):
    return sum(g * x for g, x in zip(G, z)) / sum(G)


def kappa_bs(G, z):
    zc = center(G, z)
    v = velocities(G, z)
    ks = [v[j] / (z[j] - zc) for j in range(len(z))]
    spread = max(abs(k - ks[0]) for k in ks) / abs(ks[0])
    return ks[0], spread


def P_of(k):
    return abs(k.imag) / (-2 * k.real)


def w_of_theta(mu, th):
    mu = mp.mpf(mu)
    R = 1 + mu + mu**2
    return mu / (1 + mu) - mp.sqrt(R) / (1 + mu) * mp.expj(th)


def ab(mu, w):
    """a(w) = d ln u / d tau, b(w) = dw/d tau at z = (0, 1, w)."""
    G = gammas(mu)
    z = [mp.mpc(0), mp.mpc(1), mp.mpc(w)]
    v = velocities(G, z)
    a = v[1] - v[0]
    b = (v[2] - v[0]) - w * a
    return a, b


def g_of(mu, w):
    mu = mp.mpf(mu)
    return 1 + 2 * mu * mp.re(w) - (1 + mu) * abs(w)**2


def H_of(mu, w):
    """Scale-invariant Hamiltonian at z = (0, 1, w) (sum G_j G_k = 0)."""
    G = gammas(mu)
    return -(G[0] * G[2] * mp.log(abs(w)**2) + G[1] * G[2] * mp.log(abs(w - 1)**2)) / (4 * mp.pi)


def L_of(G, z):
    zc = center(G, z)
    return sum(g * abs(x - zc)**2 for g, x in zip(G, z))


def theta0(mu):
    mu = mp.mpf(mu)
    R = 1 + mu + mu**2
    return mp.acos((mu - 1) / (2 * mp.sqrt(R)))


def P_theta_formula(mu, th):
    """Paper eq. (Ptheta)."""
    mu = mp.mpf(mu)
    R = 1 + mu + mu**2
    C = mp.sqrt(R) * mp.cos(th)
    N = 2 * (1 + mu**2) * R + (1 - mu) * (2 + mu + 2 * mu**2) * C - 2 * mu * C**2
    M = 1 - mu + 2 * C
    return N / (2 * mu * mp.sqrt(R) * M * mp.sin(th))
