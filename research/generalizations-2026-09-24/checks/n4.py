# Independent check of the N=4 point: Biot-Savart conj(zdot_j) = (1/2 pi i) sum_k G_k/(z_j - z_k)
from mpmath import mp, mpf, mpc, pi, sqrt, fabs
mp.dps=40
G=[mpf(1),mpf('0.167391431853814697651119608287'),mpf('0.104133188036199454472762981869'),mpf('-0.227251300382913963570471483562')]
Z=[mpc('0.0166495669172171320379784913405'),mpc('-0.219122640223164016964857201527','-0.329067622006817416107926375746'),
   mpc('-0.157987430012178450886765481268','-0.286475993427200078671522237774'),mpc('-0.160533384304821086375863705901','-0.373660167280816436844027021713')]
Gt=sum(G); zc=sum(g*z for g,z in zip(G,Z))/Gt
k=[]
for j in range(4):
    v=sum(G[m]/(Z[j]-Z[m]) for m in range(4) if m!=j)/(2j*pi)
    k.append(v.conjugate()/(Z[j]-zc))
print('kappa_j:',[mp.nstr(x,20) for x in k])
print('spread',mp.nstr(max(abs(x-k[0]) for x in k),3))
print('sum GiGj',mp.nstr(sum(G[i]*G[j] for i in range(4) for j in range(i+1,4)),3),' L',mp.nstr(sum(g*abs(z-zc)**2 for g,z in zip(G,Z)),3))
P=abs(k[0].imag)/(-2*k[0].real); print('P =',mp.nstr(P,25),' sqrt3/2 =',mp.nstr(sqrt(3)/2,12),' path factor',mp.nstr(sqrt(1+4*P**2),8))
