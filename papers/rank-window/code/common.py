# Shared helpers for the methods note (identifiability of the smoothness bound at finite stimulus count).
# Stimulus coordinates are the top-d principal components of the low-dimensional stimulus images of
# Stringer et al. 2019 (figshare 10.25378/janelia.6845348, files images_natimg2800_{8D,4D}_*.mat);
# image data only, no neural data.
import os, glob
import numpy as np
import scipy.io as sio
from scipy.special import kv, gamma

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STIM = os.path.join(ROOT, 'data', 'stim')
OUT = os.path.join(ROOT, 'out')

NUS = (0.5, 0.75, 1.0, 1.5, 2.5)
ELLS = (0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0)      # length scale in units of the median pair distance


def stim_files():
    """The ten low-dimensional stimulus sets: (label, path, d)."""
    out = []
    for f in sorted(glob.glob(os.path.join(STIM, 'images_*D_*.mat'))):
        b = os.path.basename(f)[len('images_'):-4]           # e.g. 8D_MP032_0810
        d = int(b.split('D_')[0])
        out.append((b, f, d))
    return out


def coords(fn, d):
    """Top-d image principal-component coordinates (not whitened), and the image-PC variances."""
    im = sio.loadmat(fn)['imgs']                               # 68 x 270 x 2800, uint8
    X = im.reshape(-1, im.shape[2]).T.astype(np.float64)       # 2800 x pixels
    X -= X.mean(0)
    Gm = X @ X.T
    w, U = np.linalg.eigh(Gm)
    w, U = w[::-1], U[:, ::-1]
    Z = U[:, :d] * np.sqrt(np.clip(w[:d], 0, None))
    return Z, w / X.shape[0]                                   # coordinates, PC variances (all)


def pdist_matrix(Z):
    sq = (Z ** 2).sum(1)
    return np.sqrt(np.clip(sq[:, None] + sq[None, :] - 2 * Z @ Z.T, 0, None))


def matern(D, nu, ell):
    """Matern correlation in the Rasmussen-Williams parameterization, k(0) = 1."""
    r = np.sqrt(2 * nu) * D / ell
    if nu == 0.5:
        return np.exp(-r)
    if nu == 1.5:
        return (1 + r) * np.exp(-r)
    if nu == 2.5:
        return (1 + r + r * r / 3) * np.exp(-r)
    out = np.ones_like(r)
    m = r > 1e-12
    out[m] = (2 ** (1 - nu) / gamma(nu)) * r[m] ** nu * kv(nu, r[m])
    return out


def centred_spectrum(K):
    """Eigenvalues, descending, of H K H / P: the noise-free population spectrum of a code with kernel K
    (infinitely many neurons, each neuron centred over the P stimuli)."""
    P = K.shape[0]
    Kc = K - K.mean(0)[None, :] - K.mean(1)[:, None] + K.mean()
    ev = np.linalg.eigvalsh((Kc + Kc.T) / 2 / P)
    return ev[::-1]


def window_slope(s, lo=11, hi=500):
    """Stringer et al. get_powerlaw: least squares of log|s_n| on -log n over n = lo..hi (1-based),
    weights 1/n.  Identical to est.window_slope."""
    n = np.arange(lo, hi + 1).astype(float)
    y = np.log(np.abs(s[lo - 1:hi]))
    x = np.stack([-np.log(n), np.ones_like(n)], 1)
    w = 1.0 / n
    b = np.linalg.solve(x.T @ (x * w[:, None]), (x * w[:, None]).T @ y)
    return b[0]


def geometry(Z, pcvar, d):
    """Descriptive geometry of a stimulus set."""
    rel = pcvar[:d] / pcvar[0]
    pr = rel.sum() ** 2 / (rel ** 2).sum()
    D = pdist_matrix(Z)
    iu = np.triu_indices(len(Z), 1)
    med = np.median(D[iu])
    nn = (D + np.eye(len(D)) * 1e300).min(1)
    sd = np.sqrt(pcvar[:d])
    return dict(rel=rel, pr=pr, med=med, nn_med=np.median(nn) / med, nn10=np.percentile(nn, 10) / med,
                sd_over_nn=sd / np.median(nn),
                frac_top_d=pcvar[:d].sum() / pcvar.sum(), next_rel=pcvar[d] / pcvar[0]), D, med
