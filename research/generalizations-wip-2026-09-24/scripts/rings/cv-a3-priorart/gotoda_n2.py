# Prior-art check for CV-a3 at n = 2: is P the ratio of the published five-vortex rates
# (Novikov-Sedov 1979 via Gotoda 2021 eq. (3.13), parallelogram + centre)?
# Compares three things at 50 digits: CV-a3 closed form, Gotoda (3.13) |B|/(2|A|), and direct Biot-Savart.
from mpmath import mp, mpf, mpc, exp, cosh, sinh, sin, cos, pi, fabs, im, re, conj
mp.dps = 50
n = 2
def cv_P(u, a):
    au = fabs(u)
    K = n*sinh(n*au) + cosh(au)/sinh(au)*cosh(n*au)
    B = cosh(au)/sinh(au)
    return (K - B*cos(a))/(2*n*sin(a))
def config(u, a):
    r = exp(u); X = r*r
    g0 = (1/(X-1) - (n-1)*(X-1)/(2*X))          # gamma(X) from (37)
    phi2 = a/n
    zs = []; Gs = []
    for k in range(n):
        zs.append(exp(2j*pi*k/n)); Gs.append(mpf(1))
        zs.append(r*exp(1j*(phi2 + 2*pi*k/n))); Gs.append(-1/X)
    zs.append(mpc(0)); Gs.append(g0)
    return zs, Gs, g0, r, X
def bs_P(zs, Gs):
    # conj(dz_j/dt) = (1/(2 pi i)) sum Gamma_k/(z_j - z_k); dz_j/dt = kappa z_j (z_c = 0)
    ks = []
    for j, zj in enumerate(zs):
        if zj == 0: continue
        s = sum(Gs[k]/(zj - zs[k]) for k in range(len(zs)) if k != j)
        v = conj(s/(2j*pi))
        ks.append(v/zj)
    kap = ks[0]
    spread = max(abs(k - kap) for k in ks)
    return fabs(im(kap))/(-2*re(kap)), re(kap), spread
def gotoda_P(u, a, g0):
    # Gotoda (3.9): k1,k2 = +-(d1/2) e^{i theta} strength g1; k3,k4 = -+ d2/2 strength g2; k5 = 0 strength g3.
    # Map: Gotoda ring 1 = CV ring 1 (Gamma1 = 1, radius 1) rotated by theta relative to ring 2.
    # CV ring 2 sits at angle phi2 = a/2 from ring 1, so ring 1 sits at theta = -a/2 from ring 2.
    r = exp(u)
    d1 = mpf(2); d2 = 2*r; g1 = mpf(1); g2 = -1/(r*r); g3 = g0; th = -a/2
    den = d1**4 + d2**4 - 2*d1**2*d2**2*cos(2*th)
    A = 4*g1*d1**2*sin(2*th)/(pi*den)
    B = (d1**2 + d2**2)/(2*pi*d1**2*d2**2)*(g1 + g2 + 2*g3 + 4*g2*d2**2*(d1**2 - d2**2)/den)
    I = (g1*d1**2 + g2*d2**2)/2
    GH = g1**2 + 4*g1*g2 + g2**2 + 2*g3*(g1 + g2)
    return fabs(B)/(2*fabs(A)), A, B, I, GH
worst = {'cv_vs_bs':0, 'got_vs_bs':0, 'spread':0, 'I':0, 'GH':0}
cnt = 0
for u in [mpf(s) for s in ['-1.3','-0.7','-0.2','-0.05','0.05','0.3','0.6','1.1','1.7']]:
    for a in [pi*mpf(k)/13 for k in range(1, 13)]:
        zs, Gs, g0, r, X = config(u, a)
        Pbs, rek, sp = bs_P(zs, Gs)
        if rek >= 0: continue
        Pcv = cv_P(u, a)
        Pg, A, B, I, GH = gotoda_P(u, a, g0)
        worst['cv_vs_bs'] = max(worst['cv_vs_bs'], fabs(Pcv/Pbs - 1))
        worst['got_vs_bs'] = max(worst['got_vs_bs'], fabs(Pg/Pbs - 1))
        worst['spread'] = max(worst['spread'], sp)
        worst['I'] = max(worst['I'], fabs(I)); worst['GH'] = max(worst['GH'], fabs(GH))
        cnt += 1
print('collapsing configurations tested (n = 2, all 5 vortices, 50 digits):', cnt)
for k, v in worst.items(): print(' worst', k, mp.nstr(v, 5))
