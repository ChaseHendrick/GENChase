"""Near-collapse scattering: rotation of u = z2 - z1 along branches of W^u(w_c).
Shape-flow computation (reduced) and direct Biot-Savart integration (independent)."""
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq
from npshape import *

def branch_full(mu, th_c, sign, eps0=1e-10):
    """Integrate shape flow from |g|=eps0 near w_c (on the level set H=H(w_c)) to |g|=eps0 near exit.
    Returns Phi(eps0), exit theta, P_in, P_out, C estimate."""
    wc = w_of_theta(mu, th_c)
    h = Hfun(mu, wc)
    J = jac(mu, wc)
    ev, V = np.linalg.eig(J)
    i = np.argmax(ev.real)
    v = V[:, i].real; v = v/np.linalg.norm(v)
    d = v[0]+1j*v[1]
    # point on the H=h level curve near wc on the requested side, with |g| = eps0
    # move along d, then project to H=h by Newton along grad H
    def proj(w):
        for _ in range(50):
            eps=1e-7
            gx=(Hfun(mu,w+eps)-Hfun(mu,w-eps))/(2*eps); gy=(Hfun(mu,w+1j*eps)-Hfun(mu,w-1j*eps))/(2*eps)
            gr=gx+1j*gy
            dw=-(Hfun(mu,w)-h)/abs(gr)**2*gr
            w=w+dw
            if abs(dw)<1e-17: break
        return w
    # find s such that |g(proj(wc + sign*s*d))| = eps0
    f = lambda s: abs(gfun(mu, proj(wc+sign*s*d))) - eps0
    s1 = 1e-3
    while f(s1) < 0: s1 *= 2
    s = brentq(f, 0.0, s1, xtol=1e-20, rtol=1e-15)
    w0 = proj(wc+sign*s*d)
    def rhs(t, y):
        w = y[0]+1j*y[1]
        a,b = ab(mu,w)
        return [b.real, b.imag, a.imag, 2*a.real]
    def ev_back(t, y):
        w = y[0]+1j*y[1]
        return abs(gfun(mu,w)) - eps0
    ev_back.terminal = True; ev_back.direction = -1
    sol = solve_ivp(rhs, [0, 1e6], [w0.real, w0.imag, 0.0, 0.0], method='DOP853', rtol=1e-13, atol=1e-16, events=ev_back)
    wend = sol.y[0,-1]+1j*sol.y[1,-1]
    th_out = theta_of_w(mu, wend)
    # exact exit: point on circle with H = h near th_out
    th_out_exact = brentq(lambda t: Hfun(mu, w_of_theta(mu,t)) - h, th_out-1e-3, th_out+1e-3, xtol=1e-15)
    Pin = Pw(mu, wc); Pout = -Pw(mu, w_of_theta(mu, th_out_exact))
    Phi = sol.y[2,-1]
    return dict(Phi=Phi, th_out=th_out_exact, Pin=Pin, Pout=Pout, C=Phi-(Pin+Pout)*np.log(1/eps0), g0=gfun(mu,w0), w0=w0, h=h, lnu2=sol.y[3,-1])

if __name__ == '__main__':
    for mu in [0.5, 1.0, 0.2]:
        t0 = theta0(mu)
        # minimizer of P on A- (and A+) by scanning
        ths = np.linspace(np.pi+1e-3, 2*np.pi-t0-1e-3, 20001)
        Ps = [Pw(mu, w_of_theta(mu,t)) for t in ths]
        thm = ths[int(np.argmin(Ps))]
        for th in [thm, np.pi+0.9*(np.pi-t0), 0.5*t0]:
            for sgn in [+1,-1]:
                out=[]
                for e0 in [1e-8, 1e-10, 1e-12]:
                    r = branch_full(mu, th, sgn, e0)
                    out.append(r['C'])
                print('mu=%.2f th_c=%.6f side=%+d Pin=%.8f th_out=%.6f Pout=%.8f  C(1e-8,1e-10,1e-12)= %.9f %.9f %.9f' % (mu, th, sgn, r['Pin'], r['th_out'], r['Pout'], *out))
