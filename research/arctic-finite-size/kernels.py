"""Discrete orthogonal polynomial ensembles and their extreme particle.

An M-point orthogonal polynomial ensemble on {0, ..., N} with weight w is the measure
    P(x_1, ..., x_M) proportional to prod_{i<j} (x_i - x_j)^2 prod_i w(x_i).
It is determinantal with kernel K(x, y) = sum_{k<M} phi_k(x) phi_k(y), phi_k = p_k sqrt(w) orthonormal.

The orthonormal functions are read off the eigenvectors of the (N+1) x (N+1) Jacobi matrix of the
weight: its eigenvalues are exactly the support points 0..N, and the eigenvector for the point x is
(phi_0(x), ..., phi_N(x)) up to sign. Signs do not matter for gap probabilities (a diagonal +-1
similarity), and nothing here evaluates the weight itself, so nothing underflows however far a site
sits in the tail. Only the closed-form recurrence coefficients enter.

The gap probabilities P(no particle in {t, ..., N}) = det(I - K) restricted to {t..N} are the trailing
principal minors of I - K; one Cholesky factorization of I - K in reversed order gives all of them.
"""
import numpy as np
from scipy.linalg import eigh_tridiagonal


def krawtchouk_jacobi(N, p=0.5):
    """Jacobi matrix of the binomial weight C(N, x) p^x q^(N-x) on {0..N}."""
    q = 1.0 - p
    k = np.arange(N + 1, dtype=float)
    diag = p * (N - k) + q * k
    kk = np.arange(1, N + 1, dtype=float)
    off = np.sqrt(p * q * kk * (N - kk + 1))
    return diag, off


def hahn_jacobi(N, alpha, beta):
    """Jacobi matrix of Johansson's Hahn weight (PTRF 123 (2002), eq. 4.4),
    w(t) = (N + alpha - t)! (beta + t)! / (t! (N - t)!), t in {0..N}.
    This is the Koekoek-Swarttouw Hahn weight C(aK + t, t) C(bK + N - t, N - t) with aK = beta and
    bK = alpha, whose three-term recurrence is -x Q_n = A_n Q_{n+1} - (A_n + C_n) Q_n + C_n Q_{n-1}."""
    aK, bK = float(beta), float(alpha)
    s = aK + bK
    k = np.arange(N + 1, dtype=float)
    A = (k + s + 1) * (k + aK + 1) * (N - k) / ((2 * k + s + 1) * (2 * k + s + 2))
    with np.errstate(divide='ignore', invalid='ignore'):
        C = k * (k + s + N + 1) * (k + bK) / ((2 * k + s) * (2 * k + s + 1))
    C[0] = 0.0
    diag = A + C
    off = np.sqrt(A[:-1] * C[1:])
    return diag, off


def orthonormal_functions(diag, off):
    """Return Phi with Phi[k, x] = phi_k(x) (up to the sign of each column x), x = 0..N."""
    lam, V = eigh_tridiagonal(diag, off)
    N = len(diag) - 1
    # eigenvalues are the support points 0..N in increasing order
    err = np.max(np.abs(lam - np.arange(N + 1)))
    assert err < 1e-6 * max(1, N), 'Jacobi eigenvalues are not the support points: %g' % err
    return V


def top_gap_probabilities(Phi, M, tol=1e-30):
    """D[t] = P(no particle in {t, ..., N}) for the M-point ensemble, t = 0..N+1 (D[N+1] = 1).
    Computed from the top down; once D falls below tol the remaining values are set to 0 (their
    true values are below tol)."""
    N = Phi.shape[1] - 1
    D = np.zeros(N + 2)
    D[N + 1] = 1.0
    if M == 0:
        D[:] = 1.0
        return D
    F = Phi[:M, :]                         # M x (N+1)
    # I - K restricted to the sites, in reversed order: site N first
    det = 1.0
    cols = []                              # the sites entered so far, top down
    Lmat = np.zeros((0, 0))
    for t in range(N, -1, -1):
        f = F[:, t]
        # new row/column of I - K against the sites already entered
        if cols:
            kvec = -(F[:, cols].T @ f)     # (I - K)(t', t) = -K(t', t) for t' != t
            y = _forward(Lmat, kvec)
        else:
            y = np.zeros(0)
        piv = (1.0 - f @ f) - y @ y
        if piv <= 0.0:
            piv = 0.0
        det *= piv
        D[t] = det
        if det < tol:
            break
        d = np.sqrt(piv)
        n0 = len(cols)
        newL = np.zeros((n0 + 1, n0 + 1))
        newL[:n0, :n0] = Lmat
        newL[n0, :n0] = y
        newL[n0, n0] = d
        Lmat = newL
        cols.append(t)
    return D


def _forward(L, b):
    from scipy.linalg import solve_triangular
    return solve_triangular(L, b, lower=True, check_finite=False)


def expected_max(Phi, M):
    """E[max particle] for the M-point ensemble on {0..N}: sum_{t=1}^{N} P(max >= t)."""
    N = Phi.shape[1] - 1
    D = top_gap_probabilities(Phi, M)
    # P(max >= t) = 1 - P(no particle in {t..N}) = 1 - D[t]
    return float(np.sum(1.0 - D[1:N + 1])), D


def expected_min(Phi, M):
    """E[min particle], by reflecting the sites."""
    Phr = Phi[:, ::-1]
    N = Phi.shape[1] - 1
    em, _ = expected_max(Phr, M)
    return N - em


def expected_max_jacobi(diag, off, M, tol=1e-30, W0=64, skip=1e-32):
    """E[max particle] of the M-point ensemble with the given Jacobi matrix.

    Only the eigenvectors of the sites in a window [lo, hi] are computed. hi sits above the largest
    zero of p_M (the top eigenvalue of the leading M x M Jacobi block) by an Airy-tail margin and is
    raised until K(hi, hi) < skip; sites above hi are empty to within skip, so their factors
    1 - K(x, x) in the gap probability are 1 to that accuracy. lo doubles downward until the gap
    probability has fallen below tol inside the window, so every omitted term 1 - D_t is 1 to tol."""
    N = len(diag) - 1
    if M == 0:
        return 0.0
    if M > N:
        return float(N)
    from scipy.linalg import eigvalsh_tridiagonal
    zmax = eigvalsh_tridiagonal(diag[:M], off[:M - 1], select='i', select_range=(M - 1, M - 1))[0] if M > 1 else diag[0]
    margin = 20 + 20 * (N + 1) ** (1 / 3)
    hi = int(min(N, np.ceil(zmax + margin)))
    W = W0
    while True:
        lo = max(0, hi + 1 - W)
        lam, V = eigh_tridiagonal(diag, off, select='i', select_range=(lo, hi))
        err = np.max(np.abs(lam - np.arange(lo, hi + 1)))
        assert err < 1e-6 * max(1, N), 'Jacobi eigenvalues are not the support points: %g' % err
        kd = np.einsum('kx,kx->x', V[:M, :], V[:M, :])
        if hi < N and kd[-1] > skip:
            hi = min(N, hi + int(margin))       # the window's top is not empty yet: raise it
            continue
        Phi = np.zeros((M, N + 1))
        Phi[:, lo:hi + 1] = V[:M, :]
        above = np.nonzero(kd > skip)[0]
        top = lo + int(above[-1]) if len(above) else lo
        D = top_gap_probabilities_window(Phi, lo, tol, top)
        if D[lo] < tol or lo == 0:
            break
        W = 2 * W
    return float(np.sum(1.0 - D[1:N + 1]))


def top_gap_probabilities_window(Phi, lo, tol, top=None):
    """As top_gap_probabilities, using only the columns lo..top of Phi (sites above top are taken
    as empty, D = 1 there); D[t] = 0 for t < lo unless the recursion reaches them."""
    N = Phi.shape[1] - 1
    if top is None:
        top = N
    D = np.zeros(N + 2)
    D[top + 1:] = 1.0
    F = Phi
    det = 1.0
    cols = []
    Lmat = np.zeros((0, 0))
    for t in range(top, lo - 1, -1):
        f = F[:, t]
        y = _forward(Lmat, -(F[:, cols].T @ f)) if cols else np.zeros(0)
        piv = (1.0 - f @ f) - y @ y
        if piv <= 0.0:
            piv = 0.0
        det *= piv
        D[t] = det
        if det < tol:
            break
        n0 = len(cols)
        newL = np.zeros((n0 + 1, n0 + 1))
        newL[:n0, :n0] = Lmat
        newL[n0, :n0] = y
        newL[n0, n0] = np.sqrt(piv)
        Lmat = newL
        cols.append(t)
    return D
