import numpy as np
rng=np.random.default_rng(0)
def sigma(w):
    s=abs(w)**2; N=len(w)
    d2=abs(w[:,None]-w[None,:])**2; np.fill_diagonal(d2,1)
    D=(s[:,None]-s[None,:])/d2; np.fill_diagonal(D,0)
    M=np.linalg.inv(np.eye(N)-D)
    return s@M@np.ones(N), s@M@s
worst=1e9
for N in [3,4,5,6,8,12]:
    mn=1e9
    for t in range(20000):
        kind=t%3
        if kind==0: w=rng.normal(size=N)+1j*rng.normal(size=N)
        elif kind==1: w=np.exp(rng.normal(size=N)*2)*np.exp(2j*np.pi*rng.random(N))
        else:
            w=rng.normal(size=N)+1j*rng.normal(size=N); w[0]=rng.normal()*1e-3
        sg,ss=sigma(w)
        r=sg/np.sum(abs(w)**2)
        if r<mn: mn=r; wmin=w
    print(N,'min sigma/sum s',mn)
