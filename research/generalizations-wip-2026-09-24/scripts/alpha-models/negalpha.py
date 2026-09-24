# alpha < 0 (beta = 1 + alpha/2 in (0,1)): is inf P still the corner value sqrt(1+2beta)/(2beta)?
import numpy as np
from mono import P_R
def scan(beta):
    B = np.sqrt(1+2*beta)/(2*beta)
    best = (np.inf, None)
    for rho in np.concatenate([np.logspace(-4,-1,60), np.linspace(0.1,0.999,300)]):
        ps = np.linspace(np.arccos(rho/2), np.pi, 6001)[1:-1]
        v = P_R(rho, ps, beta)
        i = np.argmin(v)
        if v[i] < best[0]: best = (v[i], (rho, ps[i]))
    return B, best
for alpha in [-0.8, -0.9, -1.0, -1.2, -1.4, -1.6, -1.8, -1.9]:
    beta = 1 + alpha/2
    B, (v, loc) = scan(beta)
    print(f"alpha={alpha}: beta={beta:.2f} corner B={B:.8f}  grid min P={v:.8f} at rho={loc[0]:.4g}, psi={loc[1]:.4f}  {'BELOW corner' if v < B else 'above'}")
