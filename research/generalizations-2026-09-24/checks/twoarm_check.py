# Independent Biot-Savart check of the certified two-arm collapses (N = 33, 61): residual |V_j - kappa (z_j - z_c)|
# measured against |kappa| max|z_j - z_c|, so the vortex near the centre of vorticity is handled without dividing.
import json, sys
from mpmath import mp, mpf, mpc, pi, fsum
for f in sys.argv[1:] or ["twoarm_N33.json","twoarm_N61.json"]:
    d=json.load(open(f)); mp.dps=int(d['dps'])+5
    G=[mpf(g) for g in d['G']]; Z=[mpc(mpf(a),mpf(b)) for a,b in d['z']]; N=len(G)
    Gt=fsum(G); zc=fsum(g*z for g,z in zip(G,Z))/Gt
    V=[((fsum(G[m]/(Z[j]-Z[m]) for m in range(N) if m!=j)/(2j*pi)).conjugate()) for j in range(N)]
    jf=max(range(N),key=lambda j:abs(Z[j]-zc)); k=V[jf]/(Z[jf]-zc); scale=abs(k)*abs(Z[jf]-zc)
    res=max(abs(V[j]-k*(Z[j]-zc)) for j in range(N))/scale
    sGG=fsum(G[i]*G[j] for i in range(N) for j in range(i+1,N)); L=fsum(g*abs(z-zc)**2 for g,z in zip(G,Z))
    print(f"N={N}: rel residual {mp.nstr(res,3)}, sum GiGj {mp.nstr(sGG,3)}, L {mp.nstr(L,3)}, Re kappa<0 {k.real<0}, P = {mp.nstr(abs(k.imag)/(2*abs(k.real)),20)} (file {d['P'][:22]})")
