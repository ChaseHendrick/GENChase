import sys, time
from common import *
import dparb
p0 = [arb(0), arb('-1.462373092479858')]
vu = [arb('0.95568530469114732'), arb('-0.29439021450684943')]
def img(x, h=0.02, N=30):
    x = arb(x); z = [p0[0] + vu[0]*x, p0[1] + vu[1]*x]
    x0 = [arb(0), z[0], lift(z[0], z[1]), z[1]]
    xc, T = dparb.return_map_nr(x0, 9, h=h, N=N)
    return xc[1] + 18*PI, xc[3], xc, T
t0 = time.time()
for xs in ['-1.8870e-5', '-1.8838e-5']:
    for (h, N) in [(0.02, 30), (0.01, 24)]:
        a, b, xc, T = img(xs, h, N)
        print(xs, 'h', h, 'N', N, 't2+18pi =', a.str(15), 'p2 =', b.str(15), 'H =', Hf(xc).str(5), 'T =', T.str(12), '%.0fs' % (time.time()-t0), flush=True)
xa, xb = arb('-1.8870e-5'), arb('-1.8838e-5'); ga = img(xa)[0]; gb = img(xb)[0]
for it in range(4):
    xc_ = arb((xa - ga*(xb-xa)/(gb-ga)).mid()); gc = img(xc_)[0]
    print('secant', it, xc_.str(20), gc.str(6), flush=True)
    xa, ga, xb, gb = xb, gb, xc_, gc
d = arb('1e-14')
o1 = img(xc_ - d); o2 = img(xc_ + d)
print('crossing x =', xc_.str(20), 'p2 at crossing =', o1[1].str(12), 'slope dp2/dt2 =', ((o2[1]-o1[1])/(o2[0]-o1[0])).str(10))
