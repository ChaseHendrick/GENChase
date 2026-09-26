"""Consistency test (not a proof): the rigorous boxes of prove_ends.py must contain an independent
high-precision mpmath solution (x-coordinates, own Taylor integrator in shoot_mp.py) started at the point
a = delta, b = 0, which lies in the initial box.  Usage: python3 test_vs_mpmath.py prove_c1.json [dc]
With dc (negative control) the mpmath speed is shifted by dc and containment must FAIL."""
import sys, json
import mpmath as mp
mp.mp.dps = 110
_argv = sys.argv; sys.argv = [_argv[0], '110']
import shoot_mp as SM
sys.argv = _argv
from flint import arb, ctx
ctx.prec = 600
import nfmodel as M
from eigsys import EigSystem
from prove_ends import parse_c

res = json.load(open(sys.argv[1]))
c_arb = parse_c(res['c'])
Sy = EigSystem(c_arb)
c = mp.mpf(c_arb.mid().str(110, radius=False))
if len(sys.argv) > 2:   # negative control: perturb the speed of the mpmath solution
    c += mp.mpf(sys.argv[2])
k = 1/c
delta = mp.mpf(res['delta'])
# independent eigenvector in mpmath: same closed form, but computed in mpmath
lam, v, l, p2 = SM.unstable(k)
x = [SM.REST[i] + delta*v[i] for i in range(4)]
t = mp.mpf(0); N = 70; tol = mp.mpf(10)**-105
bad = 0; checked = 0
for snap in res['snapshots'][1:]:
    T = mp.mpf(snap['t_exact'].split(' +/-')[0].strip('['))
    while t < T:
        xn, h = SM.step(x, k, N, tol, min(mp.mpf(1), T-t))
        x = xn; t += h
    zbox = [arb(s) for s in snap['z']]
    xbox = Sy.to_x(zbox)
    for i in range(4):
        # widen by 1e-80 for the mpmath solution's own error and for the t_exact rounding
        xb = xbox[i]; xm = arb(mp.nstr(x[i], 100))
        if not arb(xb.mid(), (xb.rad() + arb('1e-80')*(1+abs(xb.mid()))).upper()).contains(xm):
            bad += 1
            print('NOT contained t=%s i=%d box=%s mp=%s' % (mp.nstr(T, 8), i, xb.str(20), mp.nstr(x[i], 20)))
        checked += 1
    if abs(x[0]) > 5: break
print('checked', checked, 'not contained', bad)
sys.exit(1 if bad else 0)
