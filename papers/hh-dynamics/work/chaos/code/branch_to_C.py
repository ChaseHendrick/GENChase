"""Natural continuation in J of the branch beyond the second fold (J = 7.92200) down to G&O's current, to
test whether their p2 (orbit C) lies on the Hopf branch. Single shooting on the section u = s of the saved
branch; secant predictor. NUMERICAL.   python3 branch_to_C.py  -> ../data/branch_to_C.json"""
import json
import numpy as np
import hhc
import pmap
import orbits

d = np.load('../data/branch3.npz')
r, s = d['rows'], float(d['s'])
x_prev, J_prev = r[-2, 1:4], r[-2, 0]
x, J = r[-1, 1:4], r[-1, 0]
Jgo = orbits.j_ours(7.8617827403)
out = []
Js = list(np.arange(J - 0.0005, Jgo, -0.0005)) + [Jgo]
for Jn in Js:
    xp = x + (x - x_prev) * (Jn - J) / (J - J_prev)
    xn, res, T, DP, umax, umin = pmap.newton_fixed(xp, Jn, s, tol=1e-14)
    mu = np.linalg.eigvals(DP)
    mu = mu[np.argsort(-np.abs(mu))]
    out.append({'J': Jn, 'x': xn.tolist(), 'res': float(np.abs(res).max()), 'T': T, 'umax': umax, 'umin': umin,
                'mu': [float(m.real) for m in mu]})
    print('J=%.6f res=%.1e T=%.4f umax=%.3f mu1=%.4e' % (Jn, np.abs(res).max(), T, umax, mu[0].real), flush=True)
    x_prev, J_prev, x, J = x, J, xn, Jn
# compare the end point with C (G&O p2 polished at our E_l) on the section u = 4.5 up
y = hhc.to_section(np.r_[s, x], Jgo, 4.5, +1, 1)[0]
p2 = np.array([0.08499590453730, 0.37635277095981, 0.43229451177364])
C = pmap.newton_fixed(p2, Jgo, 4.5, direction=+1)[0]
res = {'path': out, 'end_on_u45_up': y[1:].tolist(), 'C': C.tolist(), 'distance_to_C': float(np.abs(y[1:] - C).max())}
print('distance from the continued orbit to C on u = 4.5: %.3e' % res['distance_to_C'])
json.dump(res, open('../data/branch_to_C.json', 'w'), indent=1)
