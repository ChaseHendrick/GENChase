"""Kernel-smoothing regularization (Gallay-Sverak (5.21)-(5.22) form): u.dot uses |z|^2+eps^2.
Start exactly on a collapsing configuration (L = 0), measure the rotation of u = z2 - z1 between
the two instants with |u| = |u(0)|, for eps -> 0."""
import numpy as np, sys
from scipy.integrate import solve_ivp
from npshape import G, w_of_theta, Pw, theta_of_w
from direct_bs import paper_pos

def rhs_eps(Gm, eps):
    def rhs(t, y):
        z = y[0:3] + 1j*y[3:6]
        v = np.zeros(3, complex)
        for j in range(3):
            for k in range(3):
                if k != j:
                    d = z[j]-z[k]
                    v[j] += 1j*Gm[k]/(2*np.pi)*d/(abs(d)**2+eps**2)
        u = z[1]-z[0]; du = v[1]-v[0]
        return np.concatenate([v.real, v.imag, [(du/u).imag]])
    return rhs

def run(mu, th, eps):
    Gm = G(mu); z = paper_pos(mu, th)
    u0 = z[1]-z[0]
    y0 = np.concatenate([z.real, z.imag, [0.0]])
    def ev(t, y):
        zz = y[0:3]+1j*y[3:6]; return abs(zz[1]-zz[0])**2 - abs(u0)**2
    ev.terminal = True; ev.direction = 1
    sol = solve_ivp(rhs_eps(Gm, eps), [0, 100], y0, method='DOP853', rtol=1e-12, atol=1e-15, events=ev)
    zf = sol.y[0:3,-1]+1j*sol.y[3:6,-1]
    wf = (zf[2]-zf[0])/(zf[1]-zf[0])
    return sol.y[6,-1], abs(u0), theta_of_w(mu, wf), sol.t[-1], sol.status

if __name__ == '__main__':
    mu = float(sys.argv[1]); th = float(sys.argv[2])
    P = Pw(mu, w_of_theta(mu, th))
    prev = None
    for eps in [1e-2, 1e-3, 1e-4, 1e-5]:
        Phi, l, thf, tf, st = run(mu, th, eps)
        line = 'eps=%.0e Phi=%.8f  th_final=%.5f (mirror %.5f)  t=%.4f st=%d  Phi-4P ln(l/eps)=%.6f' % (eps, Phi, thf, (2*np.pi-th)%(2*np.pi), tf, st, Phi-4*P*np.log(l/eps))
        if prev is not None: line += '  dPhi/decade=%.6f (4P ln10=%.6f)' % (Phi-prev, 4*P*np.log(10))
        prev = Phi
        print(line, flush=True)
