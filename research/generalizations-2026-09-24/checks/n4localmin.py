import numpy as np, sys
from scipy.optimize import least_squares
al=float(sys.argv[1])
exec(open('n4alpha.py').read().split('best=None')[0].replace("al=float(sys.argv[1]); seed=int(sys.argv[2]); ntry=int(sys.argv[3]); rng=np.random.default_rng(seed)","rng=np.random.default_rng(5)"))
lines=open(f'n4_alpha{al}.txt').read().split('\n'); P0=float(lines[0]); x0=np.array([float(v) for v in lines[1].split()])
J=np.array([(res(x0+1e-7*e)-res(x0-1e-7*e))/2e-7 for e in np.eye(9)]).T
N=np.linalg.svd(J)[2][6:].T          # null space (tangent directions), 3-dimensional
lower=0; tested=0; minratio=np.inf
for t in range(400):
    d=N@rng.normal(size=3); d/=np.linalg.norm(d)
    for h in (1e-3,1e-2):
        s=least_squares(res,x0+h*d,xtol=1e-15,ftol=1e-15,gtol=1e-15)
        if np.max(abs(s.fun))>1e-11 or fullres(s.x)>1e-9: continue
        z,G,k=unpack(s.x); P=abs(k.imag)/(2*abs(k.real)); tested+=1
        minratio=min(minratio,(P-P0)/h**2)
        if P<P0-1e-13: lower+=1
print(f'alpha={al}: {tested} constrained perturbations of size 1e-3 and 1e-2 around P4 = {P0:.12f}; {lower} with lower P; min (P-P4)/h^2 = {minratio:.3e}')
