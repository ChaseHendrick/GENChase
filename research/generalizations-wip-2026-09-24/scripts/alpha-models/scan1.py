import numpy as np
from npcore import P_np
xs = np.linspace(-3,4,1401); ys = np.linspace(1e-4,4,1201)
X,Y = np.meshgrid(xs,ys); W = X+1j*Y
for alpha in [0,0.1,0.25,0.5,0.75,1.0,1.25,1.5,1.75,1.9,1.99]:
    P,_ = P_np(W, alpha)
    P = np.where(np.isfinite(P), P, np.inf)
    i = np.unravel_index(np.argmin(P), P.shape)
    print(alpha, 'min P on grid', P[i], 'at w', W[i])
