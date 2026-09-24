import json, numpy as np, sys
for fn in sys.argv[1:]:
    d=json.load(open(fn)); G=np.array([float(g) for g in d['G']]); w=np.array([complex(float(a),float(b)) for a,b in d['w']])
    Gt=G.sum(); zc=(G*w).sum()/Gt; w=w-zc; s=abs(w)**2; N=len(G)
    K=np.zeros((N,N),complex)
    for j in range(N):
        for k in range(N):
            if j!=k: K[j,k]=(w[j]+w[k])/(w[j]-w[k])
    D=K.real; E=K.imag
    v=np.linalg.solve(np.eye(N)+D,s); sig=v.sum(); vv=v@v
    imk=Gt*sig/(4*np.pi*vv); rek=(v@(E@G))/(4*np.pi*vv)
    P=abs(imk)/(-2*rek); Pi=sig/(2*np.linalg.norm(E.T@v))
    cosang=(E.T@v)@G/np.linalg.norm(E.T@v)/np.linalg.norm(G)
    print(fn,'N',N,'P',round(P,10),'sigma',round(sig,6),'geometric bound',round(Pi,6),'cos(Gamma,E^T v)',round(cosang,4),'||G||/|Gt|',round(np.linalg.norm(G)/abs(Gt),12))
