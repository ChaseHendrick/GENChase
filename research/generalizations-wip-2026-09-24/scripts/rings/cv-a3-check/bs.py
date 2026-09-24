#!/usr/bin/env python3
"""
Independent Biot-Savart certification of CV-a3 (own code).  All 2n+1 vortices, direct pairwise sums, mpmath.
Configurations are built from (n, gamma) or (n, u) -> X = r^2 via (37), then placed with an arbitrary overall
scale R1, rotation psi, translation z0 and circulation scale lam; the formula is compared with P obtained
from kappa = (dz_j/dt)/(z_j - z0).
"""
import random
import mpmath as mp

DPS = 80
mp.mp.dps = DPS
I = mp.mpc(0, 1)
random.seed(20260924)

def roots37(n, g):
    A = (n - 1) + 2*g; Bq = -2*(n + g); C = mp.mpf(n - 1)
    if A == 0:
        return [-C/Bq]
    d = mp.sqrt(Bq*Bq - 4*A*C)
    q = -(Bq + (1 if Bq >= 0 else -1)*d)/2
    return [x for x in (q/A, C/q) if x > 0]

def gamma_of_X(n, X):
    return (-(n - 1)*X**2 + 2*n*X - (n - 1))/(2*X*(X - 1))

def config(n, g, X, a, lam, R1, psi, z0):
    r = mp.sqrt(X)
    eps = mp.expj(2*mp.pi/n)
    rot = mp.expj(psi)
    pos = [z0 + R1*rot*eps**k for k in range(n)] + [z0 + R1*rot*r*mp.expj(a/n)*eps**k for k in range(n)] + [z0]
    gam = [lam]*n + [-lam/X]*n + [lam*g]
    return pos, gam

def vel(pos, gam):
    out = []
    for j, zj in enumerate(pos):
        s = mp.mpc(0)
        for k, zk in enumerate(pos):
            if k != j:
                s += gam[k]/(zj - zk)
        out.append(mp.conj(s/(2*mp.pi*I)))
    return out

def formula(n, g, X, a):
    u = abs(mp.log(X)/2)
    B = mp.coth(u)
    K = n*mp.sinh(n*u) + B*mp.cosh(n*u)
    K2 = ((n + 1)*mp.cosh((n + 1)*u) - (n - 1)*mp.cosh((n - 1)*u))/(2*mp.sinh(u))
    r = mp.sqrt(X)
    K3 = abs((2*(n + g)*X - (n - 1))*r**n - ((n - 1) - 2*g*X)*r**(-n))/(2*X)
    B2 = (X + 1)/abs(X - 1)
    B3 = abs(n + 2*g - (n - 1)/X)
    num2 = n*mp.sinh(n*u) + B*(mp.cosh(n*u) - mp.cos(a))
    return (K - B*mp.cos(a))/(2*n*mp.sin(a)), (K, K2, K3), (B, B2, B3), num2

worst = dict(P=mp.mpf(0), spread=mp.mpf(0), centre=mp.mpf(0), Kforms=mp.mpf(0), Bforms=mp.mpf(0), num=mp.mpf(0))
count = 0; sign_ok = True; minnum = mp.inf; minP = mp.inf
cases = []
for n in list(range(2, 13)) + [16, 25]:
    gl = [mp.mpf(0), mp.mpf('1e-3'), mp.mpf('-1e-3'), mp.mpf('0.5'), mp.mpf(-0.5), mp.mpf(1), mp.mpf(-1), mp.mpf(3), mp.mpf(-3),
          mp.mpf(10), mp.mpf(-10), mp.mpf(100), mp.mpf(-100), mp.mpf('1e4'), mp.mpf('-1e4'),
          -mp.mpf(n - 1)/2, -mp.mpf(n - 1)/2 + mp.mpf('1e-6'), -mp.mpf(n - 1)/2 - mp.mpf('1e-6')]
    gl += [mp.mpf(random.uniform(-20, 20)) for _ in range(4)]
    for g in gl:
        for X in roots37(n, g):
            cases.append((n, g, X))
    for u in [mp.mpf('1e-4'), mp.mpf('-1e-4'), mp.mpf('0.03'), mp.mpf('-0.03'), mp.mpf('0.7'), mp.mpf('-0.7'), mp.mpf(2), mp.mpf(-2)]:
        X = mp.exp(2*u)
        cases.append((n, gamma_of_X(n, X), X))

alist_fixed = [mp.mpf('1e-7'), mp.mpf('1e-3'), mp.pi/2, mp.pi - mp.mpf('1e-3'), mp.pi - mp.mpf('1e-7')]
maxdps = 0
for (n, g, X80) in cases:
    # adaptive precision: Re kappa/|kappa| ~ r^{-n|..|} sin a, so n |log10 r| + 7 digits are lost in the direct sum
    need = DPS + int(mp.ceil(n*abs(mp.log10(X80))/2)) + 10
    mp.mp.dps = need; maxdps = max(maxdps, need)
    X = min(roots37(n, g), key=lambda x: abs(x - X80))      # re-solve (37) at the working precision
    res37 = ((n - 1) + 2*g)*X**2 - 2*(n + g)*X + (n - 1)
    assert abs(res37) < mp.mpf(10)**(-need + 15)*(1 + abs(g))*(1 + X**2), (n, g, X, res37)
    alist = alist_fixed + [mp.mpf(random.uniform(0.01, 3.13)) for _ in range(3)]
    for a in alist:
        lam = mp.mpf(random.choice([1, 0.37, 2.9]))
        R1 = mp.mpf(random.uniform(0.3, 3)); psi = mp.mpf(random.uniform(0, 6.28))
        z0 = mp.mpc(random.uniform(-2, 2), random.uniform(-2, 2))
        # rotate by an extra 2 pi j/n on the second ring as well: a -> a + 2 pi j is the same configuration family
        pos, gam = config(n, g, X, a, lam, R1, psi, z0)
        V = vel(pos, gam)
        ks = [V[j]/(pos[j] - z0) for j in range(2*n)]
        k0 = ks[0]
        spread = max(abs(k - k0) for k in ks)/abs(k0)
        centre = abs(V[-1])/(abs(k0)*R1)
        P_bs = abs(k0.imag)/(-2*k0.real)
        Pf, Ks, Bs, num2 = formula(n, g, X, a)
        sign_ok &= (k0.real < 0)                    # 0 < a < pi with Gamma1 = lam > 0 must collapse
        relP = abs(P_bs - Pf)/Pf
        worst['P'] = max(worst['P'], relP)
        worst['spread'] = max(worst['spread'], spread)
        worst['centre'] = max(worst['centre'], centre)
        worst['Kforms'] = max(worst['Kforms'], max(abs(Ks[1] - Ks[0]), abs(Ks[2] - Ks[0]))/Ks[0])
        worst['Bforms'] = max(worst['Bforms'], max(abs(Bs[1] - Bs[0]), abs(Bs[2] - Bs[0]))/Bs[0])
        numer = Ks[0] - Bs[0]*mp.cos(a)
        worst['num'] = max(worst['num'], abs(numer - num2)/numer)
        minnum = min(minnum, numer); minP = min(minP, Pf)
        count += 1
        if relP > mp.mpf('1e-40'):
            print('LARGE', n, mp.nstr(g, 8), mp.nstr(X, 12), mp.nstr(a, 8), mp.nstr(relP, 3))

mp.mp.dps = DPS
print('working precision per case: %d .. %d digits' % (DPS + 10, maxdps))
print('configurations (all collapsing, 0 < a < pi):', count, ' with', len(cases), '(n, gamma, root) triples')
for k, vv in worst.items():
    print('  worst %-7s %s' % (k, mp.nstr(vv, 3)))
print('  every 0<a<pi configuration has Re kappa < 0 (collapse):', sign_ok)
print('  min numerator K - B cos a over the sample:', mp.nstr(minnum, 6), '; min P:', mp.nstr(minP, 10))

# expansion side: pi < a < 2 pi must give Re kappa > 0 (so "0 < a < pi" is exactly the collapse range for Gamma1 > 0)
exp_ok = True
for (n, g, X80) in cases[::3]:
    mp.mp.dps = DPS + int(mp.ceil(n*abs(mp.log10(X80))/2)) + 10
    X = min(roots37(n, g), key=lambda x: abs(x - X80))
    for a in [mp.pi + mp.mpf('1e-3'), mp.mpf(4), 2*mp.pi - mp.mpf('1e-3')]:
        pos, gam = config(n, g, X, a, mp.mpf(1), mp.mpf(1), mp.mpf(0), mp.mpc(0))
        V = vel(pos, gam); k0 = V[0]/pos[0]
        exp_ok &= k0.real > 0
print('  pi < a < 2 pi gives Re kappa > 0 (expansion) for Gamma1 > 0:', exp_ok)
# Gamma1 < 0 (all circulations negated): 0 < a < pi expands; collapse for pi < a < 2 pi with |sin a| in the formula
neg_ok = True; negerr = mp.mpf(0)
for (n, g, X80) in cases[::5]:
    mp.mp.dps = DPS + int(mp.ceil(n*abs(mp.log10(X80))/2)) + 10
    X = min(roots37(n, g), key=lambda x: abs(x - X80))
    for a in [mp.mpf('0.4'), mp.mpf(2)]:
        pos, gam = config(n, g, X, a, mp.mpf(-1), mp.mpf(1), mp.mpf(0), mp.mpc(0))
        V = vel(pos, gam); k0 = V[0]/pos[0]
        neg_ok &= k0.real > 0
        pos, gam = config(n, g, X, -a, mp.mpf(-1), mp.mpf(1), mp.mpf(0), mp.mpc(0))
        V = vel(pos, gam); k0 = V[0]/pos[0]
        neg_ok &= k0.real < 0
        negerr = max(negerr, abs(abs(k0.imag)/(-2*k0.real) - formula(n, g, X, a)[0])/formula(n, g, X, a)[0])
print('  Gamma1 < 0: 0<a<pi expands, a -> -a collapses with the same P:', neg_ok, ' rel err', mp.nstr(negerr, 3))

# gamma = 0 against the paper's eq. Pring
mp.mp.dps = 60
worstg0 = mp.mpf(0)
for n in range(2, 13):
    xn = (n + mp.sqrt(2*n - 1))/(n - 1); rho = xn**(mp.mpf(n)/2)
    Kn = (n - 1)*xn*(rho + 1/rho)/2 - n/rho
    for a in [mp.mpf('0.1'), mp.mpf(1), mp.mpf('2.5')]:
        Pp = (Kn - mp.sqrt(2*n - 1)*mp.cos(a))/(2*n*mp.sin(a))
        for X in (xn, 1/xn):
            worstg0 = max(worstg0, abs(formula(n, mp.mpf(0), X, a)[0] - Pp)/Pp)
print('  gamma = 0 reproduces the paper eq. Pring (both roots x_n, 1/x_n), n = 2..12: rel', mp.nstr(worstg0, 3))

# n = 1 is outside the family: the central vortex is not at rest
mp.mp.dps = 50
n = 1; g = mp.mpf(1)
X = roots37(n, g)[0]
pos, gam = config(n, g, X, mp.mpf(1), mp.mpf(1), mp.mpf(1), mp.mpf(0), mp.mpc(0))
V = vel(pos, gam)
print('  n = 1 check (excluded case): |centre velocity| =', mp.nstr(abs(V[-1]), 5))
