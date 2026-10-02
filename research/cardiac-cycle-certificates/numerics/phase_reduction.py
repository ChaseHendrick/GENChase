"""Weak-coupling (phase-reduction) comparison for the ring rotating 1-waves.  NON-RIGOROUS (floating point).

Nothing here is part of a proof. Every number is computed in IEEE double precision (numpy / scipy), with Fourier
truncation and integration tolerances checked only by varying them. The output is
results/numerics-phase-reduction.json.

Setting. Single cell z' = f(z) of Erhardt's 18-state model at G_Ks = 0.0275, in the scaled variables
z = x / 2^e of model/scales.txt (a diagonal change of variables; it changes no phase, period or exponent, and the
coupling acts on z_V exactly as on V). Periodic orbit z(t) = phi(omega t), phi 2 pi periodic, from the Fourier
centre fourier/data/centre_N1_K32.json (format in fourier/centre.py; parsed here without python-flint).
Ring: x_j' = f(x_j) + c E (x_{j-1} - 2 x_j + x_{j+1}), c = N^2 / 64000 per ms, E the projection on V.

Conventions (stated once, used everywhere).
  * theta is the phase in radians, theta' = omega on the cycle; T = 2 pi / omega.
  * Z(theta) is the infinitesimal phase response in RADIAN units: the gradient of the asymptotic phase (radians)
    with respect to the state at phi(theta). It solves the adjoint equation omega Z'(theta) = -Df(phi(theta))^T Z(theta)
    with the normalisation Z(theta) . phi'(theta) = 1 (equivalently Z . f(phi) = omega). The time-unit PRC
    (ms per unit state) is Z / omega. In the scaled variables Z_z,V = sigma_V Z_x,V with sigma_V = 2^-2 mV.
  * H(psi) = (1/2 pi) int_0^{2 pi} Z_V(theta) (phi_V(theta + psi) - phi_V(theta)) dtheta. The averaged phase model
    is theta_j' = omega + c [H(theta_{j-1} - theta_j) + H(theta_{j+1} - theta_j)]; the "- phi_V(theta)" term is the
    self-coupling -2 c V_j split between the two neighbours, so H(0) = 0. This is Ermentrout's (1992) form
    theta_j' = omega + sum_k H_jk(theta_k - theta_j) with a_jk = H'(theta_k - theta_j); RESEARCH.md, entry
    "2026-10-01 cardiac cell and ring certificates", records Theorem 3.1 / Lemma 3.2 (a_jk >= 0 on a connected
    graph is sufficient for stability). In Fourier: with Z = sum zeta_m e^{i m theta}, phi = sum a_m e^{i m theta},
    H(psi) = sum_m conj(zeta_{m,V}) a_{m,V} (e^{i m psi} - 1).
  * Rotating 1-wave: x_j(t) = phi_N(Omega t + 2 pi j / N), so theta_{j +- 1} - theta_j = +-q, q = 2 pi / N.
    Phase model: it exists for every N (the splay state is forced by the Z_N symmetry), with
    Omega = omega + c [H(q) + H(-q)]  and  T(N) - T(1) ~ -2 pi c [H(q) + H(-q)] / omega^2 to first order in c.
    Linearisation, ring mode u_j ~ e^{i k j q}: lambda_k = c [H'(q)(e^{i k q} - 1) + H'(-q)(e^{-i k q} - 1)], so
    Re lambda_k = -c [H'(q) + H'(-q)] (1 - cos k q),  Im lambda_k = c [H'(q) - H'(-q)] sin k q, k = 1 .. N-1.
    Stable iff H'(q) + H'(-q) > 0.

Comparisons. (a) The certified periods (results/fourier-existence-N*.json) and the floating-point leading exponents
quoted in the README (from results/fourier-stability-N*.json). (b) An independent floating-point Hill computation
of the ring Floquet exponents, block by ring Fourier mode k (block k is the Stage S Hill operator H_0 restricted to
m = k mod N, shifted by i omega k), at coupling s c for s in (0, 1], with the rotating wave recomputed by Newton at each
s. The slope at s -> 0 must reproduce the phase model if the phase model is right; the deviation at s = 1 measures
how far the actual coupling is from the weak-coupling limit. (c) A time-domain cross-check of Z: the monodromy matrix
by central finite differences of the flow over one period (DOP853), whose left eigenvector for the multiplier 1,
normalised against f, is Z / omega at that point. This is the limit, as the number of periods grows, of the phase
shift produced by a small kick, without waiting for the slow transverse decay. A direct kick (finite difference of
the n-th crossing time) is also recorded for a few n.

Usage (bounded, one core):
    OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 nice -n 10 timeout 1800 python3 phase_reduction.py
"""
import json
import math
import os
import platform
import sys
import time

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np  # noqa: E402
import scipy  # noqa: E402
from scipy.integrate import solve_ivp  # noqa: E402
from scipy.sparse.linalg import eigs  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "model"))
from tp06_18d import PARAMS, field  # noqa: E402

DIM, IV = 18, 0
D = 1.0 / 64000.0
NS = (8, 16, 32, 64)
OUT = os.path.join(ROOT, "results", "numerics-phase-reduction.json")
T0 = time.time()


def log(*a):
    print(f"[{time.time() - T0:7.1f}s]", *a, flush=True)


def read_scales():
    with open(os.path.join(ROOT, "model", "scales.txt")) as fh:
        for line in fh:
            if line.strip() and not line.startswith("#"):
                return [int(t) for t in line.split()]


SIG = 2.0 ** np.array(read_scales(), dtype=float)


def dyadic(t):
    t = t.strip()
    s = -1.0 if t.startswith("-") else 1.0
    h, e = t.lstrip("-")[2:].split("p")
    return s * math.ldexp(float(int(h, 16)), int(e))


def load_centre(N, K=32):
    with open(os.path.join(ROOT, "fourier", "data", f"centre_N{N}_K{K}.json")) as fh:
        d = json.load(fh)
    a = np.zeros((DIM, 2 * K + 1), complex)
    for i in range(DIM):
        for m in range(K + 1):
            re, im = (dyadic(t) for t in d["a"][i][m])
            a[i, K + m] = re + 1j * im
            a[i, K - m] = re - 1j * im
    return dyadic(d["omega"]), a


def cert_record(kind, N):
    with open(os.path.join(ROOT, "results", f"fourier-{kind}-N{N}.json")) as fh:
        return json.load(fh)


# ------------------------------------------------------------------------------------------- model (float)
class _NPM:
    exp = staticmethod(np.exp)
    log = staticmethod(np.log)
    sqrt = staticmethod(np.sqrt)


def fs(Z):
    """Scaled field on an (18, L) array (real or complex)."""
    return np.array(field(list(Z * SIG[:, None]), PARAMS, _NPM)) / SIG[:, None]


def jac_cs(Z):
    L = Z.shape[1]
    h = 1e-30
    J = np.empty((L, DIM, DIM))
    for k in range(DIM):
        Zc = Z.astype(complex)
        Zc[k] += 1j * h
        J[:, :, k] = (fs(Zc).imag / h).T
    return J


def samples(a, Mc, deriv=0):
    K = (a.shape[1] - 1) // 2
    m = np.arange(-K, K + 1)
    th = 2 * np.pi * np.arange(Mc) / Mc
    E = np.exp(1j * np.outer(m, th))
    return np.real((a * (1j * m) ** deriv) @ E)


def jac_coeffs(a, Mc, nmax):
    J = jac_cs(samples(a, Mc))
    Jh = np.fft.fft(J, axis=0) / Mc
    return {n: Jh[n % Mc] for n in range(-nmax, nmax + 1)}, J


def damping(m, N, c):
    return 2.0 * c * (1.0 - np.cos(2 * np.pi * np.asarray(m) / N))


def pad(a, K):
    K0 = (a.shape[1] - 1) // 2
    b = np.zeros((DIM, 2 * K + 1), complex)
    b[:, K - K0:K + K0 + 1] = a
    return b


def hill_block(om, Jn, Kh, N, c, k):
    """Block k of the ring Hill operator, unknown index (m, i) -> m-major: row (m + Kh) * 18 + i.
    (B w)_m = -i omega m w_m + sum_n J_{m-n} w_n - d_{m+k} E w_m.  Eigenvalues = ring Floquet exponents of mode k
    (mod i omega)."""
    L = 2 * Kh + 1
    B = np.zeros((L * DIM, L * DIM), complex)
    for r, m in enumerate(range(-Kh, Kh + 1)):
        for s_, n in enumerate(range(-Kh, Kh + 1)):
            B[r * DIM:(r + 1) * DIM, s_ * DIM:(s_ + 1) * DIM] = Jn[m - n]
        B[r * DIM:(r + 1) * DIM, r * DIM:(r + 1) * DIM] -= 1j * om * m * np.eye(DIM)
        if N > 1:
            B[r * DIM + IV, r * DIM + IV] -= damping(m + k, N, c)
    return B


def as_vec(a):
    """(18, 2K+1) -> m-major vector."""
    return a.T.reshape(-1)


def as_arr(v, K):
    return v.reshape(2 * K + 1, DIM).T


# ------------------------------------------------------------------------------------------- 1. adjoint / PRC
def prc(om, a, Kh, Mc):
    Jn, _ = jac_coeffs(a, Mc, 2 * Kh)
    B0 = hill_block(om, Jn, Kh, 1, 0.0, 0)
    ap = pad(a, Kh)
    m = np.arange(-Kh, Kh + 1)
    p = as_vec(ap * (1j * m))                      # coefficients of phi'
    n = B0.shape[0]
    # bordered system: B0^H zeta + p lam = 0, p^H zeta = 1  (range of B0^H is orthogonal to ker B0 = span p)
    A = np.zeros((n + 1, n + 1), complex)
    A[:n, :n] = B0.conj().T
    A[:n, n] = p
    A[n, :n] = p.conj()
    rhs = np.zeros(n + 1, complex)
    rhs[n] = 1.0
    sol = np.linalg.solve(A, rhs)
    zeta = as_arr(sol[:n], Kh)
    fwd_res = np.abs(B0 @ p).max() / np.abs(p).max()
    # pointwise diagnostics
    Mchk = 4 * Kh + 8
    Zs = samples(zeta.conj().conj(), Mchk)   # real part of sum zeta_m e^{i m theta}
    Zimag = np.abs(zeta[:, Kh + 1:] - np.conj(zeta[:, Kh - 1::-1])).max() / np.abs(zeta).max()
    php = samples(ap, Mchk, deriv=1)
    norm_pt = np.einsum("il,il->l", Zs, php)
    return dict(zeta=zeta, Kh=Kh, lam=abs(sol[n]), fwd_res=fwd_res, symmetry_defect=float(Zimag),
                norm_min=float(norm_pt.min()), norm_max=float(norm_pt.max()), Jn=Jn)


def Z_at(zeta, theta):
    Kh = (zeta.shape[1] - 1) // 2
    m = np.arange(-Kh, Kh + 1)
    return np.real(zeta @ np.exp(1j * m * theta))


def Hfun(zeta, a, psi, deriv=0):
    Kh = (zeta.shape[1] - 1) // 2
    ap = pad(a, Kh)
    m = np.arange(-Kh, Kh + 1)
    w = np.conj(zeta[IV]) * ap[IV]
    if deriv == 0:
        return float(np.real(np.sum(w * (np.exp(1j * m * psi) - 1))))
    return float(np.real(np.sum(w * (1j * m) ** deriv * np.exp(1j * m * psi))))


# ------------------------------------------------------------------------------------------- 2. float rotating wave at s c
def newton_wave(om, a, N, c, Mc=256, iters=15, tol=1e-12):
    """Galerkin-Newton for omega phi' = f(phi) + c E Delta_N phi on |m| <= K, phase sum_m a_{m,V} = level."""
    K = (a.shape[1] - 1) // 2
    L = 2 * K + 1
    level = float(np.real(a[IV].sum()))
    m = np.arange(-K, K + 1)
    dm = damping(m, N, c)
    for it in range(iters):
        g = np.fft.fft(fs(samples(a, Mc)), axis=1) / Mc
        gK = np.stack([g[:, mm % Mc] for mm in m], axis=1)
        F = 1j * om * m * a - gK
        F[IV] += dm * a[IV]
        R = np.concatenate([[a[IV].sum() - level], as_vec(F)])
        nr = float(np.abs(R).max())
        if nr < tol:
            break
        Jn, _ = jac_coeffs(a, Mc, 2 * K)
        G = np.zeros((1 + L * DIM, 1 + L * DIM), complex)
        G[0, 1 + np.arange(L) * DIM + IV] = 1.0
        Bh = -hill_block(om, Jn, K, N, c, 0)          # = i om m - J + d_m E
        G[1:, 1:] = Bh
        G[1:, 0] = as_vec(1j * m * a)
        du = np.linalg.solve(G, -R)
        om = om + float(np.real(du[0]))
        a = a + as_arr(du[1:], K)
        b = a.copy()                                   # enforce real symmetry
        for mm in range(1, K + 1):
            v = 0.5 * (a[:, K + mm] + np.conj(a[:, K - mm]))
            b[:, K + mm], b[:, K - mm] = v, np.conj(v)
        b[:, K] = np.real(a[:, K])
        a = b
    return om, a, nr, it


def ring_exponents(om, a, N, c, Kh, Mc, ks):
    """Leading Floquet exponents per ring Fourier mode k (float Hill, truncated at Kh, spurious edge modes filtered).

    One dense eigensolve of the Stage S Hill operator H_0 (hill_block with k = 0). A perturbation of ring mode k,
    u_j = e^{mu t} e^{i k j q} w(omega t + j q) with w 2 pi periodic, is an eigenvector of H_0 with eigenvalue
    mu - i omega k (multiply w by e^{i k theta}); so k = round(-Im / omega) mod N and mu = eigenvalue + i omega k.
    The exponent mu is then defined mod i omega N only through this choice; |Im mu| << omega here."""
    Jn, _ = jac_coeffs(a, Mc, 2 * Kh)
    B = hill_block(om, Jn, Kh, N, c, 0)
    w, V = np.linalg.eig(B)
    mm = np.repeat(np.arange(-Kh, Kh + 1), DIM)
    edge = np.sum(np.abs(V[np.abs(mm) > 3 * Kh // 4]) ** 2, axis=0) / np.sum(np.abs(V) ** 2, axis=0)
    good = edge < 1e-6                       # keep eigenvectors resolved by the truncation
    wg = w[good]
    kk = np.rint(-wg.imag / om).astype(int)
    mu = wg + 1j * om * kk
    kk = kk % N
    out = {}
    for k in ks:
        sel = mu[kk == k]
        sel = sel[np.argsort(-sel.real)]
        uniq = []
        for z in sel:
            if all(abs(z - u) > 1e-9 for u in uniq):
                uniq.append(z)
            if len(uniq) >= 4:
                break
        out[k] = dict(leading=[complex(u) for u in uniq], n_resolved=int(good.sum()))
    return out


# ------------------------------------------------------------------------------------------- 3. time-domain cross-check
def flow(Z0, tend, rtol=1e-12, atol=1e-13):
    n = Z0.shape[1]

    def rhs(t, y):
        return fs(y.reshape(DIM, n)).reshape(-1)
    sol = solve_ivp(rhs, (0.0, tend), Z0.reshape(-1), method="DOP853", rtol=rtol, atol=atol)
    return sol.y[:, -1].reshape(DIM, n), sol.nfev


def fd_monodromy_Z(om, a, theta0, h=1e-5):
    T = 2 * np.pi / om
    K = (a.shape[1] - 1) // 2
    m = np.arange(-K, K + 1)
    z0 = np.real(a @ np.exp(1j * m * theta0))
    cols = [z0]
    for k in range(DIM):
        e = np.zeros(DIM)
        e[k] = h
        cols += [z0 + e, z0 - e]
    Y, nfev = flow(np.array(cols).T, T)
    M = np.empty((DIM, DIM))
    for k in range(DIM):
        M[:, k] = (Y[:, 1 + 2 * k] - Y[:, 2 + 2 * k]) / (2 * h)
    w, VL = np.linalg.eig(M.T)
    j = int(np.argmin(np.abs(w - 1)))
    l = np.real(VL[:, j])
    f0 = fs(z0[:, None])[:, 0]
    Zt = l / (l @ f0)                      # time units: Zt . f = 1
    mods = np.sort(np.abs(np.delete(w, j)))[::-1]
    return dict(Z_theta=om * Zt, closure=float(np.abs(Y[:, 0] - z0).max()), mult_one=complex(w[j]),
                cell_multipliers_top=[float(x) for x in mods[:4]], nfev=int(nfev))


def crossing_times(z0, n_cross, level, tmax):
    """Times of the first n_cross upward crossings of z_V = level."""
    def rhs(t, y):
        return fs(y[:, None])[:, 0]

    def ev(t, y):
        return y[IV] - level
    ev.direction = 1
    sol = solve_ivp(rhs, (0.0, tmax), z0, method="DOP853", rtol=1e-12, atol=1e-13, events=ev)
    return sol.t_events[0][:n_cross]


def direct_kick(om, a, theta0, eps, n_list, mu_slow):
    """Finite-difference phase response: shift of the n-th upward crossing of V = level after a V kick of +-eps."""
    T = 2 * np.pi / om
    K = (a.shape[1] - 1) // 2
    m = np.arange(-K, K + 1)
    z0 = np.real(a @ np.exp(1j * m * theta0))
    level = float(np.real(a[IV].sum()))           # V at theta = 0 (the phase condition level)
    nmax = max(n_list)
    tp, tm = [], []
    for sgn, store in ((1, tp), (-1, tm)):
        z = z0.copy()
        z[IV] += sgn * eps
        store.extend(crossing_times(z, nmax + 1, level, (nmax + 2) * T))
    tp, tm = np.array(tp), np.array(tm)
    out = []
    for n in n_list:
        dt = (tp[n] - tm[n]) / (2 * eps)            # d(crossing time)/d(kick), ms per scaled unit
        out.append(dict(n=n, dtheta_dzV=float(-om * dt)))  # phase advance = -omega dt
    # extrapolation n -> infinity assuming the remainder is dominated by the slowest cell multiplier mu_slow:
    # Delta_n = Z_V + A mu^n  =>  Z_V = (Delta_n2 - mu^(n2 - n1) Delta_n1) / (1 - mu^(n2 - n1))
    ext = []
    for (n1, d1), (n2, d2) in zip([(o["n"], o["dtheta_dzV"]) for o in out[:-1]], [(o["n"], o["dtheta_dzV"]) for o in out[1:]]):
        r = mu_slow ** (n2 - n1)
        ext.append(dict(n1=n1, n2=n2, extrapolated=float((d2 - r * d1) / (1 - r))))
    return out, ext


# ------------------------------------------------------------------------------------------- main
def main():
    rec = dict(
        what="Weak-coupling (phase-reduction) comparison for the ring rotating 1-waves of Erhardt's 18-state model at "
             "G_Ks = 0.0275. NON-RIGOROUS: IEEE double floating point, truncation and tolerances checked only by "
             "variation. Not part of any certificate.",
        status="NON-RIGOROUS (floating point)",
        program="numerics/phase_reduction.py",
        conventions=dict(
            theta="phase in radians, theta' = omega on the cycle, T = 2 pi / omega",
            Z="radian-unit PRC: gradient of asymptotic phase (rad) w.r.t. the scaled state z = x / 2^e; "
              "omega Z' = -Df(phi)^T Z, normalised Z(theta) . phi'(theta) = 1 (equivalently Z . f = omega). "
              "Time-unit PRC = Z / omega (ms per unit). Z_x,V (per mV) = Z_z,V / sigma_V, sigma_V = 2^-2.",
            H="H(psi) = (1/2 pi) int Z_V(theta) (phi_V(theta + psi) - phi_V(theta)) dtheta; phase model "
              "theta_j' = omega + c [H(theta_{j-1} - theta_j) + H(theta_{j+1} - theta_j)] (Ermentrout 1992 form, "
              "a_jk = H'(theta_k - theta_j)). H is invariant under the diagonal scaling.",
            wave="x_j(t) = phi_N(Omega t + 2 pi j / N): theta_{j+-1} - theta_j = +-q, q = 2 pi / N",
            predictions="Omega - omega = c [H(q) + H(-q)]; T(N) - T(1) = 2 pi / Omega - 2 pi / omega (first-order "
                        "Omega); lambda_k = c [H'(q)(e^{ikq} - 1) + H'(-q)(e^{-ikq} - 1)], Re lambda_k = "
                        "-c [H'(q) + H'(-q)] (1 - cos kq), Im lambda_k = c [H'(q) - H'(-q)] sin kq",
            exponents="per ms; Im parts of Floquet exponents are defined mod i omega and are compared folded "
                      "into (-omega/2, omega/2]; the sign of Im depends on k <-> N - k and is compared in modulus"),
    )
    om1, a1 = load_centre(1)
    T1 = 2 * np.pi / om1
    log(f"N = 1 centre: omega = {om1:.15f}, T = {T1:.12f}")

    # ---- 1. PRC with truncation check
    Mc = 1024
    prcs = {}
    for Kh in (32, 48, 64):
        p = prc(om1, a1, Kh, Mc)
        prcs[Kh] = p
        log(f"PRC Kh = {Kh}: fwd residual {p['fwd_res']:.2e}, Z.phi' in [{p['norm_min']:.12f}, {p['norm_max']:.12f}], "
            f"sym defect {p['symmetry_defect']:.1e}")
    zeta = prcs[64]["zeta"]
    th = 2 * np.pi * np.arange(256) / 256
    Zs = np.array([Z_at(zeta, t) for t in th]).T
    Zs48 = np.array([Z_at(prcs[48]["zeta"], t) for t in th]).T
    Zs32 = np.array([Z_at(prcs[32]["zeta"], t) for t in th]).T
    zV = Zs[IV]
    phV = samples(a1, 256)[IV] * SIG[IV]
    iV_max = int(np.argmax(zV))
    iV_min = int(np.argmin(zV))
    rec["prc"] = dict(
        method="spectral adjoint: bordered solve of B0^H zeta = 0, <phi', zeta> = 1, with B0 the single-cell Hill "
               "operator on |m| <= Kh, Df coefficients from 1024 nodes (complex-step Jacobian)",
        truncation_Kh=[32, 48, 64],
        normalisation_pointwise_range={str(k): [prcs[k]["norm_min"], prcs[k]["norm_max"]] for k in prcs},
        max_abs_change_Z_48_to_64=float(np.abs(Zs - Zs48).max()),
        max_abs_change_Z_32_to_64=float(np.abs(Zs - Zs32).max()),
        max_abs_Z=float(np.abs(Zs).max()),
        ZV_rad_per_scaled_unit=dict(max=float(zV.max()), theta_at_max=float(th[iV_max]), min=float(zV.min()),
                                    theta_at_min=float(th[iV_min])),
        ZV_rad_per_mV=dict(max=float(zV.max() / SIG[IV]), min=float(zV.min() / SIG[IV])),
        ZV_ms_per_mV=dict(max=float(zV.max() / SIG[IV] / om1), min=float(zV.min() / SIG[IV] / om1)),
        V_mV_range=[float(phV.min()), float(phV.max())],
        ZV_samples_theta_0_to_2pi_step_2pi_over_32=[float(x) for x in zV[::8]],
        V_samples_mV_same_theta=[float(x) for x in phV[::8]],
    )

    # ---- 2. H, H'
    def Hs(z):
        return {N: dict(q=2 * np.pi / N, Hp=Hfun(z, a1, 2 * np.pi / N), Hm=Hfun(z, a1, -2 * np.pi / N),
                        dHp=Hfun(z, a1, 2 * np.pi / N, 1), dHm=Hfun(z, a1, -2 * np.pi / N, 1)) for N in NS}
    Htab = Hs(zeta)
    Htab48 = Hs(prcs[48]["zeta"])
    psis = 2 * np.pi * np.arange(64) / 64
    rec["H"] = dict(
        units="H in radians (scaled and unscaled agree); H' = dH/dpsi",
        H0=Hfun(zeta, a1, 0.0), dH0=Hfun(zeta, a1, 0.0, 1), d2H0=Hfun(zeta, a1, 0.0, 2), d3H0=Hfun(zeta, a1, 0.0, 3),
        samples_psi_step_2pi_over_64=dict(H=[Hfun(zeta, a1, s) for s in psis],
                                          dH=[Hfun(zeta, a1, s, 1) for s in psis]),
        at_q={str(N): dict(H_q=v["Hp"], H_mq=v["Hm"], dH_q=v["dHp"], dH_mq=v["dHm"],
                           change_Kh48_to_64=max(abs(v[x] - Htab48[N][x]) for x in ("Hp", "Hm", "dHp", "dHm")))
              for N, v in Htab.items()},
    )
    log("H'(0) =", rec["H"]["dH0"], " H''(0) =", rec["H"]["d2H0"])

    # ---- 3/4. predictions vs certified
    rows = []
    for N in NS:
        c = N * N * D
        v = Htab[N]
        dOm = c * (v["Hp"] + v["Hm"])
        T_pred = 2 * np.pi / (om1 + dOm)
        ex = cert_record("existence", N)
        st = cert_record("stability", N)
        TN = float(ex["T_ms"]["lower"]["dec"])
        T1c = float(cert_record("existence", 1)["T_ms"]["lower"]["dec"])
        dT_cert = float(ex["T_ms"]["lower"]["approx"]) - float(cert_record("existence", 1)["T_ms"]["lower"]["approx"])
        # higher-precision difference from the decimal strings
        from decimal import Decimal, getcontext
        getcontext().prec = 40
        dT_cert = float(Decimal(ex["T_ms"]["lower"]["dec"]) - Decimal(cert_record("existence", 1)["T_ms"]["lower"]["dec"]))
        dT_pred = T_pred - T1
        q = 2 * np.pi / N
        lam = [c * (v["dHp"] * (np.exp(1j * k * q) - 1) + v["dHm"] * (np.exp(-1j * k * q) - 1)) for k in range(1, N)]
        lam1 = lam[0]
        fl = st["float_leading_nontrivial_window_eigenvalue"]
        omN = 2 * np.pi / TN
        im_fold = (fl[1] + omN / 2) % omN - omN / 2
        delta = float(st["delta"]["approx"]) if isinstance(st["delta"], dict) else float(st["delta"])
        tau = TN / N
        rows.append(dict(
            N=N, c_per_ms=c, q=q,
            H_q=v["Hp"], H_mq=v["Hm"], dH_q=v["dHp"], dH_mq=v["dHm"],
            stability_sum_dH_q_plus_dH_mq=v["dHp"] + v["dHm"],
            ermentrout_condition_both_nonneg=bool(v["dHp"] >= 0 and v["dHm"] >= 0),
            phase_model_wave_exists=True,
            phase_model_wave_stable=bool(v["dHp"] + v["dHm"] > 0),
            Omega_shift_pred=dOm,
            T1_cert=T1c, TN_cert=TN,
            dT_cert=dT_cert, dT_pred=dT_pred, dT_pred_linear=-2 * np.pi * dOm / om1 ** 2,
            dT_rel_error=(dT_pred - dT_cert) / dT_cert,
            lam1_pred_re=lam1.real, lam1_pred_im_abs=abs(lam1.imag),
            lam_max_pred_re=min(l.real for l in lam),
            lam1_float_re=fl[0], lam1_float_im_abs_folded=abs(im_fold),
            lam1_re_rel_error=(lam1.real - fl[0]) / fl[0],
            lam1_im_rel_error=(abs(lam1.imag) - abs(im_fold)) / abs(im_fold),
            delta_certified=delta,
            reduced_map_rho_pred=math.exp(lam1.real * tau),
            reduced_map_rho_float=math.exp(fl[0] * tau),
            reduced_map_bound_certified=float(st["multiplier_bound_reduced_map"]["approx"]),
            phase_model_says_certificate_possible_at_delta=bool(-lam1.real > delta),
        ))
        log(f"N={N}: dT cert {dT_cert:.6e} pred {dT_pred:.6e} ({rows[-1]['dT_rel_error']:+.3%}); "
            f"Re lam1 pred {lam1.real:.4e} float {fl[0]:.4e} ({rows[-1]['lam1_re_rel_error']:+.3%}); "
            f"|Im| pred {abs(lam1.imag):.4e} float {abs(im_fold):.4e}")
    rec["comparison"] = rows

    # ---- cell transverse exponents (weak-coupling scale) and independent ring Hill exponents vs coupling scale s
    Kh = 48
    cell = ring_exponents(om1, a1, 1, 0.0, Kh, Mc, [0])
    lead = cell[0]["leading"]
    # trivial exponent is ~0; the next is the slowest transverse
    trans = [z for z in lead if abs(z) > 1e-9]
    rec["cell_exponents"] = dict(leading_three_folded=[[z.real, z.imag] for z in lead],
                                 slowest_transverse_re=float(max(z.real for z in trans)),
                                 Kh=Kh, note="single-cell Hill operator, float")
    log("cell leading exponents:", lead)

    scan = []
    for N in NS:
        c = N * N * D
        omN, aN = load_centre(N)
        # sanity: Newton on the certified centre at s = 1 does not move it
        om_s1, a_s1, nr1, _ = newton_wave(omN, aN, N, c)
        ks = list(range(0, N // 2 + 1))
        full = ring_exponents(omN, aN, N, c, Kh, Mc, ks)
        v = Htab[N]
        q = 2 * np.pi / N
        per_k = []
        for k in ks:
            l0 = full[k]["leading"]
            if k == 0:
                l0 = [z for z in l0 if abs(z) > 1e-9]
            lk = c * (v["dHp"] * (np.exp(1j * k * q) - 1) + v["dHm"] * (np.exp(-1j * k * q) - 1))
            per_k.append(dict(k=k, hill_re=l0[0].real, hill_im=l0[0].imag,
                              hill_next_re=l0[1].real if len(l0) > 1 else None,
                              phase_model_re=lk.real if k else None, phase_model_im=lk.imag if k else None,
                              re_rel_error=(lk.real - l0[0].real) / l0[0].real if k else None))
        k_lead = max((pk for pk in per_k), key=lambda pk: pk["hill_re"])
        entry = dict(N=N, newton_at_certified_centre=dict(residual=nr1, omega_change=om_s1 - omN),
                     ring_modes_s1=per_k, leading_mode_k=k_lead["k"], leading_re=k_lead["hill_re"],
                     leading_im=k_lead["hill_im"])
        # coupling-scale scan, k = 1 block
        sc = []
        om_s, a_s = om1, a1.copy()
        lam1_unit = c * (v["dHp"] * (np.exp(1j * 2 * np.pi / N) - 1) + v["dHm"] * (np.exp(-1j * 2 * np.pi / N) - 1))
        for s in (1 / 64, 1 / 16, 1 / 4, 1 / 2, 1.0):
            om_s, a_s, nr, it = newton_wave(om_s, a_s, N, s * c)
            e1 = ring_exponents(om_s, a_s, N, s * c, Kh, Mc, [1])[1]["leading"][0]
            T_s = 2 * np.pi / om_s
            sc.append(dict(s=s, newton_residual=nr, T=T_s, dT_over_s=(T_s - T1) / s,
                           lam1_re_over_s=e1.real / s, lam1_im_over_s=e1.imag / s,
                           ratio_re_to_phase_model=e1.real / (s * lam1_unit.real),
                           ratio_im_to_phase_model=e1.imag / (s * lam1_unit.imag),
                           ratio_dT_to_phase_model=(T_s - T1) / (2 * np.pi / (om1 + s * c * (v["Hp"] + v["Hm"])) - T1)))
            log(f"  N={N} s={s:.4f}: T-T1 = {T_s - T1:.6e}, Re lam1 = {e1.real:.5e}, ratio(re) {sc[-1]['ratio_re_to_phase_model']:.5f}, "
                f"ratio(dT) {sc[-1]['ratio_dT_to_phase_model']:.5f}")
        entry["coupling_scan_k1"] = sc
        entry["s1_float_T_vs_certified"] = sc[-1]["T"] - float(cert_record("existence", N)["T_ms"]["lower"]["approx"])
        scan.append(entry)
        log(f"N={N}: leading ring mode k={k_lead['k']} Re {k_lead['hill_re']:.5e}; per k (hill, phase):",
            [(pk['k'], f"{pk['hill_re']:.3e}", f"{pk['phase_model_re']:.3e}" if pk['k'] else '-') for pk in per_k[:4] + per_k[-1:]])
    rec["hill_float"] = dict(
        what="independent float Hill computation of the ring exponents per ring Fourier mode k (block k = Stage S H_0 "
             "on m = k mod N), Kh = 48, eigenvectors with edge energy above 1e-6 discarded; rotating wave by float "
             "Newton at coupling s c (s = 1 is the certified centre)",
        per_N=scan)

    # ---- weak-coupling diagnostics
    slow_tr = rec["cell_exponents"]["slowest_transverse_re"]
    rec["weak_coupling_diagnostics"] = [dict(
        N=r["N"], c=r["c_per_ms"],
        c_over_omega=r["c_per_ms"] / om1,
        d1_over_omega=damping(1, r["N"], r["c_per_ms"]) / om1,
        dmax_over_omega=4 * r["c_per_ms"] / om1,
        fastest_phase_rate=abs(r["lam_max_pred_re"]),
        slowest_transverse_rate=abs(slow_tr),
        phase_to_transverse_ratio=abs(r["lam_max_pred_re"]) / abs(slow_tr),
    ) for r in rows]

    # ---- 5. time-domain cross-check of Z
    checks = []
    for theta0 in (0.0, np.pi / 2, np.pi, 3 * np.pi / 2):
        fd = fd_monodromy_Z(om1, a1, theta0)
        Zs_ = Z_at(zeta, theta0)
        err = np.abs(fd["Z_theta"] - Zs_).max() / np.abs(Zs_).max()
        checks.append(dict(theta0=theta0, Z_spectral_V=float(Zs_[IV]), Z_fd_V=float(fd["Z_theta"][IV]),
                           rel_err_V=float(abs(fd["Z_theta"][IV] - Zs_[IV]) / abs(Zs_[IV])),
                           max_rel_err_all_components=float(err), closure_after_T=fd["closure"],
                           multiplier_one=[fd["mult_one"].real, fd["mult_one"].imag],
                           cell_multipliers_top_moduli=fd["cell_multipliers_top"], nfev=fd["nfev"]))
        log(f"FD monodromy theta0={theta0:.3f}: Z_V spectral {Zs_[IV]:.8e} fd {fd['Z_theta'][IV]:.8e} rel {checks[-1]['rel_err_V']:.2e}; "
            f"all comps {err:.2e}; top |mu| {fd['cell_multipliers_top'][:2]}")
    kicks = []
    mu_slow = checks[0]["cell_multipliers_top_moduli"][0]
    for theta0 in (np.pi / 2, np.pi):
        dk, ext = direct_kick(om1, a1, theta0, 1e-4, [1, 5, 20, 40, 60], mu_slow)
        kicks.append(dict(theta0=theta0, Z_spectral_V=float(Z_at(zeta, theta0)[IV]), kick_eps_scaled=1e-4, shifts=dk,
                          extrapolated_with_slowest_multiplier=ext, mu_slow=mu_slow))
        log(f"direct kick theta0={theta0:.3f}: spectral {Z_at(zeta, theta0)[IV]:.6e}; ",
            [(d['n'], f"{d['dtheta_dzV']:.6e}") for d in dk], [(e['n1'], e['n2'], f"{e['extrapolated']:.6e}") for e in ext])
    rec["Z_crosscheck"] = dict(
        fd_monodromy=checks,
        fd_method="central differences (h = 1e-5, scaled units) of the DOP853 flow over one period T1 (rtol 1e-12, "
                  "atol 1e-13); Z = omega l / (l . f) with l the left eigenvector of the monodromy for the multiplier "
                  "closest to 1",
        direct_kick=kicks,
        direct_kick_method="V kick of +-1e-4 (scaled) at phi(theta0); dtheta/dz_V = -omega d(t_n)/d(kick) for the n-th "
                           "upward crossing of z_V = level; converges to Z_V(theta0) only as the transverse part decays "
                           "(slowest cell multiplier ~ 0.998 per period), so finite n differs by the undecayed part",
    )
    rec["environment"] = dict(numpy=np.__version__, scipy=scipy.__version__, python=platform.python_version(),
                              machine=platform.machine(), wall_s=time.time() - T0, date=time.strftime("%Y-%m-%d"))

    def clean(o):
        if isinstance(o, dict):
            return {k: clean(v) for k, v in o.items()}
        if isinstance(o, (list, tuple)):
            return [clean(v) for v in o]
        if isinstance(o, (np.floating,)):
            return float(o)
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.bool_,)):
            return bool(o)
        if isinstance(o, complex):
            return [o.real, o.imag]
        return o
    with open(OUT, "w") as fh:
        json.dump(clean(rec), fh, indent=1)
        fh.write("\n")
    log("wrote", OUT)


if __name__ == "__main__":
    main()
