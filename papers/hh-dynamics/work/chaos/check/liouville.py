"""Third multiplier of A and B from Liouville's formula: mu1 mu2 mu3 = exp(int_0^T tr Df dt) (the flow multiplier
is 1). The integral is accumulated with scipy Radau (rtol 1e-12) along the periodic orbit. NUMERICAL."""
import json
import numpy as np
from scipy.integrate import solve_ivp
import hhk

d = json.load(open('fixed_points.json'))
J = 7.861806449482496
for k in 'AB':
    g = np.array(d[k]['mine']); T = d[k]['T_mine']; mu = d[k]['mu_mine']
    def rhs(t, y):
        o = np.empty(4); hhk.f(y[:4], J, hhk.EL, o); M = np.empty((4, 4)); hhk.jac(y[:4], M)
        return np.r_[o, np.trace(M)]
    s = solve_ivp(rhs, (0, T), np.r_[4.5, g, 0.0], method='Radau', rtol=1e-12, atol=1e-14)
    I = s.y[4, -1]
    mu3 = np.exp(I) / (mu[0] * mu[1])
    print(k, 'int tr =', I, 'exp =', np.exp(I), 'mu3 from Liouville =', mu3, 'variational mu3 =', mu[2])
