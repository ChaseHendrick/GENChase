"""NUMERICAL experiments (not part of any proof).

1. Global descents: 400 random starts (seeded), L-BFGS on unnormalised vectors x_i / |x_i|;
   every final energy is recorded with the distinct values found.
2. Reduced-energy profile along the degenerate directions: for xi = r u, minimise F(N xi + C eta)
   over eta in floating point and print (min - F(0)) / r^4, to compare with the exact quartic q = 1/10.
"""
import itertools
import json
import math
from multiprocessing import Pool

import numpy as np
from scipy.optimize import minimize


def energy_and_grad(z):
    X = z.reshape(7, 3)
    nrm = np.linalg.norm(X, axis=1)
    Y = X / nrm[:, None]
    E = 0.0
    gY = np.zeros_like(Y)
    for i, j in itertools.combinations(range(7), 2):
        d = Y[i] - Y[j]
        r2 = d @ d
        E -= 0.5 * math.log(r2)
        gY[i] -= d / r2
        gY[j] += d / r2
    # chain rule through y = x/|x|
    gX = (gY - (np.sum(gY * Y, axis=1))[:, None] * Y) / nrm[:, None]
    return E, gX.ravel()


def descend(seed):
    rng = np.random.default_rng(seed)
    z0 = rng.normal(size=21)
    r = minimize(energy_and_grad, z0, jac=True, method="L-BFGS-B", options={"gtol": 1e-12, "ftol": 1e-16, "maxiter": 5000})
    return float(r.fun)


def main():
    with Pool(4) as p:
        Es = p.map(descend, range(400))
    vals = sorted(set(round(e, 8) for e in Es))
    print("400 seeded random descents: distinct final energies (rounded 1e-8):",
          {v: sum(1 for e in Es if round(e, 8) == v) for v in vals})
    import local_certificate as LC
    import model
    base = LC.main(out=None, quiet=True)
    Nf = np.array([[float(x) for x in col] for col in base["_internal"]["Ncol"]]).T
    Cf = np.array([[float(x) for x in col] for col in base["_internal"]["Ccol"]]).T
    F0 = model.evaluate_float(np.zeros(11))
    prof = []
    for r in (0.02, 0.05, 0.1, 0.2):
        row = []
        for t in np.linspace(0, 2 * math.pi, 9)[:-1]:
            xi = r * np.array([math.cos(t), math.sin(t)])
            f = lambda eta: model.evaluate_float(Nf @ xi + Cf @ eta)
            res = minimize(f, np.zeros(9), method="BFGS", options={"gtol": 1e-14})
            row.append((res.fun - F0) / (np.linalg.norm(Nf @ xi) ** 4))
        prof.append((r, min(row), max(row)))
        print("  |xi| = %.2f: (min_eta F - F(0)) / |N xi|^4 in [%.5f, %.5f] over 8 directions" % (r, min(row), max(row)))
    json.dump({"descent_energies": Es, "profile": prof}, open("numerics.json", "w"), indent=1)


if __name__ == "__main__":
    main()
