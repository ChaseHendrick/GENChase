"""Near-collapse of two concentric n-gons (symmetric perturbation): rotation of z (vertex of the
positive ring) between the two instants with |z| = 1, against (P_in + P_out) ln(1/|L|)."""
import numpy as np, sys
from scipy.integrate import solve_ivp
n = int(sys.argv[1])
x = (n+np.sqrt(2*n-1))/(n-1)
def rhs(t, y):
    z = y[0]+1j*y[1]; zt = y[2]+1j*y[3]
    cz = (x*(n-1)/(2*z) - n*z**(n-1)/(z**n-zt**n))/(2j*np.pi)
    czt = (-(n-1)/(2*zt) + x*n*zt**(n-1)/(zt**n-z**n))/(2j*np.pi)
    dz = np.conj(cz); dzt = np.conj(czt)
    return [dz.real, dz.imag, dzt.real, dzt.imag, (dz/z).imag]
def Pring(th):
    rho = x**(n/2); K = (n-1)*x*(rho+1/rho)/2 - n/rho
    return (K - np.sqrt(2*n-1)*np.cos(n*th))/(2*n*np.sin(n*th)), K
K = Pring(0.1)[1]
th = np.arccos(np.sqrt(2*n-1)/K)/n   # minimizer
P = Pring(th)[0]
print('n=%d x_n=%.6f theta*=%.6f P=F_n=%.9f' % (n, x, th, P))
prev = {}
for d in [1e-3, 1e-4, 1e-5, 1e-6, 1e-7]:
    for sg in [1, -1]:
        zt0 = np.sqrt(x)*np.exp(1j*th)*(1+sg*d)
        L = n*(x*1 - abs(zt0)**2)
        def ev(t, y): return y[0]**2+y[1]**2 - 1.0
        ev.terminal = True; ev.direction = 1
        sol = solve_ivp(rhs, [0, 1e3], [1, 0, zt0.real, zt0.imag, 0], method='DOP853', rtol=1e-13, atol=1e-16, events=ev)
        zf = sol.y[0,-1]+1j*sol.y[1,-1]; ztf = sol.y[2,-1]+1j*sol.y[3,-1]
        thf = np.angle(ztf/zf)
        Phi = sol.y[4,-1]; s = int(np.sign(L))
        inc = Phi - prev[s] if s in prev else np.nan; prev[s] = Phi
        print('delta=%.0e L=%+.3e Phi=%.8f exit rel.angle=%.6f (mirror %.6f)  dPhi/decade=%.6f  (2P ln10=%.6f)  Phi-2P ln(1/|L|)=%.6f' % (
            sg*d, L, Phi, thf, -th, inc, 2*P*np.log(10), Phi-2*P*np.log(1/abs(L))))
