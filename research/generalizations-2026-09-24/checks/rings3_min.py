# Independent check of the three-ring (n = 2) seven-vortex collapse found by rings3.py plus Nelder-Mead refinement:
# three centrally symmetric pairs (radii 1, r2, r3; angles a/2) with circulations (1, g2, g3) and g0 at the centre.
import numpy as np
from mpmath import mp, mpf, mpc, pi, fsum
mp.dps=30
r2,a2,a3,r3=0.63121508,0.4100933,0.60562646,0.9350592719356747
g=[-0.53358167,-0.90057355,-1.979431]
Z=[mpc(1),mpc(-1)]+[mpc(r2*np.exp(1j*a2/2))*s for s in (1,-1)]+[mpc(r3*np.exp(1j*a3/2))*s for s in (1,-1)]+[mpc(0)]
G=[mpf(1)]*2+[mpf(g[0])]*2+[mpf(g[1])]*2+[mpf(g[2])]
N=7; zc=fsum(a*z for a,z in zip(G,Z))/fsum(G)
V=[((fsum(G[m]/(Z[j]-Z[m]) for m in range(N) if m!=j)/(2j*pi)).conjugate()) for j in range(N)]
ks=[V[j]/(Z[j]-zc) for j in range(6)]
print('centre speed %.1e; kappa spread %.1e (inputs rounded to 8 digits); sum GiGj %.1e; Re kappa < 0: %s; P = %s'%(
  float(abs(V[6])),float(max(abs(q-ks[0]) for q in ks)/abs(ks[0])),float(fsum(G[i]*G[j] for i in range(N) for j in range(i+1,N))),ks[0].real<0,mp.nstr(abs(ks[0].imag)/(2*abs(ks[0].real)),9)))
