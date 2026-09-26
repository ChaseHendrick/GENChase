"""Spread of the multipliers of C over integrator settings (conditioning check). NUMERICAL."""
import json
import numpy as np
import hhk
d = json.load(open('fixed_points.json'))
g = np.array(d['C']['mine']); J = 7.861806449482496
rows = []
for rt, hm in [(1e-11, 0.25), (1e-12, 0.25), (1e-13, 0.25), (1e-13, 0.05), (1e-14, 0.1), (1e-12, 0.02)]:
    x, info, M = hhk.P(g, J, rtol=rt, atol=rt * 1e-2, hmax=hm, var=True)
    mu = np.linalg.eigvals(M); mu = mu[np.argsort(-np.abs(mu))]
    # mu1 * mu2 from the 2x2 compound: largest eigenvalue of the second compound matrix of DP
    C2 = np.array([[M[i, k] * M[j, l] - M[i, l] * M[j, k] for (k, l) in [(0, 1), (0, 2), (1, 2)]] for (i, j) in [(0, 1), (0, 2), (1, 2)]])
    l2 = np.linalg.eigvals(C2); l2 = l2[np.argmax(np.abs(l2))]
    rows.append(dict(rtol=rt, hmax=hm, mu1=mu[0].real, mu2=mu[1].real, mu2_from_compound=(l2 / mu[0]).real))
    print(rows[-1])
json.dump(rows, open('c_multipliers.json', 'w'), indent=1)
