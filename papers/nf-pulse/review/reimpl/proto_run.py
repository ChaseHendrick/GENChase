import sys, time
from flint import arb, ctx
import nfmodel as M, hoe
from eigsys import EigSystem
prec=int(sys.argv[1]); N=int(sys.argv[2]); dexp=int(sys.argv[3]); Tend=float(sys.argv[4]); which=sys.argv[5]
ctx.prec=prec
c = M.c1() if which=='c1' else M.c2()
S=EigSystem(c); K=arb(1000); d=arb(10)**(-dexp)
e=K*d*d; z=[d]+[arb(0,e.upper())]*3
t=arb(0); t0=time.time(); last=-1
while float(t.mid())<Tend:
    h=hoe.choose_h(S,z,N,1)
    zn,B,rem,h=hoe.step(S,z,N,h)
    z=zn; t=t+h
    if int(float(t.mid()))//5!=last:
        last=int(float(t.mid()))//5
        x=S.to_x(z)
        print('t=%.2f h=%.3f a=%s rad_a=%.2e maxrad_b=%.2e U=%s' % (float(t.mid()), float(h.mid()), z[0].str(5), float(z[0].rad()), max(float(zz.rad()) for zz in z[1:]), x[0].str(5)), flush=True)
print('time', time.time()-t0)
