"""Independent check (numerical, double precision) that the three-turn map of gamma1 is the
identity near x0, not just at x0: perturb x0 by 1e-3 in each coordinate (real and imaginary
directions) and integrate the orbit alone (no variational equation)."""
import numpy as np
from fast import Fast
F = Fast(1.0, rtol=1e-13, atol=1e-15)
D1 = [0, 0.5, 0.5+0.4j, 1+0.9j, 0.5+1.4j, 0.9j, 0.5+0.4j, 0.5, 0]
D2 = [0, 0.5, 0.5-0.4j, -0.9j, 0.5-1.4j, 1-0.9j, 0.5-0.4j, 0.5, 0]
x0 = np.array([0.1, -0.3, 0.2, 0.4], complex)
for name, D in (('gamma1', D1), ('gamma2', D2)):
    worst = 0
    for k in range(4):
        for eps in (1e-3, 1e-3j, -2e-2, 2e-2j):
            x = x0.copy(); x[k] += eps
            y = x
            for _ in range(3):
                y = F.path(D, y, var=False)
            worst = max(worst, np.abs(y - x).max())
    print(name, 'max over 16 perturbed starts (|dx| up to 0.02) of |T^3(x) - x| = %.1e' % worst)
