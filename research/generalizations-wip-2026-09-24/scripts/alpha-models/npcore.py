import numpy as np
def P_np(w, alpha):
    w = np.asarray(w, dtype=complex)
    a = np.abs(w-1)**2; b = np.abs(w)**2; c = np.ones_like(a)
    s = alpha/2
    if alpha == 0:
        X1, X2, X3 = b-c, c-a, a-b
    else:
        A, B, C = a**(-s), b**(-s), c**(-s)
        X1 = b*C - c*B; X2 = c*A - a*C; X3 = a*B - b*A
    prod = X1*X2*X3
    t = np.sign(prod)
    p1, p2, p3 = t*X1, t*X2, t*X3
    with np.errstate(all='ignore'):
        G1 = np.sqrt(p2*p3/p1); G2 = p3/G1; G3 = p2/G1
        f = lambda x: x**(-1-s)
        A2 = (np.conj(0-w)*(1-w)).imag
        rek = G3*A2*(f(a)-f(b))/(2*np.pi*c)
        imk = ((G1+G2)*f(c) + G3*(f(b)*(b+c-a) - f(a)*(b-c-a))/(2*c))/(2*np.pi)
        P = np.abs(imk)/(2*np.abs(rek))
    return P, (G1,G2,G3)
