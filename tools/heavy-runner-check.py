#!/usr/bin/env python3
"""CPU reference and command-line checks for the optional native runner."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import numpy as np

SCRIPT = Path(__file__).with_name("heavy-runner.py")
spec = importlib.util.spec_from_file_location("heavy_runner", SCRIPT)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


def command(*args, success=True):
    result = subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True)
    assert (result.returncode == 0) == success, result.stdout + result.stderr
    return result


def main():
    evidence = runner.self_test(np, np)
    p = np.array([[-0.7, 0.2], [0.1, 0.6], [0.8, -0.3], [0.0, -0.5]])
    m = np.array([0.1, 0.2, 0.3, 0.4])
    expected = np.zeros_like(p)
    for i in range(4):
        for j in range(4):
            d = p[j] - p[i]
            expected[i] += m[j] * d / (float(d @ d) + 0.07 ** 2) ** 1.5
    for block in (1, 2, 3, 16):
        np.testing.assert_allclose(runner.acceleration(np, p, m, 0.07, block), expected, rtol=2e-15, atol=2e-15)
    assert np.max(np.abs(np.sum(expected * m[:, None], axis=0))) < 1e-14
    # Fixed physical domain and time, independently known continuum frequency.
    errors = []
    for n in (8, 16, 32):
        duration = 0.1
        steps = n
        dt = duration / steps
        coefficient = (dt * n) ** 2
        initial = runner.wave_initial(np, n, (1, 1, 1), 0.2)
        current = initial.copy()
        previous = current + coefficient * runner.laplacian(np, current) / 2
        for _ in range(steps):
            previous, current = current, runner.wave_step(np, previous, current, coefficient)
        exact = initial * np.cos(2 * np.pi * np.sqrt(3) * duration)
        errors.append(float(np.sqrt(np.mean((current - exact) ** 2))))
    ratios = [errors[i] / errors[i + 1] for i in (0, 1)]
    assert all(3.8 < r < 4.2 for r in ratios), ratios
    for args in [("--courant", "1.01"), ("--dt", "nan"), ("--epsilon", "0"), ("--grid", "-1"), ("--steps", "0"), ("--dt", "1e300"), ("--epsilon", "1e-300")]:
        command(*args, success=False)
    dry = json.loads(command("--grid", "256", "--memory-mib", "1", "--dry-run").stdout)
    assert not dry["within_array_budget"]
    with tempfile.TemporaryDirectory(prefix="genchase-native-") as temp:
        root = Path(temp)
        denied = root / "denied"
        command("--grid", "256", "--memory-mib", "1", "--output", denied, success=False)
        assert not denied.exists()
        for module in ("volume-wave", "direct-gravity"):
            dirs = [root / (module + str(i)) for i in range(2)]
            for out in dirs:
                command(module, "--grid", "8", "--particles", "8", "--block", "3", "--steps", "3", "--output", out)
                metadata = json.loads((out / "run.json").read_text())
                assert metadata["completed_steps"] == 3 and metadata["backend"] == "numpy"
                assert metadata["source_sha256"] and metadata["state_arrays"]
            with np.load(dirs[0] / "state.npz", allow_pickle=False) as a, np.load(dirs[1] / "state.npz", allow_pickle=False) as b:
                assert set(a.files) == set(b.files)
                for key in a.files:
                    np.testing.assert_array_equal(a[key], b[key])
            before = (dirs[0] / "run.json").read_bytes()
            command(module, "--steps", "1", "--output", dirs[0], success=False)
            assert (dirs[0] / "run.json").read_bytes() == before
        with runner.reserve_output(root / "reserved"):
            try:
                with runner.reserve_output(root / "reserved"):
                    raise AssertionError("Concurrent reservation unexpectedly succeeded")
            except ValueError:
                pass
    print(json.dumps({"passed": True, "backend": "numpy", "numpy_version": np.__version__, "analytic": evidence, "continuum_wave_errors": errors, "continuum_wave_ratios": ratios, "cli_checks": "invalid inputs, memory budget, deterministic archives, no overwrite, exclusive reservation", "limitations": "CPU float64 fixtures only; CUDA is not exercised."}, indent=2))


if __name__ == "__main__":
    main()
