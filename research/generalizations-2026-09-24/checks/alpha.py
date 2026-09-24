# alpha-model: v_j = (i/2pi) sum_k G_k (z_j-z_k)|z_j-z_k|^(-alpha-2). Find self-similar triples, minimize P=|Im k|/(-2 Re k).
import numpy as np, sys
from scipy.optimize import least_squares, minimize
al=float(sys.argv[1]); rng=np.random.default_rng(0)
def res(u,x,g2):
    y,g3,kr,ki=u; Z=np.array([0,1,x+1j*y]); G=np.array([1,g2,g3]); zc=(G@Z)/G.sum(); k=kr+1j*ki; out=[]
    for j in range(3):
        v=sum(G[m]*(Z[j]-Z[m])*abs(Z[j]-Z[m])**(-al-2) for m in range(3) if m!=j)*1j/(2*np.pi)
        out.append(v-k*(Z[j]-zc))
    o=np.array(out); return np.concatenate([o.real,o.imag])
def P_of(x,g2,starts=12):
    best=None
    for _ in range(starts):
        u0=[rng.uniform(-2,2),rng.uniform(-3,3),rng.uniform(-1,1),rng.uniform(-1,1)]
        s=least_squares(res,u0,args=(x,g2),xtol=1e-14,ftol=1e-14,gtol=1e-14)
        y,g3,kr,ki=s.x
        if np.max(abs(s.fun))<1e-11 and kr<-1e-9 and abs(y)>1e-6 and abs(1+g2+g3)>1e-6:
            P=abs(ki)/(-2*kr)
            if best is None or P<best: best=P
    return best
vals=[]
for x in np.linspace(-1.5,2.5,41):
    for g2 in np.concatenate([np.linspace(-3,3,31),[0.05,0.1,0.2,-0.05,-0.1]]):
        p=P_of(x,g2,6)
        if p: vals.append((p,x,g2))
vals.sort(); print('alpha',al,'solutions',len(vals),'lowest P',[round(v[0],5) for v in vals[:5]])
b=np.sqrt(3+al)/(2+al); print('claimed inf',b,' any below?',any(v[0]<b-1e-9 for v in vals))
