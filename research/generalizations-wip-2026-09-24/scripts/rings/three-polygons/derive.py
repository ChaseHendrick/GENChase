#!/usr/bin/env python3
"""
derive.py -- exact (SymPy) re-derivation of the DK Sect. 4 collapse family from the Biot-Savart
self-similarity equations, independent of DK's generating-polynomial route.

Configuration (R1 = 1):  Gamma0 at 0;  Gamma1 at eps^k;  Gamma2 at w eps^k, w = e^{i phi2};
Gamma3 at r eps^k;  eps = e^{2 pi i/n}, k = 0..n-1.  b = w^n = e^{i beta}, beta = n phi2;  q = r^n.
Self-similarity (DK (11)):  Omega conj(z_k) = sum'_j Gamma_j/(z_k - z_j).
Root-of-unity reduction at z = 1, z = w, z = r (the orbit representatives) gives
  E1: Omega      = G1 (n-1)/2 + G0 + n G2/(1-b) + n G3/(1-q)
  E2: Omega      = G2 (n-1)/2 + G0 + n G1 b/(b-1) + n G3 b/(b-q)
  E3: Omega r^2  = G3 (n-1)/2 + G0 + n G1 q/(q-1) + n G2 q/(q-b)
Checks printed: PASS/FAIL.
"""
import sympy as sp

RES = []


def check(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + ((' :: ' + str(info)) if info != '' else ''))


n, r, q = sp.symbols('n r q', positive=True)
G0, G1, G2, G3 = sp.symbols('Gamma0 Gamma1 Gamma2 Gamma3', real=True)
ReO, ImO = sp.symbols('ReOmega ImOmega', real=True)
t, s = sp.symbols('t s', real=True)          # t = cos beta, s = sin beta, s^2 = 1 - t^2
b = t + sp.I * s

# 0. the root-of-unity sums used above (checked for n = 2..7 exactly)
ok = True
for nn in range(2, 8):
    eps = sp.exp(2 * sp.pi * sp.I / nn)
    zz = sp.Symbol('zz')
    lhs = sum(1 / (zz - sp.Symbol('a') * eps**k) for k in range(nn))
    rhs = nn * zz**(nn - 1) / (zz**nn - sp.Symbol('a')**nn)
    val = {zz: sp.Rational(3, 7) + sp.I / 5, sp.Symbol('a'): sp.Rational(5, 11) - sp.I * 2 / 3}
    ok &= abs(sp.N((lhs - rhs).subs(val), 40)) < 1e-35
    ok &= abs(sp.N(sum(1 / (1 - eps**k) for k in range(1, nn)) - sp.Rational(nn - 1, 2), 40)) < 1e-35
check('0 sum_k 1/(z - a eps^k) = n z^(n-1)/(z^n - a^n) and sum_{k>0} 1/(1-eps^k) = (n-1)/2, n = 2..7', ok)

Om = ReO + sp.I * ImO
E1 = G1 * (n - 1) / 2 + G0 + n * G2 / (1 - b) + n * G3 / (1 - q) - Om
E2 = G2 * (n - 1) / 2 + G0 + n * G1 * b / (b - 1) + n * G3 * b / (b - q) - Om
E3 = G3 * (n - 1) / 2 + G0 + n * G1 * q / (q - 1) + n * G2 * q / (q - b) - Om * r**2


# Imaginary parts, written by hand and checked:
#   Im E1: ImO = n G2 s/(2(1-t))
#   Im E2: ImO = -n G1 s/(2(1-t)) - n G3 q s/D,  D = 1 - 2 q t + q^2
#   Im E3: r^2 ImO = n G2 q s/D
D = 1 - 2 * q * t + q**2
I1 = n * G2 * s / (2 * (1 - t)) - ImO
I2 = -n * G1 * s / (2 * (1 - t)) - n * G3 * q * s / D - ImO
I3 = n * G2 * q * s / D - r**2 * ImO
R1_ = G1 * (n - 1) / 2 + G0 + n * G2 / 2 + n * G3 / (1 - q) - ReO
R2_ = G2 * (n - 1) / 2 + G0 + n * G1 / 2 + n * G3 * (1 - q * t) / D - ReO
R3_ = G3 * (n - 1) / 2 + G0 + n * G1 * q / (q - 1) + n * G2 * q * (q - t) / D - r**2 * ReO
# numeric spot check of the hand split against the complex equations
import random
random.seed(1)
okc = True
for _ in range(20):
    beta = random.uniform(0.1, 6.0)
    val = {n: random.randint(2, 9), r: random.uniform(0.2, 1.8), G0: random.uniform(-2, 2), G1: random.uniform(-2, 2),
           G2: random.uniform(-2, 2), G3: random.uniform(-2, 2), ReO: random.uniform(-2, 2), ImO: random.uniform(-2, 2),
           t: sp.cos(beta), s: sp.sin(beta)}
    val[q] = val[r]**val[n]
    for E, Rp, Ip in ((E1, R1_, I1), (E2, R2_, I2), (E3, R3_, I3)):
        z = complex(sp.N(E.subs(val), 30))
        okc &= abs(z.real - float(sp.N(Rp.subs(val)))) < 1e-12 and abs(z.imag - float(sp.N(Ip.subs(val)))) < 1e-12
check('1 hand-split real/imag parts of E1..E3 agree with the complex equations (20 random points)', okc)

# 2. collapse needs ImO != 0 => G2 != 0, s != 0.  From Im E1 and Im E3:  r^2 D = 2 q (1 - t)
tsol = sp.solve(sp.Eq(r**2 * D, 2 * q * (1 - t)), t)[0]
dk57 = (r**(2 * n + 2) - 2 * r**n + r**2) / (2 * r**n * (r**2 - 1))
check('2 Im E1, Im E3 (s != 0, G2 != 0) force cos(n phi2) = (r^2(1+q^2) - 2q)/(2q(r^2-1)) = DK (57)',
      sp.simplify(tsol - dk57.subs(r**n, q).subs(r**(2 * n + 2), q**2 * r**2)) == 0 and
      sp.simplify(tsol.subs(q, r**n) - dk57) == 0, tsol)
# 3. Im E2 then forces delta1 = G1 + G2 + G3 r^2 = 0
ImO_1 = sp.solve(I1, ImO)[0]
e2 = sp.together((I2.subs(ImO, ImO_1)) * 2 * (1 - t) / (n * s))
e2 = sp.simplify(e2.subs(t, tsol))
check('3 Im E2 with the above is equivalent to delta1 = G1 + G2 + G3 r^2 = 0',
      sp.simplify(e2 / (G1 + G2 + G3 * r**2)).is_constant() and sp.simplify(e2 / (G1 + G2 + G3 * r**2)) != 0,
      sp.factor(e2))
# 4. the real parts: 3 linear equations in (ReO, G0, G1, G2, G3) + delta1 = 0 -> unique ray; compare with DK (58)
M = sp.Matrix([[sp.diff(Rq, v) for v in (ReO, G0, G1, G2, G3)] for Rq in (R1_, R2_, R3_)] + [[0, 0, 1, 1, r**2]])
M = M.subs(t, tsol)
sol = sp.solve([R1_.subs(t, tsol), R2_.subs(t, tsol), R3_.subs(t, tsol), G1 + G2 + G3 * r**2], [ReO, G0, G1, G2], dict=True)
check('4a the real system has a unique solution (ReOmega, G0, G1, G2) for given G3 (generic r, q)', len(sol) == 1)
sol = sol[0]
G1_58 = -G3 * r**2 * ((n + 1) * q + n - 1) / (2 * (q - 1))
G2_58 = G3 * r**2 * ((n - 1) * q + n + 1) / (2 * (q - 1))
G0_58 = ((n - 1) * G3**2 * r**4 - 2 * (G1_58 + n * G3) * G3 * r**2 + (n - 1) * G3**2 - 2 * G1_58**2) / (2 * G3 * (r**2 - 1))
check('4b Gamma1, Gamma2 equal DK (58)', sp.simplify(sol[G1] - G1_58) == 0 and sp.simplify(sol[G2] - G2_58) == 0)
check('4c Gamma0 equals DK (58)', sp.simplify(sol[G0] - G0_58) == 0, sp.factor(sol[G0]))
M4 = M[:, :4]
det4 = sp.factor(sp.simplify(M4.det()))
print('   det4 =', det4)
# 5. Omega of DK (56) vs Re from E1 and Im from E1
ReO_s = sp.factor(sp.simplify(sol[ReO]))
print('   ReOmega (G3 = 1) =', sp.factor(ReO_s.subs(G3, 1)))
ss = sp.sqrt(1 - tsol**2)
ImO_s = n * sol[G2] * ss / (2 * (1 - tsol))
# DK (56)
g6 = ((2 * q + (n + 3) * r**2 - n - 1) * G1_58**2 * G3 + (2 * q * r**2 + (n + 1) * r**4 - 2 * n * r**2 + n + 1) * G3**2 * G1_58)
g7 = 2 * G1_58**3 + ((n + 1) * r**2 - (n - 1)) * q * r**2 * G3**3
Om56 = ((G1_58 + G3 * r**2) * (((n - 1) * r**2 - (n + 1)) * (G1_58 + G3) * G3 - 2 * G1_58**2) * b + g6 + g7) / \
       (2 * G3 * (r**2 - 1) * ((G1_58 + G3 * r**2) * b - G1_58 - G3 * q * r**2))
# numeric comparison at random points (s = +sqrt(1-t^2))
okO = True
for nn in range(2, 8):
    for rr in (sp.Rational(9, 10), sp.Rational(97, 100), sp.Rational(3, 4), sp.Rational(1, 2)):
        tv = tsol.subs({q: rr**nn, r: rr, n: nn})
        if not (-1 < tv < 1):
            continue
        val = {n: nn, r: rr, q: rr**nn, G3: 1, t: tv, s: sp.sqrt(1 - tv**2)}
        a = sp.N((ReO_s + sp.I * ImO_s).subs(val), 40)
        c = sp.N(Om56.subs(val), 40)
        okO &= abs(a - c) < 1e-30
check('5 DK (56) = ReOmega + i ImOmega from the real/imag reduction (n = 2..7, several r, 40 digits)', okO)

# 6. closed form for P = |ReOmega|/(2|ImOmega|).
#    1 + t = (4q - r^2 (1+q)^2)/(2q(1-r^2)),  1 - t = r^2 (1-q)^2/(2 q (1-r^2))
check('6a 1 - cos beta = r^2 (1-q)^2/(2q(1-r^2))', sp.simplify(1 - tsol - r**2 * (1 - q)**2 / (2 * q * (1 - r**2))) == 0)
check('6b 1 + cos beta = (4q - r^2(1+q)^2)/(2q(1-r^2))', sp.simplify(1 + tsol - (4 * q - r**2 * (1 + q)**2) / (2 * q * (1 - r**2))) == 0)
Wq = 4 * q - r**2 * (1 + q)**2                 # > 0 is the existence condition |cos beta| < 1 (with r < 1)
# |ImOmega| = n |G2| sqrt((1+t)/(1-t))/2 = n |G2| sqrt(W)/(2 r (1-q))  (0<r<1, q<1)
ImAbs = n * (G3 * r**2 * ((n - 1) * q + n + 1) / (2 * (1 - q))) * sp.sqrt(Wq) / (2 * r * (1 - q))
N_ = sp.factor(sp.simplify(ReO_s.subs(G3, 1) * 4 * (1 - q)**2 * (1 - r**2)))
print('   4 (1-q)^2 (1-r^2) ReOmega/G3 =', sp.expand(N_))
print('   factor:', sp.factor(N_))
Pexpr = sp.simplify(ReO_s.subs(G3, 1) / (2 * ImAbs.subs(G3, 1)))
print('   P (signed, G3 = 1) =', sp.factor(Pexpr))
