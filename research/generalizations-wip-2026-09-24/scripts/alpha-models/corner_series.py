# Double series of Re kappa, Im kappa near the coalescence corner w = rho e^{i psi}, with T = rho^alpha
import sympy as sp
rho, T, s, psi = sp.symbols('rho T s psi', positive=True)
cs, sn = sp.symbols('c_s s_n')  # cos psi, sin psi
a = 1 - 2*rho*cs + rho**2
am = a**(-s)
X1 = T*rho**2 - 1
X2 = T*(am - a)
X3 = a - T*rho**2*am
G1 = X2/X1; G3 = X2/X3
twopiRe = (am - a)*sn*(T*rho**2*a**(-1-s) - 1)/(rho*(a - T*rho**2*am))
twopiIm = G1 + 1 + G3*(2*cs/(T*rho) - a**(-1-s)*(rho**2 - 1 - a))/2
def ser(expr, nr=3, nT=2):
    # expand in rho to order nr, then in T to order nT
    e = sp.series(expr, rho, 0, nr).removeO()
    e = sp.expand(e)
    out = 0
    for k in range(nr):
        ck = e.coeff(rho, k)
        ck = sp.series(ck, T, 0, nT).removeO()
        out += sp.simplify(ck)*rho**k
    return sp.expand(out)
Re_s = ser(twopiRe)
Im_s = ser(twopiIm)
print('2pi Re kappa ~'); 
for k in range(3):
    for j in range(2):
        print('  rho^%d T^%d :'%(k,j), sp.factor(sp.expand(Re_s.coeff(rho,k)).coeff(T,j)))
print('2pi Im kappa ~');
for k in range(3):
    for j in range(2):
        print('  rho^%d T^%d :'%(k,j), sp.factor(sp.expand(Im_s.coeff(rho,k)).coeff(T,j)))
