"""Independent check: integrate the full Biot-Savart equations for perturbed collapse configurations
and measure the rotation angle of u = z2 - z1 between the two instants with |u| = |u(0)|."""
import numpy as np
from scipy.integrate import solve_ivp
from npshape import G, w_of_theta, theta0, Pw, gfun, Hfun

def bs_rhs(Gm):
    def rhs(t, y):
        z = y[0:3] + 1j*y[3:6]
        v = np.zeros(3, complex)
        for j in range(3):
            s = 0j
            for k in range(3):
                if k != j: s += Gm[k]/(z[j]-z[k])
            v[j] = np.conj(s/(2j*np.pi))
        u = z[1]-z[0]; du = v[1]-v[0]
        return np.concatenate([v.real, v.imag, [(du/u).imag]])
    return rhs

def paper_pos(mu, th):
    R = 1+mu+mu*mu; sR = np.sqrt(R); e = np.exp(-1j*th)
    return np.array([mu*(1+sR*e)/(1+mu)**2, (mu-sR*e)/(1+mu)**2, 1+0j])

def run(mu, th, delta, psi):
    Gm = G(mu)
    z = paper_pos(mu, th)
    z[2] += delta*np.exp(1j*psi)
    zc = (Gm*z).sum()/Gm.sum()
    L = (Gm*abs(z-zc)**2).sum()
    u0 = z[1]-z[0]
    w0 = (z[2]-z[0])/u0
    rhs = bs_rhs(Gm)
    y0 = np.concatenate([z.real, z.imag, [0.0]])
    def ev(t, y):
        zz = y[0:3]+1j*y[3:6]; return abs(zz[1]-zz[0])**2 - abs(u0)**2
    ev.terminal = True; ev.direction = 1
    # first check that |u| decreases initially
    sol = solve_ivp(rhs, [0, 50], y0, method='DOP853', rtol=1e-13, atol=1e-16, events=ev)
    Phi = sol.y[6, -1]
    zf = sol.y[0:3, -1] + 1j*sol.y[3:6, -1]
    zcf = (Gm*zf).sum()/Gm.sum(); Lf = (Gm*abs(zf-zcf)**2).sum()
    return dict(Phi=Phi, L=L, eps=abs(gfun(mu, w0)), u0=abs(u0), t=sol.t[-1], status=sol.status, Ldrift=abs(Lf-L)/abs(L), Lsign=np.sign(L))

if __name__ == '__main__':
    import sys
    mu = float(sys.argv[1]); th = float(sys.argv[2]); psi = float(sys.argv[3]) if len(sys.argv) > 3 else 0.7
    R = 1+mu+mu*mu
    Pin = Pw(mu, w_of_theta(mu, th))
    for delta in [1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8]:
        for sgn in [1, -1]:
            r = run(mu, th, sgn*delta, psi)
            print('delta=%+.0e L=%+.3e eps=%.3e Phi=%.10f  t*=%.6f status=%d Ldrift=%.1e' % (sgn*delta, r['L'], r['eps'], r['Phi'], r['t'], r['status'], r['Ldrift']), flush=True)
