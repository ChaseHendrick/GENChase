"""Normalize a certified configuration: largest |Gamma| positive vortex -> Gamma = 1 (time rescaled so that
Re kappa = -1 still: scaling Gamma by c and positions by sqrt(c) keeps kappa), z_c = 0, strongest vortex on the
positive real axis; print Gamma, z, kappa, P, residuals."""
import json, mpmath as mp, sys
fn=sys.argv[1]; digs=int(sys.argv[2]); mp.mp.dps=max(digs+15,40)
d=json.load(open(fn)); G=[mp.mpf(g) for g in d['G']]; w=[mp.mpc(mp.mpf(a),mp.mpf(b)) for a,b in d['w']]
N=len(G); Gt=mp.fsum(G); zc=mp.fsum(G[j]*w[j] for j in range(N))/Gt; w=[z-zc for z in w]
j0=max(range(N),key=lambda j:G[j]); c=1/G[j0]
if c<0: raise SystemExit('strongest negative')
G=[g*c for g in G]; w=[z*mp.sqrt(c) for z in w]
if abs(w[j0])>mp.mpf(10)**(-digs): r=mp.exp(-1j*mp.arg(w[j0])); w=[z*r for z in w]
order=sorted(range(N),key=lambda j:-G[j]); G=[G[j] for j in order]; w=[w[j] for j in order]
vel=[mp.conj(mp.fsum(G[k]/(w[j]-w[k]) for k in range(N) if k!=j)/(2j*mp.pi)) for j in range(N)]
jr=max(range(N),key=lambda j:abs(w[j])); kap=vel[jr]/w[jr]
far=[j for j in range(N) if abs(w[j])>mp.mpf(10)**(-digs)]
res=max(abs(vel[j]-kap*w[j]) for j in range(N))/max(abs(v) for v in vel)
print('N=%d'%N)
for j in range(N): print('  Gamma=%s  z=%s %s i'%(mp.nstr(G[j],digs),mp.nstr(w[j].real,digs),mp.nstr(w[j].imag,digs)))
print('  kappa =',mp.nstr(kap,digs))
print('  P =',mp.nstr(abs(kap.imag)/(-2*kap.real),digs))
print('  max_j |zdot_j - kappa z_j| / max|zdot| =',mp.nstr(res,3))
print('  Gamma_tot =',mp.nstr(mp.fsum(G),digs),' sum_{i<j}GiGj =',mp.nstr(mp.fsum(G[i]*G[k] for i in range(N) for k in range(i+1,N)),3),' L =',mp.nstr(mp.fsum(G[j]*abs(w[j])**2 for j in range(N)),3))
