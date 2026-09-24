import numpy as np
P={7:0.7344649419163595,9:0.6592598629786454,11:0.617951062685239512698,13:0.5918604652969561,15:0.5738915441219399,
17:0.5607700272457585,19:0.5507731409764614,21:0.542907185837218,23:0.5365586895105647,25:0.5313285211176642}
Ns=sorted(P)
m=lambda N:(N-1)//2
print('m  P  d  q_local')
prev=None
for i,N in enumerate(Ns):
    if i>=2:
        d1=P[Ns[i-1]]-P[N]; d0=P[Ns[i-2]]-P[Ns[i-1]]
        q=np.log(d0/d1)/np.log((m(N)-0.5)/(m(N)-1.5))
        print(m(N),P[N],d1,round(q,3))
for k,deg in [(6,2),(7,3),(8,3),(8,4)]:
    NN=np.array([m(N) for N in Ns[-k:]],float); y=np.array([P[n] for n in Ns[-k:]])
    A=np.vstack([NN**(-i) for i in range(deg+1)]).T
    c=np.linalg.lstsq(A,y,rcond=None)[0]
    print('poly 1/m last',k,'deg',deg,'P_inf=',round(c[0],5))
for k,deg in [(6,2),(8,3)]:
    NN=np.array(Ns[-k:],float); y=np.array([P[n] for n in Ns[-k:]])
    A=np.vstack([NN**(-i) for i in range(deg+1)]).T
    c=np.linalg.lstsq(A,y,rcond=None)[0]
    print('poly 1/N last',k,'deg',deg,'P_inf=',round(c[0],5))
def fitp2(k):
    NN=np.array([m(N) for N in Ns[-k:]],float); y=np.array([P[n] for n in Ns[-k:]])
    best=None
    for p in np.linspace(0.2,3,2801):
        A=np.vstack([np.ones_like(NN),NN**(-p),NN**(-p-1)]).T
        c=np.linalg.lstsq(A,y,rcond=None)[0]; r=np.sum((A@c-y)**2)
        if best is None or r<best[0]: best=(r,p,c)
    return best
for k in [6,8]:
    r,p,c=fitp2(k); print('power+corr last',k,'p=',round(p,3),'P_inf=',round(c[0],5),'rms',np.sqrt(r/k))
