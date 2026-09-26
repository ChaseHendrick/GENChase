# Simulator of two-repeat population responses with a known signal eigenspectrum, calibrated to
# the natural-image recording (Stringer et al. 2019, M170714_MP032 2017-09-14, Stringer preprocessing).
#
# Mode space -> neuron space by a fixed random orthogonal map R (three rounds of random signs and an
# orthonormal DCT-II), then per-neuron gains g (heterogeneous signal variance, as in the data).
#   F_r = [ (Z_S Lam^1/2 + Z_ar (r Lam)^1/2) R ] * g  +  z_tr sqrt(v_ind) w^T  +  Z_ir * sig_iso
# Signal covariance  Sigma_S = G R^T Lam R G   (its eigenvalues are the truth; computed numerically)
# Noise covariance   Sigma_N = r Sigma_S (aligned, gain-like) + v_ind w w^T + diag(sig_iso^2)
import numpy as np, scipy.fft as sf


def spectrum(kind, N, lam1=200.0, alpha=1.25, head=0.5, brk=10):
    k = np.arange(1, N + 1, dtype=float)
    if kind == 'pl':
        return lam1 * k ** (-alpha)
    if kind == 'bpl':
        return np.where(k <= brk, lam1 * k ** (-head), lam1 * brk ** (-head) * (k / brk) ** (-alpha))
    raise ValueError(kind)


class Sim:
    def __init__(self, lam, g, r, v_ind, sig_iso, n=2800, seed=0):
        self.N = len(lam); self.n = n
        self.lam = np.asarray(lam, float); self.g = np.asarray(g, float)
        self.r = np.broadcast_to(np.asarray(r, float), (self.N,)).copy()
        self.v_ind = float(v_ind); self.sig_iso = np.asarray(sig_iso, float)
        rs = np.random.default_rng(seed)
        self.signs = [rs.choice([-1.0, 1.0], self.N).astype(np.float32) for _ in range(3)]
        w = rs.standard_normal(self.N); self.w = (w / np.linalg.norm(w)).astype(np.float32)

    def rot(self, Y):
        for s in self.signs:
            Y = sf.dct(Y * s, type=2, norm='ortho', axis=1, overwrite_x=True)
        return Y

    def draw(self, rng):
        n, N = self.n, self.N
        f32 = np.float32
        sl = np.sqrt(self.lam).astype(f32); g = self.g.astype(f32)
        S = self.rot(rng.standard_normal((n, N), dtype=f32) * sl) * g
        F = np.empty((2, n, N), f32)
        sa = np.sqrt(self.r * self.lam).astype(f32); si = self.sig_iso.astype(f32)
        for rep in range(2):
            E = self.rot(rng.standard_normal((n, N), dtype=f32) * sa) * g
            E += np.outer(rng.standard_normal(n).astype(f32) * f32(np.sqrt(self.v_ind)), self.w)
            E += rng.standard_normal((n, N), dtype=f32) * si
            F[rep] = S + E
        return F

    def truth(self, kmax=2000):
        """Eigenvalues of Sigma_S = G R^T Lam R G  (= eig of M M^T with M = rot(diag(sqrt lam)) * g)."""
        N = self.N
        M = self.rot(np.diag(np.sqrt(self.lam)).astype(np.float32)) * self.g.astype(np.float32)
        C = (M.astype(np.float64) @ M.T.astype(np.float64))
        del M
        w = np.linalg.eigvalsh(C)[::-1]
        return w[:kmax]


def calibrated(calib_npz, kind, alpha, lam1=200.0, head=0.5, brk=10, r=0.75, v_ind=590.0,
               seed=0, n=2800, snr_scale=1.0):
    """Build a Sim whose neuron count, gains and noise are taken from the natural-image calibration."""
    c = np.load(calib_npz)
    sig, noi = c['sig'], c['noi']
    N = len(sig)
    g2 = np.clip(sig, 0.01, None); g2 = g2 / g2.mean()
    lam = spectrum(kind, N, lam1 * snr_scale, alpha, head, brk)
    # isotropic per-neuron noise: data noise variance minus the aligned (r * signal var, from the data)
    # and independent-mode parts; held fixed across simulated spectra and signal scales
    iso = noi - r * np.clip(sig, 0, None) - v_ind / N
    iso = np.clip(iso, 0.1, None)
    return Sim(lam, np.sqrt(g2), r, v_ind, np.sqrt(iso), n=n, seed=seed)
