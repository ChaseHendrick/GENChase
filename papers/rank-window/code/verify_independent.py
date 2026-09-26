# Independent recomputation of selected numbers by different code paths (SVD instead of Gram eigh, scipy pdist
# and kv for every nu, explicit centring matrix, scipy.linalg.eigh, numpy.polyfit), plus a direct check of the
# aliasing formula and of Proposition 1 on random points.  Prints PASS/FAIL lines; exit code 1 on any FAIL.
import sys, os, json, numpy as np, scipy.io as sio, scipy.linalg as sl
from scipy.special import kv, gamma
from scipy.spatial.distance import pdist, squareform
sys.path.insert(0, os.path.dirname(__file__))
from common import OUT, STIM

fails = 0


def check(name, a, b, tol):
    global fails
    ok = abs(a - b) <= tol
    fails += not ok
    print(f'{"PASS" if ok else "FAIL"} {name}: {a:.6f} vs {b:.6f} (tol {tol})')


def slope(ev, lo, hi):
    n = np.arange(lo, hi + 1.0)
    return -np.polyfit(np.log(n), np.log(ev[lo - 1:hi]), 1, w=np.sqrt(1 / n))[0]


def matern_kv(D, nu, ell):
    r = np.sqrt(2 * nu) * D / ell
    with np.errstate(invalid='ignore', divide='ignore'):
        k = 2 ** (1 - nu) / gamma(nu) * r ** nu * kv(nu, r)
    k[r == 0] = 1.0
    return k


W = json.load(open(f'{OUT}/matern_window.json'))
cells = [('8D_MP033_0822', 1.0, 1.0), ('4D_MP034_0920', 0.75, 4.0), ('8D_MP030_0607', 1.5, 0.25),
         ('4D_MP032_0922', 2.5, 8.0), ('8D_MP032_0810', 1.0, 8.0)]
cache = {}
for s, nu, c in cells:
    d = int(s[0])
    if s not in cache:
        im = sio.loadmat(os.path.join(STIM, f'images_{s}.mat'))['imgs']
        X = im.reshape(-1, im.shape[2]).T.astype(np.float64); X -= X.mean(0)
        U, sv, _ = np.linalg.svd(X, full_matrices=False)
        Z = U[:, :d] * sv[:d]
        dv = pdist(Z); cache[s] = (squareform(dv), np.median(dv))
    D, med = cache[s]
    P = len(D); H = np.eye(P) - np.ones((P, P)) / P
    ev = sl.eigh(H @ matern_kv(D, nu, c * med) @ H / P, eigvals_only=True)[::-1]
    ref = next(r for r in W if r['set'] == s and r['nu'] == nu and r['ell'] == c)
    check(f'window 11-500 {s} nu={nu} ell={c}', slope(ev, 11, 500), ref['w11_500'], 5e-4)

# d = 1: direct 32 x 32 kernel matrix against the aliasing formula
C = json.load(open(f'{OUT}/circle_d1.json'))
th = 2 * np.pi * np.arange(32) / 32
for nu, kap in ((1.0, 2.0), (0.5, 8.0), (1.5, 1.0)):
    k = np.arange(1, 200001, dtype=float)
    ck = (1 + (k / kap) ** 2) ** (-(nu + 0.5))
    tail = ck[-1] * k[-1] / (2 * nu)                      # integral remainder of sum_{k > K} c_k
    dth = th[:, None] - th[None, :]
    K = np.zeros((32, 32))
    for j0 in range(0, len(k), 20000):
        kk = k[j0:j0 + 20000]; cc = ck[j0:j0 + 20000]
        K += 2 * np.tensordot(np.cos(dth[..., None] * kk), cc, axes=1)
    K += 2 * tail * (np.abs(dth) < 1e-12)                 # remainder, to first order, on the diagonal
    Hc = np.eye(32) - 1 / 32
    ev = np.linalg.eigvalsh(Hc @ K @ Hc / 32)[::-1][:31]
    ref = next(r for r in C['rows'] if r['nu'] == nu and r['kappa'] == kap)
    check(f'd=1 window 5-30 nu={nu} kappa={kap}', slope(ev, 5, 30), ref['w_sampled'], 2e-3)

# Proposition 1 on random points of the 2-torus.  (a) A demanding case: short common head (M = 3) and heavy,
# very different tails, so that the eigenvalue gap is a sizeable fraction of the bound.  (b) A negative control:
# the heads differ, which the proposition does not allow; the gap must then exceed the tail-mass bound, which
# shows that the check can fail.
rng = np.random.default_rng(5)
kv_ = np.array([(a, b) for a in range(-40, 41) for b in range(-40, 41) if (a, b) != (0, 0)], float)
kn = np.linalg.norm(kv_, axis=1); o = np.argsort(kn, kind='stable'); kv_, kn = kv_[o], kn[o]
jj = np.arange(1, len(kn) + 1.0)


def spec(lam, S):
    phase = 2 * np.pi * S @ kv_.T
    E = np.exp(1j * phase) * np.sqrt(lam)            # complex exponentials, |psi| = 1, so C = 1
    K = (E @ E.conj().T).real
    Hc = np.eye(len(S)) - 1 / len(S)
    return np.linalg.eigvalsh(Hc @ K @ Hc / len(S))[::-1]


worst = 0.0
for trial in range(5):
    S = rng.random((200, 2))
    Mh = 3
    lamA = jj ** -1.05; lamB = lamA.copy()
    lamB[Mh:] = lamA[Mh - 1] * (jj[Mh:] / Mh) ** -4.0        # same head, much lighter tail
    gap = np.max(np.abs(spec(lamA, S) - spec(lamB, S)))
    bound = max(lamA[Mh:].sum(), lamB[Mh:].sum())
    worst = max(worst, gap / bound)
    ok = gap <= bound; fails += not ok
    print(f'{"PASS" if ok else "FAIL"} Proposition 1, 200 random points of T^2, M = {Mh}: max|m - m\'| = {gap:.4f} <= {bound:.4f} (ratio {gap/bound:.2f})')
lamC = lamB.copy(); lamC[0] *= 3                               # heads differ, light tails
gap = np.max(np.abs(spec(lamB, S) - spec(lamC, S))); bound = lamB[Mh:].sum()
ok = gap > bound; fails += not ok
print(f'{"PASS" if ok else "FAIL"} negative control (heads differ): max|m - m\'| = {gap:.4f} exceeds the tail-mass value {bound:.4f}')
print('ALL PASS' if not fails else f'{fails} FAIL')
sys.exit(1 if fails else 0)
