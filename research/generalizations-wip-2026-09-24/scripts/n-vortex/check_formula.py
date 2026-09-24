import json, mpmath as mp, sys
mp.mp.dps=40
def check(G,w):
    N=len(G); Gt=mp.fsum(G); zc=mp.fsum(G[j]*w[j] for j in range(N))/Gt
    w=[z-zc for z in w]; s=[abs(z)**2 for z in w]
    D=mp.matrix(N,N); E=mp.matrix(N,N)
    for j in range(N):
        for k in range(N):
            if j!=k:
                K=(w[j]+w[k])/(w[j]-w[k]); D[j,k]=K.real; E[j,k]=K.imag
    I=mp.eye(N)
    v=mp.lu_solve(I+D, mp.matrix(s))
    sig=mp.fsum(v[j] for j in range(N)); vv=mp.fsum(v[j]**2 for j in range(N))
    EG=E*mp.matrix(G)
    imk=Gt*sig/(4*mp.pi*vv); rek=mp.fsum(v[j]*EG[j] for j in range(N))/(4*mp.pi*vv)
    # direct kappa from farthest vortex
    jr=max(range(N),key=lambda j:abs(w[j]))
    vel=mp.conj(mp.fsum(G[k]/(w[jr]-w[k]) for k in range(N) if k!=jr)/(2j*mp.pi))
    kap=vel/w[jr]
    return kap, mp.mpc(rek,imk), sig, vv
for fn in sys.argv[1:]:
    d=json.load(open(fn))
    G=[mp.mpf(g) for g in d['G']]; w=[mp.mpc(mp.mpf(a),mp.mpf(b)) for a,b in d['w']]
    kap,form,sig,vv=check(G,w)
    print(fn,'kappa direct',mp.nstr(kap,20),'formula',mp.nstr(form,20),'sigma',mp.nstr(sig,10))
