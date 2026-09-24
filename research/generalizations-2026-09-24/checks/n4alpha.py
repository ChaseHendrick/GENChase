# Minimize P = Im(kappa)/(-2 Re kappa) over self-similar collapses of four point vortices in the alpha-model.
# Unknowns: z1 = 0, z2 = 1, z3, z4 (complex), G1 = 1, G2, G3, G4, kappa. Equations: v_j = kappa (z_j - z_c), j = 2,3,4.
import numpy as np, sys
from scipy.optimize import minimize, least_squares
al=float(sys.argv[1]); seed=int(sys.argv[2]); ntry=int(sys.argv[3]); rng=np.random.default_rng(seed)
def unpack(x):
    z=np.array([0,1,x[0]+1j*x[1],x[2]+1j*x[3]]); G=np.array([1,x[4],x[5],x[6]]); k=x[7]+1j*x[8]; return z,G,k
def res(x):
    z,G,k=unpack(x); zc=(G@z)/G.sum(); out=[]
    for j in (1,2,3):
        v=1j/(2*np.pi)*sum(G[m]*(z[j]-z[m])*abs(z[j]-z[m])**(-al-2) for m in range(4) if m!=j)
        out.append(v-k*(z[j]-zc))
    o=np.array(out); return np.concatenate([o.real,o.imag])
def fullres(x):
    z,G,k=unpack(x); zc=(G@z)/G.sum()
    v=[1j/(2*np.pi)*sum(G[m]*(z[j]-z[m])*abs(z[j]-z[m])**(-al-2) for m in range(4) if m!=j) for j in range(4)]
    sc=max(abs(k*(z[j]-zc)) for j in range(4)); return max(abs(v[j]-k*(z[j]-zc)) for j in range(4))/sc
best=None
for t in range(ntry):
    x0=np.concatenate([rng.uniform(-1.5,2.5,4),rng.uniform(-2,2,3),[-rng.uniform(0.05,1),rng.uniform(-2,2)]])
    s=least_squares(res,x0,xtol=1e-13,ftol=1e-13,gtol=1e-13)          # land on the collapse manifold
    if np.max(abs(s.fun))>1e-9: continue
    x=s.x
    if x[7]>=0: continue
    cons={'type':'eq','fun':res}
    obj=lambda x: x[8]**2/(4*x[7]**2)                                 # P^2
    r=minimize(obj,x,constraints=[cons],method='SLSQP',bounds=[(None,None)]*7+[(None,-1e-6),(None,None)],options={'maxiter':800,'ftol':1e-14})
    x=r.x
    s=least_squares(res,x,xtol=1e-15,ftol=1e-15,gtol=1e-15); x=s.x
    z,G,k=unpack(x)
    if k.real>=0 or fullres(x)>1e-9: continue
    d=min(abs(z[i]-z[j]) for i in range(4) for j in range(i+1,4))
    if d<1e-3 or abs(G.sum())<1e-6: continue
    P=abs(k.imag)/(2*abs(k.real))
    if best is None or P<best[0]: best=(P,x,fullres(x),d)
B=np.sqrt(3+al)/(2+al)
if best: print(f'alpha={al} seed={seed}: min P over {ntry} starts = {best[0]:.10f}  (3-vortex floor {B:.10f}); residual {best[2]:.1e}; min separation {best[3]:.3f}; G = {np.round(unpack(best[1])[1],6)}')
else: print(f'alpha={al} seed={seed}: nothing found')
