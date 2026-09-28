import numpy as np
from scipy.optimize import minimize
from ev import S, Df, K, phi, rest
xs = np.linspace(-6, 45, 20001)
Ys = S(xs).T
def Zmat(y, s):
    J = Df(y)
    Iu = J[1,0]/K; Iq = J[1,2:]/K   # I_u, I_q
    gu = J[2:,0]; gx = np.diag(J[2:,2:])
    Z = np.zeros((4,4))
    Z[0,0] = -Iu; Z[0,1:] = -Iq/s; Z[1:,0] = s*gu; Z[1:,1:] = np.diag(gx)
    return Z
def Lam(ls):
    s = np.exp(ls)
    return max(np.linalg.eigvalsh((Zmat(y, s)+Zmat(y, s).T)/2).max() for y in Ys[::20])
r = minimize(Lam, np.zeros(3), method='Nelder-Mead', options={'maxiter':600})
s = np.exp(r.x); print('best s', s, 'Lambda', r.fun)
print('Lambda full', max(np.linalg.eigvalsh((Zmat(y, s)+Zmat(y, s).T)/2).max() for y in Ys))
# sup norms along pulse
J = np.array([Df(y) for y in Ys])
print('max |I_q|', np.abs(J[:,1,2:]/K).max(axis=0), 'max phi g_u', np.abs(J[:,2:,0]).max(axis=0), 'min kappa', (-np.array([np.diag(j[2:,2:]) for j in J])).min(axis=0))
print('I_u range', (J[:,1,0]/K).min(), (J[:,1,0]/K).max())
