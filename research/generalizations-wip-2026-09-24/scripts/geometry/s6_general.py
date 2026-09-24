"""Independent test of the invariant master formula for arbitrary circulation triples (random signs, scales, labels):
configurations built from z1=0, z2=1, z3=w on the zero-impulse circle (not from the paper's parametrization).
Claim:  P = (2 - cos^2 lam + eps cos psi cos lam)/(sin psi sin 2 lam),  sin lam = 4 sqrt3 |Area|/sum s^2,
        tan psi = 3 sqrt3 |G1G2G3|/|prod(Gi-Gj)|,  eps = -1 on the collapsing arc whose collinear end has the
        weaker (smaller |Gamma|) like-signed vortex in the middle, eps = +1 on the other one.
Also: |sin 3 theta_g| = sin psi, |cos 3 theta_g| = cos psi, theta_g the polar angle of g=(1/G1,1/G2,1/G3) in the plane sum=0."""
import mpmath as mp, random
from core import velocities, center, P_of

mp.mp.dps = 40
random.seed(12345)


def kap(G, z):
    zc = center(G, z)
    v = velocities(G, z)
    ks = [v[j] / (z[j] - zc) for j in range(3)]
    return ks[0], max(abs(k - ks[0]) for k in ks) / abs(ks[0])


worst = 0
worst_psi = 0
nconf = 0
ntrip = 0
for trial in range(40):
    g1 = mp.mpf(random.uniform(0.2, 5)) * random.choice([1, -1])
    g2 = mp.mpf(random.uniform(0.2, 5)) * random.choice([1, -1])
    if abs(g1 + g2) < 0.05:
        continue
    g3 = -g1 * g2 / (g1 + g2)
    G = [g1, g2, g3]
    random.shuffle(G)
    sc = mp.mpf(random.uniform(0.3, 3)) * random.choice([1, -1]); G = [x * sc for x in G]  # common rescale (and sign flip)
    G1, G2, G3 = G
    if abs(G1 + G2) < mp.mpf('1e-3'):
        continue
    ntrip += 1
    d = abs((G1 - G2) * (G2 - G3) * (G3 - G1))
    psi = mp.atan(3 * mp.sqrt(3) * abs(G1 * G2 * G3) / d)
    # polar angle of reciprocal vector in plane sum=0
    g = [1 / x for x in G]
    e1 = [1 / mp.sqrt(2), -1 / mp.sqrt(2), 0]
    e2 = [1 / mp.sqrt(6), 1 / mp.sqrt(6), -2 / mp.sqrt(6)]
    X = sum(a * b for a, b in zip(g, e1)); Y = sum(a * b for a, b in zip(g, e2))
    thg = mp.atan2(Y, X)
    worst_psi = max(worst_psi, abs(abs(mp.sin(3 * thg)) - mp.sin(psi)), abs(abs(mp.cos(3 * thg)) - mp.cos(psi)))
    # zero-impulse circle in w = z3 (z1=0,z2=1)
    c0 = G2 / (G1 + G2)
    r02 = c0**2 - (G2 * G3 + G1 * G2) / (G3 * (G1 + G2))
    r0 = mp.sqrt(r02)
    # like-signed pair and weaker one
    signs = [mp.sign(x) for x in G]
    odd = [j for j in range(3) if signs.count(signs[j]) == 1][0]
    pair = [j for j in range(3) if j != odd]
    weak = min(pair, key=lambda j: abs(G[j]))
    special = {'col0': mp.mpf(0), 'colpi': mp.pi,
               'eqp': mp.arg(mp.expj(mp.pi / 3) - c0), 'eqm': mp.arg(mp.expj(-mp.pi / 3) - c0)}
    for i in range(1, 50):
        phi = -mp.pi + 2 * mp.pi * (i + mp.mpf(random.random()) * 0.5) / 50
        w = c0 + r0 * mp.expj(phi)
        z = [mp.mpc(0), mp.mpc(1), w]
        k, sp = kap(G, z)
        assert sp < mp.mpf(10)**-30
        if k.real >= 0:
            k = -mp.conj(k)  # mirror image collapses with the same P
        P = P_of(k)
        area = ((z[1] - z[0]).conjugate() * (z[2] - z[0])).imag / 2
        S = abs(z[0] - z[1])**2 + abs(z[0] - z[2])**2 + abs(z[1] - z[2])**2
        lam = mp.asin(4 * mp.sqrt(3) * abs(area) / S)
        # arc containing phi: nearest special angle going each way; take the collinear endpoint
        def cw(a):  # angular distance from phi going counterclockwise to a
            return (a - phi) % (2 * mp.pi)
        nxt = min(special, key=lambda s: cw(special[s]))
        prv = min(special, key=lambda s: (phi - special[s]) % (2 * mp.pi))
        col = nxt if nxt.startswith('col') else prv
        wc = (c0 + r0) if col == 'col0' else (c0 - r0)
        pos = sorted([(mp.mpf(0), 0), (mp.mpf(1), 1), (wc.real if isinstance(wc, mp.mpc) else wc, 2)])
        middle = pos[1][1]
        eps = -1 if middle == weak else +1
        Pm = (2 - mp.cos(lam)**2 + eps * mp.cos(psi) * mp.cos(lam)) / (mp.sin(psi) * mp.sin(2 * lam))
        worst = max(worst, abs(Pm - P) / P)
        nconf += 1
print('triples', ntrip, 'configs', nconf)
print('max rel |P_master - P_BiotSavart| with the sign rule:', mp.nstr(worst, 4))
print('max | |sin 3 theta_g| - sin psi |, | |cos 3 theta_g| - cos psi | (theta_g from e1=(1,-1,0)/sqrt2, e2=(1,1,-2)/sqrt6):', mp.nstr(worst_psi, 4))
