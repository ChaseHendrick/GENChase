"""Sign of bhat over the whole L=0 shape family (both orientations), several mu (S > 0)."""
import mpmath as mp
from mycore import planar_shape, planar_data
mp.mp.dps = 30
for mu in ['0.01', '0.2', '0.5', '1', '4']:
    m = mp.mpf(mu); G = [mp.mpf(1), m, -m/(1+m)]
    cnt = {}; minP = mp.inf
    for i in range(1, 200):
        for j in range(1, 200):
            l13 = mp.mpf(i)/50; l23 = mp.mpf(j)/50
            for o in (1, -1):
                Z = planar_shape(G, l13, l23, o)
                if Z is None: continue
                pd = planar_data(Z, G)
                key = (o, int(mp.sign(pd['ahat'])), int(mp.sign(pd['bhat'])))
                cnt[key] = cnt.get(key, 0) + 1
                if pd['ahat'] != 0:
                    minP = min(minP, abs(pd['bhat'])/(2*abs(pd['ahat'])))
    print('mu', mu, 'counts (orient, sign ahat, sign bhat):', dict(sorted(cnt.items())), ' min P0 on grid', mp.nstr(minP, 8))
