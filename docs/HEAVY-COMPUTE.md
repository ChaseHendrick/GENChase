# Heavy computation

Two established models expose deliberately expensive workloads. More computation is not a
claim of greater scientific accuracy or a new discovery. Start with the defaults, compare
resolutions and timesteps, then increase the workload for a stated experiment.

| Module | Work | Explicit browser limit | Main limitation |
| --- | --- | --- | --- |
| Direct planar gravity | Every body interacts with every other body on the CPU | 16,384 bodies, 134,209,536 unordered pairs per force evaluation | Quadratic runtime; softened encounters and finite timesteps need convergence checks |
| Volume wave | A three-dimensional periodic scalar wave on the GPU | 256 cubed, 16,777,216 cells and about 512 MiB for two state textures | GPU memory and texture limits; grid dispersion and float32 precision |

These are configurable stress workloads, not a promise to exhaust every machine or a claim
that they are the heaviest programs possible. The CPU extreme preset starts paused. The GPU
module checks texture capacity before allocation and submits bounded work. Pause stops new
work; an already submitted GPU operation must finish. Numerical state is preserved for export,
and the rendering resolution does not increase the physical simulation grid.

The engine uses the browser's native animation scheduler with no application-wide 60 FPS cap.
Rendering follows display refresh, browser scheduling and available hardware. Frame-driven
simulations can evolve faster in wall-clock time on high-refresh displays. Numerical timesteps,
step budgets, CFL limits and responsiveness budgets remain in place. A stopped scientific
comparison should use the same simulation step or physical time, not the same wall-clock delay.

## Optional native runner

The browser studio still needs no installed numerical packages. The separate Python runner
uses NumPy on the CPU. Its optional CuPy backend requires compatible CUDA hardware and a
supported installation. It does not automatically use an Apple GPU or silently fall back to
the CPU. See [CuPy's installation instructions](https://docs.cupy.dev/en/stable/install.html).

```sh
python3 -m venv .venv-heavy
.venv-heavy/bin/python -m pip install numpy
.venv-heavy/bin/python tools/heavy-runner.py --self-test
.venv-heavy/bin/python tools/heavy-runner-check.py
```

On Windows, use `.venv-heavy\Scripts\python.exe` instead. For CUDA, install the appropriate
CuPy package into that environment using its official instructions, then select `--backend cupy`.
NumPy execution and small analytic fixtures are tested locally. CUDA execution requires its
own hardware test and is not certified by a passing NumPy test.

Inspect the proposed work without allocating arrays or importing either numerical package:

```sh
python3 tools/heavy-runner.py volume-wave --grid 256 --steps 1000 --memory-mib 2048 --dry-run
python3 tools/heavy-runner.py direct-gravity --particles 16384 --steps 100 --dry-run
```

Run modest CPU examples first:

```sh
.venv-heavy/bin/python tools/heavy-runner.py volume-wave --grid 64 --steps 100 --output heavy-output/wave-64
.venv-heavy/bin/python tools/heavy-runner.py direct-gravity --particles 512 --steps 100 --output heavy-output/gravity-512
```

For a larger, explicitly selected CUDA wave run:

```sh
.venv-heavy/bin/python tools/heavy-runner.py volume-wave --backend cupy --grid 256 --steps 1000 --memory-mib 2048 --output heavy-output/wave-cuda-256
```

The array budget is an estimate, not a whole-process memory limit. Runtime, driver, allocator,
compression and output overhead require additional memory. Native grids can exceed browser
limits when the explicitly selected budget and hardware allow it. Gravity uses bounded pair
tiles, controlled by `--block`, instead of retaining an N by N distance matrix. It still
evaluates all pairs. Ctrl+C stops the run; an interrupted run is not a completed result.

Each completed run writes `run.json` with parameters, precision, timing and software metadata,
plus `state.npz` containing the final arrays. Use a fresh output directory for each experiment.
The wave archive includes both time levels; gravity includes positions, velocities and masses.
NumPy can read these without pickle: `numpy.load(path, allow_pickle=False)`.

Native runs use float64 arithmetic and their own documented seed initialization. Browser wave
state is float32 and browser recipes use the studio RNG. Matching seed labels therefore do
not imply matching native/browser initial states. Compare common analytic fixtures and stated
tolerances, not image hashes across backends. The native wave model uses c=1 on a periodic
unit cube. The gravity model uses G=1, total mass 1, planar positions and Plummer softening.

## Evidence

Read [direct-gravity evidence](../validation/DIRECT-GRAVITY.md) and
[volume-wave evidence](../validation/VOLUME-WAVE.md) for the actual tested domains and gaps.
The native self-test compares a discrete Fourier wave mode and a softened circular orbit
with independent analytic references, including deliberately wrong controls. These finite
tests do not validate every stress setting, astrophysical accuracy, or arbitrary hardware.
