import numpy as np, mpmath as mp
P={4:0.7978967838798637,5:0.7448144569625295,6:0.7136801485294048,7:0.6936617908325869,8:0.6797704207872108,
9:0.6695811206106267,10:0.6617926944496829,11:0.6556478587308334,12:0.6506768347109856,13:0.6465730245580406,
14:0.6431279281413207,15:0.6401948608582793,16:0.637667646955817,17:0.6354675493680376,18:0.6335349495754922,
19:0.6318238799740161,20:0.6302983301482499,21:0.6289296903930769,22:0.6276949440995281,23:0.6265753650912482,
24:0.6255555627220143,25:0.6246227710684569}
Ns=sorted(P)
d={N:P[N-1]-P[N] for N in Ns[1:]}
print('N  P_N  d_N  local exponent of d (d~N^-q)')
for N in Ns[2:]:
    q=-np.log(d[N]/d[N-1])/np.log(N/(N-1))
    print(N, P[N], d[N], round(q,4))
# polynomial-in-1/N fits over last k points
for k,deg in [(8,2),(10,3),(12,3),(12,4),(15,4),(15,5)]:
    NN=np.array(Ns[-k:],float); y=np.array([P[n] for n in Ns[-k:]])
    A=np.vstack([NN**(-i) for i in range(deg+1)]).T
    c=np.linalg.lstsq(A,y,rcond=None)[0]
    print('poly 1/N fit last',k,'deg',deg,'P_inf=',c[0],'a1=',c[1])
# fits in 1/N with log? try P = Pinf + a N^-p
def fitp(k):
    NN=np.array(Ns[-k:],float); y=np.array([P[n] for n in Ns[-k:]])
    best=None
    for p in np.linspace(0.3,3,2701):
        A=np.vstack([np.ones_like(NN),NN**(-p)]).T
        c,res,_,_=np.linalg.lstsq(A,y,rcond=None)
        r=np.sum((A@c-y)**2)
        if best is None or r<best[0]: best=(r,p,c)
    return best
for k in [6,10,14]:
    r,p,c=fitp(k); print('power fit last',k,'p=',round(p,4),'P_inf=',c[0],'rms',np.sqrt(r/k))
# with correction: Pinf + a N^-p + b N^-(p+1)
def fitp2(k):
    NN=np.array(Ns[-k:],float); y=np.array([P[n] for n in Ns[-k:]])
    best=None
    for p in np.linspace(0.3,3,2701):
        A=np.vstack([np.ones_like(NN),NN**(-p),NN**(-p-1)]).T
        c=np.linalg.lstsq(A,y,rcond=None)[0]
        r=np.sum((A@c-y)**2)
        if best is None or r<best[0]: best=(r,p,c)
    return best
for k in [8,12,16]:
    r,p,c=fitp2(k); print('power+corr fit last',k,'p=',round(p,4),'P_inf=',c[0],'rms',np.sqrt(r/k))
