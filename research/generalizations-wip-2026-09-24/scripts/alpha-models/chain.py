# Test a chain of lower bounds on the ordered domain R, coordinates (rho, m): r2 = rho, r3 = 1, r1^2 = 1 + rho*m,
# cos(psi) = (rho - m)/2, rho in (0,1), m in (0, 2+rho).
import numpy as np
def test(beta, n=1500):
    rho = np.linspace(1e-4, 1, n)[:, None]
    m = np.linspace(1e-4, 3, 2*n)[None, :]
    dom = (m < 2 + rho) & (np.abs(rho - m) < 2)
    X = rho**(2*beta); Y = (1 + rho*m)**beta
    S = (1+rho*m)*(1+X)/(1-X) + rho**2*(Y+1)/(Y-1) - (Y+X)/(Y-X)
    need = (2*np.sqrt(1+2*beta)/beta)*rho*np.sqrt(np.clip(1-(m-rho)**2/4, 0, None))
    red = rho*m + rho**2*(Y+1)/(Y-1)
    alg = (rho/beta)*(beta*m + 2/m + rho - rho**2*m/6)
    out = {}
    for name, val in [('exact', S), ('reduced', red), ('algebraic', alg)]:
        d = np.where(dom, (val - need)/rho**3, np.inf)
        i = np.unravel_index(np.argmin(d), d.shape)
        out[name] = (d[i], float(rho[i[0],0]), float(m[0,i[1]]))
    chk1 = np.all(np.where(dom, S - red, 1) >= -1e-12)
    chk2 = np.all(np.where(dom, red - alg, 1) >= -1e-12)
    return out, chk1, chk2
for beta in [1.0, 1.001, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 5.0]:
    out, c1, c2 = test(beta)
    print('beta', beta, ' S>=reduced:', c1, ' reduced>=algebraic:', c2, ' min (bound - need)/rho^3 :', {k: (round(v[0],5), round(v[1],4), round(v[2],4)) for k, v in out.items()})
