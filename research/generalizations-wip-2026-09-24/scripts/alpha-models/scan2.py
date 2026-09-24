# Scan P over the fundamental domain R = {Im w>0, |w|<1, |w-1|>1} in polar coords about the corner w=0.
import numpy as np
from npcore import P_np
def bound(alpha): return np.sqrt(3+alpha)/(2+alpha)
for alpha in [0,0.1,0.5,1.0,1.5,1.9,2.0,3.0]:
    lr = np.linspace(-14, 0, 1401)  # log10 rho
    ps = np.linspace(np.pi/2, np.pi, 2001)[1:-1]
    LR, PS = np.meshgrid(lr, ps, indexing='ij')
    W = 10**LR*np.exp(1j*PS)
    inR = (np.abs(W) < 1) & (np.abs(W-1) > 1) & (W.imag > 0)
    P,_ = P_np(W, alpha)
    P = np.where(inR & np.isfinite(P), P, np.inf)
    # min over psi at each rho
    pmin = P.min(axis=1)
    i = np.argmin(P.min(axis=1))
    B = bound(alpha)
    # check monotonic: pmin as function of rho (from small to large)
    valid = np.isfinite(pmin)
    d = np.diff(pmin[valid])
    print(f"alpha={alpha}: bound={B:.12f}  global grid min={pmin[valid].min():.12f} at log10rho={lr[valid][np.argmin(pmin[valid])]:.2f};  min-over-psi at rho=1e-14: {pmin[0]:.12f}, 1e-6: {pmin[800]:.12f}, 1e-2: {pmin[1200]:.10f}, 0.1: {pmin[1300]:.8f}; nondecreasing in rho: {np.all(d>=-1e-12)}; min(P-bound)={np.nanmin(pmin[valid]-B):.3e}")
