"""Adversarial minimization of sigma(w)/sum(s) and of sigma*det(I-D)/sum(s) over configurations,
recording the minimal pair distance (relative) at the minimizer."""
import numpy as np, sys
rng=np.random.default_rng(int(sys.argv[2]))
def parts(w):
    s=abs(w)**2; N=len(w)
    d2=abs(w[:,None]-w[None,:])**2; np.fill_diagonal(d2,1)
    D=(s[:,None]-s[None,:])/d2; np.fill_diagonal(D,0)
    A=np.eye(N)-D
    sig=s@np.linalg.solve(A,np.ones(N))
    return sig/s.sum(), sig*np.linalg.det(A)/s.sum()
def f(x,N,which):
    w=x[:N]+1j*x[N:]
    return parts(w)[which]
def minimize(N,x,which,iters):
    val=f(x,N,which); step=0.1
    for it in range(iters):
        g=np.zeros_like(x); h=1e-7
        for i in range(len(x)):
            e=np.zeros_like(x); e[i]=h
            g[i]=(f(x+e,N,which)-f(x-e,N,which))/(2*h)
        ng=np.linalg.norm(g)
        if ng==0: break
        while step>1e-13:
            xn=x-step*g/ng; vn=f(xn,N,which)
            if vn<val: x,val=xn,vn; step*=1.3; break
            step/=2
        if step<=1e-13: break
    return x,val
N=int(sys.argv[1])
for which,name in [(0,'sigma/sum s'),(1,'sigma*det/sum s')]:
    res=[]
    for t in range(8):
        x=rng.normal(size=2*N)
        x,v=minimize(N,x,which,600)
        w=x[:N]+1j*x[N:]
        dmin=min(abs(w[i]-w[j]) for i in range(N) for j in range(i+1,N))/max(abs(w))
        res.append((v,dmin))
    res.sort()
    print(N,name,'min values and rel. min distance:',[(float('%.3g'%a),float('%.2g'%b)) for a,b in res[:4]],flush=True)
