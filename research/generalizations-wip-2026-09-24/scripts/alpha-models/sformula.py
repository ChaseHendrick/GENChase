# Check P = |sum_cyc r_i^2 coth(beta ln(r_k/r_j))| / (8 Area), beta = 1 + alpha/2, against Biot-Savart,
# and against the paper's Euler values (mu = 1/2 minima, Gotoda positions).
from core import *
import random
mp.mp.dps = 50
def P_S(z, alpha):
    beta = 1 + mp.mpf(alpha)/2
    r1, r2, r3 = abs(z[1]-z[2]), abs(z[0]-z[2]), abs(z[0]-z[1])
    c = lambda x: mp.coth(beta*x)
    S = r1**2*c(mp.log(r3/r2)) + r2**2*c(mp.log(r1/r3)) + r3**2*c(mp.log(r2/r1))
    A = abs(((z[1]-z[0])*mp.conj(z[2]-z[0])).imag)/2
    return abs(S)/(8*A)
random.seed(7)
worst = 0
for alpha in [0, mp.mpf('0.2'), mp.mpf('0.7'), 1, mp.mpf('1.3'), 2, 5]:
    for _ in range(30):
        w = mp.mpc(random.uniform(-2,3), random.uniform(0.01,2))
        k, res, G, zc = kappa_bs(w, alpha)
        Pbs = abs(k.imag)/(2*abs(k.real))
        z = [mp.mpc(0), mp.mpc(1), w]
        d = abs(P_S(z, alpha) - Pbs)/Pbs
        worst = max(worst, d)
print('max rel diff S-formula vs Biot-Savart over 210 random shapes:', mp.nstr(worst, 3))
# Euler check vs paper: Gotoda positions for mu=1/2, P(theta) closed form and minima
mu = mp.mpf(1)/2; R = 1 + mu + mu**2
def gotoda(theta):
    e = mp.expj(-theta)
    return [mu*(1+mp.sqrt(R)*e)/(1+mu)**2, (mu - mp.sqrt(R)*e)/(1+mu)**2, mp.mpc(1)]
def Ppaper(theta):
    C = mp.sqrt(R)*mp.cos(theta)
    N = 2*(1+mu**2)*R + (1-mu)*(2+mu+2*mu**2)*C - 2*mu*C**2
    M = 1 - mu + 2*C
    return abs(N/(2*mu*mp.sqrt(R)*M*mp.sin(theta)))
mx = 0
for th in [mp.mpf(i)/37 for i in range(1, 230)]:
    if abs(mp.sin(th)) < 1e-3: continue
    z = gotoda(th)
    mx = max(mx, abs(P_S(z, 0) - Ppaper(th))/Ppaper(th))
print('Euler: max rel diff S-formula vs paper eq (Ptheta) on 229 thetas:', mp.nstr(mx, 3))
Pm = mp.findroot(lambda th: mp.diff(lambda t: P_S(gotoda(t),0), th), mp.acos(-0.9243893679))
print('mu=1/2 min on A_- via S-formula:', mp.nstr(P_S(gotoda(Pm),0), 25), ' paper: 1.0647059762712043')
