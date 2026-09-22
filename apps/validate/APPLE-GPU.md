# Apple GPU verification: periodic scalar wave

The local validator includes a Swift/Metal backend that executes a three-dimensional wave stencil on an Apple GPU. It verifies finite fixtures before starting each requested workload. It does not silently fall back to the CPU while reporting GPU acceleration.

This backend is separate from the browser's WebGL solver and the optional NumPy/CuPy runner. Its verification does not establish that every GENChase module uses Metal, that every module is scientifically validated, or that a large workload is accurate for arbitrary physical acoustics.

## Recorded M1 Pro run

A local verification report was recorded on **2026-09-22** using an **Apple M1 Pro**, macOS arm64 and Node v24.21.0. It records the GPU chip class and the backend source SHA-256. The machine-readable file remains local at `apps/validate/.runs/manual-metal/metal-verification.json` until you choose to share it:

```text
d1229702f7e32c2823c6c56b74a9c93c4a659ce087cc9951821ccc0de505f972
```

| Fixture | Acceptance rule | Recorded result |
| --- | --- | --- |
| Metal Float32 versus independent CPU Float64, 16³ grid, 37 steps | Maximum field error < 5 × 10⁻⁵ | 4.63390168 × 10⁻⁷ |
| Save at step 13, resume for 24 more steps | Same final GPU field as 37 uninterrupted steps | Maximum difference 0 |
| Deliberately reversed Laplacian sign | Detect disagreement | Maximum difference 1.79011665 |
| Continuum wave refinement at physical time 0.1 | Successive observed orders between 1.7 and 2.3 | 1.95281858 and 2.00566667 |

The continuum maximum errors were **0.07820477**, **0.02020116** and **0.00503049** on 8³, 16³ and 32³ grids respectively. Refinement changes both spatial and temporal resolution at fixed `dt/dx`; it does not isolate a spatial-order claim from the time integrator. These are observed finite-fixture results, not a proof for all fields or all hardware. No speedup benchmark is claimed.

## Model and domain

The backend solves the scalar wave equation on a periodic unit cube with a seven-point spatial Laplacian and a centered two-step time update. It uses `dt/dx = 0.4`, so the squared ratio is 0.16, below the three-dimensional stencil's linear stability limit of 1/3. The verification starts from a smooth periodic plane wave with zero initial velocity. The CPU comparison uses binary64 arithmetic; Metal uses Float32 with fast math disabled.

The workload control offers grids from 32³ through 256³ and a finite step budget. The initial field and periodic boundary conditions remain specified by the backend. Larger grids and longer runs increase work, but are not new evidence for different models, boundary conditions, nonlinear dynamics or production acoustics.

## Reproduce and resume

On Apple Silicon macOS with Node and Apple's command-line developer tools:

```sh
node apps/validate/native.js --verify-only
node apps/validate/native.js --grid 128 --steps 1000
```

The first command writes verification evidence to `apps/validate/.runs/manual-metal/metal-verification.json`. The second repeats verification, then runs the workload. Compiled native binaries are cached under the ignored `.runs/native/` directory by source hash. Compilation and execution use local tools and do not call a model or an external API.

For heat/battery controls, job metadata, Stop and downloadable bundles, use **Contribute Mode → Apple GPU periodic wave** in the [local app](README.md). Direct command-line execution does not apply the app's duty-cycle controls.

A checkpoint contains the current and preceding Float32 fields, completed step count, grid, numerical ratio, backend signature and a SHA-256 for its binary state. The backend checks those fields before resuming. It writes a new data file before replacing checkpoint metadata. Resume can repeat work since the last periodic save. The exact restart equality above applies to the recorded GPU fixture and does not promise bitwise portability between devices or compiler versions.

## Implementation references

The native implementation follows Apple's [Metal GPU compute model](https://developer.apple.com/documentation/metal/performing-calculations-on-a-gpu). The app reads [ProcessInfo thermal state](https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.enum) and [IOKit power sources](https://developer.apple.com/documentation/iokit/iopowersources_h) for its pause controls. Those system APIs describe device state; they do not provide a scientific validation certificate or a precise workload utilization target.
