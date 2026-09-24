# Independent Biot-Savart check for alpha-model three-vortex self-similar collapse.
# Kernel: dz_j/dt = i * sum_k G_k (z_j - z_k) |z_j - z_k|^(-(2+alpha))   (overall constant irrelevant)
import mpmath as mp
mp.mp.dps = 50

def positions(r1, r2, r3):
    # r1=|z2-z3|, r2=|z3-z1|, r3=|z1-z2|; put z1=0, z2=r3, z3 in upper half plane
    z1 = mp.mpc(0); z2 = mp.mpc(r3)
    # |z3| = r2, |z3 - r3| = r1
    x = (r2**2 + r3**2 - r1**2)/(2*r3)
    y = mp.sqrt(r2**2 - x**2)
    return [z1, z2, mp.mpc(x, y)]

def vel(z, G, alpha):
    n = len(z); v = []
    for j in range(n):
        s = mp.mpc(0)
        for k in range(n):
            if k == j: continue
            d = z[j]-z[k]
            s += G[k]*d*abs(d)**(-(2+alpha))
        v.append(1j*s)
    return v

def circulations(z, alpha):
    # v linear in G: columns = velocity from unit G_k
    cols = []
    for k in range(3):
        e = [0,0,0]; e[k] = 1
        cols.append(vel(z, e, alpha))
    # equation: (v2-v1)(z3-z1) - (v3-v1)(z2-z1) = 0
    row = []
    for k in range(3):
        v = cols[k]
        row.append((v[1]-v[0])*(z[2]-z[0]) - (v[2]-v[0])*(z[1]-z[0]))
    M = mp.matrix([[mp.re(c) for c in row],[mp.im(c) for c in row]])
    # null vector = cross product of the two rows
    a = [M[0,i] for i in range(3)]; b = [M[1,i] for i in range(3)]
    G = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
    s = max(abs(g) for g in G)
    return [g/s for g in G]

def analyse(r1, r2, r3, alpha):
    z = positions(r1, r2, r3)
    G = circulations(z, alpha)
    v = vel(z, G, alpha)
    kap = (v[1]-v[0])/(z[1]-z[0])
    zs = z[0] - v[0]/kap          # collision point
    res = max(abs(v[j] - kap*(z[j]-zs)) for j in range(3)) / max(abs(x) for x in v)
    if mp.re(kap) > 0:            # mirror image collapses instead: kappa -> -conj(kappa)
        z = [mp.conj(w) for w in z]
        v = vel(z, G, alpha)
        kap = (v[1]-v[0])/(z[1]-z[0])
        zs = z[0] - v[0]/kap
        res = max(res, max(abs(v[j] - kap*(z[j]-zs)) for j in range(3)) / max(abs(x) for x in v))
    P = abs(mp.im(kap))/(-2*mp.re(kap))
    return dict(G=G, kap=kap, res=res, P=P, recollapse=mp.re(kap) < 0)

def S_formula(r1, r2, r3, alpha):
    b = 1 + mp.mpf(alpha)/2
    f = lambda r: r**(-2*b)
    f1, f2, f3 = f(r1), f(r2), f(r3)
    S = r1**2*(f2+f3)/(f2-f3) + r2**2*(f3+f1)/(f3-f1) + r3**2*(f1+f2)/(f1-f2)
    x = (r2**2 + r3**2 - r1**2)/(2*r3); A = r3*mp.sqrt(r2**2-x**2)/2
    return abs(S)/(8*A)

def bound(alpha):
    return mp.sqrt(3+mp.mpf(alpha))/(2+mp.mpf(alpha))

if __name__ == '__main__':
    import random
    random.seed(12345)
    worst_rel = 0; worst_res = 0; minmargin = {}
    for alpha in [-0.89, -0.8, -0.5, -0.2, 0, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10, 30]:
        a = mp.mpf(alpha)
        mm = mp.inf
        for t in range(300):
            # random scalene triangle
            while True:
                r = sorted([mp.mpf(random.random()) for _ in range(3)])
                if r[0]+r[1] > r[2]*(1+mp.mpf('1e-6')) and r[1]-r[0] > 1e-6 and r[2]-r[1] > 1e-6: break
            random.shuffle(r)
            out = analyse(r[0], r[1], r[2], a)
            Pf = S_formula(r[0], r[1], r[2], a)
            worst_rel = max(worst_rel, abs(out['P']-Pf)/Pf)
            worst_res = max(worst_res, out['res'])
            assert out['recollapse']
            mm = min(mm, out['P'] - bound(a))
        minmargin[alpha] = mm
    print('max rel |P_BS - P_formula| =', mp.nstr(worst_rel, 5))
    print('max self-similarity residual =', mp.nstr(worst_res, 5))
    for k, v in minmargin.items():
        print('alpha', k, 'min over random samples of P - B =', mp.nstr(v, 8))
