"""Cost of the strip cover and the rigorous DFT for the 18-component rotating-wave profile (component 2 benchmark).

What is rigorous here and what is not:
* The strip bounds S_i and the coefficient balls printed by this script are rigorous for the trigonometric polynomial
  phi that the script builds (Arb balls, fourier_eval.py), with f = arbmodel.f (component 1, exact decimals).
* phi itself is NOT a validated orbit. It is a numerical centre: the design panel's double-precision N = 64 orbit
  (scratchpad fourier/orbit_N64_M64.npz, Fourier collocation, M = 64) re-solved by Fourier collocation at Mc = 65
  nodes (modes |m| <= 32) with Newton's method whose residual is evaluated in Arb at `--prec` bits and whose
  correction is solved in double (iterative refinement, a chord method). Its residual is printed; nothing about the
  true rotating wave follows from this script. The singularity estimate (`--scan`) is ordinary floating point.

Usage (machine shared: run niced, under a timeout):
  PYTHONPATH=<python-flint 0.9.0> nice -n 10 timeout 1200 python3 bench_strip.py [--npz PATH] [--rhos 1.0,1.5,2.0]
      [--rtol 1.0] [--max-evals 200000] [--scan] [--json OUT]
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
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "model"))

import flint  # noqa: E402
from flint import acb, acb_mat, arb, fmpq  # noqa: E402

import arbmodel as am  # noqa: E402
from tp06_18d import NAMES  # noqa: E402
import fourier_eval as fe  # noqa: E402

DEFAULT_NPZ = "/tmp/claude-0/-home-user-GENChase/8e652c2a-6f64-5009-9ee8-187ba6394e5c/scratchpad/fourier/orbit_N64_M64.npz"
SIG = 2.0 ** np.array(am.SCALE_EXP, dtype=float)
D = 1.0 / 64000.0


def _jac_cs(Zd):
    """Complex-step Jacobian of the scaled field (float-literal reference model, double) at each column."""
    from tp06_18d import field, PARAMS

    class CM:
        exp = staticmethod(np.exp)
        log = staticmethod(np.log)
        sqrt = staticmethod(np.sqrt)

    def fs(Z):
        return np.array(field(list(Z * SIG[:, None]), PARAMS, CM)) / SIG[:, None]

    L = Zd.shape[1]
    J = np.empty((L, 18, 18))
    for k in range(18):
        Zc = Zd.astype(complex)
        Zc[k] += 1e-30j
        J[:, :, k] = (fs(Zc).imag / 1e-30).T
    return J


def refine_orbit(npz, N=64, Mc=65, prec=192, iters=10, tol=1e-30, log=print):
    """Numerical centre: collocation at Mc (odd) nodes, residual in Arb, chord correction in double. Returns
    (TrigPoly with exact mid coefficients, T as float, max |residual| as float, iteration log)."""
    d = np.load(npz)
    Z64, T0 = d["Z"], float(d["T"])
    L0 = Z64.shape[1]
    K = (Mc - 1) // 2
    A0 = np.fft.fft(Z64, axis=1) / L0
    coef = np.zeros((18, 2 * K + 1), complex)
    for m in range(-min(K, L0 // 2 - 1), min(K, L0 // 2 - 1) + 1):   # drop the even-M Nyquist mode
        coef[:, m + K] = A0[:, m % L0]
    th = 2 * np.pi * np.arange(Mc) / Mc
    E = np.exp(1j * np.outer(np.arange(-K, K + 1), th))              # (2K+1) x Mc
    Zd = np.real(coef @ E)
    # double Newton matrix (unknowns Z[i, j] -> i*Mc + j, then T), as in the panel's fsolve.py
    k = np.fft.fftfreq(Mc, 1.0 / Mc)
    F = np.fft.fft(np.eye(Mc), axis=0)
    Fi = np.fft.ifft(np.eye(Mc), axis=0)
    Ds = np.real(Fi @ np.diag(2j * np.pi * k) @ F)
    c = N * N * D
    dk = 4 * c * np.sin(np.pi * k / N) ** 2
    Ld = np.real(Fi @ np.diag(dk) @ F)
    J = _jac_cs(Zd)
    n = 18 * Mc
    A = np.zeros((n + 1, n + 1))
    for i in range(18):
        A[i * Mc:(i + 1) * Mc, i * Mc:(i + 1) * Mc] += Ds / T0
    A[0:Mc, 0:Mc] += Ld
    for i in range(18):
        for j in range(18):
            A[i * Mc + np.arange(Mc), j * Mc + np.arange(Mc)] -= J[:, i, j]
    A[:n, n] = -((Zd @ Ds.T) / T0 ** 2).ravel()
    A[n, 0] = 1.0
    lu = lu_factor(A)

    with fe.precision(prec):
        prm = am.params(prec)
        roots = [fe._root_of_unity(r, Mc) for r in range(Mc)]
        Wf = acb_mat([[roots[(-m * j) % Mc] for j in range(Mc)] for m in range(-K, K + 1)])   # forward
        Wi = acb_mat([[roots[(m * j) % Mc] for m in range(-K, K + 1)] for j in range(Mc)])    # inverse
        twopi = 2 * arb.pi()
        dmp = [am.damping(m, N=N, prec=prec) for m in range(-K, K + 1)]
        Z = [[arb(float(Zd[i, j])) for j in range(Mc)] for i in range(18)]
        T = arb(T0)
        lev = arb(0.2) / arb(SIG[0])
        hist = []
        for it in range(iters):
            Zm = acb_mat([[acb(Z[i][j]) for i in range(18)] for j in range(Mc)])   # Mc x 18
            Ah = Wf * Zm                                                            # (2K+1) x 18, times Mc
            Rh = acb_mat(2 * K + 1, 18)
            for t, m in enumerate(range(-K, K + 1)):
                for i in range(18):
                    v = Ah[t, i] * acb(0, twopi * m) / T
                    if i == 0:
                        v = v + dmp[t] * Ah[t, i]
                    Rh[t, i] = v / Mc
            Rs = Wi * Rh                                                            # Mc x 18: phi'/T + damping
            R = np.empty(n + 1)
            for j in range(Mc):
                fz = am.f([acb(Z[i][j]) for i in range(18)], prm, prec=prec)
                for i in range(18):
                    R[i * Mc + j] = float((Rs[j, i] - fz[i]).real.mid())
            R[n] = float((Z[0][0] - lev).mid())
            res = float(np.abs(R).max())
            hist.append(res)
            log(f"  refine it {it}: max|residual| = {res:.3e}  T = {float(T.mid()):.15f}")
            if res < tol:
                break
            dx = lu_solve(lu, -R)
            for i in range(18):
                for j in range(Mc):
                    Z[i][j] = Z[i][j] + arb(float(dx[i * Mc + j]))
            T = T + arb(float(dx[n]))
        Zm = acb_mat([[acb(Z[i][j]) for i in range(18)] for j in range(Mc)])
        Ah = Wf * Zm
        coeffs = [[acb(Ah[t, i].real.mid() / Mc, Ah[t, i].imag.mid() / Mc) for t in range(2 * K + 1)]
                  for i in range(18)]
    # exact (zero-radius) coefficients: the centre is whatever these numbers are
    coeffs = [[acb(c.real.mid(), c.imag.mid()) for c in row] for row in coeffs]
    return fe.TrigPoly(coeffs), float(T.mid()), hist[-1], hist


def float_scan(phi, ys, nx=4000):
    """Ordinary floating point (untrusted): max |g_i| on lines Im theta = y, f = float-literal reference model."""
    from tp06_18d import field, PARAMS

    class CM:
        exp = staticmethod(np.exp)
        log = staticmethod(np.log)
        sqrt = staticmethod(np.sqrt)

    K = phi.K
    co = np.array([[complex(float(c.real.mid()), float(c.imag.mid())) for c in row] for row in phi.coeffs])
    x = np.linspace(0, 2 * np.pi, nx, endpoint=False)
    out = []
    with np.errstate(all="ignore"):
        for y in ys:
            P = co @ np.exp(1j * np.outer(np.arange(-K, K + 1), x + 1j * y))
            G = np.array(field(list(P * SIG[:, None]), PARAMS, CM)) / SIG[:, None]
            out.append((y, float(np.nanmax(np.abs(G))), int(np.nanargmax(np.max(np.abs(G), axis=1)))))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--npz", default=DEFAULT_NPZ)
    ap.add_argument("--rhos", default="0.5,1.0,1.5,1.75,2.0")
    ap.add_argument("--rtol", type=float, default=1.0)
    ap.add_argument("--max-evals", type=int, default=200000)
    ap.add_argument("--prec", type=int, default=192)
    ap.add_argument("--M", default="128,192")
    ap.add_argument("--Kp", type=int, default=64)
    ap.add_argument("--scan", action="store_true")
    ap.add_argument("--json", default=None)
    a = ap.parse_args()

    rec = dict(python_flint=flint.__version__, FLINT=flint.__FLINT_VERSION__, npz=a.npz,
               npz_sha256=hashlib.sha256(open(a.npz, "rb").read()).hexdigest(), date=time.strftime("%Y-%m-%d"),
               status="benchmark; S and coefficient balls rigorous for the numerical centre phi built here only")
    print(f"python-flint {flint.__version__} (FLINT {flint.__FLINT_VERSION__}); npz sha256 {rec['npz_sha256']}")
    t0 = time.time()
    phi, T, res, hist = refine_orbit(a.npz, prec=a.prec)
    rec.update(T_ms=T, centre_residual=res, refine_history=hist, refine_seconds=time.time() - t0, K=phi.K)
    print(f"centre: K = {phi.K}, T = {T:.12f} ms, residual {res:.2e} ({time.time() - t0:.1f} s)")
    mags = [max(float(phi.coeffs[i][m + phi.K].abs_upper().mid()) for i in range(18)) for m in range(phi.K + 1)]
    rec["max_coeff_by_mode"] = mags
    print("max_i |a_m|, m = 0..32:", " ".join(f"{v:.1e}" for v in mags))

    if a.scan:
        ys = [0, 0.5, 1.0, 1.5, 1.75, 2.0, 2.1, 2.2, 2.3, 2.5]
        sc = float_scan(phi, ys)
        rec["float_scan"] = sc
        print("float scan (untrusted): y, max_i max_x |g_i(x + i y)|, argmax component")
        for y, g, i in sc:
            print(f"   y = {y:4.2f}  {g:.3e}  ({NAMES[i]})")

    prm53 = am.params(53)
    f53 = lambda z: am.f(z, prm53, prec=53)  # noqa: E731
    prmP = am.params(a.prec)
    fP = lambda z: am.f(z, prmP, prec=a.prec)  # noqa: E731
    covers = []
    for rho in [float(r) for r in a.rhos.split(",")]:
        try:
            st = fe.strip_sup(f53, phi, rho, rtol=a.rtol, max_evals=a.max_evals)
        except fe.StripCoverError as e:
            print(f"rho = {rho}: cover FAILED: {str(e)[:200]}")
            covers.append(dict(rho=rho, failed=str(e)[:400]))
            continue
        Smax = st.S_max()
        r = st.ratio()
        tails = {Kp: float(fe.tail_bound(Smax, rho, Kp + 1).mid()) for Kp in (32, 48, 64)}
        d = dict(rho=rho, S=[float(s.mid()) for s in st.S], S_over_L=r, n_evals=st.n_evals, n_leaves=st.n_leaves,
                 n_nonfinite=st.n_nonfinite_evals, n_unresolved=st.n_unresolved, min_leaf_width=st.min_leaf_width,
                 seconds=st.seconds, tail_at_Kp_plus_1=tails)
        covers.append(d)
        print(f"rho = {rho}: {st.n_evals} box evaluations ({st.n_nonfinite_evals} non-finite, refined), "
              f"{st.n_leaves} leaves, {st.n_unresolved} unresolved, min width {st.min_leaf_width:.2e}, "
              f"{st.seconds:.1f} s; max_i S_i = {float(Smax.mid()):.3e}; max_i S_i/L_i = {max(r):.2f}; "
              f"S e^(-rho (K'+1)) at K' = 32, 48, 64: " + ", ".join(f"{v:.1e}" for v in tails.values()))
        d["fourier"] = []
        for M in [int(v) for v in a.M.split(",")]:
            Kp = min(a.Kp, M - 1)
            t1 = time.time()
            enc = fe.fourier_coefficients(fP, phi, rho, M, Kp, S=st.S, prec=a.prec)
            secs = time.time() - t1
            maxrad = max(float(enc.c[i][t].rad()) for i in range(18) for t in range(2 * Kp + 1))
            maxal = max(float(enc.alias_bound(i, Kp).mid()) for i in range(18))
            dd = dict(M=M, Kp=Kp, seconds=secs, max_radius=maxrad, max_alias_bound_at_Kp=maxal,
                      tail_l1_nu1=max(float(enc.tail_l1(i).mid()) for i in range(18)))
            d["fourier"].append(dd)
            print(f"     DFT M = {M}, K' = {Kp}, {a.prec} bits: {secs:.1f} s, max ball radius {maxrad:.2e}, "
                  f"alias bound at K' {maxal:.2e}, l1 tail beyond K' {dd['tail_l1_nu1']:.2e}")
    rec["covers"] = covers
    rec["total_seconds"] = time.time() - t0
    if a.json:
        with open(a.json, "w") as fh:
            json.dump(rec, fh, indent=1)
        print("wrote", a.json)


if __name__ == "__main__":
    main()
