import numpy as np
from ev import S, Df, K
xs = np.linspace(-6, 45, 40001); Ys = S(xs).T
J = np.array([Df(y) for y in Ys])
Iq = J[:,1,2:]/K; cg = J[:,2:,0]; kap = -np.array([np.diag(j[2:,2:]) for j in J])
pr = np.abs(Iq*cg)
for i,nm in enumerate('mnh'):
    k = np.argmax(pr[:,i]); print(nm, 'max |I_q c| = %.2f at xi=%.3f u=%.1f kappa=%.3f' % (pr[k,i], xs[k], Ys[k,0], kap[k,i]), 'min kappa %.3f' % kap[:,i].min(), ' max ratio |Iq c|/kappa %.1f' % (pr[:,i]/kap[:,i]).max())
print('sign of Iq*c (m,n,h) at max:', [np.sign((Iq*cg)[np.argmax(pr[:,i]), i]) for i in range(3)])
