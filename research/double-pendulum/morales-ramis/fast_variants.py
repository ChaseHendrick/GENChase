"""Numerical (double precision): does the 3-fold diamond loop close, for several g and for
(0.1,-0.3,0.2,0.4) read as velocities or as momenta?"""
import numpy as np
from fast import *
D1=[0, 0.5, 0.5+0.4j, 1+0.9j, 0.5+1.4j, 0.9j, 0.5+0.4j, 0.5, 0]
D2=[0, 0.5, 0.5-0.4j, -0.9j, 0.5-1.4j, 1-0.9j, 0.5-0.4j, 0.5, 0]
def x0for(mode):
    q1,q2,w1,w2=0.1,-0.3,0.2,0.4
    if mode=='mom':
        c=np.cos(q1-q2); d=2-c*c; return [q1,q2,(w1-c*w2)/d,(2*w2-c*w1)/d]
    return [q1,q2,w1,w2]
for g in (1.0, 9.81, 9.8, 10.0):
  for mode in ('vel','mom'):
    x0=np.array(x0for(mode),dtype=complex)
    for name,D in (('gamma1',D1),('gamma2',D2)):
        F=Fast(g); y=y0(x0)
        try:
            gaps=[]
            for k in range(6):
                y=F.path(D,y); gaps.append(np.abs(y[:4]-x0).max())
            print(g,mode,name,'max|x-x0| after 1..6 turns',['%.1e'%v for v in gaps], flush=True)
        except Exception as e:
            print(g,mode,name,'fail',e, flush=True)
