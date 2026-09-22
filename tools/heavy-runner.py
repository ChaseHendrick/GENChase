#!/usr/bin/env python3
"""Optional native stress experiments. NumPy CPU or explicitly selected CuPy CUDA."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform
import sys
import time


def backend(name):
    try:
        import numpy as np
        if name == "cupy":
            import cupy as xp
            if xp.cuda.runtime.getDeviceCount() < 1:
                raise RuntimeError("No CUDA device is available")
        else:
            xp = np
        return np, xp
    except (ImportError, RuntimeError) as exc:
        raise RuntimeError("Install NumPy for CPU runs. CuPy additionally needs a supported CUDA installation; see docs/HEAVY-COMPUTE.md. " + str(exc)) from exc


def laplacian(xp, u):
    result = -6 * u
    for axis in range(3):
        result += xp.roll(u, 1, axis) + xp.roll(u, -1, axis)
    return result


def wave_initial(xp, n, mode=(2, 3, 1), phase=0.0):
    a = xp.arange(n, dtype=xp.float64) / n
    return xp.cos(2 * math.pi * (mode[0] * a[:, None, None] + mode[1] * a[None, :, None] + mode[2] * a[None, None, :]) + phase)


def wave_step(xp, previous, current, coefficient):
    return 2 * current - previous + coefficient * laplacian(xp, current)


def acceleration(xp, positions, masses, epsilon, block):
    """Direct summation in bounded tiles; no N by N retained distance matrix."""
    n = len(positions)
    result = xp.zeros_like(positions)
    for i in range(0, n, block):
        local = result[i:i + block]
        for j in range(0, n, block):
            delta = positions[None, j:j + block, :] - positions[i:i + block, None, :]
            r2 = xp.sum(delta * delta, axis=2) + epsilon * epsilon
            weight = masses[None, j:j + block] / (r2 * xp.sqrt(r2))
            local += xp.sum(delta * weight[:, :, None], axis=1)
    return result


def gravity_step(xp, positions, velocity, masses, accel, dt, epsilon, block):
    p = positions + dt * velocity + (0.5 * dt * dt) * accel
    a = acceleration(xp, p, masses, epsilon, block)
    v = velocity + 0.5 * dt * (accel + a)
    return p, v, a


def self_test(np, xp):
    rows = []
    n, steps, courant = 16, 40, 0.6
    coefficient = courant * courant / 3
    mode = (1, 2, 1)
    initial = wave_initial(xp, n, mode)
    current = initial.copy()
    previous = current + coefficient * laplacian(xp, current) / 2
    for _ in range(steps):
        previous, current = current, wave_step(xp, previous, current, coefficient)
    theta = math.acos(1 - 2 * coefficient * sum(math.sin(math.pi * m / n) ** 2 for m in mode))
    exact = initial * math.cos(steps * theta)
    error = float(xp.max(xp.abs(current - exact)))
    bad = float(xp.max(xp.abs(current - initial * math.cos(steps * theta * 0.9))))
    if error > 2e-12 or bad < 0.01:
        raise AssertionError("Wave eigenmode or failure control failed")
    rows.append({"test": "periodic discrete wave eigenmode", "max_error": error, "tolerance": 2e-12, "wrong_frequency_error": bad})
    epsilon = 0.05
    masses = xp.asarray([0.5, 0.5])
    initial_p = xp.asarray([[-0.5, 0.0], [0.5, 0.0]])
    omega = (1 + epsilon * epsilon) ** -0.75
    initial_v = xp.asarray([[0.0, -0.5 * omega], [0.0, 0.5 * omega]])
    errors = []
    for count in (100, 200, 400):
        p, v = initial_p.copy(), initial_v.copy()
        a = acceleration(xp, p, masses, epsilon, 16)
        dt = 1 / count
        for _ in range(count):
            p, v, a = gravity_step(xp, p, v, masses, a, dt, epsilon, 16)
        reference = xp.asarray([[-0.5 * math.cos(omega), -0.5 * math.sin(omega)], [0.5 * math.cos(omega), 0.5 * math.sin(omega)]])
        errors.append(float(xp.max(xp.abs(p - reference))))
        if float(xp.max(xp.abs(xp.sum(v * masses[:, None], axis=0)))) > 1e-12:
            raise AssertionError("Total momentum drift")
    if errors[-1] > 1e-6 or not 14 < errors[0] / errors[-1] < 18:
        raise AssertionError("Softened circular orbit convergence failed")
    wrong = initial_p + initial_v
    if float(xp.max(xp.abs(wrong - reference))) < 0.05:
        raise AssertionError("No-force failure control was not detected")
    rows.append({"test": "softened circular orbit", "errors": errors, "refinement_ratio": errors[0] / errors[-1], "finest_tolerance": 1e-6, "no_force_control_detected": True})
    return {"passed": True, "tests": rows, "limitations": ["Finite analytic fixtures only.", "No cross-hardware pixel equivalence or astrophysical validation."]}


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("module", choices=["volume-wave", "direct-gravity"], nargs="?", default="volume-wave")
    p.add_argument("--backend", choices=["numpy", "cupy"], default="numpy")
    p.add_argument("--grid", type=int, default=64)
    p.add_argument("--particles", type=int, default=512)
    p.add_argument("--steps", type=int, default=100)
    p.add_argument("--block", type=int, default=256)
    p.add_argument("--courant", type=float, default=0.6)
    p.add_argument("--dt", type=float, default=0.001, help="Gravity timestep; convergence must be checked for each new regime")
    p.add_argument("--epsilon", type=float, default=0.05)
    p.add_argument("--seed", default="genchase-heavy")
    p.add_argument("--memory-mib", type=int, default=1024, help="Conservative array allocation budget, excluding backend/runtime overhead")
    p.add_argument("--output", type=Path, default=Path("heavy-output"))
    p.add_argument("--dry-run", action="store_true", help="Show workload estimate without importing NumPy/CuPy or allocating arrays")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    for key in ("grid", "particles", "steps", "block", "memory_mib"):
        if not 1 <= getattr(args, key) <= sys.maxsize:
            p.error(key.replace("_", "-") + " must be positive and fit a native integer")
    if args.grid < 8:
        p.error("grid must be at least 8 to resolve the initial mode")
    if not math.isfinite(args.courant) or not 0 < args.courant <= 0.95:
        p.error("courant must be in (0, 0.95]")
    if not math.isfinite(args.dt) or args.dt <= 0 or not math.isfinite(args.epsilon) or args.epsilon <= 0:
        p.error("dt and epsilon must be finite and positive")
    if args.courant * args.courant / 3 == 0:
        p.error("courant is too small to represent the wave coefficient in float64")
    dt2 = args.dt * args.dt
    epsilon3 = args.epsilon * args.epsilon * args.epsilon
    if not math.isfinite(dt2) or dt2 == 0:
        p.error("dt squared must be finite and nonzero in float64")
    if not math.isfinite(epsilon3) or epsilon3 == 0 or not math.isfinite(1 / epsilon3):
        p.error("epsilon cubed and its inverse must be finite and nonzero in float64")
    return args


@contextmanager
def reserve_output(directory):
    """Reserve an empty directory; concurrent runs cannot claim the same destination."""
    if directory.exists() and (not directory.is_dir() or any(directory.iterdir())):
        raise ValueError("Output directory must be new or empty, to avoid overwriting an earlier experiment")
    directory.mkdir(parents=True, exist_ok=True)
    marker = directory / ".genchase-running"
    try:
        reservation = marker.open("x")
    except FileExistsError as exc:
        raise ValueError("Another experiment has reserved this output directory") from exc
    try:
        with reservation:
            # A second process may have written files between the first check and reservation.
            if any(p != marker for p in directory.iterdir()):
                raise ValueError("Output directory changed while being reserved; existing files were preserved")
            yield
    finally:
        marker.unlink(missing_ok=True)


def provenance(np, xp):
    return {
        "numpy_version": np.__version__, "backend_version": xp.__version__,
        "python_version": platform.python_version(), "platform": platform.platform(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }


def main():
    args = parse_args()
    if args.module == "volume-wave":
        estimate = 12 * args.grid ** 3 * 8
        work = {"cells": args.grid ** 3, "cell_updates": args.grid ** 3 * args.steps, "dt": args.courant / (math.sqrt(3) * args.grid)}
    else:
        b = min(args.block, args.particles)
        estimate = 32 * args.particles * 8 + 12 * b * b * 8
        work = {"particles": args.particles, "directed_pair_evaluations": args.particles ** 2 * (args.steps + 1), "dt": args.dt}
    metadata = {"module": args.module, "backend": args.backend, "precision": "float64", "estimated_array_bytes": estimate, "array_budget_bytes": args.memory_mib * 1024 ** 2, **work}
    if args.dry_run:
        metadata["within_array_budget"] = estimate <= metadata["array_budget_bytes"]
        print(json.dumps(metadata, indent=2))
        return
    if not args.self_test and estimate > metadata["array_budget_bytes"]:
        raise ValueError("Requested arrays exceed --memory-mib. Inspect --dry-run and explicitly select a suitable budget or smaller workload.")
    np, xp = backend(args.backend)
    if args.self_test:
        print(json.dumps({"backend": args.backend, **provenance(np, xp), **self_test(np, xp)}, indent=2))
        return
    if args.backend == "cupy":
        free, _ = xp.cuda.runtime.memGetInfo()
        if estimate > free * 0.8:
            raise ValueError("Estimated arrays exceed 80% of currently free CUDA memory")
    with reserve_output(args.output):
        run(args, np, xp, metadata)


def run(args, np, xp, metadata):
    numeric_seed = int.from_bytes(hashlib.sha256(args.seed.encode()).digest()[:8], "little")
    started = time.perf_counter()
    if args.module == "volume-wave":
        phase = (numeric_seed / 2 ** 64) * 2 * math.pi
        current = wave_initial(xp, args.grid, phase=phase)
        previous = current + (args.courant ** 2 / 6) * laplacian(xp, current)
    else:
        # Draw on the CPU once so NumPy and CuPy receive identical initial arrays.
        rng = np.random.Generator(np.random.PCG64(numeric_seed))
        positions = xp.asarray(rng.normal(0, 0.4, (args.particles, 2)))
        positions -= xp.mean(positions, axis=0)
        velocity = xp.stack((-positions[:, 1], positions[:, 0]), axis=1) * 0.5
        masses = xp.full(args.particles, 1 / args.particles, dtype=xp.float64)
        accel = acceleration(xp, positions, masses, args.epsilon, args.block)
    for step in range(args.steps):
        if args.module == "volume-wave":
            previous, current = current, wave_step(xp, previous, current, args.courant ** 2 / 3)
        else:
            positions, velocity, accel = gravity_step(xp, positions, velocity, masses, accel, args.dt, args.epsilon, args.block)
        if args.backend == "cupy":
            xp.cuda.get_current_stream().synchronize()
        if (step + 1) % max(1, args.steps // 10) == 0:
            print(f"{step + 1}/{args.steps} steps", file=sys.stderr, flush=True)
    model = ({"equation": "u_tt = laplacian(u)", "domain": "periodic [0, 1)^3", "wave_speed": 1,
              "initial_mode": [2, 3, 1], "initial_velocity": "zero", "stencil": "7-point centered Laplacian",
              "time_integrator": "centered leapfrog", "laplacian_coefficient": args.courant ** 2 / 3}
             if args.module == "volume-wave" else
             {"equation": "a_i = sum_j m_j (r_j-r_i) / (|r_j-r_i|^2 + epsilon^2)^(3/2)",
              "domain": "unbounded planar coordinates", "gravitational_constant": 1, "total_mass": 1,
              "particle_mass": 1 / args.particles, "softening_epsilon": args.epsilon,
              "time_integrator": "velocity Verlet", "initial_rng": "NumPy PCG64"})
    metadata.update({"completed_steps": args.steps, "elapsed_seconds": time.perf_counter() - started,
                     "completed_at_utc": datetime.now(timezone.utc).isoformat(), "seed": args.seed,
                     "numeric_seed": str(numeric_seed), "seed_mapping": "SHA-256 UTF-8, first 8 bytes, little-endian",
                     **provenance(np, xp), "model": model,
                     "arguments": {k: str(v) if isinstance(v, Path) else v for k, v in vars(args).items()},
                     "limitations": ["Native initial seeds differ from browser recipes; compare named analytic fixtures instead.",
                                     "Float64 native results need not equal float32 browser results.",
                                     "Stress settings are not certified numerical accuracy or stability for arbitrary gravity regimes.",
                                     "The optional CuPy CUDA path is not covered by the project's CPU-only runner checks."]})
    cpu = xp.asnumpy if args.backend == "cupy" else np.asarray
    arrays = {"current": cpu(current), "previous": cpu(previous)} if args.module == "volume-wave" else {"positions": cpu(positions), "velocity": cpu(velocity), "masses": cpu(masses)}
    if not all(np.isfinite(a).all() for a in arrays.values()):
        raise ValueError("Nonfinite state detected; reduce timestep or revise the experiment")
    metadata["state_arrays"] = {name: {"shape": list(array.shape), "dtype": str(array.dtype),
                                       "sha256": hashlib.sha256(array.tobytes(order="C")).hexdigest()}
                                for name, array in arrays.items()}
    # Exclusive opens preserve existing results even if another writer ignores our reservation.
    with (args.output / "state.npz").open("xb") as target:
        np.savez_compressed(target, **arrays)
    with (args.output / "run.json").open("x") as target:
        target.write(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Stopped by user; no completed result is claimed.", file=sys.stderr)
        sys.exit(130)
    except (ValueError, RuntimeError, MemoryError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
