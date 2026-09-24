"""Test the 'master formula' on Kendall's shape sphere:
   P = (2 - cos^2 lam -/+ cos(psi) cos(lam)) / (sin(psi) |sin 2 lam|),
   sin(lam) = 4 sqrt(3) Area / (s12^2+s13^2+s23^2)   (Weitzenboeck ratio, Kendall latitude),
   tan(psi) = 3 sqrt(3) |G1 G2 G3| / |(G1-G2)(G2-G3)(G3-G1)|.
Also the tensor-angle formula kappa = i E / (2 pi Mt), E = sum_{j<k} GjGk (zj-zk)/conj(zj-zk), Mt = sum Gj (zj-zc)^2.
All P values from direct Biot-Savart at 50 digits."""
import mpmath as mp
from core import *

mp.mp.dps = 50


def weitz(z):
    z1, z2, z3 = z
    area = ((z2 - z1).conjugate() * (z3 - z1)).imag / 2
    S = abs(z1 - z2)**2 + abs(z1 - z3)**2 + abs(z2 - z3)**2
    return 4 * mp.sqrt(3) * area / S


def psi_of(G):
    g1, g2, g3 = G
    return mp.atan(3 * mp.sqrt(3) * abs(g1 * g2 * g3) / abs((g1 - g2) * (g2 - g3) * (g3 - g1))) if abs((g1 - g2) * (g2 - g3) * (g3 - g1)) > 0 else mp.pi / 2


def master(lam, psi, sgn):
    return (2 - mp.cos(lam)**2 + sgn * mp.cos(psi) * mp.cos(lam)) / (mp.sin(psi) * abs(mp.sin(2 * lam)))


worst = {'-': 0, '+': 0}
worst_t = 0
n = 0
for mu in ['0.001', '0.05', '0.2', '0.5', '0.8', '0.95', '1', '1.7', '4']:
    G = gammas(mu)
    m = mp.mpf(mu)
    R = 1 + m + m**2
    th0 = mp.acos((m - 1) / (2 * mp.sqrt(R)))
    psi = psi_of(G)
    # closed forms of cos psi, sin psi for this normalization
    cps = (1 - m) * (2 + m) * (1 + 2 * m) / (2 * R**mp.mpf(1.5))
    sps = 3 * mp.sqrt(3) * m * (1 + m) / (2 * R**mp.mpf(1.5))
    assert abs(abs(cps) - mp.cos(psi)) < mp.mpf(10)**-45 and abs(sps - mp.sin(psi)) < mp.mpf(10)**-45
    for arc, (lo, hi) in {'+': (0, th0), '-': (mp.pi, 2 * mp.pi - th0)}.items():
        for i in range(1, 60):
            th = lo + (hi - lo) * i / 60
            z = positions(mu, th)
            k, sp = kappa_bs(G, z)
            assert k.real < 0
            P = P_of(k)
            lam = mp.asin(abs(weitz(z)))
            # sign: for mu<1 the A- arc should carry -cos(psi) (smaller minimum), A+ carries +cos(psi)
            sgn = -1 if arc == '-' else +1
            if m > 1:
                sgn = -sgn
            Pm = master(lam, psi, sgn)
            worst[arc] = max(worst[arc], abs(Pm - P) / P)
            # tensor formula
            zc = center(G, z)
            E = sum(G[a] * G[b] * (z[a] - z[b]) / mp.conj(z[a] - z[b]) for a in range(3) for b in range(a + 1, 3))
            Mt = sum(G[a] * (z[a] - zc)**2 for a in range(3))
            kt = 1j * E / (2 * mp.pi * Mt)
            worst_t = max(worst_t, abs(kt - k) / abs(k))
            n += 1
print('configs', n)
print('master formula max rel err: arc A- (sgn -cos psi for mu<1):', mp.nstr(worst['-'], 5), ' arc A+:', mp.nstr(worst['+'], 5))
print('tensor formula kappa = iE/(2 pi Mt): max rel err', mp.nstr(worst_t, 5))

# minima via Chebyshev cubic
print()
print('minima from 2c^3-3c+-cos(psi)=0, P=(2c^2+1)sqrt(c^2-1)/(2 sin psi), vs paper minimizers')
for mu in ['1e-6', '0.01', '0.1', '0.3', '0.5', '0.7', '0.9', '1']:
    G = gammas(mu)
    psi = psi_of(G)
    th = minimizers(mu)
    out = []
    for arc, kk in (('-', mp.cos(psi)), ('+', -mp.cos(psi))):
        # arc A-: 2c^3-3c+cos psi=0 ; arc A+: 2c^3-3c-cos psi=0
        phi = mp.acos(-kk / mp.sqrt(2)) / 3
        c = mp.sqrt(2) * mp.cos(phi)
        Pc = (2 * c**2 + 1) * mp.sqrt(c**2 - 1) / (2 * mp.sin(psi))
        z = positions(mu, th[arc])
        Pbs = P_of(kappa_bs(G, z)[0])
        lam = mp.asin(abs(weitz(z)))
        out.append((arc, Pc, Pbs, 1 / mp.cos(lam)**2, c**2))
    s = ' '.join(f"[{a}] Pcheb={mp.nstr(p1,20)} |dP|={mp.nstr(abs(p1-p2),3)} C=cosh^2eta: minimizer {mp.nstr(C1,12)} vs cubic {mp.nstr(C2,12)}" for a, p1, p2, C1, C2 in out)
    print(f"mu={mu}: psi={mp.nstr(psi*180/mp.pi,12)} deg; {s}")
