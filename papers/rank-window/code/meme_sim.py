# Computation C2. Noisy two-repeat data (2,800 stimuli, N = 8,704 neurons) simulated with the stage-1 noise
# model, for the base broken power law BPL(0.5, 1.25, break 10) and for spectra equal to it in ranks 1-500
# but different beyond (tails.SIM_SPECTRA).  Homogeneous gains, so the signal spectrum is exactly the one
# specified.  Replicate r uses the same random numbers for every spectrum (common random numbers), so paired
# differences between spectra carry little Monte Carlo error.  Stores the Kong-Valiant cross-repeat
# eigenmoment estimates p = 1..8 (est.eigmoments) of every replicate; fitting is done in meme_analyze.py.
# Usage: python3 meme_sim.py R [first_replicate [base]]
#   With 'base', only the base spectrum is simulated (added in revision: data sets 20-99 of the base spectrum set
#   the MEME weights and the null distribution of the misfit, independently of the paired data sets 0-19).
import sys, os, time, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import sim, est
from tails import N, variants, SIM_SPECTRA
from common import ROOT, OUT
from math import comb

R = int(sys.argv[1]); R0 = int(sys.argv[2]) if len(sys.argv) > 2 else 0
BASE_ONLY = len(sys.argv) > 3 and sys.argv[3] == 'base'
if BASE_ONLY:
    SIM_SPECTRA = ('base',)
SEED = 20260926
A2 = 1.25
c = np.load(os.path.join(ROOT, 'data', 'calib_nat_MP032_0914.npz'))
sig, noi = c['sig'], c['noi']
assert len(sig) == N
r_al, v_ind = 0.75, 590.0
iso = np.clip(noi - r_al * np.clip(sig, 0, None) - v_ind / N, 0.1, None)   # as sim.calibrated
specs = variants(A2)


def eigmoments_cross(G12, m, kmom=8):
    """est.eigmoments computed from the cross-repeat block G12 = F1 F2^T only (identical arithmetic)."""
    h = m // 2
    idx = np.arange(m)
    a, b = idx[0:2 * h:2], idx[1:2 * h:2]
    G12 = G12.astype(np.float64)
    A = (G12[np.ix_(a, a)] - G12[np.ix_(a, b)] - G12[np.ix_(b, a)] + G12[np.ix_(b, b)]) / 2
    F = np.triu(A, 1); Fi = np.eye(h); H = []
    for p in range(kmom):
        H.append(np.sum(Fi * A.T) / comb(h, p + 1))
        Fi = Fi @ F
    return np.array(H)


# self-test against est.eigmoments on a small problem
_r = np.random.default_rng(0); _X = _r.standard_normal((2 * 40, 30))
_G = _X @ _X.T
assert np.allclose(eigmoments_cross(_G[:40, 40:], 40), est.eigmoments(_G, 40, 8))

fn = f'{OUT}/meme_sim_{"base_" if BASE_ONLY else ""}{R0}_{R0 + R - 1}.npz'
H = np.full((R, len(SIM_SPECTRA), 8), np.nan)
t0 = time.time()
for r in range(R0, R0 + R):
    for j, name in enumerate(SIM_SPECTRA):
        S = sim.Sim(specs[name], np.ones(N), r_al, v_ind, np.sqrt(iso), n=2800, seed=SEED)
        rng = np.random.default_rng([SEED, r])            # same draws for every spectrum
        F = S.draw(rng)
        G12 = F[0] @ F[1].T; del F
        H[r - R0, j] = eigmoments_cross(G12, S.n, 8); del G12
    np.savez(fn, H=H, spectra=np.array(SIM_SPECTRA), a2=A2, seed=SEED, R0=R0)
    print(f'rep {r} done ({time.time()-t0:.0f}s): log H1 {np.log(H[r-R0, :, 0]).round(3)}', flush=True)
print('done')
