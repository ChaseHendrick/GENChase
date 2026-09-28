import numpy as np, math
from scipy.interpolate import CubicSpline
from scipy.integrate import solve_ivp
d = np.load('pulse_18.5_10.613.npz')
t, Y, K, rest, phi, EL = d['t'], d['Y'], float(d['K']), d['rest'], float(d['phi']), float(d['EL'])
# remove duplicate t
keep = np.concatenate([[True], np.diff(t) > 0]); t, Y = t[keep], Y[:, keep]
S = CubicSpline(t, Y, axis=1)

def psi(x):
    return 1 - x/2 + x*x/12 if abs(x) < 1e-6 else x/math.expm1(x)
def dpsi(x):
    if abs(x) < 1e-4: return -0.5 + x/6
    e = math.exp(x); return ((e-1) - x*e)/(e-1)**2

def rates_d(u):
    x1, x2 = (25-u)/10, (10-u)/10
    am, dam = psi(x1), -dpsi(x1)/10
    an, dan = 0.1*psi(x2), -0.1*dpsi(x2)/10
    bm = 4*math.exp(-u/18); dbm = -bm/18
    bn = 0.125*math.exp(-u/80); dbn = -bn/80
    ah = 0.07*math.exp(-u/20); dah = -ah/20
    e = math.exp((30-u)/10); bh = 1/(e+1); dbh = e/10/(e+1)**2
    return (am, bm, an, bn, ah, bh), (dam, dbm, dan, dbn, dah, dbh)

def Df(y, K=K):
    u, w, m, n, h = y
    (am, bm, an, bn, ah, bh), (dam, dbm, dan, dbn, dah, dbh) = rates_d(u)
    J = np.zeros((5, 5))
    J[0, 1] = 1
    Iu = 120*m**3*h + 36*n**4 + 0.3
    Im = 360*m**2*h*(u-115); In = 144*n**3*(u+12); Ih = 120*m**3*(u-115)
    J[1] = [K*Iu, K, K*Im, K*In, K*Ih]
    J[2, 0] = phi*(dam*(1-m) - dbm*m); J[2, 2] = -phi*(am+bm)
    J[3, 0] = phi*(dan*(1-n) - dbn*n); J[3, 3] = -phi*(an+bn)
    J[4, 0] = phi*(dah*(1-h) - dbh*h); J[4, 4] = -phi*(ah+bh)
    return J
E = np.zeros((5, 5)); E[1, 0] = K; E[2, 2] = E[3, 3] = E[4, 4] = -1
A0 = Df(rest)

def Ainf(lam): return A0 + lam*E

def eig_u(lam):
    w, V = np.linalg.eig(Ainf(lam))
    i = int(np.argmax(w.real))
    wl, VL = np.linalg.eig(Ainf(lam).T)
    j = int(np.argmin(abs(wl - w[i])))
    v = V[:, i]/V[0, i]; l = VL[:, j]; l = l/(l@v)
    return w[i], v, l, w

XL, XR = -6.0, 45.0
def evans(lam, xm=3.0, rtol=1e-10):
    nu, v, l, _ = eig_u(lam)
    f1 = lambda s, z: (Df(S(s)) + lam*E - nu*np.eye(5)) @ z
    f2 = lambda s, z: -(Df(S(s)) + lam*E - nu*np.eye(5)).T @ z
    a = solve_ivp(f1, (XL, xm), v.astype(complex), method='DOP853', rtol=rtol, atol=1e-14)
    b = solve_ivp(f2, (XR, xm), l.astype(complex), method='DOP853', rtol=rtol, atol=1e-14)
    return b.y[:, -1] @ a.y[:, -1]
if __name__ == '__main__':
    print('K', K, 'rest', rest)
    print('eig rest', np.linalg.eigvals(A0))
    for lam in [0, 1e-3, -1e-3, 0.5, 1j, 2, 5+5j]:
        print(lam, evans(lam), evans(lam, xm=6.0))
