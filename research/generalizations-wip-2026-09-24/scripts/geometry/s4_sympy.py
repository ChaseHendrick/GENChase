"""Exact (SymPy) verification of the master formula and its consequences.
Notation: m = mu, r = sqrt(R), R = 1+m+m^2, C = r cos(theta), paper's N(C), M(C).
"""
import sympy as sp

m, r, c, s, C, y, S, x, k, cps, sps = sp.symbols('m r c s C y S x k cps sps', real=True)
R = 1 + m + m**2
red = lambda e: sp.expand(e).subs(r**2, R)  # one-step reduction; we reduce repeatedly below


def reduce_r(e):
    e = sp.expand(e)
    p = sp.Poly(e, r)
    out = 0
    for (d,), co in p.terms():
        out += co * R**(d // 2) * r**(d % 2)
    return sp.expand(out)


ok = True
# ---------------------------------------------------------------- (b) Weitzenboeck ratio / Kendall latitude
I = sp.I
e = c - I * s  # e^{-i theta}
d12 = r * e / (1 + m)            # z1 - z2
d31 = r * (r - m * e) / (1 + m)**2  # z3 - z1
d32 = r * (r + e) / (1 + m)**2      # z3 - z2
ab2 = lambda z: sp.expand(z * sp.conjugate(z))
Ssum = reduce_r(ab2(d12) + ab2(d31) + ab2(d32)).subs(s**2, 1 - c**2)
Ssum = reduce_r(sp.expand(Ssum))
area = reduce_r(sp.expand(sp.im(sp.expand(sp.conjugate(-d12) * d31)) / 2))  # (z2-z1) = -d12
S_claim = 2 * r**3 * (2 * r + (1 - m) * c) / (1 + m)**4
A_claim = -r**3 * s / (2 * (1 + m)**3)
chk1 = sp.simplify(reduce_r(sp.expand((Ssum - S_claim) * (1 + m)**4)))
chk2 = sp.simplify(reduce_r(sp.expand((area - A_claim) * (1 + m)**3)))
print('S = 2 r^3 (2r+(1-m)cos th)/(1+m)^4 :', chk1 == 0)
print('Area = -r^3 sin th /(2 (1+m)^3)    :', chk2 == 0)
ok &= (chk1 == 0) and (chk2 == 0)
# sin(lam) = 4 sqrt3 |Area| / S = sqrt3 (1+m)|s| / D0,  D0 = 2r+(1-m)c ; cos^2 lam = M^2/D0^2
D0 = 2 * r + (1 - m) * c
Mc = 1 - m + 2 * r * c
chk3 = reduce_r(sp.expand(D0**2 - 3 * (1 + m)**2 * (1 - c**2) - Mc**2))
print('D0^2 - 3(1+m)^2 sin^2 = M(C)^2       :', sp.simplify(chk3) == 0)
ok &= sp.simplify(chk3) == 0

# ---------------------------------------------------------------- (c) psi
G1, G2 = sp.Integer(1), m
G3 = -m / (1 + m)
num = 3 * sp.sqrt(3) * G1 * G2 * G3
den = (G1 - G2) * (G2 - G3) * (G3 - G1)
cos_psi = (1 - m) * (2 + m) * (1 + 2 * m) / (2 * r**3)
sin_psi = 3 * sp.sqrt(3) * m * (1 + m) / (2 * r**3)
chk4 = sp.simplify(reduce_r(sp.expand(((1 - m) * (2 + m) * (1 + 2 * m))**2 + 27 * m**2 * (1 + m)**2 - 4 * r**6)))
chk5 = sp.simplify(sp.together(num / den - sin_psi / cos_psi))  # both signs negative-free after abs; num/den>0 on (0,1)
print('cos^2 psi + sin^2 psi = 1            :', chk4 == 0)
print('tan psi = 3sqrt3|G1G2G3|/|prod(Gi-Gj)|:', chk5 == 0)
ok &= chk4 == 0 and chk5 == 0

# ---------------------------------------------------------------- (a) master identity
N = 2 * (1 + m**2) * R + (1 - m) * (2 + m + 2 * m**2) * C - 2 * m * C**2
M = 1 - m + 2 * C
D0C = (2 * r**2 + (1 - m) * C) / r   # = 2r + (1-m) cos th with C = r cos th
lhs = 9 * (1 + m)**2 * N
rhs = 2 * r**4 * (2 * D0C**2 - M**2) + r * (1 - m) * (2 + m) * (1 + 2 * m) * M * D0C
chk6 = sp.simplify(reduce_r(sp.expand(lhs - rhs)))
print('9(1+m)^2 N = 2 r^4 (2D0^2 - M^2) + 2r^4 cos(psi) M D0 :', chk6 == 0)
ok &= chk6 == 0
# => P = N/(2 m r M sin th) = (2 - cos^2 lam + cos psi * (M/D0)) / (sin psi * 2 sin lam cos lam) with signed cos lam = M/D0
#    which is the master formula with -cos psi on A- (M<0) and +cos psi on A+ (M>0).
Pp = N / (2 * m * r * M * s)
cl = M / D0C  # signed cos lambda
sl = sp.sqrt(3) * (1 + m) * s / D0C  # signed sin lambda (sign of sin theta)
master = (2 - cl**2 + cos_psi * cl) / (sin_psi * 2 * sl * cl)
diff = sp.together(Pp - master)
numer = sp.numer(diff)
numer = reduce_r(sp.expand(numer))
print('P(theta) - master(lambda,psi) == 0 (exact)           :', sp.simplify(numer) == 0)
ok &= sp.simplify(numer) == 0

# ---------------------------------------------------------------- (e) critical points in c = cosh(eta) = 1/cos(lam)
cc = sp.symbols('cc', positive=True)
f = (2 * cc**2 - 1 - k * cc) / sp.sqrt(cc**2 - 1)
df = sp.together(sp.diff(f, cc))
crit = sp.factor(sp.numer(df))
print('d/dc[(2c^2-1-kc)/sqrt(c^2-1)] numerator :', crit)
# value at critical point: 2c^2-1-kc with k = 3c-2c^3
val = sp.factor(sp.expand((2 * cc**2 - 1 - (3 * cc - 2 * cc**3) * cc)))
print('2c^2-1-kc at k=3c-2c^3 :', val)
# check master in eta: (cosh2eta - k cosh eta)/(2 sin psi sinh eta) equals (2-cos^2 l - k cos l)/(sin psi sin 2l) with cosh eta = 1/cos l
l = sp.symbols('l', positive=True)
e1 = (2 / sp.cos(l)**2 - 1 - k / sp.cos(l)) / (2 * sp.tan(l))
e2 = (2 - sp.cos(l)**2 - k * sp.cos(l)) / sp.sin(2 * l)
print('eta form == latitude form :', sp.simplify(e1 - e2) == 0)

# ---------------------------------------------------------------- (d) elimination: link to paper's Q(mu,y)
Cq = sp.symbols('Cq', positive=True)  # Cq = c^2
# c(2c^2-3) = -k  => Cq (2Cq-3)^2 = k^2 = cos^2 psi ; 4 sin^2 psi y = (2Cq+1)^2 (Cq-1)
cos2 = sp.expand(((1 - m) * (2 + m) * (1 + 2 * m))**2) / (4 * R**3)
sin2 = 27 * m**2 * (1 + m)**2 / (4 * R**3)
res = sp.resultant(sp.numer(sp.together(Cq * (2 * Cq - 3)**2 - cos2)), sp.numer(sp.together(4 * sin2 * y - (2 * Cq + 1)**2 * (Cq - 1))), Cq)
res = sp.factor(res)
u = m + 1 + 1 / m
Qt = (1728 * (u + 1)**2 * y**3 - 144 * (u + 1) * (8 * u**3 - 9 * u - 9) * y**2
      - 4 * (16 * u**6 - 288 * u**4 - 288 * u**3 - 81 * u**2 - 162 * u - 81) * y + 3 * (4 * u**3 - 3 * u - 3)**2)
Q = sp.factor(sp.expand(sp.together(m**6 * Qt)))
ratio = sp.factor(sp.together(res / Q))
print('Res_C(...) / Q(mu,y) =', ratio)
# P^2 = (2C+1)^2/(4(8C-4C^2-1)) on the critical set
y_alt = (2 * Cq + 1)**2 / (4 * (8 * Cq - 4 * Cq**2 - 1))
y_from = (2 * Cq + 1)**2 * (Cq - 1) / (4 * (1 - Cq * (2 * Cq - 3)**2))
print('P^2 = (2C+1)^2/(4(8C-4C^2-1)) given sin^2psi = 1 - C(2C-3)^2 :', sp.simplify(y_alt - y_from) == 0)
cb2 = sp.simplify(1 / (1 + 4 * y_alt))
print('cos^2 beta_min =', sp.factor(cb2))
# relation between X = cos^2(beta_min) and K = cos^2(psi): eliminate C
X, K = sp.symbols('X K')
rel = sp.factor(sp.resultant(sp.numer(sp.together(X - cb2)), Cq * (2 * Cq - 3)**2 - K, Cq))
print('Res_C: relation(cos^2 beta_min, cos^2 psi) =', rel)

# ---------------------------------------------------------------- (f) sqrt3/2 bound via Cauchy-Schwarz
print('(1+S)^2 - (1-S)(1+3S) =', sp.expand((1 + S)**2 - (1 - S) * (1 + 3 * S)))

# ---------------------------------------------------------------- (g) monotonicity of P_- in psi (envelope)
xx = sp.symbols('xx', positive=True)  # xx = cos(lam*)
cpsi = (3 * xx**2 - 2) / xx**3        # from 3cos^2 l - 2 = cos psi cos^3 l
a_ = 2 - xx**2
b_ = xx
print('b - a cos psi at critical point =', sp.factor(sp.together(b_ - a_ * cpsi)))

# ---------------------------------------------------------------- (h) psi -> 0 blow-up
ps, t = sp.symbols('ps t', positive=True)
Pblow = (sp.cosh(2 * ps * t) - sp.cos(ps) * sp.cosh(ps * t)) / (2 * sp.sin(ps) * sp.sinh(ps * t))
print('lim psi->0 with eta = psi*t :', sp.simplify(sp.limit(Pblow, ps, 0)))
print('ALL EXACT CHECKS PASSED' if ok else 'SOME CHECK FAILED')
