import time, sys
from mpscatter import *
mp.mp.dps = 30
cases = []
for mu in ['1', '0.5', '0.2']:
    m = mp.mpf(mu)
    R = 1+m+m*m
    t0 = theta0(m)
    # minimizer on A- (pi, 2pi - theta0)
    f = lambda t: mp.diff(lambda s: P_theta_formula(m, s), t)
    thm = mp.findroot(f, mp.pi + mp.mpf('0.5')*(mp.pi - t0) if mu!='1' else mp.pi+mp.mpf('0.6155'))
    # make sure within arc
    cases.append((mu, thm, 'min-A-'))
for (mu, th, lab) in cases:
    for side in [1, -1]:
        t1 = time.time()
        r = run_branch(mu, th, side, '1e-16', dps=32)
        print(lab, 'mu', mu, 'th_c', mp.nstr(th, 20), 'L-sign', side, 'Pin', mp.nstr(r['Pin'], 20), 'Pout', mp.nstr(r['Pout'], 20),
              'th_out', mp.nstr(r['th_out'] % (2*mp.pi), 20), 'C', mp.nstr(r['C'], 20), 'time %.0fs' % (time.time()-t1), flush=True)
