"""Check the intrinsic angle formula for kappa against Biot-Savart, and print minimizer shapes."""
import mpmath as mp
from core import *

mp.mp.dps = 50


def kappa_angles(G, A, B, C, R, eps):
    ca, cb, cc = mp.cot(A), mp.cot(B), mp.cot(C)
    re = eps * G[2] * (ca - cb) / (8 * mp.pi * R**2)
    im = ((G[0] + G[1]) / mp.sin(C)**2 + G[2] * mp.cos(A - B) / (mp.sin(A) * mp.sin(B))) / (8 * mp.pi * R**2)
    return mp.mpc(re, im)


worst = 0
worst_ss = 0
count = 0
for mu in ['0.05', '0.1', '0.3', '0.5', '0.8', '1', '2', '7']:
    G = gammas(mu)
    for i in range(1, 40):
        th = 2 * mp.pi * i / 40 + mp.mpf('0.0123')
        z = positions(mu, th)
        k, sp = kappa_bs(G, z)
        A, B, C, eps = angles(z)
        Z, R = circum(z)
        k2 = kappa_angles(G, A, B, C, R, eps)
        worst = max(worst, abs(k2 - k) / abs(k))
        worst_ss = max(worst_ss, sp)
        count += 1
        # also check the symmetric self-similarity constraints G1(b-c)=G2(c-a)=G3(a-b) (times eps)
print('intrinsic kappa formula: configs', count, 'max rel diff', mp.nstr(worst, 5), 'max self-sim spread', mp.nstr(worst_ss, 5))

# constraint check
wc = 0
for mu in ['0.05', '0.3', '0.5', '1', '3']:
    G = gammas(mu)
    for i in range(1, 30):
        th = 2 * mp.pi * i / 30 + mp.mpf('0.017')
        z = positions(mu, th)
        A, B, C, eps = angles(z)
        a, b, c = mp.cot(A), mp.cot(B), mp.cot(C)
        s1, s2, s3 = G[0] * (b - c), G[1] * (c - a), G[2] * (a - b)
        wc = max(wc, abs(s1 - s2), abs(s2 - s3))
print('constraint G1(b-c)=G2(c-a)=G3(a-b): max abs diff', mp.nstr(wc, 5))

print()
print('minimizer shapes (angles in degrees at vortices 1,2,3; G=(1,mu,-mu/(1+mu)))')
for mu in ['1e-6', '1e-4', '0.001', '0.01', '0.05', '0.1', '0.2', '0.3', '0.5', '0.7', '0.9', '0.99', '1']:
    G = gammas(mu)
    th = minimizers(mu)
    for arc in ['-', '+']:
        z = positions(mu, th[arc])
        k, sp = kappa_bs(G, z)
        P = P_of(k)
        A, B, C, eps = angles(z)
        beta = mp.atan(2 * P)
        print(f"mu={mu:>6} arc {arc} P={mp.nstr(P,15):>18} ori={eps:+d} A={mp.nstr(A*180/mp.pi,10):>14} B={mp.nstr(B*180/mp.pi,10):>14} C={mp.nstr(C*180/mp.pi,10):>14} beta={mp.nstr(beta*180/mp.pi,10)} cosb={mp.nstr(mp.cos(beta),10)} spread={mp.nstr(sp,3)}")
