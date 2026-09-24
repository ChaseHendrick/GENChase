"""Independent numerical check of S1-structure (a), (b), (c) at the instantaneous level.

Construction (independent of any planar parametrization):
  * circulations: Gamma = scale * (1, mu, -mu/(1+mu)) permuted randomly, mu drawn from a wide
    range including negative values (any M = 0 triple up to scale/permutation);
  * x1, x2 uniform on the unit sphere; x3 on the sphere circle where L = 0
    (L = sum_{i<j} G_i G_j |x_i - x_j|^2 is linear in x3 on the sphere), random angle on it.
  * special families: small triangles (d -> +-1), d ~ 0, near-collision pairs, equilateral chords.
Sphere velocities: direct Biot-Savart on the unit sphere.
Planar kappa: planar Biot-Savart in the chord plane Pi with complex structure i <-> n x (.).
"""
import mpmath as mp
import random, sys

mp.mp.dps = 60

def V3(a, b, c): return mp.matrix([mp.mpf(a), mp.mpf(b), mp.mpf(c)])
def dot(u, v): return u[0]*v[0] + u[1]*v[1] + u[2]*v[2]
def cross(u, v): return mp.matrix([u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]])
def nrm(u): return mp.sqrt(dot(u, u))
def unit(u): return u/nrm(u)

def sph_vel(X, G):
    out = []
    for i in range(3):
        v = V3(0, 0, 0)
        for j in range(3):
            if j != i:
                r = X[i] - X[j]
                v += G[j]*cross(X[j], X[i])/dot(r, r)
        out.append(v/(2*mp.pi))
    return out

def rand_unit(rng):
    while True:
        v = V3(rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))
        if nrm(v) > 0.1: return unit(v)

def x3_on_L0(x1, x2, G, phi):
    """Points x on unit sphere with G1G3|x1-x|^2 + G2G3|x2-x|^2 + G1G2|x1-x2|^2 = 0.
    |x_i - x|^2 = 2 - 2 x_i.x  ->  x.q = h with q = G1G3 x1 + G2G3 x2, h = (2G1G3+2G2G3+G1G2 l12^2)/2."""
    l12 = dot(x1-x2, x1-x2)
    q = G[0]*G[2]*x1 + G[1]*G[2]*x2
    h = (2*G[0]*G[2] + 2*G[1]*G[2] + G[0]*G[1]*l12)/2
    qn = nrm(q)
    if qn == 0: return None
    k = unit(q); t = h/qn
    if abs(t) >= 1: return None
    # orthonormal basis perpendicular to k
    tmp = V3(1, 0, 0) if abs(k[0]) < 0.9 else V3(0, 1, 0)
    e1 = unit(tmp - dot(tmp, k)*k); e2 = cross(k, e1)
    r = mp.sqrt(1 - t*t)
    return t*k + r*(mp.cos(phi)*e1 + mp.sin(phi)*e2)

def analyse(X, G):
    S = sum(G)
    J = sum((g*x for g, x in zip(G[1:], X[1:])), G[0]*X[0])
    p = J/S
    L = sum(G[i]*G[j]*dot(X[i]-X[j], X[i]-X[j]) for i in range(3) for j in range(i+1, 3))
    Mv = G[0]*G[1] + G[0]*G[2] + G[1]*G[2]
    N = cross(X[1]-X[0], X[2]-X[0]); n = unit(N)
    d = dot(n, p)
    dplane = [dot(n, x) for x in X]
    rho = mp.sqrt(1 - d*d)
    c = d*n
    a = (p - c)/rho
    bp = cross(n, a)
    # planar kappa in Pi, basis (a, b'), complex structure i <-> n x
    Z = [mp.mpc(dot(x - c, a), dot(x - c, bp)) for x in X]
    zp = mp.mpc(dot(p - c, a), dot(p - c, bp))
    U = []
    for i in range(3):
        s_ = mp.mpc(0)
        for k in range(3):
            if k != i: s_ += G[k]/(Z[i]-Z[k])
        U.append(mp.conj(s_/(2j*mp.pi)))
    ks = [U[i]/(Z[i]-zp) for i in range(3)]
    kap = ks[0]
    kspread = max(abs(k - kap) for k in ks)/abs(kap) if abs(kap) > 0 else max(abs(k) for k in ks)
    al, be = kap.real, kap.imag
    s = d*al
    Om = d*be*n + rho*(be*a - al*bp)
    Vs = sph_vel(X, G)
    vscale = max(nrm(v) for v in Vs)
    resB = max(nrm(Vs[i] - (s*(X[i]-p) + cross(Om, X[i]-p))) for i in range(3))/vscale
    # (c) derived rates from actual velocities
    chord = []
    for (i, j) in [(0, 1), (0, 2), (1, 2)]:
        r = X[i]-X[j]
        chord.append(dot(r, Vs[i]-Vs[j])/dot(r, r))   # = (1/2) d ln l^2/dt = d ln l / dt
    chord_err = max(abs(cr - s) for cr in chord)/max(abs(al), abs(be))
    Nd = cross(Vs[1]-Vs[0], X[2]-X[0]) + cross(X[1]-X[0], Vs[2]-Vs[0])
    nd = (Nd - n*dot(n, Nd))/nrm(N)
    ndot_err = nrm(nd - (-rho*(al*a + be*bp)))/max(abs(al), abs(be))
    pdot = sum((g*v for g, v in zip(G[1:], Vs[1:])), G[0]*Vs[0])/S
    npdot = dot(nd, p)
    np_err = abs(npdot + rho**2*al)/max(abs(al), abs(be))
    Omp_err = abs(dot(Om, p) - be)/max(abs(al), abs(be))
    # azimuthal rate of n about p from the actual dn/dt
    nperp = n - d*p
    eaz = cross(p, unit(nperp))
    az = dot(nd, eaz)/nrm(nperp)
    az_err = abs(az - be)/max(abs(al), abs(be))
    return dict(absp=abs(nrm(p)-1), inplane=abs(dot(n, p-X[0])), L=abs(L), M=abs(Mv),
                kspread=kspread, resB=resB, chord=chord_err, ndot=ndot_err, np=np_err,
                Omp=Omp_err, az=az_err, pdot=nrm(pdot)/vscale, d=d, rho=rho,
                ahat=rho**2*al, bhat=rho**2*be, al=al, be=be, planediff=max(abs(q-d) for q in dplane))

def gen_G(rng):
    while True:
        mu = mp.mpf(rng.choice([rng.uniform(0.01, 1), rng.uniform(1, 30), rng.uniform(-30, -0.01)]))
        if abs(1+mu) < 1e-2: continue
        g = [mp.mpf(1), mu, -mu/(1+mu)]
        rng.shuffle(g)
        sc = mp.mpf(rng.choice([-1, 1])*rng.uniform(0.2, 5))
        return [sc*x for x in g], mu

def main(seed=12345, ntrials=400):
    rng = random.Random(seed)
    keys = ['absp', 'inplane', 'L', 'kspread', 'resB', 'chord', 'ndot', 'np', 'Omp', 'az', 'pdot', 'planediff']
    worst = {k: mp.mpf(0) for k in keys}
    cnt = 0; dmin = 1; dmax = -1; neg_d = 0; small = 0; mus = []
    fails = 0
    while cnt < ntrials:
        G, mu = gen_G(rng)
        mode = rng.random()
        x1 = rand_unit(rng)
        if mode < 0.2:
            # small triangle: x2 close to x1 (d -> +-1)
            eps = mp.mpf(10)**(-rng.uniform(1, 6))
            x2 = unit(x1 + eps*rand_unit(rng))
        else:
            x2 = rand_unit(rng)
        x3 = x3_on_L0(x1, x2, G, mp.mpf(rng.uniform(0, 2*3.14159265)))
        if x3 is None:
            fails += 1; continue
        X = [x1, x2, x3]
        mind = min(nrm(X[i]-X[j]) for i in range(3) for j in range(i+1, 3))
        if mind < mp.mpf(10)**-8: continue
        r = analyse(X, G)
        for k in keys: worst[k] = max(worst[k], r[k])
        dmin = min(dmin, r['d']); dmax = max(dmax, r['d'])
        if r['d'] < 0: neg_d += 1
        if r['rho'] < 1e-2: small += 1
        mus.append(float(mu))
        cnt += 1
    print(f'seed {seed}: {cnt} configurations, dps={mp.mp.dps}, construction failures (no L=0 circle) {fails}')
    print(f'  mu range [{min(mus):.3f}, {max(mus):.3f}], negative mu count {sum(1 for m in mus if m < 0)}')
    print(f'  d range [{mp.nstr(dmin, 8)}, {mp.nstr(dmax, 8)}], d<0 count {neg_d}, rho<1e-2 count {small}')
    for k in keys: print(f'  worst {k:10s} = {mp.nstr(worst[k], 3)}')

if __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 12345, int(sys.argv[2]) if len(sys.argv) > 2 else 400)
