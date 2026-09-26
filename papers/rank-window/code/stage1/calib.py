# Calibration of the simulator from the natural-image recording (allowed: natural images only).
# Outputs out/calib_<tag>.npz with per-neuron signal/noise variances, noise spectrum, estimated
# signal spectra (cvPCA, SCC), eigenmoments, and the signal-noise alignment profile.
import sys, time, numpy as np
sys.path.insert(0, '.')
import spec
rng = np.random.default_rng(20260926)
fn = sys.argv[1]; tag = sys.argv[2]; mode = sys.argv[3] if len(sys.argv) > 3 else 'stringer'
t0 = time.time()
F, d = spec.load_stringer(fn, mode=mode)
del d
F[0] -= F[0].mean(0); F[1] -= F[1].mean(0)
_, n, N = F.shape
print(f'{tag}: n_stim={n} N={N} load {time.time()-t0:.1f}s', flush=True)
sig = (F[0] * F[1]).sum(0) / (n - 1)
noi = ((F[0] - F[1]) ** 2).sum(0) / (2 * (n - 1))
tot = 0.5 * ((F[0] ** 2).sum(0) + (F[1] ** 2).sum(0)) / (n - 1)
print(f'total signal var {sig.sum():.1f}, noise var {noi.sum():.1f}, reliable fraction {sig.sum()/tot.sum():.3f}', flush=True)
X = np.concatenate([F[0], F[1]], 0)
G = X @ X.T
print(f'grams {time.time()-t0:.1f}s', flush=True)
cv = spec.cvpca_gram(G)
print(f'cvpca {time.time()-t0:.1f}s', flush=True)
sc = spec.scc_gram(G, rng, nsplit=2)
print(f'scc {time.time()-t0:.1f}s', flush=True)
mom = spec.eigmoments_gram(G, 10)
print(f'moments {time.time()-t0:.1f}s', flush=True)
# noise spectrum: D = (F1 - F2)/sqrt2, sample covariance eigenvalues (top n)
G11, G12, G21, G22 = spec.split_gram(G)
GD = (G11 - G12 - G21 + G22) / 2
wD = np.linalg.eigvalsh(GD)[::-1] / (n - 1)
# signal (sum) spectrum: S = (F1 + F2)/2 sample covariance eigenvalues
GS = (G11 + G12 + G21 + G22) / 4
wS = np.linalg.eigvalsh(GS)[::-1] / (n - 1)
# alignment: signal eigvecs from half A (SCC eigvecs), noise variance along them in half B's D
perm = rng.permutation(n); A, B = perm[:n//2], perm[n//2:]
iA = np.concatenate([A, A + n])
K = G[np.ix_(iA, iA)]
wK, QK = np.linalg.eigh(K); wK = np.clip(wK, wK.max()*1e-12, None)
Kh = (QK*np.sqrt(wK))@QK.T; Kmh = (QK/np.sqrt(wK))@QK.T
nA = len(A); M = np.zeros((2*nA, 2*nA)); M[:nA, nA:] = np.eye(nA); M[nA:, :nA] = np.eye(nA); M /= 2*nA
w, Z = np.linalg.eigh(Kh@M@Kh); Z = Z[:, ::-1][:, :300]
V = X[iA].T @ (Kmh @ Z)                         # N x 300 signal eigvecs (unit norm)
DB = (F[0][B] - F[1][B]) / np.sqrt(2); DB -= DB.mean(0)
PB = DB @ V
noise_along_sig = (PB**2).sum(0) / (len(B) - 1)
R = np.linalg.qr(rng.standard_normal((N, 300)))[0]
noise_along_rand = ((DB @ R)**2).sum(0) / (len(B) - 1)
# signal along the same eigvecs, from half B cross-repeat covariance
P1 = F[0][B] @ V; P2 = F[1][B] @ V; P1 -= P1.mean(0); P2 -= P2.mean(0)
sig_along_sig = (P1*P2).sum(0)/(len(B)-1)
# noise eigvecs (top 100 from half A of D), signal variance along them on half B
DA = (F[0][A] - F[1][A]) / np.sqrt(2); DA -= DA.mean(0)
u, s, vt = np.linalg.svd(DA, full_matrices=False)
Vn = vt[:100].T
Q1 = F[0][B] @ Vn; Q2 = F[1][B] @ Vn; Q1 -= Q1.mean(0); Q2 -= Q2.mean(0)
sig_along_noise = (Q1*Q2).sum(0)/(len(B)-1)
noise_along_noise = ((DB @ Vn)**2).sum(0)/(len(B)-1)
np.savez(f'out/calib_{tag}.npz', sig=sig, noi=noi, tot=tot, cv=cv, sc=sc, mom=mom, wD=wD, wS=wS,
         noise_along_sig=noise_along_sig, noise_along_rand=noise_along_rand, sig_along_sig=sig_along_sig,
         sig_along_noise=sig_along_noise, noise_along_noise=noise_along_noise, n=n, N=N)
for nm, s_ in (('cvPCA', cv), ('SCC', sc)):
    print(nm, 'slope 11-500 = %.3f' % spec.window_slope(s_, 11, 500), ' 11-200 = %.3f' % spec.window_slope(s_, 11, 200),
          ' 2-10 = %.3f' % spec.window_slope(s_, 2, 10), ' first vals', np.round(s_[:5], 3))
print('noise spectrum top10', np.round(wD[:10], 2), ' mean noise var per dim', noi.sum()/N)
print('noise along signal eigvecs (1..10)', np.round(noise_along_sig[:10], 3), ' along random mean', noise_along_rand.mean())
print('ratio noise along sig eig k / random: k=1-10 %.2f, 11-50 %.2f, 51-300 %.2f' % (noise_along_sig[:10].mean()/noise_along_rand.mean(), noise_along_sig[10:50].mean()/noise_along_rand.mean(), noise_along_sig[50:].mean()/noise_along_rand.mean()))
print('signal along noise eigvecs (1..10)', np.round(sig_along_noise[:10], 3), ' noise along noise', np.round(noise_along_noise[:10], 2))
print(f'done {time.time()-t0:.1f}s')
