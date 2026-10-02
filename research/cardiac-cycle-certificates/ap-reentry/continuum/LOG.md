# Progress log: reentry, continuum route (resumable)

Newest entries last. Times UTC. Nothing in this log is a proof.

## 2026-10-02

- 05:39 to 05:46. CAPD rebuilt after the container reset: `git clone https://github.com/CAPDGroup/CAPD.git`, checkout
  03dc5628203334b214bb7d9fd63788a175521005 (CAPDVersion.txt: 6.1.0; the repository has no 6.1.0 tag, the runbook names
  the commit), `git apply proofs/capd-6.1.0-genchase.patch`, cmake with `-DCAPD_ENABLE_MULTIPRECISION=true`, install to
  `$HOME/capd-install`, built with `-j1` (6 min 42 s). The grep check prints line 262 of
  `PoincareMap_templateMembers.h` ("GENChase patch").
- 05:47. `ap_proof` rebuilt (RUNBOOK 3.2, 13 s): `/root/bin/ap_proof`, sha256
  d3d41f9b49aa5de5705d4a43f7038f870dd489021f2466b03b8c111cf4158d5d.
- 05:48 to 05:52. Quick pilot checks with the rebuilt binary, compared with the stored records:
  - `check_field.py`: `results/check_field.json` reproduced identically;
  - `check_ghk.py`: `results/check_ghk.json` reproduced identically (89 s);
  - `stage3_switch.py ... cell` (kinds c1, c0, mp0, c0_NO_SWITCH): all 111 non-timing fields of the stored `cell`
    record identical (enclosure widths, crossing-time intervals, containment flags, the negative control's
    `end_contains_reference: false`). The stored file was restored afterwards; only timings differ.
- 05:53. The ring4 multiprecision run (stage 3) had finished before the reset (segment 0: 1,716.6 s, 43 steps;
  segment 1: 1,845.5 s, 61 steps). Recorded into `proof/results/stage3_switch.json` with the new
  `stage3_switch.py --collect --kinds=mp0` (reads the outputs, recomputes the box and plan and requires them equal to
  the stored files). Section image, end set and crossing time contain the floating-point reference. 32.4 s per step,
  peak RSS 1.19 GiB.
- 05:53. Dry run of the discrete pipeline started (driver.py, instance dry3: N = 3, c = 0.15, not a rotating wave;
  float shift interval 2.333 ms with internal events at 0.020 ms (cell 2 down) and 1.479 ms (cell 2 up)). Kinds c1 and
  c0 (the multiprecision centre would take hours at N = 3). Run dir in the session scratchpad; log `dryrun.log`.
- 06:09. Dry run attempt 1 (run dir `dryrun-dry3-attempt1` in the scratchpad): prepare ok (16 min, mostly the
  112-evaluation finite-difference Jacobian; leaf dimension 55, spectral radius of the leaf map 11.4, as expected for a
  state that is not a rotating wave). Segment 0 (C1, to cell 2 crossing down) ok, 5 steps + 6 validation steps,
  14.8 s. Segment 1 FAILED at once: "crossing cell at or past the level before the approach": cell 2 crosses -40 down
  and then up within the interval, so the segment that ends on cell 2's upward section starts with cell 2 on the level.
  The N = 16 plan never has two consecutive events of one cell, so this is a plan-generation fault exposed by the dry
  run, not a fault of the trusted engine.
- 06:11. driver.py fixed (untrusted code only): an automatic duration cut at the midpoint between two consecutive
  section events of the same cell (`auto_cuts` in config.json), `--reuse-jac` for dry3, and `float()` around cut
  durations (numpy 2 wrote `np.float64(...)` into the plan, which the plan parser cannot read; this would also have hit
  an N = 16 plan with a cut after an event). Attempt 2 (run dir `dryrun-dry3b`) started with 4 segments: section
  (cell 2 down), duration 0.7296 ms, section (cell 2 up), terminal section (cell 1 up).
- Continuum code written while the core was busy: `tw_model.py` (comoving field, first integral H; H cancels to
  2.2e-16 at random states), `tw_bvp.py` (Radau IIA collocation, two pieces split at the switch; Jacobian checked
  against finite differences to 5e-10), `pde_guess.py`, `tw_shooting.py`, `comoving19.hpp`, `comoving_field.cpp` and
  `check_comoving_field.py` (CAPD field against tw_model.py: 300 points inside, max relative difference 1.0e-12;
  negative control kappa (1 + 1e-6): all 300 outside; `results/check_comoving_field.json`), `wrap_pilot.cpp`,
  `wrap_run.py`.
- 06:18 (found on resuming at 06:42). Dry run attempt 2 (`dryrun-dry3b`) had completed: all 4 segments certified in
  kinds c1 and c0 (c1: 5, 175, 81, 51 steps, 14.5 + 143.5 + 80.7 + 65.4 s), `chain` ok for both kinds, `verify`
  NOT VERIFIED (q <= 1.73e6, as it must be for a state that is not a rotating wave: spectral radius 11.4 of the
  leaf map), all segments certified, centre times inside box times, finite. Record copied to
  `../proof/results/dryrun_dry3.json` (sources not dirty; hashes of ring19.hpp, engine.hpp, ap_proof.cpp and driver.py
  equal to the committed files). Discrete-ring task (3) closed: the pipeline runs end to end; it is not a proof.

## 2026-10-02, resumed session (06:42 UTC)

- 06:42. No job of this route was running (`ps` for wrap_pilot, tw_, capd, ap_proof: none). Other agents' jobs use
  about 4 cores; this work stays on one core, nice 10.
- 06:44 to 06:48. Cable snapshot for the collocation guess: `pde_guess.py` with the N = 16 orbit waveform, L = 200 mm,
  h = 0.25 mm (N = 800, coupling 2.464 per ms), dt 0.01, 4,000 ms (3 min 34 s): 11 rotations, last periods 343.7 to
  344.3 ms, c = 0.5809 mm/ms, kappa = 2.1914 per ms (first-order RL on a grid, so not the continuum speed).
- 06:48. `tw_bvp.py init` at that kappa, M = 400 + 400: Newton converged from the snapshot in 12 iterations
  (residual 3e-15), two remesh rounds, 12 s. T = 298.978 ms at c = 0.58092 mm/ms, L = 173.68 mm. The discrete
  grid at h = 0.25 mm gave T = 344 ms at the same speed: the grid slows conduction, as expected.
- 06:49. Mesh study at kappa = 2.19136 (M = 200, 300, 400, 600, 900 per piece): T = 299.0667, 298.9251, 298.9777,
  298.97385, 298.97379 ms. M = 600 is used below (T to about 1e-4 ms; L to about 1e-4 mm).
- 06:50 to 06:58. Continuation down in kappa from 2.19136 (`tw_bvp.py cont ... 0.2`, M = 600, remesh every 5 steps;
  57 rows to kappa = 0.19907). T decreases from 297.15 ms to a minimum near 215.83 ms at kappa about 0.537
  (c about 0.288 mm/ms; quadratic fit through the three nearest rows), then increases again (slow branch); L = c T
  decreases monotonically over the whole range, from 171.83 mm to 40.40 mm at kappa = 0.19907 (c = 0.1751 mm/ms,
  T = 230.71 ms). So the minimum of L is not at the minimum of T (see PLAN.md section 6, corrected). Newton needs
  smaller steps below kappa 0.3 (failed steps halved), but the smallest singular value of the collocation Jacobian
  stays at 3e-7 to 4e-7 (scaled) at kappa = 2.17, 0.525 and 0.294: no fold in kappa there.
- 06:59. The CAPD pilot needs a decimal kappa: the wave was re-solved at kappa = 2.19 exactly (T = 298.84894 ms,
  L = 173.5538 mm; `sol_k2.19_exact.npz` in the scratchpad).
