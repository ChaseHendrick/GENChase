# Global scan of P over fundamental domain R (double precision, rho>=1e-3), all alpha in a grid.
# Reports: min of (P - bound)/(rho^2) (normalized corner excess), and discrete interior local minima of P.
import numpy as np
from npcore import P_np
def bound(al): return np.sqrt(3+al)/(2+al)
lr = np.linspace(-3, 0, 1201)
ps = np.linspace(np.pi/2, np.pi, 1602)[1:-1]
LR, PS = np.meshgrid(lr, ps, indexing='ij')
W = 10**LR*np.exp(1j*PS)
inR = (np.abs(W) < 1) & (np.abs(W-1) > 1) & (W.imag > 0)
rho = 10**LR
worst = []
for al in list(np.round(np.arange(0.0, 2.001, 0.05), 3)) + [2.5, 3.0, 4.0]:
    P,_ = P_np(W, al)
    P = np.where(inR & np.isfinite(P), P, np.inf)
    B = bound(al)
    ex = (P - B)/rho**2
    k = np.unravel_index(np.argmin(ex), ex.shape)
    # discrete local minima in interior (8-neighbour)
    Pc = P[1:-1,1:-1]
    nb = np.stack([P[:-2,:-2],P[:-2,1:-1],P[:-2,2:],P[1:-1,:-2],P[1:-1,2:],P[2:,:-2],P[2:,1:-1],P[2:,2:]])
    locmin = np.isfinite(Pc) & np.all(Pc < nb, axis=0) & np.all(np.isfinite(nb),axis=0)
    idx = np.argwhere(locmin)
    lm = [(float(10**lr[i+1]), float(ps[j+1]), float(Pc[i,j])) for i,j in idx]
    print(f"alpha={al:4}: bound={B:.10f} min P on scan={np.min(P):.10f} (at rho={10**LR[np.unravel_index(np.argmin(P),P.shape)]:.1e}) min (P-B)/rho^2={ex[k]:.4f} at rho={rho[k]:.1e},psi={PS[k]:.4f}; interior discrete local minima: {lm[:5]}")
