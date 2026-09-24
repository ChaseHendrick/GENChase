"""Core routines: three point vortices on the unit sphere, self-similar (chord) collapse.

Convention (matches the planar paper when viewed from outside, outward normal):
    dx_i/dt = (1/2pi) sum_{j != i} Gamma_j (x_j x x_i) / |x_i - x_j|^2      (unit sphere)
Planar:  conj(dz_j/dt) = (1/(2 pi i)) sum_k Gamma_k/(z_j - z_k).
"""
import mpmath as mp

def vec(a, b, c):
    return mp.matrix([a, b, c])

def dot(u, v):
    return u[0]*v[0] + u[1]*v[1] + u[2]*v[2]

def cross(u, v):
    return mp.matrix([u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]])

def norm(u):
    return mp.sqrt(dot(u, u))

def sphere_vel(X, G):
    """Biot-Savart on the unit sphere. X: list of 3-vectors, G: circulations."""
    n = len(X)
    V = []
    for i in range(n):
        v = mp.matrix([0, 0, 0])
        for j in range(n):
            if j == i:
                continue
            d = X[i] - X[j]
            v += G[j] * cross(X[j], X[i]) / dot(d, d)
        V.append(v / (2*mp.pi))
    return V

def planar_vel(Z, G):
    """dz_j/dt from conj(dz_j/dt) = (1/(2 pi i)) sum Gamma_k/(z_j - z_k)."""
    out = []
    for j in range(len(Z)):
        s = mp.mpc(0)
        for k in range(len(Z)):
            if k != j:
                s += G[k] / (Z[j] - Z[k])
        out.append(mp.conj(s / (2j*mp.pi)))
    return out

def gotoda_positions(mu, th):
    """Planar positions of the paper, eq. (pos): z_c = 0, z3 = 1."""
    R = 1 + mu + mu**2
    sR = mp.sqrt(R)
    e = mp.expj(-th)
    z1 = mu*(1 + sR*e)/(1+mu)**2
    z2 = (mu - sR*e)/(1+mu)**2
    z3 = mp.mpf(1)
    return [z1, z2, z3]

def circumcenter(z1, z2, z3):
    # circumcenter of three complex points
    a, b, c = z1, z2, z3
    d = 2*(a.real*(b.imag-c.imag) + b.real*(c.imag-a.imag) + c.real*(a.imag-b.imag))
    ux = ((abs(a)**2)*(b.imag-c.imag) + (abs(b)**2)*(c.imag-a.imag) + (abs(c)**2)*(a.imag-b.imag))/d
    uy = ((abs(a)**2)*(c.real-b.real) + (abs(b)**2)*(a.real-c.real) + (abs(c)**2)*(b.real-a.real))/d
    return mp.mpc(ux, uy)

def planar_kappa(Z, G):
    S = sum(G)
    zc = sum(g*z for g, z in zip(G, Z))/S
    V = planar_vel(Z, G)
    ks = [V[j]/(Z[j]-zc) for j in range(len(Z))]
    return ks, zc

def place_on_sphere(Z, zc, dval, psi=0):
    """Map a planar configuration whose center of vorticity zc lies on the circumcircle
    onto the unit sphere: circumcircle -> small circle through p = e3, with oriented pole
    n = d e3 + rho (cos psi, sin psi, 0), rho = sqrt(1-d^2); zc -> p; orientation of the
    plane given by n (planar i <-> n x .)."""
    Oc = circumcenter(*Z)
    rpl = abs(Z[0]-Oc)
    rho = mp.sqrt(1 - dval**2)
    e = vec(mp.cos(psi), mp.sin(psi), 0)
    p = vec(0, 0, 1)
    n = dval*p + rho*e
    c = dval*n
    a = (p - c)/rho
    bb = cross(n, a)
    rot = rpl/(zc - Oc)            # (zc - Oc)*rot = +rpl, so zc -> c + rho*a = p
    rot = rot/abs(rot)
    X = []
    for z in Z:
        w = (z - Oc)*rot*(rho/rpl)
        X.append(c + w.real*a + w.imag*bb)
    return X, p, n, rho, rpl

def fit_similarity(X, V, p):
    """Least squares for V_i = s (X_i - p) + Om x (X_i - p). Returns s, Om, residual."""
    rows = []
    rhs = []
    for x, v in zip(X, V):
        w = x - p
        # Om x w = [Om1 w2... ] linear in Om: Om x w = -w x Om = -[w]_x Om
        # [w]_x = [[0,-w3,w2],[w3,0,-w1],[-w2,w1,0]]
        M = [[w[0], 0, w[2], -w[1]],
             [w[1], -w[2], 0, w[0]],
             [w[2], w[1], -w[0], 0]]
        for k in range(3):
            rows.append(M[k])
            rhs.append(v[k])
    A = mp.matrix(rows)
    b = mp.matrix(rhs)
    sol = mp.lu_solve(A.T*A, A.T*b)
    r = A*sol - b
    res = mp.sqrt(sum(r[k]**2 for k in range(len(rhs))))
    scale = mp.sqrt(sum(b[k]**2 for k in range(len(rhs))))
    return sol[0], mp.matrix([sol[1], sol[2], sol[3]]), res/scale

def oriented_normal(X):
    N = cross(X[1]-X[0], X[2]-X[0])
    return N/norm(N), N

def normal_rate(X, V):
    N = cross(X[1]-X[0], X[2]-X[0])
    Nd = cross(V[1]-V[0], X[2]-X[0]) + cross(X[1]-X[0], V[2]-V[0])
    nN = norm(N)
    n = N/nN
    nd = (Nd - n*dot(n, Nd))/nN
    return n, nd
