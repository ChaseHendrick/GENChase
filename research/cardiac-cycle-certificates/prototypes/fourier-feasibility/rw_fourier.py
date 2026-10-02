"""Feasibility test (ordinary floating point, untrusted): the rotating wave of the N-cell ring as an 18-dim
periodic profile phi with x_j(t) = phi(t + j T/N), solved pseudo-spectrally, and the ring's Floquet spectrum from
the single Hill block H_0 (N enters only via the damping -4 c sin^2(pi m / N) on V at Fourier mode m).
"""
import json, math, sys, time
import numpy as np
from scipy.integrate import solve_ivp

sys.path.insert(0, "/home/user/GENChase/research/cardiac-cycle-certificates/model")
from tp06_18d import PARAMS, field  # noqa: E402

SCALE_EXP = [-2, 0, -5, -1, 0, -28, -28, 0, -4, -2, -1, -8, -5, -1, -10, 2, -3, 3]
SIG = np.array([2.0 ** e for e in SCALE_EXP])
D = 1 / 64000.0


def fs(Z):
    """scaled field on an array Z of shape (18, L) (real or complex)."""
    X = Z * SIG[:, None]
    return np.array(field(list(X), PARAMS, M=np)) / SIG[:, None]


def jac_cs(Z):
    """complex-step Jacobian at each column: returns (L, 18, 18)."""
    L = Z.shape[1]; h = 1e-30
    J = np.empty((L, 18, 18))
    for k in range(18):
        Zc = Z.astype(complex); Zc[k] += 1j * h
        J[:, :, k] = (fs(Zc).imag / h).T
    return J


def single_cell_samples(L):
    sec = json.load(open("/home/user/GENChase/research/cardiac-cycle-certificates/results/numerics-hopf-orbit.json"))
    x0 = np.array(list(sec["section_point_V0.2"].values()))
    T = sec["period_ms_last"]
    f = lambda t, y: np.array(field(list(y), PARAMS))
    sol = solve_ivp(f, (0, T), x0, method="LSODA", rtol=1e-12, atol=1e-14, dense_output=True)
    ts = np.arange(L) * T / L
    return sol.sol(ts) / SIG[:, None], 2 * math.pi / T


def spectral_mats(L, N):
    k = np.fft.fftfreq(L, 1.0 / L)
    F = np.fft.fft(np.eye(L), axis=0)
    Fi = np.fft.ifft(np.eye(L), axis=0)
    Dm = np.real(Fi @ np.diag(1j * k) @ F)
    lap = -4 * np.sin(np.pi * k / N) ** 2 if N > 0 else np.zeros(L)
    Cm = np.real(Fi @ np.diag(lap) @ F)
    return Dm, Cm


def solve_rw(Z, om, N, L, c, iters=30, verbose=False):
    Dm, Cm = spectral_mats(L, N)
    lvl = 0.2 / SIG[0]
    n = 18 * L
    for it in range(iters):
        Fz = fs(Z)
        R = om * Z @ Dm.T - Fz
        R[0] -= c * (Z[0] @ Cm.T)
        res = np.concatenate([R.ravel(), [Z[0, 0] - lvl]])
        if verbose:
            print(f"  it {it}: |res| = {np.abs(res).max():.3e}  omega = {om:.15f}")
        if np.abs(res).max() < 1e-13:
            break
        Jt = jac_cs(Z)
        A = np.zeros((n + 1, n + 1))
        for i in range(18):
            A[i * L:(i + 1) * L, i * L:(i + 1) * L] += om * Dm
        A[0:L, 0:L] -= c * Cm
        for i in range(18):
            for kk in range(18):
                A[i * L:(i + 1) * L, kk * L:(kk + 1) * L] -= np.diag(Jt[:, i, kk])
        A[:n, n] = (Z @ Dm.T).ravel()
        A[n, 0] = 1.0
        du = np.linalg.solve(A, -res)
        Z = Z + du[:n].reshape(18, L)
        om = om + du[n]
    return Z, om, np.abs(res).max(), A


def hill_spectrum(Z, om, N, c, M):
    L = Z.shape[1]
    Jt = jac_cs(Z)  # (L, 18, 18) at t_j
    An = np.fft.fft(Jt, axis=0) / L  # An[n] for n in fftfreq order
    kf = np.fft.fftfreq(L, 1.0 / L).astype(int)
    Amap = {int(kf[i]): An[i] for i in range(L)}
    ms = np.arange(-M, M + 1)
    nb = len(ms)
    H = np.zeros((18 * nb, 18 * nb), complex)
    for a, m in enumerate(ms):
        for b, mp in enumerate(ms):
            d = m - mp
            if d in Amap:
                H[18 * a:18 * a + 18, 18 * b:18 * b + 18] = Amap[d]
        H[18 * a:18 * a + 18, 18 * a:18 * a + 18] += -1j * om * m * np.eye(18)
        if N > 0:
            H[18 * a, 18 * a] += -4 * c * math.sin(math.pi * m / N) ** 2
    return H, Amap


def main():
    L = int(sys.argv[1]) if len(sys.argv) > 1 else 33
    Ns = [int(v) for v in sys.argv[2].split(",")] if len(sys.argv) > 2 else [1, 8, 16, 32, 64]
    t0 = time.time()
    Z, om = single_cell_samples(L)
    print(f"single-cell samples ready ({time.time() - t0:.1f}s), T = {2 * math.pi / om:.10f}")
    out = {}
    for N in Ns:
        c = N * N * D if N > 1 else 0.0
        Neff = N if N > 1 else 0
        Z, om, res, A = solve_rw(Z, om, Neff, L, c)
        T = 2 * math.pi / om
        Zh = np.fft.fft(Z, axis=1) / L
        kf = np.fft.fftfreq(L, 1.0 / L).astype(int)
        mags = [float(np.abs(Zh[:, kf == m]).max()) for m in range(0, (L - 1) // 2 + 1)]
        sv = np.linalg.svd(A, compute_uv=False)
        print(f"N={N}: T = {T:.12f} ms, residual {res:.2e}, Newton cond {sv[0] / sv[-1]:.2e}, 1/smin {1 / sv[-1]:.2e}")
        print("   max_i |a_m,i| (scaled) for m=0..:", " ".join(f"{v:.1e}" for v in mags[:14]))
        M = (N // 2 if N > 1 else 0) + 16
        t1 = time.time()
        H, Amap = hill_spectrum(Z, om, Neff, c, M)
        ev = np.linalg.eigvals(H)
        half = om * max(N, 1) / 2
        sel = ev[np.abs(ev.imag) <= half + 1e-12]
        sel = sel[np.argsort(-sel.real)]
        tau = T / max(N, 1)
        print(f"   Hill truncation 18*{2 * M + 1} = {H.shape[0]} ({time.time() - t1:.1f}s); eigenvalues in strip: {len(sel)} (expect {18 * max(N, 1)})")
        for e in sel[:8]:
            print(f"     mu = {e.real:+.6e} {e.imag:+.6e}i   |e^(mu tau)| = {abs(np.exp(e * tau)):.12f}")
        nontriv = sel[np.abs(sel) > 1e-7]
        lead = nontriv[0]
        print(f"   leading nontrivial: Re mu = {lead.real:.4e}/ms, section-map margin 1-|e^(mu tau)| = {1 - abs(np.exp(lead * tau)):.4e}")
        offd = max(float(np.abs(Amap[n]).max()) for n in Amap if n != 0)
        print(f"   max |A_n| (n != 0) = {offd:.2e}, max |A_0| = {np.abs(Amap[0]).max():.2e}, spec(A_0) Re range "
              f"[{np.linalg.eigvals(Amap[0]).real.min():.2e}, {np.linalg.eigvals(Amap[0]).real.max():.2e}]")
        out[N] = dict(T=T, lead=[lead.real, lead.imag], margin=1 - abs(np.exp(lead * tau)))
    print(json.dumps(out))


if __name__ == "__main__":
    main()
