import json, numpy as np, sys
from symnc import resid, lm, descend, unpack
k=int(sys.argv[1]); src=sys.argv[2]
d=json.load(open(src)); G=np.array(d['G']); w=np.array([complex(a,c) for a,c in d['w']]); b0=d['b']
Gt=G.sum(); zc=(G*w).sum()/Gt; w=w-zc
ic=np.argmin(abs(w)); cen=abs(w[ic])<1e-6
g0=G[ic] if cen else 0.0
idx=[i for i in range(len(G)) if not (cen and i==ic)]
G=G[idx]; w=w[idx]
ineg=int(np.argmin(G)); n=w[ineg]/abs(w[ineg])
# representatives: angle relative to negative in (-pi/2, pi/2]
ang=np.angle(w/n)
rep=[i for i in range(len(G)) if -np.pi/2 < ang[i] <= np.pi/2]
print('reps',len(rep),'of',len(G))
g=G[rep]; p=w[rep]/n; a=np.angle(p)
order=[int(np.argmin(g))]+[i for i in range(len(rep)) if i!=int(np.argmin(g))]
g=g[order]; p=p[order]; a=a[order]
sc=-1/g[0]; g=g*sc; g0s=g0*sc; p=p*np.sqrt(sc)
m=len(g); best=None
for comp in [2.0/k, 1.0]:
  for gscale in [0.6, 1.0]:
    for g0f in [0.0, 1.0]:
      pp=abs(p)*np.exp(1j*a*comp)
      x=np.concatenate([[g0s*g0f*gscale], g[1:]*gscale, pp.real, pp.imag])
      ok=False
      for bb in [b0, b0+0.3, b0+1, b0+3, b0+8]:
          xs,fv=lm(lambda y: resid(y,m,k,bb),x.copy())
          if fv<1e-22: ok=True; break
      if not ok: print(comp,gscale,g0f,'no solve'); continue
      xe,be,why=descend(xs,m,k,bb)
      G0,ge,pe=unpack(xe,m)
      print(comp,gscale,g0f,'P',round(be/2,6),why,'g0',round(G0,4),'g',np.round(ge,3).tolist(),flush=True)
      if why=='stalled' and (best is None or be<best[1]): best=(xe,be)
if best:
    G0,ge,pe=unpack(best[0],m)
    json.dump(dict(k=k,g0=G0,g=ge.tolist(),p=[[z.real,z.imag] for z in pe],b=best[1]),open('seed3nc_k%d.json'%k,'w'))
    print('best',best[1]/2)
