# f~^9 of edge points z = p0 + A (x, 0) at E = 0 (rigorous point enclosures, Arb), plus the crossing slope.
import sys, time
from common import *
p0 = [arb(0), arb('-1.462373092479858')]
vu = [arb('0.95568530469114732'), arb('-0.29439021450684943')]
def z_of(x):
    x = arb(x); return [p0[0] + vu[0]*x, p0[1] + vu[1]*x]
def img(x):
    out, T, xc = ftilde(z_of(x), nret=9, shift=1)
    return out
mode = sys.argv[1]
t0 = time.time()
if mode in ('x1', 'x2'):
    x = {'x1': '-1.8870e-5', 'x2': '-1.8838e-5'}[mode]
    o = img(x)
    print(mode, x, 't2 =', o[0].str(15, radius=True), 'p2 =', o[1].str(15, radius=True), time.time()-t0)
else:
    # secant for the crossing t2 = 0 along y = 0, then finite-difference slope
    xa, xb = arb('-1.8870e-5'), arb('-1.8838e-5')
    ga = arb(sys.argv[2]); gb = arb(sys.argv[3])
    for it in range(3):
        xc = arb((xa - ga*(xb-xa)/(gb-ga)).mid())
        gc = img(xc)[0]
        print('secant', it, 'x =', xc.str(20), 't2 =', gc.str(8), flush=True)
        xa, ga, xb, gb = xb, gb, xc, gc
    d = arb('1e-13')
    o1 = img(xc - d); o2 = img(xc + d)
    s = (o2[1]-o1[1])/(o2[0]-o1[0])
    print('crossing x =', xc.str(20), 'image p2 =', o1[1].str(10), 'slope dp2/dt2 =', s.str(10), time.time()-t0)
