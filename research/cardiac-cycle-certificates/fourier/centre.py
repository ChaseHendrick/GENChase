"""High-precision numerical centre of the rotating 1-wave profile (Stage E input). UNTRUSTED.

Nothing in this file is part of a proof. It proposes a centre xbar = (omega, a_m for |m| <= K) that
``existence.py`` then checks rigorously; a wrong or sloppy centre can only make that check fail.

Problem (scaled variables z = x / sigma, model/scales.txt). The ring of N cells, cell j coupled by
c (V_{j-1} - 2 V_j + V_{j+1}) with c = N^2 D, has rotating 1-waves x_j(t) = phi(omega t + 2 pi j / N) where phi is
2 pi periodic in R^18. On Fourier modes phi = sum_m a_m e^{i m theta}:

    F_m(omega, a) = i omega m a_m - [f o phi]_m + d_m E a_m = 0,     d_m = 4 c sin^2(pi m / N) = arbmodel.damping,
    phase:        sum_m a_{m,V} = s / sigma_V,                       s = the double nearest 0.2 (mV),

E the projection on the V component (component 0). N = 1 is the single cell (d_m = 0).

Method. (1) Seed: the single-cell orbit samples in fourier/data/orbit_N1_M64.json (double, from the design panel's
feasibility run) -> Fourier coefficients for |m| < 32. (2) Galerkin-Newton in double precision on |m| <= K (model
evaluated with the float reference model/tp06_18d.py through numpy; Jacobian by complex step), with continuation in
the coupling for N > 1 if a direct step does not converge. (3) Refinement at ``prec`` bits: the residual of the
truncated system is evaluated in Arb with arbmodel.f (exact decimals) on Mc nodes (DFT, aliasing ignored: this is not
a bound), and corrected with the double Galerkin matrix (a chord method). Every iterate is made exactly symmetric:
a_{-m} = conj(a_m), a_0 and omega real, all exact dyadic numbers.

Saved format (fourier/data/centre_N{N}_K{K}.json): every number is an exact dyadic written as
"<sign>0x<hex mantissa>p<binary exponent>" (value = mantissa * 2^exponent), plus the provenance of the run.

Usage:  PYTHONPATH=<python-flint 0.9.0> nice timeout 1800 python3 centre.py --N 1,8,16,32,64 [--K 32] [--prec 256]
"""
import argparse
import hashlib
import json
import math
import os
import sys
import time

import numpy as np
from scipy.linalg import lu_factor, lu_solve

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "model"))

from flint import acb, arb, ctx, fmpq, fmpz  # noqa: E402

import arbmodel as am  # noqa: E402
import fourier_eval as fe  # noqa: E402
from tp06_18d import PARAMS, field  # noqa: E402

DATA = os.path.join(HERE, "data")
SEED_FILE = os.path.join(DATA, "orbit_N1_M64.json")
DIM = 18
IV = 0
SIG = 2.0 ** np.array(am.SCALE_EXP, dtype=float)
D = 1.0 / 64000.0
LEVEL_FLOAT = 0.2 / SIG[IV]          # s / sigma_V, exact in binary (a power-of-two multiple of the double 0.2)


# ------------------------------------------------------------------------------------------- exact dyadic text
def dyadic_to_text(x):
    """Exact text of an exact arb (dyadic): '<sign>0x<hex>p<exp>'."""
    if not isinstance(x, arb):
        x = arb(x)
    if not x.is_exact():
        raise ValueError("not an exact dyadic number")
    if x.is_zero():
        return "0x0p0"
    man, exp = x.man_exp()
    man, exp = int(man), int(exp)
    s = "-" if man < 0 else ""
    return f"{s}0x{abs(man):x}p{exp}"


def text_to_dyadic(t, prec=1024):
    """The exact arb of a '<sign>0x<hex>p<exp>' text (raises if it cannot be represented exactly at prec)."""
    t = t.strip()
    neg = t.startswith("-")
    if neg:
        t = t[1:]
    if not t.startswith("0x") or "p" not in t:
        raise ValueError(f"bad dyadic text {t!r}")
    h, e = t[2:].split("p")
    man, exp = int(h, 16), int(e)
    if man.bit_length() > prec - 8:
        raise ValueError("mantissa too long for the requested precision")
    old = ctx.prec
    ctx.prec = prec
    try:
        v = arb(fmpz(-man if neg else man))
        v = v * arb(2) ** exp if exp >= 0 else v * arb(fmpq(1, 2 ** (-exp)))
    finally:
        ctx.prec = old
    if not v.is_exact():
        raise ValueError("dyadic text did not convert exactly")
    return v


def level_exact():
    """s / sigma_V as an exact arb: s = the double nearest 0.2, sigma_V = 2^SCALE_EXP[V] (exact)."""
    v = arb(0.2) * am.ISIG[IV].real
    assert v.is_exact()
    return v


# ------------------------------------------------------------------------------------------- double model
class _NPM:
    exp = staticmethod(np.exp)
    log = staticmethod(np.log)
    sqrt = staticmethod(np.sqrt)


def fs(Z):
    """Scaled field on an (18, L) array (reference model, float literals; untrusted)."""
    X = Z * SIG[:, None]
    return np.array(field(list(X), PARAMS, _NPM)) / SIG[:, None]


def jac_cs(Z):
    """Complex-step Jacobian of the scaled field at each column of a real (18, L) array: (L, 18, 18)."""
    L = Z.shape[1]
    h = 1e-30
    J = np.empty((L, DIM, DIM))
    for k in range(DIM):
        Zc = Z.astype(complex)
        Zc[k] += 1j * h
        J[:, :, k] = (fs(Zc).imag / h).T
    return J


def damping_float(m, N):
    if N == 1:
        return 0.0
    return 4.0 * N * N * D * math.sin(math.pi * m / N) ** 2


class Layout:
    """Unknowns u = (omega, a_{i,m}) and equations (phase, F_{i,m}), |m| <= K, component-major:
    index 0 = omega (resp. phase), index 1 + i (2K+1) + (m + K) = (i, m)."""

    def __init__(self, K):
        self.K = K
        self.L = 2 * K + 1
        self.n = 1 + DIM * self.L

    def idx(self, i, m):
        return 1 + i * self.L + (m + self.K)

    def rows_of_mode(self, m):
        return 1 + np.arange(DIM) * self.L + (m + self.K)


def nodes_matrix(K, Mc):
    th = 2 * np.pi * np.arange(Mc) / Mc
    return np.exp(1j * np.outer(np.arange(-K, K + 1), th))   # (2K+1) x Mc


def phi_samples(a, Mc):
    K = (a.shape[1] - 1) // 2
    return np.real(a @ nodes_matrix(K, Mc))                 # (18, Mc)


def dft(G, K):
    """(1/Mc) sum_j G[:, j] e^{-i m theta_j}, m = -K..K -> (rows, 2K+1)."""
    Mc = G.shape[-1]
    E = np.conj(nodes_matrix(K, Mc)).T                       # Mc x (2K+1)
    return (G @ E) / Mc


def residual_double(om, a, N, Mc):
    lay = Layout((a.shape[1] - 1) // 2)
    K = lay.K
    g = dft(fs(phi_samples(a, Mc)).astype(complex), K)
    R = np.empty(lay.n, complex)
    R[0] = a[IV].sum() - LEVEL_FLOAT
    for t, m in enumerate(range(-K, K + 1)):
        Fm = 1j * om * m * a[:, t] - g[:, t]
        Fm[IV] += damping_float(m, N) * a[IV, t]
        R[lay.rows_of_mode(m)] = Fm
    return R


def jacobian_coeffs(a, Mc, nmax):
    """Fourier coefficients J_n of Df(phi(theta)), |n| <= nmax, from Mc nodes (double)."""
    J = jac_cs(phi_samples(a, Mc))                           # (Mc, 18, 18)
    Jh = np.fft.fft(J, axis=0) / Mc
    return {n: Jh[n % Mc] for n in range(-nmax, nmax + 1)}


def galerkin_matrix(om, a, Jn, N):
    lay = Layout((a.shape[1] - 1) // 2)
    K = lay.K
    G = np.zeros((lay.n, lay.n), complex)
    for m in range(-K, K + 1):
        G[0, lay.idx(IV, m)] = 1.0
    for m in range(-K, K + 1):
        r = lay.rows_of_mode(m)
        G[r, 0] = 1j * m * a[:, m + K]
        for m2 in range(-K, K + 1):
            c = lay.rows_of_mode(m2)
            G[np.ix_(r, c)] -= Jn[m - m2]
        G[r, r] += 1j * om * m
        G[r[IV], r[IV]] += damping_float(m, N)
    return G


def symmetrize(om, a):
    K = (a.shape[1] - 1) // 2
    b = a.copy()
    for m in range(1, K + 1):
        v = 0.5 * (a[:, K + m] + np.conj(a[:, K - m]))
        b[:, K + m] = v
        b[:, K - m] = np.conj(v)
    b[:, K] = np.real(a[:, K])
    return float(np.real(om)), b


def unpack(lay, du):
    K = lay.K
    da = np.empty((DIM, lay.L), complex)
    for i in range(DIM):
        da[i] = du[1 + i * lay.L: 1 + (i + 1) * lay.L]
    return du[0], da


def seed(K):
    with open(SEED_FILE) as fh:
        d = json.load(fh)
    Z = np.array(d["Z"], dtype=float)
    L = Z.shape[1]
    Zh = np.fft.fft(Z, axis=1) / L
    a = np.zeros((DIM, 2 * K + 1), complex)
    for m in range(-min(K, L // 2 - 1), min(K, L // 2 - 1) + 1):
        a[:, m + K] = Zh[:, m % L]
    return 2 * math.pi / float(d["T_ms"]), a, hashlib.sha256(open(SEED_FILE, "rb").read()).hexdigest()


def newton_double(om, a, N, Mc, iters=12, tol=1e-13, frac_steps=(1.0,), log=print):
    for frac in frac_steps:
        for it in range(iters):
            R = residual_scaled(om, a, N, Mc, frac)   # continuation in the coupling strength (frac < 1)
            nr = float(np.abs(R).max())
            log(f"    double Newton (coupling x{frac}) it {it}: |R| = {nr:.3e}  omega = {om:.15f}")
            if nr < tol:
                break
            Jn = jacobian_coeffs(a, Mc, 2 * ((a.shape[1] - 1) // 2))
            G = galerkin_matrix(om, a, Jn, N)
            if frac != 1.0:
                G = galerkin_scaled(G, a, N, frac)
            du = np.linalg.solve(G, -R)
            dom, da = unpack(Layout((a.shape[1] - 1) // 2), du)
            om, a = symmetrize(om + dom, a + da)
    return om, a, nr


def residual_scaled(om, a, N, Mc, frac):
    lay = Layout((a.shape[1] - 1) // 2)
    R = residual_double(om, a, N, Mc)
    for m in range(-lay.K, lay.K + 1):
        R[lay.idx(IV, m)] -= (1 - frac) * damping_float(m, N) * a[IV, m + lay.K]
    return R


def galerkin_scaled(G, a, N, frac):
    lay = Layout((a.shape[1] - 1) // 2)
    G = G.copy()
    for m in range(-lay.K, lay.K + 1):
        G[lay.idx(IV, m), lay.idx(IV, m)] -= (1 - frac) * damping_float(m, N)
    return G


# ------------------------------------------------------------------------------------------- Arb refinement
def to_exact(om, a, prec):
    """Exact balls (mid only) for omega and the coefficient array, symmetric."""
    K = (a.shape[1] - 1) // 2
    old = ctx.prec
    ctx.prec = prec
    try:
        omb = arb(float(om)) if not isinstance(om, arb) else om.mid()
        A = [[None] * (2 * K + 1) for _ in range(DIM)]
        for i in range(DIM):
            A[i][K] = acb(arb(float(np.real(a[i, K]))))
            for m in range(1, K + 1):
                v = acb(complex(a[i, K + m]))
                A[i][K + m] = v
                A[i][K - m] = v.conjugate()
    finally:
        ctx.prec = old
    return omb, A


def residual_arb(om, A, N, Mc, prec, prm=None):
    """Arb residual of the truncated system (aliasing of the Mc-node DFT ignored: untrusted)."""
    K = (len(A[0]) - 1) // 2
    lay = Layout(K)
    prm = prm or am.params(prec)
    f = lambda z: am.f(z, prm, prec=prec)  # noqa: E731
    phi = fe.TrigPoly(A)
    G = fe.node_values(f, phi, Mc, prec=prec)
    C = fe.aliased_dft(G, K, prec=prec)
    old = ctx.prec
    ctx.prec = prec
    try:
        R = [None] * lay.n
        s = acb(0)
        for m in range(-K, K + 1):
            s += A[IV][m + K]
        R[0] = s - acb(level_exact())
        for m in range(-K, K + 1):
            dm = am.damping(m, N=N, prec=prec) if N > 1 else acb(0)
            for i in range(DIM):
                v = acb(0, m) * om * A[i][m + K] - C[i][m + K]
                if i == IV:
                    v += dm * A[i][m + K]
                R[lay.idx(i, m)] = v
    finally:
        ctx.prec = old
    return R


def refine(om, A, N, G, Mc, prec, iters=8, tol=1e-36, log=print):
    lay = Layout((len(A[0]) - 1) // 2)
    K = lay.K
    lu = lu_factor(G)
    hist = []
    for it in range(iters):
        R = residual_arb(om, A, N, Mc, prec)
        mx = max(float(r.abs_upper()) for r in R)
        hist.append(mx)
        log(f"    Arb refinement ({prec} bits, Mc = {Mc}) it {it}: max |R| = {mx:.3e}")
        if mx < tol:
            break
        Rd = np.array([complex(float(r.real.mid()), float(r.imag.mid())) for r in R])
        du = lu_solve(lu, -Rd)
        dom, da = unpack(lay, du)
        old = ctx.prec
        ctx.prec = prec
        try:
            om = (om + arb(float(np.real(dom)))).mid()
            for i in range(DIM):
                A[i][K] = acb((A[i][K].real + arb(float(np.real(da[i, K])))).mid())
                for m in range(1, K + 1):
                    v = 0.5 * (da[i, K + m] + np.conj(da[i, K - m]))
                    w = A[i][K + m] + acb(complex(v))
                    w = acb(w.real.mid(), w.imag.mid())
                    A[i][K + m] = w
                    A[i][K - m] = w.conjugate()
        finally:
            ctx.prec = old
    return om, A, hist


# ------------------------------------------------------------------------------------------- save / load
def centre_path(N, K):
    return os.path.join(DATA, f"centre_N{N}_K{K}.json")


def save(N, K, om, A, meta):
    rec = dict(
        what="Numerical centre (UNTRUSTED) of the rotating 1-wave profile of the N-cell ring, scaled variables "
             "z = x / 2^e (model/scales.txt); phi(theta) = sum_{|m| <= K} a_m e^{i m theta}, a_{-m} = conj(a_m). "
             "Every number is an exact dyadic '<sign>0x<hex mantissa>p<binary exponent>'.",
        N=N, K=K, omega=dyadic_to_text(om),
        a=[[[dyadic_to_text(A[i][K + m].real), dyadic_to_text(A[i][K + m].imag)] for m in range(K + 1)]
           for i in range(DIM)],
        **meta)
    os.makedirs(DATA, exist_ok=True)
    with open(centre_path(N, K), "w") as fh:
        json.dump(rec, fh, indent=0)
        fh.write("\n")
    return centre_path(N, K)


def load(path):
    """(N, K, omega (exact arb), A (18 x (2K+1) exact acb, symmetric), record)."""
    with open(path) as fh:
        rec = json.load(fh)
    K = int(rec["K"])
    om = text_to_dyadic(rec["omega"])
    A = [[None] * (2 * K + 1) for _ in range(DIM)]
    for i in range(DIM):
        for m in range(K + 1):
            re, im = (text_to_dyadic(t) for t in rec["a"][i][m])
            if m == 0 and not im.is_zero():
                raise ValueError("a_0 must be real")
            A[i][K + m] = acb(re, im)
            A[i][K - m] = acb(re, -im)
    return int(rec["N"]), K, om, A, rec


# ------------------------------------------------------------------------------------------- driver
def compute(N, K=32, prec=256, Mc=None, log=print):
    t0 = time.time()
    Mc_d = 4 * K + 64                       # double collocation nodes
    Mc = Mc or (4 * K + 64)                 # Arb refinement nodes; aliasing ~ |g_{Mc-K}| (negligible)
    om, a, seed_sha = seed(K)
    log(f"N = {N}: seed T = {2 * math.pi / om:.10f}")
    om, a, nr = newton_double(om, a, N, Mc_d, log=log)
    if not nr < 1e-12:
        log("    direct Newton did not converge; continuation in the coupling")
        om, a, _ = seed(K)
        om, a, nr = newton_double(om, a, N, Mc_d, frac_steps=(0.25, 0.5, 0.75, 1.0), log=log)
    if not nr < 1e-12:
        raise RuntimeError(f"double Newton failed for N = {N} (|R| = {nr})")
    Jn = jacobian_coeffs(a, Mc_d, 2 * K)
    G = galerkin_matrix(om, a, Jn, N)
    omb, A = to_exact(om, a, prec)
    omb, A, hist = refine(omb, A, N, G, Mc, prec, log=log)
    T = 2 * math.pi / float(omb)
    meta = dict(status="untrusted numerical centre (not a bound)", prec_bits=prec, refinement_nodes=Mc,
                residual_history_max_abs=hist, T_ms_float=T, seed_file=os.path.relpath(SEED_FILE, ROOT),
                seed_sha256=seed_sha, seconds=time.time() - t0,
                note="residual = Arb evaluation of the truncated system (|m| <= K) with an Mc-node DFT, aliasing "
                     "ignored; the rigorous residual is recomputed by existence.py")
    path = save(N, K, omb, A, meta)
    log(f"N = {N}: T = {T:.13f} ms, final max|R| = {hist[-1]:.2e}, saved {path} ({time.time() - t0:.1f} s)")
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--N", default="1,8,16,32,64")
    ap.add_argument("--K", type=int, default=32)
    ap.add_argument("--prec", type=int, default=256)
    a = ap.parse_args()
    for N in [int(v) for v in a.N.split(",")]:
        compute(N, a.K, a.prec)


if __name__ == "__main__":
    main()
