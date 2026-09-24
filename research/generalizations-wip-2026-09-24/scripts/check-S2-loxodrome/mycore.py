"""Independent core for checking the S2 loxodrome law (own code, not the explorer's).

Planar convention: conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} G_k/(z_j - z_k).
Sphere of radius R (standard, e.g. Newton's book / Kidambi-Newton):
    dx_i/dt = (1/(2 pi R)) sum_{j != i} G_j (x_j x x_i)/|x_i - x_j|^2,
which near a point with outward normal e reduces to the planar law with i <-> e x .
Shapes are built from side lengths using the planar angular-impulse condition
    sum_{i<j} G_i G_j l_ij^2 = 0,
and every such triangle is self-similar when sum_{i<j} G_i G_j = 0 (checked, not assumed).
"""
import mpmath as mp

def cross(u, v):
    return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
def dot(u, v):
    return u[0]*v[0]+u[1]*v[1]+u[2]*v[2]
def add(u, v):
    return [u[0]+v[0], u[1]+v[1], u[2]+v[2]]
def sub(u, v):
    return [u[0]-v[0], u[1]-v[1], u[2]-v[2]]
def scl(a, u):
    return [a*u[0], a*u[1], a*u[2]]
def nrm(u):
    return mp.sqrt(dot(u, u))

def planar_shape(G, l13, l23, orient):
    """Triangle z1=0, z2 on positive real axis, z3 above (orient=+1) or below (-1).
    l12 from the zero-angular-impulse condition. Returns None if not a triangle."""
    g1, g2, g3 = G
    l12sq = -(g1*g3*l13**2 + g2*g3*l23**2)/(g1*g2)
    if l12sq <= 0:
        return None
    l12 = mp.sqrt(l12sq)
    # triangle inequality
    if not (l12 < l13 + l23 and l13 < l12 + l23 and l23 < l12 + l13):
        return None
    x3 = (l13**2 - l23**2 + l12**2)/(2*l12)
    y3 = mp.sqrt(l13**2 - x3**2)
    return [mp.mpc(0), mp.mpc(l12, 0), mp.mpc(x3, orient*y3)]

def planar_vel(Z, G):
    out = []
    for j in range(len(Z)):
        s = mp.mpc(0)
        for k in range(len(Z)):
            if k != j:
                s += G[k]/(Z[j]-Z[k])
        out.append(mp.conj(s/(2j*mp.pi)))
    return out

def circum(Z):
    a, b, c = Z
    # solve |O-a|=|O-b|=|O-c|
    # 2 Re(conj(b-a) O) = |b|^2-|a|^2 ; same for c
    A = mp.matrix([[2*(b-a).real, 2*(b-a).imag], [2*(c-a).real, 2*(c-a).imag]])
    rhs = mp.matrix([abs(b)**2-abs(a)**2, abs(c)**2-abs(a)**2])
    s = mp.lu_solve(A, rhs)
    O = mp.mpc(s[0], s[1])
    return O, abs(a-O)

def planar_data(Z, G):
    S = sum(G)
    zc = sum(g*z for g, z in zip(G, Z))/S
    V = planar_vel(Z, G)
    ks = [V[j]/(Z[j]-zc) for j in range(3)]
    k = ks[0]
    spread = max(abs(kk-k) for kk in ks)/abs(k)
    O, r = circum(Z)
    Lpl = G[0]*G[1]*abs(Z[0]-Z[1])**2 + G[0]*G[2]*abs(Z[0]-Z[2])**2 + G[1]*G[2]*abs(Z[1]-Z[2])**2
    return dict(zc=zc, kappa=k, spread=spread, O=O, r=r, ahat=k.real*r**2, bhat=k.imag*r**2,
                zc_on_circle=abs(abs(zc-O)-r)/r, L=Lpl)

def place(Z, G, R, b, psi):
    """Place the planar triangle on the sphere of radius R, with p = R e3 = center of vorticity,
    circumcircle normal n = (sin b cos psi, sin b sin psi, cos b) and the planar orientation
    mapped to n (so n is the orientation normal of (x1,x2,x3) iff the planar area is positive)."""
    pd = planar_data(Z, G)
    O, r, zc = pd['O'], pd['r'], pd['zc']
    n = [mp.sin(b)*mp.cos(psi), mp.sin(b)*mp.sin(psi), mp.cos(b)]
    d = mp.cos(b); rho = mp.sin(b)
    e3 = [mp.mpf(0), mp.mpf(0), mp.mpf(1)]
    u = scl(1/rho, sub(e3, scl(d, n)))
    v = cross(n, u)
    rot = mp.conj(zc - O)/abs(zc - O)
    X = []
    for z in Z:
        w = (z - O)*rot*(rho/r)
        X.append(scl(R, add(scl(d, n), add(scl(w.real, u), scl(w.imag, v)))))
    return X, n

def sphere_vel(X, G, R):
    V = []
    for i in range(3):
        v = [mp.mpf(0)]*3
        for j in range(3):
            if j != i:
                dd = sub(X[i], X[j])
                v = add(v, scl(G[j]/dot(dd, dd), cross(X[j], X[i])))
        V.append(scl(1/(2*mp.pi*R), v))
    return V

def orient_normal_and_rate(X, V):
    N = cross(sub(X[1], X[0]), sub(X[2], X[0]))
    Nd = add(cross(sub(V[1], V[0]), sub(X[2], X[0])), cross(sub(X[1], X[0]), sub(V[2], V[0])))
    nN = nrm(N)
    n = scl(1/nN, N)
    nd = scl(1/nN, sub(Nd, scl(dot(n, Nd), n)))
    return n, nd
