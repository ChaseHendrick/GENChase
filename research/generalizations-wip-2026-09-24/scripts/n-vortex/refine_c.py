import json, numpy as np, sys
from ss_search import jac, resid, unpack, describe
from kkt import kkt_solve, Fb
out={}
import glob
files={}
for fn in glob.glob('n*_start.json'):
    d=json.load(open(fn)); files[len(d['G'])]=fn
for N in sorted(files):
    pass
    d=json.load(open(files[N]))
    G=np.array(d['G']); w=np.array([complex(a,b) for a,b in d['w']]); b=d['b']
    i0=int(np.argmax(G)); perm=[i0]+[i for i in range(N) if i!=i0]; G=G[perm]; w=w[perm]
    s=1/np.sqrt(G[0]); G=G/G[0]; w=w*s
    x=np.concatenate([G[1:],w.real,w.imag]); n=3*N-1
    Jx=jac(x,N,-1+1j*b); Jb=Fb(x,N,b)
    lam0=np.linalg.lstsq(np.concatenate([Jx.T,Jb[None,:]],axis=0),np.concatenate([np.zeros(n),[1.0]]),rcond=None)[0]
    y,fk=kkt_solve(np.concatenate([x,[b],lam0]),N,iters=60)
    xx=y[:n]; bb=y[n]
    r=resid(xx,N,-1+1j*bb)
    G2,w2=unpack(xx,N)
    out[N]=dict(P=bb/2,fk=fk,res=float(np.abs(r).max()),G=G2.tolist(),w=[[z.real,z.imag] for z in w2],b=bb)
    print(N,repr(bb/2),'kkt',fk,'F',np.abs(r).max(),flush=True)
json.dump(out,open('chain_refined.json','w'))
