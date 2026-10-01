"""Non-rigorous exploration for the Fourier / Hill design: rotating-wave profile phi of the mixed-type FDE
   phi' = f(phi) + c e1 (phi_V(t-T/N) - 2 phi_V(t) + phi_V(t+T/N)),
solved by Fourier collocation in s = t/T; then the Hill operator spectrum. Scratch only."""
import sys, json, time, numpy as np
sys.path.insert(0, '/home/user/GENChase/research/cardiac-cycle-certificates/model')
from tp06_18d import field, PARAMS
from scipy.integrate import solve_ivp

SIG = 2.0 ** np.array([-2, 0, -5, -1, 0, -28, -28, 0, -4, -2, -1, -8, -5, -1, -10, 2, -3, 3])
D = 1.0 / 64000.0
class CM:  # complex-safe math
    exp = staticmethod(np.exp); log = staticmethod(np.log); sqrt = staticmethod(np.sqrt)

def f_scaled(Z):  # Z: (18, M) scaled -> (18, M) scaled
    X = Z * SIG[:, None]
    return np.array(field(list(X), PARAMS, CM)) / SIG[:, None]

def jac_scaled(Z):  # complex step, returns (M, 18, 18)
    M = Z.shape[1]; J = np.empty((M, 18, 18))
    for j in range(18):
        Zc = Z.astype(complex); Zc[j] += 1e-30j
        J[:, :, j] = (f_scaled(Zc).imag / 1e-30).T
    return J

def dk_of(N, k):
    k = np.asarray(k, float)
    if N == 0: return D * (2 * np.pi * k) ** 2         # continuum
    return 4 * N * N * D * np.sin(np.pi * k / N) ** 2

def solve(Z0, T0, N, M, iters=12, tol=1e-15, verbose=False, frac=1.0):
    k = np.fft.fftfreq(M, 1.0 / M)
    dk = frac * dk_of(N, k)
    Ds = np.real(np.fft.ifft(np.diag(2j * np.pi * k) @ np.fft.fft(np.eye(M), axis=0), axis=0))  # spectral d/ds
    Ld = np.real(np.fft.ifft(np.diag(dk) @ np.fft.fft(np.eye(M), axis=0), axis=0))
    Z, T = Z0.copy(), T0
    lev = 0.2 / SIG[0]
    for it in range(iters):
        F = f_scaled(Z)
        R = (Z @ Ds.T) / T - F
        R[0] += (Z[0] @ Ld.T) * (1.0 / SIG[0]) * SIG[0]
        res = np.concatenate([R.ravel(), [Z[0, 0] - lev]])
        nr = np.max(np.abs(res))
        if verbose: print(f'  it {it} |res| {nr:.3e} T {T:.12f}')
        if nr < tol: break
        J = jac_scaled(Z)
        n = 18 * M
        A = np.zeros((n + 1, n + 1))
        # unknown ordering: Z[i, m] -> i*M + m
        for i in range(18):
            A[i * M:(i + 1) * M, i * M:(i + 1) * M] += Ds / T
        A[0:M, 0:M] += Ld
        for i in range(18):
            for j in range(18):
                A[i * M + np.arange(M), j * M + np.arange(M)] -= J[:, i, j]
        A[:n, n] = -((Z @ Ds.T) / T ** 2).ravel()
        A[n, 0] = 1.0
        dx = np.linalg.solve(A, -res)
        Z = Z + dx[:n].reshape(18, M); T = T + dx[n]
    return Z, T, nr, A

def initial_orbit(M):
    x0 = np.array([0.2, 0.9768524835792948, 0.024741495516535338, 0.5917893263491758, 0.9964058470986472, 4.095848903987073e-09,
                   4.1066743240574905e-09, 0.748897594492505, 0.052896449561713646, 0.33437292014030084, 0.46501264704764994,
                   0.003555812567324667, 0.035429656289937016, 0.36968547042408867, 0.0009478783592908003, 3.188603404050898,
                   0.1395309372387298, 9.532224323811514])
    T = 53.5858298914697
    rhs = lambda t, x: field(x, PARAMS)
    sol = solve_ivp(rhs, (0, T), x0, method='Radau', rtol=1e-11, atol=1e-14 * np.maximum(np.abs(x0), 1e-9), dense_output=True,
                    t_eval=np.arange(M) * T / M)
    return sol.y / SIG[:, None], T

if __name__ == '__main__':
    M = int(sys.argv[1]) if len(sys.argv) > 1 else 64
    t0 = time.time()
    Z, T = initial_orbit(M)
    print('initial orbit', time.time() - t0)
    out = {}
    Z1, T1, nr, A = solve(Z, T, 1, M, verbose=True)
    np.savez(f'/tmp/claude-0/-home-user-GENChase/8e652c2a-6f64-5009-9ee8-187ba6394e5c/scratchpad/fourier/orbit_N1_M{M}.npz', Z=Z1, T=T1)
    print('N=1 T', T1, 'res', nr, time.time() - t0)
    for N in (8, 16, 32, 64, 0):
        Zc, Tc = Z1.copy(), T1
        # continuation in the coupling strength
        k = np.fft.fftfreq(M, 1.0 / M)
        for frac in (0.25, 0.5, 0.75, 1.0):
            Zc, Tc, nr, A = solve(Zc, Tc, N, M, frac=frac)
        Zc, Tc, nr, A = solve(Zc, Tc, N, M)
        np.savez(f'/tmp/claude-0/-home-user-GENChase/8e652c2a-6f64-5009-9ee8-187ba6394e5c/scratchpad/fourier/orbit_N{N}_M{M}.npz', Z=Zc, T=Tc)
        V = Zc[0] * SIG[0]
        print(f'N={N} T={Tc:.10f} res={nr:.2e} V range {V.min():.6f}..{V.max():.6f}  t={time.time()-t0:.1f}s')
