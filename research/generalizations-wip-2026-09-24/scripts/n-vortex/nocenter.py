import json, numpy as np, sys
from ss_search import lm, unpack, describe
from descent import run as descend
d=json.load(open(sys.argv[1])); G=np.array(d['G']); w=np.array([complex(a,c) for a,c in d['w']]); b=d['b']
Gt=G.sum(); zc=(G*w).sum()/Gt; w=w-zc
ic=int(np.argmin(abs(w))); print('central G',G[ic],'|w|',abs(w[ic]))
keep=[i for i in range(len(G)) if i!=ic]; G=G[keep]; w=w[keep]
i0=int(np.argmax(G)); perm=[i0]+[i for i in range(len(G)) if i!=i0]; G=G[perm]; w=w[perm]
sc=1/np.sqrt(G[0]); G=G/G[0]; w=w*sc; N=len(G)
x=np.concatenate([G[1:],w.real,w.imag])
for bb in [b, b+0.1, b+0.3, b+1, b+3]:
    xs,f=lm(x.copy(),N,-1+1j*bb)
    print('b',bb,'f',f)
    if f<1e-22: break
xe,be,why=descend(N,xs,bb)
dd=describe(xe,N,-1+1j*be)
print('N',N,'P',be/2,why,'relmin',dd['dmin']/dd['maxw'])
Ge,we=unpack(xe,N)
print(np.round(np.sort(Ge/np.max(abs(Ge))),3))
json.dump(dict(G=Ge.tolist(),w=[[z.real,z.imag] for z in we],b=be),open(sys.argv[2],'w'))
