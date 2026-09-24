import mpmath as mp
mp.mp.dps = 30
P0s = {'inf (mu->0)': mp.sqrt(3)/2, 'mu=1/2 min': mp.mpf('1.0647059762712043'), 'mu=1 min': mp.sqrt(2)}
print('beta(deg)  rho=sin(beta)   sec(beta)  sec^2(beta/2) | P_chord, P_time for each P0')
for bdeg in [1, 10, 30, 45, 60, 80, 89, 90, 100, 135, 170]:
    b = mp.radians(bdeg)
    sec = 1/abs(mp.cos(b)) if bdeg != 90 else mp.inf
    s2 = 1/mp.cos(b/2)**2
    row = '%5d  %10s  %10s  %10s |' % (bdeg, mp.nstr(mp.sin(b), 6), mp.nstr(sec, 6), mp.nstr(s2, 6))
    for k, P0 in P0s.items():
        row += '  %s: %s, %s' % (k, mp.nstr(P0*sec, 6) if sec != mp.inf else 'inf', mp.nstr(P0*s2, 6))
    print(row)
