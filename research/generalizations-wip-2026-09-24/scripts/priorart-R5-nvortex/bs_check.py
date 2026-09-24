# Independent Biot-Savart check of certified minima (read-only on source files).
import json, sys
from mpmath import mp, mpf, mpc, pi, conj, fabs
mp.dps = 50
base = '/tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad/research/n-vortex/'
for fn in sys.argv[1:]:
    d = json.load(open(base+fn))
    G = [mpf(g) for g in d['G']]
    z = [mpc(mpf(a), mpf(b)) for a, b in d['w']]
    N = len(G); Gt = sum(G)
    zc = sum(g*zz for g, zz in zip(G, z))/Gt
    L = sum(g*abs(zz-zc)**2 for g, zz in zip(G, z))
    V = sum(G[i]*G[j] for i in range(N) for j in range(i+1, N))
    ks = []
    for j in range(N):
        w = sum(G[k]/(z[j]-z[k]) for k in range(N) if k != j)/(2j*pi)
        v = conj(w)
        if abs(z[j]-zc) > mpf(10)**-20:
            ks.append(v/(z[j]-zc))
    k0 = ks[0]
    spread = max(abs(k-k0) for k in ks)/abs(k0)
    P = fabs(k0.imag)/(-2*k0.real)
    print(fn, 'N', N, 'P', mp.nstr(P, 30), 'Rekappa<0', k0.real < 0, 'spread', mp.nstr(spread, 3), 'L', mp.nstr(L, 3), 'V', mp.nstr(V, 3), 'claimed', d.get('P', '')[:30])
