# Independent check of the R3 kappa identity (prior-art checker's sanity check).
import json, mpmath as mp
mp.mp.dps = 50
def kappa_direct(G, z):
    N=len(z); Gt=sum(G); zc=sum(g*w for g,w in zip(G,z))/Gt
    w=[x-zc for x in z]
    ks=[]
    for j in range(N):
        cv=sum(G[k]/(z[j]-z[k]) for k in range(N) if k!=j)/(2j*mp.pi)  # conj(zdot_j)
        zd=mp.conj(cv)
        if abs(w[j])>mp.mpf(10)**-30: ks.append(zd/w[j])
    k0=ks[0]; res=max(abs(k-k0) for k in ks)/abs(k0)
    return k0,res,w
def kappa_formula(G,w):
    N=len(w); s=[abs(x)**2 for x in w]
    D=mp.matrix(N,N); E=mp.matrix(N,N)
    for j in range(N):
        for k in range(N):
            if j!=k:
                K=(w[j]+w[k])/(w[j]-w[k]); D[j,k]=mp.re(K); E[j,k]=mp.im(K)
    I=mp.eye(N); v=mp.lu_solve(I+D, mp.matrix(s))
    nv2=sum(x**2 for x in v); sig=sum(v); L=sum(g*x for g,x in zip(G,s)); Gt=sum(G)
    EG=E*mp.matrix(G); vEG=sum(v[i]*EG[i] for i in range(N))
    im=(Gt*sig-L)/(4*mp.pi*nv2); re=vEG/(4*mp.pi*nv2)
    return mp.mpc(re,im), sig, L
# 1) three vortices (1,1,-1/2), z3 on the L=0 circle
for th in [0.3,1.1,2.0,4.0]:
    G=[mp.mpf(1),mp.mpf(1),mp.mpf(-0.5)]
    z=[mp.mpc(0),mp.mpc(1),mp.mpc(0.5+mp.sqrt(0.75)*mp.cos(th), mp.sqrt(0.75)*mp.sin(th))]
    k,res,w=kappa_direct(G,z); kf,sig,L=kappa_formula(G,w)
    print('N=3 th=%.1f'%th,'kappa',mp.nstr(k,12),'ss_res',mp.nstr(res,3),'|k-kf|/|k|',mp.nstr(abs(k-kf)/abs(k),3),'sigma',mp.nstr(sig,8),'L',mp.nstr(L,3))
# 2) configurations found by the check-kappa-identity run (N=5,6,8)
for fn in ['found_N5_s2.json','found_N6_s3.json','found_N8_s4.json']:
    d=json.load(open('/tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad/research/check-kappa-identity/'+fn))
    for c in d[:3]:
        G=[mp.mpf(x) for x in c['G']]; z=[mp.mpc(mp.mpf(a),mp.mpf(b)) for a,b in c['z']]
        k,res,w=kappa_direct(G,z); kf,sig,L=kappa_formula(G,w)
        print(fn,'kappa',mp.nstr(k,10),'ss_res',mp.nstr(res,3),'|k-kf|/|k|',mp.nstr(abs(k-kf)/abs(k),3),'sigma',mp.nstr(sig,6),'L',mp.nstr(L,3))
