# Computation A4 (second revision).  Nearest-neighbour dimension of each stimulus set, a property of the stimuli
# alone (the definition of Spigler, Geiger and Wyart, arXiv:1905.10843, Sect. 7): the median nearest-neighbour
# distance of n random stimuli scales as n^(-1/d_nn).  Subsets n = 175, 350, 700, 1400 and all 2,800 (4 random
# subsets per n below 2,800, seed [20260926, 17, set index, n, j]); d_nn = -1/slope of the least-squares line of
# log(mean over subsets of the median nearest-neighbour distance) against log n, over all five n and over the
# three largest.  Unwhitened and whitened coordinates, and as a control an isotropic Gaussian cloud and a Gaussian
# cloud with the set's coordinate variances ('gauss_iso', 'gauss'; 2,800 points, seed [20260926, 19, set index]),
# which show how far finite n alone lowers d_nn.  Deterministic given the seeds.  Output: out/nn_dim.json
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import stim_files, coords, pdist_matrix, OUT

NS, NSUB = (175, 350, 700, 1400, 2800), 4
out = {}
for si, (label, fn, d) in enumerate(stim_files()):
    Z, _ = coords(fn, d)
    rec = dict(d=d)
    g = np.random.default_rng([20260926, 19, si]).standard_normal(Z.shape)
    for name, X in (('plain', Z), ('white', Z / Z.std(0)[None, :]), ('gauss', g * Z.std(0)[None, :]), ('gauss_iso', g)):
        D = pdist_matrix(X); np.fill_diagonal(D, np.inf)
        med = []
        for n in NS:
            vals = []
            for j in range(NSUB if n < len(X) else 1):
                idx = (np.random.default_rng([20260926, 17, si, n, j]).choice(len(X), n, replace=False)
                       if n < len(X) else np.arange(len(X)))
                vals.append(float(np.median(D[np.ix_(idx, idx)].min(1))))
            med.append(float(np.mean(vals)))
        ln, lm = np.log(NS), np.log(med)
        s_all = np.polyfit(ln, lm, 1)[0]; s_top = np.polyfit(ln[2:], lm[2:], 1)[0]
        rec[name] = dict(n=list(NS), median_nn=med, d_nn_all=float(-1 / s_all), d_nn_top=float(-1 / s_top))
        print(f'{label} {name:5s}: d_nn {-1 / s_all:.2f} (n = 175-2800), {-1 / s_top:.2f} (n = 700-2800)', flush=True)
    out[label] = rec
json.dump(out, open(f'{OUT}/nn_dim.json', 'w'), indent=1)
