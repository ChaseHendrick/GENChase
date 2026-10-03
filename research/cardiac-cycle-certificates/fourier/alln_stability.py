"""Preliminary all-N/cable stability planning and UNTRUSTED spectral pilots.

This file does not certify stability or admit a result. The rational gate below
is a conditional mathematical reduction: its input bounds need separate proofs.
The pilot uses the float reference model, FFT and LAPACK, without interval errors.
See LEMMAS-alln-stability.md. No published records are rewritten.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
from fractions import Fraction
import platform
import time

for _name in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS",
              "VECLIB_MAXIMUM_THREADS"):
    os.environ[_name] = "1"

HERE = Path(__file__).resolve().parent
D = Fraction(1, 64000)


def rational(value):
    """Exact user bounds must be integers, Fractions or rational strings."""
    if isinstance(value, bool) or not isinstance(value, (int, Fraction, str)):
        raise ValueError("an exact rational is required; floats and bools refused")
    return Fraction(value)


def integer(value, minimum=0):
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise ValueError("invalid integer")
    return value


def sectors(N):
    """One representative per ring sector, including both signs where distinct."""
    integer(N, 8)
    return tuple(range(-(N // 2), (N - 1) // 2 + 1))


def spatial_lower(q, M, N=None):
    """Exact lower bound for every |m|<=M in an eligible physical sector.

    q is centered for rings. The returned bound is deliberately zero for |q|<M.
    """
    integer(M)
    if isinstance(q, bool) or not isinstance(q, int):
        raise ValueError("invalid sector")
    if N is not None and q not in sectors(N):
        raise ValueError("ring sector is not centered")
    return 16 * D * max(0, abs(q) - M) ** 2


def high_sector_gate(*, M, Q, omega_lo, strip_height, delta,
                     alpha_v, beta_vw, beta_wv, rho_w):
    """Return exact conditional Schur-gate arithmetic, never an admission flag.

    rho_w bounds the inverse of the full 17-state prescribed-voltage operator
    on the same Fourier space and contour half-strip. Coefficient norms must
    be measured in the same fixed cell norm. Both signs |q|>=Q are covered.
    """
    integer(M)
    integer(Q, M + 1)
    values = {k: rational(v) for k, v in dict(
        omega_lo=omega_lo, strip_height=strip_height, delta=delta,
        alpha_v=alpha_v, beta_vw=beta_vw, beta_wv=beta_wv, rho_w=rho_w).items()}
    if values["omega_lo"] <= 0 or values["rho_w"] <= 0:
        raise ValueError("omega_lo and rho_w must be positive")
    if any(values[k] < 0 for k in
           ("strip_height", "delta", "alpha_v", "beta_vw", "beta_wv")):
        raise ValueError("negative majorant")
    g = values["omega_lo"] * (M + 1) - values["strip_height"]
    L = spatial_lower(Q, M)
    B = values["alpha_v"] + values["beta_vw"] * values["rho_w"] * values["beta_wv"]
    gates = {"temporal_tail": g > B, "spatial_low_modes": L > values["delta"] + B}
    out = {"status": "conditional-rational-reduction", "certified": False,
           "M": M, "Q": Q, "covers": "both signs |q| >= Q; centered ring sectors and cable",
           "inputs": {k: str(v) for k, v in values.items()},
           "g": str(g), "L_Q": str(L), "B": str(B),
           "strict_gates": gates,
           "missing": "rigorous input majorants, low-sector counts, phase simplicity, semigroup gates"}
    if g > 0 and L > values["delta"]:
        r0 = max(1 / g, 1 / (L - values["delta"]))
        out["r0"] = str(r0)
        if values["alpha_v"] * r0 < 1:
            rv = r0 / (1 - values["alpha_v"] * r0)
            out["r_v"] = str(rv)
            out["schur_loop"] = str(rv * values["beta_vw"] * values["rho_w"] * values["beta_wv"])
    return out


def hill_matrix(coefficients, omega, K, q=0, N=None, frozen_voltage=False):
    """UNTRUSTED finite Hill matrix. q shifts damping, not the temporal derivative."""
    import numpy as np
    integer(K)
    if not math.isfinite(omega) or omega <= 0:
        raise ValueError("positive finite frequency required")
    dim = 17 if frozen_voltage else 18
    out = np.zeros((dim * (2 * K + 1),) * 2, complex)
    for i, m in enumerate(range(-K, K + 1)):
        for j, n in enumerate(range(-K, K + 1)):
            a = coefficients.get(m - n)
            if a is not None:
                a = np.asarray(a, dtype=complex)
                if a.shape != (18, 18) or not np.isfinite(a).all():
                    raise ValueError("invalid Jacobian coefficient")
                out[dim*i:dim*(i+1), dim*j:dim*(j+1)] = a[1:, 1:] if frozen_voltage else a
        sl = slice(dim*i, dim*(i+1))
        out[sl, sl] -= 1j * omega * m * np.eye(dim)
        if not frozen_voltage:
            k = m + q
            damping = (4 * math.pi**2 * float(D) * k*k if N is None
                       else 4 * N*N * float(D) * math.sin(math.pi*k/N)**2)
            out[dim*i, dim*i] -= damping
    return out


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def spectral_summary(matrix, omega):
    import numpy as np
    from scipy.linalg import eigvals
    vals = eigvals(matrix, overwrite_a=True, check_finite=True)
    strip = vals[(vals.imag >= -omega/2) & (vals.imag < omega/2)]
    order = np.argsort(strip.real)[::-1]
    return {"total_eigenvalues": len(vals), "basic_strip_eigenvalues": len(strip),
            "rightmost_basic_strip": [[float(v.real), float(v.imag)]
                                     for v in strip[order[:12]]],
            "positive_real_count_untrusted": int((strip.real > 0).sum())}


def pilot(out, windows, qs, refine):
    import numpy as np
    import scipy
    import alln
    import centre as ct
    started = time.monotonic()
    path = HERE / "data/alln/pieces.jsonl"
    source_names = ("alln.py", "centre.py", "arbmodel.py", "alln_stability.py")
    hashes = {name: digest(HERE / name) for name in source_names}
    hashes["model/tp06_18d.py"] = digest(HERE.parent / "model/tp06_18d.py")
    input_hash = digest(path)
    rows = [json.loads(line) for line in path.read_text().splitlines()]
    candidates = [r for r in rows
                  if Fraction(r["rec"]["eps_lo"]) <= 0 <= Fraction(r["rec"]["eps_hi"])]
    if not candidates:
        raise RuntimeError("no eps=0 seed in existing all-N log")
    row = min(candidates, key=lambda r: Fraction(r["rec"]["eps_hi"]))
    omega_ball, a_ball = alln.centre_from_text(row["centre"])
    a0 = np.array([[complex(float(z.real), float(z.imag)) for z in v]
                   for v in a_ball])
    omega0 = float(omega_ball)
    K0 = (a0.shape[1] - 1) // 2
    report = {"status": "untrusted-numerical-pilot", "certified": False,
              "source_sha256": hashes, "input_sha256": input_hash,
              "seed_label": row["rec"]["label"],
              "seed_centre_sha256": hashlib.sha256(json.dumps(
                  row["centre"], sort_keys=True, separators=(",", ":")).encode()).hexdigest(),
              "seed_eps_center": row["rec"]["eps_c"],
              "model": "fixed scaled TP06 coordinates; GKs=0.0275; unit circumference D=1/64000",
              "settings": {"windows": windows, "sectors": qs, "refine_float": refine,
                           "BLAS_threads_requested": 1},
              "runtime": {"python": platform.python_version(), "platform": platform.platform(),
                          "numpy": np.__version__, "scipy": scipy.__version__},
              "runs": [],
              "limitations": ["No interval model/aliasing/profile-error bounds.",
                              "No spectral count, multiplier, nonlinear or uniform-N admission.",
                              "Finite truncations may contain spectral pollution."]}
    for K in windows:
        a = np.zeros((18, 2*K+1), complex)
        k = min(K, K0)
        a[:, K-k:K+k+1] = a0[:, K0-k:K0+k+1]
        omega = omega0
        Mc = max(256, 8*K+128)
        if refine:
            omega, a, _ = alln.newton_f(omega, a, 0.0, Mc, iters=12)
        residual = float(np.abs(alln.residual_f(omega, a, 0.0, Mc)).max())
        coeffs = ct.jacobian_coeffs(a, Mc, 2*K)
        run = {"K": K, "Mc": Mc, "omega": omega, "finite_residual": residual,
               "frozen_voltage": spectral_summary(hill_matrix(
                   coeffs, omega, K, frozen_voltage=True), omega), "cable_sectors": {}}
        for q in qs:
            run["cable_sectors"][str(q)] = spectral_summary(
                hill_matrix(coeffs, omega, K, q=q), omega)
        report["runs"].append(run)
    if input_hash != digest(path) or any(digest(
            HERE.parent / name if name.startswith("model/") else HERE / name) != sha
            for name, sha in hashes.items()):
        raise RuntimeError("input or source changed during pilot")
    report["wall_seconds"] = time.monotonic() - started
    with Path(out).open("x") as fp:
        json.dump(report, fp, indent=2, allow_nan=False)
        fp.write("\n")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--plan", action="store_true")
    modes.add_argument("--pilot", action="store_true")
    parser.add_argument("--out")
    parser.add_argument("--windows", default="12,24")
    parser.add_argument("--sectors", default="0,1,4,16")
    parser.add_argument("--refine", action="store_true")
    parser.add_argument("--M", type=int)
    parser.add_argument("--Q", type=int)
    for name in ("omega-lo", "strip-height", "delta", "alpha-v", "beta-vw", "beta-wv", "rho-w"):
        parser.add_argument("--" + name)
    args = parser.parse_args()
    if args.pilot:
        windows = [int(k) for k in args.windows.split(",")]
        qs = [int(q) for q in args.sectors.split(",")]
        if not args.out or not windows or any(k < 4 or k > 40 for k in windows):
            parser.error("--out and windows between4 and40 required")
        if len(windows) > 3 or len(set(windows)) != len(windows) or len(qs) > 8 or len(set(qs)) != len(qs):
            parser.error("at most3 distinct windows and8 distinct sectors")
        report = pilot(args.out, windows, qs, args.refine)
        print(json.dumps({"status": report["status"], "certified": False,
                          "out": args.out, "wall_seconds": report["wall_seconds"]}))
    else:
        names = ("omega_lo", "strip_height", "delta", "alpha_v", "beta_vw", "beta_wv", "rho_w")
        if args.M is None or args.Q is None or any(getattr(args, k) is None for k in names):
            parser.error("--plan requires M,Q and all exact rational majorants")
        print(json.dumps(high_sector_gate(M=args.M, Q=args.Q,
              **{k: getattr(args, k) for k in names}), indent=2))


if __name__ == "__main__":
    main()
