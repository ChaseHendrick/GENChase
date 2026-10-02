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
