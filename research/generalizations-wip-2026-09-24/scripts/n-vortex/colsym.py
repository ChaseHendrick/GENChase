import sympy as sp
for N in [2,3]:
    x=sp.symbols('x1:%d'%(N+1),positive=True)
    D=sp.zeros(N,N)
    for j in range(N):
        for k in range(N):
            if j!=k: D[j,k]=(x[j]+x[k])/(x[j]-x[k])
    A=sp.eye(N)-D
    u=A.LUsolve(sp.Matrix([1]*N))
    sig=sp.factor(sp.simplify(sum(x[j]**2*u[j] for j in range(N))))
    print(N,'sigma=',sig)
    print('  u=',[sp.factor(sp.simplify(t)) for t in u])
    print('  det=',sp.factor(A.det()))
