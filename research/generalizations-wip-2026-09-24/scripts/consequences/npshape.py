import numpy as np
from scipy.integrate import solve_ivp

def G(mu): return np.array([1.0, mu, -mu/(1+mu)])

def vel3(mu, w):
    g1,g2,g3 = G(mu)
    c = 1/(2j*np.pi)
    v1 = np.conj(c*(-g2 - g3/w))
    v2 = np.conj(c*(g1 + g3/(1-w)))
    v3 = np.conj(c*(g1/w + g2/(w-1)))
    return v1,v2,v3

def ab(mu, w):
    v1,v2,v3 = vel3(mu,w)
    a = v2 - v1
    b = (v3 - v1) - w*a
    return a, b

def gfun(mu, w): return 1 + 2*mu*w.real - (1+mu)*abs(w)**2
def Hfun(mu, w):
    g1,g2,g3 = G(mu)
    return -(g1*g3*np.log(abs(w)**2) + g2*g3*np.log(abs(w-1)**2))/(4*np.pi)
def w_of_theta(mu, th):
    R = 1+mu+mu*mu
    return mu/(1+mu) - np.sqrt(R)/(1+mu)*np.exp(1j*th)
def theta_of_w(mu, w):
    R = 1+mu+mu*mu
    e = (mu/(1+mu) - w)*(1+mu)/np.sqrt(R)
    return np.angle(e) % (2*np.pi)
def theta0(mu):
    R = 1+mu+mu*mu
    return np.arccos((mu-1)/(2*np.sqrt(R)))
def Pw(mu, w):
    a,_ = ab(mu,w); return a.imag/(-2*a.real)

def jac(mu, w, h=1e-6):
    _,b0 = ab(mu,w)
    _,bx = ab(mu,w+h); _,bxm = ab(mu,w-h)
    _,by = ab(mu,w+1j*h); _,bym = ab(mu,w-1j*h)
    dx = (bx-bxm)/(2*h); dy = (by-bym)/(2*h)
    return np.array([[dx.real, dy.real],[dx.imag, dy.imag]])

def branch(mu, th_c, sign, delta=1e-9, tmax=1e4):
    """Follow a branch of the unstable manifold of the collapsing shape w_c; returns exit info."""
    wc = w_of_theta(mu, th_c)
    J = jac(mu, wc)
    ev, V = np.linalg.eig(J)
    i = np.argmax(ev.real)
    v = V[:, i].real; v = v/np.linalg.norm(v)
    w0 = wc + sign*delta*(v[0]+1j*v[1])
    # sign convention: choose sign of g
    def rhs(t, y):
        w = y[0]+1j*y[1]
        a,b = ab(mu,w)
        return [b.real, b.imag, a.imag, 2*a.real]
    def ev_back(t, y):
        w = y[0]+1j*y[1]
        return abs(gfun(mu,w)) - abs(gfun(mu,w0))
    ev_back.terminal = True; ev_back.direction = -1
    sol = solve_ivp(rhs, [0, tmax], [w0.real, w0.imag, 0.0, 0.0], rtol=1e-12, atol=1e-15, events=ev_back, dense_output=False, max_step=np.inf)
    wend = sol.y[0,-1]+1j*sol.y[1,-1]
    return dict(w0=w0, g0=gfun(mu,w0), wend=wend, th_end=theta_of_w(mu,wend), phi=sol.y[2,-1], lnu2=sol.y[3,-1], lam=ev[i].real, status=sol.status, tend=sol.t[-1],
                gmax=None)

if __name__ == '__main__':
    mu = 0.5
    t0 = theta0(mu)
    print('theta0', t0, 'H(0)', Hfun(mu, w_of_theta(mu,1e-9)), 'H(pi)', Hfun(mu, w_of_theta(mu,np.pi)))
    for th in [0.3, 0.8, 1.2, 1.6, np.pi+0.2, np.pi+0.3931, np.pi+0.8, np.pi+1.2, 2*np.pi-t0-0.1]:
        wc = w_of_theta(mu, th)
        for s in [+1, -1]:
            r = branch(mu, th, s)
            print('th_c=%.4f P_in=%.6f H=%.6f  side g0=%+.1e -> th_out=%.6f (mirror %.6f) P_out=%.6f H_out=%.6f  status=%d lam=%.4f' % (
                th, Pw(mu,wc), Hfun(mu,wc), r['g0'], r['th_end'], (2*np.pi-th)%(2*np.pi), Pw(mu, w_of_theta(mu, r['th_end'])), Hfun(mu, r['wend']), r['status'], r['lam']))
