"""High-precision scattering constant C along a branch of W^u(w_c) (reduced shape flow, mpmath odefun)."""
import sys, time
from core import *

def grad_H(mu, w):
    G = gammas(mu)
    c1 = -G[0]*G[2]/(4*mp.pi); c2 = -G[1]*G[2]/(4*mp.pi)
    # H = c1 ln|w|^2 + c2 ln|w-1|^2 ; grad as complex number: 2 c1 w/|w|^2 + 2 c2 (w-1)/|w-1|^2
    return 2*c1*w/abs(w)**2 + 2*c2*(w-1)/abs(w-1)**2

def grad_g(mu, w):
    return 2*mu - 2*(1+mu)*w

def start_point(mu, wc, side, eps0):
    """w on {H = H(wc)} with g(w) = side*eps0, near wc."""
    h = H_of(mu, wc)
    # initial guess: wc + t * n where n = grad g direction (normal to circle)
    n = grad_g(mu, wc); n = n/abs(n)
    # tangent of level curve at wc: perpendicular to grad H
    gh = grad_H(mu, wc); tH = 1j*gh/abs(gh)
    # choose direction along level curve such that g increases with side
    dg = mp.re(mp.conj(grad_g(mu, wc))*tH)
    t = side*eps0/dg
    w = wc + t*tH
    for _ in range(100):
        F1 = H_of(mu, w) - h; F2 = g_of(mu, w) - side*eps0
        a = grad_H(mu, w); b = grad_g(mu, w)
        # Jacobian rows: [Re a, Im a], [Re b, Im b]
        det = a.real*b.imag - a.imag*b.real
        dx = (F1*b.imag - F2*a.imag)/det
        dy = (a.real*F2 - b.real*F1)/det
        w = w - mp.mpc(dx, dy)
        if abs(dx)+abs(dy) < mp.mpf(10)**(-mp.mp.dps+3): break
    return w, h

def run_branch(mu, th_c, side, eps0, dps=30, chunk=20):
    mp.mp.dps = dps
    mu = mp.mpf(mu); th_c = mp.mpf(th_c); eps0 = mp.mpf(eps0)
    wc = w_of_theta(mu, th_c)
    w0, h = start_point(mu, wc, side, eps0)
    def F(t, y):
        w = mp.mpc(y[0], y[1]); a, b = ab(mu, w)
        return [b.real, b.imag, a.imag, 2*a.real]
    sol = mp.odefun(F, 0, [w0.real, w0.imag, mp.mpf(0), mp.mpf(0)])
    gabs = lambda t: abs(g_of(mu, mp.mpc(sol(t)[0], sol(t)[1])))
    # march until |g| rises then falls below eps0
    t = mp.mpf(0); peaked = False; gprev = eps0
    while True:
        t2 = t + chunk
        gv = gabs(t2)
        if gv > 10*eps0: peaked = True
        if peaked and gv < eps0:
            tend = mp.findroot(lambda s: gabs(s) - eps0, (t, t2), solver='anderson')
            break
        t = t2
        if t > 1e5: raise RuntimeError('no exit')
    y = sol(tend)
    wend = mp.mpc(y[0], y[1])
    Phi = y[2]
    # exit theta on circle with H = h
    e = (mu/(1+mu) - wend)*(1+mu)/mp.sqrt(1+mu+mu**2)
    th_out = mp.findroot(lambda s: H_of(mu, w_of_theta(mu, s)) - h, mp.arg(e))
    a_in, _ = ab(mu, wc); a_out, _ = ab(mu, w_of_theta(mu, th_out))
    Pin = a_in.imag/(-2*a_in.real); Pout = a_out.imag/(2*a_out.real)
    C = Phi - (Pin+Pout)*mp.log(1/eps0)
    return dict(Phi=Phi, C=C, Pin=Pin, Pout=Pout, th_out=th_out, tend=tend, wend=wend, h=h, lnu2=y[3], g_end=g_of(mu, wend))

if __name__ == '__main__':
    mu = sys.argv[1]; th = sys.argv[2]; side = int(sys.argv[3])
    for e0 in ['1e-10', '1e-14']:
        t0 = time.time()
        r = run_branch(mu, th, side, e0)
        print('mu', mu, 'th_c', th, 'side', side, 'eps0', e0, 'Pin', mp.nstr(r['Pin'], 15), 'Pout', mp.nstr(r['Pout'], 15), 'th_out', mp.nstr(r['th_out'], 15),
              'C', mp.nstr(r['C'], 15), 'Phi', mp.nstr(r['Phi'], 15), 'time %.0fs' % (time.time()-t0), flush=True)
