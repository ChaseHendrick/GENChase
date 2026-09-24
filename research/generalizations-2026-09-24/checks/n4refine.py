import numpy as np, mpmath as mm, sys
from scipy.optimize import minimize, least_squares
exec(open('n4alpha.py').read().split('best=None')[0].replace("al=float(sys.argv[1]); seed=int(sys.argv[2]); ntry=int(sys.argv[3]); rng=np.random.default_rng(seed)","al=float(sys.argv[1]); rng=np.random.default_rng(1)"))
# rerun the search briefly to get the double-precision minimizer
best=None
for t in range(60):
    x0=np.concatenate([rng.uniform(-1.5,2.5,4),rng.uniform(-2,2,3),[-rng.uniform(0.05,1),rng.uniform(-2,2)]])
    s=least_squares(res,x0,xtol=1e-13,ftol=1e-13,gtol=1e-13)
    if np.max(abs(s.fun))>1e-9 or s.x[7]>=0: continue
    r=minimize(lambda x: x[8]**2/(4*x[7]**2),s.x,constraints=[{'type':'eq','fun':res}],method='SLSQP',bounds=[(None,None)]*7+[(None,-1e-6),(None,None)],options={'maxiter':800,'ftol':1e-14})
    s=least_squares(res,r.x,xtol=1e-15,ftol=1e-15,gtol=1e-15); x=s.x; z,G,k=unpack(x)
    if k.real>=0 or fullres(x)>1e-9 or min(abs(z[i]-z[j]) for i in range(4) for j in range(i+1,4))<1e-3: continue
    P=abs(k.imag)/(2*abs(k.real))
    if best is None or P<best[0]: best=(P,x)
x=best[1]
# high precision KKT: minimize f = b^2/(4 a^2) (a = Re kappa, b = Im kappa) subject to the 6 real equations
mm.mp.dps=80
A=mm.mpf(al); H=mm.mpf(10)**-25
def resm(X):
    z=[mm.mpc(0),mm.mpc(1),mm.mpc(X[0],X[1]),mm.mpc(X[2],X[3])]; G=[mm.mpf(1),X[4],X[5],X[6]]; k=mm.mpc(X[7],X[8])
    zc=sum(g*q for g,q in zip(G,z))/sum(G); out=[]
    for j in (1,2,3):
        v=1j/(2*mm.pi)*sum(G[m]*(z[j]-z[m])*abs(z[j]-z[m])**(-A-2) for m in range(4) if m!=j)
        e=v-k*(z[j]-zc); out+= [e.real,e.imag]
    return out
def f(X): return X[8]**2/(4*X[7]**2)
def shift(X,i,h): Y=list(X); Y[i]+=h; return Y
def jac(X):
    cols=[[(a-b)/(2*H) for a,b in zip(resm(shift(X,i,H)),resm(shift(X,i,-H)))] for i in range(9)]
    return [[cols[i][r] for i in range(9)] for r in range(6)]
def gradf(X): return [(f(shift(X,i,H))-f(shift(X,i,-H)))/(2*H) for i in range(9)]
def KKT(*V):
    X=list(V[:9]); lam=list(V[9:]); g=gradf(X); J=jac(X)
    return [g[i]-sum(lam[r]*J[r][i] for r in range(6)) for i in range(9)]+resm(X)
Xm=[mm.mpf(v) for v in x]
g0=np.array([float(v) for v in gradf(Xm)]); Jd=np.array([[float(v) for v in row] for row in jac(Xm)])
lam0=np.linalg.lstsq(Jd.T,g0,rcond=None)[0]
sol=mm.findroot(KKT,[mm.mpf(v) for v in x]+[mm.mpf(v) for v in lam0],tol=mm.mpf(10)**-60,maxsteps=40)
X=[sol[i] for i in range(9)]; P=mm.sqrt(f(X))
print(f'alpha={al}: P4 = {mm.nstr(P,32)}   KKT residual {mm.nstr(max(abs(v) for v in KKT(*[sol[i] for i in range(15)])),2)}   constraint residual {mm.nstr(max(abs(v) for v in resm(X)),2)}')
print('   G =',[mm.nstr(v,15) for v in [1]+X[4:7]],' kappa =',mm.nstr(mm.mpc(X[7],X[8]),15))
for deg in range(2,17):
    p=mm.findpoly(P**2,deg,maxcoeff=10**7)
    if p: print('   P4^2 satisfies',p); break
else: print('   no integer polynomial of degree <= 16 (coefficients <= 1e7) for P4^2')
open(f'n4_alpha{al}.txt','w').write(f'{mm.nstr(P,40)}\n'+' '.join(mm.nstr(v,40) for v in X)+'\n')
