# Independent Biot-Savart check of the stored N-vortex minimizers (nvortex_chain.json: circulations G and positions w).
import json
from mpmath import mp, mpf, mpc, pi, fsum
mp.dps=30
d=json.load(open('nvortex_chain.json')); prev=None
for N in sorted(d,key=int):
    G=[mpf(g) for g in d[N]['G']]; Z=[mpc(*map(mpf,p)) for p in d[N]['w']]; n=len(G)
    Gt=fsum(G); zc=fsum(g*z for g,z in zip(G,Z))/Gt
    k=[((fsum(G[m]/(Z[j]-Z[m]) for m in range(n) if m!=j)/(2j*pi)).conjugate())/(Z[j]-zc) for j in range(n)]
    spread=max(abs(x-k[0]) for x in k)/abs(k[0]); P=abs(k[0].imag)/(-2*k[0].real)
    s=fsum(G[i]*G[j] for i in range(n) for j in range(i+1,n)); L=fsum(g*abs(z-zc)**2 for g,z in zip(G,Z))
    print(f'N={N:>2} P={mp.nstr(P,12):>14} claimed {float(d[N]["P_claimed"]):.12f} spread {mp.nstr(spread,2):>8} sumGG {mp.nstr(s,2):>8} L {mp.nstr(L,2):>8} Re k<0 {k[0].real<0} {"decreasing" if prev is None or P<prev else "NOT decreasing"}')
    prev=P
