"""More numerical checks (50 digits, Biot-Savart):
 1. crossing-angle = pi/2 - beta in Kendall's stereographic chart and the Regiomontanus angle at e^{i psi} subtended by [s, s^3];
 2. cos beta_min = sin psi/(sqrt3 sinh 2 eta*), minimizer latitude relation 3cos^2 l - 2 = cos psi cos^3 l;
 3. principal-axis angle chi between Gamma-weighted inertia tensor and pair-orientation tensor: 2P = |cot 2chi|;
 4. tensor formula on a 4-vortex self-similar family (two concentric 2-gons, x_2 = 2+sqrt3), and P vs the ring formula;
 5. position of the collision point on the circumcircle at the minimizer; limit triangle angles as mu -> 0.
"""
import mpmath as mp
from core import *

mp.mp.dps = 50
om = mp.expj(2 * mp.pi / 3)


def weitz(z):
    z1, z2, z3 = z
    area = ((z2 - z1).conjugate() * (z3 - z1)).imag / 2
    S = abs(z1 - z2)**2 + abs(z1 - z3)**2 + abs(z2 - z3)**2
    return 4 * mp.sqrt(3) * area / S


def psi_of(G):
    g1, g2, g3 = G
    d = abs((g1 - g2) * (g2 - g3) * (g3 - g1))
    return mp.atan(3 * mp.sqrt(3) * abs(g1 * g2 * g3) / d) if d > 0 else mp.pi / 2


# ---- 1. Kendall stereographic coordinate xi = (w - e^{i pi/3})/(w - e^{-i pi/3}); meridian is a line through 0
print('1. crossing angle and Regiomontanus picture')
worst1 = worst2 = 0
for mu in ['0.02', '0.3', '0.5', '0.9', '1']:
    G = gammas(mu)
    psi = psi_of(G)
    e3 = mp.expj(mp.pi / 3)
    # charges at binary collision points in w: w=0 (z3=z1): G1G3 ; w=1 (z3=z2): G2G3 ; w=inf (z1=z2): G1G2
    xi = lambda w: (w - e3) / (w - mp.conj(e3))
    p13, p23, p12 = xi(mp.mpc(0)), xi(mp.mpc(1)), mp.mpc(1)
    q13, q23, q12 = G[0] * G[2], G[1] * G[2], G[0] * G[1]
    V = q13 * p13 + q23 * p23 + q12 * p12
    # meridian direction: perpendicular to V
    phiL = mp.arg(V) + mp.pi / 2
    rot = mp.expj(-phiL)
    tau = (p12 * rot)**3
    for i in range(1, 40):
        th = 2 * mp.pi * i / 40 + mp.mpf('0.031')
        z = positions(mu, th)
        k, _ = kappa_bs(G, z)
        if k.real >= 0:
            continue
        P = P_of(k)
        beta = mp.atan(2 * P)
        w = (z[2] - z[0]) / (z[1] - z[0])
        s = xi(w) * rot
        assert abs(s.imag) < mp.mpf(10)**-40, s
        s = s.real
        X = (s - tau) / (s**3 - tau)
        gam = abs(mp.atan(X.imag / X.real))
        worst1 = max(worst1, abs(gam - (mp.pi / 2 - beta)))
        # |tau| check and cos(psi) relation: tau = e^{i psi'} with |cos psi'| = cos psi
        worst2 = max(worst2, abs(abs(mp.cos(mp.arg(tau))) - mp.cos(psi)), abs(abs(mp.sin(mp.arg(tau))) - mp.sin(psi)))
print('  max |angle subtended at tau by [s,s^3] - (pi/2 - beta)| =', mp.nstr(worst1, 3), '; |tau|-angle vs psi:', mp.nstr(worst2, 3))

# ---- 2. minimizer: cos beta_min and latitude relation
print('2. minimizers')
for mu in ['1e-4', '0.1', '0.3', '0.5', '0.7', '0.9', '1']:
    G = gammas(mu)
    psi = psi_of(G)
    th = minimizers(mu)
    z = positions(mu, th['-'])
    P = P_of(kappa_bs(G, z)[0])
    lam = mp.asin(abs(weitz(z)))
    eta = mp.atanh(mp.sin(lam))
    cb = 1 / mp.sqrt(1 + 4 * P**2)
    cb2 = mp.sin(psi) / (mp.sqrt(3) * mp.sinh(2 * eta))
    rel = 3 * mp.cos(lam)**2 - 2 - mp.cos(psi) * mp.cos(lam)**3
    print(f"  mu={mu:>5} P-={mp.nstr(P,16)} lat*={mp.nstr(lam*180/mp.pi,12)} deg  cos beta={mp.nstr(cb,16)}  sin psi/(sqrt3 sinh 2eta)={mp.nstr(cb2,16)}  3cos^2-2-cos psi cos^3={mp.nstr(rel,3)}")

# ---- 3. principal axes
print('3. principal-axis angle chi')
worst3 = 0
for mu in ['0.05', '0.5', '1']:
    G = gammas(mu)
    for i in range(1, 30):
        th = 2 * mp.pi * i / 30 + mp.mpf('0.013')
        z = positions(mu, th)
        k, _ = kappa_bs(G, z)
        zc = center(G, z)
        Mt = sum(G[a] * (z[a] - zc)**2 for a in range(3))
        E = sum(G[a] * G[b] * ((z[a] - z[b]) / abs(z[a] - z[b]))**2 for a in range(3) for b in range(a + 1, 3))
        # traceless tensors: principal axis angles arg/2
        chi = (mp.arg(E) - mp.arg(Mt)) / 2
        twoP = abs(k.imag / k.real)
        worst3 = max(worst3, abs(twoP - abs(mp.cot(2 * chi))) / twoP)
print('  max rel |2P - |cot 2chi|| =', mp.nstr(worst3, 3))

# ---- 4. four vortices: two concentric 2-gons
print('4. four-vortex check (two 2-gons, x = 2+sqrt3)')
x2 = 2 + mp.sqrt(3)
K2 = 4 * mp.sqrt(3)
worst4 = worst5 = 0
for i in range(1, 25):
    thr = mp.pi / 2 * i / 25  # collapsing range 0 < 2 theta < pi
    zeta = mp.sqrt(x2) * mp.expj(thr)
    z = [mp.mpc(1), mp.mpc(-1), zeta, -zeta]
    G = [x2, x2, mp.mpf(-1), mp.mpf(-1)]
    v = velocities(G, z)
    zc = center(G, z)
    ks = [v[j] / (z[j] - zc) for j in range(4)]
    k = ks[0]
    spread = max(abs(q - k) for q in ks) / abs(k)
    Mt = sum(G[a] * (z[a] - zc)**2 for a in range(4))
    E = sum(G[a] * G[b] * (z[a] - z[b]) / mp.conj(z[a] - z[b]) for a in range(4) for b in range(a + 1, 4))
    kt = 1j * E / (2 * mp.pi * Mt)
    worst4 = max(worst4, abs(kt - k) / abs(k), spread)
    Pring = (K2 - mp.sqrt(3) * mp.cos(2 * thr)) / (4 * mp.sin(2 * thr))
    worst5 = max(worst5, abs(P_of(k) - Pring) / Pring)
print('  tensor formula rel err (incl. self-similarity spread):', mp.nstr(worst4, 3), '; P vs ring formula:', mp.nstr(worst5, 3))

# ---- 5. collision point on the circumcircle at the minimizer, and limit angles
print('5. minimizer geometry (arc A-): half-arcs from z_c to z_j on the circumcircle (inscribed angles, deg)')
for mu in ['1e-6', '1e-3', '0.1', '0.5', '1']:
    G = gammas(mu)
    th = minimizers(mu)
    z = positions(mu, th['-'])
    Z, Rc = circum(z)
    zc = center(G, z)
    onc = abs(abs(zc - Z) - Rc) / Rc
    ang = [mp.arg((zj - Z) / (zc - Z)) for zj in z]  # central angle from z_c to z_j
    half = [mp.nstr(a * 90 / mp.pi, 10) for a in ang]
    A, B, C, eps = angles(z)
    d23 = abs(z[1] - z[2]); r13 = abs(z[0] - z[2])
    print(f"  mu={mu:>5}: |zc-Z|/R-1={mp.nstr(onc,3)} half-arcs zc->z1,z2,z3 = {half}; A,B,C={mp.nstr(A*180/mp.pi,8)},{mp.nstr(B*180/mp.pi,10)},{mp.nstr(C*180/mp.pi,10)}; |z2-z3|/(mu|z1-z3|)={mp.nstr(d23/(mp.mpf(mu)*r13),10)}; A/((sqrt3/2)mu)={mp.nstr(A/(mp.sqrt(3)/2*mp.mpf(mu)),10)}")
