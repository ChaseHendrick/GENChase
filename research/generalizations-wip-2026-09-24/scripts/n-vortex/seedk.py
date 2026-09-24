import json, numpy as np, sys
from sym import resid, lm, descend, unpack
k=int(sys.argv[1]); src=json.load(open('sym2_k2_s1.json'))[int(sys.argv[2])]
g0=np.array(src['g']); p0=np.array([complex(a,c) for a,c in src['p']]); m=len(g0)
rng=np.random.default_rng(0); best=None
for gs in [0.4,0.6,0.8,1.0]:
  for ps in [0.7,0.85,1.0,1.2]:
    for tw in [0.0, 0.3, -0.3]:
      g=g0*gs; p=p0*ps*np.exp(1j*tw)
      x=np.concatenate([g,p.real,p.imag])
      for b0 in [3.0,6.0]:
        xs,fv=lm(lambda y: resid(y,m,k,b0),x.copy())
        if fv<1e-22: break
      if fv>1e-22: continue
      xe,be,why=descend(xs,m,k,b0)
      ge,_=unpack(xe,m)
      print(gs,ps,tw,round(be/2,6),why,np.round(ge,3).tolist(),flush=True)
      if why=='stalled' and np.min(abs(ge))>0.02 and (best is None or be<best[1]): best=(xe,be)
if best:
    g,p=unpack(best[0],m); json.dump(dict(g=g.tolist(),p=[[z.real,z.imag] for z in p],b=best[1]),open('seed_k%d.json'%k,'w'))
    print('best',best[1]/2)
