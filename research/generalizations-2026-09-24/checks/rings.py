# Central vortex + two n-gons. Velocities are linear in circulations, so solve kappa_1 = kappa_2 for (G2, g0) directly.
import numpy as np
def kap(n,r,a,G2,g0):
    w=np.exp(2j*np.pi*np.arange(n)/n)
    Z=np.concatenate([w, r*w*np.exp(1j*a/n), [0]]); G=np.concatenate([np.ones(n), G2*np.ones(n), [g0]])
    out=[]
    for j in (0,n):
        d=Z[j]-np.delete(Z,j); v=np.conj(np.sum(np.delete(G,j)/d)/(2j*np.pi)); out.append(v/Z[j])
    return np.array(out)
def solve(n,r,a):
    base=kap(n,r,a,0,0); e1=kap(n,r,a,1,0)-base; e2=kap(n,r,a,0,1)-base
    f=lambda k: k[0]-k[1]
    A=np.array([[f(e1).real,f(e2).real],[f(e1).imag,f(e2).imag]]); b=-np.array([f(base).real,f(base).imag])
    G2,g0=np.linalg.solve(A,b); k=kap(n,r,a,G2,g0)
    return G2,g0,k[0],abs(k[0]-k[1])
# rational example n=2, r=2
a=np.arccos(8/35); G2,g0,k,res=solve(2,2.0,a)
print('n=2 r=2: G2',G2,'(-1/X=',-1/4,') gamma',g0,'(-1/24=',-1/24,') P',abs(k.imag)/(-2*k.real),'claim',5*np.sqrt(129)/32,'res',res)
rng=np.random.default_rng(1); s3=np.sqrt(3)/2
for n in range(2,9):
    best=9; arg=None
    for r in np.concatenate([1+np.logspace(-4,0.5,400), 1-np.logspace(-4,-0.05,400)]):
        for a in np.linspace(1e-3,np.pi-1e-3,600):
            G2,g0,k,res=solve(n,r,a)
            if k.real<0 and res<1e-9:
                P=abs(k.imag)/(-2*k.real)
                if P<best: best,arg=P,(r,a,g0)
    print(n,'min P found',round(best,6),'> sqrt3/2?',best>s3,'at r,a,gamma',np.round(arg,5))
