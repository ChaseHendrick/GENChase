# Parametrize near the dipole limit directly: strong vortex G1=1 at 0; dipole at distance 1 with small separation rho.
import numpy as np, sys
from scipy.optimize import least_squares, minimize
al=float(sys.argv[1]); rng=np.random.default_rng(3)
def res(u,rho,th):
    g2,g3,kr,ki,d=u
    Z=np.array([0, 1+0j, 1+rho*np.exp(1j*th)*d]); G=np.array([1,g2,g3]); zc=(G@Z)/G.sum(); k=kr+1j*ki; o=[]
    for j in range(3):
        v=sum(G[m]*(Z[j]-Z[m])*abs(Z[j]-Z[m])**(-al-2) for m in range(3) if m!=j)*1j/(2*np.pi); o.append(v-k*(Z[j]-zc))
    o=np.array(o); return np.concatenate([o.real,o.imag])
def P(rho,th):
    best=np.inf
    for _ in range(8):
        u0=[rng.uniform(0.01,1)*rho**al*0+rng.uniform(1e-3,.5),-rng.uniform(1e-3,.5),rng.uniform(-1,0),rng.uniform(-1,1),1]
        s=least_squares(lambda u:np.append(res(u,rho,th),u[4]-1),u0,xtol=1e-15,ftol=1e-15,gtol=1e-15)
        g2,g3,kr,ki,d=s.x
        if np.max(abs(s.fun))<1e-10 and kr<0: best=min(best,abs(ki)/(-2*kr))
    return best
for rho in [0.1,0.03,0.01,0.003]:
    ths=np.linspace(0.05,np.pi-0.05,60); ps=[P(rho,t) for t in ths]; i=int(np.argmin(ps))
    r=minimize(lambda t:P(rho,t[0]),[ths[i]],method='Nelder-Mead',options={'xatol':1e-6,'fatol':1e-10})
    print('alpha',al,'rho',rho,'min P',round(r.fun,7))
print('claimed inf',np.sqrt(3+al)/(2+al))
