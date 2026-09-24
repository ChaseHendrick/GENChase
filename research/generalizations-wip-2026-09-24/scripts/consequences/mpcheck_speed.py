import time
from core import *
mp.mp.dps=25
mu=mp.mpf(1)/2
th=mp.mpf('3.532963')
wc=w_of_theta(mu,th)
w0=wc+mp.mpf('1e-6')*(1+0.3j)
def F(t,y):
    w=mp.mpc(y[0],y[1]); a,b=ab(mu,w)
    return [b.real,b.imag,a.imag]
t=time.time()
sol=mp.odefun(F,0,[w0.real,w0.imag,0])
print(sol(10)); print(time.time()-t)
