import numpy as np
rng=np.random.default_rng(1)
def sig(w):
    s=abs(w)**2; N=len(w)
    d2=abs(w[:,None]-w[None,:])**2; np.fill_diagonal(d2,1)
    D=(s[:,None]-s[None,:])/d2; np.fill_diagonal(D,0)
    u=np.linalg.solve(np.eye(N)-D,np.ones(N))
    return s@u/np.sum(s)
def f(x,N):
    w=x[:N]+1j*x[N:]
    return sig(w)
def minimize(N,x,iters=3000):
    val=f(x,N); step=0.1
    for it in range(iters):
        # gradient by FD
        g=np.zeros_like(x); h=1e-6
        for i in range(len(x)):
            e=np.zeros_like(x); e[i]=h
            g[i]=(f(x+e,N)-f(x-e,N))/(2*h)
        while step>1e-12:
            xn=x-step*g/np.linalg.norm(g)
            vn=f(xn,N)
            if vn<val: x,val=xn,vn; step*=1.3; break
            step/=2
        if step<=1e-12: break
    return x,val
for N in [3,4,5,6]:
    best=1e9
    for t in range(12):
        x=rng.normal(size=2*N)
        x,v=minimize(N,x,800)
        if v<best: best=v; bx=x
    w=bx[:N]+1j*bx[N:]
    print(N,'min sigma/sum s =',best,' |w|=',np.round(abs(w),4))

print('--- detail')
rng=np.random.default_rng(5)
for N in [3,4]:
    for t in range(4):
        x=rng.normal(size=2*N)
        x,v=minimize(N,x,1500)
        w=x[:N]+1j*x[N:]
        dmin=min(abs(w[i]-w[j]) for i in range(N) for j in range(i+1,N))
        print(N, 'sigma/sum s', v, 'w', np.round(w,5), 'dmin', dmin, 'max|w|', max(abs(w)))
