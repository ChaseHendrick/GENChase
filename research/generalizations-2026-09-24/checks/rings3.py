# Three concentric regular n-gons (radii 1, r2, r3; twists a2/n, a3/n) plus a central vortex g0.
# Velocities are linear in circulations (1, g2, g3, g0), so kappa_1 = kappa_2 = kappa_3 is 4 real linear equations in
# (g2, g3, g0); a solution exists where the 4x4 augmented determinant vanishes, which fixes r3 given (r2, a2, a3).
import numpy as np, sys
from scipy.optimize import brentq, minimize
n=int(sys.argv[1]); rng=np.random.default_rng(int(sys.argv[2]) if len(sys.argv)>2 else 0)
w=np.exp(2j*np.pi*np.arange(n)/n)
def parts(r2,a2,r3,a3):
    Z=np.concatenate([w, r2*w*np.exp(1j*a2/n), r3*w*np.exp(1j*a3/n), [0]])
    grp=np.append(np.repeat([0,1,2],n),3)
    E=[]
    for circ in range(4):   # contribution of ring 1 (unit), ring 2, ring 3, centre to kappa at vortices 0, n, 2n
        G=np.zeros(3*n+1)
        if circ<3: G[grp==circ]=1
        else: G[-1]=1
        k=[]
        for j in (0,n,2*n):
            d=Z[j]-np.delete(Z,j); v=np.conj(np.sum(np.delete(G,j)/d)/(2j*np.pi)); k.append(v/Z[j])
        E.append(np.array(k))
    return E  # kappa = E0 + g2 E1 + g3 E2 + g0 E3
def system(r2,a2,r3,a3):
    E=parts(r2,a2,r3,a3); f=lambda e: np.array([(e[0]-e[1]).real,(e[0]-e[1]).imag,(e[0]-e[2]).real,(e[0]-e[2]).imag])
    A=np.stack([f(E[1]),f(E[2]),f(E[3])],1); b=-f(E[0]); return A,b,E
def det(r3,r2,a2,a3):
    A,b,_=system(r2,a2,r3,a3); return np.linalg.det(np.column_stack([A,b]))
def P_at(r2,a2,r3,a3):
    A,b,E=system(r2,a2,r3,a3); x,res,rk,_=np.linalg.lstsq(A,b,rcond=None)
    k=E[0]+x[0]*E[1]+x[1]*E[2]+x[2]*E[3]; kk=[E[0][i]+x[0]*E[1][i]+x[1]*E[2][i]+x[2]*E[3][i] for i in range(3)]
    spread=max(abs(kk[i]-kk[0]) for i in range(3))/abs(kk[0])
    return abs(k[0].imag)/(2*abs(k[0].real)), spread, x, k[0]
def best_for(r2,a2,a3):
    grid=np.exp(np.linspace(np.log(0.05),np.log(20),240)); out=[]
    vals=[det(r,r2,a2,a3) for r in grid]
    for i in range(len(grid)-1):
        if np.sign(vals[i])!=np.sign(vals[i+1]) and np.isfinite(vals[i]) and np.isfinite(vals[i+1]):
            try: r3=brentq(det,grid[i],grid[i+1],args=(r2,a2,a3),xtol=1e-14)
            except Exception: continue
            if min(abs(r3-1),abs(r3-r2))<1e-4: continue
            P,sp,x,k=P_at(r2,a2,r3,a3)
            if sp<1e-8 and abs(k.real)>1e-10: out.append((P,r3,x))
    return min(out,key=lambda t:t[0]) if out else None
best=(9,None)
for it in range(int(sys.argv[3]) if len(sys.argv)>3 else 1500):
    r2=np.exp(rng.uniform(np.log(0.1),np.log(10))); a2=rng.uniform(0,2*np.pi); a3=rng.uniform(0,2*np.pi)
    b=best_for(r2,a2,a3)
    if b and b[0]<best[0]: best=(b[0],(r2,a2,a3,b[1],b[2]))
print(f'n={n} random-search min P = {best[0]:.6f}  (sqrt3/2 = 0.866025)  at r2,a2,a3,r3 = {np.round(best[1][:4],5)}  g2,g3,g0 = {np.round(best[1][4],5)}')
