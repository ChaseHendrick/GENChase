"""Independent static check of the spherical winding formulas (S3).

Own construction (not the explorer's): planar zero-impulse triangle z1=0, z2=1,
z3 = mu/(1+mu) + r e^{i th},  r = sqrt(1+mu+mu^2)/(1+mu),  Gamma = (1, mu, -mu/(1+mu)).
Also random general circulations with sum_{i<j} G_i G_j = 0 (not normalized, random signs).
The chord triangle is scaled to circumradius R sin(beta) and put in the plane at distance
R cos(beta) from the origin along a random unit normal n (triangle positively oriented about n
after choosing the collapsing orientation). Sphere Biot-Savart, radius R:
   v_i = (1/(2 pi R)) sum_j G_j (x_j x x_i)/|x_i-x_j|^2.
Everything else (rates, windings) is computed from these velocities directly.
"""
import mpmath as mp
import random

mp.mp.dps = 50
random.seed(12345)

def cross(u, v):
    return [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
def dot(u, v):
    return u[0]*v[0]+u[1]*v[1]+u[2]*v[2]
def add(u, v):
    return [a+b for a, b in zip(u, v)]
def sub(u, v):
    return [a-b for a, b in zip(u, v)]
def sc(s, u):
    return [s*a for a in u]
def nrm(u):
    return mp.sqrt(dot(u, u))

def planar_vel(Z, G):
    out = []
    for j in range(len(Z)):
        s = mp.mpc(0)
        for k in range(len(Z)):
            if k != j:
                s += G[k]/(Z[j]-Z[k])
        out.append(mp.conj(s/(2j*mp.pi)))
    return out

def sphere_vel(X, G, R):
    V = []
    for i in range(len(X)):
        v = [mp.mpf(0)]*3
        for j in range(len(X)):
            if j != i:
                d = sub(X[i], X[j])
                v = add(v, sc(G[j]/dot(d, d), cross(X[j], X[i])))
        V.append(sc(1/(2*mp.pi*R), v))
    return V

def circumcenter(a, b, c):
    # solve |z-a|=|z-b|=|z-c|
    A = mp.matrix([[2*(b-a).real, 2*(b-a).imag], [2*(c-a).real, 2*(c-a).imag]])
    rhs = mp.matrix([abs(b)**2-abs(a)**2, abs(c)**2-abs(a)**2])
    s = mp.lu_solve(A, rhs)
    return mp.mpc(s[0], s[1])

def random_unit():
    while True:
        v = [mp.mpf(random.gauss(0, 1)) for _ in range(3)]
        if nrm(v) > 0.1:
            return sc(1/nrm(v), v)

def planar_data(Z, G):
    V = planar_vel(Z, G)
    S = sum(G)
    zc = sum(g*z for g, z in zip(G, Z))/S
    ks = [V[j]/(Z[j]-zc) for j in range(3)]
    spread = max(abs(ks[j]-ks[0]) for j in range(3))/abs(ks[0])
    return ks[0], zc, spread

def build(G, Z, beta, R):
    """Returns sphere positions, p, n, and planar invariants a = Re(kappa) r^2, b = Im(kappa) r^2 (r = circumradius)."""
    k, zc, spread = planar_data(Z, G)
    if k.real > 0:           # reflect to the collapsing orientation
        Z = [mp.conj(z) for z in Z]
        k, zc, spread = planar_data(Z, G)
    O = circumcenter(*Z)
    rpl = abs(Z[0]-O)
    L_imp = sum(G[i]*G[j]*abs(Z[i]-Z[j])**2 for i in range(3) for j in range(i+1, 3))
    zc_on_circle = abs(abs(zc-O)-rpl)/rpl
    a = k.real*rpl**2
    b = k.imag*rpl**2
    P0 = abs(k.imag)/(-2*k.real)
    n = random_unit()
    t = random_unit()
    e1 = sub(t, sc(dot(t, n), n)); e1 = sc(1/nrm(e1), e1)
    e2 = cross(n, e1)                      # e1 x e2 = n : planar i <-> n x .
    rho = R*mp.sin(beta)
    s = rho/rpl
    c = sc(R*mp.cos(beta), n)
    emb = lambda z: add(c, add(sc(s*(z-O).real, e1), sc(s*(z-O).imag, e2)))
    X = [emb(z) for z in Z]
    p = emb(zc)
    return dict(X=X, p=p, n=n, a=a, b=b, P0=P0, spread=spread, L=L_imp, zc_on=zc_on_circle, rho=rho, s=s, kpl=k)

def analyse(G, D, beta, R):
    X, p, n = D['X'], D['p'], D['n']
    V = sphere_vel(X, G, R)
    K = 1/R**2
    out = {}
    out['|x|-R'] = max(abs(nrm(x)-R) for x in X)
    out['|p|-R'] = abs(nrm(p)-R)
    out['tangency'] = max(abs(dot(v, x)) for v, x in zip(V, X))/max(nrm(v) for v in V)/R
    S = sum(G)
    Mdot = [sum(G[i]*V[i][k] for i in range(3)) for k in range(3)]
    out['Mdot'] = nrm(Mdot)/max(nrm(v) for v in V)
    M = [sum(G[i]*X[i][k] for i in range(3)) for k in range(3)]
    out['M/S-p'] = nrm(sub(sc(1/S, M), p))
    # chord self-similarity: d ln |.|^2/dt equal for all vortex pairs and vortex-to-p chords
    rates = []
    for (i, j) in [(0, 1), (0, 2), (1, 2)]:
        d = sub(X[i], X[j]); dv = sub(V[i], V[j])
        rates.append(2*dot(d, dv)/dot(d, d))
    for i in range(3):
        d = sub(X[i], p)
        rates.append(2*dot(d, V[i])/dot(d, d))
    out['chord-rate spread'] = max(abs(r-rates[0]) for r in rates)/abs(rates[0]) if rates[0] != 0 else max(abs(r) for r in rates)
    lnl2dot = rates[0]
    # 3D similarity fit about p: v = sig w + Om x w
    rows, rhs = [], []
    for x, v in zip(X, V):
        w = sub(x, p)
        Mx = [[w[0], 0, w[2], -w[1]], [w[1], -w[2], 0, w[0]], [w[2], w[1], -w[0], 0]]
        for kk in range(3):
            rows.append(Mx[kk]); rhs.append(v[kk])
    A = mp.matrix(rows); bb = mp.matrix(rhs)
    sol = mp.lu_solve(A.T*A, A.T*bb)
    r = A*sol-bb
    out['similarity fit resid'] = mp.sqrt(sum(r[q]**2 for q in range(len(rhs))))/mp.sqrt(sum(bb[q]**2 for q in range(len(rhs))))
    Om = [sol[1], sol[2], sol[3]]
    ph = sc(1/R, p)
    # pole rate from the actual vortex velocities
    N = cross(sub(X[1], X[0]), sub(X[2], X[0]))
    Nd = add(cross(sub(V[1], V[0]), sub(X[2], X[0])), cross(sub(X[1], X[0]), sub(V[2], V[0])))
    nN = nrm(N); sgn = 1 if dot(N, n) > 0 else -1; nh = sc(sgn/nN, N)
    out['orientation sign (+1 ccw)'] = 0
    out['normal = n'] = nrm(sub(nh, n))
    nd = sc(sgn/nN, sub(Nd, sc(dot(nh, Nd), nh)))
    cosb = dot(nh, ph)
    sinb = mp.sqrt(1-cosb**2)
    cosb_dot = dot(nd, ph)
    psi_dot = dot(nd, cross(ph, nh))/sinb**2
    a, b, P0 = D['a'], D['b'], D['P0']
    out['cosb - cos(beta)'] = abs(cosb-mp.cos(beta))
    out['dcosb/dt + K a'] = abs(cosb_dot + K*a)/abs(K*a)
    out['psidot - b/rho^2'] = abs(psi_dot - b/D['rho']**2)/abs(psi_dot)
    out['Om.p - psidot'] = abs(dot(Om, ph)-psi_dot)/abs(psi_dot)
    # measure (1)
    m1 = abs(psi_dot/lnl2dot)
    out['m1 - P0|sec b|'] = abs(m1 - P0/abs(mp.cos(beta)))/m1
    out['m1 - P0/sqrt(1-K rho^2)'] = abs(m1 - P0/mp.sqrt(1-K*D['rho']**2))/m1
    # measure (2) with t_c - t = (1 - cos beta)/(K|a|)   (cos beta linear in t, checked by integration)
    tc_minus_t = (1-cosb)/(K*abs(a))
    m2 = abs(psi_dot)*tc_minus_t
    out['m2 - P0 sec^2(b/2)'] = abs(m2 - P0/mp.cos(beta/2)**2)/m2
    # measure (3): pitch |dpsi/d ln tan^2(beta/2)| = |psi_dot| sin(beta)/(2|beta_dot|)
    beta_dot = -cosb_dot/sinb
    m3 = abs(psi_dot)*sinb/(2*abs(beta_dot))
    out['m3 - P0'] = abs(m3-P0)/P0
    out['P0'] = P0
    out['m1'] = m1; out['m2'] = m2; out['m3'] = m3
    return out

def worst(acc, out):
    for k, v in out.items():
        if k in ('P0', 'm1', 'm2', 'm3'):
            continue
        acc[k] = max(acc.get(k, mp.mpf(0)), abs(v))

if __name__ == '__main__':
    acc = {}
    count = 0
    minP0 = mp.inf
    # (A) normalized family, many mu, theta, beta, R
    mus = [mp.mpf('0.001'), mp.mpf('0.01'), mp.mpf('0.1'), mp.mpf('0.3'), mp.mpf('0.5'), mp.mpf('0.77'), mp.mpf(1), mp.mpf(2), mp.mpf(7)]
    for mu in mus:
        G = [mp.mpf(1), mu, -mu/(1+mu)]
        r = mp.sqrt(1+mu+mu**2)/(1+mu)
        th0 = mp.acos((mp.mpf(1)/2 - mu/(1+mu))/r)   # equilateral: Re z3 = 1/2  -> th = +-th0
        for _ in range(12):
            th = mp.mpf(random.uniform(0.01, 2*3.14159265-0.01))
            if abs(mp.sin(th)) < 1e-3 or min(abs(th-th0), abs(th-(2*mp.pi-th0))) < 1e-3:
                continue
            Z = [mp.mpc(0), mp.mpc(1), mu/(1+mu) + r*mp.expj(th)]
            for beta in [mp.mpf('1e-6'), mp.mpf(random.uniform(0.01, 1.5)), mp.pi/2-mp.mpf('1e-3'), mp.pi/2+mp.mpf('1e-3'), mp.mpf(random.uniform(1.65, 3.1)), mp.pi-mp.mpf('1e-5')]:
                for R in [mp.mpf(1), mp.mpf('2.37'), mp.mpf('0.41')]:
                    D = build(G, Z, beta, R)
                    worst(acc, {'planar spread': D['spread'], 'planar L': D['L'], 'zc on circle': D['zc_on']})
                    out = analyse(G, D, beta, R)
                    worst(acc, out)
                    minP0 = min(minP0, D['P0'])
                    count += 1
    # (B) random general circulations with sum G_i G_j = 0 (random scale, signs, order)
    for _ in range(60):
        g1 = mp.mpf(random.uniform(-3, 3)); g2 = mp.mpf(random.uniform(-3, 3))
        if abs(g1) < 0.05 or abs(g2) < 0.05 or abs(g1+g2) < 0.05:
            continue
        g3 = -g1*g2/(g1+g2)
        G = [g1, g2, g3]
        random.shuffle(G)
        # zero-impulse shapes: z1=0, z2=1, z3 on circle (g1 g2 + g3(g1+g2) = 0 case generalizes):
        # sum G_i G_j l_ij^2 = 0 with l12=1: G1G2 + G1G3|z3|^2 + G2G3|z3-1|^2 = 0
        # -> (G1G3+G2G3)(x^2+y^2) - 2 G2G3 x + G2G3 + G1G2 = 0
        A_ = G[2]*(G[0]+G[1]); B_ = -2*G[1]*G[2]; C_ = G[1]*G[2]+G[0]*G[1]
        xc = -B_/(2*A_); rr2 = xc**2 - C_/A_
        if rr2 <= 0:
            continue
        rr = mp.sqrt(rr2)
        th = mp.mpf(random.uniform(0.02, 6.26))
        Z = [mp.mpc(0), mp.mpc(1), xc + rr*mp.expj(th)]
        if abs(mp.sin(th)) < 1e-2:
            continue
        beta = mp.mpf(random.uniform(0.001, 3.14))
        R = mp.mpf(random.uniform(0.3, 3))
        D = build(G, Z, beta, R)
        if abs(D['a']) < mp.mpf('1e-8'):
            continue   # equilateral: relative equilibrium
        worst(acc, {'planar spread': D['spread'], 'planar L': D['L'], 'zc on circle': D['zc_on']})
        out = analyse(G, D, beta, R)
        worst(acc, out)
        minP0 = min(minP0, D['P0'])
        count += 1
    print('configurations checked:', count)
    for k, v in acc.items():
        print('  max %-26s %s' % (k, mp.nstr(v, 5)))
    print('min P0 over all sampled collapses:', mp.nstr(minP0, 20), ' (sqrt3/2 =', mp.nstr(mp.sqrt(3)/2, 20), ')')
